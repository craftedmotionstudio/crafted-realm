/* Run 2: the impatient player, full route. Skims, clicks far, clicks again, clicks the wrong thing,
 * walks off mid-action, tries the skiff early, leaves fires to burn. Every input is a real click. */
'use strict';
const {Player, FINDERS} = require('../../../tools/play/harness');
const fs = require('fs');
const OUT = process.env.PT_OUT || 'scratchpad/playtest/impatient/run2-full';
const LOG = OUT + '/progress.log';
fs.mkdirSync(OUT, {recursive: true});
const say = (...a) => { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); console.log(s); fs.appendFileSync(LOG, s + '\n'); };
const lessons = [];

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
/* impatient walk: click far, click again 700ms later (before the walk finishes), then let it complete */
async function rush(p, x, z, opts){
  await farClick(p, x, z); await p.wait(700); await farClick(p, x, z); await p.wait(300);
  const r = await p.walkTo(x, z, Object.assign({maxLegs: 24}, opts || {}));
  const v = await p.see();
  say(`  rush -> (${x},${z}) reached=${r.reached} at=${JSON.stringify(v.pos)} t=${v.t} legs=${r.legs} ${r.reason || ''}`);
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
async function stepChanged(p, fromId, ms){
  const ok = await p.waitFor(`Tutorial.complete || !Tutorial.steps[Tutorial.step] || Tutorial.steps[Tutorial.step].id!=='${fromId}'`, ms || 20000);
  const v = await p.see();
  if (ok) { lessons.push({id: fromId, t: v.t, next: v.stepId, objective: v.objective}); say(`  LESSON DONE ${fromId} at ${v.t}s -> ${v.stepId} "${v.objective}"`); }
  return ok;
}
async function snap(p, v, label){ say(`[${label}] t=${v.t} step=${v.stepId} pos=${JSON.stringify(v.pos)} zone=${v.zone} plane=${v.plane} arrow=${v.arrow && v.arrow.label}@${v.arrow && JSON.stringify(v.arrow.target)} pack=${JSON.stringify(v.pack)} chat=${JSON.stringify(v.chat.slice(-3))}`); }
async function phase(p, name, fn){ say(`\n=== ${name} ===`); try { await fn(); } catch (e) { say(`  !! phase ${name} threw: ${e.message}`); await p.screenshot('threw-' + name.replace(/\W+/g, '_')); } }
async function clickThenMaybeRow(p, finder, rowRe, opts){
  const c = await p.clickObject(finder, opts);
  await p.wait(900);
  let v = await p.see();
  if (v.ctxOpen) { const rows = await p.ctxRows(); say('  ctx rows', rows); const r = rows.find(x => rowRe.test(x)); if (r) await p.chooseRow(r); }
  return c;
}
const objPos = async (p, finder) => p.page.evaluate(`(function(){const o=${finder};if(!o)return null;const c=o.getWorldPosition(new THREE.Vector3());return [+c.x.toFixed(1),+c.z.toFixed(1)];})()`);

(async () => {
  const p = await Player.launch({port: 8779, profile: 'impatient', out: OUT});
  await p.login();
  let v = await p.see(); await snap(p, v, 'arrival'); await p.screenshot('arrival');
  const arrivalChat = v.chat.slice();

  await phase(p, 'A chart (skim, click far, click again)', async () => {
    if (!arrivalChat.some(c => /relief chart|Guide Hall/i.test(c)) && arrivalChat.some(c => /Talk to Guide Bram/i.test(c)))
      await p.note('low', 'Arrival Cove, first chat lines', 'Chat says "Talk to Guide Bram by the rowboat" while the objective banner says "Enter the Guide Hall and study the relief chart"', 'One instruction, not two that disagree');
    await rush(p, 151.5, 158.5);
    const c = await p.clickObject(FINDERS.reliefChart);
    say('  chart click', c.clicked, c.loc && c.loc.hit);
    let ok = await stepChanged(p, 'study_route', 12000);
    if (!ok) { await p.screenshot('chart-no-advance'); await rush(p, 151.5, 157); const c2 = await p.clickObject(FINDERS.reliefChart); say('  chart click 2', c2.clicked); ok = await stepChanged(p, 'study_route', 12000); }
    v = await p.see(); await snap(p, v, 'after-chart'); await p.screenshot('after-chart');
    await dismiss(p);
  });

  await phase(p, 'B equip hatchet immediately from pack (not at the survival station)', async () => {
    await p.clickInventory('hatchet');
    await p.wait(600);
    const ok = await stepChanged(p, 'equip_hatchet', 6000);
    v = await p.see(); await snap(p, v, 'after-equip'); await p.screenshot('after-equip');
    if (!ok) await p.note('medium', 'Guide Hall, pack', 'Clicked the hatchet in the pack right after the chart; objective "' + v.objective + '" did not advance within 6s; weapon=' + v.weapon, 'Wielding the hatchet anywhere should count');
    else if (Math.hypot(v.pos[0] - 112, v.pos[1] - 152) > 20) say('  note: equip counted from inside the Guide Hall, far from the arrow target (112,152)');
  });

  await phase(p, 'C try to board the skiff early (Departure Dock, east)', async () => {
    await rush(p, 206, 152, {maxLegs: 30});
    v = await p.see(); await snap(p, v, 'at-dock-early'); await p.screenshot('dock-early');
    say('  nearby', v.nearby.slice(0, 6).map(n => n.kind + ':' + n.label + '@' + n.tile + ' d' + n.dist));
    const c = await p.clickObject(FINDERS.skiff);
    say('  skiff click', c.clicked, c.loc && c.loc.hit);
    await p.wait(1200);
    v = await p.see();
    if (v.dialogue) { say('  skiff dialogue', v.dialogue.name, v.dialogue.text.slice(0, 200)); await p.screenshot('skiff-early-dialogue'); }
    else { say('  skiff: no dialogue; chat', v.chat.slice(-2)); await p.screenshot('skiff-early-silent'); }
    await dismiss(p);
    if (!c.clicked) { const r = await p.rightClickObject(FINDERS.skiff); say('  skiff right-click', r.clicked, await p.ctxRows()); await p.page.keyboard.press('Escape'); }
    v = await p.see(); say('  after early skiff: zone=' + v.zone + ' step=' + v.stepId + ' pos=' + JSON.stringify(v.pos));
  });

  await phase(p, 'D chop: wrong tree first, walk off mid-chop, then the marked tree', async () => {
    v = await p.see(); const tgt = (v.arrow && v.arrow.target) || [126, 158];
    say('  arrow', v.arrow);
    await rush(p, tgt[0] + 1, tgt[1] + 1, {maxLegs: 30});
    v = await p.see(); await snap(p, v, 'survival-wood'); await p.screenshot('survival-wood');
    say('  nearby', v.nearby.slice(0, 8).map(n => n.kind + ':' + n.label + '@' + n.tile + ' d' + n.dist + (n.onScreen ? '' : ' offscreen')));
    const wrong = "(function(){const m=WORLD.clickables.find(o=>o.userData&&o.userData.marked);const k=m&&m.userData.kind;let best=null,bd=1e9;for(const o of WORLD.clickables){if(!o.userData||o.userData.kind!==k||o.userData.marked||o.userData.alive===false)continue;const c=o.getWorldPosition(new THREE.Vector3());const d=Math.hypot(c.x-player.position.x,c.z-player.position.z);if(d<bd){bd=d;best=o;}}return best;})()";
    const w = await p.clickObject(wrong);
    say('  wrong tree click', w.clicked, w.loc);
    await p.wait(3500);
    v = await p.see(); say('  after wrong tree: pack=' + JSON.stringify(v.pack) + ' chat=' + JSON.stringify(v.chat.slice(-2)));
    await p.screenshot('wrong-tree');
    if (w.clicked && !v.chat.slice(-2).some(c => /mark|this tree|that tree|Bram|not that/i.test(c))) await p.note('medium', 'Survival Wood, unmarked tree next to the marked one', 'Clicked a look-alike unmarked tree; ' + (v.pack.includes('logs') ? 'it gave logs' : 'nothing obvious said why it was the wrong one; chat: ' + JSON.stringify(v.chat.slice(-2))), 'A one-line hint pointing at the marked tree, or the unmarked tree simply works');
    const m = await p.clickObject(FINDERS.markedTree);
    say('  marked tree click', m.clicked, m.loc && m.loc.hit);
    await p.wait(1500);
    await farClick(p, v.pos[0] + 6, v.pos[1] + 2);
    await p.wait(1500);
    v = await p.see(); say('  walked off mid-chop: pos=' + JSON.stringify(v.pos) + ' pack=' + JSON.stringify(v.pack) + ' chat=' + JSON.stringify(v.chat.slice(-2)));
    await p.screenshot('walked-off-chop');
    const m2 = await p.clickObject(FINDERS.markedTree);
    say('  marked tree click 2', m2.clicked);
    const ok = await stepChanged(p, 'chop_logs', 25000);
    v = await p.see(); await snap(p, v, 'after-chop'); await p.screenshot('after-chop');
    if (!ok) { await p.note('high', 'Survival Wood marked tree', 'Clicked the marked tree twice (once walked off mid-chop); no logs after 25s. pack=' + JSON.stringify(v.pack) + ' chat=' + JSON.stringify(v.chat.slice(-3)), 'Logs in pack and the objective moving on'); for (let i = 0; i < 3 && !(await p.see()).pack.some(x => /logs/.test(x)); i++) { await p.clickObject(FINDERS.markedTree); await p.waitFor("Player.inv.some(s=>s&&/logs/.test(s.id))", 15000); } await stepChanged(p, 'chop_logs', 3000); }
    await dismiss(p);
  });

  await phase(p, 'E fire: tinderbox on the wrong things, then on logs', async () => {
    v = await p.see();
    const r1 = await p.useItemOn('tinderbox', FINDERS.markedTree);
    await p.wait(1500); v = await p.see(); say('  tinderbox->tree:', r1.clicked, 'usingItem=' + v.usingItem, 'chat=' + JSON.stringify(v.chat.slice(-2)));
    await p.screenshot('tinderbox-on-tree');
    const treeMsg = v.chat.slice(-1)[0];
    await p.clickInventory('tinderbox'); await p.clickInventory('hatchet'); await p.wait(1200);
    v = await p.see(); say('  tinderbox->hatchet: usingItem=' + v.usingItem + ' chat=' + JSON.stringify(v.chat.slice(-2)));
    if (!v.chat.slice(-1)[0] || v.chat.slice(-1)[0] === treeMsg) await p.note('medium', 'Survival Wood, pack', 'Used tinderbox on the tree and on the hatchet; no chat line explained why nothing happened (usingItem=' + v.usingItem + ')', '"Nothing interesting happens" or a nudge toward the logs');
    await p.page.keyboard.press('Escape');
    await p.clickInventory('tinderbox'); await p.clickInventory('logs');
    await p.wait(800);
    v = await p.see(); say('  tinderbox->logs: usingItem=' + v.usingItem + ' chat=' + JSON.stringify(v.chat.slice(-2)));
    await p.screenshot('lighting');
    let ok = await stepChanged(p, 'light_fire', 20000);
    if (!ok) { v = await p.see(); await p.screenshot('fire-not-lit'); say('  fire did not count: ' + JSON.stringify(v.chat.slice(-3)) + ' pack=' + JSON.stringify(v.pack)); await dismiss(p); ok = await stepChanged(p, 'light_fire', 3000); }
    if (!ok) {
      await farClick(p, v.pos[0] + 2, v.pos[1]); await p.wait(1500);
      await p.clickInventory('logs'); await p.clickInventory('tinderbox'); await p.wait(800);
      ok = await stepChanged(p, 'light_fire', 20000);
      v = await p.see(); if (!ok) await p.note('high', 'Survival Wood, fire tile', 'Tinderbox on logs (both orders) did not light a fire that counted. chat=' + JSON.stringify(v.chat.slice(-3)) + ' pack=' + JSON.stringify(v.pack) + ' pos=' + JSON.stringify(v.pos), 'Fire lit where I stand, objective advances');
    }
    v = await p.see(); await snap(p, v, 'after-fire'); await p.screenshot('after-fire');
    await dismiss(p);
  });

  await phase(p, 'F fish: click the edge many times, leave the fire burning', async () => {
    v = await p.see(); const tgt = (v.arrow && v.arrow.target) || [132, 156];
    say('  arrow', v.arrow);
    await rush(p, tgt[0], tgt[1] + 1);
    v = await p.see(); say('  nearby', v.nearby.slice(0, 6).map(n => n.kind + ':' + n.label + '@' + n.tile + ' d' + n.dist));
    const e = await p.clickObject(FINDERS.fishingEdge);
    say('  edge click', e.clicked, e.loc && e.loc.hit);
    await p.wait(1500);
    v = await p.see(); say('  after edge click: chat=' + JSON.stringify(v.chat.slice(-2)) + ' dialogue=' + JSON.stringify(v.dialogue && v.dialogue.options));
    await p.screenshot('fishing-1');
    if (v.dialogue) await dismiss(p);
    await p.clickObject(FINDERS.fishingEdge, {keepCamera: true}); await p.wait(600); await p.clickObject(FINDERS.fishingEdge, {keepCamera: true});
    let ok = await stepChanged(p, 'catch_fish', 30000);
    if (!ok) { v = await p.see(); say('  no fish after 30s: chat=' + JSON.stringify(v.chat.slice(-3)) + ' pack=' + JSON.stringify(v.pack)); await p.screenshot('no-fish');
      const n = await p.useItemOn('fishing_net', FINDERS.fishingEdge); say('  net->edge', n.clicked); ok = await stepChanged(p, 'catch_fish', 30000);
      if (!ok) { await p.rightClickObject(FINDERS.fishingEdge); say('  edge rows', await p.ctxRows()); await p.chooseRow('net'); ok = await stepChanged(p, 'catch_fish', 30000); }
      v = await p.see(); if (!ok) await p.note('high', 'Survival Wood fishing edge', 'Clicked the fishing edge 3x, used the net on it, tried the right-click menu; no perch after ~90s. chat=' + JSON.stringify(v.chat.slice(-3)), 'A perch in the pack from a plain click with the net in the pack');
    }
    v = await p.see(); await snap(p, v, 'after-fish'); await p.screenshot('after-fish');
    await dismiss(p);
  });

  await phase(p, 'G cook: is the fire still there?', async () => {
    v = await p.see(); const tgt = (v.arrow && v.arrow.target) || [128, 155];
    say('  arrow', v.arrow);
    const fire = await objPos(p, FINDERS.campfire);
    say('  fire object present at', fire, 'elapsed', v.t);
    await p.screenshot('fire-check');
    if (!fire) {
      await p.note('medium', 'Survival Wood, fire tile ' + JSON.stringify(tgt), 'Came back from fishing (' + v.t + 's) and the fire had burned out; arrow says "' + (v.arrow && v.arrow.label) + '"', 'A fire that outlasts one trip to the shore, or a clear "your fire has burned out; light another" line');
      if (!v.pack.some(x => /logs/.test(x))) { await rush(p, 126, 159); await p.clickObject(FINDERS.markedTree); await p.waitFor("Player.inv.some(s=>s&&/logs/.test(s.id))", 25000); }
      await rush(p, tgt[0], tgt[1]);
      await p.clickInventory('tinderbox'); await p.clickInventory('logs'); await p.waitFor(FINDERS.campfire, 15000);
    } else await rush(p, fire[0] + 1, fire[1]);
    const c = await p.useItemOn('raw_perch', FINDERS.campfire);
    say('  perch->fire', c.clicked, c.loc && c.loc.hit);
    await p.wait(1000); v = await p.see(); if (v.dialogue) await dismiss(p, /cook|perch/i);
    let ok = await stepChanged(p, 'cook_fish', 25000);
    v = await p.see(); say('  after cook attempt: pack=' + JSON.stringify(v.pack) + ' chat=' + JSON.stringify(v.chat.slice(-3)));
    if (!ok) { await p.screenshot('cook-fail'); await p.useItemOn('raw_perch', FINDERS.campfire); await dismiss(p, /cook/i); ok = await stepChanged(p, 'cook_fish', 25000); v = await p.see();
      if (!ok) await p.note('high', 'Survival Wood campfire', 'Used raw perch on the fire twice; no cooked perch. pack=' + JSON.stringify(v.pack) + ' chat=' + JSON.stringify(v.chat.slice(-3)), 'Cooked perch, objective advances'); }
    await snap(p, v, 'after-cook'); await p.screenshot('after-cook');
    await dismiss(p);
  });

  await phase(p, 'H descend: winch frame at the Mine Gatehouse', async () => {
    v = await p.see(); const tgt = (v.arrow && v.arrow.target) || [124, 119];
    say('  arrow', v.arrow);
    await rush(p, tgt[0], tgt[1] + 1.5, {maxLegs: 30});
    v = await p.see(); await snap(p, v, 'gatehouse'); await p.screenshot('gatehouse');
    say('  nearby', v.nearby.slice(0, 8).map(n => n.kind + ':' + n.label + '@' + n.tile + ' d' + n.dist));
    const c = await clickThenMaybeRow(p, FINDERS.winchFrame, /climb|descend|down/i);
    say('  winch click', c.clicked, c.loc && c.loc.hit);
    await p.wait(1000); v = await p.see(); if (v.dialogue) await dismiss(p, /descend|down|climb|yes/i);
    let ok = await stepChanged(p, 'descend_cavern', 15000);
    if (!ok) { v = await p.see(); say('  not descended: chat=' + JSON.stringify(v.chat.slice(-3)) + ' plane=' + v.plane + ' pos=' + JSON.stringify(v.pos)); await p.screenshot('descend-fail');
      await p.rightClickObject(FINDERS.winchFrame); say('  winch rows', await p.ctxRows()); await p.chooseRow('Climb'); await p.wait(800); await dismiss(p, /descend|down|climb|yes/i); ok = await stepChanged(p, 'descend_cavern', 15000);
      v = await p.see(); if (!ok) await p.note('high', 'Mine Gatehouse winch frame ' + JSON.stringify(tgt), 'Clicked and right-clicked the winch frame; did not descend. chat=' + JSON.stringify(v.chat.slice(-3)), 'Climb down into the cavern'); }
    await p.wait(1500); v = await p.see(); await snap(p, v, 'cavern-arrival'); await p.screenshot('cavern-arrival');
    await dismiss(p);
  });

  await phase(p, 'I cavern: copper (walk off mid-mine), tin, smelt, forge', async () => {
    for (const [id, finder, label] of [['mine_copper', FINDERS.copperRock, 'copper'], ['mine_tin', FINDERS.tinRock, 'tin']]) {
      v = await p.see(); const tgt = (v.arrow && v.arrow.target) || [296, 357];
      say('  arrow', v.arrow, 'pos', v.pos);
      await rush(p, tgt[0], tgt[1] + 1, {maxLegs: 30});
      v = await p.see(); say('  nearby', v.nearby.slice(0, 8).map(n => n.kind + ':' + n.label + '@' + n.tile + ' d' + n.dist));
      await p.screenshot('at-' + label);
      let c = await p.clickObject(finder); say('  ' + label + ' rock click', c.clicked, c.loc && c.loc.hit);
      if (label === 'copper') { await p.wait(1200); await farClick(p, v.pos[0] - 4, v.pos[1]); await p.wait(1500); v = await p.see(); say('  walked off mid-mine: pack=' + JSON.stringify(v.pack) + ' chat=' + JSON.stringify(v.chat.slice(-2))); await p.screenshot('walked-off-mine'); c = await p.clickObject(finder); }
      await p.wait(800); v = await p.see(); if (v.dialogue) await dismiss(p);
      let ok = await stepChanged(p, id, 30000);
      if (!ok) { v = await p.see(); say('  no ' + label + ': chat=' + JSON.stringify(v.chat.slice(-3)) + ' pack=' + JSON.stringify(v.pack)); await p.screenshot('no-' + label);
        await p.rightClickObject(finder); say('  rows', await p.ctxRows()); await p.chooseRow('Mine'); ok = await stepChanged(p, id, 30000);
        if (!ok) { c = await p.clickObject(finder); ok = await stepChanged(p, id, 30000); }
        v = await p.see(); if (!ok) await p.note('high', 'Training Cavern ' + label + ' rock', 'Clicked/right-clicked the ' + label + ' rock repeatedly; no ore after ~90s. weapon=' + v.weapon + ' pack=' + JSON.stringify(v.pack) + ' chat=' + JSON.stringify(v.chat.slice(-3)), 'Ore in pack'); }
      v = await p.see(); await snap(p, v, 'after-' + label); await p.screenshot('after-' + label);
    }
    v = await p.see(); let tgt = (v.arrow && v.arrow.target) || [305, 363]; say('  arrow', v.arrow);
    await rush(p, tgt[0], tgt[1] + 1);
    let c = await p.clickObject(FINDERS.furnace); say('  furnace click', c.clicked, c.loc && c.loc.hit);
    await p.wait(1000); v = await p.see(); if (v.dialogue) await dismiss(p, /bronze|smelt/i);
    let ok = await stepChanged(p, 'smelt_bronze', 25000);
    if (!ok) { v = await p.see(); say('  no bar: chat=' + JSON.stringify(v.chat.slice(-3)) + ' pack=' + JSON.stringify(v.pack)); await p.screenshot('no-bar');
      c = await p.useItemOn('copper_ore', FINDERS.furnace); await p.wait(800); await dismiss(p, /bronze|smelt/i); ok = await stepChanged(p, 'smelt_bronze', 25000);
      if (!ok) { await p.rightClickObject(FINDERS.furnace); say('  furnace rows', await p.ctxRows()); await p.chooseRow('Smelt'); await dismiss(p, /bronze/i); ok = await stepChanged(p, 'smelt_bronze', 25000); }
      v = await p.see(); if (!ok) await p.note('high', 'Training Cavern furnace', 'Clicked furnace, used copper ore on it, tried right-click; no bronze bar. pack=' + JSON.stringify(v.pack) + ' chat=' + JSON.stringify(v.chat.slice(-3)), 'A bronze bar'); }
    v = await p.see(); await snap(p, v, 'after-smelt'); await p.screenshot('after-smelt');
    v = await p.see(); tgt = (v.arrow && v.arrow.target) || [302, 363]; say('  arrow', v.arrow);
    await rush(p, tgt[0], tgt[1] + 1);
    c = await p.clickObject(FINDERS.anvil); say('  anvil click', c.clicked, c.loc && c.loc.hit);
    await p.wait(1000); v = await p.see(); if (v.dialogue) await dismiss(p, /dagger/i);
    ok = await stepChanged(p, 'forge_dagger', 25000);
    if (!ok) { v = await p.see(); say('  no dagger: chat=' + JSON.stringify(v.chat.slice(-3)) + ' pack=' + JSON.stringify(v.pack) + ' dlg=' + JSON.stringify(v.dialogue)); await p.screenshot('no-dagger');
      c = await p.useItemOn('bronze_bar', FINDERS.anvil); await p.wait(800); await dismiss(p, /dagger/i); ok = await stepChanged(p, 'forge_dagger', 25000);
      if (!ok) { await p.rightClickObject(FINDERS.anvil); say('  anvil rows', await p.ctxRows()); await p.chooseRow('Smith'); await dismiss(p, /dagger/i); ok = await stepChanged(p, 'forge_dagger', 25000); }
      v = await p.see(); if (!ok) await p.note('high', 'Training Cavern anvil', 'Clicked anvil, used bar on it, right-click; no dagger. pack=' + JSON.stringify(v.pack) + ' chat=' + JSON.stringify(v.chat.slice(-3)), 'A bronze dagger'); }
    v = await p.see(); await snap(p, v, 'after-forge'); await p.screenshot('after-forge');
    await dismiss(p);
  });

  await phase(p, 'J out of the cavern and to the bank', async () => {
    v = await p.see(); say('  arrow', v.arrow, 'pos', v.pos, 'plane', v.plane);
    const exitPos = await objPos(p, FINDERS.cavernExit);
    say('  cavern exit at', exitPos);
    if (exitPos) { await rush(p, exitPos[0], exitPos[1] + 1.5, {maxLegs: 30}); const c = await clickThenMaybeRow(p, FINDERS.cavernExit, /climb|up|exit/i); say('  exit click', c.clicked); await p.wait(2500); }
    else { const tgt = (v.arrow && v.arrow.target) || [154, 116]; await rush(p, tgt[0], tgt[1], {maxLegs: 30}); }
    v = await p.see(); await snap(p, v, 'after-exit'); await p.screenshot('after-exit');
    await dismiss(p);
    if (/Cavern|cavern/.test(String(v.zone))) { await p.rightClickObject(FINDERS.cavernExit); say('  exit rows', await p.ctxRows()); await p.chooseRow('Climb'); await p.wait(2500); v = await p.see(); }
    const tgt = (v.arrow && v.arrow.target) || [154, 116]; say('  arrow', v.arrow);
    await rush(p, tgt[0], tgt[1] + 1.5, {maxLegs: 30});
    v = await p.see(); await snap(p, v, 'bank'); await p.screenshot('bank');
    say('  nearby', v.nearby.slice(0, 8).map(n => n.kind + ':' + n.label + '@' + n.tile + ' d' + n.dist));
    const c = await clickThenMaybeRow(p, FINDERS.bankBooth, /bank|open|use/i); say('  booth click', c.clicked, c.loc && c.loc.hit);
    await p.wait(1000); v = await p.see(); if (v.dialogue) await dismiss(p, /bank|open/i);
    let ok = await stepChanged(p, 'open_bank', 15000);
    if (!ok) { v = await p.see(); say('  bank not open: chat=' + JSON.stringify(v.chat.slice(-3))); await p.screenshot('bank-fail'); await p.rightClickObject(FINDERS.bankBooth); say('  booth rows', await p.ctxRows()); await p.chooseRow('Bank'); ok = await stepChanged(p, 'open_bank', 15000); v = await p.see(); if (!ok) await p.note('high', 'Holm Bank booth', 'Clicked and right-clicked the booth; bank did not open. chat=' + JSON.stringify(v.chat.slice(-3)), 'Bank interface opens'); }
    await p.screenshot('bank-open');
    await p.page.keyboard.press('Escape'); await p.wait(400);
    await p.page.evaluate(() => { const b = [...document.querySelectorAll('button, .close, .x')].find(x => /^(x|close|✕|×)$/i.test(x.textContent.trim()) && x.getBoundingClientRect().width > 0); if (b) b.click(); });
    v = await p.see(); await snap(p, v, 'after-bank');
    await dismiss(p);
  });

  await phase(p, 'K Lastlight: door, ladders, lever', async () => {
    v = await p.see(); const tgt = (v.arrow && v.arrow.target) || [196, 112]; say('  arrow', v.arrow);
    await rush(p, tgt[0], tgt[1] + 2, {maxLegs: 34});
    v = await p.see(); await snap(p, v, 'lastlight'); await p.screenshot('lastlight');
    say('  nearby', v.nearby.slice(0, 10).map(n => n.kind + ':' + n.label + '@' + n.tile + ' d' + n.dist));
    const d = await p.clickObject(FINDERS.lastlightDoor); say('  door click', d.clicked, d.loc && d.loc.hit); await p.wait(2500);
    await dismiss(p);
    v = await p.see(); await snap(p, v, 'lastlight-inside'); await p.screenshot('lastlight-inside');
    for (let i = 0; i < 6; i++) {
      v = await p.see();
      const lever = await p.page.evaluate(`!!(${FINDERS.lever})`);
      const ladder = await objPos(p, FINDERS.ladderUp);
      say(`  floor loop ${i}: plane=${v.plane} lever=${lever} ladder=${JSON.stringify(ladder)} pos=${JSON.stringify(v.pos)}`);
      if (lever) { const l = await p.clickObject(FINDERS.lever); say('  lever click', l.clicked, l.loc && l.loc.hit); await p.wait(1000); await dismiss(p, /pull|light|yes/i); if (await stepChanged(p, 'relight_lastlight', 20000)) break; await p.rightClickObject(FINDERS.lever); say('  lever rows', await p.ctxRows()); await p.chooseRow('Pull'); await dismiss(p, /pull|light|yes/i); if (await stepChanged(p, 'relight_lastlight', 20000)) break; }
      if (!ladder) { say('  no ladder up visible'); await p.screenshot('no-ladder-' + i); break; }
      await rush(p, ladder[0], ladder[1] + 1.2, {maxLegs: 8});
      const c = await clickThenMaybeRow(p, FINDERS.ladderUp, /climb|up/i); say('  ladder click', c.clicked, c.loc && c.loc.hit);
      await p.wait(2000); await dismiss(p, /up|climb/i);
      await p.screenshot('lastlight-floor-' + i);
    }
    v = await p.see(); await snap(p, v, 'after-lastlight'); await p.screenshot('after-lastlight');
    if (!v.tutorialComplete && v.stepId === 'relight_lastlight') await p.note('high', 'Lastlight Beacon', 'Could not find/pull the lever the impatient way. plane=' + v.plane + ' chat=' + JSON.stringify(v.chat.slice(-3)), 'Lever pulled, beacon lit');
    await dismiss(p);
  });

  await phase(p, 'L board the skiff', async () => {
    v = await p.see(); await snap(p, v, 'pre-depart');
    for (let i = 0; i < 6 && (await p.see()).plane > 0; i++) {
      const down = "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&o.userData.climb&&o.userData.climb.down&&o.userData.climb.down.plane===(Player.plane||0)-1)";
      const pos = await objPos(p, down);
      say('  down ladder at', pos); if (!pos) break;
      await rush(p, pos[0], pos[1] + 1.2, {maxLegs: 8}); await clickThenMaybeRow(p, down, /climb|down/i); await p.wait(2000); await dismiss(p);
    }
    v = await p.see(); say('  on ground? plane=' + v.plane + ' pos=' + JSON.stringify(v.pos));
    await rush(p, 206, 152, {maxLegs: 34});
    v = await p.see(); await snap(p, v, 'dock'); await p.screenshot('dock');
    const c = await clickThenMaybeRow(p, FINDERS.skiff, /board/i); say('  skiff click', c.clicked, c.loc && c.loc.hit);
    await p.wait(1500); await dismiss(p, /board|sail|yes|mainland/i);
    const sailed = await p.waitFor("document.getElementById('zone-label') && /Veyhollow/.test(document.getElementById('zone-label').textContent)", 40000);
    v = await p.see(); await snap(p, v, sailed ? 'MAINLAND' : 'not-sailed'); await p.screenshot(sailed ? 'mainland' : 'not-sailed');
    if (!sailed) { await p.rightClickObject(FINDERS.skiff); say('  skiff rows', await p.ctxRows()); await p.chooseRow('Board'); await dismiss(p, /board|sail|yes|mainland/i); const s2 = await p.waitFor("/Veyhollow/.test(document.getElementById('zone-label').textContent)", 40000); v = await p.see(); await snap(p, v, s2 ? 'MAINLAND' : 'not-sailed-2'); await p.screenshot(s2 ? 'mainland' : 'not-sailed-2'); }
    await dismiss(p);
  });

  v = await p.see();
  const rep = await p.finish('impatient full run; lessons=' + JSON.stringify(lessons));
  fs.writeFileSync(OUT + '/lessons.json', JSON.stringify(lessons, null, 2));
  say('[RUN2] seconds', rep.seconds, 'zone', v.zone, 'complete', v.tutorialComplete, 'findings', p.findings.length, 'errors', rep.errors.length);
  await p.close();
})().catch(e => { say('RUN2 ERROR ' + e.stack); process.exit(1); });
