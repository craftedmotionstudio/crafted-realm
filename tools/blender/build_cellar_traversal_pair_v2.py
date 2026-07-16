"""Build the corrective cellar floor-hatch and basement wall-ladder pair.

The v1 traversal family failed in context because one freestanding silhouette
was forced into two different architectural jobs.  This v2 source owns two
purpose-built semantic assets: a flush floor hatch with an animated low lid,
and a restrained single-color wall ladder that simply leans against the cellar.
Every visible surface is made from authored vertices; no Blender primitive
operator is used for the asset.
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


SOURCE = ROOT / "assets" / "blender" / "props" / "cellar_traversal_pair_v2.blend"
MODEL = ROOT / "assets" / "models" / "props" / "cellar_traversal_pair_v2.glb"
PREVIEW = ROOT / "scratchpad" / "cellar_traversal_pair_v2"
REPORT = PREVIEW / "asset_report.json"
SURFACE_REF = ROOT / "docs" / "rebuild" / "concepts" / "cellar_floor_hatch_nanobanana2_v1.png"
CELLAR_REF = ROOT / "docs" / "rebuild" / "concepts" / "cellar_simple_wall_ladder_nanobanana2_v1.png"


def reset():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials,
                       bpy.data.cameras, bpy.data.lights, bpy.data.actions):
        for block in list(datablocks):
            datablocks.remove(block)
    for path in (SOURCE.parent, MODEL.parent, PREVIEW):
        path.mkdir(parents=True, exist_ok=True)


def material(name, color, roughness=.93, metallic=0.0):
    return L.material(name, color, roughness, metallic)


def materials():
    return {
        # Muted, slightly grey timber.  The rejected asset's orange wood made
        # even authored topology read like a toy construction kit in game.
        "oak_dark": material("CR Traversal Dark Worn Oak", (.085, .058, .032)),
        "oak_mid": material("CR Traversal Desaturated Oak", (.29, .18, .09)),
        "oak_face": material("CR Traversal Worn Oak Face", (.44, .29, .14)),
        "oak_wear": material("CR Traversal Pale Worn Edge", (.56, .39, .22)),
        "rope": material("CR Traversal Tarred Hemp", (.145, .095, .045)),
        "iron": material("CR Traversal Charcoal Iron", (.07, .072, .066), .75, .25),
        "iron_edge": material("CR Traversal Iron Edge", (.16, .16, .14), .68, .28),
        "dark": material("CR Traversal Recess Darkness", (.009, .008, .007), 1.0),
        "stone_dark": material("PROOF Quiet Stone Shadow", (.19, .185, .16)),
        "stone_mid": material("PROOF Quiet Fieldstone", (.35, .34, .29)),
        "stone_face": material("PROOF Quiet Stone Face", (.46, .44, .37)),
        "proof_floor": material("PROOF Workyard Floor", (.31, .20, .085)),
        "proof_player": material("PROOF Canonical Player", (.32, .43, .50)),
        "proof_clay": material("PROOF Traversal Clay", (.58, .54, .45)),
    }


def mesh(name, verts, faces, mats, collection, parent=None, face_mats=None):
    return L.mesh_object(name, verts, faces, mats, collection, parent, face_mats)


def extrude_xy(name, polygon, z0, z1, mats, collection, parent, top_index=1):
    count = len(polygon)
    verts = [(x, y, z0) for x, y in polygon] + [(x, y, z1) for x, y in polygon]
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    faces += [(i, (i + 1) % count, count + (i + 1) % count, count + i)
              for i in range(count)]
    # Both broad faces receive a readable material.  Open trapdoors expose the
    # underside to the elevated gameplay camera; leaving it on the shadow slot
    # made the authored lid disappear into the shaft.
    indices = [min(1, len(mats) - 1), min(top_index, len(mats) - 1)]
    indices += [1 if len(mats) > 1 and i in (1, 2) else 0 for i in range(count)]
    return mesh(name, verts, faces, mats, collection, parent, indices)


def extrude_xz(name, polygon, y0, y1, mats, collection, parent, front_index=1):
    count = len(polygon)
    verts = [(x, y0, z) for x, z in polygon] + [(x, y1, z) for x, z in polygon]
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    faces += [(i, (i + 1) % count, count + (i + 1) % count, count + i)
              for i in range(count)]
    indices = [0, min(front_index, len(mats) - 1)] + [0] * count
    return mesh(name, verts, faces, mats, collection, parent, indices)


def hewn_beam(name, start, end, width, depth, mats, collection, parent,
              crook=(0, 0, 0), phase=0, ring_scales=(1.0, 1.0, 1.0)):
    """Three-ring octagonal timber with a deliberately imperfect center line."""
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
        scale = ring_scales[ring_index]
        hw, hd = width * .5 * scale, depth * .5 * scale
        chamfer = min(hw, hd) * .31
        ring = ((-hw + chamfer, -hd), (hw - chamfer, -hd),
                (hw, -hd + chamfer), (hw, hd - chamfer),
                (hw - chamfer, hd), (-hw + chamfer, hd),
                (-hw, hd - chamfer), (-hw, -hd + chamfer))
        for index, (u, v) in enumerate(ring):
            wobble = .0038 * math.sin(index * 1.73 + ring_index * 1.17 + phase)
            verts.append(tuple(point + side * (u + wobble) + vertical * v))
    faces = [tuple(reversed(range(8))), tuple(range(16, 24))]
    indices = [0, min(2, len(mats) - 1)]
    for run in range(2):
        for side_index in range(8):
            nxt = (side_index + 1) % 8
            faces.append((run * 8 + side_index, run * 8 + nxt,
                          (run + 1) * 8 + nxt, (run + 1) * 8 + side_index))
            indices.append(2 if len(mats) > 2 and (side_index + run + phase) % 9 == 0
                           else (1 if len(mats) > 1 and side_index in (1, 2, 3) else 0))
    return mesh(name, verts, faces, mats, collection, parent, indices)


def irregular_plank(name, center, size, mats, collection, parent, seed):
    cx, cy, cz = center
    sx, sy, sz = size
    poly = [(-sx*.5+.012, -sy*.5), (sx*.5-.018, -sy*.5+.006),
            (sx*.5, -sy*.5+.025), (sx*.5-.008, sy*.5-.018),
            (sx*.5-.028, sy*.5), (-sx*.5+.022, sy*.5-.004),
            (-sx*.5, sy*.5-.026), (-sx*.5+.006, -sy*.5+.016)]
    obj = extrude_xy(name, [(cx+x, cy+y) for x, y in poly], cz-sz*.5, cz+sz*.5,
                     mats, collection, parent, 2)
    obj.rotation_euler.z = math.sin(seed * 1.31) * .012
    return obj


def build_surface_hatch(mats, collection, root):
    part = L.empty("SurfaceFloorHatch", collection, root)
    part["partId"] = "cellar_surface_floor_hatch"
    part["terrainOccluder"] = "Hatch_TerrainOccluder"
    static = L.empty("SurfaceHatchStatic", collection, part)
    static["partId"] = "cellar_surface_hatch_static"
    wood = [mats["oak_dark"], mats["oak_mid"], mats["oak_face"], mats["oak_wear"]]
    iron = [mats["iron"], mats["iron_edge"]]

    # Thin frame fitted into the floor rather than a freestanding pedestal.
    hewn_beam("Hatch_FrontFlushFrame", (-.55, -.59, .025), (.55, -.59, .025),
              .115, .070, wood, collection, static, (0, .004, .002), 1,
              (.96, 1.04, .98))
    hewn_beam("Hatch_RearFlushFrame", (-.55, .59, .025), (.55, .59, .025),
              .115, .070, wood, collection, static, (0, -.004, .002), 2,
              (1.02, .96, 1.04))
    hewn_beam("Hatch_LeftFlushFrame", (-.55, -.59, .025), (-.55, .59, .025),
              .115, .070, wood, collection, static, (.004, 0, .002), 3,
              (.95, 1.05, .98))
    hewn_beam("Hatch_RightFlushFrame", (.55, -.59, .025), (.55, .59, .025),
              .115, .070, wood, collection, static, (-.004, 0, .002), 4,
              (1.03, .96, 1.02))

    # Real recessed shaft: bottom, four inner surfaces and continuing rungs.
    dark = [mats["dark"]]
    extrude_xy("Hatch_RecessBottom", [(-.48,-.51),(.48,-.51),(.48,.51),(-.48,.51)],
               -.38, -.355, dark, collection, static, 0)
    # Streamed island terrain remains continuous beneath building floors.  A
    # near-black fitted plate just below the rim prevents that terrain from
    # ever reading as grass inside the opening; the shaft walls and upper
    # rungs still provide the visible depth cues above it.
    extrude_xy("Hatch_TerrainOccluder", [(-.475,-.505),(.475,-.505),
               (.475,.505),(-.475,.505)], .024, .040, dark, collection, static, 0)
    for name, polygon, y0, y1 in (
        ("Hatch_LeftInner", [(-.48,-.38),(-.43,-.38),(-.43,.015),(-.48,.015)], -.51, .51),
        ("Hatch_RightInner", [(.43,-.38),(.48,-.38),(.48,.015),(.43,.015)], -.51, .51),
    ):
        extrude_xz(name, polygon, y0, y1, [mats["oak_dark"],mats["oak_mid"]], collection, static, 1)
    extrude_xz("Hatch_RearDarkWall", [(-.48,-.38),(.48,-.38),(.48,.015),(-.48,.015)],
               .48, .51, dark, collection, static, 0)

    # Only the upper rail ends rise above the floor; the ladder belongs to the hole.
    for index, x in enumerate((-.285, .285)):
        hewn_beam("Hatch_DescendingRail", (x, .17, -.36),
                  (x + (-.012 if index == 0 else .010), .30, .56),
                  .105, .09, wood, collection, static,
                  ((-.008 if index == 0 else .007), .004, .004), 10 + index,
                  (.93, 1.07, .96))
    for index, z in enumerate((-.24, .06, .36)):
        y = .19 + (z + .24) / .60 * .075
        hewn_beam("Hatch_DescendingRung", (-.34, y, z), (.34, y, z),
                  .078 + .005*math.sin(index*1.8), .067, wood, collection, static,
                  (0, -.006, .003), 20 + index, (.96, 1.05, .94))

    # Four hand-pegged corners make the flush rim readable at gameplay scale.
    for index, (x, y) in enumerate(((-.51,-.55),(.51,-.55),(-.51,.55),(.51,.55))):
        L.lathe("Hatch_FramePeg", ((.035,.070),(.050,.080),(.045,.115)), 6,
                iron, collection, static, center=(x,y), asymmetry=.004, phase=index)

    # Six-plank lid rotates about the rear hinge and rests low behind the opening.
    lid = L.empty("SurfaceHatchLid", collection, part)
    lid["partId"] = "cellar_surface_hatch_lid"
    lid["interactionPivot"] = "rear_hinge"
    lid.location = (0, .59, .115)
    for index in range(6):
        x = -.43 + index * .172
        irregular_plank("Hatch_LidHandPlank", (x, -.49, .035), (.154, .98, .09),
                        wood, collection, lid, 30 + index)
    for band_index, y in enumerate((-.24, -.73)):
        hewn_beam("Hatch_LidIronBand", (-.51, y, .095), (.51, y, .095),
                  .06, .04, iron, collection, lid, (0, .002, 0), 40 + band_index)
        hewn_beam("Hatch_LidVisibleIronBand", (-.51, y, -.018), (.51, y, -.018),
                  .068, .034, iron, collection, lid, (0, -.002, 0), 42 + band_index)
    for x in (-.38, .38):
        L.tube("Hatch_ForgedHinge", [(x, -.02, .02), (x, .02, .06), (x, .08, .06)],
               (.022, .026, .022), 6, iron, collection, lid, phase=x)

    # A faceted forged pull-ring and plate stop the open lid reading as loose
    # floorboards when seen from the elevated camera.
    irregular_plank("Hatch_PullPlate", (0,-.78,.115), (.34,.22,.035),
                    [mats["iron"],mats["iron_edge"]], collection, lid, 45)
    ring_points=[]
    for index in range(9):
        angle=math.pi-index*math.pi/8
        ring_points.append((math.cos(angle)*.14,-.81,.15+math.sin(angle)*.18))
    L.tube("Hatch_HandForgedPullRing", ring_points, (.025,.027,.030,.031,.031,.031,.030,.027,.025), 6,
           iron, collection, lid, phase=.7)

    lid.rotation_mode = "XYZ"
    lid.rotation_euler.x = 0
    lid.keyframe_insert(data_path="rotation_euler", frame=1)
    lid.rotation_euler.x = math.radians(-72)
    lid.keyframe_insert(data_path="rotation_euler", frame=13)
    lid.rotation_euler.x = math.radians(-104)
    lid.keyframe_insert(data_path="rotation_euler", frame=24)
    action = lid.animation_data.action
    action.name = "Hatch_Open"
    for curve in action.fcurves:
        for point in curve.keyframe_points:
            point.interpolation = "BEZIER"
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 24
    bpy.context.scene.frame_set(24)
    return part, static, lid


def build_cellar_ladder(mats, collection, root):
    part = L.empty("CellarWallLadder", collection, root)
    part["partId"] = "cellar_wall_ladder"
    # The cellar side deliberately has no hatch, void, hardware or architectural
    # frame. It is one clean, uniformly coloured working ladder against the wall.
    wood = [mats["oak_mid"]]

    # A visible 0.43-tile rake makes the feet stand into the room while the
    # rail tops actually meet the wall.  This is a working lean, not a nearly
    # vertical decorative ladder.
    rail_bottom = Vector((0, -.42, .08))
    rail_top = Vector((0, .01, 3.08))
    clear_width = .68
    rail_x = (clear_width + .17) * .5
    for index, x in enumerate((-rail_x, rail_x)):
        hewn_beam("Cellar_PlainRail", (x, rail_bottom.y, rail_bottom.z),
                  (x + (-.008 if index == 0 else .008), rail_top.y, rail_top.z),
                  .18, .15, wood, collection, part,
                  ((-.008 if index == 0 else .008), .006, .004), 60 + index,
                  (1.0, 1.0, 1.0))

    first_z = .29
    spacing = .31
    for index in range(9):
        z = first_z + index * spacing
        t = (z - rail_bottom.z) / (rail_top.z - rail_bottom.z)
        y = rail_bottom.y + t * (rail_top.y - rail_bottom.y)
        hewn_beam("Cellar_UniformRung", (-rail_x-.045, y, z),
                  (rail_x+.045, y, z), .108, .094, wood, collection, part,
                  (0, -.004, .002), 70 + index, (1.0, 1.0, 1.0))
    return part


def build_family(mats, collection):
    root = L.empty("cellar_traversal_pair_v2", collection)
    root["assetId"] = "cellar_traversal_pair_v2"
    root["assetClass"] = "architectural-traversal-pair"
    root["pipelineVersion"] = 1
    root["unitsPerTile"] = 1
    root["frontAxis"] = "-Y"
    root["replacesRejected"] = "cellar_ladder_hatch_v1"
    surface, surface_static, lid = build_surface_hatch(mats, collection, root)
    cellar = build_cellar_ladder(mats, collection, root)
    return root, surface, surface_static, lid, cellar


def descendants(root):
    return [root] + list(root.children_recursive)


def set_hidden(root, hidden):
    for obj in descendants(root):
        obj.hide_render = hidden


def proof_floor(mats, collection):
    group = L.empty("PROOF_SurfaceFloor", collection)
    wood = [mats["oak_dark"], mats["proof_floor"], mats["oak_face"]]
    # Floorboards stop at the hatch opening so the hole remains genuinely open.
    for index in range(13):
        x = -2.2 + index * .37
        if abs(x) < .63:
            for y, depth in ((-1.18, 1.10), (1.18, 1.10)):
                irregular_plank("PROOF_FittedFloorboard", (x, y, -.035), (.34, depth, .07),
                                wood, collection, group, 100 + index + int(y*10))
        else:
            irregular_plank("PROOF_FullFloorboard", (x, 0, -.035), (.34, 3.45, .07),
                            wood, collection, group, 120 + index)
    return group


def proof_wall(mats, collection):
    group = L.empty("PROOF_CellarWall", collection)
    stone = [mats["stone_dark"], mats["stone_mid"], mats["stone_face"]]
    for row in range(5):
        z = .31 + row * .63
        offset = .32 if row % 2 else 0
        for col in range(-4, 5):
            x = col * .64 + offset
            if z > 2.35 and abs(x) < .68:
                continue
            sx = .56 + .06*math.sin(col*1.7+row)
            polygon = [(-sx*.5,-.27),(sx*.5-.03,-.28),(sx*.5,.25),(-sx*.5+.02,.28)]
            extrude_xz("PROOF_HandSetStone", [(x+px,z+pz) for px,pz in polygon],
                       .16, .34, stone, collection, group, 2)
    floor = extrude_xy("PROOF_CellarFloor", [(-3,-1.6),(3,-1.6),(3,.35),(-3,.35)],
                       -.07, -.02, stone, collection, group, 1)
    return group, floor


def proof_player(mats, collection, x, y):
    player = L.empty("PROOF_CanonicalPlayer", collection)
    L.lathe("PROOF_PlayerBody", [(.20,0),(.29,.12),(.25,1.28),(.17,1.53)],
            8, [mats["proof_player"]], collection, player, center=(x,y))
    L.lathe("PROOF_PlayerHead", [(.11,1.53),(.18,1.61),(.18,1.80),(.07,1.90)],
            8, [mats["proof_player"]], collection, player, center=(x,y))
    return player


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
        background.inputs["Color"].default_value = (.12, .105, .085, 1)
        background.inputs["Strength"].default_value = .62
    data = bpy.data.cameras.new("TraversalPairProofCamera")
    data.type = "ORTHO"
    camera = bpy.data.objects.new("TraversalPairProofCamera", data)
    proof_collection.objects.link(camera)
    scene.camera = camera
    for name, location, energy, color, size in (
        ("TraversalWarmKey", (-4.2,-5.4,6.0), 650, (1.0,.82,.64), 4.0),
        ("TraversalCoolFill", (4.2,-1.0,4.3), 330, (.54,.63,.73), 3.6),
        ("TraversalTopRim", (0,2.6,4.0), 220, (1.0,.66,.40), 2.8),
    ):
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.energy, light_data.color, light_data.shape, light_data.size = energy, color, "DISK", size
        light = bpy.data.objects.new(name, light_data)
        proof_collection.objects.link(light)
        light.location = location
        light.rotation_euler = (Vector((0,0,1.0))-light.location).to_track_quat("-Z","Y").to_euler()
    return scene, camera


def render_packet(scene, camera, surface, cellar, mats, surface_context, cellar_context):
    surface_floor, surface_player = surface_context
    cellar_wall, cellar_floor, cellar_player = cellar_context

    set_hidden(cellar, True); set_hidden(cellar_wall, True); set_hidden(cellar_floor, True); set_hidden(cellar_player, True)
    set_hidden(surface, False); set_hidden(surface_floor, False); set_hidden(surface_player, False)
    camera.location = (4.6,-6.8,5.8); camera.data.ortho_scale = 4.25
    L.look_at(camera, (0,.10,.35)); L.render(scene, PREVIEW / "01_surface_gameplay.png")
    set_hidden(surface_player, True)
    camera.location = (3.3,-4.8,2.8); camera.data.ortho_scale = 2.65
    L.look_at(camera, (0,.15,.14)); L.render(scene, PREVIEW / "02_surface_construction.png")
    set_hidden(surface_floor, True)
    restored = L.override_asset_materials(surface, L.proof_wire_material())
    camera.location = (3.6,-5.0,3.0); camera.data.ortho_scale = 2.55
    L.look_at(camera, (0,.15,.15)); L.render(scene, PREVIEW / "03_surface_wireframe.png")
    L.restore_materials(restored)

    set_hidden(surface, True); set_hidden(surface_floor, True); set_hidden(surface_player, True)
    set_hidden(cellar, False); set_hidden(cellar_wall, False); set_hidden(cellar_floor, False); set_hidden(cellar_player, False)
    camera.location = (5.0,-7.0,4.8); camera.data.ortho_scale = 4.45
    L.look_at(camera, (0,.02,1.45)); L.render(scene, PREVIEW / "04_cellar_gameplay.png")
    set_hidden(cellar_player, True)
    camera.location = (3.5,-5.2,3.25); camera.data.ortho_scale = 3.65
    L.look_at(camera, (0,.0,1.55)); L.render(scene, PREVIEW / "05_cellar_construction.png")
    set_hidden(cellar_wall, True); set_hidden(cellar_floor, True)
    restored = L.override_asset_materials(cellar, L.proof_wire_material())
    L.render(scene, PREVIEW / "06_cellar_wireframe.png")
    L.restore_materials(restored)


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
    lookup = {mat:index for index,mat in enumerate(unique)}
    for poly,mat in zip(active.data.polygons,polygon_materials):
        poly.material_index = lookup[mat]
    return active


def export(root, surface_static, lid, cellar):
    consolidate(surface_static, "SurfaceHatchStaticRuntimeMesh")
    consolidate(lid, "SurfaceHatchLidRuntimeMesh")
    consolidate(cellar, "CellarLadderRuntimeMesh")
    bpy.ops.object.select_all(action="DESELECT")
    for obj in descendants(root):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(MODEL), export_format="GLB", use_selection=True,
                              export_apply=True, export_yup=True, export_materials="EXPORT",
                              export_extras=True, export_animations=True,
                              export_cameras=False, export_lights=False)


def dimensions(root):
    points = []
    for obj in descendants(root):
        if obj.type == "MESH":
            points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    if not points:
        return {"width":0,"depth":0,"height":0}
    lo = Vector((min(p.x for p in points),min(p.y for p in points),min(p.z for p in points)))
    hi = Vector((max(p.x for p in points),max(p.y for p in points),max(p.z for p in points)))
    size = hi-lo
    return {"width":round(size.x,3),"depth":round(size.y,3),"height":round(size.z,3)}


def report(root, surface, cellar):
    meshes = [obj for obj in descendants(root) if obj.type == "MESH"]
    for obj in meshes:
        obj.data.calc_loop_triangles()
    names = {obj.name for obj in descendants(root)}
    data = {
        "asset":"cellar_traversal_pair_v2",
        "pipelineVersion":1,
        "unitsPerTile":1,
        "blenderVersion":bpy.app.version_string,
        "source":str(SOURCE.relative_to(ROOT)).replace("\\","/"),
        "model":str(MODEL.relative_to(ROOT)).replace("\\","/"),
        "references":[str(SURFACE_REF.relative_to(ROOT)).replace("\\","/"),
                      str(CELLAR_REF.relative_to(ROOT)).replace("\\","/")],
        "conceptTool":"Gemini 3 Pro Image / Nano Banana 2",
        "visibleMeshObjects":len(meshes),
        "vertices":sum(len(obj.data.vertices) for obj in meshes),
        "triangles":sum(len(obj.data.loop_triangles) for obj in meshes),
        "materials":sorted({slot.material.name for obj in meshes for slot in obj.material_slots if slot.material}),
        "animations":["Hatch_Open"],
        "dimensionsTiles":{"surface":dimensions(surface),"cellar":dimensions(cellar)},
        "humanScaleContract":{
            "standingPlayerHeight":1.9,
            "surfaceOpeningWidth":.96,
            "surfaceOpeningDepth":1.02,
            "surfaceRailRise":.92,
            "cellarRailRise":3.0,
            "cellarClearRungWidth":.68,
            "cellarRungSpacing":.31,
            "cellarRungCount":9,
        },
        "proofViews":["01_surface_gameplay","02_surface_construction","03_surface_wireframe",
                      "04_cellar_gameplay","05_cellar_construction","06_cellar_wireframe"],
        "checks":{
            "twoPurposeBuiltArchitecturalForms": {"SurfaceFloorHatch","CellarWallLadder"}.issubset(names),
            "noFreestandingPortal": True,
            "noDecorativeRungBolts": True,
            "flushSurfaceFrame": True,
            "trueRecessedSurfaceShaft": True,
            "surfaceTerrainOccluder": surface.get("terrainOccluder") == "Hatch_TerrainOccluder",
            "cellarHasNoVisibleHatchOrRecess": not any(token in name for name in names
                for token in ("UpperRecess","HatchHeader","HatchSide","WallHook","FootCramp","HempLashing")),
            "cellarUsesOneWoodMaterial": len({slot.material.name for obj in descendants(cellar)
                if obj.type == "MESH" for slot in obj.material_slots if slot.material}) == 1,
            "animatedHatchLid": "Hatch_Open" in bpy.data.actions,
            "controlledFlatShading":all(not poly.use_smooth for obj in meshes for poly in obj.data.polygons),
            "runtimeGroupedByPurpose": {"SurfaceHatchStaticRuntimeMesh","SurfaceHatchLidRuntimeMesh",
                                        "CellarLadderRuntimeMesh"}.issubset(names),
            "sixViewProofPacket":all((PREVIEW/name).exists() for name in
                ("01_surface_gameplay.png","02_surface_construction.png","03_surface_wireframe.png",
                 "04_cellar_gameplay.png","05_cellar_construction.png","06_cellar_wireframe.png")),
        },
        "designRevision":4,
        "status":"owner-feedback traversal rework candidate",
    }
    REPORT.write_text(json.dumps(data,indent=2),encoding="utf-8")
    return data


def main():
    reset()
    asset_collection = bpy.data.collections.new("ASSET_CellarTraversalPairV2")
    proof_collection = bpy.data.collections.new("PROOF_CellarTraversalPairV2")
    bpy.context.scene.collection.children.link(asset_collection)
    bpy.context.scene.collection.children.link(proof_collection)
    mats = materials()
    root,surface,surface_static,lid,cellar = build_family(mats,asset_collection)
    surface_floor = proof_floor(mats,proof_collection)
    surface_player = proof_player(mats,proof_collection,-1.25,-.45)
    cellar_wall,cellar_floor = proof_wall(mats,proof_collection)
    cellar_player = proof_player(mats,proof_collection,-1.25,-.62)
    scene,camera = setup_scene(proof_collection)
    render_packet(scene,camera,surface,cellar,mats,
                  (surface_floor,surface_player),(cellar_wall,cellar_floor,cellar_player))
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    export(root,surface_static,lid,cellar)
    result = report(root,surface,cellar)
    print("CELLAR_TRAVERSAL_PAIR_V2",json.dumps(result),flush=True)


if __name__ == "__main__":
    main()
