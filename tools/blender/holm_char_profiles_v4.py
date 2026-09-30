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

# ---- review 5 (owner 2026-09-28) -- walk / run / idle OPTIONS, each a named clip variant (walk_A, run_B, idle_C ...) in a
# companion GLB (build_holm_characters_v2.py --gait-options; the kit's own idle / walk / run stay the shipped default until the
# owner picks). The owner: "the running ... leaning a little too far forward"; walking "the shoulders stay in the same place,
# the arms move back and forth, the legs don't reach too far in front ... but they trail behind"; running "a pretty realistic
# run ... somebody running through the woods"; "even the standing position ... we want ours to be very similar".
# The 2004 numbers these aim at (tools/ref2004/gait_metrics.py on the man's side strips, one median per held pose; fractions
# of the standing height H): WALK head bob 2.3 % (ours v4a.2b 5.3), legs ahead of the hips 0.22 H at the contact pose / 0.14 H
# averaged over the 8 poses (ours 0.33 / 0.21), behind 0.26 / 0.20 (ours 0.31 / 0.21), silhouette lean 5.6 deg (6.4), head
# 0.06 H ahead of the hips (0.10), face level (ours looks ~17 deg down). RUN bob 3.4 %, legs ahead 0.35 / 0.21, behind 0.32 /
# 0.25, hands 0.40 H ahead (ours 0.35), lean 14.5 (14.6) -- but the 2004 runner is airborne between steps (the back leg
# swings up straight behind, the shin lifts level behind the stance leg) with the head up, while ours keeps both feet low in a
# crouch with the chest and head pitched down (spine chain 26 deg + head). IDLE the 2004 legs stand apart (a 0.075 H gap
# between the shins; ours 0.01), the arms hang off the body (0.05 H gap at the wrist; ours 0.02), the feet staggered heel to
# toe 0.29 H (ours 0.26), the face level (ours looks down).
# Every option is our own motion, authored with the kit's gait machinery; only those numbers are targets.
_WALK_LEVEL = dict(bob=.020, face=0.0, twist=1.0)   # steady shoulders: head bob ~2 % H, no twist, the face level (eyes ahead, not down)
_ARMS_OUT = {'LeftArm': (.50, -.04, -.87), 'LeftForeArm': (.23, -.26, -.94), 'LeftHand': (.19, -.32, -.93)}   # the 2004 hang: off the body
# (every option keeps the stance's neck carry: carrying the head further forward put the neck through amulets and the hair
# through capes in the equipment fit check; the arms swing 6 deg clear of the hips so a kiteshield or a held tool passes the
# thigh; the run's arms stay near the shipped carry so armour sleeves keep covering the elbows)
GAIT_OPTIONS = {
    'walk': {
        'A': dict(label='Walk A -- steady shoulders', gait=dict(_WALK_LEVEL, lean_cap=(11.0, False), bob=.028, front_q=.2, osrs=(10.0, 0.0, 8.0)),
                  note='The shipped walk with the upper body calmed: the head bob down from 5 to 3 % of height, no shoulder twist, '
                       'the face lifted (14 deg down, was 19), the arms a touch clear of the hips. The legs and the lean are the '
                       'shipped ones.'),
        'B': dict(label='Walk B -- shorter reach', gait=dict(_WALK_LEVEL, lean_cap=(8.0, False), plant_k=.62, duty=.50, front_q=0.0,
                                                            swing_y=(.30, .92), lift=.07, lift_skew=.50, kick=.10, p_on=16, p_off=-36,
                                                            osrs=(8.0, 8.0, 6.0), arm_swing=32),
                  note='Steady shoulders (head bob 2.2 % of height, was 5), the back a little straighter (8 deg, was 11) and the '
                       'face lifted (10 deg down, was 19); the legs re-timed toward 2004: the front foot lands close under the body '
                       'and nearly flat, the planted foot sweeps back about 60 % of the ground covered (2004 feet slide the same '
                       'way), the back leg trails with the heel up and the toe low, then swings through late. Arms +-32 deg, elbows '
                       'a little bent.'),
        'C': dict(label='Walk C -- 2004 trailing legs', gait=dict(_WALK_LEVEL, lean_cap=(8.0, False), plant_k=.55, duty=.48, front_q=0.0,
                                                                 swing_y=(.40, .95), lift=.08, lift_skew=.50, kick=.18, p_on=16, p_off=-42,
                                                                 osrs=(8.0, 10.0, 6.0), arm_swing=36),
                  note='B pushed further, the closest to the 2004 numbers: the front foot lands right under the hips and the back '
                       'leg stays behind longest, toe near the ground and heel up, before it swings through; a slightly bigger arm '
                       'swing.'),
    },
    'run': {
        'A': dict(label='Run A -- upright natural run', gait=dict(lean_cap=(12.0, False), lean_osc=4.0, hips_pitch=4.0, chest=4.0, face=4.0,
                                                                  lift=.34, lift_skew=.6, kick=.20, trail=(.45, 24.0), swing_y=(.24, .86),
                                                                  arm_swing=40, fore=84, arm_bias=8.0, arm_out=12.0, fore_swing=10, bob=.030, front_fix=.36),
                  note='A realistic run with about half the lean (spine 12 deg on average, was 26), the face lifted (11 deg down, '
                       'was 28), the arms pumping at the sides with the elbows near a right angle, and real flight: the back leg '
                       'lifts clear behind and the heel comes up under the hips before the knee drives through.'),
        'B': dict(label='Run B -- 2004 lean, straight back', gait=dict(lean_cap=(20.0, False), lean_osc=5.0, hips_pitch=8.0, chest=8.0, face=6.0,
                                                                       lift=.30, lift_skew=.6, kick=.22, trail=(.45, 26.0), swing_y=(.26, .86),
                                                                       arm_swing=42, fore=84, arm_bias=6.0, arm_out=10.0, fore_swing=10, bob=.026, front_fix=.42),
                  step=([0, 3, 5, 8, 10, 13, 15, 18], 'CONSTANT'),
                  note='Close to the 2004 amount of lean (spine 20 deg, dipping to 25 on each long stride and easing to 15 between, '
                       'as 2004 does) but from a straight back with the face lifted (17 deg down, was 28) -- not hunched -- the '
                       'fists carried a little forward, a long reach to the front foot, the back leg straight out behind on the '
                       'stride pose and the shin level behind the stance leg a beat later; the two stride poses are held a frame '
                       'longer, as 2004 holds them.'),
        'C': dict(label='Run C -- light jog', gait=dict(lean_cap=(6.0, False), hips_pitch=2.0, chest=2.0, face=2.0,
                                                        lift=.26, lift_skew=.7, kick=.18, trail=(.40, 18.0), swing_y=(.16, .86),
                                                        arm_swing=38, fore=84, arm_bias=0.0, arm_out=10.0, bob=.035, front_fix=.32),
                  note='The most upright: spine 6 deg, face 5 deg down, a lighter jog with a smaller back kick.'),
    },
    'idle': {
        'A': dict(label='Idle A -- 2004 stand', idle=dict(feet={'Left': (.125, .22), 'Right': (-.125, -.06), 'drop': .016, 'toe': 8.0},
                                                          neck=None, face=0.0, lean=5.0, arms=_ARMS_OUT),
                  note='Legs apart at hip width with a clear gap between them, the left foot a step back and the toes turned out, '
                       'the arms hanging off the body with the fists at the front of the thighs, the body tipped 5 deg forward with '
                       'the face lifted (6 deg down, was 11).'),
        'B': dict(label='Idle B -- square stand', idle=dict(feet={'Left': (.125, .03), 'Right': (-.125, .01), 'drop': .004, 'toe': 8.0},
                                                            neck=None, face=0.0, lean=5.0, arms=_ARMS_OUT),
                  note='As A but the feet side by side (no step back) -- to see whether the staggered feet matter.'),
        'C': dict(label='Idle C -- shipped feet, head up, arms out', idle=dict(feet=None, neck=None, face=0.0, lean=0.0, arms=_ARMS_OUT),
                  note='The smallest change: the shipped stance and feet, only the face lifted level and the arms hung off the body.'),
    },
}

# ---- review 5, ROUND 2 (owner, after the round-1 page): WALK "the arms are swinging too much ... too forced"; "head movement
# looks OK"; "tilted forward a little bit" -> upright; "knees bent the entire time ... not straightening out his leg when he
# extends it forward" -> the leading leg straight at and just before the heel strike, the stance leg straight under the body at
# mid-stance; "rolling his feet just a little bit, very gradually" -> a gradual heel-to-toe roll; "a little bit of forward and
# back shoulder movement when the arms are moving, very gentle" -> a gentle shoulder counter-rotation. RUN "doesn't ever fully
# extend his legs" -> full extension behind at toe-off and the leading leg reaching out straight before it lands; "basically the
# same animation as the walking" -> a real run: both feet off the ground, a high knee drive, the heel kicking back after the
# toe-off, arms bent ~90 deg pumping from the shoulder, a modest lean from the ankles (hips and back in one line), not stooped.
# New letters D / E / F (round 1's A / B / C stay in the GLB for reference). swing_path = the swinging ankle's route relative to
# the hips (sw, metres behind, height); foot_roll = (toe-up heel strike eased flat by, heel lifts from) as stance fractions.
_W2 = dict(lean_cap=(1.5, False), face=0.0, bob=.014, duty=.56, foot_roll=(.25, .5), swing_pitch=(.10, .62), front_q=0.0)
_R2 = dict(trail=None, chest=0.0, lean=0.0, lean_osc=0.0, bob_phase=.16, swing_pitch=(.10, .90), p_on=8, arm_out=10.0)
GAIT_OPTIONS_R2 = {
    'walk': {
        'D': dict(label='Walk D -- relaxed', gait=dict(_W2, twist=3.0, plant_k=.62, front_fix=.28, p_on=18, p_off=-30,
                                                       swing_path=[(.25, .20, .24), (.50, 0.0, .20), (.78, -.24, .16), (.92, -.29, .145)],
                                                       osrs=(6.0, 2.0, 6.0), arm_swing=14, fore_swing=6, arm_bias=-4.0),
                  note='Upright, the arms hanging loose (elbows barely bent) with a small relaxed swing (+-14 deg), the shoulders turning gently against '
                       'the hips (about 2 deg), the head as in round 1. The leading leg straightens before the heel lands (knee '
                       '7 deg), the foot rolls slowly heel to toe, and the stance leg is straight under the body (4 deg).'),
        'E': dict(label='Walk E -- natural', gait=dict(_W2, twist=4.0, bob=.018, plant_k=.62, front_fix=.30, p_on=20, p_off=-34,
                                                       swing_path=[(.25, .20, .24), (.50, 0.0, .20), (.78, -.26, .155), (.92, -.31, .14)],
                                                       osrs=(6.0, 4.0, 6.0), arm_swing=20, fore_swing=10, arm_bias=-4.0),
                  note='A little more of everything than D: arms +-20 deg, the forward hand bending a touch at the elbow, a '
                       'slightly longer step with a fuller heel-to-toe roll, the shoulders turning about 3 deg. Legs straight at the '
                       'heel strike and under the body.'),
        'F': dict(label='Walk F -- 2004 step', gait=dict(_W2, twist=3.0, bob=.014, plant_k=.62, front_fix=.27, p_on=14, p_off=-34,
                                                         swing_path=[(.28, .25, .22), (.52, .02, .19), (.80, -.23, .15), (.92, -.28, .142)],
                                                         osrs=(6.0, 3.0, 6.0), arm_swing=17, fore_swing=6, arm_bias=-4.0),
                  note='The 2004 foot timing: the back foot stays behind longer after it leaves the ground (the trailing leg), then '
                       'swings through on the same straight-legged step; a gentler toe-up at the heel strike; arms +-17 deg.'),
    },
    'run': {
        'D': dict(label='Run D -- easy run', gait=dict(_R2, lean_cap=(7.0, False), hips_pitch=3.0, face=7.0, bob=.018, duty=.34, plant_k=.9,
                                                       p_off=-36, front_fix=.24, swing_path=[(.28, .22, .46), (.58, -.08, .42), (.84, -.40, .21)],
                                                       arm_swing=40, fore=100, fore_swing=6, arm_bias=6.0),
                  note='A light run: both feet leave the ground, the back leg pushes off fully straight, the heel kicks up behind, the '
                       'knee comes through to about 60 deg and the leg reaches out straight before it lands; arms bent near 90 deg, '
                       'pumping +-40 deg from the shoulder; a modest 7 deg lean with the back straight (was a 26 deg stoop).'),
        'E': dict(label='Run E -- woods run', gait=dict(_R2, lean_cap=(9.0, False), hips_pitch=4.0, face=9.0, bob=.02, duty=.34, plant_k=.9,
                                                        p_off=-36, front_fix=.24, swing_path=[(.28, .24, .52), (.58, -.10, .46), (.84, -.40, .22)],
                                                        arm_swing=48, fore=100, fore_swing=8, arm_bias=6.0, arm_out=13.0),
                  note='The owner\'s "somebody running through the woods": a stronger version of D -- higher heel kick, the knee '
                       'driving to about 70 deg, a longer reach before landing, arms pumping +-48 deg; lean 9 deg, the back straight.'),
        'F': dict(label='Run F -- 2004 run', gait=dict(_R2, lean_cap=(12.0, False), hips_pitch=5.0, face=12.0, bob=.022, duty=.34, plant_k=.92,
                                                       p_off=-36, front_fix=.24, swing_path=[(.28, .25, .50), (.58, -.12, .46), (.85, -.45, .20)],
                                                       arm_swing=50, fore=100, fore_swing=8, arm_bias=10.0, arm_out=13.0),
                  step=([0, 3, 5, 8, 10, 13, 15, 18], 'CONSTANT'),
                  note='E with more of the 2004 lean (12 deg, the back straight) and the fists carried a little further '
                       'forward; the two long stride poses are held a frame longer, as 2004 holds them.'),
    },
}
for _k in ('walk', 'run'):
    GAIT_OPTIONS[_k].update(GAIT_OPTIONS_R2[_k])

# ---- review 5, ROUND 3 (owner 2026-09-29): WALK "looks good ... may lean forward a little bit too much still ... not as casual
# of a stroll as I would want ... more like Conor McGregor" -> a relaxed, confident upright strut: torso upright or a hair back,
# shoulders back and open, chest up, arms carried a little away from the body, an easy rhythm with a touch of swagger. RUN "leaning
# forward way too much ... doesn't look calm ... more like a light jog" -> near upright, a short easy stride, low knee lift, relaxed
# bent arms close to the body, a gentle bounce. G / H keep round 2's straight-legged, heel-to-toe step (the owner: "the walk looks
# good"). base = extra stance deltas: Spine2 back = the chest up; the shoulder bones turned back = the shoulders open.
_OPEN = {'Spine2': (-4.0, 0, 0), 'LeftShoulder': (0, 0, 6.0), 'RightShoulder': (0, 0, -6.0)}
GAIT_OPTIONS_R3 = {
    'walk': {
        'G': dict(label='Walk G -- strut', gait=dict(_W2, lean_cap=(-1.5, False), base=_OPEN, neck=5.0, twist=3.5, bob=.012, sway=.018, roll=3.0,
                                                     plant_k=.62, front_fix=.30, p_on=18, p_off=-30,
                                                     swing_path=[(.25, .20, .24), (.50, 0.0, .20), (.78, -.25, .155), (.92, -.30, .142)],
                                                     osrs=(6.0, 8.0, 10.0), arm_swing=16, fore_swing=6, arm_bias=-2.0),
                  note='A relaxed, confident strut: the back upright and a hair behind vertical, the chest up and the shoulders open, '
                       'the head over the shoulders, the arms carried a little away from the body with an easy +-16 deg swing and a '
                       'slight elbow bend, a touch of hip swagger and shoulder turn. Round 2\'s straight-legged heel-to-toe step.'),
        'H': dict(label='Walk H -- casual stroll', gait=dict(_W2, lean_cap=(0.0, False), base={'LeftShoulder': (0, 0, 3.0), 'RightShoulder': (0, 0, -3.0)},
                                                             neck=7.0, twist=2.5, bob=.010, sway=.012, roll=2.0, plant_k=.58, front_fix=.26, p_on=16, p_off=-28,
                                                             swing_path=[(.25, .19, .22), (.50, 0.0, .19), (.78, -.22, .155), (.92, -.27, .14)],
                                                             osrs=(6.0, 6.0, 7.0), arm_swing=12, fore_swing=4, arm_bias=-2.0),
                  note='An unhurried stroll: upright, loose shoulders, the arms hanging easy with a small +-12 deg swing, a slightly '
                       'shorter reach, a gentle sway -- the least effort of the walks.'),
    },
    'run': {
        'G': dict(label='Run G -- light jog', gait=dict(_R2, lean_cap=(2.0, False), hips_pitch=1.0, face=2.0, bob=.014, duty=.38, plant_k=.62,
                                                        p_off=-26, front_fix=.18, swing_path=[(.30, .16, .30), (.60, -.06, .30), (.86, -.26, .17)],
                                                        arm_swing=26, fore=100, fore_swing=4, arm_bias=2.0, arm_out=10.0),
                  note='A calm light jog: nearly upright (2 deg), a short easy stride with the feet low -- a small heel kick and a low '
                       'knee -- a brief float between steps, the arms bent near 90 deg and kept close, pumping an easy +-26 deg, a '
                       'gentle bounce.'),
        'H': dict(label='Run H -- easy jog', gait=dict(_R2, lean_cap=(4.0, False), hips_pitch=2.0, face=4.0, bob=.018, duty=.36, plant_k=.75,
                                                       p_off=-30, front_fix=.22, swing_path=[(.28, .19, .34), (.58, -.08, .32), (.85, -.33, .19)],
                                                       arm_swing=32, fore=96, fore_swing=6, arm_bias=3.0, arm_out=10.0),
                  note='G with a little more going on: 4 deg of lean, a slightly higher knee and heel, arms +-32 deg -- still calm.'),
    },
}
for _k in ('walk', 'run'):
    GAIT_OPTIONS[_k].update(GAIT_OPTIONS_R3[_k])

# ---- review 5, ROUND 4 (owner 2026-09-30: "we really need to get the running animation locked in") -- the NEW SHIPPED walk and
# run (the kit's own clips); every earlier option stays in the gaits GLB as authored (GAIT_OPT_BASE / GAIT_OPT_STEP), and the
# v4a.2b clips they replace are kept as walk_S / run_S.
# RUN: "the ankles aren't really rotating; we don't have a nice pace; we're not getting the left and right torso twist";
# "leaning forward way too much ... like they're hunched over ... can't be folded over like a V; it needs to be straightened
# out. A casual run." -> the lean comes from the ankles: pelvis and torso tilt together 7 deg (hips_pitch = the chain lean, no
# fold at the hip: the torso lines up with the stance leg at mid-stance, -7 deg, and folds only 21 deg at the landing where the
# v4a.2b run folded 47); the foot lands flat-ish (toes 8 up) just ahead of the hips and rolls through to a full push off the
# toes (-48 deg), the ankle then hangs pointed and flexes up before the next landing (ankle 24 deg pointed .. 26 flexed against
# the shin); the pelvis turns 6 deg with the forward leg and the chest 10 deg the other way with the forward arm (16 deg of
# shoulder-line turn against the hips; the head takes back 70 % of the chest's turn, so the face stays nearly ahead and the
# neck -- and long hair gathered under a cape -- keeps with the shoulders); a natural 180 steps a minute (20 frames = the 2004 cycle, 0.66 s)
# with a 30 % float, a gentle bounce (1.7 % of height), the heel coming up behind to about knee height, the elbows bent ~80-95
# deg swinging +-30 deg from the shoulder and a little in toward the body on the way forward. Slide-free at 3.33 tiles/s. The
# 8 held poses sit on the moments that read: landing, mid-stance, push-off, float (frames 0 3 6 8 | 10 13 16 18).
# WALK: "very slightly turn their torso when swinging their arms ... more of a casual walk. The slight head bob"; "leaning back
# a little bit; they need to be tilted forward just slightly" -> round 3's G/H walk tipped 2.5 deg FORWARD (not back), the
# shoulders turning 4 deg against a 3 deg pelvis turn, a slight head bob (2.8 % of height; 2004 2.3, v4a.2b 5.0), straight legs
# at the heel strike and mid-stance (knees 4 deg) bending only at the push-off. Slide-free at 1.67 tiles/s: 26 frames (0.87 s,
# 138 steps a minute; 2004 0.92 s) for a 0.87 m step.
_RUN_R4 = dict(frames=20, duty=.34, drop=.02, bob=.016, bob_phase=.17, front_fix=.22, p_on=8, p_off=-48, foot_roll=(.18, .42),
               swing_path=[(.10, .62, .25), (.25, .50, .42), (.45, .22, .48), (.65, -.08, .40), (.82, -.30, .22)],
               swing_rel=[(0, -20), (.3, -25), (.55, -10), (.8, 6), (1, 8)], toe_follow=.8, kick=0.0, lift=0.0, twist=0.0,
               twist2=(6.0, 10.0), lean=0.0, hips_pitch=7.0, lean_cap=(7.0, False), face=4.0, arm_swing=30, arm_bias=3.0,
               fore=88, fore_swing=0, fore_path=[(0, 78), (.5, 96), (1, 78)], arm_out=8.0, arm_in=10.0, foot_x=.12, plant_k=1.0)
_WALK_R4 = dict(GAIT_2004_2['walk'], frames=26, lean_cap=(2.5, False), face=0.0, bob=.026, bob_phase=0.0, duty=.52, foot_roll=(.25, .5),
                swing_pitch=(.10, .62), front_q=0.0, twist=0.0, twist2=(3.0, 4.0), sway=.012, roll=2.0, plant_k=1.0, front_fix=.38,
                p_on=18, p_off=-30, swing_path=[(.25, .28, .22), (.5, 0.0, .19), (.78, -.33, .155), (.92, -.41, .142)],
                osrs=(6.0, 8.0, 8.0), arm_swing=16, fore_swing=6, arm_bias=-2.0)
GAIT_2004_R4 = {'walk': _WALK_R4, 'run': _RUN_R4}
STEP_R4 = {'walk': (-8, 'CONSTANT'), 'run': ([0, 3, 6, 8, 10, 13, 16, 18], 'CONSTANT'), 'idle': (12, 'CONSTANT')}
GAIT_OPTIONS_R4 = {
    'walk': {
        'S': dict(label='Walk S -- v4a.2b (shipped until round 4)', fresh=True, gait=dict(GAIT_2004_2['walk']), step=(-8, 'CONSTANT'),
                  note='The walk the game shipped before round 4: 11 deg lean, the face 19 deg down, a 5 % head bob.'),
        'K': dict(label='Walk K -- round 4, a touch more', fresh=True, gait=dict(_WALK_R4, lean_cap=(4.0, False), twist2=(4.0, 6.0), bob=.028, arm_swing=18),
                  step=(-8, 'CONSTANT'), note='The new walk with a little more of each: 4 deg forward, the shoulders turning 6 deg, arms +-18.'),
    },
    'run': {
        'S': dict(label='Run S -- v4a.2b (shipped until round 4)', fresh=True, gait=dict(GAIT_2004_2['run']), step=(-8, 'CONSTANT'),
                  note='The run the game shipped before round 4: the 26 deg stoop with the hips folded.'),
        'K': dict(label='Run K -- round 4, more lean', fresh=True, step=STEP_R4['run'],
                  gait=dict(_RUN_R4, hips_pitch=9.0, lean_cap=(10.0, False), face=6.0, front_fix=.20, arm_swing=32),
                  note='The new run leaning 10 deg from the ankles (still straight, no fold), a little more drive in the arms (+-32).'),
        'L': dict(label='Run L -- round 4, lighter', fresh=True, step=STEP_R4['run'],
                  gait=dict(_RUN_R4, hips_pitch=5.0, lean_cap=(5.0, False), face=3.0, bob=.014,
                            swing_path=[(.10, .60, .23), (.25, .48, .36), (.45, .22, .42), (.65, -.06, .36), (.82, -.28, .21)]),
                  note='The new run lighter: 5 deg, a lower heel and knee, a softer bounce.'),
    },
}
for _k in ('walk', 'run'):
    GAIT_OPTIONS[_k].update(GAIT_OPTIONS_R4[_k])
# BODY (owner round 4): "the top of the neck underneath the head, sticking out" -> the neck tucks into the skull (NECK_TUCK);
# "the feet, ankles or boots stick through the legs ... not much bend out of the ankle" -> trousers and bare shins take the
# feet's own ankle band, narrowed to 10.5-15 cm (LEG_ANKLE_Z, ANKLE_BLEND): hem and shoe collar bend together on a crisp ankle;
# "not much of a buttocks; we need just a little" -> SEAT: the back of the pelvis and the top of the thighs a little fuller;
# the woman's feet "disconnect from her legs when running" in the long skirt -> the hem follows the shins (SKIRT_SHIN) and
# her shins run up under it to the knee
SEAT_R4 = {'A': (.030, .020), 'B': (.030, .020)}   # (m at the fullest point: pelvis back, thigh back)

def _seat(K, seat):
    for bt, (sp, st) in seat.items():
        zc = .888 if bt == 'A' else .878
        K.PELVIS[bt][:] = [(r[0], r[1], r[2], r[3] + sp * max(0.0, 1 - abs(r[0] - zc) / .075)) + tuple(r[4:]) for r in K.PELVIS[bt]]
        K.LEG_R[bt][:] = [(r[0], r[1], r[2], r[3] + st * max(0.0, 1 - abs(r[0] - .15) / .25)) + tuple(r[4:]) for r in K.LEG_R[bt]]

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
                 trousers='fitted', gait=GAIT_2004_R4, jaw_clear=(.064, .064), hair_clear=.050, idle_feet=IDLE_FEET_2004_2, sole_k=SOLE_2004, hem_max=.044, ankle_r={'A': .047, 'B': .041}, knee_k={'A': .84, 'B': .92},
                 v_body=dict(thigh_k=.70, thigh_k_b=.76),   # (slimmer thighs: the 2004 gap from the crotch down; cloth follows)
                 step=STEP_R4,   # (round 4: the run holds its landing / mid-stance / push-off / float poses)
                 gait_opt_base=GAIT_2004_2, gait_opt_step={'walk': (-8, 'CONSTANT'), 'run': (-8, 'CONSTANT')},
                 neck_tuck=True, ankle_blend=(.105, .15), leg_ankle_z=True, seat=SEAT_R4, skirt_shin=1.0,   # round 4 body
                 robe_r4=True, tutor_hold_r4=True, skill_r4=True,   # review 9: Ansel's robe and book, Durgin's pick arm, the strokes
                 step_all=(3, 'CONSTANT'), lean=LEAN_2004_2, tutor_gait=TUTOR_GAIT_2004),
    # review 5 round 2 MESH options on A.2 (the owner, side by side with 2004: "looks too polished and round"):
    # mc = the shipped mesh with creases every 36 deg (the flat panels of option A, as 2004's facets); mb = squarer torso
    # (superellipse 2.3 -> 3.0, corners kept), fuller thigh caps, plain trousers tucked into one-piece boots, creases at 30 deg
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

PROFILES['v4a2_mc'] = dict(PROFILES['v4a2'], label='A.2 mesh C -- the shipped mesh with a crease wherever the surface turns more than 36 deg', sharp=36.0)
PROFILES['v4a2_mb'] = dict(PROFILES['v4a2'], label='A.2 mesh B -- squarer torso, fuller thigh caps, trousers tucked into one-piece boots, creases at 30 deg',
                           sharp=30.0, torso_p=3.0, thigh_cap=.07, trouser_tuck=1.70,
                           boot_shaft=[(1.97, .012), (1.90, .013), (1.80, .016), (1.72, .020), (1.64, .021), (1.62, .022)])

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

def _mesh_option(K, P):
    """review 5 round 2 (owner: 2004 shows more flat planes, an almost rectangular torso, good-size thigh caps blending into
    the waist, boots and ankle one solid piece): torso_p = the torso's superellipse exponent (squarer cross-section) with
    the radii scaled so the 45-degree corners stay where they were (armour built on the shipped body still covers it);
    thigh_cap = the top of the thighs and the bottom of the pelvis this much fuller; trouser_tuck = the plain trousers end
    here (leg u) and the boots rise over them as one solid shaft (boot_shaft)"""
    if P.get('torso_p'):
        p0, p1 = K.TORSO_P, P['torso_p']
        diag = lambda p_: (2 * math.cos(math.pi / 4) ** p_) ** (-1.0 / p_)
        k = diag(p0) / diag(p1)
        for bt in ('A', 'B'):
            K.TORSO[bt][:] = [(r[0], r[1] * k, r[2] * k, r[3] * k) + tuple(r[4:]) for r in K.TORSO[bt]]
        K.TORSO_P = p1
        for fn in (K.body_ring, K.body_point):   # (their p defaults were bound when the module loaded)
            fn.__defaults__ = tuple(p1 if (isinstance(d, float) and abs(d - p0) < 1e-9) else d for d in fn.__defaults__)
    if P.get('thigh_cap'):
        tk = P['thigh_cap']
        for bt in ('A', 'B'):
            K.LEG_R[bt][:] = [(u, rs * (1 + tk * max(0.0, 1 - u / .45)), rf * (1 + tk * max(0.0, 1 - u / .45)), rb * (1 + tk * max(0.0, 1 - u / .45))) + tuple(r_[4:])
                              for r_ in K.LEG_R[bt] for u, rs, rf, rb in [r_[:4]]]
            K.PELVIS[bt][:] = [(z, rx * (1 + tk * .6 * max(0.0, 1 - (z - .86) / .12)), rf, rb) + tuple(r_[4:])
                               for r_ in K.PELVIS[bt] for z, rx, rf, rb in [r_[:4]]]
    if P.get('trouser_tuck'):
        u_end = P['trouser_tuck']
        K.TROUSERS = [r for r in K.TROUSERS if r[0] <= u_end]
    if P.get('boot_shaft'):
        K.BOOT_SHAFT = list(P['boot_shaft'])

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
    if P.get('gait') in (GAIT_2004, GAIT_2004_2, GAIT_2004_R4):   # the kit-metre ground speeds of the 2004 world pace (see WORLD_SCALE)
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
    K.GAIT_OPTIONS.clear(); K.GAIT_OPTIONS.update(GAIT_OPTIONS if name == 'v4a2' else {})   # review 5: the walk / run / idle options
    K.GAIT_OPT_BASE.clear(); K.GAIT_OPT_BASE.update(P.get('gait_opt_base', {}))   # round 4: the gait the options were authored on
    K.GAIT_OPT_STEP.clear(); K.GAIT_OPT_STEP.update(P.get('gait_opt_step', {}))
    # round 4 body: neck tucked into the skull, the shared ankle band, the seat, long hems following the shins
    K.NECK_TUCK = bool(P.get('neck_tuck'))
    if P.get('ankle_blend'):
        K.ANKLE_BLEND = tuple(P['ankle_blend'])
    K.LEG_ANKLE_Z = bool(P.get('leg_ankle_z'))
    K.SKIRT_SHIN = P.get('skirt_shin', 0.0)
    K.ROBE_R4 = bool(P.get('robe_r4'))
    K.TUTOR_HOLD_R4 = bool(P.get('tutor_hold_r4'))
    K.SKILL_R4 = bool(P.get('skill_r4'))
    if P.get('seat'):
        _seat(K, P['seat'])
    _mesh_option(K, P)   # review 5 round 2: the mesh options (squarer torso, thigh caps, tucked trousers + one-piece boots)
    for tid, parts in P.get('tutor_parts', TUTOR_PARTS).items():   # Hettie: no rouge (owner: "her face isn't quite 2004")
        K.TUTORS[tid]['parts'].update(parts)
