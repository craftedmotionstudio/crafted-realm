"""Material-only Blender candidate. Strictly preserves measured v2 lodge structure."""
import bpy, hashlib, json, struct, array
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / '.studio-workspaces/holm-quest-lodge-v2/candidates'
OUT = ROOT / '.studio-workspaces/holm-quest-lodge-v3/candidates'
BASE_SHA = '6de1fd292bfdd0f3dd51bf0031297f8905eb72ff19a8ed9be759b7f4f738140b'
def sha(data): return hashlib.sha256(data).hexdigest()
def digest(value): return sha(json.dumps(value, sort_keys=True, separators=(',', ':')).encode())
assert sha((BASE / 'lodge.glb').read_bytes()) == BASE_SHA, 'Measured base drift'
assert sha((BASE / 'lodge.blend').read_bytes()) == 'cb67ce90df39077e139af6c634bc26527203bc08b836616ba8547b90e83a88ae', 'Blender base drift'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(BASE / 'lodge.blend'))

def blender_structure():
    objects = []
    for o in sorted(bpy.context.scene.objects, key=lambda o: o.name):
        row = {'name': o.name, 'type': o.type, 'parent': o.parent.name if o.parent else None,
               'matrix': [list(r) for r in o.matrix_local]}
        if o.type == 'MESH':
            row.update(vertices=[list(v.co) for v in o.data.vertices],
                       polygons=[list(p.vertices) for p in o.data.polygons],
                       materials=[m.name for m in o.data.materials],
                       uv={u.name: [list(d.uv) for d in u.data] for u in o.data.uv_layers})
        objects.append(row)
    actions = {a.name: [{'path': f.data_path, 'index': f.array_index,
                        'keys': [[list(k.co), list(k.handle_left), list(k.handle_right), k.interpolation]
                                 for k in f.keyframe_points]} for f in a.fcurves]
               for a in bpy.data.actions}
    return digest({'objects': objects, 'actions': actions})

def image_pixels():
    result = {}
    for im in bpy.data.images:
        if im.size[0] and im.size[1]:
            a = array.array('f', [0]) * len(im.pixels); im.pixels.foreach_get(a)
            result[im.name] = sha(a.tobytes())
    return result

before_structure = blender_structure()
before_pixels = image_pixels()
material = bpy.data.materials['Warm oak']
nodes = [n for n in material.node_tree.nodes if n.type == 'TEX_IMAGE']
assert len(nodes) == 1 and nodes[0].image.name == 'lodge_wood'
im = nodes[0].image
assert tuple(im.size) == (128, 128)
# Remove the old packed payload before replacing pixels; packing an already packed
# image can otherwise leave the previous PNG bytes in the exporter.
if im.packed_file: im.unpack(method='REMOVE')
# Eight broad boards per texture tile (~0.446 world units each with existing UVs).
# Straight, sparse grain and staggered end joints; no per-pixel noise or sine waves.
pixels = []
tones = [-.007, .003, -.002, .008, -.004, .005, -.008, .001]
for y in range(128):
    for x in range(128):
        board, across = divmod(x, 16)
        v = .25 + tones[board]
        if across == 0: v -= .023
        elif across == 1: v += .004
        # One restrained end joint per full board, deliberately staggered.
        if y == (board * 37 + 21) % 128: v -= .015
        if across in (5 + board % 3, 11 + board % 2): v -= .004
        pixels.extend((v * 1.16, v * .90, v * .61, 1.0))
im.pixels.foreach_set(pixels)
im.filepath_raw = str(OUT / 'lodge_wood.png'); im.file_format = 'PNG'
im.save(); im.pack()
(OUT / 'oak.png').write_bytes((OUT / 'lodge_wood.png').read_bytes())
assert blender_structure() == before_structure, 'Blender geometry/UV/node/animation mutation'
after_pixels = image_pixels()
assert before_pixels.keys() == after_pixels.keys()
assert [n for n in before_pixels if before_pixels[n] != after_pixels[n]] == ['lodge_wood']
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'lodge.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT / 'lodge.glb'), export_format='GLB', export_yup=True, export_animations=True)

def glb_evidence(path):
    raw = path.read_bytes(); length = struct.unpack_from('<I', raw, 12)[0]
    g = json.loads(raw[20:20 + length]); binary = raw[28 + length:]
    accessors = []
    for a in g['accessors']:
        view = g['bufferViews'][a['bufferView']]
        # These exported accessors use noninterleaved complete views.
        assert not a.get('byteOffset') and not view.get('byteStride')
        start = view.get('byteOffset', 0)
        accessors.append({'descriptor': {k:v for k,v in a.items() if k != 'bufferView'},
                          'bytesSha256': sha(binary[start:start + view['byteLength']])})
    structure = {'nodes': g['nodes'], 'meshes': g['meshes'], 'animations': g.get('animations', []),
                 'scenes': g['scenes'], 'accessors': accessors, 'materials': g['materials'],
                 'textures': g.get('textures', []), 'samplers': g.get('samplers', [])}
    images = {}
    for i in g['images']:
        v = g['bufferViews'][i['bufferView']]; start = v.get('byteOffset', 0)
        images[i['name']] = sha(binary[start:start + v['byteLength']])
    return {'sha256': sha(raw), 'bytes': len(raw), 'structureSha256': digest(structure),
            'nodes': len(g['nodes']), 'meshes': len(g['meshes']), 'accessors': len(accessors),
            'animations': [a['name'] for a in g.get('animations', [])], 'images': images}

base = glb_evidence(BASE / 'lodge.glb'); candidate = glb_evidence(OUT / 'lodge.glb')
assert base['structureSha256'] == candidate['structureSha256'], 'Export changed geometry/UV/nodes/animations/material configuration'
assert base['images'].keys() == candidate['images'].keys()
changed_images = [n for n in base['images'] if base['images'][n] != candidate['images'][n]]
assert changed_images == ['lodge_wood'], changed_images
contract = {'schema': 'holm-lodge-material-v1', 'baseSha256': BASE_SHA,
            'modelSha256': candidate['sha256'],
            'modelUrl': '../.studio-workspaces/holm-quest-lodge-v3/candidates/lodge.glb',
            'materialName': 'Warm oak', 'status': 'isolated material candidate; visual review pending',
            'source': 'tools/blender/refine_holm_lodge_oak.py',
            'texture': {'url': '../.studio-workspaces/holm-quest-lodge-v3/candidates/oak.png',
                        'sha256': sha((OUT / 'oak.png').read_bytes()), 'width': 128, 'height': 128,
                        'boards': 8, 'worldUnitsPerBoard': 1 / .28 / 8,
                        'direction': 'Straight sparse grain; staggered end joints; subdued warm oak'},
            'evidence': {'blenderStructureSha256': before_structure,
                         'base': base, 'candidate': candidate, 'changedImages': changed_images,
                         'otherImagePixelsUnchanged': True, 'geometryUvNodesAnimationsUnchanged': True}}
(OUT / 'material-contract.json').write_text(json.dumps(contract, indent=2), encoding='utf-8')
print('[LODGE_OAK] material-only invariants PASS ' + candidate['sha256'])
