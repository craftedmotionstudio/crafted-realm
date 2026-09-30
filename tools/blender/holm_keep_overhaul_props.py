"""Warden's Keep overhaul (owner review 2026-09-29): "a very expensive castle with a lot of things". The keep's own
furnishings, designed one by one in the 2004 low-poly manner (few big faces, a silhouette that names the thing, flat
colours or the old-school kit textures, never glossy): suits of armour on stands and hung on the walls, heater shields
and banners with the Warden's arms (a gold tower on red), candelabras, a high table with a great chair, a four-poster
bed, a wardrobe, bunks, cannons on their truck carriages with shot, rugs, a keg on its cradle, the portcullis and its
windlass, a brazier. Plan coordinates (x east, y up, z south), keep-local; every function draws into a props Part.
Oriented pieces take a yaw: 0 faces +z (south), pi/2 faces +x (east). Original designs only."""
import math
from mathutils import Vector
import holm_trade_props as T
import holm_purposeful_props as PP


# ------------------------------------------------------------------ frames
def pt(x, z, yaw, lx, lz):
    """Local (lx right, lz forward) -> plan (x, z) for a piece at (x, z) facing yaw (the same turn as Acc.rbox)."""
    c, s = math.cos(yaw), math.sin(yaw)
    return (x + lx * c + lz * s, z - lx * s + lz * c)


def ob(A, x, z, yaw, lx, lz, w, d, y0, y1, m):
    """An oriented box: w wide (local x), d deep (local z), centred at local (lx, lz)."""
    cx, cz = pt(x, z, yaw, lx, lz)
    A.rbox(cx, cz, w, d, y0, y1, yaw, m)


def P3(x, z, yaw, lx, y, lz):
    px, pz = pt(x, z, yaw, lx, lz)
    return (px, y, pz)


def hlathe(A, a, d, prof, n, m, cap0=True, cap1=True, mats=None):
    """A turned solid along the axis d from point a: prof = [(radius, distance along d), ...]; mats: per-band material."""
    a = Vector(a); d = Vector(d).normalized()
    u = d.cross(Vector((0, 1, 0)))
    if u.length < .01:
        u = d.cross(Vector((1, 0, 0)))
    u.normalize(); w = d.cross(u).normalized()
    rings = []
    V = []
    for r, t in prof:
        c = a + d * t
        rings.append(list(range(len(V), len(V) + n)))
        V += [tuple(c + (u * math.cos(2 * math.pi * i / n) + w * math.sin(2 * math.pi * i / n)) * r) for i in range(n)]
    for j in range(len(prof) - 1):
        F = [(rings[j][i], rings[j][(i + 1) % n], rings[j + 1][(i + 1) % n], rings[j + 1][i]) for i in range(n)]
        A.poly(V, F, (mats[j] if mats else m))
        V = V  # the same vertex list is re-sent per band (Acc copies), cheap at these sizes
    if cap0:
        A.poly(V, [tuple(reversed(rings[0]))], m)
    if cap1:
        A.poly(V, [tuple(rings[-1])], m)


# ------------------------------------------------------------------ arms and armour
def armour_stand(A, x, z, y, yaw, M, plume=True, tabard=True):
    """A full harness on its stand: an oak plinth, sabatons, greaves and knee cops, cuisses, a skirt of lames, a ridged
    cuirass under a red tabard with the gold tower, a gorget, domed pauldrons, arms with elbow cops and gauntlets, a
    great helm with a visor slit and a red plume. About 1.9 m on its plinth."""
    st, sd, ir, lea, wd = M['steel'], M['steel_d'], M['iron'], M['leather'], M['oak_d']
    ob(A, x, z, yaw, 0, 0, .56, .5, y, y + .07, wd)
    ob(A, x, z, yaw, 0, 0, .48, .42, y + .07, y + .1, M['oak'])
    b = y + .1
    for s in (-1, 1):
        ob(A, x, z, yaw, s * .1, .05, .1, .26, b, b + .07, sd)                   # sabaton
        ob(A, x, z, yaw, s * .1, .15, .06, .08, b, b + .05, sd)                  # its pointed toe
        px, pz = pt(x, z, yaw, s * .1, 0)
        A.lathe(px, pz, b + .07, [(.06, 0), (.072, .38)], 6, st, top=False)                     # greave
        A.lathe(px, pz, b + .45, [(.085, 0), (.085, .06)], 6, sd, top=False)                    # knee cop
        A.lathe(px, pz, b + .51, [(.078, 0), (.092, .33)], 6, st, top=False)                    # cuisse
    A.lathe(x, z, b + .82, [(.2, 0), (.21, .08), (.18, .18)], 8, sd, top=False)                # the lames
    A.lathe(x, z, b + 1.0, [(.18, 0), (.21, .2), (.19, .38), (.13, .44)], 8, st, top=True)    # cuirass
    fx, fz = pt(x, z, yaw, 0, .2)
    A.rbox(fx, fz, .03, .03, b + 1.04, b + 1.4, yaw, st)                         # the ridge down the breastplate
    if tabard:
        for side in (1, -1):
            lz0 = .205 * side
            ob(A, x, z, yaw, 0, lz0, .3, .012, b + .78, b + 1.3, M['red'])       # tabard front and back
        ob(A, x, z, yaw, 0, .213, .12, .006, b + 1.02, b + 1.16, M['gold'])      # the gold tower: its body
        for k in (-1, 0, 1):
            ob(A, x, z, yaw, k * .04, .213, .03, .006, b + 1.16, b + 1.2, M['gold'])   # merlons
        ob(A, x, z, yaw, 0, .215, .03, .004, b + 1.02, b + 1.08, M['red'])       # its door
    A.lathe(x, z, b + 1.43, [(.1, 0), (.09, .08)], 8, sd, top=False)                          # gorget
    for s in (-1, 1):
        sx, sz = pt(x, z, yaw, s * .23, 0)
        PP.ellipsoid(A, sx, b + 1.36, sz, .1, .08, .1, sd, seg=6, rings=3)       # pauldron
        a0 = P3(x, z, yaw, s * .25, b + 1.3, 0); a1 = P3(x, z, yaw, s * .27, b + 1.05, .03); a2 = P3(x, z, yaw, s * .25, b + .8, .08)
        A.tube(a0, a1, .055, 5, st, caps=False); A.tube(a1, a2, .05, 5, st, caps=False)
        A.tube((a1[0], a1[1] - .04, a1[2]), (a1[0], a1[1] + .04, a1[2]), .065, 5, sd)          # elbow cop
        A.tube(a2, (a2[0], a2[1] - .12, a2[2]), .05, 5, sd)                       # gauntlet
    # great helm: flat top, a visor slit, a cross of brow and nose
    A.lathe(x, z, b + 1.5, [(.12, 0), (.125, .16), (.1, .27), (0, .28)], 8, st, top=False)
    ob(A, x, z, yaw, 0, .11, .18, .03, b + 1.62, b + 1.645, M['black'])          # the sight
    ob(A, x, z, yaw, 0, .115, .025, .03, b + 1.5, b + 1.75, sd)
    ob(A, x, z, yaw, 0, .118, .2, .02, b + 1.66, b + 1.69, sd)
    if plume:
        for k in range(3):
            a = P3(x, z, yaw, 0, b + 1.78, -.02 * k); c = P3(x, z, yaw, .04 * (k - 1), b + 1.98 - .04 * k, -.14 - .06 * k)
            A.tube(a, c, .03 - .005 * k, 4, M['red'], r2=.008)


def heater_shield(A, c, normal, h, field, rim, charge=None, charge_m=None, split=None):
    """A heater shield: a straight top, sides curving to a point; an iron rim; charge 'tower' (a gold tower), 'chevron'
    or 'cross' laid proud on the field; split = a second field colour for the dexter half (per pale)."""
    c = Vector(c); nv = Vector(normal).normalized()
    u = nv.cross(Vector((0, 1, 0))); u.normalize(); w = Vector((0, 1, 0))
    outline = [(-.375, .5), (.375, .5), (.37, .15), (.3, -.15), (.16, -.37), (0, -.5), (-.16, -.37), (-.3, -.15), (-.37, .15)]
    th = .035
    def Pt(a, b, off):
        return tuple(c + u * a * h + w * b * h + nv * off)
    n = len(outline)
    V = [Pt(a, b, th / 2) for a, b in outline] + [Pt(a, b, -th / 2) for a, b in outline]
    A.poly(V, [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))] + [(i, n + i, n + (i + 1) % n, (i + 1) % n) for i in range(n)], rim)
    # the field as a face .004 proud, inset from the rim
    inset = [(a * .9, b * .9 + .01) for a, b in outline]
    if split is None:
        V2 = [Pt(a, b, th / 2 + .006) for a, b in inset]
        A.poly(V2, [tuple(range(n))], field)
    else:
        left = [p for p in inset if p[0] <= 0] ; right = [p for p in inset if p[0] >= 0]
        l = [(0, .46)] + [p for p in inset if p[0] < 0] + [(0, -.45)]
        r = [(0, -.45)] + [p for p in inset if p[0] > 0] + [(0, .46)]
        for poly, mat in ((l, split), (r, field)):
            V2 = [Pt(a, b, th / 2 + .006) for a, b in poly]
            A.poly(V2, [tuple(range(len(poly)))[::-1]], mat)
    if charge and charge_m is not None:
        off = th / 2 + .012
        if charge == 'tower':
            for a0, a1, b0, b1 in ((-.11, .11, -.2, .12), (-.14, -.07, .12, .2), (-.035, .035, .12, .2), (.07, .14, .12, .2)):
                q = [(a0, b0), (a1, b0), (a1, b1), (a0, b1)]
                A.poly([Pt(a, b, off) for a, b in q], [(0, 1, 2, 3)], charge_m)
            q = [(-.04, -.2), (.04, -.2), (.04, -.07), (-.04, -.07)]
            A.poly([Pt(a, b, off + .004) for a, b in q], [(0, 1, 2, 3)], field)
        elif charge == 'chevron':
            q = [(-.3, -.12), (0, .2), (.3, -.12), (.3, .0), (0, .32), (-.3, .0)]
            A.poly([Pt(a, b, off) for a, b in q], [(0, 1, 2, 3, 4, 5)[::-1]], charge_m)
        elif charge == 'cross':
            for q in ([(-.05, -.38), (.05, -.38), (.05, .44), (-.05, .44)], [(-.3, .1), (.3, .1), (.3, .2), (-.3, .2)]):
                A.poly([Pt(a, b, off) for a, b in q], [(0, 1, 2, 3)], charge_m)


def armour_trophy(A, c, normal, M, charge='tower'):
    """A trophy of arms hung on a wall: a heater shield over two crossed swords, a bascinet above on a bracket."""
    c = Vector(c); nv = Vector(normal).normalized(); u = nv.cross(Vector((0, 1, 0))).normalized()
    for s in (-1, 1):
        a = c + u * (s * .42) + Vector((0, -.5, 0)) + nv * .03
        b = c - u * (s * .42) + Vector((0, .55, 0)) + nv * .03
        T.sword(A, tuple(a), tuple(b), M['steel'], M['iron'], M['leather'], M['brass'])
    heater_shield(A, tuple(c + nv * .07), tuple(nv), .62, M['red'], M['iron'], charge, M['gold'])
    hb = c + Vector((0, .45, 0)) + nv * .14
    A.tube(tuple(c + Vector((0, .42, 0)) + nv * .01), tuple(hb), .02, 5, M['iron'])          # the bracket the helm sits on
    T.helmet(A, hb.x, hb.z, hb.y, .12, M['steel_d'], band=M['iron'], rot=math.atan2(nv.z, nv.x))


def banner(A, top, along, normal, w, h, field, border, gold, pole, charge='tower', tail='swallow'):
    """A banner hung from a pole on two brackets: a cloth with a border band, the gold tower on its field, a swallowtail
    (or pointed) foot with a gold fringe. top: the pole's centre; along: the wall's direction; normal: out of the wall."""
    t = Vector(top); a = Vector(along).normalized(); nv = Vector(normal).normalized()
    A.tube(tuple(t - a * (w / 2 + .1)), tuple(t + a * (w / 2 + .1)), .025, 6, pole)
    for s in (-1, 1):
        e = t + a * (s * (w / 2 + .12))
        A.tube(tuple(e - a * s * .02), tuple(e + a * s * .05), .035, 6, gold, r2=.01)       # a gilt finial on the pole end
        br = t + a * (s * (w / 2 - .05))
        A.tube(tuple(br - nv * .14), tuple(br), .018, 5, pole)                  # the bracket back to the wall
    cl = .012
    def Q(u, v, off):
        return tuple(t + a * u - Vector((0, v, 0)) + nv * off)
    body = h - (.22 if tail else 0)
    pts = [(-w / 2, .05), (w / 2, .05), (w / 2, body), (0 if tail == 'point' else w / 4, h if tail == 'point' else body + .16), (0, body if tail == 'swallow' else h), (-w / 4, body + .16), (-w / 2, body)] if tail else [(-w / 2, .05), (w / 2, .05), (w / 2, h), (-w / 2, h)]
    if tail == 'swallow':
        pts = [(-w / 2, .05), (w / 2, .05), (w / 2, h), (w * .12, body), (-w * .12, body), (-w / 2, h)]
    elif tail == 'point':
        pts = [(-w / 2, .05), (w / 2, .05), (w / 2, body), (0, h), (-w / 2, body)]
    n = len(pts)
    V = [Q(u, v, cl / 2) for u, v in pts] + [Q(u, v, -cl / 2) for u, v in pts]
    A.poly(V, [tuple(range(n))[::-1], tuple(range(n, 2 * n))] + [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)], border)
    ins = .06
    inner = [(-w / 2 + ins, .05 + ins), (w / 2 - ins, .05 + ins), (w / 2 - ins, body - ins * .5), (-w / 2 + ins, body - ins * .5)]
    A.poly([Q(u, v, cl / 2 + .006) for u, v in inner], [(0, 1, 2, 3)[::-1]], field)
    A.poly([Q(u, v, -cl / 2 - .006) for u, v in inner], [(0, 1, 2, 3)], field)
    if charge == 'tower':
        cx0 = 0; cy = .05 + body * .5
        s = min(w, body) * .55
        for u0, u1, v0, v1 in ((-.22, .22, -.05, .35), (-.28, -.14, -.2, -.05), (-.07, .07, -.2, -.05), (.14, .28, -.2, -.05)):
            q = [(u0 * s, cy + v0 * s), (u1 * s, cy + v0 * s), (u1 * s, cy + v1 * s), (u0 * s, cy + v1 * s)]
            A.poly([Q(u, v, cl / 2 + .012) for u, v in q], [(0, 1, 2, 3)[::-1]], gold)
        q = [(-.07 * s, cy + .35 * s), (.07 * s, cy + .35 * s), (.07 * s, cy + .12 * s), (-.07 * s, cy + .12 * s)]
        A.poly([Q(u, v, cl / 2 + .016) for u, v in q], [(0, 1, 2, 3)[::-1]], field)
    # the fringe along the foot's edges
    for i in range(n):
        p0, p1 = pts[i], pts[(i + 1) % n]
        if p0[1] > .1 and p1[1] > .1:
            q = [(p0[0], p0[1]), (p1[0], p1[1]), (p1[0], p1[1] + .05), (p0[0], p0[1] + .05)]
            A.poly([Q(u, v, cl / 2 + .006) for u, v in q], [(0, 1, 2, 3)], gold)


# ------------------------------------------------------------------ light
def candle(A, F, x, z, y, wax, flame, h=.14, r=.018):
    A.lathe(x, z, y, [(r, 0), (r, h)], 5, wax, top=True)
    for a in (0, math.pi / 2):
        cx, sx = math.cos(a) * .018, math.sin(a) * .018
        f = [(x - cx, y + h + .005, z - sx), (x + cx, y + h + .005, z + sx), (x, y + h + .085, z)]
        F.poly(f, [(0, 1, 2)], flame)


def candelabra(A, F, x, z, y, M, h=1.45, arms=3, yaw=0.0):
    """A standing iron candelabra: three splayed feet, a stem with a knop, a drip pan, arms bent up to pans, candles."""
    ir, wax, fl = M['iron'], M['wax'], M['flame']
    for k in range(3):
        a = yaw + k * 2 * math.pi / 3
        A.beam((x, y + .22, z), (x + math.cos(a) * .24, y, z + math.sin(a) * .24), .035, .035, ir)
    A.lathe(x, z, y + .18, [(.04, 0), (.022, .12), (.022, h - .45), (.045, h - .4), (.022, h - .34), (.022, h - .12)], 5, ir, top=False)
    A.lathe(x, z, y + h - .14, [(.02, 0), (.09, .03), (.09, .045)], 6, ir)
    candle(A, F, x, z, y + h - .095, wax, fl, h=.16, r=.022)
    for k in range(arms - 1 if arms > 1 else 0):
        a = yaw + k * 2 * math.pi / (arms - 1)
        ex, ez = x + math.cos(a) * .26, z + math.sin(a) * .26
        A.beam((x, y + h - .3, z), (ex, y + h - .22, ez), .025, .025, ir)
        A.beam((ex, y + h - .22, ez), (ex, y + h - .1, ez), .025, .025, ir)
        A.lathe(ex, ez, y + h - .12, [(.015, 0), (.065, .03)], 6, ir)
        candle(A, F, ex, ez, y + h - .09, wax, fl, h=.13)


def table_candelabra(A, F, x, z, y, M):
    """A three-branched brass candelabra for a table."""
    b, wax, fl = M['brass'], M['wax'], M['flame']
    A.lathe(x, z, y, [(.07, 0), (.02, .05), (.018, .2), (.03, .22), (.016, .26)], 6, b, top=False)
    A.beam((x - .15, y + .3, z), (x + .15, y + .3, z), .02, .02, b)
    for ex in (x - .15, x, x + .15):
        A.lathe(ex, z, y + .3 + (.04 if ex == x else 0), [(.012, 0), (.045, .03)], 5, b)
        candle(A, F, ex, z, y + .33 + (.04 if ex == x else 0), wax, fl, h=.12, r=.016)


def tankard(A, x, z, y, M, h=.15, rot=0.0, full=True):
    """A pewter tankard: a straight body with two bands, a strap handle, ale to the brim."""
    r = h * .36
    A.lathe(x, z, y, [(r * 1.08, 0), (r, .01), (r * .96, h)], 7, M['pewter'], top=False, bottom=True)
    A.lathe(x, z, y + h * .18, [(r * 1.04, 0), (r * 1.04, h * .08)], 7, M['pewter_d'], top=False)
    A.lathe(x, z, y + h * .78, [(r * 1.0, 0), (r * 1.0, h * .08)], 7, M['pewter_d'], top=False)
    if full:
        A.lathe(x, z, y + h * .9, [(r * .95, 0)], 7, M['ale'], top=True)
    hx, hz = x + math.cos(rot) * r, z + math.sin(rot) * r
    ox, oz = math.cos(rot) * .045, math.sin(rot) * .045
    A.beam((hx, y + h * .82, hz), (hx + ox, y + h * .75, hz + oz), .018, .018, M['pewter_d'])
    A.beam((hx + ox, y + h * .75, hz + oz), (hx + ox * .8, y + h * .25, hz + oz * .8), .018, .018, M['pewter_d'])
    A.beam((hx + ox * .8, y + h * .25, hz + oz * .8), (hx, y + h * .2, hz), .018, .018, M['pewter_d'])


def jug(A, x, z, y, M, h=.24, rot=0.0):
    """A pewter jug: a bellied body, a pinched lip, a strap handle."""
    A.lathe(x, z, y, [(h * .26, 0), (h * .34, h * .35), (h * .22, h * .78), (h * .25, h)], 7, M['pewter'], top=False, bottom=True)
    A.lathe(x, z, y + h * .95, [(h * .22, 0)], 7, M['pewter_d'], top=True)
    hx, hz = x + math.cos(rot) * h * .3, z + math.sin(rot) * h * .3
    ox, oz = math.cos(rot) * .06, math.sin(rot) * .06
    A.beam((hx, y + h * .85, hz), (hx + ox, y + h * .7, hz + oz), .02, .02, M['pewter_d'])
    A.beam((hx + ox, y + h * .7, hz + oz), (hx + ox * .5, y + h * .3, hz + oz * .5), .02, .02, M['pewter_d'])


def candlestick(A, F, x, z, y, M, h=.18):
    """A brass candlestick: a dished foot, a knopped stem, a drip pan, a candle burning."""
    A.lathe(x, z, y, [(.06, 0), (.02, .03), (.016, h * .8), (.04, h * .85), (.03, h)], 6, M['brass'], top=True)
    candle(A, F, x, z, y + h, M['wax'], M['flame'], h=.13, r=.018)


def apple_bowl(A, x, z, y, M, r=.14):
    """A wide pewter bowl heaped with red and gold apples."""
    A.lathe(x, z, y, [(r * .45, 0), (r, r * .45), (r * 1.02, r * .5)], 8, M['pewter'], top=False, bottom=True)
    A.lathe(x, z, y + r * .35, [(r * .95, 0)], 8, M['pewter_d'], top=True)
    for k, (dx, dz, dy) in enumerate(((-.05, -.03, .0), (.05, -.02, .0), (0, .05, .0), (0, 0, .06))):
        PP.ellipsoid(A, x + dx, y + r * .45 + .04 + dy, z + dz, .045, .042, .045, M['apple'] if k % 2 == 0 else M['gold'], seg=5, rings=3)


def brazier(A, F, x, z, y, M):
    """A standing iron brazier: three legs, a bowl of coals, low flames."""
    ir = M['iron']
    for k in range(3):
        a = k * 2 * math.pi / 3 + .3
        A.beam((x + math.cos(a) * .18, y + .62, z + math.sin(a) * .18), (x + math.cos(a) * .3, y, z + math.sin(a) * .3), .035, .035, ir)
    A.lathe(x, z, y + .55, [(.1, 0), (.26, .12), (.29, .2), (.27, .2)], 10, ir, top=False, bottom=True)
    A.lathe(x, z, y + .7, [(.26, 0), (.2, .04), (0, .05)], 10, M['coal'], top=False)
    for k in range(5):
        a = k * 1.3
        cx, cz = x + math.cos(a) * .1, z + math.sin(a) * .1
        for q in (0, math.pi / 2):
            ca, sa = math.cos(q) * .06, math.sin(q) * .06
            f = [(cx - ca, y + .74, cz - sa), (cx + ca, y + .74, cz + sa), (cx, y + .96 - .03 * (k % 2), cz)]
            F.poly(f, [(0, 1, 2)], M['flame'])


def torch_flame(F, tip, d, flame, size=1.0):
    """The flame over a torch head at `tip`, crossed quads."""
    c = Vector(tip)
    for a in (0, math.pi / 2):
        cx, sx = math.cos(a) * .045 * size, math.sin(a) * .045 * size
        f = [(c.x - cx, c.y, c.z - sx), (c.x + cx, c.y, c.z + sx), (c.x, c.y + .2 * size, c.z)]
        F.poly(f, [(0, 1, 2)], flame)


def wall_torch(A, F, x, z, y, out_x, out_z, M):
    """A torch in a wall bracket: a back plate, a bent arm to a ring, the stick leaning out, its head wrapped in
    pitch-soaked rag; the flame drawn into the flames part F (the torch FX part)."""
    ir = M['iron']
    A.box(x - .05 if out_z else x - .01 * out_x, x + .05 if out_z else x + .01 * out_x + .002, y - .12, y + .08, z - .05 if out_x else z - .01 * out_z, z + .05 if out_x else z + .01 * out_z + .002, ir)
    ox, oz = out_x * .16, out_z * .16
    A.beam((x, y - .06, z), (x + ox, y - .02, z + oz), .025, .025, ir)
    A.lathe(x + ox, z + oz, y - .04, [(.045, 0), (.045, .04)], 5, ir, top=False)
    b0 = (x + ox - out_x * .05, y - .3, z + oz - out_z * .05); t0 = (x + ox + out_x * .06, y + .16, z + oz + out_z * .06)
    A.tube(b0, t0, .022, 5, M['oak_d'], caps=False)
    d0 = (Vector(t0) - Vector(b0)).normalized()
    A.tube(tuple(Vector(t0) - d0 * .02), tuple(Vector(t0) + d0 * .1), .04, 5, M['pitch'], caps=True, r2=.034)
    b = Vector((x + ox - out_x * .05, y - .3, z + oz - out_z * .05)); t = Vector((x + ox + out_x * .06, y + .16, z + oz + out_z * .06))
    d = (t - b).normalized()
    torch_flame(F, tuple(t + d * .1), d, M['flame'])


# ------------------------------------------------------------------ seats and tables
def great_chair(A, x, z, y, yaw, M):
    """The Warden's great chair: turned legs, armrests on posts, a red cushion, a tall panelled back with a red cloth,
    an arched crest with the gold tower and two finials."""
    wd, wdd, red, gold = M['oak'], M['oak_d'], M['red'], M['gold']
    for lx in (-.26, .26):
        for lz in (-.24, .22):
            px, pz = pt(x, z, yaw, lx, lz)
            T.oct_prism(A, px, pz, .035, .035, y, y + .46, wdd, rot=yaw)
    ob(A, x, z, yaw, 0, 0, .6, .54, y + .44, y + .5, wd)
    ob(A, x, z, yaw, 0, .01, .5, .46, y + .5, y + .58, red)
    for lx in (-.29, .29):
        px, pz = pt(x, z, yaw, lx, .2)
        T.oct_prism(A, px, pz, .03, .03, y + .5, y + .76, wdd, rot=yaw)
        ob(A, x, z, yaw, lx, 0, .07, .56, y + .76, y + .81, wd)
    for lx in (-.28, .28):
        px, pz = pt(x, z, yaw, lx, -.25)
        T.oct_prism(A, px, pz, .04, .04, y + .44, y + 1.72, wdd, rot=yaw)
        A.lathe(px, pz, y + 1.72, [(.045, 0), (.05, .06), (0, .15)], 5, gold)
    ob(A, x, z, yaw, 0, -.25, .52, .05, y + .6, y + 1.55, wd)
    ob(A, x, z, yaw, 0, -.22, .42, .012, y + .66, y + 1.45, red)
    ob(A, x, z, yaw, 0, -.214, .1, .006, y + 1.1, y + 1.28, gold)
    for k in (-1, 0, 1):
        ob(A, x, z, yaw, k * .035, -.214, .025, .006, y + 1.28, y + 1.32, gold)
    # the arched crest
    for i in range(4):
        a0, a1 = math.pi * i / 4, math.pi * (i + 1) / 4
        p0 = (-math.cos(a0) * .28, 1.55 + math.sin(a0) * .16); p1 = (-math.cos(a1) * .28, 1.55 + math.sin(a1) * .16)
        q = [P3(x, z, yaw, p0[0], y + p0[1] - .06, -.25), P3(x, z, yaw, p1[0], y + p1[1] - .06, -.25), P3(x, z, yaw, p1[0], y + p1[1], -.25), P3(x, z, yaw, p0[0], y + p0[1], -.25)]
        back = [P3(x, z, yaw, p0[0], y + p0[1] - .06, -.28), P3(x, z, yaw, p1[0], y + p1[1] - .06, -.28), P3(x, z, yaw, p1[0], y + p1[1], -.28), P3(x, z, yaw, p0[0], y + p0[1], -.28)]
        A.poly(q + back, [(0, 1, 2, 3), (7, 6, 5, 4), (3, 2, 6, 7), (0, 4, 5, 1)], wd)


def side_chair(A, x, z, y, yaw, M):
    """A good side chair: a board seat with a red cushion, a back of two rails and a splat."""
    wd, wdd = M['oak'], M['oak_d']
    for lx in (-.2, .2):
        for lz in (-.19, .19):
            px, pz = pt(x, z, yaw, lx, lz)
            T.oct_prism(A, px, pz, .025, .025, y, y + .45, wdd, rot=yaw)
    ob(A, x, z, yaw, 0, 0, .46, .44, y + .45, y + .5, wd)
    ob(A, x, z, yaw, 0, .01, .38, .36, y + .5, y + .55, M['red'])
    for lx in (-.2, .2):
        px, pz = pt(x, z, yaw, lx, -.2)
        T.oct_prism(A, px, pz, .025, .025, y + .5, y + 1.05, wdd, rot=yaw)
        A.lathe(px, pz, y + 1.05, [(.03, 0), (0, .06)], 6, wd)
    for yy in (.72, .98):
        ob(A, x, z, yaw, 0, -.2, .4, .035, y + yy - .03, y + yy + .03, wd)
    ob(A, x, z, yaw, 0, -.2, .1, .03, y + .55, y + .95, wd)


def clothed_table(A, x0, x1, z0, z1, top, M, cloth, runner=None, along='x'):
    """A trestle table under a linen cloth that drops on the long sides, a red runner down its length."""
    T.trestle_table(A, x0, x1, z0, z1, top, M['oak'], M['oak_d'], M['end'], along=along)
    e = .03
    A.box(x0 - e, x1 + e, top, top + .008, z0 - e, z1 + e, cloth)
    if along == 'x':
        for zz, d in ((z0 - e, -1), (z1 + e, 1)):
            A.box(x0 - e, x1 + e, top - .26, top + .008, min(zz, zz + d * .008), max(zz, zz + d * .008), cloth)
        if runner is not None:
            zc = (z0 + z1) / 2
            A.box(x0 + .05, x1 - .05, top + .008, top + .012, zc - .14, zc + .14, runner)
    else:
        for xx, d in ((x0 - e, -1), (x1 + e, 1)):
            A.box(min(xx, xx + d * .008), max(xx, xx + d * .008), top - .26, top + .008, z0 - e, z1 + e, cloth)
        if runner is not None:
            xc = (x0 + x1) / 2
            A.box(xc - .14, xc + .14, top + .008, top + .012, z0 + .05, z1 - .05, runner)


def goblet(A, x, z, y, M, h=.16):
    A.lathe(x, z, y, [(.035, 0), (.03, .01), (.008, .03), (.008, h * .55), (.04, h * .7), (.045, h)], 8, M['silver'], top=False)
    A.lathe(x, z, y + h * .78, [(.04, 0)], 8, M['wine'], top=True)


def platter(A, x, z, y, r, M):
    A.lathe(x, z, y, [(r * .6, 0), (r, .015), (r, .022), (r * .6, .01)], 10, M['silver'], top=True)


# ------------------------------------------------------------------ chamber furniture
def four_poster(A, x0, x1, z0, z1, floor, head, M):
    """A four-poster bed: turned posts to the tester, a panelled headboard with the Warden's arms, a red canopy with a
    fringed valance, curtains gathered at the head posts, a mattress, sheet, a blue coverlet with a gold border, a
    bolster and two pillows. head: the side the headboard stands ('n' 's' 'e' 'w')."""
    wd, wdd, red, gold = M['oak'], M['oak_d'], M['red'], M['gold']
    H = 2.25
    for cx in (x0 + .06, x1 - .06):
        for cz in (z0 + .06, z1 - .06):
            T.oct_prism(A, cx, cz, .065, .065, floor, floor + .16, wdd)
            T.oct_prism(A, cx, cz, .045, .045, floor + .16, floor + H - .09, wdd)          # the tester frame rests on the posts
            A.lathe(cx, cz, floor + .52, [(.062, 0), (.062, .07)], 6, wd, top=False)
    # frame and mattress
    A.box(x0 + .05, x1 - .05, floor + .28, floor + .42, z0 + .05, z1 - .05, wd)
    A.box(x0 + .08, x1 - .08, floor + .42, floor + .6, z0 + .08, z1 - .08, M['ticking'])
    horiz = head in ('n', 's')
    hs = -1 if head in ('n', 'w') else 1
    # coverlet with a gold border, turned down at the head
    if horiz:
        zc0, zc1 = (z0 + .55, z1 + .02) if head == 'n' else (z0 - .02, z1 - .55)
        A.box(x0 + .02, x1 - .02, floor + .6, floor + .64, zc0, zc1, M['blue'])
        A.box(x0 - .0, x0 + .06, floor + .36, floor + .64, zc0, zc1, M['blue']); A.box(x1 - .06, x1, floor + .36, floor + .64, zc0, zc1, M['blue'])
        A.box(x0 + .1, x1 - .1, floor + .64, floor + .646, zc0 + .06, zc0 + .12, gold)
        zp = z0 + .28 if head == 'n' else z1 - .28
        A.box(x0 + .12, x1 - .12, floor + .6, floor + .7, zp - .12, zp + .12, M['linen'])
        for px in (x0 + .32, x1 - .32):
            PP.ellipsoid(A, px, floor + .74, zp, .2, .07, .12, M['linen'], seg=6, rings=3)
        hz = z0 + .05 if head == 'n' else z1 - .05
        A.box(x0 + .08, x1 - .08, floor + .42, floor + 1.35, min(hz, hz + hs * -.06), max(hz, hz + hs * -.06), wd)
        A.box(x0 + .25, x1 - .25, floor + .75, floor + 1.25, min(hz - hs * .055, hz - hs * .075), max(hz - hs * .055, hz - hs * .075), wdd)
        heater_shield(A, ((x0 + x1) / 2, floor + 1.02, hz - hs * .1), (0, 0, -hs), .34, red, M['iron'], 'tower', gold)
        foot = z1 - .05 if head == 'n' else z0 + .05
        A.box(x0 + .08, x1 - .08, floor + .3, floor + .78, min(foot, foot + hs * .05), max(foot, foot + hs * .05), wd)
    else:
        xc0, xc1 = (x0 + .55, x1 + .02) if head == 'w' else (x0 - .02, x1 - .55)
        A.box(xc0, xc1, floor + .6, floor + .64, z0 + .02, z1 - .02, M['blue'])
        A.box(xc0, xc1, floor + .36, floor + .64, z0, z0 + .06, M['blue']); A.box(xc0, xc1, floor + .36, floor + .64, z1 - .06, z1, M['blue'])
        A.box(xc0 + .06, xc0 + .12, floor + .64, floor + .646, z0 + .1, z1 - .1, gold)
        xp = x0 + .28 if head == 'w' else x1 - .28
        A.box(xp - .12, xp + .12, floor + .6, floor + .7, z0 + .12, z1 - .12, M['linen'])
        for pz in (z0 + .32, z1 - .32):
            PP.ellipsoid(A, xp, floor + .74, pz, .12, .07, .2, M['linen'], seg=6, rings=3)
        hx = x0 + .05 if head == 'w' else x1 - .05
        A.box(min(hx, hx - hs * .06), max(hx, hx - hs * .06), floor + .42, floor + 1.35, z0 + .08, z1 - .08, wd)
        A.box(min(hx - hs * .055, hx - hs * .075), max(hx - hs * .055, hx - hs * .075), floor + .75, floor + 1.25, z0 + .25, z1 - .25, wdd)
        heater_shield(A, (hx - hs * .1, floor + 1.02, (z0 + z1) / 2), (-hs, 0, 0), .34, red, M['iron'], 'tower', gold)
        foot = x1 - .05 if head == 'w' else x0 + .05
        A.box(min(foot, foot + hs * .05), max(foot, foot + hs * .05), floor + .3, floor + .78, z0 + .08, z1 - .08, wd)
    # the tester: a frame, the canopy, a fringed valance
    y = floor + H
    A.box(x0, x1, y - .08, y, z0, z0 + .08, wd); A.box(x0, x1, y - .08, y, z1 - .08, z1, wd)
    A.box(x0, x0 + .08, y - .08, y, z0, z1, wd); A.box(x1 - .08, x1, y - .08, y, z0, z1, wd)
    A.box(x0 + .04, x1 - .04, y, y + .03, z0 + .04, z1 - .04, red)
    for (a0, a1, b0, b1) in ((x0 - .02, x1 + .02, z0 - .03, z0 - .01), (x0 - .02, x1 + .02, z1 + .01, z1 + .03), (x0 - .03, x0 - .01, z0 - .02, z1 + .02), (x1 + .01, x1 + .03, z0 - .02, z1 + .02)):
        A.box(a0, a1, y - .28, y + .03, b0, b1, red)
        A.box(a0, a1, y - .32, y - .28, b0, b1, gold)
    # curtains gathered at the head posts, tied back
    hp = [(x0 + .06, z0 + .06), (x1 - .06, z0 + .06)] if head == 'n' else [(x0 + .06, z1 - .06), (x1 - .06, z1 - .06)] if head == 's' else [(x0 + .06, z0 + .06), (x0 + .06, z1 - .06)] if head == 'w' else [(x1 - .06, z0 + .06), (x1 - .06, z1 - .06)]
    for cx, cz in hp:
        A.lathe(cx, cz, floor + .15, [(.11, 0), (.07, .9), (.13, 1.8), (.09, H - .3 - .15)], 6, red, top=False)
        A.lathe(cx, cz, floor + 1.02, [(.085, 0), (.085, .05)], 6, gold, top=False)


def wardrobe(A, x0, x1, z0, z1, y, h, front, M):
    """A press: a plinth, two panelled doors with iron hinges and ring pulls, a moulded cornice."""
    wd, wdd, ir = M['oak'], M['oak_d'], M['iron']
    A.box(x0, x1, y, y + .1, z0, z1, wdd)
    for cx in (x0, x1 - .06):                                                    # iron corner shoes on the plinth
        for cz in (z0, z1 - .06):
            A.box(cx - .005, cx + .065, y, y + .08, cz - .005, cz + .065, ir)
    A.box(x0 + .02, x1 - .02, y + .1, y + h - .12, z0 + .02, z1 - .02, wd)
    A.box(x0 - .03, x1 + .03, y + h - .12, y + h - .04, z0 - .03, z1 + .03, wdd)
    A.box(x0 - .01, x1 + .01, y + h - .04, y + h, z0 - .01, z1 + .01, wd)
    fwd = {'s': (0, 1), 'n': (0, -1), 'e': (1, 0), 'w': (-1, 0)}[front]
    if fwd[1]:
        fz = z1 - .02 if fwd[1] > 0 else z0 + .02
        d = fwd[1]
        for a0, a1 in ((x0 + .06, (x0 + x1) / 2 - .015), ((x0 + x1) / 2 + .015, x1 - .06)):
            A.box(a0, a1, y + .18, y + h - .2, min(fz, fz + d * .02), max(fz, fz + d * .02), wdd)
            A.box(a0 + .08, a1 - .08, y + .3, y + h - .32, min(fz + d * .02, fz + d * .03), max(fz + d * .02, fz + d * .03), wd)
            for yy in (y + .35, y + h - .4):
                hx = a0 if a0 < (x0 + x1) / 2 - .1 else a1
                A.box(hx - .1 if hx == a1 else hx, hx if hx == a1 else hx + .1, yy - .025, yy + .025, min(fz + d * .02, fz + d * .035), max(fz + d * .02, fz + d * .035), ir)
        for px in ((x0 + x1) / 2 - .06, (x0 + x1) / 2 + .06):
            A.box(px - .02, px + .02, y + h * .5 - .05, y + h * .5 + .05, min(fz + d * .02, fz + d * .045), max(fz + d * .02, fz + d * .045), ir)
    else:
        fx = x1 - .02 if fwd[0] > 0 else x0 + .02
        d = fwd[0]
        for a0, a1 in ((z0 + .06, (z0 + z1) / 2 - .015), ((z0 + z1) / 2 + .015, z1 - .06)):
            A.box(min(fx, fx + d * .02), max(fx, fx + d * .02), y + .18, y + h - .2, a0, a1, wdd)
            A.box(min(fx + d * .02, fx + d * .03), max(fx + d * .02, fx + d * .03), y + .3, y + h - .32, a0 + .08, a1 - .08, wd)
        for pz in ((z0 + z1) / 2 - .06, (z0 + z1) / 2 + .06):
            A.box(min(fx + d * .02, fx + d * .045), max(fx + d * .02, fx + d * .045), y + h * .5 - .05, y + h * .5 + .05, pz - .02, pz + .02, ir)


def washstand(A, x, z, y, M):
    """A washstand: a small table with a shelf, a pewter basin of water, a ewer, a towel over the rail."""
    wd, wdd = M['oak'], M['oak_d']
    for lx in (-.22, .22):
        for lz in (-.18, .18):
            T.oct_prism(A, x + lx, z + lz, .025, .025, y, y + .78, wdd)
    A.box(x - .27, x + .27, y + .78, y + .82, z - .22, z + .22, wd)
    A.box(x - .24, x + .24, y + .2, y + .23, z - .19, z + .19, wd)
    PP.basin(A, x - .05, z, y + .82, .14, M['pewter'], M['water'])
    A.lathe(x + .16, z - .08, y + .82, [(.05, 0), (.07, .08), (.04, .16), (.05, .22)], 6, M['pewter'], top=False, bottom=True)   # the ewer
    A.box(x - .27, x - .25, y + .5, y + .76, z - .16, z + .16, M['linen'])


def bunk(A, x0, x1, z0, z1, floor, M, blankets, ladder_end='e'):
    """A two-tier bunk: four posts, two plank frames, straw mattresses, a blanket and a pillow on each, a ladder."""
    wd, wdd = M['oak'], M['oak_d']
    for cx in (x0 + .04, x1 - .04):
        for cz in (z0 + .04, z1 - .04):
            A.box(cx - .04, cx + .04, floor, floor + 1.75, cz - .04, cz + .04, wdd)
    for k, yy in enumerate((.32, 1.22)):
        A.box(x0 + .02, x1 - .02, floor + yy, floor + yy + .08, z0 + .02, z1 - .02, wd)
        A.box(x0 + .08, x1 - .08, floor + yy + .08, floor + yy + .2, z0 + .08, z1 - .08, M['straw'])
        A.box(x0 + .45, x1 - .08, floor + yy + .2, floor + yy + .24, z0 + .06, z1 - .06, blankets[k % len(blankets)])
        A.box(x0 + .1, x0 + .4, floor + yy + .2, floor + yy + .28, z0 + .15, z1 - .15, M['linen'])
    A.box(x0 + .02, x1 - .02, floor + 1.5, floor + 1.56, z0 + .02, z0 + .06, wd)
    lx = x1 + .02 if ladder_end == 'e' else x0 - .06
    for zz in (z0 + .18, z1 - .18):
        A.box(lx, lx + .04, floor, floor + 1.6, zz - .02, zz + .02, wdd)
    for yy in (.35, .75, 1.15, 1.5):
        A.box(lx - .005, lx + .045, floor + yy - .02, floor + yy + .02, z0 + .18, z1 - .18, wd)


# ------------------------------------------------------------------ the guns
def cannon(A, x, z, y, yaw, M, elev=.07):
    """A castle gun on its truck carriage: two stepped cheeks, axletrees, four iron-tyred trucks, a transom; the iron
    barrel with its cascabel, base ring, reinforce rings, trunnions resting in the cheeks and a swelled muzzle. It points
    along yaw (0 = +z). About 1.7 m long."""
    wd, wdd, ir, ird = M['oak'], M['oak_d'], M['iron'], M['iron_d']
    for s in (-1, 1):
        lx = s * .22
        # a stepped cheek, high at the front where the trunnions sit
        prof = [(-.5, .14), (.42, .14), (.42, .5), (.18, .5), (.18, .42), (-.12, .42), (-.12, .34), (-.5, .3)]
        V = [P3(x, z, yaw, lx - .045, y + py, px) for px, py in prof] + [P3(x, z, yaw, lx + .045, y + py, px) for px, py in prof]
        n = len(prof)
        A.poly(V, [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))] + [(i, n + i, n + (i + 1) % n, (i + 1) % n) for i in range(n)], wd)
    ob(A, x, z, yaw, 0, .3, .52, .12, y + .1, y + .2, wdd)
    ob(A, x, z, yaw, 0, -.4, .52, .12, y + .1, y + .2, wdd)
    ob(A, x, z, yaw, 0, -.1, .36, .1, y + .28, y + .36, wdd)
    for lz in (.3, -.4):
        for s in (-1, 1):
            c = P3(x, z, yaw, s * .31, y + .13, lz); a = P3(x, z, yaw, s * .27, y + .13, lz); b = P3(x, z, yaw, s * .35, y + .13, lz)
            A.tube(a, b, .13, 8, ir, caps=True, cap_m=wdd)                          # a truck: an iron-tyred wooden wheel
    # the barrel along the carriage, raised a little at the muzzle
    fwd = Vector((math.sin(yaw), elev, math.cos(yaw))).normalized()
    tr = Vector(P3(x, z, yaw, 0, y + .55, .28))
    br = tr - fwd * .55
    prof = [(.01, -.15), (.055, -.12), (.035, -.07), (.14, -.04), (.165, .02), (.16, .44), (.142, .47), (.125, .95), (.12, 1.18), (.14, 1.22), (.14, 1.28), (.1, 1.3)]
    hlathe(A, tuple(br), tuple(fwd), prof, 8, ir, cap0=False, cap1=True)
    hlathe(A, tuple(br + fwd * 1.3), tuple(fwd), [(.07, 0), (.07, -.2)], 6, M['black'], cap0=False, cap1=True)
    side = fwd.cross(Vector((0, 1, 0))).normalized()
    A.tube(tuple(tr - side * .27), tuple(tr + side * .27), .05, 8, ird)


def shot_pile(A, x, z, y, M, r=.075, layers=3):
    """Round shot stacked in a pyramid on a small frame."""
    n = layers
    A.box(x - n * r - .04, x + n * r + .04, y, y + .04, z - n * r - .04, z + n * r + .04, M['oak_d'])
    for L in range(layers):
        k = layers - L
        for i in range(k):
            for j in range(k):
                cx = x - (k - 1) * r + 2 * r * i
                cz = z - (k - 1) * r + 2 * r * j
                PP.ellipsoid(A, cx, y + .04 + r + L * r * 1.41, cz, r, r, r, M['iron_d'], seg=5, rings=3)


def rammer(A, butt, top, M):
    """A rammer and sponge leaning by a gun: an ash staff, a wooden rammer head, a woolly sponge."""
    b, t = Vector(butt), Vector(top)
    d = (t - b).normalized()
    A.tube(tuple(b), tuple(t), .02, 6, M['ash'])
    A.tube(tuple(t), tuple(t + d * .16), .07, 8, M['oak_d'])
    A.tube(tuple(b - d * .02), tuple(b + d * .14), .065, 8, M['wool'])


# ------------------------------------------------------------------ floor covering
def rug(A, x0, x1, z0, z1, y, M, field, border, inner, medal, fringe=True, along='x'):
    """A woven rug (its top is a walkable floor): a dark border, a gold band, the field and a lozenge medallion with a
    dark heart, all inlaid in one plane (no layer lies on another), the pile's edge 12 mm deep, a fringe on the short
    ends. y: the floor it lies on."""
    th = .012; t = y + th
    b, ib = .18, .05
    A.box(x0, x1, y, t, z0, z1, border, skip='tb')                         # the pile's edge (no underside on the floor)
    def quad(pts, m):
        A.poly([(px, t, pz) for px, pz in pts], [tuple(range(len(pts)))[::-1]], m)
    def frame(ax0, ax1, az0, az1, w, m):
        quad([(ax0, az0), (ax1, az0), (ax1, az0 + w), (ax0, az0 + w)], m)
        quad([(ax0, az1 - w), (ax1, az1 - w), (ax1, az1), (ax0, az1)], m)
        quad([(ax0, az0 + w), (ax0 + w, az0 + w), (ax0 + w, az1 - w), (ax0, az1 - w)], m)
        quad([(ax1 - w, az0 + w), (ax1, az0 + w), (ax1, az1 - w), (ax1 - w, az1 - w)], m)
    frame(x0, x1, z0, z1, b, border)
    frame(x0 + b, x1 - b, z0 + b, z1 - b, ib, inner)
    a0, a1, c0, c1 = x0 + b + ib, x1 - b - ib, z0 + b + ib, z1 - b - ib
    cx, cz = (a0 + a1) / 2, (c0 + c1) / 2
    rx, rz = (a1 - a0) * .3, (c1 - c0) * .3
    W, S, E, N = (cx - rx, cz), (cx, cz + rz), (cx + rx, cz), (cx, cz - rz)
    quad([(a0, c0), (cx, c0), N, W, (a0, cz)], field)
    quad([(cx, c0), (a1, c0), (a1, cz), E, N], field)
    quad([(a1, cz), (a1, c1), (cx, c1), S, E], field)
    quad([(cx, c1), (a0, c1), (a0, cz), W, S], field)
    w_, s_, e_, n_ = (cx - rx * .45, cz), (cx, cz + rz * .45), (cx + rx * .45, cz), (cx, cz - rz * .45)
    quad([W, N, n_, w_], medal); quad([N, E, e_, n_], medal); quad([E, S, s_, e_], medal); quad([S, W, w_, s_], medal)
    quad([w_, n_, e_, s_], border)
    if fringe:
        ends = ((x0 - .06, x0, z0, z1), (x1, x1 + .06, z0, z1)) if along == 'x' else ((x0, x1, z0 - .06, z0), (x0, x1, z1, z1 + .06))
        for e0, e1, f0, f1 in ends:
            A.box(e0, e1, y, y + .004, f0 + .04, f1 - .04, M['linen'])


# ------------------------------------------------------------------ cellar and gate
def keg_cradle(A, x, z, y, yaw, M):
    """An ale keg lying on an X-braced cradle, a brass tap at its head, a drip pail below."""
    wd, wdd = M['oak'], M['oak_d']
    for lz in (-.22, .22):
        for s in (-1, 1):
            a = P3(x, z, yaw, -.2 * s, y, lz); b = P3(x, z, yaw, .2 * s, y + .42, lz)
            A.beam(a, b, .05, .05, wdd)
    ob(A, x, z, yaw, 0, 0, .52, .06, y + .3, y + .36, wd)
    a = Vector(P3(x, z, yaw, 0, y + .58, -.36)); b = Vector(P3(x, z, yaw, 0, y + .58, .36))
    d = (b - a).normalized()
    K = [(.2, 0), (.24, .12), (.26, .36), (.24, .6), (.2, .72)]
    hlathe(A, tuple(a), tuple(d), K, 8, wd, cap0=True, cap1=True, mats=[M['stave'], wd, M['stave'], wd])
    for t in (.1, .58):
        hlathe(A, tuple(a + d * t), tuple(d), [(.25, 0), (.25, .04)], 8, M['iron'], cap0=False, cap1=False)
    tp = b + d * .01
    A.tube(tuple(tp + Vector((0, -.08, 0))), tuple(tp + d * .09 + Vector((0, -.08, 0))), .018, 6, M['brass'])
    A.tube(tuple(tp + d * .09 + Vector((0, -.08, 0))), tuple(tp + d * .09 + Vector((0, -.16, 0))), .014, 6, M['brass'])
    px, pz = tp.x + d.x * .12, tp.z + d.z * .12
    PP.pail(A, px, pz, y, .2, M['stave'], M['iron'], M['iron'])


def portcullis(A, x0, x1, y0, y1, z, M, bar=.07, pitch=.33, rows=.42):
    """An oak portcullis shod with iron: upright bars ending in iron spikes, cross bars, iron straps at the crossings."""
    wd, ir = M['oak_d'], M['iron']
    n = int(round((x1 - x0) / pitch))
    for i in range(n + 1):
        cx = x0 + (x1 - x0) * i / n
        A.box(cx - bar / 2, cx + bar / 2, y0 + .12, y1, z - bar / 2, z + bar / 2, wd)
        A.poly([(cx - bar / 2, y0 + .12, z - bar / 2), (cx + bar / 2, y0 + .12, z - bar / 2), (cx + bar / 2, y0 + .12, z + bar / 2), (cx - bar / 2, y0 + .12, z + bar / 2), (cx, y0, z)],
               [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4)], ir)
    yy = y0 + .35
    k = 0
    while yy < y1 - .1:
        A.box(x0 - .02, x1 + .02, yy, yy + bar, z - bar / 2 - .012, z + bar / 2 + .012, wd if k % 2 else ir)   # cross bars, the lowest iron
        yy += rows; k += 1


def windlass(A, x0, x1, y, z, M):
    """The portcullis windlass: two braced A-frames, a drum with its rope turns, four capstan bars at each end."""
    wd, wdd, ir = M['oak'], M['oak_d'], M['iron']
    for x in (x0, x1):
        for s in (-1, 1):
            A.beam((x, y, z + s * .4), (x, y + 1.05, z), .09, .09, wdd)
        A.box(x - .05, x + .05, y, y + .08, z - .5, z + .5, wdd)
    A.tube((x0 - .15, y + 1.0, z), (x1 + .15, y + 1.0, z), .045, 8, ir)
    A.tube((x0 + .12, y + 1.0, z), (x1 - .12, y + 1.0, z), .17, 8, wd, caps=True, cap_m=wdd)
    A.tube((x0 + .5, y + 1.0, z), (x1 - .5, y + 1.0, z), .185, 8, M['rope'], caps=False)            # the chain's turns
    for x in (x0 - .1, x1 + .1):
        for k in range(4):
            a = k * math.pi / 2 + .4
            A.beam((x, y + 1.0, z), (x, y + 1.0 + math.sin(a) * .5, z + math.cos(a) * .5), .04, .04, wd)


def spear_rack(A, x, z, y, M, yaw=0.0, n=3):
    """A spear rack: two dressed posts on cross feet, a notched top rail and a butt rail, spears leaning in the notches."""
    for s in (-1, 1):
        px, pz = pt(x, z, yaw, s * .4, 0)
        ob(A, x, z, yaw, s * .4, 0, .14, .34, y, y + .06, M['oak_d'])
        for e in (-1, 1):                                                        # iron shoes on the foot's ends
            ob(A, x, z, yaw, s * .4, e * .15, .15, .04, y, y + .07, M['iron'])
        T.oct_prism(A, px, pz, .042, .042, y + .06, y + 1.62, M['oak'], rot=yaw)
    ob(A, x, z, yaw, 0, 0, .9, .07, y + 1.44, y + 1.52, M['oak'])
    ob(A, x, z, yaw, 0, 0, .9, .07, y + .2, y + .27, M['oak'])
    for k in range(n):
        lx = -.26 + .52 * k / max(1, n - 1)
        bx, bz = pt(x, z, yaw, lx, 0)
        tx, tz = pt(x, z, yaw, lx + (k - 1) * .02, .02)
        T.spear(A, (bx, y + .045, bz), .3, (tx, y + 2.3 - .04 * k, tz), M['ash'], M['steel'], ferrule=M['iron'])


def sword_rack(A, x, z, y, M, yaw=0.0):
    """A floor rack of swords: a slotted oak box, four swords standing point-down, their hilts showing."""
    ob(A, x, z, yaw, 0, 0, .8, .3, y, y + .45, M['oak'])
    ob(A, x, z, yaw, 0, 0, .86, .34, y + .45, y + .5, M['oak_d'])
    for k in range(4):
        lx = -.3 + .2 * k
        a = P3(x, z, yaw, lx, y + 1.25, 0); b = P3(x, z, yaw, lx, y + .5, 0)
        T.sword(A, a, b, M['steel'], M['iron'], M['leather'], M['brass'])


def map_table(A, x0, x1, z0, z1, top, M, floor=0.0):
    """The garrison's map table: a planked table, a chart of the Holm (green land, a blue sea, the keep in red), weights,
    a candlestick, dividers."""
    T.at(A, floor, T.trestle_table, x0, x1, z0, z1, top - floor, M['oak'], M['oak_d'], M['end'], along='x')
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    w, d = (x1 - x0) * .7, (z1 - z0) * .7
    A.box(cx - w / 2, cx + w / 2, top, top + .005, cz - d / 2, cz + d / 2, M['parchment'])
    isle = [(-.4, -.1), (-.25, -.35), (.1, -.38), (.35, -.2), (.42, .1), (.2, .32), (-.15, .35), (-.38, .15)]
    A.poly([(cx + a * w, top + .007, cz + b * d) for a, b in isle], [tuple(range(len(isle)))[::-1]], M['map_green'])
    A.box(cx + .05 * w - .025, cx + .05 * w + .025, top + .007, top + .01, cz - .05 * d - .025, cz - .05 * d + .025, M['red'])
    for a, b in ((-.46, -.42), (.46, .42), (.46, -.42), (-.46, .42)):
        A.lathe(cx + a * w, cz + b * d, top + .005, [(.025, 0), (.025, .03)], 6, M['iron'])


def cloak_pegs(A, a, b, y, out, M, cloaks):
    """A peg rail on a wall with cloaks and a helm hung on it. a, b: the rail's ends (plan x, z); out: into the room."""
    a = Vector((a[0], y, a[1])); b = Vector((b[0], y, b[1])); o = Vector((out[0], 0, out[1]))
    A.beam(tuple(a + o * .03), tuple(b + o * .03), .06, .09, M['oak'])
    n = len(cloaks)
    for k, col in enumerate(cloaks):
        p = a + (b - a) * ((k + .5) / n) + o * .08
        A.tube(tuple(p - o * .05), tuple(p + o * .06), .015, 5, M['oak_d'])
        # the cloak: a narrow top, a wide skirt hanging down to the floor's knee
        top = p + o * .02
        q = [top + Vector((0, -.04, 0)) + (b - a).normalized() * s * .12 for s in (-1, 1)]
        bot = [top + Vector((0, -1.05, 0)) + (b - a).normalized() * s * .3 + o * .06 for s in (-1, 1)]
        pts = [q[0], q[1], bot[1], bot[0]]
        th = o * .02
        V = [tuple(p_) for p_ in pts] + [tuple(p_ + th) for p_ in pts]
        A.poly(V, [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], col)
