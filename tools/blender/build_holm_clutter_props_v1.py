"""Island clutter pack v1 (Tutor's Holm v2 land, phase 5, 2026-09-26): the "random medieval objects" that make the Holm
feel lived in (owner: "other random medieval objects to give it a sense of realism, like a broken carriage"), the fences
and gates, Haycombe Farm, the Lanternfoot Cove dressing and the ground decor. Original low-poly pieces in the 2004
old-school manner (close warm shades, few big faces), textured afterwards by material name
(docs/rebuild/holm-overhaul/v2land/clutter-props.textures.json). Placed from data (island-props.json) by
src/holm_island_props.js; a root's `block` [halfX, halfZ] is the footprint the walk graph keeps clear.
Roots (origin at the resting base centre, long axis x, 1 unit = 1 tile):
 yard      barrel, barrel-apples, crate, crate-stack, sack, sack-pile, hay-bale, handcart, wheelbarrow, woodpile,
           chopping-block, water-trough, bench, well, washing-line, lamp-post, milestone, cart-wheel, tools-lean,
           market-stall
 carriage  broken-carriage (a coach down on a smashed wheel, the wheel off in the grass, a split trunk and clothes)
 fences    fence-run (1 tile split rail through the tile centre), fence-post, fence-gate (a field gate swung open)
 farm      barn (4 x 3, blocks), haystack, scarecrow, cabbage-row, sheep, cow, chicken, feed-trough
 cove      lobster-pot, lobster-pot-stack, net-rack, rowboat-upturned, anchor, rope-coil, fish-crates
 decor     grass-clump, daisies, pebbles, mushrooms, fern, thistle, bracken  (instanced by the thousand: no block)
Run: "Blender 4.5/blender.exe" -b --python tools/blender/build_holm_clutter_props_v1.py
Out: .studio-workspaces/holm-clutter-props-v1/candidates/{props.glb,props.blend,manifest.json},
     proof scratchpad/holm_v2_land/props/clutter_lineup.png
v2 (HOLM_CLUTTER_VERSION=2, owner review 4, 2026-09-27: "a lot of the wagon wheels that are on the ground are standing
vertically upright"): v1 exactly, except that a loose spare wheel lies flat on its side in the grass (cart-wheel: it rests
on its hub and one side of its rim, tipped 5 degrees), and a new cart-wheel-lean stands at 20 degrees against a stout
stake driven into the ground behind it, a chock under its front rim (a yard wheel propped against its support). Wheels on
the handcart, the wheelbarrow and the broken carriage are unchanged. Out: .studio-workspaces/holm-clutter-props-v2/."""
import os
VERSION = int(os.environ.get('HOLM_CLUTTER_VERSION', '1'))
import bpy, sys, math, random
from pathlib import Path
HERE = Path(__file__).resolve().parent; sys.path.insert(0, str(HERE)); ROOT = HERE.parents[1]
from holm_interior_kit import Acc, M, barrel, cask, crate, sack, log
from holm_v2_pack import Pack
P = Pack('HOLM_CLUTTER_PROPS_V%d' % VERSION, ROOT / ('.studio-workspaces/holm-clutter-props-v%d/candidates' % VERSION), budget_tris=26000)
rng = random.Random(20260926)
# ---- materials (named for the texture pass: planks / beam / rock / thatch; the rest stay flat close shades)
PLANK = M('Weathered oak planks', '#86653f'); PLANK_D = M('Weathered oak planks dark', '#6d5132'); OAK = M('Oak frame', '#6a4a2e'); OAK_D = M('Oak frame dark', '#553b25')
STAVE = [M('Barrel staves', '#8a6038'), M('Barrel staves dark', '#74502e')]; HOOP = M('Iron band', '#4a4845'); LID = M('Barrel lid boards', '#7a5634')
BOARD = [M('Crate boards', '#9a7a4e'), M('Crate boards light', '#a88a5a'), M('Crate boards dark', '#86683f')]; BATTEN = M('Crate batten oak', '#6e5132')
CLOTH = M('Sackcloth', '#b9a27a'); CLOTH_D = M('Sackcloth dark', '#a08a64'); TIE = M('Sack twine', '#7a6644')
HAY = M('Hay', '#c9aa5a'); HAY_D = M('Hay shade', '#aa8c44'); STONE = [M('Field stone', '#8e8a80'), M('Field stone dark', '#76726a'), M('Field stone light', '#a29d90')]
THATCH = M('Barn thatch', '#9c8246'); SHINGLE = M('Stall shingle', '#7c5a3e'); IRON = M('Iron fittings', '#3f3e3c'); ROPE = M('Hemp rope', '#a8905e')
APPLE = M('Apples red', '#a8382e'); APPLE_G = M('Apples green', '#8a9a3a'); WATER = M('Trough water', '#5a7a8a'); LAMP = M('Lamp glass', '#f2c865', emit=2.0)
PAINT = M('Coach paint green', '#3f5a3a'); PAINT_R = M('Coach paint red trim', '#8a3a2e'); GILT = M('Coach brass fittings', '#a88a44'); LINEN = M('Linen clothes', '#dcd2bc')
LINEN_B = M('Linen clothes blue', '#6a7a9a'); LINEN_R = M('Linen clothes russet', '#9a5a3a'); TRUNK = M('Trunk leather', '#6a3e28')
WOOL = M('Sheep wool', '#e2dccb'); SKIN_D = M('Sheep face', '#3a3430'); HIDE = M('Cow hide', '#8a5a3a'); HIDE_W = M('Cow hide white', '#e8e2d4'); HORN = M('Horn', '#d8ccae')
HEN = M('Hen feathers', '#b07a44'); COMB = M('Hen comb', '#b8342a'); BEAK = M('Hen beak', '#d8a838')
CABBAGE = [M('Cabbage leaves', '#6d8f45'), M('Cabbage leaves pale', '#8aa65a')]; SOIL = M('Tilled soil', '#5a4430'); STRAWHAT = M('Scarecrow straw', '#c7a55c')
NET = M('Fishing net twine', '#8a7a5a'); POT = M('Lobster pot withies', '#8a6a42'); FISH = M('Fish silver', '#9aa2a2')
GRASS = [M('Grass blades', '#6a8a3c'), M('Grass blades dark', '#57752f'), M('Grass blades light', '#7e9a48')]
DAISY = M('Daisy petals', '#ece6d0'); DAISY_Y = M('Daisy eye', '#d8a830'); PEB = [M('Pebble grey', '#8e8b84'), M('Pebble dark', '#6e6b66'), M('Pebble light', '#a8a49a')]
MUSH = M('Mushroom cap', '#a8643e'); MUSH_S = M('Mushroom stalk', '#e0d6c0'); FERN = [M('Fern fronds', '#5a7a34'), M('Fern fronds dark', '#4a682a')]
THISTLE = M('Thistle leaves', '#6a7a4a'); THISTLE_F = M('Thistle flower', '#8a5a9a'); BRACKEN = [M('Bracken fronds', '#8a7a3a'), M('Bracken fronds green', '#6a7a36')]

def ell(A, c, r, m, seg=7, rings=3, rot=0.0):
    """low-poly ellipsoid (a leaf clump, a sheep's body, a hen)"""
    cx, cy, cz = c; rx, ry, rz = r; cs, sn = math.cos(rot), math.sin(rot); V = [(cx, cy - ry, cz)]; F = []
    for i in range(1, rings):
        ph = -math.pi / 2 + math.pi * i / rings
        for j in range(seg):
            th = 2 * math.pi * j / seg; x = rx * math.cos(ph) * math.cos(th); z = rz * math.cos(ph) * math.sin(th)
            V.append((cx + x * cs + z * sn, cy + ry * math.sin(ph), cz - x * sn + z * cs))
    V.append((cx, cy + ry, cz)); top = len(V) - 1
    for j in range(seg): F.append((0, 1 + (j + 1) % seg, 1 + j))
    for i in range(rings - 2):
        a = 1 + i * seg; b = a + seg
        for j in range(seg): F.append((a + j, a + (j + 1) % seg, b + (j + 1) % seg, b + j))
    a = 1 + (rings - 2) * seg
    for j in range(seg): F.append((a + j, a + (j + 1) % seg, top))
    A.poly(V, F, m)
def dpoly(A, V, face, m):
    """a double-sided face: two polys on separate vertices (one poly call with a face and its reverse on the same
    vertices loses one of them in Blender, as the v1 trapdoor leaf did)"""
    A.poly(V, [tuple(face)], m); A.poly(V, [tuple(face)[::-1]], m)
def blade(A, x, z, h, lean, rot, w, m):
    """one crossed pair of grass blades (a thin tapered quad each way), double-sided by two opposite faces"""
    for k in (0, math.pi / 2):
        a = rot + k; c, s = math.cos(a), math.sin(a); tx, tz = x + lean * math.cos(rot), z + lean * math.sin(rot)
        V = [(x - w * c, 0, z - w * s), (x + w * c, 0, z + w * s), (tx, h, tz)]
        A.poly(V, [(0, 1, 2)], m); A.poly(V, [(2, 1, 0)], m)
def wheel(A, c, r, axis, m, hub, n=10, spokes=6, w=.07):
    """a spoked cart wheel centred at c, turning about axis ('x' or 'z')"""
    cx, cy, cz = c
    def P(a, rr, off=0):
        if axis == 'y': return (cx + rr * math.cos(a), cy + off, cz + rr * math.sin(a))
        return (cx + off, cy + rr * math.sin(a), cz + rr * math.cos(a)) if axis == 'x' else (cx + rr * math.cos(a), cy + rr * math.sin(a), cz + off)
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        A.beam(P(a0, r), P(a1, r), .06, w, m)
    for i in range(spokes):
        a = 2 * math.pi * i / spokes; A.beam(P(a, .06), P(a, r - .03), .035, .035, m)
    A.tube(P(0, 0, -w), P(0, 0, w), .06, 6, hub)
def root(name, block=None, kind='clutter', **kw):
    return P.root(name, kind=kind, block=block, **kw), Acc(name + '_Part')

# ================= yard =================
r, A = root('barrel', [.3, .3]); barrel(A, 0, 0, 0, .28, .75, STAVE, HOOP, LID, rng); A.build(r, vcol=False)
r, A = root('barrel-apples', [.3, .3]); barrel(A, 0, 0, 0, .28, .7, STAVE, HOOP, LID, rng)
for i in range(9):
    a = i * 2.4; d = .09 + .08 * (i % 3); ell(A, (math.cos(a) * d, .72, math.sin(a) * d), (.055, .05, .055), APPLE if i % 3 else APPLE_G, seg=5, rings=2)
A.build(r, vcol=False)
r, A = root('crate', [.35, .35]); crate(A, -.3, .3, 0, .55, -.3, .3, BOARD, BATTEN); A.build(r, vcol=False)
r, A = root('crate-stack', [.55, .4]); crate(A, -.62, -.02, 0, .55, -.3, .3, BOARD, BATTEN); crate(A, .02, .56, 0, .5, -.27, .27, BOARD[::-1], BATTEN); crate(A, -.45, .1, .55, 1.05, -.26, .24, BOARD, BATTEN); A.build(r, vcol=False)
r, A = root('sack', [.22, .22]); sack(A, 0, 0, 0, .42, .62, CLOTH, TIE, .4); A.build(r, vcol=False)
r, A = root('sack-pile', [.5, .35])
for (x, z, y, h, m) in ((-.25, .05, 0, .6, CLOTH), (.22, -.05, 0, .56, CLOTH_D), (0, .15, 0, .5, CLOTH), (-.02, -.02, .42, .5, CLOTH_D)):
    sack(A, x, z, y, .4, h, m, TIE, rng.random())
A.build(r, vcol=False)
r, A = root('hay-bale', [.45, .3]); A.box(-.42, .42, 0, .42, -.26, .26, HAY)
for x in (-.2, .2): A.box(x - .015, x + .015, 0, .43, -.265, .265, TIE)
for i in range(6): A.box(-.44 + i * .15, -.36 + i * .15, .42, .45, -.2, .2, HAY_D)
A.build(r, vcol=False)
r, A = root('handcart', [.75, .45])
A.box(-.55, .45, .42, .48, -.38, .38, PLANK); A.box(-.55, .45, .48, .72, -.4, -.36, PLANK_D); A.box(-.55, .45, .48, .72, .36, .4, PLANK_D); A.box(-.59, -.55, .48, .72, -.4, .4, PLANK_D)
for z in (-.46, .46): wheel(A, (0, .32, z), .3, 'z', OAK, IRON, n=10, spokes=6)
A.tube((0, .32, -.46), (0, .32, .46), .03, 6, IRON)
for z in (-.3, .3): A.beam((.45, .45, z), (1.0, .3, z), .05, .05, OAK)
A.beam((-.5, .42, -.3), (-.5, 0, -.3), .05, .05, OAK); A.beam((-.5, .42, .3), (-.5, 0, .3), .05, .05, OAK)
sack(A, -.2, .1, .48, .36, .45, CLOTH, TIE, .3); crate(A, .02, .38, .48, .78, -.3, .02, BOARD, BATTEN)
A.build(r, vcol=False)
r, A = root('wheelbarrow', [.55, .3])
A.slab([(-.35, -.28), (.3, -.22), (.3, .22), (-.35, .28)], .3, .34, PLANK); A.box(-.36, .3, .34, .56, -.3, -.26, PLANK_D); A.box(-.36, .3, .34, .56, .26, .3, PLANK_D); A.box(-.38, -.34, .34, .56, -.3, .3, PLANK_D)
wheel(A, (.42, .2, 0), .2, 'z', OAK, IRON, n=8, spokes=4)
for z in (-.18, .18): A.beam((.42, .2, z * .5), (-.75, .45, z * 1.3), .04, .04, OAK); A.beam((-.2, .3, z), (-.25, 0, z), .04, .04, OAK)
for i in range(5): ell(A, (-.1 + i * .08, .42, -.1 + (i % 2) * .15), (.1, .05, .1), SOIL, seg=5, rings=2)
A.build(r, vcol=False)
r, A = root('woodpile', [.85, .35])
A.box(-.85, .85, 0, .06, -.34, .34, OAK_D)
for row in range(4):
    for i in range(7 - row):
        x = -.72 + i * .24 + row * .12; y = .13 + row * .19; log(A, (x, y, -.3), (x, y, .3), .1, OAK, BOARD[1], n=6)
for x in (-.8, .8): A.box(x - .04, x + .04, 0, 1.15, -.36, -.3, OAK); A.box(x - .04, x + .04, 0, 1.0, .3, .36, OAK)
A.poly([(-.95, 1.2, -.5), (.95, 1.2, -.5), (.95, 1.0, .5), (-.95, 1.0, .5)], [(0, 1, 2, 3)], SHINGLE); A.poly([(-.95, 1.17, -.5), (.95, 1.17, -.5), (.95, .97, .5), (-.95, .97, .5)], [(3, 2, 1, 0)], SHINGLE)
A.build(r, vcol=False)
r, A = root('chopping-block', [.25, .25])
A.lathe(0, 0, 0, [(.24, 0), (.22, .38), (.2, .42)], 8, OAK, top=True, top_m=BOARD[1])
A.beam((-.05, .42, 0), (.28, .78, .05), .035, .035, OAK_D); A.box(-.1, .02, .36, .5, -.02, .02, IRON)
for i in range(4): a = i * 1.7; log(A, (math.cos(a) * .45, .07, math.sin(a) * .45), (math.cos(a) * .45 + .25, .07, math.sin(a) * .45 + .1), .07, OAK, BOARD[1], n=5)
A.build(r, vcol=False)
r, A = root('water-trough', [.65, .28])
A.box(-.62, .62, .08, .5, -.25, -.19, PLANK); A.box(-.62, .62, .08, .5, .19, .25, PLANK); A.box(-.62, -.56, .08, .5, -.25, .25, PLANK_D); A.box(.56, .62, .08, .5, -.25, .25, PLANK_D)
A.box(-.56, .56, .08, .12, -.19, .19, PLANK_D); A.box(-.56, .56, .4, .41, -.19, .19, WATER)
for x in (-.5, .5): A.box(x - .05, x + .05, 0, .1, -.27, .27, OAK_D)
A.build(r, vcol=False)
r, A = root('bench', [.55, .2])
A.box(-.6, .6, .42, .48, -.17, .17, PLANK)
for x in (-.48, .48): A.box(x - .05, x + .05, 0, .42, -.15, .15, OAK_D)
A.build(r, vcol=False)
r, A = root('well', [.75, .75], examine='A deep well. The water down there is cold and clear.', label='Well')
A.lathe(0, 0, 0, [(.62, 0), (.62, .72), (.66, .72), (.66, .8)], 10, STONE[0], top=False)
A.lathe(0, 0, 0, [(.48, 0), (.48, .78)], 10, STONE[1], top=False); A.lathe(0, 0, .5, [(.48, 0)], 10, WATER, top=True)
for i in range(10): dpoly(A, [(math.cos(i * .628) * .66, .8, math.sin(i * .628) * .66), (math.cos((i + 1) * .628) * .66, .8, math.sin((i + 1) * .628) * .66), (math.cos((i + 1) * .628) * .48, .8, math.sin((i + 1) * .628) * .48), (math.cos(i * .628) * .48, .8, math.sin(i * .628) * .48)], (0, 1, 2, 3), STONE[2])
for x in (-.58, .58): A.box(x - .06, x + .06, .7, 2.0, -.06, .06, OAK)
A.tube((-.6, 1.55, 0), (.6, 1.55, 0), .06, 6, OAK_D); A.beam((.6, 1.55, 0), (.78, 1.4, .12), .03, .03, IRON)
A.beam((0, 1.52, 0), (0, 1.05, 0), .015, .015, ROPE); A.lathe(0, 0, .85, [(.1, 0), (.12, .2)], 7, STAVE[0], top=False, bottom=True)
for s in (-1, 1): dpoly(A, [(-.8, 1.95, s * .02), (.8, 1.95, s * .02), (.8, 1.55, s * .75), (-.8, 1.55, s * .75)], (0, 1, 2, 3), SHINGLE)
A.box(-.8, .8, 1.93, 2.02, -.05, .05, OAK_D)
A.build(r, vcol=False)
r, A = root('washing-line', None)
for x in (-1.4, 1.4): A.box(x - .05, x + .05, 0, 1.75, -.05, .05, OAK); A.box(x - .2, x + .2, 1.62, 1.68, -.03, .03, OAK)
pts = [(-1.4 + 2.8 * i / 8, 1.62 - .12 * math.sin(math.pi * i / 8), 0) for i in range(9)]
for a, b in zip(pts, pts[1:]): A.beam(a, b, .012, .012, ROPE)
for i, (x, w, h, m) in enumerate(((-.9, .42, .55, LINEN), (-.35, .3, .7, LINEN_B), (.15, .45, .45, LINEN), (.65, .32, .6, LINEN_R))):
    y = 1.62 - .12 * math.sin(math.pi * (x + 1.4) / 2.8)
    dpoly(A, [(x - w / 2, y, 0), (x + w / 2, y, 0), (x + w / 2 + .03, y - h, .03), (x - w / 2 + .02, y - h, .03)], (0, 1, 2, 3), m)
A.build(r, vcol=False)
r, A = root('lamp-post', [.12, .12])
A.lathe(0, 0, 0, [(.14, 0), (.12, .15)], 6, STONE[1], top=True); A.box(-.05, .05, .15, 2.2, -.05, .05, OAK_D); A.beam((0, 2.1, 0), (.35, 2.1, 0), .05, .05, OAK_D)
A.box(.28, .42, 1.72, 1.98, -.07, .07, LAMP); A.box(.26, .44, 1.98, 2.02, -.09, .09, IRON); A.box(.26, .44, 1.7, 1.72, -.09, .09, IRON)
A.build(r, vcol=False)
r, A = root('milestone', [.15, .15])
A.poly([(-.14, 0, -.1), (.14, 0, -.1), (.14, 0, .1), (-.14, 0, .1), (-.12, .5, -.08), (.12, .5, -.08), (.12, .5, .08), (-.12, .5, .08), (0, .62, -.08), (0, .62, .08)],
       [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 8), (7, 9, 6), (4, 8, 9, 7), (5, 6, 9, 8)], STONE[2])
A.build(r, vcol=False)
def turn_x(A, first, ang, pivot):
    """rotate the vertices added since index first about the plan x axis through pivot (y, z); + tips +z up"""
    py, pz = pivot; c, s = math.cos(ang), math.sin(ang)
    A.v[first:] = [(x, py + (y - py) * c + (z - pz) * s, pz - (y - py) * s + (z - pz) * c) for x, y, z in A.v[first:]]
if VERSION < 2:
    r, A = root('cart-wheel', [.2, .2]); wheel(A, (0, .42, .08), .4, 'z', OAK, IRON, n=10, spokes=6); A.build(r, vcol=False)   # leaning against a wall (placed with a wall behind)
else:
    # v2: a spare wheel lying flat on its side: horizontal, the hub's lower boss on the grass, tipped 5 degrees so the
    # near side of the rim rests on the ground as well (same footprint key as v1, so the dressing keeps every placement)
    r, A = root('cart-wheel', [.2, .2]); wheel(A, (0, .07, 0), .4, 'y', OAK, IRON, n=10, spokes=6)
    turn_x(A, 0, -math.radians(5), (0.0, 0.0)); lo = min(v[1] for v in A.v); A.v = [(x, y - lo, z) for x, y, z in A.v]; A.build(r, vcol=False)
    # v2: a wheel propped at 20 degrees against a stake driven in behind it (-z, toward the wall it is set against), a
    # chock under its front rim: supported, never standing on its own
    r, A = root('cart-wheel-lean', [.2, .2]); wheel(A, (0, .42, 0), .4, 'z', OAK, IRON, n=10, spokes=6)
    turn_x(A, 0, math.radians(20), (0.0, .02)); lo = min(v[1] for v in A.v); A.v = [(x, y - lo, z) for x, y, z in A.v]
    top_z = min(v[2] for v in A.v); A.box(-.05, .05, 0, .88, top_z - .11, top_z - .01, OAK_D); A.box(-.07, .07, .86, .9, top_z - .13, top_z + .01, OAK_D)
    front = max(v[2] for v in A.v if v[1] < .08); A.box(-.12, .12, 0, .07, front - .02, front + .1, OAK)
    A.build(r, vcol=False)
r, A = root('tools-lean', None)
A.beam((-.2, 0, .15), (-.25, 1.5, -.05), .035, .035, OAK); A.box(-.4, -.1, 0, .04, .1, .2, IRON)   # rake
A.beam((.15, 0, .15), (.2, 1.45, -.05), .035, .035, OAK)
for k in (-1, 0, 1): A.beam((.15 + k * .06, 0, .15), (.15 + k * .05, .3, .12), .015, .015, IRON)   # pitchfork tines
A.build(r, vcol=False)
r, A = root('market-stall', [1.0, .55])
A.box(-.95, .95, .78, .84, -.5, .45, PLANK); A.box(-.95, .95, 0, .78, .4, .45, PLANK_D)
for x in (-.92, .92):
    for z in (-.52, .48): A.box(x - .04, x + .04, 0, 1.9 if z < 0 else 2.1, z - .04, z + .04, OAK)
for i in range(6): dpoly(A, [(-1.05 + i * .35, 2.15, .6), (-.7 + i * .35, 2.15, .6), (-.7 + i * .35, 1.85, -.7), (-1.05 + i * .35, 1.85, -.7)], (0, 1, 2, 3), PAINT_R if i % 2 else LINEN)
barrel(A, -.55, 0, .84, .16, .3, STAVE, HOOP, LID, rng)
for i in range(7): ell(A, (-.55 + math.cos(i) * .07, 1.15, math.sin(i) * .07), (.05, .045, .05), APPLE, seg=5, rings=2)
crate(A, -.1, .35, .84, 1.05, -.3, .1, BOARD, BATTEN)
for i in range(5): ell(A, (.1 + (i % 3) * .1 - .1, 1.1, -.2 + (i // 3) * .15), (.06, .05, .06), CABBAGE[i % 2], seg=5, rings=2)
sack(A, .62, -.1, .84, .28, .35, CLOTH, TIE, .2)
A.build(r, vcol=False)

# ================= the broken carriage (old cart track, ~ (79-81, 80-82)) =================
r, A = root('broken-carriage', [1.35, .8], examine="Somebody's journey ended early.", label='Broken carriage')
tilt = math.radians(16); DROP = .12
def T(x, y, z):   # the coach body down on its smashed near-side (z +) wheel: rolled about x, its near sill in the grass
    return (x, .55 - DROP + (y - .55) * math.cos(tilt) - z * math.sin(tilt), z * math.cos(tilt) + (y - .55) * math.sin(tilt))
def tbox(x0, x1, y0, y1, z0, z1, m):
    V = [T(x, y, z) for (x, y, z) in ((x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1))]
    A.poly(V, [(0, 1, 5, 4), (3, 7, 6, 2), (0, 3, 2, 1), (4, 5, 6, 7), (0, 4, 7, 3), (1, 2, 6, 5)], m)
tbox(-.85, .85, .55, .62, -.55, .55, PLANK_D)                    # floor
tbox(-.85, .85, .62, 1.35, -.55, -.5, PAINT); tbox(-.85, .85, .62, 1.35, .5, .55, PAINT)
tbox(-.85, -.8, .62, 1.35, -.5, .5, PAINT); tbox(.8, .85, .62, 1.35, -.5, .5, PAINT)
tbox(-.2, .2, .8, 1.2, -.56, -.54, OAK_D)                        # window on the far side (dark)
tbox(-.3, .3, .62, 1.3, .54, .57, PAINT_R)                        # the near door, hanging open a crack
for x0 in (-.85, .8): tbox(x0, x0 + .05, 1.28, 1.35, -.57, .57, PAINT_R)
roof = [T(x, 1.35 + .18 * math.cos(math.pi * z / 1.1), z) for x in (-.92, .92) for z in (-.6, -.3, 0, .3, .6)]
A.poly(roof, [(i, i + 1, 5 + i + 1, 5 + i) for i in range(4)], M('Coach roof', '#2e2a26'))
A.poly(roof, [(5 + i, 5 + i + 1, i + 1, i) for i in range(4)], M('Coach roof', '#2e2a26'))
for (x, y, z) in ((-.95, 1.0, -.2), (.95, 1.0, -.2)): A.box(x - .03, x + .03, y, y + .12, z - .03, z + .03, GILT)
wheel(A, (-.62, .45, -.62), .45, 'z', OAK, IRON, n=12, spokes=8); wheel(A, (.62, .45, -.62), .45, 'z', OAK, IRON, n=12, spokes=8)   # far wheels whole
# near side: the rear wheel smashed (a few rim pieces and spokes in the grass), the front wheel off, lying flat nearby
for i, a in enumerate((.2, 1.3, 2.4)):
    A.beam((-.62 + .35 * math.cos(a), .04, .7 + .25 * math.sin(a)), (-.62 + .35 * math.cos(a + .7), .04, .7 + .25 * math.sin(a + .7)), .06, .06, OAK)
    A.beam((-.62, .06, .72), (-.62 + .38 * math.cos(a + .3), .03, .72 + .3 * math.sin(a + .3)), .035, .035, OAK)
wheel(A, (1.35, .07, .95), .45, 'y', OAK, IRON, n=12, spokes=8)   # the front wheel off, lying flat in the grass
A.beam((.85, .5, -.2), (1.55, .1, -.35), .06, .06, OAK); A.beam((1.2, .3, -.3), (1.75, .05, .1), .05, .05, OAK_D)   # the broken shaft
A.box(-1.35, -.8, 0, .32, .55, .95, TRUNK); A.box(-1.37, -.78, .3, .36, .53, .97, IRON); dpoly(A, [(-1.35, .36, .55), (-.8, .36, .55), (-.8, .62, .3), (-1.35, .62, .3)], (0, 1, 2, 3), TRUNK)
for (x, z, m) in ((-1.1, 1.15, LINEN), (-.55, 1.2, LINEN_B), (-1.5, .8, LINEN_R)): A.poly([(x - .2, .02, z - .15), (x + .22, .02, z - .12), (x + .18, .03, z + .16), (x - .16, .02, z + .18)], [(0, 1, 2, 3)[::-1]], m)
A.build(r, vcol=False)

# ================= fences and gates =================
r, A = root('fence-run', [.5, .08])   # 1 tile of split-rail fence through the tile centre (x from -.5 to .5)
for x in (-.5,): A.box(x - .06, x + .06, 0, 1.0, -.06, .06, OAK)
for y in (.38, .75): A.beam((-.5, y, 0), (.5, y + rng.uniform(-.03, .03), 0), .07, .09, OAK_D)
A.build(r, vcol=False)
r, A = root('fence-post', [.1, .1]); A.box(-.06, .06, 0, 1.05, -.06, .06, OAK); A.build(r, vcol=False)
r, A = root('fence-gate', None)   # a field gate swung open 70 degrees on its post at x -.5
A.box(-.56, -.44, 0, 1.15, -.06, .06, OAK); A.box(.44, .56, 0, 1.15, -.06, .06, OAK)
g = math.radians(70); gc, gs = math.cos(g), math.sin(g)
def G(u, y): return (-.5 + u * gc, y, -u * gs)
for y in (.25, .55, .85): A.beam(G(.05, y), G(.95, y), .05, .06, PLANK)
A.beam(G(.05, .2), G(.95, .9), .05, .05, PLANK_D); A.beam(G(.05, .15), G(.05, .95), .06, .06, OAK_D); A.beam(G(.95, .15), G(.95, .95), .06, .06, OAK_D)
A.build(r, vcol=False)

# ================= farm =================
r, A = root('barn', [2.05, 1.55], examine='A timber barn. It smells of hay and warm animals.', label='Barn')
W2, D2 = 2.0, 1.5
for (x0, x1, z0, z1) in ((-W2, W2, -D2, -D2 + .1), (-W2, -W2 + .1, -D2, D2), (W2 - .1, W2, -D2, D2)): A.box(x0, x1, 0, 2.0, z0, z1, PLANK)
A.box(-W2, -.8, 0, 2.0, D2 - .1, D2, PLANK); A.box(.8, W2, 0, 2.0, D2 - .1, D2, PLANK); A.box(-.8, .8, 1.7, 2.0, D2 - .1, D2, PLANK)
A.box(-.8, -.3, 0, 1.7, D2, D2 + .08, PLANK_D); A.box(.3, .8, 0, 1.7, D2, D2 + .08, PLANK_D)   # doors swung wide (flat against the front)
A.box(-.75, .75, 0, .02, -D2 + .1, D2 - .1, SOIL)
for x in (-W2, -W2 / 2, 0, W2 / 2, W2):
    for z in (-D2, D2): A.box(x - .08, x + .08, 0, 2.05, z - .08, z + .08, OAK_D)
for s in (-1, 1): dpoly(A, [(-W2 - .25, 2.0, s * (D2 + .3)), (W2 + .25, 2.0, s * (D2 + .3)), (W2 + .25, 3.2, 0), (-W2 - .25, 3.2, 0)], (0, 1, 2, 3), THATCH)
for x in (-W2, W2): dpoly(A, [(x, 2.0, -D2), (x, 2.0, D2), (x, 3.15, 0)], (0, 1, 2), PLANK_D)
A.box(-W2 - .25, W2 + .25, 3.15, 3.25, -.08, .08, OAK_D)
for i in range(3): A.box(-.6 + i * .45, -.2 + i * .45, 0, .42 + (i % 2) * .4, -1.2, -.8, HAY)   # hay inside the open doors
A.box(-1.8, -1.0, 0, .9, -1.3, -.2, HAY_D)
A.build(r, vcol=False)
r, A = root('haystack', [.85, .85])
A.lathe(0, 0, 0, [(.95, 0), (.98, .5), (.85, 1.1), (.5, 1.7), (.15, 2.0), (0, 2.08)], 10, HAY, top=False)
A.box(-.03, .03, 1.9, 2.4, -.03, .03, OAK_D)
for i in range(5): a = i * 1.26; A.poly([(math.cos(a) * .96, .02, math.sin(a) * .96), (math.cos(a + .3) * 1.25, .01, math.sin(a + .3) * 1.25), (math.cos(a + .6) * .96, .02, math.sin(a + .6) * .96)], [(0, 1, 2)[::-1]], HAY_D)
A.build(r, vcol=False)
r, A = root('scarecrow', [.12, .12])
A.box(-.04, .04, 0, 1.7, -.04, .04, OAK); A.box(-.55, .55, 1.3, 1.36, -.03, .03, OAK)
dpoly(A, [(-.25, 1.35, -.12), (.25, 1.35, -.12), (.3, .75, -.14), (-.3, .75, -.14)], (0, 1, 2, 3), LINEN_R); dpoly(A, [(-.25, 1.35, .12), (.25, 1.35, .12), (.3, .75, .14), (-.3, .75, .14)], (0, 1, 2, 3), LINEN_R)
for s in (-1, 1): A.beam((s * .2, 1.33, 0), (s * .55, 1.28, 0), .14, .12, LINEN_B)
ell(A, (0, 1.55, 0), (.15, .17, .15), CLOTH, seg=6, rings=3); A.lathe(0, 0, 1.66, [(.3, 0), (.28, .03), (.13, .05), (.12, .2), (0, .22)], 8, STRAWHAT, top=False)
for s in (-1, 1): dpoly(A, [(s * .55, 1.3, 0), (s * .66, 1.2, .05), (s * .6, 1.15, -.05)], (0, 1, 2), STRAWHAT)
A.build(r, vcol=False)
r, A = root('cabbage-row', None)   # 2 tiles of tilled row with cabbages
A.box(-1.0, 1.0, 0, .08, -.28, .28, SOIL)
for i in range(6):
    x = -.85 + i * .34; ell(A, (x, .16, rng.uniform(-.05, .05)), (.16, .12, .16), CABBAGE[i % 2], seg=6, rings=3); ell(A, (x, .24, 0), (.09, .07, .09), CABBAGE[1 - i % 2], seg=5, rings=2)
A.build(r, vcol=False)
r, A = root('sheep', None, kind='animal', examine='A Holm sheep. It regards you with total indifference.', label='Sheep')
ell(A, (0, .5, 0), (.42, .27, .27), WOOL, seg=8, rings=4); ell(A, (.45, .62, 0), (.14, .12, .11), SKIN_D, seg=6, rings=3)
for s in (-1, 1): dpoly(A, [(.47, .7, s * .09), (.5, .72, s * .2), (.44, .66, s * .12)], (0, 1, 2), SKIN_D)
for (x, z) in ((.25, .13), (.25, -.13), (-.25, .13), (-.25, -.13)): A.box(x - .035, x + .035, 0, .32, z - .035, z + .035, SKIN_D)
A.build(r, vcol=False)
r, A = root('cow', None, kind='animal', examine='A brown and white cow, chewing thoughtfully.', label='Cow')
A.box(-.6, .5, .55, 1.05, -.28, .28, HIDE); A.box(-.2, .2, .56, 1.06, -.285, .285, HIDE_W); A.box(.5, .82, .72, 1.02, -.16, .16, HIDE); A.box(.78, .9, .72, .88, -.12, .12, HIDE_W)
for s in (-1, 1): A.beam((.6, 1.0, s * .12), (.6, 1.1, s * .26), .04, .04, HORN)
for (x, z) in ((.35, .18), (.35, -.18), (-.45, .18), (-.45, -.18)): A.box(x - .06, x + .06, 0, .56, z - .06, z + .06, HIDE)
A.beam((-.6, .95, 0), (-.72, .5, 0), .03, .03, HIDE)
A.build(r, vcol=False)
r, A = root('chicken', None, kind='animal', examine='A hen, pecking at nothing in particular.', label='Chicken')
ell(A, (0, .2, 0), (.14, .1, .1), HEN, seg=6, rings=3); ell(A, (.12, .3, 0), (.06, .06, .05), HEN, seg=5, rings=3)
dpoly(A, [(.17, .31, -.012), (.24, .29, 0), (.17, .29, .012)], (0, 1, 2), BEAK); A.box(.1, .15, .35, .39, -.01, .01, COMB)
dpoly(A, [(-.12, .22, 0), (-.22, .34, -.04), (-.22, .34, .04)], (0, 1, 2), HEN)
for z in (-.04, .04): A.box(-.01, .01, 0, .11, z - .01, z + .01, BEAK)
A.build(r, vcol=False)
r, A = root('feed-trough', [.55, .2])
A.box(-.55, .55, .12, .3, -.18, -.14, PLANK); A.box(-.55, .55, .12, .3, .14, .18, PLANK); A.box(-.55, .55, .1, .14, -.18, .18, PLANK_D); A.box(-.55, .55, .25, .27, -.14, .14, HAY)
for x in (-.45, .45): A.box(x - .04, x + .04, 0, .12, -.2, .2, OAK_D)
A.build(r, vcol=False)

# ================= Lanternfoot Cove =================
def lpot(A, x, z, y, rot=0.0):
    A.lathe(x, z, y, [(.24, 0), (.26, .12), (.22, .32), (.14, .4), (0, .42)], 7, POT, top=False, rot=rot)
    A.lathe(x, z, y, [(.26, 0), (.26, .03)], 7, OAK_D, top=False, rot=rot); A.lathe(x, z, y + .36, [(.08, 0), (.08, .06)], 6, ROPE, top=False)
r, A = root('lobster-pot', [.26, .26]); lpot(A, 0, 0, 0); A.build(r, vcol=False)
r, A = root('lobster-pot-stack', [.45, .3]); lpot(A, -.24, 0, 0); lpot(A, .26, .05, 0, .5); lpot(A, 0, 0, .4, .2); A.build(r, vcol=False)
r, A = root('net-rack', [.95, .12])
for x in (-.9, 0, .9): A.box(x - .05, x + .05, 0, 1.6, -.05, .05, OAK)
A.beam((-.95, 1.55, 0), (.95, 1.55, 0), .06, .06, OAK_D)
for i in range(8):
    x0 = -.88 + i * .22; dpoly(A, [(x0, 1.52, .01), (x0 + .22, 1.52, .01), (x0 + .2, .4 + .15 * math.sin(i), .06), (x0 + .02, .45 + .15 * math.sin(i + 1), .06)], (0, 1, 2, 3), NET)
for i in range(3): A.box(-.7 + i * .6, -.62 + i * .6, .6, .68, .04, .1, M('Net floats', '#c8a060'))
A.build(r, vcol=False)
r, A = root('rowboat-upturned', [1.15, .5])
hull = [(-1.15, 0), (-.9, .38), (-.3, .5), (.4, .5), (.95, .38), (1.2, 0)]
for s in (-1, 1):
    V = [(x, 0, 0) for x, _ in hull] + [(x, .45 - .15 * abs(x), s * w) for x, w in hull]
    A.poly(V, [(i, i + 1, 6 + i + 1, 6 + i) if s > 0 else (6 + i, 6 + i + 1, i + 1, i) for i in range(5)], PLANK_D)
A.poly([(x, .45 - .15 * abs(x), w) for x, w in hull] + [(x, .45 - .15 * abs(x), -w) for x, w in hull], [(i, i + 1, 6 + i + 1, 6 + i)[::-1] for i in range(5)], PLANK)
A.box(-1.2, 1.25, .02, .09, -.04, .04, OAK_D)
for x in (-.6, .6): A.box(x - .07, x + .07, 0, .3, -.35, -.25, OAK)
A.build(r, vcol=False)
r, A = root('anchor', [.2, .2])
A.beam((0, .02, 0), (.1, 1.05, .1), .06, .06, IRON); A.beam((-.1, .95, .0), (.3, 1.15, .2), .04, .04, IRON)
for s in (-1, 1): A.beam((0, .05, 0), (s * .35, .3, s * .05), .05, .05, IRON); dpoly(A, [(s * .35, .3, s * .05), (s * .45, .42, s * .08), (s * .3, .38, s * .03)], (0, 1, 2), IRON)
A.lathe(.12, .12, 1.05, [(.1, 0), (.1, .03)], 6, IRON, top=False)
A.build(r, vcol=False)
r, A = root('rope-coil', None)
for k in range(4): A.lathe(0, 0, k * .045, [(.26 - k * .02, 0), (.26 - k * .02, .045), (.16 - k * .01, .045)], 10, ROPE, top=False)
A.beam((.24, .02, 0), (.55, .01, .2), .03, .03, ROPE); A.build(r, vcol=False)
r, A = root('fish-crates', [.55, .3])
crate(A, -.55, 0, 0, .35, -.28, .28, BOARD, BATTEN); crate(A, .03, .55, 0, .3, -.25, .25, BOARD[::-1], BATTEN)
for i in range(6): ell(A, (-.45 + (i % 3) * .15, .4, -.12 + (i // 3) * .22), (.1, .03, .04), FISH, seg=5, rings=2, rot=rng.uniform(-.4, .4))
A.build(r, vcol=False)

# ================= ground decor (instanced by the thousand; no block) =================
r, A = root('grass-clump', None, kind='decor')
for i in range(7): a = rng.random() * 6.28; d = rng.random() * .12; blade(A, math.cos(a) * d, math.sin(a) * d, rng.uniform(.18, .32), rng.uniform(.03, .08), rng.random() * 6.28, .035, GRASS[i % 3])
A.build(r, vcol=False)
r, A = root('daisies', None, kind='decor')
for i in range(5):
    a = rng.random() * 6.28; d = rng.uniform(.05, .22); x, z = math.cos(a) * d, math.sin(a) * d; blade(A, x, z, .12, .01, rng.random() * 6.28, .012, GRASS[0])
    dpoly(A, [(x + .045 * math.cos(k * 1.257), .12, z + .045 * math.sin(k * 1.257)) for k in range(5)], (0, 1, 2, 3, 4), DAISY); A.box(x - .012, x + .012, .12, .13, z - .012, z + .012, DAISY_Y)
A.build(r, vcol=False)
r, A = root('pebbles', None, kind='decor')
for i in range(5): a = rng.random() * 6.28; d = rng.uniform(0, .25); ell(A, (math.cos(a) * d, .015, math.sin(a) * d), (rng.uniform(.04, .09), .035, rng.uniform(.035, .07)), PEB[i % 3], seg=5, rings=2, rot=rng.random() * 3)
A.build(r, vcol=False)
r, A = root('mushrooms', None, kind='decor')
for i in range(3):
    x, z = rng.uniform(-.12, .12), rng.uniform(-.12, .12); h = rng.uniform(.07, .13)
    A.lathe(x, z, 0, [(.018, 0), (.015, h)], 5, MUSH_S, top=False); A.lathe(x, z, h - .01, [(.06, 0), (.045, .03), (0, .045)], 6, MUSH, top=False)
A.build(r, vcol=False)
r, A = root('fern', None, kind='decor')
for i in range(6):
    a = i * 1.047 + rng.uniform(-.2, .2); c, s = math.cos(a), math.sin(a); L = rng.uniform(.3, .42)
    dpoly(A, [(0, .02, 0), (L * .5 * c - .05 * s, .22, L * .5 * s + .05 * c), (L * c, .12, L * s), (L * .5 * c + .05 * s, .22, L * .5 * s - .05 * c)], (0, 1, 2, 3), FERN[i % 2])
A.build(r, vcol=False)
r, A = root('thistle', None, kind='decor')
for i in range(3):
    x, z = rng.uniform(-.1, .1), rng.uniform(-.1, .1); h = rng.uniform(.35, .5); A.box(x - .012, x + .012, 0, h, z - .012, z + .012, THISTLE)
    ell(A, (x, h + .03, z), (.035, .04, .035), THISTLE_F, seg=5, rings=2)
    for k in range(3): a = k * 2.1; dpoly(A, [(x, .1 + k * .08, z), (x + .14 * math.cos(a), .16 + k * .08, z + .14 * math.sin(a)), (x + .05 * math.cos(a + .5), .2 + k * .08, z + .05 * math.sin(a + .5))], (0, 1, 2), THISTLE)
A.build(r, vcol=False)
r, A = root('bracken', None, kind='decor')
for i in range(5):
    a = rng.random() * 6.28; c, s = math.cos(a), math.sin(a); L = rng.uniform(.35, .55); h = rng.uniform(.3, .45)
    dpoly(A, [(0, 0, 0), (L * .4 * c - .08 * s, h, L * .4 * s + .08 * c), (L * c, h * .7, L * s), (L * .4 * c + .08 * s, h, L * .4 * s - .08 * c)], (0, 1, 2, 3), BRACKEN[i % 2])
A.build(r, vcol=False)

man = P.export('props.glb')
P.proof(ROOT / ('scratchpad/holm_v2_land/props/clutter_lineup.png' if VERSION < 2 else 'scratchpad/holm_review4/clutter_v2_lineup.png'), per_row=9, spacing=.7)
