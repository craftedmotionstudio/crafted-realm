/* Measure the live Tutor's Holm (Sept 13 base, old-school arrival pack v3 terrain) with the same
 * metrics as rs04_measure.py so the two can be compared.  Read-only; prints a summary.
 *   node scratchpad/world_layout_study/holm_measure.js
 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const Terrain = require(path.join(ROOT, 'src', 'holm_overhaul_terrain.js'));
const SRC = path.join(ROOT, '.studio-workspaces/holm-arrival-package-oldschool-v3/exports/9348a2aba6c3f2c8/files/assets/world/authoring/holm-overhaul.terrain.json');
const src = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const B = Terrain.compile(src);
const W = B.width, D = B.depth;
const P = console.log;
const pct = (a, qs) => { const s = a.slice().sort((x, y) => x - y); const o = {}; qs.forEach(q => { o[q] = +s[Math.min(s.length - 1, Math.floor(q / 100 * (s.length - 1) + .5))].toFixed(2); }); return o; };

// tile centre height + water kind
const H = [], Wt = [];
for (let x = 0; x < W; x++) { H.push([]); Wt.push([]); for (let z = 0; z < D; z++) { H[x].push(Terrain.sample(B, x + .5, z + .5)); Wt[x].push(B.water[z * W + x]); } }
const dry = (x, z) => x >= 0 && z >= 0 && x < W && z < D && Wt[x][z] === 0;
let n = 0, xs = [], zs = [], hs = [], creek = 0;
for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) { if (Wt[x][z] === 2) creek++; if (dry(x, z)) { n++; xs.push(x); zs.push(z); hs.push(H[x][z]); } }
P('== TUTOR\'S HOLM (live Sept 13 terrain, 144x128 lattice)');
P('dry tiles', n, 'creek tiles', creek, 'bbox x', Math.min(...xs), Math.max(...xs), 'z', Math.min(...zs), Math.max(...zs), 'w', Math.max(...xs) - Math.min(...xs) + 1, 'h', Math.max(...zs) - Math.min(...zs) + 1);
P('heights (tiles) pct', pct(hs, [0, 5, 25, 50, 75, 95, 100]));
const bands = []; hs.forEach(h => { const b = Math.max(0, Math.floor(h)); bands[b] = (bands[b] || 0) + 1; });
P('1-tile band shares', Array.from(bands, v => +((v || 0) / n).toFixed(3)));
// slope: max rise to +x / +z dry neighbour
const sl = [];
for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) if (dry(x, z)) {
  let m = 0; if (dry(x + 1, z)) m = Math.max(m, Math.abs(H[x + 1][z] - H[x][z])); if (dry(x, z + 1)) m = Math.max(m, Math.abs(H[x][z + 1] - H[x][z])); sl.push(m);
}
const band = (lo, hi) => +(sl.filter(s => s >= lo && s < hi).length / sl.length).toFixed(3);
P('slope bands: flat<1/16', band(0, 1 / 16), 'gentle', band(1 / 16, .25), 'moderate', band(.25, .5), 'steep', band(.5, 1), 'cliff>1', band(1, 99));
P('max single-tile rise', Math.max(...sl).toFixed(2));
// distance from shore vs height (BFS rings from sea)
const dist = Array.from({ length: W }, () => new Array(D).fill(-1)); let q = [];
for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) if (Wt[x][z] === 1) { dist[x][z] = 0; q.push([x, z]); }
while (q.length) { const nq = []; for (const [x, z] of q) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = z + dz; if (a >= 0 && b >= 0 && a < W && b < D && dist[a][b] < 0) { dist[a][b] = dist[x][z] + 1; nq.push([a, b]); } } q = nq; }
for (const [lo, hi] of [[0, 2], [2, 5], [5, 10], [10, 20], [20, 40]]) {
  const v = []; for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) if (dry(x, z) && dist[x][z] > lo && dist[x][z] <= hi) v.push(H[x][z]);
  if (v.length) P('  dist from shore', lo + '-' + hi, 'mean h', (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2), 'p10/p90', JSON.stringify(pct(v, [10, 90])), 'n', v.length);
}
// relief per 32x32 block
const rel = [];
for (let bx = 0; bx < W; bx += 32) for (let bz = 0; bz < D; bz += 32) { const v = []; for (let x = bx; x < bx + 32; x++) for (let z = bz; z < bz + 32; z++) if (dry(x, z)) v.push(H[x][z]); if (v.length > 300) { const p = pct(v, [2, 98]); rel.push(+(p[98] - p[2]).toFixed(2)); } }
P('relief per 32x32 block (p2-p98, tiles)', rel.join(' '));

// places, pads
const plan = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/holm_island/data/plan.json'), 'utf8'));
const places = plan.places;
P('\n== BUILDINGS (plan footprints)');
const gap = (a, b) => Math.max(0, Math.max(Math.abs(a.x - b.x) - (a.w + b.w) / 2, Math.abs(a.z - b.z) - (a.d + b.d) / 2));
places.forEach(p => { const nn = Math.min(...places.filter(o => o !== p).map(o => gap(p, o))); P('  %s %dx%d area %d  pad h %s  nearest other building gap %s', p.id.padEnd(9), p.w, p.d, p.w * p.d, p.height, nn.toFixed(0)); });
// bridges from data
const bridges = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/holm_island/data/island-bridges.json'), 'utf8')).bridges;
const deck = new Set(); bridges.forEach(b => b.tiles.forEach(t => deck.add(t[0] + ',' + t[1])));
const walk = (x, z) => dry(x, z) || deck.has(x + ',' + z);
function bfs(a, b) {
  const snap = p => { let best = null, bd = 1e9; for (let x = Math.floor(p[0]) - 8; x <= p[0] + 8; x++) for (let z = Math.floor(p[1]) - 8; z <= p[1] + 8; z++) if (walk(x, z)) { const d = Math.hypot(x - p[0], z - p[1]); if (d < bd) { bd = d; best = [x, z]; } } return best; };
  const s = snap(a), t = snap(b); const dd = new Map(); dd.set(s + '', 0); let fr = [s];
  while (fr.length) { const nf = []; for (const [x, z] of fr) { const dv = dd.get(x + ',' + z) + 1; for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { if (!dx && !dz) continue; const a2 = x + dx, b2 = z + dz; if (!walk(a2, b2) || dd.has(a2 + ',' + b2)) continue; if (dx && dz && !(walk(x + dx, z) && walk(x, z + dz))) continue; dd.set(a2 + ',' + b2, dv); nf.push([a2, b2]); } } fr = nf; }
  return dd.get(t + '');
}
const at = id => { const p = places.find(o => o.id === id); return [p.x, p.z]; };
const ROUTE = [['landing', 'Bram (guide house)'], ['guide', 'Wenna (survival camp)'], ['survival', 'Hettie (bakehouse)'], ['kitchen', 'Ansel (quest lodge)'], ['quest', 'Durgin (quarry gate)'], ['mine', '(cavern, back up same shaft) -> Corrick (keep)'], ['keep', 'Maud (bank)'], ['bank', 'Ilse (mage)'], ['mage', 'Aldous (Lastlight)'], ['lastlight', 'Tobin (haven)'], ['ferry', '']];
P('\n== ROUTE legs (8-dir BFS over dry tiles + bridge decks, pad centre to pad centre)');
let tot = 0;
for (let i = 0; i + 1 < ROUTE.length; i++) {
  const a = ROUTE[i][0], b = ROUTE[i + 1][0]; const d = bfs(at(a), at(b)); tot += d;
  const ha = places.find(o => o.id === a).height, hb = places.find(o => o.id === b).height;
  P('  %s -> %s  %d tiles  walk %ds run %ds  pad h %s -> %s   (%s)', a.padEnd(9), b.padEnd(9), d, Math.round(d * .6), Math.round(d * .3), ha, hb, ROUTE[i][1]);
}
P('  surface total', tot, 'tiles', Math.round(tot * .6) + 's walk', Math.round(tot * .3) + 's run');
// creek crossing detour
P('  guide->survival without bridges would be', (() => { deck.clear(); const d = bfs(at('guide'), at('survival')); bridges.forEach(b => b.tiles.forEach(t => deck.add(t[0] + ',' + t[1]))); return d; })(), 'tiles');

// paths
const pathsJs = fs.readFileSync(path.join(ROOT, 'src/holm_island_paths_data.js'), 'utf8');
const tiles = JSON.parse(pathsJs.match(/tiles:(\{[^}]*\})/)[1]);
const pk = Object.keys(tiles), worn = pk.filter(k => tiles[k] >= 1);
P('\n== PATHS: path tiles', pk.length, '(worn centre', worn.length + ')', 'share of dry land', (pk.length / n).toFixed(3), 'centre-only share', (worn.length / n).toFixed(3));
const ps = new Set(worn);
const wid = [];
worn.forEach(k => { const [x, z] = k.split(',').map(Number); let h = 1, v = 1; for (let i = 1; ps.has((x + i) + ',' + z); i++) h++; for (let i = 1; ps.has((x - i) + ',' + z); i++) h++; for (let i = 1; ps.has(x + ',' + (z + i)); i++) v++; for (let i = 1; ps.has(x + ',' + (z - i)); i++) v++; wid.push(Math.min(h, v)); });
const wc = {}; wid.forEach(w => { const k = Math.min(w, 9); wc[k] = (wc[k] || 0) + 1; });
P('  worn path width distribution', JSON.stringify(Object.fromEntries(Object.entries(wc).map(([k, v]) => [k, +(v / wid.length).toFixed(3)]))));

// vegetation
const veg = JSON.parse(fs.readFileSync(path.join(ROOT, '.studio-workspaces/holm-habitat-v4/working/vegetation.json'), 'utf8')).placements;
const treesA = veg.filter(p => /oak|birch|pine/.test(p.asset));
P('\n== VEGETATION: placements', veg.length, 'trees', treesA.length, 'trees/100 dry tiles', (treesA.length / n * 100).toFixed(2));
const nnd = treesA.map(t => Math.min(...treesA.filter(o => o !== t).map(o => Math.hypot(o.x - t.x, o.z - t.z))));
P('  tree nearest-neighbour spacing', JSON.stringify(pct(nnd, [10, 25, 50, 75, 90])), 'clumped share(<=1.5)', (nnd.filter(d => d <= 1.5).length / nnd.length).toFixed(2));
const cnt = {}; veg.forEach(p => cnt[p.asset] = (cnt[p.asset] || 0) + 1); P('  by asset', JSON.stringify(cnt));
// sight lines: distances between landmarks vs 25-tile draw distance
P('\n== LANDMARK distances (straight tiles)');
const L = ['landing', 'guide', 'survival', 'kitchen', 'quest', 'mine', 'keep', 'bank', 'mage', 'lastlight', 'ferry'];
L.forEach(a => P('  %s %s', a.padEnd(9), L.map(b => String(Math.round(Math.hypot(at(a)[0] - at(b)[0], at(a)[1] - at(b)[1])))).map(s => s.padStart(4)).join('')));
// creek profile
P('\n== CREEK: points', src.creek.points.length, 'water line from', src.creek.points[0][2], 'to', src.creek.points[src.creek.points.length - 1][2], 'width', 2 * src.creek.halfWidth, 'bank', src.creek.bankWidth, 'depth', src.creek.depth);
let clen = 0; for (let i = 1; i < src.creek.points.length; i++) clen += Math.hypot(src.creek.points[i][0] - src.creek.points[i - 1][0], src.creek.points[i][1] - src.creek.points[i - 1][1]);
P('  length', clen.toFixed(0), 'tiles, mean fall', (src.creek.points[0][2] / clen).toFixed(3), 'per tile');
