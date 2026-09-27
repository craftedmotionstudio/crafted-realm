"""The Keeper's Stair v2 (Tutor's Holm v2 land, phase 4, 2026-09-26), prefix Stair_: the timber-and-stone stair from
Lastlight's crown down to Lanternfoot Cove, the departure pier below (docs/rebuild/WORLD_LAYOUT_GUIDE.md §3.7: the
capstone's big drop, replacing the 77-tile walk to the old south-east haven). Original design, 2004 old-school manner.
  - a flagged stone head landing at the top of the crown path (world 110-111.6, 21-22.3, y 13.0);
  - flight 1: oak treads (0.2 rise, 0.2 going) north down the cliff cleft (x 110-111) to a mid landing at y 7.0;
  - flight 2: west along the cove's back (z 14-15), 26 treads (0.23 rise, 0.2 going: the walk's per-step and
    footprint limits are 0.24 and 0.72) down to the shingle at y 1.0 at x 104.8 (v2: v1 ran on to x 104, so its last tile was a tread 0.6 over the shingle and the walk could not step off;
    now the foot tile x 104-105 is shingle and the last tread lies flush on it);
  - carried on oak posts with stone footings (post lengths from the v2 terrain under each post), stringers both sides,
    a handrail on every open side, a lantern post at the mid landing and a rope on the seaward rail.
Walkable parts carry Tread/Landing in their names (the general extractor's supports); the terrain v2 'cuts' lower the
land under the flights so no tread is ever buried. Local space: origin = world (107, 0, 18); local y = world y.
Run: "Blender 4.5/blender.exe" -b --python tools/blender/build_holm_keepers_stair_v2.py"""
import bpy, sys, math, json, random
from pathlib import Path
from mathutils import Vector
HERE = Path(__file__).resolve().parent; sys.path.insert(0, str(HERE)); ROOT = HERE.parents[1]
from holm_interior_kit import Acc, M
from holm_v2_pack import Pack, srgb_to_lin
OUT = ROOT / '.studio-workspaces/holm-keepers-stair-v2/candidates'
P = Pack('HOLM_KEEPERS_STAIR_V2', OUT, budget_tris=9000)
TER = json.loads((ROOT / '.studio-workspaces/holm-overhaul-terrain-v2/working/assets/world/authoring/holm-overhaul.terrain.bundle.json').read_text())
TW, TS = TER['width'], TER['width'] + 1
def ground(x, z):
    i = min(TW - 1, max(0, int(math.floor(x)))); j = min(TER['depth'] - 1, max(0, int(math.floor(z)))); fx = x - i; fz = z - j; H = TER['heights']
    return (H[j * TS + i] * (1 - fx) + H[j * TS + i + 1] * fx) * (1 - fz) + (H[(j + 1) * TS + i] * (1 - fx) + H[(j + 1) * TS + i + 1] * fx) * fz
OX, OZ = 107, 18
def L(x, y, z): return (x - OX, y, z - OZ)
rng = random.Random(1170)
TREAD = M('Stair oak treads', '#7d5a38'); OAKP = M('Stair oak posts', '#5a3f27'); RAIL = M('Stair oak rail', '#6e4d30')
STONE = [M('Stair footing stone', '#8a877d'), M('Stair footing stone dark', '#6f6c64')]; FLAG = M('Stair landing flags', '#94907f')
ROPE = M('Hemp rope', '#a8905e'); IRON = M('Iron', '#3e3d3c'); LAMP = M('Lantern glass', '#f2c865', emit=2.0)
root = P.root('Stair_Root', kind='building', note='origin = world (107, 0, 18); local y = world y; parts Stair_*')
TR = Acc('Stair_Tread'); LH = Acc('Stair_LandingHead'); LM = Acc('Stair_LandingMid'); PO = Acc('Stair_FramePosts'); ST = Acc('Stair_FrameStringers')
RA = Acc('Stair_FrameRail'); FO = Acc('Stair_Footing'); DR = Acc('Stair_Dressing')
def footing(x, z):
    g = ground(x, z); FO.lathe(*L(x, 0, z)[0:1], L(x, 0, z)[2], g - .25, [(.2, 0), (.22, .2), (.16, .34)], 6, STONE[rng.randrange(2)], top=True)
    return g + .05
def post(x, z, top):
    b = footing(x, z)
    if top - b > .05: PO.box(*[v for v in (L(x - .07, 0, 0)[0], L(x + .07, 0, 0)[0])], b, top, *[v for v in (L(0, 0, z - .07)[2], L(0, 0, z + .07)[2])], OAKP)
# ---- head landing: flagged stone at y 13.0 on the crown (x 109.9-111.6, z 21.0-22.3)
for i in range(4):
    for j in range(3):
        x0 = 109.9 + i * .425; z0 = 21.0 + j * .433
        LH.box(L(x0 + .01, 0, 0)[0], L(x0 + .415, 0, 0)[0], 12.84, 13.0, L(0, 0, z0 + .01)[2], L(0, 0, z0 + .423)[2], FLAG if (i + j) % 3 else STONE[0], skip='b')
LH.box(L(109.9, 0, 0)[0], L(111.6, 0, 0)[0], 12.2, 12.84, L(0, 0, 21.0)[2], L(0, 0, 22.3)[2], STONE[1])
# ---- flight 1: north, x 110.0-111.0, z 21.0 -> 15.0, 13.0 -> 7.0 (30 treads)
N1 = 30
for k in range(N1):
    z1 = 21.0 - .2 * k; z0 = z1 - .2; y = 13.0 - .2 * (k + 1)
    TR.box(L(110.02, 0, 0)[0], L(110.98, 0, 0)[0], y - .06, y, L(0, 0, z0)[2], L(0, 0, z1 + .02)[2], TREAD)
# ---- mid landing: x 110.0-111.0, z 14.0-15.0 at 7.0 (planked)
for k in range(5): LM.box(L(110.0, 0, 0)[0], L(111.0, 0, 0)[0], 6.92, 7.0, L(0, 0, 14.0 + .2 * k + .01)[2], L(0, 0, 14.2 + .2 * k - .01)[2], TREAD)
LM.box(L(110.0, 0, 0)[0], L(111.0, 0, 0)[0], 6.78, 6.92, L(0, 0, 14.0)[2], L(0, 0, 15.0)[2], OAKP)
# ---- flight 2: west, z 14.0-15.0, x 110.0 -> 104.8, 7.0 -> 1.02 (26 treads of 0.23)
N2 = 26
for k in range(N2):
    x1 = 110.0 - .2 * k; x0 = x1 - .2; y = 7.0 - .23 * (k + 1)
    TR.box(L(x0, 0, 0)[0], L(x1 + .02, 0, 0)[0], y - .06, y, L(0, 0, 14.02)[2], L(0, 0, 14.98)[2], TREAD)
# ---- stringers along both sides of each flight (the pitch), posts every ~1.5 tiles with footings, rails on open sides
def stringer(a, b):
    ST.beam(L(*a), L(*b), .08, .18, OAKP)
for sx in (110.0, 111.0):
    stringer((sx, 12.9, 21.0), (sx, 6.9, 15.0))
    for k in range(5):
        z = 20.4 - 1.25 * k; y = 13.0 - (21.0 - z) - .12; post(sx, z, y)
for sz in (14.0, 15.0):
    stringer((110.0, 6.9, sz), (104.8, .92, sz))
    for k in range(5):
        x = 109.4 - 1.1 * k; y = 7.0 - 1.15 * (110.0 - x) - .12; post(x, sz, y)
for cx, cz in ((110.0, 14.0), (111.0, 14.0), (111.0, 15.0)): post(cx, cz, 6.78)
def rail_run(a, b, n):
    (ax, ay, az), (bx, by, bz) = a, b
    for k in range(n + 1):
        t = k / n; x, y, z = ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t
        RA.box(L(x - .04, 0, 0)[0], L(x + .04, 0, 0)[0], y, y + .95, L(0, 0, z - .04)[2], L(0, 0, z + .04)[2], RAIL)
    RA.beam(L(ax, ay + .95, az), L(bx, by + .95, bz), .07, .07, RAIL)
    RA.beam(L(ax, ay + .5, az), L(bx, by + .5, bz), .05, .05, RAIL)
rail_run((110.0, 12.8, 20.9), (110.0, 7.0, 15.05), 5)          # flight 1, west (cliff) side
rail_run((111.0, 7.0, 15.0), (111.0, 7.0, 14.0), 1)            # mid landing, east side
rail_run((110.95, 7.0, 13.98), (104.9, 1.1, 13.98), 5)         # flight 2, seaward side
rail_run((110.0, 12.8, 21.0), (111.6, 12.8, 21.0), 1) if False else None
# ---- dressing: a lantern post at the mid landing, a rope looped along the seaward rail, a way-marker at the head
DR.box(L(110.9, 0, 0)[0], L(111.0, 0, 0)[0], 7.0, 9.1, L(0, 0, 14.05)[2], L(0, 0, 14.15)[2], OAKP)
DR.beam(L(110.95, 9.05, 14.1), L(110.6, 9.05, 14.1), .05, .05, OAKP); DR.lathe(L(110.6, 0, 0)[0], L(0, 0, 14.1)[2], 8.6, [(.07, 0), (.08, .22), (.04, .3)], 6, LAMP, top=True)
for k in range(12):
    t0, t1 = k / 12, (k + 1) / 12
    ax, ay = 110.9 - 6.0 * t0, 7.0 - 5.9 * t0 + .8; bx, by = 110.9 - 6.0 * t1, 7.0 - 5.9 * t1 + .8
    DR.beam(L(ax, ay - .12 * math.sin(math.pi * ((k % 2) + .5)), 13.94), L(bx, by, 13.94), .03, .03, ROPE)
DR.box(L(111.7, 0, 0)[0], L(111.9, 0, 0)[0], 13.0, 14.3, L(0, 0, 22.0)[2], L(0, 0, 22.2)[2], STONE[0]); DR.box(L(111.65, 0, 0)[0], L(112.3, 0, 0)[0], 13.95, 14.15, L(0, 0, 22.05)[2], L(0, 0, 22.15)[2], RAIL)
for part in (TR, LH, LM, PO, ST, RA, FO, DR): part.build(root, vcol=False)
man = P.export('stair.glb')
man['origin'] = {'x': OX, 'y': 0, 'z': OZ}; (OUT / 'manifest.json').write_text(json.dumps(man, indent=1) + '\n', encoding='utf8')
# ---- proof render (3/4 from the north-west, the terrain around drawn as a mesh)
scene = bpy.context.scene
for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
    try: scene.render.engine = eng; break
    except TypeError: pass
for m in bpy.data.materials:
    if m.get('srgb') and not m.use_nodes:
        m.use_nodes = True; bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); bs.inputs['Base Color'].default_value = (*[srgb_to_lin(c) for c in m['srgb']], 1); bs.inputs['Roughness'].default_value = 1
gm = bpy.data.materials.new('proof ground'); gm.use_nodes = True; next(n for n in gm.node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Base Color'].default_value = (.18, .26, .08, 1)
V = []; F = []
for z in range(10, 25):
    for x in range(100, 115): V.append((x - OX, -(z - OZ), ground(x, z)))
for j in range(14):
    for i in range(14): a = j * 15 + i; F.append((a, a + 1, a + 16, a + 15))
me = bpy.data.meshes.new('proof_terrain'); me.from_pydata(V, [], F); ob = bpy.data.objects.new('proof_terrain', me); ob.data.materials.append(gm); scene.collection.objects.link(ob)
scene.world = bpy.data.worlds.new('w'); scene.world.use_nodes = True; next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND').inputs[0].default_value = (.5, .58, .66, 1)
sun = bpy.data.objects.new('Key', bpy.data.lights.new('Key', 'SUN')); sun.data.energy = 3; sun.rotation_euler = (math.radians(50), 0, math.radians(-40)); scene.collection.objects.link(sun)
cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam')); scene.collection.objects.link(cam); scene.camera = cam; cam.data.lens = 30
PR = ROOT / 'scratchpad/holm_v2_land/props'
for name, loc in (('stair_nw', (-14, 14, 18)), ('stair_n', (1, 16, 12))):
    cam.location = loc; cam.rotation_euler = (Vector((1.5, -0.5, 6)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    scene.render.resolution_x = 1100; scene.render.resolution_y = 850; scene.render.filepath = str(PR / (name + '.png')); bpy.ops.render.render(write_still=True)
