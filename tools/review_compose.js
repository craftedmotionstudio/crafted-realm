/* review_compose.js — composes the labeled two-model review sheet for one item:
 * [wiki equipped | wiki detail | our full front | our full side | ITEM ZOOM]
 * -> reviews/<id>/review_sheet.png  (also what the Codex reviewer reads)
 * Run: node tools/review_compose.js <item_id> "<OSRS name>"
 */
'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const id = process.argv[2], osrs = process.argv[3] || id;
if (!id){ console.error('usage: node tools/review_compose.js <item_id> "<OSRS name>"'); process.exit(1); }
const BASE = path.join(__dirname, '..', 'Bible_References', 'Items_Top100');
const DIR = path.join(BASE, 'reviews', id);
const b64 = f => fs.existsSync(f) ? 'data:image/png;base64,' + fs.readFileSync(f).toString('base64') : null;

const safe = osrs.replace(/ /g, '_');
const panels = [
  ['OSRS wiki — equipped reference', b64(path.join(BASE, 'wiki', 'equipped', safe + '.png'))],
  ['OSRS wiki — item detail',        b64(path.join(BASE, 'wiki', 'detail',   safe + '.png'))],
  ['OURS — avatar, front',           b64(path.join(DIR, 'full_front.png'))],
  ['OURS — avatar, side',            b64(path.join(DIR, 'full_side.png'))],
  ['OURS — ITEM ZOOM',               b64(path.join(DIR, 'item_zoom.png'))],
];

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
 body{background:#221d14;color:#e8dcc0;font:14px system-ui;margin:0;padding:14px}
 h2{margin:0 0 10px;font-size:17px;color:#d4a83e}
 .row{display:flex;gap:12px;align-items:flex-start}
 .cell{background:#332c1f;border-radius:6px;padding:8px;text-align:center}
 .cell img{max-height:430px;max-width:330px;object-fit:contain;display:block;margin:0 auto}
 .cell div{font-size:12px;color:#cbb98f;margin-top:6px;max-width:330px}
</style></head><body>
 <h2>Review sheet — ${osrs} (id: ${id})</h2>
 <div class="row" id="row">
 ${panels.map(([label, src]) => src ?
   `<div class="cell"><img src="${src}"><div>${label}</div></div>` :
   `<div class="cell"><div style="padding:40px 20px">no ${label}</div></div>`).join('')}
 </div>
</body></html>`;

const tmp = path.join(DIR, '_sheet.html');
fs.writeFileSync(tmp, html);

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new', args: ['--hide-scrollbars', '--no-first-run'],
    defaultViewport: {width: 1900, height: 620, deviceScaleFactor: 2},
  });
  const page = await browser.newPage();
  await page.goto('file:///' + tmp.replace(/\\/g, '/'), {waitUntil: 'networkidle0', timeout: 20000});
  const body = await page.$('body');
  await body.screenshot({path: path.join(DIR, 'review_sheet.png')});
  await browser.close();
  fs.unlinkSync(tmp);
  console.log('sheet -> ' + path.join(DIR, 'review_sheet.png'));
})().catch(e => { console.error('COMPOSE ERROR', e.message); process.exit(1); });
