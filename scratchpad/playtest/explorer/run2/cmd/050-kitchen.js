const L = re => `WORLD.clickables.find(o=>o.userData&&o.userData.kind!=='door'&&/${re}/i.test(String(o.userData.label||'').replace(/<[^>]+>/g,'')))`;
// --- repro A: right-click the Green door, press Escape, do nothing else, watch what happens
let v = await look('20-before-reproA', {noShot: true});
let r = await p.rightClickObject(FINDERS.door('Green door'), {dist: 12}); out('reproA right-click hit', r.clicked, r.loc && r.loc.hit);
await sleep(300); out('reproA rows', await p.ctxRows());
await p.page.keyboard.press('Escape'); await sleep(300);
out('reproA ctx open after Escape?', (await p.see()).ctxOpen);
await sleep(4000);
v = await look('21-after-reproA');
out('reproA result: pos', v.pos, 'chat', v.chat.slice(-2), 'nearby door', v.nearby.filter(n => /door/i.test(n.label)).map(n => n.label + '@' + n.tile));
// --- repro B: right-click the Green door again, then left-click the ground away from it
r = await p.rightClickObject(FINDERS.door('Green door'), {dist: 12, keepCamera: true}); await sleep(300);
out('reproB rows', await p.ctxRows());
await p.clickAt(400, 700); await sleep(300);
out('reproB ctx open after ground click?', (await p.see()).ctxOpen);
await sleep(4000);
v = await look('22-after-reproB');
out('reproB result: pos', v.pos, 'chat', v.chat.slice(-2), 'nearby door', v.nearby.filter(n => /door/i.test(n.label)).map(n => n.label + '@' + n.tile));
// --- now into the kitchen like a player
let w = await p.walkTo(144.5, 138.5, {near: 1.5}); out('walk to green door', w);
await p.clickObject(FINDERS.door('Green door'), {dist: 12}); await sleep(1500);
w = await p.walkTo(150.5, 137.5, {near: 1.5}); out('walk in kitchen', w);
v = await look('23-kitchen');
const kinds = await p.page.evaluate(() => (WORLD.clickables||[]).filter(o => o.userData && o.userData.kind).map(o => { const c = o.getWorldPosition(new THREE.Vector3()); return {kind: o.userData.kind, label: String(o.userData.label||'').replace(/<[^>]+>/g,''), tile: [Math.floor(c.x), Math.floor(c.z)], d: +Math.hypot(c.x - player.position.x, c.z - player.position.z).toFixed(1)}; }).filter(o => o.d < 12).sort((a,b) => a.d - b.d));
out('kitchen clickables:', kinds);
await poke('recipe-board', L('Recipe board'));
await p.clickObject(L('Recipe board'), {dist: 12}); await sleep(1800); v = await look('24-recipe-board'); await dismiss();
await poke('range-empty', L('Teaching range'), {noExamine: true});
await p.clickObject(L('Teaching range'), {dist: 12}); await sleep(2500); v = await look('25-range-nothing'); await dismiss();
await poke('flour-bin-nobucket', L('Flour'), {noExamine: true});
await p.clickObject(L('Flour'), {dist: 12}); await sleep(2500); v = await look('26-flour-nobucket'); await dismiss();
await poke('kneading-table', L('Kneading table'));
await poke('cooling-rack', L('Cooling rack'));
