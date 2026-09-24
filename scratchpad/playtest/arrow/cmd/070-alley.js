let v = await p.see();
let w = await p.walkTo(151.5, 142.5, {near: 0.8, maxLegs: 3}); out('back to doorway', w);
for (const t of [[151.5, 140.5], [148.5, 142.5], [154.5, 142.5], [151.5, 141.5]]){
  w = await p.walkTo(t[0], t[1], {near: 0.8, maxLegs: 2}); out('step to ' + t, w);
}
v = await look('alley-tests');
// what does the game think? (read-only, to explain the finding)
const info = await p.page.evaluate(() => {
  const r = {};
  try { r.doors = WORLD.doors.map(d => ({label: d.userData.label, open: d.userData.open, tile: [Math.floor(d.position.x), Math.floor(d.position.z)]})).filter(d => Math.hypot(d.tile[0]-151, d.tile[1]-142) < 8); } catch (e) { r.doorsErr = String(e); }
  try { r.blocked = {}; for (const [x, z] of [[151,141],[151,140],[151,139],[151,138],[150,142],[149,142],[152,142],[153,142]]) r.blocked[x+','+z] = typeof collides === 'function' ? !!collides(x+0.5, z+0.5) : 'n/a'; } catch (e) { r.blockedErr = String(e); }
  return r;
});
out('engine read', info);
