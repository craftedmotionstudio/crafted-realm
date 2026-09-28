"""Departure Haven props pass (owner, 2026-09-28: "props ... blocky -> redo in Blender purposefully"; "every object in every
building reviewed in Blender"). The haven at Lanternfoot Cove is where the adventurer leaves the island: its things are
a ferryman's and a harbour's things - rope, oars, pots, casks, lamps on posts, the sailings board and its bell.

From the model the island loads (holm-haven-glazed-review4-v1/haven.blend, Blender 5.1). Haven_Root carries the cove's
quarter turn, so every part is built in the building-local world plan (the space of the graph and the inventory) and
parented with the placement kept. The boat (Haven_ServiceBoat_*: src/holm_island_fx.js sails it), the pier, deck, stair
and rails are not touched. Every prop object is designed again in its old footprint, so the same tiles stay blocked
and every stance, link and target of the graph is unchanged:
 the waiting shelter
  - the two benches (a plank on three plain stone blocks) become stone benches with dressed, chamfered supports and a
    seat of two weathered planks; a lantern and a coil of line on the north bench, a folded sailcloth on the south
    bench, a tar pot with its brush under it;
  - the sea chest (the starter pack; a box with two straps): a sailor's chest with a plinth, board joints, a painted
    lid with a lip, iron corners, lock plate and hasp, rope beckets through cleats at the ends, a name plaque; the coil
    of line that was meant for its lid (the dressing pass placed it after the cove's turn, turned twice, so it lay
    4.8 m inside the cliff) now lies on it;
  - the pegs and the coil of rope hung on the north wall (the cutaway clipped them) become a trough in the corner with
    the ferry's spare oars and a boathook standing in it;
 the pier and the landing stage
  - the lantern posts at the stair head and at the landing's outboard corner (plain posts hung with a box, reaching
    into the air and the water, which the cutaway would clip) stand on cross soles with four knee braces: a dressed
    post, a capped top, a scrolled iron bracket and a horn lantern hung from it;
  - the bollards become mooring bitts (post, iron cap and bands, the cross pin, turns of line), the skiff's two
    lines made fast on the east ones; the fourth bollard, which hung in the air two metres off the stage, becomes a
    mooring pile standing in the water with its cap, bands, weed line and ring;
  - the rope fenders (hung under the stage, under the water) become two rubbing posts with rope bolsters at the
    boarding gap, clear of the gangplank, and a third north of it;
  - the T-head davit: a post on cross soles with knee braces, the luffed jib and its strut, the topping lift, a
    sheave at the head, the fall and an iron hook with a netted load slung over the water, the winch (cheeks, drum
    wound with line, crank) on the post;
  - the two barrels on the T-head: a cask of herring standing open, the fish in brine, and a closed water cask with a
    lobster pot on its head; two more withy pots stacked by the davit;
 - Haven_ServiceNotice_Board ('Departure notice', name kept): two posts on sandstone footings, a framed board facing
   the pier with the painted sailing sign (the skiff under sail, the Lastlight beacon burning), the sailing notices
   pinned up (one sealed), a gabled hood with a ridge roll; the ferry bell (crown, waist, lip band, clapper and pull
   rope) hung in a yoke on a braced arm from the south post.
Plan coordinates (x east, y up, z south; Blender (x, -z, y)), building-local world (the graph's space). Original designs.
Run through tools/rebuild_holm_props_pass.js haven (spec docs/rebuild/holm-overhaul/props-pass/haven.json)."""
import bpy, sys, math, random
from pathlib import Path
from mathutils import Vector
HERE = Path(__file__).resolve().parent; sys.path.insert(0, str(HERE)); ROOT = HERE.parents[1]
import holm_props_pass_kit as PK
from holm_props_pass_kit import C, Part
import holm_trade_props as T
from holm_purposeful_props import arc, ellipsoid, _rot

SP = PK.spec()
PK.begin()
rng = random.Random(10114)
root = PK.obj('Haven_Root')
PK.remove('Haven_Furnishing', 'Haven_FurnishingDressing', 'Haven_Mooring', 'Haven_Props', 'Haven_ServiceNotice_Board')

# ---- palette (sRGB as the game shows it; tex = the kit texture the faces take) ----
oak = C('haven oak', '#7a5a3a', 'beam'); oak_d = C('haven oak dark', '#4f3a27', 'beam'); oak_g = C('haven weathered oak', '#8c7658', 'beam')
plank = C('haven plank', '#9a7a52', 'beam'); withy = C('haven withy', '#9a7a4a', 'beam')
staves = [C('haven stave 1', '#7b5635', 'beam'), C('haven stave 2', '#6c4a2e', 'beam'), C('haven stave 3', '#85603b', 'beam')]
heads = [C('haven head board 1', '#8d6a44', 'beam'), C('haven head board 2', '#81603c', 'beam')]
stone = C('haven sandstone', '#b8a888', 'rock'); stone_d = C('haven stone', '#9d978a', 'rock')
iron = C('haven tarred iron', '#34322f'); rope = C('haven rope', '#a08a5a'); rope_d = C('haven rope dark', '#826c44'); net = C('haven net', '#6b5a3f')
bronze = C('haven bell bronze', '#a9823a'); bronze_d = C('haven bell bronze dark', '#7e6230')
horn = C('haven lantern horn', '#e8cf8a'); glow = C('haven lantern glow', '#ffd27a', emit=1.2)
canvas = C('haven sailcloth', '#d6cbb0'); canvas_d = C('haven sailcloth fold', '#c2b595')
paper = C('haven parchment', '#d9c89a'); paper_l = C('haven parchment pale', '#e6dab4'); ink = C('haven ink', '#1f1c1a'); seal = C('haven seal wax', '#8a2a22')
blue = C('haven paint blue', '#3f5a86'); cream = C('haven paint cream', '#e2d8bc'); red = C('haven paint red', '#8a2e26'); fire = C('haven paint flame', '#e08a2a')
chest_paint = C('haven chest paint', '#4a6e68'); chest_paint_d = C('haven chest paint dark', '#3a5752')
fish = C('haven herring', '#c3ccce'); fish_d = C('haven herring back', '#5f6f78'); brine = C('haven brine', '#4c564e')
tar = C('haven tar', '#1c1917'); weed = C('haven weed', '#3f5a3a'); bristle = C('haven brush', '#5a4632'); lead_grey = C('haven stone grey', '#8f8a80')

F0 = .15          # the shelter's flagstones and the pier deck
LO = -1.05        # the landing stage


# ======================================================= helpers
def sag_rope(A, a, b, drop, r, m, n=6):
    P = [(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n - drop * 4 * (i / n) * (1 - i / n), a[2] + (b[2] - a[2]) * i / n) for i in range(n + 1)]
    for p, q in zip(P, P[1:]):
        A.tube(p, q, r, 6, m)


def ring_y(A, x, z, y, r0, r1, half, m, n=8):
    """a flat ring round a vertical post (a hoop, turns of line)"""
    T.rim_ring(A, Vector((x, y, z)), Vector((0, 1, 0)), Vector((1, 0, 0)), Vector((0, 0, 1)), r0, r1, half, n, m)


def cross_soles(A, x, z, y0, reach, w=.045, shoe=True):
    """two crossing soles (the one along z 2 cm taller, so their tops never share a plane), iron shoes on the four ends"""
    A.box(x - reach, x + reach, y0, y0 + .07, z - w, z + w, oak_d, skip='b')
    A.box(x - w, x + w, y0, y0 + .09, z - reach, z + reach, oak_d, skip='b')
    if shoe:
        for s in (-1, 1):
            a, b = sorted((x + s * (reach - .045), x + s * (reach + .005)))
            A.box(a, b, y0, y0 + .075, z - w - .005, z + w + .005, iron, skip='b')
            a, b = sorted((z + s * (reach - .045), z + s * (reach + .005)))
            A.box(x - w - .005, x + w + .005, y0, y0 + .095, a, b, iron, skip='b')


def knee_braces(A, x, z, y0, reach, top, w=.05):
    for sx, sz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        A.beam((x + sx * .04, top, z + sz * .04), (x + sx * (reach - .06), y0 + .085, z + sz * (reach - .06)), w, w, oak_d)


# ======================================================= the waiting shelter
S = Part('Haven_FurnishingPropsShelter')


def stone_bench(A, x0, x1, z0, z1, along):
    """a stone bench: three dressed, chamfered blocks under a seat of two weathered planks"""
    seat = .62
    for t in (.15, .5, .85):
        if along == 'z':
            T.oct_prism(A, (x0 + x1) / 2, z0 + (z1 - z0) * t, (x1 - x0) / 2 - .05, .15, F0, seat - .06, stone, cut=.25)
        else:
            T.oct_prism(A, x0 + (x1 - x0) * t, (z0 + z1) / 2, .15, (z1 - z0) / 2 - .05, F0, seat - .06, stone, cut=.25)
    T.plank_top(A, x0, x1, z0, z1, seat - .06, seat, [oak_g, plank], along=along, n=2, gap=.008)


S.obj(stone_bench, -5.14, -4.7, -4.0, -1.35, 'z')
S.obj(stone_bench, -4.7, -2.0, -1.3, -.86, 'x')
S.obj(T.rope_coil, -4.93, -1.78, .62, .16, 3, rope, t=.035, n=10)
S.obj(T.lantern, -4.93, -3.72, .62, iron, glow, h=.28)
S.obj(T.folded_cloth, -2.62, -2.14, -1.24, -.92, .62, 3, [canvas, canvas_d], fold_axis='x')


def tar_pot(A):
    """a tar pot on three stubby feet under the bench, a bail handle, the brush standing in the tar"""
    x, z, y = -3.85, -1.07, F0
    for k in range(3):
        a = k * 2 * math.pi / 3 + .3
        A.box(x + math.cos(a) * .08 - .012, x + math.cos(a) * .08 + .012, y, y + .04, z + math.sin(a) * .08 - .012, z + math.sin(a) * .08 + .012, iron)
    A.lathe(x, z, y + .04, [(.08, 0), (.11, .04), (.12, .12), (.115, .16), (.125, .17)], 10, iron, top=True, top_m=tar)
    arc(A, x, y + .21, z, .125, 0, math.pi, 0, .012, .012, iron, segs=6)
    A.tube((x + .03, y + .18, z - .02), (x + .1, y + .36, z - .06), .012, 5, oak)
    A.lathe(x + .02, z - .01, y + .12, [(.02, 0), (.035, .02), (.03, .07), (.02, .08)], 6, bristle, top=True)


S.obj(tar_pot)


def sea_chest(A):
    """the sailor's sea chest in the corner (the starter pack): plinth, board joints, a painted lid with a lip, iron
    corners, lock plate and hasp facing the room, rope beckets through cleats at the ends, a name plaque"""
    x0, x1, z0, z1 = -5.1, -4.56, -5.0, -4.26
    y = F0; bh = .46
    A.box(x0 + .01, x1 - .01, y, y + bh, z0 + .01, z1 - .01, oak)
    for k in (1, 2):
        yy = y + .05 + (bh - .05) * k / 3
        A.box(x0, x1, yy - .005, yy + .005, z0, z1, oak_d, skip='tb')
    A.box(x0 - .005, x1 + .005, y, y + .05, z0 - .005, z1 + .005, oak_d, skip='b')
    A.box(x0 - .02, x1 + .02, y + bh, y + bh + .04, z0 - .02, z1 + .02, chest_paint_d)
    A.box(x0 - .01, x1 + .01, y + bh + .04, y + bh + .12, z0 - .01, z1 + .01, chest_paint)
    top = y + bh + .12
    for cx in (x0, x1):
        for cz in (z0, z1):
            A.box(cx - .03, cx + .03, y + bh - .11, y + bh - .005, cz - .03, cz + .03, iron)
    zc = (z0 + z1) / 2
    A.box(x1 - .01, x1 + .014, y + bh - .15, y + bh - .03, zc - .06, zc + .06, iron, skip='w')
    A.box(x1 + .014, x1 + .026, y + bh - .1, y + bh + .08, zc - .025, zc + .025, iron, skip='w')
    A.box(x1 - .01, x1 + .008, y + .17, y + .26, zc - .2, zc + .2, cream, skip='w')                  # the name board
    for k in range(4):
        zz = zc - .15 + k * .1
        A.poly([(x1 + .012, y + .2, zz - .03), (x1 + .012, y + .2, zz + .03), (x1 + .012, y + .23, zz + .03), (x1 + .012, y + .23, zz - .03)], [(0, 1, 2, 3)], chest_paint_d)
    xc = (x0 + x1) / 2
    for zz, s in ((z0, -1), (z1, 1)):
        for dx in (-.09, .09):
            a, b = sorted((zz, zz + s * .03))
            A.box(xc + dx - .025, xc + dx + .025, y + bh * .52, y + bh * .72, a, b, oak_d)
        arc(A, xc, y + bh * .64, zz + s * .015, .09, math.pi, 2 * math.pi, 0, .016, .026, rope, segs=6)
    return top


S.obj(sea_chest)
S.obj(T.rope_coil, -4.83, -4.63, F0 + .58, .17, 3, rope_d, t=.035, n=10)


def oar_trough(A):
    """the ferry's spare oars and a boathook standing in a trough in the corner, leaning on the north wall"""
    x0, x1, z0, z1 = -5.12, -4.74, -1.32, -.9
    A.box(x0, x1, F0, F0 + .24, z0, z1, oak_d)
    for zz in (z0 + .08, z1 - .08):
        A.box(x0 - .006, x1 + .006, F0, F0 + .245, zz - .02, zz + .02, iron, skip='b')
    for k, zz in enumerate((-1.25, -1.13, -1.01)):
        b = Vector((-4.86, F0 + .22, zz)); t = Vector((-5.17, F0 + 2.2 - .06 * k, zz + .02 * (k - 1)))
        d = (t - b).normalized()
        A.beam(tuple(b - d * .18), tuple(b + d * .42), .13, .018, oak_g)                            # the blade, down in the trough
        A.tube(tuple(b + d * .4), tuple(t), .022, 6, oak)                                         # the loom
        A.tube(tuple(t - d * .12), tuple(t), .026, 6, oak_d)                                      # the grip
        A.tube(tuple(b + d * 1.3), tuple(b + d * 1.36), .03, 6, strap_leather)                    # leather where it lies in the thole
    b = Vector((-4.84, F0 + .24, -.95)); t = Vector((-5.16, F0 + 2.3, -.96)); d = (t - b).normalized()
    A.tube(tuple(b), tuple(t), .02, 6, oak)
    A.tube(tuple(t - d * .06), tuple(t + d * .1), .024, 6, iron)
    h0 = t + d * .1
    A.beam(tuple(h0), tuple(h0 + d * .12), .016, .016, iron)
    A.beam(tuple(h0 + d * .02), tuple(h0 + d * .02 + Vector((.06, -.04, 0))), .016, .016, iron)


strap_leather = C('haven leather', '#5a3a22')
S.obj(oar_trough)
S.build(root)


# ======================================================= mooring: bitts and lines, the pile, fenders, lamp posts, davit
M = Part('Haven_FurnishingPropsMooring')


def bitt(A, x, z, line_to=None):
    """a mooring bitt on the stage's edge: an oak post, iron cap and bands, the cross pin, turns of line; the skiff's
    line made fast on it"""
    y0, top = -1.13, -.62
    T.oct_prism(A, x, z, .12, .12, y0, top - .04, oak_d, cut=.35)
    A.lathe(x, z, top - .04, [(.135, 0), (.135, .025), (.1, .038), (0, .04)], 8, iron)
    for y in (y0 + .1, top - .14):
        A.lathe(x, z, y, [(.132, 0), (.132, .03)], 8, iron, top=False)
    A.tube((x, top - .2, z - .25), (x, top - .2, z + .25), .035, 6, oak)
    for k in range(2):
        ring_y(A, x, z, top - .29 - k * .045, .12, .15, .018, rope)
    if line_to is not None:
        sag_rope(A, (x + .14, top - .29, z), line_to, .12, .022, rope)


for bx, bz, to in ((1.67, -11.9, (2.96, -.26, -12.0)), (1.67, -17.2, (2.96, -.26, -17.06)), (-1.67, -10.9, None)):
    M.obj(bitt, bx, bz, to)


def pile(A):
    """a mooring pile standing in the water off the stage: cap, iron bands, the weed line, a ring"""
    x, z = -3.7, -13.2
    T.oct_prism(A, x, z, .14, .14, -1.75, -.66, oak_d, cut=.35)
    A.lathe(x, z, -.66, [(.155, 0), (.155, .03), (.12, .05), (0, .06)], 8, iron)
    for y in (-.98, -.8):
        A.lathe(x, z, y, [(.152, 0), (.152, .035)], 8, iron, top=False)
    A.lathe(x, z, -1.16, [(.15, 0), (.15, .09)], 8, weed, top=False)
    A.box(x + .135, x + .16, -.92, -.86, z - .02, z + .02, iron)
    T.rim_ring(A, Vector((x + .17, -.95, z)), Vector((0, 0, 1)), Vector((1, 0, 0)), Vector((0, 1, 0)), .045, .065, .01, 8, iron)


M.obj(pile)


def fender_post(A, x, z):
    """a rubbing post at the boarding edge, a bolster of old rope lashed to its outboard face"""
    T.oct_prism(A, x - .04, z, .06, .06, -1.13, -.6, oak_d)
    A.lathe(x - .04, z, -.6, [(.07, 0), (.05, .03), (0, .045)], 6, oak)
    A.lathe(x + .06, z, -1.0, [(.05, 0), (.08, .03), (.088, .13), (.08, .23), (.05, .26)], 8, rope, top=True, bottom=True)
    for y in (-.92, -.82):
        A.lathe(x + .06, z, y, [(.093, 0), (.093, .02)], 8, rope_d, top=False)


for fz in (-13.1, -13.75, -15.9):
    M.obj(fender_post, 1.68, fz)


def lamp_post(A, x, z, y0, ax, h=2.33):
    """a harbour lamp post: cross soles, four knee braces, a dressed post with a capped top, a scrolled iron bracket and
    a horn lantern hung from it (horn panes: unlit by day)"""
    cross_soles(A, x, z, y0, .17)
    knee_braces(A, x, z, y0, .17, y0 + .55)
    T.oct_prism(A, x, z, .07, .07, y0 + .09, y0 + h, oak)
    A.lathe(x, z, y0 + h, [(.09, 0), (.09, .03), (.05, .06), (0, .1)], 8, oak_d)
    top = y0 + h - .2
    ex = x + ax * .5
    A.beam((x, top, z), (ex, top, z), .03, .03, iron)
    A.beam((x, top - .32, z), (x + ax * .38, top, z), .018, .025, iron)
    arc(A, ex - ax * .07, top + .065, z, .065, -math.pi / 2, math.pi, 0 if ax > 0 else math.pi, .014, .02, iron, segs=5)
    T.lantern(A, ex, z, top - .4, iron, horn, h=.32, hang=True)


M.obj(lamp_post, -1.82, -7.9, .12, -1)
M.obj(lamp_post, 1.8, -17.8, -1.1, 1)


def davit(A):
    """the T-head davit: a post on cross soles with knee braces, the luffed jib and its strut, the topping lift, a
    sheave at the head, the fall with an iron hook and a netted load slung over the water; the winch on the post"""
    x, z, y0 = -3.25, -16.9, LO
    cross_soles(A, x, z, y0, .3, w=.06)
    knee_braces(A, x, z, y0, .3, y0 + .7, w=.07)
    T.oct_prism(A, x, z, .12, .12, y0 + .09, y0 + 2.95, oak)
    A.lathe(x, z, y0 + 2.95, [(.14, 0), (.14, .03), (.08, .07), (0, .1)], 8, oak_d)
    heel = Vector((x - .1, y0 + 2.05, z)); head = Vector((x - 1.75, y0 + 3.25, z))
    A.beam(tuple(heel), tuple(head), .12, .14, oak)
    A.beam((x - .1, y0 + 1.15, z), tuple(heel + (head - heel) * .45), .09, .09, oak_d)
    A.lathe(x, z, y0 + 2.0, [(.132, 0), (.132, .1)], 8, iron, top=False)                             # the band the jib bears on
    A.box(head.x - .06, head.x + .06, head.y - .12, head.y + .02, z - .05, z + .05, oak_d)           # sheave block
    A.tube((head.x - .07, head.y - .06, z), (head.x + .07, head.y - .06, z), .012, 5, iron)
    A.tube((x - .05, y0 + 2.9, z), (head.x + .05, head.y, z), .013, 5, rope)                          # topping lift
    A.tube((head.x, head.y - .12, z), (head.x, y0 + 1.66, z), .014, 5, rope)                          # the fall
    A.tube((head.x, y0 + 1.66, z), (head.x, y0 + 1.56, z), .02, 6, iron)
    arc(A, head.x + .035, y0 + 1.53, z, .04, math.pi * .2, math.pi * 1.6, 0, .018, .018, iron, segs=5)
    for dz in (-.07, .07):
        A.tube((head.x + .01, y0 + 1.5, z), (head.x + dz * 2.2, y0 + 1.36, z + dz * 1.4), .01, 4, rope)
    # the netted load: a bag of rope netting bellied round its cargo, three bands of the mesh standing proud
    prof = [(.06, 0), (.2, .08), (.3, .28), (.3, .5), (.22, .66), (.08, .72)]
    A.lathe(head.x, z, y0 + .66, [(r, t) for r, t in prof], 8, net, top=True, bottom=True)
    for t, r in ((.2, .286), (.4, .31), (.58, .276)):
        A.lathe(head.x, z, y0 + .66 + t - .012, [(r + .008, 0), (r + .008, .024)], 8, rope, top=False)
    # the winch on the post's east face: cheeks, a drum wound with line, the crank
    for dz in (-.22, .18):
        A.box(x + .1, x + .38, y0 + .82, y0 + 1.16, z + dz, z + dz + .04, oak_d)
    A.tube((x + .27, y0 + .99, z - .2), (x + .27, y0 + .99, z + .2), .075, 8, oak)
    A.tube((x + .27, y0 + .99, z - .13), (x + .27, y0 + .99, z + .13), .09, 8, rope_d, caps=False)
    A.tube((x + .27, y0 + .99, z - .26), (x + .27, y0 + .99, z - .21), .02, 6, iron)
    A.beam((x + .27, y0 + .99, z - .27), (x + .27, y0 + .8, z - .27), .03, .02, iron)
    A.tube((x + .27, y0 + .8, z - .27), (x + .27, y0 + .8, z - .36), .016, 6, oak_d)
    A.tube((x + .27, y0 + 1.07, z), (x + .12, y0 + 2.85, z), .012, 5, rope_d)


M.obj(davit)
M.build(root)

# ======================================================= cargo on the T-head
K = Part('Haven_FurnishingPropsCargo')


def herring_cask(A):
    """a cask of herring standing open, the fish packed in brine"""
    x, z = -2.5, -15.6
    T.barrel(A, x, z, LO, .29, .78, staves, iron, heads, rot=.5, open_top=True, fill=brine)
    y = LO + .78 - .025 - .06
    r2 = random.Random(5)
    for k in range(7):
        a = k * 2 * math.pi / 7 + r2.uniform(-.3, .3); d = .05 + .09 * (k % 2)
        fx, fz = x + math.cos(a) * d, z + math.sin(a) * d
        rot = a + math.pi / 2 + r2.uniform(-.5, .5)
        ellipsoid(A, fx, y + .012, fz, .075, .016, .026, fish if k % 3 else fish_d, seg=6, rings=3, rot=rot, flat=y + .004)
        tx, tz = _rot(-.085, 0, rot, fx, fz); ux, uz = _rot(-.11, .025, rot, fx, fz); vx, vz = _rot(-.11, -.025, rot, fx, fz)
        A.poly([(tx, y + .02, tz), (ux, y + .03, uz), (vx, y + .03, vz)], [(0, 1, 2)], fish_d)


K.obj(herring_cask)
K.obj(T.barrel, -3.2, -15.55, LO, .29, .78, staves, iron, heads, rot=1.1, bung=oak_d)


def creel(A, x, z, y, L=.5, W=.34, along='x'):
    """a withy lobster pot: a base board, three bent hoops, the netting drawn over them inside the hoops, the funnel
    mouth at one end"""
    R = W / 2
    if along == 'x':
        A.box(x - L / 2, x + L / 2, y, y + .025, z - R, z + R, withy)
    else:
        A.box(x - R, x + R, y, y + .025, z - L / 2, z + L / 2, withy)
    y1 = y + .025
    for a in (-L / 2 + .04, 0, L / 2 - .04):
        if along == 'x':
            arc(A, x + a, y1, z, R - .01, 0, math.pi, math.pi / 2, .02, .02, withy, segs=6)
        else:
            arc(A, x, y1, z + a, R - .01, 0, math.pi, 0, .02, .02, withy, segs=6)
    n = 6; rn = R - .045
    for i in range(n):
        t0, t1 = math.pi * i / n, math.pi * (i + 1) / n
        if along == 'x':
            P = lambda a, t: (x + a, y1 + rn * math.sin(t), z + rn * math.cos(t))
        else:
            P = lambda a, t: (x + rn * math.cos(t), y1 + rn * math.sin(t), z + a)
        a0, a1 = -L / 2 + .04, L / 2 - .04
        A.poly([P(a0, t0), P(a1, t0), P(a1, t1), P(a0, t1)], [(0, 1, 2, 3)], net)
    # the closed end and the funnel mouth
    a0, a1 = -L / 2 + .04, L / 2 - .04
    if along == 'x':
        back = [(x + a0, y1 + rn * math.sin(math.pi * i / n), z + rn * math.cos(math.pi * i / n)) for i in range(n + 1)]
        A.poly(back, [tuple(range(n + 1))], net)
        A.tube((x + a1, y1 + rn * .5, z), (x + a1 - .16, y1 + rn * .5, z), rn * .8, 6, net, caps=False, r2=.035)
    else:
        back = [(x + rn * math.cos(math.pi * i / n), y1 + rn * math.sin(math.pi * i / n), z + a0) for i in range(n + 1)]
        A.poly(back, [tuple(range(n + 1))], net)
        A.tube((x, y1 + rn * .5, z + a1), (x, y1 + rn * .5, z + a1 - .16), rn * .8, 6, net, caps=False, r2=.035)


K.obj(creel, -3.2, -15.55, LO + .78, .5, .34, 'x')


def creel_stack(A):
    creel(A, -3.3, -16.25, LO, .5, .32, 'x')
    creel(A, -3.28, -16.25, LO + .025 + .16 + .01, .46, .3, 'x')


K.obj(creel_stack)
K.build(root)


# ======================================================= the departure notice board and the ferry bell (service)
def notice_board(A):
    """two posts on sandstone footings; a framed board facing the pier with the painted sailing sign and the notices;
    a gabled hood; the ferry bell in a yoke on a braced arm from the south post"""
    xb = -2.05
    for pz in (.35, 1.75):
        T.oct_prism(A, xb, pz, .14, .14, -.25, .1, stone, cut=.3)
        T.oct_prism(A, xb, pz, .075, .075, .1, 2.3, oak)
    A.box(xb - .04, xb + .02, .98, 1.92, .43, 1.67, plank)                                           # the field
    for y0, y1 in ((.9, .98), (1.92, 2.0)):
        A.box(xb - .05, xb + .035, y0, y1, .3, 1.8, oak_d)                                           # rails
    xf = xb + .02
    # the painted sailing sign across the top of the field: the skiff under sail, the Lastlight beacon burning
    A.box(xf, xf + .008, 1.66, 1.88, .5, 1.6, cream, skip='w')
    xs = xf + .013
    Q = lambda z, y: (xs, y, z)
    A.poly([Q(.62, 1.72), Q(1.02, 1.72), Q(1.08, 1.76), Q(.56, 1.76)], [(0, 1, 2, 3)], blue)           # hull
    A.poly([Q(.8, 1.76), Q(.815, 1.76), Q(.815, 1.86), Q(.8, 1.86)], [(0, 1, 2, 3)], ink)              # mast
    A.poly([Q(.83, 1.775), Q(.98, 1.775), Q(.83, 1.85)], [(0, 1, 2)], red)                             # sail
    A.poly([Q(.56, 1.69), Q(1.1, 1.69), Q(1.1, 1.7), Q(.56, 1.7)], [(0, 1, 2, 3)], blue)                # the sea
    A.poly([Q(1.36, 1.68), Q(1.44, 1.68), Q(1.43, 1.8), Q(1.37, 1.8)], [(0, 1, 2, 3)], lead_grey)      # the tower
    A.poly([Q(1.34, 1.8), Q(1.46, 1.8), Q(1.4, 1.87)], [(0, 1, 2)], fire)                              # its fire
    # the sailing notices, pinned up; one sealed
    for k, (zc, yc, w, hh) in enumerate(((.66, 1.36, .3, .4), (1.05, 1.42, .26, .3), (1.42, 1.3, .28, .36), (1.05, 1.13, .22, .18))):
        sx = xf + .006
        A.poly([(sx, yc - hh / 2, zc - w / 2), (sx, yc - hh / 2, zc + w / 2), (sx, yc + hh / 2, zc + w / 2), (sx, yc + hh / 2, zc - w / 2)], [(0, 1, 2, 3)], paper if k % 2 else paper_l)
        for li in range(4 if hh > .3 else 2):
            v = yc + hh / 2 - .06 - li * .06
            e = w / 2 - .04 - .05 * (li % 2)
            A.poly([(sx + .004, v, zc - w / 2 + .04), (sx + .004, v, zc + e), (sx + .004, v + .014, zc + e), (sx + .004, v + .014, zc - w / 2 + .04)], [(0, 1, 2, 3)], ink)
        A.box(sx, sx + .008, yc + hh / 2 - .03, yc + hh / 2 - .015, zc - .008, zc + .008, iron, skip='w')
    A.tube((xf + .01, 1.2, 1.5), (xf + .02, 1.2, 1.5), .03, 8, seal)
    # the gabled hood: two sloped boards, a ridge roll, barge boards at the ends
    z0, z1 = .2, 1.9
    for s in (-1, 1):
        a = [(xb, 2.34, z0), (xb, 2.34, z1), (xb + s * .38, 2.12, z1), (xb + s * .38, 2.12, z0)]
        b = [(p[0], p[1] + .035, p[2]) for p in a]
        A.poly(a + b, [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], oak_d)
    A.tube((xb, 2.38, z0 - .02), (xb, 2.38, z1 + .02), .035, 6, oak)
    # the ferry bell on a braced arm from the south post, in a little yoke
    A.beam((xb, 2.13, .42), (xb, 2.13, -.3), .08, .1, oak_d)
    A.beam((xb, 1.7, .35), (xb, 2.09, .0), .06, .06, oak_d)
    A.box(xb - .06, xb + .06, 2.02, 2.08, -.22, -.08, oak)
    A.lathe(xb, -.15, 1.68, [(.18, 0), (.19, .015), (.17, .03), (.13, .1), (.115, .2), (.1, .29), (.06, .325), (0, .34)], 12, bronze)
    A.lathe(xb, -.15, 1.695, [(.195, 0), (.19, .02)], 12, bronze_d, top=False)
    A.tube((xb, 1.9, -.15), (xb, 1.66, -.15), .008, 4, iron)
    ellipsoid(A, xb, 1.635, -.15, .032, .036, .032, iron, seg=6, rings=3)
    A.tube((xb, 1.61, -.15), (xb, 1.24, -.15), .012, 5, rope)
    A.lathe(xb, -.15, 1.2, [(.02, 0), (.03, .02), (.02, .04)], 6, rope, top=True, bottom=True)


Sn = Part('Haven_ServiceNotice_Board')             # a service: the runtime keeps it whole, so no welding
notice_board(Sn)
Sn.build(root)

names = ['Haven_FurnishingPropsShelter', 'Haven_FurnishingPropsMooring', 'Haven_FurnishingPropsCargo', 'Haven_ServiceNotice_Board']
nav = ROOT / '.studio-workspaces' / SP['referenceGraph'] / 'candidates' / 'navigation.json'
for w in PK.clearance(str(nav), names):
    print('[CLEARANCE]', w)
    PK.REPORT['notes'].append('clearance ' + ' '.join(map(str, w)))
PK.save(SP, ROOT)
