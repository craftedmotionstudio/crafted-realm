/* Mage Tower v1 gameplay QA (headless Chrome, real game).
 * Real login in a throwaway ?qaProfile, real pathing along the headland road, an outside-wall negative,
 * the west tower door, the rune table study opening the spellbook tab, the arch into the scriptorium
 * (lectern and register), the south dock door, the road on toward the dock, and save/reload.
 * Run: node tools/qa_mage_tower.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const OUT = path.join(__dirname, '..', 'scratchpad', 'mage_tower_v1');
fs.mkdirSync(OUT, {recursive: true});
const PROFILE = 'fable-tower-qa-' + Date.now().toString(36);
const URL = 'http://127.0.0.1:8777/?qaProfile=' + PROFILE;
const OBJ = 'holm_mage_tower';
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

  // Stage along the guided spine so each leg stays inside the resident chunk radius.
  await walkTo(page, 158.5, 142.5, 120000);
  await walkTo(page, 184.5, 142.5, 120000);
  const approach = await walkTo(page, 186.5, 135.5, 120000);
  ok('real pathing reaches the ridge road at the tower door step', Math.abs(approach[0] - 186.5) < 1.1 && Math.abs(approach[1] - 135.5) < 1.1, approach);
  const loaded = await page.evaluate(() => ({tower: !!scene.getObjectByName('world-object-holm_mage_tower'), pad: !!scene.getObjectByName('world-object-holm_pad_mage_tower'),
    socket: (() => { const r = scene.getObjectByName('world-object-holm_mage_tower'); let meshes = 0; const s = r && WorldV2Buildings.findPart(r, 'casting_socket'); if (s) s.traverse(o => { if (o.isMesh) meshes++; }); return meshes; })()}));
  ok('tower streamed in, its pad is gone, and the casting socket ships no geometry', loaded.tower && !loaded.pad && loaded.socket === 0, loaded);
  await page.evaluate(() => { camCtl.dist = 16; });
  await sleep(600);
  await page.screenshot({path: path.join(OUT, 'in_game_approach.png')});

  // Negative: from the dock road south-east of the tower, the plan to the rune table tile must go round through a door.
  const east = await walkTo(page, 196.5, 140.5, 60000);
  const plan = await page.evaluate(() => { minimapWalkTo({x: 191.5, z: 134.5}); return (Player.path || []).length; });
  await page.waitForFunction(() => !Player.moveTo, {timeout: 40000});
  ok('from the dock road the plan to the rune table goes round through a door, not through the wall', Math.abs(east[0] - 196.5) < 1.1 && Math.abs(east[1] - 140.5) < 1.1 && plan >= 12, {east, planLength: plan});
  await walkTo(page, 186.5, 135.5, 60000);
  await openDoor(page, 'west_door');
  const hall = await walkTo(page, 191.5, 134.5);
  ok('west door opens and the casting hall is enterable to the rune table tile', Math.abs(hall[0] - 191.5) < 1.1 && Math.abs(hall[1] - 134.5) < 1.1, hall);
  const roof = await page.evaluate(() => { const r = (WORLD.roofs || []).find(r => r.buildingId === 'holm_mage_tower'); return r ? r.mesh.visible : null; });
  ok('roof and upper study cut away when the player stands in the casting hall', roof === false, {roofVisible: roof});
  await sleep(500);
  await page.screenshot({path: path.join(OUT, 'in_game_hall.png')});

  const table = await page.evaluate(() => { HolmMageTower.studyTable(); const tab = !!document.querySelector('.tab-btn[data-tab="spells"].active'); const d = document.getElementById('dialogue'); const shown = d && d.style.display !== 'none'; if (d) d.style.display = 'none'; return {tab, shown, step: Tutorial.step}; });
  ok('the rune table study opens the spellbook tab and leaves the required route untouched', table.tab && table.step === 0, table);
  const circle = await walkTo(page, 191.5, 137.5);
  ok('the casting circle tile beside the silent socket is walkable', Math.abs(circle[0] - 191.5) < 1.1 && Math.abs(circle[1] - 137.5) < 1.1, circle);
  const lectern = await walkTo(page, 196.5, 136.5);
  ok('the arch leads into the scriptorium to the lectern tile', Math.abs(lectern[0] - 196.5) < 1.1 && Math.abs(lectern[1] - 136.5) < 1.1, lectern);
  await page.evaluate(() => { HolmMageTower.studyLectern(); HolmMageTower.readRegister(); const d = document.getElementById('dialogue'); if (d) d.style.display = 'none'; });
  await page.evaluate(() => { camCtl.dist = 12; });
  await sleep(500);
  await page.screenshot({path: path.join(OUT, 'in_game_scriptorium.png')});
  const register = await walkTo(page, 196.5, 133.5);
  ok('the register tile under the wing\'s north wall is reachable', Math.abs(register[0] - 196.5) < 1.1 && Math.abs(register[1] - 133.5) < 1.1, register);

  await walkTo(page, 191.5, 137.8);
  await openDoor(page, 'south_door');
  const dock = await walkTo(page, 191.5, 140.2);
  ok('south door opens and the tower exits toward the dock road', Math.abs(dock[0] - 191.5) < 1.1 && Math.abs(dock[1] - 140.2) < 1.1, dock);
  const road = await walkTo(page, 193.5, 150.5, 60000);
  ok('the dock road continues south from the tower step', Math.abs(road[0] - 193.5) < 1.1 && Math.abs(road[1] - 150.5) < 1.1, road);
  await page.evaluate(() => SaveGame.save(true));
  await page.goto(URL + '&reload=' + Date.now(), {waitUntil: 'domcontentloaded', timeout: 60000});
  const resumed = await login(page);
  const after = await page.evaluate(() => ({pos: [+player.position.x.toFixed(1), +player.position.z.toFixed(1)], step: Tutorial.step, errors: (window.SMOKE_ERRORS || []).length}));
  ok('reload continues the adventurer on the dock road with the route untouched', resumed && Math.abs(after.pos[0] - 193.5) < 2 && Math.abs(after.pos[1] - 150.5) < 2 && after.step === 0, after);
  ok('no page errors, console errors, or failed asset loads across the whole run', pageErrors.length === 0 && consoleErrors.length === 0 && failedLoads.length === 0, {pageErrors, consoleErrors, failedLoads});

  await browser.close();
  const passed = checks.filter(c => c.ok).length;
  fs.writeFileSync(path.join(OUT, 'qa_result.json'), JSON.stringify({profile: PROFILE, passed, total: checks.length, checks, pageErrors, consoleErrors, failedLoads}, null, 2));
  console.log('[TOWER QA] ' + (passed === checks.length ? 'PASS' : 'FAIL') + ' ' + passed + '/' + checks.length);
  process.exit(passed === checks.length ? 0 : 1);
})().catch(e => { console.error('DRIVER ERROR', e.message); process.exit(1); });
