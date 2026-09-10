/* qa_holm_bank.js — headless QA + capture for the Tutor's Holm Bank.
 * Real login in a throwaway ?qaProfile, real pathing up the ridge road, closed-wall negative,
 * front door, teller booth opening the real bank interface (the required open_bank lesson
 * source), the staff gap into the vault, the vault chest, the staff door east, and
 * save/reload persistence. Run: node tools/qa_holm_bank.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const OUT = path.join(__dirname, '..', 'scratchpad', 'holm_bank_v1');
fs.mkdirSync(OUT, {recursive: true});
const PROFILE = 'fable-bank-qa-' + Date.now().toString(36);
const URL = 'http://127.0.0.1:8777/?qaProfile=' + PROFILE;
const OBJ = 'holm_bank';
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
const bankOpen = () => document.getElementById('bank-modal') && document.getElementById('bank-modal').style.display === 'block';

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

  const approach = await walkTo(page, 155.5, 122.5, 90000);
  ok('real pathing reaches the ridge road beside the bank door', Math.abs(approach[0] - 155.5) < 1.1 && Math.abs(approach[1] - 122.5) < 1.1, approach);
  const loaded = await page.evaluate(() => ({bank: !!scene.getObjectByName('world-object-holm_bank'), pad: !!scene.getObjectByName('world-object-holm_pad_holm_bank'),
    chest: (() => { const c = scene.getObjectByName('world-object-holm_bank_chest'); return c ? [+c.position.x.toFixed(1), +c.position.z.toFixed(1), c.userData.kind] : null; })()}));
  ok('bank streamed in, its pad is gone, and the vault chest stands inside the vault', loaded.bank && !loaded.pad && loaded.chest && loaded.chest[0] === 159.5 && loaded.chest[1] === 113.5 && loaded.chest[2] === 'bank', loaded);
  await page.evaluate(() => { camCtl.dist = 16; });
  await sleep(600);
  await page.screenshot({path: path.join(OUT, 'in_game_approach.png')});

  // Negative case from the north lawn, away from the door's entry tile (the engine
  // opens a door when the player is walked onto that tile).
  // The planner ignores closed doors and the walker opens them, so an interior is
  // never "unreachable"; the honest negative is that the plan goes the long way
  // round through the front door instead of through the north wall.
  const north = await walkTo(page, 157.5, 110.5, 60000);
  const plan = await page.evaluate(() => { minimapWalkTo({x: 154, z: 114.8}); return (Player.path || []).length; });
  await page.waitForFunction(() => !Player.moveTo, {timeout: 40000});
  ok('from the north lawn the plan into the vault goes round through the front door, not through the wall', Math.abs(north[1] - 110.5) < 1.1 && plan >= 14, {north, planLength: plan});
  await walkTo(page, 155.5, 122.5, 60000);
  await openDoor(page, 'front_door');
  const hall = await walkTo(page, 154, 117.2);
  ok('bank door opens and the customer hall is enterable', Math.abs(hall[0] - 154) < 1.1 && Math.abs(hall[1] - 117.2) < 1.1, hall);
  const roof = await page.evaluate(() => { const r = (WORLD.roofs || []).find(r => r.buildingId === 'holm_bank'); return r ? r.mesh.visible : null; });
  ok('roof cuts away when the player stands in the hall', roof === false, {roofVisible: roof});
  await sleep(500);
  await page.screenshot({path: path.join(OUT, 'in_game_hall.png')});

  const before = await page.evaluate(() => ({open: !!(document.getElementById('bank-modal') && document.getElementById('bank-modal').style.display === 'block'), step: Tutorial.step}));
  await page.evaluate(() => HolmBank.useBooth());
  await sleep(600);
  const booth = await page.evaluate(() => ({open: !!(document.getElementById('bank-modal') && document.getElementById('bank-modal').style.display === 'block'), step: Tutorial.step}));
  ok('the teller booth opens the real bank interface (required open_bank source)', !before.open && booth.open && booth.step === 0, {before, booth});
  await page.evaluate(() => { try { UI.closeWorldModals && UI.closeWorldModals(); } catch (e) {} const m = document.getElementById('bank-modal'); if (m) m.style.display = 'none'; });

  const vault = await walkTo(page, 154, 114.8);
  ok('the staff gap at the counter\'s east end leads into the vault ledger tile', Math.abs(vault[0] - 154) < 1.1 && Math.abs(vault[1] - 114.8) < 1.1, vault);
  await page.evaluate(() => { HolmBank.studyLedger(); HolmBank.readPlaque(); const d = document.getElementById('dialogue'); if (d) d.style.display = 'none'; });
  await page.evaluate(() => { const c = scene.getObjectByName('world-object-holm_bank_chest'); handleClick(c, c.position); });
  await page.waitForFunction(() => document.getElementById('bank-modal') && document.getElementById('bank-modal').style.display === 'block', {timeout: 15000}).catch(() => {});
  const chest = await page.evaluate(() => ({open: !!(document.getElementById('bank-modal') && document.getElementById('bank-modal').style.display === 'block'), pos: [+player.position.x.toFixed(1), +player.position.z.toFixed(1)]}));
  ok('the vault chest still opens the bank through the engine\'s own bank path', chest.open, chest);
  await page.evaluate(() => { const m = document.getElementById('bank-modal'); if (m) m.style.display = 'none'; camCtl.dist = 12; });
  await sleep(500);
  await page.screenshot({path: path.join(OUT, 'in_game_vault.png')});

  await openDoor(page, 'staff_door');
  const east = await walkTo(page, 163.5, 118.5);
  ok('staff door opens and the ridge continues east toward the Combat Hall', Math.abs(east[0] - 163.5) < 1.1 && Math.abs(east[1] - 118.5) < 1.1, east);
  await page.evaluate(() => { camCtl.dist = 16; });
  await sleep(500);
  await page.screenshot({path: path.join(OUT, 'in_game_east.png')});

  await page.evaluate(() => SaveGame.save(true));
  await page.goto(URL + '&reload=' + Date.now(), {waitUntil: 'domcontentloaded', timeout: 60000});
  const resumed = await login(page);
  const after = await page.evaluate(() => ({pos: [+player.position.x.toFixed(1), +player.position.z.toFixed(1)], step: Tutorial.step, errors: (window.SMOKE_ERRORS || []).length}));
  ok('reload continues the adventurer east of the bank with the route untouched', resumed && Math.abs(after.pos[0] - 163.5) < 2 && Math.abs(after.pos[1] - 118.5) < 2 && after.step === 0, after);
  ok('no page errors, console errors, or failed asset loads across the whole run', pageErrors.length === 0 && consoleErrors.length === 0 && failedLoads.length === 0, {pageErrors, consoleErrors, failedLoads});

  await browser.close();
  const passed = checks.filter(c => c.ok).length;
  fs.writeFileSync(path.join(OUT, 'qa_result.json'), JSON.stringify({profile: PROFILE, passed, total: checks.length, checks, pageErrors, consoleErrors, failedLoads}, null, 2));
  console.log('[BANK QA] ' + (passed === checks.length ? 'PASS' : 'FAIL') + ' ' + passed + '/' + checks.length);
  process.exit(passed === checks.length ? 0 : 1);
})().catch(e => { console.error('DRIVER ERROR', e.message); process.exit(1); });
