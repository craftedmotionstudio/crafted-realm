let v = await p.see();
let w = await p.walkTo(v.arrow.target[0] + 0.5, v.arrow.target[1] + 0.5, {near: 2.5, maxLegs: 12}); out('walk to copper arrow', w);
v = await look('at-copper');
let c = await p.clickObject(FINDERS.copperRock, {dist: 12}); out('click copper rock', c);
let ok = await p.waitFor("Tutorial.step >= 8", 40000); out('copper mined', ok);
v = await look('after-copper');
if (!ok){ out('chat', v.chat); await p.clickInventory('pickaxe'); await sleep(800); v = await look('pick-clicked'); c = await p.clickObject(FINDERS.copperRock, {dist: 12}); ok = await p.waitFor("Tutorial.step >= 8", 40000); out('copper mined after wield', ok); v = await look('after-copper-2'); }
