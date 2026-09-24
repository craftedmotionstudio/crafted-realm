// helpers that click like a player does in the cavern: project at the floor height under the player, only on bare canvas
p.cwalk = async function(x, z, opts){
  opts = opts || {}; const maxLegs = opts.maxLegs || 12; let last = null, stuck = 0, legs = 0;
  for (; legs < maxLegs; legs++){
    const here = await p.page.evaluate(() => [player.position.x, player.position.z]);
    if (Math.hypot(here[0] - x, here[1] - z) <= (opts.near || 1.2)) break;
    await p.aim(x, z, opts.dist || 22);
    await p.page.evaluate(() => { camCtl.pitch = 1.1; }); await sleep(300);
    const px = await p.page.evaluate((x, z) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const floorY = (wx, wz) => { try { if (typeof pElev === 'function'){ const e = pElev(wx, wz); if (Number.isFinite(e)) return e; } } catch (e) {} return player.position.y; };
      const dx = x - player.position.x, dz = z - player.position.z;
      for (let f = 1; f >= 0.12; f -= 0.08){
        const wx = player.position.x + dx * f, wz = player.position.z + dz * f;
        const pr = new THREE.Vector3(wx, floorY(wx, wz), wz).project(camera);
        if (pr.z > 1 || Math.abs(pr.x) > 0.9 || Math.abs(pr.y) > 0.85) continue;
        const sx = (pr.x + 1) / 2 * rect.width, sy = (1 - pr.y) / 2 * rect.height;
        const el = document.elementFromPoint(sx, sy); if (!el || el !== renderer.domElement) continue;
        const hit = pick({clientX: sx, clientY: sy}); if (!hit) continue;
        const n = hit.obj.name || '';
        if (n === 'ground' || n.indexOf('ground-chunk-') === 0 || /floor|cavern/i.test(n)) return {screen: [Math.round(sx), Math.round(sy)], f: +f.toFixed(2), name: n};
      }
      return null;
    }, x, z);
    if (!px){ p.logLine('cwalk-blocked', {target: [x, z], legs}); return {reached: false, reason: 'no clickable floor toward target', legs}; }
    await p.clickAt(px.screen[0], px.screen[1]);
    await p.page.waitForFunction(() => !Player.moveTo, {timeout: 40000}).catch(() => {});
    await sleep(250);
    const now = await p.page.evaluate(() => [player.position.x, player.position.z]);
    if (last && Math.hypot(now[0] - last[0], now[1] - last[1]) < 0.6){ if (++stuck >= 2){ p.logLine('cwalk-stuck', {target: [x, z], at: now, legs}); return {reached: false, reason: 'no progress', at: now, legs}; } } else stuck = 0;
    last = now;
  }
  const at = await p.page.evaluate(() => [+player.position.x.toFixed(1), +player.position.z.toFixed(1)]);
  const reached = Math.hypot(at[0] - x, at[1] - z) <= (opts.near || 1.2) + 0.6;
  p.logLine('cwalk', {target: [x, z], at, legs, reached}); return {reached, at, legs};
};
// click an object only where the pixel is bare canvas (a player zooms/tilts until it is)
p.cclick = async function(finder, opts){
  opts = opts || {};
  for (const cam of [{dist: 10, pitch: 1.0}, {dist: 14, pitch: 1.2}, {dist: 8, pitch: 0.8}, {dist: 18, pitch: 1.3}]){
    const loc = await p.locate(finder, {dist: cam.dist, pitch: cam.pitch, settle: 900});
    if (!loc.hit) continue;
    const onCanvas = await p.page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); return !!el && el === renderer.domElement; }, loc.hit);
    if (!onCanvas) continue;
    await p.clickAt(loc.hit[0], loc.hit[1], opts.right ? 'right' : 'left');
    p.logLine(opts.right ? 'right-click' : 'click', {finder: finder.slice(0, 80), at: loc.hit, cam}); return {clicked: true, loc};
  }
  p.logLine('click-miss', {finder: finder.slice(0, 80)}); return {clicked: false};
};
let w = await p.cwalk(294.5, 356.5, {near: 2.5}); out('cwalk to copper', w);
let v = await look('near-copper');
let c = await p.cclick(FINDERS.copperRock); out('click copper', c);
let ok = await p.waitFor("Tutorial.step >= 8", 40000); out('copper mined', ok);
v = await look('after-copper-3');
