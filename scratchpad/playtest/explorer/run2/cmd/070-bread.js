const L = re => `WORLD.clickables.find(o=>o.userData&&o.userData.kind!=='door'&&/${re}/i.test(String(o.userData.label||'').replace(/<[^>]+>/g,'')))`;
const near = async (x, z, tag) => { const w = await p.walkTo(x, z, {near: 1.2}); if (!w.reached) out('walk ' + tag + ' short', w); };
const use = async (name, finder, wait) => { const r = await p.clickObject(finder, {dist: 9}); out('click ' + name, r.clicked ? r.loc.hit : r.loc); await sleep(wait || 2000); const v = await look(name); await dismiss(); return v; };
await near(139.5, 135.5, 'lodge door'); await p.clickObject(FINDERS.door('Lodge door'), {dist: 9}); await sleep(1200);
await near(144.5, 138.5, 'green door'); await near(148.5, 136.5, 'kitchen');
// read the recipe board from close by
await near(146.5, 133.5, 'board');
let v = await use('36-recipe-board', L('Recipe board'));
// the range with nothing in hand, and the flour bin with no bucket
await near(154.5, 136.5, 'range'); v = await use('37-range-empty', L('Teaching range'));
await near(157.5, 133.5, 'flour'); v = await use('38-flour-no-bucket', L('Flour bin'));
// now the bucket shelf
await near(148.5, 132.5, 'bucket shelf'); v = await use('39-bucket-1', L('^Take Bucket'));
v = await use('40-bucket-2', L('^Take Bucket'));
await near(157.5, 133.5, 'flour'); v = await use('41-flour', L('Flour bin'));
await near(157.5, 135.5, 'water'); v = await use('42-water', L('Water butt'));
// wrong item on the range: the flour
const fl = v.pack.find(x => /flour/.test(x));
if (fl){ await near(154.5, 136.5, 'range'); await p.clickInventory(fl.split(' ')[0]); const r = await p.clickObject(L('Teaching range'), {dist: 9}); out('flour on range click', r.clicked); await sleep(2000); v = await look('43-flour-on-range'); await dismiss(); }
await near(155.5, 132.5, 'dough'); v = await use('44-dough', L('Dough'));
// the kneading table
await near(150.5, 136.5, 'knead'); v = await use('45-kneading-table', L('Kneading table'));
out('pack now', v.pack);
// click each new pack item once to see what it does (a player would)
for (const id of ['flour', 'bucket_of_water', 'dough', 'bread_dough']){ if (v.pack.some(x => x.split(' ')[0] === id)){ await p.clickInventory(id); await sleep(1500); v = await look('46-pack-' + id, {noShot: true}); await dismiss(); } }
// bake whatever dough I have on the range
const dough = v.pack.find(x => /dough/.test(x));
if (dough){ await near(154.5, 136.5, 'range'); await p.clickInventory(dough.split(' ')[0]); const r = await p.clickObject(L('Teaching range'), {dist: 9}); out('dough on range', r.clicked); await p.waitFor("Player.count('bread')>0", 25000); await sleep(1000); v = await look('47-baked'); await dismiss(); }
else { await near(154.5, 136.5, 'range'); v = await use('47-range-again', L('Teaching range')); }
out('BREAD?', v.pack, v.step, v.objective);
// tinderbox on the range (wrong item)
await p.clickInventory('tinderbox'); await p.clickObject(L('Teaching range'), {dist: 9}); await sleep(2000); v = await look('48-tinderbox-on-range'); await dismiss();
