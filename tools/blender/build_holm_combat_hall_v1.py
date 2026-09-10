"""Build the Tutor's Holm Combat Hall surface asset (v1).

Warden's Ridge's combat practice hall. A gabled drill hall holds the training
pell; a taller square drill tower on the east end receives the Training
Cavern's one-way exit stair, so miners surface inside the hall; a covered
practice yard on posts opens south of the tower with an archery butt; and a
half-octagonal armoury apse on the north wall holds the rack of arms. The west
door faces the Holm Bank's staff door; the south door leaves toward the road.

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
SOURCE = ROOT / "assets" / "blender" / "holm_combat_hall_v1.blend"
MODEL = ROOT / "assets" / "models" / "buildings" / "holm_combat_hall_v1.glb"
PREVIEW = ROOT / "scratchpad" / "combat_hall_v1"
REPORT = PREVIEW / "asset_report.json"
PROGRESS = PREVIEW / "build_progress.txt"
for path in (SOURCE.parent, MODEL.parent, PREVIEW):
    path.mkdir(parents=True, exist_ok=True)

V1.RNG = random.Random(260913)
V1.APPLY_BEVEL = False

# --- plan (Blender x/y; game z = -y) -----------------------------------------------
HALL_H, TOWER_H, APSE_H, YARD_H = 4.6, 6.0, 3.6, 3.6
HX0, HX1, Y0, Y1 = -6.0, 2.0, -4.5, 4.5        # drill hall
TX1 = 6.0                                       # tower x 2..6, y 0..4.5; yard x 2..6, y -4.5..0
ARCH = (0.5, 3.5)                               # partition x=2 opening (game z -0.5..-3.5)
WEST_HINGE = (HX0, -0.5)                        # west door, leaf toward +y; opening game z -0.5 (118.5)
WEST_W = 2.0
SOUTH_HINGE = (-3.5, Y0)                        # south door, leaf +x; opening x -2.5 (game 169.5)
SOUTH_W = 2.0
APSE_C = (-2.0, Y1)
APSE_R = 2.0
APSE_PTS = [(APSE_C[0] + math.cos(math.radians(a)) * APSE_R, APSE_C[1] + math.sin(math.radians(a)) * APSE_R)
            for a in (0, 45, 90, 135, 180)]    # (0,4.5) -> (-0.59,5.91) -> (-2,6.5) -> (-3.41,5.91) -> (-4,4.5)
STAIR = (4.5, 2.5)                              # cavern stair landing, game (4.5,-2.5) -> world (176.5,116.5)
PLAYER_VISUAL_H = 1.85
DOOR_OPENING_H = 3.05
box, cyl, solid, prism_solid, wall, over_door, shuttered_window = (
    K.box, K.cyl, K.solid, K.prism_solid, K.wall, K.over_door, K.shuttered_window)


def mark(stage):
    PROGRESS.write_text(stage, encoding="utf-8")
    print("COMBAT_HALL_V1_STAGE", stage, flush=True)


def materials():
    mats = K.materials()
    mats.update({
        "sand": V1.material("CR Hall Yard Sand", (.72, .62, .42)),
        "sand_dark": V1.material("CR Hall Yard Sand Dark", (.58, .49, .32)),
        "leather": V1.material("CR Hall Leather", (.36, .20, .11)),
        "straw": V1.material("CR Hall Straw", (.78, .66, .32)),
        "banner_red": V1.material("CR Hall Banner Red", (.52, .12, .10)),
        "banner_gold": V1.material("CR Hall Banner Gold", (.78, .60, .22)),
        "steel": V1.material("CR Hall Steel", (.60, .62, .66), .45, .5),
        "target_white": V1.material("CR Hall Target White", (.90, .88, .80)),
        "target_red": V1.material("CR Hall Target Red", (.70, .16, .12)),
        "dark_hole": V1.material("CR Hall Stair Dark", (.05, .045, .04)),
        "ink": V1.material("CR Hall Ink", (.12, .10, .14)),
        "brass_plate": V1.material("CR Hall Brass Plate", (.80, .62, .24), .5, .5),
    })
    return mats


# --- architecture --------------------------------------------------------------------
def floors(static, mats, collection):
    box("HallSlab", ((HX0 + HX1) / 2, 0, .06), (HX1 - HX0, Y1 - Y0, .12), mats["wood"], collection, static)
    for k, x in enumerate([HX0 + .55 + n * .82 for n in range(9)]):
        box(f"HallSeam_{k}", (x, 0, .125), (.035, Y1 - Y0 - .3, .018), mats["timber"], collection, static)
    # Sparring circle inlaid in the hall floor.
    cyl("SparringRing", (-1.0, -1.0, .13), 2.1, .02, 16, mats["timber"], collection, static)
    cyl("SparringRingInner", (-1.0, -1.0, .135), 1.85, .02, 16, mats["wood"], collection, static)
    # Tower: flagstones. Yard: raked sand with a darker practice lane.
    box("TowerSlab", ((HX1 + TX1) / 2, (0 + Y1) / 2, .06), (TX1 - HX1, Y1, .12), mats["flag"], collection, static)
    for row in range(4):
        for col in range(4):
            if (row + col) % 2:
                box(f"TowerFlag_{row}_{col}", (HX1 + .5 + col, .5 + row, .125), (.86, .86, .02), mats["flag_light"], collection, static)
    box("YardSand", ((HX1 + TX1) / 2, (Y0 + 0) / 2, .05), (TX1 - HX1 + .4, -Y0 + .4, .10), mats["sand"], collection, static)
    box("YardLane", (HX1 + 1.5, (Y0 + 0) / 2, .105), (1.0, -Y0 - .4, .02), mats["sand_dark"], collection, static)
    prism_solid("ApseFloor", [(APSE_PTS[0][0], Y1)] + APSE_PTS[1:-1] + [(APSE_PTS[-1][0], Y1)], 0.0, .13, mats["flag_light"],
                collection, static)
    box("WestStep", (HX0 - .55, WEST_HINGE[1] + WEST_W / 2, -.02), (.9, WEST_W + .9, .16), mats["stone_light"], collection, static)
    box("SouthStep", (SOUTH_HINGE[0] + SOUTH_W / 2, Y0 - .55, -.02), (SOUTH_W + .9, .9, .16), mats["stone_light"], collection, static)


def shell(static, root, mats, collection):
    hall_in, tower_in, apse_in = (-2.0, 0.0), (4.0, 2.25), (-2.0, 5.2)
    # Hall.
    wall("SouthWallW", (HX0, Y0), (SOUTH_HINGE[0], Y0), HALL_H, mats, collection, static, hall_in, end_inset=.35)
    wall("SouthWallE", (SOUTH_HINGE[0] + SOUTH_W, Y0), (HX1, Y0), HALL_H, mats, collection, static, hall_in, start_inset=.35)
    wall("HallEastExterior", (HX1, Y0), (HX1, ARCH[0]), HALL_H, mats, collection, static, hall_in)
    wall("PartitionN", (HX1, ARCH[1]), (HX1, Y1), HALL_H, mats, collection, static, hall_in, detail=False)
    box("ArchLintel", (HX1, (ARCH[0] + ARCH[1]) / 2, 3.2), (.36, ARCH[1] - ARCH[0] + .5, .34), mats["timber"], collection, static)
    box("ArchFill", (HX1, (ARCH[0] + ARCH[1]) / 2, (3.37 + HALL_H) / 2), (.26, ARCH[1] - ARCH[0] + .1, HALL_H - 3.37),
        mats["plaster"], collection, static)
    for y in (ARCH[0] - .12, ARCH[1] + .12):
        box("ArchJamb", (HX1, y, 1.6), (.32, .24, 3.2), mats["timber"], collection, static)
    wall("HallNorthE", (HX1, Y1), (APSE_PTS[0][0], Y1), HALL_H, mats, collection, static, hall_in)
    for i in range(len(APSE_PTS) - 1):
        wall(f"ApseWall_{i}", APSE_PTS[i], APSE_PTS[i + 1], APSE_H, mats, collection, static, apse_in, start_inset=.12, end_inset=.12)
    wall("HallNorthW", (APSE_PTS[-1][0], Y1), (HX0, Y1), HALL_H, mats, collection, static, hall_in)
    wall("WestWallN", (HX0, Y1), (HX0, WEST_HINGE[1] + WEST_W), HALL_H, mats, collection, static, hall_in, end_inset=.35)
    wall("WestWallS", (HX0, WEST_HINGE[1]), (HX0, Y0), HALL_H, mats, collection, static, hall_in, start_inset=.35)
    # Tower.
    wall("TowerSouth", (HX1, 0), (TX1, 0), TOWER_H, mats, collection, static, tower_in)
    wall("TowerEast", (TX1, 0), (TX1, Y1), TOWER_H, mats, collection, static, tower_in)
    wall("TowerNorth", (TX1, Y1), (HX1, Y1), TOWER_H, mats, collection, static, tower_in)

    V1.door_frame("WestFrame", WEST_HINGE, WEST_W, math.pi / 2, mats, collection, static)
    V1.door_frame("SouthFrame", SOUTH_HINGE, SOUTH_W, 0, mats, collection, static)
    over_door("WestDoor", WEST_HINGE, WEST_W, math.pi / 2, HALL_H, mats, collection, static)
    over_door("SouthDoor", SOUTH_HINGE, SOUTH_W, 0, HALL_H, mats, collection, static)
    V1.door_leaf("bank_door", WEST_HINGE, WEST_W, math.pi / 2, mats, collection, root)
    V1.door_leaf("road_door", SOUTH_HINGE, SOUTH_W, 0, mats, collection, root)

    shuttered_window("SouthWindow", 0.5, Y0 - .05, 0, mats, collection, static, sill=1.3, h=1.1, w=1.15)
    shuttered_window("NorthWindow", -5.0, Y1 + .05, math.pi, mats, collection, static, sill=1.3, h=1.1, w=1.15)
    shuttered_window("TowerEastSlit", TX1 + .05, 2.25, -math.pi / 2, mats, collection, static, sill=3.6, h=1.0, w=.6)
    shuttered_window("TowerNorthSlit", 4.0, Y1 + .05, math.pi, mats, collection, static, sill=3.6, h=1.0, w=.6)
    for name in ("SouthWallE_Brace_0", "TowerEast_Brace_0", "TowerNorth_Brace_0"):
        obj = bpy.data.objects.get(name)
        if obj is None:
            raise RuntimeError("expected window-bay brace is missing: " + name)
        bpy.data.objects.remove(obj, do_unlink=True)
    for k, x in enumerate((-4.4, -2.0, 0.4)):
        box(f"HallBeam_{k}", (x, 0, HALL_H - .28), (.26, Y1 - Y0 - .2, .30), mats["timber"], collection, static)
    # Yard posts and rails (three open sides).
    for k, (x, y) in enumerate(((TX1, Y0 + .5), (TX1, -2.0), (HX1 + 2.0, Y0 + .5))):
        box(f"YardPost_{k}", (x, y, YARD_H / 2), (.24, .24, YARD_H), mats["timber"], collection, static)
    box("YardCornerPost", (TX1, 0.0, YARD_H / 2), (.24, .24, YARD_H), mats["timber"], collection, static)
    box("YardPlateE", (TX1, Y0 / 2, YARD_H + .02), (.22, -Y0 + .2, .22), mats["timber"], collection, static)
    box("YardPlateS", ((HX1 + TX1) / 2, Y0 + .5, YARD_H - .3 + .02), (TX1 - HX1 + .2, .22, .22), mats["timber"], collection, static)
    box("YardRail", (TX1, -2.5, .95), (.1, 3.6, .12), mats["wood"], collection, static)


def hall_roof(roof, mats, collection):
    cy = 0
    half = (Y1 - Y0) / 2 + .55
    x0, x1 = HX0 - .45, HX1 - .05
    eave, peak = HALL_H + .10, 7.4
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
                key = "roof_moss" if (row * 3 + col) % 17 == 0 else ("roof_light" if (row + col) % 7 == 0 else "roof")
                box(f"HallTile_{side}_{row}_{col}", (x, y, z), (.84, tile_slope, .085), mats[key], collection, roof,
                    rotation=(-side * angle, 0, 0))
                count += 1
        box("HallEave", ((x0 + x1) / 2, cy + side * (half + .05), eave - .05), (x1 - x0 + .1, .18, .22), mats["timber"],
            collection, roof)
    box("HallRidge", ((x0 + x1) / 2, cy, peak + .06), (x1 - x0 + .2, .30, .30), mats["timber"], collection, roof)
    wall_half = (Y1 - Y0) / 2
    gv = [(HX0 - .13, cy - wall_half, HALL_H - .05), (HX0 - .13, cy + wall_half, HALL_H - .05), (HX0 - .13, cy, peak - .30),
          (HX0 + .13, cy - wall_half, HALL_H - .05), (HX0 + .13, cy + wall_half, HALL_H - .05), (HX0 + .13, cy, peak - .30)]
    solid("GableEnd", gv, [(0, 1, 2), (3, 5, 4), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)], [mats["plaster"]], collection, roof)
    for side in (-1, 1):
        V1.beam(f"GableBrace_{side}", (HX0 - .19, cy + side * (wall_half - .55), HALL_H + .05), (HX0 - .19, cy, peak - .5),
                .16, .16, mats["timber"], collection, roof, bevel=0)
    # Crossed-swords crest on the west gable.
    crest = B.empty("HallCrest", collection, roof, (HX0 - .3, cy, peak + .1))
    for k in (-1, 1):
        box(f"CrestSword_{k}", (0, 0, .5), (.08, .06, 1.1), mats["steel"], collection, crest, rotation=(0, 0, 0))
        crest_blade = bpy.context.object
        crest_blade.rotation_euler = (k * .6, 0, 0)
        box(f"CrestGuard_{k}", (0, 0, .2), (.08, .4, .08), mats["brass"], collection, crest, rotation=(k * .6, 0, 0))
    return count


def tower_roof(roof, mats, collection):
    pts = [(HX1 - .45, -.45), (TX1 + .45, -.45), (TX1 + .45, Y1 + .45), (HX1 - .45, Y1 + .45)]
    eave, peak = TOWER_H + .12, 8.8
    cx, cy = (HX1 + TX1) / 2, Y1 / 2
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
        for k in range(5):
            t0, t1 = k / 5, (k + 1) / 5
            ax, ay = a[0] + (ta[0] - a[0]) * (t0 + t1) / 2, a[1] + (ta[1] - a[1]) * (t0 + t1) / 2
            bx, by = b[0] + (tb[0] - b[0]) * (t0 + t1) / 2, b[1] + (tb[1] - b[1]) * (t0 + t1) / 2
            z = eave + (peak - eave) * (t0 + t1) / 2 + .05
            mid_e = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
            mid_t = ((ta[0] + tb[0]) / 2, (ta[1] + tb[1]) / 2)
            run = math.hypot(mid_t[0] - mid_e[0], mid_t[1] - mid_e[1])
            tilt = math.atan2(peak - eave, max(.05, run))
            box(f"TowerCourse_{i}_{k}", ((ax + bx) / 2, (ay + by) / 2, z), (math.hypot(bx - ax, by - ay) * .92, .42, .06),
                mats["roof_light" if (i + k) % 4 == 0 else "roof"], collection, roof, rotation=(tilt, 0, ang))
            count += 1
    box("TowerCap", (cx, cy, peak + .08), (.9, .9, .16), mats["timber"], collection, roof)
    # Iron helm finial.
    cyl("HelmFinial", (cx, cy, peak + .5), .26, .5, 8, mats["steel"], collection, roof)
    cyl("HelmFinialCrest", (cx, cy, peak + .85), .05, .3, 6, mats["brass"], collection, roof)
    return count


def apse_roof(roof, mats, collection):
    pts = [(APSE_PTS[0][0] + .45, Y1)] + [
        (APSE_C[0] + math.cos(math.radians(a)) * (APSE_R + .5), APSE_C[1] + math.sin(math.radians(a)) * (APSE_R + .5))
        for a in (0, 45, 90, 135, 180)] + [(APSE_PTS[-1][0] - .45, Y1)]
    eave, peak = APSE_H + .12, 5.3
    n = len(pts)
    top = [(APSE_C[0] + (x - APSE_C[0]) * .16, APSE_C[1] - .3 + (y - APSE_C[1] + .3) * .16, peak) for x, y in pts]
    verts = [(x, y, eave) for x, y in pts] + top + [(x, y, eave - .16) for x, y in pts]
    faces = [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    faces.append(tuple(range(n, 2 * n)))
    faces += [(i, (i + 1) % n, (i + 1) % n + 2 * n, i + 2 * n) for i in range(n)]
    faces.append(tuple(range(2 * n, 3 * n)))
    solid("ApseRoofSolid", verts, faces, [mats["roof"]], collection, roof)
    count = 0
    for i in range(n - 1):
        a, b = pts[i], pts[i + 1]
        length = math.hypot(b[0] - a[0], b[1] - a[1])
        ang = math.atan2(b[1] - a[1], b[0] - a[0])
        box(f"ApseFascia_{i}", ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, eave - .06), (length + .1, .18, .22), mats["timber"],
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
            box(f"ApseCourse_{i}_{k}", ((ax + bx) / 2, (ay + by) / 2, z), (math.hypot(bx - ax, by - ay) * .92, .40, .06),
                mats["roof_light" if (i + k) % 4 == 0 else "roof"], collection, roof, rotation=(tilt, 0, ang))
            count += 1
    return count


def yard_roof(roof, mats, collection):
    high_y, low_y = 0.0 - .05, Y0 - .55
    high_z, low_z = TOWER_H - .9, YARD_H + .12
    x0, x1 = HX1 - .05, TX1 + .55
    span, rise = high_y - low_y, high_z - low_z
    angle = math.atan2(rise, span)
    slope = math.hypot(span, rise)
    box("YardRoofBase", ((x0 + x1) / 2, (high_y + low_y) / 2, (high_z + low_z) / 2), (x1 - x0, slope + .16, .15), mats["roof"],
        collection, roof, rotation=(angle, 0, 0))
    count = 0
    for row, x in enumerate([x0 + .45 + n * ((x1 - x0 - .9) / 4) for n in range(5)]):
        for col in range(4):
            t = (col + .5) / 4
            y = high_y - span * t
            z = high_z - rise * t + .09
            box(f"YardTile_{row}_{col}", (x, y, z), (.86, slope / 4 * 1.08, .08), mats["roof_light" if (row + col) % 5 == 0 else "roof"],
                collection, roof, rotation=(angle, 0, 0))
            count += 1
    box("YardEave", ((x0 + x1) / 2, low_y - .04, low_z - .02), (x1 - x0 + .1, .18, .20), mats["timber"], collection, roof)
    return count


# --- hero and support objects ------------------------------------------------------------
def training_post(root, mats, collection):
    """The pell: an oak post with a padded head, a strapped shield and cut marks."""
    g = B.empty("training_post", collection, root, (-1.0, 1.0, 0))
    cyl("PellBase", (0, 0, .1), .42, .2, 8, mats["stone"], collection, g)
    cyl("PellPost", (0, 0, 1.15), .16, 2.1, 8, mats["wood"], collection, g)
    cyl("PellHead", (0, 0, 2.3), .26, .4, 8, mats["leather"], collection, g)
    box("PellStrap", (0, 0, 2.3), (.58, .1, .06), mats["iron"], collection, g)
    box("PellShield", (-.28, 0, 1.4), (.1, .6, .78), mats["wood_light"], collection, g)
    cyl("PellShieldBoss", (-.35, 0, 1.4), .1, .06, 8, mats["iron"], collection, g, rotation=(0, math.pi / 2, 0))
    for k in range(5):
        box(f"PellCut_{k}", (.17, -.05 + k * .03, .7 + k * .28), (.02, .12, .03), mats["timber"], collection, g,
            rotation=(0, 0, .3 * k))
    box("PellArm", (0, .0, 1.75), (.12, .9, .1), mats["wood"], collection, g)
    return g


def arms_rack(root, mats, collection):
    g = B.empty("arms_rack", collection, root, (APSE_C[0], APSE_C[1] + .8, 0))
    box("RackBack", (0, .3, 1.35), (2.0, .1, 2.2), mats["timber"], collection, g)
    box("RackShelf", (0, 0, .45), (2.0, .5, .08), mats["wood"], collection, g)
    box("RackBar", (0, .1, 2.35), (2.0, .1, .1), mats["timber"], collection, g)
    for k, x in enumerate((-.7, -.35, 0, .35, .7)):
        box(f"RackWeaponHandle_{k}", (x, .15, 1.0), (.06, .06, .5), mats["wood_light"], collection, g)
        if k % 2:
            box(f"RackBlade_{k}", (x, .15, 1.75), (.08, .03, 1.0), mats["steel"], collection, g)
        else:
            box(f"RackAxeHead_{k}", (x, .15, 1.45), (.3, .06, .22), mats["steel"], collection, g)
    box("RackShield", (-.75, -.2, .95), (.7, .08, .9), mats["wood_light"], collection, g)
    box("RackShieldBoss", (-.75, -.26, .95), (.16, .04, .16), mats["iron"], collection, g)
    box("RackBow", (.8, -.15, 1.2), (.05, .05, 1.4), mats["wood_light"], collection, g, rotation=(0, .12, 0))
    cyl("RackQuiver", (.45, -.2, .75), .1, .6, 6, mats["leather"], collection, g)
    for k in range(3):
        box(f"RackArrow_{k}", (.42 + k * .04, -.2, 1.15), (.02, .02, .4), mats["wood_light"], collection, g)
    return g


def warden_roll(root, mats, collection):
    g = B.empty("warden_roll", collection, root, (HX0 + .3, 2.5, 0))
    g.rotation_euler.z = math.pi / 2
    box("RollFrame", (0, 0, 1.95), (1.3, .12, 1.0), mats["timber"], collection, g)
    box("RollPlate", (0, -.03, 1.95), (1.14, .1, .84), mats["brass_plate"], collection, g)
    for k in range(5):
        box(f"RollLine_{k}", (0, -.09, 2.25 - k * .14), (.8 - (k % 2) * .25, .01, .03), mats["ink"], collection, g)
    box("RollHelm", (.42, -.09, 2.22), (.16, .01, .16), mats["steel"], collection, g)
    return g


def archery_butt(root, mats, collection):
    g = B.empty("archery_butt", collection, root, (5.0, -3.5, 0))
    cyl("ButtBody", (0, 0, .95), .6, .4, 12, mats["straw"], collection, g, rotation=(0, math.pi / 2, 0))
    for k, (r, key) in enumerate(((.46, "target_white"), (.3, "target_red"), (.14, "target_white"))):
        cyl(f"ButtRing_{k}", (-.21 - k * .01, 0, .95), r, .02, 12, mats[key], collection, g, rotation=(0, math.pi / 2, 0))
    box("ButtStand", (0, 0, .35), (.5, .14, .7), mats["timber"], collection, g)
    box("ButtFoot", (0, 0, .05), (.6, .9, .1), mats["timber"], collection, g)
    for k in range(3):
        box(f"ButtArrow_{k}", (-.35, -.1 + k * .1, .9 + k * .08), (.5, .02, .02), mats["wood_light"], collection, g,
            rotation=(0, .1 * k, .0))
    return g


def hall_bench(root, mats, collection):
    g = B.empty("hall_bench", collection, root, (0.0, Y0 + .45, 0))
    box("BenchSeat", (0, 0, .5), (2.0, .48, .1), mats["wood"], collection, g)
    for x in (-.85, .85):
        box("BenchLeg", (x, 0, .25), (.12, .42, .5), mats["timber"], collection, g)
    box("BenchHelm", (-.5, 0, .68), (.3, .3, .26), mats["steel"], collection, g)
    box("BenchGloves", (.5, 0, .57), (.34, .26, .1), mats["leather"], collection, g)
    return g


def cavern_stair(static, mats, collection):
    """Stair head in the tower where the cavern's one-way exit surfaces."""
    g = B.empty("CavernStairHead", collection, static, (STAIR[0], STAIR[1], 0))
    box("StairHole", (0, 0, .07), (1.4, 1.4, .06), mats["dark_hole"], collection, g)
    for k in range(4):
        box(f"StairStep_{k}", (.55 - k * .25, 0, .12 - k * .05), (.24, 1.2, .1), mats["stone_light"], collection, g)
    for y in (-.7, .7):
        box("StairKerb", (0, y, .16), (1.5, .1, .1), mats["timber"], collection, g)
        for x in (-.6, .6):
            cyl("StairBaluster", (x, y, .55), .04, .8, 6, mats["iron"], collection, g)
        box("StairRail", (0, y, .95), (1.4, .05, .05), mats["iron"], collection, g)
    box("StairLamp", (-.6, -.85, 1.9), (.2, .2, .28), mats["lamp_glass"] if "lamp_glass" in mats else mats["chalk"], collection, g)
    box("StairSign", (0, .95, 1.5), (.7, .04, .3), mats["wood_light"], collection, g)


def sockets(root, collection):
    B.empty("melee_dummy_socket", collection, root, (4.0, -1.5, 0))
    B.empty("ranged_target_socket", collection, root, (3.0, -3.5, 0))


def support_dressing(static, mats, collection):
    for k, x in enumerate((-4.5, -1.5)):
        box(f"WallBanner_{k}", (x, Y1 - .2, 2.9), (.7, .05, 1.4), mats["banner_red"], collection, static)
        box(f"WallBannerEmblem_{k}", (x, Y1 - .24, 2.9), (.3, .03, .3), mats["banner_gold"], collection, static)
        box(f"WallBannerRod_{k}", (x, Y1 - .2, 3.65), (.9, .08, .08), mats["timber"], collection, static)
    for k, y in enumerate((-2.5, 2.0)):
        box(f"WallShield_{k}", (HX0 + .2, y, 2.4), (.06, .6, .7), mats["wood_light"], collection, static)
        box(f"WallShieldBoss_{k}", (HX0 + .26, y, 2.4), (.04, .14, .14), mats["iron"], collection, static)
    box("WaterBarrelYard", (HX1 + .6, -.6, .45), (.7, .7, .9), mats["wood"], collection, static)
    cyl("QuiverStand", (HX1 + 1.2, -3.8, .5), .12, 1.0, 6, mats["leather"], collection, static)
    cyl("TowerBrazier", (5.2, 3.8, .55), .25, .5, 8, mats["iron"], collection, static)
    cyl("TowerBrazierEmber", (5.2, 3.8, .82), .18, .08, 8, mats["ember"], collection, static)


# --- assembly ----------------------------------------------------------------------------
SEMANTIC = ("roof", "bank_door", "road_door", "training_post", "arms_rack", "warden_roll", "archery_butt", "hall_bench",
            "melee_dummy_socket", "ranged_target_socket")


def create_building():
    mats = materials()
    mats.setdefault("lamp_glass", V1.material("CR Hall Lamp Glass", (.98, .78, .40), .5, 0, 1.6))
    collection = bpy.data.collections.new("CombatHall_HandAuthoredV1")
    bpy.context.scene.collection.children.link(collection)
    root = B.empty("holm_combat_hall_v1", collection)
    root["buildingDefId"] = "holm_combat_hall_v1"
    root["assetId"] = "holm_combat_hall"
    root["revision"] = 1
    root["pipelineVersion"] = 1
    root["assetClass"] = "building"
    root["unitsPerTile"] = 1
    root["artDirection"] = "guide-hall-anchor-family-combat-hall"
    static = B.empty("static_architecture", collection, root)
    mark("floors"); floors(static, mats, collection)
    mark("shell"); shell(static, root, mats, collection)
    mark("furnishings")
    training_post(root, mats, collection)
    arms_rack(root, mats, collection)
    warden_roll(root, mats, collection)
    archery_butt(root, mats, collection)
    hall_bench(root, mats, collection)
    cavern_stair(static, mats, collection)
    sockets(root, collection)
    support_dressing(static, mats, collection)
    mark("roof")
    roof = B.empty("roof", collection, root)
    tiles = hall_roof(roof, mats, collection) + tower_roof(roof, mats, collection) + apse_roof(roof, mats, collection) + \
        yard_roof(roof, mats, collection)
    return root, static, roof, collection, mats, tiles


def authoring_report(root, tiles):
    names = {obj.name for obj in B.descendants(root)}
    checks = {
        "hallTowerYardApseCompoundAuthored": all(f"ApseWall_{i}" in names for i in range(4)) and "TowerSouth" in names and "YardSand" in names,
        "fourRoofMassesAuthored": all(n in names for n in ("HallRoofSolid", "HallRoofSolidNorth", "TowerRoofSolid", "ApseRoofSolid",
                                                             "YardRoofBase", "GableEnd")),
        "fittedFullFrameDoorsAuthored": sum("_Plank_" in n for n in names) >= 12 and "WestFrame_Lintel" in names and
                                          "SouthFrame_Lintel" in names and "WestDoor_OverDoor" in names and "SouthDoor_OverDoor" in names,
        "irregularMasonryCoursesAuthored": sum("_Stone_" in n for n in names) >= 40,
        "loadBearingTimberBaysAuthored": sum("_Brace_" in n for n in names) >= 5,
        "layeredRoofCoursesAuthored": tiles >= 120,
        "cavernStairHeadAuthored": all(n in names for n in ("StairHole", "StairStep_0", "StairRail", "StairSign")),
        "practiceStationsAuthored": all(n in names for n in ("PellPost", "PellShield", "SparringRing", "RackBack", "ButtBody",
                                                               "RollPlate", "BenchHelm")),
        "semanticNodesPreserved": all(n in names for n in SEMANTIC),
    }
    report = {
        "asset": "holm_combat_hall_v1", "pipelineVersion": 1, "unitsPerTile": 1, "checks": checks,
        "visualLanguage": "Guide Hall anchor family; drill hall with drill tower, practice yard, armoury apse",
        "roofCourses": tiles,
        "humanScaleContract": {
            "playerVisualHeight": PLAYER_VISUAL_H, "doorOpeningHeight": DOOR_OPENING_H,
            "pellHeadHeight": 2.5, "archeryButtCentreHeight": 0.95, "benchSeatHeight": 0.55, "rackBarHeight": 2.4,
            "hallWallHeight": HALL_H, "towerWallHeight": TOWER_H,
        },
        "metrics": V1.metrics(root),
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    if not all(checks.values()):
        raise RuntimeError("Combat Hall authoring checks failed: " + ", ".join(n for n, ok in checks.items() if not ok))
    return report


def render_export(root, roof, collection, mats):
    scene = bpy.context.scene
    cam = K.setup_preview(mats)
    cam.location = (20, -22, 18)
    cam.data.ortho_scale = 22.0
    V1.look_at(cam, (0, 0, 2.6))
    scene.render.filepath = str(PREVIEW / "combat_hall_v1_exterior.png")
    bpy.ops.render.render(write_still=True)
    B.set_render_hidden(roof, True)
    scene.render.filepath = str(PREVIEW / "combat_hall_v1_roof_off.png")
    bpy.ops.render.render(write_still=True)
    cam.location = (0, -0.001, 31); V1.look_at(cam, (0, 0, 0)); cam.data.ortho_scale = 18.0
    scene.render.filepath = str(PREVIEW / "combat_hall_v1_plan.png")
    bpy.ops.render.render(write_still=True)
    B.set_render_hidden(roof, False)
    cam.location = (-18, -20, 16); cam.data.ortho_scale = 24.0; V1.look_at(cam, (0, 0, 2.0))
    scene.render.filepath = str(PREVIEW / "combat_hall_v1_game_camera.png")
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
    print("COMBAT_HALL_V1_READY", MODEL)


if __name__ == "__main__":
    main()
