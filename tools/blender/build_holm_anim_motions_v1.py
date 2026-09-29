"""Holm animation pass motions v1 (2026-09-29, finish goal M6.4): Blender-authored motion curves for things on Tutor's Holm
that move but whose model cannot carry a new clip of its own. The island's building models are hash-bound to their measured
navigation graphs (a changed byte would orphan the graph), and the teaching oak is the shared tree-family model, so the
motion is authored here, in Blender, on animated empties, and the runtime (src/holm_island_anim.js) applies each empty's
transform to the real part every frame. Nothing here is geometry; every root is a named Empty.

Roots (one per motion; the runtime clones by root name) and their clips (exact glTF animation names):
  tree-fall       child tree-fall_Pivot       Fall      2.2 s  a felled oak: a creak, the topple (gravity), a bounce on the
                                                               ground, lie still, then sink away (the stump stays). Tips
                                                               toward glTF +Z; the runtime yaws the root away from the player.
  ferry-castoff   child ferry-castoff_Boat    CastOff   5.0 s  Tobin's skiff pushes off the pier (east) and pulls out to the
                  child ferry-castoff_Plank                     open sea (north, glTF -Z) with a bob and a roll; the plank
                                                               slides aboard first. Offsets in the haven's (world) axes.
  bell-swing      child bell-swing_Bell       Swing     2.4 s  the ferry bell: struck, swings and dies away (about glTF X).
  rope-drop       child rope-drop_Rope        Drop      0.8 s  the tied rope pays out down the shaft (scale glTF Y from the
                                                               knot, a little overshoot).
  door-swing      child door-swing_Leaf       Open      0.6 s  a door leaf swings open 90 deg about glTF Y with a small
                                              Close     0.6 s  overshoot / swings shut and knocks on the latch. The runtime
                                                               reads angle / 90 deg as the door's open fraction.
  bellows-pump    child bellows-pump_Board    Pump      0.8 s  the furnace bellows squash and fill again (scale glTF Y), looped
                                                               while the adventurer smelts.
  flame-flicker   child flame-flicker_Flame   Flicker   1.2 s  a torch flame's flicker (scale + a small lean), looped with a
                                                               per-torch time offset.
Stepped like the 2004 client where it stepped: the character-like motions (tree, bell, rope, doors, bellows, flame) hold
each pose for two frames (15 poses a second); the boat glides smoothly (a boat on water never stepped).

Usage: "C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe" -b --python tools/blender/build_holm_anim_motions_v1.py
Outputs .studio-workspaces/holm-anim-motions-v1/candidates/{motions.glb, motions.blend, manifest.json, REPORT.md}.
Conventions as tools/blender/build_holm_props_v4.py: Blender Z-up exported as glTF Y-up, 1 unit = 1 tile, clips on NLA
tracks named with the exact clip name (NLA_TRACKS export), sampled at 30 fps, roots never animated. Deterministic.
"""
import bpy, math, json, struct, hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.studio-workspaces/holm-anim-motions-v1/candidates'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
TAG = '[HOLM_ANIM_MOTIONS_V1]'
FPS = 30
scene = bpy.context.scene
scene.render.fps = FPS; scene.render.fps_base = 1.0
D = math.radians

ROOTS, OBJS, CLIPS = {}, {}, {}
def new_root(name):
    e = bpy.data.objects.new(name, None); e.empty_display_type = 'ARROWS'; e.empty_display_size = .5
    scene.collection.objects.link(e); ROOTS[name] = e; return e
def child(root, name):
    e = bpy.data.objects.new(name, None); e.empty_display_type = 'PLAIN_AXES'; e.empty_display_size = .3
    scene.collection.objects.link(e); e.parent = root; e.rotation_mode = 'XYZ'; OBJS[name] = e; return e

def fcurves_of(act):
    try: return list(act.fcurves)
    except Exception:
        out = []
        for layer in act.layers:
            for st in layer.strips:
                for cb in st.channelbags: out += list(cb.fcurves)
        return out
def clip(name, root, seconds, loop, desc):
    CLIPS.setdefault(name + '|' + root, {'name': name, 'root': root, 'frames': round(seconds * FPS), 'loop': loop, 'desc': desc, 'tracks': []})
    return round(seconds * FPS)
def bake(name, root, ob, fn, stepped):
    """Key ob at every frame with fn(t seconds) -> {data_path: value}; stepped holds each pose for two frames."""
    c = CLIPS[name + '|' + root]; ad = ob.animation_data_create(); ad.action = None
    for f in range(c['frames'] + 1):
        fs = f - (f % 2) if stepped and f < c['frames'] else f
        vals = fn(fs / FPS)
        for path, val in vals.items():
            setattr(ob, path, val); ob.keyframe_insert(data_path=path, frame=f)
    act = ad.action; act.name = name + '|' + ob.name
    for fc in fcurves_of(act):
        for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
    act.use_fake_user = True
    tr = ad.nla_tracks.new(); tr.name = name; tr.strips.new(name, 0, act); ad.action = None
    c['tracks'].append((ob.name, act.name))
    ob.location = (0, 0, 0); ob.rotation_euler = (0, 0, 0); ob.scale = (1, 1, 1)

def keys(pts, t, ease=None):
    """piecewise interpolation over [(t, v), ...]; ease(u) shapes each segment (default linear)"""
    if t <= pts[0][0]: return pts[0][1]
    for (t0, a), (t1, b) in zip(pts, pts[1:]):
        if t <= t1:
            u = (t - t0) / max(1e-9, t1 - t0); u = ease(u) if ease else u
            return a + (b - a) * u
    return pts[-1][1]
smooth = lambda u: u * u * (3 - 2 * u)

# ================================================================ tree-fall
R = new_root('tree-fall'); P = child(R, 'tree-fall_Pivot')
clip('Fall', 'tree-fall', 2.2, False, 'felled oak: creak, topple toward +Z (gravity), bounce, lie, sink; stepped 15/s')
def tree_fall(t):
    if t < .27:                      # the creak: a small lean and a settle-back, twice
        a = keys([(0, 0), (.1, 3.5), (.17, 1.5), (.27, 5)], t)
    elif t < 1.0:                    # the fall: angle grows with the square of time (gravity), ground at 90 deg
        u = (t - .27) / .73; a = 5 + 85 * u * u
    else:                            # the bounce on the ground and the settle
        a = keys([(1.0, 90), (1.1, 82), (1.2, 90), (1.27, 87.5), (1.33, 90)], t)
    sink = 0 if t < 1.8 else -.9 * smooth(min(1, (t - 1.8) / .4))
    return {'rotation_euler': (D(a), 0, 0), 'location': (0, 0, sink)}
bake('Fall', 'tree-fall', P, tree_fall, True)

# ================================================================ ferry-castoff (offsets in the haven / world axes)
R = new_root('ferry-castoff'); B = child(R, 'ferry-castoff_Boat'); PL = child(R, 'ferry-castoff_Plank')
clip('CastOff', 'ferry-castoff', 5.0, False, 'the skiff pushes off east, then pulls out north to the open sea; plank slides aboard first')
def boat(t):
    east = .45 * smooth(min(1, t / 1.0))                                   # Tobin's shove off the pier
    u = max(0., t - .8); north = .55 * u * u if u < 1.6 else .55 * 2.56 + 1.76 * (u - 1.6)   # pulls away: eases up to 1.76 tiles/s
    bob = .05 * math.sin(t * 2 * math.pi / 1.6) + (.035 * math.sin(math.pi * min(1, t / .5)) if t < .5 else 0)
    roll = D(3.2) * math.sin(t * 2 * math.pi / 1.6 + .6) * min(1, t / .6)   # a rocking roll about the keel (Blender Y = glTF -Z)
    pitch = D(1.4) * math.sin(t * 2 * math.pi / 1.1)                       # the bow lifts a little on each stroke
    yaw = D(-4) * smooth(min(1, t / 1.2)) + D(4) * smooth(min(1, max(0, t - 1.2) / 1.6))   # bow swings off the pier, then straightens
    return {'location': (east, north, bob), 'rotation_euler': (pitch, roll, yaw)}
bake('CastOff', 'ferry-castoff', B, boat, False)
def plank(t):
    k = smooth(min(1, t / .5))
    return {'location': (.5 * k, 0, .12 * math.sin(math.pi * k))}
bake('CastOff', 'ferry-castoff', PL, plank, False)

# ================================================================ bell-swing
R = new_root('bell-swing'); BL = child(R, 'bell-swing_Bell')
clip('Swing', 'bell-swing', 2.4, False, 'the ferry bell rung three times and dying away; about glTF X from its hanging point; stepped 15/s')
def bell(t):
    a = 30 * math.exp(-1.25 * t) * math.sin(2 * math.pi * t / .72) if t < 2.3 else 0
    return {'rotation_euler': (D(a), 0, 0)}
bake('Swing', 'bell-swing', BL, bell, True)

# ================================================================ rope-drop
R = new_root('rope-drop'); RP = child(R, 'rope-drop_Rope')
clip('Drop', 'rope-drop', 0.8, False, 'the tied rope pays out down the shaft: scale glTF Y from the knot 0.04 -> 1.06 -> 1; stepped 15/s')
def rope(t):
    s = keys([(0, .04), (.08, .12), (.55, 1.06), (.68, .97), (.8, 1.0)], t, smooth)
    return {'scale': (1, 1, s)}
bake('Drop', 'rope-drop', RP, rope, True)

# ================================================================ door-swing
R = new_root('door-swing'); LF = child(R, 'door-swing_Leaf')
clip('Open', 'door-swing', 0.6, False, 'a door swings open: 0 -> 94 -> 90 deg about glTF Y; stepped 15/s')
clip('Close', 'door-swing', 0.6, False, 'a door swings shut: 90 -> 0 deg, a knock on the latch (4 deg rebound); stepped 15/s')
bake('Open', 'door-swing', LF, lambda t: {'rotation_euler': (0, 0, D(keys([(0, 0), (.13, 20), (.27, 52), (.4, 80), (.47, 94), (.6, 90)], t, smooth)))}, True)
bake('Close', 'door-swing', LF, lambda t: {'rotation_euler': (0, 0, D(keys([(0, 90), (.13, 72), (.27, 40), (.4, 0), (.47, 4.5), (.6, 0)], t, smooth)))}, True)

# ================================================================ bellows-pump
R = new_root('bellows-pump'); BW = child(R, 'bellows-pump_Board')
clip('Pump', 'bellows-pump', 0.8, True, 'the bellows squash (0.7) and fill again, scale glTF Y from the base; loops; stepped 15/s')
bake('Pump', 'bellows-pump', BW, lambda t: {'scale': (1 + .06 * math.sin(math.pi * min(1, t / .27)) * (t < .27), 1, keys([(0, 1), (.2, .7), (.27, .7), (.8, 1)], t, smooth))}, True)

# ================================================================ flame-flicker
R = new_root('flame-flicker'); FL = child(R, 'flame-flicker_Flame')
clip('Flicker', 'flame-flicker', 1.2, True, 'a torch flame: height 0.82-1.16, width 0.9-1.08, a small lean; loops; stepped 15/s')
def flame(t):
    w = 2 * math.pi * t / 1.2
    h = 1 + .1 * math.sin(w * 2) + .06 * math.sin(w * 5 + 1.3) + .04 * math.sin(w * 3 + .4)
    s = 1 - .04 * math.sin(w * 2 + .8) + .03 * math.sin(w * 4)
    return {'scale': (s, s, h), 'rotation_euler': (D(4) * math.sin(w + .5), D(3) * math.sin(w * 2 + 2), 0)}
bake('Flicker', 'flame-flicker', FL, flame, True)

# ================================================================ export + verify
bpy.ops.object.select_all(action='DESELECT')
for o in list(ROOTS.values()) + list(OBJS.values()): o.select_set(True)
glb = OUT / 'motions.glb'
bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
                          export_materials='NONE', export_animations=True, export_animation_mode='NLA_TRACKS',
                          export_force_sampling=True, export_frame_step=1, export_anim_slide_to_zero=True,
                          export_optimize_animation_size=False, export_morph=False, export_skins=False)
raw = glb.read_bytes(); jslen = struct.unpack_from('<I', raw, 12)[0]; doc = json.loads(raw[20:20 + jslen])
sha = hashlib.sha256(raw).hexdigest(); nodes = doc['nodes']
top = {nodes[i]['name']: i for i in doc['scenes'][0]['nodes']}
owner = {}
def walk(ni, root):
    owner[ni] = root
    for c in nodes[ni].get('children', []): walk(c, root)
for nm, ni in top.items(): walk(ni, nm)
assert set(top) == set(ROOTS), (sorted(top), sorted(ROOTS))
for nm, ni in top.items():
    nd = nodes[ni]; assert not nd.get('translation') and not nd.get('rotation') and not nd.get('scale'), ('root must stay identity', nd)
glb_clips = {}
for an in doc.get('animations', []):
    dur = max(doc['accessors'][s['input']]['max'][0] for s in an['samplers'])
    rts = sorted({owner[ch['target']['node']] for ch in an['channels']})
    tg = sorted({(nodes[ch['target']['node']]['name'], ch['target']['path']) for ch in an['channels']})
    glb_clips.setdefault(an['name'], []).append({'duration': round(dur, 4), 'roots': rts, 'channels': tg})
for key, c in CLIPS.items():
    got = [g for g in glb_clips.get(c['name'], []) if g['roots'] == [c['root']]]
    assert len(got) == 1, (key, glb_clips.get(c['name']))
    assert abs(got[0]['duration'] - c['frames'] / FPS) < .02, (key, got[0]['duration'])
    assert all(n != c['root'] for n, _ in got[0]['channels']), ('root animated', key)
manifest = {'schema': 1, 'pack': 'HOLM_ANIM_MOTIONS_V1', 'status': 'candidate', 'axes': 'glTF Y-up, 1 unit = tile',
            'kind': 'motion curves: animated empties only (no meshes, no materials); the runtime applies each child empty\'s '
                    'local transform to a real part (src/holm_island_anim.js)',
            'file': 'motions.glb', 'blend': 'motions.blend', 'sha256': sha, 'fps': FPS,
            'clips': [{'name': c['name'], 'root': c['root'], 'seconds': c['frames'] / FPS, 'loop': c['loop'], 'desc': c['desc'],
                       'drives': sorted({t[0] for t in c['tracks']})} for c in CLIPS.values()]}
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1) + '\n', encoding='utf8')
rep = ['# Holm animation pass motions v1', '', 'Built by `tools/blender/build_holm_anim_motions_v1.py` (Blender %s, headless, deterministic).' % bpy.app.version_string,
       '', 'File: `motions.glb` sha256 `%s`' % sha, '', '| Root | Clip | Seconds | Loop | Drives | What |', '|---|---|---|---|---|---|']
for c in CLIPS.values():
    rep.append('| %s | %s | %.2f | %s | %s | %s |' % (c['root'], c['name'], c['frames'] / FPS, 'yes' if c['loop'] else 'no', ', '.join(sorted({t[0] for t in c['tracks']})), c['desc']))
rep += ['', 'Verified from the exported GLB: every root present and identity, every clip on exactly its root with the authored length, roots never animated.', '']
(OUT / 'REPORT.md').write_text('\n'.join(rep), encoding='utf8')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'motions.blend'))
(OUT / 'motions.blend1').unlink(missing_ok=True)
print(TAG, 'PASS', len(ROOTS), 'roots', len(CLIPS), 'clips', 'sha', sha[:16])
