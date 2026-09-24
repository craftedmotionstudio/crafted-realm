let v = await p.see();
const diag = await p.page.evaluate(() => {
  const r = {pos: [player.position.x, player.position.z, player.position.y], plane: Player.plane};
  try { const q = computePath(player.position.x, player.position.z, 296, 357); r.path = {n: q.pts.length, reached: q.reached, first: q.pts.slice(0, 5), last: q.pts[q.pts.length - 1]}; } catch (e) { r.pathErr = String(e); }
  try { r.walkableHere = tileWalkable(Math.floor(player.position.x), Math.floor(player.position.z)); r.walkE = tileWalkable(Math.floor(player.position.x) + 1, Math.floor(player.position.z)); r.collidesHere = typeof collides === 'function' ? collides(player.position.x, player.position.z) : 'n/a'; } catch (e) { r.wErr = String(e); }
  try { r.groundNames = [...new Set(WORLD.ground ? [WORLD.ground.name] : [])]; } catch (e) {}
  return r;
});
out('cavern diag', diag);
// one careful ground click 3 tiles east and watch what happens
await p.aim(296.5, 357.5, 20);
const px = await p.page.evaluate(() => {
  const rect = renderer.domElement.getBoundingClientRect(); const res = [];
  for (const f of [0.3, 0.5, 0.8]){
    const wx = player.position.x + (296.5 - player.position.x) * f, wz = player.position.z + (357.5 - player.position.z) * f;
    const y = (typeof groundY === 'function' ? groundY(wx, wz) : 0) || 0; const pr = new THREE.Vector3(wx, y, wz).project(camera);
    const sx = (pr.x + 1) / 2 * rect.width, sy = (1 - pr.y) / 2 * rect.height;
    const el = document.elementFromPoint(sx, sy); const hit = pick({clientX: sx, clientY: sy});
    res.push({f, wx: +wx.toFixed(1), wz: +wz.toFixed(1), y: +y.toFixed(2), sx: Math.round(sx), sy: Math.round(sy), el: el && (el.id || el.tagName), hit: hit ? hit.obj.name : null, hitKind: hit && hit.obj.userData && hit.obj.userData.kind});
  }
  return res;
});
out('probe pixels', px);
const first = px.find(q => q.hit && /ground/.test(q.hit));
if (first){ await p.clickAt(first.sx, first.sy); await sleep(400); const st = await p.page.evaluate(() => ({moveTo: Player.moveTo && [Player.moveTo.x, Player.moveTo.z], path: Player.path && Player.path.length, partial: Player._pathPartial})); out('after click', st); await p.waitFor('!Player.moveTo', 20000); }
v = await look('cavern-step');
