/* run_smoke_headless.js — run the ?smoke=1 gate in a separate headless Chrome
 * (puppeteer-core) so the user's browser is never touched. Prints the [SMOKE]
 * verdict JSON. Headless uses a throwaway profile: the smoke run drives the
 * real new-adventurer login flow; the user's save lives in their own browser
 * profile and is not involved. Exit 0 on PASS, 1 on FAIL/timeout.
 * Note: if perf numbers fail here but structural/console pass, check GPU —
 * headless may software-render; judge perf only in a real foreground run.
 * Run: node tools/run_smoke_headless.js
 */
'use strict';
const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--window-size=1538,900', '--hide-scrollbars', '--mute-audio', '--no-first-run'],
    defaultViewport: {width: 1538, height: 900},
  });
  const page = await browser.newPage();
  let verdict = null;
  page.on('console', msg => {
    const t = msg.text();
    if (t.startsWith('[SMOKE]')){
      verdict = t.slice(7).trim();
      console.log(t);
    }
  });
  page.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 300)));
  await page.goto('http://127.0.0.1:8777/?smoke=1&headless=' + Date.now(),
                  {waitUntil: 'domcontentloaded', timeout: 60000});

  const t0 = Date.now();
  while (!verdict && Date.now() - t0 < 240000) await new Promise(r => setTimeout(r, 1000));
  await browser.close();
  if (!verdict){ console.log('SMOKE TIMEOUT — no verdict in 240s'); process.exit(1); }
  process.exit(JSON.parse(verdict).verdict === 'PASS' ? 0 : 1);
})().catch(e => { console.error('DRIVER ERROR', e.message); process.exit(1); });
