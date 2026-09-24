await p.page.evaluate(() => { camCtl.yaw = Math.PI; camCtl.pitch = 1.3; camCtl.dist = 4; }); await sleep(700);
const px = await p.page.evaluate(() => { const rect = renderer.domElement.getBoundingClientRect(); for (let sx = 300; sx < rect.width - 300; sx += 16) for (let sy = 200; sy < rect.height - 200; sy += 16){ const el = document.elementFromPoint(sx, sy); if (!el || el !== renderer.domElement) continue; const hit = pick({clientX: sx, clientY: sy}); if (hit && hit.obj.userData && /Exit Lastlight/.test(String(hit.obj.userData.label || '').replace(/<[^>]+>/g, ''))) return [sx, sy]; } return null; });
out('exit pixel', px);
if (px){ await p.clickAt(px[0], px[1]); p.logLine('click', {what: 'Exit Lastlight', at: px}); await p.waitFor('(Player.plane||0) === 0', 15000); await sleep(1500); }
let v = await look('after-exit'); out('state', v.plane, v.zone, v.pos, v.chat.slice(-2), v.arrow);
for (let i = 0; i < 4 && v.zone !== 'Veyhollow Commons' && v.plane === 0; i++){
  const tgt = v.arrow ? v.arrow.target : [207, 151];
  const w = await p.walkTo(tgt[0] + 0.5, tgt[1] + 0.5, {near: 2.5, maxLegs: 30}); out('walk to arrow ' + tgt, w);
  v = await look('dock-leg-c' + i); out('now', v.arrow, v.pos, v.plane, v.zone, v.nearby.slice(0, 6).map(n => n.kind + ':' + n.label + '@' + n.tile + ' d' + n.dist));
  if (w.reached) break;
}
