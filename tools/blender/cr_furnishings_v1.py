"""Authored low-poly furnishing families for Crafted Realm interiors.

The module intentionally exposes small parameterised families instead of a
collection of anonymous cubes.  Each asset has a designed silhouette, visible
construction, and optional contents/use marks that explain its purpose from the
elevated gameplay camera.  Builders pass the shared helper module as ``B`` and
their own material dictionary, so the same furnishings render in Studio and the
live r128 game export.
"""
from __future__ import annotations

import math

import bpy
from mathutils import Vector


WOOD_KEYS = {
    "oak": ("oak", "oak_dark", "oak_light"),
    "willow": ("willow", "willow_dark", "willow_light"),
    "mahogany": ("mahogany", "mahogany_dark", "mahogany_light"),
}

# Catalog renders keep the small chamfers.  Large production buildings may set
# this to False before instancing many furnishings; their designed silhouette
# and joinery remain intact while avoiding hundreds of costly modifier applies
# before browser-oriented mesh consolidation.
APPLY_BEVEL = True


def _woods(mats, species):
    keys = WOOD_KEYS.get(species, WOOD_KEYS["oak"])
    return tuple(mats[key] for key in keys)


def _cube(B, name, loc, dims, mat, collection, parent, rotation=(0, 0, 0), bevel=.025):
    bpy.ops.mesh.primitive_cube_add(location=(0, 0, 0), rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    B.link(obj, collection, parent)
    obj.location = loc
    obj.data.materials.append(mat)
    if bevel and APPLY_BEVEL:
        modifier = obj.modifiers.new("CR Hand Edge", "BEVEL")
        modifier.width = bevel
        modifier.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    for face in obj.data.polygons:
        face.use_smooth = False
    return obj


def _cylinder(B, name, loc, radius, depth, sides, mat, collection, parent,
              rotation=(0, 0, 0), bevel=0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=sides, radius=radius, depth=depth,
                                       location=(0, 0, 0), rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    B.link(obj, collection, parent)
    obj.location = loc
    obj.data.materials.append(mat)
    if bevel and APPLY_BEVEL:
        modifier = obj.modifiers.new("CR Hand Edge", "BEVEL")
        modifier.width = bevel
        modifier.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    for face in obj.data.polygons:
        face.use_smooth = False
    return obj


def _beam(B, name, start, end, width, depth, mat, collection, parent, bevel=.018):
    a, b = Vector(start), Vector(end)
    direction = b - a
    obj = _cube(B, name, (a + b) * .5, (direction.length, width, depth), mat,
                collection, parent, bevel=0)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("X", "Z")
    if bevel and APPLY_BEVEL:
        modifier = obj.modifiers.new("CR Hand Edge", "BEVEL")
        modifier.width = bevel
        modifier.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return obj


def _group(B, name, position, rotation, collection, parent):
    group = B.empty(name, collection, parent, position)
    group.rotation_euler.z = rotation
    return group


def trestle_table(B, name, position, rotation, species, mats, collection, parent,
                  width=3.2, depth=1.45, contents="tools"):
    """Broad work table with three uneven planks and visible pegged trestles."""
    group = _group(B, name, position, rotation, collection, parent)
    wood, dark, light = _woods(mats, species)
    plank_depth = depth / 3
    for i in range(3):
        y = (i - 1) * plank_depth
        _cube(B, f"{name}_TopPlank_{i}", (0, y, 1.18 + (i - 1) * .012),
              (width - .04 * (i % 2), plank_depth - .035, .19),
              wood if i != 1 else light, collection, group,
              rotation=(0, (i - 1) * .012, (i - 1) * .006), bevel=.045)
    for x in (-width * .34, width * .34):
        _beam(B, f"{name}_TrestleA", (x - .38, -.52, .10), (x + .18, -.38, 1.08),
              .17, .18, dark, collection, group)
        _beam(B, f"{name}_TrestleB", (x + .38, .52, .10), (x - .18, .38, 1.08),
              .17, .18, dark, collection, group)
        _cube(B, f"{name}_Foot", (x, 0, .12), (.98, depth * .86, .16),
              dark, collection, group, bevel=.035)
        _cylinder(B, f"{name}_Peg", (x, -.66, .72), .065, .22, 8, mats["iron"],
                  collection, group, rotation=(math.pi / 2, 0, 0))
    _beam(B, f"{name}_Stretcher", (-width * .34, 0, .57), (width * .34, 0, .57),
          .18, .20, dark, collection, group)

    if contents == "tools":
        _beam(B, f"{name}_HatchetHandle", (-.55, -.25, 1.34), (.48, -.12, 1.42),
              .065, .065, light, collection, group, .009)
        _cube(B, f"{name}_HatchetHead", (.53, -.11, 1.42), (.38, .14, .28),
              mats["iron"], collection, group, rotation=(0, .05, -.18), bevel=.035)
        _cylinder(B, f"{name}_Whetstone", (-1.10, .20, 1.38), .30, .15, 10,
                  mats["stone_light"], collection, group, rotation=(math.pi / 2, 0, 0), bevel=.02)
        for i in range(3):
            _cube(B, f"{name}_Wedge_{i}", (.25 + i * .22, .34, 1.34),
                  (.18, .33, .12), light, collection, group,
                  rotation=(0, 0, -.18 + i * .14), bevel=.018)
    elif contents == "meal":
        plate(B, f"{name}_Plate", (-.45, 0, 1.34), mats, collection, group)
        cup(B, f"{name}_Cup", (.34, -.12, 1.39), mats, collection, group)
        _cube(B, f"{name}_Loaf", (.85, .16, 1.40), (.72, .34, .26),
              mats["bread"], collection, group, rotation=(0, 0, -.08), bevel=.11)
    return group


def round_table(B, name, position, rotation, species, mats, collection, parent,
                radius=1.15, contents="tea"):
    group = _group(B, name, position, rotation, collection, parent)
    wood, dark, light = _woods(mats, species)
    _cylinder(B, f"{name}_Top", (0, 0, 1.12), radius, .20, 12, wood,
              collection, group, bevel=.035)
    _cylinder(B, f"{name}_Apron", (0, 0, .98), radius * .78, .20, 10, dark,
              collection, group)
    _cylinder(B, f"{name}_Stem", (0, 0, .57), .18, .84, 8, dark, collection, group)
    for angle in (0, math.tau / 3, 2 * math.tau / 3):
        end = (math.cos(angle) * .78, math.sin(angle) * .78, .10)
        _beam(B, f"{name}_Foot", (0, 0, .30), end, .15, .14, dark, collection, group)
    if contents == "tea":
        cup(B, f"{name}_CupA", (-.30, -.05, 1.33), mats, collection, group)
        cup(B, f"{name}_CupB", (.34, .18, 1.33), mats, collection, group, accent="ceramic_blue")
        _cylinder(B, f"{name}_TeaPot", (0, -.35, 1.37), .25, .34, 9,
                  mats["ceramic_cream"], collection, group, bevel=.02)
        _cylinder(B, f"{name}_TeaLid", (0, -.35, 1.57), .13, .07, 9,
                  mats["ceramic_blue"], collection, group)
    return group


def stool(B, name, position, rotation, species, mats, collection, parent,
          style="three_leg"):
    group = _group(B, name, position, rotation, collection, parent)
    wood, dark, light = _woods(mats, species)
    if style == "three_leg":
        _cylinder(B, f"{name}_Seat", (0, 0, .72), .48, .18, 10, wood,
                  collection, group, bevel=.04)
        for angle in (0, math.tau / 3, 2 * math.tau / 3):
            top = (math.cos(angle) * .17, math.sin(angle) * .17, .65)
            foot = (math.cos(angle) * .34, math.sin(angle) * .34, .05)
            _beam(B, f"{name}_Leg", foot, top, .13, .13, dark, collection, group)
    else:
        _cube(B, f"{name}_Seat", (0, 0, .70), (1.0, .52, .18), wood,
              collection, group, bevel=.06)
        for x in (-.34, .34):
            _beam(B, f"{name}_Leg", (x, -.18, .05), (x * .86, -.13, .62),
                  .14, .14, dark, collection, group)
            _beam(B, f"{name}_Leg", (x, .18, .05), (x * .86, .13, .62),
                  .14, .14, dark, collection, group)
    return group


def cup(B, name, position, mats, collection, parent, accent="ceramic_cream"):
    group = B.empty(name, collection, parent, position)
    _cylinder(B, f"{name}_Body", (0, 0, .12), .12, .24, 9, mats[accent], collection, group)
    _cylinder(B, f"{name}_Rim", (0, 0, .25), .14, .045, 9, mats["ceramic_blue"], collection, group)
    bpy.ops.mesh.primitive_torus_add(major_radius=.105, minor_radius=.025, major_segments=8,
                                    minor_segments=4, location=(0, 0, 0))
    handle = bpy.context.object
    handle.name = f"{name}_Handle"
    B.link(handle, collection, group)
    handle.location = (.13, 0, .14)
    handle.rotation_euler = (math.pi / 2, 0, 0)
    handle.data.materials.append(mats[accent])
    return group


def plate(B, name, position, mats, collection, parent):
    group = B.empty(name, collection, parent, position)
    _cylinder(B, f"{name}_Dish", (0, 0, .025), .30, .05, 12,
              mats["ceramic_cream"], collection, group)
    _cylinder(B, f"{name}_Rim", (0, 0, .06), .25, .035, 12,
              mats["ceramic_blue"], collection, group)
    return group


def crockery_hutch(B, name, position, rotation, species, mats, collection, parent,
                   width=2.25):
    """A readable domestic hutch with shaped crown and stocked open shelves."""
    group = _group(B, name, position, rotation, collection, parent)
    wood, dark, light = _woods(mats, species)
    _cube(B, f"{name}_LowerBody", (0, .08, .72), (width, .72, 1.42),
          wood, collection, group, bevel=.055)
    for x in (-width * .27, width * .27):
        _cube(B, f"{name}_Door", (x, -.32, .73), (width * .42, .08, 1.12),
              light, collection, group, bevel=.035)
        _cylinder(B, f"{name}_Knob", (x + (.14 if x < 0 else -.14), -.40, .76),
                  .055, .08, 8, mats["brass"], collection, group,
                  rotation=(math.pi / 2, 0, 0))
    _cube(B, f"{name}_UpperBack", (0, .20, 2.25), (width, .16, 1.70),
          dark, collection, group, bevel=.025)
    for x in (-width / 2 + .10, width / 2 - .10):
        _cube(B, f"{name}_Side", (x, 0, 2.25), (.16, .64, 1.82),
              wood, collection, group, bevel=.025)
    for z in (1.55, 2.10, 2.65, 3.12):
        _cube(B, f"{name}_Shelf", (0, -.04, z), (width, .68, .13),
              wood, collection, group, bevel=.025)
    # Stepped crown makes the hutch recognisable even after consolidation.
    _cube(B, f"{name}_Crown", (0, .02, 3.24), (width + .26, .78, .20),
          dark, collection, group, bevel=.045)
    _cube(B, f"{name}_CrownTop", (0, .02, 3.39), (width * .72, .68, .16),
          light, collection, group, bevel=.035)
    for row, z in enumerate((1.76, 2.31, 2.86)):
        plate_obj = plate(B, f"{name}_Plate_{row}", (-.55, -.35, z), mats, collection, group)
        plate_obj.rotation_euler.x = math.pi / 2
        cup(B, f"{name}_Cup_{row}", (.38 + (row % 2) * .30, -.36, z - .10),
            mats, collection, group, "ceramic_blue" if row % 2 else "ceramic_cream")
    return group


def patterned_rug(B, name, position, rotation, mats, collection, parent,
                  width=3.6, depth=2.2, palette="red"):
    group = _group(B, name, position, rotation, collection, parent)
    field = mats["rug_red" if palette == "red" else "rug_blue"]
    accent = mats["rug_gold"]
    _cube(B, f"{name}_Field", (0, 0, .025), (width, depth, .05),
          field, collection, group, bevel=.025)
    for x in (-width / 2 + .20, width / 2 - .20):
        _cube(B, f"{name}_BorderV", (x, 0, .058), (.14, depth - .14, .022),
              accent, collection, group, bevel=.008)
    for y in (-depth / 2 + .18, depth / 2 - .18):
        _cube(B, f"{name}_BorderH", (0, y, .058), (width - .20, .14, .022),
              accent, collection, group, bevel=.008)
    for i, x in enumerate((-.92, 0, .92)):
        _cube(B, f"{name}_Medallion_{i}", (x, 0, .066), (.46, .46, .025),
              mats["rug_green" if i == 1 else "rug_gold"], collection, group,
              rotation=(0, 0, math.pi / 4), bevel=.012)
    for side in (-1, 1):
        y = side * (depth / 2 + .10)
        for x in [(-width / 2 + .18) + i * .23 for i in range(int((width - .36) / .23) + 1)]:
            _cube(B, f"{name}_Fringe", (x, y, .035), (.055, .24, .035),
                  mats["rope"], collection, group,
                  rotation=(0, 0, (int((x + 10) * 10) % 3 - 1) * .055), bevel=.005)
    return group


def warrior_painting(B, name, position, rotation, mats, collection, parent,
                     field="painting_sky"):
    """Chunky relief-painting; deliberately not a blurry generated texture."""
    group = _group(B, name, position, rotation, collection, parent)
    _cube(B, f"{name}_Panel", (0, .04, 1.05), (1.65, .12, 2.10),
          mats[field], collection, group, bevel=.025)
    for x in (-.94, .94):
        _cube(B, f"{name}_FrameV", (x, 0, 1.05), (.24, .25, 2.42),
              mats["mahogany_dark"], collection, group, bevel=.045)
    for z in (-.10, 2.20):
        _cube(B, f"{name}_FrameH", (0, 0, z), (2.12, .25, .24),
              mats["mahogany_dark"], collection, group, bevel=.045)
    # Low-poly knight silhouette: helm, plume, torso, shield, and spear.
    _cylinder(B, f"{name}_Helm", (0, -.08, 1.55), .26, .15, 8,
              mats["iron_light"], collection, group, rotation=(math.pi / 2, 0, 0))
    _cube(B, f"{name}_Plume", (.03, -.17, 1.94), (.16, .07, .52),
          mats["rug_red"], collection, group, rotation=(0, 0, -.18), bevel=.04)
    _cube(B, f"{name}_Torso", (0, -.08, .90), (.62, .14, .92),
          mats["iron"], collection, group, rotation=(0, 0, -.05), bevel=.08)
    _cylinder(B, f"{name}_Shield", (-.38, -.19, .88), .34, .08, 7,
              mats["rug_blue"], collection, group, rotation=(math.pi / 2, 0, 0))
    _beam(B, f"{name}_Spear", (.40, -.18, .30), (.40, -.18, 1.86),
          .055, .055, mats["rug_gold"], collection, group, .006)
    return group


def fireplace(B, name, position, rotation, mats, collection, parent, animated=True):
    """Stone cooking hearth with a semantic flame group for runtime animation."""
    group = _group(B, name, position, rotation, collection, parent)
    for x in (-1.04, 1.04):
        for row in range(5):
            _cube(B, f"{name}_JambStone", (x, .05, .30 + row * .48),
                  (.55, .82, .42), mats["stone_light" if (row + (x > 0)) % 3 == 0 else "stone"],
                  collection, group, rotation=(0, 0, (row % 2 - .5) * .025), bevel=.055)
    for index, x in enumerate((-.72, -.24, .24, .72)):
        z = 2.52 + .22 * (1 - abs(x) / .72)
        _cube(B, f"{name}_ArchStone", (x, .05, z), (.55, .82, .42),
              mats["stone_light" if index in (1, 2) else "stone"], collection, group,
              rotation=(0, 0, (x / .72) * .20), bevel=.055)
    _cube(B, f"{name}_Back", (0, .38, 1.12), (1.72, .24, 2.12),
          mats["soot"], collection, group, bevel=.025)
    _cube(B, f"{name}_HearthSlab", (0, -.15, .14), (2.72, 1.34, .28),
          mats["stone_light"], collection, group, bevel=.07)
    _cube(B, f"{name}_Mantel", (0, .02, 2.85), (2.80, 1.02, .28),
          mats["oak_dark"], collection, group, bevel=.065)
    for offset in (-.34, .34):
        _beam(B, f"{name}_Log", (-.58, offset * .35, .37), (.58, -offset * .35, .38),
              .18, .18, mats["oak"], collection, group, .018)
    flame = B.empty("hearth_flame" if animated else f"{name}_Unlit", collection, group, (0, -.13, .35))
    if animated:
        for index, (x, z, size, key) in enumerate(((-.28, .42, .52, "flame_red"),
                                                   (.18, .48, .64, "flame_gold"),
                                                   (0, .79, .48, "flame_yellow"))):
            _cube(B, f"{name}_Flame_{index}", (x, 0, z), (size, .12, size * 1.35),
                  mats[key], collection, flame, rotation=(0, 0, math.pi / 4), bevel=.06)
    # Kettle and hanging hook explain the hearth's cooking use.
    _beam(B, f"{name}_Crane", (.70, -.36, 1.00), (.70, -.36, 2.34),
          .09, .09, mats["iron"], collection, group, .008)
    _beam(B, f"{name}_CraneArm", (.70, -.36, 2.30), (.05, -.36, 2.30),
          .09, .09, mats["iron"], collection, group, .008)
    _cylinder(B, f"{name}_Kettle", (.05, -.36, 1.52), .30, .38, 9,
              mats["iron"], collection, group, bevel=.025)
    return group


def ladder(B, name, position, rotation, species, mats, collection, parent,
           height=3.0, width=.95, lean=.34):
    group = _group(B, name, position, rotation, collection, parent)
    wood, dark, light = _woods(mats, species)
    for side in (-1, 1):
        _beam(B, f"{name}_Stile", (side * width / 2, 0, .04),
              (side * width / 2, lean, height), .14, .14, dark, collection, group, .02)
    rung_count = max(4, int(height / .42))
    for i in range(rung_count):
        t = (i + 1) / (rung_count + 1)
        z, y = height * t, lean * t
        _cylinder(B, f"{name}_Rung_{i}", (0, y, z), .07, width + .12, 8,
                  light, collection, group, rotation=(0, math.pi / 2, 0), bevel=.012)
    return group


def barrel(B, name, position, rotation, mats, collection, parent, scale=1.0):
    group = _group(B, name, position, rotation, collection, parent)
    _cylinder(B, f"{name}_Body", (0, 0, .60 * scale), .43 * scale, 1.20 * scale, 10,
              mats["oak"], collection, group, bevel=.025)
    for z in (.16, .60, 1.04):
        _cylinder(B, f"{name}_Hoop", (0, 0, z * scale), .45 * scale, .08 * scale, 10,
                  mats["iron"], collection, group)
    _cylinder(B, f"{name}_Lid", (0, 0, 1.22 * scale), .39 * scale, .06 * scale, 10,
              mats["oak_light"], collection, group)
    return group


def storage_shelf(B, name, position, rotation, species, mats, collection, parent,
                  width=3.0, stocked=True):
    group = _group(B, name, position, rotation, collection, parent)
    wood, dark, light = _woods(mats, species)
    for x in (-width / 2 + .13, width / 2 - .13):
        _cube(B, f"{name}_Upright", (x, 0, 1.45), (.22, .58, 2.90),
              dark, collection, group, bevel=.025)
        _beam(B, f"{name}_Brace", (x, .24, .18), (x, -.24, 2.70),
              .10, .10, light, collection, group, .012)
    for z in (.22, 1.05, 1.88, 2.72):
        _cube(B, f"{name}_Shelf", (0, 0, z), (width, .72, .16),
              wood, collection, group, bevel=.025)
    if stocked:
        for row, z in enumerate((.54, 1.37, 2.20)):
            for col in range(4):
                x = -width * .34 + col * width * .23
                if (row + col) % 3 == 0:
                    _cylinder(B, f"{name}_Jar_{row}_{col}", (x, -.18, z), .18, .38,
                              8, mats["ceramic_cream"], collection, group, bevel=.015)
                    _cylinder(B, f"{name}_JarLid_{row}_{col}", (x, -.18, z + .22), .13, .06,
                              8, mats["ceramic_blue"], collection, group)
                else:
                    _cube(B, f"{name}_Bundle_{row}_{col}", (x, -.16, z),
                          (.42, .34, .34), mats["sack"], collection, group,
                          rotation=(0, 0, (col - 1.5) * .04), bevel=.09)
    return group


def lidded_chest(B, name, position, rotation, species, mats, collection, parent):
    group = _group(B, name, position, rotation, collection, parent)
    wood, dark, light = _woods(mats, species)
    _cube(B, f"{name}_Body", (0, 0, .46), (1.65, .90, .82), wood,
          collection, group, bevel=.055)
    _cube(B, f"{name}_Lid", (0, 0, .94), (1.75, .98, .22), light,
          collection, group, rotation=(.04, 0, 0), bevel=.065)
    for x in (-.63, .63):
        _cube(B, f"{name}_Band", (x, -.47, .55), (.14, .08, 1.02),
              mats["iron"], collection, group, bevel=.018)
    _cube(B, f"{name}_Lock", (0, -.51, .58), (.32, .10, .38),
          mats["brass"], collection, group, bevel=.035)
    return group


def chicken_pen(B, name, position, rotation, mats, collection, parent,
                width=4.2, depth=3.2):
    """Prepared pen with feed, water, roost, and a modelled-NPC spawn socket."""
    group = _group(B, name, position, rotation, collection, parent)
    for x in (-width / 2, width / 2):
        for y in (-depth / 2, depth / 2):
            _cylinder(B, f"{name}_Post", (x, y, .76), .12, 1.52, 7,
                      mats["oak_dark"], collection, group)
    gate_half = .68
    rails = (((-width / 2, -depth / 2, .52), (-gate_half, -depth / 2, .52)),
             ((-width / 2, -depth / 2, 1.08), (-gate_half, -depth / 2, 1.08)),
             ((gate_half, -depth / 2, .52), (width / 2, -depth / 2, .52)),
             ((gate_half, -depth / 2, 1.08), (width / 2, -depth / 2, 1.08)),
             ((-width / 2, depth / 2, .52), (width / 2, depth / 2, .52)),
             ((-width / 2, depth / 2, 1.08), (width / 2, depth / 2, 1.08)),
             ((-width / 2, -depth / 2, .52), (-width / 2, depth / 2, .52)),
             ((-width / 2, -depth / 2, 1.08), (-width / 2, depth / 2, 1.08)),
             ((width / 2, -depth / 2, .52), (width / 2, depth / 2, .52)),
             ((width / 2, -depth / 2, 1.08), (width / 2, depth / 2, 1.08)))
    for start, end in rails:
        _beam(B, f"{name}_Rail", start, end, .11, .11, mats["willow_dark"],
              collection, group, .012)
    gate = B.empty("chicken_pen_gate", collection, group, (-gate_half, -depth / 2, 0))
    for z in (.52, 1.08):
        _beam(B, f"{name}_GateRail", (0, 0, z), (gate_half * 2, 0, z),
              .12, .12, mats["willow"], collection, gate, .012)
    for x in (.08, gate_half * 2 - .08):
        _beam(B, f"{name}_GateStile", (x, 0, .20), (x, 0, 1.32),
              .12, .12, mats["willow_dark"], collection, gate, .012)
    _beam(B, f"{name}_GateBrace", (.10, -.01, .28), (gate_half * 2 - .10, -.01, 1.24),
          .10, .10, mats["willow_dark"], collection, gate, .010)
    # Designed trough with splayed legs and visible grain rim.
    _cube(B, f"{name}_Trough", (-.75, .30, .42), (1.65, .62, .42),
          mats["willow"], collection, group, bevel=.09)
    _cube(B, f"{name}_Feed", (-.75, .30, .66), (1.34, .38, .09),
          mats["grain"], collection, group, bevel=.035)
    for x in (-1.30, -.20):
        _beam(B, f"{name}_TroughLeg", (x, .05, .04), (x, .22, .34),
              .11, .11, mats["willow_dark"], collection, group)
        _beam(B, f"{name}_TroughLeg", (x, .55, .04), (x, .38, .34),
              .11, .11, mats["willow_dark"], collection, group)
    _beam(B, f"{name}_Roost", (.25, 1.02, .82), (1.50, 1.02, .82),
          .14, .14, mats["willow"], collection, group, .02)
    _beam(B, f"{name}_RoostLegA", (.40, 1.02, .08), (.52, 1.02, .76),
          .12, .12, mats["willow_dark"], collection, group)
    _beam(B, f"{name}_RoostLegB", (1.34, 1.02, .08), (1.22, 1.02, .76),
          .12, .12, mats["willow_dark"], collection, group)
    socket = B.empty("chicken_spawn_socket", collection, group, (.35, -.55, .08))
    socket["npcFamily"] = "holm_chicken"
    socket["inactiveUntilModelApproved"] = True
    return group
