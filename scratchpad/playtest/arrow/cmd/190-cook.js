let v = await p.see();
let w = await p.walkTo(v.arrow.target[0] + 0.5, v.arrow.target[1] + 1.5, {near: 1.5}); out('walk to fire', w);
v = await look('at-fire');
const c = await p.useItemOn('raw_perch', FINDERS.campfire, {dist: 10});
out('perch on fire', c);
const cooked = await p.waitFor("Tutorial.step >= 6", 30000); out('step advanced', cooked);
await sleep(1000);
v = await look('after-cook');
