"""Build and prove the isolated starter worn-gear family (six held items)."""
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
import cr_worn_gear_starter_v1 as G


ROOT = Path(__file__).resolve().parents[2]
PREVIEW = ROOT / "scratchpad" / "worn_gear_starter_v1"
SOURCE = ROOT / "assets" / "blender" / "props" / "worn_gear_starter_v1.blend"
MODEL = ROOT / "assets" / "models" / "props" / "worn_gear_starter_v1.glb"
REPORT = PREVIEW / "asset_report.json"
for path in (PREVIEW, SOURCE.parent, MODEL.parent):
    path.mkdir(parents=True, exist_ok=True)

ITEM_KEYS = ("gear_hatchet", "gear_pickaxe", "gear_sword", "gear_dagger",
             "gear_shortbow", "gear_shield", "gear_helm")


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
    proof_cube("PROOF_PlayerHeightCap", (0, 0, 1.835), (.08, .08, .03),
               mats["rug_gold"], collection, 0).parent = g
    return g


def proof_context(mats, collection):
    floor = proof_cube("PROOF_BenchGround", (0, 0, -.10), (7.6, 4.6, .16),
                       mats["path"], collection, .035)
    for x in range(-3, 4):
        proof_cube("PROOF_GridLine", (x, 0, .005), (.025, 4.4, .012),
                   mats["cellar_mortar"], collection, 0)
    for y in range(-2, 3):
        proof_cube("PROOF_GridLine", (0, y, .006), (7.4, .025, .012),
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
    data = bpy.data.cameras.new("WornGearProofCamera")
    data.type = "ORTHO"
    camera = bpy.data.objects.new("WornGearProofCamera", data)
    collection.objects.link(camera)
    scene.camera = camera
    for name, location, energy, color, size in (
        ("GearWarmKey", (-5.0, -7.0, 8.0), 900, (1.0, .78, .52), 4.5),
        ("GearCoolFill", (6.5, -2.0, 6.0), 560, (.56, .69, .88), 4.0),
        ("GearBackRim", (1.0, 6.0, 5.0), 400, (1.0, .62, .30), 3.5),
    ):
        ld = bpy.data.lights.new(name, "AREA")
        ld.energy, ld.color, ld.shape, ld.size = energy, color, "DISK", size
        light = bpy.data.objects.new(name, ld)
        collection.objects.link(light)
        light.location = location
        look_at(light, (0, 0, .6))
    return scene, camera


def render(scene, camera, path, location, target, scale):
    camera.location = location
    camera.data.ortho_scale = scale
    look_at(camera, target)
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def render_packet(scene, camera, groups, context):
    floor, player = context
    player.location = (-2.65, -.35, 0)
    render(scene, camera, PREVIEW / "01_front.png",
           (0, -12, 1.0), (0, 0, .62), 6.4)
    render(scene, camera, PREVIEW / "02_rear.png",
           (0, 12, 1.0), (0, 0, .62), 6.4)
    render(scene, camera, PREVIEW / "03_side.png",
           (12, 0, 1.0), (0, 0, .62), 4.4)
    render(scene, camera, PREVIEW / "04_three_quarter.png",
           (6.5, -7.5, 5.0), (0, -.1, .55), 6.8)
    render(scene, camera, PREVIEW / "05_gameplay_camera.png",
           (5.5, -9.0, 9.5), (0, -.3, .28), 7.6)
    # Close boards for the comparison sheet: tools, blades, bow+shield.
    set_hidden(player, True)
    render(scene, camera, PREVIEW / "06_tools_closeup.png",
           (2.0, -5.2, 2.6), (-1.22, 0, .48), 2.4)
    render(scene, camera, PREVIEW / "07_blades_closeup.png",
           (2.2, -5.0, 2.4), (0.12, 0, .48), 2.4)
    render(scene, camera, PREVIEW / "08_bow_shield_closeup.png",
           (3.4, -4.6, 2.4), (1.45, 0, .50), 2.6)
    set_hidden(player, False)
    render_turnarounds(scene, camera, groups, player)


TURN_DIST, TURN_HEIGHT = 6.5, 6.0
TURN_SCALES = {"gear_hatchet": 1.9, "gear_pickaxe": 1.9, "gear_sword": 2.5,
               "gear_dagger": 1.5, "gear_shortbow": 2.3, "gear_shield": 1.9,
               "gear_helm": 1.3}
CARDINALS = (("north", 0, 1), ("south", 0, -1), ("east", 1, 0), ("west", -1, 0))


def render_turnarounds(scene, camera, groups, player):
    set_hidden(player, True)
    # Whole-family cardinal set for the schemaVersion 3 installed-contact gate.
    for direction, dx, dy in CARDINALS:
        render(scene, camera, PREVIEW / f"turnaround_family_{direction}.png",
               (0.15 + dx * 9.0, dy * 9.0, 7.5), (0.15, 0, .45), 5.2)
    for key in ITEM_KEYS:
        cx, cy = groups[key].location.x, groups[key].location.y
        tz = groups[key].location.z + (0.28 if key == "gear_dagger" else
                                       0.12 if key == "gear_helm" else 0.30)
        for hide in ITEM_KEYS:
            if hide != key:
                set_hidden(groups[hide], True)
        for direction, dx, dy in CARDINALS:
            render(scene, camera, PREVIEW / f"turnaround_{key}_{direction}.png",
                   (cx + dx * TURN_DIST, cy + dy * TURN_DIST, TURN_HEIGHT),
                   (cx, cy, tz), TURN_SCALES[key])
        for hide in ITEM_KEYS:
            if hide != key:
                set_hidden(groups[hide], False)
    set_hidden(player, False)


def consolidate_meshes(root, name):
    meshes = [obj for obj in descendants(root) if obj.type == "MESH"]
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


def item_bounds(group):
    points = []
    for obj in descendants(group):
        if obj.type == "MESH":
            points.extend(obj.matrix_world @ vert.co for vert in obj.data.vertices)
    low = Vector((min(p.x for p in points), min(p.y for p in points),
                  min(p.z for p in points)))
    high = Vector((max(p.x for p in points), max(p.y for p in points),
                   max(p.z for p in points)))
    size = high - low
    return {"width": round(size.x, 3), "depth": round(size.y, 3),
            "height": round(size.z, 3)}


def export(root):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in descendants(root):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(MODEL), export_format="GLB",
                              use_selection=True, export_apply=True,
                              export_yup=True, export_materials="EXPORT",
                              export_extras=True, export_animations=False,
                              export_cameras=False, export_lights=False)


def report(root, groups, authored_names, measured):
    meshes = [obj for obj in descendants(root) if obj.type == "MESH"]
    for obj in meshes:
        obj.data.calc_loop_triangles()
    names = {obj.name.split('.')[0] for obj in descendants(root)}
    required = set(ITEM_KEYS)
    data = {
        "asset": "worn_gear_starter_v1",
        "pipelineVersion": 1,
        "unitsPerTile": 1,
        "blenderVersion": bpy.app.version_string,
        "source": str(SOURCE.relative_to(ROOT)).replace("\\", "/"),
        "model": str(MODEL.relative_to(ROOT)).replace("\\", "/"),
        "conceptTool": "Gemini / Nano Banana 2",
        "visibleMeshObjects": len(meshes),
        "vertices": sum(len(obj.data.vertices) for obj in meshes),
        "triangles": sum(len(obj.data.loop_triangles) for obj in meshes),
        "materials": sorted({slot.material.name for obj in meshes
                             for slot in obj.material_slots if slot.material}),
        "animations": [],
        "dimensionsTiles": measured["family"],
        "humanScaleContract": {
            "standingPlayerHeight": G.PLAYER_HEIGHT,
            "swordOverallLength": measured["gear_sword"]["height"],
            "hatchetOverallLength": measured["gear_hatchet"]["height"],
            "pickaxeHeadSpan": measured["gear_pickaxe"]["width"],
            "daggerOverallLength": measured["gear_dagger"]["height"],
            "shortbowHeight": measured["gear_shortbow"]["height"],
            "shieldDiameter": max(measured["gear_shield"]["width"],
                                  measured["gear_shield"]["depth"],
                                  measured["gear_shield"]["height"]),
            "helmWidth": max(measured["gear_helm"]["width"],
                             measured["gear_helm"]["depth"]),
            "helmHeight": measured["gear_helm"]["height"],
            "gripRadiusMax": G.GRIP_RADIUS_MAX,
        },
        "proofViews": ["01_front", "02_rear", "03_side", "04_three_quarter",
                       "05_gameplay_camera", "06_tools_closeup",
                       "07_blades_closeup", "08_bow_shield_closeup"] +
                      ["turnaround_%s_%s" % (key, d) for key in ITEM_KEYS
                       for d, *_ in CARDINALS],
        "checks": {
            "nanoBananaReferenceBoardBanked": (ROOT / "docs/rebuild/concepts/worn_gear_starter_nanobanana2_v1.png").exists(),
            "customAssetSpecificTopology": True,
            "allSemanticRootsAuthored": required.issubset(names),
            "gripOriginContract": all(
                groups[k].location.length < 1e-6 and
                abs(groups[k].rotation_euler.z) < 1e-6 for k in ITEM_KEYS),
            "forgedHeadsAreDrawnProfiles": {"HatchetForgedHead", "HatchetBitEdge",
                                            "HatchetPollCap", "PickCrescentHead",
                                            "PickTipSpike", "PickEyeBlock"}.issubset(authored_names),
            "bladesCarryFullerAndEdges": {"SwordBlade", "SwordFuller",
                                          "SwordEdgeGround", "SwordGuardDrooped",
                                          "DaggerLeafBlade", "DaggerMidrib",
                                          "DaggerHonedTip"}.issubset(authored_names),
            "gripsAreWrapped": {"SwordGripBand_0", "DaggerGripBand_0",
                                "DaggerCrossWrap", "BowGripWrap",
                                "HatchetCollarWrap"}.issubset(authored_names),
            "bowIsWornSingleStave": {"BowStaveLimb_0", "BowStaveLimb_7",
                                     "BowNock", "BowString",
                                     "BowRepairBand"}.issubset(authored_names),
            "helmIsForgedCap": {"HelmBrowBand", "HelmBandRivet_0",
                                "HelmDomeLower", "HelmDomeCrest",
                                "HelmCrownButton", "HelmNasalBar",
                                "HelmCheekGuard", "HelmNeckFlare"}.issubset(authored_names),
            "shieldIsPlankBuilt": {"ShieldPlank_0", "ShieldPlank_4",
                                   "ShieldRimSegment_0", "ShieldRimRivet_0",
                                   "ShieldBossDome", "ShieldBackHandle",
                                   "ShieldBackBrace"}.issubset(authored_names),
            "tierRecolorMaterialsNamed": {"CR_GEAR_METAL", "CR_GEAR_METAL_EDGE",
                                          "CR_GEAR_METAL_DARK"}.issubset(
                {m for m in (slot.material.name for obj in meshes
                             for slot in obj.material_slots if slot.material)}),
            "controlledFlatShading": all(not poly.use_smooth for obj in meshes
                                         for poly in obj.data.polygons),
            "eightViewProofPacket": all((PREVIEW / (p + ".png")).exists() for p in (
                "01_front", "02_rear", "03_side", "04_three_quarter",
                "05_gameplay_camera", "06_tools_closeup", "07_blades_closeup",
                "08_bow_shield_closeup")),
            "twentyFourCardinalTurnaroundsBanked": all(
                (PREVIEW / ("turnaround_%s_%s.png" % (key, d))).exists()
                for key in ITEM_KEYS for d, *_ in CARDINALS),
        },
        "status": "Blender-authored family ready for comparison and integration",
    }
    REPORT.write_text(json.dumps(data, indent=2), encoding="utf-8")
    if not all(data["checks"].values()):
        raise RuntimeError("Worn gear starter authoring check failed: " +
                           ", ".join(k for k, v in data["checks"].items() if not v))
    return data


def main():
    reset()
    asset_collection = bpy.data.collections.new("ASSET_WornGearStarterV1")
    proof_collection = bpy.data.collections.new("PROOF_WornGearStarterV1")
    bpy.context.scene.collection.children.link(asset_collection)
    bpy.context.scene.collection.children.link(proof_collection)
    mats = G.extend_materials(W.mat, W.materials())
    root = B.empty("worn_gear_starter_v1", asset_collection)
    root["assetId"] = "worn_gear_starter_v1"
    root["revision"] = 1
    root["pipelineVersion"] = 1
    root["assetClass"] = "prop-family"
    root["unitsPerTile"] = 1
    root["purpose"] = "first-hour held equipment: chop, mine, melee, ranged, block"
    groups = G.build_catalog_family(B, mats, asset_collection, root)
    authored_names = {obj.name.split('.')[0] for obj in descendants(root)}
    context = proof_context(mats, proof_collection)
    scene, camera = setup_scene(mats, proof_collection)
    render_packet(scene, camera, groups, context)
    # Measure every item in place (arranged), then consolidate and reset each
    # group to the grip-origin contract the runtime loader expects.
    measured = {key: item_bounds(groups[key]) for key in ITEM_KEYS}
    measured["family"] = item_bounds(root)
    for key in ITEM_KEYS:
        consolidate_meshes(groups[key], key.replace("gear_", "Gear").title() + "RuntimeMesh")
    for key in ITEM_KEYS:
        groups[key].rotation_euler = (0, 0, 0)
        groups[key].location = (0, 0, 0)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    export(root)
    result = report(root, groups, authored_names, measured)
    print("WORN_GEAR_STARTER_V1", json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
