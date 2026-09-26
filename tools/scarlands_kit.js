#!/usr/bin/env node
/* The Scarlands kit: tile layout -> server collision map + client placement list (W2/W3, 2026-09-26).
 *
 * A layout is a small JSON of kit pieces on tiles (see docs/rebuild/scarlands/proof_layout.json):
 *   { "schema": "crafted-realm-scarlands-layout-v1", "name", "about", "base": "<server map to take bounds, respawn,
 *     areas, spawns and any other keys from>", "kit": "<kit manifest.json>",
 *     "pieces": [{ "piece": "dead_tree_tall", "x": 5, "z": 60, "rot": 0 }, ...],
 *     "runs":   [{ "piece": "ditch_straight", "from": [0, 44], "to": [63, 44], "rot": 0, "skip": [[15, 16]] }],
 *     "extra":  { "blocked": [[x1,z1,x2,z2]], "water": [...], "walls": [...] },          // collision with no piece
 *     "ground": { "default": "scorched_earth", "rects": [...], "patches": [...], "paths": [...] } }
 * x, z = the south-west (min) tile of the piece's footprint after rotation; rot = clockwise quarter turns seen from
 * above (the piece's north edge faces east at rot 1). North is +z (server/README.md).
 *
 * Outputs:
 *   1. a server collision map (format "crafted-realm-map" v1, server/README.md): blocked/water from piece cells merged
 *      into rectangles, walls merged into straight runs, everything else copied from the base map;
 *   2. a client placement list: every piece with its tile, rotation, world position (tile centre of its footprint)
 *      and three.js yaw, counts per piece for instancing, the kit GLB/manifest it came from, and a ground grid
 *      (a kind per tile, tile-corner heights with the Ditch carved, walk surfaces for plank crossings).
 * Run: node tools/scarlands_kit.js <layout.json> [--map out.json] [--placement out.json] [--compare map.json] */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SIDES = ['N', 'E', 'S', 'W'];

// ---------- rotation (clockwise quarter turns seen from above, x east, z north) ----------
function footprint(piece, rot) { const { w, d } = piece.footprint; return rot % 2 ? { w: d, d: w } : { w, d }; }
// cell (i east, j north) of an unrotated w x d footprint -> the cell after r clockwise turns
function rotCell(i, j, w, d, r) {
  for (let k = 0; k < (r & 3); k++) { const ni = j, nj = w - 1 - i; i = ni; j = nj; const t = w; w = d; d = t; }
  return [i, j];
}
function rotSide(side, r) { return SIDES[(SIDES.indexOf(side) + (r & 3)) % 4]; }
function need(ok, msg) { if (!ok) throw new Error('[scarlands_kit] ' + msg); }

/** Collision and terrain cells of one placed piece, in map tiles. */
function placeCells(piece, x, z, rot) {
  need(piece.rotations.includes(rot & 3), piece.id + ' does not allow rotation ' + rot);
  const { w, d } = piece.footprint, c = piece.collision, out = { blocked: [], water: [], walls: [], cut: [], walk: [] };
  const at = (i, j) => { const [a, b] = rotCell(i, j, w, d, rot); return [x + a, z + b]; };
  (c.blocked || []).forEach(([i, j]) => out.blocked.push(at(i, j)));
  (c.water || []).forEach(([i, j]) => out.water.push(at(i, j)));
  (c.walls || []).forEach(([i, j, s]) => out.walls.push([...at(i, j), rotSide(s, rot)]));
  if (c.cut) c.cut.cells.forEach(([i, j]) => out.cut.push([...at(i, j), c.cut.depth]));
  if (c.walk) c.walk.cells.forEach(([i, j]) => out.walk.push([...at(i, j), c.walk.y]));
  return out;
}

// ---------- merging tiles into the map's compact forms ----------
function mergeRects(tiles) {
  // greedy: sort, grow each unused tile east then north while the whole row is present
  const set = new Set(tiles.map(([x, z]) => x + ',' + z)), used = new Set(), rects = [];
  const sorted = [...set].map(k => k.split(',').map(Number)).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  for (const [x, z] of sorted) {
    if (used.has(x + ',' + z)) continue;
    let x2 = x; while (set.has((x2 + 1) + ',' + z) && !used.has((x2 + 1) + ',' + z)) x2++;
    let z2 = z;
    for (;;) { let ok = true; for (let a = x; a <= x2; a++) if (!set.has(a + ',' + (z2 + 1)) || used.has(a + ',' + (z2 + 1))) { ok = false; break; } if (!ok) break; z2++; }
    for (let a = x; a <= x2; a++) for (let b = z; b <= z2; b++) used.add(a + ',' + b);
    rects.push([x, z, x2, z2]);
  }
  return rects;
}
function mergeWalls(walls) {
  // straight runs of the same side: N/S walls run along x, E/W walls along z
  const key = new Set(walls.map(w => w.join(','))), done = new Set(), out = [];
  const list = [...key].map(k => { const p = k.split(','); return [+p[0], +p[1], p[2]]; }).sort((a, b) => a[2].localeCompare(b[2]) || a[1] - b[1] || a[0] - b[0]);
  for (const [x, z, s] of list) {
    if (done.has(x + ',' + z + ',' + s)) continue;
    const alongX = s === 'N' || s === 'S';
    let n = 0; while (key.has((alongX ? x + n + 1 : x) + ',' + (alongX ? z : z + n + 1) + ',' + s)) n++;
    for (let k = 0; k <= n; k++) done.add((alongX ? x + k : x) + ',' + (alongX ? z : z + k) + ',' + s);
    out.push(n ? (alongX ? [x, z, x + n, z, s] : [x, z, x, z + n, s]) : [x, z, s]);
  }
  return out;
}
function expandRects(rects) { const t = []; (rects || []).forEach(([x1, z1, x2, z2]) => { for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) t.push([x, z]); }); return t; }
function expandWalls(walls) {
  const t = []; (walls || []).forEach(w => { if (w.length === 3) t.push(w); else for (let x = w[0]; x <= w[2]; x++) for (let z = w[1]; z <= w[3]; z++) t.push([x, z, w[4]]); }); return t;
}

// ---------- the ground grid ----------
const KINDS = ['grass', 'dirt', 'burnt_grass', 'scorched_earth', 'ash', 'cracked_mud', 'dark_rock', 'bone_dirt'];
// recommended old-school tile colours (0..255, multiplied by the kit texture as detail, see tools/scarlands_proof.js)
const KIND_COLOURS = { grass: [120, 142, 52], dirt: [138, 116, 82], burnt_grass: [104, 92, 56], scorched_earth: [88, 74, 62],
  ash: [106, 99, 88], cracked_mud: [106, 90, 70], dark_rock: [74, 70, 66], bone_dirt: [100, 84, 64] };
// kinds drawn as crisp overlays (their own tile colour at every corner, like 2004 paths); the rest blend across tiles
const OVERLAYS = ['dirt'];
function hash(x, z, k) { const s = Math.sin(x * 127.1 + z * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z, scale, seed) {
  const fx = x / scale, fz = z / scale, ix = Math.floor(fx), iz = Math.floor(fz); let u = fx - ix, w = fz - iz; u = u * u * (3 - 2 * u); w = w * w * (3 - 2 * w);
  const q = (a, b) => hash(a, b, seed);
  return (q(ix, iz) * (1 - u) + q(ix + 1, iz) * u) * (1 - w) + (q(ix, iz + 1) * (1 - u) + q(ix + 1, iz + 1) * u) * w;
}
function inRect(x, z, r) { return x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2; }
function segDist(x, z, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz, t = l ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l)) : 0; return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz); }

function buildGround(layout, bounds, cuts, walks) {
  const G = layout.ground || {}, W = bounds.x2 - bounds.x1 + 1, D = bounds.z2 - bounds.z1 + 1;
  const kinds = new Array(W * D).fill(KINDS.indexOf(G.default || 'scorched_earth'));
  const set = (x, z, k) => { if (x >= bounds.x1 && x <= bounds.x2 && z >= bounds.z1 && z <= bounds.z2) kinds[(z - bounds.z1) * W + (x - bounds.x1)] = KINDS.indexOf(k); };
  (G.rects || []).forEach(r => { for (let z = r.z1; z <= r.z2; z++) for (let x = r.x1; x <= r.x2; x++) set(x, z, r.kind); });
  // noise patches: a kind wherever value noise exceeds a threshold inside an area (ash drifts, cracked mud flats)
  (G.patches || []).forEach(p => { for (let z = p.area.z1; z <= p.area.z2; z++) for (let x = p.area.x1; x <= p.area.x2; x++) if (vnoise(x, z, p.scale || 6, p.seed || 1) > p.threshold) set(x, z, p.kind); });
  // a ragged band (the burnt edge north of the Ditch): rows z1..z2 with a noisy far edge
  (G.bands || []).forEach(b => { for (let x = bounds.x1; x <= bounds.x2; x++) { const reach = b.z2 + Math.round((vnoise(x, 0, 4, b.seed || 3) - .5) * 2 * (b.jitter || 2)); for (let z = b.z1; z <= reach; z++) set(x, z, b.kind); } });
  (G.paths || []).forEach(p => { for (let z = bounds.z1; z <= bounds.z2; z++) for (let x = bounds.x1; x <= bounds.x2; x++) {
    for (let k = 1; k < p.points.length; k++) if (segDist(x + .5, z + .5, p.points[k - 1], p.points[k]) <= p.width / 2 + (vnoise(x, z, 3, 9) - .5) * .8) { set(x, z, p.kind); break; } } });
  // tile-corner heights: gentle low hills, flattened near the Ditch and under walled ruins; carved cells go down
  const hills = G.hills || { amplitude: 0, scale: 12 }, flat = (G.flatten || []);
  const height = (x, z) => { let h = (vnoise(x, z, hills.scale, 5) - .5) * 2 * hills.amplitude; flat.forEach(r => { const dx = Math.max(r.x1 - x, 0, x - r.x2 - 1), dz = Math.max(r.z1 - z, 0, z - r.z2 - 1), dd = Math.hypot(dx, dz); if (dd < (r.fade || 3)) h *= dd / (r.fade || 3); }); return +h.toFixed(3); };
  const corners = new Array((W + 1) * (D + 1));
  for (let z = 0; z <= D; z++) for (let x = 0; x <= W; x++) corners[z * (W + 1) + x] = height(bounds.x1 + x, bounds.z1 + z);
  return { x1: bounds.x1, z1: bounds.z1, width: W, depth: D, kindNames: KINDS, kindColours: KIND_COLOURS, overlays: OVERLAYS, kinds,
    cornerHeights: corners, cut: cuts, walk: walks,
    note: 'kinds[(z - z1) * width + (x - x1)]; cornerHeights[(z - z1) * (width + 1) + (x - x1)] is the south-west corner of tile (x, z); tiles in "cut" lower all four of their own corners by the depth (draw each tile with its own vertices so the Ditch banks stay vertical; the trench pieces dress them); "walk" is the walking surface height over a carved tile (plank crossings)' };
}

// ---------- layout -> map + placement ----------
function readJSON(p) { return JSON.parse(fs.readFileSync(path.isAbsolute(p) ? p : path.join(ROOT, p), 'utf8')); }
function expandRuns(runs) {
  const out = [];
  (runs || []).forEach(r => {
    const dx = Math.sign(r.to[0] - r.from[0]), dz = Math.sign(r.to[1] - r.from[1]), step = r.step || 1, skip = r.skip || [];
    need(!(dx && dz), 'runs are straight: ' + JSON.stringify(r));
    const n = Math.max(Math.abs(r.to[0] - r.from[0]), Math.abs(r.to[1] - r.from[1]));
    for (let k = 0; k <= n; k += step) {
      const x = r.from[0] + dx * k, z = r.from[1] + dz * k, along = dx ? x : z;
      if (skip.some(([a, b]) => along >= a && along <= b)) continue;
      out.push({ piece: r.piece, x, z, rot: r.rot || 0, run: r.name || null });
    }
  });
  return out;
}

function compile(layout, kit, base) {
  const byId = Object.fromEntries(kit.pieces.map(p => [p.id, p]));
  const placed = (layout.pieces || []).concat(expandRuns(layout.runs));
  const blocked = [], water = [], walls = [], cut = [], walk = [], placement = [], counts = {};
  const bounds = base.bounds;
  placed.forEach(p => {
    const piece = byId[p.piece]; need(piece, 'unknown piece ' + p.piece);
    const rot = (p.rot || 0) & 3, fp = footprint(piece, rot);
    need(p.x >= bounds.x1 && p.z >= bounds.z1 && p.x + fp.w - 1 <= bounds.x2 && p.z + fp.d - 1 <= bounds.z2, p.piece + ' at ' + p.x + ',' + p.z + ' leaves the map');
    const c = placeCells(piece, p.x, p.z, rot);
    blocked.push(...c.blocked); water.push(...c.water); walls.push(...c.walls); cut.push(...c.cut); walk.push(...c.walk);
    placement.push({ piece: p.piece, node: piece.node, x: p.x, z: p.z, rot, w: fp.w, d: fp.d,
      // tile-centre of the footprint in tile units (server x, z), and the yaw for a three.js scene where north is -z
      cx: p.x + fp.w / 2, cz: p.z + fp.d / 2, yaw: +(-rot * Math.PI / 2).toFixed(6) });
    counts[p.piece] = (counts[p.piece] || 0) + 1;
  });
  const extra = layout.extra || {};
  blocked.push(...expandRects(extra.blocked)); water.push(...expandRects(extra.water)); walls.push(...expandWalls(extra.walls));
  // a tile both blocked and water is blocked (solid wins); water under a plank crossing is not water (walkable)
  const walkable = new Set(walk.map(([x, z]) => x + ',' + z)), solid = new Set(blocked.map(([x, z]) => x + ',' + z));
  const waterTiles = water.filter(([x, z]) => !solid.has(x + ',' + z) && !walkable.has(x + ',' + z));
  const map = {};
  Object.keys(base).forEach(k => { if (!['blocked', 'water', 'walls', 'flags'].includes(k)) map[k] = base[k]; });
  Object.assign(map, { format: 'crafted-realm-map', version: 1, name: layout.name, about: layout.about || base.about,
    generator: 'tools/scarlands_kit.js from ' + (layout.__file || 'a layout'), level: base.level | 0, bounds,
    blocked: mergeRects(blocked), water: mergeRects(waterTiles), walls: mergeWalls(walls) });
  if (base.flags) map.flags = base.flags;
  const order = ['format', 'version', 'name', 'about', 'generator', 'level', 'bounds', 'respawn', 'blocked', 'water', 'walls', 'flags', 'areas', 'spawns'];
  const sorted = {}; order.forEach(k => { if (k in map) sorted[k] = map[k]; }); Object.keys(map).forEach(k => { if (!(k in sorted)) sorted[k] = map[k]; });
  const ground = buildGround(layout, bounds, cut, walk);
  const place = { schema: 'crafted-realm-scarlands-placement-v1', name: layout.name, generator: 'tools/scarlands_kit.js',
    kit: { glb: kit.glb.file, sha256: kit.glb.sha256, manifest: layout.kit },
    conventions: 'x east, z north (server tiles). A piece covers tiles x..x+w-1, z..z+d-1; its model origin sits at (cx, cz) on the ground. For three.js with north = -z: position (cx, groundY, -cz), rotation.y = yaw. Use one InstancedMesh per piece (see counts).',
    counts, pieces: placement, ground,
    water: (extra.water || []).map(r => r.slice(0, 4)),   // water with no piece (pools): the client draws its own surface
  };
  return { map: sorted, placement: place };
}

/** Tile-level comparison of two maps' collision (blocked, water, walls). */
function compareMaps(a, b) {
  const tiles = m => ({ blocked: new Set(expandRects(m.blocked).map(t => t.join(','))), water: new Set(expandRects(m.water).map(t => t.join(','))), walls: new Set(expandWalls(m.walls).map(t => t.join(','))) });
  const A = tiles(a), B = tiles(b), out = {};
  for (const k of ['blocked', 'water', 'walls']) {
    const onlyA = [...A[k]].filter(t => !B[k].has(t)), onlyB = [...B[k]].filter(t => !A[k].has(t));
    out[k] = { a: A[k].size, b: B[k].size, shared: A[k].size - onlyA.length, onlyA: onlyA.slice(0, 40), onlyB: onlyB.slice(0, 40), onlyACount: onlyA.length, onlyBCount: onlyB.length };
  }
  return out;
}

module.exports = { footprint, rotCell, rotSide, placeCells, mergeRects, mergeWalls, expandRects, expandWalls, expandRuns, compile, compareMaps, KINDS, KIND_COLOURS };

if (require.main === module) {
  const args = process.argv.slice(2), file = args[0];
  need(file, 'usage: node tools/scarlands_kit.js <layout.json> [--map out.json] [--placement out.json] [--compare map.json]');
  const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const layout = readJSON(file); layout.__file = path.relative(ROOT, path.resolve(file)).split(path.sep).join('/');
  const kit = readJSON(layout.kit), base = readJSON(layout.base);
  const { map, placement } = compile(layout, kit, base);
  const write = (p, o, compact) => { const f = path.isAbsolute(p) ? p : path.join(ROOT, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, compact ? JSON.stringify(o) + '\n' : JSON.stringify(o, null, 1) + '\n'); };
  if (opt('--map')) write(opt('--map'), map);
  if (opt('--placement')) write(opt('--placement'), placement, true);
  const summary = { name: map.name, pieces: placement.pieces.length, kinds: Object.keys(placement.counts).length, blockedRects: map.blocked.length, waterRects: map.water.length, wallRuns: map.walls.length };
  if (opt('--compare')) summary.compare = compareMaps(readJSON(opt('--compare')), map);
  console.log(JSON.stringify(summary, null, 1));
}
