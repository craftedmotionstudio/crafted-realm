/* qa_equipped_captures.js — Top-100 equipped/held comparison pass, capture stage.
 * Headless Chrome (throwaway profile — user's browser/save untouched). Drives the
 * REAL game: login, stage the player, then for every equipped-capable top-100 item:
 * strip all gear -> equip ONLY that item -> settle -> close-up capture. Runs the
 * procedural rig first, then the v02 GLB avatar. Writes:
 *   Bible_References/Items_Top100/ours/equipped_proc/<id>.png
 *   Bible_References/Items_Top100/ours/equipped_glb/<id>.png
 *   Bible_References/Items_Top100/ours/equipped_manifest.json  (slot + mesh evidence)
 * Run: node tools/qa_equipped_captures.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const BASE = path.join(__dirname, '..', 'Bible_References', 'Items_Top100');
const LIST = JSON.parse(fs.readFileSync(path.join(BASE, 'top100_items.json'), 'utf8')).items
  .filter(i => i.equipped && i.id);
for (const sub of ['equipped_proc', 'equipped_glb'])
  fs.mkdirSync(path.join(BASE, 'ours', sub), {recursive: true});

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function shot(page, file){
  const rect = await page.evaluate(() => {
    const p = player.position.clone(); p.y += 0.85;
    const v = p.project(camera);
    const x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight;
    return {x: Math.max(0, x - 135), y: Math.max(0, y - 175), w: 270, h: 330};
  });
  await page.screenshot({path: file, clip: {x: rect.x, y: rect.y, width: rect.w, height: rect.h}});
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--window-size=1538,900', '--hide-scrollbars', '--mute-audio', '--no-first-run'],
    defaultViewport: {width: 1538, height: 900, deviceScaleFactor: 3},
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 200)));
  await page.goto('http://127.0.0.1:8777/', {waitUntil: 'domcontentloaded', timeout: 60000});

  // real login flow on the throwaway profile
  const t0 = Date.now();
  while (Date.now() - t0 < 180000){
    const state = await page.evaluate(() => {
      const vis = id => { const e = document.getElementById(id); return e && e.offsetParent !== null ? e : null; };
      const buf = document.getElementById('enter-buffer');
      if (typeof running !== 'undefined' && running && (!buf || buf.style.display === 'none')) return 'ready';
      const begin = vis('btn-begin'), play = vis('play-btn'), fresh = vis('btn-new');
      if (begin){ begin.click(); return 'begin'; }
      if (play){ try { CharCfg._new = false; } catch(e){} play.click(); return 'play'; }
      if (fresh){ fresh.click(); return 'new'; }
      return 'waiting';
    });
    if (state === 'ready') break;
    await sleep(2000);
  }
  await page.waitForFunction('window.GearModels && window.GearModels.ready', {timeout: 60000});
  console.log('booted, gear templates:', await page.evaluate(() => window.GearModels.status().loaded.join(',')));

  await page.evaluate(() => {
    window.__qa = {
      clearAll(){ for (const k in Player.equip) Player.equip[k] = null; refreshPlayerGear(); },
      equipOnly(id){
        this.clearAll();
        if (!Player.inv.some(s => s && s.id === id)) Player.addItem(id, 1);
        UI.useItem(Player.inv.findIndex(s => s && s.id === id));
        const g = player.userData.gear || {}, gg = player.userData.glbGear || {};
        const slot = (ITEMS[id] || {}).equip;
        return { slot, equipped: Player.equip[slot] === id,
                 mesh: ['weapon','head','shield','body','legs','amulet','cape']
                   .map(k => (g[k] && g[k].name) || (gg[k] && gg[k].name) || null)
                   .filter(Boolean).join('|') || null };
      },
      face(){
        Player.action = null; Player.moveTo = null; Player.target = null;
        if (player.userData) player.userData.path = null;
        player.position.set(130, gy(130, 163), 163);
        // face the camera (3/4 turn like the wiki equipped renders), wherever it is
        player.rotation.y = Math.atan2(camera.position.x - player.position.x,
                                       camera.position.z - player.position.z) + 0.5;
        player.traverse(o => { if (o.isSprite) o.visible = false; });
        camCtl.dist = 9;                     // close-up, full body in frame
      },
      brighten(){
        if (window.__qaLight) return 'already';
        const lum = scene.fog ? (scene.fog.color.r + scene.fog.color.g + scene.fog.color.b) / 3 : 1;
        if (lum < 0.25){ window.__qaLight = new THREE.AmbientLight(0xfff2dd, 0.75); scene.add(window.__qaLight); return 'lit'; }
        return 'daylight';
      },
    };
    Player.action = null; Player.plane = 0;
    player.position.set(127, gy(127, 160), 160);
    // disposable QA character: clear every level gate in the list
    for (const sk of ['Attack','Defence','Strength','Ranged','Magic','Prayer']) Player.addXp(sk, 30000);
  });
  console.log('stage light:', await page.evaluate(() => window.__qa.brighten()));
  await page.evaluate(() => { window.__qa.face(); });
  await sleep(1400);                          // let the camera lerp in close
  console.log('camera dist:', await page.evaluate(() => camCtl.dist));

  const manifest = {};
  async function capturePass(rig){
    for (const it of LIST){
      const res = await page.evaluate(id => window.__qa.equipOnly(id), it.id);
      await page.evaluate(() => window.__qa.face());
      await sleep(350);
      const file = path.join(BASE, 'ours', 'equipped_' + rig, it.id + '.png');
      await shot(page, file);
      manifest[it.id] = manifest[it.id] || {};
      manifest[it.id][rig] = res;
      if (!res.equipped) console.log('  !! equip failed', rig, it.id, JSON.stringify(res));
    }
    console.log(rig + ' pass complete (' + LIST.length + ' items)');
  }

  await capturePass('proc');

  await page.evaluate(() => new Promise(res => installPlayerGLB(res)));
  await page.waitForFunction('player.userData && player.userData.isPlayerGLB === true', {timeout: 30000});
  await page.evaluate(() => window.__qa.face());
  await sleep(600);
  await capturePass('glb');

  const errs = await page.evaluate(() => (window.SMOKE_ERRORS || []).length);
  manifest._uncaughtErrors = errs;
  fs.writeFileSync(path.join(BASE, 'ours', 'equipped_manifest.json'), JSON.stringify(manifest, null, 1));
  await browser.close();
  console.log('DONE — uncaught errors:', errs);
})().catch(e => { console.error('DRIVER ERROR', e); process.exit(1); });
