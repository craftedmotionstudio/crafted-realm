"""Build the larger, coherent-shell Guide Hall replacement.

This pass responds directly to the rejected Compass Court production asset:
all exterior walls come from one shared-vertex perimeter, the interior is a
large open hall rather than overlapping room shells, and roof modules meet on
aligned axes.  One Blender unit remains one game tile.
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_guide_hall_v3 as B


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets" / "blender" / "holm_guide_hall_v4.blend"
MODEL = ROOT / "assets" / "models" / "buildings" / "holm_guide_hall_v4.glb"
PREVIEW = ROOT / "scratchpad" / "guide_hall_v4"
SOURCE.parent.mkdir(parents=True, exist_ok=True)
MODEL.parent.mkdir(parents=True, exist_ok=True)
PREVIEW.mkdir(parents=True, exist_ok=True)


# Clockwise continuous external shell. Every neighboring wall shares exactly
# the same endpoint; the only breaks are the two authored door openings.
PERIMETER = [
    (-3.0, -11.0), (3.0, -11.0), (4.5, -9.5), (4.5, -7.0),
    (8.0, -7.0), (12.0, -3.5), (12.0, 4.0), (9.5, 6.5),
    (6.0, 6.5), (4.5, 8.0), (4.5, 10.5), (3.0, 12.0),
    (-3.0, 12.0), (-4.5, 10.5), (-4.5, 8.0), (-6.0, 6.5),
    (-9.5, 6.5), (-12.0, 4.0), (-12.0, -3.5), (-8.0, -7.0),
    (-4.5, -7.0), (-4.5, -9.5),
]


def scaled(points, scale):
    return [(x * scale, y * scale) for x, y in points]


def make_shell(root, static, collection, mats):
    wall_h = 4.05
    B.prism("Hall_Foundation", scaled(PERIMETER, 1.018), -0.28, 0.36,
            mats["stone"], collection, static)
    B.prism("Hall_Floor", scaled(PERIMETER, 0.974), 0.08, 0.12,
            mats["wood"], collection, static)

    for idx in range(len(PERIMETER)):
        a, b = PERIMETER[idx], PERIMETER[(idx + 1) % len(PERIMETER)]
        # South and north walls are split only around their centered 2.6-tile doors.
        if idx == 0:
            B.wall_segment("SouthWall_W", a, (-1.3, -11.0), wall_h, mats, collection, static)
            B.wall_segment("SouthWall_E", (1.3, -11.0), b, wall_h, mats, collection, static)
        elif idx == 11:
            B.wall_segment("NorthWall_E", a, (1.3, 12.0), wall_h, mats, collection, static)
            B.wall_segment("NorthWall_W", (-1.3, 12.0), b, wall_h, mats, collection, static)
        else:
            B.wall_segment(f"OuterWall_{idx:02d}", a, b, wall_h, mats, collection, static)

    # One post per shared corner hides no drift; it emphasizes the continuous frame.
    for idx, (x, y) in enumerate(PERIMETER):
        B.post(f"PerimeterPost_{idx:02d}", x, y, wall_h, mats, collection, static)

    front = B.door("front_door", -1.3, -11.0, 2.6, mats, collection, root)
    north = B.door("teaching_door", 1.3, 12.0, 2.6, mats, collection, root)
    north.rotation_euler.z = math.pi

    # Deep aligned stone approach—large enough to frame the player and two tutors.
    for idx in range(6):
        B.cube(f"ApproachStep_{idx}", (0, -11.55 - idx * 0.72, -0.03 - idx * 0.025),
               (5.7 - idx * 0.22, 0.64, 0.15), mats["path"], collection, static)

    # Windows sit on the two long, perfectly aligned wing walls.
    for y in (-1.8, 2.0):
        B.add_window("WestWindow", -12.01, y, 2.38, math.pi / 2, mats, collection, static)
        B.add_window("EastWindow", 12.01, y, 2.38, math.pi / 2, mats, collection, static)


def lean_roof(name, inner_x, outer_x, y0, y1, inner_z, outer_z, mat, collection, parent):
    """One quiet side roof with a small solid thickness."""
    t = 0.16
    verts = [(inner_x, y0, inner_z), (outer_x, y0, outer_z),
             (outer_x, y1, outer_z), (inner_x, y1, inner_z),
             (inner_x, y0, inner_z-t), (outer_x, y0, outer_z-t),
             (outer_x, y1, outer_z-t), (inner_x, y1, inner_z-t)]
    faces = [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1),
             (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mat)
    for face in mesh.polygons:
        face.use_smooth = False
    return B.link(bpy.data.objects.new(name, mesh), collection, parent)


def make_roofs(root, collection, mats):
    roof = B.empty("roof", collection, root)
    central = [(-6.7, -7.2), (6.7, -7.2), (7.2, -6.7), (7.2, 6.7),
               (6.7, 7.2), (-6.7, 7.2), (-7.2, 6.7), (-7.2, -6.7)]
    B.poly_roof("GreatHall_Hip", central, 4.12, 7.15, mats["roof"], collection, roof, 0.10)
    # Side service wings use calm lean-tos: one attachment line, one eave, no
    # extra competing peaks. The main hall remains unambiguously dominant.
    lean_roof("RecordsWing_LeanTo", -6.25, -12.55, -5.7, 5.8, 4.62, 3.84,
              mats["roof_light"], collection, roof)
    lean_roof("ProvisionWing_LeanTo", 6.25, 12.55, -5.7, 5.8, 4.62, 3.84,
              mats["roof_light"], collection, roof)
    B.gable_roof("Teaching_Gable", 0, 9.3, 9.2, 6.2, 3.98, 5.72,
                 0, mats["roof"], collection, roof)
    B.gable_roof("Arrival_Gable", 0, -9.15, 9.2, 5.3, 3.88, 5.42,
                 0, mats["roof_light"], collection, roof)
    B.cylinder("CompassLantern", (0, 0, 7.48), 0.68, 0.58, 8,
               mats["plaster"], collection, roof)
    B.cylinder("CompassLanternBand", (0, 0, 7.78), 0.82, 0.14, 8,
               mats["timber"], collection, roof)
    B.poly_roof("CompassLanternCap", B.regular_points(0, 0, 0.95, 8, math.pi/8),
                7.86, 8.65, mats["roof_light"], collection, roof, 0.04)
    B.cylinder("CompassFinial", (0, 0, 8.84), 0.17, 0.46, 8,
               mats["brass"], collection, roof)
    return roof


def make_interior(root, static, collection, mats):
    # Large purposeful floor zones. They touch cleanly and use no floating full-height walls.
    records = [(-11.45, -3.0), (-8.0, -6.3), (-6.15, -6.3),
               (-6.15, 6.0), (-9.15, 6.0), (-11.45, 3.7)]
    supplies = [(-x, y) for x, y in reversed(records)]
    teaching = [(-4.15, 6.75), (4.15, 6.75), (4.15, 10.75), (-4.15, 10.75)]
    arrival = [(-4.1, -10.6), (4.1, -10.6), (4.1, -7.15), (-4.1, -7.15)]
    for name, points, mat in (("RecordsZone", records, mats["rug_blue"]),
                              ("ProvisionZone", supplies, mats["rug_green"]),
                              ("TeachingZone", teaching, mats["parchment"]),
                              ("ArrivalZone", arrival, mats["rug_red"])):
        B.prism(name, points, 0.205, 0.035, mat, collection, static)

    # A room-scale compass mosaic makes the now-large hall legible from the play camera.
    B.cylinder("CompassMosaicOuter", (0, 0, 0.235), 4.45, 0.05, 12,
               mats["rug_red"], collection, static)
    B.cylinder("CompassMosaicRing", (0, 0, 0.27), 3.84, 0.035, 12,
               mats["brass"], collection, static)
    B.cylinder("CompassMosaicInner", (0, 0, 0.30), 3.42, 0.035, 12,
               mats["rug_red"], collection, static)
    for idx, rot in enumerate((0, math.pi/2, math.pi/4, -math.pi/4)):
        B.cube(f"CompassRay_{idx}", (0, 0, 0.335),
               (0.20 if idx < 2 else 0.13, 6.25 if idx < 2 else 5.0, 0.035),
               mats["brass"], collection, static, rot)

    # Semantic route table, enlarged to remain a focal point rather than clutter.
    table = B.empty("orientation_table", collection, root, (0, 0, 0))
    B.cylinder("RouteTableTop", (0, 0, 1.17), 1.72, 0.24, 12,
               mats["wood"], collection, table)
    B.cylinder("RouteTableLeg", (0, 0, 0.62), 0.48, 1.06, 8,
               mats["timber"], collection, table)
    B.cylinder("RouteChartWater", (0, 0, 1.32), 1.44, 0.045, 12,
               mats["water"], collection, table)
    for idx, (x, y, r, sy) in enumerate(((-.58,.22,.54,.64),(.18,-.46,.42,.72),(.62,.34,.32,.88),(-.06,.68,.30,.64))):
        land = B.cylinder(f"RouteLand_{idx}", (x, y, 1.375), r, 0.06, 7,
                          mats["land"], collection, table)
        land.scale.y = sy
    for idx, (x, y) in enumerate(((-.78,.20),(-.20,-.65),(.48,-.27),(.70,.42),(.03,.72))):
        B.cylinder(f"RoutePin_{idx}", (x, y, 1.55), 0.07, 0.28, 6,
                   mats["rug_red"] if idx == 0 else mats["brass"], collection, table)

    # Symmetrical bench pairs frame circulation without pretending to be walls.
    B.bench("SouthWestBench", -4.85, -4.9, math.pi/2, mats, collection, static, 3.1)
    B.bench("SouthEastBench", 4.85, -4.9, math.pi/2, mats, collection, static, 3.1)
    B.bench("NorthWestBench", -4.85, 4.8, math.pi/2, mats, collection, static, 3.1)
    B.bench("NorthEastBench", 4.85, 4.8, math.pi/2, mats, collection, static, 3.1)

    # Records wing: one aligned outer-wall library and a substantial register desk.
    records_shelf = B.empty("records_shelf", collection, static, (-11.20, 0.1, 0))
    records_shelf.rotation_euler.z = math.pi/2
    B.shelf(records_shelf, "Records", mats, collection, 4.7)
    register = B.empty("lesson_register", collection, root, (-8.45, -1.0, 0))
    register.rotation_euler.z = math.pi/2
    B.cube("RegisterDesk", (0, 0, 1.02), (2.35, 1.05, 0.22), mats["wood"], collection, register)
    for x in (-0.82, 0.82):
        B.cube("RegisterLeg", (x, 0, 0.52), (0.18, 0.72, 0.94), mats["timber"], collection, register)
    B.cube("RegisterBook", (0, 0, 1.17), (1.35, 0.75, 0.07), mats["parchment"], collection, register)
    for idx in range(5):
        B.cube(f"RegisterInk_{idx}", (0, -0.25+idx*.12, 1.215), (0.92, .026, .012),
               mats["iron"], collection, register)

    # Freestanding story monument: readable and aligned, not pasted onto a diagonal wall.
    plaque = B.empty("first_landing_plaque", collection, root, (-5.15, -6.05, 0))
    B.cube("PlaquePlinth", (0, 0, 0.42), (2.45, 0.72, 0.82), mats["stone"], collection, plaque)
    B.cube("PlaqueFrame", (0, 0, 1.55), (2.35, 0.26, 1.62), mats["timber"], collection, plaque)
    B.cube("PlaqueFace", (0, -0.16, 1.55), (2.02, 0.08, 1.32), mats["stone_light"], collection, plaque)
    B.cube("PlaqueShip", (0, -0.22, 1.35), (1.20, 0.05, 0.16), mats["brass"], collection, plaque, -0.13)

    # Provision wing mirrors the records massing but has different occupational content.
    rack = B.empty("provision_rack", collection, root, (11.20, 0.1, 0))
    rack.rotation_euler.z = math.pi/2
    B.shelf(rack, "Provisions", mats, collection, 4.7)
    for idx, x in enumerate((-1.45, -0.48, 0.48, 1.45)):
        B.cylinder(f"ProvisionSack_{idx}", (x, 0.30, 0.65), .34, .68, 7,
                   mats["path"] if idx % 2 == 0 else mats["rug_green"], collection, rack)
    counter = B.empty("provision_counter", collection, static, (8.35, -1.0, 0))
    counter.rotation_euler.z = math.pi/2
    B.cube("IssueCounter", (0, 0, .62), (3.0, 1.0, 1.12), mats["wood"], collection, counter)
    B.cube("IssuedPack", (-.82, 0, 1.35), (.72, .42, .82), mats["path"], collection, counter)
    B.cylinder("RopeCoil", (.20, 0, 1.36), .38, .15, 10, mats["parchment"], collection, counter,
               rot=(math.pi/2, 0, 0))
    B.cylinder("WaterCask", (10.45, 4.7, .62), .48, 1.05, 10, mats["wood"], collection, static,
               rot=(0, math.pi/2, 0))

    # Teaching zone is wide enough for a tutor plus several players.
    B.cube("TeachingBoardFrame", (0, 10.85, 2.20), (4.2, .22, 2.05), mats["timber"], collection, static)
    B.cube("TeachingBoard", (0, 10.70, 2.20), (3.82, .10, 1.68), mats["rug_blue"], collection, static)
    B.bench("TeachingBenchA", 0, 8.0, 0, mats, collection, static, 4.8)
    B.bench("TeachingBenchB", 0, 9.25, 0, mats, collection, static, 4.8)


def setup_preview(mats):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.color = (0.045, 0.055, 0.040)
    scene.view_settings.look = "AgX - Medium High Contrast"
    B.cylinder("PreviewGround", (0, 0, -0.34), 17.2, .42, 22,
               mats["grass"], bpy.context.scene.collection)
    bpy.ops.object.camera_add(location=(25, -30, 25))
    cam = bpy.context.object
    cam.name = "PreviewCamera"
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = 31.0
    B.look_at(cam, (0, 0, 2.4))
    scene.camera = cam
    bpy.ops.object.light_add(type="SUN", location=(8, -10, 20))
    sun = bpy.context.object
    sun.rotation_euler = (math.radians(28), math.radians(-18), math.radians(-30))
    sun.data.energy = 2.25
    sun.data.color = (1.0, .78, .52)
    bpy.ops.object.light_add(type="AREA", location=(-10, -5, 17))
    area = bpy.context.object
    area.data.energy = 1300
    area.data.shape = "DISK"
    area.data.size = 15
    area.data.color = (.62, .75, 1.0)
    B.look_at(area, (0, 0, 1.8))
    return cam


def create_building():
    mats = B.setup_materials()
    collection = bpy.data.collections.new("GuideHall_CoherentShell")
    bpy.context.scene.collection.children.link(collection)
    root = B.empty("holm_guide_hall_v4", collection)
    root["buildingDefId"] = "holm_guide_hall_v1"
    root["assetId"] = "holm_guide_hall"
    root["revision"] = 4
    static = B.empty("static_architecture", collection, root)
    make_shell(root, static, collection, mats)
    roof = make_roofs(root, collection, mats)
    make_interior(root, static, collection, mats)
    return root, roof, collection, mats


def render_export(root, roof, collection, mats):
    scene = bpy.context.scene
    cam = setup_preview(mats)
    scene.render.filepath = str(PREVIEW / "guide_hall_v4_exterior.png")
    bpy.ops.render.render(write_still=True)
    B.set_render_hidden(roof, True)
    scene.render.filepath = str(PREVIEW / "guide_hall_v4_roof_off.png")
    bpy.ops.render.render(write_still=True)
    iso_loc, iso_rot, iso_scale = cam.location.copy(), cam.rotation_euler.copy(), cam.data.ortho_scale
    cam.location = (0, -.001, 38)
    B.look_at(cam, (0, 0, 0))
    cam.data.ortho_scale = 30.0
    scene.render.filepath = str(PREVIEW / "guide_hall_v4_plan.png")
    bpy.ops.render.render(write_still=True)
    cam.location, cam.rotation_euler, cam.data.ortho_scale = iso_loc, iso_rot, iso_scale
    B.set_render_hidden(roof, False)

    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    bpy.ops.object.select_all(action="DESELECT")
    for obj in B.descendants(root):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(MODEL), export_format="GLB", use_selection=True,
                              export_apply=True, export_yup=True, export_materials="EXPORT",
                              export_extras=True, export_cameras=False, export_lights=False)


def main():
    B.clean_scene()
    root, roof, collection, mats = create_building()
    targets = [(next(o for o in root.children if o.name == "static_architecture"), "Static"),
               (roof, "Roof")]
    for part_name in ("front_door", "teaching_door", "orientation_table", "lesson_register",
                      "first_landing_plaque", "provision_rack"):
        targets.append((next(o for o in root.children if o.name == part_name), part_name))
    for target, prefix in targets:
        B.consolidate_meshes(target, prefix)
    render_export(root, roof, collection, mats)
    print("GUIDE_HALL_V4_READY", MODEL)


if __name__ == "__main__":
    main()
