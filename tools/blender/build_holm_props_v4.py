"""Holm prop pack v4 (animated): beacon lever + beam, guide marker, fishing ripple, furnace glow, anvil sparks.

Usage: blender -b --python tools/blender/build_holm_props_v4.py [-- --render <dir>]
Outputs .studio-workspaces/holm-props-v4/candidates/{props.glb,props.blend,manifest.json,REPORT.md}.
One named root Empty per asset (runtime clones by root name). Blender Z-up is exported as glTF Y-up; 1 unit = 1 tile.
ANIMATION: object-transform clips only (no shape keys, no skins). Every clip is an NLA track named with the exact clip
name on each object it drives; the glTF exporter (NLA_TRACKS mode) merges same-named tracks into one glTF animation,
which three.js r128 AnimationMixer plays by name. Clips are sampled at 30 fps. Root nodes are never animated (identity),
so the runtime is free to place / rotate the root. Loop clips end on the same pose they start with.
COLOUR RULE (as v2/v3): colours are authored as the sRGB values we want to SEE (no linear conversion); emissive colour
carries the glow and Emission Strength is exactly 1.0 (runtime refuses KHR_materials_emissive_strength).
Deterministic: every random draw comes from a seeded random.Random.
"""
import bpy, bmesh, math, random, json, struct, hashlib, sys
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.studio-workspaces/holm-props-v4/candidates'
OUT.mkdir(parents=True, exist_ok=True)
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
RENDER = Path(argv[argv.index('--render') + 1]).resolve() if '--render' in argv else None
bpy.ops.wm.read_factory_settings(use_empty=True)
TAG = '[HOLM_PROPS_V4]'
FPS = 30
scene = bpy.context.scene
scene.render.fps = FPS; scene.render.fps_base = 1.0

# ---------------------------------------------------------------- materials (authored sRGB, used as-is)
PALETTE = {
    'iron':        (.15, .16, .14),     # = v3 forged iron
    'iron-worn':   (.29, .29, .27),     # rubbed edges, axle, collar
    'bronze':      (.58, .38, .17),     # lever arm + knob
    'marker-rim':  (.36, .21, .04),     # dark outline band on the guide gem
    'ripple':      (.84, .92, .97),     # = v2 pale foam
}
EMISSIVE = {   # name: (base sRGB, emissive sRGB, alpha). Emission strength is always exactly 1.0.
    'marker-gold':  ((1.0, .80, .14), (.30, .22, .02), 1.0),    # lit gem, small self-glow so it pops at dusk
    'beam-light':   ((1.0, .92, .62), (1.0, .88, .52), .25),    # translucent beacon cone (alpha blend)
    'flame-orange': ((.29, .14, .03), (.96, .46, .10), 1.0),    # = v2 flame-orange
    'flame-yellow': ((.30, .25, .09), (1.0, .84, .30), 1.0),    # = v2 flame-yellow
    'ember':        ((.22, .06, .02), (.74, .20, .04), 1.0),    # deep red-orange coal bed
}
MAT = {}
def make_mat(name, base, emit=None, alpha=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value = (*base, 1); bs.inputs['Roughness'].default_value = 1.0
    if 'Specular IOR Level' in bs.inputs: bs.inputs['Specular IOR Level'].default_value = .1
    if emit is not None:
        bs.inputs['Emission Color'].default_value = (*emit, 1); bs.inputs['Emission Strength'].default_value = 1.0
    if alpha < 1:
        bs.inputs['Alpha'].default_value = alpha
        if hasattr(m, 'surface_render_method'): m.surface_render_method = 'BLENDED'
        try: m.blend_method = 'BLEND'
        except Exception: pass
    m.diffuse_color = (*base, alpha); m.roughness = 1.0; m.metallic = 0
    MAT[name] = m
for k, v in PALETTE.items(): make_mat(k, v)
for k, (b, e, a) in EMISSIVE.items(): make_mat(k, b, e, a)
MAT_ORDER = list(PALETTE) + list(EMISSIVE)

# ---------------------------------------------------------------- mesh builder (v2 style)
class M:
    def __init__(s): s.v = []; s.f = []; s.mi = []
    def add(s, vs, fs, mats):
        k = len(s.v); s.v += [Vector(v) for v in vs]
        for n, f in enumerate(fs):
            s.f.append(tuple(k + i for i in f)); s.mi.append(mats[n] if isinstance(mats, (list, tuple)) else mats)
    def tris(s): return sum(len(f) - 2 for f in s.f)
    def loft(s, rings, side, cap0=None, cap1=None):
        n = len(rings[0]); k = len(s.v); vs = [p for r in rings for p in r]; fs = []; ms = []
        for j in range(len(rings) - 1):
            for i in range(n):
                fs.append((j*n+i, j*n+(i+1) % n, (j+1)*n+(i+1) % n, (j+1)*n+i))
                ms.append(side(j, i) if callable(side) else side)
        s.add(vs, fs, ms)
        if cap1: s.f.append(tuple(k + (len(rings)-1)*n + i for i in range(n))); s.mi.append(cap1)
        if cap0: s.f.append(tuple(k + i for i in reversed(range(n)))); s.mi.append(cap0)
        return k
    def pyramid(s, base, apex, mat, basemat=None):
        n = len(base); k = len(s.v); s.v += [Vector(p) for p in base] + [Vector(apex)]
        for i in range(n): s.f.append((k+i, k+(i+1) % n, k+n)); s.mi.append(mat(i) if callable(mat) else mat)
        if basemat: s.f.append(tuple(k + i for i in reversed(range(n)))); s.mi.append(basemat)
    def hull(s, pts, matfn):
        bm = bmesh.new()
        for p in pts: bm.verts.new(p)
        r = bmesh.ops.convex_hull(bm, input=list(bm.verts), use_existing_faces=False)
        junk = list(dict.fromkeys(g for g in r['geom_interior'] + r['geom_unused'] if isinstance(g, bmesh.types.BMVert)))
        if junk: bmesh.ops.delete(bm, geom=junk, context='VERTS')
        bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(2.5), verts=bm.verts[:], edges=bm.edges[:])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.verts.index_update()
        vs = [v.co.copy() for v in bm.verts]; fs = [tuple(v.index for v in f.verts) for f in bm.faces]
        ms = [matfn(f.normal.copy(), f.calc_center_median()) for f in bm.faces]
        bm.free(); s.add(vs, fs, ms)

def blob(c, s, seed, n=14, cuts=2, floor=None, flat_top=None, jit=(.84, 1.06), cut=(.58, .8)):
    """Irregular faceted polyhedron points: jittered fibonacci shell, planar cuts, optional floor (v1/v2)."""
    rng = random.Random(seed); pts = []
    for i in range(n):
        z = 1 - 2 * (i + .5) / n; r = math.sqrt(max(0, 1 - z * z)); a = i * 2.39996 + rng.uniform(-.35, .35)
        pts.append(Vector((r * math.cos(a), r * math.sin(a), z)) * rng.uniform(*jit))
    planes = []
    for _ in range(cuts):
        u = rng.uniform(-.25, .9); th = rng.uniform(0, math.tau); rr = math.sqrt(1 - u * u)
        planes.append((Vector((rr * math.cos(th), rr * math.sin(th), u)), rng.uniform(*cut)))
    if flat_top: planes.append((Vector((rng.uniform(-.2, .2), rng.uniform(-.2, .2), 1)).normalized(), flat_top))
    for nrm, off in planes:
        for p in pts:
            d = p.dot(nrm)
            if d > off: p -= nrm * (d - off)
    out = [Vector((c[0] + p.x * s[0], c[1] + p.y * s[1], c[2] + p.z * s[2])) for p in pts]
    if floor is not None:
        for p in out: p.z = max(p.z, floor)
    return out

def ring(r, z, n=8, rot=0., cx=0., cy=0., sx=1., sy=1.):
    return [Vector((cx + r * sx * math.cos(math.tau * i / n + rot), cy + r * sy * math.sin(math.tau * i / n + rot), z)) for i in range(n)]

def box(m, x0, x1, y0, y1, z0, z1, mat):
    vs = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    m.add(vs, [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)], mat)

def xprism(m, x0, x1, r, z, mat, n=6, y=0., capmat=None):
    """Prism along X (hub / axle), n-sided, centred on (y, z)."""
    rg = lambda x: [Vector((x, y + r * math.cos(math.tau * i / n + math.pi / n), z + r * math.sin(math.tau * i / n + math.pi / n))) for i in range(n)]
    m.loft([rg(x0), rg(x1)], mat, capmat or mat, capmat or mat)

# ---------------------------------------------------------------- scene objects
roots = {}; OBJS = {}; REST = {}
def new_root(name):
    r = bpy.data.objects.new(name, None); scene.collection.objects.link(r); roots[name] = r; return r
def new_obj(name, m, parent, loc=(0, 0, 0), rot=(0, 0, 0), open_surface=False, rot_mode='XYZ'):
    if m is None:
        ob = bpy.data.objects.new(name, None); ob.empty_display_size = .1
    else:
        me = bpy.data.meshes.new(name); me.from_pydata([tuple(v) for v in m.v], [], m.f)
        for poly, sname in zip(me.polygons, m.mi): poly.material_index = MAT_ORDER.index(sname)
        if not open_surface:
            bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free()
        used = sorted({p.material_index for p in me.polygons})
        for u in used: me.materials.append(MAT[MAT_ORDER[u]])
        for poly in me.polygons: poly.material_index = used.index(poly.material_index); poly.use_smooth = False
        me.validate(clean_customdata=False); me.update()
        ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob); ob.parent = parent
    ob.rotation_mode = rot_mode; ob.location = loc
    if rot_mode == 'QUATERNION': ob.rotation_quaternion = rot
    else: ob.rotation_euler = rot
    REST[ob.name] = (tuple(ob.location), tuple(ob.rotation_euler), tuple(ob.rotation_quaternion), tuple(ob.scale))
    OBJS[name] = ob; return ob
def apply_rest():
    for n, (l, e, q, s) in REST.items():
        ob = bpy.data.objects[n]; ob.location = l; ob.rotation_euler = e; ob.rotation_quaternion = q; ob.scale = s

# ---------------------------------------------------------------- clips
CLIPS = {}   # name: {'root', 'frames', 'loop', 'desc', 'tracks': [(ob, action)]}
def fcurves_of(act):
    try: return list(act.fcurves)
    except Exception:
        out = []
        for layer in act.layers:
            for st in layer.strips:
                for cb in st.channelbags: out += list(cb.fcurves)
        return out
def bake(clip, ob, fn, frames, interp='BEZIER'):
    """Key ob at each frame with fn(frame) -> {data_path: value}; push the action to an NLA track named `clip`."""
    ad = ob.animation_data_create(); ad.action = None
    for f in frames:
        vals = fn(f)
        for path, val in vals.items():
            setattr(ob, path, val); ob.keyframe_insert(data_path=path, frame=f)
    act = ad.action; act.name = f'{clip}|{ob.name}'
    for fc in fcurves_of(act):
        for kp in fc.keyframe_points: kp.interpolation = interp
    act.use_fake_user = True
    tr = ad.nla_tracks.new(); tr.name = clip
    tr.strips.new(clip, int(frames[0]), act)
    ad.action = None
    CLIPS[clip]['tracks'].append((ob, act))
def clip(name, root, seconds, loop, desc):
    CLIPS[name] = {'root': root, 'frames': round(seconds * FPS), 'loop': loop, 'desc': desc, 'tracks': []}
    return round(seconds * FPS)
ease = lambda t: t * t * (3 - 2 * t)

# ================================================================ 1. beacon-lever
R = new_root('beacon-lever'); rng = random.Random(4101)
pd = M()
pd.loft([ring(.2, 0, 8, math.pi / 8), ring(.2, .055, 8, math.pi / 8), ring(.155, .1, 8, math.pi / 8)],
        lambda j, i: 'iron' if j == 0 else ('iron-worn' if i % 2 else 'iron'), cap0='iron', cap1='iron')     # plinth
pd.loft([ring(.1, .1, 8), ring(.082, .45, 8, .02), ring(.072, .72, 8)],
        lambda j, i: 'iron-worn' if i % 4 == 1 else 'iron')                                                  # tapered column
pd.loft([ring(.095, .72, 8), ring(.098, .775, 8)], 'iron-worn', 'iron-worn', 'iron-worn')                 # collar
box(pd, -.085, .085, -.07, .07, .775, .81, 'iron')                                                          # head block
for sx in (-1, 1):                                                                                            # fork cheeks
    x0, x1 = sorted((sx * .045, sx * .075))
    pd.loft([[Vector(p) for p in ((x0, -.065, .81), (x1, -.065, .81), (x1, .065, .81), (x0, .065, .81))],
             [Vector(p) for p in ((x0, -.06, .93), (x1, -.06, .93), (x1, .045, .95), (x0, .045, .95))]],
            'iron', None, 'iron')
    pd.pyramid([Vector(p) for p in ((x0, -.06, .93), (x1, -.06, .93), (x1, .045, .95), (x0, .045, .95))],
               (sx * .06, -.01, .985), lambda i: 'iron-worn' if i % 2 else 'iron')                          # rounded cheek top
xprism(pd, -.092, .092, .016, .92, 'iron-worn', n=6)                                                          # axle
for sx in (-1, 1): xprism(pd, sx * .092, sx * .104, .026, .92, 'iron', n=6)                                   # axle nuts
box(pd, -.03, .03, .055, .085, .80, .86, 'iron-worn')                                                         # back stop block
pd.pyramid([Vector(p) for p in ((-.03, -.07, .79), (.03, -.07, .79), (.03, -.07, .83), (-.03, -.07, .83))],
           (0, -.1, .8), 'iron-worn')                                                                         # front catch lug
new_obj('beacon-lever_Pedestal', pd, R)
arm = M()
xprism(arm, -.038, .038, .036, 0, 'bronze', n=6)                                                              # hub
arm.loft([ring(.022, .02, 6, .3), ring(.019, .17, 6, .3), ring(.016, .29, 6, .3)], 'bronze')                  # rod
arm.loft([ring(.025, .285, 6, .3), ring(.025, .31, 6, .3)], 'iron-worn', 'iron-worn', 'iron-worn')           # ferrule
arm.hull(blob((0, 0, .352), (.052, .052, .058), 4102, n=14, cuts=0, jit=(.9, 1.04)), lambda nn, cc: 'bronze') # knob
UP_BACK, DOWN_FWD = math.radians(-32), math.radians(112)
arm_ob = new_obj('beacon-lever_Arm', arm, R, loc=(0, 0, .92), rot=(UP_BACK, 0, 0))
n = clip('Pull', 'beacon-lever', .9, False, 'arm swings from up-back to down-forward (once, eased with a small settle)')
PULL = [(0, UP_BACK), (4, UP_BACK - math.radians(5)), (17, DOWN_FWD + math.radians(8)), (22, DOWN_FWD - math.radians(3)), (n, DOWN_FWD)]
bake('Pull', arm_ob, lambda f: {'rotation_euler': (dict(PULL)[f], 0, 0)}, [f for f, _ in PULL])
n = clip('Reset', 'beacon-lever', .9, False, 'reverse of Pull: arm returns from down-forward to up-back (once)')
RESET = [(0, DOWN_FWD), (5, DOWN_FWD + math.radians(4)), (19, UP_BACK - math.radians(6)), (24, UP_BACK + math.radians(2)), (n, UP_BACK)]
bake('Reset', arm_ob, lambda f: {'rotation_euler': (dict(RESET)[f], 0, 0)}, [f for f, _ in RESET])

# ================================================================ 2. beacon-beam
R = new_root('beacon-beam')
bm_ = M()
L, RAD = 12., 1.2
for rr, mat in ((RAD, 'beam-light'), (RAD * .5, 'beam-light')):     # outer soft cone + denser inner core
    base = [Vector((L if rr == RAD else L * .9, rr * math.cos(math.tau * i / 8 + math.pi / 8), rr * math.sin(math.tau * i / 8 + math.pi / 8)))
            for i in range(8)]
    bm_.pyramid(list(reversed(base)), (0, 0, 0), mat)
beam_ob = new_obj('beacon-beam_Cone', bm_, R, open_surface=True)
n = clip('Sweep', 'beacon-beam', 6.0, True, 'cone turns 360 degrees about +Y (loop, constant speed)')
bake('Sweep', beam_ob, lambda f: {'rotation_euler': (0, 0, math.tau * f / n)}, list(range(0, n + 1, 15)), interp='LINEAR')

# ================================================================ 3. guide-marker
R = new_root('guide-marker')
gm = M()
HW, GZ, TOPZ = .2, .27, .6          # head half-width (diamond), girdle height, total height; tip at z=0
head = [Vector((HW * math.cos(math.tau * i / 4), HW * math.sin(math.tau * i / 4), GZ)) for i in range(4)]
gm.pyramid(head, (0, 0, 0), 'marker-gold')                                                          # downward arrow head
rim0 = [p * 1.09 + Vector((0, 0, GZ * -0.09 - .012)) for p in head]
rim_lo = [Vector((p.x * 1.1, p.y * 1.1, GZ - .018)) for p in head]
rim_hi = [Vector((p.x * 1.1, p.y * 1.1, GZ + .045)) for p in head]
rim_top = [Vector((p.x * .62, p.y * .62, GZ + .07)) for p in head]
gm.loft([head, rim_lo, rim_hi, rim_top], lambda j, i: 'marker-rim')                                  # dark outline rim / collar
SW = .085
shaft = lambda z, s=1.: [Vector((SW * s * math.cos(math.tau * i / 4), SW * s * math.sin(math.tau * i / 4), z)) for i in range(4)]
gm.loft([shaft(GZ + .06), shaft(TOPZ - .06), shaft(TOPZ - .03, 1.25)], lambda j, i: 'marker-gold' if j == 0 else 'marker-rim')
gm.pyramid(shaft(TOPZ - .03, 1.25), (0, 0, TOPZ), 'marker-gold')                                    # faceted top cap
bob = new_obj('guide-marker_Bob', None, R)
gem = new_obj('guide-marker_Gem', gm, bob)
n = clip('Hover', 'guide-marker', 1.2, True, 'bob: tip rises 0.25 and returns (sine, loop); drives guide-marker_Bob')
bake('Hover', bob, lambda f: {'location': (0, 0, .125 - .125 * math.cos(math.tau * f / n))}, list(range(0, n + 1, 3)))
n = clip('Spin', 'guide-marker', 2.0, True, 'turns 360 degrees about +Y (loop, constant); drives guide-marker_Gem')
bake('Spin', gem, lambda f: {'rotation_euler': (0, 0, math.tau * f / n)}, list(range(0, n + 1, 15)), interp='LINEAR')

# ================================================================ 4. fishing-ripple-anim
R = new_root('fishing-ripple-anim')
def ripple_ring(seed, rad=.4, width=.075, crest=.032):
    m = M(); rg = random.Random(seed)
    gaps = sorted(rg.uniform(0, math.tau) for _ in range(rg.choice((1, 2, 2, 3))))
    spans = []
    a0 = gaps[0]
    for i, g in enumerate(gaps):
        nxt = gaps[(i + 1) % len(gaps)] + (math.tau if i == len(gaps) - 1 else 0)
        spans.append((g + .22, nxt - .22))
    for a_from, a_to in spans:
        seg = max(4, int((a_to - a_from) * rad * 22))
        ins, mids, outs = [], [], []
        for i in range(seg + 1):
            t = i / seg; a = a_from + (a_to - a_from) * t
            taper = .25 + .75 * math.sin(math.pi * t) ** .6
            rj = rad * (1 + rg.uniform(-.04, .04)); w = width * taper
            d = Vector((math.cos(a), math.sin(a), 0))
            ins.append(d * (rj - w / 2) + Vector((0, 0, .004))); outs.append(d * (rj + w / 2) + Vector((0, 0, .004)))
            mids.append(d * rj + Vector((0, 0, .004 + crest * taper)))
        k = len(m.v); m.v += ins + mids + outs; Ln = seg + 1
        for i in range(seg):
            m.f.append((k + i, k + i + 1, k + Ln + i + 1, k + Ln + i)); m.mi.append('ripple')
            m.f.append((k + Ln + i, k + Ln + i + 1, k + 2 * Ln + i + 1, k + 2 * Ln + i)); m.mi.append('ripple')
    return m
n = clip('Ripple', 'fishing-ripple-anim', 1.6, True,
         '3 rings rise from under the surface, spread outward, flatten and sink back (staggered 1/3 cycle); 3 bubbles bob')
def ring_state(u):
    """u in [0,1): one ripple lifetime. Returns (xy scale, crest z-scale, z offset). Hidden below y=0 around u=0."""
    s = .22 + 1.0 * u
    rise = min(1, u / .12); fall = max(0, min(1, (u - .72) / .22))
    h = max(.05, math.sin(math.pi * min(1, u / .8)) ** .7) * (1 - fall) + .05 * fall
    z = -.03 * (1 - ease(rise)) - .03 * ease(fall)
    return s, max(h, .05), z
for i in range(3):
    rob = new_obj(f'fishing-ripple-anim_Ring{i + 1}', ripple_ring(4400 + i), R, open_surface=True)
    ph = i / 3
    def rfn(f, ph=ph):
        s, h, z = ring_state(((f / n) + ph) % 1.0)
        return {'location': (0, 0, z), 'scale': (s, s, h)}
    bake('Ripple', rob, rfn, list(range(0, n + 1, 2)))
    st = rfn(0); rob.location = st['location']; rob.scale = st['scale']
    REST[rob.name] = (tuple(rob.location), (0, 0, 0), (1, 0, 0, 0), tuple(rob.scale))
for i, (x, y, sz) in enumerate([(.03, -.02, .05), (-.09, .06, .038), (.1, .08, .032)]):
    bb = M(); bb.hull(blob((0, 0, sz * .45), (sz, sz * .9, sz), 4450 + i, n=8, cuts=1, floor=0.), lambda nn, cc: 'ripple')
    bob_ob = new_obj(f'fishing-ripple-anim_Bubble{i + 1}', bb, R, loc=(x, y, 0))
    ph = [0, .41, .7][i]
    def bfn(f, x=x, y=y, ph=ph):
        u = ((f / n) + ph) % 1.0; w = math.sin(math.tau * u)
        return {'location': (x, y, -.02 + .03 * w), 'scale': (1 + .15 * w, 1 + .15 * w, 1 + .3 * w)}
    bake('Ripple', bob_ob, bfn, list(range(0, n + 1, 4)))

# ================================================================ 5. furnace-glow
R = new_root('furnace-glow'); rng = random.Random(4501)
bed = M()
bed.hull(blob((0, 0, .02), (.31, .17, .07), 4502, n=18, cuts=2, floor=0., flat_top=.62), lambda nn, cc: 'ember')
for i in range(6):                                                                  # dark coal lumps on the glowing bed
    a = math.tau * i / 6 + rng.uniform(-.3, .3); rr = rng.uniform(.1, .22)
    p = (math.cos(a) * rr * 1.2, math.sin(a) * rr * .55, .05)
    bed.hull(blob(p, (.05, .04, .035), 4510 + i, n=8, cuts=1, floor=.02), lambda nn, cc: 'iron')
for i in range(7):                                                                  # hot glowing chips
    p = (rng.uniform(-.24, .24), rng.uniform(-.12, .1), .065)
    bed.hull(blob(p, (.028, .024, .02), 4520 + i, n=6, cuts=0, floor=.04), lambda nn, cc: 'flame-orange')
new_obj('furnace-glow_Bed', bed, R)
def tongue(r, h, lean, twist, mat, seed):
    rg = random.Random(seed); t = M(); rings = []
    for j, (f, rs) in enumerate([(0, 1.), (.4, .74), (.72, .42)]):
        ctr = Vector((0, 0, h * f)) + Vector(lean) * (f ** 1.4) * h
        rings.append([ctr + Vector((math.cos(math.tau * i / 5 + twist * j), math.sin(math.tau * i / 5 + twist * j), 0)) * r * rs * rg.uniform(.85, 1.12)
                      for i in range(5)])
    t.loft(rings, mat, cap0=mat)
    t.pyramid(rings[-1], Vector((0, 0, h)) + Vector(lean) * h * 1.15, mat)
    return t
n = clip('Flicker', 'furnace-glow', 1.0, True, 'flame tongues stretch, squash and sway irregularly (loop)')
FL = [(-.2, .01, .30, 'flame-orange'), (-.07, -.03, .38, 'flame-orange'), (.08, .02, .34, 'flame-orange'),
      (.21, -.01, .27, 'flame-orange'), (-.12, -.01, .44, 'flame-yellow'), (.02, 0., .5, 'flame-yellow'), (.14, -.02, .4, 'flame-yellow')]
for i, (x, y, h, mat) in enumerate(FL):
    lean = (x * .5 + rng.uniform(-.05, .05), rng.uniform(-.06, .02), 0)
    r = .075 if mat == 'flame-orange' else .055
    ob = new_obj(f'furnace-glow_Flame{i + 1}', tongue(r, h, lean, .5 if i % 2 else -.5, mat, 4530 + i), R, loc=(x, y, .04))
    kr = random.Random(4540 + i); keys = list(range(0, n + 1, 5)); vals = {}
    for f in keys[:-1]:
        vals[f] = (kr.uniform(.72, 1.22), kr.uniform(.86, 1.1), kr.uniform(-.14, .14), kr.uniform(-.1, .1))
    vals[keys[-1]] = vals[0]
    bake('Flicker', ob, lambda f, x=x, y=y, vals=vals: {'scale': (vals[f][1], vals[f][1], vals[f][0]),
                                                         'rotation_euler': (vals[f][2], vals[f][3], 0)}, keys)

# ================================================================ 6. anvil-sparks
R = new_root('anvil-sparks'); rng = random.Random(4601)
n = clip('Burst', 'anvil-sparks', .5, False, '12 spark chips fly outward on falling arcs and shrink to zero (once); hidden at rest')
G = -5.5
for i in range(12):
    sp = M(); Lc, W = rng.uniform(.045, .065), rng.uniform(.016, .022)
    sp.add([(Lc, 0, 0), (-Lc * .6, 0, 0), (0, W, 0), (0, -W, 0), (0, 0, W), (0, 0, -W)],
           [(0, 2, 4), (0, 4, 3), (0, 3, 5), (0, 5, 2), (1, 4, 2), (1, 3, 4), (1, 5, 3), (1, 2, 5)], 'flame-yellow')
    a = math.tau * i / 12 + rng.uniform(-.25, .25); hs = rng.uniform(.9, 1.8); vz = rng.uniform(.5, 1.6)
    v0 = Vector((math.cos(a) * hs, math.sin(a) * hs, vz)); p0 = Vector((rng.uniform(-.02, .02), rng.uniform(-.02, .02), .01))
    life = rng.uniform(.75, 1.0)          # fraction of the clip before this chip is gone
    ob = new_obj(f'anvil-sparks_Spark{i + 1:02d}', sp, R, loc=tuple(p0), rot=(1, 0, 0, 0), rot_mode='QUATERNION')
    prev = [Quaternion()]
    def sfn(f, v0=v0, p0=p0, life=life, prev=prev):
        t = f / FPS; u = min(1, (f / n) / life)
        p = p0 + v0 * t + Vector((0, 0, .5 * G * t * t))
        vel = v0 + Vector((0, 0, G * t)); q = vel.normalized().to_track_quat('X', 'Z')
        if q.dot(prev[0]) < 0: q.negate()
        prev[0] = q
        s = max(0., 1 - u ** 1.6) * (1 + .6 * max(0, 1 - f / 4))        # flash big, then shrink to 0
        return {'location': tuple(p), 'rotation_quaternion': tuple(q), 'scale': (s * (1 + .8 * min(1, vel.length / 2)), s, s)}
    bake('Burst', ob, sfn, list(range(0, n + 1)))
    REST[ob.name] = (tuple(p0), (0, 0, 0), (1, 0, 0, 0), (0., 0., 0.))   # invisible until Burst plays

# ---------------------------------------------------------------- rest pose, export
for ob in scene.objects:
    if ob.animation_data:
        for tr in ob.animation_data.nla_tracks: tr.mute = True
apply_rest(); scene.frame_set(0); apply_rest(); bpy.context.view_layer.update()

def tri_count(r): return sum(len(p.vertices) - 2 for x in r.children_recursive if x.type == 'MESH' for p in x.data.polygons)
def world_pts(r): return [x.matrix_world @ v.co for x in r.children_recursive if x.type == 'MESH' for v in x.data.vertices]
def to_bounds(pts):
    lo = [min(p[i] for p in pts) for i in range(3)]; hi = [max(p[i] for p in pts) for i in range(3)]
    return {'min': [round(lo[0], 4), round(lo[2], 4), round(-hi[1], 4)], 'max': [round(hi[0], 4), round(hi[2], 4), round(-lo[1], 4)]}
def pose(clip_name, frame):
    for ob, act in CLIPS[clip_name]['tracks']:
        ad = ob.animation_data; ad.action = act
        if hasattr(ad, 'action_slot') and ad.action_slot is None and len(act.slots): ad.action_slot = act.slots[0]
    scene.frame_set(frame)
def unpose():
    for c in CLIPS.values():
        for ob, _ in c['tracks']: ob.animation_data.action = None
    apply_rest(); bpy.context.view_layer.update()

rest_bounds = {nm: to_bounds(world_pts(r)) if nm != 'anvil-sparks' else None for nm, r in roots.items()}
anim_pts = {nm: [] for nm in roots}
for cn, c in CLIPS.items():
    for f in range(0, c['frames'] + 1):
        pose(cn, f); anim_pts[c['root']] += world_pts(roots[c['root']])
    unpose()
for nm, r in roots.items():
    anim_pts[nm] += world_pts(r) if nm != 'anvil-sparks' else []
anim_bounds = {nm: to_bounds(p) for nm, p in anim_pts.items()}
if rest_bounds['anvil-sparks'] is None: rest_bounds['anvil-sparks'] = anim_bounds['anvil-sparks']
scene.frame_set(0); unpose()

bpy.ops.object.select_all(action='DESELECT')
for r in roots.values():
    r.select_set(True)
    for x in r.children_recursive: x.select_set(True)
glb = OUT / 'props.glb'
bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
                          export_materials='EXPORT', export_animations=True, export_animation_mode='NLA_TRACKS',
                          export_force_sampling=True, export_frame_step=1, export_anim_slide_to_zero=True,
                          export_optimize_animation_size=False, export_morph=False, export_skins=False)
raw = glb.read_bytes(); jslen = struct.unpack_from('<I', raw, 12)[0]; doc = json.loads(raw[20:20 + jslen])
sha = hashlib.sha256(raw).hexdigest()
nodes = doc['nodes']; top_nodes = doc['scenes'][0]['nodes']
glb_roots = {nodes[i]['name']: i for i in top_nodes}
owner = {}
def walk(ni, root):
    owner[ni] = root
    for c in nodes[ni].get('children', []): walk(c, root)
for nm, ni in glb_roots.items(): walk(ni, nm)
def glb_tris(ni):
    nd = nodes[ni]; t = 0
    if 'mesh' in nd:
        for pr in doc['meshes'][nd['mesh']]['primitives']: t += doc['accessors'][pr['indices']]['count'] // 3
    return t + sum(glb_tris(c) for c in nd.get('children', []))
# ---- material checks
assert len(doc.get('materials', [])) <= 10, len(doc['materials'])
assert not doc.get('images') and not doc.get('textures'), 'no image textures allowed'
assert 'KHR_materials_emissive_strength' not in doc.get('extensionsUsed', []), 'emissive strength must stay exactly 1.0'
for gm_ in doc['materials']:
    nm = gm_['name']; got = gm_['pbrMetallicRoughness']['baseColorFactor']
    base, emit, alpha = (PALETTE[nm], None, 1.0) if nm in PALETTE else EMISSIVE[nm]
    assert all(abs(a - b) < 1e-4 for a, b in zip(got[:3], base)), (nm, got, base)
    assert abs(got[3] - alpha) < 1e-4, (nm, got)
    if emit: assert all(abs(a - b) < 1e-4 for a, b in zip(gm_['emissiveFactor'], emit)), gm_
    else: assert not any(gm_.get('emissiveFactor', [0, 0, 0])), gm_
    if alpha < 1: assert gm_.get('alphaMode') == 'BLEND', gm_
# ---- animation checks (straight from the GLB)
glb_clips = {}
for an in doc.get('animations', []):
    dur = max(doc['accessors'][s['input']]['max'][0] for s in an['samplers'])
    t0 = min(doc['accessors'][s['input']]['min'][0] for s in an['samplers'])
    targets = {(nodes[ch['target']['node']]['name'], ch['target']['path']) for ch in an['channels']}
    rts = {owner[ch['target']['node']] for ch in an['channels']}
    glb_clips[an['name']] = {'duration': dur, 'start': t0, 'channels': sorted(targets), 'roots': sorted(rts)}
for cn, c in CLIPS.items():
    assert cn in glb_clips, (cn, list(glb_clips))
    g = glb_clips[cn]
    assert g['duration'] > 0 and abs(g['start']) < 1e-4, (cn, g)
    assert abs(g['duration'] - c['frames'] / FPS) < .02, (cn, g['duration'], c['frames'] / FPS)
    assert g['roots'] == [c['root']], (cn, g['roots'])
    assert all(nm != c['root'] for nm, _ in g['channels']), ('root node must stay un-animated', cn)
assert set(glb_clips) == set(CLIPS), (sorted(glb_clips), sorted(CLIPS))
for nm, ni in glb_roots.items():
    nd = nodes[ni]; assert not nd.get('translation') and not nd.get('rotation') and not nd.get('scale'), nd
# arm pivot is its own node sitting on the axle
arm_node = next(nd for nd in nodes if nd['name'] == 'beacon-lever_Arm')
assert abs(arm_node['translation'][1] - .92) < 1e-4, arm_node

manifest = {'schema': 1, 'status': 'candidate-not-visual-or-runtime-accepted', 'axes': 'glTF Y-up, 1 unit = tile',
            'colour': 'material colours are authored sRGB, drawn as-is (no linear conversion); emissive strength exactly 1.0',
            'animation': 'object-transform clips (no morph targets / skins), sampled 30 fps, played by name via THREE.AnimationMixer; '
                         'root nodes are never animated',
            'references': ['.studio-workspaces/holm-props-v2 (fishing-ripple, campfire flames)',
                           'tools/blender/build_holm_props_v3.py (iron colours)'],
            'blend': 'props.blend', 'file': 'props.glb', 'sha256': sha, 'assets': []}
HABITAT = {
    'beacon-lever': ('Bronze lighthouse lever on an iron pedestal (1.2 tall); runtime plays Pull when used, Reset to re-arm',
                     'ground centre of the pedestal; arm pivot = child node beacon-lever_Arm at y 0.92 (axle, rotates about X)'),
    'beacon-beam': ('Translucent pale-gold beacon light cone (alpha 0.25 blend, emissive 1.0), 12 long, pointing +X; '
                    'runtime places the root at the lamp and plays Sweep', 'cone apex (the lamp)'),
    'guide-marker': ('Tutorial guide marker floating over the next objective; play Hover and Spin together',
                     'arrow tip at rest (Hover lifts it 0..0.25); runtime sets the float height on the root'),
    'fishing-ripple-anim': ('Animated fishing spot on the water surface (y=0); rings emerge from and sink below y=0, so the water '
                            'surface hides them at the ends of their life', 'water-surface centre'),
    'furnace-glow': ('Glowing ember bed + flame tongues inserted in a furnace / forge mouth (0.6 wide); front = +Z',
                     'ground (hearth floor) centre'),
    'anvil-sparks': ('Spark burst for an anvil strike; invisible at rest (scale 0), play Burst once per hammer blow',
                     'strike point on the anvil face'),
}
total = 0; rows = []
for nm, r in roots.items():
    tris = tri_count(r); meshes = [x for x in r.children_recursive if x.type == 'MESH']
    mats = sorted({m.name for x in meshes for m in x.data.materials})
    gt = glb_tris(glb_roots[nm]); assert gt == tris, (nm, gt, tris)
    total += tris
    cl = [{'name': cn, 'duration': round(glb_clips[cn]['duration'], 4), 'loop': c['loop'],
           'loopMode': 'LoopRepeat' if c['loop'] else 'LoopOnce (clampWhenFinished)', 'frames': c['frames'] + 1,
           'drives': sorted({a for a, _ in glb_clips[cn]['channels']}),
           'channels': sorted({f'{a}.{p}' for a, p in glb_clips[cn]['channels']}), 'description': c['desc']}
          for cn, c in CLIPS.items() if c['root'] == nm]
    manifest['assets'].append({'name': nm, 'root': nm, 'file': glb.name, 'habitat': HABITAT[nm][0], 'pivot': HABITAT[nm][1],
                               'triangles': tris, 'materials': len(mats), 'materialNames': mats, 'meshes': len(meshes),
                               'bounds': rest_bounds[nm], 'animatedBounds': anim_bounds[nm], 'clips': cl,
                               'groundMinY': rest_bounds[nm]['min'][1], 'sha256': sha})
    rows.append((nm, tris, rest_bounds[nm], anim_bounds[nm], cl))
    print(TAG, nm, tris, 'tris', mats, [(c['name'], c['duration']) for c in cl])
manifest['totals'] = {'triangles': total, 'materials': len(doc['materials']), 'assets': len(roots), 'clips': len(glb_clips),
                      'budget': {'triangles': 2500, 'materials': 10}}
assert total <= 2500, total
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'props.blend'))
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf8')
print(TAG, 'EXPORT PASS', total, 'tris', len(doc['materials']), 'materials', len(glb_clips), 'clips sha256', sha)

# ---------------------------------------------------------------- proof renders (presentation only; after the save)
if RENDER:
    import numpy as np
    RENDER.mkdir(parents=True, exist_ok=True)
    for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
        try: scene.render.engine = eng; break
        except TypeError: pass
    vts = [i.identifier for i in scene.view_settings.bl_rna.properties['view_transform'].enum_items]
    scene.view_settings.view_transform = 'Raw' if 'Raw' in vts else 'Standard'
    scene.world = bpy.data.worlds.new('Studio'); scene.world.use_nodes = True
    bgn = next(nd for nd in scene.world.node_tree.nodes if nd.type == 'BACKGROUND')
    bgn.inputs[0].default_value = (.62, .7, .8, 1); bgn.inputs[1].default_value = .45
    def flat(name, rgb, emit=False):
        m = bpy.data.materials.new(name); m.use_nodes = True
        bs = next(nd for nd in m.node_tree.nodes if nd.type == 'BSDF_PRINCIPLED')
        bs.inputs['Base Color'].default_value = (*rgb, 1); bs.inputs['Roughness'].default_value = 1
        if emit: bs.inputs['Emission Color'].default_value = (*rgb, 1); bs.inputs['Emission Strength'].default_value = 1
        return m
    ground_m = flat('ground', (.36, .46, .2)); cap_m = flat('capsule', (.55, .62, .75)); ink = flat('label', (.06, .07, .05), True)
    water_m = flat('water', (.22, .4, .5)); stone_m = flat('stone', (.3, .29, .27)); soot_m = flat('soot', (.07, .065, .06))
    bpy.ops.mesh.primitive_plane_add(size=600, location=(100, 0, 0)); bpy.context.object.data.materials.append(ground_m)
    sun = bpy.data.objects.new('Key', bpy.data.lights.new('Key', 'SUN')); sun.data.energy = 1.05; sun.data.angle = .08
    sun.rotation_euler = (math.radians(48), 0, math.radians(-38)); scene.collection.objects.link(sun)
    fill = bpy.data.objects.new('Fill', bpy.data.lights.new('Fill', 'SUN')); fill.data.energy = .25
    fill.rotation_euler = (math.radians(65), 0, math.radians(150)); scene.collection.objects.link(fill)
    def prim(kind, loc, scale, mat, **kw):
        getattr(bpy.ops.mesh, 'primitive_' + kind + '_add')(location=loc, **kw); o = bpy.context.object
        o.scale = scale; o.data.materials.append(mat); return o
    def capsule(x, y):
        prim('cylinder', (x, y, .95), (1, 1, 1), cap_m, radius=.24, depth=1.42, vertices=16)
        for z in (.24, 1.66): prim('uv_sphere', (x, y, z), (1, 1, 1), cap_m, radius=.24, segments=16, ring_count=8)
    def water(x, y, s, z=0.): prim('plane', (x, y, z), (1, 1, 1), water_m, size=s)
    def label(txt, x, y, size=.17, parent=None, z=.005):
        cu = bpy.data.curves.new('lbl', 'FONT'); cu.body = txt; cu.size = size; cu.align_x = 'CENTER'
        o = bpy.data.objects.new('lbl', cu); o.location = (x, y, z); cu.materials.append(ink); scene.collection.objects.link(o)
        if parent: o.parent = parent
        return o
    def cam(loc, tgt, ortho=None, lens=50):
        c = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam')); scene.collection.objects.link(c); c.location = loc
        c.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        if ortho: c.data.type = 'ORTHO'; c.data.ortho_scale = ortho
        else: c.data.lens = lens
        c.data.clip_start = .05; scene.camera = c
        for oc in scene.objects:
            if 'caption' in oc.keys(): bpy.data.objects[oc['caption']].hide_render = True
        # caption in the lower-left corner, parented to the camera
        half = (ortho / 2) if ortho else (18 / lens)
        cap = label('', -half * .95, -half * .9, size=half * .085, parent=c, z=-1.0); cap.data.align_x = 'LEFT'
        c['caption'] = cap.name
        return c
    def shot(path, w, h, caption=None):
        if caption is not None: bpy.data.objects[scene.camera['caption']].data.body = caption
        scene.render.resolution_x = w; scene.render.resolution_y = h; scene.render.resolution_percentage = 100
        scene.render.filepath = str(path); bpy.ops.render.render(write_still=True)
    def place(nm, loc, rotz=0.): roots[nm].location = loc; roots[nm].rotation_euler = (0, 0, rotz)
    for nm in roots: place(nm, (0, 0, -80))
    # ---- lineup: capsule, lever, marker (floating), furnace (in a mouth), sparks mid-burst, ripple on water, beam
    capsule(0, 0); label('1.9 capsule', 0, -.95)
    place('beacon-lever', (1.0, 0, 0)); label('beacon-lever', 1.0, -.95)
    place('guide-marker', (2.1, 0, 1.2)); label('guide-marker', 2.1, -.95); prim('cube', (2.1, 0, .25), (.25, .25, .25), stone_m)
    place('furnace-glow', (3.4, 0, .1))
    prim('cube', (3.4, .28, .45), (.5, .12, .45), soot_m); prim('cube', (3.4, 0, .05), (.5, .4, .05), stone_m)
    label('furnace-glow', 3.4, -.95)
    place('anvil-sparks', (4.6, 0, .55)); prim('cube', (4.6, 0, .27), (.28, .14, .27), soot_m); label('anvil-sparks', 4.6, -.95)
    place('fishing-ripple-anim', (5.9, 0, .004)); water(5.9, 0, 1.4, .003); label('fishing-ripple-anim', 5.9, -.95, .14)
    place('beacon-beam', (7.0, .6, 1.3), math.radians(70)); prim('cylinder', (7.0, .6, .65), (1, 1, 1), stone_m, radius=.12, depth=1.3, vertices=8)
    label('beacon-beam', 7.0, -.95)
    pose('Burst', 5); pose('Ripple', 10); pose('Flicker', 0)
    cam((4.2, -12, 5.2), (3.9, .6, .75), ortho=8.6); shot(RENDER / 'lineup.png', 1800, 900, 'lineup (sparks at Burst 0.17 s, ripple at 0.33 s)')
    unpose()
    for nm in roots: place(nm, (0, 0, -80))
    # ---- per-clip frames (3 each)
    SETS = {
        'beacon-lever': ((40, 0, 0), lambda o: cam((o[0] + 1.75, o[1] - .9, 1.2), (o[0], o[1] - .1, .8), lens=48)),
        'beacon-beam': ((80, 0, 1.4), lambda o: cam((o[0] + 3, o[1] - 17, 17), (o[0], o[1], 0), lens=30)),
        'guide-marker': ((120, 0, .9), lambda o: cam((o[0] + .8, o[1] - 2.3, 1.6), (o[0], o[1], 1.2), lens=42)),
        'fishing-ripple-anim': ((160, 0, .004), lambda o: cam((o[0] + .6, o[1] - 1.5, 1.35), (o[0], o[1], 0), lens=42)),
        'furnace-glow': ((200, 0, .1), lambda o: cam((o[0] + .45, o[1] - 1.35, .75), (o[0], o[1], .3), lens=42)),
        'anvil-sparks': ((240, 0, .55), lambda o: cam((o[0] + .6, o[1] - 1.9, 1.3), (o[0], o[1], .45), lens=38)),
    }
    for nm, (o, _) in SETS.items(): place(nm, o)
    o = SETS['beacon-beam'][0]; prim('cylinder', (o[0], o[1], .7), (1, 1, 1), stone_m, radius=.15, depth=1.4, vertices=8); capsule(o[0] + 2.5, o[1] - 1.5)
    o = SETS['guide-marker'][0]; prim('cube', (o[0], o[1], .2), (.3, .3, .2), stone_m); capsule(o[0] - .8, o[1] + .5)
    o = SETS['fishing-ripple-anim'][0]; water(o[0], o[1], 2.4, .003)
    o = SETS['furnace-glow'][0]
    prim('cube', (o[0], o[1] + .35, .45), (.6, .1, .45), soot_m); prim('cube', (o[0], o[1], .05), (.6, .45, .05), stone_m)
    for sx in (-1, 1): prim('cube', (o[0] + sx * .5, o[1], .45), (.1, .45, .45), stone_m)
    o = SETS['anvil-sparks'][0]; prim('cube', (o[0], o[1], .27), (.3, .14, .27), soot_m); prim('cube', (o[0] + .1, o[1], .52), (.42, .12, .03), stone_m)
    FRAMES = {'Pull': (0, 13, 27), 'Reset': (0, 13, 27), 'Sweep': (0, 60, 120), 'Hover': (0, 9, 18), 'Spin': (0, 8, 16),
              'Ripple': (0, 8, 16), 'Flicker': (0, 10, 20), 'Burst': (2, 7, 12)}
    strips = {}
    for cn, c in CLIPS.items():
        o, mk = SETS[c['root']]; mk(o); imgs = []
        for k, f in enumerate(FRAMES[cn]):
            pose(cn, f); p = RENDER / f'{cn}_{k + 1}.png'
            shot(p, 560, 560, f'{c["root"]}  {cn}  t={f / FPS:.2f}s / {c["frames"] / FPS:.1f}s'); imgs.append(p)
            unpose()
        strips[cn] = imgs
    def px(p):
        im = bpy.data.images.load(str(p)); a = np.empty(im.size[0] * im.size[1] * 4, dtype=np.float32); im.pixels.foreach_get(a)
        return a.reshape(im.size[1], im.size[0], 4)
    # sheet: lineup across the top (downscaled 2x), then 4 rows x 2 clip strips of 3 frames (pixel rows run bottom-up)
    Wd = 560 * 6; lin = px(RENDER / 'lineup.png')[::1, ::1]
    rows_n = 4; sheet = np.ones((560 * rows_n + 900, Wd, 4), dtype=np.float32)
    sheet[560 * rows_n:, (Wd - 1800) // 2:(Wd - 1800) // 2 + 1800] = lin
    order = list(CLIPS)
    for idx, cn in enumerate(order):
        rr, cc = divmod(idx, 2); y0 = 560 * (rows_n - 1 - rr)
        for k, p in enumerate(strips[cn]):
            x0 = cc * 1680 + k * 560; sheet[y0:y0 + 560, x0:x0 + 560] = px(p)
    im = bpy.data.images.new('sheet', Wd, sheet.shape[0]); im.pixels.foreach_set(sheet.ravel())
    im.filepath_raw = str(RENDER / 'sheet.png'); im.file_format = 'PNG'; im.save()
    print(TAG, 'renders ->', RENDER)

# ---------------------------------------------------------------- validation: re-import the GLB in a clean scene
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps = FPS
bpy.ops.import_scene.gltf(filepath=str(glb))
acts = {a.name: a for a in bpy.data.actions}
VALID = []
for cn, c in CLIPS.items():
    hits = [a for nm_, a in acts.items() if nm_ == cn or nm_.startswith(cn + '_') or nm_.startswith(cn + '|') or nm_.startswith(cn + '.')]
    assert hits, (cn, sorted(acts))
    f0 = min(a.frame_range[0] for a in hits); f1 = max(a.frame_range[1] for a in hits)
    dur = (f1 - f0) / FPS
    assert dur > 0, (cn, f0, f1)
    VALID.append((cn, len(hits), dur))
    print(TAG, 'reimport', cn, [a.name for a in hits], 'duration %.3f s' % dur)
imported_roots = {o.name for o in bpy.data.objects if o.parent is None}
for nm in {c["root"] for c in CLIPS.values()}: assert nm in imported_roots, (nm, imported_roots)
print(TAG, 'REIMPORT PASS', len(VALID), 'clips')

# ---------------------------------------------------------------- report
SELF_REVIEW = '''1. Reads well: lever swing (up-back -> down-forward on its axle), flicker, spark burst and beam sweep are unmistakable in
   the frame strips; the furnace glow and sparks keep full colour under the Raw view (emissive 1.0, no extension).
2. Weaker: guide-marker Spin is 4-fold symmetric, so it reads as a glint more than a turn; ripple fade relies on the water
   plane at y=0 hiding the sunk rings (would pop on a translucent/absent water surface); beam alpha sorting untested.
3. Not yet checked in the runtime (three.js r128 mixer playback, LoopOnce clamp for Pull/Reset/Burst, beam depthWrite).'''
f2 = lambda v: ', '.join('%.2f' % x for x in v)
REPORT = f"""# holm-props-v4 — animated props

Built by `tools/blender/build_holm_props_v4.py` (Blender 4.5 headless). Outputs `props.glb` ({len(roots)} roots, {len(glb_clips)} clips),
`props.blend`, `manifest.json` (v3 format + per-asset `clips` with duration / loop intent / driven nodes). Status: candidate;
runtime check still to do.

## Conventions
- glTF Y-up, 1 unit = 1 tile, root origin at ground contact unless noted in the table. Colours authored sRGB, drawn as-is;
  the build checks every exported baseColorFactor / emissiveFactor. Emission strength exactly 1.0 (no
  KHR_materials_emissive_strength in the file; asserted). `beam-light` is alphaMode BLEND, alpha 0.25.
- Animation = object transforms only (no morph targets, no skins), exported with NLA_TRACKS mode: every clip is an NLA
  track of that exact name on each node it drives, merged by the exporter into one glTF animation, sampled at 30 fps and
  slid to t=0. Root nodes are never animated, so the runtime can place/rotate roots freely. Looping clips end on their
  start pose. Clip names are unique across the pack, so `THREE.AnimationClip.findByName(gltf.animations, name)` works.
- Validation (in the build): GLB JSON check (every clip present, duration = authored length, channels only under the
  expected root, root nodes identity) + re-import of the GLB into a clean Blender scene asserting each clip name exists
  as an action with non-zero duration. sha256 {sha[:8]}…{sha[-6:]}.

## Assets and clips
| root | tris | pivot | rest bounds min / max (x,y,z) | clips (duration, mode) |
|---|---|---|---|---|
""" + ''.join(f'| {n} | {t} | {HABITAT[n][1]} | {f2(b["min"])} / {f2(b["max"])} | ' +
               '; '.join(f'`{c["name"]}` {c["duration"]:.2f}s {"loop" if c["loop"] else "once"}' for c in cl) + ' |\n'
               for n, t, b, ab, cl in rows) + f"""
Totals: {total:,} triangles (budget 2,500), {len(doc['materials'])} materials (budget 10): {', '.join(MAT_ORDER)}.

- beacon-lever: 8-sided iron plinth, tapered column, collar, head block with two fork cheeks, axle + nuts, stop block and a
  front catch lug. Bronze arm (hub, 6-sided tapering rod, iron ferrule, faceted knob) is the child node
  `beacon-lever_Arm` at y=0.92 on the axle; its rest pose is up-back (-32 deg). `Pull` swings it about X to 112 deg
  (down-forward, towards +Z) with a small overshoot and settle; `Reset` returns it. Play once, clampWhenFinished.
- beacon-beam: two nested open 8-sided cones (outer r 1.2 at x=12, inner r 0.6 core at x=10.8) with apex at the root
  origin, pointing +X; translucent pale gold, emissive 1.0, double-sided. `Sweep` spins `beacon-beam_Cone` 360 deg about
  +Y in 6 s (linear, loop). Runtime should keep depthWrite off for the cone if sorting artefacts show.
- guide-marker: 4-sided yellow arrow head pointing down (tip at origin), dark bronze outline collar at the girdle, square
  shaft with dark upper band and faceted cap, 0.6 tall. `Hover` (on `guide-marker_Bob`: tip 0..0.25, 1.2 s sine loop) and
  `Spin` (on `guide-marker_Gem`: 360 deg about Y, 2 s loop) drive different nodes, so play both at once.
- fishing-ripple-anim: 3 broken, tapered, crested ripple rings in the v2 style + 3 bubble lumps. `Ripple` (1.6 s loop):
  each ring rises from just under y=0, spreads from r~0.09 to r~0.49 while its crest swells then flattens, and sinks
  back under the surface; rings are staggered by 1/3 cycle so one is always spreading. Bubbles bob through the surface.
  The fade relies on the water plane at y=0 hiding what is below it.
- furnace-glow: low faceted ember bed (emissive red-orange) with dark coal lumps and hot chips, 4 orange + 3 yellow flame
  tongues (each its own node pivoting at its base). `Flicker` (1.0 s loop): seeded, irregular stretch / squash / sway
  keys every 1/6 s per tongue.
- anvil-sparks: 12 elongated emissive-yellow chips at the origin. Rest pose scale 0 (invisible). `Burst` (0.5 s, once):
  flash, then fly outward on ballistic arcs (gravity 5.5), turning to face their velocity and shrinking to zero at a
  seeded 75-100 % of the clip.

## Validation
""" + ''.join(f'- `{cn}`: re-imported as {k} action(s), duration {d:.3f} s\n' for cn, k, d in VALID) + f"""
## Proof renders
EEVEE, Raw view transform (as the game), in `scratchpad/holm_props_v4/`: lineup.png, <Clip>_1..3.png (3 frames per clip),
sheet.png (lineup + all clip frames: Pull, Reset / Sweep, Hover / Spin, Ripple / Flicker, Burst).

## Self-review
{SELF_REVIEW}
"""
(OUT / 'REPORT.md').write_text(REPORT, encoding='utf8')
print(TAG, 'DONE')
