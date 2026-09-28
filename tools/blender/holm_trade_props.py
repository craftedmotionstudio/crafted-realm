"""Trade props for the Tutor's Holm buildings (props pass, 2026-09-28; owner: "props ... blocky -> redo in Blender
purposefully", "every object in every building reviewed in Blender").

Each piece is designed one by one so a player can tell what it is and why it is there, in the 2004 low-poly manner:
few big faces, a silhouette that names the thing (a chest has a lid, hasp and handles; a spear has a leaf blade and a
ferrule; an anvil has its horn and heel; a barrel bellies and is hooped in pairs), flat colours or the old-school kit
textures (the colour's tex), never glossy. Household ware comes from holm_purposeful_props (review 4).
Plan coordinates (x east, y up, z south), metres = tiles, building-local; every function draws into an Acc part.
Original designs only; nothing traced or copied from any game.
"""
import math, random
from mathutils import Vector
from holm_purposeful_props import arc, ellipsoid, _rot


# ------------------------------------------------------------------ small geometry helpers
def V(x, y, z):
    return Vector((x, y, z))


def at(A, dy, fn, *a, **kw):
    """Draw a floor-standing piece (built from y = 0) on a floor at height dy (an upper storey)."""
    k = len(A.v)
    r = fn(A, *a, **kw)
    for i in range(k, len(A.v)):
        x, y, z = A.v[i]
        A.v[i] = (x, y + dy, z)
    return r


def oct_prism(A, cx, cz, rx, rz, y0, y1, m, cut=.3, rot=0.0, bottom=False):
    """A box with its four vertical edges chamfered (cut = fraction of the half-width taken off): a dressed post,
    a hewn block. Top and sides; bottom optional."""
    pts = []
    for sx, sz in ((1, 1), (-1, 1), (-1, -1), (1, -1)):
        a = (sx * rx, sz * rz * (1 - cut)); b = (sx * rx * (1 - cut), sz * rz)
        pts += [a, b] if sx * sz > 0 else [b, a]
    out = [_rot(px, pz, rot, cx, cz) for px, pz in pts]
    A.slab(out, y0, y1, m)
    if bottom:
        A.poly([(x, y0, z) for x, z in out[::-1]], [tuple(range(len(out)))], m)


def ring(cx, cz, r, n, a0=0.0):
    return [(cx + r * math.cos(a0 + 2 * math.pi * i / n), cz + r * math.sin(a0 + 2 * math.pi * i / n)) for i in range(n)]


def rim_ring(A, c, nv, u, w, r0, r1, half, n, m):
    """A flat ring (washer) of rectangular section about centre c in the plane (u, w), normal nv: inner radius r0, outer
    r1, reaching `half` either side of the plane. Closed, so it sits over a board's edge without fighting it."""
    pts = lambda r, o: [tuple(c + nv * o + (u * math.cos(2 * math.pi * i / n) + w * math.sin(2 * math.pi * i / n)) * r) for i in range(n)]
    oi, oo, bi, bo = pts(r0, half), pts(r1, half), pts(r0, -half), pts(r1, -half)
    V_ = oi + oo + bi + bo
    F = []
    for i in range(n):
        j = (i + 1) % n
        F += [(i, n + i, n + j, j), (2 * n + j, 3 * n + j, 3 * n + i, 2 * n + i), (n + i, 3 * n + i, 3 * n + j, n + j), (j, 2 * n + j, 2 * n + i, i)]
    A.poly(V_, F, m)


def candlestick(A, x, z, y, metal, wax, flame, h=.2):
    """A turned candlestick (the review-4 turning: stepped base, knop, stem, drip pan) with the candle and a crossed
    flame of single sheets (the game draws them two-sided)."""
    A.lathe(x, z, y, [(.055, 0), (.055, .01), (.04, .02), (.016, .03), (.022, .05), (.013, .06), (.013, .1), (.03, .11), (.034, .12), (.015, .122)], 10, metal, top=True)
    b = y + .122
    A.lathe(x, z, b, [(.017, 0), (.017, h)], 8, wax, top=True)
    for a in (0, math.pi / 2):
        cc, s = math.cos(a) * .013, math.sin(a) * .013
        A.poly([(x - cc, b + h + .004, z - s), (x + cc, b + h + .004, z + s), (x, b + h + .065, z)], [(0, 1, 2)], flame)


def jug(A, x, z, y, h, body, inside, rot=0.0, glaze=None):
    """The review-4 jug (belly, waisted neck, flared lip, strap handle, glaze band) with its spout as one sheet."""
    prof = [(.26, 0), (.30, .03), (.40, .16), (.44, .34), (.41, .52), (.31, .66), (.20, .76), (.18, .84), (.21, .93), (.25, 1.0)]
    A.lathe(x, z, y, [(r * h, t * h) for r, t in prof], 14, body, top=True, top_m=inside, rot=rot)
    if glaze:
        A.lathe(x, z, y + .58 * h, [(.395 * h + .004, 0), (.33 * h + .004, .09 * h)], 14, glaze, top=False, rot=rot)
    sx, sz = _rot(.25 * h, 0, rot, x, z); tx, tz = _rot(.36 * h, 0, rot, x, z)
    lx, lz = _rot(.2 * h, .09 * h, rot, x, z); rx_, rz = _rot(.2 * h, -.09 * h, rot, x, z)
    A.poly([(lx, y + h, lz), (tx, y + 1.04 * h, tz), (rx_, y + h, rz), (sx, y + .9 * h, sz)], [(0, 1, 3), (1, 2, 3)], body)
    hx, hz = _rot(-.30 * h, 0, rot, x, z)
    arc(A, hx, y + .62 * h, hz, .2 * h, -math.pi * .55, math.pi * .45, rot + math.pi, .05 * h, .025 * h + .004, body, segs=7)


def knife(A, x, z, y, rot, blade, haft):
    """A table knife: the blade one sheet laid 4 mm over the board, a wooden haft."""
    a = _rot(-.05, 0, rot, x, z); b = _rot(.1, 0, rot, x, z); c = _rot(-.16, 0, rot, x, z)
    A.poly([(a[0], y + .005, a[1]), (b[0], y + .005, b[1]), (a[0] + (b[0] - a[0]) * .1, y + .005, a[1] + (b[1] - a[1]) * .1 + .018)], [(0, 1, 2)], blade)
    A.beam((c[0], y + .012, c[1]), (a[0], y + .012, a[1]), .022, .018, haft)


def loaf(A, x, z, y, l, w, h, crust, score, rot=0.0):
    """A cob loaf resting on its base (4 mm up, so its pressed base never lies in the board's plane), three slashes."""
    ellipsoid(A, x, y + h * .45 + .004, z, l / 2, h * .55, w / 2, crust, seg=12, rings=6, rot=rot, flat=y + .004)
    for k in (-1, 0, 1):
        cx, cz = _rot(k * l * .22, 0, rot, x, z)
        A.rbox(cx, cz, .012, w * .62, y + h * .92 - abs(k) * h * .12, y + h * .99 - abs(k) * h * .12, rot + .5, score)


def bread_board(A, x, z, y, l, w, wood, rot=0.0):
    """A bread board with a round paddle handle and its hanging hole (the handle 4 mm thinner than the board)."""
    A.rbox(x, z, l, w, y, y + .025, rot, wood)
    hx, hz = _rot(l / 2 + .05, 0, rot, x, z)
    A.lathe(hx, hz, y, [(.06, 0), (.06, .021)], 10, wood, top=True, rot=rot)


def wedge_box(A, x0, x1, y0, y1a, y1b, z0, z1, m, along='x'):
    """A box whose top slopes from y1a (at the low end of `along`) to y1b: a sloped lid, a desk slope, a ramp."""
    if along == 'x':
        V_ = [(x0, y0, z0), (x1, y0, z0), (x1, y1b, z0), (x0, y1a, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1b, z1), (x0, y1a, z1)]
    else:
        V_ = [(x0, y0, z0), (x1, y0, z0), (x1, y1a, z0), (x0, y1a, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1b, z1), (x0, y1b, z1)]
    A.poly(V_, [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (3, 7, 6, 2), (0, 4, 7, 3), (1, 2, 6, 5)], m)


def plank_top(A, x0, x1, z0, z1, y0, y1, mats, along='x', n=None, gap=.006, under=None):
    """Boards laid along `along` with hairline joints; `under` (a darker colour) is a batten layer set 6 mm below the
    top face and inset, so a joint shows a dark line instead of the room below."""
    across = (z0, z1) if along == 'x' else (x0, x1)
    w = across[1] - across[0]
    n = n or max(2, int(round(w / .2)))
    for i in range(n):
        a = across[0] + w * i / n + (gap / 2 if i else 0); b = across[0] + w * (i + 1) / n - (gap / 2 if i < n - 1 else 0)
        m = mats[i % len(mats)]
        if along == 'x':
            A.box(x0, x1, y0, y1, a, b, m)
        else:
            A.box(a, b, y0, y1, z0, z1, m)
    if under is not None:
        e = .02
        A.box(x0 + e, x1 - e, y0 - .006, y1 - .006, z0 + e, z1 - e, under, skip='b')


def turned_leg(A, x, z, y0, y1, r, m, n=8):
    """A turned leg: square-ish foot, swelling baluster, a collar under the top (the lodge's turning)."""
    h = y1 - y0
    A.lathe(x, z, y0, [(r * .8, 0), (r, .04 * h), (r * .7, .12 * h), (r * 1.15, .3 * h), (r * .75, .55 * h), (r * .7, .8 * h), (r * .95, .86 * h), (r * .9, h)], n, m, top=False)


def peg(A, x, y, z, r, m, axis=(0, 1, 0), l=.012):
    a = V(x, y, z); d = V(*axis) * l
    A.tube(tuple(a - d), tuple(a + d), r, 6, m)


# ------------------------------------------------------------------ furniture
def trestle_table(A, x0, x1, z0, z1, top, wood, wood_d, end_grain, along='x', legs='trestle'):
    """A planked table on two trestles (or four square legs): the top overhangs its trestles, the trestles stand on
    wide feet, a stretcher runs between them wedged through."""
    th = .05
    plank_top(A, x0, x1, z0, z1, top - th, top, [wood, wood_d, wood], along=along, under=wood_d)
    L, Wd = (x1 - x0, z1 - z0) if along == 'x' else (z1 - z0, x1 - x0)
    inset = min(.28, L * .14)
    for s in (0, 1):
        if along == 'x':
            tx = x0 + inset if s == 0 else x1 - inset
            if legs == 'trestle':
                A.box(tx - .045, tx + .045, .06, top - th - .02, z0 + .12, z1 - .12, wood_d)               # the trestle board
                A.box(tx - .09, tx + .09, 0, .08, z0 + .06, z1 - .06, wood_d)                              # foot
                A.box(tx - .07, tx + .07, top - th - .07, top - th, z0 + .08, z1 - .08, wood_d)            # cleat under the top
            else:
                for zz in (z0 + .1, z1 - .1):
                    oct_prism(A, tx, zz, .045, .045, 0, top - th, wood_d)
        else:
            tz = z0 + inset if s == 0 else z1 - inset
            if legs == 'trestle':
                A.box(x0 + .12, x1 - .12, .06, top - th - .02, tz - .045, tz + .045, wood_d)
                A.box(x0 + .06, x1 - .06, 0, .08, tz - .09, tz + .09, wood_d)
                A.box(x0 + .08, x1 - .08, top - th - .07, top - th, tz - .07, tz + .07, wood_d)
            else:
                for xx in (x0 + .1, x1 - .1):
                    oct_prism(A, xx, tz, .045, .045, 0, top - th, wood_d)
    # the stretcher with its wedges showing past each trestle
    my = .32
    if along == 'x':
        zc = (z0 + z1) / 2
        A.box(x0 + inset - .12, x1 - inset + .12, my - .04, my + .04, zc - .03, zc + .03, wood)
        for tx in (x0 + inset - .1, x1 - inset + .1):
            A.box(tx - .015, tx + .015, my - .06, my + .07, zc - .045, zc + .045, end_grain)
    else:
        xc = (x0 + x1) / 2
        A.box(xc - .03, xc + .03, my - .04, my + .04, z0 + inset - .12, z1 - inset + .12, wood)
        for tz in (z0 + inset - .1, z1 - inset + .1):
            A.box(xc - .045, xc + .045, my - .06, my + .07, tz - .015, tz + .015, end_grain)


def bench(A, x0, x1, z0, z1, seat, wood, wood_d, along='x'):
    """A plank bench on two slab legs with a V cut out of the foot, a rail under the seat."""
    A.box(x0, x1, seat - .045, seat, z0, z1, wood)
    L = (x1 - x0) if along == 'x' else (z1 - z0)
    ins = min(.2, L * .15)
    for s in (0, 1):
        if along == 'x':
            lx = x0 + ins if s == 0 else x1 - ins
            zc, hw = (z0 + z1) / 2, (z1 - z0) / 2 - .02
            V_ = [(lx - .025, 0, zc - hw), (lx - .025, seat - .045, zc - hw), (lx - .025, seat - .045, zc + hw), (lx - .025, 0, zc + hw), (lx - .025, .12, zc)]
            W_ = [(lx + .025, p[1], p[2]) for p in V_]
            A.poly(V_ + W_, [(0, 4, 3, 2, 1)[::-1], (5, 6, 7, 8, 9), (0, 1, 6, 5), (1, 2, 7, 6), (2, 3, 8, 7), (3, 4, 9, 8), (4, 0, 5, 9)], wood_d)
        else:
            lz = z0 + ins if s == 0 else z1 - ins
            xc, hw = (x0 + x1) / 2, (x1 - x0) / 2 - .02
            V_ = [(xc - hw, 0, lz - .025), (xc - hw, seat - .045, lz - .025), (xc + hw, seat - .045, lz - .025), (xc + hw, 0, lz - .025), (xc, .12, lz - .025)]
            W_ = [(p[0], p[1], lz + .025) for p in V_]
            A.poly(V_ + W_, [(0, 1, 2, 3, 4), (5, 9, 8, 7, 6), (0, 5, 6, 1), (1, 6, 7, 2), (2, 7, 8, 3), (3, 8, 9, 4), (4, 9, 5, 0)], wood_d)
    if along == 'x':
        zc = (z0 + z1) / 2
        A.box(x0 + ins, x1 - ins, seat - .12, seat - .045, zc - .02, zc + .02, wood_d)
    else:
        xc = (x0 + x1) / 2
        A.box(xc - .02, xc + .02, seat - .12, seat - .045, z0 + ins, z1 - ins, wood_d)


def stool(A, x, z, seat, r, wood, wood_d, rot=0.0):
    """A three-legged milking stool: a round seat, splayed legs."""
    A.lathe(x, z, seat - .045, [(r, 0), (r + .01, .02), (r, .045), (0, .045)], 10, wood, top=False)
    for k in range(3):
        a = rot + k * 2 * math.pi / 3
        A.beam((x + math.cos(a) * r * .55, seat - .045, z + math.sin(a) * r * .55), (x + math.cos(a) * (r + .05), 0, z + math.sin(a) * (r + .05)), .035, .035, wood_d)


def chest(A, x0, x1, z0, z1, h, wood, wood_d, iron, brass=None, front='s', lid=True, handles=True):
    """A planked chest: body of boards, a lid with a lip that overhangs it, iron straps over the lid and down the
    front, corner irons, a hasp and a lock plate on the front, iron drop handles at the ends. front = the side the lock
    faces ('n' 's' 'e' 'w')."""
    lh = h * .22 if lid else 0
    bh = h - lh
    # body: three boards a side
    A.box(x0 + .01, x1 - .01, 0, bh, z0 + .01, z1 - .01, wood)
    for k in range(1, 3):
        y = bh * k / 3
        A.box(x0, x1, y - .006, y + .006, z0, z1, wood_d, skip='tb')                               # board joints, proud 1 cm
    A.box(x0 - .005, x1 + .005, 0, .05, z0 - .005, z1 + .005, wood_d, skip='b')                    # plinth
    if lid:
        A.box(x0 - .02, x1 + .02, bh, bh + .03, z0 - .02, z1 + .02, wood_d)                        # lid lip
        A.box(x0, x1, bh + .03, h - .015, z0, z1, wood)
        A.box(x0 + .015, x1 - .015, h - .015, h, z0 + .015, z1 - .015, wood)                        # a bevel on the lid
    along_x = front in ('s', 'n')
    L = (x1 - x0) if along_x else (z1 - z0)
    # straps: two over the lid and down front and back
    for t in (.22, .78):
        if along_x:
            sx = x0 + (x1 - x0) * t
            A.box(sx - .028, sx + .028, h, h + .008, z0 - .025, z1 + .025, iron, skip='b')
            A.box(sx - .028, sx + .028, .05, h, z0 - .025, z0 - .012, iron, skip='s')
            A.box(sx - .028, sx + .028, .05, h, z1 + .012, z1 + .025, iron, skip='n')
        else:
            sz = z0 + (z1 - z0) * t
            A.box(x0 - .025, x1 + .025, h, h + .008, sz - .028, sz + .028, iron, skip='b')
            A.box(x0 - .025, x0 - .012, .05, h, sz - .028, sz + .028, iron, skip='e')
            A.box(x1 + .012, x1 + .025, .05, h, sz - .028, sz + .028, iron, skip='w')
    # corner irons (L plates) at the top corners
    for cx in (x0, x1):
        for cz in (z0, z1):
            A.box(cx - .03, cx + .03, bh - .1, bh, cz - .03, cz + .03, iron)
    # hasp + lock plate on the front
    fx, fz = ((x0 + x1) / 2, z1 if front == 's' else z0) if along_x else (x1 if front == 'e' else x0, (z0 + z1) / 2)
    out = {'s': (0, 1), 'n': (0, -1), 'e': (1, 0), 'w': (-1, 0)}[front]
    lp = brass or iron
    if along_x:
        d = out[1]
        A.box(fx - .06, fx + .06, bh - .16, bh - .03, fz + d * .012, fz + d * .03, lp)
        A.box(fx - .025, fx + .025, bh - .12, bh + .06, fz + d * .03, fz + d * .042, iron)
        A.box(fx - .012, fx + .012, bh - .11, bh - .07, fz + d * .042, fz + d * .05, wood_d)          # keyhole
    else:
        d = out[0]
        A.box(fx + d * .012, fx + d * .03, bh - .16, bh - .03, fz - .06, fz + .06, lp)
        A.box(fx + d * .03, fx + d * .042, bh - .12, bh + .06, fz - .025, fz + .025, iron)
        A.box(fx + d * .042, fx + d * .05, bh - .11, bh - .07, fz - .012, fz + .012, wood_d)
    if handles:
        for s in (-1, 1):
            if along_x:
                ex = x0 - .03 if s < 0 else x1 + .03
                A.box(min(ex, ex - s * .02), max(ex, ex - s * .02), bh * .6, bh * .6 + .05, (z0 + z1) / 2 - .06, (z0 + z1) / 2 + .06, iron)
                arc(A, ex + s * .01, bh * .6 - .02, (z0 + z1) / 2, .06, math.pi * 1.0, math.pi * 2.0, math.pi / 2, .018, .018, iron, segs=4)
            else:
                ez = z0 - .03 if s < 0 else z1 + .03
                A.box((x0 + x1) / 2 - .06, (x0 + x1) / 2 + .06, bh * .6, bh * .6 + .05, min(ez, ez - s * .02), max(ez, ez - s * .02), iron)
                arc(A, (x0 + x1) / 2, bh * .6 - .02, ez + s * .01, .06, math.pi * 1.0, math.pi * 2.0, 0, .018, .018, iron, segs=4)


def barrel(A, x, z, y, r, h, staves, hoop, head, n=12, rot=0.0, bung=None, open_top=False, fill=None):
    """A coopered barrel: bellied staves (every stave its own shade), two pairs of hoops, a head of three boards set
    down inside the chime, a bung on the belly. fill = a colour filling it to the chime (water, arrows' shade)."""
    prof = [(.84, 0), (.94, .12), (1.0, .32), (1.02, .5), (1.0, .68), (.94, .88), (.84, 1.0)]
    V_ = []
    for pr, t in prof:
        for i in range(n):
            a = rot + 2 * math.pi * i / n
            V_.append((x + r * pr * math.cos(a), y + h * t, z + r * pr * math.sin(a)))
    for j in range(len(prof) - 1):
        for i in range(n):
            q = [j * n + i, j * n + (i + 1) % n, (j + 1) * n + (i + 1) % n, (j + 1) * n + i]
            A.poly([V_[k] for k in q], [(0, 1, 2, 3)], staves[i % len(staves)])
    for t0, t1 in ((.07, .13), (.17, .22), (.78, .83), (.87, .93)):
        rr = r * (.9 + .1 * math.sin(math.pi * (t0 + t1) / 2)) + .012
        A.lathe(x, z, y + h * t0, [(rr, 0), (rr, h * (t1 - t0))], n, hoop, top=False, rot=rot)
    top = y + h - .025
    rin = r * .84 - .004
    if open_top and fill is not None:
        A.lathe(x, z, top - .06, [(rin, 0)], n, fill, top=True, rot=rot)
    elif not open_top:
        # the head: three boards
        for k, (a0, a1) in enumerate(((-1, -.34), (-.33, .33), (.34, 1))):
            pts = []
            for i in range(n + 1):
                a = rot + 2 * math.pi * i / n
                px, pz = rin * math.cos(a), rin * math.sin(a)
                pts.append((px, pz))
            clip = [(px, pz) for px, pz in pts if a0 * rin <= px <= a1 * rin]
            if len(clip) >= 2:
                poly = [(a0 * rin, max(-math.sqrt(max(0, rin * rin - (a0 * rin) ** 2)), -rin)), (a1 * rin, -math.sqrt(max(0, rin * rin - (a1 * rin) ** 2))),
                        (a1 * rin, math.sqrt(max(0, rin * rin - (a1 * rin) ** 2))), (a0 * rin, math.sqrt(max(0, rin * rin - (a0 * rin) ** 2)))]
                c, s = math.cos(rot), math.sin(rot)
                A.poly([(x + px * c - pz * s, top + .002 * k, z + px * s + pz * c) for px, pz in poly], [(0, 3, 2, 1)], head[k % len(head)])
    if bung is not None:
        a = rot + math.pi / n
        A.tube((x + r * 1.0 * math.cos(a), y + h * .5, z + r * 1.0 * math.sin(a)), (x + (r * 1.02 + .02) * math.cos(a), y + h * .5, z + (r * 1.02 + .02) * math.sin(a)), .028, 6, bung)


def crate(A, x0, x1, y0, y1, z0, z1, boards, batten, lid=True, gaps=True):
    """A slatted crate: boards with gaps on the sides, a battened frame on every corner, a lid of boards."""
    e = .035
    A.box(x0 + e, x1 - e, y0 + .02, y1 - .03, z0 + e, z1 - e, boards[0])                       # inner box (shows between slats)
    nb = 3
    hh = (y1 - y0 - .06) / nb
    for k in range(nb):
        ya = y0 + .03 + k * hh + (.012 if gaps else 0); yb = y0 + .03 + (k + 1) * hh - (.012 if gaps else 0)
        m = boards[(k + 1) % len(boards)]
        A.box(x0 + .012, x1 - .012, ya, yb, z0 + .012, z0 + e, m, skip='s'); A.box(x0 + .012, x1 - .012, ya, yb, z1 - e, z1 - .012, m, skip='n')
        A.box(x0 + .012, x0 + e, ya, yb, z0 + e, z1 - e, m, skip='e'); A.box(x1 - e, x1 - .012, ya, yb, z0 + e, z1 - e, m, skip='w')
    for cx in (x0, x1 - e):
        for cz in (z0, z1 - e):
            A.box(cx, cx + e, y0, y1, cz, cz + e, batten)
    for yy in (y0, y1 - .04):
        A.box(x0 + e, x1 - e, yy, yy + .04, z0, z0 + .02, batten); A.box(x0 + e, x1 - e, yy, yy + .04, z1 - .02, z1, batten)
        A.box(x0, x0 + .02, yy, yy + .04, z0 + e, z1 - e, batten); A.box(x1 - .02, x1, yy, yy + .04, z0 + e, z1 - e, batten)
    if lid:
        n = 3; w = (x1 - x0 - .01) / n
        for k in range(n):
            A.box(x0 + .005 + k * w + .004, x0 + .005 + (k + 1) * w - .004, y1 - .025, y1 + .01, z0 + .01, z1 - .01, boards[k % len(boards)])


def sack(A, x, z, y, w, h, cloth, tie, rot=0.0, slump=0.0, n=8):
    """A filled sack: a wide base that slumps, a full belly, a gathered neck tied off, its ears standing up."""
    prof = [(w * .42, 0), (w * .52, h * .06), (w * .56, h * .25), (w * .53, h * .5), (w * .42, h * .7), (w * .2, h * .84), (w * .13, h * .88)]
    V_ = []; rings = []
    for pr, t in prof:
        rw = []
        for i in range(n):
            a = rot + 2 * math.pi * i / n
            lean = slump * (t / h) ** 2 if h else 0
            rw.append(len(V_)); V_.append((x + pr * math.cos(a) * (1.12 if i % 2 == 0 else 1) + lean, y + t, z + pr * math.sin(a)))
        rings.append(rw)
    F = []
    for a_, b_ in zip(rings, rings[1:]):
        for i in range(n):
            F.append((a_[i], a_[(i + 1) % n], b_[(i + 1) % n], b_[i]))
    F.append(tuple(rings[-1][::-1]))
    A.poly(V_, F, cloth)
    tx = x + slump * (.88 ** 2)
    A.lathe(tx, z, y + h * .83, [(w * .23, 0), (w * .23, h * .05)], 6, tie, top=False, rot=rot)
    # the ears of cloth above the tie
    for k in range(3):
        a = rot + k * 2 * math.pi / 3
        A.poly([(tx + math.cos(a) * w * .1, y + h * .88, z + math.sin(a) * w * .1), (tx + math.cos(a + .9) * w * .1, y + h * .88, z + math.sin(a + .9) * w * .1),
                (tx + math.cos(a + .45) * w * .16, y + h * 1.0, z + math.sin(a + .45) * w * .16)], [(0, 1, 2)], cloth)


def lantern(A, x, z, y, frame, glass, h=.3, hang=False):
    """A square lantern: a base plate, four corner posts, horn panes glowing, a pyramid roof, a ring on top."""
    w = h * .32
    A.box(x - w - .01, x + w + .01, y, y + .025, z - w - .01, z + w + .01, frame)
    A.box(x - w + .006, x + w - .006, y + .025, y + h * .62, z - w + .006, z + w - .006, glass)
    for sx in (-1, 1):
        for sz in (-1, 1):
            A.box(x + sx * w - .012, x + sx * w + .012, y + .025, y + h * .62, z + sz * w - .012, z + sz * w + .012, frame)
    A.box(x - w - .012, x + w + .012, y + h * .62, y + h * .66, z - w - .012, z + w + .012, frame)
    A.poly([(x - w - .012, y + h * .66, z - w - .012), (x + w + .012, y + h * .66, z - w - .012), (x + w + .012, y + h * .66, z + w + .012), (x - w - .012, y + h * .66, z + w + .012), (x, y + h * .88, z)],
           [(0, 4, 1), (1, 4, 2), (2, 4, 3), (3, 4, 0)], frame)
    arc(A, x, y + h * .9, z, h * .08, 0, math.pi, 0, .012, .012, frame, segs=4)
    if hang:
        A.tube((x, y + h * .98, z), (x, y + h * 1.2, z), .008, 4, frame)


def wall_torch(A, x, z, y, out_x, out_z, iron, stick, wrap, flame=None):
    """A torch in a wall bracket: a back plate, a ring on a bent arm, the stick leaning out, its head wrapped in
    pitch-soaked rag (a flame over it when `flame`)."""
    A.box(x - .05 if out_z else x - .01 * out_x, x + .05 if out_z else x + .01 * out_x + .002, y - .12, y + .08, z - .05 if out_x else z - .01 * out_z, z + .05 if out_x else z + .01 * out_z + .002, iron)
    ox, oz = out_x * .16, out_z * .16
    A.beam((x, y - .06, z), (x + ox, y - .02, z + oz), .025, .025, iron)
    A.lathe(x + ox, z + oz, y - .04, [(.045, 0), (.045, .04)], 6, iron, top=False)
    b = (x + ox - out_x * .05, y - .3, z + oz - out_z * .05); t = (x + ox + out_x * .06, y + .16, z + oz + out_z * .06)
    A.tube(b, t, .022, 6, stick)
    d = (V(*t) - V(*b)).normalized()
    A.tube(tuple(V(*t) - d * .02), tuple(V(*t) + d * .1), .04, 6, wrap, caps=True, r2=.034)
    if flame is not None:
        c = V(*t) + d * .1
        for a in (0, math.pi / 2):
            cx, sx = math.cos(a) * .035, math.sin(a) * .035
            f = [(c.x - cx, c.y, c.z - sx), (c.x + cx, c.y, c.z + sx), (c.x, c.y + .16, c.z)]
            A.poly(f, [(0, 1, 2)], flame); A.poly(f, [(2, 1, 0)], flame)


# ------------------------------------------------------------------ arms and armour (the Warden's Keep)
def spear(A, butt, tip_len, top, shaft, head, ferrule=None):
    """A spear from butt to top: an ash shaft, an iron ferrule, a socket, a leaf blade with a raised midrib."""
    b, t = V(*butt), V(*top)
    d = (t - b).normalized()
    sock = t - d * tip_len
    A.tube(tuple(b), tuple(sock), .018, 6, shaft)
    if ferrule is not None:
        A.tube(tuple(b), tuple(b + d * .07), .026, 6, ferrule)
    A.tube(tuple(sock - d * .07), tuple(sock + d * .02), .024, 6, head, r2=.02)
    side = d.cross(V(0, 0, 1)) if abs(d.z) < .9 else d.cross(V(1, 0, 0))
    side.normalize(); up = d.cross(side).normalized()
    w = .045
    p0 = sock + d * .02; p1 = sock + d * (tip_len * .45); p2 = t
    ring_ = [p0, p1 + side * w, p2, p1 - side * w]
    mid = [p1 + up * .012, p1 - up * .012]
    A.poly([tuple(ring_[0]), tuple(ring_[1]), tuple(ring_[2]), tuple(mid[0])], [(0, 1, 3), (1, 2, 3)], head)
    A.poly([tuple(ring_[0]), tuple(ring_[3]), tuple(ring_[2]), tuple(mid[0])], [(0, 3, 1), (1, 3, 2)], head)
    A.poly([tuple(ring_[0]), tuple(ring_[1]), tuple(ring_[2]), tuple(mid[1])], [(0, 3, 1), (1, 3, 2)], head)
    A.poly([tuple(ring_[0]), tuple(ring_[3]), tuple(ring_[2]), tuple(mid[1])], [(0, 1, 3), (1, 2, 3)], head)


def halberd(A, butt, top, shaft, head):
    """A halberd: a long shaft, a spike on top, an axe blade one side and a hook the other, two langets down the shaft."""
    b, t = V(*butt), V(*top)
    d = (t - b).normalized()
    A.tube(tuple(b), tuple(t - d * .25), .019, 6, shaft)
    side = d.cross(V(0, 0, 1)) if abs(d.z) < .9 else d.cross(V(1, 0, 0))
    side.normalize(); up = d.cross(side).normalized()
    s0 = t - d * .25
    A.tube(tuple(s0 - d * .12), tuple(s0 + d * .05), .023, 6, head)
    A.poly([tuple(s0 + up * .01), tuple(s0 + side * .02 + up * .01), tuple(t), tuple(s0 - side * .02 + up * .01)], [(0, 1, 2), (0, 2, 3)], head)
    A.poly([tuple(s0 - up * .01), tuple(s0 + side * .02 - up * .01), tuple(t), tuple(s0 - side * .02 - up * .01)], [(0, 2, 1), (0, 3, 2)], head)
    a0 = s0 - d * .1; blade = [a0 + side * .02, a0 + side * .2 - d * .06, a0 + side * .23 + d * .14, a0 + side * .02 + d * .1]
    for off, flip in ((.008, False), (-.008, True)):
        pts = [tuple(p + up * off) for p in blade]
        A.poly(pts, [(0, 1, 2, 3)[::-1] if flip else (0, 1, 2, 3)], head)
    hook = [a0 - side * .02, a0 - side * .13 + d * .03, a0 - side * .02 + d * .08]
    for off, flip in ((.008, False), (-.008, True)):
        pts = [tuple(p + up * off) for p in hook]
        A.poly(pts, [(0, 1, 2)[::-1] if flip else (0, 1, 2)], head)


def round_shield(A, c, normal, r, boards, rim, boss, n=12, stripe=None):
    """A round shield of boards: face boards (alternate shades), an iron rim, a domed boss; `normal` = the way it faces."""
    c = V(*c); nv = V(*normal).normalized()
    u = nv.cross(V(0, 1, 0)); u = u if u.length > .01 else nv.cross(V(1, 0, 0)); u.normalize(); w = nv.cross(u).normalized()
    th = .025
    for k in range(3):
        a0, a1 = -1 + k * 2 / 3, -1 + (k + 1) * 2 / 3
        pts = []
        for i in range(n + 1):
            ang = 2 * math.pi * i / n
            px, py = math.cos(ang), math.sin(ang)
            if a0 - 1e-6 <= px <= a1 + 1e-6:
                pts.append((px, py))
        pts = [(a0, -math.sqrt(max(0, 1 - a0 * a0)))] + sorted(pts, key=lambda q: math.atan2(q[1], q[0])) + [(a1, math.sqrt(max(0, 1 - a1 * a1)))]
        poly = [(a0, -math.sqrt(max(0, 1 - a0 * a0))), (a1, -math.sqrt(max(0, 1 - a1 * a1))), (a1, math.sqrt(max(0, 1 - a1 * a1))), (a0, math.sqrt(max(0, 1 - a0 * a0)))]
        m = boards[k % len(boards)] if stripe is None or k != 1 else stripe
        front = [tuple(c + nv * th / 2 + (u * px + w * py) * (r - .02)) for px, py in poly]
        back = [tuple(c - nv * th / 2 + (u * px + w * py) * (r - .02)) for px, py in poly]
        A.poly(front, [(0, 1, 2, 3)], m); A.poly(back, [(3, 2, 1, 0)], boards[0])
    # the iron rim: a band round the edge, 1 cm proud of both faces
    rim_ring(A, c, nv, u, w, r - .03, r + .005, th / 2 + .01, n, rim)
    # boss: a low dome
    A.tube(tuple(c + nv * th / 2), tuple(c + nv * (th / 2 + .03)), r * .22, 8, boss, caps=False)
    A.tube(tuple(c + nv * (th / 2 + .03)), tuple(c + nv * (th / 2 + .07)), r * .22, 8, boss, r2=r * .08)


def helmet(A, x, z, y, r, iron, band=None, rot=0.0):
    """A nasal helm: a pointed dome on a brow band, a nasal bar down the front (facing rot)."""
    A.lathe(x, z, y, [(r, 0), (r * 1.02, r * .12), (r * .98, r * .35), (r * .82, r * .7), (r * .45, r * 1.0), (0, r * 1.18)], 10, iron, top=False, rot=rot)
    A.lathe(x, z, y, [(r + .008, 0), (r + .008, r * .16)], 10, band or iron, top=False, rot=rot)
    nx, nz = _rot(r + .01, 0, rot, x, z)
    A.box(nx - .015, nx + .015, y - r * .45, y + r * .2, nz - .015, nz + .015, band or iron)


def sword(A, a, b, blade, guard, grip, pommel):
    """A straight sword lying from pommel a to point b: pommel, wrapped grip, cross guard, a fullered blade."""
    a, b = V(*a), V(*b)
    d = (b - a).normalized(); L = (b - a).length
    side = d.cross(V(0, 1, 0)); side = side if side.length > .01 else d.cross(V(1, 0, 0)); side.normalize(); up = d.cross(side).normalized()
    A.tube(tuple(a - d * .02), tuple(a + d * .03), .03, 6, pommel)
    A.tube(tuple(a + d * .03), tuple(a + d * .15), .016, 6, grip)
    g = a + d * .16
    A.beam(tuple(g - side * .1), tuple(g + side * .1), .03, .025, guard)
    s0 = g + d * .015; tip = b; w = .03
    pts = [s0 + side * w, tip - d * .08 + side * w * .9, tip, tip - d * .08 - side * w * .9, s0 - side * w]
    for off, flip in ((.006, False), (-.006, True)):
        P = [tuple(p + up * off) for p in pts]
        A.poly(P, [(0, 1, 2, 3, 4)[::-1] if not flip else (0, 1, 2, 3, 4)], blade)
    for i in range(len(pts)):
        p, q = pts[i], pts[(i + 1) % len(pts)]
        A.poly([tuple(p + up * .006), tuple(q + up * .006), tuple(q - up * .006), tuple(p - up * .006)], [(0, 1, 2, 3)], blade)


def bedroll(A, a, b, r, cloth, strap):
    """A blanket rolled and strapped: a short cylinder, the spiral's end showing, two leather straps."""
    a, b = V(*a), V(*b)
    A.tube(tuple(a), tuple(b), r, 8, cloth, caps=True)
    d = (b - a)
    for t in (.22, .78):
        p = a + d * t
        A.tube(tuple(p - d.normalized() * .02), tuple(p + d.normalized() * .02), r + .008, 8, strap, caps=False)


def folded_cloth(A, x0, x1, z0, z1, y, layers, mats, fold_axis='x'):
    """A folded blanket: layers of cloth, the rounded folded edge on one side."""
    th = .03
    for k in range(layers):
        yy = y + k * th
        m = mats[k % len(mats)]
        A.box(x0 + .004 * k, x1 - .004 * k, yy + .002, yy + th - .002, z0 + .004 * k, z1 - .004 * k, m)
    rr = layers * th / 2 * .8        # the rounded fold, kept inside the stack's top and bottom planes
    if fold_axis == 'x':
        A.tube((x0 + .004, y + layers * th / 2, z1), (x1 - .004, y + layers * th / 2, z1), rr, 6, mats[0], caps=False)
    else:
        A.tube((x1, y + layers * th / 2, z0 + .004), (x1, y + layers * th / 2, z1 - .004), rr, 6, mats[0], caps=False)


def dice(A, x, z, y, s, bone, pip, rot=0.0):
    """A bone die with pips on its top (a die IS a cube; the pips say so)."""
    A.rbox(x, z, s, s, y, y + s, rot, bone)
    for dx, dz in ((-.25, -.25), (.25, .25), (0, 0)):
        px, pz = _rot(dx * s, dz * s, rot, x, z)
        A.box(px - s * .08, px + s * .08, y + s + .004, y + s + .005, pz - s * .08, pz + s * .08, pip, skip='b')


def bed(A, x0, x1, z0, z1, floor, wood, wood_d, mattress, sheet, blanket, pillow, head='n', post_h=.95, foot_h=.6, patch=None):
    """A plank bed with corner posts, a panelled headboard, a low footboard, a straw-ticking mattress, a sheet turned
    down over the blanket, a pillow; head = the end against the wall ('n' 's' 'e' 'w')."""
    F = floor
    along_z = head in ('n', 's')
    hz = z0 if head == 'n' else z1
    fz = z1 if head == 'n' else z0
    hx = x0 if head == 'w' else x1
    fx = x1 if head == 'w' else x0
    posts = []
    if along_z:
        for x in (x0 + .05, x1 - .05):
            posts.append((x, hz + (.05 if head == 'n' else -.05), post_h)); posts.append((x, fz + (-.05 if head == 'n' else .05), foot_h))
    else:
        for z in (z0 + .05, z1 - .05):
            posts.append((hx + (.05 if head == 'w' else -.05), z, post_h)); posts.append((fx + (-.05 if head == 'w' else .05), z, foot_h))
    for px, pz, ph in posts:
        oct_prism(A, px, pz, .05, .05, F, F + ph, wood_d)
        A.lathe(px, pz, F + ph, [(.05, 0), (.03, .03), (.045, .07), (0, .1)], 8, wood)
    rail_y0, rail_y1 = F + .22, F + .34
    if along_z:
        A.box(x0 + .02, x0 + .08, rail_y0, rail_y1, z0 + .1, z1 - .1, wood); A.box(x1 - .08, x1 - .02, rail_y0, rail_y1, z0 + .1, z1 - .1, wood)
        hz0, hz1 = (hz + .02, hz + .07) if head == 'n' else (hz - .07, hz - .02)
        A.box(x0 + .1, x1 - .1, F + .3, F + post_h - .1, hz0, hz1, wood)
        for k in range(3):
            w = (x1 - x0 - .3) / 3
            xa = x0 + .15 + k * w
            A.box(xa + .03, xa + w - .03, F + .42, F + post_h - .2, (hz1 + .003) if head == 'n' else (hz0 - .006), (hz1 + .006) if head == 'n' else (hz0 - .003), wood_d)
        fz0, fz1 = (fz - .07, fz - .02) if head == 'n' else (fz + .02, fz + .07)
        A.box(x0 + .1, x1 - .1, F + .3, F + foot_h - .06, fz0, fz1, wood)
        mz0, mz1 = (z0 + .09, z1 - .09)
        A.box(x0 + .09, x1 - .09, rail_y1 - .02, rail_y1 + .16, mz0, mz1, mattress)
        top = rail_y1 + .16
        # blanket over the lower two thirds, a sheet turned down over it, a pillow at the head
        L = mz1 - mz0
        bz0, bz1 = (mz0 + L * .3, mz1) if head == 'n' else (mz0, mz1 - L * .3)
        A.box(x0 + .07, x1 - .07, top, top + .035, bz0, bz1, blanket)
        for sx in (x0 + .055, x1 - .065):
            A.box(sx, sx + .01, top - .1, top + .03, bz0 + .005, bz1 - .005, blanket)                                    # the blanket hangs over the sides
        sz0, sz1 = (bz0 - .01, bz0 + .12) if head == 'n' else (bz1 - .12, bz1 + .01)
        A.box(x0 + .07, x1 - .07, top + .035, top + .06, sz0, sz1, sheet)
        pz0, pz1 = (mz0 + .05, mz0 + .38) if head == 'n' else (mz1 - .38, mz1 - .05)
        ellipsoid(A, (x0 + x1) / 2, top + .05, (pz0 + pz1) / 2, (x1 - x0) / 2 - .16, .07, (pz1 - pz0) / 2, pillow, seg=8, rings=4, flat=top + .004)
        if patch:
            n = 3
            for i in range(n):
                for j in range(4):
                    w = (x1 - x0 - .2) / n; d = (bz1 - bz0 - (.12 if head == 'n' else 0)) / 4
                    xa = x0 + .1 + i * w; za = (bz0 + .12 if head == 'n' else bz0) + j * d
                    A.box(xa + .004, xa + w - .004, top + .035, top + .038, za + .004, za + d - .004, patch[(i * 2 + j) % len(patch)], skip='b')
    else:
        A.box(x0 + .1, x1 - .1, rail_y0, rail_y1, z0 + .02, z0 + .08, wood); A.box(x0 + .1, x1 - .1, rail_y0, rail_y1, z1 - .08, z1 - .02, wood)
        hx0, hx1 = (hx + .02, hx + .07) if head == 'w' else (hx - .07, hx - .02)
        A.box(hx0, hx1, F + .3, F + post_h - .1, z0 + .1, z1 - .1, wood)
        fx0, fx1 = (fx - .07, fx - .02) if head == 'w' else (fx + .02, fx + .07)
        A.box(fx0, fx1, F + .3, F + foot_h - .06, z0 + .1, z1 - .1, wood)
        mx0, mx1 = x0 + .09, x1 - .09
        A.box(mx0, mx1, rail_y1 - .02, rail_y1 + .16, z0 + .09, z1 - .09, mattress)
        top = rail_y1 + .16
        L = mx1 - mx0
        bx0, bx1 = (mx0 + L * .3, mx1) if head == 'w' else (mx0, mx1 - L * .3)
        A.box(bx0, bx1, top, top + .035, z0 + .07, z1 - .07, blanket)
        for sz in (z0 + .055, z1 - .065):
            A.box(bx0 + .005, bx1 - .005, top - .1, top + .03, sz, sz + .01, blanket)
        sx0, sx1 = (bx0 - .01, bx0 + .12) if head == 'w' else (bx1 - .12, bx1 + .01)
        A.box(sx0, sx1, top + .035, top + .06, z0 + .07, z1 - .07, sheet)
        px0, px1 = (mx0 + .05, mx0 + .38) if head == 'w' else (mx1 - .38, mx1 - .05)
        ellipsoid(A, (px0 + px1) / 2, top + .05, (z0 + z1) / 2, (px1 - px0) / 2, .07, (z1 - z0) / 2 - .16, pillow, seg=8, rings=4, flat=top + .004)


# ------------------------------------------------------------------ writing and reckoning
def open_book(A, x, z, y, w, d, cover, page, ink=None, rot=0.0, lines=4):
    """A book lying open: a cover a little larger than the pages, two page blocks bowed up to the spine."""
    c, s = math.cos(rot), math.sin(rot)
    P = lambda a, b, yy: (x + a * c - b * s, yy, z + a * s + b * c)
    A.poly([P(-w / 2 - .01, -d / 2 - .01, y + .004), P(w / 2 + .01, -d / 2 - .01, y + .004), P(w / 2 + .01, d / 2 + .01, y + .01), P(-w / 2 - .01, d / 2 + .01, y + .01)], [(0, 1, 2, 3)[::-1]], cover)
    for side in (-1, 1):
        x0, x1 = (0, side * w / 2)
        pts = [P(x0, -d / 2, y + .03), P(x1 * .5, -d / 2, y + .026), P(x1, -d / 2, y + .014), P(x1, d / 2, y + .02), P(x1 * .5, d / 2, y + .032), P(x0, d / 2, y + .036)]
        f = [(0, 1, 4, 5), (1, 2, 3, 4)] if side > 0 else [(5, 4, 1, 0), (4, 3, 2, 1)]
        A.poly(pts, f, page)
        # page edge thickness
        A.poly([P(x1, -d / 2, y + .006), P(x1, d / 2, y + .01), P(x1, d / 2, y + .02), P(x1, -d / 2, y + .014)], [(0, 1, 2, 3) if side > 0 else (3, 2, 1, 0)], page)
        if ink is not None:
            for li in range(lines):
                bb = -d / 2 + .03 + li * (d - .06) / lines
                xa, xb = (x1 * .15, x1 * .85)
                A.poly([P(xa, bb, y + .03), P(xb, bb, y + .022), P(xb, bb + .008, y + .022), P(xa, bb + .008, y + .03)], [(0, 1, 2, 3) if side > 0 else (3, 2, 1, 0)], ink)


def closed_book(A, x, z, y, w, d, t, cover, page, rot=0.0, standing=False):
    """A closed book: cover boards a little larger than the page block, the page block's edge showing."""
    if standing:
        A.rbox(x, z, t, d, y, y + w, rot, cover)
        return
    A.rbox(x, z, w, d, y, y + .006, rot, cover)
    A.rbox(x + .004 * math.cos(rot), z - .004 * math.sin(rot), w - .015, d - .012, y + .006, y + t - .006, rot, page)
    A.rbox(x, z, w, d, y + t - .006, y + t, rot, cover)
    sx, sz = _rot(-w / 2 + .004, 0, rot, x, z)
    A.rbox(sx, sz, .012, d, y + .006, y + t - .006, rot, cover)


def scroll(A, a, b, r, paper, rod=None, ribbon=None):
    """A rolled scroll: paper rolled round a rod whose knobs show at the ends, a ribbon tied round."""
    a, b = V(*a), V(*b)
    d = (b - a).normalized()
    A.tube(tuple(a), tuple(b), r, 8, paper, caps=True)
    if rod is not None:
        A.tube(tuple(a - d * .025), tuple(a), r * .45, 6, rod); A.tube(tuple(b), tuple(b + d * .025), r * .45, 6, rod)
    if ribbon is not None:
        m = (a + b) / 2
        A.tube(tuple(m - d * .012), tuple(m + d * .012), r + .004, 8, ribbon, caps=False)


def quill(A, x, z, y, rot, feather, shaft):
    """A goose quill: the vane as two blades either side of the shaft, the nib down."""
    a = V(x, y, z); d = V(math.cos(rot) * .7, .7, math.sin(rot) * .7).normalized()
    t = a + d * .24
    A.tube(tuple(a), tuple(t), .005, 4, shaft)
    side = d.cross(V(0, 1, 0)).normalized()
    for sgn in (1, -1):
        v0 = a + d * .07; v1 = a + d * .15 + side * sgn * .028; v2 = t
        A.poly([tuple(v0), tuple(v1), tuple(v2)], [(0, 1, 2)], feather)


def inkwell(A, x, z, y, glass, ink):
    A.lathe(x, z, y, [(.035, 0), (.04, .02), (.036, .045), (.018, .055), (.02, .065)], 8, glass, top=True, top_m=ink)


def coin_stack(A, x, z, y, r, n, gold, rng, lean=.004):
    """A stack of coins, each a little off true."""
    for k in range(n):
        ox, oz = rng.uniform(-lean, lean), rng.uniform(-lean, lean)
        A.lathe(x + ox, z + oz, y + k * .012, [(r, 0), (r, .011)], 8, gold, top=True)


def purse(A, x, z, y, r, leather, cord, rot=0.0):
    """A leather coin purse, drawn shut with a cord."""
    A.lathe(x, z, y, [(r * .6, 0), (r, r * .35), (r * .9, r * .8), (r * .35, r * 1.15), (r * .45, r * 1.35), (r * .3, r * 1.4)], 8, leather, top=True, rot=rot)
    A.lathe(x, z, y + r * 1.1, [(r * .38, 0), (r * .38, r * .08)], 8, cord, top=False)


def scales(A, x, z, y, brass, wood, rot=0.0):
    """A balance: a turned base, a pillar, a beam with two hanging pans on cords."""
    A.lathe(x, z, y, [(.07, 0), (.07, .02), (.04, .035), (.015, .05), (.012, .3), (.02, .31), (0, .33)], 8, wood if wood else brass, top=False)
    ax, az = _rot(.16, 0, rot, x, z); bx, bz = _rot(-.16, 0, rot, x, z)
    A.beam((bx, y + .31, bz), (ax, y + .31, az), .012, .012, brass)
    for px, pz in ((ax, az), (bx, bz)):
        for k in range(3):
            a = k * 2 * math.pi / 3
            A.beam((px, y + .31, pz), (px + math.cos(a) * .05, y + .15, pz + math.sin(a) * .05), .004, .004, brass)
        A.lathe(px, pz, y + .13, [(.02, 0), (.06, .02), (.065, .025)], 8, brass, top=True)


def counting_cloth(A, x0, x1, z0, z1, y, cloth, line, counters, rng, rows=4, cols=6):
    """A reckoning cloth ruled in columns (the banker's counting board), counters laid on it."""
    A.box(x0, x1, y, y + .004, z0, z1, cloth, skip='b')
    for i in range(1, cols):
        xx = x0 + (x1 - x0) * i / cols
        A.box(xx - .004, xx + .004, y + .004, y + .006, z0 + .02, z1 - .02, line, skip='b')
    for j in range(1, rows):
        zz = z0 + (z1 - z0) * j / rows
        A.box(x0 + .02, x1 - .02, y + .004, y + .006, zz - .003, zz + .003, line, skip='b')
    for k in range(9):
        cx = x0 + (x1 - x0) * (rng.randrange(cols) + .5) / cols + rng.uniform(-.02, .02)
        cz = z0 + (z1 - z0) * (rng.randrange(rows) + .5) / rows + rng.uniform(-.02, .02)
        A.lathe(cx, cz, y + .006, [(.018, 0), (.018, .008)], 6, counters[k % len(counters)], top=True)


def strongbox(A, x0, x1, z0, z1, h, iron, iron_d, brass, front='s'):
    """An iron-bound strongbox: a squat body wrapped in iron bands, studded, a heavy lock, a domed lid."""
    bh = h * .7
    A.box(x0, x1, 0, bh, z0, z1, iron_d)
    along_x = front in ('s', 'n')
    # domed lid: a half cylinder along the long side
    n = 6
    if along_x:
        r = (z1 - z0) / 2; zc = (z0 + z1) / 2; k = (h - bh) / r
        V_ = []
        for i in range(n + 1):
            a = math.pi * i / n
            V_.append((x0, bh + math.sin(a) * r * k, zc + math.cos(a) * r))
        V2 = [(x1, p[1], p[2]) for p in V_]
        A.poly(V_ + V2, [(i, i + 1, n + 1 + i + 1, n + 1 + i) for i in range(n)], iron)
        A.poly(V_, [tuple(range(n + 1))[::-1]], iron); A.poly(V2, [tuple(range(n + 1))], iron)
        for t in (.12, .5, .88):
            xx = x0 + (x1 - x0) * t
            A.box(xx - .02, xx + .02, 0, bh + .005, z0 - .01, z1 + .01, iron, skip='b')
            for i in range(n):
                a0, a1 = math.pi * i / n, math.pi * (i + 1) / n
                A.poly([(xx - .02, bh + math.sin(a0) * (r + .01) * k, zc + math.cos(a0) * (r + .01)), (xx + .02, bh + math.sin(a0) * (r + .01) * k, zc + math.cos(a0) * (r + .01)),
                        (xx + .02, bh + math.sin(a1) * (r + .01) * k, zc + math.cos(a1) * (r + .01)), (xx - .02, bh + math.sin(a1) * (r + .01) * k, zc + math.cos(a1) * (r + .01))], [(0, 1, 2, 3)], iron)
        fz = z1 if front == 's' else z0; d = 1 if front == 's' else -1
        A.box((x0 + x1) / 2 - .06, (x0 + x1) / 2 + .06, bh * .35, bh * .9, fz, fz + d * .02, brass)
        A.box((x0 + x1) / 2 - .012, (x0 + x1) / 2 + .012, bh * .5, bh * .7, fz + d * .02, fz + d * .025, iron_d)
    else:
        r = (x1 - x0) / 2; xc = (x0 + x1) / 2; k = (h - bh) / r
        V_ = []
        for i in range(n + 1):
            a = math.pi * i / n
            V_.append((xc + math.cos(a) * r, bh + math.sin(a) * r * k, z0))
        V2 = [(p[0], p[1], z1) for p in V_]
        A.poly(V_ + V2, [(i, n + 1 + i, n + 1 + i + 1, i + 1) for i in range(n)], iron)
        A.poly(V_, [tuple(range(n + 1))], iron); A.poly(V2, [tuple(range(n + 1))[::-1]], iron)
        for t in (.12, .5, .88):
            zz = z0 + (z1 - z0) * t
            A.box(x0 - .01, x1 + .01, 0, bh + .005, zz - .02, zz + .02, iron, skip='b')
        fx = x1 if front == 'e' else x0; d = 1 if front == 'e' else -1
        A.box(fx, fx + d * .02, bh * .35, bh * .9, (z0 + z1) / 2 - .06, (z0 + z1) / 2 + .06, brass)
        A.box(fx + d * .02, fx + d * .025, bh * .5, bh * .7, (z0 + z1) / 2 - .012, (z0 + z1) / 2 + .012, iron_d)


# ------------------------------------------------------------------ tools of the trades
def pick(A, x, z, y, rot, haft, head, lean=None, length=.9):
    """A pickaxe lying on its side (or leaning: lean = (top point)): an ash haft, a double-pointed iron head."""
    if lean is None:
        a = V(x, y + .03, z); d = V(math.cos(rot), 0, math.sin(rot))
    else:
        a = V(x, y, z); d = (V(*lean) - a).normalized()
    t = a + d * length
    A.tube(tuple(a), tuple(t), .02, 6, haft)
    side = d.cross(V(0, 1, 0)) if abs(d.y) < .9 else d.cross(V(1, 0, 0))
    side.normalize()
    if lean is None:
        side = V(0, 1, 0).cross(d).normalized()
    up = side.cross(d).normalized() if lean is not None else V(0, 1, 0)
    c = t - d * .04
    for s in (1, -1):
        p0 = c + side * s * .03; p1 = c + side * s * .2 - d * .05
        A.beam(tuple(p0 - side * s * .03), tuple(p1), .035, .03, head)
    A.box(c.x - .03, c.x + .03, c.y - .03, c.y + .03, c.z - .03, c.z + .03, head)


def sledge(A, butt, top, haft, head):
    """A sledgehammer: a long haft, a heavy square head with chamfered faces."""
    b, t = V(*butt), V(*top)
    d = (t - b).normalized()
    A.tube(tuple(b), tuple(t), .02, 6, haft)
    side = d.cross(V(0, 1, 0)) if abs(d.y) < .95 else d.cross(V(1, 0, 0))
    side.normalize()
    A.tube(tuple(t - side * .12), tuple(t + side * .12), .055, 8, head)


def mallet(A, x, z, y, rot, wood, wood_d, lying=True):
    """A stonemason's round mallet: a turned beech head like a bell on a short handle."""
    if lying:
        a = V(x, y + .045, z); d = V(math.cos(rot), 0, math.sin(rot))
        A.tube(tuple(a), tuple(a + d * .22), .014, 6, wood_d)
        h0 = a + d * .22
        A.tube(tuple(h0 - d * .01), tuple(h0 + d * .12), .045, 8, wood, r2=.055)
    else:
        A.lathe(x, z, y, [(.05, 0), (.058, .1), (.045, .12), (.014, .13), (.014, .34), (.02, .35), (0, .36)], 8, wood, top=False)


def wedges(A, x, z, y, rot, iron, n=3):
    """Quarry wedges (plugs and feathers) in a row: tapered iron wedges with a mushroomed head."""
    for k in range(n):
        px, pz = _rot(k * .06, 0, rot, x, z)
        A.lathe(px, pz, y, [(.004, 0), (.016, .1), (.022, .11), (.02, .125)], 4, iron, top=True, rot=rot + math.pi / 4)


def chisel(A, x, z, y, rot, iron, wood=None):
    a = V(x, y + .012, z); d = V(math.cos(rot), 0, math.sin(rot))
    A.tube(tuple(a), tuple(a + d * .16), .011, 6, wood or iron)
    A.beam(tuple(a + d * .16), tuple(a + d * .26), .022, .006, iron)


def shovel(A, butt, blade_end, haft, blade):
    """A long-handled shovel: a D-grip, the haft, a square-mouthed iron blade."""
    b, t = V(*butt), V(*blade_end)
    d = (t - b).normalized(); L = (t - b).length
    A.tube(tuple(b), tuple(t - d * .28), .018, 6, haft)
    side = d.cross(V(0, 1, 0)) if abs(d.y) < .95 else d.cross(V(1, 0, 0))
    side.normalize(); up = d.cross(side).normalized()
    A.beam(tuple(b - side * .06), tuple(b + side * .06), .02, .02, haft)                          # the T grip
    s0 = t - d * .3
    pts = [s0 + side * .07, t + side * .1, t - side * .1, s0 - side * .07]
    for off, flip in ((.004, False), (-.004, True)):
        P = [tuple(p + up * off) for p in pts]
        A.poly(P, [(0, 1, 2, 3)[::-1] if flip else (0, 1, 2, 3)], blade)


def crowbar(A, a, b, iron):
    a, b = V(*a), V(*b)
    d = (b - a).normalized()
    A.tube(tuple(a), tuple(b), .014, 6, iron)
    side = d.cross(V(0, 1, 0)) if abs(d.y) < .95 else d.cross(V(1, 0, 0))
    A.beam(tuple(b), tuple(b + d * .03 + side.normalized() * .07), .02, .012, iron)


def hammer(A, x, z, y, rot, haft, head):
    """A cross-peen smith's hammer lying on its side."""
    a = V(x, y + .02, z); d = V(math.cos(rot), 0, math.sin(rot)); side = V(-d.z, 0, d.x)
    A.tube(tuple(a), tuple(a + d * .3), .014, 6, haft)
    h = a + d * .3
    A.beam(tuple(h - side * .07), tuple(h + side * .05), .042, .042, head)
    A.beam(tuple(h + side * .05), tuple(h + side * .09), .042, .014, head)


def tongs(A, x, z, y, rot, iron):
    """Smith's tongs lying open: two long reins crossing at the rivet, short jaws."""
    d = V(math.cos(rot), 0, math.sin(rot)); side = V(-d.z, 0, d.x)
    c = V(x, y + .012, z)
    for s in (1, -1):
        A.beam(tuple(c - d * .3 + side * s * .04), tuple(c), .014, .01, iron)
        A.beam(tuple(c), tuple(c + d * .1 - side * s * .015), .016, .012, iron)
    A.tube(tuple(c - V(0, .01, 0)), tuple(c + V(0, .01, 0)), .012, 6, iron)


def anvil(A, x, z, y, rot, iron, iron_l=None, scale=1.0):
    """A horned anvil: a spread foot, a waisted body, the face, the horn tapering to a point on one end and a square
    heel with a hardy hole on the other."""
    s = scale; c, sn = math.cos(rot), math.sin(rot)
    P = lambda a, yy, b: (x + a * c - b * sn, y + yy, z + a * sn + b * c)
    def blk(a0, a1, y0, y1, b0, b1, m):
        V_ = [P(a0, y0, b0), P(a1, y0, b0), P(a1, y1, b0), P(a0, y1, b0), P(a0, y0, b1), P(a1, y0, b1), P(a1, y1, b1), P(a0, y1, b1)]
        A.poly(V_, [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (3, 7, 6, 2), (0, 4, 7, 3), (1, 2, 6, 5)], m)
    # foot with four spread toes
    blk(-.16 * s, .16 * s, 0, .05 * s, -.1 * s, .1 * s, iron)
    V_ = [P(-.12 * s, .05 * s, -.08 * s), P(.12 * s, .05 * s, -.08 * s), P(.12 * s, .05 * s, .08 * s), P(-.12 * s, .05 * s, .08 * s),
          P(-.07 * s, .17 * s, -.05 * s), P(.07 * s, .17 * s, -.05 * s), P(.07 * s, .17 * s, .05 * s), P(-.07 * s, .17 * s, .05 * s)]
    A.poly(V_, [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)], iron)
    V_ = [P(-.07 * s, .17 * s, -.05 * s), P(.07 * s, .17 * s, -.05 * s), P(.07 * s, .17 * s, .05 * s), P(-.07 * s, .17 * s, .05 * s),
          P(-.16 * s, .26 * s, -.075 * s), P(.14 * s, .26 * s, -.075 * s), P(.14 * s, .26 * s, .075 * s), P(-.16 * s, .26 * s, .075 * s)]
    A.poly(V_, [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)], iron)
    blk(-.16 * s, .14 * s, .26 * s, .3 * s, -.075 * s, .075 * s, iron_l or iron)                        # the face
    # horn: a cone from the face's end to a point
    hb = .14 * s
    V_ = [P(hb, .21 * s, -.06 * s), P(hb, .21 * s, .06 * s), P(hb, .3 * s, .06 * s), P(hb, .3 * s, -.06 * s), P(hb + .2 * s, .29 * s, 0)]
    A.poly(V_, [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4)], iron)
    # heel with a hardy hole
    blk(-.24 * s, -.16 * s, .24 * s, .3 * s, -.05 * s, .05 * s, iron)
    blk(-.21 * s, -.19 * s, .3 * s, .302 * s, -.015 * s, .015 * s, iron_l or iron)


def stump(A, x, z, y0, y1, r, bark, end, n=8, rng=None):
    """A chopping stump: bark round a slightly flared base, the end grain on top."""
    rng = rng or random.Random(int(x * 97 + z * 13))
    prof = [(r * 1.18, 0), (r * 1.05, (y1 - y0) * .15), (r, (y1 - y0) * .5), (r * .98, y1 - y0)]
    A.lathe(x, z, y0, prof, n, bark, top=True, top_m=end, rot=rng.random())


def rope_coil(A, x, z, y, r, turns, rope, t=.03, n=10):
    """A coil of rope: stacked rings, each a flattened tube of rope."""
    for k in range(turns):
        rr = r - (k % 2) * t * .6
        yy = y + t / 2 + k * t * .9
        pts = [(x + rr * math.cos(2 * math.pi * i / n), yy, z + rr * math.sin(2 * math.pi * i / n)) for i in range(n)]
        for i in range(n):
            A.beam(pts[i], pts[(i + 1) % n], t, t * .9, rope)


def ore_heap(A, x, z, y, r, h, mats, rng, n=6):
    """A heap of broken ore: faceted lumps piled in a cone."""
    for k in range(n):
        a = rng.random() * 2 * math.pi; d = rng.uniform(0, r * .6)
        lr = rng.uniform(r * .28, r * .42)
        ly = y + (h - lr) * (1 - d / r) * .8
        ellipsoid(A, x + math.cos(a) * d, ly + lr * .5, z + math.sin(a) * d, lr, lr * .7, lr * .85, mats[k % len(mats)], seg=5, rings=3, rot=rng.random() * 3, flat=y)


def lump(A, x, z, y, r, m, rng):
    ellipsoid(A, x, y + r * .55, z, r, r * .7, r * .85, m, seg=5, rings=3, rot=rng.random() * 3, flat=y)


def kibble(A, x, z, y, h, staves, hoop, ore_mats, rng, bail=None):
    """An ore kibble: a stout coopered bucket with three hoops, an iron bail, heaped with ore."""
    r0, r1 = .42 * h, .5 * h
    A.lathe(x, z, y, [(r0, 0), (r1, h)], 10, staves[0], top=True, top_m=staves[-1])
    for t in (.12, .5, .88):
        rr = r0 + (r1 - r0) * t + .01
        A.lathe(x, z, y + t * h - .02, [(rr, 0), (rr, .04)], 10, hoop, top=False)
    for k in range(4):
        a = k * math.pi / 2 + .4; d = r1 * .4
        lump(A, x + math.cos(a) * d, z + math.sin(a) * d, y + h - .02, r1 * .35, ore_mats[k % len(ore_mats)], rng)
    arc(A, x, y + h, z, r1 + .015, 0, math.pi, 0, .025, .025, bail or hoop, segs=6)


def bucket_hoop(A, x, z, y, h, wood, hoop, handle, fill=None):
    """A coopered bucket with two hoops, a bail handle, optionally filled."""
    r0, r1 = .36 * h, .44 * h
    A.lathe(x, z, y, [(r0, 0), (r1, h)], 10, wood, top=fill is None, top_m=wood)
    if fill is not None:
        A.lathe(x, z, y + h * .8, [(r1 * .96, 0)], 10, fill, top=True)
    for t in (.2, .8):
        rr = r0 + (r1 - r0) * t + .008
        A.lathe(x, z, y + t * h - .015, [(rr, 0), (rr, .03)], 10, hoop, top=False)
    arc(A, x, y + h, z, r1, 0, math.pi, 0, .015, .015, handle, segs=6)

