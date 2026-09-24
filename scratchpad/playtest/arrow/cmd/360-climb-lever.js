let v = await look('lastlight-ground-floor');
out('nearby', v.nearby.slice(0, 10).map(n => n.kind + ':' + n.label + '@' + n.tile + ' d' + n.dist));
for (let i = 0; i < 6 && v.stepId === 'relight_lastlight'; i++){
  const lever = v.nearby.find(n => n.kind === 'lever' || /lever/i.test(n.label));
  if (lever){
    out('lever seen', lever);
    if (lever.dist > 3){ const w = await p.cwalk(lever.tile[0] + 0.5, lever.tile[1] + 1.5, {near: 2, maxLegs: 8}); out('cwalk to lever', w); }
    const c = await p.cclick(FINDERS.lever); out('click lever', c);
    const done = await p.waitFor("Tutorial.step >= 13", 20000); out('lever pulled / step advanced', done);
    await sleep(1500); v = await look('after-lever-' + i); out('state', v.objective, v.arrow, v.plane, v.zone, v.chat.slice(-3));
    if (done) break;
    continue;
  }
  const up = v.nearby.find(n => n.kind === 'climb' && /up|stair/i.test(n.label));
  if (!up){ out('no lever and no stair in view', v.nearby.slice(0, 10)); break; }
  out('climb seen', up);
  const plane0 = v.plane;
  if (up.dist > 3){ const w = await p.cwalk(up.tile[0] + 0.5, up.tile[1] + 0.5, {near: 2.5, maxLegs: 8}); out('cwalk to stair', w); }
  const climbFinder = `WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&String(o.userData.label||'')==="${up.label.replace(/"/g, '')}")`;
  let c = await p.cclick(climbFinder); out('click stair', c);
  if (!c.clicked){ c = await p.cclick(FINDERS.ladderUp); out('click ladderUp', c); }
  const moved = await p.waitFor(`(Player.plane||0) !== ${plane0}`, 15000); out('plane changed', moved);
  await sleep(1500);
  v = await look('lastlight-floor-' + i);
  out('now', v.plane, v.zone, v.pos, v.nearby.slice(0, 8).map(n => n.kind + ':' + n.label + '@' + n.tile + ' d' + n.dist));
}
