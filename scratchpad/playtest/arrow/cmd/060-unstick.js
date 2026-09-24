let v = await p.see();
let w = await p.walkTo(151.5, 138.5, {near: 1.2, maxLegs: 4});
out('walk north into room', w);
v = await look('try-north');
if (!w.reached){
  w = await p.walkTo(151.5, 150.5, {near: 1.2, maxLegs: 4});
  out('walk south into hall', w);
  v = await look('try-south');
}
if (!w.reached){
  w = await p.walkTo(153.5, 142.5, {near: 1.2, maxLegs: 3}); out('walk east', w);
  w = await p.walkTo(148.5, 142.5, {near: 1.2, maxLegs: 3}); out('walk west', w);
  v = await look('try-ew');
}
