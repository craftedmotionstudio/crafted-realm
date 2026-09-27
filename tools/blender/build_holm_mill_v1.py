"""Creakwheel Mill v1 (Tutor's Holm v2 land, phase 3, 2026-09-26), prefix Mill_: the island's watermill on the east bank of
the creek at the new weir (docs/rebuild/WORLD_LAYOUT_GUIDE.md §3.4). Original design in the 2004 old-school manner.

A two-storey mill 7 x 8 tiles: a fieldstone ground floor with the wheel pit on the creek side, a jettied timber-framed
upper floor that overhangs the pit and the north door, a thatched hip roof with a half-hip at the south end and a lucam
(the projecting sack-hoist housing, with its own little gable and a sack on the hoist rope) on the east. A breastshot
water wheel (2.6 across, 8 spokes a side, 12 paddles) turns on its axle at 6 rpm (clip WheelTurn, 10 s a turn), fed at
breast height by a timber leat with a sluice gate from the head pool above the weir; white water runs down the weir face
(clip FoamFlow) and a splash puffs where the paddles enter the tailrace (clip SplashPulse). A plank walkway crosses the
weir crest (the nav deck is island data). Inside: bed and runner stones in their tun under the hopper, a grain bin, flour
sacks, a sack barrow; outside: a spare millstone against the south wall, sacks by the door, a lantern bracket.

Local space: origin = world (65, 3.2, 64); y 0 = the ground floor. Plan coordinates (x east, y up, z south) -> Blender
(x, -z, y). The creek runs south along world x ~60, the weir crest at world z ~59.8 (water 3.1 above, 2.05 below).
Run: "Blender 4.5/blender.exe" -b --python tools/blender/build_holm_mill_v1.py
Out: .studio-workspaces/holm-mill-v1/candidates/{mill.glb,mill.blend,manifest.json}, proof scratchpad/holm_v2_land/props/mill_*.png"""
import bpy, sys, math, random, json
from pathlib import Path
from mathutils import Vector
HERE = Path(__file__).resolve().parent; sys.path.insert(0, str(HERE)); ROOT = HERE.parents[1]
from holm_interior_kit import Acc, M, sack
from holm_v2_pack import Pack, srgb_to_lin
OUT = ROOT / '.studio-workspaces/holm-mill-v1/candidates'
P = Pack('HOLM_MILL_V1', OUT, budget_tris=16000)
rng = random.Random(6406)
OX, OY, OZ = 65, 3.2, 64
def W(x, y, z): return (x - OX, y - OY, z - OZ)   # world point -> local

STONE = [M('Mill fieldstone', '#8a877c'), M('Mill fieldstone dark', '#6f6c63'), M('Mill fieldstone light', '#9d998c')]
QUOIN = M('Dressed sandstone quoin', '#a39a82'); FLAG = M('Mill floor flag', '#8a8578')
PLASTER = M('Limewash plaster', '#d9cfb5'); FRAME = M('Mill frame oak', '#4a3321'); OAK = M('Aged oak', '#6a4a2e')
PLANK = M('Mill floorboard planks', '#7c5a38'); THATCH = [M('Mill thatch', '#9c7c45'), M('Mill thatch dark', '#83663a')]
SHUTTER = M('Shutter oak planks', '#5e4630'); DARK = M('Window recess shadow', '#1e1a16'); IRON = M('Wheel iron strap', '#3c3b3a')
MILLSTONE = M('Millstone grit stone', '#a8a292'); ROPE = M('Hemp rope', '#a8905e'); SACK = M('Flour sackcloth', '#d8ceb2'); SACK_T = M('Sack twine', '#8a6c44')
WATER = M('Leat water', '#6f94b0'); FOAM = M('Weir foam', '#eef4f6'); GRAIN = M('Grain', '#c8a458'); LAMP = M('Lantern glass', '#f2c865', emit=2.0)

root = P.root('mill', kind='building', note='origin = world (65, 3.2, 64), y 0 = ground floor; parts Mill_*')

# ---------------------------------------------------------------- ground floor: fieldstone shell, door, windows, plinth
A = Acc('Mill_Shell')
X0, X1, Z0, Z1, T, H1 = -3.0, 4.0, -4.0, 4.0, .4, 2.7
def course_wall(axis, fixed, a0, a1, y0, y1, out, holes=()):
    """Fieldstone courses on a wall face; axis 'x' = wall along x at z=fixed, 'z' = along z at x=fixed; out = +1/-1."""
    y = y0
    while y < y1 - .02:
        yh = min(y1, y + rng.uniform(.28, .4))
        if y1 - yh < .15: yh = y1
        a = a0; stones = [a0]
        while a < a1:
            a += rng.uniform(.45, .85)
            if a < a1 - .2: stones.append(a)
        stones.append(a1)
        # a row crossing an opening breaks at its jambs, so no stone juts into a door or window
        for h in holes:
            if y < h[3] and yh > h[2]: stones += [h[0], h[1]]
        stones = sorted(set(round(v, 4) for v in stones))
        for p, q in zip(stones, stones[1:]):
            mid = (p + q) / 2; vm = (y + yh) / 2
            if any(h[0] < mid < h[1] and h[2] < vm < h[3] for h in holes): continue
            m = STONE[rng.randrange(3)]; pr = rng.uniform(.0, .04); g = .015
            if axis == 'x': A.box(p + g, q - g, y + g, yh - g, fixed, fixed + out * (T * .5 + pr), m, skip='n' if out > 0 else 's')
            else: A.box(fixed, fixed + out * (T * .5 + pr), y + g, yh - g, p + g, q - g, m, skip='w' if out > 0 else 'e')
        y = yh
DOOR = (-1.0, 0.0, 0.0, 2.2); DOOR_X0, DOOR_X1 = DOOR[0] - .12, DOOR[1] + .12
WIN_N = (2.0, 2.8, .9, 1.7); WIN_E = (-1.2, -.4, .9, 1.7); WIN_S = (.6, 1.4, .9, 1.7)
# core wall slabs (mortar), then coursed faces outside
for (x0, x1, z0, z1) in ((X0, X1, Z1 - T, Z1), (X0, X0 + T, Z0, Z1), (X1 - T, X1, Z0, Z1)):
    A.box(x0 + .03, x1 - .03, -1.8, H1, z0 + .03, z1 - .03, STONE[1])
# the north core stops at the doorway (collision matches what you see), with a lintel over it
A.box(X0 + .03, DOOR_X0 - .03, -1.8, H1, Z0 + .03, Z0 + T - .03, STONE[1]); A.box(DOOR_X1 + .03, X1 - .03, -1.8, H1, Z0 + .03, Z0 + T - .03, STONE[1])
A.box(DOOR_X0, DOOR_X1, 2.25, H1, Z0 + .03, Z0 + T - .03, STONE[1]); A.box(DOOR_X0, DOOR_X1, -1.8, -.02, Z0 + .03, Z0 + T - .03, STONE[1])
course_wall('x', Z0, X0, X1, -1.6, H1, -1, holes=[(DOOR[0], DOOR[1], DOOR[2], DOOR[3]), (WIN_N[0], WIN_N[1], WIN_N[2], WIN_N[3])])
course_wall('x', Z1, X0, X1, -1.6, H1, 1, holes=[(WIN_S[0], WIN_S[1], WIN_S[2], WIN_S[3])])
course_wall('z', X0, Z0, Z1, -2.0, H1, -1)   # the wheel-pit wall runs down to the tailrace
course_wall('z', X1, Z0, Z1, -1.6, H1, 1, holes=[(WIN_E[0], WIN_E[1], WIN_E[2], WIN_E[3])])
for cx, cz in ((X0, Z0), (X1, Z0), (X0, Z1), (X1, Z1)):   # dressed quoins at the corners
    y = -.2
    while y < H1 - .1:
        h = .34; big = int(y * 3) % 2 == 0; sx = .5 if big else .3; sz = .3 if big else .5
        A.box(cx - (sx if cx > 0 else -sx) * 0 - .22, cx + .22, y, y + h - .02, cz - .22, cz + .22, QUOIN)
        y += h
A.build(root, vcol=False)

F = Acc('Mill_FrameGround')
F.box(DOOR[0] - .12, DOOR[0], 0, DOOR[3] + .1, Z0 - .05, Z0 + T + .05, OAK); F.box(DOOR[1], DOOR[1] + .12, 0, DOOR[3] + .1, Z0 - .05, Z0 + T + .05, OAK)
F.box(DOOR[0] - .2, DOOR[1] + .2, DOOR[3], DOOR[3] + .18, Z0 - .08, Z0 + T + .08, FRAME)
for (a0, a1, b0, b1), axis, fixed, out in ((WIN_N, 'x', Z0, -1), (WIN_S, 'x', Z1, 1), (WIN_E, 'z', X1, 1)):
    if axis == 'x':
        F.box(a0, a1, b0, b1, fixed - .05, fixed + .05, DARK); F.box(a0 - .08, a1 + .08, b0 - .08, b0, fixed - .08 * -out, fixed + .1 * out if out > 0 else fixed - .1, QUOIN)
        for s in (-1, 1): F.rbox((a0 + a1) / 2 + s * (a1 - a0) * .75, fixed + out * .06, (a1 - a0) / 2, .05, b0, b1, 0, SHUTTER)
    else:
        F.box(fixed - .05, fixed + .05, b0, b1, a0, a1, DARK)
        for s in (-1, 1): F.box(fixed + out * .04, fixed + out * .09, b0, b1, (a0 + a1) / 2 + s * (a1 - a0) * .5 - (a1 - a0) / 4, (a0 + a1) / 2 + s * (a1 - a0) * .5 + (a1 - a0) / 4, SHUTTER)
# the door leaf, standing open inside against the wall
F.box(DOOR[1] + .05, DOOR[1] + .12, 0, 2.15, Z0 + T, Z0 + T + .95, SHUTTER)
# lantern bracket by the door
F.beam((DOOR[1] + .4, 2.45, Z0 - .02), (DOOR[1] + .4, 2.45, Z0 - .3), .05, .05, IRON); F.lathe(DOOR[1] + .4, Z0 - .3, 2.1, [(.07, 0), (.08, .22), (.04, .3)], 6, LAMP, top=True)
F.build(root, vcol=False)

# ---------------------------------------------------------------- floors (walkable supports) and the threshold
FL = Acc('Mill_FloorFlags')
x = X0 + T
while x < X1 - T - .01:
    x2 = min(X1 - T, x + rng.uniform(.5, .8)); z = Z0 + T
    while z < Z1 - T - .01:
        z2 = min(Z1 - T, z + rng.uniform(.5, .9)); FL.box(x + .01, x2 - .01, 0, .04, z + .01, z2 - .01, FLAG if rng.random() < .7 else STONE[2], skip='b'); z = z2
    x = x2
FL.box(DOOR[0], DOOR[1], 0, .05, Z0 - .45, Z0 + T, QUOIN, skip='b')   # threshold slab
FL.box(-3.0, 4.0, -.35, .0, Z0 - 1.0, Z0 + .05, FLAG)   # the flagged apron outside the north door (to the weir walk landing)
FL.build(root, vcol=False)
A = Acc('Mill_FloorBase'); A.box(X0 + T, X1 - T, -.6, .012, Z0 + T, Z1 - T, STONE[1]); A.build(root, vcol=False)   # its top (over the terrain, under the flags) reads as floor between flags

# ---------------------------------------------------------------- interior furnishings (obstacles)
FU = Acc('Mill_FurnishingStones')
FU.lathe(0.2, .4, 0, [(1.0, 0), (1.0, .55), (.95, .6)], 12, OAK, top=True)   # the tun (wooden casing)
FU.lathe(0.2, .4, .6, [(.8, 0), (.8, .18)], 12, MILLSTONE, top=True)          # runner stone showing through
FU.lathe(0.2, .4, .78, [(.12, 0), (.12, .1)], 6, IRON, top=True)
for sx in (-.75, 1.15):
    FU.box(sx - .06, sx + .06, 0, 2.0, -.2, -.08, FRAME); FU.box(sx - .06, sx + .06, 0, 2.0, .88, 1.0, FRAME)
FU.box(-.8, 1.2, 1.9, 2.0, -.2, 1.0, FRAME)
FU.poly([(-.35, 2.05, -.05), (.75, 2.05, -.05), (.75, 2.05, .85), (-.35, 2.05, .85), (.2, 1.35, .4)], [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4)], PLANK)   # the hopper
FU.poly([(-.3, 2.02, 0), (.7, 2.02, 0), (.7, 2.02, .8), (-.3, 2.02, .8)], [(0, 1, 2, 3)], GRAIN)
FU.box(-.1, .5, .6, .7, .7, 1.1, PLANK)   # the meal spout box
FU.build(root, vcol=False)
FB = Acc('Mill_FurnishingStore')
FB.box(2.4, 3.55, 0, 1.1, -3.5, -1.6, PLANK); FB.box(2.35, 3.6, 1.1, 1.18, -3.55, -1.55, SHUTTER); FB.poly([(2.45, 1.05, -3.4), (3.5, 1.05, -3.4), (3.5, 1.05, -1.7), (2.45, 1.05, -1.7)], [(0, 1, 2, 3)], GRAIN)
for i, (sx, sz) in enumerate(((2.9, 1.2), (3.2, 1.8), (2.7, 2.4), (3.25, 2.9), (-2.2, 3.0))): sack(FB, sx, sz, 0, .5, .75, SACK, SACK_T, rot=i * .7)
FB.box(-2.5, -1.9, 0, .4, 1.8, 2.5, OAK); FB.beam((-2.2, .4, 1.8), (-2.2, 1.1, 1.2), .05, .05, OAK)   # sack barrow
FB.build(root, vcol=False)

# ---------------------------------------------------------------- upper storey: jettied timber frame and plaster
H2 = 2.2; JX, JZ = -.5, -.4   # jetty: west over the wheel pit, north over the door
UX0, UX1, UZ0, UZ1 = X0 + JX, X1, Z0 + JZ, Z1
UF = Acc('Mill_UpperFloorBoards'); UF.box(UX0, UX1, H1, H1 + .12, UZ0, UZ1, PLANK); UF.build(root, vcol=False)
UJ = Acc('Mill_UpperJoists')
for z in [UZ0 + .3 + i * .6 for i in range(int((UZ1 - UZ0 - .3) / .6) + 1)]: UJ.box(UX0 - .06, X0 + .3, H1 - .14, H1, z - .07, z + .07, FRAME)
for x in [UX0 + .3 + i * .6 for i in range(int((UX1 - UX0 - .3) / .6) + 1)]: UJ.box(x - .07, x + .07, H1 - .14, H1, UZ0 - .06, Z0 + .3, FRAME)
for (a, b) in (((UX0 + .1, UZ0 + .1), (X0, Z0 - .9)), ((UX0 + .1, UZ1 - .1), (X0 - .02, UZ1 - .1))):   # braces under the jetty
    pass
UJ.beam((X0 - .02, 1.5, Z0 + .6), (UX0 + .1, H1 - .1, Z0 + .6), .1, .1, FRAME); UJ.beam((X0 - .02, 1.5, Z1 - .6), (UX0 + .1, H1 - .1, Z1 - .6), .1, .1, FRAME)
UJ.build(root, vcol=False)
US = Acc('Mill_UpperShell')
y0, y1 = H1 + .12, H1 + .12 + H2
def frame_wall(axis, fixed, a0, a1, out, windows=()):
    t0, t1 = (fixed, fixed + out * .14)
    def B(p, q, u, v, m):
        if axis == 'x': US.box(p, q, u, v, min(t0, t1), max(t0, t1), m)
        else: US.box(min(t0, t1), max(t0, t1), u, v, p, q, m)
    B(a0, a1, y0 + .1, y1 - .1, PLASTER)
    for p in [a0 + i * (a1 - a0) / max(1, round((a1 - a0) / 1.1)) for i in range(int(round((a1 - a0) / 1.1)) + 1)]:
        B(p - .07, p + .07, y0, y1, FRAME) if axis == 'x' else B(p - .07, p + .07, y0, y1, FRAME)
    for yy in (y0, y0 + 1.0, y1 - .12): B(a0, a1, yy, yy + .12, FRAME)
    for (w0, w1) in windows:
        if axis == 'x': US.box(w0, w1, y0 + .55, y0 + 1.35, fixed + out * .1, fixed + out * .16, DARK); US.box(w0 - .06, w1 + .06, y0 + .5, y0 + .56, fixed + out * .1, fixed + out * .2, FRAME)
        else: US.box(fixed + out * .1, fixed + out * .16, y0 + .55, y0 + 1.35, w0, w1, DARK)
    # a diagonal brace per bay end
    if axis == 'x': US.beam((a0 + .1, y0 + .1, fixed + out * .15), (a0 + .9, y1 - .15, fixed + out * .15), .08, .05, FRAME)
    else: US.beam((fixed + out * .15, y0 + .1, a0 + .1), (fixed + out * .15, y1 - .15, a0 + .9), .08, .05, FRAME)
frame_wall('x', UZ0, UX0, UX1, -1, windows=[(.2, .9)]); frame_wall('x', UZ1, UX0, UX1, 1, windows=[(1.2, 1.9)])
frame_wall('z', UX0, UZ0, UZ1, -1, windows=[(-1.6, -.8), (1.2, 2.0)]); frame_wall('z', UX1, UZ0, UZ1, 1)
US.build(root, vcol=False)

# ---------------------------------------------------------------- roof: thatch hip with a half-hip, and the lucam
R = Acc('Mill_Roof')
E = .55; ey = y1; ridge_y = ey + 2.3
rx0, rx1, rz0, rz1 = UX0 - E, UX1 + E, UZ0 - E, UZ1 + E
cx = (rx0 + rx1) / 2; hipN = rz0 + (rx1 - rx0) / 2 * .95; hipS = rz1 - 1.2   # full hip north, half-hip south
def quad(a, b, c, d, m): R.poly([a, b, c, d], [(0, 1, 2, 3)], m)
def trig(a, b, c, m): R.poly([a, b, c], [(0, 1, 2)], m)
ra, rb = (cx, ridge_y, hipN), (cx, ridge_y, hipS)
gy = ey + 1.4; gz = rz1 - .35                                      # south: a steep lower hip, a shallower upper hip (two pitches)
hx0, hx1 = cx - (rx1 - rx0) / 2 * (1 - 1.4 / 2.3), cx + (rx1 - rx0) / 2 * (1 - 1.4 / 2.3)
R.poly([(rx0, ey, rz1), (rx0, ey, rz0), ra, rb, (hx0, gy, gz)], [(0, 1, 2, 3, 4)], THATCH[0])   # west slope
R.poly([(rx1, ey, rz0), (rx1, ey, rz1), (hx1, gy, gz), rb, ra], [(0, 1, 2, 3, 4)], THATCH[1])   # east slope
trig((rx0, ey, rz0), (rx1, ey, rz0), ra, THATCH[0])                # north hip
quad((rx1, ey, rz1), (rx0, ey, rz1), (hx0, gy, gz), (hx1, gy, gz), THATCH[1]); trig((hx1, gy, gz), (hx0, gy, gz), rb, THATCH[0])
# thatch thickness at the eaves and a ridge roll
for (a, b) in (((rx0, rz0), (rx0, rz1)), ((rx1, rz0), (rx1, rz1)), ((rx0, rz0), (rx1, rz0)), ((rx0, rz1), (rx1, rz1))):
    R.beam((a[0], ey - .08, a[1]), (b[0], ey - .08, b[1]), .3, .16, THATCH[1])
R.tube((cx, ridge_y + .05, hipN), (cx, ridge_y + .05, hipS), .14, 6, THATCH[0], caps=True)
R.build(root, vcol=False)
# the lucam: a projecting sack-hoist housing high on the east wall, with its own gable and a sack on the rope
L = Acc('Mill_RoofLucam')
lz0, lz1, lx0, lx1 = -.7, .7, UX1, UX1 + 1.0; ly0 = y0 + .3; ly1 = y1 + .5
L.box(lx0, lx1, ly0, ly1, lz0, lz1, PLASTER); L.box(lx1 - .02, lx1 + .02, ly0, ly1, lz0 - .02, lz1 + .02, FRAME)
L.box(lx1, lx1 + .04, ly0 + .2, ly0 + 1.4, -.35, .35, DARK)
for s in (-1, 1): L.box(lx0, lx1 + .05, ly0, ly1, s * .7 - .06, s * .7 + .06, FRAME)
L.poly([(lx0 - .2, ly1, lz0 - .3), (lx1 + .3, ly1, lz0 - .3), (lx1 + .3, ly1 + .8, 0), (lx0 - .2, ly1 + .8, 0)], [(0, 1, 2, 3), (3, 2, 1, 0)], THATCH[0])
L.poly([(lx1 + .3, ly1, lz1 + .3), (lx0 - .2, ly1, lz1 + .3), (lx0 - .2, ly1 + .8, 0), (lx1 + .3, ly1 + .8, 0)], [(0, 1, 2, 3), (3, 2, 1, 0)], THATCH[1])
L.poly([(lx1 + .02, ly1, lz0), (lx1 + .02, ly1, lz1), (lx1 + .02, ly1 + .7, 0)], [(0, 1, 2), (0, 2, 1)], PLASTER)
L.beam((lx1 - .2, ly1 + .1, 0), (lx1 + .9, ly1 + .1, 0), .12, .12, FRAME); L.box(lx1 + .8, lx1 + .82, ly0 - .4, ly1 + .1, -.01, .01, ROPE)
sack(L, lx1 + .81, 0, ly0 - 1.1, .42, .7, SACK, SACK_T, rot=.4)
L.build(root, vcol=False)

# ---------------------------------------------------------------- the wheel (animated), leat + sluice, weir + foam, walkway
wc = W(60.3, 3.0, 62.8); WR = 1.3; WW = .8
wheel = bpy.data.objects.new('Mill_Wheel', None); bpy.context.collection.objects.link(wheel); wheel.parent = root
wheel.location = (wc[0], -wc[2], wc[1])   # Blender coords of the axle centre
Wm = Acc('Mill_WheelParts')
def rim(xoff):
    n = 16
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        p = [(xoff, WR * math.cos(a), WR * math.sin(a)) for a in (a0, a1)]; q = [(xoff, (WR - .14) * math.cos(a), (WR - .14) * math.sin(a)) for a in (a0, a1)]
        Wm.poly([(p[0][0] - .05, p[0][1], p[0][2]), (p[1][0] - .05, p[1][1], p[1][2]), (p[1][0] + .05, p[1][1], p[1][2]), (p[0][0] + .05, p[0][1], p[0][2])], [(0, 1, 2, 3), (3, 2, 1, 0)], OAK)
        Wm.poly([(q[0][0] - .05, q[0][1], q[0][2]), (q[1][0] - .05, q[1][1], q[1][2]), (q[1][0] + .05, q[1][1], q[1][2]), (q[0][0] + .05, q[0][1], q[0][2])], [(0, 1, 2, 3), (3, 2, 1, 0)], OAK)
        for side in (-.05, .05): Wm.poly([(xoff + side, p[0][1], p[0][2]), (xoff + side, p[1][1], p[1][2]), (xoff + side, q[1][1], q[1][2]), (xoff + side, q[0][1], q[0][2])], [(0, 1, 2, 3), (3, 2, 1, 0)], OAK)
for xo in (-WW / 2, WW / 2):
    rim(xo)
    for i in range(8):
        a = 2 * math.pi * i / 8 + math.pi / 16; Wm.beam((xo, 0, 0), (xo, (WR - .1) * math.cos(a), (WR - .1) * math.sin(a)), .07, .07, FRAME)
for i in range(12):
    a = 2 * math.pi * i / 12; c, s = math.cos(a), math.sin(a)
    Wm.poly([(-WW / 2, (WR - .3) * c, (WR - .3) * s), (WW / 2, (WR - .3) * c, (WR - .3) * s), (WW / 2, (WR + .12) * c, (WR + .12) * s), (-WW / 2, (WR + .12) * c, (WR + .12) * s)], [(0, 1, 2, 3), (3, 2, 1, 0)], PLANK)
Wm.tube((-WW / 2 - .15, 0, 0), (1.9, 0, 0), .1, 8, OAK, caps=True)   # the axle into the pit wall (local x runs east)
# build the wheel mesh in the WHEEL's own frame: Acc maps plan (x,y,z) -> Blender (x,-z,y); these parts use (x, y, z) =
# (axle axis, up, south) about the axle centre
wo = Wm.build(wheel, vcol=False)
# the wheel turns north-side-down (water pours on at breast height from the leat, upstream): 10 s a turn, looped
wheel.rotation_mode = 'XYZ'; fps = bpy.context.scene.render.fps
for k in range(9):
    wheel.rotation_euler = (-2 * math.pi * k / 8, 0, 0); wheel.keyframe_insert('rotation_euler', index=0, frame=1 + k * 10 * fps / 8)
act = wheel.animation_data.action; act.name = 'WheelTurn'
for fc in act.fcurves:
    for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
# a bearing post on the far side of the wheel
BP = Acc('Mill_WheelBearing'); bx = wc[0] - WW / 2 - .3
BP.box(bx - .12, bx + .12, -2.0, wc[1] + .15, wc[2] - .14, wc[2] + .14, OAK); BP.box(bx - .16, bx + .16, wc[1] - .12, wc[1] + .12, wc[2] - .2, wc[2] + .2, STONE[1])
BP.build(root, vcol=False)
# leat: a timber trough from the head pool, on two trestles, delivering at breast height; the sluice gate at its head
LE = Acc('Mill_Leat'); lx = wc[0]; lz0, lz1 = W(0, 0, 59.2)[2], wc[2] - WR + .15; ly = W(0, 3.02, 0)[1]
LE.box(lx - .32, lx + .32, ly - .08, ly, lz0, lz1, PLANK)
for s in (-1, 1): LE.box(lx + s * .32 - .04, lx + s * .32 + .04, ly - .08, ly + .26, lz0, lz1, PLANK)
LE.box(lx - .28, lx + .28, ly + .1, ly + .12, lz0, lz1 + .15, WATER)
for tz in (lz0 + .5, lz1 - .4):
    for s in (-1, 1): LE.beam((lx + s * .45, -2.0, tz), (lx + s * .3, ly - .08, tz), .08, .08, OAK)
    LE.box(lx - .5, lx + .5, ly - .2, ly - .08, tz - .05, tz + .05, OAK)
LE.box(lx - .45, lx + .45, ly - .3, ly + .9, lz0 - .06, lz0 + .06, FRAME); LE.box(lx - .3, lx + .3, ly + .25, ly + .65, lz0 - .04, lz0 + .04, SHUTTER)   # sluice frame + gate
LE.tube((lx + .5, ly + .95, lz0), (lx + .7, ly + .95, lz0), .03, 5, IRON); LE.lathe(lx + .72, lz0, ly + .8, [(.15, 0), (.15, .02)], 8, IRON, top=False)
LE.build(root, vcol=False)
# weir: a stone sill across the channel at the crest, white water down its face (FoamFlow), the splash at the wheel (SplashPulse)
WE = Acc('Mill_Weir'); cz = W(0, 0, 59.95)[2]; wx0, wx1 = W(58.2, 0, 0)[0], W(61.9, 0, 0)[0]; top = W(0, 3.08, 0)[1]
WE.box(wx0, wx1, -2.4, top, cz - .22, cz + .18, STONE[0]); WE.box(wx0, wx1, top, top + .06, cz - .24, cz + .2, QUOIN)
bot = W(0, 2.07, 0)[1]; fz = W(0, 0, 60.95)[2]
WFALL = M('Weir falling water', '#a9c3d2')   # the falling sheet: pale water, the foam bits ride on it
for k in range(5):   # the sheet in five strips with small gaps: water pouring over the sill, not a slab
    xa = wx0 + .25 + k * (wx1 - wx0 - .5) / 5; xb = xa + (wx1 - wx0 - .5) / 5 - .05
    WE.poly([(xa, top + .02, cz + .18), (xb, top + .02, cz + .18), (xb, bot, fz), (xa, bot, fz)], [(0, 1, 2, 3)], WFALL)
WE.build(root, vcol=False)
foam = bpy.data.objects.new('Mill_Foam', None); bpy.context.collection.objects.link(foam); foam.parent = root
FO = Acc('Mill_FoamBits')
for i in range(7):
    fx = wx0 + .4 + i * (wx1 - wx0 - .8) / 6
    for s in (0, .5):
        t = s; py = top + (bot - top) * t; pz = cz + .18 + (fz - cz - .18) * t
        FO.poly([(fx - .14, py + .05, pz), (fx + .14, py + .05, pz), (fx + .1, py + .02, pz + .16), (fx - .1, py + .02, pz + .16)], [(0, 1, 2, 3), (3, 2, 1, 0)], FOAM)
FO.build(foam, vcol=False)
dy, dz = (bot - top) / 2, (fz - cz - .18) / 2   # FoamFlow: the bits slide half the face down, then jump back (1 s loop)
for k, t in enumerate((0, 1)):
    foam.location = (0, -(dz * t), dy * t); foam.keyframe_insert('location', frame=1 + k * fps)
fa = foam.animation_data.action; fa.name = 'FoamFlow'
for fc in fa.fcurves:
    for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
splash = bpy.data.objects.new('Mill_Splash', None); bpy.context.collection.objects.link(splash); splash.parent = root
sp_at = W(60.3, 2.05, 61.9); splash.location = (sp_at[0], -sp_at[2], sp_at[1])
SP = Acc('Mill_SplashFoam')
for i in range(6):
    a = 2 * math.pi * i / 6; SP.poly([(.25 * math.cos(a), .02, .18 * math.sin(a)), (.45 * math.cos(a + .3), .12, .3 * math.sin(a + .3)), (.45 * math.cos(a - .3), .12, .3 * math.sin(a - .3))], [(0, 1, 2), (0, 2, 1)], FOAM)
SP.lathe(0, 0, 0, [(.3, 0), (.35, .03)], 8, FOAM, top=True)
SP.build(splash, vcol=False)
for k, sc in enumerate((1.0, 1.35, 1.0)):
    splash.scale = (sc, sc, sc * (1.2 if k == 1 else 1)); splash.keyframe_insert('scale', frame=1 + k * fps * .4)
sa = splash.animation_data.action; sa.name = 'SplashPulse'
# the plank walkway on the weir crest (its walking deck is island data: island-decks.json, y 3.35 over tiles x 58-62 on row z 59)
WK = Acc('Mill_WeirWalk'); wy = W(0, 3.35, 0)[1]; wz0, wz1 = W(0, 0, 59.12)[2], W(0, 0, 59.88)[2]; ax0, ax1 = W(57.6, 0, 0)[0], W(62.95, 0, 0)[0]
x = ax0
while x < ax1 - .05:
    x2 = min(ax1, x + rng.uniform(.18, .22)); WK.box(x + .01, x2 - .01, wy - .06, wy, wz0, wz1, PLANK, skip='b'); x = x2
for s in (wz0 + .06, wz1 - .06): WK.box(ax0, ax1, wy - .2, wy - .06, s - .05, s + .05, OAK)
for px in (ax0 + .2, (ax0 + ax1) / 2, ax1 - .2):
    WK.box(px - .05, px + .05, W(0, 1.2, 0)[1], wy - .06, wz0 + .02, wz0 + .12, OAK); WK.box(px - .05, px + .05, wy - .06, wy + .85, wz1 - .1, wz1, OAK)
WK.box(ax0, ax1, wy + .78, wy + .84, wz1 - .09, wz1 - .01, ROPE)
WK.build(root, vcol=False)

# ---------------------------------------------------------------- outside dressing: spare millstone, sacks by the door
EX = Acc('Mill_Dressing')
EX.lathe(1.0, Z1 + .35, 0, [(.0, 0), (.0, 0)], 3, MILLSTONE, top=False)
ms = [(math.cos(2 * math.pi * i / 12) * .75, .78 + math.sin(2 * math.pi * i / 12) * .75) for i in range(12)]
EX.poly([(1.0 + p[0], p[1], Z1 + .25) for p in ms] + [(1.0 + p[0], p[1], Z1 + .5) for p in ms], [tuple(range(12)), tuple(range(23, 11, -1))] + [(i, (i + 1) % 12, 12 + (i + 1) % 12, 12 + i) for i in range(12)], MILLSTONE)
for i, (sx, sz) in enumerate(((3.3, Z0 - .42), (3.75, Z0 - .5))): sack(EX, sx, sz, 0, .5, .72, SACK, SACK_T, rot=i)   # by the east corner, clear of the door path
EX.build(root, vcol=False)
bpy.context.scene.frame_set(1)
man = P.export('mill.glb', animations=True)
man['clips'] = ['WheelTurn', 'FoamFlow', 'SplashPulse']; man['origin'] = {'x': OX, 'y': OY, 'z': OZ}
(OUT / 'manifest.json').write_text(json.dumps(man, indent=1) + '\n', encoding='utf8')

# ---------------------------------------------------------------- proof renders (3/4 view + top), presentation only
scene = bpy.context.scene
for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
    try: scene.render.engine = eng; break
    except TypeError: pass
scene.view_settings.view_transform = 'Standard'
for m in bpy.data.materials:
    if m.get('srgb') and not m.use_nodes:
        m.use_nodes = True; bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); bs.inputs['Base Color'].default_value = (*[srgb_to_lin(c) for c in m['srgb']], 1); bs.inputs['Roughness'].default_value = 1
scene.world = bpy.data.worlds.new('Studio'); scene.world.use_nodes = True
bg = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs[0].default_value = (.55, .62, .7, 1); bg.inputs[1].default_value = 1.0
sun = bpy.data.objects.new('Key', bpy.data.lights.new('Key', 'SUN')); sun.data.energy = 3.2; sun.rotation_euler = (math.radians(50), 0, math.radians(-40)); scene.collection.objects.link(sun)
wat = bpy.data.materials.new('proof water'); wat.use_nodes = True; next(n for n in wat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Base Color'].default_value = (.12, .25, .4, 1)
gr = bpy.data.materials.new('proof bank'); gr.use_nodes = True; next(n for n in gr.node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Base Color'].default_value = (.2, .3, .1, 1)
bpy.ops.mesh.primitive_plane_add(size=3.2, location=(-4.9, 1.5, W(0, 2.0, 0)[1])); bpy.context.object.scale = (1, 4, 1); bpy.context.object.data.materials.append(wat)
bpy.ops.mesh.primitive_plane_add(size=3.2, location=(-4.9, 5.2, W(0, 3.1, 0)[1])); bpy.context.object.scale = (1, .8, 1); bpy.context.object.data.materials.append(wat)
bpy.ops.mesh.primitive_plane_add(size=40, location=(8, 0, -.02)); bpy.context.object.data.materials.append(gr)
cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam')); scene.collection.objects.link(cam); scene.camera = cam
PR = ROOT / 'scratchpad/holm_v2_land/props'; PR.mkdir(parents=True, exist_ok=True)
for name, loc, tgt in (('mill_nw', (-14, 12, 9), (0, 0, 2.2)), ('mill_se', (13, -12, 9), (0, 0, 2.2)), ('mill_wheel', (-10, -3, 3), (-4.5, 1.2, .2))):
    cam.location = loc; cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); cam.data.lens = 35
    scene.render.resolution_x = 1200; scene.render.resolution_y = 900; scene.render.filepath = str(PR / (name + '.png')); bpy.ops.render.render(write_still=True)
print('[HOLM_MILL_V1] proofs ->', PR)
