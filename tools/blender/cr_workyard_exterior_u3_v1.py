"""Purpose-built Workyard exterior occupation-yard family (U3).

Every visible object in the woodcutting yard is modeled here as an authored
Blender object with a specific occupation purpose: a loaded timber-storage
rack with individually cut, rope-restrained logs; a weathered chopping block
scarred by use; a complete felling axe seated into that block; and a sawbuck
holding a half-sawn log.  The family avoids anonymous primitives: silhouettes
use hand-drawn polygon profiles, tapered irregular logs, visible joinery and
pegs, and authored contact at every rest, wrap, and bite point.

Coordinates are Blender Z-up.  Builders provide the shared ``B`` helper,
materials, collection, and parent so this module can produce both the isolated
proof/catalog asset and, later, the integrated Workyard court from one source.
"""
from __future__ import annotations

import math

import bpy
from mathutils import Vector


PLAYER_HEIGHT = 1.85
RACK_FRAME_HEIGHT = 1.58
LOG_STACK_TOP = 1.31
CHOPPING_BLOCK_HEIGHT = 0.645
AXE_OVERALL_LENGTH = 1.05
AXE_EMBEDDED_TOP_HEIGHT = 1.67
SAWBUCK_HEIGHT = 1.08


def extend_materials(mat, mats):
    """Add the yard's warm weathered-timber palette on top of the Workyard set."""
    mats["bark"] = mat("CR Workyard Weathered Bark", (.40, .28, .155))
    mats["bark_dark"] = mat("CR Workyard Weathered Bark Dark", (.26, .17, .09))
    mats["endgrain"] = mat("CR Workyard Pale Endgrain", (.755, .655, .445))
    return mats


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


def _peg(B, name, loc, material, collection, parent, radius=.05, depth=.13,
         rotation=(math.pi / 2, 0, 0)):
    return _cylinder(B, name, loc, radius, depth, 7, material, collection, parent,
                     rotation=rotation)


def _jittered_ring(radius, sides, jitter, seed_step=1.7):
    """Deterministic irregular polygon ring — no random per-boot geometry."""
    points = []
    for i in range(sides):
        angle = math.tau * i / sides
        wobble = 1 + jitter * math.sin(i * seed_step + radius * 9.1)
        points.append((math.cos(angle) * radius * wobble,
                       math.sin(angle) * radius * wobble))
    return points


def _loft_rings(B, name, rings, material, collection, parent):
    """Loft equal-count irregular rings into ONE continuous faceted trunk.

    ``rings`` is a list of ``(z, points)`` from bottom to top.  The wall runs
    unbroken between rings, so a taper never reads as stacked terraces, while
    per-ring jitter keeps the silhouette hand-hewn rather than lathe-smooth.
    """
    n = len(rings[0][1])
    verts = []
    for z, pts in rings:
        verts.extend((x, y, z) for x, y in pts)
    faces = [tuple(range(n - 1, -1, -1))]
    for level in range(len(rings) - 1):
        base = level * n
        faces.extend((base + i, base + (i + 1) % n,
                      base + n + (i + 1) % n, base + n + i) for i in range(n))
    top = (len(rings) - 1) * n
    faces.append(tuple(range(top, top + n)))
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(material)
    return _flat(obj)


def _log(B, name, loc, r_big, r_small, length, sides, bark_key, mats,
         collection, parent, tilt=0.0, stub=False):
    """One individually authored cut log: tapered, capped, deliberately tilted."""
    g = B.empty(name, collection, parent, loc)
    g.rotation_euler.z = tilt
    _cone(B, name + "Bark", (0, 0, 0), r_big, r_small, length, sides,
          mats[bark_key], collection, g, rotation=(0, math.pi / 2, 0))
    # Pale sawn faces sit proud of the bark so every log reads as CUT timber.
    _cylinder(B, name + "LogEndGrain", (-length / 2 - .012, 0, 0), r_big * .84,
              .04, sides, mats["endgrain"], collection, g,
              rotation=(0, math.pi / 2, 0))
    _cylinder(B, name + "LogEndGrain", (length / 2 + .012, 0, 0), r_small * .84,
              .04, sides, mats["endgrain"], collection, g,
              rotation=(0, math.pi / 2, 0))
    if stub:
        _cone(B, name + "BranchStub", (length * .18, .04, r_big * .78),
              .075, .045, .30, 6, mats["bark_dark"], collection, g,
              rotation=(math.radians(-28), math.radians(12), 0))
    return g


def _rope_band(B, name, x, loop, mats, collection, parent):
    """One closed rope wrap over the load, cinched outside the side rail."""
    for i in range(len(loop)):
        y0, z0 = loop[i]
        y1, z1 = loop[(i + 1) % len(loop)]
        _beam(B, name + "RopeWrap", (x, y0, z0), (x, y1, z1), .06, .06,
              mats["rope"], collection, parent)
    # Knot and two dangling tied-off ends exactly like the working concept.
    _torus(B, name + "RopeKnot", (x, .665, .50), .085, .028, mats["rope"],
           collection, parent, rotation=(0, math.pi / 2, 0), major_segments=8)
    _beam(B, name + "RopeDanglingEnd", (x + .02, .68, .46), (x + .05, .73, .04),
          .045, .045, mats["rope"], collection, parent)
    _beam(B, name + "RopeDanglingEnd", (x - .03, .66, .44), (x - .08, .61, .09),
          .045, .045, mats["rope"], collection, parent)


def timber_log_rack(B, position, rotation, mats, collection, parent):
    """U3.02 — loaded timber-storage rack with authored logs and restraints."""
    g = _group(B, "timber_log_rack", position, rotation, collection, parent)

    # Two hand-hewn end frames: leaning pegged posts on flat foot stones.
    for side, x in ((-1, -1.28), (1, 1.28)):
        for lean, width in ((-1, .17), (1, .15)):
            _beam(B, "RackLeaningPost", (x + side * .015, lean * .66, .04),
                  (x - side * .02, lean * .44, RACK_FRAME_HEIGHT),
                  width, width - .01, mats["oak_dark"], collection, g, .014)
            stone = _prism_xy(B, "RackFootStone",
                              _jittered_ring(.21, 5, .18, 2.3 + lean),
                              0, .13, mats["stone_light" if lean > 0 else "stone"],
                              collection, g)
            stone.location = (x + side * .02, lean * .62, 0)
        # Crossed diagonal braces, pegged where they meet.
        _beam(B, "RackCrossBrace", (x, -.58, .28), (x, .46, 1.32), .11, .10,
              mats["oak"], collection, g, .010)
        _beam(B, "RackCrossBrace", (x, .54, .24), (x, -.44, 1.28), .11, .10,
              mats["oak"], collection, g, .010)
        _peg(B, "RackBracePeg", (x + side * .075, -.02, .79), mats["iron"],
             collection, g, .05, .12, rotation=(0, math.pi / 2, 0))

    # Long side rails retain the stack; iron pegs tie them into the posts.
    for rail_y in (-.60, .60):
        _beam(B, "RackSideRail", (-1.34, rail_y, .46), (1.34, rail_y, .46),
              .13, .12, mats["oak"], collection, g, .012)
        for x in (-1.28, 1.28):
            _peg(B, "RackRailPeg", (x, rail_y + (.09 if rail_y > 0 else -.09), .46),
                 mats["iron"], collection, g, .045, .10)
    # Ground sleepers keep the bottom row dry and give it a real rest surface.
    for x in (-.88, .88):
        _beam(B, "RackSleeper", (x, -.62, .16), (x, .62, .16), .18, .15,
              mats["oak_dark"], collection, g, .014)

    # The load: every log has its own taper, length, bark tone, and tilt.
    logs = B.empty("log_stack", collection, g)
    rows = (
        # bottom row on the sleepers
        (("SawnLog_B0", (.06, -.50, .41), .175, .16, 2.85, 9, "bark", .025, False),
         ("SawnLog_B1", (-.08, -.165, .42), .185, .17, 3.02, 8, "bark_dark", -.015, False),
         ("SawnLog_B2", (.12, .17, .405), .17, .155, 2.62, 9, "bark", .03, False),
         ("SawnLog_B3", (0, .50, .415), .18, .165, 2.90, 8, "oak", -.02, False)),
        # middle row nests in the grooves; one honest short log leaves a gap
        (("SawnLog_M0", (.05, -.335, .71), .18, .16, 2.78, 8, "bark_dark", .02, False),
         ("SawnLog_ShortGap", (-.44, 0, .71), .175, .16, 1.95, 9, "bark", .04, False),
         ("SawnLog_M2", (.04, .335, .71), .185, .165, 2.95, 8, "oak", -.025, False)),
        # one dominant top log with a trimmed branch stub
        (("SawnLog_Top", (0, -.02, 1.07), .24, .215, 3.10, 9, "bark", .012, True),),
    )
    for row in rows:
        for name, loc, r1, r2, length, sides, bark, tilt, stub in row:
            _log(B, name, loc, r1, r2, length, sides, bark, mats, collection,
                 logs, tilt=tilt, stub=stub)

    # Two visible hemp restraints wrap the load and cinch on the side rail.
    ropes = B.empty("rope_restraints", collection, g)
    loop = ((0, 1.335), (.32, 1.18), (.52, .90), (.665, .50), (.50, .245),
            (0, .215), (-.50, .245), (-.665, .50), (-.52, .90), (-.32, 1.18))
    _rope_band(B, "Front", -.58, loop, mats, collection, ropes)
    _rope_band(B, "Back", .76, loop, mats, collection, ropes)
    return g, logs, ropes


def chopping_block(B, position, rotation, mats, collection, parent):
    """U3.03 — weathered stump with root flare, pale scarred top, and chips."""
    g = _group(B, "chopping_block", position, rotation, collection, parent)
    # ONE continuous lofted trunk: an unbroken faceted wall tapers from the
    # ground ring to the working face, so the stump reads hand-hewn without
    # the stacked-terrace ledges of the earlier three-prism construction.
    _loft_rings(B, "BlockTrunkHewn",
                ((0, _jittered_ring(.475, 10, .09, 1.9)),
                 (.21, _jittered_ring(.452, 10, .085, 2.2)),
                 (.42, _jittered_ring(.428, 10, .075, 2.4)),
                 (.60, _jittered_ring(.415, 10, .08, 2.6))),
                mats["bark"], collection, g)
    # Shallow vertical bark ridges hug the upper trunk — striation, not slats.
    for i, angle in enumerate((28, 96, 172, 236, 318)):
        a = math.radians(angle)
        ca, sa = math.cos(a), math.sin(a)
        r0, w = .432, .050
        pts = [(ca * r0 - sa * w, sa * r0 + ca * w),
               (ca * r0 + sa * w, sa * r0 - ca * w),
               (ca * (r0 + .028) + sa * w * .7, sa * (r0 + .028) - ca * w * .7),
               (ca * (r0 + .028) - sa * w * .7, sa * (r0 + .028) + ca * w * .7)]
        _prism_xy(B, "BlockBarkRidge_%d" % i, pts, .24, .32 - (i % 2) * .06,
                  mats["bark_dark"], collection, g)
    # Root flare wedges seat the stump into the ground — no floating cylinder.
    for i, angle in enumerate((15, 80, 150, 225, 300)):
        a = math.radians(angle)
        ca, sa = math.cos(a), math.sin(a)
        inner_a = (ca * .36 - sa * .15, sa * .36 + ca * .15)
        inner_b = (ca * .36 + sa * .15, sa * .36 - ca * .15)
        outer = (ca * (.60 + (i % 2) * .06), sa * (.60 + (i % 2) * .06))
        _prism_xy(B, "BlockRootFlare", [inner_a, inner_b, outer], 0, .125 - (i % 2) * .03,
                  mats["bark" if i % 2 else "bark_dark"], collection, g)
    # Pale endgrain face with an inner growth ring, slightly proud of the bark.
    _prism_xy(B, "BlockEndGrainTop", _jittered_ring(.40, 10, .08, 2.6), .60, .045,
              mats["endgrain"], collection, g)
    _prism_xy(B, "BlockGrowthRing", _jittered_ring(.26, 10, .07, 3.1), .645, .008,
              mats["willow"], collection, g)
    # Dark angled axe-cut scars across the working face, plus one rim notch.
    cuts = ((.02, .12, .36, .50), (-.16, -.06, .31, 2.10),
            (.15, -.14, .28, 1.15), (-.05, .24, .25, 2.85))
    for i, (cx, cy, length, angle) in enumerate(cuts):
        ca, sa = math.cos(angle), math.sin(angle)
        half, w = length / 2, .015
        pts = [(cx - ca * half - sa * w, cy - sa * half + ca * w),
               (cx - ca * half + sa * w, cy - sa * half - ca * w),
               (cx + ca * half + sa * w, cy + sa * half - ca * w),
               (cx + ca * half - sa * w, cy + sa * half + ca * w)]
        _prism_xy(B, "BlockCutMark_%d" % i, pts, .648, .010, mats["soot"],
                  collection, g)
    # One overshot scar runs toward the working rim, flush with the top face —
    # a protruding notch block read as a floating chip from the south camera.
    _prism_xy(B, "BlockRimNotch", [(-.05, -.33), (.04, -.34), (0, -.24)],
              .6485, .009, mats["soot"], collection, g)
    # Split chips at the base record recent work without random clutter.
    _prism_xy(B, "BlockSplitChip", [(.48, -.42), (.70, -.52), (.78, -.36), (.60, -.28)],
              0, .055, mats["endgrain"], collection, g)
    _prism_xy(B, "BlockSplitChip", [(-.52, -.48), (-.34, -.58), (-.28, -.44)],
              0, .045, mats["oak_light"], collection, g)
    _prism_xy(B, "BlockSplitChip", [(.32, .54), (.50, .47), (.55, .58), (.42, .66), (.30, .62)],
              0, .05, mats["oak_light"], collection, g)
    return g


def embedded_axe(B, position, rotation, mats, collection, parent):
    """U3.04 — complete felling axe seated into the block at a working angle.

    ``position`` is the bite point on the block's endgrain face; the haft
    leans toward local +X.  All angles are baked into the local coordinates.
    """
    g = _group(B, "embedded_axe", position, rotation, collection, parent)
    # Hand-forged head: poll, cheeks, eye, and a flared bit sunk into the wood.
    head = [(-.165, -.045), (0, -.058), (.145, -.045), (.18, .14), (.135, .27),
            (.09, .305), (-.07, .305), (-.20, .27), (-.235, .16), (-.215, .05)]
    _prism_xz(B, "AxeForgedHead", head, -.037, .075, mats["iron"], collection, g)
    _prism_xz(B, "AxeBitEdge", [(-.165, -.052), (0, -.066), (.145, -.052),
                                 (.145, -.014), (0, -.028), (-.165, -.014)],
              -.041, .082, mats["iron_light"], collection, g)
    # The bite visibly splits the endgrain around the buried edge — a tight
    # local bruise plus one long hairline crack, not a broad dark slab.
    _prism_xy(B, "AxeSplitMark", [(-.16, -.035), (.14, -.045), (.17, .035), (-.13, .042)],
              -.004, .014, mats["soot"], collection, g)
    _prism_xy(B, "AxeSplitCrack", [(-.40, -.008), (.34, -.014), (.36, .012), (-.38, .016)],
              -.002, .009, mats["soot"], collection, g)
    # Shaped haft: two slightly curved segments through the eye, swollen knob.
    _beam(B, "AxeHaftLower", (.02, 0, .23), (.311, 0, .575), .082, .072,
          mats["oak_light"], collection, g, .010)
    _beam(B, "AxeHaftUpper", (.301, 0, .565), (.572, 0, .942), .075, .068,
          mats["oak_light"], collection, g, .010)
    _cone(B, "AxeKnobEnd", (.607, 0, .982), .064, .042, .12, 7,
          mats["oak"], collection, g, rotation=(0, math.radians(35), 0))
    return g


def sawbuck(B, position, rotation, mats, collection, parent):
    """U3.06 extra fixture — X-frame sawbuck bucking one half-sawn log."""
    g = _group(B, "sawbuck", position, rotation, collection, parent)
    # Both legs of each X share one timber tone so the crossing reads clearly;
    # long upper arms hold the work piece well above the visible crossing.
    for x in (-.60, .60):
        _beam(B, "SawbuckLeg", (x, -.58, .03), (x, .46, SAWBUCK_HEIGHT),
              .12, .11, mats["oak"], collection, g, .012)
        _beam(B, "SawbuckLeg", (x, .58, .03), (x, -.46, SAWBUCK_HEIGHT),
              .12, .11, mats["oak"], collection, g, .012)
        _peg(B, "SawbuckPeg", (x + (.075 if x > 0 else -.075), 0, .61),
             mats["iron"], collection, g, .05, .12, rotation=(0, math.pi / 2, 0))
    # One low stringer pair, seated on the actual leg lines — not ladder rungs.
    for stringer_y in (-.40, .40):
        _beam(B, "SawbuckStringer", (-.66, stringer_y, .20), (.66, stringer_y, .20),
              .085, .08, mats["oak_dark"], collection, g, .010)
    # The work piece: tapered log resting in both crotches, sawn partway.
    log = _log(B, "SawbuckWorkLog", (.05, 0, .87), .19, .165, 1.80, 9, "bark_dark",
               mats, collection, g)
    log.rotation_euler.y = .035
    # The kerf is a thin dark slit sawn down through the TOP of the log.  Its
    # profile is an arc segment that follows the log's own cross-section a
    # hair proud of the surface, so it reads as the concept's partial cut from
    # every camera angle — never a fin, a ring, or square protruding corners.
    arc = [(math.cos(math.radians(a)) * .181,
            .860 + math.sin(math.radians(a)) * .181)
           for a in (-25, 15, 55, 90, 125, 165, 205)]
    slit = _prism_xz(B, "SawKerfSlit", arc, -.011, .022, mats["soot"],
                     collection, g)
    slit.rotation_euler.z = math.pi / 2
    slit.location = (.32, 0, 0)
    _cone(B, "SawdustPile", (.32, -.30, .0), .27, .06, .07, 9,
          mats["endgrain"], collection, g)
    return g


def build_catalog_family(B, mats, collection, root):
    """The complete isolated yard family in one proof arrangement."""
    rack, logs, ropes = timber_log_rack(B, (-2.35, .10, 0), -.06, mats,
                                        collection, root)
    block = chopping_block(B, (1.15, -.35, 0), .35, mats, collection, root)
    axe = embedded_axe(B, (1.09, -.25, CHOPPING_BLOCK_HEIGHT), -.62, mats,
                       collection, root)
    buck = sawbuck(B, (3.05, .30, 0), .28, mats, collection, root)
    return {"rack": rack, "log_stack": logs, "rope_restraints": ropes,
            "chopping_block": block, "embedded_axe": axe, "sawbuck": buck}
