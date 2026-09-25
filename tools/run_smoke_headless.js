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
  async function runGate(page, tag, timeoutMs, extraQuery){
    let verdict = null;
    const pageErrors = [];
    page.on('console', msg => {
      const t = msg.text();
      if (t.startsWith('[SMOKE]')){
        verdict = t.slice(7).trim();
        console.log(tag ? tag + ' ' + t : t);
      }
    });
    page.on('pageerror', e => { pageErrors.push(String(e).slice(0, 300)); console.log('PAGEERROR', String(e).slice(0, 300)); });
    // SMOKE_BASE overrides the dev server origin (the in-app preview may serve on another port)
    const base = process.env.SMOKE_BASE || 'http://127.0.0.1:8777';
    await page.goto(base + '/?smoke=1&holmLegacy=1&headless=' + Date.now() + (extraQuery || ''),   // engine smoke on the old island (the new island has its own gates: qa_holm_island, playthroughs)
                    {waitUntil: 'domcontentloaded', timeout: 60000});
    const t0 = Date.now();
    while (!verdict && Date.now() - t0 < timeoutMs) await new Promise(r => setTimeout(r, 1000));
    return {verdict: verdict ? JSON.parse(verdict) : null, pageErrors};
  }

  // 1. the foreground gate (perf is judged here)
  const page = await browser.newPage();
  const fg = await runGate(page, '', 240000);
  if (!fg.verdict){ console.log('SMOKE TIMEOUT — no verdict in 240s'); await browser.close(); process.exit(1); }

  // 2. the same gate booted in a BACKGROUND tab: rAF is frozen there, so the boot must come
  //    through the coordinator's timer fallback and the loop must stay quiet until the world exists.
  const front = await browser.newPage();
  await front.goto('about:blank');
  const back = await browser.newPage();
  await front.bringToFront();
  const hiddenAtStart = await back.evaluate(() => document.hidden);
  const bgRun = runGate(back, '[HIDDEN]', 300000, '&qaProfile=smoke-hidden-' + Date.now().toString(36));
  await front.bringToFront();
  const bg = await bgRun;
  const bgOk = !!(bg.verdict && bg.verdict.verdict === 'PASS' && bg.verdict.hiddenBoot === true &&
    bg.verdict.phases.boot && bg.verdict.phases.boot.hidden === true && bg.verdict.phases.boot.worldReady === true &&
    bg.verdict.phases.console && bg.verdict.phases.console.ok && bg.pageErrors.length === 0);
  console.log('[SMOKE HIDDEN BOOT] ' + (bgOk ? 'PASS' : 'FAIL') + ' hiddenAtStart=' + hiddenAtStart +
    ' verdict=' + (bg.verdict ? bg.verdict.verdict : 'none') + ' bootMs=' + (bg.verdict && bg.verdict.phases.boot ? bg.verdict.phases.boot.ms : 'n/a') +
    ' pageErrors=' + bg.pageErrors.length);
  await browser.close();
  process.exit(fg.verdict.verdict === 'PASS' && bgOk ? 0 : 1);
})().catch(e => { console.error('DRIVER ERROR', e.message); process.exit(1); });
