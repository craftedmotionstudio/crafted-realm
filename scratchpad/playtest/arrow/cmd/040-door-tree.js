let v = await p.see();
out('arrow', v.arrow);
let w = await p.walkTo(v.arrow.target[0] + 0.5, v.arrow.target[1] + 0.5, {near: 1.5});
out('walk to door', w);
v = await look('at-teaching-door');
// if the arrow moved on, follow it again
if (v.arrow && (Math.abs(v.arrow.target[0] - 151) > 1 || Math.abs(v.arrow.target[1] - 141) > 1)){
  w = await p.walkTo(v.arrow.target[0] + 0.5, v.arrow.target[1] + 0.5, {near: 2.5});
  out('walk to next arrow target', w);
  v = await look('at-next-target');
} else {
  // still pointing at the door: walk through it northwards
  w = await p.walkTo(151.5, 137.5, {near: 1.5});
  out('walk north of door', w);
  v = await look('north-of-door');
  if (v.arrow){ w = await p.walkTo(v.arrow.target[0] + 0.5, v.arrow.target[1] + 0.5, {near: 2.5}); out('walk to arrow', w); v = await look('at-arrow'); }
}
