"""Build Teaching Kitchen v2: the P2-D art pass on the v1 compound.

Brief: docs/rebuild/TUTORS_HOLM_REDESIGN_BRIEFS_2026-09-10.md (Teaching Kitchen). The v1 builder is
reused whole (L-plan with polygonal apse, three roof masses, fitted doors, working range and the bake
stations); this pass adds what the review held the sheets for:
  - louvred shutters with hinge pins on every window (the v1 shutters were flat slabs);
  - bargeboards and a finial on both bakehouse gables;
  - a clay pot on the range flue;
  - a second interior cluster: herb and onion strings from the bakehouse beams, loaves on the bread
    rack, flour dust on the kneading table, a bread peel leaning on the range.
The runtime contract (footprint, doors, station empties) and every v1 authoring check are preserved.
Palette held at the v1 materials (30, the manifest limit): no new material is created.
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
import build_guide_hall_v6 as V6
import build_holm_teaching_kitchen_v1 as K1
import build_survival_workyard_v1 as V1

ROOT = Path(__file__).resolve().parents[2]
K1.SOURCE = ROOT / "assets" / "blender" / "holm_teaching_kitchen_v2.blend"
K1.MODEL = ROOT / "assets" / "models" / "buildings" / "holm_teaching_kitchen_v2.glb"
K1.PREVIEW = ROOT / "scratchpad" / "teaching_kitchen_v2"
K1.REPORT = K1.PREVIEW / "asset_report.json"
for path in (K1.SOURCE.parent, K1.MODEL.parent, K1.PREVIEW):
    path.mkdir(parents=True, exist_ok=True)
box, cyl = K1.box, K1.cyl


def bounds(obj_list):
    lo, hi = [1e9] * 3, [-1e9] * 3
    for obj in obj_list:
        if obj.type != "MESH":
            continue
        for corner in obj.bound_box:
            w = obj.matrix_world @ Vector(corner)
            for i in range(3):
                lo[i] = min(lo[i], w[i]); hi[i] = max(hi[i], w[i])
    return lo, hi


def louvred_shutters(root, mats, collection):
    slats = 0
    for shutter in [o for o in B.descendants(root) if o.type == "MESH" and "_Shutter" in o.name and "Batten" not in o.name]:
        g = shutter.parent
        sx, sy, sz = shutter.location
        h = shutter.dimensions.z
        for k in range(4):
            slat = box(f"{shutter.name}_Louvre_{k}", (sx, sy - .05, sz + (k - 1.5) * (h * .22)), (.40, .03, .06),
                       mats["timber"], collection, g, rotation=(.55, 0, 0))
            slats += 1
        outer = 1 if sx > 0 else -1
        for z in (sz - h * .32, sz + h * .32):
            cyl(f"{shutter.name}_Hinge", (sx + outer * .20, sy - .06, z), .03, .11, 6,
                mats.get("brass", mats["iron"]), collection, g)
    return slats


def gable_bargeboards(roof, mats, collection):
    cx = (K1.BAKE_X0 + K1.BAKE_X1) / 2
    half = (K1.BAKE_X1 - K1.BAKE_X0) / 2 + .55
    eave, peak = K1.BAKE_H + .10, 7.35
    boards = 0
    for y_end in (K1.BAKE_Y0 - .45 - .08, K1.BAKE_Y1 + .45 + .08):
        for side in (-1, 1):
            V6.local_beam("BakeBargeboard", (cx + side * (half + .12), y_end, eave - .04),
                          (cx, y_end, peak + .06), .18, .22, mats["timber"], collection, roof, 0)
            boards += 1
        cyl("BakeGableFinial", (cx, y_end, peak + .30), .06, .55, 6, mats["iron"], collection, roof)
        cyl("BakeGableFinialKnob", (cx, y_end, peak + .62), .12, .16, 6, mats.get("brass", mats["iron"]), collection, roof)
    return boards


def flue_pot(root, roof, mats, collection):
    flue = next((o for o in B.descendants(root) if o.name.startswith("RangeFlue")), None)
    if flue is None:
        return False
    bpy.context.view_layer.update()
    lo, hi = bounds([flue])
    cx, cy, top = (lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, hi[2]
    cyl("RangeFluePot", (cx, cy, top + .28), .24, .56, 8, mats["pottery_cream"], collection, roof)
    cyl("RangeFluePotLip", (cx, cy, top + .58), .29, .10, 8, mats["pottery_cream"], collection, roof)
    return True


def interior_cluster(root, static, mats, collection):
    bpy.context.view_layer.update()
    strings = 0
    # Herb and onion strings from the bakehouse beams.
    for i, (y, kind) in enumerate(((-3.3, "herb"), (-1.1, "grain"), (1.3, "herb"), (3.4, "grain"))):
        x = K1.BAKE_X0 + 1.6
        cyl(f"BeamString_{i}", (x, y, K1.BAKE_H - .55), .015, .80, 5, mats["timber"], collection, static)
        for k in range(4):
            z = K1.BAKE_H - .30 - k * .17
            if kind == "herb":
                box(f"HerbBundle_{i}_{k}", (x + (.05 if k % 2 else -.05), y, z), (.14, .11, .17), mats["herb"],
                    collection, static, rotation=(0, 0, .3 * k))
            else:
                cyl(f"Onion_{i}_{k}", (x + (.05 if k % 2 else -.05), y, z), .075, .11, 6, mats["grain"],
                    collection, static)
        strings += 1
    # Loaves on the bread rack shelves.
    rack = next(o for o in root.children if o.name == "bread_rack")
    shelves = [o for o in B.descendants(rack) if o.name.startswith("RackShelf")]
    loaves = 0
    for s_idx, shelf in enumerate(shelves[:2]):
        lo, hi = bounds([shelf])
        top = hi[2]
        length = hi[0] - lo[0]
        for k in range(3):
            x = lo[0] + length * (k + .5) / 3
            world = Vector((x, (lo[1] + hi[1]) / 2, top + .08))
            local = rack.matrix_world.inverted() @ world
            box(f"RackLoaf_{s_idx}_{k}", tuple(local), (.30, .18, .15), mats["crust"], collection, rack,
                rotation=(0, 0, .15 * (k - 1)))
            loaves += 1
    # Flour dust on the kneading table.
    table = next(o for o in root.children if o.name == "kneading_table")
    lo, hi = bounds(list(B.descendants(table)))
    world = Vector(((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, hi[2] + .008))
    local = table.matrix_world.inverted() @ world
    box("KneadingFlourDust", tuple(local), (min(1.0, (hi[0] - lo[0]) * .6), min(.6, (hi[1] - lo[1]) * .6), .012),
        mats["flour"], collection, table)
    # Bread peel leaning on the range.
    rng = next(o for o in root.children if o.name == "teaching_range")
    lo, hi = bounds(list(B.descendants(rng)))
    peel_world = Vector((lo[0] - .18, (lo[1] + hi[1]) / 2 + .6, 1.05))
    local = rng.matrix_world.inverted() @ peel_world
    V6.local_beam("BreadPeelHandle", (local.x, local.y, .05), (local.x - .35, local.y, 2.05), .05, .05,
                  mats["timber"], collection, rng, 0)
    box("BreadPeelBlade", (local.x - .42, local.y, 2.20), (.34, .26, .03), mats["timber"], collection, rng,
        rotation=(0, -.35, 0))
    return strings, loaves


def main():
    B.clean_scene()
    root, static, roof, collection, mats, tiles = K1.create_building()
    root.name = "holm_teaching_kitchen_v2"
    root["revision"] = 2
    root["artPass"] = "p2d-shutters-bargeboards-cluster"
    slats = louvred_shutters(root, mats, collection)
    boards = gable_bargeboards(roof, mats, collection)
    pot = flue_pot(root, roof, mats, collection)
    strings, loaves = interior_cluster(root, static, mats, collection)
    K1.authoring_report(root, tiles)
    report = json.loads(K1.REPORT.read_text(encoding="utf-8"))
    names = {o.name for o in B.descendants(root)}
    extra = {
        "louvredShuttersAuthored": slats >= 16 and sum("_Hinge" in n for n in names) >= 8,
        "gableBargeboardsAuthored": boards == 4 and sum(n.startswith("BakeGableFinialKnob") for n in names) == 2,
        "rangeFluePotAuthored": pot,
        "secondClusterAuthored": strings == 4 and loaves == 6 and "KneadingFlourDust" in names and "BreadPeelBlade" in names,
    }
    report.setdefault("checks", {}).update(extra)
    report["asset"] = "holm_teaching_kitchen_v2"
    K1.REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    if not all(extra.values()):
        raise RuntimeError("Teaching Kitchen v2 checks failed: " + ", ".join(n for n, ok in extra.items() if not ok))
    K1.mark("consolidate")
    for target, prefix in ((static, "Static"), (roof, "Roof")):
        V1.consolidate(target, prefix)
    for name in K1.SEMANTIC[1:]:
        target = next(obj for obj in root.children if obj.name == name)
        V1.consolidate(target, name)
    K1.mark("render")
    K1.render_export(root, roof, collection, mats)
    K1.mark("done")
    print("TEACHING_KITCHEN_V2_READY", K1.MODEL)


if __name__ == "__main__":
    main()
