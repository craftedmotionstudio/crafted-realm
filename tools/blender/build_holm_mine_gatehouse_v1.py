"""Build the Tutor's Holm Mine Gatehouse surface asset (v1).

Quarry Rise's cave access. The mine road runs north along x=128 and turns
east at z=120, so the gatehouse is a true gate: a tall square gate tower whose
south gate and east door carry the road straight through its cobbled passage.
West of the passage, through a wide arch, a lower shaft house holds the timber
head-frame and winch over the cavern shaft (the required descend lesson); a
half-octagonal ore-chute bay on its west wall holds the ore bin.

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
SOURCE = ROOT / "assets" / "blender" / "holm_mine_gatehouse_v1.blend"
MODEL = ROOT / "assets" / "models" / "buildings" / "holm_mine_gatehouse_v1.glb"
PREVIEW = ROOT / "scratchpad" / "mine_gatehouse_v1"
REPORT = PREVIEW / "asset_report.json"
PROGRESS = PREVIEW / "build_progress.txt"
for path in (SOURCE.parent, MODEL.parent, PREVIEW):
    path.mkdir(parents=True, exist_ok=True)

V1.RNG = random.Random(260911)
V1.APPLY_BEVEL = False

# --- plan (Blender x/y; game z = -y) -----------------------------------------------
TOWER_H, HOUSE_H, BAY_H = 5.0, 3.8, 3.3
TX0, TX1, TY0, TY1 = 0.0, 5.0, -4.0, 4.0        # gate tower (passage)
HX0, HX1 = -5.0, 0.0                           # shaft house shares TY0..TY1
GATE_HINGE = (0.5, TY0)                        # south gate, leaf toward +x; opening x 1.5 (game 128.5)
GATE_W = 2.0
ROAD_HINGE = (TX1, -0.5)                       # east door, leaf toward -y (game +z); opening game z 1.5 (120.5)
ROAD_W = 2.0
ARCH = (-1.5, 1.5)                             # partition x=0 opening, Blender y
BAY_C = (HX0, 1.5)                             # ore-chute bay on the west wall (game z -1.5)
BAY_R = 1.9
BAY_PTS = [(BAY_C[0] + math.cos(math.radians(a)) * BAY_R, BAY_C[1] + math.sin(math.radians(a)) * BAY_R)
           for a in (-90, -135, 180, 135, 90)]
SHAFT = (-2.5, -0.5)                           # game (-2.5, 0.5) -> world (124.5, 119.5)
PLAYER_VISUAL_H = 1.85
DOOR_OPENING_H = 3.05
box, cyl, solid, prism_solid, wall, over_door, shuttered_window = (
    K.box, K.cyl, K.solid, K.prism_solid, K.wall, K.over_door, K.shuttered_window)


def mark(stage):
    PROGRESS.write_text(stage, encoding="utf-8")
    print("MINE_GATEHOUSE_V1_STAGE", stage, flush=True)


def materials():
    mats = K.materials()
    mats.update({
        "cobble": V1.material("CR Gate Cobble", (.36, .34, .30)),
        "cobble_light": V1.material("CR Gate Cobble Light", (.47, .44, .38)),
        "ore_copper": V1.material("CR Gate Copper Ore", (.62, .38, .20)),
        "ore_tin": V1.material("CR Gate Tin Ore", (.66, .68, .70), .5, .3),
        "ore_rock": V1.material("CR Gate Ore Rock", (.30, .29, .27)),
        "lamp_glass": V1.material("CR Gate Lamp Glass", (.98, .76, .38), .5, 0, 1.8),
        "chalk_board": V1.material("CR Gate Tally Board", (.15, .21, .17)),
        "rust": V1.material("CR Gate Rust", (.42, .22, .12), .8, .2),
        "ink": V1.material("CR Gate Ink", (.12, .10, .14)),
    })
    return mats


# --- architecture --------------------------------------------------------------------
def floors(static, mats, collection):
    # Passage cobbles run through the tower from gate to road door.
    box("PassageSlab", ((TX0 + TX1) / 2, 0, .06), (TX1 - TX0, TY1 - TY0, .12), mats["cobble"], collection, static)
    i = 0
    for row in range(8):
        for col in range(5):
            x = TX0 + .5 + col
            y = TY0 + .5 + row
            key = "cobble_light" if (row + col) % 2 else "cobble"
            box(f"Cobble_{i}", (x + V1.RNG.uniform(-.03, .03), y + V1.RNG.uniform(-.03, .03), .125),
                (.82 + V1.RNG.uniform(-.08, .05), .82 + V1.RNG.uniform(-.08, .05), .025), mats[key], collection, static)
            i += 1
    # Shaft house floor: four boards around the open shaft so the cavern's own
    # hole-and-ladder shows through the building floor.
    sx, sy = SHAFT
    hole = .9
    box("HouseFloorW", ((HX0 + sx - hole) / 2, 0, .06), (sx - hole - HX0, TY1 - TY0, .12), mats["wood"], collection, static)
    box("HouseFloorE", ((sx + hole + HX1) / 2, 0, .06), (HX1 - sx - hole, TY1 - TY0, .12), mats["wood"], collection, static)
    box("HouseFloorN", (sx, (sy + hole + TY1) / 2, .06), (hole * 2, TY1 - sy - hole, .12), mats["wood"], collection, static)
    box("HouseFloorS", (sx, (TY0 + sy - hole) / 2, .06), (hole * 2, sy - hole - TY0, .12), mats["wood"], collection, static)
    for k in range(4):
        box(f"ShaftKerb_{k}", (sx + (hole + .08) * (1 if k % 2 else -1) * (1 if k < 2 else 0) + (0 if k < 2 else 0),
                               sy + (0 if k < 2 else (hole + .08) * (1 if k == 3 else -1)), .16),
            (.16, hole * 2 + .3, .1) if k < 2 else (hole * 2 + .3, .16, .1), mats["timber"], collection, static)
    prism_solid("BayFloor", [(HX0, BAY_PTS[0][1])] + BAY_PTS[1:-1] + [(HX0, BAY_PTS[-1][1])], 0.0, .13,
                mats["flag_light"], collection, static)
    box("GateStep", (GATE_HINGE[0] + GATE_W / 2, TY0 - .55, -.02), (GATE_W + .9, .9, .16), mats["stone_light"], collection, static)
    box("RoadStep", (TX1 + .55, ROAD_HINGE[1] - ROAD_W / 2, -.02), (.9, ROAD_W + .9, .16), mats["stone_light"], collection, static)


def shell(static, root, mats, collection):
    tower_in, house_in, bay_in = (2.5, 0.0), (-2.5, 0.0), (-5.8, 1.5)
    # Tower: tall, stone-heavy.
    wall("TowerSouthW", (TX0, TY0), (GATE_HINGE[0], TY0), TOWER_H, mats, collection, static, tower_in, detail=False)
    wall("TowerSouthE", (GATE_HINGE[0] + GATE_W, TY0), (TX1, TY0), TOWER_H, mats, collection, static, tower_in, start_inset=.35)
    wall("TowerEastS", (TX1, TY0), (TX1, ROAD_HINGE[1] - ROAD_W), TOWER_H, mats, collection, static, tower_in, end_inset=.35)
    wall("TowerEastN", (TX1, ROAD_HINGE[1]), (TX1, TY1), TOWER_H, mats, collection, static, tower_in, start_inset=.35)
    wall("TowerNorth", (TX1, TY1), (TX0, TY1), TOWER_H, mats, collection, static, tower_in)
    # Partition with the wide arch to the shaft house.
    wall("PartitionN", (TX0, TY1), (TX0, ARCH[1]), TOWER_H, mats, collection, static, tower_in, detail=False)
    wall("PartitionS", (TX0, ARCH[0]), (TX0, TY0), TOWER_H, mats, collection, static, tower_in, detail=False)
    box("ArchLintel", (TX0, 0, 3.2), (.36, ARCH[1] - ARCH[0] + .5, .34), mats["timber"], collection, static)
    box("ArchFill", (TX0, 0, (3.37 + TOWER_H) / 2), (.26, ARCH[1] - ARCH[0] + .1, TOWER_H - 3.37), mats["plaster"], collection, static)
    for side in (-1, 1):
        box("ArchJamb", (TX0, side * (ARCH[1] + .12), 1.6), (.32, .24, 3.2), mats["timber"], collection, static)
    # Shaft house: lower.
    wall("HouseSouth", (HX0, TY0), (TX0, TY0), HOUSE_H, mats, collection, static, house_in)
    wall("HouseNorth", (TX0, TY1), (HX0, TY1), HOUSE_H, mats, collection, static, house_in)
    wall("HouseWestN", (HX0, TY1), (HX0, BAY_PTS[-1][1]), HOUSE_H, mats, collection, static, house_in)
    for i in range(len(BAY_PTS) - 1):
        wall(f"BayWall_{i}", BAY_PTS[i], BAY_PTS[i + 1], BAY_H, mats, collection, static, bay_in, start_inset=.12, end_inset=.12)
    wall("HouseWestS", (HX0, BAY_PTS[0][1]), (HX0, TY0), HOUSE_H, mats, collection, static, house_in)

    V1.door_frame("GateFrame", GATE_HINGE, GATE_W, 0, mats, collection, static)
    V1.door_frame("RoadFrame", ROAD_HINGE, ROAD_W, -math.pi / 2, mats, collection, static)
    over_door("Gate", GATE_HINGE, GATE_W, 0, TOWER_H, mats, collection, static)
    over_door("RoadDoor", ROAD_HINGE, ROAD_W, -math.pi / 2, TOWER_H, mats, collection, static)
    V1.door_leaf("gate_door", GATE_HINGE, GATE_W, 0, mats, collection, root)
    V1.door_leaf("road_door", ROAD_HINGE, ROAD_W, -math.pi / 2, mats, collection, root)
    # Raised portcullis over the south gate: iron grille tucked under the lintel.
    for k in range(5):
        box(f"PortcullisBar_{k}", (GATE_HINGE[0] + .25 + k * .375, TY0 + .28, 3.9), (.07, .07, 1.1), mats["iron"], collection, static)
    box("PortcullisRail", (GATE_HINGE[0] + GATE_W / 2, TY0 + .28, 3.6), (GATE_W + .2, .09, .09), mats["iron"], collection, static)

    shuttered_window("HouseSouthWindow", -2.5, TY0 - .05, 0, mats, collection, static, sill=1.2, h=1.0, w=1.1)
    shuttered_window("HouseNorthWindow", -2.5, TY1 + .05, math.pi, mats, collection, static, sill=1.2, h=1.0, w=1.1)
    shuttered_window("TowerNorthWindow", 2.5, TY1 + .05, math.pi, mats, collection, static, sill=2.6, h=.9, w=1.0)
    shuttered_window("TowerSouthSlit", 3.9, TY0 - .05, 0, mats, collection, static, sill=2.8, h=.9, w=.6)
    for name in ("HouseSouth_Brace_1", "HouseNorth_Brace_1", "TowerNorth_Brace_1"):
        obj = bpy.data.objects.get(name)
        if obj is None:
            raise RuntimeError("expected window-bay brace is missing: " + name)
        bpy.data.objects.remove(obj, do_unlink=True)
    for k, y in enumerate((-2.6, 0, 2.6)):
        box(f"TowerBeam_{k}", ((TX0 + TX1) / 2, y, TOWER_H - .28), (TX1 - TX0 - .2, .26, .30), mats["timber"], collection, static)
    for k, x in enumerate((-3.6, -1.4)):
        box(f"HouseBeam_{k}", (x, 0, HOUSE_H - .26), (.26, TY1 - TY0 - .2, .28), mats["timber"], collection, static)


def tower_roof(roof, mats, collection):
    """Pyramidal hip with a small flat cap and an iron lantern; the tallest mass."""
    pts = [(TX0 - .45, TY0 - .45), (TX1 + .45, TY0 - .45), (TX1 + .45, TY1 + .45), (TX0 - .45, TY1 + .45)]
    eave, peak = TOWER_H + .12, 8.1
    cx, cy = (TX0 + TX1) / 2, 0
    top = [(cx + (x - cx) * .14, cy + (y - cy) * .14, peak) for x, y in pts]
    verts = [(x, y, eave) for x, y in pts] + top + [(x, y, eave - .16) for x, y in pts]
    n = 4
    faces = [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    faces.append(tuple(range(n, 2 * n)))
    faces += [(i, (i + 1) % n, (i + 1) % n + 2 * n, i + 2 * n) for i in range(n)]
    faces.append(tuple(range(2 * n, 3 * n)))
    solid("TowerRoofSolid", verts, faces, [mats["roof"]], collection, roof)
    count = 0
    for i in range(n):
        a, b = pts[i], pts[(i + 1) % n]
        ta, tb = top[i], top[(i + 1) % n]
        length = math.hypot(b[0] - a[0], b[1] - a[1])
        ang = math.atan2(b[1] - a[1], b[0] - a[0])
        box(f"TowerFascia_{i}", ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, eave - .06), (length + .1, .18, .22), mats["timber"],
            collection, roof, rotation=(0, 0, ang))
        for k in range(6):
            t0, t1 = k / 6, (k + 1) / 6
            ax, ay = a[0] + (ta[0] - a[0]) * (t0 + t1) / 2, a[1] + (ta[1] - a[1]) * (t0 + t1) / 2
            bx, by = b[0] + (tb[0] - b[0]) * (t0 + t1) / 2, b[1] + (tb[1] - b[1]) * (t0 + t1) / 2
            z = eave + (peak - eave) * (t0 + t1) / 2 + .05
            mid_e = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
            mid_t = ((ta[0] + tb[0]) / 2, (ta[1] + tb[1]) / 2)
            run = math.hypot(mid_t[0] - mid_e[0], mid_t[1] - mid_e[1])
            tilt = math.atan2(peak - eave, max(.05, run))
            box(f"TowerCourse_{i}_{k}", ((ax + bx) / 2, (ay + by) / 2, z), (math.hypot(bx - ax, by - ay) * .92, .42, .06),
                mats["roof_moss" if (i * 7 + k) % 9 == 0 else ("roof_light" if (i + k) % 4 == 0 else "roof")],
                collection, roof, rotation=(tilt, 0, ang))
            count += 1
    box("TowerCap", (cx, cy, peak + .08), (1.0, 1.0, .16), mats["timber"], collection, roof)
    cyl("LanternPost", (cx, cy, peak + .5), .06, .7, 6, mats["iron"], collection, roof)
    box("GateLantern", (cx, cy, peak + 1.0), (.36, .36, .46), mats["lamp_glass"], collection, roof)
    box("GateLanternCap", (cx, cy, peak + 1.28), (.46, .46, .08), mats["iron"], collection, roof)
    return count


def house_roof(roof, mats, collection):
    """Shaft house gable, ridge east-west, tucked below the tower eave."""
    cy = 0
    half = (TY1 - TY0) / 2 + .55
    x0, x1 = HX0 - .45, TX0 - .05
    eave, peak = HOUSE_H + .10, 5.9
    rise = peak - eave
    angle = math.atan2(rise, half)
    slope = math.hypot(half, rise)
    count = 0
    rows, cols = 7, 5
    tile_slope = slope / cols * 1.12
    for side in (-1, 1):
        box("HouseRoofSolid" if side < 0 else "HouseRoofSolidNorth",
            ((x0 + x1) / 2, cy + side * half / 2, (eave + peak) / 2), (x1 - x0, slope + .14, .14),
            mats["roof"], collection, roof, rotation=(-side * angle, 0, 0))
        for row in range(rows):
            x = x0 + .38 + row * ((x1 - x0 - .76) / (rows - 1))
            for col in range(cols):
                t = (col + .5) / cols
                y = cy + side * half * (1 - t)
                z = eave + rise * t + .09
                key = "roof_moss" if (row * 3 + col) % 13 == 0 else ("roof_light" if (row + col) % 6 == 0 else "roof")
                box(f"HouseTile_{side}_{row}_{col}", (x, y, z), (.84, tile_slope, .085), mats[key], collection, roof,
                    rotation=(-side * angle, 0, 0))
                count += 1
        box("HouseEave", ((x0 + x1) / 2, cy + side * (half + .05), eave - .05), (x1 - x0 + .1, .18, .22), mats["timber"],
            collection, roof)
    box("HouseRidge", ((x0 + x1) / 2, cy, peak + .06), (x1 - x0 + .2, .30, .30), mats["timber"], collection, roof)
    wall_half = (TY1 - TY0) / 2
    gv = [(HX0 - .13, cy - wall_half, HOUSE_H - .05), (HX0 - .13, cy + wall_half, HOUSE_H - .05), (HX0 - .13, cy, peak - .30),
          (HX0 + .13, cy - wall_half, HOUSE_H - .05), (HX0 + .13, cy + wall_half, HOUSE_H - .05), (HX0 + .13, cy, peak - .30)]
    solid("GableEnd", gv, [(0, 1, 2), (3, 5, 4), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)], [mats["plaster"]], collection, roof)
    for side in (-1, 1):
        V1.beam(f"GableBrace_{side}", (HX0 - .19, cy + side * (wall_half - .55), HOUSE_H + .05), (HX0 - .19, cy, peak - .5),
                .16, .16, mats["timber"], collection, roof, bevel=0)
    # Winch-wheel vent: a louvred dormer lets the head-frame's dust out.
    box("Dormer", (-2.5, 0, HOUSE_H + 1.0), (1.2, 1.4, .9), mats["plaster"], collection, roof)
    for k in range(3):
        box(f"DormerLouvre_{k}", (-2.5, -.72, HOUSE_H + .75 + k * .25), (.9, .08, .12), mats["timber"], collection, roof,
            rotation=(.5, 0, 0))
    box("DormerRoof", (-2.5, 0, HOUSE_H + 1.55), (1.4, 1.7, .12), mats["roof_light"], collection, roof, rotation=(0, .0, 0))
    return count


def bay_roof(roof, mats, collection):
    pts = [(HX0, BAY_PTS[0][1] - .45)] + [
        (BAY_C[0] + math.cos(math.radians(a)) * (BAY_R + .5), BAY_C[1] + math.sin(math.radians(a)) * (BAY_R + .5))
        for a in (-90, -135, 180, 135, 90)] + [(HX0, BAY_PTS[-1][1] + .45)]
    eave, peak = BAY_H + .12, 4.7
    n = len(pts)
    top = [(BAY_C[0] + .3 + (x - BAY_C[0] - .3) * .16, BAY_C[1] + (y - BAY_C[1]) * .16, peak) for x, y in pts]
    verts = [(x, y, eave) for x, y in pts] + top + [(x, y, eave - .16) for x, y in pts]
    faces = [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    faces.append(tuple(range(n, 2 * n)))
    faces += [(i, (i + 1) % n, (i + 1) % n + 2 * n, i + 2 * n) for i in range(n)]
    faces.append(tuple(range(2 * n, 3 * n)))
    solid("BayRoofSolid", verts, faces, [mats["roof"]], collection, roof)
    count = 0
    for i in range(n - 1):
        a, b = pts[i], pts[i + 1]
        length = math.hypot(b[0] - a[0], b[1] - a[1])
        ang = math.atan2(b[1] - a[1], b[0] - a[0])
        box(f"BayFascia_{i}", ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, eave - .06), (length + .1, .18, .22), mats["timber"],
            collection, roof, rotation=(0, 0, ang))
        ta, tb = top[i], top[i + 1]
        for k in range(3):
            t0, t1 = k / 3, (k + 1) / 3
            ax, ay = a[0] + (ta[0] - a[0]) * (t0 + t1) / 2, a[1] + (ta[1] - a[1]) * (t0 + t1) / 2
            bx, by = b[0] + (tb[0] - b[0]) * (t0 + t1) / 2, b[1] + (tb[1] - b[1]) * (t0 + t1) / 2
            z = eave + (peak - eave) * (t0 + t1) / 2 + .05
            mid_e = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
            mid_t = ((ta[0] + tb[0]) / 2, (ta[1] + tb[1]) / 2)
            run = math.hypot(mid_t[0] - mid_e[0], mid_t[1] - mid_e[1])
            tilt = math.atan2(peak - eave, max(.05, run))
            box(f"BayCourse_{i}_{k}", ((ax + bx) / 2, (ay + by) / 2, z), (math.hypot(bx - ax, by - ay) * .92, .40, .06),
                mats["roof_light" if (i + k) % 4 == 0 else "roof"], collection, roof, rotation=(tilt, 0, ang))
            count += 1
    return count


# --- hero and support objects ------------------------------------------------------------
def shaft_frame(root, mats, collection):
    """Timber head-frame and winch over the open shaft: the hero object."""
    g = B.empty("shaft_frame", collection, root, (SHAFT[0], SHAFT[1], 0))
    # Legs stand on tile corners (1.5 tiles out on both axes) so the 0.42 tile
    # sampling pad never seals the arch-side tiles beside the shaft.
    for x in (-1.5, 1.5):
        for y in (-1.5, 1.5):
            box("FrameLeg", (x, y, 1.5), (.2, .2, 3.0), mats["timber"], collection, g)
        box("FrameCross", (x, 0, 2.95), (.22, 3.3, .22), mats["timber"], collection, g)
        V1.beam("FrameBrace", (x, -1.45, .6), (x, 1.45, 2.4), .12, .12, mats["timber"], collection, g, bevel=0)
    box("FrameTop", (0, 0, 3.1), (3.3, .24, .24), mats["timber"], collection, g)
    cyl("WinchAxle", (0, 0, 2.75), .06, 1.5, 8, mats["iron"], collection, g, rotation=(math.pi / 2, 0, 0))
    cyl("WinchDrum", (0, 0, 2.75), .24, .7, 10, mats["wood"], collection, g, rotation=(math.pi / 2, 0, 0))
    for side in (-1, 1):
        cyl("WinchWheel", (0, side * .78, 2.75), .42, .08, 12, mats["iron"], collection, g, rotation=(math.pi / 2, 0, 0))
        for k in range(4):
            box(f"WheelSpoke_{k}", (0, side * .78, 2.75), (.06, .06, .8), mats["iron"], collection, g,
                rotation=(0, k * math.pi / 4, 0))
    box("WinchHandle", (0, 1.0, 2.75), (.06, .3, .06), mats["iron"], collection, g)
    box("WinchHandleGrip", (0, 1.15, 2.95), (.06, .06, .4), mats["wood_light"], collection, g)
    cyl("HoistRope", (0, 0, 1.55), .03, 2.4, 6, mats["rope"], collection, g)
    box("HoistHook", (0, 0, .35), (.1, .1, .22), mats["iron"], collection, g)
    box("ShaftLamp", (-1.2, -.55, 2.2), (.22, .22, .3), mats["lamp_glass"], collection, g)
    box("ShaftLampCap", (-1.2, -.55, 2.38), (.28, .28, .06), mats["iron"], collection, g)
    return g


def ore_tally(root, mats, collection):
    """Chalk tally board on the tower's north wall: copper + tin -> bronze."""
    g = B.empty("ore_tally", collection, root, (2.5, TY1 - .32, 0))
    box("TallyFrame", (0, 0, 1.95), (1.5, .12, 1.1), mats["timber"], collection, g)
    box("TallyBoard", (0, -.03, 1.95), (1.34, .1, .94), mats["chalk_board"], collection, g)
    for k in range(3):
        for j in range(4 + (k % 2)):
            box(f"TallyMark_{k}_{j}", (-.5 + j * .22, -.09, 2.25 - k * .28), (.03, .01, .16), mats["chalk"], collection, g)
    box("TallyCopper", (.45, -.09, 2.2), (.18, .01, .12), mats["ore_copper"], collection, g)
    box("TallyTin", (.45, -.09, 1.92), (.18, .01, .12), mats["ore_tin"], collection, g)
    box("TallyBronze", (.45, -.09, 1.64), (.24, .01, .12), mats["brass"], collection, g)
    box("TallyLedge", (0, -.08, 1.42), (1.3, .1, .06), mats["wood"], collection, g)
    return g


def gate_stone(root, mats, collection):
    """The Wardens' gate stone set into the partition beside the arch."""
    g = B.empty("gate_stone", collection, root, (-.2, -2.8, 0))
    g.rotation_euler.z = -math.pi / 2
    box("GateStoneSlab", (0, 0, 1.5), (1.1, .16, .9), mats["stone_light"], collection, g)
    box("GateStoneBorder", (0, -.02, 1.5), (1.0, .14, .8), mats["stone"], collection, g)
    box("GateStoneRelief", (0, -.1, 1.55), (.5, .04, .34), mats["brass"], collection, g)
    for k in range(3):
        box(f"GateStoneLine_{k}", (0, -.1, 1.25 - k * .1), (.7, .02, .03), mats["ink"], collection, g)
    return g


def ore_cart(root, mats, collection):
    g = B.empty("ore_cart", collection, root, (-1.2, -2.8, 0))
    g.rotation_euler.z = .2
    box("CartBody", (0, 0, .62), (1.2, .78, .5), mats["iron"], collection, g)
    box("CartRim", (0, 0, .88), (1.28, .86, .06), mats["rust"], collection, g)
    box("CartOre", (0, 0, .95), (1.0, .6, .18), mats["ore_rock"], collection, g)
    for k, (x, y) in enumerate(((-.3, .1), (.25, -.15), (0, .2))):
        cyl(f"CartOreLump_{k}", (x, y, 1.08), .13, .14, 6, mats["ore_copper" if k % 2 else "ore_tin"], collection, g)
    for x in (-.4, .4):
        for y in (-.44, .44):
            cyl("CartWheel", (x, y, .26), .26, .1, 10, mats["iron"], collection, g, rotation=(math.pi / 2, 0, 0))
    box("CartAxle", (0, 0, .26), (1.0, .95, .06), mats["iron"], collection, g)
    box("CartHandle", (.8, 0, .7), (.5, .06, .06), mats["wood"], collection, g)
    return g


def tool_rack(root, mats, collection):
    g = B.empty("tool_rack", collection, root, (-3.5, TY0 + .32, 0))
    box("RackBoard", (0, 0, 1.6), (1.7, .1, .16), mats["timber"], collection, g)
    for k, x in enumerate((-.6, -.2, .2, .6)):
        box(f"RackPeg_{k}", (x, -.1, 1.6), (.06, .14, .06), mats["wood"], collection, g)
        box(f"RackHandle_{k}", (x, -.16, 1.05), (.06, .06, 1.1), mats["wood_light"], collection, g)
        box(f"RackHead_{k}", (x, -.16, 1.62), (.34, .1, .12) if k % 2 else (.14, .1, .28), mats["iron"], collection, g)
    box("RackBucket", (.95, -.2, .22), (.34, .34, .44), mats["wood"], collection, g)
    return g


def ore_bin(root, mats, collection):
    g = B.empty("ore_bin", collection, root, (BAY_C[0] - .9, BAY_C[1], 0))
    box("BinBody", (0, 0, .5), (1.2, 1.5, 1.0), mats["wood"], collection, g)
    for y in (-.7, 0, .7):
        box("BinStave", (-.62, y, .5), (.08, .1, 1.0), mats["timber"], collection, g)
    box("BinOre", (0, 0, 1.05), (1.05, 1.35, .14), mats["ore_rock"], collection, g)
    for k, (x, y) in enumerate(((-.3, -.4), (.2, .3), (-.1, .5), (.3, -.3))):
        cyl(f"BinLump_{k}", (x, y, 1.18), .14, .16, 6, mats["ore_copper" if k % 2 else "ore_tin"], collection, g)
    box("Chute", (-.9, 0, 1.75), (.7, .5, .12), mats["wood_light"], collection, g, rotation=(0, -.55, 0))
    box("ChuteSide_0", (-.9, -.27, 1.85), (.7, .05, .28), mats["wood"], collection, g, rotation=(0, -.55, 0))
    box("ChuteSide_1", (-.9, .27, 1.85), (.7, .05, .28), mats["wood"], collection, g, rotation=(0, -.55, 0))
    return g


def support_dressing(static, mats, collection):
    # Passage brazier and rope guide, a hanging lamp at the road door.
    box("Brazier", (4.3, -3.4, .55), (.5, .5, .1), mats["iron"], collection, static)
    cyl("BrazierBowl", (4.3, -3.4, .75), .28, .3, 8, mats["iron"], collection, static)
    cyl("BrazierEmber", (4.3, -3.4, .93), .2, .08, 8, mats["ember"], collection, static)
    box("RoadLampArm", (TX1 - .25, ROAD_HINGE[1] - ROAD_W - .5, 3.3), (.4, .08, .08), mats["iron"], collection, static)
    box("RoadLamp", (TX1 - .5, ROAD_HINGE[1] - ROAD_W - .5, 3.05), (.24, .24, .32), mats["lamp_glass"], collection, static)
    # Sacks of ore samples beside the tally, a coil of rope, a water keg.
    for k, (x, y) in enumerate(((1.0, 3.2), (1.6, 3.35))):
        box(f"OreSack_{k}", (x, y, .36), (.5, .42, .72), mats["sack"], collection, static, rotation=(0, 0, .25 * k))
        box(f"OreSackNeck_{k}", (x, y, .8), (.28, .24, .14), mats["rope"], collection, static)
    cyl("RopeCoil", (-4.3, 3.2, .12), .4, .24, 10, mats["rope"], collection, static)
    cyl("WaterKeg", (-4.3, -3.3, .45), .34, .9, 10, mats["wood"], collection, static)
    cyl("WaterKegHoop", (-4.3, -3.3, .7), .36, .06, 10, mats["iron"], collection, static)


# --- assembly ----------------------------------------------------------------------------
SEMANTIC = ("roof", "gate_door", "road_door", "shaft_frame", "ore_tally", "gate_stone", "ore_cart", "tool_rack", "ore_bin")


def create_building():
    mats = materials()
    collection = bpy.data.collections.new("MineGatehouse_HandAuthoredV1")
    bpy.context.scene.collection.children.link(collection)
    root = B.empty("holm_mine_gatehouse_v1", collection)
    root["buildingDefId"] = "holm_mine_gatehouse_v1"
    root["assetId"] = "holm_mine_gatehouse"
    root["revision"] = 1
    root["pipelineVersion"] = 1
    root["assetClass"] = "building"
    root["unitsPerTile"] = 1
    root["artDirection"] = "guide-hall-anchor-family-mine-gatehouse"
    static = B.empty("static_architecture", collection, root)
    mark("floors"); floors(static, mats, collection)
    mark("shell"); shell(static, root, mats, collection)
    mark("furnishings")
    shaft_frame(root, mats, collection)
    ore_tally(root, mats, collection)
    gate_stone(root, mats, collection)
    ore_cart(root, mats, collection)
    tool_rack(root, mats, collection)
    ore_bin(root, mats, collection)
    support_dressing(static, mats, collection)
    mark("roof")
    roof = B.empty("roof", collection, root)
    tiles = tower_roof(roof, mats, collection) + house_roof(roof, mats, collection) + bay_roof(roof, mats, collection)
    return root, static, roof, collection, mats, tiles


def authoring_report(root, tiles):
    names = {obj.name for obj in B.descendants(root)}
    checks = {
        "towerHouseBayCompoundAuthored": all(f"BayWall_{i}" in names for i in range(4)) and "PassageSlab" in names,
        "threeRoofMassesAuthored": all(n in names for n in ("TowerRoofSolid", "HouseRoofSolid", "HouseRoofSolidNorth",
                                                              "BayRoofSolid", "GableEnd")),
        "fittedFullFrameDoorsAuthored": sum("_Plank_" in n for n in names) >= 12 and "GateFrame_Lintel" in names and
                                          "RoadFrame_Lintel" in names and "Gate_OverDoor" in names and "RoadDoor_OverDoor" in names,
        "irregularMasonryCoursesAuthored": sum("_Stone_" in n for n in names) >= 40,
        "loadBearingTimberBaysAuthored": sum("_Brace_" in n for n in names) >= 5,
        "layeredRoofCoursesAuthored": tiles >= 100,
        "openShaftWithHeadFrameAuthored": all(n in names for n in ("HouseFloorW", "HouseFloorE", "HouseFloorN", "HouseFloorS",
                                                                     "WinchDrum", "HoistRope", "FrameTop")),
        "roadPassageAuthored": "PortcullisRail" in names and sum(n.startswith("Cobble_") for n in names) >= 36,
        "stationsAuthored": all(n in names for n in ("TallyBoard", "GateStoneSlab", "CartOre", "RackBoard", "BinOre", "Chute")),
        "semanticNodesPreserved": all(n in names for n in SEMANTIC),
    }
    report = {
        "asset": "holm_mine_gatehouse_v1", "pipelineVersion": 1, "unitsPerTile": 1, "checks": checks,
        "visualLanguage": "Guide Hall anchor family; gate tower with road passage, shaft house, ore bay",
        "roofCourses": tiles,
        "humanScaleContract": {
            "playerVisualHeight": PLAYER_VISUAL_H, "doorOpeningHeight": DOOR_OPENING_H,
            "headFrameHeight": 3.22, "winchAxleHeight": 2.75, "tallyBoardTop": 2.42, "cartRimHeight": 0.91,
            "towerWallHeight": TOWER_H, "houseWallHeight": HOUSE_H,
        },
        "metrics": V1.metrics(root),
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    if not all(checks.values()):
        raise RuntimeError("Mine Gatehouse authoring checks failed: " + ", ".join(n for n, ok in checks.items() if not ok))
    return report


def render_export(root, roof, collection, mats):
    scene = bpy.context.scene
    cam = K.setup_preview(mats)
    cam.location = (19, -22, 18)       # from the south-east: the gate and road door face the road
    cam.data.ortho_scale = 21.0
    V1.look_at(cam, (0, 0, 2.6))
    scene.render.filepath = str(PREVIEW / "mine_gatehouse_v1_exterior.png")
    bpy.ops.render.render(write_still=True)
    B.set_render_hidden(roof, True)
    scene.render.filepath = str(PREVIEW / "mine_gatehouse_v1_roof_off.png")
    bpy.ops.render.render(write_still=True)
    cam.location = (0, -0.001, 31); V1.look_at(cam, (0, 0, 0)); cam.data.ortho_scale = 16.0
    scene.render.filepath = str(PREVIEW / "mine_gatehouse_v1_plan.png")
    bpy.ops.render.render(write_still=True)
    B.set_render_hidden(roof, False)
    cam.location = (18, -20, 16); cam.data.ortho_scale = 23.0; V1.look_at(cam, (0, 0, 2.0))
    scene.render.filepath = str(PREVIEW / "mine_gatehouse_v1_game_camera.png")
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
    print("MINE_GATEHOUSE_V1_READY", MODEL)


if __name__ == "__main__":
    main()
