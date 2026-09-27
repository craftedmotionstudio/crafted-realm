"""Guide house v6 ground-floor furnishings (owner review 4, 2026-09-27).

v3's room (holm_guide_house_interior_v3.ground) with its furniture where it stood, and every vessel on it designed again
(holm_purposeful_props): the long table is laid on purpose - a scored cob loaf on a board with its knife, a cut cheese, a
bowl of apples, a jug with a strap handle and a pinched spout, two hooped tankards, two plates, a turned candlestick; the
dresser shows its plates standing in the groove and four different vessels (a bottle, a lidded jar, a flask, a beaker);
the water urn by the north wall has shoulders, loop handles and a lid, with a coopered pail beside it; the sideboard holds
a wash basin with water and an ewer; the pot plant is a herb in a rimmed pot. The south-east corner by the stair foot now holds
the cellar trapdoor (holm_guide_house_cellar_v6), so the pot plant moved to the south-west corner, in the tall urn's place,
with the broom leaning beside it.
Nothing new stands on a navigation tile: every piece is on a table, a shelf, or where v3's piece stood."""
import math, random
import holm_guide_house_interior_v3 as v3
from holm_interior_kit import Acc, M, barrel, crate, sack, jar, bowl, candle, lantern, books, rug, herbs
import holm_purposeful_props as pp


def ground(B, P):
    rng = random.Random(9251); A = Acc('GroundFurnishing')
    pewter = P['pewter']; brass = P['brass']; linen = P['linen']
    crust = M('Loaf crust', '#b8783c'); crumb_score = M('Loaf score', '#e2c28a'); rind = M('Cheese rind', '#c9a246'); paste = M('Cheese paste', '#f0dc8c')
    earthen = M('Jug earthenware', '#a2603a'); glaze_band = M('Jug glaze band', '#5d7a64'); inside = M('Vessel inside', '#3b2618'); ale = M('Ale', '#6a3f1c')
    bowl_wood = M('Turned beech', '#a57a4c'); stalk = M('Apple stalk', '#4a3522'); knife_blade = M('Knife blade', '#b8bcbb'); knife_haft = M('Knife haft', '#5a3b24')
    plate_glaze = M('Plate glaze', '#dcd3bb'); plate_well = M('Plate well blue', '#7a93a8'); water = M('Basin water', '#7d97a0')
    urn_body = M('Urn stoneware', '#8e6a4a'); urn_rim = M('Urn rim glaze', '#5f4a36'); lid_wood = M('Urn lid oak', '#6b4a2c')
    # chart table (the relief chart sits on it, built by holm_relief_chart)
    v3.trestle_table(A, P, -2.5, -1.6, 0, 2.0, 1.4, P['pine'], P['walnut'])
    # the long table with benches, laid for a meal
    v3.trestle_table(A, P, -2.5, 2.0, 0, 2.4, 1.4, P['pine'][::-1], P['walnut'])
    for s in (-1, 1): v3.bench(A, P, -2.5, 2.0 + s * 1.08, 0, 1.9, .36, P['pine'][2], P['walnut'])
    T = .82
    A.box(-3.2, -1.8, T, T + .006, 1.65, 2.35, linen)
    pp.bread_board(A, -2.62, 2.0, T + .006, .44, .26, P['wains'][1], rot=.12)
    pp.loaf(A, -2.66, 1.99, T + .031, .3, .21, .15, crust, crumb_score, rot=.12)
    pp.knife(A, -2.42, 2.1, T + .031, .12, knife_blade, knife_haft)
    A.lathe(-2.05, 1.93, T + .006, [(.14, 0), (.14, .02)], 12, P['wains'][0], top=True)
    pp.cheese(A, -2.05, 1.93, T + .026, .1, .075, rind, paste, rot=2.4)
    pp.fruit_bowl(A, -3.28, 1.62, T, .14, bowl_wood, inside, P['apple'], stalk, rng)
    pp.jug(A, -1.6, 1.72, T, .27, earthen, ale, rot=math.pi * .8, glaze=glaze_band)
    pp.tankard(A, -3.02, 2.44, T, .15, pewter, P['iron'], rot=-.6, inside=ale)
    pp.tankard(A, -1.98, 1.55, T, .15, pewter, P['iron'], rot=2.2, inside=ale)
    pp.plate(A, -3.08, 2.12, T + .006, .12, plate_glaze, plate_well)
    pp.plate(A, -1.95, 2.3, T + .006, .12, plate_glaze, plate_well)
    pp.candlestick(A, -2.5, 1.62, T + .006, brass, P['wax'], P['flame'])
    # rugs: a patterned rug under the long table, an indigo runner from door to door
    rug(A, -4.05, -0.95, .45, 3.55, 0, P['rugA'][0], P['rugA'][3], [P['rugA'][2], P['rugA'][1], P['rugA'][2]], m_fringe=P['rugA'][1])
    rug(A, -.62, .62, -3.45, 3.45, 0, P['rugB'][0], P['rugB'][1], [P['rugB'][2], P['rugB'][0], P['rugB'][2]], m_fringe=P['rugB'][0], band=.1)
    # north wall: chest under the west window, dresser, water urn and pail, barrels under the landing
    v3.chest(A, P, -4.3, -3.25, -4.76, -4.25, 0, .56, P['staves'][2], P['iron'], P['staves'][0])
    lantern(A, -3.55, -4.5, .565, P['iron'], P['glass'])
    x0, x1, z0, z1 = -2.22, -1.2, -4.78, -4.34
    A.box(x0, x1, 0, .82, z0, z1, P['wains'][0]); A.box(x0 - .02, x1 + .02, .82, .86, z0, z1 + .03, P['pine'][0])
    for i, (a, b) in enumerate(((x0 + .04, (x0 + x1) / 2 - .01), ((x0 + x1) / 2 + .01, x1 - .04))):
        A.box(a, b, .08, .76, z1, z1 + .02, P['wains'][1 + i]); A.box(b - .08 if i == 0 else a + .04, b - .04 if i == 0 else a + .08, .4, .46, z1 + .02, z1 + .04, brass)
    v3.shelf_unit(A, P, x0, x1, z0, z0 + .26, .86, [.0, .4, .8, 1.16], P['wains'][0], P['backing'])
    A.box(x0 + .04, x1 - .04, .86 + .035, .86 + .06, z0 + .13, z0 + .15, P['oakdark'])   # the plate groove's rail
    for i, xx in enumerate((x0 + .15, x0 + .39, x0 + .63, x0 + .87)):
        pp.plate(A, xx, z0 + .16, .86 + .035, .11, plate_glaze if i % 2 else P['pots'][2], plate_well if i % 2 else P['pots'][3], stand=0.0)
    for i, (xx, style, h, m) in enumerate(((x0 + .14, 0, .27, P['pots'][1]), (x0 + .38, 1, .22, P['pots'][2]), (x0 + .63, 2, .24, P['pots'][3]), (x0 + .87, 3, .2, P['pots'][0]))):
        pp.vase(A, xx, z0 + .14, .86 + .435, h, m, style=style, band=P['pots'][4] if style != 1 else P['pots'][3])
    books(A, x0 + .06, x1 - .06, .86 + .835, z0 + .04, z0 + .24, 'x', P['books'], rng)
    pp.urn(A, 3.3, -4.45, 0, .72, urn_body, urn_rim, rot=.3, lid=lid_wood)
    pp.pail(A, 2.93, -4.52, 0, .3, P['staves'][1], P['iron'], P['iron'])
    barrel(A, 4.42, -4.45, 0, .3, .86, P['staves'], P['iron'], P['lid'], rng)
    barrel(A, 5.16, -4.42, 0, .3, .9, P['staves'], P['iron'], P['lid'], rng)
    sack(A, 4.8, -4.2, 0, .36, .5, P['sack'][0], P['cord'], rot=.4)
    # east wall beside and under the stair: crates, barrel, sacks
    crate(A, 5.15, 5.75, 0, .5, -3.05, -2.45, P['crate'], P['batten']); crate(A, 5.2, 5.7, .5, .9, -3.0, -2.5, P['crate'][::-1], P['batten'])
    crate(A, 3.6, 4.3, 0, .62, -1.85, -1.2, P['crate'], P['batten']); crate(A, 3.65, 4.2, .62, 1.12, -1.8, -1.3, P['crate'][1:], P['batten'])
    barrel(A, 4.25, -.62, 0, .3, .82, P['staves'], P['iron'], P['lid'], rng)
    sack(A, 4.55, .22, 0, .4, .52, P['sack'][1], P['cord']); sack(A, 3.95, .35, 0, .36, .46, P['sack'][0], P['cord'], rot=1.1)
    lantern(A, 5.66, 3.45, 1.62, P['iron'], P['glass']); A.box(5.7, 5.8, 1.6, 1.66, 3.42, 3.48, P['iron'])
    # south wall: sideboard with a wash basin and an ewer under the west window, herbs drying above, banner, lantern by the door
    A.box(-4.55, -3.05, 0, .72, 4.3, 4.78, P['wains'][2]); A.box(-4.58, -3.02, .72, .77, 4.27, 4.79, P['pine'][1])
    for i, (a, b) in enumerate(((-4.5, -3.82), (-3.78, -3.1))): A.box(a, b, .1, .64, 4.28, 4.3, P['wains'][i]); A.box((a + b) / 2 - .03, (a + b) / 2 + .03, .36, .42, 4.26, 4.28, brass)
    pp.basin(A, -4.02, 4.54, .77, .16, P['pots'][2], water)
    pp.jug(A, -3.42, 4.56, .77, .3, P['pots'][3], inside, rot=math.pi * 1.3)
    A.box(-4.65, -2.95, 2.22, 2.26, 4.5, 4.54, P['oakdark']); A.box(-4.62, -4.58, 2.1, 2.26, 4.54, 4.78, P['iron']); A.box(-3.02, -2.98, 2.1, 2.26, 4.54, 4.78, P['iron'])
    herbs(A, -3.8, 4.52, 2.22, P['herbs'], P['cord'], rng, n=6, span=1.4)
    bx0, bx1 = -2.1, -1.42
    A.box(bx0 - .05, bx1 + .05, 2.38, 2.42, 4.71, 4.75, P['oakdark'])
    A.poly([(bx0, 2.38, 4.74), (bx1, 2.38, 4.74), (bx1, 1.32, 4.74), ((bx0 + bx1) / 2, 1.18, 4.74), (bx0, 1.32, 4.74)], [(0, 1, 2, 3, 4)], P['banner'])
    cx = (bx0 + bx1) / 2
    A.poly([(cx - .1, 1.95, 4.735), (cx + .1, 1.95, 4.735), (cx + .07, 1.62, 4.735), (cx - .07, 1.62, 4.735)], [(0, 1, 2, 3)], P['gold'])
    A.poly([(cx - .05, 2.02, 4.735), (cx + .05, 2.02, 4.735), (cx, 2.12, 4.735)], [(0, 1, 2)], P['gold'])
    A.box(cx - .13, cx + .13, 1.5, 1.55, 4.735, 4.74, P['gold']); A.box(cx - .13, cx + .13, 2.2, 2.24, 4.735, 4.74, P['gold'])
    lantern(A, 1.36, 4.55, 1.7, P['iron'], P['glass']); A.box(1.33, 1.39, 1.66, 1.72, 4.55, 4.78, P['iron'])
    crate(A, 2.45, 3.1, 0, .55, 4.15, 4.75, P['crate'], P['batten']); barrel(A, 3.45, 4.47, 0, .26, .62, P['staves'], P['iron'], P['lid'], rng)
    # south-east corner: the cellar trapdoor (cellar module); south-west corner: the pot plant and the broom
    pp.pot_plant(A, -5.3, 4.4, 0, P['pots'][0], P['pots'][4], P['wool'], P['leaf'], rng)
    pp.broom(A, -5.64, 3.62, 0, (-5.76, 3.78), P['wains'][1], P['straw'])
    # west wall: fire-side chair, bookcase, window seat
    v3.chair(A, P, -4.52, -1.42, 0, 2.35, P['pine'][1], P['walnut'], cushion=P['cushion'])
    v3.shelf_unit(A, P, -5.8, -5.36, -.9, .75, 0, [.12, .58, 1.04, 1.5, 1.96], P['wains'][0], P['backing'], axis='z')
    for l in (.12, .58, 1.04, 1.5): books(A, -5.76, -5.4, l + .035, -.85, .7, 'z', P['books'], rng, hmax=.34)
    A.box(-5.8, -5.36, 0, .12, -.9, .75, P['wains'][2])
    A.box(-5.8, -5.35, 0, .4, 1.75, 3.05, P['wains'][1]); A.box(-5.82, -5.3, .4, .45, 1.72, 3.08, P['pine'][0]); A.box(-5.78, -5.36, .45, .53, 1.8, 3.0, P['cushion'])
    return A
