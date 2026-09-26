"""The Scarlands bestiary v1, beasts (W2/W3, 2026-09-26): our own low-poly designs on their own rigs.

  ash_stalker      the Scarlands hound (STORY_BIBLE: "ash stalkers"): lean, deep-chested, long-legged, a slag-plated
                   hide with ember seams, a ridge of plates down the spine, swept-back ears, glowing ember eyes
  cinder_rat       a pack scavenger the size of a small dog: hunched, round-backed, big incisors, a long bare tail,
                   singed ashen fur
  cinder_wyrmling  the deep-end brute: a young fire drake on four legs with folded bat wings, horns and a spine crest,
                   ember scales and a glowing throat; bites up close, breathes fire from range

Built procedurally in Blender (headless): each creature has an armature (Root at the ground for whole-body motion,
Hips / Spine / Chest / Neck / Head / Jaw, a Tail chain, three bones per leg, two per wing), a body of lofted low-poly
rings (8-10 sided, flat-ish panels), weights blended by distance to the allowed bones of each part, box-projected UVs
in metres with the old-school kit textures (tint = authored colour / texture mean), emissive eyes and embers.
Clips are keyframed poses at 30 fps (idle, walk, attack, hit, death; the wyrmling adds breath), exported as one glTF
animation per NLA track. Event frames (bite impact, breath release) and anchors go to working/beasts.json.
Axes: Blender -Y forward (= glTF +Z, like the character kit), Z up, feet on 0, 1 unit = 1 m = 1 tile.
Run: blender -b --python tools/blender/build_scarlands_bestiary_beasts_v1.py
"""
import bpy, bmesh, json, math, hashlib, random
from pathlib import Path
from mathutils import Vector, Matrix, Euler, Quaternion

ROOT = Path(__file__).resolve().parents[2]
WS = ROOT / '.studio-workspaces/scarlands-bestiary-v1'
(WS / 'working').mkdir(parents=True, exist_ok=True); (WS / 'candidates').mkdir(parents=True, exist_ok=True)
KIT = json.loads((ROOT / 'assets/textures/oldschool/kit.json').read_text())['textures']
FPS = 30
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps = FPS

# ---------------------------------------------------------------------------------------------------------------
# materials: kit texture x tint (display values, like every colour in the game), flat colours, emissive glows
# ---------------------------------------------------------------------------------------------------------------
_img = {}
def image(name):
    if name not in _img:
        im = bpy.data.images.load(str(ROOT / KIT[name]['file']), check_existing=True); im.name = 'oldschool_' + name; im.pack(); _img[name] = im
    return _img[name]

def mat(name, hexcol, tex=None, metres=0.5, emit=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Roughness'].default_value = 1.0; b.inputs['Metallic'].default_value = 0.0
    if 'Specular IOR Level' in b.inputs:
        b.inputs['Specular IOR Level'].default_value = 0.0
    c = tuple(int(hexcol.lstrip('#')[i:i + 2], 16) / 255 for i in (0, 2, 4))
    if tex:
        mu = KIT[tex]['mean']; tint = tuple(min(1.0, c[i] / mu[i]) for i in range(3)) + (1.0,)
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = image(tex); t.interpolation = 'Closest'
        mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 1.0
        a_in, b_in = [s for s in mx.inputs if s.type == 'RGBA'][:2]
        nt.links.new(t.outputs['Color'], a_in); b_in.default_value = tint
        nt.links.new([s for s in mx.outputs if s.type == 'RGBA'][0], b.inputs['Base Color'])
    else:
        b.inputs['Base Color'].default_value = c + (1.0,)
    if emit:
        e = tuple(int(emit.lstrip('#')[i:i + 2], 16) / 255 for i in (0, 2, 4))
        b.inputs['Emission Color'].default_value = e + (1.0,); b.inputs['Emission Strength'].default_value = 1.0
    m['uv_metres'] = metres
    return m

# ---------------------------------------------------------------------------------------------------------------
# rig
# ---------------------------------------------------------------------------------------------------------------
class Rig:
    def __init__(self, name, bones):
        """bones: [(name, parent, head, tail, kind)]; kind 'mid' (sagittal: local X = world X, so X-rotation pitches),
        'wing' (lateral: local X = forward axis, so X-rotation flaps), 'root'"""
        self.bones = {b[0]: b for b in bones}
        ad = bpy.data.armatures.new(name); self.arm = bpy.data.objects.new(name, ad)
        bpy.context.scene.collection.objects.link(self.arm)
        bpy.context.view_layer.objects.active = self.arm
        bpy.ops.object.mode_set(mode='EDIT')
        for n, parent, h, t, kind in bones:
            eb = ad.edit_bones.new(n); eb.head, eb.tail = Vector(h), Vector(t)
            y = (eb.tail - eb.head).normalized()
            if kind == 'wing':
                eb.align_roll(Vector((0, 0, 1)))
            else:
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
# mesh builder
# ---------------------------------------------------------------------------------------------------------------
class Body:
    def __init__(self, rig):
        self.rig = rig; self.v = []; self.w = []; self.f = []; self.fm = []; self.mats = []
    def _mi(self, m):
        if m not in self.mats:
            self.mats.append(m)
        return self.mats.index(m)
    def vert(self, p, allowed, sharp=6.0):
        p = Vector(p); self.v.append(p); self.w.append(self.rig.weights(p, allowed, sharp) if isinstance(allowed, (list, tuple)) else [(allowed, 1.0)])
        return len(self.v) - 1
    def face(self, idx, m):
        self.f.append(tuple(idx)); self.fm.append(self._mi(m))
    def loft(self, rings, m, allowed, cap0=True, cap1=True, sharp=6.0, mats=None):
        ids = [[self.vert(p, allowed, sharp) for p in r] for r in rings]
        n = len(ids[0])
        for i in range(len(ids) - 1):
            for k in range(n):
                self.face((ids[i][k], ids[i][(k + 1) % n], ids[i + 1][(k + 1) % n], ids[i + 1][k]), mats(i, k) if mats else m)
        if cap0:
            self.face(list(reversed(ids[0])), m)
        if cap1:
            self.face(ids[-1], m)
        return ids
    def cone(self, base_c, axis, r, h, n, m, allowed, flat=1.0, up=None):
        ring = ring_pts(base_c, axis, r, r * flat, n, up)
        ids = [self.vert(p, allowed) for p in ring]
        apex = self.vert(Vector(base_c) + Vector(axis).normalized() * h, allowed)
        for k in range(n):
            self.face((ids[k], ids[(k + 1) % n], apex), m)
        self.face(list(reversed(ids)), m)
    def blob(self, c, r, m, allowed, scale=(1, 1, 1), seg=6):
        """a low-poly lumpy ball (eyes, knuckles, nubs)"""
        rings = []
        for i in range(1, seg):
            t = math.pi * i / seg; z = math.cos(t); rr = math.sin(t)
            rings.append([Vector(c) + Vector((math.cos(a) * rr * r * scale[0], math.sin(a) * rr * r * scale[1], z * r * scale[2])) for a in [j * math.tau / seg for j in range(seg)]])
        ids = [[self.vert(p, allowed) for p in rr_] for rr_ in rings]
        top = self.vert(Vector(c) + Vector((0, 0, r * scale[2])), allowed); bot = self.vert(Vector(c) - Vector((0, 0, r * scale[2])), allowed)
        n = seg
        for k in range(n):
            self.face((ids[0][k], ids[0][(k + 1) % n], top), m)
            self.face((ids[-1][(k + 1) % n], ids[-1][k], bot), m)
        for i in range(len(ids) - 1):
            for k in range(n):
                self.face((ids[i][(k + 1) % n], ids[i][k], ids[i + 1][k], ids[i + 1][(k + 1) % n]), m)
    def plate(self, pts, m, allowed, both=True):
        ids = [self.vert(p, allowed) for p in pts]
        self.face(ids, m)
        if both:
            ids2 = [self.vert(p, allowed) for p in reversed(pts)]
            self.face(ids2, m)
    def build(self, name):
        me = bpy.data.meshes.new(name)
        me.from_pydata([tuple(p) for p in self.v], [], self.f)
        for i, p in enumerate(me.polygons):
            p.material_index = self.fm[i]
        bm = bmesh.new(); bm.from_mesh(me)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        bmesh.ops.triangulate(bm, faces=bm.faces[:], quad_method='BEAUTY', ngon_method='BEAUTY')
        bm.to_mesh(me); bm.free()
        for m in self.mats:
            me.materials.append(m)
        # old-school panel shading: flat faces, smooth only where panels are gentle
        for p in me.polygons:
            p.use_smooth = False
        # box-projected UVs in metres (rest pose), repeat size per material
        uv = me.uv_layers.new(name='UVMap')
        for p in me.polygons:
            n = p.normal; ax = max(range(3), key=lambda i: abs(n[i]))
            k = 1.0 / max(0.05, float(me.materials[p.material_index].get('uv_metres', 0.5)))
            for li in p.loop_indices:
                co = me.vertices[me.loops[li].vertex_index].co
                a, b = [(co.y, co.z), (co.x, co.z), (co.x, co.y)][ax]
                uv.data[li].uv = (a * k, b * k)
        ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
        for n in self.rig.seg:
            ob.vertex_groups.new(name=n)
        for i, ws in enumerate(self.w):
            for n, w in ws:
                ob.vertex_groups[n].add([i], w, 'REPLACE')
        ob.parent = self.rig.arm
        mod = ob.modifiers.new('Armature', 'ARMATURE'); mod.object = self.rig.arm
        return ob

def ring_pts(c, axis, rx, rz, n, up=None, phase=0.0):
    """a ring around axis through c: rx across (lateral), rz along `up` projected (default world up)"""
    c = Vector(c); a = Vector(axis).normalized(); u = Vector(up or (0, 0, 1))
    u = (u - a * u.dot(a))
    if u.length < 1e-6:
        u = Vector((0, -1, 0)) - a * Vector((0, -1, 0)).dot(a)
    u.normalize(); s = a.cross(u).normalized()
    return [c + s * (math.cos(t) * rx) + u * (math.sin(t) * rz) for t in [phase + j * math.tau / n for j in range(n)]]

def path_rings(pts, radii, n, up=None):
    """rings along a polyline: pts [Vector], radii [(rx, rz)]"""
    out = []
    for i, p in enumerate(pts):
        a = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)])
        out.append(ring_pts(p, a, radii[i][0], radii[i][1], n, up))
    return out

# ---------------------------------------------------------------------------------------------------------------
# clips
# ---------------------------------------------------------------------------------------------------------------
def to_local_quat(rig, bone, world_euler_deg):
    M = rig.arm.data.bones[bone].matrix_local.to_3x3()
    q = Euler([math.radians(a) for a in world_euler_deg], 'XYZ').to_quaternion()
    return (M.inverted() @ q.to_matrix() @ M).to_quaternion()

def make_clip(rig, name, frames, keys):
    """keys: [(frame, {bone: (rx, ry, rz) local degrees, 'root_loc': world (x, y, z), 'root_rot': world degrees})]"""
    arm = rig.arm
    act = bpy.data.actions.new(name); act.use_fake_user = True
    arm.animation_data_create(); arm.animation_data.action = act
    bones = [n for n in rig.bones if rig.bones[n][4] != 'root']
    root = next(n for n in rig.bones if rig.bones[n][4] == 'root')
    rpb = arm.pose.bones[root]; rpb.rotation_mode = 'QUATERNION'
    Mr = arm.data.bones[root].matrix_local.to_3x3()
    for f, pose in keys:
        for n in bones:
            pb = arm.pose.bones[n]
            r = pose.get(n, (0, 0, 0))
            pb.rotation_euler = Euler([math.radians(a) for a in r], 'XYZ')
            pb.keyframe_insert('rotation_euler', frame=f)
        rpb.location = Mr.inverted() @ Vector(pose.get('root_loc', (0, 0, 0)))
        rpb.rotation_quaternion = to_local_quat(rig, root, pose.get('root_rot', (0, 0, 0)))
        rpb.keyframe_insert('location', frame=f); rpb.keyframe_insert('rotation_quaternion', frame=f)
    for fc in act.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = 'BEZIER'
    act.use_frame_range = True; act.frame_start, act.frame_end = 0, frames
    arm.animation_data.action = None
    tr = arm.animation_data.nla_tracks.new(); tr.name = name.split('__')[-1]
    st = tr.strips.new(tr.name, 0, act); st.name = tr.name
    return act

def set_pose(rig, pose):
    arm = rig.arm
    root = next(n for n in rig.bones if rig.bones[n][4] == 'root')
    for n in rig.bones:
        if n == root:
            continue
        pb = arm.pose.bones[n]; pb.rotation_mode = 'XYZ'
        pb.rotation_euler = Euler([math.radians(a) for a in pose.get(n, (0, 0, 0))], 'XYZ')
    rpb = arm.pose.bones[root]; rpb.rotation_mode = 'QUATERNION'
    rpb.location = arm.data.bones[root].matrix_local.to_3x3().inverted() @ Vector(pose.get('root_loc', (0, 0, 0)))
    rpb.rotation_quaternion = to_local_quat(rig, root, pose.get('root_rot', (0, 0, 0)))

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

def settle(rig, meshes, keys, step=2):
    """death clips: resample every `step` frames (smoothstep between the authored keys), then lift / drop the whole
    body so its lowest point touches the ground (no sinking while it rolls over about the Root at its feet) and slide
    it sideways, in step with the roll, so the corpse ends centred on its tile"""
    _, cx_end, _ = pose_bounds(rig, meshes, keys[-1][1])
    rot_end = max(abs(a) for a in keys[-1][1].get('root_rot', (0, 0, 0))) or 1.0
    frames = sorted(set(list(range(0, keys[-1][0] + 1, step)) + [f for f, _ in keys]))
    out = []
    for f in frames:
        for (f0, p0), (f1, p1) in zip(keys, keys[1:]):
            if f0 <= f <= f1:
                t = (f - f0) / max(1, f1 - f0); pose = lerp_pose(p0, p1, t * t * (3 - 2 * t)); break
        rot = max(abs(a) for a in pose.get('root_rot', (0, 0, 0)))
        minz, _, _ = pose_bounds(rig, meshes, pose)
        loc = Vector(pose.get('root_loc', (0, 0, 0)))
        loc.z -= minz
        loc.x -= cx_end * min(1.0, rot / rot_end)
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

def export(rig, meshes, path):
    bpy.ops.object.select_all(action='DESELECT')
    rig.arm.select_set(True)
    for m in meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = rig.arm
    kw = dict(filepath=str(path), export_format='GLB', use_selection=True, export_yup=True, export_apply=False, export_animations=True,
              export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_frame_range=False, export_skins=True,
              export_def_bones=True, export_reset_pose_bones=True, export_materials='EXPORT', export_texcoords=True)
    props = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
    bpy.ops.export_scene.gltf(**{k: v for k, v in kw.items() if k in props or k == 'filepath'})

# ---------------------------------------------------------------------------------------------------------------
# a quadruped: rig + body from a small parameter table
# ---------------------------------------------------------------------------------------------------------------
def quadruped_rig(name, Q):
    sx = Q['hip_x']; fx = Q['shoulder_x']
    rump, mid, chest = Vector(Q['rump']), Vector(Q['mid']), Vector(Q['chest'])
    neck, head, snout = Vector(Q['neck']), Vector(Q['head']), Vector(Q['snout'])
    bones = [('Root', None, (0, 0, 0), (0, 0, .25), 'root'),
             ('Hips', 'Root', tuple(rump), tuple(mid), 'mid'),
             ('Spine', 'Hips', tuple(mid), tuple(chest), 'mid'),
             ('Chest', 'Spine', tuple(chest), tuple(neck), 'mid')]
    necks = Q.get('neck_bones', 1)
    prev = 'Chest'; p0 = neck
    for i in range(necks):
        p1 = neck.lerp(head, (i + 1) / necks)
        bones.append(('Neck' if i == 0 else 'Neck%d' % (i + 1), prev, tuple(p0), tuple(p1), 'mid')); prev = bones[-1][0]; p0 = p1
    bones.append(('Head', prev, tuple(head), tuple(snout), 'mid'))
    jaw_h = head + Vector((0, -0.02, -Q['jaw_drop']))
    bones.append(('Jaw', 'Head', tuple(jaw_h), tuple(snout + Vector((0, 0.02, -Q['jaw_drop'] * 1.1))), 'mid'))
    tail = [Vector(t) for t in Q['tail']]
    for i in range(len(tail) - 1):
        bones.append(('Tail%d' % (i + 1), 'Hips' if i == 0 else 'Tail%d' % i, tuple(tail[i]), tuple(tail[i + 1]), 'mid'))
    for side, s in (('L', 1), ('R', -1)):
        fl = [Vector((p[0] * s, p[1], p[2])) for p in Q['front_leg']]
        hl = [Vector((p[0] * s, p[1], p[2])) for p in Q['hind_leg']]
        bones += [('UpperArm' + side, 'Chest', tuple(fl[0]), tuple(fl[1]), 'mid'), ('ForeArm' + side, 'UpperArm' + side, tuple(fl[1]), tuple(fl[2]), 'mid'),
                  ('Paw' + side, 'ForeArm' + side, tuple(fl[2]), tuple(fl[3]), 'mid'),
                  ('Thigh' + side, 'Hips', tuple(hl[0]), tuple(hl[1]), 'mid'), ('Shin' + side, 'Thigh' + side, tuple(hl[1]), tuple(hl[2]), 'mid'),
                  ('Foot' + side, 'Shin' + side, tuple(hl[2]), tuple(hl[3]), 'mid')]
        if 'wing' in Q:
            w = [Vector((p[0] * s, p[1], p[2])) for p in Q['wing']]
            bones += [('WingArm' + side, 'Chest', tuple(w[0]), tuple(w[1]), 'wing'), ('WingHand' + side, 'WingArm' + side, tuple(w[1]), tuple(w[2]), 'wing')]
    return Rig(name, bones), bones

def leg(body, pts, radii, m, allowed, n=6, paw=None, claw_m=None):
    rings = path_rings(pts, radii, n)
    body.loft(rings, m, allowed, cap0=False)
    if paw:
        # a flat paw pad at the ground with toes
        c = pts[-1]; ph = min(1.4, paw[1] / .065)
        body.loft([ring_pts(c + Vector((0, 0, h * ph)), (0, 0, 1), paw[0] * k, paw[1] * k, 6) for h, k in ((.0, .9), (.04, 1.0), (.08, .7))], m, allowed)
        if claw_m:
            for dx in (-paw[0] * .55, 0, paw[0] * .55):
                body.cone(c + Vector((dx, -paw[1] * .8, .02)), (0, -1, -.3), .018, .07, 4, claw_m, allowed)

# ---------------------------------------------------------------------------------------------------------------
# 1. ASH STALKER
# ---------------------------------------------------------------------------------------------------------------
def ash_stalker():
    Q = dict(hip_x=.13, shoulder_x=.14, rump=(0, .50, .86), mid=(0, .05, .84), chest=(0, -.36, .90), neck=(0, -.52, 1.02), head=(0, -.74, 1.14), snout=(0, -1.12, 1.02),
             jaw_drop=.07, tail=[(0, .56, .88), (0, .82, .80), (0, 1.06, .66), (0, 1.26, .50)],
             front_leg=[(.14, -.40, .82), (.15, -.36, .46), (.15, -.40, .12), (.15, -.50, .02)],
             hind_leg=[(.13, .44, .80), (.14, .30, .48), (.14, .52, .20), (.14, .40, .02)])
    rig, bones = quadruped_rig('Rig_AshStalker', Q)
    M = dict(hide=mat('Stalker slag hide', '#4a4648', 'hide_ash', .45), belly=mat('Stalker soot belly', '#2e2a2a', 'hide_ash', .35),
             plate=mat('Stalker spine plate', '#3a3434', 'dark_rock', .4), claw=mat('Stalker claw', '#d8cbb0'),
             eye=mat('Stalker ember eye (glow)', '#ffb04a', emit='#ff9a2a'), mouth=mat('Stalker maw', '#5a1a14', emit='#3a0c08'),
             ear=mat('Stalker ear', '#2e2a2a', 'hide_ash', .3))
    b = Body(rig)
    torso = ['Hips', 'Spine', 'Chest']
    # torso: rump -> waist -> deep chest, rings (lateral, vertical), rump slightly lower
    pts = [Vector(p) for p in ((0, .62, .84), (0, .46, .86), (0, .24, .84), (0, .02, .84), (0, -.18, .87), (0, -.36, .88), (0, -.48, .94))]
    rad = [(.07, .06), (.15, .16), (.13, .13), (.11, .12), (.15, .20), (.17, .24), (.13, .16)]
    rings = []
    for p, (rx, rz) in zip(pts, rad):
        r = ring_pts(p, (0, -1, 0), rx, rz, 10)
        rings.append([q + Vector((0, 0, -rz * .25)) if q.z < p.z else q for q in r])   # deep keel under the chest
    b.loft(rings, M['hide'], torso, sharp=4.0, mats=lambda i, k: M['belly'] if k in (6, 7, 8) else M['hide'])
    # neck + head + snout
    npts = [Vector(p) for p in ((0, -.46, .98), (0, -.56, 1.05), (0, -.66, 1.11))]
    b.loft(path_rings(npts, [(.13, .16), (.11, .13), (.10, .12)], 8), M['hide'], ['Chest', 'Neck', 'Head'], cap0=False, cap1=False)
    hpts = [Vector(p) for p in ((0, -.66, 1.13), (0, -.76, 1.16), (0, -.88, 1.12), (0, -1.02, 1.06), (0, -1.13, 1.03))]
    b.loft(path_rings(hpts, [(.10, .12), (.115, .12), (.09, .085), (.065, .06), (.045, .042)], 8), M['hide'], 'Head', cap0=False)
    # lower jaw
    jpts = [Vector(p) for p in ((0, -.72, 1.06), (0, -.88, 1.02), (0, -1.08, .99))]
    b.loft(path_rings(jpts, [(.085, .04), (.065, .035), (.04, .025)], 6), M['mouth'], 'Jaw')
    for s in (1, -1):
        b.blob((.078 * s, -.84, 1.165), .024, M['eye'], 'Head', (1, 1.3, .8))                          # ember eyes
        b.cone(Vector((.065 * s, -.72, 1.22)), (s * .3, .8, .5), .055, .19, 4, M['ear'], 'Head', flat=.4)  # swept ears
        for k in range(3):                                                                              # fangs
            b.cone(Vector((.02 * s * (1 + k * .5), -1.05 + k * .06, 1.0)), (0, 0, -1), .008, .04, 3, M['claw'], 'Head')
    for i, (y, z, h, lean) in enumerate(((-.70, 1.24, .13, .9), (-.62, 1.22, .15, 1.0), (-.54, 1.17, .13, 1.1))):   # skull crest
        b.cone(Vector((0, y, z)), (0, lean, .8), .04, h, 4, M['plate'], 'Head' if y < -.6 else 'Neck', flat=.35)
    # spine ridge of slag plates (shoulders to rump)
    for i, (y, z, h) in enumerate(((-.40, 1.14, .09), (-.26, 1.10, .11), (-.12, 1.04, .10), (.02, 1.0, .09), (.16, 1.0, .08), (.30, 1.01, .08), (.44, 1.02, .07))):
        bone = 'Chest' if y < -.2 else ('Spine' if y < .2 else 'Hips')
        b.cone(Vector((0, y, z - .02)), (0, .45, 1), .05, h, 4, M['plate'], bone, flat=.35)
    # legs
    for side, s in (('L', 1), ('R', -1)):
        fl = [Vector((p[0] * s, p[1], p[2])) for p in Q['front_leg']]
        hl = [Vector((p[0] * s, p[1], p[2])) for p in Q['hind_leg']]
        leg(b, [fl[0] + Vector((0, 0, .06)), fl[1], fl[2], fl[3] + Vector((0, 0, .03))], [(.10, .12), (.065, .065), (.05, .05), (.042, .042)], M['hide'],
            ['Chest', 'UpperArm' + side, 'ForeArm' + side, 'Paw' + side], paw=(.062, .075), claw_m=M['claw'])
        leg(b, [hl[0] + Vector((0, 0, .06)), hl[1], hl[2], hl[3] + Vector((0, 0, .03))], [(.13, .16), (.085, .085), (.05, .05), (.042, .042)], M['hide'],
            ['Hips', 'Thigh' + side, 'Shin' + side, 'Foot' + side], paw=(.062, .08), claw_m=M['claw'])
    # tail: thin, ending in a plated tip
    tpts = [Vector(p) for p in Q['tail']]
    b.loft(path_rings(tpts, [(.05, .05), (.04, .04), (.03, .03), (.015, .015)], 6), M['hide'], ['Hips', 'Tail1', 'Tail2', 'Tail3'], cap0=False)
    b.cone(tpts[-1], (0, .6, -.8), .03, .12, 4, M['plate'], 'Tail3', flat=.5)
    ob = b.build('AshStalker_Body')
    # clips (local Euler degrees; X pitches every sagittal bone: + tips the bone's tip up for bones pointing back,
    # down for bones pointing forward, so signs are chosen per bone and checked on the sheets)
    rest = {}
    breathe = lambda k: {'Chest': (1.5 * k, 0, 0), 'Neck': (-2 * k, 0, 0), 'Head': (2 * k, 0, 3 * k), 'Tail1': (-4 * k, 0, 6 * k), 'Tail2': (-4 * k, 0, 8 * k), 'Tail3': (0, 0, 10 * k), 'Jaw': (3 * abs(k), 0, 0)}
    idle = [(f, breathe(math.sin(f / 60 * math.tau))) for f in (0, 15, 30, 45, 60)]
    def trot(ph):
        """a trot: diagonal pairs (front L + hind R) swing together; ph in [0, 1)"""
        sw = lambda o: math.sin((ph + o) * math.tau)
        lift = lambda o: max(0.0, math.sin((ph + o) * math.tau))
        a, c = sw(0.0), sw(0.5)
        return {'UpperArmL': (32 * a, 0, 0), 'ForeArmL': (-40 * lift(0.25), 0, 0), 'PawL': (25 * lift(0.25), 0, 0),
                'UpperArmR': (32 * c, 0, 0), 'ForeArmR': (-40 * lift(0.75), 0, 0), 'PawR': (25 * lift(0.75), 0, 0),
                'ThighR': (-28 * a, 0, 0), 'ShinR': (35 * lift(0.75), 0, 0), 'FootR': (-20 * lift(0.75), 0, 0),
                'ThighL': (-28 * c, 0, 0), 'ShinL': (35 * lift(0.25), 0, 0), 'FootL': (-20 * lift(0.25), 0, 0),
                'Chest': (0, 0, 3 * a), 'Hips': (0, 0, -3 * a), 'Head': (4 * math.sin(ph * 2 * math.tau), 0, 0),
                'Tail1': (-8, 0, 10 * a), 'Tail2': (-4, 0, 12 * a), 'root_loc': (0, 0, .03 * abs(math.sin(ph * 2 * math.tau)))}
    walk = [(f, trot(f / 18)) for f in range(0, 19, 3)]
    crouch = {'Hips': (-6, 0, 0), 'Chest': (8, 0, 0), 'Neck': (18, 0, 0), 'Head': (-14, 0, 0), 'ThighL': (14, 0, 0), 'ThighR': (14, 0, 0), 'ShinL': (-12, 0, 0), 'ShinR': (-12, 0, 0),
              'UpperArmL': (-12, 0, 0), 'UpperArmR': (-12, 0, 0), 'ForeArmL': (18, 0, 0), 'ForeArmR': (18, 0, 0), 'root_loc': (0, .06, -.06)}
    lunge = {'Hips': (6, 0, 0), 'Chest': (-6, 0, 0), 'Neck': (-18, 0, 0), 'Head': (10, 0, 0), 'Jaw': (28, 0, 0), 'UpperArmL': (40, 0, 0), 'UpperArmR': (34, 0, 0),
             'ForeArmL': (-20, 0, 0), 'ForeArmR': (-10, 0, 0), 'ThighL': (-30, 0, 0), 'ThighR': (-24, 0, 0), 'root_loc': (0, -.32, .10)}
    bite = mix(lunge, Jaw=(4, 0, 0), Head=(22, 0, 0), root_loc=(0, -.36, .04))
    attack = [(0, {}), (5, crouch), (8, bite), (10, lunge), (14, crouch), (18, {})]
    flinch = {'Chest': (-10, 0, 6), 'Neck': (-14, 0, 0), 'Head': (-12, 0, 8), 'Jaw': (14, 0, 0), 'Hips': (4, 0, -4), 'Tail1': (10, 0, -10), 'root_loc': (0, .1, 0)}
    hit = [(0, {}), (3, flinch), (7, mix(flinch, root_loc=(0, .05, 0))), (12, {})]
    slump = {'Chest': (10, 0, 0), 'Neck': (20, 0, 0), 'Head': (-10, 0, 0), 'ThighL': (20, 0, 0), 'ThighR': (20, 0, 0), 'UpperArmL': (-20, 0, 0), 'UpperArmR': (-20, 0, 0),
             'ForeArmL': (30, 0, 0), 'ForeArmR': (30, 0, 0), 'root_loc': (0, 0, -.2)}
    down = {'root_rot': (0, 88, 0), 'Neck': (14, 0, -4), 'Head': (10, 0, -4), 'Jaw': (16, 0, 0),
            'UpperArmL': (18, 0, 10), 'UpperArmR': (-12, 0, -8), 'ThighL': (-14, 0, 0), 'ThighR': (22, 0, 0), 'Tail1': (-12, 0, -6), 'Tail2': (-14, 0, -6)}
    death = [(0, {}), (4, flinch), (12, slump), (22, mix(down, root_rot=(0, 94, 0))), (28, down), (36, down)]
    clips = {'idle': (60, idle, True), 'walk': (18, walk, True), 'attack': (18, attack, False), 'hit': (12, hit, False), 'death': (36, death, False)}
    events = {'attack': {'impact': 8}}
    return rig, [ob], clips, events, dict(mouth=('Head', (0, -1.13, 1.03)), speed_mps=1.67)

# ---------------------------------------------------------------------------------------------------------------
# 2. CINDER RAT
# ---------------------------------------------------------------------------------------------------------------
def cinder_rat():
    Q = dict(hip_x=.07, shoulder_x=.06, rump=(0, .16, .22), mid=(0, 0, .26), chest=(0, -.14, .24), neck=(0, -.2, .25), head=(0, -.26, .26), snout=(0, -.42, .21),
             jaw_drop=.03, tail=[(0, .2, .18), (0, .36, .12), (0, .52, .06), (0, .68, .03)],
             front_leg=[(.06, -.14, .18), (.065, -.16, .10), (.065, -.17, .03), (.065, -.21, .005)],
             hind_leg=[(.075, .12, .2), (.085, .04, .12), (.085, .14, .05), (.085, .08, .005)])
    rig, bones = quadruped_rig('Rig_CinderRat', Q)
    M = dict(fur=mat('Rat ashen fur', '#6a5e54', 'fur_ashen', .18), belly=mat('Rat belly fur', '#8a7e70', 'fur_ashen', .14), tail=mat('Rat tail', '#a07a6e'),
             tooth=mat('Rat incisor', '#e0c47a'), eye=mat('Rat ember eye (glow)', '#ff8a2a', emit='#ff6a1a'), ear=mat('Rat ear', '#9a6a60'),
             ember=mat('Rat singed ember (glow)', '#ff7a2a', emit='#c8461a'))
    b = Body(rig)
    pts = [Vector(p) for p in ((0, .22, .2), (0, .14, .25), (0, .04, .3), (0, -.06, .29), (0, -.14, .25), (0, -.2, .23))]
    rad = [(.04, .04), (.09, .09), (.10, .11), (.09, .10), (.07, .075), (.05, .055)]
    rings = [[q + Vector((0, 0, -rz * .3)) if q.z < p.z - 1e-6 else q for q in ring_pts(p, (0, -1, 0), rx * 1.08, rz, 8)] for p, (rx, rz) in zip(pts, rad)]   # hanging belly
    b.loft(rings, M['fur'], ['Hips', 'Spine', 'Chest'], mats=lambda i, k: M['belly'] if k in (5, 6) else M['fur'])
    hpts = [Vector(p) for p in ((0, -.2, .24), (0, -.27, .26), (0, -.35, .235), (0, -.43, .21))]
    b.loft(path_rings(hpts, [(.05, .05), (.052, .05), (.032, .03), (.012, .012)], 8), M['fur'], ['Chest', 'Neck', 'Head'], cap0=False)
    b.blob((0, -.44, .21), .012, M['ear'], 'Head')                                                    # nose
    for s in (1, -1):
        b.blob((.03 * s, -.34, .255), .011, M['eye'], 'Head')
        b.cone(Vector((.035 * s, -.27, .29)), (s * .5, .2, 1), .028, .045, 5, M['ear'], 'Head', flat=.3)
    b.plate([(-.012, -.43, .19), (.012, -.43, .19), (.01, -.425, .155), (-.01, -.425, .155)], M['tooth'], 'Jaw')   # incisors
    for side, s in (('L', 1), ('R', -1)):
        fl = [Vector((p[0] * s, p[1], p[2])) for p in Q['front_leg']]
        hl = [Vector((p[0] * s, p[1], p[2])) for p in Q['hind_leg']]
        leg(b, [fl[0] + Vector((0, 0, .03)), fl[1], fl[2], fl[3]], [(.04, .05), (.018, .018), (.013, .013), (.011, .011)], M['fur'],
            ['Chest', 'UpperArm' + side, 'ForeArm' + side, 'Paw' + side], paw=(.016, .022))
        leg(b, [hl[0] + Vector((0, 0, .03)), hl[1], hl[2], hl[3]], [(.065, .075), (.026, .026), (.014, .014), (.011, .011)], M['fur'],
            ['Hips', 'Thigh' + side, 'Shin' + side, 'Foot' + side], paw=(.018, .032))
    tpts = [Vector(p) for p in Q['tail']]
    b.loft(path_rings(tpts, [(.018, .018), (.013, .013), (.009, .009), (.004, .004)], 5), M['tail'], ['Hips', 'Tail1', 'Tail2', 'Tail3'], cap0=False)
    for y, z in ((.02, .38), (.1, .36), (-.06, .37)):                                                 # singed embers in the fur
        b.blob((0, y, z - .06), .014, M['ember'], 'Spine', (1.4, 1, .5))
    ob = b.build('CinderRat_Body')
    sniff = lambda k: {'Head': (6 * k, 0, 8 * k), 'Neck': (-4 * k, 0, 0), 'Tail1': (0, 0, 14 * k), 'Tail2': (0, 0, 18 * k), 'Tail3': (0, 0, 20 * k), 'Chest': (2 * k, 0, 0)}
    idle = [(0, sniff(0)), (10, sniff(1)), (20, sniff(-.5)), (30, sniff(.6)), (40, sniff(-1)), (50, sniff(.3)), (60, sniff(0))]
    def scurry(ph):
        sw = lambda o: math.sin((ph + o) * math.tau); lift = lambda o: max(0.0, math.sin((ph + o) * math.tau))
        a, c = sw(0), sw(.5)
        return {'UpperArmL': (35 * a, 0, 0), 'UpperArmR': (35 * c, 0, 0), 'ForeArmL': (-30 * lift(.25), 0, 0), 'ForeArmR': (-30 * lift(.75), 0, 0),
                'ThighL': (-32 * a, 0, 0), 'ThighR': (-32 * c, 0, 0), 'ShinL': (30 * lift(.75), 0, 0), 'ShinR': (30 * lift(.25), 0, 0),
                'Spine': (6 * math.sin(ph * 2 * math.tau), 0, 0), 'Tail1': (-6, 0, 14 * a), 'Tail2': (0, 0, 18 * a), 'root_loc': (0, 0, .015 * abs(math.sin(ph * 2 * math.tau)))}
    walk = [(f, scurry(f / 12)) for f in range(0, 13, 2)]
    rear = {'Hips': (0, 0, 0), 'Chest': (-14, 0, 0), 'Neck': (-10, 0, 0), 'Head': (10, 0, 0), 'UpperArmL': (-30, 0, 0), 'UpperArmR': (-30, 0, 0), 'root_loc': (0, .03, .03)}
    snap = {'Chest': (10, 0, 0), 'Neck': (10, 0, 0), 'Head': (6, 0, 0), 'Jaw': (26, 0, 0), 'UpperArmL': (30, 0, 0), 'UpperArmR': (26, 0, 0), 'root_loc': (0, -.12, 0)}
    attack = [(0, {}), (3, rear), (5, snap), (8, mix(snap, Jaw=(0, 0, 0))), (12, {})]
    flinch = {'Chest': (-8, 0, 10), 'Head': (-12, 0, 10), 'Tail1': (14, 0, -16), 'root_loc': (0, .05, 0)}
    hit = [(0, {}), (3, flinch), (6, mix(flinch, root_loc=(0, .025, 0))), (10, {})]
    down = {'root_rot': (0, -90, 0), 'UpperArmL': (25, 0, 0), 'ThighL': (-25, 0, 0), 'Head': (-10, 0, 0), 'Tail1': (-6, 0, 0), 'Tail2': (-16, 0, 0), 'Tail3': (-20, 0, 0)}
    death = [(0, {}), (3, flinch), (10, mix(down, root_rot=(0, -96, 0))), (16, down), (24, down)]
    clips = {'idle': (60, idle, True), 'walk': (12, walk, True), 'attack': (12, attack, False), 'hit': (10, hit, False), 'death': (24, death, False)}
    return rig, [ob], clips, {'attack': {'impact': 5}}, dict(mouth=('Head', (0, -0.43, 0.2)), speed_mps=1.67)

# ---------------------------------------------------------------------------------------------------------------
# 3. CINDER WYRMLING
# ---------------------------------------------------------------------------------------------------------------
def cinder_wyrmling():
    Q = dict(hip_x=.28, shoulder_x=.28, rump=(0, .75, 1.05), mid=(0, .10, 1.10), chest=(0, -.55, 1.18), neck=(0, -.80, 1.35), head=(0, -1.35, 1.80), snout=(0, -1.95, 1.62),
             jaw_drop=.12, neck_bones=2, tail=[(0, .85, 1.02), (0, 1.35, .86), (0, 1.85, .62), (0, 2.30, .42), (0, 2.70, .30)],
             front_leg=[(.30, -.58, 1.04), (.36, -.44, .60), (.36, -.62, .16), (.36, -.80, .03)],
             hind_leg=[(.30, .70, 1.0), (.36, .45, .58), (.36, .82, .24), (.36, .62, .03)],
             wing=[(.26, -.42, 1.50), (.95, -.15, 1.95), (1.65, .35, 1.55)])
    rig, bones = quadruped_rig('Rig_CinderWyrmling', Q)
    M = dict(scale=mat('Wyrmling ember scales', '#5e2a20', 'scales_ember', 1.0), belly=mat('Wyrmling belly plates', '#b8783a', 'ruined_stone', .3),
             horn=mat('Wyrmling horn', '#3a302a', 'dark_rock', .25), claw=mat('Wyrmling claw', '#2a2220'),
             membrane=mat('Wyrmling wing membrane', '#6a2c1c', 'hide_ash', .6), eye=mat('Wyrmling eye (glow)', '#ffd060', emit='#ffb02a'),
             throat=mat('Wyrmling throat glow (glow)', '#d8601e', emit='#a8360c'), mouth=mat('Wyrmling maw (glow)', '#aa2a10', emit='#6a1a08'))
    b = Body(rig)
    pts = [Vector(p) for p in ((0, .98, 1.0), (0, .7, 1.08), (0, .35, 1.12), (0, 0, 1.12), (0, -.35, 1.18), (0, -.62, 1.24), (0, -.78, 1.32))]
    rad = [(.16, .15), (.32, .30), (.36, .34), (.34, .32), (.38, .38), (.33, .34), (.24, .25)]
    b.loft([ring_pts(p, (0, -1, 0), rx, rz, 10) for p, (rx, rz) in zip(pts, rad)], M['scale'], ['Hips', 'Spine', 'Chest'], sharp=4.0,
           mats=lambda i, k: M['belly'] if k in (6, 7, 8) else M['scale'])
    npts = [Vector(p) for p in ((0, -.74, 1.32), (0, -.95, 1.46), (0, -1.14, 1.62), (0, -1.32, 1.76))]
    b.loft(path_rings(npts, [(.22, .23), (.17, .18), (.15, .15), (.14, .14)], 8), M['scale'], ['Chest', 'Neck', 'Neck2', 'Head'], cap0=False, cap1=False,
           mats=lambda i, k: M['throat'] if k in (5, 6) and i >= 1 else M['scale'])
    hpts = [Vector(p) for p in ((0, -1.30, 1.78), (0, -1.46, 1.84), (0, -1.66, 1.76), (0, -1.86, 1.68), (0, -1.98, 1.64))]
    b.loft(path_rings(hpts, [(.15, .15), (.17, .15), (.13, .11), (.09, .08), (.05, .05)], 8), M['scale'], 'Head', cap0=False)
    jpts = [Vector(p) for p in ((0, -1.40, 1.66), (0, -1.66, 1.58), (0, -1.92, 1.56))]
    b.loft(path_rings(jpts, [(.12, .05), (.09, .04), (.05, .03)], 6), M['mouth'], 'Jaw')
    for s in (1, -1):
        b.blob((.11 * s, -1.60, 1.83), .035, M['eye'], 'Head', (1, 1.4, .7))
        b.cone(Vector((.09 * s, -1.42, 1.92)), (s * .25, .9, .5), .06, .38, 5, M['horn'], 'Head')          # horns
        b.cone(Vector((.12 * s, -1.30, 1.84)), (s * .6, .7, .1), .04, .2, 4, M['horn'], 'Head')            # cheek spikes
        for k in range(3):
            b.cone(Vector((.05 * s * (1 + k * .4), -1.93 + k * .09, 1.58)), (0, 0, -1), .015, .07, 3, M['claw'], 'Head')
    for i, (y, z, h) in enumerate(((-1.25, 1.95, .14), (-1.0, 1.68, .16), (-.7, 1.56, .2), (-.35, 1.53, .22), (0, 1.47, .22), (.35, 1.45, .2), (.7, 1.38, .17),
                                   (1.1, 1.18, .14), (1.55, .95, .12), (2.0, .72, .1), (2.4, .52, .08))):
        bone = 'Head' if y < -1.15 else 'Neck2' if y < -.9 else 'Chest' if y < -.3 else 'Spine' if y < .4 else 'Hips' if y < .9 else 'Tail1' if y < 1.4 else 'Tail2' if y < 1.9 else 'Tail3'
        b.cone(Vector((0, y, z - .05)), (0, .5, 1), .07, h, 4, M['horn'], bone, flat=.35)
    for side, s in (('L', 1), ('R', -1)):
        fl = [Vector((p[0] * s, p[1], p[2])) for p in Q['front_leg']]
        hl = [Vector((p[0] * s, p[1], p[2])) for p in Q['hind_leg']]
        leg(b, [fl[0] + Vector((0, 0, .1)), fl[1], fl[2], fl[3] + Vector((0, 0, .05))], [(.16, .18), (.10, .10), (.08, .08), (.07, .07)], M['scale'],
            ['Chest', 'UpperArm' + side, 'ForeArm' + side, 'Paw' + side], paw=(.11, .13), claw_m=M['claw'])
        leg(b, [hl[0] + Vector((0, 0, .1)), hl[1], hl[2], hl[3] + Vector((0, 0, .05))], [(.2, .24), (.12, .12), (.08, .08), (.07, .07)], M['scale'],
            ['Hips', 'Thigh' + side, 'Shin' + side, 'Foot' + side], paw=(.11, .15), claw_m=M['claw'])
        # wing: arm + three finger struts from the wrist, a scalloped membrane between them and back to the flank
        w = [Vector((p[0] * s, p[1], p[2])) for p in Q['wing']]
        wa, wh = 'WingArm' + side, 'WingHand' + side
        tips = [w[2], Vector((1.30 * s, .78, 1.22)), Vector((.80 * s, .92, 1.18))]
        body_pt = Vector((.24 * s, .62, 1.26))
        b.loft(path_rings([w[0], w[1]], [(.055, .055), (.04, .04)], 5), M['horn'], [wa])
        for tp in tips:
            b.loft(path_rings([w[1], tp], [(.032, .032), (.012, .012)], 4), M['horn'], [wh])
        b.cone(w[1] + Vector((0, 0, .02)), (s * .3, -.4, 1), .03, .14, 4, M['horn'], wh)                     # wrist thumb claw
        def scallop(a, c, pull):
            m_ = a.lerp(c, .5); return m_ + (w[1] - m_) * pull
        edge = [tips[0], scallop(tips[0], tips[1], .22), tips[1], scallop(tips[1], tips[2], .22), tips[2], scallop(tips[2], body_pt, .18), body_pt]
        for i in range(len(edge) - 1):
            b.plate([w[1], edge[i], edge[i + 1]], M['membrane'], [wh] if i < 4 else [wa, wh, 'Spine'])
        b.plate([w[0], w[1], body_pt], M['membrane'], [wa, wh, 'Spine'])
    tpts = [Vector(p) for p in Q['tail']]
    b.loft(path_rings(tpts, [(.15, .15), (.11, .11), (.08, .08), (.05, .05), (.02, .02)], 8), M['scale'], ['Hips', 'Tail1', 'Tail2', 'Tail3', 'Tail4'], cap0=False)
    b.cone(tpts[-1], (0, 1, -.2), .06, .25, 4, M['horn'], 'Tail4', flat=.3)
    ob = b.build('CinderWyrmling_Body')
    fold = {'WingArmL': (0, -20, 25), 'WingArmR': (0, 20, -25), 'WingHandL': (0, 0, 30), 'WingHandR': (0, 0, -30)}
    def breathe(k):
        return mix(fold, {'Chest': (2 * k, 0, 0), 'Neck': (-3 * k, 0, 0), 'Neck2': (-2 * k, 0, 2 * k), 'Head': (3 * k, 0, 4 * k), 'Tail1': (0, 0, 5 * k), 'Tail2': (0, 0, 7 * k),
                            'Tail3': (0, 0, 9 * k), 'WingArmL': (4 * k, 0, 0), 'WingArmR': (4 * k, 0, 0)})
    idle = [(f, breathe(math.sin(f / 72 * math.tau))) for f in (0, 18, 36, 54, 72)]
    def stride(ph):
        sw = lambda o: math.sin((ph + o) * math.tau); lift = lambda o: max(0.0, math.sin((ph + o) * math.tau))
        a, c = sw(0), sw(.5)
        return mix(fold, {'UpperArmL': (24 * a, 0, 0), 'UpperArmR': (24 * c, 0, 0), 'ForeArmL': (-28 * lift(.25), 0, 0), 'ForeArmR': (-28 * lift(.75), 0, 0),
                          'ThighL': (-22 * c, 0, 0), 'ThighR': (-22 * a, 0, 0), 'ShinL': (26 * lift(.25), 0, 0), 'ShinR': (26 * lift(.75), 0, 0),
                          'Chest': (0, 0, 5 * a), 'Hips': (0, 0, -5 * a), 'Neck': (0, 0, -4 * a), 'Head': (3 * math.sin(ph * 2 * math.tau), 0, 3 * a),
                          'Tail1': (0, 0, 10 * a), 'Tail2': (0, 0, 12 * a), 'Tail3': (0, 0, 14 * a), 'root_loc': (0, 0, .04 * abs(math.sin(ph * 2 * math.tau)))})
    walk = [(f, stride(f / 24)) for f in range(0, 25, 4)]
    rear = mix(fold, {'Chest': (-8, 0, 0), 'Neck': (-18, 0, 0), 'Neck2': (-10, 0, 0), 'Head': (-8, 0, 0), 'Jaw': (10, 0, 0), 'UpperArmL': (-18, 0, 0), 'UpperArmR': (-12, 0, 0),
                      'WingArmL': (-18, -10, 0), 'WingArmR': (-18, 10, 0), 'root_loc': (0, .1, .08)})
    bite = mix(fold, {'Chest': (8, 0, 0), 'Neck': (22, 0, 0), 'Neck2': (12, 0, 0), 'Head': (10, 0, 0), 'Jaw': (4, 0, 0), 'UpperArmL': (22, 0, 0), 'UpperArmR': (18, 0, 0),
                      'root_loc': (0, -.28, -.04)})
    attack = [(0, fold), (7, rear), (11, bite), (15, mix(bite, Jaw=(24, 0, 0))), (24, fold)]
    inhale = mix(fold, {'Chest': (-10, 0, 0), 'Neck': (-24, 0, 0), 'Neck2': (-14, 0, 0), 'Head': (-16, 0, 0), 'Jaw': (6, 0, 0),
                        'WingArmL': (-30, -18, 10), 'WingArmR': (-30, 18, -10), 'WingHandL': (0, 0, 10), 'WingHandR': (0, 0, -10), 'root_loc': (0, .12, .05)})
    exhale = mix(fold, {'Chest': (6, 0, 0), 'Neck': (14, 0, 0), 'Neck2': (8, 0, 0), 'Head': (6, 0, 0), 'Jaw': (34, 0, 0),
                        'WingArmL': (-40, -26, 20), 'WingArmR': (-40, 26, -20), 'WingHandL': (0, 0, -20), 'WingHandR': (0, 0, 20), 'root_loc': (0, -.1, 0)})
    breath = [(0, fold), (10, inhale), (16, exhale), (26, mix(exhale, Jaw=(28, 0, 0))), (36, fold)]
    flinch = mix(fold, {'Chest': (-8, 0, 8), 'Neck': (-16, 0, 10), 'Head': (-14, 0, 12), 'Jaw': (16, 0, 0), 'WingArmL': (-24, 0, 0), 'WingArmR': (-24, 0, 0),
                        'Tail1': (0, 0, -14), 'root_loc': (0, .12, 0)})
    hit = [(0, fold), (4, flinch), (8, mix(flinch, root_loc=(0, .06, 0))), (14, fold)]
    down = mix(fold, {'root_rot': (0, 80, 0), 'Neck': (8, 0, 18), 'Neck2': (6, 0, 12), 'Head': (0, 0, 14), 'Jaw': (20, 0, 0),
                      'WingArmL': (10, -30, 40), 'WingArmR': (-20, 20, -10), 'UpperArmL': (20, 0, 0), 'ThighR': (18, 0, 0), 'Tail1': (-6, 0, 0), 'Tail2': (-10, 0, 0), 'Tail3': (-12, 0, 0)})
    stagger = mix(flinch, {'root_loc': (.1, .1, -.18), 'ThighL': (18, 0, 0), 'ThighR': (18, 0, 0), 'UpperArmL': (-20, 0, 0), 'UpperArmR': (-24, 0, 0)})
    death = [(0, fold), (5, flinch), (14, stagger), (26, mix(down, root_rot=(0, 86, 0))), (34, down), (48, down)]
    clips = {'idle': (72, idle, True), 'walk': (24, walk, True), 'attack': (24, attack, False), 'breath': (36, breath, False), 'hit': (14, hit, False), 'death': (48, death, False)}
    events = {'attack': {'impact': 11}, 'breath': {'release': 16, 'until': 26}}
    return rig, [ob], clips, events, dict(mouth=('Head', (0, -1.98, 1.6)), speed_mps=1.67, size_tiles=2)

# ---------------------------------------------------------------------------------------------------------------
report = {'schema': 'crafted-realm-scarlands-bestiary-beasts-v1', 'builder': 'tools/blender/build_scarlands_bestiary_beasts_v1.py', 'blender': bpy.app.version_string, 'beasts': {}}
for fid, fn in (('ash_stalker', ash_stalker), ('cinder_rat', cinder_rat), ('cinder_wyrmling', cinder_wyrmling)):
    rig, meshes, clips, events, extra = fn()
    frames_, keys_, loop_ = clips['death']
    clips['death'] = (frames_, settle(rig, meshes, keys_), loop_)
    for name, (frames, keys, loop) in clips.items():
        make_clip(rig, fid + '__' + name, frames, keys)
    rig.arm.animation_data.action = None
    for pb in rig.arm.pose.bones:
        pb.rotation_euler = (0, 0, 0); pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0)
    out = WS / 'candidates' / (fid + '.glb')
    export(rig, meshes, out)
    tris = sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons)
    zs = [(o.matrix_world @ v.co).z for o in meshes for v in o.data.vertices]
    ys = [(o.matrix_world @ v.co).y for o in meshes for v in o.data.vertices]
    xs = [(o.matrix_world @ v.co).x for o in meshes for v in o.data.vertices]
    report['beasts'][fid] = {'glb': str(out.relative_to(ROOT)).replace('\\', '/'), 'sha256': hashlib.sha256(out.read_bytes()).hexdigest(), 'bytes': out.stat().st_size,
                             'triangles': tris, 'height_m': round(max(zs), 3), 'length_m': round(max(ys) - min(ys), 3), 'width_m': round(max(xs) - min(xs), 3),
                             'bones': [n for n in rig.bones], 'clips': {n: dict({'frames': f, 'fps': FPS, 'loop': l}, **events.get(n, {})) for n, (f, k, l) in clips.items()},
                             'anchors': {'mouth': {'bone': extra['mouth'][0], 'rest_gltf': [extra['mouth'][1][0], extra['mouth'][1][2], -extra['mouth'][1][1]],
                                                   'note': 'rest-pose model-space point (glTF axes) riding this bone: spawn bites / breath there'}}, 'walk_speed_mps': extra['speed_mps'],
                             'size_tiles': extra.get('size_tiles', 1)}
    rig.arm.hide_set(True)
    for o in meshes:
        o.hide_set(True)
    print('[BESTIARY BEAST]', fid, tris, 'tris', report['beasts'][fid]['height_m'], 'm tall', report['beasts'][fid]['length_m'], 'm long', sorted(clips))
(WS / 'working' / 'beasts.json').write_text(json.dumps(report, indent=1) + '\n')
bpy.ops.wm.save_as_mainfile(filepath=str(WS / 'candidates' / 'beasts.blend'), compress=False)
