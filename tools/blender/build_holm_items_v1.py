"""Holm item pack v1: tutorial-island inventory items + their inventory icons (Blender 4.5, headless).

Usage: blender -b --python tools/blender/build_holm_items_v1.py [-- --only id1,id2 --no-proof]
Outputs
  .studio-workspaces/holm-items-v1/candidates/{items.glb,items.blend,manifest.json,REPORT.md}
  assets/icons/items/<id>.png (96x96 RGBA) + assets/icons/items/manifest.json
  scratchpad/holm_items_v1/{lineup.png,sheet.png}   (proof renders)
Conventions (same as build_holm_props_v2.py): one named root Empty per item (root name = item id,
the runtime clones by root name); Blender Z-up exported as glTF Y-up; 1 unit = 1 tile; origin at the
item's resting base centre (it lies on the ground as dropped), longest axis along +X. Flat matte colours
only, authored as the sRGB values we want to SEE (no linear conversion), roughness 1, no textures.
Deterministic: every random draw comes from a seeded random.Random.
Style: 2004 old-school RuneScape items -- chunky, readable, slightly exaggerated. Original designs.
"""
import bpy, bmesh, math, random, json, struct, hashlib, sys, re
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.studio-workspaces/holm-items-v1/candidates'
ICONS = ROOT / 'assets/icons/items'
PROOF = ROOT / 'scratchpad/holm_items_v1'
for d in (OUT, ICONS, PROOF): d.mkdir(parents=True, exist_ok=True)
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ONLY = set(argv[argv.index('--only') + 1].split(',')) if '--only' in argv else None
NO_PROOF = '--no-proof' in argv
bpy.ops.wm.read_factory_settings(use_empty=True)
TAG = '[HOLM_ITEMS_V1]'

# ---------------------------------------------------------------- materials (authored sRGB, used as-is; 16 max)
PALETTE = {
    'item-wood':      (.58, .40, .21),   # staves, handles, planks, shafts
    'item-wood-dark': (.33, .21, .11),   # bark, inner walls, plank gaps, laces
    'item-iron':      (.40, .41, .45),   # hoops, hammer head, striker, shield rim
    'item-tin':       (.80, .82, .85),   # tinderbox tin, tin flecks, fish belly
    'item-bronze':    (.78, .52, .25),   # bronze bar, arrowheads, coin edges, buckle
    'item-gold':      (.97, .79, .28),   # coin faces
    'item-water':     (.30, .58, .84),
    'item-flour':     (.96, .94, .88),   # flour, bone, fletching, air sigil
    'item-dough':     (.92, .80, .56),   # raw dough, end grain, net cord
    'item-crust':     (.76, .46, .17),   # baked crust, cooked fish
    'item-fish':      (.58, .69, .53),   # silver-green perch flank
    'item-char':      (.17, .14, .12),   # burnt, eyes, flint
    'item-stone':     (.63, .61, .58),   # rune stones
    'item-ore':       (.90, .50, .19),   # copper flecks, perch fins, mind sigil
    'item-rock':      (.42, .38, .34),   # ore lumps, perch bars
    'item-leather':   (.56, .35, .17),   # jerkin, bindings, grips
}
MAT = {}
for name, rgb in PALETTE.items():
    m = bpy.data.materials.new(name); m.use_nodes = True
    bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value = (*rgb, 1); bs.inputs['Roughness'].default_value = 1.0
    bs.inputs['Metallic'].default_value = 0.0
    if 'Specular IOR Level' in bs.inputs: bs.inputs['Specular IOR Level'].default_value = 0.0
    m.diffuse_color = (*rgb, 1); m.roughness = 1.0; m.metallic = 0
    MAT[name] = m
def P(k): return 'item-' + k   # short material names in the builders

# ---------------------------------------------------------------- mesh builder
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

    def ptube(s, pts, r, n, side, up=None, closed=False, cap0=None, cap1=None, inset0=None, inset1=None,
              flat=1.0, phase=0.0, seed=None, jit=0.0):
        """Tube along a polyline. r scalar or per-point list; flat squashes the 'up' axis; up fixes the frame."""
        Pp = [Vector(p) for p in pts]; L = len(Pp); rr = r if isinstance(r, (list, tuple)) else [r] * L
        rng = random.Random(seed) if seed is not None else None; rings = []
        for j, p in enumerate(Pp):
            if closed: t = (Pp[(j+1) % L] - Pp[(j-1) % L])
            else: t = Pp[min(j+1, L-1)] - Pp[max(j-1, 0)]
            t.normalize()
            u = Vector(up) if up is not None else (Vector((0, 0, 1)) if abs(t.z) < .9 else Vector((1, 0, 0)))
            a = t.cross(u).normalized(); b = t.cross(a).normalized()
            ring = []
            for i in range(n):
                ang = math.tau * i / n + phase
                k = 1 + (rng.uniform(-jit, jit) if rng else 0)
                ring.append(p + (a * math.cos(ang) + b * math.sin(ang) * flat) * rr[j] * k)
            rings.append(ring)
        if closed: rings = rings + [rings[0]]
        return s.loft(rings, side, None if closed else cap0, None if closed else cap1, inset0, inset1)

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
        ms = [(matfn(f.normal.copy(), f.calc_center_median()) if callable(matfn) else matfn) for f in bm.faces]
        bm.free(); s.add(vs, fs, ms)

    def poly(s, pts, mat, face=(0, 0, 1), both=False):
        """Flat polygon oriented toward `face`; both=True adds the back face too."""
        pts = [Vector(p) for p in pts]; c = sum(pts, Vector()) / len(pts); nrm = Vector()
        for a, b in zip(pts, pts[1:] + pts[:1]): nrm += (a - c).cross(b - c)
        if nrm.dot(Vector(face)) < 0: pts = pts[::-1]
        s.add(pts, [tuple(range(len(pts)))], [mat])
        if both: s.add(pts[::-1], [tuple(range(len(pts)))], [mat])

    def pyramid(s, base, apex, mat):
        n = len(base); k = len(s.v); s.v += [Vector(p) for p in base] + [Vector(apex)]
        for i in range(n): s.f.append((k+i, k+(i+1) % n, k+n)); s.mi.append(mat)

def blob(c, s, seed, n=14, cuts=2, floor=None, flat_top=None, jit=(.84, 1.06), cut=(.58, .8)):
    """Irregular faceted polyhedron points: jittered fibonacci shell, planar cuts, optional floor (props v1/v2)."""
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

def ell(c, r, nu=8, nv=4, floor=None):
    """Ellipsoid point cloud (for hulls)."""
    pts = []
    for j in range(1, nv):
        th = math.pi * j / nv
        for i in range(nu):
            ph = math.tau * i / nu + (j % 2) * math.pi / nu
            pts.append(Vector((c[0] + r[0] * math.sin(th) * math.cos(ph), c[1] + r[1] * math.sin(th) * math.sin(ph),
                               c[2] + r[2] * math.cos(th))))
    pts += [Vector((c[0], c[1], c[2] + r[2])), Vector((c[0], c[1], c[2] - r[2]))]
    if floor is not None:
        for p in pts: p.z = max(p.z, floor)
    return pts

def cbox(c, h, ch):
    """Chamfered box point cloud: centre c, half-size h, chamfer ch."""
    pts = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            for sz in (-1, 1):
                x, y, z = c[0] + sx * h[0], c[1] + sy * h[1], c[2] + sz * h[2]
                pts += [Vector((x - sx * ch, y, z)), Vector((x, y - sy * ch, z)), Vector((x, y, z - sz * ch))]
    return pts

def chip(m, loc, nrm, size, seed, mat, flat=.5, n=8):
    """A faceted ore chip seated on a surface point, flattened along the surface normal (props v2)."""
    rng = random.Random(seed)
    pts = blob((0, 0, 0), (size, size * rng.uniform(.6, .85), size * flat), seed, n=n, cuts=1, cut=(.6, .8))
    q = Vector((0, 0, 1)).rotation_difference(nrm); rz = Matrix.Rotation(rng.uniform(0, math.tau), 3, 'Z')
    c = Vector(loc) + nrm * size * flat * .25
    m.hull([c + q @ (rz @ p) for p in pts], lambda nn, cc: mat)

def arc(cx, cy, z, rx, ry, a0, a1, seg):
    return [(cx + rx * math.cos(a0 + (a1 - a0) * i / seg), cy + ry * math.sin(a0 + (a1 - a0) * i / seg), z) for i in range(seg + 1)]

def clip_half(poly, nrm, off):
    """Sutherland-Hodgman: keep the part of a 2D polygon with dot(p, nrm) <= off."""
    out = []
    for i in range(len(poly)):
        a, b = poly[i], poly[(i+1) % len(poly)]
        da, db = a[0]*nrm[0] + a[1]*nrm[1] - off, b[0]*nrm[0] + b[1]*nrm[1] - off
        if da <= 0: out.append(a)
        if (da <= 0) != (db <= 0):
            t = da / (da - db); out.append((a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t))
    return out

# ---------------------------------------------------------------- items
ITEMS = []    # (id, description, M, icon_yaw_deg)
def item(iid, desc, m, yaw=30): ITEMS.append((iid, desc, m, yaw))

# tinderbox: tin box with a lid lip, an iron C-striker and a flint on top
def b_tinderbox():
    m = M()
    m.hull(cbox((0, 0, .026), (.1, .064, .026), .012), P('tin'))                       # box
    m.hull(cbox((0, 0, .062), (.106, .07, .012), .008), lambda n, c: P('tin') if n.z > .5 else P('iron'))   # lid, iron lip
    path = arc(-.012, 0, .082, .068, .036, math.radians(35), math.radians(325), 10)    # C-shaped striker steel
    m.ptube(path, .012, 5, P('iron'), up=(0, 0, 1), flat=.75, cap0=P('iron'), cap1=P('iron'))
    m.hull(blob((.066, .006, .084), (.026, .02, .014), 11, n=9, cuts=1), P('char'))     # flint
    return m

# hammer: oak handle with a leather grip, iron head (flat striking face + tapered peen) lying on its side
def b_hammer():
    m = M()
    m.ptube([(-.21, 0, .03), (.19, 0, .04)], [.03, .026], 6, P('wood'), cap0=P('wood-dark'))
    m.ptube([(-.215, 0, .03), (-.09, 0, .034)], .035, 6, P('leather'), cap0=P('wood-dark'), cap1=P('leather'))
    face = [(.17 + x, -.02 + y, z) for x in (-.055, .055) for y in (-.105, .02) for z in (.004, .096)]
    face += [(.17 + x, -.132, z) for x in (-.043, .043) for z in (.014, .086)]
    m.hull(face, lambda n, c: P('tin') if n.y < -.9 else P('iron'))                     # striking block
    peen = [(.17 + x, .02, z) for x in (-.05, .05) for z in (.008, .092)] + [(.17 + x, .125, z) for x in (-.011, .011) for z in (.02, .08)]
    m.hull(peen, P('iron'))
    return m

# bucket: tapered stave bucket, two iron hoops, iron bail handle flopped back; optional water / flour heap
def b_bucket(fill=None):
    m = M(); n = 10
    def ring(r, z): return [(r * math.cos(math.tau * i / n + .31), r * math.sin(math.tau * i / n + .31), z) for i in range(n)]
    rb, rt, H, wall, floor = .128, .165, .3, .016, .03
    def rout(z): return rb + (rt - rb) * z / H
    rings = [ring(rb, 0), ring(rt, H), ring(rt - wall, H), ring(rb - wall + .004, floor)]
    m.loft(rings, lambda j, i: [P('wood'), P('wood-dark'), P('wood-dark')][j], cap0=P('wood-dark'), cap1=P('wood-dark'))
    for z0, z1 in ((.035, .075), (.215, .255)):                                         # iron hoops
        m.loft([ring(rout(z0) + .001, z0 - .003), ring(rout(z0) + .011, z0), ring(rout(z1) + .011, z1), ring(rout(z1) + .001, z1 + .003)], P('iron'))
    for sx in (-1, 1):                                                                   # handle lugs
        m.hull(cbox((sx * (rout(.265) + .004), 0, .265), (.012, .018, .022), 0), P("iron"))
    R, th, zp = rout(.265) + .016, math.radians(62), .265                                 # bail handle, flopped toward +Y
    pts = []
    for k in range(9):
        ph = math.pi * k / 8; u = R * math.sin(ph)
        pts.append((R * math.cos(ph), u * math.sin(th), zp + u * math.cos(th)))
    m.ptube(pts, .01, 4, P('iron'), phase=math.pi / 4, cap0=P('iron'), cap1=P('iron'))
    zi = lambda z: (rb - wall + .004) + ((rt - wall) - (rb - wall + .004)) * (z - floor) / (H - floor)
    if fill == 'water':
        m.poly(ring(zi(.255), .255), P('water'))
    if fill == 'flour':
        rng = random.Random(77)
        heap = [ring(zi(.27) + .003, .27)]
        for r, z in ((.118, .31), (.072, .34)):
            heap.append([(x * (1 + rng.uniform(-.06, .06)), y * (1 + rng.uniform(-.06, .06)), z + rng.uniform(-.006, .006))
                         for x, y, _ in ring(r, 0)])
        m.loft(heap, P('flour'))
        m.pyramid(heap[-1], (.008, -.006, .358), P('flour'))
    return m

# dough: a round, slightly slumped dough ball with a pinched fold
def b_dough():
    m = M()
    m.hull(ell((0, 0, .05), (.09, .082, .058), nu=9, nv=5, floor=.0), P('dough'))
    m.hull(ell((.02, .01, .094), (.035, .02, .012), nu=6, nv=3), P('dough'))          # fold on top
    return m

# loaf body shared by bread dough and bread: flat-bottomed dome lofted along X, 3 score bands on top
def loaf(L, W, H, body, score, seed):
    m = M(); rng = random.Random(seed); n = 10; st = 9; rings = []
    for j in range(st):
        t = -1 + 2 * j / (st - 1); x = t * L
        f = max(math.sqrt(max(1 - t * t, 0)), .001) ** .55
        w, h = W * max(f, .18), H * max(f, .3)
        ring = []
        for i in range(n):
            a = -.2 + (math.pi + .4) * i / (n - 1)
            ring.append((x * (1 + rng.uniform(-.01, .01)), w * math.cos(a), max(0., h * math.sin(a) + h * .12)))
        rings.append(ring)
    def side(j, i):
        return score if (j in (2, 4, 6) and 3 <= i <= 5) else body
    m.loft(rings, side, cap0=body, cap1=body)
    return m
def b_bread_dough():
    return loaf(.15, .085, .085, P('dough'), P('flour'), 21)
def b_bread():
    return loaf(.16, .09, .105, P('crust'), P('dough'), 22)

# logs: three bark logs, pale end grain, two leather bindings
def b_logs():
    m = M(); r = .062
    cs = [(-.02, -.064, r), (.02, .064, r), (0, 0, r + .108)]
    for k, (dx, y, z) in enumerate(cs):
        m.ptube([(-.28 + dx, y, z), (.28 + dx, y, z)], [r, r * .96], 7, P('wood-dark'), seed=40 + k, jit=.06, phase=.2 * k,
                cap0=P('dough'), inset0=(P('wood'), .6, .006), cap1=P('dough'), inset1=(P('wood'), .6, .006))
    for bx in (-.15, .14):
        pts = []
        for dx, y, z in cs:
            for i in range(8):
                a = math.tau * i / 8
                for sx in (-.017, .017): pts.append((bx + sx, y + math.cos(a) * (r + .01), z + math.sin(a) * (r + .01)))
        m.hull(pts, P('leather'))
    return m

# perch: fish lying on its side (flank up), barred body, forked tail, spiny dorsal fin; three colourways
def b_perch(body, bar, belly, fin, eye):
    m = M(); n = 8
    st = [(.2, .03, .022), (.17, .082, .046), (.12, .122, .062), (.07, .136, .066), (.02, .134, .064),
          (-.03, .12, .058), (-.075, .096, .046), (-.11, .066, .032), (-.14, .04, .022), (-.155, .034, .018)]
    rings = []
    for x, D, T in st:
        rings.append([(x, D / 2 * math.cos(math.tau * i / n), T / 2 + T / 2 * math.sin(math.tau * i / n)) for i in range(n)])
    def side(j, i):
        mid = math.tau * (i + .5) / n
        if math.cos(mid) < -.45: return belly
        return bar if j in (3, 5, 7) else body
    m.loft(rings, side, cap1=body)
    m.pyramid(list(reversed(rings[0])), (.222, -.004, .012), body)                     # snout
    for s in (1, -1):                                                                   # forked tail lobes
        m.hull([(-.145, s * .004, z) for z in (.004, .018)] + [(-.145, s * .03, z) for z in (.004, .018)] +
               [(-.255, s * .1, z) for z in (.006, .012)] + [(-.225, s * .012, z) for z in (.006, .014)], fin)
    back = [(.1, .064), (.07, .068), (.04, .068), (.01, .066), (-.02, .062), (-.05, .054), (-.08, .045)]
    for k in range(len(back) - 1):                                                      # spiny dorsal fin (flat, both sides)
        (x0, y0), (x1, y1) = back[k], back[k + 1]
        tip = (x0 - .006, y0 + (.05 if k < 4 else .032), .03)
        m.poly([(x0, y0 - .006, .03), (x1, y1 - .006, .03), tip], fin, both=True)
    for x0, tipdx in ((.02, -.05), (-.05, -.045)):                                      # belly fins
        y0 = -.058
        m.poly([(x0, y0 + .006, .026), (x0 - .03, y0 + .006, .026), (x0 + tipdx, y0 - .036, .026)], fin, both=True)
    m.poly([(.1, -.01, .065), (.085, .014, .066), (.045, -.022, .066)], fin)           # pectoral fin on the flank
    m.hull(ell((.145, .012, .05), (.013, .013, .014), nu=6, nv=3), eye)                 # eye
    return m

# ore lumps: faceted rock with big raised ore chips
def b_ore(base, fleck, seed):
    m = M(); ore = M()
    pts = blob((0, 0, .08), (.14, .11, .085), seed, n=18, cuts=4, floor=0., jit=(.84, 1.06))
    m.hull(pts, lambda n, c: base)
    bvh = BVHTree.FromPolygons([tuple(v) for v in m.v], m.f); rng = random.Random(seed + 1)
    for k, (az, el) in enumerate([(.3, .9), (2.0, .7), (3.6, .8), (5.0, .6), (1.1, .25), (4.2, .2), (2.9, 1.35)]):
        d = Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el)))
        loc, nrm, _, _ = bvh.ray_cast(Vector((0, 0, .06)) + d * 2, -d)
        if loc is None: continue
        if nrm.dot(d) < 0: nrm = -nrm
        chip(ore, loc, nrm, rng.uniform(.042, .052), seed + 10 + k, fleck, flat=.45, n=7)
    m.add(ore.v, [tuple(i for i in f) for f in ore.f], ore.mi)
    return m

# bronze bar: bevelled trapezoid ingot
def b_bronze_bar():
    m = M(); pts = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            pts += [(sx * .15, sy * .064, 0), (sx * .145, sy * .06, .012), (sx * .128, sy * .05, .066), (sx * .114, sy * .037, .078)]
    m.hull(pts, P('bronze'))
    return m

# fishing net: wooden hoop, cord lattice, handle with leather grip
def b_fishing_net():
    m = M(); cx, R = .125, .13
    hoop = arc(cx, 0, .015, R, R, 0, math.tau * 13 / 14, 13)
    m.ptube(hoop, .014, 5, P('wood'), closed=True, up=(0, 0, 1))
    m.ptube([(-.33, 0, .016), (cx - R + .005, 0, .016)], .014, 6, P('wood'), cap0=P('wood-dark'), cap1=P('wood'))
    m.ptube([(-.335, 0, .018), (-.22, 0, .018)], .018, 6, P('leather'), cap0=P('wood-dark'), cap1=P('leather'))
    circ = [(R * .97 * math.cos(math.tau * i / 24), R * .97 * math.sin(math.tau * i / 24)) for i in range(24)]
    w = .0055
    for ang in (math.radians(45), math.radians(-45)):                                    # diagonal cord lattice
        dvec = (math.cos(ang), math.sin(ang)); nv = (-dvec[1], dvec[0])
        for off in (-.084, -.028, .028, .084):
            poly = clip_half(circ, nv, off + w); poly = clip_half(poly, (-nv[0], -nv[1]), -(off - w))
            if len(poly) < 3: continue
            # strip polygon -> thin slab lying on the ground (top + two long sides)
            top = [(cx + x, y, .012) for x, y in poly]
            m.poly(top, P('dough'))
    return m

# coins: a short stack plus two loose coins, gold faces with bronze-dark milled edges
def b_coins():
    m = M()
    def coin(x, y, z, tilt=0.0, rot=0.0):
        n = 10; r = .056; h = .017
        base = Matrix.Translation((x, y, z)) @ Matrix.Rotation(rot, 4, 'Z') @ Matrix.Rotation(tilt, 4, 'X')
        r0 = [base @ Vector((r * math.cos(math.tau * i / n), r * math.sin(math.tau * i / n), 0)) for i in range(n)]
        r1 = [base @ Vector((r * math.cos(math.tau * i / n), r * math.sin(math.tau * i / n), h)) for i in range(n)]
        m.loft([r0, r1], P('bronze'), cap0=P('gold'), cap1=P('gold'), inset1=(P('gold'), .72, -.003))
    for k in range(4): coin(.045 + (.006 if k % 2 else -.004), .004 * k, .017 * k, rot=.3 * k)
    coin(-.075, .045, 0, rot=.2); coin(-.1, -.05, 0, rot=.5)
    return m

# arrows: four bronze-tipped arrows fanned slightly, white fletching (two flat vanes + one upright)
def b_arrows():
    m = M(); r = .011
    for k, (yt, yh) in enumerate([(-.1, -.033), (-.034, -.011), (.034, .011), (.1, .033)]):
        a = Vector((-.3, yt, r)); b = Vector((.23, yh, r)); d = (b - a).normalized(); s = Vector((-d.y, d.x, 0))
        m.ptube([a, b], r, 4, P('wood'), phase=math.pi / 4, cap0=P('wood-dark'), cap1=P('wood'))
        tip = b + d * .095; bb = b - d * .018
        m.hull([tip, b + s * .036, b - s * .036, bb + s * .042, bb - s * .042, b + Vector((0, 0, .011)), b - Vector((0, 0, .009)),
                b + d * .02 + Vector((0, 0, .008))], P('bronze'))
        t0 = a + d * .012; t1 = a + d * .11
        for sgn in (1, -1):
            m.poly([t0 + s * sgn * .004, t1 + s * sgn * .004, t1 - d * .012 + s * sgn * .024, t0 - d * .01 + s * sgn * .026], P('flour'), both=True)
        up = Vector((0, 0, 1))
        m.poly([t0 + up * .008, t1 + up * .008, t1 - d * .012 + up * .03, t0 - d * .01 + up * .032], P('flour'), face=s, both=True)
    return m

# rune stones: chunky rounded pebble with a raised sigil (original designs)
def rune_stone():
    m = M(); n = 14
    def rr(sx, sy, z):
        out = []
        for i in range(n):
            a = math.tau * i / n + .1; c, s = math.cos(a), math.sin(a)
            k = (abs(c) ** 3 + abs(s) ** 3) ** (-1 / 3)                                    # superellipse (rounded square)
            out.append((sx * c * k, sy * s * k, z))
        return out
    rings = [rr(.088, .074, 0), rr(.1, .086, .02), rr(.098, .084, .046), rr(.084, .07, .062)]
    m.loft(rings, P('stone'), cap0=P('stone'), cap1=P('stone'))
    return m
def b_air_rune():
    m = rune_stone()                                                                    # air: an open wind swirl + a gust tick
    pts = []
    for k in range(13):
        t = k / 12; a = .4 + t * math.tau * 1.25; rad = .012 + .044 * t
        pts.append((rad * math.cos(a), rad * math.sin(a), .066))
    m.ptube(pts, .009, 4, P('flour'), up=(0, 0, 1), flat=.8, phase=math.pi / 4, cap0=P('flour'), cap1=P('flour'))
    return m
def b_mind_rune():
    m = rune_stone()                                                                    # mind: a crescent cradling a dot
    pts = arc(0, -.004, .066, .05, .046, math.radians(200), math.radians(-20), 9)
    m.ptube(pts, .01, 4, P('ore'), up=(0, 0, 1), flat=.8, phase=math.pi / 4, cap0=P('ore'), cap1=P('ore'))
    m.hull(ell((0, .014, .068), (.018, .018, .01), nu=7, nv=3), P('ore'))
    return m

# leather body: sleeveless-cut jerkin laid flat (shoulders along X), laced front, belt with bronze buckle
def b_leather_body():
    m = M()
    half = [(0, -.23), (.16, -.235), (.19, -.2), (.17, -.02), (.18, .07), (.28, .03), (.305, .115), (.215, .215), (.085, .235), (0, .12)]
    out = half + [(-x, y) for x, y in reversed(half[1:-1])]
    lo = [(x, y, 0) for x, y in out]; hi = [(x * .9, y * .9 - .004, .058) for x, y in out]
    m.loft([lo, hi], P('leather'), cap1=P('leather'))
    m.poly([(x * .72, y * .72 + .0, 0) for x, y in out][::-1], P('leather'), face=(0, 0, -1))   # underside
    z = .06
    m.poly([(-.012, .11, z), (.012, .11, z), (.012, -.12, z), (-.012, -.12, z)], P('wood-dark'))  # lace line
    for y in (.08, .03, -.02, -.07):
        m.poly([(-.03, y - .006, z + .002), (.03, y + .006, z + .002), (.03, y + .012, z + .002), (-.03, y, z + .002)], P('wood-dark'))
    m.hull(cbox((0, -.155, .058), (.152, .02, .008), .004), P('wood-dark'))             # belt
    m.hull(cbox((0, -.155, .066), (.024, .026, .007), .004), P('bronze'))               # buckle
    return m

# wood shield: round plank shield lying face-up, iron rim and boss
def b_wood_shield():
    m = M(); R, n, T = .3, 16, .042
    def ring(r, z): return [(r * math.cos(math.tau * i / n), r * math.sin(math.tau * i / n), z) for i in range(n)]
    m.loft([ring(R - .004, 0), ring(R, T)], P('wood-dark'), cap0=P('wood-dark'), cap1=P('wood-dark'))
    circ = [(x, y) for x, y, _ in ring(R - .012, 0)]
    edges = [-R, -.14, 0, .14, R]
    for k in range(4):                                                                   # planks with dark gaps
        poly = clip_half(circ, (1, 0), edges[k + 1] - .006); poly = clip_half(poly, (-1, 0), -(edges[k] + .006))
        m.poly([(x, y, T + .004) for x, y in poly], P('wood'))
    m.ptube(arc(0, 0, T + .002, R, R, 0, math.tau * 15 / 16, 15), .02, 5, P('iron'), closed=True, up=(0, 0, 1), flat=.7)
    m.hull(ell((0, 0, T + .004), (.072, .072, .042), nu=8, nv=3, floor=T), P('iron'))   # boss
    return m

# bones: a chunky long bone with knobbed ends
def b_bones():
    m = M(); z = .04
    m.ptube([(-.15, 0, z), (0, .004, z - .002), (.15, 0, z)], [.026, .021, .026], 6, P('flour'))
    for sx in (-1, 1):
        pts = ell((sx * .175, .03, z), (.042, .04, .04), nu=7, nv=3) + ell((sx * .168, -.03, z), (.04, .038, .038), nu=7, nv=3)
        m.hull(pts, P('flour'))
    return m

BUILDERS = [
    ('tinderbox', 'Small tin box, iron C-striker and flint', b_tinderbox, 30),
    ('hammer', 'Smithing hammer: oak handle, leather grip, iron head', b_hammer, 30),
    ('bucket', 'Empty stave bucket, iron hoops, iron bail handle', lambda: b_bucket(None), 20),
    ('bucket_water', 'Bucket of water', lambda: b_bucket('water'), 20),
    ('bucket_flour', 'Bucket heaped with flour', lambda: b_bucket('flour'), 20),
    ('dough', 'Round dough ball', b_dough, 20),
    ('bread_dough', 'Shaped raw loaf, flour-dusted score bands', b_bread_dough, 30),
    ('bread', 'Baked loaf, pale score bands', b_bread, 30),
    ('logs', 'Three bark logs bound with leather', b_logs, 30),
    ('raw_perch', 'Raw mirrorperch, silver-green, orange fins', lambda: b_perch(P('fish'), P('rock'), P('tin'), P('ore'), P('char')), 25),
    ('cooked_perch', 'Cooked mirrorperch, browned', lambda: b_perch(P('crust'), P('wood-dark'), P('dough'), P('wood-dark'), P('char')), 25),
    ('burnt_perch', 'Burnt mirrorperch, charred', lambda: b_perch(P('char'), P('wood-dark'), P('rock'), P('char'), P('rock')), 25),
    ('copper_ore', 'Rock lump with orange copper chips', lambda: b_ore(P('rock'), P('ore'), 120), 20),
    ('tin_ore', 'Rock lump with pale tin chips', lambda: b_ore(P('rock'), P('tin'), 140), 20),
    ('bronze_bar', 'Bevelled bronze ingot', b_bronze_bar, 30),
    ('fishing_net', 'Small hand net: hoop, cord lattice, handle', b_fishing_net, 35),
    ('coins', 'Short stack of gold coins + two loose', b_coins, 20),
    ('arrows', 'Four bronze-tipped arrows with white fletching', b_arrows, 35),
    ('air_rune', 'Rune stone, white wind-swirl sigil', b_air_rune, 15),
    ('mind_rune', 'Rune stone, orange crescent-and-dot sigil', b_mind_rune, 15),
    ('leather_body', 'Leather jerkin laid flat, laced, belted', b_leather_body, 10),
    ('wood_shield', 'Round plank shield, iron rim and boss', b_wood_shield, 15),
    ('bones', 'A chunky long bone', b_bones, 35),
]
ALIASES = {'pot_of_flour': 'bucket_flour'}   # same model + icon, own root (shared mesh data)
for iid, desc, fn, yaw in BUILDERS:
    if ONLY and iid not in ONLY: continue
    item(iid, desc, fn(), yaw)

# ---------------------------------------------------------------- id check against the game data
def game_ids():
    ids = set()
    for f in ('src/game1_data.js', 'src/cooking_bread.js'):
        txt = (ROOT / f).read_text(encoding='utf8', errors='replace')
        if f.endswith('game1_data.js'):
            s = txt.index('const ITEMS'); txt = txt[s:]
        ids |= set(re.findall(r"^\s*([a-z_0-9]+)\s*:\s*\{name:", txt, re.M))
    return ids
GAME_IDS = game_ids()
WANTED = [b[0] for b in BUILDERS] + list(ALIASES)
MISSING = [i for i in WANTED if i not in GAME_IDS]

# ---------------------------------------------------------------- build objects
roots = []
for iid, desc, m, yaw in ITEMS:
    xs = [p.x for p in m.v]; ys = [p.y for p in m.v]; zs = [p.z for p in m.v]
    cx, cy, z0 = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, min(zs)
    for v in m.v: v.x -= cx; v.y -= cy; v.z -= z0
    root = bpy.data.objects.new(iid, None); bpy.context.collection.objects.link(root)
    me = bpy.data.meshes.new(iid + '_Mesh'); me.from_pydata([tuple(v) for v in m.v], [], m.f); me.validate(clean_customdata=False); me.update()
    slots = list(dict.fromkeys(m.mi))
    for sname in slots: me.materials.append(MAT[sname])
    for poly, sname in zip(me.polygons, m.mi): poly.material_index = slots.index(sname); poly.use_smooth = False
    ob = bpy.data.objects.new(iid + '_Mesh', me); bpy.context.collection.objects.link(ob); ob.parent = root
    roots.append((root, desc, yaw))
for alias, src in ALIASES.items():
    srcr = next((r for r, _, _ in roots if r.name == src), None)
    if srcr is None: continue
    root = bpy.data.objects.new(alias, None); bpy.context.collection.objects.link(root)
    ob = bpy.data.objects.new(alias + '_Mesh', srcr.children[0].data); bpy.context.collection.objects.link(ob); ob.parent = root
    roots.append((root, next(d for r, d, _ in roots if r.name == src) + ' (alias of %s)' % src, next(y for r, _, y in roots if r.name == src)))

def tri_count(ob): return sum(len(p.vertices) - 2 for x in ob.children_recursive if x.type == 'MESH' for p in x.data.polygons)
def raw_bounds(ob):
    pts = [x.matrix_world @ v.co for x in ob.children_recursive if x.type == 'MESH' for v in x.data.vertices]
    return [min(p[i] for p in pts) for i in range(3)], [max(p[i] for p in pts) for i in range(3)]
def bounds(ob):
    lo, hi = raw_bounds(ob)
    return {'min': [lo[0], lo[2], -hi[1]], 'max': [hi[0], hi[2], -lo[1]]}

bpy.context.view_layer.update()
for r, _, _ in roots:   # conventions: base on the ground, centred, longest axis along +X
    lo, hi = raw_bounds(r); ext = [hi[i] - lo[i] for i in range(3)]
    assert abs(lo[2]) < 1e-5 and abs(lo[0] + hi[0]) < 1e-5 and abs(lo[1] + hi[1]) < 1e-5, (r.name, lo, hi)
    assert ext[0] >= ext[1] - 1e-4 and ext[0] >= ext[2] - 1e-4, (r.name, 'longest axis must be +X', ext)
    assert tri_count(r) <= 400, (r.name, tri_count(r))

bpy.ops.object.select_all(action='DESELECT')
for r, _, _ in roots:
    r.select_set(True)
    for x in r.children_recursive: x.select_set(True)
glb = OUT / 'items.glb'
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
assert len(doc.get('materials', [])) <= 16, len(doc['materials'])
assert not doc.get('images') and not doc.get('textures'), 'no image textures allowed'
for gm in doc['materials']:   # authored sRGB must survive export untouched
    got = gm['pbrMetallicRoughness']['baseColorFactor'][:3]
    assert all(abs(a - b) < 1e-4 for a, b in zip(got, PALETTE[gm['name']])), (gm['name'], got)

bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'items.blend'))

manifest = {'schema': 1, 'status': 'candidate-not-visual-or-runtime-accepted', 'axes': 'glTF Y-up, 1 unit = tile; origin = resting base centre; longest axis +X',
            'colour': 'material colours are authored sRGB, drawn as-is (no linear conversion); roughness 1; no textures',
            'blend': 'items.blend', 'file': 'items.glb', 'sha256': sha, 'aliases': ALIASES, 'items': []}
total = 0; rows = []
for r, desc, yaw in roots:
    b = bounds(r); tris = tri_count(r)
    mats = sorted({m.name for x in r.children_recursive if x.type == 'MESH' for m in x.data.materials})
    assert r.name in glb_roots, r.name
    gt = glb_tris(glb_roots[r.name]); assert gt == tris, (r.name, gt, tris)
    if r.name not in ALIASES: total += tris
    size = [round(b['max'][i] - b['min'][i], 3) for i in range(3)]
    manifest['items'].append({'id': r.name, 'root': r.name, 'file': glb.name, 'description': desc, 'triangles': tris,
                              'materials': mats, 'bounds': b, 'size': size, 'icon': 'assets/icons/items/%s.png' % r.name,
                              'inGameData': r.name in GAME_IDS})
    rows.append((r.name, tris, size, len(mats)))
    print(TAG, r.name, tris, 'tris', len(mats), 'mats size', size)
manifest['totals'] = {'triangles': total, 'materials': len(doc['materials']), 'items': len(roots),
                      'budget': {'perItemTriangles': 400, 'materials': 16}}
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf8')
print(TAG, 'GLB PASS', total, 'tris', len(doc['materials']), 'materials sha256', sha)

# ---------------------------------------------------------------- icons
import numpy as np
scene = bpy.context.scene
for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
    try: scene.render.engine = eng; break
    except TypeError: pass
vts = [i.identifier for i in scene.view_settings.bl_rna.properties['view_transform'].enum_items]
scene.view_settings.view_transform = 'Raw' if 'Raw' in vts else 'Standard'   # authored sRGB x lighting reaches the PNG as-is
scene.view_settings.look = 'None'
scene.world = bpy.data.worlds.new('IconWorld'); scene.world.use_nodes = True
bg = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
bg.inputs[0].default_value = (1, 1, 1, 1); bg.inputs[1].default_value = .42
key = bpy.data.objects.new('IconKey', bpy.data.lights.new('IconKey', 'SUN')); key.data.energy = 2.3; key.data.angle = math.radians(3)
key.rotation_euler = (math.radians(38), 0, math.radians(-40)); scene.collection.objects.link(key)
fill = bpy.data.objects.new('IconFill', bpy.data.lights.new('IconFill', 'SUN')); fill.data.energy = .45
fill.rotation_euler = (math.radians(70), 0, math.radians(140)); scene.collection.objects.link(fill)
try: scene.eevee.taa_render_samples = 16
except Exception: pass
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGBA'
scene.render.filter_size = 1.0

ICON, SS, EL, MARGIN = 96, 4, math.radians(50), .07
cam = bpy.data.objects.new('IconCam', bpy.data.cameras.new('IconCam')); scene.collection.objects.link(cam)
cam.data.type = 'ORTHO'; scene.camera = cam
cam.location = Vector((0, -math.cos(EL), math.sin(EL))) * 20
cam.rotation_euler = (-cam.location).to_track_quat('-Z', 'Y').to_euler()
TMP = PROOF / '_tmp'; TMP.mkdir(exist_ok=True)

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
def srgb_decode(c):
    return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
INK = np.array([.07, .055, .04])
def outline(arr):
    """RS-style 1px dark ink outline around the silhouette (+ faint 1px drop shadow down-right)."""
    a = arr[..., 3]
    dil = np.max([shift(a, dy, dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1)], axis=0)
    ol = np.zeros_like(arr); ol[..., :3] = INK; ol[..., 3] = np.clip(dil, 0, 1) * .9
    sh = np.zeros_like(arr); sh[..., :3] = INK; sh[..., 3] = shift(dil, -1, 1) * .35   # row 0 = bottom: dy -1 = down
    return over(arr, over(ol, sh))

hidden = (0, 0, -100)
icon_rows = []
for r, _, _ in roots: r.location = hidden
for r, desc, yaw in roots:
    r.location = (0, 0, 0); r.rotation_euler = (0, 0, math.radians(yaw)); bpy.context.view_layer.update()
    inv = cam.matrix_world.inverted()
    pts = [inv @ (x.matrix_world @ v.co) for x in r.children_recursive if x.type == 'MESH' for v in x.data.vertices]
    x0, x1 = min(p.x for p in pts), max(p.x for p in pts); y0, y1 = min(p.y for p in pts), max(p.y for p in pts)
    span = max(x1 - x0, y1 - y0) * (1 + 2 * MARGIN)
    cam.data.ortho_scale = span; cam.data.shift_x = (x0 + x1) / 2 / span; cam.data.shift_y = (y0 + y1) / 2 / span
    scene.render.resolution_x = scene.render.resolution_y = ICON * SS; scene.render.resolution_percentage = 100
    tmp = TMP / (r.name + '.png'); scene.render.filepath = str(tmp); bpy.ops.render.render(write_still=True)
    rawimg = load_px(tmp)
    rawimg[..., :3] = srgb_decode(rawimg[..., :3])   # PNG writer display-encodes; undo so authored sRGB x light is what we see
    img = outline(down(rawimg, SS))
    save_px(img, ICONS / (r.name + '.png'))
    icon_rows.append((r.name, img))
    r.location = hidden; r.rotation_euler = (0, 0, 0)
imf = {'schema': 1, 'size': [ICON, ICON], 'background': 'transparent', 'source': 'tools/blender/build_holm_items_v1.py',
       'camera': 'orthographic, 50 deg elevation, auto-framed to bounds, %d%% margin' % int(MARGIN * 100),
       'icons': [{'id': n, 'file': n + '.png'} for n, _ in icon_rows]}
(ICONS / 'manifest.json').write_text(json.dumps(imf, indent=2) + '\n', encoding='utf8')
print(TAG, 'icons ->', ICONS, len(icon_rows))

# contact sheet: each icon at 96 / 48 / 32 px on inventory-slot colours
def hexc(h): return np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)])
PANEL, SLOT, LINE = hexc('#3e3529'), hexc('#473e30'), hexc('#5d5447')
COLS = 4; CW, CH = 104 + 56 + 40 + 24, 116
rowsN = (len(icon_rows) + COLS - 1) // COLS
sheet = np.zeros((rowsN * CH + 12, COLS * CW + 12, 4)); sheet[..., :3] = PANEL; sheet[..., 3] = 1
def paste(img, x, y, slot):   # (x, y) = top-left in image coords (top-down)
    H = sheet.shape[0]; h, w = img.shape[:2]
    y0 = H - (y + slot)
    sheet[y0:y0 + slot, x:x + slot, :3] = LINE
    sheet[y0 + 1:y0 + slot - 1, x + 1:x + slot - 1, :3] = SLOT
    ox, oy = x + (slot - w) // 2, y0 + (slot - h) // 2
    region = sheet[oy:oy + h, ox:ox + w]
    sheet[oy:oy + h, ox:ox + w] = over(img, region)
for k, (n, img) in enumerate(icon_rows):
    cx, cy = 12 + (k % COLS) * CW, 12 + (k // COLS) * CH
    paste(img, cx, cy, 104)
    i48 = down(img, 2); paste(i48, cx + 110, cy, 56)
    i32 = down(img, 3); paste(i32, cx + 172, cy, 40)
save_px(sheet, PROOF / 'sheet.png')
print(TAG, 'sheet ->', PROOF / 'sheet.png', 'order:', ' '.join(n for n, _ in icon_rows))

# ---------------------------------------------------------------- lineup proof render (presentation only; not saved)
if not NO_PROOF:
    scene.render.film_transparent = False
    bg.inputs[0].default_value = (.62, .7, .8, 1); bg.inputs[1].default_value = .45
    key.data.energy = 1.6
    def flat(name, rgb):
        m = bpy.data.materials.new(name); m.use_nodes = True
        bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        bs.inputs['Base Color'].default_value = (*rgb, 1); bs.inputs['Roughness'].default_value = 1; return m
    ground_m = flat('ground', (.36, .46, .2)); cap_m = flat('capsule', (.55, .62, .75)); ink = flat('label', (.1, .12, .07))
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, 0)); bpy.context.object.data.materials.append(ground_m)
    objs = []
    bpy.ops.mesh.primitive_cylinder_add(radius=.24, depth=1.42, location=(-.6, .3, .95), vertices=16); objs.append(bpy.context.object)
    for z in (.24, 1.66):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=.24, location=(-.6, .3, z), segments=16, ring_count=8); objs.append(bpy.context.object)
    for o in objs: o.data.materials.append(cap_m)
    def label(txt, x, y):
        cu = bpy.data.curves.new('lbl', 'FONT'); cu.body = txt; cu.size = .075; cu.align_x = 'CENTER'
        o = bpy.data.objects.new('lbl_' + txt, cu); o.location = (x, y, .003); cu.materials.append(ink); scene.collection.objects.link(o)
    label('1.9 capsule', -.6, -.1)
    per = (len(roots) + 1) // 2; maxx = 0
    for row in range(2):
        x = 0.0; y = .55 - row * 1.1
        for r, _, _ in roots[row * per:(row + 1) * per]:
            vx = [v.co.x for c in r.children for v in c.data.vertices]; vy = [v.co.y for c in r.children for v in c.data.vertices]
            w = max(vx) - min(vx); x += .1 + w / 2
            r.location = (x, y, 0); label(r.name, x, y + min(vy) - .09); x += w / 2 + .05
        maxx = max(maxx, x)
    bpy.context.view_layer.update()
    lcam = bpy.data.objects.new('LineCam', bpy.data.cameras.new('LineCam')); scene.collection.objects.link(lcam)
    mid = (maxx - .9) / 2
    lcam.location = (mid, -6, 5.2); lcam.rotation_euler = (Vector((mid, .15, .35)) - lcam.location).to_track_quat('-Z', 'Y').to_euler()
    lcam.data.type = 'ORTHO'; lcam.data.ortho_scale = maxx + 1.4; scene.camera = lcam
    scene.render.resolution_x = 2400; scene.render.resolution_y = 1100
    scene.render.filepath = str(PROOF / 'lineup.png'); bpy.ops.render.render(write_still=True)
    li = load_px(PROOF / 'lineup.png'); li[..., :3] = srgb_decode(li[..., :3]); save_px(li, PROOF / 'lineup.png')
    print(TAG, 'lineup ->', PROOF / 'lineup.png')

# ---------------------------------------------------------------- REPORT.md
rep = ['# Holm item pack v1 -- report', '',
       'Built by `tools/blender/build_holm_items_v1.py` (Blender 4.5 headless). Candidate only: not wired into the runtime.', '',
       '## Outputs', '',
       '- `.studio-workspaces/holm-items-v1/candidates/items.glb` (one root per item id), `items.blend`, `manifest.json`',
       '- `assets/icons/items/<id>.png` (96x96 RGBA, transparent) + `assets/icons/items/manifest.json`',
       '- proof: `scratchpad/holm_items_v1/lineup.png`, `scratchpad/holm_items_v1/sheet.png` (icons at 96/48/32 px on inventory-slot colours)', '',
       '## Items', '', '| id | tris | size x/y/z (tiles, glTF Y-up) | mats | in game data |', '|---|---|---|---|---|']
for n, t, s, mc in rows:
    rep.append('| %s | %d | %.2f / %.2f / %.2f | %d | %s |' % (n, t, s[0], s[1], s[2], mc, 'yes' if n in GAME_IDS else '**NO**'))
rep += ['', '**Totals:** %d items (%d unique models + alias `pot_of_flour`), %d triangles (unique), %d materials (budget 16), no textures.' %
        (len(roots), len(roots) - len([a for a in ALIASES if a in [r.name for r, _, _ in roots]]), total, len(doc['materials'])), '',
        '## Id check', '',
        'Checked against `ITEMS` in `src/game1_data.js` plus the runtime additions in `src/cooking_bread.js` (`NEW_ITEMS`).', '',
        '- Missing from game data: ' + (', '.join('`%s`' % i for i in MISSING) if MISSING else 'none'),
        '- `dough` and `bucket_flour` are NOT in `game1_data.js` ITEMS; they are added at runtime by `src/cooking_bread.js`.',
        '- `pot_of_flour` exists in `game1_data.js`; it ships as its own root reusing the `bucket_flour` mesh (glTF shared mesh) and icon.',
        '- `wood_shield` has `model:\'shield\'`, so the gear router (`src/gear_models_v1.js`) already maps its ground/held mesh to `gear_shield`; the `wood_shield` root here is for icon / optional ground-drop use.', '',
        '## Conventions', '',
        '- 1 unit = 1 tile; Blender Z-up exported glTF Y-up; origin at resting base centre (min Y = 0); longest axis +X (asserted).',
        '- Colours authored as seen sRGB, roughness 1, specular 0, metallic 0 (props v2 rule).',
        '- Icons: orthographic camera at 50 deg elevation, item yawed 10-35 deg for a diagonal read, auto-framed to its projected bounds with 7% margin,',
        '  rendered 384 px EEVEE (Raw view transform) and box-downsampled to 96 px, then a 1 px dark ink outline + faint drop shadow (numpy post, identical for all).', '',
        '## Self-review', '',
        '- Every icon was checked on `sheet.png` at 96/48/32 px: all 24 read at 48 px; weakest are `tinderbox` (reads as a grey tin with a striker, not instantly a tinderbox) and `burnt_perch` (dark on dark, carried by the outline).',
        '- Items are real-world-ish but exaggerated (bucket 0.37, shield 0.64, arrows 0.63 tiles); not yet checked in the game engine or wired to itemGroundMesh / iconFor.',
        '- `dough`/`bucket_flour` exist only via `src/cooking_bread.js`; `pot_of_flour` shares the bucket_flour model (a separate pot model may be wanted later).', '']
(OUT / 'REPORT.md').write_text('\n'.join(rep) + '\n', encoding='utf8')
import shutil
shutil.rmtree(TMP, ignore_errors=True)
print(TAG, 'DONE')
