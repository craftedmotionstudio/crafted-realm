const meta = await p.page.evaluate(() => { const o = WORLD.clickables.find(o => o.userData && o.userData.kind === 'climb' && /Exit Lastlight/.test(String(o.userData.label || ''))); if (!o) return null; o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o); return {label: o.userData.label, empty: b.isEmpty(), min: b.min.toArray().map(n => +n.toFixed(2)), max: b.max.toArray().map(n => +n.toFixed(2)), visible: o.visible, children: o.children.length, climb: o.userData.climb}; });
out('exit climb meta', meta);
let hitPx = null;
for (const cam of [{yaw: Math.PI, pitch: 0.5, dist: 5}, {yaw: 0, pitch: 0.5, dist: 5}, {yaw: Math.PI / 2, pitch: 0.7, dist: 6}, {yaw: -Math.PI / 2, pitch: 0.7, dist: 6}, {yaw: Math.PI, pitch: 1.3, dist: 4}]){
  await p.page.evaluate(cam => { camCtl.yaw = cam.yaw; camCtl.pitch = cam.pitch; camCtl.dist = cam.dist; }, cam); await sleep(700);
  const s = await p.page.evaluate(() => { const rect = renderer.domElement.getBoundingClientRect(); const names = {}; let px = null; for (let sx = 40; sx < rect.width - 250; sx += 16) for (let sy = 95; sy < rect.height - 150; sy += 16){ const el = document.elementFromPoint(sx, sy); if (!el || el !== renderer.domElement) continue; const hit = pick({clientX: sx, clientY: sy}); if (!hit) continue; const n = (hit.obj.userData && hit.obj.userData.label) || hit.obj.name || '?'; names[n] = (names[n] || 0) + 1; if (!px && hit.obj.userData && /Exit Lastlight/.test(String(hit.obj.userData.label || ''))) px = [sx, sy]; } return {names, px}; });
  out('scan', cam, s.names, s.px);
  if (s.px){ hitPx = s.px; break; }
}
if (hitPx){ await p.clickAt(hitPx[0], hitPx[1]); p.logLine('click', {what: 'Exit Lastlight', at: hitPx}); await p.waitFor('(Player.plane||0) === 0', 15000); await sleep(1500); }
let v = await look('after-exit-click'); out('state', v.plane, v.zone, v.pos, v.chat.slice(-2), v.arrow);
