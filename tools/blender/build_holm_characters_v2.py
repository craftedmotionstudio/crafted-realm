"""build_holm_characters_v2.py -- Crafted Realms MODULAR IDENTITY KIT v2 (2004-style) + Guide Bram from the kit.

v3.1 (owner review 2026-09-26, tag v31): "they're still not standing up vertically like the old school characters" -- the
idle stands UP: spine and neck straight up, chest up, head level (not carried forward), shoulders back and level, legs
straight and nearly parallel under the hips (the rest skeleton's backward-slanting legs are brought under the hips), arms
hanging close to vertical with only a slight elbow bend, the hands at the sides of the thighs just off them (STANCE /
STANCE_ARM_AIM). Run upright (<= 2 deg). All v3.0 shape work kept. NEW: the classic emote set as kit clips emote_<key>
(yes no bow angry think wave shrug cheer beckon laugh jump_for_joy yawn dance jig spin headbang cry blow_kiss panic
raspberry clap salute -- our own animation of each idea; emote_clips), played once from the Emotes tab.

v3.0 (owner review 2026-09-25, tag v30): OSRS idle stance (arms just off the torso, elbows bent so the forearms come
forward, hands in front of the hips, soft knees, toes out, chest up, head a touch forward -- stance_local / STANCE); ONE
surface from the torso into the arm (every torso layer's armhole ends on a canonical seam ring that every arm option
starts on, with pinned shared normals and a round deltoid cap -- armhole_cut / arm_from_seam); rounded wedge feet (one
loft sole -> toe box -> ankle -> shaft -- foot_loft); hand clearance checked on the meshes on every frame of every clip.

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
  body type B: Hair 11, Torso 5, Arms 6, Hands 3, Legs 9, Feet 3, Makeup 5 (v2.8; 01 = none)
  (the Hair part carries the head: skull, face, ears, neck; bald = Hair part with no hair shell)
Recolour channels = material names: C_HAIR (hair + jaw + brows), C_TORSO (torso + arm cloth), C_LEGS,
C_FEET, C_SKIN, C_MAKEUP (B makeup overlays); fixed accents A_BELT A_METAL A_EYES A_SHIRT A_TRIM A_SASH (Bram adds A_WOOD).
Palettes: palettes.json (hair 12, torso 16, legs 16, feet 6, skin 8, makeup 6).

Rig contract: EXACT 23 mixamorig:* bone names / hierarchy / rest pose of assets/models/player.glb, glTF +Z
forward (= Blender -Y), feet at 0, ~1.85 m. Smooth vertex weights: every vertex is projected onto its bone
chain and blended across each joint with smoothstep zones. Colours are stored as the sRGB values to SEE
(three r128, no colour management); proof renders convert them to linear.

Clips (kit GLB): idle walk run attack_slash attack(alias) attack_stab attack_crush bow cast chop mine net cook
smith smelt climb block hit death talk wave firemake + 22 emote_<key> clips (v3.1)
(player keyframe logic retargeted from build_holm_player_v1.py).
Bram GLB: idle talk walk wave (holding his staff).

Run:  "C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe" -b --python tools/blender/build_holm_characters_v2.py -- [--no-render] [--quick]
Outputs (candidates only, never the live assets): .studio-workspaces/holm-characters-<tag>/candidates/{kit.glb,
  bram.glb, palettes.json, characters.blend, manifest.json, REPORT.md}, scratchpad/holm_characters_<tag>/*.png
  (default tag v31; the reviewed sets v2 / v27 / v28 / v29 / v30 are refused)
"""
import bpy, bmesh, math, json, os, sys, struct, subprocess, shutil, random
from mathutils import Vector, Matrix, Quaternion, Euler
from mathutils.bvhtree import BVHTree

REPO = r"C:\Users\iQwaZ\OneDrive\Desktop\CraftedRealms-Claude"
REF_GLB = os.path.join(REPO, "assets", "models", "player.glb")
_ARGV = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
TAG = _ARGV[_ARGV.index("--tag") + 1] if "--tag" in _ARGV else "v31"   # output set: .studio-workspaces/holm-characters-<tag>/
CAND = os.path.join(REPO, ".studio-workspaces", "holm-characters-%s" % TAG, "candidates")
assert TAG not in ("v2", "v27", "v28", "v29", "v30"), "refusing to overwrite a reviewed kit set (holm-characters-%s)" % TAG
OUT_KIT = os.path.join(CAND, "kit.glb")
OUT_PAL = os.path.join(CAND, "palettes.json")
OUT_BRAM = os.path.join(CAND, "bram.glb")
V1_PLAYER = os.path.join(REPO, "assets", "models", "holm_player_v1_default.glb")
V1_BRAM = os.path.join(REPO, "assets", "models", "holm_tutor_bram.glb")
WS = CAND
RENDER_DIR = os.path.join(REPO, "scratchpad", "holm_characters_%s" % TAG)
PREV_DIR = os.path.join(REPO, "scratchpad", "holm_characters_v28") if TAG == "v29" else "<none>"   # v2.8 sheets (v2.9 before/after only; v3.0 compares in render_holm_kit_compare_v30.py)
BIBLE = os.path.join(REPO, "Bible_References")
REF_TURN = os.path.join(BIBLE, "Character", "male_concepts", "male_b_turnaround.png")
REF_CREATOR = os.path.join(BIBLE, "Character_Creator_Screen.jpg")
REF_NPC = os.path.join(BIBLE, "Character.jpg")
FPS = 30
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
DO_RENDER = "--no-render" not in ARGS
QUICK = "--quick" in ARGS
VL = {'v29': 'v2.9', 'v30': 'v3.0', 'v31': 'v3.1'}.get(TAG, TAG)   # label on the review sheets

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
    'makeup': ['#c86a7a', '#d8765e', '#94304e', '#72395f', '#8e5c48', '#aa7440'],   # v2.8: rose, coral, berry, plum, soft brown, bronze
}
def _desat(hx, k=.12):
    r, g, b = (int(hx.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4))
    l = .299 * r + .587 * g + .114 * b
    return '#%02x%02x%02x' % tuple(round(c + (l - c) * k) for c in (r, g, b))

PALETTES = {ch: [_desat(h) for h in cols] for ch, cols in PALETTES.items()}   # v2.4: 2004-like slightly muted mid tones
CHANNEL_MAT = {'hair': 'C_HAIR', 'torso': 'C_TORSO', 'legs': 'C_LEGS', 'feet': 'C_FEET', 'skin': 'C_SKIN', 'makeup': 'C_MAKEUP'}
ACCENTS = {'A_BELT': '#4a3019', 'A_METAL': '#8c8e90', 'A_EYES': '#1e1612', 'A_SHIRT': '#bdb39b',
           'A_TRIM': '#d8cc94', 'A_SASH': '#8a2e2a'}
DEFAULT_COLORS = {   # palette indices per body type
    'A': {'hair': 2, 'torso': 0, 'legs': 0, 'feet': 0, 'skin': 2, 'makeup': 0},
    'B': {'hair': 3, 'torso': 2, 'legs': 3, 'feet': 1, 'skin': 1, 'makeup': 0},
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
    return chain_w([BHEAD[B(sd + 'UpLeg')], BHEAD[B(sd + 'Leg')], BHEAD[B(sd + 'Foot')], BHEAD[B(sd + 'ToeBase')]],
                   [B(sd + 'UpLeg'), B(sd + 'Leg'), B(sd + 'Foot')], [.06, .035], root=B('Hips'), root_s=.02, root_h=.06)

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
        self.pl = self.bm.verts.layers.int.new('pin')   # v3.0: >0 = index+1 into self.pins (a pinned shading normal)
        self.pins = []
        self.mats = []

    def pin(self, v, n):
        """v3.0: give vertex v a fixed shading normal (shared seams: torso armhole ring == arm top ring)"""
        self.pins.append(Vector(n).normalized())
        v[self.pl] = len(self.pins)

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

    def loft_ah(self, bt, rings, params, mat, w, ah='zip', cap0=True, cap1=True, smooth=True, matfn=None, mat_at=None, rim_depth=.010):
        """v3.0 torso-layer loft (closed rings) with both armholes cut (see armhole_cut). params[i][k] = (phi, z)."""
        vs = [[self._v(p, w) for p in r] for r in rings]
        n = len(vs[0])
        allf = []
        rim = None
        if ah == 'vest':   # a strip folding the layer's armhole edge in toward the body (closes the gap to the layer below)
            cache = {}
            def rim(i, j):
                if (i, j) not in cache:
                    co = vs[i][j].co
                    c = Vector((0, body_r(bt, co.z)[3], co.z))
                    d = Vector((co.x - c.x, co.y - c.y, 0))
                    cache[(i, j)] = self._v(tuple(co - d.normalized() * rim_depth), w)
                return cache[(i, j)]
        skip, zf = armhole_cut(self, bt, vs, params, ah, mat_at or (lambda z: mat), rim_to=rim)
        allf += zf
        for i in range(len(vs) - 1):
            a, b = vs[i], vs[i + 1]
            for k in range(n):
                if (i, k) in skip:
                    continue
                q = (a[k], a[(k + 1) % n], b[(k + 1) % n], b[k])
                if len(set(q)) < 4:
                    continue
                self._face(q, matfn(i, k) if matfn else mat, smooth, allf)
        if cap0:
            self._face(vs[0], mat, smooth, allf, rim=True)
        if cap1:
            self._face(vs[-1], mat, smooth, allf, rim=True)
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

    def shell(self, outer, inner, matfn, w, smooth=True, edge_mat=None, wrap=False, bt=None, params=None, ah=None, mat_at=None):
        """Thick patch. outer/inner [row][col]; matfn(i, j, side) -> material. Row 0 = free edge.
        wrap=True closes the columns into a loop and caps the last row (hair caps).
        v3.0 ah ('zip' | 'hole' | 'vest') + params[i][j] = (phi, z): cut the armholes (outer zipped to the seam ring /
        both surfaces opened / opened with a rim joining outer and inner)."""
        R, C = len(outer), len(outer[0])
        vo = [[self._v(outer[i][j], w) for j in range(C)] for i in range(R)]
        vi = [[self._v(inner[i][j], w) for j in range(C)] for i in range(R)]
        allf = []
        skip = set()
        if ah and params is not None:
            mid = mat_at or (lambda z: matfn(1, C // 2, 'o'))
            skip, zf = armhole_cut(self, bt, vo, params, ah, mid, rim_to=(lambda i, j: vi[i][j]) if ah == 'vest' else None)
            allf += zf
        cols = range(C) if wrap else range(C - 1)
        for i in range(R - 1):
            for j in cols:
                if (i, j) in skip:
                    continue
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

    def patch(self, rows, mat, w, outward=(0, -1, 0), smooth=False):
        """v2.8: open single-sided grid of quads (rows of points), faces turned toward `outward`"""
        vs = [[self._v(p, w) for p in r] for r in rows]
        allf = []
        for i in range(len(vs) - 1):
            for j in range(len(vs[0]) - 1):
                q = (vs[i][j], vs[i][j + 1], vs[i + 1][j + 1], vs[i + 1][j])
                if len(set(q)) < 4:
                    continue
                allf.append(self._face(q, mat, smooth, [], rim=True))
        o = Vector(outward)
        for f in allf:
            f.normal_update()
            if f.normal.dot(o) < 0:
                f.normal_flip()

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
        pins = self.pins
        if 'pin' in me.attributes:
            pv = [a.value for a in me.attributes['pin'].data]
            if pins and any(pv):   # v3.0: seam vertices share one shading normal across parts (no break torso -> arm)
                cn = [c.vector.copy() for c in me.corner_normals]
                for li, lp in enumerate(me.loops):
                    k = pv[lp.vertex_index]
                    if k:
                        cn[li] = pins[k - 1]
                me.normals_split_custom_set([tuple(v) for v in cn])
            me.attributes.remove(me.attributes['pin'])
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
ARM_R = {'A': [(0.00, .056, .058), (0.40, .053, .055), (0.65, .050, .052), (0.85, .047, .048), (1.00, .045, .047),
               (1.30, .046, .046), (1.70, .037, .037), (2.00, .034, .035)]}   # v3.0: slim upper arm under a round deltoid cap
ARM_R['B'] = [(u, rs * .84, rf * .84) for u, rs, rf in ARM_R['A']]
LEG_R = {'A': [(0.00, .090, .096, .098), (0.15, .102, .106, .108), (0.45, .092, .094, .096), (0.78, .071, .071, .073),
               (0.97, .065, .065, .067), (1.05, .064, .064, .068), (1.22, .074, .072, .084), (1.45, .064, .062, .070),
               (1.72, .050, .050, .054), (2.00, .046, .046, .050)],
         'B': [(0.00, .090, .092, .098), (0.15, .098, .100, .104), (0.45, .084, .086, .088), (0.78, .066, .066, .068),
               (0.97, .058, .058, .060), (1.05, .057, .057, .061), (1.22, .058, .057, .066), (1.45, .052, .051, .058),
               (1.72, .042, .042, .045), (2.00, .038, .038, .041)]}
SHOULDER_X = {'A': .180, 'B': .152}
HIP_X = {'A': .100, 'B': .104}
HAND_K = {'A': .98, 'B': .86}
FOOT_K = {'A': 1.00, 'B': .875}   # v2.9: smaller default feet (v2.8 was A 1.12 / B .98 = the Feet_Large morph)
FOOT_K_LARGE = {'A': 1.12, 'B': .98}
FOOT_K_SMALL = {'A': .91, 'B': .80}
U_LEG = [0.0, 0.4, 0.84, 1.0, 1.14, 1.5, 1.95]

# v2.5 measured bulk: prisms read narrower than their radius, so limbs and torso depth are scaled to the reference outlines
LEG_R = {bt: [(u, a * 1.12, b * 1.12, c * 1.12) for u, a, b, c in rows] for bt, rows in LEG_R.items()}
TORSO = {bt: [(z, rx, rf * 1.10, rb * 1.10, cy) for z, rx, rf, rb, cy in rows] for bt, rows in TORSO.items()}
PELVIS = {bt: [(z, rx, rf * 1.08, rb * 1.08, cy) for z, rx, rf, rb, cy in rows] for bt, rows in PELVIS.items()}
# v2.6: body A a touch slimmer (chest + hips), shoulder line lower and narrower
TORSO['A'] = [(z, rx * .965 - (.008 if 1.30 < z < 1.45 else 0.0), rf, rb, cy) for z, rx, rf, rb, cy in TORSO['A']]
TORSO['B'] = [(z, rx - (.005 if 1.30 < z < 1.45 else 0.0), rf, rb, cy) for z, rx, rf, rb, cy in TORSO['B']]
PELVIS['A'] = [(z, rx * .965, rf, rb, cy) for z, rx, rf, rb, cy in PELVIS['A']]
# v2.6: knees -- a kneecap bump on the front of the knee ring so the leg reads thigh / knee / shin
def _with_knee(rows, bump=.012):
    out = [r for r in rows if abs(r[0] - 1.0) > .02]
    u = 1.0
    rs, rf, rb = lerp_table(rows, u)
    out.append((u, rs, rf + bump, rb))
    return sorted(out)
LEG_R = {bt: _with_knee(rows) for bt, rows in LEG_R.items()}

# v2.9 BODY BUILD: every part is built on the shared body tables, so a build is simply the kit rebuilt on scaled tables;
# the difference becomes the Build_Stout / Build_Slim morph of every part (clothes follow the body by construction).
BUILD = {'name': 'average', 'skirt': 1.0, 'arm_out': None, 'leg_in': None, 'deltoid': 1.0, 'tables': None}

def hand_shift(bt, sx, ax):
    """lateral offset of the whole hand under a build (it follows the wrist of the shifted forearm)"""
    if not BUILD['arm_out']:
        return Vector()
    lat = Vector((sx, 0, 0)) - ax * (ax.x * sx)
    return lat.normalized() * BUILD['arm_out'](bt, WRIST_U)
_BASE_TABLES = None

def _build_tables(kind):
    ss_ = ss
    T, Pv, AR, LR = {}, {}, {}, {}
    for bt in ('A', 'B'):
        rows = []
        for z, rx, rf, rb, cy in _BASE_TABLES['TORSO'][bt]:
            w = 1 - ss_(1.36, 1.46, z)                        # the neck / collar line never changes
            belly = .30 * ss_(.90, 1.02, z) * (1 - ss_(1.18, 1.32, z)) + .14 * ss_(1.18, 1.26, z) * w
            if kind == 'stout':
                rows.append((z, rx * (1 + .10 * w - .03 * ss_(1.22, 1.38, z) * w), rf * (1 + belly), rb * (1 + .09 * w), cy))
            else:
                rows.append((z, rx * (1 - .07 * w), rf * (1 - .45 * belly - .04 * w), rb * (1 - .06 * w), cy))
        T[bt] = rows
        Pv[bt] = [(z, rx * (1.10 if kind == 'stout' else .93), rf * ((1.10 + .10 * ss_(.85, .95, z)) if kind == 'stout' else .91),
                   rb * (1.12 if kind == 'stout' else .93), cy) for z, rx, rf, rb, cy in _BASE_TABLES['PELVIS'][bt]]
        ga = (lambda u: 1.20 - .10 * ss_(.8, 1.3, u) - .06 * ss_(1.5, 1.97, u)) if kind == 'stout' else \
             (lambda u: .86 + .06 * ss_(.8, 1.3, u) + .05 * ss_(1.5, 1.97, u))
        AR[bt] = [(u, rs * ga(u), rf * ga(u)) for u, rs, rf in _BASE_TABLES['ARM_R'][bt]]
        gl = (lambda u: 1.20 - .12 * ss_(.7, 1.05, u) - .08 * ss_(1.5, 1.8, u)) if kind == 'stout' else \
             (lambda u: .86 + .07 * ss_(.7, 1.05, u) + .07 * ss_(1.5, 1.8, u))
        LR[bt] = [(u, a * gl(u), b * gl(u), c * gl(u)) for u, a, b, c in _BASE_TABLES['LEG_R'][bt]]
    return T, Pv, AR, LR, ga, gl

ARM_SHIFT = {'stout': (.021, .042), 'slim': (0.0, 0.0)}   # arm moved out at the shoulder / lower arm (m)

def set_build(kind='average'):
    """swap the shared body tables for a build ('average' | 'stout' | 'slim')"""
    global TORSO, PELVIS, ARM_R, LEG_R, _BASE_TABLES
    if _BASE_TABLES is None:
        _BASE_TABLES = {'TORSO': TORSO, 'PELVIS': PELVIS, 'ARM_R': ARM_R, 'LEG_R': LEG_R}
    if kind == 'average':
        TORSO, PELVIS, ARM_R, LEG_R = (_BASE_TABLES[k] for k in ('TORSO', 'PELVIS', 'ARM_R', 'LEG_R'))
        BUILD.update(name='average', skirt=1.0, arm_out=None, leg_in=None, deltoid=1.0, tables=None)
        return
    TORSO, PELVIS, ARM_R, LEG_R, ga, gl = _build_tables(kind)
    base_ar, base_lr = _BASE_TABLES['ARM_R'], _BASE_TABLES['LEG_R']
    # the arm grows OUTWARD (its inner face stays clear of the wider torso); the thigh grows mostly inward/front/back
    # (chubby thighs meet in the middle instead of pushing into the hands hanging beside them)
    sh, lo = ARM_SHIFT[kind]
    BUILD.update(name=kind, skirt=1.10 if kind == 'stout' else .95, deltoid=1.18 if kind == 'stout' else .96, tables=kind,
                 arm_out=lambda bt, u: (lerp_table(ARM_R[bt], u)[0] - lerp_table(base_ar[bt], u)[0]) + sh * (1 - ss(.9, 1.5, u)) + lo * ss(.7, 1.4, u),
                 leg_in=lambda bt, u: .6 * (lerp_table(LEG_R[bt], u)[0] - lerp_table(base_lr[bt], u)[0]))

def body_r(bt, z):
    if z >= 1.0:
        return lerp_table(TORSO[bt], z)
    if z <= 0.96:
        return lerp_table(PELVIS[bt], z)
    t = (z - 0.96) / 0.04
    a, b = lerp_table(PELVIS[bt], z), lerp_table(TORSO[bt], z)
    return tuple(x + (y - x) * t for x, y in zip(a, b))

def body_ring(bt, z, off=0.0, n=8, p=TORSO_P, front_extra=0.0, rad=None, bump=None, phase=None):
    rx, rf, rb, cy = rad if rad is not None else body_r(bt, z)
    return xring((0, cy, z), (0, 0, 1), rx + off, rf + off + front_extra, rb + off, n, p=p, bump=bump, phase=math.pi / n if phase is None else phase)

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

# v3.0: the arm path starts at the deltoid (the cap from the armhole seam covers u < U_CAP); the upper arm hangs just off
# the torso side (A vertical, B angled out to the shared elbow joint)
ARM_TOP = {'A': (.256, .016, 1.310), 'B': (.205, .016, 1.300)}
U_CAP = .65

def arm_path(bt, sx):
    sd = 'Left' if sx > 0 else 'Right'
    x, y, z = ARM_TOP[bt]
    return Path([(sx * x, y, z), BHEAD[B(sd + 'ForeArm')], BHEAD[B(sd + 'Hand')]])

def leg_path(bt, sx):
    sd = 'Left' if sx > 0 else 'Right'
    return Path([(sx * HIP_X[bt], .026, .95), BHEAD[B(sd + 'Leg')], BHEAD[B(sd + 'Foot')]])   # v2.6: thigh top tucked inside the pelvis

SHOULDER_DROP = .024

WRIST_U = 1.97

def wrist_taper(u):
    """v2.8: a bare forearm narrows smoothly into the wrist, where the hand's first ring is the forearm's last ring"""
    return 1.0 - .20 * ss(1.66, WRIST_U, u)

def arm_rings(bt, sx, spec, n=5, bump=None, taper=False):
    """spec: [(u, off[, scale])] -> rings around the arm surface pushed out by off (scale < 1 = shoulder dome)."""
    pa = arm_path(bt, sx)
    out = []
    for st in spec:
        u, off = st[0], st[1]
        sc = st[2] if len(st) > 2 else 1.0
        rs, rf = lerp_table(ARM_R[bt], u)
        if taper:
            rs, rf = rs * wrist_taper(u), rf * wrist_taper(u)
        c = pa.pos(u)
        if BUILD['arm_out']:
            ax = pa.dir(u)
            lat = Vector((sx, 0, 0)) - ax * (ax.x * sx)
            c = c + lat.normalized() * BUILD['arm_out'](bt, u)
        out.append(xring(c, pa.dir(u), (rs + off) * sc, (rf + off) * sc, (rf + off) * sc, n, bump=bump, phase=math.pi / n))
    return out

def leg_rings(bt, sx, spec, n=6):
    """spec: [(u, off[, scale[, rag]])]; rag = ragged hem amplitude on alternate vertices."""
    pl = leg_path(bt, sx)
    out = []
    for st in spec:
        u, off = st[0], st[1]
        sc = st[2] if len(st) > 2 else 1.0
        rag = st[3] if len(st) > 3 else 0.0
        rs, rf, rb = lerp_table(LEG_R[bt], u)
        bump = (lambda k, a=rag: a if k % 2 else -.3 * a) if rag else None
        c = pl.pos(u)
        if BUILD['leg_in']:
            ax = pl.dir(u)
            lat = Vector((sx, 0, 0)) - ax * (ax.x * sx)
            c = c - lat.normalized() * BUILD['leg_in'](bt, u)
        out.append(xring(c, pl.dir(u), (rs + off) * sc, (rf + off) * sc, (rb + off) * sc, n, bump=bump, phase=math.pi / n))
    return out

# ------------------------------------------------------------------------------------------
# v3.0 SHOULDER SEAM (owner review 2026-09-25: "the shoulders just don't really merge into the arms ... they look like
# separate entities"). Every torso layer that carries a sleeve has an ARMHOLE whose rim is one canonical seam ring per
# body type and side (AH_K vertices on the body surface); every arm option STARTS on that same ring (identical positions,
# skin weights and shading normals), then a round deltoid cap flows from the seam into the upper arm. The part boundary
# is watertight in every pose and shades as one surface.
# ------------------------------------------------------------------------------------------
AH_K = 10
ARMHOLE = {'A': dict(zc=1.318, dz=.097, dphi=math.radians(34), off=.006),
           'B': dict(zc=1.306, dz=.090, dphi=math.radians(34), off=.006)}
AH_ZROW = {'A': 1.211, 'B': 1.207}
DELTOID = {'A': ((.224, .012, 1.305), .090), 'B': ((.190, .012, 1.293), .078)}   # the cap's round mass (hair keeps clear of it)   # an extra torso row just under the armpit keeps the armhole window tight
AH_MARGIN = (math.radians(3), .004)

def ah_param(bt, sx, k):
    """(phi, z) of seam vertex k on the body surface. psi = 0 is the shoulder point (top), then the front edge, the
    armpit, the back edge; the ring's vertices sit half a step off psi = 0."""
    ah = ARMHOLE[bt]
    psi = 2 * math.pi * (k + .5) / AH_K
    phi = math.pi / 2 - ah['dphi'] * math.sin(psi)
    return (phi if sx > 0 else 2 * math.pi - phi), ah['zc'] + ah['dz'] * math.cos(psi), psi

def seam_point(bt, sx, k):
    phi, z, _ = ah_param(bt, sx, k)
    return body_point(bt, phi, z, ARMHOLE[bt]['off'])

def seam_normal(bt, sx, k):
    """outward normal of the smooth body surface at seam vertex k (both parts use it: no shading break)"""
    phi, z, _ = ah_param(bt, sx, k)
    o, e = ARMHOLE[bt]['off'], 1e-3
    dp = body_point(bt, phi + e, z, o) - body_point(bt, phi - e, z, o)
    dz = body_point(bt, phi, z + e, o) - body_point(bt, phi, z - e, o)
    n = dp.cross(dz)
    p = body_point(bt, phi, z, o)
    if n.dot(p - Vector((0, body_r(bt, z)[3], p.z))) < 0:
        n = -n
    return n.normalized()

def seam_ring(bt, sx):
    return [seam_point(bt, sx, k) for k in range(AH_K)]

def _ah_uv(bt, sx, phi, z):
    ah = ARMHOLE[bt]
    pc = math.pi / 2 if sx > 0 else 3 * math.pi / 2
    d = (phi - pc + math.pi) % (2 * math.pi) - math.pi
    return d / ah['dphi'], (z - ah['zc']) / ah['dz']

def ah_window(bt, sx, params):
    """row / column index window of a (phi, z) grid that covers the armhole ellipse (+ margin); None if the grid does
    not reach the shoulder. params[i][j] = (phi, z); phi increases with j (0..2pi, no wrap inside the window)."""
    ah = ARMHOLE[bt]
    mphi, mz = AH_MARGIN
    zlo, zhi = ah['zc'] - ah['dz'] - mz, ah['zc'] + ah['dz'] + mz
    pc = math.pi / 2 if sx > 0 else 3 * math.pi / 2
    plo, phi_hi = pc - ah['dphi'] - mphi, pc + ah['dphi'] + mphi
    zs = [row[0][1] for row in params]
    lows = [i for i, z in enumerate(zs) if z <= zlo]
    highs = [i for i, z in enumerate(zs) if z >= zhi]
    if not lows or not highs:
        return None
    i0, i1 = max(lows), min(highs)
    j0, j1 = None, None
    for i in range(i0, i1 + 1):
        cols = [p[0] for p in params[i]]
        a = [j for j, ph in enumerate(cols) if ph <= plo]
        b = [j for j, ph in enumerate(cols) if ph >= phi_hi]
        if not a or not b:
            return None
        j0 = max(a) if j0 is None else min(j0, max(a))
        j1 = min(b) if j1 is None else max(j1, min(b))
    return i0, i1, j0, j1

def _window_loop(i0, i1, j0, j1):
    """grid index pairs round the window rectangle (closed loop)"""
    loop = [(i0, j) for j in range(j0, j1 + 1)] + [(i, j1) for i in range(i0 + 1, i1 + 1)]
    loop += [(i1, j) for j in range(j1 - 1, j0 - 1, -1)] + [(i, j0) for i in range(i1 - 1, i0, -1)]
    return loop

def _ccw(uv):
    a = 0.0
    for (x0, y0), (x1, y1) in zip(uv, uv[1:] + uv[:1]):
        a += x0 * y1 - x1 * y0
    return a > 0

def stitch_loops(A, B):
    """triangles joining two nested closed loops, both CCW, each item (vert, angle); angular sweep (star-shaped loops)"""
    na, nb = len(A), len(B)
    ia = min(range(na), key=lambda i: A[i][1])
    ib = min(range(nb), key=lambda i: B[i][1])
    A = A[ia:] + A[:ia]
    B = B[ib:] + B[:ib]
    ua = [a for _, a in A] + [A[0][1] + 2 * math.pi]
    ub = [b for _, b in B] + [B[0][1] + 2 * math.pi]
    tris, i, j = [], 0, 0
    while i < na or j < nb:
        adv_a = j >= nb or (i < na and ua[i + 1] <= ub[j + 1])
        if adv_a:
            tris.append((A[i][0], A[(i + 1) % na][0], B[j % nb][0]))
            i += 1
        else:
            tris.append((A[i % na][0], B[(j + 1) % nb][0], B[j % nb][0]))
            j += 1
    return tris

def armhole_cut(mb, bt, vs, params, mode, mat_at, closed=True, rim_to=None, w=None):
    """v3.0: cut both armholes out of a torso layer grid (vs[i][j] bmesh verts, params[i][j] = (phi, z)).
    mode 'zip'  : the window is re-meshed as a zipper band ending exactly on the canonical seam ring (a sleeve attaches);
         'hole' : the window is just removed (a layer hidden under an outer garment);
         'vest' : removed, and the rim is closed by a strip down to rim_to (vert rows of the inner surface / a copy at a
                  smaller offset) -- a sleeveless garment's armhole edge.
    Returns the set of skipped cells {(i, j)} and the new faces."""
    skip, faces = set(), []
    if not mode:
        return skip, faces
    for sx in (1, -1):
        win = ah_window(bt, sx, params)
        if win is None:
            continue
        i0, i1, j0, j1 = win
        if mode == 'hole':   # tuck the layer's shoulder in under the garment above it (no hole to see through)
            for i in range(i0 + 1, i1):
                for j in range(j0 + 1, j1):
                    co = vs[i][j].co
                    c = Vector((0, body_r(bt, co.z)[3], co.z))
                    d = Vector((co.x - c.x, co.y - c.y, 0))
                    vs[i][j].co = co - d.normalized() * .018
            continue
        for i in range(i0, i1):
            for j in range(j0, j1):
                skip.add((i, j))
        loop = _window_loop(i0, i1, j0, j1)
        if mode == 'zip':
            uvb = [_ah_uv(bt, sx, *params[i][j]) for i, j in loop]
            seam = []
            for k in range(AH_K):
                p = seam_point(bt, sx, k)
                v = mb._v(p, seam_w(bt, sx, k))
                mb.pin(v, seam_normal(bt, sx, k))
                seam.append(v)
            uvs = [_ah_uv(bt, sx, *ah_param(bt, sx, k)[:2]) for k in range(AH_K)]
            A = [(vs[i][j], math.atan2(v_, u_)) for (i, j), (u_, v_) in zip(loop, uvb)]
            Bq = [(v, math.atan2(v_, u_)) for v, (u_, v_) in zip(seam, uvs)]
            if not _ccw(uvb):
                A = A[::-1]
            if not _ccw(uvs):
                Bq = Bq[::-1]
            A = [(v, a % (2 * math.pi)) for v, a in A]
            Bq = [(v, a % (2 * math.pi)) for v, a in Bq]
            for tri in stitch_loops(A, Bq):
                c = sum((t.co for t in tri), Vector()) / 3
                # material of the removed cell under the triangle's centre (by height, e.g. a two-toned yoke)
                m = mat_at(c.z)
                faces.append(mb._face(tri, m, True, []))
        elif mode == 'vest' and rim_to is not None:
            # the armhole edge hugs the seam (a sleeveless garment's armhole sits just outside the sleeve seam)
            ah = ARMHOLE[bt]
            pc = math.pi / 2 if sx > 0 else 3 * math.pi / 2
            for i, j in loop:
                phi, z = params[i][j]
                u, v = _ah_uv(bt, sx, phi, z)
                th = math.atan2(v, u)
                u2, v2 = u + (1.12 * math.cos(th) - u) * .65, v + (1.12 * math.sin(th) - v) * .65
                phi2, z2 = pc + u2 * ah['dphi'], ah['zc'] + v2 * ah['dz']
                for vert in (vs[i][j], rim_to(i, j)):
                    co = vert.co
                    base = body_point(bt, phi, z, 0.0)
                    c = Vector((0, body_r(bt, z)[3], z))
                    o = Vector((co.x - c.x, co.y - c.y, 0)).length - Vector((base.x - c.x, base.y - c.y, 0)).length
                    vert.co = body_point(bt, phi2, z2, o)
            for (ia, ja), (ib, jb) in zip(loop, loop[1:] + loop[:1]):
                q = (vs[ia][ja], vs[ib][jb], rim_to(ib, jb), rim_to(ia, ja))
                if len(set(q)) == 4:
                    faces.append(mb._face(q, mat_at(vs[ia][ja].co.z), True, [], rim=True))
    return skip, faces

def seam_w(bt, sx, k):
    return torso_w(seam_point(bt, sx, k))

# ------------------------------------------------------------------------------------------
# HEAD: rounded low-poly skull, 12 sides x 11 rows; jaw narrows to the chin, cheek planes,
# nose bump pushed out of the front column. rows: (z, rx, rF, rB, jaw_taper)
# ------------------------------------------------------------------------------------------
HEAD_N, HEAD_P, HEAD_YC = 10, 2.7, -0.020   # v2.7: one more chamfer round the jaw, softer
HEAD_T = {
    'A': [(1.548, .054, .052, .040, 0.0), (1.566, .068, .068, .050, .12), (1.588, .076, .078, .060, .08), (1.628, .082, .086, .082, .04),
          (1.665, .085, .088, .094, 0.0), (1.720, .086, .086, .100, 0.0), (1.790, .080, .072, .092, 0.0),
          (1.818, .062, .050, .070, 0.0), (1.824, .030, .022, .032, 0.0)],
}
HEAD_T['B'] = [(1.554, .048, .046, .036, 0.0), (1.572, .062, .064, .046, .16), (1.592, .071, .074, .056, .10),
               (1.630, .078, .086, .080, .04)] + HEAD_T['A'][4:]
HEAD_T = {bt: [(z, rx * 1.02, rf, rb, jaw) for z, rx, rf, rb, jaw in rows] for bt, rows in HEAD_T.items()}   # v2.5: measured width (head w/h ~.78 incl. hair)
HEAD_T = {bt: [(z, rx, rf, rb, jaw + (.05 if 1.56 < z < 1.60 else .03 if 1.60 <= z < 1.64 else 0.0)) for z, rx, rf, rb, jaw in rows]
          for bt, rows in HEAD_T.items()}   # v2.9: slimmer jaw (the chin rows taper a little more)
NOSE = {1.628: (0, -.008, 0), 1.630: (0, -.008, 0), 1.665: (0, -.028, -.010), 1.720: (0, -.012, 0)}
BROW = {1.720: (0, -.005, 0)}   # v2.3 brow ridge on the two columns either side of the nose
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
               rot=Matrix.Identity(3))   # v2.6: level brows = neutral, calm expression
        ez = 1.668
        rx = lerp_table(T, ez)[0]
        c0 = Vector((sx * (rx - .010), .004, ez))
        c1 = Vector((sx * (rx + .011), .010, ez + .002))
        mb.loft([xring(c0, (sx, 0, 0), .024, .020, .022, 4, (0, 0, 1)), xring(c1, (sx, 0, 0), .019, .015, .016, 4, (0, 0, 1))],   # v2.7b: simple ear block
                'C_SKIN', H, smooth=True)
    mz = 1.613 if fem else 1.611
    mb.box((0, face_y(0, mz, T, nose) - .0010, mz), (.026 if fem else .034, .006, .0065), 'A_EYES', H)
    mb.loft([xring((0, .002, 1.40), (0, -.08, 1), .060 / HEAD_WX, .054, .049, 6), xring((0, .000, 1.52), (0, -.02, 1), .056 / HEAD_WX, .050, .051, 6),   # v2.8: back of the neck stays inside the collar
             xring((0, .010, 1.625), (0, .10, 1), .048 / HEAD_WX, .040, .050, 6)],   # v2.7: neck rises into the skull base (no step from the side)
            'C_SKIN', NECK_W, smooth=True)

# ==========================================================================================
# KIT PARTS
# ==========================================================================================
# ---- hair ---------------------------------------------------------------------------------
def ear_lift(th, zb, to=1.704):
    """v2.7b: OSRS short-hair side -- the hairline rises above the ear (the ear sits at ~90-125 deg from the front)"""
    a = abs(math.degrees(math.atan2(math.sin(th), math.cos(th))))
    w = ss(80, 88, a) * (1 - ss(122, 132, a))
    return zb + max(0.0, to - zb) * w

def ear_cover(th, z):
    """v2.8: extra hair offset over the ear block so hair that covers the ears never lets them poke through"""
    a = abs(math.degrees(math.atan2(math.sin(th), math.cos(th))))
    return .016 * ss(62, 78, a) * (1 - ss(128, 142, a)) * ss(1.625, 1.645, z) * (1 - ss(1.700, 1.716, z))

def hair_cap(mb, bt, zb_fn, jag=0.0, jag_fn=None, cols=12, rows=3, off_out=.018, off_in=-.004, top=1.830,
             hang_below=None, flare=0.0, off_fn=None, ears=True, mat='C_HAIR', clumps=True):
    T = HEAD_T[bt]
    thetas = [2 * math.pi * (j + 0.5) / cols for j in range(cols)]
    outer, inner = [], []
    for i in range(rows + 1):
        t = i / rows
        ro, ri = [], []
        for j, th in enumerate(thetas):
            jj = (jag + .004) if (i == 0 and j % 2 == 1 and (jag_fn is None or jag_fn(th))) else 0.0
            zb = zb_fn(th) - jj - .038 * max(0.0, -math.cos(th)) ** 1.5   # v2.7: nape hairline follows the lower skull base
            if ears:
                zb = ear_lift(th, zb)
            if hang_below and zb < hang_below - .02 and rows >= 3:   # hanging part straight, cap rings bunched at the crown
                z = zb if i == 0 else hang_below + (top - hang_below) * (1 - (1 - (i - 1) / (rows - 1)) ** 1.8)
            else:
                z = zb + (top - zb) * (1 - (1 - t) ** 1.8)
            o = off_out + (off_fn(th, t) if off_fn else 0.0) + (.005 * (j % 2) * (1 - t) if (i < rows and clumps) else 0.0)   # alternating clumps
            if not ears:
                o += ear_cover(th, z)
            fl = flare * max(0.0, hang_below - z) if hang_below else 0.0
            ro.append(head_surface(th, z, o + fl, T, hang_below))
            ri.append(head_surface(th, z, off_in + fl * .6, T, hang_below))
        outer.append(ro)
        inner.append(ri)
    mb.shell(outer, inner, lambda i, j, s: mat, hair_w, wrap=True)

def tufts(mb, bt, spots, base_off=.016):
    """spots: [(theta, z, length, radius, lean_back)] low-poly hair spikes/tufts (4-sided cones)."""
    T = HEAD_T[bt]
    for th, z, ln, r, lean in spots:
        base = head_surface(th, z, base_off, T)
        nrm = (base - HEAD_CENTER).normalized()
        d = (nrm + Vector((0, lean, 0))).normalized()
        mb.cone(xring(base, d, r, r, r, 4, (0, -1, 0) if abs(d.y) < .9 else (0, 0, 1)), base + d * ln, 'C_HAIR', hair_w, smooth=False)

SHORT_ZB = angtab([(0, 1.748), (35, 1.738), (70, 1.706), (95, 1.668), (118, 1.684), (150, 1.628), (180, 1.606)])

DREAD_ZB = angtab([(0, 1.748), (40, 1.738), (80, 1.700), (100, 1.690), (180, 1.625)])

def dread_path(bt, th_root, z_root, th_fall, layer, z_end, sway=0.0):
    """v2.8 control points of one dreadlock: rooted flush on the skull at (th_root, z_root), lying along the scalp to
    the hairline at th_fall (surface offset rising to `layer`), then falling clear of the neck / back / shoulders."""
    T = HEAD_T[bt]
    ctrl = []
    z_edge = DREAD_ZB(math.radians(th_fall)) - .038 * max(0.0, -math.cos(math.radians(th_fall))) ** 1.5 + .006
    z_edge = min(z_edge, z_root)
    for t in (0.0, .33, .66, 1.0):   # on the scalp
        th = math.radians(th_root + (th_fall - th_root) * t)
        z = z_root + (z_edge - z_root) * (t ** 1.3)
        o = .005 + (layer - .005) * min(1.0, t * 1.6)   # root flush on the scalp layer, then riding on it
        ctrl.append(head_surface(th, z, o, T))
    thf = math.radians(th_fall)
    for f in (.40, 1.0):              # the fall
        z = z_edge + (z_end - z_edge) * f
        q = head_surface(thf, max(z, 1.61), layer + .010 * f, T)
        q = Vector((q.x, q.y, z)) + Vector((0, 0, 1)).cross(_radial(q)).normalized() * sway * f
        ctrl.append(clear_of_body(bt, q, .024))
    return ctrl

def dread_rope(mb, bt, ctrl, r0, r1, n=4):
    pts = _catmull(ctrl, 2)
    pts = pts[:5] + [clear_of_body(bt, q, .022) if q.z < 1.62 else q for q in pts[5:]]
    m = len(pts)
    rings = []
    for i, c in enumerate(pts):
        t = i / (m - 1)
        r = (r0 + (r1 - r0) * t ** 1.3) * (.40 + .60 * min(1.0, i / 2.0))   # emerges flush from the scalp, no stub end
        ax = pts[min(i + 1, m - 1)] - pts[max(i - 1, 0)]
        rings.append(xring(c, ax, r, r * .9, r * .9, n, front=tuple(_radial(c)), phase=0.0))   # a ridge on top: reads on the scalp
    mb.loft(rings, 'C_HAIR', hair_w, smooth=True)

def dreads(mb, bt, z_side=1.56, z_back=1.45, r=.0135):
    """v2.8: dreadlocks grow FROM the scalp. A thin scalp layer follows the skull (no thick shell rim); the ropes root
    flush on it in parted rows -- hairline, crown, back/top -- each lying along the skull to the hairline before it
    falls, crown ropes dropping into the gaps between the hairline ropes (the face stays clear)."""
    hair_cap(mb, bt, DREAD_ZB, jag=0.0, off_out=.008, off_in=-.004, rows=6, cols=12, ears=True, top=1.828)   # fine rows: hugs the skull
    rng = random.Random(41 if bt == 'A' else 43)
    def z_end(thf):
        f = (1 - math.cos(math.radians(thf))) / 2
        return z_side + (z_back - z_side) * f ** 3 + rng.uniform(-.025, .012)   # sides end above the shoulders, the back is long
    ropes = []
    # row 1 -- hairline: short run on the scalp, then the fall (temples, sides, back)
    for th in (52, 80, 108, 138):
        for sg in (-1, 1):
            zr = DREAD_ZB(math.radians(th)) - .038 * max(0.0, -math.cos(math.radians(th))) ** 1.5 + .030 + .030 * max(0.0, -math.cos(math.radians(th)))
            ropes.append((sg * th, zr, sg * th, .014))
    ropes.append((180, DREAD_ZB(math.pi) - .038 + .062, 180, .014))
    # row 2 -- crown: a ring of roots high on the crown; each rope runs down over the skull into a gap of the hairline row
    for th, thf in ((25, 64), (70, 94), (115, 122), (158, 150)):
        for sg in (-1, 1):
            ropes.append((sg * th, 1.8175, sg * thf, .018))   # the skull top is flat: 1.8175 is ~70% out from its centre
    # row 3 -- top: roots at the very top, parted from the crown ring, swept back / to the sides over it
    for thr, thf in ((30, 108), (-30, -108), (180, 176)):
        ropes.append((thr, 1.8233, thf, .022))
    for thr, zr, thf, layer in ropes:
        ctrl = dread_path(bt, thr, zr, thf, layer, z_end(thf) + (.02 if layer > .015 else 0.0), sway=rng.uniform(-.006, .006))
        dread_rope(mb, bt, ctrl, r * rng.uniform(.95, 1.10), r * .45)

def hair_spikes(mb, bt, count=14, seed=7, ln=(.05, .085), lean=(-.2, 1.0)):
    rng = random.Random(seed)
    spots = []
    for k in range(count):
        th = 2 * math.pi * k / count + rng.uniform(-.2, .2)
        z = 1.72 + rng.uniform(0, .09) if abs(math.cos(th)) < .9 or math.cos(th) < 0 else 1.76 + rng.uniform(0, .05)
        spots.append((th, z, rng.uniform(*ln), rng.uniform(.020, .026), rng.uniform(*lean)))
    tufts(mb, bt, spots, base_off=.010)

def head_to_world(v):
    d = Vector(v) - HEAD_PIVOT
    return HEAD_PIVOT + Vector((d.x * HEAD_S * HEAD_WX, d.y * HEAD_S * HEAD_WY, d.z * HEAD_S * HEAD_HZ)) + Vector((0, 0, -0.030))

def world_to_head(w):
    d = Vector(w) - Vector((0, 0, -0.030)) - HEAD_PIVOT
    return HEAD_PIVOT + Vector((d.x / (HEAD_S * HEAD_WX), d.y / (HEAD_S * HEAD_WY), d.z / (HEAD_S * HEAD_HZ)))

def clear_of_body(bt, p_head, margin=.022):
    """push a head-space hair point out of the (world-space) neck, upper torso and shoulder masses"""
    w = head_to_world(p_head)
    if w.z < 1.56:
        zz = min(max(w.z, .96), 1.515)
        rad = body_r(bt, zz)
        cy = rad[3]
        dx, dy = w.x, w.y - cy
        have = math.hypot(dx, dy)
        if have > 1e-6:
            phi = math.atan2(dx, -dy)
            bp = body_point(bt, phi, zz, margin)
            need = math.hypot(bp.x, bp.y - cy)
            if have < need:
                w.x, w.y = dx * need / have, cy + dy * need / have
        for sx in (-1, 1):   # deltoid masses (v3.0: the round cap from the armhole seam)
            dc, dr = DELTOID[bt]
            c = Vector((sx * (dc[0] + (BUILD['arm_out'](bt, U_CAP) if BUILD['arm_out'] else 0.0)), dc[1], dc[2]))
            d = w - c
            rr = (dr + .012) * BUILD['deltoid']
            if 1.20 < w.z < 1.52 and d.length < rr:
                w = c + d.normalized() * rr
    return world_to_head(w)

def _catmull(pts, per=3):
    P = [pts[0]] + list(pts) + [pts[-1]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(per):
            t = k / per
            out.append(0.5 * ((2 * p1) + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t))
    out.append(pts[-1])
    return out

def rope(mb, bt, th_deg, z_root, z_end, r0, r1, out=.012, sway=0.0, n=5, flat=1.0):
    """v2.7: one continuous tapered rope (dreadlock) -- a smooth spline rooted UNDER the cap, hugging the skull, then falling
    clear of the neck, back and shoulders; no breaks or kinks between segments"""
    T = HEAD_T[bt]
    th = math.radians(th_deg)
    zs = [z_root, z_root - .035] + [z_root - .035 + (z_end - z_root + .035) * f for f in (.35, .7, 1.0)]
    offs = [-.006, .020, .020 + out * .5, .020 + out, .020 + out * 1.2]
    ctrl = []
    for i, (z, o) in enumerate(zip(zs, offs)):
        q = head_surface(th, max(z, 1.61), o, T)
        q = Vector((q.x, q.y, z))
        if i >= 2:
            q = q + Vector((0, 0, 1)).cross(_radial(q)).normalized() * sway * (i - 1) / 3
            q = clear_of_body(bt, q, .024)
        ctrl.append(q)
    pts = _catmull(ctrl, 2)
    pts = [pts[0], pts[1]] + [clear_of_body(bt, q, .022) if q.z < 1.62 else q for q in pts[2:]]
    m = len(pts)
    rings = []
    for i, c in enumerate(pts):
        t = i / (m - 1)
        r = r0 + (r1 - r0) * t ** 1.2
        ax = pts[min(i + 1, m - 1)] - pts[max(i - 1, 0)]
        rings.append(xring(c, ax, r, r * flat, r * flat, n, front=tuple(_radial(c))))
    mb.loft(rings, 'C_HAIR', hair_w, smooth=True)

def long_hair(mb, bt, zb_fn, hang_below=1.662, cols=14, hang_rows=3, cap_rows=3, off_out=.018, off_in=-.004, flare=.07,
              groove=.007, top=1.830, off_fn=None, tip=.045, seed=3):
    """v2.7: ONE continuous shell from the crown down the fall (no cap/lock seam). The locks are carved out of the
    silhouette: vertical grooves on alternate columns and a jagged, staggered bottom edge; the fall is pushed clear of the
    neck, back and shoulders so it drapes over them."""
    T = HEAD_T[bt]
    rng = random.Random(seed)
    tips, j = [], 0
    while j < cols:   # v2.7b: irregular locks -- random width (1-3 columns) and length, each with a pointed tip
        wl = rng.choice((1, 2, 2, 3))
        ln = tip * rng.uniform(.35, 1.5)
        for m in range(wl):
            shape = 1.0 - abs((m + .5) / wl - .5) * 2.0 if wl > 1 else 1.0
            tips.append(ln * (.15 + .85 * shape) + rng.uniform(0, tip * .12))
        if wl == 1 and tips:
            tips[-1] *= rng.uniform(.4, 1.0)
        j += wl
    tips = tips[:cols]
    thetas = [2 * math.pi * (j + 0.5) / cols for j in range(cols)]
    R = hang_rows + cap_rows
    uh = hang_rows / R
    outer, inner = [], []
    for i in range(R + 1):
        u = i / R
        ro, ri = [], []
        for j, th in enumerate(thetas):
            zb0 = zb_fn(th)
            hanging = zb0 < hang_below - .005
            zb = zb0 - (tips[j] if (i == 0 and hanging) else 0.0)
            if not hanging:
                z = zb + (top - zb) * (1 - (1 - u) ** 1.8)
            elif u <= uh:
                z = zb + (hang_below - zb) * (u / uh)
            else:
                z = hang_below + (top - hang_below) * (1 - (1 - (u - uh) / (1 - uh)) ** 1.8)
            hz = clamp((hang_below - z) / .08)
            o = off_out + (off_fn(th, u) if off_fn else 0.0) + groove * (j % 2) * hz + ear_cover(th, z)
            fl = flare * max(0.0, hang_below - z)
            po = head_surface(th, z, o + fl, T, hang_below)
            pi_ = head_surface(th, z, off_in + fl * .6, T, hang_below)
            if hanging and z < 1.64:
                pc = clear_of_body(bt, po, .026)
                pi_ = pi_ + (pc - po)
                po = pc
            ro.append(po)
            ri.append(pi_)
        outer.append(ro)
        inner.append(ri)
    mb.shell(outer, inner, lambda i, j, s: 'C_HAIR', hair_w, wrap=True)

def _radial(p):
    d = Vector((p.x, p.y - HEAD_YC, 0))
    return d.normalized() if d.length > 1e-6 else Vector((0, 1, 0))

def lock(mb, bt, th_deg, z_root, z_end, width, depth=.016, out=.010, sway=0.0, root_off=-.002):
    """one tapered, slightly flattened hair lock. The root is buried in the cap; it follows the skull, then falls
    clear of the neck/back/shoulders (clearance checked at every sample) to a thin tip."""
    T = HEAD_T[bt]
    th = math.radians(th_deg)
    ts = (0.0, .14, .32, .52, .74, 1.0)
    pts = []
    for t in ts:
        z = z_root + (z_end - z_root) * t
        # v2.6: rooted INSIDE the cap, hugging the cap surface for the first part, only then swinging out
        hs = head_surface(th, max(z, 1.61), root_off + (.018 - root_off) * min(1.0, t / .14) + out * max(0.0, (t - .30) / .70), T)
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

def sideburns(mb, bt, z_top=1.706, z_bot=1.650, width=.012):
    T = HEAD_T[bt]
    for s_ in (-1, 1):
        th = math.radians(81 * s_)
        root = head_surface(th, z_top, .010, T)
        tip = head_surface(math.radians(79 * s_), z_bot, .006, T)
        mb.cone(xring(root, tip - root, width, .005, .005, 3, front=tuple(_radial(root))), tip, 'C_HAIR', B('Head'), smooth=False)

def top_clumps(mb, bt, spots=((0.0, 1.806), (2.3, 1.790), (-2.2, 1.796)), h=.009, r=.030):
    """2-3 low clumps on the crown so the silhouette is uneven, not a dome"""
    T = HEAD_T[bt]
    for th, z in spots:
        base = head_surface(th, z, .010, T)
        n = (base - HEAD_CENTER).normalized()
        mb.cone(xring(base, n, r, r * .8, r * .8, 5, front=(0, -1, 0) if abs(n.y) < .9 else (0, 0, 1)), base + n * h, 'C_HAIR', B('Head'), smooth=False)

def skull_midline(bt, n=11, z_front=1.742, z_back=1.600):
    """points along the skull's centre line from the forehead over the crown to the nape, evenly spaced by arc length,
    with the outward normal (in the y-z plane) at each"""
    T = HEAD_T[bt]
    top = T[-1][0]
    raw = [head_surface(0.0, z_front + (top - .002 - z_front) * k / 16, 0.0, T) for k in range(17)]
    raw += [head_surface(math.pi, top - .002 - (top - .002 - z_back) * k / 16, 0.0, T) for k in range(1, 17)]
    raw = [Vector((0.0, q.y, q.z)) for q in raw]
    acc = [0.0]
    for a, b in zip(raw, raw[1:]):
        acc.append(acc[-1] + (b - a).length)
    out = []
    for i in range(n):
        target = acc[-1] * i / (n - 1)
        k = max(j for j in range(len(acc)) if acc[j] <= target + 1e-9) if i < n - 1 else len(acc) - 2
        k = min(k, len(acc) - 2)
        t = (target - acc[k]) / max(1e-9, acc[k + 1] - acc[k])
        p = raw[k].lerp(raw[k + 1], clamp(t))
        tan = (raw[k + 1] - raw[k]).normalized()
        nrm = Vector((0, tan.z, -tan.y))
        if nrm.dot(p - HEAD_CENTER) < 0:
            nrm = -nrm
        out.append((p, nrm, tan))
    return out

def mohawk_crest(mb, bt, h_max=.070, wb=.036, wt=.009):
    """v2.8: a clearly ARCHED crest: its top line is a rounded arch front-to-back (low at the brow and the nape, highest
    over the crown), a thick base on the scalp tapering to a narrow rounded ridge; the sides are shaved bare"""
    X = Vector((1, 0, 0))
    rings = []
    st = skull_midline(bt, n=11)
    for i, (p, nrm, tan) in enumerate(st):
        u = i / (len(st) - 1)
        env = math.sin(math.pi * (.06 + .88 * u)) ** .85          # arch envelope, peak a little behind the crown top
        h = .010 + h_max * env * (1.0 - .18 * u)
        w_b = wb * (.55 + .45 * env)
        w_t = wt * (.6 + .4 * env)
        base = p - nrm * .004
        prof = [(-w_b, 0.0), (-w_b * .72, h * .45), (-w_t, h * .90), (0.0, h), (w_t, h * .90), (w_b * .72, h * .45), (w_b, 0.0)]
        rings.append([tuple(base + X * x + nrm * y) for x, y in prof])
    # close the underside so the crest is a solid (the base edge is buried in the scalp)
    mb.loft([r + [tuple(Vector(r[-1]) - nrm_ * .006), tuple(Vector(r[0]) - nrm_ * .006)] for r, (_, nrm_, _) in zip(rings, st)],
            'C_HAIR', B('Head'), smooth=True)

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
        sideburns(mb, bt, z_bot=1.654)
        top_clumps(mb, bt, spots=((0.4, 1.804), (2.6, 1.786)))
    elif key == 'long' and bt == 'A':       # to the shoulders: one continuous mass, locks carved from the silhouette
        long_hair(mb, bt, angtab([(0, 1.748), (36, 1.740), (55, 1.640), (80, 1.500), (180, 1.470)]), tip=.060, seed=5)
        fringe(mb, bt)
    elif key == 'long':                     # B: long (default B): one continuous mass falling over the shoulders
        long_hair(mb, bt, angtab([(0, 1.752), (30, 1.742), (48, 1.620), (70, 1.420), (180, 1.330)]), tip=.070, seed=7)
        fringe(mb, bt, degs=(-26, -8, 10), drop=.030, width=.014)
    elif key == 'medium' and bt == 'A':     # swept back to the nape, ears covered
        hair_cap(mb, bt, angtab([(0, 1.754), (35, 1.746), (70, 1.720), (95, 1.686), (115, 1.664), (150, 1.600), (180, 1.575)]),
                 jag=.012, jag_fn=lambda th: not front(th), hang_below=1.64, flare=.08, rows=4,
                 off_fn=lambda th, t: .006 * max(0.0, -math.cos(th)) * (1 - t))
        fringe(mb, bt, degs=(-32, -14, 4, 22), z0=1.752, drop=.026, width=.017, lean=-8)
        sideburns(mb, bt, z_top=1.706, z_bot=1.648)
        top_clumps(mb, bt, spots=((0.3, 1.808), (2.5, 1.792), (-2.4, 1.794)))
    elif key == 'medium':                   # B: bob
        hair_cap(mb, bt, angtab([(0, 1.745), (34, 1.735), (55, 1.60), (180, 1.575)]), jag=.014, rows=4, hang_below=1.665, flare=.18, off_out=.020, ears=False)
        fringe(mb, bt, degs=(-24, -6, 12), z0=1.748, drop=.028, width=.016)
    elif key == 'dreadlocks':
        dreads(mb, bt, z_side=1.56 if bt == 'A' else 1.535, z_back=1.45 if bt == 'A' else 1.37)
    elif key == 'tonsure':                  # monk's ring: bald crown, band of hair round the head
        jaw_shell(mb, bt, -180, 180, angtab([(0, 1.728), (50, 1.704), (72, 1.690), (88, 1.692), (122, 1.690), (140, 1.660), (180, 1.588)]), lambda th: 1.772,
                  lambda th, t: .015 - .004 * t, cols=17, rows=2, hang_below=None, off_in=-.008)
    elif key == 'cropped':                  # close buzz cut with a visible hairline (widow's-peak points + sideburns)
        hair_cap(mb, bt, angtab([(0, 1.745), (25, 1.752), (60, 1.725), (95, 1.672), (180, 1.60)]), jag=.008, jag_fn=front,
                 off_out=.010, off_in=-.004, rows=4, cols=11)
        fringe(mb, bt, degs=(-20, 0, 20), z0=1.752, drop=.016, width=.012)
        sideburns(mb, bt, z_top=1.704, z_bot=1.654, width=.010)
    elif key == 'wild spikes':
        hair_cap(mb, bt, angtab([(0, 1.742), (45, 1.728), (85, 1.685), (100, 1.668), (180, 1.598)]), jag=.010, off_out=.019, rows=4, cols=14)
        hair_spikes(mb, bt, count=16, seed=11, ln=(.055, .095), lean=(-.6, 1.1))
    elif key == 'spiky':
        hair_cap(mb, bt, angtab([(0, 1.745), (45, 1.73), (85, 1.685), (100, 1.668), (180, 1.598)]), jag=.010, off_out=.019, rows=4, cols=14)
        spots = [(0.0, 1.772, .046, .022, .6), (0.7, 1.778, .044, .022, .5), (-0.7, 1.778, .044, .022, .5), (1.5, 1.77, .040, .02, .4),
                 (-1.5, 1.77, .040, .02, .4), (2.4, 1.77, .044, .022, .6), (-2.4, 1.77, .044, .022, .6), (3.14, 1.755, .042, .022, .7),
                 (0.0, 1.806, .046, .022, .7), (1.6, 1.804, .042, .02, .6), (-1.6, 1.804, .042, .02, .6), (3.14, 1.80, .046, .022, .9)]
        tufts(mb, bt, spots, base_off=.010)
    elif key == 'mohawk':                   # v2.8: shaved (bare) sides, one arched crest from brow to nape
        mohawk_crest(mb, bt)
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
        zb = angtab([(-180, 1.380), (-60, 1.430), (-35, 1.660), (-10, 1.700), (10, 1.730), (40, 1.745), (60, 1.600),
                     (90, 1.520), (180, 1.400)], sym=False)
        long_hair(mb, bt, zb, tip=.065, seed=9, off_fn=lambda th, u: .008 * max(0.0, -math.sin(th)) * (1 - u))
        fringe(mb, bt, degs=(-40, -24, -8), z0=1.735, drop=.050, width=.020, lean=-14)
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
                  lambda th, t: -.003, cols=3, rows=1, mat='C_SKIN', off_in=-.010)   # v2.6: kept inside the face (no visible line)
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
# ---- makeup (body type B, v2.8) --------------------------------------------------------------
MAKEUP_OFF = .0016   # overlays sit 1.6 mm proud of the face (x head scale -> ~1.8 mm in the game): no z-fighting
_FACE_BVH = {}

def face_bvh(bt):
    """the bare skull surface exactly as the Hair parts build and triangulate it (eyes/brows/mouth excluded)"""
    if bt not in _FACE_BVH:
        m = MB()
        m.loft([head_row_pts(r) for r in HEAD_T[bt]], 'C_SKIN', B('Head'), smooth=True)
        bmesh.ops.triangulate(m.bm, faces=m.bm.faces[:], quad_method='BEAUTY', ngon_method='BEAUTY')
        _FACE_BVH[bt] = (BVHTree.FromBMesh(m.bm), m)
    return _FACE_BVH[bt][0]

def face_pt(bt, x, z, off=MAKEUP_OFF):
    hit = face_bvh(bt).ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))
    y = hit[0].y if hit[0] is not None else face_y(x, z, HEAD_T[bt])
    return (x, y - off, z)

def face_patch(mb, bt, rows_xz, mat='C_MAKEUP'):
    mb.patch([[face_pt(bt, x, z) for x, z in r] for r in rows_xz], mat, B('Head'))

def blob(cx, cz, hw, hh, cols=4, rows=3, taper=.55):
    """rows of (x, z) for a rounded patch centred on (cx, cz)"""
    out = []
    for i in range(rows + 1):
        v = -1 + 2 * i / rows
        w = hw * (1 - (1 - taper) * v * v)
        out.append([(cx - w + 2 * w * j / cols, cz + hh * v) for j in range(cols + 1)])
    return out

def makeup_style(mb, bt, key):
    """v2.8 B makeup overlays: thin low-poly patches following the face, one recolour channel (C_MAKEUP)"""
    if key == 'none':   # placeholder so every slot has an 01 part: a tiny sliver hidden inside the skull
        mb.box(tuple(HEAD_CENTER), (.002, .002, .002), 'C_MAKEUP', B('Head'))
        return
    if key in ('rouge', 'full'):          # a soft round blush on each cheek
        for sx in (-1, 1):
            face_patch(mb, bt, blob(.044 * sx, 1.649, .0105, .0085, cols=3, rows=2, taper=.6))
    if key in ('eye shadow', 'full'):     # lid colour between each eye and its brow, winged at the outer corner
        for sx in (-1, 1):
            ex = .0265 * sx
            rows = [[(ex + sx * x, z) for x, z in r] for r in (
                [(-.0125, 1.6930), (-.004, 1.6930), (.004, 1.6930), (.0125, 1.6925), (.0205, 1.6885)],    # winged outer corner
                [(-.0122, 1.6985), (-.004, 1.6988), (.004, 1.6988), (.0130, 1.6985), (.0190, 1.6960)],
                [(-.0108, 1.7040), (-.004, 1.7045), (.004, 1.7045), (.0110, 1.7040), (.0140, 1.7030)])]
            if sx < 0:
                rows = [list(reversed(r)) for r in rows]
            face_patch(mb, bt, rows)
    if key in ('lip colour', 'full'):     # upper + lower lip round the mouth line
        rows = []
        for z, hw in ((1.6050, .0085), (1.6090, .0140), (1.6130, .0170), (1.6175, .0145), (1.6212, .0095)):
            rows.append([(-hw + 2 * hw * j / 4, z) for j in range(5)])
        face_patch(mb, bt, rows)

def ah_rows(bt, zs):
    """v3.0: the ring heights with the armpit row added (when the layer reaches the shoulder) -> (zs, original index of
    each ring's lower original ring)"""
    za = AH_ZROW[bt]
    if min(zs) < za - .02 and max(zs) > ARMHOLE[bt]['zc'] and all(abs(z - za) > .012 for z in zs):
        out = sorted(zs + [za])
    else:
        out = list(zs)
    orig = [max(i for i, z0 in enumerate(zs) if z0 <= z + 1e-9) if z >= zs[0] else 0 for z in out]
    return out, orig

def torso_loft(mb, bt, zs, off, mat, n=8, cap_bot=True, w=torso_w, front_extra=None, matfn=None, bump=None, ring0_jag=0.0, ah='zip', phase=None):
    zs, orig = ah_rows(bt, list(zs))
    rings, params = [], []
    ph = math.pi / n if phase is None else phase
    for z in zs:
        o = off(z) if callable(off) else off
        fe = front_extra(z) if front_extra else 0.0
        rings.append(body_ring(bt, z, o, n, front_extra=fe, bump=bump, phase=phase))
        params.append([(2 * math.pi * k / n + ph, z) for k in range(n)])
    if ring0_jag:   # ragged hem: every other hem vertex pulled up
        rings[0] = [(x, y, z + (ring0_jag if k % 2 else 0.0)) for k, (x, y, z) in enumerate(rings[0])]
    mf = (lambda i, k: matfn(orig[i], k)) if matfn else None
    mat_at = (lambda z: mf(max(i for i, z0 in enumerate(zs) if z0 <= z + 1e-9) if z >= zs[0] else 0, 0)) if mf else None
    return mb.loft_ah(bt, rings, params, mat, w, ah=ah, cap0=cap_bot, cap1=True, matfn=mf, mat_at=mat_at)

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
               n_body=6, trim_w=.024, w=skirt_w, lining=None, ah='zip'):
    """Open-front garment (jacket/coat/vest) following the body. zs bottom -> top. alpha(z) = half opening angle.
    hem_rad: (z_hem, rx, rF, rB, cy) flare target below the waist."""
    outer, inner, params = [], [], []
    if hem_rad:   # v2.9: coat / jacket hems follow the body build
        hem_rad = (hem_rad[0],) + tuple(v * BUILD['skirt'] for v in hem_rad[1:4]) + tuple(hem_rad[4:])
    zs = ah_rows(bt, list(zs))[0]   # v3.0: + the armpit row
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
        params.append([(ph, z) for ph in phis])
    R, C = len(zs), len(outer[0])
    def mf(i, j, side):
        if trim and (j == 0 or j == C - 2):
            return trim
        if trim and hem_trim and i == 0 and side == 'o':
            return trim
        if trim and collar_trim and i == R - 2:
            return trim
        return lining if (side == 'i' and lining) else mat
    mb.shell(outer, inner, mf, w, edge_mat=trim or mat, bt=bt, params=params, ah=ah, mat_at=lambda z: mat)

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
    """v2.6: one clean, even band of a single colour (a closed thick ring, no overlapping patches)"""
    outer = [body_ring(bt, z, .013) for z in (1.468, 1.516)]
    inner = [body_ring(bt, z, .003) for z in (1.468, 1.516)]
    mb.thick_loft(outer, inner, mat, torso_w)

def buttons(mb, bt, mat, n=5, z0=1.05, z1=1.41):
    """placket strip + evenly spaced buttons, all on the flat front panel"""
    y = front_y(bt, 0, 1.2, .004)
    mb.box((0, y - .0015, (z0 + z1) / 2), (.030, .004, z1 - z0 + .04), 'C_TORSO', SPINE_W((0, 0, 1.2)))
    for k in range(n):
        z = z0 + (z1 - z0) * k / (n - 1)
        mb.box((0, front_y(bt, 0, z, .004) - .0045, z), (.014, .005, .014), mat, SPINE_W((0, 0, z)))

def stitches(mb, bt, mat='A_BELT'):
    """v2.6: clean continuous stitched seams -- two straight front seams and one yoke seam, even width"""
    def strip(x0, z0, x1, z1, segs):
        for k in range(segs):
            xa, za = x0 + (x1 - x0) * k / segs, z0 + (z1 - z0) * k / segs
            xb, zb = x0 + (x1 - x0) * (k + 1) / segs, z0 + (z1 - z0) * (k + 1) / segs
            xc, zc = (xa + xb) / 2, (za + zb) / 2
            y = front_y(bt, xc, zc, .004) - .0012
            ln = math.hypot(xb - xa, zb - za) + .001
            horiz = abs(xb - xa) > abs(zb - za)
            mb.box((xc, y, zc), (ln, .004, .006) if horiz else (.006, .004, ln), mat, SPINE_W((0, 0, zc)))
    strip(-.120, 1.356, .120, 1.356, 6)   # yoke seam across the chest
    strip(0.0, 1.02, 0.0, 1.35, 7)        # centre seam down the front (a clean T)

def seam(mb, bt, x0, z0, x1, z1, segs, mat='A_BELT', width=.006, off=.004, hem=None):
    """v2.8: clean continuous seam strip lying on the actual shirt surface (even width, no gaps, no buried segments)"""
    zs, of = shirt_zs(bt, hem), shirt_off(hem, off)
    ts = {k / segs for k in range(segs + 1)}
    if abs(z1 - z0) > 1e-6:   # also sample at every cloth ring height the seam crosses (it never dips under a fold)
        ts |= {(zr - z0) / (z1 - z0) for zr in zs if min(z0, z1) < zr < max(z0, z1)}
    pts = []
    for t in sorted(ts):
        x, z = x0 + (x1 - x0) * t, z0 + (z1 - z0) * t
        pts.append((x, cloth_y(bt, x, z, zs, of) - .0014, z))
    surface_strip(mb, pts, mat, SPINE_W, width=width, depth=.0035, cy=body_r(bt, 1.2)[3])

def laced_front(mb, bt, z0=1.27, z1=1.43, half=.042, off=.004, crosses=3):
    """a skin V opening on the flat front panel, closed by three crossed laces"""
    ring = lambda z, hw, dy: [(-hw, front_y(bt, 0, z, off) - .0020 + dy, z), (hw, front_y(bt, 0, z, off) - .0020 + dy, z),
                              (hw, front_y(bt, 0, z, off) + .0030 + dy, z), (-hw, front_y(bt, 0, z, off) + .0030 + dy, z)]
    mb.loft([ring(z0, .003, 0), ring(z1, half, 0)], 'C_SKIN', SPINE_W((0, 0, (z0 + z1) / 2)), smooth=False)
    for k in range(crosses):
        zc = z0 + (z1 - z0) * (k + .6) / (crosses + .4)
        hw = .003 + half * (zc - z0) / (z1 - z0)
        y = front_y(bt, 0, zc, off) - .0045
        for sgn in (-1, 1):
            mb.box((0, y, zc), (2 * hw * 1.25, .003, .005), 'A_BELT', SPINE_W((0, 0, zc)), rot=Euler((0, math.radians(28 * sgn), 0)).to_matrix())

def surface_strip(mb, pts, mat, w, width=.006, depth=.003, cy=0.0, n=4):
    """v2.8: a thin continuous raised strip (seam, stitch line, fold) following points on a body surface"""
    rings = []
    m = len(pts)
    for i, c in enumerate(pts):
        c = Vector(c)
        ax = Vector(pts[min(i + 1, m - 1)]) - Vector(pts[max(i - 1, 0)])
        out = Vector((c.x, c.y - cy, 0)).normalized()
        rings.append(xring(c, ax, width / 2, depth / 2, depth / 2, n, front=tuple(out), phase=math.pi / 4 if n == 4 else 0.0))
    mb.loft(rings, mat, w, smooth=False)

def v_opening(mb, bt, z0, z1, half, off_fn, zs_cloth, laces_n=4, under='C_SKIN', lip='C_TORSO', lace='A_BELT'):
    """v2.8 laced V: a real under-layer panel (chest skin) lying just proud of the shirt inside a V, framed by two raised
    folded lips of the shirt, closed by laces that cross OVER the under-layer"""
    hw = lambda z: .003 + (half - .003) * clamp((z - z0) / (z1 - z0))
    # rows at the cloth's own ring heights too, so the panel never dips under a fold line of the shirt
    zs = sorted(set([round(z0 + .004 + (z1 - z0 - .004) * k / 5, 4) for k in range(6)] + [z for z in zs_cloth if z0 + .004 < z < z1]))
    outer, inner = [], []
    for z in zs:
        o = off_fn(z)
        ro, ri = [], []
        for j in range(7):
            x = hw(z) * (j - 3) / 3 * 1.08
            y = cloth_y(bt, x, z, zs_cloth, off_fn) - .0022
            ro.append((x, y, z))
            ri.append((x, y + .0030, z))
        outer.append(ro)
        inner.append(ri)
    mb.patch(outer, under, SPINE_W, outward=(0, -1, 0))
    for sx in (-1, 1):   # folded lips of the shirt along both edges of the V
        pts = []
        for z in sorted(set([round(z0 - .008 + (z1 + .004 - (z0 - .008)) * k / 5, 4) for k in range(6)] + [z for z in zs_cloth if z0 - .008 < z < z1 + .004])):
            x = sx * (hw(z) * 1.08 + .0042)
            pts.append((x, cloth_y(bt, x, z, zs_cloth, off_fn) - .0026, z))
        surface_strip(mb, pts, lip, SPINE_W, width=.010, depth=.0055, cy=body_r(bt, 1.3)[3])
    for k in range(laces_n):   # crossed laces over the opening
        zc = z0 + (z1 - z0) * (k + .75) / (laces_n + .5)
        w_ = hw(zc) * 1.08 + .006
        y = cloth_y(bt, 0, zc, zs_cloth, off_fn) - .0048
        dz = .012
        for sg in (-1, 1):
            p0, p1 = Vector((-w_, y, zc - dz * sg)), Vector((w_, y, zc + dz * sg))
            d = p1 - p0
            mb.box(tuple((p0 + p1) / 2), (d.length, .0030, .0045), lace, SPINE_W((0, 0, zc)),
                   rot=Euler((0, -math.atan2(d.z, d.x), 0)).to_matrix())

def body_arc_band(mb, bt, z, off, phi0, phi1, mat, h=.012, n=8):
    """v3.0: a raised band on the body between two angles (open ends tucked into the sleeve seams)"""
    sec = [(z - h / 2 - .002, off - .004), (z - h / 2, off), (z + h / 2, off), (z + h / 2 + .002, off - .004)]
    grid = [[mb._v(tuple(body_point(bt, phi0 + (phi1 - phi0) * c / n, zz, oo)), torso_w) for c in range(n + 1)] for zz, oo in sec]
    allf = []
    for r in range(3):
        for c in range(n):
            mb._face((grid[r][c], grid[r][c + 1], grid[r + 1][c + 1], grid[r + 1][c]), mat, False, allf)
    for c in (0, n):
        mb._face([grid[r][c] for r in range(4)], mat, False, allf, rim=True)
    bmesh.ops.recalc_face_normals(mb.bm, faces=allf)

def yoke_band(mb, bt, z, off, mat='A_BELT', h=.012):
    """v2.8: a seam band round the body (two-toned yoke boundary). v3.0: front and back arcs ending at the sleeve seams."""
    e = ARMHOLE[bt]['dphi'] + math.radians(2)
    body_arc_band(mb, bt, z, off, -(math.pi / 2 - e), math.pi / 2 - e, mat, h, n=10)
    body_arc_band(mb, bt, z, off, math.pi / 2 + e, 1.5 * math.pi - e, mat, h, n=10)

def gambeson_stitches(mb, bt, n, zs, off_fn, mat='A_BELT'):
    """v2.8 stitching top: dark stitch lines run in the quilt grooves (front and back panels), evenly spaced"""
    for k in (-4, -2, 0, 2, 4, n // 2 - 2, n // 2, n // 2 + 2):
        phi = 2 * math.pi * k / n
        near = abs(math.sin(phi)) > math.cos(ARMHOLE[bt]['dphi'] + math.radians(14))   # v3.0: lines near a sleeve seam stop below it
        pts = [tuple(body_point(bt, phi, z, off_fn(z) + .0012)) for z in zs if not near or z < AH_ZROW[bt] - .006]
        surface_strip(mb, pts, mat, torso_w, width=.0050, depth=.0030, cy=body_r(bt, 1.2)[3], n=3)

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
        rings = arm_rings(bt, sx, [(-.10, .012, .70), (.04, .014), (.20, .015)], n=10)
        pa = arm_path(bt, sx)
        ax = pa.dir(.20)
        rings[-1] = [tuple(Vector(q) - ax * (.020 if k % 2 else 0.0)) for k, q in enumerate(rings[-1])]
        mb.loft(rings, mat, arm_w(sx), cap0=True, cap1=False)

def shirt_off(hem=None, off=.004, hem_off=.016):
    """the surface offset shirt2 uses at height z (so details can sit exactly on the cloth)"""
    return (lambda z: off + .030 * ss(1.09, 1.00, z) + .012 * ss(1.02, .96, z) + (hem_off * ss(0.96, hem, z) if z < 0.96 else 0.0)) if hem else (lambda z: off)   # v2.8: +.012 over the hips so thigh tops never show

def shirt_zs(bt, hem=None, yoke=False):
    """ring heights of a shirt2 garment"""
    drop = (1, 3, 5) if bt == 'A' else (1, 3, 6)
    zs = [r[0] for i, r in enumerate(TORSO[bt]) if i not in drop]
    zs[0] = 0.968
    if hem:
        zs = [hem, (hem + .94) / 2 if hem < .90 else .92, .96, 1.00] + zs[1:]   # v2.6: rings at the belt so the hem clears it
    if yoke and 1.30 not in zs:
        zs = sorted(zs + [1.30])
    return ah_rows(bt, zs)[0]   # v3.0: + the armpit row (tight armhole window)

def ring_front_y(bt, x, z, off, n=8):
    """y of the front of the actual (faceted) body_ring polygon at x"""
    ring = body_ring(bt, z, off, n)
    cy = body_r(bt, z)[3]
    best = None
    for a, b in zip(ring, ring[1:] + ring[:1]):
        if (a[0] - x) * (b[0] - x) <= 0 and abs(b[0] - a[0]) > 1e-9 and (a[1] + b[1]) / 2 < cy:
            y = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0])
            best = y if best is None else min(best, y)
    return best if best is not None else front_y(bt, x, z, off)

def cloth_y(bt, x, z, zs, off_fn):
    """v2.8: y of the ACTUAL shirt2 front surface at (x, z) -- its faceted rings, interpolated between ring heights, so
    details sit exactly on the cloth (front_y alone follows rows the shirt skips and can bury a detail or float it)"""
    for i in range(len(zs) - 1):
        if zs[i] <= z <= zs[i + 1]:
            t = (z - zs[i]) / (zs[i + 1] - zs[i])
            return ring_front_y(bt, x, zs[i], off_fn(zs[i])) * (1 - t) + ring_front_y(bt, x, zs[i + 1], off_fn(zs[i + 1])) * t
    return ring_front_y(bt, x, z, off_fn(z))

def shirt2(mb, bt, mat='C_TORSO', hem=None, off=.004, hem_off=.016, matfn=None, jag=0.0, pleat_below=0.0, n=8, channels=0.0, flat=False, ah='zip'):
    zs = shirt_zs(bt, hem, bool(matfn))
    o = shirt_off(hem, off, hem_off)
    def _bump(z):
        if channels and z < 1.43:
            return lambda k: channels * (k % 2)
        return (lambda k: .008 * (k % 2)) if z < pleat_below else None
    ph = 0.0 if channels else (math.radians(7.5) if n == 24 else None)   # v3.0: 24-gon columns land on the armhole edges
    rings = [body_ring(bt, z, o(z), n, bump=_bump(z), phase=ph) for z in zs]   # channels: a groove on the centre line
    php = math.pi / n if ph is None else ph
    params = [[(2 * math.pi * k / n + php, z) for k in range(n)] for z in zs]
    if jag:
        notch = {3: 2.2, 8: 1.8}   # two deep rips cut into the hem silhouette
        rings[0] = [(x, y, z + (jag * notch.get(k, 1.0) if (k % 2 or k in notch) else 0.0)) for k, (x, y, z) in enumerate(rings[0])]
    mat_at = (lambda z: matfn(z, z + 1e-3)) if matfn else None
    mb.loft_ah(bt, rings, params, mat, torso_w, ah=ah, matfn=(lambda i, k: matfn(zs[i], zs[i + 1])) if matfn else None, smooth=not flat, mat_at=mat_at)

def torso_style(mb, bt, key):
    """v2.7: each option has its own silhouette / pattern (2004 creator categories, our own meshes).
    'coat' is Bram's extra (not a kit option)."""
    if key in ('plain', 'simple'):                 # plain tucked shirt (default)
        shirt2(mb, bt)
    elif key == 'light buttons':                   # doublet: short flared peplum, stand collar, two rows of light buttons
        shirt2(mb, bt, hem=.90, hem_off=.018)
        collar(mb, bt)
        o = shirt_off(.90, .004, .018)
        for sx in (-1, 1):   # v2.8: 2 x 4 identical buttons, even spacing, all on the flat chest panel above the peplum
            for k in range(4):
                z = 1.130 + .080 * k
                mb.box((.036 * sx, cloth_y(bt, .036, z, shirt_zs(bt, .90), o) - .0042, z), (.015, .005, .015), 'A_SHIRT', SPINE_W((0, 0, z)))
    elif key == 'dark buttons':                    # leather waistcoat outline over the shirt, dark buttons down its edge
        shirt2(mb, bt)
        # v2.8: one closed leather shell -- enough panels (16) and stand-off that no shirt corner can show through it
        va = lambda z: 0.05 + max(0, z - 1.28) * 4.4
        open_shell(mb, bt, [.90, .96, 1.02, 1.10, 1.20, 1.30, 1.38, 1.43, 1.47],
                   va, .017, .007, mat='A_BELT', trim=None, w=torso_w, n_body=16, ah='vest')   # v3.0: a real sleeveless armhole
        for k in range(5):   # dark buttons down the closing edge of the left panel
            z = .99 + .07 * k
            p = body_point(bt, va(z) + .10, z, .019)
            mb.box((p.x, p.y - .0006, z), (.013, .005, .013), 'A_EYES', SPINE_W((0, 0, z)))
    elif key == 'jacket':                          # hip-length open jacket with lapels and trim over a linen shirt
        shirt2(mb, bt, mat='A_SHIRT', ah='hole')   # v3.0: hidden under the jacket, which carries the sleeve seam
        open_shell(mb, bt, [.82, .88, .94, 1.00, 1.08, 1.18, 1.28, 1.36, 1.42, 1.46, 1.49],
                   lambda z: 0.26 + max(0, z - 1.26) * 4.6 + max(0, .98 - z) * .9, lambda z: .019 + .012 * ss(1.08, 1.00, z) + .022 * ss(.97, .82, z), .010,
                   hem_rad=(.82, .212, .134, .144, .026), n_body=12)
    elif key == 'shirt':                           # untucked shirt with a laced V front
        hem = .88 if bt == 'A' else .90
        shirt2(mb, bt, hem=hem)
        v_opening(mb, bt, 1.235 if bt == 'A' else 1.26, 1.494 if bt == 'A' else 1.488, .052 if bt == 'A' else .044, shirt_off(hem), shirt_zs(bt, hem))   # open up to the neckline
    elif key == 'stitching' and bt == 'A':         # quilted gambeson: evenly spaced vertical quilt channels in the torso colour + collar band
        shirt2(mb, bt, hem=.86, hem_off=.020, n=24, channels=.012)
        gambeson_stitches(mb, bt, 24, [z for z in shirt_zs(bt, .86) if .88 < z < 1.43], shirt_off(.86, .004, .020))
        collar(mb, bt)
    elif key == 'stitching':                       # B: corset-style panels -- two princess seams and a waist seam
        shirt2(mb, bt)
        for sx in (-1, 1):
            seam(mb, bt, .058 * sx, 1.00, .050 * sx, 1.40, 8)
        seam(mb, bt, -.11, 1.05, .11, 1.05, 16)   # fine sampling: follows the faceted waist all the way across
    elif key == 'torn':                            # jagged hem with notches, two ragged holes, frayed shoulder edges
        shirt2(mb, bt, hem=.88, jag=.045)
        rip(mb, bt, .075, 1.12, seed=3)
        rip(mb, bt, -.085, 1.27, w=.040, h=.030, seed=5)   # v2.8: no frayed shoulder caps (they bumped over every sleeve)
    elif key == 'two-toned':                       # tunic with a contrasting yoke, belted at the waist
        shirt2(mb, bt, hem=.86, hem_off=.018, matfn=lambda z0, z1: 'A_SHIRT' if z0 >= 1.299 else 'C_TORSO')
        yoke_band(mb, bt, 1.30, .011)   # v2.8: the seam runs all the way round
        belt(mb, bt, .955, .995, off=.040, buckle=True)
    elif key == 'sports top':                      # B: cropped top + bare midriff
        torso_loft(mb, bt, [.968, 1.00, 1.06, 1.125], 0.0, 'C_SKIN')
        torso_loft(mb, bt, [1.105, 1.14, 1.215, 1.27, 1.385, 1.43, 1.464, 1.492], lambda z: .006 if z > 1.11 else .010, 'C_TORSO')
    elif key == 'pleated':                         # B: pleated peplum top
        shirt2(mb, bt, hem=.90, hem_off=.012, pleat_below=1.10)   # v3.0: a narrower peplum (the idle hands sit just outside it)
    elif key == 'coat':                            # Guide Bram's long open coat (tutor extra built with kit rules)
        shirt2(mb, bt, mat='A_SHIRT', ah='hole')
        open_shell(mb, bt, [.56, .70, .84, .95, 1.08, 1.24, 1.35, 1.42, 1.475],
                   lambda z: (0.16 + max(0, z - 1.28) * 4.6 + max(0, .95 - z) * .40), lambda z: .020 + .012 * ss(1.06, .99, z) + .030 * ss(.99, .82, z), .010,
                   hem_rad=(.56, .228, .162, .192, .030), n_body=12)
    else:
        raise ValueError('unknown torso style %s' % key)

# ---- arms -----------------------------------------------------------------------------------
def _spec_off(spec, u):
    """sleeve offset at u, linear between the spec rows"""
    us = [st[0] for st in spec]
    if u <= us[0]:
        return spec[0][1]
    for a, b in zip(spec, spec[1:]):
        if a[0] <= u <= b[0]:
            t = (u - a[0]) / (b[0] - a[0]) if b[0] > a[0] else 0.0
            return a[1] + (b[1] - a[1]) * t
    return spec[-1][1]

def _cap_frame(bt, sx):
    pa = arm_path(bt, sx)
    d = pa.dir(U_CAP)
    f0 = Vector((0, -1, 0))
    f = (f0 - d * f0.dot(d)).normalized()
    s_ = d.cross(f).normalized()
    c = pa.pos(U_CAP)
    if BUILD['arm_out']:
        lat = Vector((sx, 0, 0)) - d * (d.x * sx)
        c = c + lat.normalized() * BUILD['arm_out'](bt, U_CAP)
    return pa, d, f, s_, c

def cap_angle(sx, k):
    """xring angle (0 = front, pi/2 = the ring's s side) of the arm-ring vertex that seam vertex k runs down to: the armhole
    top runs down the OUTER side of the arm, the armpit down the inner side, front to front, back to back"""
    psi = 2 * math.pi * (k + .5) / AH_K
    return (1.5 * math.pi + psi) if sx > 0 else (.5 * math.pi - psi)

def cap_points(bt, sx, off_end, ts, fullness=1.0, bulge=0.0, push=0.0):
    """v3.0 deltoid cap: for each seam vertex k a cubic meridian from the seam (leaving along the body surface, turned
    outward) to the arm ring at U_CAP (arriving along the arm axis). Returns rings[t][k] (AH_K points each)."""
    pa, d, f, s_, c = _cap_frame(bt, sx)
    rs, rf = lerp_table(ARM_R[bt], U_CAP)
    seam = seam_ring(bt, sx)
    cen = sum(seam, Vector()) / AH_K
    out = [[None] * AH_K for _ in ts]
    for k in range(AH_K):
        a = cap_angle(sx, k)
        P3 = c + s_ * ((rs + off_end) * math.sin(a)) + f * ((rf + off_end) * math.cos(a))
        P0 = seam[k]
        n = seam_normal(bt, sx, k)
        tin = cen - P0
        tin = (tin - n * tin.dot(n)).normalized()
        psi = 2 * math.pi * (k + .5) / AH_K
        cp = math.cos(psi)
        T0 = (n * (.80 - .45 * max(0.0, -cp)) + tin * (.75 * cp)).normalized()
        L = (P3 - P0).length
        P1 = P0 + T0 * (L * .29 * fullness)   # v3.0 review pass 2: a rounded shoulder without a puffed-sleeve notch
        P2 = P3 - d * (L * .40)
        for i, t in enumerate(ts):
            u_ = 1 - t
            p = P0 * u_ ** 3 + P1 * (3 * u_ * u_ * t) + P2 * (3 * u_ * t * t) + P3 * t ** 3
            if bulge or push:
                ax = c + d * (p - c).dot(d)
                r = (p - ax)
                r = r.normalized() if r.length > 1e-6 else n
                nn = (n * (1 - t) + r * t).normalized()
                p = p + r * (bulge * math.sin(math.pi * t)) + nn * push
            out[i][k] = p
    return out

CAP_TS = (.14, .32, .52, .74)

def arm_from_seam(mb, bt, sx, spec, mat, n=5, cap1=True, matfn=None, taper=False, fullness=1.0, bulge=0.0, cap_mat=None):
    """v3.0: one arm part that STARTS on the canonical seam ring (same verts / weights / normals as every torso armhole),
    rounds over the deltoid (AH_K-sided cap) and continues as the n-sided sleeve / arm of `spec` [(u, off)]"""
    w_arm = arm_w(sx)
    off_end = _spec_off(spec, U_CAP)
    ts = list(CAP_TS) + [1.0]
    rings = cap_points(bt, sx, off_end, ts, fullness, bulge)
    allf = []
    cm = cap_mat or mat
    seam = []
    for k in range(AH_K):
        v = mb._v(seam_point(bt, sx, k), seam_w(bt, sx, k))
        mb.pin(v, seam_normal(bt, sx, k))
        seam.append(v)
    rows = [seam]
    for t, ring in zip(ts, rings):
        row = []
        for k, p in enumerate(ring):
            sw = seam_w(bt, sx, k)
            row.append(mb._v(p, wnorm(wmix(sw, w_arm(p), ss(0.0, .85, t)))))
        rows.append(row)
    for a, b in zip(rows, rows[1:]):
        for k in range(AH_K):
            q = (a[k], a[(k + 1) % AH_K], b[(k + 1) % AH_K], b[k])
            mb._face(q, cm, True, allf)
    # the n-sided arm below the cap
    us = [U_CAP + .10] + [st[0] for st in spec if st[0] > U_CAP + .14]
    rest = [(u, _spec_off(spec, u)) for u in us]
    q_rings = arm_rings(bt, sx, rest, n, taper=taper)
    qv = [[mb._v(p, w_arm) for p in r] for r in q_rings]
    # decagon -> n-gon transition (each n-gon vertex runs from the decagon vertex at the same angle)
    D = rows[-1]
    ang = [cap_angle(sx, k) % (2 * math.pi) for k in range(AH_K)]
    order = sorted(range(AH_K), key=lambda k: ang[k])
    qang = [(2 * math.pi * m / n + math.pi / n) % (2 * math.pi) for m in range(n)]
    pos = {}
    for m, qa in enumerate(qang):
        pos[m] = min(range(AH_K), key=lambda j: abs((ang[order[j]] - qa + math.pi) % (2 * math.pi) - math.pi))
    Q0 = qv[0]
    for m in range(n):
        j0, j1 = pos[m], pos[(m + 1) % n]
        if j1 <= j0:
            j1 += AH_K
        arc = [D[order[j % AH_K]] for j in range(j0, j1 + 1)]
        qa, qb = Q0[m], Q0[(m + 1) % n]
        h = len(arc) // 2
        for j in range(len(arc) - 1):
            mb._face((arc[j], arc[j + 1], qa if j < h else qb), cm, True, allf)
        mb._face((arc[h], qb, qa), cm, True, allf)
    for i in range(len(qv) - 1):
        a, b = qv[i], qv[i + 1]
        for k in range(n):
            quad = (a[k], a[(k + 1) % n], b[(k + 1) % n], b[k])
            mb._face(quad, matfn(i, k) if matfn else mat, True, allf)
    if cap1:
        mb._face(qv[-1], mat, True, allf, rim=True)
    bmesh.ops.recalc_face_normals(mb.bm, faces=allf)

def arms_both(mb, bt, spec, mat='C_TORSO', n=5, cap0=True, cap1=True, matfn=None, bump=None, taper=False, fullness=1.0, bulge=0.0, cap_mat=None):
    if spec[0][0] <= 0.0:   # v3.0: starts at the shoulder -> on the canonical seam ring, with the deltoid cap
        for sx in (-1, 1):
            arm_from_seam(mb, bt, sx, spec, mat, n, cap1, matfn, taper, fullness, bulge, cap_mat)
        return
    for sx in (-1, 1):
        mb.loft(arm_rings(bt, sx, spec, n, bump=bump, taper=taper), mat, arm_w(sx), cap0, cap1, matfn=matfn)

U_ARM = [0.0, .65, .75, .85, 1.0, 1.12, 1.4, 1.88]   # v3.0 ring stations (cap to U_CAP, elbow at 1.0)

def arms_skin(mb, bt, u0, n=5, bulk=None, fullness=1.0):
    us = [u0] + [u for u in U_ARM if u > u0 + .05] + [1.80, WRIST_U]
    us = sorted(set(us))
    arms_both(mb, bt, [(u, bulk(u) if bulk else 0.0) for u in us], 'C_SKIN', n, taper=True, cap1=False, fullness=fullness)   # open end: the hand continues it

def sleeve_thick(mb, bt, spec, mat='C_TORSO', trim=None, t=.008, fullness=1.0):
    """bell / cuffed sleeve: the flared part is a thick tube (open cuff); above it the arm comes from the seam"""
    for sx in (-1, 1):
        outer = arm_rings(bt, sx, spec)
        inner = arm_rings(bt, sx, [(u, o - t) for u, o in spec])
        mb.thick_loft(list(reversed(outer)), list(reversed(inner)), mat, arm_w(sx),
                      matfn=(lambda i, k: trim if i == 0 else mat) if trim else None, rim_mat=trim or mat)
    top = spec[0]
    arms_both(mb, bt, [(0.0, .006), (U_CAP, top[1] - .002), (top[0] + .07, top[1] - .003)], mat, fullness=fullness)

LONG_SLEEVE = [(0.0, .006), (.65, .010), (.85, .010), (1.0, .010), (1.12, .010), (1.4, .010), (1.6, .009), (1.85, .009), (1.88, .016), (1.97, .017)]
MUSCLE = lambda k: (lambda u: k * (.022 * math.sin(math.pi * clamp((u - .62) / .42)) + .016 * math.sin(math.pi * clamp((u - 1.05) / .6))))

def shoulder_pad(mb, bt, mat='A_BELT'):
    """v3.0: a leather pad following the deltoid cap (a thick shell over it, closed rims)"""
    ts = [.10, .26, .44, .62, .80, .90]
    for sx in (-1, 1):
        off_end = _spec_off(LONG_SLEEVE, U_CAP)
        outer = cap_points(bt, sx, off_end, ts, push=.030)
        inner = cap_points(bt, sx, off_end, ts, push=.012)
        mb.thick_loft([[tuple(p) for p in r] for r in reversed(outer)], [[tuple(p) for p in r] for r in reversed(inner)], mat, arm_w(sx))

def arm_style(mb, bt, key):
    """v2.2 option names follow the 2004 creator's categories (our own meshes). v3.0: every option starts on the seam."""
    if key == 'regular':
        arms_both(mb, bt, LONG_SLEEVE)
    elif key == 'long sleeved':
        arms_both(mb, bt, [(u, o * .7) for u, o in LONG_SLEEVE])
    elif key in ('musclebound', 'muscley'):
        k = 1.0 if key == 'musclebound' else .6
        arms_both(mb, bt, [(0.0, .006), (.65, .012 + .006 * k), (.76, .015 + .006 * k), (.82, .013 + .004 * k)], fullness=1.0 + .15 * k, bulge=.006 * k)
        arms_skin(mb, bt, .72, bulk=MUSCLE(k))
    elif key == 'loose sleeved':
        sleeve_thick(mb, bt, [(.78, .016), (1.0, .026), (1.3, .032), (1.6, .036), (1.86, .038)])
        arms_skin(mb, bt, 1.70)
    elif key in ('large cuffed', 'large cuffs'):
        sleeve_thick(mb, bt, [(.78, .013), (1.0, .012), (1.3, .012), (1.58, .013), (1.64, .028), (1.84, .032)], trim='A_TRIM')
        arms_both(mb, bt, [(1.60, .004), (1.80, .006), (1.92, .010), (1.97, .010)], 'A_SHIRT')
    elif key == 'thin':
        arms_both(mb, bt, [(u, o - .012) for u, o in LONG_SLEEVE], fullness=.9)
    elif key == 'shoulder pads':
        arms_both(mb, bt, LONG_SLEEVE)
        shoulder_pad(mb, bt)
    elif key == 'tight sleeves':
        arms_both(mb, bt, [(u, o * .4) for u, o in LONG_SLEEVE])
        arms_both(mb, bt, [(1.78, .008), (1.80, .012), (1.93, .012), (1.95, .008)], 'A_BELT')
    elif key == 'short sleeves':
        arms_both(mb, bt, [(0.0, .004), (.65, .010), (.78, .012), (.83, .011)])
        arms_skin(mb, bt, .74)
    elif key == 'bare arms':
        arms_skin(mb, bt, 0.0)
    elif key == 'frilly':                          # elbow sleeve + linen frill
        arms_both(mb, bt, [(0.0, .004), (.65, .008), (.85, .008), (.96, .009), (1.02, .008)])
        spec = [(.98, .006), (1.04, .014), (1.12, .024)]
        for sx in (-1, 1):
            outer = arm_rings(bt, sx, spec, n=12, bump=lambda k: .005 * (k % 2))
            inner = arm_rings(bt, sx, [(u, o - .005) for u, o in spec], n=12)
            mb.thick_loft(list(reversed(outer)), list(reversed(inner)), 'A_SHIRT', arm_w(sx))
        arms_skin(mb, bt, .98)
    else:
        raise ValueError('unknown arms style %s' % key)

# ---- hands ------------------------------------------------------------------------------------
HAND_ST = [(.03, .0245, .0262), (.14, .029, .035), (.28, .033, .041), (.42, .030, .036), (.52, .019, .023), (.56, .006, .008)]   # OSRS bulb hand (v2.8: from the wrist)
CURL = {.28: .004, .42: .008, .52: .010}

def hand_frame(bt, sx):
    sd = 'Left' if sx > 0 else 'Right'
    k = HAND_K[bt]
    W, Hn = BHEAD[B(sd + 'Hand')], BTAIL[B(sd + 'Hand')]
    ax = (Hn - W).normalized()
    L = (Hn - W).length * k
    wts = chain_w([BHEAD[B(sd + 'ForeArm')], W, Hn], [B(sd + 'ForeArm'), B(sd + 'Hand')], [.03])
    return W, ax, L, k, wts

def hand_profile(bt, sx, t):
    """(centre, rs, rf) of the mitten at parameter t (interpolated HAND_ST incl. the fist curl)"""
    W, ax, L, k, _ = hand_frame(bt, sx)
    st = HAND_ST
    t = clamp(t, st[0][0], st[-1][0])
    for (t0, a0, b0), (t1, a1, b1) in zip(st, st[1:]):
        if t0 <= t <= t1:
            f = (t - t0) / (t1 - t0)
            c0, c1 = CURL.get(t0, 0.0), CURL.get(t1, 0.0)
            curl = c0 + (c1 - c0) * f
            return W + ax * (t * L) + Vector((-sx * curl * k, 0, 0)) + hand_shift(bt, sx, ax), (a0 + (a1 - a0) * f) * k, (b0 + (b1 - b0) * f) * k
    return W + ax * (t * L) + hand_shift(bt, sx, ax), st[-1][1] * k, st[-1][2] * k

def mitten(mb, bt, sx, mat, grow=0.0, n=5, cuff=None):
    """blocky OSRS mitten hand, no thumb; slight fist curl toward the palm. v2.8: ring 0 is the bare forearm's own wrist
    ring (identical vertices and weights), so forearm -> wrist -> hand is one continuous taper with no step.
    cuff: [(u, extra_off)] rings further up the forearm (glove gauntlet)."""
    W, ax, L, k, wts = hand_frame(bt, sx)
    rings, ws = [], []
    for u, eo in (cuff or []):
        rings.append(arm_rings(bt, sx, [(u, grow + eo)], n=5, taper=True)[0])
        ws.append(arm_w(sx))
    rings.append(arm_rings(bt, sx, [(WRIST_U, grow)], n=5, taper=True)[0])
    ws.append(arm_w(sx))
    for t, th, wd in HAND_ST:
        c = W + ax * (t * L) + Vector((-sx * CURL.get(t, 0.0) * k, 0, 0)) + hand_shift(bt, sx, ax)
        rings.append(xring(c, ax, th * k + grow, wd * k + grow, wd * k + grow, n, phase=math.pi / n))
        ws.append(wts)
    mb.loft(rings, mat, ws, cap0=bool(cuff))

def hand_band(mb, bt, sx, tc, hw, slant, mat='A_SHIRT', off=.0035, n=5):
    """one cloth band wrapped round the mitten at tc (+-hw), slanted so consecutive bands spiral; it follows the bulb"""
    W, ax, L, k, wts = hand_frame(bt, sx)
    f0 = Vector((0, -1, 0))
    f = (f0 - ax * f0.dot(ax)).normalized()
    sv = ax.cross(f).normalized()
    def ring(dt, o):
        pts = []
        for j in range(n):
            a = 2 * math.pi * j / n + math.pi / n
            t = tc + dt + slant * math.sin(a)
            c, rs, rf = hand_profile(bt, sx, t)
            pts.append(tuple(c + sv * ((rs + o) * math.sin(a)) + f * ((rf + o) * math.cos(a))))
        return pts
    mb.thick_loft([ring(-hw, off), ring(hw, off)], [ring(-hw, -.002), ring(hw, -.002)], mat, wts, smooth=False)

def hand_style(mb, bt, key):
    for sx in (-1, 1):
        if key == 'bare':
            mitten(mb, bt, sx, 'C_SKIN')
        elif key == 'gloves':   # leather glove with a short gauntlet cuff that hugs the forearm
            mitten(mb, bt, sx, 'A_BELT', grow=.004, cuff=[(1.78, .004), (1.86, .003)])
        elif key == 'wraps':    # v2.8: off-white cloth bands spiralling round the wrist and palm; skin shows between them
            mitten(mb, bt, sx, 'C_SKIN')
            for tc, hw, sl in ((.00, .045, 0.0), (.13, .028, .045), (.25, .028, -.045), (.37, .026, .040)):
                hand_band(mb, bt, sx, tc, hw, sl)
            band = arm_rings(bt, sx, [(1.86, .0035), (1.93, .0035)], n=5, taper=True)   # wrap continues onto the wrist
            inner = arm_rings(bt, sx, [(1.86, -.002), (1.93, -.002)], n=5, taper=True)
            mb.thick_loft(band, inner, 'A_SHIRT', arm_w(sx), smooth=False)
        else:
            raise ValueError('unknown hands style %s' % key)

# ---- legs -----------------------------------------------------------------------------------
def pelvis(mb, bt, mat='C_LEGS', off=0.0):
    mb.loft([body_ring(bt, z, off) for z in [r[0] for r in PELVIS[bt]]], mat, torso_w)

def legs_both(mb, bt, spec, mat='C_LEGS', n=6, cap0=True, cap1=True):
    if spec[0][0] <= 0.0 and len(spec[0]) < 3:   # rounded hip dome tucked inside the pelvis
        spec = [(spec[0][0] - .07, spec[0][1], .50)] + list(spec)
    for sx in (-1, 1):
        mb.loft(leg_rings(bt, sx, spec, n), mat, leg_w(sx), cap0, cap1)

def legs_skin(mb, bt, u0):
    legs_both(mb, bt, [(u, 0.0) for u in [u0] + [u for u in U_LEG if u > u0 + .05]] + [(2.04, 0.0)], 'C_SKIN')

def skirt(mb, bt, zs, hem_rad, off=.012, mat='C_LEGS', n=10, pleats=0.0, matfn=None, rim_mat=None):
    """thick skirt from the waist (zs[-1]) flaring to hem_rad at zs[0]"""
    z_hem, z_top = zs[0], zs[-1]
    hem_rad = (hem_rad[0],) + tuple(v * BUILD['skirt'] for v in hem_rad[1:4]) + tuple(hem_rad[4:])
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

TROUSERS = [(u, .010) for u in U_LEG[:-1]] + [(1.90, .011), (1.96, .012), (2.03, .010)]   # hem runs into the shoe / boot

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
# v3.0 (owner review 2026-09-25: "the boots and the feet look a little bit blocky still"): OSRS feet are small rounded
# wedges. Every foot is ONE continuous loft of horizontal rounded slices (sole -> toe box -> instep -> ankle) that runs on
# into rings round the shin (boot shaft / shoe collar / bare ankle): few big faces, smooth inside, a crisp toe-box line,
# a flat underside but no sole slab, no box sides.
# slices (A, FOOT_K 1): (z, y_front, y_back, half_width_outer, half_width_inner); the ankle joint is at y .10, z .12
FOOT_SL = [(0.000, -.134, .150, .050, .046),
           (0.013, -.146, .160, .058, .053),
           (0.036, -.144, .165, .061, .056),
           (0.058, -.116, .168, .060, .056),
           (0.080, -.066, .170, .062, .058),
           (0.101, .000, .172, .066, .063),
           (0.117, .024, .174, .069, .067)]   # the last slice is the round ankle the shaft / collar rises from
BARE_SL = [(0.000, -.132, .146, .046, .042),
           (0.013, -.142, .154, .054, .049),
           (0.034, -.140, .158, .056, .051),
           (0.054, -.110, .160, .054, .050),
           (0.074, -.058, .160, .054, .050),
           (0.094, .008, .158, .054, .051),
           (0.112, .044, .154, .053, .052)]   # bare foot: narrows to the bare ankle
FOOT_N = 10
FOOT_P = 2.35

def foot_slice(bt, sx, z, yf, yb, wo, wi, grow=0.0, wk=1.0, hk=1.0, n=FOOT_N):
    """one rounded horizontal outline; vertex angle a from the front (-y) toward +x, phase pi/n (blunt toe face, no point)"""
    k = FOOT_K[bt]
    yf, yb = .10 + (yf - .10) * k, .10 + (yb - .10) * k
    kz = k ** .5 * hk
    yc = (yf + yb) / 2
    lf, lb = yc - yf + grow, yb - yc + grow
    e = 2.0 / FOOT_P
    pts = []
    for j in range(n):
        a = 2 * math.pi * j / n + math.pi / n
        sa, ca = math.sin(a), math.cos(a)
        w = ((wo if sa * sx > 0 else wi) * k ** .8 * wk + grow)
        x = w * math.copysign(abs(sa) ** e, sa)
        y = yc - (lf if ca >= 0 else lb) * math.copysign(abs(ca) ** e, ca)
        x += sx * .13 + sx * max(0.0, .02 - y) * .10   # toes turn out a little
        pts.append((x, y, z * kz))
    return pts

def shin_rings(bt, sx, spec, n=FOOT_N):
    """rings round the lower leg in the foot's vertex convention (a from the front toward +x)"""
    pl = leg_path(bt, sx)
    out = []
    for u, off in spec:
        rs, rf, rb = lerp_table(LEG_R[bt], u)
        c = pl.pos(u)
        if BUILD['leg_in']:
            ax = pl.dir(u)
            lat = Vector((sx, 0, 0)) - ax * (ax.x * sx)
            c = c - lat.normalized() * BUILD['leg_in'](bt, u)
        d = pl.dir(u)
        f = (Vector((0, -1, 0)) - d * Vector((0, -1, 0)).dot(d)).normalized()
        s_ = (Vector((1, 0, 0)) - d * d.x - f * f.x).normalized()
        ring = []
        for j in range(n):
            a = 2 * math.pi * j / n + math.pi / n
            r = rf if math.cos(a) >= 0 else rb
            ring.append(tuple(c + s_ * ((rs + off) * math.sin(a)) + f * ((r + off) * math.cos(a))))
        out.append(ring)
    return out

def foot_loft(mb, bt, sx, mat, shin_spec, grow=0.0, wk=1.0, hk=1.0, z_bottom=None, slices=None, cap_top=True):
    """sole -> shin in one loft (horizontal slices, then rings round the shin); flat sole face (a rim: hard edge)"""
    sl = slices or FOOT_SL
    rings = []
    for z, yf, yb, wo, wi in sl:
        r = foot_slice(bt, sx, z, yf, yb, wo, wi, grow, wk, hk)
        if z_bottom is not None:
            r = [(x, y, z_ + z_bottom) for x, y, z_ in r]
        rings.append(r)
    rings += shin_rings(bt, sx, shin_spec)
    mb.loft(rings, mat, foot_w(sx), cap0=True, cap1=cap_top)
    return rings

BOOT_SHAFT = [(1.97, .020), (1.88, .021), (1.77, .022), (1.68, .023), (1.645, .025)]   # short shaft, a slight flare at the top
SHOE_COLLAR = [(1.955, .018), (1.93, .019)]

def sandal_straps(mb, bt, sx, rings, ys, z0, mat='A_BELT', width=.016, off=.0045):
    """straps over the bare foot: a band round the foot outline at each y (sole -> over the top -> sole)"""
    for y0 in ys:
        loops = []
        for yy in (y0 - width / 2, y0 + width / 2):
            side_pts = {1: [], -1: []}
            for r in rings[:len(FOOT_SL)]:
                z = r[0][2]
                n = len(r)
                cands = []
                for j in range(n):
                    a, b = Vector(r[j]), Vector(r[(j + 1) % n])
                    if (a.y - yy) * (b.y - yy) <= 0 and abs(b.y - a.y) > 1e-9:
                        t = (yy - a.y) / (b.y - a.y)
                        cands.append(a.lerp(b, t))
                if len(cands) >= 2:
                    cands.sort(key=lambda p: p.x)
                    side_pts[-1].append(cands[0])
                    side_pts[1].append(cands[-1])
            if not side_pts[1]:
                continue
            cx = (side_pts[1][0].x + side_pts[-1][0].x) / 2
            front = [Vector(min(r, key=lambda q: q[1])) for r in rings[:len(FOOT_SL)]]   # the foot's top line (front meridian)
            top = None
            for a, b in zip(front, front[1:]):
                if (a.y - yy) * (b.y - yy) <= 0 and abs(b.y - a.y) > 1e-9:
                    top = a.lerp(b, (yy - a.y) / (b.y - a.y))
                    top.x = cx
            path = side_pts[-1] + ([top] if top is not None else []) + list(reversed(side_pts[1]))
            loops.append([tuple(p + Vector((math.copysign(off, p.x - cx) * min(1.0, abs(p.x - cx) / .02), 0, off if p.z > z0 + .03 else 0))) for p in path])
        if len(loops) == 2 and len(loops[0]) == len(loops[1]):
            inner = [[(x - math.copysign(off * 1.6, x - (loops[0][0][0] + loops[0][-1][0]) / 2), y, z) for x, y, z in lp] for lp in loops]
            vo = [[mb._v(p, foot_w(sx)) for p in lp] for lp in loops]
            vi = [[mb._v(p, foot_w(sx)) for p in lp] for lp in inner]
            allf = []
            m = len(loops[0])
            for i in range(m - 1):
                mb._face((vo[0][i], vo[0][i + 1], vo[1][i + 1], vo[1][i]), mat, False, allf)
                mb._face((vi[0][i], vi[1][i], vi[1][i + 1], vi[0][i + 1]), mat, False, allf, rim=True)
                mb._face((vo[0][i], vi[0][i], vi[0][i + 1], vo[0][i + 1]), mat, False, allf, rim=True)
                mb._face((vo[1][i], vo[1][i + 1], vi[1][i + 1], vi[1][i]), mat, False, allf, rim=True)
            for i in (0, m - 1):
                mb._face((vo[0][i], vo[1][i], vi[1][i], vi[0][i]), mat, False, allf, rim=True)
            bmesh.ops.recalc_face_normals(mb.bm, faces=allf)

def foot_style(mb, bt, key):
    for sx in (-1, 1):
        fw = foot_w(sx)
        if key == 'boots':
            foot_loft(mb, bt, sx, 'C_FEET', BOOT_SHAFT, grow=.004)
        elif key == 'shoes':
            foot_loft(mb, bt, sx, 'C_FEET', SHOE_COLLAR, grow=.001, hk=.92)
        elif key == 'sandals':
            SOLE = .011
            # thin sole following the foot outline (no slab): two slices a touch wider than the foot
            k = FOOT_K[bt]
            base = FOOT_SL[1]
            base = BARE_SL[1]
            sole = [foot_slice(bt, sx, 0.0, base[1] - .004, base[2] + .004, base[3], base[4], grow=.005),
                    foot_slice(bt, sx, 0.0, base[1] - .004, base[2] + .004, base[3], base[4], grow=.005)]
            sole[1] = [(x, y, SOLE) for x, y, z in sole[1]]
            mb.loft(sole, 'A_BELT', fw, smooth=False)
            # the bare foot stands IN the sole (its underside 2 mm below the sole top) and runs up into the bare ankle
            rings = foot_loft(mb, bt, sx, 'C_SKIN', [(1.955, .002), (1.90, .001), (1.84, 0.0)], hk=.92, z_bottom=SOLE - .002,
                              slices=BARE_SL)
            sandal_straps(mb, bt, sx, rings, (.10 + (-.070 - .10) * k, .10 + (.035 - .10) * k), SOLE)
            mb.loft(shin_rings(bt, sx, [(1.935, .006), (1.895, .007)]), 'A_BELT', fw, cap0=False, cap1=False, smooth=False)   # ankle strap

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
        'Makeup': _opts('none', 'rouge', 'eye shadow', 'lip colour', 'full'),   # v2.8: the one sanctioned addition
    },
}
SLOTS = ['Hair', 'Jaw', 'Torso', 'Arms', 'Hands', 'Legs', 'Feet', 'Makeup']
DEFAULT_OUTFIT = {'A': {'Hair': 1, 'Jaw': 1, 'Torso': 1, 'Arms': 1, 'Hands': 1, 'Legs': 1, 'Feet': 1},
                  'B': {'Hair': 1, 'Torso': 1, 'Arms': 1, 'Hands': 1, 'Legs': 1, 'Feet': 1, 'Makeup': 1}}
STYLE_FN = {'Jaw': jaw_style, 'Torso': torso_style, 'Arms': arm_style, 'Hands': hand_style, 'Legs': leg_style, 'Feet': foot_style,
            'Makeup': makeup_style}

HEAD_S, HEAD_PIVOT = 1.13, Vector((0, -0.012, 1.60))
HEAD_WX, HEAD_WY, HEAD_HZ = 1.065, 1.04, .91   # v2.9: a bit thinner face (v2.8: 1.12)

def part_name(bt, slot, idx):
    return 'Kit_%s_%s_%02d' % (bt, slot, idx)

def part_coords(bt, slot, idx, build='average', feet=None):
    """vertex positions of a part built on another body build / feet size (same topology, same vertex order)"""
    global FOOT_K
    set_build(build)
    fk0 = FOOT_K
    if feet:
        FOOT_K = feet
    try:
        mb = build_mb(bt, slot, idx)
        co = [v.co.copy() for v in mb.bm.verts]
        mb.bm.free()
    finally:
        FOOT_K = fk0
        set_build('average')
    return co

def build_part(bt, slot, idx, mats, arm, coll=None):
    return build_mb(bt, slot, idx).to_object(part_name(bt, slot, idx), mats, arm, coll=coll)

def build_mb(bt, slot, idx):
    key = KIT[bt][slot][idx - 1][0]
    mb = MB()
    if slot == 'Hair':
        build_head(mb, bt)
        hair_style(mb, bt, key)
    else:
        STYLE_FN[slot](mb, bt, key)
    if slot in ('Hair', 'Jaw', 'Makeup'):   # the whole head is modelled in 'head space' then scaled up about the chin
        head_xform(mb)
    return mb

def head_xform(mb):
    for v in mb.bm.verts:
        d = (v.co - HEAD_PIVOT) * HEAD_S
        v.co = HEAD_PIVOT + Vector((d.x * HEAD_WX, d.y * HEAD_WY, d.z * HEAD_HZ)) + Vector((0, 0, -0.030))

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
REST = {}   # v3.0: the arms' idle stance lives in stance_local(); Euler arm specs are deltas over it

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

# v3.1 stance (owner review 2026-09-26: "they're still not standing up vertically like the old school characters are ... get
# closer"). Measured against the male_b turnaround / Character.jpg / the character creator side by side (stance sheets):
# legs: the rest skeleton's legs slant back (ankle 8.5 cm behind the hip) -- the thighs swing 5.5 deg forward so each leg is
# straight (knee ~1 deg) and plumb under the hip, feet a hand apart, a touch of toe-out; spine: chest up (Spine2 back 2 deg,
# the chain hips -> neck base solved vertical by upright()); neck back 8 deg and the head nodded 13 deg so the head sits
# over the shoulders and the face looks level (not carried forward); shoulders drawn back 4 deg.
STANCE = {'LeftUpLeg': (-5.5, -1, 4), 'RightUpLeg': (-5.5, 1, -4), 'LeftLeg': (.5, 0, 0), 'RightLeg': (.5, 0, 0),
          'LeftFoot': (5, 1, 0), 'RightFoot': (5, -1, 0),
          'Spine1': (1, 0, 0), 'Spine2': (-2, 0, 0), 'Neck': (-8, 0, 0), 'Head': (13, 0, 0),
          'LeftShoulder': (0, 0, 4), 'RightShoulder': (0, 0, -4)}
# Arms (v3.1): hang close to vertical from the deltoid with a slight natural elbow bend (~10 deg forward), the loosely closed
# hands at the sides of the thighs, just off them (not held forward in front of the hips). Authored as absolute directions in
# the idle; stored as each bone's local rotation (stance_local), so an Euler arm spec in any clip is a delta over the stance
# (a walk swing pivots the arm at the shoulder) and a bone left out of a pose keeps its stance.
STANCE_ARM_AIM = {'LeftArm': (.48, .06, -.875), 'LeftForeArm': (.12, -.18, -.976), 'LeftHand': (.10, -.24, -.965)}
STANCE_ARM_AIM.update({k.replace('Left', 'Right'): (-v[0], v[1], v[2]) for k, v in list(STANCE_ARM_AIM.items())})
_STANCE_LOCAL = {}

def stance_local():
    """local (parent-frame) rotations of the arm bones in the idle stance"""
    if not _STANCE_LOCAL:
        pose = {k: ('aim', v) for k, v in STANCE_ARM_AIM.items()}
        rots = pose_rotations(None, upright(pose, to='Neck'))
        _STANCE_LOCAL.update({k: rots[B(k)] for k in STANCE_ARM_AIM})
    return _STANCE_LOCAL

def stance_flex_deg(side='Left'):
    a, f = Vector(STANCE_ARM_AIM[side + 'Arm']).normalized(), Vector(STANCE_ARM_AIM[side + 'ForeArm']).normalized()
    return math.degrees(a.angle(f))

def pose_rotations(arm, pose):
    """-> {bone: armature-space 3x3 delta R} honoring 'aim' via accumulated parent rotations."""
    acc, res = {}, {}
    for name, parent, head, tail, roll in BONES:
        short = name.split(':')[1]
        spec = pose.get(short)
        if short in STANCE and (spec is None or isinstance(spec[0], (int, float))):
            base = spec if spec is not None else (0, 0, 0)
            spec = tuple(a + b for a, b in zip(base, STANCE[short]))
        pacc = acc[parent] if parent else Matrix.Identity(3)
        if short in STANCE_ARM_AIM and (spec is None or isinstance(spec[0], (int, float))):
            R = Euler([math.radians(a) for a in (spec or (0, 0, 0))], 'XYZ').to_matrix() @ stance_local()[short]
        elif spec is None:
            R = Matrix.Identity(3)
        elif spec[0] == 'mat':      # v2.7: exact armature-space orientation (used for Bram's staff hand)
            R = pacc.inverted() @ spec[1]
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
    C['idle'] = (60, [   # v2.9: vertical spine (measured on the posed chain), a calm breath: chest up, shoulders a touch up
        (0, upright(P())),
        (30, upright(P(Spine1=(-1.5, 0, 0), Spine2=(-1, 0, 0), Head=(2.5, 0, 0), LeftArm=(1.5, -1, 0), RightArm=(1.5, 1, 0),
                       LeftForeArm=(-2.5, 0, 0), RightForeArm=(-2.5, 0, 0), loc=(0, 0, .004)))),   # v3.0: deltas over the stance
        (60, upright(P())),
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

    ready = P(RightArm=(-16, -2, 0), RightForeArm=(-22, 0, 0))   # v3.0: deltas over the stance (sword raised in front)
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
        (5, P(RightArm=A(-.46, .50, -.72), RightForeArm=A(-.04, -1, .05), Spine1=(0, 0, -14), LeftArm=A(.35, -.5, -.75),   # v3.0: wind-up clear of the hip
              LeftForeArm=A(0, -1, -.2))),
        (9, PP(lunge, RightArm=A(-.05, -1, .08), RightForeArm=A(0, -1, .05), Spine=(8, 0, 0), Spine1=(6, 0, 14),
               LeftArm=A(.5, .3, -.8), LeftForeArm=A(.2, .1, -.9), loc=(0, 0, -.05))),
        (13, PP(lunge, RightArm=A(-.08, -.95, -.05), RightForeArm=A(0, -1, 0), Spine=(7, 0, 0), Spine1=(5, 0, 12),
                LeftArm=A(.5, .3, -.8), LeftForeArm=A(.2, .1, -.9), loc=(0, 0, -.045))),
        (18, ready),
    ], False)
    ready2 = P(RightArm=(-14, -2, 0), LeftArm=(-14, 2, 0), RightForeArm=(-18, 0, 0), LeftForeArm=(-18, 0, 0))
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
    draw = P(LeftArm=A(.25, -.95, .12), LeftForeArm=A(.20, -1, .12),
             Spine1=(0, 0, -14), Head=(0, 0, 12), LeftUpLeg=(-8, 0, 0), RightUpLeg=(6, 0, 0))
    # v3.0: the string hand anchors in front of the right side of the chin (it used to sink into the chest), elbow out to the side
    arm_reach(draw, 'Right', Vector((-.13, -.25, 1.44)), (.25, -.15, .95), 0, pole=(-.9, .35, .25))
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
        (3, P(Spine=(-12, 0, 0), Spine1=(-8, 0, 0), Head=(-16, 0, 8), LeftArm=(-15, -12, 0), RightArm=(-15, 12, 0),
              LeftForeArm=(-22, 0, 0), RightForeArm=(-22, 0, 0), loc=(0, .035, -.01))),
        (6, P(Spine=(-6, 0, 0), Head=(-6, 0, 4), loc=(0, .02, 0))),
        (12, P()),
    ], False)
    down = dict(Hips=(-90, 0, 0), LeftUpLeg=(-12, 0, -4), LeftLeg=(22, 0, 0), LeftFoot=(28, 0, 0), RightUpLeg=(-3, 0, 6),
                RightLeg=(6, 0, 0), RightFoot=(35, 0, 0), LeftArm=(-20, -66, 0), RightArm=(-10, 62, 0),
                LeftForeArm=(-8, 0, 0), RightForeArm=(8, 0, 0), Spine1=(-4, 0, 0))
    C['death'] = (40, [
        (0, P()),
        (6, P(Spine=(-10, 0, 0), Head=(-15, 0, 0), loc=(0, .02, 0))),
        (14, PP(crouch(-38, 75), Spine=(15, 0, 0), Spine1=(8, 0, 0), Head=(20, 0, 0), LeftArm=(5, -4, 0), RightArm=(5, 4, 0))),
        (24, P(Hips=(-45, 0, 0), LeftUpLeg=(-30, 0, 0), LeftLeg=(55, 0, 0), RightUpLeg=(-38, 0, 0), RightLeg=(65, 0, 0),
               Spine1=(-5, 0, 0), Head=(10, 0, 0), LeftArm=(-25, -48, 0), RightArm=(-25, 48, 0), loc=(0, .18, -.55))),
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
    # v3.0: the resting arm eases 3 deg out while the chest turns with the gesture (it stays clear of skirts / peplums)
    C['talk'] = (48, [(f, upright(mirror_pose(P(RightArm=(0, 3, 0), **GEST_L[i % 4])))) for i, f in enumerate((0, 12, 24, 36))]
                 + [(48, upright(mirror_pose(P(RightArm=(0, 3, 0), **GEST_L[0]))))], True)
    C['wave'] = (40, [(0, upright(P()))] + [(8 + 6 * i, upright(mirror_pose(P(**WAVE_UP, LeftForeArm=fa)))) for i, fa in enumerate(WAVE_FA)] + [(40, upright(P()))], False)
    return C


# ------------------------------------------------------------------------------------------
# v3.1 EMOTES (owner 2026-09-26: "I want all the character emotes to work properly"): the classic emote tab's set, each our
# own animation of the idea, played once on the player from the Emotes tab (clip emote_<key>). Every emote starts and ends
# on the idle's first frame, so the runtime can cut in and out of it. Hands are placed with arm_reach on points carried by
# the body (a hand on the chin follows the head), so contacts stay put while the body moves.
# ------------------------------------------------------------------------------------------
EMOTES = ['yes', 'no', 'bow', 'angry', 'think', 'wave', 'shrug', 'cheer', 'beckon', 'laugh', 'jump_for_joy', 'yawn', 'dance', 'jig',
          'spin', 'headbang', 'cry', 'blow_kiss', 'panic', 'raspberry', 'clap', 'salute']

def _vadd(a, b):
    return tuple(x + y for x, y in zip(a, b))

def emote_clips():
    base = upright(P())
    SP0 = tuple(base.get('Spine', (0, 0, 0)))
    I0 = lambda: dict(base)

    def E(*dicts, **kw):
        """an emote pose: P() + the idle's own spine correction (+ any Spine delta given)"""
        d = {}
        for x in dicts:
            d.update(x)
        d.update(kw)
        d['Spine'] = _vadd(SP0, d.get('Spine', (0, 0, 0)))
        return P(**d)

    def pt(pose, bone, p):
        hd, acc = fk(pose)
        return hd[B(bone)] + acc[B(bone)] @ (Vector(p) - BHEAD[B(bone)])

    def dr(pose, bone, d):
        hd, acc = fk(pose)
        return acc[B(bone)] @ Vector(d)

    def hand(pose, side, bone, p, d, twist=0.0, pole=None):
        """put the hand's grip on a point carried by `bone` (given in the rest pose), pointing along d (rest frame of bone)"""
        arm_reach(pose, side, pt(pose, bone, p), dr(pose, bone, d), twist, pole)
        return pose

    def both(pose, bone, p, d, twist=0.0, pole=None):
        """both hands, mirrored (p / d / pole given for the left hand, x > 0)"""
        hand(pose, 'Left', bone, p, d, twist, pole)
        hand(pose, 'Right', bone, (-p[0], p[1], p[2]), (-d[0], d[1], d[2]), -twist, (-pole[0], pole[1], pole[2]) if pole else None)
        return pose

    def arms(pose, left, right=None):
        """absolute arm directions {Arm, ForeArm[, Hand]} for the left arm (+ mirrored or given right)"""
        for k, v in left.items():
            pose['Left' + k] = ('aim', v)
        right = right if right is not None else {k: (-v[0], v[1], v[2]) for k, v in left.items()}
        for k, v in right.items():
            pose['Right' + k] = ('aim', v)
        return pose

    C = {}
    # YES: three nods
    nod = lambda a: E(Head=(a, 0, 0), Neck=(a * .25, 0, 0))
    C['emote_yes'] = (36, [(0, I0()), (5, nod(16)), (10, nod(-3)), (15, nod(16)), (20, nod(-3)), (25, nod(12)), (30, nod(0)), (36, I0())], False)
    # NO: the head shakes side to side
    shake = lambda a: E(Head=(2, 0, a), Neck=(0, 0, a * .3))
    C['emote_no'] = (40, [(0, I0()), (6, shake(24)), (13, shake(-24)), (20, shake(22)), (27, shake(-18)), (33, shake(0)), (40, I0())], False)
    # BOW: a formal bow from the hips, the right hand across the belly, the left hand behind the back
    def bowp(k=1.0):
        b = E(Spine=(18 * k, 0, 0), Spine1=(10 * k, 0, 0), Spine2=(4 * k, 0, 0), Head=(6 * k, 0, 0), loc=(0, .02 * k, -.004 * k))
        hand(b, 'Right', 'Spine', (.03, -.215, 1.10), (1, -.1, -.15), 0, (-.85, .2, -.5))    # (carried by the belly's own bone)
        hand(b, 'Left', 'Spine', (-.03, .20, 1.10), (-1, .1, -.2), 0, (.85, .3, -.4))
        return b
    def bow_mid():   # on the way: the right hand in front of the hip, the left behind the other hip (well clear of the crotch)
        b = E(Spine=(4, 0, 0))
        hand(b, 'Right', 'Hips', (-.15, -.20, 1.03), (.8, -.3, -.5), 0, (-.9, .2, -.4))
        hand(b, 'Left', 'Hips', (.15, .17, 1.03), (-.8, .3, -.5), 0, (.9, .3, -.3))
        return b
    C['emote_bow'] = (56, [(0, I0()), (6, bow_mid()), (12, bowp(.35)), (20, bowp()), (38, bowp()), (45, bowp(.35)), (50, bow_mid()), (56, I0())], False)
    # ANGRY: leaning in, fists shaking in front of the chest
    def angry(up):
        a = E(Spine1=(6, 0, 0), Spine2=(2, 0, 0), Head=(10, 0, 0), Neck=(4, 0, 0))
        hand(a, 'Left', 'Spine2', (.15, -.25, 1.36 + .045 * up), (.05, -.85, .50), 0, (.9, .1, -.4))    # fists, knuckles forward
        hand(a, 'Right', 'Spine2', (-.15, -.25, 1.36 - .045 * up), (-.05, -.85, .50), 0, (-.9, .1, -.4))
        return a
    C['emote_angry'] = (48, [(0, I0()), (8, angry(1)), (13, angry(-1)), (18, angry(1)), (23, angry(-1)), (28, angry(1)), (33, angry(-1)),
                             (38, angry(0)), (48, I0())], False)
    # THINK: the right hand to the chin, the left arm across under the right elbow, head tilted
    def think(t=0.0):
        a = E(Head=(8 + 2 * t, 7 + 2 * t, -3), Spine1=(2, 0, 0))
        hand(a, 'Right', 'Head', (-.012, -.15, 1.545), (-.15, -.25, .95), 0, (-.3, -.35, -.9))
        hand(a, 'Left', 'Spine1', (-.07, -.235, 1.225), (-1, -.1, .15), 0, (.8, .15, -.55))
        return a
    C['emote_think'] = (60, [(0, I0()), (12, think()), (26, think(1)), (40, think(0)), (48, think(.5)), (60, I0())], False)
    # WAVE: the right hand raised and waving (the NPC wave, longer)
    fa = WAVE_FA[:3] + WAVE_FA[1:3] + WAVE_FA[1:]
    C['emote_wave'] = (48, [(0, I0())] + [(7 + 5 * i, mirror_pose(E(**dict(WAVE_UP, LeftForeArm=f)))) for i, f in enumerate(fa)] + [(48, I0())], False)
    # SHRUG: shoulders up, forearms out, palms up, head tilted
    def shrug(k=1.0, tilt=9):
        a = E(LeftShoulder=(0, -14 * k, 0), RightShoulder=(0, 14 * k, 0), Head=(0, tilt * k, 0), Spine2=(-2 * k, 0, 0))
        return arms(a, {'Arm': (.40, .06, -.91), 'ForeArm': (.55, -.80, .12), 'Hand': (.62, -.62, .45)})
    C['emote_shrug'] = (40, [(0, I0()), (9, shrug()), (16, shrug(1.1, 7)), (26, shrug(1.0, 8)), (40, I0())], False)
    # CHEER: a little dip, then both arms thrust up with a hop, twice
    up = {'Arm': (.36, -.04, .93), 'ForeArm': (.22, -.10, .97), 'Hand': (.18, -.14, .97)}
    fists = {'Arm': (.50, .10, -.86), 'ForeArm': (.22, -.30, .93), 'Hand': (.2, -.35, .91)}
    C['emote_cheer'] = (46, [(0, I0()), (7, arms(E(crouch(-8, 16)), fists)), (13, arms(E(Head=(-8, 0, 0), loc=(0, 0, .05)), up)),
                             (19, arms(E(Head=(-6, 0, 0)), up)), (24, arms(E(crouch(-5, 10)), fists)), (29, arms(E(Head=(-8, 0, 0), loc=(0, 0, .04)), up)),
                             (36, arms(E(Head=(-6, 0, 0)), up)), (40, arms(E(), fists)), (46, I0())], False)
    # BECKON: the right hand held out, curling "come here" three times
    def beckon(curl):
        a = E(Spine1=(3, 0, 0), Head=(4, 0, -6))
        a['RightArm'] = ('aim', (-.25, -.50, -.83))
        a['RightForeArm'] = ('aim', (-.12, -.78, .62))
        a['RightHand'] = ('aim', (-.06, .30, .95) if curl else (-.08, -.86, .50))
        return a
    C['emote_beckon'] = (46, [(0, I0()), (10, beckon(0)), (16, beckon(1)), (22, beckon(0)), (28, beckon(1)), (34, beckon(0)), (46, I0())], False)
    # LAUGH: leaning back, hands on the belly, shaking
    def laugh(k):
        a = E(Spine1=(-7 - 3 * k, 0, 0), Spine2=(-6, 0, 0), Head=(-14 - 4 * k, 0, 0), loc=(0, 0, -.006 * k))
        both(a, 'Spine', (.075, -.215, 1.10), (-.55, -.25, -.8), 0, (.9, .3, -.4))
        return a
    C['emote_laugh'] = (48, [(0, I0()), (8, laugh(0)), (12, laugh(1)), (16, laugh(0)), (20, laugh(1)), (24, laugh(0)), (28, laugh(1)),
                             (32, laugh(0)), (38, laugh(.5)), (48, I0())], False)
    # JUMP FOR JOY: crouch, spring up with the knees tucked and the arms up, land
    back = {'Arm': (.35, .45, -.82), 'ForeArm': (.25, .35, -.90)}
    tuck = lambda th, kn, z: dict(LeftUpLeg=(th, 0, 0), LeftLeg=(kn, 0, 0), LeftFoot=(-(th + kn) * .3, 0, 0),
                                  RightUpLeg=(th, 0, 0), RightLeg=(kn, 0, 0), RightFoot=(-(th + kn) * .3, 0, 0), loc=(0, 0, z))
    C['emote_jump_for_joy'] = (40, [(0, I0()), (7, arms(E(crouch(-22, 44)), back)), (12, arms(E(tuck(-30, 55, .14), Head=(-6, 0, 0)), up)),
                                    (17, arms(E(tuck(-42, 80, .21), Head=(-8, 0, 0)), up)), (22, arms(E(tuck(-12, 25, .10)), up)),
                                    (26, arms(E(crouch(-16, 32)), fists)), (33, arms(E(), {'Arm': (.46, .08, -.88), 'ForeArm': (.15, -.2, -.97)})),
                                    (40, I0())], False)
    # YAWN: a big stretch, arms up and out, head back; then a hand over the mouth
    stretch = {'Arm': (.62, .15, .77), 'ForeArm': (.50, .20, .84), 'Hand': (.45, .20, .87)}
    def cover(k=1.0):
        a = E(Head=(-6 * k, 0, 0), Spine2=(-2, 0, 0))
        hand(a, 'Right', 'Head', (-.005, -.15, 1.595), (.35, -.12, .93), 0, (-.8, -.3, -.5))
        return a
    C['emote_yawn'] = (60, [(0, I0()), (14, arms(E(Spine1=(-6, 0, 0), Spine2=(-6, 0, 0), Head=(-18, 0, 0), loc=(0, 0, .01)), stretch)),
                            (28, arms(E(Spine1=(-7, 0, 0), Spine2=(-7, 0, 0), Head=(-22, 0, 0), loc=(0, 0, .012)), stretch)),
                            (38, cover()), (50, cover(.6)), (60, I0())], False)
    # DANCE: side-to-side steps, hips swaying, arms swinging up and down
    def dance(s):   # s = +1: weight on the left, right knee in
        kn = dict(RightUpLeg=(-12, 0, 0), RightLeg=(24, 0, 0), RightFoot=(-12, 0, 0)) if s > 0 else \
            dict(LeftUpLeg=(-12, 0, 0), LeftLeg=(24, 0, 0), LeftFoot=(-12, 0, 0))
        a = E(kn, Hips=(0, 0, 8 * s), Spine1=(0, -6 * s, -6 * s), Head=(0, 5 * s, 4 * s), loc=(.04 * s, 0, -.01))
        hi = {'Arm': (.80, -.30, .50), 'ForeArm': (.20, -.45, .87)}
        lo = {'Arm': (.50, -.40, -.77), 'ForeArm': (.30, -.85, .44)}
        return arms(a, hi if s > 0 else lo, {k: (-v[0], v[1], v[2]) for k, v in (lo if s > 0 else hi).items()})
    C['emote_dance'] = (56, [(0, I0()), (8, dance(1)), (16, dance(-1)), (24, dance(1)), (32, dance(-1)), (40, dance(1)), (48, dance(-1)), (56, I0())], False)
    # JIG: hands on the hips, hopping from foot to foot, knees up
    def jig(s):
        kn = {} if s == 0 else ({'LeftUpLeg': (-38, 0, 0), 'LeftLeg': (68, 0, 0), 'LeftFoot': (-15, 0, 0)} if s > 0 else
                                {'RightUpLeg': (-38, 0, 0), 'RightLeg': (68, 0, 0), 'RightFoot': (-15, 0, 0)})
        a = E(kn, Spine1=(0, -3 * s, 0), Head=(0, 3 * s, 0), loc=(0, 0, .03 if s else -.012))
        both(a, 'Hips', (.225, -.01, 1.00), (-.15, -.35, -.92), 0, (.9, .45, .1))
        return a
    C['emote_jig'] = (48, [(0, I0()), (6, jig(1)), (12, jig(0)), (18, jig(-1)), (24, jig(0)), (30, jig(1)), (36, jig(0)), (42, jig(-1)), (48, I0())], False)
    # SPIN: arms out, a full turn on the spot
    out = {'Arm': (.95, -.10, -.30), 'ForeArm': (.95, -.15, -.20)}
    C['emote_spin'] = (36, [(0, I0()), (4, arms(E(), out)), (10, arms(E(Hips=(0, 0, 90)), out)), (16, arms(E(Hips=(0, 0, 180)), out)),
                            (22, arms(E(Hips=(0, 0, 270)), out)), (28, arms(E(Hips=(0, 0, 360)), out)), (36, I0())], False)
    # HEADBANG: the head and chest pumping to the beat, fists up
    def bang(d):
        a = E(Neck=(12, 0, 0), Head=(24, 0, 0), Spine1=(8, 0, 0), loc=(0, 0, -.01)) if d else E(Neck=(-6, 0, 0), Head=(-14, 0, 0), Spine1=(-2, 0, 0))
        return arms(a, {'Arm': (.48, .02, -.88), 'ForeArm': (.25, -.60, .76), 'Hand': (.2, -.6, .77)})
    C['emote_headbang'] = (40, [(0, I0()), (5, bang(1)), (10, bang(0)), (15, bang(1)), (20, bang(0)), (25, bang(1)), (30, bang(0)), (40, I0())], False)
    # CRY: head down, both hands at the eyes, sobbing
    def cry(k):
        a = E(Head=(18, 0, 0), Spine1=(8, 0, 0), Spine2=(4 + 4 * k, 0, 0), loc=(0, 0, -.008 * k))
        both(a, 'Head', (.05, -.14, 1.655), (-.15, -.35, .92), 0, (.5, -.3, -.8))
        return a
    C['emote_cry'] = (60, [(0, I0()), (10, cry(0)), (15, cry(1)), (20, cry(0)), (25, cry(1)), (30, cry(0)), (35, cry(1)), (40, cry(0)),
                           (48, cry(0)), (60, I0())], False)
    # BLOW KISS: the right hand to the lips, then thrown out forward, palm up
    def kiss1():
        a = E(Head=(3, 0, 0))
        hand(a, 'Right', 'Head', (-.01, -.145, 1.60), (.25, -.25, .93), 0, (-.8, -.2, -.5))
        return a
    kiss2 = lambda: arms(E(Head=(-4, 0, 0), Spine1=(2, 0, 0)), {}, {'Arm': (-.20, -.85, .25), 'ForeArm': (-.15, -.90, .35), 'Hand': (-.10, -.80, .60)})
    C['emote_blow_kiss'] = (50, [(0, I0()), (5, E(RightArm=(-30, 0, 0), RightForeArm=(-80, 0, 0))), (10, kiss1()), (18, kiss1()), (26, kiss2()),
                                 (36, kiss2()), (50, I0())], False)
    # PANIC: arms flailing over the head, head darting side to side, running in place
    def panic(s):
        kn = {'LeftUpLeg': (-26, 0, 0), 'LeftLeg': (44, 0, 0), 'LeftFoot': (-8, 0, 0)} if s > 0 else \
             {'RightUpLeg': (-26, 0, 0), 'RightLeg': (44, 0, 0), 'RightFoot': (-8, 0, 0)}
        a = E(kn, Head=(0, 0, 20 * s), Spine1=(0, 0, -6 * s), loc=(0, 0, .012))
        L1 = {'Arm': (.55, -.20, .80), 'ForeArm': (.10, .20, .97)}
        L2 = {'Arm': (.45, .10, .88), 'ForeArm': (.50, -.30, .80)}
        return arms(a, L1 if s > 0 else L2, {k: (-v[0], v[1], v[2]) for k, v in (L2 if s > 0 else L1).items()})
    C['emote_panic'] = (48, [(0, I0()), (5, panic(1)), (11, panic(-1)), (17, panic(1)), (23, panic(-1)), (29, panic(1)), (35, panic(-1)),
                             (41, panic(1)), (48, I0())], False)
    # RASPBERRY: leaning in, hands up by the ears, fingers waggling, head wagging
    def rasp(s):
        a = E(Spine1=(8, 0, 0), Head=(10, 0, 8 * s))
        both(a, 'Head', (.115, -.055, 1.665), (.05, -.45, .90), 20 * s, (.9, .2, -.3))   # thumbs at the ears, fingers waggling
        return a
    C['emote_raspberry'] = (48, [(0, I0()), (10, rasp(0)), (16, rasp(1)), (22, rasp(-1)), (28, rasp(1)), (34, rasp(-1)), (40, rasp(0)), (48, I0())], False)
    # CLAP: hands clapping in front of the chest
    def clap(open_):
        a = E(Head=(-2, 0, 0))
        both(a, 'Spine2', (.10 if open_ else .036, -.30, 1.30), (-.25, -.55, .80), 90, (.85, .2, -.5))
        return a
    C['emote_clap'] = (40, [(0, I0()), (8, clap(1)), (12, clap(0)), (16, clap(1)), (20, clap(0)), (24, clap(1)), (28, clap(0)), (32, clap(1)),
                            (40, I0())], False)
    # SALUTE: standing tall, the right hand to the brow, elbow out
    def salute():
        a = E(Spine2=(-3, 0, 0), Head=(-2, 0, 0))
        hand(a, 'Right', 'Head', (-.065, -.125, 1.725), (.60, -.30, .74), 0, (-1, .1, .1))
        return a
    lift = lambda: E(RightArm=(-38, 0, 0), RightForeArm=(-70, 0, 0))
    C['emote_salute'] = (48, [(0, I0()), (6, lift()), (12, salute()), (36, salute()), (42, lift()), (48, I0())], False)
    assert sorted(C) == sorted('emote_' + e for e in EMOTES), sorted(C)
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
    C['idle'] = (60, [(0, upright(PB())), (30, upright(PB(Spine1=(-1.5, 0, 0), Spine2=(-1, 0, 0), Head=(3, 0, -4), LeftForeArm=(-13, 0, 0),
                                                            loc=(0, 0, .004)))), (60, upright(PB()))], True)
    C['talk'] = (48, [(f, upright(PB(GEST_L[i % 4]))) for i, f in enumerate((0, 12, 24, 36))] + [(48, upright(PB(GEST_L[0])))], True)
    lc = dict(LeftUpLeg=(-24, 0, 0), LeftLeg=(6, 0, 0), LeftFoot=(-10, 0, 0), RightUpLeg=(18, 0, 0), RightLeg=(18, 0, 0),
              RightFoot=(12, 0, 0), Hips=(0, 0, -4), Spine=(3, 0, 0), loc=(0, 0, -.02))
    lp = dict(LeftUpLeg=(-2, 0, 0), LeftLeg=(4, 0, 0), RightUpLeg=(-14, 0, 0), RightLeg=(42, 0, 0), RightFoot=(6, 0, 0),
              Spine=(3, 0, 0), loc=(0, 0, .01))
    C['walk'] = (28, bram_walk_clip(28), True)   # v2.7: grounded gait + walking-stick staff
    C['wave'] = (40, [(0, upright(PB()))] + [(8 + 6 * i, upright(PB(WAVE_UP, LeftForeArm=fa))) for i, fa in enumerate(WAVE_FA)] + [(40, upright(PB()))], False)
    return C

# ==========================================================================================
# v2.7 ANIMATION PASS -- FK / two-bone IK, grounded gait generator, re-authored tool clips
# ==========================================================================================
# Runtime (src/game3_systems.js moveSpeed: walk 2.4, run 4.2 m/s). v2.7b contract, agreed with the runtime owner:
#   walk clip authored natively for 2.4 m/s at timeScale 1.0  -> play with timeScale = moveSpeed / 2.4
#   run  clip authored natively for 4.2 m/s at timeScale 1.0  -> play with timeScale = moveSpeed / 4.2 while running
GAME_RUN_SPEED, GAME_WALK_SPEED = 4.2, 2.4
GAIT_REPORT = {}

def fk(pose):
    """posed armature-space bone heads + accumulated rotations for a pose dict (same model as pose_rotations/key_pose)"""
    rots = pose_rotations(None, pose)
    acc, head = {}, {}
    loc = Vector(pose.get('loc', (0, 0, 0)))
    for name, parent, h, t, roll in BONES:
        if parent is None:
            acc[name] = rots[name]
            head[name] = Vector(h) + loc
        else:
            acc[name] = acc[parent] @ rots[name]
            head[name] = head[parent] + acc[parent] @ (Vector(h) - BHEAD[parent])
    return head, acc

def two_bone(root, L1, L2, target, pole):
    d = target - root
    dist = d.length
    reach = (L1 + L2) * .9995
    over = max(0.0, dist - reach)
    dist = min(max(dist, 1e-4), reach)
    u = d.normalized()
    a = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist)
    h = math.sqrt(max(0.0, L1 * L1 - a * a))
    perp = (pole - u * pole.dot(u))
    perp = perp.normalized() if perp.length > 1e-6 else Vector((0, -1, 0))
    mid = root + u * a + perp * h
    return mid, root + u * dist, over

FOOT_REST = (BTAIL[B('LeftFoot')] - BHEAD[B('LeftFoot')]).normalized()
TOE_REST = (BTAIL[B('LeftToeBase')] - BHEAD[B('LeftToeBase')]).normalized()

def leg_ik(pose, side, ankle, pitch=0.0):
    """aim thigh/shin so the ankle lands on `ankle`; pitch = foot toe-up (+) / heel-up (-) in degrees"""
    head, acc = fk(pose)
    sx = 1 if side == 'Left' else -1
    H = head[B(side + 'UpLeg')]
    L1 = (BHEAD[B(side + 'Leg')] - BHEAD[B(side + 'UpLeg')]).length
    L2 = (BHEAD[B(side + 'Foot')] - BHEAD[B(side + 'Leg')]).length
    knee, ank, over = two_bone(H, L1, L2, Vector(ankle), Vector((sx * .10, -1, 0)))
    pose[side + 'UpLeg'] = ('aim', tuple(knee - H))
    pose[side + 'Leg'] = ('aim', tuple(ank - knee))
    Rf = Matrix.Rotation(math.radians(-pitch), 3, 'X')
    pose[side + 'Foot'] = ('aim', tuple(Rf @ FOOT_REST))
    pose[side + 'ToeBase'] = ('aim', tuple((Rf if pitch > 0 else Matrix.Identity(3)) @ TOE_REST))
    return over

def foot_ankle(g, pitch):
    """ankle position for a foot whose ground anchor is g (the point under the ankle), rolled about the heel (toe-up)
    or the ball (heel-up) -- the pivot stays fixed on the ground, so a rolling foot never slides"""
    g = Vector(g)
    if abs(pitch) < 1e-6:
        return g + Vector((0, 0, .12))
    R = Matrix.Rotation(math.radians(-pitch), 3, 'X')
    if pitch > 0:
        return g + Vector((0, .05, 0)) + R @ Vector((0, -.05, .12))
    return g + Vector((0, -.18, 0)) + R @ Vector((0, .18, .12))

def gait_clip(name, frames, speed, duty, lift, drop, bob, front, p_on, p_off, arm_swing, fore, lean, twist, foot_x=.14,
              kick=0.0, base=None, bob_phase=0.0, head_counter=.6, fore_swing=8.0, hips_pitch=0.0, arms=True,
              sway=0.0, roll=0.0, sh_twist=None, head_stab=0.0, osrs=None, swing_sides=('Left', 'Right'), lean_cap=None):
    """grounded in-place cycle: the stance foot's ground pivot moves back at exactly `speed` (clip time) while the
    pelvis bobs; the swing foot arcs forward; arms swing opposite the legs; spine counter-twists."""
    T = frames / FPS
    Ts = duty * T
    keys = []
    worst = 0.0
    flat_samples = {}
    for f in range(frames + 1):
        t = (f % frames) / frames
        c = math.cos(2 * math.pi * t)
        kw = dict(base or {})
        if osrs:               # v2.9 walk: the simple readable 2004 cycle -- no sway / roll, upright, head steady
            kw.update(Hips=(0, 0, -twist * c), Spine=(0, 0, twist * 1.6 * c), Head=(0, 0, -twist * .6 * c),
                      loc=(0, 0, -drop - bob * math.cos(4 * math.pi * (t - bob_phase))))
        elif sh_twist is None:   # v2.7 model (run, Bram)
            kw.update(Spine=(lean, 0, twist * .8 * c), Spine1=(0, 0, twist * .6 * c), Head=(-lean * head_counter, 0, -twist * .5 * c),
                      Hips=(hips_pitch, 0, -twist * c),
                      loc=(0, 0, -drop - bob * math.cos(4 * math.pi * (t - bob_phase))))
        else:                  # v2.8 walk: hip sway + roll, shoulders counter-rotating, head held steady, upright
            cs = math.cos(2 * math.pi * (t - duty / 2))   # +1 = weight over the left foot (left mid-stance)
            hy, sy, hr = -twist * c, sh_twist * c, -roll * cs   # pelvis yaw, net shoulder yaw (opposite), pelvis roll (swing hip drops)
            kw.update(Hips=(hips_pitch, hr, hy),
                      Spine=(lean, -hr * .55, (sy - hy) * .45), Spine1=(0, -hr * .30, (sy - hy) * .35), Spine2=(0, -hr * .15, (sy - hy) * .20),
                      Neck=(0, 0, -sy * .5 * head_stab), Head=(-lean * head_counter, 0, -sy * .5 * head_stab),
                      loc=(sway * cs, 0, -drop - bob * math.cos(4 * math.pi * (t - bob_phase))))
        sf = stance_flex_deg()
        if arms and not osrs:   # v3.0: Euler arm specs are deltas over the stance (whose elbow is already bent ~sf deg)
            kw.update(LeftArm=(arm_swing * c, -3, 0), RightArm=(-arm_swing * c, 3, 0),
                      LeftForeArm=(-(fore - sf + fore_swing * max(0.0, -c)), 0, 0), RightForeArm=(-(fore - sf + fore_swing * max(0.0, c)), 0, 0))
        if arms and osrs:      # arms swing at the sides in a plane parallel to the body's midline (never across the body)
            # v3.0: the bent stance arm pivots at the shoulder (Euler deltas over the stance): swing forward / back, a little
            # more elbow bend on the forward swing, and a touch of abduction on the back swing so the hand clears the hip
            abd, flex = osrs
            for side in swing_sides:
                sx = 1 if side == 'Left' else -1
                sw = -arm_swing * c * sx                      # + = forward; the left arm is back when the left foot lands
                back = max(0.0, -sw) / max(1e-6, arm_swing)
                kw[side + 'Arm'] = (-sw, -sx * abd * back, 0)
                kw[side + 'ForeArm'] = (-(flex + fore_swing * max(0.0, sw) / max(1e-6, arm_swing)), 0, 0)
        pose = P(**kw)
        for side, off in (('Left', 0.0), ('Right', .5)):
            sx = 1 if side == 'Left' else -1
            ph = (t + off) % 1.0
            yF = .02 - front
            if ph < duty:
                sp = ph / duty
                gy = yF + speed * Ts * sp
                pitch = p_on * (1 - sp / .12) if sp < .12 else (p_off * (sp - .55) / .45 if sp > .55 else 0.0)
                ank = foot_ankle((sx * foot_x, gy, 0), pitch)
                if .12 <= sp <= .55:
                    flat_samples.setdefault(side, []).append((f, sp))
            else:
                sw = (ph - duty) / (1 - duty)
                a0 = foot_ankle((sx * foot_x, yF + speed * Ts, 0), p_off)
                a1 = foot_ankle((sx * foot_x, yF, 0), p_on)
                e = sw * sw * (3 - 2 * sw)
                ank = Vector((sx * foot_x, a0.y + (a1.y - a0.y) * e + kick * math.sin(math.pi * sw) * (1 - sw),
                              a0.z + (a1.z - a0.z) * sw + lift * math.sin(math.pi * sw) ** .9))
                pitch = p_off + (p_on - p_off) * e
            worst = max(worst, leg_ik(pose, side, ank, pitch) if ph < duty else 0.0)
            if ph >= duty:
                leg_ik(pose, side, ank, pitch)
        if lean_cap is not None:   # v2.9: measured on the posed chain (hips -> head)
            upright(pose, lean_cap[0], cap=lean_cap[1])
        keys.append((f, pose))
    # independent slide check: the achieved (FK) ankle of the flat stance foot must move back at exactly `speed`
    speeds = []
    for side, smp in flat_samples.items():
        smp.sort()
        for (fa, _), (fb, _) in zip(smp, smp[1:]):
            if fb == fa + 1 and fb < len(keys):
                ya = fk(keys[fa][1])[0][B(side + 'Foot')].y
                yb = fk(keys[fb][1])[0][B(side + 'Foot')].y
                speeds.append((yb - ya) * FPS)
    def knee_flex(pose, side):
        hd, _ = fk(pose)
        a, b, c_ = hd[B(side + 'UpLeg')], hd[B(side + 'Leg')], hd[B(side + 'Foot')]
        return math.degrees((b - a).angle(c_ - b, 0.0))
    kc, km = [], []
    for f_, pose_ in keys[:frames]:
        for side, off in (('Left', 0.0), ('Right', .5)):
            ph = ((f_ % frames) / frames + off) % 1.0
            if ph < 1.0 / frames - 1e-9:
                kc.append(knee_flex(pose_, side))
            if abs(ph - duty * .5) < .5 / frames + 1e-9:
                km.append(knee_flex(pose_, side))
    tilts = [chain_tilt(p_) for _, p_ in keys[:frames]]
    GAIT_REPORT[name] = {'frames': frames, 'clip_seconds': round(T, 3), 'ground_speed_clip_mps': speed,
                         'spine_chain_forward_tilt_deg': [round(min(tilts), 2), round(max(tilts), 2)],
                         'knee_flex_at_contact_deg': round(sum(kc) / max(1, len(kc)), 1), 'knee_flex_mid_stance_deg': round(sum(km) / max(1, len(km)), 1),
                         'measured_planted_foot_speed_mps': round(sum(speeds) / max(1, len(speeds)), 3),
                         'max_planted_speed_error_mps': round(max((abs(v - speed) for v in speeds), default=0.0), 4),
                         'stride_m': round(speed * T, 3), 'step_m': round(speed * T / 2, 3), 'duty': duty,
                         'max_stance_reach_error_m': round(worst, 4)}
    return keys

def chain_tilt(pose, to='Head'):
    """forward tilt (deg) of the posed spine chain: hips joint -> head joint (neck top), + = leaning forward.
    v3.0: to='Neck' measures the spine alone (hips -> neck base), so a head carried a touch forward is not 'lean'."""
    hd, _ = fk(pose)
    d = hd[B(to)] - hd[B('Hips')]
    return math.degrees(math.atan2(-d.y, d.z))

UPRIGHT_TO = 'Neck'   # v3.0: the spine chain (hips -> neck base) is vertical; the neck carries the head a touch forward

def upright(pose, target=0.0, cap=False, to=None):
    """v2.9: set the Spine pitch so the posed hips -> head chain leans exactly `target` degrees (the rest skeleton itself
    leans ~4 deg forward). cap=True only pulls it back when it leans MORE than target."""
    to = to or UPRIGHT_TO
    t = chain_tilt(pose, to)
    if cap and t <= target:
        return pose
    sp = pose.get('Spine', (0, 0, 0))
    sp = tuple(sp) if sp and isinstance(sp[0], (int, float)) else (0, 0, 0)
    for _ in range(6):
        if abs(t - target) < .02:
            break
        pose['Spine'] = (sp[0] + 1.0, sp[1], sp[2])
        g = chain_tilt(pose, to) - t
        sp = (sp[0] - (t - target) / (g if abs(g) > 1e-4 else 1.0), sp[1], sp[2])
        pose['Spine'] = sp
        t = chain_tilt(pose, to)
    return pose

REACH_ERR = [0.0]
GRIP_REST = {'Right': Vector((-.264, .037, .896)), 'Left': Vector((.264, .037, .896))}   # hand bone local (0, .03, .04): where the runtime attaches a held tool
HAND_REST_DIR = {sd: (BTAIL[B(sd + 'Hand')] - BHEAD[B(sd + 'Hand')]).normalized() for sd in ('Left', 'Right')}

def hand_rot(side, direction, twist=0.0):
    """armature-space hand rotation (relative to rest): the hand points along `direction`, rolled `twist` deg about it"""
    d = Vector(direction).normalized()
    R = HAND_REST_DIR[side].rotation_difference(d).to_matrix()
    return Matrix.Rotation(math.radians(twist), 3, d) @ R

def arm_reach(pose, side, grip, direction, twist=0.0, pole=None):
    """v2.9: two-bone arm IK that puts the hand's GRIP (the runtime's tool attach point) exactly on `grip`, the hand pointing
    along `direction`. The hand bones' rest is untouched."""
    sx = 1 if side == 'Left' else -1
    Rh = hand_rot(side, direction, twist)
    W = BHEAD[B(side + 'Hand')]
    wrist = Vector(grip) - Rh @ (GRIP_REST[side] - W)
    head, acc = fk(pose)
    S = head[B(side + 'Arm')]
    L1 = (BHEAD[B(side + 'ForeArm')] - BHEAD[B(side + 'Arm')]).length
    L2 = (W - BHEAD[B(side + 'ForeArm')]).length
    elbow, wr, over = two_bone(S, L1, L2, wrist, Vector(pole) if pole else Vector((sx * .75, .35, -.55)))
    REACH_ERR[0] = max(REACH_ERR[0], over)
    pose[side + 'Arm'] = ('aim', tuple(elbow - S))
    pose[side + 'ForeArm'] = ('aim', tuple(wr - elbow))
    pose[side + 'Hand'] = ('mat', Rh)
    return over

def grip_of(pose, side='Right'):
    hd, acc = fk(pose)
    return hd[B(side + 'Hand')] + acc[B(side + 'Hand')] @ (GRIP_REST[side] - BHEAD[B(side + 'Hand')])

def best_gait(name, frames, speed, duty, **kw):
    """pick the landing offset (front) and pelvis drop that keep the stance foot exactly on the ground (smallest reach
    error, then the highest pelvis = straightest legs)"""
    best = None
    for drop in [kw['drop'] + .005 * k for k in range(0, 12)]:   # v2.8: finer search (straightest feasible legs)
        feasible = []
        for fi in range(8, 50, 2):
            k2 = dict(kw, drop=drop, front=fi / 100.0)
            gait_clip(name, frames, speed, duty, **k2)
            wv = GAIT_REPORT[name]['max_stance_reach_error_m']
            if wv < .001:
                feasible.append(k2)
            if best is None or wv < best[0] - 1e-4:
                best = (wv, k2)
        if feasible:   # centre the step under the hips: middle of the feasible landing range
            best = (0.0, feasible[len(feasible) // 2])
            break
    keys = gait_clip(name, frames, speed, duty, **best[1])
    GAIT_REPORT[name].update(front_m=best[1]['front'], pelvis_drop_m=round(best[1]['drop'], 3))
    return keys

def v27_clips():
    """re-authored clips (walk, run, chop, mine, net, cook); the rest of clip_defs() is kept"""
    C = {}
    # WALK: modest step (~.70 m), fairly straight legs, flat-ish feet with heel-strike / toe-off roll, upright, small bob
    # v2.9 WALK (OSRS-like): compact 0.64 m step, straight-ish legs, arms swinging at the sides, no sway / roll, minimal bob,
    # head steady, vertical spine. Slide-free at 2.4 m/s at timeScale 1 (15 frames = 0.5 s, 1.20 m stride, 0.60 m step).
    C['walk'] = (15, best_gait('walk', 15, GAME_WALK_SPEED, .58, lift=.045, drop=.005, bob=.012, front=.24, p_on=10, p_off=-22,
                                arm_swing=20, fore=0, lean=0, twist=2.5, foot_x=.13, bob_phase=0.0, osrs=(10.0, 0.0), fore_swing=10,
                                lean_cap=(0.0, False)), True)
    # RUN: longer step, slight forward lean, arms bent ~90 deg pumping, moderate foot lift, brief flight
    C['run'] = (16, best_gait('run', 16, GAME_RUN_SPEED, .38, lift=.12, drop=.070, bob=.020, front=.20, p_on=8, p_off=-34,
                               arm_swing=34, fore=88, lean=3, twist=7, foot_x=.13, kick=.09, bob_phase=.19, head_counter=1.0,
                               fore_swing=6, hips_pitch=1, lean_cap=(2.0, True)), True)   # v3.1: upright run, never more than 2 deg of lean
    stance = dict(LeftUpLeg=(-12, 0, 0), LeftLeg=(8, 0, 0), LeftFoot=(4, 0, 0), RightUpLeg=(7, 0, 0), RightLeg=(4, 0, 0), RightFoot=(-11, 0, 0))
    guard = dict(LeftArm=A(.40, -.42, -.81), LeftForeArm=A(.10, -.86, -.50))
    # CHOP: over the right shoulder -> down and forward to waist height (tree contact) -> small follow-through -> recover
    wind = PP(stance, guard, RightArm=A(-.55, .10, .83), RightForeArm=A(.10, .55, .83), RightHand=A(.05, .80, .60),
              Spine1=(-4, 0, -16), Spine2=(0, 0, -6), Head=(0, 0, 8))
    hit = PP(stance, guard, RightArm=A(-.24, -.72, -.65), RightForeArm=A(-.06, -.82, -.57), RightHand=A(-.04, -.50, -.87),
             Spine=(6, 0, 0), Spine1=(4, 0, 12), Spine2=(0, 0, 4), loc=(0, 0, -.018))
    follow = PP(stance, guard, RightArm=A(-.13, -.62, -.77), RightForeArm=A(.00, -.66, -.75), RightHand=A(.00, -.30, -.95),
                Spine=(7, 0, 0), Spine1=(5, 0, 16), Spine2=(0, 0, 6), loc=(0, 0, -.022))
    lift_ = PP(stance, guard, RightArm=A(-.45, -.35, .45), RightForeArm=A(-.05, .10, .99), RightHand=A(0, .45, .89), Spine1=(0, 0, -6))
    C['chop'] = (30, [(0, wind), (5, wind), (10, hit), (13, follow), (19, follow), (25, lift_), (30, wind)], True)
    # MINE: pick raised overhead (both hands, each on its own side) -> strike down to rock height -> recoil -> lift
    up = PP(RightArm=A(-.30, .08, .95), RightForeArm=A(-.04, .38, .92), RightHand=A(0, .62, .78),
            LeftArm=A(.30, .08, .95), LeftForeArm=A(.04, .38, .92), LeftHand=A(0, .62, .78), Spine1=(-8, 0, 0), Head=(-6, 0, 0))
    strike = PP(crouch(-18, 32), RightArm=A(-.14, -.62, -.77), RightForeArm=A(-.07, -.70, -.71), RightHand=A(0, -.66, -.75),
                LeftArm=A(.14, -.62, -.77), LeftForeArm=A(.07, -.70, -.71), LeftHand=A(0, -.66, -.75),
                Spine=(12, 0, 0), Spine1=(14, 0, 0), Head=(-12, 0, 0))
    recoil = PP(crouch(-15, 27), RightArm=A(-.15, -.68, -.72), RightForeArm=A(-.07, -.78, -.62), RightHand=A(0, -.60, -.80),
                LeftArm=A(.15, -.68, -.72), LeftForeArm=A(.07, -.78, -.62), LeftHand=A(0, -.60, -.80),
                Spine=(10, 0, 0), Spine1=(11, 0, 0), Head=(-10, 0, 0))
    midr = PP(crouch(-6, 10), RightArm=A(-.24, -.55, .30), RightForeArm=A(-.06, -.05, .99), RightHand=A(0, .30, .95),
              LeftArm=A(.24, -.55, .30), LeftForeArm=A(.06, -.05, .99), LeftHand=A(0, .30, .95), Spine=(4, 0, 0))
    C['mine'] = (30, [(0, up), (5, up), (11, strike), (14, recoil), (19, recoil), (25, midr), (30, up)], True)
    # NET (fishing): hold low forward -> lift -> cast forward and down into the water -> hold -> draw back
    nb = dict(crouch(-8, 14), Spine=(8, 0, 0))
    hold = PP(nb, RightArm=A(-.15, -.72, -.68), RightForeArm=A(-.05, -.86, -.51), LeftArm=A(.15, -.72, -.68), LeftForeArm=A(.05, -.86, -.51))
    raise_ = PP(nb, RightArm=A(-.22, -.48, .32), RightForeArm=A(-.05, -.10, .99), LeftArm=A(.22, -.48, .32), LeftForeArm=A(.05, -.10, .99),
                Spine1=(-6, 0, 0))
    cast_ = PP(crouch(-18, 32), Spine=(16, 0, 0), RightArm=A(-.14, -.88, -.45), RightForeArm=A(-.05, -.90, -.43),
               LeftArm=A(.14, -.88, -.45), LeftForeArm=A(.05, -.90, -.43))
    soak = PP(crouch(-18, 32), Spine=(16, 0, 0), RightArm=A(-.14, -.80, -.58), RightForeArm=A(-.05, -.82, -.57),
              LeftArm=A(.14, -.80, -.58), LeftForeArm=A(.05, -.82, -.57))
    C['net'] = (48, [(0, hold), (10, raise_), (18, cast_), (24, soak), (38, soak), (48, hold)], True)
    # COOK / use: reach forward at waist height over the fire, small alternating stir
    cb = dict(crouch(-12, 22), Spine=(14, 0, 0), Head=(-4, 0, 0))
    st_ = [PP(cb, RightArm=A(-.16, -.72, -.67), RightForeArm=A(-.04 + d, -.92, -.38 + e), LeftArm=A(.18, -.70, -.69), LeftForeArm=A(.06, -.92, -.38))
           for d, e in ((0, 0), (.08, .04), (0, .08), (-.06, .04))]
    C['cook'] = (36, [(0, st_[0]), (9, st_[1]), (18, st_[2]), (27, st_[3]), (36, st_[0])], True)
    C.update(v29_skill_clips())   # v2.9: firemake (new), cook and net re-authored
    return C

def v29_skill_clips():
    """v2.9: firemake (kneel, strike the tinderbox at the logs), cook (hold the fish over the fire / range and turn it) and
    net (a clear two-handed cast). The right hand's GRIP -- the runtime's tool attach point -- is solved onto its target."""
    C = {}
    # ---- FIREMAKE: kneel on the right knee, logs on the ground in front, right hand strikes the tinderbox down at them
    def kneel(**kw):
        p_ = P(Spine=(38, 0, -8), Spine1=(8, 0, -4), Spine2=(0, 0, 0), Head=(-12, 0, -6), loc=(0, 0, -.46), **kw)
        leg_ik(p_, 'Left', Vector((.15, -.24, .12)), 0.0)
        leg_ik(p_, 'Right', Vector((-.13, .40, .19)), -48.0)
        arm_reach(p_, 'Left', Vector((.16, -.40, .56)), (0, -.55, -.83), pole=(.8, .3, -.5))
        return p_
    strike = []
    for g, d, tw in (((-.12, -.38, .47), (0, -.35, -.94), 0), ((-.085, -.415, .335), (0, -.55, -.83), 10), ((-.09, -.42, .36), (0, -.50, -.86), 6),
                     ((-.13, -.36, .52), (0, -.30, -.95), -4)):
        p_ = kneel()
        arm_reach(p_, 'Right', Vector(g), d, tw, pole=(-.85, .25, -.45))
        strike.append(p_)
    up, hit, bounce, high = strike
    C['firemake'] = (30, [(0, up), (5, hit), (7, bounce), (13, high), (19, hit), (21, bounce), (30, up)], True)
    # ---- COOK: stand close, fish held out over the fire / range, turned over and back
    def cook(tw, g):
        p_ = P(**dict(crouch(-6, 11), Spine=(22, 0, 0), Head=(-4, 0, 0)))
        arm_reach(p_, 'Right', Vector(g), (0, -.92, -.40), tw, pole=(-.8, .4, -.45))
        arm_reach(p_, 'Left', Vector((.21, -.20, .92)), (.1, -.5, -.86), pole=(.8, .4, -.4))
        return p_
    C['cook'] = (40, [(0, cook(0, (-.10, -.42, .94))), (10, cook(70, (-.09, -.43, .95))), (20, cook(140, (-.10, -.42, .94))),
                      (30, cook(70, (-.11, -.41, .95))), (40, cook(0, (-.10, -.42, .94)))], True)
    # ---- NET: both hands on the net -- raise it overhead, cast it forward and down with both arms, let it soak, draw it in
    def net(gr, gl, dr, dl, **kw):
        p_ = P(**kw)
        arm_reach(p_, 'Right', Vector(gr), dr, pole=(-.8, .3, -.5))
        arm_reach(p_, 'Left', Vector(gl), dl, pole=(.8, .3, -.5))
        return p_
    hold = net((-.10, -.29, .96), (.10, -.29, .98), (.15, -.7, -.7), (-.15, -.7, -.7), Spine=(4, 0, 0))
    wind = net((-.11, -.16, 1.60), (.11, -.16, 1.62), (.1, -.2, .97), (-.1, -.2, .97), Spine=(-7, 0, 0), Head=(-6, 0, 0))
    cast = net((-.10, -.56, 1.00), (.10, -.56, 1.02), (.1, -.97, -.2), (-.1, -.97, -.2), **dict(crouch(-14, 24), Spine=(24, 0, 0), Head=(4, 0, 0)))
    low = net((-.10, -.445, .875), (.10, -.445, .895), (.1, -.8, -.6), (-.1, -.8, -.6), **dict(crouch(-14, 24), Spine=(26, 0, 0), Head=(6, 0, 0)))
    draw = net((-.12, -.31, .95), (.12, -.31, .97), (.15, -.6, -.78), (-.15, -.6, -.78), **dict(crouch(-6, 10), Spine=(6, 0, 0)))
    C['net'] = (48, [(0, hold), (10, wind), (17, cast), (22, low), (36, low), (44, draw), (48, hold)], True)
    return C

def bram_walk_clip(frames=28, speed=1.30):
    """Guide Bram's walk: the same grounded gait (slower, shorter step) with the staff used as a walking stick -- planted on
    alternate steps (while planted its tip stays fixed on the ground), then lifted and swung forward. The staff is rigid in
    his right hand; the hand orientation and the arm (IK) are solved so the tip lands exactly on its target."""
    keys = best_gait('bram_walk', frames, speed, .60, lift=.045, drop=.005, bob=.010, front=.20, p_on=10, p_off=-20,
                     arm_swing=14, fore=0, lean=0, twist=2, foot_x=.13, base=PB(), osrs=(6.0, 0.0), fore_swing=8,
                     swing_sides=('Left',), lean_cap=(0.0, False))
    head0, acc0 = fk(PB())
    RH = B('RightHand')
    W0, Hn0 = BHEAD[RH], BTAIL[RH]
    g_rest = W0 + (Hn0 - W0) * .40 - W0                      # grip offset from the wrist, rest space
    G0 = head0[RH] + acc0[RH] @ g_rest                        # idle grip (the staff is vertical there, tip on the ground)
    Ls = G0.z
    L1 = (BHEAD[B('RightForeArm')] - BHEAD[B('RightArm')]).length
    L2 = (BHEAD[RH] - BHEAD[B('RightForeArm')]).length
    T = frames / FPS
    plant = .5
    yT0 = G0.y - .30
    out, tip_err = [], 0.0
    for f, pose in keys:
        t = (f % frames) / frames
        if t < plant:
            tip = Vector((G0.x, yT0 + speed * T * t, 0.0))
        else:
            sw = (t - plant) / (1 - plant)
            e = sw * sw * (3 - 2 * sw)
            tip = Vector((G0.x, yT0 + speed * T * plant * (1 - e), .07 * math.sin(math.pi * sw)))
        gy = G0.y + .04 * math.sin(2 * math.pi * t)
        sphi = clamp((tip.y - gy) / Ls, -.8, .8)
        grip = Vector((G0.x, gy, tip.z + Ls * math.sqrt(1 - sphi * sphi)))
        sdir = (tip - grip).normalized()
        Rrel = Vector((0, 0, -1)).rotation_difference(sdir).to_matrix()
        acc_hand = Rrel @ acc0[RH]
        wrist = grip - acc_hand @ g_rest
        head, acc = fk(pose)
        S = head[B('RightArm')]
        elbow, wr, over = two_bone(S, L1, L2, wrist, Vector((-.35, .85, -.35)))
        pose['RightArm'] = ('aim', tuple(elbow - S))
        pose['RightForeArm'] = ('aim', tuple(wr - elbow))
        pose['RightHand'] = ('mat', acc_hand)
        h2, a2 = fk(pose)
        real_tip = h2[RH] + a2[RH] @ g_rest + (a2[RH] @ acc0[RH].inverted() @ Vector((0, 0, -1))) * Ls
        if t < plant:
            tip_err = max(tip_err, (real_tip - tip).length)
        out.append((f, pose))
    GAIT_REPORT['bram_walk']['staff_tip_error_m'] = round(tip_err, 4)
    return out

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
HAND_HALF = .032          # v3.0: hand half-thickness (centre -> surface) for the thigh surface gap

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
                # v3.0: surface gap between the hand and the NEAREST thigh (either leg), measured on the posed thigh segment
                for lsd in ('Left', 'Right'):
                    ul, lg = arm.pose.bones[B(lsd + 'UpLeg')], arm.pose.bones[B(lsd + 'Leg')]
                    a = to_pelvis @ ul.head
                    b = to_pelvis @ lg.head
                    ab = b - a
                    t = clamp((c - a).dot(ab) / ab.length_squared)
                    r_th = .125 - .035 * t   # thigh + trouser radius, hip -> knee
                    w['min_hand_thigh_gap'] = min(w.get('min_hand_thigh_gap', 9.0), (c - (a + ab * t)).length - r_th - HAND_HALF)
                if .60 < c.z < 1.0 and abs(c.y - .03) < .16:   # beside the thigh: horizontal gap to the thigh's outer line
                    w['min_outside_thigh'] = min(w['min_outside_thigh'], c.x * sx - (HIP_X['A'] + .105))
                if name == 'idle':
                    w['idle_hand_x_max'] = max(w.get('idle_hand_x_max', 0.0), c.x * sx)
                    w['idle_hand_y_max'] = max(w.get('idle_hand_y_max', -9.0), c.y)
        res[name] = {k: (round(v, 4) if isinstance(v, float) else v) for k, v in w.items()}
    arm.animation_data.action = None
    return res

def assert_hands(report, label):
    bad = {n: r for n, r in report.items()   # (an emote may bring a hand across the body: bow, think, clap, cry, yawn)
           if r['min_crotch_dist'] < HAND_MIN_CROTCH or (r['min_side_x'] < 0.0 and not n.startswith('emote_')) or r['between_legs_frames'] > 0}
    print('[HANDS] %s' % label, json.dumps(report))
    assert not bad, 'hands enter the crotch / cross the centreline in %s: %s' % (label, json.dumps(bad))
    idle = report.get('idle')
    if idle:   # v3.1 OSRS idle: hands at the SIDES of the thighs, just off them, not splayed out, not held forward
        assert idle['min_hand_thigh_gap'] >= .004, 'idle hands touch the thighs: %s' % idle
        assert idle['idle_hand_x_max'] <= .30, 'idle arms splayed out like an A-pose: %s' % idle
        assert -.05 <= idle['idle_hand_y_max'] <= .03, 'idle hands are not at the sides of the thighs: %s' % idle
    for n in ('walk', 'run', 'talk', 'wave'):
        if n in report:
            assert report[n]['min_hand_thigh_gap'] >= -.01, 'hands pass through the thighs in %s: %s' % (n, report[n])


# v3.0: mesh-level hand clearance on EVERY frame of EVERY clip, for representative outfits (the default A / B, the widest
# tunic hem, the flared skirt) -- the evaluated hand mesh against the evaluated legs + torso meshes: how many hand vertices
# are inside those parts (ray parity) and by how much (distance to the surface), per clip
HAND_OUTFITS = {'A default': ('A', {}), 'A tunic hem (shirt) + flares': ('A', {'Torso': 5, 'Legs': 3}),
                'B default (long skirt)': ('B', {}), 'B pleated peplum + short skirt': ('B', {'Torso': 3, 'Legs': 2})}
HAND_STRICT = ('idle', 'walk', 'run', 'talk', 'wave')   # locomotion / idle / NPC clips: no hand may sink in at all (> 5 mm)

def mesh_hand_clearance(arm, objs, clips):
    sc = bpy.context.scene
    dirs = [Vector((.577, .577, .577)), Vector((-.62, .31, .72)).normalized(), Vector((.21, -.91, .36)).normalized()]
    def evaluated(o):
        dg = bpy.context.evaluated_depsgraph_get()
        oe = o.evaluated_get(dg)
        me = oe.to_mesh()
        co = [oe.matrix_world @ v.co for v in me.vertices]
        tris = [tuple(p.vertices) for p in me.polygons]
        oe.to_mesh_clear()
        return co, tris
    def inside(bvh, p):
        votes = 0
        for d in dirs:
            n, o = 0, p
            for _ in range(24):
                hit = bvh.ray_cast(o, d)
                if hit[0] is None:
                    break
                n += 1
                o = hit[0] + d * 1e-5
            votes += n % 2
        return votes >= 2
    out = {}
    for label, (bt, over) in HAND_OUTFITS.items():
        sel = dict(DEFAULT_OUTFIT[bt])
        sel.update(over)
        hand = objs[part_name(bt, 'Hands', sel['Hands'])]
        others = [objs[part_name(bt, 'Legs', sel['Legs'])], objs[part_name(bt, 'Torso', sel['Torso'])]]
        res = {}
        for name, act in clips.items():
            arm.animation_data.action = act
            f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
            worst_n, worst_d, worst_f = 0, 0.0, None
            for f in range(f0, f1 + 1):
                sc.frame_set(f)
                hco, _ = evaluated(hand)
                for o in others:
                    co, tris = evaluated(o)
                    bvh = BVHTree.FromPolygons(co, tris)
                    # only hand vertices near the part can be inside it
                    lo = Vector((min(c.x for c in co), min(c.y for c in co), min(c.z for c in co)))
                    hi = Vector((max(c.x for c in co), max(c.y for c in co), max(c.z for c in co)))
                    cand = [p for p in hco if lo.x <= p.x <= hi.x and lo.y <= p.y <= hi.y and lo.z <= p.z <= hi.z]
                    n_in, d_in = 0, 0.0
                    for p in cand:
                        if inside(bvh, p):
                            d = bvh.find_nearest(p)[3] or 0.0
                            if d > .005:
                                n_in += 1
                                d_in = max(d_in, d)
                    if n_in > worst_n or d_in > worst_d:
                        worst_n, worst_d, worst_f = max(worst_n, n_in), max(worst_d, d_in), f
            res[name] = {'hand_verts_inside': worst_n, 'max_depth_m': round(worst_d, 4), 'frame': worst_f}
        out[label] = res
    arm.animation_data.action = None
    bad = {lab: {n: r for n, r in res.items() if n in HAND_STRICT and r['hand_verts_inside']} for lab, res in out.items()}
    bad = {k: v for k, v in bad.items() if v}
    print('[HANDS MESH]', json.dumps(out))
    return {'rule': 'hand vertices inside the legs / torso part by more than 5 mm, every frame of every clip, per outfit (worst frame)',
            'outfits': {k: dict(zip(('body', 'overrides'), v)) for k, v in HAND_OUTFITS.items()}, 'result': out,
            'strict_clips': list(HAND_STRICT), 'PASS': not bad, 'failures': bad}

# ------------------------------------------------------------------------------------------
# Build
# ------------------------------------------------------------------------------------------
def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = FPS
    sc.frame_start = 0

def _body_r_t(bt, z, T, Pv):
    if z >= 1.0:
        return lerp_table(T[bt], z)
    if z <= 0.96:
        return lerp_table(Pv[bt], z)
    t = (z - 0.96) / 0.04
    return tuple(x + (y - x) * t for x, y in zip(lerp_table(Pv[bt], z), lerp_table(T[bt], z)))

def _clearance(bt, p, T, Pv):
    zz = min(max(p.z, .96), 1.515)
    rad = _body_r_t(bt, zz, T, Pv)
    cy = rad[3]
    dx, dy = p.x, p.y - cy
    have = math.hypot(dx, dy)
    bp = body_point(bt, math.atan2(dx, -dy), zz, 0.0, rad=rad)
    return have - math.hypot(bp.x, bp.y - cy), Vector((dx, dy, 0)).normalized() if have > 1e-6 else Vector((0, 1, 0))

def keep_clearance(bt, base, var, kind):
    """v2.9: a hair / beard vertex hanging by the body keeps at least the clearance it has at the average build, from the
    torso and from the deltoids (pigtails, long beards and draped hair never sink into a stouter chest, back or shoulder)"""
    T0, P0 = _BASE_TABLES['TORSO'], _BASE_TABLES['PELVIS']
    T1, P1, AR1, LR1, ga, gl = _build_tables(kind)
    sh = ARM_SHIFT[kind][0]
    grow0 = lerp_table(_BASE_TABLES['ARM_R'][bt], 0.0)[0]
    grow1 = lerp_table(AR1[bt], 0.0)[0]
    for i, (p0, p1) in enumerate(zip(base, var)):
        if p0.z > 1.52:
            continue
        c0, _ = _clearance(bt, p0, T0, P0)
        c1, rdir = _clearance(bt, p1, T1, P1)
        if c0 < .08 and c1 < c0 + .002:
            p1 = p1 + rdir * (c0 + .002 - c1)
        for sx in (-1, 1):
            if 1.20 < p0.z < 1.52:
                dc, dr = DELTOID[bt]
                cb = Vector((sx * dc[0], dc[1], dc[2]))
                cv = cb + Vector((sx * (sh + grow1 - grow0), 0, 0))
                d0 = (p0 - cb).length - dr
                rv = dr * (1.18 if kind == 'stout' else .96)
                d1 = (p1 - cv).length - rv
                extra = .014 if kind == 'stout' else .002   # a stouter arm swinging forward in the walk still clears draped hair
                if d0 < .06 and d1 < d0 + extra:
                    p1 = cv + (p1 - cv).normalized() * ((p1 - cv).length + (d0 + extra - d1))
        var[i] = p1

MORPHS_ALL = ['Build_Stout', 'Build_Slim']
MORPHS_FEET = ['Feet_Large', 'Feet_Small']
MORPH_DATA = {}   # part name -> {'base': [...], morph: [...], 'tris': [(i, j, k)]}

def add_morphs(ob, bt, slot, idx):
    """v2.9 creator morphs. Build_Stout / Build_Slim on EVERY kit part (zero where a part does not move, e.g. faces),
    Feet_Large (= v2.8 feet) / Feet_Small on every Feet part. Each morph is the same part rebuilt on the other body
    tables, so the shape key has the part's exact topology and every layer follows the same body."""
    base = [v.co.copy() for v in ob.data.vertices]
    keys = {'Build_Stout': part_coords(bt, slot, idx, 'stout'), 'Build_Slim': part_coords(bt, slot, idx, 'slim')}
    if slot == 'Feet':
        keys['Feet_Large'] = part_coords(bt, slot, idx, feet=FOOT_K_LARGE)
        keys['Feet_Small'] = part_coords(bt, slot, idx, feet=FOOT_K_SMALL)
    ob.shape_key_add(name='Basis', from_mix=False)
    for name, co in keys.items():
        assert len(co) == len(base), 'morph %s of %s changed the topology (%d vs %d verts)' % (name, ob.name, len(co), len(base))
        kb = ob.shape_key_add(name=name, from_mix=False)
        kb.data.foreach_set('co', [c for v in co for c in v])
        kb.value = 0.0
    if slot in ('Hair', 'Jaw'):
        keep_clearance(bt, base, keys['Build_Stout'], 'stout')
        keys['Build_Slim'] = [v.copy() for v in base]   # a slim body lies inside the average one: hair / beards stay put
    for name, co in keys.items():
        ob.data.shape_keys.key_blocks[name].data.foreach_set('co', [c for v in co for c in v])
    MORPH_DATA[ob.name] = dict(keys, base=base, tris=[tuple(pl.vertices) for pl in ob.data.polygons],
                               max_disp={k: round(max(((a - b).length for a, b in zip(co, base)), default=0.0), 4) for k, co in keys.items()})

_DIRS = [Vector((.577, .577, .577)), Vector((-.62, .31, .72)).normalized(), Vector((.21, -.91, .36)).normalized()]

def _inside_flags(bvh, pts):
    out = []
    for p in pts:
        votes = 0
        for d in _DIRS:
            n, o = 0, p
            for _ in range(24):
                hit = bvh.ray_cast(o, d)
                if hit[0] is None:
                    break
                n += 1
                o = hit[0] + d * 1e-5
            votes += n % 2
        out.append(votes >= 2)
    return out

CLIP_DEPTH = .003   # a vertex that changes side by more than 3 mm is a real clip; less is the seam of a designed overlap moving

def _loops_of(tris):
    cnt = {}
    for t in tris:
        for a, b in zip(t, t[1:] + t[:1]):
            e = (min(a, b), max(a, b))
            cnt[e] = cnt.get(e, 0) + 1
    nb = {}
    for (a, b), c in cnt.items():
        if c == 1:
            nb.setdefault(a, []).append(b)
            nb.setdefault(b, []).append(a)
    seen, out = set(), []
    for v0 in nb:
        if v0 in seen:
            continue
        loop, v, prev = [v0], v0, None
        seen.add(v0)
        while True:
            nxt = [w for w in nb[v] if w != prev and w not in seen]
            if not nxt:
                break
            prev, v = v, nxt[0]
            seen.add(v)
            loop.append(v)
        if len(loop) >= 3:
            out.append(loop)
    return out

HEM_TORSOS = {'A': {2: .90, 5: .88, 6: .86, 7: .88, 8: .86}, 'B': {3: .90, 4: .90}}

def _components(tris):
    par = {}
    def f(a):
        while par.setdefault(a, a) != a:
            par[a] = par[par[a]]
            a = par[a]
        return a
    for t in tris:
        for v in t[1:]:
            ra, rb = f(t[0]), f(v)
            if ra != rb:
                par[ra] = rb
    groups = {}
    for t in tris:
        groups.setdefault(f(t[0]), []).append(t)
    return list(groups.values())

def verify_builds(objs, arm=None, clips=None):
    """v2.9 build check over EVERY option combination of both body types, at Stout 1.0 and Slim 1.0 (and every feet size).
    Each rule states which part must stay on which side of another; a vertex that is on the wrong side by more than 3 mm at
    the morph but was fine at the average build is a clip the morph introduced:
      hair / beard outside the torso and the arms          (rest, idle f0 / f30, walk f0 / f5 / f10 / f15)
      hips inside every hem torso (the hem covers them)    (rest, idle, walk)
      arms (below the shoulder) and hands outside the torso and the legs  (idle, walk -- in the rest A-pose the hands sit
                                                            beside the hips where no clip ever shows in game)
      trouser / shin inside the boot shaft and the shoe collar (rest, walk; builds and feet sizes)"""
    from mathutils.bvhtree import BVHTree as _BVH
    names = list(MORPH_DATA)
    comps = {n: [(ct, _loops_of(ct)) for ct in _components(MORPH_DATA[n]['tris'])] for n in names}   # loose pieces (inside = inside ANY piece)
    poses = [('rest', None, 0)]
    if arm is not None and clips:
        poses += [('idle f0', 'idle', 0), ('idle f30', 'idle', 30), ('walk f0', 'walk', 0), ('walk f5', 'walk', 5), ('walk f10', 'walk', 10), ('walk f15', 'walk', 15)]
    def coords_for(clip, frame, state):
        if clip is None:
            return {n: (MORPH_DATA[n].get(state) or MORPH_DATA[n]['base']) for n in names}
        sc = bpy.context.scene
        for n in names:
            for kb in objs[n].data.shape_keys.key_blocks[1:]:
                kb.value = 1.0 if kb.name == state else 0.0
        arm.animation_data.action = clips[clip]
        sc.frame_set(frame)
        dg = bpy.context.evaluated_depsgraph_get()
        out = {}
        for n in names:
            oe = objs[n].evaluated_get(dg)
            me = oe.to_mesh()
            out[n] = [v.co.copy() for v in me.vertices]
            oe.to_mesh_clear()
        return out
    rules = []   # (bt, rule, X, Y, wrong_side, region(base_point) -> bool, poses)
    ALL = ('rest', 'idle f0', 'idle f30', 'walk f0', 'walk f5', 'walk f10', 'walk f15')
    POSED = ALL[1:]
    for bt in ('A', 'B'):
        nm = lambda sl: [part_name(bt, sl, i) for i in range(1, len(KIT[bt].get(sl, [])) + 1)]
        for x in nm('Hair'):
            for y in nm('Torso') + nm('Arms'):
                rules.append((bt, 'hair outside torso/arms', x, y, 'in', lambda p: p.z < 1.56, ALL))
        for x in nm('Jaw'):
            for y in nm('Torso'):
                rules.append((bt, 'beard outside torso', x, y, 'in', lambda p: True, ALL))
        for ti, hem in HEM_TORSOS[bt].items():
            for x in nm('Legs'):
                rules.append((bt, 'hem covers the hips', x, part_name(bt, 'Torso', ti), 'out',
                              (lambda h: lambda p: h + .02 < p.z < .985 and abs(p.x) < .30)(hem), ('rest', 'idle f0', 'walk f5', 'walk f15')))
        for x in nm('Arms'):
            for y in nm('Torso'):
                rules.append((bt, 'arms clear of the torso', x, y, 'in', lambda p: p.z < 1.19, POSED))   # v3.0: below the armpit seam
            for y in nm('Legs'):
                rules.append((bt, 'arms clear of the legs', x, y, 'in', lambda p: True, POSED))
        for x in nm('Hands'):
            for y in nm('Torso') + nm('Legs'):
                rules.append((bt, 'hands clear of torso/legs', x, y, 'in', lambda p: True, POSED))
        for x in nm('Legs'):
            rules.append((bt, 'boot shaft covers the leg', x, part_name(bt, 'Feet', 1), 'out', lambda p: .05 < p.z < .24, ('rest', 'walk f0', 'walk f10')))
            rules.append((bt, 'shoe collar covers the ankle', x, part_name(bt, 'Feet', 2), 'out', lambda p: .07 < p.z < .14 and abs(abs(p.x) - .13) < .06,
                          ('rest', 'walk f0', 'walk f10')))
    summary, worst, base_wrong, wbr = {}, [], {}, {}
    for label, clip, frame in poses:
        states = ['Build_Stout', 'Build_Slim'] + (MORPHS_FEET if clip is None else [])
        C = {st: coords_for(clip, frame, st) for st in ['base'] + states}
        bvhs, flags = {}, {}
        def bvh(n, st):
            k = (n, st)
            if k not in bvhs:
                co0 = [tuple(v) for v in C[st][n]]
                lst = []
                for ct, lps in comps[n]:
                    co = list(co0)
                    tris = list(ct)
                    for lp in lps:
                        c = sum((Vector(co[i]) for i in lp), Vector()) / len(lp)
                        co.append(tuple(c))
                        tris += [(lp[i], lp[(i + 1) % len(lp)], len(co) - 1) for i in range(len(lp))]
                    lst.append(_BVH.FromPolygons(co, tris))
                bvhs[k] = (lst, _BVH.FromPolygons(co0, MORPH_DATA[n]['tris']))
            return bvhs[k]
        def wrong(x, y, st, side, idx):
            k = (x, y, st, side, tuple(idx))
            if k not in flags:
                pts = [C[st][x][i] for i in idx]
                lst, whole = bvh(y, st)
                ins = [False] * len(pts)
                for b_ in lst:
                    for j, f_ in enumerate(_inside_flags(b_, pts)):
                        ins[j] = ins[j] or f_
                res = []
                for p_, i_ in zip(pts, ins):
                    bad = i_ if side == 'in' else not i_
                    if bad:
                        d = whole.find_nearest(p_)[3] or 0.0
                        bad = round(d, 4) if d > CLIP_DEPTH else False
                    res.append(bad)
                flags[k] = res
            return flags[k]
        for bt, rule, x, y, side, region, rposes in rules:
            if label not in rposes:
                continue
            idx = [i for i, p_ in enumerate(C['base'][x]) if region(p_)]
            if not idx:
                continue
            w0 = wrong(x, y, 'base', side, idx)
            nb = sum(w0)
            if nb:
                bk = '%s %s' % (bt, rule)
                base_wrong[bk] = base_wrong.get(bk, 0) + nb
            for st in states:
                if st in MORPHS_FEET and 'Feet' not in y:
                    continue
                w1 = wrong(x, y, st, side, idx)
                new = [idx[j] for j, (a_, b_) in enumerate(zip(w0, w1)) if b_ and not a_]
                key = '%s %s | %s' % (bt, rule, st)
                sm = summary.setdefault(key, 0)
                summary[key] = sm + len(new)
                if new:
                    dmax = max(w1[j] for j in range(len(idx)) if w1[j] and not w0[j])
                    worst.append((len(new), dmax, x, y, st, label, [tuple(round(c, 3) for c in C[st][x][i]) for i in new[:3]]))
                    wbr.setdefault(rule, []).append((len(new), round(dmax, 4), x, y, st, label))
                    summary[key + ' max_depth'] = max(summary.get(key + ' max_depth', 0.0), dmax)
    if arm is not None:
        for n in names:
            for kb in objs[n].data.shape_keys.key_blocks[1:]:
                kb.value = 0.0
        arm.animation_data.action = None
    worst.sort(key=lambda w: -w[1])
    bad = {k: v for k, v in summary.items() if v and not k.endswith('max_depth')}
    print('[BUILD CHECK] rules %d, poses %s; NEW clips at the morphs: %s' % (len(rules), [p[0] for p in poses], json.dumps(bad)))
    print('[BUILD CHECK] worst', worst[:14])
    return {'rule': 'per-vertex, per part pair: a vertex on the wrong side of the other part by more than %.0f mm at Stout 1.0 / Slim 1.0 / '
                    'every feet size that was fine at the average build = a clip introduced by the morph' % (CLIP_DEPTH * 1000),
            'rules': sorted({r[1] for r in rules}), 'part_pairs_checked': len(rules), 'poses': [p[0] for p in poses],
            'combinations_covered': {bt: {'torso_x_legs_x_arms': len(KIT[bt]['Torso']) * len(KIT[bt]['Legs']) * len(KIT[bt]['Arms'])} for bt in 'AB'},
            'new_clip_vertices_by_rule': summary, 'already_wrong_at_average_build_vertices': base_wrong,
            'worst': [list(w) for w in worst[:30]],
            'worst_by_rule': {r: [list(w) for w in sorted(v, key=lambda w: (-w[0], -w[1]))[:400]] for r, v in wbr.items()}, 'PASS': not bad}

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
                add_morphs(ob, bt, slot, idx)
                objs[ob.name] = ob
    clips = {}
    defs = clip_defs()
    defs.update(kit_npc_clips())
    defs.update(v27_clips())   # v2.7: grounded walk / run + re-authored chop, mine, net, cook
    defs.update(emote_clips())  # v3.1: the classic emote set (emote_<key>)
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

# ==========================================================================================
# v2.9 TUTORS -- the nine remaining Tutor's Holm tutors, each built from kit parts + their own extras (our own designs)
# ==========================================================================================
def _dz(hx):
    return _desat(hx)

TUTORS = {
    'wenna': dict(name='Wenna', role='survival instructor', bt='B', parts={'Hair': 2, 'Torso': 1, 'Arms': 1, 'Hands': 1, 'Legs': 4, 'Feet': 1},
                  colors={'C_HAIR': '#8a5a30', 'C_TORSO': '#a8966a', 'C_LEGS': '#4a4a30', 'C_FEET': '#5a3a22', 'C_SKIN': '#c8966e'},
                  mats={'A_GREEN': '#3f5a2c', 'A_LEATHER': '#6a4426', 'A_WOOD': '#7a5a36'},
                  extras=['hood', 'capelet', 'jerkin', 'hatchet_belt'], hold=None, free=('Left', 'Right'), gesture='Right'),
    'hettie': dict(name='Cook Hettie', role='cook', bt='B', parts={'Hair': 7, 'Torso': 1, 'Arms': 2, 'Hands': 1, 'Feet': 2, 'Makeup': 2},
                   colors={'C_HAIR': '#a8773e', 'C_TORSO': '#6a4a2a', 'C_LEGS': '#6a4a2a', 'C_FEET': '#4a3019', 'C_SKIN': '#e8bc98', 'C_MAKEUP': '#c86a7a'},
                   mats={'A_WHITE': '#ece8dc'}, extras=['apron_skirt', 'apron_dress', 'mob_cap', 'sleeve_rolls'], hold=None, free=('Left', 'Right'), gesture='Right'),
    'ansel': dict(name='Loremaster Ansel', role='loremaster', bt='A', parts={'Hair': 5, 'Jaw': 2, 'Torso': 1, 'Arms': 3, 'Hands': 1, 'Feet': 2},
                  colors={'C_HAIR': '#d0cec8', 'C_TORSO': '#2e3f6e', 'C_LEGS': '#2e2e30', 'C_FEET': '#2e2620', 'C_SKIN': '#e0b088'},
                  mats={'A_BOOK': '#7a2e22'}, extras=['robe_skirt', 'robe_hose', 'sleeve_trim', 'spectacles', 'book_arm'], hold='Left', free=('Right',), gesture='Right'),
    'durgin': dict(name='Foreman Durgin', role='mining foreman', bt='A', build='stout',
                   parts={'Hair': 7, 'Jaw': 3, 'Torso': 1, 'Arms': 2, 'Hands': 2, 'Legs': 1, 'Feet': 1},
                   colors={'C_HAIR': '#6a3a1e', 'C_TORSO': '#8c7a55', 'C_LEGS': '#4a3a2c', 'C_FEET': '#3a2a1e', 'C_SKIN': '#c8966e'},
                   mats={'A_LEATHER': '#5a3a22', 'A_WOOD': '#7a5a36'}, extras=['leather_apron', 'hard_cap', 'pick_shoulder'], hold='Right',
                   free=('Left',), gesture='Left'),
    'corrick': dict(name='Warden Corrick', role='warden', bt='A', parts={'Hair': 2, 'Jaw': 6, 'Hands': 2, 'Legs': 1, 'Feet': 1},
                    colors={'C_HAIR': '#4a3020', 'C_TORSO': '#a07a44', 'C_LEGS': '#3b2e1e', 'C_FEET': '#3a2a1e', 'C_SKIN': '#c8966e'},
                    mats={'A_BRONZE': '#ac7e40', 'A_BRONZE_DK': '#8c6634', 'A_TABARD': '#2e3f6e', 'A_WOOD': '#5a3a22'},
                    extras=['hauberk', 'mail_sleeves', 'tabard', 'helmet', 'sword_hip'],
                    hold=None, free=('Left', 'Right'), gesture='Right'),
    'maud': dict(name='Teller Maud', role='bank teller', bt='B', parts={'Hair': 3, 'Torso': 1, 'Arms': 1, 'Hands': 1, 'Legs': 1, 'Feet': 2},
                 colors={'C_HAIR': '#4a3020', 'C_TORSO': '#dcd4bc', 'C_LEGS': '#26345a', 'C_FEET': '#2e2620', 'C_SKIN': '#e0b088'},
                 mats={'A_VEST': '#3a4a5e', 'A_BOOK': '#3f6234'}, extras=['waistcoat', 'ledger'], hold='Left', free=('Right',), gesture='Right'),
    'ilse': dict(name='Magister Ilse', role='magister', bt='B', parts={'Hair': 1, 'Torso': 1, 'Arms': 5, 'Hands': 1, 'Legs': 1, 'Feet': 2},
                 colors={'C_HAIR': '#2a1f18', 'C_TORSO': '#5e3e6e', 'C_LEGS': '#5e3e6e', 'C_FEET': '#2e2620', 'C_SKIN': '#e8bc98'},
                 mats={'A_HAT': '#4e3060', 'A_WOOD': '#6a4a2a', 'A_GEM': '#7ac0e8'}, extras=['pointed_hat', 'skirt_trim', 'staff_orb'], hold='Right',
                 free=('Left',), gesture='Left'),
    'aldous': dict(name='Keeper Aldous', role='lighthouse keeper', bt='A', parts={'Hair': 7, 'Jaw': 4, 'Arms': 1, 'Hands': 1, 'Legs': 1, 'Feet': 1},
                   colors={'C_HAIR': '#a4a09a', 'C_TORSO': '#c49a3a', 'C_LEGS': '#2e2e30', 'C_FEET': '#2e2620', 'C_SKIN': '#c8966e', 'A_TRIM': '#8a6a2a'},
                   mats={'A_WOOL': '#8a2e2a', 'A_GLASS': '#f4dc8c'}, extras=['oilskin_coat', 'wool_cap', 'lantern_hand'], hold='Right',
                   free=('Left',), gesture='Left'),
    'tobin': dict(name='Ferryman Tobin', role='ferryman', bt='A', parts={'Hair': 5, 'Jaw': 6, 'Arms': 2, 'Hands': 1, 'Feet': 3},
                  colors={'C_HAIR': '#5a4030', 'C_TORSO': '#26345a', 'C_LEGS': '#6a5a40', 'C_FEET': '#4a3019', 'C_SKIN': '#a0704e'},
                  mats={'A_ROPE': '#b8a07a'}, extras=['striped_shirt', 'rolled_trousers', 'rope_coil'], hold=None, free=('Left', 'Right'), gesture='Right'),
}
TUTOR_WALK_SPEED = 1.30   # m/s, like Guide Bram (NPC stroll)

def tut_hold_pose(tid):
    """the held arm's base pose (the props are authored in this pose)"""
    d = {}
    if tid == 'durgin':      # pickaxe resting on the right shoulder, hand gripping the shaft in front of the shoulder
        p_ = P()
        arm_reach(p_, 'Right', Vector((-.19, -.13, 1.28)), (.10, -.55, .83), -80, pole=(-.8, .3, -.45))
        d = {k: p_[k] for k in ('RightArm', 'RightForeArm', 'RightHand')}
    elif tid == 'aldous':    # lantern carried low at the side
        p_ = P()
        arm_reach(p_, 'Right', Vector((-.27, -.10, .98)), (-.05, -.45, -.89), 0, pole=(-.8, .4, -.4))
        d = {k: p_[k] for k in ('RightArm', 'RightForeArm', 'RightHand')}
    elif tid == 'ilse':      # staff upright in the right hand (as Bram)
        d = dict(HOLD)
    elif tid == 'ansel':     # book tucked under the left arm, forearm under it
        p_ = P()
        arm_reach(p_, 'Left', Vector((.27, -.20, 1.06)), (.05, -.95, .30), 0, pole=(.9, .3, -.3))
        d = {k: p_[k] for k in ('LeftArm', 'LeftForeArm', 'LeftHand')}
    elif tid == 'maud':      # ledger held against the waist in the left hand
        p_ = P()
        arm_reach(p_, 'Left', Vector((.15, -.22, 1.00)), (-.10, -.60, .79), 90, pole=(.9, .3, -.3))
        d = {k: p_[k] for k in ('LeftArm', 'LeftForeArm', 'LeftHand')}
    return d

def PT(tid, *dicts, **kw):
    d = dict(REST)
    d.update(tut_hold_pose(tid))
    for x in dicts:
        d.update(x)
    d.update(kw)
    return d

def tutor_clip_defs(tid):
    t = TUTORS[tid]
    g = t['gesture']
    mir = (lambda d: d) if g == 'Left' else mirror_pose
    C = {}
    C['idle'] = (60, [(0, upright(PT(tid))), (30, upright(PT(tid, Spine1=(-1.5, 0, 0), Spine2=(-1, 0, 0), Head=(2.5, 0, 0), loc=(0, 0, .004)))),
                      (60, upright(PT(tid)))], True)
    C['talk'] = (48, [(f, upright(PT(tid, mir(GEST_L[i % 4])))) for i, f in enumerate((0, 12, 24, 36))] + [(48, upright(PT(tid, mir(GEST_L[0]))))], True)
    C['wave'] = (40, [(0, upright(PT(tid)))] + [(8 + 6 * i, upright(PT(tid, mir(dict(WAVE_UP, LeftForeArm=fa))))) for i, fa in enumerate(WAVE_FA)]
                 + [(40, upright(PT(tid)))], False)
    C['walk'] = (28, best_gait('walk_' + tid, 28, TUTOR_WALK_SPEED, .60, lift=.045, drop=.005, bob=.010, front=.20, p_on=10, p_off=-20,
                               arm_swing=14, fore=0, lean=0, twist=2, foot_x=.13, base=PT(tid), osrs=(6.0, 0.0), fore_swing=8,
                               swing_sides=t['free'], lean_cap=(0.0, False)), True)
    return C

# ---- tutor extras (all built with the kit's body surface rules) ----------------------------
def ext_hood(mb, bt):
    """hood (head space): frames the face, hangs to the neck and flares onto the shoulders"""
    hair_cap(mb, bt, angtab([(0, 1.752), (45, 1.705), (70, 1.600), (100, 1.520), (180, 1.470)]), off_out=.036, off_in=.022, top=1.862,
             rows=4, cols=14, hang_below=1.60, flare=.20, ears=False, mat='A_GREEN', clumps=False)

def ext_capelet(mb, bt):
    """short cloak over the shoulders and upper arms, open at the front"""
    zs = [1.16, 1.24, 1.32, 1.38, 1.43, 1.47]
    def rad(z):
        rx, rf, rb, cy = body_r(bt, min(z, 1.45))
        cover = .30 if bt == 'A' else .27
        k = ss(1.47, 1.36, z)
        return (rx + (max(cover, rx + .06) - rx) * k, rf + .05 * k + .012, rb + .06 * k + .012, cy)
    outer, inner = [], []
    for z in zs:
        r = rad(z)
        a0 = .30 + (1.47 - z) * 2.2
        phis = [a0 + (2 * math.pi - 2 * a0) * k / 12 for k in range(13)]
        outer.append([tuple(body_point(bt, ph, z, .012, rad=r)) for ph in phis])
        inner.append([tuple(body_point(bt, ph, z, .004, rad=r)) for ph in phis])
    mb.shell(outer, inner, lambda i, j, sd: 'A_GREEN', torso_w)
    for sx in (-1, 1):   # clasp cords at the throat
        mb.box((sx * .030, front_y(bt, .03, 1.45, .016), 1.45), (.012, .010, .012), 'A_METAL', SPINE_W((0, 0, 1.45)))

def ext_jerkin(mb, bt):
    shirt2(mb, bt, mat='A_LEATHER', hem=.86, off=.015, hem_off=.022, ah='vest')   # v3.0: sleeveless, the shirt's sleeves show
    o = shirt_off(.86, .015, .022)
    zs = shirt_zs(bt, .86)
    for k in range(4):
        zc = 1.10 + .075 * k
        y = cloth_y(bt, 0, zc, zs, o) - .003
        for sg in (-1, 1):
            mb.box((0, y, zc), (.040, .004, .005), 'A_BELT', SPINE_W((0, 0, zc)), rot=Euler((0, math.radians(26 * sg), 0)).to_matrix())
    belt(mb, bt, .95, 1.00, off=.045, buckle=True)

def ext_hatchet_belt(mb, bt):
    """hand axe tucked through the belt on the right hip, head up (rigid on the hips)"""
    H = B('Hips')
    x = -(body_r(bt, .97)[0] + .055)
    mb.loft([xring((x, -.02, z), (0, 0, 1), .010, .010, .010, 5) for z in (.72, 1.02)], 'A_WOOD', H, smooth=False)
    mb.box((x, -.055, 1.02), (.012, .055, .040), 'A_METAL', H, taper=1.0)
    mb.box((x, -.09, 1.02), (.008, .020, .062), 'A_METAL', H)

def _skirt_outer_ring(bt, z, zs, hem_rad, off, n=10):
    z_hem, z_top = zs[0], zs[-1]
    a = body_r(bt, min(z, .99)) if z > .86 else body_r(bt, .86)
    hem_rad = (hem_rad[0],) + tuple(v * BUILD['skirt'] for v in hem_rad[1:4]) + tuple(hem_rad[4:])
    rad = a if z > .86 else tuple(x + (y - x) * clamp((.86 - z) / (.86 - z_hem)) for x, y in zip(a, hem_rad[1:]))
    return body_ring(bt, z, off, n, rad=rad)

def _poly_front_y(ring, x):
    best = None
    for a, b in zip(ring, ring[1:] + ring[:1]):
        if (a[0] - x) * (b[0] - x) <= 0 and abs(b[0] - a[0]) > 1e-9 and (a[1] + b[1]) / 2 < .03:
            y = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0])
            best = y if best is None else min(best, y)
    return best

def ext_apron_skirt(mb, bt):
    """v2.9b: Hettie's long dress skirt whose three front faces ARE the apron (white) from the waist to above the hem --
    the apron moves exactly with the skirt, so no walk frame can push the skirt through it"""
    zsk = [.12, .22, .36, .52, .68, .82, .92, 1.0]
    n = 14
    belt(mb, bt, off=.016, buckle=False)
    skirt(mb, bt, zsk, (.12, .235, .20, .21, .030), off=.014, n=n,
          matfn=lambda i, k: 'A_WHITE' if (k in (n - 2, n - 1, 0) and zsk[i] >= .22) else 'C_LEGS')
    legs_skin(mb, bt, 1.5)

def ext_apron_dress(mb, bt):
    """white bib apron over the brown dress: follows the bodice, then the long skirt's own front surface"""
    zsk = [.12, .22, .36, .52, .68, .82, .92, 1.0]
    hem = (.12, .235, .20, .21, .030)
    zs = [.955, 1.00, 1.08, 1.16, 1.24, 1.31]   # v2.9b: bib only (the skirt part is the dress's own front faces)
    cols = 7
    outer, inner = [], []
    for z in zs:
        hw = .125 if z < 1.0 else .125 - .035 * (z - 1.0) / .31
        ro, ri = [], []
        ring = _skirt_outer_ring(bt, z, zsk, hem, .014) if z < .97 else None
        for j in range(cols):
            x = -hw + 2 * hw * j / (cols - 1)
            # v2.9b: more stand-off low down, where the skirt swings furthest in the walk
            y = (_poly_front_y(ring, x) if ring else front_y(bt, x, z, .012)) - .007 - .006 * ss(.94, .40, z)
            ro.append((x, y, z))
            ri.append((x, y + .005, z))
        outer.append(ro)
        inner.append(ri)
    rings_sk = [(z, _skirt_outer_ring(bt, z, zsk, hem, .014)) for z in zsk]
    def surf_w(p):
        """v2.9b: the skirt's own (interpolated) skin weights at this point, so the apron moves exactly with the skirt face"""
        if p.z >= .97:
            return skirt_w(p)
        def at_ring(ring, x):
            for a_, b_ in zip(ring, ring[1:] + ring[:1]):
                if (a_[0] - x) * (b_[0] - x) <= 0 and abs(b_[0] - a_[0]) > 1e-9 and (a_[1] + b_[1]) / 2 < .03:
                    t_ = (x - a_[0]) / (b_[0] - a_[0])
                    return wmix(skirt_w(Vector(a_)), skirt_w(Vector(b_)), t_)
            return skirt_w(p)
        for (z0, r0), (z1, r1) in zip(rings_sk, rings_sk[1:]):
            if z0 <= p.z <= z1:
                return wnorm(wmix(at_ring(r0, p.x), at_ring(r1, p.x), (p.z - z0) / (z1 - z0)))
        return skirt_w(p)
    mb.shell(outer, inner, lambda i, j, sd: 'A_WHITE', surf_w)
    band = [body_ring(bt, z, .020, 14) for z in (.965, .995)]
    mb.loft(band, 'A_WHITE', torso_w, cap0=False, cap1=False, smooth=False)
    for sx in (-1, 1):   # neck straps
        x0 = sx * .07
        tube(mb, [(x0, front_y(bt, x0, 1.31, .014), 1.31), (sx * .062, -.045, 1.45), (sx * .05, .03, 1.49), (0, .065, 1.47)],
             [.007] * 4, 'A_WHITE', torso_w, n=4, cap=False)

def ext_mob_cap(mb, bt):
    """soft gathered cap: a puffed crown over the hair with a frilled edge"""
    hair_cap(mb, bt, angtab([(0, 1.748), (40, 1.745), (70, 1.733), (100, 1.712), (180, 1.672)]), off_out=.042, off_in=.026, top=1.876, rows=3, cols=16,
             ears=False, mat='A_WHITE', jag=.007, jag_fn=lambda th: True, clumps=False, off_fn=lambda th, t: .014 * math.sin(math.pi * min(1.0, t * 1.2)))

def ext_sleeve_rolls(mb, bt):
    for sx in (-1, 1):
        mb.loft(arm_rings(bt, sx, [(.76, .014), (.78, .022), (.85, .022), (.87, .014)]), 'C_TORSO', arm_w(sx))   # v3.0: at the short sleeve's end

def ext_robe_skirt(mb, bt):
    skirt(mb, bt, [.10, .20, .34, .50, .66, .80, .90, .99], (.10, .235, .20, .21, .030), off=.020, mat='C_TORSO', rim_mat='A_TRIM')
    band_o = [_skirt_outer_ring(bt, z, [.10, .20, .34, .50, .66, .80, .90, .99], (.10, .235, .20, .21, .030), .026) for z in (.105, .15)]
    mb.loft(band_o, 'A_TRIM', skirt_w, cap0=False, cap1=False, smooth=False)
    belt(mb, bt, .94, 1.00, off=.040, mat='A_TRIM', buckle=False)

def ext_robe_hose(mb, bt):
    """dark hose from mid-shin down (the robe hides the rest; nothing can poke through it at the hips)"""
    legs_both(mb, bt, [(1.36, .004), (1.5, .004), (1.72, .004), (1.95, .004), (2.04, .004)], 'C_LEGS')

def ext_sleeve_trim(mb, bt):
    for sx in (-1, 1):
        mb.loft(arm_rings(bt, sx, [(1.78, .036), (1.80, .044), (1.86, .044), (1.88, .036)]), 'A_TRIM', arm_w(sx))

def ext_spectacles(mb, bt):
    """wire spectacles (head space): two small rims, bridge and temples back to the ears"""
    T = HEAD_T[bt]
    H = B('Head')
    ez = 1.687
    for sx in (-1, 1):
        cx = .0265 * sx
        y = face_y(cx, ez, T) - .007
        w, h, t = .026, .020, .0022
        for (bx, bz, sw, sh_) in ((cx, ez + h / 2, w, t), (cx, ez - h / 2, w, t), (cx - w / 2, ez, t, h), (cx + w / 2, ez, t, h)):
            mb.box((bx, y, bz), (sw, .003, sh_), 'A_METAL', H)
        rx = lerp_table(T, ez)[0]
        tube(mb, [(sx * (.0265 + w / 2), y, ez + .004), (sx * (rx + .004), -.02, ez + .006), (sx * (rx + .002), .01, ez - .004)], [.0015] * 3,
             'A_METAL', H, n=3, cap=False)
    mb.box((0, face_y(0, ez + .004, T) - .009, ez + .004), (.010, .003, .0025), 'A_METAL', H)

def ext_leather_apron(mb, bt):
    apron(mb, bt, z_hem=.52, bib_top=1.33, half=.135, mat='A_LEATHER', off=.020)

def ext_hard_cap(mb, bt):
    zb = angtab([(0, 1.742), (90, 1.728), (180, 1.708)])
    hair_cap(mb, bt, zb, off_out=.034, off_in=.022, top=1.858, rows=3, cols=14, ears=False, mat='A_LEATHER', clumps=False)
    T = HEAD_T[bt]
    ring = lambda o, dz: [tuple(head_surface(2 * math.pi * k / 16, zb(2 * math.pi * k / 16) + dz, o, T)) for k in range(16)]
    mb.loft([ring(.030, -.002), ring(.058, -.004), ring(.058, .004), ring(.030, .008)], 'A_LEATHER', B('Head'), cap0=False, cap1=False, smooth=False)

def ext_hauberk(mb, bt):
    """bronze mail shirt to mid-thigh: rings of mail rows (alternating ridges), closed collar"""
    zs = [.70, .74, .78, .82, .86, .90, .94, .98, 1.03, 1.08, 1.13, 1.18, 1.23, 1.28, 1.33, 1.38, 1.43, 1.47, 1.505]
    def off(z):
        return .010 + .036 * ss(1.00, .90, z) + .020 * ss(.90, .70, z) + (.004 if round(z * 100) % 2 else 0.0)
    zs = [.70 + .026 * i for i in range(int((1.44 - .70) / .026) + 1)] + [1.47, 1.505]
    rings = [body_ring(bt, z, off(z) + (.0035 if i % 2 else 0.0), 12) for i, z in enumerate(zs)]
    rings[0] = [(x, y, z + (.005 if k % 2 else 0.0)) for k, (x, y, z) in enumerate(rings[0])]
    params = [[(2 * math.pi * k / 12 + math.pi / 12, z) for k in range(12)] for z in zs]
    mb.loft_ah(bt, rings, params, 'A_BRONZE', skirt_w, ah='zip', cap0=False, cap1=True,
               matfn=lambda i, k: 'A_BRONZE_DK' if (i % 2 and zs[i] < 1.44) else 'A_BRONZE')   # v2.9b: rows of mail; v3.0 armholes

def ext_mail_sleeves(mb, bt):
    """v2.9b: mail sleeves in the same bright / dark ring rows as the hauberk (replace the cloth sleeves)"""
    us = [.75 + .08 * i for i in range(14)]   # v3.0: rows below the deltoid cap (the cap is plain bronze)
    spec = [(0.0, .011)] + [(u, .011 + (.003 if i % 2 else 0.0)) for i, u in enumerate(us)] + [(1.85, .011), (1.88, .016), (1.97, .017)]
    nrow = len(us) + 3
    arms_both(mb, bt, spec, 'A_BRONZE', matfn=lambda i, k: 'A_BRONZE_DK' if (i % 2 and i < nrow - 3) else 'A_BRONZE')

def ext_tabard(mb, bt):
    tabard(mb, bt, z_hem=.60, half=.110, off=.034, mat='A_TABARD', trim='A_TRIM')
    y = front_y(bt, 0, 1.24, .040)
    mb.loft([[(-.045, y, 1.28), (.045, y, 1.28), (.045, y + .004, 1.28), (-.045, y + .004, 1.28)],
             [(-.045, y, 1.20), (.045, y, 1.20), (.045, y + .004, 1.20), (-.045, y + .004, 1.20)],
             [(0, y, 1.14), (.001, y, 1.14), (.001, y + .004, 1.14), (0, y + .004, 1.14)]], 'A_TRIM', SPINE_W, smooth=False)   # shield emblem
    belt(mb, bt, .95, 1.00, off=.050, buckle=True)

def ext_helmet(mb, bt):
    zb = angtab([(0, 1.732), (70, 1.715), (100, 1.690), (180, 1.640)])
    hair_cap(mb, bt, zb, off_out=.022, off_in=.006, top=1.846, rows=3, cols=14, ears=False, mat='A_BRONZE', clumps=False)
    T = HEAD_T[bt]
    ring = lambda o, dz: [tuple(head_surface(2 * math.pi * k / 16, zb(2 * math.pi * k / 16) + dz, o, T)) for k in range(16)]
    mb.loft([ring(.018, -.004), ring(.030, -.004), ring(.030, .012), ring(.020, .012)], 'A_BRONZE', B('Head'), cap0=False, cap1=False, smooth=False)
    ny = face_y(0, 1.70, T)
    mb.box((0, ny - .010, 1.700), (.012, .008, .052), 'A_BRONZE', B('Head'))   # nasal guard

def ext_sword_hip(mb, bt):
    """scabbarded sword hanging from the belt on the left hip, angled back"""
    H = B('Hips')
    x0 = body_r(bt, .97)[0] + .065
    top, tip = Vector((x0, -.02, .99)), Vector((x0 + .03, .22, .44))
    ax = (tip - top).normalized()
    mb.loft([xring(top + ax * t, ax, .016, .010, .010, 4, front=(1, 0, 0)) for t in (0.0, .60)] + [xring(tip, ax, .008, .006, .006, 4, front=(1, 0, 0))],
            'A_WOOD', H, smooth=False)
    mb.loft([xring(top - ax * t, ax, .006, .006, .006, 5) for t in (0.0, .10)], 'A_BELT', H, smooth=False)   # grip
    mb.box(tuple(top - ax * .004), (.012, .075, .012), 'A_BRONZE', H, rot=ax.rotation_difference(Vector((0, 0, 1))).to_matrix().inverted())
    mb.box(tuple(top - ax * .11), (.018, .018, .018), 'A_BRONZE', H)   # pommel

def ext_waistcoat(mb, bt):
    va = lambda z: .06 + max(0, z - 1.26) * 3.6
    open_shell(mb, bt, [.93, .98, 1.04, 1.12, 1.20, 1.28, 1.35, 1.41, 1.45], va, .016, .007, mat='A_VEST', trim=None, w=torso_w, n_body=16,
               ah='vest')   # v3.0: a real waistcoat armhole
    for k in range(5):
        z = 1.00 + .065 * k
        p_ = body_point(bt, va(z) + .09, z, .018)
        mb.box((p_.x, p_.y - .0006, z), (.011, .005, .011), 'A_METAL', SPINE_W((0, 0, z)))

def ext_pointed_hat(mb, bt):
    T = HEAD_T[bt]
    H = B('Head')
    zb = 1.780
    brim_in = [tuple(head_surface(2 * math.pi * k / 16, zb, .040, T)) for k in range(16)]
    brim_out = [(p[0] * 1.9, (p[1] - HEAD_YC) * 1.9 + HEAD_YC, zb - .012) for p in brim_in]
    brim_top = [(p[0], p[1], p[2] + .010) for p in brim_out]
    mb.loft([brim_in, brim_out, brim_top, [(p[0], p[1], p[2] + .012) for p in brim_in]], 'A_HAT', H, cap0=False, cap1=False, smooth=False)
    rings, c = [], Vector((0, HEAD_YC, zb))
    for i, (h, r) in enumerate(((0.0, 1.0), (.03, .96), (.10, .72), (.18, .46), (.25, .24), (.31, .02))):
        cc = c + Vector((0, .05 * (h / .31) ** 2, h))
        rings.append([tuple(cc + (Vector(p) - c) * r - Vector((0, 0, 0))) for p in brim_in])
    mb.loft(rings, 'A_HAT', H, cap0=False, cap1=True)
    mb.loft([[tuple(Vector(p) + (Vector(p) - c).normalized() * .004 + Vector((0, 0, .006 + dz))) for p in brim_in] for dz in (0.0, .024)],
            'A_TRIM', H, cap0=False, cap1=False, smooth=False)   # hat band

def ext_skirt_trim(mb, bt):
    zsk, hem = [.12, .22, .36, .52, .68, .82, .92, 1.0], (.12, .235, .20, .21, .030)
    mb.loft([_skirt_outer_ring(bt, z, zsk, hem, .020) for z in (.125, .17)], 'A_TRIM', skirt_w, cap0=False, cap1=False, smooth=False)

def ext_oilskin_coat(mb, bt):
    torso_style(mb, bt, 'coat')

def ext_wool_cap(mb, bt):
    zb = angtab([(0, 1.736), (90, 1.712), (180, 1.672)])
    hair_cap(mb, bt, zb, off_out=.034, off_in=.020, top=1.878, rows=3, cols=14, ears=False, mat='A_WOOL', clumps=False)
    T = HEAD_T[bt]
    ring = lambda o, dz: [tuple(head_surface(2 * math.pi * k / 14, zb(2 * math.pi * k / 14) + dz, o, T)) for k in range(14)]
    mb.loft([ring(.030, -.002), ring(.046, .006), ring(.046, .030), ring(.034, .038)], 'A_WOOL', B('Head'), cap0=False, cap1=False)   # rolled brim

def ext_striped_shirt(mb, bt):
    zs = [.968, 1.005, 1.045, 1.085, 1.125, 1.165, 1.205, 1.245, 1.285, 1.325, 1.365, 1.405, 1.44, 1.47, 1.496, 1.518]
    torso_loft(mb, bt, zs, .004, 'C_TORSO', matfn=lambda i, k: 'A_SHIRT' if (i % 2 and zs[i] < 1.43) else 'C_TORSO')
    collar(mb, bt)

def ext_rolled_trousers(mb, bt):
    pelvis(mb, bt)
    belt(mb, bt)
    legs_both(mb, bt, [(u, .010) for u in U_LEG if u < 1.25] + [(1.30, .011), (1.32, .026), (1.44, .026), (1.46, .012)])
    legs_skin(mb, bt, 1.34)

def _coil_path(bt, dz, off, n=24, droop=0.0):
    pts = []
    for k in range(n):
        ph = 2 * math.pi * k / n
        z = 1.14
        for _ in range(8):
            rx = body_r(bt, min(max(z, .96), 1.44))[0]
            x = (rx + .03) * math.copysign(abs(math.sin(ph)) ** (2 / TORSO_P), math.sin(ph))
            z = .5 * z + .5 * (1.14 + dz + 1.05 * x - droop * ss(.02, -.20, x))
        zc = min(max(z, .90), 1.47)
        pts.append(body_point(bt, ph, zc, off + .5 * droop * ss(.02, -.20, x)))
    return pts

def ext_rope_coil(mb, bt):
    """v2.9b: a coil of rope worn over the left shoulder and across to the right hip: four separate twisted strands
    (visible gaps between them) bundled together, with three dark bindings round the bundle"""
    n = 24
    for j in range(5):   # the loops hang to different lengths, so they fan apart at the hip like a real coil
        pts = _coil_path(bt, -.040 + .020 * j, .030 + .004 * (j % 2), n, droop=.018 * (4 - j))
        rings = [xring(p_, pts[(k + 1) % n] - pts[k - 1], .0115 if k % 2 else .0095, .0115 if k % 2 else .0095, .0115 if k % 2 else .0095, 5,
                       front=(0, 0, 1)) for k, p_ in enumerate(pts)]
        rings.append(rings[0])
        mb.loft(rings, 'A_ROPE', torso_w, cap0=False, cap1=False)
    mid = _coil_path(bt, 0.0, .032, n)
    zs = [p_.z for p_ in mid]
    k_top = zs.index(max(zs))
    for k in (k_top, (k_top + n // 5) % n, (k_top - n // 5) % n):   # bindings: shoulder top, chest, shoulder blade
        c = mid[k]
        ax = mid[(k + 1) % n] - mid[k - 1]
        out = Vector((c.x, c.y - body_r(bt, min(max(c.z, .96), 1.44))[3], 0)).normalized()
        rs = [xring(c + ax.normalized() * d, ax, .058, .020, .020, 6, front=tuple(out)) for d in (-.012, .012)]
        mb.loft(rs, 'A_BELT', torso_w, smooth=False)

EXTRA_FN = {'hood': (ext_hood, True), 'capelet': (ext_capelet, False), 'jerkin': (ext_jerkin, False), 'hatchet_belt': (ext_hatchet_belt, False),
            'apron_dress': (ext_apron_dress, False), 'apron_skirt': (ext_apron_skirt, False), 'mob_cap': (ext_mob_cap, True), 'sleeve_rolls': (ext_sleeve_rolls, False),
            'robe_skirt': (ext_robe_skirt, False), 'robe_hose': (ext_robe_hose, False), 'sleeve_trim': (ext_sleeve_trim, False), 'spectacles': (ext_spectacles, True),
            'leather_apron': (ext_leather_apron, False), 'hard_cap': (ext_hard_cap, True), 'hauberk': (ext_hauberk, False),
            'tabard': (ext_tabard, False), 'mail_sleeves': (ext_mail_sleeves, False), 'helmet': (ext_helmet, True), 'sword_hip': (ext_sword_hip, False), 'waistcoat': (ext_waistcoat, False),
            'pointed_hat': (ext_pointed_hat, True), 'skirt_trim': (ext_skirt_trim, False), 'oilskin_coat': (ext_oilskin_coat, False),
            'wool_cap': (ext_wool_cap, True), 'striped_shirt': (ext_striped_shirt, False), 'rolled_trousers': (ext_rolled_trousers, False),
            'rope_coil': (ext_rope_coil, False)}

def _posed_prop(arm, pose, bone, build, bm, name, coll):
    """a rigid prop authored in `pose` (world space), mapped back into the rest pose of `bone` and weighted 100% to it"""
    set_pose(arm, pose)
    pb = arm.pose.bones[B(bone)]
    M = pb.matrix @ pb.bone.matrix_local.inverted()
    mb = MB()
    build(mb, B(bone))
    Mi = M.inverted()
    for v in mb.bm.verts:
        v.co = Mi @ v.co
    clear_pose(arm)
    return mb.to_object(name, bm, arm, coll=coll)

def tutor_props(tid, arm, bm, coll):
    t = TUTORS[tid]
    out = {}
    base = upright(PT(tid))
    if tid == 'durgin':
        g = grip_of(base, 'Right')
        d = Vector((.05, .72, .69)).normalized()
        def build(mb, bone):
            mb.loft([xring(g + d * t_, d, .013, .013, .013, 6) for t_ in (-.14, .30, .70)], 'A_WOOD', bone)
            head_c = g + d * .70
            side = d.cross(Vector((1, 0, 0))).normalized()
            mb.loft([xring(head_c + side * t_, side, .017 * (1 - abs(t_) * 2.2), .016 * (1 - abs(t_) * 2.2), .016 * (1 - abs(t_) * 2.2), 5)
                     for t_ in (-.20, -.08, 0.0, .08, .20)], 'A_METAL', bone)
        out['Pick'] = _posed_prop(arm, base, 'RightHand', build, bm, 'Durgin_Pick', coll)
    elif tid == 'aldous':
        g = grip_of(base, 'Right')
        def build(mb, bone):
            c = g + Vector((0, 0, -.16))
            mb.loft([xring(g + Vector((0, 0, dz)), (0, 0, 1), .004, .004, .004, 4) for dz in (-.05, 0.0)], 'A_METAL', bone, smooth=False)
            mb.loft([xring(c + Vector((0, 0, dz)), (0, 0, 1), r, r, r, 6) for dz, r in ((-.07, .044), (-.06, .050), (-.05, .040), (.05, .040), (.06, .050),
                                                                                           (.075, .030), (.10, .012))], 'A_METAL', bone, smooth=False)
            mb.loft([xring(c + Vector((0, 0, dz)), (0, 0, 1), .034, .034, .034, 6) for dz in (-.05, .05)], 'A_GLASS', bone, smooth=False)
        out['Lantern'] = _posed_prop(arm, base, 'RightHand', build, bm, 'Aldous_Lantern', coll)
    elif tid == 'ilse':
        g = grip_of(base, 'Right')
        top = g.z + .66
        def build(mb, bone):
            srings = lambda spec: [xring((g.x, g.y, z), (0, 0, 1), r, r, r, 6) for z, r in spec]
            mb.loft(srings([(0.0, .013), (.5, .015), (g.z, .017), (top - .04, .018)]), 'A_WOOD', bone)
            mb.loft(srings([(top - .05, .016), (top - .02, .028), (top + .01, .016)]), 'A_WOOD', bone, smooth=False)
            c = Vector((g.x, g.y, top + .045))
            mb.loft([xring(c + Vector((0, 0, dz)), (0, 0, 1), r, r, r, 6) for dz, r in ((-.036, .006), (-.025, .026), (0.0, .036), (.025, .026), (.036, .006))],
                    'A_GEM', bone)
        out['Staff'] = _posed_prop(arm, base, 'RightHand', build, bm, 'Ilse_Staff', coll)
    elif tid == 'ansel':
        def build(mb, bone):
            c = Vector((.225, -.05, 1.17))
            mb.box(tuple(c), (.036, .15, .20), 'A_BOOK', bone)
            mb.box(tuple(c + Vector((.0, -.006, 0))), (.030, .15, .188), 'A_SHIRT', bone)
        out['Book'] = _posed_prop(arm, base, 'LeftArm', build, bm, 'Ansel_Book', coll)
    elif tid == 'maud':
        g = grip_of(base, 'Left')
        def build(mb, bone):
            c = Vector((g.x - .02, g.y - .035, g.z + .105))
            mb.box(tuple(c), (.18, .036, .25), 'A_BOOK', bone)
            mb.box(tuple(c + Vector((0, -.004, 0))), (.168, .030, .238), 'A_SHIRT', bone)
        out['Ledger'] = _posed_prop(arm, base, 'LeftHand', build, bm, 'Maud_Ledger', coll)
    return out

def build_tutor(tid, kit_objs, kit_mats):
    t = TUTORS[tid]
    bt = t['bt']
    arm = build_armature()
    arm.name = arm.data.name = 'Armature_' + tid.capitalize()
    coll = bpy.data.collections.new('Tutor_' + tid)
    bpy.context.scene.collection.children.link(coll)
    bm = {}
    for mn, m in kit_mats.items():
        m2 = m.copy()
        hx = t['colors'].get(mn)
        set_mat_color(m2, _dz(hx) if hx else '#%02x%02x%02x' % tuple(round(c * 255) for c in MAT_SRGB[m.name]))
        bm[mn] = m2
    for mn, hx in t['mats'].items():
        bm[mn] = new_mat(mn, _dz(hx))
    objs = {}
    for slot, idx in t['parts'].items():
        src = kit_objs[part_name(bt, slot, idx)]
        ob = src.copy()
        ob.data = src.data.copy()
        nm = '%s_%s' % (tid.capitalize(), slot)
        ob.name = ob.data.name = nm
        co = None
        if t.get('build') and ob.data.shape_keys:
            kb = ob.data.shape_keys.key_blocks['Build_' + t['build'].capitalize()]
            co = [v.co.copy() for v in kb.data]
        if ob.data.shape_keys:
            ob.shape_key_clear()
        if co:
            for v, c in zip(ob.data.vertices, co):
                v.co = c
        for i, ms in enumerate(ob.data.materials):
            ob.data.materials[i] = bm[ms.name.split('.')[0]]
        coll.objects.link(ob)
        ob.parent = arm
        ob.modifiers['Armature'].object = arm
        objs[ob.name] = ob
    set_build(t.get('build', 'average'))
    try:
        for ex in t['extras']:
            if ex in ('pick_shoulder', 'lantern_hand', 'staff_orb', 'book_arm', 'ledger'):
                continue
            fn, head_space = EXTRA_FN[ex]
            mb = MB()
            fn(mb, bt)
            if head_space:
                head_xform(mb)
            nm = '%s_%s' % (tid.capitalize(), ''.join(w.capitalize() for w in ex.split('_')))
            objs[nm] = mb.to_object(nm, bm, arm, coll=coll)
    finally:
        set_build('average')
    for k, ob in tutor_props(tid, arm, bm, coll).items():
        objs[ob.name] = ob
    defs = tutor_clip_defs(tid)
    ad = arm.animation_data_create()
    acts = {}
    for name, (frames, keys, loop) in defs.items():
        act = make_clip(arm, '%s_%s' % (tid, name), frames, keys)
        ad.action = None
        tr = ad.nla_tracks.new()
        tr.name = name
        st = tr.strips.new(name, 0, act)
        st.name = name
        acts[name] = act
    ad.action = None
    return arm, bm, objs, acts, defs

def export_glb(path, arm, meshes, mode='ACTIONS', morph=False):
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
              export_frame_range=False, export_skins=True, export_morph=morph, export_morph_normal=morph, export_morph_animation=False,
              export_materials='EXPORT',
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
    res['morph_targets'] = {m.get('name'): (m.get('extras') or {}).get('targetNames', []) for m in j.get('meshes', []) if (m.get('extras') or {}).get('targetNames')}
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
    def mk_grip(name, parts, bone):
        ob = mk(name, parts, bone)
        pb = arm.pose.bones[bone]
        ob.matrix_parent_inverse = Matrix.Translation((0, -pb.bone.length, 0))
        ob.matrix_basis = Matrix.Translation((0, .03, .04)) @ Euler((.18, 0, -.08)).to_matrix().to_4x4()
        return ob
    red, tan = flat('P_Red', (0.30, 0.05, 0.04)), flat('P_Tan', (0.45, 0.33, 0.18))
    grip = {'tinderbox': mk_grip('Prop_Tinderbox', [((0, 0, 0), (.035, .065, .025), red), ((0, .0, .014), (.03, .05, .004), steel)], B('RightHand')),
            'fish': mk_grip('Prop_Fish', [((0, .02, 0), (.022, .15, .045), steel), ((0, .11, 0), (.004, .04, .05), steel)], B('RightHand')),
            'net': mk_grip('Prop_Net', [((0, .10, 0), (.014, .26, .014), wood), ((0, .30, 0), (.012, .16, .16), tan)], B('RightHand'))}
    return dict(grip, **{'axe': mk('Prop_Axe', [((0, -.22, 0), (.03, .62, .03), wood), ((0, -.50, -.05), (.018, .09, .15), steel)], B('RightHand')),
            'pick': mk('Prop_Pick', [((0, -.25, 0), (.03, .66, .03), wood), ((0, -.55, 0), (.025, .04, .42), steel)], B('RightHand')),
            'sword': mk('Prop_Sword', [((0, -.42, 0), (.012, .66, .05), steel), ((0, -.08, 0), (.03, .03, .16), steel),
                                       ((0, .02, 0), (.025, .16, .025), wood)], B('RightHand'))})

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

def run_renders(arm, mats, objs, clips, bram, tutors=None):
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
        {'title': 'kit %s: default body type A (male) front / side / back -- same framing (stance pose)' % VL, 'height': 400,
         'cells': [cell(turn[('A', v)], 'A ' + v, bg=BG_REF) for v, _ in VIEWS]},
        {'title': 'kit %s: default body type B (female) front / side / back (stance pose)' % VL, 'height': 400,
         'cells': [cell(turn[('B', v)], 'B ' + v, bg=BG_REF) for v, _ in VIEWS]},
        {'title': 'Reference: Character_Creator_Screen.jpg preview vs %s defaults (3/4)' % VL, 'height': 380,
         'cells': [cell(REF_CREATOR, 'creator preview (reference)', crop=[300, 205, 528, 470]),
                   cell(turn[('A', '34')], '%s default A' % VL, bg=[74, 66, 56]), cell(turn[('B', '34')], '%s default B' % VL, bg=[74, 66, 56])]},
    ], 'Crafted Realms kit %s -- default characters vs references' % VL)
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
        {'height': 640, 'cells': [cell(REF_NPC, 'Character.jpg (reference)'), cell(bram_34, 'Guide Bram %s (3/4, idle)' % VL, bg=BG_GAME),
                                  cell(bram_front, 'front (idle f0)', bg=BG_REF), cell(bram_back, 'back (idle f0)', bg=BG_REF)]},
    ], 'Guide Bram %s -- kit parts (Hair_05 medium, Jaw_04 medium, Arms_04 large cuffed, Hands_01, Legs_01, Feet_02) + coat + staff' % VL)
    sheets['bram'] = j('bram_vs_character.png')
    # (5) key frames
    default_colors('A')
    show_only(outfit_objs(objs, 'A', DEFAULT_OUTFIT['A']))
    shots = []
    for cname, fr, vd, pr in (('idle', 30, (.55, -.82, .18), None), ('walk', 0, (.95, -.3, .15), None), ('chop', 0, (.5, -.85, .2), 'axe'),
                              ('chop', 10, (.5, -.85, .2), 'axe'), ('cast', 14, (.8, -.6, .2), None), ('run', 4, (.95, -.3, .15), None)):
        for pk in props:
            props[pk].hide_render = pk != pr
        set_clip(arm, clips[cname], fr)
        shots.append(cell(shoot(j('clip_%s_%d.png' % (cname, fr)), (360, 480), vd, (0, 0, .95), 2.1), '%s f%d' % (cname, fr), bg=BG_GAME))
    for pk in props:
        props[pk].hide_render = True
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
    # v2.7 animation strips: every clip, 8 frames, side view + game camera; loop-seam frames for looping clips
    GVs, GPs = (.42, -.72, .78), (5.0, 85)
    PROP_OF = {'chop': 'axe', 'mine': 'pick', 'attack_slash': 'sword', 'attack': 'sword', 'attack_stab': 'sword', 'attack_crush': 'sword',
               'firemake': 'tinderbox', 'cook': 'fish', 'net': 'net',
               'block': 'sword', 'smith': None}
    def strip_rows(a, acts, loops, tag, props_on):
        rows_s, seam_rows = [], []
        for cname, act in acts.items():
            f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
            loop = loops.get(cname, False)
            n = f1 - f0
            frs = [f0 + round(k * n / 8) for k in range(8)] if loop else [f0 + round(k * n / 7) for k in range(8)]
            for pk in props_on:
                props_on[pk].hide_render = pk != PROP_OF.get(cname)
            a.animation_data.action = act
            cs = []
            for fr in frs:
                bpy.context.scene.frame_set(fr)
                cs.append(cell(shoot(j('grid', 'strip_%s_%s_%d_side.png' % (tag, cname, fr)), (150, 190), (-1, .02, .10), (0, 0, .95), 2.3), '%s f%d side' % (cname, fr), bg=BG_REF))
            for fr in frs:
                bpy.context.scene.frame_set(fr)
                cs.append(cell(shoot(j('grid', 'strip_%s_%s_%d_game.png' % (tag, cname, fr)), (150, 190), GVs, (0, 0, .85), 2.0, ground=True, persp=GPs),
                               '%s f%d game' % (cname, fr), bg=BG_GAME))
            rows_s.append({'title': '%s  (%d frames, %s)' % (cname, n, 'loop' if loop else 'once'), 'height': 190, 'cells': cs})
            if loop:
                sc_ = []
                for fr, lab in ((f1 - 2, 'end-2'), (f1 - 1, 'end-1'), (f0, 'start (= end)'), (f0 + 1, 'start+1')):
                    bpy.context.scene.frame_set(fr)
                    sc_.append(cell(shoot(j('grid', 'seam_%s_%s_%d.png' % (tag, cname, fr)), (150, 190), (-1, .02, .10), (0, 0, .95), 2.3), '%s %s' % (cname, lab), bg=BG_REF))
                seam_rows.append({'title': cname, 'height': 190, 'cells': sc_})
        for pk in props_on:
            props_on[pk].hide_render = True
        a.animation_data.action = None
        return rows_s, seam_rows
    default_colors('A')
    show_only(outfit_objs(objs, 'A', DEFAULT_OUTFIT['A']))
    loops_k = {n: n not in ('attack_slash', 'attack', 'attack_stab', 'attack_crush', 'bow', 'cast', 'block', 'hit', 'death', 'wave') for n in clips}
    rs_k, seams_k = strip_rows(arm, clips, loops_k, 'A', props)
    compose(j('anim_strips_A.png'), rs_k, 'Every kit clip: 8 frames, side view (left) + game camera (right) -- default A')
    show_only(list(bobjs.values()))
    rs_b, seams_b = strip_rows(barm, bacts, {'idle': True, 'talk': True, 'walk': True, 'wave': False}, 'bram', {})
    compose(j('anim_strips_bram.png'), rs_b, 'Guide Bram clips: 8 frames, side view + game camera (staff planted / swung in walk)')
    compose(j('anim_loop_seams.png'), seams_k + seams_b, 'Loop seams: the last frames flow into the first (no pop)')
    sheets['anim_A'], sheets['anim_bram'], sheets['anim_seams'] = j('anim_strips_A.png'), j('anim_strips_bram.png'), j('anim_loop_seams.png')
    default_colors('A')
    show_only(outfit_objs(objs, 'A', DEFAULT_OUTFIT['A']))
    # (2) slot grids: one slot varied at a time on the default body
    for bt in ('A', 'B'):
        default_colors(bt)
        rows = []
        for slot in SLOTS:
            if slot not in KIT[bt]:
                continue
            cells_f, cells_b, cells_t, cells_sd, cells_q = [], [], [], [], []
            for idx in range(1, len(KIT[bt][slot]) + 1):
                sel = dict(DEFAULT_OUTFIT[bt])
                sel[slot] = idx
                if slot == 'Legs':
                    sel['Feet'] = 2   # shoes, so every hem style is visible
                show_only(outfit_objs(objs, bt, sel))
                nm = part_name(bt, slot, idx)
                lab = '%02d %s' % (idx, KIT[bt][slot][idx - 1][1])[:30]
                if slot in ('Hair', 'Jaw', 'Makeup'):
                    if slot == 'Hair':   # v2.8: true front, 3/4, side, true back and top of every hair option
                        p = shoot(j('grid', nm + '_front.png'), (240, 280), (0, -1, .10), (0, -.01, 1.55), .78)
                        pq = shoot(j('grid', nm + '_f.png'), (240, 280), (.55, -.80, .12), (0, -.01, 1.55), .78)
                        q = shoot(j('grid', nm + '_b.png'), (240, 280), (0, 1, .14), (0, -.01, 1.55), .78)
                        t = shoot(j('grid', nm + '_t.png'), (240, 240), (.05, .30, 1.0), (0, 0, 1.70), .42)
                        sd = shoot(j('grid', nm + '_s.png'), (240, 280), (-1, -.04, .06), (0, -.01, 1.55), .78)
                        cells_sd.append(cell(sd, '%02d side' % idx, bg=BG_REF))
                        cells_f.append(cell(p, lab, bg=BG_REF))
                        cells_q.append(cell(pq, '%02d 3/4' % idx, bg=BG_REF))
                        cells_b.append(cell(q, '%02d back' % idx, bg=BG_REF))
                        cells_t.append(cell(t, '%02d top' % idx, bg=BG_REF))
                    elif slot == 'Makeup':   # face close-ups, makeup shown in its default colour (rose)
                        p = shoot(j('grid', nm + '.png'), (240, 260), (0, -1, .03), (0, -.02, 1.63), .36)
                        q = shoot(j('grid', nm + '_34.png'), (240, 260), (.55, -.83, .06), (0, -.02, 1.63), .36)
                        cells_f.append(cell(p, lab, bg=BG_REF))
                        cells_b.append(cell(q, '%02d 3/4' % idx, bg=BG_REF))
                    else:
                        p = shoot(j('grid', nm + '.png'), (240, 280), (.55, -.80, .10), (0, -.02, 1.60), .50)
                        q = shoot(j('grid', nm + '_side.png'), (240, 280), (-1, -.05, .05), (0, -.02, 1.60), .50)
                        cells_f.append(cell(p, lab, bg=BG_REF))
                        cells_b.append(cell(q, '%02d side' % idx, bg=BG_REF))
                else:   # close-up on the slot's own region
                    ctr, orth, vd = GRID_VIEW[slot]
                    p = shoot(j('grid', nm + '.png'), (250, 300), vd, ctr, orth)
                    cells_f.append(cell(p, lab, bg=BG_REF))
            rows.append({'title': '%s (%d)%s' % (slot, len(cells_f), ' -- front' if slot == 'Hair' else ''), 'height': 280 if slot != 'Hair' else 260, 'cells': cells_f})
            if cells_q:
                rows.append({'title': '%s -- 3/4 view' % slot, 'height': 260, 'cells': cells_q})
            if cells_b:
                rows.append({'title': '%s -- %s view' % (slot, {'Hair': 'back', 'Makeup': '3/4'}.get(slot, 'side')), 'height': 260, 'cells': cells_b})
            if cells_sd:
                rows.append({'title': '%s -- side view (neck / skull base)' % slot, 'height': 260, 'cells': cells_sd})
            if cells_t:
                rows.append({'title': '%s -- top view' % slot, 'height': 220, 'cells': cells_t})
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
        {'title': 'male_b_turnaround.png  vs  %s default A (front / side / back, stance pose)' % VL, 'height': 360,
         'cells': [cell(REF_TURN, 'reference')] + [cell(turn[('A', v)], VL + ' ' + v, bg=BG_REF) for v, _ in VIEWS]},
        {'title': 'Character.jpg vs Guide Bram %s  |  creator preview vs %s defaults' % (VL, VL), 'height': 420,
         'cells': [cell(REF_NPC, 'reference'), cell(bram_34, 'Bram ' + VL, bg=BG_GAME), cell(REF_CREATOR, 'creator (reference)', crop=[300, 205, 528, 470]),
                   cell(turn[('A', '34')], 'v2 A', bg=[74, 66, 56]), cell(turn[('B', '34')], 'v2 B', bg=[74, 66, 56])]},
    ], 'compare.png -- %s renders next to their references' % VL)
    sheets['compare'] = j('compare.png')
    # (e) v1 vs v2
    # joints: every torso x arms, torso x legs (front + back) and legs x feet combination
    for bt in ('A', 'B'):
        default_colors(bt)
        rows = []
        torsos = list(range(1, len(KIT[bt]['Torso']) + 1))
        for slot, ctr, orth, vd, tag in (('Arms', (0, 0, 1.18), 1.15, (.55, -.83, .10), 'front'),
                                         ('Legs', (0, 0, .78), 1.25, (.55, -.83, .10), 'front'),
                                         ('Legs', (0, 0, .78), 1.25, (-.55, .83, .10), 'back')):
            for idx in range(1, len(KIT[bt][slot]) + 1):
                cells_j = []
                for ti in torsos:
                    sel = dict(DEFAULT_OUTFIT[bt])
                    sel[slot] = idx
                    sel['Torso'] = ti
                    show_only(outfit_objs(objs, bt, sel))
                    p = shoot(j('grid', 'joint_%s_%s%02d_T%02d_%s.png' % (bt, slot, idx, ti, tag)), (150, 180), vd, ctr, orth)
                    cells_j.append(cell(p, 'T%02d %s' % (ti, KIT[bt]['Torso'][ti - 1][0])[:20], bg=BG_REF))
                rows.append({'title': '%s %02d %s x every torso (%s)' % (slot, idx, KIT[bt][slot][idx - 1][0], tag), 'height': 170, 'cells': cells_j})
        for li in range(1, len(KIT[bt]['Legs']) + 1):
            cells_j = []
            for fi in range(1, len(KIT[bt]['Feet']) + 1):
                sel = dict(DEFAULT_OUTFIT[bt])
                sel['Legs'] = li
                sel['Feet'] = fi
                show_only(outfit_objs(objs, bt, sel))
                for vtag, vd in (('34', (.55, -.83, .12)), ('side', (-1, .02, .10))):
                    p = shoot(j('grid', 'joint_%s_L%02d_F%02d_%s.png' % (bt, li, fi, vtag)), (150, 180), vd, (0, 0, .24), .62)
                    cells_j.append(cell(p, 'F%02d %s %s' % (fi, KIT[bt]['Feet'][fi - 1][0], vtag), bg=BG_REF))
            rows.append({'title': 'Legs %02d %s x every feet option (ankle)' % (li, KIT[bt]['Legs'][li - 1][0]), 'height': 170, 'cells': cells_j})
        compose(j('joints_%s.png' % bt), rows, 'Body %s joints: torso x arms, torso x legs (front + back), legs x feet' % bt)
        sheets['joints_' + bt] = j('joints_%s.png' % bt)
    # ankle close-ups in motion + neutral face close-ups
    cells_a = []
    for bt in ('A', 'B'):
        default_colors(bt)
        for fi in range(1, len(KIT[bt]['Feet']) + 1):
            sel = dict(DEFAULT_OUTFIT[bt])
            sel['Feet'] = fi
            if bt == 'B':
                sel['Legs'] = 4   # plain trousers so the ankle is visible
            show_only(outfit_objs(objs, bt, sel))
            for cname, fr in (('walk', 0), ('walk', 6), ('run', 4)):
                arm.animation_data.action = clips[cname]
                bpy.context.scene.frame_set(fr)
                p = shoot(j('grid', 'ankle_%s_F%02d_%s%d.png' % (bt, fi, cname, fr)), (200, 200), (-1, .05, .12), (0, 0, .30), .75)
                cells_a.append(cell(p, '%s F%02d %s f%d' % (bt, fi, cname, fr), bg=BG_REF))
    arm.animation_data.action = None
    set_pose(arm, P())
    compose(j('ankle_closeups.png'), [{'height': 200, 'cells': cells_a[:9]}, {'height': 200, 'cells': cells_a[9:]}],
            'Ankles in motion: every feet option joins the leg (walk f0 / f6, run f4)')
    sheets['ankles'] = j('ankle_closeups.png')
    cells_f = []
    for bt in ('A', 'B'):
        default_colors(bt)
        show_only(outfit_objs(objs, bt, DEFAULT_OUTFIT[bt]))
        for tag, vd in (('front', (0, -1, .02)), ('34', (.55, -.83, .06)), ('side', (-1, -.03, .04))):
            p = shoot(j('grid', 'face_%s_%s.png' % (bt, tag)), (280, 300), vd, (0, -.02, 1.63), .40)
            cells_f.append(cell(p, '%s %s (neutral)' % (bt, tag), bg=BG_REF))
    compose(j('face_closeups.png'), [{'height': 300, 'cells': cells_f}], 'Neutral faces: level brows and eyes, straight mouth, clean jaw wedge')
    sheets['faces'] = j('face_closeups.png')
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
    compose(j('game_camera.png'), [{'height': 520, 'cells': gcells}], 'Game camera (~45 deg down, 5 m, 85 mm), idle clip: %s vs the 2004-era references' % VL)
    sheets['game_camera'] = j('game_camera.png')
    sheets.update(v28_sheets(arm, mats, objs, clips, default_colors, j, turn, bram_34))
    sheets.update(v29_sheets(arm, mats, objs, clips, default_colors, j, turn, bram_34, bram, tutors or {}))
    sheets.update(rs_style_sheets(arm, mats, objs, clips, default_colors, j))
    sheets.update(v30_sheets(arm, mats, objs, clips, default_colors, j))
    sheets.update(v31_sheets(arm, mats, objs, clips, default_colors, j))
    return sheets

# ------------------------------------------------------------------------------------------
# v3.1 review sheets: the stance next to the references and v3.0 (front / side / 3-4, both bodies, measured), every emote
# as a strip of frames, the emote key poses up close
# ------------------------------------------------------------------------------------------
V30_STANCE = {'LeftUpLeg': (-2.5, -3, 6), 'RightUpLeg': (-2.5, 3, -6), 'LeftLeg': (5, 0, 0), 'RightLeg': (5, 0, 0),
              'LeftFoot': (-2.5, 3, 0), 'RightFoot': (-2.5, -3, 0),
              'Spine1': (2, 0, 0), 'Spine2': (-4, 0, 0), 'Neck': (6, 0, 0), 'Head': (-4, 0, 0)}
V30_ARM_AIM = {'LeftArm': (.155, .016, -.250), 'LeftForeArm': (.045, -.500, -.865), 'LeftHand': (.035, -.560, -.828)}
V30_ARM_AIM.update({k.replace('Left', 'Right'): (-v[0], v[1], v[2]) for k, v in list(V30_ARM_AIM.items())})

def swap_stance(st, aims):
    """use another stance for a comparison render; returns the one to put back"""
    old = (dict(STANCE), dict(STANCE_ARM_AIM))
    STANCE.clear(); STANCE.update(st)
    STANCE_ARM_AIM.clear(); STANCE_ARM_AIM.update(aims)
    _STANCE_LOCAL.clear()
    return old

def stance_metrics(pose):
    """the idle stance, measured on the posed skeleton (degrees / metres; +y = back, +x = the character's left)"""
    hd, acc = fk(pose)
    m = {'spine_lean_deg': round(chain_tilt(pose, 'Neck'), 2), 'hips_to_head_lean_deg': round(chain_tilt(pose, 'Head'), 2)}
    fw = acc[B('Head')] @ Vector((0, -1, 0))
    m['face_pitch_up_deg'] = round(math.degrees(math.atan2(fw.z, -fw.y)), 1)
    m['head_joint_behind_hips_m'] = round(hd[B('Head')].y - hd[B('Hips')].y, 3)
    s_, e, w = hd[B('LeftArm')], hd[B('LeftForeArm')], hd[B('LeftHand')]
    ua, fa, sw = e - s_, w - e, w - s_
    m['elbow_flex_deg'] = round(math.degrees(ua.angle(fa)), 1)
    m['forearm_forward_deg'] = round(math.degrees(math.atan2(-fa.y, -fa.z)), 1)
    m['shoulder_to_wrist_out_deg'] = round(math.degrees(math.atan2(sw.x, -sw.z)), 1)
    m['shoulder_to_wrist_forward_deg'] = round(math.degrees(math.atan2(-sw.y, -sw.z)), 1)
    a, k, f = hd[B('LeftUpLeg')], hd[B('LeftLeg')], hd[B('LeftFoot')]
    m['knee_flex_deg'] = round(math.degrees((k - a).angle(f - k)), 1)
    m['ankle_behind_hip_m'] = round(f.y - a.y, 3)
    m['feet_apart_m'] = round(2 * f.x, 3)
    return m

def v31_sheets(arm, mats, objs, clips, default_colors, j):
    sheets = {}
    REF_DAGGER = os.path.join(BIBLE, 'DragonDagger_Equiped.jpg')
    arm.animation_data.action = None
    cs, metrics = {}, {}
    for lab, st in (('v3.0', (V30_STANCE, V30_ARM_AIM)), (VL, None)):
        old = swap_stance(*st) if st else None
        pose = upright(P())
        metrics[lab] = stance_metrics(pose)
        set_pose(arm, pose)
        for bt in ('A', 'B'):
            default_colors(bt)
            show_only(outfit_objs(objs, bt, DEFAULT_OUTFIT[bt]))
            for vn, vd, res, ctr, orth, bg in (('front', (0, -1, 0), TURN_RES, TURN_CENTER, TURN_ORTHO, BG_REF),
                                               ('side', (-1, 0, 0), TURN_RES, TURN_CENTER, TURN_ORTHO, BG_REF),
                                               ('34', (.42, -.86, .22), (300, 420), (0, 0, .93), 2.0, [74, 66, 56])):
                pth = shoot(j('grid', 'stance_%s_%s_%s.png' % (lab.replace('.', ''), bt, vn)), res, vd, ctr, orth)
                cs.setdefault((bt, vn), []).append(cell(pth, '%s %s' % (lab, bt), bg=bg))
        if old:
            swap_stance(*old)
    set_pose(arm, P())
    rows = [
        {'title': 'FRONT, idle: male_b concept | A v3.0 | A %s | B v3.0 | B %s' % (VL, VL), 'height': 430,
         'cells': [cell(REF_TURN, 'male_b front (ref)', crop=[80, 70, 480, 720])] + cs[('A', 'front')] + cs[('B', 'front')]},
        {'title': 'SIDE, idle: male_b concept | A v3.0 | A %s | B v3.0 | B %s  -- stands up: legs plumb, head over the shoulders' % (VL, VL), 'height': 430,
         'cells': [cell(REF_TURN, 'male_b side (ref)', crop=[590, 70, 830, 720])] + cs[('A', 'side')] + cs[('B', 'side')]},
        {'title': '3/4 (creator angle): creator | Character.jpg | DragonDagger | A v3.0 | A %s | B v3.0 | B %s' % (VL, VL), 'height': 430,
         'cells': [cell(REF_CREATOR, 'creator (ref)', crop=[310, 210, 520, 470]), cell(REF_NPC, 'Character.jpg (ref)', crop=[180, 90, 440, 720]),
                   cell(REF_DAGGER, 'DragonDagger (ref)', crop=[430, 150, 880, 1420])] + cs[('A', '34')] + cs[('B', '34')]},
    ]
    note = '; '.join('%s: spine %.1f, face up %.1f, elbow %.0f, shoulder->wrist out %.0f / fwd %.0f, knee %.0f, ankle behind hip %.3f m' % (
        k, v['spine_lean_deg'], v['face_pitch_up_deg'], v['elbow_flex_deg'], v['shoulder_to_wrist_out_deg'], v['shoulder_to_wrist_forward_deg'],
        v['knee_flex_deg'], v['ankle_behind_hip_m']) for k, v in metrics.items())
    compose(j('v31_stance_compare.png'), rows, 'Stance %s vs v3.0 next to the references -- %s' % (VL, note))
    sheets['stance_compare'] = j('v31_stance_compare.png')
    sheets['stance_metrics'] = metrics
    print('[STANCE]', json.dumps(metrics))
    # emote strips: every emote, seven frames across the clip, both bodies
    names = ['emote_' + e for e in EMOTES]
    VIEW = (.55, -.80, .22)
    for bt in ('A', 'B'):
        default_colors(bt)
        show_only(outfit_objs(objs, bt, DEFAULT_OUTFIT[bt]))
        rows = []
        for n in names:
            act = clips[n]
            arm.animation_data.action = act
            f1 = int(act.frame_range[1])
            cells = []
            for fr in sorted({int(round(f1 * t)) for t in (0.0, .15, .3, .45, .6, .75, .9)}):
                bpy.context.scene.frame_set(fr)
                cells.append(cell(shoot(j('grid', 'emote_%s_%s_%d.png' % (bt, n[6:], fr)), (150, 190), VIEW, (0, 0, 1.0), 2.35), 'f%d' % fr, bg=BG_REF))
            rows.append({'title': '%s  (%d frames, %.1f s)' % (n, f1, f1 / FPS), 'height': 200, 'cells': cells})
        for part in range(0, len(rows), 11):
            key = 'emotes_%s_%d' % (bt, part // 11 + 1)
            compose(j('v31_%s.png' % key), rows[part:part + 11], '%s emotes, body %s (default outfit): frames across each clip' % (VL, bt))
            sheets[key] = j('v31_%s.png' % key)
    # key poses up close
    KEYS = [('yes', 5), ('no', 6), ('bow', 18), ('angry', 13), ('think', 26), ('wave', 17), ('shrug', 16), ('cheer', 19), ('beckon', 16),
            ('laugh', 12), ('jump_for_joy', 17), ('yawn', 28), ('yawn', 38), ('dance', 8), ('jig', 6), ('spin', 16), ('headbang', 5),
            ('cry', 25), ('blow_kiss', 14), ('blow_kiss', 30), ('panic', 11), ('raspberry', 16), ('clap', 12), ('clap', 16), ('salute', 24)]
    rows = []
    for bt in ('A', 'B'):
        default_colors(bt)
        show_only(outfit_objs(objs, bt, DEFAULT_OUTFIT[bt]))
        cells = []
        for n, fr in KEYS:
            arm.animation_data.action = clips['emote_' + n]
            bpy.context.scene.frame_set(fr)
            full = n in ('jump_for_joy', 'jig', 'spin', 'dance', 'bow', 'panic', 'cheer', 'yawn')
            cells.append(cell(shoot(j('grid', 'emotekey_%s_%s_%d.png' % (bt, n, fr)), (230, 290), (.45, -.85, .2), (0, 0, 1.0 if full else 1.30),
                                    2.3 if full else 1.25), '%s f%d' % (n, fr), bg=BG_REF))
        for i in range(0, len(cells), 9):
            rows.append({'title': 'body %s' % bt, 'height': 300, 'cells': cells[i:i + 9]})
    compose(j('v31_emote_keys.png'), rows, '%s emote key poses (3/4 front): hands on the chin / mouth / eyes / ears / brow / belly follow the body' % VL)
    sheets['emote_keys'] = j('v31_emote_keys.png')
    arm.animation_data.action = None
    return sheets

def v29_sheets(arm, mats, objs, clips, default_colors, j, turn, bram_34, bram, tutors):
    """v2.9 proof: creator builds (slim / average / stout) and feet sizes, face before/after, lean check, tutor lineup +
    close-ups + clip frames, v2.8 vs v2.9"""
    sheets = {}
    sc = bpy.context.scene
    def outfit(bt, **over):
        sel = dict(DEFAULT_OUTFIT[bt])
        sel.update(over)
        return outfit_objs(objs, bt, sel)
    def morph(obs, **vals):
        for o in objs.values():
            if o.data.shape_keys:
                for kb in o.data.shape_keys.key_blocks[1:]:
                    kb.value = vals.get(kb.name, 0.0)
    def rest():
        arm.animation_data.action = None
        set_pose(arm, P())
    rest()
    # (1) creator: body build
    rows = []
    looks = {'A': [({}, 'default'), (dict(Torso=3, Legs=2, Arms=2), 'vest + shorts + bare arms'), (dict(Torso=6, Legs=3, Arms=3), 'gambeson + flares + loose sleeves')],
             'B': [({}, 'default'), (dict(Torso=2, Legs=2, Arms=3), 'sports top + short skirt + bare arms'), (dict(Torso=4, Legs=4, Arms=5), 'laced shirt + trousers + cuffs')]}
    for bt in ('A', 'B'):
        default_colors(bt)
        for over, lab in looks[bt]:
            cs = []
            for bname, vals in (('Slim', {'Build_Slim': 1.0}), ('Average', {}), ('Stout', {'Build_Stout': 1.0})):
                show_only(outfit(bt, **over))
                morph(None, **vals)
                arm.animation_data.action = clips['idle']
                sc.frame_set(0)
                for vt, vd in (('front', (0, -1, .05)), ('side', (-1, .02, .05)), ('3/4', V34)):
                    pth = shoot(j('grid', 'build_%s_%s_%s_%s.png' % (bt, lab[:6].replace(' ', ''), bname, vt.replace('/', ''))), (230, 360), vd, (0, 0, .93), 2.05)
                    cs.append(cell(pth, '%s %s' % (bname, vt), bg=BG_REF))
            rows.append({'title': 'Body %s -- %s: Build_Slim 1.0 / average / Build_Stout 1.0 (idle f0)' % (bt, lab), 'height': 300, 'cells': cs})
    morph(None)
    compose(j('creator_builds.png'), rows, 'Creator body build: morphs Build_Slim / Build_Stout on every part -- clothes follow the body')
    sheets['creator_builds'] = j('creator_builds.png')
    # (2) creator: feet sizes (Feet_Small / default / Feet_Large = v2.8), hems meeting the feet
    rows = []
    for bt in ('A', 'B'):
        default_colors(bt)
        for fi in (1, 2, 3):
            for li in ((1, 3) if bt == 'A' else (4, 6)):
                cs = []
                for fname, vals in (('Small', {'Feet_Small': 1.0}), ('Normal (v2.9 default)', {}), ('Large (= v2.8)', {'Feet_Large': 1.0})):
                    show_only(outfit(bt, Feet=fi, Legs=li))
                    morph(None, **vals)
                    rest()
                    pth = shoot(j('grid', 'feet_%s_F%d_L%d_%s.png' % (bt, fi, li, fname[:5])), (220, 200), (.55, -.80, .25), (0, -.02, .15), .62)
                    cs.append(cell(pth, fname, bg=BG_REF))
                    pth = shoot(j('grid', 'feet_%s_F%d_L%d_%s_side.png' % (bt, fi, li, fname[:5])), (220, 200), (-1, .02, .08), (0, -.02, .15), .62)
                    cs.append(cell(pth, fname + ' side', bg=BG_REF))
                rows.append({'title': 'Body %s -- Feet %02d %s with Legs %02d %s' % (bt, fi, KIT[bt]['Feet'][fi - 1][0], li, KIT[bt]['Legs'][li - 1][0]),
                             'height': 170, 'cells': cs})
    morph(None)
    compose(j('creator_feet.png'), rows, 'Creator feet size: Feet_Small / default (v2.9, smaller) / Feet_Large (= v2.8 size); trouser hems still meet the feet')
    sheets['creator_feet'] = j('creator_feet.png')
    # (3) face before / after
    rows = []
    for bt in ('A', 'B'):
        default_colors(bt)
        show_only(outfit(bt))
        rest()
        cs = []
        for tag, vd in (('front', (0, -1, .02)), ('3/4', (.55, -.83, .06)), ('side', (-1, -.03, .04))):
            old = os.path.join(PREV_DIR, 'grid', 'face28_%s_%s.png' % (bt, tag.replace('/', '')))
            new = shoot(j('grid', 'face29_%s_%s.png' % (bt, tag.replace('/', ''))), (260, 280), vd, (0, -.02, 1.63), .40)
            if os.path.exists(old):
                cs.append(cell(old, 'v2.8 %s' % tag, bg=BG_REF))
            cs.append(cell(new, 'v2.9 %s (thinner)' % tag, bg=BG_REF))
        rows.append({'title': 'Body %s: head width x1.12 -> x1.065, jaw rows taper more' % bt, 'height': 280, 'cells': cs})
    compose(j('face_before_after.png'), rows, 'Face: v2.8 vs v2.9 (a bit thinner by default, both bodies)')
    sheets['face_before_after'] = j('face_before_after.png')
    # (4) lean check: side view with a vertical line through the posed hips joint
    lm = bpy.data.materials.new('LeanLine')
    lm.use_nodes = True
    bsdf = next(n for n in lm.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (.9, .05, .05, 1)
    if 'Emission Color' in bsdf.inputs:
        bsdf.inputs['Emission Color'].default_value = (1, .05, .05, 1)
        bsdf.inputs['Emission Strength'].default_value = 2.0
    bmx = bmesh.new()
    bmesh.ops.create_cube(bmx, size=1.0)
    for v in bmx.verts:
        v.co = Vector((v.co.x * .004, v.co.y * .006, v.co.z * 2.1 + 1.05))
    lme = bpy.data.meshes.new('LeanLine')
    bmx.to_mesh(lme)
    bmx.free()
    lme.materials.append(lm)
    line = bpy.data.objects.new('LeanLine', lme)
    sc.collection.objects.link(line)
    rows = []
    for bt in ('A', 'B'):
        default_colors(bt)
        vis = outfit(bt)
        cs = []
        for cname, fr in (('idle', 0), ('idle', 30), ('walk', 0), ('walk', 4), ('walk', 8), ('walk', 11), ('run', 4), ('run', 12)):
            show_only(vis + [line])
            arm.animation_data.action = clips[cname]
            sc.frame_set(fr)
            h = arm.matrix_world @ arm.pose.bones[B('Hips')].head
            hd = arm.matrix_world @ arm.pose.bones[B('Head')].head
            tilt = math.degrees(math.atan2(-(hd - h).y, (hd - h).z))
            line.location = (-.40, h.y, 0)
            pth = shoot(j('grid', 'lean_%s_%s_%d.png' % (bt, cname, fr)), (220, 360), (-1, 0, 0), (0, 0, .93), 2.1)
            cs.append(cell(pth, '%s f%d: %+.1f deg' % (cname, fr, tilt), bg=BG_REF))
        rows.append({'title': 'Body %s side view -- red line = vertical through the hips joint; number = measured hips->head forward tilt' % bt,
                     'height': 360, 'cells': cs})
    line.hide_render = True
    arm.animation_data.action = None
    compose(j('lean_check.png'), rows, 'Lean check: the spine chain (hips -> neck base) is vertical in idle and walk (0.0 deg); the number is hips -> head, '
            'i.e. incl. the head carried a touch forward (~1 deg); run capped at 3 deg')
    sheets['lean_check'] = j('lean_check.png')
    # (5) tutors
    if tutors:
        barm, bobjs, bacts = bram
        GV, GC, GP = (.42, -.72, .78), (0, 0, .85), (5.0, 85)
        lineup = [cell(REF_NPC, 'Character.jpg (reference)')]
        order = [('bram', 'Guide Bram', barm, bobjs, bacts)] + [(tid, TUTORS[tid]['name'], a_, o_, c_) for tid, (a_, o_, c_) in tutors.items()]
        for tid, nm, tarm, tobjs, tacts in order:
            for tr in (tarm.animation_data.nla_tracks if tarm.animation_data else []):
                tr.mute = True
        for tid, nm, tarm, tobjs, tacts in order:
            show_only(list(tobjs.values()))
            tarm.animation_data.action = tacts['idle']
            sc.frame_set(0)
            lineup.append(cell(shoot(j('grid', 'tutor_game_%s.png' % tid), (300, 470), GV, GC, 2.0, ground=True, persp=GP), nm, bg=BG_GAME))
        compose(j('tutor_lineup.png'), [{'height': 440, 'cells': lineup[:6]}, {'height': 440, 'cells': lineup[6:]}],
                'Tutor lineup at the game camera (~45 deg down, 5 m, 85 mm), idle f0 -- all built from the kit + their own extras')
        sheets['tutor_lineup'] = j('tutor_lineup.png')
        rows = []
        for tid, nm, tarm, tobjs, tacts in order[1:]:
            show_only(list(tobjs.values()))
            cs = []
            tarm.animation_data.action = tacts['idle']
            sc.frame_set(0)
            for vt, vd in (('front', (0, -1, .05)), ('3/4', V34), ('side', (-1, .02, .05)), ('back', (0, 1, .08))):
                cs.append(cell(shoot(j('grid', 'tutor_%s_%s.png' % (tid, vt.replace('/', ''))), (260, 400), vd, (0, 0, .95), 2.1), '%s %s' % (nm, vt), bg=BG_REF))
            for cname, fr, vd in (('talk', 12, (.55, -.82, .18)), ('wave', 14, (.55, -.82, .18)), ('walk', 0, (-1, .02, .1)), ('walk', 14, (-1, .02, .1))):
                tarm.animation_data.action = tacts[cname]
                sc.frame_set(fr)
                cs.append(cell(shoot(j('grid', 'tutor_%s_%s%d.png' % (tid, cname, fr)), (260, 400), vd, (0, 0, .95), 2.1), '%s f%d' % (cname, fr), bg=BG_GAME))
            tarm.animation_data.action = None
            rows.append({'title': '%s (%s) -- %s' % (nm, TUTORS[tid]['role'], ', '.join(TUTORS[tid]['extras'])), 'height': 330, 'cells': cs})
        compose(j('tutor_closeups.png'), rows, 'Tutors close: front / 3/4 / side / back (idle), talk, wave, walk')
        sheets['tutor_closeups'] = j('tutor_closeups.png')
        # faces close
        cs = []
        for tid, nm, tarm, tobjs, tacts in order:
            show_only(list(tobjs.values()))
            tarm.animation_data.action = tacts['idle']
            sc.frame_set(0)
            cs.append(cell(shoot(j('grid', 'tutor_face_%s.png' % tid), (240, 260), (.45, -.88, .06), (0, -.02, 1.66), .52), nm, bg=BG_REF))
            tarm.animation_data.action = None
        compose(j('tutor_faces.png'), [{'height': 250, 'cells': cs[:5]}, {'height': 250, 'cells': cs[5:]}], 'Tutor heads close (3/4)')
        sheets['tutor_faces'] = j('tutor_faces.png')
    # (6) v2.8 vs v2.9
    prev = PREV_DIR
    if os.path.isdir(prev):
        pg = lambda n: os.path.join(prev, 'grid', n)
        pair = lambda old, new, lab, bg=BG_REF: [cell(old, 'v2.8 ' + lab, bg=bg), cell(new, 'v2.9 ' + lab, bg=bg)]
        rows = [
            {'title': 'Defaults (front) and game camera', 'height': 460,
             'cells': pair(os.path.join(prev, 'turn_A_front.png'), turn[('A', 'front')], 'A') + pair(os.path.join(prev, 'turn_B_front.png'), turn[('B', 'front')], 'B')
             + pair(os.path.join(prev, 'game_A.png'), j('game_A.png'), 'game A', BG_GAME) + pair(os.path.join(prev, 'game_B.png'), j('game_B.png'), 'game B', BG_GAME)},
            {'title': 'Walk (side): v2.8 20 frames, 0.80 m step, sway + roll  ->  v2.9 15 frames, 0.60 m step, upright, no sway / roll', 'height': 200,
             'cells': sum((pair(pg('strip_A_walk_%d_side.png' % f0), j('grid', 'strip_A_walk_%d_side.png' % f1), 'walk f%d' % f1)
                           for f0, f1 in ((0, 0), (5, 4), (10, 8), (15, 11))), [])},
            {'title': 'Idle (side)', 'height': 200, 'cells': pair(pg('strip_A_idle_0_side.png'), j('grid', 'strip_A_idle_0_side.png'), 'idle f0')
             + pair(pg('strip_A_cook_0_side.png'), j('grid', 'strip_A_cook_0_side.png'), 'cook f0') + pair(pg('strip_A_net_0_side.png'), j('grid', 'strip_A_net_0_side.png'), 'net f0')},
            {'title': 'Feet (v2.9 default is smaller; v2.8 size = Feet_Large)', 'height': 250,
             'cells': sum((pair(pg('Kit_A_Feet_%02d.png' % i), j('grid', 'Kit_A_Feet_%02d.png' % i), 'A F%02d' % i) for i in (1, 2, 3)), [])},
        ]
        rows = [{**r, 'cells': [c for c in r['cells'] if os.path.exists(c['path'])]} for r in rows]
        compose(j('v28_vs_v29.png'), rows, 'v2.8 vs v2.9 (same framing)')
        sheets['v28_vs_v29'] = j('v28_vs_v29.png')
    return sheets

def v30_sheets(arm, mats, objs, clips, default_colors, j):
    """v3.0 review sheets: (b) every torso x arms shoulder at rest / the widest walk swing / the attack wind-up and the
    overhead crush, (c) every feet option with three legs options (rest + walk), (d) walk and run strips, both bodies"""
    sheets = {}
    sc = bpy.context.scene
    def outfit(bt, **over):
        sel = dict(DEFAULT_OUTFIT[bt])
        sel.update(over)
        return outfit_objs(objs, bt, sel)
    def pose(clip, fr):
        if clip is None:   # the true bind pose (no rotations)
            arm.animation_data.action = None
            clear_pose(arm)
        else:
            arm.animation_data.action = clips[clip]
            sc.frame_set(fr)
    def shoulder_center(side, raised=False):
        bpy.context.view_layer.update()
        return tuple(arm.matrix_world @ arm.pose.bones[B(side + 'Arm')].head + Vector(((.07 if side == 'Left' else -.07), 0, .03 if raised else -.05)))
    # (b) shoulders
    STATES = [('rest (bind pose)', None, 0, 'Left', (.60, -.80, .15)), ('idle f0', 'idle', 0, 'Left', (.60, -.80, .15)),
              ('walk f0 (widest swing)', 'walk', 0, 'Left', (.55, .80, .18)), ('walk f7 (widest swing)', 'walk', 7, 'Left', (.60, -.80, .15)),
              ('attack_slash f5 (sword arm wound up)', 'attack_slash', 5, 'Right', (-.55, -.80, .20)),
              ('attack_crush f8 (both arms overhead)', 'attack_crush', 8, 'Right', (-.55, .80, .20))]
    for bt in ('A', 'B'):
        default_colors(bt)
        rows = []
        for ai in range(1, len(KIT[bt]['Arms']) + 1):
            for lab, clip, fr, side, vd in STATES:
                cs = []
                for ti in range(1, len(KIT[bt]['Torso']) + 1):
                    show_only(outfit(bt, Arms=ai, Torso=ti, Hair=2))
                    pose(clip, fr)
                    raised = clip in ('attack_slash', 'attack_crush')
                    p = shoot(j('grid', TAG + 'sh_%s_A%02d_T%02d_%s%d.png' % (bt, ai, ti, clip or 'rest', fr)), (170, 170), vd, shoulder_center(side, raised),
                              .50 if raised else .40)
                    cs.append(cell(p, 'T%02d %s' % (ti, KIT[bt]['Torso'][ti - 1][0])[:22], bg=BG_REF))
                rows.append({'title': 'Arms %02d %s -- %s' % (ai, KIT[bt]['Arms'][ai - 1][0], lab), 'height': 150, 'cells': cs})
        pose(None, 0)
        compose(j(TAG + '_shoulders_%s.png' % bt), rows, VL + ' body %s shoulders: every arms option on every torso -- one surface from the torso into the arm '
                '(shared seam ring, pinned normals, deltoid cap), at rest and at the extreme walk / attack frames' % bt)
        sheets['shoulders_' + bt] = j(TAG + '_shoulders_%s.png' % bt)
    # (c) feet
    rows = []
    for bt, legs in (('A', (1, 3, 2)), ('B', (4, 1, 6))):
        default_colors(bt)
        for fi in range(1, len(KIT[bt]['Feet']) + 1):
            cs = []
            for li in legs:
                show_only(outfit(bt, Feet=fi, Legs=li, Hair=2))
                for lab, clip, fr, vd in (('3/4', None, 0, (.55, -.80, .25)), ('side', None, 0, (-1, .02, .08)), ('front', None, 0, (0, -1, .15)),
                                          ('walk f4', 'walk', 4, (-1, .03, .10))):
                    pose(clip, fr)
                    ctr = (0, -.02, .15) if clip is None else (0, 0, .20)
                    p = shoot(j('grid', TAG + 'ft_%s_F%02d_L%02d_%s.png' % (bt, fi, li, lab.replace('/', '').replace(' ', ''))), (180, 170), vd, ctr, .55 if clip is None else .75)
                    cs.append(cell(p, 'L%02d %s %s' % (li, KIT[bt]['Legs'][li - 1][0], lab)[:26], bg=BG_REF))
            rows.append({'title': 'Body %s -- Feet %02d %s with legs %s' % (bt, fi, KIT[bt]['Feet'][fi - 1][0], ', '.join(KIT[bt]['Legs'][li - 1][0] for li in legs)),
                         'height': 160, 'cells': cs})
    pose(None, 0)
    compose(j(TAG + '_feet.png'), rows, VL + ' feet: rounded wedges (one loft sole -> toe box -> ankle -> shaft), every option x three legs options')
    sheets['feet'] = j(TAG + '_feet.png')
    # (d) walk + run strips (8 frames each, side view + game camera), both bodies
    rows = []
    GVs, GPs = (.42, -.72, .78), (5.0, 85)
    for bt in ('A', 'B'):
        default_colors(bt)
        show_only(outfit(bt))
        for cname in ('walk', 'run'):
            act = clips[cname]
            f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
            frs = [f0 + round(k * (f1 - f0) / 8) for k in range(8)]
            for view in ('side', 'game'):
                cs = []
                for fr in frs:
                    pose(cname, fr)
                    if view == 'side':
                        p = shoot(j('grid', TAG + 'strip_%s_%s_%d_side.png' % (bt, cname, fr)), (170, 220), (-1, .02, .10), (0, 0, .95), 2.3)
                        cs.append(cell(p, '%s f%d side' % (cname, fr), bg=BG_REF))
                    else:
                        p = shoot(j('grid', TAG + 'strip_%s_%s_%d_game.png' % (bt, cname, fr)), (170, 220), GVs, (0, 0, .85), 2.0, ground=True, persp=GPs)
                        cs.append(cell(p, '%s f%d game' % (cname, fr), bg=BG_GAME))
                rows.append({'title': 'Body %s %s (%d frames%s) -- %s' % (bt, cname, f1 - f0, ', 2.4 m/s' if cname == 'walk' else ', 4.2 m/s', view),
                             'height': 220, 'cells': cs})
    pose(None, 0)
    compose(j(TAG + '_walk_run.png'), rows, VL + ' walk and run: upright, the stance arms swing from the shoulder; slide-free at the authored speeds')
    sheets['walk_run'] = j(TAG + '_walk_run.png')
    return sheets

def v28_sheets(arm, mats, objs, clips, default_colors, j, turn, bram_34):
    """v2.8 proof sheets: every arms x torso at the shoulder cap, wrist close-ups, every legs x sandals (rest + motion),
    makeup / face close-ups, back of the neck, and v2.7 vs v2.8"""
    sheets = {}
    def outfit(bt, **over):
        sel = dict(DEFAULT_OUTFIT[bt])
        sel.update(over)
        return outfit_objs(objs, bt, sel)
    def set_clip(act, fr):
        arm.animation_data.action = act
        bpy.context.scene.frame_set(fr)
    def rest():
        arm.animation_data.action = None
        set_pose(arm, P())
    def bone_head(short):
        bpy.context.view_layer.update()
        return tuple(arm.matrix_world @ arm.pose.bones[B(short)].head)
    # (a) shoulders: every Arms option on every Torso -- 3/4 front, front and back at the (left) shoulder cap
    rest()
    for bt in ('A', 'B'):
        default_colors(bt)
        rows = []
        cx = .15 if bt == 'A' else .12
        for ai in range(1, len(KIT[bt]['Arms']) + 1):
            for vtag, vd in (('3/4 front', (.6, -.8, .15)), ('front', (0, -1, .10)), ('3/4 back', (.5, .85, .15))):
                cs = []
                for ti in range(1, len(KIT[bt]['Torso']) + 1):
                    show_only(outfit(bt, Arms=ai, Torso=ti, Hair=2))
                    p = shoot(j('grid', 'sh_%s_A%02d_T%02d_%s.png' % (bt, ai, ti, vtag.replace('/', '').replace(' ', ''))), (170, 170), vd, (cx, 0, 1.36), .34)
                    cs.append(cell(p, 'T%02d %s' % (ti, KIT[bt]['Torso'][ti - 1][0])[:22], bg=BG_REF))
                rows.append({'title': 'Arms %02d %s x every torso -- %s' % (ai, KIT[bt]['Arms'][ai - 1][0], vtag), 'height': 150, 'cells': cs})
        compose(j('shoulders_%s.png' % bt), rows, 'Body %s shoulder caps: every arms option on every torso (no bumps, gaps or overlaps)' % bt)
        sheets['shoulders_' + bt] = j('shoulders_%s.png' % bt)
    # (b) wrists: forearm -> hand taper, every hands option on bare / sleeved / cuffed arms, both bodies
    rows = []
    for bt in ('A', 'B'):
        default_colors(bt)
        arm_opts = {'A': [(2, 'bare forearm (musclebound)'), (1, 'sleeve'), (3, 'loose sleeve'), (7, 'tight sleeve')],
                    'B': [(3, 'bare arms'), (1, 'sleeve'), (2, 'short sleeves'), (5, 'large cuffs')]}[bt]
        for hi in range(1, 4):
            cs = []
            for ai, alab in arm_opts:
                show_only(outfit(bt, Arms=ai, Hands=hi, Hair=2))
                ctr = Vector(bone_head('LeftHand')) + Vector((0, 0, -.015))
                for vtag, vd in (('front', (.25, -1, .05)), ('outside', (1, -.3, .10)), ('back', (.3, 1, .05))):
                    p = shoot(j('grid', 'wr_%s_H%02d_A%02d_%s.png' % (bt, hi, ai, vtag)), (170, 170), vd, tuple(ctr), .22)
                    cs.append(cell(p, '%s / %s' % (alab, vtag), bg=BG_REF))
            rows.append({'title': 'Body %s -- Hands %02d %s' % (bt, hi, KIT[bt]['Hands'][hi - 1][0]), 'height': 150, 'cells': cs})
    compose(j('wrists.png'), rows, 'Wrists: the hand\'s first ring IS the bare forearm\'s last ring (no step); gloves hug the forearm; wraps spiral round wrist + palm')
    sheets['wrists'] = j('wrists.png')
    # (c) sandals: every legs option x sandals, rest + walk + run, both bodies
    rows = []
    for bt in ('A', 'B'):
        default_colors(bt)
        for vtag, clip_fr, vd, ctr, orth in (('rest 3/4', None, (.55, -.80, .25), (0, 0, .16), .50), ('rest side', None, (-1, .02, .06), (0, 0, .16), .50),
                                             ('walk f4', ('walk', 4), (-1, .03, .10), (0, 0, .22), .70), ('walk f12', ('walk', 12), (-1, .03, .10), (0, 0, .22), .70),
                                             ('run f5', ('run', 5), (-1, .03, .10), (0, 0, .22), .70)):
            cs = []
            for li in range(1, len(KIT[bt]['Legs']) + 1):
                show_only(outfit(bt, Legs=li, Feet=3, Hair=2))
                if clip_fr:
                    set_clip(clips[clip_fr[0]], clip_fr[1])
                else:
                    rest()
                p = shoot(j('grid', 'sd_%s_L%02d_%s.png' % (bt, li, vtag.replace('/', '').replace(' ', ''))), (170, 170), vd, ctr, orth)
                cs.append(cell(p, 'L%02d %s' % (li, KIT[bt]['Legs'][li - 1][0])[:22], bg=BG_REF))
            rows.append({'title': 'Body %s -- every legs option with sandals -- %s' % (bt, vtag), 'height': 150, 'cells': cs})
    rest()
    compose(j('sandals.png'), rows, 'Sandals: bare foot seated IN the sole, joined to the bare ankle; trousers cover the leg above (rest, walk, run)')
    sheets['sandals'] = j('sandals.png')
    # (d) faces incl. makeup: A + B neutral, every makeup option, makeup colours
    rows = []
    cs = []
    for bt in ('A', 'B'):
        default_colors(bt)
        show_only(outfit(bt))
        for vtag, vd in (('front', (0, -1, .02)), ('3/4', (.55, -.83, .06)), ('side', (-1, -.03, .04))):
            p = shoot(j('grid', 'face28_%s_%s.png' % (bt, vtag.replace('/', ''))), (260, 280), vd, (0, -.02, 1.63), .40)
            cs.append(cell(p, '%s %s (neutral)' % (bt, vtag), bg=BG_REF))
    rows.append({'title': 'Neutral faces (default outfits)', 'height': 280, 'cells': cs})
    default_colors('B')
    for vtag, vd in (('front', (0, -1, .02)), ('3/4', (.55, -.83, .06))):
        cs = []
        for mi in range(1, len(KIT['B']['Makeup']) + 1):
            show_only(outfit('B', Makeup=mi, Hair=7))
            p = shoot(j('grid', 'mk_%02d_%s.png' % (mi, vtag.replace('/', ''))), (240, 260), vd, (0, -.02, 1.63), .34)
            cs.append(cell(p, 'Makeup %02d %s' % (mi, KIT['B']['Makeup'][mi - 1][0]), bg=BG_REF))
        rows.append({'title': 'Body B makeup options (C_MAKEUP, default rose) -- %s' % vtag, 'height': 260, 'cells': cs})
    cs = []
    show_only(outfit('B', Makeup=5, Hair=7))
    for ci, hx in enumerate(PALETTES['makeup']):
        apply_outfit_colors(mats, {'makeup': hx})
        p = shoot(j('grid', 'mk_col_%d.png' % ci), (240, 260), (.55, -.83, .06), (0, -.02, 1.63), .34)
        cs.append(cell(p, 'full, colour %d %s' % (ci + 1, ['rose', 'coral', 'berry', 'plum', 'soft brown', 'bronze'][ci]), bg=BG_REF))
    rows.append({'title': 'Makeup palette channel `makeup` on Makeup 05 (full)', 'height': 260, 'cells': cs})
    default_colors('B')
    cs = []
    for bt, hi in (('A', 1), ('B', 1), ('B', 2), ('B', 5)):
        default_colors(bt)
        show_only(outfit(bt, Hair=hi))
        for vtag, vd in (('back', (0, 1, .10)), ('3/4 back', (-.6, .8, .2))):
            p = shoot(j('grid', 'neck_%s_H%02d_%s.png' % (bt, hi, vtag.replace('/', '').replace(' ', ''))), (200, 200), vd, (0, .02, 1.50), .40)
            cs.append(cell(p, '%s Hair %02d %s' % (bt, hi, vtag), bg=BG_REF))
    rows.append({'title': 'Back of the neck / collar (v2.8: the neck stays inside every collar, ears stay inside long hair)', 'height': 200, 'cells': cs})
    default_colors('A')
    compose(j('faces_makeup.png'), rows, 'Faces, B makeup slot (Kit_B_Makeup_01..05) and the back of the neck')
    sheets['faces_makeup'] = j('faces_makeup.png')
    # (e) v2.7 vs v2.8
    prev = PREV_DIR
    if os.path.isdir(prev):
        pg = lambda n: os.path.join(prev, 'grid', n)
        def pair(old, new, lab):
            return [cell(old, 'v2.7 ' + lab, bg=BG_REF), cell(new, 'v2.8 ' + lab, bg=BG_REF)]
        rows = [
            {'title': 'Dreadlocks (A 03, B 04): rooted in parted rows on a thin scalp layer', 'height': 230,
             'cells': pair(pg('Kit_A_Hair_03_f.png'), j('grid', 'Kit_A_Hair_03_f.png'), 'A dreads 3/4') + pair(pg('Kit_A_Hair_03_b.png'), j('grid', 'Kit_A_Hair_03_b.png'), 'A dreads back')
             + pair(pg('Kit_A_Hair_03_t.png'), j('grid', 'Kit_A_Hair_03_t.png'), 'A dreads top') + pair(pg('Kit_B_Hair_04_b.png'), j('grid', 'Kit_B_Hair_04_b.png'), 'B dreads back')},
            {'title': 'Tonsure side, arched mohawk, B long hair over the ears', 'height': 230,
             'cells': pair(pg('Kit_A_Hair_06_s.png'), j('grid', 'Kit_A_Hair_06_s.png'), 'tonsure side') + pair(pg('Kit_A_Hair_10_s.png'), j('grid', 'Kit_A_Hair_10_s.png'), 'mohawk side')
             + pair(pg('Kit_A_Hair_10_f.png'), j('grid', 'Kit_A_Hair_10_f.png'), 'mohawk 3/4') + pair(pg('Kit_B_Hair_01_b.png'), j('grid', 'Kit_B_Hair_01_b.png'), 'B long back')},
            {'title': 'Torsos: light buttons, closed vest, laced V, stitching, two-toned seam', 'height': 250,
             'cells': sum((pair(pg('Kit_A_Torso_%02d.png' % i), j('grid', 'Kit_A_Torso_%02d.png' % i), 'T%02d' % i) for i in (2, 3, 5, 6, 8)), [])},
            {'title': 'Hands (bare / gloves / wraps) and sandals', 'height': 250,
             'cells': sum((pair(pg('Kit_%s_Hands_%02d.png' % (bt, i)), j('grid', 'Kit_%s_Hands_%02d.png' % (bt, i)), '%s H%02d' % (bt, i)) for bt, i in (('A', 1), ('A', 2), ('A', 3), ('B', 3))), [])
             + pair(pg('Kit_A_Feet_03.png'), j('grid', 'Kit_A_Feet_03.png'), 'A sandals')},
            {'title': 'Walk (side, f0 / f5 / f10 / f15): v2.8 upright, hip sway + roll, shoulders counter-rotate, head steady, soft contact knee', 'height': 200,
             'cells': sum((pair(pg('strip_A_walk_%d_side.png' % f), j('grid', 'strip_A_walk_%d_side.png' % f), 'walk f%d' % f) for f in (0, 5, 10, 15)), [])},
            {'title': 'Defaults', 'height': 480,
             'cells': [cell(os.path.join(prev, 'turn_A_front.png'), 'v2.7 A', bg=BG_REF), cell(turn[('A', 'front')], 'v2.8 A', bg=BG_REF),
                       cell(os.path.join(prev, 'turn_B_front.png'), 'v2.7 B', bg=BG_REF), cell(turn[('B', 'front')], 'v2.8 B', bg=BG_REF),
                       cell(os.path.join(prev, 'game_A.png'), 'v2.7 game cam A', bg=BG_GAME), cell(j('game_A.png'), 'v2.8 game cam A', bg=BG_GAME),
                       cell(os.path.join(prev, 'game_B.png'), 'v2.7 B', bg=BG_GAME), cell(j('game_B.png'), 'v2.8 B', bg=BG_GAME)]},
        ]
        rows = [{**r, 'cells': [c for c in r['cells'] if os.path.exists(c['path'])]} for r in rows]
        compose(j('v27_vs_v28.png'), rows, 'v2.7 vs v2.8 (same framing)')
        sheets['v27_vs_v28'] = j('v27_vs_v28.png')
    rest()
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
        cells.append(cell(shoot(j('rs_%s_creator.png' % bt), (300, 420), (.42, -.86, .22), (0, 0, .93), 2.0), '%s %s, creator angle (idle)' % (VL, bt), bg=[74, 66, 56]))
        cells.append(cell(shoot(j('rs_%s_dagger.png' % bt), (300, 480), (-.80, .20, .56), (0, 0, .90), 2.1, ground=True, persp=(5.0, 85)),
                          '%s %s, dagger-ref angle (idle)' % (VL, bt), bg=[112, 118, 48]))
    compose(j('rs_style_compare.png'), [{'height': 520, 'cells': cells}], '%s defaults next to the 2004-style references (similar angle and size)' % VL)
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
        {'title': 'front / side: male_b concept vs %s default A (outline only)' % VL, 'height': 420,
         'cells': [cell(REF_TURN, 'male_b front (ref)', crop=[80, 70, 480, 720], sil='rowbg'), cell(sa_front, VL + ' A front', sil='alpha'),
                   cell(REF_TURN, 'male_b side (ref)', crop=[590, 70, 830, 720], sil='rowbg'), cell(sa_side, VL + ' A side', sil='alpha')]},
        {'title': '3/4 and high angle: creator + DragonDagger refs vs %s A (outline only)' % VL, 'height': 420,
         'cells': [cell(REF_CREATOR, 'creator (ref)', crop=[310, 210, 520, 470], sil='flat'), cell(sa_34, VL + ' A 3/4', sil='alpha'),
                   cell(REF_DAGGER, 'DragonDagger (ref)', crop=[480, 170, 830, 1410], sil='olive'), cell(sa_dg, VL + ' A same angle', sil='alpha')]},
    ], 'Silhouette check: straight segments and corners, measured proportions')
    out['silhouette'] = j('silhouette_compare.png')
    out['measured_outlines'] = measure_outlines([
        ['ref_male_b_front', REF_TURN, 'rowbg', [80, 70, 480, 720]], ['v27_A_front', sa_front, 'alpha', None]])
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

REVIEW = [   # v3.1 (2026-09-26) + v3.0 (2026-09-25) owner reviews, each point checked on the sheets and numerically
    'v3.1 STANCE ("still not standing up vertically like the old school characters"): legs straight (knee ~1 deg) and plumb under the '
    'hips (the rest skeleton puts the ankle 8.5 cm behind the hip; the thighs now swing 5.5 deg forward), nearly parallel with a touch of '
    'toe-out; spine chain vertical with the chest up; neck back / head nodded so the head sits over the shoulders and the face is level; '
    'shoulders drawn back; arms close to vertical with a ~10 deg elbow bend, the hands at the SIDES of the thighs just off them (not '
    'held forward). Measured against v3.0 on v31_stance_compare.png (manifest renders.stance_metrics). Run capped at 2 deg of lean.',
    'v3.1 EMOTES: yes, no, bow, angry, think, wave, shrug, cheer, beckon, laugh, jump for joy, yawn, dance, jig, spin, headbang, cry, '
    'blow kiss, panic, raspberry, clap, salute -- kit clips emote_<key> (our own animation of each), starting and ending on idle f0; '
    'hands placed on points carried by the body (chin, lips, eyes, ears, brow, belly, hips) so they stay on while the body moves '
    '(v31_emotes_A/B_*.png strips, v31_emote_keys.png).',
    'v3.0 STANCE: the OSRS idle -- upper arms hang just off the torso, elbows bent ~30-35 deg so the forearms come FORWARD and the loosely '
    'closed hands sit in front of the hips / upper thighs (never inside the thighs or crotch), legs a little apart with soft knees, feet '
    'turned slightly out, chest up, head a touch forward (spine chain vertical, head ~1 deg forward). The arm stance is stored as each arm '
    'bone local rotation, so every clip starts / ends from it and the walk / run swing pivots the bent arm at the shoulder. Hands checked '
    'on EVERY frame of EVERY clip: bone-based (crotch / centreline / thigh surface gap) and mesh-based (hand vertices vs the legs and torso '
    'meshes of four outfits incl. the widest tunic hem, the peplum and the skirts) -- manifest hand_clearance / hand_clearance_mesh.',
    'v3.0 SHOULDERS: every torso layer that carries a sleeve cuts an armhole whose rim is ONE canonical seam ring per body type and side; '
    'every arms option starts on that same ring (identical positions, skin weights and pinned shading normals) and rounds over a deltoid '
    'cap into the upper arm, so torso and arm are one watertight surface with no shading break, in every pose (sheets v30_shoulders_A/B: '
    'every torso x arms at rest, idle, the widest walk swing, the attack wind-up and the overhead crush). Vests / jerkins get a real '
    'sleeveless armhole hugging the seam; shirts under jackets / coats are tucked in under them.',
    'v3.0 FEET: boots, shoes and sandals are rounded wedges -- one continuous loft from a flat sole through the toe box, instep and round '
    'ankle into the boot shaft / shoe collar / bare ankle; blunt rounded toe, no box sides, no sole slab (sandals: a thin sole following '
    'the foot outline, straps over the top). Feet_Small / Feet_Large rebuilt on the same loft; every legs option still meets the foot.',
    '1 BODY BUILD: every kit part carries glTF morph targets Build_Stout / Build_Slim (the whole kit rebuilt on stout / slim body tables: '
    'rounder belly and chest, thicker upper arms and thighs / narrower; stout arms also move out so sleeves clear the hips). Clothes follow by '
    'construction; hair and beards keep their clearance. Checked over every option combination (build_check) and on creator_builds.png.',
    '2 FEET: default feet ~11% smaller (A 1.12 -> 1.00, B .98 -> .875); Feet_Large restores the v2.8 size, Feet_Small is one size smaller; '
    'hems / collars / boot shafts are unchanged, so every legs option still meets the foot (creator_feet.png).',
    '3 FACE: head width x1.12 -> x1.065 and the jaw rows taper more (both bodies, face_before_after.png).',
    '4 LEAN: the rest skeleton leans 4.2 deg forward; idle / walk / talk / wave now solve the spine so the posed hips->head chain is vertical on '
    'every frame (0.0 deg measured), run capped at 3 deg (lean_check.png, manifest lean_deg).',
    '5 WALK: OSRS-like -- 15 frames, 0.60 m step, straight-ish legs (knee ~14 deg at contact, ~11 deg mid-stance), arms swinging at the sides '
    'in a plane parallel to the midline, no sway / roll, 1.2 cm bob, head steady; slide-free at 2.4 m/s at timeScale 1 (FK-measured).',
    '6 SKILLS: new firemake (kneel, tinderbox strikes at the logs), cook (fish held out over the fire / range and turned), net (two-handed '
    'raise / cast / soak / draw). The right hand grip = the runtime tool attach point (hand local 0,.03,.04), solved onto its target.',
    'TUTORS: wenna, hettie, ansel, durgin, corrick, maud, ilse, aldous, tobin rebuilt from the kit + their own extras (holm_tutor_<id>_v2.glb) '
    'with idle / talk / wave / walk; Bram rebuilt on the v2.9 kit (thinner face, smaller feet, upright).',
]

def measure_lean(arm, acts, to='Neck'):
    """forward tilt (deg) of the posed hips-joint -> neck-base line (v3.0: the spine chain; to='Head' includes the neck,
    which carries the head a touch forward in the OSRS stance) on EVERY frame of each clip (the evaluated armature,
    exactly what the game plays); + = leaning forward"""
    out = {}
    sc = bpy.context.scene
    for name, act in acts.items():
        arm.animation_data.action = act
        f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
        ts = []
        for f in range(f0, f1 + 1):
            sc.frame_set(f)
            h = arm.matrix_world @ arm.pose.bones[B('Hips')].head
            hd = arm.matrix_world @ arm.pose.bones[B(to)].head
            d = hd - h
            ts.append(math.degrees(math.atan2(-d.y, d.z)))
        out[name] = [round(min(ts), 2), round(max(ts), 2)]
    arm.animation_data.action = None
    return out

def rebuild_tutors(ids):
    """v2.9b: rebuild only the named tutors (same v29 files); the kit, Bram and the other tutors are not written"""
    reset_scene()
    mats = make_kit_materials('A')
    arm = build_armature()
    kit = {}
    for tid in ids:
        t = TUTORS[tid]
        for slot, idx in t['parts'].items():
            nm = part_name(t['bt'], slot, idx)
            if nm not in kit:
                ob = build_part(t['bt'], slot, idx, mats, arm)
                add_morphs(ob, t['bt'], slot, idx)
                kit[nm] = ob
    names, meta = {}, {}
    for tid in ids:
        tarm, tm, tobjs, tacts, tdefs = build_tutor(tid, kit, mats)
        th = hand_clearance(tarm, tacts)
        assert_hands(th, tid)
        tl = measure_lean(tarm, tacts)
        assert max(abs(v) for n in ('idle', 'walk') for v in tl[n]) < .5, 'tutor %s leans: %s' % (tid, tl)
        export_glb(os.path.join(CAND, 'holm_tutor_%s_v2.glb' % tid), tarm, list(tobjs.values()), 'NLA_TRACKS')
        names[tid] = list(tobjs.keys())
        meta[tid] = {'hands': th, 'lean_deg': tl, 'tris': {n: tri_count(o) for n, o in tobjs.items()}, 'defs': tdefs}
    res = {tid: validate(os.path.join(CAND, 'holm_tutor_%s_v2.glb' % tid), names[tid], ['idle', 'talk', 'walk', 'wave'], exact_clips=True) for tid in ids}
    mp = os.path.join(WS, 'manifest.json')
    m = json.load(open(mp, encoding='utf-8'))
    for tid in ids:
        e = m['tutors'][tid]
        e.update(kit_parts=[part_name(TUTORS[tid]['bt'], sl, i) for sl, i in TUTORS[tid]['parts'].items()], extras=TUTORS[tid]['extras'],
                 tris=meta[tid]['tris'], tris_total=sum(meta[tid]['tris'].values()), hand_clearance=meta[tid]['hands'],
                 lean_deg=meta[tid]['lean_deg'], validation=res[tid]['PASS'])
        m['validation']['tutor_' + tid] = res[tid]['PASS']
    with open(mp, 'w', encoding='utf-8') as fh:
        json.dump(m, fh, indent=2)
    print('TUTORS REBUILT', json.dumps({tid: (res[tid]['PASS'], sum(meta[tid]['tris'].values())) for tid in ids}))

def main():
    if '--tutors' in ARGS:
        return rebuild_tutors(ARGS[ARGS.index('--tutors') + 1].split(','))
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
    lean = measure_lean(arm, {n: clips[n] for n in ('idle', 'walk', 'talk', 'wave', 'run')})
    lean_head = measure_lean(arm, {n: clips[n] for n in ('idle', 'walk', 'talk', 'wave', 'run')}, to='Head')
    print('[LEAN]', json.dumps(lean), '[HEAD]', json.dumps(lean_head))
    assert max(abs(v) for v in lean_head['idle']) < 2.5, 'head too far forward in the idle: %s' % lean_head['idle']
    for n in ('idle', 'walk', 'talk', 'wave'):
        assert max(abs(v) for v in lean[n]) < .5, 'spine leans in %s: %s' % (n, lean[n])
    assert lean['run'][1] < 2.1, 'run leans more than 2 deg: %s' % lean['run']
    build_check = verify_builds(objs, arm, clips)
    hands_mesh = mesh_hand_clearance(arm, objs, clips)
    assert hands_mesh['PASS'], 'hands sink into the legs / torso: %s' % json.dumps(hands_mesh['failures'])
    arm.animation_data.action = clips['idle']
    parts = []
    for bt in ('A', 'B'):
        for slot in SLOTS:
            for idx in range(1, len(KIT[bt].get(slot, [])) + 1):
                ob = objs[part_name(bt, slot, idx)]
                parts.append({'name': ob.name, 'body_type': bt, 'slot': slot, 'index': idx, 'style': KIT[bt][slot][idx - 1][0],
                              'description': KIT[bt][slot][idx - 1][1], 'tris': tri_count(ob),
                              'inner_sharp_edge_fraction': ob.get('inner_sharp_fraction', 0.0),
                              'materials': [m.name for m in ob.data.materials],
                              'morphs': [kb.name for kb in ob.data.shape_keys.key_blocks[1:]] if ob.data.shape_keys else [],
                              'morph_max_displacement_m': MORPH_DATA[ob.name]['max_disp']})
    default_tris = {bt: sum(tri_count(o) for o in outfit_objs(objs, bt, DEFAULT_OUTFIT[bt])) for bt in ('A', 'B')}
    heights = {bt: round(rest_top(outfit_objs(objs, bt, DEFAULT_OUTFIT[bt])), 4) for bt in ('A', 'B')}
    worst = {}
    for bt in ('A', 'B'):
        worst[bt] = sum(max(tri_count(objs[part_name(bt, s, i)]) for i in range(1, len(KIT[bt][s]) + 1)) for s in SLOTS if s in KIT[bt])
    export_glb(OUT_KIT, arm, list(objs.values()), 'ACTIONS', morph=True)
    kit_clip_names = list(clips.keys())
    # Bram (built after the kit export so his actions are not swept into the kit GLB)
    barm, bmats, bobjs, bacts, bdefs = build_bram(objs, mats)
    hands_bram = hand_clearance(barm, bacts)
    assert_hands(hands_bram, 'bram')
    worst_inner = max(p['inner_sharp_edge_fraction'] for p in parts)
    print('[SHADING] worst inner-sharp parts', sorted(((p['inner_sharp_edge_fraction'], p['name']) for p in parts), reverse=True)[:12])
    assert worst_inner < .90, 'shading is not panel-based (%.3f of inner edges hard)' % worst_inner
    for gname in ('walk', 'run', 'bram_walk'):
        assert GAIT_REPORT[gname]['max_planted_speed_error_mps'] < .05, 'planted foot slides in %s: %s' % (gname, GAIT_REPORT[gname])
        assert GAIT_REPORT[gname]['max_stance_reach_error_m'] < .006, 'stance foot cannot reach the ground in %s: %s' % (gname, GAIT_REPORT[gname])
    assert GAIT_REPORT['bram_walk']['staff_tip_error_m'] < .01, 'staff tip slides while planted: %s' % GAIT_REPORT['bram_walk']
    print('[GAIT]', json.dumps(GAIT_REPORT))
    bram_tris = {n: tri_count(o) for n, o in bobjs.items()}
    bram_height = round(rest_top([o for n, o in bobjs.items() if n != 'Bram_Staff']), 4)
    for o in objs.values():
        o.hide_set(True)
    export_glb(OUT_BRAM, barm, list(bobjs.values()), 'NLA_TRACKS')
    lean_bram = measure_lean(barm, bacts)
    # v2.9 tutors
    tutors, tutor_meta, tutor_names = {}, {}, {}
    for tid in TUTORS:
        tarm, tmats, tobjs, tacts, tdefs = build_tutor(tid, objs, mats)
        th = hand_clearance(tarm, tacts)
        assert_hands(th, tid)
        tl = measure_lean(tarm, tacts)
        assert max(abs(v) for n in ('idle', 'walk') for v in tl[n]) < .5, 'tutor %s leans: %s' % (tid, tl)
        tutors[tid] = (tarm, tobjs, tacts)
        tutor_names[tid] = (tarm.name, list(tobjs.keys()), list(tacts.keys()))
        tutor_meta[tid] = {'hands': th, 'lean_deg': tl, 'tris': {n: tri_count(o) for n, o in tobjs.items()}, 'defs': tdefs}
    for tid, (tarm, tobjs, tacts) in tutors.items():
        export_glb(os.path.join(CAND, 'holm_tutor_%s_v2.glb' % tid), tarm, list(tobjs.values()), 'NLA_TRACKS')
    for o in objs.values():
        o.hide_set(False)
    blend = os.path.join(WS, 'characters.blend')
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    pal = {'version': 2, 'note': 'sRGB hex; material names C_HAIR (hair+jaw+brows), C_TORSO (torso+arm cloth), C_LEGS, C_FEET, C_SKIN, C_MAKEUP (body B makeup overlays)',
           'channels': {ch: {'material': CHANNEL_MAT[ch], 'colors': PALETTES[ch]} for ch in PALETTES},
           'accents_fixed': ACCENTS, 'defaults': {bt: {ch: PALETTES[ch][i] for ch, i in DEFAULT_COLORS[bt].items()} for bt in 'AB'},
           'default_outfit': {bt: {s: part_name(bt, s, i) for s, i in DEFAULT_OUTFIT[bt].items()} for bt in 'AB'},
           'bram': {'parts': [part_name('A', s, i) for s, i in BRAM_PARTS], 'colors': BRAM_COLORS}}
    with open(OUT_PAL, 'w', encoding='utf-8') as fh:
        json.dump(pal, fh, indent=2)
    res_kit = validate(OUT_KIT, [p['name'] for p in parts], kit_clip_names, exact_clips=True)
    res_bram = validate(OUT_BRAM, list(bobjs.keys()), ['idle', 'talk', 'walk', 'wave'], exact_clips=True)
    res_tut = {tid: validate(os.path.join(CAND, 'holm_tutor_%s_v2.glb' % tid), tutor_names[tid][1], ['idle', 'talk', 'walk', 'wave'], exact_clips=True)
               for tid in tutor_names}
    mt = res_kit['morph_targets']
    missing = [p['name'] for p in parts if not set(MORPHS_ALL + (MORPHS_FEET if p['slot'] == 'Feet' else [])) <= set(mt.get(p['name'], []))]
    assert not missing, 'kit meshes without their morph targets in the GLB: %s' % missing[:10]
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
    tut_r = {}
    for tid, (an, on, cn) in tutor_names.items():
        tut_r[tid] = (bpy.data.objects[an], {n: bpy.data.objects[n] for n in on}, {n: bpy.data.actions['%s_%s' % (tid, n)] for n in cn})
    bobjs = {n: bpy.data.objects[n] for n in bobjs}
    bacts = {n: bpy.data.actions['bram_' + n] for n in bdefs}
    sheets = run_renders(arm, mats, objs, clips, (barm, bobjs, bacts), tut_r) if DO_RENDER else {}
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
        'gait': dict(GAIT_REPORT, runtime_note='walk is authored natively for 2.4 m/s at timeScale 1.0 (play walk with timeScale = moveSpeed/2.4); '
                     'run is authored for 4.2 m/s at timeScale 1.0 (play run while running with timeScale = moveSpeed/4.2). Both are slide-free at those '
                     'rates: the planted foot ground speed is measured back through FK (see measured_planted_foot_speed_mps).'),
        'hand_clearance': {'kit': hands_kit, 'bram': hands_bram, 'rule': 'hand centre >= %.2f m from the crotch point, never across the centreline, never between the legs; idle hands >= .045 m outside the thigh line' % HAND_MIN_CROTCH},
        'shading': {'rule': 'panel shading: smooth across each broad panel; hard edges at material boundaries, piece rims and wherever the form turns > %d deg' % SHARP_DEG,
                    'max_inner_sharp_edge_fraction': max(p['inner_sharp_edge_fraction'] for p in parts)},
        'renders': {k: (rel(v) if isinstance(v, str) else v) for k, v in sheets.items()},
        'reference_ratios_measured': REF_RATIOS,
        'creator_morphs': {'every_kit_part': MORPHS_ALL, 'feet_parts_also': MORPHS_FEET,
                           'runtime': 'glTF morph targets (mesh.extras.targetNames) -> three.js morphTargetDictionary. Body build: Slim = Build_Slim 1, '
                                      'Average = both 0, Stout = Build_Stout 1 (in-between values blend). Feet: Small = Feet_Small 1, Normal = 0, Large = Feet_Large 1 '
                                      '(the v2.8 size). Set the same influences on every visible kit part (parts that do not move carry zero morphs).',
                           'glb_morph_targets_ok': True},
        'build_check': build_check,
        'hand_clearance_mesh': hands_mesh,
        'lean_deg': {'rule': 'v3.0: forward tilt of the posed hips-joint -> neck-base line (the spine chain), every frame (0 = vertical); '
                             'head_forward_deg = the same to the head joint (the neck carries the head a touch forward); the rest skeleton leans 4.2 deg',
                     'kit': lean, 'head_forward_deg': lean_head, 'bram': lean_bram},
        'skill_clips': {'grip': 'right hand bone local (0, .03, .04) = where crafting_action_visuals.js attaches a held tool; the clips solve that point onto its target',
                        'firemake': 'kneel on the right knee, strike the tinderbox down at logs ~0.45 m in front (grip 0.34-0.52 m high), 30 frames, 2 strikes',
                        'cook': 'hold the fish out over the fire / range (grip ~0.94 m high, 0.42 m in front) and turn it over and back (hand roll 0-140 deg), 40 frames',
                        'net': 'two-handed: raise overhead -> cast forward and down -> let it soak -> draw it in, 48 frames',
                        'max_ik_reach_error_m': round(REACH_ERR[0], 4)},
        'tutors': {tid: {'name': TUTORS[tid]['name'], 'role': TUTORS[tid]['role'], 'glb': rel(os.path.join(CAND, 'holm_tutor_%s_v2.glb' % tid)),
                         'body_type': TUTORS[tid]['bt'], 'build': TUTORS[tid].get('build', 'average'),
                         'kit_parts': [part_name(TUTORS[tid]['bt'], sl, i) for sl, i in TUTORS[tid]['parts'].items()], 'extras': TUTORS[tid]['extras'],
                         'tris': tutor_meta[tid]['tris'], 'tris_total': sum(tutor_meta[tid]['tris'].values()),
                         'clips': {n: {'frames': d[0], 'loop': d[2]} for n, d in tutor_meta[tid]['defs'].items()}, 'walk_speed_mps': TUTOR_WALK_SPEED,
                         'hand_clearance': tutor_meta[tid]['hands'], 'lean_deg': tutor_meta[tid]['lean_deg'],
                         'validation': res_tut[tid]['PASS']} for tid in TUTORS},
    }
    manifest['validation'].update({'tutor_' + tid: res_tut[tid]['PASS'] for tid in TUTORS})
    with open(os.path.join(WS, 'manifest.json'), 'w', encoding='utf-8') as fh:
        json.dump(manifest, fh, indent=2)
    write_report(manifest, res_kit, res_bram)
    print('MANIFEST', json.dumps({k: manifest[k] for k in ('tris_default_outfit', 'tris_worst_case_outfit', 'height_m_rest_default_outfit', 'validation')}))
    print('BRAM', manifest['bram']['tris_total'], bram_height)

def write_report(m, rk, rb):
    L = ['# holm_kit_v2 (%s candidate) -- modular 2004-style identity kit + Guide Bram + the nine Holm tutors\n' % VL,
         'Built by `tools/blender/build_holm_characters_v2.py` (Blender 4.5 headless). Every mesh, weight and clip is authored '
         'procedurally in Blender (angular low-poly, panel shading: smooth panels, hard edges at >=40 deg turns and material boundaries, smooth weights); no imported models, no textures.\n',
         '## Files\n',
         '- `%s` -- rig + all %d kit parts + %d clips' % (m['glb']['kit'], m['part_count'], len(m['clips'])),
         '- `%s` -- palettes (hair 12, torso 16, legs 16, feet 6, skin 8, makeup 6) + accents + defaults' % m['glb']['palettes'],
         '- `%s` -- Guide Bram (kit parts + staff), clips idle/talk/walk/wave' % m['glb']['bram'],
         '- `%s`, `manifest.json`, this report; proof sheets in `scratchpad/holm_characters_%s/`\n' % (m['blend'], TAG),
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
    L.append('- v2.8 adds ONE slot: `Makeup` on body B (`Kit_B_Makeup_01..05`, 01 = none: a hidden placeholder sliver inside the skull), '
             'material `C_MAKEUP`, palette channel `makeup` in palettes.json. Body A has no Makeup slot. Part count 82 -> 87.')
    L.append('- Recolour by channel: materials `C_HAIR`/`C_TORSO`/`C_LEGS`/`C_FEET`/`C_SKIN`/`C_MAKEUP` (strip a `.NNN` suffix); accents `A_*` stay fixed. '
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
    if m.get('tutors'):
        L.append('## Tutors (v2.9)\n')
        L.append('| id | name | body | build | glb | tris | extras |')
        L.append('|---|---|---|---|---|---|---|')
        for tid, t in m['tutors'].items():
            L.append('| %s | %s | %s | %s | `%s` | %d | %s |' % (tid, t['name'], t['body_type'], t['build'], t['glb'], t['tris_total'], ', '.join(t['extras'])))
        L.append('\nEach tutor GLB: the same 23-bone rig, clips idle / talk / wave / walk (walk %.2f m/s at timeScale 1), upright spine, hands checked every frame.\n' % TUTOR_WALK_SPEED)
    if m.get('creator_morphs'):
        L.append('## Creator morphs (v2.9)\n')
        L.append('- ' + m['creator_morphs']['runtime'])
        bc = m.get('build_check', {})
        L.append('- build check: %d part pairs x %s; new clip vertices by rule: `%s`' % (bc.get('part_pairs_checked', 0), ', '.join(bc.get('poses', [])),
                 json.dumps({k: v for k, v in bc.get('new_clip_vertices_by_rule', {}).items() if v})))
        L.append('- lean (deg, min/max over every frame): `%s`\n' % json.dumps(m.get('lean_deg', {}).get('kit', {})))
    L.append('## Validation\n')
    L.append('```json\n%s\n```\n' % json.dumps({'kit': {k: v for k, v in rk.items() if k != 'clips'}, 'bram': rb}, indent=1))
    with open(os.path.join(WS, 'REPORT.md'), 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(L))

if __name__ == '__main__':
    main()
