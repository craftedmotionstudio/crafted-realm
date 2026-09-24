await p.note('critical', 'Guide Hall Teaching door (north, 151,143) outside tiles 150-151,142', 'Read-only inspection (tileWalkable grid): the two tiles outside the Teaching door form a sealed pen — 149,142 and 152,142 are blocked and the whole row z=141 from x=146 to 154 is the Teaching kitchen wall. computePath from the pen reaches only itself and the hall. The guidance system picks this door as the authored exit for "Chop tree", so the arrow leads every player into a dead end.', 'The Teaching door should open onto ground connected to Survival Wood (or the arrow should choose the Arrival door).');
await p.note('high', 'Guide Hall — workaround', 'To continue I had to ignore the arrow, go back through the hall and leave by the south Arrival door, then walk around the outside of the hall to the tree. A player would not know this; the banner/arrow never mention the Arrival door.', 'The arrow should lead by a door that actually connects.');
let w = await p.walkTo(151.5, 150.5, {near: 1.2}); out('back to hall', w);
w = await p.walkTo(151.5, 168.5, {near: 1.5, maxLegs: 8}); out('out the arrival door', w);
let v = await look('outside-south');
w = await p.walkTo(127.5, 158.5, {near: 2.5, maxLegs: 16}); out('to tree', w);
v = await look('at-tree-target');
