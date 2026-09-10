"""Render an installed Blender object from the four cardinal directions.

Run with the source .blend already opened by Blender, for example:

  blender --background asset.blend --python tools/blender/render_cardinal_turnaround.py -- \
    --target trail_door --output-dir scratchpad/door_proof --prefix trail_door_open \
    --open-z -1.535 --hide roof --context-root holm_survival_workyard_v2 \
    --keep-root-child static_architecture

The camera names mean "viewed from north/south/east/west" and always look
toward the target.  This is an installed-contact proof, not a beauty render:
the target and the explicitly retained architecture remain visible so clipping,
floating parts, bad pivots, and wall/frame intersections cannot hide.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
CARDINALS = {
    "north": (0.0, 1.0),
    "south": (0.0, -1.0),
    "east": (1.0, 0.0),
    "west": (-1.0, 0.0),
}


def parse_args():
    raw = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--prefix", required=True)
    parser.add_argument("--open-z", type=float)
    parser.add_argument("--hide", action="append", default=[])
    parser.add_argument("--context-root")
    parser.add_argument("--keep-root-child", action="append", default=[])
    parser.add_argument("--proof-ground", action="store_true",
                        help="add a neutral floor at the target contact plane")
    parser.add_argument("--distance", type=float, default=6.2)
    parser.add_argument("--height", type=float, default=3.7)
    parser.add_argument("--ortho-scale", type=float, default=4.4)
    parser.add_argument("--resolution", type=int, default=640)
    return parser.parse_args(raw)


def descendants(obj):
    result = []
    stack = list(obj.children)
    while stack:
        child = stack.pop()
        result.append(child)
        stack.extend(child.children)
    return result


def set_hidden(obj, hidden=True):
    obj.hide_render = hidden
    for child in descendants(obj):
        child.hide_render = hidden


def world_bounds(obj):
    points = []
    for item in [obj, *descendants(obj)]:
        if item.type != "MESH" or item.hide_render:
            continue
        points.extend(item.matrix_world @ Vector(corner) for corner in item.bound_box)
    if not points:
        return Vector(obj.matrix_world.translation), Vector(obj.matrix_world.translation)
    return (Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points))),
            Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points))))


def look_at(camera, target):
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()


def add_lighting(center):
    for obj in list(bpy.data.objects):
        if obj.type == "LIGHT":
            bpy.data.objects.remove(obj, do_unlink=True)
    bpy.ops.object.light_add(type="AREA", location=(center.x - 3.5, center.y - 4.5, center.z + 7.5))
    key = bpy.context.object
    key.name = "CardinalProof_Key_NotExported"
    key.data.energy = 900
    key.data.shape = "DISK"
    key.data.size = 5.5
    look_at(key, center)
    bpy.ops.object.light_add(type="AREA", location=(center.x + 4.0, center.y + 3.0, center.z + 4.5))
    fill = bpy.context.object
    fill.name = "CardinalProof_Fill_NotExported"
    fill.data.energy = 500
    fill.data.size = 4.0
    look_at(fill, center)
    bpy.ops.object.light_add(type="SUN", location=(center.x, center.y, center.z + 8.0))
    sun = bpy.context.object
    sun.name = "CardinalProof_Sun_NotExported"
    sun.rotation_euler = (math.radians(28), math.radians(-18), math.radians(24))
    sun.data.energy = 1.6


def add_proof_ground(center, lower, upper, ortho_scale):
    size = max(ortho_scale * 1.55, upper.x - lower.x + 1.5,
               upper.y - lower.y + 1.5)
    bpy.ops.mesh.primitive_plane_add(size=size,
                                     location=(center.x, center.y, lower.z - .018))
    ground = bpy.context.object
    ground.name = "CardinalProof_Ground_NotExported"
    material = bpy.data.materials.new("CardinalProof Ground")
    material.diffuse_color = (.27, .25, .21, 1.0)
    material.roughness = .92
    ground.data.materials.append(material)


def configure_scene(args, target):
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = args.resolution
    scene.render.resolution_y = args.resolution
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world.color = (.025, .020, .016)

    for name in args.hide:
        obj = bpy.data.objects.get(name)
        if obj is None:
            raise RuntimeError(f"Cardinal proof hide object is missing: {name}")
        set_hidden(obj)

    if args.context_root:
        root = bpy.data.objects.get(args.context_root)
        if root is None:
            raise RuntimeError(f"Cardinal proof context root is missing: {args.context_root}")
        keep = set(args.keep_root_child + [target.name])
        for child in root.children:
            if child.name not in keep:
                set_hidden(child)

    if args.open_z is not None:
        target.rotation_euler.z = args.open_z
        bpy.context.view_layer.update()

    lower, upper = world_bounds(target)
    center = (lower + upper) * .5
    if args.proof_ground:
        add_proof_ground(center, lower, upper, args.ortho_scale)
    add_lighting(center)
    return scene, center, lower, upper


def render(args):
    target = bpy.data.objects.get(args.target)
    if target is None:
        raise RuntimeError(f"Cardinal proof target is missing: {args.target}")
    output_dir = (ROOT / args.output_dir).resolve()
    if ROOT not in output_dir.parents and output_dir != ROOT:
        raise RuntimeError("Cardinal proof output must stay inside the workspace")
    output_dir.mkdir(parents=True, exist_ok=True)

    scene, center, lower, upper = configure_scene(args, target)
    for obj in list(bpy.data.objects):
        if obj.type == "CAMERA":
            bpy.data.objects.remove(obj, do_unlink=True)
    bpy.ops.object.camera_add()
    camera = bpy.context.object
    camera.name = "CardinalProof_Camera_NotExported"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = args.ortho_scale
    camera.data.lens = 50
    camera.data.clip_start = .05
    camera.data.clip_end = 100.0
    scene.camera = camera

    files = {}
    for label, (dx, dy) in CARDINALS.items():
        camera.location = (center.x + dx * args.distance,
                           center.y + dy * args.distance,
                           center.z + args.height)
        look_at(camera, center)
        path = output_dir / f"{args.prefix}_from_{label}.png"
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        files[label] = path.relative_to(ROOT).as_posix()

    manifest = {
        "schemaVersion": 1,
        "target": args.target,
        "pose": {"rotationZ": args.open_z},
        "center": [round(value, 4) for value in center],
        "bounds": {
            "min": [round(value, 4) for value in lower],
            "max": [round(value, 4) for value in upper],
        },
        "views": files,
        "auditOrder": ["north", "south", "east", "west"],
    }
    manifest_path = output_dir / f"{args.prefix}_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("CARDINAL_TURNAROUND_READY", manifest_path)


if __name__ == "__main__":
    render(parse_args())
