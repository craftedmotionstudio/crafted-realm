const geo = await p.page.evaluate(() => {
  const r = {pos: [player.position.x, player.position.y, player.position.z], groundY: groundY(player.position.x, player.position.z), plane: Player.plane};
  try { const d = WORLD.clickables.find(o => o.userData && o.userData.kind === 'lighthouseDoor'); if (d){ const w = d.getWorldPosition(new THREE.Vector3()); r.door = {tile: [w.x, w.z], y: w.y, ud: Object.assign({}, d.userData)}; } } catch (e) { r.doorErr = String(e); }
  try { r.interiorHere = (WORLD.interiors || []).filter(it => Math.abs(player.position.x - it.x) < it.hw && Math.abs(player.position.z - it.z) < it.hd).map(it => ({b: it.buildingId, x: it.x, z: it.z, hw: it.hw, hd: it.hd})); } catch (e) {}
  try { r.beacon = HolmLandscape.lastlightBeacon; } catch (e) {}
  try { r.gy = {}; for (const [x, z] of [[196,112],[196,118],[196,122],[196,124],[196,126],[196,130],[190,124],[202,124]]) r.gy[x+','+z] = +groundY(x+.5, z+.5).toFixed(2); } catch (e) {}
  return r;
});
out('geometry', geo);
await p.page.evaluate(() => { camCtl.yaw = Math.PI; camCtl.pitch = 0.35; camCtl.dist = 30; }); await sleep(900);
let v = await look('lastlight-side-view');
await p.page.evaluate(() => { camCtl.yaw = 0; camCtl.pitch = 0.35; camCtl.dist = 30; }); await sleep(900);
v = await look('lastlight-side-view-2');
