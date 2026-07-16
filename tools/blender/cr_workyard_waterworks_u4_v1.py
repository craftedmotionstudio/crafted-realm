"""Purpose-built Workyard U4 waterworks dock and bucket-pulley family.

An L-shaped medieval pond dock leaves the Workyard shore (+X), turns right at
a corner work platform, and lands on the adjacent bank (-Y).  Every plank,
pile, brace, rail, and pulley part is authored here with hand-drawn profiles,
deterministic jitter, and explicit contact.  The bucket-pulley station carries
three named Blender clips (Pulley_Idle / Pulley_Lower / Pulley_Lift) whose
rope length, bucket height, and crank rotation stay mathematically linked so
nothing detaches in any keyed pose.

Local frame: root pivot at the shore entry walking surface.  Deck top z = 0,
assumed water plane z = -0.50, front (game south) is Blender -Y.
"""
from __future__ import annotations

import math

import bpy
from mathutils import Matrix, Vector


PLAYER_HEIGHT = 1.85
DECK_WIDTH = 2.0
CLEAR_LANE = 1.8
DECK_OVER_WATER = 0.50
WATER_Z = -0.50
FRAME_HEIGHT = 2.17
CRANK_GRIP_HEIGHT = 1.52
BUCKET_HEIGHT = 0.50
DOCK_EXTENT_EW = 6.6
DOCK_EXTENT_NS = 6.7

# Pulley line geometry (all in the local frame above).
ROPE_TOP = (5.0, 1.46, 2.02)
ROPE_REST_LENGTH = 1.14
BUCKET_REST_Z = 0.88          # bucket group origin (hook engage point) at rest
BUCKET_CONTACT_Z = 0.25       # bucket base touches the water plane
BUCKET_LOWERED_Z = 0.13       # fully dipped
DRUM_RADIUS = 0.14

# Animation contract (24 fps).  Frames are inclusive key positions.
FPS = 24
IDLE_KEYS = (1, 73)
LOWER_KEYS = (1, 42, 49)
LIFT_KEYS = (1, 53, 55, 57)
IDLE_SECONDS = round((IDLE_KEYS[-1] - 1) / FPS, 4)          # 3.0
LOWER_SECONDS = round((LOWER_KEYS[-1] - 1) / FPS, 4)        # 2.0
LIFT_SECONDS = round((LIFT_KEYS[-1] - 1) / FPS, 4)          # 2.3333
WATER_CONTACT_NORMALIZED = round((LOWER_KEYS[1] - 1) / (LOWER_KEYS[-1] - 1), 4)  # 0.8542
COMMIT_NORMALIZED = round((LIFT_KEYS[1] - 1) / (LIFT_KEYS[-1] - 1), 4)           # 0.9286

CLIP_IDLE = "Pulley_Idle"
CLIP_LOWER = "Pulley_Lower"
CLIP_LIFT = "Pulley_Lift"


def extend_materials(mat, mats):
    """Warm water-adjacent additions to the shared Workyard palette."""
    mats["deck_weathered"] = mat("CR Workyard Deck Weathered", (.46, .35, .21))
    mats["deck_bleached"] = mat("CR Workyard Deck Bleached", (.60, .50, .32))
    mats["pile_wet"] = mat("CR Workyard Pile Waterline", (.155, .115, .075))
    mats["endgrain"] = mat("CR Workyard Pale Endgrain", (.755, .655, .445))
    return mats


def _j(i, k, amp):
    """Deterministic hand jitter — never random per build."""
    return amp * math.sin(i * 2.7 + k * 1.31)


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
              rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=sides, radius=radius, depth=depth,
                                       location=(0, 0, 0), rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    B.link(obj, collection, parent)
    obj.location = loc
    obj.data.materials.append(material)
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


def _peg(B, name, loc, material, collection, parent, radius=.045, depth=.11,
         rotation=(math.pi / 2, 0, 0)):
    return _cylinder(B, name, loc, radius, depth, 7, material, collection, parent,
                     rotation=rotation)


def _plank(B, name, center_x, center_y, along, length, width, tone, mats,
           collection, parent, seed, lift=0.0):
    """One hand-cut deck plank: a jittered quad, never a clean box."""
    half_l, half_w = length / 2, width / 2
    if along == "y":
        pts = [(center_x - half_w + _j(seed, 1, .015), center_y - half_l + _j(seed, 2, .04)),
               (center_x + half_w + _j(seed, 3, .015), center_y - half_l + _j(seed, 4, .04)),
               (center_x + half_w + _j(seed, 5, .015), center_y + half_l + _j(seed, 6, .04)),
               (center_x - half_w + _j(seed, 7, .015), center_y + half_l + _j(seed, 8, .04))]
    else:
        pts = [(center_x - half_l + _j(seed, 1, .04), center_y - half_w + _j(seed, 2, .015)),
               (center_x + half_l + _j(seed, 3, .04), center_y - half_w + _j(seed, 4, .015)),
               (center_x + half_l + _j(seed, 5, .04), center_y + half_w + _j(seed, 6, .015)),
               (center_x - half_l + _j(seed, 7, .04), center_y + half_w + _j(seed, 8, .015))]
    return _prism_xy(B, name, pts, -.085 + lift, .085, mats[tone], collection, parent)


PLANK_TONES = ("deck_weathered", "oak", "deck_bleached", "oak", "deck_weathered",
               "oak_light", "oak", "deck_weathered", "deck_bleached", "oak",
               "deck_weathered", "oak", "oak_light")


def _pile(B, name, x, y, mats, collection, parent, seed, proud=0.0):
    """Driven timber pile: tapered, slightly tilted, waterline-stained."""
    top = .16 + proud
    depth = top + 1.44
    pile = _cone(B, name, (x, y, top - depth / 2), .135, .105, depth,
                 7 + (seed % 2), mats["oak_dark"], collection, parent,
                 rotation=(_j(seed, 3, .025), _j(seed, 5, .025), 0))
    _cone(B, name + "Waterline", (x, y, -.55), .142, .128, .42, 7 + (seed % 2),
          mats["pile_wet"], collection, parent,
          rotation=(_j(seed, 3, .025), _j(seed, 5, .025), 0))
    if proud > 0:
        _cylinder(B, name + "ProudCap", (x, y, top + .015), .105, .035,
                  7 + (seed % 2), mats["endgrain"], collection, parent)
        _torus(B, name + "IronBand", (x, y, top - .09), .124, .018, mats["iron"],
               collection, parent, major_segments=9)
    return pile


def _rope_rail(B, name, posts, mats, collection, parent):
    """Low rope-and-post rail: carved posts, two sagging rope segments."""
    for i, (x, y) in enumerate(posts):
        _cube(B, name + "RailPost", (x, y, .42), (.09, .09, .84),
              mats["oak_dark"], collection, parent, bevel=.010)
        _cube(B, name + "RailPostCap", (x, y, .875), (.12, .12, .05),
              mats["oak"], collection, parent, bevel=.008)
        _peg(B, name + "RailPeg", (x, y, .06), mats["iron"], collection, parent,
             .032, .085, rotation=(0, math.pi / 2, 0))
    for (x0, y0), (x1, y1) in zip(posts, posts[1:]):
        mid = ((x0 + x1) / 2, (y0 + y1) / 2, .655)
        _beam(B, name + "RopeSag", (x0, y0, .80), mid, .045, .045,
              mats["rope"], collection, parent)
        _beam(B, name + "RopeSag", mid, (x1, y1, .80), .045, .045,
              mats["rope"], collection, parent)


def _shore_stones(B, name, spots, mats, collection, parent):
    for i, (x, y, r) in enumerate(spots):
        pts = [(x + math.cos(a) * r * (1 + _j(i, s, .16)),
                y + math.sin(a) * r * (1 + _j(i, s + 3, .16)))
               for s, a in enumerate(math.tau * t / 6 for t in range(6))]
        _prism_xy(B, name + "FootStone", pts, -.30, .34 + _j(i, 9, .05),
                  mats["stone_light" if i % 2 else "stone"], collection, parent)


def dock_shore_span(B, mats, collection, parent):
    g = _group(B, "dock_shore_span", (0, 0, 0), 0, collection, parent)
    for i in range(13):
        _plank(B, "ShorePlank_%d" % i, .16 + i * .295, 0, "y", DECK_WIDTH,
               .255, PLANK_TONES[i], mats, collection, g, i,
               lift=.006 if i == 7 else 0)
    for y in (-.78, 0, .78):
        _beam(B, "ShoreBearer", (0, y, -.14), (3.95, y, -.14), .16, .11,
              mats["oak_dark"], collection, g, .012)
    for i, x in enumerate((.32, 1.58, 2.84)):
        for side, y in ((-1, -.90), (1, .90)):
            _pile(B, "ShorePile_%d%s" % (i, "N" if side > 0 else "S"),
                  x + _j(i, side, .05), y, mats, collection, g, i * 2 + (side > 0))
    for side in (-.90, .90):
        _beam(B, "ShoreBrace", (.32, side, -.82), (1.58, side, -.20), .085, .075,
              mats["oak"], collection, g)
        _beam(B, "ShoreBrace", (2.84, side, -.82), (1.58, side, -.20), .085, .075,
              mats["oak"], collection, g)
    _rope_rail(B, "ShoreN", ((.55, .95), (1.70, .95), (2.85, .95)), mats,
               collection, g)
    _rope_rail(B, "ShoreS", ((1.35, -.95), (2.60, -.95)), mats, collection, g)
    _beam(B, "ShoreThreshold", (.02, -1.02, -.03), (.02, 1.02, -.03), .14, .10,
          mats["oak_dark"], collection, g, .012)
    _shore_stones(B, "Shore", ((-.22, -.72, .20), (-.30, .05, .24),
                               (-.20, .78, .19)), mats, collection, g)
    return g


def dock_turn_platform(B, mats, collection, parent):
    g = _group(B, "dock_turn_platform", (0, 0, 0), 0, collection, parent)
    # Decking turns 90 degrees at the corner — the visual cue for the L bend.
    for j in range(7):
        _plank(B, "TurnPlank_%d" % j, 5.0, -.90 + j * .30, "x", 2.16,
               .26, PLANK_TONES[(j * 2 + 1) % 13], mats, collection, g, j + 20)
    for x in (4.10, 5.90):
        _beam(B, "TurnBearer", (x, -1.12, -.14), (x, 1.12, -.14), .16, .11,
              mats["oak_dark"], collection, g, .012)
    for i, (x, y, proud) in enumerate(((4.06, 1.02, .22), (5.94, 1.02, 0),
                                        (4.06, -1.02, 0), (5.94, -1.02, .22))):
        _pile(B, "TurnPile_%d" % i, x, y, mats, collection, g, i + 30, proud)
    # Crossed brace on the open east face, matching the concept's corner read.
    _beam(B, "TurnCrossBrace", (5.94, -.96, -.95), (5.94, .96, -.18), .085, .075,
          mats["oak"], collection, g)
    _beam(B, "TurnCrossBrace", (5.94, .96, -.95), (5.94, -.96, -.18), .085, .075,
          mats["oak"], collection, g)
    _rope_rail(B, "TurnE", ((6.05, .55), (6.05, -.55)), mats, collection, g)
    # Structural junction sills close the decking seams where the plank
    # direction turns at the corner platform.
    _beam(B, "TurnJunctionSill", (3.87, -1.04, -.035), (3.87, 1.04, -.035),
          .13, .09, mats["oak_dark"], collection, g, .010)
    _beam(B, "TurnJunctionSill", (4.03, -1.115, -.035), (6.07, -1.115, -.035),
          .13, .09, mats["oak_dark"], collection, g, .010)
    return g


def dock_bank_span(B, mats, collection, parent):
    g = _group(B, "dock_bank_span", (0, 0, 0), 0, collection, parent)
    for j in range(11):
        _plank(B, "BankPlank_%d" % j, 5.05, -1.28 - j * .295, "x", DECK_WIDTH,
               .255, PLANK_TONES[(j + 4) % 13], mats, collection, g, j + 40,
               lift=.006 if j == 6 else 0)
    for x in (4.28, 5.05, 5.82):
        _beam(B, "BankBearer", (x, -1.15, -.14), (x, -4.62, -.14), .16, .11,
              mats["oak_dark"], collection, g, .012)
    for i, y in enumerate((-1.85, -3.15, -4.42)):
        for side, x in ((-1, 4.14), (1, 5.96)):
            _pile(B, "BankPile_%d%s" % (i, "E" if side > 0 else "W"),
                  x, y + _j(i, side, .05), mats, collection, g, i * 2 + 50 + (side > 0))
    for x in (4.14, 5.96):
        _beam(B, "BankBrace", (x, -1.85, -.82), (x, -3.15, -.20), .085, .075,
              mats["oak"], collection, g)
        _beam(B, "BankBrace", (x, -4.42, -.82), (x, -3.15, -.20), .085, .075,
              mats["oak"], collection, g)
    _rope_rail(B, "BankW", ((4.05, -1.60), (4.05, -2.70), (4.05, -3.80)), mats,
               collection, g)
    _beam(B, "BankThreshold", (4.02, -4.55, -.03), (6.08, -4.55, -.03), .14, .10,
          mats["oak_dark"], collection, g, .012)
    _shore_stones(B, "Bank", ((4.45, -4.80, .21), (5.15, -4.88, .24),
                              (5.80, -4.78, .19)), mats, collection, g)
    return g


def pulley_frame(B, mats, collection, parent):
    g = _group(B, "pulley_frame", (0, 0, 0), 0, collection, parent)
    for x in (4.72, 5.28):
        _cube(B, "FramePost", (x, .95, .975), (.11, .11, 1.95), mats["oak_dark"],
              collection, g, bevel=.012)
        _beam(B, "FrameBackBrace", (x, .42, .02), (x, .90, 1.18), .09, .08,
              mats["oak"], collection, g, .010)
        _prism_xy(B, "FrameFootBracket",
                  [(x - .09, .84), (x + .09, .84), (x + .07, 1.06), (x - .07, 1.06)],
                  0, .05, mats["iron"], collection, g)
        _peg(B, "FramePeg", (x, .89, 1.62), mats["iron"], collection, g)
    _cube(B, "FrameCrossbeam", (5.0, .95, 2.0), (.98, .12, .12), mats["oak"],
          collection, g, bevel=.012)
    _beam(B, "FrameJib", (5.0, .70, 2.11), (5.0, 1.56, 2.11), .10, .10,
          mats["oak_dark"], collection, g, .010)
    _beam(B, "FrameJibBrace", (5.0, 1.44, 2.04), (5.0, .98, 1.66), .07, .06,
          mats["oak"], collection, g)
    # Guide wheel hung from the jib tip in two iron cheek plates.
    for x in (4.955, 5.045):
        _cube(B, "GuideCheekPlate", (x, 1.45, 2.055), (.018, .11, .13),
              mats["iron"], collection, g)
    _cylinder(B, "GuideWheel", (5.0, 1.40, 2.02), .07, .05, 9, mats["oak_light"],
              collection, g, rotation=(0, math.pi / 2, 0))
    _cylinder(B, "GuideAxle", (5.0, 1.40, 2.02), .022, .13, 7, mats["iron_light"],
              collection, g, rotation=(0, math.pi / 2, 0))
    # Cantilevered set-down ledge beside the crank.  It sits deliberately EAST
    # of the bucket's vertical drop line so the lowering bucket never clips it;
    # the operator lands the bucket here by hand between lessons.
    _prism_xy(B, "BucketLedge",
              [(5.30 + _j(1, 1, .02), 1.14), (5.84 + _j(2, 3, .02), 1.16),
               (5.80, 1.68), (5.34, 1.66)],
              .06, .07, mats["deck_weathered"], collection, g)
    for x in (5.40, 5.72):
        _beam(B, "LedgeBracket", (x, 1.06, -.05), (x, 1.52, .04), .06, .055,
              mats["oak_dark"], collection, g)
    return g


def pulley_crank(B, mats, collection, parent):
    g = B.empty("pulley_crank", collection, parent, (5.0, .95, 1.72))
    _cylinder(B, "WinchDrum", (0, 0, 0), DRUM_RADIUS, .46, 9, mats["oak"],
              collection, g, rotation=(0, math.pi / 2, 0))
    for x in (-.245, .245):
        _cylinder(B, "DrumFlange", (x, 0, 0), .185, .04, 9, mats["oak_dark"],
                  collection, g, rotation=(0, math.pi / 2, 0))
    _cylinder(B, "WinchAxle", (0, 0, 0), .042, .92, 7, mats["iron"],
              collection, g, rotation=(0, math.pi / 2, 0))
    for i, x in enumerate((-.075, 0, .075)):
        _torus(B, "DrumRopeWrap", (x, 0, 0), .147, .022, mats["rope"],
               collection, g, rotation=(0, math.pi / 2, 0), major_segments=9)
    # Offset crank arm and worn grip on the east side, at working height.
    # The whole handle sits outboard of the crossbeam end so the grip's full
    # rotation circle clears every frame member in every keyed pose.
    _beam(B, "CrankArm", (.47, 0, 0), (.47, .11, -.20), .055, .05,
          mats["iron"], collection, g)
    _cylinder(B, "CrankGrip", (.555, .11, -.20), .036, .17, 7, mats["oak_light"],
              collection, g, rotation=(0, math.pi / 2, 0))
    return g


def pulley_rope(B, mats, collection, parent):
    g = B.empty("pulley_rope", collection, parent)
    _beam(B, "RopeFeed", (5.0, .95, 1.87), (5.0, 1.40, 2.075), .055, .055,
          mats["rope"], collection, g)
    # RopeFall's origin sits at the guide tangent; Pulley clips scale it in Z.
    fall = _cylinder(B, "RopeFall", (0, 0, 0), .034, ROPE_REST_LENGTH, 7,
                     mats["rope"], collection, g)
    fall.data.transform(Matrix.Translation((0, 0, -ROPE_REST_LENGTH / 2)))
    fall.location = ROPE_TOP
    return g


def pulley_bucket(B, mats, collection, parent):
    """Lesson bucket + hook.  Group origin = hook engage point (sway pivot)."""
    g = B.empty("pulley_bucket", collection, parent,
                (ROPE_TOP[0], ROPE_TOP[1], BUCKET_REST_Z))
    _cylinder(B, "HookLink", (0, 0, -.03), .020, .07, 7, mats["iron_light"],
              collection, g)
    _torus(B, "HookCurl", (0, 0, -.095), .048, .015, mats["iron"], collection, g,
           rotation=(0, math.pi / 2, 0), major_segments=9)
    # Arched iron bail engaged by the hook.
    bail = _torus(B, "BucketBail", (0, 0, -.29), .175, .017, mats["iron"],
                  collection, g, rotation=(math.pi / 2, 0, 0),
                  major_segments=10)
    bail.scale.z = .92
    for x in (-.168, .168):
        _peg(B, "BailEar", (x, 0, -.44), mats["iron"], collection, g, .026, .05,
             rotation=(0, math.pi / 2, 0))
    # Individually tapered staves with an honest open top and real depth.
    # Staves overlap slightly so the barrel reads solid, never cage-like.
    for i in range(9):
        a = math.tau * i / 9
        x, y = math.cos(a) * .148, math.sin(a) * .148
        _cube(B, "BucketStave", (x, y, -.50), (.130, .062, .50),
              mats["oak_light" if i in (2, 6) else "oak"], collection, g,
              rotation=(0, .045 * math.cos(a), a), bevel=.008)
    for z, r in ((-.66, .148), (-.34, .158)):
        _torus(B, "BucketIronHoop", (0, 0, z), r + .012, .016, mats["iron"],
               collection, g, major_segments=9)
    _torus(B, "BucketOpenRim", (0, 0, -.255), .152, .020, mats["oak_dark"],
           collection, g, major_segments=9)
    # The opening recesses a full quarter-tile below the rim: a shadowed stave
    # wall down to a visible warm floor — real depth, never a flush lid and
    # never a hollow-black void.
    _cylinder(B, "BucketInteriorWall", (0, 0, -.555), .126, .11, 9,
              mats["oak_dark"], collection, g)
    _cylinder(B, "BucketInteriorFloor", (0, 0, -.494), .118, .012, 9,
              mats["deck_weathered"], collection, g)
    return g


def build_sockets(B, collection, parent):
    sockets = {
        "shore_entry_socket": (0, 0, 0),
        "bank_exit_socket": (5.05, -4.55, 0),
        "fishing_edge_socket": (6.05, -2.60, 0),
        "water_contact_socket": (ROPE_TOP[0], ROPE_TOP[1], WATER_Z),
        "pulley_operator_socket": (5.05, .35, 0),
    }
    made = {}
    for name, position in sockets.items():
        socket = B.empty(name, collection, parent, position)
        socket["socketPurpose"] = name.replace("_", " ")
        made[name] = socket
    return made


def build_family(B, mats, collection, root):
    groups = {
        "dock_shore_span": dock_shore_span(B, mats, collection, root),
        "dock_turn_platform": dock_turn_platform(B, mats, collection, root),
        "dock_bank_span": dock_bank_span(B, mats, collection, root),
        "pulley_frame": pulley_frame(B, mats, collection, root),
        "pulley_crank": pulley_crank(B, mats, collection, root),
        "pulley_rope": pulley_rope(B, mats, collection, root),
        "pulley_bucket": pulley_bucket(B, mats, collection, root),
    }
    groups["sockets"] = build_sockets(B, collection, root)
    return groups


# ---------------------------------------------------------------- animation

def _author_clip(obj, clip, channel, keys, index=None):
    """Author one channel of one clip and push it to a named NLA track."""
    obj.animation_data_create()
    action = bpy.data.actions.new("%s__%s" % (clip, obj.name))
    obj.animation_data.action = action
    for frame, value in keys:
        if channel == "location.z":
            obj.location.z = value
            obj.keyframe_insert("location", index=2, frame=frame)
        elif channel == "scale.z":
            obj.scale.z = value
            obj.keyframe_insert("scale", index=2, frame=frame)
        elif channel == "rotation.x":
            obj.rotation_euler.x = value
            obj.keyframe_insert("rotation_euler", index=0, frame=frame)
    for curve in action.fcurves:
        for point in curve.keyframe_points:
            point.interpolation = "LINEAR"
    track = obj.animation_data.nla_tracks.new()
    track.name = clip
    track.strips.new(action.name, 1, action)
    track.mute = True
    obj.animation_data.action = None


def rope_scale_for(bucket_z):
    return round((ROPE_REST_LENGTH + (BUCKET_REST_Z - bucket_z)) / ROPE_REST_LENGTH, 4)


def crank_angle_for(bucket_z):
    return round(-(BUCKET_REST_Z - bucket_z) / DRUM_RADIUS, 4)


def author_animations(groups):
    """Three named clips; rope, bucket, and crank stay mathematically linked."""
    crank = groups["pulley_crank"]
    bucket = groups["pulley_bucket"]
    fall = next(obj for obj in groups["pulley_rope"].children
                if obj.name.split('.')[0] == "RopeFall")

    f0, f1, f2 = LOWER_KEYS
    lower = ((f0, BUCKET_REST_Z), (f1, BUCKET_CONTACT_Z), (f2, BUCKET_LOWERED_Z))
    _author_clip(bucket, CLIP_LOWER, "location.z", lower)
    _author_clip(fall, CLIP_LOWER, "scale.z",
                 tuple((f, rope_scale_for(z)) for f, z in lower))
    _author_clip(crank, CLIP_LOWER, "rotation.x",
                 tuple((f, crank_angle_for(z)) for f, z in lower))

    g0, g1, g2, g3 = LIFT_KEYS
    lift = ((g0, BUCKET_LOWERED_Z), (g1, BUCKET_REST_Z),
            (g2, BUCKET_REST_Z - .018), (g3, BUCKET_REST_Z))
    _author_clip(bucket, CLIP_LIFT, "location.z", lift)
    _author_clip(fall, CLIP_LIFT, "scale.z",
                 tuple((f, rope_scale_for(z)) for f, z in lift))
    _author_clip(crank, CLIP_LIFT, "rotation.x",
                 ((g0, crank_angle_for(BUCKET_LOWERED_Z)), (g1, 0.0), (g3, 0.0)))

    i0, i1 = IDLE_KEYS
    quarter = (i1 - i0) // 4
    _author_clip(bucket, CLIP_IDLE, "rotation.x",
                 ((i0, 0.0), (i0 + quarter, .030), (i0 + 2 * quarter, 0.0),
                  (i0 + 3 * quarter, -.030), (i1, 0.0)))

    # Return every object to its authored rest pose for static renders.
    bucket.location.z = BUCKET_REST_Z
    bucket.rotation_euler.x = 0.0
    fall.scale.z = 1.0
    crank.rotation_euler.x = 0.0
    return {"crank": crank, "bucket": bucket, "fall": fall}


def solo_clip(animated, clip):
    """Mute every NLA track except `clip` (None = rest pose everywhere)."""
    for obj in animated.values():
        if not obj.animation_data:
            continue
        for track in obj.animation_data.nla_tracks:
            track.mute = clip is None or track.name != clip
