await p.note('low', 'Training Cavern arrival tile 286,354', 'After climbing down I appeared standing on top of a stalagmite cone (screenshot 038/039): my feet were on the spike, not the floor. It reads as a placement bug.', 'Arrive on flat cavern floor beside the ladder/shaft.');
let v = await p.see();
let w = await p.cwalk(v.arrow.target[0] + 0.5, v.arrow.target[1] - 1.5, {near: 2.5, maxLegs: 16}); out('cwalk to tin', w);
v = await look('near-tin');
let c = await p.cclick(FINDERS.tinRock); out('click tin', c);
let ok = await p.waitFor("Tutorial.step >= 9", 40000); out('tin mined', ok);
v = await look('after-tin');
out('banner now', v.objective, v.arrow);
// next lesson: follow the arrow
w = await p.cwalk(v.arrow.target[0] + 0.5, v.arrow.target[1] + 1.5, {near: 2.5, maxLegs: 16}); out('cwalk to arrow ' + v.arrow.label, w);
v = await look('at-smelt-arrow');
