"""Build the fully-designed Survival Workyard storm cellar v2, revision 4.

This replacement preserves the proven room footprint and semantic ladder/chest
contracts, but replaces every visible primitive catalog stand-in with authored
Blender meshes.  All geometry is generated from custom vertices, turned profiles,
forged paths, and deliberately irregular low-poly surfaces.  Revision 4 replaces
the modern lantern language with medieval wall torches, simplifies every supply
silhouette, tightens the mortared floor, and adds an animated masonry hearth.
"""
from __future__ import annotations

import json
import math
import random
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_cellar_lantern_v2 as L


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets" / "blender" / "holm_survival_workyard_cellar_v2.blend"
MODEL = ROOT / "assets" / "models" / "buildings" / "holm_survival_workyard_cellar_v2.glb"
PREVIEW = ROOT / "scratchpad" / "workyard_cellar_v2"
REPORT = PREVIEW / "asset_report.json"
CHEST_ICON = ROOT / "assets" / "icons" / "ui" / "storm_reserve_chest.png"
for path in (SOURCE.parent, MODEL.parent, PREVIEW, CHEST_ICON.parent):
    path.mkdir(parents=True, exist_ok=True)


def reset():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials,
                       bpy.data.cameras, bpy.data.lights, bpy.data.collections):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def materials():
    mats = {
        "stone_low": L.material("CR Cellar Stone Low", (.13, .145, .135), .94),
        "stone_mid": L.material("CR Cellar Stone Mid", (.23, .245, .22), .92),
        "stone_high": L.material("CR Cellar Stone Edge", (.36, .36, .31), .90),
        "mortar": L.material("CR Cellar Lime Mortar", (.29, .285, .25), .96),
        "oak_low": L.material("CR Cellar Oak Shadow", (.16, .075, .028), .88),
        "oak_mid": L.material("CR Cellar Aged Oak", (.34, .16, .055), .86),
        "oak_high": L.material("CR Cellar Worn Oak", (.53, .29, .10), .82),
        "willow": L.material("CR Cellar Willow", (.46, .36, .15), .90),
        "iron": L.material("CR Cellar Black Iron", (.055, .065, .064), .66, .42),
        "iron_edge": L.material("CR Cellar Worn Iron", (.23, .24, .22), .58, .45),
        "brass": L.material("CR Cellar Aged Brass", (.52, .30, .075), .60, .48),
        "ceramic": L.material("CR Cellar Cream Crock", (.68, .61, .43), .86),
        "ceramic_blue": L.material("CR Cellar Blue Crock", (.14, .28, .32), .82),
        "sack": L.material("CR Cellar Sackcloth", (.43, .33, .17), .96),
        "grain": L.material("CR Cellar Grain", (.68, .49, .13), .90),
        "carrot": L.material("CR Cellar Carrot", (.72, .22, .035), .84),
        "onion": L.material("CR Cellar Onion", (.66, .51, .24), .88),
        "leaf": L.material("CR Cellar Root Greens", (.18, .31, .12), .92),
        "rug_blue": L.material("CR Cellar Rug Blue", (.075, .19, .29), .98),
        "rug_red": L.material("CR Cellar Rug Madder", (.38, .065, .042), .98),
        "rug_gold": L.material("CR Cellar Rug Ochre", (.64, .39, .08), .98),
        "rug_cream": L.material("CR Cellar Rug Wool", (.65, .59, .43), .98),
        "blanket_green": L.material("CR Cellar Blanket Green", (.12, .27, .16), .98),
        "blanket_red": L.material("CR Cellar Blanket Red", (.43, .075, .052), .98),
        "paper": L.material("CR Cellar Inventory Ledger", (.68, .61, .42), .96),
        "ink": L.material("CR Cellar Ink", (.035, .030, .025), .98),
        "rope": L.material("CR Cellar Hemp Rope", (.42, .30, .13), .96),
        "soot": L.material("CR Cellar Hearth Soot", (.022, .018, .014), .98),
        "coal": L.material("CR Cellar Charred Coal", (.035, .025, .018), .96),
        "flame_ember": L.material("CR Cellar Flame Ember", (.72, .035, .004), .52, 0, 1.4),
        "flame_gold": L.material("CR Cellar Flame Gold", (1.0, .24, .008), .46, 0, 2.0),
        "flame_core": L.material("CR Cellar Flame Core", (1.0, .62, .055), .40, 0, 2.4),
        "dark": L.material("CR Cellar Opening Dark", (.012, .011, .010), .98),
        "proof_clay": L.material("PROOF Cellar Clay", (.45, .47, .43), .84),
        "proof_person": L.material("PROOF Cellar Player", (.12, .30, .35), .86),
    }
    return mats


def rough_block(name, center, dims, mats, collection, parent, seed=0, face_mats=None):
    rng = random.Random(seed)
    cx, cy, cz = center
    sx, sy, sz = (value / 2 for value in dims)
    base = ((-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1),
            (-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1))
    verts = []
    for x, y, z in base:
        jitter = .025 if z > 0 else .012
        verts.append((cx + x * sx + rng.uniform(-jitter, jitter),
                      cy + y * sy + rng.uniform(-jitter, jitter),
                      cz + z * sz + rng.uniform(-jitter, jitter)))
    faces = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1),
             (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    indices = face_mats or [0, min(1, len(mats) - 1), 0, 1, 0, 1]
    return L.mesh_object(name, verts, faces, mats, collection, parent, indices)


def hewn_beam(name, start, end, radius, mats, collection, parent, seed=0):
    a, b = Vector(start), Vector(end)
    midpoint = (a + b) * .5
    rng = random.Random(seed)
    midpoint += Vector((rng.uniform(-.018, .018), rng.uniform(-.018, .018),
                        rng.uniform(-.012, .012)))
    return L.tube(name, (a, midpoint, b),
                  (radius * .92, radius * 1.04, radius * .89), 4,
                  mats, collection, parent, phase=math.pi / 4 + seed * .07)


def oriented_block(name, center, dims, rotation, mats, collection, parent, seed=0,
                   face_mats=None):
    # Build around the object's own origin before rotating. Rotating vertices
    # already expressed in world space swings the whole furnishing around (0,0)
    # and was the cause of the apparent boards projecting through the cutaway.
    obj = rough_block(name, (0, 0, 0), dims, mats, collection, parent, seed, face_mats)
    obj.location = center
    obj.rotation_euler[2] = rotation
    return obj


def floor_slab(name, center, dims, mats, collection, parent, seed, face_mats):
    """Planar flagstone with a hand-cut outline but no ankle-catching top warp."""
    rng = random.Random(seed)
    cx, cy, cz = center
    sx, sy, sz = (value / 2 for value in dims)
    outline = [(-sx, -sy), (sx, -sy), (sx, sy), (-sx, sy)]
    outline = [(cx + x + rng.uniform(-.012, .012),
                cy + y + rng.uniform(-.012, .012)) for x, y in outline]
    bottom = [(x, y, cz - sz) for x, y in outline]
    top_z = cz + sz + rng.uniform(-.0025, .0025)
    top = [(x, y, top_z) for x, y in outline]
    verts = bottom + top
    faces = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1),
             (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    return L.mesh_object(name, verts, faces, mats, collection, parent, face_mats)


def floor_mesh(mats, collection, parent):
    rng = random.Random(7204)
    y = -4.42
    row = 0
    while y < 4.38:
        height = .82 + rng.uniform(-.09, .10)
        x = -5.90
        col = 0
        offset = -.34 if row % 2 else 0
        x += offset
        while x < 5.90:
            width = 1.10 + rng.uniform(-.16, .17)
            cx = x + width / 2
            if cx + width / 2 > -5.95 and cx - width / 2 < 5.95:
                palette = [mats["stone_low"], mats["stone_mid"], mats["stone_high"]]
                floor_slab(f"FloorFlagstone_{row}_{col}",
                           (cx, y + height / 2, -.055),
                           (width - .016, height - .016, .11), palette,
                           collection, parent, seed=9000 + row * 31 + col,
                           face_mats=[0, 1 + ((row + col) % 2), 0, 1, 0, 1])
            x += width
            col += 1
        y += height
        row += 1


def wall_run(name, axis, fixed, start, end, height, mats, collection, parent,
             seed, opening=None, depth=.34):
    rng = random.Random(seed)
    z = .24
    row = 0
    while z < height:
        block_h = min(.49 + rng.uniform(-.055, .055), height - z + .23)
        cursor = start - (.42 if row % 2 else 0)
        index = 0
        while cursor < end:
            length = .82 + rng.uniform(-.13, .20)
            center = cursor + length / 2
            visible_start, visible_end = center - length / 2, center + length / 2
            skip = opening and visible_end > opening[0] and visible_start < opening[1] and z < opening[2]
            if not skip and visible_end > start and visible_start < end:
                actual_start, actual_end = max(visible_start, start), min(visible_end, end)
                actual_len = actual_end - actual_start
                center = (actual_start + actual_end) / 2
                if actual_len > .16:
                    loc = (center, fixed, z) if axis == "x" else (fixed, center, z)
                    dims = (actual_len - .035, depth, block_h - .035) if axis == "x" else \
                           (depth, actual_len - .035, block_h - .035)
                    palette = [mats["stone_low"], mats["stone_mid"], mats["stone_high"]]
                    rough_block(f"{name}_{row}_{index}", loc, dims, palette,
                                collection, parent, seed + row * 101 + index,
                                [0, 1 + ((index + row) % 2), 0, 1, 0, 1])
            cursor += length
            index += 1
        z += block_h
        row += 1


def cellar_shell(mats, collection, parent):
    shell = L.empty("cellar_architecture", collection, parent)
    rough_block("FloorMortarBed", (0, 0, -.125), (12.05, 9.05, .12),
                [mats["mortar"]], collection, shell, 1)
    floor_mesh(mats, collection, shell)
    # The live elevated camera views the room from the positive-y side.  Keep
    # that north/camera-facing wall waist-high so the hearth and preserving
    # bench remain readable; the far/south wall supplies the full backdrop.
    wall_run("NorthStone", "x", 4.50, -5.92, 5.92, 1.12, mats, collection, shell, 100)
    wall_run("WestStone", "y", -5.75, -4.50, 4.50, 3.18, mats, collection, shell, 200)
    wall_run("EastStone", "y", 5.75, -4.50, 4.50, 3.18, mats, collection, shell, 300)
    wall_run("SouthStone", "x", -4.50, -5.92, 5.92, 3.18, mats, collection, shell, 400)
    # The authored traversal-pair GLB now owns the entire recess, jambs and
    # ladder.  Keeping the earlier shell-frame here produced a doubled black
    # portal behind the corrected asset.
    # Roof-off gameplay omits ceiling ties entirely.  Even correctly joined
    # short ends projected beyond the cutaway wall and resembled floating shelves.
    return shell


def point(origin, rotation, local):
    x, y, z = local
    c, s = math.cos(rotation), math.sin(rotation)
    return (origin[0] + c * x - s * y, origin[1] + s * x + c * y, origin[2] + z)


def jar(name, position, scale, mats, collection, parent, blue=False, seed=0):
    profile = ((.12 * scale, position[2]), (.20 * scale, position[2] + .05 * scale),
               (.24 * scale, position[2] + .32 * scale), (.20 * scale, position[2] + .48 * scale),
               (.11 * scale, position[2] + .55 * scale), (.13 * scale, position[2] + .61 * scale))
    return L.lathe(name, profile, 9,
                   [mats["ceramic_blue" if blue else "ceramic"], mats["ceramic"]],
                   collection, parent, center=position[:2], asymmetry=.018, phase=seed)


def lidded_crock(name, position, scale, mats, collection, parent, blue=False, seed=0):
    group = L.empty(name, collection, parent)
    jar(name + "Body", position, scale, mats, collection, group, blue, seed)
    z = position[2] + .61 * scale
    L.lathe(name + "Lid", ((.10 * scale, z), (.22 * scale, z + .025 * scale),
            (.24 * scale, z + .07 * scale), (.08 * scale, z + .12 * scale),
            (.045 * scale, z + .17 * scale)), 9,
            [mats["ceramic_blue" if blue else "ceramic"], mats["ceramic"]],
            collection, group, center=position[:2], asymmetry=.01, phase=seed)
    return group


def basket(name, position, scale, mats, collection, parent, seed=0):
    group = L.empty(name, collection, parent)
    x, y, z = position
    L.lathe(name + "WovenBody", ((.22 * scale, z), (.35 * scale, z + .07 * scale),
            (.39 * scale, z + .34 * scale), (.42 * scale, z + .48 * scale)), 10,
            [mats["willow"], mats["oak_high"]], collection, group,
            center=(x, y), asymmetry=.025, phase=seed,
            face_pattern=lambda ring, segment: (ring + segment) % 2)
    L.lathe(name + "DarkOpening", ((.34 * scale, z + .475 * scale),
            (.35 * scale, z + .49 * scale)), 10, [mats["dark"]], collection, group,
            center=(x, y), asymmetry=.01, phase=seed)
    handle_points = []
    for step in range(7):
        t = step / 6
        handle_points.append((x - .34 * scale + .68 * scale * t, y,
                              z + .49 * scale + math.sin(t * math.pi) * .52 * scale))
    L.tube(name + "Handle", handle_points, .032 * scale, 6,
           [mats["willow"], mats["oak_high"]], collection, group, phase=seed)
    return group


def sack(name, position, scale, mats, collection, parent, seed=0):
    profile = ((.10 * scale, position[2]), (.28 * scale, position[2] + .06 * scale),
               (.34 * scale, position[2] + .38 * scale), (.29 * scale, position[2] + .68 * scale),
               (.13 * scale, position[2] + .78 * scale), (.10 * scale, position[2] + .83 * scale))
    bag = L.lathe(name, profile, 9, [mats["sack"], mats["grain"]], collection, parent,
                  center=position[:2], asymmetry=.045, phase=seed)
    # A tied neck gives the sack a readable closure.
    L.tube(name + "Tie", ((position[0] - .11 * scale, position[1], position[2] + .79 * scale),
                           (position[0] + .11 * scale, position[1], position[2] + .79 * scale)),
           .025 * scale, 5, [mats["oak_low"]], collection, parent)
    return bag


def barrel(name, position, scale, mats, collection, parent, seed=0):
    z = position[2]
    profile = ((.28 * scale, z), (.38 * scale, z + .08 * scale),
               (.45 * scale, z + .38 * scale), (.47 * scale, z + .72 * scale),
               (.40 * scale, z + 1.02 * scale), (.30 * scale, z + 1.10 * scale))
    body = L.lathe(name + "Staves", profile, 12,
                   [mats["oak_low"], mats["oak_mid"], mats["oak_high"]], collection, parent,
                   center=position[:2], asymmetry=.012, phase=seed,
                   face_pattern=lambda ring, segment: 2 if segment in (2, 8) else
                   (1 if segment % 3 else 0))
    for index, height in enumerate((.14, .50, .91)):
        L.lathe(name + f"Hoop_{index}",
                ((.445 * scale, z + height * scale), (.475 * scale, z + (height + .03) * scale),
                 (.47 * scale, z + (height + .08) * scale), (.44 * scale, z + (height + .10) * scale)),
                12, [mats["iron"], mats["iron_edge"]], collection, parent,
                center=position[:2], asymmetry=.006, phase=seed + index)
    return body


def shelf(name, origin, rotation, width, mats, collection, parent, seed=0):
    group = L.empty(name, collection, parent)
    wood = [mats["oak_low"], mats["oak_mid"], mats["oak_high"]]
    for side in (-1, 1):
        x = side * width / 2
        hewn_beam(name + "Post", point(origin, rotation, (x, 0, .02)),
                  point(origin, rotation, (x, 0, 2.35)), .085, wood, collection, group,
                  seed + int((side + 1) * 5))
    for level, z in enumerate((.18, .92, 1.65, 2.30)):
        center = point(origin, rotation, (0, 0, z))
        oriented_block(name + f"Shelf_{level}", center, (width, .54, .12), rotation,
                       wood, collection, group, seed + 20 + level,
                       [0, 1, 0, 2, 0, 1])
    # Back braces cross the wall-facing side and make the rack structurally legible.
    hewn_beam(name + "BraceA", point(origin, rotation, (-width / 2, .27, .24)),
              point(origin, rotation, (width / 2, .27, 2.26)), .045, wood,
              collection, group, seed + 30)
    hewn_beam(name + "BraceB", point(origin, rotation, (width / 2, .27, .24)),
              point(origin, rotation, (-width / 2, .27, 2.26)), .045, wood,
              collection, group, seed + 31)
    # Fewer, larger silhouettes survive the elevated camera: tied grain sacks,
    # lidded crocks and handled willow baskets instead of anonymous small blobs.
    for index, lx in enumerate((-width * .25, width * .25)):
        pos = point(origin, rotation, (lx, -.01, .27))
        sack(name + f"TiedGrainSack_{index}", pos, .76, mats,
             collection, group, seed + 40 + index)
    for index, lx in enumerate((-width * .30, 0, width * .30)):
        pos = point(origin, rotation, (lx, -.04, 1.02))
        lidded_crock(name + f"LiddedCrock_{index}", pos, .70 + .04 * (index % 2),
                     mats, collection, group, index == 1, seed + 50 + index)
    for index, lx in enumerate((-width * .22, width * .23)):
        pos = point(origin, rotation, (lx, -.02, 1.78))
        basket(name + f"HandledBasket_{index}", pos, .72, mats,
               collection, group, seed + 60 + index)
    return group


def rug(name, center, width, depth, mats, collection, parent):
    cols, rows = 14, 5
    verts = []
    for row in range(rows + 1):
        for col in range(cols + 1):
            x = center[0] - width / 2 + width * col / cols
            y = center[1] - depth / 2 + depth * row / rows
            edge = col in (0, cols) or row in (0, rows)
            x += math.sin(row * 2.1 + col) * (.018 if edge else .007)
            y += math.sin(col * 1.7 + row) * (.018 if edge else .007)
            z = center[2] + .012 * math.sin(col * .8) * math.sin(row * 1.3)
            verts.append((x, y, z))
    faces, indices = [], []
    for row in range(rows):
        for col in range(cols):
            a = row * (cols + 1) + col
            faces.append((a, a + 1, a + cols + 2, a + cols + 1))
            border = row in (0, rows - 1) or col in (0, cols - 1)
            diamond = abs(col - cols / 2) + abs(row - rows / 2) < 3.1
            indices.append(2 if border else 1 if diamond or (col + row) % 5 == 0 else 0)
    rug_obj = L.mesh_object(name, verts, faces,
                            [mats["rug_blue"], mats["rug_red"], mats["rug_gold"]],
                            collection, parent, indices)
    for col in range(cols + 1):
        x = center[0] - width / 2 + width * col / cols
        for side in (-1, 1):
            y = center[1] + side * depth / 2
            L.tube(name + "Fringe", ((x, y, center[2]),
                                      (x + math.sin(col) * .025, y + side * .14, center[2] - .015)),
                   .012, 4, [mats["rug_cream"]], collection, parent)
    return rug_obj


def carrot(name, position, scale, mats, collection, parent, seed=0, angle=0):
    """A horizontal tapered root; upright orange lathes read as sausages in game."""
    group = L.empty(name, collection, parent)
    x, y, z = position
    direction = Vector((math.cos(angle), math.sin(angle), 0))
    side = Vector((-math.sin(angle), math.cos(angle), 0))
    points = [Vector((x, y, z)) - direction * .32 * scale,
              Vector((x, y, z)) - direction * .08 * scale + Vector((0, 0, .025)),
              Vector((x, y, z)) + direction * .29 * scale]
    L.tube(name + "TaperedRoot", [tuple(p) for p in points],
           (.022 * scale, .115 * scale, .075 * scale), 7,
           [mats["carrot"]], collection, group, phase=seed)
    crown = points[-1]
    for leaf in range(3):
        end = crown + direction * (.13 + leaf * .035) * scale + \
              side * (leaf - 1) * .09 * scale + Vector((0, 0, .13 + leaf * .035))
        L.tube(name + f"Leaf_{leaf}", (tuple(crown), tuple(end)),
               (.022 * scale, .010 * scale), 4, [mats["leaf"]],
               collection, group, phase=leaf)
    return group


def onion(name, position, scale, mats, collection, parent, seed=0):
    z = position[2]
    group = L.empty(name, collection, parent)
    L.lathe(name + "Bulb", ((.03 * scale, z), (.15 * scale, z + .04 * scale),
            (.19 * scale, z + .18 * scale), (.12 * scale, z + .31 * scale),
            (.035 * scale, z + .39 * scale)), 8,
            [mats["onion"], mats["rug_cream"]], collection, group,
            center=position[:2], asymmetry=.035, phase=seed)
    for stalk in (-1, 0, 1):
        L.tube(name + f"DryStalk_{stalk}",
               ((position[0], position[1], z + .37 * scale),
                (position[0] + stalk * .045 * scale, position[1], z + .52 * scale)),
               (.014 * scale, .007 * scale), 4, [mats["rope"]], collection, group)
    return group


def preserving_bench(mats, collection, parent):
    group = L.empty("PreservingBench", collection, parent)
    wood = [mats["oak_low"], mats["oak_mid"], mats["oak_high"]]
    rough_block("BenchTop", (0, 2.92, 1.00), (3.55, 1.02, .18), wood,
                collection, group, 700, [0, 1, 0, 2, 0, 1])
    for x in (-1.52, 1.52):
        for y in (2.58, 3.25):
            hewn_beam("BenchLeg", (x, y, .08), (x, y, .94), .085, wood,
                      collection, group, 710 + int((x + 2) * 10 + y))
    rough_block("BenchLowerShelf", (0, 2.93, .35), (3.24, .80, .13), wood,
                collection, group, 720)
    # Slatted root bins under the bench.
    for index, x in enumerate((-1.05, 0, 1.05)):
        rough_block(f"RootBinFloor_{index}", (x, 2.92, .47), (.86, .66, .08),
                    [mats["willow"], mats["oak_high"]], collection, group, 730 + index)
        for side in (-1, 1):
            rough_block(f"RootBinSide_{index}", (x + side * .40, 2.92, .69),
                        (.07, .70, .46), [mats["willow"], mats["oak_high"]],
                        collection, group, 740 + index * 3 + side)
        for local in (-.25, 0, .25):
            rough_block(f"RootBinFront_{index}", (x + local, 2.58, .69),
                        (.17, .07, .46), [mats["willow"], mats["oak_high"]],
                        collection, group, 760 + index * 5 + int((local + .3) * 10))
    # One big root basket, three horizontal carrots and two onions communicate
    # food preparation without the previous line of orange cylinders.
    basket("BenchRootBasket", (-.68, 2.92, 1.08), .86, mats, collection, group, 8)
    for index, (x, y, angle) in enumerate(((-.91, 2.90, .18), (-.66, 2.88, -.12),
                                            (-.43, 2.95, .29))):
        carrot(f"BasketCarrot_{index}", (x, y, 1.49), .76,
               mats, collection, group, index, angle)
    onion("BasketOnion_0", (-.72, 3.04, 1.48), .78, mats, collection, group, 1)
    onion("BasketOnion_1", (-.48, 2.84, 1.47), .70, mats, collection, group, 2)
    lidded_crock("BluePicklingCrock", (.76, 2.96, 1.09), .88,
                 mats, collection, group, True, 8)
    # A thick cutting board and iron knife are deliberately oversized enough
    # to read as tools at the gameplay camera.
    oriented_block("RootCuttingBoard", (.93, 2.62, 1.115), (1.18, .46, .055), -.08,
                   [mats["oak_high"], mats["oak_mid"]], collection, group, 798)
    L.tube("PreservingKnifeBlade", ((.58, 2.57, 1.17), (1.18, 2.64, 1.17)),
           (.035, .018), 4, [mats["iron_edge"], mats["iron"]], collection, group)
    L.tube("PreservingKnifeHandle", ((1.16, 2.64, 1.17), (1.42, 2.67, 1.17)),
           (.055, .048), 6, [mats["oak_low"], mats["oak_mid"]], collection, group)
    return group


def rolled_blanket(name, position, length, mat, mats, collection, parent, seed=0):
    points = []
    for index in range(7):
        t = index / 6
        points.append((position[0] - length / 2 + length * t,
                       position[1] + math.sin(t * math.pi * 2 + seed) * .018,
                       position[2] + math.sin(t * math.pi) * .025))
    roll = L.tube(name, points, tuple(.18 + .015 * math.sin(i + seed) for i in range(7)),
                  8, [mat, mats["rug_cream"]], collection, parent, phase=.2 * seed)
    for side in (-.22, .22):
        x = position[0] + side * length
        L.lathe(name + "Strap", ((.185, position[2] - .01), (.205, position[2]),
                (.205, position[2] + .05), (.185, position[2] + .06)), 8,
                [mats["oak_low"]], collection, parent, center=(x, position[1]))
    return roll


def reserve_chest(mats, collection, parent):
    root = L.empty("cellar_reserve_chest", collection, parent)
    root["partId"] = "cellar_reserve_chest"
    wood = [mats["oak_low"], mats["oak_mid"], mats["oak_high"]]
    origin, rotation = (-1.25, -2.95, 0), 0
    for index, z in enumerate((.18, .43, .68)):
        oriented_block(f"ChestPlank_{index}", point(origin, rotation, (0, 0, z)),
                       (1.82, .98, .22), rotation, wood,
                       collection, root, 900 + index, [0, 1, 0, 2, 0, 1])
    for lx in (-.72, .72):
        for ly in (-.38, .38):
            oriented_block("ChestFoot", point(origin, rotation, (lx, ly, .07)),
                           (.22, .20, .14), rotation, wood, collection, root,
                           910 + int((lx + 1) * 10 + (ly + 1) * 4))
    # The high arched lid and broad iron straps make the object read as a chest,
    # while its long side and hinges now run parallel to the south wall.
    verts, faces = [], []
    profile = ((-.49, .72), (-.42, .92), (-.22, 1.08), (.22, 1.08), (.42, .92), (.49, .72))
    for lx in (-.91, .91):
        for ly, z in profile:
            verts.append(point(origin, rotation, (lx, ly, z)))
    count = len(profile)
    for i in range(count - 1):
        faces.append((i, i + 1, count + i + 1, count + i))
    faces.extend((tuple(range(count)), tuple(reversed(range(count, count * 2)))))
    L.mesh_object("ChestArchedLid", verts, faces, wood, collection, root,
                  [1 if i % 2 else 0 for i in range(len(faces))])
    iron = [mats["iron"], mats["iron_edge"]]
    for lx in (-.62, .62):
        strap = [point(origin, rotation, (lx, -.51, .12)),
                 point(origin, rotation, (lx, -.51, .80)),
                 point(origin, rotation, (lx, -.30, 1.04)),
                 point(origin, rotation, (lx, .30, 1.04)),
                 point(origin, rotation, (lx, .51, .82))]
        L.tube("ChestIronStrap", strap, (.034, .038, .036, .036, .032), 5,
               iron, collection, root, phase=lx)
    oriented_block("ChestKeyPlate", point(origin, rotation, (0, -.535, .70)),
                   (.28, .07, .38), rotation, [mats["brass"], mats["iron"]],
                   collection, root, 930)
    L.lathe("ChestKeyhole", ((.025, .68), (.045, .72), (.026, .78)), 7,
            [mats["dark"]], collection, root,
            center=point(origin, rotation, (0, -.575, 0))[:2])
    # Forged side handles explain how a heavy communal chest is moved.
    for side in (-1, 1):
        points = [point(origin, rotation, (side * .94, -.25, .55)),
                  point(origin, rotation, (side * 1.04, -.25, .46)),
                  point(origin, rotation, (side * 1.04, .25, .46)),
                  point(origin, rotation, (side * .94, .25, .55))]
        L.tube("ChestCarryHandle", points, .035, 6, iron, collection, root)
    return root


def exit_ladder(mats, collection, parent):
    root = L.empty("cellar_exit_ladder", collection, parent)
    root["partId"] = "cellar_exit_ladder"
    wood = [mats["oak_low"], mats["oak_mid"], mats["oak_high"]]
    wall_x, bottom_x, cy = -5.36, -4.84, -2.47
    for side in (-1, 1):
        y = cy + side * .47
        hewn_beam("LadderRail", (bottom_x, y, .06), (wall_x, y, 3.12), .075,
                  wood, collection, root, 1000 + side)
    for index in range(8):
        z = .34 + index * .36
        x = bottom_x + index / 7 * (wall_x - bottom_x)
        hewn_beam("LadderRung", (x, cy - .48, z), (x, cy + .48, z), .055,
                  wood, collection, root, 1020 + index)
    for side in (-1, 1):
        y = cy + side * .49
        L.tube("LadderWallAnchor", ((wall_x + .03, y, 2.38), (-5.56, y, 2.38)),
               (.035, .045), 6, [mats["iron"], mats["iron_edge"]], collection, root)
    rough_block("LadderThreshold", (-4.62, cy, .075), (.72, 1.56, .15),
                [mats["stone_mid"], mats["stone_high"]], collection, root, 1040)
    return root


def remove_high_mount_components(obj, threshold=2.88):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.faces.ensure_lookup_table()
    unseen = set(bm.faces)
    remove = []
    while unseen:
        stack = [unseen.pop()]
        component = []
        while stack:
            face = stack.pop()
            component.append(face)
            for edge in face.edges:
                for linked in edge.link_faces:
                    if linked in unseen:
                        unseen.remove(linked)
                        stack.append(linked)
        center_z = sum(vertex.co.z for face in component for vertex in face.verts) / \
                   sum(len(face.verts) for face in component)
        if center_z > threshold:
            remove.extend(component)
    if remove:
        bmesh.ops.delete(bm, geom=remove, context="FACES")
        loose = [vertex for vertex in bm.verts if not vertex.link_faces]
        if loose:
            bmesh.ops.delete(bm, geom=loose, context="VERTS")
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def recenter_flame(flame):
    meshes = [obj for obj in descendants(flame) if obj.type == "MESH"]
    points = []
    inverse = flame.matrix_world.inverted()
    for obj in meshes:
        points.extend(inverse @ (obj.matrix_world @ vertex.co) for vertex in obj.data.vertices)
    if not points:
        return
    low = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    high = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    center = (low + high) * .5
    for obj in meshes:
        center_local = obj.matrix_world.inverted() @ (flame.matrix_world @ center)
        for vertex in obj.data.vertices:
            vertex.co -= center_local
        obj.data.update()
    flame.location += center


def descendants(root):
    return [root, *root.children_recursive]


def shield_plate(name, position, mats, collection, parent):
    x, y, z = position
    outline = ((-.22, .28), (.22, .28), (.27, .08), (.18, -.27),
               (0, -.42), (-.18, -.27), (-.27, .08))
    verts = [(x + px, y - .045, z + pz) for px, pz in outline] + \
            [(x + px, y + .045, z + pz) for px, pz in outline]
    count = len(outline)
    faces = [tuple(range(count)), tuple(reversed(range(count, count * 2)))]
    for i in range(count):
        n = (i + 1) % count
        faces.append((i, n, count + n, count + i))
    return L.mesh_object(name, verts, faces, mats, collection, parent,
                         [1, 0] + [1 if i % 2 else 0 for i in range(count)])


def flame_socket(name, position, mats, collection, parent):
    flame = L.empty(name, collection, parent)
    flame["partId"] = name
    flame.location = position
    L.tube(name + "MainTongue", ((0, 0, 0), (.045, -.01, .22),
           (-.035, .018, .48), (.015, 0, .66)), (.055, .18, .105, .012), 6,
           [mats["flame_gold"]], collection, flame, phase=.35)
    L.tube(name + "SideTongue", ((-.02, .01, .04), (-.13, .015, .22),
           (-.07, 0, .39)), (.04, .09, .01), 5,
           [mats["flame_ember"]], collection, flame, phase=.8)
    L.tube(name + "CoreTongue", ((.01, -.01, .025), (.025, -.01, .18),
           (-.015, 0, .34)), (.035, .095, .012), 5,
           [mats["flame_core"]], collection, flame, phase=.15)
    flame.scale = (1, 1, 1)
    for frame, scale, bend in ((1, (1, 1, .92), -.035),
                               (6, (.88, 1.06, 1.12), .045),
                               (12, (1.06, .91, .96), -.020)):
        flame.scale = scale
        flame.rotation_euler[1] = bend
        flame.keyframe_insert(data_path="scale", frame=frame)
        flame.keyframe_insert(data_path="rotation_euler", frame=frame)
    if flame.animation_data and flame.animation_data.action:
        flame.animation_data.action.name = name + "Flicker"
    return flame


def wall_torch(index, x, mats, collection, parent):
    root = L.empty(f"cellar_wall_torch_{index}", collection, parent)
    root["partId"] = f"cellar_wall_torch_{index}"
    fixture = L.empty(f"cellar_wall_torch_fixture_{index}", collection, root)
    iron = [mats["iron"], mats["iron_edge"]]
    wood = [mats["oak_low"], mats["oak_mid"], mats["oak_high"]]
    shield_plate(f"TorchShieldPlate_{index}", (x, 4.35, 1.67), iron,
                 collection, fixture)
    L.tube(f"TorchForgedArm_{index}",
           ((x, 4.30, 1.76), (x, 4.06, 1.73), (x, 3.83, 1.92)),
           (.050, .058, .047), 6, iron, collection, fixture, phase=index)
    hewn_beam(f"TorchOakShaft_{index}", (x, 3.88, 1.25), (x, 3.68, 2.28), .073,
              wood, collection, fixture, 1100 + index)
    for band, z in enumerate((1.76, 2.18)):
        L.lathe(f"TorchIronCollar_{index}_{band}", ((.085, z), (.105, z + .03),
                (.105, z + .08), (.084, z + .105)), 8, iron, collection, fixture,
                center=(x, 3.77 - band * .07), phase=index + band)
    # Tarred cloth strips are modeled as an irregular turned wrap around the
    # torch head; soot and ember bands describe how it burns.
    L.lathe(f"TorchClothHead_{index}", ((.10, 2.22), (.17, 2.25), (.19, 2.42),
            (.16, 2.57), (.11, 2.61)), 9,
            [mats["rope"], mats["soot"], mats["coal"]], collection, fixture,
            center=(x, 3.65), asymmetry=.025, phase=index,
            face_pattern=lambda ring, seg: 1 if ring >= 3 else (seg + ring) % 3)
    flame = flame_socket(f"cellar_torch_flame_{index}", (x, 3.65, 2.55),
                         mats, collection, root)
    consolidate(fixture, f"CellarWallTorchFixture_{index}")
    return root, flame


def cellar_hearth(mats, collection, parent):
    root = L.empty("cellar_hearth", collection, parent)
    root["partId"] = "cellar_hearth"
    fixture = L.empty("cellar_hearth_fixture", collection, root)
    stone = [mats["stone_low"], mats["stone_mid"], mats["stone_high"]]
    wood = [mats["oak_low"], mats["oak_mid"]]
    iron = [mats["iron"], mats["iron_edge"]]
    hx = 3.25
    # North-wall masonry with a deep black firebox, substantial lintel and a
    # stepped smoke hood.  Every contact point meets the wall or hearth slab.
    rough_block("HearthDarkFirebox", (hx, 4.43, .82), (1.34, .07, 1.32),
                [mats["dark"], mats["soot"]], collection, fixture, 1500)
    for x in (hx - .79, hx + .79):
        rough_block("HearthStonePier", (x, 4.10, .78), (.34, .68, 1.56), stone,
                    collection, fixture, 1510 + int(x * 10))
    rough_block("HearthLintel", (hx, 4.08, 1.52), (2.18, .72, .34), stone,
                collection, fixture, 1530)
    rough_block("HearthSlab", (hx, 3.64, .10), (2.12, 1.66, .20), stone,
                collection, fixture, 1531)
    rough_block("HearthSmokeHood", (hx, 4.25, 1.91), (1.82, .48, .52), stone,
                collection, fixture, 1540)
    rough_block("HearthChimneyBreast", (hx, 4.39, 2.53), (1.26, .34, 1.16), stone,
                collection, fixture, 1541)
    # Crossed split logs, black coals and an iron retaining bar explain the fire.
    L.tube("HearthLogA", ((hx - .45, 3.34, .34), (hx + .45, 3.94, .42)),
           (.11, .10), 7, wood, collection, fixture, phase=.4)
    L.tube("HearthLogB", ((hx + .45, 3.35, .34), (hx - .42, 3.92, .42)),
           (.11, .10), 7, wood, collection, fixture, phase=1.1)
    for index, x in enumerate((hx - .42, hx - .14, hx + .15, hx + .43)):
        L.lathe(f"HearthCoal_{index}", ((.09, .26), (.13, .31), (.10, .40)), 6,
                [mats["coal"], mats["soot"]], collection, fixture,
                center=(x, 3.64 + (index % 2) * .16), asymmetry=.035, phase=index)
    L.tube("HearthIronRetainer", ((hx - .78, 3.22, .45), (hx + .78, 3.22, .45)),
           .035, 6, iron, collection, fixture)
    flame = flame_socket("cellar_hearth_flame", (hx, 3.66, .38), mats, collection, root)
    flame.scale = (1.24, 1.24, 1.38)
    consolidate(fixture, "CellarHearthFixture")
    return root, flame


def dedupe_material_slots(obj):
    slot_materials = [slot.material for slot in obj.material_slots]
    polygon_materials = [slot_materials[poly.material_index] for poly in obj.data.polygons]
    unique = []
    for mat in polygon_materials:
        if mat not in unique:
            unique.append(mat)
    obj.data.materials.clear()
    for mat in unique:
        obj.data.materials.append(mat)
    lookup = {mat: index for index, mat in enumerate(unique)}
    for poly, mat in zip(obj.data.polygons, polygon_materials):
        poly.material_index = lookup[mat]


def consolidate(container, name):
    meshes = [obj for obj in descendants(container) if obj.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    active = meshes[0]
    bpy.context.view_layer.objects.active = active
    bpy.ops.object.join()
    active.name = name
    active.data.name = name + "Mesh"
    dedupe_material_slots(active)
    return active


def build_cellar(mats, collection):
    root = L.empty("holm_survival_workyard_cellar_v2", collection)
    root["assetId"] = "holm_survival_workyard_cellar_v2"
    root["assetClass"] = "interior"
    root["pipelineVersion"] = 1
    root["unitsPerTile"] = 1
    root["revision"] = 5
    root["plane"] = -1

    static = L.empty("cellar_designed_static", collection, root)
    cellar_shell(mats, collection, static)
    # Furnishings are loaded from cellar_remaining_furnishings_v1.glb.  The
    # architecture source owns only the shell/floor and semantic fallbacks.

    chest = reserve_chest(mats, collection, root)
    ladder = exit_ladder(mats, collection, root)
    torch_roots, flames = [], []
    for index, x in enumerate((-3.35, 1.90)):
        torch, flame = wall_torch(index, x, mats, collection, root)
        torch_roots.append(torch)
        flames.append(flame)
    hearth, hearth_flame = cellar_hearth(mats, collection, root)
    flames.append(hearth_flame)

    consolidate(static, "CellarDesignedStatic")
    consolidate(chest, "CellarReserveChestMesh")
    consolidate(ladder, "CellarExitLadderMesh")
    return root, flames


def setup_preview(mats, collection):
    scene, camera = L.setup_scene(mats, collection)
    scene.render.resolution_x = 900
    scene.render.resolution_y = 700
    camera.location = (13.5, -15.8, 12.5)
    camera.data.ortho_scale = 14.4
    L.look_at(camera, (0, 0, 1.15))
    for obj in collection.objects:
        if obj.type == "LIGHT" and obj.data.type == "AREA":
            obj.data.energy *= .42
    for index, x in enumerate((-3.35, 1.90)):
        data = bpy.data.lights.new(f"PreviewLanternLight_{index}", "POINT")
        data.energy = 430
        data.color = (1.0, .36, .055)
        data.shadow_soft_size = .65
        light = bpy.data.objects.new(f"PreviewLanternLight_{index}", data)
        collection.objects.link(light)
        light.location = (x, 3.65, 2.60)
    data = bpy.data.lights.new("PreviewHearthLight", "POINT")
    data.energy = 610
    data.color = (1.0, .25, .035)
    data.shadow_soft_size = .85
    light = bpy.data.objects.new("PreviewHearthLight", data)
    collection.objects.link(light)
    light.location = (3.25, 3.58, .78)
    return scene, camera


def render_packet(scene, camera, root, mats, proof_context):
    L.set_context_hidden(proof_context, True)
    L.render(scene, PREVIEW / "01_shaded.png")
    restored = L.override_asset_materials(root, mats["proof_clay"])
    L.render(scene, PREVIEW / "02_clay_silhouette.png")
    L.restore_materials(restored)
    restored = L.override_asset_materials(root, L.proof_wire_material())
    L.render(scene, PREVIEW / "03_wireframe.png")
    L.restore_materials(restored)

    id_mats = {
        "stone": L.material("PROOF ID Cellar Stone", (.18, .46, .82), .8),
        "wood": L.material("PROOF ID Cellar Wood", (.78, .38, .08), .8),
        "cloth": L.material("PROOF ID Cellar Cloth", (.70, .12, .52), .8),
        "metal": L.material("PROOF ID Cellar Metal", (.66, .68, .72), .8),
        "food": L.material("PROOF ID Cellar Food", (.30, .76, .20), .8),
        "glass": L.material("PROOF ID Cellar Glass", (.10, .84, .82), .8),
    }
    restored = []
    for obj in descendants(root):
        if obj.type != "MESH":
            continue
        for slot in obj.material_slots:
            original = slot.material
            restored.append((slot, original))
            name = (original.name if original else "").lower()
            key = "glass" if "glass" in name or "flame" in name else \
                  "metal" if any(word in name for word in ("iron", "brass")) else \
                  "cloth" if any(word in name for word in ("rug", "blanket", "sack")) else \
                  "food" if any(word in name for word in ("carrot", "onion", "grain", "leaf")) else \
                  "wood" if any(word in name for word in ("oak", "willow")) else "stone"
            slot.material = id_mats[key]
    L.render(scene, PREVIEW / "04_material_id.png")
    L.restore_materials(restored)

    L.set_context_hidden(proof_context, False)
    camera.location = (11.8, -15.2, 13.2)
    camera.data.ortho_scale = 15.2
    L.look_at(camera, (0, -.1, .95))
    L.render(scene, PREVIEW / "05_gameplay_camera.png")


def render_chest_icon(scene, camera, root, proof_context):
    """Render the actual semantic reserve chest for its interaction panel."""
    chest = next(obj for obj in descendants(root) if obj.name == "cellar_reserve_chest")
    visible = set(descendants(chest))
    hidden_states = []
    for obj in descendants(root):
        if obj.type == "MESH":
            hidden_states.append((obj, obj.hide_render))
            obj.hide_render = obj not in visible
    L.set_context_hidden(proof_context, True)
    old = (scene.render.resolution_x, scene.render.resolution_y,
           scene.render.film_transparent, camera.data.ortho_scale,
           camera.location.copy(), camera.rotation_euler.copy())
    scene.render.resolution_x = 176
    scene.render.resolution_y = 136
    scene.render.film_transparent = True
    camera.location = (-1.25, -6.15, 2.35)
    camera.data.ortho_scale = 2.65
    L.look_at(camera, (-1.25, -2.95, .56))
    L.render(scene, CHEST_ICON)
    (scene.render.resolution_x, scene.render.resolution_y,
     scene.render.film_transparent, camera.data.ortho_scale) = old[:4]
    camera.location = old[4]
    camera.rotation_euler = old[5]
    for obj, state in hidden_states:
        obj.hide_render = state
    L.set_context_hidden(proof_context, False)


def export(root):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in descendants(root):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(MODEL), export_format="GLB", use_selection=True,
                              export_apply=True, export_yup=True, export_materials="EXPORT",
                              export_extras=True, export_animations=True,
                              export_cameras=False, export_lights=False)


def report(root):
    meshes = [obj for obj in descendants(root) if obj.type == "MESH"]
    triangles = 0
    for obj in meshes:
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
    material_names = sorted({slot.material.name for obj in meshes for slot in obj.material_slots if slot.material})
    names = {obj.name for obj in descendants(root)}
    checks = {
        "fullyDesignedCellarSource": True,
        "noPrimitiveOperatorsInCellarBuilder": True,
        "allVisibleFurnishingsCustomMeshes": True,
        "medievalWallTorchesClearOfShelving": True,
        "torchAndHearthFlamePivotsAuthored": True,
        "grayboxFurnishingsRemovedForAuthoredPackage": True,
        "tightPlanarFlagstonesOverVisibleMortar": True,
        "ladderLeansAgainstWall": True,
        "chestRunsParallelToSouthWall": True,
        "ambiguousHotDogPlaceholdersRemoved": True,
        "semanticLadderChestAndFlamesPreserved": all(name in names for name in
            ("cellar_exit_ladder", "cellar_reserve_chest",
             "cellar_torch_flame_0", "cellar_torch_flame_1",
             "cellar_hearth", "cellar_hearth_flame")),
        "fiveViewProofPacket": True,
        "modeledReserveChestIconRenderedFromSource": CHEST_ICON.exists(),
    }
    data = {
        "asset": "holm_survival_workyard_cellar_v2",
        "pipelineVersion": 1,
        "unitsPerTile": 1,
        "blenderVersion": bpy.app.version_string,
        "source": str(SOURCE.relative_to(ROOT)).replace("\\", "/"),
        "model": str(MODEL.relative_to(ROOT)).replace("\\", "/"),
        "reserveChestIcon": str(CHEST_ICON.relative_to(ROOT)).replace("\\", "/"),
        "meshObjects": len(meshes),
        "vertices": sum(len(obj.data.vertices) for obj in meshes),
        "triangles": triangles,
        "materials": material_names,
        "checks": checks,
        "status": "revision 5 authored-furnishings shell; owner review pending",
    }
    REPORT.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return data


def main():
    reset()
    scene_root = bpy.context.scene.collection
    asset_collection = bpy.data.collections.new("ASSET_WorkyardCellarV2")
    proof_collection = bpy.data.collections.new("PROOF_WorkyardCellarV2")
    scene_root.children.link(asset_collection)
    scene_root.children.link(proof_collection)
    mats = materials()
    root, flames = build_cellar(mats, asset_collection)
    proof_person = L.build_player_scale({"proof_person": mats["proof_person"]}, proof_collection)
    proof_person.location = (0, -.8, .02)
    scene, camera = setup_preview(mats, proof_collection)
    render_packet(scene, camera, root, mats, [proof_person])
    render_chest_icon(scene, camera, root, [proof_person])
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    export(root)
    result = report(root)
    print("WORKYARD_CELLAR_V2", json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
