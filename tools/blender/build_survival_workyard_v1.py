"""Build Tutor's Holm Survival Workyard v1.

The workyard is the second complete Phase-2 building and the first deliberate
test that the Guide Hall's approved construction language can produce a very
different composition: a compact crooked lodge, connected open lean-to, tool
bench, log yard, hearth flue, and fishing-net support station.
"""
from __future__ import annotations

import json
import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_guide_hall_v3 as B


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets" / "blender" / "holm_survival_workyard_v1.blend"
MODEL = ROOT / "assets" / "models" / "buildings" / "holm_survival_workyard_v1.glb"
PREVIEW = ROOT / "scratchpad" / "survival_workyard_v1"
REPORT = PREVIEW / "asset_report.json"
for path in (SOURCE.parent, MODEL.parent, PREVIEW):
    path.mkdir(parents=True, exist_ok=True)

RNG = random.Random(140726)
APPLY_BEVEL = True
WALL_H = 4.45
MAIN_X0, MAIN_X1 = -8.0, 0.2
MAIN_Y0, MAIN_Y1 = -6.5, 6.5
TRAIL_HINGE = (-4.1, MAIN_Y0)
POND_HINGE = (MAIN_X1, -0.2)


def material(name, rgb, roughness=.9, metallic=0.0, emission=0.0):
    mat = B.material(name, rgb, roughness)
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        socket = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
        if socket:
            socket.default_value = (*rgb, 1.0)
        strength = bsdf.inputs.get("Emission Strength")
        if strength:
            strength.default_value = emission
    return mat


def setup_materials():
    return {
        "stone": material("CR Workyard Fieldstone", (.32, .34, .30)),
        "stone_light": material("CR Workyard Fieldstone Light", (.46, .44, .35)),
        "plaster": material("CR Workyard Warm Limewash", (.68, .59, .43)),
        "timber": material("CR Workyard Oak Dark", (.19, .095, .045)),
        "wood": material("CR Workyard Oak Worn", (.42, .25, .105)),
        "wood_light": material("CR Workyard Fresh Cut", (.61, .40, .18)),
        "roof": material("CR Workyard Shingle Umber", (.31, .145, .060)),
        "roof_light": material("CR Workyard Shingle Sun", (.46, .235, .095)),
        "roof_moss": material("CR Workyard Shingle Moss", (.25, .285, .115)),
        "iron": material("CR Workyard Forged Iron", (.095, .105, .10), .58, .42),
        "brass": material("CR Workyard Aged Brass", (.61, .41, .12), .56, .48),
        "rope": material("CR Workyard Hemp Rope", (.56, .43, .235)),
        "cloth": material("CR Workyard Oilskin", (.24, .36, .255)),
        "chalk": material("CR Workyard Chalk", (.79, .72, .54)),
        "board": material("CR Workyard Lesson Board", (.17, .245, .15)),
        "path": material("CR Workyard Packed Earth", (.42, .35, .245)),
    }


def box(name, loc, dims, mat, collection, parent, rotation=(0, 0, 0), bevel=.025):
    bpy.ops.mesh.primitive_cube_add(location=(0, 0, 0), rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    B.link(obj, collection, parent)
    obj.location = loc
    obj.data.materials.append(mat)
    if bevel and APPLY_BEVEL:
        mod = obj.modifiers.new("WorkyardChamfer", "BEVEL")
        mod.width = bevel
        mod.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    for face in obj.data.polygons:
        face.use_smooth = False
    return obj


def cylinder(name, loc, radius, depth, sides, mat, collection, parent,
             rotation=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=sides, radius=radius, depth=depth,
                                       location=(0, 0, 0), rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    B.link(obj, collection, parent)
    obj.location = loc
    obj.data.materials.append(mat)
    if bevel and APPLY_BEVEL:
        mod = obj.modifiers.new("WorkyardChamfer", "BEVEL")
        mod.width = bevel
        mod.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def beam(name, start, end, width, depth, mat, collection, parent, bevel=.02):
    a, b = Vector(start), Vector(end)
    direction = b - a
    obj = box(name, (a + b) * .5, (direction.length, width, depth), mat,
              collection, parent, bevel=0)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("X", "Z")
    if bevel and APPLY_BEVEL:
        mod = obj.modifiers.new("WorkyardChamfer", "BEVEL")
        mod.width = bevel
        mod.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def wall_segment(name, a, b, mats, collection, parent, brace_flip=False,
                 interior_point=None, detail_start_inset=0.0,
                 detail_end_inset=0.0, exterior_detail=True):
    ax, ay = a
    bx, by = b
    length = math.hypot(bx - ax, by - ay)
    angle = math.atan2(by - ay, bx - ax)
    group = B.empty(name, collection, parent, ((ax + bx) / 2, (ay + by) / 2, 0))
    group.rotation_euler.z = angle
    # A thinner plaster core leaves the structural frame visibly proud of the
    # wall instead of sharing a coplanar thickness with doors and artwork.
    box(name + "_Plaster", (0, 0, WALL_H / 2), (length, .26, WALL_H),
        mats["plaster"], collection, group, bevel=.018)
    if not exterior_detail:
        return group

    # The original helper always put timber on local -Y. That happens to be
    # exterior for only half of a closed building, leaving braces and posts in
    # front of wall art elsewhere. When an interior anchor is supplied, choose
    # the opposite side of the wall deterministically.
    detail_y = -.25
    if interior_point is not None:
        local_plus_y = (-math.sin(angle), math.cos(angle))
        to_interior = (interior_point[0] - (ax + bx) / 2,
                       interior_point[1] - (ay + by) / 2)
        plus_points_inside = (local_plus_y[0] * to_interior[0] +
                              local_plus_y[1] * to_interior[1]) > 0
        detail_y = -.25 if plus_points_inside else .25
    detail_sign = 1 if detail_y > 0 else -1

    # Door/window frames can replace the exposed end joinery of an adjoining
    # wall.  Keep the plaster core full length, but allow its proud exterior
    # timber and stone layer to stop before that fitted frame.  Without this
    # distinction a wall end-post, rail and door jamb occupy the same volume.
    detail_start = -length / 2 + max(0.0, detail_start_inset)
    detail_end = length / 2 - max(0.0, detail_end_inset)
    if detail_end - detail_start < .35:
        raise ValueError(f"{name} exterior-detail insets leave no usable wall span")
    detail_length = detail_end - detail_start

    # Irregular stone courses give the small lodge physical weight instead of
    # reading as a clean toy block.
    for row, z in enumerate((.17, .47, .77)):
        cursor = detail_start + (.25 if row % 2 else .04)
        index = 0
        while cursor < detail_end - .08:
            width = min(RNG.uniform(.48, .88), detail_end - cursor)
            key = "stone_light" if (row + index) % 4 == 0 else "stone"
            box(name + f"_Stone_{row}_{index}",
                (cursor + width / 2, detail_sign * .265, z + RNG.uniform(-.015, .015)),
                (max(.18, width - .05), .18, .245), mats[key], collection, group,
                rotation=(0, RNG.uniform(-.012, .012), RNG.uniform(-.018, .018)),
                bevel=.04 if (row + index) % 4 == 0 else 0)
            cursor += width
            index += 1

    count = max(2, int(math.ceil(detail_length / 2.7)) + 1)
    for i in range(count):
        x = detail_start + detail_length * i / max(1, count - 1)
        post_height = WALL_H + .40
        box(name + f"_Post_{i}", (x, detail_y, post_height / 2), (.22, .24, post_height),
            mats["timber"], collection, group, bevel=.025)
    for z in (1.08, WALL_H - .08):
        box(name + "_Rail", ((detail_start + detail_end) / 2, detail_y, z),
            (detail_length, .24, .22),
            mats["timber"], collection, group, bevel=.018)
    if detail_length > 2.2:
        for i in range(count - 1):
            left = detail_start + detail_length * i / (count - 1) + .12
            right = detail_start + detail_length * (i + 1) / (count - 1) - .12
            if (i + (1 if brace_flip else 0)) % 2:
                left, right = right, left
            beam(name + f"_Brace_{i}", (left, detail_sign * .30, min(1.14, WALL_H * .35)),
                 (right, detail_sign * .30, max(2.0, WALL_H - .63)),
                 .16, .16, mats["timber"], collection, group, .018)
    return group


def door_frame(name, hinge, width, rotation, mats, collection, static):
    x, y = hinge
    co, si = math.cos(rotation), math.sin(rotation)
    # Opening centre lies half a leaf along the local X axis.
    cx, cy = x + co * width / 2, y + si * width / 2
    for side in (-1, 1):
        px = cx + co * side * (width / 2 + .16)
        py = cy + si * side * (width / 2 + .16)
        box(name + "_Jamb", (px, py, 1.58), (.26, .42, 3.16), mats["stone_light"],
            collection, static, rotation=(0, 0, rotation), bevel=.055)
    box(name + "_Lintel", (cx, cy, 3.22), (width + .58, .46, .34),
        mats["stone_light"], collection, static, rotation=(0, 0, rotation), bevel=.06)
    box(name + "_Threshold", (cx, cy, .08), (width + .42, .62, .16),
        mats["stone"], collection, static, rotation=(0, 0, rotation), bevel=.035)


def door_leaf(name, hinge, width, rotation, mats, collection, root):
    group = B.empty(name, collection, root, (hinge[0], hinge[1], 0))
    group.rotation_euler.z = rotation
    for i in range(6):
        w = width * .96 / 6
        box(name + f"_Plank_{i}", (w * (i + .5), 0, 1.52),
            (w - .025, .16, 3.04), mats["wood" if i % 3 else "wood_light"],
            collection, group, bevel=.022)
    for z in (.48, 1.48, 2.50):
        box(name + "_Strap", (width * .48, -.10, z), (width * .86, .08, .095),
            mats["iron"], collection, group, bevel=.012)
    for z in (.36, 1.52, 2.68):
        box(name + "_Hinge", (.13, -.12, z), (.21, .10, .30),
            mats["iron"], collection, group, bevel=.018)
    cylinder(name + "_Ring", (width * .76, -.16, 1.48), .14, .055, 10,
             mats["brass"], collection, group, rotation=(math.pi / 2, 0, 0))
    return group


def main_roof(roof, mats, collection):
    center_x = (MAIN_X0 + MAIN_X1) / 2
    half = (MAIN_X1 - MAIN_X0) / 2 + .55
    eave, peak = WALL_H + .08, 6.35
    rise = peak - eave
    angle = math.atan2(rise, half)
    slope = math.hypot(half, rise)
    tile_count = 0
    for side in (-1, 1):
        # The local X axis follows the eave-to-ridge slope.  Earlier revisions
        # used the inverse rotation, so the hidden support slab climbed away
        # from its tiles and made the roof read as floating strips.
        box("LodgeRoofBase", (center_x + side * half / 2, 0, (eave + peak) / 2),
            (slope + .14, 13.8, .14), mats["roof"], collection, roof,
            rotation=(0, side * angle, 0), bevel=0)
        rows, cols = 17, 8
        tile_slope = slope / cols * 1.13
        for row in range(rows):
            y = MAIN_Y0 - .28 + row * .82
            for col in range(cols):
                t = (col + .5) / cols
                x = center_x + side * half * (1 - t)
                z = eave + rise * t + .09
                key = "roof_moss" if (row * 3 + col + (1 if side > 0 else 0)) % 17 == 0 \
                    else ("roof_light" if (row + col) % 7 == 0 else "roof")
                box(f"LodgeTile_{side}_{row}_{col}", (x, y, z),
                    (tile_slope, .91, .085), mats[key], collection, roof,
                    rotation=(0, side * angle, 0), bevel=0)
                tile_count += 1
        box("LodgeEave", (center_x + side * (half + .05), 0, eave - .02),
            (.18, 14.0, .20), mats["timber"], collection, roof, bevel=.025)
    box("LodgeRidge", (center_x, 0, peak + .06), (.30, 14.0, .30),
        mats["timber"], collection, roof, bevel=.045)
    return tile_count


def lean_to_roof(roof, mats, collection):
    high_x, low_x = .05, 7.45
    high_z, low_z = WALL_H + .10, 2.95
    span, rise = low_x - high_x, high_z - low_z
    angle = math.atan2(rise, span)
    slope = math.hypot(span, rise)
    center = ((high_x + low_x) / 2, .35, (high_z + low_z) / 2)
    box("LeanRoofBase", center, (slope + .16, 9.4, .15), mats["roof"],
        collection, roof, rotation=(0, angle, 0), bevel=.02)
    count = 0
    for row, y in enumerate([-3.90 + i * .88 for i in range(11)]):
        for col, x in enumerate([.38 + i * .79 for i in range(9)]):
            z = high_z - rise * ((x - high_x) / span) + .09
            key = "roof_moss" if (row + col * 2) % 13 == 0 else \
                ("roof_light" if (row + col) % 8 == 0 else "roof")
            box(f"LeanTile_{row}_{col}", (x, y, z), (.92, .94, .08), mats[key],
                collection, roof, rotation=(0, angle, 0), bevel=0)
            count += 1
    box("LeanEave", (low_x + .04, .35, low_z - .02), (.18, 9.55, .20),
        mats["timber"], collection, roof, bevel=.025)
    return count


def roof_landmarks(roof, mats, collection):
    # The squat stone flue is the workyard's readable occupational landmark.
    chimney = B.empty("HearthFlue", collection, roof, (-6.15, 2.35, 0))
    for row in range(5):
        z = 4.75 + row * .38
        for col in range(2):
            x = -.30 + col * .60 + (.08 if row % 2 else 0)
            box(f"FlueStone_{row}_{col}", (x, 0, z), (.55, .68, .34),
                mats["stone_light" if (row + col) % 3 == 0 else "stone"],
                collection, chimney, bevel=.04)
    box("FlueCap", (0, 0, 6.72), (1.35, 1.05, .18), mats["iron"],
        collection, chimney, bevel=.035)
    # Carved crossed-hatchet crest keeps the roof identity legible without a
    # second civic compass lantern.
    crest = B.empty("WorkyardCrest", collection, roof, (-4.0, -6.92, 5.70))
    for side in (-1, 1):
        handle = box("CrestHandle", (side * .18, 0, .32), (.12, .12, 1.05),
                     mats["wood_light"], collection, crest, rotation=(0, side * .58, 0), bevel=.018)
        box("CrestAxeHead", (side * .48, -.06, .62), (.42, .13, .28),
            mats["iron"], collection, crest, rotation=(0, side * .58, side * .12), bevel=.035)


def tool_bench(root, mats, collection):
    group = B.empty("tool_bench", collection, root, (-5.05, -.75, 0))
    box("ToolBenchTop", (0, 0, 1.16), (3.3, 1.05, .22), mats["wood"],
        collection, group, bevel=.07)
    for x in (-1.38, 1.38):
        for y in (-.36, .36):
            beam("ToolBenchLeg", (x, y, .08), (x * .97, y * .97, 1.05),
                 .16, .17, mats["timber"], collection, group, .026)
    cylinder("Whetstone", (-.55, -.08, 1.36), .32, .16, 12, mats["stone_light"],
             collection, group, rotation=(math.pi / 2, 0, 0), bevel=.025)
    beam("HatchetHandle", (.22, -.10, 1.32), (1.18, .06, 1.48), .08, .08,
         mats["wood_light"], collection, group, .012)
    box("HatchetHead", (1.18, .06, 1.48), (.38, .16, .32), mats["iron"],
        collection, group, rotation=(0, .08, -.18), bevel=.04)
    cylinder("PitchPot", (-1.10, .20, 1.44), .18, .28, 9, mats["iron"],
             collection, group, bevel=.02)
    for i in range(4):
        box("WoodWedge", (-.10 + i * .23, .26, 1.34 + (i % 2) * .03),
            (.18, .34, .12), mats["wood_light"], collection, group,
            rotation=(0, 0, -.18 + i * .11), bevel=.025)
    return group


def firemaking_board(root, mats, collection):
    group = B.empty("firemaking_board", collection, root, (-7.78, 2.45, 1.30))
    box("FireBoardFrame", (0, 0, 1.05), (.18, 2.55, 2.20), mats["timber"],
        collection, group, bevel=.035)
    box("FireBoardFace", (.11, 0, 1.05), (.08, 2.28, 1.92), mats["board"],
        collection, group, bevel=.025)
    for side in (-1, 1):
        beam("KindlingDiagram", (.18, side * .62, .55), (.18, -side * .14, 1.48),
             .065, .065, mats["chalk"], collection, group, .008)
    for z in (.42, .72, 1.73):
        box("ChalkLine", (.18, .62, z), (.04, .62, .035), mats["chalk"],
            collection, group, bevel=.004)
    return group


def storm_tally(root, mats, collection):
    group = B.empty("storm_tally_beam", collection, root, (.02, 1.0, 3.62))
    box("TallyBeam", (0, 0, 0), (.32, 3.05, .38), mats["timber"],
        collection, group, bevel=.035)
    for i in range(11):
        z = .22 if i % 5 == 4 else 0
        mark = box(f"StormTally_{i}", (-.19, -1.16 + i * .22, z),
                   (.035, .055, .30), mats["chalk"], collection, group,
                   rotation=(0, 0, .62 if i % 5 == 4 else 0), bevel=.003)
    return group


def net_rack(root, mats, collection):
    group = B.empty("net_rack", collection, root, (4.20, 1.35, 0))
    for x in (-1.55, 1.55):
        cylinder("NetRackPost", (x, 0, 1.35), .13, 2.70, 7, mats["timber"],
                 collection, group)
        cylinder("NetRackFoot", (x, 0, .16), .25, .30, 7, mats["stone"],
                 collection, group)
    beam("NetRackRail", (-1.62, 0, 2.48), (1.62, 0, 2.48), .14, .14,
         mats["timber"], collection, group, .018)
    # A sparse diamond net reads from the gameplay camera without becoming a
    # dense alpha-textured plane.
    for i in range(7):
        x = -1.40 + i * .47
        beam("NetCordA", (x, -.06, .48), (min(1.45, x + 1.15), -.06, 2.35),
             .035, .035, mats["rope"], collection, group, .004)
        beam("NetCordB", (x, -.04, 2.35), (min(1.45, x + 1.15), -.04, .48),
             .035, .035, mats["rope"], collection, group, .004)
    for x in (-1.20, -.40, .40, 1.20):
        cylinder("NetFloat", (x, -.12, 2.34), .11, .18, 8, mats["wood_light"],
                 collection, group, rotation=(math.pi / 2, 0, 0))
    box("FoldedOilskin", (1.65, .16, .58), (.70, .48, .16), mats["cloth"],
        collection, group, rotation=(0, 0, -.18), bevel=.035)
    return group


def occupational_yard(static, mats, collection):
    # Open lean-to posts and braces visibly carry the sloped roof.
    for i, (x, y) in enumerate(((.35, -3.75), (.35, 4.45), (7.15, -3.75), (7.15, 4.45))):
        cylinder(f"LeanPost_{i}", (x, y, 1.55), .17, 3.10, 7,
                 mats["timber"], collection, static)
        cylinder(f"LeanFoot_{i}", (x, y, .18), .30, .34, 7,
                 mats["stone"], collection, static)
    for y in (-3.75, 4.45):
        beam("LeanBrace", (.35, y, 2.65), (2.25, y, 1.02), .16, .16,
             mats["timber"], collection, static, .018)
        beam("LeanBrace", (7.15, y, 2.18), (5.55, y, .98), .16, .16,
             mats["timber"], collection, static, .018)

    # Log rack: deliberately ordered by task, not scattered decoration.
    rack = B.empty("SawnLogRack", collection, static, (4.25, -2.35, 0))
    for x in (-1.65, 1.65):
        beam("RackSide", (x, 0, .10), (x, 0, 1.85), .18, .18,
             mats["timber"], collection, rack, .02)
        beam("RackBrace", (x, 0, .18), (x * .83, 0, 1.22), .14, .14,
             mats["timber"], collection, rack, .018)
    for row in range(3):
        for col in range(4):
            cylinder(f"SawnLog_{row}_{col}", (-1.15 + col * .76, 0, .36 + row * .48),
                     .22 + .025 * ((row + col) % 2), 3.15, 9,
                     mats["wood"], collection, rack, rotation=(math.pi / 2, 0, 0))
            cylinder(f"SawnEnd_{row}_{col}", (-1.15 + col * .76, -1.59, .36 + row * .48),
                     .18, .035, 9, mats["wood_light"], collection, rack,
                     rotation=(math.pi / 2, 0, 0))

    cylinder("ChoppingBlock", (2.05, 3.35, .48), .62, .94, 10,
             mats["wood"], collection, static)
    cylinder("ChoppingBlockTop", (2.05, 3.35, .97), .56, .07, 10,
             mats["wood_light"], collection, static)
    beam("BlockAxeHandle", (1.88, 3.34, 1.02), (1.45, 3.28, 2.02),
         .08, .08, mats["wood_light"], collection, static, .012)
    box("BlockAxeHead", (1.42, 3.28, 2.03), (.42, .16, .34), mats["iron"],
        collection, static, rotation=(0, .08, -.26), bevel=.04)

    # A proper stone hearth and copper hood explain firemaking/cooking support.
    hearth = B.empty("TeachingHearth", collection, static, (-5.85, 3.55, 0))
    for i in range(10):
        angle = i * math.tau / 10
        cylinder("HearthStone", (math.cos(angle) * .75, math.sin(angle) * .75, .25),
                 .25, .42, 7, mats["stone_light" if i % 3 == 0 else "stone"],
                 collection, hearth)
    box("HearthAsh", (0, 0, .12), (1.05, 1.05, .10), mats["iron"],
        collection, hearth, rotation=(0, 0, math.pi / 4), bevel=.03)
    for i in range(3):
        beam("HearthLog", (-.50 + i * .35, -.42, .30), (.22 + i * .22, .45, .32),
             .15, .15, mats["wood"], collection, hearth, .018)

    # Yard surface and cardinal approach stones make the occupation legible.
    box("PackedYard", (3.65, .35, .04), (7.20, 9.20, .08), mats["path"],
        collection, static, bevel=.05)
    for i, (x, y, w, d, r) in enumerate(((-3.0, -7.00, 2.3, .78, .02),
                                          (-2.9, -7.72, 1.9, .66, -.03),
                                          (8.0, 1.00, 1.75, .72, .04))):
        box(f"ApproachStone_{i}", (x, y, .07), (w, d, .14),
            mats["stone_light" if i == 1 else "stone"], collection, static,
            rotation=(0, 0, r), bevel=.045)


def create_building():
    mats = setup_materials()
    collection = bpy.data.collections.new("SurvivalWorkyard_HandAuthoredV1")
    bpy.context.scene.collection.children.link(collection)
    root = B.empty("holm_survival_workyard_v1", collection)
    root["buildingDefId"] = "holm_survival_workyard_v1"
    root["assetId"] = "holm_survival_workyard"
    root["revision"] = 1
    root["pipelineVersion"] = 1
    root["assetClass"] = "building"
    root["artDirection"] = "guide-hall-anchor-family-survival-workyard"
    static = B.empty("static_architecture", collection, root)

    box("MainFoundation", (-3.90, 0, -.10), (8.55, 13.35, .30),
        mats["stone"], collection, static, bevel=.06)
    box("LodgeFloor", (-3.90, 0, .09), (7.85, 12.75, .16),
        mats["wood"], collection, static, bevel=.025)
    for x in (-7.55, -6.55, -5.55, -4.55, -3.55, -2.55, -1.55, -.55):
        box("FloorSeam", (x, 0, .185), (.035, 12.55, .018),
            mats["timber"], collection, static, bevel=.002)

    # Irregular lodge shell: north trail opening and east pond opening.
    wall_segment("WestWall", (MAIN_X0, MAIN_Y0), (MAIN_X0, MAIN_Y1), mats, collection, static)
    wall_segment("SouthWall", (MAIN_X0, MAIN_Y1), (MAIN_X1, MAIN_Y1), mats, collection, static, True)
    wall_segment("NorthWallWest", (MAIN_X0, MAIN_Y0), TRAIL_HINGE, mats, collection, static, True)
    wall_segment("NorthWallEast", ((TRAIL_HINGE[0] + 2.20), MAIN_Y0), (MAIN_X1, MAIN_Y0),
                 mats, collection, static)
    wall_segment("EastWallNorth", (MAIN_X1, MAIN_Y0), POND_HINGE, mats, collection, static, True)
    wall_segment("EastWallSouth", (MAIN_X1, POND_HINGE[1] + 2.40), (MAIN_X1, MAIN_Y1),
                 mats, collection, static)

    door_frame("TrailDoorFrame", TRAIL_HINGE, 2.20, 0, mats, collection, static)
    door_frame("PondDoorFrame", POND_HINGE, 2.40, math.pi / 2, mats, collection, static)
    trail = door_leaf("trail_door", TRAIL_HINGE, 2.20, 0, mats, collection, root)
    pond = door_leaf("pond_door", POND_HINGE, 2.40, math.pi / 2, mats, collection, root)

    occupational_yard(static, mats, collection)
    tool_bench(root, mats, collection)
    firemaking_board(root, mats, collection)
    storm_tally(root, mats, collection)
    net_rack(root, mats, collection)

    roof = B.empty("roof", collection, root)
    tile_count = main_roof(roof, mats, collection) + lean_to_roof(roof, mats, collection)
    roof_landmarks(roof, mats, collection)
    return root, static, roof, collection, mats, tile_count


def metrics(root):
    meshes = [obj for obj in B.descendants(root) if obj.type == "MESH"]
    triangles = sum(max(0, len(poly.vertices) - 2) for obj in meshes for poly in obj.data.polygons)
    materials = sorted({mat.name for obj in meshes for mat in obj.data.materials if mat})
    return {"triangles": triangles, "meshObjects": len(meshes), "materials": len(materials),
            "materialNames": materials}


def authoring_report(root, tile_count):
    names = {obj.name for obj in B.descendants(root)}
    required = ("roof", "trail_door", "pond_door", "tool_bench",
                "firemaking_board", "storm_tally_beam", "net_rack")
    checks = {
        "asymmetricalLodgeAndLeanToAuthored": "LeanRoofBase" in names and "LodgeRoofBase" in names,
        "fittedFullFrameDoorsAuthored": sum("_Plank_" in name for name in names) >= 12 and
                                          "TrailDoorFrame_Lintel" in names and "PondDoorFrame_Lintel" in names,
        "irregularMasonryCoursesAuthored": sum("_Stone_" in name for name in names) >= 55,
        "loadBearingTimberBaysAuthored": sum("_Brace_" in name for name in names) >= 8,
        "layeredConnectedRoofAuthored": tile_count >= 270,
        "occupationalWorkyardAuthored": all(any(token in name for name in names) for token in
                                             ("SawnLogRack", "ChoppingBlock", "TeachingHearth",
                                              "ToolBenchTop", "NetRackRail")),
        "distinctRoofLandmarkAuthored": "HearthFlue" in names and "WorkyardCrest" in names,
        "semanticNodesPreserved": all(name in names for name in required),
    }
    report = {
        "asset": "holm_survival_workyard_v1",
        "pipelineVersion": 1,
        "unitsPerTile": 1,
        "checks": checks,
        "visualLanguage": "Guide Hall anchor family; distinct survival workyard composition",
        "roofTiles": tile_count,
        "metrics": metrics(root),
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    if not all(checks.values()):
        raise RuntimeError("Survival Workyard authoring checks failed: " +
                           ", ".join(name for name, ok in checks.items() if not ok))
    return report


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_preview(mats):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 1050
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.color = (.045, .065, .055)
    ground = cylinder("PreviewGround", (0, 0, -.28), 13.0, .28, 48,
                      mats["path"], bpy.context.scene.collection, None)
    ground.name = "PreviewGround_NotExported"
    bpy.ops.object.camera_add(location=(20, -23, 18))
    cam = bpy.context.object
    cam.name = "PreviewCamera"
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = 23.5
    look_at(cam, (-.8, 0, 2.3))
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
    look_at(fill, (-1, 0, 1.8))
    return cam


def render_export(root, roof, collection, mats):
    scene = bpy.context.scene
    cam = setup_preview(mats)
    scene.render.filepath = str(PREVIEW / "survival_workyard_v1_exterior.png")
    bpy.ops.render.render(write_still=True)

    B.set_render_hidden(roof, True)
    scene.render.filepath = str(PREVIEW / "survival_workyard_v1_roof_off.png")
    bpy.ops.render.render(write_still=True)
    B.set_render_hidden(roof, False)

    cam.location = (18, -22, 18)
    cam.data.ortho_scale = 26.0
    look_at(cam, (-.5, 0, 1.8))
    scene.render.filepath = str(PREVIEW / "survival_workyard_v1_game_camera.png")
    bpy.ops.render.render(write_still=True)

    cam.location = (22, 15, 11)
    cam.data.ortho_scale = 22.5
    look_at(cam, (1.4, .5, 2.0))
    scene.render.filepath = str(PREVIEW / "survival_workyard_v1_pond_approach.png")
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


def consolidate(container, prefix):
    groups = {}
    for obj in list(container.children_recursive):
        if obj.type == "MESH" and obj.data.materials:
            groups.setdefault(obj.data.materials[0].name, []).append(obj)
    for mat_name, objects in groups.items():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        active = objects[0]
        bpy.context.view_layer.objects.active = active
        if len(objects) > 1:
            bpy.ops.object.join()
        world = active.matrix_world.copy()
        active.parent = container
        active.matrix_world = world
        active.name = prefix + "_" + mat_name.replace("CR ", "").replace(" ", "_")


def main():
    B.clean_scene()
    root, static, roof, collection, mats, tile_count = create_building()
    authoring_report(root, tile_count)
    for target, prefix in ((static, "Static"), (roof, "Roof")):
        consolidate(target, prefix)
    for name in ("trail_door", "pond_door", "tool_bench", "firemaking_board",
                 "storm_tally_beam", "net_rack"):
        target = next(obj for obj in root.children if obj.name == name)
        consolidate(target, name)
    render_export(root, roof, collection, mats)
    print("SURVIVAL_WORKYARD_V1_READY", MODEL)


if __name__ == "__main__":
    main()
