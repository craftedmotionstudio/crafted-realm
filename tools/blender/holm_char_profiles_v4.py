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
    'A': [(1.380, .197, .126, .117), (1.420, .201, .118, .112), (1.452, .200, .108, .104), (1.472, .190, .094, .092),
          (1.486, .160, .080, .080), (1.494, .110, .068, .070), (1.500, .072, .062, .064)],
    'B': [(1.385, .162, .110, .106), (1.418, .164, .102, .099), (1.446, .162, .092, .090), (1.464, .152, .080, .080),
          (1.478, .124, .069, .070), (1.486, .084, .060, .062), (1.492, .062, .058, .060)],
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
HEAD_EGG = {
    'A': [(1.548, .036, .044, .036, 0.0), (1.566, .056, .062, .048, .15), (1.588, .068, .074, .058, .11), (1.628, .079, .084, .080, .05),
          (1.665, .085, .088, .092, 0.0), (1.720, .086, .086, .098, 0.0), (1.770, .080, .078, .094, 0.0), (1.800, .068, .062, .080, 0.0),
          (1.818, .047, .040, .056, 0.0), (1.824, .020, .016, .022, 0.0)],
}
HEAD_EGG['B'] = [(1.554, .032, .040, .032, 0.0), (1.572, .052, .060, .044, .17), (1.592, .064, .072, .054, .12),
                 (1.630, .076, .084, .078, .05)] + HEAD_EGG['A'][4:]

# the 2004 idle (measured on the reference front views): legs nearly parallel and close under narrow hips
STANCE_2004 = {'LeftUpLeg': (-5.5, -1, 1.5), 'RightUpLeg': (-5.5, 1, -1.5)}

# the 2004 man's V: broad square shoulders over a narrow waist at the belt and slim hips (body A, z < 1.38; final values)
V_TORSO_A = [(0.940, .138, .1232, .1210, .026), (1.000, .136, .1210, .1166, .022), (1.080, .152, .1276, .1166, .018),
             (1.160, .166, .1386, .1188, .014), (1.240, .174, .1452, .1232, .010), (1.315, .182, .1408, .1232, .008)]
V_PELVIS_A = [(0.790, .110, .0691, .0734, .030), (0.850, .168, .1037, .1123, .028), (0.930, .160, .1145, .1231, .026),
              (0.985, .142, .1166, .1188, .024), (1.012, .137, .1166, .1145, .022)]

def _v_body(K, thigh_k=.85, hip_x=.092):
    K.TORSO['A'][:] = V_TORSO_A + [r for r in K.TORSO['A'] if r[0] >= 1.38 - 1e-6]
    K.PELVIS['A'][:] = V_PELVIS_A
    K.LEG_R['A'][:] = [(u, rs * (thigh_k + (1 - thigh_k) * K.ss(.8, 1.2, u)), rf, rb) for u, rs, rf, rb in K.LEG_R['A']]
    K.HIP_X['A'] = hip_x

TUTOR_PARTS = {'hettie': {'Makeup': 1}}

PROFILES = {
    'v4a': dict(label='Option A -- closest 2004: level shoulders, small head on a visible neck, flat faceted shading, stepped motion',
                shelf=SHELF_SQ, arm_lift={'A': .066, 'B': .040}, arm_out={'A': .016, 'B': .008},
                head_s=1.08, head_wx=1.07, head_hz=1.00, head_dz=0.0, neck_k=1.10, sharp=12.0, stance=STANCE_2004, v_body={},
                head=HEAD_EGG, head_p=2.3,
                face=dict(eye=(.0275, 1.690, .026, .0055, .024, .0050), eye_tick=(.010, -.004, .006, .0045), brow=None,
                          mouth=(1.612, 1.614, .030, .022, 0.0), ear=(.70, .004)),
                step={'walk': (3, 'CONSTANT'), 'run': (2, 'CONSTANT'), 'idle': (20, 'CONSTANT')}),
    'v4b': dict(label='Option B -- the v4a body with softer shading, held poses joined by straight lines',
                shelf=SHELF_SQ, arm_lift={'A': .046, 'B': .040}, arm_out={'A': .010, 'B': .008},
                head_s=1.08, head_wx=1.07, head_hz=1.00, head_dz=0.0, neck_k=1.10, sharp=36.0, stance=STANCE_2004, v_body={},
                head=HEAD_EGG, head_p=2.3,
                face=dict(eye=(.0275, 1.690, .026, .0060, .024, .0055), eye_tick=(.010, -.004, .006, .0045), brow=None,
                          mouth=(1.612, 1.614, .022, .018, .0035), ear=(.70, .004)),
                step={'walk': (3, 'LINEAR'), 'run': (2, 'LINEAR'), 'idle': (15, 'LINEAR')}),
    'v4c': dict(label='Option C -- stylised midpoint: a touch larger head, gentler shoulder shelf, soft shading, fewer-key smooth motion',
                shelf=SHELF_C, arm_lift={'A': .020, 'B': .018}, arm_out={'A': .004, 'B': .004},
                head_s=1.02, head_dz=-.006, neck_k=1.05, sharp=40.0,
                head=HEAD_EGG, head_p=2.5,
                face=dict(eye=(.027, 1.689, .022, .009, .021, .009), brow=(.028, 1.707, 0.0), brow_size=((.028, .005), (.024, .004)),
                          mouth=(1.612, 1.614, .024, .018, .004), ear=(.80, .007)),
                step={'walk': (3, 'BEZIER'), 'run': (2, 'BEZIER')}),
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
    K.TROUSERS = [(u, .010) for u in K.U_LEG[:-1]] + [(1.60, .014), (1.66, .016), (1.80, .016), (1.90, .016), (1.955, .016), (1.985, .016)]

def apply(K, name):
    if not name:
        return
    P = PROFILES[name]
    _feet(K)
    if 'v_body' in P:
        _v_body(K, **P['v_body'])
    for bt in ('A', 'B'):
        _torso_top(K, bt, P['shelf'][bt])
        lift, out = P['arm_lift'][bt], P['arm_out'][bt]
        x, y, z = K.ARM_TOP[bt]
        K.ARM_TOP[bt] = (x + out, y, z + lift)
        K.ARMHOLE[bt]['zc'] += lift
        (dx, dy, dz), dr = K.DELTOID[bt]
        K.DELTOID[bt] = ((dx + out, dy, dz + lift), dr)
    if 'head' in P:
        for bt in ('A', 'B'):
            K.HEAD_T[bt][:] = P['head'][bt]
        K.HEAD_P = P['head_p']
    K.HEAD_S = P['head_s']
    K.HEAD_WX = P.get('head_wx', K.HEAD_WX)
    K.HEAD_HZ = P.get('head_hz', K.HEAD_HZ)
    K.HEAD_DZ = P['head_dz']
    K.NECK_K = P['neck_k']
    K.SHARP_DEG = P['sharp']
    K.FACE.clear(); K.FACE.update(P['face'])
    K.STEP_CLIPS.clear(); K.STEP_CLIPS.update(P.get('step', {}))
    K.GAIT.clear(); K.GAIT.update(P.get('gait', {}))
    if 'stance' in P:        # idle stance: legs / spine / shoulders (Euler, over the rest skeleton)
        K.STANCE.update(P['stance'])
    if 'arm_aim' in P:       # idle arm hang (absolute directions, left side; mirrored for the right)
        for k, v in P['arm_aim'].items():
            K.STANCE_ARM_AIM[k] = v
            K.STANCE_ARM_AIM[k.replace('Left', 'Right')] = (-v[0], v[1], v[2])
        K._STANCE_LOCAL.clear()
    for tid, parts in P.get('tutor_parts', TUTOR_PARTS).items():   # Hettie: no rouge (owner: "her face isn't quite 2004")
        K.TUTORS[tid]['parts'].update(parts)
