"""Build Mine Gatehouse v2: the P2-D art pass on the v1 gate tower and winch house.

Brief: docs/rebuild/TUTORS_HOLM_REDESIGN_BRIEFS_2026-09-10.md (Mine Gatehouse). The v1 builder is
reused whole; this pass adds what the review held the sheets for:
  - iron banding across the pyramid roof courses and iron hip rolls on the four hips;
  - studs and strap hinges on both gate leaves and the road door;
  - a hoist beam with rope and hook projecting from the winch-house gable, and a plank loading
    door under it;
  - the shaft mouth: a timber collar and a dark drop under the head-frame, so the descent reads
    as a way down (the frame is already the Climb-down primary during the lesson).
Runtime contract, station empties and every v1 authoring check are preserved; no new materials.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_guide_hall_v3 as B
import build_holm_mine_gatehouse_v1 as G1
import build_holm_teaching_kitchen_v1 as K
import build_survival_workyard_v1 as V1

ROOT = Path(__file__).resolve().parents[2]
G1.SOURCE = ROOT / "assets" / "blender" / "holm_mine_gatehouse_v2.blend"
G1.MODEL = ROOT / "assets" / "models" / "buildings" / "holm_mine_gatehouse_v2.glb"
G1.PREVIEW = ROOT / "scratchpad" / "mine_gatehouse_v2"
G1.REPORT = G1.PREVIEW / "asset_report.json"
G1.PROGRESS = G1.PREVIEW / "build_progress.txt"
for path in (G1.SOURCE.parent, G1.MODEL.parent, G1.PREVIEW):
    path.mkdir(parents=True, exist_ok=True)
box, cyl = K.box, K.cyl


def local_bounds(empty):
    lo, hi = [1e9] * 3, [-1e9] * 3
    for obj in B.descendants(empty):
        if obj.type != "MESH":
            continue
        for corner in obj.bound_box:
            w = empty.matrix_world.inverted() @ (obj.matrix_world @ Vector(corner))
            for i in range(3):
                lo[i] = min(lo[i], w[i]); hi[i] = max(hi[i], w[i])
    return lo, hi


def tower_iron(roof, mats, collection):
    pts = [(G1.TX0 - .45, G1.TY0 - .45), (G1.TX1 + .45, G1.TY0 - .45), (G1.TX1 + .45, G1.TY1 + .45), (G1.TX0 - .45, G1.TY1 + .45)]
    eave, peak = G1.TOWER_H + .12, 8.1
    cx, cy = (G1.TX0 + G1.TX1) / 2, 0
    top = [(cx + (x - cx) * .14, cy + (y - cy) * .14, peak) for x, y in pts]
    bands = 0
    for i in range(4):
        a, b = pts[i], pts[(i + 1) % 4]
        ta, tb = top[i], top[(i + 1) % 4]
        ang = math.atan2(b[1] - a[1], b[0] - a[0])
        mid_e = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        mid_t = ((ta[0] + tb[0]) / 2, (ta[1] + tb[1]) / 2)
        run = math.hypot(mid_t[0] - mid_e[0], mid_t[1] - mid_e[1])
        tilt = math.atan2(peak - eave, max(.05, run))
        for t in (.30, .58, .84):
            ax, ay = a[0] + (ta[0] - a[0]) * t, a[1] + (ta[1] - a[1]) * t
            bx, by = b[0] + (tb[0] - b[0]) * t, b[1] + (tb[1] - b[1]) * t
            z = eave + (peak - eave) * t + .11
            box(f"TowerIronBand_{i}_{bands}", ((ax + bx) / 2, (ay + by) / 2, z), (math.hypot(bx - ax, by - ay) * .96, .10, .05),
                mats["iron"], collection, roof, rotation=(tilt, 0, ang))
            bands += 1
        # hip roll from the corner up to the cap
        hx, hy = (a[0] + ta[0]) / 2, (a[1] + ta[1]) / 2
        length = math.hypot(ta[0] - a[0], ta[1] - a[1], peak - eave)
        pitch = math.atan2(peak - eave, math.hypot(ta[0] - a[0], ta[1] - a[1]))
        yaw = math.atan2(ta[1] - a[1], ta[0] - a[0])
        box(f"TowerHipRoll_{i}", (hx, hy, (eave + peak) / 2 + .12), (length, .14, .12), mats["iron"], collection, roof,
            rotation=(0, -pitch, yaw))
    return bands


def door_studs(root, mats, collection):
    studs = 0
    for name in ("gate_door", "road_door"):
        leaf = next(o for o in root.children if o.name == name)
        bpy.context.view_layer.update()
        lo, hi = local_bounds(leaf)
        w, h = hi[0] - lo[0], hi[2] - lo[2]
        thick_axis = 1 if (hi[1] - lo[1]) < (hi[0] - lo[0]) else 0
        for face in (-1, 1):
            for col in range(3):
                for row in range(2):
                    x = lo[0] + w * (.2 + .3 * col)
                    z = lo[2] + h * (.28 + .44 * row)
                    y = (lo[1] if face < 0 else hi[1]) + face * .02 if thick_axis == 1 else (lo[1] + hi[1]) / 2
                    cyl(f"{name}_Stud_{studs}", (x, y, z), .045, .05, 6, mats["iron"], collection, leaf,
                        rotation=(math.pi / 2, 0, 0))
                    studs += 1
            for row in range(2):
                z = lo[2] + h * (.28 + .44 * row)
                y = (lo[1] if face < 0 else hi[1]) + face * .015 if thick_axis == 1 else (lo[1] + hi[1]) / 2
                box(f"{name}_Strap_{row}", (lo[0] + w * .5, y, z), (w * .82, .025, .09), mats["iron"], collection, leaf)
    return studs


def hoist_and_loading_door(roof, static, mats, collection):
    gx = G1.HX0
    zb = G1.HOUSE_H + 1.25
    box("HoistBeam", (gx - .75, 0, zb), (1.9, .22, .22), mats["timber"], collection, roof)
    box("HoistBeamBrace", (gx - .30, 0, zb - .42), (.9, .18, .18), mats["timber"], collection, roof, rotation=(0, .9, 0))
    cyl("HoistRope", (gx - 1.55, 0, zb - .55), .03, 1.0, 6, mats["rope"], collection, roof)
    box("HoistHook", (gx - 1.55, 0, zb - 1.12), (.12, .12, .22), mats["iron"], collection, roof)
    cyl("HoistPulley", (gx - 1.55, 0, zb + .02), .14, .10, 10, mats["iron"], collection, roof, rotation=(math.pi / 2, 0, 0))
    # plank loading door in the gable under the beam
    for k in range(3):
        box(f"LoadingDoorPlank_{k}", (gx - .20, -.36 + k * .36, G1.HOUSE_H + .78), (.06, .33, 1.35), mats["wood"], collection, roof)
    box("LoadingDoorFrame", (gx - .17, 0, G1.HOUSE_H + .78), (.05, 1.24, 1.5), mats["timber"], collection, roof)
    box("LoadingDoorBrace", (gx - .23, 0, G1.HOUSE_H + .78), (.03, .95, .10), mats["iron"], collection, roof, rotation=(.65, 0, 0))
    return True


def shaft_mouth(root, mats, collection):
    frame = next(o for o in root.children if o.name == "shaft_frame")
    box("ShaftDrop", (0, 0, .01), (1.5, 1.5, .02), mats["ink"], collection, frame)
    for k, (x, y, w, d) in enumerate(((0, .85, 1.9, .2), (0, -.85, 1.9, .2), (.85, 0, .2, 1.5), (-.85, 0, .2, 1.5))):
        box(f"ShaftCollar_{k}", (x, y, .16), (w, d, .22), mats["timber"], collection, frame)
    return True


def main():
    B.clean_scene()
    root, static, roof, collection, mats, tiles = G1.create_building()
    root.name = "holm_mine_gatehouse_v2"
    root["revision"] = 2
    root["artPass"] = "p2d-iron-studs-hoist-shaft-mouth"
    bands = tower_iron(roof, mats, collection)
    studs = door_studs(root, mats, collection)
    hoist_and_loading_door(roof, static, mats, collection)
    shaft_mouth(root, mats, collection)
    G1.authoring_report(root, tiles)
    report = json.loads(G1.REPORT.read_text(encoding="utf-8"))
    names = {o.name for o in B.descendants(root)}
    extra = {
        "towerIronBandsAuthored": bands >= 12 and sum(n.startswith("TowerHipRoll") for n in names) == 4,
        "doorStudsAuthored": studs >= 24 and sum("_Strap_" in n for n in names) >= 4,
        "hoistBeamAndLoadingDoorAuthored": all(n in names for n in ("HoistBeam", "HoistHook", "LoadingDoorFrame")),
        "shaftMouthAuthored": "ShaftDrop" in names and sum(n.startswith("ShaftCollar") for n in names) == 4,
    }
    report.setdefault("checks", {}).update(extra)
    report["asset"] = "holm_mine_gatehouse_v2"
    G1.REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    if not all(extra.values()):
        raise RuntimeError("Mine Gatehouse v2 checks failed: " + ", ".join(n for n, ok in extra.items() if not ok))
    G1.mark("consolidate")
    for target, prefix in ((static, "Static"), (roof, "Roof")):
        V1.consolidate(target, prefix)
    for name in G1.SEMANTIC[1:]:
        target = next(obj for obj in root.children if obj.name == name)
        if list(target.children_recursive):
            V1.consolidate(target, name)
    G1.mark("render")
    G1.render_export(root, roof, collection, mats)
    G1.mark("done")
    print("MINE_GATEHOUSE_V2_READY", G1.MODEL)


if __name__ == "__main__":
    main()
