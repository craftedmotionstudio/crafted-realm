"""Creakwheel Mill props pass (owner, 2026-09-28: "props ... blocky -> redo in Blender purposefully"; "every object in every
building reviewed in Blender"). The mill grinds the island's grain; the bakehouse bakes with its flour.

From the model the island loads (holm-mill-glazed-review4-v2/mill.blend, Blender 4.5), the three prop parts the v1
build drew as boxes and a pyramid are designed again, each in its old footprint (the stones' tun keeps its 1 m radius
round the same centre, the bin its box, every sack its spot), so the same tiles stay blocked and the graph is unchanged:
 - Mill_FurnishingStones (the 'Inspect millstones' service; name kept): the hurst frame (four dressed posts, two head
   beams, knee braces); the tun, a staved wooden casing with a rim, round the runner stone, whose dressed face shows
   its eye, the rynd and the furrows; the hopper hung from the head beams, grain heaped in it, the shoe below it
   trickling grain into the eye; the meal spout on the tun's side with a sack tied under it catching the flour; the
   stone dresser's mill bill and thrift laid on the tun rim. (Before: a plain drum, a disc, a slab on four sticks,
   a five-sided pyramid.)
 - Mill_FurnishingStore (the 'Search grain bin' service; name kept): the grain ark - corner posts, boarded sides, a
   divider for barley and wheat, one lid shut and one propped open against the wall, a scoop in the wheat; five
   flour sacks tied at the neck, each with a wooden tally tag (for the bakehouse); a two-wheeled sack truck with a
   sack on its nose plate. (Before: a plank box, 7-sided sack stubs, a box with a stick for a barrow.)
 - Mill_Dressing (outside): the spare runner stone leaning on the south wall, dressed in harps with its eye, on a
   chock; two flour sacks by the north door.
Plan coordinates (x east, y up, z south; Blender (x, -z, y)), mill-local (origin world (65, 3.2, 64)). Original designs.
Run through tools/rebuild_holm_props_pass.js mill (spec docs/rebuild/holm-overhaul/props-pass/mill.json)."""
import bpy, sys, math, random
from pathlib import Path
HERE = Path(__file__).resolve().parent; sys.path.insert(0, str(HERE)); ROOT = HERE.parents[1]
import holm_props_pass_kit as PK
from holm_props_pass_kit import C, Part
import holm_trade_props as T
from holm_purposeful_props import arc, ellipsoid

SP = PK.spec()
PK.begin()
rng = random.Random(64062)
root = PK.obj('mill')
PK.remove('Mill_FurnishingStones', 'Mill_FurnishingStore', 'Mill_Dressing')

oak = C('mill oak', '#6a4a2e', 'beam'); oak_l = C('mill oak light', '#7a5836', 'beam'); frame = C('mill frame oak', '#4a3321', 'beam')
plank = C('mill plank', '#7c5a38', 'beam'); plank_d = C('mill plank dark', '#6b4c2f', 'beam')
staves = [C('mill tun stave 1', '#6f4e30', 'beam'), C('mill tun stave 2', '#7d5a37', 'beam'), C('mill tun stave 3', '#664628', 'beam')]
stone = C('mill millstone', '#9d978a', 'rock'); stone_d = C('mill millstone furrow', '#5f5a52'); stone_eye = C('mill millstone eye', '#3b3833')
iron = C('mill iron', '#3c3b3a'); steel = C('mill steel', '#8d9396')
sackc = [C('mill flour sack', '#cbbf9f'), C('mill flour sack dusty', '#d6ccb2')]; twine = C('mill twine', '#8a6c44'); tag = C('mill tally tag', '#a07a4c')
wheat = C('mill wheat', '#c8a458'); barley = C('mill barley', '#d8c287'); flour = C('mill flour', '#efe9da')
cx, cz = .2, .4                     # the stones' centre (the old tun's)

# ======================================================= the millstones (service: Mill_FurnishingStones)
S = Part('Mill_FurnishingStones')


def hurst(A):
    """the hurst frame: four dressed posts, two head beams along the frame, knee braces"""
    for px in (-.75, 1.15):
        for pz in (-.14, .94):
            T.oct_prism(A, px, pz, .06, .06, 0, 1.86, frame)
        A.box(px - .07, px + .07, 1.86, 1.98, -.21, 1.01, frame)                             # head beam across each post pair
    for pz in (-.14, .94):
        A.box(-.82, 1.22, 1.98, 2.1, pz - .07, pz + .07, oak)                                  # the bearers the hopper hangs from
    for px, s in ((-.75, 1), (1.15, -1)):
        for pz in (-.14, .94):
            A.beam((px + s * .05, 1.45, pz), (px + s * .35, 1.84, pz), .06, .06, frame)       # knee braces


S.obj(hurst)


def tun(A):
    """the tun: a staved wooden casing round the stones, a rim board, two iron hoops; the runner stone's dressed face"""
    n = 16; r = 1.0
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        p0 = (cx + r * math.cos(a0), cz + r * math.sin(a0)); p1 = (cx + r * math.cos(a1), cz + r * math.sin(a1))
        A.poly([(p0[0], 0, p0[1]), (p1[0], 0, p1[1]), (p1[0], .55, p1[1]), (p0[0], .55, p0[1])], [(0, 3, 2, 1)], staves[i % 3])
    from mathutils import Vector
    T.rim_ring(A, Vector((cx, .575, cz)), Vector((0, 1, 0)), Vector((1, 0, 0)), Vector((0, 0, 1)), .86, r + .03, .025, n, oak_l)
    for y in (.12, .42):
        A.lathe(cx, cz, y, [(r + .012, 0), (r + .012, .05)], n, iron, top=False)
    # the runner stone inside: its face a little under the rim, the eye, the rynd, furrows swept round the eye
    A.lathe(cx, cz, .3, [(.82, 0), (.82, .25), (.8, .28)], 16, stone, top=True)
    A.lathe(cx, cz, .584, [(.13, 0)], 12, stone_eye, top=True)
    A.lathe(cx, cz, .58, [(.04, 0), (.04, .07)], 6, iron, top=True)
    for k in range(10):
        a = 2 * math.pi * k / 10
        x0, z0 = cx + math.cos(a) * .16, cz + math.sin(a) * .16
        x1, z1 = cx + math.cos(a + .35) * .76, cz + math.sin(a + .35) * .76
        ex, ez = -(z1 - z0), (x1 - x0); el = math.hypot(ex, ez); ex, ez = ex / el * .015, ez / el * .015
        A.poly([(x0 - ex, .585, z0 - ez), (x1 - ex, .585, z1 - ez), (x1 + ex, .585, z1 + ez), (x0 + ex, .585, z0 + ez)], [(0, 1, 2, 3)], stone_d)
    # the meal spout out of the casing's south side, a sack tied under it
    a = math.pi / 3; ox, oz = cx + math.cos(a), cz + math.sin(a)
    A.beam((ox - math.cos(a) * .08, .4, oz - math.sin(a) * .08), (ox + math.cos(a) * .14, .3, oz + math.sin(a) * .14), .11, .09, oak)


S.obj(tun)


def hopper(A):
    """the hopper hung from the bearers: a tapering box of boards, grain heaped in it, the shoe feeding the eye"""
    x0, x1, z0, z1 = -.35, .75, -.05, .85
    yt, yb = 2.1, 1.42
    b = .13
    V_ = [(x0, yt, z0), (x1, yt, z0), (x1, yt, z1), (x0, yt, z1), (cx - b, yb, cz - b), (cx + b, yb, cz - b), (cx + b, yb, cz + b), (cx - b, yb, cz + b)]
    for q, m in (((0, 1, 5, 4), plank), ((1, 2, 6, 5), plank_d), ((2, 3, 7, 6), plank), ((3, 0, 4, 7), plank_d)):
        A.poly(V_, [q], m)
    for (a0, a1, c0, c1) in ((x0 - .03, x1 + .03, -.2, z0 + .03), (x0 - .03, x1 + .03, z1 - .03, 1.0)):
        A.box(a0, a1, yt + .004, yt + .06, c0, c1, oak)                                        # rim flanges lying on the bearers
    for (a0, a1) in ((x0 - .03, x0 + .03), (x1 - .03, x1 + .03)):
        A.box(a0, a1, yt + .004, yt + .056, z0 + .035, z1 - .035, oak)
    A.poly([(x0 + .06, yt - .06, z0 + .06), (x1 - .06, yt - .06, z0 + .06), (x1 - .06, yt - .06, z1 - .06), (x0 + .06, yt - .06, z1 - .06), (cx, yt + .05, cz)],
           [(0, 4, 1), (1, 4, 2), (2, 4, 3), (3, 4, 0)], wheat)                                # the grain, heaped
    A.lathe(cx, cz, yb - .1, [(.05, 0), (.07, .1)], 6, plank_d, top=False)                     # the throat
    A.beam((cx, yb - .1, cz), (cx + .02, .78, cz + .1), .1, .06, oak_l)                        # the shoe, sloping to the eye
    A.tube((cx + .02, .8, cz + .1), (cx, .6, cz), .012, 4, wheat)                              # grain trickling into the eye
    A.beam((cx + .12, 1.2, cz), (cx + .1, .7, cz + .05), .025, .025, frame)                    # the damsel that knocks the shoe


S.obj(hopper)


def meal_sack(A):
    """a sack tied under the meal spout, its mouth open, flour rising in it"""
    a = math.pi / 3; sx, sz = cx + math.cos(a) * 1.2, cz + math.sin(a) * 1.2
    A.lathe(sx, sz, 0, [(.16, 0), (.2, .06), (.21, .2), (.17, .3), (.13, .36), (.15, .4)], 8, sackc[1], top=False, rot=.3)
    A.lathe(sx, sz, .33, [(.13, 0)], 8, flour, top=True)
    A.lathe(sx, sz, .3, [(.15, 0), (.15, .03)], 8, twine, top=False)


S.obj(meal_sack)


def mill_bill(A):
    """the stone dresser's mill bill in its thrift, laid on the tun rim"""
    y = .6
    A.tube((cx - .95, y + .03, cz - .12), (cx - .7, y + .03, cz - .2), .022, 6, oak_l)
    A.beam((cx - .7, y + .03, cz - .3), (cx - .7, y + .03, cz - .1), .05, .05, oak_l)
    A.beam((cx - .7, y + .03, cz - .36), (cx - .7, y + .03, cz - .04), .03, .012, steel)


S.obj(mill_bill)
S.build(root)

# ======================================================= the grain ark, sacks and sack truck (service: Mill_FurnishingStore)
B = Part('Mill_FurnishingStore')
X0, X1, Z0, Z1, H = 2.4, 3.55, -3.5, -1.6, 1.1


def ark(A):
    """the grain ark: corner posts, boarded sides, a divider (barley one side, wheat the other), a lid shut over the
    barley, the wheat lid propped open against the wall, a scoop in the wheat"""
    for px in (X0, X1):
        for pz in (Z0, Z1):
            T.oct_prism(A, px, pz, .05, .05, .02, H + .04, frame)
    for k in range(3):
        y0, y1 = .05 + k * .35, .05 + (k + 1) * .35 - .012
        m = (plank, plank_d, plank)[k]
        A.box(X0 + .04, X1 - .04, y0, y1, Z0 - .02, Z0 + .02, m); A.box(X0 + .04, X1 - .04, y0, y1, Z1 - .02, Z1 + .02, m)
        A.box(X0 - .02, X0 + .02, y0, y1, Z0 + .04, Z1 - .04, m); A.box(X1 - .02, X1 + .02, y0, y1, Z0 + .04, Z1 - .04, m)
    zm = (Z0 + Z1) / 2
    A.box(X0 + .02, X1 - .02, .05, H - .02, zm - .02, zm + .02, plank_d)                        # the divider
    A.box(X0 - .03, X1 + .03, H, H + .045, Z0 - .03, zm + .01, oak)                             # barley lid, shut
    A.box(X0 - .01, X1 + .01, H + .045, H + .06, Z0 + .15, Z0 + .25, oak_l)                     # its batten
    # wheat side: grain near the top, the lid swung up on the back (east) edge, leaning on the wall
    A.poly([(X0 + .03, H - .12, zm + .03), (X1 - .03, H - .12, zm + .03), (X1 - .03, H - .12, Z1 - .03), (X0 + .03, H - .12, Z1 - .03), ((X0 + X1) / 2, H - .04, (zm + Z1) / 2)],
           [(0, 4, 1), (1, 4, 2), (2, 4, 3), (3, 4, 0)], wheat)
    th_ = math.radians(100)                                                                 # swung past upright, leaning east
    hx = X1 + .03
    L = X1 - X0 + .06
    dx, dy = -math.cos(th_), math.sin(th_)
    V_ = [(hx, H + .02, zm + .03), (hx, H + .02, Z1 + .03), (hx + dx * L, H + .02 + dy * L, Z1 + .03), (hx + dx * L, H + .02 + dy * L, zm + .03)]
    th = .045; nv = (dy, -dx)
    W_ = [(p[0] + nv[0] * th, p[1] + nv[1] * th, p[2]) for p in V_]
    A.poly(V_ + W_, [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], oak)
    # the scoop in the wheat
    A.lathe(3.05, -2.1, H - .1, [(.05, 0), (.08, .06), (.085, .08)], 8, oak_l, top=False)
    A.tube((3.05, H - .05, -2.18), (3.05, H + .02, -2.4), .015, 5, oak_l)


B.obj(ark)


def flour_sack(A, x, z, w, h, rot, k):
    T.sack(A, x, z, 0, w, h, sackc[k % 2], twine, rot=rot, slump=.02 * (1 - 2 * (k % 2)))
    ty = h * .8; tx, tz = x + math.cos(rot) * w * .24, z + math.sin(rot) * w * .24
    A.tube((x, ty + .03, z), (tx, ty - .02, tz), .006, 4, twine)
    A.rbox(tx + math.cos(rot) * .012, tz + math.sin(rot) * .012, .01, .07, ty - .1, ty - .02, rot, tag)   # the tally tag


for k, (sx, sz) in enumerate(((2.9, 1.2), (3.2, 1.8), (2.7, 2.4), (3.25, 2.9), (-2.2, 3.0))):
    B.obj(flour_sack, sx, sz, .46, .74, k * .7 + .4, k)


def sack_truck(A):
    """a two-wheeled sack truck parked on its nose plate, its handles up to the north, a sack loaded on it"""
    nz = 2.42
    A.box(-2.42, -1.98, .045, .057, nz - .16, nz + .02, iron)                                  # nose plate
    for sx in (-2.36, -2.04):
        A.beam((sx, .02, nz), (sx, 1.08, 1.28), .04, .04, oak)                                  # the two rails
    for t in (.3, .62, .92):
        y = .02 + (1.08 - .02) * t; z = nz + (1.28 - nz) * t
        A.box(-2.36, -2.04, y - .02, y + .02, z - .02, z + .02, oak_l)                          # cross bars
    A.beam((-2.42, 1.08, 1.28), (-1.98, 1.08, 1.28), .045, .045, oak_l)                        # the grip
    for sx in (-2.46, -1.94):                                                                  # iron-shod wheels behind the plate
        A.tube((sx - .025, .15, nz - .1), (sx + .025, .15, nz - .1), .15, 10, oak_d_wheel)
        A.tube((sx - .03, .15, nz - .1), (sx + .03, .15, nz - .1), .155, 10, iron, caps=False)
    A.tube((-2.49, .15, nz - .1), (-1.91, .15, nz - .1), .018, 6, iron)                          # the axle
    T.sack(A, -2.2, nz - .18, .02, .36, .6, sackc[0], twine, rot=1.9, slump=-.06)


oak_d_wheel = C('mill wheel oak', '#553a24', 'beam')
B.obj(sack_truck)
B.build(root)

# ======================================================= outside: the spare runner stone, sacks by the door
D = Part('Mill_Dressing')
Zw = 4.0                                                                                    # the south wall's face


def spare_stone(A):
    """the spare runner stone leaning on the south wall: a thick disc, its eye, its face dressed in harps, on a chock"""
    from mathutils import Vector
    c = Vector((1.0, .78, 4.39)); lean = math.radians(8)
    nv = Vector((0, math.sin(lean), 1)).normalized()                                          # the dressed face looks south, a little up
    u = Vector((1, 0, 0)); w = nv.cross(u).normalized()
    n = 16; r = .74; th = .12
    ring = lambda rr, o: [tuple(c + nv * o + (u * math.cos(2 * math.pi * i / n) + w * math.sin(2 * math.pi * i / n)) * rr) for i in range(n)]
    fo, bo, fi, bi = ring(r, th), ring(r, -th), ring(.14, th), ring(.14, -th)
    V_ = fo + bo + fi + bi
    F = []
    for i in range(n):
        j = (i + 1) % n
        F += [(i, j, n + j, n + i)]                                                          # the rim
        F += [(i, 2 * n + i, 2 * n + j, j)]                                                  # the face, round the eye
        F += [(n + i, n + j, 3 * n + j, 3 * n + i)]                                          # the back
        F += [(2 * n + i, 3 * n + i, 3 * n + j, 2 * n + j)]                                  # the eye's bore
    A.poly(V_, F, stone)
    # harps: four quarters of parallel furrows on the face, 5 mm proud
    for q in range(4):
        base = q * math.pi / 2
        for k in range(3):
            a0 = base + .25 + k * .38
            p0 = c + nv * (th + .005) + (u * math.cos(a0) + w * math.sin(a0)) * .2
            d = u * math.cos(a0 + 1.1) + w * math.sin(a0 + 1.1)
            p1 = p0 + d * (.45 - k * .08); e = nv.cross(d).normalized() * .0125
            A.poly([tuple(p0 - e), tuple(p1 - e), tuple(p1 + e), tuple(p0 + e)], [(0, 1, 2, 3)], stone_d)
    A.box(.55, 1.45, 0, .07, 4.52, 4.66, frame)                                                # the chock at its foot


D.obj(spare_stone)
for k, (sx, sz) in enumerate(((3.3, -4.42), (3.75, -4.5))):
    D.obj(flour_sack, sx, sz, .48, .72, k * 1.3 + .2, k)
D.build(root)

PK.save(SP, ROOT)
