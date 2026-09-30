"""Warden's Keep overhaul (owner review 2026-09-29): the keep's walk graph measured again on the rebuilt model.

The keep's own extractor (v6, as the props pass ran it through relock_with_swapped_paths.py on the v2 land) with its
tolerances, probes and outputs unchanged: a 0.24 x 1.9 capsule stood on every tile centre, every support ray and every
edge sampled both ways at 0.05 m, cardinal links only. What changes:
 - inputs: the overhaul's own keep.blend + keep.glb (holm-keep-overhaul-v1), the v2 land's staged terrain at the seat
   (87, 11, 35), the build report (doors, stairs, anchors) beside the model;
 - targets: the eight the island already uses (gate, court, hall, upper, wallwalk, watch-lookout, east-lookout,
   undercroft; the requested points follow the rebuilt walks and tower tops) plus every stair's foot and head, the beer's
   stance (keep-beer) and a stance in each section of the level-two ring and each tower storey;
 - climbs: each staircase as a 2004 climb between its measured foot and head (data.climbs, the Lastlight ladders'
   format: {id, label, footId, topId}); the flights stay walkable, so either way reaches the other floor;
 - doors: for each door the measured links that pass through its doorway (data.doors: {id, storey, section, links,
   leaves}), so gameplay code can shut a doorway by dropping exactly those links while a leaf is closed.
Run: blender -b --python tools/blender/extract_holm_keep_navigation_v7.py   (never saves or alters the model)"""
import bpy, json, math, hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from collections import Counter, deque

ROOT = Path(__file__).resolve().parents[2]
import sys
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
# optional: -- <model dir> <out dir> <model stem> (the pre-z-fix measure reads the textured model in working/)
BASE = ROOT / (ARGS[0] if ARGS else '.studio-workspaces/holm-keep-overhaul-v1/candidates')
OUT = ROOT / (ARGS[1] if len(ARGS) > 1 else '.studio-workspaces/holm-keep-overhaul-navigation-v1/candidates')
STEM = ARGS[2] if len(ARGS) > 2 else 'keep'
SHA = hashlib.sha256((BASE / (STEM + '.glb')).read_bytes()).hexdigest()
BUILD = json.loads((ROOT / '.studio-workspaces/holm-keep-overhaul-v1/candidates/keep.build.json').read_text())
assert (BASE / (STEM + '.blend')).exists()
bpy.ops.wm.open_mainfile(filepath=str(BASE / (STEM + '.blend')))
deps = bpy.context.evaluated_depsgraph_get()
verts = []; faces = []; labels = []; support_faces = []; support_labels = []
for ob in bpy.context.scene.objects:
    if ob.type != 'MESH' or not ob.name.startswith('Keep_'):
        continue
    eo = ob.evaluated_get(deps); me = eo.to_mesh(); me.calc_loop_triangles()
    offset = len(verts); vv = [eo.matrix_world @ v.co for v in me.vertices]; verts += vv
    for t in me.loop_triangles:
        f = tuple(offset + i for i in t.vertices); faces.append(f); labels.append(ob.name)
        n = (verts[f[1]] - verts[f[0]]).cross(verts[f[2]] - verts[f[0]])
        if n.length > 0:
            n = n.normalized()
            if n.z > .7 and ('Floor' in ob.name or 'Stair' in ob.name):
                support_faces.append(f); support_labels.append(ob.name)
    eo.to_mesh_clear()
terrain_path = ROOT / '.studio-workspaces/holm-overhaul-terrain-v2/working/assets/world/authoring/holm-overhaul.terrain.bundle.json'
terrain_bytes = terrain_path.read_bytes(); terrain = json.loads(terrain_bytes)
stride = terrain['width'] + 1
assert len(terrain['heights']) == stride * (terrain['depth'] + 1)
PX, PY, PZ = 87, 11, 35
for wz in range(18, 49):
    for wx in range(74, 102):
        offset = len(verts)
        for x, z in [(wx, wz), (wx + 1, wz), (wx, wz + 1), (wx + 1, wz + 1)]:
            verts.append(Vector((x - PX, -(z - PZ), terrain['heights'][z * stride + x] - PY)))
        for tri in [(0, 2, 1), (1, 2, 3)]:
            f = tuple(offset + i for i in tri); faces.append(f); labels.append('StagedTerrain'); support_faces.append(f); support_labels.append('StagedTerrain')
all_bvh = BVHTree.FromPolygons(verts, faces, all_triangles=True)
floor_bvh = BVHTree.FromPolygons(verts, support_faces, all_triangles=True)
R = .24; HEIGHT = 1.9; STEP = .24; SPACING = .05
foot = [(0, 0)] + [(R * math.cos(i * math.tau / 16), R * math.sin(i * math.tau / 16)) for i in range(16)]
counts = Counter(); failures = []; cache = {}


def heights(x, z):
    key = (round(x, 5), round(z, 5))
    if key in cache:
        return cache[key]
    out = []; top = 16
    for _ in range(60):
        hit = floor_bvh.ray_cast(Vector((x, -z, top)), Vector((0, 0, -1)), 34)
        if hit[0] is None:
            break
        y = hit[0].z
        if not out or abs(out[-1][0] - y) > .49:
            out.append((y, support_labels[hit[2]]))
        top = y - .002
    cache[key] = out
    return out


def stance(x, z, y, surface, edge_margin=0):
    nearby = []
    for dx, dz in foot:
        options = [h for h, s in heights(x + dx, z + dz) if abs(h - y) <= .49]
        if not options:
            return None, {'reason': 'footprint-support', 'x': x + dx, 'z': z + dz, 'y': y}
        nearby.append(max(options))
    base = max(nearby)
    if base - min(nearby) > .72:
        return None, {'reason': 'footprint-rise', 'x': x, 'z': z, 'y': y}
    # v7: a stance inside solid masonry (the gatehouse blocks, the curtain walls, walked on top) is no stance: the first
    # surface straight above it faces up (the solid's own top, or the walk laid over it)
    o = Vector((x, -z, base + .5))
    for _ in range(8):
        hit = all_bvh.ray_cast(o, Vector((0, 0, 1)), 30)
        if hit[0] is None:
            break
        if abs(hit[1].z) > .5:
            if hit[1].z > 0:
                return None, {'reason': 'inside-solid', 'x': x, 'z': z, 'y': y, 'object': labels[hit[2]]}
            break
        o = hit[0] + Vector((0, 0, .002))
    n = math.ceil((HEIGHT - 2 * R) / .08); gap = (HEIGHT - 2 * R) / n
    radius = math.sqrt(R * R + (gap / 2) ** 2) + edge_margin
    for i in range(n + 1):
        p = Vector((x, -z, base + R + i * gap + .004))
        nearest = all_bvh.find_nearest(p, radius)
        counts['capsuleSphereQueries'] += 1
        if nearest[0] is not None and nearest[3] < radius - .00001:
            return None, {'reason': 'capsule-obstruction', 'x': x, 'z': z, 'y': y, 'capsuleBase': base, 'object': labels[nearest[2]], 'distance': nearest[3]}
    return {'x': round(x, 5), 'y': round(y, 6), 'z': round(z, 5), 'capsuleBase': round(base, 6)}, None


nodes = []; tiles = {}; rejected = []
for xi in range(-12, 14):
    for zi in range(-16, 13):
        x = xi + .5; z = zi + .5
        for y, surface in heights(x, z):
            p, error = stance(x, z, y, surface)
            if error:
                rejected.append(error); continue
            ident = f'{xi}:{zi}:{len(tiles.get((xi, zi), []))}'
            node = dict(p, id=ident, surface=surface); nodes.append(node); tiles.setdefault((xi, zi), []).append(node)
lookup = {n['id']: n for n in nodes}; links = {n['id']: [] for n in nodes}; profiles = {}


def edge(a, b):
    previous = a['y']; profile = []
    steps = math.ceil(1 / SPACING)
    for i in range(steps + 1):
        t = i / steps; x = a['x'] + (b['x'] - a['x']) * t; z = a['z'] + (b['z'] - a['z']) * t
        choices = [(h, s) for h, s in heights(x, z) if abs(h - previous) <= STEP + .0001]
        if not choices:
            return None, {'reason': 'missing-step-support', 'x': x, 'z': z, 'y': previous, 'from': a['id'], 'to': b['id']}
        h, s = max(choices, key=lambda pair: pair[0])
        p, error = stance(x, z, h, s)
        if error:
            return None, dict(error, **{'from': a['id'], 'to': b['id']})
        profile.append(p); previous = h; counts['edgeSamples'] += 1
    if abs(previous - b['y']) > .051:
        return None, {'reason': 'different-floor-end', 'from': a['id'], 'to': b['id'], 'end': previous, 'target': b['y']}
    return profile, None


for (xi, zi), aa in tiles.items():
    for neighbor in [(xi + 1, zi), (xi, zi + 1)]:
        for a in aa:
            for b in tiles.get(neighbor, []):
                if abs(a['y'] - b['y']) > 1.25:
                    continue
                p, error = edge(a, b)
                if error:
                    failures.append(error); continue
                reverse, error = edge(b, a)
                if error:
                    failures.append(error); continue
                links[a['id']].append(b['id']); links[b['id']].append(a['id'])
                profiles[a['id'] + '|' + b['id']] = p


def closest(x, y, z, condition=lambda n: True):
    options = [n for n in nodes if condition(n)]
    return min(options, key=lambda n: (n['x'] - x) ** 2 + (n['z'] - z) ** 2 + 4 * (n['y'] - y) ** 2) if options else None


start = closest(2.5, -.025, 11.5)
seen = {start['id']}; queue = deque(seen)
while queue:
    for v in links[queue.popleft()]:
        if v not in seen:
            seen.add(v); queue.append(v)
F0, F1, F2, F3 = 0.0, 3.2, 6.4, 9.6
REQ = [('gate', 'Gate passage', 2.5, 0, 7.5), ('court', 'Grass courtyard', 1.5, -.025, 1.5), ('hall', 'Hall ground floor', -5.5, 0, .5),
       ('upper', 'Hall upper floor', -5.5, F1, -2.5), ('wallwalk', 'East wallwalk', 9.5, F1, .5), ('watch-lookout', 'High watch lookout', -6.5, F3, -10.5),
       ('east-lookout', 'East turret lookout', 10.5, F2, -5.5), ('undercroft', 'Undercroft trapdoor', -8.5, 0, .5),
       ('keep-beer', 'The ale board: take the beer (Keep_ServiceBeer_Tankard)', -4.5, 0, 3.5),
       ('barracks', 'Barracks mess (ground)', 1.5, 0, -7.5), ('chamber', "Warden's chamber (level two)", -6.5, F1, -5.5),
       ('solar', 'The solar (level two)', -6.5, F1, 4.5), ('dormitory', 'Dormitory over the barracks (level two)', 1.5, F1, -6.5),
       ('guardroom', 'Gatehouse guardroom (level two)', 2.5, F1, 5.5), ('walk-south', 'South wall walk (level two)', 6.5, F1, 4.5),
       ('walk-southwest', 'South-west wall walk (level two)', -2.5, F1, 4.5), ('watch-base', 'High watch base', -5.5, 0, -10.5),
       ('watch-l1', 'High watch, level two', -8.5, F1, -10.5), ('watch-l2', 'High watch, watch room', -8.5, F2, -10.5),
       ('turret-base', 'East turret base', 7.5, 0, -7.5), ('turret-l1', 'East turret, level two', 7.5, F1, -7.5)]
STAIRS = {s['climb']: s for s in BUILD['stairs'] if 'climb' in s}
for sid, s in STAIRS.items():
    REQ.append((sid + '-foot', 'Foot of ' + s['label'], s['foot'][0], s['foot'][1], s['foot'][2]))
    REQ.append((sid + '-head', 'Head of ' + s['label'], s['head'][0], s['head'][1], s['head'][2]))
targets = []
for ident, label, x, y, z in REQ:
    node = closest(x, y, z, lambda n: abs(n['y'] - y) < .35 and abs(n['x'] - x) < 2 and abs(n['z'] - z) < 2)
    exact = bool(node and abs(node['x'] - x) < .01 and abs(node['z'] - z) < .01)
    targets.append({'id': ident, 'label': label, 'nodeId': node['id'] if node else None, 'reachable': bool(node and node['id'] in seen), 'requestedLocal': [x, y, z], 'exact': exact})
tid = {t['id']: t['nodeId'] for t in targets}
climbs = [{'id': sid, 'label': 'Climb stairs (' + s['label'] + ')', 'footId': tid.get(sid + '-foot'), 'topId': tid.get(sid + '-head'), 'mesh': s['mesh']} for sid, s in STAIRS.items()]


def crosses(p, q, a, b):
    """Plan segments p-q and a-b intersect (proper crossing or touching)."""
    def orient(o, s, t):
        return (s[0] - o[0]) * (t[1] - o[1]) - (s[1] - o[1]) * (t[0] - o[0])
    d1, d2, d3, d4 = orient(a, b, p), orient(a, b, q), orient(p, q, a), orient(p, q, b)
    return d1 * d2 <= 0 and d3 * d4 <= 0


doors = []
for d in BUILD['doors']:
    hs = [l['hinge'] for l in d['leaves']]
    if len(hs) == 2:
        a, b = (hs[0][0], hs[0][2]), (hs[1][0], hs[1][2])
    else:
        h = hs[0]; w = d['leaves'][0]['width'] + .015
        yaw = d['leaves'][0]['closedYaw']
        a = (h[0], h[2]); b = (h[0] + math.cos(yaw) * w, h[2] - math.sin(yaw) * w)
    fy = d['floorY']
    ls = []
    for u, vs in links.items():
        for v in vs:
            if u < v:
                A_, B_ = lookup[u], lookup[v]
                if abs(A_['y'] - fy) < .4 and abs(B_['y'] - fy) < .4 and crosses((A_['x'], A_['z']), (B_['x'], B_['z']), a, b):
                    ls.append([u, v])
    doors.append({'id': d['id'], 'storey': d['storey'], 'section': d.get('section'), 'links': ls, 'leaves': [l['leaf'] for l in d['leaves']],
                  'pivots': [l['pivot'] for l in d['leaves']], 'startOpen': bool(d.get('startOpen')), 'lessonRoute': bool(d.get('lessonRoute'))})
for a, dests in links.items():
    for b in dests:
        assert a in links[b]
        assert abs(lookup[a]['x'] - lookup[b]['x']) + abs(lookup[a]['z'] - lookup[b]['z']) == 1
for key, profile in profiles.items():
    a, b = key.split('|')
    for sample, node in [(profile[0], lookup[a]), (profile[-1], lookup[b])]:
        assert abs(sample['capsuleBase'] - node['capsuleBase']) < .00002, (key, 'inconsistent capsule endpoint')
        assert abs(sample['y'] - node['y']) < .00002, (key, 'inconsistent support endpoint')
    for a, b in zip(profile, profile[1:]):
        assert abs(a['y'] - b['y']) <= STEP + .00002
        assert abs(a['x'] - b['x']) + abs(a['z'] - b['z']) <= SPACING + .00002
for n in nodes:
    assert all(math.isfinite(n[k]) for k in ['x', 'y', 'z', 'capsuleBase'])
report = {'nodes': len(nodes), 'undirectedEdges': len(profiles), 'reachableNodes': len(seen), 'targetsReachable': sum(t['reachable'] for t in targets), 'targetsTotal': len(targets),
          'climbs': sum(bool(c['footId'] and c['topId']) for c in climbs), 'doors': len(doors), 'doorsLinked': sum(bool(d['links']) for d in doors),
          'nodeRejections': dict(Counter(e['reason'] for e in rejected)), 'edgeRejections': dict(Counter(e['reason'] for e in failures)), 'queries': dict(counts),
          'complete': all(t['reachable'] for t in targets) and all(c['footId'] and c['topId'] for c in climbs),
          'invariants': ['Every adjacency is symmetric and exactly one cardinal tile.', 'Every edge is independently sampled in both directions at 0.05 m intervals.', 'Every center support rise between samples is at most 0.24 m.', 'Every profile endpoint matches its node raw support and capsule footbase within 0.00002 m.', 'All exported coordinates are finite.'],
          'geometryFindings': ['Connectivity is measured below; inspect current obstructions.json for any disconnected route.'],
          'limitations': ['Geometry navigation candidate, not runtime player proof.', 'Foot support is sampled at center and 16 circumference points. Capsule body is conservatively covered by sphere BVH tests at each edge sample, but lateral sweep between edge samples is not a continuous-volume proof.', 'capsuleBase is highest nearby supporting tread; y remains actual center-ray support. Follower must honor capsuleBase without linearly interpolating through risers.', 'Door leaves are measured standing open as modelled; doors[].links are the links a shut leaf would close.']}
data = {'schema': 'holm-keep-navigation-v1', 'modelSha256': SHA, 'terrainSha256': hashlib.sha256(terrain_bytes).hexdigest(), 'placement': {'x': PX, 'y': PY, 'z': PZ},
        'avatar': {'radius': R, 'height': HEIGHT}, 'edgeSampleSpacing': SPACING, 'nodes': nodes, 'links': links, 'profiles': profiles, 'startId': start['id'],
        'targets': targets, 'climbs': climbs, 'doors': doors, 'report': report}
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'navigation.json').write_text(json.dumps(data, separators=(',', ':')), encoding='utf-8')
(OUT / 'obstructions.json').write_text(json.dumps({'nodes': rejected, 'edges': failures}, indent=2), encoding='utf-8')
(OUT / 'REPORT.md').write_text('# Keep navigation extraction (overhaul, v7)\n\n' + json.dumps(report, indent=2) + '\n\nTargets:\n' + json.dumps(targets, indent=2) + '\n\nClimbs:\n' + json.dumps(climbs, indent=2) + '\n\nDoors:\n' + json.dumps(doors, indent=2) + '\n', encoding='utf-8')
print('[KEEP_NAVIGATION]', json.dumps(report), flush=True)
print('[KEEP_NAVIGATION_TARGETS]', json.dumps(targets), flush=True)
