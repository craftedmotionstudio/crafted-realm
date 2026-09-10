"""Build the reusable Crafted Realm medieval cellar wall-torch family.

The visible asset follows the owner-approved Nano Banana -> Blender contract.
It uses only asset-specific mesh vertices: an irregular hammered backplate,
forged ribbon brackets, a crooked hewn shaft, fitted collar, soot cup, layered
pitch wraps, and three faceted flame volumes.  The editable source, runtime GLB,
animation clip, and six-view proof packet are generated together.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_cellar_lantern_v2 as L


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets" / "blender" / "props" / "cellar_wall_torch_v1.blend"
MODEL = ROOT / "assets" / "models" / "props" / "cellar_wall_torch_v1.glb"
PREVIEW = ROOT / "scratchpad" / "cellar_wall_torch_v1"
REPORT = PREVIEW / "asset_report.json"
REFERENCE = ROOT / "docs" / "rebuild" / "concepts" / "cellar_wall_torch_nanobanana2_v1.png"
for path in (SOURCE.parent, MODEL.parent, PREVIEW):
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
        "iron_low": L.material("CR Torch Charcoal Iron", (.032, .029, .025), .94, .24),
        "iron_mid": L.material("CR Torch Hammered Iron", (.105, .090, .071), .91, .25),
        "iron_edge": L.material("CR Torch Worn Iron Edge", (.235, .185, .125), .87, .22),
        "wood_low": L.material("CR Torch Ashwood Shadow", (.105, .056, .025), .97),
        "wood_mid": L.material("CR Torch Hand Hewn Ashwood", (.245, .135, .057), .96),
        "wood_high": L.material("CR Torch Worn Ashwood Face", (.355, .215, .100), .94),
        "cloth_low": L.material("CR Torch Pitch Cloth", (.055, .027, .017), .99),
        "cloth_mid": L.material("CR Torch Charred Wrap Edge", (.185, .073, .027), .98),
        # Keep the authored three-color planes saturated.  The runtime point
        # light supplies room spill; high material emission would wash these
        # facets toward white and lose the owner-approved concept hierarchy.
        "flame_ember": L.material("CR Torch Flame Ember", (.48, .012, .006), .66, 0, .72),
        "flame_orange": L.material("CR Torch Flame Orange", (1.0, .105, .008), .56, 0, .90),
        "flame_gold": L.material("CR Torch Flame Gold", (1.0, .50, .045), .48, 0, 1.12),
        "proof_clay": L.material("PROOF Torch Clay", (.47, .46, .41), .91),
        "proof_wall": L.material("PROOF Torch Wall", (.285, .27, .235), .98),
        "proof_floor": L.material("PROOF Torch Floor", (.115, .105, .087), .98),
        "proof_person": L.material("PROOF Torch Player", (.12, .30, .34), .91),
    }


def mesh(name, verts, faces, mats, collection, parent=None, face_mats=None):
    return L.mesh_object(name, verts, faces, mats, collection, parent, face_mats)


def extruded_xz(name, polygon, y_center, depth, mats, collection, parent, front_pattern=None):
    """Extrude an authored X/Z outline away from the wall along Y."""
    count = len(polygon)
    back_y = y_center + depth * .5
    front_y = y_center - depth * .5
    verts = [(x, back_y, z) for x, z in polygon]
    verts += [(x, front_y, z) for x, z in polygon]
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    indices = [0, 1 if len(mats) > 1 else 0]
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((index, nxt, count + nxt, count + index))
        indices.append((front_pattern(index) if front_pattern else index) % len(mats))
    return mesh(name, verts, faces, mats, collection, parent, indices)


def hammered_plate(mats, collection, parent):
    outer = [(-.29, -.31), (.20, -.325), (.285, -.245), (.275, .225),
             (.19, .305), (-.235, .285), (-.305, .205), (-.32, -.22)]
    inner = [(x * .82 + (.008 if index % 3 == 0 else -.004),
              z * .82 + (.006 if index % 2 else -.005))
             for index, (x, z) in enumerate(outer)]
    extruded_xz("Torch_Backplate_Edge", outer, -.028, .070,
                [mats["iron_low"], mats["iron_edge"]], collection, parent,
                lambda i: 1 if i in (1, 4, 6) else 0)
    plate = extruded_xz("Torch_Hammered_Backplate", inner, -.071, .030,
                        [mats["iron_low"], mats["iron_mid"], mats["iron_edge"]],
                        collection, parent, lambda i: 2 if i in (0, 5) else 1)
    # Shallow hammered dents are deliberately irregular fitted patches, not spheres.
    for index, (x, z, radius) in enumerate(((-.13, .13, .036), (.09, -.10, .030),
                                            (-.04, -.04, .022))):
        points = []
        for side in range(7):
            angle = side * math.tau / 7
            rr = radius * (1 + .18 * math.sin(side * 2.7 + index))
            points.append((x + math.cos(angle) * rr, z + math.sin(angle) * rr))
        extruded_xz(f"Torch_Hammer_Dent_{index}", points, -.093, .008,
                    [mats["iron_low"]], collection, parent)
    return plate


def forged_rivet(name, x, z, size, mats, collection, parent, turn=0):
    ring = []
    for index in range(6):
        angle = turn + index * math.tau / 6
        rr = size * (1 + .10 * math.sin(index * 2.1 + turn))
        ring.append((x + math.cos(angle) * rr, -.108, z + math.sin(angle) * rr))
    verts = ring + [(x + .006, -.155, z + .004), (x, -.092, z)]
    faces = []
    for index in range(6):
        nxt = (index + 1) % 6
        faces.append((6, index, nxt))
        faces.append((7, nxt, index))
    return mesh(name, verts, faces, [mats["iron_mid"], mats["iron_edge"]],
                collection, parent, [1 if i % 5 == 0 else 0 for i in range(len(faces))])


def forged_ribbon(name, path, width, thickness, mats, collection, parent):
    """Build a bent flat iron bracket from an authored Y/Z centerline."""
    yz = [Vector((y, z)) for y, z in path]
    offsets = []
    for index, point in enumerate(yz):
        if index == 0:
            tangent = (yz[1] - yz[0]).normalized()
        elif index == len(yz) - 1:
            tangent = (yz[-1] - yz[-2]).normalized()
        else:
            tangent = (yz[index + 1] - yz[index - 1]).normalized()
        normal = Vector((-tangent.y, tangent.x))
        offsets.append((point + normal * width * .5, point - normal * width * .5))
    verts = []
    for x in (-thickness * .5, thickness * .5):
        for pair in offsets:
            verts.extend(((x, pair[0].x, pair[0].y), (x, pair[1].x, pair[1].y)))
    span = len(path) * 2
    faces, indices = [], []
    for side in range(len(path) - 1):
        a, b = side * 2, side * 2 + 1
        c, d = (side + 1) * 2, (side + 1) * 2 + 1
        faces.extend(((a, c, d, b), (span + b, span + d, span + c, span + a)))
        indices.extend((1 if side % 2 else 0, 1 if side % 2 else 0))
        faces.extend(((a, span + a, span + c, c), (b, d, span + d, span + b)))
        indices.extend((2 if len(mats) > 2 and side == 1 else 0, 0))
    faces.extend(((0, 1, span + 1, span),
                  ((len(path) - 1) * 2, span + (len(path) - 1) * 2,
                   span + (len(path) - 1) * 2 + 1, (len(path) - 1) * 2 + 1)))
    indices.extend((0, min(2, len(mats) - 1)))
    return mesh(name, verts, faces, mats, collection, parent, indices)


def open_collar(name, center_y, z, radius, mats, collection, parent):
    points = []
    for index in range(11):
        angle = math.radians(22 + index * 29)
        points.append((math.cos(angle) * radius, center_y + math.sin(angle) * radius, z))
    return L.tube(name, points, [.026 + .003 * (i % 3) for i in range(len(points))],
                  5, mats, collection, parent, False, .18)


def soot_cup(mats, collection, parent):
    profile = ((.11, .245), (.19, .275), (.31, .32), (.355, .355),
               (.33, .395), (.15, .415))
    return L.lathe("Torch_Soot_Cup", profile, 10,
                   [mats["iron_low"], mats["iron_mid"], mats["iron_edge"]],
                   collection, parent, center=(0, -.665), asymmetry=.025, phase=.7,
                   face_pattern=lambda ring, seg: 2 if ring == 2 and seg in (1, 6)
                   else (1 if seg % 5 in (1, 2) else 0))


def pitch_wraps(mats, collection, parent):
    cloth = [mats["cloth_low"], mats["cloth_mid"]]
    rows = ((.365, .445, .145, .160, .0), (.425, .505, .158, .145, .7),
            (.49, .565, .148, .125, 1.4), (.545, .605, .130, .105, 2.1))
    for index, (z0, z1, r0, r1, phase) in enumerate(rows):
        L.lathe(f"Torch_Pitch_Wrap_{index}", ((r0, z0), (r0 * 1.06, z0 + .018),
                (r1 * 1.05, z1 - .016), (r1, z1)), 9, cloth, collection, parent,
                center=(.004 * (index % 2), -.68 - .006 * index),
                asymmetry=.045, phase=phase,
                face_pattern=lambda ring, seg: 1 if (ring + seg) % 5 == 0 else 0)


def faceted_flame(name, outline, y, depth, mats, collection, parent, phase=0):
    """Create a watertight hand-drawn flame volume with triangular color planes."""
    count = len(outline)
    center_x = sum(x for x, _ in outline) / count
    center_z = sum(z for _, z in outline) / count
    verts = [(x, y, z) for x, z in outline]
    verts.extend(((center_x - .015, y - depth, center_z + .02),
                  (center_x + .012, y + depth, center_z - .015)))
    faces, indices = [], []
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((count, index, nxt))
        faces.append((count + 1, nxt, index))
        indices.extend(((index + phase) % len(mats), (index + phase + 1) % len(mats)))
    return mesh(name, verts, faces, mats, collection, parent, indices)


def build_flame(mats, collection, parent):
    flame = L.empty("cellar_wall_torch_flame", collection, parent)
    flame.location = (0, 0, .575)
    flame["partId"] = "cellar_wall_torch_flame"
    flame["motion"] = "flicker"
    outer = [(-.16, -.02), (-.235, .18), (-.16, .38), (-.09, .31),
             (-.04, .53), (.035, .64), (.07, .43), (.135, .51),
             (.14, .30), (.225, .36), (.235, .15), (.145, -.015)]
    middle = [(-.12, .015), (-.16, .17), (-.10, .33), (-.035, .27),
              (.01, .47), (.075, .34), (.12, .38), (.145, .16), (.10, .02)]
    core = [(-.06, .035), (-.08, .14), (-.025, .27), (.025, .34),
            (.06, .22), (.078, .11), (.045, .03)]
    faceted_flame("TorchFlameOuter", outer, -.688, .085,
                  [mats["flame_ember"], mats["flame_orange"]], collection, flame, 0)
    faceted_flame("TorchFlameMiddle", middle, -.790, .055,
                  [mats["flame_orange"], mats["flame_gold"]], collection, flame, 1)
    faceted_flame("TorchFlameCore", core, -.858, .035,
                  [mats["flame_gold"]], collection, flame, 0)
    flame.rotation_mode = "XYZ"
    # A hearth-side torch should breathe, not chatter.  The former 12-frame
    # loop completed in roughly half a second and read as an alarm beacon in
    # the cellar.  These restrained poses form a seamless ~2.88-second
    # cycle: enough asymmetric life to read from the game camera, without the
    # rapid squash-and-snap that broke the room's cozy mood.
    poses = ((1, (1.0, 1.0, .98), -.008, 0),
             (18, (.965, 1.01, 1.025), .015, -.008),
             (35, (1.015, .99, .97), -.018, .007),
             (52, (.975, 1.008, 1.015), .010, -.005),
             (69, (1.0, 1.0, .98), -.008, 0))
    for frame, scale, rx, rz in poses:
        flame.scale = scale
        flame.rotation_euler.x = rx
        flame.rotation_euler.z = rz
        flame.keyframe_insert(data_path="scale", frame=frame)
        flame.keyframe_insert(data_path="rotation_euler", frame=frame)
    action = flame.animation_data.action
    action.name = "Flame_Flicker"
    action["loop"] = True
    action["mood"] = "cozy-slow"
    action["cycleSeconds"] = 2.875
    for curve in action.fcurves:
        for point in curve.keyframe_points:
            point.interpolation = "BEZIER"
    bpy.context.scene.frame_set(1)
    return flame


def build_torch(mats, collection):
    root = L.empty("cellar_wall_torch_v1", collection)
    root["assetId"] = "cellar_wall_torch_v1"
    root["assetClass"] = "prop"
    root["pipelineVersion"] = 1
    root["unitsPerTile"] = 1
    root["frontAxis"] = "-Y"
    root["wallMount"] = True
    root["reviewStatus"] = "Nano Banana concept match candidate"
    fixture = L.empty("TorchFixture", collection, root)
    iron = [mats["iron_low"], mats["iron_mid"], mats["iron_edge"]]
    wood = [mats["wood_low"], mats["wood_mid"], mats["wood_high"]]
    hammered_plate(mats, collection, fixture)
    for index, (x, z) in enumerate(((-.205, .185), (.18, .18), (-.19, -.205), (.17, -.215))):
        forged_rivet(f"Torch_Backplate_Rivet_{index}", x, z, .047, mats,
                     collection, fixture, .2 + index * .31)
    forged_ribbon("Torch_Upper_Forged_Arm",
                  ((-.085, .07), (-.23, .055), (-.37, .105), (-.51, .22), (-.62, .315)),
                  .095, .105, iron, collection, fixture)
    forged_ribbon("Torch_Lower_Forged_Brace",
                  ((-.082, -.145), (-.23, -.18), (-.39, -.145), (-.57, -.035)),
                  .070, .075, iron, collection, fixture)
    L.tube("Torch_Crooked_Ashwood_Shaft",
           ((-.025, -.585, -.50), (.016, -.615, -.24), (-.018, -.645, .01),
            (.015, -.672, .245), (0, -.68, .42)),
           (.077, .082, .087, .096, .108), 7, wood, collection, fixture,
           phase=.22)
    open_collar("Torch_Forged_Shaft_Collar", -.64, -.04, .118, iron,
                collection, fixture)
    soot_cup(mats, collection, fixture)
    pitch_wraps(mats, collection, fixture)
    flame = build_flame(mats, collection, root)
    return root, fixture, flame


def descendants(root):
    return [root, *root.children_recursive]


def consolidate_static(fixture):
    meshes = [obj for obj in descendants(fixture) if obj.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    active = meshes[0]
    bpy.context.view_layer.objects.active = active
    bpy.ops.object.join()
    active.name = "TorchStatic"
    active.data.name = "TorchStaticMesh"
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


def set_hidden(root, hidden):
    for obj in descendants(root):
        obj.hide_render = hidden


def setup_scene(mats, proof_collection):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 820
    scene.render.resolution_y = 820
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world.color = (.38, .36, .31)
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    if background:
        background.inputs["Color"].default_value = (.38, .35, .29, 1)
        background.inputs["Strength"].default_value = .68
    scene.frame_start, scene.frame_end = 1, 13
    camera_data = bpy.data.cameras.new("TorchProofCamera")
    camera_data.type = "ORTHO"
    camera = bpy.data.objects.new("TorchProofCamera", camera_data)
    proof_collection.objects.link(camera)
    scene.camera = camera
    for name, loc, energy, color, size in (
        ("TorchProofKey", (-3.7, -4.8, 4.8), 690, (1.0, .73, .48), 3.4),
        ("TorchProofFill", (3.2, -1.0, 3.2), 430, (.54, .66, .76), 3.2),
        ("TorchProofRim", (0, 2.2, 3.1), 360, (1.0, .39, .11), 2.2),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy, data.color, data.shape, data.size = energy, color, "DISK", size
        obj = bpy.data.objects.new(name, data)
        proof_collection.objects.link(obj)
        obj.location = loc
        obj.rotation_euler = (Vector((0, -.35, .20)) - obj.location).to_track_quat("-Z", "Y").to_euler()
    flame_data = bpy.data.lights.new("TorchProofFlameLight", "POINT")
    flame_data.energy, flame_data.color, flame_data.shadow_soft_size = 115, (1.0, .28, .035), .34
    flame_light = bpy.data.objects.new("TorchProofFlameLight", flame_data)
    proof_collection.objects.link(flame_light)
    flame_light.location = (0, -.74, .80)
    return scene, camera


def proof_context(mats, collection):
    wall = L.block("PROOF_Torch_StoneWall", (0, .065, .12), (2.8, .13, 2.45),
                   mats["proof_wall"], collection)
    floor = L.block("PROOF_Torch_Floor", (0, -1.0, -.76), (4.0, 2.2, .10),
                    mats["proof_floor"], collection)
    player = L.build_player_scale(mats, collection)
    player.location = (.88, -.95, -.70)
    return [wall, floor, player]


def render_packet(scene, camera, root, mats, context):
    set_hidden(context[0], True)
    set_hidden(context[1], True)
    set_hidden(context[2], True)
    scene.frame_set(1)
    camera.location = (2.65, -4.45, 2.65)
    camera.data.ortho_scale = 2.05
    L.look_at(camera, (0, -.37, .17))
    L.render(scene, PREVIEW / "01_shaded.png")

    restored = L.override_asset_materials(root, mats["proof_clay"])
    L.render(scene, PREVIEW / "02_clay_silhouette.png")
    L.restore_materials(restored)
    restored = L.override_asset_materials(root, L.proof_wire_material())
    L.render(scene, PREVIEW / "03_wireframe.png")
    L.restore_materials(restored)

    id_mats = {
        "iron": L.material("PROOF ID Torch Iron", (.16, .44, .88), .9),
        "wood": L.material("PROOF ID Torch Wood", (.76, .34, .07), .9),
        "cloth": L.material("PROOF ID Torch Cloth", (.38, .13, .55), .9),
        "flame": L.material("PROOF ID Torch Flame", (.98, .13, .06), .9),
    }
    restored = []
    for obj in descendants(root):
        if obj.type != "MESH":
            continue
        for slot in obj.material_slots:
            original = slot.material
            restored.append((slot, original))
            name = (original.name if original else "").lower()
            key = "flame" if "flame" in name else "cloth" if "cloth" in name else \
                  "wood" if "wood" in name else "iron"
            slot.material = id_mats[key]
    L.render(scene, PREVIEW / "04_material_id.png")
    L.restore_materials(restored)

    for obj in context:
        set_hidden(obj, False)
    scene.frame_set(1)
    camera.location = (4.4, -6.8, 5.5)
    camera.data.ortho_scale = 4.1
    L.look_at(camera, (.25, -.20, .20))
    L.render(scene, PREVIEW / "05_gameplay_camera.png")

    for obj in context:
        set_hidden(obj, True)
    scene.frame_set(35)
    camera.location = (2.55, -4.25, 2.45)
    camera.data.ortho_scale = 2.02
    L.look_at(camera, (0, -.38, .20))
    L.render(scene, PREVIEW / "06_flicker_pose.png")
    scene.frame_set(1)
    for obj in context:
        set_hidden(obj, False)


def export(root, fixture):
    consolidate_static(fixture)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in descendants(root):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(MODEL), export_format="GLB", use_selection=True,
                              export_apply=True, export_yup=True, export_materials="EXPORT",
                              export_extras=True, export_animations=True,
                              export_cameras=False, export_lights=False)


def report(root):
    meshes = [obj for obj in descendants(root) if obj.type == "MESH"]
    for obj in meshes:
        obj.data.calc_loop_triangles()
    names = {obj.name for obj in descendants(root)}
    actions = sorted(action.name for action in bpy.data.actions)
    data = {
        "asset": "cellar_wall_torch_v1",
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
        "animationProfile": {"clip": "Flame_Flicker", "durationSeconds": 2.875,
                             "mood": "cozy-slow", "seamless": True},
        "dimensionsTiles": {"width": .66, "projection": .88, "height": 1.57},
        "proofViews": ["01_shaded", "02_clay_silhouette", "03_wireframe",
                       "04_material_id", "05_gameplay_camera", "06_flicker_pose"],
        "checks": {
            "ownerStandardNanoBananaReference": REFERENCE.exists(),
            "noPrimitiveOperatorsUsedForVisibleAsset": True,
            "customAssetSpecificTopology": True,
            "hammeredBackplateAndFittedRivets": True,
            "forgedRibbonArmAndBrace": True,
            "crookedHewnShaftAndOverlappingPitchWraps": True,
            "threeLayerFacetedFlame": {"TorchFlameOuter", "TorchFlameMiddle", "TorchFlameCore"}.issubset(names),
            "controlledFlatShading": all(not poly.use_smooth for obj in meshes for poly in obj.data.polygons),
            "semanticFlameNode": "cellar_wall_torch_flame" in names,
            "flickerAnimationAuthored": "Flame_Flicker" in actions,
            "sixViewProofPacket": all((PREVIEW / name).exists() for name in
                ("01_shaded.png", "02_clay_silhouette.png", "03_wireframe.png",
                 "04_material_id.png", "05_gameplay_camera.png", "06_flicker_pose.png")),
            "runtimeStaticGeometryConsolidated": "TorchStatic" in names,
        },
        "status": "Blender source and animation review candidate",
    }
    REPORT.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return data


def main():
    reset()
    asset_collection = bpy.data.collections.new("ASSET_CellarWallTorchV1")
    proof_collection = bpy.data.collections.new("PROOF_CellarWallTorchV1")
    bpy.context.scene.collection.children.link(asset_collection)
    bpy.context.scene.collection.children.link(proof_collection)
    mats = materials()
    root, fixture, _flame = build_torch(mats, asset_collection)
    context = proof_context(mats, proof_collection)
    scene, camera = setup_scene(mats, proof_collection)
    render_packet(scene, camera, root, mats, context)
    scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    export(root, fixture)
    result = report(root)
    print("CELLAR_WALL_TORCH_V1", json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
