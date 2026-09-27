"""Proof renders of a candidate .blend from plan-coordinate views (owner review 4 tooling).
Run: blender -b <file.blend> --python tools/blender/render_proof_views.py -- <out dir> <views.json>
views.json: [{"name": "...", "eye": [x, y, z], "look": [x, y, z], "hide": ["prefix", ...], "show": ["prefix", ...]}]
(plan coordinates: x east, y up, z south; Blender (x, -z, y))."""
import bpy, sys, math, json
from pathlib import Path
from mathutils import Vector
args = sys.argv[sys.argv.index('--') + 1:]
out = Path(args[0]); out.mkdir(parents=True, exist_ok=True); views = json.loads(Path(args[1]).read_text())
sc = bpy.context.scene
for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
    try: sc.render.engine = eng; break
    except TypeError: pass
sc.render.resolution_x, sc.render.resolution_y = 960, 640
w = sc.world or bpy.data.worlds.new('proof'); sc.world = w; w.use_nodes = True
bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs[0].default_value = (.55, .6, .65, 1); bg.inputs[1].default_value = 1.2
sun = bpy.data.objects.new('ProofSun', bpy.data.lights.new('ProofSun', 'SUN')); sun.data.energy = 3.0; sun.rotation_euler = (math.radians(50), 0, math.radians(30)); sc.collection.objects.link(sun)
cam = bpy.data.objects.new('ProofCam', bpy.data.cameras.new('ProofCam')); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 35
def P(p): return Vector((p[0], -p[2], p[1]))
for v in views:
    changed = []
    for o in sc.objects:
        if o.type != 'MESH': continue
        want = (not v.get('show') or any(o.name.startswith(s) for s in v['show'])) and not any(o.name.startswith(h) for h in v.get('hide', []))
        if o.hide_render == want: o.hide_render = not want; changed.append(o)
    cam.location = P(v['eye']); d = P(v['look']) - cam.location; cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = str(out / (v['name'] + '.png')); bpy.ops.render.render(write_still=True)
    for o in changed: o.hide_render = not o.hide_render
print('[PROOF_VIEWS] wrote', len(views), 'to', out)
