"""Review sheet (f): the Lantern Keeper statue v3 vs v4 -- game-camera views, a close 3/4, the lantern hand from three angles,
the back. Imports the two candidate GLBs (read-only) into an empty scene one at a time, renders the same cameras, composes.

  blender -b --python tools/blender/render_holm_statue_compare_v4.py -- <out_dir> [<sheet.png>]
Renders use the GLB's own vertex colours (flat, matte) under a warm sun + sky fill on a grass ground; the "game camera" views
reproduce the arrival-package review cameras (target 2.2 m above the plinth base, pitch 0.70 rad, distance 12 m).
"""
import bpy, sys, os, math, json, subprocess, shutil
from mathutils import Vector
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
LIVE = r"C:\Users\iQwaZ\OneDrive\Desktop\CraftedRealms-Claude"
GLB = {'v3': os.path.join(LIVE, '.studio-workspaces', 'holm-arrival-statue-v3', 'candidates', 'lantern_keeper_statue_v3.glb'),
       'v4': os.path.join(LIVE, '.studio-workspaces', 'holm-arrival-statue-v4', 'candidates', 'lantern_keeper_statue_v4.glb')}
OUT = ARGS[0] if ARGS else os.path.join(LIVE, 'scratchpad', 'holm_characters_v30', 'statue')
SHEET = ARGS[1] if len(ARGS) > 1 else os.path.join(os.path.dirname(OUT), 'statue_v3_vs_v4.png')
os.makedirs(OUT, exist_ok=True)


def scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    try:
        sc.render.engine = 'BLENDER_EEVEE_NEXT'
    except TypeError:
        sc.render.engine = 'BLENDER_EEVEE'
    sc.view_settings.view_transform = 'Standard'
    try:
        sc.eevee.taa_render_samples = 32
    except Exception:
        pass
    w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
    bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = (.55, .68, .85, 1); bg.inputs['Strength'].default_value = .9
    sd = bpy.data.lights.new('sun', 'SUN'); sd.energy = 2.6; sd.color = (1, .96, .88); sd.angle = math.radians(3)
    so = bpy.data.objects.new('sun', sd); sc.collection.objects.link(so)
    so.rotation_euler = Vector((-.45, -.60, .66)).normalized().to_track_quat('Z', 'Y').to_euler()
    me = bpy.data.meshes.new('ground'); s = 40
    me.from_pydata([(-s, -s, 0), (s, -s, 0), (s, s, 0), (-s, s, 0)], [], [(0, 1, 2, 3)])
    g = bpy.data.objects.new('ground', me); sc.collection.objects.link(g)
    gm = bpy.data.materials.new('grass'); gm.use_nodes = True
    b = next(n for n in gm.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (.36, .52, .16, 1); b.inputs['Roughness'].default_value = 1
    me.materials.append(gm)
    cd = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cd); sc.collection.objects.link(cam); sc.camera = cam
    return sc, cam


def shoot(sc, cam, path, eye, target, lens, res=(480, 360)):
    cam.location = Vector(eye)
    cam.rotation_euler = (Vector(target) - Vector(eye)).to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = lens
    cam.data.clip_end = 200
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path


def fist_and_lantern():
    """world positions of the raised fist (top of the lantern's bail) and the lantern centre"""
    lan = bpy.data.objects.get('LanternKeeperLantern')
    if lan is None:
        return None, None
    pts = [lan.matrix_world @ v.co for v in lan.data.vertices]
    top = max(pts, key=lambda p: p.z)
    c = sum(pts, Vector()) / len(pts)
    return top, c


def render(tag):
    sc, cam = scene()
    bpy.ops.import_scene.gltf(filepath=GLB[tag])
    for m in bpy.data.materials:   # matte like the game
        if m.use_nodes:
            b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if b:
                b.inputs['Roughness'].default_value = 1.0
                if 'Specular IOR Level' in b.inputs:
                    b.inputs['Specular IOR Level'].default_value = 0.0
    T = Vector((-.035, .025, 2.2 + 1.40 - 1.40 + 0.0))   # plinth centre, 2.2 m above the plinth base (game review target)
    T = Vector((-.035, .025, 2.2))
    hand, lc = fist_and_lantern()
    out = {}
    j = lambda n: os.path.join(OUT, '%s_%s.png' % (tag, n))
    for name, yaw in (('east', 0.0), ('south', .5 * math.pi), ('west', math.pi)):
        # the statue's front faces Blender -y (plan +z); 'east' in the game = in front of it
        d = Vector((math.sin(yaw), -math.cos(yaw), 0)) * math.cos(.70) + Vector((0, 0, math.sin(.70)))
        out['game_' + name] = shoot(sc, cam, j('game_' + name), T + d * 12, T, 50)
    out['close'] = shoot(sc, cam, j('close'), T + Vector((1.4, -3.3, .7)), T + Vector((0, 0, .45)), 40, (480, 560))
    if hand is not None:
        # the lantern hand from three angles (upper body + arm + lantern in frame), and the fist on the bail up close
        mid = (hand + Vector((-.05, .10, -.45)) + Vector((-.02, .02, 3.05))) / 2
        for name, off in (('hand_front', Vector((.35, -2.3, .25))), ('hand_34', Vector((-1.5, -1.75, .30))), ('hand_side', Vector((-2.3, .15, .20)))):
            out[name] = shoot(sc, cam, j(name), mid + off, mid, 50, (420, 460))
        out['fist'] = shoot(sc, cam, j('fist'), hand + Vector((-.25, -.85, .05)), hand + Vector((0, 0, -.12)), 50, (420, 460))
    out['back'] = shoot(sc, cam, j('back'), T + Vector((-1.2, 3.4, .6)), T + Vector((0, 0, .45)), 40, (480, 560))
    return out


def compose(shots):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import build_holm_characters_v2 as K
    K.RENDER_DIR = OUT
    c = lambda t, n, lab: K.cell(shots[t][n], lab, bg=[180, 200, 220])
    rows = [{'title': 'Game camera (pitch 0.70 rad, 12 m): front / side / back -- v3 (left of each pair) vs v4', 'height': 300,
             'cells': sum(([c('v3', 'game_' + n, 'v3 ' + n), c('v4', 'game_' + n, 'v4 ' + n)] for n in ('east', 'south', 'west')), [])},
            {'title': 'Close 3/4 and back', 'height': 420,
             'cells': [c('v3', 'close', 'v3 close 3/4'), c('v4', 'close', 'v4 close 3/4'), c('v3', 'back', 'v3 back'), c('v4', 'back', 'v4 back')]},
            {'title': 'The lantern hand from three angles (front / 3/4 / side) and the fist on the bail: v3 (first) vs v4', 'height': 420,
             'cells': [c('v3', 'hand_front', 'v3 lantern arm (front)'), c('v3', 'fist', 'v3 hand')] +
                      [c('v4', n, 'v4 ' + n.replace('_', ' ')) for n in ('hand_front', 'hand_34', 'hand_side', 'fist')]}]
    K.compose(SHEET, rows, 'Lantern Keeper statue: v3 (lantern stood on a straight arm) vs v4 (fist holds the bail, lantern hangs below it)')
    print('[STATUE SHEET]', SHEET)


shots = {t: render(t) for t in ('v3', 'v4')}
json.dump(shots, open(os.path.join(OUT, 'shots.json'), 'w'))
compose(shots)
