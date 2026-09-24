let v = await p.see();
await p.note('medium', 'Lastlight Lantern Room lever 199,111', 'After pulling the lever I was dropped to plane 0 at the same spot (199.5,112.5) — inside the solid lighthouse body again — while the zone label still read "Lastlight Lantern Room". No "you climb down" message; I simply fell through the floors.', 'Stay in the lantern room and walk down (or an explicit exit), with the zone label updating.');
// walk toward the skiff; if the tower walls hide the ground, tilt/zoom the camera until floor is visible
const scanGround = async (tx, tz) => {
  let best = null;
  for (const cam of [{pitch: 1.0, dist: 9}, {pitch: 1.5, dist: 7}, {pitch: 0.6, dist: 6}, {pitch: 1.2, dist: 14}]){
    await p.page.evaluate((cam, tx, tz) => { camCtl.yaw = Math.atan2(player.position.x - tx, player.position.z - tz); camCtl.pitch = cam.pitch; camCtl.dist = cam.dist; }, cam, tx, tz); await sleep(700);
    const s = await p.page.evaluate((tx, tz) => {
      const rect = renderer.domElement.getBoundingClientRect(); let b = null;
      for (let sx = 40; sx < rect.width - 250; sx += 24) for (let sy = 95; sy < rect.height - 150; sy += 24){
        const el = document.elementFromPoint(sx, sy); if (!el || el !== renderer.domElement) continue;
        const hit = pick({clientX: sx, clientY: sy}); if (!hit) continue; const n = hit.obj.name || '';
        if ((n === 'ground' || n.indexOf('ground-chunk-') === 0) && hit.point){ const d = Math.hypot(hit.point.x - tx, hit.point.z - tz); if (!b || d < b.d) b = {sx, sy, d: +d.toFixed(1)}; }
      }
      return b;
    }, tx, tz);
    if (s && (!best || s.d < best.d)) best = Object.assign({cam}, s);
  }
  return best;
};
for (let i = 0; i < 8 && v.zone !== 'Veyhollow Commons'; i++){
  const tgt = v.arrow ? v.arrow.target : [207, 151];
  let w = await p.walkTo(tgt[0] + 0.5, tgt[1] + 0.5, {near: 2.5, maxLegs: 30}); out('walk to arrow ' + tgt, w);
  if (!w.reached && /no clickable ground/.test(w.reason || '')){
    const g = await scanGround(tgt[0] + 0.5, tgt[1] + 0.5); out('scan ground', g);
    if (g){ await p.page.evaluate(cam => { camCtl.pitch = cam.pitch; camCtl.dist = cam.dist; }, g.cam); await sleep(500); await p.clickAt(g.sx, g.sy); p.logLine('click', {what: 'scanned ground', at: [g.sx, g.sy]}); await p.waitFor('!Player.moveTo', 40000); await sleep(400); }
  }
  v = await look('dock-leg-' + i);
  out('now', v.arrow, v.pos, v.plane, v.zone, v.nearby.slice(0, 6).map(n => n.kind + ':' + n.label + '@' + n.tile + ' d' + n.dist));
  if (w.reached) break;
}
