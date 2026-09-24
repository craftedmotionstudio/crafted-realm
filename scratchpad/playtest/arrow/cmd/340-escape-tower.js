// trapped inside the tower: tilt and zoom the camera like a player until some floor or the door is clickable
let result = null;
for (const cam of [{dist: 3, pitch: 1.45}, {dist: 6, pitch: 1.4}, {dist: 10, pitch: 1.5}, {dist: 4, pitch: 0.3}, {dist: 16, pitch: 0.2}]){
  await p.page.evaluate(cam => { camCtl.yaw = Math.PI; camCtl.pitch = cam.pitch; camCtl.dist = cam.dist; }, cam); await sleep(800);
  const scan = await p.page.evaluate(() => {
    const rect = renderer.domElement.getBoundingClientRect(); const names = {}; let bestG = null, door = null;
    for (let sx = 60; sx < rect.width - 260; sx += 40) for (let sy = 100; sy < rect.height - 160; sy += 40){
      const el = document.elementFromPoint(sx, sy); if (!el || el !== renderer.domElement) continue;
      const hit = pick({clientX: sx, clientY: sy}); if (!hit) continue;
      const n = hit.obj.name || (hit.obj.userData && hit.obj.userData.kind) || '?'; names[n] = (names[n] || 0) + 1;
      if (hit.obj.userData && hit.obj.userData.kind === 'lighthouseDoor') door = [sx, sy];
      if (n === 'ground' || n.indexOf('ground-chunk-') === 0){ const pt = hit.point || null; if (pt){ const d = Math.hypot(pt.x - 196.5, pt.z - 126.5); if (!bestG || d < bestG.d) bestG = {sx, sy, d: +d.toFixed(1), at: [+pt.x.toFixed(1), +pt.z.toFixed(1)]}; } else if (!bestG) bestG = {sx, sy, d: 99}; }
    }
    return {names, bestG, door};
  });
  out('scan', cam, scan);
  if (scan.door){ result = {door: scan.door, cam}; break; }
  if (scan.bestG && scan.bestG.d < 6){ result = {ground: scan.bestG, cam}; break; }
}
out('result', result);
if (result && result.door){ await p.clickAt(result.door[0], result.door[1]); p.logLine('click', {what: 'lighthouse door', at: result.door}); }
else if (result && result.ground){ await p.clickAt(result.ground.sx, result.ground.sy); p.logLine('click', {what: 'ground near door', at: [result.ground.sx, result.ground.sy]}); await p.waitFor('!Player.moveTo', 30000); }
await sleep(2000);
let v = await look('after-escape-attempt');
out('state', v.plane, v.pos, v.zone, v.arrow, v.dialogue, v.chat.slice(-2));
