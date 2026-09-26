#!/usr/bin/env node
/* The Scarlands proof layout (W2/W3, 2026-09-26): the kit laid out over server/data/maps/scarlands_test.json.
 * Kept from the test map: bounds, respawn, areas, spawns (and any other keys), the Ditch on rows 44-45 with its two
 * crossings (x 15-16 and 47-48), the long ruined wall on row 70 (gap at x 20), the ruined room x 26-36 / z 84-92 with
 * its three gaps, and every Scarlands blocker rectangle (rocks, a cart camp). The Commons (south of the Ditch) keeps its
 * collision as "extra" (it belongs to another kit). Added: dressing (bones, rubble, dead shrubs), a few dead trees,
 * the lip wall and warning signs at the crossings, depth stones every 8 rows along the two roads north, paths and the
 * ground kinds. Writes docs/rebuild/scarlands/proof_layout.json.
 * Run: node tools/make_scarlands_proof_layout.js */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
let seed = 20260926;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pieces = [], P = (piece, x, z, rot) => pieces.push({ piece, x, z, rot: rot || 0 });
const taken = new Set(), take = (x, z, w, d) => { for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) taken.add((x + i) + ',' + (z + j)); };
const free = (x, z, w, d) => { for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) if (taken.has((x + i) + ',' + (z + j))) return false; return true; };

// ---- the Ditch: rows 44-45, a plank crossing at x 15-16 and a stone causeway at x 47-48 ----
const runs = [{ name: 'the Ditch', piece: 'ditch_straight', from: [1, 44], to: [62, 44], rot: 0, skip: [[14, 17], [46, 49]] }];
P('ditch_end', 0, 44, 0); P('ditch_end', 63, 44, 2);
P('ditch_straight', 14, 44); P('ditch_straight', 17, 44);
P('ditch_crossing_planks', 15, 44, 0);
P('ditch_end', 46, 44, 2); P('ditch_end', 49, 44, 0);   // the trench closes on both sides of the filled causeway
P('ditch_crossing_stone', 47, 44, 0);
for (let x = 0; x < 64; x++) take(x, 44, 1, 2);
// the lip wall is a broken rim: stretches of two to five tiles with gaps, never a continuous wall line (v2)
for (let x = 0; x < 64; x++) { if ((x >= 14 && x <= 17) || (x >= 46 && x <= 49)) continue; if (((Math.sin(x * 12.9898) * 43758.5453) % 1 + 1) % 1 < 0.58) P('ditch_lip_wall', x, 43, 0); }   // own hash: the rest of the layout keeps its random sequence
P('wild_warning_sign', 13, 41, 0); take(13, 41, 1, 1);
P('wild_warning_sign', 50, 41, 0); take(50, 41, 1, 1);
// just over each crossing: the first bones a traveller sees, and a cold camp where someone waited for them
P('bones_skeleton', 14, 47, 1); take(14, 47, 1, 1); P('bones_skull', 18, 48, 3); take(18, 48, 1, 1);
P('bones_pile', 50, 48, 0); take(50, 48, 1, 1); P('camp_fire_remnant', 52, 50); take(52, 50, 1, 1); P('camp_crates_burnt', 53, 51, 1); take(53, 51, 1, 1);

// ---- the long ruined wall on the north edge of row 70, gap at x 20 ----
for (let x = 8; x <= 32; x++) {
  if (x === 20) continue;
  const end = x === 19 || x === 32, low = !end && rnd() < 0.35;
  P(end ? 'ruin_wall_end' : low ? 'ruin_wall_low' : 'ruin_wall', x, 70, 0);
}
P('rubble_small', 20, 71); P('rubble_small', 11, 69); P('rubble_small', 27, 71);

// ---- the ruined room x 26-36, z 84-92 (south door x 30, north gap x 33, east gap z 89) ----
P('ruin_wall_corner', 26, 84, 2); P('ruin_wall_corner', 26, 92, 3); P('ruin_wall_corner', 36, 84, 1); P('ruin_wall_corner', 36, 92, 0);
for (let x = 27; x <= 35; x++) { if (x !== 30) P(x === 29 || x === 31 ? 'ruin_wall_end' : 'ruin_wall', x, 84, 2); if (x !== 33) P(x === 32 || x === 34 ? 'ruin_wall_low' : 'ruin_wall', x, 92, 0); }
for (let z = 85; z <= 91; z++) { P(z % 3 ? 'ruin_wall' : 'ruin_wall_low', 26, z, 3); if (z !== 89) P(z === 88 || z === 90 ? 'ruin_wall_end' : 'ruin_wall', 36, z, 1); }
P('bones_skeleton', 29, 88, 1); P('rubble_small', 33, 86); P('bones_skull', 34, 90, 2); P('camp_fire_remnant', 31, 90); take(31, 90, 1, 1);
P('ruin_pillar', 22, 86); take(22, 86, 1, 1); P('ruin_pillar_broken', 22, 90); take(22, 90, 1, 1);   // the old portico
P('ruin_arch', 29, 96, 0); take(29, 96, 3, 1);   // a gateway north of the room

// ---- the test map's Scarlands blockers, dressed with the kit ----
P('rock_outcrop', 40, 60); P('rubble_large', 42, 60); P('rubble_large', 40, 62); P('rock_outcrop', 42, 62); take(40, 60, 4, 4);
P('rock_outcrop', 6, 90); P('rock_outcrop', 8, 90); P('rock_boulder', 6, 92); P('dead_tree_snag', 7, 92); P('stump_charred', 8, 92); P('rock_boulder', 9, 92); take(6, 90, 4, 3);
P('rock_outcrop', 58, 75); P('dead_tree_tall', 60, 75); P('stump_split', 60, 76); take(58, 75, 3, 2);
P('rubble_large', 22, 78); take(22, 78, 2, 2);
P('camp_tent_ruin', 52, 116, 1); P('camp_crates_burnt', 54, 116); P('camp_fire_remnant', 54, 117); take(52, 116, 3, 2);
P('cart_broken', 49, 112, 1); take(49, 112, 1, 2);

// ---- depth stones every 8 rows along the two roads north (levels 1..9) ----
for (let z = 48; z <= 112; z += 8) { P('depth_stone', 19, z); take(19, z, 1, 1); P('depth_stone', 45, z); take(45, z, 1, 1); }

// ---- dead trees, shrubs, bones: scattered on free tiles away from roads and the Ditch lip ----
const ROADS = [[[16, 46], [17, 60], [21, 70.5], [26, 78], [30, 84]], [[48, 46], [47, 70], [46, 90], [47, 100], [50, 112]], [[30, 93], [30.5, 96], [30.5, 104]]];
const seg = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l)); return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz); };
const road = (x, z) => ROADS.some(r => r.some((p, k) => k && seg(x + .5, z + .5, r[k - 1], p) < 2.6));
const trees = ['dead_tree_tall', 'dead_tree_bent', 'dead_tree_split', 'dead_tree_snag'];
// dead groves: a few clusters of 3-6 trees (a burnt wood reads better than trees sprinkled evenly), plus strays
const keepOut = (x, z) => road(x, z) || (x >= 25 && x <= 37 && z >= 83 && z <= 97) || (x >= 7 && x <= 33 && z >= 69 && z <= 71) || (x >= 13 && x <= 19 && z >= 99 && z <= 104) || z < 49 || z > 125 || x < 0 || x > 63;
let placedTrees = 0;
const groves = [[6, 58, 5], [56, 64, 4], [11, 80, 5], [58, 96, 5], [36, 110, 6], [5, 118, 4], [26, 60, 3], [40, 76, 3]];
groves.forEach(([gx, gz, n]) => {
  for (let k = 0, got = 0; k < 60 && got < n; k++) {
    const x = gx + Math.round((rnd() - .5) * 7), z = gz + Math.round((rnd() - .5) * 7);
    if (keepOut(x, z) || !free(x, z, 1, 1) || !free(x - 1, z - 1, 3, 3) && rnd() < .6) continue;
    P(trees[placedTrees % 4], x, z, Math.floor(rnd() * 4)); take(x, z, 1, 1); placedTrees++; got++;
    if (rnd() < .45) { const sx = x + (rnd() < .5 ? -1 : 1), sz = z + (rnd() < .5 ? -1 : 1); if (!keepOut(sx, sz) && free(sx, sz, 1, 1)) { P(rnd() < .5 ? 'stump_charred' : 'stump_split', sx, sz, Math.floor(rnd() * 4)); take(sx, sz, 1, 1); } }
  }
});
for (let k = 0; k < 300 && placedTrees < 44; k++) {
  const x = Math.floor(rnd() * 64), z = 49 + Math.floor(rnd() * 76);
  if (keepOut(x, z) || !free(x - 1, z - 1, 3, 3)) continue;
  P(trees[placedTrees % 4], x, z, Math.floor(rnd() * 4)); take(x, z, 1, 1); placedTrees++;
}
// scattered dark rock: a few outcrops and boulders out in the open (cover to fight around)
for (let k = 0, got = 0; k < 300 && got < 14; k++) {
  const big = got < 4, x = Math.floor(rnd() * 62), z = 50 + Math.floor(rnd() * 74);
  if (keepOut(x, z) || !free(x - 1, z - 1, big ? 4 : 3, big ? 4 : 3)) continue;
  P(big ? 'rock_outcrop' : 'rock_boulder', x, z, Math.floor(rnd() * 4)); take(x, z, big ? 2 : 1, big ? 2 : 1); got++;
}
for (let k = 0; k < 600 && pieces.filter(p => /shrub|bones|rubble_small/.test(p.piece)).length < 60; k++) {
  const x = Math.floor(rnd() * 64), z = 47 + Math.floor(rnd() * 80);
  if (!free(x, z, 1, 1) || road(x, z) && rnd() < 0.7 || (x >= 14 && x <= 18 && z >= 100 && z <= 103)) continue;
  const r = rnd(), piece = r < 0.5 ? 'dead_shrub' : r < 0.7 ? 'rubble_small' : r < 0.85 ? 'bones_skull' : r < 0.95 ? 'bones_pile' : 'bones_skeleton';
  P(piece, x, z, Math.floor(rnd() * 4)); take(x, z, 1, 1);
}

const layout = {
  schema: 'crafted-realm-scarlands-layout-v1', name: 'scarlands_kit_proof',
  about: 'The Scarlands kit laid over the W1 test map (tools/make_scarlands_proof_layout.js): the Commons (safe), the Ditch with a plank crossing and a stone causeway, and the 64x64 Scarlands pocket with its ruins, rocks, camp and dressing. Collision is generated from the placed pieces (tools/scarlands_kit.js).',
  base: 'server/data/maps/scarlands_test.json', kit: '.studio-workspaces/scarlands-kit-v2/candidates/manifest.json',
  pieces, runs,
  extra: {
    blocked: [[5, 5, 6, 6], [50, 20, 51, 21], [12, 30, 12, 30], [40, 34, 41, 34], [31, 12, 32, 13]],
    water: [[14, 100, 18, 103]],
    walls: [[20, 18, 22, 18, 'S'], [24, 18, 27, 18, 'S'], [20, 25, 27, 25, 'N'], [20, 18, 20, 25, 'W'], [27, 18, 27, 25, 'E']],
    about: 'The Commons trees, rocks and building and the Scarlands pool keep their test-map collision; they belong to other kits.' },
  ground: {
    default: 'scorched_earth',
    rects: [{ kind: 'grass', x1: 0, z1: 0, x2: 63, z2: 43 }, { kind: 'dark_rock', x1: 39, z1: 59, x2: 44, z2: 64 }, { kind: 'dark_rock', x1: 5, z1: 89, x2: 10, z2: 93 },
      { kind: 'dark_rock', x1: 57, z1: 74, x2: 61, z2: 77 }, { kind: 'bone_dirt', x1: 27, z1: 85, x2: 35, z2: 91 }, { kind: 'bone_dirt', x1: 51, z1: 115, x2: 55, z2: 118 }],
    patches: [{ kind: 'ash', area: { x1: 0, z1: 50, x2: 63, z2: 127 }, scale: 7, seed: 2, threshold: 0.7 },
      { kind: 'cracked_mud', area: { x1: 0, z1: 54, x2: 63, z2: 127 }, scale: 9, seed: 4, threshold: 0.78 }],
    bands: [{ kind: 'burnt_grass', z1: 46, z2: 48, jitter: 2, seed: 3 }],
    paths: [{ kind: 'dirt', width: 2, points: [[16, 0], [16, 36], [16, 43]] }, { kind: 'dirt', width: 2, points: [[16, 46], [17, 60], [21, 70.5], [26, 78], [30, 84]] },
      { kind: 'dirt', width: 2, points: [[48, 0], [48, 43]] }, { kind: 'dirt', width: 2, points: [[48, 46], [47, 70], [46, 90], [47, 100], [50, 112]] },
      { kind: 'dirt', width: 1.6, points: [[30, 93], [30.5, 96], [30.5, 104]] }],
    hills: { amplitude: 1.4, scale: 10 },
    flatten: [{ x1: 0, z1: 41, x2: 63, z2: 48, fade: 4 }, { x1: 7, z1: 69, x2: 33, z2: 71, fade: 2 }, { x1: 25, z1: 83, x2: 37, z2: 97, fade: 2 }, { x1: 20, z1: 17, x2: 28, z2: 26, fade: 2 }, { x1: 13, z1: 99, x2: 19, z2: 104, fade: 2 }] }
};
const out = path.join(ROOT, 'docs/rebuild/scarlands/proof_layout.json');
fs.writeFileSync(out, JSON.stringify(layout, null, 1) + '\n');
console.log('[SCARLANDS LAYOUT] ' + pieces.length + ' pieces + ' + runs.length + ' runs -> ' + path.relative(ROOT, out));
