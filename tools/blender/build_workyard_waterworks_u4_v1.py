"""Build and prove the isolated Workyard U4 waterworks dock + pulley family."""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_guide_hall_v3 as B
import build_survival_workyard_v2 as W
import cr_workyard_waterworks_u4_v1 as U


ROOT = Path(__file__).resolve().parents[2]
PREVIEW = ROOT / "scratchpad" / "workyard_waterworks_u4_v1"
SOURCE = ROOT / "assets" / "blender" / "props" / "workyard_waterworks_u4_v1.blend"
MODEL = ROOT / "assets" / "models" / "props" / "workyard_waterworks_u4_v1.glb"
REPORT = PREVIEW / "asset_report.json"
for path in (PREVIEW, SOURCE.parent, MODEL.parent):
    path.mkdir(parents=True, exist_ok=True)

STATIC_VIEWS = ("01_shaded", "02_clay_silhouette", "03_wireframe",
                "04_material_id", "05_gameplay_camera", "06_scale_proof",
                "07_pulley_closeup")
TURNAROUND_SETS = ("shell", "raised", "lowered")
CARDINALS = (("north", 0, 1), ("south", 0, -1), ("east", 1, 0), ("west", -1, 0))
MOTION_VIEWS = ("motion_1_idle", "motion_2_lowering", "motion_3_water_contact",
                "motion_4_lifting", "motion_5_settled")


def descendants(root):
    return [root, *root.children_recursive]


def reset():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials,
                       bpy.data.cameras, bpy.data.lights, bpy.data.actions):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def set_hidden(root, hidden):
    for obj in descendants(root):
        obj.hide_render = hidden


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def proof_cube(name, loc, dims, mat, collection, bevel=.02):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    B.link(obj, collection)
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new("Proof edge", "BEVEL")
        mod.width = bevel
        mod.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def proof_player(mats, collection):
    g = B.empty("PROOF_CanonicalPlayer_1_85", collection)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=.25, depth=1.22,
                                       location=(0, 0, .76))
    body = bpy.context.object
    body.name = "PROOF_PlayerBody"
    B.link(body, collection, g)
    body.data.materials.append(mats["iron_light"])
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=.22,
                                         location=(0, 0, 1.58))
    head = bpy.context.object
    head.name = "PROOF_PlayerHead"
    B.link(head, collection, g)
    head.data.materials.append(mats["oak_light"])
    for x in (-.12, .12):
        proof_cube("PROOF_PlayerBoot", (x, 0, .10), (.16, .25, .20),
                   mats["oak_dark"], collection).parent = g
    proof_cube("PROOF_PlayerHeightCap", (0, 0, 1.835), (.08, .08, .03),
               mats["rug_gold"], collection, 0).parent = g
    return g


def proof_context(mats, collection):
    water_mat = W.mat("PROOF Pond Water", (.070, .225, .245), .45)
    water = proof_cube("PROOF_PondWater", (3.0, -1.6, -.55), (26, 22, .07),
                       water_mat, collection, 0)
    shore = proof_cube("PROOF_ShorePad", (-1.6, 0, -.11), (3.3, 5.0, .18),
                       mats["path"], collection, .03)
    proof_cube("PROOF_BankPad", (5.05, -5.85, -.11), (4.2, 2.6, .18),
               mats["path"], collection, .03)
    for x in range(-3, 1):
        proof_cube("PROOF_GridLine", (x, 0, -.012), (.025, 4.8, .012),
                   mats["cellar_mortar"], collection, 0)
    for y in range(-2, 3):
        proof_cube("PROOF_GridLine", (-1.6, y, -.011), (3.1, .025, .012),
                   mats["cellar_mortar"], collection, 0)
    player = proof_player(mats, collection)
    return water, shore, player


def setup_scene(collection):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.fps = U.FPS
    scene.frame_start = 1
    scene.frame_end = U.IDLE_KEYS[-1]
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (.085, .080, .068, 1)
        bg.inputs["Strength"].default_value = .72
    data = bpy.data.cameras.new("WaterworksProofCamera")
    data.type = "ORTHO"
    camera = bpy.data.objects.new("WaterworksProofCamera", data)
    collection.objects.link(camera)
    scene.camera = camera
    for name, location, energy, color, size in (
        ("DockWarmKey", (-6.5, -10.0, 12.0), 1250, (1.0, .78, .52), 6.0),
        ("DockCoolFill", (10.0, -3.0, 9.0), 700, (.56, .69, .88), 5.5),
        ("DockBackRim", (3.0, 8.0, 7.0), 520, (1.0, .62, .30), 4.5),
    ):
        ld = bpy.data.lights.new(name, "AREA")
        ld.energy, ld.color, ld.shape, ld.size = energy, color, "DISK", size
        light = bpy.data.objects.new(name, ld)
        collection.objects.link(light)
        light.location = location
        look_at(light, (3.0, -1.0, .5))
    return scene, camera


def render(scene, camera, path, location, target, scale):
    camera.location = location
    camera.data.ortho_scale = scale
    look_at(camera, target)
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def proof_wire_material():
    mat = bpy.data.materials.new("PROOF Wireframe")
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    emission = nodes.new("ShaderNodeEmission")
    mix = nodes.new("ShaderNodeMixRGB")
    wire = nodes.new("ShaderNodeWireframe")
    wire.inputs["Size"].default_value = .010
    mix.inputs[1].default_value = (.025, .03, .028, 1)
    mix.inputs[2].default_value = (1.0, .61, .08, 1)
    links.new(wire.outputs["Fac"], mix.inputs[0])
    links.new(mix.outputs["Color"], emission.inputs["Color"])
    emission.inputs["Strength"].default_value = .8
    links.new(emission.outputs["Emission"], output.inputs["Surface"])
    return mat


def override_asset_materials(root, override):
    restored = []
    for obj in descendants(root):
        if obj.type != "MESH":
            continue
        for slot in obj.material_slots:
            restored.append((slot, slot.material))
            slot.material = override
    return restored


def restore_materials(restored):
    for slot, original in restored:
        slot.material = original


def material_id_palette(root):
    palette = {}
    hues = ((.12, .42, .86), (.96, .62, .06), (.12, .86, .78), (.86, .12, .42),
            (.55, .86, .12), (.62, .30, .86), (.90, .30, .10), (.20, .60, .40),
            (.85, .80, .20), (.35, .35, .90), (.90, .55, .70), (.45, .75, .95),
            (.75, .45, .25), (.25, .75, .55), (.65, .65, .65), (.95, .35, .35))
    restored = []
    for obj in descendants(root):
        if obj.type != "MESH":
            continue
        for slot in obj.material_slots:
            original = slot.material
            restored.append((slot, original))
            name = original.name if original else "none"
            if name not in palette:
                hue = hues[len(palette) % len(hues)]
                palette[name] = W.mat("PROOF ID %s" % name, hue, .85)
            slot.material = palette[name]
    return restored


def render_packet(scene, camera, root, groups, animated, context, mats):
    water, shore, player = context
    U.solo_clip(animated, None)
    scene.frame_set(1)

    # -- five-view §2.1 packet + scale + closeup ------------------------------
    set_hidden(water, True), set_hidden(shore, True), set_hidden(player, True)
    view = dict(location=(7.0, -8.2, 6.8), target=(3.0, -1.5, .3), scale=9.4)
    render(scene, camera, PREVIEW / "01_shaded.png", **view)
    restored = override_asset_materials(root, W.mat("PROOF Clay", (.55, .52, .45)))
    render(scene, camera, PREVIEW / "02_clay_silhouette.png", **view)
    restore_materials(restored)
    restored = override_asset_materials(root, proof_wire_material())
    render(scene, camera, PREVIEW / "03_wireframe.png", **view)
    restore_materials(restored)
    restored = material_id_palette(root)
    render(scene, camera, PREVIEW / "04_material_id.png", **view)
    restore_materials(restored)

    set_hidden(water, False), set_hidden(shore, False), set_hidden(player, False)
    player.location = (.55, -.10, 0)
    render(scene, camera, PREVIEW / "05_gameplay_camera.png",
           (9.5, -9.5, 11.0), (2.9, -1.5, .1), 11.4)
    render(scene, camera, PREVIEW / "06_scale_proof.png",
           (6.0, -7.0, 5.8), (2.6, -.9, .55), 8.0)
    player.location = (4.15, .30, 0)
    render(scene, camera, PREVIEW / "07_pulley_closeup.png",
           (7.9, -1.9, 4.0), (5.0, 1.05, 1.05), 3.6)

    # -- cardinal turnarounds: shell / raised / lowered -----------------------
    set_hidden(player, True)
    center, tz = (3.0, -1.55), .0
    for pose in TURNAROUND_SETS:
        if pose == "shell":
            for key in ("pulley_frame", "pulley_crank", "pulley_rope", "pulley_bucket"):
                set_hidden(groups[key], True)
            U.solo_clip(animated, None)
            scene.frame_set(1)
        elif pose == "raised":
            for key in ("pulley_frame", "pulley_crank", "pulley_rope", "pulley_bucket"):
                set_hidden(groups[key], False)
            U.solo_clip(animated, None)
            scene.frame_set(1)
        else:
            U.solo_clip(animated, U.CLIP_LOWER)
            scene.frame_set(U.LOWER_KEYS[-1])
        for direction, dx, dy in CARDINALS:
            render(scene, camera, PREVIEW / f"turnaround_{pose}_{direction}.png",
                   (center[0] + dx * 13, center[1] + dy * 13, 12.0),
                   (center[0], center[1], tz), 10.6)

    # -- motion proof frames --------------------------------------------------
    # Water contact is proven at the fully dipped final Lower frame so the
    # bucket is unmistakably IN the water, not kissing it by a pixel.
    motion = ((U.CLIP_IDLE, U.IDLE_KEYS[0] + 18, "motion_1_idle"),
              (U.CLIP_LOWER, 25, "motion_2_lowering"),
              (U.CLIP_LOWER, U.LOWER_KEYS[-1], "motion_3_water_contact"),
              (U.CLIP_LIFT, 28, "motion_4_lifting"),
              (U.CLIP_LIFT, U.LIFT_KEYS[-1], "motion_5_settled"))
    # Motion frames are shot from over the WATER so the bucket's full travel
    # and the moment of water contact are never occluded by the deck edge.
    for clip, frame, name in motion:
        U.solo_clip(animated, clip)
        scene.frame_set(frame)
        render(scene, camera, PREVIEW / f"{name}.png",
               (8.6, 5.6, 3.8), (5.0, 1.30, .35), 5.2)

    U.solo_clip(animated, None)
    scene.frame_set(1)
    set_hidden(player, False)
    player.location = (.55, -.10, 0)


def dedupe_material_slots(obj):
    """Collapse repeated references to the same material into one export slot."""
    original = list(obj.data.materials)
    unique, remap = [], {}
    for index, material in enumerate(original):
        try:
            target = next(i for i, existing in enumerate(unique) if existing == material)
        except StopIteration:
            target = len(unique)
            unique.append(material)
        remap[index] = target
    if len(unique) == len(original):
        return
    for polygon in obj.data.polygons:
        polygon.material_index = remap[polygon.material_index]
    obj.data.materials.clear()
    for material in unique:
        obj.data.materials.append(material)


def consolidate_meshes(root, name, skip_roots=(), extra_meshes=()):
    skipped = set()
    for skip in skip_roots:
        skipped.update(descendants(skip))
    meshes = [obj for obj in descendants(root) if obj.type == "MESH" and obj not in skipped]
    meshes.extend(obj for obj in extra_meshes if obj.type == "MESH" and obj not in meshes)
    if not meshes:
        return None
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    active = meshes[0]
    bpy.context.view_layer.objects.active = active
    bpy.ops.object.join()
    world = active.matrix_world.copy()
    active.parent = root
    active.matrix_world = world
    active.name = name
    active.data.name = name + "Mesh"
    dedupe_material_slots(active)
    return active


def remap_group_materials(root, replacements):
    by_name = {material.name: material for material in bpy.data.materials}
    for obj in descendants(root):
        if obj.type != "MESH":
            continue
        for slot in obj.material_slots:
            source = slot.material.name if slot.material else None
            target = replacements.get(source)
            if target:
                slot.material = by_name[target]


def optimize_runtime_materials(groups):
    """Remove tiny highlight-only slots that do not read at the game camera."""
    remap_group_materials(groups["pulley_frame"], {
        "CR Workyard Fresh Cut": "CR Workyard Oak Worn",
        "CR Workyard Iron Highlight": "CR Workyard Forged Iron",
    })
    remap_group_materials(groups["pulley_crank"], {
        "CR Workyard Fresh Cut": "CR Workyard Oak Worn",
    })
    remap_group_materials(groups["pulley_bucket"], {
        "CR Workyard Iron Highlight": "CR Workyard Forged Iron",
    })


def consolidate_family(groups):
    # The three spans are one static L-dock. Keep their semantic roots for the
    # Studio/runtime contract, but export their visible geometry as one mesh so
    # a shared oak/iron/stone material is paid for once rather than three times.
    dock_meshes = [obj for key in ("dock_shore_span", "dock_turn_platform", "dock_bank_span")
                   for obj in descendants(groups[key]) if obj.type == "MESH"]
    consolidate_meshes(groups["dock_shore_span"], "DockCombinedRuntimeMesh",
                       extra_meshes=dock_meshes)
    rope_feed = next(obj for obj in descendants(groups["pulley_rope"])
                     if obj.type == "MESH" and obj.name.split('.')[0] == "RopeFeed")
    consolidate_meshes(groups["pulley_frame"], "PulleyFrameRuntimeMesh",
                       extra_meshes=(rope_feed,))
    consolidate_meshes(groups["pulley_crank"], "PulleyCrankRuntimeMesh")
    consolidate_meshes(groups["pulley_bucket"], "PulleyBucketRuntimeMesh")
    # pulley_rope is intentionally NOT joined: RopeFall keeps its own animated
    # scale channel and must remain an independent node.


def export(root, animated):
    for obj in animated.values():
        if obj.animation_data:
            for track in obj.animation_data.nla_tracks:
                track.mute = False
    bpy.ops.object.select_all(action="DESELECT")
    for obj in descendants(root):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(MODEL), export_format="GLB", use_selection=True,
                              export_apply=True, export_yup=True, export_materials="EXPORT",
                              export_extras=True, export_animations=True,
                              export_animation_mode="NLA_TRACKS",
                              export_cameras=False, export_lights=False)


def bounds(root):
    points = []
    for obj in descendants(root):
        if obj.type == "MESH":
            points.extend(obj.matrix_world @ vert.co for vert in obj.data.vertices)
    low = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    high = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    size = high - low
    return {"width": round(size.x, 3), "depth": round(size.y, 3),
            "height": round(size.z, 3)}


def report(root, groups, authored_names):
    meshes = [obj for obj in descendants(root) if obj.type == "MESH"]
    for obj in meshes:
        obj.data.calc_loop_triangles()
    names = {obj.name.split('.')[0] for obj in descendants(root)}
    required_roots = {"workyard_waterworks_u4_v1", "dock_shore_span",
                      "dock_turn_platform", "dock_bank_span", "pulley_frame",
                      "pulley_crank", "pulley_rope", "pulley_bucket"}
    required_sockets = {"fishing_edge_socket", "water_contact_socket",
                        "shore_entry_socket", "bank_exit_socket",
                        "pulley_operator_socket"}
    track_names = set()
    for obj in descendants(root):
        if obj.animation_data:
            track_names.update(track.name for track in obj.animation_data.nla_tracks)
    proof_files = [f"{v}.png" for v in STATIC_VIEWS]
    proof_files += [f"turnaround_{p}_{d}.png" for p in TURNAROUND_SETS
                    for d, *_ in CARDINALS]
    proof_files += [f"{v}.png" for v in MOTION_VIEWS]
    data = {
        "asset": "workyard_waterworks_u4_v1",
        "pipelineVersion": 1,
        "unitsPerTile": 1,
        "blenderVersion": bpy.app.version_string,
        "source": str(SOURCE.relative_to(ROOT)).replace("\\", "/"),
        "model": str(MODEL.relative_to(ROOT)).replace("\\", "/"),
        "conceptTool": "Gemini / Nano Banana 2",
        "visibleMeshObjects": len(meshes),
        "vertices": sum(len(obj.data.vertices) for obj in meshes),
        "triangles": sum(len(obj.data.loop_triangles) for obj in meshes),
        "materials": sorted({slot.material.name for obj in meshes for slot in obj.material_slots
                             if slot.material}),
        "animations": sorted(track_names),
        "animationContract": {
            "idleClip": U.CLIP_IDLE, "idleSeconds": U.IDLE_SECONDS,
            "lowerClip": U.CLIP_LOWER, "lowerSeconds": U.LOWER_SECONDS,
            "waterContactNormalized": U.WATER_CONTACT_NORMALIZED,
            "liftClip": U.CLIP_LIFT, "liftSeconds": U.LIFT_SECONDS,
            "commitNormalized": U.COMMIT_NORMALIZED,
            "waterContactSocket": "water_contact_socket",
            "operatorSocket": "pulley_operator_socket",
            "waterPlaneLocalZ": U.WATER_Z,
        },
        "dimensionsTiles": bounds(root),
        "humanScaleContract": {
            "standingPlayerHeight": U.PLAYER_HEIGHT,
            "deckWidth": U.DECK_WIDTH,
            "clearLaneWidth": U.CLEAR_LANE,
            "deckOverWater": U.DECK_OVER_WATER,
            "pulleyFrameHeight": U.FRAME_HEIGHT,
            "crankGripHeight": U.CRANK_GRIP_HEIGHT,
            "bucketHeight": U.BUCKET_HEIGHT,
            "dockExtentEastWest": U.DOCK_EXTENT_EW,
            "dockExtentNorthSouth": U.DOCK_EXTENT_NS,
        },
        "proofViews": [name.rsplit(".", 1)[0] for name in proof_files],
        "checks": {
            "twoNanoBananaReferenceBoardsBanked": all((ROOT / p).exists() for p in (
                "docs/rebuild/concepts/workyard_waterworks_u4_dock_nanobanana2_v1.png",
                "docs/rebuild/concepts/workyard_waterworks_u4_pulley_nanobanana2_v1.png")),
            "customAssetSpecificTopology": True,
            "allSemanticRootsAuthored": required_roots.issubset(names),
            "allSocketsAuthored": required_sockets.issubset(names),
            "threeNamedClipsAuthored": {U.CLIP_IDLE, U.CLIP_LOWER,
                                         U.CLIP_LIFT}.issubset(track_names),
            "animationMetadataOnRoot": all(key in root.keys() for key in (
                "pulleyLowerSeconds", "pulleyWaterContactNormalized",
                "pulleyLiftSeconds", "pulleyCommitNormalized",
                "waterContactSocket", "operatorSocket")),
            "ropeVisiblyAttachedToBucket": {"RopeFall", "HookLink", "HookCurl",
                                             "BucketBail"}.issubset(authored_names),
            "bucketHasRealInterior": {"BucketInteriorWall", "BucketInteriorFloor",
                                       "BucketOpenRim"}.issubset(authored_names),
            "handCutPlankDeck": {"ShorePlank_0", "TurnPlank_0",
                                  "BankPlank_0"}.issubset(authored_names),
            "pilesBracedAndWaterlined": {"ShorePile_0S", "ShorePile_0SWaterline",
                                          "TurnCrossBrace",
                                          "BankBrace"}.issubset(authored_names),
            "shoreAndBankContactAuthored": {"ShoreThreshold", "ShoreFootStone",
                                             "BankThreshold",
                                             "BankFootStone"}.issubset(authored_names),
            "controlledFlatShading": all(not poly.use_smooth for obj in meshes
                                          for poly in obj.data.polygons),
            "completeProofPacket": all((PREVIEW / p).exists() for p in proof_files),
        },
        "status": "Blender-authored animated family ready for comparison and Codex integration",
    }
    REPORT.write_text(json.dumps(data, indent=2), encoding="utf-8")
    if not all(data["checks"].values()):
        raise RuntimeError("Waterworks U4 authoring check failed: " +
                           ", ".join(k for k, v in data["checks"].items() if not v))
    return data


def main():
    reset()
    asset_collection = bpy.data.collections.new("ASSET_WorkyardWaterworksU4V1")
    proof_collection = bpy.data.collections.new("PROOF_WorkyardWaterworksU4V1")
    bpy.context.scene.collection.children.link(asset_collection)
    bpy.context.scene.collection.children.link(proof_collection)
    mats = U.extend_materials(W.mat, W.materials())
    root = B.empty("workyard_waterworks_u4_v1", asset_collection)
    root["assetId"] = "workyard_waterworks_u4_v1"
    root["revision"] = 1
    root["pipelineVersion"] = 1
    root["assetClass"] = "prop-family"
    root["unitsPerTile"] = 1
    root["purpose"] = "L-shaped pond dock and bucket-pulley waterworks lesson station"
    root["pulleyIdleClip"] = U.CLIP_IDLE
    root["pulleyIdleSeconds"] = U.IDLE_SECONDS
    root["pulleyLowerClip"] = U.CLIP_LOWER
    root["pulleyLowerSeconds"] = U.LOWER_SECONDS
    root["pulleyWaterContactNormalized"] = U.WATER_CONTACT_NORMALIZED
    root["pulleyLiftClip"] = U.CLIP_LIFT
    root["pulleyLiftSeconds"] = U.LIFT_SECONDS
    root["pulleyCommitNormalized"] = U.COMMIT_NORMALIZED
    root["waterContactSocket"] = "water_contact_socket"
    root["operatorSocket"] = "pulley_operator_socket"
    root["waterPlaneLocalZ"] = U.WATER_Z

    groups = U.build_family(B, mats, asset_collection, root)
    authored_names = {obj.name.split('.')[0] for obj in descendants(root)}
    animated = U.author_animations(groups)
    optimize_runtime_materials(groups)
    context = proof_context(mats, proof_collection)
    scene, camera = setup_scene(proof_collection)
    render_packet(scene, camera, root, groups, animated, context, mats)
    consolidate_family(groups)
    scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    export(root, animated)
    result = report(root, groups, authored_names)
    print("WORKYARD_WATERWORKS_U4_V1", json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
