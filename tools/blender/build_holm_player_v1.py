"""build_holm_player_v1.py -- canonical Blender-authored PLAYER for Crafted Realms.

2004-era old-school adventurer: chunky low-poly, flat-shaded matte colour regions,
oversized head/hands/feet, planar face. Drop-in for the runtime player.glb path
(src/fx_humanoid.js installPlayerGLB / playerGLBAnim / recolorPlayer):
  * the SAME 23 Mixamo bone names, hierarchy, rest head/tail/roll as assets/models/player.glb
  * forward = -Y in Blender (= +Z in glTF), feet at z=0, ~1.85 m tall
  * region materials R_SKIN / R_HAIR / R_TUNIC / R_BELT / R_LEGS / R_BOOTS (+ R_EYES)
  * variant meshes (all skinned to one armature): Body_Male, Body_Female,
    Hair_Short, Hair_Long, Hair_Ponytail, Hair_Bun, Hair_Mohawk, Beard_Full
    (bald = no hair mesh shown, Beard_None = no beard mesh shown)
  * in-place clips for three.js AnimationMixer (see CLIPS below); `attack` = alias of attack_slash

Run (headless):
  "C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe" -b --python tools/blender/build_holm_player_v1.py -- [--no-render]

Outputs (all new files):
  assets/models/holm_player_v1.glb                 all variants + all clips
  assets/models/holm_player_v1_default.glb         Body_Male + Hair_Short only (zero-code drop-in)
  .studio-workspaces/holm-player-v1/candidates/player.blend, manifest.json, REPORT.md
  scratchpad/holm_player_v1/*.png + sheet.png      proof renders
"""
import bpy, bmesh, math, json, os, sys, struct
from mathutils import Vector, Matrix, Quaternion, Euler

REPO = r"C:\Users\iQwaZ\OneDrive\Desktop\CraftedRealms-Claude"
REF_GLB = os.path.join(REPO, "assets", "models", "player.glb")
OUT_GLB = os.path.join(REPO, "assets", "models", "holm_player_v1.glb")
OUT_DEFAULT_GLB = os.path.join(REPO, "assets", "models", "holm_player_v1_default.glb")
WS = os.path.join(REPO, ".studio-workspaces", "holm-player-v1", "candidates")
RENDER_DIR = os.path.join(REPO, "scratchpad", "holm_player_v1")
FPS = 30
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
DO_RENDER = "--no-render" not in ARGS

# ------------------------------------------------------------------------------------------
# Skeleton: copied verbatim (head, tail, roll) from assets/models/player.glb so node rest
# transforms, bone names and hierarchy match the existing runtime avatar exactly.
# ------------------------------------------------------------------------------------------
BONES = [
    ('mixamorig:Hips', None, (0.0000, 0.0200, 0.9500), (0.0000, 0.0200, 1.0500), 0.0),
    ('mixamorig:Spine', 'mixamorig:Hips', (0.0000, 0.0200, 1.0500), (0.0000, 0.0100, 1.1600), 0.0),
    ('mixamorig:Spine1', 'mixamorig:Spine', (0.0000, 0.0100, 1.1600), (0.0000, 0.0000, 1.2800), 0.0),
    ('mixamorig:Spine2', 'mixamorig:Spine1', (0.0000, 0.0000, 1.2800), (0.0000, -0.0088, 1.4038), 0.0),
    ('mixamorig:Neck', 'mixamorig:Spine2', (0.0000, -0.0100, 1.4200), (0.0000, -0.0200, 1.5000), 0.0),
    ('mixamorig:Head', 'mixamorig:Neck', (0.0000, -0.0200, 1.5000), (0.0000, -0.0300, 1.6400), 0.0),
    ('mixamorig:HeadTop_End', 'mixamorig:Head', (0.0000, -0.0300, 1.6400), (0.0000, -0.0300, 1.7804), 0.0),
    ('mixamorig:LeftShoulder', 'mixamorig:Spine2', (0.0300, 0.0100, 1.4000), (0.1100, 0.0100, 1.4000), 0.0),
    ('mixamorig:LeftArm', 'mixamorig:LeftShoulder', (0.1100, 0.0100, 1.4000), (0.2500, 0.0400, 1.1500), 0.0),
    ('mixamorig:LeftForeArm', 'mixamorig:LeftArm', (0.2500, 0.0400, 1.1500), (0.2600, 0.0000, 0.9300), 0.0),
    ('mixamorig:LeftHand', 'mixamorig:LeftForeArm', (0.2600, 0.0000, 0.9300), (0.2711, -0.0222, 0.7076), 0.0),
    ('mixamorig:RightShoulder', 'mixamorig:Spine2', (-0.0300, 0.0100, 1.4000), (-0.1100, 0.0100, 1.4000), 0.0),
    ('mixamorig:RightArm', 'mixamorig:RightShoulder', (-0.1100, 0.0100, 1.4000), (-0.2500, 0.0400, 1.1500), 0.0),
    ('mixamorig:RightForeArm', 'mixamorig:RightArm', (-0.2500, 0.0400, 1.1500), (-0.2600, 0.0000, 0.9300), 0.0),
    ('mixamorig:RightHand', 'mixamorig:RightForeArm', (-0.2600, 0.0000, 0.9300), (-0.2711, -0.0222, 0.7076), 0.0),
    ('mixamorig:LeftUpLeg', 'mixamorig:Hips', (0.1100, 0.0200, 0.9500), (0.1200, 0.0600, 0.5200), 0.00001),
    ('mixamorig:LeftLeg', 'mixamorig:LeftUpLeg', (0.1200, 0.0600, 0.5200), (0.1300, 0.1000, 0.1200), 0.00001),
    ('mixamorig:LeftFoot', 'mixamorig:LeftLeg', (0.1300, 0.1000, 0.1200), (0.1300, -0.0800, 0.0300), 0.00006),
    ('mixamorig:LeftToeBase', 'mixamorig:LeftFoot', (0.1300, -0.0800, 0.0300), (0.1300, -0.2802, 0.0100), 0.00027),
    ('mixamorig:RightUpLeg', 'mixamorig:Hips', (-0.1100, 0.0200, 0.9500), (-0.1200, 0.0600, 0.5200), -0.00001),
    ('mixamorig:RightLeg', 'mixamorig:RightUpLeg', (-0.1200, 0.0600, 0.5200), (-0.1300, 0.1000, 0.1200), -0.00001),
    ('mixamorig:RightFoot', 'mixamorig:RightLeg', (-0.1300, 0.1000, 0.1200), (-0.1300, -0.0800, 0.0300), -0.00006),
    ('mixamorig:RightToeBase', 'mixamorig:RightFoot', (-0.1300, -0.0800, 0.0300), (-0.1300, -0.2802, 0.0100), -0.00027),
]
BONE_NAMES = [b[0] for b in BONES]
def B(short): return 'mixamorig:' + short

# ------------------------------------------------------------------------------------------
# Materials: region names identical to player.glb (runtime strips R_ and .NNN suffix).
# Colours authored as sRGB hex (= src/fx_humanoid.js PLAYER_DEFAULT_COLORS), converted to
# linear for Blender so the GLB shows exactly those sRGB values.
# ------------------------------------------------------------------------------------------
PALETTE = {
    'R_SKIN': '#b18b71', 'R_HAIR': '#6a4a2a', 'R_TUNIC': '#647a4e', 'R_BELT': '#402a15',
    'R_LEGS': '#3b2e1e', 'R_BOOTS': '#6e4626', 'R_EYES': '#1e1612',
}
MAT_ORDER = list(PALETTE.keys())

def srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def hex_lin(h):
    h = h.lstrip('#')
    return tuple(srgb_to_lin(int(h[i:i + 2], 16) / 255.0) for i in (0, 2, 4)) + (1.0,)

def make_materials():
    mats = {}
    for name, hx in PALETTE.items():
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        col = hex_lin(hx)
        bsdf.inputs['Base Color'].default_value = col
        bsdf.inputs['Roughness'].default_value = 1.0
        bsdf.inputs['Metallic'].default_value = 0.0
        if 'Specular IOR Level' in bsdf.inputs:
            bsdf.inputs['Specular IOR Level'].default_value = 0.0
        m.diffuse_color = col
        m.roughness = 1.0
        m.metallic = 0.0
        mats[name] = m
    return mats

def set_palette(mats, overrides):
    for k, hx in overrides.items():
        m = mats[k]
        bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        bsdf.inputs['Base Color'].default_value = hex_lin(hx)
        m.diffuse_color = hex_lin(hx)

# ------------------------------------------------------------------------------------------
# Mesh builder: every part is a closed low-poly loft; vertex weights are authored per ring
# (rigid or 2-bone blends), which is exactly how the old-school era rigged its models.
# ------------------------------------------------------------------------------------------
def _wnorm(w):
    if isinstance(w, str):
        return [(w, 1.0)]
    tot = sum(x[1] for x in w)
    return [(b, x / tot) for b, x in w]

class MB:
    def __init__(self):
        self.bm = bmesh.new()
        self.dl = self.bm.verts.layers.deform.verify()
        self.mats = []

    def _mi(self, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        return self.mats.index(mat)

    def _v(self, p, w):
        v = self.bm.verts.new(p)
        if callable(w):
            w = w(Vector(p))
        for bname, x in _wnorm(w):
            v[self.dl][BONE_NAMES.index(bname)] = x
        return v

    def loft(self, rings, mat, weights, cap0=True, cap1=True):
        """rings: list of equal-length point lists. weights: one entry per ring, each a bone
        name, [(bone, w), ...], or a callable(point)->either."""
        mi = self._mi(mat)
        vs = []
        for r, w in zip(rings, weights):
            row = []
            for p in r:
                ww = w(Vector(p)) if callable(w) else w
                row.append(self._v(p, ww))
            vs.append(row)
        faces = []
        n = len(vs[0])
        for i in range(len(vs) - 1):
            a, b = vs[i], vs[i + 1]
            for k in range(n):
                q = (a[k], a[(k + 1) % n], b[(k + 1) % n], b[k])
                if len(set(q)) == 4:
                    faces.append(self.bm.faces.new(q))
        if cap0:
            faces.append(self.bm.faces.new(vs[0]))
        if cap1:
            faces.append(self.bm.faces.new(vs[-1]))
        for f in faces:
            f.material_index = mi
            f.smooth = False
        bmesh.ops.recalc_face_normals(self.bm, faces=faces)
        return vs

    def grid_shell(self, outer, inner, mat, weights, wrap):
        """Thick patch: outer/inner are [row][col] point grids (row 0 = free edge).
        wrap=True closes columns into a loop and caps the last row with n-gons."""
        mi = self._mi(mat)
        R, C = len(outer), len(outer[0])
        vo = [[self._v(outer[i][j], weights[i]) for j in range(C)] for i in range(R)]
        vi = [[self._v(inner[i][j], weights[i]) for j in range(C)] for i in range(R)]
        faces = []
        cols = range(C) if wrap else range(C - 1)
        for i in range(R - 1):
            for j in cols:
                j2 = (j + 1) % C
                faces.append(self.bm.faces.new((vo[i][j], vo[i][j2], vo[i + 1][j2], vo[i + 1][j])))
                faces.append(self.bm.faces.new((vi[i][j], vi[i + 1][j], vi[i + 1][j2], vi[i][j2])))
        for j in cols:  # free edge strip
            j2 = (j + 1) % C
            faces.append(self.bm.faces.new((vo[0][j], vi[0][j], vi[0][j2], vo[0][j2])))
        if wrap:
            faces.append(self.bm.faces.new(vo[-1]))
            faces.append(self.bm.faces.new(list(reversed(vi[-1]))))
        else:
            for j in cols:  # top edge strip
                faces.append(self.bm.faces.new((vo[-1][j], vo[-1][j + 1], vi[-1][j + 1], vi[-1][j])))
            for jj in (0, C - 1):  # side strips
                for i in range(R - 1):
                    faces.append(self.bm.faces.new((vo[i][jj], vo[i + 1][jj], vi[i + 1][jj], vi[i][jj])))
        for f in faces:
            f.material_index = mi
            f.smooth = False
        bmesh.ops.recalc_face_normals(self.bm, faces=faces)

    def box(self, center, size, mat, w, taper_top=1.0):
        cx, cy, cz = center
        sx, sy, sz = (s / 2 for s in size)
        r0 = [(cx - sx, cy - sy, cz - sz), (cx + sx, cy - sy, cz - sz), (cx + sx, cy + sy, cz - sz), (cx - sx, cy + sy, cz - sz)]
        t = taper_top
        r1 = [(cx - sx * t, cy - sy, cz + sz), (cx + sx * t, cy - sy, cz + sz), (cx + sx * t, cy + sy, cz + sz), (cx - sx * t, cy + sy, cz + sz)]
        self.loft([r0, r1], mat, [w, w])

    def to_object(self, name, mats, arm):
        me = bpy.data.meshes.new(name)
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.mats:
            me.materials.append(mats[m])
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        for bn in BONE_NAMES:
            ob.vertex_groups.new(name=bn)
        ob.parent = arm
        mod = ob.modifiers.new('Armature', 'ARMATURE')
        mod.object = arm
        return ob

# ---- ring helpers ------------------------------------------------------------------------
def sring(cx, cy, z, rx, ry, n, p=2.0, push_front=0.0):
    """Superellipse ring in the XY plane with a flat face pointing front (-Y)."""
    pts = []
    for k in range(n):
        a = 2 * math.pi * (k + 0.5) / n
        s, c = math.sin(a), math.cos(a)
        x = rx * math.copysign(abs(s) ** (2 / p), s)
        y = -ry * math.copysign(abs(c) ** (2 / p), c)
        if push_front and c > 0.3:
            y -= push_front * (c - 0.3) / 0.7
        pts.append((cx + x, cy + y, z))
    return pts

def lring(p, axis, rs, rf, n, front=(0, -1, 0)):
    """Ring perpendicular to `axis` through p; rf = radius toward `front`, rs = sideways."""
    p, axis = Vector(p), Vector(axis).normalized()
    f0 = Vector(front)
    f = (f0 - axis * f0.dot(axis)).normalized()
    s = axis.cross(f).normalized()
    pts = []
    for k in range(n):
        a = 2 * math.pi * (k + 0.5) / n
        pts.append(tuple(p + s * (rs * math.sin(a)) + f * (rf * math.cos(a))))
    return pts

def limb(mb, p0, p1, stations, mat, n=6, front=(0, -1, 0), cap0=True, cap1=True):
    """stations: [(t along p0->p1 (may be <0 or >1), rs, rf, weight)]."""
    p0, p1 = Vector(p0), Vector(p1)
    ax = p1 - p0
    rings, ws = [], []
    for t, rs, rf, w in stations:
        rings.append(lring(p0 + ax * t, ax, rs, rf, n, front))
        ws.append(w)
    return mb.loft(rings, mat, ws, cap0, cap1)

def lerp_table(tab, z):
    """tab rows: (z, a, b, c, ...) sorted by z; returns interpolated tuple (without z)."""
    if z <= tab[0][0]:
        return tab[0][1:]
    if z >= tab[-1][0]:
        return tab[-1][1:]
    for r0, r1 in zip(tab, tab[1:]):
        if r0[0] <= z <= r1[0]:
            t = (z - r0[0]) / (r1[0] - r0[0])
            return tuple(a + (b - a) * t for a, b in zip(r0[1:], r1[1:]))

# ------------------------------------------------------------------------------------------
# Head: shared by both bodies above the jaw so every hair mesh fits both.
# rows: (z, rx, ry, cy)
# ------------------------------------------------------------------------------------------
HEAD_P = 3.0      # superellipse exponent: boxy old-school head
HEAD_N = 12
HEAD_M = [(1.478, .050, .042, -.052), (1.515, .098, .098, -.026), (1.565, .118, .116, -.012),
          (1.615, .126, .124, -.004), (1.670, .128, .128, 0.000), (1.720, .123, .125, .004),
          (1.768, .104, .110, .008), (1.800, .066, .074, .010), (1.814, .024, .028, .010)]
HEAD_F = [(1.482, .044, .038, -.048), (1.515, .088, .092, -.024), (1.565, .112, .112, -.012)] + HEAD_M[3:]
HEAD_CENTER = Vector((0, 0, 1.645))

def head_surface(theta, z, off, table=HEAD_M, hang_below=None):
    """Point on the (superellipse) head surface at angle theta (rad, 0 = front) and height z,
    pushed `off` metres outward from HEAD_CENTER. hang_below: below this z the profile is
    held constant (hair hanging straight down)."""
    zz = max(z, hang_below) if hang_below is not None else z
    rx, ry, cy = lerp_table(table, zz)
    s, c = math.sin(theta), math.cos(theta)
    x = rx * math.copysign(abs(s) ** (2 / HEAD_P), s)
    y = cy - ry * math.copysign(abs(c) ** (2 / HEAD_P), c)
    p = Vector((x, y, z))
    if hang_below is not None and z < hang_below:
        d = Vector((x, y - 0.0, 0))
        if d.length > 1e-6:
            p = p + d.normalized() * off
        return p
    d = p - HEAD_CENTER
    if d.length < 1e-6:
        return p
    return HEAD_CENTER + d * ((d.length + off) / d.length)

def face_front_y(z, table=HEAD_M):
    rx, ry, cy = lerp_table(table, z)
    a = math.pi / HEAD_N
    return cy - ry * abs(math.cos(a)) ** (2 / HEAD_P)

# ------------------------------------------------------------------------------------------
# Bodies
# ------------------------------------------------------------------------------------------
# torso rows: (z, rx, ry, cy, push_front, weight)
def _hem_w(side):
    def w(p):
        if p.x > 0.06:
            return [(B('Hips'), .6), (B('LeftUpLeg'), .4)]
        if p.x < -0.06:
            return [(B('Hips'), .6), (B('RightUpLeg'), .4)]
        return B('Hips')
    return w

TORSO_M = [
    (0.850, .218, .152, .022, 0, _hem_w(0)),
    (0.930, .204, .142, .022, 0, B('Hips')),
    (1.020, .194, .134, .020, 0, [(B('Hips'), .5), (B('Spine'), .5)]),
    (1.110, .192, .130, .015, 0, B('Spine')),
    (1.220, .210, .138, .010, .010, B('Spine1')),
    (1.310, .226, .138, .006, .006, [(B('Spine1'), .3), (B('Spine2'), .7)]),
    (1.380, .208, .122, .002, 0, B('Spine2')),
    (1.425, .125, .092, -.004, 0, B('Spine2')),
    (1.448, .072, .062, -.008, 0, B('Spine2')),
]
TORSO_F = [
    (0.850, .232, .158, .024, 0, _hem_w(0)),
    (0.930, .214, .146, .022, 0, B('Hips')),
    (1.020, .180, .126, .020, 0, [(B('Hips'), .5), (B('Spine'), .5)]),
    (1.105, .160, .116, .016, 0, B('Spine')),
    (1.190, .170, .122, .012, .006, B('Spine1')),
    (1.250, .184, .128, .010, .048, B('Spine1')),
    (1.310, .190, .126, .006, .020, [(B('Spine1'), .3), (B('Spine2'), .7)]),
    (1.380, .178, .114, .002, 0, B('Spine2')),
    (1.425, .112, .086, -.004, 0, B('Spine2')),
    (1.446, .066, .056, -.008, 0, B('Spine2')),
]

def build_body(sex, mats, arm):
    fem = sex == 'F'
    mb = MB()
    T = TORSO_F if fem else TORSO_M
    # --- tunic torso (boxy superellipse loft)
    mb.loft([sring(0, r[3], r[0], r[1], r[2], 12, 2.6, r[4]) for r in T], 'R_TUNIC', [r[5] for r in T])
    # --- belt + pouch
    tab = [(r[0], r[1], r[2], r[3]) for r in T]
    belt = []
    for z in (0.912, 0.935, 0.975, 0.998):
        rx, ry, cy = lerp_table(tab, z)
        belt.append(sring(0, cy, z, rx + .013, ry + .013, 12, 2.6))
    mb.loft(belt, 'R_BELT', [B('Hips')] * 4)
    bx, by, bcy = lerp_table(tab, 0.95)
    mb.box((bx - .02, bcy + .02, 0.905), (.05, .075, .085), 'R_BELT', B('Hips'), taper_top=.85)  # side pouch (left hip)
    mb.box((0, bcy - by - .012, 0.955), (.05, .012, .05), 'R_BOOTS', B('Hips'))              # buckle plate
    # --- neck
    limb(mb, (0, -.004, 1.39), (0, -.02, 1.53), [(0, .056, .054, B('Spine2')), (.45, .055, .053, B('Neck')), (1, .052, .050, B('Neck'))], 'R_SKIN', n=8)
    # --- head (skin) with planar face
    HT = HEAD_F if fem else HEAD_M
    mb.loft([sring(0, r[3], r[0], r[1], r[2], HEAD_N, HEAD_P) for r in HT], 'R_SKIN', [B('Head')] * len(HT))
    H = B('Head')
    yf = lambda z: face_front_y(z, HT)
    for sx in (-1, 1):
        mb.box((sx * .044, yf(1.664) - .004, 1.664), (.030, .014, .024), 'R_EYES', H)                 # eye
        mb.box((sx * .047, yf(1.697) - .006, 1.698), (.054, .016, .014), 'R_HAIR', H)                  # brow
        mb.box((sx * .128, -.004, 1.638), (.020, .040, .058), 'R_SKIN', H, taper_top=.8)             # ear
    nose_z0, nose_z1 = 1.612, 1.668
    y0, y1 = yf(nose_z0), yf(nose_z1)
    mb.loft([[(-.019, y0 + .004, nose_z0), (.019, y0 + .004, nose_z0), (.017, y0 - .038, nose_z0), (-.017, y0 - .038, nose_z0)],
             [(-.011, y1 + .004, nose_z1), (.011, y1 + .004, nose_z1), (.008, y1 - .010, nose_z1), (-.008, y1 - .010, nose_z1)]],
            'R_SKIN', [H, H])
    mw = .044 if fem else .052
    mb.box((0, yf(1.573) - .003, 1.573), (mw, .012, .011), 'R_EYES', H)                              # mouth
    # --- arms (long tunic sleeves + oversized mitten hands)
    for side, sx in (('Left', 1), ('Right', -1)):
        S = Vector((.11 * sx, .01, 1.40)); E = Vector((.25 * sx, .04, 1.15))
        W = Vector((.26 * sx, 0, .93)); Hn = Vector((.2711 * sx, -.0222, .7076))
        A, F, Hd = B(side + 'Arm'), B(side + 'ForeArm'), B(side + 'Hand')
        k = .92 if fem else 1.0
        limb(mb, S, E, [(-.16, .062 * k, .066 * k, [(B('Spine2'), .3), (A, .7)]), (.12, .080 * k, .076 * k, A),
                        (.60, .068 * k, .066 * k, A), (1.07, .061 * k, .060 * k, [(A, .5), (F, .5)])], 'R_TUNIC', n=6)
        limb(mb, E, W, [(-0.07, .058 * k, .057 * k, [(A, .5), (F, .5)]), (0.06, .064 * k, .063 * k, F), (.55, .060 * k, .058 * k, F),
                        (.86, .058 * k, .057 * k, F), (.90, .072 * k, .071 * k, F), (1.03, .072 * k, .071 * k, [(F, .6), (Hd, .4)])], 'R_TUNIC', n=6)
        h = 1.04 if fem else 1.15
        limb(mb, W, Hn, [(-.05, .026 * h, .038 * h, Hd), (.25, .033 * h, .054 * h, Hd), (.62, .031 * h, .052 * h, Hd),
                         (.92, .022 * h, .040 * h, Hd)], 'R_SKIN', n=6)
        ax = (Hn - W).normalized()
        t0 = W + ax * .06 + Vector((0, -.042 * h, 0))
        limb(mb, t0, t0 + (ax * .06 + Vector((0, -.018, 0))) * h, [(0, .016 * h, .016 * h, Hd), (1, .013 * h, .013 * h, Hd)], 'R_SKIN', n=4)
    # --- legs (trousers + chunky boots + big feet)
    for side, sx in (('Left', 1), ('Right', -1)):
        Hp = Vector((.11 * sx, .02, .95)); K = Vector((.12 * sx, .06, .52)); An = Vector((.13 * sx, .10, .12))
        U, L, Fo, To = B(side + 'UpLeg'), B(side + 'Leg'), B(side + 'Foot'), B(side + 'ToeBase')
        th = 1.10 if fem else 1.06
        limb(mb, Hp, K, [(-.10, .098 * th, .104 * th, U), (.30, .098 * th, .100 * th, U), (.75, .080, .082, U),
                         (1.05, .073, .075, [(U, .5), (L, .5)])], 'R_LEGS', n=6)
        limb(mb, K, An, [(-0.05, .070, .072, [(U, .5), (L, .5)]), (0.05, .075, .077, L), (.25, .072, .074, L), (.62, .062, .064, L)], 'R_LEGS', n=6)
        # boot shaft with turned-over cuff
        limb(mb, K, An, [(.40, .084, .088, L), (.47, .084, .088, L), (.49, .074, .078, L), (.80, .070, .074, L),
                         (1.06, .068, .076, [(L, .5), (Fo, .5)])], 'R_BOOTS', n=6)
        # foot: flat-soled profile rings marching heel -> toe
        def fr(y, w, hgt, x0=.13 * sx):
            return [(x0 - w, y, 0.0), (x0 + w, y, 0.0), (x0 + w * 1.06, y, hgt * .55), (x0 + w * .78, y, hgt),
                    (x0 - w * .78, y, hgt), (x0 - w * 1.06, y, hgt * .55)]
        mb.loft([fr(.170, .056, .115), fr(.090, .064, .150), fr(-.030, .068, .120), fr(-.150, .066, .090),
                 fr(-.235, .054, .070), fr(-.262, .040, .050)], 'R_BOOTS',
                [Fo, Fo, [(Fo, .6), (To, .4)], To, To, To])
    return mb.to_object('Body_Female' if fem else 'Body_Male', mats, arm)


# ------------------------------------------------------------------------------------------
# Hair + beard variants (chunky shells following the shared head; clumped, jagged edges)
# ------------------------------------------------------------------------------------------
def _ang(theta):
    return abs(math.degrees(math.atan2(math.sin(theta), math.cos(theta))))

def _hair_w(p):
    if p.z > 1.56:
        return B('Head')
    if p.z > 1.47:
        return [(B('Head'), .6), (B('Neck'), .4)]
    return [(B('Head'), .35), (B('Neck'), .4), (B('Spine2'), .25)]

def hair_cap(mb, zb_fn, jag=0.0, cols=16, rows=5, off_out=.028, off_in=-.004, top=1.814,
             hang_below=None, flare=0.0):
    thetas = [2 * math.pi * (j + 0.5) / cols for j in range(cols)]
    outer, inner = [], []
    for i in range(rows + 1):
        t = i / rows
        ro, ri = [], []
        for j, th in enumerate(thetas):
            zb = zb_fn(th) - (jag if (i == 0 and j % 2 == 1) else 0.0)
            z = zb + (top - zb) * (1 - (1 - t) ** 1.35)
            fl = flare * max(0.0, (hang_below or 0) - z) if hang_below else 0.0
            ro.append(head_surface(th, z, off_out + fl, hang_below=hang_below))
            ri.append(head_surface(th, z, off_in + fl * .6, hang_below=hang_below))
        outer.append(ro); inner.append(ri)
    mb.grid_shell(outer, inner, 'R_HAIR', [_hair_w] * (rows + 1), wrap=True)

def tube(mb, pts, radii, mat, weights, n=6, front=(0, -1, 0), cap=True):
    pts = [Vector(p) for p in pts]
    rings = []
    for i, p in enumerate(pts):
        a = pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]
        r = radii[i]
        rs, rf = (r, r) if not isinstance(r, tuple) else r
        rings.append(lring(p, a, rs, rf, n, front))
    return mb.loft(rings, mat, weights, cap, cap)

def zb_short(th):
    return 1.588 + (1.738 - 1.588) * ((1 + math.cos(th)) / 2) ** 1.6

def zb_long(th):
    a = _ang(th)
    if a <= 40:
        return 1.738
    if a >= 75:
        return 1.40
    t = (a - 40) / 35
    return 1.738 + (1.40 - 1.738) * (0.5 - 0.5 * math.cos(math.pi * t))

def zb_bun(th):
    return 1.600 + (1.745 - 1.600) * ((1 + math.cos(th)) / 2) ** 1.4

HAIR_STYLES = ['Short', 'Long', 'Ponytail', 'Bun', 'Mohawk']

def build_hair(style, mats, arm):
    mb = MB()
    H = B('Head')
    if style == 'Short':
        hair_cap(mb, zb_short, jag=.028)
    elif style == 'Long':
        hair_cap(mb, zb_long, jag=.032, rows=7, hang_below=1.64, flare=.10)
    elif style == 'Ponytail':
        hair_cap(mb, zb_short, jag=.016)
        tube(mb, [(0, .120, 1.715), (0, .168, 1.672), (0, .198, 1.610), (0, .212, 1.530), (0, .205, 1.450), (0, .186, 1.385)],
             [.030, .036, .050, .052, .042, .012], 'R_HAIR',
             [H, H, H, [(H, .6), (B('Neck'), .4)], [(B('Neck'), .5), (B('Spine2'), .5)], B('Spine2')], n=6)
        tube(mb, [(0, .158, 1.684), (0, .176, 1.660)], [.041, .041], 'R_BELT', [H, H], n=6)   # leather tie
    elif style == 'Bun':
        hair_cap(mb, zb_bun, jag=.010)
        c = Vector((0, .098, 1.782)); ax = Vector((0, .62, .78)).normalized()
        tube(mb, [c + ax * k for k in (-.040, -.015, .018, .050, .075)], [.030, .062, .072, .058, .020], 'R_HAIR', [H] * 5, n=8)
    elif style == 'Mohawk':
        st = [(0.0, z) for z in (1.720, 1.760, 1.792, 1.812)] + [(math.pi, z) for z in (1.800, 1.770, 1.730, 1.685, 1.635, 1.585)]
        rings, ws = [], []
        for i, (th, z) in enumerate(st):
            base = head_surface(th, z, -.004)
            nrm = (base - HEAD_CENTER).normalized()
            h = (.085 if i % 2 == 0 else .060) * (0.75 if i in (0, len(st) - 1) else 1.0)
            w = .024
            X = Vector((1, 0, 0))
            rings.append([tuple(base - X * w), tuple(base + X * w), tuple(base + nrm * h + X * w * .45), tuple(base + nrm * h - X * w * .45)])
            ws.append(H)
        mb.loft(rings, 'R_HAIR', ws)
    return mb.to_object('Hair_' + style, mats, arm)

def build_beard(mats, arm):
    mb = MB()
    H = B('Head')
    thetas = [math.radians(-105 + 210 * j / 14) for j in range(15)]
    rows = 3
    outer, inner = [], []
    for i in range(rows + 1):
        t = i / rows
        ro, ri = [], []
        for j, th in enumerate(thetas):
            a = _ang(th) / 105
            zb = 1.458 + .13 * a ** 1.6 - (.024 if (i == 0 and j % 2 == 1) else 0)
            zt = 1.556 + .10 * a ** 1.4
            z = zb + (zt - zb) * t
            ro.append(head_surface(th, z, .024 - .006 * a))
            ri.append(head_surface(th, z, -.004))
        outer.append(ro); inner.append(ri)
    mb.grid_shell(outer, inner, 'R_HAIR', [H] * (rows + 1), wrap=False)
    yf = lambda z: face_front_y(z)
    tube(mb, [(-.060, yf(1.566) - .006, 1.566), (-.034, yf(1.590) - .010, 1.590), (0, yf(1.596) - .012, 1.596),
              (.034, yf(1.590) - .010, 1.590), (.060, yf(1.566) - .006, 1.566)],
         [(.010, .010), (.012, .012), (.012, .012), (.012, .012), (.010, .010)], 'R_HAIR', [H] * 5, n=5)
    return mb.to_object('Beard_Full', mats, arm)

# ------------------------------------------------------------------------------------------
# Armature
# ------------------------------------------------------------------------------------------
def build_armature():
    ad = bpy.data.armatures.new('Armature')
    arm = bpy.data.objects.new('Armature', ad)
    bpy.context.scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    for name, parent, head, tail, roll in BONES:
        eb = ad.edit_bones.new(name)
        eb.head, eb.tail, eb.roll = head, tail, roll
        if parent:
            eb.parent = ad.edit_bones[parent]
            eb.use_connect = False
    bpy.ops.object.mode_set(mode='OBJECT')
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
    return arm

# ------------------------------------------------------------------------------------------
# Animation: poses are authored as armature-space rotations per bone.
#   (rx, ry, rz) degrees = Euler XYZ delta about the bone head, in the parent's posed frame;
#   ('aim', (x, y, z))    = point the bone along this armature-space direction.
# Axes (Blender, character faces -Y): +X = character's left, -Y = forward, +Z = up.
# +rx tips a bone's top forward (legs/arms: swings them BACK); -rx raises limbs forward.
# ------------------------------------------------------------------------------------------
REST = {'LeftArm': (0, 12, 0), 'RightArm': (0, -12, 0), 'LeftForeArm': (-10, 0, 0), 'RightForeArm': (-10, 0, 0)}

def P(**kw):
    d = dict(REST)
    d.update(kw)
    return d

def mirror_pose(p):
    out = {}
    for k, v in p.items():
        nk = k.replace('Left', '#').replace('Right', 'Left').replace('#', 'Right')
        if k == 'loc':
            out[k] = (-v[0], v[1], v[2])
        elif isinstance(v, tuple) and len(v) == 2 and v[0] == 'aim':
            d = v[1]
            out[nk] = ('aim', (-d[0], d[1], d[2]))
        else:
            out[nk] = (v[0], -v[1], -v[2])
    return out

def pose_rotations(arm, pose):
    """-> {bone: armature-space 3x3 delta R} honoring 'aim' via accumulated parent rotations."""
    acc, res = {}, {}
    for name, parent, head, tail, roll in BONES:
        short = name.split(':')[1]
        spec = pose.get(short)
        pacc = acc[parent] if parent else Matrix.Identity(3)
        if spec is None:
            R = Matrix.Identity(3)
        elif spec[0] == 'aim':
            v_rest = (Vector(tail) - Vector(head)).normalized()
            want = pacc.inverted() @ Vector(spec[1]).normalized()
            R = v_rest.rotation_difference(want).to_matrix()
        else:
            R = Euler([math.radians(a) for a in spec], 'XYZ').to_matrix()
        res[name] = R
        acc[name] = pacc @ R
    return res

def key_pose(arm, pose, frame, last_q):
    rots = pose_rotations(arm, pose)
    for pb in arm.pose.bones:
        Bm = pb.bone.matrix_local.to_3x3()
        q = (Bm.inverted() @ rots[pb.name] @ Bm).to_quaternion()
        pq = last_q.get(pb.name)
        if pq is not None and pq.dot(q) < 0:
            q.negate()
        last_q[pb.name] = q.copy()
        pb.rotation_quaternion = q
        pb.keyframe_insert('rotation_quaternion', frame=frame, group=pb.name)
        if pb.name == B('Hips'):
            d = Vector(pose.get('loc', (0, 0, 0)))
            pb.location = Bm.inverted() @ d
            pb.keyframe_insert('location', frame=frame, group=pb.name)
        else:
            pb.location = (0, 0, 0)
        pb.scale = (1, 1, 1)

def make_clip(arm, name, frames, keys):
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    arm.animation_data_create()
    arm.animation_data.action = act
    last_q = {}
    for f, pose in keys:
        key_pose(arm, pose, f, last_q)
    act.use_frame_range = True
    act.frame_start, act.frame_end = 0, frames
    return act

def crouch(th, kn, sides=('Left', 'Right')):
    """Knee bend that keeps the soles planted: thigh th (neg = forward), knee kn (pos)."""
    d = {}
    for sd in sides:
        d[sd + 'UpLeg'] = (th, 0, 0); d[sd + 'Leg'] = (kn, 0, 0); d[sd + 'Foot'] = (-(th + kn), 0, 0)
    drop = .43 * (1 - math.cos(math.radians(th))) + .40 * (1 - math.cos(math.radians(th + kn)))
    d['loc'] = (0, 0, -drop)
    return d

def PP(*dicts, **kw):
    d = dict(REST)
    for x in dicts:
        d.update(x)
    d.update(kw)
    return d

def A(x, y, z):
    return ('aim', (x, y, z))

def cycle(frames, half_keys):
    """Two-phase loop: half_keys = [(frame, pose)] for the first half; second half mirrored."""
    h = frames // 2
    keys = list(half_keys) + [(f + h, mirror_pose(p)) for f, p in half_keys]
    keys.append((frames, half_keys[0][1]))
    return keys

def clip_defs():
    """name -> (frames @30fps, [(frame, pose)], loop). All in place (hips only bob/drop)."""
    C = {}
    C['idle'] = (60, [
        (0, P()),
        (30, P(Spine1=(2, 0, 0), Spine2=(1.5, 0, 0), Head=(1.5, 0, 0), LeftArm=(-2, 16, 0), RightArm=(-2, -16, 0),
               LeftForeArm=(-13, 0, 0), RightForeArm=(-13, 0, 0), loc=(0, 0, -.008))),
        (60, P()),
    ], True)
    wc = P(LeftUpLeg=(-26, 0, 0), LeftLeg=(6, 0, 0), LeftFoot=(-10, 0, 0), RightUpLeg=(20, 0, 0), RightLeg=(20, 0, 0),
           RightFoot=(12, 0, 0), LeftArm=(20, 18, 0), RightArm=(-24, -18, 0), LeftForeArm=(-10, 0, 0), RightForeArm=(-28, 0, 0),
           Hips=(0, 0, -5), Spine=(3, 0, 0), Spine1=(0, 0, 8), loc=(0, 0, -.022))
    wp = P(LeftUpLeg=(-2, 0, 0), LeftLeg=(4, 0, 0), RightUpLeg=(-14, 0, 0), RightLeg=(44, 0, 0), RightFoot=(6, 0, 0),
           LeftArm=(3, 18, 0), RightArm=(-5, -18, 0), LeftForeArm=(-12, 0, 0), RightForeArm=(-16, 0, 0), Spine=(3, 0, 0),
           loc=(0, 0, .012))
    C['walk'] = (24, cycle(24, [(0, wc), (6, wp)]), True)
    rc = P(LeftUpLeg=(-46, 0, 0), LeftLeg=(22, 0, 0), LeftFoot=(-8, 0, 0), RightUpLeg=(26, 0, 0), RightLeg=(58, 0, 0),
           RightFoot=(22, 0, 0), LeftArm=(42, 14, 0), LeftForeArm=(-70, 0, 0), RightArm=(-48, -14, 0), RightForeArm=(-88, 0, 0),
           Hips=(0, 0, -7), Spine=(11, 0, 0), Spine1=(2, 0, 9), Head=(-9, 0, 0), loc=(0, 0, -.05))
    rp = P(LeftUpLeg=(4, 0, 0), LeftLeg=(28, 0, 0), LeftFoot=(12, 0, 0), RightUpLeg=(-32, 0, 0), RightLeg=(98, 0, 0),
           RightFoot=(8, 0, 0), LeftArm=(6, 16, 0), LeftForeArm=(-82, 0, 0), RightArm=(-12, -16, 0), RightForeArm=(-82, 0, 0),
           Spine=(11, 0, 0), Head=(-9, 0, 0), loc=(0, 0, .03))
    C['run'] = (16, cycle(16, [(0, rc), (4, rp)]), True)

    ready = P(RightArm=(-18, -18, 0), RightForeArm=(-28, 0, 0))
    step = dict(LeftUpLeg=(-20, 0, 0), LeftLeg=(18, 0, 0), LeftFoot=(2, 0, 0), RightUpLeg=(12, 0, 0), RightLeg=(8, 0, 0), RightFoot=(-20, 0, 0))
    C['attack_slash'] = (18, [
        (0, ready),
        (5, P(RightArm=A(-.55, .25, .80), RightForeArm=A(-.10, .45, .90), Spine1=(0, 0, -14), Spine2=(-4, 0, -8),
              LeftArm=A(.35, -.6, -.7), LeftForeArm=A(-.1, -1, -.1), LeftUpLeg=(-10, 0, 0), RightUpLeg=(6, 0, 0))),
        (9, PP(step, RightArm=A(.25, -.85, -.45), RightForeArm=A(.45, -.85, -.30), Spine=(6, 0, 0), Spine1=(8, 0, 16),
               Spine2=(4, 0, 8), LeftArm=A(.45, .10, -.9), LeftForeArm=A(.2, -.3, -.9), loc=(0, 0, -.035))),
        (13, PP(step, RightArm=A(.35, -.70, -.60), RightForeArm=A(.50, -.60, -.60), Spine=(6, 0, 0), Spine1=(8, 0, 20),
                Spine2=(4, 0, 8), LeftArm=A(.45, .10, -.9), LeftForeArm=A(.2, -.3, -.9), loc=(0, 0, -.03))),
        (18, ready),
    ], False)
    lunge = dict(RightUpLeg=(-30, 0, 0), RightLeg=(28, 0, 0), RightFoot=(2, 0, 0), LeftUpLeg=(16, 0, 0), LeftLeg=(12, 0, 0), LeftFoot=(-28, 0, 0))
    C['attack_stab'] = (18, [
        (0, ready),
        (5, P(RightArm=A(-.30, .55, -.75), RightForeArm=A(.05, -1, .05), Spine1=(0, 0, -14), LeftArm=A(.35, -.5, -.75),
              LeftForeArm=A(0, -1, -.2))),
        (9, PP(lunge, RightArm=A(-.05, -1, .08), RightForeArm=A(0, -1, .05), Spine=(8, 0, 0), Spine1=(6, 0, 14),
               LeftArm=A(.5, .3, -.8), LeftForeArm=A(.2, .1, -.9), loc=(0, 0, -.05))),
        (13, PP(lunge, RightArm=A(-.08, -.95, -.05), RightForeArm=A(0, -1, 0), Spine=(7, 0, 0), Spine1=(5, 0, 12),
                LeftArm=A(.5, .3, -.8), LeftForeArm=A(.2, .1, -.9), loc=(0, 0, -.045))),
        (18, ready),
    ], False)
    ready2 = P(RightArm=(-15, -18, 0), LeftArm=(-15, 18, 0), RightForeArm=(-25, 0, 0), LeftForeArm=(-25, 0, 0))
    smash = PP(crouch(-22, 38), RightArm=A(-.05, -.75, -.65), RightForeArm=A(.10, -.8, -.6), LeftArm=A(.10, -.75, -.65),
               LeftForeArm=A(-.10, -.8, -.6), Spine=(12, 0, 0), Spine1=(18, 0, 0), Head=(-12, 0, 0))
    C['attack_crush'] = (21, [
        (0, ready2),
        (8, P(RightArm=A(-.10, .15, 1), RightForeArm=A(.15, .55, .8), LeftArm=A(.12, .15, 1), LeftForeArm=A(-.15, .55, .8),
              Spine1=(-10, 0, 0), Spine2=(-5, 0, 0), Head=(-4, 0, 0), loc=(0, 0, .01))),
        (12, smash),
        (16, smash),
        (21, ready2),
    ], False)
    draw = P(LeftArm=A(.25, -.95, .12), LeftForeArm=A(.20, -1, .12), RightArm=A(-.95, .15, .18), RightForeArm=A(.95, -.30, .05),
             Spine1=(0, 0, -14), Head=(0, 0, 12), LeftUpLeg=(-8, 0, 0), RightUpLeg=(6, 0, 0))
    C['bow'] = (36, [
        (0, P()),
        (8, P(LeftArm=A(.25, -.95, .12), LeftForeArm=A(.20, -1, .12), RightArm=A(-.35, -.85, .10), RightForeArm=A(.55, -.80, .05),
              Spine1=(0, 0, -8), Head=(0, 0, 6))),
        (18, draw),
        (24, draw),
        (26, PP(draw, RightArm=A(-.95, .30, .20), RightForeArm=A(-.40, .80, .20))),
        (36, P()),
    ], False)
    C['cast'] = (30, [
        (0, P()),
        (8, P(RightArm=A(-.35, -.5, -.8), RightForeArm=A(.6, -.6, .5), LeftArm=A(.35, -.5, -.8), LeftForeArm=A(-.6, -.6, .5),
              Spine1=(-6, 0, 0), Head=(-4, 0, 0))),
        (14, P(RightArm=A(-.2, -1, .15), RightForeArm=A(-.05, -1, .2), LeftArm=A(.2, -1, .15), LeftForeArm=A(.05, -1, .2),
               Spine1=(8, 0, 0), LeftUpLeg=(-15, 0, 0), LeftLeg=(10, 0, 0), RightUpLeg=(10, 0, 0), loc=(0, 0, -.01))),
        (20, P(RightArm=A(-.2, -1, .1), RightForeArm=A(-.05, -1, .15), LeftArm=A(.2, -1, .1), LeftForeArm=A(.05, -1, .15),
               Spine1=(7, 0, 0), LeftUpLeg=(-15, 0, 0), LeftLeg=(10, 0, 0), RightUpLeg=(10, 0, 0), loc=(0, 0, -.01))),
        (30, P()),
    ], False)
    chop_st = dict(LeftUpLeg=(-14, 0, 0), LeftLeg=(10, 0, 0), LeftFoot=(4, 0, 0), RightUpLeg=(8, 0, 0), RightFoot=(-8, 0, 0),
                   LeftArm=A(.3, -.55, -.75), LeftForeArm=A(0, -.9, -.2))
    chop0 = PP(chop_st, RightArm=A(-.75, .15, .65), RightForeArm=A(-.20, .35, .90), Spine1=(0, 0, -22), Spine2=(0, 0, -8))
    C['chop'] = (30, [
        (0, chop0),
        (10, PP(chop_st, RightArm=A(-.35, -.85, -.15), RightForeArm=A(.45, -.85, -.10), Spine=(6, 0, 0), Spine1=(4, 0, 14), Spine2=(0, 0, 6))),
        (15, PP(chop_st, RightArm=A(-.40, -.80, -.05), RightForeArm=A(.35, -.85, .10), Spine=(5, 0, 0), Spine1=(3, 0, 10))),
        (30, chop0),
    ], True)
    mine0 = PP(crouch(-5, 8), RightArm=A(-.2, .25, .95), RightForeArm=A(.05, .65, .75), LeftArm=A(.15, .2, .95),
               LeftForeArm=A(-.1, .65, .75), Spine1=(-10, 0, 0), Head=(-6, 0, 0))
    C['mine'] = (30, [
        (0, mine0),
        (11, PP(crouch(-22, 40), RightArm=A(-.1, -.8, -.6), RightForeArm=A(.12, -.6, -.8), LeftArm=A(.1, -.8, -.6),
                LeftForeArm=A(-.12, -.6, -.8), Spine=(12, 0, 0), Spine1=(18, 0, 0), Head=(-14, 0, 0))),
        (16, PP(crouch(-20, 36), RightArm=A(-.1, -.85, -.45), RightForeArm=A(.12, -.75, -.6), LeftArm=A(.1, -.85, -.45),
                LeftForeArm=A(-.12, -.75, -.6), Spine=(11, 0, 0), Spine1=(15, 0, 0), Head=(-12, 0, 0))),
        (30, mine0),
    ], True)
    net_b = dict(crouch(-18, 32), Spine=(14, 0, 0), Head=(-10, 0, 0))
    net0 = PP(net_b, RightArm=A(-.35, .45, -.8), RightForeArm=A(-.1, .5, -.8), LeftArm=A(.35, .45, -.8), LeftForeArm=A(.1, .5, -.8))
    C['net'] = (48, [
        (0, net0),
        (16, PP(net_b, RightArm=A(-.25, -.9, .3), RightForeArm=A(-.05, -.95, .35), LeftArm=A(.25, -.9, .3), LeftForeArm=A(.05, -.95, .35), Spine1=(-4, 0, 0))),
        (24, PP(net_b, RightArm=A(-.25, -.9, .1), RightForeArm=A(-.05, -.95, .1), LeftArm=A(.25, -.9, .1), LeftForeArm=A(.05, -.95, .1))),
        (36, PP(net_b, RightArm=A(-.25, -.3, -.9), RightForeArm=A(.25, -.8, .3), LeftArm=A(.25, -.3, -.9), LeftForeArm=A(-.25, -.8, .3), Spine1=(-6, 0, 0))),
        (48, net0),
    ], True)
    cook_b = dict(crouch(-28, 55), Spine=(18, 0, 0), Spine1=(6, 0, 0), Head=(4, 0, 0), LeftArm=A(.4, -.45, -.8), LeftForeArm=A(0, -.75, -.65))
    ck = [A(-.3, -.75, -.55), A(-.1, -.8, -.55), A(-.2, -.85, -.4), A(-.4, -.75, -.45)]
    cf = [A(.1, -1, -.15), A(.3, -.95, -.05), A(.15, -1, .1), A(-.1, -1, 0)]
    C['cook'] = (36, [(i * 9, PP(cook_b, RightArm=ck[i], RightForeArm=cf[i])) for i in range(4)] + [(36, PP(cook_b, RightArm=ck[0], RightForeArm=cf[0]))], True)
    sm_b = dict(crouch(-8, 14), Spine=(12, 0, 0), LeftArm=A(.25, -.55, -.8), LeftForeArm=A(-.25, -.95, -.15))
    sm0 = PP(sm_b, RightArm=A(-.55, -.25, .35), RightForeArm=A(-.05, .25, 1))
    C['smith'] = (30, [
        (0, sm0),
        (10, PP(sm_b, RightArm=A(-.3, -.55, -.75), RightForeArm=A(.2, -.95, -.35))),
        (14, PP(sm_b, RightArm=A(-.35, -.55, -.6), RightForeArm=A(.15, -.9, 0))),
        (30, sm0),
    ], True)
    sl_b = dict(LeftUpLeg=(-14, 0, 0), LeftLeg=(10, 0, 0), LeftFoot=(4, 0, 0), RightUpLeg=(8, 0, 0), RightFoot=(-8, 0, 0))
    sl0 = PP(sl_b, RightArm=A(-.2, -.35, -.9), RightForeArm=A(.35, -.8, .45), LeftArm=A(.2, -.35, -.9), LeftForeArm=A(-.35, -.8, .45), Spine=(4, 0, 0))
    sl1 = PP(sl_b, RightArm=A(-.12, -.95, 0), RightForeArm=A(.1, -1, .1), LeftArm=A(.12, -.95, 0), LeftForeArm=A(-.1, -1, .1), Spine=(14, 0, 0), Spine1=(6, 0, 0))
    C['smelt'] = (36, [(0, sl0), (14, sl1), (22, sl1), (36, sl0)], True)
    cl = P(RightArm=A(-.15, -.25, 1), RightForeArm=A(0, -.3, 1), LeftArm=A(.2, -.7, .1), LeftForeArm=A(-.1, -.4, .9),
           LeftUpLeg=(-65, 0, 0), LeftLeg=(85, 0, 0), LeftFoot=(-20, 0, 0), RightUpLeg=(-8, 0, 0), RightLeg=(12, 0, 0),
           Spine=(6, 0, 0), Head=(-14, 0, 0))
    C['climb'] = (30, cycle(30, [(0, cl)]), True)
    blk = PP(crouch(-10, 18), LeftArm=A(.35, -.8, -.1), LeftForeArm=A(-.75, -.35, .55), RightArm=A(-.3, -.5, -.8),
             RightForeArm=A(.1, -1, .15), Spine=(6, 0, 0), Spine1=(0, 0, -6))
    C['block'] = (12, [(0, P()), (4, blk), (8, blk), (12, P())], False)
    C['hit'] = (12, [
        (0, P()),
        (3, P(Spine=(-12, 0, 0), Spine1=(-8, 0, 0), Head=(-16, 0, 8), LeftArm=(-15, -10, 0), RightArm=(-15, 10, 0),
              LeftForeArm=(-40, 0, 0), RightForeArm=(-40, 0, 0), loc=(0, .035, -.01))),
        (6, P(Spine=(-6, 0, 0), Head=(-6, 0, 4), loc=(0, .02, 0))),
        (12, P()),
    ], False)
    down = dict(Hips=(-90, 0, 0), LeftUpLeg=(-12, 0, -4), LeftLeg=(22, 0, 0), LeftFoot=(28, 0, 0), RightUpLeg=(-3, 0, 6),
                RightLeg=(6, 0, 0), RightFoot=(35, 0, 0), LeftArm=(-20, -62, 0), RightArm=(-10, 58, 0),
                LeftForeArm=(-30, 0, 0), RightForeArm=(-15, 0, 0), Spine1=(-4, 0, 0))
    C['death'] = (40, [
        (0, P()),
        (6, P(Spine=(-10, 0, 0), Head=(-15, 0, 0), loc=(0, .02, 0))),
        (14, PP(crouch(-38, 75), Spine=(15, 0, 0), Spine1=(8, 0, 0), Head=(20, 0, 0), LeftArm=(5, 10, 0), RightArm=(5, -10, 0))),
        (24, P(Hips=(-45, 0, 0), LeftUpLeg=(-30, 0, 0), LeftLeg=(55, 0, 0), RightUpLeg=(-38, 0, 0), RightLeg=(65, 0, 0),
               Spine1=(-5, 0, 0), Head=(10, 0, 0), LeftArm=(-25, -40, 0), RightArm=(-25, 40, 0), loc=(0, .18, -.55))),
        (32, PP(down, Head=(-8, 0, 25), loc=(0, .32, -.77))),
        (40, PP(down, Head=(-5, 0, 30), loc=(0, .32, -.775))),
    ], False)
    return C

# ------------------------------------------------------------------------------------------
# Scene build / export
# ------------------------------------------------------------------------------------------
def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = FPS
    sc.frame_start = 0

def build_all():
    reset_scene()
    mats = make_materials()
    arm = build_armature()
    objs = {}
    objs['Body_Male'] = build_body('M', mats, arm)
    objs['Body_Female'] = build_body('F', mats, arm)
    for st in HAIR_STYLES:
        objs['Hair_' + st] = build_hair(st, mats, arm)
    objs['Beard_Full'] = build_beard(mats, arm)
    clips = {}
    for name, (frames, keys, loop) in clip_defs().items():
        clips[name] = make_clip(arm, name, frames, keys)
    if 'attack_slash' in clips:
        al = clips['attack_slash'].copy()
        al.name = 'attack'
        al.use_fake_user = True
        clips['attack'] = al
    arm.animation_data.action = clips['idle']
    bpy.context.scene.frame_set(0)
    return arm, mats, objs, clips

def export_glb(path, arm, meshes):
    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True)
    for m in meshes:
        m.hide_set(False)
        m.hide_render = False
        m.select_set(True)
    bpy.context.view_layer.objects.active = arm
    kw = dict(filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
              export_animations=True, export_animation_mode='ACTIONS', export_force_sampling=True,
              export_frame_range=False, export_skins=True, export_morph=False, export_materials='EXPORT',
              export_optimize_animation_size=False, export_def_bones=False, export_reset_pose_bones=True)
    props = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
    kw = {k: v for k, v in kw.items() if k in props or k == 'filepath'}
    bpy.ops.export_scene.gltf(**kw)

# ------------------------------------------------------------------------------------------
# GLB reading (pure python) + validation
# ------------------------------------------------------------------------------------------
def read_glb(path):
    d = open(path, 'rb').read()
    ln = struct.unpack('<I', d[12:16])[0]
    j = json.loads(d[20:20 + ln])
    binoff = 20 + ln + 8
    return j, d[binoff:]

def glb_skeleton(j):
    skin = j['skins'][0]
    parent = {}
    for i, n in enumerate(j['nodes']):
        for c in n.get('children', []):
            parent[c] = i
    names = [j['nodes'][i]['name'] for i in skin['joints']]
    par = {}
    for i in skin['joints']:
        p = parent.get(i)
        par[j['nodes'][i]['name']] = j['nodes'][p]['name'] if p is not None and p in skin['joints'] else None
    rest = {j['nodes'][i]['name']: (j['nodes'][i].get('translation', [0, 0, 0]), j['nodes'][i].get('rotation', [0, 0, 0, 1])) for i in skin['joints']}
    return names, par, rest

def glb_clips(j):
    out = {}
    for a in j.get('animations', []):
        mx = 0.0
        for s in a['samplers']:
            acc = j['accessors'][s['input']]
            if 'max' in acc:
                mx = max(mx, acc['max'][0])
        out[a['name']] = round(mx, 4)
    return out

def validate(out_glb, want_meshes, want_clips):
    j, _ = read_glb(out_glb)
    rj, _ = read_glb(REF_GLB)
    n_new, p_new, r_new = glb_skeleton(j)
    n_ref, p_ref, r_ref = glb_skeleton(rj)
    res = {'bone_names_match': sorted(n_new) == sorted(n_ref) and len(n_new) == len(n_ref),
           'bone_order_match': n_new == n_ref,
           'hierarchy_match': p_new == p_ref,
           'bone_count': len(n_new)}
    # rest transform deviation vs reference
    mt = mr = 0.0
    for n in n_ref:
        if n in r_new:
            t0, q0 = r_ref[n]; t1, q1 = r_new[n]
            mt = max(mt, max(abs(a - b) for a, b in zip(t0, t1)))
            dq = abs(sum(a * b for a, b in zip(q0, q1)))
            mr = max(mr, math.degrees(2 * math.acos(min(1.0, dq))))
    res['max_rest_translation_delta_m'] = round(mt, 5)
    res['max_rest_rotation_delta_deg'] = round(mr, 3)
    clips = glb_clips(j)
    res['clips'] = clips
    res['missing_clips'] = [c for c in want_clips if c not in clips]
    res['zero_duration_clips'] = [c for c, d in clips.items() if d <= 0]
    names = [n.get('name') for n in j['nodes']]
    res['missing_meshes'] = [m for m in want_meshes if m not in names]
    res['materials'] = [m['name'] for m in j.get('materials', [])]
    # Blender round-trip import: bone names as Blender sees them
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=out_glb)
    arms = [o for o in bpy.data.objects if o.type == 'ARMATURE']
    bl_new = sorted(b.name for b in arms[0].data.bones) if arms else []
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=REF_GLB)
    arms = [o for o in bpy.data.objects if o.type == 'ARMATURE']
    bl_ref = sorted(b.name for b in arms[0].data.bones) if arms else []
    res['blender_reimport_bones_match'] = bl_new == bl_ref and len(bl_new) == 23
    ok = (res['bone_names_match'] and res['hierarchy_match'] and res['blender_reimport_bones_match']
          and not res['missing_clips'] and not res['zero_duration_clips'] and not res['missing_meshes'])
    res['PASS'] = ok
    assert res['bone_names_match'], 'bone names differ from player.glb'
    assert res['hierarchy_match'], 'bone hierarchy differs from player.glb'
    assert res['blender_reimport_bones_match'], 'Blender re-import bone set differs'
    assert not res['missing_clips'], 'missing clips %s' % res['missing_clips']
    assert not res['zero_duration_clips'], 'zero-duration clips %s' % res['zero_duration_clips']
    assert not res['missing_meshes'], 'missing meshes %s' % res['missing_meshes']
    return res

# ------------------------------------------------------------------------------------------
# Proof renders (Workbench, flat studio light, orthographic)
# ------------------------------------------------------------------------------------------
TILE = (360, 480)

def flat_mat(name, rgba):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = rgba
    bsdf.inputs['Roughness'].default_value = 1.0
    m.diffuse_color = rgba
    return m

def setup_render():
    """EEVEE, one warm key sun + cool grey ambient: close to the game's lambert look."""
    sc = bpy.context.scene
    try:
        sc.render.engine = 'BLENDER_EEVEE_NEXT'
    except TypeError:
        sc.render.engine = 'BLENDER_WORKBENCH'
    sc.render.resolution_x, sc.render.resolution_y = TILE
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'Standard'
    try:
        sc.eevee.taa_render_samples = 16
    except Exception:
        pass
    sc.render.image_settings.file_format = 'PNG'
    world = bpy.data.worlds.new('W'); sc.world = world
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = (0.50, 0.53, 0.56, 1)
    bg.inputs['Strength'].default_value = 1.0
    sd = bpy.data.lights.new('Sun', 'SUN'); sd.energy = 3.2; sd.color = (1.0, 0.96, 0.88); sd.angle = math.radians(8)
    sun = bpy.data.objects.new('Sun', sd); sc.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(50), 0, math.radians(-30))
    cam_d = bpy.data.cameras.new('Cam'); cam_d.type = 'ORTHO'; cam_d.sensor_fit = 'HORIZONTAL'
    cam = bpy.data.objects.new('Cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
    # label text
    td = bpy.data.curves.new('Label', 'FONT'); td.size = 0.1; td.align_x = 'CENTER'
    lab = bpy.data.objects.new('Label', td); sc.collection.objects.link(lab)
    lm = flat_mat('LabelMat', (0.01, 0.01, 0.012, 1)); td.materials.append(lm)
    # ground disc
    bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=24, radius=0.7)
    gm = bpy.data.meshes.new('Ground'); bm.to_mesh(gm); bm.free()
    g = bpy.data.objects.new('Ground', gm); sc.collection.objects.link(g); g.location.z = -0.002
    gmat = flat_mat('GroundMat', (0.20, 0.25, 0.14, 1)); gm.materials.append(gmat)
    # 1.9 m reference capsule (hidden unless asked)
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=0.22)
    for v in bm.verts:
        v.co.z += (1.9 - 0.44) if v.co.z > 0 else 0
        v.co.z += 0.22
    cm = bpy.data.meshes.new('Capsule'); bm.to_mesh(cm); bm.free()
    cap = bpy.data.objects.new('Capsule_1.9m', cm); sc.collection.objects.link(cap)
    cmat = flat_mat('CapsuleMat', (0.30, 0.42, 0.62, 1)); cm.materials.append(cmat)
    cap.hide_render = True
    return cam, lab, g, cap

def _eval_points(objs):
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in objs:
        if o.hide_render:
            continue
        oe = o.evaluated_get(dg)
        me = oe.to_mesh()
        pts += [oe.matrix_world @ v.co for v in me.vertices]
        oe.to_mesh_clear()
    return pts

def render_tile(path, label, visible, cam, lab, view_dir, focus=None, pad=1.18, extra=(), up_extra=0.0):
    """view_dir: direction FROM subject TO camera (armature space). focus: optional point
    list override for framing (e.g. head close-ups)."""
    sc = bpy.context.scene
    vd = Vector(view_dir).normalized()
    pts = focus if focus is not None else _eval_points(visible) + [Vector(p) for p in extra]
    right = Vector((0, 0, 1)).cross(vd).normalized()
    up = vd.cross(right).normalized()
    xs = [p.dot(right) for p in pts]; ys = [p.dot(up) for p in pts]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    aspect = TILE[0] / TILE[1]
    scale = max(w, h * aspect) * pad
    hgt = scale / aspect
    label_room = hgt * 0.10
    hgt += label_room
    scale = hgt * aspect
    cy_c = cy - label_room / 2
    center = right * cx + up * cy_c
    # depth: centre of points along vd
    dmid = sum(p.dot(vd) for p in pts) / len(pts)
    cam.location = center + vd * (dmid + 20)
    cam.rotation_euler = (-vd).to_track_quat('-Z', 'Y').to_euler()
    cam.data.ortho_scale = scale
    cam.data.clip_end = 100
    # label at bottom of frame
    lab.data.body = label
    lab.data.size = scale * 0.055
    lab.location = center + vd * (dmid + 5) - up * (hgt / 2 - scale * 0.05)
    lab.rotation_euler = cam.rotation_euler
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path

def show_only(objs_all, visible):
    for o in objs_all.values():
        o.hide_render = o not in visible
        o.hide_viewport = o not in visible


# ---- render-only held props (NOT exported; the runtime attaches its own gear) -------------
def build_props(arm):
    steel = flat_mat('P_Steel', (0.42, 0.44, 0.47, 1))
    wood = flat_mat('P_Wood', (0.22, 0.12, 0.05, 1))
    def mk(name, parts, bone):
        bm = bmesh.new()
        mlist = []
        for (c, sz, m) in parts:
            r = bmesh.ops.create_cube(bm, size=1.0)
            for v in r['verts']:
                v.co = Vector((v.co.x * sz[0] + c[0], v.co.y * sz[1] + c[1], v.co.z * sz[2] + c[2]))
            if m not in mlist:
                mlist.append(m)
            for f in {f for v in r['verts'] for f in v.link_faces}:
                f.material_index = mlist.index(m)
        me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
        for m in mlist:
            me.materials.append(m)
        ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
        # place in the palm at REST, then bone-parent keeping the world transform
        side = 'Left' if bone.startswith('mixamorig:Left') else 'Right'
        sx = 1 if side == 'Left' else -1
        W = Vector((.26 * sx, 0, .93)); Hn = Vector((.2711 * sx, -.0222, .7076))
        grip = W + (Hn - W) * .45
        ob.location = grip
        pb = arm.pose.bones[bone]
        bpy.context.view_layer.update()
        mw = ob.matrix_world.copy()
        ob.parent = arm; ob.parent_type = 'BONE'; ob.parent_bone = bone
        rest_bone_w = arm.matrix_world @ pb.bone.matrix_local @ Matrix.Translation((0, pb.bone.length, 0))
        ob.matrix_parent_inverse = rest_bone_w.inverted()
        ob.matrix_basis = mw
        ob.hide_render = True
        return ob
    P_ = {}
    P_['sword'] = mk('Prop_Sword', [((0, -.42, 0), (.012, .66, .05), steel), ((0, -.08, 0), (.03, .03, .16), steel),
                                    ((0, .02, 0), (.025, .16, .025), wood)], B('RightHand'))
    P_['axe'] = mk('Prop_Axe', [((0, -.22, 0), (.03, .62, .03), wood), ((0, -.50, -.05), (.018, .09, .15), steel)], B('RightHand'))
    P_['pick'] = mk('Prop_Pick', [((0, -.25, 0), (.03, .68, .03), wood), ((0, -.56, 0), (.025, .04, .46), steel)], B('RightHand'))
    P_['hammer'] = mk('Prop_Hammer', [((0, -.14, 0), (.03, .38, .03), wood), ((0, -.33, 0), (.07, .08, .15), steel)], B('RightHand'))
    P_['bow'] = mk('Prop_Bow', [((0, 0, 0), (.03, .10, .035), wood), ((0, -.30, .03), (.022, .52, .03), wood),
                                ((0, .30, .03), (.022, .52, .03), wood)], B('LeftHand'))
    P_['shield'] = mk('Prop_Shield', [((.07, 0, .10), (.035, .40, .44), wood), ((.09, 0, .10), (.02, .12, .12), steel)], B('LeftHand'))
    return P_

CLIP_SHOTS = {  # clip -> (frame, props, view_dir)
    'idle': (30, [], (.6, -.8, .2)), 'walk': (0, [], (.95, -.3, .15)), 'run': (4, [], (.95, -.3, .15)),
    'attack_slash': (5, ['sword'], (.6, -.8, .2)), 'attack_stab': (9, ['sword'], (.9, -.4, .15)),
    'attack_crush': (12, ['sword'], (.8, -.6, .2)), 'bow': (18, ['bow'], (.35, -.9, .2)), 'cast': (14, [], (.8, -.6, .2)),
    'chop': (0, ['axe'], (.5, -.85, .2)), 'mine': (11, ['pick'], (.9, -.4, .2)), 'net': (16, [], (.9, -.4, .2)),
    'cook': (9, [], (.9, -.4, .2)), 'smith': (0, ['hammer'], (.8, -.6, .2)), 'smelt': (14, [], (.9, -.4, .2)),
    'climb': (0, [], (.9, -.4, .2)), 'block': (4, ['sword', 'shield'], (.6, -.8, .2)), 'hit': (3, [], (.9, -.4, .2)),
    'death': (40, [], (.75, -.45, .6)),
}
RECOLOR_A = {'R_TUNIC': '#37506e', 'R_LEGS': '#58585a', 'R_HAIR': '#1f1b18', 'R_BOOTS': '#2e2620', 'R_BELT': '#6b4a26'}
RECOLOR_B = {'R_TUNIC': '#8a2e2a', 'R_LEGS': '#8c7a55', 'R_HAIR': '#c9a45a', 'R_SKIN': '#7a5238', 'R_BOOTS': '#4a3322', 'R_BELT': '#2a1a0c'}

def run_renders(arm, mats, objs, clips):
    cam, lab, ground, cap = setup_render()
    props = build_props(arm)
    tiles = []
    def shot(fname, label, vis, vd, focus=None, capsule=False, pr=()):
        show_only(objs, vis)
        for k, pobj in props.items():
            pobj.hide_render = k not in pr
        vis_all = list(vis) + [props[k] for k in pr]
        extra = []
        if capsule:
            vdn = Vector(vd).normalized(); right = Vector((0, 0, 1)).cross(vdn).normalized()
            cap.location = right * 0.62
            cap.hide_render = False
            extra = [cap.location + Vector((0, 0, 1.9)), cap.location + right * .22]
        else:
            cap.hide_render = True
        p = render_tile(os.path.join(RENDER_DIR, fname), label, vis_all, cam, lab, vd, focus=focus, extra=extra)
        tiles.append(p)
    def set_clip(name, frame):
        arm.animation_data.action = clips[name]
        bpy.context.scene.frame_set(frame)
    M, F = objs['Body_Male'], objs['Body_Female']
    hs = objs['Hair_Short']
    set_clip('idle', 0)
    # turnaround vs 1.9 m capsule
    for vn, vd in (('front', (0, -1, 0)), ('side', (1, 0, 0)), ('back', (0, 1, 0))):
        shot('turn_%s.png' % vn, 'turnaround %s | capsule 1.9m' % vn, [M, hs], vd, capsule=True)
    # both bodies
    shot('body_male.png', 'Body_Male + Hair_Short', [M, hs], (.6, -.8, .15))
    shot('body_female.png', 'Body_Female + Hair_Ponytail', [F, objs['Hair_Ponytail']], (.6, -.8, .15))
    shot('body_female_side.png', 'Body_Female side', [F, objs['Hair_Long']], (1, -.12, .1))
    # hair + beard close-ups
    head_focus = [Vector((x, y, z)) for x in (-.24, .24) for y in (-.24, .24) for z in (1.36, 1.92)]
    looks = [('Hair_Short', [objs['Hair_Short']]), ('Hair_Long', [objs['Hair_Long']]), ('Hair_Ponytail', [objs['Hair_Ponytail']]),
             ('Hair_Bun', [objs['Hair_Bun']]), ('Hair_Mohawk', [objs['Hair_Mohawk']]), ('Bald (no hair)', []),
             ('Beard_Full + Hair_Short', [objs['Beard_Full'], objs['Hair_Short']])]
    for lbl, extra_objs in looks:
        tag = lbl.split(' ')[0].lower()
        shot('hair_%s_front.png' % tag, lbl, [M] + extra_objs, (.55, -.8, .15), focus=head_focus)
        shot('hair_%s_back.png' % tag, lbl + ' (back)', [M] + extra_objs, (-.6, .75, .2), focus=head_focus)
    shot('hair_long_female.png', 'Body_Female + Hair_Long', [F, objs['Hair_Long']], (.55, -.8, .15), focus=head_focus)
    shot('hair_bun_female.png', 'Body_Female + Hair_Bun', [F, objs['Hair_Bun']], (-.6, .75, .2), focus=head_focus)
    # recolours
    shot('color_default.png', 'default palette', [M, hs], (.6, -.8, .15))
    set_palette(mats, RECOLOR_A)
    shot('color_a.png', 'recolour A (female, long)', [F, objs['Hair_Long']], (.6, -.8, .15))
    set_palette(mats, PALETTE)
    set_palette(mats, RECOLOR_B)
    shot('color_b.png', 'recolour B (mohawk+beard)', [M, objs['Hair_Mohawk'], objs['Beard_Full']], (.6, -.8, .15))
    set_palette(mats, PALETTE)
    # one key frame per clip
    for cname, (fr, pr, vd) in CLIP_SHOTS.items():
        set_clip(cname, fr)
        shot('clip_%s.png' % cname, '%s  f%d' % (cname, fr), [M, hs], vd, pr=pr)
    set_clip('idle', 0)
    make_sheet(tiles, os.path.join(RENDER_DIR, 'sheet.png'))
    return tiles

def make_sheet(paths, out, cols=8):
    import numpy as np
    tw, th = TILE
    rows = (len(paths) + cols - 1) // cols
    sheet = np.ones((rows * th, cols * tw, 4), dtype=np.float32)
    sheet[..., :3] = 0.35
    for i, p in enumerate(paths):
        img = bpy.data.images.load(p)
        w, h = img.size
        px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1]   # top-down
        r, c = divmod(i, cols)
        sheet[r * th:r * th + h, c * tw:c * tw + w] = px[:th, :tw]
        bpy.data.images.remove(img)
    out_img = bpy.data.images.new('sheet', cols * tw, rows * th, alpha=True)
    out_img.pixels = sheet[::-1].ravel()
    out_img.filepath_raw = out
    out_img.file_format = 'PNG'
    out_img.save()

# ------------------------------------------------------------------------------------------
# Manifest + report
# ------------------------------------------------------------------------------------------
def tri_count(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)

def rest_height(obs):
    return max((ob.matrix_world @ v.co).z for ob in obs for v in ob.data.vertices)

def main():
    os.makedirs(WS, exist_ok=True)
    os.makedirs(RENDER_DIR, exist_ok=True)
    arm, mats, objs, clips = build_all()
    blend = os.path.join(WS, 'player.blend')
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    tris = {n: tri_count(o) for n, o in objs.items()}
    bodies = ['Body_Male', 'Body_Female']
    hairs = [None] + ['Hair_' + s for s in HAIR_STYLES]
    beards = [None, 'Beard_Full']
    combos = {}
    for b in bodies:
        for h in hairs:
            for bd in beards:
                key = '+'.join(x for x in (b, h or 'Bald', bd or 'Beard_None'))
                combos[key] = tris[b] + (tris[h] if h else 0) + (tris[bd] if bd else 0)
    heights = {
        'Body_Male+Hair_Short': round(rest_height([objs['Body_Male'], objs['Hair_Short']]), 4),
        'Body_Male (bald)': round(rest_height([objs['Body_Male']]), 4),
        'all_variants_bbox': round(rest_height(list(objs.values())), 4),
    }
    export_glb(OUT_GLB, arm, list(objs.values()))
    export_glb(OUT_DEFAULT_GLB, arm, [objs['Body_Male'], objs['Hair_Short']])
    want_clips = list(clips.keys())
    res = validate(OUT_GLB, list(objs.keys()), want_clips)
    res_def = validate(OUT_DEFAULT_GLB, ['Body_Male', 'Hair_Short'], want_clips)
    print('VALIDATION', json.dumps(res, indent=1))
    # reload the saved scene for renders (validate() reset it)
    bpy.ops.wm.open_mainfile(filepath=blend)
    arm = bpy.data.objects['Armature']
    objs = {n: bpy.data.objects[n] for n in objs}
    clips = {n: bpy.data.actions[n] for n in clips}
    mats = {n: bpy.data.materials[n] for n in PALETTE}
    tiles = []
    if DO_RENDER:
        tiles = run_renders(arm, mats, objs, clips)
    defs = clip_defs()
    manifest = {
        'asset': 'holm_player_v1',
        'glb': os.path.relpath(OUT_GLB, REPO).replace('\\', '/'),
        'glb_default_look': os.path.relpath(OUT_DEFAULT_GLB, REPO).replace('\\', '/'),
        'builder': 'tools/blender/build_holm_player_v1.py',
        'blend': os.path.relpath(blend, REPO).replace('\\', '/'),
        'forward_axis': {'gltf': '+Z', 'blender': '-Y', 'note': 'same as assets/models/player.glb; installPlayerGLB keeps rig.rotation.y = 0'},
        'up_axis': '+Y (glTF)', 'units': 'metres', 'feet_at': 0.0,
        'height_m': heights,
        'bones': [{'name': b[0], 'parent': b[1]} for b in BONES],
        'bone_match_vs_player_glb': {k: res[k] for k in ('bone_names_match', 'bone_order_match', 'hierarchy_match', 'blender_reimport_bones_match',
                                                          'max_rest_translation_delta_m', 'max_rest_rotation_delta_deg')},
        'clips': {n: {'duration_s': res['clips'].get(n), 'frames': (defs[n][0] if n in defs else defs['attack_slash'][0]),
                      'fps': FPS, 'loop': (defs[n][2] if n in defs else False),
                      **({'alias_of': 'attack_slash'} if n == 'attack' else {})} for n in want_clips},
        'variant_meshes': {'bodies': bodies, 'hair': ['Hair_' + s for s in HAIR_STYLES], 'hair_none': 'bald = hide all Hair_*',
                           'beard': ['Beard_Full'], 'beard_none': 'Beard_None = hide Beard_Full'},
        'material_regions': MAT_ORDER,
        'material_count': len(res['materials']),
        'default_colors_srgb': PALETTE,
        'tris_per_mesh': tris,
        'tris_per_variant_combo': combos,
        'max_tris_body_hair_beard': max(combos.values()),
        'validation': {'full': res['PASS'], 'default_look': res_def['PASS']},
        'renders': [os.path.relpath(t, REPO).replace('\\', '/') for t in tiles] + ([os.path.relpath(os.path.join(RENDER_DIR, 'sheet.png'), REPO).replace('\\', '/')] if tiles else []),
    }
    with open(os.path.join(WS, 'manifest.json'), 'w', encoding='utf-8') as fh:
        json.dump(manifest, fh, indent=2)
    write_report(manifest, res)
    print('MANIFEST', json.dumps({k: manifest[k] for k in ('height_m', 'max_tris_body_hair_beard', 'material_count', 'validation')}, indent=1))

def write_report(m, res):
    L = []
    L.append('# holm_player_v1 -- canonical Blender-authored player\n')
    L.append('Built by `tools/blender/build_holm_player_v1.py` (Blender 4.5, headless). Everything -- mesh, weights, clips -- is authored procedurally in Blender; nothing imported.\n')
    L.append('## Files\n')
    L.append('- `%s` -- all variant meshes + all clips' % m['glb'])
    L.append('- `%s` -- Body_Male + Hair_Short only (zero-code drop-in for `installPlayerGLB(cb, url)`)' % m['glb_default_look'])
    L.append('- `%s`, `manifest.json`, this report' % m['blend'])
    L.append('- proof renders: `scratchpad/holm_player_v1/` (`sheet.png` = everything)\n')
    L.append('## Drop-in contract vs assets/models/player.glb\n')
    bm = m['bone_match_vs_player_glb']
    L.append('- bone names match: **%s** (order match: %s, hierarchy match: %s, Blender re-import match: %s)' % (
        bm['bone_names_match'], bm['bone_order_match'], bm['hierarchy_match'], bm['blender_reimport_bones_match']))
    L.append('- rest pose deviation: max %.5f m translation, %.3f deg rotation' % (bm['max_rest_translation_delta_m'], bm['max_rest_rotation_delta_deg']))
    L.append('- forward: glTF +Z (Blender -Y); feet at 0; height %s' % json.dumps(m['height_m']))
    L.append('- materials (%d): %s -- recolorPlayer strips `R_` so regions are skin/hair/tunic/belt/legs/boots (+eyes)\n' % (m['material_count'], ', '.join(m['material_regions'])))
    L.append('## Clips (30 fps, in place)\n')
    L.append('| clip | seconds | frames | loop |')
    L.append('|---|---|---|---|')
    for n, c in m['clips'].items():
        L.append('| %s | %s | %s | %s |' % (n + (' (alias of attack_slash)' if c.get('alias_of') else ''), c['duration_s'], c['frames'], 'yes' if c['loop'] else 'once'))
    L.append('\n## Variants + triangle budget (<= 4000 for body + one hair + beard)\n')
    for n, t in m['tris_per_mesh'].items():
        L.append('- %s: %d tris' % (n, t))
    L.append('- worst combo: %d tris (%s)\n' % (m['max_tris_body_hair_beard'], max(m['tris_per_variant_combo'], key=m['tris_per_variant_combo'].get)))
    L.append('## Runtime notes (no runtime files were edited)\n')
    L.append('- The full GLB contains every variant; glTF has no visibility flag, so the loader must hide the unused ones after load, e.g. '
             '`rig.traverse(o=>{ if(/^(Body_|Hair_|Beard_)/.test(o.name)) o.visible = [bodyName, hairName, beardName].includes(o.name); })` '
             '(three.js names the skinned mesh node exactly `Body_Male` etc.). Until that exists, use `holm_player_v1_default.glb`.')
    L.append('- `installPlayerGLB` normalises the whole scene bbox to 1.85 m; with every variant visible the bbox top is the mohawk, so hide variants BEFORE measuring or the character shrinks ~2%.')
    L.append('- `playerGLBAnim` only drives idle/walk/attack/block; the other clips are in the GLB for the skilling/combat code to play. `death` should use LoopOnce + clampWhenFinished.')
    L.append('- `refreshGLBGear` hides meshes whose name matches /hair/ under a helm -- Hair_* names satisfy that; Beard_Full stays visible (OSRS-correct).\n')
    L.append('## Validation\n')
    L.append('```json\n%s\n```\n' % json.dumps(res, indent=1))
    with open(os.path.join(WS, 'REPORT.md'), 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(L))

if __name__ == '__main__':
    main()
