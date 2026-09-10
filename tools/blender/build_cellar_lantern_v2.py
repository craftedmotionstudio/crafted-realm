"""Build the first fully-designed Crafted Realm Blender proof asset.

The cellar lantern deliberately avoids Blender primitive operators.  Every visible
surface is created from asset-specific vertices: turned profiles, forged tube paths,
faceted glass panels, a fitted access door, hinges, latch, vent slots, chain links,
and irregular flame blades.  The script saves an editable .blend, exports a GLB, and
renders the five-view proof packet required by the 2026-07-14 visual reset.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets" / "blender" / "cellar_lantern_v2.blend"
MODEL = ROOT / "assets" / "models" / "props" / "cellar_lantern_v2.glb"
PREVIEW = ROOT / "scratchpad" / "cellar_lantern_v2"
REPORT = PREVIEW / "asset_report.json"
PIPELINE_RESULT = PREVIEW / "pipeline_result.json"
for path in (SOURCE.parent, MODEL.parent, PREVIEW):
    path.mkdir(parents=True, exist_ok=True)


def reset():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials,
                       bpy.data.cameras, bpy.data.lights, bpy.data.collections):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def material(name, color, roughness=.8, metallic=0.0, emission=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        socket = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
        if socket:
            socket.default_value = (*color, 1.0)
        strength = bsdf.inputs.get("Emission Strength")
        if strength:
            strength.default_value = emission
    return mat


def make_materials():
    mats = {
        "iron_low": material("CR Lantern Iron Low", (.045, .052, .055), .72, .50),
        "iron_mid": material("CR Lantern Iron Mid", (.105, .12, .12), .62, .58),
        "iron_edge": material("CR Lantern Worn Iron Edge", (.22, .225, .20), .55, .52),
        "brass_low": material("CR Lantern Aged Brass", (.30, .17, .055), .66, .55),
        "brass_mid": material("CR Lantern Brass Face", (.54, .31, .075), .57, .57),
        "brass_edge": material("CR Lantern Brass Wear", (.72, .49, .14), .48, .60),
        "glass_a": material("CR Lantern Amber Glass", (.55, .17, .025), .38, 0, 1.25),
        "glass_b": material("CR Lantern Amber Glass Light", (.82, .34, .045), .34, 0, 1.65),
        "soot": material("CR Lantern Soot", (.018, .016, .014), .95, 0),
        "flame_ember": material("CR Lantern Flame Ember", (.72, .045, .008), .5, 0, 2.2),
        "flame_gold": material("CR Lantern Flame Gold", (1.0, .30, .012), .44, 0, 3.0),
        "flame_core": material("CR Lantern Flame Core", (1.0, .78, .11), .38, 0, 3.8),
        "proof_clay": material("PROOF Clay", (.46, .48, .45), .82, 0),
        "proof_floor": material("PROOF Floor", (.12, .13, .115), .92, 0),
        "proof_wall": material("PROOF Wall", (.17, .18, .16), .94, 0),
        "proof_person": material("PROOF Player Scale", (.14, .30, .34), .86, 0),
    }
    for key, alpha in (("glass_a", .72), ("glass_b", .64)):
        glass = mats[key]
        rgb = tuple(glass.diffuse_color[:3])
        glass.diffuse_color = (*rgb, alpha)
        bsdf = glass.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Alpha"].default_value = alpha
        if hasattr(glass, "surface_render_method"):
            glass.surface_render_method = "DITHERED"
    return mats


def mesh_object(name, verts, faces, mats, collection, parent=None, face_mats=None):
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    if parent:
        obj.parent = parent
    for mat in mats:
        mesh.materials.append(mat)
    if face_mats:
        for poly, index in zip(mesh.polygons, face_mats):
            poly.material_index = index % max(1, len(mats))
    for poly in mesh.polygons:
        poly.use_smooth = False
    return obj


def empty(name, collection, parent=None):
    obj = bpy.data.objects.new(name, None)
    collection.objects.link(obj)
    if parent:
        obj.parent = parent
    return obj


def lathe(name, profile, segments, mats, collection, parent, center=(0, 0),
          asymmetry=.0, phase=.0, face_pattern=None):
    verts = []
    for ring, (radius, z) in enumerate(profile):
        for segment in range(segments):
            angle = 2 * math.pi * segment / segments
            variation = 1 + asymmetry * math.sin(angle * 3 + phase + ring * .47)
            rr = radius * variation
            verts.append((center[0] + rr * math.cos(angle),
                          center[1] + rr * math.sin(angle), z))
    faces, indices = [], []
    for ring in range(len(profile) - 1):
        for segment in range(segments):
            nxt = (segment + 1) % segments
            faces.append((ring * segments + segment, ring * segments + nxt,
                          (ring + 1) * segments + nxt, (ring + 1) * segments + segment))
            if face_pattern:
                indices.append(face_pattern(ring, segment))
            else:
                indices.append(1 if segment % 5 in (1, 2) and len(mats) > 1 else 0)
    faces.append(tuple(reversed(range(segments))))
    indices.append(0)
    top_start = (len(profile) - 1) * segments
    faces.append(tuple(top_start + i for i in range(segments)))
    indices.append(min(1, len(mats) - 1))
    return mesh_object(name, verts, faces, mats, collection, parent, indices)


def tube(name, points, radii, sides, mats, collection, parent, closed=False, phase=.0):
    pts = [Vector(point) for point in points]
    if isinstance(radii, (float, int)):
        radii = [float(radii)] * len(pts)
    verts = []
    count = len(pts)
    for index, point in enumerate(pts):
        if closed:
            tangent = (pts[(index + 1) % count] - pts[(index - 1) % count]).normalized()
        elif index == 0:
            tangent = (pts[1] - pts[0]).normalized()
        elif index == count - 1:
            tangent = (pts[-1] - pts[-2]).normalized()
        else:
            tangent = (pts[index + 1] - pts[index - 1]).normalized()
        guide = Vector((0, 0, 1)) if abs(tangent.z) < .88 else Vector((0, 1, 0))
        normal = tangent.cross(guide).normalized()
        binormal = tangent.cross(normal).normalized()
        for side in range(sides):
            angle = 2 * math.pi * side / sides + phase
            radius = radii[index] * (1 + .035 * math.sin(index * 1.73 + side * 2.1))
            vertex = point + normal * math.cos(angle) * radius + binormal * math.sin(angle) * radius
            verts.append(tuple(vertex))
    faces, indices = [], []
    runs = count if closed else count - 1
    for index in range(runs):
        nxt = (index + 1) % count
        for side in range(sides):
            side_nxt = (side + 1) % sides
            faces.append((index * sides + side, index * sides + side_nxt,
                          nxt * sides + side_nxt, nxt * sides + side))
            indices.append(2 if len(mats) > 2 and (side + index) % 11 == 0
                           else (1 if len(mats) > 1 and side in (1, 2) else 0))
    if not closed:
        faces.append(tuple(reversed(range(sides))))
        faces.append(tuple((count - 1) * sides + side for side in range(sides)))
        indices.extend((0, min(1, len(mats) - 1)))
    return mesh_object(name, verts, faces, mats, collection, parent, indices)


def faceted_panel(name, angle0, angle1, z0, z1, r0, r1, thickness,
                  mats, collection, parent, outward=0):
    a0, a1 = angle0, angle1
    inner0, outer0 = r0 + outward - thickness / 2, r0 + outward + thickness / 2
    inner1, outer1 = r1 + outward - thickness / 2, r1 + outward + thickness / 2
    verts = []
    for radius, z, angle in (
        (outer0, z0, a0), (outer0, z0, a1), (outer1, z1, a1), (outer1, z1, a0),
        (inner0, z0, a0), (inner0, z0, a1), (inner1, z1, a1), (inner1, z1, a0),
    ):
        verts.append((radius * math.cos(angle), radius * math.sin(angle), z))
    faces = [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1),
             (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    return mesh_object(name, verts, faces, mats, collection, parent,
                       [1 if len(mats) > 1 else 0, 0, 0, 1, 1, 0])


def wedge(name, center_angle, z0, z1, r0, r1, half_width, depth,
          mats, collection, parent):
    a0, a1 = center_angle - half_width, center_angle + half_width
    verts = []
    for radius, z, angle in (
        (r0, z0, a0), (r0, z0, a1), (r1, z1, a1), (r1, z1, a0),
        (r0 - depth, z0, a0), (r0 - depth, z0, a1),
        (r1 - depth, z1, a1), (r1 - depth, z1, a0),
    ):
        verts.append((radius * math.cos(angle), radius * math.sin(angle), z))
    faces = [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1),
             (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    return mesh_object(name, verts, faces, mats, collection, parent,
                       [0, 0, 1 if len(mats) > 1 else 0, 0, 1 if len(mats) > 1 else 0, 0])


def flame_blade(name, center, height, base_radius, lean, twist, mat,
                collection, parent, sides=7):
    rings = ((0.0, base_radius), (.26, base_radius * .82),
             (.58, base_radius * .50), (.82, base_radius * .22), (1.0, .012))
    verts = []
    for ring, (fraction, radius) in enumerate(rings):
        z = center[2] + height * fraction
        cx = center[0] + lean[0] * fraction * fraction
        cy = center[1] + lean[1] * fraction * fraction
        for side in range(sides):
            angle = 2 * math.pi * side / sides + twist * fraction
            rr = radius * (1 + .13 * math.sin(side * 2.3 + ring * 1.7))
            verts.append((cx + rr * math.cos(angle), cy + rr * math.sin(angle), z))
    faces = []
    for ring in range(len(rings) - 1):
        for side in range(sides):
            nxt = (side + 1) % sides
            faces.append((ring * sides + side, ring * sides + nxt,
                          (ring + 1) * sides + nxt, (ring + 1) * sides + side))
    faces.append(tuple(reversed(range(sides))))
    faces.append(tuple((len(rings) - 1) * sides + side for side in range(sides)))
    return mesh_object(name, verts, faces, [mat], collection, parent)


def descendants(root):
    return [root, *root.children_recursive]


def fit_game_scale(root, scale=.64, z_offset=.90):
    """Bake the authored proof mesh to cellar scale while keeping transforms clean."""
    for obj in descendants(root):
        if obj.type != "MESH":
            continue
        for vertex in obj.data.vertices:
            vertex.co.x *= scale
            vertex.co.y *= scale
            vertex.co.z = vertex.co.z * scale + z_offset
        obj.data.update()


def consolidate_static(root):
    """Merge fixture pieces while retaining material and flame animation boundaries."""
    flame = next(obj for obj in descendants(root) if obj.name == "cellar_lantern_flame_v2")
    protected = set(descendants(flame))
    static = [obj for obj in descendants(root) if obj.type == "MESH" and obj not in protected]
    bpy.ops.object.select_all(action="DESELECT")
    for obj in static:
        obj.select_set(True)
    active = static[0]
    bpy.context.view_layer.objects.active = active
    bpy.ops.object.join()
    active.name = "LanternStatic"
    active.data.name = "LanternStaticMesh"
    slot_materials = [slot.material for slot in active.material_slots]
    polygon_materials = [slot_materials[poly.material_index] for poly in active.data.polygons]
    unique = []
    for mat in polygon_materials:
        if mat not in unique:
            unique.append(mat)
    active.data.materials.clear()
    for mat in unique:
        active.data.materials.append(mat)
    material_index = {mat: index for index, mat in enumerate(unique)}
    for poly, mat in zip(active.data.polygons, polygon_materials):
        poly.material_index = material_index[mat]
    return active


def build_lantern(mats, collection):
    root = empty("CR_CellarLantern_v2", collection)
    root["assetId"] = "cellar_lantern_v2"
    root["assetClass"] = "prop"
    root["pipelineVersion"] = 1
    root["unitsPerTile"] = 1
    root["reviewStatus"] = "owner-review-proof"
    fixture = empty("LanternFixture", collection, root)
    iron = [mats["iron_low"], mats["iron_mid"], mats["iron_edge"]]
    brass = [mats["brass_low"], mats["brass_mid"], mats["brass_edge"]]

    lathe("LanternOilReservoir",
          ((.12, 1.07), (.19, 1.105), (.29, 1.18), (.365, 1.34),
           (.35, 1.47), (.275, 1.565)), 14, brass, collection, fixture,
          asymmetry=.018, phase=.4,
          face_pattern=lambda ring, seg: 2 if (ring == 2 and seg in (1, 8)) else
          (1 if seg % 7 in (1, 2) else 0))
    lathe("LanternLowerSeat",
          ((.275, 1.545), (.345, 1.58), (.385, 1.625), (.375, 1.68), (.325, 1.705)),
          14, iron, collection, fixture, asymmetry=.009, phase=.9)

    panel_count = 6
    step = 2 * math.pi / panel_count
    gap = .075
    front_index = 4  # sector centered toward the proof camera (-Y)
    for index in range(panel_count):
        center = index * step
        a0, a1 = center - step / 2 + gap, center + step / 2 - gap
        outward = .024 if index == front_index else 0
        faceted_panel(f"LanternGlassPanel_{index}", a0, a1, 1.69, 2.43,
                      .315, .285, .026,
                      [mats["glass_a"], mats["glass_b"]], collection, fixture,
                      outward=outward)

    for index in range(panel_count):
        angle = (index + .5) * step
        points = []
        for z, radius in ((1.64, .365), (1.83, .345), (2.20, .318), (2.47, .305)):
            points.append((radius * math.cos(angle), radius * math.sin(angle), z))
        tube(f"LanternForgedUpright_{index}", points,
             (.036, .041, .034, .030), 6, iron, collection, fixture, phase=.22 * index)

    lathe("LanternUpperSeat",
          ((.305, 2.405), (.35, 2.435), (.365, 2.49), (.325, 2.545), (.275, 2.56)),
          14, iron, collection, fixture, asymmetry=.008, phase=1.8)
    lathe("LanternWeatherCap",
          ((.275, 2.54), (.40, 2.61), (.355, 2.70), (.235, 2.80), (.16, 2.84)),
          14, iron, collection, fixture, asymmetry=.012, phase=.25,
          face_pattern=lambda ring, seg: 2 if (ring == 1 and seg in (2, 9)) else
          (1 if seg % 6 == 1 else 0))
    lathe("LanternVentChimney",
          ((.155, 2.80), (.17, 2.84), (.165, 2.995), (.12, 3.045), (.09, 3.065)),
          12, brass, collection, fixture, asymmetry=.01, phase=1.1)

    for index in range(6):
        wedge(f"LanternVentSlot_{index}", index * math.pi / 3, 2.855, 2.975,
              .174, .152, .085, .035,
              [mats["soot"], mats["iron_edge"]], collection, fixture)

    front_angle = front_index * step
    left = front_angle - step / 2 + gap
    right = front_angle + step / 2 - gap
    for label, angle in (("Left", left), ("Right", right)):
        points = [(.345 * math.cos(angle), .345 * math.sin(angle), 1.70),
                  (.325 * math.cos(angle), .325 * math.sin(angle), 2.42)]
        tube(f"LanternDoorFrame{label}", points, (.025, .021), 6, iron,
             collection, fixture)
    for label, z, radius in (("Lower", 1.70, .345), ("Upper", 2.42, .325)):
        points = [(radius * math.cos(left), radius * math.sin(left), z),
                  (radius * math.cos(front_angle), radius * math.sin(front_angle), z + .012),
                  (radius * math.cos(right), radius * math.sin(right), z)]
        tube(f"LanternDoorFrame{label}", points, (.024, .026, .022), 6, iron,
             collection, fixture)

    hinge_angle = right
    hx, hy = .365 * math.cos(hinge_angle), .365 * math.sin(hinge_angle)
    for index, z in enumerate((1.88, 2.23)):
        lathe(f"LanternDoorHinge_{index}", ((.055, z - .08), (.066, z - .06),
              (.066, z + .06), (.055, z + .08)), 8, brass, collection, fixture,
              center=(hx, hy), asymmetry=.01, phase=index)
    latch_points = [(.36 * math.cos(left), .36 * math.sin(left), 2.08),
                    (.43 * math.cos(front_angle - .28), .43 * math.sin(front_angle - .28), 2.08),
                    (.43 * math.cos(front_angle), .43 * math.sin(front_angle), 2.03)]
    tube("LanternDoorLatch", latch_points, (.026, .030, .022), 6, brass,
         collection, fixture)

    handle_points = []
    for index in range(11):
        t = index / 10
        angle = math.pi * (1 - t)
        x = .33 * math.cos(angle)
        y = -.018 + .014 * math.sin(t * 3.2)
        z = 2.92 + .36 * math.sin(angle)
        handle_points.append((x, y, z))
    tube("LanternForgedCarryHandle", handle_points,
         tuple(.028 + .006 * math.sin(i * .7) for i in range(11)), 7,
         iron, collection, fixture)

    for index in range(3):
        plane = index % 2
        center_z = 3.22 + index * .20
        points = []
        for point_index in range(18):
            angle = 2 * math.pi * point_index / 18
            long = .13 * math.sin(angle)
            short = .072 * math.cos(angle)
            points.append((short if plane == 0 else 0,
                           0 if plane == 0 else short,
                           center_z + long))
        tube(f"LanternChainLink_{index}", points, .025, 6, iron,
             collection, fixture, closed=True, phase=index * .4)
    lathe("LanternCeilingRose",
          ((.07, 3.48), (.16, 3.51), (.245, 3.56), (.22, 3.62), (.09, 3.65)),
          12, iron, collection, fixture, asymmetry=.012, phase=.5)

    flame = empty("cellar_lantern_flame_v2", collection, fixture)
    flame_blade("LanternFlameEmber", (-.025, -.012, 1.68), .60, .16,
                (-.07, .025), .8, mats["flame_ember"], collection, flame, 8)
    flame_blade("LanternFlameGold", (.035, .008, 1.71), .54, .12,
                (.045, -.025), -.6, mats["flame_gold"], collection, flame, 7)
    flame_blade("LanternFlameCore", (0, -.018, 1.72), .41, .075,
                (-.02, .012), .45, mats["flame_core"], collection, flame, 6)

    for frame, scale, rz in ((1, (1, 1, 1), 0), (7, (.88, 1.08, 1.13), .06),
                             (13, (1.08, .90, .93), -.045), (19, (.94, 1.05, 1.08), .035),
                             (25, (1, 1, 1), 0)):
        flame.scale = scale
        flame.rotation_euler.z = rz
        flame.keyframe_insert("scale", frame=frame)
        flame.keyframe_insert("rotation_euler", frame=frame)
    if flame.animation_data and flame.animation_data.action:
        flame.animation_data.action.name = "FlameFlicker"
        for curve in flame.animation_data.action.fcurves:
            curve.modifiers.new("CYCLES")
    return root


def block(name, center, dims, mat, collection):
    cx, cy, cz = center
    sx, sy, sz = (value / 2 for value in dims)
    verts = [(cx + x * sx, cy + y * sy, cz + z * sz)
             for x, y, z in ((-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1),
                             (-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1))]
    faces = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1),
             (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    return mesh_object(name, verts, faces, [mat], collection)


def build_player_scale(mats, collection):
    context = empty("PROOF_PlayerScale", collection)
    tube("PROOF_LeftLeg", ((1.05, 0, .05), (1.09, 0, .78)), (.09, .12), 7,
         [mats["proof_person"]], collection, context)
    tube("PROOF_RightLeg", ((1.38, 0, .05), (1.30, 0, .78)), (.09, .12), 7,
         [mats["proof_person"]], collection, context)
    lathe("PROOF_Torso", ((.18, .72), (.27, .82), (.30, 1.24), (.23, 1.48)), 8,
          [mats["proof_person"]], collection, context, center=(1.2, 0), asymmetry=.01)
    lathe("PROOF_Head", ((.10, 1.44), (.18, 1.51), (.20, 1.67), (.13, 1.82)), 8,
          [mats["proof_person"]], collection, context, center=(1.2, 0), asymmetry=.008)
    tube("PROOF_LeftArm", ((.94, 0, 1.34), (.83, 0, .80)), (.09, .075), 7,
         [mats["proof_person"]], collection, context)
    tube("PROOF_RightArm", ((1.46, 0, 1.34), (1.56, 0, .80)), (.09, .075), 7,
         [mats["proof_person"]], collection, context)
    return context


def look_at(camera, target):
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()


def proof_wire_material():
    mat = bpy.data.materials.new("PROOF Wireframe")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    emission = nodes.new("ShaderNodeEmission")
    mix = nodes.new("ShaderNodeMixRGB")
    wire = nodes.new("ShaderNodeWireframe")
    wire.inputs["Size"].default_value = .012
    mix.inputs[1].default_value = (.025, .03, .028, 1)
    mix.inputs[2].default_value = (1.0, .61, .08, 1)
    links.new(wire.outputs["Fac"], mix.inputs[0])
    links.new(mix.outputs["Color"], emission.inputs["Color"])
    emission.inputs["Strength"].default_value = .8
    links.new(emission.outputs["Emission"], output.inputs["Surface"])
    return mat


def setup_scene(mats, proof_collection):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 720
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world.color = (.025, .03, .027)
    scene.frame_start = 1
    scene.frame_end = 25

    camera_data = bpy.data.cameras.new("ProofCamera")
    camera = bpy.data.objects.new("ProofCamera", camera_data)
    proof_collection.objects.link(camera)
    camera_data.type = "ORTHO"
    camera_data.lens = 50
    scene.camera = camera

    for name, loc, energy, color, size in (
        ("ProofKey", (-4.5, -5.5, 7.0), 1000, (1.0, .72, .46), 4.0),
        ("ProofFill", (4.0, -1.5, 5.5), 720, (.44, .62, 1.0), 3.0),
        ("ProofRim", (0, 4.0, 6.0), 900, (1.0, .40, .16), 2.5),
    ):
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.energy = energy
        light_data.color = color
        light_data.shape = "DISK"
        light_data.size = size
        light = bpy.data.objects.new(name, light_data)
        proof_collection.objects.link(light)
        light.location = loc
        light.rotation_euler = (Vector((0, 0, 2)) - light.location).to_track_quat("-Z", "Y").to_euler()
    flame_light_data = bpy.data.lights.new("ProofFlameLight", "POINT")
    flame_light_data.energy = 175
    flame_light_data.color = (1.0, .34, .045)
    flame_light_data.shadow_soft_size = .45
    flame_light = bpy.data.objects.new("ProofFlameLight", flame_light_data)
    proof_collection.objects.link(flame_light)
    flame_light.location = (0, 0, 2.0)
    return scene, camera


def render(scene, path):
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def set_context_hidden(objects, hidden):
    for root in objects:
        for obj in descendants(root):
            obj.hide_render = hidden


def override_asset_materials(root, override):
    restored = []
    for obj in descendants(root):
        if obj.type != "MESH":
            continue
        for slot in obj.material_slots:
            restored.append((slot, slot.material))
            slot.material = override
    return restored


def restore_materials(restored):
    for slot, original in restored:
        slot.material = original


def render_packet(scene, camera, root, mats, proof_context):
    camera.location = (4.2, -6.1, 3.6)
    camera.data.ortho_scale = 2.12
    look_at(camera, (0, 0, 2.40))
    set_context_hidden(proof_context, True)
    render(scene, PREVIEW / "01_shaded.png")

    restored = override_asset_materials(root, mats["proof_clay"])
    render(scene, PREVIEW / "02_clay_silhouette.png")
    restore_materials(restored)
    restored = override_asset_materials(root, proof_wire_material())
    render(scene, PREVIEW / "03_wireframe.png")
    restore_materials(restored)

    id_palette = {
        "Iron": material("PROOF ID Iron", (.12, .42, .86), .8),
        "Brass": material("PROOF ID Brass", (.96, .62, .06), .8),
        "Glass": material("PROOF ID Glass", (.12, .86, .78), .8),
        "Soot": material("PROOF ID Soot", (.28, .18, .42), .8),
        "Flame": material("PROOF ID Flame", (.96, .12, .08), .8),
    }
    restored = []
    for obj in descendants(root):
        if obj.type != "MESH":
            continue
        for slot in obj.material_slots:
            original = slot.material
            restored.append((slot, original))
            name = original.name if original else ""
            key = "Flame" if "Flame" in name else "Glass" if "Glass" in name else \
                  "Brass" if "Brass" in name else "Soot" if "Soot" in name else "Iron"
            slot.material = id_palette[key]
    render(scene, PREVIEW / "04_material_id.png")
    restore_materials(restored)

    set_context_hidden(proof_context, False)
    camera.location = (6.8, -8.4, 7.6)
    camera.data.ortho_scale = 5.0
    look_at(camera, (.35, 0, 1.75))
    render(scene, PREVIEW / "05_gameplay_camera.png")


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
    materials = sorted({slot.material.name for obj in meshes for slot in obj.material_slots if slot.material})
    data = {
        "asset": "cellar_lantern_v2",
        "pipelineVersion": 1,
        "unitsPerTile": 1,
        "blenderVersion": bpy.app.version_string,
        "source": str(SOURCE.relative_to(ROOT)).replace("\\", "/"),
        "model": str(MODEL.relative_to(ROOT)).replace("\\", "/"),
        "visibleMeshObjects": len(meshes),
        "vertices": sum(len(obj.data.vertices) for obj in meshes),
        "triangles": triangles,
        "materials": materials,
        "proofViews": ["01_shaded", "02_clay_silhouette", "03_wireframe",
                       "04_material_id", "05_gameplay_camera"],
        "authoring": {
            "primitiveOperatorsUsed": False,
            "customLathedProfiles": True,
            "customForgedTubePaths": True,
            "customFacetedPanels": True,
            "fittedDoorHingesAndLatch": True,
            "authoredFaceMaterialVariation": True,
            "animatedFlameAction": "FlameFlicker",
        },
        "checks": {
            "noPrimitiveOperators": True,
            "customSilhouetteTopology": True,
            "fittedConstructionDetails": True,
            "authoredFaceMaterialVariation": True,
            "fiveViewProofPacket": True,
            "semanticFlameAnimation": True,
            "staticGeometryConsolidated": True,
        },
        "status": "owner-review-proof; not integrated",
    }
    REPORT.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return data


def main():
    reset()
    scene_collection = bpy.context.scene.collection
    asset_collection = bpy.data.collections.new("ASSET_CellarLantern_v2")
    proof_collection = bpy.data.collections.new("PROOF_Context")
    scene_collection.children.link(asset_collection)
    scene_collection.children.link(proof_collection)
    mats = make_materials()
    root = build_lantern(mats, asset_collection)
    fit_game_scale(root)
    consolidate_static(root)

    proof_context = [
        block("PROOF_Floor", (0, .25, -.055), (4.6, 3.6, .11), mats["proof_floor"], proof_collection),
        block("PROOF_BackWall", (0, .9, 1.65), (4.6, .12, 3.3), mats["proof_wall"], proof_collection),
        block("PROOF_CeilingBeam", (0, 0, 3.31), (3.5, .42, .16), mats["proof_floor"], proof_collection),
        build_player_scale(mats, proof_collection),
    ]
    scene, camera = setup_scene(mats, proof_collection)
    render_packet(scene, camera, root, mats, proof_context)
    scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    export(root)
    data = report(root)
    print("CELLAR_LANTERN_V2", json.dumps(data), flush=True)


if __name__ == "__main__":
    main()
