"""Derive a new versioned building candidate from an existing textured .blend by removing named parts (Holm v2 land,
2026-09-26: the survival camp loses its creek fishing stage now that fishing is taught at the Minnow Hollow pond).
Opens the source .blend (never saved over), deletes every object whose name matches `remove` (and its children), saves
the result to outBlend and exports outGlb with the same glTF settings the old-school texture recipe uses.
Run: blender -b --python tools/blender/derive_glb_without_parts.py -- spec.json
  spec: {"source": ".blend", "remove": "regex", "outBlend": ".blend", "outGlb": ".glb", "report": ".json"}"""
import bpy, json, re, sys, hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = json.loads((ROOT / sys.argv[sys.argv.index('--') + 1]).read_text())
bpy.ops.wm.open_mainfile(filepath=str(ROOT / SPEC['source']))
rx = re.compile(SPEC['remove'])
doomed = set()
for ob in bpy.data.objects:
    if rx.search(ob.name):
        doomed.add(ob)
        doomed.update(ob.children_recursive)
names = sorted(o.name for o in doomed)
for ob in list(doomed):
    bpy.data.objects.remove(ob, do_unlink=True)
out_blend = ROOT / SPEC['outBlend']; out_glb = ROOT / SPEC['outGlb']
out_glb.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out_blend), copy=True, compress=False)
bpy.ops.export_scene.gltf(filepath=str(out_glb), export_format='GLB', export_yup=True, export_extras=True)
tris = 0
for ob in bpy.data.objects:
    if ob.type == 'MESH':
        me = ob.data; me.calc_loop_triangles(); tris += len(me.loop_triangles)
rep = {'source': SPEC['source'], 'removed': names, 'triangles': tris, 'glbSha256': hashlib.sha256(out_glb.read_bytes()).hexdigest(),
       'blender': bpy.app.version_string}
(ROOT / SPEC['report']).write_text(json.dumps(rep, indent=1), encoding='utf-8')
print('[DERIVE]', json.dumps(rep))
