"""Read exported GLB bytes; headless structural evidence, never visual acceptance."""
import hashlib
import json
import math
from pathlib import Path
import struct
import sys

ROOT = Path(__file__).resolve().parents[1]
DEFAULT = ROOT / '.studio-workspaces/holm-quest-lodge-v1/candidates'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def verify(folder):
    raw = (folder / 'lodge.glb').read_bytes()
    require(len(raw) >= 20, 'Truncated GLB')
    magic, version, length = struct.unpack_from('<4sII', raw)
    require(magic == b'glTF' and version == 2 and length == len(raw), 'GLB header mismatch')
    chunks, offset = [], 12
    while offset < length:
        size, kind = struct.unpack_from('<II', raw, offset)
        require(size % 4 == 0 and offset + 8 + size <= length, 'Invalid chunk extent')
        chunks.append((kind, raw[offset + 8:offset + 8 + size]))
        offset += 8 + size
    require([c[0] for c in chunks] == [0x4E4F534A, 0x004E4942], 'Expected JSON and BIN chunks')
    gltf, binary = json.loads(chunks[0][1]), chunks[1][1]
    require(len(gltf.get('buffers', [])) == 1, 'Expected one embedded buffer')
    buffer = gltf['buffers'][0]
    require('uri' not in buffer and 0 <= len(binary) - buffer['byteLength'] <= 3, 'Embedded buffer length mismatch')
    views = gltf.get('bufferViews', [])
    for view in views:
        require(view.get('buffer', 0) == 0, 'External buffer view')
        require(view.get('byteOffset', 0) >= 0 and view['byteLength'] > 0 and
                view.get('byteOffset', 0) + view['byteLength'] <= buffer['byteLength'], 'Buffer view outside buffer')
    formats = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2), 5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
    dimensions = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
    decoded = []
    for ai, accessor in enumerate(gltf.get('accessors', [])):
        require('sparse' not in accessor and 'bufferView' in accessor, f'Unsupported sparse/unbacked accessor {ai}')
        require(accessor['componentType'] in formats and accessor['type'] in dimensions, f'Unsupported accessor format {ai}')
        fmt, width = formats[accessor['componentType']]
        dims = dimensions[accessor['type']]
        view = views[accessor['bufferView']]
        stride = view.get('byteStride', dims * width)
        start, count = accessor.get('byteOffset', 0), accessor['count']
        require(count > 0 and stride >= dims * width and start >= 0 and
                start + (count - 1) * stride + dims * width <= view['byteLength'], f'Accessor {ai} outside view')
        rows = [struct.unpack_from('<' + fmt * dims, binary, view.get('byteOffset', 0) + start + i * stride) for i in range(count)]
        require(all(math.isfinite(x) for row in rows for x in row), f'Nonfinite accessor {ai}')
        for key, fn in [('min', min), ('max', max)]:
            if key in accessor:
                actual = [fn(row[d] for row in rows) for d in range(dims)]
                require(len(accessor[key]) == dims and all(abs(a - b) <= 1e-5 * max(1, abs(a)) for a, b in zip(actual, accessor[key])), f'Accessor {ai} false {key}')
        decoded.append(rows)

    meshes = gltf.get('meshes', [])
    require(0 < len(meshes) <= 65, 'Mesh count exceeds 65 or empty')
    triangles = primitives = 0
    for mesh in meshes:
        for primitive in mesh['primitives']:
            require(primitive.get('mode', 4) == 4, 'Non-triangle primitive')
            attrs = primitive['attributes']
            require('POSITION' in attrs and 'NORMAL' in attrs, 'Position/normal missing')
            positions, normals = decoded[attrs['POSITION']], decoded[attrs['NORMAL']]
            require(len(positions) == len(normals) and all(len(v) == 3 for v in positions + normals), 'Invalid position/normal layout')
            require(all(0.99 <= sum(x*x for x in n) <= 1.01 for n in normals), 'Non-unit normal')
            for index in attrs.values():
                require(len(decoded[index]) == len(positions), 'Vertex attribute count mismatch')
            material = gltf.get('materials', [])[primitive['material']]
            texture = material.get('pbrMetallicRoughness', {}).get('baseColorTexture')
            if texture:
                uv_name = 'TEXCOORD_' + str(texture.get('texCoord', 0))
                require(uv_name in attrs, 'Textured material has no matching UV attribute')
                uv = decoded[attrs[uv_name]]
                require(all(len(v) == 2 for v in uv) and any(v != uv[0] for v in uv), 'Constant or invalid UVs')
            if 'indices' in primitive:
                accessor = gltf['accessors'][primitive['indices']]
                require(accessor['type'] == 'SCALAR' and accessor['componentType'] in (5121, 5123, 5125), 'Invalid index type')
                indices = [v[0] for v in decoded[primitive['indices']]]
            else:
                indices = list(range(len(positions)))
            require(len(indices) % 3 == 0 and all(0 <= i < len(positions) for i in indices), 'Invalid indices')
            triangles += len(indices) // 3
            primitives += 1
    require(triangles <= 14000, 'Triangle budget exceeds 14000')

    identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
    def matrix(node):
        if 'matrix' in node:
            return node['matrix']
        x, y, z, w = node.get('rotation', [0, 0, 0, 1])
        sx, sy, sz = node.get('scale', [1, 1, 1])
        tx, ty, tz = node.get('translation', [0, 0, 0])
        return [(1-2*y*y-2*z*z)*sx, (2*x*y+2*z*w)*sx, (2*x*z-2*y*w)*sx, 0,
                (2*x*y-2*z*w)*sy, (1-2*x*x-2*z*z)*sy, (2*y*z+2*x*w)*sy, 0,
                (2*x*z+2*y*w)*sz, (2*y*z-2*x*w)*sz, (1-2*x*x-2*y*y)*sz, 0, tx, ty, tz, 1]
    def multiply(a, b):
        return [sum(a[k*4+r]*b[c*4+k] for k in range(4)) for c in range(4) for r in range(4)]
    points, visited = [], set()
    def visit(index, parent):
        require(index not in visited, 'Cycle or multiply parented node')
        visited.add(index)
        node = gltf['nodes'][index]
        local = matrix(node)
        require(len(local) == 16 and all(math.isfinite(v) for v in local), 'Invalid node transform')
        world = multiply(parent, local)
        if 'mesh' in node:
            require(node.get('name', '').startswith('Lodge_'), 'Mesh node lacks Lodge_ prefix')
            for primitive in meshes[node['mesh']]['primitives']:
                for p in decoded[primitive['attributes']['POSITION']]:
                    points.append([sum(world[k*4+r]*p[k] for k in range(3)) + world[12+r] for r in range(3)])
        for child in node.get('children', []):
            visit(child, world)
    for node in gltf['scenes'][gltf.get('scene', 0)]['nodes']:
        visit(node, identity)
    mesh_nodes = [gltf['nodes'][i] for i in visited if 'mesh' in gltf['nodes'][i]]
    require(len(mesh_nodes) <= 65 and {n['mesh'] for n in mesh_nodes} == set(range(len(meshes))), 'Mesh instance budget or unused mesh')
    require(points and all(math.isfinite(x) for p in points for x in p), 'Invalid scene bounds')
    bounds = {'min': [min(p[d] for p in points) for d in range(3)], 'max': [max(p[d] for p in points) for d in range(3)]}
    images = []
    for im in gltf.get('images', []):
        require('bufferView' in im and 'uri' not in im, 'Non-embedded texture')
        view = views[im['bufferView']]
        start = view.get('byteOffset', 0)
        content = binary[start:start + view['byteLength']]
        require((im.get('mimeType') == 'image/png' and content.startswith(b'\x89PNG\r\n\x1a\n')) or
                (im.get('mimeType') == 'image/jpeg' and content.startswith(b'\xff\xd8')), 'Invalid image signature')
        images.append(hashlib.sha256(content).hexdigest())
    require(len(set(images)) >= 3, 'Fewer than three distinct embedded textures')
    animations = []
    for clip in gltf.get('animations', []):
        channels = []
        for channel in clip['channels']:
            require(channel['target']['node'] in visited, 'Animation targets unused node')
            path = channel['target']['path']
            require(path in ('rotation', 'translation', 'scale'), 'Unsupported animated property')
            sampler = clip['samplers'][channel['sampler']]
            times = [v[0] for v in decoded[sampler['input']]]
            values = decoded[sampler['output']]
            if sampler.get('interpolation') == 'CUBICSPLINE':
                require(len(values) == len(times)*3, 'Cubic output count mismatch')
                values = values[1::3]
            require(len(times) >= 2 and len(values) == len(times) and all(a < b for a, b in zip(times, times[1:])), 'Invalid animation sample times/count')
            require(all(len(v) == (4 if path == 'rotation' else 3) for v in values), 'Animation property shape mismatch')
            if path == 'rotation':
                require(all(abs(sum(x*x for x in v)-1) < 1e-4 for v in values), 'Animation quaternion not normalized')
            require(any(any(abs(a-b) > 1e-6 for a,b in zip(v, values[0])) for v in values[1:]), 'Static animation channel')
            direct = max(abs(a-b) for a,b in zip(values[0], values[-1]))
            inverse = max(abs(a+b) for a,b in zip(values[0], values[-1]))
            require(direct < 1e-5 or (channel['target']['path'] == 'rotation' and inverse < 1e-5), 'Animation loop endpoint mismatch')
            channels.append({'path': channel['target']['path'], 'samples': len(times), 'duration': times[-1]-times[0]})
        animations.append({'name': clip.get('name'), 'channels': channels})
    contract = json.loads((folder / 'contract.json').read_text(encoding='utf-8'))
    blend = folder / 'lodge.blend'
    require(blend.is_file() and blend.stat().st_size > 0, 'Missing Blender source')
    digest = hashlib.sha256(raw).hexdigest()
    evidence = contract['exportEvidence']
    require(evidence['sha256'] == digest and evidence['glbBytes'] == len(raw), 'Contract hash/byte count mismatch')
    require(evidence['embeddedImages'] == len(images) and evidence['primitives'] == primitives, 'Contract image/primitive count mismatch')
    require(contract['triangleCount'] == triangles and contract['meshCount'] == len(meshes), 'Contract geometry count mismatch')
    semantic_names = [n['name'] for n in gltf['nodes'] if 'mesh' in n]
    require(sorted(contract['meshNames']) == sorted(semantic_names), 'Contract semantic mesh names mismatch')
    require(sorted(contract['animations']) == sorted(c.get('name') for c in gltf.get('animations', [])), 'Contract animations mismatch')
    return {'status': 'PASS', 'scope': 'Headless exported binary structure only; no visual, navigation or gameplay acceptance.',
            'glbSha256': digest, 'bytes': len(raw), 'triangles': triangles, 'meshes': len(meshes), 'primitives': primitives,
            'accessors': len(decoded), 'boundsGltf': bounds, 'semanticMeshNames': semantic_names, 'embeddedTextureSha256': images, 'animations': animations,
            'blendSha256': hashlib.sha256(blend.read_bytes()).hexdigest(), 'contractKeys': sorted(contract)}


if __name__ == '__main__':
    folder = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT
    try:
        report = verify(folder)
    except (ValueError, KeyError, IndexError, OSError, struct.error) as exc:
        print('[QUEST_LODGE_ASSET] FAIL:', exc)
        sys.exit(1)
    (folder / 'asset-verification.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print('[QUEST_LODGE_ASSET] PASS', json.dumps(report))
