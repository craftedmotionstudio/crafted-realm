/* qa_combat_hall.js — headless QA + capture for the Tutor's Holm Combat Hall.
 * Real login in a throwaway ?qaProfile, real pathing along the ridge, long-route negative,
 * the bank-side door, the pell study opening the combat tab, the arch into the drill tower
 * landing, the south road door, save/reload, and finally the real cavern round trip: descend
 * at the Mine Gatehouse, walk the cavern to the exit ladder, climb, and surface inside the
 * drill tower. Run: node tools/qa_combat_hall.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const OUT = path.join(__dirname, '..', 'scratchpad', 'combat_hall_v1');
fs.mkdirSync(OUT, {recursive: true});
const PROFILE = 'fable-hall-qa-' + Date.now().toString(36);
const URL = 'http://127.0.0.1:8777/?qaProfile=' + PROFILE;
const OBJ = 'holm_combat_hall';
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

  const approach = await walkTo(page, 164.5, 118.5, 120000);
  ok('real pathing reaches the ridge between the bank and the hall', Math.abs(approach[0] - 164.5) < 1.1 && Math.abs(approach[1] - 118.5) < 1.1, approach);
  const loaded = await page.evaluate(() => ({hall: !!scene.getObjectByName('world-object-holm_combat_hall'), pad: !!scene.getObjectByName('world-object-holm_pad_combat_hall'),
    sockets: (() => { const r = scene.getObjectByName('world-object-holm_combat_hall'); let meshes = 0; ['melee_dummy_socket', 'ranged_target_socket'].forEach(id => { const s = r && WorldV2Buildings.findPart(r, id); if (s) s.traverse(o => { if (o.isMesh) meshes++; }); }); return meshes; })()}));
  ok('hall streamed in, its pad is gone, and the practice sockets ship no geometry', loaded.hall && !loaded.pad && loaded.sockets === 0, loaded);
  await page.evaluate(() => { camCtl.dist = 16; });
  await sleep(600);
  await page.screenshot({path: path.join(OUT, 'in_game_approach.png')});

  const north = await walkTo(page, 176.5, 111.5, 60000);
  const plan = await page.evaluate(() => { minimapWalkTo({x: 176.5, z: 116.5}); return (Player.path || []).length; });
  await page.waitForFunction(() => !Player.moveTo, {timeout: 40000});
  ok('from the north the plan into the drill tower goes round through a door, not through the wall', Math.abs(north[1] - 111.5) < 1.1 && plan >= 12, {north, planLength: plan});
  await walkTo(page, 164.5, 118.5, 60000);
  await openDoor(page, 'bank_door');
  const hall = await walkTo(page, 171, 121.2);
  ok('bank-side door opens and the drill hall is enterable', Math.abs(hall[0] - 171) < 1.1 && Math.abs(hall[1] - 121.2) < 1.1, hall);
  const roof = await page.evaluate(() => { const r = (WORLD.roofs || []).find(r => r.buildingId === 'holm_combat_hall'); return r ? r.mesh.visible : null; });
  ok('roof cuts away when the player stands in the hall', roof === false, {roofVisible: roof});
  await sleep(500);
  await page.screenshot({path: path.join(OUT, 'in_game_hall.png')});

  const pell = await page.evaluate(() => { HolmCombatHall.studyPell(); const tab = !!document.querySelector('.tab-btn[data-tab="combat"].active'); const d = document.getElementById('dialogue'); const shown = d && d.style.display !== 'none'; if (d) d.style.display = 'none'; return {tab, shown, step: Tutorial.step}; });
  ok('the pell study opens the combat tab and leaves the required route untouched', pell.tab && pell.step === 0, pell);
  await page.evaluate(() => { HolmCombatHall.studyRack(); HolmCombatHall.readRoll(); const d = document.getElementById('dialogue'); if (d) d.style.display = 'none'; });
  const apse = await walkTo(page, 170, 115.6);
  ok('the armoury apse mouth is reachable', Math.abs(apse[0] - 170) < 1.1 && Math.abs(apse[1] - 115.6) < 1.1, apse);
  const tower = await walkTo(page, 176.5, 116.5);
  ok('the arch leads into the drill tower onto the cavern stair landing', Math.abs(tower[0] - 176.5) < 1.1 && Math.abs(tower[1] - 116.5) < 1.1, tower);
  await page.evaluate(() => { camCtl.dist = 12; });
  await sleep(500);
  await page.screenshot({path: path.join(OUT, 'in_game_tower.png')});
  const yard = await walkTo(page, 175.5, 122.5);
  ok('the covered practice yard beside the butt is walkable', Math.abs(yard[0] - 175.5) < 1.1 && Math.abs(yard[1] - 122.5) < 1.1, yard);

  await walkTo(page, 169.5, 122.3);
  await openDoor(page, 'road_door');
  const road = await walkTo(page, 169.5, 125.5);
  ok('road door opens and the hall exits south toward the ridge road', Math.abs(road[0] - 169.5) < 1.1 && Math.abs(road[1] - 125.5) < 1.1, road);
  await page.evaluate(() => SaveGame.save(true));
  await page.goto(URL + '&reload=' + Date.now(), {waitUntil: 'domcontentloaded', timeout: 60000});
  const resumed = await login(page);
  const after = await page.evaluate(() => ({pos: [+player.position.x.toFixed(1), +player.position.z.toFixed(1)], step: Tutorial.step, errors: (window.SMOKE_ERRORS || []).length}));
  ok('reload continues the adventurer south of the hall with the route untouched', resumed && Math.abs(after.pos[0] - 169.5) < 2 && Math.abs(after.pos[1] - 125.5) < 2 && after.step === 0, after);

  // The real round trip: down at the gatehouse, through the cavern, up into the tower.
  const winch = await walkTo(page, 124.5, 118.5, 120000);
  ok('the gatehouse winch house is reachable from the hall side', Math.abs(winch[0] - 124.5) < 1.1 && Math.abs(winch[1] - 118.5) < 1.1, winch);
  await page.evaluate(() => HolmMineGatehouse.descend());
  await page.waitForFunction(() => (Player.plane || 0) === -1, {timeout: 20000}).catch(() => {});
  const down = await page.evaluate(() => ({plane: Player.plane || 0, pos: [+player.position.x.toFixed(1), +player.position.z.toFixed(1)]}));
  ok('the shaft descends into the cavern', down.plane === -1, down);
  const exitApproach = await walkTo(page, 321.5, 355.5, 120000);
  ok('the cavern route reaches the exit ladder', Math.abs(exitApproach[0] - 321.5) < 1.6 && Math.abs(exitApproach[1] - 355.5) < 1.6, exitApproach);
  await page.evaluate(() => { const l = (WORLD.clickables || []).find(o => o.userData && o.userData.kind === 'climb' && /Cavern exit/.test(String(o.userData.label || ''))); if (!l) throw new Error('exit ladder missing'); handleClick(l, l.position); });
  await page.waitForFunction(() => (Player.plane || 0) === 0, {timeout: 20000}).catch(() => {});
  // the surface chunks stream back in after the climb; wait for the hall's roof entry to exist and cut away
  await page.waitForFunction(() => { const r = (WORLD.roofs || []).find(r => r.buildingId === 'holm_combat_hall'); return !!r && r.mesh.visible === false; }, {timeout: 20000}).catch(() => {});
  const up = await page.evaluate(() => ({plane: Player.plane || 0, pos: [+player.position.x.toFixed(1), +player.position.z.toFixed(1)], zone: (document.getElementById('zone-label') || {}).textContent,
    roof: (() => { const r = (WORLD.roofs || []).find(r => r.buildingId === 'holm_combat_hall'); return r ? r.mesh.visible : null; })(), errors: (window.SMOKE_ERRORS || []).length}));
  ok('the cavern exit surfaces inside the Combat Hall drill tower with the roof cut away', up.plane === 0 && Math.abs(up.pos[0] - 176.5) < 1.6 && Math.abs(up.pos[1] - 116.5) < 1.6 && up.roof === false, up);
  await page.evaluate(() => { camCtl.dist = 14; });
  await sleep(800);
  await page.screenshot({path: path.join(OUT, 'in_game_surfaced.png')});
  ok('no page errors, console errors, or failed asset loads across the whole run', pageErrors.length === 0 && consoleErrors.length === 0 && failedLoads.length === 0, {pageErrors, consoleErrors, failedLoads});

  await browser.close();
  const passed = checks.filter(c => c.ok).length;
  fs.writeFileSync(path.join(OUT, 'qa_result.json'), JSON.stringify({profile: PROFILE, passed, total: checks.length, checks, pageErrors, consoleErrors, failedLoads}, null, 2));
  console.log('[HALL QA] ' + (passed === checks.length ? 'PASS' : 'FAIL') + ' ' + passed + '/' + checks.length);
  process.exit(passed === checks.length ? 0 : 1);
})().catch(e => { console.error('DRIVER ERROR', e.message); process.exit(1); });
