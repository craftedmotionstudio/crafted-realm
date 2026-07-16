"""Build the Guide Hall hand-authored visual-quality anchor.

This is deliberately a small art-direction proof rather than Guide Hall v6.
It tests the construction and surface language that the complete Hall will use:
real openings and reveals, irregular stonework, shaped timber framing, layered
roofing, a fitted door, stained glass, and one believable records workstation.
"""
from __future__ import annotations

import json
import math
import random
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "scratchpad" / "guide_hall_art_anchor"
SOURCE = ROOT / "assets" / "blender" / "guide_hall_art_anchor.blend"
OUT.mkdir(parents=True, exist_ok=True)
SOURCE.parent.mkdir(parents=True, exist_ok=True)

RNG = random.Random(170713)
W = 10.0
D = 8.0
WALL_H = 4.8
EAVE_Z = 4.72
PEAK_Z = 7.12
ROOF_ANGLE = math.atan2(PEAK_Z - EAVE_Z, W * 0.56)


def clean_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials,
                       bpy.data.cameras, bpy.data.lights):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def collection(name, parent=None):
    coll = bpy.data.collections.new(name)
    (parent.children if parent else bpy.context.scene.collection.children).link(coll)
    return coll


def move_to(obj, coll):
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    coll.objects.link(obj)
    return obj


def material(name, color, roughness=0.84, metallic=0.0, emission=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        socket = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
        if socket:
            socket.default_value = (*color, 1.0)
        strength = bsdf.inputs.get("Emission Strength")
        if strength:
            strength.default_value = emission
    return mat


def surface_mottle(mat, color_a, color_b, scale=3.0, detail=.75, roughness=.38):
    """Add restrained painterly variation for review renders.

    The production version will bake this visual language into a tiny shared
    atlas.  Keeping the noise broad and low-detail avoids photoreal grit.
    """
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    coord = nodes.new("ShaderNodeTexCoord")
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = scale
    noise.inputs["Detail"].default_value = detail
    noise.inputs["Roughness"].default_value = roughness
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = .25
    ramp.color_ramp.elements[0].color = (*color_a, 1.0)
    ramp.color_ramp.elements[1].position = .78
    ramp.color_ramp.elements[1].color = (*color_b, 1.0)
    links.new(coord.outputs["Generated"], noise.inputs["Vector"])
    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])


def setup_materials():
    mats = {
        "plaster": material("CR Limewash Warm", (0.67, 0.57, 0.42)),
        "plaster_light": material("CR Limewash Sun", (0.76, 0.66, 0.49)),
        "plaster_shadow": material("CR Limewash Aged", (0.55, 0.46, 0.34)),
        "stone": material("CR Holm Fieldstone", (0.34, 0.36, 0.32)),
        "stone_light": material("CR Holm Fieldstone Light", (0.43, 0.43, 0.37)),
        "stone_warm": material("CR Holm Fieldstone Warm", (0.41, 0.35, 0.29)),
        "mortar": material("CR Lime Mortar", (0.51, 0.49, 0.40)),
        "oak": material("CR Holm Oak", (0.31, 0.18, 0.095)),
        "oak_light": material("CR Holm Oak Worn", (0.43, 0.27, 0.13)),
        "oak_dark": material("CR Holm Oak Charred", (0.18, 0.095, 0.052)),
        "roof": material("CR Fired Roof Umber", (0.34, 0.16, 0.085)),
        "roof_light": material("CR Fired Roof Sun", (0.48, 0.23, 0.11)),
        "roof_dark": material("CR Fired Roof Shade", (0.23, 0.105, 0.060)),
        "iron": material("CR Forged Iron", (0.11, 0.12, 0.12), 0.58, 0.55),
        "brass": material("CR Aged Brass", (0.58, 0.39, 0.12), 0.44, 0.62),
        "glass_blue": material("CR Glass Deepwater", (0.09, 0.36, 0.52), 0.32, emission=0.28),
        "glass_teal": material("CR Glass Holm Teal", (0.10, 0.48, 0.42), 0.32, emission=0.24),
        "glass_gold": material("CR Glass Waygold", (0.72, 0.43, 0.10), 0.32, emission=0.24),
        "glass_red": material("CR Glass Ember", (0.56, 0.13, 0.09), 0.32, emission=0.20),
        "parchment": material("CR Parchment", (0.78, 0.67, 0.44)),
        "ink": material("CR Ink", (0.035, 0.045, 0.052)),
        "cloth_blue": material("CR Records Blue", (0.16, 0.27, 0.37)),
        "cloth_red": material("CR Records Red", (0.45, 0.16, 0.11)),
        "book_green": material("CR Book Moss", (0.20, 0.34, 0.20)),
        "book_blue": material("CR Book Tide", (0.16, 0.25, 0.39)),
        "book_red": material("CR Book Ember", (0.43, 0.14, 0.10)),
        "grass": material("CR Holm Grass", (0.31, 0.40, 0.16)),
        "path": material("CR Holm Path", (0.48, 0.39, 0.27)),
        "flame": material("CR Candle Flame", (1.0, 0.48, 0.08), 0.35, emission=2.0),
    }
    surface_mottle(mats["plaster"], (.62, .52, .38), (.72, .62, .46), 2.2, .55, .32)
    surface_mottle(mats["plaster_light"], (.70, .60, .44), (.79, .70, .54), 2.0, .48, .30)
    surface_mottle(mats["plaster_shadow"], (.50, .42, .31), (.61, .52, .39), 2.4, .55, .32)
    surface_mottle(mats["stone"], (.29, .31, .28), (.39, .40, .35), 3.4, .75, .42)
    surface_mottle(mats["stone_light"], (.38, .39, .34), (.49, .48, .41), 3.2, .72, .40)
    surface_mottle(mats["stone_warm"], (.36, .30, .25), (.47, .39, .31), 3.0, .70, .40)
    surface_mottle(mats["oak"], (.26, .14, .07), (.36, .21, .10), 2.8, .60, .35)
    surface_mottle(mats["oak_light"], (.37, .22, .11), (.48, .30, .15), 2.7, .58, .34)
    surface_mottle(mats["roof"], (.29, .13, .07), (.40, .19, .095), 2.4, .58, .34)
    surface_mottle(mats["roof_light"], (.40, .19, .09), (.53, .27, .13), 2.4, .58, .34)
    return mats


def assign(obj, mat):
    obj.data.materials.append(mat)
    return obj


def box(name, loc, dims, mat, coll, rotation=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    move_to(obj, coll)
    assign(obj, mat)
    if bevel > 0:
        mod = obj.modifiers.new("HandChamfer", "BEVEL")
        mod.width = bevel
        mod.segments = 1
        mod.affect = "EDGES"
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    for poly in obj.data.polygons:
        poly.use_smooth = False
    return obj


def cylinder(name, loc, radius, depth, vertices, mat, coll, rotation=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                       location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    move_to(obj, coll)
    assign(obj, mat)
    if bevel:
        mod = obj.modifiers.new("HandChamfer", "BEVEL")
        mod.width = bevel
        mod.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def sphere(name, loc, radius, mat, coll, segments=8, rings=4):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=radius,
                                        location=loc)
    obj = bpy.context.object
    obj.name = name
    move_to(obj, coll)
    assign(obj, mat)
    for poly in obj.data.polygons:
        poly.use_smooth = False
    return obj


def vertical_prism_y(name, points_xz, y0, y1, mat, coll):
    n = len(points_xz)
    verts = [(x, y0, z) for x, z in points_xz] + [(x, y1, z) for x, z in points_xz]
    faces = [tuple(range(n - 1, -1, -1)), tuple(range(n, 2 * n))]
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, n + j, n + i))
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    coll.objects.link(obj)
    assign(obj, mat)
    return obj


def polygon_plate_xz(name, points_xz, y, mat, coll):
    return vertical_prism_y(name, points_xz, y - 0.0015, y + 0.0015, mat, coll)


def beam_between(name, start, end, width, depth, mat, coll, bevel=0.035):
    a, b = Vector(start), Vector(end)
    direction = b - a
    obj = box(name, (a + b) * 0.5, (direction.length, width, depth), mat, coll)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("X", "Z")
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.select_set(False)
    if bevel:
        mod = obj.modifiers.new("HandChamfer", "BEVEL")
        mod.width = bevel
        mod.segments = 1
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.modifier_apply(modifier=mod.name)
        obj.select_set(False)
    return obj


def plaster_panel(name, loc, dims, mats, coll, rotation=(0, 0, 0), shade="plaster"):
    return box(name, loc, dims, mats[shade], coll, rotation, bevel=0.025)


def front_structure(mats, front, right, rear, interior):
    # Real openings: the wall is assembled around the door and window rather
    # than placing decorative rectangles against an unbroken wall.
    door_l, door_r, door_h = -3.35, -0.80, 3.45
    win_l, win_r, win_b, win_t = 1.15, 3.62, 1.28, 3.72
    depth = 0.46
    y = -D / 2

    plaster_panel("Facade_Left", ((-W / 2 + door_l) / 2, y, 2.80),
                  (door_l + W / 2, depth, 3.60), mats, front)
    plaster_panel("Facade_Middle", ((door_r + win_l) / 2, y, 2.80),
                  (win_l - door_r, depth, 3.60), mats, front, shade="plaster_light")
    plaster_panel("Facade_Right", ((win_r + W / 2) / 2, y, 2.80),
                  (W / 2 - win_r, depth, 3.60), mats, front)
    plaster_panel("Facade_AboveDoor", ((door_l + door_r) / 2, y, (door_h + WALL_H) / 2),
                  (door_r - door_l, depth, WALL_H - door_h), mats, front,
                  shade="plaster_shadow")
    plaster_panel("Facade_BelowWindow", ((win_l + win_r) / 2, y, win_b / 2),
                  (win_r - win_l, depth, win_b), mats, front, shade="plaster_shadow")
    plaster_panel("Facade_AboveWindow", ((win_l + win_r) / 2, y, (win_t + WALL_H) / 2),
                  (win_r - win_l, depth, WALL_H - win_t), mats, front)

    # Full gable mass, with its timber structure visibly carrying the roof.
    vertical_prism_y("Front_Gable", [(-W / 2, WALL_H), (W / 2, WALL_H), (0, PEAK_Z)],
                     y - depth / 2, y + depth / 2, mats["plaster_light"], front)

    # Right, rear, and left walls define the cutaway. The right wall can be
    # hidden for the interior review without losing the rear construction.
    plaster_panel("RightWall", (W / 2, 0, WALL_H / 2), (depth, D, WALL_H),
                  mats, right, shade="plaster_shadow")
    plaster_panel("RearWall", (0, D / 2, WALL_H / 2), (W, depth, WALL_H), mats, rear)
    plaster_panel("LeftWall", (-W / 2, 0, WALL_H / 2), (depth, D, WALL_H),
                  mats, rear, shade="plaster_light")

    # Structural timbers make each bay legible and break the mathematical box.
    for x, key in ((-4.86, "oak_dark"), (-3.55, "oak"), (-0.60, "oak"),
                   (0.92, "oak_dark"), (3.84, "oak"), (4.86, "oak_dark")):
        box("Facade_Post", (x, y - 0.27, 2.76), (0.28, 0.26, 5.34),
            mats[key], front, rotation=(0, RNG.uniform(-0.012, 0.012), RNG.uniform(-0.012, 0.012)),
            bevel=0.045)
    for z, key in ((1.03, "oak_light"), (4.67, "oak_dark")):
        box("Facade_Rail", (0, y - 0.27, z), (9.92, 0.25, 0.27), mats[key], front,
            bevel=0.045)
    beam_between("Gable_Left_Rafter", (-5.06, y - .29, 4.75),
                 (0, y - .29, 7.18), .24, .28, mats["oak_dark"], front, .04)
    beam_between("Gable_Right_Rafter", (0, y - .29, 7.18),
                 (5.06, y - .29, 4.75), .24, .28, mats["oak_dark"], front, .04)
    beam_between("Gable_KingPost", (0, y - .30, 4.72),
                 (0, y - .30, 7.06), .27, .29, mats["oak"], front, .04)
    beam_between("Gable_LeftBrace", (-4.55, y - .30, 4.88),
                 (-1.20, y - .30, 6.28), .19, .22, mats["oak_light"], front, .035)
    beam_between("Gable_RightBrace", (4.55, y - .30, 4.88),
                 (1.20, y - .30, 6.28), .19, .22, mats["oak_light"], front, .035)

    # The side elevation uses the same load-bearing grammar, so the anchor does
    # not collapse into an attractive front attached to a blank box.
    side_x = W / 2 + .27
    for side_y in (-3.82, -.05, 3.82):
        box("Side_Post", (side_x, side_y, 2.76), (.25, .29, 5.34),
            mats["oak_dark" if abs(side_y) > 3 else "oak"], right,
            rotation=(RNG.uniform(-.010, .010), 0, RNG.uniform(-.008, .008)), bevel=.045)
    for z, key in ((1.03, "oak_light"), (4.67, "oak_dark")):
        box("Side_Rail", (side_x, 0, z), (.25, 7.92, .27), mats[key], right, bevel=.045)
    beam_between("Side_Brace_Front", (side_x, -3.55, 1.12),
                 (side_x, -.38, 3.62), .20, .23, mats["oak"], right, .035)
    beam_between("Side_Brace_Rear", (side_x, 3.55, 1.12),
                 (side_x, .38, 3.62), .20, .23, mats["oak_light"], right, .035)

    # Restrained limewash variation reads as hand-applied surface treatment.
    patches = [
        ([(-4.62, 1.40), (-3.90, 1.25), (-3.72, 2.15), (-4.54, 2.38)], "plaster_light"),
        ([(-0.38, 1.32), (0.62, 1.46), (0.48, 2.18), (-0.22, 2.05)], "plaster_shadow"),
        ([(3.92, 1.32), (4.68, 1.50), (4.52, 2.55), (3.88, 2.36)], "plaster_light"),
        ([(-2.72, 3.62), (-1.64, 3.58), (-1.82, 4.32), (-2.58, 4.42)], "plaster_light"),
    ]
    for i, (points, key) in enumerate(patches):
        polygon_plate_xz(f"Limewash_Patch_{i}", points, y - depth / 2 - .02,
                         mats[key], front)

    # Interior plank floor, with varied widths and restrained hue changes.
    x = -4.68
    i = 0
    while x < 4.68:
        width = min(RNG.uniform(.48, .72), 4.68 - x)
        key = "oak_light" if i % 5 in (0, 3) else "oak"
        box(f"FloorPlank_{i:02d}", (x + width / 2, 0, .06),
            (width - .025, 7.55, .12), mats[key], interior, bevel=.018)
        x += width
        i += 1


def stone_course(mats, coll, axis, fixed, start, end, z, height, seed_offset=0):
    rng = random.Random(911 + seed_offset)
    cursor = start
    index = 0
    while cursor < end - .08:
        width = min(rng.uniform(.52, .92), end - cursor)
        center = cursor + width / 2
        key = ("stone", "stone_light", "stone_warm")[(index + seed_offset) % 3]
        if axis == "x":
            obj = box("Fieldstone", (center, fixed, z + rng.uniform(-.018, .018)),
                      (max(.18, width - .055), .18, height - .045), mats[key], coll,
                      rotation=(0, rng.uniform(-.015, .015), rng.uniform(-.018, .018)), bevel=.055)
        else:
            obj = box("Fieldstone", (fixed, center, z + rng.uniform(-.018, .018)),
                      (.18, max(.18, width - .055), height - .045), mats[key], coll,
                      rotation=(rng.uniform(-.015, .015), 0, rng.uniform(-.018, .018)), bevel=.055)
        obj["authoredVariation"] = True
        cursor += width
        index += 1


def masonry_and_openings(mats, front, right):
    y = -D / 2 - .30
    door_l, door_r = -3.35, -.80
    # Three irregular fieldstone courses create a real mortar rhythm.
    for row, z in enumerate((.18, .50, .82)):
        offset = .28 if row % 2 else 0
        stone_course(mats, front, "x", y, -5.0 + offset, door_l, z, .30, row)
        stone_course(mats, front, "x", y, door_r + offset * .35, 5.0, z, .30, 10 + row)
    for row, z in enumerate((.18, .50, .82)):
        stone_course(mats, right, "y", W / 2 + .30, -4.0 + (.25 if row % 2 else 0),
                     4.0, z, .30, 20 + row)

    # Door quoins and a keyed lintel show mass, wear, and believable support.
    for side, x in (("L", door_l - .20), ("R", door_r + .20)):
        for i in range(7):
            key = ("stone_light", "stone", "stone_warm")[(i + (side == "R")) % 3]
            box(f"DoorQuoin_{side}_{i}", (x + (.035 if i % 2 else -.025), y - .015,
                                           1.12 + i * .43),
                (.40 + .08 * (i % 2), .24, .36), mats[key], front,
                rotation=(0, 0, (-.012 if i % 2 else .014)), bevel=.065)
    for i in range(6):
        x = door_l + .20 + i * ((door_r - door_l - .40) / 5)
        box(f"DoorLintelStone_{i}", (x, y - .01, 3.62 + .05 * (1 - abs(2.5 - i) / 2.5)),
            (.52, .24, .38), mats[("stone", "stone_light", "stone_warm")[i % 3]],
            front, rotation=(0, 0, (-.018 + .007 * i)), bevel=.065)

    # Deep window sill, jambs, head, and internal reveals.
    win_l, win_r, win_b, win_t = 1.15, 3.62, 1.28, 3.72
    box("Window_Sill", ((win_l + win_r) / 2, y - .02, win_b - .10),
        (win_r - win_l + .48, .56, .30), mats["stone_light"], front, bevel=.075)
    box("Window_Head", ((win_l + win_r) / 2, y, win_t + .12),
        (win_r - win_l + .42, .42, .34), mats["stone_warm"], front, bevel=.06)
    for x in (win_l - .13, win_r + .13):
        box("Window_Jamb", (x, y, (win_b + win_t) / 2),
            (.34, .42, win_t - win_b + .20), mats["stone"], front, bevel=.06)
    box("Window_BottomReveal", ((win_l + win_r) / 2, -4.0, win_b + .02),
        (win_r - win_l, .52, .17), mats["mortar"], front, bevel=.025)
    box("Window_TopReveal", ((win_l + win_r) / 2, -4.0, win_t - .02),
        (win_r - win_l, .52, .17), mats["mortar"], front, bevel=.025)


def fitted_door(mats, front):
    y = -D / 2 - .34
    left, right, bottom, top = -3.27, -.88, .08, 3.38
    frame = mats["oak_dark"]
    box("DoorFrame_Left", (left, y, (bottom + top) / 2), (.28, .34, top - bottom + .24),
        frame, front, bevel=.055)
    box("DoorFrame_Right", (right, y, (bottom + top) / 2), (.28, .34, top - bottom + .24),
        frame, front, bevel=.055)
    box("DoorFrame_Head", ((left + right) / 2, y, top),
        (right - left + .26, .34, .30), frame, front, bevel=.055)
    box("Door_Threshold", ((left + right) / 2, y - .02, bottom),
        (right - left + .30, .58, .22), mats["stone_light"], front, bevel=.055)

    # Seven fitted planks with deliberate widths and slight face variation.
    widths = [.33, .31, .35, .32, .34, .30, .31]
    total = sum(widths)
    cursor = (left + right) / 2 - total / 2
    plank_centers = []
    for i, width in enumerate(widths):
        cx = cursor + width / 2
        plank_centers.append(cx)
        box(f"Door_Plank_{i}", (cx, y - .20, 1.72 + (i % 3 - 1) * .012),
            (width - .018, .17, 3.16 - .025 * (i % 2)),
            mats["oak_light" if i in (1, 4) else "oak"], front,
            rotation=(0, 0, RNG.uniform(-.006, .006)), bevel=.028)
        cursor += width
    for z in (.72, 2.68):
        box("Door_Iron_Strape", ((left + right) / 2, y - .31, z),
            (right - left - .20, .075, .12), mats["iron"], front, bevel=.025)
        for cx in plank_centers[::2]:
            cylinder("Door_Rivet", (cx, y - .36, z), .045, .045, 8, mats["brass"], front,
                     rotation=(math.pi / 2, 0, 0))
    beam_between("Door_ZBrace", (left + .18, y - .30, .46),
                 (right - .18, y - .30, 2.92), .13, .09, mats["iron"], front, .018)
    cylinder("Door_Handle_Plate", (right - .43, y - .36, 1.63), .16, .06, 10,
             mats["brass"], front, rotation=(math.pi / 2, 0, 0), bevel=.018)
    bpy.ops.mesh.primitive_torus_add(major_radius=.13, minor_radius=.026, major_segments=10,
                                    minor_segments=4, location=(right - .43, y - .415, 1.52),
                                    rotation=(math.pi / 2, 0, 0))
    ring = bpy.context.object
    ring.name = "Door_Handle_Ring"
    move_to(ring, front)
    assign(ring, mats["brass"])


def stained_glass(mats, front):
    y = -D / 2 - .245
    left, right, bottom, top = 1.29, 3.48, 1.43, 3.56
    frame = mats["oak_dark"]
    box("GlassFrame_Left", (left, y, (bottom + top) / 2), (.15, .18, top - bottom),
        frame, front, bevel=.025)
    box("GlassFrame_Right", (right, y, (bottom + top) / 2), (.15, .18, top - bottom),
        frame, front, bevel=.025)
    box("GlassFrame_Top", ((left + right) / 2, y, top),
        (right - left, .18, .15), frame, front, bevel=.025)
    box("GlassFrame_Bottom", ((left + right) / 2, y, bottom),
        (right - left, .18, .15), frame, front, bevel=.025)

    # Twelve panes use a purposeful compass/wayfinding pattern.
    pane_keys = [
        ["glass_blue", "glass_gold", "glass_teal"],
        ["glass_red", "glass_gold", "glass_blue"],
        ["glass_teal", "glass_gold", "glass_red"],
        ["glass_blue", "glass_teal", "glass_gold"],
    ]
    pane_w = (right - left - .24) / 3
    pane_h = (top - bottom - .30) / 4
    for row in range(4):
        for col in range(3):
            cx = left + .12 + pane_w * (col + .5)
            cz = bottom + .15 + pane_h * (row + .5)
            box(f"StainedPane_{row}_{col}", (cx, y + .055, cz),
                (pane_w - .055, .055, pane_h - .055), mats[pane_keys[row][col]], front,
                bevel=.012)
    for col in (1, 2):
        x = left + .12 + pane_w * col
        box("Glass_Lead_V", (x, y - .02, (bottom + top) / 2),
            (.055, .10, top - bottom - .10), mats["iron"], front, bevel=.012)
    for row in (1, 2, 3):
        z = bottom + .15 + pane_h * row
        box("Glass_Lead_H", ((left + right) / 2, y - .02, z),
            (right - left - .10, .10, .055), mats["iron"], front, bevel=.012)

    # Raised compass rose is original Guide Hall heraldry, not copied reference art.
    cx, cz = (left + right) / 2, (bottom + top) / 2
    for angle in (0, math.pi / 2, math.pi / 4, -math.pi / 4):
        beam_between("Glass_CompassRay",
                     (cx - math.cos(angle) * .34, y - .09, cz - math.sin(angle) * .34),
                     (cx + math.cos(angle) * .34, y - .09, cz + math.sin(angle) * .34),
                     .045, .055, mats["brass"], front, .01)
    sphere("Glass_CompassBoss", (cx, y - .13, cz), .10, mats["brass"], front, 8, 4)


def roof(mats, roof_coll):
    slope_len = math.hypot(W * .56, PEAK_Z - EAVE_Z)
    for side in (-1, 1):
        rot_y = side * ROOF_ANGLE
        x = side * W * .28
        box("Roof_Base", (x, 0, (EAVE_Z + PEAK_Z) / 2),
            (slope_len, D + .90, .20), mats["roof_dark"], roof_coll,
            rotation=(0, rot_y, 0), bevel=.025)

        # Staggered, individually shaped tile courses provide readable surface
        # rhythm without a noisy photographic texture.
        for row in range(8):
            ax = .42 + row * .68
            if ax > W * .55:
                continue
            x = side * ax
            z = PEAK_Z - ax * math.tan(ROOF_ANGLE) + .13
            for col in range(12):
                y = -4.08 + col * .73 + (.34 if row % 2 else 0)
                if y > 4.16:
                    continue
                key = ("roof", "roof_light", "roof", "roof_dark")[(row + col) % 4]
                box(f"RoofTile_{side}_{row}_{col}",
                    (x + side * RNG.uniform(-.018, .018), y, z + RNG.uniform(-.015, .015)),
                    (.76, .67 + RNG.uniform(-.035, .035), .085), mats[key], roof_coll,
                    rotation=(0, rot_y, RNG.uniform(-.008, .008)), bevel=.025)

    # Ridge, bargeboards, fascia, and visible rafter tails make the roof look built.
    cylinder("Roof_Ridge", (0, 0, PEAK_Z + .13), .18, D + 1.02, 8,
             mats["roof_light"], roof_coll, rotation=(math.pi / 2, 0, 0), bevel=.025)
    for side in (-1, 1):
        beam_between("Front_Bargeboard", (0, -4.48, PEAK_Z + .04),
                     (side * W * .56, -4.48, EAVE_Z - .05), .20, .22,
                     mats["oak_dark"], roof_coll, .04)
        box("Eave_Fascia", (side * W * .56, 0, EAVE_Z - .06),
            (.20, D + .88, .30), mats["oak_dark"], roof_coll, bevel=.045)
        for i, y in enumerate((-3.55, -2.25, -.95, .35, 1.65, 2.95, 3.72)):
            beam_between(f"RafterTail_{side}_{i}",
                         (side * 4.88, y, 4.98), (side * 5.75, y, 4.58),
                         .16, .18, mats["oak_light"], roof_coll, .025)


def bookcase(mats, coll):
    x0, y0 = -2.55, 3.47
    box("Library_Back", (x0, y0 + .15, 2.05), (4.05, .18, 3.62),
        mats["oak_dark"], coll, bevel=.045)
    for x in (x0 - 2.02, x0 + 2.02):
        box("Library_Post", (x, y0, 2.02), (.28, .42, 3.86), mats["oak"], coll,
            rotation=(0, RNG.uniform(-.012, .012), RNG.uniform(-.012, .012)), bevel=.05)
        sphere("Library_Finial", (x, y0, 4.06), .20, mats["brass"], coll, 8, 4)
    for z in (.42, 1.38, 2.34, 3.30):
        box("Library_Shelf", (x0, y0 - .06, z), (4.20, .56, .18),
            mats["oak_light"], coll, bevel=.045)
    box("Library_Cornice", (x0, y0, 3.86), (4.45, .62, .28), mats["oak"], coll, bevel=.055)

    colors = ["book_red", "book_green", "book_blue", "parchment", "cloth_red"]
    for shelf, z in enumerate((.90, 1.86, 2.82)):
        cursor = x0 - 1.78
        i = 0
        while cursor < x0 + 1.72:
            width = RNG.uniform(.12, .24)
            height = RNG.uniform(.48, .78)
            if cursor + width > x0 + 1.78:
                break
            lean = RNG.uniform(-.07, .07) if i % 4 == 0 else 0
            box(f"Book_{shelf}_{i}", (cursor + width / 2, y0 - .39, z + height / 2 - .29),
                (width, .30, height), mats[colors[(shelf + i) % len(colors)]], coll,
                rotation=(0, lean, 0), bevel=.018)
            if i % 5 == 2:
                box("Book_SpineBand", (cursor + width / 2, y0 - .55, z + .04),
                    (width * .72, .025, .045), mats["brass"], coll, bevel=.008)
            cursor += width + RNG.uniform(.018, .055)
            i += 1


def desk_cluster(mats, coll):
    # Desk is angled into the room, which avoids the showroom-grid feel.
    root = bpy.data.objects.new("Records_Workstation", None)
    coll.objects.link(root)
    root.location = (1.25, 1.50, 0)
    root.rotation_euler[2] = math.radians(-8)

    def parent(obj):
        obj.parent = root
        return obj

    parent(box("Desk_Top", (0, 0, 1.44), (3.55, 1.40, .22), mats["oak_light"], coll,
               bevel=.09))
    parent(box("Desk_Apron_Front", (0, -.55, 1.12), (3.18, .16, .54), mats["oak"], coll,
               bevel=.035))
    parent(box("Desk_Drawer", (.42, -.67, 1.18), (1.16, .12, .36), mats["oak_dark"], coll,
               bevel=.028))
    parent(cylinder("Desk_Pull", (.42, -.76, 1.18), .075, .055, 8, mats["brass"], coll,
                    rotation=(math.pi / 2, 0, 0)))
    for i, (x, y) in enumerate(((-1.42, -.48), (1.42, -.48), (-1.42, .48), (1.42, .48))):
        leg = parent(beam_between(f"Desk_Leg_{i}", (x, y, .12),
                                  (x * .96, y * .96, 1.36), .18, .20,
                                  mats["oak_dark"], coll, .035))
        leg.parent = root
        parent(box("Desk_Foot", (x, y, .10), (.44, .30, .16), mats["oak"], coll, bevel=.035))

    # Layered parchment, rolled map, ink, quill, seal, and candle form one
    # occupational story rather than evenly distributed clutter.
    parent(box("Open_Route_Map", (-.40, -.05, 1.59), (1.62, .90, .035),
               mats["parchment"], coll, rotation=(0, 0, .06), bevel=.025))
    for i, (x, y, angle) in enumerate(((-.72, -.05, .35), (-.20, .11, -.24), (.18, -.18, .12))):
        parent(box(f"Map_Ink_Line_{i}", (x, y, 1.615), (.42, .025, .012),
                   mats["ink"], coll, rotation=(0, 0, angle)))
    parent(cylinder("Scroll_Roll", (-1.15, .34, 1.67), .11, .92, 8,
                    mats["parchment"], coll, rotation=(0, math.pi / 2, 0), bevel=.018))
    parent(cylinder("Ink_Pot", (.78, -.30, 1.74), .14, .25, 8, mats["ink"], coll, bevel=.025))
    parent(beam_between("Quill_Shaft", (.78, -.30, 1.86), (1.10, -.26, 2.54),
                        .035, .035, mats["parchment"], coll, .008))
    feather = parent(vertical_prism_y("Quill_Feather",
                                      [(1.03, 2.22), (1.10, 2.58), (1.32, 2.79),
                                       (1.30, 2.42), (1.16, 2.16)],
                                      -.31, -.23, mats["parchment"], coll))
    feather.parent = root
    parent(cylinder("Wax_Seal", (.22, .28, 1.64), .10, .035, 10, mats["glass_red"], coll))
    parent(cylinder("Candle", (1.35, .30, 1.93), .10, .62, 10, mats["parchment"], coll))
    parent(sphere("Candle_Flame", (1.35, .30, 2.33), .12, mats["flame"], coll, 8, 4))

    # Proper chair: tapered legs, seat, curved-back suggestion, and splats.
    chair = bpy.data.objects.new("Records_Chair", None)
    coll.objects.link(chair)
    chair.location = (1.15, -.30, 0)
    chair.rotation_euler[2] = math.radians(12)
    for i, (x, y) in enumerate(((-.46, -.42), (.46, -.42), (-.46, .42), (.46, .42))):
        leg = beam_between(f"Chair_Leg_{i}", (x, y, .08), (x * .90, y * .90, .83),
                           .12, .13, mats["oak_dark"], coll, .025)
        leg.parent = chair
    seat = box("Chair_Seat", (0, 0, .86), (1.18, 1.04, .18), mats["oak_light"], coll, bevel=.07)
    seat.parent = chair
    for x in (-.49, .49):
        post = beam_between("Chair_BackPost", (x, .42, .86), (x * .92, .42, 2.02),
                            .13, .14, mats["oak"], coll, .025)
        post.parent = chair
        finial = sphere("Chair_Finial", (x * .92, .42, 2.08), .12, mats["brass"], coll, 8, 4)
        finial.parent = chair
    for z in (1.20, 1.53, 1.83):
        splat = box("Chair_BackSplat", (0, .42, z), (.92, .13, .12), mats["oak_light"], coll,
                    rotation=(0, 0, RNG.uniform(-.018, .018)), bevel=.025)
        splat.parent = chair
    chair.parent = root


def interior_details(mats, coll):
    # A shaped woven rug anchors the workstation and gives the warm interior a
    # clear hierarchy at the elevated game camera.
    vertical_prism_y  # keep linter aware of shared mesh helper
    points = [(-1.2, -1.1), (1.8, -1.35), (3.15, -.45), (3.35, 1.4),
              (2.25, 2.6), (-.55, 2.7), (-1.55, 1.55)]
    verts = [(x, y, .14) for x, y in points]
    mesh = bpy.data.meshes.new("Records_RugMesh")
    mesh.from_pydata(verts, [], [tuple(range(len(verts)))])
    mesh.update()
    rug = bpy.data.objects.new("Records_Rug", mesh)
    coll.objects.link(rug)
    assign(rug, mats["cloth_blue"])
    # Border as short brass/ochre segments.
    for i in range(len(points)):
        a = points[i]
        b = points[(i + 1) % len(points)]
        beam_between("Rug_Border", (a[0], a[1], .16), (b[0], b[1], .16),
                     .055, .025, mats["brass"], coll, .008)

    bookcase(mats, coll)
    desk_cluster(mats, coll)

    # Wall route board, hanging satchel, and a low scroll chest complete the
    # cluster without filling every empty surface.
    box("RouteBoard_Frame", (2.45, 3.68, 2.80), (3.10, .24, 1.75),
        mats["oak_dark"], coll, bevel=.055)
    box("RouteBoard_Face", (2.45, 3.51, 2.80), (2.70, .07, 1.39),
        mats["parchment"], coll, bevel=.025)
    for i, (x, z, angle) in enumerate(((1.55, 2.55, .18), (2.15, 3.12, -.34),
                                        (2.75, 2.45, .08), (3.18, 3.15, .26))):
        beam_between(f"RouteBoard_Line_{i}", (x - .28, 3.46, z - math.sin(angle) * .28),
                     (x + .28, 3.46, z + math.sin(angle) * .28), .04, .035,
                     mats["ink"], coll, .006)
        cylinder("RouteBoard_Pin", (x, 3.42, z), .05, .04, 8,
                 mats["glass_red" if i == 0 else "brass"], coll,
                 rotation=(math.pi / 2, 0, 0))

    box("ScrollChest_Body", (4.20, 2.72, .58), (1.05, 1.25, .92),
        mats["oak"], coll, bevel=.075)
    box("ScrollChest_Lid", (4.20, 2.72, 1.10), (1.15, 1.34, .18),
        mats["oak_light"], coll, rotation=(0, .08, 0), bevel=.06)
    for z in (.38, .78):
        box("ScrollChest_Band", (4.20, 2.07, z), (.72, .06, .10), mats["iron"], coll,
            bevel=.018)
    cylinder("ScrollChest_Lock", (4.20, 2.02, .65), .09, .05, 8, mats["brass"], coll,
             rotation=(math.pi / 2, 0, 0))


def set_dressing(mats, coll):
    # Small authored landscape wedge proves that the material family also sits
    # naturally in Tutor's Holm rather than on a sterile display turntable.
    box("Ground", (0, 0, -.18), (14.5, 12.0, .34), mats["grass"], coll, bevel=.12)
    # Uneven path slabs lead directly to the complete door frame.
    for i in range(6):
        x = -2.05 + RNG.uniform(-.10, .10)
        y = -4.62 - i * .92
        box(f"PathSlab_{i}", (x, y, .035 + i * -.006),
            (2.35 + RNG.uniform(-.18, .18), .78 + RNG.uniform(-.08, .08), .12),
            mats["path" if i % 2 else "stone_warm"], coll,
            rotation=(0, 0, RNG.uniform(-.035, .035)), bevel=.08)
    # A restrained tuft family softens the building edge without random clutter.
    for i, (x, y, s) in enumerate(((-4.65, -5.15, .75), (4.85, -4.70, .62),
                                    (4.15, -5.55, .48), (-4.0, -4.72, .42))):
        for j, angle in enumerate((-.34, 0, .38)):
            beam_between(f"GrassBlade_{i}_{j}", (x, y, .02),
                         (x + math.sin(angle) * .25 * s, y + math.cos(angle) * .12 * s,
                          .58 * s), .07 * s, .05 * s, mats["grass"], coll, .01)


def setup_scene():
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 1050
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.color = (0.035, 0.045, 0.038)
    scene.view_settings.look = "AgX - Medium High Contrast"

    bpy.ops.object.light_add(type="SUN", location=(-7, -10, 18))
    sun = bpy.context.object
    sun.name = "Warm_Key"
    sun.rotation_euler = (math.radians(31), math.radians(-19), math.radians(-28))
    sun.data.energy = 2.10
    sun.data.color = (1.0, .76, .50)
    bpy.ops.object.light_add(type="AREA", location=(8, -8, 13))
    fill = bpy.context.object
    fill.name = "Cool_Fill"
    fill.data.energy = 900
    fill.data.shape = "DISK"
    fill.data.size = 10
    fill.data.color = (.56, .70, 1.0)
    look_at(fill, (0, 0, 2.0))
    bpy.ops.object.light_add(type="AREA", location=(0, 5, 8))
    bounce = bpy.context.object
    bounce.name = "Interior_Bounce"
    bounce.data.energy = 720
    bounce.data.size = 8
    bounce.data.color = (1.0, .60, .34)
    look_at(bounce, (0, 1.5, 1.2))

    bpy.ops.object.camera_add()
    cam = bpy.context.object
    cam.name = "ReviewCamera"
    cam.data.type = "ORTHO"
    scene.camera = cam
    return cam


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def hide_collection(coll, hidden):
    coll.hide_render = hidden


def render_view(cam, filename, location, target, ortho, hidden=()):
    for coll in hidden:
        hide_collection(coll, True)
    cam.location = location
    cam.data.ortho_scale = ortho
    look_at(cam, target)
    bpy.context.scene.render.filepath = str(OUT / filename)
    bpy.ops.render.render(write_still=True)
    for coll in hidden:
        hide_collection(coll, False)


def metrics():
    meshes = [obj for obj in bpy.data.objects if obj.type == "MESH"]
    tris = sum(max(0, len(poly.vertices) - 2) for obj in meshes for poly in obj.data.polygons)
    mats = {mat.name for obj in meshes for mat in obj.data.materials if mat}
    return {"meshObjects": len(meshes), "trianglesBeforeMerge": tris,
            "materials": len(mats), "materialNames": sorted(mats)}


def main():
    clean_scene()
    mats = setup_materials()
    anchor = collection("GuideHall_ArtAnchor")
    front = collection("FrontFacade_Cutaway", anchor)
    right = collection("RightWall_Cutaway", anchor)
    rear = collection("RearStructure", anchor)
    roof_coll = collection("Roof_Cutaway", anchor)
    interior = collection("RecordsInterior", anchor)
    set_coll = collection("TutorHolm_Set", anchor)

    set_dressing(mats, set_coll)
    front_structure(mats, front, right, rear, interior)
    masonry_and_openings(mats, front, right)
    fitted_door(mats, front)
    stained_glass(mats, front)
    roof(mats, roof_coll)
    interior_details(mats, interior)

    cam = setup_scene()
    render_view(cam, "guide_hall_anchor_exterior.png",
                (13.5, -17.5, 10.8), (0, -1.0, 2.75), 14.3)
    render_view(cam, "guide_hall_anchor_gameplay.png",
                (14.8, -18.6, 17.4), (0, -.2, 1.9), 15.8)
    render_view(cam, "guide_hall_anchor_door_window.png",
                (7.5, -17.0, 7.0), (-.25, -3.85, 2.45), 9.8)
    render_view(cam, "guide_hall_anchor_interior.png",
                (11.5, -14.2, 11.5), (.20, 1.65, 1.55), 11.8,
                hidden=(front, right, roof_coll))

    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    report = {
        "asset": "guide_hall_art_anchor",
        "status": "visual-review",
        "scope": ["wall/eave", "fitted entrance", "recessed stained glass",
                  "records workstation"],
        "metrics": metrics(),
        "renders": [
            "guide_hall_anchor_exterior.png",
            "guide_hall_anchor_gameplay.png",
            "guide_hall_anchor_door_window.png",
            "guide_hall_anchor_interior.png",
        ],
    }
    (OUT / "art_anchor_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print("GUIDE_HALL_ART_ANCHOR_READY", json.dumps(report["metrics"], sort_keys=True))


if __name__ == "__main__":
    main()
