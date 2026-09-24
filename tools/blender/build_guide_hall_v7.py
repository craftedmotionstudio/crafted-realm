"""Build Guide Hall v7: the P2-D art pass on the approved v6 anchor language.

Brief: docs/rebuild/TUTORS_HOLM_REDESIGN_BRIEFS_2026-09-10.md (Guide Hall).
The v6 shell, roof system, doors and occupational clusters are reused unchanged;
this pass adds what the brief and the play review asked for:
  - roof furniture: overlapping ridge caps on the nave, a fieldstone chimney with a
    clay pot over the records wing (with an iron stove under it), eaves soffit
    boards that deepen the shadow line under every fascia;
  - the hero relief chart: a sandstone rim and plinth around the route table so the
    whole table top is the click target (F-06), coloured district patches on the
    water, a brass compass rose, and route flags on the lesson stations;
  - the teaching dais, board and benches move west off the north door axis so the
    teaching door reads from the south camera (F-09);
  - the lesson register carries an open ledger and quill; the provision rack hangs
    oilskins and packs.
Runtime contract (26x24 footprint, doors at (0,-11)/(0,12), station empties)
is preserved; every v6 authoring check still runs.
"""
from __future__ import annotations

import json
import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_guide_hall_v3 as B
import build_guide_hall_v5 as V5
import build_guide_hall_v6 as V6

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets" / "blender" / "holm_guide_hall_v7.blend"
MODEL = ROOT / "assets" / "models" / "buildings" / "holm_guide_hall_v7.glb"
PREVIEW = ROOT / "scratchpad" / "guide_hall_v7"
REPORT = PREVIEW / "asset_report.json"
for path in (SOURCE.parent, MODEL.parent, PREVIEW):
    path.mkdir(parents=True, exist_ok=True)

RNG = random.Random(260910)
DAIS_SHIFT_X = -5.2          # teaching cluster moves west, clear of the 2.6-wide north door
CHIMNEY_XY = (-8.95, -4.05)  # over the records wing, above the iron stove


def setup_materials():
    """The v6 family palette (18 materials) is the whole palette: every new surface in this
    pass aliases an approved material so the manifest material budget holds."""
    mats = V6.setup_materials()
    aliases = {
        "sandstone": "stone_light", "district_cove": "path", "district_green": "rug_green",
        "district_wood": "land", "district_quarry": "stone", "district_ridge": "stone_light",
        "district_headland": "rug_blue", "flag_red": "rug_red", "clay": "path",
        "oilskin": "timber", "ledger": "parchment",
    }
    for name, base in aliases.items():
        mats[name] = mats[base]
    return mats


def bounds_top(objects):
    top = 0.0
    for obj in objects:
        if obj.type != "MESH":
            continue
        for corner in obj.bound_box:
            top = max(top, (obj.matrix_world @ Vector(corner)).z)
    return top


# ---------------------------------------------------------------- roof furniture
def roof_furniture(roof, mats, collection):
    peak = 7.18
    caps = 0
    # Overlapping half-round ridge caps read as a laid ridge, not a pipe.
    y = -12.0
    while y <= 12.0:
        B.cylinder(f"NaveRidgeCap_{caps}", (0, y, peak + .16), .24, 1.62, 5,
                   mats["roof_light" if caps % 3 else "roof"], collection, roof,
                   rot=(math.pi / 2, 0, 0))
        y += 1.55
        caps += 1
    # Wing ridges get the same caps.
    for wing_x in (-8.95, 8.95):
        x = wing_x - 3.7
        while x <= wing_x + 3.7:
            B.cylinder(f"WingRidgeCap_{caps}", (x, 0, 6.34 + .15), .22, 1.50, 5,
                       mats["roof_light" if caps % 3 else "roof"], collection, roof,
                       rot=(0, math.pi / 2, 0))
            x += 1.45
            caps += 1
    # Fieldstone chimney with a clay pot over the records wing.
    cx, cy = CHIMNEY_XY
    B.cube("ChimneyStack", (cx, cy, 6.35), (1.05, 1.05, 3.10), mats["stone"], collection, roof)
    for i, (dx, dy, dz) in enumerate(((-.36, -.30, 5.2), (.34, .28, 5.9), (-.30, .32, 6.6),
                                      (.30, -.34, 7.3), (0, .40, 5.55), (.40, 0, 6.95))):
        B.cube(f"ChimneyQuoin_{i}", (cx + dx, cy + dy, dz), (.44, .40, .30),
               mats["stone_light"], collection, roof, RNG.uniform(-.06, .06))
    B.cube("ChimneyCap", (cx, cy, 7.98), (1.35, 1.35, .22), mats["stone_light"], collection, roof)
    B.cylinder("ChimneyPot", (cx, cy, 8.42), .26, .70, 8, mats["clay"], collection, roof)
    B.cylinder("ChimneyPotLip", (cx, cy, 8.78), .31, .10, 8, mats["clay"], collection, roof)
    # Eaves soffit boards: a dark band under every fascia deepens the shadow line.
    for side in (-1, 1):
        B.cube("NaveSoffit", (side * (5.35 + .02), 0, 4.08 - .30), (.34, 25.35, .12),
               mats["wood"], collection, roof)
        for wing_x in (-8.95, 8.95):
            B.cube("WingSoffit", (wing_x, side * (7.35 + .02), 4.04 - .28), (8.25, .34, .12),
                   mats["wood"], collection, roof)
    return caps


# ---------------------------------------------------------------- hero chart
def hero_chart(root, mats, collection):
    table = next(obj for obj in root.children if obj.name == "orientation_table")
    # Sandstone rim and plinth: the whole table top is now one click target.
    B.cylinder("ChartRim", (0, 0, 1.30), 2.12, .14, 12, mats["sandstone"], collection, table)
    B.cylinder("ChartRimInner", (0, 0, 1.37), 1.86, .06, 12, mats["sandstone"], collection, table)
    B.cylinder("ChartPlinth", (0, 0, .22), 1.40, .30, 12, mats["sandstone"], collection, table)
    # Coloured district patches sit on the water beside the v5 land masses.
    districts = (
        ("district_cove", (.10, -.98), .30, .55), ("district_green", (-.30, -.10), .34, .72),
        ("district_wood", (-.92, .05), .30, .60), ("district_quarry", (-.42, .62), .26, .70),
        ("district_ridge", (.28, .30), .28, .62), ("district_headland", (.92, .48), .30, .60),
    )
    for i, (key, (x, y), radius, sy) in enumerate(districts):
        patch = B.cylinder(f"District_{i}", (x, y, 1.478), radius, .05, 8, mats[key],
                           collection, table)
        patch.scale.y = sy
    # Brass compass rose on the rim.
    for i, rot in enumerate((0, math.pi / 2, math.pi / 4, -math.pi / 4)):
        B.cube(f"RoseRay_{i}", (1.62, -1.20, 1.395), (.42 if i < 2 else .30, .045, .02),
               mats["brass"], collection, table, rot)
    B.cylinder("RoseRing", (1.62, -1.20, 1.395), .24, .025, 12, mats["brass"], collection, table)
    B.cylinder("RoseHub", (1.62, -1.20, 1.41), .06, .04, 8, mats["rug_red"], collection, table)
    # Route flags on the lesson stations.
    for i, (x, y, key) in enumerate(((-.30, -.10, "flag_red"), (-.92, .05, "brass"),
                                     (-.42, .62, "brass"), (.28, .30, "brass"),
                                     (.92, .48, "flag_red"))):
        B.cylinder(f"FlagPole_{i}", (x, y, 1.72), .02, .46, 6, mats["iron"], collection, table)
        B.cube(f"FlagPennant_{i}", (x + .10, y, 1.90), (.18, .012, .10), mats[key], collection, table)
    return len(districts)


# ---------------------------------------------------------------- interior
def shift_teaching_cluster(root, dx):
    moved = 0
    for obj in B.descendants(root):
        name = obj.name
        if (name.startswith("TeachingDais") or name.startswith("TeachingBoard") or
                name.startswith("BoardMark_") or name.startswith("TeachingInset") or
                name.startswith("TeachingBench_")):
            obj.location.x += dx
            moved += 1
    return moved


def register_ledger(root, mats, collection):
    register = next(obj for obj in root.children if obj.name == "lesson_register")
    bpy.context.view_layer.update()
    top = bounds_top([obj for obj in B.descendants(register)]) - register.matrix_world.translation.z
    if top <= 0:
        top = 1.20
    ledger = V6.local_box("RegisterLedger", (.02, .06, top + .03), (.66, .48, .06),
                          mats["ledger"], collection, register, rotation=(0, 0, .08), bevel=.01)
    V6.local_box("RegisterLedgerSpine", (-.31, .06, top + .03), (.05, .50, .07),
                 mats["timber"], collection, register, rotation=(0, 0, .08), bevel=.006)
    for i, (x, y) in enumerate(((-.14, .02), (.04, .06), (.20, .10))):
        V6.local_box(f"LedgerLine_{i}", (x, y, top + .067), (.16, .018, .008),
                     mats["iron"], collection, register, bevel=0)
    V6.local_cylinder("RegisterInk", (.30, -.16, top + .09), .06, .12, 8, mats["iron"],
                      collection, register, bevel=.01)
    V6.local_beam("RegisterQuill", (.30, -.16, top + .15), (.46, -.10, top + .52), .024, .024,
                  mats["parchment"], collection, register, .004)
    return ledger


def provision_oilskins(root, mats, collection):
    rack = next(obj for obj in root.children if obj.name == "provision_rack")
    rail = V6.local_box("OilskinRail", (-.62, 0, 2.30), (.08, 3.60, .08), mats["iron"], collection,
                        rack, bevel=0)
    for i, (y, key, drop) in enumerate(((-1.35, "oilskin", 1.30), (-.62, "rug_green", 1.05),
                                        (.10, "oilskin", 1.25), (.85, "path", 1.00),
                                        (1.45, "oilskin", 1.35))):
        V6.local_box(f"Oilskin_{i}", (-.70, y, 2.26 - drop / 2), (.16, .54, drop), mats[key],
                     collection, rack, rotation=(0, 0, RNG.uniform(-.05, .05)), bevel=0)
        V6.local_box(f"OilskinHook_{i}", (-.64, y, 2.32), (.06, .06, .10), mats["brass"],
                     collection, rack, bevel=0)
    return rail


def records_stove(static, mats, collection):
    cx, cy = CHIMNEY_XY
    sx, sy = cx - 1.35, cy - 1.10
    B.cube("RecordsStoveBody", (sx, sy, .62), (.84, .74, .92), mats["iron"], collection, static)
    B.cube("RecordsStoveDoor", (sx, sy - .39, .55), (.46, .05, .40), mats["brass"], collection, static)
    B.cylinder("RecordsStoveFlue", (sx, sy, 2.20), .16, 2.30, 8, mats["iron"], collection, static)
    B.cube("RecordsStoveElbow", (sx + (cx - sx) / 2, sy + (cy - sy) / 2, 3.34),
           (math.hypot(cx - sx, cy - sy) + .30, .30, .30), mats["iron"], collection, static,
           math.atan2(cy - sy, cx - sx))
    B.cylinder("RecordsStoveRiser", (cx, cy, 4.10), .16, 1.70, 8, mats["iron"], collection, static)


def create_building():
    mats = setup_materials()
    collection = bpy.data.collections.new("GuideHall_ArtPassV7")
    bpy.context.scene.collection.children.link(collection)
    root = B.empty("holm_guide_hall_v7", collection)
    root["buildingDefId"] = "holm_guide_hall_v1"
    root["assetId"] = "holm_guide_hall"
    root["revision"] = 7
    root["pipelineVersion"] = 1
    root["assetClass"] = "building"
    root["artDirection"] = "p2d-art-pass-on-approved-anchor"
    static = B.empty("static_architecture", collection, root)
    front_fit, teaching_fit = V6.shell(root, static, collection, mats)
    roof, outer, tile_count = V6.connected_gable_roof(root, collection, mats)
    caps = roof_furniture(roof, mats, collection)
    V5.make_interior(root, static, collection, mats)
    V6.enrich_interior(root, static, collection, mats)
    moved = shift_teaching_cluster(root, DAIS_SHIFT_X)
    districts = hero_chart(root, mats, collection)
    register_ledger(root, mats, collection)
    provision_oilskins(root, mats, collection)
    records_stove(static, mats, collection)
    extras = {"ridgeCaps": caps, "teachingClusterMoved": moved, "districtPatches": districts}
    return (root, static, roof, collection, mats, outer, tile_count, front_fit, teaching_fit, extras)


def authoring_report(root, outer, tile_count, front_fit, teaching_fit, extras):
    descendants = {obj.name for obj in B.descendants(root)}
    required = ("roof", "front_door", "teaching_door", "orientation_table",
                "lesson_register", "first_landing_plaque", "provision_rack")
    dais = next((obj for obj in B.descendants(root) if obj.name == "TeachingDais"), None)
    dais_clear = dais is not None and (dais.location.x + dais.dimensions.x / 2) <= -1.3
    checks = {
        "continuousPerimeterPreserved": len(outer) == len(V6.PERIMETER),
        "fittedDoorLeavesPreserved": front_fit["horizontalGap"] <= .061 and
                                     teaching_fit["horizontalGap"] <= .061,
        "actualRecessedWindowsAuthored": sum("_Pane_" in name for name in descendants) >= 36,
        "irregularMasonryCoursesAuthored": sum("_Stone_" in name for name in descendants) >= 120,
        "loadBearingTimberBaysAuthored": sum("_Brace_" in name for name in descendants) >= 12,
        "layeredConnectedRoofAuthored": tile_count >= 480,
        "occupationalRecordsClusterAuthored": all(any(token in name for name in descendants) for token in
                                                   ("RecordsWritingDesk", "RecordsChair", "OpenRouteMap",
                                                    "Quill", "ScrollRoll")),
        "semanticNodesPreserved": all(name in descendants for name in required),
        # P2-D pass
        "ridgeCapsAuthored": extras["ridgeCaps"] >= 24,
        "chimneyWithPotAuthored": all(name in descendants for name in ("ChimneyStack", "ChimneyPot", "ChimneyCap")),
        "eavesSoffitAuthored": sum(name.startswith("NaveSoffit") or name.startswith("WingSoffit") for name in descendants) >= 6,
        "heroChartRimAndDistricts": "ChartRim" in descendants and extras["districtPatches"] == 6 and
                                    "RoseRing" in descendants and sum(name.startswith("FlagPole_") for name in descendants) == 5,
        "teachingDaisOffDoorAxis": dais_clear and extras["teachingClusterMoved"] >= 8,
        "registerLedgerAndQuill": all(name in descendants for name in ("RegisterLedger", "RegisterQuill")),
        "provisionOilskinsHung": sum(name.startswith("Oilskin_") for name in descendants) == 5,
        "recordsStoveUnderChimney": "RecordsStoveBody" in descendants and "RecordsStoveRiser" in descendants,
    }
    report = {
        "asset": "holm_guide_hall_v7",
        "pipelineVersion": 1,
        "unitsPerTile": 1,
        "checks": checks,
        "visualLanguage": "owner-approved Guide Hall anchor + P2-D brief pass",
        "roofTiles": tile_count,
        "ridgeCaps": extras["ridgeCaps"],
        "metrics": V6.metrics(root),
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    if not all(checks.values()):
        raise RuntimeError("Guide Hall v7 authoring checks failed: " +
                           ", ".join(name for name, ok in checks.items() if not ok))
    return report


def render_export(root, roof, collection, mats):
    scene = bpy.context.scene
    cam = V5.setup_preview(mats)
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 1050
    scene.render.filepath = str(PREVIEW / "guide_hall_v7_exterior.png")
    bpy.ops.render.render(write_still=True)

    B.set_render_hidden(roof, True)
    scene.render.filepath = str(PREVIEW / "guide_hall_v7_roof_off.png")
    bpy.ops.render.render(write_still=True)

    cam.location = (20.5, -25.5, 25.0)
    B.look_at(cam, (0, 0, 1.4))
    cam.data.ortho_scale = 30.0
    scene.render.filepath = str(PREVIEW / "guide_hall_v7_game_camera.png")
    bpy.ops.render.render(write_still=True)

    cam.location = (9.5, -19.0, 8.8)
    B.look_at(cam, (0, -10.7, 1.8))
    cam.data.ortho_scale = 8.9
    scene.render.filepath = str(PREVIEW / "guide_hall_v7_entrance.png")
    bpy.ops.render.render(write_still=True)
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
    (root, static, roof, collection, mats, outer, tile_count,
     front_fit, teaching_fit, extras) = create_building()
    report = authoring_report(root, outer, tile_count, front_fit, teaching_fit, extras)
    targets = [(static, "Static"), (roof, "Roof")]
    for part_name in ("front_door", "teaching_door", "orientation_table", "lesson_register",
                      "first_landing_plaque", "provision_rack"):
        targets.append((next(obj for obj in root.children if obj.name == part_name), part_name))
    for target, prefix in targets:
        B.consolidate_meshes(target, prefix)
    report["metrics"] = V6.metrics(root)
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    render_export(root, roof, collection, mats)
    print("GUIDE_HALL_V7_READY", MODEL)
    print("ASSET_REPORT", json.dumps(report["checks"], sort_keys=True))


if __name__ == "__main__":
    main()
