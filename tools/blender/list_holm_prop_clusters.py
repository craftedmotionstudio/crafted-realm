"""Inventory of the loose pieces in a building's prop meshes (props pass, 2026-09-28): every connected island of the
named objects, grouped into clusters of islands whose plan boxes touch (a table and its legs, a barrel and its
hoops), with plan bounds (x east, y up, z south, building-local), triangles and materials.
Run: blender -b <building.blend> --python tools/blender/list_holm_prop_clusters.py -- <object regex> <out.json> [gap]"""
import bpy, bmesh, json, re, sys
from pathlib import Path
a = sys.argv[sys.argv.index('--') + 1:]
rx, out = re.compile(a[0]), Path(a[1])
GAP = float(a[2]) if len(a) > 2 else .02
result = {}
for o in bpy.data.objects:
    if o.type != 'MESH' or not rx.search(o.name):
        continue
    bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
    mw = o.matrix_world
    seen = set(); isl = []
    for f in bm.faces:
        if f.index in seen:
            continue
        st = [f]; seen.add(f.index); fs = []
        while st:
            g = st.pop(); fs.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h.index not in seen:
                        seen.add(h.index); st.append(h)
        ws = [mw @ v.co for g in fs for v in g.verts]
        b = [min(w.x for w in ws), max(w.x for w in ws), min(w.z for w in ws), max(w.z for w in ws), -max(w.y for w in ws), -min(w.y for w in ws)]
        mats = sorted({o.data.materials[g.material_index].name if g.material_index < len(o.data.materials) and o.data.materials[g.material_index] else '-' for g in fs})
        isl.append({'b': b, 'tris': sum(len(g.verts) - 2 for g in fs), 'mats': mats})
    bm.free()
    # cluster touching boxes (union-find)
    par = list(range(len(isl)))
    def find(i):
        while par[i] != i:
            par[i] = par[par[i]]; i = par[i]
        return i
    def touch(p, q):
        return all(p[2 * k] <= q[2 * k + 1] + GAP and q[2 * k] <= p[2 * k + 1] + GAP for k in range(3))
    for i in range(len(isl)):
        for j in range(i + 1, len(isl)):
            if touch(isl[i]['b'], isl[j]['b']):
                par[find(j)] = find(i)
    groups = {}
    for i, s in enumerate(isl):
        groups.setdefault(find(i), []).append(s)
    cl = []
    for g in groups.values():
        b = [min(s['b'][0] for s in g), max(s['b'][1] for s in g), min(s['b'][2] for s in g), max(s['b'][3] for s in g), min(s['b'][4] for s in g), max(s['b'][5] for s in g)]
        cl.append({'x': [round(b[0], 3), round(b[1], 3)], 'y': [round(b[2], 3), round(b[3], 3)], 'z': [round(b[4], 3), round(b[5], 3)],
                   'islands': len(g), 'tris': sum(s['tris'] for s in g), 'mats': sorted({m for s in g for m in s['mats']})})
    cl.sort(key=lambda c: (c['y'][0] > 2.5, c['x'][0], c['z'][0]))
    result[o.name] = cl
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(result, indent=1))
for k, v in result.items():
    print('==', k, len(v), 'clusters')
    for c in v:
        print('  x%6.2f..%6.2f y%5.2f..%5.2f z%6.2f..%6.2f  %4d tris %2d isl  %s' % (c['x'][0], c['x'][1], c['y'][0], c['y'][1], c['z'][0], c['z'][1], c['tris'], c['islands'], ', '.join(c['mats'])[:110]))
