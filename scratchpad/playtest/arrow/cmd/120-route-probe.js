const info = await p.page.evaluate(() => {
  const r = {};
  const test = (sx, sz, tx, tz) => { try { const q = computePath(sx, sz, tx, tz); return q ? {n: q.pts.length, reached: q.reached, last: q.pts[q.pts.length-1]} : null; } catch (e) { return String(e); } };
  r.hall_to_tree = test(151, 150, 127, 158);
  r.arrival_to_tree = test(151, 168, 127, 158);
  r.arrival_to_alley = test(151, 168, 151, 142);
  r.hall_to_alley = test(151, 150, 151, 141);
  r.tree_region_to_kitchen = test(127, 158, 151, 136);
  r.arrival_to_kitchen = test(151, 168, 151, 136);
  r.arrival_to_green_door_out = test(151, 168, 145, 139);
  // count reachable tiles from the alley pocket by flood fill using computePath as an oracle around a small window
  return r;
});
out('route probe', info);
