/* Scarlands proof captures (W2/W3, 2026-09-26): tools/scarlands_proof.html at the game camera (30 deg lens, the
 * follow camera's yaw/pitch/distance), every view in the day look and the old-school black-void look, plus the kit
 * catalog, with renderer numbers per view. Writes scratchpad/scarlands_v1/<tag>/.
 * Run: SMOKE_BASE=http://127.0.0.1:8097 SCAR_TAG=pass1 node tools/capture_scarlands_proof.js */
'use strict';
const fs = require('fs'), path = require('path'), puppeteer = require('puppeteer-core');
const TAG = process.env.SCAR_TAG || 'capture', OUT = path.join(__dirname, '..', 'scratchpad', 'scarlands_v1', TAG);
fs.mkdirSync(OUT, { recursive: true });
const BASE = (process.env.SMOKE_BASE || 'http://127.0.0.1:8777') + '/tools/scarlands_proof.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));
// x, z = map tiles (north is +z); yaw 0 looks north from the south, like the game's default heading here
const VIEWS = [
  { name: 's01_plank_crossing', x: 16, z: 45, yaw: 0.35, pitch: 1.0, dist: 24 },
  { name: 's02_stone_causeway', x: 48, z: 45, yaw: -0.4, pitch: 1.0, dist: 24 },
  { name: 's03_game_camera_crossing', x: 16, z: 48, yaw: 0.0, pitch: 1.08, dist: 33 },
  { name: 's04_wall_line', x: 20, z: 71, yaw: 0.25, pitch: 1.0, dist: 24 },
  { name: 's05_ruined_room', x: 31, z: 89, yaw: 0.5, pitch: 1.08, dist: 28 },
  { name: 's06_rock_camp', x: 52, z: 115, yaw: 0.7, pitch: 1.0, dist: 22 },
  { name: 's07_ditch_panorama', x: 32, z: 47, yaw: 0.0, pitch: 0.75, dist: 50 },
  { name: 's08_pocket_panorama', x: 30, z: 86, yaw: 0.2, pitch: 0.7, dist: 56 },
  { name: 's09_depth_road', x: 46, z: 80, yaw: -0.5, pitch: 1.0, dist: 26 }];
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
    args: ['--window-size=1538,900', '--hide-scrollbars', '--no-first-run', '--enable-gpu', '--ignore-gpu-blocklist'], defaultViewport: { width: 1538, height: 900 } });
  const page = await browser.newPage(), errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 300))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
  await page.goto(BASE + '?v=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.proofReady || window.proofError, { timeout: 120000 });
  const err = await page.evaluate(() => window.proofError || null); if (err) throw new Error(err);
  const rows = [];
  for (const v of VIEWS) for (const mode of ['day', 'void']) {
    await page.evaluate((v, mode) => window.proofView(Object.assign({}, v, { mode })), v, mode);
    await sleep(400);
    const st = await page.evaluate(() => window.proofStats());
    await page.screenshot({ path: path.join(OUT, v.name + '_' + mode + '.png') });
    rows.push({ view: v.name, mode, calls: st.calls, triangles: st.triangles, textures: st.textures, programs: st.programs });
  }
  await page.evaluate(() => { window.proofCatalog(true); window.proofView({ x: 221, z: 213, yaw: 0, pitch: 1.0, dist: 62, mode: 'day' }); });
  await sleep(500); await page.screenshot({ path: path.join(OUT, 'catalog.png') });
  const drawn = await page.evaluate(() => window.proofStats().drawn);
  fs.writeFileSync(path.join(OUT, 'perf.json'), JSON.stringify({ tag: TAG, views: rows, drawn, errors: errs }, null, 1));
  console.log('[SCARLANDS PROOF CAPTURE] ' + rows.length + ' shots, errors ' + errs.length + (errs.length ? '\n' + errs.join('\n') : ''));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
