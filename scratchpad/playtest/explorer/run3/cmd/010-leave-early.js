/* Run 3, stage 1: a brand-new adventurer ignores the banner and tries to leave the island first. */
const L = re => `WORLD.clickables.find(o=>o.userData&&o.userData.kind!=='door'&&/${re}/i.test(String(o.userData.label||'').replace(/<[^>]+>/g,'')))`;
// safe click: never let the click pixel land on the objective banner (a DOM button sits there)
const safeClick = async (finder, opts, right) => {
  opts = Object.assign({dist: 9, pitch: 1.15}, opts || {});
  let loc = await p.locate(finder, opts);
  if (loc.hit && loc.hit[1] < 95 && loc.hit[0] > 480 && loc.hit[0] < 1060){ out('click would land on the banner; re-aiming'); loc = await p.locate(finder, Object.assign({}, opts, {dist: 7, pitch: 1.35})); }
  if (!loc.hit){ out('safeClick miss', loc); return {clicked: false, loc}; }
  await p.clickAt(loc.hit[0], loc.hit[1], right ? 'right' : 'left'); p.logLine(right ? 'right-click' : 'click', {finder: finder.slice(0, 80), at: loc.hit});
  return {clicked: true, loc};
};
const near = async (x, z, tag, legs) => { const w = await p.walkTo(x, z, {near: 1.3, maxLegs: legs || 10}); out('walk ' + tag, w); return w; };
p.safeClick = safeClick; p.near = near;
let v = await look('01-arrival');
// through the Guide Hall without touching the chart
await safeClick(FINDERS.door('Arrival door')); await sleep(1200);
await near(151.5, 162.5, 'hall aisle'); await near(151.5, 146.5, 'north end');
await safeClick(FINDERS.door('Teaching door')); await sleep(1200);
await near(151.5, 141.5, 'corridor'); v = await look('02-corridor', {noShot: true});
await near(162.5, 141.5, 'east corridor', 6); await near(175.5, 140.5, 'east 2', 6); await near(186.5, 137.5, 'tower west door', 8);
v = await look('03-at-tower');
// Lastlight early: the door at (196,124)
await near(193.5, 130.5, 'lastlight approach', 8); v = await look('04-lastlight-approach');
let r = await safeClick(FINDERS.lastlightDoor, {}, true); await sleep(300); out('lastlight door rows', await p.ctxRows()); await p.screenshot('05-lastlight-menu'); await closeCtx();
r = await safeClick(FINDERS.lastlightDoor); await sleep(2500); v = await look('06-lastlight-door-early');
out('lastlight early: plane', v.plane, 'zone', v.zone, 'chat', v.chat.slice(-2)); await dismiss();
if (v.plane === 1){
  const l1 = await safeClick("WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&o.userData.plane===1&&/ground-floor ladder/.test(String(o.userData.label||'')))");
  await p.waitFor('(Player.plane||0)===2', 15000); await sleep(1000);
  const l2 = await safeClick("WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&o.userData.plane===2&&/upper ladder/.test(String(o.userData.label||'')))");
  await p.waitFor('(Player.plane||0)===3', 15000); await sleep(1000);
  v = await look('07-lantern-room-early');
  r = await safeClick(FINDERS.lever, {}, true); await sleep(300); out('lever rows', await p.ctxRows()); await closeCtx();
  r = await safeClick(FINDERS.lever); await sleep(2000); v = await look('08-lever-early'); out('lever early: step', v.step, 'chat', v.chat.slice(-2), 'dlg', v.dialogue); await dismiss();
  for (const [pl, re] of [[3, /lower ladder/], [2, /lower ladder/], [1, /Exit/]]){
    if ((await p.see()).plane !== pl) continue;
    await safeClick(`WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&o.userData.plane===${pl}&&${re}.test(String(o.userData.label||'')))`);
    await p.waitFor(`(Player.plane||0)===${pl - 1}`, 15000); await sleep(800);
  }
  v = await look('09-back-outside', {noShot: true});
}
// to the dock via the tower (west door -> dock door)
await near(186.5, 135.5, 'tower door', 8); await safeClick(FINDERS.door('Tower door|Mage door|door')); await sleep(1000);
const doors = await p.page.evaluate(() => (WORLD.doors||[]).map(d => ({label: String(d.userData.label||'').replace(/<[^>]+>/g,''), tile: [Math.floor(d.position.x), Math.floor(d.position.z)], d: +Math.hypot(d.position.x - player.position.x, d.position.z - player.position.z).toFixed(1)})).filter(d => d.d < 8)); out('doors', doors);
await near(189.5, 136.5, 'inside tower', 6); await safeClick(FINDERS.door('Dock door')); await sleep(1000);
await near(191.5, 141.5, 'outside dock door', 6); await near(193.5, 150.5, 'road', 8); await near(205.5, 151.5, 'dock', 8);
v = await look('10-dock-early');
r = await safeClick(FINDERS.skiff, {}, true); await sleep(300); out('boat rows', await p.ctxRows()); await p.screenshot('11-boat-menu'); await closeCtx();
r = await safeClick(FINDERS.skiff); await sleep(2500); v = await look('12-boat-early');
out('BOAT EARLY: zone', v.zone, 'pos', v.pos, 'chat', v.chat.slice(-3), 'dlg', v.dialogue); await dismiss();
// far click: stand back on the road and click the boat from there
await near(196.5, 150.5, 'far from boat', 6);
r = await safeClick(FINDERS.skiff, {dist: 20, pitch: 0.9}); await sleep(3500); v = await look('13-boat-far-click'); out('far click: pos', v.pos, 'chat', v.chat.slice(-2)); await dismiss();
