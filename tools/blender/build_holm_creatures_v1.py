"""Holm creatures v1 (owner request 2026-09-29): the old-school animals and monsters, our own low-poly designs, each on
its own rig with a complete clip set.

  holm_large_rat_v1  the large rat (replaces the grubkins): hunched and round-backed, heavy haunches, a pointed snout
                     with yellow incisors, round pink ears, pink paws and a long bare tail, brown-grey fur
  holm_rat_v1        the small rat (burrowrat), from the same build: slimmer, lower in the back, grey fur
  holm_goblin_v1     the goblin (gnarlgob): a small green humanoid, big head with long leaf ears, a hooked nose, a heavy
                     brow, yellow eyes and two tusks, a pot belly in a ragged hide tunic with a rope belt, long arms,
                     bow legs, big bare feet and a crude nailed club
  holm_chicken_v1    the chicken (pasturehen): a cream hen with buff wings, a red comb and wattle, a yellow beak and legs
  holm_cow_v1        the cow (moorcalf): black and white, pink muzzle and udder, short cream horns, a tufted tail

Style (the character kit's look, tools/blender/build_holm_characters_v2.py): organic low-poly, lofted 6-10 sided rings
along the bones, flat sRGB colours stored as the values the game shows (three r128, no colour management), roughness 1,
no textures, panel shading (smooth across a broad panel, a hard edge at material boundaries and wherever the form turns
more than 40 degrees). Rigs: Root at the feet (whole-body motion), sagittal bones whose local X is the world X (an X
rotation pitches), smooth weights blended by distance between the bones each part may follow.
Clips (glTF names, 30 fps, in place): idle (a little life: the rat sniffs and lifts a paw, the hen pecks, the cow grazes
and flicks its tail, the goblin shifts, looks about and taps its club), walk (loops), attack (impact at exactly half the
clip, the frame src/combat_fx.js impactTime() uses), hit (the flinch), block (the guard on a 0), death (plays once and
holds, the body settled on the ground and centred on its tile; the game then lets it lie a moment and sinks it).
Every clip is stepped the old-client way (the kit's step_all): a pose every 3 frames (100 ms) plus every authored key of a
sparse clip, held (CONSTANT) until the next.
Axes: Blender -Y forward (= glTF +Z, like the kit and three.js lookAt), Z up, feet on 0, 1 unit = 1 m = 1 tile.
Outputs: .studio-workspaces/holm-creatures-v1/candidates/{<id>.glb, creatures.blend, manifest.json, REPORT.md}
         scratchpad/holm_creatures/blender/ (turntables, clip frame strips, per-creature sheets, contact_sheet.png)
Publish: node tools/publish_holm_creatures.js apply (candidates -> assets/models/<id>.glb, Studio Safe Publish).
Run: "C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe" -b --python tools/blender/build_holm_creatures_v1.py -- [--no-render] [ids...]
"""
import bpy, bmesh, json, math, hashlib, struct, sys
from pathlib import Path
from mathutils import Vector, Matrix, Euler, Quaternion

ROOT = Path(__file__).resolve().parents[2]
WS = ROOT / '.studio-workspaces/holm-creatures-v1'
CAND = WS / 'candidates'
REN = ROOT / 'scratchpad/holm_creatures/blender'
CAND.mkdir(parents=True, exist_ok=True); REN.mkdir(parents=True, exist_ok=True)
ARGV = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
DO_RENDER = '--no-render' not in ARGV
ONLY = [a for a in ARGV if not a.startswith('--')]
FPS = 30
STEP = 3            # old-client stepping (the kit's step_all = (3, 'CONSTANT'))
SHARP_DEG = 40.0    # panel shading
BUDGET = {'tris': 3000, 'bones': 32, 'materials': 12}
CLIP_NAMES = ('idle', 'walk', 'attack', 'hit', 'block', 'death')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps = FPS

# ---------------------------------------------------------------------------------------------------------------
# materials: flat sRGB colours (what the game shows), roughness 1
# ---------------------------------------------------------------------------------------------------------------
def s2l(c):
    return ((c + .055) / 1.055) ** 2.4 if c > .04045 else c / 12.92

def mat(name, hexcol):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    c = tuple(int(hexcol.lstrip('#')[i:i + 2], 16) / 255 for i in (0, 2, 4))
    b.inputs['Base Color'].default_value = c + (1.0,)
    b.inputs['Roughness'].default_value = 1.0; b.inputs['Metallic'].default_value = 0.0
    if 'Specular IOR Level' in b.inputs:
        b.inputs['Specular IOR Level'].default_value = 0.0
    m.diffuse_color = tuple(s2l(x) for x in c) + (1.0,)   # workbench proofs show the sRGB the game draws
    m.roughness = 1.0; m.metallic = 0.0
    m['srgb'] = hexcol
    return m

# ---------------------------------------------------------------------------------------------------------------
# rig (the Scarlands bestiary convention: 'mid' bones roll so their local X is the world X)
# ---------------------------------------------------------------------------------------------------------------
class Rig:
    def __init__(self, name, bones):
        """bones: [(name, parent, head, tail, kind)]; kind 'mid' (local X = world X, X-rotation pitches) or 'root'"""
        self.name = name
        self.bones = {b[0]: b for b in bones}
        self.order = [b[0] for b in bones]
        ad = bpy.data.armatures.new(name); self.arm = bpy.data.objects.new(name, ad)
        bpy.context.scene.collection.objects.link(self.arm)
        bpy.context.view_layer.objects.active = self.arm
        bpy.ops.object.mode_set(mode='EDIT')
        for n, parent, h, t, kind in bones:
            eb = ad.edit_bones.new(n); eb.head, eb.tail = Vector(h), Vector(t)
            y = (eb.tail - eb.head).normalized()
            z = Vector((1, 0, 0)).cross(y)
            if z.length < 1e-4:
                z = Vector((0, -1, 0))
            eb.align_roll(z.normalized())
            if parent:
                eb.parent = ad.edit_bones[parent]; eb.use_connect = False
            eb.use_deform = kind != 'root'
        bpy.ops.object.mode_set(mode='OBJECT')
        for pb in self.arm.pose.bones:
            pb.rotation_mode = 'XYZ'
        self.root = next(n for n in self.order if self.bones[n][4] == 'root')
        self.seg = {n: (Vector(b[2]), Vector(b[3])) for n, b in self.bones.items() if b[4] != 'root'}

    def weights(self, p, allowed, sharp=6.0):
        """distance-blended weights over the allowed bones (top 3)"""
        ws = []
        for n in allowed:
            a, b = self.seg[n]; ab = b - a
            t = max(0.0, min(1.0, (p - a).dot(ab) / max(1e-9, ab.length_squared)))
            d = (p - (a + ab * t)).length
            ws.append((n, 1.0 / (d ** sharp + 1e-6)))
        ws.sort(key=lambda x: -x[1]); ws = ws[:3]; tot = sum(w for _, w in ws)
        return [(n, w / tot) for n, w in ws if w / tot > 0.02]

# ---------------------------------------------------------------------------------------------------------------
# geometry
# ---------------------------------------------------------------------------------------------------------------
def ring(c, axis, rx, ru, rd=None, n=8, up=(0, 0, 1), phase=None):
    """a ring round `axis` through c: rx across (a x up), ru toward `up` (projected), rd away from it (default ru).
    phase defaults to half a step, so a ring has a flat top / bottom panel instead of a ridge"""
    rd = ru if rd is None else rd
    c = Vector(c); a = Vector(axis).normalized(); u = Vector(up)
    u = u - a * u.dot(a)
    if u.length < 1e-6:
        u = Vector((0, -1, 0)) - a * a.dot(Vector((0, -1, 0)))
    u.normalize(); s = a.cross(u).normalized()
    ph = math.pi / n if phase is None else phase
    out = []
    for j in range(n):
        t = ph + j * math.tau / n
        sn = math.sin(t)
        out.append(c + s * (math.cos(t) * rx) + u * (sn * (ru if sn >= 0 else rd)))
    return out

def path_rings(pts, radii, n=8, up=(0, 0, 1), phase=None):
    """rings along a polyline: pts [Vector], radii [(rx, ru[, rd])]"""
    pts = [Vector(p) for p in pts]; out = []
    for i, p in enumerate(pts):
        a = pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]
        r = radii[i]
        out.append(ring(p, a, r[0], r[1], r[2] if len(r) > 2 else r[1], n, up, phase))
    return out

def mirror(p, s):
    return (p[0] * s, p[1], p[2])

class Body:
    def __init__(self, rig):
        self.rig = rig; self.v = []; self.w = []; self.f = []; self.fm = []; self.mats = []
    def _mi(self, m):
        if m not in self.mats:
            self.mats.append(m)
        return self.mats.index(m)
    def vert(self, p, allowed, sharp=6.0):
        p = Vector(p); self.v.append(p)
        self.w.append(self.rig.weights(p, allowed, sharp) if isinstance(allowed, (list, tuple)) else [(allowed, 1.0)])
        return len(self.v) - 1
    def face(self, idx, m):
        self.f.append(tuple(idx)); self.fm.append(self._mi(m))
    def loft(self, rings, m, allowed, cap0=True, cap1=True, sharp=6.0, mats=None, allowed_fn=None):
        ids = [[self.vert(p, allowed_fn(i) if allowed_fn else allowed, sharp) for p in r] for i, r in enumerate(rings)]
        n = len(ids[0])
        for i in range(len(ids) - 1):
            for k in range(n):
                self.face((ids[i][k], ids[i][(k + 1) % n], ids[i + 1][(k + 1) % n], ids[i + 1][k]), mats(i, k) if mats else m)
        if cap0:
            self.face(list(reversed(ids[0])), mats(-1, 0) if mats else m)
        if cap1:
            self.face(ids[-1], mats(len(ids) - 1, 0) if mats else m)
        return ids
    def cone(self, base_c, axis, rx, h, n, m, allowed, rz=None, up=(0, 0, 1)):
        rg = ring(base_c, axis, rx, rz if rz is not None else rx, None, n, up)
        ids = [self.vert(p, allowed) for p in rg]
        apex = self.vert(Vector(base_c) + Vector(axis).normalized() * h, allowed)
        for k in range(n):
            self.face((ids[k], ids[(k + 1) % n], apex), m)
        self.face(list(reversed(ids)), m)
    def blob(self, c, r, m, allowed, scale=(1, 1, 1), seg=6):
        """a low-poly ball (eyes, knuckles, nubs)"""
        rings_ = []
        for i in range(1, seg):
            t = math.pi * i / seg; z = math.cos(t); rr = math.sin(t)
            rings_.append([Vector(c) + Vector((math.cos(a) * rr * r * scale[0], math.sin(a) * rr * r * scale[1], z * r * scale[2]))
                           for a in [(j + .5) * math.tau / seg for j in range(seg)]])
        ids = [[self.vert(p, allowed) for p in rr_] for rr_ in rings_]
        top = self.vert(Vector(c) + Vector((0, 0, r * scale[2])), allowed); bot = self.vert(Vector(c) - Vector((0, 0, r * scale[2])), allowed)
        n = seg
        for k in range(n):
            self.face((ids[0][k], ids[0][(k + 1) % n], top), m)
            self.face((ids[-1][(k + 1) % n], ids[-1][k], bot), m)
        for i in range(len(ids) - 1):
            for k in range(n):
                self.face((ids[i][(k + 1) % n], ids[i][k], ids[i + 1][k], ids[i + 1][(k + 1) % n]), m)
    def plate(self, pts, m, allowed):
        self.face([self.vert(p, allowed) for p in pts], m)
    def recolor(self, fn):
        """fn(material, face centre) -> a material or None (patches: the cow's black and white)"""
        for i, f in enumerate(self.f):
            c = sum((self.v[j] for j in f), Vector()) / len(f)
            nm = fn(self.mats[self.fm[i]], c)
            if nm is not None:
                self.fm[i] = self._mi(nm)
    def build(self, name):
        me = bpy.data.meshes.new(name)
        me.from_pydata([tuple(p) for p in self.v], [], self.f)
        for i, p in enumerate(me.polygons):
            p.material_index = self.fm[i]
        for m in self.mats:
            me.materials.append(m)
        bm = bmesh.new(); bm.from_mesh(me)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        bmesh.ops.triangulate(bm, faces=bm.faces[:], quad_method='BEAUTY', ngon_method='BEAUTY')
        bm.normal_update()
        # panel shading (the kit's rule): smooth inside one material region, hard edges at material boundaries,
        # open edges and wherever two faces meet at more than SHARP_DEG
        lim = math.radians(SHARP_DEG)
        for f in bm.faces:
            f.smooth = True
        for e in bm.edges:
            lf = e.link_faces
            if len(lf) != 2 or lf[0].material_index != lf[1].material_index:
                e.smooth = False
            else:
                e.smooth = lf[0].normal.angle(lf[1].normal, 0.0) < lim
        bm.to_mesh(me); bm.free()
        ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
        for n in self.rig.seg:
            ob.vertex_groups.new(name=n)
        for i, ws in enumerate(self.w):
            for n, w in ws:
                ob.vertex_groups[n].add([i], w, 'REPLACE')
        ob.parent = self.rig.arm
        mod = ob.modifiers.new('Armature', 'ARMATURE'); mod.object = self.rig.arm
        return ob

# ---------------------------------------------------------------------------------------------------------------
# clips: keys are [(frame, {bone: (rx, ry, rz) local degrees, 'root_loc': world (x, y, z) m, 'root_rot': world degrees})]
# ---------------------------------------------------------------------------------------------------------------
def to_local_quat(rig, bone, world_euler_deg):
    M = rig.arm.data.bones[bone].matrix_local.to_3x3()
    q = Euler([math.radians(a) for a in world_euler_deg], 'XYZ').to_quaternion()
    return (M.inverted() @ q.to_matrix() @ M).to_quaternion()

def _all_fcurves(act):
    fcs = list(getattr(act, 'fcurves', []) or [])
    if not fcs:
        for layer in getattr(act, 'layers', []):
            for strip in layer.strips:
                for cb in strip.channelbags:
                    fcs += list(cb.fcurves)
    return fcs

def make_clip(rig, name, frames, keys):
    arm = rig.arm
    act = bpy.data.actions.new(rig.name + '__' + name); act.use_fake_user = True
    arm.animation_data_create(); arm.animation_data.action = act
    bones = [n for n in rig.order if n != rig.root]
    rpb = arm.pose.bones[rig.root]; rpb.rotation_mode = 'QUATERNION'
    Mr = arm.data.bones[rig.root].matrix_local.to_3x3()
    for f, pose in keys:
        for n in bones:
            pb = arm.pose.bones[n]
            pb.rotation_euler = Euler([math.radians(a) for a in pose.get(n, (0, 0, 0))], 'XYZ')
            pb.keyframe_insert('rotation_euler', frame=f)
        rpb.location = Mr.inverted() @ Vector(pose.get('root_loc', (0, 0, 0)))
        rpb.rotation_quaternion = to_local_quat(rig, rig.root, pose.get('root_rot', (0, 0, 0)))
        rpb.keyframe_insert('location', frame=f); rpb.keyframe_insert('rotation_quaternion', frame=f)
    fcs = _all_fcurves(act)
    for fc in fcs:
        for kp in fc.keyframe_points:
            kp.interpolation = 'BEZIER'
        fc.update()
    # old-client stepping: resample on a 3-frame grid (plus every authored key of a sparse clip) and hold each pose
    sparse = len(keys) <= frames // 2
    grid = sorted(set(list(range(0, frames + 1, STEP)) + ([int(k[0]) for k in keys if 0 <= k[0] <= frames] if sparse else []) + [frames]))
    for fc in fcs:
        vals = [(f, fc.evaluate(f)) for f in grid]
        fc.keyframe_points.clear(); fc.keyframe_points.add(len(vals))
        for kp, (f, v) in zip(fc.keyframe_points, vals):
            kp.co = (f, v); kp.handle_left = (f, v); kp.handle_right = (f, v); kp.interpolation = 'CONSTANT'
        fc.update()
    act.use_frame_range = True; act.frame_start, act.frame_end = 0, frames
    arm.animation_data.action = None
    tr = arm.animation_data.nla_tracks.new(); tr.name = name
    st = tr.strips.new(name, 0, act); st.name = name
    return act, grid

def set_pose(rig, pose):
    arm = rig.arm
    for n in rig.order:
        if n == rig.root:
            continue
        pb = arm.pose.bones[n]; pb.rotation_mode = 'XYZ'
        pb.rotation_euler = Euler([math.radians(a) for a in pose.get(n, (0, 0, 0))], 'XYZ')
    rpb = arm.pose.bones[rig.root]; rpb.rotation_mode = 'QUATERNION'
    rpb.location = arm.data.bones[rig.root].matrix_local.to_3x3().inverted() @ Vector(pose.get('root_loc', (0, 0, 0)))
    rpb.rotation_quaternion = to_local_quat(rig, rig.root, pose.get('root_rot', (0, 0, 0)))

def pose_bounds(rig, meshes, pose):
    """the skinned mesh's lowest z and bbox centre (x, y) in a pose (no animation data applied)"""
    ad = rig.arm.animation_data
    if ad:
        ad.action = None; ad.use_nla = False
    set_pose(rig, pose); bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get(); pts = []
    for o in meshes:
        oe = o.evaluated_get(dg); me = oe.to_mesh()
        pts += [o.matrix_world @ v.co for v in me.vertices]
        oe.to_mesh_clear()
    if ad:
        ad.use_nla = True
    xs = [p.x for p in pts]; ys = [p.y for p in pts]
    return min(p.z for p in pts), (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2

def lerp_pose(a, b, t):
    out = {}
    for k in set(a) | set(b):
        va, vb = a.get(k, (0, 0, 0)), b.get(k, (0, 0, 0))
        out[k] = tuple(x + (y - x) * t for x, y in zip(va, vb))
    return out

def settle(rig, meshes, keys, step=1):
    """death clips: resample (smoothstep between the authored keys), lift / drop the whole body so its lowest point
    touches the ground (no sinking or floating while it falls about the Root at its feet), and slide it, in step with
    the fall, so the body ends centred where it stood (a corpse lies on its own tile)"""
    _, cx0, cy0 = pose_bounds(rig, meshes, keys[0][1])
    _, cx1, cy1 = pose_bounds(rig, meshes, keys[-1][1])
    rot_end = max(abs(a) for a in keys[-1][1].get('root_rot', (0, 0, 0))) or 1.0
    frames = sorted(set(list(range(0, keys[-1][0] + 1, step)) + [f for f, _ in keys]))
    out = []
    for f in frames:
        pose = keys[-1][1]
        for (f0, p0), (f1, p1) in zip(keys, keys[1:]):
            if f0 <= f <= f1:
                t = (f - f0) / max(1, f1 - f0); pose = lerp_pose(p0, p1, t * t * (3 - 2 * t)); break
        rot = max(abs(a) for a in pose.get('root_rot', (0, 0, 0)))
        k = min(1.0, rot / rot_end)
        minz, _, _ = pose_bounds(rig, meshes, pose)
        loc = Vector(pose.get('root_loc', (0, 0, 0)))
        loc.z -= minz
        loc.x -= (cx1 - cx0) * k; loc.y -= (cy1 - cy0) * k
        pose = dict(pose); pose['root_loc'] = tuple(loc)
        out.append((f, pose))
    return out

def mix(*poses, **extra):
    d = {}
    for p in poses:
        for k, v in p.items():
            if k in d and k not in ('root_loc', 'root_rot'):
                d[k] = tuple(a + b for a, b in zip(d[k], v))
            else:
                d[k] = v
    d.update(extra)
    return d

def scale_pose(p, s):
    return {k: tuple(a * s for a in v) for k, v in p.items()}

def bump(t, a, b):
    """0 outside [a, b], a smooth hump inside (peak 1 at the middle)"""
    if t <= a or t >= b:
        return 0.0
    return math.sin(math.pi * (t - a) / (b - a)) ** 2

def sampled(frames, fn, every=STEP):
    return [(f, fn(f)) for f in range(0, frames + 1, every)]

def export(rig, meshes, path):
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.context.scene.objects:
        o.hide_set(False)
    rig.arm.select_set(True)
    for m in meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = rig.arm
    for tr in rig.arm.animation_data.nla_tracks:
        tr.mute = False
    kw = dict(filepath=str(path), export_format='GLB', use_selection=True, export_yup=True, export_apply=False, export_animations=True,
              export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_nla_strips=True, export_frame_range=False, export_skins=True,
              export_def_bones=False, export_reset_pose_bones=True, export_materials='EXPORT', export_texcoords=False, export_extras=False,
              export_cameras=False, export_lights=False)
    props = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
    bpy.ops.export_scene.gltf(**{k: v for k, v in kw.items() if k in props or k == 'filepath'})

# ---------------------------------------------------------------------------------------------------------------
# 1. RATS: the quadruped rig (Root, Hips, Spine, Chest, Neck, Head, Jaw, Tail1-4, three bones per leg)
# ---------------------------------------------------------------------------------------------------------------
def quadruped_bones(Q):
    rump, mid, chest = Vector(Q['rump']), Vector(Q['mid']), Vector(Q['chest'])
    neck, head, snout = Vector(Q['neck']), Vector(Q['head']), Vector(Q['snout'])
    bones = [('Root', None, (0, 0, 0), (0, 0, .25), 'root'),
             ('Hips', 'Root', tuple(rump), tuple(mid), 'mid'),
             ('Spine', 'Hips', tuple(mid), tuple(chest), 'mid'),
             ('Chest', 'Spine', tuple(chest), tuple(neck), 'mid'),
             ('Neck', 'Chest', tuple(neck), tuple(head), 'mid'),
             ('Head', 'Neck', tuple(head), tuple(snout), 'mid')]
    jaw_h = head + Vector((0, -0.02, -Q['jaw_drop']))
    bones.append(('Jaw', 'Head', tuple(jaw_h), tuple(snout + Vector((0, 0.02, -Q['jaw_drop'] * 1.1))), 'mid'))
    tail = [Vector(t) for t in Q['tail']]
    for i in range(len(tail) - 1):
        bones.append(('Tail%d' % (i + 1), 'Hips' if i == 0 else 'Tail%d' % i, tuple(tail[i]), tuple(tail[i + 1]), 'mid'))
    for side, s in (('L', 1), ('R', -1)):
        fl = [mirror(p, s) for p in Q['front_leg']]; hl = [mirror(p, s) for p in Q['hind_leg']]
        bones += [('UpperArm' + side, 'Chest', fl[0], fl[1], 'mid'), ('ForeArm' + side, 'UpperArm' + side, fl[1], fl[2], 'mid'),
                  ('Paw' + side, 'ForeArm' + side, fl[2], fl[3], 'mid'),
                  ('Thigh' + side, 'Hips', hl[0], hl[1], 'mid'), ('Shin' + side, 'Thigh' + side, hl[1], hl[2], 'mid'),
                  ('Foot' + side, 'Shin' + side, hl[2], hl[3], 'mid')]
    return bones

def rat(fid, P):
    """P: proportions + colours (see RATS below). Low and round like a 2004 rat: the belly a hand off the ground, short
    legs tucked under, a big blunt head, round ears and a long bare tail"""
    g, hmp, lg = P['girth'], P['hump'], P['leg']
    Q = dict(rump=(0, .30, .28 + hmp * .3), mid=(0, .04, .33 + hmp), chest=(0, -.16, .29), neck=(0, -.22, .29), head=(0, -.28, .30),
             snout=(0, -.54, .23), jaw_drop=.05,
             tail=[(0, .36, .25), (0, .55, .18), (0, .74, .11), (0, .92, .06), (0, 1.10 * P['tail'], .035)],
             front_leg=[(.11 * g, -.14, .22), (.12 * g, -.16, .12 * lg), (.12 * g, -.18, .04), (.12 * g, -.23, .01)],
             hind_leg=[(.14 * g, .20, .24), (.16 * g, .10, .13 * lg), (.16 * g, .22, .05), (.16 * g, .10, .01)])
    rig = Rig('Rig_' + fid, quadruped_bones(Q))
    C = P['col']
    M = dict(fur=mat(fid + ' fur', C['fur']), belly=mat(fid + ' belly', C['belly']), skin=mat(fid + ' pink skin', C['skin']),
             ear=mat(fid + ' ear', C['ear']), eye=mat(fid + ' eye', '#14100e'), tooth=mat(fid + ' incisor', '#e2cf7a'),
             nose=mat(fid + ' nose', C['nose']))
    b = Body(rig)
    # torso (rx, up, down): widest over the haunches, an arched back, the belly low
    T = [((0, .40, .24), (.04, .04, .04)), ((0, .33, .27), (.14 * g, .12, .12)), ((0, .22, .30 + hmp * .3), (.20 * g, .165 + hmp * .3, .18)),
         ((0, .06, .32 + hmp * .5), (.20 * g, .15 + hmp * .5, .20)), ((0, -.08, .30 + hmp * .2), (.18 * g, .14 + hmp * .2, .18)),
         ((0, -.18, .28), (.14 * g, .12, .14)), ((0, -.24, .28), (.10 * g, .10, .10))]
    belly = lambda i, k: M['belly'] if k in (4, 5, 6) and i >= 0 else M['fur']
    b.loft(path_rings([p for p, _ in T], [r for _, r in T], 8), M['fur'], ['Hips', 'Spine', 'Chest'], mats=belly)
    # head: broad cheeks tapering to a blunt pink nose
    H = [((0, -.20, .29), (.11 * g, .11, .10)), ((0, -.28, .30), (.115 * g, .11, .09)), ((0, -.37, .285), (.09 * g, .085, .07)),
         ((0, -.45, .26), (.06 * g, .055, .045)), ((0, -.51, .24), (.032, .03, .026)), ((0, -.535, .232), (.012, .011, .011))]
    b.loft(path_rings([p for p, _ in H], [r for _, r in H], 8), M['fur'], ['Chest', 'Neck', 'Head'], cap0=False,
           mats=lambda i, k: M['belly'] if k in (5,) and i >= 0 else M['fur'])
    # lower jaw (opens on the bite)
    b.loft(path_rings([(0, -.35, .245), (0, -.44, .222), (0, -.50, .21)], [(.05 * g, .018, .02), (.035, .014, .016), (.016, .01, .01)], 6),
           M['belly'], 'Jaw')
    b.blob((0, -.54, .234), .018, M['nose'], 'Head', (1.1, .9, .9))
    b.plate([(-.013, -.522, .218), (.013, -.522, .218), (.011, -.517, .19), (-.011, -.517, .19)], M['tooth'], 'Head')   # incisors
    for s in (1, -1):
        b.blob((.074 * s * g, -.345, .342), .019, M['eye'], 'Head', (1, 1.2, 1))
        b.blob((.088 * s * g, -.262, .395), .058 * P['ears'], M['ear'], 'Head', (.95, .34, 1.0))                 # round ears
        b.blob((.088 * s * g, -.276, .395), .04 * P['ears'], M['skin'], 'Head', (.8, .2, .8))                   # pink inside
    # legs: short, a furry shoulder / haunch, bare pink paws with toes
    for side, s in (('L', 1), ('R', -1)):
        fl = [Vector(mirror(p, s)) for p in Q['front_leg']]; hl = [Vector(mirror(p, s)) for p in Q['hind_leg']]
        b.loft(path_rings([fl[0] + Vector((0, 0, .04)), fl[1], fl[2]], [(.055 * g, .06), (.036, .034), (.024, .024)], 6), M['fur'],
               ['Chest', 'UpperArm' + side, 'ForeArm' + side], cap0=False)
        b.loft(path_rings([fl[2], fl[2].lerp(fl[3], .5) + Vector((0, 0, .01)), fl[3] + Vector((0, 0, .008))], [(.022, .022), (.025, .016), (.022, .01)], 6),
               M['skin'], ['ForeArm' + side, 'Paw' + side])
        for dx in (-.015, 0, .015):
            b.cone(fl[3] + Vector((dx, -.006, .008)), (0, -1, -.3), .007, .028, 4, M['skin'], 'Paw' + side)
        b.loft(path_rings([hl[0] + Vector((0, 0, .04)), hl[0].lerp(hl[1], .5), hl[1], hl[2]], [(.095 * g, .10), (.085 * g, .08), (.048, .048), (.028, .028)], 7),
               M['fur'], ['Hips', 'Thigh' + side, 'Shin' + side], cap0=False)
        b.loft(path_rings([hl[2] + Vector((0, .01, -.025)), hl[2].lerp(hl[3], .5) + Vector((0, 0, -.012)), hl[3] + Vector((0, 0, .008))],
                          [(.026, .02, .012), (.028, .014, .01), (.024, .01, .008)], 6), M['skin'], ['Shin' + side, 'Foot' + side])
        for dx in (-.017, 0, .017):
            b.cone(hl[3] + Vector((dx, -.004, .008)), (0, -1, -.3), .008, .032, 4, M['skin'], 'Foot' + side)
    # tail: bare, pink, tapering to a point
    tp = [Vector(t) for t in Q['tail']]; tr = [.04, .03, .021, .013, .006]
    b.loft(path_rings(tp, [(r, r) for r in tr], 6), M['skin'], ['Hips', 'Tail1', 'Tail2', 'Tail3', 'Tail4'], cap0=False)
    ob = b.build(fid + '_Body')

    # ---- clips (rat) ----
    def idle(f):
        t = f / 60.0; w = math.tau * t
        lift = bump(t, .12, .52)                                  # up on the haunches, sniffing the air, a paw raised
        tw = (1 if (f // 3) % 2 else -1) * lift                   # the nose twitches every step
        look = bump(t, .58, .84)
        br = math.sin(w)
        return {'Hips': (-5 * lift, 0, 0), 'Spine': (1.5 * br - 4 * lift, 0, 0), 'Chest': (-1.5 * br - 6 * lift, 0, 0),
                'Neck': (-10 * lift, 0, 6 * look), 'Head': (8 * lift + 4 * tw, 0, 14 * look),
                'Jaw': (5 * abs(tw), 0, 0), 'UpperArmL': (-28 * lift, 0, 0), 'ForeArmL': (46 * lift, 0, 0), 'PawL': (20 * lift, 0, 0),
                'UpperArmR': (6 * lift, 0, 0), 'ThighL': (8 * lift, 0, 0), 'ThighR': (8 * lift, 0, 0), 'ShinL': (-6 * lift, 0, 0), 'ShinR': (-6 * lift, 0, 0),
                'Tail1': (4 * lift, 0, 10 * math.sin(w)), 'Tail2': (0, 0, 14 * math.sin(w - .7)), 'Tail3': (0, 0, 16 * math.sin(w - 1.4)),
                'Tail4': (0, 0, 16 * math.sin(w - 2.1)), 'root_loc': (0, 0, .004 * br)}
    def walk(f):
        ph = f / 15.0; sw = lambda o: math.sin((ph + o) * math.tau); lift = lambda o: max(0.0, math.sin((ph + o) * math.tau))
        a, c = sw(0), sw(.5)
        return {'UpperArmL': (30 * a, 0, 0), 'UpperArmR': (30 * c, 0, 0), 'ForeArmL': (-34 * lift(.25), 0, 0), 'ForeArmR': (-34 * lift(.75), 0, 0),
                'PawL': (20 * lift(.25), 0, 0), 'PawR': (20 * lift(.75), 0, 0),
                'ThighL': (-30 * c, 0, 0), 'ThighR': (-30 * a, 0, 0), 'ShinL': (34 * lift(.25), 0, 0), 'ShinR': (34 * lift(.75), 0, 0),
                'FootL': (-18 * lift(.25), 0, 0), 'FootR': (-18 * lift(.75), 0, 0),
                'Hips': (3 * math.sin(ph * 2 * math.tau), 0, 0), 'Spine': (-4 * math.sin(ph * 2 * math.tau), 0, 3 * a), 'Chest': (2 * math.sin(ph * 2 * math.tau), 0, -3 * a),
                'Head': (-3 * math.sin(ph * 2 * math.tau), 0, -4 * a),
                'Tail1': (-4, 0, 14 * a), 'Tail2': (0, 0, 16 * math.sin((ph - .12) * math.tau)), 'Tail3': (0, 0, 18 * math.sin((ph - .24) * math.tau)),
                'Tail4': (0, 0, 18 * math.sin((ph - .36) * math.tau)), 'root_loc': (0, 0, .014 * abs(math.sin(ph * 2 * math.tau)))}
    rear = {'Hips': (-8, 0, 0), 'Spine': (-6, 0, 0), 'Chest': (-10, 0, 0), 'Neck': (-12, 0, 0), 'Head': (10, 0, 0),
            'UpperArmL': (-40, 0, 0), 'UpperArmR': (-34, 0, 0), 'ForeArmL': (50, 0, 0), 'ForeArmR': (44, 0, 0),
            'ThighL': (10, 0, 0), 'ThighR': (10, 0, 0), 'Tail1': (10, 0, 0), 'root_loc': (0, .06, .02)}
    gape = mix(rear, Jaw=(34, 0, 0), Head=(-6, 0, 0))
    bite = {'Hips': (2, 0, 0), 'Spine': (3, 0, 0), 'Chest': (4, 0, 0), 'Neck': (2, 0, 0), 'Head': (-2, 0, 0), 'Jaw': (2, 0, 0),
            'UpperArmL': (-30, 0, 0), 'UpperArmR': (-26, 0, 0), 'ForeArmL': (10, 0, 0), 'ForeArmR': (10, 0, 0),
            'ThighL': (-16, 0, 0), 'ThighR': (-12, 0, 0), 'ShinL': (10, 0, 0), 'Tail1': (-6, 0, 8), 'root_loc': (0, -.16, -.01)}
    attack = [(0, {}), (4, rear), (7, gape), (9, bite), (12, mix(bite, Jaw=(12, 0, 0))), (18, {})]
    flinch = {'Hips': (4, 0, -4), 'Chest': (-10, 0, 10), 'Neck': (-8, 0, 0), 'Head': (-16, 0, 14), 'Jaw': (16, 0, 0),
              'UpperArmL': (-16, 0, 0), 'UpperArmR': (-10, 0, 0), 'Tail1': (16, 0, -16), 'Tail2': (0, 0, -12), 'root_loc': (0, .08, 0)}
    hit = [(0, {}), (3, flinch), (6, mix(flinch, root_loc=(0, .05, 0))), (12, {})]
    cower = {'Hips': (4, 0, 0), 'Chest': (4, 0, 0), 'Neck': (8, 0, 0), 'Head': (4, 0, 0), 'UpperArmL': (-34, 0, 0), 'UpperArmR': (-30, 0, 0),
             'ForeArmL': (40, 0, 0), 'ForeArmR': (36, 0, 0), 'ThighL': (8, 0, 0), 'ThighR': (8, 0, 0), 'Tail1': (0, 0, 26), 'Tail2': (0, 0, 20),
             'root_loc': (0, .05, -.03)}
    block = [(0, {}), (3, cower), (8, mix(cower, Head=(10, 0, 0))), (12, {})]
    stagger = {'Hips': (6, 0, 6), 'Chest': (10, 0, -8), 'Neck': (12, 0, 0), 'Head': (6, 0, -10), 'Jaw': (18, 0, 0),
               'UpperArmL': (14, 0, 0), 'ForeArmL': (24, 0, 0), 'ThighL': (16, 0, 0), 'ShinL': (-24, 0, 0), 'root_loc': (.02, .04, -.05)}
    down = {'root_rot': (0, 90, 0), 'Hips': (4, 0, 0), 'Neck': (8, 0, -8), 'Head': (14, 0, -8), 'Jaw': (22, 0, 0),
            'UpperArmL': (-22, 0, 0), 'UpperArmR': (18, 0, 0), 'ForeArmL': (14, 0, 0), 'ThighL': (-18, 0, 0), 'ThighR': (22, 0, 0),
            'ShinL': (-10, 0, 0), 'Tail1': (0, 0, -10), 'Tail2': (0, 0, -16), 'Tail3': (0, 0, -12)}
    death = [(0, {}), (3, flinch), (9, stagger), (17, mix(down, root_rot=(0, 97, 0))), (22, down),
             (25, mix(down, UpperArmL=(-30, 0, 0), ThighR=(28, 0, 0))), (30, down)]
    clips = {'idle': (60, sampled(60, idle), True), 'walk': (15, sampled(15, walk), True), 'attack': (18, attack, False),
             'hit': (12, hit, False), 'block': (12, block, False), 'death': (30, death, False)}
    return rig, [ob], clips

RATS = {
    'holm_large_rat_v1': dict(girth=1.0, hump=.05, leg=1.0, tail=1.0, ears=1.0,
                              col={'fur': '#74604f', 'belly': '#a08a76', 'skin': '#c99488', 'ear': '#86705f', 'nose': '#8e5a52'}),
    'holm_rat_v1': dict(girth=.86, hump=.0, leg=1.05, tail=1.08, ears=1.15,
                        col={'fur': '#78726c', 'belly': '#a8a198', 'skin': '#cca49a', 'ear': '#8a827c', 'nose': '#7e5a56'}),
}

# ---------------------------------------------------------------------------------------------------------------
# 2. THE GOBLIN: its own biped rig
# ---------------------------------------------------------------------------------------------------------------
def goblin(fid):
    bones = [('Root', None, (0, 0, 0), (0, 0, .2), 'root'),
             ('Hips', 'Root', (0, .00, .50), (0, -.02, .64), 'mid'),
             ('Spine', 'Hips', (0, -.02, .64), (0, -.05, .79), 'mid'),
             ('Chest', 'Spine', (0, -.05, .79), (0, -.10, .92), 'mid'),
             ('Neck', 'Chest', (0, -.10, .92), (0, -.15, .99), 'mid'),
             ('Head', 'Neck', (0, -.15, .99), (0, -.15, 1.26), 'mid'),
             ('Jaw', 'Head', (0, -.16, 1.05), (0, -.27, 1.03), 'mid')]
    for side, s in (('L', 1), ('R', -1)):
        bones += [('Ear' + side, 'Head', mirror((.12, -.14, 1.13), s), mirror((.32, -.08, 1.22), s), 'mid'),
                  ('UpperArm' + side, 'Chest', mirror((.16, -.08, .90), s), mirror((.22, -.07, .67), s), 'mid'),
                  ('ForeArm' + side, 'UpperArm' + side, mirror((.22, -.07, .67), s), mirror((.24, -.13, .46), s), 'mid'),
                  ('Hand' + side, 'ForeArm' + side, mirror((.24, -.13, .46), s), mirror((.25, -.16, .37), s), 'mid'),
                  ('Thigh' + side, 'Hips', mirror((.085, .0, .50), s), mirror((.10, -.03, .29), s), 'mid'),
                  ('Shin' + side, 'Thigh' + side, mirror((.10, -.03, .29), s), mirror((.10, .01, .075), s), 'mid'),
                  ('Foot' + side, 'Shin' + side, mirror((.10, .01, .075), s), mirror((.11, -.12, .02), s), 'mid')]
    rig = Rig('Rig_' + fid, bones)
    M = dict(skin=mat(fid + ' green skin', '#6b8c38'), dark=mat(fid + ' dark green', '#54712c'), ear=mat(fid + ' ear', '#789a42'),
             tunic=mat(fid + ' hide tunic', '#7c5c3a'), belt=mat(fid + ' rope belt', '#43301f'), eye=mat(fid + ' yellow eye', '#e8c238'),
             pupil=mat(fid + ' pupil', '#150e08'), tusk=mat(fid + ' tusk', '#e4d9bc'), mouth=mat(fid + ' mouth', '#2e1a14'),
             wood=mat(fid + ' club wood', '#8c6238'), wood2=mat(fid + ' club knot', '#5e4026'), nail=mat(fid + ' iron nail', '#707070'))
    b = Body(rig)
    FWD = (0, -1, 0)
    # torso (vertical rings, ru = front, rd = back): a pot belly in a sleeveless hide tunic, bare shoulders
    T = [((0, .01, .45), (.11, .09, .09)), ((0, .00, .51), (.155, .125, .12)), ((0, -.02, .61), (.185, .175, .13)),
         ((0, -.035, .71), (.19, .18, .13)), ((0, -.05, .80), (.175, .14, .13)), ((0, -.08, .875), (.17, .11, .12)),
         ((0, -.105, .93), (.15, .085, .10)), ((0, -.13, .97), (.075, .06, .065)), ((0, -.15, 1.02), (.06, .055, .055))]
    b.loft(path_rings([p for p, _ in T], [r for _, r in T], 10, up=FWD), M['tunic'], ['Hips', 'Spine', 'Chest', 'Neck'], cap1=False,
           mats=lambda i, k: M['tunic'] if i <= 4 else M['skin'])
    # the tunic's ragged hem, flared over the hips (jagged points), and the rope belt
    hem = [ring((0, .0, .56), (0, 0, 1), .178, .15, .135, 12, FWD), ring((0, .0, .49), (0, 0, 1), .19, .16, .15, 12, FWD),
           ring((0, .01, .41), (0, 0, 1), .205, .175, .165, 12, FWD)]
    hem[-1] = [p + Vector((0, 0, (-.035 if j % 2 else .02))) for j, p in enumerate(hem[-1])]
    b.loft(hem, M['tunic'], ['Hips'], cap0=False, cap1=False)
    b.loft([ring((0, -.005, z), (0, 0, 1), .19, .165, .145, 12, FWD) for z in (.545, .585)], M['belt'], ['Hips', 'Spine'], cap0=False, cap1=False)
    b.blob((.06, -.18, .565), .022, M['belt'], ['Hips', 'Spine'], (1, .6, 1))                             # the belt's knot
    # head: big, with a jutting brow, hooked nose, yellow eyes, tusks and long leaf ears
    Hd = [((0, -.15, 1.00), (.07, .07, .06)), ((0, -.15, 1.045), (.12, .12, .10)), ((0, -.145, 1.10), (.145, .135, .12)),
          ((0, -.14, 1.16), (.15, .13, .13)), ((0, -.14, 1.22), (.14, .12, .13)), ((0, -.14, 1.27), (.115, .10, .11)),
          ((0, -.14, 1.31), (.07, .06, .07)), ((0, -.14, 1.33), (.02, .02, .02))]
    b.loft(path_rings([p for p, _ in Hd], [r for _, r in Hd], 10, up=FWD), M['skin'], ['Neck', 'Head'], sharp=8.0)
    b.loft(path_rings([(-.105, -.245, 1.19), (-.05, -.27, 1.205), (0, -.272, 1.198), (.05, -.27, 1.205), (.105, -.245, 1.19)],
                      [(.022, .018)] * 5, 6), M['dark'], 'Head')                                            # brow ridge
    b.cone((0, -.258, 1.15), (0, -1, -.6), .042, .13, 6, M['dark'], 'Head', rz=.034)                        # hooked nose
    b.blob((0, -.352, 1.085), .024, M['dark'], 'Head', (1.1, 1, .9))                                           # its drooping tip
    for s in (1, -1):
        b.blob((.056 * s, -.262, 1.158), .026, M['eye'], 'Head', (1, .5, .72))
        b.blob((.058 * s, -.274, 1.156), .011, M['pupil'], 'Head', (1, .5, 1))
        b.cone((.047 * s, -.262, 1.052), (.1 * s, -.2, 1), .012, .05, 4, M['tusk'], 'Jaw')                    # tusks from the lower jaw
        # leaf ear: flat (thin front to back), wide top to bottom, a point at the tip
        ep = [mirror(p, s) for p in ((.125, -.14, 1.13), (.19, -.125, 1.16), (.26, -.105, 1.19), (.335, -.08, 1.225))]
        b.loft(path_rings(ep, [(.018, .05, .036), (.016, .056, .04), (.012, .04, .03), (.004, .008, .006)], 6), M['ear'],
               ['Head', 'Ear' + ('L' if s > 0 else 'R')], cap0=False)
    b.plate([(-.075, -.262, 1.082), (.075, -.262, 1.082), (.06, -.268, 1.068), (-.06, -.268, 1.068)], M['mouth'], 'Head')   # the mouth
    b.blob((0, -.235, 1.03), .055, M['skin'], 'Jaw', (1.45, .75, .6))                                          # the chin (moves with the jaw)
    # arms: long and skinny, a round shoulder, a mitten hand with a thumb
    for side, s in (('L', 1), ('R', -1)):
        ap = [mirror(p, s) for p in ((.15, -.08, .905), (.19, -.075, .80), (.22, -.07, .67), (.235, -.10, .57), (.245, -.13, .465))]
        b.loft(path_rings(ap, [(.052, .052), (.044, .044), (.036, .036), (.033, .033), (.03, .03)], 7), M['skin'],
               ['Chest', 'UpperArm' + side, 'ForeArm' + side, 'Hand' + side], cap0=False)
        b.blob(mirror((.148, -.08, .893), s), .052, M['skin'], ['Chest', 'UpperArm' + side], (1, 1, .9))
        b.blob(mirror((.25, -.148, .405), s), .046, M['skin'], 'Hand' + side, (.8, .95, 1.25))
        b.cone(mirror((.235, -.18, .43), s), (-.25 * s, -1, -.55), .015, .05, 5, M['skin'], 'Hand' + side)
        # legs: bow-legged and thin, knobbly knees, big bare feet with three toes
        lp = [mirror(p, s) for p in ((.085, .0, .52), (.095, -.015, .40), (.10, -.03, .29), (.10, -.01, .18), (.10, .01, .085))]
        b.loft(path_rings(lp, [(.068, .068), (.058, .058), (.046, .046), (.04, .04), (.034, .034)], 7), M['skin'],
               ['Hips', 'Thigh' + side, 'Shin' + side, 'Foot' + side], cap0=False)
        b.blob(mirror((.10, -.04, .29), s), .038, M['skin'], ['Thigh' + side, 'Shin' + side], (1, 1, 1))
        fp = [mirror(p, s) for p in ((.10, .05, .035), (.10, .0, .038), (.105, -.075, .03), (.11, -.13, .024))]
        b.loft(path_rings(fp, [(.038, .03, .03), (.05, .042, .032), (.056, .03, .022), (.046, .018, .018)], 7), M['skin'],
               ['Shin' + side, 'Foot' + side])
        for dx in (-.03, .0, .03):
            b.blob(mirror((.11 + dx, -.148, .022), s), .018, M['skin'], 'Foot' + side, (1, 1.2, .9))
    # the club, gripped in the right fist, carried pointing forward and down
    grip = Vector(mirror((.25, -.15, .40), -1)); d = Vector((0, -1, -.35)).normalized()
    b.loft(path_rings([grip - d * .07, grip + d * .2], [(.019, .019), (.021, .021)], 6), M['wood'], 'HandR')
    cp = [grip + d * .2, grip + d * .27, grip + d * .40, grip + d * .49]
    b.loft(path_rings(cp, [(.028, .028), (.05, .048), (.06, .058), (.034, .034)], 7), M['wood'], 'HandR',
           mats=lambda i, k: M['wood2'] if (k + i) % 3 == 0 else M['wood'])
    for k, (ax, off) in enumerate((((1, 0, .2), .33), ((-1, .1, .3), .38), ((0, .1, 1), .43), ((.6, -.2, -.8), .41))):
        c0 = grip + d * off
        b.cone(c0 + Vector(ax).normalized() * .045, ax, .008, .035, 4, M['nail'], 'HandR')
    ob = b.build(fid + '_Body')

    # ---- clips (goblin): vertical bones: +X hunches forward, Y twists, Z leans sideways; limbs: +X swings back ----
    def idle(f):
        t = f / 60.0; w = math.tau * t; br = math.sin(w)
        look = math.sin(w) * bump(t, .05, .5)
        tap = bump(t, .52, .66) + bump(t, .70, .84)                 # taps the club twice against its palm
        tw = bump(t, .18, .26)                                      # an ear twitch
        return {'Hips': (0, 0, 3 * math.sin(w)), 'Spine': (1.5 * br, 0, -2 * math.sin(w)), 'Chest': (2 * br, 4 * look, 0),
                'Neck': (-1 * br, 6 * look, 0), 'Head': (3 * tap, 16 * look, 2 * math.sin(w)),
                'EarL': (10 * tw, 0, 0), 'EarR': (-6 * tw, 0, 0), 'Jaw': (6 * bump(t, .3, .4), 0, 0),
                'UpperArmR': (-38 * tap, 0, 0), 'ForeArmR': (-44 * tap, 0, 0), 'HandR': (-10 * tap, 0, 0),
                'UpperArmL': (-18 * tap, 0, 0), 'ForeArmL': (-40 * tap, 0, 0),
                'ThighL': (0, 0, -2 * math.sin(w)), 'ThighR': (0, 0, -2 * math.sin(w)), 'root_loc': (.012 * math.sin(w), 0, .004 * br)}
    def walk(f):
        ph = f / 18.0; a = math.sin(ph * math.tau); c = math.cos(ph * math.tau)
        lL, lR = max(0.0, c), max(0.0, -c)
        return {'ThighL': (-28 * a, 0, -4), 'ThighR': (28 * a, 0, 4), 'ShinL': (44 * lL + 6, 0, 0), 'ShinR': (44 * lR + 6, 0, 0),
                'FootL': (-16 * lL, 0, 0), 'FootR': (-16 * lR, 0, 0),
                'Hips': (2, 7 * a, 5 * a), 'Spine': (3, 0, -3 * a), 'Chest': (2, -8 * a, 0), 'Neck': (0, 0, 2 * a), 'Head': (3 * math.cos(2 * ph * math.tau), 4 * a, 0),
                'UpperArmL': (22 * a, 0, -6), 'UpperArmR': (-22 * a, 0, 6), 'ForeArmL': (-18, 0, 0), 'ForeArmR': (-22, 0, 0),
                'EarL': (6 * math.cos(2 * ph * math.tau), 0, 0), 'EarR': (6 * math.cos(2 * ph * math.tau), 0, 0),
                'root_loc': (.018 * a, 0, .022 * abs(a) - .012)}
    wind = {'UpperArmR': (-160, 0, 12), 'ForeArmR': (-40, 0, 0), 'HandR': (-20, 0, 0), 'Chest': (-12, 16, 0), 'Spine': (-6, 8, 0), 'Head': (-8, -10, 0),
            'UpperArmL': (-40, 0, -14), 'ForeArmL': (-30, 0, 0), 'Jaw': (16, 0, 0), 'ThighL': (6, 0, 0), 'root_loc': (0, .04, 0)}
    smash = {'UpperArmR': (-62, 0, 4), 'ForeArmR': (-14, 0, 0), 'HandR': (18, 0, 0), 'Chest': (12, -14, 0), 'Spine': (6, -8, 0), 'Head': (-2, 6, 0),
             'UpperArmL': (26, 0, -10), 'ForeArmL': (-20, 0, 0), 'Jaw': (22, 0, 0), 'ThighL': (-30, 0, 0), 'ShinL': (18, 0, 0), 'ThighR': (12, 0, 0),
             'root_loc': (0, -.12, -.03)}
    attack = [(0, {}), (5, wind), (7, mix(wind, UpperArmR=(40, 0, 0))), (9, smash), (12, mix(smash, UpperArmR=(14, 0, 0), Chest=(4, 0, 0))), (18, {})]
    flinch = {'Chest': (-18, 10, 0), 'Spine': (-8, 0, 0), 'Head': (-16, 12, 6), 'Jaw': (18, 0, 0), 'UpperArmL': (-34, 0, -24), 'UpperArmR': (-24, 0, 22),
              'ForeArmL': (-30, 0, 0), 'ForeArmR': (-20, 0, 0), 'EarL': (-14, 0, 0), 'EarR': (-14, 0, 0), 'ThighR': (10, 0, 0), 'root_loc': (0, .08, 0)}
    hit = [(0, {}), (3, flinch), (7, mix(flinch, root_loc=(0, .05, 0))), (12, {})]
    guard = {'UpperArmR': (-72, 0, 14), 'ForeArmR': (-70, 0, 0), 'HandR': (-10, 0, 0), 'UpperArmL': (-60, 0, -10), 'ForeArmL': (-80, 0, 0),
             'Chest': (10, 0, 0), 'Head': (14, 0, 0), 'ThighL': (-10, 0, 0), 'ShinL': (16, 0, 0), 'ThighR': (-10, 0, 0), 'ShinR': (16, 0, 0),
             'root_loc': (0, .03, -.035)}
    block = [(0, {}), (3, guard), (8, mix(guard, Head=(4, 0, 0))), (12, {})]
    stagger = {'Chest': (-24, -10, 0), 'Spine': (-10, 0, 0), 'Head': (-22, 0, 10), 'Jaw': (24, 0, 0), 'UpperArmL': (-70, 0, -34), 'UpperArmR': (-50, 0, 30),
               'ForeArmL': (-30, 0, 0), 'ThighL': (-22, 0, 0), 'ShinL': (36, 0, 0), 'ThighR': (-12, 0, 0), 'ShinR': (28, 0, 0), 'root_loc': (0, .1, -.08)}
    fall = {'root_rot': (-88, 0, 0), 'Chest': (-8, 0, 0), 'Head': (-20, 14, 0), 'Jaw': (28, 0, 0), 'UpperArmL': (-120, 0, -40), 'UpperArmR': (-104, 0, 44),
            'ForeArmL': (-20, 0, 0), 'ForeArmR': (-26, 0, 0), 'ThighL': (-40, 0, -6), 'ShinL': (34, 0, 0), 'ThighR': (-24, 0, 8), 'ShinR': (20, 0, 0),
            'EarL': (-20, 0, 0), 'EarR': (-20, 0, 0)}
    death = [(0, {}), (4, flinch), (12, stagger), (21, mix(fall, root_rot=(-95, 0, 0))), (26, fall), (29, mix(fall, ThighL=(-48, 0, -6))), (36, fall)]
    clips = {'idle': (60, sampled(60, idle), True), 'walk': (18, sampled(18, walk), True), 'attack': (18, attack, False),
             'hit': (12, hit, False), 'block': (12, block, False), 'death': (36, death, False)}
    return rig, [ob], clips

# ---------------------------------------------------------------------------------------------------------------
# 3. THE CHICKEN: a bird rig (legs on the Root, so the body can pitch and peck with the feet planted)
# ---------------------------------------------------------------------------------------------------------------
def chicken(fid):
    bones = [('Root', None, (0, 0, 0), (0, 0, .15), 'root'),
             ('Hips', 'Root', (0, .10, .24), (0, -.05, .27), 'mid'),
             ('Chest', 'Hips', (0, -.05, .27), (0, -.11, .33), 'mid'),
             ('Neck', 'Chest', (0, -.11, .33), (0, -.13, .40), 'mid'),
             ('Head', 'Neck', (0, -.13, .40), (0, -.21, .42), 'mid'),
             ('Tail', 'Hips', (0, .11, .27), (0, .19, .38), 'mid')]
    for side, s in (('L', 1), ('R', -1)):
        bones += [('Wing' + side, 'Chest', mirror((.10, -.06, .30), s), mirror((.11, .13, .27), s), 'mid'),
                  ('Thigh' + side, 'Root', mirror((.055, .03, .20), s), mirror((.06, .0, .11), s), 'mid'),
                  ('Shin' + side, 'Thigh' + side, mirror((.06, .0, .11), s), mirror((.06, .015, .03), s), 'mid'),
                  ('Foot' + side, 'Shin' + side, mirror((.06, .015, .03), s), mirror((.06, -.06, .008), s), 'mid')]
    rig = Rig('Rig_' + fid, bones)
    M = dict(body=mat(fid + ' feathers', '#f4efe4'), wing=mat(fid + ' wing', '#e0d3ba'), tail=mat(fid + ' tail', '#ebe4d6'),
             red=mat(fid + ' comb', '#c8352a'), beak=mat(fid + ' beak and legs', '#e0a838'), eye=mat(fid + ' eye', '#16100c'))
    b = Body(rig)
    # a plump round body, the breast full and low, the rear rising to the tail
    T = [((0, .19, .29), (.025, .025, .025)), ((0, .14, .275), (.10, .095, .10)), ((0, .07, .265), (.135, .125, .14)),
         ((0, -.01, .265), (.14, .13, .15)), ((0, -.075, .28), (.122, .12, .14)), ((0, -.105, .315), (.09, .09, .10)),
         ((0, -.122, .36), (.062, .062, .066)), ((0, -.132, .405), (.05, .05, .05)), ((0, -.135, .425), (.046, .046, .046))]
    b.loft(path_rings([p for p, _ in T], [r for _, r in T], 8), M['body'], ['Hips', 'Chest'], cap1=False,
           allowed_fn=lambda i: ['Hips', 'Chest'] if i <= 4 else ['Chest', 'Neck', 'Head'])
    Hd = [((0, -.115, .425), (.04, .04, .035)), ((0, -.15, .44), (.043, .04, .034)), ((0, -.19, .435), (.032, .028, .026)), ((0, -.21, .425), (.015, .013, .012))]
    b.loft(path_rings([p for p, _ in Hd], [r for _, r in Hd], 7), M['body'], ['Neck', 'Head'], sharp=8.0)
    b.cone((0, -.21, .422), (0, -1, -.3), .014, .04, 5, M['beak'], 'Head', rz=.011)
    for y, h, r in ((-.128, .026, .014), (-.152, .034, .016), (-.176, .024, .013)):
        b.cone((0, y, .462), (0, .1, 1), .009, h, 5, M['red'], 'Head', rz=r)                                   # comb
    b.blob((0, -.192, .394), .014, M['red'], 'Head', (.6, .8, 1.4))                                          # wattle
    for s in (1, -1):
        side = 'L' if s > 0 else 'R'
        b.blob((.031 * s, -.17, .446), .009, M['eye'], 'Head')
        wp = [mirror(p, s) for p in ((.10, -.06, .30), (.125, .0, .295), (.13, .07, .28), (.12, .13, .265), (.10, .17, .255))]
        b.loft(path_rings(wp, [(.022, .062, .064), (.028, .078, .072), (.026, .068, .062), (.018, .048, .042), (.005, .012, .01)], 6), M['wing'],
               ['Chest', 'Wing' + side], sharp=8.0)
        b.blob(mirror((.06, .02, .17), s), .046, M['body'], ['Thigh' + side], (.9, 1.1, 1.1))                    # feathered drumstick
        b.loft(path_rings([mirror((.06, .0, .13), s), mirror((.06, .015, .03), s)], [(.012, .012), (.011, .011)], 5), M['beak'], 'Shin' + side)
        for ax in ((0, -1, -.12), (.4 * s, -1, -.12), (-.4 * s, -1, -.12)):
            b.cone(mirror((.06, .015, .014), s), ax, .008, .058, 4, M['beak'], 'Foot' + side)
        b.cone(mirror((.06, .02, .014), s), (0, 1, -.1), .007, .028, 4, M['beak'], 'Foot' + side)
    for ax in ((0, .55, 1), (.3, .55, .95), (-.3, .55, .95)):
        b.cone((0, .15, .30), ax, .016, .11, 5, M['tail'], 'Tail', rz=.05, up=(0, 1, 0))                     # tail fan
    ob = b.build(fid + '_Body')

    # ---- clips (chicken): Neck points up (+X tips it forward), Head forward (+X beak down); wings: Y opens (L -, R +)
    look = lambda z: {'Head': (0, 0, z), 'Neck': (0, 0, z * .4)}
    dip = {'Hips': (14, 0, 0), 'Chest': (10, 0, 0), 'Neck': (40, 0, 0), 'Head': (24, 0, 0), 'Tail': (8, 0, 0)}
    peck = mix(dip, Neck=(16, 0, 0), Head=(18, 0, 0))
    ruffle = {'WingL': (0, -28, -6), 'WingR': (0, 28, 6), 'Tail': (12, 0, 0), 'Hips': (0, 6, 0), 'root_loc': (0, 0, .01)}
    idle = [(0, {}), (6, look(22)), (12, look(22)), (15, look(-24)), (21, look(-24)), (27, dip), (30, peck), (33, dip), (36, peck), (39, dip),
            (45, look(8)), (51, {}), (54, ruffle), (57, {}), (60, mix(ruffle, WingL=(0, -16, 0), WingR=(0, 16, 0))), (63, {}), (72, {})]
    def walk(f):
        ph = f / 18.0; a = math.sin(ph * math.tau); c = math.cos(ph * math.tau); lL, lR = max(0.0, c), max(0.0, -c)
        bob = math.cos(2 * ph * math.tau)
        return {'ThighL': (-24 * a, 0, 0), 'ThighR': (24 * a, 0, 0), 'ShinL': (30 * lL, 0, 0), 'ShinR': (30 * lR, 0, 0),
                'FootL': (40 * lL, 0, 0), 'FootR': (40 * lR, 0, 0), 'Hips': (4, 5 * a, 0), 'Chest': (0, 0, 0),
                'Neck': (10 * bob + 6, 0, 0), 'Head': (-10 * bob - 4, 0, 0), 'Tail': (3 * bob, 0, 4 * a),
                'WingL': (0, -3 * abs(a), 0), 'WingR': (0, 3 * abs(a), 0), 'root_loc': (.01 * a, 0, .012 * abs(a))}
    wind = {'Neck': (-24, 0, 0), 'Head': (-12, 0, 0), 'WingL': (0, -58, -10), 'WingR': (0, 58, 10), 'Hips': (-10, 0, 0), 'Tail': (-10, 0, 0),
            'ThighL': (10, 0, 0), 'ThighR': (10, 0, 0), 'ShinL': (20, 0, 0), 'ShinR': (20, 0, 0), 'root_loc': (0, .04, -.02)}
    stab = {'Neck': (46, 0, 0), 'Head': (22, 0, 0), 'Hips': (18, 0, 0), 'Chest': (10, 0, 0), 'WingL': (0, -76, 6), 'WingR': (0, 76, -6), 'Tail': (14, 0, 0),
            'ThighL': (-12, 0, 0), 'ThighR': (-8, 0, 0), 'root_loc': (0, -.10, .05)}
    attack = [(0, {}), (5, wind), (9, stab), (12, mix(stab, WingL=(0, 40, 0), WingR=(0, -40, 0), root_loc=(0, -.08, .02))), (18, {})]
    flinch = {'Neck': (-22, 0, 14), 'Head': (-14, 0, 16), 'WingL': (0, -66, 0), 'WingR': (0, 66, 0), 'Tail': (22, 0, 0), 'Hips': (-8, 0, 0),
              'ThighL': (14, 0, 0), 'ThighR': (14, 0, 0), 'root_loc': (0, .06, .07)}
    hit = [(0, {}), (3, flinch), (6, mix(flinch, WingL=(0, 30, 0), WingR=(0, -30, 0), root_loc=(0, .07, .02))), (12, {})]
    hunker = {'Hips': (8, 0, 0), 'Neck': (18, 0, 0), 'Head': (-16, 0, 0), 'WingL': (0, -36, -12), 'WingR': (0, 36, 12), 'Tail': (-12, 0, 0),
              'ThighL': (-16, 0, 0), 'ThighR': (-16, 0, 0), 'ShinL': (30, 0, 0), 'ShinR': (30, 0, 0), 'FootL': (-14, 0, 0), 'FootR': (-14, 0, 0),
              'root_loc': (0, .03, -.03)}
    block = [(0, {}), (3, hunker), (8, mix(hunker, Head=(-6, 0, 0))), (12, {})]
    flail = {'WingL': (0, -86, -10), 'WingR': (0, 86, 10), 'Neck': (-30, 0, 20), 'Head': (-20, 0, 20), 'Tail': (24, 0, 0), 'ThighL': (30, 0, 0), 'ThighR': (-20, 0, 0),
             'root_loc': (0, .03, .08)}
    down = {'root_rot': (0, 88, 0), 'Neck': (52, 0, -20), 'Head': (30, 0, -10), 'WingL': (0, -40, -10), 'WingR': (0, 20, 0), 'Tail': (-10, 0, 0),
            'ThighL': (-50, 0, -10), 'ThighR': (-36, 0, 10), 'ShinL': (-20, 0, 0), 'ShinR': (-10, 0, 0), 'FootL': (30, 0, 0), 'FootR': (30, 0, 0)}
    death = [(0, {}), (3, flinch), (8, flail), (12, mix(flail, WingL=(0, 40, 0), WingR=(0, -40, 0))), (19, mix(down, root_rot=(0, 96, 0))), (24, down),
             (27, mix(down, ThighL=(-60, 0, -10))), (30, down)]
    clips = {'idle': (72, idle, True), 'walk': (18, sampled(18, walk), True), 'attack': (18, attack, False),
             'hit': (12, hit, False), 'block': (12, block, False), 'death': (30, death, False)}
    return rig, [ob], clips

# ---------------------------------------------------------------------------------------------------------------
# 4. THE COW: the quadruped rig + ears
# ---------------------------------------------------------------------------------------------------------------
def cow(fid):
    Q = dict(rump=(0, .70, .98), mid=(0, .10, .96), chest=(0, -.50, .98), neck=(0, -.68, 1.04), head=(0, -.94, 1.15), snout=(0, -1.28, .90),
             jaw_drop=.07, tail=[(0, .86, 1.04), (0, .91, .84), (0, .92, .64), (0, .92, .48), (0, .92, .40)],
             front_leg=[(.20, -.48, .80), (.21, -.50, .46), (.21, -.52, .15), (.21, -.56, .01)],
             hind_leg=[(.20, .60, .84), (.22, .50, .50), (.22, .68, .25), (.22, .62, .01)])
    bones = quadruped_bones(Q)
    for side, s in (('L', 1), ('R', -1)):
        bones.append(('Ear' + side, 'Head', mirror((.10, -.97, 1.19), s), mirror((.24, -.98, 1.18), s), 'mid'))
    rig = Rig('Rig_' + fid, bones)
    M = dict(white=mat(fid + ' white hide', '#ebe6dc'), black=mat(fid + ' black hide', '#2c2826'), pink=mat(fid + ' pink skin', '#d59b92'),
             horn=mat(fid + ' horn', '#ddd0ac'), hoof=mat(fid + ' hoof', '#302822'), eye=mat(fid + ' eye', '#120c0a'), nostril=mat(fid + ' nostril', '#6a3a36'))
    b = Body(rig)
    # a deep barrel on short sturdy legs: square rump, the belly low, a brisket in front
    T = [((0, .885, 1.00), (.10, .09, .10)), ((0, .80, 1.02), (.27, .22, .30)), ((0, .58, 1.00), (.33, .25, .42)),
         ((0, .28, .96), (.36, .28, .46)), ((0, -.04, .96), (.365, .285, .46)), ((0, -.34, .98), (.335, .28, .43)),
         ((0, -.56, 1.02), (.27, .26, .38)), ((0, -.68, 1.06), (.20, .21, .28)), ((0, -.79, 1.11), (.165, .17, .22)), ((0, -.90, 1.13), (.145, .15, .17))]
    b.loft(path_rings([p for p, _ in T], [r for _, r in T], 10), M['white'], ['Hips', 'Spine', 'Chest'], sharp=4.0, cap1=False,
           allowed_fn=lambda i: ['Hips', 'Spine', 'Chest'] if i <= 6 else ['Chest', 'Neck', 'Head'])
    Hd = [((0, -.88, 1.17), (.135, .115, .115)), ((0, -.99, 1.17), (.13, .10, .105)), ((0, -1.09, 1.10), (.115, .085, .09)),
          ((0, -1.19, 1.01), (.105, .075, .08)), ((0, -1.27, .94), (.105, .07, .075)), ((0, -1.315, .905), (.088, .05, .05))]
    b.loft(path_rings([p for p, _ in Hd], [r for _, r in Hd], 10), M['white'], ['Neck', 'Head'], cap0=False, sharp=8.0,
           mats=lambda i, k: M['pink'] if i >= 3 else M['white'])
    b.loft(path_rings([(0, -1.04, 1.01), (0, -1.18, .935), (0, -1.27, .882)], [(.08, .03, .03), (.075, .03, .028), (.066, .024, .024)], 7), M['pink'], 'Jaw')
    for s in (1, -1):
        side = 'L' if s > 0 else 'R'
        b.blob((.037 * s, -1.325, .918), .013, M['nostril'], 'Head')
        b.blob((.108 * s, -1.035, 1.165), .021, M['eye'], 'Head', (1, 1.2, 1))
        b.cone((.08 * s, -.95, 1.25), (.8 * s, .1, .55), .027, .10, 6, M['horn'], 'Head')
        b.blob((.17 * s, -.975, 1.175), .07, M['black'], ['Head', 'Ear' + side], (1.1, .42, .5))              # flat ears held out
    # udder + teats, the tail with its tuft
    b.blob((0, .46, .55), .105, M['pink'], ['Hips'], (1, 1.15, .7))
    for dx in (-.04, .04):
        for dy in (.41, .51):
            b.cone((dx, dy, .51), (0, 0, -1), .014, .05, 5, M['pink'], 'Hips')
    tp = [Vector(t) for t in Q['tail']]
    b.loft(path_rings(tp, [(.03, .03), (.024, .024), (.02, .02), (.018, .018), (.016, .016)], 6), M['white'], ['Hips', 'Tail1', 'Tail2', 'Tail3', 'Tail4'], cap0=False)
    b.blob((0, .92, .38), .048, M['black'], 'Tail4', (1, 1, 1.7))
    # legs: a heavy shoulder / thigh, a knobbly knee, a sturdy cannon, a dark cloven hoof
    for side, s in (('L', 1), ('R', -1)):
        fl = [Vector(mirror(p, s)) for p in Q['front_leg']]; hl = [Vector(mirror(p, s)) for p in Q['hind_leg']]
        b.loft(path_rings([fl[0] + Vector((0, 0, .1)), fl[1], fl[2] + Vector((0, 0, .06))], [(.12, .135), (.085, .085), (.068, .068)], 8), M['white'],
               ['Chest', 'UpperArm' + side, 'ForeArm' + side], cap0=False)
        b.blob(fl[1], .085, M['white'], ['UpperArm' + side, 'ForeArm' + side])
        b.loft([ring(fl[3] + Vector((0, 0, z)), (0, 0, 1), r, r * 1.1, None, 8) for z, r in ((.0, .074), (.075, .074), (.12, .066))], M['hoof'],
               ['ForeArm' + side, 'Paw' + side])
        b.loft(path_rings([fl[2] + Vector((0, 0, .06)), fl[3] + Vector((0, 0, .12))], [(.068, .068), (.066, .066)], 8), M['white'], ['ForeArm' + side, 'Paw' + side],
               cap0=False, cap1=False)
        b.loft(path_rings([hl[0] + Vector((-.06 * s, 0, .08)), hl[0].lerp(hl[1], .5), hl[1], hl[2] + Vector((0, 0, .05))], [(.12, .13), (.11, .11), (.08, .08), (.064, .064)], 8),
               M['white'], ['Hips', 'Thigh' + side, 'Shin' + side], cap0=False)
        b.loft([ring(hl[3] + Vector((0, 0, z)), (0, 0, 1), r, r * 1.1, None, 8) for z, r in ((.0, .074), (.075, .074), (.12, .066))], M['hoof'],
               ['Shin' + side, 'Foot' + side])
        b.loft(path_rings([hl[2] + Vector((0, 0, .05)), hl[3] + Vector((0, 0, .12))], [(.064, .064), (.066, .066)], 8), M['white'], ['Shin' + side, 'Foot' + side],
               cap0=False, cap1=False)
    # black patches on the white hide (our own pattern): big irregular spots made of overlapping balls
    PATCH = [((.26, .40, 1.12), .26), ((.30, .18, .94), .20), ((-.30, .02, 1.06), .28), ((-.22, -.20, .90), .18), ((.26, -.42, .94), .22),
             ((.10, -.52, 1.20), .16), ((-.16, -.78, 1.16), .16), ((0, -.99, 1.24), .15), ((.12, -1.03, 1.10), .09), ((-.12, -1.03, 1.10), .09),
             ((-.22, .74, 1.06), .18), ((.12, .86, 1.12), .10), ((-.24, .55, .64), .16)]
    def patches(m, c):
        if m is not M['white']:
            return None
        return M['black'] if any((c - Vector(p)).length < r for p, r in PATCH) else None
    b.recolor(patches)
    ob = b.build(fid + '_Body')

    # ---- clips (cow) ----
    graze = {'Chest': (6, 0, 0), 'Neck': (48, 0, 0), 'Head': (20, 0, 0), 'UpperArmL': (-4, 0, 0), 'UpperArmR': (-4, 0, 0)}
    chew = lambda k, z: mix(graze, Jaw=(10 * k, 0, 0), Head=(0, 0, z))
    flick = lambda z: {'Tail1': (-6, 0, z), 'Tail2': (0, 0, z * 1.2), 'Tail3': (0, 0, z * 1.1)}
    idle = [(0, {}), (9, mix(graze, Neck=(24, 0, 0))), (15, graze), (21, chew(1, 3)), (27, chew(0, -3)), (33, mix(chew(1, 3), flick(34))),
            (36, mix(chew(0, 0), flick(-30))), (39, mix(chew(1, -3), flick(24))), (45, chew(0, 3)), (51, mix(chew(1, 0), EarL=(0, 30, 0))),
            (54, chew(0, -3)), (60, chew(1, 3)), (66, mix(graze, Neck=(20, 0, 0))), (72, {'Head': (0, 0, 12), 'Neck': (0, 0, 8), 'EarR': (0, -24, 0)}),
            (81, {'Head': (0, 0, 10), 'Neck': (0, 0, 6)}), (90, {})]
    def walk(f):
        ph = f / 24.0; th = lambda o: math.sin((ph + o) * math.tau); lift = lambda o: max(0.0, math.sin((ph + o + .25) * math.tau))
        # lateral-sequence walk: left hind, left fore, right hind, right fore a quarter apart
        return {'ThighL': (-20 * th(0), 0, 0), 'ShinL': (26 * lift(0), 0, 0), 'FootL': (-14 * lift(0), 0, 0),
                'UpperArmL': (-18 * th(.25), 0, 0), 'ForeArmL': (-30 * lift(.25), 0, 0), 'PawL': (24 * lift(.25), 0, 0),
                'ThighR': (-20 * th(.5), 0, 0), 'ShinR': (26 * lift(.5), 0, 0), 'FootR': (-14 * lift(.5), 0, 0),
                'UpperArmR': (-18 * th(.75), 0, 0), 'ForeArmR': (-30 * lift(.75), 0, 0), 'PawR': (24 * lift(.75), 0, 0),
                'Hips': (0, 0, 2 * th(0)), 'Chest': (0, 0, -2 * th(.25)), 'Neck': (6 + 4 * math.sin(2 * ph * math.tau), 0, 0), 'Head': (-4 * math.sin(2 * ph * math.tau), 0, 0),
                'Tail1': (0, 0, 6 * th(.1)), 'Tail2': (0, 0, 8 * th(0)), 'Tail3': (0, 0, 8 * th(-.1)), 'root_loc': (0, 0, .012 * abs(math.sin(2 * ph * math.tau)))}
    lower = {'Chest': (8, 0, 0), 'Neck': (28, 0, 0), 'Head': (30, 0, 0), 'UpperArmL': (-6, 0, 0), 'UpperArmR': (-6, 0, 0), 'ThighL': (8, 0, 0), 'ThighR': (8, 0, 0),
             'EarL': (0, -20, 0), 'EarR': (0, 20, 0), 'root_loc': (0, .08, -.02)}
    butt = {'Chest': (-4, 0, 0), 'Neck': (6, 0, 0), 'Head': (-8, 0, 0), 'UpperArmL': (-16, 0, 0), 'UpperArmR': (-12, 0, 0), 'ThighL': (-14, 0, 0), 'ThighR': (-10, 0, 0),
            'root_loc': (0, -.22, .02)}
    attack = [(0, {}), (6, lower), (9, butt), (12, mix(butt, Head=(4, 0, 0), root_loc=(0, -.18, 0))), (18, {})]
    flinch = {'Chest': (-6, 0, 8), 'Neck': (-12, 0, 10), 'Head': (-12, 0, 14), 'Jaw': (14, 0, 0), 'Tail1': (-20, 0, 18), 'EarL': (0, -30, 0), 'EarR': (0, 30, 0),
              'root_loc': (0, .10, 0)}
    hit = [(0, {}), (3, flinch), (7, mix(flinch, root_loc=(0, .06, 0))), (12, {})]
    brace = {'Neck': (8, 0, -22), 'Head': (6, 0, -26), 'Chest': (0, 0, -6), 'UpperArmL': (8, 0, 0), 'UpperArmR': (8, 0, 0), 'ThighL': (-8, 0, 0), 'ThighR': (-8, 0, 0),
             'EarL': (0, -24, 0), 'EarR': (0, 24, 0), 'root_loc': (0, .05, -.02)}
    block = [(0, {}), (3, brace), (8, mix(brace, Head=(0, 0, -6))), (12, {})]
    kneel = {'UpperArmL': (-14, 0, 0), 'UpperArmR': (-10, 0, 0), 'ForeArmL': (96, 0, 0), 'ForeArmR': (90, 0, 0), 'PawL': (-30, 0, 0), 'PawR': (-30, 0, 0),
             'Chest': (14, 0, 0), 'Neck': (10, 0, 0), 'Head': (10, 0, 0), 'root_loc': (0, 0, -.12)}
    slump = mix(kneel, {'ThighL': (22, 0, 0), 'ThighR': (22, 0, 0), 'ShinL': (-70, 0, 0), 'ShinR': (-70, 0, 0), 'FootL': (40, 0, 0), 'FootR': (40, 0, 0),
                        'Hips': (-4, 0, 0)}, root_loc=(0, 0, -.40))
    down = {'root_rot': (0, 86, 0), 'Neck': (12, 0, -14), 'Head': (18, 0, -10), 'Jaw': (16, 0, 0), 'UpperArmL': (-24, 0, 0), 'UpperArmR': (14, 0, 0),
            'ForeArmL': (20, 0, 0), 'ThighL': (-20, 0, 0), 'ThighR': (18, 0, 0), 'ShinR': (-14, 0, 0), 'Tail1': (0, 0, -20), 'EarL': (0, -20, 0)}
    death = [(0, {}), (4, flinch), (11, kneel), (19, slump), (27, mix(down, root_rot=(0, 92, 0))), (31, down), (36, down)]
    clips = {'idle': (90, idle, True), 'walk': (24, sampled(24, walk), True), 'attack': (18, attack, False),
             'hit': (12, hit, False), 'block': (12, block, False), 'death': (36, death, False)}
    return rig, [ob], clips

# ---------------------------------------------------------------------------------------------------------------
# build, export, validate
# ---------------------------------------------------------------------------------------------------------------
CREATURES = [('holm_large_rat_v1', lambda: rat('holm_large_rat_v1', RATS['holm_large_rat_v1']), 'the large rat (replaces the grubkin)'),
             ('holm_rat_v1', lambda: rat('holm_rat_v1', RATS['holm_rat_v1']), 'the rat (burrowrat)'),
             ('holm_goblin_v1', lambda: goblin('holm_goblin_v1'), 'the goblin (gnarlgob)'),
             ('holm_chicken_v1', lambda: chicken('holm_chicken_v1'), 'the chicken (pasturehen)'),
             ('holm_cow_v1', lambda: cow('holm_cow_v1'), 'the cow (moorcalf)')]
if ONLY:
    CREATURES = [c for c in CREATURES if c[0] in ONLY]

def glb_json(p):
    b = Path(p).read_bytes(); assert b[:4] == b'glTF'
    ln = struct.unpack('<I', b[12:16])[0]; return json.loads(b[20:20 + ln])

BUILT = {}
report = {'schema': 'crafted-realm-holm-creatures-v1', 'builder': 'tools/blender/build_holm_creatures_v1.py', 'blender': bpy.app.version_string,
          'step': {'hold_frames': STEP, 'interpolation': 'CONSTANT'}, 'sharp_deg': SHARP_DEG, 'creatures': {}}
for fid, fn, label in CREATURES:
    rig, meshes, clips = fn()
    frames_, keys_, loop_ = clips['death']
    clips['death'] = (frames_, settle(rig, meshes, keys_), loop_)
    grids = {}
    for name in CLIP_NAMES:
        frames, keys, loop = clips[name]
        _, grids[name] = make_clip(rig, name, frames, keys)
    rig.arm.animation_data.action = None
    for pb in rig.arm.pose.bones:
        pb.rotation_euler = (0, 0, 0); pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0)
    out = CAND / (fid + '.glb')
    export(rig, meshes, out)
    J = glb_json(out)
    durs = {}
    for a in J.get('animations', []):
        ts = [J['accessors'][s['input']] for s in a['samplers']]
        durs[a['name']] = round(max(t['max'][0] for t in ts) - min(t['min'][0] for t in ts), 4)
    tris = sum(J['accessors'][pr['indices']]['count'] // 3 for mm in J['meshes'] for pr in mm['primitives'])
    nb = sum(len(s['joints']) for s in J.get('skins', []))
    ws = [o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
    bounds = {'height': round(max(p.z for p in ws) - min(p.z for p in ws), 3), 'length': round(max(p.y for p in ws) - min(p.y for p in ws), 3),
              'width': round(max(p.x for p in ws) - min(p.x for p in ws), 3), 'min_z': round(min(p.z for p in ws), 3),
              'centre': [round((max(p.x for p in ws) + min(p.x for p in ws)) / 2, 3), round((max(p.y for p in ws) + min(p.y for p in ws)) / 2, 3)]}
    checks = {'skinned': bool(J.get('skins')), 'clips_complete': sorted(durs) == sorted(CLIP_NAMES),
              'durations_match': all(abs(durs.get(n, 0) - clips[n][0] / FPS) < 1e-3 for n in CLIP_NAMES),
              'tris_within_budget': tris <= BUDGET['tris'], 'bones_within_budget': nb <= BUDGET['bones'],
              'materials_within_budget': len(J.get('materials', [])) <= BUDGET['materials'], 'no_textures': not J.get('images'),
              'feet_on_ground': abs(bounds['min_z']) < .02, 'impact_at_half': clips['attack'][0] == 18}
    report['creatures'][fid] = {'label': label, 'glb': str(out.relative_to(ROOT)).replace('\\', '/'), 'runtime': 'assets/models/%s.glb' % fid,
                                'sha256': hashlib.sha256(out.read_bytes()).hexdigest(), 'bytes': out.stat().st_size, 'triangles': tris, 'bones': nb,
                                'bone_names': rig.order, 'materials': {m.name: m['srgb'] for m in bpy.data.materials if m.name.startswith(fid + ' ')},
                                'bounds_m': bounds,
                                'clips': {n: {'frames': clips[n][0], 'fps': FPS, 'seconds': durs.get(n), 'loop': clips[n][2], 'stepped_keys': len(grids[n]),
                                              **({'impact': 9} if n == 'attack' else {})} for n in CLIP_NAMES},
                                'checks': checks}
    BUILT[fid] = (rig, meshes, clips)
    print('[CREATURES]', fid, tris, 'tris', nb, 'bones', bounds, 'clips', durs, 'checks', 'PASS' if all(checks.values()) else checks)
    for o in meshes:
        o.hide_set(True); o.hide_render = True
    rig.arm.hide_set(True)

# ---------------------------------------------------------------------------------------------------------------
# proof renders: turntables (the idle's first frame) and a frame strip of every clip, per creature and one contact sheet
# ---------------------------------------------------------------------------------------------------------------
RENDERS = {}
if DO_RENDER and BUILT:
    import numpy as np
    scene = bpy.context.scene
    try:
        scene.render.engine = 'BLENDER_WORKBENCH'
    except TypeError:
        pass
    scene.view_settings.view_transform = 'Standard'
    sh = scene.display.shading; sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'
    sh.show_object_outline = True; sh.object_outline_color = (.08, .06, .05); sh.show_cavity = False
    world = bpy.data.worlds.new('bg'); scene.world = world; world.color = (s2l(.70), s2l(.72), s2l(.68))
    TILE = 256
    scene.render.resolution_x = scene.render.resolution_y = TILE; scene.render.film_transparent = False
    bpy.ops.mesh.primitive_circle_add(vertices=48, radius=9.0, fill_type='NGON', location=(0, 0, 0))
    ground = bpy.context.object; gmat = bpy.data.materials.new('proof ground'); gmat.diffuse_color = (s2l(.50), s2l(.56), s2l(.38), 1)
    ground.data.materials.append(gmat)
    cam_data = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cam_data)
    scene.collection.objects.link(cam); scene.camera = cam
    cam_data.type = 'ORTHO'

    def show(rig, meshes, clip, frame):
        ad = rig.arm.animation_data
        for tr in ad.nla_tracks:
            tr.mute = True
        act = bpy.data.actions[rig.name + '__' + clip]
        ad.action = act
        try:
            if ad.action_slot is None and len(act.slots):
                ad.action_slot = act.slots[0]
        except AttributeError:
            pass
        scene.frame_set(frame); bpy.context.view_layer.update()

    def shoot(path, centre, size, yaw_deg, elev_deg=26):
        a, e = math.radians(yaw_deg), math.radians(elev_deg)
        d = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
        cam.location = Vector(centre) + d * 8
        cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
        cam_data.ortho_scale = size
        scene.render.filepath = str(path); bpy.ops.render.render(write_still=True)
        return path

    def load_px(p):
        im = bpy.data.images.load(str(p)); w, h = im.size
        a = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4); bpy.data.images.remove(im); return a

    def sheet(tiles, cols, out):
        """tiles: list of image paths or None (blank), row-major from the top-left"""
        rows = (len(tiles) + cols - 1) // cols
        S = np.ones((rows * TILE, cols * TILE, 4), dtype=np.float32) * np.array([.16, .15, .14, 1], dtype=np.float32)
        for i, p in enumerate(tiles):
            if p is None:
                continue
            a = load_px(p); r, c = divmod(i, cols)
            S[(rows - 1 - r) * TILE:(rows - r) * TILE, c * TILE:(c + 1) * TILE] = a
        img = bpy.data.images.new('sheet', cols * TILE, rows * TILE, alpha=True)
        img.pixels = S.ravel().tolist(); img.filepath_raw = str(out); img.file_format = 'PNG'; img.save(); bpy.data.images.remove(img)
        return out

    contact = []
    for fid, (rig, meshes, clips) in BUILT.items():
        for o in meshes:
            o.hide_set(False); o.hide_render = False
        rig.arm.hide_set(False)
        bd = report['creatures'][fid]['bounds_m']
        size = max(bd['length'] * .95, bd['height'] * 1.25, bd['width'] * 1.3)
        centre = tuple(bd['centre'][:2]) + (bd['height'] * .45,)
        R = []
        tt = []
        for yaw in (40, 90, 150, 0, 220, 270):
            show(rig, meshes, 'idle', 0)
            tt.append(shoot(REN / ('%s_turn_%03d.png' % (fid, yaw)), centre, size, yaw))
        R.append(sheet(tt, 6, REN / ('%s_turntable.png' % fid)))
        # a large three-quarter view for the review (the same framing, 3x the pixels)
        scene.render.resolution_x = scene.render.resolution_y = TILE * 3
        show(rig, meshes, 'idle', 0)
        R.append(shoot(REN / ('%s_hero.png' % fid), centre, size * .9, 35, 16))
        scene.render.resolution_x = scene.render.resolution_y = TILE
        contact += tt
        strips = {}
        for name in CLIP_NAMES:
            frames = clips[name][0]
            fr = [round(frames * i / 6) for i in range(6)] if clips[name][2] else [0, 4, 7, 9, 13, frames] if name == 'attack' else \
                [round(frames * i / 5) for i in range(6)]
            ps = []
            for f in fr:
                show(rig, meshes, name, f)
                ps.append(shoot(REN / ('%s_%s_%02d.png' % (fid, name, f)), centre, size * (1.25 if name == 'death' else 1.0), 35))
            strips[name] = ps   # the frames go into the creature's sheet (one row per clip)
        sheet(tt + [REN / ('%s_%s_%02d.png' % (fid, n, f)) for n in CLIP_NAMES for f in
                    ([round(clips[n][0] * i / 6) for i in range(6)] if clips[n][2] else [0, 4, 7, 9, 13, clips[n][0]] if n == 'attack' else
                     [round(clips[n][0] * i / 5) for i in range(6)])], 6, REN / ('%s_sheet.png' % fid))
        RENDERS[fid] = [str(p.relative_to(ROOT)).replace('\\', '/') for p in R]
        report['creatures'][fid]['proof'] = RENDERS[fid] + [str((REN / ('%s_sheet.png' % fid)).relative_to(ROOT)).replace('\\', '/')]
        for o in meshes:
            o.hide_set(True); o.hide_render = True
        rig.arm.hide_set(True)
    sheet(contact, 6, REN / 'contact_sheet.png')
    report['contact_sheet'] = str((REN / 'contact_sheet.png').relative_to(ROOT)).replace('\\', '/')
    # keep the composed evidence (sheets, strips, turntables, hero stills); the single frames were only their tiles
    import re
    for p in REN.glob('*.png'):
        if re.search(r'_(turn_\d{3}|(%s)_\d{2})\.png$' % '|'.join(CLIP_NAMES), p.name):
            p.unlink()

# ---------------------------------------------------------------------------------------------------------------
man_path = CAND / 'manifest.json'
if ONLY and man_path.exists():   # a partial rebuild keeps the other creatures' rows
    old = json.loads(man_path.read_text())
    for k, v in old.get('creatures', {}).items():
        report['creatures'].setdefault(k, v)
man_path.write_text(json.dumps(report, indent=1) + '\n')
L = ['# Holm creatures v1', '', 'Built by `tools/blender/build_holm_creatures_v1.py` (Blender %s, headless, deterministic). Published to the runtime by '
     '`node tools/publish_holm_creatures.js apply` (`assets/models/<id>.glb`, loaded by `charNpcModel` through `glbChar`).' % bpy.app.version_string, '',
     'Clips (30 fps, stepped: a pose every %d frames, held): idle and walk loop; attack (impact at frame 9 of 18), hit, block and death play once '
     '(death holds its last frame, the body on the ground, centred on its tile).' % STEP, '']
for fid, r in report['creatures'].items():
    L += ['## %s — %s' % (fid, r['label']), '', '- %d triangles, %d bones, %d materials; %s' % (r['triangles'], r['bones'], len(r['materials']), r['bounds_m']),
          '- clips: ' + ', '.join('%s %d f' % (n, c['frames']) for n, c in r['clips'].items()),
          '- checks: ' + ', '.join('%s %s' % (k, 'PASS' if v else 'FAIL') for k, v in r['checks'].items()), '']
(CAND / 'REPORT.md').write_text('\n'.join(L) + '\n')
bpy.ops.wm.save_as_mainfile(filepath=str(CAND / 'creatures.blend'), compress=True)
(CAND / 'creatures.blend1').unlink(missing_ok=True)
bad = {k: v['checks'] for k, v in report['creatures'].items() if not all(v['checks'].values())}
print('[CREATURES] DONE', 'PASS' if not bad else ('FAIL ' + json.dumps(bad)))
assert not bad, bad
