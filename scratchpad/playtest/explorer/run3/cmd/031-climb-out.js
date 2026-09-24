/* Run 3, stage 3a: I am in the cavern with nothing. Walk with right-click "Walk here" on the cave floor and climb out. */
const {safeClick, near} = p;
// cave walk: aim at the target, right-click the floor pixel toward it, choose "Walk here" (real inputs)
const caveWalk = async (x, z, tag, opts) => {
  opts = opts || {}; const maxLegs = opts.maxLegs || 10; let last = null, stuck = 0, legs = 0;
  for (; legs < maxLegs; legs++){
    const here = await p.page.evaluate(() => [player.position.x, player.position.z]);
    if (Math.hypot(here[0] - x, here[1] - z) <= (opts.near || 1.3)) break;
    await p.aim(x, z, opts.dist || 22);
    const px = await p.page.evaluate((x, z) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const dx = x - player.position.x, dz = z - player.position.z;
      for (let f = 1; f >= 0.1; f -= 0.1){
        const wx = player.position.x + dx * f, wz = player.position.z + dz * f;
        const pr = new THREE.Vector3(wx, player.position.y, wz).project(camera);
        if (pr.z > 1 || Math.abs(pr.x) > 0.9 || Math.abs(pr.y) > 0.85) continue;
        const sx = (pr.x + 1) / 2 * rect.width, sy = (1 - pr.y) / 2 * rect.height;
        const el = document.elementFromPoint(sx, sy); if (!el || el !== renderer.domElement) continue;
        const hit = pick({clientX: sx, clientY: sy}); if (!hit) continue;
        return {screen: [Math.round(sx), Math.round(sy)], f: +f.toFixed(1), hitName: hit.obj.name || '', kind: hit.obj.userData && hit.obj.userData.kind};
      }
      return null;
    }, x, z);
    if (!px){ out('caveWalk ' + tag + ': nothing to click toward', [x, z]); return {reached: false, legs}; }
    await p.clickAt(px.screen[0], px.screen[1], 'right'); await sleep(250);
    const rows = await p.ctxRows();
    if (!rows.some(r => /walk here/i.test(r))){ out('caveWalk ' + tag + ': no Walk here in', rows, 'hit', px.hitName); await closeCtx(); return {reached: false, legs}; }
    await p.chooseRow('Walk here');
    await p.page.waitForFunction(() => !Player.moveTo, {timeout: 30000}).catch(() => {}); await sleep(250);
    const now = await p.page.evaluate(() => [player.position.x, player.position.z]);
    if (last && Math.hypot(now[0] - last[0], now[1] - last[1]) < 0.6){ if (++stuck >= 2){ out('caveWalk ' + tag + ' stuck at', now); return {reached: false, legs, at: now}; } } else stuck = 0;
    last = now;
  }
  const at = await p.page.evaluate(() => [+player.position.x.toFixed(1), +player.position.z.toFixed(1)]);
  const reached = Math.hypot(at[0] - x, at[1] - z) <= (opts.near || 1.3) + 0.6;
  out('caveWalk ' + tag, {reached, at, legs}); p.logLine('cave-walk', {target: [x, z], at, legs, reached});
  return {reached, at, legs};
};
p.caveWalk = caveWalk;
let v = await look('32b-cavern-early-start');
if (v.plane === -1){
  // where can I click? (read-only) then walk with right-click "Walk here"
  const r0 = await p.page.evaluate(() => { const rect = renderer.domElement.getBoundingClientRect(); const out = []; for (let y = 200; y < 850; y += 130) for (let x = 200; x < 1300; x += 220){ const h = pick({clientX: x, clientY: y}); out.push([x, y, h ? (h.obj.name || (h.obj.userData && h.obj.userData.kind) || '?') : null]); } return out; });
  out('cavern pick survey', r0.filter(e => e[2]));
  // a curious player tries the copper rock with bare hands first
  const rk = await safeClick(FINDERS.copperRock, {dist: 12}); await sleep(3000); v = await look('32c-copper-bare-hands'); out('bare-hands copper: chat', v.chat.slice(-2), 'pos', v.pos); await dismiss();
  await caveWalk(300, 356, 'east 1', {maxLegs: 6}); await caveWalk(312, 355, 'east 2', {maxLegs: 6}); await caveWalk(320.5, 354.5, 'exit', {maxLegs: 6});
  v = await look('32d-at-exit');
  const r = await safeClick(FINDERS.cavernExit, {dist: 10}); out('exit ladder click', r.clicked);
  const up = await p.waitFor('(Player.plane||0)===0', 20000); await sleep(1500); v = await look('32e-surfaced-early'); out('surfaced early?', up, v.plane, v.zone, v.pos, 'arrow', v.arrow);
  await dismiss();
}
