"""Read-only Blender fitting of the existing animated fire to the lodge hearth.

Writes local Studio placement DATA only; never saves either source blend or GLB.
Run with Blender --background --python-exit-code 1 --python this_file.py.
"""
import bpy, hashlib, json, math, struct
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
LODGE = ROOT / '.studio-workspaces/holm-quest-lodge-v2/candidates'
FIRE = ROOT / '.studio-workspaces/holm-bakehouse-fire-v1/candidates'
OUT = ROOT / '.studio-workspaces/holm-quest-hearth-v1/candidates'
LODGE_SHA = '6de1fd292bfdd0f3dd51bf0031297f8905eb72ff19a8ed9be759b7f4f738140b'
FIRE_SHA = 'b5138d41ee563df9dee97a403fdb6420acb719bb3985dd9f475974d423ac75cd'

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def glb_json(path):
    b = path.read_bytes()
    assert b[:4] == b'glTF' and struct.unpack_from('<I', b, 4)[0] == 2
    size, kind = struct.unpack_from('<II', b, 12)
    assert kind == 0x4E4F534A
    return json.loads(b[20:20+size])

for directory, stem, expected in [(LODGE, 'lodge', LODGE_SHA), (FIRE, 'oven-fire', FIRE_SHA)]:
    assert (directory / (stem+'.blend')).is_file()
    assert sha(directory / (stem+'.glb')) == expected, 'Source GLB drift'
assert (ROOT/'tools/blender/build_holm_bakehouse_fire.py').is_file()
source_hashes = {str(p.relative_to(ROOT)): sha(p) for p in [LODGE/'lodge.blend', LODGE/'lodge.glb', FIRE/'oven-fire.blend', FIRE/'oven-fire.glb']}

def evaluated_mesh(obj, depsgraph):
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    mesh.calc_loop_triangles()
    vertices = [evaluated.matrix_world @ v.co for v in mesh.vertices]
    triangles = [tuple(t.vertices) for t in mesh.loop_triangles]
    evaluated.to_mesh_clear()
    return vertices, triangles

def bounds(vertices):
    return {'min': [min(v[a] for v in vertices) for a in range(3)],
            'max': [max(v[a] for v in vertices) for a in range(3)]}

def gltf(v):
    return [v[0], v[2], -v[1]]

bpy.ops.wm.open_mainfile(filepath=str(LODGE/'lodge.blend'))
bpy.context.scene.frame_set(1)
hearth_vertices, hearth_triangles = [], []
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH' and obj.name.startswith('Lodge_FurnishingHearth'):
        vertices, triangles = evaluated_mesh(obj, bpy.context.evaluated_depsgraph_get())
        offset = len(hearth_vertices)
        hearth_vertices.extend(vertices)
        hearth_triangles.extend(tuple(i+offset for i in tri) for tri in triangles)
assert hearth_vertices and hearth_triangles, 'Missing actual hollow hearth mesh'
hearth_bvh = BVHTree.FromPolygons(hearth_vertices, hearth_triangles, all_triangles=True)

# Recover the actual cavity surfaces with rays from inside the hearth. The west
# opening has no wall: its usable edge is the slab's measured minimum X.
seed = Vector((4.4, -.95, .8))
def surface(direction):
    hit, normal, index, distance = hearth_bvh.ray_cast(seed, Vector(direction), 4)
    assert hit is not None, 'Cavity surface missing'
    return hit

floor = surface((0,0,-1)).z
cap = surface((0,0,1)).z
back = surface((1,0,0)).x
south = surface((0,-1,0)).y
north = surface((0,1,0)).y
west = min(v.x for v in hearth_vertices)
for measured, expected in [(floor,.18),(cap,1.59),(back,4.79),(south,-1.48),(north,-.42)]:
    assert abs(measured-expected) < 1e-5, 'Measured cavity differs from pinned source'

fire_json = glb_json(FIRE/'oven-fire.glb')
clips = fire_json.get('animations', [])
assert clips
times = [fire_json['accessors'][s['input']] for clip in clips for s in clip['samplers']]
assert all(a['count'] == 49 and abs(a['min'][0]-1/24) < 1e-6 and abs(a['max'][0]-49/24) < 1e-6 for a in times)
fire_bytes = (FIRE/'oven-fire.glb').read_bytes()
json_size = struct.unpack_from('<I', fire_bytes, 12)[0]
binary_start = 20+json_size+8
for accessor in times:
    assert accessor['componentType'] == 5126 and accessor['type'] == 'SCALAR'
    view = fire_json['bufferViews'][accessor['bufferView']]
    offset = binary_start+view.get('byteOffset',0)+accessor.get('byteOffset',0)
    stride = view.get('byteStride',4)
    actual_times = [struct.unpack_from('<f',fire_bytes,offset+i*stride)[0] for i in range(49)]
    assert all(abs(t-(i+1)/24) < 1e-6 for i,t in enumerate(actual_times)), 'Unexpected exported sample times'
assert sum(fire_json['accessors'][p['indices']]['count']//3 for m in fire_json['meshes'] for p in m['primitives']) == 204
bpy.ops.wm.open_mainfile(filepath=str(FIRE/'oven-fire.blend'))
scene = bpy.context.scene
assert scene.frame_start == 1 and scene.frame_end == 49 and scene.render.fps == 24
objects = [o for o in scene.objects if o.type == 'MESH']
assert len(objects) == 15
rotation = Matrix.Rotation(math.pi/2, 3, 'Z')
frames = []
all_rotated = []
for frame in range(1, 50):
    scene.frame_set(frame)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    meshes = []
    for obj in objects:
        vertices, triangles = evaluated_mesh(obj, depsgraph)
        vertices = [rotation @ v for v in vertices]
        meshes.append((vertices, triangles))
        all_rotated.extend(vertices)
    frames.append(meshes)
source_bounds = bounds(all_rotated)
lo, hi = source_bounds['min'], source_bounds['max']
margin = .04
scale = min(1, (back-west-2*margin)/(hi[0]-lo[0]),
            (north-south-2*margin)/(hi[1]-lo[1]),
            (cap-floor-2*margin)/(hi[2]-lo[2]))
assert scale > .5
# An extra 2mm above the actual slab avoids numerical contact/embedded coals.
translation = Vector(((west+back)/2-scale*(lo[0]+hi[0])/2,
                      (south+north)/2-scale*(lo[1]+hi[1])/2,
                      floor+.002-scale*lo[2]))
all_fitted = []
vertex_checks = 0
triangle_checks = 0
frame_triangle_count = None
for meshes in frames:
    count = 0
    for vertices, triangles in meshes:
        fitted = [v*scale+translation for v in vertices]
        all_fitted.extend(fitted)
        for v in fitted:
            assert all(math.isfinite(x) for x in v)
            assert west+margin-1e-6 <= v.x <= back-margin+1e-6
            assert south+margin-1e-6 <= v.y <= north-margin+1e-6
            assert floor+.0019 <= v.z <= cap-margin
            closest, normal, _, distance = hearth_bvh.find_nearest(v)
            assert closest is not None and distance > .0019
            assert (v-closest).dot(normal) > 0, 'Vertex inside actual masonry'
            vertex_checks += 1
        fire_bvh = BVHTree.FromPolygons(fitted, triangles, all_triangles=True)
        assert not fire_bvh.overlap(hearth_bvh), 'Fire triangle intersects masonry'
        triangle_checks += len(triangles)
        count += len(triangles)
    if frame_triangle_count is None:
        frame_triangle_count = count
    assert count == frame_triangle_count == 204
assert all(sha(ROOT/p) == h for p,h in source_hashes.items()), 'Source files were changed'

result = {
    'schema': 'holm-lodge-hearth-v1',
    'status': 'unpublished local Studio fit; visual acceptance pending',
    'lodgeSha256': LODGE_SHA,
    'fireSha256': FIRE_SHA,
    'fireUrl': '../.studio-workspaces/holm-bakehouse-fire-v1/candidates/oven-fire.glb',
    'position': gltf(translation),
    'rotationY': math.pi/2,
    'scale': scale,
    'triangleCount': frame_triangle_count,
    'clipNames': [a['name'] for a in clips],
    'durationSeconds': 49/24,
    'animatedPeriodSeconds': 2,
    'sampledBounds': {'coordinateSystem': 'lodge-local glTF XYZ, Y up', **bounds([Vector(gltf(v)) for v in all_fitted])},
    'measuredCavityBlender': {'floor': floor, 'cap': cap, 'back': back, 'south': south, 'north': north, 'westSlabEdge': west},
    'verification': {'sampledFrames': 49, 'vertexChecks': vertex_checks, 'triangleChecks': triangle_checks, 'masonryIntersections': 0, 'sourceHashes': source_hashes},
    'findings': ['Both source blend scenes evaluated in Blender; no source modifications.', 'Uniform scale and quarter turn fit the animated fire above the measured slab and inside all hearth cavity surfaces.', 'Every exported integer frame checked against evaluated masonry BVH for triangle intersections and vertex interior clearance.'],
    'limitations': ['Local lodge Studio transform only; no island placement or gameplay binding is inferred.', 'Intermediate animation times between exported frame samples are not a continuous collision proof.', 'Main session must inspect flame placement and appearance in the in-app Studio.']
}
OUT.mkdir(parents=True, exist_ok=True)
(OUT/'hearth.json').write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')
print('[LODGE_HEARTH] 49/49 frames passed; %d vertex and %d triangle checks; 0 masonry intersections' % (vertex_checks, triangle_checks))
print('[LODGE_HEARTH]', json.dumps(result))
