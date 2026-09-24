/* Run 3, stage 4: the Training Cavern, with detours. */
const L = re => `WORLD.clickables.find(o=>o.userData&&o.userData.kind!=='door'&&/${re}/i.test(String(o.userData.label||'').replace(/<[^>]+>/g,'')))`;
const {safeClick, near, dump, tryStation, openDoor, doorsNear} = p;
let v = await look('52-stage4-start', {noShot: true});
// to the gatehouse south gate and the winch
await near(128.5, 146.5, 'road', 10); await near(128.5, 137.5, 'road', 8); await near(128.5, 126.5, 'road', 8); await near(124.5, 124.5, 'south gate', 8);
let ds = await doorsNear(8); out('doors', ds); for (const d of ds) await openDoor(d.label.replace(/^(Open|Close) /, ''));
await near(124.5, 119.5, 'winch', 8); v = await look('53-winch-now'); out('winch objective', v.objective, 'arrow', v.arrow);
const wr = await poke('winch-now', FINDERS.winchFrame, {dist: 9, pitch: 1.15, noExamine: true});
let r = await safeClick(FINDERS.winchFrame); out('winch left-click', r.clicked);
let down = await p.waitFor('(Player.plane||0)===-1', 20000);
if (!down){ v = await look('54-winch-left-noclimb'); out('left click did not descend; rows were', wr.rows, 'chat', v.chat.slice(-2)); await dismiss(); await safeClick(FINDERS.winchFrame, {}, true); await sleep(300); await p.chooseRow('Climb'); down = await p.waitFor('(Player.plane||0)===-1', 20000); }
await sleep(1500); v = await look('55-cavern'); out('descended?', down, v.plane, v.zone, v.pos, 'objective', v.objective, 'pack', v.pack); await dump('cavern', 20);
// right-click the cavern floor
await p.aim(v.pos[0], v.pos[1] - 3, 12); await p.clickAt(769, 560, 'right'); await sleep(300); out('cavern floor rows', await p.ctxRows()); await closeCtx();
// try the tin rock first (wrong order), and a copper rock with the hatchet armed
await p.caveWalk(300.5, 366.5, 'offshoot', {maxLegs: 8}); await p.caveWalk(303.5, 373.5, 'tin', {maxLegs: 8}); v = await look('56-tin-first');
await poke('tin-rock', FINDERS.tinRock, {dist: 9, pitch: 1.15});
r = await safeClick(FINDERS.tinRock); out('tin first click', r.clicked); const tinFirst = await p.waitFor("Player.count('tin_ore')>=1", 40000); v = await look('57-tin-first-result'); out('tin before copper?', tinFirst, v.pack, 'step', v.step, v.objective); await p.waitFor('!Player.action', 30000);
await p.caveWalk(296.5, 358.5, 'copper', {maxLegs: 10}); v = await look('58-copper');
await p.clickInventory('hatchet'); r = await safeClick(FINDERS.copperRock); out('hatchet on copper', r.clicked); await sleep(2000); v = await look('59-hatchet-on-rock', {noShot: true}); out('hatchet on rock: chat', v.chat.slice(-2), 'using', v.using); await dismiss(); if (v.using) await p.clickInventory('hatchet');
await poke('copper-rock', FINDERS.copperRock, {dist: 9, pitch: 1.15});
r = await safeClick(FINDERS.copperRock); out('copper click', r.clicked); const cu = await p.waitFor("Player.count('copper_ore')>=1", 60000); v = await look('60-copper-mined'); out('copper?', cu, v.pack, 'step', v.step, v.objective); await p.waitFor('!Player.action', 30000);
if (!v.pack.some(x => /tin_ore/.test(x))){ await p.caveWalk(303.5, 373.5, 'tin', {maxLegs: 10}); r = await safeClick(FINDERS.tinRock); await p.waitFor("Player.count('tin_ore')>=1", 60000); v = await look('61-tin-mined'); out('tin?', v.pack, 'step', v.step); await p.waitFor('!Player.action', 30000); }
// furnace: pickaxe on it first, then the ores from far away, then properly
await p.caveWalk(304.5, 361.5, 'furnace', {maxLegs: 10}); v = await look('62-at-furnace'); await dump('smithy', 8);
await p.clickInventory('pickaxe'); r = await safeClick(FINDERS.furnace); await sleep(2000); v = await look('63-pickaxe-on-furnace', {noShot: true}); out('pickaxe on furnace: chat', v.chat.slice(-2), 'using', v.using); await dismiss(); if (v.using) await p.clickInventory('pickaxe');
await poke('furnace', FINDERS.furnace, {dist: 9, pitch: 1.15});
r = await safeClick(FINDERS.furnace); await sleep(1200); v = await look('64-furnace-clicked'); out('furnace dlg', v.dialogue);
if (v.dialogue){ const o = v.dialogue.options.find(x => /bronze/i.test(x)); if (o) await p.chooseDialogue(o); else await dismiss(); }
const bar = await p.waitFor('Tutorial.step>=10', 45000); v = await look('65-smelted'); out('bar?', bar, v.pack, 'step', v.step, v.objective, 'chat', v.chat.slice(-2)); await p.waitFor('!Player.action', 30000); await dismiss();
// anvil
await p.caveWalk(301.5, 361.5, 'anvil', {maxLegs: 8});
await poke('anvil', FINDERS.anvil, {dist: 9, pitch: 1.15});
r = await safeClick(FINDERS.anvil); await sleep(1200); v = await look('66-anvil-clicked'); out('anvil dlg', v.dialogue);
const grid = await p.page.evaluate(() => { const g = document.getElementById('smith-grid-overlay'); if (!g || g.style.display === 'none') return null; const items = [...g.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.trim() && e.getClientRects().length).map(e => e.textContent.trim()); return items.slice(0, 30); }); out('smith grid entries', grid);
if (v.dialogue){ const o = v.dialogue.options.find(x => /dagger/i.test(x)); if (o) await p.chooseDialogue(o); else await dismiss(); }
else { const ok = await p.page.evaluate(() => { const g = document.getElementById('smith-grid-overlay'); if (!g || g.style.display === 'none') return false; const c = [...g.querySelectorAll('*')].filter(e => /dagger/i.test(e.textContent) && e.children.length === 0 && e.getClientRects().length); if (!c.length) return false; const r = c[0].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); out('dagger cell', ok); if (ok) await p.clickAt(ok[0], ok[1]); }
const forged = await p.waitFor('Tutorial.step>=11', 45000); v = await look('67-forged'); out('forged?', forged, v.pack, 'weapon', v.weapon, 'step', v.step, v.objective, 'chat', v.chat.slice(-3));
await p.page.keyboard.press('Escape'); await p.waitFor('!Player.action', 30000); await dismiss();
// the clay offshoot (curiosity) then the exit ladder
await p.caveWalk(316, 343, 'clay offshoot', {maxLegs: 10}); v = await look('68-clay'); await dump('clay', 8);
await p.caveWalk(321.5, 355.5, 'exit ladder', {maxLegs: 12}); v = await look('69-exit-ladder');
await poke('cavern-exit', FINDERS.cavernExit, {dist: 9, pitch: 1.15, noExamine: true});
r = await safeClick(FINDERS.cavernExit); const up = await p.waitFor('(Player.plane||0)===0', 20000); await sleep(2000); v = await look('70-surfaced'); out('surfaced?', up, v.plane, v.zone, v.pos, v.objective);
