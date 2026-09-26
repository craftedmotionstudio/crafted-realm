#!/usr/bin/env node
/* Build the Scarlands art kit v2 end to end (W2/W3, 2026-09-26; v2 = Ditch readability, v1 in git history):
 *  1. the old-school texture kit (tools/build_oldschool_textures.js, now with the Scarlands textures);
 *  2. the pieces in Blender (tools/blender/build_scarlands_kit_v2.py -> .studio-workspaces/scarlands-kit-v1/working);
 *  3. UVs + kit textures (tools/blender/apply_oldschool_textures.py with docs/rebuild/scarlands/scarlands-kit-v2.textures.json
 *     -> candidates/scarlands_kit.{blend,glb}), proven identical in structure and geometry to the flat export;
 *  4. candidates/manifest.json: every piece's node, footprint, rotations, collision cells, triangles and bounds, plus
 *     the placement conventions the online client and tools/scarlands_kit.js use.
 * Run: node tools/build_scarlands_kit.js   (then node tools/publish_scarlands_kit.js [plan|apply]) */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..'), WS = '.studio-workspaces/scarlands-kit-v2', BLENDER = 'C:/Program Files/Blender Foundation/Blender 4.5/blender.exe';
function run(cmd, args) {
  const r = cp.spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  if (r.status !== 0) { console.error((r.stdout || '').slice(-3000), (r.stderr || '').slice(-3000)); throw new Error(path.basename(cmd) + ' failed (' + r.status + ')'); }
  return r.stdout;
}
const abs = p => path.join(ROOT, p), sha = p => crypto.createHash('sha256').update(fs.readFileSync(abs(p))).digest('hex');
run(process.execPath, ['tools/build_oldschool_textures.js']);
console.log(run(BLENDER, ['-b', '--python-exit-code', '1', '--python', 'tools/blender/build_scarlands_kit_v2.py']).split(/\r?\n/).find(l => l.startsWith('[SCARLANDS KIT]')));
const spec = 'docs/rebuild/scarlands/scarlands-kit-v2.textures.json';
run(BLENDER, ['-b', WS + '/working/scarlands_kit.blend', '--python-exit-code', '1', '--python', 'tools/blender/apply_oldschool_textures.py', '--', spec]);
const cmp = JSON.parse(cp.spawnSync(process.execPath, ['tools/compare_glb_structure.js', WS + '/working/scarlands_kit_flat.glb', WS + '/candidates/scarlands_kit.glb'], { cwd: ROOT, encoding: 'utf8' }).stdout);
if (!cmp.identicalStructureAndGeometry) throw new Error('textured kit differs from the flat build: ' + JSON.stringify(cmp.issues));
const pieces = JSON.parse(fs.readFileSync(abs(WS + '/working/pieces.json'), 'utf8')), report = JSON.parse(fs.readFileSync(abs(WS + '/candidates/textures.report.json'), 'utf8'));
const glb = WS + '/candidates/scarlands_kit.glb';
const manifest = {
  schema: 'crafted-realm-scarlands-kit-v1', version: 2, name: 'The Scarlands art kit',
  about: 'Burned Wilderness north of the Wilderness Ditch: dead trees, fire-scarred ruins, bones, the Ditch trench kit, warning sign, camp remnants, depth stones. Our own low-poly Blender designs with the old-school 64 px texture kit.',
  glb: { file: 'scarlands_kit.glb', sha256: sha(glb), bytes: fs.statSync(abs(glb)).size, primitives: cmp.b.primitives, triangles: pieces.pieces.reduce((a, p) => a + p.triangles, 0) },
  source: { blend: 'scarlands_kit.blend', builder: pieces.builder, recipe: 'tools/blender/apply_oldschool_textures.py', spec, blender: pieces.blender },
  textures: report.images,
  conventions: {
    units: '1 unit = 1 tile', axes: 'glTF: +X east, -Z north, +Y up (Blender +Y north). Each piece is a root node at the origin; clone it and set its transform.',
    origin: 'the centre of the piece footprint, on the ground (y = 0)',
    footprint: 'w tiles along x (east) by d tiles along z (north), unrotated',
    rotation: 'rot = clockwise quarter turns seen from above (north edge faces east at rot 1); only the listed rotations are authored; three.js yaw = -rot * PI / 2 in a scene where north is -z',
    cells: 'collision cells (i, j): i east 0..w-1, j north 0..d-1 (j = 0 south row), unrotated; blocked = solid tile, water = unwalkable floor projectiles cross, walls = [i, j, side] edge walls, cut = lower the ground under these cells to below -depth (the Ditch; the piece draws its own floor at -depth, so carve a little deeper or skip those tiles), walk = walkable deck height over cut cells',
    placement: 'tools/scarlands_kit.js turns a tile layout into the server collision map and the client placement list (rotated cells, world positions, yaw, instancing counts, ground grid)',
    materials: 'colour maps are display values (the game renders without colour management): set map.encoding = LinearEncoding like the island loaders; flat materials are drawn as authored; the ember material is emissive',
    instancing: 'every piece is a single mesh (one primitive per material); draw repeated pieces with one InstancedMesh per piece primitive' },
  pieces: pieces.pieces.map(p => ({ id: p.id, node: p.node, footprint: p.footprint, rotations: p.rotations, tags: p.tags, about: p.about,
    collision: Object.fromEntries(Object.entries(p.collision).filter(([k, v]) => v && (!Array.isArray(v) || v.length))),
    triangles: p.triangles, materials: p.materials,
    bounds: { min: [p.boundsBlender.min[0], p.boundsBlender.min[2], -p.boundsBlender.max[1]], max: [p.boundsBlender.max[0], p.boundsBlender.max[2], -p.boundsBlender.min[1]] } }))
};
fs.writeFileSync(abs(WS + '/candidates/manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log('[SCARLANDS KIT BUILD] ' + JSON.stringify({ pieces: manifest.pieces.length, triangles: manifest.glb.triangles, primitives: manifest.glb.primitives, glb: manifest.glb.sha256.slice(0, 12), textures: manifest.textures.length }));
