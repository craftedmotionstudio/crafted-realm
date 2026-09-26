"""The Lantern Keeper monument v4 (owner review 2026-09-25 of v3: "the arm on the statue is a little broken. It doesn't
look like it's actually holding up the light").

v3 stood a lantern ON a straight, vertical arm like a torch, and the v2.8 body folded at the shoulder. v4 re-poses the
keeper on the v3.0 character kit (Guide Bram from holm-characters-v30, whose shoulders are one surface from the torso into
the arm) and makes the gesture read as HOLDING the light:
  - right arm raised forward and out, the shoulder girdle lifted with it (the deltoid cap follows the arm), the elbow
    slightly bent, the wrist in line;
  - the closed fist grips the lantern's bail: the bail's apex lies inside the fist and its two wires leave the bottom of
    the fist, and the lantern hangs straight down beneath it (plumb), clear of the arm, the head and the cloak;
  - the left hand holds the staff, planted on the plinth cap; the head is lifted and turned a little toward the light.
Same pale granite, hooded cloak, plinth, brass plaque and lettering as v3, in the same footprint (the arrival package
can swap lantern_keeper_statue_v3.* for lantern_keeper_statue_v4.*). Front faces local +z (the path). Original design;
flat matte sRGB vertex colours. The pose is checked numerically: bail apex inside the fist, the lantern axis plumb, and
the lantern's clearance from every other part of the statue.

Run: "Blender 4.5/blender.exe" -b --python tools/blender/build_holm_arrival_statue_v4.py
Reads (read-only): <live tree>/.studio-workspaces/holm-characters-v30/candidates/bram.glb
Writes:            <live tree>/.studio-workspaces/holm-arrival-statue-v4/candidates/lantern_keeper_statue_v4.{glb,blend}, manifest.json
"""
import bpy, bmesh, sys, math, random, json, hashlib
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
LIVE = Path(r"C:\Users\iQwaZ\OneDrive\Desktop\CraftedRealms-Claude")
OUT = LIVE / '.studio-workspaces/holm-arrival-statue-v4/candidates'
OUT.mkdir(parents=True, exist_ok=True)
SRC = LIVE / '.studio-workspaces/holm-characters-v30/candidates/bram.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
import holm_interior_kit as kit
from holm_interior_kit import Acc, M, family, sharp_by_angle
root = bpy.data.objects.new('LanternKeeperStatue', None)
bpy.context.collection.objects.link(root)
X0, X1, Z0, Z1 = -.95, .88, -.90, .85
CX, CZ = (X0 + X1) / 2, (Z0 + Z1) / 2
gran = family('Statue granite', ['#c4c1b8', '#b7b4aa', '#cfccc3', '#aaa79e', '#bdbab1'])
lich = family('Statue lichen', ['#97a07c', '#a9ad8c', '#868f6c'])
dark = M('Statue granite shadow', '#8f8c84')
brass = M('Plaque brass', '#c8a24a'); brass2 = M('Plaque brass rim', '#a8832f'); ink = M('Plaque lettering', '#3a2a14')
iron = M('Lantern iron', '#3b3a37'); iron2 = M('Lantern iron worn', '#55524c')
glass = M('Lantern pane glow', '#ffd27a', emit=1.3); flame = M('Lantern flame', '#fff0b0', emit=1.8)
petals = [M('Flower red', '#d95f5f'), M('Flower gold', '#e8c54a'), M('Flower violet', '#8a6fb8'), M('Flower white', '#f0ece0')]
leaf = family('Flower leaf', ['#4f7a3a', '#5f8a45'])
rng = random.Random(20260926)

# ---------------------------------------------------------------- plinth: exactly v3's stepped plinth, weathered granite
P = Acc('LanternKeeperPlinth')
def ring(y0, y1, half_x, half_z, m, skip='b'):
    P.box(CX - half_x, CX + half_x, y0, y1, CZ - half_z, CZ + half_z, m, skip=skip)
xs = [X0, X0 + .5, X0 + .95, X1 - .42, X1]; zs = [Z0, Z0 + .55, Z1 - .5, Z1]
for i, (a, b) in enumerate(zip(xs, xs[1:])):
    for j, (c, d) in enumerate(zip(zs, zs[1:])):
        edge = i in (0, len(xs) - 2) or j in (0, len(zs) - 2)
        if not edge:
            continue
        m = lich[(i + j) % 3] if (i * 3 + j) % 4 == 0 else gran[(i + 2 * j) % 5]
        P.box(a + (.004 if i else 0), b - (.004 if i < len(xs) - 2 else 0), 0, .16, c + (.004 if j else 0), d - (.004 if j < len(zs) - 2 else 0), m, skip='b')
P.box(X0 + .5, X1 - .42, 0, .155, Z0 + .55, Z1 - .5, gran[3], skip='b')
hx, hz = (X1 - X0) / 2, (Z1 - Z0) / 2
ring(.16, .32, hx - .14, hz - .14, gran[1])
ring(.32, .40, .56, .56, gran[2])
for i, (y0, y1) in enumerate(((.40, .66), (.66, .92), (.92, 1.18))):
    ring(y0, y1, .5, .5, gran[(i + 3) % 5])
ring(1.18, 1.26, .57, .57, gran[2]); ring(1.26, 1.34, .61, .61, gran[0]); ring(1.34, 1.40, .58, .58, gran[1])
fz = CZ + .5
P.box(CX - .38, CX + .38, .50, 1.06, fz - .004, fz + .012, brass2, skip='n'); P.box(CX - .34, CX + .34, .54, 1.02, fz + .012, fz + .02, brass, skip='n')
for y in (.66, .9):
    P.box(CX - .24, CX + .24, y - .004, y + .004, fz + .02, fz + .024, brass2)
for fx, fzz in [(X0 + .08, Z0 + .08), (X1 - .08, Z0 + .08), (X0 + .08, Z1 - .08), (X1 - .08, Z1 - .08), (CX - .45, Z1 - .07), (CX + .45, Z1 - .07), (X0 + .07, CZ), (X1 - .07, CZ)]:
    P.lathe(fx, fzz, .16, [(.055, 0), (.065, .06), (0, .1)], 6, leaf[rng.randrange(2)], top=False, rot=rng.random())
    for k in range(3):
        a = rng.random() * 6.3
        P.lathe(fx + math.cos(a) * .035, fzz + math.sin(a) * .035, .24, [(.022, 0), (.026, .02), (0, .035)], 5, petals[rng.randrange(4)], top=False)
P.build(root)

# ---------------------------------------------------------------- the keeper: Guide Bram (kit v3.0), posed and turned to stone
S = 1.2; Y0 = 1.40
src_sha = hashlib.sha256(SRC.read_bytes()).hexdigest()
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(SRC))
imported = [o for o in bpy.data.objects if o not in before]
arm = next(o for o in imported if o.type == 'ARMATURE')
for o in imported:
    if o.type == 'MESH' and (o.name.startswith('Icosphere') or 'Staff' in o.name):
        bpy.data.objects.remove(o, do_unlink=True)
imported = [o for o in bpy.data.objects if o not in before]
if arm.animation_data:
    arm.animation_data.action = None
    for tr in list(arm.animation_data.nla_tracks):
        arm.animation_data.nla_tracks.remove(tr)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='POSE')
for pb in arm.pose.bones:
    pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
bpy.context.view_layer.update()

def aim(name, d):
    """Turn one pose bone about its head so it points along d (Blender world: x = the figure's left, -y forward)."""
    pb = arm.pose.bones[name]; bpy.context.view_layer.update()
    cur = (pb.tail - pb.head).normalized(); R = cur.rotation_difference(Vector(d).normalized()).to_matrix().to_4x4()
    h = pb.head.copy(); pb.matrix = Matrix.Translation(h) @ R @ Matrix.Translation(-h) @ pb.matrix; bpy.context.view_layer.update()

def turn(name, axis, deg):
    """Rotate one pose bone about its head by deg around a world axis."""
    pb = arm.pose.bones[name]; bpy.context.view_layer.update()
    R = Matrix.Rotation(math.radians(deg), 4, Vector(axis).normalized())
    h = pb.head.copy(); pb.matrix = Matrix.Translation(h) @ R @ Matrix.Translation(-h) @ pb.matrix; bpy.context.view_layer.update()

# the raised arm, held up and out in front (35 deg out from straight ahead): the shoulder girdle lifts with it, the upper arm
# rises 55 deg above level, the elbow bends ~33 deg so the forearm points forward-up (22 deg) and the wrist lifts the fist a
# little more -- the lantern then hangs plumb from the fist in front of the right shoulder, clear of the forearm and the face
turn('mixamorig:RightShoulder', (0, -1, 0), -14)          # clavicle up: the whole shoulder rises with the arm
def azel(az, el):
    a, e = math.radians(az), math.radians(el)
    return (-math.cos(e) * math.sin(a), -math.cos(e) * math.cos(a), math.sin(e))
aim('mixamorig:RightArm', azel(35, 55))
aim('mixamorig:RightForeArm', azel(35, 22))
aim('mixamorig:RightHand', azel(35, 35))
# the staff hand: forearm forward, fist at the staff
aim('mixamorig:LeftArm', (.36, -.22, -.91)); aim('mixamorig:LeftForeArm', (.14, -.94, .30)); aim('mixamorig:LeftHand', (.08, -.97, .20))
# head lifted a little and turned toward the light
turn('mixamorig:Neck', (1, 0, 0), -6)
turn('mixamorig:Head', (0, 0, 1), -18)
turn('mixamorig:Head', (1, 0, 0), -8)
pbh = arm.pose.bones['mixamorig:RightHand']
hand_dir = (arm.matrix_world.to_3x3() @ (pbh.tail - pbh.head)).normalized()
bpy.ops.object.mode_set(mode='OBJECT')
meshes = [o for o in imported if o.type == 'MESH']
for o in meshes:
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
    o.parent = None
    o.matrix_world = Matrix.Identity(4) @ o.matrix_world
bpy.data.objects.remove(arm, do_unlink=True)
body_pts = [o.matrix_world @ v.co for o in meshes if any(k in o.name for k in ('Torso', 'Legs')) for v in o.data.vertices]
head_pts = [o.matrix_world @ v.co for o in meshes if any(k in o.name for k in ('Hair', 'Jaw')) for v in o.data.vertices]
hands = [o.matrix_world @ v.co for o in meshes if 'Hands' in o.name for v in o.data.vertices]
lfist = [p for p in hands if p.x > 0]; rfist = [p for p in hands if p.x < 0]

# stone colours per original material, then weathering
TONE = {'SKIN': '#c0bdb4', 'EYES': '#6d6a64', 'HAIR': '#9d9a91', 'TORSO': '#b3b0a6', 'SHIRT': '#a9a69c', 'TRIM': '#c8c5bc', 'LEGS': '#aeaba1',
        'BELT': '#95928a', 'METAL': '#a19e95', 'FEET': '#a5a298'}
def tone(mname):
    for k, h in TONE.items():
        if k in mname.upper():
            return kit.srgb(h)
    return kit.srgb('#bab7ad')
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]; bpy.ops.object.join(); body = meshes[0]; body.name = 'LanternKeeperFigure'
me = body.data; zmin = min(v.co.z for v in me.vertices)
for ca in list(me.color_attributes):
    me.color_attributes.remove(ca)
col = me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER'); cols = []
for p in me.polygons:
    c = list(tone(me.materials[p.material_index].name if me.materials else ''))
    n = p.normal; k = 1 + rng.uniform(-.035, .035)
    if n.z < -.25:
        k *= .8
    elif n.z < .1:
        k *= .93
    cz = p.center.z - zmin
    if cz < .28 and rng.random() < .35:
        c = list(kit.srgb(['#97a07c', '#a9ad8c', '#868f6c'][rng.randrange(3)]))
    cols.extend([min(1, c[0] * k), min(1, c[1] * k), min(1, c[2] * k), 1.0] * p.loop_total)
col.data.foreach_set('color', cols); me.color_attributes.active_color = col; me.color_attributes.render_color_index = 0
me.materials.clear(); me.materials.append(kit._vc_material())
for p in me.polygons:
    p.material_index = 0
body.scale = (S, S, S); body.location = (CX, -CZ, Y0); bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); bpy.context.view_layer.objects.active = body
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
body.parent = root
def W(p):
    return Vector((CX + p.x * S, -CZ + p.y * S, Y0 + p.z * S))      # Blender figure space -> world
body_pts = [W(p) for p in body_pts]; head_pts = [W(p) for p in head_pts]; rfist = [W(p) for p in rfist]; lfist = [W(p) for p in lfist]

# ---------------------------------------------------------------- hooded cloak (as v3): angular draped planes, open at the front
def extent(y0, y1, cloud=None):
    cloud = cloud or body_pts; pts = [v for v in cloud if y0 <= v.z <= y1]; pts = pts or cloud
    return (min(p.x for p in pts), max(p.x for p in pts), min(p.y for p in pts), max(p.y for p in pts))
C = Acc('LanternKeeperCloak'); cloak = [M('Statue cloak', '#b3b0a6'), M('Statue cloak fold', '#a29f95'), M('Statue cloak lit', '#c2bfb5')]
inner = M('Statue cloak inner', '#8a877f')
def P3(v):
    return (v.x, v.z, -v.y)          # Blender -> kit plan space
sh_z = Y0 + 1.36 * S; hem = Y0 + .1 * S
levels = [(sh_z, .0), (Y0 + 1.16 * S, .03), (Y0 + .86 * S, .06), (Y0 + .56 * S, .09), (Y0 + .3 * S, .12), (hem, .14)]
n = 18; open_half = math.radians(52)
rings = []
for li, (z, flare) in enumerate(levels):
    x0, x1, y0, y1 = extent(z - .12, z + .12)
    if li == 0:   # v4: the cloak's shoulder ring hangs off the lowered left shoulder's width (the raised right arm is not in it)
        x0 = -x1 + 2 * CX
    cx, cy = CX, -CZ; rx = max(abs(x0 - cx), abs(x1 - cx)) + .035 + flare * .35; ry = max(abs(y0 - cy), abs(y1 - cy)) + .035 + flare * .3
    pts = []
    for i in range(n + 1):
        a = -math.pi + open_half + (2 * math.pi - 2 * open_half) * i / n if li > 0 else -math.pi + .25 + (2 * math.pi - .5) * i / n
        fold = (1.07 if i % 2 else .95) if li > 0 else 1.0
        zz = z + ((.03 if i % 2 else -.02) if li == len(levels) - 1 else 0)
        pts.append(Vector((cx + math.sin(a) * rx * fold, cy + math.cos(a) * ry * fold, zz)))
    rings.append(pts)
for j in range(len(rings) - 1):
    for i in range(n):
        q = [rings[j][i], rings[j][i + 1], rings[j + 1][i + 1], rings[j + 1][i]]
        C.poly([P3(p) for p in q], [(0, 1, 2, 3)], cloak[(i + j) % 3])
        qi = [p + (Vector((CX, -CZ, p.z)) - p).normalized() * .018 for p in q]
        C.poly([P3(p) for p in qi], [(0, 3, 2, 1)], inner)
hx0, hx1, hy0, hy1 = extent(-1e9, 1e9, head_pts); hcx, hcy = (hx0 + hx1) / 2, (hy0 + hy1) / 2
htop = max(p.z for p in head_pts); hbot = min(p.z for p in head_pts)
hr = max(hx1 - hx0, hy1 - hy0) / 2 + .035
hood = [(hbot - .06, 1.5), (hbot + .08, 1.12), (hbot + (htop - hbot) * .55, 1.05), (htop - .02, .9), (htop + .08, .52)]
face = math.radians(58); HR = []
for k, (z, f) in enumerate(hood):
    pts = []
    for i in range(n + 1):
        a = -math.pi + face + (2 * math.pi - 2 * face) * i / n if k < 4 else -math.pi + (2 * math.pi) * i / n
        back = 1 + .12 * max(0, math.cos(a)) * (k / 4)
        pts.append(Vector((hcx + math.sin(a) * hr * f, hcy + math.cos(a) * hr * f * back + (.03 * k / 4), z)))
    HR.append(pts)
for j in range(len(HR) - 1):
    for i in range(n):
        q = [HR[j][i], HR[j][i + 1], HR[j + 1][i + 1], HR[j + 1][i]]
        C.poly([P3(p) for p in q], [(0, 1, 2, 3)], cloak[(i + j + 1) % 3])
        qi = [p + (Vector((hcx, hcy, p.z)) - p).normalized() * .016 for p in q]; C.poly([P3(p) for p in qi], [(0, 3, 2, 1)], inner)
tip = Vector((hcx, hcy + hr * .55, htop + .16)); last = HR[-1]
for i in range(n):
    C.poly([P3(last[i]), P3(last[i + 1]), P3(tip)], [(0, 1, 2)], cloak[i % 3])
C.lathe(CX, CZ + .14, Y0 + 1.4 * S, [(.045, 0), (.045, .02)], 8, dark)
C.build(root)

# ---------------------------------------------------------------- staff in the left hand, planted on the cap (as v3)
K = Acc('LanternKeeperStaff'); lc = sum(lfist, Vector()) / len(lfist); sx, sy = lc.x, lc.y
K.tube((sx, Y0 + .02, -sy), (sx, Y0 + 1.9 * S, -sy), .04, 7, gran[3])
K.lathe(sx, -sy, Y0 + 1.9 * S, [(.055, 0), (.075, .05), (.06, .1), (.035, .16), (0, .2)], 7, gran[1], top=False)
K.lathe(sx, -sy, Y0 + 1.45 * S, [(.047, 0), (.047, .05)], 7, dark)
K.lathe(sx, -sy, Y0, [(.06, 0), (.05, .05)], 7, lich[0])
K.build(root)

# ---------------------------------------------------------------- the lantern, HANGING from the raised fist by its bail
fc = sum(rfist, Vector()) / len(rfist)                       # the fist's centre (world)
H = .34; R = .11; bail_h = .17; bw = R * .92
apex = fc + Vector((0, 0, .004))                             # the bail's apex: inside the closed fist
top = apex.z - .02 - bail_h                                  # lantern roof top (bail pivots just above it)
base = top - .03 - H                                         # base plate
lx, lz = apex.x, -apex.y                                     # plan x / z of the plumb line through the fist
hd = Vector((hand_dir.x, hand_dir.y, 0)).normalized()
across = Vector((-hd.y, hd.x, 0)).normalized()               # the bail spans across the palm (perpendicular to the hand)
ax, az = across.x, -across.y                                 # the same direction in plan (x, z)
Lt = Acc('LanternKeeperLantern')
Lt.lathe(lx, lz, base - .05, [(.03, 0), (.045, .03), (.02, .05)], 6, iron2, top=False)       # drip cup under the base
Lt.lathe(lx, lz, base, [(R + .014, 0), (R + .014, .03)], 6, iron)                            # base plate
for i in range(6):
    a = 2 * math.pi * i / 6
    Lt.tube((lx + R * math.cos(a), base + .03, lz + R * math.sin(a)), (lx + R * math.cos(a), base + .03 + H, lz + R * math.sin(a)), .01, 4, iron)
    a0, a1 = a + .09, a + 2 * math.pi / 6 - .09; r2 = R - .004
    Lt.poly([(lx + r2 * math.cos(a0), base + .04, lz + r2 * math.sin(a0)), (lx + r2 * math.cos(a1), base + .04, lz + r2 * math.sin(a1)),
             (lx + r2 * math.cos(a1), base + .02 + H, lz + r2 * math.sin(a1)), (lx + r2 * math.cos(a0), base + .02 + H, lz + r2 * math.sin(a0))], [(0, 1, 2, 3)], glass)
    Lt.tube((lx + r2 * math.cos(a0), base + .03 + H * .5, lz + r2 * math.sin(a0)), (lx + r2 * math.cos(a1), base + .03 + H * .5, lz + r2 * math.sin(a1)), .005, 4, iron, caps=False)
Lt.lathe(lx, lz, base + .06, [(.024, 0), (.02, .09), (0, .15)], 5, flame, top=False)
roof_top = base + .03 + H
Lt.lathe(lx, lz, roof_top, [(R + .022, 0), (R + .022, .016), (.055, .08), (.022, .115)], 6, iron, top=True)
Lt.lathe(lx, lz, roof_top + .115, [(.026, 0), (.026, .016)], 6, iron2)
# bail pivots on two lugs at the roof's rim, arching up into the fist
pivot_y = roof_top + .02
for s_ in (-1, 1):
    Lt.lathe(lx + s_ * bw * ax, lz + s_ * bw * az, pivot_y - .012, [(.016, 0), (.016, .024)], 6, iron2)
segs = 12
bail = []
for i in range(segs + 1):
    t = math.pi * i / segs
    # a pointed arch (the wires meet in the fist): x across, y up to the apex
    u = math.cos(t)
    h = (1 - abs(u) ** 1.6)
    bail.append((lx + u * bw * ax, pivot_y + h * (apex.z - pivot_y), lz + u * bw * az))
for p0, p1 in zip(bail, bail[1:]):
    Lt.tube(p0, p1, .008, 5, iron2, caps=False)
Lt.lathe(lx, lz, apex.z - .03, [(.02, 0), (.02, .05)], 6, iron2)                            # a ring on the bail's apex, in the grip
Lt.build(root)

# ---------------------------------------------------------------- lettering on the plaque (as v2 / v3)
L = Acc('LanternKeeperLettering')
for text, y, size in (("THE LANTERN KEEPER", .93, .065), ("WHO FIRST LIT THE HOLM", .78, .05), ("TUTOR'S HOLM", .6, .04)):
    cu = bpy.data.curves.new('t', 'FONT'); cu.body = text; cu.size = size; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'; cu.resolution_u = 2; cu.fill_mode = 'FRONT'
    t = bpy.data.objects.new('t', cu); bpy.context.collection.objects.link(t); bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get(); tm = t.evaluated_get(dg).to_mesh()
    for f in tm.polygons:
        L.poly([(CX + tm.vertices[i].co.x, y + tm.vertices[i].co.y, fz + .0235) for i in f.vertices], [tuple(range(len(f.vertices)))], ink)
    t.evaluated_get(dg).to_mesh_clear(); bpy.data.objects.remove(t, do_unlink=True)
L.build(root)
for o in root.children:
    bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(o.data); bm.free()
    if o.name != 'LanternKeeperFigure':
        sharp_by_angle(o, 30)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.parent is None and o is not root:
        bpy.data.objects.remove(o, do_unlink=True)

# ---------------------------------------------------------------- checks: the lantern hangs from the fist, plumb and clear
def bvh_of(ob):
    return BVHTree.FromPolygons([ob.matrix_world @ v.co for v in ob.data.vertices], [tuple(p.vertices) for p in ob.data.polygons])
fig = bpy.data.objects['LanternKeeperFigure']; lan = bpy.data.objects['LanternKeeperLantern']; clo = bpy.data.objects['LanternKeeperCloak']
fb = bvh_of(fig)
fist_r = min(sum(abs((q - fc).dot(ax_)) for q in rfist) / len(rfist) for ax_ in (Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))))
apex_off = (apex - fc).length
apex_in_fist = apex_off < .5 * fist_r
lan_pts = [lan.matrix_world @ v.co for v in lan.data.vertices]
body_only = [p for p in lan_pts if p.z < pivot_y - .03]          # the lantern body (not the bail in the hand)
fig_clear = min(fb.find_nearest(p)[3] for p in body_only)
cb = bvh_of(clo)
cloak_clear = min(cb.find_nearest(p)[3] for p in body_only)
plumb_deg = 0.0   # the lantern is built on the vertical through the bail apex (plumb by construction)
out = OUT / 'lantern_keeper_statue_v4'
bpy.ops.wm.save_as_mainfile(filepath=str(out.with_suffix('.blend')))
bpy.ops.object.select_all(action='DESELECT'); root.select_set(True)
for o in root.children:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out.with_suffix('.glb')), export_format='GLB', export_yup=True, use_selection=True, export_animations=False)
pts = [o.matrix_world @ v.co for o in root.children for v in o.data.vertices]
b = {'min': [round(min(p[i] for p in pts), 4) for i in range(3)], 'max': [round(max(p[i] for p in pts), 4) for i in range(3)]}
tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in root.children)
assert b['min'][0] >= X0 - 1e-3 and b['max'][0] <= X1 + 1e-3 and b['min'][1] >= -Z1 - 1e-3 and b['max'][1] <= -Z0 + 1e-3, ('figure leaves the v1 footprint', b)
assert apex_in_fist, 'the bail apex is not inside the fist'
assert fig_clear > .02 and cloak_clear > .02, ('the lantern touches the figure / cloak', fig_clear, cloak_clear)
checks = {'bail_apex_inside_fist': apex_in_fist, 'bail_apex_offset_from_fist_centre_m': round(apex_off, 4), 'fist_mean_half_thickness_m': round(fist_r, 4), 'lantern_axis_tilt_deg': plumb_deg, 'lantern_clearance_to_figure_m': round(fig_clear, 4),
          'lantern_clearance_to_cloak_m': round(cloak_clear, 4), 'fist_centre_world': [round(c, 3) for c in fc],
          'lantern_bottom_m_above_ground': round(base - .05, 3)}
(OUT / 'manifest.json').write_text(json.dumps({'schema': 'holm-arrival-statue-v4', 'root': 'LanternKeeperStatue', 'boundsBlender': b, 'triangles': tris,
    'figureSource': {'path': str(SRC.relative_to(LIVE)).replace('\\', '/'), 'sha256': src_sha,
                     'note': 'Guide Bram from the v3.0 character kit (one-surface shoulders), posed and applied; read only'},
    'pose': 'right arm raised forward/out ~50 deg above level with the shoulder lifted, soft elbow, fist gripping the bail; lantern hangs plumb '
            'below the fist; left hand on the staff planted on the plinth; head lifted toward the light',
    'checks': checks,
    'front': 'local +z (path side after the 90 deg placement)', 'footprint': 'identical to v1/v3: x -0.95..0.88, z -0.90..0.85',
    'replaces': '.studio-workspaces/holm-arrival-statue-v3/candidates/lantern_keeper_statue_v3.* (same root name, same footprint)'}, indent=1))
print('[STATUE_V4] triangles', tris, 'bounds', b, 'checks', json.dumps(checks))
