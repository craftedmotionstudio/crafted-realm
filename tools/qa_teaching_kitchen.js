/* qa_teaching_kitchen.js — headless QA + capture for the Tutor's Holm Teaching Kitchen.
 * Drives the REAL login flow in a throwaway ?qaProfile, walks to the kitchen with the
 * game's own pathing, opens both doors, proves the range flame animates in a visible
 * (non-background) tab, bakes one loaf through the authored stations, exits through the
 * yard door, saves, reloads, and checks the optional-lesson ledger survives the save.
 * Screenshots land in scratchpad/teaching_kitchen_v1/. Exit 0 on PASS.
 * Run: node tools/qa_teaching_kitchen.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const OUT = path.join(__dirname, '..', 'scratchpad', 'teaching_kitchen_v1');
fs.mkdirSync(OUT, {recursive: true});
const PROFILE = 'fable-kitchen-qa-' + Date.now().toString(36);
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
  await page.waitForFunction(() => !Player.moveTo, {timeout: timeout || 40000});
  await sleep(400);
  return page.evaluate(() => [+player.position.x.toFixed(2), +player.position.z.toFixed(2)]);
}
async function openDoor(page, partId){
  // Doors are found by their stable part id. The engine may already have opened a
  // door when the player was walked onto its entry tile; that counts as open.
  await page.waitForFunction((partId, obj) => (WORLD.doors || []).some(d => d.userData.worldObjectId === obj && d.userData.partId === partId), {timeout: 8000}, partId, 'holm_teaching_kitchen').catch(() => {});
  const state = await page.evaluate((partId, obj) => {
    const d = (WORLD.doors || []).find(d => d.userData.worldObjectId === obj && d.userData.partId === partId);
    if (!d) throw new Error('door not found ' + partId + ' among ' + JSON.stringify((WORLD.doors || []).map(x => [x.userData.worldObjectId, x.userData.partId, x.userData.open])));
    if (d.userData.open) return 'already-open';
    handleClick(d, d.position); return 'clicked';
  }, partId, 'holm_teaching_kitchen');
  await page.waitForFunction((partId, obj) => (WORLD.doors || []).some(d => d.userData.worldObjectId === obj && d.userData.partId === partId && d.userData.open), {timeout: 15000}, partId, 'holm_teaching_kitchen');
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
  // The generic "Failed to load resource" console line carries no URL; track
  // real request failures instead and ignore the browser's own favicon probe.
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) consoleErrors.push(m.text().slice(0, 300)); });
  page.on('response', r => { if (r.status() >= 400 && !/favicon\.ico$/.test(r.url())) failedLoads.push(r.status() + ' ' + r.url()); });
  await page.goto(URL + '&boot=' + Date.now(), {waitUntil: 'domcontentloaded', timeout: 60000});
  const hadSave = await login(page);
  ok('fresh QA profile booted through the real login flow', !hadSave);

  const approach = await walkTo(page, 144.5, 137.6);
  ok('real pathing reaches the kitchen west door approach', Math.abs(approach[0] - 144.5) < 1.1 && Math.abs(approach[1] - 137.6) < 1.1, approach);
  const loaded = await page.evaluate(() => ({kitchen: !!scene.getObjectByName('world-object-holm_teaching_kitchen'), pad: !!scene.getObjectByName('world-object-holm_pad_teaching_kitchen'), status: HolmTeachingKitchen.status()}));
  ok('kitchen streamed in and its planning pad is gone', loaded.kitchen && !loaded.pad && loaded.status.bound && loaded.status.flame, loaded);
  await page.evaluate(() => { camCtl.dist = 16; });
  await sleep(600);
  await page.screenshot({path: path.join(OUT, 'in_game_approach.png')});

  await openDoor(page, 'green_door');
  const inside = await walkTo(page, 150.5, 137.6);
  ok('green door opens and the bakehouse is enterable', Math.abs(inside[0] - 150.5) < 1.1 && Math.abs(inside[1] - 137.6) < 1.1, inside);
  const roof = await page.evaluate(() => { const r = (WORLD.roofs || []).find(r => r.buildingId === 'holm_teaching_kitchen'); return r ? r.mesh.visible : null; });
  ok('roof cuts away when the player stands inside', roof === false, {roofVisible: roof});
  await sleep(500);
  await page.screenshot({path: path.join(OUT, 'in_game_interior.png')});

  const flame = await page.evaluate(() => new Promise(res => {
    const root = scene.getObjectByName('world-object-holm_teaching_kitchen');
    const f = WorldV2Buildings.findPart(root, 'range_flame');
    const meshes = f.children.filter(c => c.isMesh);
    const light = f.children.find(c => c.isPointLight);
    const a = meshes.map(m => m.scale.y), la = light ? light.intensity : null, t0 = performance.now();
    function step(){ if (performance.now() - t0 < 600) requestAnimationFrame(step); else res({hidden: document.hidden, a: a.map(v => +v.toFixed(4)), b: meshes.map(m => +m.scale.y.toFixed(4)), la, lb: light ? light.intensity : null}); }
    requestAnimationFrame(step);
  }));
  ok('range flame and its light animate in a visible tab', !flame.hidden && flame.a.some((v, i) => Math.abs(v - flame.b[i]) > 1e-4) && flame.la !== flame.lb, flame);

  // Bread lesson through the authored stations (handlers are the walkTo targets).
  await walkTo(page, 152.5, 132.5);
  const chain = await page.evaluate(() => {
    const K = HolmTeachingKitchen, log = [];
    K.takeBucket(); K.takeBucket(); K.takeBucket(); log.push(['buckets', Player.count('bucket')]);
    K.fillFlour(); K.fillWater(); log.push(['flour', Player.count('bucket_flour')], ['water', Player.count('bucket_water')]);
    K.takeDough(); K.takeDough(); log.push(['dough', Player.count('dough')]);
    UI.useItem(Player.inv.findIndex(s => s && s.id === 'bucket_flour'));
    log.push(['bread_dough', Player.count('bread_dough')]);
    return log;
  });
  ok('ingredient stations lend two buckets, fill both, and knead one bread dough', chain.some(x => x[0] === 'buckets' && x[1] === 2) && chain.some(x => x[0] === 'bread_dough' && x[1] === 1), chain);
  await walkTo(page, 154.35, 138.75);
  await page.evaluate(() => { Player.usingItem = 'bread_dough'; HolmTeachingKitchen.cookAtRange(); });
  await page.waitForFunction(() => Player.count('bread') > 0, {timeout: 15000}).catch(() => {});
  const baked = await page.evaluate(() => ({bread: Player.count('bread'), optional: Tutorial.optional, cooking: Player.xp.Cooking}));
  ok('bread dough bakes on the range and the optional ledger records bake_bread', baked.bread === 1 && baked.optional && baked.optional.bake_bread === true && baked.cooking >= 40, baked);
  await page.evaluate(() => { camCtl.dist = 11; });
  await sleep(500);
  await page.screenshot({path: path.join(OUT, 'in_game_range.png')});

  await openDoor(page, 'yard_door');
  const yard = await walkTo(page, 149.5, 129.8);
  ok('yard door opens and the north exit is walkable', Math.abs(yard[0] - 149.5) < 1.1 && Math.abs(yard[1] - 129.8) < 1.1, yard);
  await page.evaluate(() => { camCtl.dist = 16; });
  await sleep(500);
  await page.screenshot({path: path.join(OUT, 'in_game_yard.png')});

  await page.evaluate(() => SaveGame.save(true));
  await page.goto(URL + '&reload=' + Date.now(), {waitUntil: 'domcontentloaded', timeout: 60000});
  const resumed = await login(page);
  const after = await page.evaluate(() => ({optional: Tutorial.optional, bread: Player.count('bread'), pos: [+player.position.x.toFixed(1), +player.position.z.toFixed(1)], step: Tutorial.step, errors: (window.SMOKE_ERRORS || []).length}));
  ok('reload continues the adventurer with the optional ledger, loaf, and position intact', resumed && after.optional && after.optional.bake_bread === true && after.bread === 1 && Math.abs(after.pos[0] - 149.5) < 2 && Math.abs(after.pos[1] - 129.8) < 2 && after.step === 0, after);
  ok('no page errors, console errors, or failed asset loads across the whole run', pageErrors.length === 0 && consoleErrors.length === 0 && failedLoads.length === 0, {pageErrors, consoleErrors, failedLoads});

  await browser.close();
  const passed = checks.filter(c => c.ok).length;
  const result = {profile: PROFILE, passed, total: checks.length, checks, pageErrors, consoleErrors, failedLoads};
  fs.writeFileSync(path.join(OUT, 'qa_result.json'), JSON.stringify(result, null, 2));
  console.log('[KITCHEN QA] ' + (passed === checks.length ? 'PASS' : 'FAIL') + ' ' + passed + '/' + checks.length);
  process.exit(passed === checks.length ? 0 : 1);
})().catch(e => { console.error('DRIVER ERROR', e.message); process.exit(1); });
