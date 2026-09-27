"""Purposeful table ware and household pieces for the Tutor's Holm interiors (owner review 4, 2026-09-27).

Owner, on the Guide House main room: "stuff on the table - vases, bowls, urns - look blocky, like they haven't been designed
through Blender; everything inside that room needs to look designed purposefully; this is the main room people see."
The v3 kit turned every vessel from 6-8 sides and three profile points, so a jug, a jar and a vase read as the same stub.
These pieces are designed one by one, still low-poly and flat-shaded in the 2004 manner (sharp_by_angle on build), but with
a silhouette that says what each thing is: a jug has a belly, a neck, a pinched spout and a strap handle; a tankard tapers,
has hoops and a D handle; a bowl has a foot ring and a curved wall, with fruit that sits in it; a loaf is scored; a cheese
is cut; a candlestick is turned with a drip pan; an urn has shoulders, a neck, a rim and loop handles; plates stand in the
dresser's groove. Plan coordinates (x east, y up, z south), metres = tiles, like holm_interior_kit (Acc parts, one mesh
per part, vertex colours). Original designs only.
"""
import math
from holm_interior_kit import Acc


def _rot(x, z, a, cx=0.0, cz=0.0):
    c, s = math.cos(a), math.sin(a)
    return (cx + x * c - z * s, cz + x * s + z * c)


def arc(A, cx, cy, cz, r, a0, a1, rot, w, d, m, segs=6, lean=0.0):
    """A strap bent round an arc in the vertical plane that faces direction rot (a handle): centre (cx, cy, cz), radius
    r, from angle a0 to a1 (0 = out along rot, pi/2 = up)."""
    pts = []
    for i in range(segs + 1):
        t = a0 + (a1 - a0) * i / segs
        u, v = r * math.cos(t), r * math.sin(t)
        px, pz = _rot(u, lean * v, rot, cx, cz)
        pts.append((px, cy + v, pz))
    for p, q in zip(pts, pts[1:]):
        A.beam(p, q, w, d, m)


def ellipsoid(A, cx, cy, cz, rx, ry, rz, m, seg=10, rings=5, rot=0.0, flat=None):
    """An ellipsoid; flat = a y below which the vertices are pressed flat (a loaf standing on a board)."""
    c, s = math.cos(rot), math.sin(rot)
    V = [(cx, cy - ry if flat is None else max(cy - ry, flat), cz)]
    F = []
    for i in range(1, rings):
        ph = -math.pi / 2 + math.pi * i / rings
        for j in range(seg):
            th = 2 * math.pi * j / seg
            x, z = rx * math.cos(ph) * math.cos(th), rz * math.cos(ph) * math.sin(th)
            y = cy + ry * math.sin(ph)
            if flat is not None:
                y = max(y, flat)
            V.append((cx + x * c - z * s, y, cz + x * s + z * c))
    V.append((cx, cy + ry, cz))
    top = len(V) - 1
    for j in range(seg):
        F.append((0, 1 + (j + 1) % seg, 1 + j))
    for i in range(rings - 2):
        a = 1 + i * seg
        b = a + seg
        for j in range(seg):
            F.append((a + j, a + (j + 1) % seg, b + (j + 1) % seg, b + j))
    a = 1 + (rings - 2) * seg
    for j in range(seg):
        F.append((a + j, a + (j + 1) % seg, top))
    A.poly(V, F, m)


def jug(A, x, z, y, h, body, inside, rot=0.0, glaze=None):
    """A turned earthenware jug: foot, full belly, waisted neck, flared lip with a pinched spout (facing rot), a strap
    handle opposite from the shoulder to the belly, and a glaze band round the shoulder."""
    prof = [(.26, 0), (.30, .03), (.40, .16), (.44, .34), (.41, .52), (.31, .66), (.20, .76), (.18, .84), (.21, .93), (.25, 1.0)]
    A.lathe(x, z, y, [(r * h, t * h) for r, t in prof], 14, body, top=True, top_m=inside, rot=rot)
    if glaze:
        A.lathe(x, z, y + .58 * h, [(.395 * h + .003, 0), (.33 * h + .003, .09 * h)], 14, glaze, top=False, rot=rot)
    # spout: the lip pulled forward into a V
    sx, sz = _rot(.25 * h, 0, rot, x, z)
    tx, tz = _rot(.36 * h, 0, rot, x, z)
    lx, lz = _rot(.2 * h, .09 * h, rot, x, z)
    rx_, rz = _rot(.2 * h, -.09 * h, rot, x, z)
    sp = [(lx, y + h, lz), (tx, y + 1.04 * h, tz), (rx_, y + h, rz), (sx, y + .9 * h, sz)]
    A.poly(sp, [(0, 1, 3), (1, 2, 3)], body); A.poly(sp, [(3, 1, 0), (3, 2, 1)], body)   # both sides, separate vertices
    # strap handle, opposite the spout
    hx, hz = _rot(-.30 * h, 0, rot, x, z)
    arc(A, hx, y + .62 * h, hz, .2 * h, -math.pi * .55, math.pi * .45, rot + math.pi, .05 * h, .025 * h + .004, body, segs=7)


def tankard(A, x, z, y, h, body, band, rot=0.0, inside=None):
    """A pewter (or turned wood) tankard: tapered drum on a moulded foot, two hoops, a D handle."""
    r0, r1 = .36 * h, .31 * h
    A.lathe(x, z, y, [(r0 + .02 * h, 0), (r0 + .02 * h, .06 * h), (r0, .08 * h), (r1, h), (r1 + .02 * h, h)], 12, body, top=True, top_m=inside or body, rot=rot)
    for t in (.24, .78):
        r = r0 + (r1 - r0) * t
        A.lathe(x, z, y + t * h - .02 * h, [(r + .012, 0), (r + .012, .045 * h)], 12, band, top=False, rot=rot)
    hx, hz = _rot(r0 + .01, 0, rot + math.pi, x, z)
    arc(A, hx, y + .55 * h, hz, .24 * h, -math.pi * .5, math.pi * .5, rot + math.pi, .05 * h, .06 * h, body, segs=6)


def bowl(A, x, z, y, r, body, inside, n=14):
    """A turned bowl: a foot ring, a curved wall, a rolled rim; the inside shows as its own colour just under the rim."""
    A.lathe(x, z, y, [(.42 * r, 0), (.46 * r, .05 * r), (.40 * r, .07 * r), (.62 * r, .16 * r), (.86 * r, .32 * r), (.98 * r, .48 * r), (1.0 * r, .54 * r)], n, body, top=False)
    A.lathe(x, z, y + .54 * r, [(1.0 * r, 0), (.9 * r, -.02 * r), (.84 * r, -.12 * r)], n, body, top=True, top_m=inside)


def apple(A, x, y, z, r, skin, stalk, rot=0.0):
    ellipsoid(A, x, y + r * .92, z, r, r * .9, r, skin, seg=8, rings=4, rot=rot)
    A.box(x - .004, x + .004, y + r * 1.72, y + r * 2.05, z - .004, z + .004, stalk)


def fruit_bowl(A, x, z, y, r, body, inside, skins, stalk, rng):
    bowl(A, x, z, y, r, body, inside)
    top = y + .42 * r
    spots = [(0, 0)] + [(math.cos(a) * r * .5, math.sin(a) * r * .5) for a in (0.3, 2.4, 4.4)]
    for i, (dx, dz) in enumerate(spots):
        ar = r * rng.uniform(.34, .4)
        apple(A, x + dx, top + (.02 * r if i else .12 * r), z + dz, ar, skins[i % len(skins)], stalk, rot=rng.random() * 6)


def loaf(A, x, z, y, l, w, h, crust, score, rot=0.0):
    """A cob loaf standing on its base, three slashes across the top."""
    ellipsoid(A, x, y + h * .45, z, l / 2, h * .55, w / 2, crust, seg=12, rings=6, rot=rot, flat=y)
    for k in (-1, 0, 1):
        cx, cz = _rot(k * l * .22, 0, rot, x, z)
        A.rbox(cx, cz, .012, w * .62, y + h * .92 - abs(k) * h * .12, y + h * .99 - abs(k) * h * .12, rot + .5, score)


def bread_board(A, x, z, y, l, w, wood, rot=0.0):
    """A board with a rounded handle end and a hanging hole."""
    A.rbox(x, z, l, w, y, y + .025, rot, wood)
    hx, hz = _rot(l / 2 + .05, 0, rot, x, z)
    A.lathe(hx, hz, y, [(.06, 0), (.06, .025)], 10, wood, top=True, rot=rot)


def knife(A, x, z, y, rot, blade, haft):
    a = _rot(-.05, 0, rot, x, z)
    b = _rot(.1, 0, rot, x, z)
    c = _rot(-.16, 0, rot, x, z)
    bl = [(a[0], y + .004, a[1]), (b[0], y + .004, b[1]), (a[0] + (b[0] - a[0]) * .1, y + .004, a[1] + (b[1] - a[1]) * .1 + .018)]
    A.poly(bl, [(0, 1, 2)], blade); A.poly(bl, [(2, 1, 0)], blade)
    A.beam((c[0], y + .012, c[1]), (a[0], y + .012, a[1]), .022, .018, haft)


def cheese(A, x, z, y, r, h, rind, paste, rot=0.0, cut=0.9, n=14):
    """A cheese wheel with a wedge cut out, the cut faces showing the paste."""
    a0, a1 = rot + cut / 2, rot + 2 * math.pi - cut / 2
    ring = [(x + r * math.cos(a0 + (a1 - a0) * i / n), z + r * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]
    V = [(x, y, z), (x, y + h, z)] + [(px, y, pz) for px, pz in ring] + [(px, y + h, pz) for px, pz in ring]
    b, t = 2, 2 + len(ring)
    top = [(1, t + i + 1, t + i) for i in range(n)]
    side = [(b + i, b + i + 1, t + i + 1, t + i) for i in range(n)]
    A.poly(V, top + side, rind)
    A.poly(V, [(0, b, t, 1), (0, 1, t + n, b + n)], paste)   # the two cut faces show the paste


def candlestick(A, x, z, y, metal, wax, flame, h=.2):
    """A turned candlestick: stepped base, knop, stem, drip pan, candle and a crossed flame."""
    A.lathe(x, z, y, [(.055, 0), (.055, .01), (.04, .02), (.016, .03), (.022, .05), (.013, .06), (.013, .1), (.03, .11), (.034, .12), (.015, .122)], 10, metal, top=True)
    b = y + .12
    A.lathe(x, z, b, [(.017, 0), (.017, h)], 8, wax, top=True)
    for a in (0, math.pi / 2):
        c, s = math.cos(a) * .013, math.sin(a) * .013
        fl = [(x - c, b + h, z - s), (x + c, b + h, z + s), (x, b + h + .065, z)]
        A.poly(fl, [(0, 1, 2)], flame); A.poly(fl, [(2, 1, 0)], flame)


def urn(A, x, z, y, h, body, rim, rot=0.0, lid=None):
    """A tall storage urn: foot, swelling body, strong shoulder, neck and rolled rim, two loop handles, a wooden lid."""
    prof = [(.24, 0), (.28, .03), (.24, .05), (.36, .14), (.44, .32), (.45, .48), (.40, .62), (.28, .74), (.19, .8), (.18, .88), (.21, .93), (.23, .97), (.2, 1.0)]
    A.lathe(x, z, y, [(r * h, t * h) for r, t in prof], 16, body, top=True, top_m=lid or rim, rot=rot)
    A.lathe(x, z, y + .9 * h, [(.215 * h, 0), (.225 * h, .04 * h), (.21 * h, .07 * h)], 16, rim, top=False, rot=rot)
    for side in (0, math.pi):
        hx, hz = _rot(.33 * h, 0, rot + side, x, z)
        arc(A, hx, y + .72 * h, hz, .09 * h, -math.pi * .6, math.pi * .6, rot + side, .035 * h, .03 * h, body, segs=5)
    if lid:
        A.lathe(x, z, y + h, [(.2 * h, 0), (.19 * h, .025 * h), (.05 * h, .04 * h), (.035 * h, .08 * h), (0, .09 * h)], 12, lid, top=False, rot=rot)


def vase(A, x, z, y, h, body, style=0, band=None, rot=0.0):
    """Dresser vessels, each its own shape: 0 a bottle with a long neck, 1 a lidded storage jar with a knob, 2 a
    round-bellied flask with a short collar, 3 a tall beaker with a foot."""
    if style == 0:
        prof = [(.2, 0), (.26, .05), (.3, .25), (.28, .45), (.16, .56), (.09, .64), (.08, .9), (.11, .95), (.1, 1.0)]
    elif style == 1:
        prof = [(.24, 0), (.3, .06), (.34, .3), (.34, .66), (.28, .8), (.27, .84), (.3, .86), (.3, .9), (.12, .96), (.07, .97), (.07, 1.02), (0, 1.05)]
    elif style == 2:
        prof = [(.2, 0), (.3, .08), (.38, .3), (.36, .52), (.22, .68), (.12, .74), (.12, .86), (.15, .9)]
    else:
        prof = [(.24, 0), (.24, .04), (.14, .08), (.16, .3), (.26, .8), (.28, 1.0)]
    A.lathe(x, z, y, [(r * h, t * h) for r, t in prof], 14, body, top=True, rot=rot)
    if band:
        t0 = {0: .3, 1: .5, 2: .32, 3: .55}[style]
        r = .0
        for (ra, ta), (rb, tb) in zip(prof, prof[1:]):   # the body's radius at the band, interpolated on the profile
            if ta <= t0 <= tb and tb > ta:
                r = ra + (rb - ra) * (t0 - ta) / (tb - ta)
        r = r * h + .003
        A.lathe(x, z, y + t0 * h, [(r, 0), (r, .07 * h)], 14, band, top=False, rot=rot)


def plate(A, x, z, y, r, m, well, stand=None):
    """A plate with a raised rim and a sunk well. stand=(yaw): standing on its edge in a dresser groove, leaning back
    10 degrees, facing yaw."""
    V0 = []
    n = 16
    prof = [(0, .004), (.62 * r, .004), (.78 * r, .012), (.96 * r, .02), (r, .026)]
    rings = []
    for pr, py in prof:
        rings.append([(pr * math.cos(2 * math.pi * i / n), py, pr * math.sin(2 * math.pi * i / n)) for i in range(n)])
    V = [p for ring in rings for p in ring]
    F = []
    for a in range(len(rings) - 1):
        for i in range(n):
            F.append((a * n + i, a * n + (i + 1) % n, (a + 1) * n + (i + 1) % n, (a + 1) * n + i))
    back = [(p[0], 0.0, p[2]) for p in rings[-1]]
    k = len(V)
    V += back
    FB = [(k + i, k + (i + 1) % n, (len(rings) - 1) * n + (i + 1) % n, (len(rings) - 1) * n + i)[::-1] for i in range(n)]
    FB.append(tuple(k + i for i in range(n - 1, -1, -1)))
    if stand is None:
        V = [(x + p[0], y + p[1], z + p[2]) for p in V]
    else:
        # stand the plate up: its face turned toward yaw, tipped back 10 degrees, resting on its rim
        tilt = math.radians(80)
        out = []
        for px, py, pz in V:
            # local: plate face normal +y -> rotate about x by -tilt so the face looks +z, then yaw
            ly = py * math.cos(tilt) - pz * math.sin(tilt)
            lz = py * math.sin(tilt) + pz * math.cos(tilt)
            wx, wz = _rot(px, lz, stand, 0, 0)
            out.append((x + wx, y + r * math.sin(tilt) + ly, z + wz))
        V = out
    A.poly(V, F[:n], well)
    A.poly(V, F[n:], m)
    A.poly(V, FB, m)


def pail(A, x, z, y, h, staves, hoop, handle):
    """A coopered pail: tapered staves, two iron hoops, a bail handle."""
    r0, r1 = .36 * h, .44 * h
    A.lathe(x, z, y, [(r0, 0), (r1, h)], 12, staves, top=True, top_m=staves)
    for t in (.2, .8):
        r = r0 + (r1 - r0) * t + .008
        A.lathe(x, z, y + t * h - .015, [(r, 0), (r, .03)], 12, hoop, top=False)
    arc(A, x, y + h, z, r1, 0, math.pi, 0, .02, .02, handle, segs=8)


def pot_plant(A, x, z, y, pot, rim, soil, leaves, rng, h=.3):
    """A flowerpot with a rolled rim and a herb growing out of it: leaves in three tiers."""
    A.lathe(x, z, y, [(.12, 0), (.13, .02), (.17, h * .85), (.19, h * .88), (.19, h), (.165, h)], 14, pot, top=True, top_m=soil)
    for tier, (ry, rr, cnt) in enumerate(((h + .05, .2, 7), (h + .16, .15, 6), (h + .25, .09, 5))):
        for i in range(cnt):
            a = i * 2 * math.pi / cnt + tier * .4 + rng.uniform(-.2, .2)
            c, s = math.cos(a), math.sin(a)
            tip = (x + c * rr * 1.6, y + ry + .06, z + s * rr * 1.6)
            b1 = (x + c * .02 - s * .05, y + ry - .08, z + s * .02 + c * .05)
            b2 = (x + c * .02 + s * .05, y + ry - .08, z + s * .02 - c * .05)
            mid = (x + c * rr, y + ry + .05, z + s * rr)
            A.poly([b1, mid, tip, b2], [(0, 1, 2, 3)], leaves[(i + tier) % len(leaves)]); A.poly([b1, mid, tip, b2], [(3, 2, 1, 0)], leaves[(i + tier) % len(leaves)])


def basin(A, x, z, y, r, body, water):
    """A wash basin with a wide rolled rim and water in it."""
    A.lathe(x, z, y, [(.5 * r, 0), (.55 * r, .05 * r), (.8 * r, .2 * r), (.97 * r, .36 * r), (1.08 * r, .4 * r), (1.08 * r, .43 * r)], 16, body, top=False)
    A.lathe(x, z, y + .43 * r, [(1.08 * r, 0), (.92 * r, -.01 * r), (.9 * r, -.08 * r)], 16, body, top=True, top_m=water)


def broom(A, x, z, y, lean_to, handle, bristle):
    """A besom leaning in a corner: ash handle, a birch-twig head bound twice."""
    tx, tz = lean_to
    A.beam((x, y + .3, z), (tx, y + 1.45, tz), .035, .035, handle)
    A.lathe(x, z, y, [(.11, 0), (.1, .08), (.06, .3), (.035, .36)], 10, bristle, top=True)
    for t in (.22, .3):
        A.lathe(x, z, y + t, [(.07 - (t - .22) * .3, 0), (.07 - (t - .22) * .3, .025)], 10, handle, top=False)
