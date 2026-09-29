/* music_render.js: render game music offline to WAV (+ MP3 via ffmpeg when present) for listening checks.
 *
 * Drives tools/music_render.html in headless Chrome (puppeteer-core). Rendering uses an OfflineAudioContext, so
 * it runs faster than real time and the result is exactly what the engine schedules.
 *
 *   node tools/music_render.js --songs all --out <dir>          (the 2004 MIDI set, one full loop each)
 *   node tools/music_render.js --songs hm_title --loops 2       (two passes: hear the loop seam)
 *   node tools/music_render.js --songs holm_mill --solo ob      (balance checks: --solo a,b or --mute a,b)
 *
 * Needs a static server on the repo: python tools/serve_static.py <port> .  and MUSIC_BASE=http://127.0.0.1:<port>
 * (default 8777). NODE_PATH must reach puppeteer-core.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const puppeteer = require('puppeteer-core');

function arg(name, dflt){ const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : dflt; }
const BASE = process.env.MUSIC_BASE || 'http://127.0.0.1:8777';
const OUT = path.resolve(arg('out', 'scratchpad/music_renders'));
const SECONDS = +arg('seconds', 0);
const LOOPS = +arg('loops', 1);
const TAIL = +arg('tail', 0);
const MP3 = !process.argv.includes('--no-mp3');
const SR = +arg('sr', 44100);

function hasFfmpeg(){ try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return true; } catch (e) { return false; } }

async function pull(page, file){
  const bytes = await page.evaluate(() => window.RENDER.b64.length);
  const CH = 4 * 1024 * 1024; let s = '';
  for (let i = 0; i < bytes; i += CH) s += await page.evaluate((a, b) => window.RENDER.take(a, b), i, CH);
  fs.writeFileSync(file, Buffer.from(s, 'base64'));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const songs = arg('songs', null);
  if (!songs){ console.log('usage: --songs all|id,id [--loops n] [--seconds s] [--solo v | --mute v]'); process.exit(2); }
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new', args: ['--mute-audio', '--no-first-run'],
  });
  const ff = MP3 && hasFfmpeg();
  const results = [];
  try {
    let ids = songs.split(',');
    if (songs === 'all'){
      const p = await browser.newPage();
      await p.goto(BASE + '/tools/music_render.html?list=1', { waitUntil: 'load' });
      ids = await p.evaluate(async () => { await window.gmReady; return window.listSongs(); });
      await p.close();
    }
    for (const id of ids){
      const page = await browser.newPage();          // a fresh page per track: clean globals, clean context
      const errs = [];
      page.on('pageerror', e => errs.push(String(e)));
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      await page.goto(BASE + '/tools/music_render.html', { waitUntil: 'load' });
      const t0 = Date.now();
      await page.evaluate(async (i, s, l, t, r, so, mu) => { await window.gmReady; return window.renderSong(i, { seconds: s, loops: l, tail: t, sr: r, solo: so, mute: mu }); }, id, SECONDS, LOOPS, TAIL, SR, arg('solo', null), arg('mute', null));
      const info = await page.evaluate(() => window.RENDER.info);
      const tag = (arg('solo', null) ? '_solo-' + arg('solo') : '') + (arg('mute', null) ? '_mute-' + arg('mute') : '');
      const wav = path.join(OUT, id + (LOOPS > 1 ? '_x' + LOOPS : '') + tag.replace(/,/g, '+') + '.wav');
      await pull(page, wav);
      let mp3 = null;
      if (ff){
        mp3 = wav.replace(/\.wav$/, '.mp3');
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-q:a', '2', mp3]);
      }
      const row = Object.assign({ file: path.basename(wav), mp3: mp3 && path.basename(mp3), renderMs: Date.now() - t0, errors: errs }, info);
      results.push(row);
      console.log('[music_render] ' + id + ' -> ' + path.basename(wav) + ' (' + (info && info.seconds ? info.seconds.toFixed(1) + 's' : '') + ', ' + row.renderMs + 'ms' + (errs.length ? ', ERRORS ' + errs.length : '') + ')');
      if (errs.length) errs.slice(0, 5).forEach(e => console.log('   ! ' + e.slice(0, 200)));
      await page.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(OUT, 'render_log.json'), JSON.stringify(results, null, 1));
  process.exit(results.some(r => r.errors.length) ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
