"""Leaded, tinted glazing on a finished Tutor's Holm building (owner review 4, 2026-09-27: "leaded, slightly tinted
glazing on every building's windows").

Opens the building's textured .blend (never modified: everything is saved to the NEW workspace in the spec) and, per spec:
  panes:    lays lead cames (an edge came and a diamond lattice) over every pane face of the building's own glazing
            objects (objects regex, faces by material regex); "glass": true re-dresses those faces in the tinted glass;
  recess:   a blind window (a dark recess face, the mill's) gets a tinted pane 2 cm proud of the recess, with cames;
  openings: a window left open in the wall (the mage tower's, the haven's) is found by casting rays through every wall
            face of the shell on a 5 cm grid: a window-sized rectangle of rays that pass through the wall, closed in by
            wall or frame on every side, gets a tinted pane at the depth of its frame and cames on both faces.
New objects are named per spec so they join the building's shell (clipped and hidden with it by the island cutaway).
Every existing object keeps its geometry (the orchestrator proves it); only the "glass" faces change material.
Glass and lead come from holm_leaded_glazing (the Guide House v6 and the Quest Lodge use the same).
Run: blender -b <source.blend> --python tools/blender/glaze_holm_windows.py -- <spec.json>"""
import bpy, bmesh, sys, json, math, re, hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
import holm_leaded_glazing as G

SPEC = json.loads((ROOT / sys.argv[sys.argv.index('--') + 1]).read_text())
GLASS, LEAD = G.materials()
UP = Vector((0, 0, 1))
report = {'id': SPEC['id'], 'panes': {}, 'recess': [], 'openings': [], 'objects': []}


def frame_of(n):
    """(uvec along, vvec up) for a vertical face normal."""
    v = UP - n * UP.dot(n)
    if v.length < 1e-4: return None
    v.normalize(); return v.cross(n).normalized(), v


def rect_of(pts, o, u, v):
    us = [(q - o).dot(u) for q in pts]; vs = [(q - o).dot(v) for q in pts]
    return min(us), max(us), min(vs), max(vs)


def box(V, F, o, u, v, n, u0, u1, v0, v1, t0, t1):
    """A thin slab over the rectangle, from t0 to t1 along n."""
    k = len(V)
    for t in (t0, t1):
        for a, b in ((u0, v0), (u1, v0), (u1, v1), (u0, v1)):
            V.append(o + u * a + v * b + n * t)
    F.extend([(k + 4, k + 5, k + 6, k + 7), (k + 3, k + 2, k + 1, k), (k, k + 1, k + 5, k + 4), (k + 1, k + 2, k + 6, k + 5),
              (k + 2, k + 3, k + 7, k + 6), (k + 3, k, k + 4, k + 7)])


def plan(p):   # Blender (x, y, z) -> plan (x east, y up, z south)
    return [round(p.x, 3), round(p.z, 3), round(-p.y, 3)]


objs = [o for o in bpy.data.objects if o.type == 'MESH']

# ---- 1. the building's own panes: cames over them (and the tinted glass when asked) ----
for rule in SPEC.get('panes', []):
    orx, mrx = re.compile(rule['objects']), re.compile(rule.get('materials', '.'))
    for ob in [o for o in objs if orx.search(o.name)]:
        me = ob.data; mw = ob.matrix_world; nm = mw.inverted().transposed().to_3x3()
        bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
        # a pane drawn as one face (a sheet) gets cames on both sides; a slab's faces each get them on their own side
        single = {f.index for f in bm.faces if all(len(e.link_faces) == 1 for e in f.edges)}
        bm.free()
        V, F, n_faces = [], [], 0
        gi = None
        for p in me.polygons:
            mat = me.materials[p.material_index] if p.material_index < len(me.materials) else None
            if not mat or not mrx.search(mat.name) or len(p.vertices) != 4: continue
            n = (nm @ p.normal).normalized()
            fr = frame_of(n)
            if fr is None or abs(n.z) > .2: continue
            u, v = fr; pts = [mw @ me.vertices[i].co for i in p.vertices]; o = pts[0]
            u0, u1, v0, v1 = rect_of(pts, o, u, v)
            if u1 - u0 < .08 or v1 - v0 < .08: continue
            G.lattice(V, F, o, u, v, n, u0, u1, v0, v1, sides=(1, -1) if p.index in single else (1,))
            n_faces += 1
            report.setdefault('paneAt', []).append({'at': plan(o + u * (u0 + u1) / 2 + v * (v0 + v1) / 2), 'n': plan(n), 'w': round(u1 - u0, 2), 'h': round(v1 - v0, 2)})
            if rule.get('glass'):
                if gi is None:
                    gi = me.materials.find(GLASS.name)
                    if gi < 0: me.materials.append(GLASS); gi = len(me.materials) - 1
                p.material_index = gi
        if F:
            lo = G.world_object(ob.name + 'Leads', V, F, LEAD, ob.parent); report['objects'].append(lo.name)
        report['panes'][ob.name] = n_faces

root = bpy.data.objects.get(SPEC.get('root', ''))
assert root is not None or not (SPEC.get('recess') or SPEC.get('openings')), 'no root ' + SPEC.get('root', '')

# ---- 2. blind windows: a tinted pane just proud of the dark recess, with cames ----
if SPEC.get('recess'):
    r = SPEC['recess']; orx, mrx = re.compile(r['objects']), re.compile(r['materials'])
    PV, PF, LV, LF = [], [], [], []
    for ob in [o for o in objs if orx.search(o.name)]:
        me = ob.data; mw = ob.matrix_world; nm = mw.inverted().transposed().to_3x3()
        for p in me.polygons:
            mat = me.materials[p.material_index] if p.material_index < len(me.materials) else None
            if not mat or not mrx.search(mat.name) or len(p.vertices) != 4: continue
            n = (nm @ p.normal).normalized(); fr = frame_of(n)
            if fr is None or abs(n.z) > .2: continue
            u, v = fr; pts = [mw @ me.vertices[i].co for i in p.vertices]; o = pts[0]
            u0, u1, v0, v1 = rect_of(pts, o, u, v)
            if u1 - u0 < .15 or v1 - v0 < .15: continue
            d = r.get('proud', .02)
            box(PV, PF, o, u, v, n, u0, u1, v0, v1, d, d + .012)
            G.lattice(LV, LF, o + n * (d + .012), u, v, n, u0, u1, v0, v1, sides=(1,))
            report['recess'].append({'at': plan(o + u * (u0 + u1) / 2 + v * (v0 + v1) / 2), 'n': plan(n), 'w': round(u1 - u0, 2), 'h': round(v1 - v0, 2)})
    if PF:
        report['objects'].append(G.world_object(r['name'], PV, PF, GLASS, root).name)
        report['objects'].append(G.world_object(r['name'] + 'Leads', LV, LF, LEAD, root).name)

# ---- 3. open windows: rays through the wall faces of the shell ----
if SPEC.get('openings'):
    q = SPEC['openings']; srx = re.compile(q['shell'])
    S, MAXD, EPS = q.get('step', .05), q.get('through', 1.0), .06
    shell = [o for o in objs if srx.search(o.name)]
    dg = bpy.context.evaluated_depsgraph_get()
    verts, polys, faces = [], [], []
    for ob in shell:
        eo = ob.evaluated_get(dg); me = eo.to_mesh(); mw = ob.matrix_world; b = len(verts)
        verts.extend(mw @ v.co for v in me.vertices)
        for p in me.polygons:
            idx = [b + i for i in p.vertices]; polys.append(idx)
            pts = [verts[i] for i in idx]
            n = (pts[1] - pts[0]).cross(pts[2] - pts[0])
            if n.length < 1e-9: continue
            n.normalize(); area = sum(((pts[i] - pts[0]).cross(pts[i + 1] - pts[0])).length for i in range(1, len(pts) - 1)) / 2
            if abs(n.z) < .08 and area > .002: faces.append((n, pts, area))
        eo.to_mesh_clear()
    bvh = BVHTree.FromPolygons(verts, polys)
    # wall planes: faces grouped by direction (1.5 degree bins) and offset (3 cm bins)
    groups = {}
    for n, pts, area in faces:
        ang = math.atan2(n.y, n.x); d = n.dot(pts[0])
        k = (round(ang / math.radians(1.5)), round(d / .03))
        g = groups.setdefault(k, {'n': Vector(), 'd': 0.0, 'area': 0.0, 'pts': []})
        g['n'] += n * area; g['d'] += d * area; g['area'] += area; g['pts'].extend(pts)
    found = []
    for g in groups.values():
        if g['area'] < q.get('minWall', 1.0): continue
        n = g['n'].normalized(); d = g['d'] / g['area']; fr = frame_of(n)
        if fr is None: continue
        u, v = fr; o = n * d
        us = [(p - o).dot(u) for p in g['pts']]; vs = [(p - o).dot(v) for p in g['pts']]
        U0, U1, V0, V1 = min(us), max(us), min(vs), max(vs)
        nu, nv = int((U1 - U0) / S), int((V1 - V0) / S)
        if nu < 3 or nv < 3: continue
        cell, depth = {}, {}
        for j in range(nv):
            for i in range(nu):
                P = o + u * (U0 + (i + .5) * S) + v * (V0 + (j + .5) * S)
                hit = bvh.ray_cast(P + n * EPS, -n, MAXD + EPS)
                if hit[0] is None: cell[i, j] = 2
                elif hit[3] < EPS + .015: cell[i, j] = 0
                else: cell[i, j] = 1; depth[i, j] = hit[3] - EPS
        seen = set()
        for start, val in cell.items():
            if val != 2 or start in seen: continue
            comp, stack = [], [start]; seen.add(start)
            while stack:
                c = stack.pop(); comp.append(c)
                for dd in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    e = (c[0] + dd[0], c[1] + dd[1])
                    if e not in seen and cell.get(e) == 2: seen.add(e); stack.append(e)
            i0, i1 = min(c[0] for c in comp), max(c[0] for c in comp); j0, j1 = min(c[1] for c in comp), max(c[1] for c in comp)
            w, h = (i1 - i0 + 1) * S, (j1 - j0 + 1) * S
            if not (q.get('minW', .22) <= w <= q.get('maxW', 1.8) and q.get('minH', .3) <= h <= q.get('maxH', 1.7)): continue
            if len(comp) < .75 * (i1 - i0 + 1) * (j1 - j0 + 1): continue
            ring = [(i, j0 - 1) for i in range(i0, i1 + 1)] + [(i, j1 + 1) for i in range(i0, i1 + 1)] + \
                   [(i0 - 1, j) for j in range(j0, j1 + 1)] + [(i1 + 1, j) for j in range(j0, j1 + 1)]
            if sum(1 for c in ring if cell.get(c, 2) == 2) > .1 * len(ring): continue   # not closed in: a gap at a wall's end
            ds = sorted(depth[c] for c in ring if c in depth)
            dp = (ds[len(ds) // 2] + .04) if ds else .08
            a0, a1 = U0 + i0 * S - .02, U0 + (i1 + 1) * S + .02
            b0, b1 = V0 + j0 * S - .02, V0 + (j1 + 1) * S + .02
            centre = o + u * (a0 + a1) / 2 + v * (b0 + b1) / 2 - n * dp
            found.append({'n': n, 'u': u, 'v': v, 'o': o - n * dp, 'r': (a0, a1, b0, b1), 'c': centre})
    # the same window found from both faces of its wall (or whole from a splayed inner reveal and in lights between the
    # mullions from outside): of any two parallel panes within a wall's thickness that overlap, keep the smaller
    def area(f): return (f['r'][1] - f['r'][0]) * (f['r'][3] - f['r'][2])
    def overlap(f, k):
        if abs(f['n'].dot(k['n'])) < .95 or abs((f['c'] - k['c']).dot(k['n'])) > MAXD + .1: return 0
        a0, a1, b0, b1 = f['r']
        cs = [f['o'] + f['u'] * a + f['v'] * b for a in (a0, a1) for b in (b0, b1)]
        us = [(c - k['o']).dot(k['u']) for c in cs]; vs = [(c - k['o']).dot(k['v']) for c in cs]
        du = min(max(us), k['r'][1]) - max(min(us), k['r'][0]); dv = min(max(vs), k['r'][3]) - max(min(vs), k['r'][2])
        return max(du, 0) * max(dv, 0)
    keep = []
    for f in sorted(found, key=area):
        if not any(overlap(f, k) > .3 * min(area(f), area(k)) for k in keep): keep.append(f)
    PV, PF, LV, LF = [], [], [], []
    for f in keep:
        a0, a1, b0, b1 = f['r']
        box(PV, PF, f['o'], f['u'], f['v'], f['n'], a0, a1, b0, b1, -.006, .006)
        G.lattice(LV, LF, f['o'], f['u'], f['v'], f['n'], a0, a1, b0, b1, sides=(1, -1), off=.01)
        report['openings'].append({'at': plan(f['c']), 'n': plan(f['n']), 'w': round(a1 - a0, 2), 'h': round(b1 - b0, 2)})
    if PF:
        report['objects'].append(G.world_object(q['name'], PV, PF, GLASS, root).name)
        report['objects'].append(G.world_object(q['name'] + 'Leads', LV, LF, LEAD, root).name)

# ---- save + export (the old-school recipe's settings) ----
out_blend = ROOT / SPEC['outBlend']; out_glb = ROOT / SPEC['outGlb']
out_blend.parent.mkdir(parents=True, exist_ok=True)
try: bpy.ops.file.pack_all()
except Exception as e: print('[GLAZE] pack_all:', e)
bpy.ops.wm.save_as_mainfile(filepath=str(out_blend), copy=True, compress=False)
bpy.ops.export_scene.gltf(filepath=str(out_glb), export_format='GLB', export_yup=True, export_extras=True)
data = out_glb.read_bytes()
report['glb'] = {'path': SPEC['outGlb'], 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
if SPEC.get('report'): (ROOT / SPEC['report']).write_text(json.dumps(report, indent=1) + '\n')
print('[GLAZE]', json.dumps({'id': SPEC['id'], 'panes': report['panes'], 'recess': len(report['recess']), 'openings': len(report['openings']), 'objects': report['objects'], 'glb': report['glb']}))
