await p.page.evaluate(() => { camCtl.dist = 40; camCtl.pitch = 1.0; }); await sleep(900);
let v = await look('lastlight-plateau-wide');
await p.note('medium', 'Lastlight plateau 196,112', 'The "Relight Lastlight" arrow target is 196,112 — a bare sand tile with nothing to click; its label hangs on my feet. The Lastlight door is at 196,124, 12 tiles south, and the banner says "Climb Lastlight and pull the bronze lever". Nothing tells me where the way in is.', 'The arrow should point at the Lastlight door (then the stair, then the lever).');
let w = await p.walkTo(196.5, 125.5, {near: 1.8, maxLegs: 12}); out('walk to Lastlight door', w);
v = await look('at-lastlight-door');
out('nearby', v.nearby.slice(0, 8).map(n => n.label + '@' + n.tile + ' d' + n.dist));
// open the door if it is closed, then step inside
const doorRow = v.nearby.find(n => /Lastlight door/.test(n.label));
if (doorRow && /^Open/.test(doorRow.label)){ const c = await p.cclick(FINDERS.lastlightDoor); out('open lastlight door', c); await sleep(1200); }
w = await p.walkTo(196.5, 121.5, {near: 1.5, maxLegs: 6}); out('step inside', w);
v = await look('inside-lastlight');
out('arrow', v.arrow, 'nearby', v.nearby.slice(0, 8).map(n => n.label + '@' + n.tile + ' d' + n.dist));
