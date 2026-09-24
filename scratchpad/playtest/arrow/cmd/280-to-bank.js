let v = await p.see();
let w = await p.cwalk(v.arrow.target[0] - 1.5, v.arrow.target[1] + 0.5, {near: 2.5, maxLegs: 16}); out('cwalk to exit ladder', w);
v = await look('at-exit-ladder');
let c = await p.cclick(FINDERS.cavernExit); out('click cavern exit', c);
let up = await p.waitFor("(Player.plane||0) === 0", 20000); out('back on surface', up);
await sleep(1500);
v = await look('surface-again');
out('banner', v.objective, v.arrow, v.pos, v.zone);
// follow the arrow, re-reading at every stop, until it stops moving or the bank step completes
let lastTarget = null;
for (let i = 0; i < 8 && v.stepId === 'open_bank'; i++){
  if (!v.arrow) break;
  const tgt = v.arrow.target;
  if (lastTarget && tgt[0] === lastTarget[0] && tgt[1] === lastTarget[1]) break;
  lastTarget = tgt;
  w = await p.walkTo(tgt[0] + 0.5, tgt[1] + 0.5, {near: 2, maxLegs: 24}); out('walk to arrow "' + v.arrow.label + '" ' + tgt, w);
  v = await look('bank-leg-' + i);
  out('now', v.objective.slice(0, 40), v.arrow, v.pos, v.zone, v.nearby.slice(0, 4).map(n => n.label + '@' + n.tile));
}
