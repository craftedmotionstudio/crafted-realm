/* icon_dump_headless.js — capture our top-100 item icons WITHOUT touching the
 * user's browser: drives tools/icon_dump_top100.html in a separate headless
 * Chrome (puppeteer-core, same pattern as qa_gear_headless.js). Saves every
 * icon PNG to Bible_References/Items_Top100/ours/icon/ and a full-page
 * contact-sheet screenshot for eyes-on review.
 * Run: node tools/icon_dump_headless.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const OUT = path.join(__dirname, '..', 'Bible_References', 'Items_Top100', 'ours', 'icon');
const SHEET = path.join(__dirname, '..', 'Bible_References', 'Items_Top100', 'ours', 'icon_contact_sheet.png');
fs.mkdirSync(OUT, {recursive: true});

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--window-size=1400,1000', '--hide-scrollbars', '--mute-audio', '--no-first-run'],
    defaultViewport: {width: 1400, height: 1000, deviceScaleFactor: 2},
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 300)));
  await page.goto('http://127.0.0.1:8777/tools/icon_dump_top100.html?v=' + Date.now(),
                  {waitUntil: 'domcontentloaded', timeout: 30000});
  await page.waitForFunction('window.ICON_DUMP_READY === true', {timeout: 20000});

  const dump = await page.evaluate(() => window.ICON_DUMP);
  let n = 0;
  for (const [id, dataURL] of Object.entries(dump)){
    const m = /^data:image\/png;base64,(.+)$/.exec(dataURL);
    if (!m) continue;
    fs.writeFileSync(path.join(OUT, id + '.png'), Buffer.from(m[1], 'base64'));
    n++;
  }
  const status = await page.evaluate(() => document.getElementById('status').textContent);
  await page.screenshot({path: SHEET, fullPage: true});
  await browser.close();
  console.log(status);
  console.log(`saved ${n} icons -> ${OUT}`);
  console.log(`contact sheet -> ${SHEET}`);
})().catch(e => { console.error('DRIVER ERROR', e.message); process.exit(1); });
