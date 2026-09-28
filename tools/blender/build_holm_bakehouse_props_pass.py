"""Bakehouse props pass (owner, 2026-09-28: "props ... blocky -> redo in Blender purposefully"; "every object in every
building reviewed in Blender"). Cook Hettie's bakehouse: flour, water, dough, the oven, loaves.

From the model the island loads (holm-kitchen-glazed-review4-v1/kitchen-character.blend, Blender 5.1), every prop part
of the v8 build is designed again in its old footprint (the same tiles stay blocked; the graph is proved identical) and
under its old name (the six stations keep their service prefixes and click boxes):
 hall
  - Kitchen_Worktable_Kneading: the kneading table - a planked top with breadboard ends, splayed legs, a stretcher;
    a floured board with shaped rolls, the rolling pin, two fresh loaves, a crock of flour; a drying rail on two posts
    rising from the table's ends with herbs hung to dry (the old pole floated over the table and was clipped away);
  - Kitchen_SupplyDoughBowl_Trough ('Take dough'): the dough trough - tapering staved sides, the dough rising under a
    damp cloth folded back at one end;
  - Kitchen_SupplyBuckets_Rack ('Take bucket'): a bucket bench - trestle ends, a plank shelf with three coopered
    buckets, a peg rail with two more hung by their bails;
  - Kitchen_SupplyWaterButt + Kitchen_SupplyWaterSurface ('Fill bucket with water'): a staved butt with two hoops on a
    low stand, its lid half across, a dipper hooked on the rim;
  - Kitchen_RecipeBoard_Board ('Read recipe'): a slate in an oak frame hung from a nail by a cord, the recipe chalked
    in lines with a loaf drawn under it;
  - Kitchen_Tools_Oven: the peel and the ash rake standing in a kindling box by the oven (the old ones leant alone
    and were clipped away);
  - Kitchen_Furnishings_Hall: the cooling bench under the south window with loaves on its slats and a basket of rolls
    below; the settle by the court window; meal sacks and a barrel under the stair; candlesticks and a crock on the
    mantel; (the lantern that hung on a chain and was clipped away is gone: the loft candle and the fire light the hall)
 store
  - Kitchen_Pantry_FlourBin ('Fill bucket with flour'): the flour hutch - panelled sides, the lid propped open on a
    stay, flour heaped in it, a scoop and a sieve;
  - Kitchen_Store_Shelves: the bread rack (four slatted shelves, cobs, long loaves and rolls), flour sacks, two grain
    barrels, the meal chest with crocks and a standing lantern;
 loft
  - Kitchen_UpperFurnishing_Loft: Hettie's box bed (a short bed boxed in on its wall side, bolster, quilt), a clothes
    chest, grain sacks, a stool with a candlestick;
  - Kitchen_UpperFurnishing_Rail: the loft balustrade (posts, handrail, mid rail, balusters);
 court
  - Kitchen_Court_DressingPropsWoodpile: the oven's firewood - split logs stacked in a crib between stakes, a
    chopping block with a hatchet (taken out of Kitchen_Court_Dressing, whose low walls and sign stay as they were).
Plan coordinates (x east, y up, z south; Blender (x, -z, y)), bakehouse-local. Original designs.
Run through tools/rebuild_holm_props_pass.js bakehouse (spec docs/rebuild/holm-overhaul/props-pass/bakehouse.json)."""
import bpy, sys, math, random
from pathlib import Path
from mathutils import Vector
HERE = Path(__file__).resolve().parent; sys.path.insert(0, str(HERE)); ROOT = HERE.parents[1]
import holm_props_pass_kit as PK
from holm_props_pass_kit import C, Part
import holm_trade_props as T
import holm_purposeful_props as PP
from holm_purposeful_props import arc, ellipsoid

SP = PK.spec()
PK.begin()
rng = random.Random(4467)
root = PK.obj('Kitchen_Root')
PK.remove('Kitchen_Furnishings_Hall', 'Kitchen_Worktable_Kneading', 'Kitchen_SupplyDoughBowl_Trough', 'Kitchen_SupplyBuckets_Rack',
          'Kitchen_SupplyWaterButt', 'Kitchen_SupplyWaterSurface', 'Kitchen_RecipeBoard_Board', 'Kitchen_Tools_Oven',
          'Kitchen_Pantry_FlourBin', 'Kitchen_Store_Shelves', 'Kitchen_UpperFurnishing_Loft', 'Kitchen_UpperFurnishing_Rail')
PK.drop('Kitchen_Court_Dressing', (4.8, 6.6, -.05, .75, .1, .85), expect=None)      # the woodpile (its walls and sign stay)

oak = [C('bake oak 1', '#7a5434', 'beam'), C('bake oak 2', '#6c4a2d', 'beam'), C('bake oak 3', '#86603c', 'beam')]
oak_d = C('bake oak dark', '#4e3622', 'beam'); endg = C('bake end grain', '#a88458', 'beam')
staves = [C('bake stave 1', '#7b5635', 'beam'), C('bake stave 2', '#6c4a2e', 'beam'), C('bake stave 3', '#85603b', 'beam')]
heads = [C('bake barrel head 1', '#8d6a44', 'beam'), C('bake barrel head 2', '#806040', 'beam')]
iron = C('bake iron', '#3a3a38'); brass = C('bake brass', '#b39146'); copper = C('bake copper', '#b0683c')
flour = C('bake flour', '#f0ead8'); flour2 = C('bake flour dust', '#ddd2b6'); dough = C('bake dough', '#e0c592')
crust = [C('bake crust 1', '#b8783c'), C('bake crust 2', '#a7652f'), C('bake crust 3', '#c98a4a')]; score = C('bake score', '#e6c98e')
cloth = [C('bake sackcloth 1', '#c4b184'), C('bake sackcloth 2', '#b09c70'), C('bake sackcloth 3', '#d3c29a')]; cord = C('bake cord', '#7a6440')
linen = C('bake linen', '#d9ceb2'); damp = C('bake damp cloth', '#cfc8b4'); straw = C('bake straw ticking', '#c9ae6d')
quilt = [C('bake quilt red', '#9a4a3a'), C('bake quilt cream', '#dccfae'), C('bake quilt green', '#7c9063'), C('bake quilt blue', '#6f7f9a')]
pottery = [C('bake crock', '#a0663e'), C('bake crock glaze', '#6f7d5c'), C('bake crock cream', '#d8c7a0')]
water = C('bake water', '#5f7f8c'); wax = C('bake candle wax', '#efe6c8'); cflame = C('bake candle flame', '#ffc15a', emit=1.5); lamp = C('bake lamp glow', '#ffd27a', emit=1.2)
greens = [C('bake herb 1', '#6f8a4a'), C('bake herb 2', '#8a9a55'), C('bake herb 3', '#5e7a44')]; stalk = C('bake herb stalk', '#7d7440'); wicker = C('bake wicker', '#a58352', 'beam')
slate = C('bake slate', '#3b4043'); chalk = C('bake chalk', '#e8e4d8'); bark = C('bake log bark', '#5a4330'); log_end = C('bake log end', '#c4a172'); split = C('bake split face', '#b08a5c', 'beam')
steel = C('bake steel', '#8d9396')


def herb_bunch(A, x, z, ytop, k):
    """a bunch of herbs hung head down to dry: the string, the tied stalks, leafy sprigs fanning down"""
    A.tube((x, ytop, z), (x, ytop - .1, z), .006, 4, cord)
    A.lathe(x, z, ytop - .16, [(.018, 0), (.024, .06)], 5, stalk, top=True)
    A.lathe(x, z, ytop - .14, [(.028, 0), (.028, .025)], 6, cord, top=False)
    for j in range(7):
        a = k + j * 2 * math.pi / 7; c, s_ = math.cos(a), math.sin(a)
        L = .26 + .06 * ((j + k) % 3) / 2; sp = .07 + .02 * (j % 2)
        top = (x + c * .012, ytop - .15, z + s_ * .012); tip = (x + c * sp, ytop - .15 - L, z + s_ * sp)
        mid = (x + c * sp * .7, ytop - .15 - L * .55, z + s_ * sp * .7); w = (-s_ * .03, c * .03)
        A.poly([top, (mid[0] + w[0], mid[1], mid[2] + w[1]), tip, (mid[0] - w[0], mid[1], mid[2] - w[1])], [(0, 1, 2, 3)], greens[(j + k) % 3])


def cob(A, x, z, y, r, m, rot=0.0):
    T.loaf(A, x, z, y, r * 2, r * 1.9, r * 1.1, m, score, rot=rot)


def long_loaf(A, x, z, y, l, m, rot=0.0):
    T.loaf(A, x, z, y, l, l * .42, l * .3, m, score, rot=rot)


def roll(A, x, z, y, r, m):
    ellipsoid(A, x, y + r * .5 + .004, z, r, r * .6, r, m, seg=7, rings=3, flat=y + .004)


# ======================================================= hall: the kneading table (with its herb rail)
TX0, TX1, TZ0, TZ1, TY = -2.9, -.9, -.95, -.15, .82
W = Part('Kitchen_Worktable_Kneading')


def worktable(A):
    """a planked top with breadboard ends on splayed legs, a stretcher; what is being worked on it; a drying rail on
    two posts rising from its ends, herbs hung from it"""
    T.plank_top(A, TX0 + .08, TX1 - .08, TZ0, TZ1, TY - .06, TY, [oak[2], oak[0], oak[2]], along='x', n=3, under=oak_d)
    for xa, xb in ((TX0, TX0 + .08), (TX1 - .08, TX1)):
        A.box(xa, xb, TY - .065, TY, TZ0, TZ1, oak_d)
    for x in (TX0 + .1, TX1 - .1):
        for z in (TZ0 + .1, TZ1 - .1):
            sx = -.04 if x < (TX0 + TX1) / 2 else .04; sz = -.03 if z < (TZ0 + TZ1) / 2 else .03
            A.beam((x, TY - .06, z), (x + sx, 0, z + sz), .08, .08, oak[1])
    A.box(TX0 + .12, TX1 - .12, .16, .22, (TZ0 + TZ1) / 2 - .035, (TZ0 + TZ1) / 2 + .035, oak[1])
    # the floured board at the west end, rolls shaped on it, the rolling pin
    A.box(TX0 + .15, TX0 + .95, TY + .004, TY + .03, TZ0 + .1, TZ1 - .1, oak[0])
    A.poly([(TX0 + .25, TY + .034, TZ0 + .2), (TX0 + .3, TY + .034, TZ1 - .18), (TX0 + .82, TY + .034, TZ1 - .2), (TX0 + .88, TY + .034, TZ0 + .22)], [(0, 1, 2, 3)], flour2)
    for i in range(4):
        roll(A, TX0 + .3 + i * .19, (TZ0 + TZ1) / 2 + (.08 if i % 2 else -.08), TY + .036, .065, dough)
    A.tube((TX0 + .22, TY + .05, TZ1 - .06), (TX0 + .62, TY + .05, TZ1 - .06), .026, 8, oak[2]); A.tube((TX0 + .16, TY + .05, TZ1 - .06), (TX0 + .22, TY + .05, TZ1 - .06), .014, 6, oak[2]); A.tube((TX0 + .62, TY + .05, TZ1 - .06), (TX0 + .68, TY + .05, TZ1 - .06), .014, 6, oak[2])
    for i in range(2):
        cob(A, TX0 + 1.08 + i * .24, TZ0 + .2, TY, .095, crust[i], rot=i)
    A.lathe(TX0 + 1.1, TZ1 - .2, TY, [(.07, 0), (.1, .06), (.11, .12), (.09, .14), (.1, .15)], 10, pottery[0], top=True, top_m=flour)
    # the drying rail: two posts from the floor at the table's ends, a rail at 2.35, herbs hung in bunches
    for x in (TX0 + .02, TX1 - .02):
        T.oct_prism(A, x, (TZ0 + TZ1) / 2, .04, .04, 0, 2.35, oak_d)
    A.box(TX0 - .02, TX1 + .02, 2.35, 2.41, (TZ0 + TZ1) / 2 - .03, (TZ0 + TZ1) / 2 + .03, oak[1])
    for i in range(6):
        x = TX0 + .3 + i * .28; z = (TZ0 + TZ1) / 2
        herb_bunch(A, x, z, 2.35, i)


W.obj(worktable)
W.build(root)

D = Part('Kitchen_SupplyDoughBowl_Trough')
dx0, dx1, dz0, dz1 = -1.62, -1.0, -.82, -.28


def trough(A):
    """the dough trough: tapering staved sides on the table, the dough risen under a damp cloth folded back"""
    y0 = TY + .004
    V_ = [(dx0 + .05, y0, dz0 + .05), (dx1 - .05, y0, dz0 + .05), (dx1 - .05, y0, dz1 - .05), (dx0 + .05, y0, dz1 - .05),
          (dx0, y0 + .19, dz0), (dx1, y0 + .19, dz0), (dx1, y0 + .19, dz1), (dx0, y0 + .19, dz1)]
    A.poly(V_, [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (3, 2, 1, 0)], staves[0])
    for (a, b, c, d) in ((dx0 - .01, dx1 + .01, dz0 - .01, dz0 + .03), (dx0 - .01, dx1 + .01, dz1 - .03, dz1 + .01)):
        A.box(a, b, y0 + .19, y0 + .22, c, d, oak_d)                                           # rim boards
    for (a, b) in ((dx0 - .01, dx0 + .03), (dx1 - .03, dx1 + .01)):
        A.box(a, b, y0 + .19, y0 + .215, dz0 + .035, dz1 - .035, oak_d)
    ellipsoid(A, (dx0 + dx1) / 2, y0 + .16, (dz0 + dz1) / 2, .26, .07, .21, dough, seg=10, rings=4, flat=y0 + .13)
    # the damp cloth over most of it, folded back from the east end
    cy = y0 + .235
    A.poly([(dx0 - .02, cy, dz0 - .02), (dx1 - .16, cy + .01, dz0 - .02), (dx1 - .16, cy + .01, dz1 + .02), (dx0 - .02, cy, dz1 + .02)], [(0, 1, 2, 3)[::-1]], damp)
    A.poly([(dx0 - .02, cy, dz0 - .02), (dx0 - .02, cy, dz1 + .02), (dx0 - .03, cy - .12, dz1 + .02), (dx0 - .03, cy - .12, dz0 - .02)], [(0, 1, 2, 3)], damp)
    A.tube((dx1 - .16, cy + .025, dz0 - .02), (dx1 - .16, cy + .025, dz1 + .02), .018, 6, damp)


D.obj(trough)
D.build(root)

# ======================================================= hall: the bucket bench and the water butt by the court door
Bk = Part('Kitchen_SupplyBuckets_Rack')
bx0, bx1, bz0, bz1 = -2.25, -1.25, 2.42, 2.84


def bucket_bench(A):
    """trestle ends, a plank shelf with three coopered buckets, a peg rail above with two more hung by their bails"""
    for x in (bx0 + .05, bx1 - .05):
        A.box(x - .03, x + .03, 0, 1.2, bz0 + .03, bz0 + .09, oak[0]); A.box(x - .03, x + .03, 0, 1.26, bz1 - .1, bz1 - .04, oak[0])
        A.box(x - .035, x + .035, 0, .06, bz0 + .02, bz1 - .02, oak_d); A.box(x - .03, x + .03, .34, .4, bz0 + .09, bz1 - .09, oak_d)
    A.box(bx0, bx1, .4, .45, bz0 + .02, bz1 - .02, oak[1])                                       # shelf
    A.box(bx0, bx1, 1.12, 1.2, bz1 - .095, bz1 - .045, oak[1])                                   # peg rail
    for i in range(3):
        x = bx0 + .19 + i * .31
        T.bucket_hoop(A, x, (bz0 + bz1) / 2, .454, .3, staves[i], iron, iron)
    for i in range(2):
        x = bx0 + .32 + i * .36
        A.tube((x, 1.14, bz1 - .095), (x, 1.14, bz1 - .2), .015, 5, oak_d)                       # the peg
        A.tube((x, 1.14, bz1 - .17), (x, 1.02, bz1 - .17), .006, 4, iron)
        T.bucket_hoop(A, x, bz1 - .17, .76, .26, staves[(i + 1) % 3], iron, iron)


Bk.obj(bucket_bench)
Bk.build(root)

WB = Part('Kitchen_SupplyWaterButt'); WS = Part('Kitchen_SupplyWaterSurface')
wx, wz = .42, 2.42


def water_butt(A):
    """a staved butt, two hoops, on a low stand; its lid half across; a dipper hooked on the rim"""
    A.box(wx - .27, wx + .27, 0, .05, wz - .12, wz - .06, oak_d); A.box(wx - .27, wx + .27, 0, .05, wz + .06, wz + .12, oak_d)
    n = 12
    prof = [(.26, .05), (.3, .3), (.3, .6), (.28, .84)]
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        pts = [(wx + r * math.cos(a0), y, wz + r * math.sin(a0)) for r, y in prof] + [(wx + r * math.cos(a1), y, wz + r * math.sin(a1)) for r, y in prof]
        A.poly(pts, [(0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3)], staves[i % 3])
        A.poly([(wx + .26 * math.cos(a0), .84, wz + .26 * math.sin(a0)), (wx + .26 * math.cos(a1), .84, wz + .26 * math.sin(a1)), (wx + .28 * math.cos(a1), .84, wz + .28 * math.sin(a1)), (wx + .28 * math.cos(a0), .84, wz + .28 * math.sin(a0))], [(0, 1, 2, 3)], staves[i % 3])
        A.poly([(wx + .26 * math.cos(a0), .84, wz + .26 * math.sin(a0)), (wx + .26 * math.cos(a1), .84, wz + .26 * math.sin(a1)), (wx + .24 * math.cos(a1), .08, wz + .24 * math.sin(a1)), (wx + .24 * math.cos(a0), .08, wz + .24 * math.sin(a0))], [(3, 2, 1, 0)], staves[(i + 1) % 3])
    A.lathe(wx, wz, .08, [(.245, 0)], n, staves[2], top=True)
    for hy in (.14, .7):
        A.lathe(wx, wz, hy - .025, [(.312, 0), (.312, .05)], n, iron, top=False)
    # the lid: two boards and a batten, lying across the west half
    A.box(wx - .3, wx + .02, .845, .875, wz - .2, wz + .2, heads[0]); A.box(wx - .28, wx, .875, .9, wz - .03, wz + .03, oak_d)
    # the dipper hooked on the east rim
    A.lathe(wx + .2, wz + .05, .62, [(.05, 0), (.07, .08), (.075, .1)], 8, oak[2], top=False)
    A.tube((wx + .26, .72, wz + .05), (wx + .34, .9, wz + .05), .012, 5, oak[2])


WB.obj(water_butt)
WB.build(root)
WS.obj(lambda A: A.lathe(wx + .07, wz, .74, [(.2, 0), (.2, .004)], 12, water, top=True))
WS.build(root)

# ======================================================= hall: the recipe board on the east wall (x .85)
R = Part('Kitchen_RecipeBoard_Board')
hx1 = .85; ry0, ry1, rz0, rz1 = 1.3, 2.0, -1.62, -1.0


def recipe(A):
    """a slate in an oak frame, hung from a nail by its cord; the recipe chalked in lines, a loaf drawn under it"""
    A.box(hx1 - .045, hx1 - .01, ry0, ry1, rz0, rz1, oak[1])
    A.box(hx1 - .05, hx1 - .045, ry0 + .05, ry1 - .05, rz0 + .05, rz1 - .05, slate)
    xs = hx1 - .056
    for k in range(5):
        y = ry1 - .12 - k * .075; w = (rz1 - rz0 - .2) * (.9 if k % 2 else 1.0) - (.1 if k == 4 else 0)
        A.poly([(xs, y, rz0 + .1), (xs, y, rz0 + .1 + w), (xs, y + .014, rz0 + .1 + w), (xs, y + .014, rz0 + .1)], [(0, 1, 2, 3)], chalk)
    cy, cz = ry0 + .14, (rz0 + rz1) / 2
    pts = [(xs, cy + .06 * math.sin(math.pi * i / 8), cz + .12 * math.cos(math.pi * i / 8)) for i in range(9)]
    for p, q in zip(pts, pts[1:]):
        A.poly([p, q, (q[0], q[1] - .012, q[2]), (p[0], p[1] - .012, p[2])], [(0, 1, 2, 3)], chalk)
    A.poly([(xs, cy - .012, cz - .12), (xs, cy - .012, cz + .12), (xs, cy, cz + .12), (xs, cy, cz - .12)], [(0, 1, 2, 3)], chalk)
    for dz in (-.05, 0, .05):
        A.poly([(xs, cy + .02, cz + dz - .006), (xs, cy + .02, cz + dz + .006), (xs, cy + .045, cz + dz + .012), (xs, cy + .045, cz + dz)], [(0, 1, 2, 3)], chalk)
    A.tube((hx1 - .03, ry1, rz0 + .06), (hx1 - .03, ry1 + .12, cz), .005, 4, cord); A.tube((hx1 - .03, ry1 + .12, cz), (hx1 - .03, ry1, rz1 - .06), .005, 4, cord)
    A.tube((hx1, ry1 + .12, cz), (hx1 - .05, ry1 + .12, cz), .008, 5, iron)                    # the nail


R.obj(recipe)
R.build(root)

# ======================================================= hall: the oven tools in their kindling box
O = Part('Kitchen_Tools_Oven')


def oven_tools(A):
    """a kindling box by the oven, split sticks in it, the peel and the ash rake standing in it against the wall"""
    x0, x1, z0, z1 = -2.52, -2.08, -2.97, -2.62
    for (a, b, c, d) in ((x0, x1, z0, z0 + .03), (x0, x1, z1 - .03, z1), (x0, x0 + .03, z0 + .03, z1 - .03), (x1 - .03, x1, z0 + .03, z1 - .03)):
        A.box(a, b, 0, .34, c, d, oak[1])
    A.box(x0 + .03, x1 - .03, .02, .05, z0 + .03, z1 - .03, oak_d)
    for cx in (x0, x1):                                                                     # iron corner straps
        for cz in (z0, z1):
            A.box(cx - .012 if cx == x0 else cx - .025, cx + .025 if cx == x0 else cx + .012, .04, .3, cz - .012 if cz == z0 else cz - .025, cz + .025 if cz == z0 else cz + .012, iron)
    for i in range(6):
        x = x0 + .07 + (i % 3) * .12; z = z0 + .09 + (i // 3) * .15
        A.beam((x, .05, z), (x + .02, .42, z + .02), .045, .045, oak_d if i % 2 else oak[2])
    # the peel: a long ash handle, a thin blade at the top against the wall
    A.tube((-2.2, .06, -2.72), (-2.25, 1.55, -2.93), .018, 6, oak[2])
    b0 = Vector((-2.25, 1.55, -2.93)); d = Vector((-.02, 1, -.06)).normalized(); s = Vector((1, 0, 0))
    V_ = [b0 - s * .06, b0 + s * .06, b0 + d * .34 + s * .15, b0 + d * .4, b0 + d * .34 - s * .15]
    A.poly([tuple(p) for p in V_], [(0, 1, 2, 3, 4)], oak[0]); A.poly([tuple(p + Vector((0, 0, -.012))) for p in V_], [(4, 3, 2, 1, 0)], oak[0])
    # the ash rake: an iron hoe head at the top
    A.tube((-2.4, .06, -2.75), (-2.42, 1.75, -2.94), .015, 6, oak[0])
    A.box(-2.52, -2.32, 1.75, 1.82, -2.955, -2.935, iron)


O.obj(oven_tools)
O.build(root)

# ======================================================= hall: benches, stores under the stair, the mantel
H = Part('Kitchen_Furnishings_Hall')
hz1 = 2.85


def cooling_bench(A):
    """the cooling bench under the south window: a slatted top on two legs, loaves cooling on it"""
    x0, x1, z0, z1, top = -3.05, -2.3, hz1 - .4, hz1 - .03, .67
    for k in range(5):
        za = z0 + k * (z1 - z0) / 5 + .006; zb = z0 + (k + 1) * (z1 - z0) / 5 - .006
        A.box(x0, x1, top - .035, top, za, zb, oak[k % 3])
    for x in (x0 + .06, x1 - .06):
        A.box(x - .03, x + .03, 0, top - .035, z0 + .03, z1 - .03, oak[0])
    A.box(x0 + .06, x1 - .06, .12, .17, (z0 + z1) / 2 - .02, (z0 + z1) / 2 + .02, oak_d)
    cob(A, -2.9, hz1 - .22, top, .085, crust[0], rot=.3)
    long_loaf(A, -2.62, hz1 - .2, top, .3, crust[2], rot=1.5)
    cob(A, -2.4, hz1 - .24, top, .075, crust[1], rot=2.0)


H.obj(cooling_bench)


def roll_basket(A):
    """a wicker basket of rolls under the bench"""
    A.lathe(-2.68, hz1 - .22, 0, [(.14, 0), (.17, .1), (.2, .22), (.21, .24)], 10, wicker, top=False)
    for y in (.08, .16):
        A.lathe(-2.68, hz1 - .22, y, [(.14 + y * .28 + .006, 0), (.14 + y * .28 + .006, .02)], 10, oak_d, top=False)
    A.lathe(-2.68, hz1 - .22, .05, [(.18, 0)], 10, oak_d, top=True)
    for i, (dx, dz) in enumerate(((-.07, -.05), (.06, -.06), (0, .07), (-.02, 0))):
        roll(A, -2.68 + dx, hz1 - .22 + dz, .13 + (.04 if i == 3 else 0), .055, crust[i % 3])


H.obj(roll_basket)


def settle(A):
    """the settle by the court window: a plank seat, a panelled back to the wall, arms"""
    x0, x1, z0, z1 = .47, .83, -.72, .12
    A.box(x0 + .01, x1 - .06, .42, .47, z0 + .02, z1 - .02, oak[2])
    A.box(x1 - .06, x1, .0, 1.02, z0, z1, oak[1])
    for k in range(3):
        za = z0 + .06 + k * (z1 - z0 - .12) / 3
        A.box(x1 - .068, x1 - .06, .55, .95, za + .02, za + (z1 - z0 - .12) / 3 - .02, oak_d)
    for z in (z0, z1 - .05):
        A.box(x0, x1 - .06, 0, .72, z, z + .05, oak[0])
        A.box(x0 - .02, x1 - .06, .72, .76, z - .01, z + .06, oak[1])


H.obj(settle)
for i, (x, z) in enumerate(((-4.5, -.7), (-4.45, -.2), (-4.52, .35))):
    H.obj(T.sack, x, z, 0, .42, .62, cloth[i % 3], cord, rot=i * .7, slump=.02)
H.obj(T.barrel, -4.45, -1.5, 0, .26, .7, staves, iron, heads, rot=.5)
FX0, FX1, BZ, FY1 = -2.1, -.9, -4.2, 1.05
for x in (FX0 - .02, FX1 + .02):
    H.obj(T.candlestick, x, BZ + .1, FY1 + .28, brass, wax, cflame, h=.15)
H.obj(PP.vase, (FX0 + FX1) / 2 - .25, BZ + .1, FY1 + .28, .16, pottery[1], style=1)
H.build(root)

# ======================================================= store: the flour hutch (service)
P = Part('Kitchen_Pantry_FlourBin')
fx0, fx1, fz0, fz1 = 3.95, 5.05, -4.83, -4.13


def flour_hutch(A):
    """the flour hutch: panelled sides on stiles, the lid propped open on a stay, flour heaped, a scoop and a sieve"""
    for x in (fx0 + .04, fx1 - .04):
        for z in (fz0 + .04, fz1 - .04):
            A.box(x - .04, x + .04, 0, .92, z - .04, z + .04, oak[0])
    A.box(fx0 + .08, fx1 - .08, .06, .86, fz0 + .01, fz0 + .04, oak[1]); A.box(fx0 + .08, fx1 - .08, .06, .86, fz1 - .04, fz1 - .01, oak[1])
    A.box(fx0 + .01, fx0 + .04, .06, .86, fz0 + .08, fz1 - .08, oak[1]); A.box(fx1 - .04, fx1 - .01, .06, .86, fz0 + .08, fz1 - .08, oak[1])
    for y in (.06, .46):                                                                    # panel rails
        A.box(fx0 + .08, fx1 - .08, y, y + .06, fz1 - .045, fz1 + .005, oak_d)
    A.box(fx0 + .08, fx1 - .08, .82, .88, fz1 - .045, fz1 + .005, oak_d)
    A.box(fx0 + .04, fx1 - .04, .1, .72, fz0 + .04, fz1 - .04, flour)
    A.lathe((fx0 + fx1) / 2, (fz0 + fz1) / 2, .72, [(.32, 0), (.2, .07), (0, .1)], 10, flour, top=False)
    # the lid, hinged at the back (north) and propped up on a stay
    ang = math.radians(62); L = fz1 - fz0 + .02
    hz, hy = fz0 - .01, .92
    tz, ty = hz + math.cos(ang) * L, hy + math.sin(ang) * L
    nz, ny = -math.sin(ang) * .035, math.cos(ang) * .035
    V_ = [(fx0 - .02, hy, hz), (fx1 + .02, hy, hz), (fx1 + .02, ty, tz), (fx0 - .02, ty, tz)]
    W_ = [(p[0], p[1] + ny, p[2] + nz) for p in V_]
    A.poly(V_ + W_, [(0, 1, 2, 3)[::-1], (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)], oak[2])
    A.beam((fx1 - .1, .92, fz1 - .06), (fx1 - .1, hy + math.sin(ang) * L * .7, hz + math.cos(ang) * L * .7), .03, .03, oak_d)   # the stay
    for t in (.25, .75):
        A.box(fx0 + (fx1 - fx0) * t - .04, fx0 + (fx1 - fx0) * t + .04, hy - .01, hy + .02, hz - .03, hz + .04, iron)   # hinges
    # a copper scoop in the flour, a sieve leaning on the hutch's side
    A.lathe(fx1 - .28, fz1 - .2, .78, [(.05, 0), (.075, .06)], 8, copper, top=False)
    A.tube((fx1 - .28, .83, fz1 - .2), (fx1 - .12, .9, fz1 - .12), .012, 5, oak[2])
    c = Vector((fx0 - .04, .3, (fz0 + fz1) / 2)); nv = Vector((1, .15, 0)).normalized(); u = Vector((0, 0, 1)); w = nv.cross(u).normalized()
    T.rim_ring(A, c, nv, u, w, .19, .23, .035, 12, oak[1])
    A.poly([tuple(c + (u * math.cos(2 * math.pi * i / 12) + w * math.sin(2 * math.pi * i / 12)) * .19) for i in range(12)], [tuple(range(12))], flour2)


P.obj(flour_hutch)
P.build(root)

# ======================================================= store: the bread rack, sacks, barrels, the meal chest
S = Part('Kitchen_Store_Shelves')
sx1 = 6.85


def bread_rack(A):
    """the bread rack against the east wall: three frames, four slatted shelves, cobs, long loaves and rolls"""
    x0, x1 = sx1 - .42, sx1 - .02
    for z in (-4.6, -3.5, -2.42):
        for x in (x0 + .03, x1 - .03):
            A.box(x - .025, x + .025, 0, 2.0, z - .025, z + .025, oak[0])
        A.box(x0 + .01, x1 - .01, 1.97, 2.02, z - .035, z + .035, oak_d)
    for y in (.35, .85, 1.35, 1.85):
        for k in range(4):
            xa = x0 + .02 + k * (x1 - x0 - .04) / 4 + .008; xb = x0 + .02 + (k + 1) * (x1 - x0 - .04) / 4 - .008
            A.box(xa, xb, y, y + .03, -4.62, -2.4, oak[(k + int(y * 3)) % 3])
        A.box(x0 - .005, x0 + .02, y - .05, y + .008, -4.64, -2.38, oak_d)
    for si, y in enumerate((.35, .85, 1.35, 1.85)):
        z = -4.45; k = 0
        while z < -2.55:
            kind = (si + k) % 3
            if kind == 0:
                cob(A, (x0 + x1) / 2, z, y + .03, .09, crust[(si + k) % 3], rot=k); z += .3
            elif kind == 1:
                long_loaf(A, (x0 + x1) / 2, z + .04, y + .03, .32, crust[(si + k + 1) % 3], rot=0.0); z += .3
            else:
                for j in range(3):
                    roll(A, (x0 + x1) / 2 + (j - 1) * .1, z, y + .03, .05, crust[(j + k) % 3])
                z += .22
            k += 1


S.obj(bread_rack)
for i, (x, z) in enumerate(((1.55, -4.5), (2.0, -4.55), (1.6, -4.0), (2.45, -4.5), (1.6, -3.5))):
    S.obj(T.sack, x, z, 0, .46, .66, cloth[i % 3], cord, rot=i * .9, slump=.02 * (1 - 2 * (i % 2)))
S.obj(T.sack, 1.8, -4.28, .0, .4, .5, cloth[1], cord, rot=.3)
for i, (x, z) in enumerate(((6.3, -1.0), (5.75, -.75))):
    S.obj(T.barrel, x, z, 0, .3, .82, staves, iron, heads, rot=i * .6 + .2, bung=oak_d)


def meal_chest(A):
    """the meal chest by the court window: a plank chest, crocks on its lid and the store's lantern"""
    T.chest(A, 3.9, 4.7, -.8, -.25, .5, oak[1], oak_d, iron, None, front='n', handles=True)


S.obj(meal_chest)
S.obj(PP.urn, 4.08, -.6, .504, .3, pottery[0], pottery[2], lid=oak[2])
S.obj(PP.vase, 4.34, -.45, .504, .2, pottery[1], style=1)
S.obj(T.lantern, 4.55, -.55, .504, iron, lamp, h=.28)
S.build(root)

# ======================================================= the loft (floor 3.3)
F = 3.3
U = Part('Kitchen_UpperFurnishing_Loft')


def box_bed(A):
    """Hettie's box bed: a short bed boxed in on its wall side, a straw-ticking mattress, a patchwork quilt, a bolster"""
    x0, x1, z0, z1 = -.45, .8, -4.8, -3.8
    A.box(x0, x1, F, F + .95, z0, z0 + .07, oak[1])                                             # the back board to the wall
    for k in range(4):
        xa = x0 + .08 + k * (x1 - x0 - .16) / 4
        A.box(xa + .03, xa + (x1 - x0 - .16) / 4 - .03, F + .4, F + .85, z0 + .07, z0 + .076, oak_d)
    for x in (x0, x1 - .07):
        A.box(x, x + .07, F, F + .95, z0 + .07, z1, oak[0])                                    # head and foot boards
        A.lathe(x + .035, z1 - .035, F + .95, [(.035, 0), (.05, .03), (0, .07)], 6, oak[2])
    A.box(x0 + .07, x1 - .07, F + .12, F + .3, z1 - .06, z1, oak[2])                           # the front rail
    A.box(x0 + .07, x1 - .07, F + .28, F + .44, z0 + .08, z1 - .07, straw)                     # the mattress
    for i in range(4):
        for j in range(3):
            xa = x0 + .12 + i * (x1 - x0 - .32) / 4; za = z0 + .12 + j * (z1 - z0 - .22) / 3
            A.box(xa + .004, xa + (x1 - x0 - .32) / 4 - .004, F + .444, F + .47, za + .004, za + (z1 - z0 - .22) / 3 - .004, quilt[(i + j * 2) % 4])
    A.tube((x0 + .1, F + .52, z0 + .2), (x0 + .1, F + .52, z1 - .15), .07, 8, linen)            # the bolster at the head


U.obj(box_bed)


def clothes_chest(A):
    T.at(A, F, T.chest, -.4, .2, -3.38, -2.97, .45, oak[2], oak_d, iron, brass, front='s', handles=False)
    T.folded_cloth(A, -.3, .1, -3.33, -3.07, F + .452, 2, [quilt[1], quilt[3]], fold_axis='x')


U.obj(clothes_chest)
for i, (x, z, w) in enumerate(((-4.4, -4.4, .42), (-4.0, -4.45, .42), (-4.45, -3.95, .36))):
    U.obj(T.at, F, T.sack, x, z, 0, w, .6, cloth[i % 3], cord, rot=i, slump=.02)


def stool_candle(A):
    T.at(A, F, T.stool, -1.0, -2.5, .45, .15, oak[2], oak_d, rot=.4)
    T.candlestick(A, -1.0, -2.5, F + .45, brass, wax, cflame, h=.14)


U.obj(stool_candle)
U.build(root)

Ur = Part('Kitchen_UpperFurnishing_Rail')
LZ1 = -1.09


def loft_rail(A):
    """the loft balustrade: posts with caps, a handrail, a mid rail, square balusters"""
    x0, x1 = -3.9, .85
    posts = [x0 + .05] + [x0 + .05 + k * .6 for k in range(1, 8)] + [x1 - .04]
    for x in posts:
        A.box(x - .035, x + .035, F, F + .97, LZ1 - .15, LZ1 - .08, oak[0])
        A.box(x - .045, x + .045, F + .97, F + 1.0, LZ1 - .16, LZ1 - .07, oak_d)
    A.box(x0, x1, F + .9, F + .96, LZ1 - .165, LZ1 - .065, oak[2])
    A.box(x0, x1, F + .45, F + .5, LZ1 - .14, LZ1 - .09, oak[1])
    x = x0 + .2
    while x < x1 - .1:
        if min(abs(x - p) for p in posts) > .06:
            A.box(x - .014, x + .014, F + .02, F + .9, LZ1 - .13, LZ1 - .1, oak[1])
        x += .15
    A.box(x0, x1, F, F + .02, LZ1 - .16, LZ1 - .07, oak_d)


Ur.obj(loft_rail)
Ur.build(root)

# ======================================================= the court: the oven's firewood
Wp = Part('Kitchen_Court_DressingPropsWoodpile')


def woodpile(A):
    """split logs stacked in a crib between stakes against the store wall; a chopping block with a hatchet"""
    z0, z1 = .25, .78
    A.box(4.88, 6.04, .005, .06, z0 - .03, z1 + .02, oak_d)                                   # bearers off the ground
    for x in (4.92, 6.02):
        for z in (z0 + .02, z1 - .02):
            A.box(x - .03, x + .03, 0, .82, z - .03, z + .03, oak_d)                           # stakes
    for row in range(4):
        n = 5 - (row % 2)
        for k in range(n):
            x = 5.06 + k * .22 + (.11 if row % 2 else 0)
            y = .12 + row * .16
            c0, c1 = Vector((x, y, z0)), Vector((x, y, z1))
            r = .075
            # a split log: a half round with the split face up or down in turn
            m = 5; face = 1 if (row + k) % 2 else -1
            pts = [(math.cos(math.pi * i / m) * r, face * math.sin(math.pi * i / m) * r) for i in range(m + 1)]
            ring0 = [(c0.x + px, c0.y + py, c0.z) for px, py in pts]; ring1 = [(c1.x + px, c1.y + py, c1.z) for px, py in pts]
            Vs = ring0 + ring1; N = m + 1
            F_ = [(i, i + 1, N + i + 1, N + i) if face > 0 else (i, N + i, N + i + 1, i + 1) for i in range(m)]
            A.poly(Vs, F_, bark)
            A.poly(Vs, [(0, N, 2 * N - 1, N - 1) if face > 0 else (0, N - 1, 2 * N - 1, N)], split)
            A.poly(ring0, [tuple(range(N)) if face < 0 else tuple(range(N))[::-1]], log_end)
            A.poly(ring1, [tuple(range(N))[::-1] if face < 0 else tuple(range(N))], log_end)
    T.stump(A, 6.33, .5, 0, .42, .19, bark, log_end, rng=rng)
    A.tube((6.33, .42, .5), (6.22, .78, .52), .016, 6, oak[2])                                  # the hatchet, bitten into the block
    A.box(6.28, 6.4, .42, .5, .47, .53, steel)


Wp.obj(woodpile)
Wp.build(root)

PK.save(SP, ROOT)
