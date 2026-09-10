"""Purpose-built Workyard upstairs furnishing family.

Every visible object in the surface lodge is modeled here as an authored
Blender object with a specific tutorial or story purpose.  The family avoids
anonymous furniture primitives: silhouettes use hand-drawn polygon profiles,
visible joinery, fitted contents, and canonical player scale.

Coordinates are Blender Z-up.  Builders provide the shared ``B`` helper,
materials, collection, and parent so this module can produce both the isolated
proof/catalog asset and the integrated Workyard building from one source.
"""
from __future__ import annotations

import math

import bpy
from mathutils import Vector


PLAYER_HEIGHT = 1.85
WORK_BENCH_HEIGHT = 1.10
STOOL_SEAT_HEIGHT = 0.57
LESSON_TABLE_HEIGHT = 0.97
HUTCH_HEIGHT = 2.82
BUCKET_HEIGHT = 0.78
HEARTH_HEIGHT = 3.02
HIGHEST_WALL_FIXTURE_TOP = 3.42


def _group(B, name, position, rotation, collection, parent):
    obj = B.empty(name, collection, parent, position)
    obj.rotation_euler.z = rotation
    return obj


def _flat(obj):
    for face in obj.data.polygons:
        face.use_smooth = False
    return obj


def _cube(B, name, loc, dims, material, collection, parent,
          rotation=(0, 0, 0), bevel=0):
    bpy.ops.mesh.primitive_cube_add(location=(0, 0, 0), rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    B.link(obj, collection, parent)
    obj.location = loc
    obj.data.materials.append(material)
    if bevel:
        mod = obj.modifiers.new("CR deliberate hand edge", "BEVEL")
        mod.width = bevel
        mod.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return _flat(obj)


def _cylinder(B, name, loc, radius, depth, sides, material, collection, parent,
              rotation=(0, 0, 0), bevel=0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=sides, radius=radius, depth=depth,
                                       location=(0, 0, 0), rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    B.link(obj, collection, parent)
    obj.location = loc
    obj.data.materials.append(material)
    if bevel:
        mod = obj.modifiers.new("CR deliberate hand edge", "BEVEL")
        mod.width = bevel
        mod.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return _flat(obj)


def _cone(B, name, loc, r1, r2, depth, sides, material, collection, parent,
          rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=sides, radius1=r1, radius2=r2,
                                    depth=depth, location=(0, 0, 0), rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    B.link(obj, collection, parent)
    obj.location = loc
    obj.data.materials.append(material)
    return _flat(obj)


def _beam(B, name, start, end, width, depth, material, collection, parent,
          bevel=0):
    a, b = Vector(start), Vector(end)
    direction = b - a
    obj = _cube(B, name, (a + b) * .5, (direction.length, width, depth),
                material, collection, parent)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("X", "Z")
    if bevel:
        mod = obj.modifiers.new("CR pegged beam edge", "BEVEL")
        mod.width = bevel
        mod.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def _prism_xy(B, name, points, z0, height, material, collection, parent):
    """Extrude a hand-drawn horizontal polygon; no generic box silhouette."""
    verts = [(x, y, z0) for x, y in points] + [(x, y, z0 + height) for x, y in points]
    n = len(points)
    faces = [tuple(range(n - 1, -1, -1)), tuple(range(n, n * 2))]
    faces.extend((i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n))
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(material)
    return _flat(obj)


def _prism_xz(B, name, points, y0, depth, material, collection, parent):
    """Extrude a hand-drawn upright profile toward the gameplay camera."""
    verts = [(x, y0, z) for x, z in points] + [(x, y0 + depth, z) for x, z in points]
    n = len(points)
    faces = [tuple(range(n - 1, -1, -1)), tuple(range(n, n * 2))]
    faces.extend((i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n))
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(material)
    return _flat(obj)


def _torus(B, name, loc, major, minor, material, collection, parent,
           rotation=(0, 0, 0), major_segments=10, minor_segments=4):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor,
                                    major_segments=major_segments,
                                    minor_segments=minor_segments,
                                    location=(0, 0, 0), rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    B.link(obj, collection, parent)
    obj.location = loc
    obj.data.materials.append(material)
    return _flat(obj)


def _peg(B, name, loc, material, collection, parent, radius=.055, depth=.12,
         rotation=(math.pi / 2, 0, 0)):
    return _cylinder(B, name, loc, radius, depth, 7, material, collection, parent,
                     rotation=rotation)


def _mug(B, name, loc, mats, collection, parent, blue=False):
    g = B.empty(name, collection, parent, loc)
    clay = mats["ceramic_blue" if blue else "ceramic_cream"]
    _cone(B, name + "Body", (0, 0, .14), .13, .105, .28, 9, clay, collection, g)
    _torus(B, name + "Rim", (0, 0, .285), .105, .022, mats["ceramic_blue"],
           collection, g)
    # A low-poly torus rotated on edge gives a real readable handle instead of
    # a painted-on loop.  The rear half visually disappears into the mug wall.
    handle = _torus(B, name + "Handle", (.12, 0, .15), .095, .023, clay,
                    collection, g, rotation=(math.pi / 2, 0, 0), major_segments=8)
    handle.scale.x = .76
    return g


def _plate(B, name, loc, mats, collection, parent,
           rotation=(math.radians(82), 0, 0)):
    g = B.empty(name, collection, parent, loc)
    _cylinder(B, name + "Dish", (0, 0, 0), .19, .045, 12,
              mats["ceramic_cream"], collection, g, rotation=rotation)
    _torus(B, name + "BlueRim", (0, -.025, 0), .158, .020,
           mats["ceramic_blue"], collection, g, rotation=rotation,
           major_segments=12)
    return g


def work_bench(B, position, rotation, mats, collection, parent):
    g = _group(B, "tool_bench", position, rotation, collection, parent)
    # Three deliberately different broad planks form a useful work surface.
    planks = (
        [(-1.64, -.72), (1.57, -.69), (1.64, -.27), (-1.58, -.24)],
        [(-1.58, -.21), (1.62, -.24), (1.57, .21), (-1.64, .19)],
        [(-1.62, .23), (1.55, .20), (1.64, .70), (-1.56, .73)],
    )
    worktop_materials = ("willow", "willow_light", "willow")
    for i, pts in enumerate(planks):
        _prism_xy(B, "BenchHandPlank_%d" % i, pts, .94 + i * .006, .16,
                  mats[worktop_materials[i]], collection, g)
    # Splayed, pegged trestles and stretcher explain how it stands.
    for x in (-1.08, 1.08):
        _beam(B, "BenchSplayedLeg", (x - .30, -.54, .05), (x - .12, -.34, .94),
              .16, .15, mats["oak_dark"], collection, g, .018)
        _beam(B, "BenchSplayedLeg", (x + .30, .54, .05), (x + .12, .34, .94),
              .16, .15, mats["oak_dark"], collection, g, .018)
        _beam(B, "BenchTrestle", (x, -.58, .83), (x, .58, .83), .15, .16,
              mats["oak_dark"], collection, g, .016)
        _peg(B, "BenchDrawPeg", (x, -.66, .82), mats["iron"], collection, g)
    _beam(B, "BenchLongStretcher", (-1.10, 0, .39), (1.10, 0, .39), .17, .18,
          mats["oak_dark"], collection, g, .016)
    _beam(B, "BenchFrontApron", (-1.48, -.69, .79), (1.48, -.69, .79),
          .13, .22, mats["oak_dark"], collection, g, .012)
    # Tool silhouettes are custom arranged, with clear contact on the top.
    _beam(B, "BenchHatchetHandle", (-.82, -.27, 1.145), (.28, -.12, 1.19),
          .075, .075, mats["oak_light"], collection, g, .008)
    _prism_xy(B, "BenchHatchetHead", [(.20, -.23), (.58, -.31), (.66, -.08),
                                      (.30, .03), (.18, -.05)],
              1.13, .22, mats["iron"], collection, g)
    _prism_xy(B, "BenchWhetstoneTray", [(-1.42, .12), (-.80, .09), (-.74, .47),
                                         (-1.39, .52)],
              1.105, .07, mats["oak_dark"], collection, g)
    _cylinder(B, "BenchWhetstone", (-1.08, .30, 1.20), .24, .13, 10,
              mats["stone_light"], collection, g, rotation=(math.pi / 2, 0, 0))
    for i, x in enumerate((.58, .82, 1.05)):
        _prism_xy(B, "BenchSplitWedge_%d" % i,
                  [(x - .10, .18), (x + .12, .16), (x + .08, .43), (x - .12, .38)],
                  1.105 + i * .008, .17, mats["iron" if i == 2 else "oak_light"],
                  collection, g)
    _beam(B, "BenchMalletHandle", (.28, .50, 1.14), (.92, .48, 1.18),
          .07, .07, mats["oak_light"], collection, g, .006)
    _cylinder(B, "BenchMalletHead", (.98, .48, 1.20), .15, .38, 8,
              mats["oak"], collection, g, rotation=(0, math.pi / 2, 0))
    # A complete hand-saw silhouette replaces the former ambiguous dark bar:
    # broad iron blade, individually readable teeth, and a shaped wooden grip.
    saw_blade = [(-.44, .24), (.88, .20), (1.02, .30), (.90, .38),
                 (.76, .34), (.70, .42), (.57, .35), (.50, .43),
                 (.37, .36), (.30, .44), (.17, .37), (.10, .45),
                 (-.03, .38), (-.10, .46), (-.24, .38), (-.40, .42)]
    _prism_xy(B, "BenchHandSawBlade", saw_blade, 1.125, .075,
              mats["iron_light"], collection, g)
    _prism_xy(B, "BenchHandSawGrip",
              [(-.91, .20), (-.44, .22), (-.34, .31), (-.47, .45),
               (-.83, .47), (-1.00, .36)],
              1.12, .12, mats["mahogany_dark"], collection, g)
    _prism_xy(B, "BenchHandSawGripOpening",
              [(-.78, .28), (-.51, .29), (-.48, .35), (-.60, .40), (-.80, .38)],
              1.235, .018, mats["iron"], collection, g)
    # A shallow pitch pot has a real interior lip and never floats.
    _cone(B, "BenchPitchPot", (1.36, -.42, 1.26), .17, .14, .28, 9,
          mats["ceramic_cream"], collection, g)
    _torus(B, "BenchPitchPotRim", (1.36, -.42, 1.405), .14, .022,
           mats["ceramic_blue"], collection, g)
    return g


def tool_stool(B, position, rotation, mats, collection, parent):
    g = _group(B, "workyard_tool_stool", position, rotation, collection, parent)
    _prism_xy(B, "ToolStoolSeat", [(-.48, -.28), (.42, -.30), (.49, .23),
                                    (-.38, .30)],
              .51, .13, mats["oak"], collection, g)
    for x, y in ((-.31, -.16), (.29, -.17), (-.27, .17), (.28, .15)):
        _beam(B, "ToolStoolSplayedLeg", (x * 1.18, y * 1.25, .03), (x, y, .51),
              .11, .11, mats["oak_dark"], collection, g, .012)
    _beam(B, "ToolStoolRepairStrap", (-.12, -.30, .585), (.18, -.30, .585),
          .055, .035, mats["iron"], collection, g)
    return g


def crockery_hutch(B, position, rotation, mats, collection, parent):
    g = _group(B, "workyard_crockery_hutch", position, rotation, collection, parent)
    # Two explicit mirrored side profiles keep the carcass centred. The older
    # offset-and-negative-scale construction made one side and both doors read
    # as if they floated away from the cabinet.
    left_side = [(-1.00, 0), (-.76, 0), (-.76, 2.46), (-.61, 2.65),
                 (-.34, 2.82), (-1.00, 2.82)]
    right_side = [(-x, z) for x, z in reversed(left_side)]
    _prism_xz(B, "HutchShapedSideLeft", left_side, -.34, .66,
              mats["oak"], collection, g)
    _prism_xz(B, "HutchShapedSideRight", right_side, -.34, .66,
              mats["oak"], collection, g)
    _cube(B, "HutchLowerCarcass", (0, 0, .72), (1.74, .62, 1.38),
          mats["oak_dark"], collection, g, bevel=.035)
    door_profiles = (
        [(-.83, .11), (-.06, .11), (-.06, 1.27), (-.81, 1.27)],
        [(.06, .11), (.83, .11), (.81, 1.27), (.06, 1.27)],
    )
    for index, profile in enumerate(door_profiles):
        _prism_xz(B, "HutchFittedDoor_%d" % index, profile, -.42, .10,
                  mats["oak_light"], collection, g)
        xmin, xmax = (-.83, -.06) if index == 0 else (.06, .83)
        for x in (xmin + .055, xmax - .055):
            _beam(B, "HutchDoorVerticalRail", (x, -.445, .15),
                  (x, -.445, 1.23), .055, .055, mats["oak_dark"], collection, g)
        for z in (.17, 1.20):
            _beam(B, "HutchDoorHorizontalRail", (xmin + .04, -.445, z),
                  (xmax - .04, -.445, z), .055, .055, mats["oak_dark"], collection, g)
        latch_x = -.16 if index == 0 else .16
        _peg(B, "HutchDoorLatch", (latch_x, -.48, .70), mats["brass"],
             collection, g, .05, .07)
    _cube(B, "HutchUpperBack", (0, .24, 2.05), (1.70, .10, 1.38),
          mats["oak_dark"], collection, g)
    for z in (1.42, 1.89, 2.36):
        _prism_xy(B, "HutchFittedShelf", [(-.86, -.35), (.86, -.33),
                                           (.82, .31), (-.82, .34)],
                  z, .11, mats["oak"], collection, g)
    _prism_xz(B, "HutchCarvedCrown", [(-1.08, 2.62), (-.82, 2.80),
                                       (-.28, 2.73), (0, 2.82), (.28, 2.73),
                                       (.82, 2.80), (1.08, 2.62)],
              -.38, .72, mats["oak_light"], collection, g)
    # Each plate stands in a visible rack above the shelf surface, leaned back
    # toward the carcass. Each mug begins on the same shelf rather than using a
    # free-floating row height.
    for row, shelf_z in enumerate((1.42, 1.89, 2.36)):
        plate_z = shelf_z + .255
        _plate(B, "HutchPlate_%d" % row, (-.47, -.36, plate_z), mats, collection, g)
        for x in (-.69, -.25):
            _beam(B, "HutchPlateRack", (x, -.31, shelf_z + .07),
                  (x, -.20, shelf_z + .17), .035, .035, mats["oak_dark"], collection, g)
        mug = _mug(B, "HutchMug_%d" % row, (.38, -.31, shelf_z + .065), mats,
                   collection, g, blue=row % 2 == 1)
        mug.scale = (.86, .86, .86)
    return g


def mug_shelf(B, position, rotation, mats, collection, parent):
    g = _group(B, "workyard_mug_shelf", position, rotation, collection, parent)
    _prism_xz(B, "MugShelfScallopedBack",
              [(-1.20, .06), (1.20, .06), (1.20, .42), (.90, .54),
               (.52, .47), (0, .58), (-.52, .47), (-.90, .54), (-1.20, .42)],
              0, .13, mats["oak_dark"], collection, g)
    _prism_xy(B, "MugShelfBoard", [(-1.24, -.32), (1.22, -.30),
                                    (1.18, .12), (-1.20, .15)],
              .08, .12, mats["oak"], collection, g)
    for x in (-.86, -.30, .30, .86):
        _peg(B, "MugShelfPeg", (x, -.20, -.12), mats["oak_light"], collection, g,
             .045, .36, rotation=(math.pi / 2, 0, 0))
        _peg(B, "MugShelfPegStop", (x, -.405, -.12), mats["oak_dark"], collection, g,
             .070, .07, rotation=(math.pi / 2, 0, 0))
        # The mug handle centre is locked directly around the peg centre. The
        # body hangs below the hook instead of hovering beneath it.
        mug = _mug(B, "HangingMug", (x - .12, -.34, .03), mats, collection, g,
                   blue=x > 0)
        mug.rotation_euler.x = math.pi
        mug.scale = (.80, .80, .80)
    return g


def empty_bucket(B, position, rotation, mats, collection, parent):
    g = _group(B, "workyard_empty_bucket", position, rotation, collection, parent)
    slats = 10
    for i in range(slats):
        a = math.tau * i / slats
        x, y = math.cos(a) * .37, math.sin(a) * .37
        slat = _cube(B, "BucketTaperedStave", (x, y, .38), (.22, .09, .70),
                     mats["oak_light" if i in (1, 6) else "oak"], collection, g,
                     rotation=(0, .07 * math.cos(a), a), bevel=.012)
        slat.scale.x = .88
    for z, radius in ((.13, .34), (.58, .40)):
        _torus(B, "BucketIronHoop", (0, 0, z), radius, .035, mats["iron"],
               collection, g, major_segments=10)
    _cylinder(B, "BucketVisibleInside", (0, 0, .11), .30, .05, 10,
              mats["oak_dark"], collection, g)
    _torus(B, "BucketOpenRim", (0, 0, .75), .41, .035, mats["oak_dark"],
           collection, g, major_segments=10)
    # Raised handle communicates that this is the portable waterworks bucket.
    _torus(B, "BucketHandle", (0, 0, .77), .50, .025, mats["iron"], collection, g,
           rotation=(math.pi / 2, 0, 0), major_segments=12)
    return g


def patterned_runner(B, name, position, rotation, mats, collection, parent,
                     palette="blue"):
    g = _group(B, name, position, rotation, collection, parent)
    field = mats["rug_blue" if palette == "blue" else "rug_red"]
    pts = [(-1.75, -.86), (-1.52, -.96), (1.55, -.91), (1.78, -.73),
           (1.69, .80), (1.43, .92), (-1.54, .89), (-1.78, .70)]
    _prism_xy(B, name + "HandWovenField", pts, 0, .055, field, collection, g)
    border = mats["rug_gold"]
    for x in (-1.48, 1.48):
        _cube(B, name + "LongBorder", (x, 0, .066), (.12, 1.46, .028),
              border, collection, g)
    for y in (-.67, .67):
        _cube(B, name + "EndBorder", (0, y, .066), (2.90, .12, .028),
              border, collection, g)
    for i, x in enumerate((-.90, 0, .90)):
        _prism_xy(B, name + "WovenMedallion", [(x - .28, 0), (x, -.28),
                                                (x + .28, 0), (x, .28)],
                  .064, .032, mats["rug_green" if i == 1 else "rug_gold"],
                  collection, g)
    for side in (-1, 1):
        for i in range(13):
            x = -1.44 + i * .24
            _beam(B, name + "Fringe", (x, side * .89, .035),
                  (x + ((i % 3) - 1) * .025, side * 1.04, .025),
                  .028, .025, mats["rope"], collection, g)
    return g


def hearth_rug(B, position, rotation, mats, collection, parent):
    g = _group(B, "workyard_hearth_rug", position, rotation, collection, parent)
    outer = [(math.cos(math.tau * i / 8) * 1.72,
              math.sin(math.tau * i / 8) * 1.08) for i in range(8)]
    inner = [(math.cos(math.tau * i / 8) * 1.34,
              math.sin(math.tau * i / 8) * .76) for i in range(8)]
    _prism_xy(B, "HearthRugOctagonalField", outer, 0, .055, mats["rug_red"],
              collection, g)
    _prism_xy(B, "HearthRugInset", inner, .058, .028, mats["rug_gold"],
              collection, g)
    center = [(math.cos(math.tau * i / 6) * .66,
               math.sin(math.tau * i / 6) * .42) for i in range(6)]
    _prism_xy(B, "HearthRugEmberMedallion", center, .088, .025,
              mats["rug_blue"], collection, g)
    return g


def teaching_fireplace(B, position, rotation, mats, collection, parent):
    g = _group(B, "teaching_fireplace", position, rotation, collection, parent)
    # One continuous deep cavity covers the entire arch interior.
    cavity_pts = [(-.83, .18), (-.83, 1.56), (-.62, 2.05), (-.30, 2.33),
                  (0, 2.42), (.30, 2.33), (.62, 2.05), (.83, 1.56), (.83, .18)]
    _prism_xz(B, "HearthDeepSootCavity", cavity_pts, .17, .10, mats["soot"],
              collection, g)
    _prism_xy(B, "HearthSootFloor", [(-.82, -.25), (.82, -.25),
                                      (.78, .26), (-.78, .26)],
              .20, .055, mats["soot"], collection, g)
    # Irregular fieldstone jambs and voussoirs frame, rather than tile, the opening.
    for side in (-1, 1):
        for row, z in enumerate((.30, .73, 1.16, 1.59, 1.96)):
            x = side * (1.00 + (row % 2) * .035)
            pts = [(-.26, -.19), (.25, -.17), (.29, .17), (-.22, .20)]
            stone = _prism_xy(B, "HearthJambStone", pts, z, .37,
                              mats["stone_light" if (row + (side > 0)) % 3 == 0 else "stone"],
                              collection, g)
            stone.location.x = x
    for i, angle in enumerate((138, 119, 101, 79, 61, 42)):
        a = math.radians(angle)
        x, z = math.cos(a) * .89, 1.53 + math.sin(a) * .89
        stone = _prism_xz(B, "HearthArchKeyStone",
                          [(-.27, -.18), (.27, -.16), (.23, .20), (-.22, .18)],
                          -.18, .72,
                          mats["stone_light" if i in (2, 3) else "stone"], collection, g)
        stone.location = (x, 0, z)
        stone.rotation_euler.y = math.radians(90 - angle) * .72
    _prism_xy(B, "HearthFootSlab", [(-1.48, -.72), (1.48, -.68),
                                     (1.36, .57), (-1.40, .61)],
              0, .22, mats["stone_light"], collection, g)
    _prism_xy(B, "HearthHandHewnMantel", [(-1.48, -.48), (1.43, -.45),
                                           (1.52, .44), (-1.41, .49)],
              2.72, .30, mats["oak_dark"], collection, g)
    for side in (-1, 1):
        _beam(B, "MantelCorbel", (side * 1.12, -.35, 2.30),
              (side * .92, -.35, 2.75), .18, .20, mats["oak"], collection, g, .018)
    for side in (-1, 1):
        _beam(B, "TeachingHearthLog", (-.60, side * .13, .27),
              (.57, -side * .14, .31), .17, .17, mats["oak"], collection, g, .012)
    for x in (-.44, -.15, .17, .46):
        _cylinder(B, "HearthEmber", (x, -.08, .31), .11, .08, 7,
                  mats["flame_red"], collection, g)
    flame = B.empty("hearth_flame", collection, g, (0, -.12, .32))
    for i, (x, z, r, h, key) in enumerate(((-.31, .42, .24, .72, "flame_red"),
                                            (.20, .48, .27, .86, "flame_gold"),
                                            (-.02, .69, .19, .66, "flame_yellow"))):
        _cone(B, "CozyFlame_%d" % i, (x, 0, z), r, .018, h, 6,
              mats[key], collection, flame, rotation=(0, (-.12 + i * .11), 0))
    # Cooking crane, chain links and kettle make the hearth a lesson station.
    _beam(B, "HearthCranePost", (.70, -.37, .64), (.70, -.37, 2.34),
          .09, .09, mats["iron"], collection, g, .007)
    _beam(B, "HearthCraneArm", (.70, -.37, 2.30), (-.05, -.37, 2.30),
          .09, .09, mats["iron"], collection, g, .007)
    for i in range(4):
        _torus(B, "KettleChainLink", (-.04, -.37, 2.16 - i * .16), .07, .015,
               mats["iron_light"], collection, g,
               rotation=(math.pi / 2, 0, (i % 2) * math.pi / 2), major_segments=8)
    _cone(B, "HearthKettleBody", (-.04, -.37, 1.35), .31, .23, .48, 10,
          mats["iron"], collection, g)
    _torus(B, "HearthKettleHandle", (-.04, -.37, 1.58), .30, .025,
           mats["iron_light"], collection, g, rotation=(math.pi / 2, 0, 0),
           major_segments=10)
    _cylinder(B, "HearthKettleLid", (-.04, -.37, 1.61), .17, .06, 9,
              mats["iron_light"], collection, g)
    # Fireplace set is compact and deliberately offset from the jamb.
    _cylinder(B, "HearthToolStandFoot", (1.35, -.58, .13), .22, .08, 8,
              mats["iron"], collection, g)
    _beam(B, "HearthToolStand", (1.35, -.58, .16), (1.35, -.58, 1.18),
          .055, .055, mats["iron"], collection, g)
    _beam(B, "HearthToolCross", (1.13, -.58, 1.07), (1.51, -.58, 1.07),
          .045, .045, mats["iron"], collection, g)
    _beam(B, "HearthShovelHandle", (1.17, -.60, .18), (1.17, -.60, .96),
          .045, .045, mats["iron_light"], collection, g)
    _prism_xz(B, "HearthShovelBlade", [(-.13, 0), (.13, 0), (.10, .24), (-.10, .24)],
              -.64, .07, mats["iron"], collection, g).location.x = 1.17
    _beam(B, "HearthBrushHandle", (1.49, -.60, .25), (1.49, -.60, .96),
          .045, .045, mats["oak_light"], collection, g)
    for x in (1.39, 1.45, 1.51, 1.57):
        _beam(B, "HearthBrushBristle", (x, -.60, .13), (x, -.60, .30),
              .035, .035, mats["rope"], collection, g)
    return g


def lesson_table(B, position, rotation, mats, collection, parent):
    g = _group(B, "workyard_lesson_table", position, rotation, collection, parent)
    top_pts = [(math.cos(math.tau * i / 6) * 1.16,
                math.sin(math.tau * i / 6) * .76) for i in range(6)]
    _prism_xy(B, "LessonTableSixSidedTop", top_pts, .83, .14,
              mats["willow"], collection, g)
    _cylinder(B, "LessonTableFacetedStem", (0, 0, .47), .18, .74, 8,
              mats["willow_dark"], collection, g)
    for a in (0, math.tau / 3, 2 * math.tau / 3):
        _beam(B, "LessonTableFoot", (0, 0, .20),
              (math.cos(a) * .72, math.sin(a) * .48, .06),
              .13, .13, mats["willow_dark"], collection, g, .012)
    # Three shallow trays teach dry tinder, crossed kindling, and fuel order.
    tray_centres = ((-.62, .07), (.10, -.25), (.56, .23))
    for i, (x, y) in enumerate(tray_centres):
        _prism_xy(B, "LessonKindlingTray", [(x - .30, y - .18), (x + .30, y - .17),
                                             (x + .27, y + .18), (x - .28, y + .19)],
                  .975, .055, mats["oak_dark"], collection, g)
        for j in range(i + 2):
            _beam(B, "LessonKindling", (x - .16 + j * .13, y - .08, 1.04),
                  (x + .15 - j * .08, y + .09, 1.08), .045, .045,
                  mats["oak_light"], collection, g, .004)
    return g


def lesson_stool(B, name, position, rotation, mats, collection, parent, woven=False):
    g = _group(B, name, position, rotation, collection, parent)
    if woven:
        _prism_xy(B, name + "FrameSeat", [(-.42, -.34), (.42, -.34),
                                           (.39, .34), (-.41, .34)],
                  .50, .11, mats["willow_dark"], collection, g)
        for i in range(7):
            y = -.25 + i * .083
            _beam(B, name + "WovenRush", (-.33, y, .625), (.33, y, .625),
                  .030, .025, mats["rope"], collection, g)
        for x, y in ((-.31, -.24), (.31, -.24), (-.29, .24), (.29, .24)):
            _beam(B, name + "Leg", (x * 1.15, y * 1.15, .04), (x, y, .50),
                  .10, .10, mats["willow_dark"], collection, g, .010)
    else:
        _cylinder(B, name + "SplitSeat", (0, 0, .56), .42, .13, 9,
                  mats["willow"], collection, g)
        _beam(B, name + "SeatSplit", (-.34, 0, .63), (.28, .02, .63),
              .028, .018, mats["willow_dark"], collection, g)
        for a in (0, math.tau / 3, 2 * math.tau / 3):
            _beam(B, name + "Leg", (math.cos(a) * .31, math.sin(a) * .31, .04),
                  (math.cos(a) * .17, math.sin(a) * .17, .51),
                  .105, .105, mats["willow_dark"], collection, g, .010)
    return g


def firemaking_board(B, position, rotation, mats, collection, parent):
    g = _group(B, "firemaking_board", position, rotation, collection, parent)
    panel_pts = [(-1.04, .02), (1.02, .02), (1.10, 1.66), (.72, 1.89),
                 (0, 1.78), (-.72, 1.89), (-1.10, 1.62)]
    _prism_xz(B, "FireBoardHandCutPanel", panel_pts, 0, .11, mats["board"],
              collection, g)
    # Pegged frame and three tactile topology diagrams: tinder, airflow, fuel.
    for x in (-1.09, 1.09):
        _beam(B, "FireBoardFrame", (x, -.04, .04), (x, -.04, 1.72),
              .13, .13, mats["oak_dark"], collection, g, .012)
        _peg(B, "FireBoardPeg", (x, -.12, .23), mats["iron"], collection, g)
    _beam(B, "FireBoardTopRail", (-1.05, -.04, 1.76), (1.05, -.04, 1.76),
          .13, .13, mats["oak_dark"], collection, g, .012)
    # Relief marks are chunky enough to read at gameplay camera and contain no text.
    for i, cx in enumerate((-.67, 0, .67)):
        if i == 0:
            for a in (-.45, .45):
                _beam(B, "TinderCross", (cx - .24, -.08, .32),
                      (cx + .24, -.08, .95), .045, .035, mats["chalk"],
                      collection, g)
                cx += a * .01
        elif i == 1:
            for z, w in ((.32, .48), (.58, .36), (.82, .22)):
                _beam(B, "AirflowChevron", (cx - w / 2, -.08, z),
                      (cx, -.08, z + .20), .04, .03, mats["chalk"], collection, g)
                _beam(B, "AirflowChevron", (cx, -.08, z + .20),
                      (cx + w / 2, -.08, z), .04, .03, mats["chalk"], collection, g)
        else:
            for j, z in enumerate((.34, .56, .78)):
                _beam(B, "FuelOrder", (cx - .24 + j * .05, -.08, z),
                      (cx + .24 - j * .05, -.08, z), .05, .035,
                      mats["chalk"], collection, g)
    return g


def storm_tally(B, position, rotation, mats, collection, parent):
    g = _group(B, "storm_tally_beam", position, rotation, collection, parent)
    pts = [(-1.22, -.16), (1.16, -.14), (1.24, .12), (.92, .21),
           (-.90, .18), (-1.25, .08)]
    _prism_xy(B, "StormTallyHandHewnBeam", pts, -.13, .34,
              mats["oak_dark"], collection, g)
    for i in range(11):
        x = -1.02 + i * .19
        _prism_xz(B, "StormTallyCut", [(x - .025, -.09), (x + .025, -.09),
                                        (x + .012, .11), (x - .04, .10)],
                  -.19, .045, mats["soot"], collection, g).rotation_euler.z = (
                      .48 if i in (4, 9) else -.06 + (i % 3) * .05)
    _peg(B, "StormTallyWallPeg", (-1.07, -.22, .04), mats["iron"], collection, g)
    _peg(B, "StormTallyWallPeg", (1.02, -.22, .04), mats["iron"], collection, g)
    return g


def net_rack(B, position, rotation, mats, collection, parent):
    """Freestanding fishing-preparation cluster, not a wall decoration.

    The low crate, stacked wooden buoys, rope coil, A-frame and hanging net
    match the approved Nano Banana concept while keeping every component at
    player scale and readable from the elevated gameplay camera.
    """
    g = _group(B, "net_rack", position, rotation, collection, parent)

    crate = B.empty("ShoreBuoyCrate", collection, g, (-.92, .02, 0))
    _cube(B, "CrateShadowedBottom", (0, 0, .10), (1.18, .72, .10),
          mats["oak_dark"], collection, crate, bevel=.018)
    for i, z in enumerate((.18, .39, .60)):
        # Unequal slat widths and alternating fresh/worn oak stop the crate
        # reading as one beveled box.
        material = mats["oak_light" if i == 1 else "oak"]
        _cube(B, "CrateFrontSlat", (0, -.42, z), (1.30, .11, .15),
              material, collection, crate, rotation=(0, 0, (-1 + i) * .012))
        _cube(B, "CrateRearSlat", (0, .42, z + .012), (1.30, .11, .15),
              mats["oak"], collection, crate, rotation=(0, 0, (1 - i) * .010))
        _cube(B, "CrateLeftSlat", (-.65, 0, z - .008), (.11, .73, .15),
              material, collection, crate)
        _cube(B, "CrateRightSlat", (.65, 0, z + .006), (.11, .73, .15),
              mats["oak"], collection, crate)
    for x in (-.68, .68):
        for y in (-.44, .44):
            _cube(B, "CrateCornerPost", (x, y, .42), (.13, .13, .78),
                  mats["oak_dark"], collection, crate, bevel=.012)

    def buoy(name, loc, color, lean):
        root = B.empty(name, collection, crate, loc)
        root.rotation_euler = lean
        _cone(B, name + "Lower", (0, 0, .16), .13, .235, .32, 8,
              color, collection, root)
        _cone(B, name + "Upper", (0, 0, .44), .235, .105, .30, 8,
              color, collection, root)
        _cylinder(B, name + "IronBand", (0, 0, .31), .24, .085, 8,
                  mats["iron"], collection, root)
        _cylinder(B, name + "Stem", (0, 0, .64), .055, .20, 7,
                  mats["oak_dark"], collection, root)

    # The cork bodies sit on the crate floor and lean against one another. The
    # earlier roots began above the top slat, making the buoys read as hovering.
    buoy("RedCorkBuoy", (-.35, -.05, .18), mats["rug_red"], (.18, -.22, -.17))
    buoy("BlueCorkBuoy", (.05, .08, .16), mats["rug_blue"], (-.14, .16, .11))
    buoy("OchreCorkBuoy", (.36, -.02, .18), mats["rug_gold"], (.17, .19, -.12))
    buoy("WornCorkBuoy", (-.08, .20, .17), mats["oak_light"], (-.14, -.15, .20))

    # Rope is a separate, grounded object at the foot of the crate.
    for i in range(3):
        _torus(B, "CoiledHempRope", (-.88, -.92, .095 + i * .026),
               .27 + i * .035, .026, mats["rope"], collection, g,
               major_segments=12, minor_segments=4)
    _beam(B, "LooseRopeTail", (-.55, -.93, .10), (-.10, -1.04, .075),
          .035, .030, mats["rope"], collection, g)

    # Short A-frame net stand: its floor contacts and rear kick legs make the
    # support believable without placing another visual wall across the yard.
    left, right, front_y = -.05, 1.82, .03
    _beam(B, "NetFrameLeftPost", (left, front_y, .02), (left + .12, front_y, 1.72),
          .105, .11, mats["oak_dark"], collection, g, .012)
    _beam(B, "NetFrameRightPost", (right, front_y, .02), (right - .12, front_y, 1.72),
          .105, .11, mats["oak_dark"], collection, g, .012)
    _beam(B, "NetFrameTopRail", (left + .04, front_y, 1.67),
          (right - .04, front_y, 1.67), .11, .11, mats["oak"], collection, g, .012)
    _beam(B, "NetFrameLeftKick", (left + .08, front_y, 1.02),
          (left - .28, .48, .02), .075, .075, mats["oak"], collection, g)
    _beam(B, "NetFrameRightKick", (right - .08, front_y, 1.02),
          (right + .28, .48, .02), .075, .075, mats["oak"], collection, g)
    _beam(B, "NetFrameFootRail", (left - .26, .46, .04),
          (right + .26, .46, .04), .07, .07, mats["oak_dark"], collection, g)

    # Two crossing cord families create a legible diamond weave. Starting a
    # few lines outside the bounds lets the clipped diagonals fill both edges.
    net_left, net_right, net_top, net_bottom = .14, 1.63, 1.49, .34
    for i in range(10):
        x = net_left - .62 + i * .27
        ax, bx = max(net_left, x), min(net_right, x + .68)
        if bx > ax:
            t0, t1 = (ax - x) / .68, (bx - x) / .68
            _beam(B, "TeachingNetCord", (ax, -.035, net_top - (net_top - net_bottom) * t0),
                  (bx, -.035, net_top - (net_top - net_bottom) * t1),
                  .022, .020, mats["rope"], collection, g)
        ax, bx = max(net_left, x), min(net_right, x + .68)
        if bx > ax:
            t0, t1 = (ax - x) / .68, (bx - x) / .68
            _beam(B, "TeachingNetCord", (ax, -.015, net_bottom + (net_top - net_bottom) * t0),
                  (bx, -.015, net_bottom + (net_top - net_bottom) * t1),
                  .022, .020, mats["rope"], collection, g)
    for x in (.22, .55, .88, 1.21, 1.54):
        _cylinder(B, "TeachingNetFloat", (x, -.055, net_top + .02), .065, .13, 7,
                  mats["oak_light"], collection, g, rotation=(math.pi / 2, 0, 0))
        _cone(B, "TeachingNetWeight", (x, -.045, net_bottom - .08), .065, .045,
              .14, 6, mats["iron"], collection, g)
    return g


def storm_warden_relief(B, position, rotation, mats, collection, parent):
    g = _group(B, "workyard_storm_warden_relief", position, rotation, collection, parent)
    # Wide landscape proportions keep the top safely below the tall wall cap.
    _prism_xz(B, "WardenReliefPanel", [(-1.02, 0), (1.02, 0), (1.08, 1.36),
                                       (.76, 1.50), (-.82, 1.47), (-1.08, 1.30)],
              0, .09, mats["painting_sky"], collection, g)
    for x in (-1.12, 1.12):
        _beam(B, "WardenReliefFrame", (x, -.05, -.06), (x, -.05, 1.46),
              .15, .15, mats["mahogany_dark"], collection, g, .015)
    _beam(B, "WardenReliefFrame", (-1.13, -.05, -.03), (1.13, -.05, -.03),
          .15, .15, mats["mahogany_dark"], collection, g, .015)
    _beam(B, "WardenReliefFrame", (-1.13, -.05, 1.45), (1.13, -.05, 1.45),
          .15, .15, mats["mahogany_dark"], collection, g, .015)
    # Original chunky relief: a cloaked storm warden watching a wave-marker.
    _prism_xz(B, "WardenCloak", [(-.34, .18), (.34, .18), (.28, .92),
                                  (.12, 1.12), (-.16, 1.12), (-.28, .84)],
              -.10, .08, mats["rug_red"], collection, g)
    _cylinder(B, "WardenHelm", (0, -.13, 1.14), .19, .08, 7,
              mats["iron_light"], collection, g, rotation=(math.pi / 2, 0, 0))
    _beam(B, "WardenSpear", (.28, -.15, .12), (.55, -.15, 1.28),
          .045, .04, mats["rug_gold"], collection, g)
    for i in range(3):
        _beam(B, "WardenStormWave", (-.90 + i * .19, -.13, .22 + i * .12),
              (-.46 + i * .18, -.13, .20 + i * .10), .05, .04,
              mats["ceramic_blue"], collection, g)
    return g


def build_surface_family(B, mats, collection, building_root, scenery_parent):
    """Build the exact integrated surface layout and return semantic roots."""
    roots = {}
    roots["tool_bench"] = work_bench(B, (-6.15, -.95, 0), 0, mats, collection, building_root)
    roots["firemaking_board"] = firemaking_board(
        B, (-8.80, 2.08, 1.36), math.pi / 2, mats, collection, building_root)
    roots["storm_tally_beam"] = storm_tally(
        B, (-3.42, 5.74, 3.06), 0, mats, collection, building_root)
    roots["net_rack"] = net_rack(
        B, (5.05, -2.65, .225), 0, mats, collection, building_root)
    roots["teaching_fireplace"] = teaching_fireplace(
        B, (5.0, 4.93, .18), 0, mats, collection, building_root)

    roots["workyard_crockery_hutch"] = crockery_hutch(
        B, (-8.52, 4.32, .18), math.pi / 2, mats, collection, scenery_parent)
    roots["workyard_mug_shelf"] = mug_shelf(
        B, (-4.10, 5.78, 2.48), 0, mats, collection, scenery_parent)
    roots["workyard_empty_bucket"] = empty_bucket(
        B, (-7.42, 3.20, .18), -.14, mats, collection, scenery_parent)
    roots["workyard_tool_stool"] = tool_stool(
        B, (-4.48, -.10, .18), -.20, mats, collection, scenery_parent)
    roots["workyard_lodge_rug"] = patterned_runner(
        B, "workyard_lodge_rug", (-4.86, 1.38, .20), 0, mats, collection,
        scenery_parent, "blue")
    roots["workyard_storm_warden_relief"] = storm_warden_relief(
        B, (-6.58, 5.78, 1.60), 0, mats, collection, scenery_parent)
    roots["workyard_hearth_rug"] = hearth_rug(
        B, (5.0, 2.28, .20), 0, mats, collection, scenery_parent)
    roots["workyard_lesson_table"] = lesson_table(
        B, (4.95, .57, .19), 0, mats, collection, scenery_parent)
    roots["workyard_hearth_stool_splitter"] = lesson_stool(
        B, "workyard_hearth_stool_splitter", (3.56, .28, .19), .20, mats,
        collection, scenery_parent, False)
    roots["workyard_hearth_stool_woven"] = lesson_stool(
        B, "workyard_hearth_stool_woven", (6.30, .33, .19), -.18, mats,
        collection, scenery_parent, True)
    return roots


def build_catalog_family(B, mats, collection, root):
    """Three proof bays matching the three Nano Banana reference boards."""
    workstation = B.empty("catalog_workstation_family", collection, root, (-7.0, 0, 0))
    work_bench(B, (0, -1.05, 0), 0, mats, collection, workstation)
    crockery_hutch(B, (-2.15, 1.25, 0), 0, mats, collection, workstation)
    mug_shelf(B, (0, 2.05, 2.26), 0, mats, collection, workstation)
    empty_bucket(B, (1.35, 1.65, 0), 0, mats, collection, workstation)
    tool_stool(B, (2.05, -.20, 0), .15, mats, collection, workstation)

    hearth = B.empty("catalog_hearth_family", collection, root, (0, 0, 0))
    teaching_fireplace(B, (0, 1.55, 0), 0, mats, collection, hearth)
    hearth_rug(B, (0, -.20, .02), 0, mats, collection, hearth)
    lesson_table(B, (0, -1.80, 0), 0, mats, collection, hearth)
    lesson_stool(B, "workyard_hearth_stool_splitter", (-1.55, -1.95, 0), .2,
                 mats, collection, hearth, False)
    lesson_stool(B, "workyard_hearth_stool_woven", (1.55, -1.95, 0), -.2,
                 mats, collection, hearth, True)

    story = B.empty("catalog_story_textiles_family", collection, root, (7.0, 0, 0))
    firemaking_board(B, (-1.65, 1.90, .35), 0, mats, collection, story)
    storm_tally(B, (1.35, 2.20, 2.65), 0, mats, collection, story)
    net_rack(B, (1.55, 1.75, 2.20), 0, mats, collection, story)
    storm_warden_relief(B, (-1.45, -.15, 1.10), 0, mats, collection, story)
    patterned_runner(B, "workyard_lodge_rug", (1.10, -.85, .02), 0, mats,
                     collection, story, "blue")
    hearth_rug(B, (1.15, -2.18, .02), 0, mats, collection, story)
    return {"workstation": workstation, "hearth": hearth, "story": story}
