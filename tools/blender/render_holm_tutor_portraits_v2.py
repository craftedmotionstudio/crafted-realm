"""Chat-box portraits for the ten Tutor's Holm tutors from their v2.9 / v3.0 models (--cand picks the kit set) (the v1 script,
render_holm_tutor_portraits.py, rendered the old blocky v1 tutors into assets/icons/tutors/).

Same size and format as v1: 96x96 RGBA PNG, transparent background, head-and-shoulders 3/4 view from the tutor's left-front
(the v1 camera direction), idle frame 0 (neutral face). The frame is fitted per tutor so the hat / hood / hair top is always
inside it (Magister Ilse's pointed hat makes her head a little smaller than the others).

Lit like the game (src/game2_world.js, three r128, no colour management): HemisphereLight sky #dfe2d8 / ground #8a8a72 at
0.92 + DirectionalLight #fff4e0 at 0.85. Reproduced with a sky/ground gradient world and a sun of 0.85*pi W/m2, Raw view
transform, so a pixel = stored sRGB albedo x game lighting, exactly as the game shades it.

Reads the candidate GLBs and writes candidate portraits -- never assets/:
  blender -b --python tools/blender/render_holm_tutor_portraits_v2.py -- [--cand DIR] [--out DIR] [--review DIR]
    --cand    folder with bram.glb + holm_tutor_<id>_v2.glb (default .studio-workspaces/holm-characters-v29/candidates)
    --out     portraits folder (default <cand>/portraits)
    --review  optional folder for 288 px renders of the same framing (for contact sheets)
"""
import bpy, math, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(k, d):
    if k not in ARGS:
        return d
    q = Path(ARGS[ARGS.index(k) + 1])
    return q if q.is_absolute() else ROOT / q   # relative paths are relative to the repo root
CAND = arg('--cand', ROOT / '.studio-workspaces' / 'holm-characters-v29' / 'candidates')
OUT = arg('--out', CAND / 'portraits')
REVIEW = arg('--review', None)
assert 'assets' not in OUT.resolve().parts, 'portraits are candidates: never write into assets/'
OUT.mkdir(parents=True, exist_ok=True)
if REVIEW:
    REVIEW.mkdir(parents=True, exist_ok=True)
IDS = ['bram', 'wenna', 'hettie', 'ansel', 'durgin', 'corrick', 'maud', 'ilse', 'aldous', 'tobin']
CAM_DIR = Vector((0.55, -1.55, 0.18)).normalized()   # v1 portrait camera direction (tutor's left-front, a little above)
SENSOR, LENS = 36.0, 85.0


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    try:
        s.render.engine = 'BLENDER_EEVEE_NEXT'
    except TypeError:
        s.render.engine = 'BLENDER_EEVEE'
    try:
        s.eevee.taa_render_samples = 32
    except Exception:
        pass
    s.render.film_transparent = True
    s.render.image_settings.file_format = 'PNG'
    s.render.image_settings.color_mode = 'RGBA'
    # Raw = no display curve: the pixel is the stored sRGB albedo x lighting, as three r128 writes it (no colour management).
    # (the enum is dynamic -- RNA lists only 'NONE' -- so assign directly; 'Standard' would add a second sRGB curve = washed out)
    try:
        s.view_settings.view_transform = 'Raw'
    except TypeError:
        s.view_settings.view_transform = 'Standard'
    print('[VIEW]', s.view_settings.view_transform)
    s.view_settings.look = 'None'
    # hemisphere ambient: sky above, ground below (three.js HemisphereLight 0xdfe2d8 / 0x8a8a72, 0.92)
    w = bpy.data.worlds.new('game'); s.world = w; w.use_nodes = True
    nt = w.node_tree
    bg = next(n for n in nt.nodes if n.type == 'BACKGROUND')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = -1.0; mr.inputs['From Max'].default_value = 1.0
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    k = 0.92
    mix.inputs[6].default_value = (0x8a / 255 * k, 0x8a / 255 * k, 0x72 / 255 * k, 1)   # A = ground
    mix.inputs[7].default_value = (0xdf / 255 * k, 0xe2 / 255 * k, 0xd8 / 255 * k, 1)   # B = sky
    nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    nt.links.new(sep.outputs['Z'], mr.inputs['Value'])
    nt.links.new(mr.outputs['Result'], mix.inputs['Factor'])
    nt.links.new(mix.outputs[2], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = 1.0
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 0.85 * math.pi; sun.color = (1.0, 0xf4 / 255, 0xe0 / 255); sun.angle = math.radians(2)
    so = bpy.data.objects.new('sun', sun); s.collection.objects.link(so)
    # the game's sun sits ~38 deg up at a fixed side angle: here it comes from the tutor's right-front, so the face turned to the
    # camera gets partial sun (as most characters do in game) instead of a flat, clipped frontal key
    so.rotation_euler = Vector((-0.62, -0.50, 0.62)).normalized().to_track_quat('Z', 'Y').to_euler()
    return s


def portrait(tid):
    s = reset()
    glb = CAND / ('bram.glb' if tid == 'bram' else f'holm_tutor_{tid}_v2.glb')
    bpy.ops.import_scene.gltf(filepath=str(glb))
    for m in bpy.data.materials:   # matte like the game's MeshStandardMaterial(roughness 1, metalness 0)
        if m.use_nodes:
            bs = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if bs:
                bs.inputs['Roughness'].default_value = 1.0
                bs.inputs['Metallic'].default_value = 0.0
                if 'Specular IOR Level' in bs.inputs:
                    bs.inputs['Specular IOR Level'].default_value = 0.0
    arm = next(o for o in s.objects if o.type == 'ARMATURE')
    ad = arm.animation_data or arm.animation_data_create()
    for tr in list(ad.nla_tracks):
        ad.nla_tracks.remove(tr)
    act = next(a for a in bpy.data.actions if a.name == 'idle' or a.name.startswith('idle'))
    ad.action = act
    if hasattr(ad, 'action_slot') and getattr(act, 'slots', None):
        ad.action_slot = act.slots[0]
    s.frame_set(0)
    bpy.context.view_layer.update()
    head = arm.matrix_world @ arm.pose.bones['mixamorig:Head'].head
    dg = bpy.context.evaluated_depsgraph_get()
    top, pts = head.z, []
    for o in s.objects:
        if o.type != 'MESH':
            continue
        oe = o.evaluated_get(dg)
        me = oe.to_mesh()
        for v in me.vertices:
            p = oe.matrix_world @ v.co
            if p.z > head.z - .02 and math.hypot(p.x - head.x, p.y - head.y) < .30:
                top = max(top, p.z)
                pts.append(p)
        oe.to_mesh_clear()
    # head-and-shoulders: from the upper chest (head joint - .11) to the top of the hat / hood / hair (+4 %)
    bottom = head.z - .11
    span = (top - bottom) * 1.04
    target = Vector((head.x, head.y - .01, bottom + span * 0.5 + .004))
    dist = span / (2 * math.tan(math.atan(SENSOR / 2 / LENS)) * 0.98)
    cd = bpy.data.cameras.new('cam'); cd.lens = LENS; cd.sensor_width = SENSOR; cd.sensor_fit = 'HORIZONTAL'
    cam = bpy.data.objects.new('cam', cd); s.collection.objects.link(cam); s.camera = cam
    cam.location = target + CAM_DIR * dist
    cam.rotation_euler = (-CAM_DIR).to_track_quat('-Z', 'Y').to_euler()
    outs = [(OUT / f'{tid}.png', 96)] + ([(REVIEW / f'{tid}_288.png', 288)] if REVIEW else [])
    for path, res in outs:
        s.render.resolution_x = s.render.resolution_y = res
        s.render.resolution_percentage = 100
        s.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
    print('[PORTRAIT]', tid, str(OUT / f'{tid}.png'), 'top %.3f span %.3f' % (top, span))


for tid in IDS:
    portrait(tid)
