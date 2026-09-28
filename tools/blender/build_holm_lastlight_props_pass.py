"""Lastlight props pass (owner, 2026-09-28: "props ... blocky -> redo in Blender purposefully"; "every object in every
building reviewed in Blender"). Lastlight is Keeper Aldous's lighthouse: a stone keeper wing with the repair stores and a
small forge, and the beacon tower - the storm store on the ground, the keeper's room at 3 m, the watch room at 6 m and
the lantern deck at 9 m. Its things are a lamp keeper's things: oil casks and cans, spare lamp glass, wicks and
trimming shears, the logbook and the spyglass, the watch bell, rope, oilskins.

From the model the island loads (holm-lastlight-glazed-review4-v1/lastlight.blend, Blender 5.1). Every prop object was a
v1 box or cylinder (casks as drums, a rack of rope sticks, crates, a stove as a drum and a pole, wall shelves and a
wall chart) or the m44 dressing's random candles and jars; they are all taken away and designed again, each in its old
plan box, so the same tiles stay blocked (the rope coils and the porch creel keep the reach that decides a tile by a
few centimetres) and every stance, link, climb and target of the graph is unchanged. The ladders, hatches, lever,
beacon and storm door are not touched.

 storm store (tower ground, Lastlight_FurnishingPropsStore)
  - the oil casks (drums on sticks): three casks of lamp oil lying on a cradle of sleepers and rails, hooped, each
    with its brass tap, a drip trough under the taps and a feeder can in it;
  - the net rack (a frame hung with rope sticks): a peg rack on trestle ends - the keeper's oilskin coat and
    sou'wester, a fishing net with cork floats, coils of rope and hanks of lamp wick on the pegs, a shelf of wick
    rolls and a spare chimney below;
  - the two barrels: a cask of lamp oil with its funnel and a water butt with a dipper;
  - the rope coil (stacked rings): a coil of hawser with its end trailing;
  - the crates (boxes): a slatted crate of spare lamp glass with a smaller crate on it and a storm lantern (the store's
    light, standing where the hanging lamp no longer hangs);
  - the lens case (a crate, a brass box, a glass slab): the spare lens in its brass-bound case, lid open on a velvet
    bed, on a crate;
 keeper wing (Lastlight_FurnishingPropsWing + the service Lastlight_ServiceStores_Workbench)
  - the forge (stone boxes, a floating hood): a stone forge with a sandstone hearth, a fire pot of glowing coals,
    the hood over it (built into the forge, no longer floating), hand bellows, tongs and a poker;
  - the anvil (a stump with an iron block): a bench anvil on a stump, a hammer on it;
  - the rope coil by the forge and the tar barrel (a drum): a coil of rope, a tar barrel with its brush;
  - the repair workbench (service 'Oil, wicks and spare glass for the lamp'; name kept): a stout bench with a vice,
    a lamp burner being mended, its glass chimney, wick rolls, trimming shears, an oil can, a funnel; the tool board on
    the wall with shears, pliers, hammer, files and a soldering iron; tins under the bench; crates of spare chimneys
    and a box of lantern panes; the wall shelf of oil cans and wick jars;
 keeper's room (3 m, Lastlight_UpperFurnishingPropsKeeper)
  - the box bed: a plank bed with posts and a panelled head, a red wool blanket, sheet and pillow;
  - the table: the keeper's supper - a smoked fish on a plate, a loaf, a tankard, a candlestick - and a stool under it;
  - the stove (a drum and a pole): a pot-bellied iron stove on three feet, its fire door glowing, a kettle on top, the
    flue up and into the wall;
  - the sea chest: an iron-bound chest with a sou'wester and a ditty box on it;
  - the wall shelf (hung, so the cutaway clipped it) becomes a dresser standing in the same place: a cupboard, a plate
    rack, mugs, a jug, a ship in a bottle, a tide table;
  - the barometer (hung) becomes a weather case standing in its place: a narrow case with a barometer dial and a
    thermometer; the chart on the north wall (hung) is left out;
 watch room (6 m, Lastlight_UpperFurnishingPropsWatch)
  - the log desk: slab ends, a gallery of log books, the logbook open, inkwell and quill, the spyglass, the watch
    bell, the half-hour glass, a lantern;
  - the oil tank (a brass drum on two blocks): the lamp's oil tank on a cradle, brass bands, a filler cap, a sight
    glass and a tap;
  - the wick cabinet (a tall box): a cabinet of small drawers with brass pulls, a roll of wick and shears on top;
  - the oil cans (drums): a feeder can with a long spout, a round can, a brass filler jug;
 outside (Lastlight_Yard; name kept; seated on the v2 terrain)
  - by the storm porch: two crates, a lobster creel with its hoops and netting (its east end kept short of the stance
    beside it), a coil of rope on the crates; south of the wing: two crates of deliveries; the rain butt at the wing's
    corner with the downpipe from the gutter into it (the pipe was a stub floating by the eaves).
Plan coordinates (x east, y up, z south; Blender (x, -z, y)), lastlight-local. Original designs.
Run through tools/rebuild_holm_props_pass.js lastlight (spec docs/rebuild/holm-overhaul/props-pass/lastlight.json)."""
import bpy, sys, math, random, json
from pathlib import Path
from mathutils import Vector
HERE = Path(__file__).resolve().parent; sys.path.insert(0, str(HERE)); ROOT = HERE.parents[1]
import holm_props_pass_kit as PK
from holm_props_pass_kit import C, Part
import holm_trade_props as T
import holm_purposeful_props as PP
from holm_purposeful_props import arc, ellipsoid, _rot

SP = PK.spec()
PK.begin()
TRIS = []                                   # (part, object, triangles): printed to the build log for the report
_part_obj = Part.obj


def _counted_obj(self, fn, *a, **kw):
    n0 = sum(len(f) - 2 for f in self.f)
    r = _part_obj(self, fn, *a, **kw)
    TRIS.append((self.name, getattr(fn, '__name__', '?'), sum(len(f) - 2 for f in self.f) - n0))
    return r


Part.obj = _counted_obj
root = PK.obj('Lastlight_Root')
PK.remove('Lastlight_Furnishing', 'Lastlight_FurnishingDressing', 'Lastlight_UpperFurnishingKeeper', 'Lastlight_UpperFurnishingWatch',
          'Lastlight_UpperFurnishingDressing', 'Lastlight_Yard', 'Lastlight_ServiceStores_Workbench')

# ============================================================== palette (sRGB as the game shows it)
oak = C('lastlight oak', '#6a4e36', 'beam'); oak_l = C('lastlight oak light', '#7a5a3e', 'beam'); oak_d = C('lastlight oak dark', '#4a3526', 'beam')
drift = C('lastlight weathered deal', '#8a7a62', 'beam'); drift_d = C('lastlight weathered deal dark', '#6e6150', 'beam')
staves = [C('lastlight stave 1', '#6f4e30', 'beam'), C('lastlight stave 2', '#7d5a37', 'beam'), C('lastlight stave 3', '#664628', 'beam')]
heads = [C('lastlight cask head 1', '#8d6a44', 'beam'), C('lastlight cask head 2', '#81603c', 'beam')]
bark = C('lastlight stump bark', '#5a4232', 'beam'); endg = C('lastlight end grain', '#8a6843', 'beam'); withy = C('lastlight withy', '#8a6a40', 'beam')
stone = [C('lastlight forge stone', '#8e897b', 'rock'), C('lastlight forge stone warm', '#978a76', 'rock'), C('lastlight forge stone cool', '#7d7a70', 'rock')]
sandst = C('lastlight hearth sandstone', '#b0a07a', 'rock')
iron = C('lastlight iron', '#3a3b3a'); iron_l = C('lastlight iron worn', '#56585a'); tar = C('lastlight tar', '#2a2622')
brass = C('lastlight brass', '#b39146'); brass_d = C('lastlight brass dark', '#8a6d32'); copper = C('lastlight copper', '#a8643a'); tin = C('lastlight tin', '#9a9e9c')
pewter = C('lastlight pewter', '#8d918f'); pewter_d = C('lastlight pewter band', '#6d716f')
coal = C('lastlight coal', '#2a2624'); ember = C('lastlight embers', '#e05a2a', emit=1.2); fire = C('lastlight fire', '#ffa040', emit=1.6)
wax = C('lastlight candle wax', '#efe6c8'); flame = C('lastlight candle flame', '#ffc15a', emit=1.5); glow = C('lastlight lantern glow', '#ffd27a', emit=1.2)
glass = C('lastlight lamp glass', '#c8d8d4'); glass_g = C('lastlight bottle glass', '#7fa08a'); lensc = C('lastlight lens', '#b8d4dc', emit=.2)
velvet = C('lastlight velvet', '#7a2428')
rope = C('lastlight hemp rope', '#9a7a4a'); rope_d = C('lastlight hemp rope dark', '#6e5634'); rope_t = C('lastlight tarred rope', '#4a3a28')
wick = C('lastlight wick', '#ece4cc'); canvas = C('lastlight canvas', '#c8bc98'); oilskin = C('lastlight oilskin', '#d8a82a'); oilskin_d = C('lastlight oilskin fold', '#b88a1e')
net = C('lastlight net', '#5a5040'); float_c = C('lastlight cork float', '#b08a52')
wool = C('lastlight red wool', '#8a2a24'); wool_s = C('lastlight wool stripe', '#d8c8a0'); linen = C('lastlight linen', '#e3d7b6'); ticking = C('lastlight ticking', '#d6cdb2')
paper = C('lastlight parchment', '#d9c89a'); paper_l = C('lastlight parchment pale', '#e6d9b2'); ink = C('lastlight ink', '#1f1c1a')
bookc = [C('lastlight book red', '#7a2e25'), C('lastlight book blue', '#2f4d6b'), C('lastlight book green', '#3f5e37'), C('lastlight book brown', '#5e3f26')]
bread = C('lastlight bread crust', '#c08a4a'); score = C('lastlight bread score', '#e6c98e'); fish = C('lastlight smoked fish', '#a0783c'); fish_d = C('lastlight fish back', '#6a5030')
plate_c = C('lastlight plate', '#d8d0bc'); plate_w = C('lastlight plate well', '#c8bea8'); jug_c = C('lastlight jug glaze', '#5a7a8a'); jug_in = C('lastlight jug inside', '#2a2a2a')
dial = C('lastlight dial', '#ece6d4'); needle = C('lastlight needle', '#2a2420'); mercury = C('lastlight mercury', '#b8bcc0')
water = C('lastlight water', '#4f6a72'); leather = C('lastlight leather', '#5a3a22'); stencil = C('lastlight stencil', '#2a2622')

CX, CZ = 1.0, -1.0                                                           # the tower's centre
AI = {0: 2.95, 1: 2.80, 2: 2.65}                                              # inner apothem per storey


def N(k):
    a = math.radians(45 * k); return (math.cos(a), math.sin(a))


def lp(k, u, a):
    """a plan point against tower face k: u along the face, a = the distance out from the tower's centre"""
    n = N(k); t = (-n[1], n[0])
    return (CX + n[0] * a + t[0] * u, CZ + n[1] * a + t[1] * u)


BOXF = {'b': (0, 1, 5, 4), 't': (3, 7, 6, 2), 'f': (0, 3, 2, 1), 'k': (4, 5, 6, 7), 'l': (0, 4, 7, 3), 'r': (1, 2, 6, 5)}


def lbox(A, k, u0, u1, y0, y1, a0, a1, m, skip=''):
    """a box against tower face k (a0 < a1: the front toward the room at a0, the back toward the wall at a1)"""
    P = lambda u, y, a: (lp(k, u, a)[0], y, lp(k, u, a)[1])
    V_ = [P(u0, y0, a0), P(u1, y0, a0), P(u1, y1, a0), P(u0, y1, a0), P(u0, y0, a1), P(u1, y0, a1), P(u1, y1, a1), P(u0, y1, a1)]
    A.poly(V_, [BOXF[s] for s in 'btfklr' if s not in skip], m)


def quad(A, c, right, up, hw, hh, m):
    c, r, u = Vector(c), Vector(right), Vector(up)
    A.poly([tuple(c - r * hw - u * hh), tuple(c + r * hw - u * hh), tuple(c + r * hw + u * hh), tuple(c - r * hw + u * hh)], [(0, 1, 2, 3)], m)


# ============================================================== small designed pieces
def candlestick(A, x, z, y, metal, h=.14):
    """a turned candlestick (foot, stem, drip pan), its candle and a crossed flame"""
    A.lathe(x, z, y, [(.05, 0), (.05, .012), (.018, .03), (.014, .09), (.032, .1), (.03, .11)], 6, metal, top=True)
    A.lathe(x, z, y + .11, [(.016, 0), (.016, h), (.012, h + .006)], 6, wax, top=True)
    b = y + .11 + h
    for a in (0, math.pi / 2):
        cc, s_ = math.cos(a) * .012, math.sin(a) * .012
        A.poly([(x - cc, b + .01, z - s_), (x + cc, b + .01, z + s_), (x, b + .065, z)], [(0, 1, 2)], flame)


def tome(A, x, z, y, w, d, t, cover, page, rot=0.0):
    """a closed book lying flat (one rotation convention throughout: T.closed_book puts a turned book's spine on the
    wrong side)"""
    c, s_ = math.cos(rot), math.sin(rot)
    A.rbox(x, z, w, d, y, y + .006, rot, cover)
    A.rbox(x + .004 * c, z - .004 * s_, w - .015, d - .012, y + .006, y + t - .006, rot, page)
    A.rbox(x, z, w, d, y + t - .006, y + t, rot, cover)
    a = -w / 2 + .006
    A.rbox(x + a * c, z - a * s_, .012, d, y + .006, y + t - .006, rot, cover)


def hourglass(A, x, z, y, h, wood, rot=0.0):
    """an hourglass: two turned end boards, three spindles, the lower bulb full of sand, the upper run low"""
    r = h * .32
    for yy in (y, y + h * .92):
        A.lathe(x, z, yy, [(r, 0), (r, h * .08)], 6, wood, top=True, rot=rot)
    for i in range(3):
        a = rot + i * 2 * math.pi / 3
        A.tube((x + math.cos(a) * r * .8, y + h * .08, z + math.sin(a) * r * .8), (x + math.cos(a) * r * .8, y + h * .92, z + math.sin(a) * r * .8), h * .03, 5, wood, caps=False)
    A.lathe(x, z, y + h * .08, [(r * .6, 0), (r * .62, h * .12), (r * .1, h * .42)], 6, paper, top=False, rot=rot)
    A.lathe(x, z, y + h * .5, [(r * .1, 0), (r * .62, h * .3), (r * .6, h * .42)], 6, glass, top=False, rot=rot)


def coil(A, x, z, y, r_out, turns, th, m, hole=None, end=None):
    """a coil of rope: stacked turns stepping in as they rise, the hole in the middle, the loose end trailing (end =
    the plan direction it runs off in)"""
    prof = []
    for k in range(turns):
        rr = r_out - k * th * .55
        prof += [(rr - th * .15, k * th * .85), (rr, k * th * .85 + th * .45)]
    H = turns * th * .85 + th * .1
    rin = max(.03, r_out - turns * th * .55 - th)
    prof += [(r_out - (turns - 1) * th * .55 - th * .2, H), (rin, H)]
    A.lathe(x, z, y, prof, 10, m, top=True, top_m=hole or m)
    if end is not None:
        ex, ez = end
        p0 = (x + ex * (r_out - .02), y + th * .4, z + ez * (r_out - .02))
        p1 = (x + ex * (r_out + .22) - ez * .08, y + th * .45, z + ez * (r_out + .22) + ex * .08)
        A.tube(p0, p1, th * .45, 5, m)


def cask_x(A, x0, x1, cy, cz, r, tap_side=-1):
    """an oil cask lying along x: bellied staves, two pairs of hoops, board heads, a brass tap on one head"""
    L = x1 - x0; n = 10
    prof = [(.88, 0), (.97, .2), (1.0, .5), (.97, .8), (.88, 1.0)]
    rings = []
    for pr, t in prof:
        rings.append([(x0 + L * t, cy + r * pr * math.cos(2 * math.pi * i / n + .3), cz + r * pr * math.sin(2 * math.pi * i / n + .3)) for i in range(n)])
    for j in range(len(rings) - 1):
        for i in range(n):
            A.poly([rings[j][i], rings[j][(i + 1) % n], rings[j + 1][(i + 1) % n], rings[j + 1][i]], [(0, 1, 2, 3)], staves[i % 3])
    for rg, m in ((rings[0], heads[0]), (rings[-1], heads[1])):
        A.poly(rg, [tuple(range(n))], m)
    for t0 in (.12, .83):
        rr = r * (.88 + .12 * math.sin(math.pi * (t0 + .03))) + .03
        A.tube((x0 + L * t0, cy, cz), (x0 + L * (t0 + .05), cy, cz), rr, n, iron, caps=False)
    hx = x0 if tap_side < 0 else x1
    s = -1 if tap_side < 0 else 1
    A.tube((hx - s * .01, cy - r * .45, cz), (hx + s * .09, cy - r * .45, cz), .022, 6, brass)
    A.tube((hx + s * .07, cy - r * .45, cz), (hx + s * .07, cy - r * .45 - .07, cz), .014, 6, brass)
    A.box(hx + s * .06, hx + s * .08, cy - r * .45 + .02, cy - r * .45 + .06, cz - .03, cz + .03, brass_d)


def crate(A, x0, x1, y0, y1, z0, z1, board, batten, lid=True, fill=None):
    """a crate of deal boards: the body, its board joints drawn on the sides, corner battens, a rim round the top, a
    lid of three boards (or open, the packing showing: fill)"""
    e = .035
    A.box(x0 + .012, x1 - .012, y0, y1 - (.02 if lid else .03), z0 + .012, z1 - .012, board, skip='b' if lid or fill is None else 'bt')
    h = y1 - y0
    for t in (.36, .68):                                                                  # board joints, 4 mm proud
        yy = y0 + h * t
        for (a, b, c, d) in (((x0 + e, z0 + .008), (x1 - e, z0 + .008), None, 'z'), ((x0 + e, z1 - .008), (x1 - e, z1 - .008), None, 'z'),
                             ((x0 + .008, z0 + e), (x0 + .008, z1 - e), None, 'x'), ((x1 - .008, z0 + e), (x1 - .008, z1 - e), None, 'x')):
            A.poly([(a[0], yy, a[1]), (b[0], yy, b[1]), (b[0], yy + .012, b[1]), (a[0], yy + .012, a[1])], [(0, 1, 2, 3)], batten)
    for cx in (x0, x1 - e):
        for cz in (z0, z1 - e):
            A.box(cx, cx + e, y0, y1, cz, cz + e, batten, skip='b')
    for (a0, a1, c0, c1) in ((x0 + e, x1 - e, z0, z0 + .02), (x0 + e, x1 - e, z1 - .02, z1), (x0, x0 + .02, z0 + e, z1 - e), (x1 - .02, x1, z0 + e, z1 - e)):
        A.box(a0, a1, y1 - .06, y1 - .01, c0, c1, batten)
    if lid:
        w = (x1 - x0 - .01) / 3
        for k in range(3):
            A.box(x0 + .005 + k * w + .004, x0 + .005 + (k + 1) * w - .004, y1 - .02, y1 + .01, z0 + .015, z1 - .015, board, skip='b')
    elif fill is not None:
        A.poly([(x0 + .02, y1 - .03, z0 + .02), (x1 - .02, y1 - .03, z0 + .02), (x1 - .02, y1 - .03, z1 - .02), (x0 + .02, y1 - .03, z1 - .02)], [(0, 1, 2, 3)], fill)


def plate_up(A, c, face, r, m, well):
    """a plate standing on its edge in a rack, leaning back a little, its face turned to face (plan unit vector): a
    rim ring, the sunk well, a back"""
    f = Vector((face[0], 0, face[1])).normalized(); side = Vector((-f.z, 0, f.x)); up = Vector((0, 1, 0))
    lean = math.radians(10)
    nrm = (f * math.cos(lean) + up * math.sin(lean)).normalized(); upv = (up * math.cos(lean) - f * math.sin(lean)).normalized()
    ctr = Vector(c) + up * r * math.cos(lean)
    n = 10
    ring = lambda rr, off: [tuple(ctr + nrm * off + (side * math.cos(2 * math.pi * i / n) + upv * math.sin(2 * math.pi * i / n)) * rr) for i in range(n)]
    o, i_, w, b = ring(r, .0), ring(r * .62, -.006), ring(r * .62, -.006), ring(r * .9, -.014)
    A.poly(o + i_, [(k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n)], m)
    A.poly(w, [tuple(range(n))], well)
    A.poly(o + b, [(k, n + k, n + (k + 1) % n, (k + 1) % n) for k in range(n)] + [tuple(range(2 * n - 1, n - 1, -1))], m)


def jug(A, x, z, y, h, body, inside, rot=0.0):
    """a jug: a round belly, a waisted neck, a lip with a pinched spout, a strap handle"""
    A.lathe(x, z, y, [(h * .26, 0), (h * .4, h * .3), (h * .34, h * .62), (h * .2, h * .82), (h * .25, h)], 8, body, top=True, top_m=inside, rot=rot)
    sx, sz = _rot(h * .24, 0, rot, x, z); tx, tz = _rot(h * .36, 0, rot, x, z)
    lx, lz = _rot(h * .2, h * .09, rot, x, z); rx_, rz = _rot(h * .2, -h * .09, rot, x, z)
    A.poly([(lx, y + h, lz), (tx, y + h * 1.04, tz), (rx_, y + h, rz), (sx, y + h * .9, sz)], [(0, 1, 3), (1, 2, 3)], body)
    hx, hz = _rot(-h * .3, 0, rot, x, z)
    arc(A, hx, y + h * .6, hz, h * .2, -math.pi * .55, math.pi * .45, rot + math.pi, h * .05, h * .03, body, segs=4)


def lamp_chimney(A, x, z, y, h, m):
    """a lamp's glass chimney: a flared foot, the bulge, a long neck"""
    A.lathe(x, z, y, [(h * .15, 0), (h * .18, h * .1), (h * .25, h * .3), (h * .14, h * .55), (h * .12, h)], 8, m, top=False)


def oil_can(A, x, z, y, h, body, rot=0.0, spout=True):
    """a feeder can: a round body with a shoulder, a long spout, a strap handle"""
    A.lathe(x, z, y, [(h * .42, 0), (h * .45, h * .1), (h * .45, h * .62), (h * .2, h * .82), (h * .1, h * .9)], 8, body, top=True, rot=rot)
    c, s_ = math.cos(rot), math.sin(rot)
    if spout:
        A.tube((x + c * h * .3, y + h * .7, z + s_ * h * .3), (x + c * h * .95, y + h * 1.05, z + s_ * h * .95), h * .05, 5, body, r2=h * .025)
    arc(A, x - c * h * .45, y + h * .5, z - s_ * h * .45, h * .22, -math.pi * .5, math.pi * .5, rot + math.pi, h * .06, h * .04, body, segs=4)


def funnel(A, x, z, y, r, m):
    A.lathe(x, z, y, [(r * .15, 0), (r * .15, r * .5), (r, r * 1.3), (r * 1.02, r * 1.4)], 8, m, top=False)


def shears(A, x, z, y, rot, m):
    """wick-trimming shears lying open: two blades crossing at the pivot, ring handles"""
    c, s_ = math.cos(rot), math.sin(rot)
    P = lambda a, b: (x + a * c - b * s_, y + .004, z + a * s_ + b * c)
    for sg in (1, -1):
        A.poly([P(0, 0), P(.13, sg * .025), P(.13, sg * .01)], [(0, 1, 2)], m)
        A.beam(P(0, 0), P(-.07, sg * .03), .01, .006, m)
        hx, hz = P(-.1, sg * .04)[0], P(-.1, sg * .04)[2]
        A.lathe(hx, hz, y, [(.025, 0), (.025, .008), (.015, .008), (.015, 0)], 6, m, top=False)


def spyglass(A, a, d, m, band):
    """a brass spyglass lying collapsed: three stepped draws, dark bands, an eyepiece"""
    a, d = Vector(a), Vector(d).normalized()
    A.tube(tuple(a), tuple(a + d * .22), .03, 8, m)
    A.tube(tuple(a + d * .22), tuple(a + d * .3), .025, 8, m)
    A.tube(tuple(a + d * .3), tuple(a + d * .36), .02, 8, m)
    for t, r in ((.01, .036), (.2, .036)):
        A.tube(tuple(a + d * t), tuple(a + d * (t + .02)), r, 8, band, caps=False)


def hand_bell(A, x, z, y, h, m, handle):
    """the watch bell: a flared brass bell, a turned wooden handle"""
    A.lathe(x, z, y, [(h * .42, 0), (h * .4, h * .06), (h * .3, h * .2), (h * .24, h * .5), (h * .12, h * .6)], 8, m, top=True)
    A.lathe(x, z, y + h * .6, [(h * .06, 0), (h * .09, h * .15), (h * .06, h * .3), (h * .08, h * .4), (0, h * .45)], 6, handle)


def lantern_st(A, x, z, y, h=.3):
    """a storm lantern: T.lantern lit"""
    T.lantern(A, x, z, y, iron, glow, h=h)


# ============================================================== storm store (tower ground)
S = Part('Lastlight_FurnishingPropsStore')


def casks(A):
    """three casks of lamp oil lying on a cradle (sleepers and rails), each with its tap to the west, a drip trough
    under the taps and a feeder can in it"""
    for z in (-1.75, -1.0, -.25):
        A.box(3.18, 3.82, 0, .16, z - .07, z + .07, oak_d, skip='b')                    # sleepers
        for x in (3.3, 3.7):
            A.poly([(x - .05, .16, z - .07), (x + .05, .16, z - .07), (x + .05, .16, z + .07), (x - .05, .16, z + .07), (x, .28, z)], [(0, 4, 1), (1, 4, 2), (2, 4, 3), (3, 4, 0)], oak)
    for x in (3.25, 3.75):
        A.box(x - .04, x + .04, .16, .24, -2.1, .1, oak, skip='b')                       # rails
    for z in (-1.75, -1.0, -.25):
        cask_x(A, 3.15, 3.85, .62, z, .3, tap_side=-1)
    A.box(2.98, 3.14, 0, .06, -1.95, -.05, tin, skip='bt')                                # the drip trough
    A.poly([(2.99, .03, -1.94), (3.13, .03, -1.94), (3.13, .03, -.06), (2.99, .03, -.06)], [(0, 1, 2, 3)], tar)
    oil_can(A, 3.05, -1.35, .03, .18, copper, rot=math.pi)


S.obj(casks)


def rack(A):
    """the peg rack on the south wall: trestle ends, a peg rail, a shelf; hung with the keeper's oilskin and sou'wester,
    a net with cork floats, coils of rope and hanks of wick; wick rolls and a spare chimney on the shelf"""
    for x in (.075, 1.925):
        for z in (1.3, 1.8):
            A.box(x - .03, x + .03, .06, 1.62, z - .03, z + .03, oak_d, skip='b')
        A.box(x - .04, x + .04, 0, .06, 1.25, 1.85, oak_d, skip='b')                     # the foot
        A.box(x - .025, x + .025, 1.52, 1.58, 1.32, 1.78, oak_d)                         # the end's top rail (the peg rail rests in it)
        A.box(x - .02, x + .02, .95, 1.0, 1.32, 1.78, oak_d)
    A.box(.105, 1.895, .45, .5, 1.25, 1.85, oak, skip='lr')                              # the shelf
    A.tube((.1, 1.55, 1.55), (1.9, 1.55, 1.55), .03, 6, oak_l, caps=False)                 # the peg rail
    pegs = [.35, .75, 1.1, 1.4, 1.7]
    for x in pegs:
        A.tube((x, 1.55, 1.55), (x, 1.49, 1.4), .012, 5, oak_d)
    # the oilskin coat on the first peg: a tapered body, sleeves, a collar
    cx = .35; zc = 1.46
    body = [(cx - .17, 1.46, zc - .05), (cx + .17, 1.46, zc - .05), (cx + .24, .82, zc - .09), (cx - .24, .82, zc - .09),
            (cx - .17, 1.46, zc + .05), (cx + .17, 1.46, zc + .05), (cx + .24, .82, zc + .09), (cx - .24, .82, zc + .09)]
    A.poly(body, [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (3, 2, 6, 7), (0, 3, 7, 4)], oilskin)
    for s in (-1, 1):
        A.tube((cx + s * .15, 1.42, zc), (cx + s * .22, .98, zc - .02), .05, 6, oilskin_d, r2=.055)
    A.lathe(cx, zc, 1.44, [(.1, 0), (.08, .06)], 6, oilskin_d, top=False)
    A.lathe(cx + .02, zc - .02, 1.48, [(.16, 0), (.12, .04), (.09, .06), (.08, .13), (0, .15)], 8, oilskin, rot=.3)    # sou'wester on the peg
    # the net draped over the rail with its floats
    for zz, sg in ((1.52, -1), (1.58, 1)):
        A.poly([(.62, 1.58, 1.55), (.9, 1.58, 1.55), (.93, .78, zz + sg * .06), (.59, .8, zz + sg * .06)], [(0, 1, 2, 3)], net)
    for i in range(4):
        A.tube((.62 + i * .1, .84, 1.49), (.62 + i * .1, .84, 1.43), .025, 6, float_c)
    fn = lambda y: 1.55 - .09 * (1.58 - y) / .78 - .005                                   # the front sheet, 5 mm out: the mesh
    for k in range(4):
        for sg in (1, -1):
            xa = .64 + k * .08 if sg > 0 else .88 - k * .08
            ya, yb = 1.56, .84
            xb = xa + sg * .1
            o = .0 if sg > 0 else -.004                                                     # the two ways 4 mm apart
            A.poly([(xa, ya, fn(ya) + o), (xa + .008, ya, fn(ya) + o), (xb + .008, yb, fn(yb) + o), (xb, yb, fn(yb) + o)], [(0, 1, 2, 3)], rope_d)
    # coils of rope hanging on pegs
    for x, rr, m, zz in ((1.1, .2, rope, 1.58), (1.4, .17, rope_t, 1.5)):
        T.rim_ring(A, Vector((x, 1.49 - rr, zz)), Vector((0, 0, 1)), Vector((1, 0, 0)), Vector((0, 1, 0)), rr - .045, rr, .035, 10, m)
    # hanks of wick
    for dx in (-.03, .03):
        A.tube((1.7 + dx, 1.5, 1.55), (1.7 + dx * 2, .95, 1.55), .02, 5, wick, r2=.028)
    A.lathe(1.7, 1.55, .92, [(.05, 0), (.03, .05)], 6, wick, top=False)
    # on the shelf: wick rolls and a spare chimney
    for i, x in enumerate((.3, .5, 1.3)):
        A.tube((x, .5 + .045, 1.35), (x, .5 + .045, 1.75), .045, 8, wick, caps=True, cap_m=canvas)
    lamp_chimney(A, 1.65, 1.55, .5, .28, glass)


S.obj(rack)


def barrels(A):
    """a cask of lamp oil with a tin funnel on it; a water butt with a dipper"""
    T.barrel(A, -.8, .8, 0, .3, .8, staves, iron, heads, n=10, rot=.3, bung=brass)
    funnel(A, -.72, .78, .78, .08, tin)
    T.barrel(A, -1.05, .3, 0, .26, .7, staves, iron, heads, n=10, rot=1.1, open_top=True, fill=water)
    A.tube((-1.05, .7, .22), (-.95, .9, .12), .012, 5, oak_d)
    A.lathe(-1.07, .24, .64, [(.035, 0), (.05, .05)], 8, oak_l, top=True, top_m=water)


S.obj(barrels)
S.obj(coil, 2.75, .75, 0, .38, 4, .07, rope_t, rope_d, end=(-.6, -.8))


def crates(A):
    """a slatted crate of spare lamp glass, a smaller crate on it marked for glass, a storm lantern on top"""
    crate(A, 2.45, 3.05, 0, .6, -3.05, -2.45, drift, oak_d)
    crate(A, 2.53, 2.97, .61, 1.0, -2.95, -2.55, drift, oak_d)
    A.poly([(2.72, .7, -2.542), (2.78, .7, -2.542), (2.8, .86, -2.542), (2.7, .86, -2.542)], [(0, 1, 2, 3)], stencil)
    lantern_st(A, 2.75, -2.75, 1.01, .3)


S.obj(crates)


def lens_case(A):
    """the spare lens: a brass-bound walnut case on a crate, its lid open against the wall, the lens on a velvet bed"""
    crate(A, -1.0, -.4, 0, .5, -3.0, -2.4, drift, oak_d)
    x0, x1, z0, z1, y0, y1 = -.95, -.45, -2.9, -2.5, .51, .66
    A.box(x0, x1, y0, y1, z0, z1, oak_d, skip='b')
    for x in (x0 - .006, x1 - .024):
        for z in (z0 - .006, z1 - .024):
            A.box(x, x + .03, y0 + .02, y1 + .006, z, z + .03, brass)
    A.poly([(x0 + .03, y1 + .004, z0 + .03), (x1 - .03, y1 + .004, z0 + .03), (x1 - .03, y1 + .004, z1 - .03), (x0 + .03, y1 + .004, z1 - .03)], [(0, 1, 2, 3)], velvet)
    A.lathe(-.7, -2.7, y1 + .008, [(.15, 0), (.15, .012), (.1, .03), (0, .036)], 12, lensc)
    T.rim_ring(A, Vector((-.7, y1 + .014, -2.7)), Vector((0, 1, 0)), Vector((1, 0, 0)), Vector((0, 0, 1)), .148, .165, .01, 12, brass)
    th = math.radians(105)                                                               # the lid, hinged on the north edge
    L = z1 - z0; V_ = []
    for x in (x0, x1):
        for d in (0, L):
            V_.append((x, y1 + math.sin(th) * d, z0 + math.cos(th) * d))
    V_ = [V_[0], V_[2], V_[3], V_[1]]
    W_ = [(p[0], p[1] + .02 * math.cos(th), p[2] - .02 * math.sin(th)) for p in V_]
    A.poly(V_ + W_, [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], oak_d)


S.obj(lens_case)
S.build(root)

# ============================================================== keeper wing: forge, anvil, coil, tar barrel
W = Part('Lastlight_FurnishingPropsWing')


def forge(A):
    """a small stone forge on the north wall: coursed stone base, a sandstone hearth, an iron fire pot of glowing coals,
    the hood over it built into the forge, hand bellows on the hearth, tongs and a poker leaning on it"""
    zb = -1.81
    A.box(-4.45, -3.35, 0, .36, zb, -1.3, stone[0], skip='bt')
    A.box(-4.44, -3.36, .36, .7, zb, -1.31, stone[1])
    A.box(-4.5, -3.3, .7, .82, -1.82, -1.25, sandst)
    A.lathe(-3.9, -1.55, .82, [(.2, 0), (.22, .05), (.2, .08)], 8, iron, top=True, top_m=coal)
    A.lathe(-3.9, -1.55, .9, [(.14, 0), (.06, .04)], 8, ember, top=True)
    for a in (0, math.pi / 2):
        cc, s_ = math.cos(a) * .06, math.sin(a) * .06
        A.poly([(-3.9 - cc, .9, -1.55 - s_), (-3.9 + cc, .9, -1.55 + s_), (-3.9, 1.08, -1.55)], [(0, 1, 2)], fire)
    # the hood: a stone cowl narrowing to the flue, on two iron brackets from the hearth's back corners
    hb = [(-4.45, 1.3, -1.81), (-3.35, 1.3, -1.81), (-3.35, 1.3, -1.35), (-4.45, 1.3, -1.35), (-4.2, 2.3, -1.81), (-3.6, 2.3, -1.81), (-3.6, 2.3, -1.7), (-4.2, 2.3, -1.7)]
    A.poly(hb, [(4, 7, 6, 5), (3, 2, 6, 7), (0, 3, 7, 4), (1, 5, 6, 2)], stone[2])
    A.box(-4.47, -3.33, 1.24, 1.3, -1.81, -1.33, sandst)
    for x in (-4.4, -3.4):
        A.box(x - .015, x + .015, .82, 1.24, -1.76, -1.73, iron)
    # bellows on the hearth's west end, tongs and a poker leaning on the forge's east side
    A.poly([(-4.44, .826, -1.45), (-4.3, .826, -1.35), (-4.2, .826, -1.45), (-4.3, .826, -1.62)], [(0, 1, 2, 3)], oak)
    A.poly([(-4.44, .87, -1.45), (-4.3, .87, -1.35), (-4.2, .87, -1.45), (-4.3, .87, -1.62)], [(0, 1, 2, 3)], oak)
    A.poly([(-4.44, .826, -1.45), (-4.3, .826, -1.35), (-4.3, .87, -1.35), (-4.44, .87, -1.45)], [(0, 1, 2, 3)], leather)
    A.poly([(-4.3, .826, -1.35), (-4.2, .826, -1.45), (-4.2, .87, -1.45), (-4.3, .87, -1.35)], [(0, 1, 2, 3)], leather)
    A.tube((-4.3, .848, -1.62), (-4.3, .848, -1.74), .012, 5, brass)
    for dz, top in ((-.02, (-3.28, .78, -1.42)), (.06, (-3.27, .8, -1.36))):
        A.beam((-3.15, .0, -1.4 + dz), top, .02, .015, iron)


W.obj(forge)


def anvil_stump(A):
    """a bench anvil on a stump, a hammer on its face"""
    T.stump(A, -3.0, -1.55, 0, .55, .17, bark, endg)
    x, z, y = -3.0, -1.55, .55
    A.box(x - .1, x + .1, y, y + .04, z - .07, z + .07, iron, skip='b')                      # foot
    A.poly([(x - .07, y + .04, z - .045), (x + .07, y + .04, z - .045), (x + .07, y + .04, z + .045), (x - .07, y + .04, z + .045),
            (x - .1, y + .14, z - .06), (x + .09, y + .14, z - .06), (x + .09, y + .14, z + .06), (x - .1, y + .14, z + .06)],
           [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)], iron)                   # waist
    A.box(x - .12, x + .1, y + .14, y + .19, z - .06, z + .06, iron_l)                       # face
    A.poly([(x + .1, y + .15, z - .045), (x + .1, y + .15, z + .045), (x + .1, y + .19, z + .045), (x + .1, y + .19, z - .045), (x + .25, y + .185, z)],
           [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4)], iron)                                # horn
    A.box(x - .17, x - .12, y + .15, y + .19, z - .04, z + .04, iron)                        # heel
    T.hammer(A, -3.06, -1.62, y + .19, .6, oak_l, iron)


W.obj(anvil_stump)
W.obj(coil, -4.35, -.95, 0, .37, 3, .085, rope, rope_d, end=(.2, .98))


def tar_barrel(A):
    """a barrel of tar with its brush, for the rope and the boat"""
    T.barrel(A, -4.45, 2.3, 0, .28, .9, staves, iron, heads, n=10, rot=.5, open_top=True, fill=tar)
    A.tube((-4.4, .84, 2.28), (-4.3, 1.15, 2.2), .014, 5, oak_l)
    A.lathe(-4.41, 2.285, .82, [(.03, 0), (.035, .06)], 6, tar, top=True)


W.obj(tar_barrel)
W.build(root)

# ------------------------------------------------------------- the repair workbench (service, name kept)
R = Part('Lastlight_ServiceStores_Workbench')


def workbench(A):
    """a stout bench, a vice, a lamp burner being mended with its glass chimney off, wick rolls, trimming shears, an oil
    can and a funnel; the tool board on the wall; tins under the bench"""
    x0, x1, z0, z1, t = -4.6, -2.4, 3.2, 3.78, .9
    for x in (-4.52, -2.48):
        for z in (3.26, 3.72):
            A.box(x - .05, x + .05, 0, t - .08, z - .05, z + .05, oak_d, skip='bt')
    A.box(-4.47, -2.53, .18, .24, 3.25, 3.73, oak, skip='lr')                          # the shelf under it
    A.box(-4.47, -2.53, t - .16, t - .08, 3.22, 3.76, oak_d, skip='btwe')               # apron
    T.plank_top(A, x0, x1, z0, z1, t - .08, t, [oak, oak_l, oak], along='x', n=3, under=oak_d)
    # the vice on the east end
    A.box(-2.86, -2.62, t, t + .12, 3.26, 3.4, iron)
    A.box(-2.86, -2.62, t + .02, t + .12, 3.2, 3.24, iron)
    A.tube((-2.74, t + .07, 3.2), (-2.74, t + .07, 3.08), .012, 5, iron)
    A.tube((-2.84, t + .07, 3.09), (-2.64, t + .07, 3.09), .009, 5, iron)
    # a lamp burner being mended, its chimney beside it
    A.lathe(-3.55, 3.45, t, [(.08, 0), (.08, .02), (.06, .04), (.06, .09), (.075, .1), (.05, .12)], 8, brass, top=True)
    A.box(-3.57, -3.53, t + .12, t + .17, 3.43, 3.47, wick)
    A.tube((-3.55, t + .08, 3.39), (-3.55, t + .08, 3.35), .02, 6, brass_d)
    lamp_chimney(A, -3.25, 3.5, t, .3, glass)
    for i, x in enumerate((-4.35, -4.22)):                                                  # wick rolls
        A.tube((x, t + .04, 3.3), (x, t + .04, 3.46), .04, 8, wick, caps=True, cap_m=canvas)
    shears(A, -3.95, 3.35, t, .5, iron)
    oil_can(A, -4.05, 3.6, t, .2, copper, rot=-.8)
    funnel(A, -3.8, 3.62, t, .07, tin)
    # the tool board on the wall: a board on battens, pegs, the tools hung on it
    A.box(-4.55, -2.45, 1.25, 2.2, 3.765, 3.8, oak_d, skip='k')
    for y in (1.3, 2.15):
        A.box(-4.5, -2.5, y - .03, y + .03, 3.745, 3.765, oak, skip='k')
    zf = 3.738
    tools = [('shears', -4.35), ('pliers', -4.05), ('hammer', -3.75), ('file', -3.45), ('iron', -3.1), ('file', -2.8)]
    for kind, x in tools:
        A.tube((x, 1.95, 3.765), (x, 1.95, 3.72), .01, 5, oak_d)
        if kind in ('shears', 'pliers'):
            for sg in (-1, 1):
                A.poly([(x, 1.93, zf), (x + sg * .035, 1.6, zf), (x + sg * .018, 1.6, zf)], [(0, 1, 2)], iron)
                if kind == 'pliers':
                    A.poly([(x, 1.93, zf), (x + sg * .02, 2.02, zf), (x + sg * .005, 2.03, zf)], [(0, 1, 2)], iron)
        elif kind == 'hammer':
            A.box(x - .012, x + .012, 1.5, 1.93, zf - .01, zf, oak_l)
            A.box(x - .06, x + .06, 1.87, 1.93, zf - .03, zf, iron)
        elif kind == 'file':
            A.box(x - .012, x + .012, 1.72, 1.93, zf - .01, zf, oak_l)
            A.box(x - .016, x + .016, 1.5, 1.72, zf - .006, zf, iron_l)
        else:                                                                                # the soldering iron
            A.box(x - .014, x + .014, 1.78, 1.93, zf - .014, zf, oak_l)
            A.box(x - .005, x + .005, 1.55, 1.78, zf - .01, zf, iron)
            A.box(x - .03, x + .03, 1.5, 1.56, zf - .03, zf, copper)
    # tins under the bench
    for x, h in ((-4.2, .14), (-3.9, .12), (-3.1, .16)):
        A.lathe(x, 3.5, .24, [(.07, 0), (.07, h), (.06, h + .01)], 8, tin, top=True)


R.obj(workbench)


def stores(A):
    """east of the bench: a crate of spare chimneys packed in straw, a crate with two oil cans on it, a box of lantern
    panes on a crate; the wall shelf of oil cans and wick jars (a service part: the cutaway keeps it whole)"""
    for (x, z) in ((-2.0, 3.5), (-2.0, 2.95), (-1.5, 3.5)):
        crate(A, x - .22, x + .22, 0, .45, z - .2, z + .2, drift, oak_d, lid=(x, z) != (-2.0, 3.5), fill=canvas if (x, z) == (-2.0, 3.5) else None)
    for i, (dx, dz) in enumerate(((-.08, -.07), (.07, -.05), (-.02, .08), (.1, .09))):
        lamp_chimney(A, -2.0 + dx, 3.5 + dz, .38, .18, glass)
    oil_can(A, -2.1, 2.9, .46, .2, copper, rot=2.5)
    oil_can(A, -1.93, 3.02, .46, .17, tin, rot=1.2, spout=False)
    A.box(-1.72, -1.28, .46, .5, 3.3, 3.7, oak_d)                                            # the box of panes
    for x in (-1.72, -1.3):
        A.box(x, x + .02, .5, .9, 3.3, 3.7, oak)
    for i in range(4):
        A.box(-1.66 + i * .1, -1.64 + i * .1, .5, .86, 3.34, 3.66, glass)
    A.box(-1.2, -1.12, 1.2, 1.96, 2.2, 3.7, oak_d, skip='k')                                # the wall shelf
    for yy in (1.3, 1.7):
        A.box(-1.45, -1.2, yy, yy + .04, 2.2, 3.7, oak, skip='r')
        for z, kind in ((2.4, 'can'), (2.75, 'jar'), (3.1, 'can'), (3.45, 'jar')) if yy < 1.5 else ((2.45, 'jar'), (2.9, 'bottle'), (3.35, 'jar')):
            if kind == 'can':
                oil_can(A, -1.32, z, yy + .04, .18, copper if z < 3 else tin, rot=math.pi, spout=False)
            elif kind == 'jar':
                A.lathe(-1.32, z, yy + .04, [(.06, 0), (.07, .1), (.05, .16), (.055, .18)], 6, glass_g, top=True, top_m=wick)
            else:
                A.lathe(-1.32, z, yy + .04, [(.05, 0), (.05, .14), (.02, .2), (.02, .24)], 6, glass_g, top=True, top_m=leather)


R.obj(stores)
R.build(root)

# ============================================================== keeper's room (3 m)
F1 = 3.0
K = Part('Lastlight_UpperFurnishingPropsKeeper')
K.obj(T.bed, 0, 2.0, .95, 1.72, F1, oak, oak_d, ticking, linen, wool, linen, head='e', post_h=1.0, foot_h=.7, patch=[wool, wool_s, wool])


def table(A):
    """the keeper's table: a smoked fish on a plate, a loaf, a tankard, a candlestick, a folded letter; a stool under"""
    x0, x1, z0, z1, t = -1.58, -.92, -1.6, -.4, F1 + .8
    for x in (x0 + .06, x1 - .06):
        for z in (z0 + .06, z1 - .06):
            T.oct_prism(A, x, z, .035, .035, F1, t - .05, oak_d)
    A.box(x0 + .04, x1 - .04, t - .14, t - .05, z0 + .04, z1 - .04, oak_d, skip='bt')
    T.plank_top(A, x0, x1, z0, z1, t - .05, t, [oak, oak_l, oak], along='z', n=3, under=oak_d)
    T.at(A, F1, T.stool, -1.3, -1.35, .42, .14, oak_l, oak_d, rot=.4)


K.obj(table)
ty1 = F1 + .8


def supper(A):
    PP.plate(A, -1.25, -1.15, ty1 + .004, .12, plate_c, plate_w)
    ellipsoid(A, -1.25, ty1 + .03, -1.15, .1, .025, .035, fish, seg=8, rings=4, rot=.3, flat=ty1 + .012)
    A.poly([(-1.16, ty1 + .035, -1.12), (-1.1, ty1 + .035, -1.08), (-1.12, ty1 + .035, -1.15)], [(0, 1, 2)], fish_d)


K.obj(supper)
K.obj(T.loaf, -1.4, -.72, ty1, .18, .13, .09, bread, score, rot=.6)
K.obj(PP.tankard, -1.1, -.6, ty1, .14, pewter, pewter_d, rot=.9)
K.obj(candlestick, -1.42, -1.47, ty1, brass, h=.12)


def letter(A):
    A.rbox(-1.12, -1.48, .16, .11, ty1, ty1 + .004, .4, paper_l)
    A.lathe(-1.12, -1.48, ty1 + .006, [(.014, 0), (.014, .005)], 6, wool, top=True)


K.obj(letter)


def stove(A):
    """a pot-bellied iron stove on three feet, the fire door glowing, a kettle on the top plate, the flue up and into
    the south-west wall"""
    x, z = -.65, .65
    for i in range(3):
        a = i * 2 * math.pi / 3 + .5
        A.beam((x + math.cos(a) * .18, F1 + .12, z + math.sin(a) * .18), (x + math.cos(a) * .27, F1, z + math.sin(a) * .27), .05, .05, iron)
    A.lathe(x, z, F1 + .1, [(.2, 0), (.27, .1), (.3, .3), (.27, .52), (.29, .56), (.3, .62), (.3, .66)], 10, iron, top=True, rot=math.radians(9))
    nx, nz = .707, -.707                                                                  # the fire door, on the face toward the room
    ra = .288 * math.cos(math.radians(18))
    quad(A, (x + nx * (ra + .004), F1 + .32, z + nz * (ra + .004)), (-nz, 0, nx), (0, 1, 0), .07, .07, iron_l)
    quad(A, (x + nx * (ra + .008), F1 + .3, z + nz * (ra + .008)), (-nz, 0, nx), (0, 1, 0), .045, .03, ember)
    A.lathe(x, z, F1 + .76, [(.07, 0), (.07, 1.02)], 8, iron, top=True)                   # flue
    A.tube((x, F1 + 1.72, z), (x - .5, F1 + 2.05, z + .5), .07, 8, iron)
    A.lathe(x + .08, z - .05, F1 + .76, [(.08, 0), (.1, .06), (.09, .12), (.05, .15), (.03, .17)], 8, copper, top=True)   # kettle
    A.tube((x + .16, F1 + .82, z - .05), (x + .25, F1 + .9, z - .05), .015, 5, copper, r2=.008)
    arc(A, x + .08, F1 + .92, z - .05, .06, 0, math.pi, 0, .012, .012, iron, segs=4)


K.obj(stove)


def sea_chest(A):
    """an iron-bound sea chest, a sou'wester and a ditty box on its lid"""
    T.at(A, F1, T.chest, 3.28, 3.76, -.69, .11, .57, oak, oak_d, iron, brass, front='w')


K.obj(sea_chest)
K.obj(lambda A: A.lathe(3.5, -.45, F1 + .585, [(.16, 0), (.12, .04), (.09, .06), (.08, .13), (0, .15)], 8, oilskin, rot=.3))
K.obj(lambda A: A.rbox(3.52, -.02, .2, .14, F1 + .585, F1 + .66, .3, oak_l))


def dresser(A):
    """the keeper's dresser against the north-west wall (where a shelf hung): a cupboard with two doors, a worktop, a
    plate rack with plates, mugs on hooks, a jug, a ship in a bottle, a tide table pinned to its side"""
    k = 5; a0, a1 = 2.5, 2.8; u0, u1 = -.9, .9
    lbox(A, k, u0, u0 + .04, F1, F1 + .78, a0, a1, oak, skip='bk'); lbox(A, k, u1 - .04, u1, F1, F1 + .78, a0, a1, oak, skip='bk')
    lbox(A, k, u0 + .04, u1 - .04, F1, F1 + .06, a0 + .01, a1, oak_d, skip='bklr')
    for i in range(2):
        a = u0 + .04 + i * .88 + .004; b = a + .88 - .008
        lbox(A, k, a, b, F1 + .08, F1 + .74, a0 + .01, a0 + .03, oak_l, skip='k')
        lbox(A, k, a + .08, b - .08, F1 + .16, F1 + .66, a0 + .005, a0 + .01, oak, skip='k')
        p0 = lp(k, (a + b) / 2 + (.34 if i == 0 else -.34), a0 + .02); p1 = lp(k, (a + b) / 2 + (.34 if i == 0 else -.34), a0 - .01)
        A.tube((p0[0], F1 + .45, p0[1]), (p1[0], F1 + .45, p1[1]), .015, 5, brass)
    lbox(A, k, u0 + .04, u1 - .04, F1 + .74, F1 + .78, a0 + .03, a1, oak_d, skip='klr')
    lbox(A, k, u0 - .01, u1 + .01, F1 + .78, F1 + .82, a0 - .005, a1, oak, skip='k')         # worktop
    lbox(A, k, u0, u0 + .04, F1 + .82, F1 + 1.82, a0 + .14, a1, oak, skip='bkt'); lbox(A, k, u1 - .04, u1, F1 + .82, F1 + 1.82, a0 + .14, a1, oak, skip='bkt')
    lbox(A, k, u0 + .04, u1 - .04, F1 + .82, F1 + 1.82, a1 - .02, a1, oak_d, skip='bklrt')
    for y in (F1 + 1.2, F1 + 1.52):
        lbox(A, k, u0 + .04, u1 - .04, y - .025, y, a0 + .15, a1 - .02, oak_l, skip='klr')
    lbox(A, k, u0, u1, F1 + 1.82, F1 + 1.86, a0 + .12, a1, oak_d, skip='k')
    n = N(k); tv = Vector((-n[1], 0, n[0])); nin = Vector((-n[0], 0, -n[1]))
    for i, u in enumerate((-.6, -.3, 0, .3, .6)):                                            # plates standing in the rack
        c = lp(k, u, a1 - .08)
        plate_up(A, (c[0], F1 + 1.2 + .003, c[1]), (-n[0], -n[1]), .1, plate_c if i % 2 else jug_c, plate_w)
    for u in (-.2, .02):                                                                     # two mugs on the worktop
        c = lp(k, u, a0 + .12)
        A.lathe(c[0], c[1], F1 + .82, [(.035, 0), (.04, .08), (.038, .1)], 6, jug_c if u < 0 else plate_c, top=True, top_m=jug_in)
    c = lp(k, -.55, a0 + .15)
    jug(A, c[0], c[1], F1 + .82, .24, jug_c, jug_in, rot=.5)
    c = lp(k, .35, a0 + .15)                                                                 # a ship in a bottle, lying in its cradle
    A.box(c[0] - .1, c[0] + .1, F1 + .82, F1 + .85, c[1] - .03, c[1] + .03, oak_d)
    e = Vector((c[0], F1 + .9, c[1]))
    A.tube(tuple(e - tv * .14), tuple(e + tv * .1), .05, 8, glass_g)
    A.tube(tuple(e + tv * .1), tuple(e + tv * .17), .02, 6, glass_g)
    A.tube(tuple(e + tv * .17), tuple(e + tv * .19), .022, 6, oak_l)
    A.poly([tuple(e - tv * .08 + Vector((0, -.02, 0)) + nin * .054), tuple(e + tv * .06 + Vector((0, -.02, 0)) + nin * .054), tuple(e + Vector((0, .04, 0)) + nin * .054)], [(0, 1, 2)], linen)
    c = lp(k, u1 + .004, a0 + .16)                                                           # the tide table on the rack's side
    p = lp(k, u1 + .004, a0 + .3)
    A.poly([(c[0], F1 + 1.3, c[1]), (p[0], F1 + 1.3, p[1]), (p[0], F1 + 1.62, p[1]), (c[0], F1 + 1.62, c[1])], [(0, 1, 2, 3)], paper_l)


K.obj(dresser)


def weather_case(A):
    """a narrow weather case standing where the barometer hung: short legs, a case with a round barometer dial (brass
    bezel, face, needle) and a thermometer below it, a small drawer"""
    k = 1; a0, a1 = 2.52, 2.8; u0, u1 = -.18, .18
    for u in (u0 + .03, u1 - .03):
        for a in (a0 + .03, a1 - .03):
            p = lp(k, u, a)
            A.box(p[0] - .02, p[0] + .02, F1 + .03, F1 + .2, p[1] - .02, p[1] + .02, oak_d, skip='bt')
            A.box(p[0] - .024, p[0] + .024, F1, F1 + .03, p[1] - .024, p[1] + .024, brass, skip='b')
    lbox(A, k, u0, u1, F1 + .2, F1 + 1.66, a0, a1, oak, skip='k')
    lbox(A, k, u0 - .01, u1 + .01, F1 + 1.66, F1 + 1.72, a0 - .01, a1, oak_d, skip='k')
    n = N(k); nin = Vector((-n[0], 0, -n[1])); tv = Vector((-n[1], 0, n[0]))
    fc = lp(k, 0, a0)
    c = Vector((fc[0], F1 + 1.35, fc[1]))
    ring = lambda r, off: [tuple(c + nin * off + (tv * math.cos(2 * math.pi * i / 12) + Vector((0, 1, 0)) * math.sin(2 * math.pi * i / 12)) * r) for i in range(12)]
    A.poly(ring(.15, .004), [tuple(range(12))], brass)
    A.poly(ring(.125, .008), [tuple(range(12))], dial)
    quad(A, c + nin * .012 + Vector((0, .04, 0)) + tv * .02, tv * .5 + Vector((0, .866, 0)), tv * -.866 + Vector((0, .5, 0)), .005, .05, needle)
    quad(A, c + nin * .004 + Vector((0, -.42, 0)), tv, (0, 1, 0), .03, .2, dial)
    quad(A, c + nin * .008 + Vector((0, -.44, 0)), tv, (0, 1, 0), .006, .16, mercury)
    quad(A, c + nin * .004 + Vector((0, -.88, 0)), tv, (0, 1, 0), .12, .05, oak_l)
    quad(A, c + nin * .008 + Vector((0, -.88, 0)), tv, (0, 1, 0), .02, .01, brass)


K.obj(weather_case)
K.build(root)

# ============================================================== watch room (6 m)
F2 = 6.0
Wt = Part('Lastlight_UpperFurnishingPropsWatch')


def log_desk(A):
    """the watch desk on the north wall: slab ends, a top, a gallery of log books at the back; on it the logbook open
    with the day's entries, inkwell and quill, the spyglass, the watch bell, the half-hour glass, a lantern (one
    object: the gallery stands higher than the writing top, so what lies on the top is part of the desk)"""
    x0, x1, z0, z1, t = .2, 1.8, -3.57, -2.95, F2 + .82
    for x in (x0 + .01, x1 - .11):
        A.box(x, x + .1, F2, t - .04, z0 + .02, z1 - .02, oak_d, skip='bt')
    A.box(x0 + .11, x1 - .11, F2 + .12, F2 + .18, z0 + .2, z0 + .26, oak_d, skip='lr')        # the stretcher
    A.box(x0, x1, t - .04, t, z0, z1, oak)
    A.box(x0 + .02, x1 - .02, t, t + .22, z0, z0 + .14, oak_d, skip='b')                     # the gallery
    y = t
    r = random.Random(4)
    x = x0 + .06
    while x < x1 - .12:
        w = r.uniform(.05, .08); h = r.uniform(.14, .2)
        A.box(x, x + w, t + .22, t + .22 + h, z0 + .02, z0 + .12, bookc[int(x * 10) % 4], skip='b')
        x += w + .005
    T.open_book(A, .85, -3.12, t, .42, .28, bookc[3], paper_l, ink=ink, rot=0.0, lines=6)
    T.inkwell(A, 1.2, -3.3, t, brass_d, ink)
    T.quill(A, 1.2, -3.3, t + .06, -.6, paper_l, paper)
    spyglass(A, (1.28, t + .03, -3.05), (1, 0, .25), brass, iron)
    hand_bell(A, 1.62, -3.12, t, .14, brass, oak_l)
    hourglass(A, .4, -3.1, t, .16, oak_d)
    lantern_st(A, .52, -3.32, t, .26)


Wt.obj(log_desk)


def oil_tank(A):
    """the lamp's oil tank on its cradle: a brass drum lying north-south, bands, a filler cap, a sight glass, a tap at
    the south end with a can under it"""
    x, y, z0, z1, r = -1.2, F2 + .75, -1.85, -.15, .38
    for z in (-1.6, -.4):
        A.box(x - .3, x + .3, F2, F2 + .5, z - .06, z + .06, oak_d, skip='b')
    A.tube((x, y, z0 + .05), (x, y, z1 - .05), r, 12, brass, caps=False)
    for zz in (z0, z1):
        s = 1 if zz > -1 else -1
        A.tube((x, y, zz - s * .05), (x, y, zz), r, 12, brass_d, r2=r * .92, caps=True)
    for zz in (-1.3, -.7):
        A.tube((x, y, zz - .025), (x, y, zz + .025), r + .012, 12, brass_d, caps=False)
    A.lathe(x, -1.0, y + r - .02, [(.07, 0), (.07, .1), (.09, .12), (.09, .15)], 8, iron, top=True)
    A.box(x + .35, x + .39, y - .22, y + .22, -1.05, -.99, brass_d)                          # sight glass
    A.poly([(x + .394, y - .18, -1.04), (x + .394, y - .18, -1.0), (x + .394, y + .18, -1.0), (x + .394, y + .18, -1.04)], [(0, 1, 2, 3)], glass)
    A.tube((x + .15, y - .2, z1 + .01), (x + .15, y - .2, z1 + .09), .025, 6, brass)
    A.tube((x + .15, y - .22, z1 + .07), (x + .15, y - .3, z1 + .07), .018, 6, brass)


Wt.obj(oil_tank)


def wick_cabinet(A):
    """the wick cabinet in the north-east corner: a tall case of small drawers with brass pulls, a roll of wick and the
    trimming shears on top"""
    x0, x1, z0, z1 = 2.35, 2.85, -2.81, -2.39
    A.box(x0, x1, F2, F2 + 1.34, z0, z1, oak, skip='b')
    A.box(x0 - .01, x1 + .01, F2 + 1.34, F2 + 1.38, z0 - .01, z1 + .01, oak_d)
    rows = 6
    for rw in range(rows):
        for cl in range(2):
            y0 = F2 + .08 + rw * .205; xa = x0 + .03 + cl * .225
            A.box(xa, xa + .21, y0, y0 + .19, z1, z1 + .01, oak_l, skip='n')
            A.tube((xa + .105, y0 + .095, z1 + .01), (xa + .105, y0 + .095, z1 + .03), .012, 5, brass)
    A.tube((2.52, F2 + 1.42, -2.68), (2.52, F2 + 1.42, -2.52), .04, 8, wick, caps=True, cap_m=canvas)
    shears(A, 2.68, -2.6, F2 + 1.38, 2.2, iron)


Wt.obj(wick_cabinet)


def oil_cans(A):
    """the watch room's oil cans by the ladder: a tall feeder can, a round can, a brass filler jug"""
    oil_can(A, -.72, .52, F2, .3, copper, rot=-.6)
    A.lathe(-.54, .7, F2, [(.1, 0), (.11, .02), (.11, .2), (.06, .26), (.04, .3)], 8, tin, top=True, top_m=iron)
    arc(A, -.54, F2 + .26, .7, .07, 0, math.pi, .4, .012, .012, iron, segs=4)
    jug(A, -.46, .47, F2, .2, brass, iron, rot=-.8)


Wt.obj(oil_cans)
Wt.build(root)

# ============================================================== outside (on the island ground)
P_ = {'x': 121, 'y': 17.8, 'z': 26}
TER = json.loads((ROOT / '.studio-workspaces/holm-overhaul-terrain-v2/working/assets/world/authoring/holm-overhaul.terrain.bundle.json').read_text())


def ground(x, z):
    """the terrain the island stands on now (v2 land), as the extractor triangulates it, lastlight-local"""
    t = TER; S_ = t['width'] + 1
    wx, wz = x + P_['x'], z + P_['z']; ix, iz = math.floor(wx), math.floor(wz); fx, fz = wx - ix, wz - iz
    h = lambda a, b: t['heights'][b * S_ + a]
    if fx + fz <= 1:
        y = h(ix, iz) + (h(ix + 1, iz) - h(ix, iz)) * fx + (h(ix, iz + 1) - h(ix, iz)) * fz
    else:
        y = h(ix + 1, iz + 1) + (h(ix, iz + 1) - h(ix + 1, iz + 1)) * (1 - fx) + (h(ix + 1, iz) - h(ix + 1, iz + 1)) * (1 - fz)
    return y - P_['y']


Y = Part('Lastlight_Yard')


def porch_crates(A):
    """two crates by the storm porch, a coil of rope on them"""
    for (x, z) in ((-5.9, -1.75), (-6.35, -1.45)):
        g = min(ground(x - .3, z - .25), ground(x + .3, z + .25), ground(x - .3, z + .25), ground(x + .3, z - .25))
        crate(A, x - .3, x + .3, g - .01, g + .49, z - .25, z + .25, drift, oak_d)
    g = ground(-6.1, -1.6)
    coil(A, -6.12, -1.6, g + .5, .23, 3, .06, rope, rope_d)


Y.obj(porch_crates)


def creel(A):
    """a lobster creel: a slatted base, three withy hoops, netting over them, the entrance funnel at the west end (its
    east end stops short of the stance beside it)"""
    x0, x1, zc = -6.45, -5.78, -2.3
    g = min(ground(x0, zc), ground(x1, zc))
    for dz in (-.2, 0, .2):
        A.box(x0, x1, g, g + .03, zc + dz - .05, zc + dz + .05, withy, skip='b')
    for x in (x0 + .05, (x0 + x1) / 2, x1 - .05):
        arc(A, x, g + .03, zc, .25, 0, math.pi, math.pi / 2, .025, .025, withy, segs=6)
    n = 6
    for i in range(n):
        a0, a1 = math.pi * i / n, math.pi * (i + 1) / n
        p = lambda x, a: (x, g + .03 + math.sin(a) * .245, zc + math.cos(a) * .245)
        A.poly([p(x0 + .05, a0), p(x1 - .05, a0), p(x1 - .05, a1), p(x0 + .05, a1)], [(0, 1, 2, 3)], net)
    for x, s in ((x0 + .05, 1), (x1 - .05, -1)):
        A.poly([(x, g + .03 + math.sin(math.pi * i / 8) * .245, zc + math.cos(math.pi * i / 8) * .245) for i in range(9)], [tuple(range(9))], net)
    A.tube((x0 + .06, g + .15, zc), (x0 + .24, g + .15, zc), .09, 6, rope_d, caps=False, r2=.05)


Y.obj(creel)
for (x, z) in ((-5.7, 4.6), (-4.9, 4.75)):
    def delivery(A, x=x, z=z):
        """a crate of deliveries off the boat"""
        g = min(ground(x - .28, z - .25), ground(x + .28, z + .25), ground(x - .28, z + .25), ground(x + .28, z - .25))
        crate(A, x - .28, x + .28, g - .01, g + .44, z - .25, z + .25, drift, oak_d)
        A.poly([(x - .1, g + .12, z + .255), (x + .1, g + .12, z + .255), (x + .1, g + .3, z + .255), (x - .1, g + .3, z + .255)], [(0, 1, 2, 3)], stencil)
    Y.obj(delivery)


def rain_butt(A):
    """the rain butt at the wing's corner, the downpipe from the gutter running down into it"""
    x, z = -.42, 4.55
    g = min(ground(x, z - .3), ground(x, z + .3), ground(x - .3, z), ground(x + .3, z))
    T.barrel(A, x, z, g - .02, .32, .95, staves, iron, heads, n=10, rot=.2, open_top=True, fill=water)
    px, pz = -.6, 4.33
    A.tube((px, g + .88, pz), (px, 2.56, pz), .045, 8, iron)
    A.tube((px, 2.56, pz), (px, 2.6, pz - .1), .045, 8, iron)
    A.tube((px, g + .88, pz), (px + .08, g + .8, pz + .1), .045, 8, iron)
    for yy in (1.2, 2.0):
        A.box(px - .06, px + .06, yy, yy + .03, pz - .06, pz - .045, iron)


Y.obj(rain_butt)
Y.build(root)

print('[LASTLIGHT_PROPS_TRIS]', json.dumps(TRIS))
PK.save(SP, ROOT)
