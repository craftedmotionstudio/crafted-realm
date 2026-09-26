"""Minnow Hollow prop pack v1 (Tutor's Holm v2 land, phase 2, 2026-09-26): the recessed fishing pond's set, pond life and
the fishing feedback pieces. Original low-poly designs in the 2004 old-school manner (chunky, readable, few colours).

Roots (origin at the resting base centre unless noted; 1 unit = 1 tile, player 1.85):
  hollow-jetty      3-tile timber jetty; deck top at y 0, runs from the shore end at x 0 to x -3 (west), 1.3 wide
  log-step          a half-buried log step across a path (1.4 long), two stakes
  lily-pad          notched floating pad (y 0 = water); lily-pad-flower with a bloom
  stepping-stone    a flat river stone
  rowboat-beached   a small rowing boat pulled up and tipped on the shingle, oars across it
  drying-rack       fish-drying rack: two A-frames, a pole, four fish
  bucket-wood       oak bucket with iron hoops and a rope handle
  fish-creel        wicker creel with a lid and strap
  net-crate         crate of nets with cork floats
  fire-ring         a ring of field stones on an ash bed (the Fire Beach stance)
  duck              a paddling mallard (y 0 = water line)
  frog              a pond frog sitting on its lily pad (the pad included)
  dragonfly         blue dragonfly, wings out (origin at its body)
  fish-perch        the common pond fish (Raw mirrorperch) for leaps and the catch beat
  fish-pike         the bigger reedpike
  fish-shadow       a dark fish shape seen under the water (flat, y 0)
  splash-ring       a flat foam ring (y 0 = water) the runtime grows and fades
  droplet           one water drop
  bubbles           three rising bubbles
Run: "Blender 4.5/blender.exe" -b --python tools/blender/build_holm_hollow_props_v1.py
Out: .studio-workspaces/holm-hollow-props-v1/candidates/{props.glb,props.blend,manifest.json}, proof scratchpad/holm_v2_land/props/hollow_lineup.png"""
import bpy, sys, math, random
from pathlib import Path
HERE = Path(__file__).resolve().parent; sys.path.insert(0, str(HERE)); ROOT = HERE.parents[1]
from holm_interior_kit import Acc, M
from holm_v2_pack import Pack
P = Pack('HOLM_HOLLOW_PROPS_V1', ROOT / '.studio-workspaces/holm-hollow-props-v1/candidates', budget_tris=12000)
rng = random.Random(2609)

PLANK = [M('Weathered oak planks', '#8a6642'), M('Weathered oak planks dark', '#76553a')]
POST = M('Oak post', '#5c4129'); ROPE = M('Hemp rope', '#a8905e')
STONE = [M('Field stone', '#8e8b82'), M('Field stone dark', '#727069'), M('Field stone light', '#a3a096')]
ASH = M('Ash bed', '#4b4641'); CHAR = M('Charred wood', '#2f2924')
BARK = M('Log bark', '#5a4028'); GRAIN = M('Log end grain', '#b8956a')
PAD = M('Lily pad', '#4f7a32'); PAD_D = M('Lily pad dark', '#3f6528'); BLOOM = M('Lily flower', '#eadce2'); BLOOM_C = M('Lily flower heart', '#e8c040')
STRAKE = M('Boat strakes', '#7d5b3b'); KEEL = M('Boat keel oak', '#4f3a26'); OAR = M('Oar oak', '#9a7448')
FISH_P = M('Perch scales', '#9fb3bd'); FISH_PB = M('Perch stripes', '#5f7480'); FIN = M('Perch fins', '#c98a4b')
PIKE = M('Pike scales', '#6d7c48'); PIKE_B = M('Pike belly', '#d6cfa4'); PIKE_S = M('Pike spots', '#c9c27a')
EYE = M('Fish eye', '#1a1a18')
WICKER = M('Wicker', '#a67c46'); WICKER_D = M('Wicker dark', '#86602f'); STRAP = M('Leather strap', '#5e3f24')
IRON = M('Iron hoop', '#4a4a4e'); BUCKET = M('Bucket oak', '#7a5634')
CRATE = [M('Crate boards', '#8c6a44'), M('Crate boards dark', '#74573a')]; NET = M('Net twine', '#b9a97c'); CORK = M('Cork float', '#b06a3a')
DUCK_BODY = M('Duck grey', '#8e8b80'); DUCK_HEAD = M('Duck head green', '#2f5a3a'); DUCK_BILL = M('Duck bill', '#d9a032')
DUCK_BREAST = M('Duck breast', '#6b4a34'); DUCK_WING = M('Duck wing', '#6a665c'); DUCK_TAIL = M('Duck tail', '#2c2a26'); DUCK_RING = M('Duck neck ring', '#e8e6de')
FROG = M('Frog skin', '#5d8a3a'); FROG_D = M('Frog spots', '#3e6428'); FROG_B = M('Frog belly', '#c8c290')
DF_BODY = M('Dragonfly body', '#2f6fa0'); DF_WING = M('Dragonfly wing', '#cfe4ee')
SHADOW = M('Fish shadow', '#1a2328'); FOAM = M('Splash foam', '#e8f2f6'); DROP = M('Water droplet', '#cfe6f2')

def ell(A, c, r, m, seg=8, rings=4, rot=0.0):
    """Low-poly ellipsoid centred at c with radii r=(rx,ry,rz), yawed by rot about y."""
    cx, cy, cz = c; rx, ry, rz = r; cs, sn = math.cos(rot), math.sin(rot); V = []; F = []
    V.append((cx, cy - ry, cz))
    for i in range(1, rings):
        ph = -math.pi / 2 + math.pi * i / rings
        for j in range(seg):
            th = 2 * math.pi * j / seg; x = rx * math.cos(ph) * math.cos(th); z = rz * math.cos(ph) * math.sin(th); y = ry * math.sin(ph)
            V.append((cx + x * cs + z * sn, cy + y, cz - x * sn + z * cs))
    V.append((cx, cy + ry, cz)); top = len(V) - 1
    for j in range(seg): F.append((0, 1 + (j + 1) % seg, 1 + j))
    for i in range(rings - 2):
        a = 1 + i * seg; b = a + seg
        for j in range(seg): F.append((a + j, a + (j + 1) % seg, b + (j + 1) % seg, b + j))
    a = 1 + (rings - 2) * seg
    for j in range(seg): F.append((a + j, a + (j + 1) % seg, top))
    A.poly(V, F, m)

def tri(A, a, b, c, m): A.poly([a, b, c], [(0, 1, 2), (0, 2, 1)], m)   # double-sided fin/wing

# ---- hollow-jetty
r = P.root('hollow-jetty', kind='structure', note='deck top y 0; shore end at x 0, runs to x -3')
A = Acc('hollow-jetty_Deck'); x = 0.0
while x > -3.0:
    w = rng.uniform(.17, .21); A.box(x - w + .012, x - .012, -.06, 0, -.65, .65, PLANK[rng.randrange(2)], skip='b'); x -= w
for z in (-.45, .45): A.box(-3.0, 0, -.2, -.06, z - .06, z + .06, POST)
for px in (-.15, -1.5, -2.85):
    for z in (-.6, .6):
        top = .55 if (px < -2 and z < 0) else .02
        A.tube((px, -1.35, z), (px, top, z), .075, 6, POST, caps=True)
A.box(-3.0, 0, -.9, -.84, -.66, -.54, POST); A.box(-3.0, 0, -.9, -.84, .54, .66, POST)   # low bracing
A.lathe(-2.85, -.6, .34, [(.11, 0), (.12, .04), (.1, .08)], 7, ROPE, top=False)   # rope on the mooring post
A.lathe(-2.45, .35, 0, [(.12, 0), (.14, .03), (.12, .06), (.05, .07)], 8, ROPE, top=True)   # a coil on the deck
A.build(r, vcol=False)

# ---- log-step
r = P.root('log-step', kind='path', note='across a path, long axis x')
A = Acc('log-step_Log'); A.tube((-.7, .05, 0), (.7, .05, 0), .15, 7, BARK, caps=True, cap_m=GRAIN)
for sx in (-.45, .45): A.box(sx - .03, sx + .03, -.1, .16, .17, .23, POST)
A.build(r, vcol=False)

# ---- lily pads
for name, flower in (('lily-pad', False), ('lily-pad-flower', True)):
    r = P.root(name, kind='pond-life', note='y 0 = water surface')
    A = Acc(name + '_Pad'); n = 10; V = [(0, .012, 0)]; notch = 2
    for i in range(n + 1):
        a = 2 * math.pi * (i / n) * .9 + .25; rr = .34 + (.03 if i % 3 == 0 else 0)
        V.append((rr * math.cos(a), .012, rr * math.sin(a)))
    A.poly(V, [(0, i + 1, i + 2) for i in range(n)], PAD)
    A.poly([(x, .002, z) for x, _, z in V], [(0, i + 2, i + 1) for i in range(n)], PAD_D)
    if flower:
        for i in range(6):
            a = 2 * math.pi * i / 6; tri(A, (.05 * math.cos(a), .03, .05 * math.sin(a)), (.14 * math.cos(a + .35), .09, .14 * math.sin(a + .35)), (.14 * math.cos(a - .35), .09, .14 * math.sin(a - .35)), BLOOM)
        A.lathe(0, 0, .02, [(.045, 0), (.04, .05)], 6, BLOOM_C, top=True)
    A.build(r, vcol=False)

# ---- stepping-stone
r = P.root('stepping-stone', kind='path')
A = Acc('stepping-stone_Stone'); A.lathe(0, 0, -.1, [(.25, 0), (.3, .1), (.27, .2), (.18, .24)], 7, STONE[0], top=True, top_m=STONE[2], rot=.4)
A.build(r, vcol=False)

# ---- rowboat-beached (tipped 12 degrees onto its side on the shingle)
r = P.root('rowboat-beached', kind='clutter')
A = Acc('rowboat-beached_Hull'); tilt = math.radians(12)
def tp(x, y, z): return (x, y * math.cos(tilt) - z * math.sin(tilt) + .12, y * math.sin(tilt) + z * math.cos(tilt))
secs = []
for i, x in enumerate([-1.3, -.9, -.3, .3, .9, 1.3]):
    k = 1 - (abs(x) / 1.3) ** 2.2; w = .12 + .42 * k; d = .2 + .22 * k; lift = .1 * (abs(x) / 1.3) ** 2
    secs.append([tp(x, .42 + lift, -w), tp(x, .1 + lift * .5, -w * .8), tp(x, -.02 + lift * .3, 0), tp(x, .1 + lift * .5, w * .8), tp(x, .42 + lift, w)])
for a, b in zip(secs, secs[1:]):
    for j in range(4):
        A.poly([a[j], b[j], b[j + 1], a[j + 1]], [(0, 1, 2, 3), (0, 3, 2, 1)], STRAKE)
for s in (secs[0], secs[-1]): A.poly(s, [(0, 1, 2, 3, 4), (4, 3, 2, 1, 0)], KEEL)
for x in (-.35, .45): A.beam(tp(x, .3, -.42), tp(x, .3, .42), .14, .04, OAR)
A.beam(tp(-1.35, .0, 0), tp(1.35, .0, 0), .07, .06, KEEL)
for s in (-1, 1): A.beam((-.9, .38, .18 * s), (1.1, .5, -.05 * s), .045, .045, OAR); A.box(.95, 1.4, .44, .47, -.1 * s - .07, -.1 * s + .07, OAR)
A.build(r, vcol=False)

# ---- drying-rack
r = P.root('drying-rack', kind='clutter')
A = Acc('drying-rack_Frame')
for sx in (-.8, .8):
    A.beam((sx, 0, -.35), (sx, 1.5, 0), .07, .07, POST); A.beam((sx, 0, .35), (sx, 1.5, 0), .07, .07, POST)
A.tube((-.95, 1.44, 0), (.95, 1.44, 0), .045, 6, POST)
for i, fx in enumerate((-.5, -.17, .17, .5)):
    A.box(fx - .01, fx + .01, 1.15, 1.44, -.01, .01, ROPE)
    ell(A, (fx, .92, 0), (.05, .22, .1), FISH_P if i % 2 else FISH_PB, seg=6, rings=3)
    tri(A, (fx, .7, 0), (fx - .07, .62, 0), (fx + .07, .62, 0), FIN)
A.build(r, vcol=False)

# ---- bucket-wood
r = P.root('bucket-wood', kind='clutter')
A = Acc('bucket-wood_Body'); A.lathe(0, 0, 0, [(.15, 0), (.18, .3)], 8, BUCKET, top=False, bottom=True)
A.lathe(0, 0, .02, [(.14, 0), (.14, .01)], 8, M('Bucket water', '#5f7f94'), top=True)
for hy in (.05, .24): A.lathe(0, 0, hy, [(.16 + hy * .1, 0), (.165 + hy * .1, .03)], 8, IRON, top=False)
A.beam((-.18, .3, 0), (0, .46, 0), .02, .02, ROPE); A.beam((0, .46, 0), (.18, .3, 0), .02, .02, ROPE)
A.build(r, vcol=False)

# ---- fish-creel
r = P.root('fish-creel', kind='clutter')
A = Acc('fish-creel_Body'); A.box(-.22, .22, 0, .28, -.15, .15, WICKER)
for i in range(5): A.box(-.225, .225, .03 + i * .055, .045 + i * .055, -.155, .155, WICKER_D, skip='bt')
A.rbox(0, .02, .48, .34, .28, .32, .12, WICKER_D); A.beam((-.2, .3, -.16), (.2, .55, .0), .03, .01, STRAP)
A.build(r, vcol=False)

# ---- net-crate
r = P.root('net-crate', kind='clutter')
A = Acc('net-crate_Crate')
from holm_interior_kit import crate
crate(A, -.32, .32, 0, .5, -.28, .28, CRATE, CRATE[1])
for i in range(7):
    a = i / 6; A.poly([(-.34 + a * .68, .52, -.3), (-.3 + a * .6, .6, .0), (-.34 + a * .68, .5, .31)], [(0, 1, 2), (0, 2, 1)], NET)
A.poly([(-.34, .5, .3), (.34, .5, .3), (.3, .1, .36), (-.3, .15, .36)], [(0, 1, 2, 3), (0, 3, 2, 1)], NET)
for fx in (-.22, 0, .22): A.lathe(fx, .33, .2, [(.04, 0), (.05, .03), (.04, .06)], 6, CORK, top=True)
A.build(r, vcol=False)

# ---- fire-ring
r = P.root('fire-ring', kind='station', note='the Fire Beach stance marker; a player fire burns in the middle')
A = Acc('fire-ring_Stones'); A.lathe(0, 0, 0, [(.36, 0), (.36, .012)], 9, ASH, top=True)
for i in range(9):
    a = 2 * math.pi * i / 9 + rng.uniform(-.1, .1); rr = .45; s = rng.uniform(.09, .13)
    A.lathe(rr * math.cos(a), rr * math.sin(a), -.02, [(s, 0), (s * 1.15, s * .5), (s * .7, s * 1.05)], 6, STONE[i % 3], top=True, rot=rng.random())
A.beam((-.18, .03, -.05), (.16, .06, .08), .05, .05, CHAR)
A.build(r, vcol=False)

# ---- duck (a drake mallard, y 0 = water line, facing +x)
r = P.root('duck', kind='pond-life', note='y 0 = water line; faces +x; the runtime paddles and bobs it')
A = Acc('duck_Body')
ell(A, (0, .06, 0), (.2, .09, .12), DUCK_BODY)
ell(A, (.1, .08, 0), (.1, .08, .1), DUCK_BREAST, seg=7, rings=3)
ell(A, (-.04, .12, .085), (.12, .035, .04), DUCK_WING, seg=6, rings=3); ell(A, (-.04, .12, -.085), (.12, .035, .04), DUCK_WING, seg=6, rings=3)
A.lathe(.15, 0, .12, [(.045, 0), (.04, .07)], 6, DUCK_HEAD, top=False); A.lathe(.15, 0, .15, [(.047, 0), (.047, .015)], 6, DUCK_RING, top=False)
ell(A, (.17, .24, 0), (.07, .06, .055), DUCK_HEAD, seg=7, rings=4)
A.poly([(.22, .24, -.02), (.3, .225, -.018), (.3, .225, .018), (.22, .24, .02), (.22, .215, 0), (.29, .212, 0)], [(0, 1, 2, 3), (4, 5, 1, 0), (3, 2, 5, 4)], DUCK_BILL)
for s in (-1, 1): A.box(.19, .205, .255, .27, .045 * s - .006, .045 * s + .006, EYE)
tri(A, (-.19, .1, -.03), (-.19, .1, .03), (-.28, .16, 0), DUCK_TAIL)
A.build(r, vcol=False)

# ---- frog on its pad
r = P.root('frog', kind='pond-life', note='the frog sits on a lily pad; frog-body is the part the runtime hops')
A = Acc('frog_Pad'); n = 9; V = [(0, .012, 0)] + [(.3 * math.cos(2 * math.pi * i / n * .92 + .3), .012, .3 * math.sin(2 * math.pi * i / n * .92 + .3)) for i in range(n + 1)]
A.poly(V, [(0, i + 1, i + 2) for i in range(n)], PAD); A.build(r, vcol=False)
body = bpy.data.objects.new('frog-body', None); bpy.context.collection.objects.link(body); body.parent = r
A = Acc('frog-body_Mesh')
ell(A, (0, .06, 0), (.07, .045, .055), FROG); ell(A, (.055, .08, 0), (.04, .035, .045), FROG, seg=7, rings=3)
for s in (-1, 1):
    ell(A, (.07, .115, .025 * s), (.014, .014, .014), EYE, seg=5, rings=3)
    A.beam((-.03, .03, .05 * s), (-.1, .02, .085 * s), .03, .025, FROG_D); A.beam((.04, .03, .045 * s), (.07, .015, .07 * s), .02, .02, FROG_D)
ell(A, (0, .035, 0), (.06, .02, .045), FROG_B, seg=6, rings=3)
A.build(body, vcol=False)

# ---- dragonfly
r = P.root('dragonfly', kind='pond-life', note='origin at the body; the runtime darts it along the reeds')
A = Acc('dragonfly_Mesh'); A.tube((-.09, 0, 0), (.04, 0, 0), .008, 5, DF_BODY, caps=True); ell(A, (.05, 0, 0), (.014, .012, .014), DF_BODY, seg=5, rings=3)
for x0, span in ((.02, .09), (-.005, .08)):
    for s in (-1, 1): A.poly([(x0, .004, 0), (x0 + .02, .006, .03 * s), (x0 - .01, .006, span * s), (x0 - .025, .005, .02 * s)], [(0, 1, 2, 3), (0, 3, 2, 1)], DF_WING)
A.build(r, vcol=False)

# ---- fish
def fish(name, L, body, belly, fin, spots=None):
    r = P.root(name, kind='fish', note='faces +x, origin at the body centre')
    A = Acc(name + '_Mesh')
    ell(A, (0, 0, 0), (L * .5, L * .16, L * .1), body, seg=8, rings=4)
    ell(A, (L * .05, -L * .06, 0), (L * .36, L * .08, L * .085), belly, seg=6, rings=3)
    tri(A, (-L * .44, 0, 0), (-L * .66, L * .14, 0), (-L * .66, -L * .14, 0), fin)
    tri(A, (L * .12, L * .14, 0), (-L * .18, L * .24, 0), (-L * .22, L * .13, 0), fin)
    for s in (-1, 1): ell(A, (L * .36, L * .04, L * .07 * s), (L * .025, L * .025, L * .02), EYE, seg=5, rings=3)
    if spots:
        for i in range(5): ell(A, (L * (.2 - i * .12), L * .05, L * .09), (L * .03, L * .02, L * .01), spots, seg=5, rings=3)
    A.build(r, vcol=False)
fish('fish-perch', .34, FISH_P, FISH_PB, FIN)
fish('fish-pike', .56, PIKE, PIKE_B, M('Pike fins', '#8a7a3a'), spots=PIKE_S)

# ---- fish-shadow, splash-ring, droplet, bubbles
r = P.root('fish-shadow', kind='fx', note='flat dark fish shape; the runtime draws it translucent under the water sheet')
A = Acc('fish-shadow_Mesh'); n = 10; V = [(0, 0, 0)] + [(.26 * math.cos(2 * math.pi * i / n), 0, .09 * math.sin(2 * math.pi * i / n)) for i in range(n)]
A.poly(V, [(0, (i + 1) % n + 1, i + 1) for i in range(n)], SHADOW); A.poly([(-.24, 0, 0), (-.38, 0, .08), (-.38, 0, -.08)], [(0, 2, 1)], SHADOW); A.build(r, vcol=False)
r = P.root('splash-ring', kind='fx', note='flat foam ring, y 0 = water; grown and faded by the runtime')
A = Acc('splash-ring_Mesh'); n = 14; V = []
for i in range(n):
    a = 2 * math.pi * i / n; V += [(.24 * math.cos(a), .01, .24 * math.sin(a)), (.33 * math.cos(a), .01, .33 * math.sin(a))]
A.poly(V, [(2 * i, 2 * i + 1, (2 * i + 3) % (2 * n), (2 * i + 2) % (2 * n)) for i in range(n)], FOAM)
for i in range(6):
    a = 2 * math.pi * i / 6 + .3; tri(A, (.3 * math.cos(a), .01, .3 * math.sin(a)), (.36 * math.cos(a + .08), .09, .36 * math.sin(a + .08)), (.36 * math.cos(a - .08), .09, .36 * math.sin(a - .08)), FOAM)
A.build(r, vcol=False)
r = P.root('droplet', kind='fx'); A = Acc('droplet_Mesh'); ell(A, (0, .04, 0), (.035, .045, .035), DROP, seg=5, rings=3); A.build(r, vcol=False)
r = P.root('bubbles', kind='fx'); A = Acc('bubbles_Mesh')
for bx, by, bz, s in ((0, .03, 0, .03), (.05, .07, .02, .022), (-.03, .11, -.03, .018)): ell(A, (bx, by, bz), (s, s, s), DROP, seg=5, rings=3)
A.build(r, vcol=False)

P.export('props.glb')
P.proof(ROOT / 'scratchpad/holm_v2_land/props/hollow_lineup.png', per_row=7)
