/* Tutor's Holm v2 LAND PROPOSAL (study only, not game code).
 *
 * Same 144x128 frame, coast and building sites as the live Sept 13 terrain, re-shaped with the
 * WORLD_LAYOUT_GUIDE principles: terraces not domes, steep banks and sea cliffs, a creek ravine with a mill
 * cascade, and a recessed fishing hollow.  It sketches the four source features the live compiler does not
 * have yet (plateau edges, basins with a pond level, hillside dimples, creek steps) so the numbers in the guide
 * can be checked.  The engineer ports these features into src/holm_overhaul_terrain.js properly.
 *
 *   node scratchpad/world_layout_study/holm_v2_proposal.js      -> prints metrics, writes _holm_v2_grid.json
 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const LIVE = JSON.parse(fs.readFileSync(path.join(ROOT, '.studio-workspaces/holm-arrival-package-oldschool-v3/exports/9348a2aba6c3f2c8/files/assets/world/authoring/holm-overhaul.terrain.json'), 'utf8'));

// ------------------------------------------------------------------ the v2 source ---------------------------
const V2 = {
  coast: LIVE.coast,                       // footprint unchanged (owner-approved Sept 13 shape)
  base: 1.4,                               // lowland a little lower than v1's 2.0
  swell: { amp: 1.0, cell: 5 },            // 2004-style ground swell: std ~.5 tile, ~5-tile correlation
  shore: { beachWidth: 2.6 },              // steeper coast; coves keep gentle beaches through their pads
  // plateaus: flat top, steep rim.  edge = fraction of the radius used by the bank (small = cliff)
  plateaus: [
    { id: 'quarry-mesa', x: 35, z: 35, rx: 21, rz: 23, height: 7.6, edge: .42 },
    { id: 'keep-crag', x: 87, z: 33, rx: 20, rz: 19, height: 9.6, edge: .38 },
    { id: 'north-ridge', x: 61, z: 22, rx: 14, rz: 8, height: 5.0, edge: .45 },
    { id: 'lastlight-crown', x: 120, z: 26, rx: 18, rz: 19, height: 15.4, edge: .6 },
    { id: 'crown-shoulder', x: 121, z: 48, rx: 13, rz: 7, height: 4.6, edge: .5 },
    { id: 'east-hill', x: 112, z: 60, rx: 17, rz: 22, height: 5.8, edge: .40 },
    { id: 'bank-shoulder', x: 88, z: 57, rx: 17, rz: 14, height: 5.6, edge: .6 },
    { id: 'keep-apron', x: 91, z: 49, rx: 12, rz: 6, height: 7.6, edge: .5 },
    { id: 'west-shelf', x: 44, z: 62, rx: 20, rz: 20, height: 4.0, edge: .40 },
    { id: 'mill-rise', x: 70, z: 66, rx: 10, rz: 12, height: 2.4, edge: .6 },
    { id: 'guide-knoll', x: 67, z: 98, rx: 18, rz: 15, height: 3.1, edge: .45 },
    { id: 'survival-bench', x: 31, z: 84, rx: 14, rz: 11, height: 2.6, edge: .45 },
    { id: 'west-downs', x: 26.5, z: 97, rx: 13.5, rz: 11, height: 2.6, edge: .5 },
    { id: 'west-cliff-rim', x: 16, z: 64, rx: 7, rz: 20, height: 2.8, edge: .55 },
    { id: 'south-hummock-1', x: 92, z: 93, rx: 8, rz: 6, height: 1.6, edge: .7 },
    { id: 'south-hummock-2', x: 104, z: 84, rx: 6, rz: 6, height: 1.3, edge: .7 },
  ],
  // basins lower the ground; a basin with pond sets a flat water level for tiles below it
  basins: [
    { id: 'fishing-hollow', x: 26.5, z: 96, rx: 8, rz: 6, depth: 3.0, edge: .6, pond: 1.25 },
    { id: 'fishing-hollow-lobe', x: 31.5, z: 99, rx: 4.5, rz: 3.4, depth: 2.4, edge: .7, pond: 1.25 },
  ],
  // hillside dimples (the 2004 hollows in grass banks): [x, z, radius, depth], small and dry
  dimples: [[50, 42, 2.8, 1.0], [101, 44, 3.2, 1.1], [124, 50, 2.6, .9], [22, 50, 3, 1.0], [96, 70, 2.8, .8], [58, 84, 2.6, .8], [84, 86, 3, .8], [112, 102, 2.6, .7]],
  // flattened building terraces; blend 2-3 gives a crisp retaining bank instead of a 5-tile smear
  pads: [
    { id: 'landing', x: 61, z: 118, w: 10, d: 7, height: .9, blend: 4 },
    { id: 'guide', x: 66, z: 99, w: 14, d: 12, height: 4.4, blend: 2.5 },
    { id: 'survival', x: 31, z: 84, w: 12, d: 10, height: 4.0, blend: 2.5 },
    { id: 'fire-beach', x: 32.5, z: 101, w: 6, d: 2.5, height: 1.55, blend: 1.2 },
    { id: 'kitchen', x: 47, z: 67, w: 13, d: 10, height: 5.4, blend: 2.5 },
    { id: 'garden-terrace', x: 51.5, z: 61.5, w: 6, d: 5, height: 5.4, blend: 1.5 },
    { id: 'mill', x: 62.5, z: 64, w: 8, d: 7, height: 3.2, blend: 2 },
    { id: 'quest', x: 36, z: 51, w: 12, d: 10, height: 6.4, blend: 2.5 },
    { id: 'mine', x: 36, z: 33, w: 12, d: 10, height: 9.0, blend: 2.5 },
    { id: 'keep', x: 87, z: 35, w: 22, d: 20, height: 11.0, blend: 2.5 },
    { id: 'keep-watch-foundation', x: 80, z: 23, w: 8, d: 8, height: 11.0, blend: 2 },
    { id: 'keep-east-foundation', x: 96.65, z: 28, w: 7.5, d: 7.5, height: 11.0, blend: 2 },
    { id: 'bank', x: 86, z: 57, w: 13, d: 10, height: 7.0, blend: 2.5 },
    { id: 'mage', x: 114, z: 58, w: 14, d: 13, height: 7.6, blend: 2.5 },
    { id: 'lastlight', x: 121, z: 26, w: 12, d: 12, height: 17.5, blend: 3 },
    { id: 'beacon-cove', x: 104, z: 16, w: 9, d: 5, height: 1.0, blend: 3 },
    { id: 'holm-farm', x: 110, z: 95, w: 12, d: 9, height: 2.4, blend: 3 },
  ],
  // ramps: cardinal polylines [x,z,y]; the live compiler already has these as `grades` (max .4 per tile)
  grades: [
    { id: 'landing-to-guide', halfWidth: 1.5, blend: 2.5, points: [[61, 116, 1], [61, 111, 2.2], [66, 111, 3.2], [66, 106, 4.4]] },
    { id: 'hollow-descent', halfWidth: 1, blend: 1.5, points: [[33, 89.5, 4.0], [33, 92, 3.2], [36, 92, 2.4], [36, 96, 1.7], [36, 99.5, 1.55], [33, 99.5, 1.55]] },
    { id: 'keep-gate-approach', halfWidth: 1.5, blend: 2.5, points: [[95, 58, 6.6], [95, 50, 9.2], [89, 50, 10.4], [89, 46, 11]] },
    { id: 'crown-climb', halfWidth: 1, blend: 2, points: [[114, 51, 7.6], [114, 46, 8.6], [128, 46, 10.8], [128, 38, 13.2], [115, 38, 16.2], [115, 31, 17.5]] },
    { id: 'beacon-stair-head', halfWidth: 1, blend: 1.5, points: [[115, 31, 17.5], [111, 31, 16.3], [111, 22, 13.0]] },
  ],
  // creek: cascades in the ravine under the keep, one weir + cascade by the mill; `valley` keeps the land on
  // both banks above the water line (no perched channel)
  creek: { halfWidth: 1.2, bankWidth: 2.5, depth: .8, valley: { above: .9, rise: .12, radius: 10 }, points: [
    [72, 30, 6.0], [66, 37, 5.3], [70, 44, 4.4], [64, 50, 3.8], [62, 56.5, 3.3], [59.6, 60.3, 3.1],
    [58.4, 61.6, 2.0], [55, 64, 1.95], [57, 71, 1.85], [49, 77, 1.75], [48, 86, 1.55], [43, 91, 1.3], [45, 99, 1.0],
    [39, 107, .6], [39, 115, .25], [35, 118, 0]] },
};

// ------------------------------------------------------------------ evaluator (sketch) ----------------------
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
function seg(x, z, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1]; const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))); return { d: Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz), t }; }
function signedCoast(poly, x, z) { let inside = false, d = Infinity; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[j], b = poly[i]; d = Math.min(d, seg(x, z, a, b).d); if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside; } return inside ? d : -d; }
function line(points, x, z) { let best = { d: Infinity, y: 0 }; for (let i = 1; i < points.length; i++) { const a = points[i - 1], b = points[i], h = seg(x, z, a, b); if (h.d < best.d) best = { d: h.d, y: a[2] + (b[2] - a[2]) * h.t }; } return best; }
function hash(i, j) { let n = (i * 374761393 + j * 668265263) | 0; n = (n ^ (n >>> 13)) * 1274126177 | 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967296 - .5; }
function vnoise(x, z) { const i = Math.floor(x), j = Math.floor(z), fx = smooth(x - i), fz = smooth(z - j); const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1); return (a + (b - a) * fx) * (1 - fz) + (c + (d - c) * fx) * fz; }
function swell(x, z) { return vnoise(x, z) + .5 * vnoise(x * 2 + 17.3, z * 2 + 5.1); }
function evaluate(s, x, z) {
  const coast = signedCoast(s.coast, x, z);
  if (coast < 0) return { h: -2 * smooth(-coast / 4), water: 1 };
  let h = s.base;
  let top = 0; // plateaus unite (max), they do not stack: overlapping terraces make steps, not spikes
  for (const p of s.plateaus) { const r = Math.hypot((x - p.x) / p.rx, (z - p.z) / p.rz); top = Math.max(top, p.height * smooth((1 - r) / p.edge)); }
  h += top;
  for (const [dx, dz, r0, dep] of s.dimples) { const r = Math.hypot(x - dx, z - dz) / r0; h -= dep * smooth(1 - r); }
  if (s.swell) h += s.swell.amp * swell(x / s.swell.cell, z / s.swell.cell);
  let pond = null;
  for (const b of s.basins) { const r = Math.hypot((x - b.x) / b.rx, (z - b.z) / b.rz); const w = smooth((1 - r) / b.edge); h -= b.depth * w; if (b.pond !== undefined && r < 1) pond = b.pond; }
  h *= smooth(coast / s.shore.beachWidth);
  for (const p of s.pads) { const d = Math.hypot(Math.max(0, Math.abs(x - p.x) - p.w / 2), Math.max(0, Math.abs(z - p.z) - p.d / 2)); h += (p.height - h) * (1 - smooth(d / p.blend)); }
  for (const g of s.grades) { const hit = line(g.points, x, z); const w = 1 - smooth((hit.d - g.halfWidth) / g.blend); h += (hit.y - h) * w; }
  const c = s.creek, hit = line(c.points, x, z);
  if (c.valley && hit.d < c.valley.radius) {
    const inner = c.halfWidth + c.bankWidth, v = c.valley;
    const target = hit.y + v.above + v.rise * Math.max(0, hit.d - inner);
    const w = 1 - smooth((hit.d - inner) / (v.radius - inner));
    if (target > h) h += (target - h) * w;
  }
  let water = 0;
  if (hit.d < c.halfWidth + c.bankWidth) {
    const bed = hit.y - c.depth, lip = hit.y + .3, t = (hit.d - c.halfWidth) / c.bankWidth;
    if (t <= 0) h = bed; else if (t < .5) h = bed + (lip - bed) * smooth(t * 2); else h = lip + (h - lip) * smooth((t - .5) * 2);
    if (hit.d <= c.halfWidth && h < hit.y) water = 2;
  }
  if (!water && pond !== null && h < pond) water = 3;
  return { h, water, pond };
}

// ------------------------------------------------------------------ compile + measure ----------------------
const W = 144, D = 128, H = [], WT = [];
for (let z = 0; z < D; z++) { H.push([]); WT.push([]); for (let x = 0; x < W; x++) { const v = evaluate(V2, x + .5, z + .5); H[z].push(+v.h.toFixed(3)); WT[z].push(v.water); } }
const dry = (x, z) => x >= 0 && z >= 0 && x < W && z < D && WT[z][x] === 0;
const P = console.log;
const pct = (a, qs) => { const s = a.slice().sort((p, q) => p - q); const o = {}; qs.forEach(q => { o[q] = +s[Math.min(s.length - 1, Math.floor(q / 100 * (s.length - 1) + .5))].toFixed(2); }); return o; };
const hs = [], sl = [];
let pondTiles = 0, creekTiles = 0;
for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
  if (WT[z][x] === 3) pondTiles++; if (WT[z][x] === 2) creekTiles++;
  if (!dry(x, z)) continue; hs.push(H[z][x]);
  let m = 0; if (dry(x + 1, z)) m = Math.max(m, Math.abs(H[z][x + 1] - H[z][x])); if (dry(x, z + 1)) m = Math.max(m, Math.abs(H[z + 1][x] - H[z][x])); sl.push(m);
}
const band = (lo, hi) => +(sl.filter(s => s >= lo && s < hi).length / sl.length).toFixed(3);
P('== HOLM v2 PROPOSAL (sketch evaluator)');
P('dry tiles', hs.length, 'pond tiles', pondTiles, 'creek tiles', creekTiles);
P('heights pct', JSON.stringify(pct(hs, [0, 5, 25, 50, 75, 95, 100])));
const bands = []; hs.forEach(h => { const b = Math.max(0, Math.floor(h)); bands[b] = (bands[b] || 0) + 1; });
P('1-tile band shares', JSON.stringify(Array.from(bands, v => +((v || 0) / hs.length).toFixed(3))));
P('slope bands: flat', band(0, 1 / 16), 'gentle', band(1 / 16, .25), 'moderate', band(.25, .5), 'steep', band(.5, 1), 'cliff>1', band(1, 99), ' (walk limit 1.05: share above', band(1.05, 99) + ')');
const rel = []; for (let bx = 0; bx < W; bx += 32) for (let bz = 0; bz < D; bz += 32) { const v = []; for (let x = bx; x < bx + 32; x++) for (let z = bz; z < bz + 32; z++) if (dry(x, z)) v.push(H[z][x]); if (v.length > 300) { const p = pct(v, [2, 98]); rel.push(+(p[98] - p[2]).toFixed(1)); } }
P('relief per 32x32 block', rel.join(' '), ' median', pct(rel, [50])[50]);
// pond geometry
const pw = []; for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (WT[z][x] === 3) pw.push([x, z]);
if (pw.length) {
  const xs = pw.map(p => p[0]), zs = pw.map(p => p[1]);
  const rim = []; for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (dry(x, z)) { const dd = Math.min(...pw.map(p => Math.hypot(p[0] - x, p[1] - z))); if (dd >= 4 && dd <= 6) rim.push(H[z][x]); }
  P('pond bbox', Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs), 'water level', V2.basins[0].pond, 'ground 4-6 tiles from water: pct', JSON.stringify(pct(rim, [10, 50, 90])));
}
// heights at key sites
const at = (x, z) => H[Math.floor(z)][Math.floor(x)];
const sites = { landing: [61, 118], guide: [66, 99], survival: [31, 84], 'fire beach': [30, 101.5], 'pond centre': [27.5, 96.5], kitchen: [47, 67], 'garden terrace': [51.5, 61.5], mill: [62, 64], 'wheel (creek below weir)': [58.4, 61.8], quest: [36, 51], mine: [36, 33], keep: [87, 35], 'creek under keep (66,37)': [66.5, 37.5], bank: [86, 57], mage: [114, 58], lastlight: [121, 26], 'beacon cove': [104, 16], 'old haven site': [124, 103], farm: [110, 95], 'timber bridge site': [46, 87.5], 'stone bridge site': [62.5, 53.5] };
P('site heights', JSON.stringify(Object.fromEntries(Object.entries(sites).map(([k, [x, z]]) => [k, +at(x, z).toFixed(2)]))));
fs.writeFileSync(path.join(__dirname, '_holm_v2_grid.json'), JSON.stringify({ h: H, water: WT.map(r => r.map(v => v === 3 ? 2 : v)), marks: [
  { x: 27.5, z: 96.5, label: 'fishing hollow (pond 1.25)', color: '#003399' }, { x: 58.4, z: 61.8, label: 'mill wheel + weir', color: '#003399', marker: 's' },
  { x: 51.5, z: 61.5, label: 'garden terrace', color: '#1b5e20', marker: '^' }, { x: 80, z: 81, label: 'broken carriage', color: '#4e342e', marker: 'x' },
  { x: 88, z: 42, label: 'cave exit ladder (keep undercroft)', color: '#4a148c', marker: 'D' }, { x: 108, z: 20, label: 'beacon stair', color: '#4a148c', marker: 'v' }, { x: 45, z: 92, label: 'old fishing stage -> jetty scenery', color: '#555', marker: '.' }], places: [...require(path.join(ROOT, 'assets/holm_island/data/plan.json')).places.filter(p => p.id !== 'ferry').map(p => ({ id: p.id, x: p.x, z: p.z, w: p.w, d: p.d })), { id: 'mill', label: 'MILL', x: 62.5, z: 64, w: 8, d: 7 }, { id: 'cove', label: 'beacon cove (haven)', x: 104, z: 16, w: 9, d: 5 }, { id: 'farm', label: 'farm (old haven site)', x: 110, z: 95, w: 12, d: 9 }],
  paths: [...require(path.join(ROOT, 'assets/holm_island/data/plan.json')).paths, ...V2.grades.map(g => ({ kind: 'primary', points: g.points.map(p => [p[0], p[1]]) }))] }));
module.exports = { V2, evaluate };
// diagnostics: where the >1 tiles are
{
  let coastC = 0, inC = 0;
  const sea = []; for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (WT[z][x] === 1) sea.push([x, z]);
  const nearSea = (x, z) => { for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) { const a = x + dx, b = z + dz; if (a >= 0 && b >= 0 && a < W && b < D && WT[b][a] === 1) return true; } return false; };
  for (let z = 0; z < D - 1; z++) for (let x = 0; x < W - 1; x++) if (dry(x, z)) { let m = 0; if (dry(x + 1, z)) m = Math.max(m, Math.abs(H[z][x + 1] - H[z][x])); if (dry(x, z + 1)) m = Math.max(m, Math.abs(H[z + 1][x] - H[z][x])); if (m >= 1) { if (nearSea(x, z)) coastC++; else inC++; } }
  P('cliff tiles: within 3 of sea', coastC, ' inland', inC);
}
// route legs on the v2 land: 8-dir BFS over dry tiles, a step between tile centres must be <= 1.05 (MAX_SURFACE_STEP)
{
  const deck = new Set(); [[43, 49, 87], [61, 64, 53]].forEach(([a, b, z]) => { for (let x = a; x <= b; x++) deck.add(x + ',' + z); });
  for (let x = 57; x <= 60; x++) deck.add(x + ',61'); // mill weir walkway (proposed)
  const ok = (x, z) => x >= 0 && z >= 0 && x < W && z < D && (WT[z][x] === 0 || deck.has(x + ',' + z));
  const step = (a, b, c, d) => deck.has(a + ',' + b) || deck.has(c + ',' + d) || Math.abs(H[b][a] - H[d][c]) <= 1.05;
  function bfs(s, t) {
    const snap = p => { let best = null, bd = 1e9; for (let x = Math.floor(p[0]) - 6; x <= p[0] + 6; x++) for (let z = Math.floor(p[1]) - 6; z <= p[1] + 6; z++) if (ok(x, z)) { const dd = Math.hypot(x - p[0], z - p[1]); if (dd < bd) { bd = dd; best = [x, z]; } } return best; };
    const a = snap(s), b = snap(t), dist = new Map([[a + '', 0]]); let fr = [a];
    while (fr.length) { const nf = []; for (const [x, z] of fr) { const dv = dist.get(x + ',' + z) + 1; for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { if (!dx && !dz) continue; const X = x + dx, Z = z + dz; if (!ok(X, Z) || dist.has(X + ',' + Z) || !step(x, z, X, Z)) continue; if (dx && dz && !(ok(x + dx, z) && ok(x, z + dz) && step(x, z, x + dx, z) && step(x, z, x, z + dz))) continue; dist.set(X + ',' + Z, dv); nf.push([X, Z]); } } fr = nf; }
    return dist.get(b + '');
  }
  const R = [['landing', [61, 118]], ['guide (Bram)', [66, 99]], ['survival camp (Wenna)', [31, 84]], ['fire beach / pond', [33, 100]], ['bakehouse (Hettie)', [47, 67]], ['garden terrace', [51.5, 61.5]], ['quest lodge (Ansel)', [36, 51]], ['quarry gate (Durgin)', [36, 38]],
    ['| cave |', null], ['keep court (Corrick)', [87, 40]], ['bank (Maud)', [86, 57]], ['mage (Ilse)', [114, 58]], ['Lastlight (Aldous)', [121, 30]], ['beacon stair head', [111, 22]]];
  P('\n== v2 ROUTE (slope-limited BFS, pad centres)');
  let tot = 0;
  for (let i = 0; i + 1 < R.length; i++) {
    if (!R[i][1] || !R[i + 1][1]) { if (!R[i + 1][1]) P('  ' + R[i][0] + ' -> cave: underground mine, furnace, anvil, then the new exit ladder into the keep undercroft'); continue; }
    const d = bfs(R[i][1], R[i + 1][1]); tot += d || 0;
    const ha = H[Math.floor(R[i][1][1])][Math.floor(R[i][1][0])], hb = H[Math.floor(R[i + 1][1][1])][Math.floor(R[i + 1][1][0])];
    P('  %s -> %s  %s tiles  walk %ss  height %s -> %s (%s)', R[i][0].padEnd(22), R[i + 1][0].padEnd(22), d, d ? Math.round(d * .6) : '-', ha.toFixed(1), hb.toFixed(1), (hb - ha >= 0 ? '+' : '') + (hb - ha).toFixed(1));
  }
  P('  + beacon stair structure to the cove ~12 tiles; surface total', tot + 12, 'tiles (', Math.round((tot + 12) * .6), 's walk )');
  P('  reach without bridges: guide->survival', (() => { const saved = [...deck]; deck.clear(); const d = bfs([66, 99], [31, 84]); saved.forEach(k => deck.add(k)); return d; })());
}
