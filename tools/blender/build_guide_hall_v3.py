"""Author the production Tutor's Holm Guide Hall (Compass Court).

The .blend file is the editable source of truth.  The GLB contains semantic
nodes consumed by the browser runtime and Studio: roof, both doors, the route
table, lesson register, First Landing plaque, and provision rack.

Run with Blender 4.5 LTS:
  blender --background --python tools/blender/build_guide_hall_v3.py
"""
from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets" / "blender" / "holm_guide_hall_v3.blend"
MODEL = ROOT / "assets" / "models" / "buildings" / "holm_guide_hall_v3.glb"
PREVIEW = ROOT / "scratchpad" / "guide_hall_v3"
SOURCE.parent.mkdir(parents=True, exist_ok=True)
MODEL.parent.mkdir(parents=True, exist_ok=True)
PREVIEW.mkdir(parents=True, exist_ok=True)


def clean_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for blocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials,
                   bpy.data.cameras, bpy.data.lights):
        for block in list(blocks):
            if block.users == 0:
                blocks.remove(block)


def material(name, rgb, roughness=0.92):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = 0.0
    return mat


def setup_materials():
    return {
        "stone": material("CR Stone", (0.43, 0.41, 0.36)),
        "stone_light": material("CR Stone Light", (0.61, 0.57, 0.48)),
        "plaster": material("CR Warm Plaster", (0.79, 0.72, 0.56)),
        "timber": material("CR Dark Timber", (0.25, 0.13, 0.075)),
        "wood": material("CR Furnishing Wood", (0.43, 0.25, 0.12)),
        "roof": material("CR Russet Roof", (0.49, 0.23, 0.105)),
        "roof_light": material("CR Roof Highlight", (0.69, 0.40, 0.16)),
        "brass": material("CR Guide Brass", (0.79, 0.56, 0.18), 0.68),
        "iron": material("CR Iron", (0.20, 0.21, 0.20)),
        "parchment": material("CR Parchment", (0.85, 0.75, 0.49)),
        "water": material("CR Chart Water", (0.24, 0.43, 0.52)),
        "land": material("CR Chart Land", (0.37, 0.49, 0.24)),
        "rug_red": material("CR Compass Red", (0.43, 0.12, 0.075)),
        "rug_blue": material("CR Records Blue", (0.25, 0.36, 0.45)),
        "rug_green": material("CR Provision Green", (0.32, 0.42, 0.24)),
        "path": material("CR Path Stone", (0.50, 0.45, 0.35)),
        "glass": material("CR Blue Glass", (0.31, 0.55, 0.58), 0.58),
        "grass": material("Preview Grass", (0.24, 0.34, 0.13)),
    }


def link(obj, collection, parent=None):
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    collection.objects.link(obj)
    if parent:
        obj.parent = parent
    return obj


def empty(name, collection, parent=None, loc=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = "PLAIN_AXES"
    obj.empty_display_size = 0.45
    obj.location = loc
    collection.objects.link(obj)
    if parent:
        obj.parent = parent
    obj["partId"] = name
    return obj


def cube(name, loc, dims, mat, collection, parent=None, rot=0.0):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=(0, 0, rot))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth = False
    return link(obj, collection, parent)


def cylinder(name, loc, radius, depth, sides, mat, collection, parent=None,
             rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=sides, radius=radius, depth=depth,
                                       location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth = False
    return link(obj, collection, parent)


def prism(name, points, z0, height, mat, collection, parent=None):
    n = len(points)
    verts = [(x, y, z0) for x, y in points] + [(x, y, z0 + height) for x, y in points]
    faces = [tuple(reversed(range(n))), tuple(range(n, n * 2))]
    faces.extend((i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n))
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mat)
    for face in mesh.polygons:
        face.use_smooth = False
    return link(bpy.data.objects.new(name, mesh), collection, parent)


def regular_points(cx, cy, radius, sides=8, angle=math.pi / 8):
    return [(cx + math.cos(angle + i * math.tau / sides) * radius,
             cy + math.sin(angle + i * math.tau / sides) * radius)
            for i in range(sides)]


def rotated_rect_points(cx, cy, w, d, rot=0.0):
    co, si = math.cos(rot), math.sin(rot)
    return [(cx + x * co - y * si, cy + x * si + y * co)
            for x, y in [(-w/2, -d/2), (w/2, -d/2), (w/2, d/2), (-w/2, d/2)]]


def wall_segment(name, a, b, wall_h, mats, collection, parent):
    ax, ay = a
    bx, by = b
    length = math.hypot(bx - ax, by - ay)
    angle = math.atan2(by - ay, bx - ax)
    x, y = (ax + bx) / 2, (ay + by) / 2
    cube(name + "_Stone", (x, y, 0.48), (length, 0.34, 0.96),
         mats["stone"], collection, parent, angle)
    cube(name + "_Plaster", (x, y, 0.96 + (wall_h - 0.96) / 2),
         (length, 0.30, wall_h - 0.96), mats["plaster"], collection, parent, angle)
    cube(name + "_Plate", (x, y, wall_h - 0.06), (length + 0.12, 0.42, 0.18),
         mats["timber"], collection, parent, angle)


def post(name, x, y, h, mats, collection, parent):
    cube(name, (x, y, h/2), (0.25, 0.25, h), mats["timber"], collection, parent)
    cube(name + "_Foot", (x, y, 0.15), (0.48, 0.48, 0.30),
         mats["stone_light"], collection, parent)


def poly_roof(name, points, eave, peak, mat, collection, parent, top_scale=0.1):
    n = len(points)
    cx = sum(p[0] for p in points) / n
    cy = sum(p[1] for p in points) / n
    top = [(cx + (x-cx) * top_scale, cy + (y-cy) * top_scale, peak) for x, y in points]
    verts = [(x, y, eave) for x, y in points] + top
    faces = [(i, (i+1) % n, (i+1) % n + n, i+n) for i in range(n)]
    faces.append(tuple(range(n, n*2)))
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mat)
    for face in mesh.polygons:
        face.use_smooth = False
    return link(bpy.data.objects.new(name, mesh), collection, parent)


def gable_roof(name, cx, cy, w, d, eave, ridge, rot, mat, collection, parent):
    local = [(-w/2, -d/2, eave), (w/2, -d/2, eave),
             (-w/2, d/2, eave), (w/2, d/2, eave),
             (0, -d/2, ridge), (0, d/2, ridge)]
    co, si = math.cos(rot), math.sin(rot)
    verts = [(cx + x*co - y*si, cy + x*si + y*co, z) for x, y, z in local]
    faces = [(0, 2, 5, 4), (1, 4, 5, 3), (0, 4, 1), (2, 3, 5)]
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mat)
    for face in mesh.polygons:
        face.use_smooth = False
    return link(bpy.data.objects.new(name, mesh), collection, parent)


def floor_board_lines(prefix, cx, cy, w, d, rot, mats, collection, parent):
    co, si = math.cos(rot), math.sin(rot)
    for i, x in enumerate([-w/2 + 0.9, -w/2 + 1.8, 0, w/2 - 1.8, w/2 - 0.9]):
        px, py = cx + x*co, cy + x*si
        cube(f"{prefix}_BoardLine_{i}", (px, py, 0.17), (0.045, d*0.88, 0.025),
             mats["timber"], collection, parent, rot)


def add_window(name, x, y, z, rot, mats, collection, parent):
    cube(name + "_Frame", (x, y, z), (1.28, 0.12, 1.24), mats["timber"], collection, parent, rot)
    cube(name + "_Glass", (x, y, z), (1.02, 0.15, 0.98), mats["glass"], collection, parent, rot)
    cube(name + "_Mullion", (x, y, z), (0.09, 0.18, 1.03), mats["timber"], collection, parent, rot)


def door(name, x, y, width, mats, collection, parent):
    # The panel extends in local +X from its hinge. Runtime applies the Y-axis
    # closed/open rotations after Blender's Z-up to glTF Y-up conversion.
    pivot = empty(name, collection, parent, (x, y, 0))
    cube(name + "_Panel", (width/2, 0, 1.18), (width, 0.18, 2.36),
         mats["wood"], collection, pivot)
    for z in (0.42, 1.18, 1.94):
        cube(name + "_Iron", (width/2, -0.01, z), (width*0.88, 0.22, 0.08),
             mats["iron"], collection, pivot)
    cube(name + "_Hinge", (0.14, -0.01, 1.18), (0.10, 0.22, 2.08),
         mats["iron"], collection, pivot)
    return pivot


def bench(name, x, y, rot, mats, collection, parent, width=2.3):
    g = empty(name, collection, parent, (x, y, 0))
    g.rotation_euler.z = rot
    cube(name + "_Seat", (0, 0, 0.56), (width, 0.48, 0.16), mats["wood"], collection, g)
    for px in (-width/2 + 0.24, width/2 - 0.24):
        cube(name + "_Leg", (px, 0, 0.28), (0.14, 0.34, 0.56), mats["timber"], collection, g)


def shelf(parent, prefix, mats, collection, width=1.9):
    for z in (0.32, 0.94, 1.56, 2.18):
        cube(prefix + "_Shelf", (0, 0, z), (width, 0.48, 0.12), mats["wood"], collection, parent)
    for x in (-width/2 + 0.08, width/2 - 0.08):
        cube(prefix + "_Side", (x, 0, 1.20), (0.14, 0.50, 2.40), mats["timber"], collection, parent)


def create_building():
    mats = setup_materials()
    collection = bpy.data.collections.new("GuideHall_CompassCourt")
    bpy.context.scene.collection.children.link(collection)
    root = empty("holm_guide_hall_v3", collection)
    root["buildingDefId"] = "holm_guide_hall_v1"
    root["assetId"] = "holm_guide_hall"
    static = empty("static_architecture", collection, root)
    roof = empty("roof", collection, root)

    wall_h = 3.12
    oct_body = regular_points(0, 0, 4.45, 8, math.pi/8)
    oct_floor = regular_points(0, 0, 4.35, 8, math.pi/8)
    left = rotated_rect_points(-5.05, 1.25, 5.35, 4.25, -0.40)
    right = rotated_rect_points(5.05, 1.25, 5.35, 4.25, 0.40)
    apse = regular_points(0, 5.10, 2.48, 6, 0)
    porch = rotated_rect_points(0, -5.32, 4.25, 3.40, 0)

    # Layered, connected floors. Their overlaps are intentional: they create one
    # walkable south-to-north interior without procedural box seams.
    prism("Central_Foundation", regular_points(0, 0, 4.62, 8, math.pi/8), -0.22, 0.30,
          mats["stone"], collection, static)
    prism("Central_Floor", oct_floor, 0.08, 0.10, mats["wood"], collection, static)
    for name, points, rug in (("Records", left, "rug_blue"), ("Provisions", right, "rug_green"),
                              ("Teaching", apse, "parchment"), ("Arrival", porch, "rug_red")):
        prism(name + "_Foundation", points, -0.20, 0.29, mats["stone"], collection, static)
        inset = [(sum(x for x, _ in points)/len(points) + (x-sum(q[0] for q in points)/len(points))*0.92,
                  sum(y for _, y in points)/len(points) + (y-sum(q[1] for q in points)/len(points))*0.92)
                 for x, y in points]
        prism(name + "_Floor", inset, 0.09, 0.10, mats[rug], collection, static)
    floor_board_lines("Central", 0, 0, 6.4, 6.4, 0, mats, collection, static)

    # Central court keeps four generous openings: arrival, teaching apse, and
    # both service wings. The remaining four octagonal walls define the court.
    for idx in (3, 4, 6, 7):
        wall_segment(f"CourtWall_{idx}", oct_body[idx], oct_body[(idx+1) % 8], wall_h,
                     mats, collection, static)
    for idx, (x, y) in enumerate(oct_body):
        if idx not in (1, 2, 5, 6):
            post(f"CourtPost_{idx}", x, y, wall_h, mats, collection, static)

    # Angled records/provision wings: omit the wall facing the central court.
    for idx in (0, 2, 3):
        wall_segment(f"RecordsWall_{idx}", left[idx], left[(idx+1) % 4], wall_h-0.25,
                     mats, collection, static)
    for idx in (0, 1, 2):
        wall_segment(f"ProvisionWall_{idx}", right[idx], right[(idx+1) % 4], wall_h-0.25,
                     mats, collection, static)
    for prefix, points in (("Records", left), ("Provision", right)):
        for idx, (x, y) in enumerate(points):
            post(f"{prefix}Post_{idx}", x, y, wall_h-0.25, mats, collection, static)

    # Six-sided teaching apse. South opens into the chart hall; north is split
    # around the onward door, making the route a real through-building journey.
    for idx in (0, 2, 3, 5):
        wall_segment(f"ApseWall_{idx}", apse[idx], apse[(idx+1) % 6], wall_h-0.12,
                     mats, collection, static)
    north_y = 5.10 + math.sin(math.pi/3) * 2.48
    wall_segment("ApseNorthWest", (-2.14, north_y), (-0.77, north_y), wall_h-0.12,
                 mats, collection, static)
    wall_segment("ApseNorthEast", (0.77, north_y), (2.14, north_y), wall_h-0.12,
                 mats, collection, static)
    for idx, (x, y) in enumerate(apse):
        post(f"ApsePost_{idx}", x, y, wall_h-0.12, mats, collection, static)

    # Arrival porch is a modest gatehouse, not another competing great hall.
    for idx in (1, 3):
        wall_segment(f"PorchWall_{idx}", porch[idx], porch[(idx+1) % 4], 2.88,
                     mats, collection, static)
    wall_segment("PorchSouthWest", (porch[0][0], porch[0][1]), (-0.77, porch[0][1]), 2.88,
                 mats, collection, static)
    wall_segment("PorchSouthEast", (0.77, porch[0][1]), (porch[1][0], porch[1][1]), 2.88,
                 mats, collection, static)
    for idx, (x, y) in enumerate(porch):
        post(f"PorchPost_{idx}", x, y, 2.88, mats, collection, static)

    # Exterior windows and approach stones reinforce the actual route.
    add_window("RecordsWindow", -7.36, 1.16, 1.86, -0.40, mats, collection, static)
    add_window("ProvisionWindow", 7.36, 1.16, 1.86, 0.40, mats, collection, static)
    for i in range(5):
        cube(f"ApproachStone_{i}", (math.sin(i*1.2)*0.16, -7.50-i*0.76, -0.02),
             (2.45-i*0.13, 0.58, 0.12), mats["path"], collection, static,
             math.sin(i)*0.035)

    # Semantic doors. South/front uses local +X; north is closed by runtime at pi.
    door("front_door", -0.77, porch[0][1], 1.54, mats, collection, root)
    door("teaching_door", 0.77, north_y, 1.54, mats, collection, root)

    # A deliberately calm roof hierarchy: dominant central lantern, lower wings,
    # medium teaching apse, and the smallest arrival gable.
    poly_roof("CompassCourt_Roof", regular_points(0, 0, 4.90, 8, math.pi/8),
              3.15, 5.72, mats["roof"], collection, roof, 0.10)
    gable_roof("RecordsWing_Roof", -5.05, 1.25, 5.85, 4.78, 2.94, 4.18,
               -0.40, mats["roof"], collection, roof)
    gable_roof("ProvisionWing_Roof", 5.05, 1.25, 5.85, 4.78, 2.94, 4.18,
               0.40, mats["roof"], collection, roof)
    poly_roof("TeachingApse_Roof", regular_points(0, 5.10, 2.83, 6, 0),
              3.03, 4.48, mats["roof_light"], collection, roof, 0.10)
    gable_roof("ArrivalPorch_Roof", 0, -5.32, 4.70, 3.78, 2.96, 4.12,
               0, mats["roof_light"], collection, roof)
    cylinder("CompassLantern", (0, 0, 6.06), 0.55, 0.55, 8, mats["plaster"], collection, roof)
    cylinder("CompassCrown", (0, 0, 6.39), 0.72, 0.16, 8, mats["timber"], collection, roof)
    poly_roof("CompassLanternCap", regular_points(0, 0, 0.82, 8, math.pi/8),
              6.47, 7.18, mats["roof_light"], collection, roof, 0.04)
    cylinder("CompassFinial", (0, 0, 7.34), 0.16, 0.42, 8, mats["brass"], collection, roof)

    # Central compass mosaic and route-table semantic anchor.
    cylinder("CompassRugOuter", (0, 0, 0.205), 2.55, 0.055, 8, mats["rug_red"], collection, static)
    cylinder("CompassRugRing", (0, 0, 0.245), 2.17, 0.035, 8, mats["brass"], collection, static)
    cylinder("CompassRugInner", (0, 0, 0.275), 1.84, 0.035, 8, mats["rug_red"], collection, static)
    for idx, rot in enumerate((0, math.pi/2, math.pi/4, -math.pi/4)):
        cube(f"CompassRay_{idx}", (0, 0, 0.31), (0.15 if idx < 2 else 0.10,
             3.26 if idx < 2 else 2.62, 0.035), mats["brass"], collection, static, rot)

    table = empty("orientation_table", collection, root, (0, 0, 0))
    cylinder("RouteTableTop", (0, 0, 1.03), 1.30, 0.20, 10, mats["wood"], collection, table)
    cylinder("RouteTableLeg", (0, 0, 0.54), 0.38, 0.90, 8, mats["timber"], collection, table)
    cylinder("RouteChartWater", (0, 0, 1.16), 1.08, 0.04, 10, mats["water"], collection, table)
    for idx, (x, y, r, sy) in enumerate(((-.42,.16,.42,.62),(.12,-.34,.31,.72),(.45,.25,.23,.88),(-.05,.48,.22,.62))):
        land = cylinder(f"RouteLand_{idx}", (x, y, 1.205), r, 0.055, 6, mats["land"], collection, table)
        land.scale.y = sy
    for idx, (x, y) in enumerate(((-.57,.15),(-.16,-.47),(.33,-.19),(.51,.29),(.02,.52))):
        cylinder(f"RoutePin_{idx}", (x, y, 1.36), 0.055, 0.25, 6,
                 mats["rug_red"] if idx == 0 else mats["brass"], collection, table)
    bench("WestBench", -3.32, -0.70, math.pi/2, mats, collection, static, 2.55)
    bench("EastBench", 3.32, -0.70, math.pi/2, mats, collection, static, 2.55)

    # Records wing: the register is its own semantic parent and the room reads
    # administratively at gameplay distance.
    records_shelf = empty("records_shelf", collection, static, (-6.20, 2.05, 0))
    records_shelf.rotation_euler.z = -0.40
    shelf(records_shelf, "Records", mats, collection, 2.15)
    register = empty("lesson_register", collection, root, (-4.62, 0.40, 0))
    register.rotation_euler.z = -0.18
    cube("RegisterDesk", (0, 0, 0.92), (1.48, 0.78, 0.18), mats["wood"], collection, register)
    for x in (-0.47, 0.47):
        cube("RegisterLeg", (x, 0, 0.47), (0.14, 0.56, 0.86), mats["timber"], collection, register)
    cube("RegisterPageLeft", (-0.31, 0, 1.04), (0.60, 0.59, 0.035), mats["parchment"], collection, register, 0.07)
    cube("RegisterPageRight", (0.31, 0, 1.04), (0.60, 0.59, 0.035), mats["parchment"], collection, register, -0.07)
    for i in range(4):
        cube(f"RegisterInk_{i}", (0, -0.19+i*0.12, 1.067), (0.44, 0.022, 0.012), mats["iron"], collection, register)

    # Story clue sits on the court's west wall, visible before the route forks.
    plaque = empty("first_landing_plaque", collection, root, (-4.15, -0.42, 1.72))
    plaque.rotation_euler.z = math.pi/2
    cube("PlaqueFrame", (0, 0, 0), (2.15, 0.16, 1.48), mats["timber"], collection, plaque)
    cube("PlaqueStone", (0, -0.10, 0), (1.88, 0.10, 1.22), mats["stone_light"], collection, plaque)
    cube("PlaqueShip", (0, -0.17, -0.23), (1.08, 0.055, 0.14), mats["brass"], collection, plaque, -0.16)
    for i in range(5):
        cube(f"PlaqueRay_{i}", (0, -0.18, 0.20), (0.055, 0.055, 0.52), mats["brass"], collection, plaque, -0.72+i*0.36)

    # Provision wing: rack, counted packs, cask, and issue counter.
    provisions = empty("provision_rack", collection, root, (6.16, 2.05, 0))
    provisions.rotation_euler.z = 0.40
    shelf(provisions, "Provisions", mats, collection, 2.15)
    for idx, x in enumerate((-0.48, 0, 0.48)):
        cylinder(f"ProvisionSack_{idx}", (x, 0.28, 0.61), 0.27, 0.55, 7,
                 mats["path"] if idx != 1 else mats["rug_green"], collection, provisions)
    counter = empty("provision_counter", collection, static, (4.55, 0.25, 0))
    counter.rotation_euler.z = 0.18
    cube("IssueCounter", (0, 0, 0.52), (2.20, 0.72, 0.94), mats["wood"], collection, counter)
    cube("IssuedPack", (-0.61, 0, 1.08), (0.54, 0.32, 0.62), mats["path"], collection, counter)
    cylinder("RopeCoil", (0.15, 0, 1.12), 0.29, 0.12, 10, mats["parchment"], collection, counter,
             rot=(math.pi/2, 0, 0))
    cylinder("WaterCask", (6.42, 0.22, 0.54), 0.38, 0.86, 9, mats["wood"], collection, static,
             rot=(0, math.pi/2, 0))

    # Teaching apse: a readable destination beyond the second door.
    cube("TeachingBoardFrame", (0, 6.78, 1.78), (2.22, 0.18, 1.42), mats["timber"], collection, static)
    cube("TeachingBoard", (0, 6.68, 1.78), (1.94, 0.10, 1.16), mats["rug_blue"], collection, static)
    for x in (-1.08, 1.08):
        post("TeachingLampPost", x, 6.30, 1.18, mats, collection, static)
        cylinder("TeachingLamp", (x, 6.30, 1.43), 0.20, 0.32, 6, mats["brass"], collection, static)

    return root, roof, collection, mats


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_preview(mats):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1120
    scene.render.resolution_y = 820
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.color = (0.045, 0.055, 0.040)
    scene.view_settings.look = "AgX - Medium High Contrast"
    cylinder("PreviewGround", (0, 0, -0.29), 12.7, 0.34, 20, mats["grass"], bpy.context.scene.collection)
    bpy.ops.object.camera_add(location=(18.5, -22.0, 19.5))
    cam = bpy.context.object
    cam.name = "PreviewCamera"
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = 22.5
    look_at(cam, (0, 0, 2.0))
    scene.camera = cam
    bpy.ops.object.light_add(type="SUN", location=(7, -9, 17))
    sun = bpy.context.object
    sun.name = "PreviewSun"
    sun.rotation_euler = (math.radians(27), math.radians(-19), math.radians(-31))
    sun.data.energy = 2.25
    sun.data.color = (1.0, 0.77, 0.50)
    bpy.ops.object.light_add(type="AREA", location=(-8, -4, 14))
    area = bpy.context.object
    area.name = "PreviewFill"
    area.data.energy = 1100
    area.data.shape = "DISK"
    area.data.size = 12
    area.data.color = (0.62, 0.75, 1.0)
    look_at(area, (0, 0, 1.5))
    return cam


def descendants(root):
    return [root, *list(root.children_recursive)]


def consolidate_meshes(container, prefix):
    """Join meshes by material inside one semantic hierarchy.

    This keeps each clickable Empty intact while turning scores of decorative
    cubes into a small browser-friendly set of GPU draw calls.
    """
    groups = {}
    for obj in list(container.children_recursive):
        if obj.type != "MESH" or not obj.data.materials:
            continue
        groups.setdefault(obj.data.materials[0].name, []).append(obj)
    for mat_name, objects in groups.items():
        if not objects:
            continue
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


def set_render_hidden(root, hidden):
    for obj in descendants(root):
        obj.hide_render = hidden


def export_and_render(root, roof, collection, mats):
    scene = bpy.context.scene
    cam = setup_preview(mats)
    scene.render.filepath = str(PREVIEW / "guide_hall_v3_exterior.png")
    bpy.ops.render.render(write_still=True)
    set_render_hidden(roof, True)
    scene.render.filepath = str(PREVIEW / "guide_hall_v3_roof_off.png")
    bpy.ops.render.render(write_still=True)
    set_render_hidden(roof, False)

    # Top-down roof-off flow plate.
    iso_loc, iso_rot, iso_scale = cam.location.copy(), cam.rotation_euler.copy(), cam.data.ortho_scale
    set_render_hidden(roof, True)
    cam.location = (0, -0.001, 31)
    look_at(cam, (0, 0, 0))
    cam.data.ortho_scale = 21.5
    scene.render.filepath = str(PREVIEW / "guide_hall_v3_plan.png")
    bpy.ops.render.render(write_still=True)
    set_render_hidden(roof, False)
    cam.location, cam.rotation_euler, cam.data.ortho_scale = iso_loc, iso_rot, iso_scale

    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    bpy.ops.object.select_all(action="DESELECT")
    for obj in descendants(root):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=str(MODEL), export_format="GLB", use_selection=True,
        export_apply=True, export_yup=True, export_materials="EXPORT",
        export_extras=True, export_cameras=False, export_lights=False,
    )


def main():
    clean_scene()
    root, roof, collection, mats = create_building()
    # Architecture/roof each collapse by material; interaction parents collapse
    # independently so raycasting still resolves the exact semantic node.
    targets = [(next(o for o in root.children if o.name == "static_architecture"), "Static"),
               (roof, "Roof")]
    for part_name in ("front_door", "teaching_door", "orientation_table", "lesson_register",
                      "first_landing_plaque", "provision_rack"):
        targets.append((next(o for o in root.children if o.name == part_name), part_name))
    for target, prefix in targets:
        consolidate_meshes(target, prefix)
    export_and_render(root, roof, collection, mats)
    print("GUIDE_HALL_V3_READY", MODEL)


if __name__ == "__main__":
    main()
