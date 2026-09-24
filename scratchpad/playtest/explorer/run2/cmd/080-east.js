const L = re => `WORLD.clickables.find(o=>o.userData&&o.userData.kind!=='door'&&/${re}/i.test(String(o.userData.label||'').replace(/<[^>]+>/g,'')))`;
const near = async (x, z, tag, legs) => { const w = await p.walkTo(x, z, {near: 1.3, maxLegs: legs || 12}); out('walk ' + tag, w); return w; };
// bake: arm the bread dough once, click the range
await p.clickInventory('bread_dough'); await sleep(300);
let r = await p.clickObject(L('Teaching range'), {dist: 9}); out('bread dough on range', r.clicked);
await p.waitFor("Player.count('bread')>0", 25000); await sleep(800);
let v = await look('49-baked'); await dismiss();
out('BREAD?', v.pack, 'step', v.step);
// leave by the Yard door (north) and head east along the lawn
await near(150.5, 132.5, 'yard door inside');
await p.clickObject(FINDERS.door('Yard door'), {dist: 9}); await sleep(1200);
await near(150.5, 129.5, 'outside yard door');
v = await look('50-lawn');
await near(162.5, 132.5, 'east 1', 6);
await near(175.5, 136.5, 'east 2', 6);
await near(186.8, 135.5, 'mage tower door', 8);
v = await look('51-mage-tower-outside');
const kinds = await p.page.evaluate(() => (WORLD.clickables||[]).filter(o => o.userData && o.userData.kind).map(o => { const c = o.getWorldPosition(new THREE.Vector3()); return {kind: o.userData.kind, label: String(o.userData.label||'').replace(/<[^>]+>/g,''), tile: [Math.floor(c.x), Math.floor(c.z)], d: +Math.hypot(c.x - player.position.x, c.z - player.position.z).toFixed(1)}; }).filter(o => o.d < 14).sort((a,b) => a.d - b.d));
out('mage tower clickables:', kinds);
const tdoor = await p.page.evaluate(() => (WORLD.doors||[]).map(d => ({label: String(d.userData.label||'').replace(/<[^>]+>/g,''), tile: [Math.floor(d.position.x), Math.floor(d.position.z)], d: +Math.hypot(d.position.x - player.position.x, d.position.z - player.position.z).toFixed(1)})).filter(d => d.d < 12));
out('doors near:', tdoor);
if (tdoor.length){ await p.clickObject(FINDERS.door(tdoor[0].label.replace(/^(Open|Close) /, '')), {dist: 9}); await sleep(1200); }
await near(191.5, 134.5, 'tower service', 6);
v = await look('52-mage-tower-inside');
for (const [name, re] of [['rune-table', 'Rune'], ['spell-lectern', 'Lectern|Spell'], ['tower-register', 'register|Register'], ['casting', 'Cast|Practice|Target']]){
  const f = await p.page.evaluate(src => !!eval(src), L(re)); if (!f){ out('no object for', re); continue; }
  await poke(name, L(re), {dist: 9});
  r = await p.clickObject(L(re), {dist: 9}); await sleep(2000); v = await look('53-' + name); await dismiss();
}
