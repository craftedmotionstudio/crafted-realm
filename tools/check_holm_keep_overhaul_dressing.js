/* Warden's Keep overhaul: the island's own dressing around the keep, checked against the rebuilt keep. A placed prop's
 * footprint blocks every node on the tiles it touches (HolmIslandProps.blockersFrom, 'overlap' mode, at every height),
 * so a yard prop that stood against the old keep must not now stand in the new masonry (the solid curtains and the
 * gatehouse) or on a tile whose upper storey is a walk. Reports, for every island prop within the keep's patch, the
 * keep nodes its footprint would take (by storey) and whether it stood on open ground in the old keep graph.
 * Habitat trees (blockers by trunk) are checked the same way.
 * Run: node tools/check_holm_keep_overhaul_dressing.js [navigation.json]   (exit 1 when a prop takes a walk or a target) */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), read = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const Props = require('../src/holm_island_props.js');
const reg = read('docs/rebuild/holm-overhaul/v2land.json');
const navPath = process.argv[2] || '.studio-workspaces/holm-keep-overhaul-navigation-v1/candidates/navigation.json';
const nav = read(navPath), ref = read('.studio-workspaces/holm-keep-props-navigation-v1/candidates/navigation.json');
const P = nav.placement;
const data = read('docs/rebuild/holm-overhaul/island-props.json'), mans = {};
for (const k of Object.keys(data.packs)) mans[k] = read(data.packs[k].replace(/[^/]+\.glb$/, 'manifest.json'));
const blockers = Props.blockersFrom(data, mans);
const hab = read(reg.habitat), trunk = hab.blockers || { oak: .45, birch: .3, 'coastal-pine': .35 };
hab.placements.forEach(p => { const r = trunk[p.asset]; if (r) blockers.push({ id: 'habitat:' + p.id, x0: p.x - r * p.scale, x1: p.x + r * p.scale, z0: p.z - r * p.scale, z1: p.z + r * p.scale }) });
const byTile = g => { const m = {}; g.nodes.forEach(n => { const k = Math.floor(n.x + P.x) + ',' + Math.floor(n.z + P.z); (m[k] = m[k] || []).push(n) }); return m };
const T1 = byTile(nav), T0 = byTile(ref);
const targets = new Set(nav.targets.map(t => t.nodeId));
const out = [], bad = [];
for (const b of blockers) {
  if (b.x1 < P.x - 12 || b.x0 > P.x + 14 || b.z1 < P.z - 16 || b.z0 > P.z + 13) continue;
  const tiles = [];
  for (let z = Math.floor(b.z0); z <= Math.floor(b.z1 - 1e-9); z++) for (let x = Math.floor(b.x0); x <= Math.floor(b.x1 - 1e-9); x++) tiles.push(x + ',' + z);
  const now = tiles.flatMap(k => T1[k] || []), before = tiles.flatMap(k => T0[k] || []);
  const upper = now.filter(n => n.y > 2.5), tg = now.filter(n => targets.has(n.id));
  const openBefore = before.length > 0 && before.every(n => /Terrain$/.test(n.surface));
  // a tile that was open ground in the old keep graph and has no stance at all now: the prop stands in new masonry
  const solidNow = tiles.some(k => (T0[k] || []).length && (T0[k] || []).every(n => /Terrain$/.test(n.surface)) && !(T1[k] || []).length);
  const rec = { id: b.id, tiles, nodesNow: now.length, upper: upper.map(n => n.id), targets: tg.map(n => n.id), openBefore, inMasonryNow: solidNow };
  if (upper.length || tg.length || solidNow) bad.push(rec);
  out.push(rec);
}
const res = { navigation: navPath, checked: out.length, problems: bad };
console.log(JSON.stringify(res, null, 1));
process.exit(bad.length ? 1 : 0);
