"""lowpoly_lib.py -- the small low-poly mesh builder shared by the Blender UI art scripts (extracted from
tools/blender/build_ui_icons_v1.py): an M accumulator of verts / faces / material names, lofts, tubes, convex hulls,
front-facing extrusions with a bevel, lathes, washers; plus shape helpers (circle, star, rounded rect, ellipsoid points).
Import from a Blender script:  sys.path.insert(0, str(Path(__file__).parent)); from lowpoly_lib import *"""
import bpy, bmesh, math, random
from mathutils import Vector, Matrix
TAU = math.tau

# ------------------------------------------------------------------ mesh builder
class M:
    def __init__(s): s.v = []; s.f = []; s.mi = []
    def add(s, vs, fs, mats):
        k = len(s.v); s.v += [Vector(v) for v in vs]
        for n, f in enumerate(fs):
            s.f.append(tuple(k + i for i in f)); s.mi.append(mats[n] if isinstance(mats, (list, tuple)) else mats)
    def mark(s): return len(s.v)
    def tf(s, k, mx):
        for i in range(k, len(s.v)): s.v[i] = mx @ s.v[i]
        return s
    def loft(s, rings, side, cap0=None, cap1=None, closed=False):
        n = len(rings[0]); k = len(s.v); vs = [p for r in rings for p in r]; fs = []; ms = []
        R = len(rings)
        for j in range(R if closed else R - 1):
            j1 = (j + 1) % R
            for i in range(n):
                fs.append((j*n+i, j*n+(i+1) % n, j1*n+(i+1) % n, j1*n+i)); ms.append(side(j, i) if callable(side) else side)
        s.add(vs, fs, ms)
        if cap1: s.f.append(tuple(k + (R-1)*n + i for i in range(n))); s.mi.append(cap1)
        if cap0: s.f.append(tuple(k + i for i in reversed(range(n)))); s.mi.append(cap0)
        return k
    def ptube(s, pts, r, n, side, up=None, closed=False, cap0=None, cap1=None, flat=1.0, phase=0.0):
        Pp = [Vector(p) for p in pts]; L = len(Pp); rr = r if isinstance(r, (list, tuple)) else [r] * L; rings = []
        for j, p in enumerate(Pp):
            t = (Pp[(j+1) % L] - Pp[(j-1) % L]) if closed else (Pp[min(j+1, L-1)] - Pp[max(j-1, 0)])
            t.normalize()
            u = Vector(up) if up is not None else (Vector((0, 0, 1)) if abs(t.z) < .9 else Vector((1, 0, 0)))
            a = t.cross(u).normalized(); b = t.cross(a).normalized()
            rings.append([p + (a * math.cos(TAU*i/n + phase) + b * math.sin(TAU*i/n + phase) * flat) * rr[j] for i in range(n)])
        return s.loft(rings, side, None if closed else cap0, None if closed else cap1, closed=closed)
    def hull(s, pts, matfn):
        bm = bmesh.new()
        for p in pts: bm.verts.new(p)
        r = bmesh.ops.convex_hull(bm, input=list(bm.verts), use_existing_faces=False)
        junk = list(dict.fromkeys(g for g in r['geom_interior'] + r['geom_unused'] if isinstance(g, bmesh.types.BMVert)))
        if junk: bmesh.ops.delete(bm, geom=junk, context='VERTS')
        bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(1.5), verts=bm.verts[:], edges=bm.edges[:])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.verts.index_update()
        vs = [v.co.copy() for v in bm.verts]; fs = [tuple(v.index for v in f.verts) for f in bm.faces]
        ms = [(matfn(f.normal.copy(), f.calc_center_median()) if callable(matfn) else matfn) for f in bm.faces]
        bm.free(); s.add(vs, fs, ms)
    # ---- flat front-facing shapes (outline in the XZ plane, camera looks along +Y) ----
    def ext(s, pts, d, front, side=None, bev=0.0, y=0.0, back=None):
        P = [Vector((p[0], p[1])) for p in pts]
        if area2(P) < 0: P = P[::-1]
        side = side or front; back = back or side; n = len(P)
        def ring(Q, yy): return [(q.x, yy, q.y) for q in Q]
        yb, yf = y + d / 2, y - d / 2
        if bev > 0:
            Q = offset(P, -bev)
            rings = [ring(P, yb), ring(P, yf), ring(Q, yf - bev * .7)]
            s.loft(rings, lambda j, i: side if j == 0 else front, cap0=back, cap1=front)
        else:
            s.loft([ring(P, yb), ring(P, yf)], side, cap0=back, cap1=front)
    def box(s, c, h, m, ch=0.0): s.hull(cbox(c, h, ch), m)
    def cyl(s, p0, p1, r, m, n=8, caps=None):
        s.ptube([p0, p1], r, n, m, cap0=caps or m, cap1=caps or m)
    def sph(s, c, r, m, nu=10, nv=6):
        rr = r if isinstance(r, (list, tuple)) else (r, r, r); s.hull(ell(c, rr, nu, nv), m)
    def lathe(s, prof, n, side, cap0=None, cap1=None, c=(0, 0, 0), phase=0.0):
        rings = [[(c[0] + r * math.cos(TAU*i/n + phase), c[1] + r * math.sin(TAU*i/n + phase), c[2] + z) for i in range(n)] for r, z in prof]
        return s.loft(rings, side, cap0, cap1)
    def ring2(s, c, ro, ri, d, m, n=16, side=None, a0=0.0, a1=TAU):
        """A flat washer (front-facing) or an arc band when a0..a1 is not a full turn."""
        full = abs(a1 - a0 - TAU) < 1e-6; seg = n if full else n + 1
        def pts(r, yy): return [(c[0] + r[0] * math.cos(a0 + (a1 - a0) * i / n), c[1] + yy, c[2] + r[1] * math.sin(a0 + (a1 - a0) * i / n)) for i in range(seg)]
        rx = ro if isinstance(ro, (tuple, list)) else (ro, ro); ix = ri if isinstance(ri, (tuple, list)) else (ri, ri)
        if full:
            s.loft([pts(rx, d/2), pts(rx, -d/2), pts(ix, -d/2), pts(ix, d/2)], lambda j, i: m if j == 1 else (side or m), closed=True)
        else:
            outer = [(p[0], p[2]) for p in pts(rx, 0)]; inner = [(p[0], p[2]) for p in pts(ix, 0)][::-1]
            s.ext(outer + inner, d, m, side, y=c[1])

def area2(P): return sum(P[i].x * P[(i+1) % len(P)].y - P[(i+1) % len(P)].x * P[i].y for i in range(len(P))) / 2
def offset(P, dist):
    out = []; n = len(P)
    for i in range(n):
        a, b, c = P[i-1], P[i], P[(i+1) % n]
        e1 = (b - a).normalized(); e2 = (c - b).normalized()
        n1 = Vector((e1.y, -e1.x)); n2 = Vector((e2.y, -e2.x)); m = (n1 + n2)
        m = m.normalized() if m.length > 1e-6 else n1
        out.append(b + m * (dist / max(.35, m.dot(n1))))
    return out
def ell(c, r, nu=10, nv=6, floor=None):
    pts = []
    for j in range(1, nv):
        th = math.pi * j / nv
        for i in range(nu):
            ph = TAU * i / nu + (j % 2) * math.pi / nu
            pts.append(Vector((c[0] + r[0]*math.sin(th)*math.cos(ph), c[1] + r[1]*math.sin(th)*math.sin(ph), c[2] + r[2]*math.cos(th))))
    pts += [Vector((c[0], c[1], c[2] + r[2])), Vector((c[0], c[1], c[2] - r[2]))]
    if floor is not None:
        for p in pts: p.z = max(p.z, floor)
    return pts
def cbox(c, h, ch):
    pts = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            for sz in (-1, 1):
                x, y, z = c[0] + sx*h[0], c[1] + sy*h[1], c[2] + sz*h[2]
                if ch: pts += [Vector((x - sx*ch, y, z)), Vector((x, y - sy*ch, z)), Vector((x, y, z - sz*ch))]
                else: pts.append(Vector((x, y, z)))
    return pts
def blob(c, s, seed, n=14, cuts=2, jit=(.84, 1.06)):
    rng = random.Random(seed); pts = []
    for i in range(n):
        z = 1 - 2 * (i + .5) / n; r = math.sqrt(max(0, 1 - z*z)); a = i * 2.39996 + rng.uniform(-.35, .35)
        pts.append(Vector((r*math.cos(a), r*math.sin(a), z)) * rng.uniform(*jit))
    for _ in range(cuts):
        u = rng.uniform(-.25, .9); th = rng.uniform(0, TAU); rr = math.sqrt(1 - u*u)
        nrm = Vector((rr*math.cos(th), rr*math.sin(th), u)); off = rng.uniform(.58, .8)
        for p in pts:
            dd = p.dot(nrm)
            if dd > off: p -= nrm * (dd - off)
    return [Vector((c[0] + p.x*s[0], c[1] + p.y*s[1], c[2] + p.z*s[2])) for p in pts]
def circ(n, r, c=(0, 0), a0=0.0, rz=None):
    rz = r if rz is None else rz
    return [(c[0] + r*math.cos(a0 + TAU*i/n), c[1] + rz*math.sin(a0 + TAU*i/n)) for i in range(n)]
def star2(n, R, r, c=(0, 0), a0=math.pi/2):
    return [(c[0] + (R if i % 2 == 0 else r)*math.cos(a0 + math.pi*i/n), c[1] + (R if i % 2 == 0 else r)*math.sin(a0 + math.pi*i/n)) for i in range(2*n)]
def heart2(sc=1.0, n=28, c=(0, 0)):
    out = []
    for i in range(n):
        t = TAU * i / n
        x = 16 * math.sin(t)**3; z = 13*math.cos(t) - 5*math.cos(2*t) - 2*math.cos(3*t) - math.cos(4*t)
        out.append((c[0] + x/17*sc, c[1] + (z+2)/17*sc))
    return out
def rrect(x0, z0, x1, z1, r, seg=3):
    pts = []
    for cx, cz, a in ((x1 - r, z0 + r, -math.pi/2), (x1 - r, z1 - r, 0), (x0 + r, z1 - r, math.pi/2), (x0 + r, z0 + r, math.pi)):
        for k in range(seg + 1): pts.append((cx + r*math.cos(a + math.pi/2*k/seg), cz + r*math.sin(a + math.pi/2*k/seg)))
    return pts


def rotY(deg): return Matrix.Rotation(-math.radians(deg), 4, 'Y')
def rotZ(deg): return Matrix.Rotation(math.radians(deg), 4, 'Z')
def rotX(deg): return Matrix.Rotation(math.radians(deg), 4, 'X')
def T(x, y, z): return Matrix.Translation((x, y, z))
def S(k): return Matrix.Scale(k, 4)
