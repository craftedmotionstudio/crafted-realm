"""Build the Tutor's Holm Teaching Kitchen surface asset (v1).

Lesson Green's optional bread lesson needs a real bakehouse instead of a
reserved slab. The composition is an L-plan: a tall gabled bakehouse, a lower
lean-to pantry wing holding the flour bin, dough trough and water butt, and a
half-octagonal oven apse projecting from the bakehouse's south-east corner that
carries the teaching range and its stone flue. The west door faces the Lesson
Green route node; the north yard door continues toward the Quest Lodge lawn and
the mine road so the building is part of the journey, not a cul-de-sac.

Blender axes: +X east, +Y north, +Z up. The runtime GLB is exported Y-up, so
game z equals -Blender y. One Blender unit is one tile.
"""
from __future__ import annotations

import json
import math
import random
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_guide_hall_v3 as B
import build_survival_workyard_v1 as V1


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets" / "blender" / "holm_teaching_kitchen_v1.blend"
MODEL = ROOT / "assets" / "models" / "buildings" / "holm_teaching_kitchen_v1.glb"
PREVIEW = ROOT / "scratchpad" / "teaching_kitchen_v1"
REPORT = PREVIEW / "asset_report.json"
PROGRESS = PREVIEW / "build_progress.txt"
for path in (SOURCE.parent, MODEL.parent, PREVIEW):
    path.mkdir(parents=True, exist_ok=True)

V1.RNG = random.Random(260909)
V1.APPLY_BEVEL = False

# --- plan (Blender x/y) ------------------------------------------------------
BAKE_H, APSE_H, PANTRY_H = 4.4, 3.5, 3.0
BAKE_X0, BAKE_X1, BAKE_Y0, BAKE_Y1 = -6.5, 0.5, -5.0, 5.0
PANTRY_X1, PANTRY_Y0 = 6.5, -0.5
THROAT_X = 1.5
APSE_C = (1.5, -2.75)
APSE_R = 2.25
APSE_PTS = [
    (APSE_C[0] + math.cos(math.radians(a)) * APSE_R,
     APSE_C[1] + math.sin(math.radians(a)) * APSE_R)
    for a in (-90, -45, 0, 45, 90)
]  # (1.5,-5) -> (3.09,-4.34) -> (3.75,-2.75) -> (3.09,-1.16) -> (1.5,-0.5)
PERIMETER = [(BAKE_X0, BAKE_Y0), (BAKE_X1, BAKE_Y0)] + APSE_PTS + \
            [(PANTRY_X1, PANTRY_Y0), (PANTRY_X1, BAKE_Y1), (BAKE_X0, BAKE_Y1)]

GREEN_HINGE = (BAKE_X0, -2.375)     # west door, leaf toward +y (game -z)
GREEN_W = 1.55
YARD_HINGE = (-2.725, BAKE_Y1)      # north door, leaf toward -x
YARD_W = 1.55
INNER_OPENING = (1.6, 3.6)          # pantry arch on the x=0.5 wall
PLAYER_VISUAL_H = 1.85
DOOR_OPENING_H = 3.05


def mark(stage):
    PROGRESS.write_text(stage, encoding="utf-8")
    print("TEACHING_KITCHEN_V1_STAGE", stage, flush=True)


def materials():
    mats = V1.setup_materials()
    mats.update({
        "flag": V1.material("CR Kitchen Flagstone", (.40, .38, .33)),
        "flag_light": V1.material("CR Kitchen Flagstone Light", (.52, .49, .41)),
        "soot": V1.material("CR Kitchen Soot", (.07, .06, .05)),
        "flour": V1.material("CR Kitchen Flour", (.90, .86, .76)),
        "dough": V1.material("CR Kitchen Dough", (.82, .72, .52)),
        "crust": V1.material("CR Kitchen Bread Crust", (.62, .37, .14)),
        "copper": V1.material("CR Kitchen Copper", (.66, .36, .17), .48, .55),
        "slate": V1.material("CR Kitchen Slate", (.18, .20, .22)),
        "linen": V1.material("CR Kitchen Linen", (.78, .74, .62)),
        "flame": V1.material("CR Kitchen Flame", (1.0, .55, .12), .6, 0, 4.0),
        "ember": V1.material("CR Kitchen Ember", (.95, .30, .06), .7, 0, 2.2),
        "herb": V1.material("CR Kitchen Dried Herb", (.36, .42, .20)),
        "sack": V1.material("CR Kitchen Sackcloth", (.52, .40, .22)),
        "grain": V1.material("CR Kitchen Grain", (.78, .61, .18)),
        "pottery_cream": V1.material("CR Kitchen Cream Pottery", (.78, .69, .48)),
        "pottery_blue": V1.material("CR Kitchen Blue Pottery", (.18, .36, .46)),
        "water": V1.material("CR Kitchen Still Water", (.24, .43, .52), .35),
    })
    return mats


# --- low-level helpers ----------------------------------------------------------
def box(name, loc, dims, mat, collection, parent, rotation=(0, 0, 0)):
    return V1.box(name, loc, dims, mat, collection, parent, rotation=rotation, bevel=0)


def cyl(name, loc, radius, depth, sides, mat, collection, parent, rotation=(0, 0, 0)):
    return V1.cylinder(name, loc, radius, depth, sides, mat, collection, parent, rotation=rotation)


def solid(name, verts, faces, mats_list, collection, parent, material_indices=None):
    """Closed polyhedron with outward normals, so it renders single-sided."""
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    for m in mats_list:
        mesh.materials.append(m)
    if material_indices:
        for poly, index in zip(mesh.polygons, material_indices):
            poly.material_index = index
    for poly in mesh.polygons:
        poly.use_smooth = False
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    return B.link(bpy.data.objects.new(name, mesh), collection, parent)


def prism_solid(name, points, z0, z1, mat, collection, parent):
    n = len(points)
    verts = [(x, y, z0) for x, y in points] + [(x, y, z1) for x, y in points]
    faces = [tuple(range(n)), tuple(range(n, 2 * n))]
    faces += [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    return solid(name, verts, faces, [mat], collection, parent)


def wall(name, a, b, height, mats, collection, parent, interior, detail=True,
         start_inset=0.0, end_inset=0.0):
    V1.WALL_H = height
    return V1.wall_segment(name, a, b, mats, collection, parent, brace_flip=False,
                           interior_point=interior, detail_start_inset=start_inset,
                           detail_end_inset=end_inset, exterior_detail=detail)


def over_door(name, hinge, width, rotation, wall_h, mats, collection, parent):
    co, si = math.cos(rotation), math.sin(rotation)
    cx, cy = hinge[0] + co * width / 2, hinge[1] + si * width / 2
    fill_h = wall_h - 3.39
    box(name + "_OverDoor", (cx, cy, 3.39 + fill_h / 2), (width + .58, .26, fill_h),
        mats["plaster"], collection, parent, rotation=(0, 0, rotation))
    box(name + "_OverDoorRail", (cx, cy, wall_h - .08), (width + .58, .30, .22),
        mats["timber"], collection, parent, rotation=(0, 0, rotation))


def shuttered_window(name, x, y, rot, mats, collection, parent, sill=1.05, h=1.15, w=1.25):
    g = B.empty(name, collection, parent, (x, y, 0))
    g.rotation_euler.z = rot
    zc = sill + h / 2
    box(name + "_Frame", (0, 0, zc), (w, .34, h), mats["timber"], collection, g)
    box(name + "_Glass", (0, 0, zc), (w - .22, .36, h - .22), mats["chalk"], collection, g)
    box(name + "_Mullion", (0, 0, zc), (.08, .40, h - .20), mats["timber"], collection, g)
    box(name + "_Transom", (0, 0, zc + .12), (w - .20, .40, .08), mats["timber"], collection, g)
    box(name + "_Sill", (0, -.16, sill - .05), (w + .30, .30, .12), mats["stone_light"], collection, g)
    for side in (-1, 1):
        box(name + "_Shutter", (side * (w / 2 + .30), -.22, zc), (.46, .07, h - .02),
            mats["wood"], collection, g)
        box(name + "_ShutterBatten", (side * (w / 2 + .30), -.27, zc), (.36, .04, .09),
            mats["timber"], collection, g)


# --- architecture ------------------------------------------------------------------
def floors(static, mats, collection):
    # Bakehouse flagstones: a base slab plus an alternating grid of thin flags.
    box("BakehouseSlab", ((BAKE_X0 + BAKE_X1) / 2, 0, .06), (BAKE_X1 - BAKE_X0, BAKE_Y1 - BAKE_Y0, .12),
        mats["flag"], collection, static)
    i = 0
    for row in range(10):
        for col in range(7):
            x = BAKE_X0 + .5 + col
            y = BAKE_Y0 + .5 + row
            key = "flag_light" if (row + col) % 2 else "flag"
            if (row * 7 + col) % 9 == 0:
                key = "stone"
            box(f"BakehouseFlag_{i}", (x + V1.RNG.uniform(-.02, .02), y + V1.RNG.uniform(-.02, .02), .125),
                (.86 + V1.RNG.uniform(-.06, .04), .86 + V1.RNG.uniform(-.06, .04), .025),
                mats[key], collection, static)
            i += 1
    apse_floor = [(BAKE_X1, BAKE_Y0)] + APSE_PTS + [(BAKE_X1, PANTRY_Y0)]
    prism_solid("ApseFloor", apse_floor, 0.0, .13, mats["flag_light"], collection, static)
    box("ApseHearthStone", (2.6, APSE_C[1], .145), (1.9, 2.4, .03), mats["stone"], collection, static)
    # Pantry: boards running east-west.
    box("PantryFloor", ((BAKE_X1 + PANTRY_X1) / 2, (PANTRY_Y0 + BAKE_Y1) / 2, .06),
        (PANTRY_X1 - BAKE_X1, BAKE_Y1 - PANTRY_Y0, .12), mats["wood"], collection, static)
    for k, y in enumerate([PANTRY_Y0 + .55 + n * .82 for n in range(6)]):
        box(f"PantrySeam_{k}", ((BAKE_X1 + PANTRY_X1) / 2, y, .125), (PANTRY_X1 - BAKE_X1 - .3, .035, .018),
            mats["timber"], collection, static)
    # Exterior step at each door.
    box("GreenStep", (BAKE_X0 - .55, GREEN_HINGE[1] + GREEN_W / 2, -.02), (.9, GREEN_W + .7, .16),
        mats["stone_light"], collection, static)
    box("YardStep", (YARD_HINGE[0] - YARD_W / 2, BAKE_Y1 + .55, -.02), (YARD_W + .7, .9, .16),
        mats["stone_light"], collection, static)


def shell(static, root, mats, collection):
    bake_in, apse_in, pantry_in = (-3.0, 0.0), (2.4, APSE_C[1]), (3.5, 2.25)
    # South run: bakehouse (tall) then the throat (apse height).
    wall("SouthWall", (BAKE_X0, BAKE_Y0), (BAKE_X1, BAKE_Y0), BAKE_H, mats, collection, static, bake_in)
    wall("ThroatSouth", (BAKE_X1, BAKE_Y0), (THROAT_X, BAKE_Y0), APSE_H, mats, collection, static, apse_in,
         detail=False)
    # Apse: five short facets.
    for i in range(len(APSE_PTS) - 1):
        wall(f"ApseWall_{i}", APSE_PTS[i], APSE_PTS[i + 1], APSE_H, mats, collection, static, apse_in,
             start_inset=.12, end_inset=.12)
    wall("ThroatNorth", (THROAT_X, PANTRY_Y0), (BAKE_X1, PANTRY_Y0), APSE_H, mats, collection, static, apse_in,
         detail=False)
    # Pantry wing (low).
    wall("PantrySouth", (THROAT_X, PANTRY_Y0), (PANTRY_X1, PANTRY_Y0), PANTRY_H, mats, collection, static, pantry_in)
    wall("PantryEast", (PANTRY_X1, PANTRY_Y0), (PANTRY_X1, BAKE_Y1), PANTRY_H, mats, collection, static, pantry_in)
    wall("PantryNorth", (PANTRY_X1, BAKE_Y1), (BAKE_X1, BAKE_Y1), PANTRY_H, mats, collection, static, pantry_in)
    # Bakehouse north wall around the yard door.
    wall("NorthWallEast", (BAKE_X1, BAKE_Y1), (YARD_HINGE[0], BAKE_Y1), BAKE_H, mats, collection, static, bake_in,
         end_inset=.35)
    wall("NorthWallWest", (YARD_HINGE[0] - YARD_W, BAKE_Y1), (BAKE_X0, BAKE_Y1), BAKE_H, mats, collection, static,
         bake_in, start_inset=.35)
    # West wall around the green door.
    wall("WestWallNorth", (BAKE_X0, BAKE_Y1), (BAKE_X0, GREEN_HINGE[1] + GREEN_W), BAKE_H, mats, collection, static,
         bake_in, end_inset=.35)
    wall("WestWallSouth", (BAKE_X0, GREEN_HINGE[1]), (BAKE_X0, BAKE_Y0), BAKE_H, mats, collection, static, bake_in,
         start_inset=.35)
    # Interior wall between bakehouse and pantry with an open arch.
    wall("PantryPartitionSouth", (BAKE_X1, PANTRY_Y0), (BAKE_X1, INNER_OPENING[0]), BAKE_H, mats, collection, static,
         bake_in, detail=False)
    wall("PantryPartitionNorth", (BAKE_X1, INNER_OPENING[1]), (BAKE_X1, BAKE_Y1), BAKE_H, mats, collection, static,
         bake_in, detail=False)
    arch_y = (INNER_OPENING[0] + INNER_OPENING[1]) / 2
    arch_w = INNER_OPENING[1] - INNER_OPENING[0]
    box("PantryArchLintel", (BAKE_X1, arch_y, 3.05), (.34, arch_w + .5, .30), mats["timber"], collection, static)
    box("PantryArchFill", (BAKE_X1, arch_y, (3.2 + BAKE_H) / 2), (.26, arch_w + .1, BAKE_H - 3.2),
        mats["plaster"], collection, static)
    for side in (-1, 1):
        box("PantryArchJamb", (BAKE_X1, arch_y + side * (arch_w / 2 + .10), 1.55), (.30, .22, 3.1),
            mats["timber"], collection, static)

    # Fitted doors.
    V1.door_frame("GreenDoorFrame", GREEN_HINGE, GREEN_W, math.pi / 2, mats, collection, static)
    V1.door_frame("YardDoorFrame", YARD_HINGE, YARD_W, math.pi, mats, collection, static)
    over_door("GreenDoor", GREEN_HINGE, GREEN_W, math.pi / 2, BAKE_H, mats, collection, static)
    over_door("YardDoor", YARD_HINGE, YARD_W, math.pi, BAKE_H, mats, collection, static)
    V1.door_leaf("green_door", GREEN_HINGE, GREEN_W, math.pi / 2, mats, collection, root)
    V1.door_leaf("yard_door", YARD_HINGE, YARD_W, math.pi, mats, collection, root)

    # Windows.
    # Windows sit at timber-bay centres; the diagonal brace of each window bay
    # is removed so the frame is not crossed by structure.
    shuttered_window("SouthWindowW", -5.33, BAKE_Y0 - .05, 0, mats, collection, static)
    shuttered_window("SouthWindowE", -3.0, BAKE_Y0 - .05, 0, mats, collection, static)
    shuttered_window("WestWindow", BAKE_X0 - .05, 2.09, math.pi / 2, mats, collection, static)
    shuttered_window("PantryWindow", 3.5, BAKE_Y1 + .05, math.pi, mats, collection, static, sill=.95, h=.95, w=1.1)
    fa, fb = APSE_PTS[2], APSE_PTS[3]
    fm = ((fa[0] + fb[0]) / 2, (fa[1] + fb[1]) / 2)
    fn = (fm[0] - APSE_C[0], fm[1] - APSE_C[1])
    fl = math.hypot(*fn)
    shuttered_window("ApseWindow", fm[0] + fn[0] / fl * .05, fm[1] + fn[1] / fl * .05,
                     math.atan2(fb[1] - fa[1], fb[0] - fa[0]), mats, collection, static, sill=1.3, h=.8, w=.85)
    for name in ("SouthWall_Brace_0", "SouthWall_Brace_1", "WestWallNorth_Brace_1", "PantryNorth_Brace_1"):
        obj = bpy.data.objects.get(name)
        if obj is None:
            raise RuntimeError("expected window-bay brace is missing: " + name)
        bpy.data.objects.remove(obj, do_unlink=True)

    # Ceiling beams keep the tall bakehouse readable from inside (roof-off view).
    for k, y in enumerate((-3.4, -1.1, 1.2, 3.5)):
        box(f"BakeBeam_{k}", ((BAKE_X0 + BAKE_X1) / 2, y, BAKE_H - .28), (BAKE_X1 - BAKE_X0 - .2, .26, .30),
            mats["timber"], collection, static)


def gable_roof_solid(roof, mats, collection):
    """Bakehouse gable, ridge along y: two slope slabs, tile courses, plaster gable ends."""
    cx = (BAKE_X0 + BAKE_X1) / 2
    half = (BAKE_X1 - BAKE_X0) / 2 + .55
    y0, y1 = BAKE_Y0 - .45, BAKE_Y1 + .45
    eave, peak = BAKE_H + .10, 7.35
    rise = peak - eave
    angle = math.atan2(rise, half)
    slope = math.hypot(half, rise)
    count = 0
    rows, cols = 12, 6
    tile_slope = slope / cols * 1.12
    for side in (-1, 1):
        box("BakehouseRoofSolid" if side < 0 else "BakehouseRoofSolidEast",
            (cx + side * half / 2, (y0 + y1) / 2, (eave + peak) / 2), (slope + .14, y1 - y0, .14),
            mats["roof"], collection, roof, rotation=(0, side * angle, 0))
        for row in range(rows):
            y = y0 + .38 + row * ((y1 - y0 - .76) / (rows - 1))
            for col in range(cols):
                t = (col + .5) / cols
                x = cx + side * half * (1 - t)
                z = eave + rise * t + .09
                key = "roof_moss" if (row * 3 + col + (1 if side > 0 else 0)) % 17 == 0                     else ("roof_light" if (row + col) % 7 == 0 else "roof")
                box(f"BakeTile_{side}_{row}_{col}", (x, y, z), (tile_slope, .84, .085), mats[key],
                    collection, roof, rotation=(0, side * angle, 0))
                count += 1
        box("BakeEave", (cx + side * (half + .05), (y0 + y1) / 2, eave - .05), (.18, y1 - y0 + .1, .22),
            mats["timber"], collection, roof)
    box("BakeRidge", (cx, (y0 + y1) / 2, peak + .06), (.30, y1 - y0 + .2, .30), mats["timber"], collection, roof)
    # Plaster gable ends stand in the wall plane under the overhang so the ends read as wall.
    wall_half = (BAKE_X1 - BAKE_X0) / 2
    for y in (BAKE_Y0, BAKE_Y1):
        gv = [(cx - wall_half, y - .13, BAKE_H - .05), (cx + wall_half, y - .13, BAKE_H - .05),
              (cx, y - .13, peak - .30),
              (cx - wall_half, y + .13, BAKE_H - .05), (cx + wall_half, y + .13, BAKE_H - .05),
              (cx, y + .13, peak - .30)]
        solid("GableEnd", gv, [(0, 1, 2), (3, 5, 4), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)],
              [mats["plaster"]], collection, roof)
        out = -.19 if y < 0 else .19
        for side in (-1, 1):
            V1.beam(f"GableBrace_{side}", (cx + side * (wall_half - .55), y + out, BAKE_H + .05),
                    (cx, y + out, peak - .50), .16, .16, mats["timber"], collection, roof, bevel=0)
        box("GableCollar", (cx, y + out, BAKE_H + 1.15), (wall_half * 1.1, .16, .16), mats["timber"], collection, roof)
        box("GableKingPost", (cx, y + out, (BAKE_H + peak - .4) / 2), (.16, .16, peak - .4 - BAKE_H),
            mats["timber"], collection, roof)
    # Wrought wheat-sheaf finial: the bakehouse's readable roof identity.
    finial = B.empty("BakehouseCrest", collection, roof, (cx, y1 - .35, peak + .2))
    cyl("CrestStem", (0, 0, .45), .05, .9, 6, mats["iron"], collection, finial)
    for k in range(5):
        a = (k - 2) * .36
        box(f"CrestEar_{k}", (math.sin(a) * .28, 0, .95 + math.cos(a) * .22), (.10, .10, .42), mats["brass"],
            collection, finial, rotation=(0, a, 0))
    return count


def pantry_roof(roof, mats, collection):
    """Low lean-to sloping east, tucked under the bakehouse eave."""
    high_x, low_x = BAKE_X1 + .05, PANTRY_X1 + .55
    high_z, low_z = 4.55, PANTRY_H + .12
    y0, y1 = PANTRY_Y0 - .45, BAKE_Y1 + .45
    span, rise = low_x - high_x, high_z - low_z
    angle = math.atan2(rise, span)
    slope = math.hypot(span, rise)
    box("PantryRoofBase", ((high_x + low_x) / 2, (y0 + y1) / 2, (high_z + low_z) / 2), (slope + .16, y1 - y0, .15),
        mats["roof"], collection, roof, rotation=(0, angle, 0))
    count = 0
    cols = 7
    for row, y in enumerate([y0 + .45 + n * ((y1 - y0 - .9) / 6) for n in range(7)]):
        for col in range(cols):
            t = (col + .5) / cols
            x = high_x + span * t
            z = high_z - rise * t + .09
            key = "roof_moss" if (row + col * 2) % 13 == 0 else ("roof_light" if (row + col) % 8 == 0 else "roof")
            box(f"PantryTile_{row}_{col}", (x, y, z), (slope / cols * 1.08, .86, .08), mats[key], collection, roof,
                rotation=(0, angle, 0))
            count += 1
    box("PantryEave", (low_x + .04, (y0 + y1) / 2, low_z - .02), (.18, y1 - y0 + .1, .20), mats["timber"],
        collection, roof)
    return count


def apse_roof(roof, mats, collection):
    """Polygonal half-hip over the throat and apse, with the stone range flue."""
    pts = [(BAKE_X1, BAKE_Y0 - .45)] + [
        (APSE_C[0] + math.cos(math.radians(a)) * (APSE_R + .5), APSE_C[1] + math.sin(math.radians(a)) * (APSE_R + .5))
        for a in (-90, -45, 0, 45, 90)] + [(BAKE_X1, PANTRY_Y0 + .45)]
    eave, peak = APSE_H + .12, 5.45
    n = len(pts)
    top = [(APSE_C[0] - .3 + (x - APSE_C[0] + .3) * .18, APSE_C[1] + (y - APSE_C[1]) * .18, peak) for x, y in pts]
    verts = [(x, y, eave) for x, y in pts] + top + [(x, y, eave - .16) for x, y in pts]
    faces = [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    faces.append(tuple(range(n, 2 * n)))
    faces += [(i, (i + 1) % n, (i + 1) % n + 2 * n, i + 2 * n) for i in range(n)]
    faces.append(tuple(range(2 * n, 3 * n)))
    solid("ApseRoofSolid", verts, faces, [mats["roof"]], collection, roof)
    for i in range(n - 1):
        a, b = pts[i], pts[i + 1]
        length = math.hypot(b[0] - a[0], b[1] - a[1])
        ang = math.atan2(b[1] - a[1], b[0] - a[0])
        box(f"ApseFascia_{i}", ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, eave - .06), (length + .1, .18, .22),
            mats["timber"], collection, roof, rotation=(0, 0, ang))
    # Slate-style courses laid as thin strips following each facet.
    count = 0
    for i in range(n - 1):
        a, b = pts[i], pts[i + 1]
        ta, tb = top[i], top[i + 1]
        for k in range(4):
            t0, t1 = k / 4, (k + 1) / 4
            ax, ay = a[0] + (ta[0] - a[0]) * (t0 + t1) / 2, a[1] + (ta[1] - a[1]) * (t0 + t1) / 2
            bx, by = b[0] + (tb[0] - b[0]) * (t0 + t1) / 2, b[1] + (tb[1] - b[1]) * (t0 + t1) / 2
            z = eave + (peak - eave) * (t0 + t1) / 2 + .05
            length = math.hypot(bx - ax, by - ay)
            ang = math.atan2(by - ay, bx - ax)
            mid_e = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
            mid_t = ((ta[0] + tb[0]) / 2, (ta[1] + tb[1]) / 2)
            run = math.hypot(mid_t[0] - mid_e[0], mid_t[1] - mid_e[1])
            tilt = math.atan2(peak - eave, max(.05, run))
            key = "roof_light" if (i + k) % 5 == 0 else "roof"
            box(f"ApseCourse_{i}_{k}", ((ax + bx) / 2, (ay + by) / 2, z), (length * .92, .40, .06), mats[key],
                collection, roof, rotation=(tilt, 0, ang))
            count += 1
    # The stone flue rises from the range through the apse roof.
    flue = B.empty("RangeFlue", collection, roof, (3.0, APSE_C[1], 0))
    for row in range(9):
        z = 3.2 + row * .52
        for col in range(2):
            x = -.30 + col * .60 + (.08 if row % 2 else 0)
            box(f"FlueStone_{row}_{col}", (x, 0, z), (.56, .84, .48),
                mats["stone_light" if (row + col) % 3 == 0 else "stone"], collection, flue)
    box("FlueCap", (0, 0, 8.05), (1.25, 1.35, .18), mats["iron"], collection, flue)
    box("FlueSootStain", (0, 0, 7.72), (.9, 1.0, .5), mats["soot"], collection, flue)
    return count


# --- hero and support objects ----------------------------------------------------------
def teaching_range(root, mats, collection):
    """Stone range against the apse's east facet: hob, oven mouth, chimney breast."""
    g = B.empty("teaching_range", collection, root, (2.55, APSE_C[1], 0))
    box("RangeBody", (.25, 0, .525), (1.15, 1.75, 1.05), mats["stone"], collection, g)
    box("RangeCourse", (.24, 0, .30), (1.19, 1.79, .12), mats["stone_light"], collection, g)
    box("RangeHob", (.22, 0, 1.075), (1.05, 1.62, .07), mats["iron"], collection, g)
    box("OvenMouth", (-.34, .32, .55), (.08, .66, .48), mats["soot"], collection, g)
    box("OvenArch", (-.35, .32, .86), (.10, .80, .12), mats["stone_light"], collection, g)
    box("AshPit", (-.34, -.42, .28), (.08, .5, .22), mats["soot"], collection, g)
    box("FireboxDoor", (-.34, -.42, .62), (.06, .46, .34), mats["iron"], collection, g)
    # Chimney breast climbs the apse wall behind the range.
    box("ChimneyBreast", (.60, 0, 2.30), (.55, 1.55, 2.5), mats["stone"], collection, g)
    box("BreastMantel", (.40, 0, 1.68), (1.0, 1.85, .14), mats["wood"], collection, g)
    for k, (y, h) in enumerate(((-.55, .28), (.05, .34), (.58, .24))):
        box(f"MantelJar_{k}", (.32, y, 1.75 + h / 2), (.18, .18, h), mats["pottery_blue" if k % 2 else "pottery_cream"], collection, g)
    box("SootPlume", (.60, 0, 3.05), (.5, 1.1, .9), mats["soot"], collection, g)
    # Kettle and pan on the hob.
    kettle = B.empty("Kettle", collection, g, (.10, -.45, 1.11))
    cyl("KettleBody", (0, 0, .17), .20, .34, 8, mats["copper"], collection, kettle)
    cyl("KettleLid", (0, 0, .37), .12, .06, 8, mats["copper"], collection, kettle)
    box("KettleSpout", (.22, 0, .30), (.18, .07, .07), mats["copper"], collection, kettle, rotation=(0, -.6, 0))
    cyl("Pan", (.15, .40, 1.14), .24, .06, 10, mats["iron"], collection, g)
    box("PanHandle", (-.20, .40, 1.14), (.34, .07, .04), mats["iron"], collection, g)
    # Peel leaning beside the range.
    box("BakersPeel", (-.30, 1.02, .95), (.06, .12, 1.9), mats["wood_light"], collection, g, rotation=(0, .16, 0))
    box("BakersPeelBlade", (-.30, 1.02, 1.85), (.05, .34, .30), mats["wood_light"], collection, g)
    return g


def range_flame(root, mats, collection):
    g = B.empty("range_flame", collection, root, (2.18, APSE_C[1] + .32, .34))
    for k, (dx, dy, r, h) in enumerate(((0, 0, .13, .40), (-.03, .09, .09, .28), (.02, -.10, .08, .24))):
        cyl(f"FlameTongue_{k}", (dx, dy, h / 2), r, h, 6, mats["flame"], collection, g)
        obj = bpy.context.object
        obj.scale = (1, 1, 1)
        # Taper into a tongue: shrink the top ring.
        for v in obj.data.vertices:
            if v.co.z > 0:
                v.co.x *= .18
                v.co.y *= .18
    box("EmberBed", (0, 0, .03), (.34, .46, .06), mats["ember"], collection, g)
    return g


def flour_bin(root, mats, collection):
    g = B.empty("flour_bin", collection, root, (5.55, 3.95, 0))
    cyl("BinStaves", (0, 0, .49), .50, .98, 8, mats["wood"], collection, g)
    for z in (.18, .82):
        cyl(f"BinHoop_{z}", (0, 0, z), .525, .07, 8, mats["iron"], collection, g)
    cyl("FlourHeap", (0, 0, .96), .42, .12, 8, mats["flour"], collection, g)
    cyl("FlourHeapPeak", (.05, -.04, 1.06), .22, .10, 6, mats["flour"], collection, g)
    box("FlourScoop", (-.18, .16, 1.10), (.22, .14, .07), mats["wood_light"], collection, g, rotation=(0, .25, .4))
    box("FlourScoopHandle", (.02, .28, 1.13), (.26, .05, .04), mats["wood_light"], collection, g, rotation=(0, .2, .4))
    box("FlourDust", (0, 0, .015), (1.35, 1.25, .03), mats["flour"], collection, g)
    # Grain sack leaning on the bin.
    sack = B.empty("GrainSack", collection, g, (-.85, -.30, 0))
    box("SackBody", (0, 0, .36), (.55, .42, .72), mats["sack"], collection, sack, rotation=(0, 0, .3))
    box("SackNeck", (0, 0, .80), (.30, .24, .16), mats["rope"], collection, sack, rotation=(0, 0, .3))
    return g


def dough_trough(root, mats, collection):
    g = B.empty("dough_trough", collection, root, (3.3, 4.35, 0))
    box("TroughBox", (0, 0, .62), (1.65, .62, .34), mats["wood"], collection, g)
    box("TroughHollow", (0, 0, .70), (1.45, .44, .22), mats["timber"], collection, g)
    for x in (-.62, .62):
        for y in (-.20, .20):
            box("TroughLeg", (x, y, .24), (.11, .11, .48), mats["timber"], collection, g, rotation=(0, 0, 0))
    box("TroughStretcher", (0, 0, .28), (1.24, .08, .08), mats["timber"], collection, g)
    box("DoughLump", (-.28, 0, .80), (.52, .32, .26), mats["dough"], collection, g, rotation=(0, 0, .2))
    box("DoughLumpSmall", (.28, .04, .77), (.30, .26, .20), mats["dough"], collection, g, rotation=(0, 0, -.35))
    box("ProvingCloth", (.45, -.05, .82), (.62, .40, .04), mats["linen"], collection, g, rotation=(0, 0, .12))
    return g


def water_butt(root, mats, collection):
    g = B.empty("water_butt", collection, root, (5.75, .35, 0))
    cyl("ButtStaves", (0, 0, .50), .46, 1.0, 10, mats["wood"], collection, g)
    for z in (.16, .55, .90):
        cyl(f"ButtHoop_{z}", (0, 0, z), .485, .06, 10, mats["iron"], collection, g)
    cyl("WaterButtLid", (.10, .08, 1.03), .40, .05, 10, mats["wood_light"], collection, g, rotation=(0, .12, 0))
    cyl("ButtWater", (0, 0, .985), .40, .02, 10, mats["water"], collection, g)
    box("Ladle", (-.30, -.25, 1.14), (.05, .40, .05), mats["wood_light"], collection, g, rotation=(0, .0, .6))
    cyl("LadleCup", (-.42, -.42, 1.09), .09, .07, 8, mats["copper"], collection, g)
    box("DripStone", (0, 0, .015), (1.1, 1.1, .03), mats["stone"], collection, g)
    return g


def bucket_shelf(root, mats, collection):
    g = B.empty("bucket_shelf", collection, root, (-5.5, 4.62, 0))
    box("ShelfBoard", (0, 0, 1.02), (1.7, .46, .08), mats["wood"], collection, g)
    for x in (-.65, .65):
        box("ShelfBracket", (x, .12, .85), (.10, .28, .30), mats["timber"], collection, g, rotation=(.55, 0, 0))
    for k, x in enumerate((-.45, .42)):
        b = B.empty(f"Bucket{'AB'[k]}", collection, g, (x, -.02, 1.06))
        cyl("BucketStaves", (0, 0, .30), .24, .60, 8, mats["wood_light"], collection, b)
        cyl("BucketHoop", (0, 0, .50), .255, .05, 8, mats["iron"], collection, b)
        cyl("BucketHoopLow", (0, 0, .12), .255, .05, 8, mats["iron"], collection, b)
        box("BucketBail", (0, 0, .70), (.50, .04, .04), mats["iron"], collection, b)
    box("ShelfRailPeg", (.0, .18, 1.35), (1.5, .08, .08), mats["timber"], collection, g)
    return g


def recipe_board(root, mats, collection):
    g = B.empty("recipe_board", collection, root, (-6.28, 3.75, 0))
    g.rotation_euler.z = math.pi / 2
    box("BoardFrame", (0, 0, 1.95), (1.30, .12, .98), mats["timber"], collection, g)
    box("BoardSlate", (0, -.03, 1.95), (1.14, .10, .82), mats["slate"], collection, g)
    for k, (x, w) in enumerate(((-.32, .48), (-.30, .36), (-.33, .52), (-.28, .30), (-.31, .44))):
        box(f"ChalkLine_{k}", (x + w / 2 - .02, -.09, 2.25 - k * .15), (w, .01, .035), mats["chalk"], collection, g)
    box("ChalkLoaf", (.34, -.09, 2.02), (.30, .01, .18), mats["chalk"], collection, g)
    box("ChalkTray", (0, -.08, 1.42), (1.10, .10, .06), mats["wood"], collection, g)
    return g


def bread_rack(root, mats, collection):
    g = B.empty("bread_rack", collection, root, (-0.85, 4.55, 0))
    for x in (-.78, .78):
        box("RackPost", (x, 0, 1.0), (.10, .10, 2.0), mats["timber"], collection, g)
    for k, z in enumerate((.55, 1.15, 1.75)):
        box(f"RackShelf_{k}", (0, 0, z), (1.65, .44, .06), mats["wood_light"], collection, g)
        for j in range(3 - (k == 2)):
            x = -.5 + j * .5 + (.15 if k == 2 else 0)
            box(f"Loaf_{k}_{j}", (x, .02, z + .13), (.40, .26, .20), mats["crust"], collection, g,
                rotation=(0, 0, .12 * ((j + k) % 3 - 1)))
            box(f"LoafScore_{k}_{j}", (x, .02, z + .235), (.30, .05, .015), mats["flour"], collection, g)
    box("RackCloth", (.35, -.05, 1.79), (.42, .40, .03), mats["linen"], collection, g)
    return g


def kneading_table(root, mats, collection):
    g = B.empty("kneading_table", collection, root, (-3.0, .2, 0))
    box("TableTop", (0, 0, .88), (2.3, 1.05, .09), mats["wood_light"], collection, g)
    box("TableApron", (0, 0, .78), (2.1, .90, .12), mats["wood"], collection, g)
    for x in (-.98, .98):
        for y in (-.40, .40):
            box("TableLeg", (x, y, .38), (.13, .13, .76), mats["timber"], collection, g)
    box("TableStretcher", (0, 0, .22), (1.9, .09, .09), mats["timber"], collection, g)
    box("FlourDusting", (-.35, .05, .93), (1.1, .7, .012), mats["flour"], collection, g, rotation=(0, 0, .15))
    cyl("RollingPin", (.55, -.22, .97), .06, .74, 8, mats["wood_light"], collection, g, rotation=(0, math.pi / 2, .35))
    for k, (x, y) in enumerate(((-.62, -.15), (-.25, .18), (.05, -.20))):
        cyl(f"DoughBall_{k}", (x, y, 1.02), .13, .16, 8, mats["dough"], collection, g)
    box("Stool", (-.2, -1.05, .48), (.42, .42, .06), mats["wood"], collection, g)
    for x in (-.35, -.05):
        for y in (-1.2, -.9):
            box("StoolLeg", (x, y, .23), (.07, .07, .46), mats["timber"], collection, g)
    return g


def support_dressing(static, mats, collection):
    # Hanging herbs and onions from the pantry beam; a hearthside log basket.
    box("PantryBeam", ((BAKE_X1 + PANTRY_X1) / 2, 2.1, PANTRY_H - .26), (PANTRY_X1 - BAKE_X1 - .3, .22, .24),
        mats["timber"], collection, static)
    for k, x in enumerate((1.6, 2.4, 3.3, 4.2, 5.1)):
        box(f"HerbTie_{k}", (x, 2.1, PANTRY_H - .62), (.05, .05, .5), mats["rope"], collection, static)
        box(f"HerbBunch_{k}", (x, 2.1, PANTRY_H - 1.05), (.28, .22, .46), mats["herb" if k % 2 else "grain"],
            collection, static, rotation=(0, 0, .3 * k))
    basket = B.empty("LogBasket", collection, static, (1.55, -4.35, 0))
    cyl("BasketBody", (0, 0, .28), .34, .56, 8, mats["rope"], collection, basket)
    for k in range(4):
        cyl(f"BasketLog_{k}", (-.12 + k * .08, -.10 + (k % 2) * .18, .62), .08, .70, 6, mats["wood"], collection,
            basket, rotation=(0, .0, .4 * k))
    # Salt box and lamp bracket beside the west door.
    box("SaltBox", (BAKE_X0 + .45, -3.9, 1.32), (.34, .30, .26), mats["wood_light"], collection, static)
    box("SaltBoxBracket", (BAKE_X0 + .32, -3.9, 1.16), (.10, .34, .08), mats["timber"], collection, static)


# --- assembly ------------------------------------------------------------------------------
def create_building():
    mats = materials()
    collection = bpy.data.collections.new("TeachingKitchen_HandAuthoredV1")
    bpy.context.scene.collection.children.link(collection)
    root = B.empty("holm_teaching_kitchen_v1", collection)
    root["buildingDefId"] = "holm_teaching_kitchen_v1"
    root["assetId"] = "holm_teaching_kitchen"
    root["revision"] = 1
    root["pipelineVersion"] = 1
    root["assetClass"] = "building"
    root["unitsPerTile"] = 1
    root["artDirection"] = "guide-hall-anchor-family-teaching-kitchen"
    static = B.empty("static_architecture", collection, root)
    mark("floors")
    floors(static, mats, collection)
    mark("shell")
    shell(static, root, mats, collection)
    mark("furnishings")
    teaching_range(root, mats, collection)
    range_flame(root, mats, collection)
    flour_bin(root, mats, collection)
    dough_trough(root, mats, collection)
    water_butt(root, mats, collection)
    bucket_shelf(root, mats, collection)
    recipe_board(root, mats, collection)
    bread_rack(root, mats, collection)
    kneading_table(root, mats, collection)
    support_dressing(static, mats, collection)
    mark("roof")
    roof = B.empty("roof", collection, root)
    tiles = gable_roof_solid(roof, mats, collection) + pantry_roof(roof, mats, collection) + \
        apse_roof(roof, mats, collection)
    return root, static, roof, collection, mats, tiles


SEMANTIC = ("roof", "green_door", "yard_door", "teaching_range", "range_flame", "flour_bin",
            "dough_trough", "water_butt", "bucket_shelf", "recipe_board", "bread_rack", "kneading_table")


def authoring_report(root, tiles):
    names = {obj.name for obj in B.descendants(root)}
    checks = {
        "compoundLPlanWithPolygonalApseAuthored": len(PERIMETER) == 10 and all(
            f"ApseWall_{i}" in names for i in range(4)),
        "threeRoofMassesAuthored": all(n in names for n in ("BakehouseRoofSolid", "BakehouseRoofSolidEast", "PantryRoofBase", "ApseRoofSolid", "GableEnd")),
        "fittedFullFrameDoorsAuthored": sum("_Plank_" in n for n in names) >= 12 and
                                          "GreenDoorFrame_Lintel" in names and "YardDoorFrame_Lintel" in names and
                                          "GreenDoor_OverDoor" in names and "YardDoor_OverDoor" in names,
        "irregularMasonryCoursesAuthored": sum("_Stone_" in n for n in names) >= 40,
        "loadBearingTimberBaysAuthored": sum("_Brace_" in n for n in names) >= 6,
        "layeredRoofCoursesAuthored": tiles >= 150,
        "workingRangeWithFlueAuthored": all(n in names for n in ("RangeFlue", "OvenMouth", "RangeHob", "ChimneyBreast")),
        "ingredientStationsAuthored": all(n in names for n in ("FlourHeap", "DoughLump", "WaterButtLid", "BucketA",
                                                                "BucketB", "BoardSlate", "RackShelf_0")),
        "semanticNodesPreserved": all(n in names for n in SEMANTIC),
    }
    report = {
        "asset": "holm_teaching_kitchen_v1",
        "pipelineVersion": 1,
        "unitsPerTile": 1,
        "checks": checks,
        "visualLanguage": "Guide Hall anchor family; distinct L-plan bakehouse with polygonal oven apse",
        "roofCourses": tiles,
        "perimeterVertices": len(PERIMETER),
        "humanScaleContract": {
            "playerVisualHeight": PLAYER_VISUAL_H,
            "doorOpeningHeight": DOOR_OPENING_H,
            "kneadingTableHeight": .925,
            "rangeHobHeight": 1.11,
            "flourBinHeight": 1.02,
            "waterButtHeight": 1.05,
            "bakehouseWallHeight": BAKE_H,
            "pantryWallHeight": PANTRY_H,
        },
        "metrics": V1.metrics(root),
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    if not all(checks.values()):
        raise RuntimeError("Teaching Kitchen authoring checks failed: " +
                           ", ".join(n for n, ok in checks.items() if not ok))
    return report


def setup_preview(mats):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 1050
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.color = (.045, .065, .055)
    ground = V1.cylinder("PreviewGround_NotExported", (0, 0, -.28), 12.0, .28, 48,
                         mats["path"], bpy.context.scene.collection, None)
    ground.hide_render = False
    bpy.ops.object.camera_add(location=(-18, -21, 17))
    cam = bpy.context.object
    cam.name = "PreviewCamera"
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = 21.0
    V1.look_at(cam, (0, 0, 2.2))
    scene.camera = cam
    bpy.ops.object.light_add(type="SUN", location=(8, -10, 18))
    sun = bpy.context.object
    sun.rotation_euler = (math.radians(28), math.radians(-18), math.radians(-32))
    sun.data.energy = 2.3
    sun.data.color = (1.0, .78, .53)
    bpy.ops.object.light_add(type="AREA", location=(-9, -3, 13))
    fill = bpy.context.object
    fill.data.energy = 1050
    fill.data.shape = "DISK"
    fill.data.size = 11
    fill.data.color = (.62, .76, 1.0)
    V1.look_at(fill, (-1, 0, 1.8))
    return cam


def render_export(root, roof, collection, mats):
    scene = bpy.context.scene
    cam = setup_preview(mats)
    scene.render.filepath = str(PREVIEW / "teaching_kitchen_v1_exterior.png")
    bpy.ops.render.render(write_still=True)

    B.set_render_hidden(roof, True)
    scene.render.filepath = str(PREVIEW / "teaching_kitchen_v1_roof_off.png")
    bpy.ops.render.render(write_still=True)
    cam.location = (0, -0.001, 31)
    V1.look_at(cam, (0, 0, 0))
    cam.data.ortho_scale = 18.0
    scene.render.filepath = str(PREVIEW / "teaching_kitchen_v1_plan.png")
    bpy.ops.render.render(write_still=True)
    B.set_render_hidden(roof, False)

    # Elevated game-camera read from the south-west (the route approach).
    cam.location = (-16, -20, 16)
    cam.data.ortho_scale = 23.0
    V1.look_at(cam, (0, 0, 1.8))
    scene.render.filepath = str(PREVIEW / "teaching_kitchen_v1_game_camera.png")
    bpy.ops.render.render(write_still=True)

    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    bpy.ops.object.select_all(action="DESELECT")
    for obj in B.descendants(root):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=str(MODEL), export_format="GLB", use_selection=True,
        export_apply=True, export_yup=True, export_materials="EXPORT",
        export_extras=True, export_cameras=False, export_lights=False,
    )


def main():
    B.clean_scene()
    root, static, roof, collection, mats, tiles = create_building()
    authoring_report(root, tiles)
    mark("consolidate")
    for target, prefix in ((static, "Static"), (roof, "Roof")):
        V1.consolidate(target, prefix)
    for name in SEMANTIC[1:]:
        target = next(obj for obj in root.children if obj.name == name)
        V1.consolidate(target, name)
    mark("render")
    render_export(root, roof, collection, mats)
    mark("done")
    print("TEACHING_KITCHEN_V1_READY", MODEL)


if __name__ == "__main__":
    main()
