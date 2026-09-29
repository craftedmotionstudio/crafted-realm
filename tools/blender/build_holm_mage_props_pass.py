"""Mage tower props pass (owner, 2026-09-28: "props ... blocky -> redo in Blender purposefully"; "every object in every
building reviewed in Blender"). The mage's house is where the island learns its runes: a timber study wing where the
tutor lives and brews, a stone tower with the rune workroom on the ground, the library at 3 m and the open observatory at
6 m, and a practice yard where the magic trial is cast at the practice rats. Its things are a rune-caster's things: candles,
scrolls, tomes, rune stones, crystals, phials, star charts, an armillary.

From the model the island loads (holm-mage-glazed-review4-v1/mage.blend, Blender 5.1). Every prop object was a v1 box
(shelf units of coloured boxes, slab tables, a pole with a cylinder on it) or the m44 dressing's random jars and
candles; they are all taken away and designed again, each in its old plan box and at its old height, so the same tiles
and links stay blocked (the hearth, rune-table and chart-table edges that block a tile by 4 cm keep those edges; the
telescope's eyepiece and the stool still close the two links they closed) and every stance, link and target of the
graph is unchanged:

 study wing (ground, Mage_FurnishingPropsStudy)
  - the west bookcase (a shelf unit of boxes): a tall case with plinth and cornice, four shelves of standing and
    leaning books with gilt bands, a stack lying flat, a crystal cluster, a stoppered bottle and a scroll;
  - the hearth (stone slab, two stone boxes, a clay cone for a fire): coursed stone jambs, an iron fireback, a stone
    lintel, an oak mantel beam and shelf, firedogs with three logs burning on an ember bed, and a cauldron of green
    brew hung from a trammel over the fire; on the mantel two candlesticks, three ingredient jars, an hourglass and a
    crystal on a dish;
  - the desk (a slab on four sticks): a walnut writing desk with turned legs and a drawer, a writing slope with a
    half-written sheet, a gallery of pigeonholes with scrolls, two books, the inkwell and quill, a candle;
  - the table and bench in the south room (slabs): the reagent table - square legs, a pot board with two crocks, a
    mortar and pestle, bundles of drying herbs, a rack of four phials, a crystal ball on its brass stand, a recipe
    book, a candle - and a plank bench;
  - the potion shelf by the east door (boxes on shelves): an apothecary shelf of corked bottles, flasks and labelled
    crocks;
 rune workroom (tower ground, Mage_FurnishingPropsWorkroom + the service Mage_ServiceRuneTable_Workroom)
  - the rune cabinet (a box shelf unit): a dresser - panelled cupboard, worktop, open shelves - of rune jars each
    labelled with its rune's mark, a tray of rune stones, a rune pouch, a glowing crystal cluster, books;
  - the window bench: a boarded window seat with a tufted velvet cushion, bolsters and two books left on it;
  - the candle stand (a pole and a cylinder): a wrought-iron candelabrum, three splayed feet, three candles;
  - the rune table (service 'Runes laid out in rows, air to chaos'; name kept): a heavy table with turned legs and an
    H stretcher, a velvet runner hanging over the side the student stands, two rows of rune stones air to chaos each
    with its own mark, the primer open, a rune pouch, a bowl of blank essence, a candlestick;
 library (3 m, Mage_UpperFurnishingPropsLibrary + the service Mage_ServiceLectern_Library)
  - the four bookcases (box shelf units): library cases of standing books with gilt bands, one with a shelf of scroll
    cubbies, one with folios lying in stacks, one with jars and a crystal, one with a brass astrolabe (each case in
    its old envelope: the stances beside them are 2 cm away);
  - the lectern (service 'A heavy book of spells lies open'; name kept): cross feet, a turned column, a sloped desk
    with a ledge, the spell book open on it with an illuminated initial, a rune-circle diagram and a ribbon; a pricket
    candle stand beside it;
 observatory (6 m, Mage_UpperFurnishingPropsObservatory + the service Mage_ServiceTelescope_Observatory)
  - the chart table: turned legs, an apron, a shelf of rolled charts; the star chart spread with its constellations,
    a brass planisphere ring, dividers, two chart weights, an hourglass, a lantern;
  - the armillary (rings on a pole): a brass armillary sphere - meridian in its crescent, horizon, equator, ecliptic
    band, colure - round a small globe with its pole rod, on a turned oak stand with three feet;
  - the stool: a round observer's stool with a cushion (it keeps the old stool's reach: two links end at it);
  - the telescope (service 'A brass telescope pointed at the sky'; name kept): the old tube on its old line, now brass
    with bands, a dew shield and its lens, a drawtube and eyepiece, a finder; a fork mount on a tripod head; three
    legs to the old feet, a spreader between them;
 practice yard (Mage_Yard; name kept; on the island ground, now seated on the v2 terrain it stands on)
  - the split-rail fence post by post in the old line, rails in the old rows; the gate posts and the gate, open as it
    was, framed and braced with strap hinges; the rat hutch (was a coop) on legs with a slatted front, a door, a
    ramp and a thatched roof whose eaves reach as the coop's did; the spell target, a straw boss painted in rings and
    scorched, on its A-frame; the practice dummy with a straw body, a sack head and a battered pointed hat, on cross
    feet; the water trough on its chocks.
Plan coordinates (x east, y up, z south; Blender (x, -z, y)), mage-local. Original designs.
Run through tools/rebuild_holm_props_pass.js mage (spec docs/rebuild/holm-overhaul/props-pass/mage.json)."""
import bpy, sys, math, random, json
from pathlib import Path
from mathutils import Vector
HERE = Path(__file__).resolve().parent; sys.path.insert(0, str(HERE)); ROOT = HERE.parents[1]
import holm_props_pass_kit as PK
from holm_props_pass_kit import C, Part
import holm_trade_props as T
from holm_purposeful_props import arc, ellipsoid

SP = PK.spec()
PK.begin()
TRIS = []                                   # (part, object, triangles): printed to the build log for the report
_part_obj = Part.obj


def _counted_obj(self, fn, *a, **kw):
    n0 = sum(len(f) - 2 for f in self.f)
    r = _part_obj(self, fn, *a, **kw)
    TRIS.append((self.name, getattr(fn, '__name__', '?'), sum(len(f) - 2 for f in self.f) - n0))
    return r


Part.obj = _counted_obj
root = PK.obj('Mage_Root')
PK.remove('Mage_Furnishing', 'Mage_FurnishingDressing', 'Mage_UpperFurnishing', 'Mage_UpperFurnishingDressing', 'Mage_Yard',
          'Mage_ServiceRuneTable_Workroom', 'Mage_ServiceLectern_Library', 'Mage_ServiceTelescope_Observatory')

# ============================================================== palette (sRGB as the game shows it)
oak = C('mage oak', '#6a4a30', 'beam'); oak_l = C('mage oak light', '#7c5a3a', 'beam'); oak_d = C('mage oak dark', '#4a3322', 'beam')
walnut = C('mage walnut', '#5a3a28', 'beam'); walnut_l = C('mage walnut light', '#6c4832', 'beam'); endg = C('mage end grain', '#8a6843', 'beam')
bark = C('mage log bark', '#5a4232', 'beam'); weather = C('mage weathered oak', '#7a6246', 'beam'); weather_d = C('mage weathered oak dark', '#5e4a36', 'beam')
stone = [C('mage hearth stone', '#8e897b', 'rock'), C('mage hearth stone warm', '#978a76', 'rock'), C('mage hearth stone cool', '#7d7a70', 'rock')]
slab = C('mage hearth slab', '#6f6b61', 'rock')
iron = C('mage iron', '#3a3b3a'); iron_l = C('mage iron worn', '#56585a'); soot = C('mage soot', '#2b2826')
brass = C('mage brass', '#b39146'); brass_d = C('mage brass dark', '#8a6d32'); lead = C('mage lead', '#6f7274')
wax = C('mage candle wax', '#efe6c8'); flame = C('mage candle flame', '#ffc15a', emit=1.5)
fire = C('mage fire', '#ffa040', emit=1.6); ember = C('mage embers', '#d8502a', emit=1.2); brew = C('mage brew', '#6fce4a', emit=.9)
paper = C('mage parchment', '#d9c89a'); paper_l = C('mage parchment pale', '#e6d9b2'); ink = C('mage ink', '#1f1c1a')
bookc = [C('mage book red', '#7a2e25'), C('mage book blue', '#2f4d6b'), C('mage book green', '#3f5e37'), C('mage book ochre', '#8a6a2a'),
         C('mage book violet', '#5a3a5e'), C('mage book brown', '#5e3f26'), C('mage book teal', '#2f5a58')]
gilt = C('mage gilt', '#c9a24a')
velvet = C('mage velvet', '#46306a'); velvet_l = C('mage velvet light', '#5e428a'); cloth_b = C('mage cloth blue', '#34497e'); tassel = C('mage tassel', '#c9a24a')
glass = [C('mage glass green', '#5f8f5a'), C('mage glass blue', '#4a6f9a'), C('mage glass amber', '#a8742e'), C('mage glass pale', '#b8c8c4')]
potion = [C('mage potion red', '#b0302c'), C('mage potion blue', '#3a58b0'), C('mage potion green', '#4c9a3a'), C('mage potion violet', '#7a44a0')]
cork = C('mage cork', '#a0784a'); twine = C('mage twine', '#8a6c44'); label = C('mage label', '#e8dcb8')
clay = [C('mage clay jar', '#a85f39'), C('mage glazed green', '#6f8a63'), C('mage stoneware', '#cbbd98'), C('mage glazed blue', '#52708f'), C('mage glazed brown', '#7a4a2a')]
crystal = C('mage crystal', '#8fb0e0', emit=.8); crystal_v = C('mage crystal violet', '#b08ae0', emit=.7)
orb = C('mage crystal ball', '#b8d0e8', emit=.35)
rstone = C('mage rune stone', '#a29e94'); rstone_d = C('mage rune stone dark', '#8c887e'); essence = C('mage rune essence', '#dcdad2')
RUNES = [('air', '#eef2f4'), ('water', '#3f72c0'), ('earth', '#6e8a3a'), ('fire', '#d0452a'), ('mind', '#e08a2a'), ('body', '#6aa0c8'), ('chaos', '#a03a8a')]
runec = [C('mage rune ' + n, h) for n, h in RUNES]
herb = [C('mage herb green', '#5a7a3a'), C('mage herb sage', '#7a8a5a'), C('mage herb lavender', '#8a6aa8')]
leather = C('mage leather', '#5a3a22')
chart = C('mage star chart', '#1f2a55'); star = C('mage star', '#f0e6b0'); cline = C('mage chart line', '#8fa0c8')
lens = C('mage lens', '#2a3a5a'); sand = C('mage sand', '#d8b878')
straw = C('mage straw', '#c9a650', 'thatch'); straw_d = C('mage straw dark', '#a8863c', 'thatch')
paint_b = C('mage target blue', '#4a5f9a'); paint_w = C('mage target white', '#e6e0cc'); paint_r = C('mage target red', '#b8402c')
scorch = C('mage scorch', '#3a2e24')
sackc = C('mage sackcloth', '#b8a47a'); hatc = C('mage hat', '#3e4a7a'); hatb = C('mage hat band', '#8a6a2a'); face = C('mage face paint', '#2a2420')
water = C('mage trough water', '#4f6a72')

# ============================================================== the tower's octagon faces
OV = [(2 + 4 * math.cos(math.radians(45 * k)), -1 + 4 * math.sin(math.radians(45 * k))) for k in range(8)]


def seg(k):
    p0, p1 = OV[k], OV[(k + 1) % 8]
    L = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
    a = math.radians(22.5 + 45 * k)
    return p0, ((p1[0] - p0[0]) / L, (p1[1] - p0[1]) / L), (math.cos(a), math.sin(a)), L


def fp(k, u, w):
    """a plan point on tower face k: u along the face from its first corner, w along its outward normal (the wall's
    centre line at w = 0, the room side negative)"""
    p0, U, n, L = seg(k)
    return (p0[0] + U[0] * u + n[0] * w, p0[1] + U[1] * u + n[1] * w)


def inward(k):
    n = seg(k)[2]
    return (-n[0], -n[1])


def frot(k):
    """the face's u direction as a _rot angle (T.oct_prism, T.purse, book_tent); rbox-based helpers take -frot(k)"""
    U = seg(k)[1]
    return math.atan2(U[1], U[0])


BOXF = {'b': (0, 1, 5, 4), 't': (3, 7, 6, 2), 'f': (0, 3, 2, 1), 'k': (4, 5, 6, 7), 'l': (0, 4, 7, 3), 'r': (1, 2, 6, 5)}


def fbox(A, k, u0, u1, y0, y1, w0, w1, m, skip=''):
    """a box in tower face k's frame (u0..u1 along the face, w0..w1 across it; skip: b t f(ront, w0) k(back, w1) l r)"""
    P = lambda u, y, w: (fp(k, u, w)[0], y, fp(k, u, w)[1])
    V_ = [P(u0, y0, w0), P(u1, y0, w0), P(u1, y1, w0), P(u0, y1, w0), P(u0, y0, w1), P(u1, y0, w1), P(u1, y1, w1), P(u0, y1, w1)]
    A.poly(V_, [BOXF[s] for s in 'btfklr' if s not in skip], m)


def hexa(A, V_, m, skip=''):
    """a box from its 8 corners in fbox order"""
    A.poly(V_, [BOXF[s] for s in 'btfklr' if s not in skip], m)


def quad(A, c, right, up, hw, hh, m):
    """a single sheet centred at c spanned by the unit vectors right and up (half sizes hw, hh)"""
    c, r, u = Vector(c), Vector(right), Vector(up)
    A.poly([tuple(c - r * hw - u * hh), tuple(c + r * hw - u * hh), tuple(c + r * hw + u * hh), tuple(c - r * hw + u * hh)], [(0, 1, 2, 3)], m)


# ============================================================== small designed pieces
def candle(A, x, z, y, h, r=.02, holder=None):
    """a candle (on a dish when given) with a crossed flame of single sheets"""
    b = y
    if holder is not None:
        A.lathe(x, z, y, [(.045, 0), (.05, .01), (.03, .016), (.03, .03)], 8, holder, top=True)
        b = y + .03
    A.lathe(x, z, b, [(r, 0), (r, h), (r * .8, h + .006)], 8, wax, top=True)
    for a in (0, math.pi / 2):
        cc, s = math.cos(a) * .012, math.sin(a) * .012
        A.poly([(x - cc, b + h + .01, z - s), (x + cc, b + h + .01, z + s), (x, b + h + .065, z)], [(0, 1, 2)], flame)


def jar(A, x, z, y, r, h, body, lid=None, style=0, rot=0.0, n=6):
    """storage jars: 0 a lidded crock with a knob, 1 a tall jar with a tied cloth cover, 2 a squat pot with a lip"""
    if style == 0:
        A.lathe(x, z, y, [(r * .75, 0), (r, h * .35), (r * .9, h * .85), (r * .75, h)], n, body, top=True, rot=rot)
        A.lathe(x, z, y + h, [(r * .82, 0), (r * .82, .012), (r * .3, .035), (0, .06)], n, lid or body, rot=rot)
    elif style == 1:
        A.lathe(x, z, y, [(r * .8, 0), (r, h * .2), (r, h * .8), (r * .75, h)], n, body, top=False, rot=rot)
        A.lathe(x, z, y + h, [(r * .86, -.03), (r * .86, 0), (0, .025)], n, lid or paper, rot=rot)
        A.lathe(x, z, y + h * .9, [(r * .78, 0), (r * .78, .02)], n, twine, top=False, rot=rot)
    else:
        A.lathe(x, z, y, [(r * .7, 0), (r, h * .45), (r * .82, h * .85), (r * .9, h)], n, body, top=True, top_m=lid or body, rot=rot)


def marked_jar(A, x, z, y, r, h, body, lid, fdir, ki=None, style=0):
    """a jar turned so one flat faces the room (fdir), a label on that flat, a rune's mark painted on the label"""
    phi = math.atan2(fdir[1], fdir[0])
    jar(A, x, z, y, r, h, body, lid, style=style, rot=phi + math.pi / 6)
    ra = {0: .97, 1: 1.0, 2: .93}[style] * r * math.cos(math.pi / 6)
    right = Vector((-fdir[1], 0, fdir[0]))
    c = Vector((x + fdir[0] * (ra + .004), y + h * .52, z + fdir[1] * (ra + .004)))
    quad(A, c, right, (0, 1, 0), r * .3, h * .2, label)
    if ki is not None:
        quad(A, c + Vector((fdir[0], 0, fdir[1])) * .004, right, (0, 1, 0), r * .17, h * .12, runec[ki])


def bottle(A, x, z, y, h, g, style=0, rot=0.0):
    """glass (coloured by what is in it): 0 a round flask with a long neck, 1 a tall shouldered bottle, 2 a squat phial;
    corked"""
    if style == 0:
        A.lathe(x, z, y, [(h * .22, 0), (h * .31, h * .25), (h * .2, h * .5), (h * .07, h * .62), (h * .07, h * .9)], 6, g, top=False, rot=rot)
    elif style == 1:
        A.lathe(x, z, y, [(h * .17, 0), (h * .18, h * .6), (h * .07, h * .76), (h * .06, h * .9)], 6, g, top=False, rot=rot)
    else:
        A.lathe(x, z, y, [(h * .27, 0), (h * .3, h * .2), (h * .25, h * .6), (h * .1, h * .75), (h * .1, h * .88)], 6, g, top=False, rot=rot)
    A.lathe(x, z, y + h * .88, [(h * .085, 0), (h * .085, h * .16)], 5, cork, top=True, rot=rot)


def spike(A, a, b, r, m, n=6, rot=0.0):
    """a crystal: a hexagonal prism from a toward b, pointed at b"""
    a, b = Vector(a), Vector(b)
    d = (b - a); L = d.length; d.normalize()
    u = d.cross(Vector((0, 1, 0)))
    if u.length < .01:
        u = d.cross(Vector((1, 0, 0)))
    u.normalize(); w = d.cross(u).normalized()
    ring = lambda p, rr: [tuple(p + (u * math.cos(rot + 2 * math.pi * i / n) + w * math.sin(rot + 2 * math.pi * i / n)) * rr) for i in range(n)]
    V_ = ring(a, r * .85) + ring(a + d * L * .72, r) + [tuple(b)]
    F = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)] + [(n + i, n + (i + 1) % n, 2 * n) for i in range(n)] + [tuple(range(n - 1, -1, -1))]
    A.poly(V_, F, m)


def crystals(A, x, z, y, s, m, rot=0.0, n=4):
    """a cluster of crystals growing out of a rough stone"""
    A.lathe(x, z, y, [(s * .55, 0), (s * .6, s * .12), (s * .35, s * .25)], 6, rstone_d, top=True, rot=rot)
    for i in range(n):
        a = rot + i * 2 * math.pi / n + .3
        lean = .35 if i else 0.0
        off = s * .15 if i else 0.0
        bx, bz = x + math.cos(a) * off, z + math.sin(a) * off
        hgt = s * (1.2 if i == 0 else .75 + .12 * (i % 2))
        spike(A, (bx, y + s * .12, bz), (bx + math.cos(a) * hgt * lean, y + s * .12 + hgt, bz + math.sin(a) * hgt * lean), s * (.16 if i == 0 else .11), m, rot=a)


def hourglass(A, x, z, y, h, wood, rot=0.0):
    """an hourglass: two turned end boards, three spindles, the lower bulb full of sand, the upper one run low"""
    r = h * .32
    for yy in (y, y + h * .92):
        A.lathe(x, z, yy, [(r, 0), (r, h * .08)], 6, wood, top=True, rot=rot)
    for i in range(3):
        a = rot + i * 2 * math.pi / 3
        A.tube((x + math.cos(a) * r * .8, y + h * .08, z + math.sin(a) * r * .8), (x + math.cos(a) * r * .8, y + h * .92, z + math.sin(a) * r * .8), h * .03, 5, wood, caps=False)
    A.lathe(x, z, y + h * .08, [(r * .6, 0), (r * .62, h * .12), (r * .1, h * .42)], 6, sand, top=False, rot=rot)
    A.lathe(x, z, y + h * .5, [(r * .1, 0), (r * .62, h * .3), (r * .6, h * .42)], 6, glass[3], top=False, rot=rot)


def mortar(A, x, z, y, r, m, pestle):
    """a stone mortar, ground herbs in it, the pestle leaning in it"""
    A.lathe(x, z, y, [(r * .7, 0), (r, r * .3), (r * 1.05, r * .9), (r * .95, r * .98)], 8, m, top=False)
    A.lathe(x, z, y + r * .98, [(r * .95, 0), (r * .75, -r * .05), (r * .6, -r * .5)], 8, m, top=True, top_m=herb[1])
    A.tube((x - r * .2, y + r * .45, z), (x + r * .9, y + r * 2.2, z + r * .3), r * .16, 6, pestle, r2=r * .2)


def herb_bundle(A, a, b, r, green, tie):
    """a bundle of herbs laid to dry: stalks tied near the cut end, the leafy head spread"""
    a, b = Vector(a), Vector(b)
    d = (b - a)
    A.tube(tuple(a), tuple(a + d * .45), r * .45, 6, green, r2=r * .6)
    A.tube(tuple(a + d * .45), tuple(b), r * .6, 6, green, r2=r)
    p = a + d * .3
    A.tube(tuple(p - d.normalized() * .012), tuple(p + d.normalized() * .012), r * .55 + .006, 6, tie, caps=False)


def crystal_ball(A, x, z, y, r, stand, g):
    """a crystal ball on a brass stand of three claws"""
    A.lathe(x, z, y, [(r * .9, 0), (r * .9, r * .12), (r * .55, r * .22), (r * .4, r * .45), (r * .55, r * .6)], 8, stand, top=False)
    for i in range(3):
        a = i * 2 * math.pi / 3 + .5
        A.beam((x + math.cos(a) * r * .5, y + r * .55, z + math.sin(a) * r * .5), (x + math.cos(a) * r * .72, y + r * .95, z + math.sin(a) * r * .72), r * .12, r * .1, stand)
    ellipsoid(A, x, y + r * 1.45, z, r, r, r, g, seg=10, rings=6)


def book_tent(A, x, z, y, w, d, rot, cover, page):
    """a book left open face down: two covers pitched from the spine, the page edges under them"""
    c, s = math.cos(rot), math.sin(rot)
    P = lambda a, b, yy: (x + a * c - b * s, yy, z + a * s + b * c)
    h = .045
    for side in (-1, 1):
        A.poly([P(0, -d / 2, y + h), P(side * w / 2, -d / 2, y + .006), P(side * w / 2, d / 2, y + .006), P(0, d / 2, y + h)], [(0, 1, 2, 3)], cover)
        A.poly([P(side * .01, -d / 2 + .008, y + h - .012), P(side * (w / 2 - .01), -d / 2 + .008, y + .008), P(side * (w / 2 - .01), d / 2 - .008, y + .008), P(side * .01, d / 2 - .008, y + h - .012)], [(0, 1, 2, 3)], page)


def rune_stone(A, x, z, y, r, ki, rot=0.0):
    """a rune stone: a rounded slate tablet, its rune's mark cut in and coloured (air to chaos, each its own mark)"""
    A.lathe(x, z, y, [(r * .85, 0), (r, r * .25), (r * .62, r * .5)], 6, rstone if ki % 2 == 0 else rstone_d, top=True, rot=rot)
    t = y + r * .5 + .004; m = runec[ki]; s = r * .42
    c, sn = math.cos(rot), math.sin(rot)
    P = lambda a, b: (x + a * c - b * sn, t, z + a * sn + b * c)
    if ki == 0:     # air: three strokes of wind
        for k in (-1, 0, 1):
            A.poly([P(-s, k * s * .55 - s * .12), P(s, k * s * .55 - s * .12), P(s, k * s * .55 + s * .12), P(-s, k * s * .55 + s * .12)], [(0, 1, 2, 3)], m)
    elif ki == 1:   # water: a drop
        A.poly([P(0, -s * 1.1), P(s * .7, s * .2), P(0, s * .8), P(-s * .7, s * .2)], [(0, 1, 2, 3)], m)
    elif ki == 2:   # earth: a block over a bar
        A.poly([P(-s * .7, -s * .5), P(s * .7, -s * .5), P(s * .7, s * .4), P(-s * .7, s * .4)], [(0, 1, 2, 3)], m)
        A.poly([P(-s, s * .6), P(s, s * .6), P(s, s * .85), P(-s, s * .85)], [(0, 1, 2, 3)], m)
    elif ki == 3:   # fire: a flame of two tongues
        A.poly([P(-s * .8, s * .8), P(s * .8, s * .8), P(s * .2, -s * .2), P(0, -s * 1.1), P(-s * .3, -s * .1)], [(0, 1, 2, 3, 4)], m)
    elif ki == 4:   # mind: an eye
        A.poly([P(-s, 0), P(0, -s * .55), P(s, 0), P(0, s * .55)], [(0, 1, 2, 3)], m)
    elif ki == 5:   # body: a figure
        A.poly([P(-s * .18, -s * .5), P(s * .18, -s * .5), P(s * .18, s), P(-s * .18, s)], [(0, 1, 2, 3)], m)
        A.poly([P(-s * .8, -s * .15), P(s * .8, -s * .15), P(s * .8, s * .15), P(-s * .8, s * .15)], [(0, 1, 2, 3)], m)
    else:           # chaos: a broken star
        A.poly([P(math.cos(i * math.pi / 5) * s * (1 if i % 2 == 0 else .42), math.sin(i * math.pi / 5) * s * (1 if i % 2 == 0 else .42)) for i in range(10)], [tuple(range(10))], m)


def candlestick(A, x, z, y, metal, h=.14):
    """a turned candlestick (foot, stem, drip pan), its candle and a crossed flame"""
    A.lathe(x, z, y, [(.05, 0), (.05, .012), (.018, .03), (.014, .09), (.032, .1), (.03, .11)], 6, metal, top=True)
    A.lathe(x, z, y + .11, [(.016, 0), (.016, h), (.012, h + .006)], 6, wax, top=True)
    b = y + .11 + h
    for a in (0, math.pi / 2):
        cc, s_ = math.cos(a) * .012, math.sin(a) * .012
        A.poly([(x - cc, b + .01, z - s_), (x + cc, b + .01, z + s_), (x, b + .065, z)], [(0, 1, 2)], flame)


def tome(A, x, z, y, w, d, t, cover, page, rot=0.0):
    """a closed book lying flat: cover boards a little larger than the page block, the spine on its -a side (one
    rotation convention throughout: T.closed_book places its spine with the other one, so a turned book's spine
    lands on the wrong side)"""
    c, s_ = math.cos(rot), math.sin(rot)
    A.rbox(x, z, w, d, y, y + .006, rot, cover)
    A.rbox(x + .004 * c, z - .004 * s_, w - .015, d - .012, y + .006, y + t - .006, rot, page)
    A.rbox(x, z, w, d, y + t - .006, y + t, rot, cover)
    a = -w / 2 + .006
    A.rbox(x + a * c, z - a * s_, .012, d, y + .006, y + t - .006, rot, cover)


def scroll(A, a, b, r, m, ribbon=None):
    """a rolled scroll (six-sided), a ribbon round its middle"""
    a, b = Vector(a), Vector(b)
    A.tube(tuple(a), tuple(b), r, 6, m)
    if ribbon is not None:
        mid = (a + b) / 2; d = (b - a).normalized()
        A.tube(tuple(mid - d * .012), tuple(mid + d * .012), r + .004, 6, ribbon, caps=False)


def book_row(A, P, u0, u1, y, wf, wb, rng, hmin=.2, hmax=.34, band=.25):
    """standing books shoulder to shoulder from u0 to u1, spines out at wf (P(u, y, w) maps the row's frame to plan
    space; w grows toward the back): each book its spine, its top and the side it shows over a shorter neighbour;
    gilt bands on some spines; returns where the row ends"""
    books = []; u = u0; last = -1
    while u < u1 - .03:
        t = rng.uniform(.05, .1)
        if u + t > u1:
            t = u1 - u
            if t < .03:
                break
        ci = rng.randrange(len(bookc))
        while ci == last:
            ci = rng.randrange(len(bookc))
        last = ci
        books.append((u, t, rng.uniform(hmin, hmax), bookc[ci], rng.random() < band))
        u += t
    Q = lambda pts, m: A.poly([P(*p) for p in pts], [(0, 1, 2, 3)], m)
    for i, (u, t, h, m, bd) in enumerate(books):
        Q([(u, y, wf), (u + t, y, wf), (u + t, y + h, wf), (u, y + h, wf)], m)
        Q([(u, y + h, wf), (u + t, y + h, wf), (u + t, y + h, wb), (u, y + h, wb)], m)
        hp = books[i - 1][2] if i else 0.0
        hn = books[i + 1][2] if i + 1 < len(books) else 0.0
        if h > hp:
            Q([(u, y + hp, wf), (u, y + h, wf), (u, y + h, wb), (u, y + hp, wb)], m)
        if h > hn:
            Q([(u + t, y + hn, wf), (u + t, y + h, wf), (u + t, y + h, wb), (u + t, y + hn, wb)], m)
        if bd:
            for yy in (y + h * .8, y + h * .15):
                Q([(u + .006, yy, wf - .004), (u + t - .006, yy, wf - .004), (u + t - .006, yy + .012, wf - .004), (u + .006, yy + .012, wf - .004)], gilt)
    return u


def books_row(A, k, u0, u1, y, wf, wb, rng, hmin=.2, hmax=.34, band=.25):
    """standing books along tower face k (see book_row)"""
    return book_row(A, lambda u, yy, w: (fp(k, u, w)[0], yy, fp(k, u, w)[1]), u0, u1, y, wf, wb, rng, hmin, hmax, band)


# ============================================================== the study wing (ground floor)
S = Part('Mage_FurnishingPropsStudy')


def bookcase(A):
    """the study's tall bookcase on the west wall: plinth, sides, cornice, four shelves of books and curios"""
    x0, x1, z0, z1 = -5.845, -5.425, -1.78, -.735
    A.box(x0, x1, 0, 2.05, z0, z0 + .035, oak, skip='b')                          # sides
    A.box(x0, x1, 0, 2.05, z1 - .035, z1, oak, skip='b')
    A.box(x0, x0 + .03, 0, 2.0, z0 + .035, z1 - .035, oak_d, skip='b')            # back
    A.box(x0 + .03, x1 - .012, 0, .09, z0 + .035, z1 - .035, oak_d, skip='b')    # plinth
    A.box(x0 + .03, x1 - .01, 2.0, 2.05, z0 + .035, z1 - .035, oak)               # top board
    A.box(x0, x1, 2.05, 2.13, z0, z1, oak_d)                                      # cornice over the sides
    shelves = [.09, .56, 1.03, 1.5]
    for y in shelves[1:]:
        A.box(x0 + .03, x1 - .015, y - .03, y, z0 + .035, z1 - .035, oak_l)
    r = random.Random(71)
    P = lambda u, y, w: (-w - 6.0, y, u)                  # the row frame: u along the case (z), w = -x - 6 (front -.555)
    wf, wb = -.555, -.2
    for si, y in enumerate(shelves):
        top = (shelves[si + 1] - .03) if si + 1 < len(shelves) else 2.0
        hmax = min(.36, top - y - .03)
        if si == 1:                                                                  # books, a stack lying flat with a crystal on it, books
            book_row(A, P, z0 + .04, z0 + .16, y, wf, wb, r, hmax=hmax)
            yy = y; z = z0 + .19
            for kk, (wd, th) in enumerate(((.3, .05), (.27, .045), (.24, .04))):
                A.box(x0 + .06, x0 + .06 + wd, yy, yy + th, z, z + .2 - kk * .015, bookc[(kk + 2) % 7], skip='b' if kk == 0 else '')
                A.box(x0 + .065, x0 + .055 + wd, yy + .006, yy + th - .006, z + .2 - kk * .015, z + .204 - kk * .015, paper_l, skip='n')
                yy += th
            crystals(A, x1 - .12, z + .1, yy, .09, crystal_v, rot=.4, n=3)
            book_row(A, P, z0 + .45, z1 - .04, y, wf, wb, r, hmax=hmax)
        elif si == 2:                                                                # books, a stoppered bottle and a scroll, books
            book_row(A, P, z0 + .04, z0 + .5, y, wf, wb, r, hmax=hmax)
            bottle(A, x1 - .14, z0 + .56, y, .2, glass[0], style=1)
            scroll(A, (x0 + .08, y + .031, z0 + .66), (x1 - .04, y + .031, z0 + .66), .03, paper, ribbon=bookc[0])
            book_row(A, P, z0 + .72, z1 - .04, y, wf, wb, r, hmax=hmax)
        else:                                                                        # a full row, the last book leaning on the side
            book_row(A, P, z0 + .04, z1 - .14, y, wf, wb, r, hmax=hmax)
            m = bookc[(si + 3) % 7]; zz = z1 - .045; h = .28; lean = .09
            V_ = [(x0 + .05, y, zz - .045 - lean), (x1 - .03, y, zz - .045 - lean), (x1 - .03, y + h, zz - .045), (x0 + .05, y + h, zz - .045),
                  (x0 + .05, y, zz - lean), (x1 - .03, y, zz - lean), (x1 - .03, y + h, zz), (x0 + .05, y + h, zz)]
            hexa(A, V_, m, skip='b')


S.obj(bookcase)


def hearth(A):
    """the study hearth: a stone slab, coursed stone jambs, an iron fireback, a stone lintel, an oak mantel beam and
    shelf (its east end keeps the old reach over the tile beside it); firedogs, three logs burning on the embers; a
    cauldron of green brew hung from a trammel over the fire"""
    zb = -1.82
    A.box(-5.2, -3.8, 0, .05, zb, -1.25, slab, skip='b')
    for side, (jx0, jx1) in enumerate(((-5.2, -4.9), (-4.1, -3.8))):
        for ci, (y0, y1) in enumerate(((.05, .44), (.44, .82), (.82, 1.2))):
            d = .012 if ci % 2 else 0
            A.box(jx0 - d, jx1 + d, y0, y1, zb, -1.4 + d, stone[(ci + side) % 3], skip='b' if ci == 0 else '')
    fb = [(-4.85, .05), (-4.15, .05), (-4.15, .62), (-4.3, .74), (-4.5, .78), (-4.7, .74), (-4.85, .62)]      # the fireback
    A.poly([(x, y, zb + .012) for x, y in fb] + [(x, y, zb + .03) for x, y in fb],
           [tuple(range(6, -1, -1)), tuple(range(7, 14))] + [(i, (i + 1) % 7, 7 + (i + 1) % 7, 7 + i) for i in range(7)], iron)
    A.box(-4.9, -4.1, 1.08, 1.2, zb, -1.43, stone[1])                                  # the stone lintel over the opening
    A.box(-5.28, -3.72, 1.2, 1.32, zb, -1.33, oak_d)                                    # mantel beam
    A.box(-5.3, -3.7, 1.32, 1.42, zb, -1.3, oak)                                        # mantel shelf
    for fx in (-4.72, -4.28):                                                           # firedogs
        A.box(fx - .02, fx + .02, .07, .3, -1.47, -1.43, iron)
        A.lathe(fx, -1.45, .3, [(.028, 0), (.035, .02), (.02, .05), (0, .055)], 6, iron)
        A.box(fx - .015, fx + .015, .1, .14, -1.76, -1.47, iron)
        A.box(fx - .05, fx + .05, .05, .07, -1.49, -1.41, iron, skip='b')
    A.poly([(-4.8, .054, -1.75), (-4.2, .054, -1.75), (-4.2, .054, -1.5), (-4.8, .054, -1.5)], [(0, 1, 2, 3)], ember)
    for a, b, r in (((-4.82, .19, -1.56), (-4.18, .19, -1.6), .05), ((-4.8, .19, -1.69), (-4.2, .19, -1.66), .048), ((-4.7, .28, -1.63), (-4.3, .3, -1.62), .042)):
        A.tube(a, b, r, 7, bark, caps=True, cap_m=endg)
    for fx, fz, h in ((-4.62, -1.6, .34), (-4.45, -1.64, .42), (-4.3, -1.58, .3)):
        for a in (0.3, 0.3 + math.pi / 2):
            cc, s = math.cos(a) * .07, math.sin(a) * .07
            A.poly([(fx - cc, .2, fz - s), (fx + cc, .2, fz + s), (fx + cc * .3, .2 + h * .6, fz + s * .3), (fx, .2 + h, fz), (fx - cc * .4, .2 + h * .5, fz - s * .4)], [(0, 1, 2, 3, 4)], fire)
    cx, cz = -4.5, -1.6                                                                 # trammel, hook, bail, cauldron
    A.box(cx - .012, cx + .012, .8, 1.08, cz - .006, cz + .006, iron)
    arc(A, cx, .8, cz, .03, -math.pi, 0, 0, .012, .012, iron, segs=4)
    arc(A, cx, .6, cz, .19, 0, math.pi, math.pi / 2, .012, .012, iron, segs=6)
    A.lathe(cx, cz, .42, [(.07, 0), (.14, .04), (.17, .1), (.17, .16), (.15, .2), (.16, .21), (.165, .23)], 10, iron, top=False)
    A.lathe(cx, cz, .65, [(.165, 0), (.15, -.012), (.145, -.03)], 10, iron, top=True, top_m=brew)


S.obj(hearth)
S.obj(candlestick, -5.17, -1.55, 1.42, brass, h=.14)
S.obj(candlestick, -3.83, -1.55, 1.42, brass, h=.14)
for i, (x, st, m) in enumerate(((-4.95, 0, clay[0]), (-4.78, 1, clay[2]), (-4.62, 2, clay[1]))):
    S.obj(jar, x, -1.6, 1.42, .055, .13 - .02 * st, m, clay[4] if st == 0 else None, style=st, rot=i)
S.obj(hourglass, -4.3, -1.58, 1.42, .16, walnut)


def mantel_crystal(A):
    A.lathe(-4.05, -1.58, 1.42, [(.07, 0), (.08, .012), (.07, .018)], 8, brass_d, top=True)
    crystals(A, -4.05, -1.58, 1.438, .08, crystal, rot=1.1, n=4)


S.obj(mantel_crystal)


def desk(A):
    """the mage's writing desk: turned legs, an apron with a drawer, a writing slope with a sheet half written, a
    gallery of pigeonholes with scrolls, two books, the inkwell and quill, a candle"""
    x0, x1, z0, z1 = -3.0, -2.2, -1.8, -1.1
    for x in (x0 + .05, x1 - .05):
        for z in (z0 + .05, z1 - .05):
            T.turned_leg(A, x, z, 0, .72, .035, walnut, n=6)
    A.box(x0 + .03, x1 - .03, .6, .72, z0 + .03, z1 - .03, walnut, skip='bt')          # apron
    A.box(-2.8, -2.4, .62, .7, z1 - .03, z1 - .018, walnut_l)                             # drawer front
    A.tube((-2.6, .66, z1 - .018), (-2.6, .66, z1 + .006), .014, 6, brass)
    A.box(x0, x1, .72, .76, z0, z1, walnut)                                                # top
    T.wedge_box(A, -2.85, -2.35, .76, .9, .77, -1.55, -1.2, walnut_l, along='z')           # the writing slope
    A.box(-2.86, -2.34, .76, .8, -1.2, -1.18, walnut)                                      # its ledge
    nv = Vector((0, .35, .13)).normalized()

    def sp(x, t, off):
        return tuple(Vector((x, .9 - .13 * t, -1.55 + .35 * t)) + nv * off)
    A.poly([sp(-2.78, .08, .004), sp(-2.44, .08, .004), sp(-2.44, .92, .004), sp(-2.78, .92, .004)], [(0, 1, 2, 3)], paper_l)
    for li in range(5):
        t0 = .18 + li * .13; xe = -2.47 - (.12 if li == 4 else 0)
        A.poly([sp(-2.74, t0, .008), sp(xe, t0, .008), sp(xe, t0 + .025, .008), sp(-2.74, t0 + .025, .008)], [(0, 1, 2, 3)], ink)
    gz0, gz1 = z0, -1.6                                                                    # the gallery
    A.box(x0, x0 + .03, .76, 1.12, gz0, gz1, walnut); A.box(x1 - .03, x1, .76, 1.12, gz0, gz1, walnut)
    A.box(x0 + .03, x1 - .03, .76, 1.08, gz0, gz0 + .015, walnut_l)
    for x in (-2.74, -2.46):
        A.box(x - .012, x + .012, .76, 1.08, gz0 + .015, gz1 - .01, walnut)
    A.box(x0 + .03, x1 - .03, 1.08, 1.12, gz0, gz1, walnut)
    for x, rb in ((-2.88, 0), (-2.61, 3), (-2.34, 1)):
        for k in range(2):
            scroll(A, (x + .06 * k, .787 + .03 * k, gz0 + .03), (x + .06 * k, .787 + .03 * k, gz1 + .01), .026, paper if k else paper_l, ribbon=bookc[rb])
    tome(A, -2.83, -1.7, 1.12, .22, .15, .04, bookc[4], paper_l, rot=.1)
    tome(A, -2.83, -1.7, 1.16, .19, .13, .035, bookc[1], paper_l, rot=-.08)
    T.inkwell(A, -2.4, -1.7, 1.12, glass[1], ink)
    T.quill(A, -2.4, -1.7, 1.18, -.9, paper_l, paper)
    candle(A, -2.28, -1.3, .76, .12, holder=brass)


S.obj(desk)


def reagent_table(A):
    """the reagent table: square legs, an apron, a planked top, a pot board with two crocks under it"""
    x0, x1, z0, z1, t = -5.5, -4.4, 2.4, 3.4, .78
    for x in (x0 + .07, x1 - .07):
        for z in (z0 + .07, z1 - .07):
            T.oct_prism(A, x, z, .04, .04, 0, t - .05, oak_d)
    A.box(x0 + .05, x1 - .05, t - .16, t - .05, z0 + .05, z1 - .05, oak_d, skip='bt')
    T.plank_top(A, x0, x1, z0, z1, t - .05, t, [oak, oak_l, oak], along='x', n=4, under=oak_d)
    A.box(x0 + .1, x1 - .1, .13, .16, z0 + .1, z1 - .1, oak_l)
    jar(A, -5.2, 2.9, .16, .1, .22, clay[2], None, style=1)
    jar(A, -4.72, 2.75, .16, .09, .17, clay[4], clay[0], style=0, rot=.6)


S.obj(reagent_table)
S.obj(mortar, -5.26, 2.64, .78, .075, stone[2], walnut_l)


def herbs(A):
    herb_bundle(A, (-5.1, .8, 2.52), (-4.82, .817, 2.62), .035, herb[0], twine)
    herb_bundle(A, (-5.08, .8, 2.74), (-4.8, .812, 2.68), .03, herb[2], twine)


S.obj(herbs)


def phial_rack(A):
    """a rack of four phials: a base, two end posts, a top board the phials stand through"""
    x0, x1, z = -4.66, -4.44, 2.58
    A.box(x0, x1, .78, .8, z - .04, z + .04, walnut, skip='b')
    A.box(x0, x0 + .018, .8, .9, z - .04, z + .04, walnut); A.box(x1 - .018, x1, .8, .9, z - .04, z + .04, walnut)
    A.box(x0 + .018, x1 - .018, .88, .9, z - .04, z + .04, walnut_l)
    for i in range(4):
        x = x0 + .04 + i * .047
        A.lathe(x, z, .8, [(.015, 0), (.017, .13), (.011, .16)], 6, potion[i], top=False)
        A.lathe(x, z, .96, [(.011, 0), (.011, .018)], 6, cork, top=True)


S.obj(phial_rack)
S.obj(crystal_ball, -4.72, 3.08, .78, .085, brass, orb)
S.obj(T.open_book, -5.18, 3.1, .78, .3, .22, bookc[6], paper, ink=ink, rot=-.15)
S.obj(candle, -4.5, 2.95, .78, .1, holder=brass)
S.obj(T.bench, -5.4, -4.5, 3.5, 3.78, .47, oak, oak_d, along='x')


def potion_shelf(A):
    """the apothecary shelf by the east door: sides, a back, three shelves of corked bottles, flasks and crocks"""
    x0, x1, z0, z1 = -1.515, -1.2, 1.47, 2.6
    A.box(x0, x1, 0, 1.6, z0, z0 + .03, oak, skip='b'); A.box(x0, x1, 0, 1.6, z1 - .03, z1, oak, skip='b')
    A.box(x1 - .03, x1, 0, 1.56, z0 + .03, z1 - .03, oak_d, skip='b')
    A.box(x0 + .01, x1 - .03, 0, .06, z0 + .03, z1 - .03, oak_d, skip='b')
    A.box(x0, x1, 1.56, 1.6, z0 + .03, z1 - .03, oak)
    ys = [.06, .56, 1.06]
    for y in ys[1:]:
        A.box(x0 + .012, x1 - .03, y - .03, y, z0 + .03, z1 - .03, oak_l)
    r = random.Random(33)
    for si, y in enumerate(ys):
        z = z0 + .1
        k = 0
        while z < z1 - .12:
            st = (k + si) % 4
            if st == 3:
                marked_jar(A, -1.37, z + .04, y, .065, .16, clay[(k + si) % 5], clay[4], (-1, 0), style=(k + si) % 2 * 2)
                z += .2
            else:
                h = (.26, .3, .16)[st]
                bottle(A, -1.36 + r.uniform(-.02, .02), z + .03, y, h, (potion + glass)[(k * 3 + si) % 8], style=st, rot=k * .7)
                z += .16 + (.04 if st == 0 else 0)
            k += 1


S.obj(potion_shelf)
S.build(root)

# ============================================================== the rune workroom (tower ground)
W = Part('Mage_FurnishingPropsWorkroom')
K7 = 7


def rune_cabinet(A):
    """the rune cabinet on the east-north-east face: a panelled cupboard, a worktop (its front on the old front: it
    keeps the tile before it blocked), open shelves above, a cornice; rune jars labelled with their marks, a tray of
    rune stones, a pouch, a glowing crystal cluster, books"""
    k = K7; u0, u1 = .35, 2.7; out = inward(k); tr = frot(k)
    fbox(A, k, u0, u0 + .04, 0, .86, -.62, -.2, oak, skip='bk'); fbox(A, k, u1 - .04, u1, 0, .86, -.62, -.2, oak, skip='bk')
    fbox(A, k, u0 + .04, u1 - .04, 0, .08, -.605, -.2, oak_d, skip='bk')
    fbox(A, k, u0 + .04, u1 - .04, .08, .84, -.57, -.2, oak_d, skip='bklr')                  # behind the doors
    nd = 3; dw = (u1 - u0 - .08) / nd
    for i in range(nd):
        a = u0 + .04 + i * dw + .004; b = a + dw - .008
        fbox(A, k, a, b, .09, .84, -.6, -.58, oak_l, skip='k')                               # door
        fbox(A, k, a + .06, b - .06, .17, .76, -.605, -.6, oak, skip='k')                     # its raised panel
        p0 = fp(k, (a + b) / 2 + (dw / 2 - .1) * (1 if i % 2 else -1), -.59)
        p1 = fp(k, (a + b) / 2 + (dw / 2 - .1) * (1 if i % 2 else -1), -.63)
        A.tube((p0[0], .5, p0[1]), (p1[0], .5, p1[1]), .018, 6, iron)                          # knob
    fbox(A, k, u0 + .04, u1 - .04, .84, .86, -.58, -.2, oak_d, skip='k')
    fbox(A, k, u0, u1, .86, .9, -.62, -.2, oak, skip='k')                                    # worktop
    fbox(A, k, u0, u0 + .04, .9, 1.88, -.46, -.2, oak, skip='bk'); fbox(A, k, u1 - .04, u1, .9, 1.88, -.46, -.2, oak, skip='bk')
    fbox(A, k, u0 + .04, u1 - .04, .9, 1.88, -.23, -.2, oak_d, skip='bk')
    for y in (1.3, 1.62):
        fbox(A, k, u0 + .04, u1 - .04, y - .03, y, -.45, -.23, oak_l, skip='k')
    fbox(A, k, u0, u1, 1.88, 1.93, -.5, -.2, oak_d, skip='k')
    for i, (u, ki) in enumerate(((.62, 0), (.86, 1), (1.1, 2), (1.34, 3))):
        c = fp(k, u, -.4)
        marked_jar(A, c[0], c[1], .9, .07, .17, clay[(i * 2) % 5], clay[4], out, ki)
    c = fp(k, 1.72, -.42)
    A.rbox(c[0], c[1], .32, .22, .9, .915, -tr, walnut_l)                                   # the tray
    for i in range(3):
        for j in range(2):
            p = fp(k, 1.62 + i * .1, -.47 + j * .1)
            rune_stone(A, p[0], p[1], .915, .035, (i + j * 3 + 4) % 7, rot=tr + .3)
    c = fp(k, 2.12, -.45)
    T.purse(A, c[0], c[1], .9, .06, leather, twine, rot=.4)
    c = fp(k, 2.45, -.4)
    crystals(A, c[0], c[1], .9, .11, crystal, rot=.2, n=4)
    for i, (u, ki) in enumerate(((.55, 4), (.76, 5), (.97, 6), (1.18, 0))):
        c = fp(k, u, -.34)
        marked_jar(A, c[0], c[1], 1.3, .055, .13, clay[(i + 1) % 5], None, out, ki)
    books_row(A, k, 1.45, 2.3, 1.3, -.43, -.24, random.Random(7), hmin=.18, hmax=.27)
    yy = 1.62
    for kk, (w, th) in enumerate(((.3, .05), (.26, .045))):
        c = fp(k, .75, -.34)
        tome(A, c[0], c[1], yy, w, .2, th, bookc[kk * 3 + 1], paper_l, rot=-tr + kk * .1)
        yy += th
    books_row(A, k, 1.1, 1.9, 1.62, -.43, -.24, random.Random(9), hmin=.16, hmax=.24)
    c = fp(k, 2.2, -.34)
    jar(A, c[0], c[1], 1.62, .06, .18, clay[1], None, style=1)


W.obj(rune_cabinet)
K0 = 0


def window_seat(A):
    """the boarded window seat under the east-south-east window: a box with a front of boards, a hinged lid, a tufted
    velvet cushion, two bolsters, a book left open face down and another closed"""
    k = K0; tr = frot(k)
    fbox(A, k, .55, 2.5, 0, .45, -.65, -.2, oak_d, skip='bk')
    nb = 5; bw = (2.5 - .55) / nb
    for i in range(nb):
        fbox(A, k, .55 + i * bw + .004, .55 + (i + 1) * bw - .004, .04, .43, -.665, -.65, oak, skip='k')
    fbox(A, k, .5, 2.55, .45, .52, -.7, -.2, oak_l, skip='k')
    for u in (.9, 2.15):
        a, b = fp(k, u - .04, -.26), fp(k, u + .04, -.26)
        c, d = fp(k, u + .04, -.21), fp(k, u - .04, -.21)
        A.poly([(a[0], .524, a[1]), (b[0], .524, b[1]), (c[0], .524, c[1]), (d[0], .524, d[1])], [(0, 1, 2, 3)], iron)
    cc = fp(k, 1.52, -.44)
    T.oct_prism(A, cc[0], cc[1], .88, .19, .52, .59, velvet, cut=.15, rot=tr)
    for u in (.9, 1.3, 1.7, 2.1):
        for w in (-.36, -.52):
            p = fp(k, u, w)
            A.lathe(p[0], p[1], .594, [(.014, 0), (0, .003)], 5, velvet_l, top=False)
    for u in (.66, 2.39):
        a, b = fp(k, u, -.27), fp(k, u, -.62)
        A.tube((a[0], .64, a[1]), (b[0], .64, b[1]), .06, 8, velvet_l, caps=True, cap_m=tassel)
    c = fp(k, 1.15, -.45)
    book_tent(A, c[0], c[1], .59, .3, .21, tr + .2, bookc[1], paper_l)
    c = fp(k, 1.95, -.43)
    tome(A, c[0], c[1], .59, .24, .17, .045, bookc[3], paper_l, rot=-tr + .3)


W.obj(window_seat)


def candelabrum(A):
    """a wrought-iron candelabrum: three splayed feet curled at the ends (turned away from the stance beside it), a
    stem with knops, three arms and drip pans; the candles' tops level, so the flames rest on them"""
    x, z = .6, 1.95
    for a in (math.radians(70), math.radians(190), math.radians(310)):
        ex, ez = x + math.cos(a) * .18, z + math.sin(a) * .18
        A.beam((x, .22, z), (ex, .02, ez), .022, .022, iron)
        A.lathe(ex, ez, 0, [(.026, 0), (.026, .02), (0, .03)], 6, iron)
    A.lathe(x, z, .2, [(.03, 0), (.03, .06), (.014, .09), (.014, .45), (.03, .5), (.014, .56), (.013, 1.0), (.035, 1.02), (.02, 1.04)], 6, iron, top=True)
    for i in range(3):
        a = i * 2 * math.pi / 3 + 1.2
        if i:
            ax, az = x + math.cos(a) * .15, z + math.sin(a) * .15
            A.beam((x, 1.2, z), (ax, 1.3, az), .018, .018, iron)
            A.lathe(ax, az, 1.3, [(.045, 0), (.045, .01), (.02, .03)], 6, iron_l, top=True)
        else:
            ax, az = x, z
            A.lathe(ax, az, 1.24, [(.045, 0), (.045, .01), (.02, .03), (.02, .09)], 6, iron_l, top=True)
        b = 1.33
        A.lathe(ax, az, b, [(.019, 0), (.019, .2)], 6, wax, top=True)
        for fa in (0, math.pi / 2):
            cc, s = math.cos(fa) * .012, math.sin(fa) * .012
            A.poly([(ax - cc, b + .204, az - s), (ax + cc, b + .204, az + s), (ax, b + .264, az)], [(0, 1, 2)], flame)


W.obj(candelabrum, anchor=False)
W.build(root)

# ------------------------------------------------------------- the rune table (service, name kept)
R = Part('Mage_ServiceRuneTable_Workroom')


def rune_table(A):
    """a heavy oak table (its top on the old top: both ends block the tiles beside them by 4 cm), turned legs, an H
    stretcher; a velvet runner hanging over the north edge where the student stands; two rows of rune stones air to
    chaos, the primer open, a rune pouch with stones spilled, a bowl of blank essence, a candlestick"""
    x0, x1, z0, z1, t = 1.7, 3.3, 1.05, 1.8, .86
    for x in (1.78, 3.22):
        for z in (1.12, 1.73):
            T.turned_leg(A, x, z, 0, t - .08, .05, oak_d, n=6)
    for x in (1.78, 3.22):
        A.box(x - .025, x + .025, .16, .22, 1.16, 1.69, oak_d)
    A.box(1.8, 3.2, .19, .25, 1.4, 1.46, oak)
    A.box(1.75, 3.25, t - .2, t - .08, 1.09, 1.76, oak_d, skip='bt')
    T.plank_top(A, x0, x1, z0, z1, t - .08, t, [oak, oak_l, oak], along='x', n=3, under=oak_d)
    y = t + .004
    A.poly([(1.92, y, z0 - .004), (3.08, y, z0 - .004), (3.08, y, 1.46), (1.92, y, 1.46)], [(0, 1, 2, 3)], velvet)
    A.poly([(1.92, t - .12, z0 - .004), (3.08, t - .12, z0 - .004), (3.08, y, z0 - .004), (1.92, y, z0 - .004)], [(0, 1, 2, 3)], velvet)
    for i in range(12):
        x = 1.955 + i * .1
        A.poly([(x - .012, t - .16, z0 - .006), (x + .012, t - .16, z0 - .006), (x + .012, t - .12, z0 - .006), (x - .012, t - .12, z0 - .006)], [(0, 1, 2, 3)], tassel)
    for row, zz in enumerate((1.18, 1.34)):
        for ki in range(7):
            rune_stone(A, 2.02 + ki * .16, zz, y, .052, ki, rot=math.pi / 2 + (ki + row) * .07)
    T.open_book(A, 2.05, 1.62, t, .34, .24, bookc[0], paper, ink=ink, rot=.05)
    T.purse(A, 2.92, 1.64, t, .07, leather, twine, rot=.3)
    for i, (x, z) in enumerate(((2.78, 1.6), (2.73, 1.7), (2.84, 1.73))):
        rune_stone(A, x, z, t, .035, (i * 2 + 1) % 7, rot=i)
    A.lathe(2.52, 1.66, t, [(.05, 0), (.08, .03), (.1, .06), (.098, .062)], 10, brass, top=False)
    A.lathe(2.52, 1.66, t + .005, [(.075, 0), (.08, .03), (.05, .07), (0, .08)], 8, essence)
    candlestick(A, 3.17, 1.2, t, brass, h=.14)


R.obj(rune_table)
R.build(root)

# ============================================================== the library (3 m)
F2 = 3.0
L_ = Part('Mage_UpperFurnishingPropsLibrary')


def library_case(A, k, u0, u1, seed, special):
    """a library case on tower face k (its old envelope: the stances beside it are 2 cm off its front): sides with a
    cresting, a back, a plinth, a cornice board, four shelves of books; one shelf of each case its own"""
    w0, w1 = -.55, -.2
    fbox(A, k, u0, u0 + .04, F2, F2 + 2.2, w0, w1, oak, skip='bk'); fbox(A, k, u1 - .04, u1, F2, F2 + 2.2, w0, w1, oak, skip='bk')
    for uu in (u0, u1 - .04):
        a, b = fp(k, uu, w0), fp(k, uu + .04, w0)
        A.poly([(a[0], F2 + 2.2, a[1]), (b[0], F2 + 2.2, b[1]), (b[0], F2 + 2.23, b[1]), (a[0], F2 + 2.23, a[1])], [(0, 1, 2, 3)], oak_d)
    fbox(A, k, u0 + .04, u1 - .04, F2, F2 + 2.15, w1 - .03, w1, oak_d, skip='bktlr')      # back (the joints' faces left out)
    fbox(A, k, u0 + .04, u1 - .04, F2, F2 + .08, w0 + .01, w1 - .03, oak_d, skip='bklr')   # plinth
    fbox(A, k, u0 + .04, u1 - .04, F2 + 2.15, F2 + 2.2, w0, w1, oak_d, skip='klr')         # cornice board
    ys = [.08, .61, 1.13, 1.66]
    for y in ys[1:]:
        fbox(A, k, u0 + .04, u1 - .04, F2 + y - .03, F2 + y, w0 + .012, w1 - .03, oak_l, skip='klr')
    r = random.Random(seed)
    p0_, U, n, L = seg(k)
    for si, y in enumerate(ys):
        top = (ys[si + 1] - .03) if si + 1 < len(ys) else 2.15
        hmax = min(.38, top - y - .03)
        kind = special[1] if si == special[0] else None
        if kind == 'scrolls':                                                              # scroll cubbies
            nc = 5; cw = (u1 - u0 - .08) / nc
            for i in range(1, nc):
                fbox(A, k, u0 + .04 + i * cw - .01, u0 + .04 + i * cw + .01, F2 + y, F2 + y + .3, w0 + .03, w1 - .03, oak_d, skip='kbt')
            fbox(A, k, u0 + .04, u1 - .04, F2 + y + .3, F2 + y + .32, w0 + .03, w1 - .03, oak_d, skip='klr')
            for i in range(nc):
                for j, (du, dy) in enumerate(((.05, .04), (.11, .04), (.08, .1), (.05, .16), (.11, .16))):
                    if j >= 2 + (i % 2) * 2:
                        continue
                    uu = u0 + .04 + i * cw + du + (cw - .16) / 2
                    a, b = fp(k, uu, w0 + .02), fp(k, uu, w1 - .04)
                    scroll(A, (a[0], F2 + y + dy - .01, a[1]), (b[0], F2 + y + dy - .01, b[1]), .028, paper if (i + j) % 2 else paper_l)
        elif kind == 'folios':                                                             # big books lying in stacks
            for i, uu in enumerate((u0 + .3, u0 + .78, u0 + 1.26)):
                yy = F2 + y
                for kk in range(3 - i % 2):
                    c = fp(k, uu, (w0 + w1) / 2 - .01)
                    tome(A, c[0], c[1], yy, .36, .24, .055, bookc[(i + kk * 2) % 7], paper_l, rot=-frot(k) + (kk - 1) * .06)
                    yy += .055
            books_row(A, k, u0 + 1.55, u1 - .06, F2 + y, w0 + .04, w1 - .04, r, hmax=hmax)
        elif kind == 'jars':
            uu = books_row(A, k, u0 + .06, (u0 + u1) / 2, F2 + y, w0 + .04, w1 - .04, r, hmax=hmax)
            for i in range(3):
                c = fp(k, uu + .12 + i * .2, (w0 + w1) / 2)
                marked_jar(A, c[0], c[1], F2 + y, .07, .2 - .03 * i, clay[(i + 1) % 5], clay[4], inward(k), style=(0, 2, 0)[i])
            c = fp(k, u1 - .3, (w0 + w1) / 2)
            crystals(A, c[0], c[1], F2 + y, .1, crystal, rot=.5, n=4)
        elif kind == 'astrolabe':                                                          # a brass astrolabe on its stand
            uu = books_row(A, k, u0 + .06, u0 + .9, F2 + y, w0 + .04, w1 - .04, r, hmax=hmax)
            c = fp(k, uu + .25, (w0 + w1) / 2)
            A.lathe(c[0], c[1], F2 + y, [(.08, 0), (.08, .02), (.02, .04), (.015, .14)], 8, walnut, top=True)
            nin = Vector((-n[0], 0, -n[1])); uv = Vector((U[0], 0, U[1])); up = Vector((0, 1, 0))
            cv = Vector((c[0], F2 + y + .27, c[1]))
            T.rim_ring(A, cv, nin, uv, up, .1, .13, .008, 12, brass)
            A.poly([tuple(cv + nin * .004 + uv * math.cos(i * math.pi / 5) * .1 + up * math.sin(i * math.pi / 5) * .1) for i in range(10)], [tuple(range(10))], brass_d)
            A.beam(tuple(cv + nin * .012 - uv * .09), tuple(cv + nin * .012 + uv * .09), .012, .006, brass)
            books_row(A, k, uu + .5, u1 - .06, F2 + y, w0 + .04, w1 - .04, r, hmax=hmax)
        else:
            books_row(A, k, u0 + .06, u1 - .06, F2 + y, w0 + .04, w1 - .04, r, hmax=hmax)


for k, (u0, u1), seed, special in ((0, (.4, 2.65), 101, (2, 'scrolls')), (1, (.35, 2.0), 102, (1, 'jars')), (3, (.4, 2.65), 103, (3, 'folios')), (4, (.4, 2.65), 104, (1, 'astrolabe'))):
    L_.obj(library_case, k, u0, u1, seed, special)
L_.build(root)

# ------------------------------------------------------------- the lectern (service, name kept)
Lc = Part('Mage_ServiceLectern_Library')


def lectern(A):
    """cross feet, a turned column, a sloped desk rising to the south with a ledge on its north edge (the reader
    stands north of it), the spell book open on it: an illuminated initial, lines, a rune-circle diagram, a ribbon"""
    lx, lz = 2.25, 2.3
    A.box(lx - .3, lx + .3, F2, F2 + .07, lz - .045, lz + .045, walnut, skip='b')
    A.box(lx - .045, lx + .045, F2, F2 + .07, lz - .2, lz - .045, walnut, skip='b'); A.box(lx - .045, lx + .045, F2, F2 + .07, lz + .045, lz + .2, walnut, skip='b')
    for ex, ez in ((lx - .28, lz), (lx + .28, lz), (lx, lz - .18), (lx, lz + .18)):
        A.lathe(ex, ez, F2 + .07, [(.03, 0), (.02, .02), (0, .03)], 6, walnut_l)
    A.lathe(lx, lz, F2 + .07, [(.07, 0), (.05, .06), (.035, .1), (.05, .22), (.035, .4), (.03, .7), (.045, .74), (.045, .8), (.06, .84), (.06, .9)], 8, walnut_l, top=True)
    x0, x1 = lx - .31, lx + .31
    za, zb, ya, yb = lz - .19, lz + .2, F2 + .98, F2 + 1.18
    T.wedge_box(A, lx - .12, lx + .12, F2 + .97, ya - .01 + .02, yb - .12, za + .04, zb - .06, walnut, along='z')
    nv = Vector((0, zb - za, -(yb - ya))).normalized()
    if nv.y < 0:
        nv = -nv
    th = .035
    top4 = [(x0, za, ya), (x1, za, ya), (x1, zb, yb), (x0, zb, yb)]
    V_ = [tuple(Vector((x, y, z)) - nv * th) for x, z, y in top4] + [(x, y, z) for x, z, y in top4]
    A.poly(V_, [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], walnut_l)
    A.box(x0, x1, ya - .04, ya + .045, za - .025, za - .002, walnut)                    # the ledge

    def sp(x, t, off):
        return tuple(Vector((x, ya + (yb - ya) * t, za + (zb - za) * t)) + nv * off)
    A.poly([sp(lx - .26, .04, .004), sp(lx + .26, .04, .004), sp(lx + .26, .92, .004), sp(lx - .26, .92, .004)], [(0, 1, 2, 3)], bookc[0])
    for side in (-1, 1):
        xa, xb = lx + side * .008, lx + side * .24
        A.poly([sp(xa, .08, .03), sp(xb, .08, .014), sp(xb, .88, .014), sp(xa, .88, .03)], [(0, 1, 2, 3)], paper_l)
        A.poly([sp(xb, .08, .008), sp(xb, .88, .008), sp(xb, .88, .014), sp(xb, .08, .014)], [(0, 1, 2, 3)], paper)
        for li in range(5):
            t0 = .5 + li * .07
            if side < 0 and li < 2:
                continue
            f0 = lambda xx: .03 - (.016 * (abs(xx - lx) - .008) / .232) + .004
            A.poly([sp(lx + side * .04, t0, f0(lx + side * .04)), sp(lx + side * .21, t0, f0(lx + side * .21)), sp(lx + side * .21, t0 + .025, f0(lx + side * .21)), sp(lx + side * .04, t0 + .025, f0(lx + side * .04))], [(0, 1, 2, 3)], ink)
    f0 = lambda xx: .03 - (.016 * (abs(xx - lx) - .008) / .232) + .004
    A.poly([sp(lx - .2, .5, f0(lx - .2)), sp(lx - .12, .5, f0(lx - .12)), sp(lx - .12, .64, f0(lx - .12)), sp(lx - .2, .64, f0(lx - .2))], [(0, 1, 2, 3)], runec[3])
    for i in range(6):
        a0, a1 = i * math.pi / 3, (i + 1) * math.pi / 3
        cx, ct = lx + .13, .26
        A.poly([sp(cx + math.cos(a0) * .06, ct + math.sin(a0) * .12, f0(cx + math.cos(a0) * .06)), sp(cx + math.cos(a1) * .06, ct + math.sin(a1) * .12, f0(cx + math.cos(a1) * .06)),
                sp(cx + math.cos(a1) * .045, ct + math.sin(a1) * .09, f0(cx + math.cos(a1) * .045)), sp(cx + math.cos(a0) * .045, ct + math.sin(a0) * .09, f0(cx + math.cos(a0) * .045))], [(0, 1, 2, 3)], runec[1])
    rb = Vector(sp(lx + .02, .08, .032))
    A.poly([tuple(rb), tuple(rb + Vector((.025, 0, 0))), (rb.x + .025, ya - .12, za - .03), (rb.x, ya - .12, za - .03)], [(0, 1, 2, 3)], bookc[4])


Lc.obj(lectern)


def candle_stand(A):
    """a pricket candle stand beside the lectern: three feet, a stem, a drip pan, a thick candle"""
    x, z = 2.66, 2.3
    for a in (0, 2 * math.pi / 3, 4 * math.pi / 3):
        A.beam((x, F2 + .12, z), (x + math.cos(a) * .1, F2, z + math.sin(a) * .1), .02, .02, iron)
    A.lathe(x, z, F2 + .1, [(.02, 0), (.013, .04), (.012, .98), (.05, 1.0), (.05, 1.02)], 6, iron, top=True)
    A.lathe(x, z, F2 + 1.02, [(.028, 0), (.028, .12), (.022, .13)], 8, wax, top=True)
    for fa in (0, math.pi / 2):
        cc, s = math.cos(fa) * .013, math.sin(fa) * .013
        A.poly([(x - cc, F2 + 1.155, z - s), (x + cc, F2 + 1.155, z + s), (x, F2 + 1.22, z)], [(0, 1, 2)], flame)


Lc.obj(candle_stand)
Lc.build(root)

# ============================================================== the observatory (6 m)
F3 = 6.0
O = Part('Mage_UpperFurnishingPropsObservatory')


def chart_table(A):
    """the star-chart table (its top on the old top: the west edge blocks the tile beside it by 4 cm): turned legs, an
    apron, a planked top, a low shelf of rolled charts"""
    x0, x1, z0, z1, t = .7, 1.7, -3.1, -2.4, F3 + .9
    for x in (.76, 1.64):
        for z in (-3.04, -2.46):
            T.turned_leg(A, x, z, F3, t - .07, .04, walnut, n=6)
    A.box(.74, 1.66, t - .17, t - .07, -3.06, -2.44, walnut, skip='bt')
    T.plank_top(A, x0, x1, z0, z1, t - .07, t, [walnut_l, walnut, walnut_l], along='x', n=3, under=walnut)
    A.box(.8, 1.6, F3 + .15, F3 + .18, -3.0, -2.5, walnut_l)
    for i, (z, r_) in enumerate(((-2.9, .035), (-2.8, .03), (-2.68, .038), (-2.85, .03))):
        yy = F3 + .18 + r_ + .002 + (.062 if i == 3 else 0)
        scroll(A, (.84, yy, z), (1.56, yy, z), r_, chart if i % 2 else paper, ribbon=bookc[i])


O.obj(chart_table)
ty = F3 + .9


def star_chart(A):
    """the chart of the island's sky: a deep blue sheet, constellations drawn in lines, stars over them"""
    y = ty + .004
    A.poly([(.8, y, -3.02), (1.5, y, -3.02), (1.5, y, -2.5), (.8, y, -2.5)], [(0, 1, 2, 3)], chart)
    r = random.Random(5)
    cons = [[(.9, -2.9), (.98, -2.82), (1.08, -2.86), (1.14, -2.76)], [(1.2, -2.62), (1.3, -2.58), (1.38, -2.66), (1.3, -2.72), (1.2, -2.62)], [(.88, -2.62), (.96, -2.56), (1.04, -2.6)]]
    for cst in cons:
        for (ax, az), (bx, bz) in zip(cst, cst[1:]):
            dx, dz = bx - ax, bz - az; L = math.hypot(dx, dz); ex, ez = -dz / L * .003, dx / L * .003
            A.poly([(ax - ex, y + .004, az - ez), (bx - ex, y + .004, bz - ez), (bx + ex, y + .004, bz + ez), (ax + ex, y + .004, az + ez)], [(0, 1, 2, 3)], cline)
        for (sx, sz) in cst:
            s = .012
            A.poly([(sx - s, y + .008, sz), (sx, y + .008, sz - s), (sx + s, y + .008, sz), (sx, y + .008, sz + s)], [(0, 1, 2, 3)], star)
    for i in range(22):
        sx, sz = r.uniform(.84, 1.46), r.uniform(-2.98, -2.54); s = r.choice((.005, .007, .009))
        A.poly([(sx - s, y + .008, sz), (sx, y + .008, sz - s), (sx + s, y + .008, sz), (sx, y + .008, sz + s)], [(0, 1, 2, 3)], star)


O.obj(star_chart)
O.obj(lambda A: T.rim_ring(A, Vector((1.17, ty + .02, -2.76)), Vector((0, 1, 0)), Vector((1, 0, 0)), Vector((0, 0, 1)), .2, .23, .006, 16, brass))


def dividers(A):
    """a pair of brass dividers lying open"""
    h = (1.58, ty + .02, -2.95)
    for e in ((1.64, ty + .012, -2.72), (1.52, ty + .012, -2.73)):
        A.beam(h, e, .012, .008, brass)
    A.lathe(1.58, -2.95, ty + .008, [(.016, 0), (.016, .02)], 6, brass_d, top=True)


O.obj(dividers)
for x, z in ((.82, -2.52), (1.48, -3.0)):
    O.obj(lambda A, x=x, z=z: A.lathe(x, z, ty + .008, [(.03, 0), (.03, .03), (.018, .036), (.012, .05), (0, .055)], 8, lead))
O.obj(hourglass, 1.6, -2.52, ty, .15, walnut)
O.obj(T.lantern, .8, -2.95, ty, iron, flame, h=.26)


def armillary(A):
    """a brass armillary sphere on a turned oak stand: three feet (one toward the tile the old base blocked), a
    baluster, the meridian ring held in a crescent, the horizon, the equator, the ecliptic band and a colure round a
    small globe, the pole rod with finials"""
    x, z = 1.2, 1.6
    for i in range(3):
        a = i * 2 * math.pi / 3 - math.radians(18.4)
        A.beam((x, F3 + .12, z), (x + math.cos(a) * .27, F3 + .02, z + math.sin(a) * .27), .05, .04, walnut)
        A.lathe(x + math.cos(a) * .27, z + math.sin(a) * .27, F3, [(.035, 0), (.04, .02), (.025, .045)], 6, walnut_l, top=True)
    A.lathe(x, z, F3 + .1, [(.07, 0), (.06, .06), (.04, .1), (.07, .28), (.04, .5), (.03, .66), (.05, .7), (.05, .74), (.02, .78)], 8, walnut_l, top=True)
    cy = F3 + 1.3
    c = Vector((x, cy, z))
    A.lathe(x, z, F3 + .88, [(.02, 0), (.02, .06)], 6, brass, top=True)
    arc(A, x, cy, z, .38, -math.pi * .82, -math.pi * .18, 0, .025, .02, brass_d, segs=6)
    R_ = .34

    def ring(nv, uu, r0, r1, half, m, n=12):
        nv, uu = Vector(nv).normalized(), Vector(uu).normalized()
        T.rim_ring(A, c, nv, uu, nv.cross(uu).normalized(), r0, r1, half, n, m)
    ring((0, 0, 1), (1, 0, 0), R_ - .025, R_, .01, brass)                                    # meridian
    ring((0, 1, 0), (1, 0, 0), R_ + .01, R_ + .04, .008, brass_d)                            # horizon
    tilt = math.radians(35)
    ax = Vector((math.sin(tilt), math.cos(tilt), 0))
    eq_u = Vector((math.cos(tilt), -math.sin(tilt), 0))
    ring(tuple(ax), (0, 0, 1), R_ - .06, R_ - .035, .008, brass)                              # equator
    ecl = ax * math.cos(math.radians(23)) + eq_u * math.sin(math.radians(23))
    ring(tuple(ecl), (0, 0, 1), R_ - .075, R_ - .04, .02, brass_d)                            # the ecliptic band
    ellipsoid(A, x, cy, z, .09, .09, .09, cloth_b, seg=8, rings=5)
    A.tube(tuple(c - ax * (R_ + .03)), tuple(c + ax * (R_ + .03)), .008, 5, iron)
    for s in (-1, 1):
        p = c + ax * s * (R_ + .04)
        A.lathe(p.x, p.z, p.y - .015, [(.018, 0), (.018, .03)], 6, brass, top=True)


O.obj(armillary)


def stool(A):
    """the observer's stool by the telescope: a round seat (as wide as the old stool's reach) on three splayed legs
    with a stretcher ring, a cushion on it"""
    x, z = 3.1, -2.9
    for i in range(3):
        a = i * 2 * math.pi / 3 + .3
        A.beam((x + math.cos(a) * .12, F3 + .45, z + math.sin(a) * .12), (x + math.cos(a) * .19, F3, z + math.sin(a) * .19), .045, .045, oak_d)
    A.lathe(x, z, F3 + .2, [(.16, 0), (.16, .025)], 10, oak_d, top=True)
    A.lathe(x, z, F3 + .45, [(.2, 0), (.215, .02), (.215, .045), (.2, .05)], 12, oak, top=True)
    A.lathe(x, z, F3 + .5, [(.17, 0), (.18, .03), (.14, .055), (0, .06)], 10, velvet)


O.obj(stool)
O.build(root)

# ------------------------------------------------------------- the telescope (service, name kept)
Ts = Part('Mage_ServiceTelescope_Observatory')


def telescope(A):
    """the old tube on its old line (its eyepiece closes the same link it closed), dressed: a brass tube with bands, a
    dew shield and its lens, a drawtube and eyepiece, a finder; a fork mount on a tripod head; three legs to the old
    feet, a spreader between them"""
    tx, tz = 4.3, -2.4; hy = F3 + 1.3
    feet = [(tx + math.cos(math.radians(a + 20)) * .42, tz + math.sin(math.radians(a + 20)) * .42) for a in (0, 120, 240)]
    for fx, fz in feet:
        A.beam((fx, F3, fz), (tx + (fx - tx) * .12, hy - .02, tz + (fz - tz) * .12), .06, .05, walnut)
        A.lathe(fx, fz, F3, [(.04, 0), (.04, .03), (.03, .04)], 6, brass_d, top=True)
    sp_ = [(tx + (fx - tx) * .7, F3 + .42, tz + (fz - tz) * .7) for fx, fz in feet]
    for i in range(3):
        A.tube(sp_[i], sp_[(i + 1) % 3], .01, 5, iron)
    A.lathe(tx, tz, hy - .06, [(.12, 0), (.12, .06), (.08, .08)], 10, brass_d, top=True)
    A.lathe(tx, tz, hy + .02, [(.05, 0), (.05, .06)], 8, iron, top=True)
    el = math.radians(32)
    dirv = Vector((math.cos(el) * .707, math.sin(el), -math.cos(el) * .707))
    base = Vector((tx, hy + .18, tz))
    side = dirv.cross(Vector((0, 1, 0))).normalized()
    A.beam(tuple(Vector((tx, hy + .08, tz)) - side * .16), tuple(Vector((tx, hy + .08, tz)) + side * .16), .05, .03, iron)
    for s in (-1, 1):
        p = base + side * s * .15
        A.beam((tx + side.x * s * .15, hy + .08, tz + side.z * s * .15), tuple(p), .04, .025, iron)
        A.tube(tuple(p), tuple(base + side * s * .09), .025, 6, brass_d)
    A.tube(tuple(base - dirv * .7), tuple(base + dirv * 1.0), .08, 10, brass, r2=.12)
    A.tube(tuple(base + dirv * 1.0), tuple(base + dirv * 1.12), .135, 10, brass_d, caps=False)
    u_ = dirv.cross(Vector((0, 1, 0))).normalized(); w_ = dirv.cross(u_).normalized()
    rc = base + dirv * 1.004
    A.poly([tuple(rc + (u_ * math.cos(2 * math.pi * i / 10) + w_ * math.sin(2 * math.pi * i / 10)) * .116) for i in range(10)], [tuple(range(10))], lens)
    for f, r_ in ((-.62, .09), (-.1, .1), (.55, .115)):
        A.tube(tuple(base + dirv * (f - .03)), tuple(base + dirv * (f + .03)), r_ + .012, 10, brass_d, caps=False)
    A.tube(tuple(base - dirv * .7), tuple(base - dirv * .84), .05, 8, brass_d, r2=.042)
    A.tube(tuple(base - dirv * .84), tuple(base - dirv * .93), .036, 8, iron, r2=.04)
    up = w_ if w_.y > 0 else -w_
    A.tube(tuple(base + up * .14 - dirv * .3), tuple(base + up * .14 + dirv * .25), .025, 6, brass)
    for f in (-.2, .15):
        A.beam(tuple(base + dirv * f + up * .075), tuple(base + dirv * f + up * .125), .02, .02, brass_d)


Ts.obj(telescope)
Ts.build(root)

# ============================================================== the practice yard (on the island ground)
P_ = {'x': 114, 'y': 7.75, 'z': 58}
TER = json.loads((ROOT / '.studio-workspaces/holm-overhaul-terrain-v2/working/assets/world/authoring/holm-overhaul.terrain.bundle.json').read_text())


def ground(x, z):
    """the terrain the island stands on now (v2 land), as the extractor triangulates it, mage-local"""
    t = TER; S_ = t['width'] + 1
    wx, wz = x + P_['x'], z + P_['z']; ix, iz = math.floor(wx), math.floor(wz); fx, fz = wx - ix, wz - iz
    h = lambda a, b: t['heights'][b * S_ + a]
    if fx + fz <= 1:
        y = h(ix, iz) + (h(ix + 1, iz) - h(ix, iz)) * fx + (h(ix, iz + 1) - h(ix, iz)) * fz
    else:
        y = h(ix + 1, iz + 1) + (h(ix, iz + 1) - h(ix + 1, iz + 1)) * (1 - fx) + (h(ix + 1, iz) - h(ix + 1, iz + 1)) * (1 - fz)
    return y - P_['y']


Y = Part('Mage_Yard')
yr = random.Random(64)


def fence_post(A, x, z, top=1.12):
    """a dressed fence post, its top weathered to a point"""
    g = ground(x, z)
    T.oct_prism(A, x, z, .07, .07, g - .1, g + top, weather_d, cut=.35, rot=yr.uniform(0, .4))
    A.poly([(x - .07, g + top, z - .07), (x + .07, g + top, z - .07), (x + .07, g + top, z + .07), (x - .07, g + top, z + .07), (x, g + top + .06, z)],
           [(0, 4, 1), (1, 4, 2), (2, 4, 3), (3, 4, 0)], weather)


def rail(A, p, q, hgt, j):
    """a split rail from post p to post q (plan points), a flattened lozenge in section, its ends in the posts"""
    d = Vector((q[0] - p[0], 0, q[1] - p[1])).normalized()
    side = Vector((-d.z, 0, d.x))
    a = Vector((p[0], ground(*p) + hgt + j, p[1])) - d * .03
    b = Vector((q[0], ground(*q) + hgt - j, q[1])) + d * .03
    off = [side * .04, Vector((0, .035, 0)), -side * .04, Vector((0, -.035, 0))]
    A.poly([tuple(a + o) for o in off] + [tuple(b + o) for o in off], [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (3, 2, 1, 0), (4, 5, 6, 7)], weather)


def fence_run(a, b, first=True, last=True):
    """split-rail fence from a to b, post for post as the old fence (spacing <= 1.45 m), rails in the old two rows;
    each panel (a post and the rails to the next) one object standing on the ground"""
    n = max(1, math.ceil(math.hypot(b[0] - a[0], b[1] - a[1]) / 1.45))
    pts = [(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n) for i in range(n + 1)]
    for i, (p, q) in enumerate(zip(pts, pts[1:])):
        g = Y.group()
        if i == 0 and first:
            fence_post(Y, *p)
        if i < n - 1 or last:
            fence_post(Y, *q)
        for hgt in (.45, .92):
            rail(Y, p, q, hgt, yr.uniform(-.03, .03))
        Y.close(g)


fence_run((-1, 4.5), (-1, 5.0), last=False)
fence_run((-1, 7.0), (-1, 8.0), first=False)
fence_run((-1, 8.0), (-7, 8.0), first=False)
fence_run((-7, 8.0), (-7, 4.0), first=False)
fence_run((-7, 4.0), (-6.35, 4.0), first=False)


def gate_post(A, z):
    """a squared gate post with a capping and a point (under 1.4 m, so the cutaway keeps it whole)"""
    g = ground(-1, z)
    A.box(-1.1, -.9, g - .04, g + 1.25, z - .1, z + .1, oak_d, skip='b')
    A.box(-1.14, -.86, g + 1.25, g + 1.3, z - .14, z + .14, oak)
    A.poly([(-1.14, g + 1.3, z - .14), (-.86, g + 1.3, z - .14), (-.86, g + 1.3, z + .14), (-1.14, g + 1.3, z + .14), (-1.0, g + 1.33, z)], [(0, 4, 1), (1, 4, 2), (2, 4, 3), (3, 4, 0)], oak_d)
    if z > 6:
        for yy in (.3, 1.04):                                                              # the pintles the gate hangs on
            A.box(-1.13, -1.09, g + yy, g + yy + .05, z - .05, z - .02, iron)


for z in (5.0, 7.0):
    Y.obj(gate_post, z)


def gate(A):
    """the yard gate, standing open against the inside of the pen as it did: two stiles, three rails, palings, a brace"""
    g = ground(-1.95, 6.93) + .08
    z0, z1 = 6.9, 6.96
    A.box(-2.82, -2.74, g - .04, g + .97, z0, z1, oak)
    A.box(-1.2, -1.12, g - .04, g + .97, z0, z1, oak)
    for yy in (.02, .46, .9):
        A.box(-2.74, -1.2, g + yy, g + yy + .08, z0 + .006, z1 - .006, oak_l)
    for x in (-2.45, -2.1, -1.75, -1.45):
        A.box(x - .04, x + .04, g + .1, g + .9, z0 + .012, z1 - .012, oak)
    A.beam((-2.7, g + .12, (z0 + z1) / 2), (-1.26, g + .86, (z0 + z1) / 2), .07, .07, oak_d)


Y.obj(gate)


def gate_irons(A):
    """strap hinges and the latch"""
    g = ground(-1.95, 6.93) + .08
    for yy in (.1, .86):
        A.box(-1.5, -1.09, g + yy, g + yy + .04, 6.885, 6.975, iron)
    A.box(-2.86, -2.8, g + .5, g + .56, 6.885, 6.975, iron)


Y.obj(gate_irons)

# the rat hutch: four legs (standing on the ground), the body resting on them, the roof resting on the body
HX0, HX1, HZ0, HZ1, HB, HT = -6.8, -5.6, 6.85, 7.8, .3, 1.02
for lx, lz in ((HX0 + .06, HZ0 + .06), (HX1 - .06, HZ0 + .06), (HX0 + .06, HZ1 - .06), (HX1 - .06, HZ1 - .06)):
    Y.obj(lambda A, lx=lx, lz=lz: T.oct_prism(A, lx, lz, .05, .05, ground(lx, lz) - .06, HB, oak_d, cut=.3))


def hutch_body(A):
    """the hutch where the practice rats sleep: a floor, a boarded back and ends, a slatted front (north) with the
    dark inside showing through, a door and its latch on the east end"""
    A.box(HX0, HX1, HB, HB + .05, HZ0, HZ1, oak_d)
    A.box(HX0 + .03, HX1 - .03, HB + .05, HT - .02, HZ0 + .05, HZ1 - .03, soot, skip='b')
    A.box(HX0, HX1, HB + .05, HT, HZ1 - .03, HZ1, oak)
    for x0, x1 in ((HX0, HX0 + .03), (HX1 - .03, HX1)):
        A.box(x0, x1, HB + .05, HT, HZ0, HZ1 - .03, oak)
    A.box(HX0 + .03, HX1 - .03, HT - .06, HT, HZ0, HZ0 + .04, oak_l)
    A.box(HX0 + .03, HX1 - .03, HB + .05, HB + .12, HZ0, HZ0 + .04, oak_l)
    x = HX0 + .08
    while x < HX1 - .08:
        A.box(x, x + .035, HB + .12, HT - .06, HZ0 + .01, HZ0 + .035, oak)
        x += .09
    A.box(HX1, HX1 + .012, HB + .1, HB + .5, 7.18, 7.52, oak_l)
    A.box(HX1 + .012, HX1 + .02, HB + .28, HB + .32, 7.44, 7.5, oak_d)


Y.obj(hutch_body)


def hutch_ramp(A):
    """the ramp from the hutch door down to the ground, cleated"""
    gx = -5.02; gy = ground(gx, 7.35)
    a, b = (HX1 + .02, HB + .12), (gx, gy + .03)
    V_ = [(a[0], a[1], 7.22), (a[0], a[1], 7.48), (b[0], b[1], 7.48), (b[0], b[1], 7.22), (a[0], a[1] - .03, 7.22), (a[0], a[1] - .03, 7.48), (b[0], b[1] - .03, 7.48), (b[0], b[1] - .03, 7.22)]
    A.poly(V_, [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], oak_l)
    for t in (.25, .5, .75):
        x = a[0] + (b[0] - a[0]) * t; y = a[1] + (b[1] - a[1]) * t
        A.box(x - .015, x + .015, y - .005, y + .025, 7.24, 7.46, oak_d, skip='b')


Y.obj(hutch_ramp)


def hutch_roof(A):
    """a thatched roof, its eaves reaching as the old coop's did (they keep the two tiles north of it blocked), gable
    boards, a ridge roll"""
    zr = (HZ0 + HZ1) / 2; ex0, ex1 = -6.95, -5.45; ze0, ze1 = 6.70, 7.95; ye = HT - .04; yr_ = HT + .5
    for za in (ze0, ze1):
        e0, e1 = (ex0, ex1) if za < zr else (ex0 + .01, ex1 - .01)
        V_ = [(e0, ye, za), (e1, ye, za), (e1, yr_, zr), (e0, yr_, zr)]
        W_ = [(p[0], p[1] + .1, p[2] + (.03 if za < zr else -.03)) for p in V_]
        A.poly(V_ + W_, [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], straw if za < zr else straw_d)
    for x in (HX0 + .015, HX1 - .015):
        A.poly([(x, ye, HZ0 + .02), (x, ye, HZ1 - .02), (x, yr_ - .02, zr)], [(0, 1, 2)], oak)
    A.tube((ex0 - .02, yr_ + .09, zr), (ex1 + .02, yr_ + .09, zr), .045, 6, straw_d)


Y.obj(hutch_roof)


def target(A):
    """the spell target: a straw boss on an A-frame (two legs in front, a prop behind, a bar under the boss), painted
    in rings on its face (north, to the house), scorched where the darts struck"""
    gx = -2.0
    g = ground(gx, 7.6)
    cy = g + .95
    for dx in (-.35, .35):
        A.beam((gx + dx, ground(gx + dx, 7.7) - .08, 7.7), (gx + dx * .2, g + 1.35, 7.5), .08, .08, oak)
    A.beam((gx, ground(gx, 7.95) - .08, 7.95), (gx, g + 1.2, 7.58), .08, .08, oak_d)
    A.box(gx - .4, gx + .4, cy - .5, cy - .44, 7.46, 7.56, oak_d)
    A.tube((gx, cy, 7.68), (gx, cy, 7.36), .48, 12, straw_d, caps=True, cap_m=straw)   # a fat boss (over 0.3 m: the cutaway keeps
    for f0, sg in ((7.36, -1), (7.68, 1)):                                              # it whole), its middle south of 7.5;
        fz = f0                                                                         # painted on both faces
        for r_, m in ((.42, paint_b), (.3, paint_w), (.18, paint_r), (.07, paint_w)):
            fz += sg * .004
            A.poly([(gx + math.cos(2 * math.pi * i / 12) * r_, cy + math.sin(2 * math.pi * i / 12) * r_, fz) for i in range(12)], [tuple(range(11, -1, -1))], m)
        fz += sg * .004
        for sx, sy, s in (((.22, .12, .06), (-.12, -.26, .05), (.05, .3, .045)) if sg < 0 else ((-.2, .18, .05),)):
            A.poly([(gx + sx + math.cos(i * math.pi / 4) * s * (1 if i % 2 else .55), cy + sy + math.sin(i * math.pi / 4) * s * (1 if i % 2 else .55), fz) for i in range(8)], [tuple(range(7, -1, -1))], scorch)


Y.obj(target)


def dummy(A):
    """the practice dummy: a post on cross feet, arms, a straw body bound with cord, a sack head with a face painted
    on (to the house), a battered pointed hat"""
    x, z = -5.6, 5.1
    g = ground(x, z)
    A.box(x - .28, x + .28, g - .02, g + .06, z - .05, z + .05, oak_d); A.box(x - .05, x + .05, g - .02, g + .06, z - .28, z - .05, oak_d)
    A.box(x - .05, x + .05, g - .02, g + .06, z + .05, z + .28, oak_d)
    T.oct_prism(A, x, z, .06, .06, g + .06, g + 1.62, oak, cut=.3)
    A.beam((x - .45, g + 1.3, z), (x + .45, g + 1.3, z), .08, .07, oak)
    A.lathe(x, z, g + .68, [(.16, 0), (.21, .12), (.22, .4), (.2, .66), (.14, .78)], 10, straw, top=True, rot=.2)
    for yy in (.3, .6):
        A.lathe(x, z, g + .68 + yy, [(.222, 0), (.222, .03)], 10, twine, top=False, rot=.2)
    A.lathe(x, z, g + 1.42, [(.08, 0), (.12, .05), (.13, .14), (.1, .24), (.06, .28)], 8, sackc, top=True, rot=math.pi / 8)
    fzz = z - .124 * math.cos(math.pi / 8) - .005
    for dx in (-.03, .03):
        A.poly([(x + dx - .012, g + 1.57, fzz), (x + dx + .012, g + 1.57, fzz), (x + dx + .012, g + 1.595, fzz), (x + dx - .012, g + 1.595, fzz)], [(0, 1, 2, 3)], face)
    A.lathe(x, z, g + 1.66, [(.17, 0), (.17, .02), (.1, .02), (.07, .12), (.04, .21)], 8, hatc, top=True, rot=.3)
    A.beam((x, g + 1.87, z), (x + .09, g + 1.92, z + .04), .05, .05, hatc)
    A.lathe(x, z, g + 1.68, [(.104, 0), (.096, .035)], 8, hatb, top=False, rot=.3)


Y.obj(dummy)


def trough(A):
    """the rats' water trough: boarded sides on two chocks, water near the brim"""
    x0, x1, z0, z1 = -5.1, -4.1, 7.4, 7.75
    g = min(ground(x0, z1), ground(x1, z1), ground(x0, z0), ground(x1, z0))
    b = max(ground(x0, z0), ground(x1, z0)) + .02
    for x in (x0 + .12, x1 - .12):
        A.box(x - .06, x + .06, g - .04, b + .06, z0 - .02, z1 + .02, oak_d, skip='b')
    A.box(x0 + .03, x1 - .03, b + .06, b + .1, z0 + .03, z1 - .03, oak)
    A.box(x0, x1, b + .06, b + .42, z0, z0 + .03, oak); A.box(x0, x1, b + .06, b + .42, z1 - .03, z1, oak)
    A.box(x0, x0 + .03, b + .06, b + .42, z0 + .03, z1 - .03, oak_l); A.box(x1 - .03, x1, b + .06, b + .42, z0 + .03, z1 - .03, oak_l)
    A.poly([(x0 + .03, b + .36, z0 + .03), (x1 - .03, b + .36, z0 + .03), (x1 - .03, b + .36, z1 - .03), (x0 + .03, b + .36, z1 - .03)], [(3, 2, 1, 0)], water)


Y.obj(trough)
Y.build(root)

print('[MAGE_PROPS_TRIS]', json.dumps(TRIS))
PK.save(SP, ROOT)
