"""Build the Tutor's Holm Mage Tower surface asset (v1).

The Mage Headland's magic practice tower. A two-storey square stone tower
holds the casting hall on its ground floor (rune table, casting circle, the
practice target's socket, a spiral stair to the shuttered upper study) under a
tall pyramid spire; a timber scriptorium wing on the east side holds the
spell lectern, a bookshelf and the tower register. The west door faces the
ridge road; the south door leaves toward the departure dock road.

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
SOURCE = ROOT / "assets" / "blender" / "holm_mage_tower_v1.blend"
MODEL = ROOT / "assets" / "models" / "buildings" / "holm_mage_tower_v1.glb"
PREVIEW = ROOT / "scratchpad" / "mage_tower_v1"
REPORT = PREVIEW / "asset_report.json"
PROGRESS = PREVIEW / "build_progress.txt"
for path in (SOURCE.parent, MODEL.parent, PREVIEW):
    path.mkdir(parents=True, exist_ok=True)

V1.RNG = random.Random(260914)
V1.APPLY_BEVEL = False

# --- plan (Blender x/y; game z = -y) -----------------------------------------------
TOWER_H, WING_H, UPPER_FLOOR = 7.6, 4.2, 4.0
TX0, TX1, TY0, TY1 = -5.0, 1.0, -3.0, 3.0        # square stone tower
WX1, WY0, WY1 = 5.0, -2.0, 3.0                  # scriptorium wing x 1..5, y -2..3
ARCH = (-0.5, 2.5)                              # partition x=1 opening (game z -2.5..0.5 -> two tiles)
WEST_HINGE = (TX0, -0.5)                        # west door, leaf toward +y; opening game z -0.5 (world 135.5)
WEST_W = 2.0
SOUTH_HINGE = (-2.5, TY0)                       # south door, leaf +x; opening x -1.5 (world 191.5)
SOUTH_W = 2.0
CIRCLE_C = (-2.0, -0.5)                         # casting circle centre (game z 0.5)
TABLE = (-2.0, 2.35)                            # rune table against the north wall (game z -2.35)
STAIR = (-4.3, 2.3)                             # spiral stair, north-west corner (game z -2.3)
ORRERY = (-4.4, -1.6)                           # orrery stand, south-west corner (game z 1.6)
LECTERN = (4.35, -0.5)                          # spell lectern against the wing's east wall (game z 0.5)
SHELF = (3.0, -1.7)                             # bookshelf along the wing's south wall (game z 1.7)
REGISTER = (3.0, WY1 - .15)                     # tower register on the wing's north wall (game z -2.85)
SOCKET = (-2.0, -1.5)                           # practice target socket inside the circle (game z 1.5)
PLAYER_VISUAL_H = 1.85
DOOR_OPENING_H = 3.05
box, cyl, solid, prism_solid, wall, over_door, shuttered_window = (
    K.box, K.cyl, K.solid, K.prism_solid, K.wall, K.over_door, K.shuttered_window)


def mark(stage):
    PROGRESS.write_text(stage, encoding="utf-8")
    print("MAGE_TOWER_V1_STAGE", stage, flush=True)


def materials():
    mats = K.materials()
    mats.update({
        "stone_dark": V1.material("CR Tower Stone Dark", (.30, .30, .31)),
        "rune_blue": V1.material("CR Tower Rune Blue", (.30, .62, .95), .5, 0, 1.4),
        "rune_glow": V1.material("CR Tower Rune Glow", (.55, .85, 1.0), .4, 0, 2.6),
        "velvet": V1.material("CR Tower Velvet", (.30, .14, .40)),
        "velvet_gold": V1.material("CR Tower Velvet Gold", (.80, .64, .26)),
        "parchment": V1.material("CR Tower Parchment", (.88, .82, .66)),
        "ink": V1.material("CR Tower Ink", (.12, .10, .14)),
        "book_red": V1.material("CR Tower Book Red", (.52, .16, .14)),
        "book_green": V1.material("CR Tower Book Green", (.20, .40, .26)),
        "book_blue": V1.material("CR Tower Book Blue", (.18, .28, .52)),
        "brass_bright": V1.material("CR Tower Brass Bright", (.86, .70, .30), .4, .6),
        "candle": V1.material("CR Tower Candle", (.95, .92, .82)),
        "flame": V1.material("CR Tower Flame", (1.0, .62, .18), .6, 0, 4.0),
        "slate_dark": V1.material("CR Tower Slate Dark", (.16, .18, .22)),
        "dark_hole": V1.material("CR Tower Hatch Dark", (.05, .045, .04)),
    })
    return mats


# --- architecture --------------------------------------------------------------------
def stone_wall(name, a, b, height, mats, collection, parent, interior, z0=0.0, upper=None):
    """A solid ashlar wall: plaster core in stone colour plus coursed exterior blocks.

    The ground storey (z0..UPPER_FLOOR) goes under parent; when upper is given the storey above the
    string course is built under it instead (the roof group), so it cuts away with the spire."""
    if upper is not None:
        stone_wall(name, a, b, UPPER_FLOOR, mats, collection, parent, interior, 0.0)
        stone_wall(name + "Upper", a, b, height, mats, collection, upper, interior, UPPER_FLOOR)
        return None
    ax, ay = a
    bx, by = b
    length = math.hypot(bx - ax, by - ay)
    angle = math.atan2(by - ay, bx - ax)
    g = B.empty(name, collection, parent, ((ax + bx) / 2, (ay + by) / 2, 0))
    g.rotation_euler.z = angle
    box(name + "_Plaster", (0, 0, (z0 + height) / 2), (length, .26, height - z0), mats["stone"], collection, g)
    local_plus_y = (-math.sin(angle), math.cos(angle))
    to_interior = (interior[0] - (ax + bx) / 2, interior[1] - (ay + by) / 2)
    plus_inside = (local_plus_y[0] * to_interior[0] + local_plus_y[1] * to_interior[1]) > 0
    sign = -1 if plus_inside else 1
    z, row = z0 + .22, int(round(z0 / .45))
    while z < height - .12:
        cursor = -length / 2 + (.30 if row % 2 else .04)
        index = 0
        while cursor < length / 2 - .10:
            width = min(V1.RNG.uniform(.62, 1.15), length / 2 - cursor)
            key = "stone_light" if (row + index) % 5 == 0 else ("stone_dark" if (row * 7 + index) % 11 == 0 else "stone")
            box(f"{name}_Stone_{row}_{index}", (cursor + width / 2, sign * .265, z + V1.RNG.uniform(-.012, .012)),
                (max(.22, width - .06), .18, .40), mats[key], collection, g,
                rotation=(0, V1.RNG.uniform(-.01, .01), V1.RNG.uniform(-.015, .015)))
            cursor += width
            index += 1
        z += .45
        row += 1
    if z0 < UPPER_FLOOR:
        box(name + "_StringCourse", (0, sign * .31, UPPER_FLOOR - .08), (length, .24, .18), mats["stone_light"], collection, g)
    else:
        box(name + "_Cornice", (0, sign * .33, height - .10), (length, .28, .20), mats["stone_light"], collection, g)
    return g


def stone_over_door(name, hinge, width, rotation, wall_h, mats, collection, parent, upper=None):
    co, si = math.cos(rotation), math.sin(rotation)
    cx, cy = hinge[0] + co * width / 2, hinge[1] + si * width / 2
    fill_h = UPPER_FLOOR - 3.39
    box(name + "_OverDoor", (cx, cy, 3.39 + fill_h / 2), (width + .58, .26, fill_h), mats["stone"], collection, parent,
        rotation=(0, 0, rotation))
    if upper is not None:
        box(name + "_OverDoorUpper", (cx, cy, (UPPER_FLOOR + wall_h) / 2), (width + .58, .26, wall_h - UPPER_FLOOR), mats["stone"],
            collection, upper, rotation=(0, 0, rotation))
    box(name + "_OverDoorArch", (cx, cy, 3.30), (width + .70, .40, .30), mats["stone_light"], collection, parent,
        rotation=(0, 0, rotation))
    for k in range(2):
        box(f"{name}_OverDoorCourse_{k}", (cx, cy, 3.75 + k * .45), (width + .40, .36, .40), mats["stone_dark" if k else "stone"],
            collection, parent, rotation=(0, 0, rotation))


def floors(static, mats, collection):
    box("TowerSlab", ((TX0 + TX1) / 2, (TY0 + TY1) / 2, .06), (TX1 - TX0, TY1 - TY0, .12), mats["flag"], collection, static)
    for row in range(6):
        for col in range(6):
            if (row + col) % 2:
                box(f"TowerFlag_{row}_{col}", (TX0 + .5 + col, TY0 + .5 + row, .125), (.86, .86, .02), mats["flag_light"],
                    collection, static)
    box("WingSlab", ((TX1 + WX1) / 2, (WY0 + WY1) / 2, .06), (WX1 - TX1, WY1 - WY0, .12), mats["wood"], collection, static)
    for k, y in enumerate([WY0 + .45 + n * .82 for n in range(6)]):
        box(f"WingSeam_{k}", ((TX1 + WX1) / 2, y, .125), (WX1 - TX1 - .3, .035, .018), mats["timber"], collection, static)
    # Casting circle inlaid in the flagstones with eight rune stones.
    cyl("CastingRing", (CIRCLE_C[0], CIRCLE_C[1], .13), 1.65, .02, 16, mats["rune_blue"], collection, static)
    cyl("CastingRingInner", (CIRCLE_C[0], CIRCLE_C[1], .135), 1.45, .02, 16, mats["flag_light"], collection, static)
    for k in range(8):
        a = math.radians(k * 45 + 22.5)
        box(f"RuneStone_{k}", (CIRCLE_C[0] + math.cos(a) * 1.15, CIRCLE_C[1] + math.sin(a) * 1.15, .16), (.22, .22, .04),
            mats["rune_glow" if k % 2 else "rune_blue"], collection, static, rotation=(0, 0, a))
    box("WestStep", (TX0 - .55, WEST_HINGE[1] + WEST_W / 2, -.02), (.9, WEST_W + .9, .16), mats["stone_light"], collection, static)
    box("SouthStep", (SOUTH_HINGE[0] + SOUTH_W / 2, TY0 - .55, -.02), (SOUTH_W + .9, .9, .16), mats["stone_light"], collection, static)


def shell(static, root, roof, mats, collection):
    tower_in, wing_in = (-2.0, 0.0), (3.0, 0.5)
    # Tower (stone, two storeys).
    stone_wall("TowerSouthW", (TX0, TY0), (SOUTH_HINGE[0], TY0), TOWER_H, mats, collection, static, tower_in, upper=roof)
    stone_wall("TowerSouthE", (SOUTH_HINGE[0] + SOUTH_W, TY0), (TX1, TY0), TOWER_H, mats, collection, static, tower_in, upper=roof)
    stone_wall("TowerEastS", (TX1, TY0), (TX1, ARCH[0]), TOWER_H, mats, collection, static, tower_in, upper=roof)
    stone_wall("TowerEastN", (TX1, ARCH[1]), (TX1, TY1), TOWER_H, mats, collection, static, tower_in, upper=roof)
    stone_wall("TowerNorth", (TX1, TY1), (TX0, TY1), TOWER_H, mats, collection, static, tower_in, upper=roof)
    stone_wall("TowerWestN", (TX0, TY1), (TX0, WEST_HINGE[1] + WEST_W), TOWER_H, mats, collection, static, tower_in, upper=roof)
    stone_wall("TowerWestS", (TX0, WEST_HINGE[1]), (TX0, TY0), TOWER_H, mats, collection, static, tower_in, upper=roof)
    # Arch head over the partition opening (the gap itself stays two tiles wide).
    box("ArchLintel", (TX1, (ARCH[0] + ARCH[1]) / 2, 3.2), (.36, ARCH[1] - ARCH[0] + .5, .34), mats["stone_light"], collection, static)
    box("ArchFill", (TX1, (ARCH[0] + ARCH[1]) / 2, (3.37 + UPPER_FLOOR) / 2), (.26, ARCH[1] - ARCH[0] + .1, UPPER_FLOOR - 3.37),
        mats["stone"], collection, static)
    box("ArchFillUpper", (TX1, (ARCH[0] + ARCH[1]) / 2, (UPPER_FLOOR + TOWER_H) / 2), (.26, ARCH[1] - ARCH[0] + .1, TOWER_H - UPPER_FLOOR),
        mats["stone"], collection, roof)
    for y in (ARCH[0] - .12, ARCH[1] + .12):
        box("ArchJamb", (TX1, y, 1.6), (.32, .24, 3.2), mats["stone_light"], collection, static)
    # Corner quoins.
    for cx, cy in ((TX0, TY0), (TX1, TY0), (TX1, TY1), (TX0, TY1)):
        for k in range(9):
            box(f"Quoin_{k}", (cx, cy, .35 + k * .82), (.46 if k % 2 else .34, .34 if k % 2 else .46, .40), mats["stone_light"],
                collection, static if .35 + k * .82 < UPPER_FLOOR else roof)
    # Scriptorium wing (timber family).
    wall("WingSouth", (TX1, WY0), (WX1, WY0), WING_H, mats, collection, static, wing_in, start_inset=.2)
    wall("WingEast", (WX1, WY0), (WX1, WY1), WING_H, mats, collection, static, wing_in)
    wall("WingNorth", (WX1, WY1), (TX1, WY1), WING_H, mats, collection, static, wing_in, end_inset=.2)

    V1.door_frame("WestFrame", WEST_HINGE, WEST_W, math.pi / 2, mats, collection, static)
    V1.door_frame("SouthFrame", SOUTH_HINGE, SOUTH_W, 0, mats, collection, static)
    stone_over_door("WestDoor", WEST_HINGE, WEST_W, math.pi / 2, TOWER_H, mats, collection, static, upper=roof)
    stone_over_door("SouthDoor", SOUTH_HINGE, SOUTH_W, 0, TOWER_H, mats, collection, static, upper=roof)
    V1.door_leaf("west_door", WEST_HINGE, WEST_W, math.pi / 2, mats, collection, root)
    V1.door_leaf("south_door", SOUTH_HINGE, SOUTH_W, 0, mats, collection, root)

    # Ground-floor arrow slits and upper-study shuttered windows.
    shuttered_window("SouthSlit", -0.2, TY0 - .05, 0, mats, collection, static, sill=1.9, h=1.1, w=.5)
    shuttered_window("NorthSlitW", -3.6, TY1 + .05, math.pi, mats, collection, static, sill=1.9, h=1.1, w=.5)
    shuttered_window("WestSlit", TX0 - .05, 2.0, math.pi / 2, mats, collection, static, sill=1.9, h=1.1, w=.5)
    shuttered_window("UpperSouth", -2.0, TY0 - .05, 0, mats, collection, roof, sill=5.3, h=1.3, w=1.15)
    shuttered_window("UpperWest", TX0 - .05, 0.0, math.pi / 2, mats, collection, roof, sill=5.3, h=1.3, w=1.15)
    shuttered_window("UpperNorth", -2.0, TY1 + .05, math.pi, mats, collection, roof, sill=5.3, h=1.3, w=1.15)
    shuttered_window("UpperEast", TX1 + .05, 0.0, -math.pi / 2, mats, collection, roof, sill=5.6, h=1.1, w=.9)
    shuttered_window("WingEastWindow", WX1 + .05, 1.5, -math.pi / 2, mats, collection, static, sill=1.3, h=1.1, w=1.15)
    shuttered_window("WingSouthWindow", 3.0, WY0 - .05, 0, mats, collection, static, sill=1.3, h=1.1, w=1.15)
    for name in ("WingEast_Brace_1", "WingSouth_Brace_0"):
        obj = bpy.data.objects.get(name)
        if obj is not None:
            bpy.data.objects.remove(obj, do_unlink=True)
    for k, y in enumerate((-1.2, 1.2)):
        box(f"WingBeam_{k}", ((TX1 + WX1) / 2, y, WING_H - .28), (WX1 - TX1 - .2, .26, .30), mats["timber"], collection, static)


def tower_roof(roof, mats, collection):
    """Upper study floor, its dressing, and the pyramid spire; all cut away together."""
    # Upper floor slab with the stair hatch in the north-west corner.
    box("UpperFloor", ((TX0 + TX1) / 2, (TY0 + TY1) / 2, UPPER_FLOOR), (TX1 - TX0 - .2, TY1 - TY0 - .2, .16), mats["wood"],
        collection, roof)
    box("UpperHatch", (STAIR[0], STAIR[1], UPPER_FLOOR + .09), (1.3, 1.3, .04), mats["dark_hole"], collection, roof)
    for k, x in enumerate((-4.2, -2.6, -1.0, 0.6)):
        box(f"UpperJoist_{k}", (x, 0, UPPER_FLOOR - .16), (.18, TY1 - TY0 - .3, .18), mats["timber"], collection, roof)
    box("UpperRail", (STAIR[0] + .75, STAIR[1] - .2, UPPER_FLOOR + .55), (.06, 1.6, .9), mats["timber"], collection, roof)
    # Upper study dressing: a desk under the south window, a star chart, two chests.
    box("StudyDesk", (-2.0, TY0 + .7, UPPER_FLOOR + .5), (1.6, .7, .08), mats["wood"], collection, roof)
    for x in (-2.7, -1.3):
        box("StudyDeskLeg", (x, TY0 + .7, UPPER_FLOOR + .25), (.1, .6, .42), mats["timber"], collection, roof)
    box("StudyChart", (-2.0, TY1 - .16, UPPER_FLOOR + 1.6), (1.4, .04, 1.0), mats["parchment"], collection, roof)
    for k in range(5):
        box(f"StudyChartStar_{k}", (-2.5 + k * .25, TY1 - .19, UPPER_FLOOR + 1.35 + (k % 3) * .2), (.08, .02, .08),
            mats["brass_bright"], collection, roof)
    for k, x in enumerate((-0.2, 0.4)):
        box(f"StudyChest_{k}", (x, TY0 + .6, UPPER_FLOOR + .32), (.5, .4, .4), mats["timber"], collection, roof)
    # Pyramid spire.
    pts = [(TX0 - .5, TY0 - .5), (TX1 + .5, TY0 - .5), (TX1 + .5, TY1 + .5), (TX0 - .5, TY1 + .5)]
    eave, peak = TOWER_H + .14, 11.6
    cx, cy = (TX0 + TX1) / 2, (TY0 + TY1) / 2
    top = [(cx + (x - cx) * .08, cy + (y - cy) * .08, peak) for x, y in pts]
    verts = [(x, y, eave) for x, y in pts] + top + [(x, y, eave - .18) for x, y in pts]
    n = 4
    faces = [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    faces.append(tuple(range(n, 2 * n)))
    faces += [(i, (i + 1) % n, (i + 1) % n + 2 * n, i + 2 * n) for i in range(n)]
    faces.append(tuple(range(2 * n, 3 * n)))
    solid("SpireSolid", verts, faces, [mats["slate_dark"]], collection, roof)
    count = 0
    for i in range(n):
        a, b = pts[i], pts[(i + 1) % n]
        ta, tb = top[i], top[(i + 1) % n]
        length = math.hypot(b[0] - a[0], b[1] - a[1])
        ang = math.atan2(b[1] - a[1], b[0] - a[0])
        box(f"SpireFascia_{i}", ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, eave - .06), (length + .1, .18, .22), mats["timber"],
            collection, roof, rotation=(0, 0, ang))
        for k in range(7):
            t0, t1 = k / 7, (k + 1) / 7
            ax, ay = a[0] + (ta[0] - a[0]) * (t0 + t1) / 2, a[1] + (ta[1] - a[1]) * (t0 + t1) / 2
            bx, by = b[0] + (tb[0] - b[0]) * (t0 + t1) / 2, b[1] + (tb[1] - b[1]) * (t0 + t1) / 2
            z = eave + (peak - eave) * (t0 + t1) / 2 + .05
            mid_e = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
            mid_t = ((ta[0] + tb[0]) / 2, (ta[1] + tb[1]) / 2)
            run = math.hypot(mid_t[0] - mid_e[0], mid_t[1] - mid_e[1])
            tilt = math.atan2(peak - eave, max(.05, run))
            box(f"SpireCourse_{i}_{k}", ((ax + bx) / 2, (ay + by) / 2, z), (math.hypot(bx - ax, by - ay) * .92, .42, .06),
                mats["roof_light" if (i + k) % 5 == 0 else "slate_dark"], collection, roof, rotation=(tilt, 0, ang))
            count += 1
    # Crescent-and-star finial.
    cyl("FinialSpike", (cx, cy, peak + .45), .05, .9, 6, mats["iron"], collection, roof)
    cyl("FinialOrb", (cx, cy, peak + .95), .22, .3, 8, mats["brass_bright"], collection, roof)
    for k in range(7):
        a = math.radians(-60 + k * 30)
        box(f"FinialCrescent_{k}", (cx + math.cos(a) * .42, cy, peak + 1.35 + math.sin(a) * .42), (.16, .06, .12),
            mats["brass_bright"], collection, roof, rotation=(0, -a, 0))
    # Four small dormer slits for the spire.
    for i, (dx, dy, rot) in enumerate(((0, -1, 0), (1, 0, math.pi / 2), (0, 1, math.pi), (-1, 0, -math.pi / 2))):
        box(f"SpireDormer_{i}", (cx + dx * 2.2, cy + dy * 2.2, eave + 1.1), (.7, .5, .9), mats["stone"], collection, roof,
            rotation=(0, 0, rot))
        box(f"SpireDormerSlit_{i}", (cx + dx * 2.45, cy + dy * 2.45, eave + 1.15), (.2, .08, .5), mats["chalk"], collection, roof,
            rotation=(0, 0, rot))
    return count


def wing_roof(roof, mats, collection):
    high_x, low_x = TX1 + .05, WX1 + .55
    high_z, low_z = WING_H + 1.15, WING_H + .12
    y0, y1 = WY0 - .5, WY1 + .5
    span, rise = low_x - high_x, high_z - low_z
    angle = math.atan2(rise, span)
    slope = math.hypot(span, rise)
    box("WingRoofBase", ((high_x + low_x) / 2, (y0 + y1) / 2, (high_z + low_z) / 2), (slope + .16, y1 - y0, .15), mats["roof"],
        collection, roof, rotation=(0, angle, 0))
    count = 0
    for row, y in enumerate([y0 + .45 + n * ((y1 - y0 - .9) / 5) for n in range(6)]):
        for col in range(4):
            t = (col + .5) / 4
            x = high_x + span * t
            z = high_z - rise * t + .09
            box(f"WingTile_{row}_{col}", (x, y, z), (slope / 4 * 1.08, .86, .08),
                mats["roof_light" if (row + col) % 5 == 0 else ("roof_moss" if (row * 3 + col) % 13 == 0 else "roof")],
                collection, roof, rotation=(0, angle, 0))
            count += 1
    box("WingEave", (low_x + .04, (y0 + y1) / 2, low_z - .02), (.18, y1 - y0 + .1, .20), mats["timber"], collection, roof)
    for y in (y0 + .1, y1 - .1):
        gv = [(high_x, y - .06, WING_H - .05), (low_x, y - .06, WING_H - .05), (high_x, y - .06, high_z - .2),
              (high_x, y + .06, WING_H - .05), (low_x, y + .06, WING_H - .05), (high_x, y + .06, high_z - .2)]
        solid("WingGable", gv, [(0, 1, 2), (3, 5, 4), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)], [mats["plaster"]], collection, roof)
    return count


# --- hero and support objects ------------------------------------------------------------
def rune_table(root, mats, collection):
    """The rune table: a velvet-draped table with air and mind runes, a candle and an open primer."""
    g = B.empty("rune_table", collection, root, (TABLE[0], TABLE[1], 0))
    box("TableTop", (0, 0, .92), (2.0, .62, .08), mats["wood"], collection, g)
    box("TableCloth", (0, 0, .88), (1.7, .58, .02), mats["velvet"], collection, g)
    box("TableClothTrim", (0, -.3, .78), (1.7, .02, .2), mats["velvet_gold"], collection, g)
    for x in (-.85, .85):
        for y in (-.22, .22):
            box("TableLeg", (x, y, .46), (.1, .1, .9), mats["timber"], collection, g)
    for k in range(4):
        box(f"AirRune_{k}", (-.7 + k * .14, .12, .99), (.11, .11, .05), mats["chalk"], collection, g, rotation=(0, 0, .2 * k))
        box(f"MindRune_{k}", (.25 + k * .14, -.1, .99), (.11, .11, .05), mats["rune_blue"], collection, g, rotation=(0, 0, .3 * k))
    box("TablePrimer", (.55, .14, 1.0), (.5, .36, .07), mats["parchment"], collection, g)
    box("TablePrimerSpine", (.55, .14, 1.0), (.03, .36, .09), mats["ink"], collection, g)
    for k in range(3):
        box(f"TablePrimerLine_{k}", (.45 + (k % 2) * .18, .0 + k * .1, 1.04), (.16, .02, .01), mats["ink"], collection, g)
    cyl("TableCandle", (-.2, -.15, 1.08), .04, .24, 6, mats["candle"], collection, g)
    cyl("TableCandleFlame", (-.2, -.15, 1.26), .03, .1, 6, mats["flame"], collection, g)
    cyl("TableOrb", (-.05, .2, 1.1), .12, .22, 8, mats["rune_glow"], collection, g)
    return g


def spell_lectern(root, mats, collection):
    g = B.empty("spell_lectern", collection, root, (LECTERN[0], LECTERN[1], 0))
    g.rotation_euler.z = math.pi
    cyl("LecternPost", (0, 0, .55), .09, 1.1, 8, mats["timber"], collection, g)
    box("LecternFoot", (0, 0, .05), (.6, .6, .1), mats["timber"], collection, g)
    box("LecternDesk", (0, -.12, 1.18), (.7, .55, .06), mats["wood"], collection, g, rotation=(-.5, 0, 0))
    box("LecternBook", (0, -.14, 1.24), (.52, .42, .05), mats["parchment"], collection, g, rotation=(-.5, 0, 0))
    box("LecternBookSpine", (0, -.14, 1.25), (.03, .42, .07), mats["book_blue"], collection, g, rotation=(-.5, 0, 0))
    for k in range(3):
        box(f"LecternGlyph_{k}", (-.14 + k * .14, -.08 - k * .04, 1.27 + k * .02), (.08, .08, .01), mats["rune_blue"],
            collection, g, rotation=(-.5, 0, 0))
    box("LecternLedge", (0, -.36, 1.03), (.7, .06, .06), mats["timber"], collection, g)
    return g


def tower_register(root, mats, collection):
    g = B.empty("tower_register", collection, root, (REGISTER[0], REGISTER[1], 0))
    g.rotation_euler.z = math.pi
    box("RegisterFrame", (0, 0, 1.95), (1.3, .12, 1.0), mats["timber"], collection, g)
    box("RegisterPlate", (0, .03, 1.95), (1.14, .1, .84), mats["parchment"], collection, g)
    for k in range(5):
        box(f"RegisterLine_{k}", (0, .09, 2.25 - k * .14), (.8 - (k % 2) * .25, .01, .03), mats["ink"], collection, g)
    box("RegisterSeal", (.42, .09, 2.22), (.16, .01, .16), mats["rune_blue"], collection, g)
    return g


def bookshelf(root, mats, collection):
    g = B.empty("bookshelf", collection, root, (SHELF[0], SHELF[1], 0))
    box("ShelfBack", (0, -.2, 1.1), (2.4, .08, 2.2), mats["timber"], collection, g)
    for k, z in enumerate((.3, .95, 1.6)):
        box(f"ShelfBoard_{k}", (0, 0, z), (2.4, .5, .06), mats["wood"], collection, g)
        cursor = -1.1
        idx = 0
        while cursor < 1.05:
            w = V1.RNG.uniform(.09, .16)
            h = V1.RNG.uniform(.36, .52)
            key = ("book_red", "book_green", "book_blue", "parchment")[(k * 3 + idx) % 4]
            box(f"ShelfBook_{k}_{idx}", (cursor + w / 2, 0, z + .03 + h / 2), (w, .4, h), mats[key], collection, g)
            cursor += w + .02
            idx += 1
    for x in (-1.2, 1.2):
        box("ShelfSide", (x, 0, 1.1), (.08, .52, 2.2), mats["timber"], collection, g)
    return g


def orrery(root, mats, collection):
    g = B.empty("orrery", collection, root, (ORRERY[0], ORRERY[1], 0))
    cyl("OrreryStand", (0, 0, .45), .1, .9, 8, mats["timber"], collection, g)
    cyl("OrreryFoot", (0, 0, .05), .32, .1, 8, mats["iron"], collection, g)
    cyl("OrrerySun", (0, 0, 1.05), .1, .2, 8, mats["brass_bright"], collection, g)
    for k, (r, tilt) in enumerate(((.22, .3), (.34, -.2), (.44, .5))):
        cyl(f"OrreryRing_{k}", (0, 0, 1.05), r, .02, 16, mats["brass"], collection, g, rotation=(tilt, 0, k * .7))
        box(f"OrreryPlanet_{k}", (r, 0, 1.05), (.07, .07, .07), mats["rune_blue" if k % 2 else "brass_bright"], collection, g)
    return g


def spiral_stair(root, mats, collection):
    g = B.empty("spiral_stair", collection, root, (STAIR[0], STAIR[1], 0))
    cyl("StairPost", (0, 0, 2.0), .12, 4.0, 8, mats["timber"], collection, g)
    for k in range(13):
        a = math.radians(k * 28)
        z = .18 + k * .29
        box(f"StairStep_{k}", (math.cos(a) * .42, math.sin(a) * .42, z), (.9, .38, .07), mats["wood"], collection, g,
            rotation=(0, 0, a))
        cyl(f"StairBaluster_{k}", (math.cos(a) * .8, math.sin(a) * .8, z + .45), .025, .9, 6, mats["iron"], collection, g)
    box("StairSign", (.5, -.85, 1.25), (.6, .04, .28), mats["wood_light"], collection, g)
    return g


def socket(root, collection):
    B.empty("casting_socket", collection, root, (SOCKET[0], SOCKET[1], 0))


def support_dressing(static, mats, collection):
    # Tower: wall sconces, a hanging banner, a stack of scrolls, a wall map.
    for k, (x, y) in enumerate(((TX0 + .2, -2.0), (TX1 - .2, 1.5))):
        box(f"Sconce_{k}", (x, y, 2.3), (.14, .14, .3), mats["iron"], collection, static)
        cyl(f"SconceFlame_{k}", (x, y, 2.55), .06, .16, 6, mats["flame"], collection, static)
    box("TowerBanner", (-2.0, TY1 - .2, 2.9), (.8, .05, 1.6), mats["velvet"], collection, static)
    box("TowerBannerStar", (-2.0, TY1 - .24, 2.9), (.34, .03, .34), mats["velvet_gold"], collection, static, rotation=(0, .78, 0))
    box("TowerBannerRod", (-2.0, TY1 - .2, 3.75), (1.0, .08, .08), mats["timber"], collection, static)
    for k in range(3):
        cyl(f"Scroll_{k}", (-0.2 + k * .12, 2.6 - (k % 2) * .1, .22 + (k // 2) * .1), .05, .5, 6, mats["parchment"], collection, static,
            rotation=(0, math.pi / 2, .2 * k))
    box("WingMap", (WX1 - .18, 0.2, 2.3), (.04, 1.2, .9), mats["parchment"], collection, static)
    box("WingMapCoast", (WX1 - .2, 0.2, 2.3), (.02, .8, .5), mats["book_green"], collection, static)
    box("WingStool", (4.45, -1.55, .25), (.4, .4, .5), mats["wood"], collection, static)
    cyl("WingInkpot", (4.45, -1.55, .55), .06, .1, 6, mats["ink"], collection, static)
    box("HearthStone", (TX1 - .5, TY0 + .6, .01), (.9, .9, .02), mats["stone_dark"], collection, static)


# --- assembly ----------------------------------------------------------------------------
SEMANTIC = ("roof", "west_door", "south_door", "rune_table", "spell_lectern", "tower_register", "bookshelf", "orrery",
            "spiral_stair", "casting_socket")


def create_building():
    mats = materials()
    collection = bpy.data.collections.new("MageTower_HandAuthoredV1")
    bpy.context.scene.collection.children.link(collection)
    root = B.empty("holm_mage_tower_v1", collection)
    root["buildingDefId"] = "holm_mage_tower_v1"
    root["assetId"] = "holm_mage_tower"
    root["revision"] = 1
    root["pipelineVersion"] = 1
    root["assetClass"] = "building"
    root["unitsPerTile"] = 1
    root["artDirection"] = "guide-hall-anchor-family-mage-tower"
    static = B.empty("static_architecture", collection, root)
    roof = B.empty("roof", collection, root)
    mark("floors"); floors(static, mats, collection)
    mark("shell"); shell(static, root, roof, mats, collection)
    mark("furnishings")
    rune_table(root, mats, collection)
    spell_lectern(root, mats, collection)
    tower_register(root, mats, collection)
    bookshelf(root, mats, collection)
    orrery(root, mats, collection)
    spiral_stair(root, mats, collection)
    socket(root, collection)
    support_dressing(static, mats, collection)
    mark("roof")
    tiles = tower_roof(roof, mats, collection) + wing_roof(roof, mats, collection)
    return root, static, roof, collection, mats, tiles


def authoring_report(root, tiles):
    names = {obj.name for obj in B.descendants(root)}
    checks = {
        "stoneTowerAndTimberWingAuthored": all(n in names for n in ("TowerNorth", "TowerWestN", "WingEast", "WingNorth")),
        "twoStoreysAuthored": all(n in names for n in ("UpperFloor", "UpperHatch", "UpperSouth_Frame", "StudyDesk", "TowerNorthUpper_Plaster")),
        "twoRoofMassesAuthored": all(n in names for n in ("SpireSolid", "WingRoofBase", "WingGable", "FinialOrb")),
        "fittedFullFrameDoorsAuthored": sum("_Plank_" in n for n in names) >= 12 and "WestFrame_Lintel" in names and
                                          "SouthFrame_Lintel" in names and "WestDoor_OverDoor" in names and "SouthDoor_OverDoor" in names,
        "ashlarCoursesAuthored": sum("_Stone_" in n for n in names) >= 160 and sum("Quoin_" in n for n in names) >= 30,
        "loadBearingTimberBaysAuthored": sum("_Brace_" in n for n in names) >= 2,
        "layeredRoofCoursesAuthored": tiles >= 40,
        "castingHallAuthored": all(n in names for n in ("CastingRing", "RuneStone_0", "TableTop", "AirRune_0", "MindRune_0", "StairPost")),
        "scriptoriumAuthored": all(n in names for n in ("LecternBook", "RegisterPlate", "ShelfBoard_0", "OrrerySun")),
        "semanticNodesPreserved": all(n in names for n in SEMANTIC),
    }
    report = {
        "asset": "holm_mage_tower_v1", "pipelineVersion": 1, "unitsPerTile": 1, "checks": checks,
        "visualLanguage": "Guide Hall anchor family; two-storey stone tower with pyramid spire and timber scriptorium wing",
        "roofCourses": tiles,
        "humanScaleContract": {
            "playerVisualHeight": PLAYER_VISUAL_H, "doorOpeningHeight": DOOR_OPENING_H,
            "runeTableHeight": 0.96, "lecternDeskHeight": 1.18, "upperFloorHeight": UPPER_FLOOR,
            "towerWallHeight": TOWER_H, "wingWallHeight": WING_H, "spirePeakHeight": 11.6,
        },
        "metrics": V1.metrics(root),
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    if not all(checks.values()):
        raise RuntimeError("Mage Tower authoring checks failed: " + ", ".join(n for n, ok in checks.items() if not ok))
    return report


def render_export(root, roof, collection, mats):
    scene = bpy.context.scene
    cam = K.setup_preview(mats)
    cam.location = (20, -22, 20)
    cam.data.ortho_scale = 26.0
    V1.look_at(cam, (0, 0, 4.0))
    scene.render.filepath = str(PREVIEW / "mage_tower_v1_exterior.png")
    bpy.ops.render.render(write_still=True)
    B.set_render_hidden(roof, True)
    scene.render.filepath = str(PREVIEW / "mage_tower_v1_roof_off.png")
    bpy.ops.render.render(write_still=True)
    cam.location = (0, -0.001, 31); V1.look_at(cam, (0, 0, 0)); cam.data.ortho_scale = 16.0
    scene.render.filepath = str(PREVIEW / "mage_tower_v1_plan.png")
    bpy.ops.render.render(write_still=True)
    B.set_render_hidden(roof, False)
    cam.location = (-18, -20, 18); cam.data.ortho_scale = 28.0; V1.look_at(cam, (0, 0, 3.5))
    scene.render.filepath = str(PREVIEW / "mage_tower_v1_game_camera.png")
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
    print("MAGE_TOWER_V1_READY", MODEL)


if __name__ == "__main__":
    main()
