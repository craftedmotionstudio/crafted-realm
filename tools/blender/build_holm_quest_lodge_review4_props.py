"""Quest Lodge review-4 props pass (owner review 4, 2026-09-27: the lodge's things, like the Guide House's, must "look
designed purposefully"; the Guide House ware was redone in v6, this does the lodge).

From the review-4 lodge (holm-quest-lodge-review4-v1/lodge.blend, Blender 5.1: the notice board, the region chart, the
leaded panes), the pieces that were still plain boxes are designed again, each inside its old footprint and at its old
working height, so what stands on them (the chart, the candles and books of the dressing) still stands on them:
 - the map table (Lodge_FurnishingMap_Table, still the 'Study region chart' service): a planked top with breadboard
   ends, a moulded apron, four turned legs and a low stretcher frame;
 - the hearth (Lodge_FurnishingHearth_Stone): dressed jamb blocks round the same fire opening, a lintel with a
   keystone, an oak mantel shelf on two stone corbels, a hood narrowing up into the chimney, a raised hearth stone;
 - the bookcase on the north wall (Lodge_FurnishingShelf_Case): cornice and plinth, boarded back, and shelves of
   books of many heights and bindings (a few leaning), scrolls stacked in a rack, folded guest blankets, a candle box;
 - the writing desk in the bay (Lodge_FurnishingBay_Desk): turned legs, a drawer with a knob, a pigeonhole rack along
   the back, sheets of parchment;
 - upstairs, the guest room (Lodge_UpperFurnishing_Bed/_Desk/_Stool): a bed with posts, head- and footboards, a
   ticking mattress, a patchwork quilt turned down, a bolster and a folded blanket; a writing table with a drawer;
   a three-legged stool.
The lodge's own dressing keeps its pieces (the inkwell the chart already carries is taken off the dressing).
Plan coordinates (x east, y up, z south; Blender (x, -z, y)), lodge-local. Original designs.
Run: "Blender 5.1/blender.exe" -b .studio-workspaces/holm-quest-lodge-review4-v1/candidates/lodge.blend
       --python tools/blender/build_holm_quest_lodge_review4_props.py
Out: .studio-workspaces/holm-quest-lodge-review4-v2/candidates/{lodge.blend, lodge.glb, material-contract.json, props.report.json}"""
import bpy, bmesh, sys, math, random, shutil, json
from pathlib import Path
HERE = Path(__file__).resolve().parent; sys.path.insert(0, str(HERE)); ROOT = HERE.parents[1]
from holm_interior_kit import Acc, M, sharp_by_angle, books, stone_face
SRC = ROOT / '.studio-workspaces/holm-quest-lodge-review4-v1/candidates'
OUT = ROOT / '.studio-workspaces/holm-quest-lodge-review4-v2/candidates'; OUT.mkdir(parents=True, exist_ok=True)
rng = random.Random(202609272)
report = {'removed': [], 'islandsRemoved': {}, 'built': {}}

# ---- take away the plain boxes ----
for n in ('Lodge_FurnishingMap_Warm_oak', 'Lodge_FurnishingHearth_Light_gray_limestone', 'Lodge_FurnishingShelf_Warm_oak',
          'Lodge_FurnishingShelf_Burgundy_wax', 'Lodge_FurnishingShelf_Original_parchment', 'Lodge_FurnishingShelf_Sage_guest_blanket',
          'Lodge_FurnishingBay_Warm_oak', 'Lodge_FurnishingBay_Original_parchment', 'Lodge_UpperFurnishing_Original_parchment',
          'Lodge_UpperFurnishing_Sage_guest_blanket'):
    o = bpy.data.objects.get(n); assert o is not None, n
    bpy.data.objects.remove(o, do_unlink=True); report['removed'].append(n)

def drop_islands(name, test):
    """Delete the connected pieces of an object whose plan bounds pass test(x0,x1,y0,y1,z0,z1)."""
    o = bpy.data.objects[name]; bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
    seen = set(); kill = []
    for f in bm.faces:
        if f.index in seen: continue
        st = [f]; seen.add(f.index); fs = []
        while st:
            g = st.pop(); fs.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h.index not in seen: seen.add(h.index); st.append(h)
        ws = [o.matrix_world @ v.co for g in fs for v in g.verts]
        b = (min(w.x for w in ws), max(w.x for w in ws), min(w.z for w in ws), max(w.z for w in ws), -max(w.y for w in ws), -min(w.y for w in ws))
        if test(*b): kill.extend(fs)
    bmesh.ops.delete(bm, geom=kill, context='FACES'); bm.to_mesh(o.data); bm.free(); o.data.update()
    report['islandsRemoved'][name] = report['islandsRemoved'].get(name, 0) + len(kill)
# upstairs: the desk, stool and bed boxes (the two gallery rails further east stay)
drop_islands('Lodge_UpperFurnishing_Warm_oak', lambda x0, x1, y0, y1, z0, z1: x1 < -4.0)
# the old patchwork sheet laid on the bed box (the new bed carries its own quilt)
drop_islands('Lodge_UpperFurnishingDressing', lambda x0, x1, y0, y1, z0, z1: y0 > 4.05 and y1 < 4.13 and z0 > 1.3)
# the dressing's inkwell and pen on the map table's east end: the region chart carries its own there
drop_islands('Lodge_FurnishingDressing', lambda x0, x1, y0, y1, z0, z1: x0 > 2.95 and x1 < 3.16 and y0 > 1.0 and y1 < 1.25 and z0 > -.08 and z1 < .1)

# the region chart (review-4 build) lay 2 mm over the table top: lift it clear
bpy.data.objects['Lodge_FurnishingMap_Chart'].location.z += .003

# ---- palette (flat colours, sRGB as the game shows them) ----
oak = M('Lodge oak', '#6e4b2e'); oak_l = M('Lodge oak light', '#7d5835'); oak_d = M('Lodge oak dark', '#4a3322'); oak_x = M('Lodge oak end grain', '#8a6843')
iron = M('Lodge iron', '#2f302f'); brass = M('Lodge brass', '#b39146')
st = [M('Hearth stone 1', '#8b867c'), M('Hearth stone 2', '#7f7a70'), M('Hearth stone 3', '#959085')]; mortar = M('Hearth mortar', '#5f5a52'); soot = M('Hearth soot', '#2b2724')   # the lodge limestone's tone in game
paper = [M('Lodge parchment', '#dccb9c'), M('Lodge parchment pale', '#e6d9b2'), M('Lodge parchment aged', '#cdb784')]
leather = [M('Binding oxblood', '#6b2a24'), M('Binding brown', '#5a4128'), M('Binding green', '#2f4a3a'), M('Binding blue', '#2c3a55'), M('Binding tan', '#8a6a3a'), M('Binding black', '#2a2522')]
linen = M('Bed linen', '#e3dcc8'); ticking = M('Mattress ticking', '#d6cdb2'); stripe = M('Ticking stripe', '#6f7f95')
patch = [M('Quilt blue', '#7d93b5'), M('Quilt green', '#8fae7c'), M('Quilt red', '#b8574a'), M('Quilt cream', '#e0d6b5'), M('Quilt ochre', '#c9a54e')]
sage = M('Guest blanket sage', '#9fb39a'); wool = M('Guest blanket wool', '#d9d0b8'); wax = M('Candle wax', '#efe6cc'); ink = M('Lodge ink', '#141414'); glass = M('Lodge ink bottle', '#27313a')

def turned_leg(A, x, z, y0, y1, r, m):
    """A turned leg: square-ish foot, swelling baluster, a collar under the top."""
    h = y1 - y0
    A.lathe(x, z, y0, [(r * .8, 0), (r, .04 * h), (r * .7, .12 * h), (r * 1.15, .3 * h), (r * .75, .55 * h), (r * .7, .8 * h), (r * .95, .86 * h), (r * .9, h)], 8, m, top=False)

# ---- the map table: top 0.97..1.01 over x 0.70..3.30, z -1.20..0.20 (the chart lies at 1.012) ----
A = Acc('Lodge_FurnishingMap_Table')
T0, T1 = .965, 1.01
for i, (za, zb) in enumerate(((-1.2, -.735), (-.73, -.265), (-.26, .2))):          # three boards, hairline joints
    A.box(.84, 3.16, T0, T1, za + .003, zb - .003, (oak, oak_l, oak)[i])
for xa, xb in ((.7, .84), (3.16, 3.3)):                                              # breadboard ends
    A.box(xa, xb, T0 - .005, T1, -1.2, .2, oak_d)
    for zz in (-.95, -.5, -.05):
        A.tube((xa + .07, T1, zz), (xa + .07, T1 + .004, zz), .012, 6, iron)          # pegs
A.box(.98, 3.02, .85, T0, -1.01, -.99, oak_d, skip='b'); A.box(.98, 3.02, .85, T0, .0, .02, oak_d, skip='b')   # aprons
A.box(.96, .98, .85, T0, -1.0, .0, oak_d, skip='b'); A.box(3.02, 3.04, .85, T0, -1.0, .0, oak_d, skip='b')
A.box(.98, 3.02, .86, .875, -1.02, -1.01, oak_l); A.box(.98, 3.02, .86, .875, .02, .03, oak_l)                 # moulding
for x in (.96, 3.04):
    for z in (-1.005, .005):
        turned_leg(A, x, z, .0, .85, .055, oak)
A.box(.94, .98, .14, .2, -1.0, .0, oak_d); A.box(3.02, 3.06, .14, .2, -1.0, .0, oak_d)                         # end stretchers
A.box(.98, 3.02, .15, .19, -.52, -.48, oak_d)                                                                 # long stretcher
A.build(None); report['built']['Lodge_FurnishingMap_Table'] = len(A.f)

# ---- the hearth: the same opening (z 0.42..1.48, up to 1.58) against the east wall, x 3.97..5.03, z 0.18..1.72 ----
H = Acc('Lodge_FurnishingHearth_Stone')
H.box(3.97, 5.03, 0, .1, .18, 1.72, st[1]); H.box(3.99, 4.25, .1, .14, .36, 1.54, st[2])                    # hearth stone + raised front
for z0, z1 in ((.18, .40), (1.50, 1.72)):                                                                    # jambs in dressed blocks, just clear of the dressing's firebox lining (z 0.42..1.48)
    y = .1
    for k, hh in enumerate((.36, .3, .38, .34)):
        inset = .0 if k % 2 == 0 else .03
        H.box(4.07 + inset, 4.93, y + .006, y + hh - .006, z0 + (inset if z0 > 1 else 0), z1 - (inset if z0 < 1 else 0), st[k % 3])
        H.box(4.09, 4.91, y - .006, y + .006, z0 + .01, z1 - .01, mortar)
        y += hh
H.box(4.07, 4.93, 1.5, 1.6, .4, 1.5, st[0])                                                                    # lintel over the opening
H.box(4.03, 4.12, 1.5, 1.64, .86, 1.04, st[2])                                                                  # keystone, a little proud
for zc in (.28, 1.62):                                                                                        # corbels under the mantel
    H.box(3.99, 4.09, 1.5, 1.6, zc - .07, zc + .07, st[1])
H.box(3.95, 4.22, 1.6, 1.67, .16, 1.74, oak); H.box(3.95, 4.22, 1.585, 1.6, .2, 1.7, oak_d)                     # oak mantel shelf
H.poly([(4.12, 1.67, .2), (4.12, 1.67, 1.7), (4.26, 1.99, 1.6), (4.26, 1.99, .3)], [(0, 1, 2, 3)], st[1])        # hood, narrowing to the flue
H.poly([(4.12, 1.67, .2), (4.26, 1.99, .3), (5.01, 1.99, .3), (5.01, 1.67, .2)], [(0, 1, 2, 3)], st[2])
H.poly([(4.12, 1.67, 1.7), (5.01, 1.67, 1.7), (5.01, 1.99, 1.6), (4.26, 1.99, 1.6)], [(0, 1, 2, 3)], st[2])
H.poly([(4.26, 1.99, .3), (4.26, 1.99, 1.6), (5.01, 1.99, 1.6), (5.01, 1.99, .3)], [(0, 1, 2, 3)], st[0])
for yy in (1.75, 1.87):                                                                                       # coursing lines on the hood
    t = (yy - 1.67) / .32; xa = 4.12 + .14 * t
    H.box(xa - .004, xa + .002, yy - .006, yy + .006, .2 + .1 * t + .02, 1.7 - .1 * t - .02, mortar)
H.box(4.81, 5.01, .1, 1.67, .2, 1.7, st[1])                                                                    # the back, finished stone both faces (the dressing's lining is the sooted firebox)
# coursed stones on the faces a player sees round the hearth (its two sides, and its back once the walls are cut away)
stone_face(H, 'x', .18, -1, 4.07, 4.93, .1, 1.6, st, rng, course=(.22, .3), length=(.25, .4), proud=(.01, .025))
stone_face(H, 'x', 1.72, 1, 4.07, 4.93, .1, 1.6, st, rng, course=(.22, .3), length=(.25, .4), proud=(.01, .025))
stone_face(H, 'z', 5.01, 1, .2, 1.7, .1, 1.67, st, rng, course=(.22, .3), length=(.3, .45), proud=(.01, .02))
H.build(None); report['built']['Lodge_FurnishingHearth_Stone'] = len(H.f)

# ---- the bookcase on the north wall: x 1.32..3.68, z -3.91..-3.36, up to 2.78 ----
S = Acc('Lodge_FurnishingShelf_Case')
S.box(1.32, 1.42, 0, 2.7, -3.91, -3.36, oak); S.box(3.58, 3.68, 0, 2.7, -3.91, -3.36, oak)                     # sides
S.box(1.3, 3.7, 2.7, 2.78, -3.93, -3.34, oak_d); S.box(1.33, 3.67, 2.66, 2.7, -3.91, -3.35, oak_l)            # cornice
S.box(1.34, 3.66, 0, .1, -3.9, -3.37, oak_d)                                                                   # plinth
for i in range(6):                                                                                            # boarded back
    xa = 1.42 + i * (2.16 / 6); S.box(xa + .004, xa + 2.16 / 6 - .004, .1, 2.66, -3.91, -3.89, (oak_d, oak)[i % 2])
shelves = (.1, .78, 1.45, 2.1)
for y in shelves[1:]:
    S.box(1.42, 3.58, y - .035, y, -3.89, -3.37, oak_l); S.box(1.42, 3.58, y - .06, y - .035, -3.39, -3.37, oak_d)   # board + lip
# books: two full shelves and part of a third, many heights and bindings, the last ones leaning
books(S, 1.44, 2.62, shelves[2], -3.86, -3.44, 'x', leather, rng, hmin=.2, hmax=.3)
books(S, 1.44, 2.3, shelves[3], -3.86, -3.44, 'x', leather, rng, hmin=.18, hmax=.28)
for k in range(3):                                                                                            # a stack laid flat
    S.box(2.72, 3.02, shelves[2] + k * .045, shelves[2] + (k + 1) * .045 - .004, -3.82, -3.52, leather[(k + 2) % 6])
# scrolls stacked in a pyramid on the top shelf's east end
for row, n in ((0, 4), (1, 3), (2, 2)):
    for k in range(n):
        x = 2.5 + .06 * row + k * .12; y = shelves[3] + .05 + row * .085
        S.tube((x, y, -3.84), (x, y, -3.46), .045, 8, paper[k % 3], caps=True, cap_m=paper[2])
S.box(3.0, 3.1, shelves[3], shelves[3] + .14, -3.8, -3.6, oak_d); S.box(3.02, 3.08, shelves[3] + .14, shelves[3] + .16, -3.78, -3.62, oak)   # candle box
for k in range(3):
    S.tube((3.25 + k * .07, shelves[3], -3.7), (3.25 + k * .07, shelves[3] + .2, -3.7), .016, 6, wax)          # spare candles, standing
# guest blankets folded on the bottom shelf: soft rolls of cloth, sage and wool in turn
y = shelves[1]
for k in range(3):
    m = (sage, wool, sage)[k]; x0 = 1.48 + k * .7
    for j in range(3):
        yy = y + j * .09; S.box(x0, x0 + .6, yy + .004, yy + .082, -3.84, -3.44, m if j != 1 else (wool if m is sage else sage))
        S.tube((x0, yy + .043, -3.84), (x0, yy + .043, -3.44), .039, 6, m, caps=False)                         # the folded edge
S.build(None); report['built']['Lodge_FurnishingShelf_Case'] = len(S.f)

# ---- the writing desk in the bay: top at 0.91 over x 5.09..5.81, z -2.08..-0.93 ----
D = Acc('Lodge_FurnishingBay_Desk')
D.box(5.13, 5.81, .87, .91, -2.08, -.93, oak); D.box(5.09, 5.13, .85, .91, -2.08, -.93, oak_d)               # top, moulded front edge
D.box(5.16, 5.76, .7, .87, -2.0, -1.01, oak_d, skip='b')                                                     # frieze box
D.box(5.13, 5.16, .72, .84, -1.78, -1.23, oak_l); D.lathe(5.12, -1.505, .77, [(.012, 0), (.02, .01), (.012, .02)], 6, brass)   # drawer front + knob (turned toward the room)
for x in (5.16, 5.74):
    for z in (-2.0, -1.01):
        turned_leg(D, x, z, 0, .7, .04, oak)
D.box(5.16, 5.74, .1, .14, -1.52, -1.48, oak_d)                                                              # stretcher
D.box(5.66, 5.8, .91, 1.13, -2.06, -1.66, oak_d, skip='b')                                                    # pigeonhole rack at the back (north end)
for zz in (-1.96, -1.86, -1.76):
    D.box(5.67, 5.79, .915, 1.12, zz - .006, zz + .006, oak)
D.box(5.67, 5.79, 1.015, 1.025, -2.05, -1.67, oak)
for k, zz in enumerate((-2.01, -1.91, -1.81, -1.71)):                                                         # papers in the holes
    D.box(5.69, 5.77, .92, .98 + .02 * (k % 2), zz, zz + .06, paper[k % 3])
for k, (cx, cz, rot) in enumerate(((5.36, -1.5, .08), (5.42, -1.38, -.12), (5.3, -1.62, .2))):               # sheets on the top
    c, s = math.cos(rot), math.sin(rot); w, d = .21, .3
    P = lambda a, b: (cx + a * c + b * s, .914 + k * .004, cz - a * s + b * c)
    D.poly([P(-w / 2, -d / 2), P(w / 2, -d / 2), P(w / 2, d / 2), P(-w / 2, d / 2)], [(0, 1, 2, 3)], paper[k % 3])
    if k == 1:
        for li in range(5):
            D.poly([P(-w / 2 + .03, -d / 2 + .05 + li * .045), P(w / 2 - .05, -d / 2 + .05 + li * .045), P(w / 2 - .05, -d / 2 + .058 + li * .045), P(-w / 2 + .03, -d / 2 + .058 + li * .045)], [(0, 1, 2, 3)], ink)
D.build(None); report['built']['Lodge_FurnishingBay_Desk'] = len(D.f)

# ---- upstairs: the guest room (floor 3.30) ----
F = 3.3
Bd = Acc('Lodge_UpperFurnishing_Bed')                     # x -5.05..-4.15, z 0.95..3.25, head at the south end
for x in (-5.0, -4.2):
    Bd.box(x - .05, x + .05, F, F + 1.02, 3.15, 3.25, oak_d); Bd.lathe(x, 3.2, F + 1.02, [(.05, 0), (.03, .04), (.045, .08), (0, .12)], 8, oak)      # head posts, finials
    Bd.box(x - .05, x + .05, F, F + .66, .95, 1.05, oak_d); Bd.lathe(x, 1.0, F + .66, [(.05, 0), (.03, .03), (.04, .07), (0, .1)], 8, oak)            # foot posts
Bd.box(-4.95, -4.25, F + .3, F + .95, 3.17, 3.22, oak)                                                                                                # headboard
for k in range(4): Bd.box(-4.9 + k * .19, -4.78 + k * .19, F + .45, F + .85, 3.165, 3.168, oak_l)                                                  # its panels
Bd.box(-4.95, -4.25, F + .3, F + .58, .98, 1.02, oak); Bd.box(-4.95, -4.25, F + .58, F + .62, .96, 1.04, oak_d)                                    # footboard + rail
Bd.box(-5.05, -4.95, F + .24, F + .36, 1.05, 3.15, oak); Bd.box(-4.25, -4.15, F + .24, F + .36, 1.05, 3.15, oak)                                   # side rails
Bd.box(-4.95, -4.25, F + .34, F + .52, 1.03, 3.14, ticking)                                                                                          # mattress
for x in (-4.85, -4.65, -4.45):
    Bd.box(x - .012, x + .012, F + .335, F + .524, 1.025, 3.145, stripe)
q0, q1 = 1.06, 2.62                                                                                                                                   # quilt, patchwork, turned down at the head
cols, rows = 4, 7
for i in range(cols):
    for j in range(rows):
        xa = -4.98 + i * (.76 / cols); za = q0 + j * ((q1 - q0) / rows)
        Bd.box(xa, xa + .76 / cols, F + .52, F + .55, za, za + (q1 - q0) / rows, patch[(i * 3 + j * 2 + (i * j) % 3) % 5])
Bd.box(-4.99, -4.21, F + .3, F + .55, q0 - .012, q1 - .012, patch[3], skip='tb')                                                                                    # its sides hanging over the rails
Bd.box(-4.98, -4.22, F + .52, F + .58, q1, q1 + .16, linen)                                                                                           # the turned-down sheet
Bd.tube((-4.9, F + .63, 2.93), (-4.3, F + .63, 2.93), .085, 10, linen, caps=True)                                                                    # bolster
Bd.box(-4.92, -4.28, F + .55, F + .64, 1.1, 1.42, sage); Bd.tube((-4.915, F + .595, 1.1), (-4.285, F + .595, 1.1), .045, 8, sage, caps=True)          # folded blanket at the foot
Bd.build(None); report['built']['Lodge_UpperFurnishing_Bed'] = len(Bd.f)

Dk = Acc('Lodge_UpperFurnishing_Desk')                    # x -5.03..-4.28, z -3.45..-1.85, top at 4.27 (the dressing's books and candle stand on it)
Dk.box(-5.03, -4.32, F + .93, F + .97, -3.45, -1.85, oak); Dk.box(-4.32, -4.28, F + .9, F + .97, -3.45, -1.85, oak_d)
Dk.box(-4.98, -4.33, F + .76, F + .93, -3.36, -1.94, oak_d, skip='b')
Dk.box(-4.33, -4.3, F + .79, F + .9, -2.95, -2.35, oak_l); Dk.lathe(-4.29, -2.65, F + .845, [(.012, 0), (.02, .01), (.012, .02)], 6, brass)
for x in (-4.95, -4.36):
    for z in (-3.36, -1.94):
        turned_leg(Dk, x, z, F, F + .76, .038, oak)
for k, (cx, cz, rot) in enumerate(((-4.62, -2.7, .1), (-4.55, -2.55, -.15))):
    c, s = math.cos(rot), math.sin(rot); w, d = .2, .28
    P = lambda a, b: (cx + a * c + b * s, F + .974 + k * .004, cz - a * s + b * c)
    Dk.poly([P(-w / 2, -d / 2), P(w / 2, -d / 2), P(w / 2, d / 2), P(-w / 2, d / 2)], [(0, 1, 2, 3)], paper[k])
Dk.lathe(-4.46, -3.2, F + .97, [(.035, 0), (.04, .03), (.02, .06), (.024, .07)], 8, glass, top=True, top_m=ink)                                     # inkwell
Dk.build(None); report['built']['Lodge_UpperFurnishing_Desk'] = len(Dk.f)

Sl = Acc('Lodge_UpperFurnishing_Stool')                   # where the old bench stood, x -5.00..-4.30, z -1.41..-0.99
Sl.lathe(-4.65, -1.2, F + .44, [(.2, 0), (.21, .02), (.2, .05), (0, .05)], 12, oak_l, top=False)
for k in range(3):
    a = k * 2 * math.pi / 3 + .3
    Sl.beam((-4.65 + math.cos(a) * .12, F + .44, -1.2 + math.sin(a) * .12), (-4.65 + math.cos(a) * .19, F, -1.2 + math.sin(a) * .19), .035, .035, oak)
Sl.build(None); report['built']['Lodge_UpperFurnishing_Stool'] = len(Sl.f)

# ---- finish like the review-4 build: sharp edges, outward normals; save and export ----
for o in bpy.data.objects:
    if o.type == 'MESH' and o.name in report['built']:
        sharp_by_angle(o, 30)
        bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(o.data); bm.free()
bpy.context.scene.frame_set(1); bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'lodge.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT / 'lodge.glb'), export_format='GLB', export_yup=True, export_extras=True)
shutil.copyfile(SRC / 'material-contract.json', OUT / 'material-contract.json')
(OUT / 'props.report.json').write_text(json.dumps(report, indent=1) + '\n')
print('[LODGE_REVIEW4_PROPS] saved', OUT, json.dumps(report['built']))
