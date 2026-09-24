"""Build Quest Lodge v2: the P2-D art pass on the v1 three-mass lodge.

Brief: docs/rebuild/TUTORS_HOLM_REDESIGN_BRIEFS_2026-09-10.md (Quest Lodge). The v1 builder is reused
whole (hall, chart turret, porch, board, map, ledger, bench, rack); this pass adds what the review held
the sheets for:
  - turned porch balusters under a top rail along the porch edge;
  - laid ridge caps on the hall ridge so the gable tiles stop reading as a flat diagonal pattern, and
    iron finials at both hall gable ends;
  - the reading corner as a second occupation cluster: a rug under the bench, a candle stand with a lit
    candle, open pages on the bench book, a title strip and contour lines on the region map.
Runtime contract (footprint, doors, station empties) and every v1 authoring check are preserved; no new
materials (29 of 40 stay).
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_guide_hall_v3 as B
import build_holm_quest_lodge_v1 as L1
import build_holm_teaching_kitchen_v1 as K
import build_survival_workyard_v1 as V1

ROOT = Path(__file__).resolve().parents[2]
L1.SOURCE = ROOT / "assets" / "blender" / "holm_quest_lodge_v2.blend"
L1.MODEL = ROOT / "assets" / "models" / "buildings" / "holm_quest_lodge_v2.glb"
L1.PREVIEW = ROOT / "scratchpad" / "quest_lodge_v2"
L1.REPORT = L1.PREVIEW / "asset_report.json"
L1.PROGRESS = L1.PREVIEW / "build_progress.txt"
for path in (L1.SOURCE.parent, L1.MODEL.parent, L1.PREVIEW):
    path.mkdir(parents=True, exist_ok=True)
box, cyl = K.box, K.cyl


def porch_balusters(static, mats, collection):
    x = L1.PORCH_X1 + .30
    count = 0
    y = -2.55
    while y <= 2.55:
        if abs(y) > .55:                                  # leave the porch step open at the centre
            cyl(f"PorchBaluster_{count}", (x, y, .48), .055, .92, 6, mats["timber"], collection, static)
            cyl(f"PorchBalusterKnob_{count}", (x, y, .70), .085, .10, 6, mats["wood"], collection, static)
            count += 1
        y += .52
    for y0, y1 in ((-2.95, -.60), (.60, 2.95)):
        box("PorchRail", (x, (y0 + y1) / 2, .98), (.14, y1 - y0, .10), mats["wood"], collection, static)
        box("PorchRailFoot", (x, (y0 + y1) / 2, .06), (.16, y1 - y0, .10), mats["timber"], collection, static)
    for y in (-2.95, 2.95, -.60, .60):
        box("PorchNewel", (x, y, .55), (.16, .16, 1.10), mats["timber"], collection, static)
        cyl("PorchNewelCap", (x, y, 1.16), .11, .12, 6, mats["wood"], collection, static)
    return count


def hall_ridge(roof, mats, collection):
    x0, x1 = L1.HX0 - .45, L1.HX1 + .45
    cy, peak = (L1.HY0 + L1.HY1) / 2, 6.9
    caps = 0
    x = x0 + .35
    while x <= x1 - .35:
        cyl(f"HallRidgeCap_{caps}", (x, cy, peak + .15), .22, 1.20, 5,
            mats["stone_light" if caps % 3 else "roof_light"], collection, roof, rotation=(0, math.pi / 2, 0))
        x += 1.12
        caps += 1
    for x_end in (x0 - .05, x1 + .05):
        cyl("HallGableFinial", (x_end, cy, peak + .32), .06, .58, 6, mats["iron"], collection, roof)
        cyl("HallGableFinialKnob", (x_end, cy, peak + .64), .12, .16, 6, mats["brass"], collection, roof)
    return caps


def reading_corner(root, static, mats, collection):
    bench = next(o for o in root.children if o.name == "reading_bench")
    bx, by = bench.location.x, bench.location.y
    box("ReadingRug", (bx, by - .35, .215), (3.1, 1.7, .03), mats["rug_red"], collection, static)
    box("ReadingRugBorder", (bx, by - .35, .205), (3.4, 2.0, .02), mats["rug_blue"], collection, static)
    stand = B.empty("ReadingCandleStand", collection, static, (bx + 1.45, by - .55, 0))
    cyl("CandleStandBase", (0, 0, .06), .22, .12, 8, mats["iron"], collection, stand)
    cyl("CandleStandStem", (0, 0, .62), .04, 1.05, 6, mats["iron"], collection, stand)
    cyl("CandleStandDish", (0, 0, 1.16), .16, .05, 8, mats["brass"], collection, stand)
    cyl("CandleStandCandle", (0, 0, 1.32), .05, .28, 6, mats["wax"], collection, stand)
    cyl("CandleStandFlame", (0, 0, 1.52), .03, .10, 5, mats["glass_warm"], collection, stand)
    # open pages on the bench book
    book = next((o for o in B.descendants(bench) if o.name.startswith("BenchBook")), None)
    if book is not None:
        lx, ly, lz = book.location
        box("BenchBookPages", (lx, ly, lz + .035), (.30, .22, .02), mats["parchment"], collection, bench,
            rotation=(0, 0, .3))
        box("BenchBookRibbon", (lx + .04, ly, lz + .046), (.03, .24, .006), mats["wax"], collection, bench,
            rotation=(0, 0, .3))
    # region map: title strip and contour lines
    chart = next(o for o in root.children if o.name == "region_map")
    top = next((o for o in chart.children if o.name.startswith("ChartTop")), chart)
    box("ChartTitleStrip", (0, .72, .96), (1.2, .12, .012), mats["parchment_old"], collection, top)
    for k, (x, y, w, rot) in enumerate(((-.55, .05, .36, .4), (.15, .12, .30, -.5), (-.05, -.5, .40, .2))):
        box(f"ChartContour_{k}", (x, y, .945), (w, .012, .008), mats["ink"], collection, top, rotation=(0, 0, rot))
    return True


def main():
    B.clean_scene()
    root, static, roof, collection, mats, tiles = L1.create_building()
    root.name = "holm_quest_lodge_v2"
    root["revision"] = 2
    root["artPass"] = "p2d-balusters-ridge-reading-corner"
    balusters = porch_balusters(static, mats, collection)
    caps = hall_ridge(roof, mats, collection)
    reading_corner(root, static, mats, collection)
    L1.authoring_report(root, tiles)
    report = json.loads(L1.REPORT.read_text(encoding="utf-8"))
    names = {o.name for o in B.descendants(root)}
    extra = {
        "porchBalustersAuthored": balusters >= 7 and sum(n.startswith("PorchRail") for n in names) >= 2,
        "hallRidgeCapsAuthored": caps >= 6 and sum(n.startswith("HallGableFinialKnob") for n in names) == 2,
        "readingCornerAuthored": all(n in names for n in ("ReadingRug", "CandleStandCandle", "BenchBookPages", "ChartTitleStrip")),
    }
    report.setdefault("checks", {}).update(extra)
    report["asset"] = "holm_quest_lodge_v2"
    L1.REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    if not all(extra.values()):
        raise RuntimeError("Quest Lodge v2 checks failed: " + ", ".join(n for n, ok in extra.items() if not ok))
    L1.mark("consolidate")
    for target, prefix in ((static, "Static"), (roof, "Roof")):
        V1.consolidate(target, prefix)
    for name in L1.SEMANTIC[1:]:
        target = next(obj for obj in root.children if obj.name == name)
        if list(target.children_recursive):
            V1.consolidate(target, name)
    L1.mark("render")
    L1.render_export(root, roof, collection, mats)
    L1.mark("done")
    print("QUEST_LODGE_V2_READY", L1.MODEL)


if __name__ == "__main__":
    main()
