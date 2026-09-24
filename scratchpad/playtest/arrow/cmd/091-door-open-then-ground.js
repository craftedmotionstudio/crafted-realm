const doorFinder = "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='door'&&Math.hypot(o.getWorldPosition(new THREE.Vector3()).x-152,o.getWorldPosition(new THREE.Vector3()).z-143)<2)";
let v = await p.see();
let doorRow = v.nearby.find(n => /Door@152,143/.test(n.label + '@' + n.tile));
out('door label now', doorRow && doorRow.label);
if (doorRow && /^Open/.test(doorRow.label)){ const c = await p.clickObject(doorFinder, {dist: 10}); out('opened door', c.clicked); await sleep(1200); }
v = await p.see(); doorRow = v.nearby.find(n => /Door@152,143/.test(n.label + '@' + n.tile)); out('door label after', doorRow && doorRow.label);
let info = await p.page.evaluate(() => { const r = {pos: [player.position.x, player.position.z]}; try { r.path_n = computePath(Math.floor(player.position.x), Math.floor(player.position.z), 151, 139); } catch (e) { r.err = String(e); } return r; });
out('path north with door open?', info);
await p.aim(151.5, 136.5, 20);
const px = await p.page.evaluate(() => {
  const rect = renderer.domElement.getBoundingClientRect();
  for (const wz of [139.5, 140.5, 138.5, 137.5]){
    const y = groundY(151.5, wz) || 0; const pr = new THREE.Vector3(151.5, y, wz).project(camera);
    const sx = (pr.x + 1) / 2 * rect.width, sy = (1 - pr.y) / 2 * rect.height;
    const hit = pick({clientX: sx, clientY: sy});
    if (hit && (hit.obj.name === 'ground' || hit.obj.name.indexOf('ground-chunk-') === 0)) return {sx: Math.round(sx), sy: Math.round(sy), wz};
    if (hit) return {miss: hit.obj.name, wz, kind: hit.obj.userData && hit.obj.userData.kind};
  }
  return null;
});
out('ground pixel north', px);
if (px && px.sx){ await p.clickAt(px.sx, px.sy); await p.waitFor('!Player.moveTo', 20000); await sleep(300); }
v = await look('ground-north');
