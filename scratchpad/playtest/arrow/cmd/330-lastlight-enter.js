await p.note('high', 'Lastlight tower body, tiles within ~10 of 196,112', 'Following the arrow walked me straight into the solid lighthouse: the summit plateau is walkable across the whole tower footprint, so I stood inside the stone at 196,120 (screenshots 059/062 show blank pale walls all round and the door seen from the inside). Read-only check: groundY is 14 from 196,112 to 196,124 and no interior is registered here.', 'The tower footprint should be blocked (door only), and the arrow should target the door threshold 196.5,124.65.');
let w = await p.walkTo(196.5, 125.5, {near: 1.2, maxLegs: 8}); out('walk to door threshold', w);
let v = await look('door-threshold');
let c = await p.cclick(FINDERS.lastlightDoor); out('click lastlight door', c);
await sleep(2500);
v = await look('lastlight-door-clicked');
out('state', v.plane, v.pos, v.zone, v.arrow, v.dialogue, v.chat.slice(-2), v.nearby.slice(0, 6).map(n => n.label + '@' + n.tile + ' d' + n.dist));
