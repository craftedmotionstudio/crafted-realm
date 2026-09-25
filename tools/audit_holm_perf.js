/* Tutor's Holm performance baseline (headless Chrome, real game; goal P2-C).
 * At every station of the flow (plus the cavern) it settles the stream, points the follow camera
 * at play distance and at the elevated maximum, and records renderer draw calls / triangles, the
 * per-world-object inventory (meshes, triangles, materials, in-frustum share) and an rAF frame
 * sample. Headless frame times are software-rendered and indicative only; the real worst-frame
 * numbers come from the same probe run in a foreground browser (recorded next to these).
 * Writes scratchpad/holm_perf/baseline.json + baseline.md. Run: node tools/audit_holm_perf.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const OUT = path.join(__dirname, '..', 'scratchpad', 'holm_perf');
fs.mkdirSync(OUT, {recursive: true});
const PROFILE = 'fable-perf-' + Date.now().toString(36);
const URL = 'http://127.0.0.1:8777/?qaProfile=' + PROFILE;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const VIEWS = [{id: 'play', dist: 33, pitch: 1.08}, {id: 'elevated', dist: 70, pitch: 1.08}];
const BUDGET = {drawCalls: 120, worstFrameMs: 30};

async function login(page){
  await page.waitForFunction(() => { const w = document.getElementById('welcome-screen'); return w && w.style.display === 'flex'; }, {timeout: 60000});
  await page.evaluate(() => document.getElementById('btn-new').click());
  await page.waitForFunction(() => document.getElementById('login-create').style.display !== 'none', {timeout: 8000});
  await page.evaluate(() => (document.getElementById('btn-begin').click(),(()=>{try{CharCfg._new=false}catch(e){}})()));
  await page.waitForFunction(() => (document.getElementById('login-play').style.display !== 'none'||(typeof running!=='undefined'&&running)), {timeout: 8000});
  await page.evaluate(() => { try { CharCfg._new = false; } catch (e) {} if(!(typeof running!=='undefined'&&running))document.getElementById('play-btn').click(); });
  await page.waitForFunction(() => { if (typeof running === 'undefined' || !running) return false; const b = document.getElementById('enter-buffer'); return !b || b.style.display === 'none'; }, {timeout: 30000});
  await sleep(1500);
}
/* wait until the object ledger stops changing (chunk stream settled) */
async function settle(page){
  let prev = null, stable = 0;
  for (let i = 0; i < 40; i++){
    const key = await page.evaluate(() => { const s = CRWorldMode.provider.snapshot(); return JSON.stringify([s.objects && s.objects.liveObjectIds, s.objects && s.objects.loads, s.terrain && s.terrain.residentChunks]); });
    if (key === prev){ if (++stable >= 3) break; } else stable = 0;
    prev = key; await sleep(400);
  }
}
async function measure(page, view){
  await page.evaluate(v => { camCtl.dist = v.dist; camCtl.pitch = v.pitch; }, view);
  await sleep(1400);                       // camera lerp (0.15/frame) settles
  return page.evaluate(async () => {
    const stats = CRPerfProbe.renderStats();
    const inv = CRPerfProbe.inventory();
    const frame = await CRPerfProbe.sample(2);
    const dbg = CRDebugStats();
    return {stats, inv, frame, meshes: dbg.meshes, materials: dbg.materials, geometries: dbg.geometries};
  });
}

(async () => {
  const browser = await puppeteer.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
    args: ['--window-size=1538,900', '--hide-scrollbars', '--mute-audio', '--no-first-run'], defaultViewport: {width: 1538, height: 900}});
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.goto(URL + '&boot=' + Date.now(), {waitUntil: 'domcontentloaded', timeout: 60000});
  await login(page);
  const stations = await page.evaluate(() => HolmTutorialFlow.stations.map(s => ({id: s.id, label: s.label, x: s.entry.x, z: s.entry.z, underground: !!s.underground})));
  const rows = [];
  for (const st of stations){
    const plane = st.underground ? -1 : 0;
    await page.evaluate((st, plane) => Planes.climbTo({plane, x: st.x + (Number.isInteger(st.x) ? 0.5 : 0), z: st.z + (Number.isInteger(st.z) ? 0.5 : 0), zone: plane < 0 ? 'Training Cavern' : "Tutor's Holm"}), st, plane);
    await sleep(1200);
    await settle(page);
    const row = {id: st.id, label: st.label, plane, views: {}};
    for (const v of VIEWS) row.views[v.id] = await measure(page, v);
    rows.push(row);
    const e = row.views.elevated, p = row.views.play;
    console.log(`  ${st.label.padEnd(18)} play ${String(p.stats.calls).padStart(4)} calls ${String(p.stats.triangles).padStart(7)} tris | elevated ${String(e.stats.calls).padStart(4)} calls ${String(e.stats.triangles).padStart(7)} tris  worst ${e.frame.worstMs} ms (headless)`);
  }
  /* per-building inventory at the elevated view of its own station */
  const buildings = {};
  for (const row of rows) for (const [k, v] of Object.entries(row.views.elevated.inv)) if (k.indexOf('holm_') === 0 && !(k in buildings)) buildings[k] = v;
  const worstCalls = Math.max(...rows.map(r => r.views.elevated.stats.calls));
  const result = {profile: PROFILE, budget: BUDGET, stations: rows, buildings, worstElevatedCalls: worstCalls,
    over: rows.filter(r => r.views.elevated.stats.calls > BUDGET.drawCalls).map(r => r.id), errors};
  fs.writeFileSync(path.join(OUT, 'baseline.json'), JSON.stringify(result, null, 2));
  const md = [];
  md.push('| Station | Play calls | Play tris | Elevated calls | Elevated tris | Headless worst ms |', '|---|---:|---:|---:|---:|---:|');
  for (const r of rows) md.push(`| ${r.label} | ${r.views.play.stats.calls} | ${r.views.play.stats.triangles} | ${r.views.elevated.stats.calls} | ${r.views.elevated.stats.triangles} | ${r.views.elevated.frame.worstMs} |`);
  md.push('', '| Object | Meshes | Triangles | Materials |', '|---|---:|---:|---:|');
  for (const [k, v] of Object.entries(buildings).sort((a, b) => b[1].tris - a[1].tris)) md.push(`| ${k} | ${v.meshes} | ${v.tris} | ${v.materials} |`);
  fs.writeFileSync(path.join(OUT, 'baseline.md'), md.join('\n') + '\n');
  console.log(`[PERF] worst elevated draw calls ${worstCalls} (budget ${BUDGET.drawCalls}); over budget: ${result.over.length ? result.over.join(', ') : 'none'}; errors ${errors.length}`);
  await browser.close();
})().catch(e => { console.error('DRIVER ERROR', e.message); process.exit(1); });
