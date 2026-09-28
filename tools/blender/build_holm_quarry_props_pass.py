"""Quarry Gate props pass (owner, 2026-09-28: "props ... blocky -> redo in Blender purposefully"; "every object in every
building reviewed in Blender"). The Quarry Gate is the mining tutor's gatehouse over the shaft to the ore workings: its
things are a quarryman's things - picks, sledges, plugs and feathers, kibbles of ore, rope, a winch, and a smith's
lean-to where broken picks are mended.

From the model the island loads (holm-quarry-glazed-review4-v1/quarry.blend, Blender 5.1). Every prop the v1 build drew
as boxes and 8-sided cylinders (build_holm_quarry_v1.py) and the m44 dressing's stub jars are taken away and designed
again in their old footprints, so the same tiles stay blocked and the graph is unchanged. Before -> after:

 threshold hall (floor 0)
  - the inspection table (a slab on four sticks, a stick pick, a box lamp) -> the quarry master's tally table: a planked
    top on four chamfered legs with aprons and a stretcher frame; on it the pick to be issued, a balance with a copper
    sample in its pan, ore samples on a cloth, a tally slate chalked in fives, a horn lantern;
  - two plain barrels -> a water butt (open, water in it, a dipper hooked over the chime) and a barrel of spare pick
    hafts standing in it;
  - the tool board hung on the east wall (a plank with four stick tools) -> a floor-standing pick rack: two posts on
    feet with braces and turned caps, a backboard with pegs, two picks and a sledge hung by their heads, a coil of rope
    on a peg over the haft barrel, and a tray of plugs and feathers (the quarryman's splitting wedges) under the rack;
 court over the shaft
  - the ore bucket on the head-frame rope (a cylinder with a box of ore) -> a kibble: a bellied staved bucket, three
    hoops, lugs and an iron bail, heaped with copper and tin ore, a shackle and the rope up to the sheave;
 outside the arch
  - the hanging sign (a board with an X of two bars) -> a framed sign board painted with crossed picks over a lump of
    ore on both faces, hung by rings from the iron bracket;
 the smith's lean-to
  - the repair bench (service 'Repair bench', name kept) -> a heavy two-plank bench on chamfered legs with a leg vise, a
    shelf of spare hafts, a pick being re-hafted, the broken old haft, iron wedges, a mallet and shavings, and a tool
    board on the back posts with a saw, a drawknife, a cross-peen hammer and a rasp (the hammers "hung on the wall"
    are now held by the bench's own posts);
  - the forge (a stone box, an orange slab, a floating pyramid) -> a smith's hearth: a rubble body on a plinth, dressed
    kerb stones round a firepot of glowing coals with the tuyere, stone jambs and lintel and a plastered hood,
    sooted near the top, rising into the chimney; tongs on the kerb, a pick head heating in the fire;
  - two ore crates (boxes with an orange slab) -> slatted crates heaped with copper ore and tin ore, chalk tallies on
    their fronts;
  - the anvil on its stump (three boxes and a wedge on a cylinder) -> a horned anvil on an iron-banded oak block, a
    cross-peen hammer lying on its face;
  - the dressing's jars and candles (one stood on the forge hood) are gone: every small thing is now a tool of the trade;
 winch loft (floor 2.8)
  - the windlass (service 'Winch', name kept) -> two braced A-frame trestles on sills with bearing blocks and iron
    caps, a staved drum between iron-tyred cheeks with the rope wound on it, an iron spindle with a crank, a spoked
    hand wheel with pegs, a ratchet wheel and its pawl;
  - the loft edge rails (sticks) -> a balustrade: chamfered newels with finials, a moulded handrail, a bottom rail and
    square balusters along the stairwell; the east rail with a mid rail; a coil of spare winch rope on the boards.
Kept as they were (structure, in Quarry_FurnishingMain): the stair's stringer, risers and hand rail, the approach kerbs.
The kibble and the sign hang from the head frame and the wall bracket (roof and shell parts the cutaway clips): they are
drawn in their own part, Quarry_FurnishingPropsHung, and clipped with what they hang from, as before (the spec's
cutawayParts leaves them and the kept structure out of the cutaway proof).
Plan coordinates (x east, y up, z south; Blender (x, -z, y)), quarry-local (root Quarry_Gate at the origin). Original designs.
Run through tools/rebuild_holm_props_pass.js quarry (spec docs/rebuild/holm-overhaul/props-pass/quarry.json)."""
import bpy, sys, math, random
from pathlib import Path
HERE = Path(__file__).resolve().parent; sys.path.insert(0, str(HERE)); ROOT = HERE.parents[1]
import holm_props_pass_kit as PK
from holm_props_pass_kit import C, Part
import holm_trade_props as T
import holm_props_quarry as Q
from holm_purposeful_props import arc, ellipsoid

SP = PK.spec()
PK.begin()
rng = random.Random(3633)
root = PK.obj('Quarry_Gate')

# ---- take away the old props: the dressing, the loft rails, the two services (rebuilt under their names) and, of
# Quarry_FurnishingMain, every prop piece (the stair's stringer/risers/rail and the approach kerbs stay)
PK.remove('Quarry_FurnishingDressing', 'Quarry_UpperFurnishingMain', 'Quarry_ServiceBench_Repair', 'Quarry_ServiceWinch_Windlass')
PK.drop('Quarry_FurnishingMain', (-3.36, -3.19, 2.0, 2.7, 3.3, 3.95), expect=3)          # the hanging sign
PK.drop('Quarry_FurnishingMain', (.25, .83, 2.4, 6.1, -3.0, -2.44), expect=7)            # the ore bucket and its rope
PK.drop('Quarry_FurnishingMain', (.38, 1.62, 0, 1.1, 1.53, 2.22), expect=9)              # the inspection table
PK.drop('Quarry_FurnishingMain', (1.6, 2.7, 0, .95, -2.6, -1.1), expect=6)               # the two barrels
PK.drop('Quarry_FurnishingMain', (2.53, 2.84, .9, 2.12, -2.05, -.46), expect=13)         # the tool board
PK.drop('Quarry_FurnishingMain', (4.2, 5.15, 0, 2.2, -.95, 2.6), expect=17)              # forge, hood, crates, anvil, stump

# ---- palette (sRGB as the game shows it; tex = the kit texture the faces take) ----
oak = C('quarry oak', '#6b4b2f', 'beam'); oak_l = C('quarry oak light', '#7c5a38', 'beam'); oak_d = C('quarry frame oak', '#4a3422', 'beam')
endg = C('quarry end grain', '#8b6a45', 'beam'); ash = C('quarry ash haft', '#a07e54', 'beam'); ash_n = C('quarry new haft', '#cdb088')        # flat: a pale colour on the wood texture is clamped to the texture's own
iron = C('quarry iron', '#3a3b3a'); iron_w = C('quarry worn iron', '#6c7274'); steel = C('quarry steel', '#9aa0a2'); brass = C('quarry brass', '#b39146')
hemp = C('quarry hemp', '#a3895a'); hemp_d = C('quarry hemp dark', '#86703f'); wound = C('quarry wound rope', '#94794a'); wound_d = C('quarry wound rope dark', '#735c35')
copper = [C('quarry copper ore', '#b0653a', 'rock'), C('quarry copper ore dark', '#8e4e2c', 'rock'), C('quarry copper bed', '#7d5236', 'rock')]
tin = [C('quarry tin ore', '#b5b2a4', 'rock'), C('quarry tin ore dark', '#8f8d82', 'rock'), C('quarry tin bed', '#7b7a72', 'rock')]
coal = C('quarry coal', '#2b2927'); hearth_ash = C('quarry hearth ash', '#5b5550')
glow = C('quarry coals glow', '#ff8a2c', emit=1.5); hot = C('quarry hot iron', '#ff6a1e', emit=1.2); lamp = C('quarry lantern glow', '#ffd27a', emit=1.2)
rubble = C('quarry forge rubble', '#8b8578', 'rock'); rubble_d = C('quarry forge plinth', '#6f6a60', 'rock'); kerb = C('quarry dressed kerb', '#b2a17c', 'rock')
hood_c = C('quarry hood plaster', '#a09a8e', 'rock'); soot = C('quarry soot', '#3d3935')
water = C('quarry water', '#4f6a72')
staves = [C('quarry stave 1', '#7a5634', 'beam'), C('quarry stave 2', '#6a4a2d', 'beam'), C('quarry stave 3', '#84603c', 'beam')]
heads = [C('quarry head board 1', '#8d6a44', 'beam'), C('quarry head board 2', '#81603c', 'beam')]
crateb = [C('quarry crate 1', '#94764f', 'beam'), C('quarry crate 2', '#86683f', 'beam'), C('quarry crate 3', '#9e7f55', 'beam')]
batten = C('quarry crate batten', '#654a2e', 'beam')
chalk = C('quarry chalk', '#e8e4d6'); slate = C('quarry slate', '#4c5156'); cloth = C('quarry sample cloth', '#b9a888')
paint = C('quarry sign paint', '#6e3326'); sign_haft = C('quarry sign haft', '#c9a46a'); sign_iron = C('quarry sign iron', '#c7ccce')
leather = C('quarry leather', '#5e3d24'); shaving = C('quarry shavings', '#d8bf8e'); saw_c = C('quarry saw blade', '#8e9496')
bark = C('quarry block bark', '#4f3a28', 'beam'); block_top = C('quarry block end grain', '#9a7a52', 'beam')


def stroke(A, p0, p1, w, y, m):
    """a chalk or paint stroke lying flat at height y: one polygon from p0 to p1 (plan), w wide"""
    dx, dz = p1[0] - p0[0], p1[1] - p0[1]; L = math.hypot(dx, dz) or 1
    ex, ez = -dz / L * w / 2, dx / L * w / 2
    A.poly([(p0[0] - ex, y, p0[1] - ez), (p1[0] - ex, y, p1[1] - ez), (p1[0] + ex, y, p1[1] + ez), (p0[0] + ex, y, p0[1] + ez)], [(0, 1, 2, 3)], m)


def vstroke(A, x, a, b, w, m):
    """a stroke painted on an x-facing face at x: from a to b, points (z, y)"""
    dz, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dz, dy) or 1
    ez, ey = -dy / L * w / 2, dz / L * w / 2
    A.poly([(x, a[1] - ey, a[0] - ez), (x, b[1] - ey, b[0] - ez), (x, b[1] + ey, b[0] + ez), (x, a[1] + ey, a[0] + ez)], [(0, 1, 2, 3)], m)


# =========================================================== threshold hall: the tally table and what is on it
H = Part('Quarry_FurnishingPropsHall')
t = .86


def tally_table(A, x0=.4, x1=1.6, z0=1.55, z1=2.2):
    """the quarry master's table: a planked top, four chamfered legs, aprons under the top, a stretcher frame low down"""
    th = .05
    T.plank_top(A, x0, x1, z0, z1, t - th, t, [oak, oak_d, oak_l], along='x', under=oak_d)
    li = .09
    for x in (x0 + li, x1 - li):
        for z in (z0 + li, z1 - li):
            T.oct_prism(A, x, z, .045, .045, .002, t - th, oak_d)
    for z in (z0 + li, z1 - li):
        A.box(x0 + li, x1 - li, t - th - .1, t - th, z - .02, z + .02, oak)                       # long aprons
    for x in (x0 + li, x1 - li):
        A.box(x - .02, x + .02, t - th - .1, t - th, z0 + li, z1 - li, oak)                       # end aprons
        A.box(x - .018, x + .018, .12, .16, z0 + li, z1 - li, oak_d)                              # low stretchers
    A.box(x0 + li, x1 - li, .125, .155, (z0 + z1) / 2 - .018, (z0 + z1) / 2 + .018, oak_d)       # and the one between them


H.obj(tally_table)
def issued_pick(A):
    """the pick to be issued to the new hand, lying on the table"""
    Q.pick(A, (.47, t + .02, 1.98), (1.18, t + .028, 1.98), ash_n, iron, (0, 0, 1))


H.obj(issued_pick)
def balance(A):
    """a balance for the samples, a copper lump weighed in its east pan"""
    T.scales(A, 1.0, 1.7, t, brass, oak_d, rot=0.0)
    T.lump(A, 1.16, 1.7, t + .159, .032, copper[0], rng)


H.obj(balance)


def samples(A):
    """ore samples laid out on a cloth: copper, tin, a split copper lump"""
    A.poly([(.47, t + .004, 1.61), (.73, t + .004, 1.62), (.72, t + .004, 1.8), (.46, t + .004, 1.79)], [(0, 1, 2, 3)], cloth)
    T.lump(A, .54, 1.67, t + .008, .045, copper[0], rng)
    T.lump(A, .65, 1.73, t + .008, .04, tin[0], rng)
    T.lump(A, .57, 1.75, t + .008, .028, copper[1], rng)


H.obj(samples)


def tally_slate(A, cx=1.42, cz=2.05, rot=.12):
    """a slate in a wooden frame, the day's kibbles chalked on it in fives"""
    A.rbox(cx, cz, .27, .19, t, t + .016, rot, oak_l)
    A.rbox(cx, cz, .23, .15, t + .004, t + .021, rot, slate)
    c, s = math.cos(rot), math.sin(rot)
    P = lambda a, b: (cx + a * c + b * s, cz - a * s + b * c)
    y = t + .026
    for g, gx in enumerate((-.08, .02)):
        for k in range(4):
            stroke(A, P(gx + k * .018, -.045), P(gx + k * .018, .045), .006, y, chalk)
        stroke(A, P(gx - .012, .035), P(gx + .066, -.035), .006, y + .004, chalk)             # struck through: five
    for k in range(2):
        stroke(A, P(.1 + k * .018, -.045), P(.1 + k * .018, .045), .006, y, chalk)


H.obj(tally_slate)
H.obj(T.lantern, 1.42, 1.72, t, iron, lamp, h=.26)

# =========================================================== threshold hall: the water butt and the haft barrel
def water_butt(A):
    """an open water butt (the quarrymen drink and wet the stone), a dipper hooked over the chime"""
    T.barrel(A, 1.95, -2.25, 0, .3, .9, staves, iron, heads, rot=.3, open_top=True, fill=water)
    A.lathe(2.03, -2.29, .79, [(.032, 0), (.05, .03), (.056, .05)], 8, oak_l, top=True, top_m=oak_d)
    A.tube((2.08, .835, -2.3), (2.23, .915, -2.32), .012, 5, oak_l)
    A.tube((2.23, .915, -2.32), (2.265, .87, -2.325), .012, 5, oak_l)


H.obj(water_butt)


def haft_barrel(A):
    """a barrel of spare pick hafts, pale new ash standing in it"""
    T.barrel(A, 2.35, -1.45, 0, .3, .9, staves, iron, heads, rot=1.1, open_top=True, fill=oak_d)
    for i in range(7):
        a = i * 2 * math.pi / 7 + .4; rr = .06 + .08 * (i % 2)
        x0, z0 = 2.35 + math.cos(a) * rr, -1.45 + math.sin(a) * rr
        x1, z1 = x0 - .06 + math.cos(a) * .04, z0 + math.sin(a) * .06
        A.tube((x0, .72, z0), (min(x1, 2.47), 1.27 - .05 * (i % 3), z1), .019, 6, ash_n if i % 3 else ash, cap_m=endg)


H.obj(haft_barrel)

# =========================================================== threshold hall: the pick rack by the east wall
def pick_rack(A):
    """a floor-standing pick rack: posts on feet, braces, turned caps, a pegged backboard; two picks and a sledge hung by
    their heads, rope coiled on a peg over the haft barrel, a tray of plugs and feathers under the rack"""
    X = 2.72
    for zc, s in ((-1.985, 1), (-.515, -1)):
        A.box(2.555, 2.805, .002, .07, zc - .045, zc + .045, oak_d)                                # foot
        T.oct_prism(A, X, zc, .035, .035, .07, 1.29, oak)                                        # post
        A.lathe(X, zc, 1.29, [(.042, 0), (.03, .02), (.034, .035), (0, .06)], 8, oak_d)            # turned cap
        A.beam((X, .07, zc + s * .24), (X, .45, zc + s * .03), .035, .035, oak_d)                  # brace
    A.box(2.745, 2.785, .98, 1.25, -1.97, -.53, oak_l)                                          # backboard
    A.box(2.73, 2.8, 1.25, 1.28, -1.97, -.53, oak)                                               # its cap
    tools = ((-1.75, 'pick'), (-1.04, 'sledge'), (-.74, 'pick'))
    for zc, kind in tools:
        for dz in ((-.11, .11) if kind == 'pick' else (-.08, .08)):
            A.tube((2.745, 1.15, zc + dz), (2.615, 1.158, zc + dz), .012, 6, oak_d)             # pegs
        if kind == 'pick':
            Q.hung_pick(A, 2.665, zc, 1.25, .86, ash, iron)
        else:
            T.sledge(A, (2.665, .42, zc), (2.665, 1.22, zc), ash, iron)
    A.tube((2.745, 1.18, -1.42), (2.64, 1.19, -1.42), .012, 6, oak_d)                           # the rope's peg
    for k in range(2):
        Q.ring(A, (2.69 - k * .04, 1.04, -1.42 + k * .015), (1, 0, 0), .15 - k * .012, .032, hemp if k == 0 else hemp_d, segs=8 - k)
    # the tray of plugs and feathers
    x0, x1, z0, z1 = 2.575, 2.795, -.99, -.61
    A.box(x0, x0 + .02, .004, .15, z0, z1, oak); A.box(x1 - .02, x1, .004, .15, z0, z1, oak)
    A.box(x0 + .02, x1 - .02, .004, .14, z0, z0 + .02, oak); A.box(x0 + .02, x1 - .02, .004, .14, z1 - .02, z1, oak)
    A.box(x0 + .02, x1 - .02, .004, .03, z0 + .02, z1 - .02, oak_d)
    for i in range(2):
        for k in range(3):
            T.wedges(A, x0 + .07 + i * .08, z0 + .08 + k * .1, .03, 0, iron, n=1)
    for k in range(3):
        A.beam((x0 + .05, .037, z0 + .1 + k * .1), (x1 - .05, .037, z0 + .12 + k * .1), .02, .012, iron_w)   # feathers


H.obj(pick_rack)
H.build(root)

# =========================================================== court and arch: the kibble on the rope, the sign
G = Part('Quarry_FurnishingPropsHung')


def hung_kibble(A):
    """the kibble on the head-frame rope over the shaft, heaped with ore"""
    crown = Q.kibble(A, .54, -2.72, 2.45, .45, .26, staves, iron, [copper[0], tin[0], copper[1], copper[2]], rng)
    Q.ring(A, (.54, crown.y + .03, -2.72), (1, 0, 0), .035, .012, iron, segs=6)                  # the shackle
    A.tube((.54, crown.y + .06, -2.72), (.54, 6.07, -2.72), .022, 6, hemp)                        # the rope to the sheave
    A.tube((.54, crown.y + .07, -2.72), (.54, crown.y + .16, -2.72), .028, 6, hemp_d)             # its eye splice


G.obj(hung_kibble)


def sign(A):
    """a framed sign on the bracket by the arch: crossed picks over a lump of ore, painted on both faces"""
    X = -3.3
    A.box(X - .022, X + .022, 2.13, 2.59, 3.39, 3.86, oak)
    for (y0, y1, z0, z1) in ((2.555, 2.598, 3.382, 3.868), (2.122, 2.165, 3.382, 3.868), (2.165, 2.555, 3.382, 3.425), (2.165, 2.555, 3.825, 3.868)):
        A.box(X - .03, X + .03, y0, y1, z0, z1, oak_d)
    zc, yc = 3.625, 2.36
    for sg in (-1, 1):
        xf = X + sg * .027
        A.poly([(xf, 2.17, 3.43), (xf, 2.17, 3.82), (xf, 2.55, 3.82), (xf, 2.55, 3.43)], [(0, 1, 2, 3)], paint)
        for d in (1, -1):                                                                        # the two picks, crossed
            xe = X + sg * (.032 if d > 0 else .04)                                               # each its own layer, 4+ mm apart
            a = (zc - d * .13, yc - .14); b = (zc + d * .11, yc + .12)
            vstroke(A, xe, a, b, .022, sign_haft)
            ux, uy = (b[0] - a[0]), (b[1] - a[1]); L = math.hypot(ux, uy); ux, uy = ux / L, uy / L
            px, py = -uy, ux
            h0 = (b[0] - ux * .02, b[1] - uy * .02)
            pts = [(h0[0] - px * .12 - ux * .03, h0[1] - py * .12 - uy * .03), (h0[0] + px * .12 - ux * .03, h0[1] + py * .12 - uy * .03),
                   (h0[0] + px * .03 + ux * .025, h0[1] + py * .03 + uy * .025), (h0[0] - px * .03 + ux * .025, h0[1] - py * .03 + uy * .025)]
            A.poly([(xe + sg * .004, p[1], p[0]) for p in pts], [(0, 1, 2, 3)], sign_iron)
        lump = [(zc + .055 * math.cos(k * math.pi / 3 + .3), yc - .12 + .04 * math.sin(k * math.pi / 3 + .3)) for k in range(6)]
        A.poly([(X + sg * .032, p[1], p[0]) for p in lump], [tuple(range(6))], copper[0])
    for z in (3.47, 3.78):
        Q.ring(A, (X, 2.75, z), (0, 0, 1), .062, .014, iron, segs=6)                              # rings round the bracket
        A.tube((X, 2.69, z), (X, 2.6, z), .009, 4, iron)
        A.box(X - .012, X + .012, 2.59, 2.62, z - .02, z + .02, iron)                              # the staple in the board


G.obj(sign)
G.build(root)

# =========================================================== the smith's lean-to: hearth, ore crates, anvil
S = Part('Quarry_FurnishingPropsSmithy')


def bellows(A, dy=-.07):
    """a hand bellows hung by its handles on a peg in the east jamb, its nozzle down (drawn with the hearth, so it stays
    with it in the cutaway; its wood kept under 1.4 m so the hearth's wood piece is not a tall thin post)"""
    zc, x0, x1 = -.46, 5.09, 5.15
    out = [(-.105, 1.36), (-.12, 1.28), (-.09, 1.16), (-.035, 1.075), (.035, 1.075), (.09, 1.16), (.12, 1.28), (.105, 1.36)]
    out = [(dz, y + dy) for dz, y in out]; yc = 1.22 + dy
    for xa, xb in ((x0, x0 + .014), (x1 - .014, x1)):
        Q.plate_x(A, xa, xb, [(zc + dz, y) for dz, y in out], oak_l)                           # the two boards
    Q.plate_x(A, x0 + .014, x1 - .014, [(zc + dz * .88, yc + (y - yc) * .92) for dz, y in out], leather, caps=False)
    for x in (x0 + .007, x1 - .007):
        A.beam((x, 1.35 + dy, zc), (x, 1.45 + dy, zc), .032, .022, oak_l)                        # handles (4 mm proud of the boards)
    A.tube((x1 - .03, 1.09 + dy, zc), (x1 - .03, .99 + dy, zc), .013, 6, iron, r2=.008)         # nozzle
    A.tube((5.075, 1.42 + dy, zc), (5.165, 1.42 + dy, zc), .01, 5, oak_d)                       # the peg


def hearth(A):
    """the smith's hearth: a rubble body on a plinth, dressed kerb stones round a firepot of glowing coals fed by the
    tuyere, stone jambs and a dressed lintel, a plastered hood sooted near the top rising into the chimney; tongs on the
    kerb, a pick head heating in the coals, a hand bellows hung on the east jamb"""
    A.box(4.27, 5.11, .002, .12, -.88, 0, rubble_d)
    A.box(4.3, 5.08, .12, .8, -.86, -.03, rubble)
    y0, y1 = .8, .92
    A.box(4.25, 5.12, y0, y1, -.9, -.62, kerb); A.box(4.25, 5.12, y0, y1, -.26, .02, kerb)
    A.box(4.25, 4.47, y0, y1, -.62, -.26, kerb); A.box(4.9, 5.12, y0, y1, -.62, -.26, kerb)
    A.box(4.48, 4.89, .8, .86, -.61, -.27, hearth_ash, skip='b')
    Q.lumps(A, 4.5, 4.87, -.58, -.3, .866, .935, [coal, glow], rng, n=7, rmin=.022, rmax=.038)
    A.tube((4.685, .885, -.7), (4.685, .878, -.56), .03, 8, iron)                                  # the tuyere
    for x0, x1 in ((4.3, 4.42), (4.96, 5.08)):
        A.box(x0, x1, y1, 1.58, -.88, -.1, rubble)                                               # jambs
    A.box(4.27, 5.11, 1.46, 1.58, -.12, .03, kerb)                                               # a dressed stone lintel
    b0 = (4.28, 5.1, -.88, .035); b1 = (4.47, 4.93, -.8, -.3); ym, yt = 1.9, 2.15
    lerp = lambda f: tuple(b0[i] + (b1[i] - b0[i]) * f for i in range(4))
    for (ya, yb, fa, fb, m) in ((1.58, ym, 0, (ym - 1.58) / (yt - 1.58), hood_c), (ym, yt, (ym - 1.58) / (yt - 1.58), 1, soot)):
        a, b = lerp(fa), lerp(fb)
        A.poly([(a[0], ya, a[3]), (a[1], ya, a[3]), (b[1], yb, b[3]), (b[0], yb, b[3])], [(0, 1, 2, 3)], m)      # front
        A.poly([(a[1], ya, a[2]), (a[0], ya, a[2]), (b[0], yb, b[2]), (b[1], yb, b[2])], [(0, 1, 2, 3)], m)      # back
        A.poly([(a[0], ya, a[2]), (a[0], ya, a[3]), (b[0], yb, b[3]), (b[0], yb, b[2])], [(0, 1, 2, 3)], m)      # west
        A.poly([(a[1], ya, a[3]), (a[1], ya, a[2]), (b[1], yb, b[2]), (b[1], yb, b[3])], [(0, 1, 2, 3)], m)      # east
    # tongs on the front kerb, their jaws in the fire; a pick head heating in the coals
    Q.tongs(A, 4.62, -.33, y1, -math.pi / 2, iron)
    Q.pick_head(A, (4.7, .95, -.44), (0, 0, 1), (1, 0, 0), iron, arm=.17, tip=hot)
    bellows(A)


S.obj(hearth)



def ore_crate(A, x0, x1, z0, z1, ore, marks):
    """a slatted crate of broken ore, a chalk tally on its front"""
    h = .55
    T.crate(A, x0, x1, 0, h, z0, z1, crateb, batten, lid=False)
    Q.lumps(A, x0 + .04, x1 - .04, z0 + .04, z1 - .04, h - .02, h + .13, ore, rng, n=12, rmin=.05, rmax=.085)
    xf = x0 + .007
    for k in range(marks):
        vstroke(A, xf, (z0 + .16 + k * .04, .225), (z0 + .16 + k * .04, .325), .012, chalk)
    if marks >= 4:
        vstroke(A, x0 + .003, (z0 + .14, .32), (z0 + .16 + 3 * .04 + .02, .23), .012, chalk)        # struck through, 4 mm proud


S.obj(ore_crate, 4.3, 4.92, .6, 1.2, copper, 4)
S.obj(ore_crate, 4.35, 4.97, 1.35, 1.95, tin, 3)


def anvil_block(A):
    """a horned anvil on an iron-banded oak block, a cross-peen hammer lying on its face"""
    A.lathe(4.55, 2.25, 0, [(.3, 0), (.292, .06), (.282, .25), (.278, .5)], 8, bark, top=True, top_m=block_top, rot=.3)
    A.lathe(4.55, 2.25, .38, [(.29, 0), (.29, .05)], 8, iron, top=False, rot=.3)
    Q.anvil(A, 4.55, 2.25, .5, -math.pi / 2, iron, iron_w, coal, s=1.15)
    T.hammer(A, 4.74, 2.4, .845, -2.3, ash_n, iron)


S.obj(anvil_block)
S.build(root)

# =========================================================== the repair bench (service 'Repair bench', name kept)
B = Part('Quarry_ServiceBench_Repair')
bx0, bx1, bz0, bz1, bt = 3.25, 4.22, -.85, -.36, .9


def bench(A):
    """a heavy bench: a top of two thick planks, chamfered legs, rails and a shelf of spare hafts, a leg vise at the front"""
    T.plank_top(A, bx0, bx1, bz0, bz1, bt - .07, bt, [oak_l, oak], along='x', n=2, under=oak_d)
    for x in (bx0 + .07, bx1 - .07):
        for z in (bz0 + .06, bz1 - .06):
            T.oct_prism(A, x, z, .045, .045, .002, bt - .07, oak_d)
        A.box(x - .02, x + .02, .17, .225, bz0 + .06, bz1 - .06, oak_d)                          # end rails
    A.box(bx0 + .07, bx1 - .07, .2, .24, bz0 + .1, bz1 - .1, oak)                                  # the shelf
    for k in range(3):
        A.tube((bx0 + .15, .259, bz0 + .16 + k * .09), (bx1 - .2 + k * .04, .259, bz0 + .15 + k * .09), .017, 6, ash_n, cap_m=endg)
    # the leg vise: a chop in front of the west legs, an iron screw with its tommy bar, a guide bar low down
    A.box(bx0 + .03, bx0 + .19, .08, bt + .06, bz1 + .005, bz1 + .045, oak)
    A.tube((bx0 + .11, .78, bz1 + .15), (bx0 + .11, .78, bz1 - .2), .024, 8, iron)
    A.tube((bx0 - .01, .78, bz1 + .13), (bx0 + .23, .78, bz1 + .13), .011, 6, iron_w)
    A.tube((bx0 + .11, .16, bz1 + .06), (bx0 + .11, .16, bz1 - .2), .018, 6, oak_d)
    # the tool board on the back posts, its cap
    for x in (bx0 + .04, bx1 - .04):
        T.oct_prism(A, x, -.82, .035, .035, bt - .07, 1.93, oak_d)
    A.box(bx0 + .02, bx1 - .02, 1.28, 1.9, -.85, -.83, oak)
    A.box(bx0, bx1, 1.93, 1.98, -.855, -.8, oak_l)
    A.box(bx0 + .01, bx1 - .01, 1.9, 1.93, -.85, -.815, oak_d)


def board_tools(A):
    """on the board: a hand saw, a drawknife, a cross-peen hammer on its pegs, a rasp"""
    zf = -.825
    A.poly([(3.33, 1.47, zf), (3.72, 1.52, zf), (3.72, 1.62, zf), (3.33, 1.6, zf)], [(0, 1, 2, 3)], saw_c)       # saw blade
    for k in range(16):                                                                                  # its teeth
        xa = 3.33 + k * .39 / 16; xb = xa + .39 / 16
        ya, yb = 1.47 + (xa - 3.33) / .39 * .05, 1.47 + (xb - 3.33) / .39 * .05
        A.poly([(xa, ya, zf), (xb - .004, yb - .016, zf), (xb, yb, zf)], [(0, 1, 2)], saw_c)
    A.box(3.72, 3.82, 1.47, 1.66, -.83, -.806, oak_l)                                                    # its handle
    A.tube((3.77, 1.63, -.83), (3.77, 1.63, -.79), .01, 5, oak_d)                                      # hung on a peg
    A.beam((3.35, 1.8, -.815), (3.68, 1.8, -.815), .01, .06, steel)                                   # drawknife blade
    for x, s in ((3.35, -1), (3.68, 1)):
        A.tube((x, 1.8, -.815), (x + s * .07, 1.7, -.8), .016, 6, oak_l)                              # its two handles
    A.tube((3.515, 1.84, -.83), (3.515, 1.84, -.79), .01, 5, oak_d)
    for dx in (-.05, .05):
        A.tube((3.98 + dx, 1.78, -.83), (3.98 + dx, 1.782, -.76), .011, 5, oak_d)                    # hammer pegs
    A.beam((3.9, 1.81, -.785), (4.07, 1.81, -.785), .042, .042, iron)                                 # hammer head
    A.beam((4.07, 1.81, -.785), (4.1, 1.81, -.785), .042, .014, iron)
    A.tube((3.985, 1.79, -.785), (3.985, 1.5, -.79), .014, 6, oak_d)                                  # its haft hanging
    A.box(4.12, 4.15, 1.36, 1.72, -.83, -.81, iron_w)                                                  # rasp
    A.tube((4.135, 1.36, -.82), (4.135, 1.28, -.82), .012, 5, oak_d)


def on_bench(A):
    """on the top: a pick being re-hafted, the broken old haft, iron wedges, a mallet, shavings"""
    y = bt
    Q.pick(A, (3.42, y + .02, -.645), (4.04, y + .028, -.614), ash_n, iron, (-.05, 0, 1))
    A.tube((3.35, y + .02, -.8), (3.62, y + .02, -.76), .019, 6, ash, cap_m=endg)
    A.tube((3.68, y + .02, -.755), (3.86, y + .02, -.73), .019, 6, ash, cap_m=endg)
    for k in range(3):
        A.beam((4.1 + k * .04, y + .008, -.82), (4.11 + k * .04, y + .006, -.73), .025, .012, iron)
    T.mallet(A, 3.3, -.46, y, 0.0, oak_l, oak_d, lying=True)
    for k, (x, z, r) in enumerate(((3.75, -.45, .5), (3.83, -.5, 2.0), (3.7, -.52, 3.4), (3.9, -.44, 1.1))):
        arc(A, x, y + .02, z, .025, 0, math.pi * 1.4, r, .02, .005, shaving, segs=3)


B.obj(bench)
B.obj(board_tools)
B.obj(on_bench)
B.build(root)

# =========================================================== the winch loft: the windlass (service 'Winch', name kept)
W = Part('Quarry_ServiceWinch_Windlass')
F = 2.8; AY, AZ = 4.9, -3.2


def windlass(A):
    """two braced A-frame trestles on sills with bearing blocks and iron caps; a staved drum between iron-tyred cheeks,
    the rope wound on it; an iron spindle with a crank at the west end; a spoked hand wheel with pegs at the east end;
    a ratchet wheel and its pawl"""
    for x in (-4.62, -2.62):
        A.box(x - .08, x + .08, F + .004, F + .12, -3.56, -2.84, oak_d)                             # sill
        for zf in (-3.47, -2.93):
            A.beam((x, F + .1, zf), (x, AY - .19, AZ + (zf - AZ) * .25), .11, .11, oak_d)           # raking legs
        A.box(x - .045, x + .045, 3.66, 3.76, -3.38, -3.02, oak)                                    # collar
        A.box(x - .085, x + .085, AY - .22, AY - .06, AZ - .15, AZ + .15, oak)                      # bearing block
        A.box(x - .075, x + .075, AY - .05, AY + .07, AZ - .11, AZ + .11, iron)                     # the iron cap the spindle turns in
        for s in (-1, 1):
            A.beam((x, AY - .0, AZ + s * .157), (x, AY - .21, AZ + s * .157), .012, .05, iron)     # its straps down the block
    Q.drum(A, -4.45, -2.8, AY, AZ, .26, 12, staves, oak_l, wound, wound_d, iron, rope_x=(-4.36, -2.9), rope_r=.305, turns=15, cheek_r=.37)
    A.tube((-4.9, AY, AZ), (-2.42, AY, AZ), .045, 8, iron)                                        # the spindle
    A.beam((-4.86, AY, AZ), (-4.86, AY - .4, AZ + .1), .06, .035, iron)                              # the crank
    A.tube((-4.86, AY - .4, AZ + .1), (-4.71, AY - .4, AZ + .1), .024, 6, oak_l)                     # its handle
    Q.wheel(A, (-2.5, AY, AZ), (1, 0, 0), .6, 8, 16, oak, iron, rim_w=.075, pegs=8, peg_l=.1, peg_m=oak_l)
    # the ratchet wheel on the spindle by the east trestle, the pawl dropped into its teeth
    n = 12; xr = -2.735; pts = []
    for i in range(2 * n):
        rr = .15 if i % 2 == 0 else .115
        a = math.pi * i / n
        pts.append((AY + rr * math.cos(a), AZ + rr * math.sin(a)))
    V = [(xr - .02, py, pz) for py, pz in pts] + [(xr + .02, py, pz) for py, pz in pts]
    m = len(pts)
    A.poly(V, [tuple(range(m))[::-1], tuple(range(m, 2 * m))] + [(i, (i + 1) % m, m + (i + 1) % m, m + i) for i in range(m)], iron)
    A.beam((-2.735, AY + .24, AZ - .14), (-2.735, AY + .135, AZ + .01), .03, .025, iron)              # the pawl
    A.tube((-2.765, AY + .24, AZ - .14), (-2.69, AY + .24, AZ - .14), .014, 6, iron)                # its pin
    A.box(-2.715, -2.695, AY + .05, AY + .26, AZ - .17, AZ - .11, iron)                             # on a bracket off the cap


W.obj(windlass)
W.build(root)

# =========================================================== the winch loft: balustrade and spare rope
L = Part('Quarry_UpperFurnishingPropsLoft')


def balustrade(A):
    """the loft's edge: chamfered newels with finials, a moulded handrail, a bottom rail and balusters along the
    stairwell; the east rail with a mid rail"""
    for x, z in ((-3.45, -1.45), (-2.9, -1.45), (-2.3, -1.45), (-2.3, -2.6), (-2.3, -3.7)):
        T.oct_prism(A, x, z, .05, .05, F + .004, F + .97, oak_d)
        A.lathe(x, z, F + .97, [(.056, 0), (.04, .025), (.052, .05), (.022, .08), (0, .1)], 8, oak)
    A.box(-3.515, -2.26, 3.72, 3.8, -1.49, -1.41, oak)                                             # south handrail
    A.box(-3.52, -2.255, 3.8, 3.822, -1.497, -1.403, oak_l)                                        # its capping
    A.box(-3.49, -2.26, F + .06, F + .12, -1.482, -1.418, oak_d)                                   # bottom rail
    x = -3.36
    while x < -2.4:
        if abs(x + 2.9) > .07:
            A.box(x - .016, x + .016, F + .12, 3.72, -1.466, -1.434, oak)                          # balusters
        x += .135
    A.box(-2.34, -2.26, 3.72, 3.8, -3.8, -1.495, oak)                                              # east rail
    A.box(-2.345, -2.255, 3.8, 3.822, -3.805, -1.505, oak_l)
    A.box(-2.335, -2.265, 3.26, 3.32, -3.74, -1.49, oak_d)                                         # its mid rail


L.obj(balustrade)
L.obj(Q.coil, -2.74, -1.8, F + .003, .2, .09, hemp, end_a=2.6)
L.build(root)

# ---- early warning: does any new part reach into a stance or a link of the graph the island uses now? ----
nav = ROOT / '.studio-workspaces' / SP['referenceGraph'] / 'candidates' / 'navigation.json'
near = PK.clearance(nav, ['Quarry_FurnishingPropsHall', 'Quarry_FurnishingPropsHung', 'Quarry_FurnishingPropsSmithy', 'Quarry_ServiceBench_Repair',
                          'Quarry_ServiceWinch_Windlass', 'Quarry_UpperFurnishingPropsLoft'])
print('[PROPS_PASS_CLEARANCE]', near)
PK.REPORT['notes'].append({'clearance': near})
PK.save(SP, ROOT)
