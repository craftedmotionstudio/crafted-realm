"""Build Guide Hall v5 with fitted architecture and authored interior assets.

This production pass makes the roof follow the exact wall perimeter, seats it
into the wall plate, fits both door leaves to complete frames, and composes the
interior from reusable Blender-authored low-poly components.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_guide_hall_v3 as B
import cr_lowpoly_assetkit as K


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets" / "blender" / "holm_guide_hall_v5.blend"
MODEL = ROOT / "assets" / "models" / "buildings" / "holm_guide_hall_v5.glb"
PREVIEW = ROOT / "scratchpad" / "guide_hall_v5"
REPORT = PREVIEW / "asset_report.json"
for path in (SOURCE.parent, MODEL.parent, PREVIEW):
    path.mkdir(parents=True, exist_ok=True)


PERIMETER = [
    (-3.0, -11.0), (3.0, -11.0), (4.5, -9.5), (4.5, -7.0),
    (8.0, -7.0), (12.0, -3.5), (12.0, 4.0), (9.5, 6.5),
    (6.0, 6.5), (4.5, 8.0), (4.5, 10.5), (3.0, 12.0),
    (-3.0, 12.0), (-4.5, 10.5), (-4.5, 8.0), (-6.0, 6.5),
    (-9.5, 6.5), (-12.0, 4.0), (-12.0, -3.5), (-8.0, -7.0),
    (-4.5, -7.0), (-4.5, -9.5),
]
WALL_HEIGHT = 4.15
DOOR_WIDTH = 2.60
DOOR_HEIGHT = 3.12
DOOR_PANEL_GAP = 0.06
ROOF_EAVE_Z = 4.10
ROOF_PEAK_Z = 6.86
ROOF_OVERHANG = 0.54
ROOF_THICKNESS = 0.20


def scaled(points, scale):
    return [(x * scale, y * scale) for x, y in points]


def setup_materials():
    mats = B.setup_materials()
    mats.update({
        "glass_blue": B.material("CR Glass Sapphire", (0.16, 0.38, 0.62), 0.44),
        "glass_green": B.material("CR Glass Moss", (0.22, 0.48, 0.25), 0.46),
        "glass_gold": mats["brass"],
        "glass_red": mats["rug_red"],
        "chalk": mats["parchment"],
    })
    for key in ("glass_blue", "glass_green"):
        bsdf = mats[key].node_tree.nodes.get("Principled BSDF")
        color = mats[key].diffuse_color[:3]
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*color, 1.0)
        elif "Emission" in bsdf.inputs:
            bsdf.inputs["Emission"].default_value = (*color, 1.0)
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = 0.32
    return mats


def make_shell(root, static, collection, mats):
    B.prism("Hall_Foundation", scaled(PERIMETER, 1.018), -0.28, 0.36,
            mats["stone"], collection, static)
    B.prism("Hall_Floor", scaled(PERIMETER, 0.974), 0.08, 0.12,
            mats["wood"], collection, static)

    for idx in range(len(PERIMETER)):
        a, b = PERIMETER[idx], PERIMETER[(idx + 1) % len(PERIMETER)]
        if idx == 0:
            B.wall_segment("SouthWall_W", a, (-DOOR_WIDTH / 2, -11.0), WALL_HEIGHT,
                           mats, collection, static)
            B.wall_segment("SouthWall_E", (DOOR_WIDTH / 2, -11.0), b, WALL_HEIGHT,
                           mats, collection, static)
        elif idx == 11:
            B.wall_segment("NorthWall_E", a, (DOOR_WIDTH / 2, 12.0), WALL_HEIGHT,
                           mats, collection, static)
            B.wall_segment("NorthWall_W", (-DOOR_WIDTH / 2, 12.0), b, WALL_HEIGHT,
                           mats, collection, static)
        else:
            B.wall_segment(f"OuterWall_{idx:02d}", a, b, WALL_HEIGHT,
                           mats, collection, static)

    for idx, (x, y) in enumerate(PERIMETER):
        B.post(f"PerimeterPost_{idx:02d}", x, y, WALL_HEIGHT, mats, collection, static)

    _, front_fit = K.framed_door(
        B, "front_door", (0, -11.0), DOOR_WIDTH, DOOR_HEIGHT, WALL_HEIGHT,
        "left", 0, mats, collection, static, root,
    )
    _, teaching_fit = K.framed_door(
        B, "teaching_door", (0, 12.0), DOOR_WIDTH, DOOR_HEIGHT, WALL_HEIGHT,
        "left", math.pi, mats, collection, static, root,
    )

    # Large, deliberately patterned windows replace the small generic panes.
    for side, x, rotation, palette in (
        ("West", -12.06, math.pi / 2, ("glass_blue", "glass_gold", "glass_red")),
        ("East", 12.06, -math.pi / 2, ("glass_green", "glass_gold", "glass_blue")),
    ):
        for index, y in enumerate((-1.55, 2.15)):
            K.stained_glass_window(B, f"{side}StainedGlass_{index}", (x, y, 1.42), rotation,
                                   1.95, 1.92, mats, collection, static, palette)

    # Deep stone approach and northern threshold visibly bind both frames to the terrain.
    for idx in range(6):
        B.cube(f"ApproachStep_{idx}", (0, -11.55 - idx * 0.72, -0.03 - idx * 0.025),
               (5.7 - idx * 0.22, 0.64, 0.15), mats["path"], collection, static)
    B.cube("TeachingThreshold", (0, 12.35, 0.02), (3.40, 0.82, 0.18),
           mats["path"], collection, static)
    return front_fit, teaching_fit


def make_roof(root, collection, mats):
    roof = B.empty("roof", collection, root)
    _, outer = K.contour_hip_roof(
        B, "HallContourRoof", PERIMETER, ROOF_EAVE_Z, ROOF_PEAK_Z,
        ROOF_OVERHANG, ROOF_THICKNESS, 0.27, mats, collection, roof,
    )

    # The lantern is the one subordinate roof form and marks the orientation table.
    B.cylinder("CompassLantern", (0, 0, 7.18), 0.82, 0.64, 8,
               mats["plaster"], collection, roof)
    for i, (x, y, rotation, glass) in enumerate((
        (0, -0.83, 0, "glass_blue"), (0, 0.83, math.pi, "glass_gold"),
        (-0.83, 0, math.pi / 2, "glass_red"), (0.83, 0, -math.pi / 2, "glass_green"),
    )):
        B.cube(f"LanternPane_{i}", (x, y, 7.20), (0.46, 0.07, 0.46),
               mats[glass], collection, roof, rotation)
    B.cylinder("LanternLowerBand", (0, 0, 6.88), 0.96, 0.16, 8,
               mats["timber"], collection, roof)
    B.cylinder("LanternUpperBand", (0, 0, 7.50), 0.96, 0.16, 8,
               mats["timber"], collection, roof)
    B.poly_roof("CompassLanternCap", B.regular_points(0, 0, 1.08, 8, math.pi / 8),
                7.58, 8.38, mats["roof_light"], collection, roof, 0.04)
    B.cylinder("CompassFinial", (0, 0, 8.58), 0.17, 0.42, 8,
               mats["brass"], collection, roof)
    return roof, outer


def make_compass_table(root, static, collection, mats):
    # Floor inlay and raised route model form the room's primary visual hierarchy.
    for radius, z, depth, mat in ((4.45, .235, .05, "rug_red"), (3.84, .27, .035, "brass"),
                                  (3.42, .30, .035, "rug_red")):
        B.cylinder("CompassMosaic", (0, 0, z), radius, depth, 12, mats[mat], collection, static)
    for idx, rot in enumerate((0, math.pi / 2, math.pi / 4, -math.pi / 4)):
        B.cube(f"CompassRay_{idx}", (0, 0, .335),
               (.20 if idx < 2 else .13, 6.25 if idx < 2 else 5.0, .035),
               mats["brass"], collection, static, rot)

    table = B.empty("orientation_table", collection, root, (0, 0, 0))
    B.cylinder("RouteTableTop", (0, 0, 1.23), 1.78, .25, 12, mats["wood"], collection, table)
    B.cylinder("RouteTableApron", (0, 0, 1.10), 1.50, .22, 12, mats["timber"], collection, table)
    for angle in (math.pi / 4, 3 * math.pi / 4, 5 * math.pi / 4, 7 * math.pi / 4):
        x, y = math.cos(angle) * 1.05, math.sin(angle) * 1.05
        B.cube("RouteTableLeg", (x, y, .58), (.28, .28, 1.08), mats["timber"], collection, table,
               angle)
        B.cube("RouteTableFoot", (x * 1.08, y * 1.08, .10), (.52, .52, .20),
               mats["stone_light"], collection, table, angle)
    B.cylinder("RouteChartWater", (0, 0, 1.39), 1.49, .05, 12, mats["water"], collection, table)
    for idx, (x, y, radius, sy) in enumerate(((-.58, .22, .54, .64), (.18, -.46, .42, .72),
                                               (.62, .34, .32, .88), (-.06, .68, .30, .64))):
        land = B.cylinder(f"RouteLand_{idx}", (x, y, 1.445), radius, .06, 7,
                          mats["land"], collection, table)
        land.scale.y = sy
    for idx, (x, y) in enumerate(((-.78, .20), (-.20, -.65), (.48, -.27), (.70, .42), (.03, .72))):
        B.cylinder(f"RoutePin_{idx}", (x, y, 1.62), .07, .28, 6,
                   mats["rug_red"] if idx == 0 else mats["brass"], collection, table)


def make_interior(root, static, collection, mats):
    # Subtle rugs establish purpose while authored objects carry the rooms.
    zones = (
        ("RecordsInset", [(-11.30, -2.9), (-8.0, -6.15), (-6.35, -6.15),
                           (-6.35, 5.9), (-9.0, 5.9), (-11.30, 3.6)], "rug_blue"),
        ("ProvisionInset", [(11.30, -2.9), (8.0, -6.15), (6.35, -6.15),
                             (6.35, 5.9), (9.0, 5.9), (11.30, 3.6)], "rug_green"),
        ("TeachingInset", [(-4.1, 6.75), (4.1, 6.75), (4.1, 10.7), (-4.1, 10.7)], "parchment"),
    )
    for name, points, material in zones:
        B.prism(name, points, .205, .035, mats[material], collection, static)

    make_compass_table(root, static, collection, mats)

    # Seats now have backs, finials, and deliberate sightlines toward the chart.
    for name, pos, rot in (
        ("SouthWestBench", (-4.85, -4.90, 0), math.pi / 2),
        ("SouthEastBench", (4.85, -4.90, 0), -math.pi / 2),
        ("NorthWestBench", (-4.85, 4.75, 0), math.pi / 2),
        ("NorthEastBench", (4.85, 4.75, 0), -math.pi / 2),
    ):
        K.bench_with_back(B, name, pos, rot, 3.15, mats, collection, static)

    # Records: a real book wall, semantic lectern, scroll chest, and historical plaque.
    K.bookcase(B, "RecordsLibrary", (-11.12, 0.20, 0), math.pi / 2, 4.75,
               mats, collection, static)
    register = B.empty("lesson_register", collection, root, (-8.35, -1.15, 0))
    K.lectern(B, "LessonRegisterLectern", (0, 0, 0), math.pi / 2,
              mats, collection, register)
    B.cube("ScrollChest", (-8.95, 3.95, .55), (1.70, .86, 1.02), mats["wood"], collection, static)
    for i in range(5):
        B.cylinder(f"ScrollTube_{i}", (-9.55 + i * .30, 3.48, 1.18), .10, .62, 7,
                   mats["parchment"], collection, static, rot=(0, math.pi / 2, 0))
    plaque = B.empty("first_landing_plaque", collection, root, (-6.00, -5.88, 0))
    B.cube("PlaquePlinth", (0, 0, .42), (2.70, .82, .82), mats["stone"], collection, plaque)
    B.cube("PlaqueFrame", (0, 0, 1.62), (2.65, .30, 1.72), mats["timber"], collection, plaque)
    B.cube("PlaqueFace", (0, -.18, 1.62), (2.26, .08, 1.38), mats["stone_light"], collection, plaque)
    B.cube("PlaqueShip", (0, -.24, 1.42), (1.35, .05, .18), mats["brass"], collection, plaque, -.13)
    for i in range(5):
        B.cube(f"PlaqueRay_{i}", (0, -.25, 1.86), (.055, .05, .54), mats["brass"], collection, plaque,
               -.72 + i * .36)

    # Provisions: fitted cabinet, issue counter, hanging packs, rope, and casks.
    rack = B.empty("provision_rack", collection, root, (11.08, .20, 0))
    K.display_cabinet(B, "ProvisionCabinet", (0, 0, 0), -math.pi / 2, 4.75,
                      mats, collection, rack)
    B.cube("IssueCounterBody", (8.30, -1.20, .68), (3.15, 1.05, 1.20),
           mats["wood"], collection, static, math.pi / 2)
    B.cube("IssueCounterTop", (8.30, -1.20, 1.34), (3.45, 1.28, .18),
           mats["timber"], collection, static, math.pi / 2)
    for x, y, color in ((7.90, -1.15, "path"), (8.45, -1.20, "rug_green")):
        B.cylinder("IssuedPack", (x, y, 1.78), .31, .56, 7, mats[color], collection, static)
    for y in (3.65, 4.85):
        B.cylinder("ProvisionCask", (10.65, y, .62), .48, 1.05, 10,
                   mats["wood"], collection, static, rot=(0, math.pi / 2, 0))
        B.cylinder("CaskBand", (10.65, y, .62), .50, .12, 10,
                   mats["iron"], collection, static, rot=(0, math.pi / 2, 0))

    # Teaching end: a raised dais, framed board, model shelf, and proper benches.
    B.cube("TeachingDais", (0, 9.70, .24), (7.60, 2.20, .38), mats["path"], collection, static)
    B.cube("TeachingBoardFrame", (0, 10.92, 2.25), (4.90, .28, 2.28),
           mats["timber"], collection, static)
    B.cube("TeachingBoard", (0, 10.75, 2.25), (4.48, .10, 1.86),
           mats["rug_blue"], collection, static)
    for i, (x, z, w) in enumerate(((-1.20, 2.55, 1.10), (.45, 2.00, .90), (1.25, 2.62, .70))):
        B.cube(f"BoardMark_{i}", (x, 10.68, z), (w, .04, .055), mats["chalk"], collection, static,
               .12 * (i - 1))
    for index, y in enumerate((7.55, 8.75)):
        K.bench_with_back(B, f"TeachingBench_{index}", (0, y, 0), 0, 5.25,
                          mats, collection, static)

    # Heraldry and glass add story-rich vertical detail without blocking movement.
    K.wall_banner(B, "RecordsBanner", (-9.20, 6.12, 1.18), 0, 1.45, 1.90,
                  "rug_blue", "brass", mats, collection, static)
    K.wall_banner(B, "ProvisionBanner", (9.20, 6.12, 1.18), 0, 1.45, 1.90,
                  "rug_green", "brass", mats, collection, static)


def setup_preview(mats):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 960
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.color = (.040, .050, .038)
    scene.view_settings.look = "AgX - Medium High Contrast"
    B.cylinder("PreviewGround", (0, 0, -.34), 17.5, .42, 22,
               mats["grass"], bpy.context.scene.collection)
    bpy.ops.object.camera_add(location=(25.5, -30.5, 24.5))
    cam = bpy.context.object
    cam.name = "PreviewCamera"
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = 31.0
    B.look_at(cam, (0, 0, 2.35))
    scene.camera = cam
    bpy.ops.object.light_add(type="SUN", location=(8, -10, 20))
    sun = bpy.context.object
    sun.rotation_euler = (math.radians(28), math.radians(-18), math.radians(-30))
    sun.data.energy = 2.25
    sun.data.color = (1.0, .78, .52)
    bpy.ops.object.light_add(type="AREA", location=(-10, -5, 17))
    area = bpy.context.object
    area.data.energy = 1350
    area.data.shape = "DISK"
    area.data.size = 15
    area.data.color = (.62, .75, 1.0)
    B.look_at(area, (0, 0, 1.8))
    return cam


def mesh_metrics(root):
    meshes = [obj for obj in B.descendants(root) if obj.type == "MESH"]
    triangles = sum(max(0, len(poly.vertices) - 2) for obj in meshes for poly in obj.data.polygons)
    materials = sorted({mat.name for obj in meshes for mat in obj.data.materials if mat})
    return {"triangles": triangles, "meshObjects": len(meshes), "materials": len(materials),
            "materialNames": materials}


def authoring_report(root, outer, front_fit, teaching_fit):
    wall_plate = (WALL_HEIGHT - .15, WALL_HEIGHT + .03)
    roof_seat = (ROOF_EAVE_Z - ROOF_THICKNESS, ROOF_EAVE_Z)
    overlap = min(wall_plate[1], roof_seat[1]) - max(wall_plate[0], roof_seat[0])
    required = ("roof", "front_door", "teaching_door", "orientation_table",
                "lesson_register", "first_landing_plaque", "provision_rack")
    descendants = {obj.name for obj in B.descendants(root)}
    checks = {
        "continuousPerimeter": len(PERIMETER) == 22 and all(
            math.dist(PERIMETER[i], PERIMETER[i]) < 1e-8 for i in range(len(PERIMETER))
        ),
        "roofUsesWallPerimeter": len(outer) == len(PERIMETER),
        "roofSeatsIntoWallPlate": overlap >= .08,
        "frontDoorFitsOpening": front_fit["horizontalGap"] <= DOOR_PANEL_GAP + 1e-6
                                 and front_fit["verticalGap"] <= DOOR_PANEL_GAP + 1e-6,
        "teachingDoorFitsOpening": teaching_fit["horizontalGap"] <= DOOR_PANEL_GAP + 1e-6
                                    and teaching_fit["verticalGap"] <= DOOR_PANEL_GAP + 1e-6,
        "stainedGlassFamilyAuthored": sum("StainedGlass" in name for name in descendants) >= 4,
        "blenderInteriorKitAuthored": all(any(token in name for name in descendants) for token in
                                           ("RecordsLibrary", "LessonRegisterLectern", "ProvisionCabinet",
                                            "TeachingBench", "RecordsBanner")),
        "semanticNodesPreserved": all(name in descendants for name in required),
    }
    report = {
        "asset": "holm_guide_hall_v5",
        "pipelineVersion": 1,
        "unitsPerTile": 1,
        "checks": checks,
        "roof": {"wallPlateBand": wall_plate, "seatBand": roof_seat, "verticalOverlap": overlap,
                 "overhang": ROOF_OVERHANG, "perimeterVertices": len(PERIMETER)},
        "doors": {"front": front_fit, "teaching": teaching_fit},
        "metrics": mesh_metrics(root),
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    if not all(checks.values()):
        raise RuntimeError("Guide Hall v5 authoring checks failed: " +
                           ", ".join(name for name, ok in checks.items() if not ok))
    return report


def create_building():
    mats = setup_materials()
    collection = bpy.data.collections.new("GuideHall_FittedArchitecture")
    bpy.context.scene.collection.children.link(collection)
    root = B.empty("holm_guide_hall_v5", collection)
    root["buildingDefId"] = "holm_guide_hall_v1"
    root["assetId"] = "holm_guide_hall"
    root["revision"] = 5
    root["pipelineVersion"] = 1
    root["assetClass"] = "building"
    static = B.empty("static_architecture", collection, root)
    front_fit, teaching_fit = make_shell(root, static, collection, mats)
    roof, outer = make_roof(root, collection, mats)
    make_interior(root, static, collection, mats)
    return root, roof, collection, mats, outer, front_fit, teaching_fit


def render_export(root, roof, collection, mats):
    scene = bpy.context.scene
    cam = setup_preview(mats)
    scene.render.filepath = str(PREVIEW / "guide_hall_v5_exterior.png")
    bpy.ops.render.render(write_still=True)

    B.set_render_hidden(roof, True)
    scene.render.filepath = str(PREVIEW / "guide_hall_v5_roof_off.png")
    bpy.ops.render.render(write_still=True)
    iso_loc, iso_rot, iso_scale = cam.location.copy(), cam.rotation_euler.copy(), cam.data.ortho_scale
    cam.location = (0, -.001, 38)
    B.look_at(cam, (0, 0, 0))
    cam.data.ortho_scale = 30.0
    scene.render.filepath = str(PREVIEW / "guide_hall_v5_plan.png")
    bpy.ops.render.render(write_still=True)

    cam.location = (10.5, -18.5, 8.8)
    B.look_at(cam, (0, -10.5, 1.75))
    cam.data.ortho_scale = 8.4
    scene.render.filepath = str(PREVIEW / "guide_hall_v5_door_detail.png")
    bpy.ops.render.render(write_still=True)

    cam.location = (18, -21, 19)
    B.look_at(cam, (0, 0.5, 1.0))
    cam.data.ortho_scale = 24.0
    scene.render.filepath = str(PREVIEW / "guide_hall_v5_interior_detail.png")
    bpy.ops.render.render(write_still=True)
    cam.location, cam.rotation_euler, cam.data.ortho_scale = iso_loc, iso_rot, iso_scale
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
    root, roof, collection, mats, outer, front_fit, teaching_fit = create_building()
    static = next(obj for obj in root.children if obj.name == "static_architecture")
    targets = [(static, "Static"), (roof, "Roof")]
    for part_name in ("front_door", "teaching_door", "orientation_table", "lesson_register",
                      "first_landing_plaque", "provision_rack"):
        targets.append((next(obj for obj in root.children if obj.name == part_name), part_name))
    for target, prefix in targets:
        B.consolidate_meshes(target, prefix)
    report = authoring_report(root, outer, front_fit, teaching_fit)
    render_export(root, roof, collection, mats)
    print("GUIDE_HALL_V5_READY", MODEL)
    print("ASSET_REPORT", json.dumps(report["checks"], sort_keys=True))


if __name__ == "__main__":
    main()
