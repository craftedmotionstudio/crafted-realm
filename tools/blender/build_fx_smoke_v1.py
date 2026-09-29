"""FX smoke v1 (animation pass, 2026-09-29): the chimney smoke puffs of Tutor's Holm, modelled and rendered in Blender like
the level-up sparks (owner rule: every sprite is an image or a Blender render, never a code-drawn shape; style 2004
old-school RuneScape: chunky, low-poly, not too polished).

One atlas, 2 x 2 cells of 128 px (256 x 256 RGBA PNG), row-major from the top-left cell:
  chimney_smoke_v1.png   0 big puff (five faceted lumps)   1 puff (four lumps)
                         2 small puff (three lumps)        3 wisp (a stretched pair, the tail of a puff)
      Pale warm-grey faceted low-poly lumps (icospheres, one subdivision, flat shaded) seen side-on, so the key light picks
      out their facets; the game tints each puff (warm grey near the chimney, paler and thinner as it rises) and turns it
      in place. Brightest facet normalised to white; shapes stay inside the cell's inscribed circle; a soft grey 1 px rim.
Pipeline as tools/blender/build_fx_sprites_v1.py: orthographic camera, EEVEE, white world .42, key sun 2.3 + fill .45,
rendered at 4x and box-downsampled, then the rim.

Usage: "C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe" -b --python tools/blender/build_fx_smoke_v1.py
Outputs: assets/textures/fx/chimney_smoke_v1.png, assets/textures/fx/chimney_smoke_v1.json;
         scratchpad/holm_anim_pass/blender_fx_smoke_v1_proof.png (the sheet enlarged over roof and sky backgrounds).
Deterministic (seeded random.Random); all geometry authored here.
"""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/textures/fx'
PROOF = ROOT / 'scratchpad/holm_anim_pass'
TMP = PROOF / '_tmp_smoke'
for d in (OUT, PROOF, TMP): d.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
TAG = '[FX_SMOKE_V1]'
SRC = 'tools/blender/build_fx_smoke_v1.py'
CELL, SS = 128, 4

def lin(h):
    c = ((h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255)
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in c)

scene = bpy.context.scene
for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
    try: scene.render.engine = eng; break
    except TypeError: pass
try: scene.view_settings.view_transform = 'Standard'
except TypeError: pass
scene.view_settings.look = 'None'
scene.world = bpy.data.worlds.new('FxWorld'); scene.world.use_nodes = True
bg = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
bg.inputs[0].default_value = (1, 1, 1, 1); bg.inputs[1].default_value = .42
key = bpy.data.objects.new('FxKey', bpy.data.lights.new('FxKey', 'SUN')); key.data.energy = 2.3; key.data.angle = math.radians(3)
key.rotation_euler = (math.radians(55), 0, math.radians(-35)); scene.collection.objects.link(key)
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
cam.location = (0, -20, 0); cam.rotation_euler = (math.radians(90), 0, 0)   # side-on: looking +Y, +Z up in the image
COLL = bpy.data.collections.new('fx'); scene.collection.children.link(COLL)
PUFF = bpy.data.materials.new('fx_smoke_puff'); PUFF.use_nodes = True
bs = next(n for n in PUFF.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
bs.inputs['Base Color'].default_value = (*lin(0xf2efe8), 1); bs.inputs['Roughness'].default_value = 1.0
for k in ('Specular IOR Level', 'Specular'):
    if k in bs.inputs: bs.inputs[k].default_value = 0.0

def clear():
    for o in list(COLL.objects): bpy.data.objects.remove(o, do_unlink=True)
def lump(c, r, rng, name, squash=1.0):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=r, location=c)
    o = bpy.context.object; o.name = name
    for v in o.data.vertices: v.co *= 1 + rng.uniform(-.12, .12)                    # knobbly, never a perfect ball
    o.scale = (1, 1, squash); o.rotation_euler = (rng.uniform(0, 6.28), rng.uniform(0, 6.28), rng.uniform(0, 6.28))
    for p in o.data.polygons: p.use_smooth = False
    o.data.materials.append(PUFF)
    for coll in o.users_collection: coll.objects.unlink(o)
    COLL.objects.link(o); return o
CELLS = [   # (name, [(x, z, r, squash)])  side-on layout inside radius ~1
    ('big', [(0, -.18, .5, .9), (-.42, -.3, .36, .85), (.44, -.28, .38, .85), (-.18, .28, .4, .9), (.24, .26, .36, .9)]),
    ('puff', [(0, -.1, .48, .9), (-.38, -.2, .34, .85), (.36, -.16, .34, .85), (.02, .34, .34, .9)]),
    ('small', [(-.1, -.08, .44, .9), (.34, .02, .32, .85), (-.3, .3, .26, .9)]),
    ('wisp', [(-.2, -.12, .34, .7), (.28, .22, .28, .7)]),
]
def load_px(p):
    im = bpy.data.images.load(str(p)); a = np.empty(im.size[0] * im.size[1] * 4, dtype=np.float32); im.pixels.foreach_get(a)
    out = a.reshape(im.size[1], im.size[0], 4).copy(); bpy.data.images.remove(im); return out
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
def render_cell(ortho, name):
    cam.data.ortho_scale = ortho
    tmp = TMP / (name + '.png'); scene.render.filepath = str(tmp); bpy.ops.render.render(write_still=True)
    raw = load_px(tmp); tmp.unlink(); return down(raw, SS)
cells = []; rng = random.Random(0x5e0c3)
for nm, lumps in CELLS:
    clear()
    for i, (x, z, r, sq) in enumerate(lumps): lump((x, 0, z), r, rng, 'fx_smoke_%s_%d' % (nm, i), sq)
    bpy.context.view_layer.update()
    img = render_cell(2.0 / .9, 'smoke_' + nm)
    rgb = img[..., :3]; a = img[..., 3]
    top = np.percentile(rgb.max(axis=-1)[a > .5], 99.5) if (a > .5).any() else 1
    img[..., :3] = np.clip(rgb / max(top, 1e-3), 0, 1)
    cells.append(rim(img, np.array([.46, .44, .42]), .7))
top_row = np.concatenate([cells[0], cells[1]], axis=1); bot_row = np.concatenate([cells[2], cells[3]], axis=1)
S = np.concatenate([bot_row, top_row], axis=0)
save_px(S, OUT / 'chimney_smoke_v1.png')
def upscale(a, k): return np.repeat(np.repeat(a, k, axis=0), k, axis=1)
def bgtile(h, w, rgb): t = np.zeros((h, w, 4)); t[..., :3] = rgb; t[..., 3] = 1; return t
tint = np.array([.78, .76, .72])
tinted = np.concatenate([S[..., :3] * tint, S[..., 3:4]], axis=-1)
row = [over(upscale(tinted, 3), bgtile(768, 768, bgc)) for bgc in ((.45, .3, .22), (.52, .66, .82))]
save_px(np.concatenate(row, axis=1), PROOF / 'blender_fx_smoke_v1_proof.png')
meta = {'source': SRC, 'blender': bpy.app.version_string, 'cell': CELL, 'layout': '2x2, row-major from the top-left cell',
        'uv': 'three.js flipY: cell i -> u0 = (i % 2) * .5, v0 = .5 - floor(i / 2) * .5, size .5',
        'chimney_smoke_v1.png': [n for n, _ in CELLS]}
(OUT / 'chimney_smoke_v1.json').write_text(json.dumps(meta, indent=1) + '\n', encoding='utf8')
try: TMP.rmdir()
except OSError: pass
print(TAG, 'wrote', OUT / 'chimney_smoke_v1.png')
