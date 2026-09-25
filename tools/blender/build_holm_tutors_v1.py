"""Holm tutor cast v1: ten original low-poly tutor NPCs on ONE shared rig (Blender 4.5, headless).

Usage: blender -b --python tools/blender/build_holm_tutors_v1.py [-- --only bram,wenna] [--no-render]
Outputs assets/models/holm_tutor_<name>.glb (runtime path) plus
.studio-workspaces/holm-tutors-v1/candidates/{tutors.blend,manifest.json,REPORT.md} and proof renders in
scratchpad/holm_tutors_v1/ (lineup.png, clips.png, portraits.png, sheet.png).

Style: 2004-era chunky readable humanoids, flat-shaded matte colours, slightly oversized head/hands/feet,
faces as a few flat planes. Conventions follow build_holm_props_v2.py: colours are authored as the sRGB
values we want to SEE (the game draws material colours without colour management), roughness 1,
emission strength never above 1.0, deterministic (no unseeded randomness).
Axes: character faces Blender -Y == glTF +Z (verified against assets/models/v07.glb: toes point -Y,
bone *_L sits on +X). Blender Z-up exports as glTF Y-up; origin at ground-contact centre; 1 unit = 1 m/tile.
Rig: 19 deform bones (v07 naming: hips, spine, chest, neck, head, shoulder/uparm/forearm/hand_L/R,
thigh/shin/foot_L/R). Rigid per-part skinning (robe/coat skirts blend hips->thighs).
Clips (exact glTF names): idle 2.5 s loop, talk 2.0 s loop, walk 1.0 s in-place loop, wave ~1.2 s.
"""
import bpy, bmesh, math, random, json, struct, hashlib, sys
from pathlib import Path
from mathutils import Vector, Matrix, Euler

ROOT = Path(__file__).resolve().parents[2]
WS = ROOT / '.studio-workspaces/holm-tutors-v1/candidates'; WS.mkdir(parents=True, exist_ok=True)
MODELS = ROOT / 'assets/models'
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ONLY = argv[argv.index('--only') + 1].split(',') if '--only' in argv else None
DO_RENDER = '--no-render' not in argv
RENDER = ROOT / 'scratchpad/holm_tutors_v1'
FPS = 24
BUDGET = {'triangles': 2500, 'materials': 8, 'bones': 24}
CLIPS = {'idle': 61, 'talk': 49, 'walk': 25, 'wave': 30}      # frame counts incl. both ends -> 2.5 / 2.0 / 1.0 / 1.21 s
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene; scene.render.fps = FPS

# ============================================================================ shared rig
BONES = [('hips', None, (0, 0, .92), (0, 0, 1.04)),
         ('spine', 'hips', (0, 0, 1.04), (0, 0, 1.20)),
         ('chest', 'spine', (0, 0, 1.20), (0, 0, 1.42)),
         ('neck', 'chest', (0, .01, 1.42), (0, .01, 1.53)),
         ('head', 'neck', (0, .01, 1.53), (0, .01, 1.84))]
for s, x in (('L', 1), ('R', -1)):
    BONES += [(f'shoulder_{s}', 'chest', (x * .05, 0, 1.40), (x * .22, 0, 1.41)),
              (f'uparm_{s}', f'shoulder_{s}', (x * .23, 0, 1.40), (x * .285, 0, 1.14)),
              (f'forearm_{s}', f'uparm_{s}', (x * .285, 0, 1.14), (x * .315, -.01, .91)),
              (f'hand_{s}', f'forearm_{s}', (x * .315, -.01, .91), (x * .325, -.015, .77)),
              (f'thigh_{s}', 'hips', (x * .10, 0, .92), (x * .10, -.005, .50)),
              (f'shin_{s}', f'thigh_{s}', (x * .10, -.005, .50), (x * .10, 0, .10)),
              (f'foot_{s}', f'shin_{s}', (x * .10, 0, .10), (x * .10, -.15, .03))]
BONE_NAMES = [b[0] for b in BONES]
assert len(BONE_NAMES) <= BUDGET['bones']
J = {b[0]: Vector(b[2]) for b in BONES}          # joint heads
JT = {b[0]: Vector(b[3]) for b in BONES}         # joint tails

def make_rig(name, coll):
    ad = bpy.data.armatures.new(name); ob = bpy.data.objects.new(name, ad); coll.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode='EDIT')
    for n, par, h, t in BONES:
        eb = ad.edit_bones.new(n); eb.head = h; eb.tail = t; eb.roll = 0; eb.use_deform = True
        if par: eb.parent = ad.edit_bones[par]; eb.use_connect = False
    bpy.ops.object.mode_set(mode='OBJECT')
    for pb in ob.pose.bones: pb.rotation_mode = 'QUATERNION'
    return ob

# ============================================================================ mesh builder
def clamp(v, a=0., b=1.): return max(a, min(b, v))
def V(p): return Vector(p)

class MB:
    def __init__(s): s.v = []; s.f = []; s.mk = []; s.w = []
    def vert(s, p, w):
        p = V(p); s.v.append(p)
        s.w.append(w(p) if callable(w) else ({w: 1.} if isinstance(w, str) else dict(w)))
        return len(s.v) - 1
    def face(s, ids, k): s.f.append(tuple(ids)); s.mk.append(k)
    def tris(s): return sum(len(f) - 2 for f in s.f)

    def loft(s, rings, mat, w, cap0=True, cap1=True):
        """rings: list of equal-length CCW (about the loft direction) point loops."""
        n = len(rings[0]); idx = [[s.vert(p, w) for p in r] for r in rings]
        mf = mat if callable(mat) else (lambda j, i: mat)
        for j in range(len(rings) - 1):
            for i in range(n):
                s.face((idx[j][i], idx[j][(i + 1) % n], idx[j + 1][(i + 1) % n], idx[j + 1][i]), mf(j, i))
        if cap0: s.face(list(reversed(idx[0])), mf(0, 0))
        if cap1: s.face(idx[-1], mf(len(rings) - 2, 0))

    def seg(s, p0, p1, r0, r1, mat, w, n=6, ph=0., bands=None, cap0=True, cap1=True):
        """Prism tube along p0->p1. bands: list of (fraction, radius) extra rings; mat may be fn(j,i)."""
        p0, p1 = V(p0), V(p1); t = (p1 - p0).normalized()
        up = V((0, 0, 1)) if abs(t.z) < .95 else V((0, -1, 0))
        a = t.cross(up).normalized(); b = t.cross(a)
        fr = [(0., r0)] + (bands or []) + [(1., r1)]
        rings = []
        for f, r in fr:
            c = p0.lerp(p1, f)
            rings.append([c + (a * math.cos(ph + math.tau * i / n) + b * math.sin(ph + math.tau * i / n)) * r for i in range(n)])
        s.loft(rings, mat, w, cap0, cap1)

    def hull(s, pts, mat, w):
        bm = bmesh.new()
        for p in pts: bm.verts.new(V(p))
        r = bmesh.ops.convex_hull(bm, input=list(bm.verts), use_existing_faces=False)
        junk = list(dict.fromkeys(g for g in r['geom_interior'] + r['geom_unused'] if isinstance(g, bmesh.types.BMVert)))
        if junk: bmesh.ops.delete(bm, geom=junk, context='VERTS')
        bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(1.0), verts=bm.verts[:], edges=bm.edges[:])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        bm.verts.index_update()
        ids = [s.vert(v.co.copy(), w) for v in bm.verts]
        for f in bm.faces: s.face([ids[v.index] for v in f.verts], mat)
        bm.free()

    def box(s, c, h, mat, w, rot=(0, 0, 0), top=(1, 1), bot_off=(0, 0)):
        R = Euler([math.radians(a) for a in rot], 'XYZ').to_matrix(); c = V(c)
        pts = []
        for z in (-1, 1):
            sx, sy = (top if z > 0 else (1, 1))
            ox, oy = (bot_off if z < 0 else (0, 0))
            for x in (-1, 1):
                for y in (-1, 1): pts.append(c + R @ V((x * h[0] * sx + ox, y * h[1] * sy + oy, z * h[2])))
        s.hull(pts, mat, w)

    def quad(s, pts, mat, w, facing):
        pts = [V(p) for p in pts]
        nrm = (pts[1] - pts[0]).cross(pts[2] - pts[0])
        if nrm.dot(V(facing)) < 0: pts = pts[::-1]
        s.face([s.vert(p, w) for p in pts], mat)

    def front_quad(s, x0, x1, z0, z1, y, mat, w):
        s.quad([(x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1)], mat, w, (0, -1, 0))

def rbox(cx, cy, z, rx, ry, c=.3):
    a = 1 - c
    return [V(p) for p in [(cx - a * rx, cy - ry, z), (cx + a * rx, cy - ry, z), (cx + rx, cy - a * ry, z), (cx + rx, cy + a * ry, z),
                           (cx + a * rx, cy + ry, z), (cx - a * rx, cy + ry, z), (cx - rx, cy + a * ry, z), (cx - rx, cy - a * ry, z)]]

def rell(cx, cy, z, rx, ry, n=10, ph=None, jag=None):
    ph = -math.pi / n if ph is None else ph
    return [V((cx + rx * math.sin(ph + math.tau * i / n), cy - ry * math.cos(ph + math.tau * i / n),
               z + (jag[i] if jag else 0))) for i in range(n)]

def rot_pts(pts, rot, loc=(0, 0, 0)):
    R = Euler([math.radians(a) for a in rot], 'XYZ').to_matrix()
    return [V(loc) + R @ V(p) for p in pts]

def zw(p):
    """rigid torso weight by height"""
    return {'hips': 1.} if p.z < .99 else ({'spine': 1.} if p.z < 1.19 else {'chest': 1.})

def skirt_w(top, hem, tmax=.75):
    def f(p):
        t = clamp((top - p.z) / max(1e-3, top - hem)) * tmax
        sl = clamp(.5 + p.x / .16 * .5)
        d = {'hips': 1 - t}
        if t > 0: d['thigh_L'] = t * sl; d['thigh_R'] = t * (1 - sl)
        return {k: v for k, v in d.items() if v > 1e-4}
    return f

def headw_long(p):
    return {'head': 1.} if p.z > 1.50 else {'chest': 1.}

# ============================================================================ shared body
HEAD_FY = -.141    # face plane (head front) for features

def body(mb, o):
    b = dict(hip=.17, waist=.155, belly=.165, bellyf=0., chest=.195, sw=.205, depth=1.0); b.update(o.get('build', {}))
    d = b['depth']
    KP = [(.80, b['hip'], .12 * d, 0), (.96, b['waist'], .112 * d, 0), (1.10, b['belly'], (.12 + b['bellyf']) * d, -b['bellyf'] * .7),
          (1.28, b['chest'], .132 * d, 0), (1.40, b['sw'], .122 * d, .005), (1.47, b['sw'] * .62, .095, .01), (1.505, .07, .062, .01)]
    def prof(z):
        if z <= KP[0][0]: return KP[0][1:]
        for (z0, *a), (z1, *bb) in zip(KP, KP[1:]):
            if z <= z1:
                t = (z - z0) / (z1 - z0); return tuple(x + (y - x) * t for x, y in zip(a, bb))
        return KP[-1][1:]
    o['_prof'] = prof
    o['_front'] = lambda z: prof(z)[2] - prof(z)[1]
    zs = sorted(set([k[0] for k in KP] + list(o.get('torso_cuts', []))))
    rings = [rbox(0, prof(z)[2], z, prof(z)[0], prof(z)[1], .3 if z < 1.49 else .25) for z in zs]
    torso = o['torso']
    mb.loft(rings, (lambda j, i: torso((zs[j] + zs[j + 1]) / 2, i)) if callable(torso) else torso, zw)
    # neck + head
    mb.seg((0, .012, 1.43), (0, .012, 1.56), .06, .056, o.get('neck', 'skin'), 'neck', n=6)
    hd = dict(jaw=1., w=1.); hd.update(o.get('head', {}))
    hw = hd['w']
    HR = [(1.50, .075 * hd['jaw'], .085, -.02), (1.545, .118 * hd['jaw'] * hw, .138, -.003), (1.60, .13 * hw, .14, 0), (1.74, .13 * hw, .14, 0),
          (1.80, .118 * hw, .125, .005), (1.835, .075 * hw, .08, .01)]
    mb.loft([rbox(0, cy, z, rx, ry, .3) for z, rx, ry, cy in HR], 'skin', 'head')
    face(mb, o.get('face', {}), hw)
    # arms
    for s, x in (('L', 1), ('R', -1)):
        S, E, W, H = J[f'uparm_{s}'], J[f'forearm_{s}'], J[f'hand_{s}'], JT[f'hand_{s}']
        du = (E - S).normalized(); dl = (W - E).normalized()
        up = o.get('upper', 'shirt'); lo = o.get('lower', up)
        ub = o.get('upper_bands')
        mb.seg(S + V((0, 0, .035)) - du * .0, E + du * .03, o.get('shoulder_r', .08), .068, (lambda j, i, ub=ub: ub[j]) if ub else up,
               f'uparm_{s}', n=6, bands=[(k / len(ub), .08 - .012 * k / len(ub)) for k in range(1, len(ub))] if ub else None)
        if o.get('short_sleeve'):   # bare upper arm below sleeve is part of the upper tube colour list
            pass
        wr = o.get('wrist_r', .056)
        mb.seg(E - dl * .03, W + dl * .01, .064, wr, lo, f'forearm_{s}', n=6)
        if o.get('cuff'):
            mb.seg(W - dl * .05, W + dl * .012, wr + .012, wr + .014, o['cuff'], f'forearm_{s}', n=6)
        if o.get('roll'):
            mb.seg(E - dl * .045, E + dl * .045, .078, .074, o['roll'], f'forearm_{s}', n=6)
        # chunky mitt hand + thumb
        hk = o.get('hands', 'skin'); hc = W.lerp(H, .5) + V((0, -.004, 0))
        mb.box(hc, (.046, .042, .075), hk, f'hand_{s}', top=(1.05, .9), rot=(0, x * 4, 0))
        mb.box(W + V((-x * .035, -.04, -.045)), (.018, .02, .036), hk, f'hand_{s}', rot=(12, x * 20, 0))
    # legs
    for s, x in (('L', 1), ('R', -1)):
        th = o.get('thigh', 'trousers'); sh = o.get('shin', th)
        mb.seg((x * .10, 0, .95), (x * .10, -.005, .47), .092, .078, th, f'thigh_{s}', n=6)
        rolled = o.get('rolled')
        if rolled:
            mb.seg((x * .10, -.005, .53), (x * .10, -.003, rolled), .075, .07, sh, f'shin_{s}', n=6)
            mb.seg((x * .10, -.003, rolled + .035), (x * .10, -.003, rolled - .01), .082, .082, sh, f'shin_{s}', n=6)
            mb.seg((x * .10, -.003, rolled), (x * .10, 0, .08), .058, .05, 'skin', f'shin_{s}', n=6)
        else:
            mb.seg((x * .10, -.005, .53), (x * .10, 0, .09), .075, .062, sh, f'shin_{s}', n=6)
        fk = o.get('feet', 'boots')
        if fk == 'bare':
            mb.hull([(x * .10 + dx, y, z) for dx in (-.058, .058) for y, z in ((-.19, 0), (.06, 0), (-.16, .045), (.05, .09))], 'skin', f'foot_{s}')
            for k, dx in enumerate((-.035, 0, .035)):
                mb.box((x * .10 + dx, -.192, .02), (.014, .012, .018), 'skin', f'foot_{s}')
        else:
            mb.hull([(x * .10 + dx * .075, y, 0) for dx in (-1, 1) for y in (-.215, .075)] +
                    [(x * .10 + dx * .064, y, z) for dx in (-1, 1) for y, z in ((-.17, .10), (.06, .13))], fk, f'foot_{s}')
            bh = o.get('boot_h')
            if bh:
                mb.seg((x * .10, 0, .08), (x * .10, -.003, bh), .08, .078, fk, f'shin_{s}', n=6)
                mb.seg((x * .10, -.003, bh - .01), (x * .10, -.003, bh + .035), .088, .09, fk, f'shin_{s}', n=6)
    # skirt / tunic / coat / robe
    sk = o.get('skirt')
    if sk:
        top = sk.get('top', 1.0); hem = sk['hem']; pr = prof(top)
        rx0, ry0 = pr[0] + .012, pr[1] + .012
        n = 10; rng = random.Random(sk.get('seed', 7))
        jag = [rng.uniform(-sk.get('jag', 0), sk.get('jag', 0)) for _ in range(n)] if sk.get('jag') else None
        zs2 = [top, top - (top - hem) * .3, top - (top - hem) * .65, hem]
        trim = sk.get('trim'); trim_h = sk.get('trim_h', .05)
        if trim: zs2 = zs2[:-1] + [hem + trim_h, hem]
        def srad(z):
            t = clamp((top - z) / (top - hem)) ** .8
            return rx0 + (sk['rx'] - rx0) * t, ry0 + (sk.get('ry', sk['rx'] * .85) - ry0) * t
        o['_skirt'] = srad
        rings = [rell(0, -.005, z, *srad(z), n=n, jag=(jag if z == hem else None)) for z in zs2]
        mat = sk['key']
        mfn = (lambda j, i: trim if (trim and j == len(zs2) - 2) else mat)
        mb.loft(rings, mfn, skirt_w(top, hem, sk.get('tmax', .75)), cap0=True, cap1=False)
    if o.get('belt'):
        z0 = o.get('belt_z', .96); pr0, pr1 = prof(z0 - .035), prof(z0 + .035)
        ex = .018 if sk and sk.get('top', 1.0) > z0 - .04 else .012
        mb.loft([rbox(0, pr0[2], z0 - .035, pr0[0] + ex, pr0[1] + ex), rbox(0, pr1[2], z0 + .035, pr1[0] + ex, pr1[1] + ex)], o['belt'], 'hips')
        if o.get('buckle'):
            fy = pr0[2] - pr0[1] - ex - .006
            mb.box((0, fy, z0), (.03, .008, .03), o['buckle'], 'hips')
    return o

def face(mb, f, hw=1.):
    fy = HEAD_FY
    ex = .052 * hw
    ek = f.get('eye', 'dark'); eh = f.get('eye_h', .032); ez = f.get('eye_z', 1.652)
    for x in (-1, 1):
        if f.get('eye_white'):
            mb.front_quad(x * ex - .024, x * ex + .024, ez - .002, ez + eh + .002, fy - .001, f['eye_white'], 'head')
            mb.front_quad(x * ex - .012 + x * .004, x * ex + .012 + x * .004, ez + .002, ez + eh - .004, fy - .003, ek, 'head')
        else:
            mb.front_quad(x * ex - .018, x * ex + .018, ez, ez + eh, fy - .002, ek, 'head')
    bk = f.get('brow', 'hair'); tilt = f.get('brow_tilt', 0); bt = f.get('brow_t', .011)
    for x in (-1, 1):
        mb.box((x * ex, fy - .008, ez + eh + .022), (.036, .01, bt), bk, 'head', rot=(0, -tilt * x, 0))
    ns = f.get('nose', 1.)
    mb.hull([(-.022 * ns, fy + .004, 1.665), (.022 * ns, fy + .004, 1.665), (0, fy + .004, 1.685), (-.028 * ns, fy + .004, 1.61), (.028 * ns, fy + .004, 1.61),
             (0, fy - .045 * ns, 1.622), (-.014 * ns, fy - .038 * ns, 1.612), (.014 * ns, fy - .038 * ns, 1.612)], f.get('nose_k', 'skin'), 'head')
    if f.get('mouth', True):
        mw = f.get('mouth_w', .032)
        mb.front_quad(-mw, mw, 1.573, 1.586, fy - .002, f.get('mouth_k', 'dark'), 'head')
        if f.get('smile'):
            for x in (-1, 1): mb.front_quad(x * mw - .008 if x > 0 else -mw, x * mw + .008 if x < 0 else mw + .0, 1.586, 1.594, fy - .002, f.get('mouth_k', 'dark'), 'head')
    if f.get('cheeks'):
        for x in (-1, 1): mb.front_quad(x * .088 - .02, x * .088 + .02, 1.598, 1.622, fy - .0015, f['cheeks'], 'head')
    if f.get('ears', True):
        for x in (-1, 1): mb.box((x * .133 * hw, .0, 1.655), (.02, .032, .042), 'skin', 'head', top=(.8, .8))

# ----------------------------------------------------------------- hair / beards / headwear
def hair_cap(mb, k, front=1.745, side=1.64, back=1.56, puff=.016, top=1.875, fringe=0., hw=1.):
    P = []
    for x in (-.115, -.06, 0, .06, .115): P.append((x * hw, -.147 - puff * .5, front - (fringe if abs(x) < .07 else 0)))
    for x in (-1, 1):
        P += [(x * (.14 + puff) * hw, -.085, front - .03), (x * (.143 + puff) * hw, .03, side), (x * (.138 + puff) * hw, .11, side - .01),
              (x * .10 * hw, .148 + puff, back), (x * .13 * hw, .125 + puff, back + .07)]
    P += [(0, .152 + puff, back)]
    P += rbox(0, .006, 1.80, (.123 + puff) * hw, .133 + puff, .3)
    P += rbox(0, .01, top, .06 * hw, .07, .3)
    mb.hull(P, k, 'head')

def beard(mb, k, length=.06, bushy=.0, w='head'):
    b = bushy; fy = HEAD_FY
    P = [(-.138 - b * .3, -.03, 1.665), (.138 + b * .3, -.03, 1.665), (-.14 - b * .4, -.06, 1.575), (.14 + b * .4, -.06, 1.575),
         (-.105 - b * .3, fy - .012 - b * .5, 1.612), (.105 + b * .3, fy - .012 - b * .5, 1.612),
         (-.07 - b * .4, fy - .03 - b, 1.53), (.07 + b * .4, fy - .03 - b, 1.53),
         (-.05, fy - .035 - b, 1.49 - length * .5), (.05, fy - .035 - b, 1.49 - length * .5),
         (0, fy - .03 - b * .8, 1.47 - length), (-.10, -.03, 1.51), (.10, -.03, 1.51), (0, -.06, 1.46 - length * .6)]
    mb.hull(P, k, w)
    # moustache: its own chunky wedge in front of the mouth line
    mb.hull([(-.078 - b * .2, fy - .03 - b * .6, 1.588), (.078 + b * .2, fy - .03 - b * .6, 1.588), (0, fy - .045 - b * .6, 1.60),
             (-.06, fy - .012, 1.61), (.06, fy - .012, 1.61), (0, fy - .015, 1.618), (-.085 - b * .2, fy - .02 - b * .5, 1.565), (.085 + b * .2, fy - .02 - b * .5, 1.565)], k, 'head')

def strap(mb, pts, k, w, width=.034, thick=.012):
    """flat band through a polyline of (point, outward normal) pairs"""
    for (a, na), (b, nb) in zip(pts, pts[1:]):
        a, b, na, nb = V(a), V(b), V(na).normalized(), V(nb).normalized()
        d = (b - a).normalized(); sa = d.cross(na).normalized(); sb = d.cross(nb).normalized()
        P = [a + sa * width * u + na * thick * v for u in (-1, 1) for v in (0, 1)] + [b + sb * width * u + nb * thick * v for u in (-1, 1) for v in (0, 1)]
        mb.hull(P, k, w)

def torus_path(mb, c, u, v, Ru, Rv, r, k, w, seg=14, n=5, ph=0.):
    c, u, v = V(c), V(u).normalized(), V(v).normalized()
    rings = []
    for j in range(seg + 1):
        th = math.tau * j / seg + ph
        p = c + u * Ru * math.cos(th) + v * Rv * math.sin(th)
        t = (-u * Ru * math.sin(th) + v * Rv * math.cos(th)).normalized()
        a = t.cross(u.cross(v)).normalized(); bb = t.cross(a)
        rings.append([p + (a * math.cos(math.tau * i / n) + bb * math.sin(math.tau * i / n)) * r for i in range(n)])
    rings = rings[:-1]
    idx = [[mb.vert(p, w) for p in rr] for rr in rings]
    for j in range(seg):
        for i in range(n):
            j2 = (j + 1) % seg
            mb.face((idx[j][i], idx[j][(i + 1) % n], idx[j2][(i + 1) % n], idx[j2][i]), k)

# ============================================================================ the ten tutors
SKIN_L, SKIN_M, SKIN_T = (.86, .66, .52), (.80, .59, .44), (.70, .49, .35)
DARK = (.10, .075, .06)

def t_bram(mb):
    o = body(mb, dict(torso=lambda z, i: 'trousers' if z < .9 else 'tunic', upper='tunic', cuff='hood', belt='leather', buckle='wood',
                      skirt=dict(key='tunic', hem=.60, rx=.23, jag=.015, seed=3), boot_h=.30, feet='leather', thigh='trousers',
                      build=dict(chest=.19, sw=.20, belly=.17, bellyf=.01),
                      face=dict(brow='grey', brow_t=.016, brow_tilt=-8, nose=1.35, mouth=False)))
    beard(mb, 'grey', length=.13, bushy=.012)
    # hood up: crown shell + cheek panels + peak, drape over shoulders
    fy = HEAD_FY
    mb.hull([(-.13, fy - .03, 1.76), (.13, fy - .03, 1.76), (0, fy - .04, 1.80), (-.165, -.02, 1.70), (.165, -.02, 1.70),
             (-.15, .15, 1.66), (.15, .15, 1.66), (0, .20, 1.72), (0, .23, 1.84), (-.10, .10, 1.90), (.10, .10, 1.90), (-.09, -.08, 1.90), (.09, -.08, 1.90),
             (0, .02, 1.93)], 'hood', 'head')
    for x in (-1, 1):
        mb.hull([(x * .13, fy - .035, 1.765), (x * .142, fy - .03, 1.60), (x * .15, fy - .02, 1.52), (x * .17, -.03, 1.52), (x * .175, -.03, 1.72),
                 (x * .17, .12, 1.52), (x * .165, .13, 1.70), (x * .135, fy - .02, 1.70)], 'hood', 'head')
    mb.hull([(-.20, .05, 1.40), (.20, .05, 1.40), (-.17, .17, 1.44), (.17, .17, 1.44), (0, .21, 1.36), (-.14, .16, 1.60), (.14, .16, 1.60),
             (0, .20, 1.64), (-.19, -.07, 1.44), (.19, -.07, 1.44), (-.12, -.12, 1.47), (.12, -.12, 1.47), (0, -.15, 1.44)], 'hood', 'chest')
    # satchel on left hip, strap from right shoulder
    mb.box((.235, -.02, .88), (.045, .085, .075), 'leather', 'hips', top=(.9, .95))
    mb.box((.262, -.02, .925), (.022, .088, .045), 'hood', 'hips', rot=(0, 10, 0))
    F = o['_front']
    strap(mb, [((-.17, F(1.42) + .03, 1.45), (0, -.4, 1)), ((-.08, F(1.30) - .004, 1.32), (0, -1, 0)), ((.10, F(1.10) - .004, 1.08), (0, -1, 0)),
               ((.21, -.06, .95), (.8, -.5, 0))], 'leather', lambda p: zw(p), width=.028)
    # walking staff in right hand (kept vertical by the hold pose)
    hx = J['hand_R'].lerp(JT['hand_R'], .5)
    mb.seg((hx.x, hx.y - .005, -.05), (hx.x, hx.y - .005, 1.86), .026, .022, 'wood', 'hand_R', n=6)
    mb.hull([(hx.x + dx, hx.y + dy, z) for dx, dy, z in [(-.05, 0, 1.86), (.05, 0, 1.86), (0, -.05, 1.87), (0, .05, 1.85),
                                                         (-.035, -.02, 1.96), (.04, .02, 1.97), (0, 0, 2.0), (-.02, .04, 1.9)]], 'wood', 'hand_R')

def t_wenna(mb):
    def torso(z, i):
        if z < .92: return 'trousers'
        if z > 1.455: return 'moss'
        if z > 1.29 and i == 0: return 'moss'
        return 'jerkin'
    o = body(mb, dict(torso=torso, torso_cuts=[1.29, 1.455, .92], upper='moss', cuff='jerkin', belt='boots', buckle='iron',
                      skirt=dict(key='jerkin', hem=.76, rx=.215, top=1.0, jag=.012, seed=11), boot_h=.33, feet='boots',
                      build=dict(hip=.175, waist=.145, belly=.15, chest=.185, sw=.195),
                      head=dict(jaw=.94, w=.97), face=dict(brow='hair', brow_tilt=4, nose=.9, mouth_w=.028, cheeks=None)))
    hair_cap(mb, 'hair', front=1.755, side=1.60, back=1.55, puff=.01, top=1.86, fringe=.012, hw=.97)
    # braid over the left shoulder onto the chest
    pts = [(.10, .06, 1.64), (.155, .0, 1.53), (.175, -.08, 1.47), (.165, -.155, 1.39), (.15, -.168, 1.30), (.145, -.165, 1.21)]
    for k, (a, b) in enumerate(zip(pts, pts[1:])):
        mb.seg(a, b, .036 - k * .002, .03 - k * .002, 'hair', 'head' if k == 0 else 'chest', n=4, ph=math.pi / 4 + k * .5)
    mb.seg((.145, -.166, 1.225), (.145, -.166, 1.19), .03, .03, 'boots', 'chest', n=4)
    mb.hull([(.145 + dx, -.166 + dy, z) for dx, dy, z in [(-.03, 0, 1.19), (.03, 0, 1.19), (0, -.03, 1.19), (0, .025, 1.19), (-.015, 0, 1.12), (.015, 0, 1.12), (0, -.01, 1.10)]], 'hair', 'chest')
    # jerkin shoulder yoke + lacing
    for x in (-1, 1):
        mb.box((x * .15, 0, 1.455), (.06, .11, .02), 'jerkin', 'chest', top=(.8, .9))
    F = o['_front']
    for z in (1.34, 1.39, 1.44):
        mb.box((0, F(z) - .006, z), (.035, .006, .006), 'boots', 'chest')
    # hatchet on the right hip
    mb.seg((-.215, -.07, 1.02), (-.225, -.03, .66), .017, .015, 'boots', 'hips', n=5)
    mb.hull([(-.21 + dx, y, z) for dx in (-.012, .012) for y, z in [(-.06, .985), (-.06, 1.04), (-.12, .97), (-.13, 1.06), (-.17, .95), (-.175, 1.075)]], 'iron', 'hips')

def t_hettie(mb):
    o = body(mb, dict(torso=lambda z, i: 'ochre', upper='ochre', lower='skin', roll='ochre', belt='white', belt_z=1.0,
                      skirt=dict(key='ochre', hem=.24, rx=.30, ry=.27, top=1.02, tmax=.55), feet='shoes', thigh='ochre',
                      build=dict(hip=.20, waist=.19, belly=.215, bellyf=.045, chest=.215, sw=.21, depth=1.08),
                      head=dict(jaw=1.06, w=1.04), face=dict(brow='hair', brow_tilt=-6, nose=.85, smile=True, mouth_w=.036, cheeks='cheeks')))
    hair_cap(mb, 'hair', front=1.74, side=1.60, back=1.55, puff=.02, hw=1.04)
    # puffy baker's cap
    mb.loft([rbox(0, .01, 1.735, .148, .156), rbox(0, .01, 1.79, .152, .16)], 'white', 'head')
    mb.loft([rell(0, .02, 1.79, .15, .16, 8), rell(0, .02, 1.84, .19, .195, 8), rell(0, .03, 1.90, .18, .185, 8), rell(0, .03, 1.93, .10, .11, 8)], 'white', 'head')
    # apron bib + skirt panel following the dress
    F = o['_front']; sr = o['_skirt']
    bib = [(x, F(z) - dy, z) for z in (1.14, 1.34) for x in (-.10, .10) for dy in (.006, .02)]
    mb.hull(bib, 'white', zw)
    ap = []
    for z in (1.0, .80, .55, .42):
        ry = sr(min(z, 1.02))[1]
        for x in (-.16, .16): ap += [(x * (1 + (1.0 - z) * .5), -ry - .004 - .005, z), (x * (1 + (1.0 - z) * .5), -ry + .02, z)]
    mb.hull(ap, 'white', skirt_w(1.02, .24, .55))
    for x in (-1, 1): mb.box((x * .085, F(1.40) + .02, 1.40), (.014, .03, .06), 'white', 'chest', rot=(-25, 0, 0))
    # flour dust patches on dress + apron + cheek
    for ang, z in ((.9, .5), (-1.1, .35), (2.6, .6), (-2.2, .45)):
        rx, ry = sr(z); p = V((rx * math.sin(ang), -ry * math.cos(ang) - .005, z)); n = V((math.sin(ang), -math.cos(ang), 0))
        mb.hull([p + n * .012 + V((math.cos(ang) * dx, math.sin(ang) * dx, dz)) for dx, dz in ((-.045, -.03), (.05, -.02), (.02, .04), (-.03, .035))] +
                [p - n * .01], 'flour', skirt_w(1.02, .24, .55))
    for x in (-1, 1): mb.box((x * .30, -.02, 1.02), (.05, .05, .04), 'flour', f'forearm_{"L" if x > 0 else "R"}')
    mb.front_quad(.07, .105, 1.66, 1.68, HEAD_FY - .0025, 'flour', 'head')

def t_ansel(mb):
    o = body(mb, dict(torso=lambda z, i: 'robe', upper='robe', cuff='trim', belt='trim', belt_z=.98, wrist_r=.06,
                      skirt=dict(key='robe', hem=.08, rx=.24, ry=.21, top=1.0, trim='trim', trim_h=.06, tmax=.6), feet='leather', thigh='robe',
                      build=dict(hip=.155, waist=.14, belly=.145, chest=.175, sw=.19, depth=.95),
                      head=dict(jaw=.9, w=.94), face=dict(brow='hair', brow_tilt=-10, nose=1.25, mouth_w=.026)))
    hair_cap(mb, 'hair', front=1.785, side=1.62, back=1.55, puff=.012, top=1.86, hw=.94)
    for x in (-1, 1):   # side tufts
        mb.box((x * .135, .02, 1.72), (.02, .07, .045), 'hair', 'head', rot=(0, x * 10, 0))
    # spectacles: dark rims round the eyes, bridge, arms
    fy = HEAD_FY - .01
    for x in (-1, 1):
        cx = x * .049
        for (dx, dz, hx, hz) in ((0, .034, .03, .005), (0, -.004, .03, .005), (-.028, .015, .005, .022), (.028, .015, .005, .022)):
            mb.box((cx + dx, fy, 1.652 + dz), (hx, .005, hz), 'dark', 'head')
        mb.box((x * .124, -.06, 1.667), (.004, .07, .005), 'dark', 'head')
    mb.box((0, fy, 1.676), (.014, .005, .004), 'dark', 'head')
    # quill tucked behind the right ear
    mb.hull([(-.15, .03, 1.64), (-.16, .035, 1.64), (-.205, .10, 1.86), (-.19, .09, 1.87), (-.18, .07, 1.80), (-.20, .07, 1.79), (-.17, .06, 1.72)], 'paper', 'head')
    # book strap (left shoulder -> right hip) + book at right hip
    F = o['_front']
    strap(mb, [((.16, .02, 1.475), (0, 0, 1)), ((.10, F(1.36) - .004, 1.38), (0, -1, 0)), ((-.08, F(1.13) - .004, 1.12), (0, -1, 0)),
               ((-.19, -.07, .99), (-.8, -.5, 0))], 'leather', zw, width=.026)
    strap(mb, [((.16, .02, 1.475), (0, 0, 1)), ((.08, .14, 1.36), (0, 1, 0)), ((-.10, .135, 1.12), (0, 1, 0)), ((-.19, .07, .99), (-.8, .5, 0))], 'leather', zw, width=.026)
    mb.box((-.225, -.01, .90), (.035, .11, .135), 'book', 'hips', rot=(0, 0, 6))
    mb.box((-.232, -.01, .90), (.036, .095, .12), 'paper', 'hips', rot=(0, 0, 6))

def t_durgin(mb):
    o = body(mb, dict(torso=lambda z, i: 'trousers' if z < .9 else 'smock', upper='smock', lower='skin', roll='smock', belt='leather', buckle='iron',
                      skirt=dict(key='smock', hem=.64, rx=.25, top=1.0, jag=.01, seed=5), boot_h=.34, feet='leather',
                      build=dict(hip=.19, waist=.185, belly=.21, bellyf=.03, chest=.225, sw=.215, depth=1.07),
                      shoulder_r=.09, head=dict(jaw=1.1, w=1.03), face=dict(brow='black', eye='black', brow_t=.017, brow_tilt=12, nose=1.3, mouth=False)))
    beard(mb, 'black', length=.07, bushy=.025)
    hair_cap(mb, 'black', front=1.70, side=1.60, back=1.55, puff=.012, hw=1.03)
    # leather cap with brim + candle stub
    mb.loft([rbox(0, .005, 1.73, .148, .155), rbox(0, .005, 1.82, .14, .15), rbox(0, .01, 1.88, .09, .10)], 'leather', 'head')
    mb.hull([(x, y, z) for x in (-.13, .13) for y, z in ((-.14, 1.74), (-.20, 1.72), (-.14, 1.76), (-.195, 1.735))], 'leather', 'head')
    mb.seg((0, -.10, 1.84), (0, -.10, 1.93), .024, .022, 'wax', 'head', n=6)
    mb.hull([(-.014, -.10, 1.93), (.014, -.10, 1.93), (0, -.114, 1.93), (0, -.086, 1.93), (0, -.10, 1.99), (.004, -.104, 1.97)], 'flame', 'head')
    # pick slung across the back
    a, b = V((.20, .20, .74)), V((-.20, .19, 1.66))
    mb.seg(a, b, .022, .02, 'leather', 'chest', n=5)
    d = (b - a).normalized(); pp = V((d.z, 0, -d.x)).normalized()
    c = b - d * .03
    mb.hull([c + pp * s * .05 + V((0, dy, dz)) for s in (-1, 1) for dy in (-.025, .025) for dz in (-.03, .03)] +
            [c + pp * .26 - d * .08, c + pp * .26 - d * .06 + V((0, .01, 0))], 'iron', 'chest')
    mb.hull([c + pp * s * .05 + V((0, dy, dz)) for s in (-1, 1) for dy in (-.025, .025) for dz in (-.03, .03)] +
            [c - pp * .25 - d * .07, c - pp * .25 - d * .05 + V((0, .01, 0))], 'iron', 'chest')
    # soot smudges on the smock front
    F = o['_front']
    mb.front_quad(-.12, -.05, 1.12, 1.17, F(1.145) - .003, 'black', 'spine')
    mb.front_quad(.04, .10, 1.30, 1.34, F(1.32) - .003, 'black', 'chest')

def t_corrick(mb):
    def torso(z, i):
        if z < .9: return 'under'
        if z < 1.0: return 'leather'
        if i in (0, 4) and z < 1.43: return 'tabard'
        return 'bronze'
    o = body(mb, dict(torso=torso, torso_cuts=[.9, 1.0, 1.43], upper='under', lower='leather', cuff='bronze', hands='skin', belt='leather', buckle='bronze',
                      belt_z=1.0, skirt=dict(key='leather', hem=.70, rx=.22, top=1.0, jag=.0), boot_h=.36, feet='leather', thigh='under',
                      build=dict(hip=.18, waist=.175, belly=.185, chest=.225, sw=.215, depth=1.05),
                      head=dict(jaw=1.12, w=1.0), face=dict(brow='hair', brow_t=.014, brow_tilt=16, nose=1.1, mouth_w=.035)))
    hair_cap(mb, 'hair', front=1.77, side=1.66, back=1.60, puff=.005, top=1.855)
    # tabard flaps front + back, following the leather skirt
    sr = o['_skirt']
    for sgn in (-1, 1):
        P = []
        for z in (1.0, .80, .56):
            ry = sr(z)[1] if z < 1.0 else sr(1.0)[1]
            for x in (-.105, .105): P += [(x * (1 + (1 - z) * .3), sgn * (ry + .012), z), (x * (1 + (1 - z) * .3), sgn * (ry - .01), z)]
        mb.hull(P, 'tabard', skirt_w(1.0, .56, .6))
    # emblem on the tabard chest
    F = o['_front']
    mb.hull([(0, F(1.26) - .012, 1.33), (-.05, F(1.26) - .012, 1.28), (.05, F(1.26) - .012, 1.28), (0, F(1.2) - .012, 1.19),
             (0, F(1.26) - .003, 1.33), (-.05, F(1.26) - .003, 1.28), (.05, F(1.26) - .003, 1.28), (0, F(1.2) - .003, 1.19)], 'bronze', 'chest')
    # pauldrons
    for s, x in (('L', 1), ('R', -1)):
        c = V((x * .245, 0, 1.44))
        mb.hull([c + V(p) for p in [(-x * .07, -.10, -.02), (-x * .07, .10, -.02), (x * .09, -.11, -.10), (x * .09, .11, -.10), (x * .06, -.09, .04),
                                     (x * .06, .09, .04), (-x * .02, 0, .07), (x * .10, 0, -.02)]], 'bronze', f'uparm_{s}')
    # sword at the left hip: scabbard, crossguard, grip, pommel
    mb.seg((.215, -.03, .93), (.25, .10, .30), .03, .024, 'leather', 'hips', n=4, ph=math.pi / 4)
    mb.box((.212, -.035, .95), (.02, .07, .014), 'bronze', 'hips', rot=(-12, 0, 0))
    mb.seg((.21, -.04, .96), (.205, -.065, 1.08), .017, .017, 'leather', 'hips', n=5)
    mb.box((.205, -.068, 1.095), (.022, .022, .018), 'bronze', 'hips')

def t_maud(mb):
    def torso(z, i):
        if z < .9: return 'skirt'
        if z > 1.44: return 'blouse'
        if i == 0 and z > 1.1: return 'blouse'
        return 'waistcoat'
    o = body(mb, dict(torso=torso, torso_cuts=[.9, 1.1, 1.44], upper='blouse', cuff='blouse', belt='shoes', buckle='brass', belt_z=.99,
                      skirt=dict(key='skirt', hem=.14, rx=.25, ry=.22, top=1.02, tmax=.6), feet='shoes', thigh='skirt', wrist_r=.052,
                      build=dict(hip=.18, waist=.14, belly=.15, chest=.18, sw=.19),
                      head=dict(jaw=.92, w=.96), face=dict(brow='hair', brow_t=.008, brow_tilt=3, nose=.9, mouth_w=.026, eye_h=.03)))
    hair_cap(mb, 'hair', front=1.765, side=1.63, back=1.58, puff=.014, hw=.96)
    mb.hull([(x, y, z) for x, y, z in [(-.07, .10, 1.72), (.07, .10, 1.72), (-.075, .18, 1.79), (.075, .18, 1.79), (0, .21, 1.82), (0, .15, 1.87),
                                       (-.06, .14, 1.86), (.06, .14, 1.86), (0, .22, 1.75), (0, .15, 1.70)]], 'hair', 'head')
    F = o['_front']
    for z in (1.06, 1.17, 1.28): mb.box((-.035, F(z) - .006, z), (.01, .006, .01), 'brass', 'spine' if z < 1.19 else 'chest')
    mb.box((0, F(1.46) - .01, 1.46), (.02, .008, .02), 'brass', 'chest')
    # waistcoat points below the belt
    for x in (-1, 1):
        mb.hull([(x * .02, F(1.0) - .002, 1.0), (x * .11, F(1.0) + .01, 1.0), (x * .05, F(.9) - .01, .92), (x * .02, F(1.0) + .01, 1.0), (x * .11, F(1.0) + .025, 1.0),
                 (x * .05, F(.9) + .01, .92)], 'waistcoat', 'hips')
    # key ring + keys on the right hip
    kc = V((-.19, -.09, .90))
    torus_path(mb, kc, (0, 1, 0), (0, 0, 1), .035, .035, .007, 'brass', 'hips', seg=8, n=4)
    for k, (dy, ln) in enumerate(((-.02, .09), (.0, .07), (.022, .08))):
        mb.box(kc + V((-.01, dy, -.04 - ln / 2)), (.007, .008, ln / 2), 'brass', 'hips', rot=(k * 8 - 8, 0, 0))
        mb.box(kc + V((-.01, dy, -.04 - ln + .01)), (.008, .018, .012), 'brass', 'hips')

def t_ilse(mb):
    o = body(mb, dict(torso=lambda z, i: 'robe', upper='robe', lower='robe', cuff='silver', belt='leather', buckle='silver', belt_z=.99, wrist_r=.10,
                      skirt=dict(key='robe', hem=.07, rx=.27, ry=.24, top=1.02, trim='silver', trim_h=.055, tmax=.6), feet='leather', thigh='robe',
                      build=dict(hip=.17, waist=.145, belly=.15, chest=.18, sw=.19),
                      head=dict(jaw=.9, w=.95), face=dict(brow='hair', brow_t=.009, brow_tilt=6, nose=1.0, mouth_w=.024, eye_white=None)))
    # long dark hair: cap + back panel down to the shoulder blades
    hair_cap(mb, 'hair', front=1.755, side=1.56, back=1.50, puff=.016, hw=.95)
    mb.hull([(-.14, .06, 1.66), (.14, .06, 1.66), (-.15, .12, 1.64), (.15, .12, 1.64), (-.14, .10, 1.36), (.14, .10, 1.36), (-.12, .17, 1.34), (.12, .17, 1.34),
             (0, .19, 1.30), (-.10, .16, 1.75), (.10, .16, 1.75)], 'hair', headw_long)
    # tall pointed hat: brim, silver band, bent cone
    mb.loft([rell(0, .01, 1.775, .27, .27, 12), rell(0, .01, 1.795, .26, .26, 12)], 'robe', 'head')
    mb.loft([rell(0, .01, 1.79, .145, .15, 8), rell(0, .01, 1.835, .142, .147, 8)], 'silver', 'head')
    mb.loft([rell(0, .01, 1.835, .142, .147, 8), rell(0, .03, 1.97, .10, .105, 8), rell(0, .07, 2.08, .06, .062, 8),
             rell(0, .13, 2.15, .028, .03, 8), rell(0, .19, 2.17, .004, .004, 8)], 'dark_robe', 'head')
    # silver front trim down the robe + hood folded on the shoulders
    F = o['_front']; sr = o['_skirt']
    P = [(x, F(z) - dy, z) for z in (1.02, 1.44) for x in (-.022, .022) for dy in (.002, .01)]
    mb.hull(P, 'silver', zw)
    P = []
    for z in (1.0, .60, .13):
        ry = sr(z)[1]
        for x in (-.024, .024): P += [(x, -ry + .004 - .005, z), (x, -ry - .012, z)]
    mb.hull(P, 'silver', skirt_w(1.02, .07, .6))
    mb.hull([(-.20, .04, 1.42), (.20, .04, 1.42), (-.16, .17, 1.46), (.16, .17, 1.46), (0, .22, 1.40), (-.12, .18, 1.28), (.12, .18, 1.28), (0, .20, 1.24),
             (-.13, .02, 1.50), (.13, .02, 1.50), (0, .14, 1.52)], 'dark_robe', 'chest')
    # rune pouch on the right hip with a glowing-free silver rune mark
    mb.box((-.2, -.08, .88), (.05, .045, .06), 'leather', 'hips', top=(.75, .8))
    mb.box((-.2, -.085, .945), (.03, .03, .012), 'leather', 'hips')
    mb.box((-.2, -.128, .875), (.016, .004, .02), 'silver', 'hips', rot=(0, 45, 0))

def t_aldous(mb):
    o = body(mb, dict(torso=lambda z, i: 'mustard', upper='mustard', cuff='mustard', belt='dark', buckle='mustard', belt_z=1.0,
                      skirt=dict(key='mustard', hem=.40, rx=.26, top=1.02, jag=.02, seed=9, tmax=.65), boot_h=.30, feet='dark', thigh='trousers',
                      build=dict(hip=.185, waist=.175, belly=.195, bellyf=.02, chest=.21, sw=.21, depth=1.04), shoulder_r=.085, wrist_r=.06,
                      head=dict(jaw=1.02, w=1.0), face=dict(brow='white', brow_t=.017, brow_tilt=-12, nose=1.35, mouth_w=.03, cheeks='ruddy')))
    # mutton-chop whiskers + moustache (chin left clean)
    fy = HEAD_FY
    for x in (-1, 1):
        mb.hull([(x * .138, -.02, 1.69), (x * .148, -.05, 1.57), (x * .12, fy - .01, 1.60), (x * .10, fy - .02, 1.56), (x * .13, -.10, 1.53),
                 (x * .15, .02, 1.60), (x * .115, fy - .005, 1.64)], 'white', 'head')
    mb.hull([(-.085, fy - .02, 1.585), (.085, fy - .02, 1.585), (0, fy - .04, 1.61), (-.06, fy - .01, 1.612), (.06, fy - .01, 1.612),
             (-.1, fy - .012, 1.565), (.1, fy - .012, 1.565), (0, fy - .03, 1.592)], 'white', 'head')
    hair_cap(mb, 'white', front=1.72, side=1.60, back=1.55, puff=.012)
    # knit cap: rolled band + crown
    mb.loft([rbox(0, .005, 1.715, .153, .16), rbox(0, .005, 1.785, .156, .163)], 'navy', 'head')
    mb.loft([rell(0, .01, 1.78, .142, .15, 8), rell(0, .02, 1.86, .135, .14, 8), rell(0, .04, 1.92, .085, .09, 8), rell(0, .05, 1.94, .02, .02, 8)], 'navy', 'head')
    # tall coat collar + buttons
    mb.loft([rbox(0, .015, 1.44, .12, .10), rbox(0, .02, 1.55, .115, .11)], 'mustard', 'chest', cap0=False, cap1=False)
    mb.loft([rbox(0, .02, 1.55, .115, .11), rbox(0, .02, 1.55, .075, .07)], 'mustard', 'chest', cap0=False, cap1=False)
    F = o['_front']
    for z in (1.12, 1.24, 1.36): mb.box((.04, F(z) - .006, z), (.014, .007, .014), 'dark', 'spine' if z < 1.19 else 'chest')
    mb.front_quad(-.004, .004, 1.05, 1.42, F(1.2) - .012, 'dark', zw)
    # lantern hanging from the right hand
    h = J['hand_R'].lerp(JT['hand_R'], .75)
    cx, cy = h.x, h.y - .01
    mb.seg((cx, cy, h.z - .01), (cx, cy, h.z - .075), .012, .012, 'dark', 'hand_R', n=4)
    mb.hull([(cx + dx, cy + dy, z) for dx in (-.06, .06) for dy in (-.06, .06) for z in (.62, .64)] + [(cx, cy, .70)], 'dark', 'hand_R')
    mb.box((cx, cy, .54), (.048, .048, .075), 'glow', 'hand_R')
    for dx in (-.052, .052):
        for dy in (-.052, .052): mb.seg((cx + dx, cy + dy, .455), (cx + dx, cy + dy, .625), .009, .009, 'dark', 'hand_R', n=4)
    mb.box((cx, cy, .45), (.062, .062, .015), 'dark', 'hand_R')

def t_tobin(mb):
    stripes = [.96, 1.02, 1.08, 1.14, 1.20, 1.26, 1.32, 1.38, 1.44]
    def torso(z, i):
        if z < .93: return 'trousers'
        for k, zz in enumerate(stripes):
            if z < zz: return 'navy' if k % 2 else 'white'
        return 'navy'
    o = body(mb, dict(torso=torso, torso_cuts=stripes + [.93], upper_bands=['navy', 'white', 'navy', 'skin'], lower='skin', belt='sash', belt_z=.955,
                      rolled=.36, feet='bare', thigh='trousers', shin='trousers',
                      build=dict(hip=.16, waist=.145, belly=.15, chest=.185, sw=.20),
                      head=dict(jaw=.96, w=.98), face=dict(brow='hair', brow_tilt=-4, nose=.9, mouth_w=.036, smile=True)))
    hair_cap(mb, 'hair', front=1.745, side=1.64, back=1.56, puff=.02, fringe=.025, hw=.98)
    for k, (x, y, z, rz) in enumerate([(-.07, -.08, 1.87, 20), (.02, -.11, 1.86, -15), (.09, -.05, 1.885, -30), (-.03, .04, 1.9, 10), (.08, .08, 1.87, 40)]):
        mb.hull([(x - .04, y - .03, z - .03), (x + .04, y - .02, z - .03), (x, y + .04, z - .03), (x + .01 * math.cos(rz), y - .05, z + .045)], 'hair', 'head')
    # sash tails at the left hip
    mb.box((.15, -.12, .86), (.03, .012, .08), 'sash', 'hips', rot=(0, 15, 0))
    mb.box((.19, -.10, .87), (.028, .012, .07), 'sash', 'hips', rot=(0, -10, 0))
    # coiled rope over the left shoulder, round to the right hip (two turns)
    u = V((-.40, 0, -.76)).normalized()
    for k, (dr, ph) in enumerate(((0, 0), (.035, .6), (.07, 1.1))):
        torus_path(mb, (-.03 - k * .01, -.005, 1.17 + k * .012), u, (0, 1, 0), .35 + dr, .18 + dr * .8, .03, 'rope', 'chest', seg=14, n=5, ph=ph)
    mb.box((-.22, -.16, .95), (.03, .015, .03), 'rope', 'spine')

TUTORS = [
    ('bram', 'Guide Bram', 'Guide House', t_bram, dict(holdR=True),
     dict(skin=SKIN_M, grey=(.70, .70, .66), tunic=(.27, .45, .21), hood=(.18, .32, .15), trousers=(.40, .31, .21), leather=(.36, .22, .12), wood=(.55, .40, .23), dark=DARK)),
    ('wenna', 'Wenna', 'Survival camp', t_wenna, dict(holdR=False),
     dict(skin=SKIN_L, hair=(.62, .25, .11), moss=(.44, .55, .25), jerkin=(.52, .34, .19), trousers=(.30, .24, .18), boots=(.24, .15, .09), iron=(.60, .62, .64), dark=DARK)),
    ('hettie', 'Cook Hettie', 'Bakehouse', t_hettie, dict(holdR=False),
     dict(skin=SKIN_L, hair=(.46, .30, .19), white=(.95, .94, .89), ochre=(.80, .58, .22), flour=(.97, .94, .84), shoes=(.30, .20, .13), cheeks=(.90, .52, .45), dark=DARK)),
    ('ansel', 'Loremaster Ansel', 'Quest Lodge', t_ansel, dict(holdR=False),
     dict(skin=SKIN_M, hair=(.52, .47, .42), robe=(.22, .34, .64), trim=(.13, .19, .40), leather=(.42, .27, .15), book=(.58, .16, .13), paper=(.93, .90, .78), dark=DARK)),
    ('durgin', 'Foreman Durgin', 'Quarry & ore workings', t_durgin, dict(holdR=False),
     dict(skin=SKIN_T, black=(.11, .095, .085), leather=(.40, .26, .14), wax=(.93, .89, .74), flame=('emit', (1.0, .78, .28)), smock=(.47, .47, .46), trousers=(.27, .25, .23), iron=(.55, .57, .60))),
    ('corrick', 'Warden Corrick', "Warden's Keep", t_corrick, dict(holdR=False),
     dict(skin=SKIN_T, hair=(.24, .17, .11), bronze=(.78, .55, .24), leather=(.38, .24, .13), tabard=(.70, .15, .11), under=(.36, .32, .27), dark=DARK)),
    ('maud', 'Teller Maud', 'Holm Bank', t_maud, dict(holdR=False),
     dict(skin=SKIN_L, hair=(.40, .26, .16), blouse=(.93, .89, .77), waistcoat=(.14, .33, .21), skirt=(.24, .25, .29), shoes=(.20, .14, .10), brass=(.84, .66, .26), dark=DARK)),
    ('ilse', 'Magister Ilse', 'Mage Tower', t_ilse, dict(holdR=False),
     dict(skin=SKIN_L, hair=(.17, .13, .16), robe=(.40, .20, .54), dark_robe=(.27, .13, .38), silver=(.82, .84, .88), leather=(.42, .28, .17), dark=DARK)),
    ('aldous', 'Keeper Aldous', 'Lastlight', t_aldous, dict(holdR=True),
     dict(skin=(.76, .52, .40), white=(.94, .94, .92), mustard=(.86, .66, .15), navy=(.17, .23, .40), trousers=(.30, .30, .32), ruddy=(.84, .45, .38), glow=('emit', (1.0, .84, .42)), dark=(.14, .12, .10))),
    ('tobin', 'Ferryman Tobin', 'Departure Haven', t_tobin, dict(holdR=False),
     dict(skin=SKIN_M, hair=(.78, .60, .30), white=(.94, .93, .88), navy=(.18, .26, .50), trousers=(.50, .43, .31), sash=(.72, .20, .14), rope=(.74, .61, .38), dark=DARK)),
]
if ONLY: TUTORS = [t for t in TUTORS if t[0] in ONLY]

# ============================================================================ materials
def make_mat(name, spec):
    emit = None
    if isinstance(spec, tuple) and spec and spec[0] == 'emit': emit = spec[1]; rgb = spec[1]
    else: rgb = spec
    m = bpy.data.materials.new(name); m.use_nodes = True
    bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    base = rgb if emit is None else tuple(c * .3 for c in rgb)
    bs.inputs['Base Color'].default_value = (*base, 1); bs.inputs['Roughness'].default_value = 1.0
    bs.inputs['Metallic'].default_value = 0.
    if 'Specular IOR Level' in bs.inputs: bs.inputs['Specular IOR Level'].default_value = .1
    if emit is not None:
        bs.inputs['Emission Color'].default_value = (*emit, 1); bs.inputs['Emission Strength'].default_value = 1.0
    m.diffuse_color = (*rgb, 1); m.roughness = 1.; m.metallic = 0
    return m

# ============================================================================ animation
def put(P, side, part, e):
    P[f'{part}_{side}'] = e if side == 'R' else (e[0], -e[1], -e[2])

def hold(P, side='R', swing=0.):
    put(P, side, 'uparm', (4 + swing, 3, 0)); put(P, side, 'forearm', (-44, 0, -4)); put(P, side, 'hand', (40 - swing, 0, 0))

def pose_idle(p, o):
    T = math.tau; sw = math.sin(T * p); br = math.sin(2 * T * p)
    P = {'_loc': (.012 * sw, 0, -.002 + .002 * br)}
    P['hips'] = (0, 2 * sw, 0); P['spine'] = (1. * br, -1 * sw, 0); P['chest'] = (1.6 * br, -1 * sw, 0)
    P['neck'] = (0, 0, 2 * math.sin(T * p + 1)); P['head'] = (2 * math.sin(2 * T * p + 1.2), .8 * sw, 4 * math.sin(T * p + .8))
    P['thigh_L'] = P['thigh_R'] = (0, -2 * sw, 0)
    for s, ph in (('R', 0), ('L', 1.3)):
        put(P, s, 'uparm', (-3 + 1.2 * math.sin(2 * T * p + ph), 4 + 1.2 * math.sin(2 * T * p + ph), 0))
        put(P, s, 'forearm', (-10 - 2.5 * math.sin(2 * T * p + ph + .5), 0, 0)); put(P, s, 'hand', (-4, 0, 4))
    if o['holdR']: hold(P, 'R', 1.2 * br)
    return P

def pose_talk(p, o):
    T = math.tau; f = T * p
    P = {'_loc': (.006 * math.sin(f), 0, 0)}
    P['hips'] = (0, 1 * math.sin(f), 0); P['thigh_L'] = P['thigh_R'] = (0, -1 * math.sin(f), 0)
    P['spine'] = (1.2 * math.sin(2 * f), 0, 1.5 * math.sin(f)); P['chest'] = (2.5, 0, 3.5 * math.sin(f))
    P['neck'] = (1.5 * math.sin(2 * f + .5), 0, 0)
    P['head'] = (6 * max(0., math.sin(2 * f)) - 2, 1.5 * math.sin(f + .7), 4 * math.sin(f + .3))
    G, O = ('L', 'R') if o['holdR'] else ('R', 'L')
    put(P, G, 'shoulder', (0, 3 + 2 * math.sin(2 * f), 0))
    put(P, G, 'uparm', (-26 - 8 * math.sin(f), 12 + 4 * math.sin(2 * f), 0))
    put(P, G, 'forearm', (-52 - 18 * math.sin(2 * f + .6), 0, -8))
    put(P, G, 'hand', (-8 + 14 * math.sin(2 * f + 1), 0, 18 * math.sin(f)))
    if o['holdR']: hold(P, 'R', 2 * math.sin(f))
    else:
        q = max(0., math.sin(f + math.pi))
        put(P, O, 'uparm', (-8 - 10 * q, 6, 0)); put(P, O, 'forearm', (-22 - 26 * q, 0, 0)); put(P, O, 'hand', (-6, 0, 10 * q))
    return P

def pose_walk(p, o):
    f = math.tau * p; s = math.sin(f); c = math.cos(f)
    P = {'_loc': (0, 0, .014 * math.cos(2 * f) - .01)}
    P['hips'] = (0, 0, 5 * s); P['spine'] = (1.5, 0, -2 * s); P['chest'] = (3, 0, -5 * s); P['head'] = (-2, 0, 2 * s)
    P['thigh_L'] = (-26 * s, 0, -5 * s); P['thigh_R'] = (26 * s, 0, -5 * s)
    P['shin_L'] = (5 + 42 * max(0., -c), 0, 0); P['shin_R'] = (5 + 42 * max(0., c), 0, 0)
    for side in 'LR':
        P[f'foot_{side}'] = (-(P[f'thigh_{side}'][0] + P[f'shin_{side}'][0]) * .75, 0, 0)
    P['uparm_L'] = (22 * s, -5, 0); P['forearm_L'] = (-14 - 14 * max(0., -s), 0, 0)
    P['uparm_R'] = (-22 * s, 5, 0); P['forearm_R'] = (-14 - 14 * max(0., s), 0, 0)
    P['hand_L'] = P['hand_R'] = (-4, 0, 0)
    if o['holdR']: hold(P, 'R', -6 * s)
    return P

def smooth(x): x = clamp(x); return x * x * (3 - 2 * x)

def pose_wave(p, o):
    e = smooth(p / .22) * (1 - smooth((p - .8) / .2))
    osc = math.sin(math.tau * 3 * clamp((p - .2) / .6)) * smooth((p - .15) / .12) * (1 - smooth((p - .78) / .1))
    P = pose_idle(0., o)
    W = 'L' if o['holdR'] else 'R'
    put(P, W, 'shoulder', (0, 9 * e, 0))
    put(P, W, 'uparm', (-14 * e, 100 * e, 0))
    put(P, W, 'forearm', (-8 * e, (58 + 26 * osc) * e, 0))
    put(P, W, 'hand', (0, 10 * osc * e, 0))
    P['chest'] = (1.5 * e, (-4 if W == 'R' else 4) * e, (4 if W == 'R' else -4) * e)
    P['head'] = (-5 * e, (3 if W == 'R' else -3) * e, (-6 if W == 'R' else 6) * e)
    return P

POSES = {'idle': pose_idle, 'talk': pose_talk, 'walk': pose_walk, 'wave': pose_wave}

def bake_clips(arm, tid, opts):
    rest = {b.name: b.matrix_local.to_3x3() for b in arm.data.bones}
    ad = arm.animation_data_create()
    for clip, nf in CLIPS.items():
        act = bpy.data.actions.new(f'{tid}__{clip}'); act.use_fake_user = True
        ad.action = act
        for fr in range(1, nf + 1):
            P = POSES[clip]((fr - 1) / (nf - 1), opts)
            for bn in BONE_NAMES:
                e = P.get(bn, (0, 0, 0)); B = rest[bn]
                Q = Euler([math.radians(a) for a in e], 'XYZ').to_matrix()
                pb = arm.pose.bones[bn]; pb.rotation_quaternion = (B.inverted() @ Q @ B).to_quaternion()
                pb.keyframe_insert('rotation_quaternion', frame=fr, group=bn)
            pb = arm.pose.bones['hips']; pb.location = rest['hips'].inverted() @ V(P.get('_loc', (0, 0, 0)))
            pb.keyframe_insert('location', frame=fr, group='hips')
        ad.action = None
        tr = ad.nla_tracks.new(); tr.name = clip
        st = tr.strips.new(clip, 1, act); st.name = clip
    for pb in arm.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)

# ============================================================================ build all
built = []
for tid, name, place, fn, opts, pal in TUTORS:
    full = f'holm_tutor_{tid}'
    coll = bpy.data.collections.new(full); scene.collection.children.link(coll)
    arm = make_rig(f'{full}_rig', coll)
    mb = MB(); fn(mb)
    keys = list(dict.fromkeys(mb.mk))
    missing = [k for k in keys if k not in pal]; assert not missing, (tid, missing)
    me = bpy.data.meshes.new(full); me.from_pydata([tuple(v) for v in mb.v], [], mb.f)
    for k in keys: me.materials.append(make_mat(f'{tid}_{k}', pal[k]))
    me.polygons.foreach_set('material_index', [keys.index(k) for k in mb.mk])
    for p in me.polygons: p.use_smooth = False
    me.validate(); me.update()
    ob = bpy.data.objects.new(full, me); coll.objects.link(ob)
    for bn in BONE_NAMES: ob.vertex_groups.new(name=bn)
    for i, wd in enumerate(mb.w):
        for bn, val in wd.items(): ob.vertex_groups[bn].add([i], val, 'REPLACE')
    ob.parent = arm; mod = ob.modifiers.new('Armature', 'ARMATURE'); mod.object = arm
    bake_clips(arm, tid, opts)
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    zmax = max(v.co.z for v in me.vertices); zmin = min(v.co.z for v in me.vertices)
    print(f'[HOLM_TUTORS] built {full}: {tris} tris, {len(keys)} mats {keys}, height {zmax - zmin:.3f}')
    assert tris <= BUDGET['triangles'], (tid, tris)
    assert len(keys) <= BUDGET['materials'], (tid, keys)
    built.append(dict(id=tid, full=full, name=name, place=place, arm=arm, mesh=ob, tris=tris, mats=keys, height=round(zmax - zmin, 3), opts=opts))

# ============================================================================ export (all at origin)
for t in built:
    bpy.ops.object.select_all(action='DESELECT')
    t['arm'].select_set(True); t['mesh'].select_set(True); bpy.context.view_layer.objects.active = t['arm']
    for tr in t['arm'].animation_data.nla_tracks: tr.mute = False
    path = MODELS / f"{t['full']}.glb"
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
                              export_texcoords=False, export_normals=True, export_materials='EXPORT', export_skins=True, export_morph=False,
                              export_animations=True, export_animation_mode='NLA_TRACKS', export_nla_strips=True, export_force_sampling=True,
                              export_def_bones=False, export_extras=False)
    t['glb'] = path
    print('[HOLM_TUTORS] exported', path)

# lineup placement for the saved .blend + renders
SPACING = 1.0
for k, t in enumerate(built):
    t['x'] = 1.2 + k * SPACING; t['arm'].location = (t['x'], 0, 0)
    for tr in t['arm'].animation_data.nla_tracks: tr.mute = tr.name != 'idle'
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(WS / 'tutors.blend'))

# ============================================================================ proof renders
if DO_RENDER:
    import numpy as np
    RENDER.mkdir(parents=True, exist_ok=True)
    for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
        try: scene.render.engine = eng; break
        except TypeError: pass
    try: scene.eevee.taa_render_samples = 24
    except Exception: pass
    vts = [i.identifier for i in scene.view_settings.bl_rna.properties['view_transform'].enum_items]
    scene.view_settings.view_transform = 'Raw' if 'Raw' in vts else 'Standard'
    scene.world = bpy.data.worlds.new('Studio'); scene.world.use_nodes = True
    bg = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs[0].default_value = (.62, .7, .8, 1); bg.inputs[1].default_value = .45
    def flat(nm, rgb):
        m = bpy.data.materials.new(nm); m.use_nodes = True
        bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        bs.inputs['Base Color'].default_value = (*rgb, 1); bs.inputs['Roughness'].default_value = 1; return m
    ground_m = flat('ground', (.36, .46, .2)); cap_m = flat('capsule', (.55, .62, .75)); ink = flat('label', (.08, .1, .06))
    bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, 0)); bpy.context.object.data.materials.append(ground_m)
    sun = bpy.data.objects.new('Key', bpy.data.lights.new('Key', 'SUN')); sun.data.energy = 1.05; sun.data.angle = .08
    sun.rotation_euler = (math.radians(48), 0, math.radians(-38)); scene.collection.objects.link(sun)
    fill = bpy.data.objects.new('Fill', bpy.data.lights.new('Fill', 'SUN')); fill.data.energy = .3
    fill.rotation_euler = (math.radians(65), 0, math.radians(150)); scene.collection.objects.link(fill)
    objs = []
    bpy.ops.mesh.primitive_cylinder_add(radius=.24, depth=1.42, location=(0, 0, .95), vertices=16); objs.append(bpy.context.object)
    for z in (.24, 1.66):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=.24, location=(0, 0, z), segments=16, ring_count=8); objs.append(bpy.context.object)
    for ob_ in objs: ob_.data.materials.append(cap_m)
    def label(txt, x, y, size=.13):
        cu = bpy.data.curves.new('lbl', 'FONT'); cu.body = txt; cu.size = size; cu.align_x = 'CENTER'
        ob_ = bpy.data.objects.new('lbl_' + txt, cu); ob_.location = (x, y, .005); cu.materials.append(ink); scene.collection.objects.link(ob_)
    label('1.9 capsule', 0, -.75)
    for t in built: label(t['name'], t['x'], -.75 if built.index(t) % 2 == 0 else -1.0)
    def cam(loc, tgt, ortho=None, lens=50):
        c = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam')); scene.collection.objects.link(c); c.location = loc
        c.rotation_euler = (V(tgt) - V(loc)).to_track_quat('-Z', 'Y').to_euler()
        if ortho: c.data.type = 'ORTHO'; c.data.ortho_scale = ortho
        else: c.data.lens = lens
        scene.camera = c; return c
    def shot(path, w, h):
        scene.render.resolution_x = w; scene.render.resolution_y = h; scene.render.resolution_percentage = 100
        scene.render.filepath = str(path); bpy.ops.render.render(write_still=True)
    def px(p):
        im = bpy.data.images.load(str(p)); a = np.empty(im.size[0] * im.size[1] * 4, dtype=np.float32); im.pixels.foreach_get(a)
        return a.reshape(im.size[1], im.size[0], 4)
    def save(arr, path):
        h, w = arr.shape[:2]; im = bpy.data.images.new(path.stem, w, h); im.pixels.foreach_set(arr.ravel())
        im.filepath_raw = str(path); im.file_format = 'PNG'; im.save()
    # 1) lineup at the game camera (high 3/4 from the front-right)
    xend = built[-1]['x'] + .6; mid = xend / 2 - .2
    cam((mid + 2.6, -12.0, 11.0), (mid, 0, .75), ortho=xend + 1.3); shot(RENDER / 'lineup.png', 2400, 1000)
    # 2) one tutor in the four clips (isolated off to the side)
    focus = next((t for t in built if t['id'] == 'wenna'), built[0])
    focus['arm'].location = (0, 40, 0)
    keyf = {'idle': 16, 'talk': 13, 'walk': 7, 'wave': 13}
    clip_imgs = []
    for clip, fr in keyf.items():
        for tr in focus['arm'].animation_data.nla_tracks: tr.mute = tr.name != clip
        scene.frame_set(fr)
        cam((1.55, 40 - 3.3, 2.75), (0, 40, .95), lens=50)
        label_ob = bpy.data.objects.new('lbl_clip', bpy.data.curves.new('lblc', 'FONT')); label_ob.data.body = f'{clip}  (frame {fr})'
        label_ob.data.size = .14; label_ob.data.align_x = 'CENTER'; label_ob.location = (0, 40 - .6, .005); label_ob.data.materials.append(ink)
        scene.collection.objects.link(label_ob)
        shot(RENDER / f'clip_{clip}.png', 600, 700); clip_imgs.append(RENDER / f'clip_{clip}.png')
        bpy.data.objects.remove(label_ob)
    for tr in focus['arm'].animation_data.nla_tracks: tr.mute = tr.name != 'idle'
    focus['arm'].location = (focus['x'], 0, 0); scene.frame_set(1)
    # 3) per-tutor 3/4 portraits (for face/costume review)
    port = []
    for t in built:
        t['arm'].location = (0, 40, 0); scene.frame_set(1)
        cam((1.35, 40 - 2.9, 2.55), (0, 40, 1.05), lens=50); shot(RENDER / f"portrait_{t['id']}.png", 480, 700)
        port.append(RENDER / f"portrait_{t['id']}.png"); t['arm'].location = (t['x'], 0, 0)
    scene.frame_set(1)
    L = px(RENDER / 'lineup.png'); C = [px(p) for p in clip_imgs]
    clips_row = np.concatenate(C, axis=1); save(clips_row, RENDER / 'clips.png')
    sheet = np.ones((1000 + 700, 2400, 4), dtype=np.float32)
    sheet[700:] = L; sheet[:700, :clips_row.shape[1]] = clips_row
    save(sheet, RENDER / 'sheet.png')
    Pp = [px(p) for p in port]
    while len(Pp) % 5: Pp.append(np.ones_like(Pp[0]))
    rows = [np.concatenate(Pp[i:i + 5], axis=1) for i in range(0, len(Pp), 5)]
    save(np.concatenate(rows[::-1], axis=0), RENDER / 'portraits.png')
    print('[HOLM_TUTORS] renders ->', RENDER)

# ============================================================================ validation: re-import every GLB
def glb_json(path):
    raw = path.read_bytes(); n, _ = struct.unpack_from('<II', raw, 12); return json.loads(raw[20:20 + n]), raw
results = []
for t in built:
    doc, raw = glb_json(t['glb']); acc = doc['accessors']
    prims = [p for m in doc['meshes'] for p in m['primitives']]
    gtris = sum(acc[p['indices']]['count'] // 3 for p in prims)
    clips = {}
    for a in doc.get('animations', []):
        ins = [acc[s['input']] for s in a['samplers']]
        clips[a['name']] = round(max(i['max'][0] for i in ins) - min(i['min'][0] for i in ins), 4)
    pos = [acc[p['attributes']['POSITION']] for p in prims]
    height = round(max(a['max'][1] for a in pos) - min(a['min'][1] for a in pos), 3)
    assert doc.get('skins') and any('skin' in n and 'mesh' in n for n in doc['nodes']), (t['id'], 'no skinned mesh')
    assert all('JOINTS_0' in p['attributes'] and 'WEIGHTS_0' in p['attributes'] for p in prims), t['id']
    assert set(clips) == set(CLIPS), (t['id'], clips)
    assert all(d > 0 for d in clips.values()), (t['id'], clips)
    assert gtris == t['tris'] and gtris <= BUDGET['triangles'], (t['id'], gtris, t['tris'])
    assert len(doc['materials']) <= BUDGET['materials'], (t['id'], len(doc['materials']))
    nj = len(doc['skins'][0]['joints']); assert nj <= BUDGET['bones'], (t['id'], nj)
    # Blender round-trip import
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(t['glb']))
    arms = [o for o in bpy.data.objects if o.type == 'ARMATURE']
    skinned = [o for o in bpy.data.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' and m.object for m in o.modifiers) and o.vertex_groups]
    acts = [a.name for a in bpy.data.actions]
    assert len(arms) == 1 and skinned, (t['id'], arms, skinned)
    for c in CLIPS: assert any(a == c or a.startswith(c + '_') or a.startswith(c + '.') for a in acts), (t['id'], c, acts)
    itris = sum(len(p.vertices) - 2 for o in skinned for p in o.data.polygons)
    assert itris == gtris, (t['id'], itris, gtris)
    print(f"[HOLM_TUTORS] VALID {t['full']}: {gtris} tris, {len(doc['materials'])} mats, {nj} joints, clips {clips}, reimport actions {sorted(acts)}")
    results.append(dict(id=t['full'], name=t['name'], location=t['place'], file=str(t['glb'].relative_to(ROOT)).replace('\\', '/'),
                        triangles=gtris, materials=len(doc['materials']), materialNames=[m['name'] for m in doc['materials']],
                        bones=nj, boneNames=BONE_NAMES, clips=[{'name': c, 'seconds': clips[c], 'loop': c != 'wave'} for c in CLIPS],
                        height=height, heightNote='rest-pose bbox incl. headwear/props (use as glbHeight to keep 1:1 scale)',
                        forwardAxis='+Z (glTF) == -Y (Blender); character left = +X', holdsRightHand=t['opts']['holdR'],
                        sha256=hashlib.sha256(raw).hexdigest()))

manifest = dict(pack='holm-tutors-v1', status='candidate', source='tools/blender/build_holm_tutors_v1.py', blender='4.5',
                fps=FPS, colourRule='material colours authored as seen sRGB; roughness 1; metallic 0; emission strength 1.0',
                rig=dict(bones=len(BONE_NAMES), names=BONE_NAMES, skinning='rigid per part; skirts blend hips->thighs'),
                budget=BUDGET, tutors=results)
(WS / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf8')

REVIEW = [
    'Ten distinct silhouettes from the game camera: hood+staff, braid+hatchet, puffy cap+apron, specs+blue robe, candle cap+pick, pauldrons+tabard, bun+waistcoat, pointed hat, mustard coat+lantern, stripes+rope.',
    'Rigid per-part skinning (2004-style) shows small creases at elbows/knees in extreme poses; robes blend to thighs so long hems swing with the stride.',
    'Heights include headwear (Ilse ~2.17 with hat, Bram ~2.0 with staff): set glbHeight from manifest height so the runtime does not shrink them.',
]
lines = ['# Holm tutors v1 - build report', '', 'Generated by `tools/blender/build_holm_tutors_v1.py` (Blender 4.5 headless). Candidate only; not wired into the game.', '',
         '## Conventions', '', '- Forward: glTF **+Z** (Blender -Y), matching `assets/models/v07.glb`; character left = +X.',
         f'- Shared rig: {len(BONE_NAMES)} bones (`' + '`, `'.join(BONE_NAMES) + '`).',
         '- Clips (exact names): `idle` 2.5 s loop, `talk` 2.0 s loop, `walk` 1.0 s in-place loop, `wave` 1.21 s one-shot (starts/ends at rest).',
         '- Colours authored as seen sRGB, roughness 1, metallic 0; flame/lantern glass use emission strength 1.0.',
         '- Runtime: `charNpcModel` plays `idle`/`walk` by name; `talk`/`wave` are extra clips for dialogue/greeting hooks.', '',
         '## Tutors', '', '| id | name | location | tris | mats | bones | height | clips |', '|---|---|---|---|---|---|---|---|']
for r in results:
    lines.append(f"| `{r['id']}` | {r['name']} | {r['location']} | {r['triangles']} | {r['materials']} | {r['bones']} | {r['height']} | " +
                 ', '.join(f"{c['name']} {c['seconds']}s" for c in r['clips']) + ' |')
lines += ['', '## Validation', '', 'Every GLB was re-imported (JSON parse + Blender glTF import): skinned mesh with JOINTS/WEIGHTS present, exactly the 4 clips with non-zero duration,',
          f"triangles <= {BUDGET['triangles']}, materials <= {BUDGET['materials']}, joints <= {BUDGET['bones']}; re-imported triangle count equals the built count.", '',
          '## Proof renders', '', '`scratchpad/holm_tutors_v1/`: `lineup.png` (game camera 3/4, 1.9 capsule), `clips.png` (Wenna in idle/talk/walk/wave), `portraits.png`, `sheet.png`.', '',
          '## Self-review', ''] + [f'- {x}' for x in REVIEW] + ['']
(WS / 'REPORT.md').write_text('\n'.join(lines), encoding='utf8')
print('[HOLM_TUTORS] PASS', len(results), 'tutors ->', WS)
