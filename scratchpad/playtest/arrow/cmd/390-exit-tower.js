const findDoorPixel = async () => {
  for (const cam of [{pitch: 1.0, dist: 9}, {pitch: 0.6, dist: 6}, {pitch: 0.8, dist: 12}, {pitch: 1.2, dist: 7}]){
    await p.page.evaluate(cam => { camCtl.yaw = Math.PI; camCtl.pitch = cam.pitch; camCtl.dist = cam.dist; }, cam); await sleep(700);
    const d = await p.page.evaluate(() => { const rect = renderer.domElement.getBoundingClientRect(); for (let sx = 40; sx < rect.width - 250; sx += 20) for (let sy = 95; sy < rect.height - 150; sy += 20){ const el = document.elementFromPoint(sx, sy); if (!el || el !== renderer.domElement) continue; const hit = pick({clientX: sx, clientY: sy}); if (hit && hit.obj.userData && hit.obj.userData.kind === 'lighthouseDoor') return [sx, sy]; } return null; });
    if (d) return d;
  }
  return null;
};
let v = await p.see();
if (v.plane === 0){
  const d = await findDoorPixel(); out('door pixel', d);
  if (d){ await p.clickAt(d[0], d[1]); p.logLine('click', {what: 'lighthouse door (from inside the body)', at: d}); await p.waitFor('(Player.plane||0) === 1', 15000); await sleep(1200); }
  v = await look('back-in-tower'); out('state', v.plane, v.zone, v.pos, v.chat.slice(-2));
}
if (v.plane === 1){
  const exitF = "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&/Exit Lastlight/.test(String(o.userData.label||'')))";
  const c = await p.cclick(exitF); out('click Exit Lastlight', c);
  await p.waitFor('(Player.plane||0) === 0', 15000); await sleep(1500);
  v = await look('exited-tower'); out('state', v.plane, v.zone, v.pos, v.chat.slice(-2), v.arrow);
}
await p.note('medium', 'Lastlight door 196,124', 'Standing inside the lighthouse body I could not click the ground toward the skiff (every ray hits the tower walls). The only way out I found was to click the door (which puts me on the Ground Floor) and then take the "Exit Lastlight" climb. A player inside the stone would not know to do that.', 'Never allow the player inside the tower body; the exit should be the door.');
for (let i = 0; i < 4 && v.zone !== 'Veyhollow Commons'; i++){
  const tgt = v.arrow ? v.arrow.target : [207, 151];
  const w = await p.walkTo(tgt[0] + 0.5, tgt[1] + 0.5, {near: 2.5, maxLegs: 30}); out('walk to arrow ' + tgt, w);
  v = await look('dock-leg-b' + i); out('now', v.arrow, v.pos, v.plane, v.zone, v.nearby.slice(0, 6).map(n => n.kind + ':' + n.label + '@' + n.tile + ' d' + n.dist));
  if (w.reached) break;
}
