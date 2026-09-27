"""Guide house v6 cellar (owner review 4, 2026-09-27: "the hatch should be in one corner of the room, and maybe there's just
a cabbage spawn or something random down there").

The trapdoor sits in the south-east corner of the ground floor, tight against both walls beside the foot of the stair (the v3
hatch lay mid-room between the two tables; the south-west corner is closed off by the long table, the benches and the
sideboard, so nobody could reach a hatch there), and opens onto a small stone cellar of three by three tiles directly below: coursed stone
walls, a beamed ceiling, flagstones, a ladder up the south wall to the hatch, two barrels in the far corner, a sack, a shelf
of preserves on the north wall with a lantern on it, a pail, and a cabbage on the floor that can be picked up (it grows back:
src/holm_guide_cellar.js).

Named parts (game contract; the same names as v3, plus the cabbage):
 CellarHatch        hatch frame, flush in the ground floor; custom prop kind=arrival_hatch
 CellarHatchLid     the lid, origin on its hinge along its NORTH edge (house-local plan x axis); it opens by turning
                    -90 degrees about x (it stands upright against nothing, a 2004 trapdoor); custom props openAxis/openAngle
 CellarHatchLidIron ring pull and strap hinges, child of the lid
 CellarFloor, CellarShell, CellarCeiling, CellarLadder, CellarFurnishing   as v3
 CellarCabbage      the cabbage spawn (hidden by the game while taken)
Plan coordinates are house-local (x east, y up, z south); floor y -2.75 under the ground floor's 0."""
import math, random
from holm_interior_kit import Acc, M, family, barrel, sack, jar, lantern, stone_face, plank_floor
import holm_purposeful_props as pp

FLOOR = -2.75
ROOM = (2.8, 5.8, 1.8, 4.8)                    # interior x0,x1,z0,z1: tiles x 3..6, z 1..4 (tile centres 3.5..5.5, 2.5..4.5)
FRAME = (4.97, 5.77, 4.01, 4.77)               # frame outer edge = the hole in the ground floor (0.8 x 0.76, in the corner)
OPEN = (5.05, 5.69, 4.09, 4.69)                # clear opening
LID = (5.01, 5.73, 4.05, 4.73)
TILES = [(5.5, 2.5), (4.5, 2.5), (3.5, 2.5), (5.5, 3.5), (4.5, 3.5), (3.5, 3.5), (4.5, 4.5)]   # walkable cellar tiles
FOOT = (5.5, 3.5)                               # at the ladder's foot (the ladder climbs the south wall of tile 5..6)
HATCH_TOP = (4.5, 3.5)                          # the ground-floor tile at the stair foot you climb down from (node ground:70,102)
CABBAGE = (3.35, 2.45)


def build(B, P):
    root = B['root']; rng = random.Random(9263); x0, x1, z0, z1 = ROOM; TOPY = -.2
    greys = family('Cellar stone', ['#625f58', '#6f6b63', '#56534d', '#7a7263', '#68655e'])
    mortar = M('Cellar mortar', '#3e3a35'); flags = family('Cellar flag', ['#6d695f', '#7a756a', '#605c54', '#716c61']); grout = M('Cellar grout', '#2e2b27')
    beam = M('Cellar beam oak', '#4a3322'); boards = family('Cellar ceiling board', ['#5d4330', '#533b29', '#654a35']); web = M('Cobweb', '#d6d6cf')
    # ---- floor: flagstones over a dark grout bed
    F = Acc('CellarFloor'); F.box(x0, x1, FLOOR - .12, FLOOR - .012, z0, z1, grout, skip='b')
    z = z0
    while z < z1 - .05:
        zh = min(z1, z + rng.uniform(.45, .75))
        if z1 - zh < .3: zh = z1
        x = x0
        while x < x1 - .05:
            xh = min(x1, x + rng.uniform(.5, .95))
            if x1 - xh < .3: xh = x1
            F.box(x + .012, xh - .012, FLOOR - .05, FLOOR + rng.uniform(-.004, .006), z + .012, zh - .012, flags[rng.randrange(4)], skip='b'); x = xh
        z = zh
    F.build(root)
    # ---- walls: a mortar core, coursed stones on the room side
    S = Acc('CellarShell'); t = .3
    for bx in [(x0 - t, x0, FLOOR - .12, TOPY, z0 - t, z1 + t), (x1, x1 + t, FLOOR - .12, TOPY, z0 - t, z1 + t), (x0, x1, FLOOR - .12, TOPY, z0 - t, z0), (x0, x1, FLOOR - .12, TOPY, z1, z1 + t)]:
        S.box(*bx, mortar)
    kw = dict(course=(.34, .5), length=(.55, .95), proud=(.015, .045))
    stone_face(S, 'z', x0, 1, z0, z1, FLOOR, TOPY - .25, greys, rng, **kw); stone_face(S, 'z', x1, -1, z0, z1, FLOOR, TOPY - .25, greys, rng, **kw)
    stone_face(S, 'x', z0, 1, x0, x1, FLOOR, TOPY - .25, greys, rng, **kw); stone_face(S, 'x', z1, -1, x0, x1, FLOOR, TOPY - .25, greys, rng, **kw)
    S.build(root)
    # ---- beamed ceiling (under the ground floor), trimmed round the hatch
    C = Acc('CellarCeiling')
    plank_floor(C, x0, x1, z0, z1, TOPY - .01, boards, None, rng, width=.28, holes=[FRAME], run='x', thick=.025)
    for xx in (x0 + .5, x0 + 1.5, x0 + 2.5):
        zb = z1 if xx < FRAME[0] - .12 else FRAME[2] - .07   # the joist under the hatch stops at its header
        C.box(xx - .07, xx + .07, -.42, TOPY - .035, z0, zb, beam)
    C.box(FRAME[0] - .15, FRAME[0] - .01, -.42, TOPY - .035, FRAME[2] - .14, z1, beam)       # trimmer beside the hatch
    C.box(FRAME[0] - .15, x1, -.42, TOPY - .035, FRAME[2] - .14, FRAME[2], beam)            # header across the hatch's north edge
    C.build(root)
    # ---- ladder: up the south wall from the floor to the hatch, rungs along x
    L = Acc('CellarLadder'); lm = M('Ladder ash', '#9b7a50'); lr = M('Ladder rung', '#8a6a43')
    foot_z, top_z = 4.36, 4.62
    for xx in (5.16, 5.58):
        L.beam((xx, FLOOR, foot_z), (xx, -.04, top_z), .06, .08, lm)
    for i in range(1, 9):
        f = i / 9; yy = FLOOR + (-.04 - FLOOR) * f; zz = foot_z + (top_z - foot_z) * f
        L.tube((5.13, yy, zz), (5.61, yy, zz), .022, 6, lr, caps=False)
    L.build(root)
    # ---- furnishings: two barrels in the south-west corner, a sack, a preserves shelf, a lantern, cobwebs
    A = Acc('CellarFurnishing'); staves = P['staves']
    barrel(A, 3.28, 4.42, FLOOR, .27, .78, staves, P['iron'], P['lid'], rng); barrel(A, 3.74, 4.5, FLOOR, .24, .66, staves, P['iron'], P['lid'], rng)
    sack(A, 5.52, 2.06, FLOOR, .4, .58, P['sack'][0], P['cord'], rot=.4)
    sx0, sx1 = 3.75, 4.95
    for xx in (sx0, sx1 - .05): A.box(xx, xx + .05, FLOOR, FLOOR + 1.3, 1.82, 2.12, beam)
    for lv in (.12, .55, 1.0): A.box(sx0, sx1, FLOOR + lv, FLOOR + lv + .04, 1.82, 2.12, P['wains'][0])
    glassy = [M('Preserve amber', '#b8862f'), M('Preserve plum', '#6b2f45'), M('Preserve green', '#7d9443'), P['pots'][2]]
    for li, lv in enumerate((.55, 1.0)):
        xx = sx0 + .14
        while xx < sx1 - .14:
            r = rng.uniform(.06, .085); jar(A, xx, 1.97 + rng.uniform(-.02, .02), FLOOR + lv + .04, r, rng.uniform(.14, .22), glassy[rng.randrange(4)], lid=P['linen'] if rng.random() < .5 else P['cord'], n=10, style=rng.randrange(3)); xx += 2 * r + .08
    for xx in (sx0 + .3, sx0 + .8): A.lathe(xx, 1.97, FLOOR + .16, [(.15, 0), (.15, .09), (.12, .11)], 12, P['cheese'], top=True)
    pp.pail(A, 3.95, 4.58, FLOOR, .3, P['staves'][1], P['iron'], P['iron'])
    # the lantern stands on the shelf (the game cuts the walls a little over head height while you are below: nothing hangs
    # up there to float over the cut)
    lantern(A, sx1 - .2, 1.97, FLOOR + 1.04, P['iron'], P['glass'])
    A.build(root)
    # ---- the cabbage (its own part: the game hides it while it is taken and shows it again when it grows back)
    Cb = Acc('CellarCabbage'); leaf = M('Cabbage leaf', '#6f9442'); leaf_pale = M('Cabbage heart', '#a4c06a'); vein = M('Cabbage vein', '#c9d99a')
    cx, cz = CABBAGE; cy = FLOOR
    pp.ellipsoid(Cb, cx, cy + .11, cz, .12, .1, .115, leaf_pale, seg=10, rings=5, flat=cy)
    for i in range(7):   # outer leaves curling up round the heart
        a = i * 2 * math.pi / 7 + .3; c, s = math.cos(a), math.sin(a)
        base = (cx + c * .06, cy + .005, cz + s * .06); tip = (cx + c * .19, cy + .16, cz + s * .19)
        l1 = (cx + c * .15 - s * .09, cy + .07, cz + s * .15 + c * .09); l2 = (cx + c * .15 + s * .09, cy + .07, cz + s * .15 - c * .09)
        Cb.poly([base, l1, tip, l2], [(0, 1, 2, 3)], leaf); Cb.poly([base, l1, tip, l2], [(3, 2, 1, 0)], leaf)
        Cb.beam((cx + c * .07, cy + .02, cz + s * .07), (cx + c * .16, cy + .12, cz + s * .16), .012, .006, vein)
    cab = Cb.build(root); cab['kind'] = 'arrival_cellar_cabbage'
    # ---- the hatch in the ground floor: frame and lid (single-material meshes, so extras land on the mesh)
    fm = P['hatchframe']; H = Acc('CellarHatch')
    H.box(FRAME[0], FRAME[1], TOPY, 0, FRAME[2], OPEN[2], fm); H.box(FRAME[0], FRAME[1], TOPY, 0, OPEN[3], FRAME[3], fm)
    H.box(FRAME[0], OPEN[0], TOPY, 0, OPEN[2], OPEN[3], fm); H.box(OPEN[1], FRAME[1], TOPY, 0, OPEN[2], OPEN[3], fm)
    h = H.build(root); h['kind'] = 'arrival_hatch'; h['arrivalHatch'] = 'cellar'
    lx0, lx1, lz0, lz1 = LID; hy = .045
    # the lid is authored from its hinge line (its north edge, along x): x across, z from 0 (hinge) to its depth
    Lid = Acc('CellarHatchLid'); n = 4; w = (lx1 - lx0) / n; dz = lz1 - lz0
    for i in range(n): Lid.box(i * w + .004, (i + 1) * w - .004, 0, hy, 0, dz, P['hatch'])
    for xx in (.14, lx1 - lx0 - .14): Lid.box(xx - .05, xx + .05, -.035, 0, .08, dz - .08, P['hatch'])
    Lid.beam((.12, -.018, .2), (lx1 - lx0 - .12, -.018, dz - .2), .07, .034, P['hatch'])
    lid = Lid.build(root)
    lid.location = (lx0, -lz0, 0)
    lid['kind'] = 'arrival_hatch'; lid['arrivalHatch'] = 'cellar'; lid['openAxis'] = 'x'; lid['openAngle'] = -math.pi / 2
    I = Acc('CellarHatchLidIron')
    for xx in (.14, lx1 - lx0 - .14): I.box(xx - .035, xx + .035, hy, hy + .008, -.03, .32, P['iron'])
    cz2 = dz * .78; I.tube((.3, hy + .012, cz2), (.44, hy + .012, cz2), .012, 6, P['iron'], caps=False)
    I.build(lid)
    return {'floorY': FLOOR, 'room': ROOM, 'opening': OPEN, 'frame': FRAME, 'tiles': TILES, 'foot': FOOT, 'hatchTop': HATCH_TOP, 'cabbage': CABBAGE}
