"""build_holm_characters_v2.py -- Crafted Realms MODULAR IDENTITY KIT v2 (2004-style) + Guide Bram from the kit.

Why v2: the owner rejected the v1 box characters (cuboid limbs, square heads, block hands/feet) and asked for
characters very close to the 2004-era look, customisable like its character creator: head/hair, jaw, torso,
arms, hands, legs, feet, and five recolour channels. Every part here is our own design.

Style: organic low-poly. Parts are lofted 8-16 sided rings along the bones -- a rounded skull with a jaw,
cheek planes and a nose bump, small flat facial features, a neck, sloped shoulders, a torso tapering to the
waist, tapered arms/legs with elbow/knee breaks, mitten hands with a thumb, shoes with a toe -- and clothing
shells that follow the shared body surface so any combination fits. Organic parts are smooth (gouraud-soft)
shaded while the low-poly facets stay readable; tiny details (eyes, mouth, buckles) are flat.

Kit (one shared rig, every part a separate skinned mesh named Kit_<A|B>_<Slot>_<nn>):
  body type A: Hair 10, Jaw 8, Torso 8, Arms 7, Hands 3, Legs 6, Feet 3
  body type B: Hair 11, Torso 5, Arms 6, Hands 3, Legs 9, Feet 3
  (the Hair part carries the head: skull, face, ears, neck; bald = Hair part with no hair shell)
Recolour channels = material names: C_HAIR (hair + jaw + brows), C_TORSO (torso + arm cloth), C_LEGS,
C_FEET, C_SKIN; fixed accents A_BELT A_METAL A_EYES A_SHIRT A_TRIM A_SASH (Bram adds A_WOOD).
Palettes: assets/models/holm_kit_v2_palettes.json (hair 12, torso 16, legs 16, feet 6, skin 8).

Rig contract: EXACT 23 mixamorig:* bone names / hierarchy / rest pose of assets/models/player.glb, glTF +Z
forward (= Blender -Y), feet at 0, ~1.85 m. Smooth vertex weights: every vertex is projected onto its bone
chain and blended across each joint with smoothstep zones. Colours are stored as the sRGB values to SEE
(three r128, no colour management); proof renders convert them to linear.

Clips (kit GLB): idle walk run attack_slash attack(alias) attack_stab attack_crush bow cast chop mine net cook
smith smelt climb block hit death talk wave (player keyframe logic retargeted from build_holm_player_v1.py).
Bram GLB: idle talk walk wave (holding his staff).

Run:  "C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe" -b --python tools/blender/build_holm_characters_v2.py -- [--no-render] [--quick]
Outputs (all new): assets/models/holm_kit_v2.glb, assets/models/holm_kit_v2_palettes.json,
  assets/models/holm_tutor_bram_v2.glb, .studio-workspaces/holm-characters-v2/candidates/{characters.blend,
  manifest.json, REPORT.md}, scratchpad/holm_characters_v2/*.png (proof sheets)
"""
import bpy, bmesh, math, json, os, sys, struct, subprocess, shutil, random
from mathutils import Vector, Matrix, Quaternion, Euler

REPO = r"C:\Users\iQwaZ\OneDrive\Desktop\CraftedRealms-Claude"
REF_GLB = os.path.join(REPO, "assets", "models", "player.glb")
OUT_KIT = os.path.join(REPO, "assets", "models", "holm_kit_v2.glb")
OUT_PAL = os.path.join(REPO, "assets", "models", "holm_kit_v2_palettes.json")
OUT_BRAM = os.path.join(REPO, "assets", "models", "holm_tutor_bram_v2.glb")
V1_PLAYER = os.path.join(REPO, "assets", "models", "holm_player_v1_default.glb")
V1_BRAM = os.path.join(REPO, "assets", "models", "holm_tutor_bram.glb")
WS = os.path.join(REPO, ".studio-workspaces", "holm-characters-v2", "candidates")
RENDER_DIR = os.path.join(REPO, "scratchpad", "holm_characters_v2")
BIBLE = os.path.join(REPO, "Bible_References")
REF_TURN = os.path.join(BIBLE, "Character", "male_concepts", "male_b_turnaround.png")
REF_CREATOR = os.path.join(BIBLE, "Character_Creator_Screen.jpg")
REF_NPC = os.path.join(BIBLE, "Character.jpg")
FPS = 30
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
DO_RENDER = "--no-render" not in ARGS
QUICK = "--quick" in ARGS

# ------------------------------------------------------------------------------------------
# Skeleton: verbatim (head, tail, roll) from assets/models/player.glb (same table as v1).
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
BHEAD = {b[0]: Vector(b[2]) for b in BONES}
BTAIL = {b[0]: Vector(b[3]) for b in BONES}

# ------------------------------------------------------------------------------------------
# Materials / palettes (sRGB hex, our own values)
# ------------------------------------------------------------------------------------------
PALETTES = {
    'hair': ['#2a1f18', '#4a3020', '#6a4a2a', '#8a5a30', '#a8773e', '#c9a45a', '#e0c890', '#8e3a1c',
             '#b85a2a', '#9a9690', '#d8d6d0', '#1a1a1e'],
    'torso': ['#647a4e', '#3f6234', '#8a2e2a', '#5a2a24', '#37506e', '#26345a', '#6e8aa8', '#8c7a55',
              '#b8a07a', '#6a4a2a', '#4a3a2c', '#5e3e6e', '#c8a040', '#d8d0b8', '#58585a', '#2e2e30'],
    'legs': ['#3b2e1e', '#58585a', '#2e2e30', '#4a3a2c', '#6a5a40', '#8c7a55', '#26345a', '#37506e',
             '#3f6234', '#5a4a1e', '#8a2e2a', '#5a2a24', '#d8d0b8', '#b8a07a', '#5e3e6e', '#6a4a2a'],
    'feet': ['#6e4626', '#4a3019', '#2e2620', '#8a6a44', '#58585a', '#7a2e22'],
    'skin': ['#f0c8a0', '#e0b088', '#c8966e', '#b18b71', '#a0704e', '#86583a', '#6a4430', '#4e3024'],
}
def _desat(hx, k=.12):
    r, g, b = (int(hx.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4))
    l = .299 * r + .587 * g + .114 * b
    return '#%02x%02x%02x' % tuple(round(c + (l - c) * k) for c in (r, g, b))

PALETTES = {ch: [_desat(h) for h in cols] for ch, cols in PALETTES.items()}   # v2.4: 2004-like slightly muted mid tones
CHANNEL_MAT = {'hair': 'C_HAIR', 'torso': 'C_TORSO', 'legs': 'C_LEGS', 'feet': 'C_FEET', 'skin': 'C_SKIN'}
ACCENTS = {'A_BELT': '#4a3019', 'A_METAL': '#8c8e90', 'A_EYES': '#1e1612', 'A_SHIRT': '#bdb39b',
           'A_TRIM': '#d8cc94', 'A_SASH': '#8a2e2a'}
DEFAULT_COLORS = {   # palette indices per body type
    'A': {'hair': 2, 'torso': 0, 'legs': 0, 'feet': 0, 'skin': 2},
    'B': {'hair': 3, 'torso': 2, 'legs': 3, 'feet': 1, 'skin': 1},
}
BRAM_COLORS = {k: _desat(v) for k, v in {'C_HAIR': '#9c9a96', 'C_TORSO': '#3f6234', 'C_LEGS': '#4e4a44', 'C_FEET': '#6a4226',
               'C_SKIN': '#c08c6c', 'A_WOOD': '#7a5a36'}.items()}
MAT_SRGB = {}   # material name -> sRGB tuple (what the GLB stores and the game shows)

def srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def hex_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))

def new_mat(name, hx):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value = 1.0
    bsdf.inputs['Metallic'].default_value = 0.0
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.0
    m.roughness = 1.0
    m.metallic = 0.0
    set_mat_color(m, hx)
    return m

def set_mat_color(m, hx, linear=False):
    rgb = hex_rgb(hx)
    MAT_SRGB[m.name] = rgb
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    c = tuple(srgb_to_lin(x) for x in rgb) if linear else rgb
    bsdf.inputs['Base Color'].default_value = c + (1.0,)
    m.diffuse_color = rgb + (1.0,)

def make_kit_materials(bt='A'):
    mats = {}
    for ch, mn in CHANNEL_MAT.items():
        mats[mn] = new_mat(mn, PALETTES[ch][DEFAULT_COLORS[bt][ch]])
    for mn, hx in ACCENTS.items():
        mats[mn] = new_mat(mn, hx)
    return mats

def set_render_colors(linear):
    """linear=True: Base Color := linear(sRGB) so Blender renders SHOW the stored sRGB value."""
    for m in bpy.data.materials:
        rgb = MAT_SRGB.get(m.name)
        if rgb is None or not m.use_nodes:
            continue
        bsdf = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if bsdf is not None:
            c = tuple(srgb_to_lin(x) for x in rgb) if linear else rgb
            bsdf.inputs['Base Color'].default_value = c + (1.0,)

def apply_outfit_colors(mats, colors, linear=True):
    """colors: {channel: hex}"""
    for ch, hx in colors.items():
        mn = CHANNEL_MAT.get(ch, ch)
        if mn in mats:
            set_mat_color(mats[mn], hx, linear)

# ------------------------------------------------------------------------------------------
# Smooth skin weights
# ------------------------------------------------------------------------------------------
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))

def ss(e0, e1, x):
    if e1 == e0:
        return 1.0 if x >= e1 else 0.0
    t = clamp((x - e0) / (e1 - e0))
    return t * t * (3 - 2 * t)

def wnorm(ws):
    if isinstance(ws, str):
        return [(ws, 1.0)]
    acc = {}
    for b, w in ws:
        acc[b] = acc.get(b, 0.0) + w
    items = sorted(((b, w) for b, w in acc.items() if w > 0.015), key=lambda x: -x[1])[:4]
    tot = sum(w for _, w in items) or 1.0
    return [(b, w / tot) for b, w in items]

def wmix(a, b, t):
    a, b = wnorm(a), wnorm(b)
    return [(n, w * (1 - t)) for n, w in a] + [(n, w * t) for n, w in b]

def chain_w(pts, bones, h, root=None, root_s=0.0, root_h=0.05):
    """Project a vertex onto the joint polyline pts (bone i spans pts[i]..pts[i+1]) and blend bone i-1 -> i
    across joint i within +-h (smoothstep). Optional root bone blended in before pts[0]."""
    pts = [Vector(p) for p in pts]
    segs, cum = [], [0.0]
    for a, b in zip(pts, pts[1:]):
        segs.append((a, b, (b - a).length))
        cum.append(cum[-1] + (b - a).length)
    hs = h if isinstance(h, (list, tuple)) else [h] * (len(bones) - 1)

    def f(p):
        p = Vector(p)
        best = None
        for i, (a, b, L) in enumerate(segs):
            d = b - a
            t = (p - a).dot(d) / (L * L)
            lo = -10 if i == 0 else 0.0
            hi = 10 if i == len(segs) - 1 else 1.0
            t = max(lo, min(hi, t))
            dist = (a + d * t - p).length
            if best is None or dist < best[0] - 1e-9:
                best = (dist, cum[i] + t * L)
        s = best[1]
        e = [1.0] + [ss(cum[k] - hs[k - 1], cum[k] + hs[k - 1], s) for k in range(1, len(bones))] + [0.0]
        out = [(bones[i], max(0.0, e[i] - e[i + 1])) for i in range(len(bones))]
        if root:
            wr = 1.0 - ss(root_s - root_h, root_s + root_h, s)
            out = [(root, wr)] + [(b, w * (1 - wr)) for b, w in out]
        return wnorm(out)
    return f

SPINE_W = chain_w([(0, 0, 0.60), (0, 0, 1.05), (0, 0, 1.16), (0, 0, 1.28), (0, 0, 1.445), (0, 0, 1.52), (0, 0, 2.0)],
                  [B('Hips'), B('Spine'), B('Spine1'), B('Spine2'), B('Neck'), B('Head')], [.05, .05, .05, .035, .03])
NECK_W = chain_w([(0, 0, 1.30), (0, 0, 1.425), (0, 0, 1.51), (0, 0, 1.9)], [B('Spine2'), B('Neck'), B('Head')], [.035, .03])

def torso_w(p, arm_share=0.5, leg_share=0.6):
    p = Vector(p)
    w = SPINE_W(p)
    side = 'Left' if p.x > 0 else 'Right'
    a = arm_share * ss(0.12, 0.19, abs(p.x)) * ss(1.25, 1.36, p.z)
    if a > 0:
        w = wmix(w, B(side + 'Arm'), a)
    u = leg_share * ss(0.97, 0.84, p.z)
    if u > 0:
        k = ss(-0.03, 0.03, p.x)
        w = wmix(w, [(B('LeftUpLeg'), k), (B('RightUpLeg'), 1 - k)], u)
    return wnorm(w)

def skirt_w(p):
    """coat tails / skirts / aprons: hips blending into the thighs going down (sides follow their leg)."""
    p = Vector(p)
    if p.z >= 0.97:
        return torso_w(p)
    u = 0.78 * ss(0.97, 0.50, p.z)
    k = ss(-0.05, 0.05, p.x)
    return wnorm(wmix(B('Hips'), [(B('LeftUpLeg'), k), (B('RightUpLeg'), 1 - k)], u))

def arm_w(sx):
    sd = 'Left' if sx > 0 else 'Right'
    return chain_w([BHEAD[B(sd + 'Arm')], BHEAD[B(sd + 'ForeArm')], BHEAD[B(sd + 'Hand')], BTAIL[B(sd + 'Hand')]],
                   [B(sd + 'Arm'), B(sd + 'ForeArm'), B(sd + 'Hand')], [.055, .035], root=B('Spine2'), root_s=.035, root_h=.045)

def leg_w(sx):
    sd = 'Left' if sx > 0 else 'Right'
    return chain_w([BHEAD[B(sd + 'UpLeg')], BHEAD[B(sd + 'Leg')], BHEAD[B(sd + 'Foot')]],
                   [B(sd + 'UpLeg'), B(sd + 'Leg')], [.06], root=B('Hips'), root_s=.02, root_h=.06)

def foot_w(sx):
    sd = 'Left' if sx > 0 else 'Right'
    L, F, T = B(sd + 'Leg'), B(sd + 'Foot'), B(sd + 'ToeBase')
    def f(p):
        p = Vector(p)
        up = ss(0.10, 0.17, p.z)
        toe = ss(-0.035, -0.085, p.y)
        return wnorm([(L, up), (F, (1 - up) * (1 - toe)), (T, (1 - up) * toe)])
    return f

def hair_w(p):
    if p.z > 1.60:
        return B('Head')
    if p.z > 1.50:
        return [(B('Head'), .6), (B('Neck'), .4)]
    return [(B('Head'), .35), (B('Neck'), .4), (B('Spine2'), .25)]

# ------------------------------------------------------------------------------------------
# Mesh builder
# ------------------------------------------------------------------------------------------
SHARP_DEG = 40.0   # v2.5 panel shading: smooth across a broad panel, hard edge wherever the form turns >= ~40 deg

class MB:
    def __init__(self):
        self.bm = bmesh.new()
        self.dl = self.bm.verts.layers.deform.verify()
        self.rl = self.bm.faces.layers.int.new('rim')   # 1 = cap / rim strip: a real edge of a piece (hard break allowed)
        self.mats = []

    def _mi(self, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        return self.mats.index(mat)

    def _v(self, p, w):
        v = self.bm.verts.new(p)
        if callable(w):
            w = w(Vector(p))
        for bname, x in wnorm(w):
            v[self.dl][BONE_NAMES.index(bname)] = x
        return v

    def _face(self, verts, mat, smooth, allf, rim=False):
        f = self.bm.faces.new(verts)
        f[self.rl] = 1 if rim else 0
        f.material_index = self._mi(mat)
        f.smooth = smooth   # v2.2: smooth + sharp edges split at ~30 deg (big planes read, tiny edges merge)
        allf.append(f)
        return f

    def loft(self, rings, mat, w, cap0=True, cap1=True, smooth=True, matfn=None, cap_mat=None):
        """rings: equal-length point lists. w: callable(point) or per-ring list. matfn(i, k) -> material."""
        vs = []
        const = callable(w) or isinstance(w, str) or (isinstance(w, list) and w and isinstance(w[0], tuple))
        for i, r in enumerate(rings):
            ww = w if const else w[i]
            vs.append([self._v(p, ww) for p in r])
        n = len(vs[0])
        allf = []
        for i in range(len(vs) - 1):
            a, b = vs[i], vs[i + 1]
            for k in range(n):
                q = (a[k], a[(k + 1) % n], b[(k + 1) % n], b[k])
                if len(set(q)) < 4:
                    continue
                self._face(q, matfn(i, k) if matfn else mat, smooth, allf)
        if cap0:
            self._face(vs[0], cap_mat or mat, smooth, allf, rim=True)
        if cap1:
            self._face(vs[-1], cap_mat or mat, smooth, allf, rim=True)
        bmesh.ops.recalc_face_normals(self.bm, faces=allf)
        return vs

    def thick_loft(self, outer, inner, mat, w, matfn=None, smooth=True, rim_mat=None, top_closed=True):
        """Closed thick tube (skirts, flared cuffs): outer/inner ring lists (same count); ring 0 = open hem
        (joined by a rim strip), last ring joined by a top strip."""
        wo = [self._vrow(r, w) for r in outer]
        wi = [self._vrow(r, w) for r in inner]
        n = len(outer[0])
        allf = []
        for i in range(len(outer) - 1):
            for k in range(n):
                k2 = (k + 1) % n
                m = matfn(i, k) if matfn else mat
                self._face((wo[i][k], wo[i][k2], wo[i + 1][k2], wo[i + 1][k]), m, smooth, allf)
                self._face((wi[i][k], wi[i + 1][k], wi[i + 1][k2], wi[i][k2]), m, smooth, allf, rim=True)
        for k in range(n):
            k2 = (k + 1) % n
            self._face((wo[0][k], wi[0][k], wi[0][k2], wo[0][k2]), rim_mat or mat, smooth, allf, rim=True)
            self._face((wo[-1][k], wo[-1][k2], wi[-1][k2], wi[-1][k]), mat, smooth, allf, rim=True)
        bmesh.ops.recalc_face_normals(self.bm, faces=allf)

    def _vrow(self, r, w):
        return [self._v(p, w if callable(w) else w) for p in r]

    def shell(self, outer, inner, matfn, w, smooth=True, edge_mat=None, wrap=False):
        """Thick patch. outer/inner [row][col]; matfn(i, j, side) -> material. Row 0 = free edge.
        wrap=True closes the columns into a loop and caps the last row (hair caps)."""
        R, C = len(outer), len(outer[0])
        vo = [[self._v(outer[i][j], w) for j in range(C)] for i in range(R)]
        vi = [[self._v(inner[i][j], w) for j in range(C)] for i in range(R)]
        allf = []
        cols = range(C) if wrap else range(C - 1)
        for i in range(R - 1):
            for j in cols:
                j2 = (j + 1) % C
                self._face((vo[i][j], vo[i][j2], vo[i + 1][j2], vo[i + 1][j]), matfn(i, j, 'o'), smooth, allf)
                self._face((vi[i][j], vi[i + 1][j], vi[i + 1][j2], vi[i][j2]), matfn(i, j, 'i'), smooth, allf, rim=True)
        for j in cols:
            j2 = (j + 1) % C
            self._face((vo[0][j], vi[0][j], vi[0][j2], vo[0][j2]), edge_mat or matfn(0, j, 'o'), smooth, allf, rim=True)
        if wrap:
            self._face(vo[-1], matfn(R - 2, 0, 'o'), smooth, allf)
            self._face(list(reversed(vi[-1])), matfn(R - 2, 0, 'i'), smooth, allf, rim=True)
        else:
            for j in cols:
                self._face((vo[-1][j], vo[-1][j + 1], vi[-1][j + 1], vi[-1][j]), edge_mat or matfn(R - 2, j, 'o'), smooth, allf, rim=True)
            for jj in (0, C - 1):
                for i in range(R - 1):
                    self._face((vo[i][jj], vo[i + 1][jj], vi[i + 1][jj], vi[i][jj]), edge_mat or matfn(i, min(jj, C - 2), 'o'), smooth, allf, rim=True)
        bmesh.ops.recalc_face_normals(self.bm, faces=allf)

    def cone(self, ring, apex, mat, w, smooth=True):
        vr = [self._v(p, w) for p in ring]
        va = self._v(apex, w)
        allf = []
        n = len(vr)
        for k in range(n):
            self._face((vr[k], vr[(k + 1) % n], va), mat, smooth, allf)
        self._face(list(reversed(vr)), mat, smooth, allf, rim=True)
        bmesh.ops.recalc_face_normals(self.bm, faces=allf)

    def box(self, center, size, mat, w, taper=1.0, smooth=False, rot=None):
        cx, cy, cz = center
        sx, sy, sz = (s / 2 for s in size)
        r0 = [(-sx, -sy, -sz), (sx, -sy, -sz), (sx, sy, -sz), (-sx, sy, -sz)]
        r1 = [(-sx * taper, -sy, sz), (sx * taper, -sy, sz), (sx * taper, sy, sz), (-sx * taper, sy, sz)]
        R = rot if rot is not None else Matrix.Identity(3)
        tr = lambda r: [tuple(Vector((cx, cy, cz)) + R @ Vector(p)) for p in r]
        self.loft([tr(r0), tr(r1)], mat, [w, w], smooth=smooth)

    def to_object(self, name, mats, arm, sharp_deg=64, coll=None):
        me = bpy.data.meshes.new(name)
        # v2.1: triangulate so every triangle is its own flat plane (non-planar quads would share one normal)
        bmesh.ops.triangulate(self.bm, faces=self.bm.faces[:], quad_method='BEAUTY', ngon_method='BEAUTY')
        # v2.2 in-between faceting: edges whose faces meet at more than SHARP_DEG are marked sharp (split normals);
        # flatter edges share normals so long planes read as one and tiny creases disappear
        # (Mesh.set_sharpness_by_angle does not exist in Blender 4.5, so this is done in bmesh)
        # v2.4 Gouraud look: smooth normals across every edge inside one material region; hard breaks only at
        # material/clothing boundaries, open edges, deliberately flat details and true creases sharper than SHARP_DEG
        self.bm.normal_update()
        lim = math.radians(SHARP_DEG)
        inner, inner_sharp = 0, 0
        for e in self.bm.edges:
            lf = e.link_faces
            if len(lf) != 2 or not (lf[0].smooth and lf[1].smooth):
                e.smooth = False
                continue
            if lf[0].material_index != lf[1].material_index:
                e.smooth = False
                continue
            e.smooth = lf[0].normal.angle(lf[1].normal, 0.0) < lim
            if lf[0][self.rl] or lf[1][self.rl]:
                continue
            inner += 1
            inner_sharp += 0 if e.smooth else 1
        self.inner_sharp = inner_sharp / max(1, inner)
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.mats:
            me.materials.append(mats[m])
        ob = bpy.data.objects.new(name, me)
        ob['inner_sharp_fraction'] = round(self.inner_sharp, 4)
        (coll or bpy.context.scene.collection).objects.link(ob)
        for bn in BONE_NAMES:
            ob.vertex_groups.new(name=bn)
        ob.parent = arm
        mod = ob.modifiers.new('Armature', 'ARMATURE')
        mod.object = arm
        return ob

# ---- ring / path helpers -----------------------------------------------------------------
def xring(c, axis, rs, rf, rb, n, front=(0, -1, 0), p=2.0, phase=0.0, bump=None):
    """Ring perpendicular to axis through c; vertex 0 toward `front`. rs sideways radius, rf/rb radius toward
    front/back, p superellipse exponent. bump(k) -> extra radius for vertex k (pleats, curls)."""
    c, axis = Vector(c), Vector(axis).normalized()
    f0 = Vector(front)
    f = (f0 - axis * f0.dot(axis)).normalized()
    s = axis.cross(f).normalized()
    e = 2.0 / p
    pts = []
    for k in range(n):
        a = 2 * math.pi * k / n + phase
        sa, ca = math.sin(a), math.cos(a)
        x = rs * math.copysign(abs(sa) ** e, sa)
        y = (rf if ca >= 0 else rb) * math.copysign(abs(ca) ** e, ca)
        v = s * x + f * y
        if bump:
            d = Vector((v.x, v.y, v.z))
            if d.length > 1e-9:
                v = v + d.normalized() * bump(k)
        pts.append(tuple(c + v))
    return pts

class Path:
    """Polyline through joints; u in [0, nseg]; integer u = joint; direction blended near joints."""
    def __init__(self, pts):
        self.p = [Vector(x) for x in pts]
        self.d = [(b - a).normalized() for a, b in zip(self.p, self.p[1:])]
    def pos(self, u):
        i = int(clamp(math.floor(u), 0, len(self.d) - 1))
        return self.p[i] + (self.p[i + 1] - self.p[i]) * (u - i)
    def dir(self, u, blend=0.2):
        i = int(clamp(math.floor(u), 0, len(self.d) - 1))
        t = u - i
        d = self.d[i]
        if i + 1 < len(self.d) and t > 1 - blend:
            d = d.lerp(self.d[i + 1], (t - (1 - blend)) / (2 * blend))
        if i > 0 and t < blend:
            d = d.lerp(self.d[i - 1], 0.5 - t / (2 * blend))
        return d.normalized()

def lerp_table(tab, z):
    if z <= tab[0][0]:
        return tab[0][1:]
    if z >= tab[-1][0]:
        return tab[-1][1:]
    for r0, r1 in zip(tab, tab[1:]):
        if r0[0] <= z <= r1[0]:
            t = (z - r0[0]) / (r1[0] - r0[0])
            return tuple(a + (b - a) * t for a, b in zip(r0[1:], r1[1:]))

def tube(mb, pts, radii, mat, w, n=5, front=(0, -1, 0), cap=True, smooth=True):
    pts = [Vector(p) for p in pts]
    rings = []
    for i, p in enumerate(pts):
        a = pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]
        r = radii[i]
        rs, rf = (r, r) if not isinstance(r, tuple) else r
        rings.append(xring(p, a, rs, rf, rf, n, front if abs(a.normalized().dot(Vector(front))) < .95 else (0, 0, 1)))
    return mb.loft(rings, mat, w, cap, cap, smooth=smooth)

def angtab(tab, sym=True):
    """tab: [(deg, value)] over 0..180 (sym) or -180..180; returns fn(theta)."""
    def f(theta):
        a = math.degrees(math.atan2(math.sin(theta), math.cos(theta)))
        if sym:
            a = abs(a)
        for (a0, v0), (a1, v1) in zip(tab, tab[1:]):
            if a0 <= a <= a1:
                t = (a - a0) / (a1 - a0)
                return v0 + (v1 - v0) * (0.5 - 0.5 * math.cos(math.pi * t))
        return tab[0][1] if a < tab[0][0] else tab[-1][1]
    return f

# ------------------------------------------------------------------------------------------
# BODY TYPES (A = male-ish, B = female-ish): shared surfaces every kit part is built on
# torso / pelvis rows: (z, rx, rF, rB, cy)
# ------------------------------------------------------------------------------------------
TORSO = {
    'A': [(0.940, .176, .112, .110, .026), (1.000, .172, .110, .106, .022), (1.080, .178, .116, .106, .018),
          (1.160, .188, .126, .108, .014), (1.240, .196, .132, .112, .010), (1.315, .202, .128, .112, .008),
          (1.380, .210, .114, .106, .006), (1.428, .194, .096, .094, .004), (1.465, .128, .076, .076, .004),
          (1.496, .074, .060, .062, .004), (1.518, .068, .060, .062, .004)],
    'B': [(0.940, .178, .106, .112, .026), (1.000, .154, .098, .100, .022), (1.060, .142, .096, .094, .018),
          (1.140, .150, .104, .096, .014), (1.215, .164, .132, .098, .010), (1.270, .170, .134, .100, .008),
          (1.330, .164, .112, .100, .008), (1.385, .166, .100, .096, .006), (1.430, .148, .086, .086, .004),
          (1.464, .108, .068, .070, .004), (1.492, .066, .054, .056, .004), (1.512, .062, .056, .058, .004)],
}
PELVIS = {
    'A': [(0.790, .128, .064, .068, .030), (0.850, .198, .096, .104, .028), (0.930, .204, .106, .114, .026),
          (0.985, .184, .108, .110, .024), (1.012, .174, .108, .106, .022)],
    'B': [(0.790, .130, .064, .070, .030), (0.850, .206, .098, .110, .028), (0.930, .210, .106, .122, .026),
          (0.985, .176, .100, .108, .024), (1.012, .160, .098, .101, .022)],
}
TORSO_P = 2.3
TORSO_PHASE = math.pi / 8   # v2.5: flat front / side / back panels + chamfers
ARM_R = {'A': [(-0.10, .072, .074), (0.06, .088, .090), (0.30, .076, .078), (0.70, .052, .054), (1.00, .044, .046),
               (1.30, .045, .045), (1.70, .034, .034), (2.00, .030, .031)]}
ARM_R['B'] = [(u, rs * .84, rf * .84) for u, rs, rf in ARM_R['A']]
LEG_R = {'A': [(0.00, .090, .096, .098), (0.15, .102, .106, .108), (0.45, .092, .094, .096), (0.78, .071, .071, .073),
               (0.97, .065, .065, .067), (1.05, .064, .064, .068), (1.22, .074, .072, .084), (1.45, .064, .062, .070),
               (1.72, .050, .050, .054), (2.00, .046, .046, .050)],
         'B': [(0.00, .090, .092, .098), (0.15, .098, .100, .104), (0.45, .084, .086, .088), (0.78, .066, .066, .068),
               (0.97, .058, .058, .060), (1.05, .057, .057, .061), (1.22, .058, .057, .066), (1.45, .052, .051, .058),
               (1.72, .042, .042, .045), (2.00, .038, .038, .041)]}
SHOULDER_X = {'A': .192, 'B': .160}
HIP_X = {'A': .100, 'B': .104}
HAND_K = {'A': .98, 'B': .86}
FOOT_K = {'A': 1.12, 'B': .98}
U_ARM = [-0.08, 0.10, 0.5, 1.0, 1.4, 1.88]
U_LEG = [0.0, 0.4, 0.97, 1.08, 1.5, 1.95]

# v2.5 measured bulk: prisms read narrower than their radius, so limbs and torso depth are scaled to the reference outlines
ARM_R = {bt: [(u, rs * 1.12, rf * 1.12) for u, rs, rf in rows] for bt, rows in ARM_R.items()}
LEG_R = {bt: [(u, a * 1.12, b * 1.12, c * 1.12) for u, a, b, c in rows] for bt, rows in LEG_R.items()}
TORSO = {bt: [(z, rx, rf * 1.10, rb * 1.10, cy) for z, rx, rf, rb, cy in rows] for bt, rows in TORSO.items()}
PELVIS = {bt: [(z, rx, rf * 1.08, rb * 1.08, cy) for z, rx, rf, rb, cy in rows] for bt, rows in PELVIS.items()}

def body_r(bt, z):
    if z >= 1.0:
        return lerp_table(TORSO[bt], z)
    if z <= 0.96:
        return lerp_table(PELVIS[bt], z)
    t = (z - 0.96) / 0.04
    a, b = lerp_table(PELVIS[bt], z), lerp_table(TORSO[bt], z)
    return tuple(x + (y - x) * t for x, y in zip(a, b))

def body_ring(bt, z, off=0.0, n=8, p=TORSO_P, front_extra=0.0, rad=None, bump=None):
    rx, rf, rb, cy = rad if rad is not None else body_r(bt, z)
    return xring((0, cy, z), (0, 0, 1), rx + off, rf + off + front_extra, rb + off, n, p=p, bump=bump, phase=math.pi / n)

def body_point(bt, phi, z, off=0.0, p=TORSO_P, rad=None):
    rx, rf, rb, cy = rad if rad is not None else body_r(bt, z)
    e = 2.0 / p
    sa, ca = math.sin(phi), math.cos(phi)
    x = (rx + off) * math.copysign(abs(sa) ** e, sa)
    y = cy - (rf + off if ca >= 0 else rb + off) * math.copysign(abs(ca) ** e, ca)
    return Vector((x, y, z))

def front_y(bt, x, z, off=0.0, rad=None):
    rx, rf, rb, cy = rad if rad is not None else body_r(bt, z)
    q = clamp(abs(x) / (rx + off), 0, 0.999)
    if q <= .45:   # v2.5: the front is a flat panel between the two front vertices
        return cy - (rf + off) * math.cos(math.pi / 8) ** (2.0 / TORSO_P)
    return cy - (rf + off) * (1 - q ** TORSO_P) ** (1 / TORSO_P)

def arm_path(bt, sx):
    sd = 'Left' if sx > 0 else 'Right'
    return Path([(sx * SHOULDER_X[bt], .012, 1.395), BHEAD[B(sd + 'ForeArm')], BHEAD[B(sd + 'Hand')]])

def leg_path(bt, sx):
    sd = 'Left' if sx > 0 else 'Right'
    return Path([(sx * HIP_X[bt], .026, .99), BHEAD[B(sd + 'Leg')], BHEAD[B(sd + 'Foot')]])

def arm_rings(bt, sx, spec, n=5, bump=None):
    """spec: [(u, off[, scale])] -> rings around the arm surface pushed out by off (scale < 1 = shoulder dome)."""
    pa = arm_path(bt, sx)
    out = []
    for st in spec:
        u, off = st[0], st[1]
        sc = st[2] if len(st) > 2 else 1.0
        rs, rf = lerp_table(ARM_R[bt], u)
        out.append(xring(pa.pos(u), pa.dir(u), (rs + off) * sc, (rf + off) * sc, (rf + off) * sc, n, bump=bump, phase=math.pi / n))
    return out

def leg_rings(bt, sx, spec, n=5):
    """spec: [(u, off[, scale[, rag]])]; rag = ragged hem amplitude on alternate vertices."""
    pl = leg_path(bt, sx)
    out = []
    for st in spec:
        u, off = st[0], st[1]
        sc = st[2] if len(st) > 2 else 1.0
        rag = st[3] if len(st) > 3 else 0.0
        rs, rf, rb = lerp_table(LEG_R[bt], u)
        bump = (lambda k, a=rag: a if k % 2 else -.3 * a) if rag else None
        out.append(xring(pl.pos(u), pl.dir(u), (rs + off) * sc, (rf + off) * sc, (rb + off) * sc, n, bump=bump, phase=math.pi / n))
    return out

# ------------------------------------------------------------------------------------------
# HEAD: rounded low-poly skull, 12 sides x 11 rows; jaw narrows to the chin, cheek planes,
# nose bump pushed out of the front column. rows: (z, rx, rF, rB, jaw_taper)
# ------------------------------------------------------------------------------------------
HEAD_N, HEAD_P, HEAD_YC = 8, 3.0, -0.020
HEAD_T = {
    'A': [(1.552, .040, .050, .022, 0.0), (1.582, .070, .078, .046, .24), (1.628, .082, .086, .082, .10),
          (1.665, .085, .088, .094, 0.0), (1.720, .086, .086, .100, 0.0), (1.790, .080, .072, .092, 0.0),
          (1.818, .062, .050, .070, 0.0), (1.824, .030, .022, .032, 0.0)],
}
HEAD_T['B'] = [(1.558, .032, .044, .020, 0.0), (1.584, .062, .074, .040, .22), (1.630, .078, .086, .080, .08)] + HEAD_T['A'][3:]
HEAD_T = {bt: [(z, rx * 1.02, rf, rb, jaw) for z, rx, rf, rb, jaw in rows] for bt, rows in HEAD_T.items()}   # v2.5: measured width (head w/h ~.78 incl. hair)
NOSE = {1.628: (0, -.008, 0), 1.630: (0, -.008, 0), 1.665: (0, -.028, -.010), 1.720: (0, -.012, 0)}
BROW = {1.720: (0, -.010, -.002)}   # v2.3 brow ridge on the two columns either side of the nose
HEAD_CENTER = Vector((0, -0.006, 1.690))

def head_row_pts(row, nose=1.0):
    z, rx, rf, rb, jaw = row
    e = 2.0 / HEAD_P
    pts = []
    for k in range(HEAD_N):
        a = 2 * math.pi * k / HEAD_N
        sa, ca = math.sin(a), math.cos(a)
        x = rx * math.copysign(abs(sa) ** e, sa) * (1 - jaw * max(0.0, ca) ** 1.5)
        y = HEAD_YC - (rf if ca >= 0 else rb) * math.copysign(abs(ca) ** e, ca)
        v = Vector((x, y, z))
        if k == 0:
            for zz, off in NOSE.items():
                if abs(zz - z) < 1e-4:
                    v += Vector(off) * nose
        elif k in (1, HEAD_N - 1):
            for zz, off in BROW.items():
                if abs(zz - z) < 1e-4:
                    v += Vector(off)
        pts.append(tuple(v))
    return pts

def head_surface(theta, z, off, table, hang_below=None):
    """Smooth param head surface (no nose) pushed `off` outward from HEAD_CENTER (hair/beard shells).
    Below hang_below the profile is held (hair/beards hanging straight down)."""
    zz = max(z, hang_below) if hang_below is not None else z
    rx, rf, rb, jaw = lerp_table(table, zz)
    e = 2.0 / HEAD_P
    s, c = math.sin(theta), math.cos(theta)
    x = rx * math.copysign(abs(s) ** e, s) * (1 - jaw * max(0.0, c) ** 1.5)
    y = HEAD_YC - (rf if c >= 0 else rb) * math.copysign(abs(c) ** e, c)
    p = Vector((x, y, z))
    if hang_below is not None and z < hang_below:
        d = Vector((x, y - HEAD_YC, 0))
        return p + d.normalized() * off if d.length > 1e-6 else p
    d = p - HEAD_CENTER
    return HEAD_CENTER + d * ((d.length + off) / d.length) if d.length > 1e-6 else p

def face_y(x, z, table, nose=1.0):
    """y of the faceted front surface at (x, z), interpolated from the built ring vertices."""
    zs = [r[0] for r in table]
    def ring_y(row):
        pts = head_row_pts(row, nose)
        seq = [pts[0]] + ([pts[k] for k in range(1, HEAD_N // 2 + 1)] if x >= 0 else [pts[-k] for k in range(1, HEAD_N // 2 + 1)])
        for a, b in zip(seq, seq[1:]):
            if min(a[0], b[0]) - 1e-9 <= x <= max(a[0], b[0]) + 1e-9 and abs(b[0] - a[0]) > 1e-9:
                t = (x - a[0]) / (b[0] - a[0])
                return a[1] + (b[1] - a[1]) * t
        return seq[0][1]
    for i in range(len(zs) - 1):
        if zs[i] <= z <= zs[i + 1]:
            t = (z - zs[i]) / (zs[i + 1] - zs[i])
            return ring_y(table[i]) * (1 - t) + ring_y(table[i + 1]) * t
    return ring_y(table[-1])

def build_head(mb, bt, nose=1.0, old=False):
    """skull + face + ears + neck (C_SKIN), eyes + mouth (A_EYES), brows (C_HAIR)"""
    H = B('Head')
    fem = bt == 'B'
    T = HEAD_T[bt]
    mb.loft([head_row_pts(r, nose) for r in T], 'C_SKIN', H, smooth=True)
    ey = 1.687
    for sx in (-1, 1):   # v2.3: 2004-style small dark rectangles set closer, under a clear brow line
        ex = .0265 * sx
        mb.box((ex, face_y(ex, ey, T, nose) - .0008, ey), (.020 if fem else .019, .006, .016 if fem else .0145), 'A_EYES', H)
        by = 1.706
        bw, bh = (.027, .0055) if fem else ((.032, .009) if old else (.030, .008))
        mb.box((.028 * sx, face_y(.028 * sx, by, T, nose) - .0022, by), (bw, .007, bh), 'C_HAIR', H,
               rot=Euler((0, math.radians(-10 * sx) if (old or fem) else math.radians(-4 * sx), 0)).to_matrix())
        ez = 1.668
        rx = lerp_table(T, ez)[0]
        c0 = Vector((sx * (rx - .010), .004, ez))
        c1 = Vector((sx * (rx + .009), .010, ez + .002))
        mb.loft([xring(c0, (sx, 0, 0), .021, .015, .016, 4, (0, 0, 1)), xring(c1, (sx, 0, 0), .017, .012, .012, 4, (0, 0, 1))],
                'C_SKIN', H, smooth=True)
    mz = 1.613 if fem else 1.611
    mb.box((0, face_y(0, mz, T, nose) - .0010, mz), (.026 if fem else .034, .006, .0065), 'A_EYES', H)
    mb.loft([xring((0, .004, 1.40), (0, -.08, 1), .060, .054, .060, 6), xring((0, -.006, 1.56), (0, -.08, 1), .056, .050, .056, 6)],
            'C_SKIN', NECK_W, smooth=True)

# ==========================================================================================
# KIT PARTS
# ==========================================================================================
# ---- hair ---------------------------------------------------------------------------------
def hair_cap(mb, bt, zb_fn, jag=0.0, jag_fn=None, cols=8, rows=3, off_out=.015, off_in=-.006, top=1.828,
             hang_below=None, flare=0.0, off_fn=None):
    T = HEAD_T[bt]
    thetas = [2 * math.pi * (j + 0.5) / cols for j in range(cols)]
    outer, inner = [], []
    for i in range(rows + 1):
        t = i / rows
        ro, ri = [], []
        for j, th in enumerate(thetas):
            jj = (jag + .004) if (i == 0 and j % 2 == 1 and (jag_fn is None or jag_fn(th))) else 0.0
            zb = zb_fn(th) - jj
            if hang_below and zb < hang_below - .02 and rows >= 3:   # hanging part straight, cap rings bunched at the crown
                z = zb if i == 0 else hang_below + (top - hang_below) * (1 - (1 - (i - 1) / (rows - 1)) ** 1.8)
            else:
                z = zb + (top - zb) * (1 - (1 - t) ** 1.8)
            o = off_out + (off_fn(th, t) if off_fn else 0.0) + (.005 * (j % 2) * (1 - t) if i < rows else 0.0)   # alternating clumps
            fl = flare * max(0.0, hang_below - z) if hang_below else 0.0
            ro.append(head_surface(th, z, o + fl, T, hang_below))
            ri.append(head_surface(th, z, off_in + fl * .6, T, hang_below))
        outer.append(ro)
        inner.append(ri)
    mb.shell(outer, inner, lambda i, j, s: 'C_HAIR', hair_w, wrap=True)

def tufts(mb, bt, spots, base_off=.016):
    """spots: [(theta, z, length, radius, lean_back)] low-poly hair spikes/tufts (4-sided cones)."""
    T = HEAD_T[bt]
    for th, z, ln, r, lean in spots:
        base = head_surface(th, z, base_off, T)
        nrm = (base - HEAD_CENTER).normalized()
        d = (nrm + Vector((0, lean, 0))).normalized()
        mb.cone(xring(base, d, r, r, r, 4, (0, -1, 0) if abs(d.y) < .9 else (0, 0, 1)), base + d * ln, 'C_HAIR', hair_w, smooth=False)

SHORT_ZB = angtab([(0, 1.748), (35, 1.738), (70, 1.706), (95, 1.668), (118, 1.684), (150, 1.628), (180, 1.606)])

def dreads(mb, bt, n=13, z_side=1.56, z_back=1.45, r=.017):
    """cap + rope locks hanging from the sides and back (the face stays clear)"""
    T = HEAD_T[bt]
    hair_cap(mb, bt, angtab([(0, 1.745), (40, 1.735), (80, 1.695), (100, 1.672), (180, 1.625)]), jag=.008)
    for k in range(n):
        th = math.radians(42 + 276 * k / (n - 1))
        f = (1 - math.cos(th)) / 2                     # 0 front .. 1 back
        root = head_surface(th, 1.715 - .05 * f, .010, T)
        d = Vector((root.x, root.y - HEAD_YC, 0)).normalized()
        z_end = z_side + (z_back - z_side) * f ** 1.5 - .02 * (k % 2)
        mid = root + d * .022 + Vector((0, 0, -(root.z - z_end) * .45))
        end = Vector((root.x, root.y, z_end)) + d * .030
        tube(mb, [root, mid, end], [r, r * .9, r * .55], 'C_HAIR', hair_w, n=5)

def hair_spikes(mb, bt, count=14, seed=7, ln=(.05, .085), lean=(-.2, 1.0)):
    rng = random.Random(seed)
    spots = []
    for k in range(count):
        th = 2 * math.pi * k / count + rng.uniform(-.2, .2)
        z = 1.72 + rng.uniform(0, .09) if abs(math.cos(th)) < .9 or math.cos(th) < 0 else 1.76 + rng.uniform(0, .05)
        spots.append((th, z, rng.uniform(*ln), rng.uniform(.020, .026), rng.uniform(*lean)))
    tufts(mb, bt, spots, base_off=.010)

def _radial(p):
    d = Vector((p.x, p.y - HEAD_YC, 0))
    return d.normalized() if d.length > 1e-6 else Vector((0, 1, 0))

def lock(mb, bt, th_deg, z_root, z_end, width, depth=.016, out=.010, sway=0.0, root_off=.006):
    """one tapered, slightly flattened hair lock. The root is buried in the cap; it follows the skull, then falls
    clear of the neck/back/shoulders (clearance checked at every sample) to a thin tip."""
    T = HEAD_T[bt]
    th = math.radians(th_deg)
    ts = (0.0, .14, .32, .52, .74, 1.0)
    pts = []
    for t in ts:
        z = z_root + (z_end - z_root) * t
        hs = head_surface(th, max(z, 1.61), root_off + (.010 + out) * min(1.0, t * 3), T)
        p = Vector((hs.x, hs.y, z)) + Vector((0, 0, 1)).cross(_radial(hs)).normalized() * sway * t
        if z < 1.56:   # keep outside the neck / upper back / shoulders
            zz = min(max(z, .95), 1.50)
            rad = body_r(bt, zz)
            bp = body_point(bt, th, zz, .022)
            need = Vector((bp.x, bp.y - rad[3], 0)).length
            have = Vector((p.x, p.y - rad[3], 0)).length
            if have < need:
                p = p + _radial(Vector((p.x, p.y - rad[3] + HEAD_YC, 0))) * (need - have)
        pts.append(p)
    ws = [width * .55, width, width * .95, width * .8, width * .55, width * .18]
    ds = [depth * .7, depth, depth, depth * .85, depth * .65, depth * .3]
    rings = []
    for i, c in enumerate(pts):
        ax = pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]
        rings.append(xring(c, ax, ws[i], ds[i], ds[i], 6, front=tuple(_radial(c))))
    mb.loft(rings, 'C_HAIR', hair_w, smooth=True)

def fringe(mb, bt, degs=(-30, -12, 6, 24), z0=1.748, drop=.032, width=.016, lean=0.0):
    """a few angular locks over the forehead: breaks the helmet hairline"""
    T = HEAD_T[bt]
    for i, d in enumerate(degs):
        th = math.radians(d)
        root = head_surface(th, z0 + .018, .016, T)
        tipz = z0 - drop * (0.75 + 0.5 * ((i * 7) % 3) / 2)
        tip = head_surface(th + math.radians(lean), tipz, .014, T)
        ax = tip - root
        mb.cone(xring(root, ax, width, .006, .006, 3, front=tuple(_radial(root))), tip, 'C_HAIR', B('Head'), smooth=False)

def sideburns(mb, bt, z_top=1.690, z_bot=1.632, width=.012):
    T = HEAD_T[bt]
    for s_ in (-1, 1):
        th = math.radians(88 * s_)
        root = head_surface(th, z_top, .010, T)
        tip = head_surface(math.radians(84 * s_), z_bot, .006, T)
        mb.cone(xring(root, tip - root, width, .005, .005, 3, front=tuple(_radial(root))), tip, 'C_HAIR', B('Head'), smooth=False)

def top_clumps(mb, bt, spots=((0.0, 1.806), (2.3, 1.790), (-2.2, 1.796)), h=.009, r=.030):
    """2-3 low clumps on the crown so the silhouette is uneven, not a dome"""
    T = HEAD_T[bt]
    for th, z in spots:
        base = head_surface(th, z, .010, T)
        n = (base - HEAD_CENTER).normalized()
        mb.cone(xring(base, n, r, r * .8, r * .8, 5, front=(0, -1, 0) if abs(n.y) < .9 else (0, 0, 1)), base + n * h, 'C_HAIR', B('Head'), smooth=False)

def hair_style(mb, bt, key):
    """v2.2 option names follow the 2004 creator's categories (our own meshes)."""
    T = HEAD_T[bt]
    H = B('Head')
    front = lambda th: abs(math.degrees(math.atan2(math.sin(th), math.cos(th)))) < 70
    back = lambda th: abs(math.degrees(math.atan2(math.sin(th), math.cos(th)))) > 120
    if key == 'bald':
        return
    if key == 'short' and bt == 'A':        # short crop: fringe locks, sideburns, uneven crown (default A)
        hair_cap(mb, bt, SHORT_ZB, jag=.014, jag_fn=lambda th: back(th))
        fringe(mb, bt)
        sideburns(mb, bt)
        top_clumps(mb, bt)
    elif key == 'short':                    # B: pixie
        hair_cap(mb, bt, angtab([(0, 1.745), (35, 1.735), (70, 1.70), (95, 1.662), (118, 1.674), (180, 1.605)]), jag=.016,
                 jag_fn=lambda th: not front(th), off_fn=lambda th, t: .006 * max(0.0, math.cos(th)) * (1 - t))
        fringe(mb, bt, degs=(-34, -16, 2, 20), drop=.036, lean=10)
        sideburns(mb, bt, z_bot=1.640)
        top_clumps(mb, bt, spots=((0.4, 1.804), (2.6, 1.786)))
    elif key == 'long' and bt == 'A':       # to the shoulders: rounded back + separate tapered locks
        hair_cap(mb, bt, angtab([(0, 1.748), (36, 1.740), (60, 1.690), (95, 1.650), (180, 1.615)]), jag=.010, jag_fn=front)
        fringe(mb, bt)
        for sgn in (-1, 1):
            lock(mb, bt, sgn * 60, 1.700, 1.515 + .010 * (sgn > 0), .030)
            lock(mb, bt, sgn * 90, 1.690, 1.485 - .012 * (sgn > 0), .036)
            lock(mb, bt, sgn * 124, 1.685, 1.462 + .014 * (sgn < 0), .042, out=.014)
            lock(mb, bt, sgn * 158, 1.680, 1.445 - .010 * (sgn > 0), .044, out=.016)
        lock(mb, bt, 180, 1.680, 1.455, .048, out=.012)   # centre-back lock closes the nape
    elif key == 'long':                     # B: long (default B): rounded back + tapered locks, staggered tips
        hair_cap(mb, bt, angtab([(0, 1.752), (30, 1.744), (60, 1.690), (95, 1.650), (180, 1.615)]), jag=.008, jag_fn=front)
        fringe(mb, bt, degs=(-26, -8, 10), drop=.030, width=.014)
        for sgn in (-1, 1):
            lock(mb, bt, sgn * 52, 1.705, 1.450 + .016 * (sgn > 0), .030)
            lock(mb, bt, sgn * 84, 1.695, 1.400 - .014 * (sgn > 0), .038)
            lock(mb, bt, sgn * 124, 1.685, 1.350 + .020 * (sgn < 0), .044, out=.014)
            lock(mb, bt, sgn * 158, 1.680, 1.320 - .012 * (sgn > 0), .046, out=.016)
        lock(mb, bt, 180, 1.680, 1.335, .050, out=.012)   # centre-back lock closes the nape
    elif key == 'medium' and bt == 'A':     # swept back to the nape, ears covered
        hair_cap(mb, bt, angtab([(0, 1.754), (35, 1.746), (70, 1.720), (95, 1.686), (115, 1.664), (150, 1.600), (180, 1.575)]),
                 jag=.012, jag_fn=lambda th: not front(th), hang_below=1.64, flare=.08, rows=4,
                 off_fn=lambda th, t: .006 * max(0.0, -math.cos(th)) * (1 - t))
        fringe(mb, bt, degs=(-32, -14, 4, 22), z0=1.752, drop=.026, width=.017, lean=-8)
        sideburns(mb, bt, z_top=1.688, z_bot=1.628)
        top_clumps(mb, bt, spots=((0.3, 1.808), (2.5, 1.792), (-2.4, 1.794)))
    elif key == 'medium':                   # B: bob
        hair_cap(mb, bt, angtab([(0, 1.745), (34, 1.735), (55, 1.60), (180, 1.575)]), jag=.014, rows=4, hang_below=1.665, flare=.18, off_out=.020)
        fringe(mb, bt, degs=(-24, -6, 12), z0=1.748, drop=.028, width=.016)
    elif key == 'dreadlocks':
        dreads(mb, bt, z_side=1.56 if bt == 'A' else 1.50, z_back=1.45 if bt == 'A' else 1.38)
    elif key == 'tonsure':                  # monk's ring: bald crown, band of hair round the head
        jaw_shell(mb, bt, -180, 180, angtab([(0, 1.728), (60, 1.700), (95, 1.664), (180, 1.625)]), lambda th: 1.772,
                  lambda th, t: .015 - .004 * t, cols=17, rows=2, hang_below=None, off_in=-.008)
    elif key == 'cropped':                  # close buzz cut with a visible hairline (widow's-peak points + sideburns)
        hair_cap(mb, bt, angtab([(0, 1.745), (25, 1.752), (60, 1.725), (95, 1.672), (180, 1.60)]), jag=.008, jag_fn=front,
                 off_out=.010, off_in=-.004, rows=4, cols=11)
        fringe(mb, bt, degs=(-20, 0, 20), z0=1.752, drop=.016, width=.012)
        sideburns(mb, bt, z_top=1.684, z_bot=1.644, width=.010)
    elif key == 'wild spikes':
        hair_cap(mb, bt, angtab([(0, 1.742), (45, 1.728), (85, 1.685), (100, 1.668), (180, 1.615)]), jag=.012, off_out=.014)
        hair_spikes(mb, bt, count=16, seed=11, ln=(.055, .095), lean=(-.6, 1.1))
    elif key == 'spiky':
        hair_cap(mb, bt, angtab([(0, 1.745), (45, 1.73), (85, 1.685), (100, 1.668), (180, 1.615)]), jag=.012, off_out=.014)
        spots = [(0.0, 1.772, .046, .022, .6), (0.7, 1.778, .044, .022, .5), (-0.7, 1.778, .044, .022, .5), (1.5, 1.77, .040, .02, .4),
                 (-1.5, 1.77, .040, .02, .4), (2.4, 1.77, .044, .022, .6), (-2.4, 1.77, .044, .022, .6), (3.14, 1.755, .042, .022, .7),
                 (0.0, 1.806, .046, .022, .7), (1.6, 1.804, .042, .02, .6), (-1.6, 1.804, .042, .02, .6), (3.14, 1.80, .046, .022, .9)]
        tufts(mb, bt, spots, base_off=.010)
    elif key == 'mohawk':                   # shaved sides, tall ridge
        st = [(0.0, z) for z in (1.742, 1.772, 1.800, 1.816)] + [(math.pi, z) for z in (1.806, 1.780, 1.742, 1.70, 1.655, 1.612)]
        rings = []
        for i, (th, z) in enumerate(st):
            base = head_surface(th, z, -.004, T)
            nrm = (base - HEAD_CENTER).normalized()
            h = (.066 if i % 2 == 0 else .050) * (0.7 if i in (0, len(st) - 1) else 1.0)
            X = Vector((1, 0, 0))
            w = .019
            rings.append([tuple(base - X * w), tuple(base + X * w), tuple(base + nrm * h + X * w * .4), tuple(base + nrm * h - X * w * .4)])
        mb.loft(rings, 'C_HAIR', H, smooth=False)
        hair_cap(mb, bt, angtab([(0, 1.745), (60, 1.72), (95, 1.672), (180, 1.61)]), off_out=.010, off_in=-.004, rows=4, cols=11)
    elif key == 'bun':
        hair_cap(mb, bt, angtab([(0, 1.752), (40, 1.738), (80, 1.695), (100, 1.668), (180, 1.625)]), jag=.006, jag_fn=front)
        c = Vector((0, .086, 1.765))
        ax = Vector((0, .75, .62)).normalized()
        tube(mb, [c + ax * k for k in (-.04, -.012, .020, .050, .070)], [.028, .054, .062, .048, .016], 'C_HAIR', H, n=8)
    elif key == 'pigtails':
        hair_cap(mb, bt, angtab([(0, 1.750), (40, 1.735), (80, 1.69), (100, 1.668), (180, 1.625)]), jag=.010, jag_fn=front)
        for sx in (-1, 1):
            tube(mb, [(sx * .080, .040, 1.705), (sx * .098, .058, 1.675), (sx * .110, .066, 1.60), (sx * .112, .062, 1.51), (sx * .104, .050, 1.44)],
                 [.022, .032, .034, .026, .008], 'C_HAIR',
                 lambda p: H if p.z > 1.6 else [(H, .5), (B('Neck'), .3), (B('Spine2'), .2)], n=6)
            tube(mb, [(sx * .084, .044, 1.70), (sx * .090, .050, 1.688)], [.026, .026], 'A_SASH', H, n=6)
    elif key == 'side-swept':               # heavy swept fringe to one side, long locks mostly on the other
        zb = angtab([(-180, 1.615), (-95, 1.650), (-40, 1.70), (-10, 1.715), (10, 1.735), (40, 1.745), (95, 1.650), (180, 1.615)], sym=False)
        hair_cap(mb, bt, zb, jag=.010, off_fn=lambda th, t: .008 * max(0.0, -math.sin(th)) * (1 - t))
        fringe(mb, bt, degs=(-40, -24, -8), z0=1.735, drop=.050, width=.020, lean=-14)
        for d, z_end, w in ((-58, 1.430, .036), (-88, 1.390, .040), (58, 1.560, .026), (88, 1.520, .030),
                            (-126, 1.360, .044), (-158, 1.330, .046), (126, 1.420, .040), (158, 1.380, .044)):
            lock(mb, bt, d, 1.695, z_end, w, out=.012 + (.004 if abs(d) > 100 else 0))
        lock(mb, bt, 180, 1.680, 1.350, .050, out=.012)
    else:
        raise ValueError('unknown hair style %s/%s' % (bt, key))

# ---- jaw (body type A) ---------------------------------------------------------------------
def jaw_shell(mb, bt, th0, th1, zb_fn, zt_fn, off_fn, cols=5, rows=1, mat='C_HAIR', hang_below=1.575, jag=0.0, off_in=-.012):
    T = HEAD_T[bt]
    thetas = [math.radians(th0 + (th1 - th0) * j / (cols - 1)) for j in range(cols)]
    outer, inner = [], []
    for i in range(rows + 1):
        t = i / rows
        ro, ri = [], []
        for j, th in enumerate(thetas):
            zb = zb_fn(th) - (jag if (i == 0 and j % 2 == 1) else 0.0)
            z = zb + (zt_fn(th) - zb) * t
            ro.append(head_surface(th, z, off_fn(th, t), T, hang_below))
            ri.append(head_surface(th, z, off_in, T, hang_below))   # tucked into the face so edges never float
        outer.append(ro)
        inner.append(ri)
    mb.shell(outer, inner, lambda i, j, s: mat, B('Head'))

def moustache(mb, bt, droop=0.0, thick=1.0, half=.036, curl=0.0):
    """tube lying on the upper lip (placed on the faceted face surface, so it never floats)"""
    T = HEAD_T[bt]
    pts = []
    xs = (-half - curl * .4, -half * .55, 0, half * .55, half + curl * .4)
    for i, x in enumerate(xs):
        edge = i in (0, 4)
        dz = (-.010 - droop + curl * .9) if edge else (.002 if i != 2 else .006)
        z = 1.620 + dz
        pts.append((x, face_y(max(-.07, min(.07, x)), z, T) - .004 - .004 * (1 - min(1, abs(x) / half)), z))
    tube(mb, pts, [.005 * thick, .009 * thick, .010 * thick, .009 * thick, .005 * thick], 'C_HAIR', B('Head'), n=5)

def beard_wrap(mb, bt, tip_z, thick, th_max=100.0, cols=11, rows=4, jag=.010, top_front=1.598, top_side=1.690,
               side_bot=1.635, narrow=.28, fork=None, fork_notch=1.525, fwd=.012):
    """v2.3 beard: one shell wrapping the jaw from sideburn to sideburn. Its upper edge lies on the cheeks/under the
    lower lip (thin, tucked in), it follows the jaw planes with volume growing toward the chin, and below the chin it
    tapers into a chin mass (optionally forked). The inner surface stays inside the face / against the throat."""
    T = HEAD_T[bt]
    CH = T[0][0] + .006
    thetas = [math.radians(-th_max + 2 * th_max * j / (cols - 1)) for j in range(cols)]
    def zbot(a):
        if fork:
            f = fork / th_max
            if a < f:
                return fork_notch + (tip_z - fork_notch) * (a / f)
            return tip_z + (side_bot - tip_z) * ((a - f) / (1 - f)) ** 1.4
        return tip_z + (side_bot - tip_z) * a ** 1.4
    ztop = lambda a: top_front + (top_side - top_front) * a ** 1.3
    outer, inner = [], []
    for i in range(rows + 1):
        v = i / rows                                     # 0 = bottom edge, 1 = top edge on the face
        ro, ri = [], []
        for j, th in enumerate(thetas):
            a = abs(math.degrees(th)) / th_max
            zb = zbot(a) - (jag if (i == 0 and j % 2 == 1) else 0.0)
            z = zb + (ztop(a) - zb) * v ** 0.8
            o = thick * (0.15 + 0.85 * (1 - v)) * (1 - .45 * a) + .002
            if z >= CH:
                ro.append(head_surface(th, z, o, T))
                ri.append(head_surface(th, z, -.010, T))
            else:
                base = head_surface(th, CH, 0.0, T)
                tz = zbot(a) if not fork else min(zbot(a), CH - .004)
                f = clamp((z - tz) / max(1e-4, CH - tz))
                sh = narrow + (1 - narrow) * f
                c = Vector((base.x * sh, base.y - fwd * (1 - f), z))
                n = _radial(c)
                ro.append(c + n * o)
                ri.append(c - n * (.018 * f + .004))
        outer.append(ro)
        inner.append(ri)
    mb.shell(outer, inner, lambda i, j, s: 'C_HAIR', B('Head'), smooth=True)

def jaw_style(mb, bt, key):
    """v2.3: every beard is a jaw wrap (sideburn to sideburn); moustaches sit on the upper lip and meet the beard"""
    deg = lambda th: abs(math.degrees(math.atan2(math.sin(th), math.cos(th))))
    if key == 'clean-shaven':      # firmer skin jawline plate
        jaw_shell(mb, bt, -38, 38, lambda th: 1.556 + .01 * (deg(th) / 38) ** 2, lambda th: 1.590,
                  lambda th, t: .0015 + .002 * math.sin(math.pi * t), cols=3, rows=1, mat='C_SKIN', off_in=-.006)
    elif key == 'goatee':
        beard_wrap(mb, bt, 1.515, .014, th_max=40, cols=7, rows=3, top_front=1.600, top_side=1.604, side_bot=1.578, narrow=.35)
        moustache(mb, bt)
    elif key == 'long':            # long taper
        beard_wrap(mb, bt, 1.430, .020, rows=5, jag=.016, narrow=.42)
        moustache(mb, bt, droop=.008)
    elif key == 'medium':          # full jaw + chin wedge
        beard_wrap(mb, bt, 1.495, .018, rows=4, jag=.012, narrow=.50)
        moustache(mb, bt, droop=.004)
    elif key == 'small moustache':
        moustache(mb, bt, thick=.85, half=.024)
    elif key == 'short':           # close jaw wrap
        beard_wrap(mb, bt, 1.540, .010, rows=3, jag=.006, side_bot=1.620, narrow=.45)
        moustache(mb, bt)
    elif key == 'waxed moustache':
        moustache(mb, bt, thick=1.0, half=.040, curl=.018)
    elif key == 'split':           # one jaw wrap forking into two tapered points
        beard_wrap(mb, bt, 1.450, .017, rows=4, jag=.0, narrow=.80, fork=16.0, fork_notch=1.528)
        moustache(mb, bt, droop=.006)
    else:
        raise ValueError('unknown jaw style %s' % key)

# ---- torso ---------------------------------------------------------------------------------
def torso_loft(mb, bt, zs, off, mat, n=8, cap_bot=True, w=torso_w, front_extra=None, matfn=None, bump=None, ring0_jag=0.0):
    rings = []
    for z in zs:
        o = off(z) if callable(off) else off
        fe = front_extra(z) if front_extra else 0.0
        rings.append(body_ring(bt, z, o, n, front_extra=fe, bump=bump))
    if ring0_jag:   # ragged hem: every other hem vertex pulled up
        rings[0] = [(x, y, z + (ring0_jag if k % 2 else 0.0)) for k, (x, y, z) in enumerate(rings[0])]
    return mb.loft(rings, mat, w, cap0=cap_bot, cap1=True, matfn=matfn)

def shirt(mb, bt, mat='C_TORSO', hem=None, off=.004, hem_off=.016):
    """tucked shirt (hem=None) or untucked tunic down to z=hem"""
    drop = (1, 3, 5) if bt == 'A' else (1, 3, 6)   # v2.1: fewer, bigger planes
    zs = [r[0] for i, r in enumerate(TORSO[bt]) if i not in drop]
    zs[0] = 0.968
    if hem:
        zs = [hem, (hem + .94) / 2 if hem < .90 else .92] + zs[1:]
        o = lambda z: off + (hem_off * ss(0.96, hem, z) if z < 0.96 else 0.0)
    else:
        o = off
    torso_loft(mb, bt, zs, o, mat)

def belt(mb, bt, z0=.960, z1=1.010, off=.012, mat='A_BELT', buckle=True, n=8):
    rings = [body_ring(bt, z0, off, n), body_ring(bt, z0 + .006, off + .005, n), body_ring(bt, z1 - .006, off + .005, n), body_ring(bt, z1, off, n)]
    mb.loft(rings, mat, torso_w, cap0=False, cap1=False, smooth=False)
    if buckle:
        zc = (z0 + z1) / 2
        y = front_y(bt, 0, zc, off + .005)
        mb.box((0, y - .002, zc), (.036, .008, .034), 'A_METAL', B('Hips'))

def open_shell(mb, bt, zs, alpha, off, thick, mat='C_TORSO', trim='A_TRIM', hem_trim=True, collar_trim=True, hem_rad=None,
               n_body=6, trim_w=.024, w=skirt_w, lining=None):
    """Open-front garment (jacket/coat/vest) following the body. zs bottom -> top. alpha(z) = half opening angle.
    hem_rad: (z_hem, rx, rF, rB, cy) flare target below the waist."""
    outer, inner = [], []
    for z in zs:
        rad = body_r(bt, z)
        if hem_rad and z < 0.95:
            t = ((0.95 - z) / (0.95 - hem_rad[0])) ** 1.15
            a = body_r(bt, 0.95)
            rad = tuple(x + (y - x) * clamp(t) for x, y in zip(a, hem_rad[1:]))
        o = off(z) if callable(off) else off
        a0 = alpha(z)
        r_avg = rad[0] + o
        d = min(trim_w / max(r_avg, .05), .35)
        phis = [a0, a0 + d] + [a0 + d + (2 * math.pi - 2 * a0 - 2 * d) * k / n_body for k in range(1, n_body)] + [2 * math.pi - a0 - d, 2 * math.pi - a0]
        outer.append([tuple(body_point(bt, ph, z, o, rad=rad)) for ph in phis])
        inner.append([tuple(body_point(bt, ph, z, o - thick, rad=rad)) for ph in phis])
    R, C = len(zs), len(outer[0])
    def mf(i, j, side):
        if trim and (j == 0 or j == C - 2):
            return trim
        if trim and hem_trim and i == 0 and side == 'o':
            return trim
        if trim and collar_trim and i == R - 2:
            return trim
        return lining if (side == 'i' and lining) else mat
    mb.shell(outer, inner, mf, w, edge_mat=trim or mat)

def laces(mb, bt, z0, z1, off, mat='A_BELT', n=3, half=.020):
    for k in range(n):
        za = z0 + (z1 - z0) * k / n
        zb = z0 + (z1 - z0) * (k + 1) / n
        zc = (za + zb) / 2
        y = front_y(bt, 0, zc, off) - .003
        for s in (-1, 1):
            ang = math.atan2(zb - za, 2 * half) * s
            mb.box((0, y, zc), (2 * half * 1.3, .004, .005), mat, SPINE_W((0, 0, zc)), rot=Euler((0, ang, 0)).to_matrix())

def v_neck(mb, bt, z_top=1.47, depth=.11, half=.034, off=.004):
    """skin V at the neckline (a thin wedge in front of the shirt)"""
    z0 = z_top - depth
    pts = []
    for z in (z0, z_top):
        hw = half * (z - z0) / depth + .002
        y = front_y(bt, 0, z, off) - .0025
        pts.append([(-hw, y - .0015, z), (hw, y - .0015, z), (hw, y + .004, z), (-hw, y + .004, z)])
    mb.loft(pts, 'C_SKIN', SPINE_W, smooth=False)

def sash_band(mb, bt, mat='A_SASH', off=.014, width=.028, z0=1.20, slope=1.25, n=10):
    def ring(dz):
        pts = []
        for k in range(n):
            ph = 2 * math.pi * k / n
            z = z0
            for _ in range(8):
                rx = body_r(bt, z)[0]
                x = (rx + off) * math.copysign(abs(math.sin(ph)) ** (2 / TORSO_P), math.sin(ph))
                z = 0.5 * z + 0.5 * (z0 + slope * x)
            pts.append(tuple(body_point(bt, ph, z + dz, off + (.004 if dz == 0 else 0))))
        return pts
    mb.loft([ring(-width), ring(0), ring(width)], mat, torso_w, cap0=False, cap1=False)

def apron(mb, bt, z_hem=.52, bib_top=1.30, half=.10, mat='A_SHIRT', off=.016):
    zs = [z_hem, .62, .74, .86, .95, 1.02, 1.12, 1.22, bib_top]
    cols = 5
    outer, inner = [], []
    y_waist = front_y(bt, 0, .95, off)
    for z in zs:
        hw = half if z < 1.0 else half * (0.95 - 0.25 * (z - 1.0) / (bib_top - 1.0))
        ro, ri = [], []
        for j in range(cols):
            x = -hw + 2 * hw * j / (cols - 1)
            if z >= .95:
                y = front_y(bt, x, z, off)
            else:
                y = min(front_y(bt, x, .95, off), y_waist) - .012 * (0.95 - z) / 0.4
            ro.append((x, y, z))
            ri.append((x, y + .006, z))
        outer.append(ro)
        inner.append(ri)
    mb.shell(outer, inner, lambda i, j, s: mat, skirt_w)
    band = [body_ring(bt, z, off - .006, 12) for z in (.975, .995)]
    mb.loft(band, mat, torso_w, cap0=False, cap1=False, smooth=False)
    for sx in (-1, 1):   # neck straps
        x0 = sx * half * .7
        tube(mb, [(x0, front_y(bt, x0, bib_top, off), bib_top), (sx * .07, -.04, 1.45), (sx * .05, .03, 1.49), (0, .06, 1.47)],
             [.007] * 4, mat, torso_w, n=4, cap=False)

def tabard(mb, bt, z_hem=.66, half=.105, off=.020, mat='A_SHIRT', trim='A_TRIM'):
    zs = [z_hem, .76, .86, .95, 1.05, 1.18, 1.30, 1.40, 1.46]
    cols = 6
    for side in (-1, 1):   # -1 front, +1 back
        outer, inner = [], []
        for z in zs:
            ro, ri = [], []
            for j in range(cols):
                x = -half + 2 * half * j / (cols - 1)
                zz = max(z, .95)
                rx, rf, rb, cy = body_r(bt, zz)
                r = rf if side < 0 else rb
                q = clamp(abs(x) / (rx + off), 0, .999)
                y = cy + side * (r + off) * (1 - q ** TORSO_P) ** (1 / TORSO_P)
                if z < .95:
                    y += side * .02 * (.95 - z) / .3
                ro.append((x, y, z))
                ri.append((x, y - side * .006, z))
            outer.append(ro)
            inner.append(ri)
        mb.shell(outer, inner, lambda i, j, s: trim if (i == 0 or j in (0, cols - 2)) else mat, skirt_w)

def collar(mb, bt, mat='C_TORSO'):
    mb.loft([body_ring(bt, 1.452, .006), body_ring(bt, 1.480, .018), body_ring(bt, 1.500, .014)], mat, torso_w, cap0=False, cap1=False)

def buttons(mb, bt, mat, n=5, z0=1.04, z1=1.42):
    for k in range(n):
        z = z0 + (z1 - z0) * k / (n - 1)
        mb.box((0, front_y(bt, 0, z, .004) - .002, z), (.016, .007, .016), mat, SPINE_W((0, 0, z)))

def stitches(mb, bt, mat='A_BELT'):
    """v2.3: short dashed seams -- one down each side of the chest and one across the yoke"""
    def dash(x, z, horiz):
        y = front_y(bt, x, z, .004) - .0012
        size = (.018, .004, .004) if horiz else (.004, .004, .018)
        mb.box((x, y, z), size, mat, SPINE_W((0, 0, z)))
    for sx in (-1, 1):
        z = 1.05
        while z < 1.33:
            dash(.072 * sx, z, False)
            z += .032
    x = -.11
    while x <= .111:
        dash(x, 1.356, True)
        x += .030

def rip(mb, bt, x, z, w=.050, h=.036, seed=0):
    """a ragged hole: jagged skin-coloured plate just proud of the shirt"""
    rng = random.Random(seed)
    y = front_y(bt, x, z, .004) - .0018
    pts = []
    n = 9
    for k in range(n):
        a = 2 * math.pi * k / n
        r = 1.0 if k % 2 == 0 else rng.uniform(.45, .65)
        pts.append((x + math.cos(a) * w / 2 * r, y, z + math.sin(a) * h / 2 * r))
    back = [(px, py + .003, pz) for px, py, pz in pts]
    mb.loft([pts, back], 'C_SKIN', SPINE_W((0, 0, z)), smooth=False)

def frayed_caps(mb, bt, mat='C_TORSO'):
    """short torn cap over each shoulder with a frayed, zig-zag edge (the torso part's own sleeve edge)"""
    for sx in (-1, 1):
        rings = arm_rings(bt, sx, [(-.10, .020, .70), (.04, .024), (.24, .026)], n=10)
        pa = arm_path(bt, sx)
        ax = pa.dir(.24)
        rings[-1] = [tuple(Vector(q) - ax * (.030 if k % 2 else 0.0)) for k, q in enumerate(rings[-1])]
        mb.loft(rings, mat, arm_w(sx), cap0=True, cap1=False)

def shirt2(mb, bt, mat='C_TORSO', hem=None, off=.004, hem_off=.016, matfn=None, jag=0.0, pleat_below=0.0):
    drop = (1, 3, 5) if bt == 'A' else (1, 3, 6)
    zs = [r[0] for i, r in enumerate(TORSO[bt]) if i not in drop]
    zs[0] = 0.968
    if hem:
        zs = [hem, (hem + .94) / 2 if hem < .90 else .92] + zs[1:]
    o = (lambda z: off + .030 * ss(1.09, 1.00, z) + (hem_off * ss(0.96, hem, z) if z < 0.96 else 0.0)) if hem else (lambda z: off)
    rings = [body_ring(bt, z, o(z), 8, bump=((lambda k: .008 * (k % 2)) if z < pleat_below else None)) for z in zs]
    if jag:
        notch = {3: 2.2, 8: 1.8}   # two deep rips cut into the hem silhouette
        rings[0] = [(x, y, z + (jag * notch.get(k, 1.0) if (k % 2 or k in notch) else 0.0)) for k, (x, y, z) in enumerate(rings[0])]
    mb.loft(rings, mat, torso_w, matfn=(lambda i, k: matfn(zs[i], zs[i + 1])) if matfn else None)

def torso_style(mb, bt, key):
    """v2.2 option names follow the 2004 creator's categories (our own meshes). 'coat' is Bram's extra (not a kit option)."""
    if key in ('plain', 'simple'):                 # tucked shirt (default)
        shirt2(mb, bt)
    elif key == 'light buttons':
        shirt2(mb, bt)
        collar(mb, bt)
        buttons(mb, bt, 'A_SHIRT')
    elif key == 'dark buttons':
        shirt2(mb, bt)
        collar(mb, bt)
        buttons(mb, bt, 'A_BELT')
    elif key == 'jacket':                          # short open jacket with trim over a linen shirt
        shirt2(mb, bt, mat='A_SHIRT')
        open_shell(mb, bt, [.86, .92, .98, 1.06, 1.16, 1.26, 1.34, 1.40, 1.44, 1.47],
                   lambda z: 0.20 + max(0, z - 1.30) * 5.0 + max(0, .98 - z) * .8, lambda z: .018 + .012 * ss(1.08, 1.00, z) + .02 * ss(.97, .86, z), .010,
                   hem_rad=(.86, .204, .128, .138, .026), n_body=8)
    elif key == 'shirt':                           # untucked shirt, open collar
        shirt2(mb, bt, hem=.88 if bt == 'A' else .90)
        collar(mb, bt)
        v_neck(mb, bt)
    elif key == 'stitching':
        shirt2(mb, bt)
        stitches(mb, bt)
    elif key == 'torn':                            # jagged hem with notches, two ragged holes, frayed shoulder edges
        shirt2(mb, bt, hem=.88, jag=.045)
        rip(mb, bt, .075, 1.12, seed=3)
        rip(mb, bt, -.085, 1.27, w=.040, h=.030, seed=5)
        frayed_caps(mb, bt)
    elif key == 'two-toned':                       # tunic split vertically: one side the torso colour, the other linen
        drop = (1, 3, 5)
        zs = [r[0] for i, r in enumerate(TORSO[bt]) if i not in drop]
        zs[0] = 0.968
        n = 8
        mb.loft([body_ring(bt, z, .004, n) for z in zs], 'C_TORSO', torso_w, matfn=lambda i, k: 'C_TORSO' if k < n // 2 else 'A_SHIRT')
    elif key == 'sports top':                      # B: cropped top + bare midriff
        torso_loft(mb, bt, [.968, 1.00, 1.06, 1.125], 0.0, 'C_SKIN')
        torso_loft(mb, bt, [1.105, 1.14, 1.215, 1.27, 1.385, 1.43, 1.464, 1.492], lambda z: .006 if z > 1.11 else .010, 'C_TORSO')
    elif key == 'pleated':                         # B: pleated peplum top
        shirt2(mb, bt, hem=.90, hem_off=.024, pleat_below=1.10)
    elif key == 'coat':                            # Guide Bram's long open coat (tutor extra built with kit rules)
        shirt2(mb, bt, mat='A_SHIRT')
        open_shell(mb, bt, [.56, .70, .84, .95, 1.08, 1.24, 1.35, 1.42, 1.475],
                   lambda z: (0.16 + max(0, z - 1.28) * 4.6 + max(0, .95 - z) * .40), lambda z: .020 + .012 * ss(1.06, .99, z) + .030 * ss(.99, .82, z), .010,
                   hem_rad=(.56, .228, .162, .192, .030), n_body=9)
    else:
        raise ValueError('unknown torso style %s' % key)

# ---- arms -----------------------------------------------------------------------------------
def arms_both(mb, bt, spec, mat='C_TORSO', n=5, cap0=True, cap1=True, matfn=None, bump=None):
    if spec[0][0] < 0:   # rounded shoulder dome instead of a cylinder cap (blends into the torso's shoulder)
        u0, o0 = spec[0][0], spec[0][1]
        spec = [(u0 - .07, o0, .62)] + list(spec)
    for sx in (-1, 1):
        mb.loft(arm_rings(bt, sx, spec, n, bump=bump), mat, arm_w(sx), cap0, cap1, matfn=matfn)

def arms_skin(mb, bt, u0, n=5, bulk=None):
    us = [u0] + [u for u in U_ARM if u > u0 + .05] + [1.97]
    arms_both(mb, bt, [(u, bulk(u) if bulk else 0.0) for u in us], 'C_SKIN', n)

def sleeve_thick(mb, bt, spec, mat='C_TORSO', trim=None, t=.008):
    for sx in (-1, 1):
        outer = arm_rings(bt, sx, spec)
        inner = arm_rings(bt, sx, [(u, o - t) for u, o in spec])
        mb.thick_loft(list(reversed(outer)), list(reversed(inner)), mat, arm_w(sx),
                      matfn=(lambda i, k: trim if i == 0 else mat) if trim else None, rim_mat=trim or mat)
    arms_both(mb, bt, [(spec[0][0], spec[0][1] + .002), (spec[1][0], spec[1][1] + .002), (.35, spec[2][1] if len(spec) > 2 else .01)], mat)

LONG_SLEEVE = [(-.08, .004), (.08, .010), (.4, .010), (.8, .010), (1.0, .010), (1.3, .010), (1.6, .009), (1.85, .009), (1.88, .016), (1.97, .017)]
MUSCLE = lambda k: (lambda u: k * (.016 * math.sin(math.pi * clamp((u - .15) / .75)) + .010 * math.sin(math.pi * clamp((u - 1.05) / .6))))

def arm_style(mb, bt, key):
    """v2.2 option names follow the 2004 creator's categories (our own meshes)."""
    if key == 'regular':
        arms_both(mb, bt, LONG_SLEEVE)
    elif key == 'long sleeved':
        arms_both(mb, bt, [(u, o * .7) for u, o in LONG_SLEEVE])
    elif key in ('musclebound', 'muscley'):
        k = 1.0 if key == 'musclebound' else .6
        arms_both(mb, bt, [(-.08, .006), (.06, .012 + .006 * k), (.28, .016 + .008 * k), (.38, .016 + .008 * k), (.41, .013)])
        arms_skin(mb, bt, .30, bulk=MUSCLE(k))
    elif key == 'loose sleeved':
        sleeve_thick(mb, bt, [(-.08, .006), (.08, .014), (.4, .018), (.8, .024), (1.0, .028), (1.3, .032), (1.6, .036), (1.86, .038)])
        arms_skin(mb, bt, 1.70)
    elif key in ('large cuffed', 'large cuffs'):
        sleeve_thick(mb, bt, [(-.08, .006), (.08, .013), (.4, .013), (.8, .012), (1.0, .012), (1.3, .012), (1.58, .013), (1.64, .028), (1.84, .032)],
                     trim='A_TRIM')
        arms_both(mb, bt, [(1.60, .004), (1.80, .006), (1.92, .010), (1.97, .010)], 'A_SHIRT')
    elif key == 'thin':
        arms_both(mb, bt, [(u, o - .012) for u, o in LONG_SLEEVE])
    elif key == 'shoulder pads':
        arms_both(mb, bt, LONG_SLEEVE)
        arms_both(mb, bt, [(-.08, .030), (.04, .034), (.20, .030), (.30, .018)], 'A_BELT')
    elif key == 'tight sleeves':
        arms_both(mb, bt, [(u, o * .4) for u, o in LONG_SLEEVE])
        arms_both(mb, bt, [(1.78, .008), (1.80, .012), (1.93, .012), (1.95, .008)], 'A_BELT')
    elif key == 'short sleeves':
        arms_both(mb, bt, [(-.08, .004), (.06, .010), (.30, .012), (.46, .014), (.49, .013)])
        arms_skin(mb, bt, .40)
    elif key == 'bare arms':
        arms_skin(mb, bt, -.08)
    elif key == 'frilly':                          # elbow sleeve + linen frill
        arms_both(mb, bt, [(-.08, .004), (.06, .008), (.35, .008), (.70, .008), (.96, .009), (1.02, .008)])
        spec = [(.98, .006), (1.04, .014), (1.12, .024)]
        for sx in (-1, 1):
            outer = arm_rings(bt, sx, spec, n=12, bump=lambda k: .005 * (k % 2))
            inner = arm_rings(bt, sx, [(u, o - .005) for u, o in spec], n=12)
            mb.thick_loft(list(reversed(outer)), list(reversed(inner)), 'A_SHIRT', arm_w(sx))
        arms_skin(mb, bt, .98)
    else:
        raise ValueError('unknown arms style %s' % key)

# ---- hands ------------------------------------------------------------------------------------
HAND_ST = [(-.12, .021, .027), (.06, .025, .034), (.34, .027, .047), (.56, .025, .044), (.70, .016, .030)]   # small block hand
CURL = {.34: 0.004, .56: .014, .70: .026}

def mitten(mb, bt, sx, mat, grow=0.0, n=4):
    """blocky OSRS mitten hand, no thumb; slight fist curl toward the palm"""
    sd = 'Left' if sx > 0 else 'Right'
    k = HAND_K[bt]
    W, Hn = BHEAD[B(sd + 'Hand')], BTAIL[B(sd + 'Hand')]
    ax = (Hn - W).normalized()
    L = (Hn - W).length * k
    wts = chain_w([BHEAD[B(sd + 'ForeArm')], W, Hn], [B(sd + 'ForeArm'), B(sd + 'Hand')], [.03])
    rings = []
    for t, th, wd in HAND_ST:
        c = W + ax * (t * L) + Vector((-sx * CURL.get(t, 0.0) * k, 0, 0))
        rings.append(xring(c, ax, th * k + grow, wd * k + grow, wd * k + grow, n, phase=math.pi / n))
    mb.loft(rings, mat, wts)

def hand_style(mb, bt, key):
    for sx in (-1, 1):
        sd = 'Left' if sx > 0 else 'Right'
        W, Hn = BHEAD[B(sd + 'Hand')], BTAIL[B(sd + 'Hand')]
        ax = (Hn - W).normalized()
        k = HAND_K[bt]
        wts = chain_w([BHEAD[B(sd + 'ForeArm')], W, Hn], [B(sd + 'ForeArm'), B(sd + 'Hand')], [.03])
        if key == 'bare':
            mitten(mb, bt, sx, 'C_SKIN')
        elif key == 'gloves':
            mitten(mb, bt, sx, 'A_BELT', grow=.004)
            outer = [xring(W + ax * t, ax, r * k, r * k * 1.1, r * k * 1.1, 8) for t, r in ((.03, .030), (-.02, .036), (-.05, .040))]
            inner = [xring(W + ax * t, ax, r * k, r * k * 1.1, r * k * 1.1, 8) for t, r in ((.03, .024), (-.02, .030), (-.05, .034))]
            mb.thick_loft(list(reversed(outer)), list(reversed(inner)), 'A_BELT', wts)
        elif key == 'wraps':
            mitten(mb, bt, sx, 'C_SKIN')
            L = (Hn - W).length * k
            rings = [xring(W + ax * (t * L), ax, th * k + g, wd * k + g, wd * k + g, 4, phase=math.pi / 4)
                     for (t, th, wd), g in (((-.10, .021, .027), .006), ((.05, .023, .031), .007), ((.20, .025, .040), .006), ((.30, .025, .044), .004))]
            mb.loft(rings, 'A_SHIRT', wts, smooth=False)
        else:
            raise ValueError('unknown hands style %s' % key)

# ---- legs -----------------------------------------------------------------------------------
def pelvis(mb, bt, mat='C_LEGS', off=0.0):
    mb.loft([body_ring(bt, z, off) for z in [r[0] for r in PELVIS[bt]]], mat, torso_w)

def legs_both(mb, bt, spec, mat='C_LEGS', n=5, cap0=True, cap1=True):
    if spec[0][0] <= 0.0 and len(spec[0]) < 3:   # rounded hip dome tucked inside the pelvis
        spec = [(spec[0][0] - .10, spec[0][1], .55)] + list(spec)
    for sx in (-1, 1):
        mb.loft(leg_rings(bt, sx, spec, n), mat, leg_w(sx), cap0, cap1)

def legs_skin(mb, bt, u0):
    legs_both(mb, bt, [(u, 0.0) for u in [u0] + [u for u in U_LEG if u > u0 + .05]] + [(1.98, 0.0)], 'C_SKIN')

def skirt(mb, bt, zs, hem_rad, off=.012, mat='C_LEGS', n=10, pleats=0.0, matfn=None, rim_mat=None):
    """thick skirt from the waist (zs[-1]) flaring to hem_rad at zs[0]"""
    z_hem, z_top = zs[0], zs[-1]
    outer, inner = [], []
    for z in zs:
        t = clamp((z_top - z) / (z_top - z_hem)) ** 0.9
        a = body_r(bt, min(z, .99)) if z > .86 else body_r(bt, .86)
        top = body_r(bt, z_top)
        base = a if z > .86 else tuple(x + (y - x) * clamp((.86 - z) / (.86 - z_hem)) for x, y in zip(a, hem_rad[1:]))
        rad = base
        bump = (lambda k, tt=t: pleats * tt * (1 if k % 2 == 0 else -0.3)) if pleats else None
        outer.append(body_ring(bt, z, off, n, rad=rad, bump=bump))
        inner.append(body_ring(bt, z, off - .007, n, rad=rad))
    mb.thick_loft(outer, inner, mat, skirt_w, matfn=matfn, rim_mat=rim_mat)

TROUSERS = [(u, .010) for u in U_LEG[:-1]] + [(1.90, .012), (1.95, .016)]

def leg_style(mb, bt, key):
    """v2.2 option names follow the 2004 creator's categories (our own meshes)."""
    if key in ('plain', 'plain trousers'):
        pelvis(mb, bt)
        belt(mb, bt)
        legs_both(mb, bt, TROUSERS)
    elif key == 'shorts':
        pelvis(mb, bt)
        belt(mb, bt)
        legs_both(mb, bt, [(0, .010), (.3, .014), (.6, .018), (.80, .021)] if bt == 'A' else [(0, .010), (.25, .014), (.50, .018)])
        legs_skin(mb, bt, .62 if bt == 'A' else .40)
    elif key == 'flares':
        pelvis(mb, bt)
        belt(mb, bt)
        legs_both(mb, bt, [(0, .010), (.3, .010), (.7, .010), (.97, .010), (1.08, .014), (1.3, .030), (1.5, .042), (1.88, .054), (1.95, .056)])
    elif key == 'turn-ups':
        pelvis(mb, bt)
        belt(mb, bt)
        legs_both(mb, bt, [(u, .010) for u in U_LEG if u < 1.75] + [(1.78, .011), (1.79, .024), (1.89, .024), (1.90, .014)])
    elif key in ('tattered', 'tatty'):
        pelvis(mb, bt)
        belt(mb, bt)
        legs_both(mb, bt, [(u, .010) for u in (0.0, .3, .7, .97, 1.08, 1.3)] + [(1.46, .014, 1.0, .012), (1.52, .012, 1.0, .010)])
        legs_skin(mb, bt, 1.36)
    elif key == 'bootcut':
        pelvis(mb, bt)
        belt(mb, bt)
        legs_both(mb, bt, [(u, .010) for u in U_LEG if u < 1.4] + [(1.45, .036), (1.7, .038), (1.95, .042)])
    elif key == 'long skirt':
        belt(mb, bt, off=.016, buckle=False)
        skirt(mb, bt, [.12, .22, .36, .52, .68, .82, .92, 1.0], (.12, .235, .20, .21, .030), off=.014)
        legs_skin(mb, bt, 1.5)
    elif key == 'short skirt':
        belt(mb, bt, off=.016, buckle=False)
        skirt(mb, bt, [.60, .68, .78, .88, .94, 1.0], (.60, .215, .15, .16, .030), off=.014)
        legs_skin(mb, bt, .55)
    elif key == 'split skirt':                     # culottes
        pelvis(mb, bt)
        belt(mb, bt)
        legs_both(mb, bt, [(0, .014), (.3, .030), (.7, .045), (1.0, .055), (1.3, .062), (1.42, .064)])
        legs_skin(mb, bt, 1.25)
    else:
        raise ValueError('unknown legs style %s' % key)

# ---- feet -----------------------------------------------------------------------------------
FOOT_ST = [(.150, .050, .078), (.095, .068, .128), (.010, .072, .110), (-.075, .072, .080), (-.140, .060, .058), (-.166, .036, .036)]

def foot_rings(bt, sx, grow=0.0, hk=1.0, wk=1.0, n=4, z0=0.0):
    k = FOOT_K[bt]
    out = []
    for y, w, h in FOOT_ST:
        yy = .10 + (y - .10) * k
        x = sx * (.13 + max(0.0, -yy) * .07)
        hh = h * hk * (k ** .5) + grow
        out.append(xring((x, yy, z0 + hh / 2), (0, -1, 0), w * wk * k + grow, hh / 2, hh / 2, n, front=(0, 0, 1), p=2.0, phase=math.pi / n))
    return out

def foot_style(mb, bt, key):
    for sx in (-1, 1):
        fw = foot_w(sx)
        if key == 'boots':
            mb.loft(foot_rings(bt, sx, .006), 'C_FEET', fw)
            mb.loft(leg_rings(bt, sx, [(1.50, .028), (1.53, .033), (1.75, .024), (1.99, .024)]), 'C_FEET', fw)
        elif key == 'shoes':
            mb.loft(foot_rings(bt, sx, .002, hk=.78, wk=.9), 'C_FEET', fw)
            mb.loft(leg_rings(bt, sx, [(1.93, .004), (1.96, .008), (2.0, .010)]), 'C_FEET', fw)
        elif key == 'sandals':
            mb.loft(foot_rings(bt, sx, 0.0, hk=.85, wk=.95), 'C_SKIN', fw)
            k = FOOT_K[bt]
            sole = []
            for y, w, h in FOOT_ST:
                yy = .10 + (y - .10) * k
                x = sx * (.13 + max(0.0, -yy) * .07)
                sole.append(xring((x, yy + (.004 if y > .14 else 0), .009), (0, -1, 0), w * k * .95 + .006, .009, .009, 4, front=(0, 0, 1), p=4, phase=math.pi / 4))
            mb.loft(sole, 'A_BELT', fw, smooth=False)
            for yc in (.02, -.075):
                yy = .10 + (yc - .10) * k
                rings = []
                for dy in (-.008, .008):
                    rr = foot_rings(bt, sx, .004, hk=.85, wk=.95)
                    # find the foot profile at yy: interpolate between the two nearest stations
                    ys = [.10 + (s[0] - .10) * k for s in FOOT_ST]
                    i = max(i for i in range(len(ys) - 1) if ys[i] >= yy + dy)
                    t = (ys[i] - (yy + dy)) / (ys[i] - ys[i + 1])
                    rings.append([tuple(Vector(a).lerp(Vector(b), t)) for a, b in zip(rr[i], rr[i + 1])])
                mb.loft(rings, 'A_BELT', fw, cap0=False, cap1=False, smooth=False)
            mb.loft(leg_rings(bt, sx, [(1.90, .006), (1.95, .007)]), 'A_BELT', fw, cap0=False, cap1=False, smooth=False)

# ------------------------------------------------------------------------------------------
# KIT REGISTRY: (style key, description). Index = part number (01..).
# ------------------------------------------------------------------------------------------
def _opts(*names):
    return [(n, n) for n in names]

KIT = {   # option order = 2004 creator categories, default first (the runtime defaults every slot to option 01)
    'A': {
        'Hair': _opts('short', 'bald', 'dreadlocks', 'long', 'medium', 'tonsure', 'cropped', 'wild spikes', 'spiky', 'mohawk'),
        'Jaw': _opts('clean-shaven', 'goatee', 'long', 'medium', 'small moustache', 'short', 'waxed moustache', 'split'),
        'Torso': _opts('plain', 'light buttons', 'dark buttons', 'jacket', 'shirt', 'stitching', 'torn', 'two-toned'),
        'Arms': _opts('regular', 'musclebound', 'loose sleeved', 'large cuffed', 'thin', 'shoulder pads', 'tight sleeves'),
        'Hands': _opts('bare', 'gloves', 'wraps'),
        'Legs': _opts('plain', 'shorts', 'flares', 'turn-ups', 'tattered', 'bootcut'),
        'Feet': _opts('boots', 'shoes', 'sandals'),
    },
    'B': {
        'Hair': _opts('long', 'bald', 'bun', 'dreadlocks', 'medium', 'pigtails', 'short', 'cropped', 'wild spikes', 'spiky', 'side-swept'),
        'Torso': _opts('simple', 'sports top', 'pleated', 'shirt', 'stitching'),
        'Arms': _opts('long sleeved', 'short sleeves', 'bare arms', 'muscley', 'large cuffs', 'frilly'),
        'Hands': _opts('bare', 'gloves', 'wraps'),
        'Legs': _opts('long skirt', 'short skirt', 'shorts', 'plain trousers', 'turn-ups', 'flares', 'tatty', 'bootcut', 'split skirt'),
        'Feet': _opts('boots', 'shoes', 'sandals'),
    },
}
SLOTS = ['Hair', 'Jaw', 'Torso', 'Arms', 'Hands', 'Legs', 'Feet']
DEFAULT_OUTFIT = {'A': {'Hair': 1, 'Jaw': 1, 'Torso': 1, 'Arms': 1, 'Hands': 1, 'Legs': 1, 'Feet': 1},
                  'B': {'Hair': 1, 'Torso': 1, 'Arms': 1, 'Hands': 1, 'Legs': 1, 'Feet': 1}}
STYLE_FN = {'Jaw': jaw_style, 'Torso': torso_style, 'Arms': arm_style, 'Hands': hand_style, 'Legs': leg_style, 'Feet': foot_style}

HEAD_S, HEAD_PIVOT = 1.13, Vector((0, -0.012, 1.60))
HEAD_WX, HEAD_WY, HEAD_HZ = 1.12, 1.04, .91   # v2.5: measured head proportions (wider, shorter)

def part_name(bt, slot, idx):
    return 'Kit_%s_%s_%02d' % (bt, slot, idx)

def build_part(bt, slot, idx, mats, arm, coll=None):
    key = KIT[bt][slot][idx - 1][0]
    mb = MB()
    if slot == 'Hair':
        build_head(mb, bt)
        hair_style(mb, bt, key)
    else:
        STYLE_FN[slot](mb, bt, key)
    if slot in ('Hair', 'Jaw'):   # the whole head is modelled in 'head space' then scaled up about the chin
        for v in mb.bm.verts:
            d = (v.co - HEAD_PIVOT) * HEAD_S
            v.co = HEAD_PIVOT + Vector((d.x * HEAD_WX, d.y * HEAD_WY, d.z * HEAD_HZ)) + Vector((0, 0, -0.030))
    return mb.to_object(part_name(bt, slot, idx), mats, arm, coll=coll)

# ==========================================================================================
# ARMATURE + PLAYER CLIPS -- retargeted verbatim from build_holm_player_v1.py (same 23 bones)
# ==========================================================================================
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

# v2.2 OSRS stance, added to every Euler-authored pose (aims are absolute directions and stay as authored):
# upper arms swing out, a small elbow bend with the forearm angled out so the hands hang beside the hips clear of
# the thighs, legs slightly apart with the feet kept flat.
STANCE = {'LeftArm': (0, -16, 0), 'RightArm': (0, 16, 0), 'LeftForeArm': (-4, -13, 0), 'RightForeArm': (-4, 13, 0),
          'LeftUpLeg': (0, -3, 0), 'RightUpLeg': (0, 3, 0), 'LeftFoot': (0, 3, 0), 'RightFoot': (0, -3, 0)}

def pose_rotations(arm, pose):
    """-> {bone: armature-space 3x3 delta R} honoring 'aim' via accumulated parent rotations."""
    acc, res = {}, {}
    for name, parent, head, tail, roll in BONES:
        short = name.split(':')[1]
        spec = pose.get(short)
        if short in STANCE and (spec is None or spec[0] != 'aim'):
            base = spec if spec is not None else (0, 0, 0)
            spec = tuple(a + b for a, b in zip(base, STANCE[short]))
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
        (9, PP(step, RightArm=A(-.02, -.88, -.47), RightForeArm=A(.10, -.90, -.40), Spine=(6, 0, 0), Spine1=(8, 0, 16),
               Spine2=(4, 0, 8), LeftArm=A(.45, .10, -.9), LeftForeArm=A(.2, -.3, -.9), loc=(0, 0, -.035))),
        (13, PP(step, RightArm=A(.00, -.75, -.66), RightForeArm=A(.12, -.70, -.70), Spine=(6, 0, 0), Spine1=(8, 0, 20),
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
    blk = PP(crouch(-10, 18), LeftArm=A(.40, -.8, -.1), LeftForeArm=A(-.40, -.55, .72), RightArm=A(-.3, -.5, -.8),
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
# NPC clips: talk / wave for the kit (right-hand gestures) and Guide Bram (left hand; right holds the staff)
# ------------------------------------------------------------------------------------------
GEST_L = [dict(LeftArm=A(.40, -.35, -.85), LeftForeArm=A(.15, -.95, .10), Head=(4, 0, 3), Spine1=(0, 0, 3)),
          dict(LeftArm=A(.36, -.50, -.79), LeftForeArm=A(.32, -.80, .35), Head=(-4, 0, -2), Spine1=(1, 0, -2)),
          dict(LeftArm=A(.42, -.30, -.86), LeftForeArm=A(.10, -.98, -.05), Head=(6, 0, 4), Spine1=(0, 0, 2)),
          dict(LeftArm=A(.33, -.55, -.77), LeftForeArm=A(.36, -.75, .40), Head=(-3, 0, -3), Spine1=(1, 0, -3))]
WAVE_UP = dict(LeftArm=A(.85, -.25, .45), Head=(-4, 0, 6), Spine1=(0, 0, -3))
WAVE_FA = [A(.10, -.25, .96), A(.50, -.25, .83), A(-.05, -.25, .97), A(.50, -.25, .83), A(.10, -.25, .96)]
HOLD = dict(RightArm=A(-.30, -.25, -.92), RightForeArm=A(-.10, -.85, -.52), RightHand=A(-.05, -.99, -.12))

def kit_npc_clips():
    C = {}
    C['talk'] = (48, [(f, mirror_pose(P(**GEST_L[i % 4]))) for i, f in enumerate((0, 12, 24, 36))] + [(48, mirror_pose(P(**GEST_L[0])))], True)
    C['wave'] = (40, [(0, P())] + [(8 + 6 * i, mirror_pose(P(**WAVE_UP, LeftForeArm=fa))) for i, fa in enumerate(WAVE_FA)] + [(40, P())], False)
    return C

def PB(*dicts, **kw):
    d = dict(REST)
    d.update(HOLD)
    for x in dicts:
        d.update(x)
    d.update(kw)
    return d

def bram_clip_defs():
    C = {}
    C['idle'] = (60, [(0, PB()), (30, PB(Spine1=(2, 0, 0), Spine2=(1.5, 0, 0), Head=(3, 0, -4), LeftArm=(-2, 15, 0),
                                          LeftForeArm=(-14, 0, 0), loc=(0, 0, -.006))), (60, PB())], True)
    C['talk'] = (48, [(f, PB(GEST_L[i % 4])) for i, f in enumerate((0, 12, 24, 36))] + [(48, PB(GEST_L[0]))], True)
    lc = dict(LeftUpLeg=(-24, 0, 0), LeftLeg=(6, 0, 0), LeftFoot=(-10, 0, 0), RightUpLeg=(18, 0, 0), RightLeg=(18, 0, 0),
              RightFoot=(12, 0, 0), Hips=(0, 0, -4), Spine=(3, 0, 0), loc=(0, 0, -.02))
    lp = dict(LeftUpLeg=(-2, 0, 0), LeftLeg=(4, 0, 0), RightUpLeg=(-14, 0, 0), RightLeg=(42, 0, 0), RightFoot=(6, 0, 0),
              Spine=(3, 0, 0), loc=(0, 0, .01))
    C['walk'] = (30, [(0, PB(lc, LeftArm=(18, 14, 0), RightArm=A(-.30, -.20, -.93))),
                      (8, PB(lp, LeftArm=(0, 14, 0))),
                      (15, PB(mirror_pose(lc), LeftArm=(-20, 14, 0), LeftForeArm=(-24, 0, 0), RightArm=A(-.30, -.30, -.90))),
                      (23, PB(mirror_pose(lp), LeftArm=(0, 14, 0))),
                      (30, PB(lc, LeftArm=(18, 14, 0), RightArm=A(-.30, -.20, -.93)))], True)
    C['wave'] = (40, [(0, PB())] + [(8 + 6 * i, PB(WAVE_UP, LeftForeArm=fa)) for i, fa in enumerate(WAVE_FA)] + [(40, PB())], False)
    return C

def set_pose(arm, pose):
    rots = pose_rotations(arm, pose)
    for pb in arm.pose.bones:
        Bm = pb.bone.matrix_local.to_3x3()
        pb.rotation_quaternion = (Bm.inverted() @ rots[pb.name] @ Bm).to_quaternion()
        pb.location = (0, 0, 0)
    bpy.context.view_layer.update()

def clear_pose(arm):
    for pb in arm.pose.bones:
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
    bpy.context.view_layer.update()

# ------------------------------------------------------------------------------------------
# v2.4 hand clearance: every frame of every clip, hands must stay out of the crotch / between the legs and never
# cross the body centreline (measured in the pelvis frame so root motion does not matter)
# ------------------------------------------------------------------------------------------
CROTCH = Vector((0, .03, .86))
HAND_MIN_CROTCH = .12     # hand centre to crotch point (~.08 from the hand surface)

def hand_clearance(arm, acts):
    sc = bpy.context.scene
    res = {}
    for name, act in acts.items():
        arm.animation_data.action = act
        f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
        w = {'min_crotch_dist': 9.0, 'min_side_x': 9.0, 'between_legs_frames': 0, 'min_outside_thigh': 9.0}
        for f in range(f0, f1 + 1):
            sc.frame_set(f)
            hips = arm.pose.bones[B('Hips')]
            to_pelvis = hips.bone.matrix_local @ hips.matrix.inverted()
            for side, sx in (('Left', 1), ('Right', -1)):
                pb = arm.pose.bones[B(side + 'Hand')]
                W, Hn = BHEAD[pb.name], BTAIL[pb.name]
                c = to_pelvis @ (pb.matrix @ pb.bone.matrix_local.inverted()) @ (W + (Hn - W) * .35)
                w['min_crotch_dist'] = min(w['min_crotch_dist'], (c - CROTCH).length)
                w['min_side_x'] = min(w['min_side_x'], c.x * sx)
                if abs(c.x) < .11 and .50 < c.z < .95 and abs(c.y - .03) < .13:
                    w['between_legs_frames'] += 1
                if .60 < c.z < 1.0 and abs(c.y - .03) < .16:   # beside the thigh: horizontal gap to the thigh's outer line
                    w['min_outside_thigh'] = min(w['min_outside_thigh'], c.x * sx - (HIP_X['A'] + .105))
        res[name] = {k: (round(v, 4) if isinstance(v, float) else v) for k, v in w.items()}
    arm.animation_data.action = None
    return res

def assert_hands(report, label):
    bad = {n: r for n, r in report.items()
           if r['min_crotch_dist'] < HAND_MIN_CROTCH or r['min_side_x'] < 0.0 or r['between_legs_frames'] > 0}
    print('[HANDS] %s' % label, json.dumps(report))
    assert not bad, 'hands enter the crotch / cross the centreline in %s: %s' % (label, json.dumps(bad))
    idle = report.get('idle')
    if idle:
        assert idle['min_outside_thigh'] >= .045, 'idle hands too close to the thighs: %s' % idle
        assert idle['min_outside_thigh'] <= .20, 'idle arms splayed out like an A-pose: %s' % idle

# ------------------------------------------------------------------------------------------
# Build
# ------------------------------------------------------------------------------------------
def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = FPS
    sc.frame_start = 0

def build_kit():
    mats = make_kit_materials('A')
    arm = build_armature()
    coll = bpy.data.collections.new('Kit')
    bpy.context.scene.collection.children.link(coll)
    objs = {}
    for bt in ('A', 'B'):
        for slot in SLOTS:
            if slot not in KIT[bt]:
                continue
            for idx in range(1, len(KIT[bt][slot]) + 1):
                ob = build_part(bt, slot, idx, mats, arm, coll)
                objs[ob.name] = ob
    clips = {}
    defs = clip_defs()
    defs.update(kit_npc_clips())
    for name, (frames, keys, loop) in defs.items():
        clips[name] = make_clip(arm, name, frames, keys)
    al = clips['attack_slash'].copy()
    al.name = 'attack'
    al.use_fake_user = True
    clips['attack'] = al
    arm.animation_data.action = clips['idle']
    bpy.context.scene.frame_set(0)
    return arm, mats, objs, clips, defs

BRAM_PARTS = [('Hair', 5), ('Jaw', 4), ('Arms', 4), ('Hands', 1), ('Legs', 1), ('Feet', 2)]   # + Bram_Torso (coat extra) + Bram_Staff

def build_bram(kit_objs, kit_mats):
    arm = build_armature()
    arm.name = 'Armature_Bram'
    arm.data.name = 'Armature_Bram'
    coll = bpy.data.collections.new('Bram')
    bpy.context.scene.collection.children.link(coll)
    bm = {}
    for mn, m in kit_mats.items():
        m2 = m.copy()   # -> C_HAIR.001 etc. (runtime strips the .NNN suffix)
        hx = BRAM_COLORS.get(mn)
        set_mat_color(m2, hx if hx else '#%02x%02x%02x' % tuple(round(c * 255) for c in MAT_SRGB[m.name]))
        bm[mn] = m2
    bm['A_WOOD'] = new_mat('A_WOOD', BRAM_COLORS['A_WOOD'])
    objs = {}
    for slot, idx in BRAM_PARTS:
        src = kit_objs[part_name('A', slot, idx)]
        ob = src.copy()
        ob.data = src.data.copy()
        ob.name = 'Bram_' + slot
        ob.data.name = 'Bram_' + slot
        for i, ms in enumerate(ob.data.materials):
            base = ms.name.split('.')[0]
            ob.data.materials[i] = bm[base]
        coll.objects.link(ob)
        ob.parent = arm
        ob.modifiers['Armature'].object = arm
        objs[ob.name] = ob
    mbc = MB()   # his long open coat: a tutor extra built with the same kit torso rules
    torso_style(mbc, 'A', 'coat')
    objs['Bram_Torso'] = mbc.to_object('Bram_Torso', bm, arm, coll=coll)
    # staff: authored vertical + planted in the IDLE pose, then mapped back into the rest pose of the hand
    defs = bram_clip_defs()
    set_pose(arm, defs['idle'][1][0][1])
    pb = arm.pose.bones[B('RightHand')]
    M = pb.matrix @ pb.bone.matrix_local.inverted()
    W, Hn = BHEAD[B('RightHand')], BTAIL[B('RightHand')]
    G = M @ (W + (Hn - W) * 0.40)
    top = G.z + 0.62
    mb = MB()
    RH = B('RightHand')
    def srings(spec):
        return [xring((G.x, G.y, z), (0, 0, 1), r, r, r, 6) for z, r in spec]
    rest = lambda rings: [[tuple(M.inverted() @ Vector(p)) for p in r] for r in rings]
    mb.loft(rest(srings([(0.0, .014), (0.5, .016), (G.z, .018), (top - .06, .019)])), 'A_WOOD', RH)
    mb.loft(rest(srings([(top - .07, .020), (top - .04, .031), (top, .034), (top + .035, .024), (top + .05, .008)])), 'A_WOOD', RH)
    mb.loft(rest(srings([(top - .10, .022), (top - .08, .022)])), 'C_TORSO', RH, smooth=False)
    staff = mb.to_object('Bram_Staff', bm, arm, coll=coll)
    objs['Bram_Staff'] = staff
    clear_pose(arm)
    # clips as NLA tracks named exactly idle / talk / walk / wave
    ad = arm.animation_data_create()
    acts = {}
    for name, (frames, keys, loop) in defs.items():
        act = make_clip(arm, 'bram_' + name, frames, keys)
        ad.action = None
        tr = ad.nla_tracks.new()
        tr.name = name
        st = tr.strips.new(name, 0, act)
        st.name = name
        acts[name] = act
    ad.action = None
    return arm, bm, objs, acts, defs

def export_glb(path, arm, meshes, mode='ACTIONS'):
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.context.scene.objects:
        o.hide_set(False)
    arm.select_set(True)
    for m in meshes:
        m.hide_render = False
        m.select_set(True)
    bpy.context.view_layer.objects.active = arm
    kw = dict(filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
              export_animations=True, export_animation_mode=mode, export_force_sampling=True, export_nla_strips=True,
              export_frame_range=False, export_skins=True, export_morph=False, export_materials='EXPORT',
              export_texcoords=False, export_optimize_animation_size=False, export_def_bones=False, export_reset_pose_bones=True)
    props = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
    kw = {k: v for k, v in kw.items() if k in props or k == 'filepath'}
    bpy.ops.export_scene.gltf(**kw)

# ------------------------------------------------------------------------------------------
# GLB reading + validation (pure JSON + Blender re-import)
# ------------------------------------------------------------------------------------------
def read_glb(path):
    d = open(path, 'rb').read()
    ln = struct.unpack('<I', d[12:16])[0]
    return json.loads(d[20:20 + ln])

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

def validate(out_glb, want_meshes, want_clips, exact_clips=False):
    j, rj = read_glb(out_glb), read_glb(REF_GLB)
    n_new, p_new, r_new = glb_skeleton(j)
    n_ref, p_ref, r_ref = glb_skeleton(rj)
    res = {'glb': os.path.relpath(out_glb, REPO).replace('\\', '/'),
           'bone_names_match': sorted(n_new) == sorted(n_ref) and len(n_new) == len(n_ref),
           'bone_order_match': n_new == n_ref, 'hierarchy_match': p_new == p_ref, 'bone_count': len(n_new)}
    mt = mr = 0.0
    for n in n_ref:
        if n in r_new:
            t0, q0 = r_ref[n]
            t1, q1 = r_new[n]
            mt = max(mt, max(abs(a - b) for a, b in zip(t0, t1)))
            mr = max(mr, math.degrees(2 * math.acos(min(1.0, abs(sum(a * b for a, b in zip(q0, q1)))))))
    res['max_rest_translation_delta_m'] = round(mt, 5)
    res['max_rest_rotation_delta_deg'] = round(mr, 3)
    clips = glb_clips(j)
    res['clips'] = clips
    res['missing_clips'] = [c for c in want_clips if c not in clips]
    res['unexpected_clips'] = [c for c in clips if c not in want_clips] if exact_clips else []
    res['zero_duration_clips'] = [c for c, d in clips.items() if d <= 0]
    names = [n.get('name') for n in j['nodes']]
    res['missing_meshes'] = [m for m in want_meshes if m not in names]
    res['materials'] = sorted({m['name'] for m in j.get('materials', [])})
    res['texture_count'] = len(j.get('textures', [])) + len(j.get('images', []))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=out_glb)
    arms = [o for o in bpy.data.objects if o.type == 'ARMATURE']
    bl_new = sorted(b.name for b in arms[0].data.bones) if arms else []
    imported_meshes = sorted(o.name for o in bpy.data.objects if o.type == 'MESH')
    nsm, ntot, no_hard = 0, 0, []
    for o in bpy.data.objects:
        if o.type != 'MESH':
            continue
        me = o.data
        cn = me.corner_normals
        groups = {}
        for poly in me.polygons:
            for li in poly.loop_indices:
                ntot += 1
                nv = cn[li].vector
                if nv.dot(poly.normal) < 0.99985:   # > ~1 deg from the face normal = shared (smoothed) normal
                    nsm += 1
                key = tuple(round(c, 4) for c in me.vertices[me.loops[li].vertex_index].co)
                groups.setdefault(key, set()).add(tuple(round(c, 2) for c in nv))
        if not any(len(g) > 1 for g in groups.values()):
            no_hard.append(o.name)
    res['smoothed_corner_fraction'] = round(nsm / max(1, ntot), 4)
    res['meshes_without_hard_edges'] = no_hard
    res['glb_vertex_to_triangle_ratio'] = round(sum(j['accessors'][pr['attributes']['POSITION']]['count'] for m in j['meshes'] for pr in m['primitives'])
                                              / max(1, sum(j['accessors'][pr['indices']]['count'] / 3 for m in j['meshes'] for pr in m['primitives'])), 3)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=REF_GLB)
    arms = [o for o in bpy.data.objects if o.type == 'ARMATURE']
    bl_ref = sorted(b.name for b in arms[0].data.bones) if arms else []
    res['blender_reimport_bones_match'] = bl_new == bl_ref and len(bl_new) == 23
    res['blender_reimport_mesh_count'] = len(imported_meshes)
    res['PASS'] = (res['bone_names_match'] and res['hierarchy_match'] and res['blender_reimport_bones_match'] and
                   not res['missing_clips'] and not res['unexpected_clips'] and not res['zero_duration_clips'] and
                   not res['missing_meshes'] and res['texture_count'] == 0 and not res['meshes_without_hard_edges']
                   and 0.20 < res['smoothed_corner_fraction'] < 0.90)
    assert res['bone_names_match'], 'bone names differ from player.glb'
    assert res['hierarchy_match'], 'bone hierarchy differs from player.glb'
    assert res['blender_reimport_bones_match'], 'Blender re-import bone set differs'
    assert not res['missing_clips'], 'missing clips %s' % res['missing_clips']
    assert not res['unexpected_clips'], 'unexpected clips %s' % res['unexpected_clips']
    assert not res['zero_duration_clips'], 'zero-duration clips %s' % res['zero_duration_clips']
    assert not res['missing_meshes'], 'missing meshes %s' % res['missing_meshes']
    assert res['texture_count'] == 0, 'textures present'
    assert not res['meshes_without_hard_edges'], 'parts without any material/crease split: %s' % res['meshes_without_hard_edges']
    assert 0.20 < res['smoothed_corner_fraction'] < 0.90, 'panel shading out of range (smoothed corners %s)' % res['smoothed_corner_fraction']
    return res

# ------------------------------------------------------------------------------------------
# Proof renders (EEVEE, one warm key sun following the camera + cool ambient; transparent film,
# backgrounds and labels added by the PIL compositor)
# ------------------------------------------------------------------------------------------
R = {}

def setup_render():
    sc = bpy.context.scene
    try:
        sc.render.engine = 'BLENDER_EEVEE_NEXT'
    except TypeError:
        sc.render.engine = 'BLENDER_EEVEE'
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    try:
        sc.eevee.taa_render_samples = 24
    except Exception:
        pass
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    world = bpy.data.worlds.new('W')
    sc.world = world
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = (0.52, 0.52, 0.53, 1)
    bg.inputs['Strength'].default_value = 1.0
    sd = bpy.data.lights.new('Key', 'SUN')
    sd.energy = 1.55
    sd.color = (1.0, 0.95, 0.86)
    sd.angle = math.radians(14)
    sun = bpy.data.objects.new('Key', sd)
    sc.collection.objects.link(sun)
    cd = bpy.data.cameras.new('Cam')
    cd.type = 'ORTHO'
    cam = bpy.data.objects.new('Cam', cd)
    sc.collection.objects.link(cam)
    sc.camera = cam
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=True, segments=32, radius=1.6)
    gm = bpy.data.meshes.new('Ground')
    bm.to_mesh(gm)
    bm.free()
    g = bpy.data.objects.new('Ground', gm)
    sc.collection.objects.link(g)
    g.location.z = -0.001
    gmat = bpy.data.materials.new('GroundMat')
    gmat.use_nodes = True
    next(n for n in gmat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Base Color'].default_value = (0.30, 0.30, 0.29, 1)
    next(n for n in gmat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Roughness'].default_value = 1.0
    gm.materials.append(gmat)
    g.hide_render = True
    R.update(cam=cam, sun=sun, ground=g)

def shoot(path, res, view_dir, center, ortho, ground=False, persp=None):
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    vd = Vector(view_dir).normalized()
    cam = R['cam']
    if persp:   # (distance m, lens mm)
        cam.data.type = 'PERSP'
        cam.data.lens = persp[1]
        cam.location = Vector(center) + vd * persp[0]
    else:
        cam.data.type = 'ORTHO'
        cam.location = Vector(center) + vd * 12
    cam.rotation_euler = (-vd).to_track_quat('-Z', 'Y').to_euler()
    cam.data.ortho_scale = ortho
    cam.data.clip_end = 60
    right = Vector((0, 0, 1)).cross(vd)
    right = right.normalized() if right.length > 1e-6 else Vector((1, 0, 0))
    ldir = -(Vector((vd.x, vd.y, 0)).normalized() * 0.55 + Vector((0, 0, 1)) * 0.78 - right * 0.40)
    R['sun'].rotation_euler = ldir.normalized().to_track_quat('-Z', 'Y').to_euler()
    R['ground'].hide_render = not ground
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path

def show_only(visible):
    vis = set(visible)
    for o in bpy.context.scene.objects:
        if o.type == 'MESH' and o.name not in ('Ground',):
            o.hide_render = o not in vis
            o.hide_viewport = o not in vis

def outfit_objs(objs, bt, sel):
    return [objs[part_name(bt, s, i)] for s, i in sel.items() if i]

def build_props(arm):
    def flat(name, rgb):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Base Color'].default_value = rgb + (1,)
        return m
    steel, wood = flat('P_Steel', (0.42, 0.44, 0.47)), flat('P_Wood', (0.22, 0.12, 0.05))
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
        me = bpy.data.meshes.new(name)
        bm.to_mesh(me)
        bm.free()
        for m in mlist:
            me.materials.append(m)
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        W, Hn = BHEAD[bone], BTAIL[bone]
        ob.location = W + (Hn - W) * .40
        pb = arm.pose.bones[bone]
        bpy.context.view_layer.update()
        mw = ob.matrix_world.copy()
        ob.parent = arm
        ob.parent_type = 'BONE'
        ob.parent_bone = bone
        ob.matrix_parent_inverse = (arm.matrix_world @ pb.bone.matrix_local @ Matrix.Translation((0, pb.bone.length, 0))).inverted()
        ob.matrix_basis = mw
        ob.hide_render = True
        return ob
    return {'axe': mk('Prop_Axe', [((0, -.22, 0), (.03, .62, .03), wood), ((0, -.50, -.05), (.018, .09, .15), steel)], B('RightHand'))}

COMPOSE_PY = r'''
import sys, json
from PIL import Image, ImageDraw, ImageFont
spec = json.load(open(sys.argv[1]))
def font(sz):
    for f in ("arial.ttf", "segoeui.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(f, sz)
        except Exception:
            pass
    return ImageFont.load_default()
LAB = 26
rows = []
W = 0
for row in spec['rows']:
    h = row['height']
    tiles = []
    for cell in row['cells']:
        im = Image.open(cell['path'])
        if 'crop' in cell:
            im = im.crop(tuple(cell['crop']))
        sil = cell.get('sil')
        if sil:   # outline-only: figure black on white
            import numpy as np
            a = np.asarray(im.convert('RGBA')).astype(int)
            if sil == 'alpha':
                m = a[..., 3] > 20
            elif sil == 'rowbg':   # smooth vertical gradient background (concept sheet)
                bgc = np.median(np.concatenate([a[:, :12, :3], a[:, -12:, :3]], axis=1), axis=1)
                m = np.abs(a[..., :3] - bgc[:, None, :]).sum(axis=2) > 40
            elif sil == 'flat':    # near-uniform background colour
                bgc = np.median(a[:, :8, :3].reshape(-1, 3), axis=0)
                m = np.abs(a[..., :3] - bgc).sum(axis=2) > 55
            else:                  # 'olive': figure is blue/grey/skin on olive grass
                r, g, b = a[..., 0], a[..., 1], a[..., 2]
                m = (b > g - 4) | ((r > g + 25) & (r > 150))
            ys, xs = np.where(m)
            if len(ys):
                pad = int(.04 * (ys.max() - ys.min()))
                y0, y1 = max(0, ys.min() - pad), min(m.shape[0], ys.max() + pad)
                x0, x1 = max(0, xs.min() - pad), min(m.shape[1], xs.max() + pad)
                m = m[y0:y1, x0:x1]
            out = np.where(m[..., None], 0, 255).astype('uint8').repeat(3, axis=2)
            im = Image.fromarray(out).convert('RGBA')
        im = im.convert('RGBA')
        bg = Image.new('RGBA', im.size, tuple(cell.get('bg', [210, 210, 214])) + (255,))
        im = Image.alpha_composite(bg, im).convert('RGB')
        w = round(im.width * h / im.height)
        im = im.resize((w, h), Image.LANCZOS)
        c = Image.new('RGB', (w, h + LAB), (44, 44, 48))
        c.paste(im, (0, LAB))
        ImageDraw.Draw(c).text((6, 4), cell.get('label', ''), fill=(236, 236, 236), font=font(16))
        tiles.append(c)
    gap = 6
    rw = sum(t.width for t in tiles) + gap * (len(tiles) - 1)
    r = Image.new('RGB', (rw, h + LAB), (28, 28, 30))
    x = 0
    for t in tiles:
        r.paste(t, (x, 0))
        x += t.width + gap
    rows.append((row.get('title', ''), r))
    W = max(W, rw)
title = spec.get('title', '')
TH = 42 if title else 0
H = TH + sum(r.height + (28 if t else 0) + 10 for t, r in rows)
out = Image.new('RGB', (W + 20, H + 6), (22, 22, 24))
d = ImageDraw.Draw(out)
if title:
    d.text((10, 8), title, fill=(255, 255, 255), font=font(24))
y = TH
for t, r in rows:
    if t:
        d.text((10, y + 3), t, fill=(206, 214, 160), font=font(19))
        y += 28
    out.paste(r, (10, y))
    y += r.height + 10
out.save(spec['out'])
'''

MEASURE_PY = r"""
import sys, json
import numpy as np
from PIL import Image
spec = json.load(open(sys.argv[1]))
res = {}
for key, path, mode, crop in spec['items']:
    im = Image.open(path)
    if crop:
        im = im.crop(tuple(crop))
    a = np.asarray(im.convert('RGBA')).astype(int)
    if mode == 'alpha':
        m = a[..., 3] > 20
    else:
        bgc = np.median(np.concatenate([a[:, :12, :3], a[:, -12:, :3]], axis=1), axis=1)
        m = np.abs(a[..., :3] - bgc[:, None, :]).sum(axis=2) > 40
    ys, xs = np.where(m)
    top, bot = ys.min(), ys.max()
    H = float(bot - top)
    cx = int(np.median(xs))
    wid = np.array([m[y].sum() for y in range(top, bot + 1)])
    band = wid[: int(.28 * H)]
    neck = int(np.argmin(band[int(.08 * H):]) + int(.08 * H))
    head_w = float(band[:neck].max())
    sh = wid[neck: neck + int(.10 * H)]
    split = next((y for y in range(top + int(.35 * H), bot) if not m[y, cx - 1:cx + 2].any()), bot)
    leg_rows = range(split + int(.05 * H), min(bot, split + int(.15 * H)))
    def left_run(y):
        row = np.where(m[y, :cx])[0]
        if not len(row):
            return 0
        end = row.max(); start = end
        while start > 0 and m[y, start - 1]:
            start -= 1
        return end - start + 1
    thigh = float(np.mean([left_run(y) for y in leg_rows])) if len(leg_rows) else 0.0
    res[key] = {'head_h/H': round(neck / H, 3), 'head_w/head_h': round(head_w / max(1, neck), 3),
                'span_below_neck/H': round(float(sh.max()) / H, 3), 'crotch_h/H': round((bot - split) / H, 3),
                'thigh_w/H': round(thigh / H, 3)}
print(json.dumps(res))
"""

def measure_outlines(items):
    spec_path = os.path.join(RENDER_DIR, '_mspec.json')
    code_path = os.path.join(RENDER_DIR, '_measure.py')
    with open(spec_path, 'w', encoding='utf-8') as fh:
        json.dump({'items': items}, fh)
    with open(code_path, 'w', encoding='utf-8') as fh:
        fh.write(MEASURE_PY)
    py = shutil.which('python') or shutil.which('py')
    env = {k: v for k, v in os.environ.items() if not k.startswith('PYTHON')}
    r = subprocess.run([py, code_path, spec_path], capture_output=True, text=True, env=env)
    for q in (spec_path, code_path):
        try:
            os.remove(q)
        except OSError:
            pass
    try:
        return json.loads(r.stdout.strip().splitlines()[-1])
    except Exception:
        print('[measure] failed', r.stderr[-600:])
        return {}

def compose(out, rows, title=''):
    spec_path = os.path.join(RENDER_DIR, '_spec.json')
    with open(spec_path, 'w', encoding='utf-8') as fh:
        json.dump({'out': out, 'rows': rows, 'title': title}, fh)
    code_path = os.path.join(RENDER_DIR, '_compose.py')
    with open(code_path, 'w', encoding='utf-8') as fh:
        fh.write(COMPOSE_PY)
    py = shutil.which('python') or shutil.which('py')
    env = {k: v for k, v in os.environ.items() if not k.startswith('PYTHON')}
    r = subprocess.run([py, code_path, spec_path], capture_output=True, text=True, env=env)
    if r.returncode != 0:
        print('[compose] FAILED', out, r.stderr[-800:])
    for p in (spec_path, code_path):
        try:
            os.remove(p)
        except OSError:
            pass
    return out

def cell(path, label, **kw):
    d = {'path': path, 'label': label}
    d.update(kw)
    return d

PRESENT = {'LeftArm': (0, -4, 0), 'RightArm': (0, 4, 0), 'LeftForeArm': (-4, -20, 0), 'RightForeArm': (-4, 20, 0)}
TURN_RES, TURN_ORTHO, TURN_CENTER = (459, 768), 2.275, (0, 0.01, 0.966)
VIEWS = [('front', (0, -1, 0)), ('side', (-1, 0, 0)), ('back', (0, 1, 0))]
V34 = (.45, -.87, .20)
GRID_VIEW = {'Torso': ((0, 0, 1.20), 1.00, (.45, -.87, .12)), 'Arms': ((0, 0, 1.12), 1.25, (.30, -.95, .10)),
             'Hands': ((.29, -.03, .80), .42, (.55, -.83, .12)), 'Legs': ((0, 0, .56), 1.25, (.40, -.90, .10)),
             'Feet': ((0, -.03, .15), .62, (.55, -.82, .25))}
BG_REF = [214, 214, 218]
BG_GAME = [138, 138, 134]

def run_renders(arm, mats, objs, clips, bram):
    os.makedirs(RENDER_DIR, exist_ok=True)
    setup_render()
    set_render_colors(True)
    props = build_props(arm)
    D = RENDER_DIR
    j = lambda *a: os.path.join(D, *a)
    def set_clip(a, act, frame):
        a.animation_data.action = act
        bpy.context.scene.frame_set(frame)
    def default_colors(bt):
        apply_outfit_colors(mats, {ch: PALETTES[ch][DEFAULT_COLORS[bt][ch]] for ch in PALETTES})
    arm.animation_data.action = None
    set_pose(arm, P())
    barm, bobjs, bacts = bram
    for tr in barm.animation_data.nla_tracks:
        tr.mute = True
    sheets = {}
    # (1) default male / female turnarounds (rest pose = the concept's A-pose)
    turn = {}
    for bt in ('A', 'B'):
        default_colors(bt)
        show_only(outfit_objs(objs, bt, DEFAULT_OUTFIT[bt]))
        for vn, vd in VIEWS:
            turn[(bt, vn)] = shoot(j('turn_%s_%s.png' % (bt, vn)), TURN_RES, vd, TURN_CENTER, TURN_ORTHO)
        turn[(bt, '34')] = shoot(j('default_%s_34.png' % bt), (420, 600), V34, (0, 0, .93), 2.05)
    compose(j('defaults_vs_refs.png'), [
        {'title': 'Reference: male_b_turnaround.png (target look)', 'height': 400, 'cells': [cell(REF_TURN, 'male_b_turnaround.png (reference)')]},
        {'title': 'v2 kit: default body type A (male) front / side / back -- same framing', 'height': 400,
         'cells': [cell(turn[('A', v)], 'A ' + v, bg=BG_REF) for v, _ in VIEWS]},
        {'title': 'v2 kit: default body type B (female) front / side / back', 'height': 400,
         'cells': [cell(turn[('B', v)], 'B ' + v, bg=BG_REF) for v, _ in VIEWS]},
        {'title': 'Reference: Character_Creator_Screen.jpg preview vs v2 defaults (3/4)', 'height': 380,
         'cells': [cell(REF_CREATOR, 'creator preview (reference)', crop=[300, 205, 528, 470]),
                   cell(turn[('A', '34')], 'v2 default A', bg=[74, 66, 56]), cell(turn[('B', '34')], 'v2 default B', bg=[74, 66, 56])]},
    ], 'Crafted Realms kit v2 -- default characters vs references')
    sheets['defaults'] = j('defaults_vs_refs.png')
    if QUICK:
        return sheets
    # (4) Bram 3/4 beside Character.jpg
    show_only(list(bobjs.values()))
    barm.animation_data.action = bacts['idle']
    bpy.context.scene.frame_set(0)
    bram_34 = shoot(j('bram_34.png'), (624, 798), (.30, -.88, .42), (0, -.05, .88), 2.25, ground=True)
    bram_front = shoot(j('bram_front.png'), (459, 768), (0, -1, 0), TURN_CENTER, TURN_ORTHO)
    bram_back = shoot(j('bram_back.png'), (459, 768), (0, 1, 0), TURN_CENTER, TURN_ORTHO)
    set_clip(barm, bacts['talk'], 12)
    bram_talk = shoot(j('bram_talk.png'), (360, 480), (.55, -.82, .18), (0, 0, .95), 2.1)
    set_clip(barm, bacts['wave'], 14)
    bram_wave = shoot(j('bram_wave.png'), (360, 480), (.55, -.82, .18), (0, 0, .95), 2.1)
    set_clip(barm, bacts['walk'], 0)
    bram_walk = shoot(j('bram_walk.png'), (360, 480), (.95, -.3, .15), (0, 0, .95), 2.1)
    barm.animation_data.action = None
    clear_pose(barm)
    compose(j('bram_vs_character.png'), [
        {'height': 640, 'cells': [cell(REF_NPC, 'Character.jpg (reference)'), cell(bram_34, 'Guide Bram v2 (3/4, idle)', bg=BG_GAME),
                                  cell(bram_front, 'front (idle f0)', bg=BG_REF), cell(bram_back, 'back (idle f0)', bg=BG_REF)]},
    ], 'Guide Bram v2.2 -- kit parts (Hair_05 medium, Jaw_04 medium, Arms_04 large cuffed, Hands_01, Legs_01, Feet_02) + coat + staff')
    sheets['bram'] = j('bram_vs_character.png')
    # (5) key frames
    default_colors('A')
    show_only(outfit_objs(objs, 'A', DEFAULT_OUTFIT['A']))
    shots = []
    for cname, fr, vd, pr in (('idle', 30, (.55, -.82, .18), None), ('walk', 0, (.95, -.3, .15), None), ('chop', 0, (.5, -.85, .2), 'axe'),
                              ('chop', 10, (.5, -.85, .2), 'axe'), ('cast', 14, (.8, -.6, .2), None), ('run', 4, (.95, -.3, .15), None)):
        props['axe'].hide_render = pr != 'axe'
        set_clip(arm, clips[cname], fr)
        shots.append(cell(shoot(j('clip_%s_%d.png' % (cname, fr)), (360, 480), vd, (0, 0, .95), 2.1), '%s f%d' % (cname, fr), bg=BG_GAME))
    props['axe'].hide_render = True
    set_clip(arm, clips['talk'], 12)
    shots.append(cell(shoot(j('clip_talk_12.png'), (360, 480), (.55, -.82, .18), (0, 0, .95), 2.1), 'kit talk f12', bg=BG_GAME))
    arm.animation_data.action = None
    set_pose(arm, P())
    compose(j('clips.png'), [
        {'title': 'Default A: idle / walk / chop (wind-up + strike) / cast / run / talk', 'height': 420, 'cells': shots},
        {'title': 'Guide Bram: talk / wave / walk', 'height': 420,
         'cells': [cell(bram_talk, 'bram talk f12', bg=BG_GAME), cell(bram_wave, 'bram wave f14', bg=BG_GAME), cell(bram_walk, 'bram walk f0', bg=BG_GAME)]},
    ], 'Clip key frames (kit rig = player.glb bones)')
    sheets['clips'] = j('clips.png')
    # (2) slot grids: one slot varied at a time on the default body
    for bt in ('A', 'B'):
        default_colors(bt)
        rows = []
        for slot in SLOTS:
            if slot not in KIT[bt]:
                continue
            cells_f, cells_b = [], []
            for idx in range(1, len(KIT[bt][slot]) + 1):
                sel = dict(DEFAULT_OUTFIT[bt])
                sel[slot] = idx
                if slot == 'Legs':
                    sel['Feet'] = 2   # shoes, so every hem style is visible
                show_only(outfit_objs(objs, bt, sel))
                nm = part_name(bt, slot, idx)
                lab = '%02d %s' % (idx, KIT[bt][slot][idx - 1][1])[:30]
                if slot in ('Hair', 'Jaw'):
                    if slot == 'Hair':
                        p = shoot(j('grid', nm + '_f.png'), (240, 280), (.55, -.80, .12), (0, -.01, 1.55), .78)
                        q = shoot(j('grid', nm + '_b.png'), (240, 280), (-.55, .80, .12), (0, -.01, 1.55), .78)
                        cells_f.append(cell(p, lab, bg=BG_REF))
                        cells_b.append(cell(q, '%02d back' % idx, bg=BG_REF))
                    else:
                        p = shoot(j('grid', nm + '.png'), (240, 280), (.55, -.80, .10), (0, -.02, 1.60), .50)
                        q = shoot(j('grid', nm + '_side.png'), (240, 280), (-1, -.05, .05), (0, -.02, 1.60), .50)
                        cells_f.append(cell(p, lab, bg=BG_REF))
                        cells_b.append(cell(q, '%02d side' % idx, bg=BG_REF))
                else:   # close-up on the slot's own region
                    ctr, orth, vd = GRID_VIEW[slot]
                    p = shoot(j('grid', nm + '.png'), (250, 300), vd, ctr, orth)
                    cells_f.append(cell(p, lab, bg=BG_REF))
            rows.append({'title': '%s (%d)' % (slot, len(cells_f)), 'height': 280 if slot != 'Hair' else 260, 'cells': cells_f})
            if cells_b:
                rows.append({'title': '%s -- %s view' % (slot, 'back' if slot == 'Hair' else 'side'), 'height': 260, 'cells': cells_b})
        compose(j('grid_%s.png' % bt), rows, 'Body type %s -- every option of every slot (others at default)' % bt)
        sheets['grid_' + bt] = j('grid_%s.png' % bt)
    # (3) six random outfits with random palette colours
    rng = random.Random(2004)
    cells_r = []
    for k in range(6):
        bt = 'AB'[k % 2]
        sel = {s: rng.randint(1, len(KIT[bt][s])) for s in SLOTS if s in KIT[bt]}
        cols = {ch: rng.choice(PALETTES[ch]) for ch in PALETTES}
        apply_outfit_colors(mats, cols)
        show_only(outfit_objs(objs, bt, sel))
        p = shoot(j('random_%d.png' % (k + 1)), (320, 480), V34, (0, 0, .93), 2.05)
        cells_r.append(cell(p, '%s: ' % bt + ' '.join('%s%02d' % ({'Hair': 'Hr', 'Hands': 'Hn'}.get(s, s[0:2]), i) for s, i in sel.items()), bg=BG_GAME))
    compose(j('random_outfits.png'), [{'height': 480, 'cells': cells_r}], '6 random outfits + random palette colours (seed 2004)')
    sheets['random'] = j('random_outfits.png')
    default_colors('A')
    # overall compare.png
    compose(j('compare.png'), [
        {'title': 'male_b_turnaround.png  vs  v2 default A (front / side / back)', 'height': 360,
         'cells': [cell(REF_TURN, 'reference')] + [cell(turn[('A', v)], 'v2 ' + v, bg=BG_REF) for v, _ in VIEWS]},
        {'title': 'Character.jpg vs Guide Bram v2  |  creator preview vs v2 defaults', 'height': 420,
         'cells': [cell(REF_NPC, 'reference'), cell(bram_34, 'Bram v2', bg=BG_GAME), cell(REF_CREATOR, 'creator (reference)', crop=[300, 205, 528, 470]),
                   cell(turn[('A', '34')], 'v2 A', bg=[74, 66, 56]), cell(turn[('B', '34')], 'v2 B', bg=[74, 66, 56])]},
    ], 'compare.png -- v2 renders next to their references')
    sheets['compare'] = j('compare.png')
    # (e) v1 vs v2
    # joints: every arms / legs option on several torsos (shoulder + hip transitions)
    for bt in ('A', 'B'):
        default_colors(bt)
        rows = []
        torsos = list(range(1, len(KIT[bt]['Torso']) + 1))
        for slot, ctr, orth in (('Arms', (0, 0, 1.18), 1.15), ('Legs', (0, 0, .70), 1.35)):
            for idx in range(1, len(KIT[bt][slot]) + 1):
                cells_j = []
                for ti in torsos:
                    sel = dict(DEFAULT_OUTFIT[bt])
                    sel[slot] = idx
                    sel['Torso'] = ti
                    show_only(outfit_objs(objs, bt, sel))
                    p = shoot(j('grid', 'joint_%s_%s%02d_T%02d.png' % (bt, slot, idx, ti)), (170, 200), (.55, -.83, .10), ctr, orth)
                    cells_j.append(cell(p, 'T%02d %s' % (ti, KIT[bt]['Torso'][ti - 1][0])[:22], bg=BG_REF))
                rows.append({'title': '%s %02d %s  x every torso' % (slot, idx, KIT[bt][slot][idx - 1][0]), 'height': 190, 'cells': cells_j})
        compose(j('joints_%s.png' % bt), rows, 'Body %s joint check: every Arms and Legs option on every Torso' % bt)
        sheets['joints_' + bt] = j('joints_%s.png' % bt)
    default_colors('A')
    # game camera: ~45 deg down, ~5 m away, idle pose, same camera for all three
    GV, GC, GP = (.42, -.72, .78), (0, 0, .85), (5.0, 85)
    gcells = [cell(REF_NPC, 'Character.jpg (reference)'), cell(REF_CREATOR, 'creator (reference)', crop=[300, 205, 528, 470])]
    arm.animation_data.action = clips['idle']
    bpy.context.scene.frame_set(0)
    for bt in ('A', 'B'):
        apply_outfit_colors(mats, {ch: PALETTES[ch][DEFAULT_COLORS[bt][ch]] for ch in PALETTES})
        show_only(outfit_objs(objs, bt, DEFAULT_OUTFIT[bt]))
        gcells.append(cell(shoot(j('game_%s.png' % bt), (420, 560), GV, GC, 2.0, ground=True, persp=GP), 'default %s (idle, game camera)' % bt, bg=BG_GAME))
    arm.animation_data.action = None
    show_only(list(bobjs.values()))
    barm.animation_data.action = bacts['idle']
    bpy.context.scene.frame_set(0)
    gcells.append(cell(shoot(j('game_bram.png'), (420, 560), GV, GC, 2.0, ground=True, persp=GP), 'Guide Bram (idle, game camera)', bg=BG_GAME))
    barm.animation_data.action = None
    compose(j('game_camera.png'), [{'height': 520, 'cells': gcells}], 'Game camera (~45 deg down, 5 m, 85 mm), idle clip: v2.5 vs the 2004-era references')
    sheets['game_camera'] = j('game_camera.png')
    prev = os.path.join(D, 'prev_v24')
    if os.path.isdir(prev):
        compose(j('v24_vs_v25.png'), [
            {'height': 560, 'cells': [cell(os.path.join(prev, 'turn_A_front.png'), 'v2.4 (too round)', bg=BG_REF), cell(turn[('A', 'front')], 'v2.5', bg=BG_REF),
                                      cell(os.path.join(prev, 'turn_B_front.png'), 'v2.4 B', bg=BG_REF), cell(turn[('B', 'front')], 'v2.5 B', bg=BG_REF),
                                      cell(os.path.join(prev, 'bram_34.png'), 'v2.4 Bram', bg=BG_GAME), cell(bram_34, 'v2.5 Bram', bg=BG_GAME)]},
            {'height': 520, 'cells': [cell(os.path.join(prev, 'game_A.png'), 'v2.4 game cam A', bg=BG_GAME), cell(j('game_A.png'), 'v2.5 game cam A', bg=BG_GAME),
                                      cell(os.path.join(prev, 'game_B.png'), 'v2.4 B', bg=BG_GAME), cell(j('game_B.png'), 'v2.5 B', bg=BG_GAME),
                                      cell(os.path.join(prev, 'game_bram.png'), 'v2.4 Bram', bg=BG_GAME), cell(j('game_bram.png'), 'v2.5 Bram', bg=BG_GAME)]},
        ], 'v2.4 (too round) vs v2.5 (angular silhouette, panel shading, measured proportions)')
        sheets['v24_vs_v25'] = j('v24_vs_v25.png')
    sheets.update(rs_style_sheets(arm, mats, objs, clips, default_colors, j))
    return sheets

def rs_style_sheets(arm, mats, objs, clips, default_colors, j):
    """RS-look proof: defaults beside crops of the 2004-style references at a similar angle, and the idle hand gap."""
    out = {}
    REF_DAGGER = os.path.join(BIBLE, 'DragonDagger_Equiped.jpg')
    arm.animation_data.action = clips['idle']
    bpy.context.scene.frame_set(0)
    cells = [cell(REF_CREATOR, 'Character_Creator_Screen.jpg (crop)', crop=[300, 205, 528, 470]),
             cell(REF_DAGGER, 'DragonDagger_Equiped.jpg (crop)', crop=[430, 150, 880, 1420])]
    for bt in ('A', 'B'):
        default_colors(bt)
        show_only(outfit_objs(objs, bt, DEFAULT_OUTFIT[bt]))
        cells.append(cell(shoot(j('rs_%s_creator.png' % bt), (300, 420), (.42, -.86, .22), (0, 0, .93), 2.0), 'v2.5 %s, creator angle (idle)' % bt, bg=[74, 66, 56]))
        cells.append(cell(shoot(j('rs_%s_dagger.png' % bt), (300, 480), (-.80, .20, .56), (0, 0, .90), 2.1, ground=True, persp=(5.0, 85)),
                          'v2.5 %s, dagger-ref angle (idle)' % bt, bg=[112, 118, 48]))
    compose(j('rs_style_compare.png'), [{'height': 520, 'cells': cells}], 'v2.5 defaults next to the 2004-style references (similar angle and size)')
    out['rs_style'] = j('rs_style_compare.png')
    # outline-only comparison: reference silhouettes next to ours at matching views
    default_colors('A')
    show_only(outfit_objs(objs, 'A', DEFAULT_OUTFIT['A']))
    arm.animation_data.action = None
    set_pose(arm, P())
    sa_front = shoot(j('sil_A_front.png'), (459, 768), (0, -1, 0), TURN_CENTER, TURN_ORTHO)
    sa_side = shoot(j('sil_A_side.png'), (459, 768), (-1, 0, 0), TURN_CENTER, TURN_ORTHO)
    arm.animation_data.action = clips['idle']
    bpy.context.scene.frame_set(0)
    sa_34 = shoot(j('sil_A_34.png'), (300, 420), (.42, -.86, .22), (0, 0, .93), 2.0)
    sa_dg = shoot(j('sil_A_dagger.png'), (300, 480), (-.80, .20, .56), (0, 0, .90), 2.1, persp=(5.0, 85))
    compose(j('silhouette_compare.png'), [
        {'title': 'front / side: male_b concept vs v2.5 default A (outline only)', 'height': 420,
         'cells': [cell(REF_TURN, 'male_b front (ref)', crop=[80, 70, 480, 720], sil='rowbg'), cell(sa_front, 'v2.5 A front', sil='alpha'),
                   cell(REF_TURN, 'male_b side (ref)', crop=[590, 70, 830, 720], sil='rowbg'), cell(sa_side, 'v2.5 A side', sil='alpha')]},
        {'title': '3/4 and high angle: creator + DragonDagger refs vs v2.5 A (outline only)', 'height': 420,
         'cells': [cell(REF_CREATOR, 'creator (ref)', crop=[310, 210, 520, 470], sil='flat'), cell(sa_34, 'v2.5 A 3/4', sil='alpha'),
                   cell(REF_DAGGER, 'DragonDagger (ref)', crop=[480, 170, 830, 1410], sil='olive'), cell(sa_dg, 'v2.5 A same angle', sil='alpha')]},
    ], 'Silhouette check: straight segments and corners, measured proportions')
    out['silhouette'] = j('silhouette_compare.png')
    out['measured_outlines'] = measure_outlines([
        ['ref_male_b_front', REF_TURN, 'rowbg', [80, 70, 480, 720]], ['v25_A_front', sa_front, 'alpha', None]])
    print('[MEASURE]', json.dumps(out['measured_outlines']))
    # front idle: measured horizontal gap between the hand's inner edge and the thigh's outer edge
    gcells = []
    for bt in ('A', 'B'):
        default_colors(bt)
        sel = outfit_objs(objs, bt, DEFAULT_OUTFIT[bt])
        show_only(sel)
        for fr in (0, 30):
            bpy.context.scene.frame_set(fr)
            dg = bpy.context.evaluated_depsgraph_get()
            def verts(nm):
                o = objs[nm].evaluated_get(dg)
                me = o.to_mesh()
                v = [o.matrix_world @ q.co for q in me.vertices]
                o.to_mesh_clear()
                return v
            hv = [v for v in verts(part_name(bt, 'Hands', DEFAULT_OUTFIT[bt]['Hands'])) if v.x > 0]
            lv = verts(part_name(bt, 'Legs', DEFAULT_OUTFIT[bt]['Legs']))
            z0, z1 = min(v.z for v in hv), max(v.z for v in hv)
            thigh = max((v.x for v in lv if z0 <= v.z <= z1 and v.x > 0), default=0.0)
            gap = min(v.x for v in hv) - thigh
            tip = min(v.z for v in hv)
            p = shoot(j('idle_gap_%s_f%d.png' % (bt, fr)), (459, 768), (0, -1, 0), TURN_CENTER, TURN_ORTHO)
            gcells.append(cell(p, '%s idle f%d  gap %.3f m  tip z %.2f' % (bt, fr, gap, tip), bg=BG_REF))
            out.setdefault('idle_gap_m', {})['%s_f%d' % (bt, fr)] = round(gap, 4)
    compose(j('idle_hand_gap.png'), [{'height': 560, 'cells': gcells}], 'Front view, idle clip: hands hang beside the hips, clear of the thighs')
    out['idle_gap'] = j('idle_hand_gap.png')
    arm.animation_data.action = None
    return out

def render_v1_vs_v2(objs, turn, bram_34):
    D = RENDER_DIR
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=V1_PLAYER)
    v1p = [o for o in bpy.data.objects if o not in before]
    for o in v1p:
        if o.type == 'ARMATURE' and o.animation_data:
            o.animation_data.action = None
    show_only([o for o in v1p if o.type == 'MESH'])
    a = shoot(os.path.join(D, 'v1_player_front.png'), TURN_RES, (0, -1, 0), TURN_CENTER, TURN_ORTHO)
    for o in v1p:
        o.hide_render = True
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=V1_BRAM)
    v1b = [o for o in bpy.data.objects if o not in before]
    for o in v1b:   # v1 tutors stored sRGB-to-see: convert for a fair Blender render
        if o.type == 'MESH':
            for m in o.data.materials:
                bs = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None) if m and m.use_nodes else None
                if bs:
                    c = bs.inputs['Base Color'].default_value
                    bs.inputs['Base Color'].default_value = (srgb_to_lin(c[0]), srgb_to_lin(c[1]), srgb_to_lin(c[2]), 1)
        if o.type == 'ARMATURE' and o.animation_data:
            o.animation_data.action = None
    show_only([o for o in v1b if o.type == 'MESH'])
    b = shoot(os.path.join(D, 'v1_bram_34.png'), (624, 798), (.30, -.88, .42), (0, -.05, .88), 2.25, ground=True)
    compose(os.path.join(D, 'v1_vs_v2.png'), [
        {'height': 560, 'cells': [cell(a, 'v1 player (rejected)', bg=BG_REF), cell(turn[('A', 'front')], 'v2 kit default A', bg=BG_REF),
                                  cell(b, 'v1 Bram (rejected)', bg=BG_GAME), cell(bram_34, 'v2 Bram', bg=BG_GAME)]},
    ], 'v1 (boxes) vs v2 (organic kit), same framing and lighting')
    return os.path.join(D, 'v1_vs_v2.png')

# ------------------------------------------------------------------------------------------
# Manifest + report
# ------------------------------------------------------------------------------------------
def tri_count(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)

def rest_top(obs):
    return max((ob.matrix_world @ v.co).z for ob in obs for v in ob.data.vertices)

REF_RATIOS = {   # measured from Bible_References screenshots (style reference only; nothing traced or imported)
    'source_notes': 'male_b_turnaround.png front figure segmented (627 px tall); Character_Creator_Screen.jpg figure segmented (204 px); '
                    'DragonDagger_Equiped.jpg measured by hand (side 3/4)',
    'head_height_over_H': {'male_b': .166, 'creator': .176, 'dagger': .145, 'target': .165},
    'head_width_over_head_height': {'male_b': .82, 'creator': .80, 'target': .78},
    'shoulder_span_over_H': {'male_b': .31, 'target': .31},
    'chest_waist_hip_width_over_H': {'male_b': [.207, .17, .21]},
    'crotch_height_over_H': {'male_b': .426, 'target': .426},
    'torso_over_leg_length': {'male_b': .90, 'target': .88},
    'thigh_calf_ankle_width_over_H': {'male_b': [.104, .094, .06], 'dagger': [.11, .085, None]},
    'boot_height_over_H': {'male_b': .145, 'dagger': .12},
    'hand_width_length_over_H': {'male_b': [.034, .085], 'creator': [.05, .06], 'dagger': [.05, .05]},
}

REVIEW = [   # v2.5 -- after measuring the references and two compare/silhouette iterations
    'SILHOUETTE: angular -- chamfered-box torso (flat front, chamfers, sides, back), 5-sided limb prisms, block head with a flat face, '
    'jaw wedge, nose ridge and a flat-topped crown, 4-sided block hands, box boots with flat soles; hair as angular panels + locks.',
    'SHADING: panel shading -- smooth across each broad panel, hard edges where the form turns >= 40 deg and at material boundaries; '
    'soft key from upper front-left, high ambient, shaded sides ~25-35% darker; mid-saturation palette.',
    'MEASURED: head/H, head w/h, shoulder span/H, crotch height/H and thigh width/H measured on male_b and our front outline with the same '
    'code -- ours within ~5-10% (see REPORT ratios); limbs and torso depth were bulked 10-12% after the first silhouette pass, head '
    'widened 12% / shortened 9% after the second. Hands clear of the body on every frame of every clip (numeric check kept).',
    'STILL DIFFERS: RS idle has the elbows bent more with the hands a little forward; RS faces are more crudely painted; our long hair '
    'locks are neater than RS hair; small details (buttons, stitches, rips) are finer than RS would model; B default is 1,9k tris.',
]

def main():
    os.makedirs(WS, exist_ok=True)
    os.makedirs(os.path.join(RENDER_DIR, 'grid'), exist_ok=True)
    reset_scene()
    arm, mats, objs, clips, defs = build_kit()
    hands_kit = hand_clearance(arm, clips)
    arm.animation_data.action = None
    clear_pose(arm)
    probe = bpy.data.actions.new('_bind_probe')   # bind pose (no clip playing) -- measured, then removed so it is not exported
    hands_kit['_bind_pose_no_clip'] = hand_clearance(arm, {'bind': probe}).get('bind')
    bpy.data.actions.remove(probe)
    assert_hands(hands_kit, 'kit')
    arm.animation_data.action = clips['idle']
    parts = []
    for bt in ('A', 'B'):
        for slot in SLOTS:
            for idx in range(1, len(KIT[bt].get(slot, [])) + 1):
                ob = objs[part_name(bt, slot, idx)]
                parts.append({'name': ob.name, 'body_type': bt, 'slot': slot, 'index': idx, 'style': KIT[bt][slot][idx - 1][0],
                              'description': KIT[bt][slot][idx - 1][1], 'tris': tri_count(ob),
                              'inner_sharp_edge_fraction': ob.get('inner_sharp_fraction', 0.0),
                              'materials': [m.name for m in ob.data.materials]})
    default_tris = {bt: sum(tri_count(o) for o in outfit_objs(objs, bt, DEFAULT_OUTFIT[bt])) for bt in ('A', 'B')}
    heights = {bt: round(rest_top(outfit_objs(objs, bt, DEFAULT_OUTFIT[bt])), 4) for bt in ('A', 'B')}
    worst = {}
    for bt in ('A', 'B'):
        worst[bt] = sum(max(tri_count(objs[part_name(bt, s, i)]) for i in range(1, len(KIT[bt][s]) + 1)) for s in SLOTS if s in KIT[bt])
    export_glb(OUT_KIT, arm, list(objs.values()), 'ACTIONS')
    kit_clip_names = list(clips.keys())
    # Bram (built after the kit export so his actions are not swept into the kit GLB)
    barm, bmats, bobjs, bacts, bdefs = build_bram(objs, mats)
    hands_bram = hand_clearance(barm, bacts)
    assert_hands(hands_bram, 'bram')
    worst_inner = max(p['inner_sharp_edge_fraction'] for p in parts)
    print('[SHADING] worst inner-sharp parts', sorted(((p['inner_sharp_edge_fraction'], p['name']) for p in parts), reverse=True)[:12])
    assert worst_inner < .90, 'shading is not panel-based (%.3f of inner edges hard)' % worst_inner
    bram_tris = {n: tri_count(o) for n, o in bobjs.items()}
    bram_height = round(rest_top([o for n, o in bobjs.items() if n != 'Bram_Staff']), 4)
    for o in objs.values():
        o.hide_set(True)
    export_glb(OUT_BRAM, barm, list(bobjs.values()), 'NLA_TRACKS')
    for o in objs.values():
        o.hide_set(False)
    blend = os.path.join(WS, 'characters.blend')
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    pal = {'version': 2, 'note': 'sRGB hex; material names C_HAIR (hair+jaw+brows), C_TORSO (torso+arm cloth), C_LEGS, C_FEET, C_SKIN',
           'channels': {ch: {'material': CHANNEL_MAT[ch], 'colors': PALETTES[ch]} for ch in PALETTES},
           'accents_fixed': ACCENTS, 'defaults': {bt: {ch: PALETTES[ch][i] for ch, i in DEFAULT_COLORS[bt].items()} for bt in 'AB'},
           'default_outfit': {bt: {s: part_name(bt, s, i) for s, i in DEFAULT_OUTFIT[bt].items()} for bt in 'AB'},
           'bram': {'parts': [part_name('A', s, i) for s, i in BRAM_PARTS], 'colors': BRAM_COLORS}}
    with open(OUT_PAL, 'w', encoding='utf-8') as fh:
        json.dump(pal, fh, indent=2)
    res_kit = validate(OUT_KIT, [p['name'] for p in parts], kit_clip_names, exact_clips=True)
    res_bram = validate(OUT_BRAM, list(bobjs.keys()), ['idle', 'talk', 'walk', 'wave'], exact_clips=True)
    print('VALIDATION kit', json.dumps({k: v for k, v in res_kit.items() if k != 'clips'}))
    print('VALIDATION bram', json.dumps(res_bram))
    bpy.ops.wm.open_mainfile(filepath=blend)
    sc = bpy.context.scene
    arm = bpy.data.objects['Armature']
    objs = {p['name']: bpy.data.objects[p['name']] for p in parts}
    mats = {n: bpy.data.materials[n] for n in list(CHANNEL_MAT.values()) + list(ACCENTS)}
    MAT_SRGB.clear()
    for m in bpy.data.materials:
        if m.use_nodes:
            bs = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if bs:
                MAT_SRGB[m.name] = tuple(bs.inputs['Base Color'].default_value)[:3]
    clips = {n: bpy.data.actions[n] for n in kit_clip_names}
    barm = bpy.data.objects['Armature_Bram']
    bobjs = {n: bpy.data.objects[n] for n in bobjs}
    bacts = {n: bpy.data.actions['bram_' + n] for n in bdefs}
    sheets = run_renders(arm, mats, objs, clips, (barm, bobjs, bacts)) if DO_RENDER else {}
    rel = lambda p: os.path.relpath(p, REPO).replace('\\', '/')
    manifest = {
        'asset': 'holm_kit_v2', 'builder': 'tools/blender/build_holm_characters_v2.py', 'blend': rel(blend),
        'glb': {'kit': rel(OUT_KIT), 'bram': rel(OUT_BRAM), 'palettes': rel(OUT_PAL)},
        'forward_axis': {'gltf': '+Z', 'blender': '-Y'}, 'up_axis': '+Y (glTF)', 'units': 'metres', 'feet_at': 0.0,
        'height_m_rest_default_outfit': heights, 'bram_height_m': bram_height,
        'bones': [{'name': b[0], 'parent': b[1]} for b in BONES],
        'bone_match_vs_player_glb': {k: res_kit[k] for k in ('bone_names_match', 'bone_order_match', 'hierarchy_match',
                                                              'blender_reimport_bones_match', 'max_rest_translation_delta_m', 'max_rest_rotation_delta_deg')},
        'slots': {bt: {s: len(KIT[bt][s]) for s in SLOTS if s in KIT[bt]} for bt in 'AB'},
        'parts': parts, 'part_count': len(parts),
        'default_outfit': {bt: {s: part_name(bt, s, i) for s, i in DEFAULT_OUTFIT[bt].items()} for bt in 'AB'},
        'tris_default_outfit': default_tris, 'tris_worst_case_outfit': worst,
        'materials': {'channels': CHANNEL_MAT, 'accents': ACCENTS, 'kit_glb_materials': res_kit['materials']},
        'clips': {n: {'duration_s': res_kit['clips'].get(n), 'frames': (defs[n][0] if n in defs else defs['attack_slash'][0]), 'fps': FPS,
                      'loop': (defs[n][2] if n in defs else False), **({'alias_of': 'attack_slash'} if n == 'attack' else {})} for n in kit_clip_names},
        'bram': {'glb': rel(OUT_BRAM), 'kit_parts': [part_name('A', s, i) for s, i in BRAM_PARTS], 'extras': ['Bram_Torso (long open coat, kit torso rules)', 'Bram_Staff'],
                 'tris': bram_tris, 'tris_total': sum(bram_tris.values()), 'materials': res_bram['materials'],
                 'clips': {n: {'duration_s': res_bram['clips'].get(n), 'frames': bdefs[n][0], 'loop': bdefs[n][2]} for n in bdefs}},
        'validation': {'kit': res_kit['PASS'], 'bram': res_bram['PASS']},
        'hand_clearance': {'kit': hands_kit, 'bram': hands_bram, 'rule': 'hand centre >= %.2f m from the crotch point, never across the centreline, never between the legs; idle hands >= .045 m outside the thigh line' % HAND_MIN_CROTCH},
        'shading': {'rule': 'panel shading: smooth across each broad panel; hard edges at material boundaries, piece rims and wherever the form turns > %d deg' % SHARP_DEG,
                    'max_inner_sharp_edge_fraction': max(p['inner_sharp_edge_fraction'] for p in parts)},
        'renders': {k: (rel(v) if isinstance(v, str) else v) for k, v in sheets.items()},
        'reference_ratios_measured': REF_RATIOS,
    }
    with open(os.path.join(WS, 'manifest.json'), 'w', encoding='utf-8') as fh:
        json.dump(manifest, fh, indent=2)
    write_report(manifest, res_kit, res_bram)
    print('MANIFEST', json.dumps({k: manifest[k] for k in ('tris_default_outfit', 'tris_worst_case_outfit', 'height_m_rest_default_outfit', 'validation')}))
    print('BRAM', manifest['bram']['tris_total'], bram_height)

def write_report(m, rk, rb):
    L = ['# holm_kit_v2 (v2.5 pass) -- modular 2004-style identity kit + Guide Bram\n',
         'Built by `tools/blender/build_holm_characters_v2.py` (Blender 4.5 headless). Every mesh, weight and clip is authored '
         'procedurally in Blender (angular low-poly, panel shading: smooth panels, hard edges at >=40 deg turns and material boundaries, smooth weights); no imported models, no textures.\n',
         '## Files\n',
         '- `%s` -- rig + all %d kit parts + %d clips' % (m['glb']['kit'], m['part_count'], len(m['clips'])),
         '- `%s` -- palettes (hair 12, torso 16, legs 16, feet 6, skin 8) + accents + defaults' % m['glb']['palettes'],
         '- `%s` -- Guide Bram (kit parts + staff), clips idle/talk/walk/wave' % m['glb']['bram'],
         '- `%s`, `manifest.json`, this report; proof sheets in `scratchpad/holm_characters_v2/`\n' % m['blend'],
         '## Rig contract vs assets/models/player.glb\n']
    bm = m['bone_match_vs_player_glb']
    L.append('- bone names match: **%s** (order %s, hierarchy %s, Blender re-import %s); rest deviation %.5f m / %.3f deg' % (
        bm['bone_names_match'], bm['bone_order_match'], bm['hierarchy_match'], bm['blender_reimport_bones_match'],
        bm['max_rest_translation_delta_m'], bm['max_rest_rotation_delta_deg']))
    L.append('- forward glTF +Z (Blender -Y), feet at 0, rest height of default outfits %s m\n' % json.dumps(m['height_m_rest_default_outfit']))
    L.append('## Slots\n')
    L.append('| body | ' + ' | '.join(SLOTS) + ' |')
    L.append('|---|' + '---|' * len(SLOTS))
    for bt in 'AB':
        L.append('| %s | ' % bt + ' | '.join(str(m['slots'][bt].get(s, '-')) for s in SLOTS) + ' |')
    L.append('\n## Parts\n')
    L.append('| part | style | tris | materials |')
    L.append('|---|---|---|---|')
    for p in m['parts']:
        L.append('| %s | %s | %d | %s |' % (p['name'], p['description'], p['tris'], ', '.join(p['materials'])))
    L.append('\n- default outfit tris: %s; worst case (largest option in every slot): %s' % (json.dumps(m['tris_default_outfit']), json.dumps(m['tris_worst_case_outfit'])))
    L.append('- Bram: %d tris (%s)\n' % (m['bram']['tris_total'], json.dumps(m['bram']['tris'])))
    L.append('## Clips (30 fps, in place)\n')
    L.append('| clip | seconds | frames | loop |')
    L.append('|---|---|---|---|')
    for n, c in m['clips'].items():
        L.append('| %s | %s | %s | %s |' % (n + (' (alias of attack_slash)' if c.get('alias_of') else ''), c['duration_s'], c['frames'], 'yes' if c['loop'] else 'once'))
    L.append('\nBram: ' + ', '.join('%s %ss' % (n, c['duration_s']) for n, c in m['bram']['clips'].items()) + '\n')
    L.append('## Runtime integration notes (no runtime files were edited)\n')
    L.append('- The kit GLB ships every part visible (glTF has no hide flag): after load, show exactly one `Kit_<bt>_<Slot>_<nn>` per slot '
             '(body type A: 7 slots, B: 6) and hide the rest, e.g. `rig.traverse(o=>{var m=/^Kit_([AB])_(\\w+?)_(\\d\\d)$/.exec(o.name);if(m)o.visible=sel[m[1]][m[2]]===+m[3]})` '
             '(three.js may name a multi-material skinned mesh as a Group with the part name -- match the parent name too, as holm_island_player.js already does).')
    L.append('- Recolour by channel: materials `C_HAIR`/`C_TORSO`/`C_LEGS`/`C_FEET`/`C_SKIN` (strip a `.NNN` suffix); accents `A_*` stay fixed. '
             'This replaces the v1 `R_*` region names, so `recolorPlayer`/`holm_island_player.js` need a small mapping update before switching over.')
    L.append('- Measure/scale the character AFTER hiding unused parts (installPlayerGLB normalises the bbox to 1.85 m).')
    L.append('- `talk`/`wave` are included on the kit rig for NPCs; Bram GLB is drop-in for `holm_island_tutors.js` (clip names idle/talk/walk/wave).\n')
    if m.get('reference_ratios_measured'):
        L.append('## Reference proportions (measured from the Bible screenshots; style reference only, nothing traced or imported)\n')
        L.append('```json\n%s\n```\n' % json.dumps(m['reference_ratios_measured'], indent=1))
        mo = m.get('renders', {}).get('measured_outlines')
        if mo:
            L.append('Outline measurement, same method on both front outlines: `%s`\n' % json.dumps(mo))
    if REVIEW:
        L.append('## Self-review against the references\n')
        L += ['- ' + r for r in REVIEW]
        L.append('')
    L.append('## Validation\n')
    L.append('```json\n%s\n```\n' % json.dumps({'kit': {k: v for k, v in rk.items() if k != 'clips'}, 'bram': rb}, indent=1))
    with open(os.path.join(WS, 'REPORT.md'), 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(L))

if __name__ == '__main__':
    main()
