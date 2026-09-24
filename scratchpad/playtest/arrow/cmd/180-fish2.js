await p.note('medium', 'Survival Wood pond, arrow target 132,156', 'The "Catch a fish" arrow points at 132,156 — a grass tile on the shore with nothing to click; the label hangs on my own feet. The actual net-fishing spot ("Net-fish Mirrorperch", bubbles) is at 131,150, six tiles away by the dock. With the net armed I waited 45 s at the arrow with nothing to click.', 'The arrow should sit on the bubbling fishing spot itself.');
let v = await p.see();
if (v.usingItem !== 'fishing_net') await p.clickInventory('fishing_net');
const c = await p.clickObject(FINDERS.fishingEdge, {dist: 14});
out('click fishing spot with net', c);
const fish = await p.waitFor("Tutorial.step >= 5", 45000); out('step advanced', fish);
await sleep(800);
v = await look('after-fish');
