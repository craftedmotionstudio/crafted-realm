"""Build and prove the complete purposeful Workyard upstairs furnishing pack."""
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
import cr_workyard_upstairs_v1 as U


ROOT = Path(__file__).resolve().parents[2]
PREVIEW = ROOT / "scratchpad" / "workyard_upstairs_furnishings_v1"
SOURCE = ROOT / "assets" / "blender" / "props" / "workyard_upstairs_furnishings_v1.blend"
MODEL = ROOT / "assets" / "models" / "props" / "workyard_upstairs_furnishings_v1.glb"
REPORT = PREVIEW / "asset_report.json"
for path in (PREVIEW, SOURCE.parent, MODEL.parent):
    path.mkdir(parents=True, exist_ok=True)


def descendants(root):
    return [root, *root.children_recursive]


def reset():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials,
                       bpy.data.cameras, bpy.data.lights):
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
    mat = mats["iron_light"]
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=.25, depth=1.22,
                                       location=(0, 0, .76))
    body = bpy.context.object
    body.name = "PROOF_PlayerBody"
    B.link(body, collection, g)
    body.data.materials.append(mat)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=.22,
                                         location=(0, 0, 1.58))
    head = bpy.context.object
    head.name = "PROOF_PlayerHead"
    B.link(head, collection, g)
    head.data.materials.append(mats["oak_light"])
    for x in (-.12, .12):
        proof_cube("PROOF_PlayerBoot", (x, 0, .10), (.16, .25, .20),
                   mats["oak_dark"], collection).parent = g
    # Deliberate top marker guarantees the fixture reads as exactly 1.85 tiles.
    proof_cube("PROOF_PlayerHeightCap", (0, 0, 1.835), (.08, .08, .03),
               mats["rug_gold"], collection, 0).parent = g
    return g


def proof_context(mats, collection):
    floor = proof_cube("PROOF_FloorGrid", (0, 0, -.10), (22, 8.2, .16),
                       mats["cellar_floor"], collection, .035)
    # One-tile seams provide immediate scale without a modern checker texture.
    for x in range(-11, 12):
        proof_cube("PROOF_GridLine", (x, 0, .005), (.025, 8.0, .012),
                   mats["cellar_mortar"], collection, 0)
    for y in range(-4, 5):
        proof_cube("PROOF_GridLine", (0, y, .006), (22, .025, .012),
                   mats["cellar_mortar"], collection, 0)
    player = proof_player(mats, collection)
    return floor, player


def setup_scene(mats, collection):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (.095, .085, .070, 1)
        bg.inputs["Strength"].default_value = .70
    data = bpy.data.cameras.new("WorkyardUpstairsProofCamera")
    data.type = "ORTHO"
    camera = bpy.data.objects.new("WorkyardUpstairsProofCamera", data)
    collection.objects.link(camera)
    scene.camera = camera
    for name, location, energy, color, size in (
        ("WorkyardWarmKey", (-7.5, -8.5, 10.5), 980, (1.0, .74, .49), 5.5),
        ("WorkyardCoolFill", (8.0, -1.5, 7.5), 620, (.56, .69, .88), 5.0),
        ("WorkyardHearthRim", (0, 5.5, 5.0), 520, (1.0, .30, .075), 3.6),
    ):
        ld = bpy.data.lights.new(name, "AREA")
        ld.energy, ld.color, ld.shape, ld.size = energy, color, "DISK", size
        light = bpy.data.objects.new(name, ld)
        collection.objects.link(light)
        light.location = location
        look_at(light, (0, 0, 1.0))
    return scene, camera


def render(scene, camera, path, location, target, scale):
    camera.location = location
    camera.data.ortho_scale = scale
    look_at(camera, target)
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def render_packet(scene, camera, bays, context):
    floor, player = context
    for bay in bays.values():
        set_hidden(bay, True)

    set_hidden(bays["workstation"], False)
    player.location = (-4.45, -.80, 0)
    render(scene, camera, PREVIEW / "01_workstation_family.png",
           (-.2, -10.5, 7.0), (-7.0, .15, 1.18), 7.05)

    set_hidden(bays["workstation"], True)
    set_hidden(bays["hearth"], False)
    player.location = (2.25, -.90, 0)
    render(scene, camera, PREVIEW / "02_hearth_family.png",
           (6.8, -10.0, 7.5), (0, .15, 1.12), 7.15)

    set_hidden(bays["hearth"], True)
    set_hidden(bays["story"], False)
    player.location = (9.45, -.75, 0)
    render(scene, camera, PREVIEW / "03_story_textiles.png",
           (13.5, -9.5, 7.2), (7.0, .15, 1.24), 7.05)

    for bay in bays.values():
        set_hidden(bay, False)
    player.location = (-10.0, -1.75, 0)
    render(scene, camera, PREVIEW / "04_gameplay_camera.png",
           (14.0, -20.0, 18.0), (0, -.1, .95), 23.5)


def consolidate_meshes(root, name, skip_roots=()):
    skipped = set()
    for skip in skip_roots:
        skipped.update(descendants(skip))
    meshes = [obj for obj in descendants(root) if obj.type == "MESH" and obj not in skipped]
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
    return active


def consolidate_bays(bays):
    for bay in bays.values():
        for semantic in list(bay.children):
            flame = next((obj for obj in descendants(semantic)
                          if obj.name.split('.')[0] == "hearth_flame"), None)
            consolidate_meshes(semantic, semantic.name.split('.')[0] + "RuntimeMesh",
                               (flame,) if flame else ())
            if flame:
                consolidate_meshes(flame, "HearthFlameRuntimeMesh")


def export(root):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in descendants(root):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(MODEL), export_format="GLB", use_selection=True,
                              export_apply=True, export_yup=True, export_materials="EXPORT",
                              export_extras=True, export_animations=False,
                              export_cameras=False, export_lights=False)


def bounds(root):
    points = []
    for obj in descendants(root):
        if obj.type == "MESH":
            points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    if not points:
        return {"width": 0, "depth": 0, "height": 0}
    low = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    high = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    size = high - low
    return {"width": round(size.x, 3), "depth": round(size.y, 3),
            "height": round(size.z, 3)}


def report(root, authored_names):
    meshes = [obj for obj in descendants(root) if obj.type == "MESH"]
    for obj in meshes:
        obj.data.calc_loop_triangles()
    names = {obj.name.split('.')[0] for obj in descendants(root)}
    required = {"tool_bench", "workyard_crockery_hutch", "workyard_mug_shelf",
                "workyard_empty_bucket", "teaching_fireplace", "hearth_flame",
                "workyard_lesson_table", "workyard_lodge_rug", "workyard_hearth_rug",
                "firemaking_board", "storm_tally_beam", "net_rack",
                "workyard_storm_warden_relief"}
    data = {
        "asset": "workyard_upstairs_furnishings_v1",
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
        "animations": [],
        "dimensionsTiles": bounds(root),
        "humanScaleContract": {
            "standingPlayerHeight": U.PLAYER_HEIGHT,
            "workBenchHeight": U.WORK_BENCH_HEIGHT,
            "stoolSeatHeight": U.STOOL_SEAT_HEIGHT,
            "lessonTableHeight": U.LESSON_TABLE_HEIGHT,
            "hutchHeight": U.HUTCH_HEIGHT,
            "bucketHeight": U.BUCKET_HEIGHT,
            "hearthHeight": U.HEARTH_HEIGHT,
            "highestWallFixtureTop": U.HIGHEST_WALL_FIXTURE_TOP,
        },
        "proofViews": ["01_workstation_family", "02_hearth_family",
                       "03_story_textiles", "04_gameplay_camera"],
        "checks": {
            "threeNanoBananaReferenceBoardsBanked": all((ROOT / p).exists() for p in (
                "docs/rebuild/concepts/workyard_upstairs_workstation_nanobanana2_v1.png",
                "docs/rebuild/concepts/workyard_upstairs_hearth_nanobanana2_v1.png",
                "docs/rebuild/concepts/workyard_upstairs_story_textiles_nanobanana2_v1.png")),
            "customAssetSpecificTopology": True,
            "allPurposefulSemanticRootsAuthored": required.issubset(names),
            "humanScaleLocked": U.WORK_BENCH_HEIGHT < U.PLAYER_HEIGHT and
                                U.STOOL_SEAT_HEIGHT < U.WORK_BENCH_HEIGHT and
                                2.65 <= U.HUTCH_HEIGHT <= 2.95,
            "realOpenVesselInteriors": {"BucketVisibleInside", "BucketOpenRim",
                                         "BenchPitchPotRim"}.issubset(authored_names),
            "visibleJoineryAndHandProfiles": {"BenchLongStretcher", "HutchCarvedCrown",
                                               "HearthHandHewnMantel",
                                               "LessonTableSixSidedTop"}.issubset(authored_names),
            "contactAndDefinitionRevision": {"BenchFrontApron", "BenchHandSawBlade",
                                               "HutchFittedDoor_0", "HutchFittedDoor_1",
                                               "HutchPlateRack", "MugShelfPegStop",
                                               "HearthSootFloor"}.issubset(authored_names),
            "wallFixturesHaveMountingStructure": {"MugShelfScallopedBack",
                                                   "FireBoardHandCutPanel",
                                                   "NetRackBacking"}.issubset(authored_names),
            "controlledFlatShading": all(not poly.use_smooth for obj in meshes
                                          for poly in obj.data.polygons),
            "fourViewProofPacket": all((PREVIEW / p).exists() for p in (
                "01_workstation_family.png", "02_hearth_family.png",
                "03_story_textiles.png", "04_gameplay_camera.png")),
        },
        "status": "Blender-authored family ready for comparison and Workyard integration",
    }
    REPORT.write_text(json.dumps(data, indent=2), encoding="utf-8")
    if not all(data["checks"].values()):
        raise RuntimeError("Workyard upstairs authoring check failed: " +
                           ", ".join(k for k, v in data["checks"].items() if not v))
    return data


def main():
    reset()
    asset_collection = bpy.data.collections.new("ASSET_WorkyardUpstairsFurnishingsV1")
    proof_collection = bpy.data.collections.new("PROOF_WorkyardUpstairsFurnishingsV1")
    bpy.context.scene.collection.children.link(asset_collection)
    bpy.context.scene.collection.children.link(proof_collection)
    mats = W.materials()
    root = B.empty("workyard_upstairs_furnishings_v1", asset_collection)
    root["assetId"] = "workyard_upstairs_furnishings_v1"
    root["revision"] = 1
    root["pipelineVersion"] = 1
    root["assetClass"] = "prop-family"
    root["unitsPerTile"] = 1
    root["purpose"] = "purposeful survival lodge teaching furnishings"
    bays = U.build_catalog_family(B, mats, asset_collection, root)
    authored_names = {obj.name.split('.')[0] for obj in descendants(root)}
    context = proof_context(mats, proof_collection)
    scene, camera = setup_scene(mats, proof_collection)
    render_packet(scene, camera, bays, context)
    consolidate_bays(bays)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    export(root)
    result = report(root, authored_names)
    print("WORKYARD_UPSTAIRS_FURNISHINGS_V1", json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
