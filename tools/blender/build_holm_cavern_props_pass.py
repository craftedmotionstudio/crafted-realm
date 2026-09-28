"""Training Cavern props pass (owner, 2026-09-28: "props ... blocky -> redo in Blender purposefully"; "every object in every
building reviewed in Blender"). The cavern under the Quarry Gate is where a new hand mines copper and tin, smelts them to
bronze at the furnace and hammers it at the anvil, then walks the propped drift to the keep: its things are a miner's
and a smith's things.

From the model the island loads (holm-cavern-v2land-os-v1/cavern.blend, Blender 5.1). Every prop the v1/v2-land builds
drew as boxes, 8-sided cylinders and stub rings (build_holm_cavern_v1.py, build_holm_cavern_v2land.py) is designed again
in its old footprint, so the same tiles stay blocked and the graph is unchanged. Before -> after:

 ladder landing (west)
  - two stacked crates and a coil of rope -> battened supply crates with lids, the smaller on the larger, a coil of
    spare rope on top;
  - a lidded barrel -> a cask of lamp oil for the torches (a bung in its belly), a bundle of spare torches tied on its head;
  - a sack stub -> a filled sack of torch rag, tied at the neck;
 hub
  - a coal crate (a box with a black slab) and a sack -> an open crate heaped with coal lumps, a coal shovel in it, a
    sack of charcoal beside it;
 ore chamber (north)
  - two ore crates (boxes with a coloured slab) -> slatted crates heaped with broken copper and tin ore;
  - the tool rack on the north wall (two posts, sticks with box heads, 2 m tall, clipped by the cutaway) -> a
    floor-standing rack under 1.4 m: posts on feet, a pegged backboard, two picks hung by their heads, a shovel, a
    pinch bar;
  - a heap of broken ore by the pillar (one faceted lump) -> ore and rubble heaped on the floor, a shovel stuck in it;
  - two barrels and a stick pick -> a water butt with a dipper for the miners, a closed barrel with a pick leaning on it;
 smelting nook (south-east)
  - the furnace (service 'Use Furnace', name and box kept) -> a dressed-stone smelting furnace: a plinth, courses with
    quoins at the corners, an arched mouth of voussoirs over a glowing chamber where a crucible of bronze sits in the
    coals, an iron door swung open, iron bands, a tapering hood and the flue stack into the rock with its collars, the
    hearth apron, an ingot mould with a cast bar, a long ladle;
  - the bellows (a box with slabs) -> great bellows on a trestle: tapered boards, pleated leather sides, a nozzle into
    the furnace's side, the lever raised at the back;
  - the anvil on its stump (service 'Use Anvil', name and box kept) -> a horned anvil (Q.anvil) on an iron-banded oak
    block, a hammer and a glowing bronze bar on its face;
  - the quench tub (a small barrel with a blue lid) -> a staved tub of water, tongs standing in it;
  - the tongs board hung on the west wall (clipped by the cutaway) -> a floor-standing tool stand under 1.4 m: tongs hung
    by their jaws over its rail, hammers and a punch on its shelf;
  - the stacked ore crates -> a lidded crate of copper chalked with its tally, an open crate of tin ore on it;
  - the coal bin -> an open crate heaped with coal, a coal shovel in it;
  - the quench trough (a box with a blue slab) -> a planked trough on sills with iron bands, water, tongs laid across;
 rail bay
  - the cart (a tapered box, square wheels, a slab of ore) -> a mine cart: a planked tub with an iron rim, corner
    straps and bands, flanged wheels on the rails on axles, a push bar, heaped with copper and tin ore (name kept);
 exit chamber (east)
  - a crate stack with a stick pick, a barrel, a rope coil -> battened crates with a pick laid on the top one, a closed
    barrel, a coil of rope;
 the walls
  - 15 wall torches (a box plate, a stick, a cone flame) -> forged back plates, arms and cup rings with a brace, a tapered
    torch whose head is wrapped in pitch-soaked rag bound with cord, and a flame of crossed sheets with a bright core
    (Cavern_Torch and Cavern_TorchFlame, names kept, at the old sites measured from the old mesh). They hang on the rock
    walls the cutaway clips, and are clipped with them as before (the spec's cutawayParts leaves them out).
Kept as they were: the rail stub, the ladders, the timber sets, the rock.
Plan coordinates (x east, y up, z south; Blender (x, -z, y)), cavern-local (root Cavern_Root at the origin). Original designs.
Run through tools/rebuild_holm_props_pass.js cavern (spec docs/rebuild/holm-overhaul/props-pass/cavern.json)."""
import bpy, sys, math, random
from pathlib import Path
from mathutils import Vector
HERE = Path(__file__).resolve().parent; sys.path.insert(0, str(HERE)); ROOT = HERE.parents[1]
import holm_props_pass_kit as PK
from holm_props_pass_kit import C, Part
import holm_trade_props as T
import holm_props_quarry as Q
from holm_purposeful_props import arc, ellipsoid

SP = PK.spec()
PK.begin()
rng = random.Random(20060)
root = PK.obj('Cavern_Root')


def torch_sites():
    """the old torches' sites, measured from the old mesh: the plate (sunk in the rock) and the stick's two ends"""
    o = PK.obj('Cavern_Torch'); me = o.data; mw = o.matrix_world
    clusters = []
    for p in me.polygons:
        mn = me.materials[p.material_index].name if me.materials[p.material_index] else ''
        for vi in p.vertices:
            w = mw @ me.vertices[vi].co; q = (w.x, w.z, -w.y, mn)
            for c in clusters:
                if math.hypot(c['x'] - q[0], c['z'] - q[2]) < .9:
                    c['p'].append(q); break
            else:
                clusters.append({'x': q[0], 'z': q[2], 'p': [q]})
    sites = []
    for c in clusters:
        irn = [q for q in c['p'] if 'iron' in q[3]]; tim = [q for q in c['p'] if 'timber' in q[3]]
        y0 = min(q[1] for q in irn); plate = [q for q in irn if q[1] < y0 + .005]
        w = Vector((sum(q[0] for q in plate) / len(plate), sum(q[2] for q in plate) / len(plate)))
        t0, t1 = min(q[1] for q in tim), max(q[1] for q in tim)
        lo = [q for q in tim if q[1] < t0 + .01]; hi = [q for q in tim if q[1] > t1 - .01]
        b = Vector((sum(q[0] for q in lo) / len(lo), t0, sum(q[2] for q in lo) / len(lo)))
        t = Vector((sum(q[0] for q in hi) / len(hi), t1, sum(q[2] for q in hi) / len(hi)))
        inn = Vector(((b.x + t.x) / 2 - w.x, (b.z + t.z) / 2 - w.y)).normalized()
        sites.append((w, b, t, inn, y0))
    sites.sort(key=lambda s: (s[0].x, s[0].y))
    return sites


SITES = torch_sites()
assert len(SITES) == 15, len(SITES)
PK.REPORT['notes'].append({'torchSites': [[round(s[0].x, 3), round(s[0].y, 3)] for s in SITES]})

# ---- take away the old props (the furnace and anvil services, the cart and the torches are rebuilt under their names)
PK.remove('Cavern_Furnishing', 'Cavern_FurnishingCart', 'Cavern_Torch', 'Cavern_TorchFlame', 'Cavern_ServiceFurnace_Furnace', 'Cavern_ServiceAnvil_Anvil')

# ---- palette (sRGB as the game shows it; tex = the kit texture the faces take) ----
oak = C('cavern oak', '#6a4a2e', 'beam'); oak_l = C('cavern oak light', '#7a5836', 'beam'); oak_d = C('cavern frame oak', '#4a3422', 'beam')
endg = C('cavern end grain', '#8b6a45', 'beam'); ash = C('cavern ash haft', '#a07e54', 'beam'); ash_n = C('cavern new haft', '#cdb088')
iron = C('cavern iron', '#3a3b3a'); iron_w = C('cavern worn iron', '#6c7274'); steel = C('cavern steel', '#9aa0a2')
hemp = C('cavern hemp', '#a3895a'); cord = C('cavern cord', '#7a6440')
sackc = [C('cavern sack', '#b8a57c'), C('cavern sack dark', '#a08d64')]
copper = [C('cavern copper ore', '#b0653a', 'rock'), C('cavern copper ore dark', '#8e4e2c', 'rock'), C('cavern copper bed', '#7d5236', 'rock')]
tin = [C('cavern tin ore', '#b5b2a4', 'rock'), C('cavern tin ore dark', '#8f8d82', 'rock'), C('cavern tin bed', '#7b7a72', 'rock')]
mixed = [copper[0], tin[0], copper[1], tin[2]]
rubble = [C('cavern rubble', '#7d786e', 'rock'), copper[0], C('cavern rubble dark', '#5f5b54', 'rock'), copper[1], C('cavern rubble bed', '#6a665e', 'rock')]
coal = [C('cavern coal', '#2b2927'), C('cavern coal lit', '#3e3b37'), C('cavern coal bed', '#242220')]
water = C('cavern water', '#3f5a62')
staves = [C('cavern stave 1', '#7a5634', 'beam'), C('cavern stave 2', '#6a4a2d', 'beam'), C('cavern stave 3', '#84603c', 'beam')]
heads = [C('cavern head board 1', '#8d6a44', 'beam'), C('cavern head board 2', '#81603c', 'beam')]
crateb = [C('cavern crate 1', '#94764f', 'beam'), C('cavern crate 2', '#86683f', 'beam'), C('cavern crate 3', '#9e7f55', 'beam')]
batten = C('cavern crate batten', '#654a2e', 'beam'); chalk = C('cavern chalk', '#e8e4d6')
stone = C('cavern furnace stone', '#86827a', 'rock'); dressed = C('cavern dressed stone', '#b5aa90', 'rock'); stone_d = C('cavern furnace stone dark', '#6f6b64', 'rock')
soot = C('cavern soot', '#34312e'); clay = C('cavern crucible clay', '#8a5a3c')
glow = C('cavern coals glow', '#ff8a2c', emit=1.5); molten = C('cavern molten bronze', '#ffc45a', emit=1.8); hot = C('cavern hot bronze', '#ff7a2a', emit=1.3)
bronze = C('cavern bronze', '#a8783c'); leather = C('cavern leather', '#5e3d24'); leather_d = C('cavern leather fold', '#4b301c')
rag = C('cavern pitch rag', '#3a3028'); flame_o = C('cavern flame', '#ff9a30', emit=1.5); flame_i = C('cavern flame core', '#ffe08a', emit=1.8)
bark = C('cavern block bark', '#4f3a28', 'beam'); block_top = C('cavern block end grain', '#9a7a52', 'beam')


def vstroke(A, x, a, b, w, m):
    """a chalk stroke on an x-facing face at x: from a to b, points (z, y)"""
    dz, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dz, dy) or 1
    ez, ey = -dy / L * w / 2, dz / L * w / 2
    A.poly([(x, a[1] - ey, a[0] - ez), (x, b[1] - ey, b[0] - ez), (x, b[1] + ey, b[0] + ez), (x, a[1] + ey, a[0] + ez)], [(0, 1, 2, 3)], m)


def ore_crate(A, x0, x1, z0, z1, h, ore, y0=.004, n=10):
    """a slatted crate of broken ore, heaped"""
    T.crate(A, x0, x1, y0, h, z0, z1, crateb, batten, lid=False)
    Q.lumps(A, x0 + .04, x1 - .04, z0 + .04, z1 - .04, h - .02, h + .12, ore, rng, n=n, rmin=.045, rmax=.075)


def closed_barrel(A, x, z, r, h, rot=0.0):
    T.barrel(A, x, z, .004, r, h, staves, iron, heads, rot=rot, bung=oak_d)


# =========================================================== floor clutter: stores, crates, barrels, heaps
S = Part('Cavern_FurnishingPropsStores')


def ladder_stack(A):
    """supply crates by the shaft ladder, the smaller on the larger, a coil of spare rope on top"""
    T.crate(A, -7.95, -7.35, .004, .6, -.95, -.35, crateb, batten)
    T.crate(A, -7.9, -7.45, .61, 1.02, -.9, -.45, crateb, batten)
    Q.coil(A, -7.67, -.67, 1.034, .17, .075, hemp, end_a=2.2)


S.obj(ladder_stack)


def oil_cask(A):
    """a cask of lamp oil for the torches, a bundle of spare torches tied on its head"""
    closed_barrel(A, -7.55, 1.6, .3, .9, rot=.4)
    y = .885
    for k in range(3):
        dz = (k - 1) * .05
        a = Vector((-7.76, y + .025 + (.03 if k == 1 else 0), 1.52 + dz)); b = Vector((-7.34, y + .025 + (.03 if k == 1 else 0), 1.66 + dz))
        A.tube(tuple(a), tuple(b), .022, 6, oak_d, r2=.028)
        d = (b - a).normalized()
        A.tube(tuple(b - d * .02), tuple(b + d * .07), .04, 6, rag, r2=.036)


S.obj(oil_cask)
S.obj(T.sack, -7.0, 1.76, .004, .34, .5, sackc[0], cord, rot=.5, slump=.02)


def coal_crate(A):
    """an open crate heaped with coal for the furnace, a coal shovel in it"""
    T.crate(A, -1.95, -1.4, .004, .55, 1.1, 1.55, crateb, batten, lid=False)
    Q.lumps(A, -1.91, -1.44, 1.14, 1.51, .53, .66, coal, rng, n=11, rmin=.035, rmax=.06)
    Q.shovel(A, (-1.55, 1.02, 1.2), (-1.72, .56, 1.38), (1, 0, -1), ash, iron_w, w=.16, blade_l=.22)


S.obj(coal_crate)
S.obj(T.sack, -1.7, 1.79, .004, .36, .55, sackc[1], cord, rot=1.3, slump=-.02)
S.obj(ore_crate, -.95, -.35, -5.95, -5.4, .55, copper)
S.obj(ore_crate, -.95, -.4, -5.3, -4.8, .5, tin)


def ore_heap(A):
    """broken ore and rubble heaped by the pillar, waiting for the cart, a shovel stuck in it"""
    Q.heap(A, 4.235, -2.365, .006, .215, .2, rubble, rng, n=11, rot=.3)
    Q.shovel(A, (4.36, 1.0, -2.2), (4.2, .1, -2.42), (1, 0, 0), ash, iron_w)


S.obj(ore_heap)


def water_butt(A):
    """a water butt for the miners, a dipper hooked over the chime"""
    T.barrel(A, 5.9, -5.7, .004, .24, .7, staves, iron, heads, rot=.2, open_top=True, fill=water)
    A.lathe(5.96, -5.74, .6, [(.03, 0), (.045, .03), (.05, .045)], 8, oak_l, top=True, top_m=oak_d)
    A.tube((6.0, .64, -5.75), (6.11, .7, -5.76), .011, 5, oak_l)
    A.tube((6.11, .7, -5.76), (6.135, .66, -5.765), .011, 5, oak_l)


S.obj(water_butt)


def barrel_and_pick(A):
    """a closed barrel, a miner's pick leaning on it"""
    closed_barrel(A, 6.55, -5.6, .28, .85, rot=1.0)
    b, t = Vector((6.2, .006, -5.25)), Vector((6.34, .98, -5.5))
    d = (t - b).normalized(); side = Vector((d.z, 0, -d.x)).normalized()
    Q.pick(A, b, t, ash, iron, side)


S.obj(barrel_and_pick)


def quench_tub(A):
    """the quench tub by the anvil: a staved tub of water, tongs standing in it"""
    prof = [(.18, 0), (.2, .25), (.205, .55)]
    Q.staved(A, 4.35, 5.55, .004, prof, 10, staves)
    Q.hoops(A, 4.35, 5.55, .004, prof, (.15, .82), iron, 10)
    A.lathe(4.35, 5.55, .47, [(.2, 0)], 10, water, top=True)
    for s in (-1, 1):
        A.beam((4.33 + s * .02, .3, 5.54), (4.28 + s * .05, .86, 5.6), .016, .012, iron)
    A.tube((4.29, .78, 5.585), (4.29, .8, 5.62), .014, 6, iron)


S.obj(quench_tub)


def tool_stand(A):
    """the smith's tool stand by the west wall: two cheek boards, a rail with tongs hung by their jaws, a shelf with
    hammers and a punch (floor-standing, under 1.4 m, clear of the walk by the anvil)"""
    # two cheek boards reaching the old tongs board's edge (x 2.27): the walk keeps clear of the stand as it kept clear
    # of the board (no stance in the corner by the furnace, no link past the stand's north end); each with a capping strip
    for za, zb, xb in ((3.255, 3.285, 2.266), (4.44, 4.47, 2.272)):
        A.box(2.03, xb, .004, 1.3, za, zb, oak)
        A.box(2.025, xb + .006, 1.3, 1.33, za - .006, zb + .006, oak_d)
    A.box(2.1, 2.16, 1.18, 1.24, 3.285, 4.44, oak_l)                                       # the rail
    A.box(2.06, 2.21, .34, .38, 3.285, 4.44, oak)                                          # the shelf
    A.box(2.1, 2.16, .1, .14, 3.285, 4.44, oak_d)                                          # a foot rail
    for k, z in enumerate((3.45, 3.72, 3.98, 4.25)):
        Q.hung_tongs(A, 2.13, 1.21, z, 1 if k % 2 else -1, iron, reach=.52 + .04 * (k % 2), r=.042)
    T.hammer(A, 2.14, 3.4, .38, math.pi / 2, oak_d, iron)
    T.hammer(A, 2.12, 3.85, .38, math.pi / 2 + .1, oak_d, iron)
    A.tube((2.12, .395, 4.12), (2.12, .395, 4.32), .012, 6, iron_w, r2=.006)              # a punch


S.obj(tool_stand)


def nook_crates(A):
    """a lidded crate of copper, its tally chalked on it; an open crate of tin ore on top"""
    T.crate(A, 2.15, 2.8, .004, .55, 5.15, 5.8, crateb, batten)
    for k in range(4):
        vstroke(A, 2.793, (5.33 + k * .045, .225), (5.33 + k * .045, .325), .012, chalk)
    vstroke(A, 2.797, (5.31, .32), (5.5, .23), .012, chalk)
    ore_crate(A, 2.2, 2.75, 5.2, 5.75, .95, tin, y0=.564, n=9)


S.obj(nook_crates)


def coal_bin(A):
    """the furnace's coal bin: an open crate heaped with coal, a coal shovel in it"""
    T.crate(A, 7.1, 7.8, .004, .65, 5.1, 5.8, crateb, batten, lid=False)
    Q.lumps(A, 7.14, 7.76, 5.14, 5.76, .63, .77, coal, rng, n=13, rmin=.035, rmax=.065)
    Q.shovel(A, (7.62, 1.1, 5.25), (7.38, .7, 5.52), (1, 0, 1), ash, iron_w, w=.17, blade_l=.24)


S.obj(coal_bin)


def trough(A):
    """the quench trough by the east wall: planked sides and thick ends on two sills, iron bands, water, tongs across"""
    x0, x1, z0, z1 = 7.3, 7.9, 2.25, 3.75
    for z in (2.45, 3.55):
        A.box(x0 - .02, x1 + .02, .004, .08, z - .05, z + .05, oak_d)                         # sills
    for xa, xb in ((x0, x0 + .04), (x1 - .04, x1)):
        A.box(xa, xb, .08, .315, z0 + .05, z1 - .05, oak); A.box(xa, xb, .318, .55, z0 + .05, z1 - .05, oak_l)
    for za, zb in ((z0, z0 + .05), (z1 - .05, z1)):
        A.box(x0, x1, .08, .55, za, zb, oak_d)
    A.box(x0 + .04, x1 - .04, .08, .11, z0 + .05, z1 - .05, oak_d)
    A.poly([(x0 + .04, .46, z0 + .05), (x1 - .04, .46, z0 + .05), (x1 - .04, .46, z1 - .05), (x0 + .04, .46, z1 - .05)], [(0, 1, 2, 3)], water)
    for z in (2.42, 3.58):                                                                  # iron bands round the trough
        A.box(x0 - .012, x0, .1, .52, z - .025, z + .025, iron); A.box(x1, x1 + .012, .1, .52, z - .025, z + .025, iron)
    Q.tongs(A, 7.6, 3.05, .55, 0.0, iron)
    A.beam((7.4, .47, 2.6), (7.75, .47, 2.72), .03, .025, iron_w)                          # a bar cooling in the water


S.obj(trough)


def exit_crates(A):
    """in the exit chamber: battened crates, the smaller on the larger, a pick laid on top"""
    T.crate(A, 24.2, 25.0, .004, .7, 2.7, 3.5, crateb, batten)
    T.crate(A, 24.35, 24.95, .71, 1.25, 2.8, 3.4, crateb, batten)
    b, t = Vector((24.42, 1.28, 2.98)), Vector((24.86, 1.288, 3.15))
    d = (t - b).normalized()
    Q.pick(A, b, t, ash, iron, Vector((-d.z, 0, d.x)))


S.obj(exit_crates)
S.obj(closed_barrel, 26.0, 3.35, .28, .85, rot=.7)
S.obj(Q.coil, 27.2, -1.4, .004, .305, .12, hemp, end_a=-.6)
S.build(root)

# =========================================================== the bellows by the furnace
Bw = Part('Cavern_FurnishingPropsBellows')


def bellows(A):
    """great bellows on a trestle by the furnace: two teardrop boards (the lower fixed, the upper raised at its broad
    end), pleated leather between them, a nozzle block and an iron nozzle into the furnace's side, the lever at the back"""
    for x, z in ((6.5, 5.4), (6.9, 5.3), (6.5, 5.7), (6.9, 5.8)):
        T.oct_prism(A, x, z, .03, .03, .004, .28, oak_d)                                    # legs
    A.box(6.47, 6.93, .17, .21, 5.52, 5.58, oak_d)                                         # a stretcher
    zc = 5.55
    half = [(6.42, .1), (6.58, .22), (6.76, .32), (6.9, .31), (6.98, .21), (7.0, .08)]
    out = [(x, zc - w) for x, w in half] + [(x, zc + w) for x, w in half[::-1]]
    yb = .32
    yt = lambda x: .56 + (x - 6.42) / .58 * .26
    A.slab(out, .28, yb, oak)                                                              # the lower board
    A.poly([(x, .28, z) for x, z in out[::-1]], [tuple(range(len(out)))], oak)
    m = len(out)
    V_ = [(x, yt(x), z) for x, z in out] + [(x, yt(x) + .04, z) for x, z in out]
    A.poly(V_, [tuple(range(m))[::-1], tuple(range(m, 2 * m))] + [(i, (i + 1) % m, m + (i + 1) % m, m + i) for i in range(m)], oak_l)   # the upper board
    cx = sum(x for x, z in out) / m
    for i in range(m - 1):                                                                 # the leather, one pleat round
        (xa, za), (xb, zb) = out[i], out[i + 1]
        if xa < 6.43 and xb < 6.43:
            continue                                                                       # (the nozzle end is the block)
        def pushed(x, z):
            dx, dz = x - cx, z - zc; L = math.hypot(dx, dz) or 1
            return (x + dx / L * .035, z + dz / L * .035)
        pa, pb = pushed(xa, za), pushed(xb, zb)
        ma, mb = (yb + yt(xa)) / 2, (yb + yt(xb)) / 2
        A.poly([(xa, yb, za), (xb, yb, zb), (pb[0], mb, pb[1]), (pa[0], ma, pa[1])], [(0, 1, 2, 3)], leather)
        A.poly([(pa[0], ma, pa[1]), (pb[0], mb, pb[1]), (xb, yt(xb), zb), (xa, yt(xa), za)], [(0, 1, 2, 3)], leather_d)
    A.box(6.37, 6.43, yb, .56, zc - .1, zc + .1, oak_d)                                    # the nozzle block
    A.tube((6.4, .44, zc), (6.2, .47, zc), .035, 8, iron, r2=.022)                         # the nozzle into the furnace
    A.beam((6.96, .81, zc), (7.3, 1.2, zc), .045, .045, oak)                               # the lever
    A.tube((7.3, 1.21, zc - .1), (7.3, 1.21, zc + .1), .022, 6, oak_l)                      # its hand grip


Bw.obj(bellows)
Bw.build(root)

# =========================================================== the tool rack in the ore chamber
R = Part('Cavern_FurnishingPropsToolRack')


def tool_rack(A):
    """a floor-standing rack under the north wall: posts on feet with caps, a pegged backboard, two picks hung by their
    heads, a shovel hung by its grip, a pinch bar standing behind the timber set's post"""
    zc = -5.9
    for x in (1.24, 2.76):
        A.box(x - .05, x + .05, .004, .07, -5.98, -5.81, oak_d)
        T.oct_prism(A, x, zc, .035, .035, .07, 1.29, oak)
        A.lathe(x, zc, 1.29, [(.042, 0), (.03, .02), (.034, .035), (0, .06)], 8, oak_d)
    A.box(1.26, 2.74, .95, 1.25, -5.975, -5.94, oak_l)                                     # backboard
    A.box(1.26, 2.74, 1.25, 1.28, -5.98, -5.93, oak)
    A.box(1.26, 2.74, .12, .17, -5.96, -5.92, oak_d)                                       # a foot rail
    for xc in (1.55, 2.33):
        for dx in (-.11, .11):
            A.tube((xc + dx, 1.15, -5.94), (xc + dx, 1.158, -5.845), .012, 6, oak_d)
        Q.pick(A, (xc, .39, -5.87), (xc, 1.25, -5.87), ash, iron, (1, 0, 0))
    A.tube((2.645, 1.2, -5.94), (2.645, 1.21, -5.84), .012, 6, oak_d)                      # the shovel's peg
    Q.shovel(A, (2.645, 1.17, -5.87), (2.645, .32, -5.87), (1, 0, 0), ash, iron_w, w=.17)
    A.tube((1.94, .006, -5.9), (1.96, 1.18, -5.92), .016, 6, iron)                           # a pinch bar behind the set's post
    A.beam((1.94, .006, -5.9), (1.91, .03, -5.9), .03, .014, iron)


R.obj(tool_rack)
R.build(root)

# =========================================================== the mine cart on the rails (name kept)
Ct = Part('Cavern_FurnishingCart')


def cart(A):
    """a mine cart: a planked tub with an iron rim, corner straps and bands, flanged wheels on the rails on their axles,
    a push bar at the east end, heaped with copper and tin ore"""
    b0 = (-3.5, -2.7, 2.6, 3.4); b1 = (-3.6, -2.6, 2.5, 3.5); y0, y1 = .31, .88
    corner = lambda b, i, y: ((b[0], y, b[2]), (b[1], y, b[2]), (b[1], y, b[3]), (b[0], y, b[3]))[i]
    lerp = lambda f: tuple(b0[i] + (b1[i] - b0[i]) * f for i in range(4))
    planks = 3
    for k in range(planks):
        fa, fb = k / planks, (k + 1) / planks
        ya, yb = y0 + (y1 - y0) * fa, y0 + (y1 - y0) * fb
        ba, bb = lerp(fa), lerp(fb)
        for i in range(4):
            j = (i + 1) % 4
            A.poly([corner(ba, i, ya), corner(ba, j, ya), corner(bb, j, yb), corner(bb, i, yb)], [(0, 1, 2, 3)], crateb[(k + i) % 3])
    A.poly([corner(b0, i, y0) for i in range(4)][::-1], [(0, 1, 2, 3)], oak_d)                 # the bottom
    # the iron rim round the top, standing proud of the planks, and a band round the middle
    A.box(b1[0] - .015, b1[1] + .015, y1 - .05, y1 + .02, b1[2] - .015, b1[2] + .02, iron); A.box(b1[0] - .015, b1[1] + .015, y1 - .05, y1 + .02, b1[3] - .02, b1[3] + .015, iron)
    A.box(b1[0] - .015, b1[0] + .02, y1 - .05, y1 + .02, b1[2] + .02, b1[3] - .02, iron); A.box(b1[1] - .02, b1[1] + .015, y1 - .05, y1 + .02, b1[2] + .02, b1[3] - .02, iron)
    for i in range(4):                                                                       # corner straps
        p, q = Vector(corner(b0, i, y0)), Vector(corner(b1, i, y1 - .05))
        out = Vector((p.x - (b0[0] + b0[1]) / 2, 0, p.z - (b0[2] + b0[3]) / 2)).normalized() * .012
        A.beam(tuple(p + out), tuple(q + out), .06, .012, iron)
    # axles, axle boxes, flanged wheels over the rails
    wy = .264
    for x in (-3.33, -2.87):
        A.tube((x, wy, 2.53), (x, wy, 3.47), .025, 6, iron)
        for z in (2.7, 3.3):
            A.box(x - .07, x + .07, wy + .02, y0 + .03, z - .05, z + .05, oak_d)
        for zr, inner in ((2.62, 1), (3.38, -1)):
            A.tube((x, wy, zr - .025), (x, wy, zr + .025), .15, 10, iron_w)
            A.tube((x, wy, zr + inner * .025), (x, wy, zr + inner * .04), .17, 10, iron)       # the flange, inside the rail
            A.tube((x, wy, zr - inner * .025), (x, wy, zr - inner * .045), .045, 6, iron)      # the hub
    # the push bar at the east end, a coupling hook at the west
    for z in (2.82, 3.18):
        A.beam((-2.6, .72, z), (-2.2, .7, z), .03, .03, iron)
    A.tube((-2.18, .7, 2.76), (-2.18, .7, 3.24), .022, 6, oak_l)
    A.beam((-3.6, .5, 3.0), (-3.66, .5, 3.0), .04, .04, iron)
    Q.lumps(A, -3.56, -2.64, 2.55, 3.45, y1 - .02, y1 + .2, mixed + [copper[2]], rng, n=14, rmin=.065, rmax=.1)


Ct.obj(cart)
Ct.build(root)

# =========================================================== the wall torches (Cavern_Torch / Cavern_TorchFlame, names kept)
Tb = Part('Cavern_Torch'); Tf = Part('Cavern_TorchFlame')


def obox(A, c, u, v, n, hu, hv, hn, m):
    """a box about c with half extents along the unit axes u, v, n"""
    P = [c + u * a * hu + v * b * hv + n * d * hn for d in (-1, 1) for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    A.poly([tuple(p) for p in P], [(3, 2, 1, 0), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)], m)


for w, b, t, inn, y0 in SITES:
    Y = y0 + .25                                                                           # the old torch's working height
    n = Vector((inn.x, 0, inn.y)); u = Vector((-inn.y, 0, inn.x)); up = Vector((0, 1, 0))
    W = Vector((w.x, Y, w.y)); tip = Vector((t.x + b.x, 0, t.z + b.z)) / 2; tip.y = Y

    def torch(A, W=W, n=n, u=u, b=b, t=t, tip=tip, Y=Y):
        """a forged back plate with two nails, an arm and a cup ring, a brace under it, the tapered torch, its head wrapped
        in pitch-soaked rag bound with cord"""
        obox(A, W + n * .005, u, up, n, .075, .15, .02, iron)
        for dy in (-.1, .1):
            obox(A, W + n * .03 + up * dy, u, up, n, .018, .018, .008, iron_w)
        A.beam(tuple(W + n * .02), tuple(tip + up * .0), .04, .04, iron)
        Q.ring(A, tuple(tip + up * .02), (0, 1, 0), .052, .022, iron, segs=6)
        A.beam(tuple(W + n * .05 - up * .19), tuple(tip - n * .03 + up * .0), .03, .03, iron)
        d = (t - b).normalized()
        A.tube(tuple(b), tuple(t - d * .02), .028, 6, oak_d, r2=.036)
        A.tube(tuple(t - d * .03), tuple(t + d * .09), .05, 6, rag, r2=.044)
        for k in (0, 1):
            c0 = t + d * (.0 + k * .05)
            A.tube(tuple(c0), tuple(c0 + d * .014), .055 - k * .003, 6, cord, caps=False)

    Tb.obj(torch)

    def flame(A, t=t, b=b, u=u, n=n):
        """a flame of crossed sheets, a brighter core turned between them"""
        d = (t - b).normalized(); base = t + d * .08
        for k, (w_, h_, m, a0) in enumerate(((.07, .3, flame_o, 0.0), (.04, .19, flame_i, math.pi / 4))):
            for a in (a0, a0 + math.pi / 2):
                s = u * math.cos(a) + n * math.sin(a)
                A.poly([tuple(base - s * w_ * .6), tuple(base + s * w_ * .6), tuple(base + s * w_ + up * h_ * .35), tuple(base + up * h_), tuple(base - s * w_ + up * h_ * .35)],
                       [(0, 1, 2, 3, 4)], m)

    Tf.obj(flame)
Tb.build(root); Tf.build(root)

# =========================================================== the furnace (service 'Use Furnace', name and box kept)
FX, ZF, ZB = 5.5, 5.2, 6.55
Fu = Part('Cavern_ServiceFurnace_Furnace')


def furnace(A):
    """the smelting furnace: a dressed plinth, the body in courses with quoins at its front corners, an arched mouth of
    voussoirs over the glowing chamber (a crucible of bronze in the coals), an iron door swung open, iron bands, the
    tapering hood and the flue stack into the rock with its collars; the hearth apron with an ingot mould and a cast bar,
    a long ladle"""
    x0, x1 = FX - .8, FX + .8
    # (the blocks overlap a centimetre where they meet, so no two faces lie on one another)
    # (and end at staggered depths in the rock behind)
    A.box(x0 - .1, x1 + .1, .004, .3, ZF - .1, ZB, dressed)                                # plinth
    A.box(x0, FX - .3, .29, 1.4, ZF, ZB - .01, stone); A.box(FX + .3, x1, .29, 1.4, ZF, ZB - .01, stone)  # cheeks
    A.box(FX - .31, FX + .31, 1.1, 1.39, ZF + .006, ZB - .02, stone)                       # over the mouth
    A.box(FX - .305, FX + .305, .29, 1.11, ZF + .55, ZB - .03, stone_d)                    # the chamber's back
    for k, (ya, yb) in enumerate(((.3, .56), (.56, .82), (.82, 1.08), (1.08, 1.34))):       # quoins at the front corners
        wq = .22 if k % 2 == 0 else .15
        A.box(x0 - .012, x0 + wq, ya + .004, yb - .004, ZF - .012, ZF + .16, dressed)
        A.box(x1 - wq, x1 + .012, ya + .004, yb - .004, ZF - .012, ZF + .16, dressed)
    # the arch: five voussoirs round the mouth's head, springing at 0.8
    ac, ri, ro = .8, .3, .44
    for i in range(5):
        a0, a1 = math.pi - i * math.pi / 5, math.pi - (i + 1) * math.pi / 5
        pts = [(FX + ri * math.cos(a0), ac + ri * math.sin(a0)), (FX + ri * math.cos(a1), ac + ri * math.sin(a1)),
               (FX + ro * math.cos(a1), ac + ro * math.sin(a1)), (FX + ro * math.cos(a0), ac + ro * math.sin(a0))]
        V_ = [(x, y, ZF - .025) for x, y in pts] + [(x, y, ZF + .06) for x, y in pts]
        A.poly(V_, [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], dressed)
    A.box(FX - .42, FX + .42, .296, .36, ZF - .18, ZF + .03, dressed)                        # mouth sill
    # the chamber: a glowing bed, glow on its back wall, coals, a crucible of bronze
    A.box(FX - .31, FX + .31, .29, .38, ZF + .02, ZF + .56, glow, skip='b')
    A.poly([(FX - .28, .4, ZF + .545), (FX + .28, .4, ZF + .545), (FX + .28, 1.0, ZF + .545), (FX - .28, 1.0, ZF + .545)], [(0, 1, 2, 3)], glow)
    Q.lumps(A, FX - .27, FX + .27, ZF + .06, ZF + .5, .384, .45, [coal[0], coal[1], glow], rng, n=7, rmin=.025, rmax=.045)
    A.lathe(FX + .02, ZF + .3, .39, [(.07, 0), (.1, .06), (.11, .15), (.1, .18)], 8, clay, top=True, top_m=molten)
    # the iron door swung open against the east cheek, its hinge straps
    A.box(FX + .31, FX + .58, .4, .98, ZF - .05, ZF - .03, iron)
    for y in (.5, .88):
        A.box(FX + .29, FX + .5, y - .02, y + .02, ZF - .06, ZF - .05, iron_w)
    # iron bands round the body's head and the hood's neck
    for (ya, xa, xb, za) in ((1.34, x0, x1, ZF), (2.46, FX - .44, FX + .44, ZF + .275)):
        A.box(xa - .02, xb + .02, ya, ya + .07, za - .02, za + .012, iron)
        A.box(xa - .02, xa + .012, ya, ya + .07, za + .012, ZB - .05, iron); A.box(xb - .012, xb + .02, ya, ya + .07, za + .012, ZB - .05, iron)
    # the hood tapering to the stack
    a_ = (x0, x1, ZF, ZB); b_ = (FX - .42, FX + .42, ZF + .3, ZB - .05); ya, yb = 1.4, 2.55
    A.poly([(a_[0], ya, a_[2]), (a_[1], ya, a_[2]), (b_[1], yb, b_[2]), (b_[0], yb, b_[2])], [(0, 1, 2, 3)], stone)
    A.poly([(a_[0], ya, a_[3]), (a_[0], ya, a_[2]), (b_[0], yb, b_[2]), (b_[0], yb, b_[3])], [(0, 1, 2, 3)], stone)
    A.poly([(a_[1], ya, a_[2]), (a_[1], ya, a_[3]), (b_[1], yb, b_[3]), (b_[1], yb, b_[2])], [(0, 1, 2, 3)], stone)
    A.box(FX - .36, FX + .36, 2.55, 4.53, ZF + .36, ZB - .1, stone)                          # the flue stack
    for y in (3.0, 3.45):
        A.box(FX - .38, FX + .38, y, y + .05, ZF + .34, ZB - .08, dressed)                  # its collars
    o_ = [(FX - .42, ZF + .3), (FX + .42, ZF + .3), (FX + .42, ZB - .05), (FX - .42, ZB - .05)]; i_ = [(FX - .36, ZF + .36), (FX + .36, ZF + .36), (FX + .36, ZB - .1), (FX - .36, ZB - .1)]
    for k in range(4):                                                                     # the hood's top closing round the stack
        j = (k + 1) % 4
        A.poly([(o_[k][0], 2.55, o_[k][1]), (o_[j][0], 2.55, o_[j][1]), (i_[j][0], 2.55, i_[j][1]), (i_[k][0], 2.55, i_[k][1])], [(0, 1, 2, 3)], soot)
    # the hearth apron, the ingot mould with a cast bar, the long ladle
    A.box(FX - .5, FX + .5, .004, .12, ZF - .45, ZF - .09, dressed)
    mx0, mx1, mz0, mz1 = FX + .24, FX + .46, ZF - .41, ZF - .17                             # the ingot mould on the apron
    A.box(mx0, mx1, .12, .17, mz0, mz1, iron)
    A.box(mx0 + .03, mx1 - .03, .174, .19, mz0 + .025, mz0 + .1, bronze)                   # a cast bar in its first hollow
    A.poly([(mx0 + .03, .175, mz0 + .14), (mx1 - .03, .175, mz0 + .14), (mx1 - .03, .175, mz1 - .025), (mx0 + .03, .175, mz1 - .025)], [(0, 1, 2, 3)], soot)
    A.lathe(FX + .92, ZF + .12, .004, [(.02, 0), (.055, .03), (.06, .05)], 8, iron, top=True, top_m=soot)   # the ladle's bowl
    A.tube((FX + .9, .05, ZF + .12), (FX + .86, 1.0, ZF + .16), .014, 6, iron)             # its handle, against the cheek
    A.tube((FX + .86, .94, ZF + .158), (FX + .855, 1.06, ZF + .163), .022, 6, oak_d)


Fu.obj(furnace)
Fu.build(root)

# =========================================================== the anvil (service 'Use Anvil', name and box kept)
An = Part('Cavern_ServiceAnvil_Anvil')
AX, AZ = 3.5, 4.6


def anvil_block(A):
    """a horned anvil on an iron-banded oak block, a hammer and a glowing bronze bar on its face"""
    A.lathe(AX, AZ, .004, [(.34, 0), (.32, .1), (.305, .35), (.3, .52)], 8, bark, top=True, top_m=block_top, rot=.2)
    for y, r in ((.14, .331), (.4, .317)):                                                  # iron bands, 12 mm proud of the block
        A.lathe(AX, AZ, y, [(r, 0), (r, .05)], 8, iron, top=False, rot=.2)
    Q.anvil(A, AX, AZ, .52, 0.0, iron, iron_w, coal[0], s=1.15)
    yf = .52 + .3 * 1.15
    T.hammer(A, AX + .05, AZ + .1, yf, math.pi + .25, oak_d, iron)
    A.beam((AX - .18, yf + .012, AZ - .06), (AX + .02, yf + .012, AZ - .03), .025, .025, bronze)
    A.beam((AX + .02, yf + .012, AZ - .03), (AX + .1, yf + .012, AZ - .02), .025, .025, hot)


An.obj(anvil_block)
An.build(root)

# ---- early warning: does any new part reach into a stance or a link of the graph the island uses now? ----
nav = ROOT / '.studio-workspaces' / SP['referenceGraph'] / 'candidates' / 'navigation.json'
near = PK.clearance(nav, ['Cavern_FurnishingPropsStores', 'Cavern_FurnishingPropsBellows', 'Cavern_FurnishingPropsToolRack', 'Cavern_FurnishingCart',
                          'Cavern_Torch', 'Cavern_TorchFlame', 'Cavern_ServiceFurnace_Furnace', 'Cavern_ServiceAnvil_Anvil'])
print('[PROPS_PASS_CLEARANCE]', near)
PK.REPORT['notes'].append({'clearance': near})
PK.save(SP, ROOT)
