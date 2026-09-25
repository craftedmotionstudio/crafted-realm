"""Chat-box portraits for the Tutor's Holm tutors (finish goal M6.1): imports each Blender tutor GLB
(assets/models/holm_tutor_<id>.glb, built by build_holm_tutors_v1.py), poses it at the first frame of `idle`, frames the
head and shoulders from a 3/4 front camera and renders a 96x96 transparent portrait to assets/icons/tutors/<id>.png.
Raw view transform so the colours match the game (which draws authored sRGB without colour management).
Run: blender -b --python tools/blender/render_holm_tutor_portraits.py
"""
import bpy, math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets' / 'icons' / 'tutors'
OUT.mkdir(parents=True, exist_ok=True)
IDS = ['bram', 'wenna', 'hettie', 'ansel', 'durgin', 'corrick', 'maud', 'ilse', 'aldous', 'tobin']


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    try:
        s.render.engine = 'BLENDER_EEVEE_NEXT'
    except TypeError:
        s.render.engine = 'BLENDER_EEVEE'
    s.render.resolution_x = s.render.resolution_y = 96
    s.render.film_transparent = True
    s.view_settings.view_transform = 'Standard' if 'Raw' not in [i.identifier for i in s.view_settings.bl_rna.properties['view_transform'].enum_items] else 'Raw'
    world = bpy.data.worlds.new('w'); s.world = world; world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs[1].default_value = 0.35
    return s


for tid in IDS:
    s = reset()
    bpy.ops.import_scene.gltf(filepath=str(ROOT / 'assets' / 'models' / f'holm_tutor_{tid}.glb'))
    arm = next((o for o in s.objects if o.type == 'ARMATURE'), None)
    if arm and arm.animation_data and bpy.data.actions.get('idle'):
        arm.animation_data.action = bpy.data.actions['idle']
    s.frame_set(1)
    head = None
    if arm:
        b = next((b for b in arm.pose.bones if b.name.lower().endswith('head')), None)
        if b:
            head = arm.matrix_world @ b.head
    if head is None:
        zs = [ (o.matrix_world @ Vector(c)).z for o in s.objects if o.type == 'MESH' for c in o.bound_box ]
        head = Vector((0, 0, max(zs) - 0.25))
    target = head + Vector((0, 0, 0.12))
    cam_data = bpy.data.cameras.new('cam'); cam_data.lens = 85
    cam = bpy.data.objects.new('cam', cam_data); s.collection.objects.link(cam); s.camera = cam
    # glTF +Z forward = Blender -Y: stand in front (-Y), a little to the side and above
    cam.location = target + Vector((0.55, -1.55, 0.18))
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    for loc, energy in (((1.5, -2.5, 3.0), 380), ((-2.0, -1.0, 1.5), 90)):
        l = bpy.data.lights.new('l', 'POINT'); l.energy = energy
        lo = bpy.data.objects.new('l', l); lo.location = loc; s.collection.objects.link(lo)
    s.render.filepath = str(OUT / f'{tid}.png')
    bpy.ops.render.render(write_still=True)
    print('[PORTRAIT]', tid, s.render.filepath)
