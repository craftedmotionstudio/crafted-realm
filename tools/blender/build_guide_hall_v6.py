"""Build Guide Hall v6 from the owner-approved hand-authored art anchor.

The v5 semantic/runtime contract is preserved.  The visual language changes:
real recessed openings, irregular fieldstone courses, load-bearing timber bays,
fitted plank doors, layered contour-roof tiles, and denser occupational props.
"""
from __future__ import annotations

import json
import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_guide_hall_v3 as B
import build_guide_hall_v5 as V5
import cr_lowpoly_assetkit as K


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets" / "blender" / "holm_guide_hall_v6.blend"
MODEL = ROOT / "assets" / "models" / "buildings" / "holm_guide_hall_v6.glb"
PREVIEW = ROOT / "scratchpad" / "guide_hall_v6"
REPORT = PREVIEW / "asset_report.json"
for path in (SOURCE.parent, MODEL.parent, PREVIEW):
    path.mkdir(parents=True, exist_ok=True)

RNG = random.Random(260713)
PERIMETER = V5.PERIMETER
WALL_HEIGHT = V5.WALL_HEIGHT
DOOR_WIDTH = V5.DOOR_WIDTH
DOOR_HEIGHT = V5.DOOR_HEIGHT
ROOF_EAVE_Z = V5.ROOF_EAVE_Z
ROOF_PEAK_Z = V5.ROOF_PEAK_Z
ROOF_OVERHANG = V5.ROOF_OVERHANG
ROOF_THICKNESS = V5.ROOF_THICKNESS


def mat(name, color, roughness=0.88, metallic=0.0, emission=0.0):
    material = B.material(name, color)
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        socket = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
        if socket:
            socket.default_value = (*color, 1.0)
        strength = bsdf.inputs.get("Emission Strength")
        if strength:
            strength.default_value = emission
    return material


def setup_materials():
    # Eighteen export materials cover the complete building.  Variation comes
    # from deliberate geometry, alternating family colors, and lighting rather
    # than dozens of unrelated materials.
    mats = {
        "stone": mat("CR Holm Fieldstone", (.32, .34, .31)),
        "stone_light": mat("CR Holm Fieldstone Light", (.45, .43, .36)),
        "plaster": mat("CR Holm Limewash", (.70, .61, .46)),
        "timber": mat("CR Holm Oak Dark", (.20, .105, .055)),
        "wood": mat("CR Holm Oak Worn", (.40, .245, .115)),
        "roof": mat("CR Fired Roof Umber", (.34, .155, .075)),
        "roof_light": mat("CR Fired Roof Sun", (.50, .255, .12)),
        "brass": mat("CR Aged Brass", (.64, .43, .13), .55, .52),
        "iron": mat("CR Forged Iron", (.10, .115, .115), .58, .44),
        "parchment": mat("CR Parchment", (.80, .69, .47)),
        "water": mat("CR Chart Water", (.17, .38, .50)),
        "land": mat("CR Chart Land", (.34, .47, .23)),
        "rug_red": mat("CR Compass Ember", (.46, .135, .075)),
        "rug_blue": mat("CR Records Blue", (.16, .285, .39)),
        "rug_green": mat("CR Provision Moss", (.285, .42, .24)),
        "path": mat("CR Holm Path", (.50, .43, .33)),
        "glass_blue": mat("CR Civic Glass Tide", (.08, .36, .52), .34, emission=.24),
        "glass_green": mat("CR Civic Glass Holm", (.10, .48, .39), .34, emission=.20),
    }
    # Compatibility aliases keep the proven v5 interior kit on the same
    # eighteen exported materials.
    mats["glass_gold"] = mats["brass"]
    mats["glass_red"] = mats["rug_red"]
    mats["chalk"] = mats["parchment"]
    mats["grass"] = mats["rug_green"]
    return mats


def local_box(name, loc, dims, material, collection, parent, rotation=(0, 0, 0), bevel=.025):
    bpy.ops.mesh.primitive_cube_add(location=(0, 0, 0), rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    B.link(obj, collection, parent)
    obj.location = loc
    obj.data.materials.append(material)
    if bevel:
        modifier = obj.modifiers.new("HandChamfer", "BEVEL")
        modifier.width = bevel
        modifier.segments = 1
        modifier.affect = "EDGES"
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    for poly in obj.data.polygons:
        poly.use_smooth = False
    return obj


def local_cylinder(name, loc, radius, depth, sides, material, collection, parent,
                   rotation=(0, 0, 0), bevel=.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=sides, radius=radius, depth=depth,
                                       location=(0, 0, 0), rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    B.link(obj, collection, parent)
    obj.location = loc
    obj.data.materials.append(material)
    if bevel:
        modifier = obj.modifiers.new("HandChamfer", "BEVEL")
        modifier.width = bevel
        modifier.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return obj


def local_beam(name, start, end, width, depth, material, collection, parent, bevel=.025):
    a, b = Vector(start), Vector(end)
    direction = b - a
    obj = local_box(name, (a + b) * .5, (direction.length, width, depth), material,
                    collection, parent, bevel=0)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("X", "Z")
    if bevel:
        modifier = obj.modifiers.new("HandChamfer", "BEVEL")
        modifier.width = bevel
        modifier.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return obj


def wall_bay(name, a, b, mats, collection, static, window=False, brace_flip=False):
    dx, dy = b[0] - a[0], b[1] - a[1]
    length = math.hypot(dx, dy)
    angle = math.atan2(dy, dx)
    group = B.empty(name, collection, static, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0))
    group.rotation_euler.z = angle

    opening_w, opening_b, opening_t = 2.10, 1.30, 3.48
    if window and length >= opening_w + .9:
        side_w = (length - opening_w) / 2
        local_box(name + "_WallL", (-(opening_w + side_w) / 2, 0, WALL_HEIGHT / 2),
                  (side_w, .34, WALL_HEIGHT), mats["plaster"], collection, group, bevel=.018)
        local_box(name + "_WallR", ((opening_w + side_w) / 2, 0, WALL_HEIGHT / 2),
                  (side_w, .34, WALL_HEIGHT), mats["plaster"], collection, group, bevel=.018)
        local_box(name + "_WallBelow", (0, 0, opening_b / 2),
                  (opening_w, .34, opening_b), mats["plaster"], collection, group, bevel=.018)
        local_box(name + "_WallAbove", (0, 0, (opening_t + WALL_HEIGHT) / 2),
                  (opening_w, .34, WALL_HEIGHT - opening_t), mats["plaster"], collection, group,
                  bevel=.018)
        # Thick reveal, sill, fitted frame, leadwork, and twelve colored panes.
        for x in (-opening_w / 2, opening_w / 2):
            local_box(name + "_RevealV", (x, -.01, (opening_b + opening_t) / 2),
                      (.22, .52, opening_t - opening_b + .15), mats["stone"], collection, group,
                      bevel=.055)
        local_box(name + "_Sill", (0, -.08, opening_b - .10),
                  (opening_w + .52, .62, .28), mats["stone_light"], collection, group, bevel=.065)
        local_box(name + "_Head", (0, -.04, opening_t + .10),
                  (opening_w + .44, .48, .28), mats["stone_light"], collection, group, bevel=.055)
        for col in range(3):
            for row in range(4):
                pane_w = (opening_w - .42) / 3
                pane_h = (opening_t - opening_b - .42) / 4
                x = -opening_w / 2 + .21 + pane_w * (col + .5)
                z = opening_b + .21 + pane_h * (row + .5)
                key = "glass_blue" if (row + col) % 3 else "glass_green"
                local_box(name + f"_Pane_{row}_{col}", (x, -.205, z),
                          (pane_w - .055, .045, pane_h - .055), mats[key], collection, group,
                          bevel=.008)
        for x in (-opening_w / 6, opening_w / 6):
            local_box(name + "_Mullion", (x, -.245, (opening_b + opening_t) / 2),
                      (.065, .10, opening_t - opening_b - .12), mats["iron"], collection, group,
                      bevel=.01)
        for row in (1, 2, 3):
            z = opening_b + .21 + (opening_t - opening_b - .42) / 4 * row
            local_box(name + "_Transom", (0, -.245, z),
                      (opening_w - .12, .10, .06), mats["iron"], collection, group, bevel=.01)
        local_box(name + "_CompassBoss", (0, -.31, (opening_b + opening_t) / 2),
                  (.26, .08, .26), mats["brass"], collection, group,
                  rotation=(0, 0, math.pi / 4), bevel=.025)
    else:
        local_box(name + "_Wall", (0, 0, WALL_HEIGHT / 2),
                  (length, .34, WALL_HEIGHT), mats["plaster"], collection, group, bevel=.018)

    # Three irregular stone courses sit proud of the wall face and survive the
    # elevated game camera as actual construction, not a painted stripe.
    for row, z in enumerate((.18, .49, .80)):
        cursor = -length / 2 + (.26 if row % 2 else .04)
        index = 0
        while cursor < length / 2 - .10:
            width = min(RNG.uniform(.52, .92), length / 2 - cursor)
            key = "stone_light" if (index + row) % 3 == 0 else "stone"
            local_box(name + f"_Stone_{row}_{index}",
                      (cursor + width / 2, -.265, z + RNG.uniform(-.018, .018)),
                      (max(.20, width - .055), .18, .25), mats[key], collection, group,
                      rotation=(0, RNG.uniform(-.012, .012), RNG.uniform(-.018, .018)),
                      # One shaped stone per three keeps the hand-laid edge
                      # rhythm while the remaining irregular blocks stay at
                      # the twelve-triangle low-poly baseline.
                      bevel=.047 if (index + row) % 3 == 0 else 0)
            cursor += width
            index += 1

    # Posts, wall plate, sill rail, and authored diagonal braces explain the
    # load path and remove the perfectly gridded procedural feel.
    post_count = max(2, int(math.ceil(length / 3.0)) + 1)
    post_x = [-length / 2 + i * length / (post_count - 1) for i in range(post_count)]
    for i, x in enumerate(post_x[:-1]):
        local_box(name + f"_Post_{i}", (x + RNG.uniform(-.012, .012), -.235, 2.72),
                  (.25, .24, 5.30), mats["timber"], collection, group,
                  rotation=(RNG.uniform(-.008, .008), RNG.uniform(-.008, .008),
                            RNG.uniform(-.008, .008)), bevel=.04)
    for z, key in ((1.02, "wood"), (4.67, "timber")):
        local_box(name + "_Rail", (0, -.235, z), (length, .24, .25), mats[key], collection,
                  group, bevel=.04)
    if not window and length > 2.4:
        for i in range(len(post_x) - 1):
            left, right = post_x[i] + .18, post_x[i + 1] - .18
            if (i + brace_flip) % 2:
                start, end = (left, -.25, 1.15), (right, -.25, 3.72)
            else:
                start, end = (right, -.25, 1.15), (left, -.25, 3.72)
            local_beam(name + f"_Brace_{i}", start, end, .18, .21, mats["wood"],
                       collection, group, .032)
    return group


def shell(root, static, collection, mats):
    B.prism("Hall_Foundation", V5.scaled(PERIMETER, 1.018), -.28, .36,
            mats["stone"], collection, static)
    B.prism("Hall_Floor", V5.scaled(PERIMETER, .974), .08, .12,
            mats["wood"], collection, static)
    # Narrow varied planks give the roof-off Hall a constructed floor.
    for i, x in enumerate([-.95 + n * .62 for n in range(4)]):
        B.cube(f"FloorSeam_{i}", (x, 0, .205), (.026, 21.1, .018),
               mats["timber"], collection, static)

    window_edges = {5, 7, 17, 19}
    for idx in range(len(PERIMETER)):
        a, b = PERIMETER[idx], PERIMETER[(idx + 1) % len(PERIMETER)]
        if idx == 0:
            wall_bay("SouthWall_W", a, (-DOOR_WIDTH / 2, -11), mats, collection, static)
            wall_bay("SouthWall_E", (DOOR_WIDTH / 2, -11), b, mats, collection, static,
                     brace_flip=True)
        elif idx == 11:
            wall_bay("NorthWall_E", a, (DOOR_WIDTH / 2, 12), mats, collection, static)
            wall_bay("NorthWall_W", (-DOOR_WIDTH / 2, 12), b, mats, collection, static,
                     brace_flip=True)
        else:
            wall_bay(f"OuterWall_{idx:02d}", a, b, mats, collection, static,
                     window=idx in window_edges, brace_flip=bool(idx % 2))

    front_pivot, front_fit = K.framed_door(
        B, "front_door", (0, -11), DOOR_WIDTH, DOOR_HEIGHT, WALL_HEIGHT,
        "left", 0, mats, collection, static, root)
    teaching_pivot, teaching_fit = K.framed_door(
        B, "teaching_door", (0, 12), DOOR_WIDTH, DOOR_HEIGHT, WALL_HEIGHT,
        "left", math.pi, mats, collection, static, root)
    enrich_door(front_pivot, mats, collection, "Front")
    enrich_door(teaching_pivot, mats, collection, "Teaching")

    # Irregular approach stones bind the full entrance to Arrival Cove.
    for i in range(7):
        width = 4.9 - i * .20 + RNG.uniform(-.10, .10)
        B.cube(f"ApproachStone_{i}", (RNG.uniform(-.10, .10), -11.55 - i * .74,
                                      -.02 - i * .012),
               (width, .66 + RNG.uniform(-.05, .05), .15),
               mats["path" if i % 2 else "stone_light"], collection, static,
               RNG.uniform(-.025, .025))
    return front_fit, teaching_fit


def enrich_door(pivot, mats, collection, prefix):
    panel_w = DOOR_WIDTH - .06
    panel_h = DOOR_HEIGHT - .06
    widths = [.34, .33, .36, .34, .35, .33, .34]
    total = sum(widths)
    cursor = panel_w / 2 - total / 2
    centers = []
    for i, width in enumerate(widths):
        x = cursor + width / 2
        centers.append(x)
        local_box(prefix + f"Door_Plank_{i}", (x, -.095, panel_h / 2 + .03),
                  (width - .018, .045, panel_h * .91),
                  mats["wood" if i in (1, 4) else "timber"], collection, pivot,
                  rotation=(0, 0, RNG.uniform(-.006, .006)), bevel=.02)
        cursor += width
    angle = math.atan2(panel_h * .72, panel_w * .72)
    brace = local_box(prefix + "Door_ZBrace", (panel_w / 2, -.16, panel_h / 2 + .03),
                      (math.hypot(panel_w * .72, panel_h * .72), .055, .10),
                      mats["iron"], collection, pivot, bevel=.015)
    brace.rotation_euler.y = -angle
    for z in (.55, panel_h - .48):
        for x in centers[::2]:
            local_cylinder(prefix + "Door_Rivet", (x, -.19, z), .035, .035, 8,
                           mats["brass"], collection, pivot,
                           rotation=(math.pi / 2, 0, 0))


def connected_gable_roof(root, collection, mats):
    """One dominant nave roof with two deliberately subordinate wing roofs.

    All three masses overlap below the nave eaves, so the composition reads as
    one built roof system.  Every tile row follows a single roof plane; nothing
    fans, twists, or collides at a mathematical contour center.
    """
    roof = B.empty("roof", collection, root)
    tile_count = 0

    # Central north/south nave: the high ridge owns the building silhouette.
    half_w, depth = 5.35, 25.35
    eave, peak = 4.08, 7.18
    angle = math.atan2(peak - eave, half_w)
    slope_len = math.hypot(half_w, peak - eave)
    for side in (-1, 1):
        rot_y = side * angle
        B.cube("NaveRoofBase", (side * half_w / 2, 0, (eave + peak) / 2),
               (slope_len, depth, .20), mats["roof"], collection, roof).rotation_euler.y = rot_y
        for row in range(8):
            ax = .40 + row * .68
            if ax > half_w:
                continue
            x = side * ax
            z = peak - ax * math.tan(angle) + .13
            col = 0
            y = -12.10 + (.46 if row % 2 else 0)
            while y <= 12.10:
                key = "roof_light" if (row + col) % 4 == 0 else "roof"
                tile = B.cube(f"NaveTile_{side}_{row}_{col}",
                              (x + side * RNG.uniform(-.012, .012), y,
                               z + RNG.uniform(-.010, .010)),
                              (.77, .91, .078), mats[key], collection, roof)
                tile.rotation_euler.y = rot_y
                y += .94
                col += 1
                tile_count += 1
        B.cube("NaveEaveFascia", (side * (half_w + .08), 0, eave - .07),
               (.20, depth + .35, .30), mats["timber"], collection, roof)
        for y in (-11.75, -9.5, -7.2, -4.8, -2.4, 0, 2.4, 4.8, 7.2, 9.5, 11.75):
            beam = B.cube("NaveRafterTail", (side * 5.56, y, 3.96),
                          (.92, .17, .18), mats["wood"], collection, roof)
            beam.rotation_euler.y = rot_y
    B.cylinder("NaveRidge", (0, 0, peak + .13), .17, depth + .45, 8,
               mats["roof_light"], collection, roof, rot=(math.pi / 2, 0, 0))

    # East and west occupational wings sit lower and pass beneath the nave.
    wing_peak, wing_eave = 6.34, 4.04
    half_d, wing_len = 7.35, 8.25
    wing_angle = math.atan2(wing_peak - wing_eave, half_d)
    wing_slope = math.hypot(half_d, wing_peak - wing_eave)
    for wing_x in (-8.95, 8.95):
        for side in (-1, 1):
            rot_x = -side * wing_angle
            base = B.cube("WingRoofBase", (wing_x, side * half_d / 2,
                                           (wing_eave + wing_peak) / 2),
                          (wing_len, wing_slope, .18), mats["roof"], collection, roof)
            base.rotation_euler.x = rot_x
            for row in range(7):
                ay = .48 + row * 1.03
                if ay > half_d:
                    continue
                y = side * ay
                z = wing_peak - ay * math.tan(wing_angle) + .12
                col = 0
                x = wing_x - wing_len / 2 + .42 + (.42 if row % 2 else 0)
                while x <= wing_x + wing_len / 2 - .18:
                    key = "roof_light" if (row + col + (wing_x > 0)) % 4 == 0 else "roof"
                    tile = B.cube(f"WingTile_{wing_x}_{side}_{row}_{col}",
                                  (x, y + side * RNG.uniform(-.012, .012),
                                   z + RNG.uniform(-.010, .010)),
                                  (.88, 1.12, .076), mats[key], collection, roof)
                    tile.rotation_euler.x = rot_x
                    x += .92
                    col += 1
                    tile_count += 1
            B.cube("WingEaveFascia", (wing_x, side * (half_d + .08), wing_eave - .06),
                   (wing_len + .20, .20, .28), mats["timber"], collection, roof)
        B.cylinder("WingRidge", (wing_x, 0, wing_peak + .12), .16, wing_len + .32, 8,
                   mats["roof_light"], collection, roof, rot=(0, math.pi / 2, 0))

    # Front and rear bargeboards state how the nave gables are assembled.
    for y in (-12.62, 12.62):
        for side in (-1, 1):
            local_beam("NaveBargeboard", (0, y, peak + .04),
                       (side * (half_w + .10), y, eave - .05), .20, .22,
                       mats["timber"], collection, roof, .035)

    # Navigation lantern remains the one roof landmark.
    lantern_z = 7.62
    B.cylinder("CompassLantern", (0, 0, lantern_z), .78, .66, 8,
               mats["plaster"], collection, roof)
    for i, (x, y, rotation, glass) in enumerate((
        (0, -.79, 0, "glass_blue"), (0, .79, math.pi, "glass_green"),
        (-.79, 0, math.pi / 2, "glass_blue"), (.79, 0, -math.pi / 2, "glass_green"))):
        B.cube(f"LanternPane_{i}", (x, y, lantern_z + .02), (.44, .07, .48),
               mats[glass], collection, roof, rotation)
        B.cube(f"LanternMullion_{i}", (x, y, lantern_z + .02), (.065, .09, .51),
               mats["iron"], collection, roof, rotation)
    B.cylinder("LanternLowerBand", (0, 0, lantern_z - .34), .92, .15, 8,
               mats["timber"], collection, roof)
    B.cylinder("LanternUpperBand", (0, 0, lantern_z + .35), .92, .15, 8,
               mats["timber"], collection, roof)
    B.poly_roof("CompassLanternCap", B.regular_points(0, 0, 1.04, 8, math.pi / 8),
                lantern_z + .43, 8.72, mats["roof_light"], collection, roof, .04)
    B.cylinder("CompassFinial", (0, 0, 8.91), .15, .38, 8,
               mats["brass"], collection, roof)
    return roof, K.offset_polygon(PERIMETER, ROOF_OVERHANG), tile_count


def detailed_records_cluster(root, static, collection, mats):
    # A second-scale records workstation carries the approved anchor's object
    # language into the complete Hall without blocking the cardinal spine.
    desk = B.empty("RecordsWritingDesk", collection, static, (-8.15, -3.55, 0))
    desk.rotation_euler.z = math.radians(-8)
    local_box("DeskTop", (0, 0, 1.36), (3.10, 1.20, .20), mats["wood"], collection, desk,
              bevel=.075)
    local_box("DeskApron", (0, -.47, 1.06), (2.82, .15, .48), mats["timber"], collection,
              desk, bevel=.03)
    for i, (x, y) in enumerate(((-1.25, -.40), (1.25, -.40), (-1.25, .40), (1.25, .40))):
        local_beam(f"DeskLeg_{i}", (x, y, .10), (x * .96, y * .96, 1.28),
                   .16, .17, mats["timber"], collection, desk, .028)
    local_box("OpenRouteMap", (-.25, -.02, 1.49), (1.45, .76, .035),
              mats["parchment"], collection, desk, rotation=(0, 0, .06), bevel=.018)
    for i, (x, y, angle) in enumerate(((-.55, -.03, .30), (-.10, .10, -.24), (.26, -.12, .12))):
        local_box(f"MapLine_{i}", (x, y, 1.515), (.34, .022, .012), mats["iron"], collection,
                  desk, rotation=(0, 0, angle), bevel=.004)
    local_cylinder("ScrollRoll", (-1.02, .26, 1.56), .09, .76, 8, mats["parchment"],
                   collection, desk, rotation=(0, math.pi / 2, 0), bevel=.012)
    local_cylinder("InkPot", (.70, -.24, 1.61), .12, .22, 8, mats["iron"], collection, desk,
                   bevel=.018)
    local_beam("Quill", (.70, -.24, 1.72), (1.00, -.21, 2.28), .032, .032,
               mats["parchment"], collection, desk, .006)
    local_cylinder("WaxSeal", (.18, .22, 1.53), .085, .03, 10, mats["rug_red"], collection,
                   desk)

    chair = B.empty("RecordsChair", collection, static, (-8.0, -4.75, 0))
    chair.rotation_euler.z = math.radians(10)
    local_box("ChairSeat", (0, 0, .78), (1.10, .94, .17), mats["wood"], collection, chair,
              bevel=.06)
    for i, (x, y) in enumerate(((-.43, -.38), (.43, -.38), (-.43, .38), (.43, .38))):
        local_beam(f"ChairLeg_{i}", (x, y, .08), (x * .91, y * .91, .72),
                   .11, .12, mats["timber"], collection, chair, .022)
    for x in (-.45, .45):
        local_beam("ChairBackPost", (x, .37, .78), (x * .94, .37, 1.80),
                   .12, .12, mats["timber"], collection, chair, .022)
        local_cylinder("ChairFinial", (x * .94, .37, 1.87), .10, .13, 8, mats["brass"],
                       collection, chair)
    for z in (1.08, 1.38, 1.65):
        local_box("ChairBackSplat", (0, .37, z), (.84, .12, .11), mats["wood"], collection,
                  chair, bevel=.018)


def enrich_interior(root, static, collection, mats):
    detailed_records_cluster(root, static, collection, mats)
    # Provisioning clutter is grouped by task: casks and packs flank the issue
    # counter instead of being sprinkled around the entire room.
    for i, (x, y) in enumerate(((10.65, 3.70), (10.65, 4.90))):
        B.cylinder(f"ProvisionCask_{i}", (x, y, .62), .48, 1.05, 10,
                   mats["wood"], collection, static, rot=(0, math.pi / 2, 0))
        for offset in (-.33, .33):
            B.cylinder(f"CaskBand_{i}", (x + offset, y, .62), .50, .10, 10,
                       mats["iron"], collection, static, rot=(0, math.pi / 2, 0))
    for i, (x, y, key) in enumerate(((8.0, -1.15, "path"), (8.5, -1.10, "rug_green"),
                                      (9.0, -1.20, "wood"))):
        B.cylinder(f"IssuedPack_{i}", (x, y, 1.70), .28, .48, 7,
                   mats[key], collection, static)

    # Small chamfers soften the furniture silhouette while preserving flat
    # shading.  Architecture and floors remain crisp.
    tokens = ("Bench", "Library", "Lectern", "Chest", "Cabinet", "Counter",
              "Table", "Dais", "Board", "Plaque")
    for obj in list(static.children_recursive):
        if obj.type != "MESH" or not any(token in obj.name for token in tokens):
            continue
        minimum = min(obj.dimensions)
        if minimum <= .035:
            continue
        modifier = obj.modifiers.new("FurnitureChamfer", "BEVEL")
        modifier.width = min(.035, minimum * .12)
        modifier.segments = 1
        bpy.context.view_layer.objects.active = obj
        try:
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        except RuntimeError:
            obj.modifiers.remove(modifier)


def create_building():
    mats = setup_materials()
    collection = bpy.data.collections.new("GuideHall_HandAuthoredV6")
    bpy.context.scene.collection.children.link(collection)
    root = B.empty("holm_guide_hall_v6", collection)
    root["buildingDefId"] = "holm_guide_hall_v1"
    root["assetId"] = "holm_guide_hall"
    root["revision"] = 6
    root["pipelineVersion"] = 1
    root["assetClass"] = "building"
    root["artDirection"] = "owner-approved-guide-hall-anchor"
    static = B.empty("static_architecture", collection, root)
    front_fit, teaching_fit = shell(root, static, collection, mats)
    roof, outer, tile_count = connected_gable_roof(root, collection, mats)
    V5.make_interior(root, static, collection, mats)
    enrich_interior(root, static, collection, mats)
    return root, static, roof, collection, mats, outer, tile_count, front_fit, teaching_fit


def metrics(root):
    meshes = [obj for obj in B.descendants(root) if obj.type == "MESH"]
    triangles = sum(max(0, len(poly.vertices) - 2) for obj in meshes for poly in obj.data.polygons)
    materials = sorted({material.name for obj in meshes for material in obj.data.materials if material})
    return {"triangles": triangles, "meshObjects": len(meshes), "materials": len(materials),
            "materialNames": materials}


def authoring_report(root, outer, tile_count, front_fit, teaching_fit):
    descendants = {obj.name for obj in B.descendants(root)}
    required = ("roof", "front_door", "teaching_door", "orientation_table",
                "lesson_register", "first_landing_plaque", "provision_rack")
    checks = {
        "continuousPerimeterPreserved": len(outer) == len(PERIMETER),
        "fittedDoorLeavesPreserved": front_fit["horizontalGap"] <= .061 and
                                     teaching_fit["horizontalGap"] <= .061,
        "actualRecessedWindowsAuthored": sum("_Pane_" in name for name in descendants) >= 36,
        "irregularMasonryCoursesAuthored": sum("_Stone_" in name for name in descendants) >= 120,
        "loadBearingTimberBaysAuthored": sum("_Brace_" in name for name in descendants) >= 12,
        "layeredConnectedRoofAuthored": tile_count >= 480,
        "occupationalRecordsClusterAuthored": all(any(token in name for name in descendants) for token in
                                                   ("RecordsWritingDesk", "RecordsChair", "OpenRouteMap",
                                                    "Quill", "ScrollRoll")),
        "semanticNodesPreserved": all(name in descendants for name in required),
    }
    report = {
        "asset": "holm_guide_hall_v6",
        "pipelineVersion": 1,
        "unitsPerTile": 1,
        "checks": checks,
        "visualLanguage": "owner-approved Guide Hall art anchor",
        "roofTiles": tile_count,
        "metrics": metrics(root),
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    if not all(checks.values()):
        raise RuntimeError("Guide Hall v6 authoring checks failed: " +
                           ", ".join(name for name, ok in checks.items() if not ok))
    return report


def render_export(root, roof, collection, mats):
    scene = bpy.context.scene
    cam = V5.setup_preview(mats)
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 1050
    scene.render.filepath = str(PREVIEW / "guide_hall_v6_exterior.png")
    bpy.ops.render.render(write_still=True)

    B.set_render_hidden(roof, True)
    scene.render.filepath = str(PREVIEW / "guide_hall_v6_roof_off.png")
    bpy.ops.render.render(write_still=True)

    cam.location = (20.5, -25.5, 25.0)
    B.look_at(cam, (0, 0, 1.4))
    cam.data.ortho_scale = 30.0
    scene.render.filepath = str(PREVIEW / "guide_hall_v6_game_camera.png")
    bpy.ops.render.render(write_still=True)

    cam.location = (9.5, -19.0, 8.8)
    B.look_at(cam, (0, -10.7, 1.8))
    cam.data.ortho_scale = 8.9
    scene.render.filepath = str(PREVIEW / "guide_hall_v6_entrance.png")
    bpy.ops.render.render(write_still=True)
    B.set_render_hidden(roof, False)

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
    (root, static, roof, collection, mats, outer, tile_count,
     front_fit, teaching_fit) = create_building()
    # Inspect authored component names before draw-call consolidation replaces
    # hundreds of descriptive mesh names with material-group names.
    report = authoring_report(root, outer, tile_count, front_fit, teaching_fit)
    targets = [(static, "Static"), (roof, "Roof")]
    for part_name in ("front_door", "teaching_door", "orientation_table", "lesson_register",
                      "first_landing_plaque", "provision_rack"):
        targets.append((next(obj for obj in root.children if obj.name == part_name), part_name))
    for target, prefix in targets:
        B.consolidate_meshes(target, prefix)
    report["metrics"] = metrics(root)
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    render_export(root, roof, collection, mats)
    print("GUIDE_HALL_V6_READY", MODEL)
    print("ASSET_REPORT", json.dumps(report["checks"], sort_keys=True))


if __name__ == "__main__":
    main()
