/* qa_mine_gatehouse.js — headless QA + capture for the Tutor's Holm Mine Gatehouse.
 * Real login in a throwaway ?qaProfile, real pathing from the Guide Hall apron up the
 * mine road, closed-wall negative, south gate, the winch house, the road door out to
 * Warden's Ridge, save/reload persistence, then the real cavern descent through the
 * shaft inside the building (the required `descend_cavern` interaction).
 * Run: node tools/qa_mine_gatehouse.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const OUT = path.join(__dirname, '..', 'scratchpad', 'mine_gatehouse_v1');
fs.mkdirSync(OUT, {recursive: true});
const PROFILE = 'fable-gate-qa-' + Date.now().toString(36);
const URL = 'http://127.0.0.1:8777/?qaProfile=' + PROFILE;
const OBJ = 'holm_mine_gatehouse';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const checks = [];
function ok(label, cond, detail){ checks.push({label, ok: !!cond, detail}); console.log((cond ? '  ok  ' : '  FAIL ') + label + (detail ? '  ' + JSON.stringify(detail) : '')); }

async function login(page){
  await page.waitForFunction(() => { const w = document.getElementById('welcome-screen'); return w && w.style.display === 'flex'; }, {timeout: 60000});
  const hadSave = await page.evaluate(() => { try { return SaveGame.exists(); } catch (e) { return false; } });
  if (hadSave) await page.evaluate(() => document.getElementById('btn-continue').click());
  else {
    await page.evaluate(() => document.getElementById('btn-new').click());
    await page.waitForFunction(() => document.getElementById('login-create').style.display !== 'none', {timeout: 8000});
    await page.evaluate(() => document.getElementById('btn-begin').click());
  }
  await page.waitForFunction(() => document.getElementById('login-play').style.display !== 'none', {timeout: 8000});
  await page.evaluate(() => { try { CharCfg._new = false; } catch (e) {} document.getElementById('play-btn').click(); });
  await page.waitForFunction(() => { if (typeof running === 'undefined' || !running) return false; const b = document.getElementById('enter-buffer'); return !b || b.style.display === 'none'; }, {timeout: 30000});
  return hadSave;
}
async function walkTo(page, x, z, timeout){
  await page.evaluate((x, z) => minimapWalkTo({x, z}), x, z);
  await page.waitForFunction(() => !Player.moveTo, {timeout: timeout || 60000});
  await sleep(400);
  return page.evaluate(() => [+player.position.x.toFixed(2), +player.position.z.toFixed(2)]);
}
async function openDoor(page, partId){
  await page.waitForFunction((partId, obj) => (WORLD.doors || []).some(d => d.userData.worldObjectId === obj && d.userData.partId === partId), {timeout: 8000}, partId, OBJ).catch(() => {});
  const state = await page.evaluate((partId, obj) => {
    const d = (WORLD.doors || []).find(d => d.userData.worldObjectId === obj && d.userData.partId === partId);
    if (!d) throw new Error('door not found ' + partId + ' among ' + JSON.stringify((WORLD.doors || []).map(x => [x.userData.worldObjectId, x.userData.partId, x.userData.open])));
    if (d.userData.open) return 'already-open';
    handleClick(d, d.position); return 'clicked';
  }, partId, OBJ);
  await page.waitForFunction((partId, obj) => (WORLD.doors || []).some(d => d.userData.worldObjectId === obj && d.userData.partId === partId && d.userData.open), {timeout: 15000}, partId, OBJ);
  await sleep(300);
  return state;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--window-size=1538,900', '--hide-scrollbars', '--mute-audio', '--no-first-run'],
    defaultViewport: {width: 1538, height: 900},
  });
  const page = await browser.newPage();
  const pageErrors = [], consoleErrors = [], failedLoads = [];
  page.on('pageerror', e => pageErrors.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) consoleErrors.push(m.text().slice(0, 300)); });
  page.on('response', r => { if (r.status() >= 400 && !/favicon\.ico$/.test(r.url())) failedLoads.push(r.status() + ' ' + r.url()); });
  await page.goto(URL + '&boot=' + Date.now(), {waitUntil: 'domcontentloaded', timeout: 60000});
  const hadSave = await login(page);
  ok('fresh QA profile booted through the real login flow', !hadSave);

  const approach = await walkTo(page, 128.5, 125.5);
  ok('real pathing climbs the mine road to the south gate approach', Math.abs(approach[0] - 128.5) < 1.1 && Math.abs(approach[1] - 125.5) < 1.1, approach);
  const loaded = await page.evaluate(() => ({gate: !!scene.getObjectByName('world-object-holm_mine_gatehouse'), pad: !!scene.getObjectByName('world-object-holm_pad_mine_gatehouse'),
    shaft: !!HolmMineGatehouse.shaftClimb(), shaftPos: (() => { const s = HolmMineGatehouse.shaftClimb(); return s ? [+s.position.x.toFixed(1), +s.position.z.toFixed(1)] : null; })()}));
  ok('gatehouse streamed in, its pad is gone, and the cavern shaft stands inside the winch house', loaded.gate && !loaded.pad && loaded.shaft && loaded.shaftPos && loaded.shaftPos[0] === 124.5 && loaded.shaftPos[1] === 119.5, loaded);
  await page.evaluate(() => { camCtl.dist = 16; });
  await sleep(600);
  await page.screenshot({path: path.join(OUT, 'in_game_approach.png')});

  const throughWall = await walkTo(page, 124.5, 119.5, 20000);
  ok('closed gate keeps the winch house unreachable from the road', !(throughWall[0] > 122.1 && throughWall[0] < 131.9 && throughWall[1] > 115.1 && throughWall[1] < 122.9), throughWall);
  await openDoor(page, 'gate_door');
  const passage = await walkTo(page, 129.5, 121.5);
  ok('mine gate opens and the cobbled passage is enterable', Math.abs(passage[0] - 129.5) < 1.1 && Math.abs(passage[1] - 121.5) < 1.1, passage);
  const roof = await page.evaluate(() => { const r = (WORLD.roofs || []).find(r => r.buildingId === 'holm_mine_gatehouse'); return r ? r.mesh.visible : null; });
  ok('roof cuts away when the player stands in the passage', roof === false, {roofVisible: roof});
  await sleep(500);
  await page.screenshot({path: path.join(OUT, 'in_game_passage.png')});

  const winch = await walkTo(page, 124.5, 118.5);
  ok('the arch leads into the winch house beside the shaft', Math.abs(winch[0] - 124.5) < 1.1 && Math.abs(winch[1] - 118.5) < 1.1, winch);
  await page.evaluate(() => { HolmMineGatehouse.readTally(); HolmMineGatehouse.readGateStone(); HolmMineGatehouse.studyFrame(); });
  const dlg = await page.evaluate(() => { const d = document.getElementById('dialogue') || document.getElementById('dlg'); return d ? d.style.display : null; });
  await page.evaluate(() => { const d = document.getElementById('dialogue'); if (d) d.style.display = 'none'; });
  await page.evaluate(() => { camCtl.dist = 12; });
  await sleep(500);
  await page.screenshot({path: path.join(OUT, 'in_game_winch.png')});

  await openDoor(page, 'road_door');
  const road = await walkTo(page, 133.5, 120.5);
  ok('road door opens and the mine road continues east toward Warden\'s Ridge', Math.abs(road[0] - 133.5) < 1.1 && Math.abs(road[1] - 120.5) < 1.1, road);
  await page.evaluate(() => { camCtl.dist = 16; });
  await sleep(500);
  await page.screenshot({path: path.join(OUT, 'in_game_road.png')});

  await page.evaluate(() => SaveGame.save(true));
  await page.goto(URL + '&reload=' + Date.now(), {waitUntil: 'domcontentloaded', timeout: 60000});
  const resumed = await login(page);
  const after = await page.evaluate(() => ({pos: [+player.position.x.toFixed(1), +player.position.z.toFixed(1)], step: Tutorial.step, plane: Player.plane || 0, errors: (window.SMOKE_ERRORS || []).length}));
  ok('reload continues the adventurer at the road door with the route untouched', resumed && Math.abs(after.pos[0] - 133.5) < 2 && Math.abs(after.pos[1] - 120.5) < 2 && after.step === 0 && after.plane === 0, after);

  // The required descent: walk back in and climb the shaft inside the building.
  const back = await walkTo(page, 124.5, 118.5);
  ok('the gatehouse can be re-entered from the road side after reload', Math.abs(back[0] - 124.5) < 1.1 && Math.abs(back[1] - 118.5) < 1.1, back);
  await page.evaluate(() => HolmMineGatehouse.descend());
  await page.waitForFunction(() => (Player.plane || 0) === -1, {timeout: 20000}).catch(() => {});
  const down = await page.evaluate(() => ({plane: Player.plane || 0, pos: [+player.position.x.toFixed(1), +player.position.z.toFixed(1)], zone: (document.getElementById('zone-label') || {}).textContent, errors: (window.SMOKE_ERRORS || []).length}));
  ok('the shaft inside the winch house descends into the Training Cavern entry', down.plane === -1 && Math.abs(down.pos[0] - 286) < 3 && Math.abs(down.pos[1] - 354) < 3, down);
  await sleep(800);
  await page.screenshot({path: path.join(OUT, 'in_game_cavern.png')});
  ok('no page errors, console errors, or failed asset loads across the whole run', pageErrors.length === 0 && consoleErrors.length === 0 && failedLoads.length === 0, {pageErrors, consoleErrors, failedLoads});

  await browser.close();
  const passed = checks.filter(c => c.ok).length;
  fs.writeFileSync(path.join(OUT, 'qa_result.json'), JSON.stringify({profile: PROFILE, passed, total: checks.length, checks, pageErrors, consoleErrors, failedLoads}, null, 2));
  console.log('[GATEHOUSE QA] ' + (passed === checks.length ? 'PASS' : 'FAIL') + ' ' + passed + '/' + checks.length);
  process.exit(passed === checks.length ? 0 : 1);
})().catch(e => { console.error('DRIVER ERROR', e.message); process.exit(1); });
