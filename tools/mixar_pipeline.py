# mixar_pipeline.py — reusable game-prep for the Mixar model sprint (2026-07-07).
# Runs INSIDE Mixar (Blender 5.0) via the blender-mcp addon. Codifies the steps proven on the
# Giant Mole so each creature/character is a single call. All ops are scheduled on bpy.app.timers
# (baking blocks the UI; the MCP call must return) and log to a progress file the harness polls.
#
# Usage from mcp__blender__execute_blender_code:
#   exec(open(r"...tools/mixar_pipeline.py").read())
#   schedule_prep(high_name="node_0", out_name="giant_mole", target_tris=4500,
#                 length_m=3.0, up_is_z=True, facing="-Y", do_bake=True, log="...bake.log")
import bpy, mathutils

def _note(log, s):
    with open(log, "a", encoding="utf-8") as f:
        f.write(s + "\n")

def _obj_mode(o):
    if bpy.context.mode != 'OBJECT':
        with bpy.context.temp_override(active_object=o, object=o,
                                       selected_objects=[o], selected_editable_objects=[o]):
            bpy.ops.object.mode_set(mode='OBJECT')

def _find_high(exclude_names):
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name not in exclude_names]
    if not meshes:
        return None
    return max(meshes, key=lambda o: len(o.data.polygons))

def prep_lowpoly(high, out_name, target_tris=4500, voxel=0.02, log=None):
    """Voxel-remesh the Hunyuan soup into one watertight shell, decimate to target, flat-shade,
    smart-unwrap. Returns the new low-poly object (a copy; high is left intact)."""
    sc = bpy.context.scene
    low = high.copy(); low.data = high.data.copy(); low.name = out_name
    sc.collection.objects.link(low)
    low.hide_set(False); low.hide_viewport = False
    bpy.context.view_layer.objects.active = low
    ov = dict(active_object=low, object=low, selected_objects=[low], selected_editable_objects=[low])
    with bpy.context.temp_override(**ov):
        rm = low.modifiers.new('vox', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = voxel
        bpy.ops.object.modifier_apply(modifier='vox')
        t = sum(len(p.vertices) - 2 for p in low.data.polygons)
        if log: _note(log, f"  remesh tris={t}")
        if t > target_tris:
            dec = low.modifiers.new('dec', 'DECIMATE'); dec.ratio = float(target_tris) / max(1, t)
            bpy.ops.object.modifier_apply(modifier='dec')
        bpy.ops.object.shade_flat()
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.uv.smart_project(angle_limit=1.15192, island_margin=0.01)  # 66 deg
        # repack to FILL the 0-1 square (tall/thin shapes pack poorly otherwise -> huge black void).
        # CONCAVE shape packing (Blender 3.6+) fits island outlines instead of bounding boxes —
        # measured ~2x better fill on humanoids. Fall back for older API.
        bpy.ops.uv.select_all(action='SELECT')
        try:
            bpy.ops.uv.pack_islands(shape_method='CONCAVE', rotate=True, margin=0.003)
        except TypeError:
            bpy.ops.uv.pack_islands(rotate=True, margin=0.006)
        bpy.ops.object.mode_set(mode='OBJECT')
    if log: _note(log, f"  low tris={sum(len(p.vertices)-2 for p in low.data.polygons)}")
    return low

def bake_maps(low, high, res=2048, margin=24, bright=(1.5, 1.46, 1.4), void_fill=(0.5, 0.5, 0.52), log=None):
    # res 2048 is the CHARACTER bar (user decision 2026-07-07: "invest in crisp textures");
    # beasts/props may pass res=1024. margin scales with res (24px @ 2048 ≈ 12px @ 1024).
    """Bake albedo + roughness (NOT normal — renders black in r128) from high onto low. Brighten
    albedo for the game's dimmer lighting. Wires a clean MeshStandard material. Returns the material."""
    sc = bpy.context.scene
    high.hide_set(False); high.hide_render = False
    # selected-to-active bake needs SPATIAL OVERLAP: auto-match high's size/position to low.
    # (Cost us the v07 "ghost bake": low scaled to 1.85m, high still 1.13m -> 75% of texels found
    # no source surface and baked void. Never rely on the caller remembering this.)
    bpy.context.view_layer.update()
    if abs(high.dimensions.z - low.dimensions.z) > 0.01 * max(low.dimensions.z, 1e-6):
        s = low.dimensions.z / max(high.dimensions.z, 1e-9)
        high.scale = high.scale * s
        bpy.context.view_layer.update()
        mn_h = min((high.matrix_world @ v.co).z for v in high.data.vertices)
        mn_l = min((low.matrix_world @ v.co).z for v in low.data.vertices)
        high.location.z += (mn_l - mn_h)
        bpy.context.view_layer.update()
        if log: _note(log, f"  (auto) high rescaled to H={high.dimensions.z:.2f} to overlap low")
    mat = bpy.data.materials.new(out := (low.name + "_mat")); mat.use_nodes = True
    low.data.materials.clear(); low.data.materials.append(mat)
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    imgs = {}
    for key, cs in ((low.name + '_Albedo', 'sRGB'), (low.name + '_Rough', 'Non-Color')):
        img = bpy.data.images.get(key) or bpy.data.images.new(key, res, res, alpha=False)
        img.colorspace_settings.name = cs
        imgs[key] = img
    tgt = nt.nodes.new('ShaderNodeTexImage'); tgt.name = 'BAKE_TARGET'
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 4
    b = sc.render.bake
    b.use_selected_to_active = True; b.cage_extrusion = 0.06; b.max_ray_distance = 0.15
    b.margin = margin; b.margin_type = 'EXTEND'
    b.use_pass_direct = False; b.use_pass_indirect = False; b.use_pass_color = True
    win = bpy.context.window_manager.windows[0]
    area = next(a for a in win.screen.areas if a.type == 'VIEW_3D')
    region = next(r for r in area.regions if r.type == 'WINDOW')
    for o in sc.objects: o.select_set(o in (low, high))
    bpy.context.view_layer.objects.active = low
    ov = dict(window=win, area=area, region=region, active_object=low, object=low,
              selected_objects=[high, low], selected_editable_objects=[high, low])
    for ptype, key in [('DIFFUSE', low.name + '_Albedo'), ('ROUGHNESS', low.name + '_Rough')]:
        tgt.image = imgs[key]; nt.nodes.active = tgt
        with bpy.context.temp_override(**ov):
            bpy.ops.object.bake(type=ptype)
        if log: _note(log, f"  baked {ptype}")
    # brighten albedo for engine lighting
    import numpy as np
    a = imgs[low.name + '_Albedo']
    px = np.empty(len(a.pixels), dtype=np.float32); a.pixels.foreach_get(px)
    rgb = px.reshape(-1, 4)
    rgb[:, 0] = np.clip(rgb[:, 0] * bright[0], 0, 1)
    rgb[:, 1] = np.clip(rgb[:, 1] * bright[1], 0, 1)
    rgb[:, 2] = np.clip(rgb[:, 2] * bright[2], 0, 1)
    # fill unbaked black void with a neutral so stray-sampled faces never render pure black in-engine
    if void_fill is not None:
        lum = rgb[:, :3].mean(axis=1)
        v = lum < 0.03
        rgb[v, 0] = void_fill[0]; rgb[v, 1] = void_fill[1]; rgb[v, 2] = void_fill[2]
    a.pixels.foreach_set(rgb.reshape(-1)); a.update()
    # wire albedo->base color, rough->roughness (no normal map for the flat-shaded engine)
    na = nt.nodes.new('ShaderNodeTexImage'); na.image = imgs[low.name + '_Albedo']
    nt.links.new(na.outputs['Color'], bsdf.inputs['Base Color'])
    nr = nt.nodes.new('ShaderNodeTexImage'); nr.image = imgs[low.name + '_Rough']
    nt.links.new(nr.outputs['Color'], bsdf.inputs['Roughness'])
    return mat

def orient_scale_ground(o, length_m, up_is_z=True):
    """Scale so the longest horizontal axis ~= length_m, seat base on Z=0."""
    bpy.context.view_layer.update()
    dims = o.dimensions
    scale = length_m / max(dims)
    o.scale = o.scale * scale
    bpy.context.view_layer.update()
    mn = min((o.matrix_world @ v.co).z for v in o.data.vertices)
    o.location.z -= mn

def export_glb(objs, path, with_anim=False, log=None):
    sc = bpy.context.scene
    for o in sc.objects: o.select_set(o in objs)
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB',
                              export_skins=True, export_animations=with_anim, export_yup=True)
    if log: _note(log, f"  export {path}")

# ---------------------------------------------------------------------------
# HUMANOID RIG + PROCEDURAL CLIP AUTHORING (Track A characters)
# Bones are placed in armature space (armature kept at identity so armature space == world).
# Character faces -Y, up is +Z. Clips are keyframed by rotating pose bones about ARMATURE-space
# axes via a rest-matrix conversion, which sidesteps bone-roll/local-axis confusion entirely.
# Exported with export_animation_mode='ACTIONS' so each Action becomes a named GLB clip.
from mathutils import Vector, Quaternion, Matrix

# armature-space axes (character faces -Y): X=lateral(left-right), Y=depth(fwd -Y), Z=up
AX_LR = Vector((1, 0, 0))   # swing legs/arms forward-back rotates about this
AX_FB = Vector((0, 1, 0))   # raise arm out to the side rotates about this
AX_UP = Vector((0, 0, 1))   # twist/turn rotates about this

def rig_biped(mesh, log=None):
    """Build a ~15-bone humanoid armature fitted to the mesh bbox, bind with automatic weights.
    Returns the armature object. Assumes mesh base at Z=0, faces -Y."""
    sc = bpy.context.scene
    bpy.context.view_layer.update()
    ws = [mesh.matrix_world @ v.co for v in mesh.data.vertices]
    xs = [p.x for p in ws]; ys = [p.y for p in ws]; zs = [p.z for p in ws]
    H = max(zs) - min(zs); z0 = min(zs)
    cx = (max(xs) + min(xs)) / 2
    halfW = (max(xs) - min(xs)) / 2
    def P(x, zt): return Vector((cx + x, 0.0, z0 + zt * H))
    arm = bpy.data.armatures.new('rig'); armo = bpy.data.objects.new('armature', arm)
    sc.collection.objects.link(armo)
    bpy.context.view_layer.objects.active = armo
    with bpy.context.temp_override(active_object=armo, object=armo,
                                   selected_objects=[armo], selected_editable_objects=[armo]):
        bpy.ops.object.mode_set(mode='EDIT')
        eb = arm.edit_bones
        def B(name, head, tail, parent=None):
            b = eb.new(name); b.head = head; b.tail = tail
            if parent: b.parent = eb[parent]; b.use_connect = False
            return b
        aw = halfW
        B('hips',     P(0, 0.50), P(0, 0.56))
        B('spine',    P(0, 0.56), P(0, 0.66), 'hips')
        B('chest',    P(0, 0.66), P(0, 0.76), 'spine')
        B('neck',     P(0, 0.76), P(0, 0.82), 'chest')
        B('head',     P(0, 0.82), P(0, 0.94), 'neck')
        for s, sgn in (('L', 1), ('R', -1)):
            B('shoulder_'+s, P(sgn*0.05, 0.74), P(sgn*aw*0.55, 0.73), 'chest')
            B('uparm_'+s,    P(sgn*aw*0.55, 0.73), P(sgn*aw*0.80, 0.60), 'shoulder_'+s)
            B('forearm_'+s,  P(sgn*aw*0.80, 0.60), P(sgn*aw*0.95, 0.48), 'uparm_'+s)
            B('hand_'+s,     P(sgn*aw*0.95, 0.48), P(sgn*aw*1.0, 0.44), 'forearm_'+s)
            B('thigh_'+s, P(sgn*aw*0.45, 0.50), P(sgn*aw*0.45, 0.28), 'hips')
            B('shin_'+s,  P(sgn*aw*0.45, 0.28), P(sgn*aw*0.45, 0.04), 'thigh_'+s)
            B('foot_'+s,  P(sgn*aw*0.45, 0.04), P(sgn*aw*0.45, 0.0), 'shin_'+s)
            # push foot tail forward (-Y)
            eb['foot_'+s].tail = Vector((cx + sgn*aw*0.45, -0.12*H, z0))
        bpy.ops.object.mode_set(mode='OBJECT')
    # bind mesh with automatic weights
    for o in sc.objects: o.select_set(o in (mesh, armo))
    bpy.context.view_layer.objects.active = armo
    with bpy.context.temp_override(active_object=armo, object=armo,
                                   selected_objects=[mesh, armo], selected_editable_objects=[mesh, armo]):
        bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    if log: _note(log, f"  rig: {len(arm.bones)} bones, H={H:.2f}")
    return armo

def _rest_axis(pbone, world_axis):
    """Convert an armature-space axis into the bone's local rest space so a Quaternion(local, ang)
    rotates the bone about `world_axis`."""
    R = pbone.bone.matrix_local.to_3x3()
    return (R.inverted() @ world_axis).normalized()

def _key(pbone, frame, rots):
    """rots: list of (armature_axis, angle). Compose and keyframe rotation_quaternion at frame."""
    q = Quaternion((1, 0, 0, 0))
    for axis, ang in rots:
        q = q @ Quaternion(_rest_axis(pbone, axis), ang)
    pbone.rotation_mode = 'QUATERNION'
    pbone.rotation_quaternion = q
    pbone.keyframe_insert('rotation_quaternion', frame=frame)

def _new_action(armo, name):
    act = bpy.data.actions.new(name); act.use_fake_user = True
    if not armo.animation_data: armo.animation_data_create()
    armo.animation_data.action = act
    return act

def author_biped_clips(armo, log=None):
    """Author idle / walk / attack / block as four Actions (named GLB clips)."""
    import math
    pb = armo.pose.bones
    def reset():
        for b in pb: b.rotation_mode='QUATERNION'; b.rotation_quaternion = Quaternion((1,0,0,0))

    # ---- IDLE: gentle breathing sway, loop 1..49 ----
    reset(); _new_action(armo, 'idle')
    for f, ph in [(1,0),(13,1),(25,0),(37,-1),(49,0)]:
        _key(pb['chest'], f, [(AX_LR, 0.03*ph)])
        _key(pb['spine'], f, [(AX_LR, 0.015*ph)])
        _key(pb['head'],  f, [(AX_LR, 0.02*ph)])
        _key(pb['uparm_L'], f, [(AX_FB, -0.04*ph)])
        _key(pb['uparm_R'], f, [(AX_FB, 0.04*ph)])

    # ---- WALK: alternating stride, loop 1..25 ----
    reset(); _new_action(armo, 'walk')
    A = 0.5   # thigh swing amplitude
    for f, s in [(1,1),(7,0),(13,-1),(19,0),(25,1)]:
        _key(pb['thigh_L'], f, [(AX_LR,  A*s)])
        _key(pb['thigh_R'], f, [(AX_LR, -A*s)])
        # shins bend on the rear/lift phase (knee flexes when thigh swings back)
        _key(pb['shin_L'], f, [(AX_LR, -0.35*max(0,-s) - 0.15)])
        _key(pb['shin_R'], f, [(AX_LR, -0.35*max(0, s) - 0.15)])
        # arms counter-swing to opposite leg
        _key(pb['uparm_L'], f, [(AX_LR, -A*0.6*s)])
        _key(pb['uparm_R'], f, [(AX_LR,  A*0.6*s)])
        _key(pb['forearm_L'], f, [(AX_LR, -0.25)])
        _key(pb['forearm_R'], f, [(AX_LR, -0.25)])
        _key(pb['spine'], f, [(AX_UP, 0.06*s)])   # slight torso counter-twist

    # ---- ATTACK: overhead/side sword swing with right arm, once 1..17 ----
    reset(); _new_action(armo, 'attack')
    seq = {1:0.0, 5:-1.0, 11:1.1, 17:0.0}   # windup back then swing down-forward
    for f, s in seq.items():
        _key(pb['uparm_R'], f, [(AX_LR, s*1.1), (AX_FB, -0.3*max(0,-s))])
        _key(pb['forearm_R'], f, [(AX_LR, -0.4 + 0.3*s)])
        _key(pb['chest'], f, [(AX_UP, -0.25*s)])   # torso twists into the swing
        _key(pb['uparm_L'], f, [(AX_FB, 0.2)])

    # ---- BLOCK: raise left arm across body + slight crouch, once 1..13 then hold ----
    reset(); _new_action(armo, 'block')
    for f, s in [(1,0.0),(7,1.0),(13,1.0)]:
        _key(pb['uparm_L'], f, [(AX_FB, 0.5*s), (AX_LR, -0.8*s)])
        _key(pb['forearm_L'], f, [(AX_LR, -1.3*s)])
        _key(pb['thigh_L'], f, [(AX_LR, 0.15*s)])
        _key(pb['thigh_R'], f, [(AX_LR, 0.15*s)])
        _key(pb['shin_L'], f, [(AX_LR, -0.25*s)])
        _key(pb['shin_R'], f, [(AX_LR, -0.25*s)])
        _key(pb['chest'], f, [(AX_LR, 0.12*s)])

    # frame ranges per action (for the exporter)
    ranges = {'idle': (1,49), 'walk': (1,25), 'attack': (1,17), 'block': (1,13)}
    for a in bpy.data.actions:
        if a.name in ranges: a.frame_range  # touch
    reset()
    armo.animation_data.action = bpy.data.actions['idle']
    if log: _note(log, "  clips: idle/walk/attack/block authored")
    return ranges

def rig_quadruped(mesh, log=None):
    """Named-bone quadruped rig for beast archetypes (wolf pattern): root/body/head/tail +
    legFL/legFR/legBL/legBR. Driven procedurally in-engine by src/fx_<beast>.js (fx_dragon named-rig
    pattern) — export WITHOUT animations. AXIS-AWARE: body axis = the longer horizontal bbox axis
    (blind rotate-apply repeatedly failed on the wolf; measuring beats assuming). Head assumed at the
    NEGATIVE end of the body axis — verify in-game and adjust the fx driver yaw if reversed."""
    sc = bpy.context.scene
    bpy.context.view_layer.update()
    ws = [mesh.matrix_world @ v.co for v in mesh.data.vertices]
    xs=[p.x for p in ws]; ys=[p.y for p in ws]; zs=[p.z for p in ws]
    H = max(zs)-min(zs); z0=min(zs)
    ex, ey = max(xs)-min(xs), max(ys)-min(ys)
    if ex > ey:      # length on X -> swap roles: build along X
        L, yF = ex, min(xs)
        cx = (max(ys)+min(ys))/2; halfW = ey/2
        along_x = True
    else:
        L, yF = ey, min(ys)
        cx = (max(xs)+min(xs))/2; halfW = ex/2
        along_x = False
    def V(lat, lon, up):
        from mathutils import Vector
        return Vector((lon, cx+lat, up)) if along_x else Vector((cx+lat, lon, up))
    if log: _note(log, f"  axis-aware rig: length {'X' if along_x else 'Y'} L={L:.2f}")
    arm = bpy.data.armatures.new('beast_rig'); armo = bpy.data.objects.new('beast_armature', arm)
    sc.collection.objects.link(armo)
    bpy.context.view_layer.objects.active = armo
    with bpy.context.temp_override(active_object=armo, object=armo,
                                   selected_objects=[armo], selected_editable_objects=[armo]):
        bpy.ops.object.mode_set(mode='EDIT')
        eb = arm.edit_bones
        def B(name, head, tail, parent=None):
            b=eb.new(name); b.head=head; b.tail=tail
            if parent: b.parent=eb[parent]
            return b
        mid = yF + L*0.5
        B('root', V(0, mid, z0+H*0.05), V(0, mid, z0+H*0.45))
        B('body', V(0, yF+L*0.75, z0+H*0.55), V(0, yF+L*0.30, z0+H*0.60), 'root')
        B('head', V(0, yF+L*0.22, z0+H*0.62), V(0, yF+L*0.02, z0+H*0.72), 'body')
        B('tail', V(0, yF+L*0.85, z0+H*0.55), V(0, yF+L*1.02, z0+H*0.62), 'body')
        for nm, sx, ly in (('legFL', 1, 0.30), ('legFR', -1, 0.30), ('legBL', 1, 0.78), ('legBR', -1, 0.78)):
            B(nm, V(sx*halfW*0.55, yF+L*ly, z0+H*0.50),
                  V(sx*halfW*0.60, yF+L*ly, z0+H*0.02), 'body')
        bpy.ops.object.mode_set(mode='OBJECT')
    for o in sc.objects: o.select_set(o in (mesh, armo))
    bpy.context.view_layer.objects.active = armo
    with bpy.context.temp_override(active_object=armo, object=armo,
                                   selected_objects=[mesh, armo], selected_editable_objects=[mesh, armo]):
        bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    if log: _note(log, f"  quad rig: {len(arm.bones)} bones")
    return armo

print("[mixar_pipeline] loaded: prep_lowpoly, bake_maps, orient_scale_ground, export_glb, rig_biped, author_biped_clips, rig_quadruped")
