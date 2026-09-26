"""Integration check: the worn armour of holm-equipment-v1 (authored in the bind pose of the kit v2.x) on the v2.9 kit vs
the v3.0 kit (new deltoid caps / arm paths / feet), default body A in the idle and at the widest walk swing.
Read-only on the live tree (imports the two kit GLBs and equipment.glb); writes review PNGs only.

  blender -b --python tools/blender/check_holm_equipment_fit_v30.py -- <out_dir>
Worn parts follow their bones with the runtime fit rule: world = pose_bone @ rest_bone^-1 (holm_equipment.js fit()).
"""
import bpy, sys, os, math, re, json
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
LIVE = r"C:\Users\iQwaZ\OneDrive\Desktop\CraftedRealms-Claude"
KITS = {'v2.9': os.path.join(LIVE, '.studio-workspaces', 'holm-characters-v29', 'candidates', 'kit.glb'),
        'v3.0': os.path.join(LIVE, '.studio-workspaces', 'holm-characters-v30', 'candidates', 'kit.glb')}
EQUIP = os.path.join(LIVE, '.studio-workspaces', 'holm-equipment-v1', 'candidates', 'equipment.glb')
OUT = ARGS[0] if ARGS else os.path.join(LIVE, 'scratchpad', 'holm_characters_v30', 'equipment_fit')
os.makedirs(OUT, exist_ok=True)
SUITS = [('platebody + platelegs + boots', ['platebody', 'platelegs', 'boots']), ('chainbody + plateskirt', ['chainbody', 'plateskirt']),
         ('leather body + chaps + gloves', ['leather_body', 'chaps', 'gloves'])]
DEFAULT_A = re.compile(r'Kit_A_(Hair|Jaw|Torso|Arms|Hands|Legs|Feet)_01$')


def render_kit(tag, path):
    import build_holm_characters_v2 as K
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    bpy.ops.import_scene.gltf(filepath=path)
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    kit_meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=EQUIP)
    eq = [o for o in bpy.data.objects if o not in before]
    roots = {o.name: o for o in eq if o.name.startswith('eq_') and o.parent is None}
    ad = arm.animation_data or arm.animation_data_create()
    for t in list(ad.nla_tracks):
        ad.nla_tracks.remove(t)
    K.setup_render()
    for m in bpy.data.materials:
        if m.use_nodes:
            b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if b:
                b.inputs['Roughness'].default_value = 1.0
    shots = {}
    for label, kinds in SUITS:
        parts = []
        for kind in kinds:
            r = roots.get('eq_' + kind)
            if r is None:
                continue
            for o in r.children_recursive:
                if o.type == 'MESH' and o.get('bone'):
                    parts.append((o, o['bone'], o.matrix_world.copy()))
        for clip, fr in (('idle', 0), ('walk', 0), ('walk', 7)):
            act = bpy.data.actions.get(clip)
            ad.action = act
            if hasattr(ad, 'action_slot') and getattr(act, 'slots', None):
                ad.action_slot = act.slots[0]
            sc.frame_set(fr)
            bpy.context.view_layer.update()
            for o in bpy.data.objects:
                if o.type == 'MESH':
                    o.hide_render = True
            for o in kit_meshes:
                o.hide_render = not DEFAULT_A.match(o.name)
            for o, bone, rest in parts:
                pb = arm.pose.bones['mixamorig:' + bone]
                o.hide_render = False
                o.parent = None
                o.matrix_world = arm.matrix_world @ pb.matrix @ pb.bone.matrix_local.inverted()   # geometry is bind space (runtime zeroes the part node)
            for vt, vd in (('34', (.55, -.80, .18)), ('back', (-.45, .85, .20))):
                p = os.path.join(OUT, '%s_%s_%s%d_%s.png' % (tag.replace('.', ''), kinds[0], clip, fr, vt))
                K.shoot(p, (260, 380), vd, (0, 0, .95), 2.1)
                shots[(label, clip, fr, vt)] = p
            for o, bone, rest in parts:
                o.matrix_world = rest
    return shots


def main():
    import build_holm_characters_v2 as K
    res = {tag: render_kit(tag, p) for tag, p in KITS.items()}
    K.RENDER_DIR = OUT
    rows = []
    for label, kinds in SUITS:
        cells = []
        for clip, fr in (('idle', 0), ('walk', 0), ('walk', 7)):
            for vt in ('34', 'back'):
                for tag in KITS:
                    cells.append(K.cell(res[tag][(label, clip, fr, vt)], '%s %s f%d %s' % (tag, clip, fr, vt), bg=[214, 214, 218]))
        rows.append({'title': label + ' -- v2.9 kit (left of each pair) vs v3.0 kit', 'height': 300, 'cells': cells})
    sheet = os.path.join(os.path.dirname(OUT), 'equipment_fit_v29_vs_v30.png')
    K.compose(sheet, rows, 'holm-equipment-v1 worn armour (authored on the v2.x kit) on the v2.9 vs v3.0 kit, default body A')
    print('[EQUIP FIT] sheet', sheet)


main()
