"""Character kit v4 OPTIONS (owner review 2026-09-27): three directions for the base man + woman, applied as patches to the
shared tables of tools/blender/build_holm_characters_v2.py before any part is built (profile None = kit v3.1f).

Owner: "look more like the old school RuneScape style ... straight-across shoulder level ... the head smaller and more of a
visible neck ... ankles / shins blend into the feet better (especially sandals) ... the walk and run too polished ...
neutral old-school faces". Every option shares those fixes and differs in how far it goes:
  v4a  closest-possible 2004 proportions, flat faceted shading, old-client stepped animation (held poses, snaps)
  v4b  the v4a body with softer (Gouraud-like) shading and held poses joined by straight lines
  v4c  a stylised midpoint: slightly larger head, gentler shoulder shelf, soft shading, fewer-key smooth motion
Our own designs, built in Blender: the 2004 captures are studied for proportions / silhouette / motion only.
"""
import math

def _torso_top(K, bt, rows):
    """replace the torso rows at and above the first given z (the shoulder shelf and the collar)"""
    z0 = rows[0][0]
    keep = [r for r in K.TORSO[bt] if r[0] < z0 - 1e-6]
    cy = {r[0]: r[4] for r in K.TORSO[bt]}
    def cy_at(z):
        near = min(K.TORSO[bt], key=lambda r: abs(r[0] - z))
        return near[4]
    new = [(z, rx, rf, rb, cy_at(z)) for z, rx, rf, rb in rows]
    K.TORSO[bt][:] = keep + new

# the shared v4 body: level shoulder shelf, collar at the neck base, smaller head raised on a visible neck
SHELF = {   # (z, rx, rf, rb) -- the torso from the upper chest to the collar
    'A': [(1.380, .197, .126, .117), (1.420, .200, .117, .111), (1.448, .196, .104, .101), (1.466, .168, .088, .087),
          (1.478, .110, .074, .074), (1.488, .074, .064, .066), (1.494, .068, .062, .064)],
    'B': [(1.385, .162, .110, .106), (1.418, .163, .100, .098), (1.442, .156, .090, .089), (1.458, .128, .078, .078),
          (1.470, .086, .066, .068), (1.480, .064, .058, .060), (1.486, .060, .058, .060)],
}
SHELF_SQ = {   # the 2004 "coat-hanger" line: a flat top from the collar almost to the arm, then a crisp corner into the sleeve
    'A': [(1.380, .176, .126, .117), (1.420, .177, .118, .112), (1.452, .177, .108, .104), (1.472, .172, .094, .092),
          (1.486, .152, .080, .080), (1.494, .108, .068, .070), (1.500, .072, .062, .064)],
    'B': [(1.385, .156, .110, .106), (1.418, .162, .102, .099), (1.446, .164, .092, .090), (1.464, .160, .080, .080),
          (1.478, .142, .069, .070), (1.486, .100, .060, .062), (1.492, .062, .058, .060)],
}
SHELF_C = {   # the stylised midpoint: a gentler shelf
    'A': [(1.380, .197, .126, .117), (1.425, .194, .110, .106), (1.455, .172, .092, .091), (1.475, .124, .076, .076),
          (1.488, .078, .065, .067), (1.496, .070, .062, .064)],
    'B': [(1.385, .162, .110, .106), (1.422, .156, .098, .096), (1.448, .138, .084, .084), (1.466, .100, .070, .071),
          (1.478, .066, .058, .060), (1.486, .061, .058, .060)],
}

# ---- heads (every option): the 2004 head is an egg -- widest at the temples, narrowing to a domed, slightly pointed crown
# and to a small pointed chin; tiny ears; the face is a thin dark eye slit (with a small drop at its outer end), no brows,
# at most a faint mouth line.  (z, rx, rf, rb, jaw) in head space, final values (v3.1f widened these by 1.02 at load)
HEAD_EGG = {   # the back of the skull stops above the jaw line: from behind the nape shows below it (the 2004 back view)
    'A': [(1.548, .036, .044, .028, 0.0), (1.566, .056, .062, .034, .15), (1.588, .068, .074, .044, .11), (1.628, .079, .084, .072, .05),
          (1.665, .085, .088, .092, 0.0), (1.720, .086, .086, .098, 0.0), (1.770, .080, .078, .094, 0.0), (1.800, .068, .062, .080, 0.0),
          (1.818, .047, .040, .056, 0.0), (1.824, .020, .016, .022, 0.0)],
}
HEAD_EGG['B'] = [(1.554, .032, .040, .026, 0.0), (1.572, .052, .060, .032, .17), (1.592, .064, .072, .042, .12),
                 (1.630, .076, .084, .070, .05)] + HEAD_EGG['A'][4:]
# v4a.2 (owner: the skull is "not very three-dimensional ... kind of narrow"): a thicker, deeper, rounder cranium -- the back
# of the skull 7 % fuller from the temples up, the crown rounded off (no point), a squarer superellipse (fuller at the
# back-side diagonals) and the whole head 10 % deeper (head_wy); the height (0.16 H) is unchanged
HEAD_BACK_K = 1.07
def _rounder(rows):
    out = []
    for z, rx, rf, rb, jw in rows:
        k = HEAD_BACK_K if z >= 1.62 else 1.0 + (HEAD_BACK_K - 1.0) * max(0.0, (z - 1.57) / .05)
        crown = 1.0 + .10 * max(0.0, (z - 1.77) / .05)          # (1.80 / 1.818 rings: a round dome, not a point)
        out.append((z, rx * (1.02 if k > 1.0 else 1.0) * crown, rf * min(crown, 1.05), rb * k * crown, jw))
    return out
HEAD_ROUND = {bt: _rounder(rows) for bt, rows in HEAD_EGG.items()}

# the 2004 idle (measured on the reference front views): legs nearly parallel and close under narrow hips
STANCE_2004 = {'LeftUpLeg': (-5.5, -1, 3.0), 'RightUpLeg': (-5.5, 1, -3.0), 'Neck': (10, 0, 0), 'Head': (6, 0, 0)}   # head carried forward, face level
# the old client's ready pose: the left foot a little forward, the right back, toes turned out
IDLE_FEET_2004 = {'Left': (.075, .12), 'Right': (-.075, .00), 'drop': .010, 'toe': 8.0}   # heels close (0.09 H), the right foot forward
# v4a.2b (REF2004 stance 0.088 H man / 0.075 H woman; ours measured 0.161 / 0.177): the feet drawn in under the body
# (x +-6.5 cm), the left one 20 cm back, toes nearly straight, knees soft; the sole a touch narrower than the instep, and
# slimmer shins / knees / hems so the legs still stand apart down to the ground (the 2004 gap line). Closer still and the
# knees / hems close the gap (the silhouette's legs merge) -- see the report.
IDLE_FEET_2004_2 = {'Left': (.065, .20), 'Right': (-.065, .00), 'drop': .012, 'toe': 3.0}
SOLE_2004 = {'A': .90, 'B': .90}

# the 2004 man's V: broad square shoulders over a narrow waist at the belt and slim hips (body A, z < 1.38; final values)
V_TORSO_A = [(0.940, .138, .1232, .1210, .026), (1.000, .136, .1210, .1166, .022), (1.080, .152, .1276, .1166, .018),
             (1.160, .166, .1386, .1188, .014), (1.240, .174, .1452, .1232, .010), (1.315, .182, .1408, .1232, .008)]
V_PELVIS_A = [(0.790, .110, .0691, .0734, .030), (0.850, .168, .1037, .1123, .028), (0.930, .160, .1145, .1231, .026),
              (0.985, .142, .1166, .1188, .024), (1.012, .137, .1166, .1145, .022)]
# 2004 legs are long: the crotch sits just under the hip joints (0.48 H) -- a short rise under the belt
V_PELVIS_A_LONG = [(0.868, .100, .0691, .0734, .030), (0.900, .160, .1037, .1123, .028), (0.945, .158, .1145, .1231, .026),
                   (0.985, .142, .1166, .1188, .024), (1.012, .137, .1166, .1145, .022)]

def _arms(K, elbow_up, wrist_up):
    """2004 arms are shorter (fists at the crotch, 0.50 H): the elbow and wrist joints move up (the skeleton changes;
    every clip / grip is computed from the bones, the grip point follows the hand)"""
    from mathutils import Vector
    for i, (n, par, h, t, r) in enumerate(K.BONES):
        short = n.split(':')[1]
        for sd in ('Left', 'Right'):
            if short == sd + 'Arm':
                t = (t[0], t[1], t[2] + elbow_up)
            elif short == sd + 'ForeArm':
                h = (h[0], h[1], h[2] + elbow_up); t = (t[0], t[1], t[2] + wrist_up)
            elif short == sd + 'Hand':
                h = (h[0], h[1], h[2] + wrist_up); t = (t[0], t[1], t[2] + wrist_up)
        K.BONES[i] = (n, par, h, t, r)
    K.BHEAD.update({b[0]: Vector(b[2]) for b in K.BONES})
    K.BTAIL.update({b[0]: Vector(b[3]) for b in K.BONES})
    for sd in ('Left', 'Right'):
        K.GRIP_REST[sd] = K.GRIP_REST[sd] + Vector((0, 0, wrist_up))
    K._STANCE_LOCAL.clear()

# the 2004 woman: very slim -- a narrow waist (the bare midriff), slim hips and thighs, under puffed shoulders
V_TORSO_B = [(0.940, .146, .1166, .1232, .026), (1.000, .125, .1078, .1100, .022), (1.060, .112, .1056, .1034, .018),
             (1.140, .122, .1180, .1056, .014), (1.215, .138, .1640, .1078, .010), (1.270, .144, .1660, .1100, .008),
             (1.330, .150, .1300, .1100, .008)]   # a fuller bust than v3.1f, as the reference's side view
V_PELVIS_B = [(0.800, .112, .0691, .0756, .030), (0.850, .176, .1058, .1188, .028), (0.930, .178, .1145, .1318, .026),
              (0.985, .154, .1080, .1166, .024), (1.012, .138, .1058, .1091, .022)]

def _mix_rows(old, new, t, keep_z=False):
    """blend two same-length row tables (every column; keep_z: the new heights, only the radii blended) -- t = 1: new"""
    return [((rn[0],) if keep_z else (ro[0] + (rn[0] - ro[0]) * t,)) + tuple(a + (b - a) * t for a, b in zip(ro[1:], rn[1:]))
            for ro, rn in zip(old, new)]

def _v_body(K, thigh_k=.80, hip_x=.100, long_legs=True, thigh_k_b=.84, hip_x_b=.090, mix=1.0):
    lowA = [r for r in K.TORSO['A'] if r[0] < 1.38 - 1e-6]
    lowB = [r for r in K.TORSO['B'] if r[0] < 1.38 - 1e-6]
    K.TORSO['A'][:] = _mix_rows(lowA, V_TORSO_A, mix) + [r for r in K.TORSO['A'] if r[0] >= 1.38 - 1e-6]
    K.PELVIS['A'][:] = _mix_rows(K.PELVIS['A'], V_PELVIS_A_LONG if long_legs else V_PELVIS_A, mix, keep_z=True)   # the long inseam always
    K.TORSO['B'][:] = _mix_rows(lowB[:len(V_TORSO_B)], V_TORSO_B, mix) + [r for r in K.TORSO['B'] if r[0] >= 1.38 - 1e-6]
    K.PELVIS['B'][:] = _mix_rows(K.PELVIS['B'], V_PELVIS_B, mix, keep_z=True)
    for bt, tk in (('A', thigh_k), ('B', thigh_k_b)):   # the slim thighs always (they open the gap under the crotch)
        K.LEG_R[bt][:] = [(u, rs * (tk + (1 - tk) * K.ss(.8, 1.2, u)), rf, rb) for u, rs, rf, rb in K.LEG_R[bt]]
    K.HIP_X['A'] = K.HIP_X['A'] + (hip_x - K.HIP_X['A']) * mix
    K.HIP_X['B'] = K.HIP_X['B'] + (hip_x_b - K.HIP_X['B']) * mix

# the 2004 cycle (measured on the reference strips: walk 8 poses x 120 ms, stride 0.97 H; run 8 poses x 85 ms, 0.68 s,
# stride 1.59 H at 2.33 H/s). Our run speed (4.2 m/s = 2.31 H/s) matches, so the run keeps the 2004 cycle; our walk is
# faster than 2004's (1.32 vs 1.01 H/s), so the walk keeps the 2004 STRIDE (23 frames = 0.77 s -> 1.01 H).
# the reference strips also lean forward: ~5 deg in the walk, ~14 deg in the run (hips -> head)
# REF2004_FEEL_REPORT (2026-09-27, sections 3-6 / A): the world walks 1 tile per 600 ms tick (1.67 tiles/s) and runs 2
# (3.33 tiles/s); a character stands 1.5 tiles tall (ours 1.85 -> the runtime shows the kit at WORLD_H / KIT_H). The clips are
# authored in the kit's own metres, so their ground speeds are the world speeds / that scale -- slide-free at timeScale 1:
# walk 0.94 s cycle, 0.5 H per step, lean +5, bob 3-5 % H; run 0.66 s cycle, 0.74 H per step, lean +14, elbows ~90 deg.
WORLD_H, KIT_H = 1.5, 1.813                     # tiles; the default man's height in the kit (manifest height_m_rest_default_outfit)
WORLD_SCALE = WORLD_H / KIT_H                   # the runtime scale of every kit-built character (player, actors, NPCs)
WALK_TPS, RUN_TPS = 1.0 / .6, 2.0 / .6          # tiles per second (1 / 2 tiles per 600 ms tick)
GAIT_2004 = {'walk': {'frames': 28, 'duty': .52, 'bob': .045, 'p_on': 12, 'p_off': -24, 'arm_swing': 38, 'plant_k': 1.0, 'lean_cap': (5.0, False)},
             'run': {'frames': 20, 'duty': .30, 'bob': .040, 'bob_phase': .40, 'drop': .04, 'kick': .34, 'lift': .19, 'arm_swing': 96, 'fore': 70,
                     'plant_k': 1.0, 'lean_cap': (14.0, False)}}
# v4a.2 (owner review 2026-09-27 of the rollout vs the 2004 man; numbers + judgement only):
#  walk -- "the feet always look parallel with the ground": a real heel strike (toes up 24 deg on the leading foot), a real
#          push-off (the trailing heel up 34 deg, its knee bending), the swing foot lifted clear with the toes down after the
#          push-off and up before the strike (swing_pitch); the lean a touch more (the harness measured 4.0 for 5 authored)
#  run  -- "a very aggressive run": calmer -- the arms swing +-52 deg (was +-96) with the elbows held near 90, a lower foot
#          lift and heel kick, a little less twist; same 0.667 s cycle and 0.75 H step; the lean authored 16.5 so the
#          harness's silhouette measure reads ~14 (it read 9.9 for 14 authored: the kicked-up rear leg pulls the bottom back)
GAIT_2004_2 = {'walk': dict(GAIT_2004['walk'], p_on=24, p_off=-34, lift=.062, osrs=(10.0, 0.0, 3.0), swing_pitch=(.10, .62), front_q=.2, head_pitch=-5.0, lean_cap=(11.0, False)),
               'run': dict(GAIT_2004['run'], kick=.14, lift=.10, arm_swing=52, fore=86, fore_swing=10, twist=5, p_on=14, p_off=-40,
                           swing_y=(.12, .88), front_q=.35, lean=5, lean_cap=(26.0, False),
                           trail=(.45, 30.0), hips_pitch=14.0, chest=8.0, duty=.30)}   # (lean 7: the head counters 7 deg -- eyes ahead)
# (REF2004 re-capture of v4a.2 with lean caps 6.5 / 16.5 and the run's head countering 13 deg: the harness measured 3.4 / 8.3
# -- its lean is the silhouette's top-quarter vs bottom-quarter centroid, so a head held back reads as less lean. The head
# now goes with the body as in the reference run, and the caps are 8 / 19 so the silhouettes measure ~5 / ~14)
GAIT_C = {'walk': dict(GAIT_2004['walk'], frames=21, plant_k=.8, lean_cap=(3.0, False)),
          'run': dict(GAIT_2004['run'], frames=20, lean_cap=(8.0, False))}

TUTOR_PARTS = {'hettie': {'Makeup': 1}}

# the kit's spine-lean gates, widened on purpose for the 2004 look (build_holm_characters_v2.LEAN_LIMITS): the reference
# strips lean ~5 deg forward in the walk and ~14 deg in the run (we author 5 / 12); the ready pose carries the head forward
LEAN_2004 = {'still': .5, 'walk': 5.6, 'run': 14.6, 'head_idle': 9.0, 'tutor_walk': 5.6}
LEAN_2004_2 = dict(LEAN_2004, walk=11.6, run=26.6)   # v4a.2: the authored leans that measure ~5 / ~14 on the harness strips
# the tutors' stroll: the same 2004 lean and a touch of the old client's short leg swing
TUTOR_GAIT_2004 = {'lean_cap': (5.0, False), 'plant_k': .85, 'arm_swing': 20}

# the 2004 goatee is broad: from the mouth corners down over the chin
GOATEE_2004 = dict(tip_z=1.500, thick=.016, th_max=62, top_front=1.604, top_side=1.610, side_bot=1.572, narrow=.55)
# the shared 2004 body (measured against the reference man and woman: designer front + the old client's close camera)
BODY_2004 = dict(shelf=SHELF_SQ, arm_lift={'A': .066, 'B': .074}, arm_out={'A': -.034, 'B': .004},
                 head_s=.94, head_s_bt={'B': .95}, head_dz_bt={'B': .014}, head_wx=1.07, head_wy=.94, head_hz=1.00, head_dz=-.020, neck_k={'A': 1.10, 'B': .82},
                 stance=STANCE_2004, idle_feet=IDLE_FEET_2004, v_body={}, deltoid_k=.85, arm_aim={'LeftArm': (.46, -.07, -.88), 'LeftForeArm': (.10, -.36, -.93), 'LeftHand': (.08, -.40, -.91)}, arms=(.05, .095), hand_k={'A': .86, 'B': 1.04}, arm_in={'A': (.012, .004), 'B': (.026, .006)}, arm_ext={'B': .045}, peplum_off=.002,
                 head=HEAD_EGG, head_p=2.3, gait=GAIT_2004, goatee=GOATEE_2004)
# eyes: dark slits that still read at the game camera (the reference's are ~2 px at 240 px tall); the goatee is broad
FACE_2004 = dict(eye=(.029, 1.690, .032, .0125, .030, .0115), eye_tick=(.012, -.007, .008, .006), brow=None,
                 mouth=(1.612, 1.614, .030, .022, 0.0), ear=(.70, .004))

PROFILES = {
    # A: as close to the old client as we can build it -- its proportions, its low-poly shading (big flat panels on the
    # clothes and the face planes, smooth only across gentle curves), its motion: 8 held poses per cycle, no in-betweens
    'v4a': dict(BODY_2004, label='Option A -- closest 2004: 2004 proportions, low-poly panel shading, old-client stepped motion (8 held poses, no in-betweens)',
                sharp=36.0, face=FACE_2004,
                step={'walk': (-8, 'CONSTANT'), 'run': (-8, 'CONSTANT'), 'idle': (12, 'CONSTANT')},
                step_all=(3, 'CONSTANT'),        # every other clip: a pose every 100 ms (plus its authored keys), held
                lean=LEAN_2004, tutor_gait=TUTOR_GAIT_2004),
    # A.2 (the shipped option, owner review 2026-09-27 of the rollout): option A with smooth shading inside every colour
    # region (hard breaks only at material edges, piece rims and true creases > 80 deg -- the v2.3 lesson: fewer facets on
    # the torso and arms), form-fitting trousers, a fuller rounder skull, a walk with a real ankle roll and a calmer run
    'v4a2': dict(BODY_2004, label='Option A.2 -- closest 2004, smooth panels, form-fitting trousers, rounder skull, ankle-roll walk, calm run',
                 sharp=80.0, face=FACE_2004, head=HEAD_ROUND, head_p=2.55, head_wy=1.04, head_back_k=HEAD_BACK_K,
                 trousers='fitted', gait=GAIT_2004_2, jaw_clear=(.064, .064), hair_clear=.050, idle_feet=IDLE_FEET_2004_2, sole_k=SOLE_2004, hem_max=.044, ankle_r={'A': .047, 'B': .041}, knee_k={'A': .84, 'B': .92},
                 v_body=dict(thigh_k=.70, thigh_k_b=.76),   # (slimmer thighs: the 2004 gap from the crotch down; cloth follows)
                 step={'walk': (-8, 'CONSTANT'), 'run': (-8, 'CONSTANT'), 'idle': (12, 'CONSTANT')},
                 step_all=(3, 'CONSTANT'), lean=LEAN_2004_2, tutor_gait=TUTOR_GAIT_2004),
    # B: the same figure made softer: smooth (Gouraud-like) shading over the limbs and head, the 8 poses joined by
    # straight in-betweens (no snapping), a faint mouth line
    'v4b': dict(BODY_2004, label='Option B -- the A figure, softer: smooth shading, in-betweened motion (the 8 poses joined by straight lines)',
                sharp=65.0, face=dict(FACE_2004, mouth=(1.612, 1.614, .022, .018, .0035)),
                step={'walk': (-8, 'LINEAR'), 'run': (-8, 'LINEAR'), 'idle': (12, 'LINEAR')}),
    # C: a stylised midpoint -- the 2004 build a little softened (a touch larger head, milder V, arms a bit longer), flat
    # faceted low-poly shading, smooth eased motion, small brows
    'v4c': dict(BODY_2004, label='Option C -- stylised midpoint: 2004 build softened (larger head, milder V), flat faceted shading, smooth eased motion',
                head_s=1.05, head_s_bt={'B': .94}, head_dz=-.010, v_body={'mix': .6}, arms=(.03, .06),
                sharp=12.0, face=dict(FACE_2004, eye=(.027, 1.689, .026, .009, .024, .0085), brow=(.028, 1.707, 0.0),
                                      brow_size=((.028, .005), (.024, .004)), mouth=(1.612, 1.614, .024, .018, .004), ear=(.80, .006)),
                step={'walk': (-8, 'BEZIER'), 'run': (-8, 'BEZIER'), 'idle': (12, 'BEZIER')}, gait=GAIT_C),
}

# ---- feet (every option; owner: "the ankles/shins must blend into the feet better, especially sandals"): the upper foot
# slices turn INTO the lower-leg ring at the ankle (FOOT_BLEND), the heel sits under the back of the leg, the toe box and
# instep taper (no vertical box walls), collars / boot shafts hug the leg, and trousers end just above the foot so the hem
# hangs over the shoe instead of cutting through it.  slices: (z, y_front, y_back, half_width_outer, half_width_inner)
FOOT_SL_V4 = [(0.000, -.128, .160, .048, .044), (0.013, -.138, .168, .054, .050), (0.034, -.134, .171, .057, .053),
              (0.056, -.100, .171, .058, .054), (0.080, -.040, .170, .060, .057), (0.102, .010, .168, .061, .059),
              (0.122, .040, .167, .062, .060)]
BARE_SL_V4 = [(0.000, -.126, .158, .044, .040), (0.013, -.134, .164, .050, .045), (0.030, -.126, .167, .050, .046),
              (0.050, -.080, .168, .048, .046), (0.072, -.024, .167, .049, .047), (0.094, .018, .166, .052, .050),
              (0.114, .040, .165, .055, .054)]
ANKLE_R = {'A': .055, 'B': .047}      # lower-leg radius at the ankle (v3.1f: A .0515, B .0426 -- a thin stick)

def _feet(K):
    K.FOOT_SL[:] = FOOT_SL_V4
    K.BARE_SL[:] = BARE_SL_V4
    K.FOOT_BLEND = (.045, .001)
    for bt, k in (('A', .92), ('B', .82)):
        K.FOOT_K[bt] = k
        K.FOOT_K_LARGE[bt] = round(k * 1.12, 3)
        K.FOOT_K_SMALL[bt] = round(k * .91, 3)
    for bt in ('A', 'B'):   # the shin runs STRAIGHT from the calf (u 1.5) to a slightly thicker ankle (u 1.95): exactly
        # the 6-sided skin / trouser tube between those rings, so snug boots and collars built on the table clear it
        r15 = K.lerp_table(K.LEG_R[bt], 1.5)
        a = ANKLE_R[bt]
        ank = (a, a, a + .004)
        rows = [r for r in K.LEG_R[bt] if r[0] < 1.5] + [(1.5,) + tuple(r15)]
        for u in (1.72, 1.95, 2.0):
            t = min(1.0, (u - 1.5) / .45)
            rows.append((u,) + tuple(x + (y - x) * t for x, y in zip(r15, ank)))
        K.LEG_R[bt][:] = rows
    # boots hug the shin (a snug leather shaft, no step round a bare leg) and sit INSIDE trousers like shoes do; the
    # 6-sided trouser tube runs straight and a touch looser below the calf (its flats clear the 10-sided shoe / boot)
    K.BOOT_SHAFT = [(1.97, .005), (1.90, .005), (1.80, .005), (1.72, .005), (1.69, .006)]
    K.SHOE_COLLAR = [(1.955, .004), (1.925, .005)]
    # the 2004 trousers: roomy at the thigh, in at the knee, a little fuller over the calf, straight to the shoe
    K.TROUSERS = [(0.0, .010), (.4, .014), (.84, .016), (1.0, .014), (1.14, .017), (1.5, .013), (1.60, .015), (1.66, .016),
                  (1.80, .016), (1.90, .016), (1.955, .016), (1.985, .016)]

# v4a.2 (owner: "not form-fitting ... ours read baggy or boxy"): the cloth follows the leg -- 7-8 mm over the thigh, knee and
# calf, easing out only over the last hand-width to the shoe so the hem still hangs over it
TROUSERS_FITTED = [(0.0, .008), (.4, .008), (.84, .007), (1.0, .006), (1.14, .007), (1.5, .008), (1.60, .010), (1.66, .012),
                   (1.80, .013), (1.90, .013), (1.955, .013), (1.985, .013)]   # (from mid-shin the 6-sided tube's flats clear boot shafts)

def apply(K, name):
    if not name:
        return
    P = PROFILES[name]
    _feet(K)
    if 'v_body' in P:
        _v_body(K, **P['v_body'])
    if 'arms' in P:
        _arms(K, *P['arms'])
    K.ARM_IN.clear(); K.ARM_IN.update(P.get('arm_in', {}))
    K.ARM_EXT.clear(); K.ARM_EXT.update(P.get('arm_ext', {}))
    if 'hand_k' in P:
        K.HAND_K.update(P['hand_k'])
    for bt in ('A', 'B'):
        _torso_top(K, bt, P['shelf'][bt])
        lift, out = P['arm_lift'][bt], P['arm_out'][bt]
        x, y, z = K.ARM_TOP[bt]
        K.ARM_TOP[bt] = (x + out, y, z + lift)
        K.ARMHOLE[bt]['zc'] += lift
        (dx, dy, dz), dr = K.DELTOID[bt]
        K.DELTOID[bt] = ((dx + out, dy, dz + lift), dr * P.get('deltoid_k', 1.0))
    if 'head' in P:
        for bt in ('A', 'B'):
            K.HEAD_T[bt][:] = P['head'][bt]
        K.HEAD_P = P['head_p']
    K.HEAD_S = P['head_s']
    K.HEAD_S_BT.clear(); K.HEAD_S_BT.update(P.get('head_s_bt', {}))
    K.HEAD_DZ_BT.clear(); K.HEAD_DZ_BT.update(P.get('head_dz_bt', {}))
    K.HEAD_WX = P.get('head_wx', K.HEAD_WX)
    K.HEAD_HZ = P.get('head_hz', K.HEAD_HZ)
    K.HEAD_WY = P.get('head_wy', K.HEAD_WY)
    K.HEAD_DZ = P['head_dz']
    K.NECK_K = P['neck_k']
    K.SHARP_DEG = P['sharp']
    K.FACE.clear(); K.FACE.update(P['face'])
    K.GOATEE.clear(); K.GOATEE.update(P.get('goatee', {}))
    K.STEP_CLIPS.clear(); K.STEP_CLIPS.update(P.get('step', {}))
    K.STEP_ALL = P.get('step_all')
    K.LEAN_LIMITS.update(P.get('lean', {}))
    K.TUTOR_GAIT.clear(); K.TUTOR_GAIT.update(P.get('tutor_gait', {}))
    K.NO_REF_PANELS = True
    K.PEPLUM_OFF = P.get('peplum_off', K.PEPLUM_OFF)
    if 'arms' in P:   # the shorter 2004 arms: Bram plants his staff 4 cm closer (keeps the planted tip exact); the
        K.BRAM_STAFF['ahead'] = .26   # skill poses lean in until their tool targets are in reach
        K.REACH_ASSIST = True
    if 'arm_aim' in P:   # the 2004 ready pose: fists at the front-side of the thighs (reference: ~7 cm ahead of the hip line)
        K.IDLE_HAND_Y = (-.09, .03)
    K.SOLE_K.clear(); K.SOLE_K.update(P.get('sole_k', {}))
    K.HEM_MAX = P.get('hem_max')
    if 'hair_clear' in P:   # hair over armour / capes / amulets stands this far off the torso
        K.ARMOUR_CLEAR['Hair'] = P['hair_clear']
    if 'jaw_clear' in P:
        K.ARMOUR_CLEAR['Jaw'], K.JAW_LOW_EXTRA = P['jaw_clear']
    if P.get('ankle_r'):   # v4a.2b: slimmer 2004 shins (the feet drawn in keep a gap between the legs to the ground)
        for bt, a_ in P['ankle_r'].items():
            r15 = K.lerp_table(K.LEG_R[bt], 1.5)
            ank = (a_, a_, a_ + .004)
            rows = [r for r in K.LEG_R[bt] if r[0] <= 1.5]
            for u in (1.72, 1.95, 2.0):
                t = min(1.0, (u - 1.5) / .45)
                rows.append((u,) + tuple(x + (y - x) * t for x, y in zip(r15, ank)))
            K.LEG_R[bt][:] = rows
    for bt, kk in P.get('knee_k', {}).items():   # v4a.2b: a narrower knee side to side (the legs stay apart to the ground)
        K.LEG_R[bt][:] = [(u, rs * (1 - (1 - kk) * max(0.0, 1 - abs(u - 1.25) / .60)), rf, rb) + tuple(r_[4:])
                          for r_ in K.LEG_R[bt] for u, rs, rf, rb in [r_[:4]]]
    if P.get('trousers') == 'fitted':
        K.TROUSERS = list(TROUSERS_FITTED)
    K.HEAD_BACK_K = P.get('head_back_k', 1.0)   # (the equipment refit maps the helms onto the fuller back of the skull)
    K.GAIT.clear(); K.GAIT.update(P.get('gait', {}))
    if P.get('gait') in (GAIT_2004, GAIT_2004_2):   # the kit-metre ground speeds of the 2004 world pace (see WORLD_SCALE)
        K.GAME_WALK_SPEED, K.GAME_RUN_SPEED = round(WALK_TPS / WORLD_SCALE, 3), round(RUN_TPS / WORLD_SCALE, 3)
        K.WORLD_SCALE = WORLD_SCALE
        K.GAIT_DROP_STEPS = 32
    if 'idle_feet' in P:
        K.IDLE_FEET = P['idle_feet']
        K.SKIRT_KW = .16
    if 'stance' in P:        # idle stance: legs / spine / shoulders (Euler, over the rest skeleton)
        K.STANCE.update(P['stance'])
    if 'arm_aim' in P:       # idle arm hang (absolute directions, left side; mirrored for the right)
        for k, v in P['arm_aim'].items():
            K.STANCE_ARM_AIM[k] = v
            K.STANCE_ARM_AIM[k.replace('Left', 'Right')] = (-v[0], v[1], v[2])
        K._STANCE_LOCAL.clear()
    for tid, parts in P.get('tutor_parts', TUTOR_PARTS).items():   # Hettie: no rouge (owner: "her face isn't quite 2004")
        K.TUTORS[tid]['parts'].update(parts)
