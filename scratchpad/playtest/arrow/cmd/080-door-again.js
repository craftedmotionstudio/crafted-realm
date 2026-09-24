// the door beside me now says "Open Door" — click it like a player would, then try north again
let c = await p.clickObject("WORLD.clickables.find(o=>o.userData&&o.userData.kind==='door'&&Math.hypot(o.getWorldPosition(new THREE.Vector3()).x-152,o.getWorldPosition(new THREE.Vector3()).z-143)<2)", {dist: 10});
out('click door', c);
await sleep(1200);
let v = await look('door-clicked');
let w = await p.walkTo(151.5, 139.5, {near: 0.8, maxLegs: 3}); out('north again', w);
v = await look('north-again');
const info = await p.page.evaluate(() => {
  const r = {pos: [player.position.x, player.position.z]};
  try { r.path_n = computePath(Math.floor(player.position.x), Math.floor(player.position.z), 151, 139); } catch (e) { r.pathErr = String(e); }
  try { r.path_tree = (computePath(Math.floor(player.position.x), Math.floor(player.position.z), 127, 158) || []).length; } catch (e) { r.pathErr2 = String(e); }
  try { r.doorsAll = WORLD.doors.length; r.doorsNear = WORLD.doors.map(d => { const w = d.getWorldPosition(new THREE.Vector3()); return {label: d.userData.label, open: d.userData.open, isOpen: d.userData.isOpen, tile: [Math.floor(w.x), Math.floor(w.z)]}; }).filter(d => Math.hypot(d.tile[0]-151, d.tile[1]-142) < 8); } catch (e) { r.doorsErr = String(e); }
  return r;
});
out('engine read', info);
