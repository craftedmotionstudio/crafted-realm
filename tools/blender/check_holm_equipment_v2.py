"""Fit check + review sheets for the Holm worn / held equipment on the v3.0 character kit (Blender 4.5, headless).

Every worn slot (head, cape, amulet, body, legs, hands, feet), the shields and every held weapon, on both body types
(A / B) and all three builds (slim / average / stout), at the idle and at the extreme walk / run / attack frames.
The equipment is placed exactly as the runtime does it:
  worn  (src/holm_equipment.js fit): each bind-space part rides its bone (world = pose bone @ rest bone^-1), the
        body type's own template (eq_<kind> / eq_<kind>_B), morph influences copied from the kit (Build_Stout /
        Build_Slim / Feet_*; Over_<body armour> on the amulet and cape), the kit slots listed in the root's `hides`
        hidden (a helm shows the bald head), a full helm collapses the Head bone (fx_humanoid);
  held  (src/equip_builder.js solveHeld): orientation from the spec's neutral / rollAim, grip in the palm, solved at idle
        frame 0 and then rigid on the hand bone;
  shield (fx_humanoid): strapped to the left forearm at 55% elbow -> wrist, 6.5 cm out, face out + a little forward.
Checks (numbers per kind / body / build / frame; worst cases listed):
  exposed  -- kit surface that must be under the equipment (the hidden slots it replaces, and the visible layers inside
              its span) whose outward ray does not hit the equipment: a gap / hole or a part poking through;
  sunk     -- held weapon / shield / amulet / cape vertices inside the kit body by more than 5 mm.
Usage: blender -b --python tools/blender/check_holm_equipment_v2.py -- [--equip GLB] [--out DIR] [--label v2] [--no-render] [--quick]
Reads the kit (assets/models/holm_kit_v2.glb) and the equipment GLB; writes JSON + PNG sheets to --out only.
"""
import bpy, sys, os, json, math, re, time
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.dirname(os.path.dirname(HERE))
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(k, d):
    return ARGS[ARGS.index(k) + 1] if k in ARGS else d
EQUIP = arg('--equip', os.path.join(ROOT, '.studio-workspaces', 'holm-equipment-v2', 'candidates', 'equipment.glb'))
OUT = arg('--out', os.path.join(ROOT, 'scratchpad', 'holm_equipment_v2'))
TAG = arg('--label', 'v2')
DO_RENDER = '--no-render' not in ARGS
QUICK = '--quick' in ARGS
ONLY = set(arg('--only', '').split(',')) - {''}
KIT = arg('--kit', os.path.join(ROOT, 'assets', 'models', 'holm_kit_v2.glb'))
os.makedirs(os.path.join(OUT, 'cells'), exist_ok=True)
import build_holm_characters_v2 as K
K.RENDER_DIR = OUT
t0 = time.time()

# ---------------------------------------------------------------- scene
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=KIT)
ARM = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
KITM = {o.name: o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Kit_')}
for o in bpy.data.objects:
    if o.type == 'MESH' and not o.name.startswith('Kit_'):
        bpy.data.objects.remove(o, do_unlink=True)
ad = ARM.animation_data or ARM.animation_data_create()
for tr in list(ad.nla_tracks):
    ad.nla_tracks.remove(tr)
ACT = {a.name: a for a in bpy.data.actions}
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=EQUIP)
EQ = {}      # (kind, body) -> {'root', 'parts': [(ob, bone)], 'frame', 'slot', 'hides', 'extras'}
for o in [o for o in bpy.data.objects if o not in before]:
    skinned = o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers)
    if o.get('eq_kind') and (o.parent is None or skinned):
        kind, body = o['eq_kind'], o.get('body', 'A')
        if skinned:           # v2 suits: follow the kit's skeleton exactly like the runtime rebind
            for m in o.modifiers:
                if m.type == 'ARMATURE':
                    m.object = ARM
            parts = [(o, None)]
        else:
            parts = [(c, c.get('bone')) for c in o.children_recursive if c.type == 'MESH']
        EQ[(kind, body)] = {'root': o, 'parts': parts, 'frame': o.get('frame'), 'slot': o.get('slot'),
                            'hides': list(o.get('hides', [])), 'kit_morphs': list(o.get('kit_morphs', [])), 'grip': list(o.get('grip', [0, 0, 0])) if o.get('grip') is not None else None}
for e in EQ.values():
    for c, _ in e['parts']:
        c['rest'] = [list(r) for r in c.matrix_world]
        c.hide_render = True
print('[EQCHECK] kinds', sorted({k for k, _ in EQ}), 'B variants', sorted(k for k, b in EQ if b == 'B'))

def srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
SRGB = {}
for m in bpy.data.materials:
    if m.use_nodes:
        bs = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if bs:
            SRGB[m.name] = tuple(bs.inputs['Base Color'].default_value)[:3]
            bs.inputs['Roughness'].default_value = 1.0
            bs.inputs['Metallic'].default_value = 0.0
            if 'Specular IOR Level' in bs.inputs:
                bs.inputs['Specular IOR Level'].default_value = 0.0
def set_col(mname, rgb):
    m = bpy.data.materials.get(mname)
    if not m:
        return
    bs = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if bs:
        bs.inputs['Base Color'].default_value = tuple(srgb_to_lin(c) for c in rgb) + (1,)
for n, rgb in SRGB.items():
    set_col(n, rgb)
def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
def kit_colors(bt):
    for ch, mn in K.CHANNEL_MAT.items():
        set_col(mn, hexrgb(K.PALETTES[ch][K.DEFAULT_COLORS[bt][ch]]))
METAL = {'bronze': 0x8a6437, 'iron': 0x9aa0a8, 'steel': 0xd0d4dc}
def eq_metal(hexv):
    c = ((hexv >> 16 & 255) / 255, (hexv >> 8 & 255) / 255, (hexv & 255) / 255)
    set_col('M_METAL', c); set_col('M_METAL_DARK', tuple(v * .72 for v in c)); set_col('M_METAL_MID', tuple(v * .86 for v in c))
    set_col('M_METAL_EDGE', tuple(v + (1 - v) * .3 for v in c))
    set_col('M_CLOTH', (0.23, 0.35, 0.68)); set_col('M_CLOTH_DARK', (0.23 * .72, 0.35 * .72, 0.68 * .72))

# ---------------------------------------------------------------- posing
def pb(short):
    return ARM.pose.bones['mixamorig:' + short]
def set_frame(clip, fr):
    ad.action = ACT[clip]
    if hasattr(ad, 'action_slot') and getattr(ACT[clip], 'slots', None):
        ad.action_slot = ACT[clip].slots[0]
    bpy.context.scene.frame_set(fr)
    bpy.context.view_layer.update()
def bone_world(short):
    return ARM.matrix_world @ pb(short).matrix
BUILDS = {'slim': {'Build_Slim': 1.0}, 'average': {}, 'stout': {'Build_Stout': 1.0}}
DEFAULT = {'A': {'Hair': 1, 'Jaw': 1, 'Torso': 1, 'Arms': 1, 'Hands': 1, 'Legs': 1, 'Feet': 1},
           'B': {'Hair': 1, 'Torso': 1, 'Arms': 1, 'Hands': 1, 'Legs': 1, 'Feet': 1, 'Makeup': 1}}
def kit_name(bt, slot, i):
    return 'Kit_%s_%s_%02d' % (bt, slot, i)

class Look:
    """one test: body, build, kit parts, worn kinds (+ held weapon / shield)"""
    def __init__(s, bt, build='average', parts=None, worn=(), weapon=None, shield=None, feet=None):
        s.bt, s.build, s.worn, s.weapon, s.shield, s.feet = bt, build, list(worn), weapon, shield, feet
        s.parts = dict(DEFAULT[bt]); s.parts.update(parts or {})
    def eq(s, kind):
        return EQ.get((kind, s.bt)) or EQ.get((kind, 'A'))
    def hides(s):
        h = set()
        for k in s.worn:
            e = s.eq(k)
            if e:
                h |= set(e['hides'])
        return h
    def kit_visible(s):
        h = s.hides()
        out = []
        for slot, i in s.parts.items():
            if slot in h and slot != 'Hair':
                continue
            if slot == 'Hair' and 'Hair' in h:
                i = 2            # the bald head under a helm / hat
            n = kit_name(s.bt, slot, i)
            if n in KITM:
                out.append(KITM[n])
        return out
    def kit_hidden(s):
        h = s.hides()
        return [KITM[kit_name(s.bt, sl, s.parts[sl])] for sl in h if sl in s.parts and sl != 'Hair' and kit_name(s.bt, sl, s.parts[sl]) in KITM]
    def morphs(s):
        d = dict(BUILDS[s.build])
        for k in s.worn:           # kit morphs a worn item switches on (Hair_Over / Jaw_Over: hair and beards over it)
            e = s.eq(k)
            if e:
                d.update({m: 1.0 for m in e.get('kit_morphs', [])})
        if s.feet == 'small': d['Feet_Small'] = 1.0
        if s.feet == 'large': d['Feet_Large'] = 1.0
        return d
    def over(s):
        for k in s.worn:
            e = s.eq(k)
            if e and e['slot'] == 'body':
                return 'Over_' + k
        return None

def apply_look(L, clip, fr):
    """pose + visibility + morphs + equipment placement for one look at one frame; returns placed equipment objects"""
    kit_colors(L.bt)
    vis = set(L.kit_visible())
    mv = L.morphs()
    for o in KITM.values():
        o.hide_render = o not in vis
        if o.data.shape_keys:
            for kb in o.data.shape_keys.key_blocks[1:]:
                kb.value = mv.get(kb.name, 0.0)
    for e in EQ.values():
        for c, _ in e['parts']:
            c.hide_render = True
    helm = any(L.eq(k) and L.eq(k)['slot'] == 'head' and k == 'fullhelm' for k in L.worn)
    set_frame(clip, fr)
    pb('Head').scale = (.02, .02, .02) if helm else (1, 1, 1)
    bpy.context.view_layer.update()
    placed = []
    over = L.over()
    for k in L.worn:
        e = L.eq(k)
        if not e:
            continue
        for c, bone in e['parts']:
            if bone is not None:
                p = pb(bone)
                M = ARM.matrix_world @ p.matrix
                if bone == 'Head' and helm:
                    M = M @ Matrix.Scale(50.0, 4)
                c.matrix_world = M @ p.bone.matrix_local.inverted()
            c.hide_render = False
            if c.data.shape_keys:
                for kb in c.data.shape_keys.key_blocks[1:]:
                    hair_i = 0 if 'Hair' in L.hides() else L.parts.get('Hair', 0)
                    kb.value = 1.0 if (kb.name in mv or kb.name == over or
                                       (over is None and kb.name == 'Over_Torso_%02d' % L.parts.get('Torso', 0)) or
                                       kb.name == 'Over_Hair_%02d' % hair_i) else 0.0
            placed.append(c)
    for held in (L.weapon, L.shield):
        if held:
            placed += place_held(held, L, clip, fr)
    bpy.context.view_layer.update()
    return placed

# ---------------------------------------------------------------- held items (EquipBuilder / fx_humanoid rules)
C_G2B = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))
def g2b(v):
    return C_G2B @ Vector(v)
def parse_specs():
    t = open(os.path.join(ROOT, 'src', 'equip_builder.js'), encoding='utf8').read()
    out = {}
    for m_ in re.finditer(r"(\w+):\s*\{axis:\[([^\]]+)\],\s*roll:\[([^\]]+)\],\s*neutral:\[([^\]]+)\],\s*rollAim:\[([^\]]+)\],"
                          r"\s*grip:\[([^\]]+)\],\s*palmAlong:([\d.]+)(,\s*hand:'(\w+)')?\}", t):
        f = lambda g: [float(x) for x in g.split(',')]
        out[m_.group(1)] = dict(axis=f(m_.group(2)), roll=f(m_.group(3)), neutral=f(m_.group(4)), rollAim=f(m_.group(5)),
                                grip=f(m_.group(6)), palmAlong=float(m_.group(7)), hand=m_.group(9) or 'RightHand')
    return out
SPECS = parse_specs()
KIND_SPEC = {'dagger': 'dagger', 'sword': 'sword', 'longsword': 'longsword', 'sabre': 'sabre', 'greatsword': 'greatsword',
             'mace': 'mace', 'warhammer': 'warhammer', 'battleaxe': 'battleaxe', 'hatchet': 'axe', 'pickaxe': 'pick',
             'shortbow': 'bow', 'longbow': 'longbow', 'staff': 'staff'}
HELD_REL = {}   # (kind, bt, build) -> (hand bone, matrix relative to the hand bone, solved at idle frame 0)
def basis(x, y):
    x = x.normalized(); y = (y - x * y.dot(x)).normalized(); z = x.cross(y)
    return Matrix((x, y, z)).transposed()
def solve_weapon(kind):
    sp = SPECS[KIND_SPEC[kind]]
    yW = Vector(sp['neutral']).normalized(); xa = Vector(sp['rollAim']); xW = (xa - yW * xa.dot(yW)).normalized(); zW = xW.cross(yW)
    yl = Vector(sp['axis']).normalized(); xl0 = Vector(sp['roll']); xl = (xl0 - yl * xl0.dot(yl)).normalized(); zl = xl.cross(yl)
    Rg = Matrix((xW, yW, zW)).transposed() @ Matrix((xl, yl, zl)).transposed().inverted()
    Rb = C_G2B @ Rg @ C_G2B.inverted()
    Mh = bone_world(sp['hand'])
    palm = Mh.translation + Mh.to_3x3().col[1].normalized() * sp['palmAlong']
    grip = C_G2B @ Vector(sp['grip'])
    return sp['hand'], Matrix.Translation(palm - Rb @ grip) @ Rb.to_4x4()
def solve_shield(kind):
    e = EQ[(kind, 'A')]
    pts = [c.matrix_world.inverted() @ (c.matrix_world @ v.co) for c, _ in e['parts'] for v in c.data.vertices]
    lo = Vector([min(p[i] for p in pts) for i in range(3)]); hi = Vector([max(p[i] for p in pts) for i in range(3)])
    ext_b = hi - lo
    ext_g = [ext_b.x, ext_b.z, ext_b.y]                      # glTF x, y, z sizes
    axis_b = [Vector((1, 0, 0)), Vector((0, 0, 1)), Vector((0, -1, 0))]
    order = sorted(range(3), key=lambda i: ext_g[i])
    nl, ul = axis_b[order[0]], axis_b[order[2]]
    sq = kind == 'sqshield'
    nW = g2b((0.72, 0, 0.69) if sq else (0.94, 0, 0.34)).normalized()
    upr = g2b((0, 0.71, 0.71) if sq else (0, 1, 0))
    W = basis(nW, upr)
    Lm = basis(nl, ul)
    R = W @ Lm.inverted()
    pE = bone_world('LeftForeArm').translation; pW = bone_world('LeftHand').translation
    SQ = [float(x) for x in arg('--sq', '.1,0,.05').split(',')]      # riot shield strap: out, forward, drop (fx_humanoid)
    pt = pE.lerp(pW, .55) + Vector((1, 0, 0)) * (SQ[0] if sq else .065)
    if sq:
        pt += Vector((0, -SQ[1], -SQ[2]))
    return 'LeftForeArm', Matrix.Translation(pt) @ R.to_4x4()
def place_held(kind, L, clip, fr):
    key = (kind, L.bt, L.build)
    if key not in HELD_REL:
        cur = (ad.action, bpy.context.scene.frame_current)
        set_frame('idle', 0)
        bone, Mw = (solve_shield(kind) if kind in ('round_shield', 'sqshield', 'kiteshield') else solve_weapon(kind))
        HELD_REL[key] = (bone, bone_world(bone).inverted() @ Mw)
        set_frame(clip, fr)
    bone, rel = HELD_REL[key]
    e = EQ[(kind, 'A')]
    out = []
    for c, _ in e['parts']:
        c.matrix_world = bone_world(bone) @ rel
        c.hide_render = False
        out.append(c)
    return out

# ---------------------------------------------------------------- measurement
OUTER = {}
def outer_polys(o):
    """rest-pose polygons of a kit part that face away from the body / head axis (a hair shell's visible outside)"""
    if o.name not in OUTER:
        keep = set()
        for p in o.data.polygons:
            c = p.center
            r = c - Vector((0, -.02, min(max(c.z, 1.0), 1.68)))
            if p.normal.dot(r) > 0:
                keep.add(p.index)
        OUTER[o.name] = keep
    return OUTER[o.name]
def evaluated(objs, only_outer=False):
    dg = bpy.context.evaluated_depsgraph_get()
    res = []
    for o in objs:
        oe = o.evaluated_get(dg)
        me = oe.to_mesh()
        mw = oe.matrix_world
        nm = mw.to_3x3().inverted().transposed()
        co = [mw @ v.co for v in me.vertices]
        no = [(nm @ v.normal).normalized() for v in me.vertices]
        keep = outer_polys(o) if only_outer else None
        tris = [tuple(p.vertices) for p in me.polygons if keep is None or p.index in keep]
        oe.to_mesh_clear()
        res.append((o, co, no, tris))
    return res
def union_bvh(ev):
    co, tris = [], []
    for o, c, n, t in ev:
        k = len(co)
        co += c
        tris += [tuple(k + i for i in f) for f in t]
    return BVHTree.FromPolygons(co, tris) if tris else None
REST_CO = {}
def rest_co(o, L):
    """bind-pose vertex positions of a kit part with the look's morphs (span tests use rest coordinates)"""
    key = (o.name, tuple(sorted(L.morphs().items())))
    if key not in REST_CO:
        base = [v.co.copy() for v in o.data.vertices]
        if o.data.shape_keys:
            mv = L.morphs()
            kbs = o.data.shape_keys.key_blocks
            for kb in kbs[1:]:
                w = mv.get(kb.name, 0.0)
                if w:
                    for i, d in enumerate(kb.data):
                        base[i] = base[i] + (d.co - kbs[0].data[i].co) * w
        REST_CO[key] = base
    return REST_CO[key]

# spans: which kit vertices each kind must cover (rest coordinates, both bodies). slot -> fn(p) -> bool
def u_arm(bt, sx, p):
    """arm parameter of a rest point (0 at the shoulder seam .. 1 elbow .. 2 wrist) by projection on the kit arm path"""
    pa = K.arm_path(bt, sx)
    best = None
    for i in range(len(pa.p) - 1):
        a, b = pa.p[i], pa.p[i + 1]
        d = b - a
        t = max(0.0, min(1.0, (p - a).dot(d) / d.length_squared))
        dist = (a + d * t - p).length
        if best is None or dist < best[0]:
            best = (dist, i + t)
    return best[1]
def leg_dist(bt, p):
    """how far a rest point lies outside the kit leg's own radius (flares / skirts that go OVER a boot are not in its span)"""
    sx = 1 if p.x > 0 else -1
    pl = K.leg_path(bt, sx)
    best = None
    for i in range(len(pl.p) - 1):
        a, b = pl.p[i], pl.p[i + 1]
        d = b - a
        t = max(0.0, min(1.0, (p - a).dot(d) / d.length_squared))
        dist = (a + d * t - p).length
        if best is None or dist < best[0]:
            best = (dist, i + t)
    rs = K.lerp_table(K.LEG_R[bt], best[1])[0]
    return best[0] - rs
SPANS = {
    'fullhelm':    {'Torso': lambda bt, p: p.z > 1.50, 'Hair': lambda bt, p: 1.49 < p.z < 1.57 and abs(p.y) < .09},
    'medhelm':     {'Hair': lambda bt, p: p.z > 1.745},
    'hat':         {'Hair': lambda bt, p: p.z > 1.765},
    'platebody':   {'Torso': lambda bt, p: .97 < p.z < 1.47, 'Arms': lambda bt, p: u_arm(bt, 1 if p.x > 0 else -1, p) < 1.86,
                    'Legs': lambda bt, p: p.z > .955},
    'chainbody':   {'Torso': lambda bt, p: .90 < p.z < 1.47, 'Arms': lambda bt, p: u_arm(bt, 1 if p.x > 0 else -1, p) < 1.86,
                    'Legs': lambda bt, p: p.z > .90},
    'leather_body': {'Torso': lambda bt, p: .97 < p.z < 1.46, 'Arms': lambda bt, p: u_arm(bt, 1 if p.x > 0 else -1, p) < 1.86,
                     'Legs': lambda bt, p: p.z > .96},
    'platelegs':   {'Legs': lambda bt, p: .14 < p.z < 1.0},
    'plateskirt':  {'Legs': lambda bt, p: .50 < p.z < .99},
    'chaps':       {'Legs': lambda bt, p: .14 < p.z < 1.0},
    'gloves':      {'Hands': lambda bt, p: True, 'Arms': lambda bt, p: u_arm(bt, 1 if p.x > 0 else -1, p) > 1.93},
    'boots':       {'Feet': lambda bt, p: p.z < .26, 'Legs': lambda bt, p: p.z < .24 and leg_dist(bt, p) < .030},
}
HIDDEN_DEPTH = .03   # a hidden slot is only an envelope: its ray starts this far inside (a fold may push it out; a hole may not)
def exposure(L, kind, placed_ev, span_parts, occl_ev=()):
    """kit vertices in the kind's span whose outward ray (normal) misses the equipment. span_parts: [(slot, obj)].
    Visible layers: the ray starts on the vertex (nothing may poke out). Hidden slots (the item replaces them): the ray
    starts HIDDEN_DEPTH inside, i.e. there must be equipment over every point of the body (no hole to look into)."""
    res = {'n': 0, 'exposed': 0, 'where': []}
    if not placed_ev:
        return res
    sp = SPANS.get(kind, {})
    hid = L.hides()
    for slot, o in span_parts:
        fn = sp.get(slot)
        if not fn:
            continue
        back = HIDDEN_DEPTH if (slot in hid and slot != 'Hair') else -.002
        # occluders: the equipment and every other visible kit part (a ray that ends in the neck or a leg is not a hole)
        bvh = union_bvh(list(placed_ev) + [x for x in occl_ev if x[0] is not o])
        ev = evaluated([o])[0]
        rc = rest_co(o, L)
        for i, (p, n) in enumerate(zip(ev[1], ev[2])):
            if not fn(L.bt, rc[i]) or rc[i].z < .012:     # the sole on the ground is never seen
                continue
            res['n'] += 1
            # visible from a camera level with or above the vertex: the outward ray never points steeply down
            d = Vector((n.x, n.y, max(n.z, 0.0)))
            if d.length < 1e-6:
                continue
            d.normalize()
            hit = bvh.ray_cast(p - d * back, d, 2.2)      # (a ray up the inside of a leg or the suit ends in the head)
            if hit[0] is None:
                res['exposed'] += 1
                if len(res['where']) < 6:
                    res['where'].append([slot] + [round(c, 3) for c in rc[i]])
    return res
def overlaps(obj_ev, body_ev):
    """triangle pairs where the item passes through the given kit / equipment surfaces (BVH overlap), and where"""
    a, b = union_bvh(obj_ev), union_bvh(body_ev)
    if a is None or b is None:
        return 0, []
    pairs = a.overlap(b)
    co = [p for _, c, _, _ in obj_ev for p in c]
    tr = []
    for o, c, n, t in obj_ev:
        k = sum(len(x[1]) for x in obj_ev[:obj_ev.index((o, c, n, t))])
        tr += [tuple(k + i for i in f) for f in t]
    where = []
    for i, _ in pairs[:4]:
        f = tr[i]
        c = sum((co[j] for j in f), Vector()) / len(f)
        where.append([round(v, 3) for v in c])
    return len(pairs), where

# ---------------------------------------------------------------- the test matrix
WORN = ['fullhelm', 'medhelm', 'hat', 'amulet', 'cape', 'platebody', 'chainbody', 'leather_body', 'platelegs', 'plateskirt',
        'chaps', 'gloves', 'boots']
HELD = ['dagger', 'sword', 'longsword', 'sabre', 'greatsword', 'mace', 'warhammer', 'battleaxe', 'hatchet', 'pickaxe',
        'shortbow', 'longbow', 'staff', 'round_shield', 'sqshield', 'kiteshield']
if ONLY:
    WORN = [k for k in WORN if k in ONLY]
    HELD = [k for k in HELD if k in ONLY]
FRAMES = [('idle', 0), ('idle', 30), ('walk', 0), ('walk', 4), ('walk', 7), ('walk', 11), ('run', 0), ('run', 4), ('run', 8), ('run', 12),
          ('attack_slash', 5), ('attack_slash', 9), ('attack_stab', 5), ('attack_stab', 9), ('attack_crush', 8), ('attack_crush', 12),
          ('block', 4), ('bow', 18), ('cast', 14)]
HELD_CLIPS = {'bow': [('bow', 8), ('bow', 18), ('bow', 26)], 'cast': [('cast', 8), ('cast', 14)]}
if QUICK:
    FRAMES = [('idle', 0), ('walk', 0), ('attack_slash', 5)]
PROBE = {'A': {'Torso': 1, 'Arms': 1, 'Hands': 1, 'Legs': 1, 'Feet': 1}, 'B': {'Torso': 1, 'Arms': 1, 'Hands': 1, 'Legs': 4, 'Feet': 1}}
EXPOSED_TOL = 2      # a couple of exposed vertices at a seam is noise, not a visible hole
SLOT_OF = {'fullhelm': 'Hair', 'medhelm': 'Hair', 'hat': 'Hair'}
# the kit options each kind is tried over (the visible layers it must sit on / over)
def variants(kind, bt):
    n = lambda slot: len(K.KIT[bt].get(slot, []))
    if kind in ('medhelm', 'hat', 'fullhelm'):
        return [dict(Jaw=1), dict(Jaw=3)] if bt == 'A' else [dict()]
    if kind == 'amulet':
        return [dict(Torso=t) for t in range(1, n('Torso') + 1)]
    if kind == 'cape':
        return [dict(Torso=t) for t in range(1, n('Torso') + 1)] + [dict(Hair=h) for h in ((3, 4) if bt == 'A' else (4, 6, 11))] +                ([dict(Jaw=3)] if bt == 'A' else [])
    if kind in ('chainbody', 'leather_body', 'platebody'):
        hairs = (1, 3, 4) if bt == 'A' else (1, 4, 6, 11)
        return [dict(Legs=l) for l in range(1, n('Legs') + 1)] + [dict(Hair=h) for h in hairs[1:]] +                ([dict(Jaw=3), dict(Jaw=4)] if bt == 'A' else [])
    if kind == 'plateskirt':
        return [dict(Legs=l) for l in range(1, n('Legs') + 1)]
    if kind == 'gloves':
        return [dict(Arms=a) for a in range(1, n('Arms') + 1)]
    if kind == 'boots':
        return [dict(Legs=l) for l in range(1, n('Legs') + 1)]
    return [dict()]

RESULTS = {'equip': os.path.relpath(EQUIP, ROOT).replace('\\', '/'), 'kit': 'assets/models/holm_kit_v2.glb', 'frames': FRAMES,
           'worn': {}, 'held': {}, 'rows': {}}
def run_worn():
    for kind in WORN:
        if not any(k == kind for k, _ in EQ):
            continue
        rows = []
        for bt in ('A', 'B'):
            for build in ('slim', 'average', 'stout'):
                for var in variants(kind, bt):
                    var = {k: v for k, v in var.items() if v}
                    extra = []
                    if kind in ('amulet', 'cape'):
                        extra = [None, 'platebody', 'chainbody', 'leather_body']
                    for body_armour in (extra or [None]):
                        worn = [kind] + ([body_armour] if body_armour else [])
                        for feet in ((None, 'small', 'large') if kind == 'boots' else (None,)):
                            L = Look(bt, build, var, worn, feet=feet)
                            for clip, fr in FRAMES:
                                placed = apply_look(L, clip, fr)
                                pev = evaluated(placed)
                                r = {'bt': bt, 'build': build, 'kit': var, 'with': body_armour, 'feet': feet, 'clip': clip, 'frame': fr}
                                if kind in SPANS:
                                    def probe(sl):
                                        if sl == 'Hair' and 'Hair' in L.hides():
                                            return 2                       # the bald head under a helm
                                        if sl in L.hides() and sl in PROBE[bt]:
                                            return PROBE[bt][sl]           # a hidden slot is probed with its plain body envelope
                                        return L.parts[sl]
                                    spans = [(sl, KITM[kit_name(bt, sl, probe(sl))]) for sl in SPANS[kind] if sl in L.parts]
                                    ex = exposure(L, kind, pev, spans, evaluated(L.kit_visible()))
                                    r.update(n=ex['n'], exposed=ex['exposed'], where=ex['where'])
                                if kind in ('platebody', 'chainbody', 'leather_body', 'cape'):
                                    hair = [KITM[kit_name(bt, 'Hair', L.parts['Hair'])]] +                                            ([KITM[kit_name(bt, 'Jaw', L.parts['Jaw'])]] if 'Jaw' in L.parts else [])
                                    # only the hair's outside counts: armour inside the hair shell is covered by it (hair over the armour)
                                    r['hair_through'], r['hair_at'] = overlaps(evaluated(hair, only_outer=True), pev)
                                if kind in ('amulet', 'cape'):
                                    mine = [x for x in pev if x[0] in [c for c, _ in L.eq(kind)['parts']]]
                                    others = [x for x in pev if x not in mine]
                                    vis = L.kit_visible()
                                    body = evaluated([o for o in vis if '_Hair_' not in o.name]) + evaluated([o for o in vis if '_Hair_' in o.name], only_outer=True) + others
                                    r['through'], r['through_at'] = overlaps(mine, body)
                                    if r['through']:
                                        r['through_parts'] = {b_[0].name: [o_[0], o_[1][:2]] for b_ in body for o_ in [overlaps(mine, [b_])] if o_[0]}
                                rows.append(r)
        bad = [r for r in rows if r.get('exposed', 0) > EXPOSED_TOL or r.get('through') or r.get('hair_through')]
        RESULTS['rows'][kind] = rows
        RESULTS['worn'][kind] = {'tests': len(rows), 'failing': len(bad), 'max_exposed': max((r.get('exposed', 0) for r in rows), default=0),
                                 'worst': sorted(bad, key=lambda r: -(r.get('exposed', 0) + r.get('through', 0)))[:12]}
        print('[EQCHECK] worn %-12s tests %4d failing %3d  %.0fs' % (kind, len(rows), len(bad), time.time() - t0))

def run_held():
    for kind in HELD:
        if (kind, 'A') not in EQ:
            continue
        rows = []
        for bt in ('A', 'B'):
            for build in ('slim', 'average', 'stout'):
                shield = kind in ('round_shield', 'sqshield', 'kiteshield')
                L = Look(bt, build, {}, [], weapon=None if shield else kind, shield=kind if shield else None)
                hand = 'Left' if (shield or SPECS[KIND_SPEC[kind]]['hand'] == 'LeftHand') else 'Right'
                fr_ = [f for f in FRAMES if f[0] in ('idle', 'walk', 'run')]
                fr_ += HELD_CLIPS['bow'] if kind in ('shortbow', 'longbow') else (HELD_CLIPS['cast'] if kind == 'staff' else
                       [f for f in FRAMES if f[0].startswith('attack') or (shield and f[0] == 'block')])
                for clip, fr in fr_:
                    placed = apply_look(L, clip, fr)
                    vis = L.kit_visible()
                    own = [o for o in vis if re.match(r'Kit_[AB]_(Arms|Hands)_', o.name)]
                    body = evaluated([o for o in vis if o not in own])
                    n, at = overlaps(evaluated(placed), body)
                    # the holding arm / hand: only the arm on the other side counts as the body
                    arm_ev = evaluated(own)
                    na, _ = overlaps(evaluated(placed), arm_ev)
                    rows.append({'bt': bt, 'build': build, 'clip': clip, 'frame': fr, 'through_body': n, 'at': at, 'through_arms_hands': na})
        bad = [r for r in rows if r['through_body']]
        idle_bad = [r for r in bad if r['clip'] in ('idle', 'walk', 'run')]
        RESULTS['rows'][kind] = rows
        RESULTS['held'][kind] = {'tests': len(rows), 'failing': len(bad), 'failing_idle_walk_run': len(idle_bad),
                                 'arms_hands_contacts': sum(1 for r in rows if r['through_arms_hands']),
                                 'worst': sorted(bad, key=lambda r: -r['through_body'])[:10]}
        print('[EQCHECK] held %-12s tests %4d failing %3d (idle/walk/run %d)' % (kind, len(rows), len(bad), len(idle_bad)))

DEBUG = arg('--debug', '')
if DEBUG:     # run a debugging snippet against the loaded scene instead of the test matrix
    exec(open(DEBUG, encoding='utf8').read())
    WORN, HELD, DO_RENDER = [], [], False
SHOTS = arg('--shots', '')
if SHOTS:     # debugging close-ups: a JSON list of {bt, build, kit, worn, weapon, shield, feet, clip, fr, ctr, orth, vd, label}
    K.setup_render()
    for o in bpy.data.objects:
        if o.type == 'MESH' and o.name not in KITM and not any(o in [c for c, _ in e['parts']] for e in EQ.values()):
            o.hide_render = True
    cells = []
    for i, sh in enumerate(json.load(open(SHOTS))):
        L = Look(sh['bt'], sh.get('build', 'average'), sh.get('kit', {}), sh.get('worn', []), weapon=sh.get('weapon'),
                 shield=sh.get('shield'), feet=sh.get('feet'))
        eq_metal(METAL['iron'])
        apply_look(L, sh.get('clip', 'idle'), sh.get('fr', 0))
        p_ = K.shoot(os.path.join(OUT, 'cells', 'shot_%s_%02d.png' % (TAG, i)), tuple(sh.get('res', (320, 320))), tuple(sh.get('vd', (.55, -.8, .18))),
                     tuple(sh.get('ctr', (0, 0, 1.3))), sh.get('orth', .6), ground=False, persp=None)
        cells.append(K.cell(p_, sh.get('label', '%d' % i), bg=[214, 214, 218]))
    rows = [{'title': '', 'height': 330, 'cells': cells[j:j + 6]} for j in range(0, len(cells), 6)]
    K.compose(os.path.join(OUT, 'shots_%s.png' % TAG), rows, 'close-ups ' + TAG)
    print('[EQCHECK] SHOTS', os.path.join(OUT, 'shots_%s.png' % TAG))
    WORN, HELD, DO_RENDER = [], [], False
run_worn()
run_held()
summary = {'worn_failing': {k: v['failing'] for k, v in RESULTS['worn'].items()},
           'held_failing': {k: v['failing'] for k, v in RESULTS['held'].items()},
           'held_failing_idle_walk_run': {k: v['failing_idle_walk_run'] for k, v in RESULTS['held'].items()}}
RESULTS['summary'] = summary
json.dump(RESULTS, open(os.path.join(OUT, 'fit_check_%s.json' % TAG), 'w'), indent=1)
print('[EQCHECK] SUMMARY', json.dumps(summary))

# ---------------------------------------------------------------- review sheets
if DO_RENDER:
    K.setup_render()
    for o in bpy.data.objects:
        if o.type == 'MESH' and o.name not in KITM and o.name != 'Ground' and not any(o in [c for c, _ in e['parts']] for e in EQ.values()):
            o.hide_render = True
    def shot(name, vd, ctr=(0, 0, .93), orth=2.1, res=(200, 260), persp=None, ground=False):
        return K.shoot(os.path.join(OUT, 'cells', name + '.png'), res, vd, ctr, orth, ground=ground, persp=persp)
    VIEWS = [('3/4', (.55, -.80, .18)), ('back 3/4', (-.55, .80, .20))]
    FR_SHOW = [('idle', 0, '3/4', (.55, -.80, .18)), ('idle', 0, 'back', (-.55, .80, .20)), ('walk', 0, 'walk f0', (-1, .03, .10)),
               ('walk', 7, 'walk f7', (.95, -.3, .12)), ('run', 4, 'run f4', (-1, .03, .10)), ('attack_slash', 5, 'slash f5', (-.55, -.80, .18)),
               ('attack_crush', 8, 'crush f8', (.55, -.80, .18))]
    ZOOM = {'fullhelm': ((0, 0, 1.55), .9), 'medhelm': ((0, 0, 1.60), .8), 'hat': ((0, 0, 1.62), .9), 'amulet': ((0, 0, 1.25), 1.0),
            'gloves': ((0, 0, .95), 1.4), 'boots': ((0, 0, .30), 1.0)}
    for kind in WORN:
        if not any(k == kind for k, _ in EQ):
            continue
        eq_metal(METAL['iron'])
        rows = []
        for bt in ('A', 'B'):
            for build in ('slim', 'average', 'stout'):
                with_ = ['platebody'] if kind in ('cape',) and build == 'average' and bt == 'A' else []
                L = Look(bt, build, {}, [kind] + with_)
                cells = []
                for clip, fr, lab, vd in FR_SHOW:
                    apply_look(L, clip, fr)
                    ctr, orth = ZOOM.get(kind, ((0, 0, .93), 2.1))
                    if lab.startswith(('walk', 'run', 'slash', 'crush')):
                        ctr, orth = (ctr[0], ctr[1], max(ctr[2], .9)), max(orth, 1.9) if kind not in ('boots',) else 1.2
                    p = shot('%s_%s_%s_%s_%s%d' % (kind, bt, build, lab.replace(' ', '').replace('/', ''), clip, fr), vd, ctr, orth)
                    cells.append(K.cell(p, '%s %s %s' % (bt, build, lab), bg=[214, 214, 218]))
                rows.append({'title': 'Body %s, %s%s' % (bt, build, (' (over a platebody)' if with_ else '')), 'height': 250, 'cells': cells})
        wr = RESULTS['worn'].get(kind, {})
        K.compose(os.path.join(OUT, 'worn_%s.png' % kind), rows,
                  '%s %s on the v3.0 kit -- both bodies, slim / average / stout, idle + extreme frames  (fit check: %s of %s tests failing)' %
                  (TAG, kind, wr.get('failing', '?'), wr.get('tests', '?')))
    # held weapons + shields: one row per item, body A and B average, idle / walk / run / attack
    rows = []
    for kind in HELD:
        if (kind, 'A') not in EQ:
            continue
        eq_metal(METAL['iron'])
        cells = []
        for bt, build in (('A', 'average'), ('B', 'average'), ('A', 'stout')):
            shield = kind in ('round_shield', 'sqshield', 'kiteshield')
            L = Look(bt, build, {}, [], weapon=None if shield else kind, shield=kind if shield else None)
            for clip, fr, lab, vd in (FR_SHOW[:1] + FR_SHOW[2:5] if bt == 'A' and build == 'average' else FR_SHOW[:1]):
                apply_look(L, clip, fr)
                p = shot('held_%s_%s_%s_%s%d' % (kind, bt, build, lab.replace(' ', '').replace('/', ''), fr), vd, (0, 0, .95), 2.3)
                cells.append(K.cell(p, '%s %s %s' % (bt, build, lab), bg=[214, 214, 218]))
        hr = RESULTS['held'].get(kind, {})
        rows.append({'title': '%s  (fit check: %s of %s tests with the item inside the body)' % (kind, hr.get('failing', '?'), hr.get('tests', '?')),
                     'height': 250, 'cells': cells})
    K.compose(os.path.join(OUT, 'held_weapons_shields.png'), rows, '%s held weapons + shields on the v3.0 kit (EquipBuilder hold solved at idle f0)' % TAG)
print('[EQCHECK] DONE %.0fs' % (time.time() - t0))
