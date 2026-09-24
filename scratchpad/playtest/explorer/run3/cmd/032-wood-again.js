/* Run 3, stage 3b: the wood stage, run again now that I am back on the surface (030 ran while I was stuck underground). */
const L = re => `WORLD.clickables.find(o=>o.userData&&o.userData.kind!=='door'&&/${re}/i.test(String(o.userData.label||'').replace(/<[^>]+>/g,'')))`;
const {safeClick, near, dump, tryStation, openDoor, doorsNear} = p;
let v = await look('32-stage3-start', {noShot: true});
if (v.plane === -1 && false){
  // I fell into the cavern early: look around, then climb back out by the exit ladder
  await dump('cavern early', 20);
  await near(322, 354, 'cavern exit', 12); await safeClick(FINDERS.cavernExit); await p.waitFor('(Player.plane||0)===0', 20000); await sleep(1500);
  v = await look('33-surfaced-early');
  await near(169.5, 125.5, 'hall exit', 8); await near(145.5, 126.5, 'road west', 8); await near(133.5, 121.5, 'gatehouse', 8);
}
// leave the gatehouse by its east door and go north-west to Survival Wood
await near(169.5, 125.5, 'hall exit', 8); await near(145.5, 126.5, 'road west', 8); await near(133.5, 121.5, 'gatehouse', 8); await near(128.5, 126.5, 'road', 8); await near(128.5, 137.5, 'road n', 8); await near(128.5, 146.5, 'wood south', 8);
v = await look('34-survival-approach'); await dump('survival', 16);
const ds = await doorsNear(10); out('doors', ds);
// the pond and the water pulley first (the arrow is ignored)
await tryStation('35-water-pulley', 'Water pulley');
await poke('fishing-edge-nonet', L('Net-fish'), {dist: 9, pitch: 1.15, noExamine: true});
let r = await safeClick(L('Net-fish')); await sleep(2500); v = await look('36-fish-no-net'); out('fish without net: chat', v.chat.slice(-2)); await dismiss();
// into the shelter: trail door / pond door
await near(121, 150, 'shelter exit tile', 8); v = await look('37-shelter-outside'); const ds2 = await doorsNear(8); out('doors', ds2);
for (const d of ds2.slice(0, 1)) await openDoor(d.label.replace(/^(Open|Close) /, ''));
await near(112, 152, 'shelter service', 8); v = await look('38-shelter-inside'); await dump('shelter', 10);
await tryStation('39-net-rack', 'Net rack|net');
await tryStation('40-survival-tools', 'Survival tools|tool');
await tryStation('41-firemaking-board', 'Firemaking|board');
await tryStation('42-hearth', 'hearth|fireplace');
// chop a marked tree with no hatchet in the pack
await near(121, 150, 'out', 8); await near(128.5, 158.5, 'trees', 8); v = await look('43-at-trees');
await poke('marked-tree', FINDERS.markedTree, {dist: 9, pitch: 1.15});
r = await safeClick(FINDERS.markedTree); await sleep(3000); v = await look('44-chop-no-hatchet'); out('chop without hatchet: chat', v.chat.slice(-2), 'pack', v.pack); await dismiss();
// now go and study the chart (arrival door), and wield the hatchet at the chart
await near(138.5, 170.5, 'apron west', 10); await near(146.5, 170.5, 'apron', 6); await near(151.5, 168.5, 'door', 6);
await openDoor('Arrival door'); await near(151.5, 158.5, 'chart', 6);
r = await safeClick(FINDERS.reliefChart); out('chart click', r.clicked); await p.waitFor('Tutorial.step>=1', 15000); await sleep(800);
v = await look('45-chart-studied'); out('after chart: step', v.step, 'pack', v.pack, 'dlg', v.dialogue && v.dialogue.text.slice(0, 120)); await dismiss();
// read the objective: "Open your pack and wield the Bronze hatchet" — do it here, far from the wood
await p.clickInventory('hatchet'); await p.waitFor('Tutorial.step>=2', 10000); await sleep(500);
v = await look('46-hatchet-wielded', {noShot: true}); out('after hatchet: step', v.step, 'weapon', v.weapon, 'objective', v.objective, 'arrow', v.arrow);
// wrong item: the tinderbox on the chart
await p.clickInventory('tinderbox'); r = await safeClick(FINDERS.reliefChart); await sleep(1500); v = await look('47-tinderbox-on-chart', {noShot: true}); out('tinderbox on chart: chat', v.chat.slice(-2), 'using', v.using); await dismiss();
if (v.using) await p.clickInventory('tinderbox');
// back to the wood: chop, and click the tree AGAIN while the first chop is in progress
await near(151.5, 168.5, 'door', 6); await near(146.5, 170.5, 'apron', 6); await near(138.5, 170.5, 'apron west', 8); await near(128.5, 160.5, 'trees', 10);
r = await safeClick(FINDERS.markedTree); out('chop click', r.clicked); await sleep(1500);
r = await safeClick(FINDERS.markedTree, {keepCamera: true}); out('second chop click during chop', r.clicked);
const got = await p.waitFor("Player.count('logs')>=1", 60000); v = await look('48-chopped'); out('logs?', got, v.pack, 'step', v.step, v.objective);
await p.waitFor('!Player.action', 30000);
// the objective says: use the tinderbox on the logs
await p.clickInventory('tinderbox'); await p.clickInventory('logs'); const lit = await p.waitFor('Tutorial.step>=4', 20000); await sleep(1000);
v = await look('49-fire'); out('fire lit?', lit, 'step', v.step, v.objective, 'chat', v.chat.slice(-3));
// fish: the net at the marked spot
await near(131.5, 152.5, 'pond', 8);
await p.clickInventory('fishing_net'); r = await safeClick(L('Net-fish')); out('net on edge', r.clicked);
const fished = await p.waitFor("Player.count('raw_perch')>0", 60000); v = await look('50-fished'); out('fish?', fished, v.pack, 'step', v.step);
await p.waitFor('!Player.action', 30000);
// cook: is the fire still there?
let fire = await p.page.evaluate(() => (WORLD.clickables||[]).some(o => o.userData && o.userData.kind === 'fire' && o.parent));
out('fire still burning?', fire);
if (!fire){ await p.note('medium', 'Survival Wood fire', 'The fire had burnt out by the time I came back from the pond with a fish; objective says "light another if it has burnt out"', 'One fire should last long enough for one cast at the pond 8 tiles away'); await near(128.5, 158.5, 'trees', 8); r = await safeClick(FINDERS.markedTree); await p.waitFor("Player.count('logs')>=1", 60000); await p.waitFor('!Player.action', 30000); await p.clickInventory('tinderbox'); await p.clickInventory('logs'); await sleep(3000); }
await p.clickInventory('raw_perch'); r = await safeClick(FINDERS.campfire); out('fish on fire', r.clicked);
const cooked = await p.waitFor('Tutorial.step>=6', 25000); v = await look('51-cooked'); out('cooked?', cooked, v.pack, 'step', v.step, v.objective, 'chat', v.chat.slice(-3));
