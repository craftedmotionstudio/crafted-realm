"""Quest Lodge review-4 candidate (owner review 4, 2026-09-27).

Owner: "hard to get to the quest board based on the way I go through the room ... put the quest board closer and maybe change
the format of the building"; and for the lodge's things (with the Guide House's): "everything inside ... needs to look designed
purposefully".
From the textured lodge (holm-quest-lodge-oldschool-v1/lodge.blend, Blender 5.1), unchanged but for:
 - the quest board leaves the annex behind the stair (it hung on the annex's south wall, under the upper floor, reached only
   round the stair foot) and stands as a notice board on two posts against the north wall, facing the door straight across
   the room: a planked board under a little shingled hood, notices pinned with iron nails and sealed in red wax, a quill in
   its holder (parts Lodge_FurnishingBoard_*, so the lodge's 'Study quest board' service finds it);
 - the map table's crude sheet (a parchment square with two crossed ink strokes and two red squares) becomes a region chart
   laid out for study: a curled parchment with the coast of the lands beyond the Holm painted on it (sea wash, land, hills,
   a river, a compass rose), four brass weights on its corners, an inkwell and quill, a rolled chart tied with ribbon
   (parts Lodge_FurnishingMap_*, the 'Study region chart' service);
 - leaded cames laid over every pane of the lodge's existing glazing (holm_leaded_glazing.lead_faces).
Plan coordinates (x east, y up, z south; Blender (x, -z, y)), lodge-local like the source. Original design.
Run: "Blender 5.1/blender.exe" -b .studio-workspaces/holm-quest-lodge-oldschool-v1/candidates/lodge.blend
       --python tools/blender/build_holm_quest_lodge_review4.py
Out: .studio-workspaces/holm-quest-lodge-review4-v1/candidates/{lodge.blend, lodge.glb, material-contract.json}"""
import bpy, sys, math, random, shutil, json
from pathlib import Path
HERE = Path(__file__).resolve().parent; sys.path.insert(0, str(HERE)); ROOT = HERE.parents[1]
from holm_interior_kit import Acc, M, sharp_by_angle
import holm_purposeful_props as pp
import holm_leaded_glazing as glz
SRC = ROOT / '.studio-workspaces/holm-quest-lodge-oldschool-v1/candidates'
OUT = ROOT / '.studio-workspaces/holm-quest-lodge-review4-v1/candidates'; OUT.mkdir(parents=True, exist_ok=True)
rng = random.Random(20260927)
for o in list(bpy.data.objects):
    if o.name.startswith('Lodge_FurnishingBoard_') or o.name in ('Lodge_FurnishingMap_Faded_map_ink', 'Lodge_FurnishingMap_Burgundy_wax', 'Lodge_FurnishingMap_Original_parchment'):
        bpy.data.objects.remove(o, do_unlink=True)
oak = M('Board oak', '#6e4b2e'); oak_d = M('Board oak dark', '#4a3322'); shingle = M('Board shingle', '#5d4636'); iron = M('Board nail iron', '#2f302f')
paper = [M('Notice parchment', '#dccb9c'), M('Notice parchment aged', '#cdb784'), M('Notice parchment pale', '#e6d9b2')]; ink = M('Notice ink', '#2a2520'); wax = M('Notice wax', '#8e2424')
brass = M('Chart weight brass', '#b39146'); sea = M('Chart sea wash', '#9fb1a6'); land = M('Chart land', '#b9b27a'); hill = M('Chart hills', '#8f855a'); river = M('Chart river', '#6f8fa0')
ribbon = M('Chart ribbon', '#7a2a2a'); glass_ink = M('Inkwell glass', '#27313a'); quill = M('Quill feather', '#e9e4d6')

# ---- the notice board: north wall, facing south across the room to the door
x0, x1, zb = -1.17, .27, -3.72           # board face at z -3.70, posts behind it (clear of the north window east of it)
B = Acc('Lodge_FurnishingBoard_Stand')
for px in (x0, x1):
    B.box(px - .05, px + .05, 0, 2.02, zb - .06, zb + .04, oak_d)
    B.box(px - .09, px + .09, 0, .08, zb - .1, zb + .08, oak_d)                  # foot
    B.beam((px, .35, zb + .06), (px, .02, zb + .3), .05, .05, oak_d)            # raking strut to the floor
bw = (x1 - x0 - .1) / 5
for i in range(5):                                                             # vertical boards with dark gaps
    B.box(x0 + .05 + i * bw + .006, x0 + .05 + (i + 1) * bw - .006, .86, 1.86, zb - .02, zb + .02, oak if i % 2 else M('Board oak light', '#7a5636'))
B.box(x0 + .05, x1 - .05, .84, .86, zb - .03, zb + .03, oak_d); B.box(x0 + .05, x1 - .05, 1.86, 1.9, zb - .03, zb + .03, oak_d)
B.box(x0 + .05, x1 - .05, .6, .66, zb - .02, zb + .02, oak_d)                    # rail under the board
# the little hood: two shingled slopes (each face twice, on its own vertices, so both sides draw)
B.poly([(x0 - .12, 1.96, zb - .24), (x1 + .12, 1.96, zb - .24), (x1 + .12, 2.16, zb), (x0 - .12, 2.16, zb)], [(0, 1, 2, 3)], shingle)
B.poly([(x0 - .12, 1.96, zb - .24), (x1 + .12, 1.96, zb - .24), (x1 + .12, 2.16, zb), (x0 - .12, 2.16, zb)], [(3, 2, 1, 0)], shingle)
B.poly([(x0 - .12, 2.16, zb), (x1 + .12, 2.16, zb), (x1 + .12, 1.9, zb + .34), (x0 - .12, 1.9, zb + .34)], [(0, 1, 2, 3)], shingle)
B.poly([(x0 - .12, 2.16, zb), (x1 + .12, 2.16, zb), (x1 + .12, 1.9, zb + .34), (x0 - .12, 1.9, zb + .34)], [(3, 2, 1, 0)], shingle)
for k in range(8):                                                              # shingle courses
    xx = x0 - .1 + k * (x1 - x0 + .2) / 8
    B.beam((xx, 2.155, zb + .01), (xx, 1.905, zb + .33), .012, .01, oak_d)
B.box(x0 - .14, x1 + .14, 2.15, 2.19, zb - .03, zb + .03, oak_d)                  # ridge
B.box(x0 + .45, x1 - .45, 1.9, 1.96, zb + .015, zb + .03, oak_d)                  # header plank under the hood
# a quill in a holder on the left post
B.lathe(x0 + .12, zb + .07, 1.0, [(.028, 0), (.03, .05), (.022, .06)], 8, iron, top=True)
B.build(None)
N = Acc('Lodge_FurnishingBoard_Notices'); fz = zb + .024
for i, (cx, cy, w, h, rot) in enumerate(((-.3, 1.42, .34, .44, .05), (.1, 1.5, .3, .36, -.04), (.47, 1.38, .32, .42, .03), (-.12, 1.02, .3, .22, -.02), (.4, .98, .26, .2, .06))):
    c, s = math.cos(rot), math.sin(rot); cx = cx + (x0 + x1) / 2 - .1   # laid out about the board's centre
    def P(a, b): return (cx + a * c - b * s, cy + a * s + b * c, fz)
    N.poly([P(-w / 2, -h / 2), P(w / 2, -h / 2), P(w / 2, h / 2), P(-w / 2, h / 2)], [(0, 1, 2, 3)], paper[i % 3])
    for li in range(4 if h > .3 else 2):                                          # lines of writing
        yy = h / 2 - .07 - li * .07
        N.poly([P(-w / 2 + .04, yy), P(w / 2 - .06 - .03 * (li % 2), yy), P(w / 2 - .06 - .03 * (li % 2), yy - .012), P(-w / 2 + .04, yy - .012)], [(0, 1, 2, 3)], ink)
    sx, sy, _ = P(w / 2 - .07, -h / 2 + .07)
    N.tube((sx, sy, fz), (sx, sy, fz + .008), .03, 10, wax)                      # the wax seal, a disc on the notice's face
    nx, ny, _ = P(0, h / 2 - .02); N.box(nx - .01, nx + .01, ny - .01, ny + .01, fz, fz + .012, iron)
N.build(None)
N2 = Acc('Lodge_FurnishingBoard_Quill')
N2.poly([(x0 + .12, 1.06, zb + .07), (x0 + .16, 1.34, zb + .1), (x0 + .2, 1.36, zb + .1), (x0 + .13, 1.08, zb + .07)], [(0, 1, 2, 3)], quill)
N2.poly([(x0 + .12, 1.06, zb + .07), (x0 + .16, 1.34, zb + .1), (x0 + .2, 1.36, zb + .1), (x0 + .13, 1.08, zb + .07)], [(3, 2, 1, 0)], quill)
N2.build(None)

# ---- the region chart on the map table (top at y 1.01, x 0.70..3.30, z -1.20..0.20)
T = 1.012
C = Acc('Lodge_FurnishingMap_Chart')
cx0, cx1, cz0, cz1 = 1.02, 2.98, -1.02, .02
C.poly([(cx0, T, cz0), (cx1, T, cz0), (cx1, T, cz1), (cx0, T, cz1)], [(0, 1, 2, 3)], paper[1])
for (a, b) in ((cx0, cx0 + .06), (cx1 - .06, cx1)):                               # the curled short edges
    C.tube(((a + b) / 2, T + .02, cz0), ((a + b) / 2, T + .02, cz1), .022, 8, paper[0], caps=True)
C.poly([(cx0 + .1, T + .002, cz0 + .06), (cx1 - .1, T + .002, cz0 + .06), (cx1 - .1, T + .002, cz1 - .06), (cx0 + .1, T + .002, cz1 - .06)], [(0, 1, 2, 3)], sea)
def island(pts, m, y):
    V = [(x, y, z) for x, z in pts]; C.poly(V, [tuple(range(len(V)))], m)
coast = [(1.3, -.55), (1.45, -.78), (1.75, -.86), (2.05, -.8), (2.3, -.9), (2.6, -.74), (2.72, -.5), (2.62, -.28), (2.4, -.2), (2.18, -.1), (1.9, -.16), (1.62, -.12), (1.4, -.26)]
island(coast, land, T + .004)
island([(1.12, -.2), (1.2, -.3), (1.3, -.18), (1.22, -.1)], land, T + .004)       # an islet (the Holm, marked)
island([(2.78, -.9), (2.88, -.95), (2.92, -.84), (2.84, -.8)], land, T + .004)
for hx, hz in ((1.95, -.55), (2.1, -.62), (2.25, -.5), (2.38, -.62)):            # hills
    C.poly([(hx - .06, T + .006, hz + .03), (hx + .06, T + .006, hz + .03), (hx, T + .006, hz - .06)], [(0, 1, 2)], hill)
riv = [(1.6, -.14), (1.7, -.3), (1.66, -.45), (1.8, -.6), (1.9, -.7)]
for a, b in zip(riv, riv[1:]): C.beam((a[0], T + .007, a[1]), (b[0], T + .007, b[1]), .014, .002, river)
for a, b in zip(coast, coast[1:] + coast[:1]): C.beam((a[0], T + .007, a[1]), (b[0], T + .007, b[1]), .01, .002, ink)
rx, rz = 1.25, -.8                                                               # compass rose
for k in range(8):
    ang = k * math.pi / 4; L = .1 if k % 2 == 0 else .06
    C.poly([(rx, T + .008, rz), (rx + math.cos(ang + .25) * .025, T + .008, rz + math.sin(ang + .25) * .025), (rx + math.cos(ang) * L, T + .008, rz + math.sin(ang) * L)], [(0, 1, 2)], wax if k == 6 else ink)
for wx, wz in ((cx0 + .1, cz0 + .1), (cx1 - .1, cz0 + .1), (cx0 + .1, cz1 - .1), (cx1 - .1, cz1 - .1)):   # brass weights
    C.lathe(wx, wz, T, [(.04, 0), (.04, .02), (.028, .035), (.012, .05), (.02, .065), (0, .075)], 10, brass, top=False)
C.lathe(3.08, -.05, T - .002, [(.04, 0), (.05, .03), (.045, .06), (.02, .07), (.024, .08)], 10, glass_ink, top=True, top_m=M('Ink', '#101010'))   # inkwell
C.poly([(3.08, T + .08, -.05), (3.2, T + .34, -.16), (3.24, T + .35, -.13), (3.09, T + .09, -.04)], [(0, 1, 2, 3)], quill)
C.poly([(3.08, T + .08, -.05), (3.2, T + .34, -.16), (3.24, T + .35, -.13), (3.09, T + .09, -.04)], [(3, 2, 1, 0)], quill)
C.tube((.86, T + .045, -.95), (.86, T + .045, -.35), .042, 10, paper[0], caps=True, cap_m=paper[1])  # rolled chart
C.tube((.86, T + .045, -.68), (.86, T + .045, -.62), .046, 10, ribbon, caps=False)
C.build(None)

# ---- lead cames over every pane of the lodge's existing glazing
g = bpy.data.objects.get('Lodge_Glazing_Muted_old_glass')
if g is not None: glz.lead_faces(g, 'Lodge_Glazing_Leads')
for o in bpy.data.objects:
    if o.type == 'MESH' and o.name.startswith(('Lodge_FurnishingBoard_', 'Lodge_FurnishingMap_Chart', 'Lodge_Glazing_Leads')):
        sharp_by_angle(o, 30)
        # recalc normals like the building scripts do
        import bmesh
        bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(o.data); bm.free()
bpy.context.scene.frame_set(1); bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'lodge.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT / 'lodge.glb'), export_format='GLB', export_yup=True, export_extras=True)
shutil.copyfile(SRC / 'material-contract.json', OUT / 'material-contract.json')
print('[LODGE_REVIEW4] saved', OUT)
