"""Render an isolated proof from the exact integrated Workyard Blender source."""
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "scratchpad" / "workyard_shore_gear_v1" / "blender_final.png"
OUT.parent.mkdir(parents=True, exist_ok=True)


def descendants(root):
    result = []
    stack = [root]
    while stack:
        obj = stack.pop()
        result.append(obj)
        stack.extend(obj.children)
    return result


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


gear = bpy.data.objects.get("net_rack")
if gear is None:
    raise RuntimeError("Integrated net_rack semantic root is missing")
keepers = set(descendants(gear))
for obj in bpy.context.scene.objects:
    if obj.type == "MESH":
        obj.hide_render = obj not in keepers

# A neutral fitted-cement proof floor gives the cluster honest ground contact.
bpy.ops.mesh.primitive_cube_add(location=(5.05, -2.65, .17))
ground = bpy.context.object
ground.name = "ShoreGearProofGround"
ground.dimensions = (4.9, 3.7, .08)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
mat = bpy.data.materials.get("CR Workyard Weathered Cement")
if mat:
    ground.data.materials.append(mat)
ground.hide_render = False

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 1200
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.world.color = (.065, .075, .070)

camera = scene.camera
camera.data.type = "ORTHO"
camera.data.ortho_scale = 4.8
camera.location = (9.1, -9.6, 5.9)
look_at(camera, (5.05, -2.63, .82))

for obj in scene.objects:
    if obj.type == "LIGHT":
        obj.hide_render = False
scene.render.filepath = str(OUT)
bpy.ops.render.render(write_still=True)
print("WORKYARD_SHORE_GEAR_PROOF_READY", OUT)
