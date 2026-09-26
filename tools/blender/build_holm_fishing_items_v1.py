"""Minnow Hollow catches as Blender items + inventory icons (Tutor's Holm v2 land, phase 2, 2026-09-26).
The varied catches of the new pond fishing: the reedpike (raw, cooked, burnt), junk (a soggy boot, a clump of pondweed) and
the rare finds (a sealed bottle with a note, a tarnished ring). Same conventions as build_holm_items_v1.py: one named root
per item id, origin at the resting base, longest axis +X, flat matte authored sRGB, and 96x96 icons rendered from the same
models (orthographic, 50 deg, RS-style 1px ink outline) into assets/icons/items/<id>.png (manifest entries appended).
Run: "Blender 4.5/blender.exe" -b --python tools/blender/build_holm_fishing_items_v1.py"""
import bpy, sys, math, json
from pathlib import Path
from mathutils import Vector
HERE = Path(__file__).resolve().parent; sys.path.insert(0, str(HERE)); ROOT = HERE.parents[1]
from holm_interior_kit import Acc, M
from holm_v2_pack import Pack
import numpy as np
P = Pack('HOLM_FISHING_ITEMS_V1', ROOT / '.studio-workspaces/holm-fishing-items-v1/candidates', budget_tris=4000)
ICONS = ROOT / 'assets/icons/items'; TMP = ROOT / 'scratchpad/holm_v2_land/props/_icons'; TMP.mkdir(parents=True, exist_ok=True)
EYE = M('Fish eye', '#1a1a18')
def ell(A, c, r, m, seg=8, rings=4):
    cx, cy, cz = c; rx, ry, rz = r; V = [(cx, cy - ry, cz)]; F = []
    for i in range(1, rings):
        ph = -math.pi / 2 + math.pi * i / rings
        for j in range(seg):
            th = 2 * math.pi * j / seg; V.append((cx + rx * math.cos(ph) * math.cos(th), cy + ry * math.sin(ph), cz + rz * math.cos(ph) * math.sin(th)))
    V.append((cx, cy + ry, cz)); top = len(V) - 1
    for j in range(seg): F.append((0, 1 + (j + 1) % seg, 1 + j))
    for i in range(rings - 2):
        a = 1 + i * seg; b = a + seg
        for j in range(seg): F.append((a + j, a + (j + 1) % seg, b + (j + 1) % seg, b + j))
    a = 1 + (rings - 2) * seg
    for j in range(seg): F.append((a + j, a + (j + 1) % seg, top))
    A.poly(V, F, m)
def tri(A, a, b, c, m): A.poly([a, b, c], [(0, 1, 2), (0, 2, 1)], m)
def fish(name, L, body, belly, fin, spots=None, lying=True):
    r = P.root(name, kind='item'); A = Acc(name + '_Mesh'); h = L * .1
    ell(A, (0, h, 0), (L * .5, L * .1, L * .16), body)   # lying on its side: flat axis is y
    ell(A, (L * .05, h, L * .06), (L * .36, L * .085, L * .08), belly, seg=6, rings=3)
    tri(A, (-L * .44, h, 0), (-L * .66, h, L * .14), (-L * .66, h, -L * .14), fin)
    tri(A, (L * .12, h, -L * .14), (-L * .18, h, -L * .24), (-L * .22, h, -L * .13), fin)
    ell(A, (L * .36, h + L * .07, L * .04), (L * .025, L * .02, L * .025), EYE, seg=5, rings=3)
    if spots:
        for i in range(5): ell(A, (L * (.2 - i * .12), h + L * .085, -L * .05), (L * .03, L * .01, L * .02), spots, seg=5, rings=3)
    A.build(r, vcol=False)
PIKE, PIKE_B, PIKE_S, PIKE_F = M('Pike scales', '#6d7c48'), M('Pike belly', '#d6cfa4'), M('Pike spots', '#c9c27a'), M('Pike fins', '#8a7a3a')
fish('raw_reedpike', .56, PIKE, PIKE_B, PIKE_F, spots=PIKE_S)
fish('cooked_reedpike', .54, M('Roast pike', '#b8773c'), M('Roast pike belly', '#dca468'), M('Roast pike fins', '#8a5028'), spots=M('Roast pike char', '#6e4020'))
fish('burnt_reedpike', .52, M('Burnt pike', '#2c2622'), M('Burnt pike belly', '#453a30'), M('Burnt pike fins', '#1c1814'))
# soggy boot: sole, upper, turned-down cuff, a weed strand
r = P.root('soggy_boot', kind='item'); A = Acc('soggy_boot_Mesh'); LEA, SOLE, WEED = M('Soggy leather', '#5a3e2a'), M('Boot sole', '#2e2620'), M('Weed strand', '#4f6a2c')
A.box(-.16, .2, 0, .04, -.07, .07, SOLE); A.box(-.15, .1, .04, .12, -.065, .065, LEA); A.box(-.15, -.02, .12, .34, -.06, .06, LEA)
A.box(-.16, -.01, .31, .37, -.068, .068, M('Boot cuff', '#6e4e36')); A.lathe(.12, 0, .04, [(.07, 0), (.05, .06), (.0, .08)], 6, LEA, top=False)
A.beam((-.08, .36, .06), (.05, .15, .09), .02, .01, WEED); A.beam((.05, .15, .09), (.16, .05, .05), .02, .01, WEED)
A.build(r, vcol=False)
# pondweed: a dripping tangle
r = P.root('pond_weed', kind='item'); A = Acc('pond_weed_Mesh'); W1, W2 = M('Pondweed', '#56742f'), M('Pondweed dark', '#3c5424')
for i in range(9):
    a = i * 2.39; x = .12 * math.cos(a); z = .1 * math.sin(a); A.beam((x * .3, .02, z * .3), (x + .08 * math.cos(a * 1.7), .1 + (i % 3) * .03, z + .06), .045, .018, W1 if i % 2 else W2)
ell(A, (0, .05, 0), (.12, .05, .1), W2, seg=7, rings=3)
A.build(r, vcol=False)
# sealed bottle: green glass, wax seal, rolled note inside
r = P.root('sealed_bottle', kind='item'); A = Acc('sealed_bottle_Mesh'); GL, WAX, NOTE = M('Bottle glass', '#5d8a6a'), M('Seal wax', '#a8322a'), M('Rolled note', '#e8dcb8')
def lying_lathe(prof, m, n=8):   # a lathe along +x, lying on the ground
    V = []; idx = []
    for rr, xx in prof:
        idx.append(list(range(len(V), len(V) + n))); V.extend((xx, rr + (rr * math.sin(2 * math.pi * k / n)), rr * math.cos(2 * math.pi * k / n)) for k in range(n))
    F = [(a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]) for a, b in zip(idx, idx[1:]) for k in range(n)]
    F += [tuple(reversed(idx[0])), tuple(idx[-1])]; A.poly(V, F, m)
lying_lathe([(.07, -.14), (.08, -.1), (.08, .06), (.035, .12), (.03, .19)], GL)
lying_lathe([(.034, .18), (.036, .215)], WAX, n=6)
A.box(-.09, .05, .05, .08, -.02, .02, NOTE)
A.build(r, vcol=False)
# tarnished ring: a band with a dull stone
r = P.root('tarnished_ring', kind='item'); A = Acc('tarnished_ring_Mesh'); BAND, STONE = M('Tarnished silver', '#8c8a6e'), M('Dull garnet', '#6a2a2e')
n = 12
for k in range(n):
    a0, a1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
    for (r0, r1) in ((.06, .075),):
        V = [(r0 * math.cos(a0), .012, r0 * math.sin(a0)), (r1 * math.cos(a0), .012, r1 * math.sin(a0)), (r1 * math.cos(a1), .012, r1 * math.sin(a1)), (r0 * math.cos(a1), .012, r0 * math.sin(a1))]
        A.poly(V + [(x, 0, z) for x, _, z in V], [(0, 1, 2, 3), (7, 6, 5, 4), (1, 5, 6, 2), (0, 3, 7, 4)], BAND)
ell(A, (.075, .03, 0), (.022, .02, .022), STONE, seg=6, rings=3)
A.build(r, vcol=False)

P.export('items.glb')
# ---------------------------------------------------------------- icons (the build_holm_items_v1.py method)
scene = bpy.context.scene
for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
    try: scene.render.engine = eng; break
    except TypeError: pass
vts = [i.identifier for i in scene.view_settings.bl_rna.properties['view_transform'].enum_items]
scene.view_settings.view_transform = 'Raw' if 'Raw' in vts else 'Standard'; scene.view_settings.look = 'None'
scene.world = bpy.data.worlds.new('IconWorld'); scene.world.use_nodes = True
bg = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs[0].default_value = (1, 1, 1, 1); bg.inputs[1].default_value = .42
key = bpy.data.objects.new('IconKey', bpy.data.lights.new('IconKey', 'SUN')); key.data.energy = 2.3; key.data.angle = math.radians(3); key.rotation_euler = (math.radians(38), 0, math.radians(-40)); scene.collection.objects.link(key)
fill = bpy.data.objects.new('IconFill', bpy.data.lights.new('IconFill', 'SUN')); fill.data.energy = .45; fill.rotation_euler = (math.radians(70), 0, math.radians(140)); scene.collection.objects.link(fill)
try: scene.eevee.taa_render_samples = 16
except Exception: pass
scene.render.film_transparent = True; scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGBA'; scene.render.filter_size = 1.0
# the Acc materials are diffuse-only (use_nodes off): give each a Principled node with its authored colour for Eevee
for m in bpy.data.materials:
    if m.name.startswith('Icon') or not m.get('srgb'): continue
    m.use_nodes = True; bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value = (*m['srgb'], 1); bs.inputs['Roughness'].default_value = 1
ICON, SS, EL, MARGIN = 96, 4, math.radians(50), .07
cam = bpy.data.objects.new('IconCam', bpy.data.cameras.new('IconCam')); scene.collection.objects.link(cam); cam.data.type = 'ORTHO'; scene.camera = cam
cam.location = Vector((0, -math.cos(EL), math.sin(EL))) * 20; cam.rotation_euler = (-cam.location).to_track_quat('-Z', 'Y').to_euler()
def load_px(p):
    im = bpy.data.images.load(str(p)); a = np.empty(im.size[0] * im.size[1] * 4, dtype=np.float32); im.pixels.foreach_get(a)
    out = a.reshape(im.size[1], im.size[0], 4).copy(); bpy.data.images.remove(im); return out
def save_px(arr, p):
    h, w = arr.shape[:2]; im = bpy.data.images.new(p.stem, w, h, alpha=True); im.pixels.foreach_set(np.clip(arr, 0, 1).astype(np.float32).ravel()); im.filepath_raw = str(p); im.file_format = 'PNG'; im.save(); bpy.data.images.remove(im)
def down(arr, f):
    h, w = arr.shape[0] // f, arr.shape[1] // f; a = arr[..., 3:4]; pm = arr[..., :3] * a
    pm = pm.reshape(h, f, w, f, 3).mean(axis=(1, 3)); aa = a.reshape(h, f, w, f, 1).mean(axis=(1, 3))
    return np.concatenate([np.where(aa > 1e-6, pm / np.maximum(aa, 1e-6), 0), aa], axis=-1)
def over(top, bot):
    ta, ba = top[..., 3:4], bot[..., 3:4]; oa = ta + ba * (1 - ta); rgb = (top[..., :3] * ta + bot[..., :3] * ba * (1 - ta)) / np.maximum(oa, 1e-6); return np.concatenate([rgb, oa], axis=-1)
def shift(a, dy, dx):
    out = np.zeros_like(a); h, w = a.shape[:2]; out[max(dy, 0):h + min(dy, 0), max(dx, 0):w + min(dx, 0)] = a[max(-dy, 0):h + min(-dy, 0), max(-dx, 0):w + min(-dx, 0)]; return out
def srgb_decode(c): return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
INK = np.array([.07, .055, .04])
def outline(arr):
    a = arr[..., 3]; dil = np.max([shift(a, dy, dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1)], axis=0)
    ol = np.zeros_like(arr); ol[..., :3] = INK; ol[..., 3] = np.clip(dil, 0, 1) * .9
    sh = np.zeros_like(arr); sh[..., :3] = INK; sh[..., 3] = shift(dil, -1, 1) * .35; return over(arr, over(ol, sh))
YAW = {'raw_reedpike': 30, 'cooked_reedpike': 30, 'burnt_reedpike': 30, 'soggy_boot': 25, 'pond_weed': 0, 'sealed_bottle': 25, 'tarnished_ring': 20}
for r in P.roots: r.location = (0, 0, -100)
done = []
for r in P.roots:
    r.location = (0, 0, 0); r.rotation_euler = (0, 0, math.radians(YAW.get(r.name, 0))); bpy.context.view_layer.update()
    inv = cam.matrix_world.inverted(); pts = [inv @ (x.matrix_world @ v.co) for x in r.children_recursive if x.type == 'MESH' for v in x.data.vertices]
    x0, x1 = min(p.x for p in pts), max(p.x for p in pts); y0, y1 = min(p.y for p in pts), max(p.y for p in pts); span = max(x1 - x0, y1 - y0) * (1 + 2 * MARGIN)
    cam.data.ortho_scale = span; cam.data.shift_x = (x0 + x1) / 2 / span; cam.data.shift_y = (y0 + y1) / 2 / span
    scene.render.resolution_x = scene.render.resolution_y = ICON * SS; scene.render.resolution_percentage = 100
    tmp = TMP / (r.name + '.png'); scene.render.filepath = str(tmp); bpy.ops.render.render(write_still=True)
    raw = load_px(tmp); raw[..., :3] = srgb_decode(raw[..., :3]); save_px(outline(down(raw, SS)), ICONS / (r.name + '.png')); done.append(r.name)
    r.location = (0, 0, -100); r.rotation_euler = (0, 0, 0)
man = json.loads((ICONS / 'manifest.json').read_text())
have = {e['id'] for e in man['icons']}
for n in done:
    if n not in have: man['icons'].append({'id': n, 'file': n + '.png', 'source': 'tools/blender/build_holm_fishing_items_v1.py'})
(ICONS / 'manifest.json').write_text(json.dumps(man, indent=2) + '\n', encoding='utf8')
print('[HOLM_FISHING_ITEMS_V1] icons', done)
