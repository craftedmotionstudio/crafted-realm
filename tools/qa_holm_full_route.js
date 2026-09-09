/* Tutor's Holm full-route regression (headless Chrome, real game, real pointer input).
 * Drives every required lesson of the Holm curriculum in one fresh profile using the game's own
 * mouse handlers: world objects are clicked with page.mouse at their projected screen position
 * (the canvas mousedown/mouseup pick), inventory items with real clicks on the pack slots,
 * dialogue and context-menu options with real clicks on their buttons. Travel between stations
 * uses the minimap walk order (the same call a minimap click makes). Then the two optional
 * NPC-free lessons (bake_bread, learn_quests) and the departure boat.
 * Run: node tools/qa_holm_full_route.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const OUT = path.join(__dirname, '..', 'scratchpad', 'holm_full_route');
fs.mkdirSync(OUT, {recursive: true});
const PROFILE = 'fable-route-qa-' + Date.now().toString(36);
const URL = 'http://127.0.0.1:8777/?qaProfile=' + PROFILE;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const checks = [];
const t0 = Date.now();
function ok(label, cond, detail){ checks.push({label, ok: !!cond, detail, t: +((Date.now() - t0) / 1000).toFixed(1)}); console.log((cond ? '  ok  ' : '  FAIL ') + label + (detail ? '  ' + JSON.stringify(detail) : '')); return !!cond; }

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
  await sleep(1500);
  return hadSave;
}
async function walkTo(page, x, z, timeout){
  await page.evaluate((x, z) => minimapWalkTo({x, z}), x, z);
  await page.waitForFunction(() => !Player.moveTo, {timeout: timeout || 60000}).catch(() => {});
  await sleep(300);
  return page.evaluate(() => [+player.position.x.toFixed(1), +player.position.z.toFixed(1)]);
}
async function walkVia(page, points, timeout){
  let p;
  for (const [x, z] of points) p = await walkTo(page, x, z, timeout);
  return p;
}
async function state(page){
  return page.evaluate(() => ({step: Tutorial.step, complete: !!Tutorial.complete, plane: Player.plane || 0,
    pos: [+player.position.x.toFixed(1), +player.position.z.toFixed(1)], errors: (window.SMOKE_ERRORS || []).length,
    stepId: Tutorial.steps && Tutorial.steps[Tutorial.step] ? Tutorial.steps[Tutorial.step].id : null}));
}
async function shot(page, name){ await page.screenshot({path: path.join(OUT, name + '.png')}).catch(() => {}); }
async function waitStep(page, n, timeout){
  return page.waitForFunction(n => Tutorial.step >= n || !!Tutorial.complete, {timeout: timeout || 45000}, n).then(() => true).catch(() => false);
}
/* Aim the camera at a world object from the player's side, then find a pixel whose game pick hits it. */
async function locate(page, finderSrc, opts){
  opts = opts || {};
  const res = await page.evaluate(async (finderSrc, opts) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const obj = (function(){ try { return eval(finderSrc); } catch (e) { return null; } })();
    if (!obj) return {err: 'object not found'};
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const centre = box.isEmpty() ? obj.getWorldPosition(new THREE.Vector3()) : box.getCenter(new THREE.Vector3());
    if (box.isEmpty()) centre.y += 0.8;
    const dx = player.position.x - centre.x, dz = player.position.z - centre.z;
    camCtl.yaw = Math.atan2(dx, dz); camCtl.pitch = opts.pitch || 0.95; camCtl.dist = opts.dist || 13;
    await sleep(opts.settle || 1800);
    const rect = renderer.domElement.getBoundingClientRect();
    const pr = centre.clone().project(camera);
    const cx = (pr.x + 1) / 2 * rect.width + rect.left, cy = (1 - pr.y) / 2 * rect.height + rect.top;
    let best = null;
    for (let r = 0; r <= 140; r += 8) {
      for (let a = 0; a < 360; a += (r ? 30 : 360)) {
        const x = Math.round(cx + Math.cos(a * Math.PI / 180) * r), y = Math.round(cy + Math.sin(a * Math.PI / 180) * r);
        if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) continue;
        const hit = pick({clientX: x, clientY: y});
        if (hit && (hit.obj === obj)) { best = [x, y]; break; }
      }
      if (best) break;
    }
    return {centre: [+centre.x.toFixed(1), +centre.y.toFixed(1), +centre.z.toFixed(1)], screen: [Math.round(cx), Math.round(cy)], hit: best};
  }, finderSrc, opts);
  return res;
}
async function approach(page, finderSrc, near){
  const target = await page.evaluate((finderSrc, near) => {
    const obj = (function(){ try { return eval(finderSrc); } catch (e) { return null; } })();
    if (!obj) return null;
    obj.updateMatrixWorld(true);
    const c = obj.getWorldPosition(new THREE.Vector3());
    const dx = player.position.x - c.x, dz = player.position.z - c.z, d = Math.hypot(dx, dz);
    if (d <= near + 1.5) return {skip: true, d};
    const k = near / Math.max(d, 0.001);
    return {x: c.x + dx * k, z: c.z + dz * k, d};
  }, finderSrc, near);
  if (!target || target.skip) return target;
  await page.evaluate((x, z) => minimapWalkTo({x, z}), target.x, target.z);
  await page.waitForFunction(() => !Player.moveTo, {timeout: 45000}).catch(() => {});
  await sleep(300);
  return target;
}
async function clickObject(page, finderSrc, opts){
  opts = opts || {};
  if (!opts.noApproach) await approach(page, finderSrc, opts.near || 3.5);
  const loc = await locate(page, finderSrc, opts);
  if (!loc.hit) return {clicked: false, loc};
  if (opts && opts.right) await page.mouse.click(loc.hit[0], loc.hit[1], {button: 'right'});
  else { await page.mouse.move(loc.hit[0], loc.hit[1]); await page.mouse.down(); await page.mouse.up(); }
  return {clicked: true, loc};
}
async function clickInventory(page, itemId){
  const idx = await page.evaluate(id => { try { document.querySelector('.tab-btn[data-tab="inv"]').click(); } catch (e) {} UI.refreshInv(); return Player.inv.findIndex(s => s && s.id === id); }, itemId);
  if (idx < 0) return false;
  const sel = '#inv-grid .inv-slot:nth-child(' + (idx + 1) + ')';
  await page.waitForSelector(sel, {visible: true, timeout: 5000});
  await page.click(sel);
  return true;
}
async function clickButtonByText(page, containerSel, text){
  const rect = await page.evaluate((sel, text) => {
    const root = document.querySelector(sel); if (!root) return null;
    const cands = [...root.querySelectorAll('button, .ctx-row, .opt, div, span')].filter(e => e.textContent && e.textContent.replace(/\s+/g, ' ').trim().toLowerCase().includes(text.toLowerCase()) && e.getClientRects().length);
    if (!cands.length) return null;
    // the smallest matching box is the actual control (a cell or row), never the panel that contains it
    cands.sort((a, b) => { const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return ra.width * ra.height - rb.width * rb.height; });
    const r = cands[0].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2];
  }, containerSel, text);
  if (!rect) return false;
  await page.mouse.click(rect[0], rect[1]);
  return true;
}
async function count(page, id){ return page.evaluate(id => Player.count(id), id); }

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
  let s = await state(page);
  ok('fresh profile boots at step 0 of the thirteen-step Holm curriculum', !hadSave && s.step === 0 && s.stepId === 'study_route', s);

  // 1. study_route — click the relief chart in the Guide Hall.
  let r = await clickObject(page, "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='holm_orientation')");
  let adv = await waitStep(page, 1, 30000);
  s = await state(page); await shot(page, '01_study_route');
  ok('1 study_route: a real click on the relief chart records the lesson', r.clicked && adv && s.step >= 1, {r: r.loc, s});

  // 2. equip_hatchet — real click on the hatchet in the pack.
  await sleep(800);
  let inv = await clickInventory(page, 'hatchet');
  adv = await waitStep(page, 2, 15000);
  s = await state(page); await shot(page, '02_equip_hatchet');
  ok('2 equip_hatchet: a real click on the pack hatchet wields it', inv && adv && s.step >= 2, {inv, s});

  // 3. chop_logs — walk to Survival Wood and click a marked tree.
  await walkVia(page, [[151.5, 145.5], [134.5, 147.5], [134.5, 157.5], [127.5, 159.5]], 90000);
  const treeFinder = "WORLD.clickables.find(o=>o.userData&&o.userData.rtype==='tree'&&o.userData.marked&&o.userData.alive)";
  let logsBefore = await count(page, 'logs');
  r = await clickObject(page, treeFinder);
  adv = await waitStep(page, 3, 60000);
  s = await state(page); await shot(page, '03_chop_logs');
  ok('3 chop_logs: a real click on a marked tree gathers emberwood logs', r.clicked && adv && s.step >= 3 && (await count(page, 'logs')) > logsBefore, {r: r.loc, s});
  // A second log for the cooking retry margin.
  await page.waitForFunction(() => !Player.action, {timeout: 30000}).catch(() => {});
  if ((await count(page, 'logs')) < 2) { await clickObject(page, treeFinder); await page.waitForFunction(() => Player.count('logs') >= 2 || !Player.action, {timeout: 40000}).catch(() => {}); }

  // 4. light_fire — real click on the logs in the pack (tinderbox in pack).
  await page.evaluate(() => { Player.action = null; });
  inv = await clickInventory(page, 'logs');
  adv = await waitStep(page, 4, 20000);
  s = await state(page); await shot(page, '04_light_fire');
  ok('4 light_fire: a real click on the logs lights a campfire with the tinderbox', inv && adv && s.step >= 4, {inv, s});

  // 5. catch_fish — real click on the net, then a real click on the fishing edge.
  async function fishOnce(){
    await walkTo(page, 131.5, 152.5, 40000);
    await clickInventory(page, 'fishing_net');
    await sleep(400);
    const rr = await clickObject(page, "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='holm_fishing_edge')", {dist: 12});
    await page.waitForFunction(() => Player.count('raw_perch') > 0, {timeout: 45000}).catch(() => {});
    return rr;
  }
  r = await fishOnce();
  adv = await waitStep(page, 5, 5000);
  s = await state(page); await shot(page, '05_catch_fish');
  ok('5 catch_fish: net then a real click on the fishing edge lands a mirrorperch', r.clicked && adv && s.step >= 5, {r: r.loc, s});

  // 6. cook_fish — real click on the campfire; relight and refish if the fish burns or the fire dies.
  async function ensureFire(){
    const alive = await page.evaluate(() => (WORLD.clickables || []).some(o => o.userData && o.userData.kind === 'fire' && o.parent));
    if (alive) return true;
    if ((await count(page, 'logs')) < 1) { await walkTo(page, 127.5, 159.5, 40000); await clickObject(page, treeFinder); await page.waitForFunction(() => Player.count('logs') > 0, {timeout: 40000}).catch(() => {}); await page.evaluate(() => { Player.action = null; }); }
    await clickInventory(page, 'logs'); await sleep(2500);
    return page.evaluate(() => (WORLD.clickables || []).some(o => o.userData && o.userData.kind === 'fire' && o.parent));
  }
  let cooked = false, cookLoc = null;
  for (let attempt = 0; attempt < 4 && !cooked; attempt++) {
    if ((await count(page, 'raw_perch')) < 1) await fishOnce();
    if (!(await ensureFire())) continue;
    const rr = await clickObject(page, "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='fire'&&o.parent)", {dist: 12});
    cookLoc = rr.loc;
    cooked = await waitStep(page, 6, 20000);
  }
  s = await state(page); await shot(page, '06_cook_fish');
  ok('6 cook_fish: a real click on the campfire roasts the perch', cooked && s.step >= 6, {cookLoc, s});

  // 7. descend_cavern — walk to the gatehouse winch house, right-click the shaft frame, choose Climb-down.
  await walkVia(page, [[128.5, 146.5], [128.5, 137.5], [128.5, 126.5], [128.5, 121.5], [124.5, 118.5]], 90000);
  r = await clickObject(page, "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='holm_shaft_frame')", {right: true, dist: 11});
  await sleep(500);
  const ctxRow = await clickButtonByText(page, '#ctx-menu', 'Climb-down');
  adv = await page.waitForFunction(() => (Player.plane || 0) === -1, {timeout: 30000}).then(() => true).catch(() => false);
  await waitStep(page, 7, 10000);
  s = await state(page); await shot(page, '07_descend_cavern');
  ok('7 descend_cavern: right-click the winch frame, Climb-down from the menu, land in the cavern', r.clicked && ctxRow && adv && s.plane === -1 && s.step >= 7, {r: r.loc, ctxRow, s});

  // 8. mine_copper — real click on the copper rock.
  await walkTo(page, 294.5, 355.5, 60000);
  r = await clickObject(page, "WORLD.clickables.find(o=>o.userData&&o.userData.rtype==='rock'&&o.userData.oreKind==='copper'&&o.userData.alive)", {dist: 12});
  adv = await waitStep(page, 8, 60000);
  s = await state(page); await shot(page, '08_mine_copper');
  ok('8 mine_copper: a real click on the copper rock mines copper ore', r.clicked && adv && s.step >= 8, {r: r.loc, s});

  // 9. mine_tin — north offshoot.
  await page.evaluate(() => { Player.action = null; });
  await walkVia(page, [[300.5, 366.5], [303.5, 375.5]], 60000);
  r = await clickObject(page, "WORLD.clickables.find(o=>o.userData&&o.userData.rtype==='rock'&&o.userData.oreKind==='tin'&&o.userData.alive)", {dist: 12});
  adv = await waitStep(page, 9, 60000);
  s = await state(page); await shot(page, '09_mine_tin');
  ok('9 mine_tin: a real click on the tin rock mines tin ore', r.clicked && adv && s.step >= 9, {r: r.loc, s});

  // 10. smelt_bronze — click the furnace, pick the bronze bar in the dialogue.
  await page.evaluate(() => { Player.action = null; });
  await walkTo(page, 304.5, 361.5, 60000);
  r = await clickObject(page, "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='furnace')", {dist: 12});
  await sleep(600);
  const smeltOpt = await clickButtonByText(page, '#dlg-opts', 'Bronze bar');
  adv = await waitStep(page, 10, 45000);
  s = await state(page); await shot(page, '10_smelt_bronze');
  ok('10 smelt_bronze: a real click on the furnace then the Bronze bar option smelts a bar', r.clicked && smeltOpt && adv && s.step >= 10, {r: r.loc, smeltOpt, s});

  // 11. forge_dagger — click the anvil, pick the dagger (dialogue or smithing grid).
  await page.evaluate(() => { Player.action = null; });
  await walkTo(page, 301.5, 361.5, 60000);
  r = await clickObject(page, "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='anvil')", {dist: 12});
  await sleep(800);
  let daggerOpt = await clickButtonByText(page, '#dlg-opts', 'Bronze dagger');
  if (!daggerOpt) daggerOpt = await clickButtonByText(page, '#smith-grid-overlay', 'dagger');
  adv = await waitStep(page, 11, 45000);
  await page.evaluate(() => { const o = document.getElementById('smith-grid-overlay'); if (o) o.style.display = 'none'; });
  s = await state(page); await shot(page, '11_forge_dagger');
  ok('11 forge_dagger: a real click on the anvil then the Bronze dagger option forges it', r.clicked && daggerOpt && adv && s.step >= 11, {r: r.loc, daggerOpt, s});

  // Surface through the one-way exit ladder into the Combat Hall tower.
  await page.evaluate(() => { Player.action = null; });
  await walkTo(page, 321.5, 355.5, 90000);
  r = await clickObject(page, "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&/Cavern exit/.test(String(o.userData.label||'')))", {dist: 12});
  const surfaced = await page.waitForFunction(() => (Player.plane || 0) === 0, {timeout: 30000}).then(() => true).catch(() => false);
  await sleep(2500);
  s = await state(page); await shot(page, '11b_surface');
  ok('cavern exit ladder: a real click climbs out into the Combat Hall drill tower', r.clicked && surfaced && Math.abs(s.pos[0] - 176.5) < 2 && Math.abs(s.pos[1] - 116.5) < 2, {r: r.loc, s});

  // 12. open_bank — walk across the ridge into the bank and click a teller booth.
  await walkVia(page, [[169.5, 121.5], [164.5, 118.5], [157.5, 122.5], [154.5, 118.5]], 90000);
  r = await clickObject(page, "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='holm_bank_booth')", {dist: 12});
  const bankOpen = await page.waitForFunction(() => document.getElementById('bank-modal').style.display === 'block', {timeout: 30000}).then(() => true).catch(() => false);
  adv = await waitStep(page, 12, 10000);
  s = await state(page); await shot(page, '12_open_bank');
  await page.evaluate(() => { try { UI.openBank(false); } catch (e) {} try { UI.closeWorldModals(); } catch (e) {} document.getElementById('bank-modal').style.display = 'none'; });
  ok('12 open_bank: a real click on a teller booth opens the bank interface', r.clicked && adv && bankOpen && s.step >= 12, {r: r.loc, s});

  // Optional NPC-free lessons before the beacon: bake bread, study the quest board.
  await walkVia(page, [[158.5, 128.5], [158.5, 142.5], [148.5, 143.5], [144.5, 137.6], [150.5, 137.6]], 120000);
  async function station(kind, opts){
    const before = await page.evaluate(() => JSON.stringify(Player.inv));
    const rr = await clickObject(page, "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='" + kind + "')", Object.assign({dist: 11}, opts || {}));
    await page.waitForFunction(b => JSON.stringify(Player.inv) !== b, {timeout: 30000}, before).catch(() => {});
    await sleep(600);
    await page.evaluate(() => { const d = document.getElementById('dialogue-modal'); if (d) d.style.display = 'none'; });
    return rr.clicked;
  }
  const k1 = await station('holm_bucket_shelf');
  const k2 = await station('holm_bucket_shelf');
  const k3 = await station('holm_flour_bin');
  const k4 = await station('holm_water_butt');
  const k5 = await station('holm_dough_trough');
  const dough = await count(page, 'dough');
  await clickInventory(page, 'dough');           // kneads flour + water + dough into bread dough
  await page.waitForFunction(() => Player.count('bread_dough') > 0, {timeout: 10000}).catch(() => {});
  const kneaded = await count(page, 'bread_dough');
  await clickInventory(page, 'bread_dough');     // arms the dough for the range
  const k6 = await station('holm_kitchen_range');
  await page.waitForFunction(() => Player.count('bread') > 0 || (Tutorial.optional && Tutorial.optional.bake_bread), {timeout: 30000}).catch(() => {});
  const bake = await page.evaluate(() => ({bread: Player.count('bread'), optional: Tutorial.optional ? !!Tutorial.optional.bake_bread : null, step: Tutorial.step}));
  await shot(page, '13_bake_bread');
  ok('optional bake_bread: real clicks on the shelf, bin, butt, trough, pack and range bake a loaf', k1 && k3 && k4 && k5 && k6 && dough >= 1 && kneaded >= 1 && bake.optional === true && bake.step >= 12, {k1, k2, k3, k4, k5, k6, dough, kneaded, bake});

  await walkVia(page, [[144.5, 137.6], [141.2, 134.5], [137.5, 133.5]], 90000);
  r = await clickObject(page, "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='holm_quest_board')", {dist: 11});
  await page.waitForFunction(() => Tutorial.optional && Tutorial.optional.learn_quests, {timeout: 20000}).catch(() => {});
  const quests = await page.evaluate(() => ({optional: Tutorial.optional ? !!Tutorial.optional.learn_quests : null, step: Tutorial.step}));
  await page.evaluate(() => { try { UI.closeWorldModals(); } catch (e) {} const d = document.getElementById('dialogue-modal'); if (d) d.style.display = 'none'; });
  await shot(page, '14_learn_quests');
  ok('optional learn_quests: a real click on the quest board records the lesson', r.clicked && quests.optional === true && quests.step >= 12, {r: r.loc, quests});

  // 13. relight_lastlight — switchback, door, two ladders, lever.
  await walkVia(page, [[141.2, 134.5], [145.5, 146.5], [158.5, 142.5], [184.5, 142.5], [184.5, 135.5], [184.5, 128.5], [205.5, 128.5], [205.5, 123.5], [196.5, 125.5]], 150000);
  r = await clickObject(page, "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='lighthouseDoor')", {dist: 12});
  let up = await page.waitForFunction(() => (Player.plane || 0) === 1, {timeout: 30000}).then(() => true).catch(() => false);
  await sleep(1500);
  const l1 = await clickObject(page, "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&(o.userData.plane===1)&&/ground-floor ladder/.test(String(o.userData.label||'')))", {dist: 12});
  const up2 = await page.waitForFunction(() => (Player.plane || 0) === 2, {timeout: 30000}).then(() => true).catch(() => false);
  await sleep(1500);
  const l2 = await clickObject(page, "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&(o.userData.plane===2)&&/upper ladder/.test(String(o.userData.label||'')))", {dist: 12});
  const up3 = await page.waitForFunction(() => (Player.plane || 0) === 3, {timeout: 30000}).then(() => true).catch(() => false);
  await sleep(1500);
  const lv = await clickObject(page, "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='lever')", {dist: 12});
  adv = await waitStep(page, 13, 30000);
  s = await state(page); await shot(page, '15_relight_lastlight');
  ok('13 relight_lastlight: real clicks on the door, both ladders and the lever light the beacon and complete the curriculum', r.clicked && up && l1.clicked && up2 && l2.clicked && up3 && lv.clicked && adv && s.complete, {door: r.loc, up, up2, up3, lever: lv.loc, s});

  // Departure — back down, along the road, board the skiff.
  await page.evaluate(() => { const d = document.getElementById('dialogue-modal'); if (d) d.style.display = 'none'; });
  const planeAfterLever = (await state(page)).plane;
  let d3 = {clicked: 'skipped'}, d2 = {clicked: 'skipped'}, d1 = {clicked: 'skipped'};
  if (planeAfterLever === 3) {
    d3 = await clickObject(page, "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&(o.userData.plane===3)&&/lower ladder/.test(String(o.userData.label||'')))", {dist: 12});
    await page.waitForFunction(() => (Player.plane || 0) === 2, {timeout: 30000}).catch(() => {});
    await sleep(1200);
  }
  if ((await state(page)).plane === 2) {
    d2 = await clickObject(page, "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&(o.userData.plane===2)&&/lower ladder/.test(String(o.userData.label||'')))", {dist: 12});
    await page.waitForFunction(() => (Player.plane || 0) === 1, {timeout: 30000}).catch(() => {});
    await sleep(1200);
  }
  if ((await state(page)).plane === 1) {
    d1 = await clickObject(page, "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&(o.userData.plane===1)&&/Exit/.test(String(o.userData.label||'')))", {dist: 12});
  }
  const down = await page.waitForFunction(() => (Player.plane || 0) === 0, {timeout: 30000}).then(() => true).catch(() => false);
  await sleep(1500);
  await walkVia(page, [[196.5, 125.5], [205.5, 123.5], [205.5, 128.5], [184.5, 128.5], [184.5, 135.5], [186.5, 140.5], [193.5, 150.5], [205.5, 151.5]], 150000);
  s = await state(page); await shot(page, '16_departure_dock');
  ok('descent: the lighthouse returns the player to the summit (ladders clicked where still needed) and the road reaches Departure Dock', !!d3.clicked && !!d2.clicked && !!d1.clicked && down && Math.abs(s.pos[0] - 205.5) < 2 && Math.abs(s.pos[1] - 151.5) < 2, {planeAfterLever, d3: d3.clicked, d2: d2.clicked, d1: d1.clicked, down, s});
  r = await clickObject(page, "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='holm_departure')", {dist: 12});
  const sailed = await page.waitForFunction(() => typeof CRWorldMode !== 'undefined' && CRWorldMode.providerId !== 'tutors-holm-v2' && typeof player !== 'undefined' && player.position.x > 1, {timeout: 60000}).then(() => true).catch(() => false);
  await sleep(2500);
  const arrival = await page.evaluate(() => ({provider: CRWorldMode.providerId, zone: (document.getElementById('zone-label') || {}).textContent, coins: Player.count('coins'), bread: Player.count('bread'), errors: (window.SMOKE_ERRORS || []).length}));
  await shot(page, '17_mainland');
  ok('departure: a real click on the skiff sails to the mainland with the departure pack', r.clicked && arrival.provider !== 'tutors-holm-v2' && arrival.coins >= 25 && arrival.bread >= 3, {r: r.loc, sailed, arrival});
  ok('no page errors, console errors, or failed asset loads across the whole route', pageErrors.length === 0 && consoleErrors.length === 0 && failedLoads.length === 0, {pageErrors, consoleErrors, failedLoads});

  await browser.close();
  const passed = checks.filter(c => c.ok).length;
  fs.writeFileSync(path.join(OUT, 'qa_result.json'), JSON.stringify({profile: PROFILE, passed, total: checks.length, seconds: +((Date.now() - t0) / 1000).toFixed(1), checks, pageErrors, consoleErrors, failedLoads}, null, 2));
  console.log('[ROUTE QA] ' + (passed === checks.length ? 'PASS' : 'FAIL') + ' ' + passed + '/' + checks.length + ' in ' + ((Date.now() - t0) / 1000).toFixed(0) + 's');
  process.exit(passed === checks.length ? 0 : 1);
})().catch(e => { console.error('DRIVER ERROR', e.message); process.exit(1); });
