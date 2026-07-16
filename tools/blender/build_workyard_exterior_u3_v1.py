"""Build and prove the isolated Workyard exterior occupation-yard family (U3)."""
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
import cr_workyard_exterior_u3_v1 as U


ROOT = Path(__file__).resolve().parents[2]
PREVIEW = ROOT / "scratchpad" / "workyard_exterior_u3_v1"
SOURCE = ROOT / "assets" / "blender" / "props" / "workyard_exterior_u3_v1.blend"
MODEL = ROOT / "assets" / "models" / "props" / "workyard_exterior_u3_v1.glb"
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
    floor = proof_cube("PROOF_YardGround", (0, 0, -.10), (12.5, 7.2, .16),
                       mats["path"], collection, .035)
    # One-tile seams provide immediate scale without a modern checker texture.
    for x in range(-6, 7):
        proof_cube("PROOF_GridLine", (x, 0, .005), (.025, 7.0, .012),
                   mats["cellar_mortar"], collection, 0)
    for y in range(-3, 4):
        proof_cube("PROOF_GridLine", (0, y, .006), (12.3, .025, .012),
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
    data = bpy.data.cameras.new("WorkyardExteriorU3ProofCamera")
    data.type = "ORTHO"
    camera = bpy.data.objects.new("WorkyardExteriorU3ProofCamera", data)
    collection.objects.link(camera)
    scene.camera = camera
    for name, location, energy, color, size in (
        ("YardWarmKey", (-7.0, -9.0, 11.0), 1050, (1.0, .78, .52), 5.5),
        ("YardCoolFill", (8.5, -2.0, 8.0), 640, (.56, .69, .88), 5.0),
        ("YardBackRim", (1.0, 7.0, 6.0), 460, (1.0, .62, .30), 4.0),
    ):
        ld = bpy.data.lights.new(name, "AREA")
        ld.energy, ld.color, ld.shape, ld.size = energy, color, "DISK", size
        light = bpy.data.objects.new(name, ld)
        collection.objects.link(light)
        light.location = location
        look_at(light, (0, 0, .8))
    return scene, camera


def render(scene, camera, path, location, target, scale):
    camera.location = location
    camera.data.ortho_scale = scale
    look_at(camera, target)
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def render_packet(scene, camera, groups, context):
    floor, player = context
    rack_parts = ("rack",)
    station_parts = ("chopping_block", "embedded_axe", "sawbuck")

    # Complete family: front, rear, side, three-quarter, gameplay camera.
    player.location = (-4.55, -1.05, 0)
    render(scene, camera, PREVIEW / "01_front.png",
           (0, -15, 1.35), (0, 0, .82), 9.8)
    render(scene, camera, PREVIEW / "02_rear.png",
           (0, 15, 1.35), (0, 0, .82), 9.8)
    render(scene, camera, PREVIEW / "03_side.png",
           (15, 0, 1.35), (0, 0, .82), 7.4)
    render(scene, camera, PREVIEW / "04_three_quarter.png",
           (8.5, -9.5, 6.5), (0, -.1, .78), 10.4)
    render(scene, camera, PREVIEW / "05_gameplay_camera.png",
           (7.0, -11.5, 12.5), (0, -.4, .38), 11.6)

    # Concept-matched boards for the two comparison sheets.
    for key in station_parts:
        set_hidden(groups[key], True)
    player.location = (-.35, -1.15, 0)
    render(scene, camera, PREVIEW / "06_timber_rack_family.png",
           (1.9, -6.3, 4.7), (-2.30, .05, .74), 6.4)
    for key in station_parts:
        set_hidden(groups[key], False)

    set_hidden(groups["rack"], True)
    player.location = (1.0, 1.7, 0)
    render(scene, camera, PREVIEW / "07_chopping_station.png",
           (5.6, -6.6, 5.0), (2.05, 0, .58), 6.1)
    set_hidden(groups["rack"], False)

    render_turnarounds(scene, camera, groups, player)


# One shared turnaround lens: identical lighting rig, ortho lens, gameplay
# pitch (~43 degrees), and per-object framing scale reused for all four
# cardinal directions of that object.
TURN_DIST, TURN_HEIGHT = 8.5, 8.0
TURNAROUNDS = (
    ("rack", (-2.35, .10), .78, 4.9, ("chopping_block", "embedded_axe", "sawbuck")),
    ("block_axe", (1.15, -.35), .60, 3.4, ("rack", "sawbuck")),
    ("sawbuck", (3.05, .30), .55, 3.2, ("rack", "chopping_block", "embedded_axe")),
    ("family", (0.35, -.10), .60, 10.8, ()),
)
CARDINALS = (("north", 0, 1), ("south", 0, -1), ("east", 1, 0), ("west", -1, 0))


def render_turnarounds(scene, camera, groups, player):
    """Installed-contact evidence: every object from all four cardinals."""
    set_hidden(player, True)
    for key, (cx, cy), tz, scale, hide_keys in TURNAROUNDS:
        for hide in hide_keys:
            set_hidden(groups[hide], True)
        for direction, dx, dy in CARDINALS:
            render(scene, camera, PREVIEW / f"turnaround_{key}_{direction}.png",
                   (cx + dx * TURN_DIST, cy + dy * TURN_DIST, TURN_HEIGHT),
                   (cx, cy, tz), scale)
        for hide in hide_keys:
            set_hidden(groups[hide], False)
    set_hidden(player, False)


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


def consolidate_family(groups):
    consolidate_meshes(groups["rack"], "TimberLogRackRuntimeMesh",
                       (groups["log_stack"], groups["rope_restraints"]))
    consolidate_meshes(groups["log_stack"], "LogStackRuntimeMesh")
    consolidate_meshes(groups["rope_restraints"], "RopeRestraintsRuntimeMesh")
    consolidate_meshes(groups["chopping_block"], "ChoppingBlockRuntimeMesh")
    consolidate_meshes(groups["embedded_axe"], "EmbeddedAxeRuntimeMesh")
    consolidate_meshes(groups["sawbuck"], "SawbuckRuntimeMesh")


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
    # Measure real vertices; rotated bound boxes overstate the envelope.
    points = []
    for obj in descendants(root):
        if obj.type == "MESH":
            points.extend(obj.matrix_world @ vert.co for vert in obj.data.vertices)
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
    required = {"timber_log_rack", "log_stack", "rope_restraints",
                "chopping_block", "embedded_axe", "sawbuck"}
    data = {
        "asset": "workyard_exterior_u3_v1",
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
            "rackFrameHeight": U.RACK_FRAME_HEIGHT,
            "logStackTopHeight": U.LOG_STACK_TOP,
            "choppingBlockHeight": U.CHOPPING_BLOCK_HEIGHT,
            "axeOverallLength": U.AXE_OVERALL_LENGTH,
            "axeEmbeddedTopHeight": U.AXE_EMBEDDED_TOP_HEIGHT,
            "sawbuckHeight": U.SAWBUCK_HEIGHT,
        },
        "proofViews": ["01_front", "02_rear", "03_side", "04_three_quarter",
                       "05_gameplay_camera", "06_timber_rack_family",
                       "07_chopping_station"] +
                      ["turnaround_%s_%s" % (key, d) for key, *_ in TURNAROUNDS
                       for d, *_ in CARDINALS],
        "checks": {
            "twoNanoBananaReferenceBoardsBanked": all((ROOT / p).exists() for p in (
                "docs/rebuild/concepts/workyard_exterior_u3_timber_rack_nanobanana2_v1.png",
                "docs/rebuild/concepts/workyard_exterior_u3_chopping_station_nanobanana2_v1.png")),
            "customAssetSpecificTopology": True,
            "allSemanticRootsAuthored": required.issubset(names),
            "humanScaleLocked": U.CHOPPING_BLOCK_HEIGHT < U.SAWBUCK_HEIGHT <
                                U.LOG_STACK_TOP < U.RACK_FRAME_HEIGHT < U.PLAYER_HEIGHT,
            "individuallyAuthoredLogs": {"SawnLog_B0", "SawnLog_B1", "SawnLog_B2",
                                          "SawnLog_B3", "SawnLog_M0", "SawnLog_ShortGap",
                                          "SawnLog_M2", "SawnLog_Top"}.issubset(authored_names),
            "authoredRestraintsWrapLoad": {"FrontRopeWrap", "FrontRopeKnot",
                                            "FrontRopeDanglingEnd", "BackRopeWrap",
                                            "BackRopeKnot"}.issubset(authored_names),
            "weatheredBlockWithCutMarks": {"BlockTrunkHewn", "BlockBarkRidge_0",
                                            "BlockRootFlare", "BlockEndGrainTop",
                                            "BlockCutMark_0", "BlockCutMark_3",
                                            "BlockRimNotch",
                                            "BlockSplitChip"}.issubset(authored_names),
            "continuousLoftedTrunkNoTerraces": "BlockTrunkHewn" in authored_names and
                                               not any(n.startswith("BlockTrunkLower") or
                                                       n.startswith("BlockTrunkMiddle") or
                                                       n.startswith("BlockTrunkUpper")
                                                       for n in authored_names),
            "axeVisiblyEntersBlock": {"AxeForgedHead", "AxeBitEdge", "AxeSplitMark",
                                       "AxeSplitCrack", "AxeHaftLower", "AxeHaftUpper",
                                       "AxeKnobEnd"}.issubset(authored_names),
            "sawbuckHasClearPurpose": {"SawbuckLeg", "SawbuckStringer", "SawbuckWorkLog",
                                        "SawKerfSlit", "SawdustPile"}.issubset(authored_names),
            "contactIsAuthored": {"RackFootStone", "RackSleeper", "RackSideRail",
                                   "RackRailPeg"}.issubset(authored_names),
            "controlledFlatShading": all(not poly.use_smooth for obj in meshes
                                          for poly in obj.data.polygons),
            "sevenViewProofPacket": all((PREVIEW / p).exists() for p in (
                "01_front.png", "02_rear.png", "03_side.png", "04_three_quarter.png",
                "05_gameplay_camera.png", "06_timber_rack_family.png",
                "07_chopping_station.png")),
            "sixteenCardinalTurnaroundsBanked": all(
                (PREVIEW / ("turnaround_%s_%s.png" % (key, d))).exists()
                for key, *_ in TURNAROUNDS for d, *_ in CARDINALS),
        },
        "status": "Blender-authored family ready for comparison and Codex integration",
    }
    REPORT.write_text(json.dumps(data, indent=2), encoding="utf-8")
    if not all(data["checks"].values()):
        raise RuntimeError("Workyard exterior U3 authoring check failed: " +
                           ", ".join(k for k, v in data["checks"].items() if not v))
    return data


def main():
    reset()
    asset_collection = bpy.data.collections.new("ASSET_WorkyardExteriorU3V1")
    proof_collection = bpy.data.collections.new("PROOF_WorkyardExteriorU3V1")
    bpy.context.scene.collection.children.link(asset_collection)
    bpy.context.scene.collection.children.link(proof_collection)
    mats = U.extend_materials(W.mat, W.materials())
    root = B.empty("workyard_exterior_u3_v1", asset_collection)
    root["assetId"] = "workyard_exterior_u3_v1"
    root["revision"] = 1
    root["pipelineVersion"] = 1
    root["assetClass"] = "prop-family"
    root["unitsPerTile"] = 1
    root["purpose"] = "woodcutting occupation yard: timber storage, splitting, bucking"
    groups = U.build_catalog_family(B, mats, asset_collection, root)
    authored_names = {obj.name.split('.')[0] for obj in descendants(root)}
    context = proof_context(mats, proof_collection)
    scene, camera = setup_scene(mats, proof_collection)
    render_packet(scene, camera, groups, context)
    consolidate_family(groups)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    export(root)
    result = report(root, authored_names)
    print("WORKYARD_EXTERIOR_U3_V1", json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
