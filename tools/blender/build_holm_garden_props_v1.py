"""Hettie's Garden prop pack v1 (Tutor's Holm v2 land, phase 3, 2026-09-26): the cozy greenery terrace on the bakehouse
that overlooks the Creakwheel Mill wheel (docs/rebuild/WORLD_LAYOUT_GUIDE.md §3.4). Original low-poly pieces in the 2004
old-school manner; planting in close warm shades with dappled leaves, not busy textures (owner: foliage 10-15x too busy).
Roots (origin at the resting base centre, long axis x):
  parapet-run      a 2-tile low fieldstone parapet (0.5 tall) with a coping and ivy trailing over it
  parapet-post     a parapet end pier with a coping stone (gate posts)
  garden-gate      a small wicket gate, 1 tile, open 70 degrees on its post
  herb-bed         a raised timber herb bed 1.6 x 0.8 with rows of herbs
  arbour-bench     a vine-and-rose arbour (two arched posts, lath roof, climbing roses) over an oak bench
  garden-table     a small round table with a jug and two cups, a stool each side
  flower-tub       a half-barrel tub of flowers (warm shades)
  bee-skep         a straw bee skep on a post stand, a few bees
  bird-table       a roofed bird table on a post, with two small birds
  lantern-post     a garden lantern on a crooked post (warm glow)
  rose-bush        a climbing rose bush against a wall
Run: "Blender 4.5/blender.exe" -b --python tools/blender/build_holm_garden_props_v1.py
Out: .studio-workspaces/holm-garden-props-v1/candidates/{props.glb,props.blend,manifest.json}, proof scratchpad/holm_v2_land/props/garden_lineup.png"""
import bpy, sys, math, random
from pathlib import Path
HERE = Path(__file__).resolve().parent; sys.path.insert(0, str(HERE)); ROOT = HERE.parents[1]
from holm_interior_kit import Acc, M
from holm_v2_pack import Pack
P = Pack('HOLM_GARDEN_PROPS_V1', ROOT / '.studio-workspaces/holm-garden-props-v1/candidates', budget_tris=12000)
rng = random.Random(5161)
STONE = [M('Garden fieldstone', '#8f8b7f'), M('Garden fieldstone dark', '#77736a'), M('Garden fieldstone light', '#a19c8e')]
COPING = M('Coping sandstone', '#a89f86'); OAK = M('Garden oak', '#6e4d30'); OAK_D = M('Garden oak dark', '#553a24'); PLANK = M('Garden bench planks', '#8a6642')
SOIL = M('Bed soil', '#4e3a28'); LEAF = [M('Garden leaves', '#5b7a34'), M('Garden leaves dark', '#48652a'), M('Garden leaves light', '#6d8a3e')]
IVY = M('Ivy leaves', '#3f5e2a'); ROSE = [M('Rose red', '#b0443c'), M('Rose pink', '#d58a86'), M('Rose cream', '#e8d9b4')]
FLOWER = [M('Flower marigold', '#d99a30'), M('Flower lavender', '#8a78b4'), M('Flower cream', '#e6dcbc'), M('Flower rose', '#c2645a')]
STRAW = M('Skep straw', '#c7a55c'); STRAW_D = M('Skep straw bands', '#9c7c3c'); BEE = M('Bee', '#2a2418'); BEE_Y = M('Bee stripe', '#d8a836')
POT = M('Earthen jug', '#9a5a3a'); CUP = M('Earthen cup', '#b07048'); IRON = M('Iron hoop', '#4a4a4e'); LAMP = M('Lantern glass', '#f2c865', emit=2.0)
BIRD = M('Wren brown', '#7a5a3a'); BIRD_B = M('Wren belly', '#c8b08a'); TUB = M('Tub staves', '#7a5634')

def ell(A, c, r, m, seg=7, rings=3, rot=0.0):
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
def clump(A, x, z, y, r, n, mats, h=.25):
    """a soft clump of leaf blobs (dappled: 2-3 close shades), low poly"""
    for i in range(n):
        a = rng.random() * 6.283; d = rng.random() * r * .6
        ell(A, (x + math.cos(a) * d, y + h * (.5 + rng.random() * .5), z + math.sin(a) * d), (r * rng.uniform(.45, .7), h * rng.uniform(.5, .8), r * rng.uniform(.45, .7)), mats[rng.randrange(len(mats))], seg=6, rings=3, rot=rng.random())
def blooms(A, x, z, y, r, n, mats, s=.045):
    for i in range(n):
        a = rng.random() * 6.283; d = rng.random() * r
        px, pz, py = x + math.cos(a) * d, z + math.sin(a) * d, y + rng.uniform(0, .05)
        m = mats[rng.randrange(len(mats))]
        for k in range(4):
            b = k * math.pi / 2 + rng.random() * .3
            A.poly([(px, py, pz), (px + math.cos(b) * s, py + .015, pz + math.sin(b) * s), (px + math.cos(b + .7) * s, py + .015, pz + math.sin(b + .7) * s)], [(0, 1, 2), (0, 2, 1)], m)

# ---- parapet-run (2 tiles along x) and parapet-post
r = P.root('parapet-run', kind='wall', block=[1.0, .2])
A = Acc('parapet-run_Stone'); x = -1.0
while x < .99:
    x2 = min(1.0, x + rng.uniform(.3, .5))
    for (y0, y1) in ((0, .22), (.22, .42)):
        A.box(x + .01, x2 - .01, y0, y1 - .01, -.17, .17, STONE[rng.randrange(3)])
    x = x2
A.box(-1.0, 1.0, .42, .5, -.2, .2, COPING)
for i in range(5): ell(A, (-.85 + i * .42, .38, .2 + rng.uniform(0, .04)), (.14, .12, .05), IVY, seg=5, rings=3)
A.build(r, vcol=False)
r = P.root('parapet-post', kind='wall', block=[.25, .25])
A = Acc('parapet-post_Stone'); A.box(-.22, .22, 0, .66, -.22, .22, STONE[0]); A.box(-.26, .26, .66, .74, -.26, .26, COPING); A.lathe(0, 0, .74, [(.12, 0), (.08, .1), (0, .14)], 6, COPING, top=False)
A.build(r, vcol=False)
# ---- garden-gate (hinged at x -0.5, open 70 degrees)
r = P.root('garden-gate', kind='gate')
A = Acc('garden-gate_Leaf'); a = math.radians(70); c, s = math.cos(a), math.sin(a)
def G(u, y, v): return (-.5 + u * c, y, -u * s + v)
for u in (.05, .45, .85): A.poly([G(u - .03, 0.05, 0), G(u + .03, 0.05, 0), G(u + .03, .85, 0), G(u - .03, .85, 0)], [(0, 1, 2, 3), (3, 2, 1, 0)], OAK)
for y in (.2, .7): A.beam(G(0, y, 0), G(.92, y, 0), .05, .04, OAK_D)
A.beam(G(.05, .2, 0), G(.85, .7, 0), .04, .03, OAK_D)
A.build(r, vcol=False)
# ---- herb-bed
r = P.root('herb-bed', kind='garden', block=[.8, .4])
A = Acc('herb-bed_Bed'); A.box(-.8, .8, 0, .32, -.4, .4, PLANK); A.box(-.74, .74, .26, .3, -.34, .34, SOIL)
for row in (-.2, 0, .2):
    for i in range(5): clump(A, -.6 + i * .3, row, .28, .12, 2, LEAF, h=.14)
blooms(A, 0, 0, .44, .6, 10, FLOWER[1:3], s=.035)
A.build(r, vcol=False)
# ---- arbour-bench
r = P.root('arbour-bench', kind='garden', block=[.9, .45])
A = Acc('arbour-bench_Arbour')
for sx in (-.85, .85):
    for sz in (-.45, .45): A.box(sx - .05, sx + .05, 0, 2.05, sz - .05, sz + .05, OAK)
    A.beam((sx, 2.05, -.5), (sx, 2.05, .5), .07, .07, OAK)
    for k in range(6):   # arched top rafter pieces
        a0, a1 = math.pi * k / 6, math.pi * (k + 1) / 6
        A.beam((sx, 2.05 + math.sin(a0) * .35, -.5 * math.cos(a0)), (sx, 2.05 + math.sin(a1) * .35, -.5 * math.cos(a1)), .06, .06, OAK_D)
for i in range(7): A.box(-.95, .95, 2.05 + math.sin(math.pi * (i + .5) / 7) * .35, 2.09 + math.sin(math.pi * (i + .5) / 7) * .35, -.5 * math.cos(math.pi * (i + .5) / 7) - .03, -.5 * math.cos(math.pi * (i + .5) / 7) + .03, OAK_D)
for sx in (-.85, .85):   # vines up the posts and over the top
    for k in range(6): ell(A, (sx, .4 + k * .3, -.45 + (k % 2) * .9), (.14, .16, .14), LEAF[k % 3], seg=5, rings=3)
for k in range(9): ell(A, (-.8 + k * .2, 2.3 + rng.uniform(0, .1), rng.uniform(-.35, .35)), (.16, .1, .16), LEAF[k % 3], seg=5, rings=3)
blooms(A, 0, 0, 2.42, .8, 14, ROSE, s=.05)
for sx in (-.85, .85): blooms(A, sx, 0, 1.2, .3, 5, ROSE, s=.045)
A.box(-.75, .75, .4, .46, -.18, .18, PLANK); A.box(-.75, .75, .46, .8, .16, .2, PLANK)
for sx in (-.65, .65): A.box(sx - .04, sx + .04, 0, .4, -.15, .15, OAK_D)
A.build(r, vcol=False)
# ---- garden-table with jug and cups, two stools
r = P.root('garden-table', kind='garden', block=[.45, .45])
A = Acc('garden-table_Table'); A.lathe(0, 0, 0, [(.08, 0), (.05, .06), (.05, .62), (.42, .64), (.42, .7)], 8, OAK, top=True, top_m=PLANK)
A.lathe(.1, .05, .7, [(.07, 0), (.09, .08), (.06, .16), (.04, .2), (.05, .23)], 7, POT, top=True)
A.beam((.17, .87, .05), (.2, .8, .05), .02, .02, POT)
for cx, cz in ((-.18, .1), (-.05, -.2)): A.lathe(cx, cz, .7, [(.035, 0), (.045, .07)], 6, CUP, top=True)
for sx in (-.7, .7): A.lathe(sx, 0, 0, [(.05, 0), (.04, .4), (.2, .42), (.2, .46)], 7, OAK_D, top=True)
A.build(r, vcol=False)
# ---- flower-tub
r = P.root('flower-tub', kind='garden', block=[.3, .3])
A = Acc('flower-tub_Tub'); A.lathe(0, 0, 0, [(.24, 0), (.3, .34)], 8, TUB, top=True, top_m=SOIL)
A.lathe(0, 0, .06, [(.26, 0), (.265, .04)], 8, IRON, top=False); A.lathe(0, 0, .26, [(.29, 0), (.295, .04)], 8, IRON, top=False)
clump(A, 0, 0, .3, .26, 5, LEAF, h=.22); blooms(A, 0, 0, .52, .24, 12, FLOWER, s=.04)
A.build(r, vcol=False)
# ---- bee-skep on a stand
r = P.root('bee-skep', kind='garden', block=[.25, .25])
A = Acc('bee-skep_Skep'); A.box(-.06, .06, 0, .55, -.06, .06, OAK_D); A.box(-.3, .3, .55, .6, -.3, .3, PLANK)
A.lathe(0, 0, .6, [(.26, 0), (.27, .12), (.24, .25), (.18, .36), (.09, .44), (0, .47)], 9, STRAW, top=False)
for h, rr in ((.1, .275), (.22, .25), (.32, .2), (.4, .13)): A.lathe(0, 0, .6 + h, [(rr, 0), (rr, .025)], 9, STRAW_D, top=False)
A.box(-.07, .07, .6, .66, .24, .28, BEE)
for i in range(5):
    bx, by, bz = rng.uniform(-.4, .4), rng.uniform(.7, 1.2), rng.uniform(-.4, .4); ell(A, (bx, by, bz), (.025, .018, .018), BEE_Y if i % 2 else BEE, seg=5, rings=3)
A.build(r, vcol=False)
# ---- bird-table
r = P.root('bird-table', kind='garden', block=[.15, .15])
A = Acc('bird-table_Table'); A.box(-.05, .05, 0, 1.3, -.05, .05, OAK_D); A.box(-.3, .3, 1.3, 1.35, -.25, .25, PLANK)
for sx in (-.26, .26): A.box(sx - .02, sx + .02, 1.35, 1.6, -.02, .02, OAK)
A.poly([(-.36, 1.6, -.32), (.36, 1.6, -.32), (.36, 1.72, 0), (-.36, 1.72, 0)], [(0, 1, 2, 3), (3, 2, 1, 0)], OAK_D)
A.poly([(.36, 1.6, .32), (-.36, 1.6, .32), (-.36, 1.72, 0), (.36, 1.72, 0)], [(0, 1, 2, 3), (3, 2, 1, 0)], OAK_D)
for bx, bz, yaw in ((-.12, .05, .4), (.14, -.08, 2.5)):
    ell(A, (bx, 1.4, bz), (.05, .04, .035), BIRD, seg=6, rings=3, rot=yaw); ell(A, (bx + .01, 1.39, bz), (.035, .03, .03), BIRD_B, seg=5, rings=3, rot=yaw)
    ell(A, (bx + math.cos(yaw) * .045, 1.44, bz - math.sin(yaw) * .045), (.025, .025, .025), BIRD, seg=5, rings=3)
A.build(r, vcol=False)
# ---- lantern-post
r = P.root('lantern-post', kind='garden', block=[.12, .12])
A = Acc('lantern-post_Post'); A.beam((0, 0, 0), (.04, 1.7, .02), .09, .09, OAK_D); A.beam((.04, 1.65, .02), (.34, 1.7, .02), .05, .05, OAK_D)
A.box(.32, .36, 1.45, 1.68, .0, .04, IRON); A.lathe(.34, .02, 1.2, [(.08, 0), (.09, .2), (.05, .28)], 6, LAMP, top=True)
A.lathe(.34, .02, 1.48, [(.1, 0), (.03, .1)], 6, IRON, top=True)
A.build(r, vcol=False)
# ---- rose-bush
r = P.root('rose-bush', kind='garden', block=[.3, .2])
A = Acc('rose-bush_Bush'); clump(A, 0, 0, 0, .35, 7, LEAF, h=.55); clump(A, .1, 0, .45, .25, 4, LEAF, h=.35); blooms(A, 0, 0, .75, .3, 12, ROSE, s=.05)
A.build(r, vcol=False)

P.export('props.glb')
P.proof(ROOT / 'scratchpad/holm_v2_land/props/garden_lineup.png', per_row=6, spacing=.7)
