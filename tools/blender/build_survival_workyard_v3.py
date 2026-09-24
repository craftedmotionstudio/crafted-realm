"""Build Survival Workyard v3: the P2-D art pass on the owner-directed v2 compound.

Brief: docs/rebuild/TUTORS_HOLM_REDESIGN_BRIEFS_2026-09-10.md (Survival Workyard).
The v2 builder is reused whole (foundations, walls, doors, court, furnishings, the three
roof masses, the cellar) and this pass adds the roof furniture the brief asks for:
  - laid ridge caps on the lodge and passage ridges, lighter than the tiles so the ridge
    reads at gameplay distance;
  - a clay chimney pot with a lip on the hearth flue, and a ridge finial on the lodge gable;
  - eaves soffit boards under the lodge and passage fascias.
Everything else (station empties, doors, families, names) is untouched: the runtime
contract and every v2 authoring check stay as they are. The marked lesson trees and the
fire ring the brief also names are runtime props (src/holm_survival_trees.js,
src/world_v2_objects.js), not GLB work.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_survival_workyard_v2 as W
import build_guide_hall_v3 as B

ROOT = Path(__file__).resolve().parents[2]
W.SOURCE = ROOT / "assets" / "blender" / "holm_survival_workyard_v3.blend"
W.MODEL = ROOT / "assets" / "models" / "buildings" / "holm_survival_workyard_v3.glb"
W.PREVIEW = ROOT / "scratchpad" / "survival_workyard_v3"
W.REPORT = W.PREVIEW / "asset_report.json"
for path in (W.SOURCE.parent, W.MODEL.parent, W.PREVIEW):
    path.mkdir(parents=True, exist_ok=True)


def roof_furniture(roof, mats):
    """Ridge caps, chimney pot, finial and soffits on the v2 roof masses."""
    added = 0
    # Lodge ridge runs along y at x = -5, peak 7.05; passage ridge runs along x at y = 2.0, peak 5.58.
    y = -5.9
    while y <= 5.9:
        B.cylinder(f"LodgeRidgeCap_{added}", (-5.0, y, 7.05 + .16), .25, 1.55, 5,
                   mats["stone_light" if added % 3 else "roof_light"], W.COLLECTION, roof,
                   rot=(math.pi / 2, 0, 0))
        y += 1.48
        added += 1
    x = -1.3
    while x <= 2.0:
        B.cylinder(f"PassageRidgeCap_{added}", (x, 2.0, 5.58 + .15), .22, 1.20, 5,
                   mats["stone_light" if added % 3 else "roof_light"], W.COLLECTION, roof,
                   rot=(0, math.pi / 2, 0))
        x += 1.12
        added += 1
    # Lodge gable finials at both ridge ends.
    for y_end in (-6.35, 6.35):
        B.cylinder("LodgeFinialPost", (-5.0, y_end, 7.45), .07, .85, 6, mats["iron"], W.COLLECTION, roof)
        B.cylinder("LodgeFinialKnob", (-5.0, y_end, 7.92), .16, .22, 6, mats["iron_light"], W.COLLECTION, roof)
    # Clay pot on the hearth flue (flue cap sits at z 6.75 over (6.25, 3.72)).
    B.cylinder("FluePot", (6.25, 3.72, 7.16), .26, .62, 8, mats["ceramic_cream"], W.COLLECTION, roof)
    B.cylinder("FluePotLip", (6.25, 3.72, 7.50), .31, .10, 8, mats["ceramic_cream"], W.COLLECTION, roof)
    # Soffit boards under the lodge and passage fascias.
    for x_side in (-9.0 - .55, -1.0 + .55):
        B.cube("LodgeSoffit", (x_side, 0, W.WALL_H - .22), (.34, 13.0, .12), mats["oak_dark"], W.COLLECTION, roof)
    for y_side in (.24 - .55, 3.76 + .55):
        B.cube("PassageSoffit", (.35, y_side, W.WALL_H - .22), (3.62, .34, .12), mats["oak_dark"], W.COLLECTION, roof)
    return added


def main():
    B.clean_scene()
    W.mark("clean")
    mats = W.materials()
    W.mark("materials")
    surface, static, roof, furnishings, fireplace, surface_collection, tile_count = W.surface_build(mats)
    surface.name = "holm_survival_workyard_v3"
    surface["revision"] = 15
    surface["artPass"] = "p2d-roof-furniture"
    caps = roof_furniture(roof, mats)
    W.mark("surface complete + roof furniture")
    W.authoring_report(surface, tile_count)
    report = json.loads(W.REPORT.read_text(encoding="utf-8"))
    names = {obj.name for obj in W.descendants(surface)}
    extra = {
        "ridgeCapsAuthored": caps >= 10,
        "fluePotAuthored": "FluePot" in names and "FluePotLip" in names,
        "gableFinialsAuthored": sum(name.startswith("LodgeFinialKnob") for name in names) == 2,
        "soffitsAuthored": sum(name.startswith("LodgeSoffit") or name.startswith("PassageSoffit") for name in names) == 4,
    }
    report.setdefault("checks", {}).update(extra)
    report["asset"] = "holm_survival_workyard_v3"
    report["ridgeCaps"] = caps
    W.REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    if not all(extra.values()):
        raise RuntimeError("Survival Workyard v3 roof furniture checks failed: " +
                           ", ".join(name for name, ok in extra.items() if not ok))
    W.mark("pre report")
    W.consolidate(static, "Static")
    W.consolidate(roof, "Roof")
    for item in list(furnishings.children):
        W.consolidate(item, "Furnishing_" + item.name)
    for name in ("trail_door", "pond_door", "tool_bench", "firemaking_board",
                 "storm_tally_beam", "net_rack", "cellar_ladder"):
        target = next(obj for obj in surface.children if obj.name == name)
        W.consolidate(target, name)
    W.consolidate(fireplace, "TeachingFireplace", ("hearth_flame",))
    flame = next(obj for obj in W.descendants(fireplace) if obj.name == "hearth_flame")
    W.consolidate(flame, "HearthFlame")
    W.mark("surface semantics consolidated")
    W.refresh_report_metrics(surface)
    W.mark("post report")
    W.render_export(surface, roof, surface_collection, mats)
    print("SURVIVAL_WORKYARD_V3_READY", W.MODEL)


if __name__ == "__main__":
    main()
