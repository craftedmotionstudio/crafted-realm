"""v3.0 review sheet (a): the v2.9 and v3.0 character kits side by side in the idle, at the angles of the 2004-style
references (Character_Creator_Screen.jpg, DragonDagger_Equiped.jpg), for both body types.

Two passes (each a separate headless Blender, because both kits use the same object names):
  blender -b <kit characters.blend> --python tools/blender/render_holm_kit_compare_v30.py -- --render <tag> <out_dir>
      opens a kit's characters.blend READ-ONLY (never saved), shows the default outfit of each body type, plays the
      idle (frame 0) and renders front / 3/4 / side / creator angle / dagger angle into <out_dir>/<tag>_<bt>_<view>.png
  blender -b --python tools/blender/render_holm_kit_compare_v30.py -- --compose <out_dir> <sheet.png>
      composes the reference crops + both kits into one sheet
Nothing is read from or written to assets/; the references are only shown (never traced or imported).
"""
import bpy, sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
REPO = r"C:\Users\iQwaZ\OneDrive\Desktop\CraftedRealms-Claude"
BIBLE = os.path.join(REPO, 'Bible_References')
REF_CREATOR = os.path.join(BIBLE, 'Character_Creator_Screen.jpg')
REF_DAGGER = os.path.join(BIBLE, 'DragonDagger_Equiped.jpg')
VIEWS = [('front', (0, -1, .05), None, (0, 0, .93), 2.1, False),
         ('34', (.45, -.87, .15), None, (0, 0, .93), 2.1, False),
         ('side', (-1, .02, .05), None, (0, 0, .93), 2.1, False),
         ('creator', (.42, -.86, .22), None, (0, 0, .93), 2.0, False),
         ('dagger', (-.80, .20, .56), (5.0, 85), (0, 0, .90), 2.1, True)]
DEFAULT = {'A': ['Hair_01', 'Jaw_01', 'Torso_01', 'Arms_01', 'Hands_01', 'Legs_01', 'Feet_01'],
           'B': ['Hair_01', 'Torso_01', 'Arms_01', 'Hands_01', 'Legs_01', 'Feet_01', 'Makeup_01']}


def render(tag, out):
    import build_holm_characters_v2 as K
    os.makedirs(out, exist_ok=True)
    sc = bpy.context.scene
    arm = bpy.data.objects['Armature']
    mats = {m.name: m for m in bpy.data.materials}
    K.MAT_SRGB.clear()
    for m in bpy.data.materials:
        if m.use_nodes:
            bs = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if bs:
                K.MAT_SRGB[m.name] = tuple(bs.inputs['Base Color'].default_value)[:3]
    for tr in (arm.animation_data.nla_tracks if arm.animation_data else []):
        tr.mute = True
    K.setup_render()
    K.set_render_colors(True)
    arm.animation_data_create()
    arm.animation_data.action = bpy.data.actions['idle']
    sc.frame_set(0)
    for bt in ('A', 'B'):
        cols = {ch: K.PALETTES[ch][K.DEFAULT_COLORS[bt][ch]] for ch in K.PALETTES}
        K.apply_outfit_colors({n: mats[n] for n in K.CHANNEL_MAT.values() if n in mats}, cols)
        vis = [bpy.data.objects['Kit_%s_%s' % (bt, p)] for p in DEFAULT[bt]]
        for o in bpy.data.objects:
            if o.type == 'MESH':
                o.hide_render = o not in vis
                if o.data.shape_keys:
                    for kb in o.data.shape_keys.key_blocks[1:]:
                        kb.value = 0.0
        for name, vd, persp, ctr, ortho, ground in VIEWS:
            K.shoot(os.path.join(out, '%s_%s_%s.png' % (tag, bt, name)), (360, 520), vd, ctr, ortho, ground=ground, persp=persp)
    print('[COMPARE] rendered', tag, out)


def compose(out, sheet):
    import build_holm_characters_v2 as K
    K.RENDER_DIR = out
    rows = []
    for bt in ('A', 'B'):
        c = lambda tag, v, lab, bg=None: K.cell(os.path.join(out, '%s_%s_%s.png' % (tag, bt, v)), lab, bg=bg or [214, 214, 218])
        rows.append({'title': 'Body %s idle (frame 0): v2.9 (shipped) vs v3.0 -- front / 3/4 / side' % bt, 'height': 420,
                     'cells': [c('v29', 'front', 'v2.9 front'), c('v30', 'front', 'v3.0 front'), c('v29', '34', 'v2.9 3/4'), c('v30', '34', 'v3.0 3/4'),
                               c('v29', 'side', 'v2.9 side'), c('v30', 'side', 'v3.0 side')]})
        rows.append({'title': 'Body %s next to the references at matching angles' % bt, 'height': 420,
                     'cells': [K.cell(REF_CREATOR, 'Character_Creator_Screen.jpg (crop)', crop=[300, 205, 528, 470]),
                               c('v29', 'creator', 'v2.9 creator angle', [74, 66, 56]), c('v30', 'creator', 'v3.0 creator angle', [74, 66, 56]),
                               K.cell(REF_DAGGER, 'DragonDagger_Equiped.jpg (crop)', crop=[430, 150, 880, 1420]),
                               c('v29', 'dagger', 'v2.9 dagger angle', [112, 118, 48]), c('v30', 'dagger', 'v3.0 dagger angle', [112, 118, 48])]})
    K.compose(sheet, rows, 'Kit v2.9 vs v3.0 idle stance, shoulders and feet next to the 2004-style references')
    print('[COMPARE] sheet', sheet)


if ARGS and ARGS[0] == '--render':
    render(ARGS[1], ARGS[2])
elif ARGS and ARGS[0] == '--compose':
    compose(ARGS[1], ARGS[2])
