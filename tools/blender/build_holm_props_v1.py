"""Holm prop pack v1: original hand-designed low-poly props (Blender 4.5, headless).

Usage: blender -b --python tools/blender/build_holm_props_v1.py [-- --render <dir>]
Outputs .studio-workspaces/holm-props-v1/candidates/{props.glb,props.blend,manifest.json}.
One named root Empty per asset (runtime clones by root name). Blender Z-up is exported as glTF Y-up;
1 unit = 1 tile. Flat material colours only (no image textures); palette matched to holm-tree-family-v3
(its texture base colours are sRGB values, so the same sRGB values are converted to linear here).
Deterministic: every random draw comes from a seeded random.Random.
"""
import bpy, bmesh, math, random, json, struct, hashlib, sys
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.studio-workspaces/holm-props-v1/candidates'
OUT.mkdir(parents=True, exist_ok=True)
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
RENDER = Path(argv[argv.index('--render') + 1]) if '--render' in argv else None
bpy.ops.wm.read_factory_settings(use_empty=True)

# ---------------------------------------------------------------- materials (sRGB design values)
def lin(c): return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4
PALETTE = {
    'leaf':          (.285, .34, .155),   # = tree-family olive-leaves
    'leaf-light':    (.355, .39, .205),   # = tree-family birch-leaves (sunlit tops)
    'bark':          (.27, .205, .135),   # = tree-family oak-bark
    'wood-cut':      (.62, .49, .31),     # fresh end grain / split faces / carved cuts
    'timber':        (.40, .295, .185),   # hewn signpost timber, board edges
    'board-weathered': (.63, .56, .43),   # silvered sign-arm faces
    'stone':         (.50, .49, .455),    # gray fieldstone
    'stone-dark':    (.385, .375, .35),
    'flower-white':  (.93, .92, .86),
    'flower-yellow': (.94, .87, .52),
    'flower-eye':    (.87, .66, .20),
    'iron':          (.17, .16, .15),
}
MAT = {}
for name, rgb in PALETTE.items():
    m = bpy.data.materials.new(name); m.use_nodes = True
    bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    col = (*[lin(c) for c in rgb], 1)
    bs.inputs['Base Color'].default_value = col; bs.inputs['Roughness'].default_value = .95
    if 'Specular IOR Level' in bs.inputs: bs.inputs['Specular IOR Level'].default_value = .12
    m.diffuse_color = col; m.roughness = .95; m.metallic = 0
    MAT[name] = m

# ---------------------------------------------------------------- mesh builder
class M:
    def __init__(s): s.v = []; s.f = []; s.mi = []
    def add(s, vs, fs, mats):
        k = len(s.v); s.v += [Vector(v) for v in vs]
        for n, f in enumerate(fs):
            s.f.append(tuple(k + i for i in f)); s.mi.append(mats[n] if isinstance(mats, (list, tuple)) else mats)
    def tris(s): return sum(len(f) - 2 for f in s.f)

    def loft(s, rings, side, cap0=None, cap1=None, inset0=None, inset1=None):
        """rings: lists of points, each CCW about the travel direction. side: mat name or fn(j,i)."""
        n = len(rings[0]); k = len(s.v); vs = [p for r in rings for p in r]; fs = []; ms = []
        for j in range(len(rings) - 1):
            for i in range(n):
                fs.append((j*n+i, j*n+(i+1) % n, (j+1)*n+(i+1) % n, (j+1)*n+i))
                ms.append(side(j, i) if callable(side) else side)
        s.add(vs, fs, ms)
        if cap1: s.cap([k + (len(rings)-1)*n + i for i in range(n)], cap1, inset1)
        if cap0: s.cap([k + i for i in reversed(range(n))], cap0, inset0)

    def cap(s, ring, mat, inset=None):
        """ring: vertex indices CCW about the outward normal. inset=(rim_mat, scale, depth) cuts a rim."""
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
        s.loft(rings, side, cap0, cap1, inset0, inset1)

    def hull(s, pts, matfn):
        bm = bmesh.new()
        for p in pts: bm.verts.new(p)
        r = bmesh.ops.convex_hull(bm, input=list(bm.verts), use_existing_faces=False)
        junk = [g for g in r['geom_interior'] + r['geom_unused'] if isinstance(g, bmesh.types.BMVert)]
        if junk: bmesh.ops.delete(bm, geom=junk, context='VERTS')
        # merge coplanar hull triangles into true flat facets (the hand-cut planes)
        bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(2.5), verts=bm.verts[:], edges=bm.edges[:])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        bm.verts.index_update()
        vs = [v.co.copy() for v in bm.verts]
        fs = [tuple(v.index for v in f.verts) for f in bm.faces]
        ms = [matfn(f.normal.copy(), f.calc_center_median()) for f in bm.faces]
        bm.free(); s.add(vs, fs, ms)

    def slab(s, prof, y0, y1, face, edge):
        """Extrude an XZ profile (CCW seen from -Y) between y0 (front) and y1 (back)."""
        n = len(prof); k = len(s.v)
        s.v += [Vector((x, y0, z)) for x, z in prof] + [Vector((x, y1, z)) for x, z in prof]
        s.f.append(tuple(k + i for i in range(n))); s.mi.append(face)
        s.f.append(tuple(k + n + i for i in reversed(range(n)))); s.mi.append(face)
        for i in range(n):
            s.f.append((k+i, k+n+i, k+n+(i+1) % n, k+(i+1) % n)); s.mi.append(edge(i) if callable(edge) else edge)

    def pyramid(s, base, apex, mat):
        n = len(base); k = len(s.v); s.v += [Vector(p) for p in base] + [Vector(apex)]
        for i in range(n): s.f.append((k+i, k+(i+1) % n, k+n)); s.mi.append(mat)

def blob(c, s, seed, n=14, cuts=2, floor=None, flat_top=None, jit=(.84, 1.06), cut=(.58, .8)):
    """Irregular faceted polyhedron points: jittered fibonacci shell, planar cuts, optional floor."""
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

# ---------------------------------------------------------------- assets
assets = []   # (name, habitat, [(mesh_name, M)], recenter)
def asset(name, habitat, parts, recenter=True): assets.append((name, habitat, parts, recenter))

def leafmat(top='leaf-light', side='leaf', thr=.5):
    return lambda nrm, c: top if nrm.z > thr else side

def shrub(name, seed, lumps, stems_z, twigs):
    rng = random.Random(seed); wood = M(); leaves = M()
    base = [Vector((rng.uniform(-.05, .05), rng.uniform(-.05, .05), -.02)) for _ in range(3)]
    for i, (c, sz) in enumerate(lumps):
        leaves.hull(blob(c, sz, seed * 10 + i, n=13, cuts=2), leafmat())
        b = base[i % 3]; c = Vector(c); top = Vector((c.x * .7, c.y * .7, c.z - sz[2] * .35))
        mid = b.lerp(top, .5) + Vector((rng.uniform(-.04, .04), rng.uniform(-.04, .04), 0))
        wood.tube([b, mid, top], [.05, .032, .018], 5, 'bark', seed=seed + i, jit=.08)
    # root flare: short splayed nubs so the woody base reads at ground level
    for i in range(4):
        a = math.tau * i / 4 + rng.uniform(-.4, .4)
        wood.tube([(0, 0, stems_z), (math.cos(a) * .1, math.sin(a) * .1, .03), (math.cos(a) * .19, math.sin(a) * .19, -.01)],
                  [.045, .03, .012], 4, 'bark', seed=seed + 40 + i)
    # bare twigs poke past the leaf silhouette, echoing the oak's rim twigs
    for i, (p0, p1) in enumerate(twigs):
        wood.tube([p0, p1], [.016, .005], 4, 'bark', seed=seed + 60 + i)
    return [(name + '_WoodyBase', wood), (name + '_LeafLumps', leaves)]

asset('shrub-a', 'Knee-high mound shrub; fence feet, path margins, cottage walls; clusters of 1-3',
      shrub('shrub-a', 11, [((-.27, -.08, .40), (.30, .27, .25)), ((.25, -.17, .38), (.30, .27, .24)),
                            ((.06, .26, .43), (.32, .28, .26)), ((-.04, -.03, .64), (.31, .28, .22)),
                            ((.38, .17, .30), (.19, .19, .17)), ((-.36, .22, .30), (.18, .18, .16))],
            .10, [((-.2, -.05, .45), (-.55, -.1, .6)), ((.2, .1, .5), (.5, .33, .68)), ((0, 0, .6), (.04, -.16, .9))]))
asset('shrub-b', 'Waist-high upright shrub; woodland edge and behind fences; single accents',
      shrub('shrub-b', 23, [((-.18, .05, .44), (.24, .22, .27)), ((.20, -.08, .52), (.25, .22, .29)),
                            ((-.05, .17, .75), (.25, .22, .26)), ((.09, -.11, .88), (.21, .19, .21)),
                            ((-.22, -.16, .70), (.18, .17, .19)), ((.28, .18, .78), (.15, .14, .16))],
            .12, [((.1, 0, .7), (.2, .05, 1.06)), ((-.15, 0, .6), (-.47, .08, .82)), ((.15, -.1, .6), (.45, -.25, .64))]))

# flower patch: low leaf mats + rosette blades + five-petal heads on short stems
fl_leaves = M(); fl_heads = M(); rng = random.Random(7)
for i, (c, sz) in enumerate([((-.16, -.05, .03), (.2, .17, .09)), ((.15, .06, .03), (.21, .17, .1)),
                             ((.0, .2, .02), (.17, .14, .08)), ((.06, -.2, .02), (.16, .13, .07))]):
    fl_leaves.hull(blob(c, sz, 70 + i, n=11, cuts=1, floor=-.01), leafmat(thr=.6))
for i in range(11):
    a = math.tau * i / 11 + rng.uniform(-.2, .2); r0 = rng.uniform(.18, .28); L = rng.uniform(.13, .19)
    d = Vector((math.cos(a), math.sin(a), 0)); sd = Vector((-d.y, d.x, 0)); p = d * r0
    fl_leaves.add([p - sd * .04 + Vector((0, 0, .02)), p + d * L + Vector((0, 0, .05)), p + sd * .04 + Vector((0, 0, .02)), p + d * L * .45 + Vector((0, 0, .075))],
                  [(0, 1, 3), (1, 2, 3)], 'leaf')
spots = []
while len(spots) < 13:
    q = Vector((rng.uniform(-.33, .33), rng.uniform(-.3, .3), 0))
    if q.length < .36 and all((q - o).length > .12 for o in spots): spots.append(q)
for i, q in enumerate(spots):
    h = rng.uniform(.13, .25); petal = 'flower-yellow' if i % 4 == 3 else 'flower-white'
    c = q + Vector((0, 0, h)); rad = rng.uniform(.045, .06); rot = rng.uniform(0, math.tau)
    fl_heads.tube([q + Vector((0, 0, .02)), c - Vector((0, 0, .01))], [.008, .006], 3, 'leaf', seed=i)
    ring = []
    for k in range(10):
        ang = rot + math.tau * k / 10; rr = rad if k % 2 == 0 else rad * .42
        ring.append(c + Vector((math.cos(ang) * rr, math.sin(ang) * rr, .014 if k % 2 == 0 else 0)))
    kk = len(fl_heads.v); fl_heads.v += ring + [c + Vector((0, 0, .004))]
    for k in range(10): fl_heads.f.append((kk + k, kk + (k + 1) % 10, kk + 10)); fl_heads.mi.append(petal)
    fl_heads.pyramid([c + Vector((math.cos(rot + math.tau * k / 5) * rad * .3, math.sin(rot + math.tau * k / 5) * rad * .3, .006)) for k in range(5)],
                     c + Vector((0, 0, .022)), 'flower-eye')
asset('flower-patch', 'White daisy-like patch with a few pale yellow heads; meadow hollows and path verges',
      [('flower-patch_Leaves', fl_leaves), ('flower-patch_Flowers', fl_heads)])

# small stones scatter
st = M()
for i, (x, y, r, h) in enumerate([(-.24, -.1, .13, .12), (.17, -.2, .1, .08), (.06, .2, .15, .14), (.3, .12, .07, .06), (-.14, .26, .06, .05)]):
    st.hull(blob((x, y, h * .45), (r, r * .85, h), 90 + i, n=11, cuts=2, floor=-.02, flat_top=.7),
            (lambda nrm, c, k=i: 'stone' if k % 2 == 0 else 'stone-dark'))
asset('stones-small', 'Loose fieldstones; path edges, field corners, under fences', [('stones-small_Stones', st)])

# rock group: three boulders with cut facets, moss cap on the big one, two pebbles
rk = M()
def moss_top(nrm, c): return 'leaf' if nrm.z > .82 and c.z > .7 else ('stone' if nrm.z > -.2 else 'stone-dark')
rk.hull(blob((-.22, .02, .40), (.62, .47, .56), 101, n=16, cuts=5, floor=-.06, flat_top=.86, cut=(.46, .66)), moss_top)
rk.hull(blob((.42, -.18, .24), (.4, .33, .33), 102, n=14, cuts=4, floor=-.05, flat_top=.8, cut=(.48, .68)),
        lambda nrm, c: 'stone-dark' if nrm.z < .4 else 'stone')
rk.hull(blob((.12, .46, .15), (.3, .25, .23), 103, n=12, cuts=3, floor=-.04, cut=(.5, .7)),
        lambda nrm, c: 'stone')
for i, (x, y, r) in enumerate([(.62, .25, .08), (-.62, -.34, .07)]):
    rk.hull(blob((x, y, r * .35), (r, r, r * .8), 104 + i, n=9, cuts=1, floor=-.02), lambda nrm, c: 'stone-dark')
asset('rock-group', 'Gray fieldstone outcrop; hill shoulders, creek banks, path bends', [('rock-group_Boulders', rk)])

# fallen log: bark trunk, weathered sawn end, jagged broken end with splinters, snapped stub branch
lg = M(); rng = random.Random(55)
xs = [-.9, -.5, -.05, .4, .86]; radii = [.2, .215, .205, .19, .18]
path = [(x, (.02, .05, .03, -.02, -.05)[j], radii[j] - .03 + (0, -.005, -.01, -.005, 0)[j]) for j, x in enumerate(xs)]
def broken(j, ring, t):
    if j != len(xs) - 1: return ring
    return [p + t * (rng.uniform(.06, .17) if i % 2 else rng.uniform(-.06, .02)) for i, p in enumerate(ring)]
k0 = len(lg.v); lg.tube(path, radii, 8, 'bark', seed=56, jit=.07, cap0='wood-cut', inset0=('bark', .82, .015), ring_hook=broken)
end = list(range(k0 + 4 * 8, k0 + 5 * 8))  # last (broken) ring, before the start-cap inset verts
ctr = sum((lg.v[i] for i in end), Vector()) / 8 - Vector((.05, 0, 0)); kc = len(lg.v); lg.v.append(ctr)
for i in range(8): lg.f.append((end[i], end[(i+1) % 8], kc)); lg.mi.append('wood-cut')
for i, (k, ln) in enumerate([(1, .2), (3, .15), (5, .18)]):
    p = lg.v[end[k]].lerp(ctr, .35)
    lg.tube([p - Vector((.03, 0, 0)), p + Vector((ln, rng.uniform(-.04, .04), rng.uniform(-.03, .05)))], [.04, .004], 3, 'wood-cut', seed=80 + i)
lg.tube([(.12, .04, .2), (.24, .2, .38), (.32, .3, .56)], [.08, .065, .055], 6, 'bark', seed=61, jit=.06,
        cap1='wood-cut', inset1=('bark', .78, .012))
lg.tube([(-.45, -.12, .2), (-.5, -.3, .3)], [.06, .03], 5, 'bark', seed=62, cap1='wood-cut')
asset('fallen-log', 'Fallen bark log; woodland floor, creek edges, beside paths as a seat', [('fallen-log_Log', lg)])

# signpost: hewn square post with chamfered corners and a carved pyramid top, packing stones at the foot
sp = M(); rng = random.Random(33)
def oct_ring(z, h, c):
    pr = [(h, -h + c), (h, h - c), (h - c, h), (-h + c, h), (-h, h - c), (-h, -h + c), (-h + c, -h), (h - c, -h)]
    return [Vector((x + rng.uniform(-.003, .003), y + rng.uniform(-.003, .003), z)) for x, y in pr]
rings = [oct_ring(-.06, .088, .024), oct_ring(.9, .085, .022), oct_ring(1.98, .082, .02), oct_ring(2.1, .03, .008)]
sp.loft(rings, lambda j, i: 'wood-cut' if j == 2 else 'timber', cap0='timber', cap1='wood-cut')
for i in range(4):
    a = math.tau * i / 4 + .5 + rng.uniform(-.3, .3)
    sp.hull(blob((math.cos(a) * .15, math.sin(a) * .15, .02), (.085, .07, .07), 130 + i, n=9, cuts=1, floor=-.03),
            (lambda nrm, c, k=i: 'stone' if k % 2 else 'stone-dark'))
asset('signpost', 'Crossroads fingerpost (post only); mount signpost-arm at y 1.55/1.3/1.05', [('signpost_Post', sp)], recenter=False)

# signpost arm: two planks forming a carved arrow toward +X, weathered faces, cleats + iron nails
ar = M(); rng = random.Random(44)
def j(pr): return [(x + (rng.uniform(-.004, .004) if 0 < x < .9 else 0), z + rng.uniform(-.003, .003)) for x, z in pr]
T = .022
up = j([(0, .006), (.93, .006), (.775, .122), (.755, .1), (0, .1)])
lo = j([(0, -.1), (.755, -.1), (.775, -.122), (.93, -.006), (0, -.006)])
ar.slab(up, -T, T, 'board-weathered', lambda i: 'wood-cut' if i in (1, 4) else 'timber')
ar.slab(lo, -T, T, 'board-weathered', lambda i: 'wood-cut' if i in (2, 3) else 'timber')
for side in (-1, 1):
    y0, y1 = (-T - .016, -T) if side < 0 else (T, T + .016)
    ar.slab([(.12, -.118), (.18, -.116), (.182, .117), (.118, .119)], y0, y1, 'timber', 'timber')
    face = y0 if side < 0 else y1
    for x, z in [(.15, .055), (.15, -.055), (.6, .052), (.6, -.054)]:
        fy = face if x < .2 else (-T if side < 0 else T)
        e = .011
        ar.pyramid([(x - e, fy, z - e), (x + e, fy, z - e), (x + e, fy, z + e), (x - e, fy, z + e)][::(1 if side < 0 else -1)],
                   (x, fy + side * .007, z), 'iron')
asset('signpost-arm', 'Fingerpost arm (plank pair, arrow tip +X); origin = post end, board centred on y 0', [('signpost-arm_Board', ar)], recenter=False)

# fence-rail: two split posts, two split rails (bark crown + pale split faces), pegs above each rail
fn = M(); rng = random.Random(77)
def post(x0, seed, lean):
    r = random.Random(seed)
    prof = [(math.cos(math.tau * i / 6 + .3) * .075 * r.uniform(.85, 1.1), math.sin(math.tau * i / 6 + .3) * .07 * r.uniform(.85, 1.1)) for i in range(6)]
    rings = []
    for z in (-.04, .55, 1.0):
        rings.append([Vector((x0 + px + lean * z, py, z)) for px, py in prof])
    rings.append([Vector((x0 + px + lean * 1.08, py, 1.08 + px * .5 + r.uniform(-.005, .005))) for px, py in prof])
    fn.loft(rings, 'bark', cap0='bark', cap1='wood-cut')
post(0, 1, .01); post(2.0, 2, -.012)
WEDGE = [(0, -.058), (.068, .022), (.038, .062), (-.022, .068), (-.066, .032)]  # CCW about +X in (y, z)
def rail(z0, z1, seed):
    r = random.Random(seed); roll = r.uniform(-.25, .25); rings = []
    for k in range(4):
        x = 2.0 * k / 3; z = z0 + (z1 - z0) * k / 3 - (.018 if 0 < k < 3 else 0); y = r.uniform(-.01, .01)
        rr = roll + k * .04; ring = []
        for u, v in WEDGE:
            ring.append(Vector((x, y + u * math.cos(rr) - v * math.sin(rr), z + u * math.sin(rr) + v * math.cos(rr))))
        rings.append(ring)
    fn.loft(rings, lambda j, i: 'wood-cut' if i in (0, 4) else 'bark', cap0='wood-cut', cap1='wood-cut')
rail(.43, .47, 5); rail(.84, .81, 6)
for x0, lean in ((0, .01), (2.0, -.012)):
    for z in (.55, .94):
        fn.tube([(x0 + lean * z, -.11, z), (x0 + lean * z, .11, z)], [.017, .017], 4, 'timber', seed=int(z * 100), cap0='wood-cut', cap1='wood-cut')
asset('fence-rail', 'Split-rail fence section 2.0 along +X; origin = start post base; chain every 2.0', [('fence-rail_Section', fn)], recenter=False)

# ---------------------------------------------------------------- build objects
roots = []
for name, habitat, parts, recenter in assets:
    if recenter:
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
# verify from the exported file itself: root nodes by name, triangles per root, material count
nodes = doc['nodes']; top = set(doc['scenes'][0]['nodes'])
def glb_tris(ni):
    n = nodes[ni]; t = 0
    if 'mesh' in n:
        for pr in doc['meshes'][n['mesh']]['primitives']: t += doc['accessors'][pr['indices']]['count'] // 3
    return t + sum(glb_tris(c) for c in n.get('children', []))
glb_roots = {nodes[i]['name']: i for i in top}
assert len(doc.get('materials', [])) <= 12, len(doc['materials'])
assert not doc.get('images') and not doc.get('textures'), 'no image textures allowed'

manifest = {'schema': 1, 'status': 'candidate-not-visual-or-runtime-accepted', 'axes': 'glTF Y-up, 1 unit = tile',
            'references': ['Bible_References/Landscape_Option.jpg', 'Bible_References/Town2.jpg'],
            'blend': 'props.blend', 'file': 'props.glb', 'sha256': sha, 'assets': []}
total = 0
for r, habitat in roots:
    b = bounds(r); tris = tri_count(r); meshes = [x for x in r.children_recursive if x.type == 'MESH']
    mats = sorted({m.name for x in meshes for m in x.data.materials})
    assert r.name in glb_roots, r.name
    gt = glb_tris(glb_roots[r.name]); assert gt == tris, (r.name, gt, tris)
    assert r.name == 'signpost-arm' or b['min'][1] > -.1, (r.name, b)
    total += tris
    manifest['assets'].append({'name': r.name, 'root': r.name, 'file': glb.name, 'habitat': habitat, 'triangles': tris,
                               'materials': len(mats), 'materialNames': mats, 'meshes': len(meshes),
                               'bounds': b, 'animatedBounds': b, 'sampledFrames': [1], 'clips': [],
                               'groundMinY': b['min'][1], 'sha256': sha})
    print('[HOLM_PROPS_V1]', r.name, tris, 'tris', len(mats), 'mats', [round(v, 3) for v in b['min']], [round(v, 3) for v in b['max']])
manifest['totals'] = {'triangles': total, 'materials': len(doc['materials']), 'assets': len(roots),
                      'budget': {'triangles': 6000, 'materials': 12}}
assert total <= 6000, total
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'props.blend'))
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf8')
print('[HOLM_PROPS_V1] PASS', total, 'tris', len(doc['materials']), 'materials sha256', sha)

# ---------------------------------------------------------------- proof renders (presentation only; not saved)
if RENDER:
    import numpy as np
    RENDER.mkdir(parents=True, exist_ok=True); scene = bpy.context.scene
    for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
        try: scene.render.engine = eng; break
        except TypeError: pass
    scene.view_settings.view_transform = 'Standard'
    scene.world = bpy.data.worlds.new('Studio'); scene.world.use_nodes = True
    bg = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs[0].default_value = (.55, .6, .66, 1); bg.inputs[1].default_value = .9
    def flat(name, rgb):
        m = bpy.data.materials.new(name); m.use_nodes = True
        bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        bs.inputs['Base Color'].default_value = (*[lin(c) for c in rgb], 1); bs.inputs['Roughness'].default_value = 1; return m
    ground_m = flat('ground', (.40, .50, .22)); cap_m = flat('capsule', (.55, .62, .75)); ink = flat('label', (.12, .14, .08))
    bpy.ops.mesh.primitive_plane_add(size=400, location=(40, 0, 0)); bpy.context.object.data.materials.append(ground_m)
    sun = bpy.data.objects.new('Key', bpy.data.lights.new('Key', 'SUN')); sun.data.energy = 3.2; sun.data.angle = .08
    sun.rotation_euler = (math.radians(48), 0, math.radians(-38)); scene.collection.objects.link(sun)
    fill = bpy.data.objects.new('Fill', bpy.data.lights.new('Fill', 'SUN')); fill.data.energy = .7
    fill.rotation_euler = (math.radians(65), 0, math.radians(150)); scene.collection.objects.link(fill)
    def capsule(x, y):
        objs = []
        bpy.ops.mesh.primitive_cylinder_add(radius=.24, depth=1.42, location=(x, y, .95), vertices=16); objs.append(bpy.context.object)
        for z in (.24, 1.66):
            bpy.ops.mesh.primitive_uv_sphere_add(radius=.24, location=(x, y, z), segments=16, ring_count=8); objs.append(bpy.context.object)
        for o in objs: o.data.materials.append(cap_m)
    def label(txt, x, y):
        cu = bpy.data.curves.new('lbl', 'FONT'); cu.body = txt; cu.size = .2; cu.align_x = 'CENTER'
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
    # lineup
    rows = [(0., ['shrub-a', 'shrub-b', 'flower-patch', 'stones-small', 'rock-group']),
            (2.8, ['fallen-log', 'signpost', 'signpost-arm', 'fence-rail'])]
    order = [n for _, ns in rows for n in ns]; widest = 0
    for ry, ns in rows:
        capsule(0, ry); label('1.9 capsule', 0, ry - .9); x = .3
        for n in ns:
            b = bounds(by[n]); x += .5 - b['min'][0]
            by[n].location = (x, ry, .75 if n == 'signpost-arm' else 0)
            label(n, x + (b['min'][0] + b['max'][0]) / 2, ry - .9); x += b['max'][0]
        widest = max(widest, x)
    bpy.context.view_layer.update(); mid = widest / 2
    cam((mid + 2, -14, 8.5), (mid, 1.25, .5), ortho=widest + 1.4); shot(RENDER / 'lineup.png', 1800, 900)
    for n in order: by[n].location = (0, 0, -50)
    # signpost close 3/4 with two arms mounted
    clone('signpost', (40, 0, 0)); clone('signpost-arm', (40, 0, 1.55), math.radians(20)); clone('signpost-arm', (40, 0, 1.30), math.radians(150))
    clone('shrub-a', (40.55, .55, 0)); clone('flower-patch', (39.4, -.4, 0)); capsule(41.3, .5)
    cam((42.6, -3.9, 2.6), (40.1, 0, 1.25), lens=45); shot(RENDER / 'signpost_close.png', 900, 900)
    # props close 3/4
    clone('rock-group', (80, .6, 0), .3); clone('fallen-log', (81.6, -.6, 0), -.4); clone('shrub-b', (78.6, .9, 0))
    clone('stones-small', (79.3, -.9, 0)); clone('fence-rail', (78.2, 2.1, 0), 0); clone('flower-patch', (82.3, .8, 0))
    cam((83.2, -3.9, 2.5), (80.4, .45, .4), lens=35); shot(RENDER / 'props_close.png', 900, 900)
    # sheet: lineup on top, two closes below
    def px(p):
        im = bpy.data.images.load(str(p)); a = np.empty(im.size[0] * im.size[1] * 4, dtype=np.float32); im.pixels.foreach_get(a)
        return a.reshape(im.size[1], im.size[0], 4)
    L, S, P = px(RENDER / 'lineup.png'), px(RENDER / 'signpost_close.png'), px(RENDER / 'props_close.png')
    sheet = np.ones((900 + 900, 1800, 4), dtype=np.float32)
    sheet[900:, :, :] = L; sheet[:900, :900] = S; sheet[:900, 900:] = P
    im = bpy.data.images.new('sheet', 1800, 1800); im.pixels.foreach_set(sheet.ravel())
    im.filepath_raw = str(RENDER / 'sheet.png'); im.file_format = 'PNG'; im.save()
    print('[HOLM_PROPS_V1] renders ->', RENDER)
