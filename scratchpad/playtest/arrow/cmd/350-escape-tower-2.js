let best = null, doorHit = null;
for (const cam of [{dist: 5, pitch: 1.5}, {dist: 7, pitch: 1.5}, {dist: 9, pitch: 1.5}, {dist: 12, pitch: 1.5}, {dist: 7, pitch: 1.2}, {dist: 9, pitch: 1.0}, {dist: 6, pitch: 0.6}]){
  await p.page.evaluate(cam => { camCtl.yaw = Math.PI; camCtl.pitch = cam.pitch; camCtl.dist = cam.dist; }, cam); await sleep(700);
  const scan = await p.page.evaluate(() => {
    const rect = renderer.domElement.getBoundingClientRect(); const names = {}; let bestG = null, door = null;
    for (let sx = 40; sx < rect.width - 250; sx += 24) for (let sy = 95; sy < rect.height - 150; sy += 24){
      const el = document.elementFromPoint(sx, sy); if (!el || el !== renderer.domElement) continue;
      const hit = pick({clientX: sx, clientY: sy}); if (!hit) continue;
      const n = hit.obj.name || (hit.obj.userData && hit.obj.userData.kind) || '?'; names[n] = (names[n] || 0) + 1;
      if (hit.obj.userData && hit.obj.userData.kind === 'lighthouseDoor') door = [sx, sy];
      if ((n === 'ground' || n.indexOf('ground-chunk-') === 0) && hit.point){ const d = Math.hypot(hit.point.x - 196.5, hit.point.z - 126); if (!bestG || d < bestG.d) bestG = {sx, sy, d: +d.toFixed(1), at: [+hit.point.x.toFixed(1), +hit.point.z.toFixed(1)]}; }
    }
    return {names, bestG, door};
  });
  out('scan', cam, scan.names, scan.bestG, scan.door);
  if (scan.door && !doorHit) doorHit = {at: scan.door, cam};
  if (scan.bestG && (!best || scan.bestG.d < best.d)) best = Object.assign({cam}, scan.bestG);
}
out('best ground', best, 'door', doorHit);
const use = doorHit || (best && best.d < 3 ? best : null);
if (use){
  await p.page.evaluate(cam => { camCtl.yaw = Math.PI; camCtl.pitch = cam.pitch; camCtl.dist = cam.dist; }, use.cam); await sleep(700);
  const at = use.at && use.sx === undefined ? use.at : [use.sx, use.sy];
  await p.clickAt(at[0], at[1]); p.logLine('click', {what: doorHit ? 'lighthouse door' : 'ground by door', at});
  await p.waitFor('!Player.moveTo', 30000); await sleep(1500);
}
let v = await look('after-escape-2');
out('state', v.plane, v.pos, v.zone, v.arrow, v.dialogue, v.chat.slice(-2));
