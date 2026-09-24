/* Tutor's Holm streaming + load audit (headless Chrome, real game; goal P2-C).
 *  1. Cold boot: browser cache disabled, fresh profile; time from navigation to the welcome screen, the
 *     coordinator's per-step durations, and every GLB/asset fetch (count, bytes, slowest).
 *  2. Route stream: walks every required leg of the curriculum route (the pacing audit's legs) with an
 *     in-page rAF gap recorder; each frame gap over 30 ms is stamped with the player tile and the provider's
 *     residency counter so a hitch can be blamed on a chunk boundary (or not). Reports boundary crossings,
 *     worst residency ms, worst frame gap, and every gap over the 60 ms bar.
 * Headless frame times are software-rendered and pessimistic; a gap that only appears here is noted as such.
 * Writes scratchpad/holm_perf/streaming.json. Run: node tools/audit_holm_streaming.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const OUT = path.join(__dirname, '..', 'scratchpad', 'holm_perf');
fs.mkdirSync(OUT, {recursive: true});
const PROFILE = 'fable-stream-' + Date.now().toString(36);
const URL = 'http://127.0.0.1:8777/?qaProfile=' + PROFILE;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BAR = {hitchMs: 60, bootMs: 5000, residencyMs: 60};

async function login(page){
  await page.waitForFunction(() => { const w = document.getElementById('welcome-screen'); return w && w.style.display === 'flex'; }, {timeout: 60000});
  await page.evaluate(() => document.getElementById('btn-new').click());
  await page.waitForFunction(() => document.getElementById('login-create').style.display !== 'none', {timeout: 8000});
  await page.evaluate(() => document.getElementById('btn-begin').click());
  await page.waitForFunction(() => document.getElementById('login-play').style.display !== 'none', {timeout: 8000});
  await page.evaluate(() => { try { CharCfg._new = false; } catch (e) {} document.getElementById('play-btn').click(); });
  await page.waitForFunction(() => { if (typeof running === 'undefined' || !running) return false; const b = document.getElementById('enter-buffer'); return !b || b.style.display === 'none'; }, {timeout: 30000});
  await sleep(1500);
}
async function stage(page, x, z){
  await page.evaluate((x, z) => { minimapWalkTo({x, z}); }, x, z);
  await page.waitForFunction(() => !Player.moveTo, {timeout: 90000}).catch(() => {});
}
async function leg(page, name, points){
  await page.evaluate(name => { window.__streamRec.beginLeg(name); }, name);
  for (const [x, z] of points) await stage(page, x, z);
  const row = await page.evaluate(() => window.__streamRec.endLeg());
  console.log(`  ${row.name.padEnd(46)} cross ${String(row.crossings).padStart(2)}  residency max ${String(row.maxResidencyMs).padStart(6)} ms  worst gap ${String(row.worstGapMs).padStart(6)} ms  gaps>60 ${row.hitches.length}${row.hitches.length ? ' (' + row.hitches.map(h => h.ms + 'ms@' + h.tile + (h.boundary ? '*' : '')).join(', ') + ')' : ''}`);
  return row;
}

(async () => {
  const browser = await puppeteer.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
    args: ['--window-size=1538,900', '--hide-scrollbars', '--mute-audio', '--no-first-run'], defaultViewport: {width: 1538, height: 900}});
  const page = await browser.newPage();
  await page.setCacheEnabled(false);                                  // cold cache for the boot measurement
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  const navT0 = Date.now();
  await page.goto(URL + '&boot=' + Date.now(), {waitUntil: 'domcontentloaded', timeout: 60000});
  await page.waitForFunction(() => { const w = document.getElementById('welcome-screen'); return w && w.style.display === 'flex'; }, {timeout: 60000});
  const bootWallMs = Date.now() - navT0;
  const boot = await page.evaluate(() => {
    const t = window.CR_BOOT_TELEMETRY || {};
    const res = performance.getEntriesByType('resource').map(r => ({name: r.name.replace(/^https?:\/\/[^/]+\//, ''), ms: +r.duration.toFixed(0), bytes: r.transferSize || r.encodedBodySize || 0}));
    const glb = res.filter(r => /\.glb/.test(r.name));
    const js = res.filter(r => /\.js(\?|$)/.test(r.name));
    const nav = performance.getEntriesByType('navigation')[0];
    const byType = {};
    res.forEach(r => { const ext = (r.name.split('?')[0].split('.').pop() || '').toLowerCase(); const e = byType[ext] || (byType[ext] = {count: 0, bytes: 0}); e.count++; e.bytes += r.bytes; });
    const largest = res.slice().sort((a, b) => b.bytes - a.bytes).slice(0, 8).map(r => ({name: r.name.split('?')[0], mb: +(r.bytes / 1048576).toFixed(2)}));
    return {coordinatorMs: t.totalMs, steps: (t.steps || []).map(s => ({id: s.id, ms: s.durationMs})),
      domContentLoadedMs: nav ? +nav.domContentLoadedEventEnd.toFixed(0) : null,
      welcomeAtMs: +performance.now().toFixed(0),
      resources: res.length, totalBytes: res.reduce((n, r) => n + r.bytes, 0), byType, largest,
      js: {count: js.length, bytes: js.reduce((n, r) => n + r.bytes, 0)},
      glb: {count: glb.length, bytes: glb.reduce((n, r) => n + r.bytes, 0), slowest: glb.sort((a, b) => b.ms - a.ms).slice(0, 5)}};
  });
  console.log(`[BOOT cold] welcome at ${boot.welcomeAtMs} ms (wall ${bootWallMs} ms); coordinator ${boot.coordinatorMs} ms; ${boot.resources} resources, ${(boot.totalBytes / 1048576).toFixed(1)} MB; GLB ${boot.glb.count} files ${(boot.glb.bytes / 1048576).toFixed(1)} MB, slowest ${boot.glb.slowest.map(g => g.name.split('/').pop() + ' ' + g.ms + 'ms').join(', ')}`);
  // the welcome-screen warm-up passes are synchronous compiles; under headless software GL they can hold the
  // main thread for tens of seconds, so wait for them before logging in (a real browser finishes in ~1 s)
  await page.waitForFunction(() => typeof WorldV2Warmup === 'undefined' || WorldV2Warmup.snapshot().deferred !== 'pending', {timeout: 300000, polling: 1000});
  boot.warmup = await page.evaluate(() => typeof WorldV2Warmup === 'undefined' ? null : (function(s){ return {bootPassMs: s.ms, deferred: s.deferred, deferredMs: s.deferredMs, programs: s.programsAfter}; })(WorldV2Warmup.snapshot()));
  console.log(`[WARMUP] boot pass ${boot.warmup && boot.warmup.bootPassMs} ms; welcome-screen passes ${boot.warmup && boot.warmup.deferred} in ${boot.warmup && boot.warmup.deferredMs} ms; ${boot.warmup && boot.warmup.programs} programs`);
  console.log(`[BOOT bytes] ${Object.entries(boot.byType).sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 6).map(([k, v]) => k + ' ' + v.count + 'x ' + (v.bytes / 1048576).toFixed(1) + 'MB').join(', ')}; largest ${boot.largest.slice(0, 4).map(r => r.name.split('/').pop() + ' ' + r.mb + 'MB').join(', ')}`);
  await page.setCacheEnabled(true);
  await login(page);

  // in-page recorder: rAF gaps stamped with tile + residency counter; boundary = residency changed within 250 ms
  await page.evaluate(() => {
    const rec = {leg: null, rows: [], gaps: [], lastChanges: 0, lastChangeAt: 0, last: performance.now(), raf: null};
    function prov(){ return CRWorldMode.provider; }
    function tick(){
      rec.raf = requestAnimationFrame(tick);
      const now = performance.now(), gap = now - rec.last; rec.last = now;
      const t = prov().snapshot();
      if (t.residencyChanges !== rec.lastChanges){ rec.lastChanges = t.residencyChanges; rec.lastChangeAt = now; if (rec.leg){ rec.leg.crossings++; rec.leg.maxResidencyMs = Math.max(rec.leg.maxResidencyMs, t.lastResidencyMs || 0); } }
      if (rec.leg && gap > 30){
        rec.leg.gaps.push({ms: +gap.toFixed(1), tile: Math.floor(player.position.x) + ',' + Math.floor(player.position.z), boundary: (now - rec.lastChangeAt) < 250, residencyMs: t.lastResidencyMs});
      }
      if (rec.leg) rec.leg.worstGapMs = Math.max(rec.leg.worstGapMs, +gap.toFixed(1));
    }
    rec.beginLeg = name => { rec.leg = {name, crossings: 0, maxResidencyMs: 0, worstGapMs: 0, gaps: [], t0: performance.now()}; rec.last = performance.now(); };
    rec.endLeg = () => { const l = rec.leg; rec.leg = null; l.seconds = +((performance.now() - l.t0) / 1000).toFixed(1); l.hitches = l.gaps.filter(g => g.ms > 60); rec.rows.push(l); return l; };
    rec.raf = requestAnimationFrame(tick);
    window.__streamRec = rec;
  });
  const legs = [];
  legs.push(await leg(page, 'L1 arrival apron -> relief chart tile', [[151.5, 157.5]]));
  legs.push(await leg(page, 'L2 chart -> marked tree (via teaching door)', [[151.5, 145.5], [134.5, 147.5], [134.5, 157.5], [125.5, 159.5]]));
  legs.push(await leg(page, 'L3 tree -> fishing dock', [[131.5, 152.5]]));
  legs.push(await leg(page, 'L4 dock -> gatehouse winch tile', [[128.5, 146.5], [128.5, 137.5], [128.5, 126.5], [124.5, 118.5]]));
  await page.evaluate(() => HolmMineGatehouse.descend());
  await page.waitForFunction(() => (Player.plane || 0) === -1, {timeout: 20000}).catch(() => {});
  await sleep(1500);
  legs.push(await leg(page, 'L5-L8 cavern copper -> tin -> furnace -> exit', [[294.5, 355.5], [300.5, 366.5], [303.5, 375.5], [304.5, 361.5], [301.5, 361.5], [321.5, 355.5]]));
  await page.evaluate(() => { const l = (WORLD.clickables || []).find(o => o.userData && o.userData.kind === 'climb' && /Cavern exit/.test(String(o.userData.label || ''))); handleClick(l, l.position); });
  await page.waitForFunction(() => (Player.plane || 0) === 0, {timeout: 30000}).catch(() => {});
  await sleep(2500);
  legs.push(await leg(page, 'L9 hall tower -> bank booth tile', [[169.5, 121.5], [164.5, 118.5], [157.5, 122.5], [154.5, 117.5]]));
  legs.push(await leg(page, 'L10 bank -> Lastlight door step (switchback)', [[158.5, 128.5], [158.5, 142.5], [184.5, 142.5], [184.5, 135.5], [184.5, 128.5], [205.5, 128.5], [205.5, 123.5], [196.5, 125.5]]));
  legs.push(await leg(page, 'L11 summit -> Departure Dock (via tower road)', [[205.5, 123.5], [205.5, 128.5], [184.5, 128.5], [184.5, 135.5], [186.5, 140.5], [193.5, 150.5], [206.5, 151.5]]));
  const provider = await page.evaluate(() => { const s = CRWorldMode.provider.snapshot(); return {residencyChanges: s.residencyChanges, maxResidencyMs: s.maxResidencyMs, loaded: s.loaded, unloaded: s.unloaded, residentChunks: s.residentChunks, objects: s.runtime && s.runtime.objects && {templateBuilds: s.runtime.objects.templateBuilds, cacheHits: s.runtime.objects.cacheHits, loads: s.runtime.objects.loads}}; });
  const crossings = legs.reduce((n, l) => n + l.crossings, 0);
  const boundaryHitches = legs.flatMap(l => l.hitches.filter(h => h.boundary).map(h => Object.assign({leg: l.name}, h)));
  const otherHitches = legs.flatMap(l => l.hitches.filter(h => !h.boundary).map(h => Object.assign({leg: l.name}, h)));
  const result = {profile: PROFILE, bar: BAR, boot: Object.assign({wallMs: bootWallMs}, boot), legs, provider, crossings, boundaryHitches, otherHitches, errors,
    verdict: {coldBootOk: boot.welcomeAtMs <= BAR.bootMs, residencyOk: provider.maxResidencyMs <= BAR.residencyMs, boundaryHitchOk: boundaryHitches.length === 0}};
  fs.writeFileSync(path.join(OUT, 'streaming.json'), JSON.stringify(result, null, 2));
  console.log(`[STREAM] ${crossings} boundary crossings; provider max residency ${provider.maxResidencyMs} ms; boundary hitches >60 ms: ${boundaryHitches.length}; other gaps >60 ms: ${otherHitches.length}; cold boot ${boot.welcomeAtMs} ms (bar ${BAR.bootMs}); errors ${errors.length}`);
  await browser.close();
})().catch(e => { console.error('DRIVER ERROR', e.message); process.exit(1); });
