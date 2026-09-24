"""Independently measure imported candidate GLBs; never writes source assets.

Run with Blender --background --python-exit-code 1 --python this_file.py.
Animated bounds are a sampled union, NOT a continuous swept-volume guarantee.
"""
import hashlib
import json
import math
import struct
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector

ROOT = Path(__file__).resolve().parents[2]
GARDEN = ROOT / '.studio-workspaces/holm-arrival-garden-v1/candidates'
PROPS = ROOT / '.studio-workspaces/holm-landing-props-v1/candidates'
OUTPUT = ROOT / '.studio-workspaces/holm-arrival-landscape-measure-v2/candidates/measured.json'
FILES = {
    # v2 (owner review 6, 2026-09-24): branching v3 oak; Lantern Keeper statue added
    'oak': ROOT / '.studio-workspaces/holm-tree-family-v3/candidates/arrival_oak_v3.glb',
    'statue': ROOT / '.studio-workspaces/holm-arrival-statue-v1/candidates/lantern_keeper_statue_v1.glb',
    'hazel': GARDEN / 'arrival_hazel_v1.glb',
    'fieldstones': GARDEN / 'arrival_fieldstones_v1.glb',
    **{name: PROPS / (name + '.glb') for name in ('wall', 'bench', 'waypost', 'cargo')},
}


def glb_data(path):
    raw = path.read_bytes()
    magic, version, length = struct.unpack_from('<III', raw)
    assert magic == 0x46546C67 and version == 2 and length == len(raw)
    chunks = {}
    offset = 12
    while offset < len(raw):
        size, kind = struct.unpack_from('<II', raw, offset)
        offset += 8
        chunks[kind] = raw[offset:offset + size]
        offset += size
    return json.loads(chunks[0x4E4F534A]), chunks.get(0x004E4942, b'')


def clip_times(doc, binary, animation):
    times = set()
    for sampler in animation['samplers']:
        accessor = doc['accessors'][sampler['input']]
        assert accessor['componentType'] == 5126 and accessor['type'] == 'SCALAR'
        assert 'sparse' not in accessor
        view = doc['bufferViews'][accessor['bufferView']]
        assert view['buffer'] == 0
        start = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
        stride = view.get('byteStride', 4)
        values = [struct.unpack_from('<f', binary, start + i * stride)[0]
                  for i in range(accessor['count'])]
        assert values and all(math.isfinite(x) and x >= 0 for x in values)
        times.update(values)
    ordered = sorted(times)
    assert ordered
    # All exported keyframes, plus every neighboring pair's midpoint.
    times.update((a + b) / 2 for a, b in zip(ordered, ordered[1:]))
    times.add(0.0)
    return sorted(times)


def measure():
    bpy.context.view_layer.update()
    graph = bpy.context.evaluated_depsgraph_get()
    bounds = {'min': [float('inf')] * 3, 'max': [-float('inf')] * 3}
    triangles = vertices = 0
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH':
            continue
        evaluated = obj.evaluated_get(graph)
        mesh = evaluated.to_mesh()
        try:
            mesh.calc_loop_triangles()
            triangles += len(mesh.loop_triangles)
            for vertex in mesh.vertices:
                point = evaluated.matrix_world @ vertex.co
                game = (point.x, point.z, -point.y)
                assert all(math.isfinite(v) for v in game)
                vertices += 1
                for axis in range(3):
                    bounds['min'][axis] = min(bounds['min'][axis], game[axis])
                    bounds['max'][axis] = max(bounds['max'][axis], game[axis])
        finally:
            evaluated.to_mesh_clear()
    assert vertices and triangles
    return bounds, triangles, vertices


def measure_footprint(limit=.5):
    # v2: the ground-contact footprint of a tree (trunk base and root flares), from rest vertices below
    # `limit` tiles. Trees block only where they meet the ground, as in 2004; canopies stay walkable.
    graph = bpy.context.evaluated_depsgraph_get()
    lo = [float('inf')] * 3
    hi = [-float('inf')] * 3
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH':
            continue
        evaluated = obj.evaluated_get(graph)
        mesh = evaluated.to_mesh()
        try:
            for vertex in mesh.vertices:
                point = evaluated.matrix_world @ vertex.co
                game = (point.x, point.z, -point.y)
                if game[1] < limit:
                    for axis in range(3):
                        lo[axis] = min(lo[axis], game[axis])
                        hi[axis] = max(hi[axis], game[axis])
        finally:
            evaluated.to_mesh_clear()
    assert all(math.isfinite(v) for v in lo + hi) and all(lo[k] < hi[k] for k in range(3)), 'no ground-contact footprint'
    return {'min': lo, 'max': [hi[0], limit, hi[2]]}


def union(target, bounds):
    for axis in range(3):
        target['min'][axis] = min(target['min'][axis], bounds['min'][axis])
        target['max'][axis] = max(target['max'][axis], bounds['max'][axis])


def restore_node_pose(doc):
    # Import can evaluate the first animated frame. Restore exact authored GLB
    # transforms before measuring rest, independently of that import side effect.
    conversion = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
    inverse = conversion.inverted()
    names = [node['name'] for node in doc['nodes']]
    assert len(names) == len(set(names)), 'Ambiguous imported node names'
    for node in doc['nodes']:
        obj = bpy.context.scene.objects.get(node['name'])
        assert obj is not None, 'Imported node missing: ' + node['name']
        if 'matrix' in node:
            values = node['matrix']
            matrix = Matrix(tuple(tuple(values[column * 4 + row] for column in range(4)) for row in range(4)))
        else:
            rotation = node.get('rotation', [0, 0, 0, 1])
            matrix = Matrix.LocRotScale(Vector(node.get('translation', [0, 0, 0])),
                                       Quaternion((rotation[3], *rotation[:3])),
                                       Vector(node.get('scale', [1, 1, 1])))
        obj.matrix_basis = conversion @ matrix @ inverse


def main():
    for path in [*FILES.values(), GARDEN / 'manifest.json', PROPS / 'manifest.json']:
        assert path.is_file(), 'Base guard: missing ' + str(path)
    result = {
        'schema': 'holm-arrival-landscape-measure-v1',
        'blenderVersion': bpy.app.version_string,
        'units': 'tiles',
        'axes': 'game Y-up: Blender (x,y,z) -> (x,z,-y)',
        'method': 'Blender GLB import; evaluated world vertices; animation keyframes and adjacent midpoints',
        'continuousSweptGuarantee': False,
        'assets': {},
    }
    for name, path in FILES.items():
        bpy.ops.wm.read_factory_settings(use_empty=True)
        doc, binary = glb_data(path)
        bpy.ops.import_scene.gltf(filepath=str(path))
        scene = bpy.context.scene
        fps = scene.render.fps / scene.render.fps_base
        tracks = []
        # Imported node transforms are the GLB rest pose. Mute all actions before
        # measuring it; NLA animation is then enabled one named clip at a time.
        for obj in scene.objects:
            ad = obj.animation_data
            if ad:
                ad.action = None
                ad.use_nla = True
                for track in ad.nla_tracks:
                    track.is_solo = False
                    track.mute = True
                    tracks.append(track)
        restore_node_pose(doc)
        rest, triangles, vertices = measure()
        footprint = measure_footprint() if name in ('oak', 'hazel') else None
        animated = {'min': list(rest['min']), 'max': list(rest['max'])}
        clips = []
        for animation in doc.get('animations', []):
            clip = animation['name']
            selected = [track for track in tracks if track.name == clip]
            assert selected, 'Imported NLA clip missing: ' + clip
            for track in tracks:
                track.mute = True
            for obj in scene.objects:
                ad = obj.animation_data
                if not ad:
                    continue
                matching = [track for track in ad.nla_tracks if track.name == clip]
                ad.use_nla = False
                ad.action = None
                if matching:
                    assert len(matching) == 1 and len(matching[0].strips) == 1
                    strip = matching[0].strips[0]
                    ad.action = strip.action
                    ad.action_slot = strip.action_slot
            times = clip_times(doc, binary, animation)
            clip_bounds = {'min': [float('inf')] * 3, 'max': [-float('inf')] * 3}
            sampled_bounds = set()
            for seconds in times:
                frame = seconds * fps
                scene.frame_set(math.floor(frame), subframe=frame - math.floor(frame))
                bounds, count, _ = measure()
                assert count == triangles, 'Animated topology changed'
                sampled_bounds.add(tuple(bounds['min'] + bounds['max']))
                union(clip_bounds, bounds)
                union(animated, bounds)
            assert len(sampled_bounds) > 1, 'Expected animated clip produced no bounds variation: ' + clip
            clips.append({'name': clip, 'sampleTimesSeconds': times,
                          'distinctSampleBounds': len(sampled_bounds),
                          'sampleCount': len(times), 'sampledBounds': clip_bounds})
        result['assets'][name] = {
            'file': path.relative_to(ROOT).as_posix(),
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'triangles': triangles, 'vertices': vertices,
            'restBounds': rest, 'animatedSampledUnion': animated,
            'clips': clips, 'importFramesPerSecond': fps,
        }
        if footprint:
            result['assets'][name]['footprintBounds'] = footprint
        print('[LANDSCAPE-MEASURE]', name, triangles, 'triangles', len(clips), 'clips')
    assert len(result['assets']) == len(FILES) == 8
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    print('[LANDSCAPE-MEASURE] 8/8 finite vertex measurements; output:', OUTPUT)


if __name__ == '__main__':
    main()
