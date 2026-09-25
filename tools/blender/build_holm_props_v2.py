"""Holm prop pack v2 (lesson props): original hand-designed low-poly props (Blender 4.5, headless).

Usage: blender -b --python tools/blender/build_holm_props_v2.py [-- --render <dir>]
Outputs .studio-workspaces/holm-props-v2/candidates/{props.glb,props.blend,manifest.json}.
One named root Empty per asset (runtime clones by root name). Blender Z-up is exported as glTF Y-up;
1 unit = 1 tile; origin at ground-contact centre. Flat material colours only (no image textures).
COLOUR RULE (differs from v1): the game draws material colours as authored sRGB with no colour
management, so base / diffuse / emissive colours are written as the sRGB values we want to SEE
(no linear conversion). Emission strength is never above 1.0 (the runtime refuses
KHR_materials_emissive_strength). Deterministic: every random draw comes from a seeded random.Random.
"""
import bpy, bmesh, math, random, json, struct, hashlib, sys
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.studio-workspaces/holm-props-v2/candidates'
OUT.mkdir(parents=True, exist_ok=True)
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
RENDER = Path(argv[argv.index('--render') + 1]).resolve() if '--render' in argv else None
bpy.ops.wm.read_factory_settings(use_empty=True)

# ---------------------------------------------------------------- materials (authored sRGB, used as-is)
PALETTE = {
    'bark':        (.27, .205, .135),   # = tree-family oak-bark
    'wood-cut':    (.66, .53, .34),     # fresh pale end grain
    'wood-ring':   (.50, .37, .22),     # growth-ring band on the cut face
    'char':        (.14, .115, .10),    # burnt log ends, ash bed
    'rock':        (.53, .47, .39),     # warm gray-brown mining rock
    'rock-dark':   (.39, .34, .28),
    'rock-spent':  (.25, .23, .21),     # broken, mined-out top + rubble
    'ore-copper':  (.84, .48, .22),
    'ore-tin':     (.78, .80, .82),
    'ripple':      (.84, .92, .97),     # pale blue-white foam
}
EMISSIVE = {                             # emission colour; strength stays exactly 1.0
    'flame-orange': (.96, .46, .10),
    'flame-yellow': (1.0, .84, .30),
}
MAT = {}
def make_mat(name, rgb, emit=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    base = rgb if emit is None else tuple(c * .3 for c in rgb)   # emissive carries the colour; dim base avoids blow-out
    bs.inputs['Base Color'].default_value = (*base, 1); bs.inputs['Roughness'].default_value = .95
    if 'Specular IOR Level' in bs.inputs: bs.inputs['Specular IOR Level'].default_value = .12
    if emit is not None:
        bs.inputs['Emission Color'].default_value = (*emit, 1); bs.inputs['Emission Strength'].default_value = 1.0
    m.diffuse_color = (*rgb, 1); m.roughness = .95; m.metallic = 0
    MAT[name] = m
for k, v in PALETTE.items(): make_mat(k, v)
for k, v in EMISSIVE.items(): make_mat(k, v, emit=v)

# ---------------------------------------------------------------- mesh builder (same as v1)
class M:
    def __init__(s): s.v = []; s.f = []; s.mi = []
    def add(s, vs, fs, mats):
        k = len(s.v); s.v += [Vector(v) for v in vs]
        for n, f in enumerate(fs):
            s.f.append(tuple(k + i for i in f)); s.mi.append(mats[n] if isinstance(mats, (list, tuple)) else mats)
    def tris(s): return sum(len(f) - 2 for f in s.f)

    def loft(s, rings, side, cap0=None, cap1=None, inset0=None, inset1=None):
        n = len(rings[0]); k = len(s.v); vs = [p for r in rings for p in r]; fs = []; ms = []
        for j in range(len(rings) - 1):
            for i in range(n):
                fs.append((j*n+i, j*n+(i+1) % n, (j+1)*n+(i+1) % n, (j+1)*n+i))
                ms.append(side(j, i) if callable(side) else side)
        s.add(vs, fs, ms)
        if cap1: s.cap([k + (len(rings)-1)*n + i for i in range(n)], cap1, inset1)
        if cap0: s.cap([k + i for i in reversed(range(n))], cap0, inset0)
        return k

    def cap(s, ring, mat, inset=None):
        if not inset: s.f.append(tuple(ring)); s.mi.append(mat); return
        rim, sc, depth = inset
        pts = [s.v[i] for i in ring]; c = sum(pts, Vector()) / len(pts)
        nrm = Vector()
        for a, b in zip(pts, pts[1:] + pts[:1]): nrm += (a - c).cross(b - c)
        nrm.normalize(); k = len(s.v)
        s.v += [c + (p - c) * sc - nrm * depth for p in pts]
        n = len(ring)
        for i in range(n):
            s.f.append((ring[i], ring[(i+1) % n], k + (i+1) % n, k + i)); s.mi.append(rim)
        s.f.append(tuple(k + i for i in range(n))); s.mi.append(mat)

    def tube(s, pts, radii, n, side, seed=0, jit=0., phase=0., cap0=None, cap1=None, inset0=None, inset1=None, ring_hook=None):
        rng = random.Random(seed); P = [Vector(p) for p in pts]; rings = []
        for j, p in enumerate(P):
            t = (P[min(j+1, len(P)-1)] - P[max(j-1, 0)]).normalized()
            up = Vector((0, 0, 1)) if abs(t.z) < .9 else Vector((1, 0, 0))
            a = t.cross(up).normalized(); b = t.cross(a).normalized()
            ring = []
            for i in range(n):
                ang = math.tau * i / n + phase + j * .13
                ring.append(p + (a * math.cos(ang) + b * math.sin(ang)) * radii[j] * (1 + rng.uniform(-jit, jit)))
            if ring_hook: ring = ring_hook(j, ring, t)
            rings.append(ring)
        return s.loft(rings, side, cap0, cap1, inset0, inset1)

    def hull(s, pts, matfn):
        bm = bmesh.new()
        for p in pts: bm.verts.new(p)
        r = bmesh.ops.convex_hull(bm, input=list(bm.verts), use_existing_faces=False)
        junk = list(dict.fromkeys(g for g in r['geom_interior'] + r['geom_unused'] if isinstance(g, bmesh.types.BMVert)))
        if junk: bmesh.ops.delete(bm, geom=junk, context='VERTS')
        bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(2.5), verts=bm.verts[:], edges=bm.edges[:])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        bm.verts.index_update()
        vs = [v.co.copy() for v in bm.verts]
        fs = [tuple(v.index for v in f.verts) for f in bm.faces]
        ms = [matfn(f.normal.copy(), f.calc_center_median()) for f in bm.faces]
        bm.free(); s.add(vs, fs, ms)

    def pyramid(s, base, apex, mat):
        n = len(base); k = len(s.v); s.v += [Vector(p) for p in base] + [Vector(apex)]
        for i in range(n): s.f.append((k+i, k+(i+1) % n, k+n)); s.mi.append(mat)

def blob(c, s, seed, n=14, cuts=2, floor=None, flat_top=None, jit=(.84, 1.06), cut=(.58, .8)):
    """Irregular faceted polyhedron points: jittered fibonacci shell, planar cuts, optional floor (v1)."""
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

def hsh(c, k=3):
    """Deterministic per-face pick from a face centre (no RNG state)."""
    return int(abs(c.x * 971 + c.y * 577 + c.z * 313)) % k

def chip(m, loc, nrm, size, seed, mat, flat=.5, n=8):
    """A faceted ore/rubble chip seated on a surface point, flattened along the surface normal."""
    rng = random.Random(seed)
    pts = blob((0, 0, 0), (size, size * rng.uniform(.6, .85), size * flat), seed, n=n, cuts=1, cut=(.6, .8))
    q = Vector((0, 0, 1)).rotation_difference(nrm); rz = Matrix.Rotation(rng.uniform(0, math.tau), 3, 'Z')
    c = Vector(loc) + nrm * size * flat * .25
    m.hull([c + q @ (rz @ p) for p in pts], lambda nn, cc: mat)

# ---------------------------------------------------------------- assets
assets = []   # (name, habitat, [(mesh_name, M)])
def asset(name, habitat, parts): assets.append((name, habitat, parts))

# 1. tree-stump: chopped oak stump, slanted axe cut, bark rim + pale face + ring band, splinters, root flares
stp = M(); rng = random.Random(301); N = 9; a0 = .7
def sring(z, r, tilt=0., rj=.06):
    out = []
    for i in range(N):
        a = math.tau * i / N + .2
        rr = r * (1 + rng.uniform(-rj, rj))
        out.append(Vector((math.cos(a) * rr, math.sin(a) * rr, z + tilt * math.cos(a - a0) + rng.uniform(-.006, .006))))
    return out
rings = [sring(-.04, .35), sring(.05, .31), sring(.2, .265), sring(.405, .255, tilt=.04)]
k = stp.loft(rings, 'bark', cap0='bark')
top = [k + 3 * N + i for i in range(N)]
T = [stp.v[i] for i in top]; c = sum(T, Vector()) / N
def ring_at(sc, dz):
    kk = len(stp.v); stp.v += [c + (p - c) * sc + Vector((0, 0, dz)) for p in T]; return list(range(kk, kk + N))
R1, R2, R3 = ring_at(.84, -.012), ring_at(.56, -.008), ring_at(.42, -.006)
for A, B, mat in ((top, R1, 'bark'), (R1, R2, 'wood-cut'), (R2, R3, 'wood-ring')):
    for i in range(N): stp.f.append((A[i], A[(i+1) % N], B[(i+1) % N], B[i])); stp.mi.append(mat)
stp.f.append(tuple(R3)); stp.mi.append('wood-cut')
# torn splinters on the high side of the axe cut (where the tree fell away)
for j, (sc, h, w) in enumerate([(.72, .11, .045), (.5, .075, .04), (.86, .07, .035)]):
    ang = a0 + (j - 1) * .45
    p = c + Vector((math.cos(ang), math.sin(ang), 0)) * .255 * sc
    p.z = c.z + .04 * math.cos(ang - a0) * sc - .01
    t = Vector((-math.sin(ang), math.cos(ang), 0)); r = Vector((math.cos(ang), math.sin(ang), 0))
    stp.pyramid([p - t * w - r * .02, p + r * .03, p + t * w - r * .02][::-1], p + Vector((0, 0, h)) + r * .02, 'wood-cut')
# root flares: splayed buttress roots, like the tree-family oak base
for i in range(4):
    a = math.tau * i / 4 + .45 + rng.uniform(-.3, .3)
    d = Vector((math.cos(a), math.sin(a), 0))
    stp.tube([d * .2 + Vector((0, 0, .15)), d * .33 + Vector((0, 0, .045)), d * .43 + Vector((0, 0, -.025))],
             [.1, .065, .022], 5, 'bark', seed=320 + i, jit=.08)
asset('tree-stump', 'Chopped oak stump; swapped in where a lesson tree is felled (tree-family oak bark)',
      [('tree-stump_Stump', stp)])

# 2/3. ore rocks: one shared silhouette (main mass + shoulder), ore chips raycast onto the outer surface
RCTR = Vector((0, 0, .4))
def rock_pts():
    main = blob((0, .02, .45), (.56, .5, .52), 201, n=28, cuts=7, floor=-.05, flat_top=.9, jit=(.8, 1.08), cut=(.55, .8))
    sh = blob((.33, -.25, .13), (.27, .24, .2), 202, n=14, cuts=4, floor=-.04, flat_top=.62, jit=(.8, 1.06), cut=(.5, .72))
    sh += blob((-.35, .2, .07), (.22, .2, .16), 203, n=12, cuts=3, floor=-.03, flat_top=.55, cut=(.5, .72))
    return main, sh
def rockmat(nrm, cc):
    if nrm.z < -.1: return 'rock-dark'
    if nrm.z < .45 and hsh(cc) == 0: return 'rock-dark'
    return 'rock'
def base_rock():
    m = M(); main, sh = rock_pts(); m.hull(main, rockmat); m.hull(sh[:14], rockmat); m.hull(sh[14:], rockmat); return m
def caster(m):
    return BVHTree.FromPolygons([tuple(v) for v in m.v], m.f)
def hit(bvh, az, el):
    d = Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el)))
    loc, nrm, _, _ = bvh.ray_cast(RCTR + d * 3, -d)
    return loc, (nrm if nrm.dot(d) > 0 else -nrm)
VEINS = [  # (az, el, d_az, d_el, chips, size)
    (-.35, .15, .17, .13, 4, .1), (1.5, .45, .2, -.12, 3, .095), (2.6, -.02, .16, .16, 4, .1),
    (3.9, .25, .2, .1, 3, .09), (4.9, .05, .18, .16, 3, .095), (.6, 1.05, .9, .08, 3, .1),
]
SINGLES = [(.9, .2, .08), (3.3, .6, .075), (5.6, .5, .08), (2.1, 1.2, .085)]
def ore_rock(mat, seed):
    m = base_rock(); ore = M(); bvh = caster(m); r = random.Random(seed); s = 0
    for az, el, daz, dele, n, sz in VEINS:
        for j in range(n):
            loc, nrm = hit(bvh, az + daz * j + r.uniform(-.04, .04), el + dele * j + r.uniform(-.04, .04))
            chip(ore, loc, nrm, sz * r.uniform(.8, 1.15), seed + s, mat); s += 1
    for az, el, sz in SINGLES:
        loc, nrm = hit(bvh, az, el); chip(ore, loc, nrm, sz, seed + s, mat); s += 1
    return m, ore
cu_rock, cu_ore = ore_rock('ore-copper', 400)
asset('ore-rock-copper', 'Waist-high mining rock with orange copper veins; lesson mining spot',
      [('ore-rock-copper_Rock', cu_rock), ('ore-rock-copper_Ore', cu_ore)])
tn_rock, tn_ore = ore_rock('ore-tin', 500)
asset('ore-rock-tin', 'Waist-high mining rock with pale silver-gray tin veins; lesson mining spot',
      [('ore-rock-tin_Rock', tn_rock), ('ore-rock-tin_Ore', tn_ore)])

# depleted: same points, top broken down by tilted cuts, darker rubbly top, loose rubble chunks
dp = M(); main, sh = rock_pts(); rr = random.Random(610)
for nrm, p0 in [(Vector((.35, .2, 1)).normalized(), Vector((0, 0, .74))), (Vector((-.55, .1, 1)).normalized(), Vector((0, 0, .72))),
                (Vector((.05, -.6, 1)).normalized(), Vector((0, 0, .7))), (Vector((0, .7, 1)).normalized(), Vector((0, 0, .7)))]:
    for p in main:
        d = (p - p0).dot(nrm)
        if d > 0: p -= nrm * d
def spentmat(nrm, cc):
    if nrm.z > .5 and cc.z > .5: return 'rock-spent'
    return rockmat(nrm, cc)
dp.hull(main, spentmat); dp.hull(sh[:14], rockmat); dp.hull(sh[14:], rockmat)
bvh = caster(dp); rub = M()
for i in range(9):
    x, y = rr.uniform(-.3, .3), rr.uniform(-.28, .3)
    loc, nrm, _, _ = bvh.ray_cast(Vector((x, y, 3)), Vector((0, 0, -1)))
    if loc is None: continue
    chip(rub, loc, Vector((0, 0, 1)).lerp(nrm, .5).normalized(), rr.uniform(.07, .12), 620 + i,
         'rock-spent' if i % 3 else 'rock-dark', flat=.7, n=8)
for i, (a, rad) in enumerate([(2.4, .62), (3.4, .6), (4.6, .58), (1.2, .55)]):
    p = Vector((math.cos(a) * rad, math.sin(a) * rad, .03))
    rub.hull(blob(p, (.08, .07, .06), 640 + i, n=8, cuts=1, floor=-.02), lambda nn, cc, k=i: 'rock-dark' if k % 2 else 'rock-spent')
asset('ore-rock-depleted', 'Mined-out rock (same silhouette, no ore, dark broken rubbly top); swap in after mining',
      [('ore-rock-depleted_Rock', dp), ('ore-rock-depleted_Rubble', rub)])

# 4. fishing-ripple: three broken, tapered, ridged ripple rings + bubble lumps, lying on the water at y 0..0.12
rp = M(); rng = random.Random(700)
def ripple_arc(rad, width, crest, a_from, a_to, seg):
    ins, mids, outs = [], [], []
    for i in range(seg + 1):
        t = i / seg; a = a_from + (a_to - a_from) * t
        taper = .25 + .75 * math.sin(math.pi * t) ** .6          # brush-stroke ends
        rj = rad * (1 + rng.uniform(-.045, .045)); w = width * taper
        d = Vector((math.cos(a), math.sin(a), 0))
        ins.append(d * (rj - w / 2) + Vector((0, 0, .004))); outs.append(d * (rj + w / 2) + Vector((0, 0, .004)))
        mids.append(d * rj + Vector((0, 0, .004 + crest * taper)))
    k = len(rp.v); rp.v += ins + mids + outs; L = seg + 1
    for i in range(seg):
        rp.f.append((k + i, k + i + 1, k + L + i + 1, k + L + i)); rp.mi.append('ripple')              # inner slope
        rp.f.append((k + L + i, k + L + i + 1, k + 2 * L + i + 1, k + 2 * L + i)); rp.mi.append('ripple')  # outer slope
for rad, width, crest, arcs in [(.15, .06, .035, [(0.3, 0.3 + math.tau - .55)]),
                                (.31, .07, .03, [(1.1, 3.9), (4.35, 6.9)]),
                                (.46, .07, .025, [(-.2, 1.6), (2.05, 3.9), (4.3, 5.75)])]:
    for a, b in arcs:
        seg = max(4, int((b - a) * rad * 26))
        ripple_arc(rad, width, crest, a, b, seg)
for i, (x, y, s) in enumerate([(.02, -.01, .055), (-.07, .06, .04), (.08, .07, .032), (-.05, -.08, .035), (.22, -.12, .03)]):
    rp.hull(blob((x, y, s * .55), (s, s * .9, s * 1.05), 720 + i, n=8, cuts=1, floor=0.), lambda nn, cc: 'ripple')
asset('fishing-ripple', 'Fishing-spot marker lying on the water surface (y 0..0.12); runtime animates the root',
      [('fishing-ripple_Rings', rp)])

# 5. campfire: stone ring, crossed + leaning logs, ash bed, flame tongues (emission 1.0), ember chips
cf = M(); fl = M(); rng = random.Random(800)
for i in range(7):
    a = math.tau * i / 7 + rng.uniform(-.12, .12); rad = rng.uniform(.35, .38)
    p = (math.cos(a) * rad, math.sin(a) * rad, .05)
    def stonemat(nn, cc, a=a, k=i):
        inward = -(nn.x * math.cos(a) + nn.y * math.sin(a))
        if inward > .45 and cc.z < .1: return 'char'                     # soot on the fire side
        return 'rock-dark' if (nn.z < .2 or k % 3 == 0) else 'rock'
    cf.hull(blob(p, (.11, .09, .08), 810 + i, n=13, cuts=3, floor=-.025, flat_top=.72, jit=(.8, 1.08)), stonemat)
cf.hull(blob((0, 0, .0), (.25, .23, .035), 830, n=12, cuts=1, floor=-.01), lambda nn, cc: 'char')   # ash bed
def log(p0, p1, r0, r1, seed, inner_char=False):
    cf.tube([p0, p1], [r0, r1], 6, 'bark', seed=seed, jit=.07,
            cap0='wood-cut', inset0=('bark', .72, .01), cap1='char' if inner_char else 'wood-cut',
            inset1=None if inner_char else ('bark', .72, .01))
log((-.29, -.1, .055), (.29, .12, .07), .052, .048, 840)                  # crossed pair on the ash
log((-.1, .28, .06), (.13, -.27, .105), .05, .046, 841)
for i in range(4):                                                        # leaning teepee logs, charred tips
    a = math.tau * i / 4 + .4 + rng.uniform(-.2, .2)
    d = Vector((math.cos(a), math.sin(a), 0))
    log(d * .31 + Vector((0, 0, .04)), d * .05 + Vector((0, 0, .3)), .045, .036, 850 + i, inner_char=True)
def tongue(base, r, h, lean, twist, mat, seed):
    rg = random.Random(seed); b = Vector(base); rings = []
    for j, (f, rs) in enumerate([(0, 1.), (.4, .72), (.72, .42)]):
        ctr = b + Vector((0, 0, h * f)) + Vector(lean) * (f ** 1.4) * h
        rings.append([ctr + Vector((math.cos(math.tau * i / 5 + twist * j), math.sin(math.tau * i / 5 + twist * j), 0)) * r * rs * rg.uniform(.85, 1.12)
                      for i in range(5)])
    fl.loft(rings, mat)
    fl.pyramid(rings[-1], b + Vector((0, 0, h)) + Vector(lean) * h * 1.15, mat)
for i in range(6):                                                        # outer orange ring of tongues
    a = math.tau * i / 6 + .2 + rng.uniform(-.15, .15)
    d = Vector((math.cos(a), math.sin(a), 0))
    tongue(d * .09 + Vector((0, 0, .07)), .065, rng.uniform(.33, .46), d * .16 + Vector((-d.y, d.x, 0)) * .08, .5, 'flame-orange', 860 + i)
for i in range(3):                                                        # inner yellow core, taller
    a = math.tau * i / 3 + 1.0
    d = Vector((math.cos(a), math.sin(a), 0))
    tongue(d * .03 + Vector((0, 0, .1)), .05, rng.uniform(.5, .62), d * .07, -.6, 'flame-yellow', 870 + i)
for i in range(9):                                                        # glowing ember chips in the ash + two sparks
    a = rng.uniform(0, math.tau); rad = rng.uniform(.08, .24)
    p = Vector((math.cos(a) * rad, math.sin(a) * rad, .03))
    fl.hull(blob(p, (.028, .024, .018), 880 + i, n=6, cuts=0, floor=.0), lambda nn, cc: 'flame-orange')
for i, p in enumerate([(.06, -.04, .78), (-.08, .05, .86)]):
    fl.hull(blob(p, (.018, .018, .026), 895 + i, n=6, cuts=0), lambda nn, cc: 'flame-yellow')
asset('campfire', 'Lit campfire (stone ring, crossed + leaning logs, emissive flames); lesson firemaking/cooking',
      [('campfire_Base', cf), ('campfire_Flames', fl)])

# ---------------------------------------------------------------- build objects (same as v1)
roots = []
for name, habitat, parts in assets:
    pts = [v for _, m in parts for v in m.v]
    cx = (min(p.x for p in pts) + max(p.x for p in pts)) / 2; cy = (min(p.y for p in pts) + max(p.y for p in pts)) / 2
    for _, m in parts:
        for v in m.v: v.x -= cx; v.y -= cy
    root = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(root)
    for mname, m in parts:
        me = bpy.data.meshes.new(mname); me.from_pydata([tuple(v) for v in m.v], [], m.f); me.validate(clean_customdata=False); me.update()
        slots = list(dict.fromkeys(m.mi))
        for sname in slots: me.materials.append(MAT[sname])
        for poly, sname in zip(me.polygons, m.mi): poly.material_index = slots.index(sname); poly.use_smooth = False
        ob = bpy.data.objects.new(mname, me); bpy.context.collection.objects.link(ob); ob.parent = root
    roots.append((root, habitat))

def tri_count(ob): return sum(len(p.vertices) - 2 for x in ob.children_recursive if x.type == 'MESH' for p in x.data.polygons)
def bounds(ob):
    pts = [x.matrix_world @ v.co for x in ob.children_recursive if x.type == 'MESH' for v in x.data.vertices]
    lo = [min(p[i] for p in pts) for i in range(3)]; hi = [max(p[i] for p in pts) for i in range(3)]
    return {'min': [lo[0], lo[2], -hi[1]], 'max': [hi[0], hi[2], -lo[1]]}

bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT')
for r, _ in roots:
    r.select_set(True)
    for x in r.children_recursive: x.select_set(True)
glb = OUT / 'props.glb'
bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', use_selection=True, export_animations=False,
                          export_yup=True, export_apply=True, export_materials='EXPORT')
raw = glb.read_bytes(); jslen = struct.unpack_from('<I', raw, 12)[0]; doc = json.loads(raw[20:20 + jslen])
sha = hashlib.sha256(raw).hexdigest()
nodes = doc['nodes']; top_nodes = set(doc['scenes'][0]['nodes'])
def glb_tris(ni):
    n = nodes[ni]; t = 0
    if 'mesh' in n:
        for pr in doc['meshes'][n['mesh']]['primitives']: t += doc['accessors'][pr['indices']]['count'] // 3
    return t + sum(glb_tris(c) for c in n.get('children', []))
glb_roots = {nodes[i]['name']: i for i in top_nodes}
assert len(doc.get('materials', [])) <= 12, len(doc['materials'])
assert not doc.get('images') and not doc.get('textures'), 'no image textures allowed'
assert 'KHR_materials_emissive_strength' not in doc.get('extensionsUsed', []), 'emissive strength must stay <= 1.0'
for gm in doc['materials']:   # authored sRGB must survive export untouched
    want = PALETTE.get(gm['name']) or tuple(c * .3 for c in EMISSIVE[gm['name']])
    got = gm['pbrMetallicRoughness']['baseColorFactor'][:3]
    assert all(abs(a - b) < 1e-4 for a, b in zip(got, want)), (gm['name'], got, want)
    if gm['name'] in EMISSIVE: assert all(abs(a - b) < 1e-4 for a, b in zip(gm['emissiveFactor'], EMISSIVE[gm['name']])), gm

manifest = {'schema': 1, 'status': 'candidate-not-visual-or-runtime-accepted', 'axes': 'glTF Y-up, 1 unit = tile',
            'colour': 'material colours are authored sRGB, drawn as-is (no linear conversion); emissive strength 1.0',
            'references': ['Bible_References/Landscape_Option.jpg', 'Bible_References/Town2.jpg'],
            'blend': 'props.blend', 'file': 'props.glb', 'sha256': sha, 'assets': []}
total = 0
for r, habitat in roots:
    b = bounds(r); tris = tri_count(r); meshes = [x for x in r.children_recursive if x.type == 'MESH']
    mats = sorted({m.name for x in meshes for m in x.data.materials})
    assert r.name in glb_roots, r.name
    gt = glb_tris(glb_roots[r.name]); assert gt == tris, (r.name, gt, tris)
    assert b['min'][1] > -.1, (r.name, b)
    total += tris
    manifest['assets'].append({'name': r.name, 'root': r.name, 'file': glb.name, 'habitat': habitat, 'triangles': tris,
                               'materials': len(mats), 'materialNames': mats, 'meshes': len(meshes),
                               'bounds': b, 'animatedBounds': b, 'sampledFrames': [1], 'clips': [],
                               'groundMinY': b['min'][1], 'sha256': sha})
    print('[HOLM_PROPS_V2]', r.name, tris, 'tris', len(mats), 'mats', [round(v, 3) for v in b['min']], [round(v, 3) for v in b['max']])
manifest['totals'] = {'triangles': total, 'materials': len(doc['materials']), 'assets': len(roots),
                      'budget': {'triangles': 3500, 'materials': 12}}
assert total <= 3500, total
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'props.blend'))
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf8')
print('[HOLM_PROPS_V2] PASS', total, 'tris', len(doc['materials']), 'materials sha256', sha)

# ---------------------------------------------------------------- proof renders (presentation only; not saved)
if RENDER:
    import numpy as np
    RENDER.mkdir(parents=True, exist_ok=True); scene = bpy.context.scene
    for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
        try: scene.render.engine = eng; break
        except TypeError: pass
    # 'Raw' = no view transform, like the game (authored sRGB value x lighting reaches the screen as-is)
    vts = [i.identifier for i in scene.view_settings.bl_rna.properties['view_transform'].enum_items]
    scene.view_settings.view_transform = 'Raw' if 'Raw' in vts else 'Standard'
    scene.world = bpy.data.worlds.new('Studio'); scene.world.use_nodes = True
    bg = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs[0].default_value = (.62, .7, .8, 1); bg.inputs[1].default_value = .45
    def flat(name, rgb):
        m = bpy.data.materials.new(name); m.use_nodes = True
        bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        bs.inputs['Base Color'].default_value = (*rgb, 1); bs.inputs['Roughness'].default_value = 1; return m
    ground_m = flat('ground', (.36, .46, .2)); cap_m = flat('capsule', (.55, .62, .75)); ink = flat('label', (.1, .12, .07))
    water_m = flat('water', (.22, .4, .5))
    bpy.ops.mesh.primitive_plane_add(size=400, location=(40, 0, 0)); bpy.context.object.data.materials.append(ground_m)
    sun = bpy.data.objects.new('Key', bpy.data.lights.new('Key', 'SUN')); sun.data.energy = 1.05; sun.data.angle = .08
    sun.rotation_euler = (math.radians(48), 0, math.radians(-38)); scene.collection.objects.link(sun)
    fill = bpy.data.objects.new('Fill', bpy.data.lights.new('Fill', 'SUN')); fill.data.energy = .25
    fill.rotation_euler = (math.radians(65), 0, math.radians(150)); scene.collection.objects.link(fill)
    def capsule(x, y):
        objs = []
        bpy.ops.mesh.primitive_cylinder_add(radius=.24, depth=1.42, location=(x, y, .95), vertices=16); objs.append(bpy.context.object)
        for z in (.24, 1.66):
            bpy.ops.mesh.primitive_uv_sphere_add(radius=.24, location=(x, y, z), segments=16, ring_count=8); objs.append(bpy.context.object)
        for o in objs: o.data.materials.append(cap_m)
    def water(x, y, s):
        bpy.ops.mesh.primitive_plane_add(size=s, location=(x, y, .002)); bpy.context.object.data.materials.append(water_m)
    def label(txt, x, y):
        cu = bpy.data.curves.new('lbl', 'FONT'); cu.body = txt; cu.size = .17; cu.align_x = 'CENTER'
        o = bpy.data.objects.new('lbl_' + txt, cu); o.location = (x, y, .005); cu.materials.append(ink); scene.collection.objects.link(o)
    def cam(loc, tgt, ortho=None, lens=50):
        c = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam')); scene.collection.objects.link(c); c.location = loc
        c.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        if ortho: c.data.type = 'ORTHO'; c.data.ortho_scale = ortho
        else: c.data.lens = lens
        scene.camera = c; return c
    def shot(path, w, h):
        scene.render.resolution_x = w; scene.render.resolution_y = h; scene.render.resolution_percentage = 100
        scene.render.filepath = str(path); bpy.ops.render.render(write_still=True)
    by = {r.name: r for r, _ in roots}
    def clone(name, loc, rotz=0):
        src = by[name]; e = bpy.data.objects.new(name + '_show', None); scene.collection.objects.link(e); e.location = loc; e.rotation_euler = (0, 0, rotz)
        for ch in src.children:
            o = ch.copy(); scene.collection.objects.link(o); o.parent = e
        return e
    # lineup (one row, capsule at left)
    order = ['tree-stump', 'ore-rock-copper', 'ore-rock-tin', 'ore-rock-depleted', 'fishing-ripple', 'campfire']
    capsule(0, 0); label('1.9 capsule', 0, -.95); x = .3
    for n in order:
        b = bounds(by[n]); x += .45 - b['min'][0]
        by[n].location = (x, 0, 0)
        if n == 'fishing-ripple': water(x, 0, 1.3)
        label(n, x + (b['min'][0] + b['max'][0]) / 2, -.95); x += b['max'][0]
    bpy.context.view_layer.update(); mid = x / 2
    cam((mid + 1.2, -12, 7), (mid, .4, .45), ortho=x + 1.0); shot(RENDER / 'lineup.png', 1800, 900)
    for n in order: by[n].location = (0, 0, -50)
    # campfire close 3/4 with stump + capsule for scale
    clone('campfire', (40, 0, 0), .3); clone('tree-stump', (41.25, .7, 0), .8); capsule(40.3, 1.6)
    cam((41.25, -1.45, 1.15), (40.05, .1, .3), lens=45); shot(RENDER / 'campfire_close.png', 900, 900)
    # ore rocks close 3/4
    clone('ore-rock-copper', (80, .5, 0), .2); clone('ore-rock-tin', (81.35, -.35, 0), 1.9); clone('ore-rock-depleted', (78.65, -.4, 0), -.7)
    water(82.3, 1.2, 1.2); clone('fishing-ripple', (82.3, 1.2, .002))
    cam((81.6, -3.2, 2.1), (80.2, .15, .42), lens=40); shot(RENDER / 'ore_close.png', 900, 900)
    def px(p):
        im = bpy.data.images.load(str(p)); a = np.empty(im.size[0] * im.size[1] * 4, dtype=np.float32); im.pixels.foreach_get(a)
        return a.reshape(im.size[1], im.size[0], 4)
    L, S, P = px(RENDER / 'lineup.png'), px(RENDER / 'campfire_close.png'), px(RENDER / 'ore_close.png')
    sheet = np.ones((1800, 1800, 4), dtype=np.float32)
    sheet[900:, :, :] = L; sheet[:900, :900] = S; sheet[:900, 900:] = P
    im = bpy.data.images.new('sheet', 1800, 1800); im.pixels.foreach_set(sheet.ravel())
    im.filepath_raw = str(RENDER / 'sheet.png'); im.file_format = 'PNG'; im.save()
    print('[HOLM_PROPS_V2] renders ->', RENDER)
