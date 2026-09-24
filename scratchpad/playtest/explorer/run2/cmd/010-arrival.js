let v = await look('01-arrival');
// right-click the ground under my feet
await p.aim(v.pos[0], v.pos[1] - 3, 14);
await p.clickAt(769, 560, 'right'); await sleep(300);
out('ground right-click rows:', await p.ctxRows()); await p.screenshot('02-ground-menu'); await closeCtx();
// poke the props on the apron
await poke('barrel', "WORLD.clickables.find(o=>o.userData&&/Barrel/i.test(String(o.userData.label||'')))");
await poke('crate', "WORLD.clickables.find(o=>o.userData&&/Crate/i.test(String(o.userData.label||'')))");
await poke('bucket', "WORLD.clickables.find(o=>o.userData&&/Bucket/i.test(String(o.userData.label||'')))");
// left-click the barrel: "Search Barrel"
await p.clickObject("WORLD.clickables.find(o=>o.userData&&/Barrel/i.test(String(o.userData.label||'')))"); await sleep(1500);
v = await look('03-after-search-barrel');
await dismiss();
// is there a Guide Bram by the rowboat? the chat says to talk to him
const bram = await p.page.evaluate(() => (WORLD.npcs||[]).filter(n => n && n.t && /bram|guide/i.test(String(n.t.name||n.name||''))).map(n => ({name: n.t.name, pos: [Math.round(n.mesh?n.mesh.position.x:n.position.x), Math.round(n.mesh?n.mesh.position.z:n.position.z)]})));
out('NPCs named bram/guide:', bram);
const npcs = await p.page.evaluate(() => (WORLD.npcs||[]).slice(0, 30).map(n => ({name: n.t && n.t.name, pos: n.mesh ? [Math.round(n.mesh.position.x), Math.round(n.mesh.position.z)] : null})));
out('NPC list:', npcs);
// the arrival door: right-click, read rows, then open it and walk in
await poke('arrival-door', FINDERS.door('Arrival door'));
await p.clickObject(FINDERS.door('Arrival door')); await sleep(1500);
v = await look('04-door-clicked');
