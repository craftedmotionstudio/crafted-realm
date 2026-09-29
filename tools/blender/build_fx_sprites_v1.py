"""FX sprites v1 (2026-09-29, owner request): the level-up firework sparks and the falling oak leaves, modelled and rendered
in Blender like the item icons (owner rule: every sprite is an image or a Blender render, never a code-drawn shape; style
2004 old-school RuneScape: cozy, chunky, low-poly, not too polished).

Two atlases, 2 x 2 cells of 128 px each (256 x 256 RGBA PNG), row-major from the top-left cell:
  levelup_sparks_v1.png   0 twinkle (a four-pointed star)   1 burst star (six points)
                          2 ember (a faceted gem: the rising spark's head)   3 flare (a thin cross of rays at the burst)
      White / pale faceted models (a raised centre, so each facet catches the key light differently): the game tints each
      spark with its own colour, so one sheet makes every colour. Brightest facet normalised to white; shapes stay inside
      the cell's inscribed circle (the fireworks shader turns each spark in place).
  oak_leaves_v1.png       0 autumn green   1 olive gold   2 amber   3 russet
      A low-poly lobed oak leaf per cell (four rounded lobes a side and a rounded tip; seeded lobe variation per cell),
      folded a little along the midrib and curled along its length so the halves and facets shade apart; a darker raised
      midrib and a short stem. Rendered straight down so the game can lay it on any quad.
Pipeline as tools/blender/build_world_item_icons_v1.py: orthographic camera, EEVEE, white world .42, key sun 2.3 + fill .45,
rendered at 4x and box-downsampled, then a 1 px rim (a dark ink rim on the leaves; a soft grey rim on the sparks, so the
tinted spark keeps a darker edge of its own colour instead of a black line).

Usage: "C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe" -b --python tools/blender/build_fx_sprites_v1.py
Outputs: assets/textures/fx/levelup_sparks_v1.png, assets/textures/fx/oak_leaves_v1.png, assets/textures/fx/fx_sprites_v1.json;
         scratchpad/levelup_leaves/blender_fx_sprites_v1_proof.png (both sheets enlarged over grass and dusk backgrounds).
Deterministic (seeded random.Random); all geometry authored here, nothing traced from any game.
"""
import bpy, bmesh, math, random, json
from pathlib import Path
from mathutils import Vector
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/textures/fx'
PROOF = ROOT / 'scratchpad/levelup_leaves'
TMP = PROOF / '_tmp_fx'
for d in (OUT, PROOF, TMP): d.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
TAG = '[FX_SPRITES_V1]'
SRC = 'tools/blender/build_fx_sprites_v1.py'
CELL, SS = 128, 4

def lin(h):
    c = ((h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255)
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in c)

# ---------------------------------------------------------------- scene, camera, light (the item icon rig)
scene = bpy.context.scene
for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
    try: scene.render.engine = eng; break
    except TypeError: pass
try: scene.view_settings.view_transform = 'Standard'   # a dynamic enum (RNA under-reports it): sRGB out, no tone curve
except TypeError: pass
scene.view_settings.look = 'None'
scene.world = bpy.data.worlds.new('FxWorld'); scene.world.use_nodes = True
bg = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
bg.inputs[0].default_value = (1, 1, 1, 1); bg.inputs[1].default_value = .42
key = bpy.data.objects.new('FxKey', bpy.data.lights.new('FxKey', 'SUN')); key.data.energy = 2.3; key.data.angle = math.radians(3)
key.rotation_euler = (math.radians(38), 0, math.radians(-40)); scene.collection.objects.link(key)
fill = bpy.data.objects.new('FxFill', bpy.data.lights.new('FxFill', 'SUN')); fill.data.energy = .45
fill.rotation_euler = (math.radians(70), 0, math.radians(140)); scene.collection.objects.link(fill)
try: scene.eevee.taa_render_samples = 16
except Exception: pass
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGBA'
scene.render.filter_size = 1.0; scene.render.resolution_percentage = 100
scene.render.resolution_x = scene.render.resolution_y = CELL * SS
cam = bpy.data.objects.new('FxCam', bpy.data.cameras.new('FxCam')); scene.collection.objects.link(cam)
cam.data.type = 'ORTHO'; cam.data.clip_end = 100; scene.camera = cam
cam.location = (0, 0, 20); cam.rotation_euler = (0, 0, 0)   # straight down, +Y up in the image
COLL = bpy.data.collections.new('fx'); scene.collection.children.link(COLL)

MATS = {}
def mat(name, hexcol, rough=1.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value = (*lin(hexcol), 1); bs.inputs['Roughness'].default_value = rough
    for k in ('Specular IOR Level', 'Specular'):
        if k in bs.inputs: bs.inputs[k].default_value = 0.0
    MATS[name] = m; return m

def mesh_obj(name, verts, faces, mats, mi):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces)
    for m in mats: me.materials.append(m)
    for p, i in zip(me.polygons, mi): p.material_index = i; p.use_smooth = False
    me.validate(); me.update()
    ob = bpy.data.objects.new(name, me); COLL.objects.link(ob); return ob

def clear():
    for o in list(COLL.objects): bpy.data.objects.remove(o, do_unlink=True)

# ---------------------------------------------------------------- pixels
def load_px(p):
    im = bpy.data.images.load(str(p)); a = np.empty(im.size[0] * im.size[1] * 4, dtype=np.float32); im.pixels.foreach_get(a)
    out = a.reshape(im.size[1], im.size[0], 4).copy(); bpy.data.images.remove(im); return out   # row 0 = bottom
def save_px(arr, p):
    h, w = arr.shape[:2]; im = bpy.data.images.new(p.stem, w, h, alpha=True)
    im.pixels.foreach_set(np.clip(arr, 0, 1).astype(np.float32).ravel()); im.filepath_raw = str(p); im.file_format = 'PNG'; im.save()
    bpy.data.images.remove(im)
def down(arr, f):
    h, w = arr.shape[0] // f, arr.shape[1] // f
    a = arr[..., 3:4]; pm = arr[..., :3] * a
    pm = pm.reshape(h, f, w, f, 3).mean(axis=(1, 3)); aa = a.reshape(h, f, w, f, 1).mean(axis=(1, 3))
    return np.concatenate([np.where(aa > 1e-6, pm / np.maximum(aa, 1e-6), 0), aa], axis=-1)
def over(top, bot):
    ta, ba = top[..., 3:4], bot[..., 3:4]; oa = ta + ba * (1 - ta)
    rgb = (top[..., :3] * ta + bot[..., :3] * ba * (1 - ta)) / np.maximum(oa, 1e-6)
    return np.concatenate([rgb, oa], axis=-1)
def shift(a, dy, dx):
    out = np.zeros_like(a); h, w = a.shape[:2]
    out[max(dy, 0):h + min(dy, 0), max(dx, 0):w + min(dx, 0)] = a[max(-dy, 0):h + min(-dy, 0), max(-dx, 0):w + min(-dx, 0)]
    return out
def rim(arr, rgb, alpha):
    a = arr[..., 3]
    dil = np.max([shift(a, dy, dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1)], axis=0)
    ol = np.zeros_like(arr); ol[..., :3] = rgb; ol[..., 3] = np.clip(dil, 0, 1) * alpha
    return over(arr, ol)

def render_cell(ortho, center, name):
    cam.data.ortho_scale = ortho; cam.location = (center[0], center[1], 20)
    tmp = TMP / (name + '.png'); scene.render.filepath = str(tmp); bpy.ops.render.render(write_still=True)
    raw = load_px(tmp); tmp.unlink(); return down(raw, SS)

# ---------------------------------------------------------------- spark models (white, faceted)
WHITE = mat('fx_spark_white', 0xfffdf4)
def star(n_points, r_out, r_in, h, name, twist=0.0):
    """a flat star with a raised centre: 2n rim vertices, one centre vertex, 2n facets"""
    vs = [(0, 0, h)]
    for k in range(2 * n_points):
        a = math.pi / 2 + k * math.pi / n_points + (twist if k % 2 else 0)
        r = r_out if k % 2 == 0 else r_in
        vs.append((math.cos(a) * r, math.sin(a) * r, 0))
    fs = [(0, 1 + k, 1 + (k + 1) % (2 * n_points)) for k in range(2 * n_points)]
    return mesh_obj(name, vs, fs, [WHITE], [0] * len(fs))
def flare(name):
    """four long thin rays and four short diagonal ones around a small raised centre"""
    vs = [(0, 0, .22)]; rim_pts = []
    for k in range(8):
        a = math.pi / 2 + k * math.pi / 4; r = 1.0 if k % 2 == 0 else .52
        rim_pts.append((math.cos(a) * r, math.sin(a) * r))
        b = a + math.pi / 8; rim_pts.append((math.cos(b) * .13, math.sin(b) * .13))
    vs += [(x, y, 0) for x, y in rim_pts]
    n = len(rim_pts); fs = [(0, 1 + k, 1 + (k + 1) % n) for k in range(n)]
    return mesh_obj(name, vs, fs, [WHITE], [0] * len(fs))
def ember(name):
    """a faceted gem seen from above: octagon girdle, a turned inner octagon, a peak"""
    vs = [(0, 0, .5)]
    for k in range(8):
        a = k * math.pi / 4; vs.append((math.cos(a), math.sin(a), 0))
    for k in range(8):
        a = k * math.pi / 4 + math.pi / 8; vs.append((math.cos(a) * .6, math.sin(a) * .6, .34))
    fs = []
    for k in range(8):
        o0, o1, i0 = 1 + k, 1 + (k + 1) % 8, 9 + k
        i_prev = 9 + (k - 1) % 8
        fs += [(o0, o1, i0), (i_prev, o0, i0), (0, i0, 9 + (k + 1) % 8)]
    return mesh_obj(name, vs, fs, [WHITE], [0] * len(fs))

SPARK_CELLS = [
    ('twinkle', lambda: star(4, 1.0, .27, .34, 'fx_twinkle')),
    ('burst', lambda: star(6, 1.0, .5, .3, 'fx_burst')),
    ('ember', lambda: ember('fx_ember')),
    ('flare', lambda: flare('fx_flare')),
]
def spark_cells():
    out = []
    for nm, build in SPARK_CELLS:
        clear(); build(); bpy.context.view_layer.update()
        img = render_cell(2.0 / .9, (0, 0), 'spark_' + nm)          # radius 1 inside 90% of the cell's half-width
        rgb = img[..., :3]; a = img[..., 3]
        top = np.percentile(rgb.max(axis=-1)[a > .5], 99.5) if (a > .5).any() else 1
        img[..., :3] = np.clip(rgb / max(top, 1e-3), 0, 1)            # brightest facet -> white
        out.append(rim(img, np.array([.36, .34, .32]), .75))
    return out

# ---------------------------------------------------------------- oak leaf models
LEAF_COLOURS = [   # (name, blade, midrib) sRGB
    ('autumn_green', 0x6e8a34, 0x4d6222),
    ('olive_gold', 0xa39a36, 0x746c24),
    ('amber', 0xcf8a2e, 0x985c1a),
    ('russet', 0xa8552a, 0x6f3719),
]
STEM = mat('fx_leaf_stem', 0x6b4a2a)
EXTREMA = [   # the right half's outline, tip to base: (y along, x across) of the tip, then each lobe's crest and sinus
    (1.0, 0.0), (.915, .185), (.84, .12),          # the rounded tip lobe, its sinus
    (.73, .34), (.635, .18),                       # lobe 1
    (.535, .41), (.445, .2),                       # lobe 2 (the widest)
    (.35, .37), (.265, .15),                       # lobe 3
    (.175, .25), (.085, .1),                       # lobe 4 (small, near the base)
    (.0, .035)]                                    # the base, where the stem joins
RIB_Y = [1.0, .8, .6, .4, .2, .0]
def leaf_outline(rng):
    """rounded lobes, narrow sinuses: out of a sinus the edge rises fast and rounds over the crest (sine ease), from a
    crest it rounds over and drops into the next sinus (1 - cos ease); the tip starts flat across the midrib"""
    ex = [(y + (rng.uniform(-.012, .012) if 0 < k < len(EXTREMA) - 1 else 0),
           x * (1 + (rng.uniform(-.08, .08) if 0 < k < len(EXTREMA) - 1 else 0))) for k, (y, x) in enumerate(EXTREMA)]
    pts = [(0.0, 1.0)]; steps = 4
    for k in range(len(ex) - 1):
        (y0, x0), (y1, x1) = ex[k], ex[k + 1]
        for s in range(1, steps + 1):
            t = s / steps
            if k == 0: e = math.sin(t * math.pi / 2); ey = 1 - math.cos(t * math.pi / 2)   # round over the tip
            elif x1 > x0: e = math.sin(t * math.pi / 2); ey = t                          # sinus -> crest
            else: e = 1 - math.cos(t * math.pi / 2); ey = t                              # crest -> sinus
            pts.append((x0 + (x1 - x0) * e, y0 + (y1 - y0) * ey))
    return pts
def leaf(i, blade_hex, rib_hex, rng):
    blade = mat('fx_leaf_%d' % i, blade_hex); rib = mat('fx_leaf_rib_%d' % i, rib_hex)
    half = leaf_outline(rng)
    # each half is one plane, folded up a little from the midrib and tipped along the leaf: the two halves read as two
    # flat tones (low-poly), with no sliver shading from the triangulation
    fold = math.radians(16 + rng.uniform(-3, 3)); tip = math.radians(rng.uniform(4, 8))
    def z_of(x, y): return abs(x) * math.tan(fold) + y * math.tan(tip)
    verts, faces, mi = [], [], []
    for side in (1, -1):
        bm = bmesh.new()
        ring = [(side * x, y) for x, y in half] + [(0, y) for y in RIB_Y[1:][::-1]]   # tip, outline down, midrib back up
        if side < 0: ring = ring[::-1]
        bvs = [bm.verts.new((x, y, 0)) for x, y in ring]
        f = bm.faces.new(bvs); bm.normal_update()
        bmesh.ops.triangulate(bm, faces=[f], quad_method='BEAUTY', ngon_method='EAR_CLIP')
        base = len(verts)
        idx = {v: j for j, v in enumerate(bm.verts)}
        verts += [(v.co.x, v.co.y, z_of(v.co.x, v.co.y)) for v in bm.verts]
        for fc in bm.faces:
            ids = [base + idx[v] for v in fc.verts]
            n = Vector(verts[ids[1]]) - Vector(verts[ids[0]]); n = n.cross(Vector(verts[ids[2]]) - Vector(verts[ids[0]]))
            faces.append(tuple(ids) if n.z >= 0 else tuple(ids[::-1])); mi.append(0)
        bm.free()
    # the raised midrib (a thin strip just over the fold) and the stem
    w = .024; rs = len(verts)
    for y in (0.0, .5, .9):
        zz = z_of(0, y) + .01; verts += [(-w * (1 - .7 * y), y, zz), (w * (1 - .7 * y), y, zz)]
    faces += [(rs, rs + 1, rs + 3, rs + 2), (rs + 2, rs + 3, rs + 5, rs + 4)]; mi += [1, 1]
    st = len(verts); zs = z_of(0, 0)
    verts += [(-.024, .02, zs + .01), (.024, .02, zs + .01), (.018, -.19, zs - .02), (-.012, -.2, zs - .02)]
    faces.append((st, st + 3, st + 2, st + 1)); mi.append(2)
    return mesh_obj('fx_oak_leaf_%d' % i, verts, faces, [blade, rib, STEM], mi)
def leaf_cells():
    out = []; rng = random.Random(0x0a6f11)
    for i, (nm, blade, rib) in enumerate(LEAF_COLOURS):
        clear(); ob = leaf(i, blade, rib, rng)
        ob.rotation_euler = (0, 0, math.radians(rng.uniform(-8, 8))); bpy.context.view_layer.update()
        img = render_cell(1.38, (0, .4), 'leaf_' + nm)               # stem (-0.2) to tip (1.0), centred
        out.append(rim(img, np.array([.12, .09, .05]), .8))
    return out

def atlas(cells):
    """2 x 2, cell 0 at the top-left (the arrays are bottom-up, as Blender stores pixels)"""
    top = np.concatenate([cells[0], cells[1]], axis=1); bot = np.concatenate([cells[2], cells[3]], axis=1)
    return np.concatenate([bot, top], axis=0)

sparks = spark_cells(); leaves = leaf_cells()
S, Lf = atlas(sparks), atlas(leaves)
save_px(S, OUT / 'levelup_sparks_v1.png'); save_px(Lf, OUT / 'oak_leaves_v1.png')

# proof sheet: both atlases x3 (nearest) over a grass tile and a dusk tile, sparks tinted gold / rose / green / sky
def upscale(a, k): return np.repeat(np.repeat(a, k, axis=0), k, axis=1)
def bgtile(h, w, rgb): t = np.zeros((h, w, 4)); t[..., :3] = rgb; t[..., 3] = 1; return t
tints = [np.array(c) for c in ((1, .82, .29), (1, .48, .42), (.56, .88, .48), (.48, .78, 1))]
tinted = atlas([np.concatenate([c[..., :3] * tints[i], c[..., 3:4]], axis=-1) for i, c in enumerate(sparks)])
rows = []
for bgc in ((.29, .42, .16), (.1, .11, .2)):
    row = [over(upscale(x, 3), bgtile(768, 768, bgc)) for x in (tinted, Lf)]
    rows.append(np.concatenate(row, axis=1))
save_px(np.concatenate(rows[::-1], axis=0), PROOF / 'blender_fx_sprites_v1_proof.png')

meta = {'source': SRC, 'blender': bpy.app.version_string, 'cell': CELL, 'layout': '2x2, row-major from the top-left cell',
        'uv': 'three.js flipY: cell i -> u0 = (i % 2) * .5, v0 = .5 - floor(i / 2) * .5, size .5',
        'levelup_sparks_v1.png': [n for n, _ in SPARK_CELLS],
        'oak_leaves_v1.png': [n for n, _, _ in LEAF_COLOURS]}
(OUT / 'fx_sprites_v1.json').write_text(json.dumps(meta, indent=1) + '\n', encoding='utf8')
try: TMP.rmdir()
except OSError: pass
print(TAG, 'wrote', OUT / 'levelup_sparks_v1.png', OUT / 'oak_leaves_v1.png')
