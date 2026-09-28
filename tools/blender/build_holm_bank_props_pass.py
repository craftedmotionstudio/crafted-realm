"""Holm Bank props pass (owner, 2026-09-28: "props ... blocky -> redo in Blender purposefully"; "every object in every
building reviewed in Blender"). The bank keeps the island's coin: its things are a banker's things - ledgers, scales,
coin and the iron that guards it.

From the model the island loads (holm-bank-glazed-review4-v1/bank.blend, Blender 5.1). Every prop object of the bank was
boxes (the m44 build's stools, desk, posts, the v2 interior's strongroom stubs); each is designed again in its old
footprint and at its old height, so the same tiles stay blocked and every stance, link and target of the graph is
unchanged. The four services are rebuilt under their old names (the island finds them by prefix):
 counting hall
  - Bank_ServiceCounter_Booths ('Use bank counter'): a panelled oak counter (plinth, framed and fielded front, a
    moulded two-layer top), three booths on chamfered posts under a corniced frieze with brass numeral plates I II III,
    brass grilles with a middle rail and an arched wicket in each window, a baize pad and a coin dish before each
    wicket, the counter bell; on the tellers' side the till drawers, the day ledger open, a balance, coin stacks and a
    purse; panelled booth partitions behind. (Before: slabs, hairline bars, flat pads.)
  - Bank_ServiceVault_Gate ('Open vault'), the barred gate in the vault doorway: iron stiles and three rails, square bars,
    a diagonal brace, strap hinges on pins, a brass box lock with keyhole and drop ring, the bank's brass coin boss.
  - Bank_ServiceVault_Chests: four iron-bound treasure chests with domed lids (plinth, board joints, bands over the lid
    and down the faces, corner irons, brass lock plates, hasps, drop handles); the east one stands open, its lid up,
    lined in red, heaped with gold, coins spilled before it. The west chest is drawn clear of the vault rack (the old
    box ran through it).
  - Bank_ServiceShelves_Goods ('Browse goods', the little shop): two open shop dressers (sides, back, cornice, apron,
    four shelves) of odds and ends - sacks and a crate, candle bundles and tinderboxes, bolts of cloth, lidded jars and
    a jug; a small cask and a bucket, a coil of rope and a horn lantern, bowls and plates, tankards and purses; over
    them the banker's sign, three gold coins on a green board.
  - the queue: four brass stanchions (weighted bases, ball finials) with crimson ropes sagging between (two lanes to
    the windows; the ropes keep the links between the lanes blocked);
  - the counter flap at the east end (a panelled half-door, the lifting leaf on strap hinges), a lantern on it: the
    two hanging lanterns hung above the capsule and the cutaway always clipped them, so the hall's light now stands
    where it is seen - on the flap and on the cask by the door;
  - the waiting bench under the south window becomes a settle (arms, a panelled back, a green cushion);
  - the barrel in the south-east corner: a cask with the door lantern on its head, drawn clear of the chamfered wall
    (the old one ran into it);
 behind the counter (the tellers)
  - three tall teller stools with footrings; the ledger desk (turned legs, apron, drawer, baize writing top) with the
    great ledger, a reckoning cloth ruled in columns with counters on it, coin stacks, a purse, ink and quill, a
    candlestick; the tellers' iron strongbox;
 the vault
  - the vault rack (the old coin-sack shelves): an oak rack on iron sole plates, three shelves - two strongboxes
    below, sealed coin sacks with tally tags, stacked gold and silver ingots and the vault register, brass-bound
    caskets, paper coin rolls and standing ledgers;
 the clerks' wing (ground)
  - the chest by the stair: the clerks' muniment chest, ledgers stacked on it, a candlestick; the bench by the
    partition with a clerk's satchel; the notice board (hung on the partition, so the cutaway clipped it) now stands
    on its own posts and feet under a little hood, bills pinned to it, one sealed;
  - the strongroom under the stair: an iron-banded coffer with a domed strongbox on it, four coin sacks sealed and
    tagged, a cask with the strongroom lantern, an open crate of old ledgers standing on end;
 the clerk's room (upper floor, 3.0)
  - the clerk's desk (turned legs, drawer, baize top) with the day-book open toward the clerk, ink and quill, a
    candlestick, coin scales, coin stacks, a sealed letter; the clerk's ladder-back chair behind it facing the
    customer; the ledger bookcase (cornice, four shelves of ledgers and books, the tall ledgers labelled, a bundle of
    scrolls on top);
  - the fireplace (the old stone box): dressed stone jambs and lintel, an oak mantel shelf with a candlestick, the
    bank's seal and its wax, the sooty firebox with an iron fire basket, two logs burning on embers, fire irons
    leaning on the jamb, the hearthstone;
  - the hanging lamp (above the capsule, where it blocked the link past the hearth) becomes a floor candle stand on
    three feet between the hearth and the chests, standing on that link;
  - the document chest with two deeds rolled on it; the strongbox (which ran into the chest and both walls) becomes
    the clerk's iron-bound cash coffer in the corner, day-books on it; the box at the south end becomes a crate of
    old deeds, rolled and ribboned.
Plan coordinates (x east, y up, z south; Blender (x, -z, y)), bank-local (Bank_Root is the identity). Original designs.
Run through tools/rebuild_holm_props_pass.js bank (spec docs/rebuild/holm-overhaul/props-pass/bank.json)."""
import bpy, sys, math, random
from pathlib import Path
HERE = Path(__file__).resolve().parent; sys.path.insert(0, str(HERE)); ROOT = HERE.parents[1]
import holm_props_pass_kit as PK
from holm_props_pass_kit import C, Part
import holm_trade_props as T
import holm_purposeful_props as PP
from holm_purposeful_props import arc, ellipsoid, _rot

SP = PK.spec()
PK.begin()
rng = random.Random(57860)
root = PK.obj('Bank_Root')
PK.remove('Bank_Furnishing', 'Bank_FurnishingStrongroom', 'Bank_UpperFurnishing', 'Bank_UpperFurnishingStrongbox',
          'Bank_ServiceCounter_Booths', 'Bank_ServiceVault_Gate', 'Bank_ServiceVault_Chests', 'Bank_ServiceShelves_Goods')

# ---- palette (sRGB as the game shows it; tex = the kit texture the faces take) ----
oak = C('bank oak', '#6e4b2e', 'beam'); oak_l = C('bank oak light', '#7f5a37', 'beam'); oak_d = C('bank oak dark', '#4d3421', 'beam')
panel = C('bank panel oak', '#5e3f27', 'beam'); board = C('bank notice board', '#9a7a52', 'beam')
iron = C('bank iron', '#3a3b3a'); iron_d = C('bank iron dark', '#2b2c2c')
brass = C('bank brass', '#b39146'); brass_d = C('bank brass dark', '#8e7236')
gold = C('bank gold', '#d2a73c'); gold_l = C('bank gold bright', '#e6c35c'); silver = C('bank silver', '#b7bbbb'); silver_l = C('bank silver bright', '#d0d3d2')
copper = C('bank copper', '#a8603a')
baize = C('bank baize', '#3d6b4f'); rope_red = C('bank rope crimson', '#7c2a2a'); lining = C('bank lid lining', '#7a2626')
paper_o = C('bank old parchment', '#c9ae78'); paper = C('bank parchment', '#d9c89a'); paper_l = C('bank parchment pale', '#e6dab4'); ink = C('bank ink', '#1f1c1a'); seal = C('bank seal wax', '#8a2a22')
leather = C('bank leather', '#5a3a22'); strap = C('bank strap', '#4a2e1b')
books = [C('bank ledger red', '#6b2a22'), C('bank ledger blue', '#2f4d6b'), C('bank ledger green', '#3f5e37'), C('bank ledger tan', '#8a6a44'),
         C('bank ledger brown', '#5a3a22'), C('bank ledger black', '#2e2a26')]
sackc = [C('bank coin sack', '#bba878'), C('bank coin sack dark', '#a8946a')]; twine = C('bank twine', '#7a6440')
staves = [C('bank stave 1', '#7b5635', 'beam'), C('bank stave 2', '#6c4a2e', 'beam'), C('bank stave 3', '#85603b', 'beam')]
heads = [C('bank head board 1', '#8d6a44', 'beam'), C('bank head board 2', '#81603c', 'beam')]
crateb = [C('bank crate 1', '#9a7a52', 'beam'), C('bank crate 2', '#8a6b46', 'beam'), C('bank crate 3', '#a4845a', 'beam')]
batten = C('bank crate batten', '#6a4c2f', 'beam')
wax = C('bank candle wax', '#efe6c8'); flame = C('bank candle flame', '#ffc15a', emit=1.5); glow = C('bank lantern glow', '#ffd27a', emit=1.2)
horn = C('bank lantern horn', '#d9c48a')
stone = C('bank hearth stone', '#a39d90', 'rock'); stone_d = C('bank hearth stone dark', '#8a8478', 'rock'); soot = C('bank soot', '#2a2522')
bark = C('bank log bark', '#5a4431', 'beam'); logend = C('bank log end', '#b08a5c'); ember = C('bank embers', '#d8642a', emit=1.2)
feather = C('bank quill', '#e6e0d0')
clay = C('bank clay', '#9a5a36'); clay_d = C('bank clay dark', '#7a4428'); glaze = C('bank glaze band', '#d8c8a0'); clay_in = C('bank clay inside', '#3a2a20')
bolts = [C('bank bolt red', '#8a3a2e'), C('bank bolt blue', '#3f5a86'), C('bank bolt cream', '#ddd0aa'), C('bank bolt green', '#4e6e3a')]
pewter = C('bank pewter', '#8d918f'); pewter_d = C('bank pewter band', '#6d716f'); rope = C('bank rope', '#a08a5a')
sign_field = C('bank sign green', '#2f4d3a'); cushion = C('bank cushion', '#3a6246'); reck = C('bank reckoning cloth', '#5c7a4a')


# ======================================================= local helpers
def frame(front, cx, cz):
    """P(a, y, b) -> plan point: a along the long side, b toward the front ('s' 'n' 'e' 'w')."""
    if front == 's':
        return lambda a, y, b: (cx + a, y, cz + b)
    if front == 'n':
        return lambda a, y, b: (cx - a, y, cz - b)
    if front == 'e':
        return lambda a, y, b: (cx + b, y, cz - a)
    return lambda a, y, b: (cx - b, y, cz + a)


def lbox(A, P, a0, a1, y0, y1, b0, b1, m, skip=''):
    """A box in a local frame; skip: b t (y0 y1), k f (b0 b1), l r (a0 a1)."""
    V = [P(a0, y0, b0), P(a1, y0, b0), P(a1, y1, b0), P(a0, y1, b0), P(a0, y0, b1), P(a1, y0, b1), P(a1, y1, b1), P(a0, y1, b1)]
    F = {'b': (0, 1, 5, 4), 't': (3, 7, 6, 2), 'k': (0, 3, 2, 1), 'f': (4, 5, 6, 7), 'l': (0, 4, 7, 3), 'r': (1, 2, 6, 5)}
    A.poly(V, [F[k] for k in 'btkflr' if k not in skip], m)


def lstrap(A, P, pts, w, d, m):
    """A strap (beams) through local points."""
    q = [P(*p) for p in pts]
    for p0, p1 in zip(q, q[1:]):
        A.beam(p0, p1, w, d, m)


def sag_rope(A, a, b, drop, r, m, n=6):
    """A rope hung between two points, sagging `drop` at the middle."""
    P = [(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n - drop * 4 * (i / n) * (1 - i / n), a[2] + (b[2] - a[2]) * i / n) for i in range(n + 1)]
    for p, q in zip(P, P[1:]):
        A.tube(p, q, r, 6, m)


def coin(A, x, z, y, r=.022, m=None):
    A.lathe(x, z, y, [(r, 0), (r, .005)], 8, m or gold, top=True)


def coin_sack(A, x, z, y, w, h, k, rot=0.0):
    """A coin sack: tied at the neck, the bank's red seal hung on the cord, a paper tally tag."""
    sl = .015 * (1 - 2 * (k % 2))
    T.sack(A, x, z, y, w, h, sackc[k % 2], twine, rot=rot, slump=sl)
    tx = x + sl * (.88 ** 2)
    r = w * .23
    A.box(tx + r - .004, tx + r + .012, y + h * .7, y + h * .79, z - .018, z + .018, seal)
    A.tube((tx - r * .7, y + h * .85, z + r * .7), (tx - r * .7 - .03, y + h * .66, z + r * .7 + .03), .004, 4, twine)
    A.box(tx - r * .7 - .06, tx - r * .7 - .01, y + h * .56, y + h * .65, z + r * .7 + .036, z + r * .7 + .044, paper)


def ingot(A, cx, cz, y, along_x, m, top_m, l=.12, w=.055, hgt=.035):
    """A cast bar: a tapered block, its top face brighter."""
    bx, bz = (l / 2, w / 2) if along_x else (w / 2, l / 2)
    t = .012
    tx, tz = bx - t, bz - t
    V = [(cx - bx, y, cz - bz), (cx + bx, y, cz - bz), (cx + bx, y, cz + bz), (cx - bx, y, cz + bz),
         (cx - tx, y + hgt, cz - tz), (cx + tx, y + hgt, cz - tz), (cx + tx, y + hgt, cz + tz), (cx - tx, y + hgt, cz + tz)]
    A.poly(V, [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)], m)
    A.poly(V, [(4, 5, 6, 7)], top_m)


def ingot_stack(A, x, z, y, m, top_m, layers=3):
    """Bars stacked crosswise: three, two across, one."""
    hg, L, W = .045, .16, .07
    for dz in (-.075, 0, .075):
        ingot(A, x, z + dz, y, True, m, top_m, L, W, hg)
    if layers > 1:
        for dx in (-.045, .045):
            ingot(A, x + dx, z, y + hg, False, m, top_m, L, W, hg)
    if layers > 2:
        ingot(A, x, z, y + 2 * hg, True, m, top_m, L, W, hg)


def coin_roll(A, x, z, y, along_x=True):
    """Coins rolled in paper, the ends showing gold."""
    if along_x:
        A.tube((x - .06, y + .02, z), (x + .06, y + .02, z), .018, 8, paper, caps=True, cap_m=gold)
    else:
        A.tube((x, y + .02, z - .06), (x, y + .02, z + .06), .018, 8, paper, caps=True, cap_m=gold)


def casket(A, x0, x1, z0, z1, y, h):
    """A small brass-bound casket: oak body, a lid 1 cm proud, brass corner straps and a hasp."""
    A.box(x0 + .008, x1 - .008, y, y + h * .72, z0 + .008, z1 - .008, oak_l)
    A.box(x0, x1, y + h * .72, y + h, z0, z1, oak_d)
    for zz in (z0 + .025, z1 - .025):                                   # brass bands over the lid, front to back
        A.box(x0 - .004, x1 + .004, y, y + h + .005, zz - .01, zz + .01, brass, skip='b')
    zc = (z0 + z1) / 2
    A.box(x1 - .008, x1 + .006, y + h * .35, y + h * .82, zc - .02, zc + .02, brass, skip='w')   # the hasp (east, to the vault)


def stanchion(A, x, z, h):
    """A queue stanchion: a weighted round base, a turned column, a hook ring, a ball finial."""
    A.lathe(x, z, 0, [(.09, 0), (.09, .014), (.078, .026), (.034, .048), (.024, .07)], 10, brass_d, top=False)
    A.lathe(x, z, .07, [(.024, 0), (.019, .1), (.017, h - .2), (.03, h - .18), (.03, h - .16), (.02, h - .14)], 8, brass, top=False)
    A.lathe(x, z, h - .14, [(.02, 0), (.022, .03), (.038, .05), (.048, .08), (.044, .11), (.026, .135), (0, .14)], 8, brass)


def open_lathe_ring(A, x, y, z, r0, r1, half, m, n=8):
    from mathutils import Vector
    T.rim_ring(A, Vector((x, y, z)), Vector((0, 1, 0)), Vector((1, 0, 0)), Vector((0, 0, 1)), r0, r1, half, n, m)


def tall_stool(A, x, z, seat, r, rot=0.0):
    """A teller's tall stool: a round seat, three splayed legs, an iron foot ring."""
    T.stool(A, x, z, seat, r, oak_l, oak_d, rot=rot)
    yr = .24
    t = yr / (seat - .045)
    rr = (r + .05) + (r * .55 - (r + .05)) * t
    open_lathe_ring(A, x, yr, z, rr - .025, rr + .004, .01, iron)


def scroll(A, a, b, r, m, ribbon, rod=None):
    """a rolled deed, a ribbon tied round it (8 mm proud: the library ribbon sits too close to the roll)"""
    from mathutils import Vector
    T.scroll(A, a, b, r, m, rod=rod)
    a, b = Vector(a), Vector(b)
    d = (b - a).normalized(); c = (a + b) / 2
    A.tube(tuple(c - d * .014), tuple(c + d * .014), r + .008, 8, ribbon, caps=False)


def lantern_obj(A, x, z, y, h=.28, lit=True):
    T.lantern(A, x, z, y, iron, glow if lit else horn, h=h)


# ======================================================= the counter and its booths (service: Bank_ServiceCounter_Booths)
CX0, CX1, CZF, CZB = -1.325, 2.45, -.85, -1.4
POSTS = [CX0 + .06, 0.0, 1.25, CX1 - .06]
TOP = 1.05


def counter_body(A):
    """the panelled counter: plinth, carcass, framed front with fielded panels, a two-layer moulded top"""
    A.box(CX0 + .03, CX1 - .03, 0, .1, CZB + .04, CZF - .03, oak_d)
    A.box(CX0 + .01, CX1 - .01, .1, .95, CZB + .02, CZF - .02, oak)
    A.box(CX0 + .015, CX1 - .015, .1, .18, CZF - .02, CZF, oak_d, skip='n')                          # bottom rail
    A.box(CX0 + .015, CX1 - .015, .86, .95, CZF - .02, CZF, oak_d, skip='n')                         # top rail
    xs = [CX0 + .06 + i * (CX1 - CX0 - .12) / 6 for i in range(7)]
    for x in xs:
        A.box(x - .04, x + .04, .18, .86, CZF - .02, CZF, oak_d, skip='n')                          # stiles
    for a, b in zip(xs, xs[1:]):
        A.box(a + .07, b - .07, .25, .79, CZF - .02, CZF - .008, panel, skip='n')                   # fielded panels
        A.box(a + .12, b - .12, .3, .74, CZF - .008, CZF - .002, panel, skip='n')                   # the raised field
    A.box(CX0 - .03, CX1 + .02, .95, 1.0, CZB - .04, CZF + .05, oak_d)                             # top, lower layer
    A.box(CX0 - .02, CX1 + .01, 1.0, TOP, CZB - .03, CZF + .04, oak_l)                             # top, upper layer
    # the tellers' side: till drawers with brass pulls
    for ba, bb in ((CX0 + .06, -.06), (.06, 1.19), (1.31, CX1 - .06)):
        for a, b in ((ba, (ba + bb) / 2 - .01), ((ba + bb) / 2 + .01, bb)):
            A.box(a, b, .72, .9, CZB + .005, CZB + .02, oak_l, skip='s')
            A.tube(((a + b) / 2, .81, CZB + .005), ((a + b) / 2, .81, CZB - .018), .014, 6, brass)


def booths(A):
    """three booths: chamfered posts on the counter, a corniced frieze with numeral plates, brass grilles each with a
    middle rail and an arched wicket, a baize pad and a coin dish before each wicket"""
    zc = -1.12
    for px in POSTS:
        A.box(px - .06, px + .06, TOP, TOP + .06, zc - .06, zc + .06, oak_d)
        T.oct_prism(A, px, zc, .045, .045, TOP + .06, 2.16, oak)
        A.box(px - .06, px + .06, 2.16, 2.22, zc - .06, zc + .06, oak_d)
    A.box(CX0 + .005, CX1, 2.22, 2.44, zc - .08, zc + .08, oak)                                     # frieze
    A.box(CX0 - .015, CX1 + .02, 2.44, 2.5, zc - .13, zc + .13, oak_d)                             # cornice
    A.box(CX0 - .005, CX1 + .01, 2.5, 2.53, zc - .12, zc + .12, oak)
    for k, (a, b) in enumerate(zip(POSTS, POSTS[1:])):
        xm = (a + b) / 2
        # numeral plate on the frieze, customer side: I, II, III
        A.box(xm - .1, xm + .1, 2.26, 2.4, zc + .08, zc + .09, brass, skip='n')
        for j in range(k + 1):
            sx = xm + (j - k / 2) * .045
            A.poly([(sx - .009, 2.29, zc + .094), (sx + .009, 2.29, zc + .094), (sx + .009, 2.37, zc + .094), (sx - .009, 2.37, zc + .094)], [(0, 1, 2, 3)], ink)
        # the grille
        g0, g1 = a + .045, b - .045
        gap = .17; ya = 1.3
        A.box(g0, xm - gap, TOP, TOP + .025, zc - .015, zc + .015, brass, skip='b')                   # sill, either side of the wicket
        A.box(xm + gap, g1, TOP, TOP + .025, zc - .015, zc + .015, brass, skip='b')
        A.box(g0, g1, 1.62, 1.645, zc - .015, zc + .015, brass)                                       # middle rail
        A.box(g0, g1, 1.98, 2.01, zc - .015, zc + .015, brass)                                         # head rail
        n = 9
        for i in range(n):
            x = g0 + .06 + i * (g1 - g0 - .12) / (n - 1)
            dx = x - xm
            y0 = TOP + .025 if abs(dx) >= gap else ya + math.sqrt(max(0, gap * gap - dx * dx))
            A.tube((x, y0, zc), (x, 1.98, zc), .011, 6, brass, caps=False)
        arc(A, xm, ya, zc, gap, 0, math.pi, 0, .022, .03, brass, segs=6)                               # the wicket's arch
        for sx in (xm - gap, xm + gap):
            A.beam((sx, TOP + .025, zc), (sx, ya, zc), .022, .03, brass)
        # before the wicket: the baize pad and the brass coin dish, a few coins in it
        A.box(xm - .22, xm + .22, TOP, TOP + .006, zc + .04, CZF + .02, baize, skip='b')
        A.lathe(xm, -.96, TOP + .006, [(.05, 0), (.08, .012), (.086, .018), (.072, .018), (.066, .008)], 10, brass, top=True)
        for ox, oz in ((-.02, .01), (.025, -.015), (0, .03))[:k + 1]:
            coin(A, xm + ox, -.96 + oz, TOP + .014)
    # the counter bell by the east wicket
    bx = POSTS[3] - .2
    A.lathe(bx, -.9, TOP, [(.05, 0), (.05, .014), (.03, .02)], 10, oak_d, top=True)
    A.lathe(bx, -.9, TOP + .02, [(.042, 0), (.04, .025), (.028, .045), (0, .055)], 10, brass)
    A.lathe(bx, -.9, TOP + .075, [(.008, 0), (.008, .018), (.014, .022), (0, .03)], 6, iron)


def tellers_side(A):
    """on the tellers' side of the top: the day ledger open, a balance, coin stacks and a purse"""
    xs = [(a + b) / 2 for a, b in zip(POSTS, POSTS[1:])]
    T.open_book(A, xs[0], -1.28, TOP, .3, .2, books[0], paper, ink=ink, rot=.04)
    T.scales(A, xs[1], -1.28, TOP, brass, oak_d, rot=0.0)
    for j, (ox, oz, n) in enumerate(((-.18, -.02, 5), (-.1, .04, 3), (.14, -.03, 4))):
        T.coin_stack(A, xs[2] + ox, -1.28 + oz, TOP, .022, n, gold if j != 1 else silver, rng)
    T.purse(A, xs[2] + .02, -1.27, TOP, .06, leather, twine, rot=.4)


def partitions(A):
    """the booth partitions behind the counter: panelled boards with a moulded cap"""
    for x in (0.0, 1.25):
        A.box(x - .03, x + .03, 0, 1.5, -2.0, CZB + .015, oak)
        A.box(x - .036, x + .036, .15, 1.35, -1.93, CZB - .06, panel)
        A.box(x - .045, x + .045, 1.5, 1.55, -2.02, CZB + .015, oak_d)


Sc = Part('Bank_ServiceCounter_Booths')             # a service: the runtime keeps it whole, so no welding
for fn in (counter_body, booths, tellers_side, partitions):
    fn(Sc)
Sc.build(root)


# ======================================================= the vault gate (service: Bank_ServiceVault_Gate)
def gate(A):
    """the barred vault gate, shut: iron stiles and rails, square bars, a brace, strap hinges on pins, a brass box lock"""
    z0, z1 = -2.04, -1.96
    A.box(2.71, 2.79, .02, 2.17, z0, z1, iron)                                                      # hinge stile
    A.box(4.21, 4.29, .02, 2.17, z0, z1, iron)                                                      # lock stile
    for y0, y1 in ((.08, .15), (.98, 1.05), (2.08, 2.15)):
        A.box(2.79, 4.21, y0, y1, z0 + .005, z1 - .005, iron)
    x = 2.9
    while x < 4.15:
        A.beam((x, .02, -2.0), (x, 2.17, -2.0), .03, .03, iron_d)
        x += .15
    A.beam((2.8, .16, -2.0), (4.2, .97, -2.0), .045, .025, iron)                                     # brace
    for yh in (.115, 2.115):                                                                        # strap hinges and pins
        A.box(2.72, 3.25, yh - .022, yh + .022, z1, z1 + .006, iron_d, skip='n')
        A.tube((2.705, yh - .08, -2.0), (2.705, yh + .08, -2.0), .018, 6, iron_d)
    A.box(3.92, 4.2, .9, 1.13, z1 - .005, z1 + .04, brass, skip='n')                                 # the box lock
    A.box(4.035, 4.065, .98, 1.06, z1 + .04, z1 + .046, iron_d, skip='n')                            # keyhole
    arc(A, 3.98, .93, z1 + .055, .045, math.pi, 2 * math.pi, 0, .012, .012, iron_d, segs=5)          # drop ring
    A.box(3.965, 3.995, .92, .95, z1 + .04, z1 + .055, iron_d, skip='n')
    A.tube((3.5, 1.015, z1 - .005), (3.5, 1.015, z1 + .012), .1, 12, brass)                          # the bank's coin boss
    A.tube((3.5, 1.015, z1 + .012), (3.5, 1.015, z1 + .02), .055, 10, gold_l)


Sg = Part('Bank_ServiceVault_Gate')
gate(Sg)
Sg.build(root)


# ======================================================= the vault chests (service: Bank_ServiceVault_Chests)
def vault_chest(A, x0, x1, z0, z1, h, front, rise=.14, open_=False):
    """an iron-bound treasure chest: plinth, board joints, a domed lid, iron bands over the lid and down the faces,
    corner irons, a brass lock plate and hasp, drop handles; open_: the lid stands up at the hinge, lined red, the chest
    heaped with gold"""
    along_x = front in ('s', 'n')
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    L, D = (x1 - x0, z1 - z0) if along_x else (z1 - z0, x1 - x0)
    P = frame(front, cx, cz)
    hl, hd = L / 2, D / 2
    bh = h - rise
    lbox(A, P, -hl - .005, hl + .005, 0, .05, -hd - .005, hd + .005, oak_d, skip='b')                 # plinth
    lbox(A, P, -hl + .01, hl - .01, .05, bh, -hd + .01, hd - .01, oak, skip='t' if open_ else '')     # body
    for k in (1, 2):
        y = .05 + (bh - .05) * k / 3
        lbox(A, P, -hl, hl, y - .006, y + .006, -hd, hd, oak_d)                                    # board joints
    bands = (-hl + .1, 0.0, hl - .1)
    for a in bands:
        lbox(A, P, a - .025, a + .025, .05, bh, hd - .01, hd + .012, iron, skip='k')                  # down the front
        lbox(A, P, a - .025, a + .025, .05, bh, -hd - .012, -hd + .01, iron, skip='f')                # and the back
    for sa in (-1, 1):
        for sb in (-1, 1):
            a0, a1 = sorted((sa * (hl - .05), sa * (hl + .016)))
            b0, b1 = sorted((sb * (hd - .05), sb * (hd + .016)))
            lbox(A, P, a0, a1, bh - .14, bh - .01, b0, b1, iron)                                     # corner irons
        lbox(A, P, *sorted((sa * hl, sa * (hl + .02))), bh * .55, bh * .55 + .05, -.06, .06, iron)     # handle mounts
        lstrap(A, P, [(sa * (hl + .03), bh * .55 + .06 * math.sin(t) - .005, .06 * math.cos(t)) for t in [math.pi + math.pi * i / 4 for i in range(5)]], .018, .018, iron)
    lbox(A, P, -.08, .08, bh - .2, bh - .03, hd + .012, hd + .03, brass, skip='k')                   # lock plate
    lbox(A, P, -.012, .012, bh - .15, bh - .09, hd + .03, hd + .036, iron_d, skip='k')               # keyhole
    n = 6
    R = hd + .012

    def lid_pt(a, i, grow=0.0):
        t = math.pi * i / n
        return (a, bh + math.sin(t) * (rise + grow), (R + grow) * math.cos(t))
    turn = (lambda p: p)
    if open_:
        bhinge = -hd

        def turn(p):
            a, y, b = p
            return (a, bh + (b - bhinge), bhinge - (y - bh))
    Q = lambda p: P(*turn(p))
    e0, e1 = -hl - .012, hl + .012
    ring0 = [Q(lid_pt(e0, i)) for i in range(n + 1)]
    ring1 = [Q(lid_pt(e1, i)) for i in range(n + 1)]
    A.poly(ring0 + ring1, [(i, i + 1, n + 1 + i + 1, n + 1 + i) for i in range(n)], oak)
    A.poly(ring0, [tuple(range(n + 1))], oak); A.poly(ring1, [tuple(range(n + 1))[::-1]], oak)
    A.poly([ring0[0], ring0[n], ring1[n], ring1[0]], [(0, 1, 2, 3)], oak_d)                          # the lid's flat underside
    for a in bands:
        for i in range(n):
            q = [Q(lid_pt(a - .025, i, .01)), Q(lid_pt(a + .025, i, .01)), Q(lid_pt(a + .025, i + 1, .01)), Q(lid_pt(a - .025, i + 1, .01))]
            A.poly(q, [(0, 1, 2, 3)], iron)
    if not open_:
        lbox(A, P, -.03, .03, bh - .08, bh + .06, hd + .03, hd + .042, iron, skip='k')               # hasp over the lock
        return
    # open: the lid's red lining, the rim, the gold heaped to the brim, coins spilled before it
    # the lining lies on the underside, 4 mm proud of it once the lid is up (the underside faces the front)
    lin = [Q((p_a, bh - .004, p_b)) for (p_a, p_b) in ((-hl + .03, R - .03), (hl - .03, R - .03), (hl - .03, -R + .05), (-hl + .03, -R + .05))]
    A.poly(lin, [(0, 1, 2, 3)], lining)
    for (a0, a1, b0, b1) in ((-hl + .005, hl - .005, -hd + .005, -hd + .035), (-hl + .005, hl - .005, hd - .035, hd - .005),
                             (-hl + .005, -hl + .035, -hd + .035, hd - .035), (hl - .035, hl - .005, -hd + .035, hd - .035)):
        lbox(A, P, a0, a1, bh - .03, bh + .006, b0, b1, oak_d)
    hx, _, hz = P(0, 0, 0)
    ellipsoid(A, hx, bh - .02, hz, (hl - .05) if along_x else (hd - .05), .085, (hd - .05) if along_x else (hl - .05), gold, seg=10, rings=5, flat=bh - .03)
    for (a, b) in ((-.12, .05), (.1, -.06), (.02, .1), (-.02, -.12), (.16, .04)):
        px, _, pz = P(a, 0, b)
        coin(A, px, pz, bh + .045, m=gold_l)
    for (a, b) in ((-.05, hd + .12), (.08, hd + .2), (.2, hd + .1)):
        px, _, pz = P(a, 0, b)
        coin(A, px, pz, .004, m=gold_l)


Sv = Part('Bank_ServiceVault_Chests')
vault_chest(Sv, 2.29, 2.85, -4.64, -4.04, .64, 's')
vault_chest(Sv, 3.10, 4.00, -4.64, -4.04, .64, 's')
vault_chest(Sv, 4.25, 5.15, -4.64, -4.04, .64, 's')
vault_chest(Sv, 4.49, 5.09, -3.45, -2.55, .64, 'w', open_=True)
Sv.build(root)


# ======================================================= the goods shelves, the little shop (service: Bank_ServiceShelves_Goods)
SY = [.14, .64, 1.14, 1.64]
XF, XB = 4.88, 5.25                     # usable depth of a shelf, front to back


def jar(A, x, z, y, h, body, lid):
    """a lidded earthenware storage jar: foot, full belly, shoulder, a lid with a knob"""
    A.lathe(x, z, y, [(.22 * h, 0), (.3 * h, .08 * h), (.36 * h, .34 * h), (.33 * h, .64 * h), (.24 * h, .8 * h), (.25 * h, .86 * h)], 8, body, top=True, top_m=clay_in)
    A.lathe(x, z, y + .86 * h, [(.27 * h, 0), (.27 * h, .03 * h), (.12 * h, .08 * h), (.05 * h, .1 * h), (.07 * h, .14 * h), (0, .16 * h)], 8, lid, top=False)


def dresser(A, z0, z1):
    for za, zb in ((z0, z0 + .04), (z1 - .04, z1)):
        A.box(4.84, 5.3, 0, 2.2, za, zb, oak)
    A.box(5.27, 5.3, .02, 2.2, z0 + .04, z1 - .04, oak_d)
    A.box(4.81, 5.31, 2.2, 2.26, z0 - .02, z1 + .02, oak_d)
    A.box(4.83, 4.86, 2.08, 2.2, z0 + .04, z1 - .04, oak_d)
    A.box(4.845, 4.87, 0, .1, z0 + .04, z1 - .04, oak_d)
    for y in SY:
        A.box(4.86, 5.27, y - .035, y, z0 + .04, z1 - .04, oak)
        A.box(4.852, 4.862, y - .03, y + .012, z0 + .04, z1 - .04, oak_d)                            # shelf lip


def goods_north(A, z0, z1):
    y = SY[0]
    for k, zz in enumerate((z0 + .22, z0 + .52)):
        T.sack(A, 5.07, zz, y, .26, .34, sackc[k], twine, rot=k * .9, slump=.01)
    T.crate(A, 4.92, 5.22, y, y + .26, z0 + .78, z0 + 1.08, crateb, batten)
    T.sack(A, 5.07, z0 + 1.35, y, .24, .3, sackc[1], twine, rot=2.0)
    y = SY[1]
    for j, zz in enumerate((z0 + .25, z0 + .6, z0 + .95)):                                           # candle bundles
        for (dy, dz) in ((0, -.03), (0, 0), (0, .03), (.026, -.015), (.026, .015)):
            A.tube((4.94, y + .016 + dy, zz + dz), (5.18, y + .016 + dy, zz + dz), .014, 6, wax)
        for xx in (5.0, 5.12):
            A.tube((xx - .01, y + .03, zz), (xx + .01, y + .03, zz), .048, 8, twine, caps=False)
    for k in range(3):                                                                            # tinderboxes
        A.rbox(5.05, z0 + 1.3, .1, .07, y + k * .045, y + k * .045 + .04, .15 * k, pewter)
    y = SY[2]
    r = .055
    for k, zz in enumerate((z0 + .2, z0 + .315, z0 + .43)):                                         # bolts of cloth
        A.tube((4.92, y + r + .002, zz), (5.22, y + r + .002, zz), r, 8, bolts[k], caps=True)
    for k, zz in enumerate((z0 + .2575, z0 + .3725)):
        A.tube((4.94, y + r + .002 + r * 1.75, zz), (5.2, y + r + .002 + r * 1.75, zz), r, 8, bolts[3 - k], caps=True)
    for k, zz in enumerate((z0 + .75, z0 + .9)):
        A.tube((4.92, y + r + .002, zz), (5.22, y + r + .002, zz), r, 8, bolts[(k + 2) % 4], caps=True)
    T.jug(A, 5.06, z0 + 1.3, y, .26, clay, clay_in, rot=math.pi, glaze=glaze)
    y = SY[3]
    for k, zz in enumerate((z0 + .22, z0 + .52, z0 + .82, z0 + 1.12, z0 + 1.42)):                    # lidded jars
        jar(A, 5.06, zz, y, .26 + .03 * (k % 2), clay if k % 2 == 0 else clay_d, glaze if k % 2 == 0 else clay)


def goods_south(A, z0, z1):
    y = SY[0]
    T.barrel(A, 5.06, z0 + .28, y, .13, .34, staves, iron, heads, n=10)
    T.bucket_hoop(A, 5.06, z0 + .7, y, .24, oak_l, iron, iron)
    T.crate(A, 4.92, 5.22, y, y + .24, z0 + 1.05, z0 + 1.45, crateb, batten)
    y = SY[1]
    T.rope_coil(A, 5.06, z0 + .3, y, .11, 3, rope, t=.03, n=8)
    lantern_obj(A, 5.06, z0 + .75, y, h=.3, lit=False)
    T.rope_coil(A, 5.06, z0 + 1.2, y, .1, 2, rope, t=.03, n=8)
    y = SY[2]
    for k in range(3):                                                                            # a stack of bowls
        PP.bowl(A, 5.06, z0 + .28, y + k * .026, .11, clay if k % 2 == 0 else clay_d, clay_in, n=10)
    for k, zz in enumerate((z0 + .66, z0 + .82, z0 + .98)):                                         # plates on edge
        PP.plate(A, 5.2 - .005 * k, zz, y, .1, pewter, pewter_d, stand=math.pi / 2)
    PP.vase(A, 5.06, z0 + 1.33, y, .28, clay, style=0)
    y = SY[3]
    for k, zz in enumerate((z0 + .3, z0 + .6)):
        PP.tankard(A, 5.06, zz, y, .16, pewter, pewter_d, rot=math.pi + .3 * k)
    for k, zz in enumerate((z0 + .98, z0 + 1.18, z0 + 1.38)):
        T.purse(A, 5.05, zz, y, .065, leather if k != 1 else strap, twine, rot=k)


def shop_sign(A):
    """the banker's sign over the dressers: three gold coins on a green board"""
    A.box(5.25, 5.29, 2.26, 2.6, -.82, .82, oak_d)
    A.poly([(5.246, 2.3, -.77), (5.246, 2.3, .77), (5.246, 2.56, .77), (5.246, 2.56, -.77)], [(0, 1, 2, 3)], sign_field)
    for zz in (-.48, 0, .48):
        A.tube((5.242, 2.43, zz), (5.23, 2.43, zz), .1, 14, brass)
        A.tube((5.23, 2.43, zz), (5.224, 2.43, zz), .075, 14, gold_l)


Ss = Part('Bank_ServiceShelves_Goods')
dresser(Ss, -1.75, -.08)
dresser(Ss, .08, 1.75)
goods_north(Ss, -1.75, -.08)
goods_south(Ss, .08, 1.75)
shop_sign(Ss)
Ss.build(root)


# ======================================================= the hall: queue, flap, settle, the cask by the door
H = Part('Bank_FurnishingPropsHall')
for x in (-.05, 1.05):
    def queue_line(A, x=x):
        """two stanchions and the crimson rope between them (a lane to the windows)"""
        stanchion(A, x, -.7, 1.0)
        stanchion(A, x, .1, 1.0)
        for zz in (-.7, .1):
            open_lathe_ring(A, x, .87, zz, .02, .034, .008, brass_d)
        sag_rope(A, (x, .87, -.62), (x, .87, .02), .1, .02, rope_red)
        for zz, s_ in ((-.66, 1), (.06, -1)):
            A.tube((x, .87, zz), (x, .87, zz + s_ * .04), .026, 8, brass)
    H.obj(queue_line)


def flap(A):
    """the counter flap at the east end: a panelled half-door on strap hinges, the lifting leaf on top"""
    z0, z1 = -1.83, -.82
    A.box(2.485, 2.595, 0, .1, z0 + .02, z1 - .02, oak_d)
    A.box(2.49, 2.59, .1, .97, z0 + .01, z1 - .01, oak)
    for xf in (2.483, 2.597):
        lo, hi = sorted((xf, 2.49 if xf < 2.5 else 2.59))
        A.box(lo, hi, .22, .86, z0 + .12, z1 - .12, panel)
    A.box(2.475, 2.61, .97, 1.04, z0, z1, oak_l)
    for zz in (z0 + .18, z1 - .18):                                                                # the leaf's strap hinges
        A.box(2.5, 2.61, 1.04, 1.046, zz - .02, zz + .02, iron, skip='b')
    A.box(2.59, 2.6, .45, .6, z1 - .1, z1 - .06, iron_d, skip='w')                                     # the latch


H.obj(flap)
H.obj(lantern_obj, 2.54, -1.12, 1.04, h=.28)


def settle(A):
    """the waiting settle under the south window: arms, a panelled back against the wall, a green cushion"""
    x0, x1, z0, z1 = 2.1, 3.3, 3.4, 3.78
    for xa, xb in ((x0, x0 + .05), (x1 - .05, x1)):
        A.box(xa, xb, 0, .66, z0 + .03, z1, oak)
        A.box(xa - .01, xb + .01, .66, .7, z0, z1, oak_d)
    A.box(x0 + .05, x1 - .05, .42, .47, z0 + .02, z1 - .06, oak_l)
    A.box(x0 + .05, x1 - .05, .28, .42, z0 + .03, z0 + .06, oak_d)
    A.box(x0 + .05, x1 - .05, .47, .9, z1 - .06, z1 - .005, oak)
    for k in range(3):
        w = (x1 - x0 - .1) / 3
        xa = x0 + .05 + k * w
        A.box(xa + .05, xa + w - .05, .56, .84, z1 - .068, z1 - .06, panel, skip='s')
    A.box(x0, x1, .9, .95, z1 - .08, z1 + .01, oak_d)
    A.box(x0 + .09, x1 - .09, .47, .52, z0 + .06, z1 - .1, cushion, skip='b')


H.obj(settle)
H.obj(T.barrel, 4.0, 2.84, 0, .25, .78, staves, iron, heads, rot=3.665, bung=oak_d)
H.obj(lantern_obj, 4.0, 2.84, .763, h=.3)
H.build(root)

# ======================================================= behind the counter: the tellers' stools, desk, strongbox
Tl = Part('Bank_FurnishingPropsTellers')
for x in (-.65, .62, 1.85):
    Tl.obj(tall_stool, x, -1.85, .62, .15, rot=x * 2)
dt = .845


def ledger_desk(A):
    """the tellers' ledger desk: turned legs, an apron with a drawer, a baize writing top"""
    x0, x1, z0, z1 = -1.2, -.1, -3.8, -3.2
    A.box(x0, x1, dt - .045, dt, z0, z1, oak)
    A.box(x0 + .08, x1 - .08, dt, dt + .006, z0 + .06, z1 - .06, baize, skip='b')
    A.box(x0 + .05, x1 - .05, dt - .17, dt - .045, z0 + .05, z1 - .05, oak_d, skip='b')
    A.box(-.85, -.45, dt - .15, dt - .06, z1 - .05, z1 - .042, oak_l)
    A.tube((-.65, dt - .105, z1 - .042), (-.65, dt - .105, z1 - .02), .014, 6, brass)
    for x in (x0 + .05, x1 - .05):
        for z in (z0 + .05, z1 - .05):
            T.turned_leg(A, x, z, 0, dt - .045, .04, oak)
    A.box(x0 + .05, x1 - .05, .12, .16, (z0 + z1) / 2 - .02, (z0 + z1) / 2 + .02, oak_d)
    for x in (x0 + .05, x1 - .05):
        A.box(x - .02, x + .02, .14, .18, z0 + .07, z1 - .07, oak_d)


Tl.obj(ledger_desk)
dty = dt + .006
Tl.obj(T.open_book, -.84, -3.5, dty, .4, .28, books[0], paper, ink=ink, rot=.05)


def reckoning(A):
    """a reckoning cloth ruled in columns, counters laid on it, coin stacks before it"""
    x0, x1, z0, z1 = -.58, -.24, -3.74, -3.44
    A.box(x0, x1, dty, dty + .004, z0, z1, reck, skip='b')
    for i in range(1, 5):
        xx = x0 + (x1 - x0) * i / 5
        A.poly([(xx - .003, dty + .008, z0 + .015), (xx + .003, dty + .008, z0 + .015), (xx + .003, dty + .008, z1 - .015), (xx - .003, dty + .008, z1 - .015)], [(0, 1, 2, 3)], paper_l)
    for j in range(1, 3):
        zz = z0 + (z1 - z0) * j / 3
        A.poly([(x0 + .015, dty + .008, zz - .003), (x1 - .015, dty + .008, zz - .003), (x1 - .015, dty + .008, zz + .003), (x0 + .015, dty + .008, zz + .003)], [(0, 1, 2, 3)], paper_l)
    for k in range(8):
        cx = x0 + (x1 - x0) * (rng.randrange(5) + .5) / 5 + rng.uniform(-.012, .012)
        cz = z0 + (z1 - z0) * (rng.randrange(3) + .5) / 3 + rng.uniform(-.015, .015)
        A.lathe(cx, cz, dty + .012, [(.013, 0), (.013, .006)], 6, (copper, silver, oak_d)[k % 3], top=True)


Tl.obj(reckoning)
for (x, z, n, m) in ((-.35, -3.32, 5, gold), (-.27, -3.35, 3, silver), (-.43, -3.3, 4, copper)):
    Tl.obj(T.coin_stack, x, z, dty, .02, n, m, rng)
Tl.obj(T.purse, -.17, -3.32, dty, .055, leather, twine, rot=.7)


def ink_quill(A):
    T.inkwell(A, -1.07, -3.68, dty, pewter_d, ink)
    T.quill(A, -1.07, -3.68, dty + .06, .6, feather, paper_l)


Tl.obj(ink_quill)
Tl.obj(T.candlestick, -1.07, -3.34, dty, brass, wax, flame, h=.16)
Tl.obj(T.strongbox, .42, 1.18, -3.78, -3.32, .6, iron, iron_d, brass, front='s')
Tl.build(root)


# ======================================================= the vault rack
def vault_rack(A):
    """the vault rack against the west wall: oak uprights on iron sole plates, three shelves and a top; strongboxes
    under it, sealed coin sacks, stacked gold and silver and the register, caskets, coin rolls, standing ledgers"""
    xb, xf = 1.8, 2.16
    zs = (-4.69, -3.57, -2.44)
    for z in zs:
        A.box(1.767, 2.198, 0, .02, z - .05, z + .05, iron, skip='b')
        for x in (xb, xf):
            T.oct_prism(A, x, z, .03, .03, .02, 1.9, oak_d)
        A.box(xb, xf, 1.2, 1.24, z - .018, z + .018, oak_d)                                          # the end rails
    for y in (.4, 1.0, 1.6):
        A.box(1.776, 2.182, y - .035, y, -4.735, -2.405, oak)
    A.box(1.764, 2.198, 1.9, 1.935, -4.74, -2.4, oak_d)
    A.box(1.764, 1.772, .02, 1.9, -4.73, -2.41, oak_d)                                               # back boards
    # below: two small strongboxes
    T.strongbox(A, 1.83, 2.13, -4.55, -4.2, .3, iron, iron_d, brass, front='e')
    T.strongbox(A, 1.83, 2.13, -3.35, -2.95, .3, iron, iron_d, brass, front='e')
    # shelf .4: sealed coin sacks
    for k, zz in enumerate((-4.55, -4.2, -3.8, -3.2, -2.8)):
        coin_sack(A, 1.97, zz, .4, .22, .3 - .03 * (k % 2), k, rot=k * .8)
    # shelf 1.0: gold and silver ingots, the vault register
    ingot_stack(A, 1.98, -4.35, 1.0, gold, gold_l)
    ingot_stack(A, 1.98, -3.85, 1.0, silver, silver_l, layers=2)
    ingot_stack(A, 1.98, -3.3, 1.0, gold, gold_l, layers=2)
    T.closed_book(A, 1.98, -2.75, 1.0, .26, .34, .06, books[5], paper_l, rot=math.pi / 2)
    # shelf 1.6: brass-bound caskets, coin rolls, standing ledgers
    casket(A, 1.86, 2.1, -4.62, -4.42, 1.6, .15)
    casket(A, 1.88, 2.08, -4.25, -4.08, 1.6, .13)
    for zz in (-3.85, -3.81, -3.77):
        coin_roll(A, 1.98, zz, 1.6)
    coin_roll(A, 1.98, -3.83, 1.634)
    for k, zz in enumerate((-3.2, -3.13, -3.05, -2.98, -2.9)):
        A.box(1.84, 2.1, 1.6, 1.6 + .24 + .03 * (k % 2), zz, zz + .06, books[(k + 1) % 6], skip='b')


Vr = Part('Bank_FurnishingPropsVault')
Vr.obj(vault_rack)
Vr.build(root)


# ======================================================= the clerks' wing: muniment chest, bench, notice board
W = Part('Bank_FurnishingPropsWing')
W.obj(T.chest, -3.28, -2.22, -3.79, -3.37, .6, oak, oak_d, iron, brass, front='s')


def chest_ledgers(A):
    y = .6
    for k, (w, d, th) in enumerate(((.3, .22, .06), (.28, .2, .05), (.26, .19, .05))):
        T.closed_book(A, -2.75, -3.58, y, w, d, th, books[(k + 2) % 6], paper_l, rot=.08 * k - .06)
        y += th


W.obj(chest_ledgers)
W.obj(T.candlestick, -2.34, -3.52, .6, brass, wax, flame, h=.14)
W.obj(T.bench, -2.13, -1.71, 1.97, 3.53, .46, oak, oak_d, along='z')


def satchel(A):
    """a clerk's leather satchel left on the bench, its flap buckled"""
    x, z, y = -1.92, 2.45, .46
    A.box(x - .12, x + .12, y, y + .07, z - .17, z + .17, leather, skip='b')
    A.box(x - .125, x + .125, y + .07, y + .076, z - .05, z + .175, strap)
    A.box(x - .02, x + .02, y + .076, y + .082, z + .08, z + .12, brass, skip='b')


W.obj(satchel)


def notice_board(A):
    """the bank's notice board on its own posts and feet before the partition, under a little hood; bills pinned on it"""
    z0, z1 = -2.58, -1.42
    for pz in (z0 + .05, z1 - .05):
        A.box(-2.02, -1.7, 0, .06, pz - .04, pz + .04, oak_d)
        A.box(-2.025, -1.695, 0, .012, pz - .045, pz + .045, iron, skip='b')
        T.oct_prism(A, -1.74, pz, .035, .035, .06, 2.1, oak)
    A.box(-1.765, -1.715, 1.15, 1.21, z0 + .09, z1 - .09, oak_d)
    A.box(-1.765, -1.715, 2.0, 2.06, z0 + .09, z1 - .09, oak_d)
    A.box(-1.765, -1.715, 1.21, 2.0, z0 + .09, z0 + .13, oak_d)
    A.box(-1.765, -1.715, 1.21, 2.0, z1 - .13, z1 - .09, oak_d)
    A.box(-1.755, -1.72, 1.21, 2.0, z0 + .13, z1 - .13, board)
    T.wedge_box(A, -1.86, -1.69, 2.08, 2.12, 2.2, z0, z1, oak_d, along='x')
    xs = -1.76
    bills = ((-2.3, 1.5, .24, .34, .06), (-2.0, 1.45, .22, .3, -.05), (-1.7, 1.52, .2, .36, .03), (-2.28, 1.83, .22, .2, 0), (-1.87, 1.82, .3, .16, .04))
    for k, (zc, yc, w, hh, rot) in enumerate(bills):
        c, s = math.cos(rot), math.sin(rot)
        Q = lambda u, v: (xs, yc + u * s + v * c, zc + u * c - v * s)
        A.poly([Q(-w / 2, -hh / 2), Q(w / 2, -hh / 2), Q(w / 2, hh / 2), Q(-w / 2, hh / 2)], [(0, 1, 2, 3)], paper if k % 2 else paper_l)
        Q2 = lambda u, v: (xs - .004, yc + u * s + v * c, zc + u * c - v * s)
        for li in range(3 if hh > .2 else 2):
            v = hh / 2 - .05 - li * .05
            A.poly([Q2(-w / 2 + .03, v), Q2(w / 2 - .03 - .04 * (li % 2), v), Q2(w / 2 - .03 - .04 * (li % 2), v + .012), Q2(-w / 2 + .03, v + .012)], [(0, 1, 2, 3)], ink)
        A.box(xs - .008, xs, yc + hh / 2 - .03, yc + hh / 2 - .015, zc - .008, zc + .008, iron_d, skip='e')   # the nail
    A.tube((xs - .002, 1.4, -1.7), (xs - .012, 1.4, -1.7), .028, 8, seal)                                  # a seal on the lease


W.obj(notice_board)
W.build(root)


# ======================================================= the strongroom under the stair
S = Part('Bank_FurnishingPropsStrongroom')


def coffer(A, x0, x1, z0, z1, y, h, front='e', handles=True):
    """a flat-lidded oak coffer bound in iron: bands over the lid, a brass lock, drop handles"""
    lid = .06
    A.box(x0 + .01, x1 - .01, y, y + h - lid, z0 + .01, z1 - .01, oak)
    A.box(x0, x1, y + h - lid, y + h, z0, z1, oak_d)
    along = front in ('e', 'w')
    for t in (.2, .8):
        if along:
            zb = z0 + (z1 - z0) * t
            A.box(x0 - .012, x1 + .012, y, y + h + .008, zb - .025, zb + .025, iron, skip='b')
        else:
            xb = x0 + (x1 - x0) * t
            A.box(xb - .025, xb + .025, y, y + h + .008, z0 - .012, z1 + .012, iron, skip='b')
    zc, xc = (z0 + z1) / 2, (x0 + x1) / 2
    if front == 'e':
        A.box(x1 - .01, x1 + .02, y + h - lid - .16, y + h - lid - .02, zc - .07, zc + .07, brass, skip='w')
        A.box(x1 + .02, x1 + .026, y + h - lid - .12, y + h - lid - .06, zc - .012, zc + .012, iron_d, skip='w')
        for zz, s in (((z0, -1), (z1, 1)) if handles else ()):
            arc(A, xc, y + h * .55, zz + s * .02, .05, math.pi, 2 * math.pi, 0, .014, .014, iron, segs=4)
    else:
        A.box(xc - .07, xc + .07, y + h - lid - .16, y + h - lid - .02, z1 - .01, z1 + .02, brass, skip='n')
        A.box(xc - .012, xc + .012, y + h - lid - .12, y + h - lid - .06, z1 + .02, z1 + .026, iron_d, skip='n')
        for xx, s in (((x0, -1), (x1, 1)) if handles else ()):
            arc(A, xx + s * .02, y + h * .55, zc, .05, math.pi, 2 * math.pi, math.pi / 2, .014, .014, iron, segs=4)


def coffers(A):
    coffer(A, -5.2, -4.56, -1.2, -.7, 0, .48, front='e')
    T.at(A, .488, T.strongbox, -5.12, -4.64, -1.12, -.78, .36, iron, iron_d, brass, front='e')


S.obj(coffers)
for k, (x, z, w, h) in enumerate(((-4.99, -.3, .26, .34), (-4.9, .045, .26, .32), (-4.65, -.24, .24, .3), (-4.43, -.22, .26, .34))):
    S.obj(coin_sack, x, z, 0, w, h, k, rot=k * 1.3)
S.obj(T.barrel, -4.55, .45, 0, .23, .72, staves, iron, heads, rot=.4)
S.obj(lantern_obj, -4.55, .45, .703, h=.26)


def ledger_crate(A):
    """an open crate of old ledgers, standing on end"""
    x0, x1, z0, z1 = -4.44, -3.99, -1.19, -.71
    T.crate(A, x0, x1, 0, .5, z0, z1, crateb, batten, lid=False)
    z = z0 + .06
    k = 0
    while z < z1 - .1:
        th = .05 + .015 * (k % 3)
        A.box(x0 + .07, x1 - .07 - .02 * (k % 2), .47, .47 + .26 + .05 * ((k * 7) % 3), z, z + th, books[k % 6], skip='b')
        z += th + .006
        k += 1


S.obj(ledger_crate)
S.build(root)

# ======================================================= the clerk's room (upper floor)
F = 3.0
Uc = Part('Bank_UpperFurnishingPropsClerk')
cdt = F + .8


def clerk_desk(A):
    """the clerk's desk: turned legs, a drawer on the clerk's side, a baize top"""
    x0, x1, z0, z1 = -2.9, -2.1, 0.0, 1.0
    A.box(x0, x1, cdt - .045, cdt, z0, z1, oak)
    A.box(x0 + .06, x1 - .06, cdt, cdt + .006, z0 + .06, z1 - .06, baize, skip='b')
    A.box(x0 + .05, x1 - .05, cdt - .16, cdt - .045, z0 + .05, z1 - .05, oak_d, skip='b')
    A.box(x1 - .05, x1 - .042, cdt - .14, cdt - .06, z0 + .3, z1 - .3, oak_l)
    A.tube((x1 - .042, cdt - .1, .5), (x1 - .02, cdt - .1, .5), .014, 6, brass)
    for x in (x0 + .05, x1 - .05):
        for z in (z0 + .05, z1 - .05):
            T.turned_leg(A, x, z, F, cdt - .045, .04, oak)
    A.box(x0 + .05, x1 - .05, F + .12, F + .16, .48, .52, oak_d)
    for x in (x0 + .05, x1 - .05):
        A.box(x - .02, x + .02, F + .14, F + .18, z0 + .07, z1 - .07, oak_d)


Uc.obj(clerk_desk)
cy = cdt + .006
Uc.obj(T.open_book, -2.38, .5, cy, .36, .26, books[1], paper, ink=ink, rot=math.pi / 2)


def clerk_ink(A):
    T.inkwell(A, -2.25, .13, cy, pewter_d, ink)
    T.quill(A, -2.25, .13, cy + .06, -2.4, feather, paper_l)


Uc.obj(clerk_ink)
Uc.obj(T.candlestick, -2.24, .87, cy, brass, wax, flame, h=.16)
Uc.obj(T.scales, -2.72, .25, cy, brass, oak_d, rot=math.pi / 2)
for (x, z, n, m) in ((-2.7, .64, 5, gold), (-2.62, .72, 3, gold), (-2.76, .76, 4, silver)):
    Uc.obj(T.coin_stack, x, z, cy, .02, n, m, rng)


def letter(A):
    """a letter folded and sealed, waiting to go down with the boat"""
    A.rbox(-2.6, .9, .16, .11, cy, cy + .004, .3, paper_l)
    A.lathe(-2.6, .9, cy + .004, [(.017, 0), (.017, .006)], 6, seal, top=True)


Uc.obj(letter)


def clerk_chair(A):
    """the clerk's ladder-back chair behind the desk, facing the customer (west)"""
    x0, x1, z0, z1 = -2.0, -1.72, .3, .7
    seat = F + .46
    for z in (z0 + .03, z1 - .03):
        T.oct_prism(A, x0 + .03, z, .022, .022, F, seat - .04, oak)
        T.oct_prism(A, x1 - .03, z, .024, .024, F, F + 1.04, oak)
        A.lathe(x1 - .03, z, F + 1.04, [(.028, 0), (.02, .02), (.026, .04), (0, .06)], 6, oak_l)
    A.box(x0, x1, seat - .04, seat, z0, z1, oak_l)
    for y in (.64, .8, .94):
        A.box(x1 - .045, x1 - .015, F + y - .03, F + y + .03, z0 + .05, z1 - .05, oak)
    for z in (z0 + .03, z1 - .03):
        A.box(x0 + .03, x1 - .03, F + .16, F + .19, z - .012, z + .012, oak_d)
    A.box(x0 + .03, x0 + .06, F + .12, F + .15, z0 + .05, z1 - .05, oak_d)


Uc.obj(clerk_chair)


def bookcase(A):
    """the ledger bookcase on the east wall: sides, back, cornice, four shelves of ledgers and books, the tall ledgers
    labelled, a bundle of scrolls on the top shelf"""
    x0, x1, z0, z1 = -2.0, -1.685, -1.45, -.18
    for za, zb in ((z0, z0 + .03), (z1 - .03, z1)):
        A.box(x0, x1, F, F + 1.96, za, zb, oak)
    A.box(-1.72, x1, F + .05, F + 1.96, z0 + .03, z1 - .03, oak_d)
    A.box(x0 - .02, x1, F + 1.96, F + 2.0, z0 - .02, z1 + .02, oak_d)
    A.box(x0, x0 + .015, F, F + .075, z0 + .03, z1 - .03, oak_d)
    for x, z in ((x0 - .005, z0 - .005), (x0 - .005, z1 - .045)):
        A.box(x, x1 - .007, F, F + .012, z, z + .05, iron, skip='b')                                 # iron shoes
    ys = (F + .085, F + .56, F + 1.03, F + 1.5)
    for y in ys:
        A.box(x0 + .01, -1.72, y - .035, y, z0 + .03, z1 - .03, oak)
    r2 = random.Random(8102)
    for si, y in enumerate(ys):
        z = z0 + .05
        end = z1 - .05 - (.32 if si >= 2 else 0)
        while z < end - .04:
            tall = si == 0
            th = r2.uniform(.05, .075) if tall else r2.uniform(.035, .06)
            hh = r2.uniform(.34, .38) if tall else r2.uniform(.22, .34)
            if z + th > end:
                break
            xf = x0 + .025 + r2.uniform(0, .015)
            m = books[r2.randrange(6)]
            A.box(xf, -1.735, y, y + hh, z, z + th, m, skip='b')
            if tall:
                A.poly([(xf - .004, y + hh * .6, z + .01), (xf - .004, y + hh * .6, z + th - .01), (xf - .004, y + hh * .75, z + th - .01), (xf - .004, y + hh * .75, z + .01)], [(0, 1, 2, 3)], paper_l)
            z += th + .006
            if r2.random() < .12:
                z += .06
        if si == 2:
            for k in range(3):
                T.closed_book(A, -1.85 + .008 * k, z1 - .22, y + k * .05, .23 - .01 * k, .26, .05, books[(k + 3) % 6], paper_l)
    for (xx, dy) in ((-1.9, 0), (-1.845, 0), (-1.8725, .044)):                                     # deeds rolled on the top shelf
        scroll(A, (xx, ys[3] + .026 + dy, z1 - .52), (xx, ys[3] + .026 + dy, z1 - .25), .025, paper_o, seal)


Uc.obj(bookcase)
Uc.build(root)

Uh = Part('Bank_UpperFurnishingPropsHearth')


def fireplace(A):
    """the clerk's fireplace: dressed stone jambs and lintel, an oak mantel, the sooty firebox with an iron basket,
    two logs burning on embers, fire irons leaning on the jamb, the hearthstone"""
    zb = -3.79
    A.box(-3.08, -1.92, F, F + .03, -3.74, -3.3, stone_d)                                            # hearthstone
    for xa, xb in ((-3.02, -2.74), (-2.26, -1.98)):
        west = xa < -2.5
        for k, (ya, yb) in enumerate(((0, .36), (.36, .72), (.72, 1.08))):
            o = .012 if k == 1 else 0
            A.box(xa - (o if west else 0), xb + (0 if west else o), F + ya, F + yb, zb, -3.44 + o, stone if k != 1 else stone_d)
    A.box(-2.74, -2.26, F, F + 1.08, zb, -3.75, soot)                                                # firebox back
    A.box(-3.06, -1.94, F + 1.08, F + 1.3, zb, -3.4, stone)                                          # lintel
    A.box(-3.08, -1.92, F + 1.25, F + 1.3, -3.4, -3.36, oak_d)
    A.box(-3.1, -1.9, F + 1.3, F + 1.38, -3.78, -3.3, oak)                                           # the mantel shelf
    # the fire basket
    for x in (-2.62, -2.38):
        for z in (-3.69, -3.51):
            A.box(x - .012, x + .012, F + .03, F + .12, z - .012, z + .012, iron)
    A.box(-2.64, -2.36, F + .12, F + .135, -3.71, -3.49, iron)
    for y in (F + .18, F + .24):
        A.beam((-2.64, y, -3.49), (-2.36, y, -3.49), .014, .014, iron)
    for z in (-3.7, -3.49):
        for x in (-2.64, -2.36):
            A.beam((x, F + .13, z), (x, F + .25, z), .014, .014, iron)
    A.tube((-2.6, F + .19, -3.66), (-2.4, F + .2, -3.53), .045, 7, bark, cap_m=logend)
    A.tube((-2.4, F + .21, -3.68), (-2.58, F + .23, -3.54), .04, 7, bark, cap_m=logend)
    ellipsoid(A, -2.5, F + .15, -3.6, .11, .025, .08, ember, seg=8, rings=3, flat=F + .139)
    for (x, z, hh, a) in ((-2.5, -3.6, .28, 0), (-2.56, -3.62, .2, 1.1), (-2.44, -3.58, .22, 2.2)):
        c, s = math.cos(a) * .06, math.sin(a) * .06
        A.poly([(x - c, F + .2, z - s), (x + c, F + .2, z + s), (x, F + .2 + hh, z)], [(0, 1, 2)], flame)
    # fire irons against the east jamb
    A.tube((-2.03, F + .03, -3.36), (-2.05, F + .8, -3.435), .01, 5, iron)
    A.lathe(-2.05, -3.435, F + .8, [(.018, 0), (.022, .02), (0, .04)], 6, brass)
    A.tube((-2.1, F + .03, -3.35), (-2.1, F + .76, -3.435), .009, 5, iron)
    A.tube((-2.12, F + .03, -3.35), (-2.1, F + .76, -3.435), .009, 5, iron)
    A.lathe(-2.1, -3.435, F + .76, [(.02, 0), (.02, .03), (0, .04)], 6, brass)


Uh.obj(fireplace)
Uh.obj(T.candlestick, -2.95, -3.52, F + 1.38, brass, wax, flame, h=.16)


def seal_box(A):
    """the bank's seal and its wax on the mantel"""
    y = F + 1.38
    A.box(-2.3, -2.16, y, y + .06, -3.6, -3.5, oak_d)
    A.box(-2.305, -2.155, y + .06, y + .07, -3.605, -3.495, brass_d)
    A.lathe(-2.08, -3.55, y, [(.022, 0), (.022, .012), (.009, .022), (.011, .07), (.018, .085), (0, .1)], 8, brass)
    A.rbox(-2.42, -3.55, .09, .016, y, y + .016, .3, seal)


Uh.obj(seal_box)


def candle_stand(A):
    """a floor candle stand on three feet, between the hearth and the chests"""
    x, z = -3.5, -3.0
    for k in range(3):
        a = k * 2 * math.pi / 3 + .5
        A.beam((x + math.cos(a) * .025, F + .16, z + math.sin(a) * .025), (x + math.cos(a) * .15, F + .02, z + math.sin(a) * .15), .03, .025, iron)
        A.lathe(x + math.cos(a) * .15, z + math.sin(a) * .15, F, [(.024, 0), (.024, .018), (0, .03)], 6, iron)
    h = 1.02
    A.lathe(x, z, F + .12, [(.032, 0), (.022, .06), (.016, .1), (.016, h - .3), (.028, h - .27), (.016, h - .23), (.016, h - .08), (.07, h - .06), (.076, h - .04), (.06, h - .04)], 8, iron)
    A.lathe(x, z, F + .12 + h - .04, [(.028, 0), (.028, .15), (.02, .16)], 8, wax)
    b = F + .12 + h - .04 + .16
    for a in (0, math.pi / 2):
        c, s = math.cos(a) * .014, math.sin(a) * .014
        A.poly([(x - c, b + .004, z - s), (x + c, b + .004, z + s), (x, b + .07, z)], [(0, 1, 2)], flame)


Uh.obj(candle_stand)
Uh.build(root)

Us = Part('Bank_UpperFurnishingPropsStore')
Us.obj(T.at, F, T.chest, -4.9, -4.08, -3.78, -3.34, .45, oak, oak_d, iron, brass, front='s')


def deeds(A):
    y = F + .45
    scroll(A, (-4.66, y + .025, -3.64), (-4.34, y + .025, -3.5), .025, paper_l, seal, rod=oak_d)
    scroll(A, (-4.62, y + .022, -3.46), (-4.36, y + .022, -3.42), .022, paper, seal)


Us.obj(deeds)
Us.obj(coffer, -5.28, -5.0, -3.78, -3.4, F, .42, front='s', handles=False)


def day_books(A):
    y = F + .428
    for k, (w, d, th) in enumerate(((.2, .26, .05), (.19, .24, .045))):
        T.closed_book(A, -5.14, -3.6 + .01 * k, y, w, d, th, books[(k + 4) % 6], paper_l, rot=math.pi / 2)
        y += th


Us.obj(day_books)


def deed_crate(A):
    """a crate of old deeds, rolled and ribboned, standing in it"""
    x0, x1, z0, z1 = -2.38, -1.82, 3.87, 4.33
    T.crate(A, x0, x1, F, F + .42, z0, z1, crateb, batten, lid=False)
    r2 = random.Random(8104)
    for k in range(9):
        bx = x0 + .1 + (k % 3) * (x1 - x0 - .2) / 2 + r2.uniform(-.02, .02)
        bz = z0 + .1 + (k // 3) * (z1 - z0 - .2) / 2 + r2.uniform(-.02, .02)
        tx = bx + r2.uniform(-.07, .07); tz = bz + r2.uniform(-.07, .07)
        scroll(A, (bx, F + .3, bz), (tx, F + .56 + r2.uniform(0, .12), tz), .026 + .006 * (k % 2), paper_o if k % 3 else paper, seal if k % 2 else twine)


Us.obj(deed_crate)
Us.build(root)

# ---- early warning: does any new part reach into a stance or a link? (the graph step is the proof)
names = ['Bank_ServiceCounter_Booths', 'Bank_ServiceVault_Gate', 'Bank_ServiceVault_Chests', 'Bank_ServiceShelves_Goods',
         'Bank_FurnishingPropsHall', 'Bank_FurnishingPropsTellers', 'Bank_FurnishingPropsVault', 'Bank_FurnishingPropsWing',
         'Bank_FurnishingPropsStrongroom', 'Bank_UpperFurnishingPropsClerk', 'Bank_UpperFurnishingPropsHearth', 'Bank_UpperFurnishingPropsStore']
nav = ROOT / '.studio-workspaces' / SP['referenceGraph'] / 'candidates' / 'navigation.json'
for w in PK.clearance(str(nav), names):
    print('[CLEARANCE]', w)
    PK.REPORT['notes'].append('clearance ' + ' '.join(map(str, w)))
PK.save(SP, ROOT)
