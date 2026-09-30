"""Warden's Keep overhaul: the z-fighting pass (the passes of tools/blender/fix_holm_coplanar.py through the same library,
holm_coplanar, in the keep's cutaway views), exported with the glTF extras the overhaul's anchors and door pivots carry
(the shared tool's keep profile exports without them). Walk surfaces are never moved, faces over 1.2 m2 (wall, roof and
floor planes) are never moved, and no face beside a measured stance or link is pushed sideways.
Run: blender -b --python tools/blender/fix_holm_keep_overhaul_coplanar.py -- <in.blend> <out.blend> <out.glb> <report.json> <navigation.json>"""
import bpy, sys, json, bmesh
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import holm_coplanar as C
a = sys.argv[sys.argv.index('--') + 1:]
src, oblend, oglb, rep, navp = Path(a[0]), Path(a[1]), Path(a[2]), Path(a[3]), Path(a[4])
nav = json.loads(navp.read_text())
NODES = [(n['x'], -n['z'], n['y']) for n in nav['nodes']]
byid = {n['id']: n for n in nav['nodes']}
for u, vs in nav.get('links', {}).items():
    for v in vs:
        if u < v and u in byid and v in byid:
            p, q = byid[u], byid[v]; NODES.append(((p['x'] + q['x']) / 2, -(p['z'] + q['z']) / 2, min(p['y'], q['y'])))
bpy.ops.wm.open_mainfile(filepath=str(src))
bpy.context.scene.frame_set(bpy.context.scene.frame_start)
exp = [o for o in bpy.data.objects if o.name.startswith('Keep_') and o.type in ('MESH', 'EMPTY')]
meshes = [o for o in exp if o.type == 'MESH']
C.apply_modifiers(meshes)
VIEWS = C.building_views('keep', nav, None)
for o in meshes:
    if o.data.users > 1:
        o.data = o.data.copy()
log = {'profile': 'keep', 'source': str(src), 'views': [v['name'] for v in VIEWS], 'passes': []}
log['before'] = C.summary(C.analyze(meshes, views=VIEWS))
for it in range(8):
    fights = C.analyze(meshes, views=VIEWS); s = C.summary(fights)
    if not fights:
        log['passes'].append(dict(s, **{'pass': it})); break
    moved, skipped = C.fix(fights, nodes=NODES)
    log.setdefault('movedFaces', []).extend(moved)
    log['passes'].append(dict(s, **{'pass': it, 'moved': len(moved), 'skipped': len(skipped)}))
    if not moved:
        break
final = C.analyze(meshes, views=VIEWS)


def by_obj(fs):
    d = {}
    for f in fs:
        for n in {f['a'], f['b']}:
            d[n] = d.get(n, 0) + f['area']
    return d


for it in range(2):
    if not final:
        break
    area0 = C.summary(final)['area']; b0 = by_obj(final); keep = {}
    for o in meshes:
        bm = bmesh.new(); bm.from_mesh(o.data); keep[o.name] = bm
    carved, _ = C.carve(final); new = C.analyze(meshes, views=VIEWS)
    b1 = by_obj(new); worse = [o for o in meshes if b1.get(o.name, 0) > b0.get(o.name, 0) + 1e-9]
    for o in worse:
        keep[o.name].to_mesh(o.data); o.data.update()
    if worse:
        new = C.analyze(meshes, views=VIEWS)
    area1 = C.summary(new)['area']
    if area1 >= area0:
        for o in meshes:
            keep[o.name].to_mesh(o.data); o.data.update()
        new = final
    for bm in keep.values():
        bm.free()
    kept = [c for c in carved if c[0] not in {o.name for o in worse}] if area1 < area0 else []
    log.setdefault('carved', []).extend(kept)
    log['passes'].append({'carve': it, 'faces': len(kept), 'area': [area0, area1]})
    final = new
    if not kept:
        break
log['after'] = C.summary(final); log['residual'] = sorted(final, key=lambda f: -f['area'])[:80]
oblend.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(oblend))
bpy.ops.object.select_all(action='DESELECT')
for o in exp:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(oglb), export_format='GLB', use_selection=True, export_yup=True, export_extras=True, export_animations=False)
rep.parent.mkdir(parents=True, exist_ok=True); rep.write_text(json.dumps(log, indent=1, default=str))
print('[KEEP_ZFIX]', json.dumps({'before': log['before'].get('area'), 'after': log['after'].get('area'), 'fightsAfter': log['after'].get('fights')}))
