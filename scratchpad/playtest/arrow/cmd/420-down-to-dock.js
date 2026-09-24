// the straight line to the skiff is over the cliff/building; a player clicks the farthest visible ground in roughly the right direction and lets the game path
const stepToward = async (tx, tz) => {
  let best = null;
  for (const cam of [{pitch: 1.0, dist: 30}, {pitch: 1.3, dist: 40}, {pitch: 0.8, dist: 22}]){
    await p.page.evaluate((cam, tx, tz) => { camCtl.yaw = Math.atan2(player.position.x - tx, player.position.z - tz); camCtl.pitch = cam.pitch; camCtl.dist = cam.dist; }, cam, tx, tz); await sleep(700);
    const s = await p.page.evaluate((tx, tz) => {
      const rect = renderer.domElement.getBoundingClientRect(); let b = null;
      for (let sx = 40; sx < rect.width - 250; sx += 20) for (let sy = 95; sy < rect.height - 150; sy += 20){
        const el = document.elementFromPoint(sx, sy); if (!el || el !== renderer.domElement) continue;
        const hit = pick({clientX: sx, clientY: sy}); if (!hit || !hit.point) continue; const n = hit.obj.name || '';
        if (n !== 'ground' && n.indexOf('ground-chunk-') !== 0) continue;
        const q = computePath(player.position.x, player.position.z, hit.point.x, hit.point.z); if (!q || !q.reached) continue;
        const d = Math.hypot(hit.point.x - tx, hit.point.z - tz); if (!b || d < b.d) b = {sx, sy, d: +d.toFixed(1), at: [+hit.point.x.toFixed(1), +hit.point.z.toFixed(1)]};
      }
      return b;
    }, tx, tz);
    if (s && (!best || s.d < best.d)) best = Object.assign({cam}, s);
  }
  if (!best) return null;
  await p.page.evaluate(cam => { camCtl.pitch = cam.pitch; camCtl.dist = cam.dist; }, best.cam); await sleep(500);
  await p.clickAt(best.sx, best.sy); p.logLine('click', {what: 'ground toward skiff', at: [best.sx, best.sy], world: best.at});
  await p.waitFor('!Player.moveTo', 60000); await sleep(400);
  return best;
};
let v = await p.see();
for (let i = 0; i < 6; i++){
  const tgt = v.arrow ? v.arrow.target : [207, 151];
  const here = v.pos; if (Math.hypot(here[0] - tgt[0], here[1] - tgt[1]) < 4) break;
  const r = await stepToward(tgt[0] + 0.5, tgt[1] + 0.5); out('step', r);
  v = await look('dock-leg-d' + i); out('now', v.arrow, v.pos, v.zone, v.nearby.slice(0, 5).map(n => n.kind + ':' + n.label + '@' + n.tile + ' d' + n.dist));
  if (!r) break;
}
