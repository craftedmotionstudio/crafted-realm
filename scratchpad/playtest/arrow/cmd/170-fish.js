let v = await p.see();
let w = await p.walkTo(v.arrow.target[0] + 0.5, v.arrow.target[1] + 0.5, {near: 2}); out('walk to fishing arrow', w);
v = await look('at-fishing-arrow');
out('nearby here', v.nearby.slice(0, 6));
// the thing at the arrow's target
const atArrow = `(function(){const t=[${v.arrow.target[0]},${v.arrow.target[1]}];let b=null,bd=1e9;for(const o of WORLD.clickables){if(!o.userData||!o.userData.kind)continue;const w=o.getWorldPosition(new THREE.Vector3());const d=Math.hypot(w.x-t[0]-.5,w.z-t[1]-.5);if(d<bd){bd=d;b=o;}}return bd<4?b:null;})()`;
const what = await p.page.evaluate(src => { const o = eval(src); return o ? {kind: o.userData.kind, label: o.userData.label} : null; }, atArrow);
out('object at arrow', what);
const c = await p.useItemOn('fishing_net', atArrow);
out('net on spot', c);
const fish = await p.waitFor("Tutorial.step >= 5", 45000); out('fish caught / step advanced', fish);
await sleep(800);
v = await look('after-fish');
