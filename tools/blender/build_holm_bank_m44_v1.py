"""Tutor's Holm M4.4 building: Bank & service court (id `bank`, prefix `Bank_`), 2026-09-24.
(Named *_m44_v1 because tools/blender/build_holm_bank_v1.py already holds the unrelated Sept 9 bank asset.)

Chamfered counting hall with a projecting upper clerk room and a rear vault, after plan.json places[id=bank]:
 - counting hall (one storey, chamfered SE corner to the lane): gray fieldstone to the door head with a cream
   plaster frieze in dark-oak framing above, under a many-faced hip roof laid in clay tiles;
 - clerk cross-wing (west, two storeys): stone ground storey, timber-framed plaster upper storey jettied over the
   lane on a bressumer, joist ends and brackets, gabled clay roof, stone chimney on the north gable;
 - vault (north-east, one storey): heavy big-block masonry with buttresses, barred slits and a stone-slab lean-to.
Inside: teller counter with three brass-grilled booths (deposit/withdraw), barred vault gate with iron-bound chests
behind it, goods shelves for the small shop, a real stair to the clerk's room upstairs.

Local space: origin = plan footprint centre (86,57); game (x, y-up, z) -> Blender (x,-z,y); north is -z.
Ground floor y=0 sits on a plinth 0.30 above the measured pad (6.00), so the intended placement y is 6.30.
Original design; deterministic (seeded random only). Every object starts with Bank_.
"""
import bpy, bmesh, json, math, random
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.studio-workspaces/holm-bank-v1/candidates'
PROOF = ROOT / 'scratchpad/holm_bank_v1'
for p in (OUT, PROOF):
    p.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

# ---------------------------------------------------------------- materials (20)
COL = {
    'stone': ('Warm fieldstone', (.43, .46, .40)),
    'stone_light': ('Stone lit faces', (.52, .54, .46)),
    'stone_dark': ('Stone shaded faces', (.37, .40, .35)),
    'sill': ('Dressed sandstone', (.57, .53, .42)),
    'oak': ('Aged oak', (.30, .20, .12)),
    'timber': ('Dark frame oak', (.22, .15, .09)),
    'plaster': ('Limewash plaster', (.80, .74, .60)),
    'plaster_shade': ('Limewash plaster shade', (.72, .66, .53)),
    'boards': ('Warm floorboards', (.43, .32, .20)),
    'roof': ('Muted clay', (.39, .22, .17)),
    'tile_light': ('Clay tile warm face', (.45, .27, .19)),
    'tile_dark': ('Clay tile cool face', (.33, .19, .15)),
    'flag_light': ('Flagstone pale', (.56, .56, .52)),
    'flag_dark': ('Flagstone dark', (.41, .41, .39)),
    'slate': ('Vault slab gray', (.35, .37, .38)),
    'iron': ('Black iron', (.11, .11, .12)),
    'brass': ('Worn brass', (.62, .48, .20)),
    'glass': ('Leaded glass', (.22, .28, .32)),
    'cloth': ('Banker green baize', (.17, .31, .23)),
    'goods': ('Sackcloth', (.56, .46, .30)),
}
MAT = {}
for k, (n, c) in COL.items():
    m = bpy.data.materials.new('Bank ' + n)
    m.diffuse_color = (*c, 1)
    MAT[k] = m

# ---------------------------------------------------------------- geometry store (game coords)
G = {}
HEX = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (3, 7, 6, 2), (0, 4, 7, 3), (1, 2, 6, 5)]


def add(name, verts, faces, mats):
    g = G.setdefault(name, ([], [], []))
    k = len(g[0])
    g[0].extend(verts)
    if isinstance(mats, str):
        mats = [mats] * len(faces)
    for f, m in zip(faces, mats):
        g[1].append(tuple(k + i for i in f))
        g[2].append(m)


def hexa(name, c, mat):
    add(name, c, HEX, mat)


def box(name, x0, x1, y0, y1, z0, z1, mat):
    hexa(name, [(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1),
                (x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)], mat)


def beam(name, a, b, w, d, mat):
    a = Vector(a); b = Vector(b)
    ax = (b - a).normalized()
    side = ax.cross(Vector((0, 1, 0)))
    if side.length < .01:
        side = ax.cross(Vector((1, 0, 0)))
    side.normalize()
    up = ax.cross(side).normalized()
    v = [tuple(p + side * s * w / 2 + up * t * d / 2) for p in (a, b) for s, t in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    add(name, v, [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)], mat)


def slab(name, top, bot, mat):
    n = len(top)
    f = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))] + [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    add(name, list(top) + list(bot), f, mat)


def extrude(name, pts, y0, y1, mat):
    slab(name, [(x, y1, z) for x, z in pts], [(x, y0, z) for x, z in pts], mat)


def cyl(name, cx, cz, r, y0, y1, mat, n=8, rot=0.0):
    extrude(name, [(cx + r * math.cos(rot + i * math.tau / n), cz + r * math.sin(rot + i * math.tau / n)) for i in range(n)], y0, y1, mat)


class Seg:
    """A wall line from a to b in plan (x,z); u along it, v = height, w along the outward normal."""
    def __init__(s, a, b, inside):
        s.a, s.b = a, b
        dx, dz = b[0] - a[0], b[1] - a[1]
        s.L = math.hypot(dx, dz)
        s.t = (dx / s.L, dz / s.L)
        n = (-s.t[1], s.t[0])
        mx, mz = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        if (inside[0] - mx) * n[0] + (inside[1] - mz) * n[1] > 0:
            n = (-n[0], -n[1])
        s.n = n

    def P(s, u, v, w):
        return (s.a[0] + s.t[0] * u + s.n[0] * w, v, s.a[1] + s.t[1] * u + s.n[1] * w)

    def box(s, name, u0, u1, v0, v1, w0, w1, mat):
        P = s.P
        hexa(name, [P(u0, v0, w0), P(u1, v0, w0), P(u1, v0, w1), P(u0, v0, w1),
                    P(u0, v1, w0), P(u1, v1, w0), P(u1, v1, w1), P(u0, v1, w1)], mat)


def pairs(xs):
    return list(zip(xs, xs[1:]))


def wall(name, s, v0, v1, holes, mat, th=.35, u0=0.0, u1=None, top=None, breaks=()):
    """Grid-partitioned wall body with real voids (house v2 pattern) on any plan direction; optional sloped top."""
    if u1 is None:
        u1 = s.L
    us = sorted(set([u0, u1] + [x for h in holes for x in h[:2] if u0 < x < u1] + [b for b in breaks if u0 < b < u1]))
    vtop = v1 if top is None else max(top(u) for u in us)
    vs = sorted(set([v0, vtop] + [y for h in holes for y in h[2:] if v0 < y < vtop]))
    for a, b in pairs(us):
        for c, d in pairs(vs):
            um, vm = (a + b) / 2, (c + d) / 2
            if any(h[0] < um < h[1] and h[2] < vm < h[3] for h in holes):
                continue
            ta, tb = (d, d) if top is None else (min(d, top(a)), min(d, top(b)))
            if ta <= c + .005 and tb <= c + .005:
                continue
            ta, tb = max(ta, c), max(tb, c)
            P = s.P; h2 = th / 2
            hexa(name, [P(a, c, -h2), P(b, c, -h2), P(b, c, h2), P(a, c, h2),
                        P(a, ta, -h2), P(b, tb, -h2), P(b, tb, h2), P(a, ta, h2)], mat)


def stone_face(name, s, v0, v1, holes, side=1, th=.35, u0=0.0, u1=None, top=None, course=.36, lr=(.58, 1.05),
               relief=.03, mats=('stone', 'stone_light', 'stone_dark')):
    """House v2 hand-cut relief skin, generalised to any wall line and a sloped top."""
    if u1 is None:
        u1 = s.L
    rng = random.Random(name + '%.2f%.2f%.2f' % (s.a[0], s.a[1], v0))
    vtop = v1 if top is None else max(top(u0), top(u1), top((u0 + u1) / 2))
    wb = th / 2 + .003
    verts, faces, fm = [], [], []
    rows = math.ceil((vtop - v0) / course - 1e-6)
    for row in range(rows):
        low = v0 + row * course
        high = min(vtop, low + course)
        u = u0
        while u < u1 - .01:
            right = min(u1, u + rng.uniform(*lr))
            segs = [(u, right, low, high)]
            for a, b, c, d in holes:
                nxt = []
                for l, r, lo, hi in segs:
                    if r <= a or l >= b or hi <= c or lo >= d:
                        nxt.append((l, r, lo, hi)); continue
                    if l < a: nxt.append((l, a, lo, hi))
                    if r > b: nxt.append((b, r, lo, hi))
                    if lo < c: nxt.append((max(l, a), min(r, b), lo, c))
                    if hi > d: nxt.append((max(l, a), min(r, b), d, hi))
                segs = nxt
            for l, r, lo, hi in segs:
                if top is not None:
                    hi = min(hi, top(l), top(r))
                l += .012; r -= .012; lo += .012; hi -= .012
                if r - l < .04 or hi - lo < .04:
                    continue
                bev = min(.045, (r - l) / 5, (hi - lo) / 5)
                k = len(verts)
                # six-point outline: top corners chamfered (the lit edges the overhead camera sees); the hidden
                # underside face is left open to keep the budget
                outline = [(l, lo), (r, lo), (r, hi - bev), (r - bev, hi), (l + bev, hi), (l, hi - bev)]
                wf = th / 2 + relief + rng.uniform(0, relief * .6)
                verts.extend(s.P(a, b, side * wb) for a, b in outline)
                verts.extend(s.P(a + (1 if a < (l + r) / 2 else -1) * .015, b + (1 if b < (lo + hi) / 2 else -1) * .015, side * wf) for a, b in outline)
                faces.append(tuple(k + 6 + i for i in range(6))); fm.append(rng.choice([mats[0]] * 3 + [mats[1], mats[2]]))
                for i in range(1, 6):
                    faces.append((k + i, k + (i + 1) % 6, k + 6 + (i + 1) % 6, k + 6 + i)); fm.append(mats[1] if i in (2, 3, 4) else mats[2])
            u = right
    add(name, verts, faces, fm)


def window(s, a, b, c, d, th=.35, side=1, shut=False, stone=True, upper=False, mull=True):
    pre = 'Bank_UpperShellWindows' if upper else 'Bank_ShellWindows'
    gl = 'Bank_UpperGlazing' if upper else 'Bank_Glazing'
    fw = th / 2 + .015
    for x in (a, b - .09):
        s.box(pre, x, x + .09, c, d, -fw, fw, 'oak')
    s.box(pre, a, b, d - .09, d, -fw, fw, 'oak')
    s.box(pre, a, b, c, c + .06, -fw, fw, 'oak')
    if mull:
        s.box(pre, (a + b) / 2 - .035, (a + b) / 2 + .035, c, d, -.06, .06, 'oak')
    tr = c + (d - c) * .64
    s.box(pre, a, b, tr - .03, tr + .03, -.06, .06, 'oak')
    s.box(gl, a + .09, b - .09, c + .06, d - .09, -.02, .02, 'glass')
    if stone:
        s.box(pre, a - .1, b + .1, c - .12, c, 0, side * (th / 2 + .14), 'sill')
        s.box(pre, a - .14, b + .14, d, d + .17, 0, side * (th / 2 + .07), 'sill')
    else:
        s.box(pre, a - .1, b + .1, c - .1, c, 0, side * (th / 2 + .16), 'oak')
    if shut:
        wd = (b - a) / 2
        w0, w1 = side * (th / 2 + .075), side * (th / 2 + .105)
        for lo, hi in ((a - .06 - wd, a - .06), (b + .06, b + .06 + wd)):
            pw = (hi - lo) / 3
            for i in range(3):
                s.box(pre, lo + i * pw + .01, lo + (i + 1) * pw - .01, c + .02, d - .02, w0, w1, 'oak')
            for y in (c + .2, d - .25):
                s.box(pre, lo + .03, hi - .03, y, y + .1, w1, w1 + side * .03, 'timber')


def frame_band(pl, tm, s, v0, v1, wins, th=.35, side=1, u0=0.0, u1=None, top=None, breaks=(), stud=1.0,
               rails=True, braces=True, nostud=(), pmat='plaster', collar=None):
    """Plaster panel wall with orderly dark-oak framing proud of the face (house v2 pattern)."""
    if u1 is None:
        u1 = s.L
    wall(pl, s, v0, v1, wins, pmat, th, u0, u1, top, breaks)
    f0, f1 = side * th / 2, side * (th / 2 + .06)

    def mem(ua, ub, va, vb):
        s.box(tm, ua, ub, va, vb, f0, f1, 'timber')
    mem(u0, u1, v0, v0 + .18)
    mem(u0, u1, v1 - .16, v1)
    if rails and wins:
        c, d = wins[0][2], wins[0][3]
        mem(u0, u1, c - .12, c)
        mem(u0, u1, d, d + .12)
    blocked = [(a, b) for a, b, c, d in wins] + list(nostud)
    studs = [u0 + .07, u1 - .07]
    u = u0
    while u < u1 - .8:
        u += stud
        if u < u1 - .4 and not any(a - .15 < u < b + .15 for a, b in blocked):
            studs.append(u)
    for a, b, c, d in wins:
        studs += [a - .07, b + .07]
    for x in studs:
        mem(x - .07, x + .07, v0 + .18, v1 - .16)
        if top is not None and top(x) - .12 > v1 + .3 and not any(a - .1 < x < b + .1 for a, b in nostud):
            mem(x - .07, x + .07, v1, top(x) - .12)
    if top is not None and collar is not None:
        ca, cb = collar[0], collar[1]
        mem(ca, cb, collar[2], collar[2] + .14)
    if braces:
        f = side * (th / 2 + .03)
        top_rail = (wins[0][2] - .12) if (rails and wins) else (v1 - .16)
        for end, dirn in ((u0 + .12, 1), (u1 - .12, -1)):
            reach = min(.9, (u1 - u0) / 3)
            if any(min(end, end + dirn * reach) - .1 < b and max(end, end + dirn * reach) + .1 > a for a, b in blocked):
                continue
            p = (end, v0 + .18); m = (end + dirn * reach * .55, v0 + .18 + (top_rail - v0 - .18) * .45); q = (end + dirn * reach, top_rail)
            for A, B in ((p, m), (m, q)):
                beam(tm, s.P(A[0], A[1], f), s.P(B[0], B[1], f), .12, .08, 'timber')


# ---------------------------------------------------------------- roof machinery (straight-skeleton faces for convex eaves)
def poly_edges(poly):
    n = len(poly)
    area = sum(poly[i][0] * poly[(i + 1) % n][1] - poly[(i + 1) % n][0] * poly[i][1] for i in range(n))
    E = []
    for i in range(n):
        a, b = poly[i], poly[(i + 1) % n]
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        t = ((b[0] - a[0]) / L, (b[1] - a[1]) / L)
        m = (-t[1], t[0]) if area > 0 else (t[1], -t[0])
        E.append({'a': a, 'b': b, 't': t, 'm': m, 'L': L})
    return E


def dist(e, p):
    return (p[0] - e['a'][0]) * e['m'][0] + (p[1] - e['a'][1]) * e['m'][1]


def clip(poly, f):
    out = []
    n = len(poly)
    for i in range(n):
        P, Q = poly[i], poly[(i + 1) % n]
        fp, fq = f(P), f(Q)
        if fp <= 0:
            out.append(P)
        if (fp < 0 < fq) or (fq < 0 < fp):
            t = fp / (fp - fq)
            out.append((P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t))
    return out


def clip_convex(poly, conv):
    for e in poly_edges(conv):
        poly = clip(poly, lambda p, e=e: -dist(e, p))
        if len(poly) < 3:
            return []
    return poly


def offset_poly(poly, offs):
    E = poly_edges(poly)
    lines = [((e['a'][0] - e['m'][0] * o, e['a'][1] - e['m'][1] * o), e['t']) for e, o in zip(E, offs)]
    out = []
    for i in range(len(poly)):
        (p1, d1), (p2, d2) = lines[i - 1], lines[i]
        den = d1[0] * d2[1] - d1[1] * d2[0]
        s_ = ((p2[0] - p1[0]) * d2[1] - (p2[1] - p1[1]) * d2[0]) / den
        out.append((p1[0] + s_ * d1[0], p1[1] + s_ * d1[1]))
    return out


def inside(poly, p):
    return all(dist(e, p) > 0 for e in poly_edges(poly))


def roof(tag, poly, active, eave, pitch, tmats=('roof', 'tile_light', 'tile_dark'), deck='roof', course=.55,
         tlen=(.62, .8), skip=None, abut=(), thick=.14, seed=1, caps=True, lift=(.03, .075), tiles_name='Bank_RoofTiles'):
    E = poly_edges(poly)
    rng = random.Random(seed)
    faces = []
    for i in active:
        reg = list(poly)
        for j in active:
            if j == i:
                continue
            reg = clip(reg, lambda p, ei=E[i], ej=E[j]: dist(ei, p) - dist(ej, p))
            if len(reg) < 3:
                break
        if len(reg) >= 3:
            faces.append((i, reg))
    rolls = {}
    tv, tf, tm = [], [], []
    for i, reg in faces:
        e = E[i]; t, m = e['t'], e['m']
        N = Vector((-t[1] * pitch, t[1] * m[0] - t[0] * m[1], t[0] * pitch))
        if N.y < 0:
            N = -N
        N.normalize()
        H = lambda p: eave + pitch * dist(e, p)
        top = [Vector((p[0], H(p), p[1])) for p in reg]
        slab('Bank_RoofSlab', [tuple(v) for v in top], [tuple(v - N * thick) for v in top], deck)
        # tiles laid in courses
        sd = [((p[0] - e['a'][0]) * t[0] + (p[1] - e['a'][1]) * t[1], dist(e, p)) for p in reg]
        dmax = max(d for _, d in sd)
        step = course / math.sqrt(1 + pitch * pitch)

        def srange(dq):
            ss = []
            for k in range(len(sd)):
                (s0, d0), (s1, d1) = sd[k], sd[(k + 1) % len(sd)]
                if (d0 - dq) * (d1 - dq) <= 0 and abs(d1 - d0) > 1e-9:
                    ss.append(s0 + (s1 - s0) * (dq - d0) / (d1 - d0))
                elif abs(d0 - dq) < 1e-9:
                    ss.append(s0)
            return (min(ss), max(ss)) if ss else None

        def pt(sv, dv, lf):
            return Vector((e['a'][0] + t[0] * sv + m[0] * dv, eave + pitch * dv, e['a'][1] + t[1] * sv + m[1] * dv)) + N * lf
        rows = max(1, math.ceil(dmax / step - 1e-6))
        for r in range(rows):
            d0 = r * step; d1 = min(dmax - 1e-4, (r + 1.12) * step)
            r0 = srange(d0 + 1e-4); r1 = srange(d1)
            if not r0 or not r1:
                continue
            sv = min(r0[0], r1[0]) + (rng.uniform(.15, .3) if r % 2 else 0)
            while sv < max(r0[1], r1[1]) - .05:
                ev = sv + rng.uniform(*tlen)
                a0, b0 = max(sv, r0[0]) + .012, min(ev, r0[1]) - .012
                a1, b1 = max(sv, r1[0]) + .012, min(ev, r1[1]) - .012
                if b0 - a0 > .06 and b1 - a1 > .03:
                    mid = pt((a0 + b0) / 2, (d0 + d1) / 2, 0)
                    if not (skip and skip((mid.x, mid.z))):
                        k = len(tv)
                        for lf in lift:
                            for (ss_, dd, ex) in ((a0, d0, 0), (b0, d0, 0), (b1, d1, .018), (a1, d1, .018)):
                                tv.append(tuple(pt(ss_, dd, lf + ex)))
                        tf.extend([(k, k + 3, k + 2, k + 1), (k + 4, k + 5, k + 6, k + 7), (k, k + 1, k + 5, k + 4),
                                   (k + 1, k + 2, k + 6, k + 5), (k + 2, k + 3, k + 7, k + 6), (k + 3, k, k + 4, k + 7)])
                        tm.extend([rng.choice([tmats[0]] * 3 + [tmats[1], tmats[2]])] * 6)
                sv = ev
        # edges: eave fascia, verge barge boards, hip/ridge rolls
        n = len(reg)
        for k in range(n):
            P, Q = reg[k], reg[(k + 1) % n]
            mid = ((P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2)
            A = Vector((P[0], H(P), P[1])); B = Vector((Q[0], H(Q), Q[1]))
            if abs(dist(e, mid)) < 1e-4:
                beam('Bank_RoofTrim', A - Vector((0, .07, 0)), B - Vector((0, .07, 0)), .16, .2, 'oak')
                continue
            on = [kk for kk in range(len(E)) if kk not in active and abs(dist(E[kk], mid)) < 1e-4]
            if on:
                if on[0] in abut:
                    continue
                o = Vector((-E[on[0]]['m'][0], 0, -E[on[0]]['m'][1])) * .06
                beam('Bank_RoofTrim', A + o + Vector((0, .02, 0)), B + o + Vector((0, .02, 0)), .12, .24, 'oak')
                continue
            key = tuple(sorted([(round(P[0], 3), round(P[1], 3)), (round(Q[0], 3), round(Q[1], 3))]))
            rolls[key] = (A, B)
    add(tiles_name, tv, tf, tm)
    if caps:
        for A, B in rolls.values():
            lo_, hi_ = (A, B) if A.y <= B.y else (B, A)
            beam('Bank_RoofTrim', lo_ + Vector((0, .1, 0)), hi_ + Vector((0, .1, 0)), .22, .16, deck)
            if abs(A.y - B.y) < 1e-3:
                L = (B - A).length; dvec = (B - A).normalized(); x = .05
                while x < L - .3:
                    beam('Bank_RoofTrim', A + dvec * x + Vector((0, .15, 0)), A + dvec * (x + .32) + Vector((0, .15, 0)), .34, .13, 'tile_dark')
                    x += .4
    return faces, rolls


def finial(x, y, z):
    add('Bank_RoofTrim', [(x - .09, y, z - .09), (x + .09, y, z - .09), (x + .09, y, z + .09), (x - .09, y, z + .09), (x, y + .6, z)],
        [(0, 1, 2, 3), (0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4)], 'oak')


def quoins(cx, cz, sx, sz, v0, v1, th=.35):
    X, Z = cx + sx * th / 2, cz + sz * th / 2
    k = 0; y = v0
    while y < v1 - .2:
        lx, lz = ((.78, .36) if k % 2 == 0 else (.36, .78))
        hi = min(v1, y + .38)
        xa, xb = sorted([X - sx * lx, X + sx * .25]); za, zb = sorted([Z - sz * lz, Z + sz * .25])
        box('Bank_ShellQuoins', xa, xb, y + .015, hi - .015, za, zb, 'sill')
        y += .4; k += 1


# ================================================================ plan
TH = .35; THV = .5
H_WING = 3.0          # wing ground storey (upper floor top)
UP_TOP = 5.85         # upper storey wall plate
HALL_TOP = 3.35       # hall wall plate
STONE_TOP = 2.4       # hall masonry top = door head
PAD = -0.30           # measured terrain pad (6.00) relative to the floor (placement y 6.30)
HALL = [(-1.5, -4), (3.5, -4), (5.5, -2), (5.5, 2), (3.5, 4), (-1.5, 4)]
VAULT = [(1.5, -5), (5.5, -5), (5.5, -2), (1.5, -2)]
OUTLINE = [(-5.5, -4), (1.5, -4), (1.5, -5), (5.5, -5), (5.5, 2), (3.5, 4), (-5.5, 4)]
LEAN_TOP, LEAN_P = 3.1, .28


def lean(z):
    return LEAN_TOP - LEAN_P * (-2 - z)


# ---------------------------------------------------------------- plinth, floors, step
extrude('Bank_FloorPlinth', offset_poly(OUTLINE, [.25] * len(OUTLINE)), PAD - .3, -.03, 'stone_dark')
for ix in range(-2, 6):
    for iz in range(-5, 4):
        sq = [(ix, iz), (ix + 1, iz), (ix + 1, iz + 1), (ix, iz + 1)]
        mat = 'flag_light' if (ix + iz) % 2 == 0 else 'flag_dark'
        a = clip(clip_convex(sq, HALL), lambda p: -2 - p[1]) if clip_convex(sq, HALL) else []
        b = clip(clip(clip_convex(sq, HALL), lambda p: p[1] + 2), lambda p: p[0] - 1.5) if clip_convex(sq, HALL) else []
        v = clip_convex(sq, VAULT)
        for piece, nm, mm in ((a, 'Bank_FloorHall', mat), (b, 'Bank_FloorHall', mat), (v, 'Bank_FloorVault', 'slate' if (ix + iz) % 2 else 'flag_dark')):
            if len(piece) >= 3:
                extrude(nm, piece, -.03, 0, mm)
box('Bank_FloorWing', -5.5, -1.5, -.03, 0, -4, 4, 'boards')
box('Bank_FloorThreshold', -.6, 1.6, -.03, 0, 3.8, 4.25, 'sill')
box('Bank_Step', -.8, 1.8, PAD - .2, -.15, 4.25, 4.8, 'sill')
# hall rug inlaid flush in front of the counter (walkable, part of the floor)
box('Bank_FloorRug', -.2, 1.2, 0, .012, .9, 3.3, 'cloth')
for x0, x1, z0, z1 in ((-.35, 1.35, .75, .9), (-.35, 1.35, 3.3, 3.45), (-.35, -.2, .9, 3.3), (1.2, 1.35, .9, 3.3)):
    box('Bank_FloorRug', x0, x1, 0, .012, z0, z1, 'brass')

# ---------------------------------------------------------------- wing ground storey (stone)
C_W = (-3.5, 0)
sWS = Seg((-5.5, 4), (-1.5, 4), C_W)
sWW = Seg((-5.5, 4), (-5.5, -4), C_W)
sWN = Seg((-5.5, -4), (-1.5, -4), C_W)
winWS = [(1.3, 2.5, 1.0, 2.1)]
winWW = [(2.5, 3.5, 1.0, 2.1), (6.0, 7.0, 1.0, 2.1)]
winWN = [(.6, 1.4, 1.1, 2.1)]
wall('Bank_ShellStone', sWS, -.03, H_WING, winWS, 'stone', u0=-.175, u1=4.0)
wall('Bank_ShellStone', sWW, -.03, H_WING, winWW, 'stone', u0=0, u1=8.0)
wall('Bank_ShellStone', sWN, -.03, H_WING, winWN, 'stone', u0=-.175, u1=3.825)
stone_face('Bank_ShellFacing', sWS, -.03, H_WING, winWS, u0=-.4, u1=4.0)
stone_face('Bank_ShellFacing', sWW, -.03, H_WING, winWW, u0=-.4, u1=8.4)
stone_face('Bank_ShellFacing', sWN, -.03, H_WING, winWN + [(2.35, 3.65, -.1, 3.1)], u0=-.4, u1=3.83)
for s_, ws in ((sWS, winWS), (sWW, winWW), (sWN, winWN)):
    for a, b, c, d in ws:
        window(s_, a, b, c, d, shut=(s_ is not sWN))
quoins(-5.5, 4, -1, 1, -.03, H_WING)
quoins(-5.5, -4, -1, -1, -.03, H_WING)
# partition wing | hall (interior plaster) with the 2.0 archway on the z=0.5 tile line
sPW = Seg((-1.5, -4), (-1.5, 4), (0, 0))
wall('Bank_ShellPartition', sPW, -.03, H_WING, [(3.4, 5.6, -.03, 2.4)], 'plaster_shade', u0=.175, u1=7.825)
for u in (3.4, 5.5):
    sPW.box('Bank_ShellDoor', u, u + .1, 0, 2.4, -.2, .2, 'oak')
sPW.box('Bank_ShellDoor', 3.3, 5.7, 2.4, 2.58, -.2, .2, 'oak')

# ---------------------------------------------------------------- counting hall (stone to the door head + framed plaster frieze)
C_H = (2, 0)
sHS = Seg((-1.5, 4), (3.5, 4), C_H)
sHSE = Seg((3.5, 4), (5.5, 2), C_H)
sHE = Seg((5.5, 2), (5.5, -2), C_H)
sHN = Seg((-1.5, -4), (1.5, -4), C_H)
door = (.9, 3.1, -.03, STONE_TOP)
winHS = [(3.6, 4.5, 1.0, 2.05)]
winHSE = [(sHSE.L / 2 - .5, sHSE.L / 2 + .5, 1.0, 2.05)]
winHN = [(1.0, 2.0, 1.1, 2.05)]
wall('Bank_ShellStone', sHS, -.03, STONE_TOP, [door] + winHS, 'stone', u0=0, u1=5.07)
wall('Bank_ShellStone', sHSE, -.03, STONE_TOP, winHSE, 'stone', u0=-.07, u1=sHSE.L + .07)
wall('Bank_ShellStone', sHE, -.03, STONE_TOP, [], 'stone', u0=-.07, u1=4.0)
wall('Bank_ShellStone', sHN, -.03, STONE_TOP, winHN, 'stone', u0=.175, u1=2.75)
stone_face('Bank_ShellFacing', sHS, -.03, STONE_TOP, [door] + winHS, u0=0, u1=5.1)
stone_face('Bank_ShellFacing', sHSE, -.03, STONE_TOP, winHSE, u0=-.1, u1=sHSE.L + .1)
stone_face('Bank_ShellFacing', sHE, -.03, STONE_TOP, [], u0=-.1, u1=4.0)
stone_face('Bank_ShellFacing', sHN, -.03, STONE_TOP, winHN, u0=.175, u1=2.75)
window(sHS, *winHS[0], shut=True)
window(sHSE, *winHSE[0])
window(sHN, *winHN[0])
# frieze: plaster panels in dark oak above the masonry, all round the hall (also above the vault roof)
wfE = [(1.5, 2.5, 2.62, 3.1)]
frame_band('Bank_ShellFrieze', 'Bank_ShellFriezeTimber', sHS, STONE_TOP, HALL_TOP, [], u0=-.1, u1=5.07, rails=False, stud=.95)
frame_band('Bank_ShellFrieze', 'Bank_ShellFriezeTimber', sHSE, STONE_TOP, HALL_TOP, [], u0=-.07, u1=sHSE.L + .07, rails=False, stud=.95)
frame_band('Bank_ShellFrieze', 'Bank_ShellFriezeTimber', sHE, STONE_TOP, HALL_TOP, wfE, u0=-.07, u1=4.07, rails=False, stud=.95, braces=False)
window(sHE, *wfE[0], stone=False, mull=False)
frame_band('Bank_ShellFrieze', 'Bank_ShellFriezeTimber', sHN, STONE_TOP, HALL_TOP, [], u0=.1, u1=3.07, rails=False, stud=.95)
sHN2 = Seg((1.5, -4), (3.5, -4), C_H)
sHNE = Seg((3.5, -4), (5.5, -2), C_H)
frame_band('Bank_ShellFrieze', 'Bank_ShellFriezeTimber', sHN2, 2.1, HALL_TOP, [], u0=0, u1=2.07, rails=False, stud=.95, braces=False)
frame_band('Bank_ShellFrieze', 'Bank_ShellFriezeTimber', sHNE, 2.1, HALL_TOP, [], u0=-.07, u1=sHNE.L + .1, rails=False, stud=.95, braces=False)
# main door: oak frame, two ledged leaves standing open inward, iron straps, stone threshold, hood on brackets
for u in (.9, 3.0):
    sHS.box('Bank_ShellDoor', u, u + .1, 0, STONE_TOP, -.2, .2, 'oak')
for hx, dirn in ((-.5, 1), (1.5, -1)):
    x0, x1 = sorted([hx, hx + dirn * .07])
    for i in range(4):
        box('Bank_ShellDoor', x0, x1, .05, 2.3, 3.8 - (i + 1) * .245 + .01, 3.8 - i * .245 - .005, 'oak')
    for y in (.45, 1.9):
        xa, xb = sorted([hx + dirn * .07, hx + dirn * .1])
        box('Bank_ShellDoor', xa, xb, y, y + .08, 2.84, 3.78, 'iron')
    xa, xb = sorted([hx + dirn * .07, hx + dirn * .11])
    box('Bank_ShellDoor', xa, xb, 1.1, 1.22, 2.9, 2.98, 'brass')
for x in (-.8, 1.8):
    beam('Bank_ShellExterior', (x, 1.95, 4.2), (x, 2.75, 4.95), .1, .12, 'oak')
top_h = [(-.95, 3.25, 4.2), (1.95, 3.25, 4.2), (1.95, 2.72, 5.05), (-.95, 2.72, 5.05)]
slab('Bank_RoofHood', top_h, [(x, y - .1, z) for x, y, z in top_h], 'roof')
zz = 4.25
while zz < 5.0:
    y = 3.25 - (zz - 4.2) * .53 / .85
    box('Bank_RoofHood', -.95, 1.95, y + .005, y + .045, zz, zz + .18, 'tile_dark' if int(zz * 10) % 2 else 'tile_light')
    zz += .2
beam('Bank_RoofHood', (-1.0, 2.66, 5.08), (2.0, 2.66, 5.08), .1, .14, 'oak')
# lanterns either side of the door
for x in (-1.05, 2.05):
    box('Bank_ShellExterior', x - .03, x + .03, 2.05, 2.1, 4.2, 4.5, 'iron')
    box('Bank_ShellExterior', x - .1, x + .1, 1.72, 2.0, 4.4, 4.6, 'glass')
    box('Bank_ShellExterior', x - .12, x + .12, 2.0, 2.06, 4.38, 4.62, 'iron')
    box('Bank_ShellExterior', x - .12, x + .12, 1.68, 1.72, 4.38, 4.62, 'brass')
# hanging coin sign on the clipped corner
cn = sHSE.n
mx, mz = 4.5, 3.0
sg = Seg((mx + cn[0] * .18, mz + cn[1] * .18), (mx + cn[0] * 1.15, mz + cn[1] * 1.15), (mx, mz + 5))
sg.box('Bank_ShellExterior', 0, .98, 2.95, 3.07, -.04, .04, 'iron')
beam('Bank_ShellExterior', sg.P(0, 2.55, 0), sg.P(.55, 2.97, 0), .05, .05, 'iron')
sg.box('Bank_ShellExterior', .22, .92, 2.15, 2.8, -.035, .035, 'oak')
disc = [(.57 + .22 * math.cos(i * math.tau / 8 + .39), 2.475 + .22 * math.sin(i * math.tau / 8 + .39)) for i in range(8)]
add('Bank_ShellExterior', [sg.P(u, v, w) for w in (-.06, .06) for u, v in disc],
    [tuple(range(8)), tuple(range(15, 7, -1))] + [(i, (i + 1) % 8, 8 + (i + 1) % 8, 8 + i) for i in range(8)], 'brass')
for u in (.3, .84):
    sg.box('Bank_ShellExterior', u - .01, u + .01, 2.8, 2.95, -.01, .01, 'iron')

# ---------------------------------------------------------------- vault (heavy masonry, lean-to of stone slabs)
C_V = (3.5, -3.5)
sVS = Seg((1.5, -2), (5.5, -2), C_V)            # hall | vault partition, facing dressed on the hall side
sVW1 = Seg((1.5, -2), (1.5, -4), C_V)
sVW2 = Seg((1.5, -4), (1.5, -5), C_V)
sVN = Seg((1.5, -5), (5.5, -5), C_V)
sVE = Seg((5.5, -5), (5.5, -2), C_V)
gate = (1.2, 2.8, -.03, 2.2)
wall('Bank_ShellStone', sVS, -.03, HALL_TOP, [gate], 'stone', th=.4, u0=.25, u1=3.93)
stone_face('Bank_ShellFacing', sVS, -.03, 2.35, [gate], side=-1, th=.4, u0=.25, u1=3.85, course=.42, lr=(.7, 1.2))
sVS.box('Bank_ShellWindows', 1.05, 2.95, 2.2, 2.42, -.26, .26, 'sill')
wall('Bank_ShellStone', sVW1, -.03, HALL_TOP, [], 'stone', th=THV, u0=0, u1=2.0)
wall('Bank_ShellStone', sVW2, -.03, 3, [], 'stone', th=THV, u0=0, u1=1.25, top=lambda u: lean(-4 - u - .25) - .01)
slitN = [(1.05, 1.3, 1.15, 1.95), (2.7, 2.95, 1.15, 1.95)]
slitE = [(1.4, 1.65, 1.15, 1.95)]
wall('Bank_ShellStone', sVN, -.03, lean(-5.25) - .01, slitN, 'stone', th=THV, u0=-.25, u1=4.25)
wall('Bank_ShellStone', sVE, -.03, 3.2, slitE, 'stone', th=THV, u0=-.25, u1=3.0, top=lambda u: lean(-5 + u) - .01)
VF = dict(th=THV, course=.46, lr=(.8, 1.35), relief=.04)
stone_face('Bank_ShellFacing', sVW2, -.03, 3, [], u0=-.05, u1=1.3, top=lambda u: lean(-4 - u - .25) - .03, **VF)
stone_face('Bank_ShellFacing', sVN, -.03, lean(-5.25) - .03, slitN, u0=-.3, u1=4.3, **VF)
stone_face('Bank_ShellFacing', sVE, -.03, 3.2, slitE, u0=-.3, u1=3.0, top=lambda u: lean(-5 + u) - .03, **VF)
for s_, sl in ((sVN, slitN), (sVE, slitE)):
    for a, b, c, d in sl:
        s_.box('Bank_ShellWindows', a - .12, b + .12, c - .14, c, 0, THV / 2 + .12, 'sill')
        s_.box('Bank_ShellWindows', a - .16, b + .16, d, d + .18, 0, THV / 2 + .08, 'sill')
        for u in (a + .08, b - .08):
            s_.box('Bank_ShellWindows', u - .02, u + .02, c, d, -.03, .03, 'iron')
        s_.box('Bank_Glazing', a, b, c, d, -.12, -.1, 'iron')
quoins(5.5, -5, 1, -1, -.03, lean(-5.25), th=THV)
quoins(1.5, -5, -1, -1, -.03, lean(-5.25), th=THV)
# stepped buttresses on the north wall and the vault's east shoulder
for bx in (3.5,):
    box('Bank_ShellStone', bx - .3, bx + .3, -.03, 1.1, -5.95, -5.25, 'stone_dark')
    beam('Bank_ShellStone', (bx, 1.1, -5.6), (bx, 1.95, -5.25), .6, .5, 'stone')
    box('Bank_ShellQuoins', bx - .34, bx + .34, 1.05, 1.15, -6.0, -5.25, 'sill')
box('Bank_ShellStone', 5.75, 6.4, -.03, 1.1, -3.8, -3.2, 'stone_dark')
beam('Bank_ShellStone', (6.05, 1.1, -3.5), (5.75, 2.2, -3.5), .6, .45, 'stone')
box('Bank_ShellQuoins', 5.75, 6.45, 1.05, 1.15, -3.84, -3.16, 'sill')
# vault ceiling (hidden with the roofs in cutaway) and the stone-slab lean-to
box('Bank_RoofVaultCeiling', 1.75, 5.25, 2.0, 2.1, -4.75, -2.2, 'slate')
LEAN = [(1.5, -2.0), (1.5, -5.35), (5.8, -5.35), (5.8, -2.0)]
HALL_EAVE = offset_poly(HALL, [.4, .4, .4, .4, .4, .05])
roof('vault', LEAN, [1], lean(-5.35), LEAN_P, tmats=('slate', 'stone_light', 'stone_dark'), deck='slate', course=.62,
     tlen=(.75, 1.05), skip=lambda p: inside(HALL_EAVE, p), abut=(0, 3), thick=.16, seed=31, caps=False, lift=(.03, .1),
     tiles_name='Bank_RoofSlabStones')
beam('Bank_RoofTrim', (1.42, lean(-5.35) + .05, -5.35), (1.42, lean(-3.95) + .05, -3.95), .12, .22, 'oak')

# ---------------------------------------------------------------- upper floor, stair, jetty
R = H_WING / 13; SZ0 = 3.2; RUN = .4; SX0, SX1 = -5.3, -3.8
for i in range(12):
    z1 = SZ0 - i * RUN
    box('Bank_StairTreads', SX0, SX1, i * R, (i + 1) * R, z1 - RUN, z1, 'oak')
    box('Bank_StairTreads', SX0, SX1, (i + 1) * R - .03, (i + 1) * R, z1 - RUN - .02, z1 - RUN + .02, 'oak')  # nosing seam
for x0, x1 in ((SX1 - .1, SX1),):
    add('Bank_Stringers', [(x0, -.03, SZ0 - .02), (x0, H_WING - .2, SZ0 - 12 * RUN), (x0, H_WING + .06, SZ0 - 12 * RUN), (x0, .3, SZ0 - .02),
                           (x1, -.03, SZ0 - .02), (x1, H_WING - .2, SZ0 - 12 * RUN), (x1, H_WING + .06, SZ0 - 12 * RUN), (x1, .3, SZ0 - .02)],
        [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], 'timber')
for k in range(5):
    z = SZ0 - .12 - k * (12 * RUN - .12) / 4
    y = (SZ0 - z) / RUN * R + R
    box('Bank_Balustrade', -3.87, -3.81, y, y + .92, z - .03, z + .03, 'oak')
beam('Bank_Balustrade', (-3.84, R + .9, SZ0 - .12), (-3.84, H_WING + .92, SZ0 - 12 * RUN), .07, .08, 'oak')
# upper floor with the stair well (x -5.3..-3.8, z -1.6..3.2)
WZ0, WZ1 = SZ0 - 12 * RUN, SZ0
for x0, x1, z0, z1 in ((-5.5, -1.5, -4, WZ0), (-3.8, -1.5, WZ0, WZ1), (-5.5, -1.5, WZ1, 4.6), (-5.5, -5.3, WZ0, WZ1)):
    box('Bank_UpperFloor', x0, x1, H_WING - .2, H_WING, z0, z1, 'boards')
for z in [-3.7 + i * .8 for i in range(11)]:
    if not (WZ0 - .1 < z < WZ1 + .1):
        box('Bank_UpperJoists', -5.3, -1.7, H_WING - .38, H_WING - .2, z - .07, z + .07, 'timber')
# well balustrade upstairs
for z in [WZ0 + .05 + i * .8 for i in range(7)] + [WZ1 - .03]:
    box('Bank_UpperBalustrade', -3.86, -3.8, H_WING, H_WING + .95, z - .03, z + .03, 'oak')
for x in (-5.2, -4.5):
    box('Bank_UpperBalustrade', x - .03, x + .03, H_WING, H_WING + .95, WZ1 - .06, WZ1, 'oak')
box('Bank_UpperBalustrade', -3.87, -3.79, H_WING + .9, H_WING + .97, WZ0, WZ1, 'oak')
box('Bank_UpperBalustrade', -3.87, -3.79, H_WING + .45, H_WING + .5, WZ0, WZ1, 'oak')
box('Bank_UpperBalustrade', -5.32, -3.8, H_WING + .9, H_WING + .97, WZ1 - .07, WZ1 + .01, 'oak')
box('Bank_UpperBalustrade', -5.32, -3.8, H_WING + .45, H_WING + .5, WZ1 - .07, WZ1 + .01, 'oak')
# jetty carpentry over the lane: bressumer, joist ends, brackets on stone corbels
JZ = 4.6
box('Bank_ShellJetty', -5.7, -1.3, H_WING - .28, H_WING, JZ - .2, JZ + .2, 'timber')
x = -5.25
while x < -1.6:
    box('Bank_ShellJetty', x - .08, x + .08, H_WING - .38, H_WING - .24, 4.17, JZ + .22, 'timber'); x += .5
for bx in (-5.25, -3.5, -1.75):
    box('Bank_ShellJetty', bx - .14, bx + .14, 1.85, 2.05, 4.1, 4.42, 'sill')
    beam('Bank_ShellJetty', (bx, 2.0, 4.25), (bx, H_WING - .3, JZ), .12, .12, 'timber')

# ---------------------------------------------------------------- upper storey: timber framed plaster, gables N and S
def gtop(u):
    return UP_TOP + min(u, 4 - u) * 1.0 - .02


C_U = (-3.5, 0)
sUS = Seg((-5.5, JZ), (-1.5, JZ), C_U)
sUW = Seg((-5.5, JZ), (-5.5, -4), C_U)
sUN = Seg((-5.5, -4), (-1.5, -4), C_U)
sUE = Seg((-1.5, -4), (-1.5, JZ), C_U)
WY0, WY1 = H_WING + .9, H_WING + 2.0
winUS = [(.55, 1.55, WY0, WY1), (2.45, 3.45, WY0, WY1)]
winUW = [(2.6, 3.6, WY0, WY1), (6.6, 7.6, WY0, WY1)]
winUN = [(.6, 1.4, WY0, WY1)]
winUE = [(.45, 1.15, WY0 + .3, WY1), (7.6, 8.25, WY0 + .3, WY1)]
frame_band('Bank_UpperShell', 'Bank_UpperShellTimber', sUS, H_WING, UP_TOP, winUS, u0=-.175, u1=4.175, top=gtop, breaks=(2.0,),
           collar=(1.05, 2.95, UP_TOP + .95))
frame_band('Bank_UpperShell', 'Bank_UpperShellTimber', sUN, H_WING, UP_TOP, winUN, u0=-.175, u1=4.175, top=gtop, breaks=(2.0,),
           collar=(1.05, 2.95, UP_TOP + .95), nostud=((2.35, 3.65),))
frame_band('Bank_UpperShell', 'Bank_UpperShellTimber', sUW, H_WING, UP_TOP, winUW, u0=.175, u1=8.425)
frame_band('Bank_UpperShell', 'Bank_UpperShellTimber', sUE, H_WING, UP_TOP, winUE, u0=.175, u1=8.425, rails=False, braces=False)
for s_, ws in ((sUS, winUS), (sUW, winUW), (sUN, winUN), (sUE, winUE)):
    for a, b, c, d in ws:
        window(s_, a, b, c, d, stone=False, upper=True, shut=(s_ is sUS))
# small gable lights under the collar
for s_ in (sUS,):
    s_.box('Bank_UpperShellWindows', 1.62, 2.38, UP_TOP + .15, UP_TOP + .75, -.2, .2, 'oak')
    s_.box('Bank_UpperGlazing', 1.7, 1.93, UP_TOP + .22, UP_TOP + .68, -.21, .21, 'glass')
    s_.box('Bank_UpperGlazing', 2.07, 2.3, UP_TOP + .22, UP_TOP + .68, -.21, .21, 'glass')

# ---------------------------------------------------------------- roofs
WING_EAVE = [(-5.9, -4.35), (-1.1, -4.35), (-1.1, JZ + .35), (-5.9, JZ + .35)]
wing_faces, wing_rolls = roof('wing', WING_EAVE, [1, 3], UP_TOP - .4, 1.0, seed=7)
for zf in (-4.35, JZ + .35):
    finial(-3.5, UP_TOP + 2.0 + .25, zf + (.25 if zf < 0 else -.25))
hall_faces, hall_rolls = roof('hall', HALL_EAVE, [0, 1, 2, 3, 4], HALL_TOP - .4 * .52, .52, abut=(5,), seed=11)
for A, B in hall_rolls.values():
    if abs(A.y - B.y) < 1e-3:
        for P_ in (A, B):
            if P_.x > -1.4:
                finial(P_.x, P_.y + .2, P_.z)

# ---------------------------------------------------------------- chimney on the north gable (stone, pots)
box('Bank_ShellChimneyBase', -3.15, -1.85, PAD, 2.4, -4.95, -4.175, 'stone')
sCH = Seg((-3.15, -4.95), (-1.85, -4.95), (-2.5, -4.5))
stone_face('Bank_ShellChimneyBase', sCH, PAD, 2.4, [], th=.0, u0=0, u1=1.3, course=.4, lr=(.5, .8))
beam('Bank_ShellChimneyBase', (-2.5, 2.35, -4.95), (-2.5, 2.9, -4.75), 1.3, .12, 'sill')
box('Bank_ShellChimneyBase', -2.95, -2.05, 2.4, H_WING, -4.75, -4.175, 'stone')
box('Bank_UpperChimney', -2.95, -2.05, H_WING, 8.4, -4.75, -4.175, 'stone')
sCU = Seg((-2.95, -4.75), (-2.05, -4.75), (-2.5, -4.4))
stone_face('Bank_UpperChimney', sCU, 5.6, 8.4, [], th=.0, u0=0, u1=.9, course=.42, lr=(.4, .7))
for sside in (Seg((-2.95, -4.175), (-2.95, -4.75), (0, -4.4)), Seg((-2.05, -4.175), (-2.05, -4.75), (-5, -4.4))):
    stone_face('Bank_UpperChimney', sside, 6.6, 8.4, [], th=.0, u0=0, u1=.575, course=.42, lr=(.4, .6))
box('Bank_UpperChimney', -3.08, -1.92, 8.4, 8.56, -4.88, -4.05, 'sill')
for px in (-2.72, -2.28):
    cyl('Bank_UpperChimney', px, -4.46, .13, 8.56, 8.95, 'roof')
    cyl('Bank_UpperChimney', px, -4.46, .16, 8.9, 8.98, 'roof')

# ---------------------------------------------------------------- services
# teller counter with three brass-grilled booths (deposit / withdraw)
SC = 'Bank_ServiceCounter_Booths'
CX0, CX1, CZF, CZB = -1.325, 2.45, -.85, -1.4
box(SC, CX0, CX1, 0, .12, CZB + .03, CZF - .03, 'timber')
box(SC, CX0, CX1, .12, .95, CZB, CZF, 'oak')
box(SC, CX0 - .04, CX1 + .02, .95, 1.05, CZB - .04, CZF + .05, 'oak')
for x in [CX0 + .1 + i * (CX1 - CX0 - .2) / 6 for i in range(7)]:
    box(SC, x - .04, x + .04, .15, .92, CZF, CZF + .03, 'timber')
box(SC, CX0 + .05, CX1 - .05, .5, .56, CZF, CZF + .03, 'timber')
posts = [CX0 + .05, .0, 1.25, CX1 - .05]
for x in posts:
    box(SC, x - .05, x + .05, 1.05, 2.3, -1.17, -1.07, 'oak')
box(SC, CX0, CX1, 2.22, 2.46, -1.25, -.98, 'oak')
box(SC, CX0 - .03, CX1 + .03, 2.46, 2.52, -1.28, -.95, 'timber')
for a, b in pairs(posts):
    box(SC, a + .05, b - .05, 1.35, 1.39, -1.14, -1.1, 'brass')
    box(SC, a + .05, b - .05, 2.0, 2.04, -1.14, -1.1, 'brass')
    w = b - a
    for i in range(1, 10):
        x = a + i * w / 10
        if abs(x - (a + b) / 2) < w * .18:
            continue
        box(SC, x - .012, x + .012, 1.39, 2.0, -1.13, -1.11, 'brass')
    box(SC, (a + b) / 2 - .22, (a + b) / 2 + .22, 1.05, 1.08, -1.3, -.95, 'cloth')   # baize pad at each window
    box(SC, (a + b) / 2 - .09, (a + b) / 2 + .09, 1.08, 1.11, -1.0, -.9, 'brass')    # coin tray
for x in (0.0, 1.25):
    box(SC, x - .03, x + .03, 0, 1.55, -2.0, CZB, 'oak')                             # staff-side booth dividers
# vault: barred iron gate in the partition + iron-bound chests visible behind it
SV = 'Bank_ServiceVault_Gate'
gx0, gx1 = 1.5 + gate[0], 1.5 + gate[1]
for x in (gx0, gx1 - .08):
    box(SV, x, x + .08, 0, 2.2, -2.06, -1.94, 'iron')
box(SV, gx0, gx1, 2.12, 2.2, -2.06, -1.94, 'iron')
for y in (.12, 1.0, 1.85):
    box(SV, gx0, gx1, y, y + .07, -2.04, -1.96, 'iron')
x = gx0 + .2
while x < gx1 - .15:
    box(SV, x - .025, x + .025, .05, 2.12, -2.025, -1.975, 'iron'); x += .18
box(SV, 3.35, 3.65, .95, 1.25, -1.97, -1.92, 'brass')
for x in (gx0 - .02, gx1 - .06):
    for y in (.3, 1.8):
        box(SV, x, x + .08, y, y + .12, -2.1, -1.9, 'brass')
SVC = 'Bank_ServiceVault_Chests'
for cx, cz in ((2.4, -4.35), (3.55, -4.35), (4.7, -4.35), (4.8, -3.0)):
    rot = cz > -4
    xa, xb, za, zb = (cx - .45, cx + .45, cz - .28, cz + .28) if not rot else (cx - .28, cx + .28, cz - .45, cz + .45)
    box(SVC, xa, xb, 0, .5, za, zb, 'oak')
    if not rot:
        add(SVC, [(xa, .5, za), (xb, .5, za), (xb, .5, zb), (xa, .5, zb), (xa, .62, za + .1), (xb, .62, za + .1), (xb, .62, zb - .1), (xa, .62, zb - .1)], HEX, 'oak')
        for x in (xa + .12, (xa + xb) / 2, xb - .12):
            box(SVC, x - .04, x + .04, -.005, .64, za - .015, zb + .015, 'iron')
        box(SVC, cx - .07, cx + .07, .32, .48, zb, zb + .03, 'brass')
    else:
        add(SVC, [(xa, .5, za), (xb, .5, za), (xb, .5, zb), (xa, .5, zb), (xa + .1, .62, za), (xb - .1, .62, za), (xb - .1, .62, zb), (xa + .1, .62, zb)], HEX, 'oak')
        for z in (za + .12, (za + zb) / 2, zb - .12):
            box(SVC, xa - .015, xb + .015, -.005, .64, z - .04, z + .04, 'iron')
        box(SVC, xa - .03, xa, .32, .48, cz - .07, cz + .07, 'brass')
# goods shelves for the small shop on the east wall
SS = 'Bank_ServiceShelves_Goods'
rng = random.Random(57)
for z0, z1 in ((-1.75, -.08), (.08, 1.75)):
    for z in (z0, z1 - .06):
        box(SS, 4.85, 5.3, 0, 2.2, z, z + .06, 'oak')
    box(SS, 5.26, 5.32, 0, 2.2, z0, z1, 'timber')
    box(SS, 4.82, 5.32, 2.2, 2.28, z0 - .03, z1 + .03, 'oak')
    for y in (.1, .6, 1.1, 1.6):
        box(SS, 4.86, 5.28, y, y + .05, z0 + .06, z1 - .06, 'oak')
        z = z0 + .12
        while z < z1 - .22:
            kind = rng.choice(['pot', 'sack', 'bolt', 'crate', 'pot'])
            ys = y + .05
            if kind == 'pot':
                r = rng.uniform(.09, .13); cyl(SS, 5.06, z + r, r, ys, ys + rng.uniform(.22, .32), 'roof', n=6)
                z += 2 * r + .06
            elif kind == 'sack':
                box(SS, 4.92, 5.2, ys, ys + .3, z, z + .26, 'goods'); box(SS, 5.0, 5.12, ys + .3, ys + .36, z + .08, z + .18, 'goods'); z += .32
            elif kind == 'bolt':
                box(SS, 4.9, 5.22, ys, ys + .12, z, z + .3, 'cloth'); box(SS, 4.9, 5.22, ys + .12, ys + .22, z + .03, z + .27, 'plaster_shade'); z += .36
            else:
                box(SS, 4.9, 5.24, ys, ys + .26, z, z + .3, 'oak'); box(SS, 4.9, 5.24, ys + .1, ys + .14, z - .005, z + .305, 'timber'); z += .36
box(SS, 5.26, 5.3, 2.3, 2.62, -.8, .8, 'oak')          # painted board over the shop shelves
for i in range(3):
    cyl(SS, 5.25, -.45 + i * .45, .1, 2.38, 2.54, 'brass', n=6, rot=.5)

# ---------------------------------------------------------------- furnishings (ground)
F = 'Bank_Furnishing'
# counter flap return: closes the staff side at the counter's east end
box(F, 2.45, 2.58, 0, .98, -1.8, CZF, 'oak'); box(F, 2.42, 2.61, .98, 1.04, -1.83, CZF + .03, 'oak')
# brass queue posts and ropes
for x in (-.05, 1.05):
    for z in (-.7, .1):
        cyl(F, x, z, .05, 0, .95, 'brass', n=6); cyl(F, x, z, .08, 0, .05, 'brass', n=6); cyl(F, x, z, .07, .95, 1.02, 'brass', n=6)
    beam(F, (x, .86, -.68), (x, .78, -.3), .03, .03, 'cloth'); beam(F, (x, .78, -.3), (x, .86, .08), .03, .03, 'cloth')
# teller stools, ledger desk and strongbox behind the counter
for x in (-.65, .62, 1.85):
    cyl(F, x, -1.85, .17, .55, .62, 'oak', n=6)
    for a in range(3):
        ang = a * math.tau / 3
        beam(F, (x + .1 * math.cos(ang), .58, -1.85 + .1 * math.sin(ang)), (x + .18 * math.cos(ang), 0, -1.85 + .18 * math.sin(ang)), .04, .04, 'oak')
box(F, -1.2, -.1, .75, .82, -3.8, -3.2, 'oak'); box(F, -1.2, -.1, .82, .86, -3.8, -3.2, 'cloth')
for x in (-1.15, -.2):
    for z in (-3.75, -3.3):
        box(F, x - .03, x + .03, 0, .75, z - .03, z + .03, 'oak')
box(F, -.9, -.4, .86, .92, -3.6, -3.35, 'plaster')                                   # open ledger
box(F, .4, 1.2, 0, .55, -3.8, -3.3, 'iron'); box(F, .45, 1.15, .55, .6, -3.75, -3.35, 'brass')
# vault shelving: coin sacks and ingots on the west wall of the strongroom
for y in (.4, 1.0, 1.6):
    box(F, 1.78, 2.2, y, y + .05, -4.7, -2.4, 'oak')
    z = -4.6
    while z < -2.6:
        if int(z * 10) % 3 == 0:
            box(F, 1.85, 2.1, y + .05, y + .1, z, z + .3, 'brass')
        else:
            box(F, 1.85, 2.12, y + .05, y + .3, z, z + .22, 'goods'); box(F, 1.94, 2.04, y + .3, y + .35, z + .06, z + .16, 'goods')
        z += .38
for z in (-4.72, -2.42):
    box(F, 1.78, 1.84, 0, 1.7, z - .03, z + .03, 'oak')
# hall bench under the south window, barrels, hanging lanterns
box(F, 2.1, 3.3, .42, .48, 3.4, 3.78, 'oak')
for x in (2.2, 3.2):
    box(F, x - .04, x + .04, 0, .42, 3.42, 3.76, 'oak')
cyl(F, 4.15, 2.95, .3, 0, .8, 'oak', n=8); cyl(F, 4.15, 2.95, .315, .15, .22, 'iron', n=8); cyl(F, 4.15, 2.95, .315, .6, .67, 'iron', n=8)
for lx, lz in ((.5, 1.5), (3.0, -.2)):
    box(F, lx - .02, lx + .02, 2.4, 3.6, lz - .02, lz + .02, 'iron')
    box(F, lx - .12, lx + .12, 2.1, 2.4, lz - .12, lz + .12, 'glass'); box(F, lx - .15, lx + .15, 2.4, 2.45, lz - .15, lz + .15, 'iron')
    box(F, lx - .15, lx + .15, 2.05, 2.1, lz - .15, lz + .15, 'brass')
# wing ground: waiting bench, notice board, chest by the stair
box(F, -2.15, -1.72, .42, .48, 1.95, 3.55, 'oak')
for z in (2.05, 3.45):
    box(F, -2.1, -1.76, 0, .42, z - .04, z + .04, 'oak')
box(F, -1.73, -1.68, 1.2, 2.1, -2.6, -1.4, 'oak'); box(F, -1.745, -1.72, 1.28, 2.02, -2.52, -1.48, 'goods')
for z, y in ((-2.2, 1.55), (-1.8, 1.72), (-2.05, 1.85)):
    box(F, -1.76, -1.74, y, y + .2, z - .1, z + .1, 'plaster')
box(F, -3.3, -2.2, 0, .55, -3.82, -3.35, 'oak'); box(F, -3.3, -2.2, .55, .62, -3.82, -3.35, 'timber')

# ---------------------------------------------------------------- furnishings (upper clerk's room)
U = 'Bank_UpperFurnishing'
Y = H_WING
box(U, -2.9, -2.1, Y + .72, Y + .8, 0, 1.0, 'oak'); box(U, -2.85, -2.15, Y + .8, Y + .83, .1, .9, 'cloth')
for x in (-2.85, -2.15):
    for z in (.05, .95):
        box(U, x - .03, x + .03, Y, Y + .72, z - .03, z + .03, 'oak')
box(U, -2.75, -2.35, Y + .83, Y + .88, .3, .7, 'plaster'); cyl(U, -2.3, .15, .04, Y + .83, Y + .95, 'iron', n=6)
box(U, -2.0, -1.72, Y + .45, Y + .5, .3, .7, 'oak'); box(U, -1.76, -1.72, Y + .5, Y + 1.1, .3, .7, 'oak')
for z in (.33, .67):
    box(U, -1.99, -1.95, Y, Y + .45, z - .02, z + .02, 'oak')
box(U, -2.0, -1.675, Y, Y + 2.0, -1.45, -.2, 'oak')                                   # ledger bookcase
for y in (.5, 1.0, 1.5):
    for i in range(9):
        z = -1.4 + i * .13
        box(U, -1.97, -1.73, Y + y - .45 + .05, Y + y - .45 + .05 + .3 + (i % 3) * .04, z, z + .1, ('cloth', 'roof', 'goods')[i % 3])
    box(U, -2.0, -1.7, Y + y, Y + y + .04, -1.45, -.2, 'oak')
box(U, -2.95, -2.05, Y, Y + 1.3, -3.825, -3.5, 'stone')                                # fireplace
box(U, -2.75, -2.25, Y + .05, Y + .75, -3.52, -3.49, 'iron')
box(U, -3.05, -1.95, Y + 1.3, Y + 1.4, -3.85, -3.42, 'sill')
box(U, -3.1, -1.9, Y, Y + .06, -3.5, -3.3, 'sill')
box(U, -2.4, -1.8, Y, Y + .5, 3.85, 4.35, 'oak'); box(U, -2.4, -1.8, Y + .5, Y + .56, 3.85, 4.35, 'iron')
box(U, -4.95, -4.05, Y, Y + .45, -3.8, -3.3, 'oak')                                   # document chest
box('Bank_UpperFloorRug', -3.9, -2.9, Y, Y + .012, -.6, 2.6, 'cloth')
cyl(U, -3.5, -3.0, .02, Y + 2.1, Y + 2.85, 'iron', n=4); box(U, -3.62, -3.38, Y + 1.85, Y + 2.1, -3.12, -2.88, 'glass')

# ================================================================ build Blender objects
root = bpy.data.objects.new('Bank_Root', None)
bpy.context.collection.objects.link(root)
objs = []
for name, (V, Fc, M) in G.items():
    if not Fc:
        continue
    me = bpy.data.meshes.new(name)
    me.from_pydata([(x, -z, y) for x, y, z in V], [], Fc)
    me.update()
    keys = []
    for m in M:
        if m not in keys:
            keys.append(m)
    for k in keys:
        me.materials.append(MAT[k])
    idx = {k: i for i, k in enumerate(keys)}
    for p, m in zip(me.polygons, M):
        p.material_index = idx[m]
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.parent = root
    objs.append(o)
bpy.context.view_layer.update()

model = OUT / 'bank'
bpy.ops.wm.save_as_mainfile(filepath=str(model.with_suffix('.blend')))
bpy.ops.export_scene.gltf(filepath=str(model.with_suffix('.glb')), export_format='GLB', export_yup=True)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
corners = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = [min(v[i] for v in corners) for i in range(3)]; hi = [max(v[i] for v in corners) for i in range(3)]
tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes)
used = sorted({m.name for o in meshes for m in o.data.materials})
report = {
    'status': 'm44-candidate-unapproved', 'id': 'bank', 'prefix': 'Bank_',
    'triangles': tris, 'materials': len(used), 'materialNames': used, 'meshCount': len(meshes),
    'boundsGame': {'x': [lo[0], hi[0]], 'y': [lo[2], hi[2]], 'z': [-hi[1], -lo[1]]},
    'dimensions': {'width': hi[0] - lo[0], 'depth': hi[1] - lo[1], 'height': hi[2] - lo[2]},
    'intendedPlacement': {'x': 86, 'y': 6.30, 'z': 57, 'measuredPad': 6.00, 'plinth': .30},
    'perMesh': {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes},
}
(PROOF / 'asset_report.json').write_text(json.dumps(report, indent=2))
print('[BANK_M44] tris', tris, 'materials', len(used), 'meshes', len(meshes), 'dims', [round(hi[i] - lo[i], 2) for i in range(3)])

# ================================================================ proof renders (workbench, studio light, material colours)
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'
sc.display.shading.light = 'STUDIO'
sc.display.shading.color_type = 'MATERIAL'
sc.display.shading.show_shadows = True
sc.display.shading.show_cavity = True
sc.render.resolution_x = 960; sc.render.resolution_y = 720
sc.world = bpy.data.worlds.new('w'); sc.world.color = (.62, .66, .62)
gp = bpy.data.meshes.new('ProofGround')
gp.from_pydata([(-14, -12, PAD - .01), (14, -12, PAD - .01), (14, 12, PAD - .01), (-14, 12, PAD - .01)], [], [(0, 1, 2, 3)])
gm = bpy.data.materials.new('ProofGrass'); gm.diffuse_color = (.36, .45, .27, 1); gp.materials.append(gm)
ground = bpy.data.objects.new('ProofGround', gp); sc.collection.objects.link(ground)
cam = bpy.data.objects.new('ProofCam', bpy.data.cameras.new('ProofCam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.lens = 38


def look(name, eye, target=(0, 2.5, 0), hide=()):
    for o in meshes:
        o.hide_render = any(o.name.startswith(h) for h in hide)
    e = Vector((eye[0], -eye[2], eye[1])); t = Vector((target[0], -target[2], target[1]))
    cam.location = e; cam.rotation_euler = (t - e).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = str(PROOF / (name + '.png')); bpy.ops.render.render(write_still=True)


look('front_34', (15, 11, 20), (0, 2.6, 0.5))
look('back_34', (-15, 12, -19), (0, 2.6, -.5))
look('side_west', (-24, 5, 3), (0, 3.2, 0))
look('top', (0.3, 32, 5), (0, 0, 0.3))
look('cutaway', (9, 17, 15), (0, 0, -0.3), hide=('Bank_Roof', 'Bank_Upper'))
views = ['front_34', 'back_34', 'side_west', 'top', 'cutaway']
try:
    import numpy as np
    W_, H_ = 960, 720
    sheet = np.ones((H_ * 2, W_ * 3, 4), dtype=np.float32)
    for i, v in enumerate(views):
        img = bpy.data.images.load(str(PROOF / (v + '.png')))
        px = np.array(img.pixels[:], dtype=np.float32).reshape(img.size[1], img.size[0], 4)
        r, c = divmod(i, 3)
        sheet[(1 - r) * H_:(2 - r) * H_, c * W_:(c + 1) * W_] = px
    out = bpy.data.images.new('sheet', W_ * 3, H_ * 2, alpha=True)
    out.pixels[:] = sheet.ravel()
    out.filepath_raw = str(PROOF / 'sheet.png'); out.file_format = 'PNG'; out.save()
except Exception as ex:
    print('[BANK_M44] sheet failed', ex)
print('[BANK_M44] renders done')
