"""The Scarlands art kit v2 (W2/W3, 2026-09-26): the burned Wilderness north of the Wilderness Ditch.

v2 (Ditch readability): from the default game camera the v1 Ditch read as a low wall line. The trench now reads as
a trench: 2.2 deep (was 1.6), a dark coursed north bank that shades down to near black, a muddy floor with dark
puddles, a line of long charred stakes leaning out over it from the south lip, and a lower, darker, broken lip wall.
Collision and the manifest contract are unchanged (cells, footprints, rotations; cut.depth is data). v1 is
reproducible from git history (published at assets/scarlands/kit-v1).

Owner focus is PvP: the zone must read at one glance as dangerous (black dead trees, fire-scarred ruins, bones, the
Ditch with its stakes and warning sign) yet stay cozy old-school (chunky low-poly shapes, small tiled textures, warm
embers). Our own designs, modelled here piece by piece in Blender (no imported or traced assets).

Every piece is one root empty 'scar_<id>' at the world origin with one joined mesh child, authored with +X east,
+Y north, Z up, its footprint centred on the origin (w x d tiles, 1 tile = 1 unit) and standing on Z = 0. The pack is
exported untextured (working/scarlands_kit_flat.glb, flat named materials); tools/blender/apply_oldschool_textures.py
then adds UVs + kit textures (docs/rebuild/scarlands/scarlands-kit.textures.json). Footprints, collision per tile and
rotation steps are written to working/pieces.json; tools/build_scarlands_kit.js turns that into the manifest.

Collision cells: (i, j) with i east from 0..w-1 and j north from 0..d-1 (j = 0 is the south row), unrotated.
  blocked  - the tile is solid (walking and projectiles), like server map "blocked"
  water    - unwalkable floor that projectiles cross (the Ditch), like server map "water"
  walls    - [i, j, side]: a wall on that side of the tile (N/E/S/W), like server map "walls"
  cut      - terrain lowered under these cells by 'cutDepth' (the Ditch bed); a client must carve its ground there
  walk     - walkable deck cells and their surface height (a plank crossing over the carved trench)
Run: blender -b --python tools/blender/build_scarlands_kit_v2.py
"""
import bpy, bmesh, json, math, random, hashlib
from pathlib import Path
from mathutils import Vector, Matrix, Euler

ROOT = Path(__file__).resolve().parents[2]
WS = ROOT / '.studio-workspaces/scarlands-kit-v2/working'
WS.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

# ---------- materials (flat colours named for the texturing recipe) ----------
def material(name, col, emit=None):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (col[0], col[1], col[2], 1.0)
    m.roughness = 1.0
    m.metallic = 0.0
    if emit:
        m.use_nodes = True
        b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        b.inputs['Base Color'].default_value = (col[0], col[1], col[2], 1)
        b.inputs['Emission Color'].default_value = (emit[0], emit[1], emit[2], 1)
        b.inputs['Emission Strength'].default_value = 1.0
        b.inputs['Roughness'].default_value = 1.0
    return m

M = {
    'bark': material('Scar charred bark', (0.105, 0.088, 0.078)),
    'bark_lit': material('Scar charred bark edge', (0.16, 0.13, 0.11)),
    'stone': material('Scar ruined stone', (0.42, 0.40, 0.37)),
    'stone_dark': material('Scar ruined stone sooted', (0.29, 0.27, 0.25)),
    'rock': material('Scar dark rock', (0.30, 0.285, 0.27)),
    'char': material('Scar charred planks', (0.20, 0.16, 0.13)),
    'plank': material('Scar weathered planks', (0.40, 0.31, 0.22)),
    'wood': material('Scar sign wood', (0.36, 0.27, 0.18)),
    'bone': material('Scar bone', (0.86, 0.83, 0.74)),
    'bonedirt': material('Scar bone dirt', (0.40, 0.33, 0.25)),
    'ashbed': material('Scar ash bed', (0.36, 0.35, 0.33)),
    'soil': material('Scar scorched earth', (0.24, 0.19, 0.16)),
    'bank': material('Scar ditch bank stone', (0.20, 0.185, 0.17)),
    'bank_deep': material('Scar ditch bank shadow', (0.075, 0.065, 0.06)),
    'mud': material('Scar ditch mud', (0.14, 0.115, 0.095)),
    'puddle': material('Scar ditch puddle', (0.10, 0.11, 0.12)),
    'canvas': material('Scar torn canvas', (0.50, 0.44, 0.34)),
    'red': material('Scar paint red', (0.45, 0.08, 0.06)),
    'iron': material('Scar rust iron', (0.20, 0.14, 0.11)),
    'ember': material('Scar ember (glow)', (0.9, 0.35, 0.08), emit=(1.0, 0.38, 0.08)),
}

# ---------- a piece: one bmesh, several materials ----------
class Piece:
    def __init__(self, pid, w, d, tags, rotations=(0, 1, 2, 3), about=''):
        self.id, self.w, self.d, self.tags, self.rotations, self.about = pid, w, d, tags, list(rotations), about
        self.bm = bmesh.new()
        self.mats = []
        self.blocked, self.water, self.walls, self.cut, self.walk = [], [], [], [], []
        self.cut_depth, self.walk_y = 0.0, 0.0
        self.rng = random.Random(int(hashlib.md5(pid.encode()).hexdigest()[:8], 16))   # stable across runs

    def _mi(self, m):
        if m not in self.mats:
            self.mats.append(m)
        return self.mats.index(m)

    def _new(self, before, m):
        mi = self._mi(m)
        for f in set(self.bm.faces) - before:
            f.material_index = mi
            f.smooth = False

    def box(self, size, loc, rot=(0, 0, 0), m=None):
        before = set(self.bm.faces)
        mat = Matrix.Translation(loc) @ Euler(rot).to_matrix().to_4x4() @ Matrix.Diagonal((size[0], size[1], size[2], 1))
        bmesh.ops.create_cube(self.bm, size=1.0, matrix=mat)
        self._new(before, m)

    def cyl(self, r1, r2, h, segs, loc, rot=(0, 0, 0), m=None):
        """A (tapered) prism standing on 'loc' (its base centre), axis +Z before rotation."""
        before = set(self.bm.faces)
        mat = Matrix.Translation(loc) @ Euler(rot).to_matrix().to_4x4() @ Matrix.Translation((0, 0, h / 2))
        bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r1, radius2=r2, depth=h, matrix=mat)
        self._new(before, m)

    def limb(self, p0, p1, r0, r1, segs=5, m=None):
        """A tapered branch from p0 to p1."""
        p0, p1 = Vector(p0), Vector(p1)
        v = p1 - p0
        q = Vector((0, 0, 1)).rotation_difference(v.normalized())
        before = set(self.bm.faces)
        mat = Matrix.Translation(p0) @ q.to_matrix().to_4x4() @ Matrix.Translation((0, 0, v.length / 2))
        bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r0, radius2=r1, depth=v.length, matrix=mat)
        self._new(before, m)

    def rock(self, radius, loc, scale=(1, 1, 0.7), m=None, rough=0.22, subdiv=2):
        before = set(self.bm.faces)
        mat = Matrix.Translation(loc) @ Matrix.Diagonal((scale[0], scale[1], scale[2], 1))
        res = bmesh.ops.create_icosphere(self.bm, subdivisions=subdiv, radius=radius, matrix=mat)
        for v in res['verts']:
            v.co += Vector((self.rng.uniform(-1, 1), self.rng.uniform(-1, 1), self.rng.uniform(-1, 1))) * radius * rough
            v.co.z = max(v.co.z, loc[2] - radius * scale[2] * 0.35)   # sit flat, half sunk into the ground
        self._new(before, m)

    def plate(self, verts, m=None, both=False):
        """A single flat polygon (ground decals: ash beds, soil mounds); both = also the reversed face (seen from either side)."""
        before = set(self.bm.faces)
        vs = [self.bm.verts.new(v) for v in verts]
        self.bm.faces.new(vs)
        if both:
            vs2 = [self.bm.verts.new(v) for v in reversed(verts)]
            self.bm.faces.new(vs2)
        self._new(before, m)

    def finish(self):
        me = bpy.data.meshes.new('scar_' + self.id + '_mesh')
        bmesh.ops.remove_doubles(self.bm, verts=self.bm.verts, dist=1e-5)
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.mats:
            me.materials.append(m)
        root = bpy.data.objects.new('scar_' + self.id, None)
        bpy.context.scene.collection.objects.link(root)
        ob = bpy.data.objects.new('scar_' + self.id + '_mesh', me)
        bpy.context.scene.collection.objects.link(ob)
        ob.parent = root
        root['scarPiece'] = self.id
        tris = sum(len(p.vertices) - 2 for p in me.polygons)
        xs = [v.co.x for v in me.vertices]; ys = [v.co.y for v in me.vertices]; zs = [v.co.z for v in me.vertices]
        return {'id': self.id, 'node': 'scar_' + self.id, 'footprint': {'w': self.w, 'd': self.d}, 'rotations': self.rotations,
                'tags': self.tags, 'about': self.about,
                'collision': {'blocked': self.blocked, 'water': self.water, 'walls': self.walls,
                              'cut': {'depth': self.cut_depth, 'cells': self.cut} if self.cut else None,
                              'walk': {'y': self.walk_y, 'cells': self.walk} if self.walk else None},
                'triangles': tris, 'materials': [m.name for m in self.mats],
                'boundsBlender': {'min': [round(min(xs), 3), round(min(ys), 3), round(min(zs), 3)], 'max': [round(max(xs), 3), round(max(ys), 3), round(max(zs), 3)]}}

pieces = []
def done(p):
    pieces.append(p.finish())

def all_cells(p):
    return [[i, j] for j in range(p.d) for i in range(p.w)]

# ---------- dead / burnt trees ----------
def roots(p, r, m):
    for k in range(4):
        a = k * math.pi / 2 + p.rng.uniform(-0.3, 0.3)
        p.limb((0, 0, 0.25), (math.cos(a) * r * 2.6, math.sin(a) * r * 2.6, -0.02), r * 0.55, r * 0.12, 4, m)

def branchy(p, base, top, r0, r1, limbs, twig=True):
    p.limb(base, top, r0, r1, 6, M['bark'])
    b, t = Vector(base), Vector(top)
    for k, (h, ang, reach, rise) in enumerate(limbs):
        s = b.lerp(t, h)
        tip = s + Vector((math.cos(ang) * reach, math.sin(ang) * reach, rise))
        p.limb(s, tip, r0 * (1 - h) * 0.55 + 0.02, 0.02, 5, M['bark'] if k % 2 else M['bark_lit'])
        if twig:
            mid = s.lerp(tip, 0.6)
            t2 = mid + Vector((math.cos(ang + 0.9) * reach * 0.4, math.sin(ang + 0.9) * reach * 0.4, rise * 0.45 + 0.2))
            p.limb(mid, t2, 0.035, 0.01, 4, M['bark'])

p = Piece('dead_tree_tall', 1, 1, ['tree', 'dead'], about='Tall burnt tree, four black limbs clawing upward.')
roots(p, 0.2, M['bark'])
branchy(p, (0, 0, 0), (0.12, -0.08, 4.8), 0.32, 0.08,
        [(0.42, 0.4, 1.2, 1.2), (0.55, 2.4, 1.4, 1.0), (0.68, 4.0, 1.1, 1.1), (0.8, 5.5, 0.9, 0.9), (0.9, 1.4, 0.7, 0.9)])
p.blocked = all_cells(p); done(p)

p = Piece('dead_tree_bent', 1, 1, ['tree', 'dead'], about='Wind-bent dead tree leaning away from the Ditch.')
roots(p, 0.22, M['bark'])
p.limb((0, 0, 0), (0.25, 0.3, 2.0), 0.29, 0.2, 6, M['bark'])
branchy(p, (0.25, 0.3, 2.0), (1.0, 1.05, 3.9), 0.2, 0.06, [(0.15, 3.3, 1.1, 0.7), (0.45, 0.3, 1.2, 0.8), (0.7, 1.9, 0.8, 0.9), (0.9, 4.4, 0.6, 0.5)])
p.blocked = all_cells(p); done(p)

p = Piece('dead_tree_split', 1, 1, ['tree', 'dead'], about='Lightning-split trunk, two charred halves and jagged tops.')
roots(p, 0.22, M['bark'])
p.cyl(0.34, 0.28, 1.7, 7, (0, 0, 0), m=M['bark'])
p.limb((0.08, 0, 1.6), (0.85, 0.1, 3.7), 0.18, 0.06, 5, M['bark_lit'])
p.limb((-0.08, 0, 1.6), (-0.65, -0.2, 3.2), 0.17, 0.05, 5, M['bark'])
p.limb((0.6, 0.08, 2.9), (1.1, 0.5, 3.6), 0.05, 0.015, 4, M['bark'])
p.limb((-0.45, -0.15, 2.5), (-0.9, -0.7, 2.9), 0.05, 0.015, 4, M['bark'])
p.blocked = all_cells(p); done(p)

p = Piece('dead_tree_snag', 1, 1, ['tree', 'dead'], about='Snapped snag: a short burnt stump of a trunk with two broken stubs.')
roots(p, 0.22, M['bark'])
p.cyl(0.32, 0.22, 2.4, 7, (0, 0, 0), m=M['bark'])
p.limb((0, 0, 2.35), (0.05, 0.02, 2.9), 0.16, 0.02, 5, M['bark_lit'])   # the splintered top
p.limb((0, 0, 1.3), (0.55, 0.2, 1.75), 0.08, 0.03, 5, M['bark'])
p.limb((0, 0, 1.7), (-0.4, -0.35, 2.1), 0.07, 0.03, 5, M['bark'])
p.blocked = all_cells(p); done(p)

p = Piece('dead_shrub', 1, 1, ['shrub', 'dead'], about='Low twiggy burnt shrub; walkable, pure dressing.')
for k in range(7):
    a = k * 2 * math.pi / 7 + p.rng.uniform(-0.3, 0.3)
    r = p.rng.uniform(0.25, 0.45)
    p.limb((0, 0, 0), (math.cos(a) * r, math.sin(a) * r, p.rng.uniform(0.35, 0.7)), 0.04, 0.012, 4, M['bark'])
done(p)

p = Piece('stump_charred', 1, 1, ['stump'], about='Burnt stump with a jagged top and flared roots.')
roots(p, 0.18, M['bark'])
p.cyl(0.36, 0.3, 0.45, 8, (0, 0, 0), m=M['bark'])
for k in range(5):
    a = k * 2 * math.pi / 5
    p.limb((math.cos(a) * 0.2, math.sin(a) * 0.2, 0.4), (math.cos(a) * 0.22, math.sin(a) * 0.22, 0.4 + p.rng.uniform(0.1, 0.3)), 0.09, 0.02, 4, M['bark_lit'])
p.blocked = all_cells(p); done(p)

p = Piece('stump_split', 1, 1, ['stump'], about='Stump split in two by the heat, one half fallen outward.')
roots(p, 0.16, M['bark'])
p.cyl(0.3, 0.27, 0.6, 7, (-0.06, 0, 0), m=M['bark'])
p.cyl(0.22, 0.2, 0.55, 6, (0.32, 0.05, 0.08), rot=(0, 0.6, 0), m=M['bark_lit'])
p.blocked = all_cells(p); done(p)

# ---------- ruins (fire-scarred stone; walls sit on a tile edge, pillars fill a tile) ----------
def courses(p, x0, x1, y, height, jag, seed=0, m=None, thick=0.36, block=0.5, course=0.42):
    """Stone blocks laid in courses from x0 to x1 along the wall line y, height with a ragged broken top."""
    r = random.Random(seed)
    z, row = 0.0, 0
    while z < height - 0.05:
        x = x0 - (block / 2 if row % 2 else 0)
        while x < x1 - 0.02:
            a, b = max(x, x0), min(x + block, x1)
            top_here = height - (r.random() * jag if z + course > height - jag else 0)
            if b - a > 0.08 and z < top_here:
                h = min(course, top_here - z) - 0.02
                if h > 0.08:
                    p.box((b - a - 0.03, thick + r.uniform(-0.03, 0.03), h), ((a + b) / 2, y + r.uniform(-0.02, 0.02), z + h / 2),
                          (0, 0, r.uniform(-0.03, 0.03)), m or (M['stone'] if r.random() > 0.25 else M['stone_dark']))
            x += block
        z += course
        row += 1

p = Piece('ruin_wall', 1, 1, ['ruin', 'wall'], about='Fire-scarred wall on the tile\'s north edge, ragged top (about 2.2 high).')
courses(p, -0.5, 0.5, 0.5, 2.25, 0.9, seed=11)
p.walls = [[0, 0, 'N']]; done(p)

p = Piece('ruin_wall_low', 1, 1, ['ruin', 'wall'], about='Broken-down wall on the north edge, knee to waist high.')
courses(p, -0.5, 0.5, 0.5, 1.0, 0.6, seed=12)
p.rock(0.14, (0.2, 0.2, 0.05), m=M['stone_dark'])
p.walls = [[0, 0, 'N']]; done(p)

p = Piece('ruin_wall_corner', 1, 1, ['ruin', 'wall'], about='Corner of a ruined room: walls on the north and east edges.')
courses(p, -0.5, 0.5, 0.5, 2.1, 0.8, seed=13)
before = set(p.bm.faces)
q = Piece('tmp', 1, 1, [])
courses(q, -0.5, 0.32, 0.5, 1.9, 0.9, seed=14)
bm2 = q.bm
bmesh.ops.rotate(bm2, verts=bm2.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(-math.pi / 2, 3, 'Z'))
tmp = bpy.data.meshes.new('tmp'); bm2.to_mesh(tmp); bm2.free()
for f in tmp.polygons:
    vs = [p.bm.verts.new(tmp.vertices[i].co) for i in f.vertices]
    nf = p.bm.faces.new(vs); nf.material_index = p._mi(q.mats[f.material_index])
bpy.data.meshes.remove(tmp)
p.walls = [[0, 0, 'N'], [0, 0, 'E']]; done(p)

p = Piece('ruin_wall_end', 1, 1, ['ruin', 'wall'], about='End of a wall run on the north edge, finished by a taller pier at the east end.')
courses(p, -0.5, 0.2, 0.5, 1.8, 0.7, seed=15)
courses(p, 0.2, 0.55, 0.5, 2.7, 0.5, seed=16, thick=0.5, block=0.35, m=M['stone'])
p.walls = [[0, 0, 'N']]; done(p)

p = Piece('ruin_pillar', 1, 1, ['ruin', 'pillar'], about='Standing pillar with plinth and a cracked capital (3 high).')
p.box((0.78, 0.78, 0.3), (0, 0, 0.15), m=M['stone_dark'])
for k, z in enumerate([0.3, 0.8, 1.3, 1.8, 2.3]):
    p.box((0.56, 0.56, 0.48), (0, 0, z + 0.24), (0, 0, p.rng.uniform(-0.06, 0.06)), M['stone'] if k % 2 == 0 else M['stone_dark'])
p.box((0.8, 0.72, 0.26), (0.03, 0, 2.93), (0.05, 0, 0.1), M['stone'])
p.blocked = all_cells(p); done(p)

p = Piece('ruin_pillar_broken', 1, 1, ['ruin', 'pillar'], about='Broken pillar stub with its fallen drum beside it.')
p.box((0.78, 0.78, 0.3), (0, 0, 0.15), m=M['stone_dark'])
p.box((0.56, 0.56, 0.5), (0, 0, 0.55), (0, 0, 0.05), M['stone'])
p.box((0.5, 0.52, 0.4), (0.03, -0.02, 1.0), (0.12, -0.08, 0.2), M['stone_dark'])
p.cyl(0.26, 0.26, 0.5, 7, (0.45, 0.35, 0.26), rot=(math.pi / 2, 0, 0.6), m=M['stone'])
p.blocked = all_cells(p); done(p)

p = Piece('ruin_arch', 3, 1, ['ruin', 'arch', 'gateway'], rotations=(0, 1), about='Ruined arch gateway three tiles wide: piers block the outer tiles, the middle is open.')
for sx in (-1, 1):
    courses(p, sx - 0.35, sx + 0.35, 0.0, 2.5, 0.15, seed=20 + sx, thick=0.7, block=0.35)
seg = 7
for k in range(seg):
    a0, a1 = math.pi * k / seg, math.pi * (k + 1) / seg
    x0, x1 = -math.cos(a0) * 1.0, -math.cos(a1) * 1.0
    z0, z1 = 2.5 + math.sin(a0) * 0.75, 2.5 + math.sin(a1) * 0.75
    if k == 5:
        continue   # a keystone block has fallen out
    p.box((abs(x1 - x0) + 0.12, 0.66, 0.34), ((x0 + x1) / 2, 0, (z0 + z1) / 2 + 0.05), (0, -math.atan2(z1 - z0, x1 - x0), 0), M['stone'] if k % 2 else M['stone_dark'])
p.rock(0.18, (0.3, -0.4, 0.05), m=M['stone'])
p.blocked = [[0, 0], [2, 0]]; done(p)

p = Piece('rubble_small', 1, 1, ['rubble'], about='A scatter of fallen blocks on scorched soil; walkable dressing.')
p.plate([(-0.45, -0.4, 0.01), (0.4, -0.45, 0.01), (0.48, 0.35, 0.01), (-0.3, 0.45, 0.01)], M['soil'])
for k in range(6):
    s = p.rng.uniform(0.12, 0.26)
    p.box((s * 1.4, s, s * 0.8), (p.rng.uniform(-0.35, 0.35), p.rng.uniform(-0.35, 0.35), s * 0.35), (p.rng.uniform(-.3, .3), p.rng.uniform(-.3, .3), p.rng.uniform(0, 3)), M['stone'] if k % 2 else M['stone_dark'])
done(p)

p = Piece('rubble_large', 2, 2, ['rubble'], about='Heap of a collapsed wall: blocks, a broken column drum; solid.')
p.rock(0.85, (0, 0, 0.0), (1.2, 1.1, 0.55), M['soil'], rough=0.15)
for k in range(11):
    s = p.rng.uniform(0.2, 0.42)
    a = p.rng.uniform(0, math.tau); r = p.rng.uniform(0, 0.75)
    p.box((s * 1.5, s, s * 0.8), (math.cos(a) * r, math.sin(a) * r, 0.25 + (0.75 - r) * 0.5), (p.rng.uniform(-.5, .5), p.rng.uniform(-.5, .5), p.rng.uniform(0, 3)), M['stone'] if k % 3 else M['stone_dark'])
p.cyl(0.28, 0.28, 0.7, 7, (0.55, -0.5, 0.25), rot=(math.pi / 2, 0, 1.1), m=M['stone'])
p.blocked = all_cells(p); done(p)

p = Piece('rock_boulder', 1, 1, ['rock'], about='Dark boulder filling a tile.')
p.rock(0.5, (0, 0, 0.1), (1.0, 0.9, 0.8), M['rock'], rough=0.25)
p.blocked = all_cells(p); done(p)

p = Piece('rock_outcrop', 2, 2, ['rock'], about='Dark rock outcrop over 2x2 tiles, a tall shard and smaller stones.')
p.rock(0.8, (-0.15, -0.1, 0.1), (1.1, 1.0, 0.9), M['rock'], rough=0.2)
p.rock(0.45, (0.45, 0.5, 0.35), (0.7, 0.7, 2.2), M['rock'], rough=0.2)
p.rock(0.3, (0.6, -0.55, 0.05), (1, 1, 0.8), M['rock'], rough=0.3)
p.blocked = all_cells(p); done(p)

# ---------- bones ----------
def bone(p, a, b, r=0.035):
    p.limb(a, b, r, r * 0.8, 4, M['bone'])
    for e in (a, b):
        p.rock(r * 1.6, e, (1, 1, 1), M['bone'], rough=0.05, subdiv=1)

def skull(p, loc, yaw=0.0, s=1.0):
    x, y, z = loc
    p.rock(0.13 * s, (x, y, z + 0.1 * s), (1.0, 1.15, 0.95), M['bone'], rough=0.04, subdiv=2)
    d = Vector((math.sin(yaw), -math.cos(yaw), 0))   # facing
    jaw = Vector(loc) + d * 0.09 * s + Vector((0, 0, 0.04 * s))
    p.box((0.14 * s, 0.07 * s, 0.05 * s), jaw, (0, 0, yaw), M['bone'])

p = Piece('bones_skeleton', 1, 1, ['bones'], about='An adventurer who did not make it back: a skeleton lying on its back; walkable.')
skull(p, (0, 0.38, 0), 0.2)
for k in range(5):
    bone(p, (-0.02, 0.26 - k * 0.07, 0.04), (-0.02, 0.2 - k * 0.07, 0.04), 0.025)            # spine
    p.limb((-0.02, 0.22 - k * 0.06, 0.06), (-0.17, 0.2 - k * 0.06, 0.03), 0.015, 0.012, 4, M['bone'])   # ribs
    p.limb((-0.02, 0.22 - k * 0.06, 0.06), (0.13, 0.2 - k * 0.06, 0.03), 0.015, 0.012, 4, M['bone'])
bone(p, (-0.12, -0.08, 0.04), (0.08, -0.08, 0.04), 0.04)                                      # pelvis
bone(p, (-0.1, -0.1, 0.03), (-0.2, -0.42, 0.03)); bone(p, (0.06, -0.1, 0.03), (0.22, -0.4, 0.03))   # legs
bone(p, (-0.16, 0.22, 0.03), (-0.36, 0.02, 0.03)); bone(p, (0.12, 0.22, 0.03), (0.34, 0.3, 0.03))   # arms
done(p)

p = Piece('bones_skull', 1, 1, ['bones'], about='A skull on two crossed bones; walkable.')
skull(p, (0, 0.05, 0), -0.3)
bone(p, (-0.28, -0.2, 0.03), (0.26, 0.18, 0.03)); bone(p, (-0.26, 0.2, 0.03), (0.28, -0.16, 0.03))
done(p)

p = Piece('bones_pile', 1, 1, ['bones'], about='A heap of old bones on bone-strewn dirt; walkable.')
p.rock(0.42, (0, 0, -0.05), (1.1, 1.0, 0.35), M['bonedirt'], rough=0.12)
for k in range(9):
    a = p.rng.uniform(0, math.tau); r = p.rng.uniform(0.0, 0.3); l = p.rng.uniform(0.18, 0.34)
    c = Vector((math.cos(a) * r, math.sin(a) * r, 0.1 + (0.3 - r) * 0.3))
    d = Vector((math.cos(a + 1.7), math.sin(a + 1.7), p.rng.uniform(-0.2, 0.3))) * l / 2
    bone(p, c - d, c + d, 0.028)
skull(p, (0.05, -0.1, 0.12), 0.6, 0.85)
done(p)

# ---------- a broken cart ----------
p = Piece('cart_broken', 2, 1, ['cart', 'camp'], rotations=(0, 1, 2, 3), about='Burnt handcart tipped on a broken wheel, its shafts in the ash; solid.')
bed = (0.15, 0, 0.55); tilt = (0, 0.18, 0.05)
p.box((1.5, 0.85, 0.08), bed, tilt, M['char'])
for sy in (-0.42, 0.42):
    p.box((1.5, 0.06, 0.32), (0.15, sy, 0.72), tilt, M['char'])
p.box((0.06, 0.85, 0.3), (0.88, 0, 0.62), tilt, M['char'])
p.cyl(0.42, 0.42, 0.08, 12, (0.1, -0.5, 0.42), rot=(math.pi / 2, 0, 0), m=M['char'])          # the whole wheel
p.cyl(0.1, 0.1, 0.12, 6, (0.1, -0.54, 0.42), rot=(math.pi / 2, 0, 0), m=M['iron'])
p.cyl(0.4, 0.4, 0.07, 12, (0.35, 0.72, 0.0), m=M['char'])                                        # the fallen wheel
for sy in (-0.3, 0.3):
    p.limb((-0.55, sy, 0.45), (-0.98, sy * 1.2, 0.03), 0.04, 0.035, 5, M['char'])               # shafts in the ash
p.blocked = all_cells(p); done(p)

# ---------- the Ditch trench kit (a 2-tile-wide E-W trench; clients carve the ground under 'cut' cells) ----------
# v2: deeper, dark, with a lit top edge on the north bank and stakes leaning out from the south lip, so from the default
# game camera (looking north, pitch ~62 deg) the Ditch reads as a black trench with a spiked rim, not a wall line.
DEPTH = 2.2
def trench_bed(p, x0, x1, y0, y1):
    """Muddy floor with a few dark puddles, a hair above the carve depth."""
    p.plate([(x0, y0, -DEPTH), (x1, y0, -DEPTH), (x1, y1, -DEPTH), (x0, y1, -DEPTH)], M['mud'])
    for k in range(max(1, int(round((x1 - x0) * 1.5)))):
        cx, cy, r = p.rng.uniform(x0 + 0.2, x1 - 0.2), p.rng.uniform(y0 + 0.3, y1 - 0.3), p.rng.uniform(0.14, 0.26)
        p.plate([(cx + math.cos(t) * r * (1.4 if i % 2 else 1.0), cy + math.sin(t) * r, -DEPTH + 0.012) for i, t in enumerate([j * math.tau / 7 for j in range(7)])], M['puddle'])

def stone_face(p, x0, x1, y, facing):
    """Stone revetment down the south bank (facing north), from the lip to the bed, coursed dark blocks."""
    z = -DEPTH
    row = 0
    while z < -0.02:
        x = x0 - (0.25 if row % 2 else 0)
        h = min(0.4, -z - 0.02)
        while x < x1 - 0.02:
            a, b = max(x, x0), min(x + 0.5, x1)
            if b - a > 0.08:
                deep = z < -DEPTH * 0.55
                p.box((b - a - 0.03, 0.3, h - 0.02), ((a + b) / 2, y + facing * 0.08 + 0.02 * p.rng.uniform(-1, 1), z + h / 2), (0, 0, 0),
                      M['bank_deep'] if deep else (M['bank'] if p.rng.random() > .3 else M['stone_dark']))
            x += 0.5
        z += 0.4
        row += 1

def earth_bank(p, x0, x1, y):
    """The north bank, the face a player sees from the south: a battered slope (it falls about a tile over its 2.2 depth,
    so the game camera sees most of it) shading from a lit earth rim, through dark stone, to near black at the floor:
    it reads as depth at a glance. Rough stones stud the slope so it is not a flat ramp."""
    bands = [(0.0, -0.45, M['soil']), (-0.45, -1.15, M['bank']), (-1.15, -DEPTH, M['bank_deep'])]
    run = 0.95                                            # horizontal fall of the whole bank
    for z0, z1, m in bands:
        y0, y1 = y - run * (-z0 / DEPTH), y - run * (-z1 / DEPTH)
        p.plate([(x0, y0, z0), (x0, y1, z1), (x1, y1, z1), (x1, y0, z0)], m, both=True)
    for k in range(max(2, int(round((x1 - x0) * 3)))):
        zz = p.rng.uniform(-DEPTH + 0.3, -0.35)
        yy = y - run * (-zz / DEPTH) - 0.02
        p.rock(p.rng.uniform(0.09, 0.16), (p.rng.uniform(x0 + 0.1, x1 - 0.1), yy, zz), (1.3, 0.7, 0.9), M['bank'] if zz > -1.1 else M['bank_deep'], rough=0.25, subdiv=1)

def stake(p, x, y, lean=None, length=None):
    """A sharpened stake set in the south lip, leaning out over the trench toward the north."""
    lean = p.rng.uniform(0.55, 1.05) if lean is None else lean
    length = p.rng.uniform(0.95, 1.35) if length is None else length
    p.limb((x, y - 0.25, -0.3), (x + p.rng.uniform(-0.12, 0.12), y + lean, length - 0.3), p.rng.uniform(0.065, 0.09), 0.01, 5, M['char'])

def stakes(p, x0, x1, y):
    """Two stakes per tile at uneven spacing, lean and height (a row of spikes, not a picket fence); now and then one
    has fallen into the trench."""
    n = max(1, int(round((x1 - x0) * 2)))
    for k in range(n):
        x = x0 + (k + 0.5) * (x1 - x0) / n + p.rng.uniform(-0.12, 0.12)
        if p.rng.random() < 0.18:
            p.limb((x, y + 0.4, -DEPTH + 0.05), (x + p.rng.uniform(-0.3, 0.3), y + 1.3, -DEPTH + 0.35), 0.07, 0.01, 5, M['char'])   # fallen in
        else:
            stake(p, x, y)

p = Piece('ditch_straight', 1, 2, ['ditch'], rotations=(0, 2), about='One tile of the Wilderness Ditch (1 wide, 2 deep): a dark trench 2.2 deep with a muddy floor, a coursed north bank shading to black, three charred stakes leaning north from the south lip.')
trench_bed(p, -0.5, 0.5, -1.0, 1.0)
stone_face(p, -0.5, 0.5, -1.0, 1)
earth_bank(p, -0.5, 0.5, 1.0)
stakes(p, -0.5, 0.5, -1.02)
p.water = all_cells(p); p.cut = all_cells(p); p.cut_depth = DEPTH; done(p)

p = Piece('ditch_end', 1, 2, ['ditch'], rotations=(0, 1, 2, 3), about='The west end of a Ditch run (rotate 2 for the east end): the trench closed by a stone end wall.')
trench_bed(p, -0.5, 0.5, -1.0, 1.0)
stone_face(p, -0.5, 0.5, -1.0, 1)
earth_bank(p, -0.5, 0.5, 1.0)
stakes(p, -0.3, 0.5, -1.02)
for k in range(4):
    for zz in range(6):
        h = min(0.4, DEPTH - zz * 0.4 - 0.02)
        if h > 0.05:
            p.box((0.3, 0.5, h - 0.02), (-0.42, -0.75 + k * 0.5, -DEPTH + zz * 0.4 + h / 2), (0, 0, 0), M['bank_deep'] if zz < 3 else M['bank'])
p.water = all_cells(p); p.cut = all_cells(p); p.cut_depth = DEPTH; done(p)

p = Piece('ditch_corner', 2, 2, ['ditch'], rotations=(0, 1, 2, 3), about='The Ditch turning from its westward run to the north: stone faces on the outer south and east sides.')
trench_bed(p, -1.0, 1.0, -1.0, 1.0)
stone_face(p, -1.0, 1.0, -1.0, 1)
earth_bank(p, -1.0, 0.8, 1.0)
stakes(p, -1.0, 0.8, -1.02)
for k in range(4):
    for zz in range(6):
        p.box((0.3, 0.5, 0.38), (0.92, -0.75 + k * 0.5, -DEPTH + 0.19 + zz * 0.4), (0, 0, 0), M['bank_deep'] if zz < 3 else M['bank'])
p.water = all_cells(p); p.cut = all_cells(p); p.cut_depth = DEPTH; done(p)

p = Piece('ditch_crossing_planks', 2, 2, ['ditch', 'crossing'], rotations=(0, 2), about='A plank crossing over the carved Ditch (2 wide): walk on the deck, the trench runs on beneath.')
trench_bed(p, -1.0, 1.0, -1.0, 1.0)
stone_face(p, -1.0, 1.0, -1.0, 1)
earth_bank(p, -1.0, 1.0, 1.0)
for k in range(8):
    y = -0.94 + k * 0.27
    p.box((1.9, 0.24, 0.07), (0, y, 0.02), (0, 0, p.rng.uniform(-0.02, 0.02)), M['plank'])
for sx in (-0.98, 0.98):
    p.box((0.12, 2.2, 0.14), (sx, 0, -0.06), (0, 0, 0), M['char'])                              # stringers
    for y in (-1.0, 1.0):
        p.cyl(0.07, 0.06, 0.95, 6, (sx, y, -0.05), m=M['char'])                                  # rail posts
    p.box((0.06, 2.0, 0.06), (sx, 0, 0.82), (0, 0, 0), M['char'])                                # rail
for y in (-0.4, 0.4):
    p.cyl(0.08, 0.08, DEPTH + 0.02, 6, (0, y, -DEPTH), m=M['char'])                             # trestle legs
p.cut = all_cells(p); p.cut_depth = DEPTH; p.walk = all_cells(p); p.walk_y = 0.06; done(p)

p = Piece('ditch_crossing_stone', 2, 2, ['ditch', 'crossing'], rotations=(0, 2), about='A stone causeway where the Ditch was filled in (2 wide): kerbs on both sides, ground left uncut.')
for sx in (-0.95, 0.95):
    for k in range(4):
        p.box((0.22, 0.46, 0.32), (sx, -0.75 + k * 0.5, 0.12), (0, 0, p.rng.uniform(-0.05, 0.05)), M['stone'] if k % 2 else M['stone_dark'])
for k in range(9):
    p.box((p.rng.uniform(0.3, 0.5), p.rng.uniform(0.25, 0.4), 0.05), (p.rng.uniform(-0.6, 0.6), p.rng.uniform(-0.85, 0.85), 0.02), (0, 0, p.rng.uniform(0, 3)), M['stone'])
done(p)

p = Piece('ditch_lip_wall', 1, 1, ['ditch', 'wall'], rotations=(0, 2), about='Low rough wall on the north edge of a tile, the south lip of the Ditch; dressing (the trench itself stops walkers).')
courses(p, -0.5, 0.5, 0.5, 0.36, 0.3, seed=31, thick=0.3, m=M['stone_dark'])   # v2: knee-low, dark and broken: the rim, not a wall
done(p)

# ---------- signs, camps, markers ----------
p = Piece('wild_warning_sign', 1, 1, ['sign'], about='Wilderness warning sign: a weathered board on a post, a painted skull and crossed bones over a red band, facing south.')
p.cyl(0.1, 0.08, 2.5, 6, (0, 0.06, 0), m=M['wood'])
p.box((1.3, 0.1, 0.9), (0, 0, 1.95), (0.04, 0, 0.03), M['wood'])
p.box((1.24, 0.02, 0.16), (0, -0.06, 1.62), (0.04, 0, 0.03), M['red'])
p.box((1.24, 0.02, 0.1), (0, -0.06, 2.33), (0.04, 0, 0.03), M['red'])
p.rock(0.16, (0, -0.08, 1.98), (1, 0.35, 1.1), M['bone'], rough=0.03)                              # painted skull
p.box((0.19, 0.02, 0.07), (0, -0.08, 1.85), (0.04, 0, 0.03), M['bone'])
p.box((0.72, 0.02, 0.07), (0, -0.075, 2.05), (0.04, 0, 0.65), M['bone'])                           # crossed bones
p.box((0.72, 0.02, 0.07), (0, -0.075, 2.05), (0.04, 0, -0.65), M['bone'])
p.blocked = all_cells(p); done(p)

p = Piece('camp_fire_remnant', 1, 1, ['camp', 'fire'], about='A dead campfire: ring of dark stones, charred logs across an ash bed, a few embers still glowing.')
p.plate([(math.cos(a) * 0.34, math.sin(a) * 0.34, 0.012) for a in [k * math.tau / 8 for k in range(8)]], M['ashbed'])
for k in range(8):
    a = k * math.tau / 8
    p.rock(0.11, (math.cos(a) * 0.4, math.sin(a) * 0.4, 0.02), (1.2, 1, 0.8), M['rock'], rough=0.2, subdiv=1)
p.limb((-0.25, -0.1, 0.07), (0.25, 0.12, 0.09), 0.06, 0.05, 6, M['bark'])
p.limb((-0.15, 0.22, 0.08), (0.18, -0.2, 0.1), 0.055, 0.045, 6, M['bark_lit'])
for k in range(3):
    p.rock(0.04, (p.rng.uniform(-0.15, 0.15), p.rng.uniform(-0.15, 0.15), 0.03), (1, 1, 0.6), M['ember'], rough=0.2, subdiv=1)
p.blocked = all_cells(p); done(p)

p = Piece('camp_tent_ruin', 2, 2, ['camp'], rotations=(0, 1, 2, 3), about='Burnt-out tent: a leaning A-frame of charred poles with rags of canvas, a bedroll in the ash; solid.')
for sx in (-0.8, 0.8):
    p.limb((sx, -0.7, 0), (sx * 0.05, -0.6, 1.4), 0.05, 0.04, 5, M['char'])
    p.limb((sx, 0.7, 0), (sx * 0.05, 0.62, 1.3), 0.05, 0.04, 5, M['char'])
p.limb((0.0, -0.65, 1.38), (0.02, 0.65, 1.28), 0.045, 0.04, 5, M['char'])                          # ridge pole
p.plate([(-0.02, -0.55, 1.33), (-0.02, 0.25, 1.28), (-0.7, 0.2, 0.18), (-0.75, -0.5, 0.1)], M['canvas'])   # the one canvas panel left
p.plate([(0.05, 0.3, 1.25), (0.05, 0.6, 1.23), (0.4, 0.62, 0.62)], M['canvas'])
p.box((0.5, 1.1, 0.08), (0.45, 0.0, 0.04), (0, 0, 0.1), M['canvas'])                                  # bedroll
p.blocked = all_cells(p); done(p)

p = Piece('camp_crates_burnt', 1, 1, ['camp'], about='Two burnt supply crates, one split open.')
p.box((0.6, 0.55, 0.5), (-0.12, 0.08, 0.25), (0, 0, 0.2), M['char'])
p.box((0.45, 0.45, 0.35), (0.22, -0.2, 0.17), (0, 0.3, -0.4), M['char'])
p.box((0.5, 0.06, 0.3), (0.28, 0.2, 0.05), (1.4, 0, 0.3), M['char'])
p.blocked = all_cells(p); done(p)

p = Piece('depth_stone', 1, 1, ['marker'], about='A depth stone of the old wardens: a dark standing stone cut with notches, set every eight tiles north of the Ditch so travellers know how deep they are.')
p.rock(0.25, (0, 0, 0.0), (1.2, 1.0, 0.6), M['rock'], rough=0.25)
p.box((0.42, 0.3, 1.3), (0, 0, 0.65), (0.03, 0.02, 0.1), M['rock'])
p.box((0.36, 0.26, 0.2), (0, 0, 1.36), (0.03, 0.02, 0.1), M['rock'])
for k in range(3):
    p.box((0.44, 0.02, 0.05), (0, -0.16, 0.7 + k * 0.16), (0.03, 0.02, 0.1), M['bone'])              # the cut notches, chalked
p.blocked = all_cells(p); done(p)

# ---------- save + export (untextured; the recipe adds UVs + kit textures) ----------
bpy.ops.wm.save_as_mainfile(filepath=str(WS / 'scarlands_kit.blend'), compress=False)
bpy.ops.export_scene.gltf(filepath=str(WS / 'scarlands_kit_flat.glb'), export_format='GLB', export_yup=True, export_extras=True)
(WS / 'pieces.json').write_text(json.dumps({'schema': 'crafted-realm-scarlands-pieces-v1', 'builder': 'tools/blender/build_scarlands_kit_v1.py',
    'blender': bpy.app.version_string, 'axes': 'Blender +X east, +Y north, Z up; glTF +X east, -Z north, +Y up',
    'pieces': pieces}, indent=1) + '\n')
print('[SCARLANDS KIT]', len(pieces), 'pieces,', sum(p['triangles'] for p in pieces), 'triangles')
