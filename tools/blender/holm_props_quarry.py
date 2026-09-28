"""Mining and smithing pieces for the props pass of the Quarry Gate and the training Cavern (owner, 2026-09-28: "props ...
blocky -> redo in Blender purposefully"; "every object in every building reviewed in Blender").

Pieces the shared trade kit (holm_trade_props) does not have, designed one by one in the 2004 low-poly manner: a heap of
broken ore in a crate or a kibble, a hung kibble on its bail, a staved drum, rope wound on a drum, a spoked hand wheel,
a leaning or hanging pick, a coil of rope lying on the boards, a ring hung round a beam. Plan coordinates (x east, y up,
z south), metres = tiles, building-local; every function draws into an Acc part. Original designs only.
"""
import math
from mathutils import Vector
import holm_trade_props as T
from holm_purposeful_props import arc, ellipsoid, _rot


def lumps(A, x0, x1, z0, z1, y, top, mats, rng, n=6, rmin=.045, rmax=.075):
    """Broken ore heaped over a rectangle: a bed of ore (a low mound, its rim at y, its crown at top - rmax) with
    faceted lumps piled on it, the biggest near the middle."""
    k = 3
    V = []
    for i in range(k + 1):
        for j in range(k + 1):
            u, w = i / k, j / k
            edge = i in (0, k) or j in (0, k)
            h = 0 if edge else (top - rmax - y) * rng.uniform(.75, 1.0)
            V.append((x0 + (x1 - x0) * u, y + h, z0 + (z1 - z0) * w))
    F = [(i * (k + 1) + j, i * (k + 1) + j + 1, (i + 1) * (k + 1) + j + 1, (i + 1) * (k + 1) + j) for i in range(k) for j in range(k)]
    A.poly(V, F, mats[-1])
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    for q in range(n):
        r = rng.uniform(rmin, rmax) * (1.15 if q == 0 else 1)
        if q == 0:
            px, pz = cx, cz
        else:                                                       # spread over the bed, a lump's width from its rim
            px, pz = rng.uniform(x0 + r * .7, x1 - r * .7), rng.uniform(z0 + r * .7, z1 - r * .7)
        # the lump rests on the bed where it lies (the bed's height there, a little sunk in)
        fu, fw = (px - x0) / (x1 - x0), (pz - z0) / (z1 - z0)
        bed = y + (top - rmax - y) * .85 * max(0, 1 - 2 * max(abs(fu - .5), abs(fw - .5)))
        T.lump(A, px, pz, bed - r * .2, r, mats[q % max(1, len(mats) - 1)], rng)


def staved(A, x, z, y, prof, n, staves, rot=0.0, bottom=None):
    """A staved vessel (bucket, kibble, tub): each stave its own shade, the profile [(radius, height), ...] from the
    foot up, open at the top; bottom = the colour of a bottom board (a vessel seen from below)."""
    rings = []
    for r, h in prof:
        rings.append([(x + r * math.cos(rot + 2 * math.pi * i / n), y + h, z + r * math.sin(rot + 2 * math.pi * i / n)) for i in range(n)])
    for a, b in zip(rings, rings[1:]):
        for i in range(n):
            j = (i + 1) % n
            A.poly([a[i], a[j], b[j], b[i]], [(0, 1, 2, 3)], staves[i % len(staves)])
    if bottom is not None:
        A.poly(rings[0], [tuple(range(n))], bottom)


def hoops(A, x, z, y, prof, ts, hoop, n, rot=0.0, w=.035, proud=.01):
    """Iron hoops round a staved vessel at heights ts (fractions of the profile's height)."""
    H = prof[-1][1]
    for t in ts:
        h = t * H
        r = prof[0][0]
        for (ra, ha), (rb, hb) in zip(prof, prof[1:]):
            if ha <= h <= hb and hb > ha:
                r = ra + (rb - ra) * (h - ha) / (hb - ha)
        A.lathe(x, z, y + h - w / 2, [(r + proud, 0), (r + proud, w)], n, hoop, top=False, rot=rot)


def kibble(A, x, z, y, h, r, staves, hoop, ore_mats, rng, bail=True, n=10):
    """An ore kibble: a stout staved bucket bellied a little, three iron hoops, lugs on the rim, an iron bail over the
    top (its crown is where the rope's shackle hooks), heaped with broken ore. Returns the bail's crown."""
    prof = [(r * .86, 0), (r * .95, h * .22), (r, h * .55), (r * .97, h * .85), (r * .93, h)]
    staved(A, x, z, y, prof, n, staves, bottom=staves[0])
    hoops(A, x, z, y, prof, (.1, .5, .9), hoop, n)
    rin = r * .93 - .012
    A.lathe(x, z, y + h - .05, [(rin, 0)], n, ore_mats[-1], top=True)
    for k in range(5):
        a = k * 2 * math.pi / 5 + .5; d = 0 if k == 0 else rin * .45
        T.lump(A, x + math.cos(a) * d, z + math.sin(a) * d, y + h - .06 + (.03 if k == 0 else 0), rin * (.42 if k == 0 else .32), ore_mats[k % max(1, len(ore_mats) - 1)], rng)
    if not bail:
        return None
    for s in (-1, 1):
        xc = x + s * (r * .93 + .006)
        A.box(xc - .014, xc + .014, y + h - .07, y + h + .02, z - .03, z + .03, hoop)            # the lugs the bail turns in
    br = r * .93 + .03
    arc(A, x, y + h - .02, z, br, 0, math.pi, 0, .024, .02, hoop, segs=8)
    return Vector((x, y + h - .02 + br, z))


def ring(A, c, normal, r, w, m, segs=6):
    """A ring (a link, a hanging ring, a shackle, a coil of rope) about centre c in the plane whose normal is `normal`:
    one closed washer of square section w (bent beams would lap each other's faces at every joint)."""
    c = Vector(c); nv = Vector(normal).normalized()
    u = nv.cross(Vector((0, 1, 0)))
    if u.length < .01:
        u = nv.cross(Vector((1, 0, 0)))
    u.normalize(); v = nv.cross(u).normalized()
    T.rim_ring(A, c, nv, u, v, r - w / 2, r + w / 2, w / 2, segs, m)


def drum(A, x0, x1, cy, cz, r, n, staves, cheek, rope, rope_d, iron, rope_x=None, rope_r=None, turns=8, cheek_r=None):
    """A winding drum along x: planked staves between two round cheeks, rope wound on it (a layer of rope with the turns
    showing as proud bands), iron tyres round the cheeks."""
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        p0 = (cy + r * math.cos(a0), cz + r * math.sin(a0)); p1 = (cy + r * math.cos(a1), cz + r * math.sin(a1))
        A.poly([(x0, p0[0], p0[1]), (x1, p0[0], p0[1]), (x1, p1[0], p1[1]), (x0, p1[0], p1[1])], [(0, 1, 2, 3)], staves[i % len(staves)])
    cr = cheek_r or r + .09
    for xc in (x0, x1):
        A.tube((xc - .025, cy, cz), (xc + .025, cy, cz), cr, n, cheek)
        A.tube((xc - .018, cy, cz), (xc + .018, cy, cz), cr + .012, n, iron, caps=False)
    if rope_x:                                                      # the turns of rope, each standing a little proud of the last
        ra, rb = rope_x; rr = rope_r or r + .035
        for k in range(turns):
            xa, xb = ra + (rb - ra) * k / turns, ra + (rb - ra) * (k + 1) / turns
            A.tube((xa, cy, cz), (xb, cy, cz), rr + (.009 if k % 2 else 0), n, rope if k % 2 else rope_d, caps=False)
        return rr + .009


def wheel(A, c, axis, r, spokes, rim_n, wood, hub, rim_w=.07, pegs=0, peg_l=.1, peg_m=None):
    """A spoked hand wheel: a rim of bent segments, spokes into a hub, optional hand pegs round the rim."""
    c = Vector(c); ax = Vector(axis).normalized()
    u = ax.cross(Vector((0, 1, 0)))
    if u.length < .01:
        u = ax.cross(Vector((1, 0, 0)))
    u.normalize(); v = ax.cross(u).normalized()
    P = lambda a, rr: c + (u * math.cos(a) + v * math.sin(a)) * rr
    T.rim_ring(A, c, ax, u, v, r - rim_w * .6, r + rim_w * .6, rim_w / 2, rim_n, wood)          # the rim: one bent band
    for i in range(spokes):
        a = 2 * math.pi * i / spokes + math.pi / spokes
        A.beam(tuple(P(a, r * .16)), tuple(P(a, r * .97)), rim_w * .7, rim_w * .7, wood)
    A.tube(tuple(c - ax * .07), tuple(c + ax * .07), r * .17, 8, hub)
    for i in range(pegs):
        a = 2 * math.pi * i / pegs + math.pi / spokes
        A.tube(tuple(P(a, r + rim_w * .5)), tuple(P(a, r + peg_l)), .018, 6, peg_m or wood)


def coil(A, x, z, y, r, h, rope, turns=3, n=12, end=True, end_a=.6):
    """A coil of rope lying on the boards: an annulus whose outer face shows the turns, a loose end trailing."""
    ri = r * .55
    prof = [(ri, 0), (r * .92, .004)]
    for k in range(turns):
        y0 = h * k / turns
        prof += [(r, y0 + h / turns * .5), (r * .93, y0 + h / turns)]
    prof += [(ri + .02, h), (ri, h * .6)]
    A.lathe(x, z, y, prof, n, rope, top=False)
    if end:
        a = end_a
        A.tube((x + math.cos(a) * r * .95, y + h * .5, z + math.sin(a) * r * .95), (x + math.cos(a + .5) * (r + .12), y + .02, z + math.sin(a + .5) * (r + .12)), .018, 5, rope)


def taper(A, p0, p1, w0, w1, nrm, m, cap0=False):
    """A square-section bar from p0 (w0 wide) to p1 (w1 wide, or a point when w1 = 0), its faces square to nrm."""
    p0, p1 = Vector(p0), Vector(p1); a = (p1 - p0).normalized()
    e1 = Vector(nrm); e1 = (e1 - a * e1.dot(a)).normalized(); e2 = a.cross(e1).normalized()
    sq = lambda p, w: [p + (e1 * i + e2 * j) * w / 2 for i, j in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    r0 = sq(p0, w0)
    if w1 <= 0:
        V_ = [tuple(q) for q in r0] + [tuple(p1)]
        F = [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4)]
    else:
        V_ = [tuple(q) for q in r0 + sq(p1, w1)]
        F = [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7)]
    if cap0:
        F.append((3, 2, 1, 0))
    A.poly(V_, F, m)


def pick_head(A, top, d, side, head, arm=.21, tip=None):
    """A pick's iron head at the top of its haft (d = along the haft, side = the way the arms reach): the eye, and two
    arms tapering to points that curve back toward the haft; tip = a colour for the points (hot iron)."""
    t = Vector(top); d = Vector(d).normalized(); side = Vector(side).normalized(); n = d.cross(side).normalized()
    E = [t + d * dd + side * ss + n * nn for dd in (-.045, .035) for ss, nn in ((-.036, -.028), (.036, -.028), (.036, .028), (-.036, .028))]
    A.poly([tuple(q) for q in E], [(0, 1, 2, 3)[::-1], (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)], head)   # the eye
    for s in (-1, 1):
        p0 = t + side * s * .03; p1 = t + side * s * arm * .55 - d * .015; p2 = t + side * s * arm - d * .075
        taper(A, p0, p1, .046, .032, n, head)
        taper(A, p1, p2, .032, 0, n, tip or head)


def pick(A, butt, top, haft, head, side, r=.02, arm=.21, tip=None):
    """A pickaxe from butt to top: an ash haft swelling toward the head, the iron head (pick_head) across it."""
    b, t = Vector(butt), Vector(top); d = (t - b).normalized()
    A.tube(tuple(b), tuple(t - d * .04), r, 6, haft, r2=r * 1.2)
    pick_head(A, t, d, side, head, arm=arm, tip=tip)


def hung_pick(A, x, z, y_top, length, haft, head):
    """A pick hung by its head on two pegs: the haft hanging straight down, the head's arms along z curving down."""
    pick(A, (x, y_top - length, z), (x, y_top, z), haft, head, (0, 0, 1))


def anvil(A, x, z, y, rot, iron, face, dark, s=1.0):
    """A horned anvil (horn toward rot): four spread feet, a waisted body, the steel face with the hardy and pritchel
    holes, a lower step before the horn, the horn tapering to a point and turning up a little, a square heel."""
    c, sn = math.cos(rot), math.sin(rot)
    P = lambda a, yy, b: (x + (a * c - b * sn) * s, y + yy * s, z + (a * sn + b * c) * s)
    def frustum(a0, a1, b0, b1, y0, a2, a3, b2, b3, y1, m, top=True, bottom=False):
        V_ = [P(a0, y0, b0), P(a1, y0, b0), P(a1, y0, b1), P(a0, y0, b1), P(a2, y1, b2), P(a3, y1, b2), P(a3, y1, b3), P(a2, y1, b3)]
        F = [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
        if top:
            F.append((4, 5, 6, 7))
        if bottom:
            F.append((3, 2, 1, 0))
        A.poly(V_, F, m)
    frustum(-.17, .17, -.1, .1, 0, -.14, .14, -.08, .08, .05, iron)                    # the spread foot
    for sa in (-1, 1):
        for sb in (-1, 1):
            frustum(sa * .17 - .025, sa * .17 + .025, sb * .1 - .025, sb * .1 + .025, 0, sa * .17 - .02, sa * .17 + .02, sb * .1 - .02, sb * .1 + .02, .035, iron)
    frustum(-.14, .14, -.08, .08, .05, -.08, .08, -.055, .055, .17, iron, top=False)  # the waist
    frustum(-.08, .08, -.055, .055, .17, -.17, .15, -.075, .075, .255, iron, top=False)  # the body flaring to the face
    frustum(-.17, .15, -.075, .075, .255, -.17, .15, -.075, .075, .3, face)            # the face
    frustum(-.25, -.17, -.06, .06, .255, -.25, -.17, -.06, .06, .3, iron)             # the heel
    frustum(.15, .22, -.06, .06, .25, .15, .22, -.06, .06, .28, iron)                 # the step
    # the horn: from the step's end to a point, its underside sweeping up
    V_ = [P(.22, .25, -.06), P(.22, .25, .06), P(.22, .285, .06), P(.22, .285, -.06), P(.3, .258, -.04), P(.3, .258, .04), P(.3, .283, .04), P(.3, .283, -.04), P(.39, .279, 0)]
    A.poly(V_, [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 8), (5, 6, 8), (6, 7, 8), (7, 4, 8)], iron)
    # the hardy (square) and pritchel (round) holes, dark on the face, 5 mm proud
    yh = .3 + .005 / s
    A.poly([P(-.14, yh, -.018), P(-.104, yh, -.018), P(-.104, yh, .018), P(-.14, yh, .018)], [(0, 1, 2, 3)], dark)
    A.poly([P(-.07 + .012 * math.cos(k * math.pi / 3), yh, .012 * math.sin(k * math.pi / 3)) for k in range(6)], [tuple(range(6))], dark)


def tongs(A, x, z, y, rot, iron, open_=.05):
    """Smith's tongs lying on a surface: two reins crossing at the rivet, one lying over the other, short curved jaws."""
    d = Vector((math.cos(rot), 0, math.sin(rot))); side = Vector((-d.z, 0, d.x))
    c = Vector((x, y, z))
    for k, sg in enumerate((1, -1)):
        h = .008 + k * .012                                             # the upper rein lies on the lower one
        A.beam(tuple(c - d * .32 + side * sg * open_ + Vector((0, h, 0))), tuple(c + Vector((0, h, 0))), .016, .01, iron)
        A.beam(tuple(c + Vector((0, h, 0))), tuple(c + d * .07 - side * sg * .018 + Vector((0, h, 0))), .02, .01, iron)
        A.beam(tuple(c + d * .07 - side * sg * .018 + Vector((0, h, 0))), tuple(c + d * .11 - side * sg * .006 + Vector((0, h, 0))), .018, .01, iron)
    A.tube(tuple(c + Vector((0, .003, 0))), tuple(c + Vector((0, .03, 0))), .011, 6, iron)


def plate_x(A, x0, x1, pts, m, caps=True):
    """A flat plate in the y-z plane: the convex outline pts [(z, y), ...] extruded from x0 to x1."""
    n = len(pts)
    V_ = [(x0, y, z) for z, y in pts] + [(x1, y, z) for z, y in pts]
    F = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    if caps:
        F += [tuple(range(n))[::-1], tuple(range(n, 2 * n))]
    A.poly(V_, F, m)


def shovel(A, grip, tip, side, haft, blade, w=.2, blade_l=.28):
    """A long-handled shovel from the grip to the blade's tip: a T grip, the ash haft, an iron socket, a square-mouthed
    blade (one sheet) spread along `side`, dished a little."""
    g, t = Vector(grip), Vector(tip); d = (t - g).normalized(); sd = Vector(side).normalized()
    sd = (sd - d * sd.dot(d)).normalized(); n = d.cross(sd).normalized()
    s0 = t - d * blade_l
    A.tube(tuple(g), tuple(s0 - d * .02), .018, 6, haft)
    A.beam(tuple(g - sd * .06), tuple(g + sd * .06), .026, .026, haft)                        # the T grip
    A.tube(tuple(s0 - d * .09), tuple(s0 + d * .02), .024, 6, blade, r2=.03)                  # the socket
    P = [s0 + sd * w * .38, t + sd * w / 2 + n * .012, t - sd * w / 2 + n * .012, s0 - sd * w * .38]
    A.poly([tuple(p) for p in P] + [tuple(t + n * .02)], [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4)], blade)


def hung_tongs(A, rx, ry, zc, front, iron, reach=.55, r=.045):
    """Smith's tongs hung by their jaws over a rail running along z (its centre at rx, ry): the jaws hook over the
    rail's top from the back, the boss and the two reins hang down in front (front = +1/-1, the x side), splayed a
    little at their ends."""
    pts = [(rx - front * r, ry - .02), (rx - front * r * .7, ry + r * .8), (rx + front * r * .7, ry + r * .8), (rx + front * r, ry - .02)]
    for (xa, ya), (xb, yb) in zip(pts, pts[1:]):
        A.beam((xa, ya, zc), (xb, yb, zc), .02, .02, iron)                                   # the jaws' hook
    for s_ in (1, -1):
        A.beam((rx + front * r, ry - .02, zc + s_ * .008), (rx + front * (r + .01), ry - reach, zc + s_ * .04), .014, .012, iron)   # the reins
    A.tube((rx + front * (r - .012), ry - .06, zc), (rx + front * (r + .03), ry - .06, zc), .013, 6, iron)                      # the rivet


def heap(A, x, z, y, r, h, mats, rng, n=9, rot=0.0):
    """A heap of broken rock and ore on the floor: a low round mound (its foot 6 mm up off the floor) with faceted
    lumps lying on its slopes, the biggest near the top."""
    A.lathe(x, z, y, [(r, 0), (r * .72, h * .42), (r * .38, h * .78), (0, h)], 9, mats[-1], top=False, rot=rot)
    for k in range(n):
        f = 0 if k == 0 else rng.uniform(.25, .95)
        a = rng.random() * 2 * math.pi
        px, pz = x + math.cos(a) * r * f, z + math.sin(a) * r * f
        surf = y + h * (1 - f) ** 1.15
        lr = rng.uniform(.045, .075) * (1.25 if k == 0 else 1) * (1.1 - f * .3)
        T.lump(A, px, pz, surf - lr * .35, lr, mats[k % max(1, len(mats) - 1)], rng)
