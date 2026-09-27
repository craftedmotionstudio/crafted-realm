"""build_holm_characters_v4_options.py -- character kit v4 OPTIONS review renders (owner review 2026-09-27).

One Blender run per option profile (tools/blender/holm_char_profiles_v4.py patches the kit tables first):

  blender -b --python tools/blender/build_holm_characters_v4_options.py -- --profile v4a --out scratchpad/holm_characters_v4/v4a

Builds (our own Blender meshes, from the shared kit builder) the default man + woman, a "classic outfit" man + woman used for
the silhouette measurements (bald, short sleeves, plain trousers, boots), the idle / walk / run clips with the option's
old-client stepping, Guide Bram and Cook Hettie in the option style; renders turnarounds, the game camera, walk / run strips
and GIF loops, face close-ups; measures the body (numbers only) and the gait from the clip poses; writes
  <out>/<profile>_sheet.png   the option sheet (no reference imagery)
  <out>/<profile>_measure.json
"""
import sys, os, json, math
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(k, d=None):
    return ARGS[ARGS.index(k) + 1] if k in ARGS else d
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))
import bpy
from mathutils import Vector
import build_holm_characters_v2 as K

PROF = arg('--profile')
K.apply_profile(PROF)
import holm_char_profiles_v4 as HP
OUT = os.path.abspath(arg('--out'))
CELLS = os.path.join(OUT, 'cells')
os.makedirs(CELLS, exist_ok=True)
K.RENDER_DIR = OUT
QUICK = '--quick' in ARGS

CLASSIC = {'A': {'Hair': 2, 'Jaw': 2, 'Torso': 1, 'Arms': 2, 'Hands': 1, 'Legs': 1, 'Feet': 1},
           'B': {'Hair': 2, 'Torso': 2, 'Arms': 2, 'Hands': 1, 'Legs': 4, 'Feet': 1, 'Makeup': 1}}   # B: cropped top, bare midriff
CLASSIC_COLORS = {'hair': '#3a2a1c', 'torso': '#7c7a2e', 'legs': '#1f6232', 'feet': '#4e321c', 'skin': '#c08a62'}


GIF_PY = '''
import json, sys
from PIL import Image
d = json.load(open(sys.argv[1]))
for k, fs in d['gifs'].items():
    ims = []
    for f in fs:
        im = Image.open(f).convert('RGBA')
        bg = Image.new('RGBA', im.size, tuple(d['bg']) + (255,))
        bg.alpha_composite(im)
        ims.append(bg.convert('P', palette=Image.ADAPTIVE, colors=128))
    ims = ims * 3
    ims[0].save('%s/%s_%s.gif' % (d['out'], d['prof'], k[4:]), save_all=True, append_images=ims[1:], duration=33, loop=0, disposal=2)
'''


def need_parts():
    need = set()
    for bt in ('A', 'B'):
        for sel in (K.DEFAULT_OUTFIT[bt], CLASSIC[bt]):
            for s, i in sel.items():
                if i:
                    need.add((bt, s, i))
    for s, i in K.BRAM_PARTS:
        need.add(('A', s, i))
    for s, i in K.TUTORS['hettie']['parts'].items():
        need.add(('B', s, i))
    return sorted(need)


def colors_for(bt, classic=False):
    cols = {ch: K.PALETTES[ch][K.DEFAULT_COLORS[bt][ch]] for ch in K.PALETTES}
    if classic:
        for ch, hx in CLASSIC_COLORS.items():
            if ch in cols:
                cols[ch] = hx
    return cols


def main():
    K.reset_scene()
    mats = K.make_kit_materials('A')
    arm = K.build_armature()
    objs = {}
    for bt, s, i in need_parts():
        objs[K.part_name(bt, s, i)] = K.build_part(bt, s, i, mats, arm)
    # clips: idle / walk / run with the option's stepping
    defs = K.clip_defs()
    defs.update(K.v27_clips())
    clips = {}
    for name in ('idle', 'walk', 'run'):
        frames, keys, loop = defs[name]
        interp = None
        if name in K.STEP_CLIPS:
            hold, interp = K.STEP_CLIPS[name]
            if hold:
                keys = K.stepped(frames, keys, hold)
        clips[name] = K.make_clip(arm, name, frames, keys)
        if interp:
            K.set_interp(clips[name], interp)
    K.setup_render()
    K.set_render_colors(True)
    sc = bpy.context.scene
    res = {'profile': PROF, 'label': HP.PROFILES[PROF]['label'], 'renders': {}, 'body': {}, 'gait': {}}

    def outfit(bt, sel):
        return [objs[K.part_name(bt, s, i)] for s, i in sel.items() if i]

    def pose_idle():
        arm.animation_data.action = clips['idle']
        sc.frame_set(0)

    GV, GC, GP = (.42, -.72, .78), (0, 0, .85), (5.0, 85)
    cells = {}
    # ---- turnarounds (default outfit) + game camera
    for bt in ('A', 'B'):
        K.apply_outfit_colors(mats, colors_for(bt))
        K.show_only(outfit(bt, K.DEFAULT_OUTFIT[bt]))
        pose_idle()
        row = []
        for vn, vd in (('front', (0, -1, 0)), ('34', K.V34), ('side', (-1, 0, 0)), ('back', (0, 1, 0))):
            p = K.shoot(os.path.join(CELLS, '%s_%s_%s.png' % (PROF, bt, vn)), (300, 500), vd, K.TURN_CENTER, K.TURN_ORTHO)
            row.append(K.cell(p, '%s %s' % ('man' if bt == 'A' else 'woman', vn), bg=K.BG_REF))
        p = K.shoot(os.path.join(CELLS, '%s_%s_game.png' % (PROF, bt)), (330, 500), GV, GC, 2.0, ground=True, persp=GP)
        row.append(K.cell(p, 'game camera', bg=K.BG_GAME))
        cells['turn_' + bt] = row
        # the body numbers (idle pose, default outfit)
        dg = bpy.context.evaluated_depsgraph_get()
        pts = []
        for o in outfit(bt, K.DEFAULT_OUTFIT[bt]):
            oe = o.evaluated_get(dg); me = oe.to_mesh()
            pts += [oe.matrix_world @ v.co for v in me.vertices]
            oe.to_mesh_clear()
        top = max(p.z for p in pts)
        chin = K.head_to_world(Vector((0, 0, K.HEAD_T[bt][0][0]))).z
        res['body'][bt] = dict(height_m=round(top, 3), chin_m=round(chin, 3), collar_m=round(K.TORSO[bt][-1][0], 3),
                               head_h_m=round(top - chin, 3), neck_front_m=round(chin - K.TORSO[bt][-1][0], 3))
    # ---- classic outfit: front + side silhouettes for the measurements, and the same at 3/4
    for bt in ('A', 'B'):
        K.apply_outfit_colors(mats, colors_for(bt, classic=True))
        K.show_only(outfit(bt, CLASSIC[bt]))
        pose_idle()
        row = []
        for vn, vd in (('front', (0, -1, 0)), ('side', (-1, 0, 0)), ('34', K.V34)):
            p = K.shoot(os.path.join(CELLS, '%s_%s_classic_%s.png' % (PROF, bt, vn)), (300, 500), vd, K.TURN_CENTER, K.TURN_ORTHO)
            row.append(K.cell(p, 'classic %s %s' % ('man' if bt == 'A' else 'woman', vn), bg=K.BG_REF))
            res['renders']['classic_%s_%s' % (bt, vn)] = p
        p = K.shoot(os.path.join(CELLS, '%s_%s_classic_game.png' % (PROF, bt)), (330, 500), GV, GC, 2.0, ground=True, persp=GP)
        row.append(K.cell(p, 'classic, game camera', bg=K.BG_GAME))
        res['renders']['classic_%s_game' % bt] = p
        # the old client's close camera (pitch 22.5 deg, 2.23 body heights away, 53 deg horizontal field of view, aimed at
        # half height) at 0 / 45 / 90 ... deg around the figure, for the matched-angle comparison sheets
        Hh = res['body'][bt]['height_m']
        wbg = next(n for n in sc.world.node_tree.nodes if n.type == 'BACKGROUND').inputs['Strength']
        wbg.default_value = .55   # the old client's darker, contrastier lighting for the matched views
        for rel in (0, 256, 512, 768, 1024, 1280, 1536, 1792):
            a_ = math.radians(rel * 360.0 / 2048)
            vd = (-math.sin(a_) * math.cos(math.radians(22.5)), -math.cos(a_) * math.cos(math.radians(22.5)), math.sin(math.radians(22.5)))
            p = K.shoot(os.path.join(CELLS, '%s_%s_classic_rel%d.png' % (PROF, bt, rel)), (512, 334), vd, (0, 0, .497 * Hh), 2.0,
                        persp=(2.228 * Hh, 36.0))
            res['renders']['classic_%s_rel%d' % (bt, rel)] = p
        wbg.default_value = 1.0
        cells['classic_' + bt] = row
    # ---- face close-ups (default outfit)
    for bt in ('A', 'B'):
        K.apply_outfit_colors(mats, colors_for(bt))
        K.show_only(outfit(bt, K.DEFAULT_OUTFIT[bt]))
        pose_idle()
        chin = K.head_to_world(Vector((0, 0, 1.62))).z
        row = []
        for vn, vd in (('front', (0, -1, 0)), ('34', (.55, -.8, .08))):
            p = K.shoot(os.path.join(CELLS, '%s_%s_face_%s.png' % (PROF, bt, vn)), (260, 300), vd, (0, 0, chin + .07), .46)
            row.append(K.cell(p, '%s face %s' % ('man' if bt == 'A' else 'woman', vn), bg=K.BG_REF))
        cells['face_' + bt] = row
    # ---- walk / run strips (side view + game camera) and GIF loops
    for bt in ('A', 'B'):
        K.apply_outfit_colors(mats, colors_for(bt))
        K.show_only(outfit(bt, K.DEFAULT_OUTFIT[bt]))
        for cn in ('walk', 'run'):
            frames = defs[cn][0]
            arm.animation_data.action = clips[cn]
            row = []
            for k in range(8):
                f = round(k * frames / 8)
                sc.frame_set(f)
                p = K.shoot(os.path.join(CELLS, '%s_%s_%s_%02d.png' % (PROF, bt, cn, k)), (170, 300), (-1, 0, 0), (0, 0, .95), 2.1)
                row.append(K.cell(p, 'f%d' % f, bg=K.BG_REF))
            cells['%s_%s' % (cn, bt)] = row
            # every frame from the side at the game camera's 22.5 deg pitch (the 2004 strips' view) for the gait numbers
            gs = []
            for f in range(frames):
                sc.frame_set(f)
                gs.append(K.shoot(os.path.join(CELLS, 'gs_%s_%s_%s_%02d.png' % (PROF, bt, cn, f)), (160, 200), (-1, 0, .4142), (0, 0, .92), 2.3))
            res['renders']['gaitsil_%s_%s' % (bt, cn)] = gs
            if not QUICK:
                gif = []
                for f in range(frames):
                    sc.frame_set(f)
                    gif.append(K.shoot(os.path.join(CELLS, 'gif_%s_%s_%s_%02d.png' % (PROF, bt, cn, f)), (240, 320), (.60, -.62, .50), (0, 0, .90), 2.2))
                res['renders']['gif_%s_%s' % (bt, cn)] = gif
    # ---- Guide Bram + Cook Hettie in the option style
    barm, bmats, bobjs, bacts, bdefs = K.build_bram(objs, mats)
    K.set_pose(barm, bdefs['idle'][1][0][1])
    K.show_only(list(bobjs.values()))
    arm.animation_data.action = None
    row = []
    for vn, vd in (('34', K.V34), ('front', (0, -1, 0))):
        p = K.shoot(os.path.join(CELLS, '%s_bram_%s.png' % (PROF, vn)), (320, 500), vd, K.TURN_CENTER, K.TURN_ORTHO)
        row.append(K.cell(p, 'Guide Bram %s' % vn, bg=K.BG_REF))
    p = K.shoot(os.path.join(CELLS, '%s_bram_game.png' % PROF), (330, 500), GV, GC, 2.0, ground=True, persp=GP)
    row.append(K.cell(p, 'Guide Bram, game camera', bg=K.BG_GAME))
    chin = K.head_to_world(Vector((0, 0, 1.62))).z
    p = K.shoot(os.path.join(CELLS, '%s_bram_face.png' % PROF), (260, 300), (.55, -.8, .08), (0, 0, chin + .07), .48)
    row.append(K.cell(p, 'Guide Bram face', bg=K.BG_REF))
    cells['bram'] = row
    for o in bobjs.values():
        o.hide_render = True
    tarm, tm, tobjs, tacts, tdefs = K.build_tutor('hettie', objs, mats)
    K.set_pose(tarm, tdefs['idle'][1][0][1])
    K.show_only(list(tobjs.values()))
    row = []
    for vn, vd in (('front', (0, -1, 0)), ('34', (.55, -.8, .08))):
        p = K.shoot(os.path.join(CELLS, '%s_hettie_face_%s.png' % (PROF, vn)), (260, 300), vd, (0, 0, chin + .08), .50)
        row.append(K.cell(p, 'Cook Hettie face %s' % vn, bg=K.BG_REF))
    p = K.shoot(os.path.join(CELLS, '%s_hettie_34.png' % PROF), (320, 500), K.V34, K.TURN_CENTER, K.TURN_ORTHO)
    row.append(K.cell(p, 'Cook Hettie 3/4', bg=K.BG_REF))
    p = K.shoot(os.path.join(CELLS, '%s_hettie_game.png' % PROF), (330, 500), GV, GC, 2.0, ground=True, persp=GP)
    row.append(K.cell(p, 'Cook Hettie, game camera', bg=K.BG_GAME))
    cells['hettie'] = row
    # ---- gait numbers from the clip poses (the unstepped cycle = the motion; stepping only changes the sampling)
    H = res['body']['A']['height_m']
    for cn in ('walk', 'run'):
        frames, keys, loop = defs[cn]
        rows = []
        for f, pose in keys[:frames]:
            hd, acc = K.fk(pose)
            g = lambda n: hd[K.B(n)]
            ua = g('LeftForeArm') - g('LeftArm')
            th = g('LeftLeg') - g('LeftUpLeg')
            fa = g('LeftHand') - g('LeftForeArm')
            rows.append(dict(hips_z=g('Hips').z, arm_deg=math.degrees(math.atan2(-ua.y, -ua.z)), thigh_deg=math.degrees(math.atan2(-th.y, -th.z)),
                             elbow_deg=math.degrees(ua.angle(fa)), hand_y=g('LeftHand').y, foot_z=g('LeftFoot').z,
                             feet_dy=abs(g('LeftFoot').y - g('RightFoot').y)))
        rng = lambda k: max(r[k] for r in rows) - min(r[k] for r in rows)
        T = frames / K.FPS
        speed = K.GAME_WALK_SPEED if cn == 'walk' else K.GAME_RUN_SPEED
        res['gait'][cn] = dict(frames=frames, cycle_s=round(T, 3), steps_per_min=round(120 / T, 1), speed_mps=speed,
                               stride_m=round(speed * T, 3), stride_H=round(speed * T / H, 3), step_H=round(speed * T / 2 / H, 3),
                               bob_m=round(rng('hips_z'), 4), bob_H=round(rng('hips_z') / H, 4),
                               arm_swing_deg=round(rng('arm_deg'), 1), thigh_swing_deg=round(rng('thigh_deg'), 1),
                               hand_travel_H=round(rng('hand_y') / H, 3), max_feet_apart_H=round(max(r['feet_dy'] for r in rows) / H, 3),
                               elbow_deg=[round(min(r['elbow_deg'] for r in rows), 1), round(max(r['elbow_deg'] for r in rows), 1)],
                               foot_lift_H=round(rng('foot_z') / H, 3),
                               poses_per_cycle=(len(K.stepped(frames, defs[cn][1], K.STEP_CLIPS[cn][0])) // 2 + 1) if cn in K.STEP_CLIPS else frames,
                               interpolation=K.STEP_CLIPS.get(cn, (None, 'BEZIER'))[1])
    res['gait_report'] = {k: K.GAIT_REPORT.get(k) for k in ('walk', 'run')}
    # ---- the option sheet (our renders only)
    P = HP.PROFILES[PROF]
    rows = [{'title': 'Man: turnaround (idle) + game camera', 'height': 360, 'cells': cells['turn_A']},
            {'title': 'Woman: turnaround (idle) + game camera', 'height': 360, 'cells': cells['turn_B']},
            {'title': 'Classic outfit (used for the silhouette measurements): man', 'height': 360, 'cells': cells['classic_A']},
            {'title': 'Classic outfit: woman', 'height': 360, 'cells': cells['classic_B']},
            {'title': 'Faces (neutral, old-school)', 'height': 230, 'cells': cells['face_A'] + cells['face_B']},
            {'title': 'Walk, man (side, 8 samples of the cycle; %s)' % str(K.STEP_CLIPS.get('walk', 'smooth')), 'height': 250, 'cells': cells['walk_A']},
            {'title': 'Run, man (side, 8 samples; %s)' % str(K.STEP_CLIPS.get('run', 'smooth')), 'height': 250, 'cells': cells['run_A']},
            {'title': 'Walk, woman', 'height': 250, 'cells': cells['walk_B']},
            {'title': 'Run, woman', 'height': 250, 'cells': cells['run_B']},
            {'title': 'Guide Bram in this style', 'height': 330, 'cells': cells['bram']},
            {'title': 'Cook Hettie in this style', 'height': 330, 'cells': cells['hettie']}]
    sheet = os.path.join(OUT, '%s_sheet.png' % PROF)
    K.compose(sheet, rows, '%s  --  %s' % (PROF, P['label']))
    res['sheet'] = sheet
    res['cells'] = cells
    with open(os.path.join(OUT, '%s_measure.json' % PROF), 'w', encoding='utf-8') as fh:
        json.dump(res, fh, indent=1)
    if not QUICK:   # GIF loops (3 cycles, real time at 30 fps) with the system python + Pillow
        gifs = {k: v for k, v in res['renders'].items() if k.startswith('gif_')}
        spec = os.path.join(OUT, '_gifs.json')
        with open(spec, 'w', encoding='utf-8') as fh:
            json.dump({'out': OUT, 'prof': PROF, 'gifs': gifs, 'bg': K.BG_REF}, fh)
        code = GIF_PY
        import subprocess, shutil
        py = shutil.which('python') or shutil.which('py')
        env = {k: v for k, v in os.environ.items() if not k.startswith('PYTHON')}
        r = subprocess.run([py, '-c', code, spec], capture_output=True, text=True, env=env)
        print('[GIF]', r.returncode, r.stderr[-400:])
        os.remove(spec)
    print('[V4OPT] done', PROF, json.dumps(res['gait']))


main()
