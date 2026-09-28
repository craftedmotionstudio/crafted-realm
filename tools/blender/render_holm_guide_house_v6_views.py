"""Proof renders of the Guide House v6 candidate (owner review 4): the laid table, the dresser, the south-west corner with
the trapdoor, the cellar below it and a leaded window from outside. House-local plan coordinates (x east, y up, z south),
Blender (x, -z, y). Run: blender -b <v6.blend> --python tools/blender/render_holm_guide_house_v6_views.py -- <out dir>"""
import bpy, sys, math
from pathlib import Path
from mathutils import Vector
out = Path(sys.argv[sys.argv.index('--') + 1]); out.mkdir(parents=True, exist_ok=True)
sc = bpy.context.scene
try: sc.render.engine = 'BLENDER_EEVEE_NEXT'
except TypeError:
    try: sc.render.engine = 'BLENDER_EEVEE'
    except TypeError: pass
sc.render.resolution_x, sc.render.resolution_y = 960, 640
w = bpy.data.worlds.new('proof') if not sc.world else sc.world; sc.world = w; w.use_nodes = True
bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs[0].default_value = (.55, .6, .65, 1); bg.inputs[1].default_value = 1.2
sun = bpy.data.objects.new('ProofSun', bpy.data.lights.new('ProofSun', 'SUN')); sun.data.energy = 3.0; sun.rotation_euler = (math.radians(50), 0, math.radians(30)); sc.collection.objects.link(sun)
def P(x, y, z): return Vector((x, -z, y))
cam = bpy.data.objects.new('ProofCam', bpy.data.cameras.new('ProofCam')); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 35
def shot(name, eye, look, hide=(), show=None):
    hidden = []
    for o in sc.objects:
        if o.type != 'MESH': continue
        want = (show is None or any(o.name.startswith(s) for s in show)) and not any(o.name.startswith(h) for h in hide)
        if o.hide_render == want: o.hide_render = not want; hidden.append(o)
    cam.location = P(*eye); d = P(*look) - cam.location; cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = str(out / (name + '.png')); bpy.ops.render.render(write_still=True)
    for o in hidden: o.hide_render = not o.hide_render
UP = ('Roof', 'Gable', 'UpperShell', 'UpperFloor', 'UpperFurnishing', 'UpperHearth', 'Chart')
shot('v6_table', (-1.2, 2.2, 3.6), (-2.5, .8, 2.0), hide=UP)
shot('v6_dresser', (-1.7, 1.8, -2.6), (-1.7, 1.2, -4.6), hide=UP)
shot('v6_urn_pail', (2.4, 1.6, -2.8), (3.1, .4, -4.5), hide=UP)
shot('v6_corner_hatch', (-3.2, 2.6, 2.2), (-5.3, 0, 4.3), hide=UP)
shot('v6_cellar', (-2.6, .4, 1.4), (-4.6, -2.4, 3.6), show=('Cellar',), hide=('CellarCeiling',))
shot('v6_window_out', (-3.8, 1.6, 7.4), (-3.8, 1.55, 5.0))
shot('v6_window_in', (-3.8, 1.6, 2.6), (-3.8, 1.55, 5.0), hide=UP)
print('[GUIDE_V6_PROOF] wrote', out)
