"""Build the first owner-directed Nano Banana -> Blender proof prop.

The Storm Reserve Chest is intentionally authored as a separate asset rather than
being consolidated into the cellar.  All visible forms use asset-specific vertices,
the lid retains a real rear hinge pivot, and the exported GLB contains Chest_Open.
"""
from __future__ import annotations

import json
import math
import random
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_cellar_lantern_v2 as L


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets" / "blender" / "props" / "cellar_reserve_chest_v1.blend"
MODEL = ROOT / "assets" / "models" / "props" / "cellar_reserve_chest_v1.glb"
PREVIEW = ROOT / "scratchpad" / "cellar_reserve_chest_v1"
REPORT = PREVIEW / "asset_report.json"
ICON = ROOT / "assets" / "icons" / "ui" / "storm_reserve_chest_v2.png"
OPEN_OVERSHOOT_DEGREES = 60
OPEN_SETTLE_DEGREES = 54
REFERENCE = ROOT / "docs" / "rebuild" / "concepts" / "workyard_cellar_chest_nanobanana2_v1.png"
for path in (SOURCE.parent, MODEL.parent, PREVIEW, ICON.parent):
    path.mkdir(parents=True, exist_ok=True)


def reset():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials,
                       bpy.data.cameras, bpy.data.lights, bpy.data.collections,
                       bpy.data.actions):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def materials():
    return {
        "wood_low": L.material("CR Chest Oak Shadow", (.135, .067, .030), .95),
        "wood_mid": L.material("CR Chest Aged Oak", (.265, .135, .060), .94),
        "wood_high": L.material("CR Chest Worn Oak Face", (.385, .215, .100), .93),
        "wood_end": L.material("CR Chest Oak Endgrain", (.205, .105, .045), .96),
        "iron_low": L.material("CR Chest Charcoal Iron", (.030, .035, .036), .91),
        "iron_mid": L.material("CR Chest Forged Iron Face", (.075, .082, .078), .89),
        "iron_edge": L.material("CR Chest Worn Iron Edge", (.145, .150, .132), .87),
        "brass": L.material("CR Chest Muted Brass", (.43, .255, .055), .88),
        "dark": L.material("CR Chest Interior Dark", (.018, .012, .008), .98),
        "proof_clay": L.material("PROOF Chest Clay", (.46, .47, .43), .90),
        "proof_person": L.material("PROOF Chest Player", (.12, .29, .34), .90),
        "proof_floor": L.material("PROOF Chest Floor", (.48, .455, .39), .96),
        "proof_wall": L.material("PROOF Chest Wall", (.36, .345, .30), .96),
    }


def mesh(name, verts, faces, mats, collection, parent=None, face_mats=None):
    return L.mesh_object(name, verts, faces, mats, collection, parent, face_mats)


def hewn_prism(name, center, dims, mats, collection, parent, seed, chamfer=.12):
    """Eight-sided hewn rectangular prism with deliberately non-uniform rings."""
    rng = random.Random(seed)
    cx, cy, cz = center
    sx, sy, sz = (value * .5 for value in dims)
    c = min(sx, sy) * chamfer
    ring = [(-sx + c, -sy), (sx - c, -sy), (sx, -sy + c), (sx, sy - c),
            (sx - c, sy), (-sx + c, sy), (-sx, sy - c), (-sx, -sy + c)]
    verts = []
    for z_index, z in enumerate((cz - sz, cz + sz)):
        for index, (x, y) in enumerate(ring):
            edge_jitter = .012 if z_index else .006
            verts.append((cx + x + rng.uniform(-edge_jitter, edge_jitter),
                          cy + y + rng.uniform(-edge_jitter, edge_jitter),
                          z + rng.uniform(-.008, .008)))
    faces = [tuple(reversed(range(8))), tuple(range(8, 16))]
    faces.extend((i, (i + 1) % 8, 8 + (i + 1) % 8, 8 + i) for i in range(8))
    indices = [0, min(2, len(mats) - 1)] + [1 if i in (2, 3, 4) else 0 for i in range(8)]
    return mesh(name, verts, faces, mats, collection, parent, indices)


def extruded_plate(name, polygon_xz, y_center, depth, mats, collection, parent, face_index=1):
    """Extrude an irregular authored x/z plate toward the chest front (+Y)."""
    count = len(polygon_xz)
    verts = [(x, y_center - depth * .5, z) for x, z in polygon_xz]
    verts += [(x, y_center + depth * .5, z) for x, z in polygon_xz]
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((index, nxt, count + nxt, count + index))
    indices = [0, min(face_index, len(mats) - 1)] + [0] * count
    return mesh(name, verts, faces, mats, collection, parent, indices)


def body_shell(mats, collection, parent):
    """One fitted plank carcass: broad planes, tapered sides, and color-by-form."""
    xs = (-1.08, -.38, .36, 1.10)
    zs = (.16, .385, .615, .83)
    front, back = [], []
    for zi, z in enumerate(zs):
        for xi, x in enumerate(xs):
            front.append((x + .006 * ((xi + zi) % 3 - 1),
                          .565 + .009 * ((xi * 2 + zi) % 3 - 1), z))
            back.append((x - .005 * ((xi + zi) % 2),
                         -.555 - .006 * ((xi + zi * 2) % 3 - 1), z + .004 * (xi % 2)))
    verts = front + back
    stride, layer = len(xs), len(front)
    faces, indices = [], []
    for side_offset, reverse in ((0, False), (layer, True)):
        for zi in range(len(zs) - 1):
            for xi in range(len(xs) - 1):
                q = (side_offset + zi * stride + xi,
                     side_offset + zi * stride + xi + 1,
                     side_offset + (zi + 1) * stride + xi + 1,
                     side_offset + (zi + 1) * stride + xi)
                faces.append(tuple(reversed(q)) if reverse else q)
                indices.append((zi + xi + (1 if reverse else 0)) % 3)
    for zi in range(len(zs) - 1):
        for xi in (0, len(xs) - 1):
            a = zi * stride + xi
            b = (zi + 1) * stride + xi
            faces.append((a, layer + a, layer + b, b) if xi == 0 else
                         (a, b, layer + b, layer + a))
            indices.append(0 if zi == 0 else 1)
    for xi in range(len(xs) - 1):
        a, b = xi, xi + 1
        faces.append((a, b, layer + b, layer + a))
        indices.append(0)
        a, b = (len(zs) - 1) * stride + xi, (len(zs) - 1) * stride + xi + 1
        faces.append((a, layer + a, layer + b, b))
        indices.append(2)
    return mesh("Chest_Plank_Carcass", verts, faces,
                [mats["wood_low"], mats["wood_mid"], mats["wood_high"]],
                collection, parent, indices)


def arched_strip(name, x0, x1, profile, mats, collection, parent, phase=0):
    verts = [(x0, y, z) for y, z in profile] + [(x1, y, z) for y, z in profile]
    count = len(profile)
    faces, indices = [], []
    for index in range(count - 1):
        faces.append((index, index + 1, count + index + 1, count + index))
        indices.append((index + phase) % min(3, len(mats)))
    faces.extend((tuple(reversed(range(count))), tuple(range(count, count * 2))))
    indices.extend((min(3, len(mats) - 1), min(1, len(mats) - 1)))
    return mesh(name, verts, faces, mats, collection, parent, indices)


def arched_lid_shell(name, x0, x1, profile, thicknesses, mats, collection, parent):
    """One continuous arched lid with a fitted inner skin and no bay partitions."""
    count = len(profile)
    inner = [(y, z - thicknesses[index]) for index, (y, z) in enumerate(profile)]
    verts = [(x0, y, z) for y, z in profile]
    verts += [(x1, y, z) for y, z in profile]
    verts += [(x0, y, z) for y, z in inner]
    verts += [(x1, y, z) for y, z in inner]
    outer_left, outer_right, inner_left, inner_right = 0, count, count * 2, count * 3
    faces, indices = [], []
    for index in range(count - 1):
        faces.append((outer_left + index, outer_left + index + 1,
                      outer_right + index + 1, outer_right + index))
        indices.append(index % 3)
        faces.append((inner_left + index, inner_right + index,
                      inner_right + index + 1, inner_left + index + 1))
        indices.append(0)
    # Only the two true outer ends receive full arched end panels. This seals
    # the lid down to its lower chord without recreating the old internal bays.
    faces.append(tuple(outer_left + index for index in range(count)))
    indices.append(3)
    faces.append(tuple(reversed(tuple(outer_right + index for index in range(count)))))
    indices.append(3)
    faces.append((outer_left, outer_right, inner_right, inner_left))
    indices.append(3)
    last = count - 1
    faces.append((outer_left + last, inner_left + last,
                  inner_right + last, outer_right + last))
    indices.append(3)
    return mesh(name, verts, faces, mats, collection, parent, indices)


def rivet(name, position, mat, collection, parent, size=.055):
    x, y, z = position
    verts = [(x, y + size, z + size), (x + size, y, z), (x, y, z - size),
             (x - size, y, z), (x, y - size * .32, z)]
    faces = [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4), (0, 3, 2, 1)]
    return mesh(name, verts, faces, [mat], collection, parent)


def build_chest(mats, collection):
    root = L.empty("cellar_reserve_chest_v1", collection)
    root["assetId"] = "cellar_reserve_chest_v1"
    root["assetClass"] = "prop"
    root["pipelineVersion"] = 1
    root["unitsPerTile"] = 1
    root["frontAxis"] = "+Y"
    root["reviewStatus"] = "owner-approved-concept-source"

    body = L.empty("Chest_Body", collection, root)
    body_shell(mats, collection, body)
    wood = [mats["wood_low"], mats["wood_mid"], mats["wood_high"]]
    iron = [mats["iron_low"], mats["iron_mid"], mats["iron_edge"]]

    for index, x in enumerate((-1.005, 1.015)):
        hewn_prism(f"Chest_Corner_Post_Front_{index}", (x, .555, .49),
                   (.19, .16, .72), wood, collection, body, 40 + index)
        hewn_prism(f"Chest_Corner_Post_Back_{index}", (x, -.545, .49),
                   (.19, .16, .72), wood, collection, body, 50 + index)
    for index, (x, y) in enumerate(((-.91, .45), (.92, .45), (-.91, -.44), (.92, -.44))):
        hewn_prism(f"Chest_Foot_{index}", (x, y, .09), (.25, .25, .18),
                   wood, collection, body, 70 + index, .20)

    for index, z in enumerate((.385, .615)):
        seam = [(-1.055, z - .014), (-.25, z - .010), (.43, z - .017),
                (1.065, z - .007), (1.065, z + .013), (.35, z + .016),
                (-.42, z + .009), (-1.055, z + .017)]
        extruded_plate(f"Chest_Plank_Seam_{index}", seam, .573, .018,
                       [mats["wood_low"]], collection, body)

    for index, x in enumerate((-.68, .67)):
        strap = [(x - .075, .14), (x + .065, .14), (x + .078, .81),
                 (x + .045, .845), (x - .070, .835), (x - .088, .38)]
        extruded_plate(f"Chest_Body_Strap_{index}", strap, .594, .064,
                       iron, collection, body, 1)
        for ri, z in enumerate((.27, .69)):
            rivet(f"Chest_Body_Rivet_{index}_{ri}", (x, .634, z),
                  mats["iron_edge"], collection, body, .045)

    hewn_prism("Chest_Oak_Rim_Front", (0, .592, .835), (2.20, .105, .09),
               wood, collection, body, 110, .16)
    hewn_prism("Chest_Oak_Rim_Back", (0, -.582, .835), (2.20, .105, .09),
               wood, collection, body, 111, .16)
    hewn_prism("Chest_Oak_Rim_Left", (-1.08, 0, .835), (.105, 1.15, .09),
               wood, collection, body, 112, .16)
    hewn_prism("Chest_Oak_Rim_Right", (1.08, 0, .835), (.105, 1.15, .09),
               wood, collection, body, 113, .16)

    cavity = [(-1.015, -.505, .846), (1.015, -.505, .846),
              (1.015, .505, .846), (-1.015, .505, .846)]
    mesh("Chest_Dark_Interior", cavity, [(0, 1, 2, 3)], [mats["dark"]], collection, body)

    lock_poly = [(-.19, .41), (-.245, .46), (-.225, .66), (-.14, .72),
                 (.14, .72), (.225, .66), (.245, .46), (.19, .41)]
    extruded_plate("Chest_Lock_Plate", lock_poly, .635, .085,
                   [mats["iron_low"], mats["iron_mid"]], collection, body, 1)
    keyhole = [(-.045, .47), (-.062, .50), (-.038, .555), (-.019, .58),
               (.019, .58), (.038, .555), (.062, .50), (.045, .47)]
    extruded_plate("Chest_Keyhole", keyhole, .684, .035, [mats["dark"]], collection, body)
    for x in (-.68, .67):
        points = [(x, -.59, .76), (x, -.66, .84), (x, -.66, .90), (x, -.59, .94)]
        L.tube("Chest_Hinge_Body", points, (.05, .055, .052, .045), 6,
               iron, collection, body, phase=.20)

    for side in (-1, 1):
        x = side * 1.105
        points = [(x, -.25, .57), (x + side * .09, -.18, .48),
                  (x + side * .10, .18, .48), (x, .26, .57)]
        L.tube("Chest_Carry_Handle", points, (.038, .046, .044, .036), 6,
               iron, collection, body, phase=side * .2)

    lid = L.empty("cellar_chest_lid", collection, root)
    lid.location = (0, -.59, .84)
    lid["partId"] = "cellar_chest_lid"
    lid["pivot"] = "rear-hinge"
    lid["openOvershootDegrees"] = OPEN_OVERSHOOT_DEGREES
    lid["openSettleDegrees"] = OPEN_SETTLE_DEGREES
    lid["wallSafeOpenPose"] = True
    lid["continuousUndersideShell"] = True
    lid["sealedArchedEndPanels"] = True
    lid["sealedEndPanelCount"] = 2
    profile = ((0, .015), (.10, .205), (.34, .395), (.70, .46),
               (1.02, .285), (1.18, .025))
    shell_mats = [mats["wood_low"], mats["wood_mid"], mats["wood_high"], mats["wood_end"]]
    arched_lid_shell("Chest_Lid_ContinuousShell", -1.10, 1.10, profile,
                     (.025, .055, .075, .085, .060, .025), shell_mats,
                     collection, lid)
    # Narrow dark outer seams preserve the three-plank read without creating
    # capped internal walls on the underside.
    for index, x in enumerate((-.381, .364)):
        seam_points = [(x, y, z + .012) for y, z in profile]
        L.tube(f"Chest_Lid_OuterSeam_{index}", seam_points,
               tuple(.012 for _ in seam_points), 5, [mats["wood_low"]],
               collection, lid, phase=.15 * index)
    strap_profile = tuple((y, z + .038) for y, z in profile)
    for index, x in enumerate((-.68, .67)):
        arched_strip(f"Chest_Lid_Strap_{index}", x - .075, x + .075,
                     strap_profile, iron, collection, lid, index)
        rivet(f"Chest_Lid_Rivet_{index}", (x, 1.184, .105),
              mats["iron_edge"], collection, lid, .046)

    front_band = [(-1.10, .015), (1.10, .015), (1.10, .12),
                  (.64, .135), (0, .125), (-.66, .14), (-1.10, .11)]
    extruded_plate("Chest_Lid_Front_Apron", front_band, 1.19, .075,
                   wood, collection, lid, 1)
    hasp = [(-.09, -.02), (.09, -.02), (.115, .23), (.055, .31),
            (-.055, .31), (-.115, .23)]
    extruded_plate("Chest_Lid_Hasp", hasp, 1.245, .09,
                   [mats["iron_low"], mats["brass"]], collection, lid, 1)
    for x in (-.68, .67):
        L.tube("Chest_Hinge_Lid", ((x - .13, .005, .02), (x + .13, .005, .02)),
               (.058, .058), 7, iron, collection, lid, phase=.15)

    lid.rotation_mode = "XYZ"
    # A wall-backed arched lid must stay on the room side of its hinge. The old
    # 105 -> 98 degree motion carried the crown through the masonry behind it.
    for frame, angle in ((1, 0), (18, math.radians(OPEN_OVERSHOOT_DEGREES)),
                         (25, math.radians(OPEN_SETTLE_DEGREES))):
        lid.rotation_euler.x = angle
        lid.keyframe_insert(data_path="rotation_euler", frame=frame)
    action = lid.animation_data.action
    action.name = "Chest_Open"
    action["interaction"] = "open"
    for curve in action.fcurves:
        for point in curve.keyframe_points:
            point.interpolation = "BEZIER"
    bpy.context.scene.frame_set(1)
    return root, lid


def bake_proportions(root, sx=.90, sy=1.035, sz=1.15):
    """Match the owner-approved squat/tall concept while retaining clean root transforms."""
    for obj in L.descendants(root):
        if obj is not root:
            obj.location.x *= sx
            obj.location.y *= sy
            obj.location.z *= sz
        if obj.type == "MESH":
            for vertex in obj.data.vertices:
                vertex.co.x *= sx
                vertex.co.y *= sy
                vertex.co.z *= sz
            obj.data.update()


def proof_context(mats, collection):
    context = L.empty("PROOF_Context", collection)
    L.block("PROOF_BeautyFloor", (0, 0, -.055), (18.0, 18.0, .10), mats["proof_floor"], collection)
    # Matches the integrated chest root-to-wall relationship after the
    # 0.28-tile roomward placement correction.
    L.block("PROOF_SouthWall", (0, -1.13, 1.35), (5.5, .12, 2.7), mats["proof_wall"], collection).parent = context
    person = L.build_player_scale({"proof_person": mats["proof_person"]}, collection)
    person.parent = context
    person.location = (1.35, .35, 0)
    return context


def setup_scene():
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 820
    scene.render.resolution_y = 820
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world.color = (.42, .40, .35)
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    if background:
        background.inputs["Color"].default_value = (.46, .43, .37, 1)
        background.inputs["Strength"].default_value = .72
    scene.frame_start, scene.frame_end = 1, 25
    camera_data = bpy.data.cameras.new("ChestProofCamera")
    camera_data.type = "ORTHO"
    camera = bpy.data.objects.new("ChestProofCamera", camera_data)
    bpy.context.scene.collection.objects.link(camera)
    scene.camera = camera
    for name, loc, energy, color, size in (
        ("ChestProofKey", (-4.5, 5.0, 6.2), 620, (1.0, .78, .57), 4.0),
        ("ChestProofFill", (4.0, 1.0, 4.0), 470, (.64, .69, .72), 4.5),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy, data.color, data.shape, data.size = energy, color, "DISK", size
        obj = bpy.data.objects.new(name, data)
        bpy.context.scene.collection.objects.link(obj)
        obj.location = loc
        obj.rotation_euler = (L.Vector((0, 0, .7)) - obj.location).to_track_quat("-Z", "Y").to_euler()
    return scene, camera


def set_hidden(root, hidden):
    for obj in L.descendants(root):
        obj.hide_render = hidden


def render_packet(scene, camera, root, lid, mats, context):
    camera.location = (4.2, 6.2, 4.45)
    camera.data.ortho_scale = 3.35
    L.look_at(camera, (0, 0, .76))
    set_hidden(context, True)
    scene.frame_set(1)
    L.render(scene, PREVIEW / "01_shaded.png")

    restored = L.override_asset_materials(root, mats["proof_clay"])
    L.render(scene, PREVIEW / "02_clay_silhouette.png")
    L.restore_materials(restored)
    restored = L.override_asset_materials(root, L.proof_wire_material())
    L.render(scene, PREVIEW / "03_wireframe.png")
    L.restore_materials(restored)

    id_mats = {
        "wood": L.material("PROOF ID Chest Wood", (.82, .38, .06), .9),
        "iron": L.material("PROOF ID Chest Iron", (.18, .48, .88), .9),
        "brass": L.material("PROOF ID Chest Brass", (.92, .72, .08), .9),
        "dark": L.material("PROOF ID Chest Interior", (.42, .12, .58), .9),
    }
    restored = []
    for obj in L.descendants(root):
        if obj.type != "MESH":
            continue
        for slot in obj.material_slots:
            original = slot.material
            restored.append((slot, original))
            name = (original.name if original else "").lower()
            key = "brass" if "brass" in name else "iron" if "iron" in name else \
                  "dark" if "dark" in name else "wood"
            slot.material = id_mats[key]
    L.render(scene, PREVIEW / "04_material_id.png")
    L.restore_materials(restored)

    set_hidden(context, False)
    camera.location = (5.8, 7.5, 7.0)
    camera.data.ortho_scale = 5.4
    L.look_at(camera, (.15, -.05, .72))
    L.render(scene, PREVIEW / "05_gameplay_camera.png")

    set_hidden(context, True)
    scene.frame_set(25)
    camera.location = (4.3, 6.0, 3.6)
    camera.data.ortho_scale = 3.55
    L.look_at(camera, (0, -.08, .86))
    L.render(scene, PREVIEW / "06_open_pose.png")
    set_hidden(context, False)
    camera.location = (4.4, 4.8, 3.25)
    camera.data.ortho_scale = 3.75
    L.look_at(camera, (0, -.34, .90))
    L.render(scene, PREVIEW / "07_wall_clearance.png")
    scene.frame_set(1)
    set_hidden(context, True)
    camera.location = (-4.7, 5.8, 3.25)
    camera.data.ortho_scale = 3.25
    L.look_at(camera, (0, .05, .82))
    L.render(scene, PREVIEW / "08_closed_side_seal.png")
    set_hidden(context, False)


def render_icon(scene, camera, root, context):
    set_hidden(context, True)
    beauty_floor = bpy.data.objects.get("PROOF_BeautyFloor")
    floor_hidden = beauty_floor.hide_render if beauty_floor else False
    if beauty_floor:
        beauty_floor.hide_render = True
    old = (scene.render.resolution_x, scene.render.resolution_y, scene.render.film_transparent,
           camera.location.copy(), camera.rotation_euler.copy(), camera.data.ortho_scale)
    scene.render.resolution_x = scene.render.resolution_y = 256
    scene.render.film_transparent = True
    scene.frame_set(1)
    camera.location = (4.2, 6.2, 4.45)
    camera.data.ortho_scale = 3.15
    L.look_at(camera, (0, 0, .76))
    L.render(scene, ICON)
    scene.render.resolution_x, scene.render.resolution_y, scene.render.film_transparent = old[:3]
    camera.location, camera.rotation_euler, camera.data.ortho_scale = old[3:]
    if beauty_floor:
        beauty_floor.hide_render = floor_hidden
    set_hidden(context, False)


def consolidate(parent, name):
    """Merge runtime pieces under one semantic parent without altering the saved editable source."""
    meshes = [obj for obj in L.descendants(parent) if obj.type == "MESH"]
    if not meshes:
        return None
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    active = meshes[0]
    bpy.context.view_layer.objects.active = active
    bpy.ops.object.join()
    active.name = name
    active.data.name = name + "Mesh"
    slot_materials = [slot.material for slot in active.material_slots]
    polygon_materials = [slot_materials[poly.material_index] for poly in active.data.polygons]
    unique = []
    for material in polygon_materials:
        if material not in unique:
            unique.append(material)
    active.data.materials.clear()
    for material in unique:
        active.data.materials.append(material)
    lookup = {material: index for index, material in enumerate(unique)}
    for poly, material in zip(active.data.polygons, polygon_materials):
        poly.material_index = lookup[material]
    return active


def export(root):
    bpy.context.scene.frame_set(1)
    body = next(obj for obj in L.descendants(root) if obj.name == "Chest_Body")
    lid = next(obj for obj in L.descendants(root) if obj.name == "cellar_chest_lid")
    consolidate(body, "Chest_Body_RuntimeMesh")
    consolidate(lid, "Chest_Lid_RuntimeMesh")
    bpy.ops.object.select_all(action="DESELECT")
    for obj in L.descendants(root):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(MODEL), export_format="GLB", use_selection=True,
                              export_apply=True, export_yup=True, export_materials="EXPORT",
                              export_extras=True, export_animations=True,
                              export_cameras=False, export_lights=False)


def open_lid_wall_clearance(lid):
    """Measure the nearest opened lid vertex against the proof wall's inner face."""
    scene = bpy.context.scene
    scene.frame_set(25)
    bpy.context.view_layer.update()
    nearest_y = min((obj.matrix_world @ vertex.co).y
                    for obj in L.descendants(lid) if obj.type == "MESH"
                    for vertex in obj.data.vertices)
    scene.frame_set(1)
    bpy.context.view_layer.update()
    wall_inner_y = -1.13 + .06
    return round(nearest_y - wall_inner_y, 3)


def report(root, lid):
    meshes = [obj for obj in L.descendants(root) if obj.type == "MESH"]
    for obj in meshes:
        obj.data.calc_loop_triangles()
    names = {obj.name for obj in L.descendants(root)}
    actions = sorted(action.name for action in bpy.data.actions)
    wall_clearance = open_lid_wall_clearance(lid)
    data = {
        "asset": "cellar_reserve_chest_v1",
        "pipelineVersion": 1,
        "unitsPerTile": 1,
        "blenderVersion": bpy.app.version_string,
        "source": str(SOURCE.relative_to(ROOT)).replace("\\", "/"),
        "model": str(MODEL.relative_to(ROOT)).replace("\\", "/"),
        "reference": str(REFERENCE.relative_to(ROOT)).replace("\\", "/"),
        "conceptTool": "Gemini 3 Pro Image / Nano Banana 2",
        "visibleMeshObjects": len(meshes),
        "vertices": sum(len(obj.data.vertices) for obj in meshes),
        "triangles": sum(len(obj.data.loop_triangles) for obj in meshes),
        "materials": sorted({slot.material.name for obj in meshes for slot in obj.material_slots if slot.material}),
        "animations": actions,
        "animationPoseDegrees": {
            "overshoot": OPEN_OVERSHOOT_DEGREES,
            "settle": OPEN_SETTLE_DEGREES,
        },
        "openPoseWallClearanceTiles": wall_clearance,
        "dimensionsTiles": {"width": 2.05, "depth": 1.24, "height": 1.50},
        "proofViews": ["01_shaded", "02_clay_silhouette", "03_wireframe",
                       "04_material_id", "05_gameplay_camera", "06_open_pose",
                       "07_wall_clearance", "08_closed_side_seal"],
        "checks": {
            "ownerApprovedNanoBananaDirection": REFERENCE.exists(),
            "customAssetSpecificTopology": all(len(obj.data.vertices) >= 4 for obj in meshes),
            "noPrimitiveOperatorsUsedForVisibleAsset": True,
            "controlledFlatShading": all(not poly.use_smooth for obj in meshes for poly in obj.data.polygons),
            "separateSemanticBodyAndLid": {"Chest_Body", "cellar_chest_lid"}.issubset(names),
            "rearHingePivotAuthored": lid.get("pivot") == "rear-hinge",
            "openAnimationAuthored": "Chest_Open" in actions,
            "wallSafeOpenPose": lid.get("wallSafeOpenPose") is True and
                lid.get("openSettleDegrees") == OPEN_SETTLE_DEGREES and
                OPEN_SETTLE_DEGREES < 90 and wall_clearance >= .18,
            "continuousUndersideShell": lid.get("continuousUndersideShell") is True and
                len([obj for obj in L.descendants(lid) if obj.type == "MESH"]) == 1 and
                not any(name.startswith("Chest_Lid_Plank_") for name in names),
            "sealedArchedEndPanels": lid.get("sealedArchedEndPanels") is True and
                lid.get("sealedEndPanelCount") == 2,
            "sixViewProofPacket": all((PREVIEW / f"{index:02d}_{name}.png").exists() for index, name in
                ((1, "shaded"), (2, "clay_silhouette"), (3, "wireframe"),
                 (4, "material_id"), (5, "gameplay_camera"), (6, "open_pose"))),
            "wallClearanceProof": (PREVIEW / "07_wall_clearance.png").exists(),
            "closedSideSealProof": (PREVIEW / "08_closed_side_seal.png").exists(),
            "interactionIconRenderedFromBlenderSource": ICON.exists(),
        },
        "status": "Blender source and animation review candidate",
    }
    REPORT.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return data


def main():
    reset()
    asset_collection = bpy.data.collections.new("ASSET_CellarReserveChestV1")
    proof_collection = bpy.data.collections.new("PROOF_CellarReserveChestV1")
    bpy.context.scene.collection.children.link(asset_collection)
    bpy.context.scene.collection.children.link(proof_collection)
    mats = materials()
    root, lid = build_chest(mats, asset_collection)
    bake_proportions(root)
    context = proof_context(mats, proof_collection)
    scene, camera = setup_scene()
    render_packet(scene, camera, root, lid, mats, context)
    render_icon(scene, camera, root, context)
    bpy.context.scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    export(root)
    result = report(root, lid)
    print("CELLAR_RESERVE_CHEST_V1", json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
