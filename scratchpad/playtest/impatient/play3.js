/* Run 4: the impatient player, full route, step-driven. The loop reads the current objective and acts on
 * it like a hurried player (click far, click again before arriving, walk off mid-action, click the water
 * before the net, light the fire wherever I stand, leave it burning). Every input is a real click. */
'use strict';
const {Player, FINDERS} = require('../../../tools/play/harness');
const fs = require('fs');
const OUT = process.env.PT_OUT || 'scratchpad/playtest/impatient/run4-full';
const LOG = OUT + '/progress.log';
fs.mkdirSync(OUT, {recursive: true});
const say = (...a) => { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); console.log(s); fs.appendFileSync(LOG, s + '\n'); };
const lessons = [];
const attempts = {};

const GROUND_PX = `(function(x, z){
  const rect = renderer.domElement.getBoundingClientRect();
  const tryPoint = (wx, wz) => {
    const y = (typeof groundY === 'function' ? groundY(wx, wz) : 0) || 0;
    const pr = new THREE.Vector3(wx, y, wz).project(camera);
    if (pr.z > 1 || Math.abs(pr.x) > 0.92 || Math.abs(pr.y) > 0.9) return null;
    const sx = (pr.x + 1) / 2 * rect.width, sy = (1 - pr.y) / 2 * rect.height;
    const el = document.elementFromPoint(sx, sy);
    if (!el || el !== renderer.domElement) return null;
    const hit = pick({clientX: sx, clientY: sy});
    if (!hit) return null;
    const n = hit.obj.name || '';
    if (n === 'ground' || n.indexOf('ground-chunk-') === 0 || (hit.obj.userData && hit.obj.userData.kind === 'door')) return [Math.round(sx), Math.round(sy)];
    return null;
  };
  const dx = x - player.position.x, dz = z - player.position.z;
  for (let f = 1; f >= 0.15; f -= 0.1){ const p = tryPoint(player.position.x + dx * f, player.position.z + dz * f); if (p) return {screen: p, fraction: +f.toFixed(2)}; }
  return null;
})`;

async function farClick(p, x, z){
  await p.aim(x, z, 33);
  const px = await p.page.evaluate(`${GROUND_PX}(${x},${z})`);
  if (px) { await p.clickAt(px.screen[0], px.screen[1]); p.logLine('far-click', {target: [x, z], px}); }
  return px;
}
async function rush(p, x, z, opts){
  await farClick(p, x, z); await p.wait(700); await farClick(p, x, z); await p.wait(300);
  const r = await p.walkTo(x, z, Object.assign({maxLegs: 24}, opts || {}));
  const v = await p.see();
  say(`  rush -> (${x},${z}) reached=${r.reached} at=${JSON.stringify(v.pos)} t=${v.t} legs=${r.legs} ${r.reason || ''} lastchat=${JSON.stringify(v.chat.slice(-1))}`);
  return r;
}
async function dismiss(p, prefer){
  for (let i = 0; i < 4; i++){
    const v = await p.see(); if (!v.dialogue) return false;
    say(`  dialogue [${v.dialogue.name}] "${v.dialogue.text.slice(0, 160)}" opts=${JSON.stringify(v.dialogue.options)}`);
    let pick = v.dialogue.options[0];
    if (prefer) { const m = v.dialogue.options.find(o => prefer.test(o)); if (m) pick = m; }
    await p.chooseDialogue(pick); await p.wait(500);
  }
  return true;
}
async function curStep(p){ return p.page.evaluate(() => Tutorial.complete ? 'complete' : (Tutorial.steps[Tutorial.step] && Tutorial.steps[Tutorial.step].id)); }
async function stepDone(p, fromId, ms){
  const ok = await p.waitFor(`Tutorial.complete || (Tutorial.steps[Tutorial.step] && Tutorial.steps[Tutorial.step].id!=='${fromId}')`, ms || 20000);
  const v = await p.see();
  if (ok) { lessons.push({id: fromId, t: v.t, next: v.stepId, objective: v.objective}); say(`  LESSON DONE ${fromId} at ${v.t}s -> ${v.stepId || 'complete'} "${v.objective}"`); }
  return ok;
}
async function snap(p, v, label){ say(`[${label}] t=${v.t} step=${v.stepId} pos=${JSON.stringify(v.pos)} zone=${v.zone} plane=${v.plane} arrow=${v.arrow && v.arrow.label}@${v.arrow && JSON.stringify(v.arrow.target)} pack=${JSON.stringify(v.pack)} chat=${JSON.stringify(v.chat.slice(-3))}`); }
const objPos = async (p, finder) => p.page.evaluate(`(function(){const o=${finder};if(!o)return null;const c=o.getWorldPosition(new THREE.Vector3());return [+c.x.toFixed(1),+c.z.toFixed(1)];})()`);
async function clickMaybeRow(p, finder, rowRe, opts){
  const c = await p.clickObject(finder, opts);
  await p.wait(900);
  const v = await p.see();
  if (v.ctxOpen) { const rows = await p.ctxRows(); say('  ctx rows', rows); const r = rows.find(x => rowRe.test(x)); if (r) await p.chooseRow(r); }
  return c;
}
async function nearby(p){ const v = await p.see(); say('  nearby', v.nearby.slice(0, 8).map(n => n.kind + ':' + n.label + '@' + n.tile + ' d' + n.dist + (n.onScreen ? '' : ' offscreen'))); return v; }
/* Some targets hide under canopies or behind walls at the default camera. A player tilts and zooms. */
async function clickWithCameraSearch(p, finder, label){
  let c = await p.clickObject(finder);
  if (c.clicked) return c;
  say(`  ${label}: not clickable at the default camera (${JSON.stringify(c.loc)}); tilting/zooming`);
  await p.screenshot(label + '-hidden');
  for (const [pitch, dist, yawOff] of [[1.45, 7, 0], [1.2, 6, Math.PI / 2], [1.2, 6, -Math.PI / 2], [0.6, 6, Math.PI]]) {
    await p.page.evaluate(yo => { camCtl.yaw += yo; }, yawOff);
    c = await p.clickObject(finder, {pitch, dist});
    say(`  ${label}: pitch=${pitch} dist=${dist} yawOff=${yawOff.toFixed(2)} clicked=${c.clicked}`);
    if (c.clicked) { say('  WORKAROUND: tilting/zooming the camera exposed ' + label); return c; }
  }
  return c;
}

const H = {};
H.study_route = async p => { await rush(p, 151.5, 158.5); const c = await p.clickObject(FINDERS.reliefChart); say('  chart click', c.clicked); return stepDone(p, 'study_route', 12000); };
H.equip_hatchet = async p => { await p.clickInventory('hatchet'); return stepDone(p, 'equip_hatchet', 6000); };
H.chop_logs = async (p, n) => {
  let v = await p.see(); say('  arrow', v.arrow);
  if (n === 1 && v.arrow && /door/i.test(v.arrow.label)) { await rush(p, v.arrow.target[0], v.arrow.target[1] - 1, {near: 1.5}); v = await p.see(); say('  after door: arrow', v.arrow, 'pos', v.pos); await p.screenshot('after-teaching-door'); }
  await rush(p, 127, 159, {maxLegs: 30});
  v = await nearby(p); await p.screenshot('survival-wood');
  const m = await p.clickObject(FINDERS.markedTree); say('  marked tree click', m.clicked, m.loc && m.loc.hit);
  if (n === 1) { await p.wait(1500); await farClick(p, v.pos[0] + 6, v.pos[1] + 2); await p.wait(1500); v = await p.see(); say('  walked off mid-chop: pos=' + JSON.stringify(v.pos) + ' pack=' + JSON.stringify(v.pack) + ' chat=' + JSON.stringify(v.chat.slice(-2))); await p.screenshot('walked-off-chop'); if (!v.pack.some(x => /logs/.test(x))) { const m2 = await p.clickObject(FINDERS.markedTree); say('  marked tree click 2', m2.clicked); } }
  return stepDone(p, 'chop_logs', 25000);
};
H.light_fire = async (p, n) => {
  let v = await p.see();
  if (!v.pack.some(x => /logs/.test(x))) { await rush(p, 127, 159); await p.clickObject(FINDERS.markedTree); await p.waitFor("Player.inv.some(s=>s&&/logs/.test(s.id))", 25000); }
  if (n === 1) { const r = await p.useItemOn('tinderbox', FINDERS.markedTree); await p.wait(1200); v = await p.see(); say('  tinderbox->tree', r.clicked, JSON.stringify(v.chat.slice(-1))); await p.page.keyboard.press('Escape'); }
  if (n > 1) { await farClick(p, v.pos[0] + 2, v.pos[1] + 1); await p.wait(1500); }
  await p.clickInventory('tinderbox'); await p.clickInventory('logs'); await p.wait(600);
  const ok = await stepDone(p, 'light_fire', 20000);
  v = await p.see(); p.firePos = await objPos(p, FINDERS.campfire); p.fireLitAt = v.t; say('  fire at', p.firePos, 'lit t=', v.t, 'chat', JSON.stringify(v.chat.slice(-2)));
  await p.screenshot('after-fire');
  return ok;
};
H.catch_fish = async (p, n) => {
  let v = await p.see(); const tgt = (v.arrow && v.arrow.target) || [132, 156];
  await rush(p, tgt[0], tgt[1] + 1);
  if (n === 1) { const e = await p.clickObject(FINDERS.fishingEdge); await p.wait(1200); v = await p.see(); say('  plain edge click', e.clicked, JSON.stringify(v.chat.slice(-1))); await p.screenshot('edge-plain-click'); await p.clickObject(FINDERS.fishingEdge, {keepCamera: true}); await p.wait(1000); }
  const c = await p.useItemOn('fishing_net', FINDERS.fishingEdge); say('  net->edge', c.clicked);
  return stepDone(p, 'catch_fish', 45000);
};
H.cook_fish = async (p, n) => {
  let v = await p.see(); let fire = await objPos(p, FINDERS.campfire);
  say('  fire present at', fire, 't=', v.t, 'lit at', p.fireLitAt, 'arrow', v.arrow);
  if (!v.pack.some(x => /raw_perch/.test(x))) { say('  no raw perch; back to fishing'); await rush(p, 132, 157); await p.useItemOn('fishing_net', FINDERS.fishingEdge); await p.waitFor("Player.inv.some(s=>s&&s.id==='raw_perch')", 45000); }
  if (!fire) {
    const tgt = (v.arrow && v.arrow.target) || [128, 155];
    if (n === 1) await p.note('medium', 'Survival Wood, fire tile ' + JSON.stringify(p.firePos), 'Came back with the perch at ' + v.t + 's and the fire lit at ' + p.fireLitAt + 's had already burned out; arrow now says "' + (v.arrow && v.arrow.label) + '" at ' + JSON.stringify(tgt), 'A fire that outlasts one fishing trip');
    if (!v.pack.some(x => /logs/.test(x))) { await rush(p, 127, 159); await p.clickObject(FINDERS.markedTree); await p.waitFor("Player.inv.some(s=>s&&/logs/.test(s.id))", 25000); }
    await rush(p, tgt[0] + 0.5, tgt[1] + 0.5, {near: 0.8});
    await p.clickInventory('tinderbox'); await p.clickInventory('logs'); await p.waitFor(FINDERS.campfire, 15000); await p.wait(1200);
    fire = await objPos(p, FINDERS.campfire); say('  new fire at', fire); await p.screenshot('second-fire');
    if (!fire) return false;
  }
  await rush(p, fire[0] + 1, fire[1], {near: 1.3});
  await p.clickInventory('raw_perch');
  const c = await clickWithCameraSearch(p, FINDERS.campfire, 'campfire');
  if (!c.clicked) { await p.note('high', 'Survival Wood campfire at ' + JSON.stringify(fire), 'The campfire cannot be clicked from any camera angle I tried (default, tilted down, zoomed in, rotated); the "Cook on your fire" label floats over tree canopy', 'A visible, clickable fire where the label points'); await p.page.keyboard.press('Escape'); return false; }
  if (c.loc && !(await p.page.evaluate(() => true))) {}
  await p.wait(1000); await dismiss(p, /cook|perch/i);
  return stepDone(p, 'cook_fish', 25000);
};
H.descend_cavern = async (p, n) => {
  let v = await p.see(); const tgt = (v.arrow && v.arrow.target) || [124, 119];
  await rush(p, tgt[0], tgt[1] + 1.5, {maxLegs: 30});
  v = await nearby(p); await p.screenshot('gatehouse');
  const c = await clickMaybeRow(p, FINDERS.winchFrame, /climb|descend|down/i); say('  winch click', c.clicked, c.loc && c.loc.hit);
  await p.wait(800); await dismiss(p, /descend|down|climb|yes/i);
  if (!c.clicked && n > 1) { await p.rightClickObject(FINDERS.winchFrame); say('  winch rows', await p.ctxRows()); await p.chooseRow('Climb'); await dismiss(p, /descend|down|climb|yes/i); }
  const ok = await stepDone(p, 'descend_cavern', 15000); await p.wait(1500); v = await p.see(); await snap(p, v, 'cavern-arrival'); await p.screenshot('cavern-arrival'); return ok;
};
async function mineStep(p, n, id, finder, label){
  let v = await p.see(); const tgt = (v.arrow && v.arrow.target); say('  arrow', v.arrow, 'pos', v.pos);
  if (tgt) await rush(p, tgt[0], tgt[1] + 1, {maxLegs: 30});
  v = await nearby(p); await p.screenshot('at-' + label);
  let c = await clickWithCameraSearch(p, finder, label + ' rock'); say('  ' + label + ' click', c.clicked, c.loc && c.loc.hit);
  if (n === 1 && label === 'copper' && c.clicked) { await p.wait(1200); await farClick(p, v.pos[0] - 4, v.pos[1]); await p.wait(1500); v = await p.see(); say('  walked off mid-mine: pack=' + JSON.stringify(v.pack) + ' chat=' + JSON.stringify(v.chat.slice(-2))); await p.screenshot('walked-off-mine'); if (!v.pack.some(x => /copper/.test(x))) c = await p.clickObject(finder); }
  await p.wait(800); await dismiss(p);
  if (n > 1 && !c.clicked) { await p.rightClickObject(finder); say('  rows', await p.ctxRows()); await p.chooseRow('Mine'); }
  return stepDone(p, id, 30000);
}
H.mine_copper = (p, n) => mineStep(p, n, 'mine_copper', FINDERS.copperRock, 'copper');
H.mine_tin = (p, n) => mineStep(p, n, 'mine_tin', FINDERS.tinRock, 'tin');
H.smelt_bronze = async (p, n) => {
  let v = await p.see(); const tgt = (v.arrow && v.arrow.target) || [305, 363]; await rush(p, tgt[0], tgt[1] + 1);
  v = await nearby(p);
  let c;
  if (n === 1) { c = await clickWithCameraSearch(p, FINDERS.furnace, 'furnace'); say('  furnace click', c.clicked); }
  else if (n === 2) { c = await p.useItemOn('copper_ore', FINDERS.furnace); say('  copper->furnace', c.clicked); }
  else { await p.rightClickObject(FINDERS.furnace); say('  furnace rows', await p.ctxRows()); await p.chooseRow('Smelt'); }
  await p.wait(1000); await dismiss(p, /bronze|smelt/i); await p.screenshot('smelt-' + n);
  return stepDone(p, 'smelt_bronze', 25000);
};
H.forge_dagger = async (p, n) => {
  let v = await p.see(); const tgt = (v.arrow && v.arrow.target) || [302, 363]; await rush(p, tgt[0], tgt[1] + 1);
  let c;
  if (n === 1) { c = await clickWithCameraSearch(p, FINDERS.anvil, 'anvil'); say('  anvil click', c.clicked); }
  else if (n === 2) { c = await p.useItemOn('bronze_bar', FINDERS.anvil); say('  bar->anvil', c.clicked); }
  else { await p.rightClickObject(FINDERS.anvil); say('  anvil rows', await p.ctxRows()); await p.chooseRow('Smith'); }
  await p.wait(1000); v = await p.see(); if (v.dialogue) await dismiss(p, /dagger/i); else say('  no dialogue after anvil; chat', JSON.stringify(v.chat.slice(-2)));
  await p.screenshot('forge-' + n);
  return stepDone(p, 'forge_dagger', 25000);
};
H.open_bank = async (p, n) => {
  let v = await p.see(); say('  arrow', v.arrow, 'pos', v.pos, 'zone', v.zone);
  const exitPos = await objPos(p, FINDERS.cavernExit);
  if (exitPos && Math.hypot(exitPos[0] - v.pos[0], exitPos[1] - v.pos[1]) < 60) {
    say('  cavern exit at', exitPos); await rush(p, exitPos[0], exitPos[1] + 1.5, {maxLegs: 30});
    const c = await clickMaybeRow(p, FINDERS.cavernExit, /climb|up|exit/i); say('  exit click', c.clicked); await p.wait(2500); await dismiss(p);
    v = await p.see(); await snap(p, v, 'after-exit'); await p.screenshot('after-exit');
  }
  const tgt = (v.arrow && v.arrow.target) || [154, 116]; await rush(p, tgt[0], tgt[1] + 1.5, {maxLegs: 34});
  v = await nearby(p); await p.screenshot('bank');
  let c = await clickMaybeRow(p, FINDERS.bankBooth, /bank|open|use/i); say('  booth click', c.clicked, c.loc && c.loc.hit);
  await p.wait(1000); await dismiss(p, /bank|open/i);
  if (!c.clicked && n > 1) { await p.rightClickObject(FINDERS.bankBooth); say('  booth rows', await p.ctxRows()); await p.chooseRow('Bank'); }
  const ok = await stepDone(p, 'open_bank', 15000);
  await p.screenshot('bank-open');
  await p.page.keyboard.press('Escape'); await p.wait(400);
  await p.page.evaluate(() => { const b = [...document.querySelectorAll('button, .close, .x')].find(x => /^(x|close|✕|×)$/i.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
  return ok;
};
H.relight_lastlight = async (p, n) => {
  let v = await p.see(); const tgt = (v.arrow && v.arrow.target) || [196, 112]; say('  arrow', v.arrow);
  if (v.plane === 0) { await rush(p, tgt[0], tgt[1] + 2, {maxLegs: 34}); v = await nearby(p); await p.screenshot('lastlight'); const d = await p.clickObject(FINDERS.lastlightDoor); say('  door click', d.clicked); await p.wait(2500); await dismiss(p); v = await p.see(); await snap(p, v, 'lastlight-inside'); await p.screenshot('lastlight-inside'); }
  for (let i = 0; i < 6; i++) {
    v = await p.see();
    const lever = await p.page.evaluate(`!!(${FINDERS.lever})`);
    const ladder = await objPos(p, FINDERS.ladderUp);
    say(`  floor loop ${i}: plane=${v.plane} lever=${lever} ladder=${JSON.stringify(ladder)} pos=${JSON.stringify(v.pos)} arrow=${v.arrow && v.arrow.label}`);
    if (lever) { const l = await clickWithCameraSearch(p, FINDERS.lever, 'lever'); say('  lever click', l.clicked); await p.wait(1000); await dismiss(p, /pull|light|yes/i); if (await stepDone(p, 'relight_lastlight', 20000)) return true; await p.rightClickObject(FINDERS.lever); say('  lever rows', await p.ctxRows()); await p.chooseRow('Pull'); await dismiss(p, /pull|light|yes/i); if (await stepDone(p, 'relight_lastlight', 20000)) return true; }
    if (!ladder) { say('  no ladder up visible'); await p.screenshot('no-ladder-' + i); v = await nearby(p); return false; }
    await rush(p, ladder[0], ladder[1] + 1.2, {maxLegs: 8, near: 1.6});
    const c = await clickMaybeRow(p, FINDERS.ladderUp, /climb|up/i); say('  ladder click', c.clicked);
    await p.wait(2000); await dismiss(p, /up|climb/i); await p.screenshot('lastlight-floor-' + i);
  }
  return false;
};
H.complete = async (p, n) => {
  let v = await p.see(); await snap(p, v, 'pre-depart');
  for (let i = 0; i < 6 && (await p.see()).plane > 0; i++) {
    const down = "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&o.userData.climb&&o.userData.climb.down&&o.userData.climb.down.plane===(Player.plane||0)-1)";
    const pos = await objPos(p, down); say('  down ladder at', pos); if (!pos) break;
    await rush(p, pos[0], pos[1] + 1.2, {maxLegs: 8, near: 1.6}); await clickMaybeRow(p, down, /climb|down/i); await p.wait(2000); await dismiss(p);
  }
  v = await p.see(); say('  plane=' + v.plane + ' pos=' + JSON.stringify(v.pos) + ' arrow=' + JSON.stringify(v.arrow));
  await rush(p, 206, 152, {maxLegs: 34});
  v = await nearby(p); await p.screenshot('dock');
  const c = await clickMaybeRow(p, FINDERS.skiff, /board/i); say('  skiff click', c.clicked, c.loc && c.loc.hit);
  await p.wait(1500); await dismiss(p, /board|sail|yes|mainland/i);
  let sailed = await p.waitFor("document.getElementById('zone-label') && /Veyhollow/.test(document.getElementById('zone-label').textContent)", 40000);
  if (!sailed && n > 1) { await p.rightClickObject(FINDERS.skiff); say('  skiff rows', await p.ctxRows()); await p.chooseRow('Board'); await dismiss(p, /board|sail|yes|mainland/i); sailed = await p.waitFor("/Veyhollow/.test(document.getElementById('zone-label').textContent)", 40000); }
  v = await p.see(); await snap(p, v, sailed ? 'MAINLAND' : 'not-sailed'); await p.screenshot(sailed ? 'mainland' : 'not-sailed-' + n);
  if (sailed) { lessons.push({id: 'board_skiff', t: v.t, next: null, objective: v.objective}); say('  LESSON DONE board_skiff at ' + v.t + 's zone=' + v.zone); }
  return sailed;
};

(async () => {
  const p = await Player.launch({port: 8779, profile: 'impatient3', out: OUT});
  await p.login();
  let v = await p.see(); await snap(p, v, 'arrival'); await p.screenshot('arrival');
  if (v.chat.some(c => /Talk to Guide Bram/i.test(c))) await p.note('low', 'Arrival Cove, first chat lines', 'Chat says "Talk to Guide Bram by the rowboat" while the objective banner says "Enter the Guide Hall and study the relief chart"; chat above it also shows "[COOK] The bread-making chain is lit..." and "Deed complete: Apprentice - 50 crowns!" on a brand-new profile', 'One instruction; no leftover messages from before the adventurer existed');
  let sailed = false;
  const deadline = Date.now() + 25 * 60 * 1000;
  let earlySkiffDone = false;
  while (Date.now() < deadline) {
    const step = await curStep(p);
    if (!step) { say('!! no step'); break; }
    attempts[step] = (attempts[step] || 0) + 1;
    const n = attempts[step];
    v = await p.see();
    say(`\n=== ${step} (attempt ${n}) t=${v.t} objective="${v.objective}" arrow=${v.arrow && v.arrow.label}@${v.arrow && JSON.stringify(v.arrow.target)} pos=${JSON.stringify(v.pos)} pack=${JSON.stringify(v.pack)}`);
    if (step === 'chop_logs' && !earlySkiffDone) {
      earlySkiffDone = true;
      say('  impatient detour: try the skiff first');
      await rush(p, 206, 152, {maxLegs: 30}); v = await nearby(p); await p.screenshot('dock-early');
      const c = await p.clickObject(FINDERS.skiff); say('  skiff click', c.clicked); await p.wait(1200); v = await p.see();
      if (v.dialogue) { say('  skiff dialogue', v.dialogue.name, v.dialogue.text.slice(0, 200)); await p.screenshot('skiff-early-dialogue'); if (/<br>|<b>/.test(v.dialogue.text)) await p.note('medium', 'Departure Dock skiff (early attempt)', 'Lesson-lock dialogue shows raw HTML: "' + v.dialogue.text.slice(0, 120) + '"', 'Line breaks and bold rendered, not literal <br><b> tags'); }
      await dismiss(p);
    }
    if (n > 4) { say(`!! giving up on ${step} after ${n - 1} attempts`); await p.note('critical', 'step ' + step, 'Could not complete this step after ' + (n - 1) + ' attempts the impatient way', 'progress'); break; }
    if (!H[step]) { say('!! no handler for ' + step); break; }
    let ok = false;
    try { ok = await H[step](p, n); } catch (e) { say(`  !! handler ${step} threw: ${e.message}`); await p.screenshot('threw-' + step); }
    await dismiss(p);
    if (step === 'complete' && ok) { sailed = true; break; }
    if (!ok) { v = await p.see(); say(`  step ${step} not done (attempt ${n}); chat=${JSON.stringify(v.chat.slice(-3))}`); await p.screenshot(step + '-attempt-' + n); if (n === 3) await p.note('high', 'step ' + step + ' at ' + JSON.stringify(v.pos), 'Three impatient attempts did not complete this step. chat=' + JSON.stringify(v.chat.slice(-3)), 'Progress on the third try at the latest'); }
  }
  v = await p.see();
  const rep = await p.finish('impatient step-driven run; sailed=' + sailed + '; lessons=' + JSON.stringify(lessons));
  fs.writeFileSync(OUT + '/lessons.json', JSON.stringify(lessons, null, 2));
  say('[RUN4] seconds', rep.seconds, 'zone', v.zone, 'sailed', sailed, 'complete', v.tutorialComplete, 'findings', p.findings.length, 'errors', rep.errors.length);
  await p.close();
})().catch(e => { say('RUN4 ERROR ' + e.stack); process.exit(1); });
