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
SHELF_C = {   # the stylised midpoint: a gentler shelf
    'A': [(1.380, .197, .126, .117), (1.425, .194, .110, .106), (1.455, .172, .092, .091), (1.475, .124, .076, .076),
          (1.488, .078, .065, .067), (1.496, .070, .062, .064)],
    'B': [(1.385, .162, .110, .106), (1.422, .156, .098, .096), (1.448, .138, .084, .084), (1.466, .100, .070, .071),
          (1.478, .066, .058, .060), (1.486, .061, .058, .060)],
}

PROFILES = {
    'v4a': dict(label='Option A -- closest 2004: level shoulders, small head on a visible neck, flat faceted shading, stepped motion',
                shelf=SHELF, arm_lift={'A': .030, 'B': .026}, arm_out={'A': .008, 'B': .006},
                head_s=.96, head_dz=.004, neck_k=.92, sharp=12.0,
                face=dict(eye=(.0275, 1.690, .022, .016, .022, .017), brow=(.029, 1.712, 0.0), brow_size=((.034, .010), (.030, .007)),
                          mouth=(1.612, 1.614, .030, .022, .006)),
                step={'walk': (3, 'CONSTANT'), 'run': (2, 'CONSTANT'), 'idle': (20, 'CONSTANT')}),
    'v4b': dict(label='Option B -- the v4a body with softer shading, held poses joined by straight lines',
                shelf=SHELF, arm_lift={'A': .030, 'B': .026}, arm_out={'A': .008, 'B': .006},
                head_s=.96, head_dz=.004, neck_k=.92, sharp=36.0,
                face=dict(eye=(.0275, 1.690, .022, .016, .022, .017), brow=(.029, 1.712, 0.0), brow_size=((.034, .010), (.030, .007)),
                          mouth=(1.612, 1.614, .030, .022, .006)),
                step={'walk': (3, 'LINEAR'), 'run': (2, 'LINEAR'), 'idle': (15, 'LINEAR')}),
    'v4c': dict(label='Option C -- stylised midpoint: a touch larger head, gentler shoulder shelf, soft shading, fewer-key smooth motion',
                shelf=SHELF_C, arm_lift={'A': .020, 'B': .018}, arm_out={'A': .004, 'B': .004},
                head_s=1.02, head_dz=-.006, neck_k=.95, sharp=40.0,
                face=dict(eye=(.027, 1.689, .020, .015, .021, .016), brow=(.028, 1.709, 0.0)),
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
    for bt in ('A', 'B'):
        _torso_top(K, bt, P['shelf'][bt])
        lift, out = P['arm_lift'][bt], P['arm_out'][bt]
        x, y, z = K.ARM_TOP[bt]
        K.ARM_TOP[bt] = (x + out, y, z + lift)
        K.ARMHOLE[bt]['zc'] += lift
        (dx, dy, dz), dr = K.DELTOID[bt]
        K.DELTOID[bt] = ((dx + out, dy, dz + lift), dr)
    K.HEAD_S = P['head_s']
    K.HEAD_DZ = P['head_dz']
    K.NECK_K = P['neck_k']
    K.SHARP_DEG = P['sharp']
    K.FACE.clear(); K.FACE.update(P['face'])
    K.STEP_CLIPS.clear(); K.STEP_CLIPS.update(P.get('step', {}))
    K.GAIT.clear(); K.GAIT.update(P.get('gait', {}))
