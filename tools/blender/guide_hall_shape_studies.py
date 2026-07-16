"""Build three original, irregular Guide Hall massing studies in Blender.

The studies deliberately stay at silhouette/shape-hierarchy fidelity. Nothing
is promoted to the game until the owner approves one footprint direction.
Run with Blender 4.5 LTS:
  blender --background --python tools/blender/guide_hall_shape_studies.py
"""
from __future__ import annotations

import math
import os
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "scratchpad" / "guide_hall_shape_studies"
OUT.mkdir(parents=True, exist_ok=True)


def clean_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        pass


def material(name, rgb, roughness=0.92):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1.0)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = 0.0
    return m


M = {}


def setup_materials():
    global M
    M = {
        "stone": material("CR Stone", (0.43, 0.41, 0.36)),
        "stone_light": material("CR Stone Light", (0.60, 0.56, 0.47)),
        "plaster": material("CR Warm Plaster", (0.77, 0.70, 0.54)),
        "timber": material("CR Dark Timber", (0.25, 0.13, 0.075)),
        "roof": material("CR Russet Roof", (0.48, 0.22, 0.10)),
        "roof_gold": material("CR Roof Highlight", (0.68, 0.39, 0.15)),
        "door": material("CR Door", (0.32, 0.17, 0.09)),
        "glass": material("CR Blue Glass", (0.30, 0.54, 0.58), 0.55),
        "brass": material("CR Guide Brass", (0.78, 0.55, 0.18), 0.65),
        "path": material("CR Path", (0.47, 0.39, 0.27)),
        "grass": material("CR Grass", (0.24, 0.34, 0.13)),
        "red": material("CR Guide Red", (0.48, 0.12, 0.08)),
    }


def link_obj(obj, collection, parent=None):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    collection.objects.link(obj)
    if parent:
        obj.parent = parent
    return obj


def cube(name, loc, dims, mat, collection, parent=None, rot=0.0):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=(0.0, 0.0, rot))
    o = bpy.context.object
    o.name = name
    o.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat)
    for p in o.data.polygons:
        p.use_smooth = False
    return link_obj(o, collection, parent)


def prism(name, points, z0, height, mat, collection, parent=None):
    n = len(points)
    verts = [(x, y, z0) for x, y in points] + [(x, y, z0 + height) for x, y in points]
    faces = [tuple(reversed(range(n))), tuple(range(n, n * 2))]
    faces.extend((i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n))
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mat)
    for p in mesh.polygons:
        p.use_smooth = False
    o = bpy.data.objects.new(name, mesh)
    return link_obj(o, collection, parent)


def poly_roof(name, points, eave, peak, mat, collection, parent=None, top_scale=0.0):
    n = len(points)
    if top_scale <= 0.001:
        cx = sum(p[0] for p in points) / n
        cy = sum(p[1] for p in points) / n
        verts = [(x, y, eave) for x, y in points] + [(cx, cy, peak)]
        faces = [(i, (i + 1) % n, n) for i in range(n)]
    else:
        cx = sum(p[0] for p in points) / n
        cy = sum(p[1] for p in points) / n
        top = [(cx + (x - cx) * top_scale, cy + (y - cy) * top_scale, peak) for x, y in points]
        verts = [(x, y, eave) for x, y in points] + top
        faces = [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
        faces.append(tuple(range(n, n * 2)))
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mat)
    for p in mesh.polygons:
        p.use_smooth = False
    o = bpy.data.objects.new(name, mesh)
    return link_obj(o, collection, parent)


def regular_points(cx, cy, radius, sides=8, angle=math.pi / 8):
    return [(cx + math.cos(angle + i * math.tau / sides) * radius,
             cy + math.sin(angle + i * math.tau / sides) * radius) for i in range(sides)]


def rotated_rect_points(cx, cy, w, d, rot=0.0):
    co, si = math.cos(rot), math.sin(rot)
    pts = []
    for x, y in [(-w / 2, -d / 2), (w / 2, -d / 2), (w / 2, d / 2), (-w / 2, d / 2)]:
        pts.append((cx + x * co - y * si, cy + x * si + y * co))
    return pts


def gable_roof(name, cx, cy, w, d, eave, ridge, rot, mat, collection, parent=None):
    local = [(-w/2, -d/2, eave), (w/2, -d/2, eave),
             (-w/2, d/2, eave), (w/2, d/2, eave),
             (0, -d/2, ridge), (0, d/2, ridge)]
    co, si = math.cos(rot), math.sin(rot)
    verts = [(cx + x*co - y*si, cy + x*si + y*co, z) for x, y, z in local]
    faces = [(0, 2, 5, 4), (1, 4, 5, 3), (0, 4, 1), (2, 3, 5)]
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mat)
    for p in mesh.polygons:
        p.use_smooth = False
    o = bpy.data.objects.new(name, mesh)
    return link_obj(o, collection, parent)


def add_rect_mass(prefix, cx, cy, w, d, wall_h, roof_h, collection, parent, rot=0.0):
    cube(prefix + "_StoneBase", (cx, cy, 0.33), (w + 0.28, d + 0.28, 0.66), M["stone"], collection, parent, rot)
    cube(prefix + "_Plaster", (cx, cy, 0.72 + wall_h / 2), (w, d, wall_h), M["plaster"], collection, parent, rot)
    gable_roof(prefix + "_GableRoof", cx, cy, w + 0.85, d + 0.85, 0.72 + wall_h, 0.72 + wall_h + roof_h,
               rot, M["roof"], collection, parent)
    # Deliberate dark base and eave bands keep masses readable at distance.
    cube(prefix + "_BaseBand", (cx, cy, 0.76), (w + 0.12, d + 0.12, 0.16), M["timber"], collection, parent, rot)


def add_oct_mass(prefix, cx, cy, radius, wall_h, roof_h, collection, parent, sides=8, angle=math.pi/8):
    base = regular_points(cx, cy, radius + 0.20, sides, angle)
    body = regular_points(cx, cy, radius, sides, angle)
    roof = regular_points(cx, cy, radius + 0.55, sides, angle)
    prism(prefix + "_StoneBase", base, 0.0, 0.72, M["stone"], collection, parent)
    prism(prefix + "_Plaster", body, 0.72, wall_h, M["plaster"], collection, parent)
    poly_roof(prefix + "_HippedRoof", roof, 0.72 + wall_h, 0.72 + wall_h + roof_h,
              M["roof"], collection, parent, top_scale=0.12)
    for i, (x, y) in enumerate(body):
        cube(prefix + f"_Post_{i}", (x, y, 0.72 + wall_h/2), (0.20, 0.20, wall_h), M["timber"], collection, parent)


def add_window(prefix, loc, dims, collection, parent, rot=0.0):
    cube(prefix + "_Frame", loc, (dims[0] + 0.24, dims[1] + 0.24, dims[2] + 0.08), M["timber"], collection, parent, rot)
    cube(prefix + "_Glass", loc, dims, M["glass"], collection, parent, rot)


def add_door(prefix, loc, dims, collection, parent, rot=0.0):
    cube(prefix + "_Door", loc, dims, M["door"], collection, parent, rot)
    cube(prefix + "_Lintel", (loc[0], loc[1], loc[2] + dims[2]/2 + 0.12),
         (dims[0] + 0.38, dims[1] + 0.12, 0.22), M["timber"], collection, parent, rot)


def add_approach(collection, parent, x=0.0, y0=-8.6, turn=0.0):
    for i in range(6):
        y = y0 + i * 0.88
        xoff = x + math.sin(i * 1.25 + turn) * 0.22
        cube(f"PathStone_{i}", (xoff, y, 0.055), (2.6 - i*0.10, 0.70, 0.11),
             M["path"], collection, parent, rot=math.sin(i) * 0.035)


def add_compass_finial(prefix, x, y, z, collection, parent):
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.52, depth=0.16, location=(x, y, z), rotation=(math.pi/2, 0, 0))
    disc = bpy.context.object
    disc.name = prefix + "_CompassDisc"
    disc.data.materials.append(M["brass"])
    link_obj(disc, collection, parent)
    cube(prefix + "_Needle", (x, y - 0.12, z), (0.12, 0.10, 0.88), M["red"], collection, parent, rot=-0.38)


def new_study(name):
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    root = bpy.data.objects.new(name + "_ROOT", None)
    c.objects.link(root)
    return c, root


def compass_court():
    c, root = new_study("A_CompassCourt")
    add_oct_mass("A_CentralChartHall", 0, 0.2, 4.55, 3.0, 2.35, c, root)
    add_rect_mass("A_RecordsWing", -5.0, 1.25, 5.9, 4.25, 2.55, 1.45, c, root, rot=-0.43)
    add_rect_mass("A_ProvisionWing", 5.0, 1.25, 5.9, 4.25, 2.55, 1.45, c, root, rot=0.43)
    north = regular_points(0, 5.0, 2.45, 6, math.pi/6)
    prism("A_TeachingApse_Base", regular_points(0, 5.0, 2.62, 6, math.pi/6), 0, 0.70, M["stone"], c, root)
    prism("A_TeachingApse", north, 0.70, 2.60, M["plaster"], c, root)
    poly_roof("A_TeachingApse_Roof", regular_points(0, 5.0, 2.85, 6, math.pi/6), 3.30, 4.65, M["roof_gold"], c, root, 0.10)
    # Open entry porch: visual depth without another closed rectangle.
    for x in (-1.65, 1.65):
        cube("A_PorchPost", (x, -5.55, 1.55), (0.28, 0.28, 3.10), M["timber"], c, root)
        cube("A_PorchFoot", (x, -5.55, 0.18), (0.58, 0.58, 0.36), M["stone_light"], c, root)
    gable_roof("A_EntryCrossGable", 0, -5.0, 4.5, 3.5, 3.15, 4.65, 0, M["roof_gold"], c, root)
    add_door("A_Arrival", (0, -4.31, 1.60), (1.5, 0.18, 2.55), c, root)
    add_window("A_RecordWindow", (-6.30, -0.15, 2.0), (0.95, 0.14, 1.15), c, root, rot=-0.43)
    add_window("A_ProvisionWindow", (6.30, -0.15, 2.0), (0.95, 0.14, 1.15), c, root, rot=0.43)
    add_compass_finial("A", 0, -5.73, 3.32, c, root)
    add_approach(c, root, y0=-9.0, turn=0.2)
    return c, root


def wayfarer_l():
    c, root = new_study("B_WayfarerL")
    add_rect_mass("B_GreatHall", 1.4, 1.65, 10.2, 5.6, 3.0, 2.0, c, root)
    add_rect_mass("B_RecordGallery", -3.75, -1.65, 4.9, 9.0, 2.65, 1.55, c, root, rot=math.pi/2)
    add_oct_mass("B_ChartTower", 4.25, -1.60, 2.55, 3.65, 2.1, c, root, angle=0)
    # A clipped kitchen/provision bay makes the back edge asymmetrical.
    bay = [(-0.8, 3.8), (2.6, 3.8), (3.5, 4.7), (2.6, 6.0), (-0.8, 6.0)]
    prism("B_ProvisionBayBase", [(x, y) for x, y in bay], 0, 0.70, M["stone"], c, root)
    prism("B_ProvisionBay", bay, 0.70, 2.45, M["plaster"], c, root)
    poly_roof("B_ProvisionBayRoof", [(x*1.04, (y-4.9)*1.08+4.9) for x, y in bay], 3.15, 4.45, M["roof_gold"], c, root, 0.16)
    # Deep corner porch follows the L instead of centring on a box facade.
    for x in (-5.25, -2.25):
        cube("B_PorchPost", (x, -6.35, 1.55), (0.28, 0.28, 3.10), M["timber"], c, root)
    gable_roof("B_EntryGable", -3.75, -5.70, 3.9, 3.1, 3.15, 4.45, 0, M["roof_gold"], c, root)
    add_door("B_Arrival", (-3.75, -5.92, 1.60), (1.45, 0.20, 2.55), c, root)
    add_window("B_TallWindow", (5.05, 1.0, 2.15), (0.16, 1.10, 1.35), c, root)
    add_compass_finial("B", 4.25, -4.20, 4.25, c, root)
    add_approach(c, root, x=-3.75, y0=-9.3, turn=1.1)
    return c, root


def three_roads_hall():
    c, root = new_study("C_ThreeRoadsHall")
    add_rect_mass("C_CentralNave", 0, 0, 5.7, 11.0, 3.15, 2.15, c, root)
    add_oct_mass("C_RecordsBay", -4.15, 1.10, 2.65, 2.75, 1.55, c, root, sides=6, angle=math.pi/6)
    add_oct_mass("C_ProvisionBay", 4.10, 0.35, 3.05, 2.95, 1.80, c, root, sides=8, angle=math.pi/8)
    rear = regular_points(0, 5.35, 2.75, 6, math.pi/6)
    prism("C_TeachingApseBase", regular_points(0, 5.35, 2.95, 6, math.pi/6), 0, 0.72, M["stone"], c, root)
    prism("C_TeachingApse", rear, 0.72, 2.75, M["plaster"], c, root)
    poly_roof("C_TeachingApseRoof", regular_points(0, 5.35, 3.15, 6, math.pi/6), 3.47, 5.05, M["roof_gold"], c, root, 0.10)
    # Diamond entry porch introduces a diagonal before the cardinal interior.
    porch = regular_points(0, -5.65, 2.45, 4, math.pi/4)
    prism("C_EntryPlinth", regular_points(0, -5.65, 2.65, 4, math.pi/4), 0, 0.35, M["stone_light"], c, root)
    for i in (0, 2):
        x, y = porch[i]
        cube("C_PorchPost", (x, y, 1.62), (0.28, 0.28, 3.25), M["timber"], c, root)
    poly_roof("C_DiamondEntryRoof", regular_points(0, -5.65, 2.90, 4, math.pi/4), 3.18, 4.82, M["roof_gold"], c, root, 0.05)
    add_door("C_Arrival", (0, -5.48, 1.60), (1.42, 0.20, 2.55), c, root)
    add_window("C_RecordWindow", (-6.35, 1.10, 2.0), (0.15, 1.0, 1.20), c, root)
    add_window("C_ProvisionWindow", (6.60, 0.35, 2.0), (0.15, 1.0, 1.20), c, root)
    add_compass_finial("C", 0, -8.15, 3.45, c, root)
    add_approach(c, root, y0=-9.6, turn=2.0)
    return c, root


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_render():
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.color = (0.035, 0.045, 0.035)
    scene.view_settings.look = "AgX - Medium High Contrast"
    # Low-poly landscape plate.
    bpy.ops.mesh.primitive_cylinder_add(vertices=18, radius=12.5, depth=0.35, location=(0, 0, -0.22))
    ground = bpy.context.object
    ground.name = "Study_Ground"
    ground.data.materials.append(M["grass"])
    for p in ground.data.polygons:
        p.use_smooth = False
    # Camera approximates the game's elevated readable angle.
    bpy.ops.object.camera_add(location=(17.5, -21.5, 18.5))
    cam = bpy.context.object
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = 23.5
    look_at(cam, (0, 0, 2.3))
    scene.camera = cam
    bpy.ops.object.light_add(type="SUN", location=(6, -8, 16))
    sun = bpy.context.object
    sun.rotation_euler = (math.radians(28), math.radians(-18), math.radians(-28))
    sun.data.energy = 2.2
    sun.data.color = (1.0, 0.76, 0.48)
    bpy.ops.object.light_add(type="AREA", location=(-7, -4, 13))
    area = bpy.context.object
    area.data.energy = 1050
    area.data.shape = "DISK"
    area.data.size = 11
    area.data.color = (0.62, 0.75, 1.0)
    look_at(area, (0, 0, 1.5))
    return ground, cam


def hierarchy(root):
    rows = [root]
    for child in root.children_recursive:
        rows.append(child)
    return rows


def render_and_export(studies, ground, cam):
    scene = bpy.context.scene
    iso_loc = cam.location.copy()
    iso_rot = cam.rotation_euler.copy()
    iso_scale = cam.data.ortho_scale
    for key, collection, root in studies:
        for _, c, _ in studies:
            c.hide_render = c != collection
        scene.render.filepath = str(OUT / f"{key}.png")
        bpy.ops.render.render(write_still=True)
        # A top-down silhouette gate prevents an attractive isometric angle
        # from disguising a rectangular footprint.
        cam.location = (0.0, -0.001, 30.0)
        cam.rotation_euler = (0.0, 0.0, 0.0)
        look_at(cam, (0.0, 0.0, 0.0))
        cam.data.ortho_scale = 23.0
        scene.render.filepath = str(OUT / f"{key}_plan.png")
        bpy.ops.render.render(write_still=True)
        cam.location = iso_loc
        cam.rotation_euler = iso_rot
        cam.data.ortho_scale = iso_scale
        bpy.ops.object.select_all(action="DESELECT")
        for o in hierarchy(root):
            o.select_set(True)
        bpy.context.view_layer.objects.active = root
        bpy.ops.export_scene.gltf(
            filepath=str(OUT / f"{key}.glb"),
            export_format="GLB",
            use_selection=True,
            export_apply=True,
            export_yup=True,
            export_materials="EXPORT",
        )
    for _, c, _ in studies:
        c.hide_render = False
    # Space the roots in the saved source file for easy inspection.
    studies[0][2].location.x = -18
    studies[1][2].location.x = 0
    studies[2][2].location.x = 18
    ground.hide_render = True
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "guide_hall_shape_studies.blend"))


def main():
    clean_scene()
    setup_materials()
    studies = [
        ("A_compass_court", *compass_court()),
        ("B_wayfarer_l", *wayfarer_l()),
        ("C_three_roads", *three_roads_hall()),
    ]
    ground, cam = setup_render()
    render_and_export(studies, ground, cam)
    print("GUIDE_HALL_STUDIES_READY", OUT)


if __name__ == "__main__":
    main()
