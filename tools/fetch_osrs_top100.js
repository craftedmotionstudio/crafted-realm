/* fetch_osrs_top100.js — downloads OSRS wiki reference images for the top-100 item list.
 * For each entry in Bible_References/Items_Top100/top100_items.json:
 *   icon      /images/<Name>.png                      -> wiki/icon/<Name>.png
 *   detail    /images/<Name>_detail.png               -> wiki/detail/<Name>.png
 *   equipped  /images/<Name>_equipped_male.png (then _equipped.png, _equipped_female.png)
 *                                                     -> wiki/equipped/<Name>.png
 * Tolerates 404s (records them), writes wiki/manifest.json with per-item results.
 * Reference-only assets for the Bible_References comparison workflow — never shipped.
 * Run: node tools/fetch_osrs_top100.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const BASE_DIR = path.join(ROOT, 'Bible_References', 'Items_Top100');
const LIST = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'top100_items.json'), 'utf8')).items;
const UA = 'CraftedRealm-dev-reference-fetch/1.0 (single indie dev art-reference tool)';

/* our list name -> actual wiki page/file name where they differ */
const WIKI_NAME = {
  'Wizard hat (blue)': 'Blue wizard hat',
  'Burnt fish': 'Burnt fish (Trout)'
};

function wikiFile(name){ return name.replace(/ /g, '_'); }

function get(url, redirects){
  return new Promise((resolve) => {
    const req = https.get(url, {headers: {'User-Agent': UA}}, (res) => {
      if ([301,302,307,308].includes(res.statusCode) && res.headers.location && (redirects||0) < 3){
        res.resume();
        const loc = new URL(res.headers.location, url).href;
        return resolve(get(loc, (redirects||0)+1));
      }
      if (res.statusCode !== 200){ res.resume(); return resolve(null); }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', () => resolve(null));
    });
    req.on('error', () => resolve(null));
    req.setTimeout(15000, () => { req.destroy(); resolve(null); });
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchVariant(candidates, outPath){
  for (const c of candidates){
    const url = 'https://oldschool.runescape.wiki/images/' + encodeURIComponent(wikiFile(c)).replace(/%2F/g,'/') + '.png';
    const buf = await get(url);
    await sleep(120);
    if (buf && buf.length > 100){
      fs.writeFileSync(outPath, buf);
      return {ok: true, file: c + '.png', bytes: buf.length};
    }
  }
  return {ok: false};
}

(async () => {
  for (const sub of ['icon','detail','equipped'])
    fs.mkdirSync(path.join(BASE_DIR, 'wiki', sub), {recursive: true});

  const manifest = [];
  let done = 0;
  for (const it of LIST){
    const name = WIKI_NAME[it.osrs] || it.osrs;
    const safe = wikiFile(it.osrs);
    const rec = {n: it.n, osrs: it.osrs};

    const iconPath = path.join(BASE_DIR, 'wiki', 'icon', safe + '.png');
    if (!fs.existsSync(iconPath)) rec.icon = await fetchVariant([name], iconPath);
    else rec.icon = {ok: true, cached: true};

    const detailPath = path.join(BASE_DIR, 'wiki', 'detail', safe + '.png');
    if (!fs.existsSync(detailPath)) rec.detail = await fetchVariant([name + ' detail'], detailPath);
    else rec.detail = {ok: true, cached: true};

    if (it.equipped){
      const eqPath = path.join(BASE_DIR, 'wiki', 'equipped', safe + '.png');
      if (!fs.existsSync(eqPath))
        rec.equipped = await fetchVariant(
          [name + ' equipped male', name + ' equipped', name + ' equipped female'], eqPath);
      else rec.equipped = {ok: true, cached: true};
    }

    manifest.push(rec);
    done++;
    if (done % 10 === 0) console.log(`  ${done}/${LIST.length} ...`);
  }

  fs.writeFileSync(path.join(BASE_DIR, 'wiki', 'manifest.json'), JSON.stringify(manifest, null, 1));
  const miss = manifest.filter(m => !m.icon.ok);
  const missD = manifest.filter(m => !m.detail.ok);
  const missE = manifest.filter(m => m.equipped && !m.equipped.ok);
  console.log(`DONE. icons: ${LIST.length - miss.length}/${LIST.length}  details missing: ${missD.length}  equipped missing: ${missE.length}`);
  if (miss.length)  console.log('  no icon:     ' + miss.map(m => m.osrs).join(', '));
  if (missD.length) console.log('  no detail:   ' + missD.map(m => m.osrs).join(', '));
  if (missE.length) console.log('  no equipped: ' + missE.map(m => m.osrs).join(', '));
})();
