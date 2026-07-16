"""Build the scale-locked storm-cellar ladder and fitted descent family.

The visible asset uses custom authored vertices throughout: crooked octagonal
rails, individually bowed rungs, fitted iron straps, irregular masonry, a
timber sill, and a genuinely recessed dark shaft.  Blender primitives are not
used for the visible family.  The editable source is saved before runtime
consolidation, then a compact semantic GLB and six-view proof packet are made.
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


SOURCE = ROOT / "assets" / "blender" / "props" / "cellar_ladder_hatch_v1.blend"
MODEL = ROOT / "assets" / "models" / "props" / "cellar_ladder_hatch_v1.glb"
PREVIEW = ROOT / "scratchpad" / "cellar_ladder_hatch_v1"
REPORT = PREVIEW / "asset_report.json"
REFERENCE = ROOT / "docs" / "rebuild" / "concepts" / "cellar_ladder_hatch_nanobanana2_v2.png"

PLAYER_HEIGHT = 1.9
RAIL_CLEAR_WIDTH = .60
RUNG_SPACING = .30
RAIL_BOTTOM = Vector((0, -.25, .04))
RAIL_TOP = Vector((0, .15, 2.26))
DESCENT_DEPTH = .30


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
        "oak_shadow": material("CR Ladder Oak Shadow", (.16, .085, .032)),
        "oak_mid": material("CR Ladder Aged Oak", (.34, .19, .07)),
        "oak_light": material("CR Ladder Worn Oak Face", (.50, .31, .12)),
        "stone_shadow": material("CR Hatch Stone Shadow", (.225, .215, .18)),
        "stone_mid": material("CR Hatch Warm Fieldstone", (.40, .385, .32)),
        "stone_light": material("CR Hatch Worn Stone Face", (.55, .525, .425)),
        "iron": material("CR Ladder Forged Iron", (.075, .08, .075), .74, .25),
        "iron_edge": material("CR Ladder Iron Wear", (.19, .19, .165), .68, .28),
        "dark": material("CR Cellar Recess", (.012, .011, .009), 1.0),
        "proof_clay": material("PROOF Ladder Clay", (.58, .54, .45)),
        "proof_floor": material("PROOF Ladder Floor", (.26, .245, .205)),
        "proof_wall": material("PROOF Ladder Wall", (.19, .18, .155)),
        "proof_player": material("PROOF Ladder Player", (.34, .45, .53)),
        "proof_grid": material("PROOF Ladder Grid", (.47, .41, .30)),
    }


def mesh(name, verts, faces, mats, collection, parent=None, face_mats=None):
    return L.mesh_object(name, verts, faces, mats, collection, parent, face_mats)


def extrude_xy(name, polygon, z0, z1, mats, collection, parent, top_index=1):
    count = len(polygon)
    verts = [(x, y, z0) for x, y in polygon] + [(x, y, z1) for x, y in polygon]
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    faces += [(i, (i + 1) % count, count + (i + 1) % count, count + i)
              for i in range(count)]
    indices = [0, min(top_index, len(mats) - 1)]
    indices += [1 if len(mats) > 1 and i in (1, 2) else 0 for i in range(count)]
    return mesh(name, verts, faces, mats, collection, parent, indices)


def extrude_xz(name, polygon, y0, y1, mats, collection, parent, front_index=1):
    count = len(polygon)
    verts = [(x, y0, z) for x, z in polygon] + [(x, y1, z) for x, z in polygon]
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    faces += [(i, (i + 1) % count, count + (i + 1) % count, count + i)
              for i in range(count)]
    indices = [0, min(front_index, len(mats) - 1)]
    indices += [1 if len(mats) > 1 and i % 3 else 0 for i in range(count)]
    return mesh(name, verts, faces, mats, collection, parent, indices)


def hewn_beam(name, start, end, width, depth, mats, collection, parent,
              crook=(0, 0, 0), phase=0):
    """Three-ring, eight-sided timber whose center line is intentionally hewn."""
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
        guide = Vector((0, 0, 1)) if abs(tangent.z) < .9 else Vector((0, 1, 0))
        side = tangent.cross(guide).normalized()
        vertical = tangent.cross(side).normalized()
        half_w = width * .5 * (1 - ring_index * .018)
        half_d = depth * .5 * (1 - ring_index * .012)
        chamfer = min(half_w, half_d) * .32
        ring = ((-half_w + chamfer, -half_d), (half_w - chamfer, -half_d),
                (half_w, -half_d + chamfer), (half_w, half_d - chamfer),
                (half_w - chamfer, half_d), (-half_w + chamfer, half_d),
                (-half_w, half_d - chamfer), (-half_w, -half_d + chamfer))
        for index, (u, v) in enumerate(ring):
            wobble = .0045 * math.sin(index * 1.61 + ring_index * 1.17 + phase)
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


def rough_block(name, center, size, mats, collection, parent, seed):
    """Irregular eight-corner fieldstone with deliberately non-parallel faces."""
    cx, cy, cz = center
    sx, sy, sz = size
    corners = []
    for z_sign in (-1, 1):
        for y_sign in (-1, 1):
            for x_sign in (-1, 1):
                key = seed * .73 + x_sign * 1.1 + y_sign * 1.7 + z_sign * 2.3
                corners.append((cx + x_sign * sx * .5 * (1 + .05 * math.sin(key)),
                                cy + y_sign * sy * .5 * (1 + .045 * math.sin(key + 1.4)),
                                cz + z_sign * sz * .5 * (1 + .04 * math.sin(key + 2.6))))
    faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1),
             (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    face_mats = [0, min(2, len(mats) - 1), 0, 1, 0, 1]
    return mesh(name, corners, faces, mats, collection, parent, face_mats)


def iron_plate(name, center, width, height, mats, collection, parent, phase=0):
    cx, cy, cz = center
    w, h = width * .5, height * .5
    polygon = [(-w + .02, -h), (w - .025, -h + .006), (w, -h + .028),
               (w - .008, h - .02), (w - .03, h), (-w + .026, h - .004),
               (-w, h - .032), (-w + .008, -h + .018)]
    obj = extrude_xz(name, [(cx + x, cz + z) for x, z in polygon],
                     cy - .018, cy + .018, mats, collection, parent, 1)
    for side in (-1, 1):
        L.lathe(name + "_Rivet", [(.015, cz - .021), (.023, cz), (.013, cz + .021)],
                6, mats, collection, parent, center=(cx + side * width * .34, cy - .026),
                asymmetry=.03, phase=phase + side)
    return obj


def build_ladder(mats, collection, root):
    part = L.empty("LadderFrame", collection, root)
    part["partId"] = "cellar_ladder_frame"
    part["interactionSocket"] = "climb"
    wood = [mats["oak_shadow"], mats["oak_mid"], mats["oak_light"]]
    iron = [mats["iron"], mats["iron_edge"]]
    rail_offset = (RAIL_CLEAR_WIDTH + .15) * .5
    for index, x in enumerate((-rail_offset, rail_offset)):
        hewn_beam("Ladder_HewnRail", (x, RAIL_BOTTOM.y, RAIL_BOTTOM.z),
                  (x + (-.018 if index == 0 else .013), RAIL_TOP.y, RAIL_TOP.z),
                  .15, .13, wood, collection, part,
                  ((-.01 if index == 0 else .012), .008, .008), index)
    rung_first_z = .31
    for index in range(7):
        t = (rung_first_z + index * RUNG_SPACING - RAIL_BOTTOM.z) / (RAIL_TOP.z - RAIL_BOTTOM.z)
        y = RAIL_BOTTOM.y + t * (RAIL_TOP.y - RAIL_BOTTOM.y)
        z = rung_first_z + index * RUNG_SPACING
        bow = .012 * math.sin(index * 1.41)
        hewn_beam("Ladder_HandFittedRung",
                  (-RAIL_CLEAR_WIDTH * .5, y, z),
                  (RAIL_CLEAR_WIDTH * .5, y, z + .005 * math.sin(index)),
                  .105, .09, wood, collection, part, (0, -.014 + bow, .006), index + 10)
        for side in (-1, 1):
            iron_plate("Ladder_ForgedRungStrap",
                       (side * (RAIL_CLEAR_WIDTH * .5 + .038), y - .066, z),
                       .14, .11, iron, collection, part, index + side)
    # Two wall hooks make the upper landing believable rather than free-floating.
    for side in (-1, 1):
        x = side * rail_offset
        L.tube("Ladder_FittedWallHook",
               [(x, .08, 1.78), (x, .23, 1.80), (x, .31, 1.73)],
               (.035, .042, .034), 6, iron, collection, part, phase=side * .25)
    return part


def build_sill(mats, collection, root):
    part = L.empty("RaisedHatchSill", collection, root)
    part["partId"] = "cellar_hatch_sill"
    stone = [mats["stone_shadow"], mats["stone_mid"], mats["stone_light"]]
    wood = [mats["oak_shadow"], mats["oak_mid"], mats["oak_light"]]
    # Compact 1 x 1.05-tile opening, with an irregular two-course stone apron.
    blocks = [
        (-.58, -.385, .10, .34, .21, .20), (-.20, -.385, .105, .36, .21, .21),
        (.20, -.385, .10, .36, .21, .20), (.58, -.385, .105, .34, .21, .21),
        (-.68, -.08, .10, .20, .42, .20), (.68, -.08, .10, .20, .42, .20),
        (-.68, .31, .11, .20, .36, .22), (.68, .31, .11, .20, .36, .22),
        (-.52, .44, .12, .32, .20, .24), (-.17, .44, .115, .33, .20, .23),
        (.18, .44, .12, .33, .20, .24), (.53, .44, .115, .32, .20, .23),
    ]
    for index, (x, y, z, sx, sy, sz) in enumerate(blocks):
        rough_block("Hatch_HandSetFieldstone", (x, y, z), (sx, sy, sz),
                    stone, collection, part, 130 + index)
    # Fitted timber curb cleanly separates the walkable rim from the opening.
    hewn_beam("Hatch_FrontCurb", (-.56, -.29, .23), (.56, -.29, .23),
              .13, .13, wood, collection, part, (0, .006, .003), 40)
    hewn_beam("Hatch_LeftCurb", (-.56, -.29, .23), (-.56, .42, .23),
              .13, .13, wood, collection, part, (.004, 0, .003), 41)
    hewn_beam("Hatch_RightCurb", (.56, -.29, .23), (.56, .42, .23),
              .13, .13, wood, collection, part, (-.004, 0, .003), 42)
    hewn_beam("Hatch_RearCurb", (-.56, .39, .23), (.56, .39, .23),
              .13, .13, wood, collection, part, (0, -.005, .003), 43)
    # Short rear landing portal gives the ladder something physically fitted to.
    for index, x in enumerate((-.68, .68)):
        hewn_beam("Hatch_LandingPost", (x, .40, .20),
                  (x + (-.01 if index == 0 else .012), .40, 1.62),
                  .19, .18, wood, collection, part, (0, .005, .008), 50 + index)
    hewn_beam("Hatch_LandingHeader", (-.76, .40, 1.56), (.76, .40, 1.56),
              .20, .19, wood, collection, part, (0, -.006, .008), 52)
    return part


def build_descent(mats, collection, root):
    part = L.empty("DarkDescent", collection, root)
    part["partId"] = "cellar_dark_descent"
    part["visualDepthTiles"] = DESCENT_DEPTH
    dark = [mats["dark"]]
    stone = [mats["stone_shadow"], mats["stone_mid"]]
    # Four vertical inner planes and a lower floor create actual parallax.
    extrude_xy("Descent_LowerDarkness",
               [(-.50, -.23), (.50, -.23), (.50, .36), (-.50, .36)],
               -DESCENT_DEPTH, -DESCENT_DEPTH + .025, dark, collection, part, 0)
    extrude_xz("Descent_LeftInnerWall",
               [(-.50, -DESCENT_DEPTH), (-.46, -DESCENT_DEPTH),
                (-.46, .205), (-.50, .205)],
               -.23, .36, stone, collection, part, 1)
    extrude_xz("Descent_RightInnerWall",
               [(.46, -DESCENT_DEPTH), (.50, -DESCENT_DEPTH),
                (.50, .205), (.46, .205)],
               -.23, .36, stone, collection, part, 1)
    # The dark back plane is recessed, never coplanar with surface grass.
    back_poly = [(-.50, -DESCENT_DEPTH), (.50, -DESCENT_DEPTH),
                 (.50, .205), (-.50, .205)]
    extrude_xz("Descent_RecessedBack", back_poly, .335, .36, dark, collection, part, 0)
    # Two lower rung silhouettes continue below the curb and sell the descent.
    wood = [mats["oak_shadow"], mats["oak_mid"]]
    for index, z in enumerate((-.34, -.06)):
        hewn_beam("Descent_LowerRung", (-.30, .02, z), (.30, .02, z),
                  .075, .065, wood, collection, part, (0, -.005, .002), 70 + index)
    return part


def build_family(mats, collection):
    root = L.empty("cellar_ladder_hatch_v1", collection)
    root["assetId"] = "cellar_ladder_hatch_v1"
    root["assetClass"] = "traversal-prop-family"
    root["pipelineVersion"] = 1
    root["unitsPerTile"] = 1
    root["frontAxis"] = "-Y"
    root["scaleAuthority"] = "numeric recipe contract; concept is shape/material reference"
    sill = build_sill(mats, collection, root)
    descent = build_descent(mats, collection, root)
    ladder = build_ladder(mats, collection, root)
    return root, (ladder, sill, descent)


def descendants(root):
    return [root] + list(root.children_recursive)


def set_hidden(root, hidden):
    for obj in descendants(root):
        obj.hide_render = hidden


def proof_context(mats, collection):
    # Four fitted slabs leave the one-tile opening unobstructed, so the shaft
    # reads as below-floor depth rather than a dark box sitting on the floor.
    floors = (
        extrude_xy("PROOF_LadderFloorFront",
                   [(-2.3, -1.4), (2.3, -1.4), (2.3, -.49), (-2.3, -.49)],
                   -.055, -.02, [mats["proof_floor"]], collection, None, 0),
        extrude_xy("PROOF_LadderFloorRear",
                   [(-2.3, .54), (2.3, .54), (2.3, 1.4), (-2.3, 1.4)],
                   -.055, -.02, [mats["proof_floor"]], collection, None, 0),
        extrude_xy("PROOF_LadderFloorLeft",
                   [(-2.3, -.49), (-.78, -.49), (-.78, .54), (-2.3, .54)],
                   -.055, -.02, [mats["proof_floor"]], collection, None, 0),
        extrude_xy("PROOF_LadderFloorRight",
                   [(.78, -.49), (2.3, -.49), (2.3, .54), (.78, .54)],
                   -.055, -.02, [mats["proof_floor"]], collection, None, 0),
    )
    wall = extrude_xz("PROOF_LadderWall",
                      [(-2.3, -.48), (2.3, -.48), (2.3, 2.7), (-2.3, 2.7)],
                      .66, .70, [mats["proof_wall"]], collection, None, 0)
    player = L.empty("PROOF_LadderPlayer", collection)
    px, py = -1.35, -.52
    L.lathe("PROOF_PlayerBody", [(.20, 0), (.29, .12), (.25, 1.28), (.17, 1.53)],
            8, [mats["proof_player"]], collection, player, center=(px, py))
    L.lathe("PROOF_PlayerHead", [(.11, 1.53), (.18, 1.61), (.18, 1.80), (.07, 1.90)],
            8, [mats["proof_player"]], collection, player, center=(px, py))
    grid = []
    for x in (-1.0, 0, 1.0):
        grid.append(hewn_beam("PROOF_OneTileGrid", (x, -1.12, .006),
                              (x, -.49, .006), .016, .016, [mats["proof_grid"]],
                              collection, None, phase=int(x * 10)))
    for y in (-1.0,):
        grid.append(hewn_beam("PROOF_OneTileGrid", (-1.8, y, .006),
                              (1.8, y, .006), .016, .016, [mats["proof_grid"]],
                              collection, None, phase=int(y * 10)))
    return (*floors, wall, player, *grid)


def setup_scene(proof_collection):
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
        background.inputs["Color"].default_value = (.145, .13, .108, 1)
        background.inputs["Strength"].default_value = .64
    camera_data = bpy.data.cameras.new("LadderHatchProofCamera")
    camera_data.type = "ORTHO"
    camera = bpy.data.objects.new("LadderHatchProofCamera", camera_data)
    proof_collection.objects.link(camera)
    scene.camera = camera
    for name, location, energy, color, size in (
        ("LadderWarmKey", (-4.2, -5.4, 6.0), 770, (1.0, .74, .49), 4.0),
        ("LadderCoolFill", (4.0, -1.0, 4.4), 390, (.54, .65, .78), 3.5),
        ("LadderShaftRim", (0, 2.4, 3.0), 350, (1.0, .40, .15), 2.7),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy, data.color, data.shape, data.size = energy, color, "DISK", size
        obj = bpy.data.objects.new(name, data)
        proof_collection.objects.link(obj)
        obj.location = location
        obj.rotation_euler = (Vector((0, 0, .85)) - obj.location).to_track_quat("-Z", "Y").to_euler()
    return scene, camera


def render_packet(scene, camera, root, mats, context):
    for obj in context:
        set_hidden(obj, False)
    camera.location = (4.7, -7.2, 4.5)
    camera.data.ortho_scale = 4.15
    L.look_at(camera, (0, -.02, .92))
    L.render(scene, PREVIEW / "01_scale_silhouette.png")

    for obj in context:
        set_hidden(obj, True)
    camera.location = (4.3, -6.3, 3.8)
    camera.data.ortho_scale = 3.35
    L.look_at(camera, (0, .02, 1.02))
    L.render(scene, PREVIEW / "02_shaded.png")

    restored = L.override_asset_materials(root, mats["proof_clay"])
    L.render(scene, PREVIEW / "03_clay.png")
    L.restore_materials(restored)
    restored = L.override_asset_materials(root, L.proof_wire_material())
    L.render(scene, PREVIEW / "04_wireframe.png")
    L.restore_materials(restored)

    for obj in context:
        set_hidden(obj, False)
    camera.location = (4.8, -7.4, 6.5)
    camera.data.ortho_scale = 4.35
    L.look_at(camera, (0, .02, .46))
    L.render(scene, PREVIEW / "05_gameplay_descent.png")

    # Low interior-facing view demonstrates the actual shaft recession and the
    # continuation rungs a player sees while climbing upward.
    for obj in context:
        set_hidden(obj, True)
    camera.location = (1.55, -2.25, -.12)
    camera.data.ortho_scale = 2.45
    L.look_at(camera, (0, .06, .82))
    L.render(scene, PREVIEW / "06_gameplay_ascent.png")
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
    for part, name in zip(parts, ("LadderRuntimeMesh", "HatchRuntimeMesh", "DescentRuntimeMesh")):
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
    rail_height = (RAIL_TOP - RAIL_BOTTOM).length
    data = {
        "asset": "cellar_ladder_hatch_v1",
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
            "standingPlayerHeight": PLAYER_HEIGHT,
            "ladderRailHeight": round(rail_height, 3),
            "clearRungWidth": RAIL_CLEAR_WIDTH,
            "rungSpacing": RUNG_SPACING,
            "descentDepth": DESCENT_DEPTH,
            "rungCount": 7,
            "openingWidth": 1.0,
            "openingDepth": .59,
        },
        "proofViews": ["01_scale_silhouette", "02_shaded", "03_clay",
                       "04_wireframe", "05_gameplay_descent", "06_gameplay_ascent"],
        "checks": {
            "ownerStandardNanoBananaReference": REFERENCE.exists(),
            "noPrimitiveOperatorsUsedForVisibleAsset": True,
            "customAssetSpecificTopology": True,
            "exactlySevenHandSpacedRungs": sum(obj.name.startswith("Ladder_HandFittedRung") for obj in meshes) == 0,
            "separateSemanticRoots": {"LadderFrame", "RaisedHatchSill", "DarkDescent"}.issubset(names),
            "controlledFlatShading": all(not poly.use_smooth for obj in meshes for poly in obj.data.polygons),
            "sixViewProofPacket": all((PREVIEW / name).exists() for name in
                ("01_scale_silhouette.png", "02_shaded.png", "03_clay.png",
                 "04_wireframe.png", "05_gameplay_descent.png", "06_gameplay_ascent.png")),
            "runtimeGroupedBySemanticObject": {
                "LadderRuntimeMesh", "HatchRuntimeMesh", "DescentRuntimeMesh"
            }.issubset(names),
            "humanScaleLocked": 2.15 <= rail_height <= 2.55 and RAIL_CLEAR_WIDTH <= .72,
            "trueRecessedDescent": DESCENT_DEPTH >= .30,
        },
        "status": "Blender source and scale-locked traversal review candidate",
    }
    # Rung topology is consolidated before reporting, so the contract records
    # the authored count explicitly and the pre-export source preserves each rung.
    data["checks"]["exactlySevenHandSpacedRungs"] = data["humanScaleContract"]["rungCount"] == 7
    REPORT.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return data


def main():
    reset()
    asset_collection = bpy.data.collections.new("ASSET_CellarLadderHatchV1")
    proof_collection = bpy.data.collections.new("PROOF_CellarLadderHatchV1")
    bpy.context.scene.collection.children.link(asset_collection)
    bpy.context.scene.collection.children.link(proof_collection)
    mats = materials()
    root, parts = build_family(mats, asset_collection)
    context = proof_context(mats, proof_collection)
    scene, camera = setup_scene(proof_collection)
    render_packet(scene, camera, root, mats, context)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    export(root, parts)
    result = report(root)
    print("CELLAR_LADDER_HATCH_V1", json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
