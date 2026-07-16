"""Build the Tutor's Holm Survival Workyard surface asset.

Hearth Court replaces the rectangular v1 massing with an offset lodge, short
passage, many-sided teaching-hearth room, load-bearing covered work court,
cleared occupation yard, and a separate off-map storm cellar.  The basement is now owner-approved
and has its own Blender sources/runtime GLBs, so surface iterations deliberately
do not rebuild or export the frozen room.
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
import build_survival_workyard_v1 as V1
import cr_furnishings_v1 as F
import cr_lowpoly_assetkit as A
import cr_workyard_upstairs_v1 as U


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets" / "blender" / "holm_survival_workyard_v2.blend"
MODEL = ROOT / "assets" / "models" / "buildings" / "holm_survival_workyard_v2.glb"
PREVIEW = ROOT / "scratchpad" / "survival_workyard_v2"
REPORT = PREVIEW / "asset_report.json"
PROGRESS = PREVIEW / "build_progress.txt"
for path in (SOURCE.parent, MODEL.parent, PREVIEW):
    path.mkdir(parents=True, exist_ok=True)

V1.WALL_H = 4.55
V1.RNG = random.Random(140727)
V1.APPLY_BEVEL = False
F.APPLY_BEVEL = False
WALL_H = V1.WALL_H
MAIN = (-9.0, -1.0, -6.0, 6.0)  # x0, x1, y0, y1
TRAIL_HINGE_X = -3.40
TRAIL_DOOR_WIDTH = 1.55
POND_DOOR_WIDTH = 1.50
PLAYER_VISUAL_H = 1.85
DOOR_OPENING_H = 2.50
DOOR_FRAME_DETAIL_CLEARANCE = .42
CELLAR_LADDER_XY = (-5.65, -3.65)
CELLAR_HOLE_HALF = .84
CELLAR_LANTERN_XS = (-3.15, 3.15)
HEARTH_CENTER = (5.0, 2.0)
HEARTH_RADIUS = 3.60
HEARTH_POINTS = [
    (HEARTH_CENTER[0] + math.cos(math.radians(22.5 + i * 45)) * HEARTH_RADIUS,
     HEARTH_CENTER[1] + math.sin(math.radians(22.5 + i * 45)) * HEARTH_RADIUS)
    for i in range(8)
]


def mark(stage):
    PROGRESS.write_text(stage, encoding="utf-8")
    print("WORKYARD_V2_STAGE", stage, flush=True)


def mat(name, rgb, roughness=.9, metallic=0, emission=0):
    material = V1.material(name, rgb, roughness, metallic, emission)
    return material


def materials():
    mats = V1.setup_materials()
    mats.update({
        "oak": mats["wood"], "oak_dark": mats["timber"], "oak_light": mats["wood_light"],
        "willow": mat("CR Workyard Willow", (.51, .43, .22)),
        "willow_dark": mat("CR Workyard Willow Dark", (.25, .22, .095)),
        "willow_light": mat("CR Workyard Willow Light", (.70, .62, .34)),
        "mahogany": mat("CR Workyard Mahogany", (.42, .11, .055)),
        "mahogany_dark": mat("CR Workyard Mahogany Dark", (.18, .035, .025)),
        "mahogany_light": mat("CR Workyard Mahogany Light", (.65, .22, .09)),
        "soot": mat("CR Workyard Soot", (.065, .055, .045)),
        "iron_light": mat("CR Workyard Iron Highlight", (.32, .34, .32), .56, .34),
        "sack": mat("CR Workyard Sackcloth", (.52, .40, .22)),
        "grain": mat("CR Workyard Grain", (.78, .61, .18)),
        "bread": mat("CR Workyard Bread", (.70, .43, .16)),
        "ceramic_cream": mat("CR Workyard Cream Pottery", (.78, .69, .48)),
        "ceramic_blue": mat("CR Workyard Blue Pottery", (.18, .36, .46)),
        "rug_red": mat("CR Workyard Rug Red", (.48, .09, .055)),
        "rug_blue": mat("CR Workyard Rug Blue", (.08, .23, .38)),
        "rug_green": mat("CR Workyard Rug Green", (.16, .34, .18)),
        "rug_gold": mat("CR Workyard Rug Gold", (.75, .49, .12)),
        "painting_sky": mat("CR Workyard Painting Sky", (.21, .39, .49)),
        "flame_red": mat("CR Workyard Flame Ember", (.75, .10, .025), .55, 0, 2.0),
        "flame_gold": mat("CR Workyard Flame Gold", (1.0, .37, .025), .50, 0, 2.7),
        "flame_yellow": mat("CR Workyard Flame Core", (1.0, .82, .13), .45, 0, 3.3),
        "glass_blue": mat("CR Workyard Glass Blue", (.10, .34, .50), .32, 0, .35),
        "glass_gold": mat("CR Workyard Glass Gold", (.76, .48, .08), .32, 0, .30),
        "glass_red": mat("CR Workyard Glass Red", (.56, .10, .06), .32, 0, .28),
        "glass_green": mat("CR Workyard Glass Green", (.12, .42, .20), .32, 0, .30),
        "cellar_floor": mat("CR Cellar Flagstone", (.22, .23, .20)),
        "cellar_mortar": mat("CR Cellar Mortar", (.40, .39, .33)),
        "court_cement": mat("CR Workyard Weathered Cement", (.35, .36, .32)),
        "court_mortar": mat("CR Workyard Cement Joints", (.20, .205, .185)),
        "root_veg": mat("CR Cellar Root Vegetables", (.48, .20, .075)),
        "dark_hole": mat("CR Ladder Well", (.025, .021, .017)),
        "lantern_glass": mat("CR Cellar Lantern Amber Glass", (.58, .20, .035), .42, 0, 1.15),
    })
    # These are windows, not colored wall tiles. Export the panes with real
    # alpha so the live wall openings retain exterior light and silhouettes.
    for key, alpha in (("glass_blue", .58), ("glass_gold", .64),
                       ("glass_red", .62), ("glass_green", .58)):
        glass = mats[key]
        rgb = tuple(glass.diffuse_color[:3])
        glass.diffuse_color = (*rgb, alpha)
        bsdf = glass.node_tree.nodes.get("Principled BSDF") if glass.node_tree else None
        if bsdf and bsdf.inputs.get("Alpha"):
            bsdf.inputs["Alpha"].default_value = alpha
        if hasattr(glass, "surface_render_method"):
            glass.surface_render_method = "DITHERED"
    return mats


def cone(name, loc, radius1, radius2, depth, sides, material, collection, parent,
         rotation=(0, 0, 0)):
    """Flat-shaded low-poly cone/frustum used for hand-authored fixture profiles."""
    bpy.ops.mesh.primitive_cone_add(vertices=sides, radius1=radius1, radius2=radius2,
                                    depth=depth, location=(0, 0, 0), rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    B.link(obj, collection, parent)
    obj.location = loc
    obj.data.materials.append(material)
    for face in obj.data.polygons:
        face.use_smooth = False
    return obj


def foundation_floor(static, mats):
    x0, x1, y0, y1 = MAIN
    # The storm hatch is a true opening through both the timber floor and the
    # foundation. Four panels preserve the exact lodge footprint without a
    # hidden slab sealing the shaft a few centimetres below the black surface.
    hx, hy = CELLAR_LADDER_XY
    def split_rect(name, xmin, xmax, ymin, ymax, hole_half, z, height, material, bevel):
        hx0, hx1 = hx - hole_half, hx + hole_half
        hy0, hy1 = hy - hole_half, hy + hole_half
        panels = (
            (xmin, hx0, ymin, ymax), (hx1, xmax, ymin, ymax),
            (hx0, hx1, ymin, hy0), (hx0, hx1, hy1, ymax),
        )
        for i, (ax, bx, ay, by) in enumerate(panels):
            V1.box(f"{name}_{i}", ((ax + bx) / 2, (ay + by) / 2, z),
                   (bx - ax, by - ay, height), material, COLLECTION, static, bevel=bevel)

    split_rect("LodgeFoundation", x0 - .225, x1 + .225, y0 - .225, y1 + .225,
               CELLAR_HOLE_HALF + .06, -.11, .34, mats["stone"], .07)
    split_rect("LodgeFloor", x0 + .125, x1 - .125, y0 + .125, y1 - .125,
               CELLAR_HOLE_HALF, .09, .16, mats["wood"], .025)
    for x in [x0 + .55 + i * .78 for i in range(10)]:
        if abs(x - hx) >= CELLAR_HOLE_HALF + .03:
            V1.box("LodgeFloorSeam", (x, 0, .185), (.035, 11.55, .018),
                   mats["timber"], COLLECTION, static, bevel=.002)
        else:
            for i, (ay, by) in enumerate(((y0 + .225, hy - CELLAR_HOLE_HALF),
                                           (hy + CELLAR_HOLE_HALF, y1 - .225))):
                V1.box(f"LodgeFloorSeam_{i}", (x, (ay + by) / 2, .185),
                       (.035, by - ay, .018), mats["timber"], COLLECTION, static, bevel=.002)
    # The passage is visibly narrower and lower than either destination room.
    V1.box("PassageFoundation", (.34, 2.0, -.10), (3.0, 3.0, .32),
           mats["stone"], COLLECTION, static, bevel=.06)
    V1.box("PassageFloor", (.34, 2.0, .09), (2.75, 2.72, .16),
           mats["wood_light"], COLLECTION, static, bevel=.025)
    # A single many-sided slab follows the hearth room, rather than hiding a
    # rectangular floor under the octagon.
    verts = [(x, y, -.11) for x, y in HEARTH_POINTS] + [(x, y, .14) for x, y in HEARTH_POINTS]
    faces = [tuple(range(8)), tuple(range(8, 16))]
    for i in range(8):
        faces.append((i, (i + 1) % 8, 8 + (i + 1) % 8, 8 + i))
    mesh = bpy.data.meshes.new("HearthFoundationMesh")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mats["stone"])
    obj = B.link(bpy.data.objects.new("HearthFoundation", mesh), COLLECTION, static)
    # Warm spoke floor reinforces the room's many-sided plan in roof-off view.
    for i in range(8):
        a, b = HEARTH_POINTS[i], HEARTH_POINTS[(i + 1) % 8]
        center = HEARTH_CENTER
        mesh = bpy.data.meshes.new(f"HearthFloorWedge_{i}Mesh")
        mesh.from_pydata([(center[0], center[1], .185), (a[0], a[1], .185), (b[0], b[1], .185)], [], [(0, 1, 2)])
        mesh.materials.append(mats["wood" if i % 2 else "wood_light"])
        B.link(bpy.data.objects.new(f"HearthFloorWedge_{i}", mesh), COLLECTION, static)


def walls_and_doors(root, static, mats):
    x0, x1, y0, y1 = MAIN
    lodge_interior = ((x0 + x1) / 2, (y0 + y1) / 2)
    # Lodge perimeter, with a full trail door and a real east-wall passage opening.
    west_window_y, west_gap = -1.65, 1.95
    V1.wall_segment("LodgeWestSouth", (x0, y0), (x0, west_window_y - west_gap / 2),
                    mats, COLLECTION, static, interior_point=lodge_interior)
    V1.wall_segment("LodgeWestNorth", (x0, west_window_y + west_gap / 2), (x0, y1),
                    mats, COLLECTION, static, True, interior_point=lodge_interior)
    window_wall_infill("WestStormWindowBay", (x0, west_window_y), math.pi / 2,
                       west_gap, 1.30, 1.92, mats, static, lodge_interior)
    V1.wall_segment("LodgeNorth", (x0, y1), (x1, y1), mats, COLLECTION, static, True,
                    interior_point=lodge_interior)
    # The trail door is deliberately aligned with the island's pond-loop path,
    # rather than being tucked into the far corner of the lodge facade.
    V1.wall_segment("LodgeSouthWest", (x0, y0), (TRAIL_HINGE_X, y0), mats, COLLECTION,
                    static, True, interior_point=lodge_interior,
                    detail_end_inset=DOOR_FRAME_DETAIL_CLEARANCE)
    V1.wall_segment("LodgeSouthEast", (TRAIL_HINGE_X + TRAIL_DOOR_WIDTH, y0), (x1, y0),
                    mats, COLLECTION, static, interior_point=lodge_interior,
                    detail_start_inset=DOOR_FRAME_DETAIL_CLEARANCE)
    V1.wall_segment("LodgeEastSouth", (x1, y0), (x1, .65), mats, COLLECTION, static,
                    True, interior_point=lodge_interior)
    V1.wall_segment("LodgeEastNorth", (x1, 3.35), (x1, y1), mats, COLLECTION, static,
                    interior_point=lodge_interior)

    # Passage sides meet both rooms exactly. There are no overlapping end walls.
    V1.wall_segment("PassageSouth", (x1, .65), (HEARTH_POINTS[4][0], HEARTH_POINTS[4][1]),
                    mats, COLLECTION, static, interior_point=(.34, 2.0))
    V1.wall_segment("PassageNorth", (x1, 3.35), (HEARTH_POINTS[3][0], HEARTH_POINTS[3][1]),
                    mats, COLLECTION, static, True, interior_point=(.34, 2.0))

    # Hearth perimeter omits the west passage and splits the east side around
    # the pond door. The remaining six angled walls carry the octagonal room.
    for i in (2, 4, 5, 6):
        V1.wall_segment(f"HearthWall_{i}", HEARTH_POINTS[i], HEARTH_POINTS[(i + 1) % 8],
                        mats, COLLECTION, static, bool(i % 2), interior_point=HEARTH_CENTER)
    # The teaching hearth owns the north wall. Its stained glass therefore
    # moves to the northeast facet, where daylight reaches the room without a
    # window appearing to pass through the chimney/firebox.
    V1.wall_segment("HearthWall_1", HEARTH_POINTS[1], HEARTH_POINTS[2],
                    mats, COLLECTION, static, True, interior_point=HEARTH_CENTER)
    win_a, win_b, hearth_window_gap = HEARTH_POINTS[0], HEARTH_POINTS[1], 1.72
    win_dx, win_dy = win_b[0] - win_a[0], win_b[1] - win_a[1]
    win_len = math.hypot(win_dx, win_dy)
    win_ux, win_uy = win_dx / win_len, win_dy / win_len
    hearth_window_center = ((win_a[0] + win_b[0]) / 2, (win_a[1] + win_b[1]) / 2)
    hearth_window_start = (hearth_window_center[0] - win_ux * hearth_window_gap / 2,
                            hearth_window_center[1] - win_uy * hearth_window_gap / 2)
    hearth_window_end = (hearth_window_center[0] + win_ux * hearth_window_gap / 2,
                          hearth_window_center[1] + win_uy * hearth_window_gap / 2)
    hearth_window_rotation = math.atan2(win_dy, win_dx)
    V1.wall_segment("HearthWindowWallSouth", win_a, hearth_window_start,
                    mats, COLLECTION, static, interior_point=HEARTH_CENTER)
    V1.wall_segment("HearthWindowWallNorth", hearth_window_end, win_b,
                    mats, COLLECTION, static, True, interior_point=HEARTH_CENTER)
    window_wall_infill("NortheastHearthWindowBay", hearth_window_center,
                       hearth_window_rotation, hearth_window_gap, 1.30, 1.92,
                       mats, static, HEARTH_CENTER)
    east_x = HEARTH_POINTS[7][0]
    V1.wall_segment("HearthEastSouth", HEARTH_POINTS[7], (east_x, 1.10),
                    mats, COLLECTION, static, interior_point=HEARTH_CENTER,
                    exterior_detail=False)
    V1.wall_segment("HearthEastNorth", (east_x, 1.10 + POND_DOOR_WIDTH), HEARTH_POINTS[0],
                    mats, COLLECTION, static, True, interior_point=HEARTH_CENTER,
                    exterior_detail=False)

    trail_hinge = (TRAIL_HINGE_X, y0)
    pond_hinge = (east_x, 1.10)
    fitted_door_frame("TrailDoorFrame", trail_hinge, TRAIL_DOOR_WIDTH, 0, mats, static)
    fitted_door_frame("PondDoorFrame", pond_hinge, POND_DOOR_WIDTH, math.pi / 2, mats, static)
    fitted_door_leaf("trail_door", trail_hinge, TRAIL_DOOR_WIDTH, 0, mats, root)
    fitted_door_leaf("pond_door", pond_hinge, POND_DOOR_WIDTH, math.pi / 2, mats, root)

    # Small colored windows are occupational and domestic, not a second civic
    # cathedral motif. Their strong frames read at the gameplay camera.
    fitted_stained_glass_window("WestStormWindow", (x0, west_window_y), math.pi / 2,
                                west_gap, 1.30, 1.92, mats, static,
                                ("glass_green", "glass_gold", "glass_blue"))
    fitted_stained_glass_window("NortheastHearthWindow", hearth_window_center,
                                hearth_window_rotation, hearth_window_gap, 1.30, 1.92,
                                mats, static,
                                ("glass_gold", "glass_red", "glass_green"))


def window_wall_infill(name, center, rotation, width, opening_bottom, opening_height,
                       mats, static, interior_point):
    """Fill below and above a true wall gap while leaving the pane transparent."""
    group = B.empty(name, COLLECTION, static, (center[0], center[1], 0))
    group.rotation_euler.z = rotation
    opening_top = opening_bottom + opening_height
    V1.box(name + "_LowerPlaster", (0, 0, opening_bottom / 2),
           (width, .26, opening_bottom), mats["plaster"], COLLECTION, group, bevel=.018)
    upper_h = WALL_H - opening_top
    V1.box(name + "_UpperPlaster", (0, 0, opening_top + upper_h / 2),
           (width, .26, upper_h), mats["plaster"], COLLECTION, group, bevel=.018)
    local_plus_y = (-math.sin(rotation), math.cos(rotation))
    to_interior = (interior_point[0] - center[0], interior_point[1] - center[1])
    plus_points_inside = local_plus_y[0] * to_interior[0] + local_plus_y[1] * to_interior[1] > 0
    detail_sign = -1 if plus_points_inside else 1
    # Low fieldstone courses continue beneath the sill, while oak lintel/sill
    # pieces make the opening read as supported architecture rather than a pane
    # pasted over an intact wall.
    for row, z in enumerate((.17, .47, .77)):
        V1.box(name + f"_Stone_{row}", (0, detail_sign * .255, z),
               (width - .08, .18, .245),
               mats["stone_light" if row == 1 else "stone"], COLLECTION, group,
               bevel=.035)
    V1.box(name + "_SillBeam", (0, detail_sign * .24, opening_bottom - .08),
           (width + .18, .28, .18), mats["timber"], COLLECTION, group, bevel=.025)
    V1.box(name + "_LintelBeam", (0, detail_sign * .24, opening_top + .08),
           (width + .18, .28, .18), mats["timber"], COLLECTION, group, bevel=.025)
    return group


def fitted_stained_glass_window(name, center, rotation, width, opening_bottom,
                                height, mats, static, palette):
    """Fill the complete framed opening with an overlapping two-by-three grid.

    The shared early window left a decorative margin between its outer frame
    and the authored wall gap. This Workyard-specific version makes the frame
    equal the opening and lets every pane overlap its mullions slightly, so no
    daylight slit can appear around the glass at gameplay angles.
    """
    group = B.empty(name, COLLECTION, static, (center[0], center[1], opening_bottom))
    group.rotation_euler.z = rotation
    bar, mullion, depth = .14, .085, .34
    for x in (-width / 2 + bar / 2, width / 2 - bar / 2):
        V1.box(name + "_FrameV", (x, 0, height / 2), (bar, depth, height),
               mats["timber"], COLLECTION, group, bevel=.012)
    for z in (bar / 2, height - bar / 2):
        V1.box(name + "_FrameH", (0, 0, z), (width, depth, bar),
               mats["timber"], COLLECTION, group, bevel=.012)
    inner_w, inner_h = width - 2 * bar, height - 2 * bar
    cell_w, cell_h = inner_w / 3, inner_h / 2
    for divider in (1, 2):
        x = -inner_w / 2 + divider * cell_w
        V1.box(name + "_Mullion", (x, -.01, height / 2),
               (mullion, depth, inner_h), mats["timber"], COLLECTION, group)
    V1.box(name + "_Transom", (0, -.01, height / 2),
           (inner_w, depth, mullion), mats["timber"], COLLECTION, group)
    for row in range(2):
        for col in range(3):
            x = -inner_w / 2 + (col + .5) * cell_w
            z = bar + (row + .5) * cell_h
            key = palette[(row * 3 + col) % len(palette)]
            V1.box(name + f"_Pane_{row}_{col}", (x, 0, z),
                   (cell_w + .026, .065, cell_h + .026), mats[key], COLLECTION, group)
    V1.box(name + "_Diamond", (0, -.045, height / 2), (.38, .065, .38),
           mats["glass_green"], COLLECTION, group, rotation=(0, 0, math.pi / 4))
    return group


def fitted_door_frame(name, hinge, width, rotation, mats, static):
    """Player-scaled frame with a real wall panel continuing above it.

    Revision 7 incorrectly solved an open wall gap by stretching the door to
    the eave. The canonical player is 1.85 tiles tall, so this 2.50-tile opening
    gives headroom without reading as a barn gate. Plaster above the lintel owns
    the remaining wall height; the door is no longer asked to be the wall.
    """
    x, y = hinge
    co, si = math.cos(rotation), math.sin(rotation)
    cx, cy = x + co * width / 2, y + si * width / 2
    threshold_top = .16
    lintel_bottom = DOOR_OPENING_H + .03
    lintel_height = .27
    jamb_bottom = .08
    jamb_top = lintel_bottom + lintel_height
    jamb_height = jamb_top - jamb_bottom
    for side in (-1, 1):
        px = cx + co * side * (width / 2 + .16)
        py = cy + si * side * (width / 2 + .16)
        V1.box(name + "_Jamb", (px, py, jamb_bottom + jamb_height / 2),
               (.20, .46, jamb_height), mats["timber"], COLLECTION, static,
               rotation=(0, 0, rotation), bevel=.035)
    V1.box(name + "_Lintel", (cx, cy, lintel_bottom + lintel_height / 2),
           (width + .46, .48, lintel_height), mats["timber"], COLLECTION,
           static, rotation=(0, 0, rotation), bevel=.04)
    upper_bottom = lintel_bottom + lintel_height
    upper_height = WALL_H - upper_bottom
    V1.box(name + "_OverdoorPlaster",
           (cx, cy, upper_bottom + upper_height / 2),
           (width, .26, upper_height), mats["plaster"], COLLECTION, static,
           rotation=(0, 0, rotation), bevel=.018)
    V1.box(name + "_Threshold", (cx, cy, threshold_top / 2),
           (width + .30, .54, threshold_top), mats["stone"], COLLECTION, static,
           rotation=(0, 0, rotation), bevel=.035)


def fitted_door_leaf(name, hinge, width, rotation, mats, root):
    """A leaf that overlaps the frame rebate instead of floating inside it.

    The shared v1 leaf intentionally left a four-percent clearance. At this
    scale that reads as a missing strip of door from the gameplay camera, so
    this production variant fills the jamb-to-jamb and threshold-to-lintel
    opening with a small, believable rebate overlap.
    """
    group = B.empty(name, COLLECTION, root, (hinge[0], hinge[1], 0))
    group.rotation_euler.z = rotation
    leaf_start, leaf_width = -.035, width + .07
    leaf_bottom, leaf_top = .145, DOOR_OPENING_H
    plank_w = leaf_width / 7
    for i in range(7):
        V1.box(f"{name}_Plank_{i}",
               (leaf_start + plank_w * (i + .5), 0, (leaf_bottom + leaf_top) / 2),
               (plank_w + .008, .20, leaf_top - leaf_bottom),
               mats["wood" if i % 3 else "wood_light"], COLLECTION, group, bevel=.018)
    for z in (.48, 1.31, 2.14):
        V1.box(name + "_Strap", (width * .50, -.13, z), (width * .91, .085, .105),
               mats["iron"], COLLECTION, group, bevel=.012)
    for z in (.40, 1.30, 2.20):
        V1.box(name + "_Hinge", (.10, -.145, z), (.24, .11, .32),
               mats["iron"], COLLECTION, group, bevel=.018)
    V1.cylinder(name + "_Ring", (width * .77, -.18, 1.30), .12, .055, 10,
                mats["brass"], COLLECTION, group, rotation=(math.pi / 2, 0, 0))
    return group


def gable_roof(roof, mats, name, x0, x1, y0, y1, eave, peak, ridge_axis="y"):
    count = 0
    if ridge_axis == "y":
        center, half = (x0 + x1) / 2, (x1 - x0) / 2 + .55
        rise, length = peak - eave, y1 - y0 + 1.0
        angle, slope = math.atan2(rise, half), math.hypot(half, rise)
        rows, cols = max(4, int(length / .83)), max(4, int(slope / .62))
        for side in (-1, 1):
            V1.box(name + "Base", (center + side * half / 2, (y0 + y1) / 2, (eave + peak) / 2),
                   (slope + .14, length, .14), mats["roof"], COLLECTION, roof,
                   rotation=(0, side * angle, 0), bevel=0)
            for row in range(rows):
                y = y0 - .30 + row * (length / rows)
                for col in range(cols):
                    t = (col + .5) / cols
                    x = center + side * half * (1 - t)
                    z = eave + rise * t + .09
                    key = "roof_moss" if (row * 3 + col + (side > 0)) % 19 == 0 else \
                        ("roof_light" if (row + col) % 8 == 0 else "roof")
                    V1.box(f"{name}Tile_{side}_{row}_{col}", (x, y, z),
                           (slope / cols * 1.13, length / rows * 1.10, .085),
                           mats[key], COLLECTION, roof, rotation=(0, side * angle, 0), bevel=0)
                    count += 1
        V1.box(name + "Ridge", (center, (y0 + y1) / 2, peak + .06), (.30, length, .30),
               mats["timber"], COLLECTION, roof, bevel=.045)
    else:
        center, half = (y0 + y1) / 2, (y1 - y0) / 2 + .42
        rise, length = peak - eave, x1 - x0 + .70
        angle, slope = math.atan2(rise, half), math.hypot(half, rise)
        rows, cols = max(4, int(length / .78)), max(4, int(slope / .55))
        for side in (-1, 1):
            V1.box(name + "Base", ((x0 + x1) / 2, center + side * half / 2, (eave + peak) / 2),
                   (length, slope + .14, .14), mats["roof"], COLLECTION, roof,
                   rotation=(side * -angle, 0, 0), bevel=0)
            for row in range(rows):
                x = x0 - .20 + row * (length / rows)
                for col in range(cols):
                    t = (col + .5) / cols
                    y = center + side * half * (1 - t)
                    z = eave + rise * t + .09
                    key = "roof_moss" if (row * 2 + col) % 17 == 0 else \
                        ("roof_light" if (row + col) % 7 == 0 else "roof")
                    V1.box(f"{name}Tile_{side}_{row}_{col}", (x, y, z),
                           (length / rows * 1.08, slope / cols * 1.13, .085),
                           mats[key], COLLECTION, roof, rotation=(side * -angle, 0, 0), bevel=0)
                    count += 1
        V1.box(name + "Ridge", ((x0 + x1) / 2, center, peak + .06), (length, .30, .30),
               mats["timber"], COLLECTION, roof, bevel=.045)
    return count


def lean_to_roof(roof, mats):
    # Tuck the high edge through the lodge wall plane and overlap the court on
    # every other side.  The earlier exact-edge fit showed daylight at the wall.
    high_x, low_x = -1.08, 7.72
    high_z, low_z = 4.72, 3.04
    y0, y1 = -6.05, -.42
    span, rise = low_x - high_x, high_z - low_z
    angle, slope = math.atan2(rise, span), math.hypot(span, rise)
    V1.box("CourtRoofBase", ((high_x + low_x) / 2, (y0 + y1) / 2, (high_z + low_z) / 2),
           (slope + .16, y1 - y0 + .35, .15), mats["roof"], COLLECTION, roof,
           rotation=(0, angle, 0), bevel=.02)
    count = 0
    rows, cols = 7, 11
    for row in range(rows):
        y = y0 + .10 + row * ((y1 - y0) / (rows - 1))
        for col in range(cols):
            t = (col + .5) / cols
            x = high_x + span * t
            z = high_z - rise * t + .09
            key = "roof_moss" if (row + col * 3) % 17 == 0 else \
                ("roof_light" if (row + col) % 8 == 0 else "roof")
            V1.box(f"CourtTile_{row}_{col}", (x, y, z),
                   (slope / cols * 1.10, (y1 - y0) / rows * 1.13, .085),
                   mats[key], COLLECTION, roof, rotation=(0, angle, 0), bevel=0)
            count += 1
    V1.box("CourtEave", (low_x, (y0 + y1) / 2, low_z), (.18, y1 - y0 + .55, .20),
           mats["timber"], COLLECTION, roof, bevel=.025)
    V1.box("CourtWallLedger", (-.92, (y0 + y1) / 2, 4.53),
           (.30, y1 - y0 + .34, .28), mats["timber"], COLLECTION, roof, bevel=.025)
    return count


def roofs(roof, mats):
    count = gable_roof(roof, mats, "LodgeRoof", -9, -1, -6, 6, WALL_H + .08, 7.05, "y")
    # The passage walls use the full wall height, so their roof must meet that
    # height too.  Generous overlap beneath both neighboring roofs prevents the
    # disconnected white slots visible in v2.
    count += gable_roof(roof, mats, "PassageRoof", -1.46, 2.16, .24, 3.76,
                        WALL_H + .08, 5.58, "x")
    A.contour_hip_roof(B, "HearthRoof", HEARTH_POINTS, WALL_H + .02, 6.45,
                       .52, .16, .07, mats, COLLECTION, roof)
    # Two contour bands create a handmade shingle rhythm without triangle soup.
    for ring_index, factor in enumerate((1.035, .78)):
        z = WALL_H + .14 + ring_index * .55
        points = [(HEARTH_CENTER[0] + (x - HEARTH_CENTER[0]) * factor,
                   HEARTH_CENTER[1] + (y - HEARTH_CENTER[1]) * factor) for x, y in HEARTH_POINTS]
        for i, a in enumerate(points):
            b = points[(i + 1) % 8]
            V1.beam(f"HearthShingleBand_{ring_index}_{i}", (a[0], a[1], z), (b[0], b[1], z),
                    .12, .10, mats["roof_light" if (i + ring_index) % 4 == 0 else "roof"],
                    COLLECTION, roof, .012)
            count += 1
    # Hand-fitted seam pieces make the three independent roof masses read as a
    # single rainproof building at the gameplay camera.
    V1.box("PassageWestFlashing", (-1.16, 2.0, WALL_H + .24),
           (.42, 4.02, .26), mats["timber"], COLLECTION, roof, bevel=.025)
    V1.box("PassageEastFlashing", (1.82, 2.0, WALL_H + .23),
           (.42, 4.00, .25), mats["timber"], COLLECTION, roof, bevel=.025)
    collar = [(HEARTH_CENTER[0] + (x - HEARTH_CENTER[0]) * 1.075,
               HEARTH_CENTER[1] + (y - HEARTH_CENTER[1]) * 1.075)
              for x, y in HEARTH_POINTS]
    for i, a in enumerate(collar):
        b = collar[(i + 1) % 8]
        V1.beam(f"HearthEaveCollar_{i}", (a[0], a[1], WALL_H + .03),
                (b[0], b[1], WALL_H + .03), .15, .16, mats["timber"],
                COLLECTION, roof, .014)
    count += lean_to_roof(roof, mats)
    # A low stone flue belongs to the hearth room and breaks the octagonal roof.
    flue = B.empty("TeachingHearthFlue", COLLECTION, roof, (6.25, 3.72, 0))
    for row in range(5):
        for col in range(2):
            V1.box("FlueStone", (-.28 + col * .56 + (.07 if row % 2 else 0), 0,
                   4.85 + row * .36), (.52, .68, .32),
                   mats["stone_light" if (row + col) % 3 == 0 else "stone"],
                   COLLECTION, flue, bevel=.04)
    V1.box("FlueCap", (0, 0, 6.75), (1.25, 1.02, .18), mats["iron"], COLLECTION, flue, bevel=.035)
    return count


def occupational_court(root, static, mats):
    def cement_rect(prefix, x0, x1, y0, y1, row_edges, column_edges):
        """Weathered hand-laid cement over a continuous fitted mortar bed.

        The bed deliberately underlaps the wall line, so no terrain-colored
        crescent can appear between the court and the building foundation.
        Each visible slab has a slightly irregular four-corner outline rather
        than the old single tan rectangle.
        """
        V1.box(prefix + "MortarBed", ((x0 + x1) / 2, (y0 + y1) / 2, .17),
               (x1 - x0, y1 - y0, .06), mats["court_mortar"],
               COLLECTION, static, bevel=.025)
        slab_mats = (mats["court_cement"], mats["stone"], mats["stone_light"])
        for row, (ay, by) in enumerate(zip(row_edges[:-1], row_edges[1:])):
            edges = column_edges[row % len(column_edges)]
            for col, (ax, bx) in enumerate(zip(edges[:-1], edges[1:])):
                gap = .035
                wobble = ((row * 7 + col * 5) % 5 - 2) * .007
                points = [
                    (ax + gap, ay + gap + wobble),
                    (bx - gap, ay + gap - wobble * .5),
                    (bx - gap - wobble, by - gap),
                    (ax + gap + wobble * .5, by - gap + wobble),
                ]
                U._prism_xy(B, f"{prefix}CementSlab_{row}_{col}", points,
                            .197 + ((row + col) % 3) * .003, .025,
                            slab_mats[(row * 2 + col) % len(slab_mats)],
                            COLLECTION, static)

    # A continuous dark joint bed touches the lodge base from end to end. Four
    # staggered courses of softly varied cement slabs replace the flat tan pad.
    court_rows = (-5.94, -4.58, -3.18, -1.77, -.40)
    court_columns = (
        (-1.04, .34, 2.04, 3.62, 5.52, 7.40),
        (-1.04, .82, 2.55, 4.18, 5.86, 7.40),
        (-1.04, .25, 1.96, 3.76, 5.30, 7.40),
        (-1.04, .60, 2.35, 4.01, 5.66, 7.40),
    )
    cement_rect("Court", -1.04, 7.40, court_rows[0], court_rows[-1],
                court_rows, court_columns)
    # Close the house/court neck between the main slab, passage wall and hearth
    # shoulder. Deliberate underlaps tuck the cement beneath each adjoining sill
    # so terrain cannot peek through at the corner from any camera direction.
    apron_rows = (-.48, .14, .76)
    apron_columns = (
        (-1.08, .35, 1.88),
        (-1.08, .62, 1.88),
    )
    cement_rect("CourtHouseApron", -1.08, 1.88, apron_rows[0], apron_rows[-1],
                apron_rows, apron_columns)
    # The lean-to is fixed to the lodge by its high wall ledger. Three outer
    # eave posts and one continuous eave beam carry the low edge. The exposed
    # underside rafters have been removed after owner review: from the elevated
    # exterior camera they read as a foreground fence and obscured the court.
    for i, y in enumerate((-5.40, -3.15, -.90)):
        V1.box(f"CourtLoadPost_{i}", (7.25, y, 1.62), (.30, .30, 2.58),
               mats["timber"], COLLECTION, static, bevel=.035)
        V1.cylinder(f"CourtLoadFoot_{i}", (7.25, y, .19), .31, .36, 7,
                    mats["stone"], COLLECTION, static)
    V1.box("CourtContinuousEaveBeam", (7.25, -3.15, 2.91), (.34, 4.86, .30),
           mats["timber"], COLLECTION, static, bevel=.035)
    V1.beam("CourtSouthKneeBrace", (7.23, -5.34, 2.76), (7.23, -4.55, 2.10),
            .13, .14, mats["timber"], COLLECTION, static, .018)
    V1.beam("CourtNorthKneeBrace", (7.23, -.96, 2.76), (7.23, -1.75, 2.10),
            .13, .14, mats["timber"], COLLECTION, static, .018)

    # The pond-door landing uses the same fitted cement language and underlaps
    # the east foundation. It owns no collision and remains wider than the
    # 1.50-tile door for the later L-shaped waterworks.
    shore_rows = (.72, 1.47, 2.23, 2.98)
    shore_columns = ((8.24, 9.12, 10.06), (8.24, 9.26, 10.06))
    cement_rect("PondShore", 8.24, 10.06, shore_rows[0], shore_rows[-1],
                shore_rows, shore_columns)
    V1.box("PondShoreEdgeNorth", (9.15, .77, .23), (1.72, .14, .12),
           mats["stone"], COLLECTION, static, bevel=.025)
    V1.box("PondShoreEdgeSouth", (9.15, 2.93, .23), (1.72, .14, .12),
           mats["stone"], COLLECTION, static, bevel=.025)

    # Integration sockets are stable source-controlled contracts. Claude owns
    # the new standalone U3 prop family; this builder owns only its future
    # placement points. No placeholder geometry or invisible collider ships.
    sockets = (
        ("u3_log_rack_socket", (2.25, -4.70, .20), "incoming authored log rack"),
        ("u3_chopping_block_socket", (.80, -2.25, .20), "incoming chopping block and embedded axe"),
        ("u4_waterworks_shore_socket", (9.92, 1.85, .20), "future L-shaped dock and pulley landing"),
        ("chicken_spawn_socket", (7.50, -4.00, .20), "reserved future poultry lesson; no visible pen"),
    )
    for name, position, purpose in sockets:
        socket = B.empty(name, COLLECTION, root, position)
        socket["purpose"] = purpose
        socket["deferred"] = True


def surface_furnishings(root, static, mats):
    # Runtime installs the approved cellar_traversal_pair_v2 surface assembly.
    # Keep one semantic owner and the real split floor, but do not export a
    # second lid, ladder or rim beneath it.  The old fallback geometry was the
    # source of the stacked-ladder / messy-hatch silhouette in the live room.
    ladder_group = B.empty("cellar_ladder", COLLECTION, root,
                           (CELLAR_LADDER_XY[0], CELLAR_LADDER_XY[1], 0))
    V1.box("CellarVoidOccluder", (0, 0, .175), (1.64, 1.64, .045),
           mats["soot"], COLLECTION, ladder_group, bevel=.035)
    V1.box("CellarVoidCore", (0, 0, .202), (1.43, 1.43, .018),
           mats["dark_hole"], COLLECTION, ladder_group, bevel=.07)

    # The complete upstairs family comes from one dedicated Blender topology
    # owner. Service roots stay direct children for tutorial interactions;
    # domestic/story scenery stays under its own semantic roots for right-click
    # Inspect without turning left-click into a furniture action.
    furnishings = B.empty("authored_furnishings", COLLECTION, root)
    upstairs = U.build_surface_family(B, mats, COLLECTION, root, furnishings)
    fireplace = upstairs["teaching_fireplace"]

    return furnishings, fireplace


def surface_build(mats):
    global COLLECTION
    COLLECTION = bpy.data.collections.new("SurvivalWorkyard_HandAuthoredV2")
    bpy.context.scene.collection.children.link(COLLECTION)
    root = B.empty("holm_survival_workyard_v2", COLLECTION)
    root["buildingDefId"] = "holm_survival_workyard_v1"
    root["assetId"] = "holm_survival_workyard"
    root["revision"] = 14
    root["pipelineVersion"] = 1
    root["assetClass"] = "building"
    root["unitsPerTile"] = 1
    root["shapeClass"] = "compound-hearth-court"
    root["doorOpeningHeight"] = DOOR_OPENING_H
    root["trueWindowOpenings"] = 2
    root["surfaceBuilderRevision"] = 10
    root["doorFrameContact"] = "fitted-jambs-with-clear-exterior-timber-reveals"
    root["wallTimberLayer"] = "exterior-only"
    root["windowFrameCoverage"] = "full-opening-overlap"
    root["hearthWindowWall"] = "northeast-facet"
    root["u3SitePreparation"] = "unobstructed-cement-court-shore-gear-and-dry-approach"
    root["visiblePoultryPen"] = False
    static = B.empty("static_architecture", COLLECTION, root)
    foundation_floor(static, mats)
    mark("surface foundations")
    walls_and_doors(root, static, mats)
    mark("surface walls")
    occupational_court(root, static, mats)
    mark("surface court")
    furnishings, fireplace = surface_furnishings(root, static, mats)
    mark("surface furnishings")
    roof = B.empty("roof", COLLECTION, root)
    tile_count = roofs(roof, mats)
    mark("surface roofs")
    return root, static, roof, furnishings, fireplace, COLLECTION, tile_count


def cellar_build(mats):
    collection = bpy.data.collections.new("SurvivalWorkyard_StormCellarV1")
    bpy.context.scene.collection.children.link(collection)
    root = B.empty("holm_survival_workyard_cellar_v1", collection)
    root["assetId"] = "holm_survival_workyard_cellar"
    root["revision"] = 2
    root["pipelineVersion"] = 1
    root["assetClass"] = "interior"
    root["unitsPerTile"] = 1
    root["plane"] = -1
    static = B.empty("cellar_static", collection, root)
    mark("cellar start")
    surface_wall_height = V1.WALL_H
    V1.WALL_H = 3.25
    # Flagstone floor with a clipped north-east storage alcove.
    V1.box("CellarFloor", (0, 0, -.14), (12.0, 9.0, .28), mats["cellar_floor"], collection, static, bevel=.07)
    for x in (-5.75, 5.75):
        V1.wall_segment("CellarSide", (x, -4.50), (x, 4.50), mats, collection, static)
    V1.wall_segment("CellarNorth", (-5.75, 4.50), (5.75, 4.50), mats, collection, static, True)
    V1.wall_segment("CellarSouthWest", (-5.75, -4.50), (-4.80, -4.50), mats, collection, static)
    V1.wall_segment("CellarSouthEast", (-3.25, -4.50), (5.75, -4.50), mats, collection, static, True)
    # Short wall brackets imply a low timber ceiling while leaving the central
    # gameplay view and walking aisle unobstructed.
    for y in (-3.3, -1.1, 1.1, 3.3):
        V1.beam("CellarWallBracket", (-5.55, y, 3.08), (-4.10, y, 3.08),
                .22, .26, mats["oak_dark"], collection, static, .025)
        V1.beam("CellarWallBracket", (4.10, y, 3.08), (5.55, y, 3.08),
                .22, .26, mats["oak_dark"], collection, static, .025)
        for x in (-5.35, 5.35):
            V1.beam("CellarBeamKnee", (x, y, 2.20), (x * .82, y, 3.05),
                    .18, .18, mats["oak_dark"], collection, static, .020)
    V1.WALL_H = surface_wall_height
    mark("cellar shell")

    furnishings = B.empty("cellar_furnishings", collection, root)
    F.storage_shelf(B, "ReserveShelfA", (-4.95, 1.45, .02), math.pi / 2,
                    "oak", mats, collection, furnishings, width=3.2)
    F.storage_shelf(B, "ReserveShelfB", (2.0, 4.10, .02), math.pi,
                    "willow", mats, collection, furnishings, width=3.4)
    for i, (x, y, scale) in enumerate(((3.65, 3.45, 1), (4.60, 3.58, .88),
                                        (4.25, 2.52, .94), (-3.6, -3.5, .90))):
        F.barrel(B, f"ReserveBarrel_{i}", (x, y, .02), (i - 1.5) * .06,
                 mats, collection, furnishings, scale)
    F.lidded_chest(B, "cellar_reserve_chest", (3.75, -3.50, .02), 0,
                   "mahogany", mats, collection, root)
    # Root-vegetable bins and bundled blankets give the cellar a survival purpose.
    for i, x in enumerate((-1.4, 0, 1.4)):
        V1.box("RootBin", (x, 2.95, .42), (1.12, 1.05, .72), mats["willow"],
               collection, furnishings, bevel=.06)
        for j in range(5):
            V1.cylinder("RootVegetable", (x - .35 + (j % 3) * .32,
                        2.75 + (j // 3) * .30, .88), .11, .32, 7,
                        mats["root_veg"], collection, furnishings,
                        rotation=(math.pi / 2, 0, (j - 2) * .18))
    for i in range(4):
        V1.box("BlanketBundle", (-1.6 + i * .58, -3.65, .30 + (i % 2) * .20),
               (.75, .54, .30), mats["rug_blue" if i % 2 else "rug_red"],
               collection, furnishings, rotation=(0, 0, (i - 1.5) * .06), bevel=.08)
    F.patterned_rug(B, "CellarAisleRug", (0, -.55, .02), 0, mats, collection,
                    furnishings, width=4.6, depth=1.45, palette="blue")

    ladder = B.empty("cellar_exit_ladder", collection, root, (-4.05, -3.72, 0))
    F.ladder(B, "CellarExitLadderMesh", (0, 0, .02), 0, "oak", mats,
             collection, ladder, height=3.15, width=.92, lean=.25)
    V1.box("ExitThreshold", (0, .42, .08), (1.55, .80, .16), mats["stone_light"],
           collection, ladder, bevel=.05)

    # Two ceiling-hung oil lanterns illuminate the central aisle. The ironwork,
    # amber panes and oil bowl are static; only the nested flame socket moves at
    # runtime, so the fixture no longer stretches and wobbles with the fire.
    for i, x in enumerate(CELLAR_LANTERN_XS):
        cellar_lantern(i, x, .15, mats, collection, furnishings)
    mark("cellar furnishings")
    return root, static, furnishings, collection


def cellar_lantern(index, x, y, mats, collection, parent):
    fixture = B.empty(f"cellar_lantern_{index}", collection, parent, (x, y, 0))

    # Ceiling chain and polygonal carrying handle establish a readable hanging
    # silhouette at the elevated gameplay camera.
    for link, z in enumerate((3.16, 3.02, 2.88)):
        rot = (0, math.pi / 2, 0) if link % 2 else (math.pi / 2, 0, 0)
        V1.cylinder("CellarLanternChain", (0, 0, z), .045, .16, 7, mats["iron"],
                    collection, fixture, rotation=rot)
    handle_points = ((-.31, 0, 2.56), (-.27, 0, 2.79), (-.12, 0, 2.94),
                     (.12, 0, 2.94), (.27, 0, 2.79), (.31, 0, 2.56))
    for a, b in zip(handle_points, handle_points[1:]):
        V1.beam("CellarLanternHandle", a, b, .055, .055, mats["iron"],
                collection, fixture, .008)

    # Vented cap, cage rings, four corner posts, inset amber panes and oil bowl.
    V1.cylinder("CellarLanternVent", (0, 0, 2.68), .15, .16, 8, mats["iron_light"],
                collection, fixture)
    cone("CellarLanternCap", (0, 0, 2.56), .34, .19, .18, 8, mats["iron"],
         collection, fixture)
    for z in (1.66, 2.45):
        V1.cylinder("CellarLanternCageRing", (0, 0, z), .34, .09, 8, mats["brass"],
                    collection, fixture)
    for px in (-.27, .27):
        for py in (-.19, .19):
            V1.beam("CellarLanternCagePost", (px, py, 1.69), (px, py, 2.42),
                    .045, .045, mats["iron"], collection, fixture, .006)
    for py in (-.185, .185):
        V1.box("CellarLanternGlassPane", (0, py, 2.055), (.49, .025, .66),
               mats["lantern_glass"], collection, fixture, bevel=.008)
    for px in (-.255, .255):
        V1.box("CellarLanternGlassPane", (px, 0, 2.055), (.025, .34, .66),
               mats["lantern_glass"], collection, fixture, bevel=.008)
    cone("CellarLanternOilBowl", (0, 0, 1.55), .21, .32, .20, 8, mats["brass"],
         collection, fixture)
    V1.cylinder("CellarLanternFoot", (0, 0, 1.42), .16, .09, 8, mats["iron"],
                collection, fixture)

    # Three separately colored tongues give the fire a jagged OSRS-like crown.
    # Keeping them below one semantic empty lets the browser animate the flame
    # without deforming the carefully modeled lantern cage.
    flame = B.empty(f"cellar_lantern_flame_{index}", collection, fixture, (0, 0, 1.69))
    cone("CellarLanternFlameEmber", (-.055, 0, .24), .16, .018, .48, 6,
         mats["flame_red"], collection, flame, rotation=(0, -.13, 0))
    cone("CellarLanternFlameGold", (.045, -.008, .28), .12, .012, .56, 6,
         mats["flame_gold"], collection, flame, rotation=(0, .11, 0))
    cone("CellarLanternFlameCore", (0, -.018, .20), .072, .006, .40, 5,
         mats["flame_yellow"], collection, flame, rotation=(0, -.06, 0))
    return fixture


def descendants(root):
    return [root, *root.children_recursive]


def consolidate(container, prefix, preserve=()):
    protected = {obj for obj in descendants(container) if obj.name in preserve}
    groups = {}
    for obj in list(container.children_recursive):
        if obj.type != "MESH" or not obj.data.materials:
            continue
        ancestor = obj.parent
        skip = False
        while ancestor and ancestor is not container:
            if ancestor in protected:
                skip = True
                break
            ancestor = ancestor.parent
        if skip:
            continue
        groups.setdefault(obj.data.materials[0].name, []).append(obj)
    for material_name, objects in groups.items():
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
        active.name = prefix + "_" + material_name.replace("CR ", "").replace(" ", "_")


def metrics(root):
    meshes = [obj for obj in descendants(root) if obj.type == "MESH"]
    return {
        "triangles": sum(max(0, len(poly.vertices) - 2) for obj in meshes for poly in obj.data.polygons),
        "meshObjects": len(meshes),
        "materials": len({mat.name for obj in meshes for mat in obj.data.materials if mat}),
    }


def authoring_report(surface, tile_count):
    surface_objects = descendants(surface)
    surface_names = {obj.name for obj in surface_objects}
    glass_alphas = [mat.diffuse_color[3] for obj in surface_objects if obj.type == "MESH"
                    for mat in obj.data.materials if mat and "Glass" in mat.name]
    court_bed = next((obj for obj in surface_objects if obj.name == "CourtMortarBed"), None)
    hearth_wedges = [obj for obj in surface_objects if obj.name.startswith("HearthFloorWedge_")]
    required_surface = ("roof", "trail_door", "pond_door", "tool_bench",
                        "firemaking_board", "storm_tally_beam", "net_rack",
                        "cellar_ladder", "chicken_spawn_socket", "teaching_fireplace", "hearth_flame")
    checks = {
        "compoundShapeAuthored": any(name.startswith("LodgeFoundation_") for name in surface_names) and
                                  all(name in surface_names for name in
                                      ("PassageFoundation", "HearthFoundation", "CourtMortarBed")),
        "distinctRoofHierarchyAuthored": all(any(name.startswith(prefix) for name in surface_names)
                                             for prefix in ("LodgeRoof", "PassageRoof", "HearthRoof", "CourtRoof")),
        "purposefulSurfaceFurnishingsAuthored": all(name in surface_names for name in
                                                    ("workyard_crockery_hutch", "workyard_mug_shelf",
                                                     "workyard_empty_bucket", "workyard_tool_stool",
                                                     "workyard_lodge_rug", "workyard_hearth_rug",
                                                     "workyard_lesson_table", "workyard_storm_warden_relief",
                                                     "u3_log_rack_socket", "u3_chopping_block_socket")),
        "animatedFlameSocketAuthored": "hearth_flame" in surface_names,
        "chickenSocketDeferred": "chicken_spawn_socket" in surface_names and
                                   "chicken_pen" not in surface_names and
                                   surface.get("visiblePoultryPen") is False,
        "unobstructedCourtStructureAuthored": all(name in surface_names for name in
                                          ("CourtLoadPost_0", "CourtLoadPost_1", "CourtLoadPost_2",
                                           "CourtContinuousEaveBeam", "CourtSouthKneeBrace",
                                           "CourtNorthKneeBrace")) and
                                      not any(name == "CourtBrace" or name.startswith("CourtRoofRafter_")
                                              for name in surface_names),
        "fittedCementCourtAuthored": "CourtMortarBed" in surface_names and
                                        len([name for name in surface_names
                                             if name.startswith("CourtCementSlab_")]) >= 20 and
                                        all(name in surface_names for name in
                                            ("CourtHouseApronMortarBed", "CourtHouseApronCementSlab_0_0",
                                             "PondShoreMortarBed", "PondShoreCementSlab_0_0")),
        "shoreGearClusterAuthored": all(name in surface_names for name in
                                            ("ShoreBuoyCrate", "RedCorkBuoy", "BlueCorkBuoy",
                                             "OchreCorkBuoy", "NetFrameTopRail",
                                             "TeachingNetCord", "CoiledHempRope")),
        "u3IntegrationSocketsAuthored": all(name in surface_names for name in
                                               ("u3_log_rack_socket", "u3_chopping_block_socket")) and
                                         not any(name in surface_names for name in
                                                 ("SawnLogRack", "ChoppingBlock", "BlockAxeHead")),
        "clearShoreApproachAuthored": all(name in surface_names for name in
                                             ("PondShoreMortarBed", "PondShoreEdgeNorth",
                                              "PondShoreEdgeSouth", "u4_waterworks_shore_socket")),
        "surfaceSemanticNodesPreserved": all(name in surface_names for name in required_surface),
        "layeredRoofDetailAuthored": tile_count >= 260,
        "roofContactJoineryAuthored": all(name in surface_names for name in
                                             ("PassageWestFlashing", "PassageEastFlashing",
                                              "CourtWallLedger", "HearthEaveCollar_0")),
        "fittedDoorLeavesAuthored": all(any(name.startswith(door + "_Plank_6") for name in surface_names)
                                         for door in ("trail_door", "pond_door")),
        "doorFrameContactClearanceAuthored": surface.get("doorFrameContact") ==
                                                 "fitted-jambs-with-clear-exterior-timber-reveals" and
                                             .38 <= DOOR_FRAME_DETAIL_CLEARANCE <= .48,
        "playerScaledDoorHierarchyAuthored": 1.28 <= DOOR_OPENING_H / PLAYER_VISUAL_H <= 1.45 and
                                                1.35 <= TRAIL_DOOR_WIDTH <= 1.70 and
                                                1.50 <= POND_DOOR_WIDTH <= 1.65 and
                                                all(name in surface_names for name in
                                                    ("TrailDoorFrame_Lintel", "PondDoorFrame_Lintel",
                                                     "TrailDoorFrame_OverdoorPlaster",
                                                     "PondDoorFrame_OverdoorPlaster")),
        "trueWindowOpeningsAuthored": all(name in surface_names for name in
                                            ("LodgeWestSouth", "LodgeWestNorth", "WestStormWindowBay",
                                             "HearthWall_1", "HearthWindowWallSouth",
                                             "HearthWindowWallNorth", "NortheastHearthWindowBay")),
        "windowAndWallLayerCorrectionsAuthored": all(name in surface_names for name in
                                             ("WestStormWindow_Pane_0_0",
                                              "NortheastHearthWindow_Pane_1_2",
                                              "NortheastHearthWindow_Diamond")) and
                                             surface.get("wallTimberLayer") == "exterior-only",
        "furnishingContactCorrectionsAuthored": all(name in surface_names for name in
                                             ("MugShelfPegStop", "HutchFittedDoor_0",
                                              "HutchFittedDoor_1", "HutchPlateRack",
                                              "BenchHandSawBlade", "BenchFrontApron")),
        "hearthCavityInsetAuthored": all(name in surface_names for name in
                                             ("HearthDeepSootCavity", "HearthSootFloor")) and
                                             surface.get("hearthWindowWall") == "northeast-facet",
        "translucentWindowPanesAuthored": len(glass_alphas) >= 4 and max(glass_alphas) < .8,
        "surfaceFloorsClearTerrain": court_bed is not None and court_bed.location.z >= .16 and
                                      len(hearth_wedges) == 8 and all(
                                          min(v.co.z for v in obj.data.vertices) >= .18 for obj in hearth_wedges),
        "singleTraversalSocketAuthored": "cellar_ladder" in surface_names and
                                           not any(any(name.startswith(prefix) for prefix in
                                                       ("CellarOpeningBottom", "CellarShaftWall", "CellarRim",
                                                        "CellarShaftRail", "CellarShaftRung", "CellarHatchLid",
                                                        "CellarLidBand")) for name in surface_names),
        "terrainProofCellarVoidAuthored": all(name in surface_names for name in
                                                ("CellarVoidOccluder", "CellarVoidCore")),
    }
    result = {"surface": "holm_survival_workyard_v2", "surfaceOnly": True,
              "cellarDependency": "assets/models/buildings/holm_survival_workyard_cellar_v2.glb",
              "pipelineVersion": 1, "builderRevision": 10, "unitsPerTile": 1,
              "shapeClass": "compound-hearth-court", "roofElements": tile_count,
              "checks": checks, "surfaceMetrics": metrics(surface)}
    REPORT.write_text(json.dumps(result, indent=2), encoding="utf-8")
    if not all(checks.values()):
        raise RuntimeError("Workyard v2 authoring checks failed: " +
                           ", ".join(name for name, ok in checks.items() if not ok))
    return result


def refresh_report_metrics(surface):
    result = json.loads(REPORT.read_text(encoding="utf-8"))
    result["surfaceMetrics"] = metrics(surface)
    result["consolidatedForBrowser"] = True
    REPORT.write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def setup_preview(mats):
    scene = bpy.context.scene
    # Blender 4.x exposes Eevee Next under BLENDER_EEVEE_NEXT; the 5.1 build
    # installed beside it reports the same renderer as BLENDER_EEVEE. Keep the
    # headless factory deterministic across both installations.
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1500
    scene.render.resolution_y = 1100
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.color = (.04, .055, .045)
    ground = V1.cylinder("PreviewGround_NotExported", (0, -.15, -.32), 14.5, .30, 48,
                         mats["path"], bpy.context.scene.collection, None)
    bpy.ops.object.camera_add(location=(22, -25, 20))
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 25.5
    look_at(camera, (.4, -.2, 2.1))
    scene.camera = camera
    bpy.ops.object.light_add(type="SUN", location=(8, -10, 18))
    sun = bpy.context.object
    sun.rotation_euler = (math.radians(28), math.radians(-18), math.radians(-32))
    sun.data.energy = 2.35
    sun.data.color = (1.0, .78, .53)
    bpy.ops.object.light_add(type="AREA", location=(-10, -4, 14))
    fill = bpy.context.object
    fill.data.energy = 1100
    fill.data.shape = "DISK"
    fill.data.size = 12
    fill.data.color = (.62, .76, 1.0)
    look_at(fill, (0, 0, 1.7))
    return camera, ground


def hide_collection(collection, hidden):
    for obj in collection.objects:
        obj.hide_render = hidden


def export_root(root, filepath):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in descendants(root):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(filepath), export_format="GLB", use_selection=True,
                              export_apply=True, export_yup=True, export_materials="EXPORT",
                              export_extras=True, export_cameras=False, export_lights=False)


def render_export(surface, roof, surface_collection, mats):
    scene = bpy.context.scene
    camera, ground = setup_preview(mats)
    scene.render.filepath = str(PREVIEW / "survival_workyard_v2_exterior.png")
    bpy.ops.render.render(write_still=True)
    B.set_render_hidden(roof, True)
    scene.render.filepath = str(PREVIEW / "survival_workyard_v2_roof_off.png")
    bpy.ops.render.render(write_still=True)
    B.set_render_hidden(roof, False)
    camera.location = (1, -2, 29)
    camera.data.ortho_scale = 25.5
    look_at(camera, (.5, 0, 0))
    scene.render.filepath = str(PREVIEW / "survival_workyard_v2_plan.png")
    bpy.ops.render.render(write_still=True)

    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    export_root(surface, MODEL)


def main():
    B.clean_scene()
    mark("clean")
    mats = materials()
    mark("materials")
    surface, static, roof, furnishings, fireplace, surface_collection, tile_count = surface_build(mats)
    mark("surface complete")
    authoring_report(surface, tile_count)
    mark("pre report")

    # Browser draw calls stay bounded, while named animation/click sockets retain
    # their own hierarchy for runtime behavior.
    consolidate(static, "Static")
    mark("static consolidated")
    consolidate(roof, "Roof")
    mark("roof consolidated")
    # Preserve every scenery owner for exact right-click inspection. Joining is
    # performed within each item by material, so the browser receives bounded
    # draw calls without erasing the semantic root that owns the raycast.
    for item in list(furnishings.children):
        consolidate(item, "Furnishing_" + item.name)
    mark("furnishings consolidated")
    for name in ("trail_door", "pond_door", "tool_bench", "firemaking_board",
                 "storm_tally_beam", "net_rack", "cellar_ladder"):
        target = next(obj for obj in surface.children if obj.name == name)
        consolidate(target, name)
    consolidate(fireplace, "TeachingFireplace", ("hearth_flame",))
    flame = next(obj for obj in descendants(fireplace) if obj.name == "hearth_flame")
    consolidate(flame, "HearthFlame")
    mark("surface semantics consolidated")
    # Preserve the structural checks captured before consolidation; mesh names
    # are intentionally joined away after that point, while semantic nodes stay.
    refresh_report_metrics(surface)
    mark("post report")
    render_export(surface, roof, surface_collection, mats)
    print("SURVIVAL_WORKYARD_V2_READY", MODEL)


if __name__ == "__main__":
    main()
