"""Purpose-built starter worn-gear family (first-hour held equipment).

The six items a new adventurer actually holds in the first hour — bronze
hatchet, bronze pickaxe, bronze sword, bronze dagger, worn shortbow, and a
round wooden shield — modeled as authored Blender objects in the accepted
Workyard construction language: hand-drawn forged-head and blade profiles,
subtly curved multi-segment hafts, fitted collars and wraps, visible rivets
and joinery, and controlled asymmetric wear.  No anonymous primitives.

Grip contract (consumed by src/gear_models_v1.js at runtime):
  * every item group's ORIGIN is its grip point;
  * the business/blade axis runs along Blender +Z (game +Y after export);
  * the hatchet/pickaxe working edge faces Blender +X (game +X);
  * blade width spans Blender Y (game Z), matching the procedural builders;
  * the shield's face normal is Blender +X (game +X), planks along +Z.

Metal that must recolor per tier at runtime uses exactly the material names
CR_GEAR_METAL / CR_GEAR_METAL_EDGE / CR_GEAR_METAL_DARK.

Coordinates are Blender Z-up.  Builders provide the shared ``B`` helper,
materials, collection, and parent, mirroring cr_workyard_exterior_u3_v1.
"""
from __future__ import annotations

import math

import bpy
from mathutils import Vector


PLAYER_HEIGHT = 1.85
SWORD_OVERALL_LENGTH = 1.09
HATCHET_OVERALL_LENGTH = 0.70
PICKAXE_HEAD_SPAN = 0.556
DAGGER_OVERALL_LENGTH = 0.50
SHORTBOW_HEIGHT = 0.91
SHIELD_DIAMETER = 0.67
GRIP_RADIUS_MAX = 0.042


def extend_materials(mat, mats):
    """Add the gear palette; CR_GEAR_METAL* names are the runtime recolor hooks.

    Metal must separate from the wooden hafts at gameplay distance: coppery
    saturated bronze against deliberately darker haft oak and chestnut leather.
    """
    mats["gear_metal"] = mat("CR_GEAR_METAL", (.44, .25, .105), .42, .30)
    mats["gear_metal_edge"] = mat("CR_GEAR_METAL_EDGE", (.82, .60, .38), .32, .30)
    mats["gear_metal_dark"] = mat("CR_GEAR_METAL_DARK", (.30, .19, .10), .60, .15)
    mats["gear_haft"] = mat("CR Gear Haft Oak", (.40, .265, .13))
    mats["gear_haft_dark"] = mat("CR Gear Haft Oak Dark", (.26, .16, .08))
    mats["gear_endgrain"] = mat("CR Gear Endgrain", (.72, .62, .42))
    mats["gear_leather"] = mat("CR Gear Leather", (.36, .215, .10))
    mats["gear_leather_dark"] = mat("CR Gear Leather Dark", (.22, .13, .065))
    mats["gear_string"] = mat("CR Gear Bow String", (.88, .84, .70))
    mats["gear_plank_a"] = mat("CR Gear Shield Plank A", (.50, .34, .17))
    mats["gear_plank_b"] = mat("CR Gear Shield Plank B", (.61, .45, .24))
    mats["gear_plank_c"] = mat("CR Gear Shield Plank C", (.40, .27, .135))
    mats["gear_iron"] = mat("CR Gear Shield Iron", (.30, .31, .34), .58, .30)
    return mats


def _group(B, name, position, rotation, collection, parent):
    obj = B.empty(name, collection, parent, position)
    obj.rotation_euler.z = rotation
    return obj


def _flat(obj):
    for face in obj.data.polygons:
        face.use_smooth = False
    return obj


def _cylinder(B, name, loc, radius, depth, sides, material, collection, parent,
              rotation=(0, 0, 0), r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=sides, radius=radius,
                                            depth=depth, location=(0, 0, 0),
                                            rotation=rotation)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=sides, radius1=radius,
                                        radius2=r2, depth=depth,
                                        location=(0, 0, 0), rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    B.link(obj, collection, parent)
    obj.location = loc
    obj.data.materials.append(material)
    return _flat(obj)


def _ico(B, name, loc, radius, material, collection, parent, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=radius,
                                          location=(0, 0, 0))
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    B.link(obj, collection, parent)
    obj.location = loc
    obj.data.materials.append(material)
    return _flat(obj)


def _beam(B, name, start, end, width, depth, material, collection, parent,
          bevel=0):
    a, b = Vector(start), Vector(end)
    direction = b - a
    bpy.ops.mesh.primitive_cube_add(location=(0, 0, 0))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = (direction.length, width, depth)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    B.link(obj, collection, parent)
    obj.location = (a + b) * .5
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("X", "Z")
    obj.data.materials.append(material)
    if bevel:
        mod = obj.modifiers.new("CR gear hand edge", "BEVEL")
        mod.width = bevel
        mod.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return _flat(obj)


def _prism(B, name, points, thickness, material, collection, parent,
           plane="yz", offset=0.0):
    """Extrude a hand-drawn 2D polygon profile; no generic box silhouettes.

    plane='yz' reads points as (y, z) extruded along X (blades, guards);
    plane='xz' reads points as (x, z) extruded along Y (axe/pick heads).
    ``offset`` recenters the slab on its extrusion axis.
    """
    half = thickness / 2
    if plane == "yz":
        verts = [(offset - half, y, z) for y, z in points] + \
                [(offset + half, y, z) for y, z in points]
    else:
        verts = [(x, offset - half, z) for x, z in points] + \
                [(x, offset + half, z) for x, z in points]
    n = len(points)
    faces = [tuple(range(n - 1, -1, -1)), tuple(range(n, n * 2))]
    faces.extend((i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n))
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    B.link(obj, collection, parent)
    obj.data.materials.append(material)
    return _flat(obj)


def bronze_sword(B, position, rotation, mats, collection, parent):
    """Fullered straight blade, drooped knobbed crossguard, banded grip."""
    g = _group(B, "gear_sword", position, rotation, collection, parent)
    blade = [(0.062, 0.12), (0.058, 0.42), (0.048, 0.66), (0.020, 0.845),
             (0.0, 0.90), (-0.020, 0.845), (-0.048, 0.66), (-0.058, 0.42),
             (-0.062, 0.12)]
    _prism(B, "SwordBlade", blade, .042, mats["gear_metal"], collection, g)
    # Brighter ground edges follow the taper on both sides of the blade.
    for s in (1, -1):
        edge = [(s * 0.074, 0.13), (s * 0.068, 0.42), (s * 0.056, 0.65),
                (s * 0.026, 0.836), (s * 0.014, 0.822), (s * 0.042, 0.64),
                (s * 0.052, 0.42), (s * 0.058, 0.13)]
        _prism(B, "SwordEdgeGround", edge, .030, mats["gear_metal_edge"],
               collection, g)
    # The fuller reads as a raised darker spine that dies before the tip.
    fuller = [(0.015, 0.15), (0.012, 0.55), (0.0, 0.62), (-0.012, 0.55),
              (-0.015, 0.15)]
    _prism(B, "SwordFuller", fuller, .050, mats["gear_metal_dark"],
           collection, g)
    guard = [(-0.138, 0.048), (-0.138, 0.086), (-0.045, 0.106), (0.045, 0.106),
             (0.138, 0.086), (0.138, 0.048), (0.050, 0.076), (-0.050, 0.076)]
    _prism(B, "SwordGuardDrooped", guard, .060, mats["gear_metal"],
           collection, g)
    for s in (1, -1):
        _cylinder(B, "SwordGuardKnob", (0, s * 0.148, 0.067), .020, .034, 6,
                  mats["gear_metal"], collection, g,
                  rotation=(math.pi / 2, 0, 0))
    # Distinct leather wrap bands, alternating tone and girth like the concept.
    for i, zc in enumerate((0.036, -0.008, -0.052, -0.096)):
        _cylinder(B, "SwordGripBand_%d" % i, (0, 0, zc),
                  .036 if i % 2 == 0 else .032, .046, 7,
                  mats["gear_leather" if i % 2 == 0 else "gear_leather_dark"],
                  collection, g)
    _ico(B, "SwordPommel", (0, 0, -0.138), .042, mats["gear_metal"],
         collection, g, scale=(1, 1, .85))
    _cylinder(B, "SwordPommelTip", (0, 0, -0.178), .028, .034, 6,
              mats["gear_metal_dark"], collection, g,
              rotation=(math.pi, 0, 0), r2=.012)
    return g


def bronze_hatchet(B, position, rotation, mats, collection, parent):
    """Bearded forged head with a brighter bit, on a subtly curved haft."""
    g = _group(B, "gear_hatchet", position, rotation, collection, parent)
    _beam(B, "HatchetHaftLower", (0, 0, -0.30), (0.014, 0, 0.04), .050, .044,
          mats["gear_haft"], collection, g, .008)
    _beam(B, "HatchetHaftUpper", (0.014, 0, 0.04), (-0.008, 0, 0.345),
          .046, .042, mats["gear_haft"], collection, g, .008)
    _cylinder(B, "HatchetKnobEnd", (0, 0, -0.325), .044, .062, 7,
              mats["gear_haft_dark"], collection, g, r2=.028)
    head = [(-0.098, 0.208), (-0.100, 0.292), (-0.030, 0.316), (0.095, 0.322),
            (0.175, 0.300), (0.208, 0.240), (0.198, 0.155), (0.150, 0.092),
            (0.098, 0.130), (0.020, 0.176), (-0.030, 0.190)]
    _prism(B, "HatchetForgedHead", head, .068, mats["gear_metal"],
           collection, g, plane="xz")
    bit = [(0.186, 0.309), (0.220, 0.240), (0.210, 0.148), (0.156, 0.080),
           (0.135, 0.108), (0.180, 0.158), (0.188, 0.238), (0.160, 0.292)]
    _prism(B, "HatchetBitEdge", bit, .074, mats["gear_metal_edge"],
           collection, g, plane="xz")
    _prism(B, "HatchetPollCap",
           [(-0.108, 0.212), (-0.108, 0.288), (-0.072, 0.288), (-0.072, 0.212)],
           .076, mats["gear_metal_dark"], collection, g, plane="xz")
    # The haft's endgrain wedge shows through the eye at the head's top.
    _prism(B, "HatchetEyeWedge",
           [(-0.016, 0.318), (-0.016, 0.330), (0.016, 0.330), (0.016, 0.318)],
           .030, mats["gear_endgrain"], collection, g, plane="xz")
    _cylinder(B, "HatchetCollarWrap", (0.004, 0, 0.152), .036, .055, 7,
              mats["gear_leather_dark"], collection, g)
    return g


def bronze_pickaxe(B, position, rotation, mats, collection, parent):
    """One crescent forged head with two worn brighter points, stout haft."""
    g = _group(B, "gear_pickaxe", position, rotation, collection, parent)
    _beam(B, "PickHaftLower", (0, 0, -0.30), (0.010, 0, 0.02), .056, .050,
          mats["gear_haft"], collection, g, .008)
    _beam(B, "PickHaftUpper", (0.010, 0, 0.02), (-0.006, 0, 0.30), .050, .046,
          mats["gear_haft"], collection, g, .008)
    _cylinder(B, "PickKnobEnd", (0, 0, -0.325), .046, .060, 7,
              mats["gear_haft_dark"], collection, g, r2=.030)
    head = [(-0.238, 0.212), (-0.170, 0.272), (-0.065, 0.300), (0.065, 0.300),
            (0.170, 0.272), (0.238, 0.212), (0.150, 0.240), (0.055, 0.264),
            (-0.055, 0.264), (-0.150, 0.240)]
    _prism(B, "PickCrescentHead", head, .054, mats["gear_metal"],
           collection, g, plane="xz")
    for s in (1, -1):
        _cylinder(B, "PickTipSpike", (s * 0.252, 0, 0.202), .020, .052, 6,
                  mats["gear_metal_edge"], collection, g,
                  rotation=(0, s * (math.pi / 2 + 0.35), 0), r2=.004)
    _prism(B, "PickEyeBlock",
           [(-0.040, 0.252), (-0.040, 0.306), (0.040, 0.306), (0.040, 0.252)],
           .062, mats["gear_metal_dark"], collection, g, plane="xz")
    return g


def bronze_dagger(B, position, rotation, mats, collection, parent):
    """Short leaf blade with a raised midrib, cross-wrapped grip, disc pommel."""
    g = _group(B, "gear_dagger", position, rotation, collection, parent)
    blade = [(0.036, 0.065), (0.047, 0.16), (0.041, 0.30), (0.0, 0.40),
             (-0.041, 0.30), (-0.047, 0.16), (-0.036, 0.065)]
    _prism(B, "DaggerLeafBlade", blade, .026, mats["gear_metal"],
           collection, g)
    midrib = [(0.012, 0.08), (0.009, 0.27), (0.0, 0.335), (-0.009, 0.27),
              (-0.012, 0.08)]
    _prism(B, "DaggerMidrib", midrib, .034, mats["gear_metal_dark"],
           collection, g)
    _prism(B, "DaggerHonedTip",
           [(0.020, 0.315), (0.0, 0.398), (-0.020, 0.315), (0.0, 0.342)],
           .022, mats["gear_metal_edge"], collection, g)
    _prism(B, "DaggerGuardBar",
           [(-0.072, 0.048), (-0.072, 0.068), (0.072, 0.068), (0.072, 0.048)],
           .038, mats["gear_metal"], collection, g)
    for i, zc in enumerate((0.028, -0.008, -0.044)):
        _cylinder(B, "DaggerGripBand_%d" % i, (0, 0, zc),
                  .028 if i % 2 == 0 else .025, .038,
                  7, mats["gear_leather" if i % 2 == 0 else "gear_leather_dark"],
                  collection, g)
    # The concept's X-wrap: two crossed thongs over the banded grip.
    _beam(B, "DaggerCrossWrap", (0, 0.024, 0.042), (0, -0.024, -0.055),
          .012, .012, mats["gear_leather_dark"], collection, g)
    _beam(B, "DaggerCrossWrap", (0, -0.024, 0.042), (0, 0.024, -0.055),
          .012, .012, mats["gear_leather_dark"], collection, g)
    _cylinder(B, "DaggerPommelDisc", (0, 0, -0.078), .033, .020, 7,
              mats["gear_metal"], collection, g)
    _cylinder(B, "DaggerPommelCap", (0, 0, -0.092), .012, .022, 6,
              mats["gear_metal_dark"], collection, g)
    return g


def worn_shortbow(B, position, rotation, mats, collection, parent):
    """Single worn stave: tapered faceted limbs, grip wrap, one repair band."""
    g = _group(B, "gear_shortbow", position, rotation, collection, parent)
    steps = 8
    pts, widths = [], []
    for i in range(steps + 1):
        t = i / steps * 2 - 1
        # Grip at the origin; both tips reach the string line at +X.
        x = 0.215 - 0.215 * math.cos(t * math.pi / 2) + 0.006 * t  # worn lean
        pts.append(Vector((x, 0, 0.455 * t)))
        widths.append(0.052 - 0.030 * abs(t))
    for i in range(steps):
        w = (widths[i] + widths[i + 1]) / 2
        _beam(B, "BowStaveLimb_%d" % i, pts[i], pts[i + 1], w, w * .82,
              mats["gear_haft"], collection, g, .006)
    for tip in (pts[0], pts[steps]):
        _cylinder(B, "BowNock", (tip.x, 0, tip.z * 1.012), .016, .034, 6,
                  mats["gear_haft_dark"], collection, g)
    _cylinder(B, "BowString", (0.221, 0, 0), .0075, .905, 4,
              mats["gear_string"], collection, g)
    for zc in (0.024, -0.024):
        _cylinder(B, "BowGripWrap", (0.0015, 0, zc), .042, .032, 7,
                  mats["gear_leather"], collection, g)
    # One off-center field repair marks the "worn" in Worn shortbow.
    t = -0.45
    bx = 0.215 - 0.215 * math.cos(t * math.pi / 2) + 0.006 * t
    band = _cylinder(B, "BowRepairBand", (bx, 0, 0.455 * t), .030, .026, 6,
                     mats["gear_leather_dark"], collection, g)
    band.rotation_euler.y = -0.38  # follow the limb's local direction
    return g


def wooden_shield(B, position, rotation, mats, collection, parent):
    """Five-plank round shield: riveted iron rim, faceted boss, real back grip."""
    g = _group(B, "gear_shield", position, rotation, collection, parent)
    r = 0.30
    bounds = (-0.30, -0.18, -0.06, 0.06, 0.18, 0.30)
    tones = ("gear_plank_b", "gear_plank_a", "gear_plank_c", "gear_plank_a",
             "gear_plank_b")
    for i in range(5):
        y0, y1 = bounds[i], bounds[i + 1]
        ys = (y0, (y0 + y1) / 2, y1)
        zs = [math.sqrt(max(r * r - y * y, 0.0004)) for y in ys]
        poly = [(ys[0], -zs[0]), (ys[1], -zs[1]), (ys[2], -zs[2]),
                (ys[2], zs[2]), (ys[1], zs[1]), (ys[0], zs[0])]
        _prism(B, "ShieldPlank_%d" % i, poly, .040, mats[tones[i]],
               collection, g, offset=0.005 if i % 2 else 0.0)
    segments = 14
    for i in range(segments):
        a0 = i / segments * math.tau
        a1 = (i + 1) / segments * math.tau
        p0 = (0, math.cos(a0) * .305, math.sin(a0) * .305)
        p1 = (0, math.cos(a1) * .305, math.sin(a1) * .305)
        _beam(B, "ShieldRimSegment_%d" % i, p0, p1, .058, .052,
              mats["gear_iron"], collection, g)
        am = (a0 + a1) / 2
        _ico(B, "ShieldRimRivet_%d" % i,
             (0.033, math.cos(am) * .295, math.sin(am) * .295), .011,
             mats["iron_light"], collection, g)
    _cylinder(B, "ShieldBossRing", (0.044, 0, 0), .108, .014, 9,
              mats["gear_iron"], collection, g, rotation=(0, math.pi / 2, 0))
    _ico(B, "ShieldBossDome", (0.045, 0, 0), .078, mats["iron_light"],
         collection, g, scale=(.70, 1, 1))
    for i in range(6):
        a = i / 6 * math.tau + .3
        _ico(B, "ShieldBossRivet_%d" % i,
             (0.052, math.cos(a) * .088, math.sin(a) * .088), .009,
             mats["gear_iron"], collection, g)
    _beam(B, "ShieldBackHandle", (-0.030, 0, -0.10), (-0.030, 0, 0.10),
          .034, .020, mats["gear_haft_dark"], collection, g, .005)
    _beam(B, "ShieldBackBrace", (-0.024, -0.21, 0), (-0.024, 0.21, 0),
          .050, .016, mats["gear_haft_dark"], collection, g, .005)
    return g


def bronze_helm(B, position, rotation, mats, collection, parent):
    """Forged skull cap: faceted two-stage dome over a riveted brow band, with
    a tapered nasal bar, hand-drawn cheek guards, and a rear neck flare.
    Origin is the brow-band base center; the face opening looks down game +Z
    (Blender -Y), matching the procedural helmMesh placement conventions."""
    g = _group(B, "gear_helm", position, rotation, collection, parent)
    _cylinder(B, "HelmBrowBand", (0, 0, 0.030), .215, .055, 8,
              mats["gear_metal_dark"], collection, g)
    for i in range(6):
        a = i / 6 * math.tau + math.pi / 6
        _ico(B, "HelmBandRivet_%d" % i,
             (math.sin(a) * .215, math.cos(a) * .215, 0.030), .011,
             mats["gear_metal_edge"], collection, g)
    _cylinder(B, "HelmDomeLower", (0, 0, 0.100), .205, .090, 8,
              mats["gear_metal"], collection, g, r2=.163)
    _cylinder(B, "HelmDomeCrest", (0, 0, 0.190), .163, .090, 8,
              mats["gear_metal"], collection, g, r2=.052)
    _cylinder(B, "HelmCrownButton", (0, 0, 0.247), .028, .028, 6,
              mats["gear_metal_edge"], collection, g)
    # Tapered nasal bar drops from the band's front edge over the face line.
    _prism(B, "HelmNasalBar",
           [(-.228, 0.058), (-.196, 0.058), (-.201, -0.082), (-.223, -0.082)],
           .036, mats["gear_metal_dark"], collection, g)
    for s in (1, -1):
        cheek = [(-.100, 0.045), (0.060, 0.045), (0.075, -0.020),
                 (0.020, -0.093), (-.060, -0.088)]
        _prism(B, "HelmCheekGuard", cheek, .030, mats["gear_metal"],
               collection, g, plane="yz", offset=s * .190)
    _prism(B, "HelmNeckFlare",
           [(-.115, 0.050), (0.115, 0.050), (0.090, -0.028), (-.090, -0.028)],
           .030, mats["gear_metal_dark"], collection, g, plane="xz",
           offset=.205)
    return g


def build_catalog_family(B, mats, collection, root):
    """All six held items in one proof arrangement (display row)."""
    hatchet = bronze_hatchet(B, (-1.55, 0, 0.36), .10, mats, collection, root)
    pickaxe = bronze_pickaxe(B, (-0.90, 0, 0.36), -.08, mats, collection, root)
    sword = bronze_sword(B, (-0.18, 0, 0.20), .06, mats, collection, root)
    dagger = bronze_dagger(B, (0.42, 0, 0.11), -.10, mats, collection, root)
    bow = worn_shortbow(B, (1.02, 0, 0.47), .05, mats, collection, root)
    shield = wooden_shield(B, (1.85, 0, 0.35), 0, mats, collection, root)
    shield.rotation_euler.z = -math.pi / 2  # face the proof camera; reset pre-export
    helm = bronze_helm(B, (2.52, 0, 0.10), .35, mats, collection, root)
    return {"gear_hatchet": hatchet, "gear_pickaxe": pickaxe,
            "gear_sword": sword, "gear_dagger": dagger,
            "gear_shortbow": bow, "gear_shield": shield, "gear_helm": helm}
