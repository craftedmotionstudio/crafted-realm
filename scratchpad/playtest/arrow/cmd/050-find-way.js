await p.note('medium', 'Teaching door 151,141 → Survival Wood', 'The arrow "Chop tree" points at 126,158 (west-southwest, back past the building I just walked through). Clicking the ground toward it three times only gave "You can\'t get all the way there; walking as close as you can." — I am inside the Teaching room with walls between me and the tree.', 'The arrow should lead me through the door that actually gets me there (or the objective should say which door), instead of pointing through a wall.');
// a confused player tries the nearest door in the arrow's direction: the Green door
let v = await p.see();
const greenDoor = FINDERS.door('Green door');
let c = await p.clickObject(greenDoor, {dist: 16});
out('click green door', c);
await sleep(1500);
v = await look('green-door');
let w = await p.walkTo(145.5, 138.5, {near: 1.5});
out('walk to green door tile', w);
v = await look('at-green-door');
w = await p.walkTo(v.arrow.target[0] + 0.5, v.arrow.target[1] + 0.5, {near: 3, maxLegs: 16});
out('walk toward tree', w);
v = await look('toward-tree');
