const map = await p.page.evaluate(() => {
  const rows = [];
  for (let z = 134; z <= 146; z++){
    let s = String(z).padStart(3) + ' ';
    for (let x = 142; x <= 160; x++){
      let ok; try { ok = tileWalkable(x, z); } catch (e) { ok = null; }
      const inRoom = (WORLD.interiors || []).find(it => Math.abs(x + .5 - it.x) < it.hw && Math.abs(z + .5 - it.z) < it.hd);
      const me = Math.floor(player.position.x) === x && Math.floor(player.position.z) === z;
      s += me ? '@' : ok === null ? '?' : ok ? (inRoom ? 'r' : '.') : '#';
    }
    rows.push(s);
  }
  const ex = [];
  for (const it of WORLD.interiors || []) if (Math.hypot(it.x - 151, it.z - 140) < 20) ex.push({b: it.buildingId, x: it.x, z: it.z, hw: it.hw, hd: it.hd});
  return {legend: '. walkable outside, r walkable in a room, # blocked, @ me; x 142..160', rows, interiors: ex, grid: typeof CollisionGrid !== 'undefined' ? {enabled: CollisionGrid.enabled, baked: CollisionGrid.baked} : null};
});
out('walk map', map);
