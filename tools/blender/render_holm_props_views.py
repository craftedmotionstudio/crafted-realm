"""Blender renders of a building's props for the props pass (2026-09-28: "every object in every building reviewed in
Blender"). Imports the exported GLB (so the render shows what the game loads: vertex colours x old-school textures),
hides the parts a view names (roofs, upper storeys, shell walls: a cutaway like the game's) and renders each view.
Run: blender -b --python tools/blender/render_holm_props_views.py -- <views.json>
views.json: {"glb": "...", "out": "dir", "size": [w, h], "hide": "regex (default for every view)",
             "views": [{"name": "...", "target": [x, y, z] (plan: x east, y up, z south), "yaw": deg (0 = camera to the
                        south looking north, 90 = camera to the east), "pitch": deg, "dist": m, "lens": mm, "hide": regex,
                        "ortho": scale (optional)}]}
Colours: Standard view transform (the game renders without colour management), soft sun + sky fill, matte."""
import bpy, json, math, re, sys
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[2]
SPEC = json.loads(Path(sys.argv[sys.argv.index('--') + 1]).read_text())
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT / SPEC['glb']))
sc = bpy.context.scene
bpy.context.scene.frame_set(0)
try:
    sc.render.engine = 'BLENDER_EEVEE_NEXT'
except TypeError:
    try:
        sc.render.engine = 'BLENDER_EEVEE'
    except TypeError:
        pass
sc.view_settings.view_transform = 'Standard'
sc.render.resolution_x, sc.render.resolution_y = SPEC.get('size', [900, 640])
sc.render.film_transparent = False
w = bpy.data.worlds.new('props world'); sc.world = w; w.use_nodes = True
bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs[0].default_value = (.62, .64, .66, 1); bg.inputs[1].default_value = .9
sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 2.6; sun.angle = math.radians(12)
so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so); so.rotation_euler = (math.radians(38), math.radians(-12), math.radians(35))
# the game's matte, unlit-ish look: roughness 1, no specular
for m in bpy.data.materials:
    if m.use_nodes:
        for n in m.node_tree.nodes:
            if n.type == 'BSDF_PRINCIPLED':
                n.inputs['Roughness'].default_value = 1.0
                for k in ('Specular IOR Level', 'Specular'):
                    if k in n.inputs:
                        n.inputs[k].default_value = 0.0
cam_data = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cam_data); sc.collection.objects.link(cam); sc.camera = cam
out = ROOT / SPEC['out']; out.mkdir(parents=True, exist_ok=True)
meshes = [o for o in sc.objects if o.type == 'MESH']
def owner(o):
    names = []
    q = o
    while q is not None:
        names.append(q.name); q = q.parent
    return ' '.join(names)
for v in SPEC['views']:
    rx = re.compile(v.get('hide', SPEC.get('hide', '^$')))
    for o in meshes:
        o.hide_render = bool(rx.search(owner(o)))
    tx, ty, tz = v['target']
    t = Vector((tx, -tz, ty))
    yaw, pitch, d = math.radians(v.get('yaw', 0)), math.radians(v.get('pitch', 35)), v.get('dist', 6)
    # plan offset (sin yaw, ., cos yaw) -> Blender (x, -z, y)
    px, py, pz = math.sin(yaw) * math.cos(pitch) * d, math.sin(pitch) * d, math.cos(yaw) * math.cos(pitch) * d
    cam.location = t + Vector((px, -pz, py))
    cam.rotation_euler = (t - cam.location).to_track_quat('-Z', 'Y').to_euler()
    if v.get('ortho'):
        cam_data.type = 'ORTHO'; cam_data.ortho_scale = v['ortho']
    else:
        cam_data.type = 'PERSP'; cam_data.lens = v.get('lens', 35)
    cam_data.clip_start = .05; cam_data.clip_end = 400
    sc.render.filepath = str(out / (v['name'] + '.png'))
    bpy.ops.render.render(write_still=True)
    print('[PROPS VIEW]', v['name'], flush=True)
