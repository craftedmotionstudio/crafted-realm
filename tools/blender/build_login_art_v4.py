"""Login art v4.1 (v4 owner 2026-09-26: "our login artwork should look more like the old 2004 login"; v4.1 the same day:
"carve the name into one long stone lintel so it's clearly ours", "the flames should sit on the bowls", "drop the lantern,
keep the hammer, add a sword and/or a helmet"): our own dim stone
hall seen through a great archway -- square pillars, coursed brick walls, a misty corridor receding behind, flagstones --
plus the iron braziers and their fire, the CRAFTED REALM carved-stone title, and the carved-slate login panel and buttons.
Everything is modelled here (original designs; nothing traced or copied from any game's art or logo: our title is two
rows of engraved stone slabs flanked by a hanging lantern and a smith's hammer).

Usage:  blender -b --python tools/blender/build_login_art_v4.py [-- --only hall,brazier,flame,logo,panel,buttons]
Output: .studio-workspaces/login-art-v4/raw/*.png + manifest.json  -> finished by tools/process_login_art_v4.py
Deterministic (seeded). Blender 4.5, EEVEE.
"""
import bpy, bmesh, math, random, json, sys
from pathlib import Path
from mathutils import Vector, Matrix
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lowpoly_lib import *

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / '.studio-workspaces/login-art-v4/raw'; RAW.mkdir(parents=True, exist_ok=True)
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ONLY = set(argv[argv.index('--only') + 1].split(',')) if '--only' in argv else None
TAG = '[LOGIN_ART_V4]'
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
TITLE_FONT = next((f for f in ('C:/Windows/Fonts/georgiab.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf') if Path(f).exists()), None)

# ------------------------------------------------------------------ materials (authored sRGB; e_ emissive, n_ mottled, v_ veined)
PAL = {
    'brick_a': (.49, .51, .51), 'brick_b': (.45, .47, .47), 'brick_c': (.52, .54, .53), 'brick_d': (.42, .44, .44), 'mortar': (.19, .21, .21),
    'flag_a': (.36, .37, .36), 'flag_b': (.31, .32, .31), 'flag_c': (.40, .41, .39), 'grout': (.12, .12, .12),
    'n_pillar': (.55, .58, .57), 'n_pillar_dk': (.42, .45, .44), 'n_arch': (.53, .56, .55), 'vault': (.40, .41, .40), 'groove': (.22, .22, .22),
    'e_mist': (.80, .86, .80), 'iron': (.34, .34, .36), 'iron_dk': (.18, .18, .19), 'steel': (.62, .64, .67),
    'e_fire_dk': (.84, .26, .04), 'e_fire': (1.0, .58, .10), 'e_fire_core': (1.0, .90, .46), 'e_ember': (1.0, .62, .18), 'coal': (.14, .10, .08),
    'n_slab': (.72, .72, .70), 'ink': (.10, .09, .09), 'n_lintel': (.66, .66, .64), 'cut': (.30, .30, .31), 'n_key': (.38, .39, .40), 'helm': (.80, .82, .85), 'chip': (.56, .56, .54), 'wood': (.50, .32, .16), 'wood_dk': (.30, .19, .09), 'e_lamp': (1.0, .84, .38), 'brass': (.80, .60, .26),
    'n_rim': (.50, .51, .55), 'v_marble': (.44, .45, .50), 'rim_groove': (.16, .16, .18),
    'btn_face': (.30, .30, .33), 'btn_face_hi': (.40, .40, .44), 'btn_face_red': (.42, .15, .10), 'btn_face_red_hi': (.52, .20, .13), 'btn_face_off': (.22, .22, .23),
    'btn_rim': (.56, .56, .60), 'btn_rim_red': (.62, .40, .34), 'btn_rim_off': (.40, .40, .42),
}
def lin(c): return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4
FOG = None          # {'rgb':(r,g,b), 'd0':near, 'd1':far} while the hall renders
MATS = {}
def mat(name):
    key = name + ('|fog' if FOG else '')
    if key in MATS: return MATS[key]
    rgb = PAL[name]; m = bpy.data.materials.new(key); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; Lk = nt.links
    for n in list(N): N.remove(n)
    out = N.new('ShaderNodeOutputMaterial')
    col = (*[lin(c) for c in rgb], 1)
    if name.startswith('e_'):
        sh = N.new('ShaderNodeEmission'); sh.inputs['Color'].default_value = col; sh.inputs['Strength'].default_value = 1.0
    else:
        sh = N.new('ShaderNodeBsdfDiffuse'); sh.inputs['Roughness'].default_value = 1.0
        if name[:2] in ('n_', 'v_'):
            tc = N.new('ShaderNodeTexCoord'); nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 16.0 if name[:2] == 'n_' else 3.0
            nz.inputs['Detail'].default_value = 4.0; Lk.new(tc.outputs['Object'], nz.inputs['Vector'])
            ramp = N.new('ShaderNodeValToRGB'); r = ramp.color_ramp
            if name[:2] == 'n_':
                r.elements[0].position = .3; r.elements[0].color = (*[lin(c * .9) for c in rgb], 1)
                r.elements[1].position = .7; r.elements[1].color = (*[lin(min(1, c * 1.06)) for c in rgb], 1)
                Lk.new(nz.outputs['Fac'], ramp.inputs['Fac'])
            else:   # crackled slate: mottled grey-blue with thin dark cracks along voronoi cell edges
                vo = N.new('ShaderNodeTexVoronoi'); vo.feature = 'DISTANCE_TO_EDGE'; vo.inputs['Scale'].default_value = 3.4
                try: vo.inputs['Randomness'].default_value = 1.0
                except Exception: pass
                Lk.new(tc.outputs['Object'], vo.inputs['Vector'])
                cr = N.new('ShaderNodeValToRGB'); c2 = cr.color_ramp; c2.interpolation = 'CONSTANT'
                c2.elements[0].position = 0; c2.elements[0].color = (.62, .62, .64, 1)
                c2.elements[1].position = .012; c2.elements[1].color = (1, 1, 1, 1)
                Lk.new(vo.outputs['Distance'], cr.inputs['Fac'])
                r.elements[0].position = .3; r.elements[0].color = (*[lin(c * .88) for c in rgb], 1)
                r.elements[1].position = .72; r.elements[1].color = (*[lin(min(1, c * 1.08)) for c in rgb], 1)
                Lk.new(nz.outputs['Fac'], ramp.inputs['Fac'])
                mul = N.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1.0
                Lk.new(ramp.outputs['Color'], mul.inputs[6]); Lk.new(cr.outputs['Color'], mul.inputs[7])
                Lk.new(mul.outputs[2], sh.inputs['Color']); ramp = None
            if ramp is not None: Lk.new(ramp.outputs['Color'], sh.inputs['Color'])
        else:
            sh.inputs['Color'].default_value = col
    final = sh
    if FOG and not name.startswith('e_mist'):
        cd = N.new('ShaderNodeCameraData'); mr = N.new('ShaderNodeMapRange'); mr.clamp = True
        mr.inputs['From Min'].default_value = FOG['d0']; mr.inputs['From Max'].default_value = FOG['d1']
        Lk.new(cd.outputs['View Z Depth'], mr.inputs['Value'])
        pw = N.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = 1.4; Lk.new(mr.outputs['Result'], pw.inputs[0])
        fe = N.new('ShaderNodeEmission'); fe.inputs['Color'].default_value = (*[lin(c) for c in FOG['rgb']], 1); fe.inputs['Strength'].default_value = 1.0
        mix = N.new('ShaderNodeMixShader'); Lk.new(pw.outputs[0], mix.inputs['Fac']); Lk.new(sh.outputs[0], mix.inputs[1]); Lk.new(fe.outputs[0], mix.inputs[2])
        final = mix
    Lk.new(final.outputs[0], out.inputs['Surface'])
    MATS[key] = m; return m

def to_object(m, name):
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(v) for v in m.v], [], [list(f) for f in m.f])
    names = sorted(set(m.mi)); idx = {n: i for i, n in enumerate(names)}
    for n in names: me.materials.append(mat(n))
    for p, n in zip(me.polygons, m.mi): p.material_index = idx[n]; p.use_smooth = False
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free()
    me.validate(); me.update()
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob); return ob

# ------------------------------------------------------------------ render setup
for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
    try: scene.render.engine = eng; break
    except TypeError: pass
try: scene.view_settings.view_transform = 'Standard'
except TypeError: pass
try: scene.view_settings.look = 'None'
except TypeError: pass
scene.world = bpy.data.worlds.new('W'); scene.world.use_nodes = True
BG = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
try: scene.eevee.taa_render_samples = 24
except Exception: pass
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGBA'; scene.render.image_settings.color_depth = '8'
scene.render.filter_size = 1.0; scene.render.resolution_percentage = 100
cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam')); scene.collection.objects.link(cam); scene.camera = cam
cam.data.clip_start = .05; cam.data.clip_end = 400
key = bpy.data.objects.new('Key', bpy.data.lights.new('Key', 'SUN')); fill = bpy.data.objects.new('Fill', bpy.data.lights.new('Fill', 'SUN'))
for L in (key, fill): scene.collection.objects.link(L); L.parent = cam
key.rotation_euler = Vector((.62, -.62, -.48)).normalized().to_track_quat('-Z', 'Y').to_euler()
fill.rotation_euler = Vector((-.7, .2, -.6)).normalized().to_track_quat('-Z', 'Y').to_euler()

MANIFEST = []
def clear_scene(keep=('Cam', 'Key', 'Fill')):
    for ob in list(scene.objects):
        if ob.name not in keep: bpy.data.objects.remove(ob, do_unlink=True)
def ortho_render(name, obs, w, h, el=6.0, yaw=0.0, margin=.02, exact=False, key_e=.95, amb=.34, fill_e=.18, outs=None, style='sprite', colors=16, shadows=True):
    """front-ish orthographic render framed to the objects' projected bounds (exact=True: no margin, for 9-slices)"""
    scene.render.film_transparent = True
    BG.inputs[0].default_value = (1, .97, .92, 1); BG.inputs[1].default_value = amb
    key.hide_render = fill.hide_render = False; key.data.energy = key_e; fill.data.energy = fill_e; key.data.angle = math.radians(2)
    try: key.data.use_shadow = shadows
    except Exception: pass
    cam.data.type = 'ORTHO'
    for ob in obs:
        if yaw: ob.rotation_euler = (ob.rotation_euler.x, ob.rotation_euler.y, math.radians(yaw))
    e = math.radians(el); cam.location = Vector((0, -math.cos(e), math.sin(e))) * 60
    cam.rotation_euler = (-cam.location).to_track_quat('-Z', 'Y').to_euler(); bpy.context.view_layer.update()
    inv = cam.matrix_world.inverted(); dg = bpy.context.evaluated_depsgraph_get(); pts = []
    for ob in obs:
        ev = ob.evaluated_get(dg); me = ev.to_mesh(); pts += [inv @ (ob.matrix_world @ v.co) for v in me.vertices]; ev.to_mesh_clear()
    x0, x1 = min(p.x for p in pts), max(p.x for p in pts); y0, y1 = min(p.y for p in pts), max(p.y for p in pts)
    k = 1.0 if exact else 1 + 2 * margin
    xs, ys = (x1 - x0) * k, (y1 - y0) * k
    if exact: osc = max(xs, ys * w / h) if w >= h else max(ys, xs * h / w)
    else: osc = max(xs, ys * w / h) if w >= h else max(ys, xs * h / w)
    cam.data.ortho_scale = osc; cam.data.shift_x = (x0 + x1) / 2 / osc; cam.data.shift_y = (y0 + y1) / 2 / osc
    scene.render.resolution_x = w; scene.render.resolution_y = h
    out = RAW / (name + '.png'); scene.render.filepath = str(out); bpy.ops.render.render(write_still=True)
    print(TAG, name, w, 'x', h); return out
def fixed_ortho(name, w, h, cx, cz, span_h, el=0.0):
    """orthographic render with a fixed frame (animation frames that must line up)"""
    scene.render.film_transparent = True; cam.data.type = 'ORTHO'
    e = math.radians(el); cam.location = Vector((cx, -60 * math.cos(e), cz + 60 * math.sin(e)))
    cam.rotation_euler = Vector((0, math.cos(e), -math.sin(e))).to_track_quat('-Z', 'Y').to_euler()
    cam.data.ortho_scale = span_h * w / h if w >= h else span_h; cam.data.shift_x = cam.data.shift_y = 0
    scene.render.resolution_x = w; scene.render.resolution_y = h
    out = RAW / (name + '.png'); scene.render.filepath = str(out); bpy.ops.render.render(write_still=True); return out

# ================================================================== 1. the hall (background, dim + lit)
def brick_wall(m, origin, u, n, length, height, skip=None, bw=.92, bh=.38, gap=.05, depth=.34, seed=1, mats=('brick_a', 'brick_b', 'brick_c', 'brick_d')):
    """coursed bricks on a wall plane: origin = lower-left of the face, u = along the wall, n = face normal (toward the room)"""
    rng = random.Random(seed); o = Vector(origin); u = Vector(u); n = Vector(n); up = Vector((0, 0, 1))
    rows = int(height / bh + .5)
    for r in range(rows):
        off = (r % 2) * bw / 2 - bw / 2; s = off
        while s < length:
            a, b = max(0, s), min(length, s + bw)
            if b - a > .12:
                cu, cz = (a + b) / 2, r * bh + bh / 2
                if not (skip and skip(cu, cz)):
                    inset = rng.uniform(0, .05)
                    c = o + u * cu + up * cz + n * (-depth / 2 + depth / 2 - inset - .0)
                    hu = (b - a) / 2 - gap / 2; hz = bh / 2 - gap / 2; hd = depth / 2
                    he = Vector((abs(u.x) * hu + abs(n.x) * hd, abs(u.y) * hu + abs(n.y) * hd, hz))
                    m.hull(cbox(c - n * hd, he, .025), rng.choice(mats))
                    # mortar: a backing quad per laid cell, so skipped cells (openings) stay open
                    bk = o - n * (depth + .02); p0 = bk + u * a + up * (r * bh); du = u * (b - a); dz = up * bh
                    m.add([p0, p0 + du, p0 + du + dz, p0 + dz], [(0, 1, 2, 3)], ['mortar'])
            s += bw
def flagstones(m, x0, x1, y0, y1, size=1.5, seed=3):
    rng = random.Random(seed); y = y0; row = 0
    while y < y1:
        x = x0 - (row % 2) * size / 2
        while x < x1:
            w = size * rng.uniform(.8, 1.2)
            a, b = max(x, x0), min(x + w, x1)
            if b - a > .1:
                m.hull(cbox(((a + b) / 2, y + size / 2, -.05 + rng.uniform(-.02, .02)), ((b - a) / 2 - .04, size / 2 - .04, .05), .02), rng.choice(('flag_a', 'flag_b', 'flag_c')))
            x += w
        y += size; row += 1
    m.box(((x0 + x1) / 2, (y0 + y1) / 2, -.12), ((x1 - x0) / 2, (y1 - y0) / 2, .02), 'grout')
def arch_ring(m, cx, y, cz, r0, r1, n, depth, mat_='n_arch', key_scale=1.25):
    for k in range(n):
        a0 = math.pi * k / n + .012; a1 = math.pi * (k + 1) / n - .012
        ro = r1 * (key_scale if k == n // 2 else 1.0)
        pts = [Vector((cx + math.cos(a) * r, y + dy, cz + math.sin(a) * r)) for a in (a0, a1) for r in (r0, ro) for dy in (-depth / 2, depth / 2)]
        m.hull(pts, mat_)
def pillar(m, cx, cy, h=7.6, w=1.25):
    m.hull(cbox((cx, cy, .35), (w * .68, w * .68, .35), .06), 'n_pillar_dk')
    m.hull(cbox((cx, cy, .82), (w * .6, w * .6, .12), .04), 'n_pillar')
    m.hull(cbox((cx, cy, h / 2 + .5), (w / 2, w / 2, h / 2 - .5), .09), 'n_pillar')
    for sx in (-1, 1):   # vertical grooves on the front face
        m.box((cx + sx * w * .22, cy - w / 2 - .005, h / 2 + .5), (.05, .02, h / 2 - 1.2), 'groove')
    m.hull(cbox((cx, cy, h + .1), (w * .62, w * .62, .1), .04), 'n_pillar')
    m.hull(cbox((cx, cy, h + .42), (w * .72, w * .72, .24), .06), 'n_pillar_dk')
def build_hall():
    m = M()
    R, SP = 3.0, 4.2                       # the great arch: inner radius, spring height
    def skip_front(x, z): return abs(x) < R + .55 and (z < SP or x * x + (z - SP) ** 2 < (R + .62) ** 2)
    brick_wall(m, (-16, 0, 0), (1, 0, 0), (0, -1, 0), 32, 11, skip=lambda u, z: skip_front(u - 16, z), seed=1)
    arch_ring(m, 0, -.05, SP, R, R + .62, 15, .8)
    for sx in (-1, 1):                     # jamb blocks down the sides of the opening
        for k in range(6):
            z0 = k * SP / 6; m.hull(cbox((sx * (R + .31), -.05, z0 + SP / 12), (.31 - .02, .4, SP / 12 - .02), .03), 'n_arch' if k % 2 else 'n_pillar')
    for sx in (-1, 1): pillar(m, sx * (R + 1.35), -.9)
    # the corridor: brick side walls, a barrel vault, a lesser arch further in, then the mist
    L = 22
    for sx in (-1, 1):
        brick_wall(m, (sx * R, .35 if sx < 0 else L, 0), (0, 1 if sx < 0 else -1, 0), (-sx, 0, 0), L - .35, SP, seed=5 + sx, bw=1.0, bh=.42)
    rings = []
    for yy in [.35 + (L - .35) * j / 12 for j in range(13)]:
        rings.append([Vector((math.cos(a) * R, yy, SP + math.sin(a) * R)) for a in [math.pi * (1 - i / 12) for i in range(13)]])
    for j in range(12):
        for i in range(12):
            m.add([rings[j][i], rings[j][i + 1], rings[j + 1][i + 1], rings[j + 1][i]], [(0, 1, 2, 3)], ['vault'])
    for yy in (4.0, 8.0, 12.0): arch_ring(m, 0, yy, SP, R - .3, R, 11, .5, 'n_arch')
    def skip_far(x, z): return abs(x) < 2.2 and (z < 2.9 or x * x + (z - 2.9) ** 2 < 2.25 ** 2)
    brick_wall(m, (-R, 14.0, 0), (1, 0, 0), (0, -1, 0), 2 * R, SP + R, skip=lambda u, z: skip_far(u - R, z), seed=9, bw=.9, bh=.4)
    arch_ring(m, 0, 13.9, 2.9, 1.7, 2.2, 9, .5, 'n_arch')
    for sx in (-1, 1):
        for k in range(4):
            z0 = k * 2.9 / 4; m.hull(cbox((sx * 1.95, 13.9, z0 + 2.9 / 8), (.25 - .02, .25, 2.9 / 8 - .02), .03), 'n_arch' if k % 2 else 'n_pillar')
    m.add([Vector((-8, L + 1, -1)), Vector((8, L + 1, -1)), Vector((8, L + 1, 12)), Vector((-8, L + 1, 12))], [(0, 1, 2, 3)], ['e_mist'])
    flagstones(m, -16, 16, -12, 0, seed=3)
    flagstones(m, -R, R, 0, L + 1, size=1.3, seed=4)
    return to_object(m, 'hall')
def render_hall():
    global FOG
    FOG = {'rgb': (.64, .70, .64), 'd0': 13.0, 'd1': 34.0}
    ob = build_hall()
    scene.render.film_transparent = False
    BG.inputs[0].default_value = (.36, .41, .40, 1); BG.inputs[1].default_value = .34
    key.hide_render = True; fill.hide_render = True
    cam.data.type = 'PERSP'; cam.data.lens = 24; cam.data.sensor_width = 36; cam.data.shift_x = cam.data.shift_y = 0
    cam.location = Vector((0, -12.5, 2.6)); cam.rotation_euler = (Vector((0, 0, 3.6)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sun = bpy.data.objects.new('HallSun', bpy.data.lights.new('HallSun', 'SUN')); scene.collection.objects.link(sun)
    sun.data.energy = .7; sun.data.color = (.80, .88, .90); sun.data.angle = math.radians(12)
    sun.rotation_euler = Vector((.25, .9, -.55)).normalized().to_track_quat('-Z', 'Y').to_euler()
    mist = bpy.data.objects.new('MistLight', bpy.data.lights.new('MistLight', 'AREA')); scene.collection.objects.link(mist)
    mist.data.energy = 2600; mist.data.size = 5; mist.data.color = (.78, .88, .80); mist.location = (0, 17, 3.5)
    mist.rotation_euler = Vector((0, -1, -.15)).normalized().to_track_quat('-Z', 'Y').to_euler()
    fires = []
    for sx in (-1, 1):
        L = bpy.data.objects.new('Fire%d' % sx, bpy.data.lights.new('Fire%d' % sx, 'POINT')); scene.collection.objects.link(L)
        L.location = (sx * 6.4, -4.0, 3.2); L.data.color = (1.0, .55, .22); L.data.shadow_soft_size = .4; fires.append(L)
    scene.render.resolution_x, scene.render.resolution_y = 1536, 864
    outs = {}
    for variant, power in (('dim', 110), ('lit', 720)):
        for L in fires: L.data.energy = power
        out = RAW / ('hall_%s.png' % variant); scene.render.filepath = str(out); bpy.ops.render.render(write_still=True); outs[variant] = out.name
        print(TAG, 'hall', variant)
    FOG = None
    for o in (ob, sun, mist, *fires): bpy.data.objects.remove(o, do_unlink=True)
    MANIFEST.append({'name': 'hall', 'raw': outs, 'kind': 'background', 'out': {'w': 768, 'h': 432}, 'files': {'dim': 'login/hall_dim.png', 'lit': 'login/hall_lit.png'}})

# ================================================================== 2. the brazier and its fire
def build_brazier():
    m = M()
    m.lathe([(.46, 0), (.46, .05), (.36, .1), (.24, .16), (.14, .24), (.11, .34)], 14, 'iron', cap0='iron_dk')
    m.cyl((0, 0, .3), (0, 0, 1.62), .05, 'iron_dk', n=8)
    for k in range(3):                     # three rods twisted round the core
        ph = TAU * k / 3; pts = [(math.cos(ph + t * TAU * 2.6) * .085, math.sin(ph + t * TAU * 2.6) * .085, .34 + t * 1.24) for t in [i / 40 for i in range(41)]]
        m.ptube(pts, .034, 5, 'iron')
    for z in (.36, .98, 1.58): m.lathe([(.13, z - .045), (.15, z), (.13, z + .045)], 12, 'steel')
    m.lathe([(.1, 1.6), (.22, 1.66), (.48, 1.8), (.64, 1.97), (.7, 2.02), (.66, 2.05)], 16, lambda j, i: 'iron' if j % 2 == 0 else 'iron_dk', cap1='coal')
    m.ptube([(math.cos(a) * .7, math.sin(a) * .7, 2.03) for a in [TAU * i / 20 for i in range(20)]], .035, 5, 'steel', closed=True)
    for a in [TAU * i / 8 for i in range(8)]: m.sph((math.cos(a) * .7, math.sin(a) * .7 - .01, 2.03), .04, 'iron_dk', 5, 3)
    rng = random.Random(5)
    for i in range(9):                     # glowing coals heaped in the bowl
        x, y = rng.uniform(-.45, .45), rng.uniform(-.3, .2)
        m.hull(blob((x, y, 2.07), (.11, .1, .06), 40 + i, n=9, cuts=1), 'e_ember' if i % 3 else 'coal')
    return m
def flame_frame(m, f, nf=8):
    """one frame of a looping fire, centred on the bowl: tongues spread evenly either side of the middle (the tallest at
    the centre), heights, sway and width breathe on a period of nf frames; neighbouring tongues sway in opposite phase so
    the fire as a whole stays upright over the coals"""
    rng = random.Random(11); n = 11
    specs = []
    for i in range(n):
        u = i / (n - 1) * 2 - 1                                   # -1 .. 1 across the bowl
        specs.append((u * .5 + rng.uniform(-.04, .04), (1.75 - .85 * abs(u)) * rng.uniform(.88, 1.08), rng.uniform(.17, .24),
                      (i % 2) * .5 + rng.uniform(-.08, .08), rng.uniform(.8, 1.3)))
    specs.sort(key=lambda sp: -sp[1])
    t = f / nf
    for layer, (col, ks, dy) in enumerate((('e_fire_dk', 1.0, .0), ('e_fire', .74, -.06), ('e_fire_core', .45, -.12))):
        for i, (x0, h, w, ph, fr) in enumerate(specs):
            if layer == 2 and i % 2: continue
            hh = h * ks * (1 + .16 * math.sin(TAU * (t * fr + ph)))
            pts = []; rr = []
            for j in range(7):
                u = j / 6; sway = .11 * math.sin(TAU * (t + ph + u * .6)) * u
                pts.append((x0 * (1 - u * .55) * (1 if layer == 0 else .8) + sway, dy, 2.02 + u * hh)); rr.append(max(.008, w * ks * (1 - u) ** .7 * (1.25 if layer == 0 else 1.15)))
            m.ptube(pts, rr, 7, col, up=(0, 1, 0), flat=.35, cap0=col, cap1=col)   # flattened in depth, full width
    for k in range(3):                     # sparks rising straight up the middle
        u = (t + k / 3) % 1; x = .22 * math.sin(TAU * (k * .37 + u * .5)); m.box((x, -.15, 2.3 + u * 1.9), (.025, .02, .025), 'e_fire_core')
def render_brazier():
    # brazier and fire share one scale (50 px per unit at 1x): brazier frame x -0.8..0.8, z -0.05..2.19; fire frame
    # x -0.8..0.8, z 1.95..4.19, so in the page the fire box sits on the brazier box overlapping it by 12 px (1x)
    ob = to_object(build_brazier(), 'brazier')
    key.hide_render = fill.hide_render = False; key.data.energy = .95; fill.data.energy = .18; BG.inputs[0].default_value = (1, .97, .92, 1); BG.inputs[1].default_value = .3
    fixed_ortho('brazier', 480, 672, 0, 1.07, 2.24, el=0)
    bpy.data.objects.remove(ob, do_unlink=True)
    MANIFEST.append({'name': 'brazier', 'raw': 'brazier.png', 'kind': 'fixed', 'out': {'w': 120, 'h': 168}, 'file': 'login/brazier.png', 'colors': 22, 'outline': True})
    # fire: 8 frames with one fixed frame so they line up; the frame's bottom edge is the bowl rim
    raws = []
    for f in range(8):
        m = M(); flame_frame(m, f); ob = to_object(m, 'flame%d' % f)
        raws.append(fixed_ortho('flame_%d' % f, 480, 672, 0, 3.07, 2.24, el=0).name)
        bpy.data.objects.remove(ob, do_unlink=True)
    MANIFEST.append({'name': 'flame', 'raw': raws, 'kind': 'sheet', 'out': {'w': 120, 'h': 168}, 'file': 'login/flame_sheet.png', 'colors': 12, 'centre': True})

# ================================================================== 3. the title: CRAFTED REALM on engraved stone slabs
def text_mesh(ch, size, depth):
    cu = bpy.data.curves.new('t', 'FONT'); cu.body = ch; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'; cu.size = size
    if TITLE_FONT: cu.font = bpy.data.fonts.load(TITLE_FONT, check_existing=True)
    cu.extrude = depth; cu.resolution_u = 2
    ob = bpy.data.objects.new('t', cu); scene.collection.objects.link(ob); ob.rotation_euler = (math.radians(90), 0, 0)
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg)); mw = ob.matrix_world.copy()
    bpy.data.objects.remove(ob, do_unlink=True); me.transform(mw); return me
def slab_letter(ch, c, scale, tilt, seed):
    m = M(); rng = random.Random(seed)
    w, h, d = .86 * scale, .92 * scale, .42 * scale
    m.hull(blob((0, 0, 0), (w / 2, d / 2, h / 2), seed, n=34, cuts=3, jit=(.9, 1.04)), 'n_slab')
    slab = to_object(m, 'slab_' + ch)
    me = text_mesh(ch, .7 * scale, .06)
    cut = bpy.data.objects.new('cut', me); scene.collection.objects.link(cut)
    near = [v.co.y for v in slab.data.vertices if abs(v.co.x) < w * .35 and abs(v.co.z) < h * .35] or [v.co.y for v in slab.data.vertices]
    front = min(near)
    cut.location = (0, front + .02, -.02 * scale); cut.data.materials.append(mat('ink'))
    bpy.context.view_layer.update()
    mod = slab.modifiers.new('carve', 'BOOLEAN'); mod.operation = 'DIFFERENCE'; mod.object = cut
    try: mod.solver = 'EXACT'
    except Exception: pass
    try: mod.material_mode = 'TRANSFER'
    except Exception: pass
    dg = bpy.context.evaluated_depsgraph_get(); new = bpy.data.meshes.new_from_object(slab.evaluated_get(dg))
    slab.modifiers.clear(); slab.data = new
    for p in slab.data.polygons: p.use_smooth = False
    bpy.data.objects.remove(cut, do_unlink=True)
    slab.location = c; slab.rotation_euler = (0, math.radians(tilt), math.radians(rng.uniform(-6, 6)))
    return slab
def emblem_hammer(c, s=1.0, rot=(0, -28, -18)):
    m = M()
    m.cyl((0, 0, -.62), (0, 0, .4), .06, 'wood', n=6, caps='wood_dk')
    m.box((0, 0, -.55), (.075, .075, .12), 'wood_dk')
    m.hull(cbox((0, 0, .5), (.34, .14, .14), .04), lambda n, cc: 'helm' if n.z > .5 else 'steel')
    m.hull(cbox((.36, 0, .5), (.05, .16, .16), .02), 'helm')
    m.hull([Vector((-.34, y, .5 + z)) for y in (-.12, .12) for z in (-.12, .12)] + [Vector((-.56, 0, .5))], 'steel')
    ob = to_object(m, 'hammer'); ob.location = c; ob.scale = (s, s, s); ob.rotation_euler = tuple(math.radians(v) for v in rot); return ob
def emblem_sword(c, s=1.0, rot=(0, 0, 0)):
    """a plain arming sword: diamond-section blade, a straight crossguard, a leather grip and a round pommel"""
    m = M(); L = 1.9; w = .085; t = .03; z0 = .32
    m.hull([Vector((x, y, z)) for x in (-w, w) for y in (-t * .2, t * .2) for z in (z0, L - .2)] + [Vector((0, -t, z)) for z in (z0, L - .2)] +
           [Vector((0, t, z)) for z in (z0, L - .2)] + [Vector((0, 0, L))], lambda n, cc: 'helm' if n.x * .6 + n.z * .3 - n.y > 0 else 'steel')
    m.box((0, 0, z0 - .03), (.3, .05, .045), 'iron', .015)
    m.cyl((0, 0, .08), (0, 0, z0 - .06), .045, 'wood_dk', n=6)
    m.sph((0, 0, .05), .07, 'iron', 8, 4)
    ob = to_object(m, 'sword'); ob.location = c; ob.scale = (s, s, s); ob.rotation_euler = tuple(math.radians(v) for v in rot); return ob
def emblem_helm(c, s=1.0):
    """a plain round-topped helm with a nasal bar, cheek plates and a riveted brow band (our own design)"""
    m = M()
    m.hull(ell((0, 0, .1), (.42, .4, .5), 14, 7, floor=.1), lambda n, cc: 'helm' if n.z > .2 else 'steel')
    m.lathe([(.43, .02), (.44, .12), (.43, .22)], 16, 'iron')
    for a in [math.pi * (1.2 + .15 * k) for k in range(5)]:
        m.sph((math.cos(a) * .44, math.sin(a) * .44, .12), .03, 'steel', 5, 3)
    m.hull(cbox((0, -.43, -.12), (.055, .04, .26), .02), 'iron')
    for sx in (-1, 1):
        m.hull([Vector((sx * x, y, z)) for x in (.18, .4) for y in (-.36, -.22) for z in (-.02, .1)] + [Vector((sx * .3, -.28, -.46)), Vector((sx * .38, -.2, -.44))], 'n_rim')
        m.box((sx * .2, -.39, .0), (.12, .02, .03), 'ink')
    m.hull(cbox((0, 0, .62), (.05, .3, .05), .02), 'iron')
    ob = to_object(m, 'helm'); ob.location = c; ob.scale = (s, s, s); return ob
def carve(target, cutters, mat_name='cut', tolerant=True):
    """boolean-subtract each cutter mesh from target in turn (EXACT solver); the cut faces take mat_name.
    tolerant=False tries the strict solve first (it keeps letter counters) and falls back to the hole-tolerant one when
    the strict solve makes no cut; a cut that would empty the target (a bad cutter) is skipped and reported."""
    for me in cutters:
        bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free()
        me.materials.clear(); me.materials.append(mat(mat_name))
        for poly in me.polygons: poly.material_index = 0
        cut = bpy.data.objects.new('cutter', me); scene.collection.objects.link(cut); bpy.context.view_layer.update()
        n0 = len(target.data.vertices)
        for tol in ((False, True) if not tolerant else (True,)):
            md = target.modifiers.new('carve', 'BOOLEAN'); md.operation = 'DIFFERENCE'; md.object = cut
            try: md.solver = 'EXACT'
            except Exception: pass
            for k, v in (('use_hole_tolerant', tol), ('use_self', tol), ('material_mode', 'TRANSFER')):
                try: setattr(md, k, v)
                except Exception: pass
            dg = bpy.context.evaluated_depsgraph_get(); new = bpy.data.meshes.new_from_object(target.evaluated_get(dg))
            target.modifiers.clear()
            if len(new.vertices) >= n0 * .5 and len(new.vertices) != n0: target.data = new; break
            bpy.data.meshes.remove(new)
        else:
            print(TAG, 'carve: a cutter made no usable cut')
        bpy.data.objects.remove(cut, do_unlink=True)
    for poly in target.data.polygons: poly.use_smooth = False
def lintel(text='CRAFTED REALM', L=9.2, H=1.34, D=.7, seed=31):
    """one long dressed-stone lintel: a slightly irregular beam with chamfered, chipped arrises, an incised border and the
    name cut deep into its face"""
    rng = random.Random(seed); m = M()
    pts = []
    for sx in (-1, 1):
        for sz in (-1, 1):
            for sy in (-1, 1):
                x, z, y = sx * L / 2, sz * H / 2, sy * D / 2
                ch = rng.uniform(.05, .1)
                pts += [Vector((x - sx * ch, y, z)), Vector((x, y - sy * ch, z)), Vector((x, y, z - sz * ch))]
    for k in range(9):                    # the long top and bottom arrises wander a little: hand-dressed, not machined
        x = -L / 2 + L * (k + .5) / 9
        for sz in (-1, 1): pts.append(Vector((x, -D / 2 + .04, sz * (H / 2 + rng.uniform(-.015, .02)))))
    m.hull(pts, 'n_lintel')
    beam = to_object(m, 'lintel')
    front = -D / 2
    cutters = []
    # the letters, one cutter each (overlapping glyphs in one mesh confuse the solver), laid out by their own widths
    glyphs = []; x = 0.0; gap = .045
    for ch in text:
        if ch == ' ': x += .24; continue
        tm = text_mesh(ch, .74, .5); xs = [v.co.x for v in tm.vertices]
        tm.transform(Matrix.Translation((x - min(xs), 0, 0))); x += (max(xs) - min(xs)) + gap; glyphs.append(tm)
    width = x - gap; zs = [v.co.z for tm in glyphs for v in tm.vertices]
    k = min((L - 1.1) / width, (H * .62) / (max(zs) - min(zs))); zc = (max(zs) + min(zs)) / 2
    for tm in glyphs:
        tm.transform(Matrix.Translation((0, front - .41, -.02)) @ Matrix.Scale(k, 4) @ Matrix.Translation((-width / 2, 0, -zc)))
    letters = len(glyphs); cutters += glyphs
    # the incised border: a thin groove ring inset from the edges
    bm = bmesh.new()
    def slab(x0, x1, z0, z1):
        v = [bm.verts.new((x, y, z)) for x in (x0, x1) for y in (front - .2, front + .035) for z in (z0, z1)]
        bmesh.ops.convex_hull(bm, input=v)
    bx, bz, g = L / 2 - .2, H / 2 - .16, .028
    for x0, x1, z0, z1 in ((-bx, bx, bz - g, bz), (-bx, bx, -bz, -bz + g), (-bx, -bx + g, -bz, bz), (bx - g, bx, -bz, bz)): slab(x0, x1, z0, z1)
    bme = bpy.data.meshes.new('border'); bm.to_mesh(bme); bm.free(); cutters.append(bme)
    for i in range(14):                    # chips knocked out of the front arrises and corners
        side = rng.choice(('top', 'top', 'end'))       # (chips on the underside only read as dark dashes in shadow)
        if side == 'end': c = (rng.choice((-1, 1)) * L / 2, front + .05, rng.uniform(-H / 2, H / 2))
        else: c = (rng.uniform(-L / 2 + .3, L / 2 - .3), front + .03, (H / 2 + .03 if side == 'top' else -H / 2 - .03))
        r = rng.uniform(.07, .15)
        bmc = bmesh.new()
        for p in blob(c, (r, r * .8, r * .9), 500 + i, n=12, cuts=1): bmc.verts.new(p)
        bmesh.ops.convex_hull(bmc, input=list(bmc.verts)); cme = bpy.data.meshes.new('chip'); bmc.to_mesh(cme); bmc.free(); cutters.append(cme)
    nv0 = len(beam.data.vertices); carve(beam, cutters[:letters], 'cut', tolerant=False); carve(beam, cutters[letters:letters + 1], 'cut'); carve(beam, cutters[letters + 1:], 'chip'); print(TAG, 'lintel carve', nv0, '->', len(beam.data.vertices), 'verts', len(cutters), 'cutters')
    for me in cutters: bpy.data.meshes.remove(me)
    return beam
def keystone(c, W0=1.0, W1=1.35, Hk=1.25, D=.72, ch=.07):
    """a tapered keystone, wider at the top, with chamfered edges"""
    m = M(); x, y, z = c; pts = []
    for sz in (-1, 1):
        hw = (W1 if sz > 0 else W0) / 2
        for sx in (-1, 1):
            for sy in (-1, 1):
                X, Y, Z = x + sx * hw, y + sy * D / 2, z + sz * Hk / 2
                pts += [Vector((X - sx * ch, Y, Z)), Vector((X, Y - sy * ch, Z)), Vector((X, Y, Z - sz * ch))]
    m.hull(pts, 'n_key')
    return to_object(m, 'keystone')
def render_logo():
    H = 1.34; obs = [lintel(H=H)]
    Hk = 1.5; kz = H / 2 + Hk / 2 - .16               # the keystone stands on the lintel's centre, its foot let into the top
    obs.append(keystone((0, -.02, kz), W0=1.25, W1=1.65, Hk=Hk, D=.8))
    c = Vector((0, 0, kz + .2))                       # the crossing point, behind the helm
    a = math.radians(42); ss = 1.38
    d = Vector((math.sin(a), 0, math.cos(a)))        # sword: pommel lower-left, point upper-right
    obs.append(emblem_sword(tuple(c - d * .95 * ss + Vector((0, -.55, 0))), ss, rot=(0, 42, 0)))
    d2 = Vector((-math.sin(a), 0, math.cos(a)))      # hammer: haft lower-right, head upper-left
    obs.append(emblem_hammer(tuple(c + d2 * .07 + Vector((0, -.62, 0))), 1.45, rot=(0, -42, 0)))
    obs.append(emblem_helm((0, -1.02, kz + .1), 1.12))
    ortho_render('logo', obs, 1600, 600, el=9, yaw=0, key_e=1.0, amb=.32, shadows=False)
    for o in obs: bpy.data.objects.remove(o, do_unlink=True)
    MANIFEST.append({'name': 'logo', 'raw': 'logo.png', 'kind': 'sprite', 'out': {'w': 400, 'h': 150}, 'file': 'login/logo.png', 'colors': 30})

# ================================================================== 4. the carved-slate panel and stone buttons (9-slices)
def rounded_path(W, H, r, seg=6):
    pts = []
    for cx, cz, a0 in ((W / 2 - r, -H / 2 + r, -math.pi / 2), (W / 2 - r, H / 2 - r, 0), (-W / 2 + r, H / 2 - r, math.pi / 2), (-W / 2 + r, -H / 2 + r, math.pi)):
        for k in range(seg + 1):
            a = a0 + math.pi / 2 * k / seg; pts.append((Vector((cx + r * math.cos(a), cz + r * math.sin(a))), Vector((math.cos(a), math.sin(a)))))
    return pts
def framed_plate(W, H, r, rim, lift, rim_mat, face_mat, groove=True, profile=None):
    """a rounded rectangle plate facing the camera (-Y) with a raised, bevelled rim swept round it"""
    m = M(); path = rounded_path(W, H, r)
    prof = profile or [(0, 0), (-.08, .45), (-.22, .85), (-.45, 1.0), (-.7, .88), (-.9, .5), (-1.0, .12)]
    rings = []
    for off, hh in prof:
        rings.append([Vector((p.x + n.x * off * rim, -hh * lift, p.y + n.y * off * rim)) for p, n in path])
    m.loft(rings, rim_mat, closed=False)
    inner = [(p.x + n.x * -rim, p.y + n.y * -rim) for p, n in path]
    if groove:
        g = [(p.x + n.x * -(rim + rim * .12), p.y + n.y * -(rim + rim * .12)) for p, n in path]
        m.ext(inner, lift * .06, 'rim_groove', y=.0)
        m.ext(g, lift * .08, face_mat, y=-lift * .02)
    else:
        m.ext(inner, lift * .08, face_mat, y=-lift * .02)
    m.add([Vector((p.x, .001, p.y)) for p, n in path][::-1], [tuple(range(len(path)))], [rim_mat])
    return m
def render_panel():
    ob = to_object(framed_plate(2.08, 1.76, .3, .2, .12, 'n_rim', 'v_marble'), 'panel')
    ortho_render('panel', [ob], 832, 704, el=0, exact=True, key_e=1.05, amb=.3)
    bpy.data.objects.remove(ob, do_unlink=True)
    MANIFEST.append({'name': 'panel', 'raw': 'panel.png', 'kind': 'nine', 'out': {'w': 208, 'h': 176}, 'file': 'login/panel.png', 'colors': 28})
    for nm, face, rimm in (('btn', 'btn_face', 'btn_rim'), ('btn_hover', 'btn_face_hi', 'btn_rim'), ('btn_red', 'btn_face_red', 'btn_rim_red'),
                           ('btn_red_hover', 'btn_face_red_hi', 'btn_rim_red'), ('btn_off', 'btn_face_off', 'btn_rim_off')):
        ob = to_object(framed_plate(.96, .3, .07, .055, .035, rimm, face, groove=False, profile=[(0, 0), (-.2, .8), (-.5, 1.0), (-.8, .75), (-1.0, .2)]), nm)
        ortho_render(nm, [ob], 768, 240, el=0, exact=True, key_e=1.05, amb=.32)
        bpy.data.objects.remove(ob, do_unlink=True)
        MANIFEST.append({'name': nm, 'raw': nm + '.png', 'kind': 'nine', 'out': {'w': 96, 'h': 30}, 'file': 'login/%s.png' % nm, 'colors': 10})

STEPS = {'hall': render_hall, 'brazier': render_brazier, 'logo': render_logo, 'panel': render_panel}
for k, fn in STEPS.items():
    if ONLY and k not in ONLY and not (k == 'brazier' and 'flame' in ONLY): continue
    fn()
mp = RAW / 'manifest.json'
old = json.loads(mp.read_text()) if mp.exists() and ONLY else []
names = {e['name'] for e in MANIFEST}
mp.write_text(json.dumps([e for e in old if e['name'] not in names] + MANIFEST, indent=1))
print(TAG, 'DONE', [e['name'] for e in MANIFEST])
