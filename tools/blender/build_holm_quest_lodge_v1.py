"""Build the Tutor's Holm Quest Lodge surface asset (v1).

Lesson Green's story service. The lodge explains that regional quests reveal
stories without forcing one path (open-world story law): a hall of notices with
the quest board as its hero object, a half-octagonal chart turret on the
north-west corner holding the four-region map table, a reading corner with the
Ledger of Choices, and a covered east porch that receives players from the
Lesson Green route node. The west door continues toward the mine road.

Blender axes: +X east, +Y north, +Z up. Game z equals -Blender y.
"""
from __future__ import annotations

import json
import math
import random
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_guide_hall_v3 as B
import build_survival_workyard_v1 as V1
import build_holm_teaching_kitchen_v1 as K

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets" / "blender" / "holm_quest_lodge_v1.blend"
MODEL = ROOT / "assets" / "models" / "buildings" / "holm_quest_lodge_v1.glb"
PREVIEW = ROOT / "scratchpad" / "quest_lodge_v1"
REPORT = PREVIEW / "asset_report.json"
PROGRESS = PREVIEW / "build_progress.txt"
for path in (SOURCE.parent, MODEL.parent, PREVIEW):
    path.mkdir(parents=True, exist_ok=True)

V1.RNG = random.Random(260910)
V1.APPLY_BEVEL = False

# --- plan (Blender x/y) ---------------------------------------------------------
HALL_H, TURRET_H, PORCH_H = 4.2, 3.6, 3.2
HX0, HX1, HY0, HY1 = -3.0, 4.0, -4.5, 4.5          # hall
PORCH_X1 = 6.0
TUR_C = (HX0, 2.4)                                 # turret centre on the west wall line (game z -2.4)
TUR_R = 2.1
TUR_PTS = [(TUR_C[0] + math.cos(math.radians(a)) * TUR_R, TUR_C[1] + math.sin(math.radians(a)) * TUR_R)
           for a in (-90, -135, 180, 135, 90)]     # (-3,0.3) -> (-4.49,0.92) -> (-5.1,2.4) -> (-4.49,3.88) -> (-3,4.5)
EAST_HINGE = (HX1, 0.725)                          # east door, leaf toward +y (game -z); opening game z -1.5 (tile-centred)
EAST_W = 1.55
WEST_HINGE = (HX0, -2.275)                         # west door, leaf toward +y; opening game z 1.5 (tile-centred)
WEST_W = 1.55
PLAYER_VISUAL_H = 1.85
DOOR_OPENING_H = 3.05
box, cyl, solid, prism_solid, wall, over_door, shuttered_window = (
    K.box, K.cyl, K.solid, K.prism_solid, K.wall, K.over_door, K.shuttered_window)


def mark(stage):
    PROGRESS.write_text(stage, encoding="utf-8")
    print("QUEST_LODGE_V1_STAGE", stage, flush=True)


def materials():
    mats = K.materials()
    mats.update({
        "parchment": V1.material("CR Lodge Parchment", (.86, .78, .56)),
        "parchment_old": V1.material("CR Lodge Old Parchment", (.72, .62, .40)),
        "wax": V1.material("CR Lodge Seal Wax", (.62, .10, .08)),
        "ink": V1.material("CR Lodge Ink", (.12, .10, .14)),
        "map_land": V1.material("CR Lodge Chart Land", (.40, .52, .26)),
        "map_water": V1.material("CR Lodge Chart Water", (.22, .42, .52)),
        "map_scar": V1.material("CR Lodge Chart Scarlands", (.52, .28, .18)),
        "map_road": V1.material("CR Lodge Chart Road", (.70, .58, .36)),
        "leather": V1.material("CR Lodge Leather", (.36, .20, .11)),
        "cushion": V1.material("CR Lodge Cushion", (.30, .22, .40)),
        "banner_blue": V1.material("CR Lodge Banner Blue", (.16, .26, .44)),
        "banner_gold": V1.material("CR Lodge Banner Gold", (.78, .60, .22)),
        "glass_warm": V1.material("CR Lodge Lantern Glass", (.95, .72, .35), .5, 0, 1.6),
        "rug_blue": V1.material("CR Lodge Rug Blue", (.08, .23, .38)),
        "rug_red": V1.material("CR Lodge Rug Red", (.48, .09, .055)),
    })
    return mats


# --- architecture ------------------------------------------------------------------
def floors(static, mats, collection):
    box("HallSlab", ((HX0 + HX1) / 2, 0, .06), (HX1 - HX0, HY1 - HY0, .12), mats["wood"], collection, static)
    for k, x in enumerate([HX0 + .55 + n * .82 for n in range(8)]):
        box(f"HallSeam_{k}", (x, 0, .125), (.035, HY1 - HY0 - .3, .018), mats["timber"], collection, static)
    box("HallRunner", (.6, -.2, .135), (3.0, 6.4, .02), mats["rug_blue"], collection, static)
    box("HallRunnerBorder", (.6, -.2, .13), (3.3, 6.7, .015), mats["rug_red"], collection, static)
    prism_solid("TurretFloor", [(HX0, 0.3)] + TUR_PTS[1:-1] + [(HX0, 4.5)], 0.0, .13, mats["flag_light"], collection, static)
    # Porch deck and steps.
    box("PorchDeck", ((HX1 + PORCH_X1) / 2, 0, .04), (PORCH_X1 - HX1, 5.0, .10), mats["wood_light"], collection, static)
    for k, y in enumerate((-2.0, -1.0, 0, 1.0, 2.0)):
        box(f"PorchSeam_{k}", ((HX1 + PORCH_X1) / 2, y, .09), (PORCH_X1 - HX1 - .2, .035, .018), mats["timber"], collection, static)
    box("PorchStep", (PORCH_X1 + .45, -.5, -.02), (.9, 2.6, .14), mats["stone_light"], collection, static)
    box("WestStep", (HX0 - .55, WEST_HINGE[1] + WEST_W / 2, -.02), (.9, WEST_W + .7, .16), mats["stone_light"], collection, static)


def shell(static, root, mats, collection):
    hall_in, tur_in = (0.5, 0.0), (-4.0, 2.4)
    # South wall, then the west wall south of the turret (around the west door).
    wall("SouthWall", (HX0, HY0), (HX1, HY0), HALL_H, mats, collection, static, hall_in)
    wall("WestWallSouth", (HX0, WEST_HINGE[1]), (HX0, HY0), HALL_H, mats, collection, static, hall_in, start_inset=.35)
    wall("WestWallMid", (HX0, TUR_PTS[0][1]), (HX0, WEST_HINGE[1] + WEST_W), HALL_H, mats, collection, static, hall_in,
         end_inset=.35)
    for i in range(len(TUR_PTS) - 1):
        wall(f"TurretWall_{i}", TUR_PTS[i], TUR_PTS[i + 1], TURRET_H, mats, collection, static, tur_in,
             start_inset=.12, end_inset=.12)
    wall("NorthWall", (HX0, HY1), (HX1, HY1), HALL_H, mats, collection, static, hall_in)
    # East wall around the porch door.
    wall("EastWallNorth", (HX1, HY1), (HX1, EAST_HINGE[1] + EAST_W), HALL_H, mats, collection, static, hall_in,
         end_inset=.35)
    wall("EastWallSouth", (HX1, EAST_HINGE[1]), (HX1, HY0), HALL_H, mats, collection, static, hall_in, start_inset=.35)

    V1.door_frame("EastDoorFrame", EAST_HINGE, EAST_W, math.pi / 2, mats, collection, static)
    V1.door_frame("WestDoorFrame", WEST_HINGE, WEST_W, math.pi / 2, mats, collection, static)
    over_door("EastDoor", EAST_HINGE, EAST_W, math.pi / 2, HALL_H, mats, collection, static)
    over_door("WestDoor", WEST_HINGE, WEST_W, math.pi / 2, HALL_H, mats, collection, static)
    V1.door_leaf("lodge_door", EAST_HINGE, EAST_W, math.pi / 2, mats, collection, root)
    V1.door_leaf("road_door", WEST_HINGE, WEST_W, math.pi / 2, mats, collection, root)

    shuttered_window("SouthWindowW", -1.25, HY0 - .05, 0, mats, collection, static)
    shuttered_window("SouthWindowE", 2.25, HY0 - .05, 0, mats, collection, static)
    shuttered_window("NorthWindow", 2.25, HY1 + .05, math.pi, mats, collection, static)
    fa, fb = TUR_PTS[1], TUR_PTS[2]
    fm = ((fa[0] + fb[0]) / 2, (fa[1] + fb[1]) / 2)
    fn = (fm[0] - TUR_C[0], fm[1] - TUR_C[1]); fl = math.hypot(*fn)
    shuttered_window("TurretWindowS", fm[0] + fn[0] / fl * .05, fm[1] + fn[1] / fl * .05,
                     math.atan2(fb[1] - fa[1], fb[0] - fa[0]), mats, collection, static, sill=1.35, h=.85, w=.9)
    fa, fb = TUR_PTS[2], TUR_PTS[3]
    fm = ((fa[0] + fb[0]) / 2, (fa[1] + fb[1]) / 2)
    fn = (fm[0] - TUR_C[0], fm[1] - TUR_C[1]); fl = math.hypot(*fn)
    shuttered_window("TurretWindowN", fm[0] + fn[0] / fl * .05, fm[1] + fn[1] / fl * .05,
                     math.atan2(fb[1] - fa[1], fb[0] - fa[0]), mats, collection, static, sill=1.35, h=.85, w=.9)
    for name in ("SouthWall_Brace_0", "SouthWall_Brace_2", "NorthWall_Brace_2"):
        obj = bpy.data.objects.get(name)
        if obj is None:
            raise RuntimeError("expected window-bay brace is missing: " + name)
        bpy.data.objects.remove(obj, do_unlink=True)

    for k, x in enumerate((-1.6, .6, 2.8)):
        box(f"HallBeam_{k}", (x, 0, HALL_H - .28), (.26, HY1 - HY0 - .2, .30), mats["timber"], collection, static)
    # Porch posts and rails.
    for k, y in enumerate((-2.35, 2.35)):
        box(f"PorchPost_{k}", (PORCH_X1 - .22, y, PORCH_H / 2), (.24, .24, PORCH_H), mats["timber"], collection, static)
        box(f"PorchRail_{k}", ((HX1 + PORCH_X1) / 2 + .1, y, .95), (PORCH_X1 - HX1 - .4, .12, .12), mats["wood"], collection, static)
        for j in range(3):
            box(f"PorchBaluster_{k}_{j}", (HX1 + .55 + j * .55, y, .5), (.08, .08, .9), mats["wood"], collection, static)
    box("PorchPlate", (PORCH_X1 - .22, 0, PORCH_H + .02), (.22, 5.2, .22), mats["timber"], collection, static)


def hall_roof(roof, mats, collection):
    """Gable with the ridge running east-west (perpendicular to the Kitchen's)."""
    cy = (HY0 + HY1) / 2
    half = (HY1 - HY0) / 2 + .55
    x0, x1 = HX0 - .45, HX1 + .45
    eave, peak = HALL_H + .10, 6.9
    rise = peak - eave
    angle = math.atan2(rise, half)
    slope = math.hypot(half, rise)
    count = 0
    rows, cols = 10, 6
    tile_slope = slope / cols * 1.12
    for side in (-1, 1):
        box("HallRoofSolid" if side < 0 else "HallRoofSolidNorth",
            ((x0 + x1) / 2, cy + side * half / 2, (eave + peak) / 2), (x1 - x0, slope + .14, .14),
            mats["roof"], collection, roof, rotation=(-side * angle, 0, 0))
        for row in range(rows):
            x = x0 + .38 + row * ((x1 - x0 - .76) / (rows - 1))
            for col in range(cols):
                t = (col + .5) / cols
                y = cy + side * half * (1 - t)
                z = eave + rise * t + .09
                key = "roof_moss" if (row * 3 + col + (1 if side > 0 else 0)) % 17 == 0 \
                    else ("roof_light" if (row + col) % 7 == 0 else "roof")
                box(f"HallTile_{side}_{row}_{col}", (x, y, z), (.84, tile_slope, .085), mats[key], collection, roof,
                    rotation=(-side * angle, 0, 0))
                count += 1
        box("HallEave", ((x0 + x1) / 2, cy + side * (half + .05), eave - .05), (x1 - x0 + .1, .18, .22), mats["timber"],
            collection, roof)
    box("HallRidge", ((x0 + x1) / 2, cy, peak + .06), (x1 - x0 + .2, .30, .30), mats["timber"], collection, roof)
    wall_half = (HY1 - HY0) / 2
    for x in (HX0, HX1):
        gv = [(x - .13, cy - wall_half, HALL_H - .05), (x - .13, cy + wall_half, HALL_H - .05), (x - .13, cy, peak - .30),
              (x + .13, cy - wall_half, HALL_H - .05), (x + .13, cy + wall_half, HALL_H - .05), (x + .13, cy, peak - .30)]
        solid("GableEnd", gv, [(0, 1, 2), (3, 5, 4), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)], [mats["plaster"]],
              collection, roof)
        out = -.19 if x < 0 else .19
        for side in (-1, 1):
            V1.beam(f"GableBrace_{side}", (x + out, cy + side * (wall_half - .55), HALL_H + .05), (x + out, cy, peak - .50),
                    .16, .16, mats["timber"], collection, roof, bevel=0)
        box("GableCollar", (x + out, cy, HALL_H + 1.1), (.16, wall_half * 1.1, .16), mats["timber"], collection, roof)
    # Quest banner finial: a small iron scroll-and-star at the east gable.
    finial = B.empty("LodgeCrest", collection, roof, (x1 - .2, cy, peak + .2))
    cyl("CrestStem", (0, 0, .4), .05, .8, 6, mats["iron"], collection, finial)
    box("CrestScroll", (0, 0, .95), (.14, .62, .18), mats["parchment"], collection, finial)
    for k in range(4):
        box(f"CrestStar_{k}", (0, 0, 1.22), (.06, .06, .46), mats["brass"], collection, finial,
            rotation=(k * math.pi / 4, 0, 0))
    return count


def turret_roof(roof, mats, collection):
    pts = [(HX0, TUR_PTS[0][1] - .45)] + [
        (TUR_C[0] + math.cos(math.radians(a)) * (TUR_R + .5), TUR_C[1] + math.sin(math.radians(a)) * (TUR_R + .5))
        for a in (-90, -135, 180, 135, 90)] + [(HX0, TUR_PTS[-1][1] + .45)]
    eave, peak = TURRET_H + .12, 5.75
    n = len(pts)
    top = [(TUR_C[0] + .3 + (x - TUR_C[0] - .3) * .16, TUR_C[1] + (y - TUR_C[1]) * .16, peak) for x, y in pts]
    verts = [(x, y, eave) for x, y in pts] + top + [(x, y, eave - .16) for x, y in pts]
    faces = [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    faces.append(tuple(range(n, 2 * n)))
    faces += [(i, (i + 1) % n, (i + 1) % n + 2 * n, i + 2 * n) for i in range(n)]
    faces.append(tuple(range(2 * n, 3 * n)))
    solid("TurretRoofSolid", verts, faces, [mats["roof"]], collection, roof)
    count = 0
    for i in range(n - 1):
        a, b = pts[i], pts[i + 1]
        length = math.hypot(b[0] - a[0], b[1] - a[1])
        ang = math.atan2(b[1] - a[1], b[0] - a[0])
        box(f"TurretFascia_{i}", ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, eave - .06), (length + .1, .18, .22),
            mats["timber"], collection, roof, rotation=(0, 0, ang))
        ta, tb = top[i], top[i + 1]
        for k in range(4):
            t0, t1 = k / 4, (k + 1) / 4
            ax, ay = a[0] + (ta[0] - a[0]) * (t0 + t1) / 2, a[1] + (ta[1] - a[1]) * (t0 + t1) / 2
            bx, by = b[0] + (tb[0] - b[0]) * (t0 + t1) / 2, b[1] + (tb[1] - b[1]) * (t0 + t1) / 2
            z = eave + (peak - eave) * (t0 + t1) / 2 + .05
            mid_e = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
            mid_t = ((ta[0] + tb[0]) / 2, (ta[1] + tb[1]) / 2)
            run = math.hypot(mid_t[0] - mid_e[0], mid_t[1] - mid_e[1])
            tilt = math.atan2(peak - eave, max(.05, run))
            box(f"TurretCourse_{i}_{k}", ((ax + bx) / 2, (ay + by) / 2, z), (math.hypot(bx - ax, by - ay) * .92, .40, .06),
                mats["roof_light" if (i + k) % 5 == 0 else "roof"], collection, roof, rotation=(tilt, 0, ang))
            count += 1
    cyl("TurretFinial", (TUR_C[0] - .3, TUR_C[1], peak + .32), .06, .6, 6, mats["iron"], collection, roof)
    cyl("TurretFinialBall", (TUR_C[0] - .3, TUR_C[1], peak + .68), .13, .2, 8, mats["brass"], collection, roof)
    return count


def porch_roof(roof, mats, collection):
    high_x, low_x = HX1 + .05, PORCH_X1 + .55
    high_z, low_z = HALL_H - .35, PORCH_H + .12
    y0, y1 = -2.95, 2.95
    span, rise = low_x - high_x, high_z - low_z
    angle = math.atan2(rise, span)
    slope = math.hypot(span, rise)
    box("PorchRoofBase", ((high_x + low_x) / 2, 0, (high_z + low_z) / 2), (slope + .16, y1 - y0, .15), mats["roof"],
        collection, roof, rotation=(0, angle, 0))
    count = 0
    cols = 3
    for row, y in enumerate([y0 + .45 + n * ((y1 - y0 - .9) / 6) for n in range(7)]):
        for col in range(cols):
            t = (col + .5) / cols
            x = high_x + span * t
            z = high_z - rise * t + .09
            box(f"PorchTile_{row}_{col}", (x, y, z), (slope / cols * 1.08, .86, .08),
                mats["roof_light" if (row + col) % 5 == 0 else "roof"], collection, roof, rotation=(0, angle, 0))
            count += 1
    box("PorchEave", (low_x + .04, 0, low_z - .02), (.18, y1 - y0 + .1, .20), mats["timber"], collection, roof)
    return count


# --- hero and support objects --------------------------------------------------------
def quest_board(root, mats, collection):
    """Great notice board on the hall's north wall: the hero object."""
    g = B.empty("quest_board", collection, root, (0.6, HY1 - .32, 0))
    box("BoardFrame", (0, 0, 2.05), (3.6, .16, 2.3), mats["timber"], collection, g)
    box("BoardCork", (0, -.03, 2.05), (3.3, .12, 2.0), mats["wood"], collection, g)
    box("BoardHeader", (0, -.10, 3.32), (3.8, .14, .32), mats["banner_blue"], collection, g)
    box("BoardHeaderTrim", (0, -.12, 3.32), (3.6, .12, .08), mats["banner_gold"], collection, g)
    notices = [(-1.25, 2.55, .62, .78, "parchment", .06), (-.42, 2.45, .54, .66, "parchment_old", -.05),
               (.38, 2.6, .70, .58, "parchment", .03), (1.2, 2.5, .50, .74, "parchment_old", -.08),
               (-1.05, 1.55, .58, .62, "parchment_old", .04), (-.2, 1.5, .74, .70, "parchment", -.03),
               (.72, 1.45, .48, .58, "parchment", .07), (1.35, 1.55, .56, .66, "parchment_old", -.04)]
    for k, (x, z, w, h, key, rot) in enumerate(notices):
        box(f"Notice_{k}", (x, -.11, z), (w, .02, h), mats[key], collection, g, rotation=(0, rot, 0))
        for j in range(3):
            box(f"NoticeLine_{k}_{j}", (x, -.125, z + h * .28 - j * .17), (w * .7, .008, .03), mats["ink"], collection, g,
                rotation=(0, rot, 0))
        box(f"NoticePin_{k}", (x, -.13, z + h / 2 - .06), (.06, .03, .06), mats["brass"], collection, g)
    cyl("SealWax", (.38, -.135, 2.35), .08, .02, 8, mats["wax"], collection, g, rotation=(math.pi / 2, 0, 0))
    cyl("SealWax2", (-1.05, -.135, 1.3), .07, .02, 8, mats["wax"], collection, g, rotation=(math.pi / 2, 0, 0))
    # Hanging lantern lights the board.
    box("LanternArm", (1.95, -.35, 3.15), (.5, .08, .08), mats["iron"], collection, g)
    box("LanternBody", (2.15, -.35, 2.85), (.24, .24, .34), mats["glass_warm"], collection, g)
    box("LanternCap", (2.15, -.35, 3.05), (.30, .30, .06), mats["iron"], collection, g)
    # Reading lectern before the board.
    box("LecternPost", (.6, -1.0, .55), (.16, .16, 1.1), mats["timber"], collection, g)
    box("LecternFoot", (.6, -1.0, .06), (.6, .5, .12), mats["timber"], collection, g)
    box("LecternTop", (.6, -1.0, 1.16), (.7, .52, .06), mats["wood"], collection, g, rotation=(.35, 0, 0))
    box("LecternBook", (.6, -1.0, 1.21), (.5, .36, .05), mats["parchment"], collection, g, rotation=(.35, 0, 0))
    return g


def region_map(root, mats, collection):
    """Four-region chart table in the turret."""
    g = B.empty("region_map", collection, root, (-4.0, 2.4, 0))
    top = B.empty("ChartTop", collection, g, (0, 0, 0))
    box("ChartTable", (0, 0, .86), (1.9, 1.7, .09), mats["wood"], collection, top)
    box("ChartApron", (0, 0, .76), (1.7, 1.5, .12), mats["timber"], collection, top)
    for x in (-.78, .78):
        for y in (-.68, .68):
            box("ChartLeg", (x, y, .36), (.13, .13, .72), mats["timber"], collection, top)
    box("ChartSea", (0, 0, .915), (1.7, 1.5, .02), mats["map_water"], collection, top)
    for k, (x, y, w, d, key) in enumerate(((-.42, .30, .62, .48, "map_land"), (.30, .38, .70, .44, "map_land"),
                                           (-.35, -.34, .58, .40, "map_land"), (.40, -.36, .60, .46, "map_scar"))):
        box(f"ChartRegion_{k}", (x, y, .935), (w, d, .02), mats[key], collection, top)
    for k, (x, y, w, d) in enumerate(((-.1, .33, .5, .05), (-.4, 0, .05, .5), (.35, 0, .05, .6), (0, -.33, .55, .05))):
        box(f"ChartRoad_{k}", (x, y, .95), (w, d, .012), mats["map_road"], collection, top)
    cyl("ChartPin_0", (-.42, .30, .99), .04, .08, 6, mats["wax"], collection, top)
    cyl("ChartPin_1", (.30, .38, .99), .04, .08, 6, mats["brass"], collection, top)
    cyl("ChartPin_2", (-.35, -.34, .99), .04, .08, 6, mats["brass"], collection, top)
    cyl("ChartPin_3", (.40, -.36, .99), .04, .08, 6, mats["iron"], collection, top)
    box("ChartCompass", (.72, -.62, .955), (.22, .22, .012), mats["brass"], collection, top, rotation=(0, 0, .78))
    return g


def story_ledger(root, mats, collection):
    """The Ledger of Choices on a plinth: the story clue."""
    g = B.empty("story_ledger", collection, root, (-1.9, -3.9, 0))
    box("LedgerPlinth", (0, 0, .5), (.7, .55, 1.0), mats["stone"], collection, g)
    box("LedgerPlinthCap", (0, 0, 1.03), (.8, .65, .06), mats["stone_light"], collection, g)
    box("LedgerBook", (0, 0, 1.13), (.62, .46, .14), mats["leather"], collection, g, rotation=(0, 0, .1))
    box("LedgerPages", (0, 0, 1.21), (.56, .40, .02), mats["parchment"], collection, g, rotation=(0, 0, .1))
    box("LedgerRibbon", (.12, -.02, 1.225), (.05, .42, .01), mats["wax"], collection, g)
    box("LedgerQuill", (-.22, .12, 1.26), (.04, .3, .02), mats["chalk"], collection, g, rotation=(0, 0, .6))
    cyl("Inkwell", (.25, .16, 1.28), .05, .1, 8, mats["ink"], collection, g)
    return g


def reading_bench(root, mats, collection):
    g = B.empty("reading_bench", collection, root, (2.2, -3.6, 0))
    box("BenchSeat", (0, 0, .52), (2.2, .5, .12), mats["wood"], collection, g)
    box("BenchBack", (0, .24, .95), (2.2, .08, .7), mats["wood"], collection, g)
    for x in (-.95, .95):
        box("BenchLeg", (x, 0, .26), (.12, .44, .52), mats["timber"], collection, g)
        box("BenchArm", (x, .05, .78), (.10, .40, .08), mats["timber"], collection, g)
    box("BenchCushion", (-.4, -.02, .6), (.9, .42, .06), mats["cushion"], collection, g)
    box("BenchBook", (.6, .0, .61), (.34, .26, .05), mats["leather"], collection, g, rotation=(0, 0, .3))
    return g


def scroll_rack(root, mats, collection):
    g = B.empty("scroll_rack", collection, root, (HX0 + .35, -3.2, 0))
    box("RackFrame", (0, 0, 1.4), (.32, 1.4, 1.5), mats["timber"], collection, g)
    for r in range(3):
        for c in range(4):
            box(f"RackCell_{r}_{c}", (0, -.52 + c * .35, .9 + r * .42), (.36, .30, .30), mats["wood"], collection, g)
            if (r + c) % 3 != 0:
                cyl(f"Scroll_{r}_{c}", (-.06, -.52 + c * .35, .9 + r * .42), .08, .34, 8,
                    mats["parchment_old" if (r + c) % 2 else "parchment"], collection, g, rotation=(0, math.pi / 2, 0))
    box("RackLabel", (-.18, 0, 2.28), (.02, .9, .14), mats["parchment"], collection, g)
    return g


def guide_socket(root, mats, collection):
    """Reserved standing socket for the modelled quest guide; nothing visible ships."""
    B.empty("quest_guide_socket", collection, root, (1.4, 2.6, 0))


def support_dressing(static, mats, collection):
    for k, y in enumerate((-2.0, 2.0)):
        box(f"WallBanner_{k}", (HX1 - .2, y, 2.6), (.05, .7, 1.4), mats["banner_blue"], collection, static)
        box(f"WallBannerEmblem_{k}", (HX1 - .24, y, 2.6), (.03, .3, .3), mats["banner_gold"], collection, static)
        box(f"WallBannerRod_{k}", (HX1 - .2, y, 3.35), (.08, .9, .08), mats["timber"], collection, static)
    for k, x in enumerate((-1.2, 2.3)):
        box(f"CandleShelf_{k}", (x, HY0 + .3, 1.9), (.5, .2, .06), mats["wood"], collection, static)
        cyl(f"Candle_{k}", (x, HY0 + .3, 2.05), .04, .24, 6, mats["chalk"], collection, static)
        cyl(f"CandleFlame_{k}", (x, HY0 + .3, 2.22), .03, .08, 6, mats["flame"], collection, static)
    # Porch notice post: a small board beside the door tells travellers what the lodge is.
    box("PorchSign", (PORCH_X1 - .45, 1.6, 1.85), (.08, .8, .5), mats["wood_light"], collection, static)
    box("PorchSignText", (PORCH_X1 - .5, 1.6, 1.85), (.02, .6, .28), mats["ink"], collection, static)
    box("PorchSignPost", (PORCH_X1 - .45, 1.6, .75), (.1, .1, 1.5), mats["timber"], collection, static)


# --- assembly -------------------------------------------------------------------------
SEMANTIC = ("roof", "lodge_door", "road_door", "quest_board", "region_map", "story_ledger", "reading_bench",
            "scroll_rack", "quest_guide_socket")


def create_building():
    mats = materials()
    collection = bpy.data.collections.new("QuestLodge_HandAuthoredV1")
    bpy.context.scene.collection.children.link(collection)
    root = B.empty("holm_quest_lodge_v1", collection)
    root["buildingDefId"] = "holm_quest_lodge_v1"
    root["assetId"] = "holm_quest_lodge"
    root["revision"] = 1
    root["pipelineVersion"] = 1
    root["assetClass"] = "building"
    root["unitsPerTile"] = 1
    root["artDirection"] = "guide-hall-anchor-family-quest-lodge"
    static = B.empty("static_architecture", collection, root)
    mark("floors"); floors(static, mats, collection)
    mark("shell"); shell(static, root, mats, collection)
    mark("furnishings")
    quest_board(root, mats, collection)
    region_map(root, mats, collection)
    story_ledger(root, mats, collection)
    reading_bench(root, mats, collection)
    scroll_rack(root, mats, collection)
    guide_socket(root, mats, collection)
    support_dressing(static, mats, collection)
    mark("roof")
    roof = B.empty("roof", collection, root)
    tiles = hall_roof(roof, mats, collection) + turret_roof(roof, mats, collection) + porch_roof(roof, mats, collection)
    return root, static, roof, collection, mats, tiles


def authoring_report(root, tiles):
    names = {obj.name for obj in B.descendants(root)}
    checks = {
        "hallTurretPorchCompoundAuthored": all(f"TurretWall_{i}" in names for i in range(4)) and "PorchDeck" in names,
        "threeRoofMassesAuthored": all(n in names for n in ("HallRoofSolid", "HallRoofSolidNorth", "TurretRoofSolid",
                                                              "PorchRoofBase", "GableEnd")),
        "fittedFullFrameDoorsAuthored": sum("_Plank_" in n for n in names) >= 12 and
                                          "EastDoorFrame_Lintel" in names and "WestDoorFrame_Lintel" in names and
                                          "EastDoor_OverDoor" in names and "WestDoor_OverDoor" in names,
        "irregularMasonryCoursesAuthored": sum("_Stone_" in n for n in names) >= 36,
        "loadBearingTimberBaysAuthored": sum("_Brace_" in n for n in names) >= 5,
        "layeredRoofCoursesAuthored": tiles >= 120,
        "questBoardHeroAuthored": sum(n.startswith("Notice_") for n in names) >= 8 and "LanternBody" in names and
                                   "LecternBook" in names,
        "storyStationsAuthored": all(n in names for n in ("ChartSea", "ChartRegion_3", "LedgerBook", "BenchSeat",
                                                            "RackFrame", "PorchSign")),
        "semanticNodesPreserved": all(n in names for n in SEMANTIC),
    }
    report = {
        "asset": "holm_quest_lodge_v1", "pipelineVersion": 1, "unitsPerTile": 1, "checks": checks,
        "visualLanguage": "Guide Hall anchor family; hall of notices with chart turret and covered porch",
        "roofCourses": tiles,
        "humanScaleContract": {
            "playerVisualHeight": PLAYER_VISUAL_H, "doorOpeningHeight": DOOR_OPENING_H,
            "questBoardTop": 3.48, "lecternHeight": 1.19, "chartTableHeight": 0.905, "benchSeatHeight": 0.58,
            "hallWallHeight": HALL_H, "turretWallHeight": TURRET_H,
        },
        "metrics": V1.metrics(root),
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    if not all(checks.values()):
        raise RuntimeError("Quest Lodge authoring checks failed: " + ", ".join(n for n, ok in checks.items() if not ok))
    return report


def render_export(root, roof, collection, mats):
    scene = bpy.context.scene
    cam = K.setup_preview(mats)
    cam.location = (20, -21, 17)      # from the south-east: porch and east door face the route
    cam.data.ortho_scale = 20.0
    V1.look_at(cam, (0.5, 0, 2.2))
    scene.render.filepath = str(PREVIEW / "quest_lodge_v1_exterior.png")
    bpy.ops.render.render(write_still=True)
    B.set_render_hidden(roof, True)
    scene.render.filepath = str(PREVIEW / "quest_lodge_v1_roof_off.png")
    bpy.ops.render.render(write_still=True)
    cam.location = (0.5, -0.001, 31); V1.look_at(cam, (0.5, 0, 0)); cam.data.ortho_scale = 17.0
    scene.render.filepath = str(PREVIEW / "quest_lodge_v1_plan.png")
    bpy.ops.render.render(write_still=True)
    B.set_render_hidden(roof, False)
    cam.location = (18, -20, 16); cam.data.ortho_scale = 22.0; V1.look_at(cam, (0.5, 0, 1.8))
    scene.render.filepath = str(PREVIEW / "quest_lodge_v1_game_camera.png")
    bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    bpy.ops.object.select_all(action="DESELECT")
    for obj in B.descendants(root):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(MODEL), export_format="GLB", use_selection=True, export_apply=True,
                              export_yup=True, export_materials="EXPORT", export_extras=True, export_cameras=False,
                              export_lights=False)


def main():
    B.clean_scene()
    root, static, roof, collection, mats, tiles = create_building()
    authoring_report(root, tiles)
    mark("consolidate")
    for target, prefix in ((static, "Static"), (roof, "Roof")):
        V1.consolidate(target, prefix)
    for name in SEMANTIC[1:]:
        target = next(obj for obj in root.children if obj.name == name)
        if list(target.children_recursive):
            V1.consolidate(target, name)
    mark("render")
    render_export(root, roof, collection, mats)
    mark("done")
    print("QUEST_LODGE_V1_READY", MODEL)


if __name__ == "__main__":
    main()
