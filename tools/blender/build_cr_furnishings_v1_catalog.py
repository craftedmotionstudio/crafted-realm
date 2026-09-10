"""Render the Crafted Realm Furnishings v1 family for art-direction review."""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_guide_hall_v3 as B
import cr_furnishings_v1 as F


ROOT = Path(__file__).resolve().parents[2]
PREVIEW = ROOT / "scratchpad" / "cr_furnishings_v1"
SOURCE = ROOT / "assets" / "blender" / "cr_furnishings_v1_catalog.blend"
for path in (PREVIEW, SOURCE.parent):
    path.mkdir(parents=True, exist_ok=True)


def material(name, rgb, roughness=.9, metallic=0, emission=0):
    mat = B.material(name, rgb, roughness)
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        color = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
        strength = bsdf.inputs.get("Emission Strength")
        if color:
            color.default_value = (*rgb, 1)
        if strength:
            strength.default_value = emission
    return mat


def materials():
    return {
        "oak": material("CR Furniture Oak", (.42, .24, .09)),
        "oak_dark": material("CR Furniture Oak Dark", (.20, .09, .035)),
        "oak_light": material("CR Furniture Oak Highlight", (.62, .40, .15)),
        "willow": material("CR Furniture Willow", (.51, .43, .22)),
        "willow_dark": material("CR Furniture Willow Dark", (.25, .22, .095)),
        "willow_light": material("CR Furniture Willow Highlight", (.70, .62, .34)),
        "mahogany": material("CR Furniture Mahogany", (.42, .11, .055)),
        "mahogany_dark": material("CR Furniture Mahogany Dark", (.18, .035, .025)),
        "mahogany_light": material("CR Furniture Mahogany Highlight", (.65, .22, .09)),
        "stone": material("CR Furniture Fieldstone", (.31, .32, .27)),
        "stone_light": material("CR Furniture Fieldstone Light", (.50, .47, .36)),
        "soot": material("CR Furniture Hearth Soot", (.065, .055, .045)),
        "iron": material("CR Furniture Forged Iron", (.08, .085, .08), .55, .45),
        "iron_light": material("CR Furniture Iron Highlight", (.32, .34, .32), .55, .35),
        "brass": material("CR Furniture Brass", (.66, .43, .10), .55, .42),
        "rope": material("CR Furniture Rope", (.61, .49, .27)),
        "sack": material("CR Furniture Sackcloth", (.52, .40, .22)),
        "grain": material("CR Furniture Grain", (.78, .61, .18)),
        "bread": material("CR Furniture Bread", (.70, .43, .16)),
        "ceramic_cream": material("CR Furniture Cream Pottery", (.78, .69, .48)),
        "ceramic_blue": material("CR Furniture Blue Pottery", (.18, .36, .46)),
        "rug_red": material("CR Furniture Rug Red", (.48, .09, .055)),
        "rug_blue": material("CR Furniture Rug Blue", (.08, .23, .38)),
        "rug_green": material("CR Furniture Rug Green", (.16, .34, .18)),
        "rug_gold": material("CR Furniture Rug Gold", (.75, .49, .12)),
        "painting_sky": material("CR Painting Sky", (.21, .39, .49)),
        "flame_red": material("CR Flame Ember", (.75, .10, .025), .55, 0, 2.0),
        "flame_gold": material("CR Flame Gold", (1.0, .37, .025), .50, 0, 2.7),
        "flame_yellow": material("CR Flame Core", (1.0, .82, .13), .45, 0, 3.3),
        "floor": material("CR Catalog Slate", (.16, .18, .15)),
        "bay": material("CR Catalog Bay", (.24, .26, .20)),
        "label": material("CR Catalog Letter", (.87, .70, .31), .72),
    }


def cube(name, loc, dims, mat, collection, parent=None, bevel=.03):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    B.link(obj, collection, parent)
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new("Catalog Edge", "BEVEL")
        modifier.width = bevel
        modifier.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return obj


def label(text, position, size, mat, collection):
    bpy.ops.object.text_add(location=position, rotation=(0, 0, 0))
    obj = bpy.context.object
    obj.name = "Label_" + text.replace(" ", "_")
    obj.data.body = text
    obj.data.align_x = "CENTER"
    obj.data.align_y = "CENTER"
    obj.data.size = size
    obj.data.extrude = .015
    obj.data.bevel_depth = .006
    obj.data.materials.append(mat)
    B.link(obj, collection)
    return obj


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def build_catalog():
    mats = materials()
    collection = bpy.data.collections.new("CraftedRealm_FurnishingsV1")
    bpy.context.scene.collection.children.link(collection)
    root = B.empty("cr_furnishings_v1_catalog", collection)

    cube("CatalogGround", (0, 0, -.20), (25, 18, .35), mats["floor"], collection, root, .08)
    for x in (-8, 0, 8):
        for y in (-4.35, 4.35):
            cube("CatalogBay", (x, y, -.005), (7.35, 7.15, .08), mats["bay"], collection, root, .05)

    F.trestle_table(B, "OakWorkTable", (-8.4, -4.6, .05), 0, "oak", mats,
                    collection, root, contents="tools")
    F.stool(B, "OakStool", (-6.1, -3.5, .05), .22, "oak", mats, collection, root)
    label("OAK WORK TABLE", (-8, -7.25, .05), .38, mats["label"], collection)

    F.round_table(B, "WillowTeaTable", (-.25, -4.65, .05), 0, "willow", mats,
                  collection, root, contents="tea")
    for angle in (0, math.tau / 3, 2 * math.tau / 3):
        F.stool(B, "WillowStool", (-.25 + math.cos(angle) * 1.75,
                                   -4.65 + math.sin(angle) * 1.75, .05), angle,
                "willow", mats, collection, root)
    label("WILLOW TEA SET", (0, -7.25, .05), .38, mats["label"], collection)

    F.crockery_hutch(B, "MahoganyHutch", (8, -5.35, .05), 0, "mahogany", mats,
                     collection, root)
    F.warrior_painting(B, "WarriorPainting", (8.05, -3.55, .15), 0, mats,
                       collection, root)
    label("HUTCH + RELIEF ART", (8, -7.25, .05), .34, mats["label"], collection)

    F.fireplace(B, "TeachingFireplace", (-8, 3.42, .05), 0, mats, collection, root)
    F.patterned_rug(B, "HearthRug", (-8, 5.35, .05), 0, mats, collection, root,
                    width=3.9, depth=1.75)
    label("ANIMATED HEARTH", (-8, 1.55, .05), .38, mats["label"], collection)

    F.storage_shelf(B, "CellarShelf", (0, 3.35, .05), 0, "oak", mats,
                    collection, root, width=3.25)
    F.barrel(B, "CellarBarrelA", (-1.65, 5.25, .05), .08, mats, collection, root)
    F.barrel(B, "CellarBarrelB", (-.65, 5.45, .05), -.09, mats, collection, root, .86)
    F.lidded_chest(B, "ReserveChest", (1.35, 5.15, .05), -.05, "oak", mats,
                   collection, root)
    F.ladder(B, "CellarLadder", (2.35, 3.25, .05), 0, "oak", mats,
             collection, root, height=3.2)
    label("STORM CELLAR KIT", (0, 1.55, .05), .38, mats["label"], collection)

    F.chicken_pen(B, "PreparedChickenPen", (8, 4.30, .05), 0, mats,
                  collection, root, width=5.5, depth=4.2)
    label("PEN + NPC SOCKET", (8, 1.55, .05), .38, mats["label"], collection)
    return root, collection, mats


def render(root, mats):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1800
    scene.render.resolution_y = 1250
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.color = (.035, .045, .035)
    bpy.ops.object.camera_add(location=(20, -24, 25))
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 30
    look_at(camera, (0, 0, 1.0))
    scene.camera = camera
    bpy.ops.object.light_add(type="SUN", location=(5, -8, 20))
    sun = bpy.context.object
    sun.rotation_euler = (math.radians(28), math.radians(-18), math.radians(-34))
    sun.data.energy = 2.4
    sun.data.color = (1.0, .78, .52)
    bpy.ops.object.light_add(type="AREA", location=(-10, -5, 15))
    fill = bpy.context.object
    fill.data.energy = 1300
    fill.data.size = 12
    fill.data.color = (.60, .72, 1.0)
    look_at(fill, (0, 0, 1))
    scene.render.filepath = str(PREVIEW / "cr_furnishings_v1_catalog.png")
    bpy.ops.render.render(write_still=True)

    camera.location = (1, -2, 33)
    camera.data.ortho_scale = 30
    look_at(camera, (0, 0, 0))
    scene.render.filepath = str(PREVIEW / "cr_furnishings_v1_overhead.png")
    bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))


def report(root):
    objects = [root, *root.children_recursive]
    meshes = [obj for obj in objects if obj.type == "MESH"]
    result = {
        "family": "cr_furnishings_v1",
        "authoredFamilies": ["trestle_table", "round_table", "stool", "crockery_hutch",
                             "patterned_rug", "warrior_painting", "fireplace", "ladder",
                             "barrel", "storage_shelf", "lidded_chest", "chicken_pen"],
        "woodSpecies": ["oak", "willow", "mahogany"],
        "tableVariationCapacity": 3 * 3 * 3 * 4,
        "semanticSockets": [obj.name for obj in objects if obj.type == "EMPTY" and
                            obj.name in ("hearth_flame", "chicken_spawn_socket")],
        "meshObjects": len(meshes),
        "triangles": sum(max(0, len(poly.vertices) - 2)
                         for obj in meshes for poly in obj.data.polygons),
    }
    (PREVIEW / "asset_report.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    if result["tableVariationCapacity"] < 100 or not all(
            name in result["semanticSockets"] for name in ("hearth_flame", "chicken_spawn_socket")):
        raise RuntimeError("Furnishing family authoring checks failed")
    return result


def main():
    B.clean_scene()
    root, _, mats = build_catalog()
    result = report(root)
    render(root, mats)
    print("CR_FURNISHINGS_V1_READY", json.dumps(result))


if __name__ == "__main__":
    main()
