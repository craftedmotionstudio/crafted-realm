"""Survival camp props pass (owner, 2026-09-28: "props ... blocky -> redo in Blender purposefully"; "every object in every
building reviewed in Blender"). Wenna's outdoor camp teaches woodcutting, firemaking, fishing and cooking: its things
are a woodsman's and a fisher's things - an axe in the block, split wood, tinder and flint, a creel, a net, fish drying.

From the model the island loads (holm-survival-v2land-v1/survival.blend, Blender 5.1). Every prop the v1 build drew as
boxes, 5-7 sided logs and flat sheets (build_holm_survival_v1.py) and the m44 dressing's stub jar are designed again in
their old footprints, so the same tiles stay blocked and the graph is unchanged. Before -> after:

 under the thatched canopy (floor 0)
  - the teaching bench (a plank on sticks with a log, a slab and a stick) -> a plank bench on three pairs of splayed legs
    with a stretcher, laid out for the firemaking lesson: a bundle of dry tinder tied twice, a tinderbox open with its
    char cloth, flint and a steel striker, a whetstone and a gutting knife;
  - the table (a slab on sticks with orange shards and a box) -> the gutting table: a planked top on two A-frame trestles,
    a board with a trout being gutted and one whole, the knife, a wicker creel with its lid and strap;
  - the drying pole with fish and herbs (stick shapes) -> a peeled pole hung from the truss on two cords, trout hung by
    their tails and bundles of herbs tied on cords (hung from the roof as before; the cutaway clips it with the roof);
 the store shed (floor 0.6)
  - a crate and a barrel (boxes and an 8-sided drum; a stub jar on the crate) -> a battened, lidded crate of camp
    stores with a horn lantern on it; a salt barrel for curing the catch, open, its salt heaped with a scoop in it;
  - the tool rack (service 'Tool rack', name and box kept) -> posts and rails with a shelf: a spare hatchet hung by its
    haft, a tinderbox with flint and steel and a spare line, a hand net on its hoop, a fishing rod against the post and
    a coil of line on the boards;
 the yard (floor -0.4)
  - two log seats (7-sided logs) -> seats hewn flat on top from a bark-covered log, end grain showing its rings;
  - the fire ring (service 'Fire ring', name and box kept) -> a ring of fire-blackened stones round a bed of ash, split
    logs leant in a cone over glowing embers, a tripod of poles lashed at the head with a pot hook and a bellied iron
    pot of stew on its bail;
 the sheltered front
  - the log pile (service 'Log pile', name and box kept) -> split logs and rounds stacked on two sleepers between stakes,
    their ends showing rings and split faces; the chopping block, its top scored, the axe bitten into it; split billets
    lying by it.
Plan coordinates (x east, y up, z south; Blender (x, -z, y)), camp-local (root Survival_Root at the origin). Original designs.
Run through tools/rebuild_holm_props_pass.js survival (spec docs/rebuild/holm-overhaul/props-pass/survival.json)."""
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
rng = random.Random(4190)
root = PK.obj('Survival_Root')
PK.remove('Survival_FurnishingCanopy', 'Survival_FurnishingDressing', 'Survival_FurnishingStore', 'Survival_FurnishingYard',
          'Survival_ServiceTools_Rack', 'Survival_ServiceFirePit_Ring', 'Survival_ServiceLogPile_Stack')

# ---- palette (sRGB as the game shows it; tex = the kit texture the faces take) ----
oak = C('camp oak', '#6b4b2f', 'beam'); oak_l = C('camp oak light', '#7c5a38', 'beam'); oak_d = C('camp frame oak', '#4a3422', 'beam')
bark = C('camp bark', '#4f3a28', 'beam'); bark_l = C('camp bark light', '#5e4630', 'beam'); hewn = C('camp hewn wood', '#8a6840', 'beam')
endg = C('camp end grain', '#c49d6a'); ring_c = C('camp growth ring', '#9c7648'); split_c = C('camp split face', '#caa574')
ash_n = C('camp new haft', '#cdb088'); peeled = C('camp peeled pole', '#b8976a'); board_c = C('camp scrubbed board', '#c7a97e')
iron = C('camp iron', '#3a3b3a'); iron_w = C('camp worn iron', '#6c7274'); steel = C('camp steel', '#a2a8aa'); brass = C('camp brass', '#b39146')
cord = C('camp cord', '#8a7048'); twine = C('camp twine', '#a88d5c'); tinder = C('camp tinder grass', '#c9b27a'); tinder_d = C('camp tinder dark', '#a58f5a')
wicker = C('camp wicker', '#b8955a'); wicker_d = C('camp wicker dark', '#94733f'); leather = C('camp leather', '#5e3d24')
fish_b = C('camp trout', '#8f9a8c'); fish_back = C('camp trout back', '#5c6a55'); fish_f = C('camp fin', '#6e7866'); guts = C('camp gutted flesh', '#c97a5e')
herb = [C('camp herb', '#5f7d3a'), C('camp herb light', '#7a9a4a')]
stone = [C('camp stone', '#8e8a80', 'rock'), C('camp stone dark', '#7a766c', 'rock'), C('camp stone burnt', '#4d4945', 'rock')]
whet = C('camp whetstone', '#7f7a70'); flint = C('camp flint', '#3b3a3e'); charcloth = C('camp char cloth', '#1f1d1b')
ash_bed = C('camp ash', '#6a6560'); soot = C('camp soot', '#2e2b28'); glow = C('camp embers', '#ff7a28', emit=1.5)
stew = C('camp stew', '#6b3e1e'); salt = C('camp salt', '#ece8dc'); lamp = C('camp lantern glow', '#ffd27a', emit=1.2)
staves = [C('camp stave 1', '#7a5634', 'beam'), C('camp stave 2', '#6a4a2d', 'beam'), C('camp stave 3', '#84603c', 'beam')]
heads = [C('camp head board 1', '#8d6a44', 'beam'), C('camp head board 2', '#81603c', 'beam')]
crateb = [C('camp crate 1', '#94764f', 'beam'), C('camp crate 2', '#86683f', 'beam'), C('camp crate 3', '#9e7f55', 'beam')]
batten = C('camp crate batten', '#654a2e', 'beam')


# ------------------------------------------------------------------ pieces of the camp (designed here)
def frame(d, up):
    d = Vector(d).normalized(); hv = Vector(up)
    if abs(hv.normalized().dot(d)) > .95:                                               # an upright piece: any level axis will do
        hv = Vector((0, 0, 1)) if abs(d.z) < .9 else Vector((1, 0, 0))
    hv = (hv - d * hv.dot(d)).normalized(); wv = d.cross(hv).normalized()
    return d, hv, wv


def fish(A, head, tail, dorsal, body, back, fin, w=.045, h=.08, gutted=None):
    """a trout from head to tail: a lens-shaped body (dark back, pale sides), a forked tail fin and a dorsal fin (one sheet
    each); gutted = the colour of an opened belly"""
    H, Tl = Vector(head), Vector(tail); L = (Tl - H).length
    d, hv, wv = frame(Tl - H, dorsal)
    n = 6
    prof = [(.1, .55), (.32, 1.0), (.58, .82), (.8, .4), (.9, .22)]
    rings = []
    for t, s in prof:
        c = H + d * L * t
        rings.append([c + hv * math.cos(2 * math.pi * i / n) * h / 2 * s + wv * math.sin(2 * math.pi * i / n) * w / 2 * s for i in range(n)])
    V_ = [H] + [p for r in rings for p in r]
    F = [(0, 1 + (i + 1) % n, 1 + i) for i in range(n)]
    for k in range(len(rings) - 1):
        a, b = 1 + k * n, 1 + (k + 1) * n
        F += [(a + i, a + (i + 1) % n, b + (i + 1) % n, b + i) for i in range(n)]
    last = 1 + (len(rings) - 1) * n
    F.append(tuple(last + i for i in range(n)))
    top = [f for f in F if len(f) == 4 and all(V_[j].dot(hv) - H.dot(hv) > -1e-4 for j in f)]
    A.poly([tuple(p) for p in V_], [f for f in F if f not in top], body)
    A.poly([tuple(p) for p in V_], top, back)
    r = H + d * L * .9
    notch = Tl - d * .025                                                               # the forked tail: two lobes, each convex
    A.poly([tuple(r), tuple(r + hv * .012), tuple(Tl + hv * .05), tuple(notch)], [(0, 1, 2, 3)], fin)
    A.poly([tuple(r), tuple(notch), tuple(Tl - hv * .05), tuple(r - hv * .012)], [(0, 1, 2, 3)], fin)
    A.poly([tuple(H + d * L * .34 + hv * h * .46), tuple(H + d * L * .52 + hv * h * .38), tuple(H + d * L * .5 + hv * (h * .5 + .03))], [(0, 1, 2)], fin)
    if gutted is not None:                                                              # the belly slit open
        A.poly([tuple(H + d * L * .18 - hv * h * .5 + wv * (w * .5 + .004)), tuple(H + d * L * .62 - hv * h * .44 + wv * (w * .44 + .004)),
                tuple(H + d * L * .55 - hv * h * .2 + wv * (w * .52 + .004)), tuple(H + d * L * .22 - hv * h * .25 + wv * (w * .52 + .004))], [(0, 1, 2, 3)], gutted)


def log_round(A, a, b, r, bark_m, end_m, ring_m=None, n=7, rot=0.0, cut=None, cut_m=None, ends=(True, True)):
    """a log from a to b: bark sides, end grain at the ends with a growth ring 4 mm proud; cut = a height fraction of the
    radius above which the log is hewn flat (a seat), cut_m its colour"""
    A_, B_ = Vector(a), Vector(b)
    d, hv, wv = frame(B_ - A_, (0, 1, 0))
    pts = [(math.cos(rot + 2 * math.pi * i / n), math.sin(rot + 2 * math.pi * i / n)) for i in range(n)]
    if cut is not None:                                                                 # clip the section at the cut line
        out = []
        for i in range(n):
            p, q = pts[i], pts[(i + 1) % n]
            if p[1] <= cut:
                out.append(p)
            if (p[1] <= cut) != (q[1] <= cut):
                t = (cut - p[1]) / (q[1] - p[1]); out.append((p[0] + (q[0] - p[0]) * t, cut))
        pts = out
    m = len(pts)
    ring = lambda c, k=1.0: [c + (wv * px + hv * py) * r * k for px, py in pts]
    V_ = ring(A_) + ring(B_)
    for i in range(m):
        j = (i + 1) % m
        flat = cut is not None and abs(pts[i][1] - cut) < 1e-6 and abs(pts[j][1] - cut) < 1e-6
        A.poly([tuple(V_[i]), tuple(V_[j]), tuple(V_[m + j]), tuple(V_[m + i])], [(0, 1, 2, 3)], cut_m if flat else bark_m)
    for k, (c, s) in enumerate(((A_, -1), (B_, 1))):
        if not ends[k]:
            continue
        cap = ring(c)
        A.poly([tuple(p) for p in cap], [tuple(range(m))[::-1] if s < 0 else tuple(range(m))], end_m)
        if ring_m is not None:
            inner = [c + d * s * .004 + (wv * px + hv * py) * r * .55 for px, py in pts]
            A.poly([tuple(p) for p in inner], [tuple(range(m))[::-1] if s < 0 else tuple(range(m))], ring_m)


def billet(A, a, b, r, bark_m, split_m, a0=0.0, frac=.25):
    """a split billet (a quarter of a round): bark on the round side, pale split faces"""
    A_, B_ = Vector(a), Vector(b)
    d, hv, wv = frame(B_ - A_, (0, 1, 0))
    k = 3
    arcp = [(math.cos(a0 + 2 * math.pi * frac * i / k), math.sin(a0 + 2 * math.pi * frac * i / k)) for i in range(k + 1)]
    sec = [(0.0, 0.0)] + arcp
    ring = lambda c: [c + (wv * px + hv * py) * r for px, py in sec]
    V_ = ring(A_) + ring(B_); m = len(sec)
    for i in range(m):
        j = (i + 1) % m
        A.poly([tuple(V_[i]), tuple(V_[j]), tuple(V_[m + j]), tuple(V_[m + i])], [(0, 1, 2, 3)], bark_m if 1 <= i < m - 1 else split_m)
    A.poly([tuple(p) for p in V_[:m]], [tuple(range(m))[::-1]], split_m)
    A.poly([tuple(p) for p in V_[m:]], [tuple(range(m))], split_m)


def hatchet(A, top, bottom, side, haft, head, bit=.19):
    """an axe from the end of its haft (top) to the head (bottom): the haft swelling to the eye, a wedge head flaring to
    its bit along `side`, a short poll behind"""
    t, b = Vector(top), Vector(bottom)
    d, sv, nv = frame(b - t, side)
    A.tube(tuple(t), tuple(b + d * .03), .017, 6, haft, r2=.021)
    def ring(c, hd, hn):
        return [c + d * i * hd + nv * j * hn for i, j in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    e0 = ring(b - sv * .035, .045, .02); e1 = ring(b + sv * .035, .045, .02); bt = ring(b + sv * bit, .09, .004)
    V_ = e0 + e1 + bt
    A.poly([tuple(p) for p in V_], [(3, 2, 1, 0), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7),
                                    (4, 5, 9, 8), (5, 6, 10, 9), (6, 7, 11, 10), (7, 4, 8, 11), (8, 9, 10, 11)], head)


def tinderbox(A, x, z, y, rot, wood, inside, lid_open=True):
    """a tinderbox: a small box of boards, the char cloth dark inside, its lid swung open on the back edge"""
    c, s = math.cos(rot), math.sin(rot)
    P = lambda a, b, yy: (x + a * c - b * s, yy, z + a * s + b * c)
    w, dp, h, t = .1, .065, .055, .008
    for (a0, a1, b0, b1) in ((-w, w, -dp, -dp + t), (-w, w, dp - t, dp), (-w, -w + t, -dp + t, dp - t), (w - t, w, -dp + t, dp - t)):
        V_ = [P(a0, b0, y), P(a1, b0, y), P(a1, b1, y), P(a0, b1, y), P(a0, b0, y + h), P(a1, b0, y + h), P(a1, b1, y + h), P(a0, b1, y + h)]
        A.poly(V_, [(3, 2, 1, 0), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)], wood)
    A.poly([P(-w, -dp, y + .004), P(w, -dp, y + .004), P(w, dp, y + .004), P(-w, dp, y + .004)], [(0, 1, 2, 3)], wood)
    A.poly([P(-w + t, -dp + t, y + h - .02), P(w - t, -dp + t, y + h - .02), P(w - t, dp - t, y + h - .02), P(-w + t, dp - t, y + h - .02)], [(0, 1, 2, 3)], inside)
    if lid_open:                                                                          # the lid, swung open past upright on its back hinge
        a_ = math.radians(105); L = 2 * dp
        db, dy = math.cos(a_) * L, math.sin(a_) * L                                        # the lid's run from the hinge (local b, y)
        tb, ty = -math.sin(a_) * .008, math.cos(a_) * .008                                 # its thickness, to the back
        q = lambda a, bb, yy: P(a, bb, yy)
        V_ = [q(-w, -dp, y + h), q(w, -dp, y + h), q(w, -dp + db, y + h + dy), q(-w, -dp + db, y + h + dy)]
        V_ += [q(-w, -dp + tb, y + h + ty), q(w, -dp + tb, y + h + ty), q(w, -dp + db + tb, y + h + dy + ty), q(-w, -dp + db + tb, y + h + dy + ty)]
        A.poly(V_, [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], wood)


def striker(A, x, z, y, rot, m):
    """a steel fire striker lying flat: a C of bent steel"""
    pts = [(-.05, .012), (-.045, -.015), (0, -.022), (.045, -.015), (.05, .012)]
    c, s = math.cos(rot), math.sin(rot)
    P = [(x + a * c - b * s, y + .007, z + a * s + b * c) for a, b in pts]
    for p, q in zip(P, P[1:]):
        A.beam(p, q, .012, .008, m)


# =========================================================== under the canopy: the teaching bench
Cn = Part('Survival_FurnishingPropsCanopy')
bs = .46


def teaching_bench(A):
    """a plank bench on three pairs of splayed legs with a stretcher"""
    T.plank_top(A, -5.1, -.95, -3.45, -3.02, bs - .08, bs, [oak_l, oak], along='x', n=2, under=oak_d)
    for x in (-4.93, -3.0, -1.12):
        for z, s in ((-3.09, 1), (-3.38, -1)):
            A.beam((x + (.035 if s > 0 else -.035), .004, z + s * .05), (x, bs - .08, z), .07, .07, oak_d)
        A.box(x - .03, x + .03, bs - .14, bs - .08, -3.4, -3.07, oak)                         # a cleat under the planks
    A.box(-5.0, -1.05, .14, .2, -3.28, -3.2, oak_d)                                        # the stretcher


Cn.obj(teaching_bench)


def tinder_bundle(A):
    """a bundle of dry tinder grass, tied twice, its ends frayed"""
    a, b = Vector((-4.6, bs + .06, -3.25)), Vector((-3.95, bs + .06, -3.22))
    A.tube(tuple(a), tuple(b), .058, 7, tinder, cap_m=tinder_d)
    d = (b - a).normalized()
    for t in (.28, .72):
        c = a + (b - a) * t
        A.tube(tuple(c - d * .018), tuple(c + d * .018), .064, 7, twine, caps=False)
    for e, s in ((a, -1), (b, 1)):
        for k in range(3):
            ang = k * 2.1
            A.poly([tuple(e + Vector((0, math.cos(ang) * .04, math.sin(ang) * .04))), tuple(e + d * s * .07 + Vector((0, math.cos(ang) * .06, math.sin(ang) * .06))),
                    tuple(e + Vector((0, math.cos(ang + .6) * .04, math.sin(ang + .6) * .04)))], [(0, 1, 2)], tinder_d)


Cn.obj(tinder_bundle)


def fire_kit(A):
    """the tinderbox open with its char cloth, a flint and the steel striker beside it"""
    tinderbox(A, -3.35, -3.24, bs, .1, oak_l, charcloth)
    T.lump(A, -3.12, -3.3, bs + .004, .03, flint, rng)
    striker(A, -3.1, -3.16, bs, .4, steel)


Cn.obj(fire_kit)


def whet_knife(A):
    """a whetstone and the gutting knife laid by it"""
    A.rbox(-2.08, -3.24, .2, .06, bs, bs + .03, .05, whet)
    a, b = Vector((-2.62, bs + .012, -3.23)), Vector((-2.46, bs + .012, -3.235))
    A.beam(tuple(a), tuple(b), .024, .02, oak_d)
    A.poly([(-2.46, bs + .005, -3.222), (-2.25, bs + .005, -3.232), (-2.25, bs + .005, -3.243), (-2.46, bs + .005, -3.25)], [(0, 1, 2, 3)], steel)


Cn.obj(whet_knife)

# =========================================================== under the canopy: the gutting table
tt = .82


def gutting_table(A):
    """the gutting table: a planked top on two A-frame trestles, a cross tie and a stretcher"""
    T.plank_top(A, -5.65, -4.45, -1.95, -.65, tt - .07, tt, [oak_l, oak, oak_l], along='z', under=oak_d)
    for z in (-1.8, -.8):
        for s in (-1, 1):
            A.beam((-5.05 + s * .45, .004, z), (-5.05 + s * .1, tt - .07, z), .07, .06, oak_d)
        A.box(-5.42, -4.68, .3, .36, z - .025, z + .025, oak)                                  # the cross tie
    A.box(-5.08, -5.02, .33, .39, -1.8, -.8, oak_d)                                        # the stretcher


Cn.obj(gutting_table)


def gutting_board(A):
    """the gutting board, a trout opened on it and one whole, the knife"""
    A.box(-5.4, -4.75, tt, tt + .025, -1.55, -1.05, board_c)                              # a scrubbed board
    y = tt + .025
    fish(A, (-5.32, y + .026, -1.43), (-4.88, y + .026, -1.47), (0, 0, -1), fish_b, fish_back, fish_f, gutted=guts)
    fish(A, (-5.3, y + .026, -1.17), (-4.84, y + .026, -1.2), (0, 0, 1), fish_b, fish_back, fish_f)
    A.beam((-4.72, tt + .012, -.93), (-4.6, tt + .012, -.89), .022, .02, oak_d)
    A.poly([(-4.84, tt + .005, -.97), (-4.72, tt + .005, -.93), (-4.72, tt + .005, -.945), (-4.84, tt + .005, -.982)], [(0, 1, 2, 3)], steel)


Cn.obj(gutting_board)


def creel(A):
    """a wicker creel: a tapered basket, its lid, a leather strap over it"""
    x, z = -5.35, -.85
    A.lathe(x, z, tt, [(.13, 0), (.15, .1), (.14, .16)], 8, wicker, top=False, rot=.3)
    for y in (.04, .1):
        A.lathe(x, z, tt + y, [(.146 + (y - .04) * .15 + .006, 0), (.146 + (y - .04) * .15 + .006, .018)], 8, wicker_d, top=False, rot=.3)
    A.lathe(x, z, tt + .16, [(.15, 0), (.15, .02), (.12, .04), (0, .05)], 8, wicker_d, top=False, rot=.3)
    arc(A, x, tt + .1, z, .16, 0, math.pi, math.pi / 2, .03, .008, leather, segs=6)


Cn.obj(creel)
Cn.build(root)

# =========================================================== the drying pole, hung from the truss (clipped with the roof)
Hg = Part('Survival_FurnishingPropsHung')


def drying_pole(A):
    """a peeled pole hung from the truss on two cords, trout hung by their tails and bundles of herbs tied on cords"""
    y = 2.62; z = -2.1
    A.tube((-3.5, y, z), (-1.65, y, z), .04, 6, peeled, r2=.034, cap_m=endg)
    for x in (-3.4, -1.75):
        A.tube((x, y + .03, z), (x, 2.98, z), .009, 4, cord)
        A.tube((x - .045, y - .01, z), (x + .045, y - .01, z), .046, 6, cord, caps=False)
    for i in range(6):
        hx = -3.3 + i * .3
        A.tube((hx, y - .03, z), (hx, 2.44, z), .007, 4, twine)
        if i % 2 == 0:
            fish(A, (hx + .01, 2.22, z), (hx, 2.44, z), (1, 0, 0), fish_b, fish_back, fish_f, w=.04, h=.075)
        else:
            for k in range(5):                                                             # a bundle of herbs, tied
                a = k * 2 * math.pi / 5
                p0 = Vector((hx, 2.43, z)); p1 = Vector((hx + math.cos(a) * .045, 2.25, z + math.sin(a) * .045))
                A.poly([tuple(p0 + Vector((-.01, 0, 0))), tuple(p0 + Vector((.01, 0, 0))), tuple(p1 + Vector((.03, 0, 0))), tuple(p1 + Vector((-.03, 0, 0)))], [(0, 1, 2, 3)], herb[k % 2])
            A.tube((hx, 2.41, z), (hx, 2.445, z), .016, 5, twine, caps=False)


Hg.obj(drying_pole)
Hg.build(root)

# =========================================================== the store shed (floor 0.6): stores crate, salt barrel
St = Part('Survival_FurnishingPropsStore')
SF = .6


def stores_crate(A):
    """a battened crate of camp stores with its lid on, a horn lantern set on it"""
    T.crate(A, 4.88, 5.67, SF + .004, SF + .7, -1.14, -.28, crateb, batten)
    T.lantern(A, 5.14, -.52, SF + .71, iron, lamp, h=.26)


St.obj(stores_crate)


def salt_barrel(A):
    """the salt barrel for curing the catch: open, the salt heaped in it, a wooden scoop"""
    T.barrel(A, 2.65, -.62, SF + .004, .29, .85, staves, iron, heads, rot=.3, open_top=True, fill=salt)
    top = SF + .004 + .85 - .025 - .06
    A.lathe(2.65, -.62, top, [(.2, 0), (.12, .05), (0, .08)], 8, salt, top=False)
    A.lathe(2.7, -.66, top + .04, [(.035, 0), (.05, .04), (.055, .05)], 8, oak_l, top=True, top_m=salt)
    A.tube((2.74, top + .08, -.68), (2.86, top + .2, -.73), .012, 5, oak_l)


St.obj(salt_barrel)
St.build(root)

# =========================================================== the yard (floor -0.4): log seats
YF = -.4
Yd = Part('Survival_FurnishingPropsYard')


def log_seat(A, a, b):
    """a seat hewn flat from a bark-covered log, its end grain showing a ring"""
    log_round(A, a, b, .195, bark, endg, ring_c, n=8, rot=math.pi / 8, cut=.75, cut_m=hewn)


Yd.obj(log_seat, (-3.95, YF + .186, 2.87), (-3.95, YF + .186, 4.13))
Yd.obj(log_seat, (-3.23, YF + .186, 4.75), (-1.77, YF + .186, 4.75))
Yd.build(root)

# =========================================================== the fire ring (service 'Fire ring', name and box kept)
FX, FZ = -2.5, 3.5
Fp = Part('Survival_ServiceFirePit_Ring')


def fire_ring(A):
    """a ring of fire-blackened stones round a bed of ash, split logs leant in a cone over glowing embers, a tripod of
    poles lashed at its head with a pot hook and a bellied iron pot of stew on its bail"""
    for i in range(11):
        a = i * 2 * math.pi / 11
        T.lump(A, FX + math.cos(a) * .44, FZ + math.sin(a) * .44, YF - .015, .125, stone[i % 2] if i % 4 else stone[2], rng)
    A.lathe(FX, FZ, YF + .004, [(.37, 0), (.34, .025), (0, .04)], 10, ash_bed, top=False)
    Q.lumps(A, FX - .16, FX + .16, FZ - .16, FZ + .16, YF + .03, YF + .1, [soot, glow], rng, n=6, rmin=.03, rmax=.05)
    for i in range(4):
        a = i * math.pi / 2 + .4
        b0 = (FX + math.cos(a) * .3, YF + .05, FZ + math.sin(a) * .3); b1 = (FX + math.cos(a) * .04, YF + .42, FZ + math.sin(a) * .04)
        log_round(A, b0, b1, .045, bark_l, endg, n=5, rot=a)
        A.tube(tuple(Vector(b1) - (Vector(b1) - Vector(b0)).normalized() * .1), b1, .049, 5, soot, caps=False)   # charred where it burns
    apex = Vector((FX, YF + 1.43, FZ))
    for i in range(3):
        a = i * 2 * math.pi / 3 + .5
        A.tube((FX + math.cos(a) * .5, YF + .004, FZ + math.sin(a) * .5), tuple(apex + Vector((math.cos(a) * -.06, .06, math.sin(a) * -.06))), .026, 6, peeled, r2=.021)
    A.lathe(FX, FZ, YF + 1.36, [(.045, 0), (.045, .06)], 6, cord, top=False)               # the lashing
    A.tube((FX, YF + 1.37, FZ), (FX, YF + .96, FZ), .008, 4, iron)                           # the pot hook's chain
    A.lathe(FX, FZ, YF + .5, [(.1, 0), (.16, .07), (.175, .16), (.16, .25), (.15, .28), (.165, .3)], 10, iron, top=True, top_m=stew)
    arc(A, FX, YF + .8, FZ, .17, 0, math.pi, 0, .014, .014, iron_w, segs=6)                 # the pot's bail on the hook


Fp.obj(fire_ring)
Fp.build(root)

# =========================================================== the log pile (service 'Log pile', name and box kept)
Lp = Part('Survival_ServiceLogPile_Stack')
LB = .44


def log_pile(A):
    """split logs and rounds stacked on two sleepers between stakes, their ends showing rings and split faces"""
    for bz in (.35, .85):
        A.box(3.05, 6.0, -.139, LB, bz - .07, bz + .07, oak_d)                              # sleepers
    lrng = random.Random(515)
    for row, count in enumerate((9, 8, 7, 5)):
        for i in range(count):
            x = 3.25 + i * .31 + row * .155 + lrng.uniform(-.02, .02); y = LB + .14 + row * .26
            z0, z1 = .28 + lrng.uniform(-.04, .04), .98 + lrng.uniform(-.05, .05)
            if (i + row) % 3 == 1:
                billet(A, (x, y - .1, z0), (x, y - .1, z1), .24, bark, split_c, a0=lrng.uniform(0, 6.28) * 0 + math.pi / 4, frac=.25)
            else:
                log_round(A, (x, y, z0), (x, y, z1), .135, bark if i % 2 else bark_l, endg, ring_c, n=6, rot=lrng.random())
    for sx in (3.0, 6.05):                                                                 # stakes, pointed at the top
        A.beam((sx, LB - .1, .62), (sx, LB + .98, .62), .08, .08, oak_d)
        A.poly([(sx - .04, LB + .98, .58), (sx + .04, LB + .98, .58), (sx + .04, LB + .98, .66), (sx - .04, LB + .98, .66), (sx, LB + 1.05, .62)],
               [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4)], oak_d)


def chopping_block(A):
    """the chopping block, its top scored by the axe, the axe bitten into it"""
    bx, by, bz = 5.5, .141, 1.5
    log_round(A, (bx, by, bz), (bx, by + .65, bz), .27, bark, endg, ring_c, n=8, rot=.2, ends=(False, True))
    top = by + .65
    for k, (dx, dz, r) in enumerate(((-.1, .05, .4), (.06, -.08, 1.9), (.02, .1, 2.7))):
        c, s = math.cos(r), math.sin(r)
        A.poly([(bx + dx - c * .1 - s * .005, top + .009, bz + dz - s * .1 + c * .005), (bx + dx + c * .1 - s * .005, top + .009, bz + dz + s * .1 + c * .005),
                (bx + dx + c * .1 + s * .005, top + .009, bz + dz + s * .1 - c * .005), (bx + dx - c * .1 + s * .005, top + .009, bz + dz - s * .1 - c * .005)], [(0, 1, 2, 3)], soot)
    hatchet(A, (4.95, top + .55, 1.4), (5.42, top + .03, 1.5), (1, -.45, 0), ash_n, iron_w, bit=.17)


def billets(A):
    """split billets lying by the block, fresh from the axe"""
    # (each kept to its old piece's reach: the walk along the south edge passes them as it passed those)
    for (sx, sz, g, r, L) in ((5.95, 2.0, .335, .12, .26), (5.1, 2.05, .207, .14, .3), (6.1, 1.2, .395, .14, .3)):
        billet(A, (sx - r / 2, g + .004, sz - .05), (sx - r / 2, g + .004, sz + L), r, bark_l, split_c, a0=0.0, frac=.25)


Lp.obj(log_pile)
Lp.obj(chopping_block)
Lp.obj(billets)
Lp.build(root)

# =========================================================== the tool rack in the store (service 'Tool rack', name and box kept)
Tr = Part('Survival_ServiceTools_Rack')


def tool_rack(A):
    """posts and rails against the north wall, a shelf, pegs: a spare hatchet hung by its haft, a tinderbox with flint and
    steel and a spare line on the shelf, a hand net on its hoop, a fishing rod against the post, a coil of line"""
    for rx in (3.35, 5.65):
        T.oct_prism(A, rx, -3.81, .06, .09, SF + .004, SF + 2.2, oak)
    for ry in (SF + 1.05, SF + 1.75):
        A.box(3.25, 5.75, ry, ry + .1, -3.85, -3.73, oak_d)
    A.box(3.3, 4.4, SF + 1.02, SF + 1.06, -3.89, -3.55, oak_l)                              # the shelf
    for x in (3.4, 4.3):
        A.beam((x, SF + 1.02, -3.58), (x, SF + .86, -3.72), .03, .03, oak_d)                  # its brackets
    for px in (3.6, 4.1, 4.7, 5.3):
        A.tube((px, SF + 1.8, -3.73), (px, SF + 1.81, -3.56), .016, 6, oak_d)                  # pegs
    hatchet(A, (4.7, SF + 1.82, -3.62), (4.7, SF + 1.25, -3.62), (1, 0, 0), ash_n, iron_w, bit=.2)
    tinderbox(A, 3.64, -3.72, SF + 1.06, 0.0, oak_l, charcloth)
    T.lump(A, 3.93, -3.7, SF + 1.064, .035, flint, rng)
    striker(A, 4.12, -3.68, SF + 1.06, .2, steel)
    A.tube((4.26, SF + 1.1, -3.74), (4.26, SF + 1.1, -3.64), .038, 8, oak_l)                  # a spare line on its spool
    A.tube((4.26, SF + 1.1, -3.725), (4.26, SF + 1.1, -3.655), .046, 8, twine, caps=False)
    # the hand net: its hoop and handle hung from the peg, the mesh of cords across the hoop
    hc = Vector((5.3, SF + 1.25, -3.63))
    Q.ring(A, tuple(hc), (0, 0, 1), .25, .026, oak_l, segs=10)
    A.tube(tuple(hc + Vector((0, .26, 0))), (5.3, SF + 1.8, -3.63), .018, 6, oak_l)
    for k in (-.16, -.05, .06, .17):
        h = (.24 ** 2 - k * k) ** .5
        A.beam(tuple(hc + Vector((k, -h, .012))), tuple(hc + Vector((k, h, .012))), .01, .006, twine)
        A.beam(tuple(hc + Vector((-h, k, .018))), tuple(hc + Vector((h, k, .018))), .01, .006, twine)
    # the fishing rod against the east post, its line coiled at its foot
    A.tube((5.52, SF + .01, -3.6), (5.6, SF + 2.1, -3.7), .014, 5, peeled, r2=.007)
    Q.coil(A, 5.3, -3.62, SF + .004, .12, .05, twine, turns=2, end_a=2.8)


Tr.obj(tool_rack)
Tr.build(root)

# ---- early warning: does any new part reach into a stance or a link of the graph the island uses now? ----
nav = ROOT / '.studio-workspaces' / SP['referenceGraph'] / 'candidates' / 'navigation.json'
near = PK.clearance(nav, ['Survival_FurnishingPropsCanopy', 'Survival_FurnishingPropsHung', 'Survival_FurnishingPropsStore', 'Survival_FurnishingPropsYard',
                          'Survival_ServiceFirePit_Ring', 'Survival_ServiceLogPile_Stack', 'Survival_ServiceTools_Rack'])
print('[PROPS_PASS_CLEARANCE]', near)
PK.REPORT['notes'].append({'clearance': near})
PK.save(SP, ROOT)
