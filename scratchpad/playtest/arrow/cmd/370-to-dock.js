let v = await look('after-lever-state');
out('where am I', v.plane, v.zone, v.pos, v.arrow, v.nearby.slice(0, 6).map(n => n.kind + ':' + n.label + '@' + n.tile + ' d' + n.dist));
// if still up the tower, climb down the way I came
for (let i = 0; i < 4 && v.plane > 0; i++){
  const down = v.nearby.find(n => n.kind === 'climb' && /down|Exit/i.test(n.label));
  if (!down){ out('no way down seen'); break; }
  if (down.dist > 2.5){ const w = await p.cwalk(down.tile[0] + 0.5, down.tile[1] + 1.5, {near: 2, maxLegs: 8}); out('cwalk to ' + down.label, w); }
  const f = `WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&/${down.label.replace(/[^a-zA-Z' -]/g, '')}/.test(String(o.userData.label||'')))`;
  const c = await p.cclick(f); out('click ' + down.label, c);
  const pl = v.plane; await p.waitFor(`(Player.plane||0) !== ${pl}`, 15000); await sleep(1200);
  v = await look('descend-' + i); out('now', v.plane, v.zone, v.pos);
}
let lastTarget = null;
for (let i = 0; i < 8 && !v.tutorialComplete && v.zone !== 'Veyhollow Commons'; i++){
  if (!v.arrow || !v.arrow.target) break;
  const tgt = v.arrow.target;
  if (lastTarget && tgt[0] === lastTarget[0] && tgt[1] === lastTarget[1]) break;
  lastTarget = tgt;
  const w = await p.walkTo(tgt[0] + 0.5, tgt[1] + 0.5, {near: 2.5, maxLegs: 30}); out('walk to arrow "' + v.arrow.label + '" ' + tgt, w);
  v = await look('dock-leg-' + i);
  out('now', v.arrow, v.pos, v.plane, v.zone, v.nearby.slice(0, 6).map(n => n.kind + ':' + n.label + '@' + n.tile + ' d' + n.dist));
}
