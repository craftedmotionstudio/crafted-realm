"""Warden's Keep overhaul (owner review 2026-09-29), built in Blender as our own design in the 2004 low-poly manner.

Owner's review, near verbatim: grass floor inside the castle; beds upstairs but plain; walls collapsing oddly upstairs;
cannons at the ends of the upper floor; upstairs should reach the tower stairs so level two can be walked all the way
round, with doors between the sections; the stairs miss their supports; the front walls are missing (one main entrance,
large doors standing open); more secure from outside, torches outside; inside suits of armour, a nice rug, a very
expensive castle; stained glass you can see through; a table with a beer to grab.

The keep keeps its seat (87, 11, 35 on the v2 land), its footprint and every lesson stance (the gate passage, Warden
Corrick's court, the hall and its undercroft trapdoor, the lookouts) and is rebuilt around them:
 - the front is closed: solid curtain walls either side of a two-storey gatehouse, the one way in; a 4 m arch with two
   great iron-studded leaves standing open against the passage walls, the portcullis raised above them, its windlass in
   the guardroom, machicolations and the arms over the arch, torches either side. The east curtain is solid too;
 - floors: flagstones in the hall (a dais for the high table), the barracks, the gatehouse passage and the tower bases;
   boards upstairs; the court stays an open grass court, edged by the walls' dressed plinth and stone thresholds;
 - level two is one ring: the hall's upper floor (the Warden's chamber and the solar, a door between them), the
   dormitory over the barracks, the east turret, the east and south wall walks, the gatehouse guardroom, each joined to
   the next by a planked door on a hinge pivot; the high watch opens off the chamber. Every tower floor is at 3.2 m;
 - stairs: the hall stair on strings, a carriage, newels and posts, its under-stair closet boarded; the tower flights
   on strings round a stone spine, their landings on posts. Each stair has a foot and a head anchor;
 - stained-glass lancets (translucent) in the hall, chamber, solar, barracks and guardroom; arrow loops in the towers;
 - cannons on the walks and the tower tops, torches inside and out, suits of armour on stands and trophies on the
   walls, banners and the cloth of honour, rugs, candelabras, the high table and the great chair, a four-poster, a
   wardrobe, bunks, weapon racks, the keg and the ale board with the beer you can take (Keep_ServiceBeer_Tankard).
Names follow the island cutaway contract (src/holm_island_extras.js CUTAWAY.keep): Keep_Shell_* / Keep_Upper_Shell_*
clip with the walls (everything hung on a wall: windows, torches, banners, shields, trophies, the hearth hood),
Keep_Upper_* / Keep_Tower_* show from their own storey up, Keep_Roof_* hides inside; floors carry 'Floor', stairs
'Stair'; door leaves 'Door'. Custom properties (glTF extras) mark cutaway roles, anchors, doors and FX.
Plan coordinates (x east, y up, z south), keep-local. Original designs only.
Run: blender -b --python tools/blender/build_holm_keep_overhaul.py -- docs/rebuild/holm-overhaul/keep-overhaul/keep.json"""
import bpy, sys, math, json, random
from pathlib import Path
from mathutils import Vector
HERE = Path(__file__).resolve().parent; sys.path.insert(0, str(HERE)); ROOT = HERE.parents[1]
import holm_interior_kit as K
import holm_props_pass_kit as PK
from holm_props_pass_kit import C, Part
import holm_trade_props as T
import holm_purposeful_props as PP
import holm_keep_overhaul_arch as A
import holm_keep_overhaul_props as KP
from holm_interior_pass import tile as tile_rect

SP = PK.spec()
bpy.ops.wm.read_factory_settings(use_empty=True)
PK.begin()
REPORT = {'parts': {}, 'doors': [], 'anchors': [], 'stairs': [], 'services': [], 'fx': [], 'notes': []}
rng = random.Random(20260929)

# ================================================================== materials
MAT = A.append_materials(ROOT / SP['materials'], ['Keep gray fieldstone', 'Keep pale dressed stone', 'Keep aged oak', 'Keep stair oak', 'Keep warm shingles', 'Keep floor flags'])
STONE, TRIM, OAKM, STAIR, SHING, FLAGT = [MAT[n] for n in ('Keep gray fieldstone', 'Keep pale dressed stone', 'Keep aged oak', 'Keep stair oak', 'Keep warm shingles', 'Keep floor flags')]
import holm_leaded_glazing as LG
_, LEAD = LG.materials()
GLASS = A.stained_glass_material(.62)
DARK = A.flat('Keep loop shadow', '#1d1c1a')
LEADROOF = A.flat('Keep lead roof', '#5b6067')
IRONA = A.flat('Keep iron fittings', '#34373a')
A.Arch.SCALE.update({STONE.name: .42, TRIM.name: 1.111, OAKM.name: .42, STAIR.name: 1.25, SHING.name: .42, FLAGT.name: .625,
                     DARK.name: .5, LEADROOF.name: .5, LEAD.name: 1.0, IRONA.name: 1.0})

# props colours (the props pass palette where it overlaps, so the keep's old pieces and the new ones read as one family)
P = dict(
    oak=C('keep oak', '#6e4b2e', 'beam'), oak_l=C('keep oak light', '#7b5534', 'beam'), oak_d=C('keep oak dark', '#4d3421', 'beam'),
    end=C('keep end grain', '#8a6843', 'beam'), ash=C('keep ash shaft', '#9a7850', 'beam'), stave=C('keep stave 1', '#7b5635', 'beam'),
    iron=C('keep iron', '#3a3b3a'), iron_d=C('keep iron dark', '#2b2c2b'), steel=C('keep steel', '#9aa1a4'), steel_d=C('keep steel dark', '#6f7577'),
    brass=C('keep brass', '#b39146'), pewter=C('keep pewter', '#8d918f'), pewter_d=C('keep pewter band', '#6d716f'), silver=C('keep silver', '#c3c7c6'),
    leather=C('keep leather', '#5a3a22'), strap=C('keep strap', '#4a2e1b'), linen=C('keep linen', '#e3d7b6'), ticking=C('keep ticking', '#d6cdb2'),
    red=C('keep arms red', '#8e1f1c'), gold=C('keep arms gold', '#c9a13a'), blue=C('keep arms blue', '#2d4a7a'), black=C('keep black', '#161514'),
    wine=C('keep wine', '#5a1420'), ale=C('keep ale', '#5a3a16'), straw=C('keep straw tick', '#c8b070'), wool=C('keep wool', '#d8cfb8'),
    rope=C('keep rope', '#8a7048'), coal=C('keep coal', '#2a1a14'), pitch=C('keep pitch rag', '#2e2218'), water=C('keep water', '#4f6a72'),
    parchment=C('keep parchment', '#d9c89a'), map_green=C('keep chart green', '#6f8a47'), wax=C('keep candle wax', '#efe6c8'),
    flame=C('keep candle flame', '#ffc15a', emit=1.5), fire=C('keep fire', '#ff9a2e', emit=1.8), ember=C('keep ember', '#c2401a', emit=1.2),
    blanket_r=C('keep blanket red', '#6b2a22'), blanket_s=C('keep blanket slate', '#5f6a74'), blanket_b=C('keep blanket brown', '#6b5a3c'),
    bread=C('keep bread crust', '#c08a4a'), score=C('keep bread score', '#e6c98e'), rind=C('keep cheese rind', '#c9a24a'), paste=C('keep cheese', '#ecd9a0'),
    roast=C('keep roast', '#8a4a22'), apple=C('keep apple', '#9a2e1e'), stalk=C('keep stalk', '#4a3a1a'),
    cloak_g=C('keep cloak green', '#3e5a36'), cloak_b=C('keep cloak blue', '#3b4b6e'), cloak_r=C('keep cloak red', '#6e2b24'),
    ink=C('keep ink', '#1f1c1a'), paper_l=C('keep parchment pale', '#e4d7ae'), seal=C('keep seal wax', '#8a2a22'),
    rug_field_r=C('keep rug field red', '#6e1f1b'), rug_field_b=C('keep rug field blue', '#26395f'), rug_border=C('keep rug border', '#2b1a16'),
    rug_band=C('keep rug band', '#b08a36'), rug_medal=C('keep rug medallion', '#c8a24c'))
PM = P  # alias
FLAGS = [C('keep flag 1', '#6f6d64'), C('keep flag 2', '#86837a'), C('keep flag 3', '#7c7a70'), C('keep flag 4', '#615f57')]
FLAG_SEAM = C('keep flag seam', '#3f3d38')
BOARDS = [C('keep board 1', '#7d5a38'), C('keep board 2', '#6f4f31'), C('keep board 3', '#654730'), C('keep board 4', '#86633e')]
BOARD_SEAM = C('keep board seam', '#2f2217')
WALKF = [C('keep walk flag 1', '#8e8b82'), C('keep walk flag 2', '#7f7c73'), C('keep walk flag 3', '#999589'), C('keep walk flag 4', '#74716a')]
WALK_SEAM = C('keep walk seam', '#4a4842')

F0, F1, F2, F3 = 0.0, 3.2, 6.4, 9.6
BASE = -1.2                      # exterior walls run below the ground (the land dips at the tower feet)

# ================================================================== part registry
PARTS = {}


def arch(name, role):
    if name not in PARTS:
        PARTS[name] = A.Arch(name, {'cutaway': role})
    return PARTS[name]


def part(name, role, **props):
    if name not in PARTS:
        p = Part(name); p.props = dict(props, cutaway=role); PARTS[name] = p
    return PARTS[name]


def build_all():
    out = {}
    for name, p in PARTS.items():
        o = p.build(None, recalc=False) if getattr(p, 'no_recalc', False) else p.build(None)
        if o is None:
            continue
        for k, v in getattr(p, 'props', {}).items():
            o[k] = v
        if 'Floor' in name or name.startswith('Keep_Floor') or 'Rug' in name:
            _faces_up(o)
        out[name] = o
        REPORT['parts'][name] = sum(len(f) - 2 for f in p.f)
    return out


def _faces_up(o):
    """Floor tops must face up: the measuring tool only stands on upward faces (flip any single-sided tile turned down)."""
    import bmesh
    me = o.data; bm = bmesh.new(); bm.from_mesh(me)
    for f in bm.faces:
        f.normal_update()
    # closed pieces keep their outward normals; loose single tiles (every edge a boundary) are turned up
    for f in bm.faces:
        if all(len(e.link_faces) == 1 for e in f.edges) and f.normal.z < 0:
            f.normal_flip()
    bm.to_mesh(me); bm.free(); me.update()


# shorthand parts
SHELL = arch('Keep_Shell_Walls', 'wall')                 # ground storey walls (clip)
USHELL = arch('Keep_Upper_Shell_Walls', 'wall')          # upper storey walls 3.2 .. 6.4 (clip, upper)
WL2 = arch('Keep_Upper_Shell_WatchL2', 'wall')           # the high watch's third storey 6.4 .. 9.6
PARA = arch('Keep_Upper_Parapet_Walks', 'parapet')       # the wall walks' parapets (upper, never clipped)
WTOP = arch('Keep_Upper_Tower_WatchTop', 'parapet')      # the high watch lookout parapet
TTOP = arch('Keep_Upper_Tower_TurretTop', 'parapet')     # the east turret lookout parapet
ROOF = arch('Keep_Roof_Main', 'roof')
CHIM = arch('Keep_Roof_Chimney', 'roof')
GROOF = arch('Keep_Roof_Gatehouse', 'roof')
SLABS = arch('Keep_Floor_Slabs', 'floor')                # dais body, hearth and threshold sides (ground)
USLABS = arch('Keep_Upper_Floor_Slabs', 'floor')         # floor structure under the upper boards and walk flags
HEARTH = arch('Keep_Shell_Hearth', 'wall')               # fireplace cheeks, mantel and hood (hung on the wall)
UHEARTH = arch('Keep_Upper_Shell_Hearth', 'wall')
GLAZE_L = arch('Keep_Shell_GlazingLead', 'window')        # lead cames on both faces of the glass (ground)
UGLAZE_L = arch('Keep_Upper_Shell_GlazingLead', 'window')
GLAZE_L.no_recalc = UGLAZE_L.no_recalc = True              # flat strips: their winding is authored
FL = part('Keep_Floor_Flags', 'floor')
UB = part('Keep_Upper_Floor_Boards', 'floor')
UW = part('Keep_Upper_Floor_Walks', 'floor')
RUGS = part('Keep_Floor_Rugs', 'floor')
URUGS = part('Keep_Upper_Floor_Rugs', 'floor')
HUNG = part('Keep_Shell_Hung', 'wall')                   # banners, shields, trophies, torch brackets (ground, incl. outside)
UHUNG = part('Keep_Upper_Shell_Hung', 'wall')
FLAMES = part('Keep_Shell_TorchFlames', 'wall', fx='torch-flame')
UFLAMES = part('Keep_Upper_Shell_TorchFlames', 'wall', fx='torch-flame')
HALL = part('Keep_Furnishing_Hall', 'floor')
HALLF = part('Keep_Furnishing_HallCandles', 'floor', fx='candle-flame')
FIRE = part('Keep_Furnishing_HearthFire', 'floor', fx='hearth-flame')
UFIRE = part('Keep_Upper_Furnishing_HearthFire', 'floor', fx='hearth-flame')
BARR = part('Keep_Furnishing_Barracks', 'floor')
BARRF = part('Keep_Furnishing_BarracksCandles', 'floor', fx='candle-flame')
TOWB = part('Keep_Furnishing_TowerBases', 'floor')
PORT = part('Keep_Shell_Portcullis', 'wall')
QUART = part('Keep_Upper_Furnishing_Quarters', 'floor')
QUARTF = part('Keep_Upper_Furnishing_QuartersCandles', 'floor', fx='candle-flame')
DORM = part('Keep_Upper_Furnishing_Dormitory', 'floor')
GUARD = part('Keep_Upper_Furnishing_Guardroom', 'floor')
GUARDF = part('Keep_Upper_Furnishing_GuardroomFire', 'floor', fx='brazier-flame')
WALKS = part('Keep_Upper_Furnishing_Walks', 'floor')
WALKSF = part('Keep_Upper_Furnishing_WalksFire', 'floor', fx='brazier-flame')
TOW1 = part('Keep_Upper_Furnishing_TowersL1', 'floor')
WAT2 = part('Keep_Upper_Tower_WatchL2Furnishing', 'floor')
WAT2F = part('Keep_Upper_Tower_WatchL2Fire', 'floor', fx='brazier-flame')
WATT = part('Keep_Upper_Tower_WatchTopGun', 'floor')
TURT = part('Keep_Upper_Tower_TurretTopGun', 'floor')
GLASS_G = K.Acc('Keep_Shell_StainedGlass')               # built on the stained-glass material below
UGLASS_G = K.Acc('Keep_Upper_Shell_StainedGlass')

# ================================================================== floors
def flags(Pt, rect, y, tones=FLAGS, seam=FLAG_SEAM, style='flags', run='x', width=.3):
    tile_rect(Pt, rect, y, style, tones, seam, rng, width=width, run=run)


def _clip_convex(poly, clip):
    """Sutherland-Hodgman: poly clipped by a convex polygon clip (both [(x, z)], clip counter-clockwise or not)."""
    area = sum(clip[i][0] * clip[(i + 1) % len(clip)][1] - clip[(i + 1) % len(clip)][0] * clip[i][1] for i in range(len(clip)))
    sgn = 1 if area > 0 else -1
    out = list(poly)
    for i in range(len(clip)):
        a, b = clip[i], clip[(i + 1) % len(clip)]
        inside = lambda p: sgn * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) >= -1e-9
        def inter(p, q):
            x1, y1 = p; x2, y2 = q; x3, y3 = a; x4, y4 = b
            d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
            t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d
            return (x1 + t * (x2 - x1), y1 + t * (y2 - y1))
        src, out = out, []
        for j, p in enumerate(src):
            q = src[j - 1]
            if inside(p):
                if not inside(q):
                    out.append(inter(q, p))
                out.append(p)
            elif inside(q):
                out.append(inter(q, p))
        if not out:
            break
    return out


def flags_poly(Pt, poly, y, tones=FLAGS, seam=FLAG_SEAM):
    """Flagstones over a convex plan polygon: the rectangle tiling of its bounding box, each flag clipped to it."""
    xs = [p[0] for p in poly]; zs = [p[1] for p in poly]
    tmp = K.Acc('tmp')
    tile_rect(tmp, (min(xs), max(xs), min(zs), max(zs)), y, 'flags', tones, seam, rng)
    for f, mi in zip(tmp.f, tmp.fm):
        pts = [(tmp.v[i][0], tmp.v[i][2]) for i in f]
        cp = _clip_convex(pts, poly)
        if len(cp) >= 3:
            # keep the winding facing up
            ar = sum(cp[i][0] * cp[(i + 1) % len(cp)][1] - cp[(i + 1) % len(cp)][0] * cp[i][1] for i in range(len(cp)))
            if ar > 0:
                cp = cp[::-1]
            Pt.poly([(x, y, z) for x, z in cp], [tuple(range(len(cp)))], tmp.mats[mi])


# ---- ground floor flags (y 0): hall below the dais, the dais (0.16), barracks, gate passage, thresholds
DAIS = .16
flags(FL, (-9.81, -3.19, -6.6, 5.81), F0)
flags(FL, (-9.81, -3.19, -8.81, -6.6), F0 + DAIS)
SLABS.box(-9.81, -3.19, F0 - .1, F0 + DAIS - .005, -8.81, -6.6, TRIM)      # the dais: dressed stone riser
flags(FL, (-2.81, 6.81, -8.81, -5.19), F0)
flags(FL, (0.0, 4.0, 3.81, 10.19), F0, run='z')
for rect in ((-3.19, -2.81, -1.9, -0.1), (0.1, 1.9, -5.19, -4.81), (6.81, 7.15, -7.9, -6.1)):          # stone thresholds
    FL.poly([(rect[0], F0, rect[2]), (rect[0], F0, rect[3]), (rect[1], F0, rect[3]), (rect[1], F0, rect[2])], [(0, 1, 2, 3)], FLAGS[1])
# the tower bases: flags over the octagon
WATCH = (-7.0, -12.0); TURRET = (10.0, -7.0); AP = 3.0; APIN = 2.85
flags_poly(FL, A.oct_poly(*WATCH, APIN), F0)
flags_poly(FL, A.oct_poly(*TURRET, APIN), F0)

# ---- upper boards (3.2): the hall's upper floor round the stairwell, the dormitory, the guardroom, thresholds
def boards(rect, run='x'):
    tile_rect(UB, rect, F1, 'boards', BOARDS, BOARD_SEAM, rng, width=.3, run=run)
    USLABS.box(rect[0], rect[1], F1 - .24, F1 - .02, rect[2], rect[3], OAKM)


boards((-9.81, -3.19, -8.81, -1.0), run='z')
boards((-7.65, -3.19, -1.0, 4.0), run='z')
boards((-9.81, -3.19, 4.0, 5.81), run='z')
boards((-2.81, 6.81, -8.81, -5.19))
boards((-0.81, 4.81, 4.19, 9.2), run='z')
for rect in ((-7.1, -5.9, -9.18, -8.81), (-3.19, -2.81, -7.9, -6.1), (6.81, 7.18, -7.9, -6.1), (4.81, 5.19, 4.2, 5.8),
             (-1.19, -0.81, 4.2, 5.8), (-3.19, -2.81, 4.2, 5.8)):
    UB.poly([(rect[0], F1, rect[2]), (rect[0], F1, rect[3]), (rect[1], F1, rect[3]), (rect[1], F1, rect[2])], [(0, 1, 2, 3)], BOARDS[2])
# ---- wall walks (3.2): flags over the solid curtains; the turret doorway's threshold
for rect in ((-2.81, -1.19, 3.81, 6.19), (5.19, 11.19, 3.81, 6.19), (8.81, 11.19, -3.85, 3.81), (9.1, 10.9, -4.18, -3.85)):
    tile_rect(UW, rect, F1, 'flags', WALKF, WALK_SEAM, rng)

# ================================================================== the curtain walls (solid masonry, walked on top)
for x0, x1, z0, z1 in ((-2.81, -1.19, 3.81, 6.19), (5.19, 11.19, 3.81, 6.19), (8.81, 11.19, -3.85, 3.81)):
    SHELL.box(x0, x1, BASE, F1 - .03, z0, z1, STONE)
# a dressed plinth course and a string course on their outer faces (flush bands of dressed stone)
for (axis, fixed, a, b, side) in (('x', 6.19, -2.81, -1.19, 1), ('x', 6.19, 5.19, 11.19, 1), ('z', 11.19, -3.85, 6.19, 1),
                                  ('x', 3.81, -2.81, -1.19, -1), ('x', 3.81, 5.19, 8.81, -1), ('z', 8.81, -3.85, 3.81, -1)):
    for y0, y1 in ((-.05, .42), (3.02, 3.14)):
        if axis == 'x':
            SHELL.box(a, b, y0, y1, min(fixed, fixed + side * .02), max(fixed, fixed + side * .02), TRIM)
        else:
            SHELL.box(min(fixed, fixed + side * .02), max(fixed, fixed + side * .02), y0, y1, a, b, TRIM)
# blind arrow loops on the outer faces (a dark slit with a cross arm)
def blind_loop(Pt, axis, fixed, u, y, side):
    for (u0, u1, v0, v1) in ((u - .06, u + .06, y, y + 1.0), (u - .2, u + .2, y + .45, y + .55)):
        if axis == 'x':
            Pt.box(u0, u1, v0, v1, min(fixed, fixed + side * .012), max(fixed, fixed + side * .012), DARK)
        else:
            Pt.box(min(fixed, fixed + side * .012), max(fixed, fixed + side * .012), v0, v1, u0, u1, DARK)


for u in (-2.0,):
    blind_loop(SHELL, 'x', 6.19, u, 1.2, 1)
for u in (6.6, 8.6, 10.4):
    blind_loop(SHELL, 'x', 6.19, u, 1.2, 1)
for u in (-2.0, 1.0):
    blind_loop(SHELL, 'z', 11.19, u, 1.2, 1)

# ================================================================== the hall (x -10..-3, z -9..6), two storeys
HALL_WIN_G = []
def hall_walls():
    # west wall (owns its corners)
    wg = [(-7.65, -6.75, 1.1, 2.8), (-2.45, -1.55, 1.1, 2.8)]
    wu = [(-2.6, -1.8, 4.3, 5.8), (1.1, 1.9, 4.3, 5.8), (4.4, 5.2, 4.3, 5.8)]
    A.wall(SHELL, 'z', -10, -9.19, 6.19, BASE, F1, STONE, holes=wg, reveal=TRIM)
    A.wall(USHELL, 'z', -10, -9.19, 6.19, F1, F2, STONE, holes=wu, reveal=TRIM)
    # east wall: the hall doors to the court; windows onto the court; upper: the dormitory door, the solar door
    eg = [(-1.9, -0.1, -.02, 2.6), (-3.95, -3.05, 1.1, 2.8), (2.05, 2.95, 1.1, 2.8), (-7.9, -6.1, F1 - .02, F1 + .01), (4.2, 5.8, F1 - .02, F1 + .01)]
    eu = [(-7.9, -6.1, F1, F1 + 2.3), (-4.6, -3.8, 4.3, 5.8), (-1.4, -0.6, 4.3, 5.8), (1.6, 2.4, 4.3, 5.8), (4.2, 5.8, F1, F1 + 2.3)]
    A.wall(SHELL, 'z', -3, -9.19, 6.19, BASE, F1, STONE, holes=eg, reveal=TRIM)
    A.wall(USHELL, 'z', -3, -9.19, 6.19, F1, F2, STONE, holes=eu, reveal=TRIM)
    # north wall (between the side walls): the high watch door upstairs, one window each storey east of the tower
    A.wall(SHELL, 'x', -9, -9.81, -3.19, BASE, F1, STONE, holes=[(-4.95, -4.05, 1.3, 2.8), (-7.1, -5.9, F1 - .02, F1 + .01)], reveal=TRIM)
    A.wall(USHELL, 'x', -9, -9.81, -3.19, F1, F2, STONE, holes=[(-7.1, -5.9, F1, F1 + 2.3), (-4.9, -4.1, 4.3, 5.8)], reveal=TRIM)
    # south wall: the great window, each storey
    A.wall(SHELL, 'x', 6, -9.81, -3.19, BASE, F1, STONE, holes=[(-6.7, -5.3, 1.0, 3.0)], reveal=TRIM)
    A.wall(USHELL, 'x', 6, -9.81, -3.19, F1, F2, STONE, holes=[(-6.6, -5.4, 4.0, 5.9)], reveal=TRIM)
    # the partition between the Warden's chamber and the solar (upstairs), with its door
    A.wall(USHELL, 'x', -3, -9.81, -3.19, F1, F2, STONE, holes=[(-5.9, -4.1, F1, F1 + 2.3)], thick=.3, reveal=TRIM)
    # stained glass in every window of the hall
    for (s0, s1, h0, h1), seed in zip(wg, (1, 2)):
        A.lancet(GLASS_G, GLAZE_L, SHELL, 'z', -10, s0, s1, h0, h1, .38, LEAD, TRIM, design='rich', seed=seed)
    for (s0, s1, h0, h1), seed in zip(wu, (3, 4, 5)):
        A.lancet(UGLASS_G, UGLAZE_L, USHELL, 'z', -10, s0, s1, h0, h1, .38, LEAD, TRIM, design='quarry', seed=seed)
    for (s0, s1, h0, h1), seed in zip(eg[1:3], (6, 7)):
        A.lancet(GLASS_G, GLAZE_L, SHELL, 'z', -3, s0, s1, h0, h1, .38, LEAD, TRIM, design='rich', seed=seed)
    for (s0, s1, h0, h1), seed in zip([eu[1], eu[2], eu[3]], (8, 9, 10)):
        A.lancet(UGLASS_G, UGLAZE_L, USHELL, 'z', -3, s0, s1, h0, h1, .38, LEAD, TRIM, design='quarry', seed=seed)
    A.lancet(GLASS_G, GLAZE_L, SHELL, 'x', -9, -4.95, -4.05, 1.3, 2.8, .38, LEAD, TRIM, design='rich', seed=11)
    A.lancet(UGLASS_G, UGLAZE_L, USHELL, 'x', -9, -4.9, -4.1, 4.3, 5.8, .38, LEAD, TRIM, design='quarry', seed=12)
    A.lancet(GLASS_G, GLAZE_L, SHELL, 'x', 6, -6.7, -5.3, 1.0, 3.0, .38, LEAD, TRIM, design='rich', seed=13, point=.5)
    A.lancet(UGLASS_G, UGLAZE_L, USHELL, 'x', 6, -6.6, -5.4, 4.0, 5.9, .38, LEAD, TRIM, design='rich', seed=14, point=.5)
    # dressed surrounds: the hall doors (court face), the great windows (outside)
    A.surround(SHELL, 'z', -3, -1.9, -0.1, 0, 2.6, .38, TRIM, band=.2, faces=(1,), sill=False)
    A.surround(SHELL, 'x', 6, -6.7, -5.3, 1.0, 3.0, .38, TRIM, faces=(1,))
    A.surround(USHELL, 'x', 6, -6.6, -5.4, 4.0, 5.9, .38, TRIM, faces=(1,))
    # corner quoins and a plinth on the hall's outer faces; a string course at the floor line
    for (axis, fixed, a, b, side) in (('z', -10.19, -9.19, 6.19, -1), ('x', 6.19, -10.19, -2.81, 1), ('x', -9.19, -10.19, -8.24, -1)):
        for y0, y1 in ((-.05, .42), (3.02, 3.14)):
            if axis == 'x':
                SHELL.box(a, b, y0, y1, min(fixed, fixed + side * .02), max(fixed, fixed + side * .02), TRIM)
            else:
                SHELL.box(min(fixed, fixed + side * .02), max(fixed, fixed + side * .02), y0, y1, a, b, TRIM)
    # buttresses on the west face (between the windows, clear of the chimney stack)
    for zc in (-8.2, -1.0, 3.2):
        SHELL.box(-10.75, -10.19, BASE, 2.45, zc - .3, zc + .3, STONE)
        SHELL.box(-10.8, -10.19, 2.45, 2.62, zc - .34, zc + .34, TRIM)
        SHELL.box(-10.62, -10.19, 2.62, 4.2, zc - .26, zc + .26, STONE)
    # the chimney stack on the west face (the hearths' flue): up the wall, through the eaves
    SHELL.box(-10.95, -10.19, BASE, F1, -5.6, -4.4, STONE)
    USHELL.box(-10.95, -10.19, F1, F2, -5.6, -4.4, STONE)
    CHIM.box(-10.95, -10.19, F2, 9.8, -5.6, -4.4, STONE)
    CHIM.box(-11.02, -10.12, 9.8, 9.95, -5.67, -4.33, TRIM)
    CHIM.box(-10.8, -10.34, 9.95, 10.2, -5.25, -4.75, TRIM)


hall_walls()

# ================================================================== the barracks range (x -3..7, z -9..-5), two storeys
def barracks_walls():
    ng = [(-0.57, -0.43, 1.2, 2.3), (2.43, 2.57, 1.2, 2.3), (4.93, 5.07, 1.2, 2.3)]
    nu = [(-1.3, -0.7, 4.3, 5.5), (2.2, 2.8, 4.3, 5.5), (5.2, 5.8, 4.3, 5.5)]
    A.wall(SHELL, 'x', -9, -2.81, 6.81, BASE, F1, STONE, holes=ng, reveal=TRIM)
    A.wall(USHELL, 'x', -9, -2.81, 6.81, F1, F2 - .05, STONE, holes=nu, reveal=TRIM)
    sg = [(0.1, 1.9, -.02, 2.5), (-1.9, -1.1, 1.2, 2.6), (3.6, 4.4, 1.2, 2.6)]
    su = [(-1.85, -1.15, 4.2, 5.6), (1.65, 2.35, 4.2, 5.6), (4.65, 5.35, 4.2, 5.6)]
    A.wall(SHELL, 'x', -5, -2.81, 6.81, BASE, F1, STONE, holes=sg, reveal=TRIM)
    A.wall(USHELL, 'x', -5, -2.81, 6.81, F1, F2 - .05, STONE, holes=su, reveal=TRIM)
    A.wall(SHELL, 'z', 7, -9.19, -4.81, BASE, F1, STONE, holes=[(-7.9, -6.1, -.02, 2.4), (-7.9, -6.1, F1 - .02, F1 + .01)], reveal=TRIM)
    A.wall(USHELL, 'z', 7, -9.19, -4.81, F1, F2 - .05, STONE, holes=[(-7.9, -6.1, F1, F1 + 2.3)], reveal=TRIM)
    for (s0, s1, h0, h1), seed in zip(sg[1:], (21, 22)):
        A.lancet(GLASS_G, GLAZE_L, SHELL, 'x', -5, s0, s1, h0, h1, .38, LEAD, TRIM, design='quarry', seed=seed)
    for (s0, s1, h0, h1), seed in zip(su, (23, 24, 25)):
        A.lancet(UGLASS_G, UGLAZE_L, USHELL, 'x', -5, s0, s1, h0, h1, .38, LEAD, TRIM, design='quarry', seed=seed)
    for (s0, s1, h0, h1), seed in zip(nu, (26, 27, 28)):
        A.lancet(UGLASS_G, UGLAZE_L, USHELL, 'x', -9, s0, s1, h0, h1, .38, LEAD, TRIM, design='quarry', seed=seed)
    A.surround(SHELL, 'x', -5, 0.1, 1.9, 0, 2.5, .38, TRIM, band=.2, faces=(1,), sill=False)
    for y0, y1 in ((-.05, .42), (3.02, 3.14)):
        SHELL.box(-2.81, 7.19, y0, y1, -9.21, -9.19, TRIM)
        for a, b in ((-2.81, 0.1), (1.9, 6.81)):            # the court face, broken at the barracks door
            SHELL.box(a, b, y0, y1, -4.81, -4.79, TRIM)
    for xc in (0.9, 3.8):
        SHELL.box(xc - .3, xc + .3, BASE, 2.45, -9.75, -9.19, STONE)
        SHELL.box(xc - .34, xc + .34, 2.45, 2.62, -9.8, -9.19, TRIM)
        SHELL.box(xc - .26, xc + .26, 2.62, 4.2, -9.62, -9.19, STONE)


barracks_walls()

# ================================================================== the gatehouse (x -1..5, z 4..10)
def gatehouse():
    # two solid blocks either side of the 4 m passage (their inner halves stop under the guardroom's floor slab), a thick
    # front and a back over the arches
    for z0, z1, top in ((3.81, 4.2, F1), (4.2, 5.8, F1 - .02), (5.8, 10.19, F1)):
        SHELL.box(-1.19, -0.81, BASE, top, z0, z1, STONE)
    SHELL.box(-0.81, 0.0, BASE, 2.84, 3.81, 10.19, STONE)
    for z0, z1, top in ((3.81, 4.2, F1), (4.2, 5.8, F1 - .02), (5.8, 10.19, F1)):
        SHELL.box(4.81, 5.19, BASE, top, z0, z1, STONE)
    SHELL.box(4.0, 4.81, BASE, 2.84, 3.81, 10.19, STONE)
    R = (4 + .36) / 1.2; yc = 2.95 - R; half = math.asin(2 / R)
    arc = [(2 + R * math.sin(-half + 2 * half * i / 10), yc + R * math.cos(-half + 2 * half * i / 10)) for i in range(11)]
    for z0, z1 in ((9.4, 10.19), (3.81, 4.19)):
        for (xa, ya), (xb, yb) in zip(arc, arc[1:]):
            # voussoir band (dressed) then walling up to the floor line
            ra, rb = Vector((xa - 2, ya - yc)).normalized(), Vector((xb - 2, yb - yc)).normalized()
            wa = min(.3, (F1 - .03 - ya) / max(ra.y, 1e-3)); wb = min(.3, (F1 - .03 - yb) / max(rb.y, 1e-3))   # under the floor line
            va = (xa + ra.x * wa, ya + ra.y * wa); vb = (xb + rb.x * wb, yb + rb.y * wb)
            for quad, m in (([(xa, ya), (xb, yb), vb, va], TRIM), ([va, vb, (vb[0], F1), (va[0], F1)], STONE)):
                V = [(u, v, z0) for u, v in quad] + [(u, v, z1) for u, v in quad]
                SHELL.poly(V, [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], m)
    # the ceiling of the passage: oak beams under the guardroom floor, the floor slab over the passage and the blocks
    for k in range(6):
        zc = 4.6 + k * .92
        if zc < 9.15:
            USLABS.box(0.0, 4.0, 2.86, 2.98, zc - .09, zc + .09, OAKM)
    # the guardroom's walls
    A.wall(USHELL, 'z', -1, 3.81, 10.19, F1, 6.2, STONE, holes=[(4.2, 5.8, F1, F1 + 2.3)], reveal=TRIM)
    A.wall(USHELL, 'z', 5, 3.81, 10.19, F1, 6.2, STONE, holes=[(4.2, 5.8, F1, F1 + 2.3)], reveal=TRIM)
    A.wall(USHELL, 'x', 4, -0.81, 4.81, F1, 6.2, STONE, holes=[(1.6, 2.4, 4.0, 5.7)], reveal=TRIM)
    A.lancet(UGLASS_G, UGLAZE_L, USHELL, 'x', 4, 1.6, 2.4, 4.0, 5.7, .38, LEAD, TRIM, design='rich', seed=31)
    front_holes = [(0.72, 0.88, 4.1, 5.2), (3.12, 3.28, 4.1, 5.2)]
    for s, e, lo, hi in A.grid(-0.81, 4.81, F1, 6.2, front_holes):
        USHELL.box(s, e, lo, hi, 9.4, 10.19, STONE)
    # outer face: a dressed band at the floor line, the arms over the arch, corbelled machicolations under the parapet
    SHELL.box(-1.19, 5.19, 3.0, 3.16, 10.19, 10.24, TRIM)
    USHELL.box(1.25, 2.75, 3.55, 4.75, 10.19, 10.25, TRIM)                       # the arms panel
    for k in range(7):
        xc = -1.0 + k * 1.0
        USHELL.box(xc - .14, xc + .14, 5.35, 5.55, 10.19, 10.37, TRIM)
        USHELL.box(xc - .14, xc + .14, 5.55, 5.75, 10.19, 10.52, TRIM)
    GROOF.box(-1.19, 5.19, 5.75, 5.85, 9.4, 10.57, TRIM)
    # the gatehouse top: a lead flat roof inside a crenellated parapet, the front one carried on the corbels
    GROOF.box(-0.81, 4.81, 6.1, 6.16, 4.19, 9.4, LEADROOF)
    A.crenel(GROOF, 'x', 10.38, -1.19, 5.19, 5.85, STONE, parapet=.75, merlon=.6, thick=.38, gap=1.2, cap=TRIM)
    A.crenel(GROOF, 'x', 4.0, -1.19, 5.19, 6.2, STONE, parapet=.55, merlon=.55, thick=.38, gap=1.2, cap=TRIM)
    A.crenel(GROOF, 'z', -1.0, 4.19, 9.4, 6.2, STONE, parapet=.55, merlon=.55, thick=.38, gap=1.2, cap=TRIM)
    A.crenel(GROOF, 'z', 5.0, 4.19, 9.4, 6.2, STONE, parapet=.55, merlon=.55, thick=.38, gap=1.2, cap=TRIM)
    # arrow loops (open) in the guardroom front
    # plinth and quoins
    for y0, y1 in ((-.05, .42),):
        SHELL.box(-1.19, 0.0, y0, y1, 10.19, 10.21, TRIM); SHELL.box(4.0, 5.19, y0, y1, 10.19, 10.21, TRIM)
        SHELL.box(-1.21, -1.19, y0, y1, 6.19, 10.19, TRIM); SHELL.box(5.19, 5.21, y0, y1, 6.19, 10.19, TRIM)


gatehouse()

# ================================================================== the towers
def tower(cx, cz, levels, skip, doors, loops, prefix, top_part, walls_by_level, port_face=None):
    """An octagonal tower: wall rings per storey (skip: {level: faces left to a neighbour's wall}), doors {(level, face):
    (u0, u1)}, arrow loops, a corbel course and a crenellated lookout parapet (port_face: the face whose middle crenel
    is cut down to a gun port)."""
    for L in range(levels):
        y0 = BASE if L == 0 else L * 3.2
        y1 = (L + 1) * 3.2
        Pt = walls_by_level[L]
        for i in range(8):
            if i in skip.get(L, ()):
                continue
            holes = []
            if (L + 1, i) in doors:
                u0, u1 = doors[(L + 1, i)]
                holes.append((u0, u1, (L + 1) * 3.2 - .02, (L + 1) * 3.2 + .01))
            if (L, i) in doors:
                u0, u1 = doors[(L, i)]
                holes.append((u0, u1, L * 3.2, L * 3.2 + (2.4 if L == 0 else 2.3)))
            if i in loops:
                holes.append((-.07, .07, L * 3.2 + 1.15, L * 3.2 + 2.25))
                holes.append((-.24, .24, L * 3.2 + 1.62, L * 3.2 + 1.74))
            A.oct_wall(Pt, cx, cz, AP, i, y0, y1, STONE, holes=holes, thick=.3, reveal=TRIM if holes else None)
    top = levels * 3.2
    for i in range(8):
        port = [(-.2, .2, top + .3, top + .8)] if i == port_face else []
        A.oct_wall(top_part, cx, cz, AP + .11, i, top - .35, top - .15, TRIM, thick=.48)        # corbel course
        A.oct_wall(top_part, cx, cz, AP + .09, i, top - .15, top + .62, STONE, thick=.44, holes=port)   # the parapet
        A.oct_wall(top_part, cx, cz, AP + .09, i, top + .62, top + .68, TRIM, thick=.5, holes=[(-.2, .2, top + .6, top + .7)] if port else [])
        c, nrm, tan, half = A.oct_face(cx, cz, AP + .09, i)
        for u in (-.45, .45):
            p = c + tan * u
            corners = [tuple(p + tan * s * .26 + nrm * d) for s, d in ((-1, -.22), (1, -.22), (1, .22), (-1, .22))]
            A.quad_prism(top_part, corners, top + .68, top + 1.28, STONE)


def tower_stairs(sx, cz, levels, stair_name, frame_name, top_final, anchors_prefix):
    """The switchback stair of a tower, one level at a time (the v4 flights' measured geometry: 1.25 m treads, 8 a
    flight at 0.225 deep, 0.2 rise, a return landing), on strings, round a stone spine, the landing on posts; each
    level's floor round its aperture with guard rails."""
    rise = .2
    for L in range(levels):
        base = L * 3.2
        ST = arch(stair_name + str(L + 1), 'stair')
        # the carpentry and the spine under each flight: 'Tread' keeps them whole in the island cutaway (like the
        # treads), and they are no walking surface for the measuring tool (only 'Floor' and 'Stair' parts are)
        FR = arch(frame_name + str(L + 1), 'stair')
        for flight in (0, 1):
            x = sx + (-.7 if flight == 0 else .7)
            for i in range(8):
                zc = cz + .9 - (i + .5) * .225 if flight == 0 else cz - .9 + (i + .5) * .225
                top = base + (i + 1 + flight * 8) * rise
                ST.box(x - .625, x + .625, top - .12, top, zc - .1125, zc + .1125, STAIR)
            # the outer string: a board under the flight's outer edge, following the treads down to the floor
            xo = x - .625 - .035 if flight == 0 else x + .625
            za, zb = (cz + .9, cz - .9) if flight == 0 else (cz - .9, cz + .9)
            ya, yb = base + flight * 1.6, base + (flight + 1) * 1.6
            q = [(za, ya + (0 if flight == 0 else -.1)), (zb, yb + .02), (zb, yb - .34), (za, ya - .4)]
            q = [(u, max(base, v)) for u, v in q]
            dq = []
            for p in q:
                if not dq or abs(dq[-1][0] - p[0]) + abs(dq[-1][1] - p[1]) > 1e-6:
                    dq.append(p)
            if len(dq) >= 3:
                n = len(dq)
                V = [(xo, v, u) for u, v in dq] + [(xo + .035, v, u) for u, v in dq]
                FR.poly(V, [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))] + [(i, n + i, n + (i + 1) % n, (i + 1) % n) for i in range(n)], STAIR)
            # the outer rail with three balusters
            rx = x - .68 if flight == 0 else x + .68
            _beam(FR, Vector((rx, ya + .88, za)), Vector((rx, yb + .88, zb)), .065, OAKM)
            for i in (0, 3, 7):
                zc = cz + .9 - (i + .5) * .225 if flight == 0 else cz - .9 + (i + .5) * .225
                t = base + (i + 1 + flight * 8) * rise
                _beam(FR, Vector((rx, t, zc)), Vector((rx, t + .87, zc)), .055, OAKM)
        # the return landing on two posts and a bearer; the stone spine carries the flights' inner edges
        lt = base + 8 * rise
        ST.box(sx - 1.325, sx + 1.325, lt - .12, lt, cz - 2.1, cz - .9, STAIR)
        for px in (sx - 1.27, sx + 1.27):
            FR.box(px - .035, px + .035, base, lt - .12, cz - 2.07, cz - 2.0, OAKM)
        FR.box(sx - 1.3, sx + 1.3, lt - .24, lt - .12, cz - 2.08, cz - 1.98, OAKM)
        _beam(FR, Vector((sx - 1.33, lt + .9, cz - 2.13)), Vector((sx + 1.33, lt + .9, cz - 2.13)), .08, OAKM)
        FR.box(sx - .07, sx + .07, base, base + 3.2, cz - .9, cz + .9, STONE)


def _beam(Pt, a, b, w, m):
    d = (b - a); L = d.length; d.normalize()
    side = d.cross(Vector((0, 1, 0)))
    if side.length < .01:
        side = d.cross(Vector((1, 0, 0)))
    side.normalize(); up = d.cross(side).normalized()
    V = [tuple(p + side * sx * w / 2 + up * sy * w / 2) for p in (a, b) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    Pt.poly(V, [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)], m)


def tower_floor(Pt, cx, cz, sx, y, guards_final, rail_part):
    """A tower's upper floor: the inner octagon less the stair aperture, oak slabs 0.16 deep; guard rails round the
    aperture (the south-west edge only at the lookout, where no flight goes on)."""
    ring = A.oct_poly(cx, cz, 2.82)
    ax0, ax1, az0, az1 = sx - 1.4, sx + 1.4, cz - 2.1, cz + .9
    from holm_interior_pass import _clip
    for rect in ((-99, 99, az1, 99), (-99, 99, -99, az0), (-99, ax0, az0, az1), (ax1, 99, az0, az1)):
        poly = _clip(ring, *rect)
        if len(poly) >= 3:
            A.prism(Pt, poly, y - .16, y, OAKM)
    gy = y + .9
    rails = [((sx - 1.44, cz + .9), (sx - 1.44, cz - 2.14)), ((sx + 1.44, cz + .9), (sx + 1.44, cz - 2.14)), ((sx - 1.44, cz - 2.14), (sx + 1.44, cz - 2.14))]
    if guards_final:
        rails.append(((sx - 1.44, cz + .86), (sx, cz + .86)))
    for (x0, z0), (x1, z1) in rails:
        _beam(rail_part, Vector((x0, gy, z0)), Vector((x1, gy, z1)), .07, OAKM)
        for x, z in ((x0, z0), (x1, z1)):
            rail_part.box(x - .045, x + .045, y, gy + .05, z - .045, z + .045, OAKM)


WALLS_W = {0: SHELL, 1: USHELL, 2: WL2}
tower(WATCH[0], WATCH[1], 3, {0: (2,), 1: (2,)}, {}, (0, 4, 6), 'Watch', WTOP, WALLS_W, port_face=4)
tower(TURRET[0], TURRET[1], 2, {0: (4,), 1: (4,)}, {(1, 2): (-.9, .9)}, (0, 6), 'Turret', TTOP, {0: SHELL, 1: USHELL}, port_face=3)
# the switchback stairs (the ground flight of each tower is not an upper part: it shows from the base)
WSX, TSX = WATCH[0], TURRET[0] + .5
tower_stairs(WSX, WATCH[1], 3, 'Keep_Tower_Watch_Stair', 'Keep_Tower_Watch_TreadFrame', True, 'stair-watch')
tower_stairs(TSX, TURRET[1], 2, 'Keep_Tower_Turret_Stair', 'Keep_Tower_Turret_TreadFrame', True, 'stair-turret')
for L, y in ((1, F1), (2, F2), (3, F3)):
    Pt = arch('Keep_Upper_Tower_Watch_L%d_Floor' % L, 'floor'); Pt.no_recalc = True
    tower_floor(Pt, WATCH[0], WATCH[1], WSX, y, L == 3, arch('Keep_Upper_Tower_Watch_L%d_Rails' % L, 'floor'))
for L, y in ((1, F1), (2, F2)):
    Pt = arch('Keep_Upper_Tower_Turret_L%d_Floor' % L, 'floor'); Pt.no_recalc = True
    tower_floor(Pt, TURRET[0], TURRET[1], TSX, y, L == 2, arch('Keep_Upper_Tower_Turret_L%d_Rails' % L, 'floor'))

# ================================================================== wall-walk parapets (base 3.1, never clipped)
# the guns on the walks (x, z, yaw): the south-east corner, the east walk, the south walk, the south-west walk; each rides
# through a port cut down in its parapet
GUNS_WALK = [(10.3, 5.35, 0.0), (10.35, -0.9, math.pi / 2), (7.5, 5.35, 0.0), (-2.0, 5.3, 0.0)]
A.crenel(PARA, 'x', 6.0, -2.81, -1.19, 3.1, STONE, parapet=.72, merlon=.62, thick=.36, gap=1.6, cap=TRIM, ports=[(-2.4, -1.6)])
A.crenel(PARA, 'x', 6.0, 5.19, 10.82, 3.1, STONE, parapet=.72, merlon=.62, thick=.36, gap=1.3, cap=TRIM, ports=[(7.1, 7.9), (9.9, 10.7)])
A.crenel(PARA, 'z', 11.0, -3.85, 6.18, 3.1, STONE, parapet=.72, merlon=.62, thick=.36, gap=1.3, cap=TRIM, ports=[(-1.3, -0.5)])
for axis, fixed, a, b in (('x', 4.0, -2.81, -1.19), ('x', 4.0, 5.19, 9.18), ('z', 9.0, -3.85, 3.82)):
    if axis == 'x':
        PARA.box(a, b, 3.1, 4.05, fixed - .18, fixed + .18, STONE); PARA.box(a, b, 4.05, 4.12, fixed - .21, fixed + .21, TRIM)
    else:
        PARA.box(fixed - .18, fixed + .18, 3.1, 4.05, a, b, STONE); PARA.box(fixed - .21, fixed + .21, 4.05, 4.12, a, b, TRIM)

# ================================================================== roofs
def gable_roof():
    th = .14
    # the hall: ridge along z at x -6.5, eaves at 6.4, ridge 8.9; south overhang, north end against the high watch
    zN, zS = -8.85, 6.5
    for side in (-1, 1):
        xe = -6.5 + side * 4.0
        q = [(xe, F2 - .06, zN), (xe, F2 - .06, zS), (-6.5, 8.9, zS), (-6.5, 8.9, zN)]
        V = q + [(p[0], p[1] + th, p[2]) for p in q]
        ROOF.poly(V, [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], SHING)
    _beam(ROOF, Vector((-6.5, 9.08, zN)), Vector((-6.5, 9.08, zS + .02)), .22, OAKM)
    for side in (-1, 1):
        _beam(ROOF, Vector((-6.5 + side * 4.05, F2 + .02, zS + .03)), Vector((-6.5, 8.98, zS + .03)), .16, OAKM)
    # gables: south full, north only where the tower does not stand
    def gable(fixed, x0, x1):
        yl = lambda x: F2 + (4.0 - abs(x + 6.5)) * (2.5 / 4.0)
        pts = [(x0, F2), (x1, F2)] + [(x1, yl(x1))] + ([(-6.5, 8.9)] if x0 < -6.5 < x1 else []) + [(x0, yl(x0))]
        pts = [pts[0], pts[1], pts[2]] + pts[3:]
        V = [(x, y, fixed - .19) for x, y in pts] + [(x, y, fixed + .19) for x, y in pts]
        n = len(pts)
        ROOF.poly(V, [tuple(range(n))[::-1], tuple(range(n, 2 * n))] + [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)], STONE)
    gable(6.0, -10.19, -2.81)
    gable(-9.0, -10.19, -8.24)
    gable(-9.0, -5.76, -2.81)
    # the barracks: ridge along x at z -7, eaves 6.35, ridge 7.45, running into the hall roof at the west
    for side in (-1, 1):
        ze = -7 + side * 2.45
        q = [(-4.1, F2 - .11, ze), (6.85, F2 - .11, ze), (6.85, 7.45, -7.0), (-4.1, 7.45, -7.0)]
        V = q + [(p[0], p[1] + th, p[2]) for p in q]
        ROOF.poly(V, [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], SHING)
    _beam(ROOF, Vector((-4.1, 7.62, -7.0)), Vector((6.85, 7.62, -7.0)), .2, OAKM)
    for z0, z1 in ((-9.19, -8.24), (-5.76, -4.81)):
        yl = lambda z: F2 - .05 + (2.45 - abs(z + 7.0)) * (1.1 / 2.45)
        pts = [(z0, F2 - .05), (z1, F2 - .05), (z1, yl(z1)), (z0, yl(z0))]
        V = [(6.81, y, z) for z, y in pts] + [(7.19, y, z) for z, y in pts]
        ROOF.poly(V, [(3, 2, 1, 0), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)], STONE)


gable_roof()

# ================================================================== the hall stair (west wall, foot at the south)
def hall_stair():
    ST = arch('Keep_Stair_Hall', 'stair')
    FR = arch('Keep_TreadFrame_Hall', 'stair')          # strings, carriage, newels, posts: kept whole by the cutaway
    x0, x1 = -9.79, -7.87
    for i in range(16):
        zf = 3.8 - .3 * i; zb = 3.8 - .3 * (i + 1); top = .2 * (i + 1)
        ST.box(x0, x1, top - .06, top, zb, zf + .02, STAIR)                      # tread with its nosing
        ST.box(x0, x1, .2 * i, top - .06, zf - .03, zf - .01, OAKM)               # riser
    pitch = lambda z: (3.8 - z) * (2 / 3) + .2
    def string(xa, xb, top_off, depth, z_foot, z_head):
        pts = [(z_foot, 0.0), (z_foot, max(0.0, pitch(z_foot) + top_off)), (z_head, pitch(z_head) + top_off), (z_head, pitch(z_head) + top_off - depth)]
        zb = 3.8 - (depth - top_off - .2) * 1.5          # where the underside meets the floor
        pts.append((min(z_foot, zb), 0.0))
        n = len(pts)
        V = [(xa, y, z) for z, y in pts] + [(xb, y, z) for z, y in pts]
        FR.poly(V, [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))] + [(i, n + i, n + (i + 1) % n, (i + 1) % n) for i in range(n)], OAKM)
    string(-9.805, -9.765, .07, .42, 3.84, -0.98)       # the wall string
    string(-7.87, -7.8, .07, .42, 3.84, -0.98)          # the open string
    string(-8.86, -8.78, -.06, .34, 3.7, -0.9)          # the carriage under the middle of the treads
    # newels: at the foot, and at the head rising from the hall floor through to the rail upstairs
    FR.box(-7.9, -7.78, 0, 1.15, 3.84, 3.96, OAKM)
    FR.box(-7.9, -7.78, 0, F1 + 1.05, -1.02, -0.9, OAKM)
    for x, z, y in ((-7.84, 3.9, 1.15), (-7.84, -0.96, F1 + 1.05)):
        FR.lathe(x, z, y, [(.07, 0), (.045, .04), (.06, .1), (0, .16)], 6, STAIR)
    # the handrail and balusters
    _beam(FR, Vector((-7.84, 1.1, 3.9)), Vector((-7.84, F1 + 1.0, -0.96)), .07, OAKM)
    for i in range(1, 16, 2):
        zc = 3.8 - .3 * i - .15; t = .2 * (i + 1)
        FR.box(-7.86, -7.82, t, pitch(zc) + .88, zc - .02, zc + .02, OAKM)
    # posts under the open string and the boarded closet under the low end, with its plank door
    for zc in (2.45, 1.05):
        FR.box(-7.9, -7.78, 0, pitch(zc) - .32, zc - .06, zc + .06, OAKM)
    # the boarded spandrel under the low end (a closet): one sloped panel meeting the string's underside, battens and a
    # plank door with its strap hinges
    zf = 3.8 + (.2 + .07 - .42) * 1.5
    q = [(1.15, 0.0), (zf - .02, 0.0), (1.15, pitch(1.15) + .07 - .42)]
    V = [(-7.86, y, z) for z, y in q] + [(-7.82, y, z) for z, y in q]
    FR.poly(V, [(0, 1, 2), (5, 4, 3), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)], STAIR)
    for zb in (1.15, 1.75, 2.35, 2.95):
        top = max(.1, pitch(zb) + .07 - .42 - .02)
        FR.box(-7.875, -7.805, 0, top, zb - .03, zb + .03, OAKM)
    FR.box(-7.815, -7.8, 0.04, 1.05, 1.82, 2.28, OAKM)
    for yy in (.25, .85):
        FR.box(-7.8, -7.79, yy - .03, yy + .03, 1.84, 2.2, IRONA)
    # the upper floor's trimmer beam at the stair head
    USLABS.box(-9.81, -7.65, F1 - .34, F1 - .02, -1.12, -0.98, OAKM)
    # the stairwell's balustrade upstairs
    B = arch('Keep_Upper_TreadRail_Well', 'stair')
    for (xa, za), (xb, zb) in (((-7.7, -0.98), (-7.7, 3.98)), ((-7.7, 3.98), (-9.79, 3.98))):
        _beam(B, Vector((xa, F1 + .95, za)), Vector((xb, F1 + .95, zb)), .07, OAKM)
        n = int(Vector((xb - xa, zb - za)).length / .22)
        for k in range(1, n):
            t = k / n
            x, z = xa + (xb - xa) * t, za + (zb - za) * t
            B.box(x - .02, x + .02, F1, F1 + .95, z - .02, z + .02, OAKM)
    for x, z in ((-7.7, 3.98), (-9.75, 3.98), (-7.7, 1.5)):
        B.box(x - .05, x + .05, F1, F1 + 1.05, z - .05, z + .05, STAIR)


hall_stair()

# ================================================================== the hearths
def hearth(Wall, Fire, floor, z0, z1, big):
    """A fireplace on the hall's west wall: dressed cheeks, a mantel shelf, a hood tapering to the wall, a firebox with
    iron andirons, logs and flames."""
    h = 1.2 if big else .95
    dep = .52 if big else .44
    Wall.box(-9.81, -9.81 + dep, floor, floor + h, z0, z0 + .32, TRIM)
    Wall.box(-9.81, -9.81 + dep, floor, floor + h, z1 - .32, z1, TRIM)
    Wall.box(-9.81, -9.81 + dep + .08, floor + h, floor + h + .16, z0 - .06, z1 + .06, TRIM)       # mantel
    Wall.box(-9.81, -9.81 + dep + .12, floor + h + .16, floor + h + .22, z0 - .1, z1 + .1, OAKM)   # its oak shelf
    top = floor + 3.2
    q = [(-9.81, floor + h + .22), (-9.81 + dep, floor + h + .22), (-9.81 + .22, top), (-9.81, top)]
    V = [(x, y, z0 + .05) for x, y in q] + [(x, y, z1 - .05) for x, y in q]
    Wall.poly(V, [(3, 2, 1, 0), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)], STONE)
    Wall.box(-9.81, -9.78, floor, floor + h, z0 + .32, z1 - .32, DARK)                                # the sooted back
    # the hearth stone (a floor) and the fire on it
    SL = SLABS if floor < 1 else USLABS
    SL.box(-9.78, -9.81 + dep + .45, floor, floor + .03, z0 + .05, z1 - .05, TRIM)
    cx, cz = -9.81 + dep * .45, (z0 + z1) / 2
    for dz in (-.28, .28):
        Fire.box(cx - .18, cx + .18, floor + .03, floor + .05, cz + dz - .02, cz + dz + .02, P['iron'])
        Fire.box(cx + .16, cx + .2, floor + .03, floor + .3, cz + dz - .025, cz + dz + .025, P['iron'])
        Fire.lathe(cx + .18, cz + dz, floor + .3, [(.03, 0), (0, .05)], 6, P['brass'])
    for k, (a, b) in enumerate((((cx - .12, floor + .1, cz - .4), (cx - .12, floor + .1, cz + .4)), ((cx + .06, floor + .1, cz - .38), (cx + .06, floor + .1, cz + .38)), ((cx - .03, floor + .2, cz - .35), (cx - .03, floor + .2, cz + .33)))):
        Fire.tube(a, b, .065, 6, P['oak_d'], caps=True, cap_m=P['end'])
    Fire.box(cx - .2, cx + .15, floor + .03, floor + .08, cz - .35, cz + .35, P['ember'])
    for k in range(6):
        zz = cz - .3 + k * .12
        for a in (0, math.pi / 2):
            ca, sa = math.cos(a) * .09, math.sin(a) * .09
            f = [(cx - ca, floor + .12, zz - sa), (cx + ca, floor + .12, zz + sa), (cx, floor + .52 - .06 * (k % 2), zz)]
            Fire.poly(f, [(0, 1, 2)], P['fire'])


hearth(HEARTH, FIRE, F0, -5.9, -4.1, True)
hearth(UHEARTH, UFIRE, F1, -5.8, -4.2, False)
REPORT['fx'] += ['Keep_Furnishing_HearthFire (hall hearth, fx=hearth-flame)', 'Keep_Upper_Furnishing_HearthFire (chamber hearth, fx=hearth-flame)']

# ================================================================== portcullis, windlass, the gate's arms
KP.portcullis(PORT, 0.1, 3.9, 2.25, 5.55, 9.28, P)
GUARD.obj(KP.windlass, 0.6, 3.4, F1, 8.55, P)
for x in (0.9, 3.1):
    for k in range(10):
        GUARD.box(x - .015, x + .015, F1 + 1.0 - k * .1 - .09, F1 + 1.0 - k * .1, 9.1 + (k % 2) * .01, 9.13 + (k % 2) * .01, P['iron'])
KP.heater_shield(HUNG, (2.0, 4.12, 10.3), (0, 0, 1), .95, P['red'], P['iron'], 'tower', P['gold'])
for x in (0.55, 3.45):
    KP.banner(HUNG, (x, 5.15, 10.36), (1, 0, 0), (0, 0, 1), .62, 1.9, P['red'], P['gold'], P['gold'], P['oak_d'], tail='swallow')

# ================================================================== torches: outside and in
def torch(Hung, Fl, x, z, y, ox, oz):
    KP.wall_torch(Hung, Fl, x, z, y, ox, oz, P)
    REPORT['fx'].append('torch at %.2f %.2f %.2f' % (x, y, z))


for x in (-0.55, 4.55):                              # flanking the gate arch, outside
    torch(HUNG, FLAMES, x, 10.2, 2.35, 0, 1)
for x in (-2.0, 7.6, 10.2):                          # the south curtains and the hall's south face
    torch(HUNG, FLAMES, x, 6.2, 2.4, 0, 1)
torch(HUNG, FLAMES, -8.0, 6.2, 2.4, 0, 1)
for z in (-2.2, 2.6):                                # the east curtain, outside
    torch(HUNG, FLAMES, 11.2, z, 2.4, 1, 0)
for z in (-6.8, 1.9):                                # the hall's west face
    torch(HUNG, FLAMES, -10.2, z, 2.4, -1, 0)
for x in (-1.8, 5.8):                                # the barracks' north face
    torch(HUNG, FLAMES, x, -9.2, 2.4, 0, -1)
for z in (3.2, -3.3):                                # inside the court: the hall's court face
    torch(HUNG, FLAMES, -2.8, z, 2.3, 1, 0)
for x in (-1.6, 5.4):                                # the barracks' court face
    torch(HUNG, FLAMES, x, -4.8, 2.3, 0, 1)
torch(HUNG, FLAMES, 8.8, -1.0, 2.3, -1, 0)          # the east curtain's court face
for x in (-0.6, 4.6):                                # the curtains' court faces by the gate
    torch(HUNG, FLAMES, x + (-.4 if x < 0 else .4), 3.8, 2.3, 0, -1)
for z in (5.5, 8.4):                                 # the gate passage
    torch(HUNG, FLAMES, 0.0, z, 2.1, 1, 0); torch(HUNG, FLAMES, 4.0, z, 2.1, -1, 0)
torch(HUNG, FLAMES, -9.81, 0.0, 2.1, 1, 0)           # the hall, inside
torch(HUNG, FLAMES, -3.19, -5.6, 2.1, -1, 0)
torch(HUNG, FLAMES, -3.19, 1.2, 2.1, -1, 0)
torch(HUNG, FLAMES, -8.3, 5.81, 2.1, 0, -1)
torch(HUNG, FLAMES, -2.81, -7.0, 2.1, 1, 0)          # the barracks, inside
torch(HUNG, FLAMES, 6.81, -8.4, 2.1, -1, 0)
torch(HUNG, FLAMES, 3.0, -8.81, 2.1, 0, 1)
torch(HUNG, FLAMES, -4.15, -12.0, 2.1, -1, 0)        # the tower bases
torch(HUNG, FLAMES, 12.85, -7.0, 2.1, -1, 0)
torch(UHUNG, UFLAMES, -3.19, 3.3, F1 + 2.0, -1, 0)   # upstairs: solar, chamber, dormitory, guardroom, towers
torch(UHUNG, UFLAMES, -9.81, 3.2, F1 + 2.0, 1, 0)
torch(UHUNG, UFLAMES, -3.19, -5.3, F1 + 2.0, -1, 0)
torch(UHUNG, UFLAMES, -1.2, -8.81, F1 + 2.0, 0, 1)
torch(UHUNG, UFLAMES, 4.5, -8.81, F1 + 2.0, 0, 1)
torch(UHUNG, UFLAMES, -0.81, 7.4, F1 + 2.0, 1, 0)
torch(UHUNG, UFLAMES, 4.81, 7.4, F1 + 2.0, -1, 0)
torch(UHUNG, UFLAMES, -4.15, -11.6, F1 + 2.0, -1, 0)
torch(UHUNG, UFLAMES, 12.85, -6.4, F1 + 2.0, -1, 0)

# ================================================================== the hall's furnishings
def hall_furnishings():
    d = DAIS
    # the high table on the dais, the great chair and its fellows
    HALL.obj(KP.clothed_table, -8.1, -4.9, -8.05, -7.35, d + .78, P, P['linen'], runner=P['red'])
    HALL.obj(KP.great_chair, -6.5, -8.42, d, 0.0, P)
    for x in (-7.6, -5.4):
        HALL.obj(KP.side_chair, x, -8.35, d, 0.0, P)
    HALL.obj(KP.side_chair, -8.45, -7.7, d, math.pi / 2, P)
    HALL.obj(KP.side_chair, -4.55, -7.7, d, -math.pi / 2, P)
    t = d + .79
    for x in (-7.55, -5.45):
        HALL.obj(KP.table_candelabra, HALLF, x, -7.62, t, P)
    for x in (-7.05, -5.95):
        HALL.obj(KP.platter, x, -7.6, t, .15, P)
    for x, z in ((-7.35, -7.88), (-6.5, -7.92), (-5.65, -7.88), (-4.95 + .15, -7.58)):
        HALL.obj(KP.goblet, x, z, t, P)
    HALL.obj(KP.apple_bowl, -6.5, -7.55, t, P)
    HALL.obj(KP.jug, -6.95, -7.9, t, P, h=.24, rot=.5)
    HALL.obj(PP.ellipsoid, -6.05, t + .07, -7.62, .12, .06, .09, P['roast'], seg=8, rings=4)
    # the cloth of honour behind the great chair, banners either side
    KP.banner(HUNG, (-6.5, 3.05, -8.77), (1, 0, 0), (0, 0, 1), 1.5, 2.0, P['red'], P['gold'], P['gold'], P['oak_d'], tail=None)
    for x in (-9.05, -3.95):
        KP.banner(HUNG, (x, 3.0, -8.77), (1, 0, 0), (0, 0, 1), .62, 1.8, P['blue'], P['gold'], P['gold'], P['oak_d'], tail='point')
    # suits of armour at the dais corners and flanking the hall doors; candelabras at the dais steps
    HALL.obj(KP.armour_stand, -9.3, -7.05, d, 0.0, P)
    HALL.obj(KP.armour_stand, -3.7, -7.05, d, 0.0, P)
    HALL.obj(KP.armour_stand, -3.68, -2.72, F0, -math.pi / 2, P)
    HALL.obj(KP.armour_stand, -3.68, 0.72, F0, -math.pi / 2, P)
    for x in (-8.6, -4.4):
        HALL.obj(KP.candelabra, HALLF, x, -6.3, F0, P, h=1.5, arms=3)
    # the long table down the hall with its benches and the meal on it
    HALL.obj(T.trestle_table, -6.95, -6.05, -5.3, -1.0, .8, P['oak'], P['oak_d'], P['end'], along='z')
    HALL.obj(T.bench, -7.42, -7.12, -5.1, -1.2, .46, P['oak'], P['oak_d'], along='z')
    HALL.obj(T.bench, -5.88, -5.58, -5.1, -1.2, .46, P['oak'], P['oak_d'], along='z')
    tt = .8
    for z in (-4.7, -3.6, -2.5, -1.5):
        HALL.obj(KP.platter, -6.72, z, tt, .12, P); HALL.obj(KP.platter, -6.28, z + .25, tt, .12, P)
        HALL.obj(KP.tankard, -6.8, z + .3, tt, P, h=.14, rot=z)
        HALL.obj(KP.tankard, -6.2, z - .1, tt, P, h=.14, rot=-z)
    HALL.obj(T.bread_board, -6.5, -3.05, tt, .34, .22, P['oak_l'], rot=1.57)
    HALL.obj(T.loaf, -6.5, -3.05, tt + .025, .22, .16, .1, P['bread'], P['score'], rot=1.57)
    HALL.obj(PP.cheese, -6.45, -4.15, tt, .08, .06, P['rind'], P['paste'], rot=1.0)
    for z in (-4.95, -1.35):
        HALL.obj(KP.candlestick, HALLF, -6.5, z, tt, P)
    # the spear rack and the shields on the west wall, the sword rack by the stair head
    HALL.obj(KP.spear_rack, -9.4, -3.35, F0, P, yaw=math.pi / 2)
    for z in (-3.75, -2.95):
        KP.heater_shield(HUNG, (-9.77, 2.25, z), (1, 0, 0), .5, P['blue'] if z < -3 else P['red'], P['iron'], 'chevron' if z < -3 else 'cross', P['gold'])
    # the ale board by the east wall: the keg on its cradle, tankards, and the beer to take
    HALL.obj(T.trestle_table, -3.95, -3.32, 2.95, 4.35, .9, P['oak'], P['oak_d'], P['end'], along='z')
    for z in (3.2, 3.55, 4.15):
        HALL.obj(KP.tankard, -3.55, z, .9, P, h=.15, rot=z * 2)
    HALL.obj(KP.jug, -3.6, 3.85, .9, P, h=.26, rot=2.0)
    HALL.obj(KP.keg_cradle, -3.75, 5.05, F0, math.pi / 2, P)
    # a chest and a trophy at the stair foot's corner; the trophy of arms on the south wall
    HALL.obj(T.chest, -9.72, -9.12, 4.75, 5.72, .55, P['oak'], P['oak_d'], P['iron'], P['brass'], front='e')
    KP.armour_trophy(HUNG, (-8.35, 1.75, 5.77), (0, 0, -1), P)
    KP.banner(HUNG, (-4.3, 3.0, 5.77), (1, 0, 0), (0, 0, -1), .7, 1.8, P['red'], P['gold'], P['gold'], P['oak_d'], tail='swallow')
    KP.banner(HUNG, (-3.23, 3.0, -4.6), (0, 0, 1), (-1, 0, 0), .6, 1.7, P['blue'], P['gold'], P['gold'], P['oak_d'], tail='point')
    # candelabras either side of the great south window
    for x in (-7.25, -4.8):
        HALL.obj(KP.candelabra, HALLF, x, 5.3, F0, P, h=1.4, arms=3)
    # rugs: under the long table, a runner from the doors, before the high table (on the dais)
    KP.rug(RUGS, -7.95, -5.05, -5.8, -0.45, F0, P, P['rug_field_r'], P['rug_border'], P['rug_band'], P['rug_medal'], along='z')
    KP.rug(RUGS, -5.05, -3.35, -1.55, -0.45, F0, P, P['rug_field_b'], P['rug_border'], P['rug_band'], P['rug_medal'], fringe=False)
    KP.rug(RUGS, -8.65, -4.35, -7.25, -6.7, F0 + d, P, P['rug_field_b'], P['rug_border'], P['rug_band'], P['rug_medal'], fringe=False)


hall_furnishings()


# the beer: its own object, a full tankard standing at the ale board's front edge
BEER = Part('Keep_ServiceBeer_Tankard'); BEER.props = {'service': 'keep-beer', 'anchor': 'keep-beer', 'cutaway': 'floor'}
BEER.obj(KP.tankard, -3.83, 3.62, .9, P, h=.16, rot=1.2)
BEER.box(-3.87, -3.79, .9 + .145, .9 + .165, 3.58, 3.66, P['wool'])          # a head of foam
PARTS['Keep_ServiceBeer_Tankard'] = BEER
REPORT['services'].append({'service': 'keep-beer', 'mesh': 'Keep_ServiceBeer_Tankard', 'at': [-3.83, .9, 3.62], 'stanceTarget': 'keep-beer', 'stance': [-4.5, 0, 3.5]})


# ================================================================== the barracks' furnishings (mess and armoury)
def barracks_furnishings():
    for k, bx in enumerate((2.3, 3.7, 5.1)):
        g = BARR.group()
        x0, x1, z0, z1 = bx + .04, bx + .96, -8.76, -7.92
        T.chest(BARR, x0, x1, z0, z1, .62, P['oak'], P['oak_d'], P['iron'], P['brass'], front='s')
        T.folded_cloth(BARR, x0 + .08, x1 - .08, z0 + .08, z0 + .52, .62, 3, [[P['blanket_r'], P['blanket_s'], P['blanket_b']][k], P['blanket_s']], fold_axis='x')
        T.bedroll(BARR, (x0 + .12, .8, z0 + .66), (x1 - .12, .8, z0 + .66), .085, P['linen'] if k != 1 else P['blanket_b'], P['strap'])
        if k == 1:
            T.helmet(BARR, bx + .5, z0 + .3, .71, .13, P['steel_d'], band=P['iron'], rot=math.pi / 2)
        BARR.close(g)
    BARR.obj(T.trestle_table, 2.6, 5.4, -6.05, -5.45, .9, P['oak'], P['oak_d'], P['end'], along='x')
    for x in (3.2, 4.1, 4.9):
        BARR.obj(T.stool, x, -6.42, .45, .16, P['oak_l'], P['oak_d'], rot=x)
    for x, z, r in ((2.95, -5.8, .5), (3.55, -5.65, 2.0), (4.6, -5.82, 1.2)):
        BARR.obj(KP.tankard, x, z, .9, P, h=.15, rot=r)
    BARR.obj(T.jug, 3.2, -5.62, .9, .28, P['oak_d'], P['ink'], rot=2.6, glaze=P['linen'])
    for i, (x, z) in enumerate(((4.24, -5.62), (4.3, -5.72), (4.19, -5.57))):
        BARR.obj(T.dice, x, z, .9, .032, P['wool'], P['ink'], rot=i * .7)
    BARR.obj(T.lantern, 5.1, -5.75, .9, P['iron'], P['flame'], h=.28)
    BARR.obj(KP.spear_rack, -1.3, -8.45, F0, P)
    BARR.obj(KP.sword_rack, -1.4, -5.6, F0, P)
    BARR.obj(KP.armour_stand, -2.3, -7.0, F0, math.pi / 2, P, tabard=True)
    BARR.obj(T.barrel, 6.35, -5.6, F0, .3, .85, [P['stave'], P['oak'], P['oak_l']], P['iron'], [P['oak_l'], P['oak']], rot=.3, open_top=True, fill=P['water'])
    BARR.obj(T.crate, 5.9, 6.6, 0, .55, -8.7, -8.05, [P['oak_l'], P['oak'], P['oak_l']], P['oak_d'])
    for z in (-7.9, -6.4):
        KP.heater_shield(HUNG, (-2.79, 1.7, z + .1), (1, 0, 0), .5, P['red'], P['iron'], 'tower', P['gold'])
    KP.banner(HUNG, (2.0, 3.0, -8.77), (1, 0, 0), (0, 0, 1), .6, 1.7, P['red'], P['gold'], P['gold'], P['oak_d'], tail='swallow')
    KP.rug(RUGS, 2.3, 5.7, -6.85, -5.3, F0, P, P['rug_field_b'], P['rug_border'], P['rug_band'], P['rug_medal'], fringe=False)


barracks_furnishings()


# ================================================================== the tower bases (reached by their stairs)
def tower_bases():
    for x, z in ((-9.25, -12.4), (-9.3, -13.2)):
        TOWB.obj(T.barrel, x, z, F0, .28, .8, [P['stave'], P['oak'], P['oak_l']], P['iron'], [P['oak_l'], P['oak']], rot=x)
    TOWB.obj(T.sack, -4.75, -12.3, F0, .38, .58, P['wool'], P['rope'], rot=.4)
    TOWB.obj(T.sack, -4.8, -13.0, F0, .34, .52, P['straw'], P['rope'], rot=1.4)
    TOWB.obj(KP.shot_pile, -4.85, -11.4, F0, P)
    for z in (-7.9, -6.3):
        TOWB.obj(T.barrel, 12.3, z, F0, .24, .62, [P['stave'], P['oak']], P['iron'], [P['oak_l'], P['oak']], rot=z)
        TOWB.box(12.3 - .245, 12.3 + .245, .3, .36, z - .245, z + .245, P['black'])
    TOWB.obj(KP.sword_rack, 8.05, -9.0, F0, P, yaw=-math.pi / 4)


tower_bases()


# ================================================================== upstairs: the Warden's chamber and the solar
def quarters():
    y = F1
    QUART.obj(KP.four_poster, -9.75, -7.65, -8.55, -6.95, y, 'w', P)
    QUART.obj(T.at, y, T.chest, -7.6, -7.15, -8.35, -7.15, .5, P['oak_l'], P['oak_d'], P['iron'], P['brass'], front='e', handles=False)
    QUART.obj(KP.washstand, -9.45, -6.42, y, P)
    QUART.obj(KP.wardrobe, -4.75, -3.3, -8.78, -8.2, y, 2.1, 's', P)
    QUART.obj(KP.armour_stand, -5.4, -8.3, y, 0.0, P, plume=True)
    for z in (-5.45, -4.55):
        QUART.obj(KP.side_chair, -8.35, z, y, -math.pi / 2, P)
    QUART.obj(T.at, y, T.stool, -8.0, -5.0, .4, .14, P['oak_l'], P['oak_d'])
    # the writing desk under the partition, its books and the duty roll
    dt = y + .78
    QUART.obj(T.at, y, T.trestle_table, -9.0, -7.3, -3.9, -3.3, dt - y, P['oak'], P['oak_d'], P['end'], along='x', legs='legs')
    for k in range(3):
        QUART.obj(T.closed_book, -8.8, -3.6, dt + k * .05, .24, .18, .05, [P['leather'], P['blanket_s'], P['strap']][k], P['paper_l'], rot=.1 * k)
    QUART.obj(T.open_book, -8.1, -3.55, dt, .34, .26, P['leather'], P['parchment'], ink=P['ink'], rot=.08)
    QUART.obj(T.inkwell, -7.6, -3.7, dt, P['pewter_d'], P['ink'])
    QUART.obj(T.quill, -7.6, -3.7, dt + .06, .6, P['wool'], P['paper_l'])
    QUART.obj(KP.table_candelabra, QUARTF, -7.5, -3.45, dt, P)
    QUART.obj(KP.side_chair, -8.1, -4.25, y, math.pi, P)
    KP.rug(URUGS, -8.6, -4.35, -6.7, -3.6, y, P, P['rug_field_r'], P['rug_border'], P['rug_band'], P['rug_medal'], along='x')
    KP.heater_shield(UHUNG, (-9.77, y + 2.1, -7.75), (1, 0, 0), .45, P['red'], P['iron'], 'tower', P['gold'])
    KP.banner(UHUNG, (-5.2, y + 2.85, -8.77), (1, 0, 0), (0, 0, 1), .55, 1.3, P['red'], P['gold'], P['gold'], P['oak_d'], tail='swallow')
    QUART.obj(KP.candelabra, QUARTF, -9.35, -3.65, y, P, h=1.35, arms=3)
    # the solar: two knights' beds with chests, the map table, a suit of armour at the landing, a sword rack
    for z0 in (-2.6, 0.1):
        QUART.obj(T.bed, -5.15, -3.25, z0, z0 + 1.1, y, P['oak'], P['oak_d'], P['ticking'], P['linen'], P['blanket_r'] if z0 < 0 else P['blanket_s'], P['linen'], head='e', post_h=1.1, foot_h=.7)
    QUART.obj(T.at, y, T.chest, -3.85, -3.27, -1.35, -0.65, .48, P['oak_l'], P['oak_d'], P['iron'], P['brass'], front='w')
    QUART.obj(T.at, y, T.chest, -3.85, -3.27, 1.45, 2.15, .48, P['oak'], P['oak_d'], P['iron'], None, front='w')
    QUART.obj(KP.map_table, -7.2, -5.9, 1.55, 2.65, y + .8, P, floor=y)
    for x, z, r in ((-6.55, 1.1, 0.0), (-6.55, 3.1, math.pi)):
        QUART.obj(KP.side_chair, x, z, y, r, P)
    QUART.obj(KP.candelabra, QUARTF, -7.25, 3.25, y, P, h=1.35, arms=3)
    QUART.obj(KP.armour_stand, -9.3, 5.25, y, math.pi / 2, P)
    QUART.obj(T.at, y, T.chest, -9.72, -9.12, 4.25, 4.95, .5, P['oak'], P['oak_d'], P['iron'], P['brass'], front='e')
    KP.rug(URUGS, -7.45, -5.6, 0.95, 3.25, y, P, P['rug_field_b'], P['rug_border'], P['rug_band'], P['rug_medal'], along='z')
    KP.banner(UHUNG, (-5.5, y + 2.85, 5.77), (1, 0, 0), (0, 0, -1), .6, 1.5, P['red'], P['gold'], P['gold'], P['oak_d'], tail='swallow')
    KP.armour_trophy(UHUNG, (-3.23, y + 1.75, -0.2), (-1, 0, 0), P)


quarters()


# ================================================================== the dormitory over the barracks
def dormitory():
    y = F1
    blanks = [[P['blanket_r'], P['blanket_s']], [P['blanket_b'], P['blanket_r']], [P['blanket_s'], P['blanket_b']], [P['blanket_r'], P['blanket_b']]]
    for k, x0 in enumerate((-1.9, 0.2, 2.3, 4.4)):
        DORM.obj(KP.bunk, x0, x0 + 1.9, -8.75, -7.92, y, P, blanks[k])
    DORM.obj(T.at, y, T.trestle_table, 1.0, 3.4, -5.75, -5.3, .78, P['oak'], P['oak_d'], P['end'], along='x', legs='legs')
    for x in (1.5, 2.9):
        DORM.obj(T.at, y, T.stool, x, -5.95, .42, .14, P['oak_l'], P['oak_d'], rot=x)
    DORM.obj(T.lantern, 2.2, -5.52, y + .78, P['iron'], P['flame'], h=.26)
    for i, (x, z) in enumerate(((2.6, -5.5), (2.66, -5.58))):
        DORM.obj(T.dice, x, z, y + .78, .032, P['wool'], P['ink'], rot=i)
    KP.cloak_pegs(UHUNG, (-2.5, -5.23), (0.6, -5.23), y + 1.75, (0, -1), P, [P['cloak_g'], P['cloak_b'], P['cloak_r']])
    KP.cloak_pegs(UHUNG, (3.8, -5.23), (6.6, -5.23), y + 1.75, (0, -1), P, [P['cloak_r'], P['cloak_g'], P['cloak_b']])
    KP.rug(URUGS, -2.2, 6.2, -7.3, -5.85, y, P, P['rug_field_r'], P['rug_border'], P['rug_band'], P['rug_medal'], fringe=False)


dormitory()


# ================================================================== the guardroom over the gate
def guardroom():
    y = F1
    GUARD.obj(T.at, y, T.trestle_table, 1.3, 2.9, 6.5, 7.05, .78, P['oak'], P['oak_d'], P['end'], along='x', legs='legs')
    for x in (1.6, 2.6):
        GUARD.obj(T.at, y, T.stool, x, 6.2, .42, .14, P['oak_l'], P['oak_d'], rot=x)
    GUARD.obj(T.lantern, 2.1, 6.8, y + .78, P['iron'], P['flame'], h=.26)
    GUARD.obj(KP.brazier, GUARDF, 4.1, 7.2, y, P)
    GUARD.obj(KP.spear_rack, -0.25, 7.3, y, P, yaw=math.pi / 2)
    GUARD.obj(KP.shot_pile, 3.9, 8.0, y, P, r=.06)


guardroom()


# ================================================================== the walks and the tower tops: guns
def guns():
    y = F1
    for x, z, yaw in GUNS_WALK:                                             # each through its own gun port
        WALKS.obj(KP.cannon, x, z, y, yaw, P)
    WALKS.obj(KP.shot_pile, 10.5, 2.4, y, P)
    WALKS.obj(KP.shot_pile, 8.4, 5.55, y, P, r=.065, layers=2)
    WALKS.obj(KP.rammer, (10.95, y + .02, -2.6), (10.95, y + 1.9, -2.4), P)
    WALKS.obj(KP.brazier, WALKSF, 10.5, 1.2, y, P)
    # the lookouts: a gun behind the port in the middle of a parapet face
    WATT.obj(KP.cannon, -7.0 - 2.1, -12.0, F3, -math.pi / 2, P)
    WATT.obj(KP.shot_pile, -9.25, -13.3, F3, P, r=.06, layers=2)
    d = 2.1 * math.sqrt(.5)
    TURT.obj(KP.cannon, 10.0 - d, -7.0 + d, F2, -math.pi / 4, P)
    TURT.obj(KP.shot_pile, 8.1, -6.4, F2, P, r=.06, layers=2)
    # the towers' landings: a bench and a lantern in the watch, powder and shot in the turret, a brazier up in the watch
    TOW1.obj(T.at, F1, T.bench, -9.7, -9.3, -12.6, -11.3, .42, P['oak'], P['oak_d'], along='z')
    for z in (-7.9, -6.9):
        TOW1.obj(T.barrel, 12.35, z, F1, .22, .55, [P['stave'], P['oak']], P['iron'], [P['oak_l'], P['oak']], rot=z)
        TOW1.box(12.35 - .225, 12.35 + .225, F1 + .26, F1 + .31, z - .225, z + .225, P['black'])
    TOW1.obj(KP.shot_pile, 8.0, -8.6, F1, P, r=.06, layers=2)
    WAT2.obj(KP.brazier, WAT2F, -9.2, -12.6, F2, P)
    WAT2.obj(T.at, F2, T.stool, -4.8, -12.2, .42, .14, P['oak_l'], P['oak_d'])


guns()

# ================================================================== doors (leaves on hinge pivots, standing open)
DM = dict(oak=P['oak'], oak_d=P['oak_d'], iron=P['iron'])
DOORS = [
    # id, storey, leaves [(leaf, hinge (x, z), closed dir, width)], opens into (room normal), height, props
    ('keep-gate', 0, [('w', (0.0, 9.4), (1, 0), 2.0), ('e', (4.0, 9.4), (-1, 0), 2.0)], (0, -1), 2.35,
     {'section': 'gate passage (the one way in)', 'startOpen': True, 'lessonRoute': True, 'studs': True}),
    ('keep-door-hall', 0, [('n', (-3.19, -1.9), (0, 1), .9), ('s', (-3.19, -0.1), (0, -1), .9)], (-1, 0), 2.55,
     {'section': 'court <-> great hall', 'startOpen': True, 'lessonRoute': True}),
    ('keep-door-barracks', 0, [('w', (0.1, -5.19), (1, 0), .9), ('e', (1.9, -5.19), (-1, 0), .9)], (0, -1), 2.45,
     {'section': 'court <-> barracks'}),
    ('keep-door-turret', 0, [('n', (7.19, -7.9), (0, 1), .9), ('s', (7.19, -6.1), (0, -1), .9)], (1, 0), 2.35,
     {'section': 'barracks <-> east turret base'}),
    ('keep-door-watch', 1, [('w', (-7.1, -8.81), (1, 0), 1.2)], (0, 1), 2.25,
     {'section': "Warden's chamber <-> high watch (level two)"}),
    ('keep-door-dormitory', 1, [('n', (-2.81, -7.9), (0, 1), .9), ('s', (-2.81, -6.1), (0, -1), .9)], (1, 0), 2.25,
     {'section': "Warden's chamber <-> dormitory (level two ring)"}),
    ('keep-door-turret-l1', 1, [('n', (7.19, -7.9), (0, 1), .9), ('s', (7.19, -6.1), (0, -1), .9)], (1, 0), 2.25,
     {'section': 'dormitory <-> east turret (level two ring)'}),
    ('keep-door-eastwalk', 1, [('w', (9.1, -4.15), (1, 0), .9), ('e', (10.9, -4.15), (-1, 0), .9)], (0, -1), 2.25,
     {'section': 'east turret <-> east wall walk (level two ring)'}),
    ('keep-door-gatehouse-e', 1, [('n', (4.81, 4.2), (0, 1), .8), ('s', (4.81, 5.8), (0, -1), .8)], (-1, 0), 2.25,
     {'section': 'south-east walk <-> gatehouse guardroom (level two ring)'}),
    ('keep-door-gatehouse-w', 1, [('n', (-0.81, 4.2), (0, 1), .8), ('s', (-0.81, 5.8), (0, -1), .8)], (1, 0), 2.25,
     {'section': 'gatehouse guardroom <-> south-west walk (level two ring)'}),
    ('keep-door-solar', 1, [('n', (-3.19, 4.2), (0, 1), .8), ('s', (-3.19, 5.8), (0, -1), .8)], (-1, 0), 2.25,
     {'section': 'south-west walk <-> solar (level two ring)'}),
    ('keep-door-chamber', 1, [('w', (-5.9, -3.15), (1, 0), .9), ('e', (-4.1, -3.15), (-1, 0), .9)], (0, -1), 2.25,
     {'section': "solar <-> Warden's chamber (level two ring)"}),
]
for did, storey, leaves, nroom, h, props in DOORS:
    y0 = F1 if storey else F0
    pre = 'Keep_Upper_Door_' if storey else 'Keep_Door_'
    rec = {'id': did, 'storey': storey, 'floorY': y0, 'height': h, 'opensInto': list(nroom), 'leaves': []}
    for leaf, hinge, dc, w in leaves:
        pp = dict(props, door=did, leaf=did + '-' + leaf, service=did, anchor=did)
        piv, obj = A.door_leaf(pre + did + '-' + leaf, hinge, dc, nroom, w - .015, h, y0, DM, pp, studs=bool(props.get('studs')), against=did == 'keep-gate')
        rec['leaves'].append({'leaf': did + '-' + leaf, 'pivot': piv.name, 'mesh': obj.name, 'hinge': [hinge[0], y0, hinge[1]],
                              'closedYaw': piv['closedYaw'], 'openYaw': piv['openYaw'], 'width': round(w - .015, 3)})
    rec.update({k: v for k, v in props.items() if k != 'studs'})
    REPORT['doors'].append(rec)

# ================================================================== anchors: stair feet and heads, the beer
STAIRS = [('stair-hall', (-8.5, F0, 4.5), (-8.5, F1, -1.5), 'Keep_Stair_Hall', 'great hall <-> the solar landing'),
          ('stair-watch-1', (-7.5, F0, -10.5), (-6.5, F1, -10.5), 'Keep_Tower_Watch_Stair1', 'high watch: base <-> level two'),
          ('stair-watch-2', (-7.5, F1, -10.5), (-6.5, F2, -10.5), 'Keep_Tower_Watch_Stair2', 'high watch: level two <-> watch room'),
          ('stair-watch-3', (-7.5, F2, -10.5), (-6.5, F3, -10.5), 'Keep_Tower_Watch_Stair3', 'high watch: watch room <-> lookout'),
          ('stair-turret-1', (9.5, F0, -5.5), (11.5, F1, -5.5), 'Keep_Tower_Turret_Stair1', 'east turret: base <-> level two'),
          ('stair-turret-2', (9.5, F1, -5.5), (11.5, F2, -5.5), 'Keep_Tower_Turret_Stair2', 'east turret: level two <-> lookout')]
for sid, foot, head, mesh, label in STAIRS:
    for end, p in (('foot', foot), ('head', head)):
        nm = 'Keep_Anchor_' + sid + '-' + end
        A.anchor(nm, p[0], p[1], p[2], {'anchor': sid + '-' + end, 'climb': sid, 'end': end, 'stairMesh': mesh, 'label': label})
        REPORT['anchors'].append({'anchor': sid + '-' + end, 'node': nm, 'at': list(p), 'climb': sid, 'end': end})
    REPORT['stairs'].append({'climb': sid, 'mesh': mesh, 'foot': list(foot), 'head': list(head), 'label': label})
A.anchor('Keep_Anchor_keep-beer', -3.83, .9, 3.62, {'anchor': 'keep-beer', 'service': 'keep-beer', 'mesh': 'Keep_ServiceBeer_Tankard', 'stance': [-4.5, 0, 3.5]})
REPORT['anchors'].append({'anchor': 'keep-beer', 'node': 'Keep_Anchor_keep-beer', 'at': [-3.83, .9, 3.62], 'service': 'keep-beer'})

# ================================================================== build everything
objs = build_all()
for name, G, M_ in (('Keep_Shell_StainedGlass', GLASS_G, GLASS), ('Keep_Upper_Shell_StainedGlass', UGLASS_G, GLASS)):
    o = G.build(None, vcol=True)
    if o is not None:
        o.data.materials.clear(); o.data.materials.append(M_)
        o.data.polygons.foreach_set('material_index', [0] * len(o.data.polygons))
        o['cutaway'] = 'window'
        REPORT['parts'][name] = sum(len(f) - 2 for f in G.f)
REPORT['triangles'] = sum(REPORT['parts'].values())
REPORT['meshes'] = len([o for o in bpy.data.objects if o.type == 'MESH'])
PK.REPORT.update({'built': REPORT['parts']})
out = ROOT / SP['flat']; out.parent.mkdir(parents=True, exist_ok=True)
bpy.context.scene.frame_set(1); bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(out), copy=True, compress=False)
rep = ROOT / SP['buildReport']; rep.parent.mkdir(parents=True, exist_ok=True)
rep.write_text(json.dumps(REPORT, indent=1) + '\n')
print('[KEEP_OVERHAUL_BUILD]', json.dumps({'flat': SP['flat'], 'triangles': REPORT['triangles'], 'meshes': REPORT['meshes'], 'doors': len(REPORT['doors']), 'anchors': len(REPORT['anchors'])}))
