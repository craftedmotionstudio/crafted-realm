await p.note('high', 'Teaching door (Guide Hall north door, 151,143) → alley tile 151,142', 'The arrow told me "Leave by the Teaching door". I walked to it and now stand just outside it at 151.5,142.5. From here every ground click north, east or west gives "You can\'t get all the way there; walking as close as you can." and I do not move at all; only south (back into the hall) works. I clicked both door leaves (they toggle Open/Close) and it changes nothing. The arrow now says "Chop tree" at 126,158, which is behind me through the building. Over five minutes spent trying.', 'Stepping through the Teaching door should put me on a walkable path that leads on to Survival Wood, and the arrow should lead me along it.');
const info = await p.page.evaluate(() => {
  const r = {pos: [player.position.x, player.position.z]};
  const px = Math.floor(player.position.x), pz = Math.floor(player.position.z);
  r.paths = {};
  for (const [x, z] of [[151,141],[150,142],[149,142],[148,142],[153,142],[151,140],[146,139],[146,140],[145,138],[140,142],[151,150],[127,158]]){
    try { const q = computePath(px, pz, x, z); r.paths[x+','+z] = q ? {n: q.pts.length, reached: q.reached, last: q.pts[q.pts.length-1]} : null; } catch (e) { r.paths[x+','+z] = String(e); }
  }
  try { r.step = JSON.parse(JSON.stringify(Tutorial.steps[Tutorial.step], (k, v) => typeof v === 'function' ? '[fn]' : v)); } catch (e) { r.stepErr = String(e); }
  return r;
});
out('reach probe', info);
