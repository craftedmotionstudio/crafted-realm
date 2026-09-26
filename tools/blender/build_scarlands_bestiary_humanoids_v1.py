"""The Scarlands bestiary v1, humanoid foes (W2/W3, 2026-09-26): built from the character kit v3.0 and the equipment
kit v1 so they share the player's rig, proportions, shading and item models.

  scar_skeleton       a fire-blackened skeleton: our own bone mesh (skull, ribcage, knobbed limb bones) skinned to the
                      kit's 23-bone rig; a rusted sword and a battered round shield, a dented med helm
  scar_raider_archer  an ash raider: kit body A (wild hair, short beard, torn shirt, tight sleeves, gloves, tattered
                      trousers, boots) in ash and rust colours, a hood, a leather body, and the equipment short bow
  ember_mage          a cinder-robed caster: kit body B with robe skirt, hose, sleeve trim and a pointed hat in charcoal
                      and ember orange, the equipment staff with a glowing ember gem

Kit parts, extras (the tutors' outfit pieces) and clips come from tools/blender/build_holm_characters_v2.py, imported
as a module (it never runs its main(), and nothing here writes to its output folders). Held weapons are solved the
EquipBuilder way (src/equip_builder.js): at the idle pose the item's business axis points along the spec's neutral
direction, its roll side toward rollAim, its grip in the palm (hand bone + palmAlong); the shield is strapped to the
left forearm like fx_humanoid.js. Each is then weighted 100% to its bone in the rest pose, so it follows every clip.
Worn equipment (bind frame) is weighted to the bone named in its extras.

Clips per GLB (30 fps, the kit's): idle, walk, attack, hit, death (+ block for the skeleton, shoot for the archer,
cast for the mage; attack is the same motion as shoot / cast for the ranged foes). Event frames (impact / release)
are written to working/humanoids.json for the manifest.
Run: blender -b --python tools/blender/build_scarlands_bestiary_humanoids_v1.py
"""
import bpy, bmesh, importlib.util, json, math, sys, hashlib
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[2]
WS = ROOT / '.studio-workspaces/scarlands-bestiary-v1'
(WS / 'working').mkdir(parents=True, exist_ok=True); (WS / 'candidates').mkdir(parents=True, exist_ok=True)
spec = importlib.util.spec_from_file_location('ck', str(ROOT / 'tools/blender/build_holm_characters_v2.py'))
ck = importlib.util.module_from_spec(spec)
sys.argv = [sys.argv[0]]
spec.loader.exec_module(ck)
B = ck.B
ck.reset_scene()
kit_arm, kit_mats, kit_objs, kit_clips, kit_defs = ck.build_kit()
kit_arm.hide_set(True)
for o in kit_objs.values():
    o.hide_set(True); o.hide_render = True

# ---------- equipment kit v1 (read only) ----------
EQ = ROOT / '.studio-workspaces/holm-equipment-v1/candidates/equipment.blend'
with bpy.data.libraries.load(str(EQ), link=False) as (src, dst):
    dst.objects = [n for n in src.objects if n.startswith(('eq_sword', 'eq_round_shield', 'eq_shortbow', 'eq_staff', 'eq_medhelm', 'eq_leather_body'))]
EQOBJ = {o.name: o for o in dst.objects if o is not None}
# EquipBuilder specs (src/equip_builder.js): item-local glTF axes, character-frame neutral / rollAim (x = left, y = up, z = forward)
SPECS = {'sword': dict(axis=(0, -1, 0), roll=(1, 0, 0), neutral=(0, .35, .94), rollAim=(1, 0, 0), grip=(0, .025, 0), palmAlong=.085, hand='RightHand'),
         'shortbow': dict(axis=(0, 1, 0), roll=(1, 0, 0), neutral=(0, .966, .259), rollAim=(0, 0, 1), grip=(.13, -.10, 0), palmAlong=.08, hand='LeftHand'),
         'staff': dict(axis=(0, 1, 0), roll=(1, 0, 0), neutral=(0, .95, .31), rollAim=(0, 0, 1), grip=(0, 0, 0), palmAlong=.085, hand='RightHand')}
def gl(v):
    """glTF (x, y, z) -> Blender (x, -z, y); a proper rotation, so bases and cross products carry over."""
    return Vector((v[0], -v[2], v[1]))
def basis(y, x):
    y = Vector(y).normalized(); x = Vector(x); x = (x - y * x.dot(y)).normalized(); z = x.cross(y)
    return Matrix((x, y, z)).transposed()

def eq_polys(kind):
    """the eq_<kind> meshes' triangles in the item's own frame (Blender coords, grip-frame origin or bind pose) with
    their material names and the bone each part rides (bind-frame kinds)"""
    root = EQOBJ['eq_' + kind]
    out = []
    for ch in root.children:
        if ch.type != 'MESH':
            continue
        me = ch.data
        M = ch.matrix_local
        for p in me.polygons:
            out.append(([M @ me.vertices[i].co for i in p.vertices], me.materials[p.material_index].name if me.materials else 'M_METAL', ch.get('bone')))
    return out

def held_prop(arm, pose, kind, mb_mats, tint, name, coll):
    """EquipBuilder solve at `pose`, then map into the hand bone's rest frame, weighted 100% to that bone"""
    S = SPECS[kind]
    ck.set_pose(arm, pose)
    pb = arm.pose.bones[B(S['hand'])]
    M = pb.matrix @ pb.bone.matrix_local.inverted()
    palm = pb.matrix @ Vector((0, S['palmAlong'], 0))
    R = basis(gl(S['neutral']), gl(S['rollAim'])) @ basis(gl(S['axis']), gl(S['roll'])).inverted()
    grip = gl(S['grip'])
    Mi = M.inverted()
    mb = ck.MB(); allf = []
    for pts, mat, _ in eq_polys(kind):
        vs = [mb._v(tuple(Mi @ (palm + R @ (p - grip))), B(S['hand'])) for p in pts]
        mb._face(vs, mat, False, allf)
        _ensure(mb_mats, mat, tint)
    ck.clear_pose(arm)
    return mb.to_object(name, mb_mats, arm, coll=coll)

def shield_prop(arm, pose, kind, mb_mats, tint, name, coll):
    """strapped to the left forearm (fx_humanoid.js): 55% elbow -> wrist, 6.5 cm out to the character's left, face
    normal out-left with a slight forward turn, height axis up"""
    ck.set_pose(arm, pose)
    fore, hand = arm.pose.bones[B('LeftForeArm')], arm.pose.bones[B('LeftHand')]
    M = fore.matrix @ fore.bone.matrix_local.inverted()
    left_c = gl((1, 0, 0))
    pt = fore.head.lerp(hand.head, 0.55) + left_c * 0.065
    polys = eq_polys(kind)
    xs = [p for pts, _, _ in polys for p in pts]
    size = [max(v[i] for v in xs) - min(v[i] for v in xs) for i in range(3)]
    axes = sorted(range(3), key=lambda i: size[i])
    nL = Vector([1 if i == axes[0] else 0 for i in range(3)]); uL = Vector([1 if i == axes[2] else 0 for i in range(3)])
    nW = gl((.94, 0, .34)).normalized(); uW = gl((0, 1, 0)); uW = (uW - nW * uW.dot(nW)).normalized()
    W = Matrix((nW, uW, nW.cross(uW))).transposed(); L = Matrix((nL, uL, nL.cross(uL))).transposed()
    R = W @ L.inverted()
    cen = sum(xs, Vector()) / len(xs)
    Mi = M.inverted()
    mb = ck.MB(); allf = []
    for pts, mat, _ in polys:
        vs = [mb._v(tuple(Mi @ (pt + R @ (p - cen))), B('LeftForeArm')) for p in pts]
        mb._face(vs, mat, False, allf)
        _ensure(mb_mats, mat, tint)
    ck.clear_pose(arm)
    return mb.to_object(name, mb_mats, arm, coll=coll)

def worn(arm, kind, mb_mats, tint, name, coll, grow=0.0):
    """bind-frame armour: each part weighted 100% to its bone (extras.bone), pushed out `grow` along its normal"""
    mb = ck.MB(); allf = []
    for pts, mat, bone in eq_polys(kind):
        n = (pts[1] - pts[0]).cross(pts[2] - pts[0]).normalized() if len(pts) >= 3 else Vector()
        vs = [mb._v(tuple(p + n * grow), B(bone or 'Spine1')) for p in pts]
        mb._face(vs, mat, False, allf)
        _ensure(mb_mats, mat, tint)
    return mb.to_object(name, mb_mats, arm, coll=coll)

def _ensure(mb_mats, mat, tint):
    if mat not in mb_mats:
        mb_mats[mat] = ck.new_mat(mat, tint.get(mat, '#7a6a5a'))

# ---------- the foes ----------
FOES = {
 'scar_raider_archer': dict(bt='A', parts={'Hair': 2, 'Jaw': 6, 'Torso': 7, 'Arms': 7, 'Hands': 2, 'Legs': 5, 'Feet': 1},
   colors={'C_HAIR': '#3a2a22', 'C_TORSO': '#5c4a3a', 'C_LEGS': '#3e3a34', 'C_FEET': '#2e2620', 'C_SKIN': '#b88a66', 'A_BELT': '#3a2616', 'A_METAL': '#6a625a'},
   mats={'A_GREEN': '#4a3e36', 'Q_LEATHER': '#4a3020', 'Q_DARK': '#2e1e14', 'Q_SHAFT': '#8a6a44', 'Q_FLETCH': '#c8b898'}, extras=['hood', 'quiver'],
   worn={'leather_body': {'M_LEATHER': '#5a3e28', 'M_LEATHER_DARK': '#3a281a', 'M_BRASS': '#8a6a3a', 'M_WOOD_DARK': '#3a2a1e'}},
   held=('shortbow', {'M_WOOD': '#6a4a2c', 'M_WOOD_DARK': '#4a3220', 'M_STRING': '#d8ccb0', 'M_LEATHER': '#5a3e28', 'M_LEATHER_DARK': '#3a281a', 'M_WRAP': '#7a2e22'}),
   attack='bow', alias='shoot'),
 'ember_mage': dict(bt='B', parts={'Hair': 2, 'Torso': 1, 'Arms': 5, 'Hands': 1, 'Legs': 1, 'Feet': 2, 'Makeup': 1},
   colors={'C_HAIR': '#1e1814', 'C_TORSO': '#2e2626', 'C_LEGS': '#2e2626', 'C_FEET': '#1e1a18', 'C_SKIN': '#a07a5e', 'A_TRIM': '#c8561c'},
   mats={'A_HAT': '#2a2020'}, extras=['pointed_hat', 'robe_skirt', 'robe_hose', 'sleeve_trim'],
   held=('staff', {'M_WOOD': '#3a2a22', 'M_WOOD_DARK': '#241a16', 'M_BRASS': '#9a6a2a', 'M_LEATHER_DARK': '#2a1e16', 'M_GEM': '#ff7a1e'}),
   attack='cast', alias='cast'),
}

def ext_quiver(mb, bt):
    """a back quiver slung from the left hip to over the right shoulder, arrow fletchings showing (rigid on Spine2)"""
    S2 = B('Spine2')
    rx, rf, rb, cy = ck.body_r(bt, 1.30)
    yb = cy + rb + .058
    bot, top = Vector((.09, yb - .015, 1.00)), Vector((-.11, yb + .01, 1.50))
    ax = (top - bot); axn = ax.normalized()
    rings = [ck.xring(bot + ax * t, ax, r, r * .8, r * .8, 6) for t, r in ((0, .036), (.04, .044), (.9, .050), (1.0, .056))]
    mb.loft(rings, 'Q_LEATHER', S2, smooth=False, matfn=lambda i, k: 'Q_DARK' if i in (0, 2) else 'Q_LEATHER')
    for k, (dx, dy) in enumerate(((-.018, -.008), (.016, .002), (.0, .02), (-.02, .022), (.02, -.014))):
        base = top + Vector((dx, dy, 0)) - axn * .03
        tip = base + axn * (.10 + .018 * (k % 3))
        mb.loft([ck.xring(base, axn, .004, .004, .004, 4), ck.xring(tip, axn, .004, .004, .004, 4)], 'Q_SHAFT', S2, smooth=False)
        mb.cone(ck.xring(tip - axn * .055, axn, .016, .005, .005, 3, phase=k * .7), tip + axn * .01, 'Q_FLETCH', S2, smooth=False)
ck.EXTRA_FN['quiver'] = (ext_quiver, False)

# the skeleton: our own bone mesh on the kit rig
BONE_W = '#d4ccb4'; BONE_SOOT = '#7a7060'
def skeleton_parts(mb):
    """limb bones as knobbed tubes along the kit bones; a ribcage of hoops round Spine1/Spine2; a pelvis; a skull with
    brow, eye sockets and a jaw on the Head bone; small bony hands and feet"""
    P = {b[0]: (Vector(b[2]), Vector(b[3])) for b in ck.BONES}
    def tube(bone, r0, r1, knob=1.35, mat='SK_BONE', n=6, t0=0.0, t1=1.0):
        h, t = P[B(bone)]
        a, b = h.lerp(t, t0), h.lerp(t, t1)
        ax = (b - a).normalized()
        rings = [ck.xring(a + (b - a) * u, ax, r, r, r, n) for u, r in ((0.0, r0 * knob), (0.08, r0), (0.5, (r0 + r1) / 2 * 0.85), (0.92, r1), (1.0, r1 * knob))]
        mb.loft(rings, mat, B(bone))
    for s in ('Left', 'Right'):
        tube(s + 'Arm', .030, .026); tube(s + 'ForeArm', .024, .020)
        tube(s + 'UpLeg', .038, .030); tube(s + 'Leg', .030, .024)
        tube(s + 'Shoulder', .018, .018, knob=1.2)
        # hand: a flat bony paddle with three finger stubs
        h, t = P[B(s + 'Hand')]
        ax = (t - h).normalized()
        mb.loft([ck.xring(h + ax * d, ax, w, .012, .012, 5) for d, w in ((0.0, .022), (.07, .032), (.10, .026))], 'SK_BONE', B(s + 'Hand'))
        side = ax.cross(Vector((0, -1, 0))).normalized()
        for k in (-1, 0, 1):
            base = h + ax * .10 + side * (.012 * k)
            mb.loft([ck.xring(base + ax * d, ax, .007, .007, .007, 4) for d in (0, .07)], 'SK_BONE', B(s + 'Hand'))
        # foot: heel knob + a flat splay of toe bones
        fh, ft = P[B(s + 'Foot')]
        mb.box(tuple(fh + Vector((0, 0, -.045))), (.07, .07, .05), 'SK_BONE', B(s + 'Foot'))
        tt, te = P[B(s + 'ToeBase')]
        mb.box(tuple(fh.lerp(tt, .5) + Vector((0, 0, -.07))), (.09, .14, .03), 'SK_BONE', B(s + 'Foot'), taper=.8)
        mb.box(tuple(tt + Vector((0, -.04, -.08))), (.09, .08, .025), 'SK_SOOT', B(s + 'ToeBase'))
    # spine: vertebrae as small blocks from the pelvis to the neck
    for bone in ('Spine', 'Spine1', 'Spine2', 'Neck'):
        h, t = P[B(bone)]
        for u in (0.15, 0.55, 0.9):
            c = h.lerp(t, u) + Vector((0, .035, 0))
            mb.box(tuple(c), (.045, .04, .035), 'SK_BONE' if u != .55 else 'SK_SOOT', B(bone))
    # ribcage: five hoops, narrowing downward, open at the front below the sternum
    for i, (z, rs, rf) in enumerate(((1.36, .125, .085), (1.31, .135, .092), (1.26, .135, .09), (1.21, .125, .085), (1.16, .11, .075))):
        bone = B('Spine2') if z > 1.27 else B('Spine1')
        c = Vector((0, .01, z))
        ring = ck.xring(c, (0, 0, 1), rs, rf, rf * .95, 12, front=(0, -1, 0))
        pts = [Vector(p) for p in ring]
        # a thin flat band: two rings a few mm apart, skipping the two front-most segments (open chest)
        up = [p + Vector((0, 0, .016)) for p in pts]
        vs0 = [mb._v(tuple(p), bone) for p in pts]; vs1 = [mb._v(tuple(p), bone) for p in up]
        allf = []
        for k in range(12):
            if k in (0, 11) and i >= 2:
                continue
            mb._face((vs0[k], vs0[(k + 1) % 12], vs1[(k + 1) % 12], vs1[k]), 'SK_BONE' if i % 2 == 0 else 'SK_SOOT', False, allf)
        bmesh.ops.recalc_face_normals(mb.bm, faces=allf)
    mb.box((0, -.07, 1.29), (.035, .02, .16), 'SK_BONE', B('Spine2'))   # sternum
    # collar bones
    for sx in (1, -1):
        mb.loft([ck.xring(Vector((sx * x, -.02, 1.405 - x * .08)), (sx, 0, 0), .012, .012, .012, 5) for x in (.02, .14)], 'SK_BONE', B('Spine2'))
    # pelvis: a squat bowl
    mb.loft([ck.xring(Vector((0, .01, z)), (0, 0, 1), rs, rf, rf, 10) for z, rs, rf in ((.90, .10, .06), (.97, .15, .085), (1.02, .13, .08))], 'SK_BONE', B('Hips'))
    # skull: cranium, brow ridge, dark sockets and nose hole, jaw
    hh, ht = P[B('Head')]
    c = hh + Vector((0, -.01, .10))
    mb.loft([ck.xring(c + Vector((0, 0, dz)), (0, 0, 1), rs, rf, rb, 10) for dz, rs, rf, rb in
             ((-.07, .055, .060, .050), (-.03, .075, .085, .080), (.02, .085, .095, .092), (.07, .078, .085, .085), (.11, .05, .055, .055), (.135, .012, .012, .012))], 'SK_BONE', B('Head'))
    for sx in (1, -1):
        mb.box(tuple(c + Vector((sx * .033, -.083, .0))), (.036, .02, .032), 'SK_DARK', B('Head'))    # eye sockets
    mb.box(tuple(c + Vector((0, -.088, -.035))), (.016, .016, .022), 'SK_DARK', B('Head'))           # nose
    mb.box(tuple(c + Vector((0, -.07, .03))), (.13, .035, .022), 'SK_BONE', B('Head'))              # brow ridge
    mb.box(tuple(c + Vector((0, -.05, -.095))), (.10, .075, .04), 'SK_BONE', B('Head'), taper=.8)  # jaw
    mb.box(tuple(c + Vector((0, -.084, -.07))), (.07, .012, .014), 'SK_DARK', B('Head'))           # teeth line

def build_foe(fid):
    arm = ck.build_armature()
    arm.name = arm.data.name = 'Armature_' + fid
    coll = bpy.data.collections.new('Foe_' + fid)
    bpy.context.scene.collection.children.link(coll)
    objs = {}
    bm = {}
    idle_pose = kit_defs['idle'][1][0][1]
    if fid == 'scar_skeleton':
        for mn, hx in (('SK_BONE', BONE_W), ('SK_SOOT', BONE_SOOT), ('SK_DARK', '#1a1614')):
            bm[mn] = ck.new_mat(mn, hx)
        mb = ck.MB()
        skeleton_parts(mb)
        objs['Bones'] = mb.to_object('ScarSkeleton_Bones', bm, arm, coll=coll)
        rust = {'M_METAL': '#6e5a4a', 'M_METAL_DARK': '#4a3a30', 'M_METAL_EDGE': '#9a8672', 'M_LEATHER': '#3a2a1e', 'M_LEATHER_DARK': '#2a1e16', 'M_WRAP': '#5a3a26',
                'M_WOOD': '#4a3a2c', 'M_WOOD_DARK': '#2e241c'}
        objs['Sword'] = held_prop(arm, idle_pose, 'sword', bm, rust, 'ScarSkeleton_Sword', coll)
        objs['Shield'] = shield_prop(arm, idle_pose, 'round_shield', bm, rust, 'ScarSkeleton_Shield', coll)
        objs['Helm'] = worn(arm, 'medhelm', bm, rust, 'ScarSkeleton_Helm', coll, grow=-0.012)
        attack, alias = 'attack_slash', None
        extra_clips = {'block': 'block'}
    else:
        t = FOES[fid]
        bt = t['bt']
        for mn, m in kit_mats.items():
            m2 = m.copy()
            hx = t['colors'].get(mn)
            ck.set_mat_color(m2, hx if hx else '#%02x%02x%02x' % tuple(round(c * 255) for c in ck.MAT_SRGB[m.name]))
            bm[mn] = m2
        for mn, hx in t['mats'].items():
            bm[mn] = ck.new_mat(mn, hx)
        for slot, idx in t['parts'].items():
            src = kit_objs[ck.part_name(bt, slot, idx)]
            ob = src.copy(); ob.data = src.data.copy()
            nm = '%s_%s' % (fid, slot)
            ob.name = ob.data.name = nm
            if ob.data.shape_keys:
                ob.shape_key_clear()
            for i, ms in enumerate(ob.data.materials):
                ob.data.materials[i] = bm[ms.name.split('.')[0]]
            coll.objects.link(ob)
            ob.parent = arm
            ob.modifiers['Armature'].object = arm
            ob.hide_set(False); ob.hide_render = False
            objs[nm] = ob
        for ex in t['extras']:
            fn, head_space = ck.EXTRA_FN[ex]
            mb = ck.MB()
            fn(mb, bt)
            if head_space:
                ck.head_xform(mb)
            nm = '%s_%s' % (fid, ''.join(w.capitalize() for w in ex.split('_')))
            objs[nm] = mb.to_object(nm, bm, arm, coll=coll)
        for kind, tint in t.get('worn', {}).items():
            objs[kind] = worn(arm, kind, bm, tint, fid + '_' + kind, coll, grow=0.004)
        kind, tint = t['held']
        objs[kind] = held_prop(arm, idle_pose, kind, bm, tint, fid + '_' + kind.capitalize(), coll)
        attack, alias = t['attack'], t['alias']
        extra_clips = {}
    # clips: kit keyframes on this rig, one NLA track each
    want = {'idle': 'idle', 'walk': 'walk', 'attack': attack, 'hit': 'hit', 'death': 'death'}
    if alias:
        want[alias] = attack
    want.update(extra_clips)
    ad = arm.animation_data_create()
    for name, src_name in want.items():
        frames, keys, loop = kit_defs[src_name]
        act = ck.make_clip(arm, fid + '_' + name, frames, keys)
        ad.action = None
        tr = ad.nla_tracks.new(); tr.name = name
        st = tr.strips.new(name, 0, act); st.name = name
    ad.action = None
    ck.clear_pose(arm)
    return arm, objs, want

# event frames of the kit clips (30 fps): read off the keyframes (see build_holm_characters_v2.py clip_defs)
EVENTS = {'attack_slash': {'impact': 9}, 'bow': {'release': 26}, 'cast': {'release': 14}}
report = {'schema': 'crafted-realm-scarlands-bestiary-humanoids-v1', 'builder': 'tools/blender/build_scarlands_bestiary_humanoids_v1.py',
          'blender': bpy.app.version_string, 'kit': 'tools/blender/build_holm_characters_v2.py (v3.0)', 'equipment': str(EQ.relative_to(ROOT)).replace('\\', '/'), 'foes': {}}
for fid in ('scar_skeleton', 'scar_raider_archer', 'ember_mage'):
    arm, objs, want = build_foe(fid)
    out = WS / 'candidates' / (fid + '.glb')
    ck.export_glb(str(out), arm, list(objs.values()), 'NLA_TRACKS')
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs.values())
    zs = [(o.matrix_world @ v.co).z for o in objs.values() for v in o.data.vertices]
    clips = {}
    for name, src_name in want.items():
        frames = kit_defs[src_name][0]
        c = {'frames': frames, 'fps': ck.FPS, 'loop': bool(kit_defs[src_name][2]), 'from': src_name}
        c.update(EVENTS.get(src_name, {}))
        clips[name] = c
    report['foes'][fid] = {'glb': str(out.relative_to(ROOT)).replace('\\', '/'), 'sha256': hashlib.sha256(out.read_bytes()).hexdigest(), 'bytes': out.stat().st_size,
                          'triangles': tris, 'height_m': round(max(zs), 3), 'meshes': sorted(o.name for o in objs.values()), 'clips': clips, 'rig': 'kit v3.0 (23 mixamorig bones, glTF +Z forward)'}
    for o in objs.values():
        o.hide_set(True); o.hide_render = True
    arm.hide_set(True)
    print('[BESTIARY HUMANOID]', fid, tris, 'tris', round(max(zs), 2), 'm', sorted(clips))
(WS / 'working' / 'humanoids.json').write_text(json.dumps(report, indent=1) + '\n')
bpy.ops.wm.save_as_mainfile(filepath=str(WS / 'candidates' / 'humanoids.blend'), compress=False)
