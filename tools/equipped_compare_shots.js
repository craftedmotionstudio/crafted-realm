/* equipped_compare_shots.js — renders tools/equipped_compare.html headless and
 * saves one comparison PNG per item (wiki equipped | proc | glb) plus paged
 * contact sheets for eyes-on review.
 *   per-item -> Bible_References/Items_Top100/compare_equipped/<id>_compare.png
 *   pages    -> Bible_References/Items_Top100/compare_equipped/_page<N>.png
 * Run: node tools/equipped_compare_shots.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const OUT = path.join(__dirname, '..', 'Bible_References', 'Items_Top100', 'compare_equipped');
fs.mkdirSync(OUT, {recursive: true});

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--window-size=700,1000', '--hide-scrollbars', '--mute-audio', '--no-first-run'],
    defaultViewport: {width: 700, height: 1000, deviceScaleFactor: 2},
  });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8777/tools/equipped_compare.html?v=' + Date.now(),
                  {waitUntil: 'domcontentloaded', timeout: 30000});
  await page.waitForFunction('window.SHEETS_READY === true', {timeout: 30000});

  const rows = await page.$$('.row');
  let n = 0;
  for (const row of rows){
    const id = await row.evaluate(el => el.id.replace(/^row_/, ''));
    await row.screenshot({path: path.join(OUT, id + '_compare.png')});
    n++;
  }

  // paged contact sheets: 4 rows per page, clipped to the visible container only
  const ids = await page.$$eval('.row', els => els.map(e => e.id));
  const PER = 4;
  for (let p = 0; p * PER < ids.length; p++){
    await page.evaluate((start, per) => {
      document.querySelectorAll('.row').forEach((el, i) =>
        el.style.display = (i >= start && i < start + per) ? '' : 'none');
      window.scrollTo(0, 0);
    }, p * PER, PER);
    const box = await (await page.$('#sheets')).boundingBox();
    await page.screenshot({path: path.join(OUT, `_page${p + 1}.png`),
      clip: {x: box.x, y: box.y, width: Math.min(box.width, 680), height: box.height}});
  }
  await browser.close();
  console.log(`saved ${n} per-item sheets + ${Math.ceil(ids.length / PER)} review pages -> ${OUT}`);
})().catch(e => { console.error('DRIVER ERROR', e.message); process.exit(1); });
