"""Build Holm Bank v2: the P2-D art pass on the v1 civic hall.

Brief: docs/rebuild/TUTORS_HOLM_REDESIGN_BRIEFS_2026-09-10.md (Holm Bank). The v1 builder is reused
whole; this pass adds what the review held the sheets for:
  - a proper dormer cap with a brass finial, bargeboards on both hall gables and a datestone over
    the front door;
  - turned booth bars (the hairline bars gain thick turned columns), a counter bell at the east booth;
  - a bordered marble pattern with a velvet runner from the front door to the counter;
  - an authored vault chest on the strongbox shelf station.
Runtime contract, station empties and every v1 authoring check are preserved; no new materials.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_guide_hall_v3 as B
import build_holm_bank_v1 as N1
import build_holm_teaching_kitchen_v1 as K
import build_survival_workyard_v1 as V1

ROOT = Path(__file__).resolve().parents[2]
N1.SOURCE = ROOT / "assets" / "blender" / "holm_bank_v2.blend"
N1.MODEL = ROOT / "assets" / "models" / "buildings" / "holm_bank_v2.glb"
N1.PREVIEW = ROOT / "scratchpad" / "holm_bank_v2"
N1.REPORT = N1.PREVIEW / "asset_report.json"
N1.PROGRESS = N1.PREVIEW / "build_progress.txt"
for path in (N1.SOURCE.parent, N1.MODEL.parent, N1.PREVIEW):
    path.mkdir(parents=True, exist_ok=True)
box, cyl = K.box, K.cyl


def roof_dressing(roof, static, mats, collection):
    peak, eave = 7.3, N1.HALL_H + .10
    # dormer cap + finial (dormer at (0.5, -2.2), roof slab at HALL_H + 2.15)
    box("DormerRidgeCap", (0.5, -2.2, N1.HALL_H + 2.34), (2.4, .22, .12), mats["timber"], collection, roof)
    cyl("DormerFinialPost", (0.5, -2.9, N1.HALL_H + 2.55), .05, .40, 6, mats["iron"], collection, roof)
    cyl("DormerFinialKnob", (0.5, -2.9, N1.HALL_H + 2.80), .11, .14, 6, mats["brass"], collection, roof)
    # bargeboards on both gables, outside the braces
    wall_half = (N1.Y1 - N1.Y0) / 2
    boards = 0
    for x in (N1.X0, N1.X1):
        out = -.34 if x < 0 else .34
        for side in (-1, 1):
            V1.beam(f"HallBargeboard_{boards}", (x + out, side * (wall_half + .55), eave - .02), (x + out, 0, peak + .04),
                    .16, .22, mats["timber"], collection, roof, bevel=0)
            boards += 1
        cyl("HallGableFinial", (x + out, 0, peak + .30), .05, .50, 6, mats["iron"], collection, roof)
        cyl("HallGableFinialKnob", (x + out, 0, peak + .58), .11, .14, 6, mats["brass"], collection, roof)
    # datestone over the front door (south wall, x 0.5)
    box("Datestone", (0.5, N1.Y0 - .17, N1.HALL_H - .55), (.9, .10, .55), mats["stone_light"], collection, static)
    box("DatestoneInlay", (0.5, N1.Y0 - .23, N1.HALL_H - .55), (.52, .02, .22), mats["gold"], collection, static)
    return boards


def booth_dressing(root, mats, collection):
    bars = 0
    for name in ("bank_booth_w", "bank_booth_e"):
        booth = next(o for o in root.children if o.name == name)
        for k in range(6):
            x = -.55 + k * .22
            cyl(f"BoothTurnedBar_{k}", (x, 0, 2.05), .034, 1.7, 6, mats["gold"], collection, booth)
            for z in (1.55, 2.05, 2.55):
                cyl(f"BoothBarKnop_{k}", (x, 0, z), .05, .06, 6, mats["gold"], collection, booth)
            bars += 1
    east = next(o for o in root.children if o.name == "bank_booth_e")
    cyl("CounterBellBase", (.45, -.22, 1.28), .09, .03, 8, mats["brass"], collection, east)
    cyl("CounterBellDome", (.45, -.22, 1.34), .07, .09, 8, mats["gold"], collection, east)
    cyl("CounterBellButton", (.45, -.22, 1.40), .02, .04, 6, mats["iron"], collection, east)
    return bars


def floor_pattern(static, mats, collection):
    # bordered field: dark border strip round the customer hall, velvet runner door -> counter with gold edges
    for (x, y, w, d) in ((0, N1.Y0 + .25, N1.X1 - N1.X0 - .2, .3), (0, N1.COUNTER_Y - .25, N1.X1 - N1.X0 - .2, .3),
                         (N1.X0 + .25, (N1.Y0 + N1.COUNTER_Y) / 2, .3, N1.COUNTER_Y - N1.Y0 - .2),
                         (N1.X1 - .25, (N1.Y0 + N1.COUNTER_Y) / 2, .3, N1.COUNTER_Y - N1.Y0 - .2)):
        box("MarbleBorder", (x, y, .145), (w, d, .012), mats["marble_dark"], collection, static)
    rx = 0.5
    length = N1.COUNTER_Y - N1.Y0 - .9
    box("HallRunner", (rx, (N1.Y0 + N1.COUNTER_Y) / 2 + .1, .152), (1.3, length, .014), mats["velvet"], collection, static)
    for side in (-1, 1):
        box("HallRunnerEdge", (rx + side * .62, (N1.Y0 + N1.COUNTER_Y) / 2 + .1, .158), (.06, length, .008), mats["gold"],
            collection, static)
    return True


def vault_chest(root, mats, collection):
    shelf = next(o for o in root.children if o.name == "strongbox_shelf")
    g = B.empty("VaultChest", collection, shelf, (2.05, .05, 0))
    box("VaultChestBody", (0, 0, .40), (1.15, .72, .70), mats["strongbox"], collection, g)
    box("VaultChestLid", (0, 0, .80), (1.19, .76, .14), mats["walnut"], collection, g)
    for x in (-.38, .38):
        box("VaultChestBand", (x, 0, .42), (.10, .78, .80), mats["iron"], collection, g)
    box("VaultChestLock", (0, -.38, .48), (.16, .04, .18), mats["gold"], collection, g)
    box("VaultChestHasp", (0, -.36, .60), (.10, .03, .12), mats["iron"], collection, g)
    return True


def main():
    B.clean_scene()
    root, static, roof, collection, mats, tiles = N1.create_building()
    root.name = "holm_bank_v2"
    root["revision"] = 2
    root["artPass"] = "p2d-dormer-bargeboards-bars-runner-chest"
    boards = roof_dressing(roof, static, mats, collection)
    bars = booth_dressing(root, mats, collection)
    floor_pattern(static, mats, collection)
    vault_chest(root, mats, collection)
    N1.authoring_report(root, tiles)
    report = json.loads(N1.REPORT.read_text(encoding="utf-8"))
    names = {o.name for o in B.descendants(root)}
    extra = {
        "dormerCapFinialBargeboardsDatestone": boards == 4 and all(n in names for n in ("DormerRidgeCap", "DormerFinialKnob", "Datestone")),
        "turnedBoothBarsAndBell": bars == 12 and "CounterBellDome" in names,
        "borderedFloorWithRunner": "HallRunner" in names and sum(n.startswith("MarbleBorder") for n in names) == 4,
        "authoredVaultChest": all(n in names for n in ("VaultChestBody", "VaultChestLock")),
    }
    report.setdefault("checks", {}).update(extra)
    report["asset"] = "holm_bank_v2"
    N1.REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    if not all(extra.values()):
        raise RuntimeError("Holm Bank v2 checks failed: " + ", ".join(n for n, ok in extra.items() if not ok))
    N1.mark("consolidate")
    for target, prefix in ((static, "Static"), (roof, "Roof")):
        V1.consolidate(target, prefix)
    for name in N1.SEMANTIC[1:]:
        target = next(obj for obj in root.children if obj.name == name)
        if list(target.children_recursive):
            V1.consolidate(target, name)
    N1.mark("render")
    N1.render_export(root, roof, collection, mats)
    N1.mark("done")
    print("HOLM_BANK_V2_READY", N1.MODEL)


if __name__ == "__main__":
    main()
