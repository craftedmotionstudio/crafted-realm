/* Scarlands bestiary review captures (W2/W3, 2026-09-26): tools/scarlands_bestiary_view.html in headless Chrome.
 * Per creature: a turnaround (front, 3/4, side, back at idle frame 0) and every clip as a strip of frames (the event
 * frames included); plus a size lineup next to a player-sized kit human (front 3/4 and side profile).
 * Writes scratchpad/scarlands_bestiary_v1/<tag>/ and shots.json. Run: SMOKE_BASE=... BV_TAG=pass1 node tools/capture_scarlands_bestiary.js */
'use strict';
const fs = require('fs'), path = require('path'), puppeteer = require('puppeteer-core');
const TAG = process.env.BV_TAG || 'capture', OUT = path.join(__dirname, '..', 'scratchpad', 'scarlands_bestiary_v1', TAG);
fs.mkdirSync(OUT, { recursive: true });
const BASE = (process.env.SMOKE_BASE || 'http://127.0.0.1:8777') + '/tools/scarlands_bestiary_view.html?clean=1&manifest=' + (process.env.BV_MANIFEST || '../.studio-workspaces/scarlands-bestiary-v1/candidates/manifest.json');
const MAN = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.studio-workspaces/scarlands-bestiary-v1/candidates/manifest.json'), 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'], defaultViewport: { width: 640, height: 640 } });
  const page = await browser.newPage(), errs = [];
  page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
  await page.goto(BASE + '&v=' + Date.now(), { waitUntil: 'load' });
  await page.waitForFunction(() => window.bvReady || window.bvError, { timeout: 90000 });
  const shots = { tag: TAG, creatures: {} };
  for (const c of MAN.creatures) {
    const S = Math.max(c.model.height_m, (c.model.length_m || 0) * 0.8, 0.9), dist = S * 2.35, ty = c.model.height_m * 0.5;
    const rec = shots.creatures[c.id] = { turn: [], clips: {} };
    await page.evaluate(id => bvShow([id], { spacing: [0] }), c.id);
    for (const [label, yaw] of [['front', 0], ['three_quarter', Math.PI / 4], ['side', Math.PI / 2], ['back', Math.PI]]) {
      await page.evaluate((id, yaw, dist, ty) => { bvYaw(id, yaw); bvPose(id, 'idle', 0); bvView({ yaw: 0, pitch: 0.12, dist, target: [0, ty, 0] }); }, c.id, yaw, dist, ty);
      const f = c.id + '_turn_' + label + '.png'; await page.screenshot({ path: path.join(OUT, f) }); rec.turn.push({ label, file: f });
    }
    for (const [name, clip] of Object.entries(c.clips)) {
      const n = 6, frames = new Set();
      for (let i = 0; i < n; i++) frames.add(Math.round(i * (clip.frames - (clip.loop ? 1 : 0)) / (n - 1)));
      for (const ev of ['impact', 'release', 'until']) if (clip[ev] != null) frames.add(clip[ev]);
      const list = [...frames].sort((a, b) => a - b);
      rec.clips[name] = { frames: clip.frames, events: Object.fromEntries(['impact', 'release', 'until'].filter(k => clip[k] != null).map(k => [k, clip[k]])), shots: [] };
      for (const fr of list) {
        await page.evaluate((id, clipName, fr, dist, ty) => { bvYaw(id, Math.PI / 3); bvPose(id, clipName, fr); bvView({ yaw: 0, pitch: 0.18, dist: dist * 1.2, target: [0, ty, 0] }); }, c.id, name, fr, dist, ty);
        const f = c.id + '_' + name + '_' + String(fr).padStart(2, '0') + '.png'; await page.screenshot({ path: path.join(OUT, f) }); rec.clips[name].shots.push({ frame: fr, file: f });
      }
    }
    console.log('captured', c.id);
  }
  // size lineup
  await page.setViewport({ width: 1600, height: 640 });
  const ids = ['player_ref'].concat(MAN.creatures.slice().sort((a, b) => a.model.height_m - b.model.height_m).map(c => c.id));
  const widths = ids.map(id => id === 'player_ref' ? 1.5 : Math.max(1.5, Math.min(4.6, (MAN.creatures.find(c => c.id === id).model.length_m || 1) * 0.95)));
  const names = ids.map(id => id === 'player_ref' ? 'player' : MAN.creatures.find(c => c.id === id).name);
  const total = widths.reduce((a, b) => a + b, 0);
  for (const [label, yaw, pitch] of [['lineup_front', 0.35, 0.1], ['lineup_side', 0, 0.06], ['lineup_game', 0.35, 0.84]]) {
    await page.evaluate((ids, widths, names, yaw, pitch, total, side) => { bvShow(ids, { spacing: widths, labels: names, yaw: side ? Math.PI / 2 : 0.3 }); ids.forEach(i => { try { bvPose(i, 'idle', 0); } catch (e) {} });
      bvView({ yaw: yaw, pitch, dist: pitch > 0.5 ? 16.7 : total * 0.95, target: [total / 2, pitch > 0.5 ? 0.6 : 0.9, 0] }); }, ids, widths, names, yaw, pitch, total, label === 'lineup_side');
    await sleep(200); await page.screenshot({ path: path.join(OUT, label + '.png') });
  }
  shots.lineup = { ids, names, files: ['lineup_front.png', 'lineup_side.png', 'lineup_game.png'], game: 'the follow camera distance (~16.7 m, looking down ~48 deg, 30 deg lens)' };
  shots.errors = errs;
  fs.writeFileSync(path.join(OUT, 'shots.json'), JSON.stringify(shots, null, 1));
  console.log('[BESTIARY CAPTURE] ' + MAN.creatures.length + ' creatures, errors ' + errs.length + (errs.length ? '\n' + errs.slice(0, 5).join('\n') : ''));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
