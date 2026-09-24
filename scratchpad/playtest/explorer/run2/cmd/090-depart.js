// the writ says: switchback down from Lastlight, road south to the dock. I am in the Mage Tower; leave by the Dock door.
await p.clickObject(FINDERS.door('Dock door'), {dist: 9, pitch: 1.2}); await sleep(1200);
let w = await p.walkTo(191.5, 141.5, {near: 1.3}); out('walk out dock door', w);
w = await p.walkTo(193.5, 150.5, {near: 1.3, maxLegs: 8}); out('walk road', w);
w = await p.walkTo(205.5, 151.5, {near: 1.3, maxLegs: 8}); out('walk dock', w);
let v = await look('54-dock');
const kinds = await p.page.evaluate(() => (WORLD.clickables||[]).filter(o => o.userData && o.userData.kind).map(o => { const c = o.getWorldPosition(new THREE.Vector3()); return {kind: o.userData.kind, label: String(o.userData.label||'').replace(/<[^>]+>/g,''), tile: [Math.floor(c.x), Math.floor(c.z)], d: +Math.hypot(c.x - player.position.x, c.z - player.position.z).toFixed(1)}; }).filter(o => o.d < 14).sort((a,b) => a.d - b.d));
out('dock clickables:', kinds);
// walk to the water's edge past the dock and right-click the water
w = await p.walkTo(211.5, 154.5, {near: 1.0, maxLegs: 4}); out('water edge walk', w);
v = await look('55-water-edge');
await p.aim(214, 156, 12); await p.clickAt(769, 300, 'right'); await sleep(300); out('water right-click rows', await p.ctxRows()); await p.screenshot('56-water-menu'); await closeCtx();
// the skiff
const r = await poke('skiff', FINDERS.skiff, {dist: 10, pitch: 1.2});
await p.clickObject(FINDERS.skiff, {dist: 10, pitch: 1.2}); await sleep(1500);
v = await look('57-skiff-clicked');
if (v.dialogue){ out('SKIFF DLG', v.dialogue); const o = v.dialogue.options.find(x => /board|sail|mainland|yes|go/i.test(x)); if (o) await p.chooseDialogue(o); }
const sailed = await p.waitFor("typeof CRWorldMode!=='undefined'&&CRWorldMode.providerId!=='tutors-holm-v2'", 60000);
await sleep(4000);
v = await look('58-after-skiff');
out('SAILED?', sailed, v.zone, v.provider, v.pos, v.chat.slice(-4));
await dismiss();
v = await look('59-mainland-final');
// EXIT
