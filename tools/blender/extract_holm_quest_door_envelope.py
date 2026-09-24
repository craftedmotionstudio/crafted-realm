"""Read-only Blender extraction: conservative rigid-door sweep, not closed-door routing.
Run Blender --background --python-exit-code 1 --python this_file.
"""
import bpy, hashlib, json, math, struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / '.studio-workspaces/holm-quest-lodge-v2/candidates'
NAV = ROOT / '.studio-workspaces/holm-quest-navigation-v1/candidates/navigation.json'
OUT = ROOT / '.studio-workspaces/holm-quest-door-v1/candidates/door.json'
SHA = '6de1fd292bfdd0f3dd51bf0031297f8905eb72ff19a8ed9be759b7f4f738140b'
BLEND_SHA = 'cb67ce90df39077e139af6c634bc26527203bc08b836616ba8547b90e83a88ae'
EPS = .00001
blob = (BASE / 'lodge.glb').read_bytes()
assert hashlib.sha256(blob).hexdigest() == SHA, 'GLB base drift'
assert hashlib.sha256((BASE / 'lodge.blend').read_bytes()).hexdigest() == BLEND_SHA, 'Blend base drift'
assert (ROOT / 'tools/blender/extract_holm_quest_navigation.py').is_file()
nav_bytes = NAV.read_bytes()
nav = json.loads(nav_bytes)
assert nav['modelSha256'] == SHA and nav['avatar'] == {'radius': .24, 'height': 1.9}
assert nav['doorPoseTimeSeconds'] == 59 / 24
g = json.loads(blob[20:20 + struct.unpack_from('<I', blob, 12)[0]])
clips = [a for a in g['animations'] if a['name'] == 'Lodge_DoorOpenClose']
assert len(clips) == 1
clip = clips[0]
assert clip['channels'] and all(c['target']['path'] == 'rotation' and
    g['nodes'][c['target']['node']]['name'] == 'Lodge_DoorPivot' for c in clip['channels'])
json_length = struct.unpack_from('<I', blob, 12)[0]
binary = blob[28 + json_length:]
for sampler in clip['samplers']:
    assert sampler.get('interpolation', 'LINEAR') == 'LINEAR'
    accessor = g['accessors'][sampler['output']]
    assert accessor['type'] == 'VEC4' and accessor['componentType'] == 5126
    view = g['bufferViews'][accessor['bufferView']]
    offset = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
    for i in range(accessor['count']):
        quat = struct.unpack_from('<4f', binary, offset + i * view.get('byteStride', 16))
        assert all(math.isfinite(v) for v in quat)
        assert abs(quat[0]) < EPS and abs(quat[2]) < EPS
        assert abs(sum(v * v for v in quat) - 1) < EPS

bpy.ops.wm.open_mainfile(filepath=str(BASE / 'lodge.blend'))
scene = bpy.context.scene
pivot = scene.objects.get('Lodge_DoorPivot')
assert pivot is not None and pivot.parent is None and not pivot.constraints
assert pivot.rotation_mode == 'XYZ' and all(abs(v - 1) < EPS for v in pivot.scale)
action = pivot.animation_data.action
assert action.name == 'Lodge_DoorOpenClose'
curves = list(action.fcurves)
assert curves and all(c.data_path == 'rotation_euler' and not c.modifiers for c in curves)
assert not pivot.animation_data.drivers and not pivot.animation_data.nla_tracks
for curve in curves:
    if curve.array_index != 2:
        assert all(abs(k.co.y) < EPS and abs(k.handle_left.y) < EPS and
                   abs(k.handle_right.y) < EPS for k in curve.keyframe_points)
assert any(c.array_index == 2 for c in curves)
children = list(pivot.children_recursive)
meshes = [o for o in children if o.type == 'MESH']
assert meshes and all(o.parent == pivot and not o.animation_data and not o.constraints and
                     not o.modifiers and not o.data.shape_keys for o in meshes)
assert all(o.type == 'MESH' for o in children), 'Unexpected animated hierarchy'
assert scene.render.fps == 24 and scene.render.fps_base == 1
scene.frame_set(1)
center = pivot.matrix_world.translation.copy()

def vertices():
    deps = bpy.context.evaluated_depsgraph_get()
    result = []
    for obj in meshes:
        evaluated = obj.evaluated_get(deps)
        mesh = evaluated.to_mesh()
        result.extend(evaluated.matrix_world @ v.co for v in mesh.vertices)
        evaluated.to_mesh_clear()
    assert result and all(math.isfinite(c) for v in result for c in v)
    return result

vv = vertices()
radius = max(math.hypot(v.x - center.x, v.y - center.y) for v in vv) + EPS
lo, hi = min(v.z for v in vv) - EPS, max(v.z for v in vv) + EPS
# Rigid meshes under a fixed vertical pivot remain in this cylinder at EVERY angle.
# Evaluated subframes are independent sanity checks; they are not the proof of continuity.
samples = 0
for quarter in range(4, 401):
    frame = quarter / 4
    scene.frame_set(int(frame), subframe=frame % 1)
    assert (pivot.matrix_world.translation - center).length < EPS
    assert abs(pivot.rotation_euler.x) < EPS and abs(pivot.rotation_euler.y) < EPS
    for v in vertices():
        assert math.hypot(v.x - center.x, v.y - center.y) <= radius
        assert lo <= v.z <= hi
        samples += 1
envelope = {'centerX': float(center.x), 'centerZ': float(-center.y),
            'radius': radius, 'minY': lo, 'maxY': hi}

def safe(node):
    for field in ('x', 'y', 'z', 'capsuleBase'):
        assert isinstance(node.get(field), (int, float)) and math.isfinite(node[field]), field
    # Include both nav feet and the Studio's +.015 rendered foot lift.
    bottom, top = node['capsuleBase'], node['capsuleBase'] + 1.9 + .015
    return (top < lo - .01 or bottom > hi + .01 or
            math.hypot(node['x'] - envelope['centerX'], node['z'] - envelope['centerZ']) > radius + .24 + .01)

nodes = nav['nodes']
assert nodes and all(isinstance(n.get('id'), str) and n['id'] for n in nodes)
assert len({n['id'] for n in nodes}) == len(nodes)
lookup = {n['id']: n for n in nodes}
assert nav['startId'] in lookup
safe_ids = [n['id'] for n in nodes if safe(n)]
assert safe_ids and len(safe_ids) < len(nodes)
assert all(n['id'] in safe_ids for n in nodes if n['capsuleBase'] > hi)
assert not safe({'x': envelope['centerX'], 'z': envelope['centerZ'], 'y': 0, 'capsuleBase': 0})
assert safe({'x': envelope['centerX'], 'z': envelope['centerZ'], 'y': 3.3, 'capsuleBase': 3.3})
for invalid in ({}, {'x': float('nan'), 'z': 0, 'y': 0, 'capsuleBase': 0}):
    try:
        safe(invalid)
        raise RuntimeError('Malformed stance accepted')
    except AssertionError:
        pass
data = {'schema': 'holm-quest-door-v1', 'modelSha256': SHA,
    'navigationSha256': hashlib.sha256(nav_bytes).hexdigest(), 'blendSha256': BLEND_SHA,
    'clipName': 'Lodge_DoorOpenClose', 'closedTimeSeconds': 0, 'openTimeSeconds': 59 / 24,
    'safeNodeIds': safe_ids, 'envelope': envelope,
    'avatar': {'radius': .24, 'height': 1.9, 'renderFootLift': .015, 'clearanceMargin': .01},
    'explanation': 'Raw door envelope is a vertical cylinder enclosing every rigid moving vertex at every rotation angle, padded by 0.00001 tile. Animation is exclusively rotation about the fixed vertical hinge. A stationary node is safe when its vertical interval [capsuleBase, capsuleBase+1.915] is disjoint from [minY-0.01,maxY+0.01], or horizontal distance from the hinge is strictly greater than radius+0.24+0.01. Walking must remain disabled during door motion and while closed; this does not certify closed-door routes, arbitrary standing positions, or island placement.',
    'verification': {'evaluatedVertexSamples': samples, 'evaluatedPoses': 397,
                     'standingNodes': len(nodes), 'safeNodes': len(safe_ids),
                     'startSafe': nav['startId'] in safe_ids}}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(data, indent=2, allow_nan=False) + '\n', encoding='utf-8')
print('[QUEST_DOOR_ENVELOPE] PASS', json.dumps(data['verification']), json.dumps(envelope))
print('[QUEST_DOOR_ENVELOPE] target safety', json.dumps({value['id']: value['nodeId'] in safe_ids for value in nav['targets']}))
