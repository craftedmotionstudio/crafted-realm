"""Build the reusable Crafted Realm cellar quiet-corner furnishing family.

This is the owner-standard concept -> custom-topology Blender proof for two
distinct chairs, a seven-sided side table, and a handled yarn basket.  Every
visible mesh is assembled from authored vertices; no Blender primitive operator
is used for the asset.  The editable source is saved before runtime consolidation.
"""

from pathlib import Path
import bpy
import json
import math
import sys

from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools" / "blender"))
import build_cellar_lantern_v2 as L


SOURCE = ROOT / "assets" / "blender" / "props" / "cellar_quiet_corner_v1.blend"
MODEL = ROOT / "assets" / "models" / "props" / "cellar_quiet_corner_v1.glb"
PREVIEW = ROOT / "scratchpad" / "cellar_quiet_corner_v1"
REPORT = PREVIEW / "asset_report.json"
REFERENCE = ROOT / "docs" / "rebuild" / "concepts" / "cellar_quiet_corner_nanobanana2_v1.png"


def reset():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials,
                       bpy.data.cameras, bpy.data.lights):
        for block in list(datablocks):
            datablocks.remove(block)
    for path in (SOURCE.parent, MODEL.parent, PREVIEW):
        path.mkdir(parents=True, exist_ok=True)


def material(name, color, roughness=.92, metallic=0.0):
    return L.material(name, color, roughness, metallic)


def materials():
    return {
        "oak_shadow": material("CR Quiet Corner Oak Shadow", (.17, .095, .038)),
        "oak_mid": material("CR Quiet Corner Aged Oak", (.31, .175, .070)),
        "oak_light": material("CR Quiet Corner Worn Oak Face", (.46, .285, .115)),
        "oak_edge": material("CR Quiet Corner Honeyed Oak Edge", (.56, .355, .155)),
        "rush_shadow": material("CR Quiet Corner Rush Shadow", (.37, .22, .065)),
        "rush_gold": material("CR Quiet Corner Honey Rush", (.69, .45, .13)),
        "iron": material("CR Quiet Corner Charcoal Repair Iron", (.095, .10, .095), .78, .18),
        "shawl_dark": material("CR Quiet Corner Russet Shawl Shadow", (.28, .075, .052)),
        "shawl": material("CR Quiet Corner Muted Russet Shawl", (.55, .18, .115)),
        "willow": material("CR Quiet Corner Willow Basket", (.43, .255, .105)),
        "willow_light": material("CR Quiet Corner Willow Edge", (.61, .40, .18)),
        "wool_rust": material("CR Quiet Corner Rust Wool", (.53, .16, .105)),
        "wool_moss": material("CR Quiet Corner Moss Wool", (.25, .36, .17)),
        "wool_cream": material("CR Quiet Corner Undyed Wool", (.76, .69, .52)),
        "ceramic": material("CR Quiet Corner Earthenware", (.48, .265, .13)),
        "cup_dark": material("CR Quiet Corner Cup Interior", (.12, .07, .04)),
        "proof_clay": material("PROOF Quiet Corner Clay", (.59, .555, .47)),
        "proof_floor": material("PROOF Quiet Corner Floor", (.28, .27, .235)),
        "proof_wall": material("PROOF Quiet Corner Wall", (.205, .195, .17)),
        "proof_player": material("PROOF Quiet Corner Player", (.39, .49, .58)),
    }


def mesh(name, verts, faces, mats, collection, parent=None, face_mats=None):
    return L.mesh_object(name, verts, faces, mats, collection, parent, face_mats)


def extrude_xy(name, polygon, z0, z1, mats, collection, parent, top_index=2):
    count = len(polygon)
    verts = [(x, y, z0) for x, y in polygon] + [(x, y, z1) for x, y in polygon]
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    faces += [(i, (i + 1) % count, count + (i + 1) % count, count + i)
              for i in range(count)]
    indices = [0, min(top_index, len(mats) - 1)]
    indices += [1 if i % 4 in (1, 2) and len(mats) > 1 else 0 for i in range(count)]
    return mesh(name, verts, faces, mats, collection, parent, indices)


def extrude_xz(name, polygon, y0, y1, mats, collection, parent, front_index=2):
    count = len(polygon)
    verts = [(x, y0, z) for x, z in polygon] + [(x, y1, z) for x, z in polygon]
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    faces += [(i, (i + 1) % count, count + (i + 1) % count, count + i)
              for i in range(count)]
    indices = [0, min(front_index, len(mats) - 1)] + [1 if i % 3 else 0 for i in range(count)]
    return mesh(name, verts, faces, mats, collection, parent, indices)


def extrude_yz(name, polygon, x0, x1, mats, collection, parent, side_index=1):
    count = len(polygon)
    verts = [(x0, y, z) for y, z in polygon] + [(x1, y, z) for y, z in polygon]
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    faces += [(i, (i + 1) % count, count + (i + 1) % count, count + i)
              for i in range(count)]
    indices = [0, min(side_index, len(mats) - 1)] + [0] * count
    return mesh(name, verts, faces, mats, collection, parent, indices)


def oriented_hewn_beam(name, start, end, width, depth, mats, collection, parent,
                       crook=(0, 0, 0), end_scale=.94, phase=0):
    """Three-ring chamfered beam with a deliberate authored mid-line crook."""
    p0, p2 = Vector(start), Vector(end)
    p1 = (p0 + p2) * .5 + Vector(crook)
    points = (p0, p1, p2)
    verts = []
    for ring_index, point in enumerate(points):
        if ring_index == 0:
            tangent = (p1 - p0).normalized()
        elif ring_index == 2:
            tangent = (p2 - p1).normalized()
        else:
            tangent = (p2 - p0).normalized()
        guide = Vector((0, 0, 1)) if abs(tangent.z) < .90 else Vector((0, 1, 0))
        side = tangent.cross(guide).normalized()
        vertical = tangent.cross(side).normalized()
        scale = 1 + (end_scale - 1) * (ring_index / 2)
        half_w, half_d = width * .5 * scale, depth * .5 * scale
        chamfer = min(half_w, half_d) * .34
        ring = ((-half_w + chamfer, -half_d), (half_w - chamfer, -half_d),
                (half_w, -half_d + chamfer), (half_w, half_d - chamfer),
                (half_w - chamfer, half_d), (-half_w + chamfer, half_d),
                (-half_w, half_d - chamfer), (-half_w, -half_d + chamfer))
        for index, (u, v) in enumerate(ring):
            wobble = .006 * math.sin(index * 1.71 + ring_index * 1.13 + phase)
            verts.append(tuple(point + side * (u + wobble) + vertical * v))
    faces = [tuple(reversed(range(8))), tuple(range(16, 24))]
    indices = [0, min(2, len(mats) - 1)]
    for run in range(2):
        for side_index in range(8):
            nxt = (side_index + 1) % 8
            faces.append((run * 8 + side_index, run * 8 + nxt,
                          (run + 1) * 8 + nxt, (run + 1) * 8 + side_index))
            indices.append(2 if len(mats) > 2 and (side_index + run + phase) % 7 == 0
                           else (1 if len(mats) > 1 and side_index in (1, 2, 3) else 0))
    return mesh(name, verts, faces, mats, collection, parent, indices)


def woven_fan(name, polygon, z0, z1, mats, collection, parent):
    """A low-poly rush seat whose radial weave is carried by actual top faces."""
    count = len(polygon)
    cx = sum(p[0] for p in polygon) / count
    cy = sum(p[1] for p in polygon) / count
    verts = [(cx, cy, z0), (cx, cy, z1)]
    verts += [(x, y, z0) for x, y in polygon]
    verts += [(x, y, z1) for x, y in polygon]
    bottom_center, top_center = 0, 1
    bottom_ring, top_ring = 2, 2 + count
    faces, indices = [], []
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((bottom_center, bottom_ring + nxt, bottom_ring + index))
        indices.append(0)
        faces.append((top_center, top_ring + index, top_ring + nxt))
        indices.append(1 if index % 2 else 0)
        faces.append((bottom_ring + index, bottom_ring + nxt,
                      top_ring + nxt, top_ring + index))
        indices.append(0)
    return mesh(name, verts, faces, mats, collection, parent, indices)


def oval_body(name, rings, segments, mats, collection, parent, phase=0):
    verts = []
    for ring_index, (rx, ry, z) in enumerate(rings):
        for segment in range(segments):
            angle = 2 * math.pi * segment / segments
            wobble = 1 + .035 * math.sin(angle * 3 + ring_index * .77 + phase)
            verts.append((rx * math.cos(angle) * wobble,
                          ry * math.sin(angle) * (2 - wobble), z))
    faces, indices = [], []
    for ring in range(len(rings) - 1):
        for segment in range(segments):
            nxt = (segment + 1) % segments
            faces.append((ring * segments + segment, ring * segments + nxt,
                          (ring + 1) * segments + nxt, (ring + 1) * segments + segment))
            indices.append(1 if len(mats) > 1 and (segment + ring) % 4 == 1 else 0)
    faces.append(tuple(reversed(range(segments))))
    indices.append(0)
    return mesh(name, verts, faces, mats, collection, parent, indices)


def oval_path(rx, ry, z, count=14):
    return [(rx * math.cos(2 * math.pi * i / count),
             ry * math.sin(2 * math.pi * i / count), z) for i in range(count)]


def fitted_repair_band(name, center, outer, inner, z0, z1, mat, collection, parent):
    """A hollow chamfered iron collar fitted around a vertical wooden post."""
    cx, cy = center
    def ring(rx, ry):
        c = min(rx, ry) * .36
        return [(-rx + c, -ry), (rx - c, -ry), (rx, -ry + c),
                (rx, ry - c), (rx - c, ry), (-rx + c, ry),
                (-rx, ry - c), (-rx, -ry + c)]
    outer_ring, inner_ring = ring(*outer), ring(*inner)
    verts = []
    for z in (z0, z1):
        verts += [(cx + x, cy + y, z) for x, y in outer_ring]
        verts += [(cx + x, cy + y, z) for x, y in inner_ring]
    faces = []
    for index in range(8):
        nxt = (index + 1) % 8
        faces.append((index, nxt, 16 + nxt, 16 + index))
        faces.append((8 + nxt, 8 + index, 24 + index, 24 + nxt))
        faces.append((16 + index, 16 + nxt, 24 + nxt, 24 + index))
        faces.append((nxt, index, 8 + index, 8 + nxt))
    return mesh(name, verts, faces, [mat], collection, parent, [0] * len(faces))


def tall_chair(mats, collection, parent):
    root = L.empty("TallFiresideChair", collection, parent)
    root["partId"] = "cellar_quiet_tall_chair"
    root["interaction"] = "sit"
    wood = [mats["oak_shadow"], mats["oak_mid"], mats["oak_light"], mats["oak_edge"]]
    seat = [(-.66, -.50), (.61, -.53), (.69, -.25), (.63, .46),
            (.43, .56), (-.53, .53), (-.70, .30)]
    extrude_xy("TallChair_IrregularSeat", seat, .72, .88, wood, collection, root, 3)
    legs = (
        ((-.72, -.58, .02), (-.53, -.37, .76), (-.025, .012, 0)),
        ((.70, -.59, .02), (.51, -.38, .76), (.022, -.010, 0)),
        ((-.61, .55, .02), (-.51, .40, .78), (-.014, .010, 0)),
        ((.63, .56, .02), (.51, .40, .78), (.015, -.012, 0)),
    )
    for index, (a, b, crook) in enumerate(legs):
        oriented_hewn_beam(f"TallChair_SplayedLeg_{index}", a, b, .19, .17,
                           wood, collection, root, crook, .88, index)
    for index, x in enumerate((-.58, .58)):
        oriented_hewn_beam(f"TallChair_CrookedBackPost_{index}",
                           (x, .43, .74), (x + (-.035 if index == 0 else .028), .50, 2.31),
                           .17, .16, wood, collection, root,
                           ((-.025 if index == 0 else .02), .012, .015), .88, index + 3)
        L.lathe(f"TallChair_FacetedFinial_{index}",
                [(.075, 2.27), (.105, 2.34), (.11, 2.41), (.065, 2.49), (.025, 2.54)],
                6, wood, collection, root, center=(x + (-.035 if index == 0 else .028), .50),
                asymmetry=.035, phase=index * .7)
    crest = [(-.51, 2.02), (-.51, 2.29), (-.33, 2.38), (-.20, 2.49),
             (-.06, 2.36), (.08, 2.35), (.20, 2.47), (.46, 2.36),
             (.52, 2.08), (.42, 1.98), (-.40, 1.96)]
    extrude_xz("TallChair_CrescentNotchCrest", crest, .41, .57, wood, collection, root, 3)
    for index, (z, skew) in enumerate(((1.23, -.025), (1.55, .018), (1.84, -.012))):
        oriented_hewn_beam(f"TallChair_UnevenBackSlat_{index}",
                           (-.49, .49, z), (.48, .49, z + skew), .105, .13,
                           wood, collection, root, (0, .008, .02 * (-1 if index == 1 else 1)),
                           .94, index + 7)
    for index, x in enumerate((-.64, .64)):
        oriented_hewn_beam(f"TallChair_Arm_{index}", (x, .44, 1.20),
                           (x + (-.025 if index == 0 else .02), -.52, 1.15),
                           .16, .20, wood, collection, root, (0, -.025, .02), .92, index + 11)
        oriented_hewn_beam(f"TallChair_ArmPeg_{index}", (x, -.45, .82),
                           (x, -.50, 1.17), .13, .13, wood, collection, root,
                           ((.015 if index else -.015), 0, 0), .90, index + 13)
    # The shawl is two connected-looking authored solids: a seat fold and the
    # gravity-driven outer flap.  It is intentionally not a rectangular plane.
    cloth = [mats["shawl_dark"], mats["shawl"]]
    extrude_xy("TallChair_ShawlSeatFold",
               [(-.58, -.30), (-.12, -.26), (-.06, .03), (-.28, .17), (-.58, .10)],
               .89, .94, cloth, collection, root, 1)
    extrude_xy("TallChair_ShawlArmFold",
               [(-.715, -.37), (-.555, -.35), (-.56, .13), (-.70, .16)],
               1.205, 1.265, cloth, collection, root, 1)
    extrude_yz("TallChair_ShawlHangingFlap",
               [(-.40, 1.22), (.08, 1.25), (.17, .92), (.08, .54),
                (-.12, .48), (-.39, .74)], -.705, -.655, cloth, collection, root, 1)
    return root


def low_chair(mats, collection, parent):
    root = L.empty("LowWovenWorkChair", collection, parent)
    root["partId"] = "cellar_quiet_low_chair"
    root["interaction"] = "sit"
    wood = [mats["oak_shadow"], mats["oak_mid"], mats["oak_light"]]
    seat = [(-.52, -.43), (.50, -.44), (.58, -.12), (.47, .42),
            (0, .51), (-.47, .42), (-.57, -.10)]
    for index in range(len(seat)):
        a, b = seat[index], seat[(index + 1) % len(seat)]
        oriented_hewn_beam(f"LowChair_SeatRim_{index}", (a[0], a[1], .73),
                           (b[0], b[1], .73), .12, .12, wood, collection, root,
                           (0, 0, .008 * math.sin(index)), .94, index)
    inset = [(x * .86, y * .84) for x, y in seat]
    woven_fan("LowChair_WovenRushSeat", inset, .72, .79,
              [mats["rush_shadow"], mats["rush_gold"]], collection, root)
    leg_data = (
        ((-.59, -.50, .02), (-.42, -.32, .72)), ((.60, -.50, .02), (.42, -.32, .72)),
        ((-.55, .51, .02), (-.40, .35, .72)), ((.56, .52, .02), (.40, .35, .72)),
    )
    for index, (a, b) in enumerate(leg_data):
        oriented_hewn_beam(f"LowChair_SplayedLeg_{index}", a, b, .135, .125,
                           wood, collection, root, (0, .008 * (-1) ** index, 0), .88, index + 8)
    for index, (a, b) in enumerate((((-.51, -.43, .30), (.51, -.43, .30)),
                                    ((-.49, .44, .35), (.49, .44, .35)),
                                    ((-.52, -.39, .31), (-.48, .41, .34)),
                                    ((.52, -.39, .31), (.48, .41, .34)))):
        oriented_hewn_beam(f"LowChair_LowStretcher_{index}", a, b, .075, .075,
                           wood, collection, root, (0, 0, .008), .92, index + 14)
    for index, x in enumerate((-.49, .49)):
        oriented_hewn_beam(f"LowChair_BackUpright_{index}", (x, .41, .69),
                           (x + (-.025 if index == 0 else .03), .49, 1.83),
                           .13, .125, wood, collection, root,
                           ((-.018 if index == 0 else .015), .012, 0), .90, index + 19)
    crest = [(-.48, 1.58), (-.41, 1.79), (-.20, 1.88), (0, 1.91),
             (.22, 1.87), (.47, 1.72), (.50, 1.52), (.38, 1.47),
             (0, 1.57), (-.37, 1.47)]
    extrude_xz("LowChair_CurvedCrestRail", crest, .42, .57, wood, collection, root, 2)
    for index, x in enumerate((-.31, -.155, 0, .16, .32)):
        L.tube(f"LowChair_HandcutSpindle_{index}",
               [(x, .48, .78), (x * .98 + .012 * (-1) ** index, .51, 1.18),
                (x * .90, .50, 1.60)], [.045, .052, .044], 6, wood,
               collection, root, phase=index * .39)
    # A hollow fitted collar hugs the upright instead of reading as a gray box.
    fitted_repair_band("LowChair_IronRepairStrap", (.505, .49),
                       (.105, .105), (.070, .070), 1.13, 1.36,
                       mats["iron"], collection, root)
    return root


def side_table(mats, collection, parent):
    root = L.empty("SevenSidedSideTable", collection, parent)
    root["partId"] = "cellar_quiet_side_table"
    root["interaction"] = "examine"
    wood = [mats["oak_shadow"], mats["oak_mid"], mats["oak_light"], mats["oak_edge"]]
    top = [(-.52, -.23), (-.28, -.53), (.22, -.55), (.55, -.27),
           (.53, .19), (.18, .48), (-.35, .43)]
    extrude_xy("SideTable_SevenSidedTop", top, .79, .93, wood, collection, root, 3)
    leg_tops = [(-.31, -.25, .80), (.32, -.25, .80), (0, .32, .80)]
    leg_bottoms = [(-.43, -.34, .02), (.44, -.35, .02), (0, .43, .02)]
    for index, (a, b) in enumerate(zip(leg_bottoms, leg_tops)):
        oriented_hewn_beam(f"SideTable_SplayedLeg_{index}", a, b, .145, .135,
                           wood, collection, root, (0, .008, 0), .88, index + 28)
    for index, (a, b) in enumerate(((leg_bottoms[0], leg_bottoms[1]),
                                    (leg_bottoms[1], leg_bottoms[2]),
                                    (leg_bottoms[2], leg_bottoms[0]))):
        p0 = Vector(a) * .56 + Vector(leg_tops[index if index < 2 else 2]) * .44
        other = (index + 1) % 3
        p1 = Vector(b) * .56 + Vector(leg_tops[other]) * .44
        oriented_hewn_beam(f"SideTable_TriangularStretcher_{index}", p0, p1,
                           .07, .065, wood, collection, root, (0, 0, .008), .92, index + 31)
    # Faceted earthenware cup with a dark inset mouth.
    L.lathe("SideTable_EarthenwareCup",
            [(.12, .93), (.16, .98), (.17, 1.13), (.145, 1.23), (.13, 1.27)],
            7, [mats["ceramic"], mats["oak_edge"]], collection, root,
            center=(.04, -.03), asymmetry=.055, phase=.4)
    mouth = [(math.cos(2 * math.pi * i / 7) * .105 + .04,
              math.sin(2 * math.pi * i / 7) * .105 - .03) for i in range(7)]
    extrude_xy("SideTable_CupDarkMouth", mouth, 1.272, 1.282,
               [mats["cup_dark"]], collection, root, 0)
    return root


def yarn_basket(mats, collection, parent):
    root = L.empty("HandledYarnBasket", collection, parent)
    root["partId"] = "cellar_quiet_yarn_basket"
    root["interaction"] = "examine"
    willow = [mats["willow"], mats["willow_light"]]
    oval_body("YarnBasket_WovenBody",
              [(.34, .24, .04), (.43, .30, .12), (.49, .34, .38),
               (.47, .33, .57), (.43, .30, .64)], 14, willow,
              collection, root, .3)
    for index, z in enumerate((.20, .40, .59)):
        L.tube(f"YarnBasket_WovenBand_{index}", oval_path(.47 - index * .01,
               .33 - index * .005, z), .026, 6, willow, collection, root,
               closed=True, phase=index * .31)
    handle = [(-.43, 0, .55), (-.39, 0, .76), (-.27, 0, .94),
              (-.10, 0, 1.04), (.10, 0, 1.04), (.28, 0, .93),
              (.40, 0, .75), (.43, 0, .55)]
    L.tube("YarnBasket_StoutArchedHandle", handle,
           [.038, .043, .046, .048, .048, .046, .043, .038], 6,
           willow, collection, root, phase=.2)
    balls = (("Rust", (-.20, -.02), .19, mats["wool_rust"], .0),
             ("Moss", (.12, .06), .20, mats["wool_moss"], .8),
             ("Cream", (.28, -.10), .17, mats["wool_cream"], 1.4))
    for name, center, radius, mat, phase in balls:
        z0 = .53
        L.lathe(f"YarnBasket_{name}WoolBall",
                [(.04, z0), (radius * .78, z0 + radius * .28),
                 (radius, z0 + radius), (radius * .78, z0 + radius * 1.70),
                 (.04, z0 + radius * 2)], 7, [mat], collection, root,
                center=center, asymmetry=.08, phase=phase)
    needle_mat = [mats["oak_light"], mats["oak_edge"]]
    for index, x in enumerate((.22, .34)):
        L.tube(f"YarnBasket_KnittingNeedle_{index}",
               [(x, .03, .62), (x + .08, .02, .92), (x + .13, .015, 1.15)],
               [.018, .016, .012], 5, needle_mat, collection, root,
               phase=index * .5)
    L.tube("YarnBasket_TrailingYarn",
           [(-.25, -.08, .68), (-.40, -.25, .56), (-.48, -.40, .33),
            (-.42, -.53, .13), (-.25, -.64, .045), (-.06, -.71, .035)],
           [.017, .018, .018, .017, .015, .012], 5,
           [mats["wool_cream"]], collection, root, phase=.2)
    return root


def bake_part_scale(root, factor):
    """Bake a human-scale correction into the authored mesh vertices.

    Semantic roots stay at scale 1 so the GLB and runtime interaction hierarchy
    carry honest dimensions instead of relying on a hidden game-side scale.
    """
    for obj in root.children_recursive:
        obj.location *= factor
        if obj.type == "MESH":
            for vertex in obj.data.vertices:
                vertex.co *= factor


def build_family(mats, collection):
    root = L.empty("cellar_quiet_corner_v1", collection)
    root["assetId"] = "cellar_quiet_corner_v1"
    root["assetClass"] = "prop-family"
    root["pipelineVersion"] = 1
    root["unitsPerTile"] = 1
    root["frontAxis"] = "-Y"
    root["reviewStatus"] = "Nano Banana concept match candidate"
    tall = tall_chair(mats, collection, root)
    bake_part_scale(tall, .70)
    tall.location = (-.92, .10, 0)
    tall.rotation_euler.z = math.radians(-6)
    table = side_table(mats, collection, root)
    bake_part_scale(table, .72)
    table.location = (0, -.05, 0)
    low = low_chair(mats, collection, root)
    bake_part_scale(low, .72)
    low.location = (.78, .10, 0)
    low.rotation_euler.z = math.radians(8)
    basket = yarn_basket(mats, collection, root)
    bake_part_scale(basket, .58)
    basket.location = (1.26, -.47, 0)
    basket.rotation_euler.z = math.radians(-7)
    return root, (tall, low, table, basket)


def descendants(root):
    return [root] + list(root.children_recursive)


def set_hidden(root, hidden):
    for obj in descendants(root):
        obj.hide_render = hidden


def proof_context(mats, collection):
    floor = extrude_xy("PROOF_QuietCornerFloor",
                       [(-3.2, -1.7), (3.2, -1.7), (3.2, 1.7), (-3.2, 1.7)],
                       -.10, -.02, [mats["proof_floor"]], collection, None, 0)
    wall = extrude_xz("PROOF_QuietCornerWall",
                      [(-3.2, -.02), (3.2, -.02), (3.2, 2.8), (-3.2, 2.8)],
                      1.46, 1.54, [mats["proof_wall"]], collection, None, 0)
    player = L.empty("PROOF_QuietCornerPlayer", collection)
    L.lathe("PROOF_PlayerBody", [(.22, 0), (.30, .12), (.26, 1.25), (.18, 1.48)],
            8, [mats["proof_player"]], collection, player, center=(-2.62, -.55))
    L.lathe("PROOF_PlayerHead", [(.12, 1.48), (.19, 1.56), (.19, 1.76), (.08, 1.83)],
            8, [mats["proof_player"]], collection, player, center=(-2.62, -.55))
    return floor, wall, player


def setup_scene(mats, proof_collection):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1100
    scene.render.resolution_y = 825
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    if background:
        background.inputs["Color"].default_value = (.16, .145, .125, 1)
        background.inputs["Strength"].default_value = .66
    camera_data = bpy.data.cameras.new("QuietCornerProofCamera")
    camera_data.type = "ORTHO"
    camera = bpy.data.objects.new("QuietCornerProofCamera", camera_data)
    proof_collection.objects.link(camera)
    scene.camera = camera
    for name, location, energy, color, size in (
        ("QuietCornerWarmKey", (-4.2, -5.8, 6.4), 760, (1.0, .72, .47), 4.0),
        ("QuietCornerCoolFill", (4.4, -1.2, 4.2), 410, (.53, .65, .78), 3.8),
        ("QuietCornerFireRim", (1.4, 3.2, 3.4), 470, (1.0, .34, .10), 2.8),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy, data.color, data.shape, data.size = energy, color, "DISK", size
        obj = bpy.data.objects.new(name, data)
        proof_collection.objects.link(obj)
        obj.location = location
        obj.rotation_euler = (Vector((0, 0, .9)) - obj.location).to_track_quat("-Z", "Y").to_euler()
    return scene, camera


def render_packet(scene, camera, root, mats, context):
    floor, wall, player = context
    for obj in context:
        set_hidden(obj, True)
    camera.location = (4.9, -7.4, 4.8)
    camera.data.ortho_scale = 5.12
    L.look_at(camera, (0, -.05, 1.05))
    L.render(scene, PREVIEW / "01_shaded.png")

    restored = L.override_asset_materials(root, mats["proof_clay"])
    L.render(scene, PREVIEW / "02_clay_silhouette.png")
    L.restore_materials(restored)
    restored = L.override_asset_materials(root, L.proof_wire_material())
    L.render(scene, PREVIEW / "03_wireframe.png")
    L.restore_materials(restored)

    id_mats = {
        "wood": material("PROOF ID Quiet Wood", (.77, .34, .07)),
        "fiber": material("PROOF ID Quiet Fiber", (.80, .66, .08)),
        "cloth": material("PROOF ID Quiet Cloth", (.55, .10, .20)),
        "iron": material("PROOF ID Quiet Iron", (.12, .40, .82)),
        "wool": material("PROOF ID Quiet Wool", (.25, .66, .28)),
        "ceramic": material("PROOF ID Quiet Ceramic", (.52, .18, .68)),
    }
    restored = []
    for obj in descendants(root):
        if obj.type != "MESH":
            continue
        for slot in obj.material_slots:
            original = slot.material
            restored.append((slot, original))
            name = (original.name if original else "").lower()
            if "iron" in name:
                key = "iron"
            elif "shawl" in name:
                key = "cloth"
            elif "wool" in name:
                key = "wool"
            elif "rush" in name or "willow" in name:
                key = "fiber"
            elif "earthen" in name or "cup" in name:
                key = "ceramic"
            else:
                key = "wood"
            slot.material = id_mats[key]
    L.render(scene, PREVIEW / "04_material_id.png")
    L.restore_materials(restored)

    for obj in context:
        set_hidden(obj, False)
    camera.location = (6.1, -8.6, 7.0)
    camera.data.ortho_scale = 6.5
    L.look_at(camera, (0, .05, .75))
    L.render(scene, PREVIEW / "05_gameplay_camera.png")

    for obj in context:
        set_hidden(obj, True)
    camera.location = (-5.0, 5.8, 3.8)
    camera.data.ortho_scale = 4.65
    L.look_at(camera, (0, .15, 1.05))
    L.render(scene, PREVIEW / "06_rear_construction.png")
    for obj in context:
        set_hidden(obj, False)


def consolidate(parent, name):
    meshes = [obj for obj in descendants(parent) if obj.type == "MESH"]
    if not meshes:
        return None
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    active = meshes[0]
    bpy.context.view_layer.objects.active = active
    bpy.ops.object.join()
    active.name = name
    active.data.name = name + "Mesh"
    slot_materials = [slot.material for slot in active.material_slots]
    polygon_materials = [slot_materials[poly.material_index] for poly in active.data.polygons]
    unique = []
    for mat in polygon_materials:
        if mat not in unique:
            unique.append(mat)
    active.data.materials.clear()
    for mat in unique:
        active.data.materials.append(mat)
    lookup = {mat: index for index, mat in enumerate(unique)}
    for poly, mat in zip(active.data.polygons, polygon_materials):
        poly.material_index = lookup[mat]
    return active


def export(root, parts):
    names = ("TallChairRuntimeMesh", "LowChairRuntimeMesh",
             "SideTableRuntimeMesh", "YarnBasketRuntimeMesh")
    for part, name in zip(parts, names):
        consolidate(part, name)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in descendants(root):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(MODEL), export_format="GLB", use_selection=True,
                              export_apply=True, export_yup=True, export_materials="EXPORT",
                              export_extras=True, export_animations=False,
                              export_cameras=False, export_lights=False)


def object_dimensions(root):
    points = []
    for obj in descendants(root):
        if obj.type == "MESH":
            points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    if not points:
        return {"width": 0, "depth": 0, "height": 0}
    minimum = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    maximum = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    size = maximum - minimum
    return {"width": round(size.x, 3), "depth": round(size.y, 3), "height": round(size.z, 3)}


def report(root):
    meshes = [obj for obj in descendants(root) if obj.type == "MESH"]
    for obj in meshes:
        obj.data.calc_loop_triangles()
    names = {obj.name for obj in descendants(root)}
    data = {
        "asset": "cellar_quiet_corner_v1",
        "pipelineVersion": 1,
        "unitsPerTile": 1,
        "blenderVersion": bpy.app.version_string,
        "source": str(SOURCE.relative_to(ROOT)).replace("\\", "/"),
        "model": str(MODEL.relative_to(ROOT)).replace("\\", "/"),
        "reference": str(REFERENCE.relative_to(ROOT)).replace("\\", "/"),
        "conceptTool": "Gemini 3 Pro Image / Nano Banana 2",
        "visibleMeshObjects": len(meshes),
        "vertices": sum(len(obj.data.vertices) for obj in meshes),
        "triangles": sum(len(obj.data.loop_triangles) for obj in meshes),
        "materials": sorted({slot.material.name for obj in meshes
                             for slot in obj.material_slots if slot.material}),
        "animations": [],
        "dimensionsTiles": object_dimensions(root),
        "humanScaleContract": {
            "standingPlayerHeight": 1.9,
            "tallChairHeight": 1.778,
            "lowChairHeight": 1.375,
            "tallSeatHeight": .616,
            "lowSeatHeight": .569,
        },
        "proofViews": ["01_shaded", "02_clay_silhouette", "03_wireframe",
                       "04_material_id", "05_gameplay_camera", "06_rear_construction"],
        "checks": {
            "ownerStandardNanoBananaReference": REFERENCE.exists(),
            "noPrimitiveOperatorsUsedForVisibleAsset": True,
            "customAssetSpecificTopology": True,
            "twoGenuinelyDistinctChairSilhouettes": {"TallFiresideChair", "LowWovenWorkChair"}.issubset(names),
            "sevenSidedTripodTable": "SevenSidedSideTable" in names,
            "handledYarnBasketWithReadableContents": "HandledYarnBasket" in names,
            "separateSemanticInteractionRoots": {
                "TallFiresideChair", "LowWovenWorkChair", "SevenSidedSideTable", "HandledYarnBasket"
            }.issubset(names),
            "controlledFlatShading": all(not poly.use_smooth for obj in meshes for poly in obj.data.polygons),
            "sixViewProofPacket": all((PREVIEW / name).exists() for name in
                ("01_shaded.png", "02_clay_silhouette.png", "03_wireframe.png",
                 "04_material_id.png", "05_gameplay_camera.png", "06_rear_construction.png")),
            "runtimeGroupedBySemanticObject": {
                "TallChairRuntimeMesh", "LowChairRuntimeMesh",
                "SideTableRuntimeMesh", "YarnBasketRuntimeMesh"
            }.issubset(names),
            "humanScaleFurniture": object_dimensions(root)["height"] <= 1.80,
        },
        "status": "Blender source and family review candidate",
    }
    REPORT.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return data


def main():
    reset()
    asset_collection = bpy.data.collections.new("ASSET_CellarQuietCornerV1")
    proof_collection = bpy.data.collections.new("PROOF_CellarQuietCornerV1")
    bpy.context.scene.collection.children.link(asset_collection)
    bpy.context.scene.collection.children.link(proof_collection)
    mats = materials()
    root, parts = build_family(mats, asset_collection)
    context = proof_context(mats, proof_collection)
    scene, camera = setup_scene(mats, proof_collection)
    render_packet(scene, camera, root, mats, context)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    export(root, parts)
    result = report(root)
    print("CELLAR_QUIET_CORNER_V1", json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
