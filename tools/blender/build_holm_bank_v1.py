"""Build the Tutor's Holm Bank surface asset (v1).

Warden's Ridge's banking service. A gabled banking hall on the road corner:
the front door opens onto the ridge road, a long teller counter with two brass
grilles divides the customer hall from the vault, a staff gap at the counter's
east end leads to the vault where the Holm bank chest (a separate chunk object)
and the ledger desk stand, and a half-octagonal waiting bay on the west wall
holds the bench. An east staff door continues toward the Combat Hall.

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
SOURCE = ROOT / "assets" / "blender" / "holm_bank_v1.blend"
MODEL = ROOT / "assets" / "models" / "buildings" / "holm_bank_v1.glb"
PREVIEW = ROOT / "scratchpad" / "holm_bank_v1"
REPORT = PREVIEW / "asset_report.json"
PROGRESS = PREVIEW / "build_progress.txt"
for path in (SOURCE.parent, MODEL.parent, PREVIEW):
    path.mkdir(parents=True, exist_ok=True)

V1.RNG = random.Random(260912)
V1.APPLY_BEVEL = False

# --- plan (Blender x/y; game z = -y) -----------------------------------------------
HALL_H, BAY_H = 4.4, 3.4
X0, X1, Y0, Y1 = -5.0, 5.0, -4.0, 4.0
COUNTER_Y = 0.0                                 # counter line (game z 0); vault is +y (game -z)
COUNTER_X0, COUNTER_X1 = -5.0, 2.5              # staff gap x 2.5..5 (two tiles; one clear tile centre)
FRONT_HINGE = (-0.5, Y0)                        # south door, leaf +x; opening x 0.5 (game 157.5)
FRONT_W = 2.0
EAST_HINGE = (X1, -1.5)                         # east door, leaf toward -y (game +z); opening game z 2.5 (118.5)
EAST_W = 2.0
BAY_C = (X0, -2.0)                              # waiting bay on the west wall (game z 2.0)
BAY_R = 1.8
BAY_PTS = [(BAY_C[0] + math.cos(math.radians(a)) * BAY_R, BAY_C[1] + math.sin(math.radians(a)) * BAY_R)
           for a in (-90, -135, 180, 135, 90)]
PLAYER_VISUAL_H = 1.85
DOOR_OPENING_H = 3.05
box, cyl, solid, prism_solid, wall, over_door, shuttered_window = (
    K.box, K.cyl, K.solid, K.prism_solid, K.wall, K.over_door, K.shuttered_window)


def mark(stage):
    PROGRESS.write_text(stage, encoding="utf-8")
    print("HOLM_BANK_V1_STAGE", stage, flush=True)


def materials():
    mats = K.materials()
    mats.update({
        "marble": V1.material("CR Bank Marble", (.74, .72, .66)),
        "marble_dark": V1.material("CR Bank Marble Dark", (.46, .44, .40)),
        "walnut": V1.material("CR Bank Walnut", (.30, .17, .09)),
        "walnut_light": V1.material("CR Bank Walnut Light", (.46, .28, .15)),
        "gold": V1.material("CR Bank Gold", (.86, .66, .22), .45, .6),
        "coin": V1.material("CR Bank Coin", (.92, .74, .28), .4, .7),
        "ledger": V1.material("CR Bank Ledger", (.28, .14, .12)),
        "paper": V1.material("CR Bank Paper", (.88, .84, .70)),
        "velvet": V1.material("CR Bank Velvet", (.36, .10, .14)),
        "lamp_glass": V1.material("CR Bank Lamp Glass", (.98, .80, .42), .5, 0, 1.6),
        "ink": V1.material("CR Bank Ink", (.12, .10, .14)),
        "strongbox": V1.material("CR Bank Strongbox", (.22, .24, .27), .6, .35),
    })
    return mats


# --- architecture --------------------------------------------------------------------
def floors(static, mats, collection):
    # Customer hall: chequered marble. Vault: stone flags.
    box("HallSlab", (0, (Y0 + COUNTER_Y) / 2, .06), (X1 - X0, COUNTER_Y - Y0, .12), mats["marble_dark"], collection, static)
    i = 0
    for row in range(4):
        for col in range(10):
            x = X0 + .5 + col
            y = Y0 + .5 + row
            box(f"MarbleTile_{i}", (x, y, .125), (.9, .9, .025), mats["marble" if (row + col) % 2 else "marble_dark"],
                collection, static)
            i += 1
    box("VaultSlab", (0, (COUNTER_Y + Y1) / 2, .06), (X1 - X0, Y1 - COUNTER_Y, .12), mats["flag"], collection, static)
    for row in range(4):
        for col in range(10):
            x = X0 + .5 + col
            y = COUNTER_Y + .5 + row
            if (row + col) % 3 == 0:
                box(f"VaultFlag_{row}_{col}", (x, y, .125), (.86, .86, .02), mats["flag_light"], collection, static)
    prism_solid("BayFloor", [(X0, BAY_PTS[0][1])] + BAY_PTS[1:-1] + [(X0, BAY_PTS[-1][1])], 0.0, .13, mats["marble"],
                collection, static)
    box("FrontStep", (FRONT_HINGE[0] + FRONT_W / 2, Y0 - .55, -.02), (FRONT_W + .9, .9, .16), mats["stone_light"], collection, static)
    box("FrontStepUpper", (FRONT_HINGE[0] + FRONT_W / 2, Y0 - .3, .04), (FRONT_W + .5, .5, .12), mats["marble"], collection, static)
    box("EastStep", (X1 + .55, EAST_HINGE[1] - EAST_W / 2, -.02), (.9, EAST_W + .9, .16), mats["stone_light"], collection, static)


def shell(static, root, mats, collection):
    hall_in, bay_in = (0.0, -2.0), (-5.8, -2.2)
    wall("SouthWallW", (X0, Y0), (FRONT_HINGE[0], Y0), HALL_H, mats, collection, static, hall_in, end_inset=.35)
    wall("SouthWallE", (FRONT_HINGE[0] + FRONT_W, Y0), (X1, Y0), HALL_H, mats, collection, static, hall_in, start_inset=.35)
    wall("EastWallS", (X1, Y0), (X1, EAST_HINGE[1] - EAST_W), HALL_H, mats, collection, static, hall_in, detail=False)
    wall("EastWallN", (X1, EAST_HINGE[1]), (X1, Y1), HALL_H, mats, collection, static, hall_in, start_inset=.35)
    wall("NorthWall", (X1, Y1), (X0, Y1), HALL_H, mats, collection, static, hall_in)
    wall("WestWallN", (X0, Y1), (X0, BAY_PTS[-1][1]), HALL_H, mats, collection, static, hall_in)
    for i in range(len(BAY_PTS) - 1):
        wall(f"BayWall_{i}", BAY_PTS[i], BAY_PTS[i + 1], BAY_H, mats, collection, static, bay_in, start_inset=.12, end_inset=.12)
    wall("WestWallS", (X0, BAY_PTS[0][1]), (X0, Y0), HALL_H, mats, collection, static, hall_in, detail=False)

    V1.door_frame("FrontFrame", FRONT_HINGE, FRONT_W, 0, mats, collection, static)
    V1.door_frame("EastFrame", EAST_HINGE, EAST_W, -math.pi / 2, mats, collection, static)
    over_door("Front", FRONT_HINGE, FRONT_W, 0, HALL_H, mats, collection, static)
    over_door("EastDoor", EAST_HINGE, EAST_W, -math.pi / 2, HALL_H, mats, collection, static)
    V1.door_leaf("front_door", FRONT_HINGE, FRONT_W, 0, mats, collection, root)
    V1.door_leaf("staff_door", EAST_HINGE, EAST_W, -math.pi / 2, mats, collection, root)
    # Bank sign over the front door.
    box("SignBoard", (FRONT_HINGE[0] + FRONT_W / 2, Y0 - .32, 3.85), (2.6, .12, .62), mats["walnut"], collection, static)
    box("SignTrim", (FRONT_HINGE[0] + FRONT_W / 2, Y0 - .34, 3.85), (2.4, .1, .46), mats["gold"], collection, static)
    box("SignCoin", (FRONT_HINGE[0] + FRONT_W / 2, Y0 - .38, 3.85), (.34, .06, .34), mats["coin"], collection, static,
        rotation=(0, 0, .78))

    shuttered_window("SouthWindowW", -3.0, Y0 - .05, 0, mats, collection, static, sill=1.25, h=1.2, w=1.2)
    shuttered_window("SouthWindowE", 3.0, Y0 - .05, 0, mats, collection, static, sill=1.25, h=1.2, w=1.2)
    shuttered_window("NorthWindowW", -2.5, Y1 + .05, math.pi, mats, collection, static, sill=2.4, h=.8, w=1.0)
    shuttered_window("NorthWindowE", 2.5, Y1 + .05, math.pi, mats, collection, static, sill=2.4, h=.8, w=1.0)
    for name in ("SouthWallW_Brace_0", "SouthWallE_Brace_0", "NorthWall_Brace_0", "NorthWall_Brace_2"):
        obj = bpy.data.objects.get(name)
        if obj is None:
            raise RuntimeError("expected window-bay brace is missing: " + name)
        bpy.data.objects.remove(obj, do_unlink=True)
    for k, y in enumerate((-2.6, 0.0, 2.6)):
        box(f"HallBeam_{k}", (0, y, HALL_H - .28), (X1 - X0 - .2, .26, .30), mats["timber"], collection, static)
    # Iron vault grille above the counter: the hall reads as a bank, not a house.
    for k in range(9):
        box(f"GrilleBar_{k}", (COUNTER_X0 + .5 + k * .9, COUNTER_Y, 2.85), (.05, .05, 2.3), mats["iron"], collection, static)
    box("GrilleRail", ((COUNTER_X0 + COUNTER_X1) / 2, COUNTER_Y, 3.95), (COUNTER_X1 - COUNTER_X0, .07, .07), mats["iron"], collection, static)
    box("GrilleRailLow", ((COUNTER_X0 + COUNTER_X1) / 2, COUNTER_Y, 1.75), (COUNTER_X1 - COUNTER_X0, .07, .07), mats["iron"], collection, static)


def hall_roof(roof, mats, collection):
    """Gable, ridge east-west, with a counting-house dormer and a stone chimney."""
    cy = 0
    half = (Y1 - Y0) / 2 + .55
    x0, x1 = X0 - .45, X1 + .45
    eave, peak = HALL_H + .10, 7.3
    rise = peak - eave
    angle = math.atan2(rise, half)
    slope = math.hypot(half, rise)
    count = 0
    rows, cols = 12, 6
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
    for x in (X0, X1):
        gv = [(x - .13, cy - wall_half, HALL_H - .05), (x - .13, cy + wall_half, HALL_H - .05), (x - .13, cy, peak - .30),
              (x + .13, cy - wall_half, HALL_H - .05), (x + .13, cy + wall_half, HALL_H - .05), (x + .13, cy, peak - .30)]
        solid("GableEnd", gv, [(0, 1, 2), (3, 5, 4), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)], [mats["plaster"]], collection, roof)
        out = -.19 if x < 0 else .19
        for side in (-1, 1):
            V1.beam(f"GableBrace_{side}", (x + out, cy + side * (wall_half - .55), HALL_H + .05), (x + out, cy, peak - .5),
                    .16, .16, mats["timber"], collection, roof, bevel=0)
    # Counting-house dormer on the south slope over the door.
    box("Dormer", (0.5, -2.2, HALL_H + 1.3), (1.9, 1.6, 1.5), mats["plaster"], collection, roof)
    box("DormerWindow", (0.5, -3.02, HALL_H + 1.35), (1.0, .1, .9), mats["chalk"], collection, roof)
    box("DormerMullion", (0.5, -3.06, HALL_H + 1.35), (.08, .12, .9), mats["timber"], collection, roof)
    box("DormerRoof", (0.5, -2.2, HALL_H + 2.15), (2.3, 2.0, .16), mats["roof_light"], collection, roof, rotation=(.55, 0, 0))
    # Stone vault chimney at the north-east corner.
    chimney = B.empty("VaultChimney", collection, roof, (3.8, 3.0, 0))
    for row in range(7):
        z = 3.6 + row * .5
        for col in range(2):
            x = -.3 + col * .6 + (.08 if row % 2 else 0)
            box(f"ChimneyStone_{row}_{col}", (x, 0, z), (.55, .8, .46), mats["stone_light" if (row + col) % 3 == 0 else "stone"],
                collection, chimney)
    box("ChimneyCap", (0, 0, 7.2), (1.2, 1.3, .16), mats["iron"], collection, chimney)
    return count


def bay_roof(roof, mats, collection):
    pts = [(X0, BAY_PTS[0][1] - .45)] + [
        (BAY_C[0] + math.cos(math.radians(a)) * (BAY_R + .5), BAY_C[1] + math.sin(math.radians(a)) * (BAY_R + .5))
        for a in (-90, -135, 180, 135, 90)] + [(X0, BAY_PTS[-1][1] + .45)]
    eave, peak = BAY_H + .12, 4.8
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
def counter(root, mats, collection):
    """The teller counter: walnut top, panelled front, two brass-grilled booths."""
    g = B.empty("bank_counter", collection, root, (0, COUNTER_Y, 0))
    length = COUNTER_X1 - COUNTER_X0
    cx = (COUNTER_X0 + COUNTER_X1) / 2
    box("CounterBody", (cx, .0, .55), (length, .8, 1.1), mats["walnut"], collection, g)
    box("CounterTop", (cx, .0, 1.14), (length + .1, .95, .08), mats["walnut_light"], collection, g)
    for k in range(6):
        box(f"CounterPanel_{k}", (COUNTER_X0 + .7 + k * 1.4, -.41, .55), (1.0, .03, .8), mats["walnut_light"], collection, g)
    box("CounterKick", (cx, -.42, .08), (length, .06, .16), mats["timber"], collection, g)
    box("CounterFlap", (COUNTER_X1 + .55, .0, 1.1), (1.0, .12, .06), mats["walnut_light"], collection, g, rotation=(0, 0, 0))
    return g


def booth(root, mats, collection, name, x):
    g = B.empty(name, collection, root, (x, COUNTER_Y, 0))
    for side in (-1, 1):
        box("BoothPost", (side * .7, 0, 2.05), (.12, .16, 1.85), mats["walnut"], collection, g)
    box("BoothHead", (0, 0, 2.95), (1.55, .18, .16), mats["walnut"], collection, g)
    for k in range(6):
        box(f"BoothBar_{k}", (-.55 + k * .22, 0, 2.05), (.035, .035, 1.7), mats["gold"], collection, g)
    box("BoothSill", (0, 0, 1.22), (1.55, .3, .08), mats["walnut_light"], collection, g)
    box("BoothTray", (0, -.2, 1.26), (.6, .3, .04), mats["velvet"], collection, g)
    for k, (dx, dy) in enumerate(((-.15, -.18), (.12, -.22), (0, -.12))):
        cyl(f"BoothCoin_{k}", (dx, dy, 1.3), .07, .04, 8, mats["coin"], collection, g)
    box("BoothLamp", (.62, .28, 3.2), (.2, .2, .28), mats["lamp_glass"], collection, g)
    box("BoothLampCap", (.62, .28, 3.37), (.26, .26, .06), mats["iron"], collection, g)
    return g


def ledger_desk(root, mats, collection):
    """The bank ledger desk in the vault: scales, ledger, ink, coin stacks."""
    g = B.empty("ledger_desk", collection, root, (-3.0, 2.5, 0))
    box("DeskTop", (0, 0, .95), (2.0, 1.0, .08), mats["walnut_light"], collection, g)
    box("DeskApron", (0, 0, .83), (1.8, .84, .16), mats["walnut"], collection, g)
    for x in (-.85, .85):
        for y in (-.38, .38):
            box("DeskLeg", (x, y, .4), (.12, .12, .8), mats["timber"], collection, g)
    box("Ledger", (-.45, .05, 1.03), (.62, .46, .08), mats["ledger"], collection, g, rotation=(0, 0, .08))
    box("LedgerPages", (-.45, .05, 1.075), (.56, .40, .02), mats["paper"], collection, g, rotation=(0, 0, .08))
    cyl("Inkwell", (.05, .3, 1.05), .06, .12, 8, mats["ink"], collection, g)
    box("Quill", (.12, .32, 1.14), (.03, .3, .02), mats["chalk"], collection, g, rotation=(0, 0, .6))
    cyl("ScalePost", (.55, -.1, 1.25), .03, .5, 6, mats["brass"], collection, g)
    box("ScaleBeam", (.55, -.1, 1.5), (.7, .04, .04), mats["brass"], collection, g)
    for side in (-1, 1):
        cyl("ScalePan", (.55 + side * .32, -.1, 1.3), .12, .02, 8, mats["brass"], collection, g)
        cyl("ScaleChain", (.55 + side * .32, -.1, 1.4), .008, .2, 4, mats["iron"], collection, g)
    for k in range(3):
        cyl(f"CoinStack_{k}", (.05 + k * .16, -.32, 1.02 + k * .01), .07, .06 + k * .03, 8, mats["coin"], collection, g)
    cyl("Stool", (0, .85, .52), .22, .06, 8, mats["wood"], collection, g)
    for k in range(3):
        cyl(f"StoolLeg_{k}", (math.cos(k * 2.09) * .15, .85 + math.sin(k * 2.09) * .15, .25), .03, .5, 6, mats["timber"], collection, g)
    return g


def founders_plaque(root, mats, collection):
    g = B.empty("founders_plaque", collection, root, (X0 + .3, -0.9, 0))
    g.rotation_euler.z = math.pi / 2
    box("PlaqueFrame", (0, 0, 1.9), (1.2, .12, .8), mats["walnut"], collection, g)
    box("PlaqueFace", (0, -.03, 1.9), (1.06, .1, .66), mats["brass"], collection, g)
    for k in range(4):
        box(f"PlaqueLine_{k}", (0, -.09, 2.1 - k * .13), (.8 - (k % 2) * .2, .01, .03), mats["ink"], collection, g)
    box("PlaqueCoin", (.36, -.09, 1.72), (.14, .01, .14), mats["coin"], collection, g, rotation=(0, 0, .78))
    return g


def waiting_bench(root, mats, collection):
    g = B.empty("waiting_bench", collection, root, (BAY_C[0] - .8, BAY_C[1], 0))
    g.rotation_euler.z = math.pi / 2
    box("BenchSeat", (0, 0, .52), (2.0, .5, .12), mats["walnut"], collection, g)
    box("BenchBack", (0, .24, .95), (2.0, .08, .7), mats["walnut"], collection, g)
    for x in (-.85, .85):
        box("BenchLeg", (x, 0, .26), (.12, .44, .52), mats["timber"], collection, g)
    box("BenchCushion", (0, -.02, .6), (1.7, .42, .06), mats["velvet"], collection, g)
    return g


def strongbox_shelf(root, mats, collection):
    g = B.empty("strongbox_shelf", collection, root, (-1.0, Y1 - .35, 0))
    for x in (-1.1, 1.1):
        box("ShelfPost", (x, 0, 1.2), (.12, .5, 2.4), mats["timber"], collection, g)
    for k, z in enumerate((.4, 1.2, 2.0)):
        box(f"ShelfBoard_{k}", (0, 0, z), (2.3, .5, .07), mats["wood"], collection, g)
        for j in range(3):
            box(f"Strongbox_{k}_{j}", (-.7 + j * .7, .02, z + .2), (.5, .38, .34), mats["strongbox"], collection, g)
            box(f"StrongboxBand_{k}_{j}", (-.7 + j * .7, .02, z + .2), (.52, .4, .06), mats["iron"], collection, g)
            box(f"StrongboxLock_{k}_{j}", (-.7 + j * .7, -.19, z + .2), (.08, .03, .1), mats["gold"], collection, g)
    return g


def support_dressing(static, mats, collection):
    # Rope-and-post queue line in the customer hall, a wall lantern, a notice.
    for k, x in enumerate((-2.0, .0, 2.0)):
        cyl(f"QueuePost_{k}", (x, -2.0, .5), .05, 1.0, 6, mats["brass"], collection, static)
        cyl(f"QueuePostBase_{k}", (x, -2.0, .04), .18, .08, 8, mats["brass"], collection, static)
    for k, x in enumerate((-1.0, 1.0)):
        box(f"QueueRope_{k}", (x, -2.0, .92), (1.9, .05, .05), mats["velvet"], collection, static, rotation=(0, 0, 0))
    box("WallLantern", (X1 - .3, -3.0, 2.6), (.24, .24, .32), mats["lamp_glass"], collection, static)
    box("WallLanternCap", (X1 - .3, -3.0, 2.8), (.3, .3, .06), mats["iron"], collection, static)
    box("RatesNotice", (X0 + .2, 1.0, 2.0), (.04, .7, .5), mats["paper"], collection, static)
    for k in range(3):
        box(f"RatesLine_{k}", (X0 + .17, 1.0, 2.15 - k * .13), (.01, .5, .03), mats["ink"], collection, static)
    # Vault dressing: coin sacks and a wall-hung key board.
    for k, (x, y) in enumerate(((1.4, 3.3), (2.0, 3.45))):
        box(f"CoinSack_{k}", (x, y, .34), (.48, .42, .68), mats["sack"], collection, static, rotation=(0, 0, .3 * k))
        box(f"CoinSackNeck_{k}", (x, y, .76), (.26, .22, .12), mats["rope"], collection, static)
    box("KeyBoard", (3.8, Y1 - .3, 1.9), (.7, .06, .5), mats["wood"], collection, static)
    for k in range(3):
        box(f"KeyHook_{k}", (3.6 + k * .2, Y1 - .34, 1.9), (.03, .03, .16), mats["iron"], collection, static)


# --- assembly ----------------------------------------------------------------------------
SEMANTIC = ("roof", "front_door", "staff_door", "bank_counter", "bank_booth_w", "bank_booth_e", "ledger_desk",
            "founders_plaque", "waiting_bench", "strongbox_shelf")


def create_building():
    mats = materials()
    collection = bpy.data.collections.new("HolmBank_HandAuthoredV1")
    bpy.context.scene.collection.children.link(collection)
    root = B.empty("holm_bank_v1", collection)
    root["buildingDefId"] = "holm_bank_v1"
    root["assetId"] = "holm_bank"
    root["revision"] = 1
    root["pipelineVersion"] = 1
    root["assetClass"] = "building"
    root["unitsPerTile"] = 1
    root["artDirection"] = "guide-hall-anchor-family-holm-bank"
    static = B.empty("static_architecture", collection, root)
    mark("floors"); floors(static, mats, collection)
    mark("shell"); shell(static, root, mats, collection)
    mark("furnishings")
    counter(root, mats, collection)
    booth(root, mats, collection, "bank_booth_w", -3.0)
    booth(root, mats, collection, "bank_booth_e", 0.0)
    ledger_desk(root, mats, collection)
    founders_plaque(root, mats, collection)
    waiting_bench(root, mats, collection)
    strongbox_shelf(root, mats, collection)
    support_dressing(static, mats, collection)
    mark("roof")
    roof = B.empty("roof", collection, root)
    tiles = hall_roof(roof, mats, collection) + bay_roof(roof, mats, collection)
    return root, static, roof, collection, mats, tiles


def authoring_report(root, tiles):
    names = {obj.name for obj in B.descendants(root)}
    checks = {
        "hallBayDormerCompoundAuthored": all(f"BayWall_{i}" in names for i in range(4)) and "Dormer" in names and "VaultChimney" in names,
        "threeRoofMassesAuthored": all(n in names for n in ("HallRoofSolid", "HallRoofSolidNorth", "BayRoofSolid", "DormerRoof", "GableEnd")),
        "fittedFullFrameDoorsAuthored": sum("_Plank_" in n for n in names) >= 12 and "FrontFrame_Lintel" in names and
                                          "EastFrame_Lintel" in names and "Front_OverDoor" in names and "EastDoor_OverDoor" in names,
        "irregularMasonryCoursesAuthored": sum("_Stone_" in n for n in names) >= 40,
        "loadBearingTimberBaysAuthored": sum("_Brace_" in n for n in names) >= 4,
        "layeredRoofCoursesAuthored": tiles >= 120,
        "tellerCounterAuthored": all(n in names for n in ("CounterTop", "CounterFlap", "GrilleRail", "BoothHead", "BoothTray")),
        "vaultStationsAuthored": all(n in names for n in ("Ledger", "ScaleBeam", "Strongbox_0_0", "PlaqueFace", "BenchSeat", "SignCoin")),
        "semanticNodesPreserved": all(n in names for n in SEMANTIC),
    }
    report = {
        "asset": "holm_bank_v1", "pipelineVersion": 1, "unitsPerTile": 1, "checks": checks,
        "visualLanguage": "Guide Hall anchor family; banking hall with teller counter, vault, waiting bay",
        "roofCourses": tiles,
        "humanScaleContract": {
            "playerVisualHeight": PLAYER_VISUAL_H, "doorOpeningHeight": DOOR_OPENING_H,
            "counterTopHeight": 1.18, "boothHeadHeight": 3.03, "deskTopHeight": 0.99, "benchSeatHeight": 0.58,
            "hallWallHeight": HALL_H,
        },
        "metrics": V1.metrics(root),
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    if not all(checks.values()):
        raise RuntimeError("Holm Bank authoring checks failed: " + ", ".join(n for n, ok in checks.items() if not ok))
    return report


def render_export(root, roof, collection, mats):
    scene = bpy.context.scene
    cam = K.setup_preview(mats)
    cam.location = (18, -22, 17)
    cam.data.ortho_scale = 20.0
    V1.look_at(cam, (0, 0, 2.4))
    scene.render.filepath = str(PREVIEW / "holm_bank_v1_exterior.png")
    bpy.ops.render.render(write_still=True)
    B.set_render_hidden(roof, True)
    scene.render.filepath = str(PREVIEW / "holm_bank_v1_roof_off.png")
    bpy.ops.render.render(write_still=True)
    cam.location = (0, -0.001, 31); V1.look_at(cam, (0, 0, 0)); cam.data.ortho_scale = 16.0
    scene.render.filepath = str(PREVIEW / "holm_bank_v1_plan.png")
    bpy.ops.render.render(write_still=True)
    B.set_render_hidden(roof, False)
    cam.location = (18, -20, 16); cam.data.ortho_scale = 22.0; V1.look_at(cam, (0, 0, 1.9))
    scene.render.filepath = str(PREVIEW / "holm_bank_v1_game_camera.png")
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
    print("HOLM_BANK_V1_READY", MODEL)


if __name__ == "__main__":
    main()
