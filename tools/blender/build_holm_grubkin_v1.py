"""Holm practice grubkin v1: original rigged + animated low-poly crawler (Blender 4.5, headless).

Usage: blender -b --python tools/blender/build_holm_grubkin_v1.py [-- --no-render]
Outputs:
  assets/models/holm_grubkin_v1.glb                      (runtime path; charNpcModel loads assets/models/<id>.glb)
  .studio-workspaces/holm-grubkin-v1/candidates/{grubkin.blend, manifest.json, REPORT.md}
  scratchpad/holm_grubkin_v1/*.png                       (proof renders + sheet.png)

Design: our own creature (not a Jagex replica): a stout six-legged grub with five overlapping faceted
segments (hump highest over the middle), a rust chitin head plate with a brow, amber bead eyes, curved
bone mandibles, a pale belly and a few dark bristles. ~0.75 tall, ~1.15 long.
Conventions (same as build_holm_props_v2.py): Blender Z-up -> glTF Y-up; 1 unit = 1 tile; origin at the
ground-contact centre. Colours are authored as the sRGB values we want to SEE (the game draws material
colours without colour management); roughness ~1; no image textures; deterministic (seeded random).
FORWARD: the creature faces Blender -Y == glTF +Z, matching the hero-pipeline character GLBs (v07's face
points -Y in Blender) and three.js Object3D.lookAt (npc.mesh.lookAt(player) aims local +Z at the target).
Rig: 20 bones (root, 5 body segments, 2 mandibles, 6 legs x 2). Rigid per-part vertex groups (robust skinning:
every vertex has exactly one weight 1.0). Clips (exact glTF names): idle 2.0 s loop, walk 0.8 s loop (in place,
tripod gait), attack 0.6 s, block 0.4 s. Exported as NLA tracks (same pattern as build_guide_bram_overhaul_v1.py).
"""
import bpy, bmesh, math, random, json, struct, sys
from pathlib import Path
from mathutils import Vector, Matrix, Euler, Quaternion

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.studio-workspaces/holm-grubkin-v1/candidates'
GLB = ROOT / 'assets/models/holm_grubkin_v1.glb'
REN = ROOT / 'scratchpad/holm_grubkin_v1'
OUT.mkdir(parents=True, exist_ok=True); REN.mkdir(parents=True, exist_ok=True)
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
DO_RENDER = '--no-render' not in argv
FPS = 30
CLIPS = {'idle': 60, 'walk': 24, 'attack': 18, 'block': 12}      # frames at 30 fps -> 2.0 / 0.8 / 0.6 / 0.4 s
BUDGET = {'tris': 3000, 'materials': 6, 'bones': 24}
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene; scene.render.fps = FPS

# ---------------------------------------------------------------- materials (authored sRGB, used as-is)
PALETTE = {
    'grub-hide':   (.62, .50, .25),   # olive-ochre carapace (nods to the old 0x6a8f3c grubkin, kept warm/earthy)
    'grub-band':   (.33, .25, .14),   # dark joint grooves, legs, bristles
    'grub-belly':  (.87, .79, .60),   # pale soft underside
    'grub-plate':  (.52, .27, .15),   # rust chitin head plate + knee knobs
    'grub-bone':   (.90, .84, .66),   # mandibles, claws
    'grub-eye':    (.96, .66, .16),   # amber bead eyes (matte, read at distance)
}
def s2l(c): return ((c + .055) / 1.055) ** 2.4 if c > .04045 else c / 12.92
MATS = []; MI = {}
for name, rgb in PALETTE.items():
    m = bpy.data.materials.new(name); m.use_nodes = True
    bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value = (*rgb, 1); bs.inputs['Roughness'].default_value = 1.0
    bs.inputs['Metallic'].default_value = 0.0
    if 'Specular IOR Level' in bs.inputs: bs.inputs['Specular IOR Level'].default_value = .1
    # viewport/workbench preview only: linearised so the proof renders show the sRGB the game will draw
    m.diffuse_color = (*[s2l(c) for c in rgb], 1); m.roughness = 1.0; m.metallic = 0
    MI[name] = len(MATS); MATS.append(m)

# ---------------------------------------------------------------- part mesh builder (each part rigid to one bone)
V, F, FM, VB = [], [], [], []          # verts, faces, face material index, vertex bone
def add(vs, fs, mats, bone):
    k = len(V); V.extend(Vector(v) for v in vs); VB.extend([bone] * len(vs))
    for n, f in enumerate(fs):
        F.append(tuple(k + i for i in f)); FM.append(mats(n, f, k) if callable(mats) else MI[mats])

def loft(rings, mat, bone, cap0=True, cap1=True):
    """rings: list of equal-length point loops (ordered front->back). mat(j,i,centre,normal)->name."""
    n = len(rings[0]); k = len(V); vs = [p for r in rings for p in r]; fs = []; names = []
    for j in range(len(rings) - 1):
        for i in range(n):
            f = (j*n+i, (j+1)*n+i, (j+1)*n+(i+1) % n, j*n+(i+1) % n)
            fs.append(f)
            pts = [vs[q] for q in f]; c = sum(pts, Vector()) / 4
            nrm = (pts[1] - pts[0]).cross(pts[3] - pts[0]).normalized()
            names.append(mat(j, i, c, nrm) if callable(mat) else mat)
    if cap0: fs.append(tuple(range(n))[::-1]); names.append(mat(-1, 0, rings[0][0], Vector((0, -1, 0))) if callable(mat) else mat)
    if cap1:
        L = len(rings) - 1; fs.append(tuple(L*n+i for i in range(n)))
        names.append(mat(L, 0, rings[-1][0], Vector((0, 1, 0))) if callable(mat) else mat)
    add(vs, fs, lambda idx, f, kk: MI[names[idx]], bone)

def fix_winding():
    """Make every face point away from its part's centre (parts are convex-ish): robust outward normals."""
    parts = {}
    for i, b in enumerate(VB): parts.setdefault(b, []).append(i)
    return parts

rng = random.Random(4207)
SEGS = [  # (bone, centre y, length, rx, rz, centre z, sides)  forward = -Y
    ('head',    -.405, .23, .190, .165, .270, 10),
    ('thorax',  -.195, .30, .255, .245, .330, 12),
    ('body',     .060, .36, .305, .300, .360, 12),
    ('abdomen',  .305, .30, .245, .235, .300, 12),
    ('tail',     .480, .22, .155, .140, .230, 10),
]
PROFILE = [(0.0, .42), (.13, .80), (.36, 1.0), (.64, 1.0), (.87, .82), (1.0, .46)]
SEG = {s[0]: s for s in SEGS}

def seg_ring(cy, rx, rz, cz, sc, n, jit, y):
    out = []
    for i in range(n):
        a = (i + .5) * math.tau / n                          # 0 = top, mirror pair i <-> n-1-i
        jj = jit[min(i, n - 1 - i)]
        x = math.sin(a) * rx * sc * jj; z = math.cos(a) * rz * sc * jj
        z = max(z, -rz * .62 * sc)                           # flattened belly
        out.append(Vector((x, y, cz + z)))
    return out

for bone, cy, L, rx, rz, cz, n in SEGS:
    rings = []
    for j, (t, sc) in enumerate(PROFILE):
        jit = [rng.uniform(.93, 1.05) for _ in range(n // 2)]
        y = cy - L / 2 + t * L
        rings.append(seg_ring(cy, rx, rz, cz, sc, n, jit, y))
    def segmat(j, i, c, nrm, cz=cz, rz=rz, bone=bone):
        if nrm.z < -.55 or c.z < cz - rz * .55: return 'grub-belly'
        if bone != 'head' and j in (0, 4) and c.z > cz - rz * .3: return 'grub-band'   # dark joint grooves
        if bone == 'head': return 'grub-band'
        return 'grub-hide'
    loft(rings, segmat, bone)

# dorsal saddle plates: slightly raised, darker-edged armour lozenges riding each body segment (reads as segmented)
for bone in ('thorax', 'body', 'abdomen'):
    _, cy, L, rx, rz, cz, n = SEG[bone]
    w, l, h = rx * .55, L * .30, .035
    top = cz + rz * .99
    base = [Vector((0, cy - l, top - .03)), Vector((w, cy - l * .2, top - .05)), Vector((w * .8, cy + l * .8, top - .05)),
            Vector((0, cy + l, top - .03)), Vector((-w * .8, cy + l * .8, top - .05)), Vector((-w, cy - l * .2, top - .05))]
    ridge = [Vector((0, cy - l * .75, top + h * .6)), Vector((w * .55, cy - l * .1, top + h)),
             Vector((w * .45, cy + l * .6, top + h * .8)), Vector((0, cy + l * .75, top + h * .6)),
             Vector((-w * .45, cy + l * .6, top + h * .8)), Vector((-w * .55, cy - l * .1, top + h))]
    loft([base, ridge], 'grub-hide', bone, cap0=False, cap1=True)

# bristles: short dark spikes raked backward on the hump (a few, symmetric)
for bone, xs in (('thorax', (.10,)), ('body', (.0, .15)), ('abdomen', (.11,))):
    _, cy, L, rx, rz, cz, n = SEG[bone]
    for x0 in xs:
        for sgn in ((1,) if x0 == 0 else (1, -1)):
            x = x0 * sgn; zb = cz + math.sqrt(max(0, 1 - (x / rx) ** 2)) * rz * .96 - .01
            yb = cy + .03
            b = [Vector((x - .018, yb - .02, zb)), Vector((x + .018, yb - .02, zb)), Vector((x, yb + .025, zb))]
            tip = Vector((x * 1.25, yb + .07, zb + .085))
            k = len(V); add(b + [tip], [(0, 1, 3), (1, 2, 3), (2, 0, 3), (0, 2, 1)], 'grub-band', bone)

# head plate: crescent-section chitin shell over the head top, with a brow lip jutting over the eyes
_, hy, hL, hrx, hrz, hcz, _ = SEG['head']
def plate_ring(y, sc, lift, arc=1.9, k=7):
    outer = []; inner = []
    for i in range(k):
        a = -arc / 2 + arc * i / (k - 1)
        outer.append(Vector((math.sin(a) * hrx * 1.08 * sc, y, hcz + lift + math.cos(a) * hrz * 1.1 * sc)))
        inner.append(Vector((math.sin(a) * hrx * .78 * sc, y, hcz + lift + math.cos(a) * hrz * .74 * sc)))
    return outer + inner[::-1]
prings = [plate_ring(hy - hL * .60, .74, .03, arc=2.1), plate_ring(hy - hL * .36, .97, -.005, arc=2.3),
          plate_ring(hy, 1.02, -.005, arc=2.3), plate_ring(hy + hL * .42, .88, -.01, arc=2.3)]
loft(prings, 'grub-plate', 'head')
# small central crest on the plate
cr = [Vector((0, hy - hL * .55, hcz + hrz * .95)), Vector((.03, hy, hcz + hrz * 1.1)), Vector((0, hy + hL * .35, hcz + hrz * .98)),
      Vector((-.03, hy, hcz + hrz * 1.1)), Vector((0, hy - .02, hcz + hrz * 1.26))]
add(cr, [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4), (0, 3, 2, 1)], 'grub-plate', 'head')

def octa(c, r, mat, bone, sy=1.):
    c = Vector(c)
    vs = [c + Vector(d) for d in ((r, 0, 0), (-r, 0, 0), (0, r * sy, 0), (0, -r * sy, 0), (0, 0, r), (0, 0, -r))]
    fs = [(0, 2, 4), (2, 1, 4), (1, 3, 4), (3, 0, 4), (2, 0, 5), (1, 2, 5), (3, 1, 5), (0, 3, 5)]
    add(vs, fs, mat, bone)

# eyes: amber beads tucked under the brow
for s in (-1, 1):
    octa((s * .112, hy - hL * .47, hcz + .0), .044, 'grub-eye', 'head', sy=.8)

# mandibles: curved tapering horns, hooking inward (rigid to their own bones for the snap)
MAND_BASE = {}
for s, bone in ((-1, 'mand_L'), (1, 'mand_R')):
    pts = [Vector((s * .08, hy - hL * .42, hcz - .06)), Vector((s * .125, hy - hL * .42 - .065, hcz - .08)),
           Vector((s * .105, hy - hL * .42 - .12, hcz - .095)), Vector((s * .03, hy - hL * .42 - .155, hcz - .09))]
    MAND_BASE[bone] = pts[0]
    radii = [.05, .04, .026, .005]; rings = []
    for j, p in enumerate(pts):
        t = (pts[min(j + 1, 3)] - pts[max(j - 1, 0)]).normalized()
        a = t.cross(Vector((0, 0, 1))).normalized(); b = a.cross(t).normalized()
        rings.append([p + (a * math.cos(q) + b * math.sin(q) * .75) * radii[j] for q in (math.pi / 2, math.pi / 2 + 2.094, math.pi / 2 + 4.189)])
    loft(rings, 'grub-bone', bone)
    # inner tooth
    m = pts[1] + (pts[2] - pts[1]) * .5
    tb = [m + Vector((0, .02, .012)), m + Vector((0, -.02, .012)), m + Vector((0, 0, -.018))]
    add(tb + [m + Vector((-s * .05, -.005, 0))], [(0, 1, 3), (1, 2, 3), (2, 0, 3), (0, 2, 1)], 'grub-bone', bone)

# legs: six stubby jointed legs (pairs on thorax / body / abdomen), 2 bones each
LEGS = []   # (name, side, parent seg, hip, knee, foot)
for seg, spread in (('thorax', -.07), ('body', .0), ('abdomen', .07)):
    _, cy, L, rx, rz, cz, n = SEG[seg]
    for s, sn in ((-1, 'L'), (1, 'R')):
        hip = Vector((s * rx * .80, cy, cz - rz * .40))
        knee = Vector((s * (rx + .16), cy + spread * .6, cz + .02))
        foot = Vector((s * (rx + .27), cy + spread * 1.4, .0))
        LEGS.append((f'leg_{seg[0].upper()}{sn}', s, seg, hip, knee, foot))

def limb(p0, p1, r0, r1, n, mat, bone, seed):
    t = (p1 - p0).normalized(); up = Vector((0, 0, 1)) if abs(t.z) < .9 else Vector((0, 1, 0))
    a = t.cross(up).normalized(); b = a.cross(t).normalized()
    rr = random.Random(seed)
    rings = [[p + (a * math.cos(q) + b * math.sin(q)) * r * rr.uniform(.92, 1.06) for q in [math.tau * i / n + .3 for i in range(n)]]
             for p, r in ((p0, r0), (p1, r1))]
    loft(rings, mat, bone)

for idx, (nm, s, seg, hip, knee, foot) in enumerate(LEGS):
    limb(hip, knee, .075, .06, 6, 'grub-band', nm + '_up', 60 + idx)
    octa(knee, .068, 'grub-plate', nm + '_up')
    ank = foot + Vector((0, 0, .05))
    limb(knee, ank, .062, .036, 6, 'grub-band', nm + '_lo', 80 + idx)
    # claw foot: bone-coloured hooked toe planted on the ground
    toe = [ank + Vector((s * .03, .0, 0)), ank + Vector((-s * .025, -.03, 0)), ank + Vector((-s * .025, .03, 0))]
    add(toe + [foot + Vector((s * .04, 0, 0))], [(0, 1, 3), (1, 2, 3), (2, 0, 3), (0, 2, 1)], 'grub-bone', nm + '_lo')

# ---------------------------------------------------------------- mesh object + outward normals
me = bpy.data.meshes.new('grubkin'); me.from_pydata([tuple(v) for v in V], [], F); me.update()
for m in MATS: me.materials.append(m)
for p, mi in zip(me.polygons, FM): p.material_index = mi; p.use_smooth = False
obj = bpy.data.objects.new('grubkin', me); scene.collection.objects.link(obj)
bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free(); me.update()

# ---------------------------------------------------------------- armature
arm_data = bpy.data.armatures.new('grubkin_rig'); arm = bpy.data.objects.new('grubkin_rig', arm_data)
scene.collection.objects.link(arm); bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT'); eb = arm_data.edit_bones
def bone(name, head, tail, parent=None):
    b = eb.new(name); b.head = Vector(head); b.tail = Vector(tail); b.roll = 0
    if parent: b.parent = eb[parent]; b.use_connect = False
    return b
bone('root', (0, 0, 0), (0, -.25, 0))
bone('body', (0, .06, .36), (0, -.10, .38), 'root')
bone('thorax', (0, -.07, .34), (0, -.30, .33), 'body')
bone('head', (0, -.30, .29), (0, -.52, .27), 'thorax')
for s, nm in ((-1, 'mand_L'), (1, 'mand_R')):
    b0 = MAND_BASE[nm]; bone(nm, b0, b0 + Vector((s * .02, -.2, -.01)), 'head')
bone('abdomen', (0, .20, .33), (0, .42, .30), 'body')
bone('tail', (0, .40, .26), (0, .58, .22), 'abdomen')
for nm, s, seg, hip, knee, foot in LEGS:
    bone(nm + '_up', hip, knee, seg); bone(nm + '_lo', knee, foot + Vector((0, 0, .02)), nm + '_up')
bpy.ops.object.mode_set(mode='OBJECT')
BONES = [b.name for b in arm_data.bones]

for bn in BONES: obj.vertex_groups.new(name=bn)
by = {}
for i, bn in enumerate(VB): by.setdefault(bn, []).append(i)
for bn, ids in by.items(): obj.vertex_groups[bn].add(ids, 1.0, 'REPLACE')
obj.parent = arm
mod = obj.modifiers.new('grubkin skin', 'ARMATURE'); mod.object = arm

# ---------------------------------------------------------------- animation (world-axis pose helper, dense bake)
REST = {b.name: b.matrix_local.to_quaternion() for b in arm_data.bones}
def smooth(x): x = max(0., min(1., x)); return x * x * (3 - 2 * x)
def lerpd(a, b, u): return {k: a.get(k, 0.) + (b.get(k, 0.) - a.get(k, 0.)) * u for k in set(a) | set(b)}

def apply_pose(P):
    """P: dict of named scalar params -> sets every pose bone. Rotations are given about WORLD axes
    (X = pitch, Y = roll, Z = yaw; nose-up pitch is positive) and converted into each bone's local frame."""
    g = lambda k: P.get(k, 0.)
    out = {bn: (Euler((0, 0, 0)), Vector()) for bn in BONES}
    def rot(bn, pitch=0., roll=0., yaw=0., loc=(0, 0, 0)):
        out[bn] = (Euler((-pitch, roll, yaw), 'XYZ'), Vector(loc))
    rot('body', g('body_pitch'), g('body_roll'), g('body_yaw'), (0, g('body_y'), g('body_z')))
    rot('thorax', g('thorax_pitch'), 0, g('thorax_yaw'))
    rot('head', g('head_pitch'), g('head_roll'), g('head_yaw'))
    rot('abdomen', -g('abd_lift'), 0, g('abd_yaw'))          # tail-end segments: + lift raises their tips
    rot('tail', -g('tail_lift'), 0, g('tail_yaw'))
    for s, nm in ((-1, 'mand_L'), (1, 'mand_R')):
        rot(nm, 0, 0, s * g('mand'))                         # + mand opens both jaws outward
    for nm, s, seg, *_ in LEGS:
        key = nm[4]                                         # T / B / A pair
        swing = g('sw_' + nm) + g('sw_' + key)              # + swings the foot forward
        lift = g('lf_' + nm) + g('lf_' + key)               # + lifts the foot up/out
        rot(nm + '_up', 0, -s * lift, -s * swing)
        rot(nm + '_lo', 0, s * lift * .7, 0)                # fold the foot back under while lifted
    for bn, (e, loc) in out.items():
        pb = arm.pose.bones[bn]; r = REST[bn]
        pb.rotation_quaternion = r.inverted() @ e.to_quaternion() @ r
        pb.location = r.inverted() @ loc
        sc = P.get('scale_' + bn, 1.)
        pb.scale = (sc, sc, sc)

TRIPOD = {'leg_TL': 0, 'leg_BR': 0, 'leg_AL': 0, 'leg_TR': 1, 'leg_BL': 1, 'leg_AR': 1}
def pose_idle(f):
    t = f / CLIPS['idle']; w = math.tau * t
    br = math.sin(w)
    tw = max(0., math.sin(math.pi * min(1, max(0, (t - .30) / .08)))) + max(0., math.sin(math.pi * min(1, max(0, (t - .44) / .08)))) \
        + .6 * max(0., math.sin(math.pi * min(1, max(0, (t - .78) / .07))))
    return {'body_z': .008 * br, 'scale_body': 1 + .035 * br, 'scale_abdomen': 1 + .03 * math.sin(w - .7),
            'body_yaw': .035 * math.sin(w), 'thorax_yaw': .03 * math.sin(w + .8), 'head_yaw': .07 * math.sin(w + 1.5),
            'head_pitch': .04 * math.sin(2 * w), 'abd_yaw': -.04 * math.sin(w + .5), 'tail_yaw': -.07 * math.sin(w + 1.0),
            'tail_lift': .05 * math.sin(w + 2), 'mand': .05 + .26 * tw, 'body_roll': .02 * math.sin(w + 1),
            'sw_leg_TL': .08 * max(0, math.sin(w * 2)), 'lf_leg_TL': .1 * max(0, math.sin(w * 2)),
            'sw_leg_TR': .06 * max(0, math.sin(w * 2 + 3.1)), 'lf_leg_TR': .08 * max(0, math.sin(w * 2 + 3.1))}

def pose_walk(f):
    t = f / CLIPS['walk']; w = math.tau * t; P = {}
    for nm, grp in TRIPOD.items():
        p = (t + .5 * grp) % 1.
        if p < .5: u = p / .5; sw = -math.cos(math.pi * u); lf = math.sin(math.pi * u)
        else: u = (p - .5) / .5; sw = math.cos(math.pi * u); lf = 0.
        P['sw_' + nm] = .38 * sw; P['lf_' + nm] = .42 * lf
    P.update({'body_z': .018 * math.cos(2 * w), 'body_roll': .05 * math.sin(w), 'body_pitch': .02 * math.cos(2 * w),
              'thorax_yaw': .06 * math.sin(w), 'head_yaw': -.05 * math.sin(w), 'head_pitch': .03 * math.sin(2 * w + 1),
              'abd_yaw': -.06 * math.sin(w + .6), 'tail_yaw': -.10 * math.sin(w + 1.2), 'tail_lift': .04 * math.cos(2 * w),
              'mand': .08 + .06 * math.sin(2 * w)})
    return P

def keyed(keys):
    """keys: [(frame, params)] -> pose fn with smoothstep blending between keys."""
    def fn(f):
        for (f0, a), (f1, b) in zip(keys, keys[1:]):
            if f0 <= f <= f1: return lerpd(a, b, smooth((f - f0) / max(1e-6, f1 - f0)))
        return dict(keys[-1][1])
    return fn
REAR = {'body_pitch': .28, 'thorax_pitch': .22, 'head_pitch': -.05, 'body_y': .05, 'body_z': .07, 'mand': .62,
        'lf_T': .95, 'sw_T': .55, 'lf_B': .25, 'sw_B': .15, 'tail_lift': .14, 'abd_lift': .22, 'sw_A': -.12}
SNAP = {'body_pitch': -.10, 'thorax_pitch': -.14, 'head_pitch': -.30, 'body_y': -.14, 'body_z': -.01, 'mand': -.10,
        'lf_T': .25, 'sw_T': .45, 'sw_B': -.1, 'sw_A': -.25, 'tail_lift': .12, 'abd_lift': .06}
pose_attack = keyed([(0, {}), (7, REAR), (9, dict(SNAP, mand=.3)), (11, SNAP), (13, dict(SNAP, mand=-.06)), (18, {})])
CURL = {'body_y': .08, 'body_z': -.02, 'body_pitch': .10, 'thorax_pitch': .12, 'head_pitch': -.45, 'mand': -.08,
        'lf_T': .55, 'sw_T': .30, 'sw_B': -.15, 'lf_B': .15, 'abd_lift': .16, 'tail_lift': .38, 'head_yaw': .10,
        'body_roll': .05, 'scale_body': .96}
pose_block = keyed([(0, {}), (3, CURL), (6, dict(CURL, head_pitch=-.40, tail_lift=.30)), (12, {})])
POSEFN = {'idle': pose_idle, 'walk': pose_walk, 'attack': pose_attack, 'block': pose_block}

arm.animation_data_create()
for pb in arm.pose.bones: pb.rotation_mode = 'QUATERNION'
for clip, nf in CLIPS.items():
    act = bpy.data.actions.new(clip); act.use_fake_user = True; arm.animation_data.action = act
    for f in range(nf + 1):
        apply_pose(POSEFN[clip](f if clip not in ('idle', 'walk') or f < nf else 0))   # loops close exactly
        for pb in arm.pose.bones:
            for path in ('rotation_quaternion', 'location', 'scale'):
                pb.keyframe_insert(path, frame=f, group=pb.name)
    act.use_frame_range = True; act.frame_start = 0; act.frame_end = nf
    act.use_cyclic = clip in ('idle', 'walk')
    tr = arm.animation_data.nla_tracks.new(); tr.name = clip
    st = tr.strips.new(clip, 0, act); st.name = clip
    arm.animation_data.action = None; tr.mute = True
for pb in arm.pose.bones:
    pb.rotation_quaternion = Quaternion(); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
scene.frame_start = 0; scene.frame_end = CLIPS['idle']; scene.frame_set(0)

# ---------------------------------------------------------------- stats, save, export
bpy.context.view_layer.update()
me.calc_loop_triangles(); TRIS = len(me.loop_triangles)
xs = [v.co.x for v in me.vertices]; ys = [v.co.y for v in me.vertices]; zs = [v.co.z for v in me.vertices]
BOUNDS = {'blender_min': [round(min(xs), 4), round(min(ys), 4), round(min(zs), 4)],
          'blender_max': [round(max(xs), 4), round(max(ys), 4), round(max(zs), 4)],
          'height': round(max(zs) - min(zs), 4), 'length': round(max(ys) - min(ys), 4), 'width': round(max(xs) - min(xs), 4)}
print('GRUB stats tris', TRIS, 'bones', len(BONES), 'bounds', BOUNDS)
assert TRIS <= BUDGET['tris'] and len(BONES) <= BUDGET['bones'] and len(MATS) <= BUDGET['materials']

for tr in arm.animation_data.nla_tracks: tr.mute = False
bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); obj.select_set(True)
bpy.context.view_layer.objects.active = arm
GLB.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(GLB), export_format='GLB', use_selection=True, export_yup=True,
                          export_apply=False, export_skins=True, export_animations=True,
                          export_animation_mode='NLA_TRACKS', export_nla_strips=True, export_force_sampling=True,
                          export_def_bones=False, export_cameras=False, export_lights=False, export_extras=False)
for tr in arm.animation_data.nla_tracks: tr.mute = True
scene.frame_set(0)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'grubkin.blend'))
(OUT / 'grubkin.blend1').unlink(missing_ok=True)

# ---------------------------------------------------------------- proof renders (workbench, flat, sRGB-accurate)
RENDERS = []
if DO_RENDER:
    try: scene.render.engine = 'BLENDER_WORKBENCH'
    except TypeError: pass
    scene.view_settings.view_transform = 'Standard'
    sh = scene.display.shading; sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'
    sh.show_object_outline = True; sh.object_outline_color = (.08, .06, .05)
    sh.background_type = 'WORLD'
    world = bpy.data.worlds.new('bg'); scene.world = world; world.color = (s2l(.72), s2l(.74), s2l(.70))
    scene.render.resolution_x = scene.render.resolution_y = 720; scene.render.film_transparent = False
    # ground disc + 1.9-tall capsule for scale
    bpy.ops.mesh.primitive_circle_add(vertices=48, radius=2.2, fill_type='NGON', location=(0, 0, 0))
    ground = bpy.context.object; gm = bpy.data.materials.new('ground'); gm.diffuse_color = (s2l(.52), s2l(.55), s2l(.40), 1)
    ground.data.materials.append(gm)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=.25, depth=1.4, location=(1.05, 0, .95))
    cap = bpy.context.object
    for z in (.25, 1.65):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=.25, location=(1.05, 0, z))
        o = bpy.context.object; o.parent = cap; o.matrix_parent_inverse = cap.matrix_world.inverted()
    cm = bpy.data.materials.new('capsule'); cm.diffuse_color = (s2l(.6), s2l(.62), s2l(.66), 1)
    capsule_parts = [cap] + list(cap.children)
    for o in capsule_parts: o.data.materials.append(cm)
    cam_data = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cam_data)
    scene.collection.objects.link(cam); scene.camera = cam
    def shoot(name, loc, target, lens=50, capsule=False, clip=None, frame=0, ortho=None):
        for o in capsule_parts: o.hide_render = not capsule
        cam.location = Vector(loc); cam.rotation_euler = (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        cam_data.type = 'ORTHO' if ortho else 'PERSP'
        if ortho: cam_data.ortho_scale = ortho
        cam_data.lens = lens
        for tr in arm.animation_data.nla_tracks: tr.mute = True
        arm.animation_data.action = bpy.data.actions[clip] if clip else None
        if clip and arm.animation_data.action_slot is None and len(bpy.data.actions[clip].slots):
            arm.animation_data.action_slot = bpy.data.actions[clip].slots[0]
        if not clip:
            for pb in arm.pose.bones: pb.rotation_quaternion = Quaternion(); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
        scene.frame_set(frame); bpy.context.view_layer.update()
        p = REN / f'{name}.png'; scene.render.filepath = str(p); bpy.ops.render.render(write_still=True)
        RENDERS.append(p); arm.animation_data.action = None
    shoot('01_three_quarter_scale', (-2.9, -3.6, 1.9), (.45, 0, .7), lens=45, capsule=True)
    shoot('02_side', (-3.2, 0, .45), (0, .0, .36), ortho=1.6)
    shoot('03_front', (0, -3.2, .45), (0, 0, .36), ortho=1.6)
    shoot('04_idle', (-1.9, -2.2, 1.2), (0, 0, .35), lens=50, clip='idle', frame=18)
    shoot('05_walk', (-1.9, -2.2, 1.2), (0, 0, .35), lens=50, clip='walk', frame=6)
    shoot('06_attack', (-2.7, -.9, 1.0), (0, -.05, .4), lens=50, clip='attack', frame=7)
    shoot('07_block', (-1.9, -2.2, 1.2), (0, 0, .35), lens=50, clip='block', frame=4)
    shoot('08_attack_snap', (-2.7, -.9, 1.0), (0, -.05, .4), lens=50, clip='attack', frame=11)
    # contact sheet 4x2 via numpy (Blender-bundled)
    import numpy as np
    tiles = []
    for p in RENDERS:
        im = bpy.data.images.load(str(p)); w, h = im.size
        a = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4); tiles.append(a); bpy.data.images.remove(im)
    h, w = tiles[0].shape[:2]; cols, rows = 4, 2
    sheet = np.ones((rows * h, cols * w, 4), dtype=np.float32)
    for i, a in enumerate(tiles):
        r, c = divmod(i, cols); sheet[(rows - 1 - r) * h:(rows - r) * h, c * w:(c + 1) * w] = a
    img = bpy.data.images.new('sheet', cols * w, rows * h, alpha=True)
    img.pixels = sheet.ravel().tolist(); img.filepath_raw = str(REN / 'sheet.png'); img.file_format = 'PNG'; img.save()
    RENDERS.append(REN / 'sheet.png')

# ---------------------------------------------------------------- validation: parse GLB + re-import
def glb_json(p):
    b = p.read_bytes(); assert b[:4] == b'glTF'
    ln = struct.unpack('<I', b[12:16])[0]; return json.loads(b[20:20 + ln])
J = glb_json(GLB)
durs = {}
for a in J.get('animations', []):
    ts = [J['accessors'][s['input']] for s in a['samplers']]
    durs[a['name']] = round(max(t['max'][0] for t in ts) - min(t['min'][0] for t in ts), 4)
glb_tris = 0
for mesh in J['meshes']:
    for pr in mesh['primitives']: glb_tris += J['accessors'][pr['indices']]['count'] // 3
glb_bones = sum(len(s['joints']) for s in J.get('skins', []))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(GLB))
skinned = [o for o in bpy.context.scene.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers) and o.vertex_groups]
arms = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
imp_tris = 0
for o in skinned: o.data.calc_loop_triangles(); imp_tris += len(o.data.loop_triangles)
acts = {a.name: a.frame_range[1] - a.frame_range[0] for a in bpy.data.actions}
checks = {
    'skinned_mesh_present': bool(skinned) and bool(J.get('skins')),
    'clips_present': all(c in durs for c in CLIPS) and all(any(n.startswith(c) for n in acts) for c in CLIPS),
    'clip_durations_nonzero': all(durs.get(c, 0) > 0 for c in CLIPS),
    'tris_within_budget': imp_tris <= BUDGET['tris'] and glb_tris <= BUDGET['tris'],
    'bones_within_budget': glb_bones <= BUDGET['bones'] and bool(arms) and len(arms[0].data.bones) <= BUDGET['bones'],
    'materials_within_budget': len(J.get('materials', [])) <= BUDGET['materials'],
    'no_image_textures': not J.get('images'),
}
print('GRUB validation', checks, durs, 'glb tris', glb_tris, 'bones', glb_bones)

manifest = {
    'asset': 'holm_grubkin_v1', 'runtime_path': 'assets/models/holm_grubkin_v1.glb',
    'script': 'tools/blender/build_holm_grubkin_v1.py', 'blend': '.studio-workspaces/holm-grubkin-v1/candidates/grubkin.blend',
    'tris': glb_tris, 'bones': glb_bones, 'bone_names': BONES, 'materials': {k: list(v) for k, v in PALETTE.items()},
    'clips': {c: {'seconds': durs.get(c), 'frames': CLIPS[c], 'fps': FPS, 'loop': c in ('idle', 'walk')} for c in CLIPS},
    'glb_animation_names': list(durs), 'bounds': BOUNDS,
    'forward_axis': {'gltf': '+Z', 'blender': '-Y', 'note': 'matches v07.glb and three.js Object3D.lookAt (local +Z faces target)'},
    'up_axis': {'gltf': '+Y', 'blender': '+Z'}, 'origin': 'ground-contact centre',
    'suggested_npc_fields': {'glbChar': 'holm_grubkin_v1', 'glbHeight': .75},
    'budgets': BUDGET, 'validation': checks, 'renders': [str(p) for p in RENDERS],
}
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2))
ok = all(checks.values())
report = f"""# Holm practice grubkin v1

Original six-legged grub crawler for the Tutor's Holm combat trial (dagger / shortbow / Wind Strike target).
Built by `tools/blender/build_holm_grubkin_v1.py` (Blender 4.5 headless, deterministic).

- Runtime GLB: `assets/models/holm_grubkin_v1.glb` (load via `glbChar:'holm_grubkin_v1', glbHeight:0.75`)
- Blend: `.studio-workspaces/holm-grubkin-v1/candidates/grubkin.blend`
- Renders: `scratchpad/holm_grubkin_v1/` (01 three-quarter + 1.9 capsule, 02 side, 03 front, 04-08 clip poses, sheet.png)

## Numbers
- Triangles: {glb_tris} / {BUDGET['tris']}
- Bones: {glb_bones} / {BUDGET['bones']} ({', '.join(BONES)})
- Materials: {len(J.get('materials', []))} / {BUDGET['materials']} (flat sRGB colours, roughness 1, no textures)
- Bounds (Blender units): height {BOUNDS['height']}, length {BOUNDS['length']}, width {BOUNDS['width']}
- Forward: glTF +Z (Blender -Y), same as v07.glb; `npc.mesh.lookAt(player)` aims it correctly.

## Clips (glTF animation names)
""" + '\n'.join(f"- `{c}`: {durs.get(c)} s ({CLIPS[c]} frames @ {FPS} fps{', loops' if c in ('idle', 'walk') else ', one-shot'})" for c in CLIPS) + f"""

walk is in place (no root motion; alternating tripod gait TL+BR+AL / TR+BL+AR, body bob twice per cycle).
attack rears up (front legs raised, jaws open) then lunges and snaps the mandibles shut; block flinches back and curls
(head tucked, tail up, front legs guarding). Skinning is rigid per part (one weight 1.0 per vertex) for robustness.

## Validation (re-import of the exported GLB)
""" + '\n'.join(f"- {k}: {'PASS' if v else 'FAIL'}" for k, v in checks.items()) + f"""

Overall: {'PASS' if ok else 'FAIL'}
"""
(OUT / 'REPORT.md').write_text(report)
print('GRUB DONE', 'PASS' if ok else 'FAIL')
assert ok, checks
