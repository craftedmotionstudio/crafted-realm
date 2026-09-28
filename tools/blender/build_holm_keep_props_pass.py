"""Warden's Keep props pass (owner, 2026-09-28: "props ... blocky -> redo in Blender purposefully"; "every object in every
building reviewed in Blender"). The keep is the island's garrison: its things are a soldier's things.

Reconciled from the model that ships: the island loads .studio-workspaces/holm-keep-oldschool-v1/candidates/keep.glb,
whose own .blend (keep.blend beside it) re-exports that GLB node for node; this script opens that .blend (the older
build scripts and the v8 .blend the graph used to be measured on no longer match it: the v8 .blend carries a preview
ground the model does not). Every furnishing object of the keep was a plain box (12-84 triangles) or the v6 dressing's
stubs; they are all taken away and every object is designed again, in its old footprint and at its old height, so the
same tiles stay blocked and every stance, link and target of the graph is unchanged:

 hall (ground floor)
  - the three weapon stands by the west wall: spear racks - two dressed posts on cross feet, a notched top rail and a
    butt rail, spears with leaf blades and ferrules (the middle rack holds a halberd), a nasal helm on each rack's
    wall post, a round board shield hung on the last rack;
  - the hall table and its benches: a trestle table (planked top, wedged stretcher) between two slab-legged benches;
    on it the muster roll weighted by a tankard, a cob loaf on its board, three tankards, a candlestick, a sword
    laid by a whetstone;
  - under the stair: two meal sacks, a battened crate, a small barrel; the hall corners: a water barrel and a crate
    (south-east), a barrel of arrows with fletched shafts and two board shields leaning on the wall (south-west);
 barracks range (ground floor, north-east)
  - the three "bunks" (1 m cubes with a blanket laid on top) become the recruits' iron-bound kit chests, each with a
    folded blanket and a strapped bedroll on its lid and a helm on one of them;
  - the mess table: a trestle table with tankards, a jug, a dice cup and dice, a nine men's morris board with its
    stones, a lantern; two stools on the open side;
 the warden's quarters (upper floor)
  - the stairwell rail becomes a balustrade (newels with ball finials, a handrail, square balusters);
  - the desk: turned legs, a drawer, the duty book open with the quill and inkwell, a candlestick, a stack of books,
    sealed letters, a stool under it;
  - the two long bed boxes become two beds (posts, panelled headboard, ticking mattress, blanket, turned-down sheet,
    pillow) with a blanket chest at each foot (the chest keeps the bed's old reach).
Plan coordinates (x east, y up, z south; Blender (x, -z, y)), keep-local. Original designs.
Run through tools/rebuild_holm_props_pass.js keep (spec docs/rebuild/holm-overhaul/props-pass/keep.json)."""
import bpy, sys, math, random
from pathlib import Path
HERE = Path(__file__).resolve().parent; sys.path.insert(0, str(HERE)); ROOT = HERE.parents[1]
import holm_props_pass_kit as PK
from holm_props_pass_kit import C, Part
import holm_trade_props as T
import holm_purposeful_props as PP

SP = PK.spec()
PK.begin()
rng = random.Random(20260928)

# ---- take away the plain boxes (every furnishing object; the flags, boards, stair and shell stay) ----
PK.remove('Keep_Furnishing_3_1', 'Keep_Furnishing_3_21', 'Keep_Furnishing_3_9', 'Keep_Furnishing_Dressing',
          'Keep_Upper_Furnishing_4_1', 'Keep_Upper_Furnishing_4_13', 'Keep_Upper_Furnishing_4_2', 'Keep_Upper_Furnishing_4_2.001',
          'Keep_Upper_Furnishing_Dressing')

# ---- palette (sRGB as the game shows it; tex = the kit texture the faces take) ----
oak = C('keep oak', '#6e4b2e', 'beam'); oak_l = C('keep oak light', '#7b5534', 'beam'); oak_d = C('keep oak dark', '#4d3421', 'beam')
endg = C('keep end grain', '#8a6843', 'beam'); ash = C('keep ash shaft', '#9a7850', 'beam')
iron = C('keep iron', '#3a3b3a'); steel = C('keep steel', '#9aa1a4'); steel_d = C('keep steel dark', '#6f7577'); brass = C('keep brass', '#b39146')
pewter = C('keep pewter', '#8d918f'); pewter_d = C('keep pewter band', '#6d716f')
staves = [C('keep stave 1', '#7b5635', 'beam'), C('keep stave 2', '#6c4a2e', 'beam'), C('keep stave 3', '#85603b', 'beam')]
heads = [C('keep head board 1', '#8d6a44', 'beam'), C('keep head board 2', '#81603c', 'beam')]
crateb = [C('keep crate 1', '#9a7a52', 'beam'), C('keep crate 2', '#8a6b46', 'beam'), C('keep crate 3', '#a4845a', 'beam')]
batten = C('keep crate batten', '#6a4c2f', 'beam')
sackc = [C('keep sackcloth', '#c4b184'), C('keep sackcloth dark', '#b09c70')]; cord = C('keep cord', '#7a6440')
leather = C('keep leather', '#5a3a22'); strap = C('keep strap', '#4a2e1b')
blank = [C('keep blanket red', '#6b2a22'), C('keep blanket slate', '#5f6a74'), C('keep blanket brown', '#6b5a3c')]
linen = C('keep linen', '#e3d7b6'); ticking = C('keep ticking', '#d6cdb2'); ticks = C('keep ticking stripe', '#6f7f95')
paper = C('keep parchment', '#d9c89a'); paper_l = C('keep parchment pale', '#e4d7ae'); ink = C('keep ink', '#1f1c1a'); wax_seal = C('keep seal wax', '#8a2a22')
bread = C('keep bread crust', '#c08a4a'); score = C('keep bread score', '#e6c98e'); rind = C('keep cheese rind', '#c9a24a'); paste = C('keep cheese', '#ecd9a0')
wax = C('keep candle wax', '#efe6c8'); flame = C('keep candle flame', '#ffc15a', emit=1.5); glow = C('keep lantern glow', '#ffd27a', emit=1.2)
bone = C('keep bone', '#e8dcc0'); pip = C('keep pip', '#2a2420'); stone_w = C('keep whetstone', '#7f7a70')
shield_red = C('keep shield red', '#7c2a26'); shield_blue = C('keep shield blue', '#3f5a86'); shield_board = C('keep shield board', '#8a6a44', 'beam')
feather = C('keep fletching', '#e6e0d0'); jug_c = C('keep jug glaze', '#9a5a36'); jug_in = C('keep jug inside', '#3a2a20'); jug_band = C('keep jug band', '#d8c8a0')
morris = C('keep morris board', '#8d6d45', 'beam'); morris_l = C('keep morris line', '#2e2419'); w_stone = C('keep counter white', '#e6e2d6'); b_stone = C('keep counter black', '#2d2b29')
ale = C('keep ale', '#5a3a16'); water = C('keep water', '#4f6a72')

# =========================================================== hall: the weapon stands by the west wall
A = Part('Keep_Furnishing_PropsArms')
for k, c in enumerate((-7.3, -6.3, -5.3)):
    g = A.group()                                                                          # one rack = one standing object
    xw, xe = -9.42, -8.6                                                                   # wall post, room post
    for px in (xw, xe):
        A.box(px - .07, px + .07, 0, .06, c - .16, c + .16, oak_d)                         # cross foot
        A.box(px - .075, px + .075, 0, .07, c + .13, c + .165, iron)                        # iron shoes on its ends
        A.box(px - .075, px + .075, 0, .07, c - .165, c - .13, iron)
        T.oct_prism(A, px, c, .042, .042, .06, 1.62, oak)
        A.lathe(px, c, 1.62, [(.05, 0), (.05, .025), (.035, .04), (.02, .045)], 8, oak_d, top=True)
    A.box(xw, xe, 1.44, 1.52, c - .035, c + .035, oak_l)                                   # top rail
    A.box(xw, xe, .2, .27, c - .035, c + .035, oak_l)                                      # butt rail
    A.box(xw, xe, .02, .045, c - .02, c + .02, oak_d)                                      # sill
    for j, sx in enumerate((-9.22, -9.01, -8.8)):
        A.box(sx - .03, sx + .03, 1.52, 1.528, c - .042, c + .042, oak_d)                  # the notch the shaft sits in
        lean = (j - 1) * .025
        if k == 1 and j == 1:
            T.halberd(A, (sx, .045, c), (sx + lean, 2.42, c + .02), ash, steel)
        else:
            T.spear(A, (sx, .045, c), .3, (sx + lean, 2.36 - .04 * j, c - .02 + .02 * j), ash, steel, ferrule=iron)
    T.helmet(A, xw, c, 1.665, .13, steel_d, band=iron, rot=0.0)                               # a helm set on the wall post
    if k == 2:
        T.round_shield(A, (-8.515, 1.0, -5.3), (1, 0, 0), .3, [shield_board, shield_red, shield_board], iron, steel_d)
        A.tube((-8.555, 1.28, -5.3), (-8.515, 1.28, -5.3), .012, 6, iron)                     # the peg it hangs from
    A.close(g)
A.build(None)

# =========================================================== hall: the table, its benches and what is on it
H = Part('Keep_Furnishing_PropsHallTable')
t = .92
H.obj(T.trestle_table, -6.42, -4.18, -3.86, -2.94, t, oak, oak_d, endg, along='x')
H.obj(T.bench, -6.6, -4.0, -4.235, -3.975, .46, oak, oak_d, along='x')
H.obj(T.bench, -6.6, -4.0, -2.825, -2.565, .46, oak, oak_d, along='x')


def muster(A):
    """the muster roll unrolled across the table, the rolled end at its head"""
    A.box(-5.25, -4.62, t, t + .006, -3.72, -3.36, paper, skip='b')
    for li in range(6):
        zz = -3.66 + li * .05
        A.box(-5.16, -4.72 + (.08 if li % 3 == 2 else 0), t + .01, t + .011, zz, zz + .008, ink, skip='b')
    T.scroll(A, (-5.26, t + .022, -3.74), (-5.26, t + .022, -3.34), .022, paper_l)


H.obj(muster)
H.obj(PP.tankard, -4.58, -3.42, t + .006, .15, pewter, pewter_d, rot=.4, inside=ale)       # holding the roll down


def bread_set(A):
    """a cob loaf on its board, the knife beside it"""
    T.bread_board(A, -5.9, -3.4, t, .34, .22, oak_l, rot=.1)
    T.loaf(A, -5.92, -3.41, t + .025, .22, .16, .1, bread, score, rot=.1)
    T.knife(A, -5.72, -3.26, t + .025, .3, steel, oak_d)


H.obj(bread_set)
H.obj(PP.cheese, -5.62, -3.62, t, .075, .06, rind, paste, rot=2.2)
for x, z, r in ((-6.2, -3.72, .2), (-5.35, -3.1, 2.8), (-4.42, -3.72, 1.1)):
    H.obj(PP.tankard, x, z, t, .15, pewter, pewter_d, rot=r, inside=ale)
H.obj(T.candlestick, -4.95, -3.12, t, brass, wax, flame, h=.16)


def blade(A):
    """a sword laid by the whetstone at the bench end of the table"""
    T.sword(A, (-6.3, t + .012, -3.05), (-5.55, t + .012, -3.0), steel, iron, leather, brass)
    A.rbox(-5.45, -3.1, .16, .05, t, t + .035, .2, stone_w)


H.obj(blade)
H.build(None)

# =========================================================== hall: stores under the stair and in the corners
S = Part('Keep_Furnishing_PropsStores')
S.obj(T.sack, -9.1, 1.25, 0, .4, .6, sackc[0], cord, rot=.3, slump=.03)
S.obj(T.sack, -8.55, 1.3, 0, .36, .55, sackc[1], cord, rot=1.2, slump=-.02)
S.obj(T.crate, -9.4, -8.8, 0, .5, 1.55, 1.95, crateb, batten)
S.obj(T.barrel, -8.2, 1.6, 0, .26, .7, staves, iron, heads, rot=.4, bung=oak_d)


def water_barrel(A):
    """south-east corner: an open water barrel, a dipper hung on its rim"""
    T.barrel(A, -3.6, 5.55, 0, .3, .85, staves, iron, heads, rot=.2, open_top=True, fill=water)
    A.tube((-3.6, .86, 5.3), (-3.42, 1.02, 5.24), .012, 5, oak_d)
    A.lathe(-3.62, 5.33, .8, [(.045, 0), (.06, .05)], 8, oak_l, top=True, top_m=water)


S.obj(water_barrel)
S.obj(T.crate, -4.2, -3.72, 0, .55, 5.25, 5.9, crateb, batten)


def arrows(A):
    """south-west corner: a barrel of arrows, fletched shafts standing in it"""
    T.barrel(A, -9.3, 5.55, 0, .28, .75, staves, iron, heads, rot=.9, open_top=True, fill=oak_d)
    for i in range(9):
        a = i * 2 * math.pi / 9 + .3; rr = .07 + .08 * (i % 2)
        x0, z0 = -9.3 + math.cos(a) * rr, 5.55 + math.sin(a) * rr
        x1, z1 = -9.3 + math.cos(a) * (rr + .06), 5.55 + math.sin(a) * (rr + .06)
        A.tube((x0, .65, z0), (x1, 1.22, z1), .008, 4, ash, caps=False)
        for fa in (0, math.pi / 2):
            fx, fz = math.cos(fa) * .022, math.sin(fa) * .022
            A.poly([(x1 - fx, 1.1, z1 - fz), (x1 + fx, 1.1, z1 + fz), (x1 + fx, 1.2, z1 + fz), (x1 - fx, 1.2, z1 - fz)], [(0, 1, 2, 3)], feather)


S.obj(arrows)
S.obj(T.round_shield, (-9.1, .44, 5.905), (-.05, .26, -1), .25, [shield_board, shield_red, shield_board], iron, steel_d)
S.obj(T.round_shield, (-9.62, .44, 5.905), (.05, .26, -1), .25, [shield_board, shield_blue, shield_board], iron, steel_d)
S.build(None)

# =========================================================== barracks range: kit chests and the mess table
B = Part('Keep_Furnishing_PropsBarracks')
for k, bx in enumerate((2.3, 3.7, 5.1)):
    g = B.group()                                                                          # a chest and the kit on it
    x0, x1, z0, z1 = bx + .04, bx + .96, -8.64, -7.57
    T.chest(B, x0, x1, z0, z1, .62, oak, oak_d, iron, brass, front='s')
    T.folded_cloth(B, x0 + .08, x1 - .08, z0 + .1, z0 + .62, .62, 3, [blank[k], blank[(k + 1) % 3]], fold_axis='x')
    T.bedroll(B, (x0 + .12, .62 + .09 + .09, z0 + .78), (x1 - .12, .62 + .09 + .09, z0 + .78), .085, linen if k != 1 else blank[2], strap)
    if k == 1:
        T.helmet(B, bx + .5, z0 + .36, .62 + .09, .13, steel_d, band=iron, rot=math.pi / 2)
    if k == 2:
        T.sword(B, (x0 + .1, .62 + .098, z0 + .5), (x1 - .06, .62 + .098, z0 + .44), steel, iron, leather, brass)
    B.close(g)
t = .92
B.obj(T.trestle_table, 2.62, 5.38, -6.02, -5.39, t, oak, oak_d, endg, along='x')
for x, z, r in ((2.95, -5.62, .5), (3.55, -5.82, 2.0), (4.6, -5.6, 1.2)):
    B.obj(PP.tankard, x, z, t, .15, pewter, pewter_d, rot=r, inside=ale)
B.obj(T.jug, 3.2, -5.82, t, .28, jug_c, jug_in, rot=2.6, glaze=jug_band)


def dice_cup(A):
    """the dice cup lying on its side, three dice thrown"""
    A.tube((4.05, t + .045, -5.78), (4.16, t + .045, -5.72), .045, 8, leather, caps=True, cap_m=strap)
    for i, (x, z) in enumerate(((4.24, -5.62), (4.3, -5.7), (4.19, -5.52))):
        T.dice(A, x, z, t, .032, bone, pip, rot=i * .7)


B.obj(dice_cup)
mx, mz, ms = 3.9, -5.58, .3


def morris_game(A):
    """a nine men's morris board scratched on a plank, stones in play"""
    A.box(mx - ms / 2, mx + ms / 2, t, t + .02, mz - ms / 2 + .06, mz + ms / 2 - .06, morris)
    for f in (.42, .28, .14):
        for (a0, b0, a1, b1) in ((-f, -f, f, -f), (-f, f, f, f), (-f, -f, -f, f), (f, -f, f, f)):
            if a0 == a1:
                A.box(mx + a0 * ms / .9 - .003, mx + a0 * ms / .9 + .003, t + .024, t + .025, mz + b0 * ms / 1.5 - .003, mz + b1 * ms / 1.5 + .003, morris_l, skip='b')
            else:
                A.box(mx + a0 * ms / .9 - .003, mx + a1 * ms / .9 + .003, t + .024, t + .025, mz + b0 * ms / 1.5 - .003, mz + b0 * ms / 1.5 + .003, morris_l, skip='b')
    for i, (a, b) in enumerate(((-.42, -.42), (.14, .14), (.42, 0), (-.28, .28), (0, -.28), (.28, .42))):
        A.lathe(mx + a * ms / .9, mz + b * ms / 1.5, t + .025, [(.016, 0), (.016, .008)], 6, w_stone if i % 2 else b_stone, top=True)


B.obj(morris_game)
B.obj(T.lantern, 5.1, -5.72, t, iron, glow, h=.28)
for x in (3.3, 4.7):
    B.obj(T.stool, x, -5.12, .45, .16, oak_l, oak_d, rot=x)
B.build(None)

# =========================================================== upstairs: the warden's quarters (floor 3.2)
F = 3.2
U = Part('Keep_Upper_Furnishing_PropsQuarters')


def balustrade(A):
    """the stairwell balustrade: newels with ball finials, a handrail, square balusters"""
    for z in (-.98, 1.5, 3.93):
        T.oct_prism(A, -7.70, z, .055, .055, F, F + 1.02, oak_d)
        A.lathe(-7.70, z, F + 1.02, [(.05, 0), (.035, .02), (.05, .06), (.03, .1), (0, .12)], 8, oak)
    A.box(-7.75, -7.655, F + .9, F + .96, -.98, 3.93, oak); A.box(-7.74, -7.66, F + .96, F + .98, -.95, 3.9, oak_l)
    A.box(-7.745, -7.655, F + .1, F + .16, -.98, 3.93, oak_d)
    z = .2
    while z < 3.8:
        if abs(z - 1.5) > .08:
            A.box(-7.715, -7.685, F + .16, F + .9, z - .015, z + .015, oak_l)
        z += .22


U.obj(balustrade)
dt = F + .92


def desk(A):
    """the warden's desk: a moulded top, a drawer with a brass knob, turned legs, a stretcher"""
    A.box(-6.35, -4.25, dt - .045, dt, -7.35, -6.25, oak); A.box(-6.37, -4.23, dt - .06, dt - .045, -7.37, -6.23, oak_d)
    A.box(-6.25, -4.35, dt - .22, dt - .06, -7.28, -6.32, oak_d, skip='b')
    A.box(-5.7, -4.9, dt - .2, dt - .08, -6.33, -6.3, oak_l); A.lathe(-5.3, -6.29, dt - .14, [(.012, 0), (.02, .01), (.012, .02)], 6, brass)
    for x in (-6.27, -4.33):
        for zz in (-7.27, -6.33):
            T.turned_leg(A, x, zz, F, dt - .06, .045, oak)
    A.box(-6.27, -4.33, F + .12, F + .16, -6.83, -6.77, oak_d)


U.obj(desk)
U.obj(T.open_book, -5.55, -6.72, dt, .34, .26, leather, paper, ink=ink, rot=.08)


def ink_quill(A):
    T.inkwell(A, -5.02, -6.95, dt, pewter_d, ink)
    T.quill(A, -5.02, -6.95, dt + .06, .6, feather, paper_l)


U.obj(ink_quill)
U.obj(T.candlestick, -4.55, -7.05, dt, brass, wax, flame, h=.18)


def books_stack(A):
    y = dt
    for k, (w, d, th, m) in enumerate(((.26, .19, .05, leather), (.24, .18, .045, blank[1]), (.22, .16, .04, strap))):
        T.closed_book(A, -6.05, -7.0, y, w, d, th, m, paper_l, rot=.1 * k - .05)
        y += th


U.obj(books_stack)


def letters(A):
    """sealed letters waiting for the boat"""
    for k, (x, z, r) in enumerate(((-4.72, -6.55, .3), (-4.64, -6.5, .2))):
        A.rbox(x, z, .16, .11, dt + k * .004, dt + .004 + k * .004, r, paper_l)
        A.lathe(x, z, dt + .008 + k * .004, [(.016, 0), (.016, .006)], 6, wax_seal, top=True)


U.obj(letters)
U.obj(T.at, F, T.stool, -5.3, -6.75, .45, .16, oak_l, oak_d, rot=.3)
for k, (z0, z1) in enumerate(((-5.15, -4.05), (-3.15, -2.05))):
    U.obj(T.bed, -6.35, -4.25, z0, z1, F, oak, oak_d, ticking, linen, blank[k], linen, head='w', post_h=1.0, foot_h=.62)

    def foot_chest(A, z0=z0, z1=z1, k=k):
        """a blanket chest at the bed's foot, a spare blanket folded on it"""
        T.at(A, F, T.chest, -4.15, -3.67, z0 + .15, z1 - .15, .5, oak_l, oak_d, iron, None, front='e', handles=False)
        T.folded_cloth(A, -4.1, -3.72, z0 + .25, z1 - .45, F + .5, 2, [blank[(k + 1) % 3]], fold_axis='z')
    U.obj(foot_chest)
U.build(None)

PK.save(SP, ROOT)
