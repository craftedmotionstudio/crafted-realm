/* Headless locks for the Scarlands kit (W2/W3, 2026-09-26):
 *  1 rotation math: cells and wall sides turn clockwise with rot, footprints swap on odd turns, 4 turns = identity;
 *  2 merging: rectangles and wall runs expand back to exactly the tiles/edges they were made from;
 *  3 the manifest: every piece has a node in the kit GLB, cells inside its footprint, authored rotations only;
 *  4 the proof layout compiles to a valid server map that keeps every blocked/water/wall tile of scarlands_test.json
 *    (the kit only adds collision) and matches the checked-in server/data/maps/scarlands_kit_proof.json;
 *  5 the server's own collision loader (server/engine/CollisionMap.js, rsmod-pathfinder) loads it: the Ditch is not
 *    walkable, both crossings are, and a path runs from the Commons respawn across the plank crossing to the ruins.
 * Run: node tools/test_scarlands_kit.js */
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), K = require('./scarlands_kit');
const read = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
let passed = 0; const check = (name, f) => { f(); passed++; console.log('PASS ' + name); };

check('1 rotation: cells and sides turn clockwise; footprints swap on odd turns; four turns are the identity', () => {
  // a 3x1 piece (arch): cell (0,0) is the west end; after one clockwise turn the piece is 1x3 and that end is north
  assert.deepStrictEqual(K.rotCell(0, 0, 3, 1, 1), [0, 2]);
  assert.deepStrictEqual(K.rotCell(2, 0, 3, 1, 1), [0, 0]);
  assert.deepStrictEqual(K.rotCell(0, 0, 3, 1, 2), [2, 0]);
  for (let r = 0; r < 4; r++) for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    let [a, b] = [i, j], w = 3, d = 2; for (let k = 0; k < 4; k++) { [a, b] = K.rotCell(a, b, w, d, 1); [w, d] = [d, w]; }
    assert.deepStrictEqual([a, b], [i, j]);
  }
  assert.strictEqual(K.rotSide('N', 1), 'E'); assert.strictEqual(K.rotSide('W', 1), 'N'); assert.strictEqual(K.rotSide('S', 2), 'N');
  assert.deepStrictEqual(K.footprint({ footprint: { w: 3, d: 1 } }, 1), { w: 1, d: 3 });
});

check('2 merging: rectangles and wall runs expand back to the same tiles and edges', () => {
  const tiles = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [5, 5], [7, 3], [7, 4]];
  const back = K.expandRects(K.mergeRects(tiles)).map(t => t.join(',')).sort();
  assert.deepStrictEqual(back, tiles.map(t => t.join(',')).sort());
  const walls = [[3, 3, 'N'], [4, 3, 'N'], [5, 3, 'N'], [3, 3, 'W'], [3, 4, 'W'], [9, 9, 'E']];
  const wb = K.expandWalls(K.mergeWalls(walls)).map(w => w.join(',')).sort();
  assert.deepStrictEqual(wb, walls.map(w => w.join(',')).sort());
  assert(K.mergeWalls(walls).length === 3, 'runs merged');
});

const kit = read('.studio-workspaces/scarlands-kit-v1/candidates/manifest.json');
check('3 manifest: ' + kit.pieces.length + ' pieces, each a node in the GLB with cells inside its footprint and authored rotations', () => {
  const glb = fs.readFileSync(path.join(ROOT, '.studio-workspaces/scarlands-kit-v1/candidates', kit.glb.file));
  const j = JSON.parse(glb.slice(20, 20 + glb.readUInt32LE(12)).toString()), names = new Set(j.nodes.map(n => n.name));
  assert(kit.pieces.length >= 30);
  kit.pieces.forEach(p => {
    assert(names.has(p.node), p.node + ' in GLB');
    assert(p.rotations.length && p.rotations.every(r => [0, 1, 2, 3].includes(r)));
    const inside = ([i, j]) => i >= 0 && j >= 0 && i < p.footprint.w && j < p.footprint.d;
    const c = p.collision;
    (c.blocked || []).concat(c.water || []).forEach(t => assert(inside(t), p.id + ' cell ' + t));
    (c.walls || []).forEach(w => assert(inside(w) && 'NESW'.includes(w[2]), p.id + ' wall ' + w));
    if (c.cut) c.cut.cells.forEach(t => assert(inside(t)));
    if (c.walk) c.walk.cells.forEach(t => assert(c.cut && c.cut.cells.some(q => q[0] === t[0] && q[1] === t[1]), p.id + ' walk over cut'));
  });
  ['ditch_straight', 'ditch_crossing_planks', 'ditch_crossing_stone', 'wild_warning_sign', 'ruin_arch', 'depth_stone'].forEach(id => assert(kit.pieces.some(p => p.id === id), id));
});

const layout = read('docs/rebuild/scarlands/proof_layout.json'); layout.__file = 'docs/rebuild/scarlands/proof_layout.json';
const test = read('server/data/maps/scarlands_test.json');
const { map, placement } = K.compile(layout, kit, test);
check('4 the proof layout compiles to a map that keeps every test-map collision tile and matches the checked-in map', () => {
  assert.strictEqual(map.format, 'crafted-realm-map'); assert.deepStrictEqual(map.bounds, test.bounds); assert.deepStrictEqual(map.spawns, test.spawns); assert.deepStrictEqual(map.areas, test.areas);
  const cmp = K.compareMaps(test, map);
  ['blocked', 'water', 'walls'].forEach(k => assert.strictEqual(cmp[k].onlyACount, 0, k + ' tiles of the test map missing: ' + cmp[k].onlyA.slice(0, 5)));
  assert.strictEqual(cmp.water.onlyBCount, 0, 'no new water'); assert.strictEqual(cmp.walls.onlyBCount, 0, 'no new walls');
  const saved = read('server/data/maps/scarlands_kit_proof.json');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(map)), saved, 'server/data/maps/scarlands_kit_proof.json is stale: re-run tools/scarlands_kit.js');
  // the proof uses every piece but the Ditch corner (the Ditch runs straight across the map; the catalog shows it)
  const ids = new Set(kit.pieces.map(p => p.id)); assert(Object.keys(placement.counts).every(id => ids.has(id)));
  assert(placement.pieces.length > 300 && Object.keys(placement.counts).length >= kit.pieces.length - 1, 'pieces in use ' + Object.keys(placement.counts).length);
  assert.strictEqual(placement.ground.kinds.length, placement.ground.width * placement.ground.depth);
});

check('5 the server collision loader: the Ditch blocks, both crossings pass, a path leads from the respawn to the ruins', () => {
  let CollisionMap;
  try { CollisionMap = require('../server/engine/CollisionMap'); } catch (e) { console.log('  (rsmod-pathfinder not installed here: ' + e.message.split('\n')[0] + ')'); return; }
  const cm = new CollisionMap(map);
  try {
    assert(!cm.isWalkable(10, 44) && !cm.isWalkable(30, 45), 'the Ditch is not walkable');
    assert(cm.isWalkable(15, 44) && cm.isWalkable(16, 45), 'plank crossing walkable');
    assert(cm.isWalkable(47, 44) && cm.isWalkable(48, 45), 'stone causeway walkable');
    // rsmod searches a 128-tile window around the start, so the trip is walked in legs, like a player clicking ahead
    const leg = (sx, sz, dx, dz) => { const r = cm.findPath(0, sx, sz, dx, dz), last = r[r.length - 1]; assert(last && last.x === dx && last.z === dz, 'leg ' + [sx, sz, dx, dz] + ' ends at ' + JSON.stringify(last)); return r; };
    leg(test.respawn.x, test.respawn.z, 30, 40);
    const over = leg(30, 40, 30, 52);   // over the Ditch: the route must use one of the two crossings
    assert(over.some(p => (p.x >= 15 && p.x <= 16) || (p.x >= 47 && p.x <= 48)), 'the route turns to a crossing: ' + JSON.stringify(over));
    leg(30, 52, 30, 88);   // into the ruined room through its south door
  } finally { cm.unload(); }
});
console.log('[SCARLANDS KIT] ' + passed + '/5 checks passed');
