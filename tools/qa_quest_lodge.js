/* qa_quest_lodge.js — headless QA + capture for the Tutor's Holm Quest Lodge.
 * Real login in a throwaway ?qaProfile, real pathing from the Guide Hall apron to the
 * porch, both doors, roof cutaway, the quest-board study that opens the journal and
 * records the optional lesson, the chart and ledger, the west exit toward the mine road,
 * then save/reload persistence. Screenshots land in scratchpad/quest_lodge_v1/.
 * Run: node tools/qa_quest_lodge.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const OUT = path.join(__dirname, '..', 'scratchpad', 'quest_lodge_v1');
fs.mkdirSync(OUT, {recursive: true});
const PROFILE = 'fable-lodge-qa-' + Date.now().toString(36);
const URL = 'http://127.0.0.1:8777/?qaProfile=' + PROFILE;
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
  await page.waitForFunction(() => !Player.moveTo, {timeout: timeout || 45000});
  await sleep(400);
  return page.evaluate(() => [+player.position.x.toFixed(2), +player.position.z.toFixed(2)]);
}
async function openDoor(page, partId){
  // Doors are found by their stable part id. The engine may already have opened a
  // door when the player was walked onto its entry tile; that counts as open.
  await page.waitForFunction((partId, obj) => (WORLD.doors || []).some(d => d.userData.worldObjectId === obj && d.userData.partId === partId), {timeout: 8000}, partId, 'holm_quest_lodge').catch(() => {});
  const state = await page.evaluate((partId, obj) => {
    const d = (WORLD.doors || []).find(d => d.userData.worldObjectId === obj && d.userData.partId === partId);
    if (!d) throw new Error('door not found ' + partId + ' among ' + JSON.stringify((WORLD.doors || []).map(x => [x.userData.worldObjectId, x.userData.partId, x.userData.open])));
    if (d.userData.open) return 'already-open';
    handleClick(d, d.position); return 'clicked';
  }, partId, 'holm_quest_lodge');
  await page.waitForFunction((partId, obj) => (WORLD.doors || []).some(d => d.userData.worldObjectId === obj && d.userData.partId === partId && d.userData.open), {timeout: 15000}, partId, 'holm_quest_lodge');
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

  const approach = await walkTo(page, 143.5, 135.0);
  ok('real pathing reaches the porch approach from the Lesson Green route node', Math.abs(approach[0] - 143.5) < 1.1 && Math.abs(approach[1] - 135.0) < 1.1, approach);
  const loaded = await page.evaluate(() => ({lodge: !!scene.getObjectByName('world-object-holm_quest_lodge'), pad: !!scene.getObjectByName('world-object-holm_pad_quest_lodge'),
    socketVisible: (() => { const r = scene.getObjectByName('world-object-holm_quest_lodge'); const s = r && WorldV2Buildings.findPart(r, 'quest_guide_socket'); let meshes = 0; if (s) s.traverse(o => { if (o.isMesh) meshes++; }); return meshes; })()}));
  ok('lodge streamed in, its planning pad is gone, and the guide socket ships no geometry', loaded.lodge && !loaded.pad && loaded.socketVisible === 0, loaded);
  await page.evaluate(() => { camCtl.dist = 16; });
  await sleep(600);
  await page.screenshot({path: path.join(OUT, 'in_game_approach.png')});

  // Negative case: with both doors closed, the interior must not be reachable from
  // outside the north wall (the wall spills into the chunk row north of the lodge).
  await walkTo(page, 136.5, 130.5);
  const throughWall = await walkTo(page, 137.5, 133.5, 20000);
  ok('closed lodge walls keep the interior unreachable from the north lawn', !(throughWall[1] > 131.6 && throughWall[1] < 140.4 && throughWall[0] > 130.9 && throughWall[0] < 140.1), throughWall);
  const porch = await walkTo(page, 141.2, 134.5);
  ok('porch deck is walkable up to the lodge door', Math.abs(porch[0] - 141.2) < 1.1 && Math.abs(porch[1] - 134.5) < 1.1, porch);
  await openDoor(page, 'lodge_door');
  const inside = await walkTo(page, 137.5, 133.5);
  ok('lodge door opens and the hall is enterable', Math.abs(inside[0] - 137.5) < 1.1 && Math.abs(inside[1] - 133.5) < 1.1, inside);
  const roof = await page.evaluate(() => { const r = (WORLD.roofs || []).find(r => r.buildingId === 'holm_quest_lodge'); return r ? r.mesh.visible : null; });
  ok('roof cuts away when the player stands inside', roof === false, {roofVisible: roof});
  await sleep(500);
  await page.screenshot({path: path.join(OUT, 'in_game_interior.png')});

  const study = await page.evaluate(() => {
    const before = document.querySelector('.tab-btn[data-tab="quests"].active') ? 1 : 0;
    HolmQuestLodge.studyBoard();
    const after = document.querySelector('.tab-btn[data-tab="quests"].active') ? 1 : 0;
    const pane = document.getElementById('pane-quests');
    return {before, after, paneActive: !!(pane && pane.classList.contains('active')), optional: Tutorial.optional, status: HolmQuestLodge.status(), step: Tutorial.step};
  });
  ok('studying the board opens the quest journal and records learn_quests without touching the required route', study.after === 1 && study.paneActive && study.optional && study.optional.learn_quests === true && study.step === 0, study);
  await page.evaluate(() => { try { UI.closeDialogue && UI.closeDialogue(); } catch (e) {} const d = document.getElementById('dialogue'); if (d) d.style.display = 'none'; });
  const turret = await walkTo(page, 133.6, 133.6);
  ok('chart turret is reachable through the turret mouth', Math.abs(turret[0] - 133.6) < 1.1 && Math.abs(turret[1] - 133.6) < 1.1, turret);
  await page.evaluate(() => { HolmQuestLodge.studyChart(); HolmQuestLodge.readLedger(); });
  await page.evaluate(() => { camCtl.dist = 12; });
  await sleep(500);
  await page.screenshot({path: path.join(OUT, 'in_game_turret.png')});

  const corner = await walkTo(page, 134.1, 138.7);
  ok('reading corner beside the road door is reachable around the ledger and rack', Math.abs(corner[0] - 134.1) < 1.1 && Math.abs(corner[1] - 138.7) < 1.1, corner);
  await openDoor(page, 'road_door');
  const road = await walkTo(page, 131.0, 137.5);
  ok('road door opens and the west exit toward the mine road is walkable', Math.abs(road[0] - 131.0) < 1.1 && Math.abs(road[1] - 137.5) < 1.1, road);
  const onward = await walkTo(page, 128.5, 137.5);
  ok('the spine road at x=128 is reachable from the road door without a cliff step', Math.abs(onward[0] - 128.5) < 1.1 && Math.abs(onward[1] - 137.5) < 1.1, onward);
  await page.evaluate(() => { camCtl.dist = 16; });
  await sleep(500);
  await page.screenshot({path: path.join(OUT, 'in_game_road.png')});

  await page.evaluate(() => SaveGame.save(true));
  await page.goto(URL + '&reload=' + Date.now(), {waitUntil: 'domcontentloaded', timeout: 60000});
  const resumed = await login(page);
  const after = await page.evaluate(() => ({optional: Tutorial.optional, pos: [+player.position.x.toFixed(1), +player.position.z.toFixed(1)], step: Tutorial.step, errors: (window.SMOKE_ERRORS || []).length}));
  ok('reload continues the adventurer with the optional ledger and position intact', resumed && after.optional && after.optional.learn_quests === true && Math.abs(after.pos[0] - 128.5) < 2 && Math.abs(after.pos[1] - 137.5) < 2 && after.step === 0, after);
  ok('no page errors, console errors, or failed asset loads across the whole run', pageErrors.length === 0 && consoleErrors.length === 0 && failedLoads.length === 0, {pageErrors, consoleErrors, failedLoads});

  await browser.close();
  const passed = checks.filter(c => c.ok).length;
  fs.writeFileSync(path.join(OUT, 'qa_result.json'), JSON.stringify({profile: PROFILE, passed, total: checks.length, checks, pageErrors, consoleErrors, failedLoads}, null, 2));
  console.log('[LODGE QA] ' + (passed === checks.length ? 'PASS' : 'FAIL') + ' ' + passed + '/' + checks.length);
  process.exit(passed === checks.length ? 0 : 1);
})().catch(e => { console.error('DRIVER ERROR', e.message); process.exit(1); });
