"""Separate reversible stone skirt under the existing single-surface bay."""
import bpy,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'.studio-workspaces/holm-quest-lodge-v3/candidates/lodge.glb'
OUT=ROOT/'.studio-workspaces/holm-quest-foundation-v1/candidates'
assert hashlib.sha256(BASE.read_bytes()).hexdigest()=='a8d57474e1a5cd6f8e13214e57905cf3bacecdf8e1fcc14c5b0ea1393248b324'
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(BASE))
floor=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('Lodge_GroundFloor'))
actual=[floor.matrix_world@v.co for v in floor.data.vertices]
outline=[(5,0),(5.95,.55),(6.35,1.5),(5.95,2.45),(5,3)]
assert all(any(abs(v.x-x)<1e-5 and abs(v.y-y)<1e-5 and abs(v.z)<1e-5 for v in actual) for x,y in outline)
mat=next(m for m in bpy.data.materials if 'limestone' in m.name.lower()).copy()
for o in list(bpy.data.objects):bpy.data.objects.remove(o,do_unlink=True)
n=len(outline);vertices=[(x,y,z) for z in (0,-.18) for x,y in outline]
faces=[(i+n,(i+1)%n+n,(i+1)%n,i) for i in range(n)]+[tuple(reversed(range(n,2*n)))]
mesh=bpy.data.meshes.new('Bay foundation sides and bottom');mesh.from_pydata(vertices,[],faces);mesh.update()
cx=sum(x for x,y in outline)/n;cy=sum(y for x,y in outline)/n
assert all(p.normal.x*(p.center.x-cx)+p.normal.y*(p.center.y-cy)>0 for p in list(mesh.polygons)[:-1])
assert mesh.polygons[-1].normal.z<-.99
ob=bpy.data.objects.new('Lodge_BayFoundation',mesh);bpy.context.collection.objects.link(ob);mesh.materials.append(mat)
uv=mesh.uv_layers.new(name='UVMap')
for poly in mesh.polygons:
 for li in poly.loop_indices:
  p=mesh.vertices[mesh.loops[li].vertex_index].co
  uv.data[li].uv=((p.x if abs(poly.normal.x)<.7 else p.y)*.28,p.z*.28 if abs(poly.normal.z)<.7 else p.y*.28)
mesh.calc_loop_triangles();assert len(mesh.loop_triangles)==13
assert all(v.co.z<=0 and v.co.z>=-.180001 for v in mesh.vertices)
assert not any(all(abs(mesh.vertices[i].co.z)<1e-6 for i in poly.vertices) for poly in mesh.polygons)
OUT.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'foundation.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'foundation.glb'),export_format='GLB',export_animations=False)
contract={'schema':'holm-quest-foundation-v1','baseModelSha256':hashlib.sha256(BASE.read_bytes()).hexdigest(),'sha256':hashlib.sha256((OUT/'foundation.glb').read_bytes()).hexdigest(),'outlineBlenderXY':outline,'bottom':-.18,'top':0,'triangles':13,'topFace':False,'material':mat.name,'status':'authored separate candidate; visual acceptance pending'}
(OUT/'contract.json').write_text(json.dumps(contract,indent=2),encoding='utf8')
print('[LODGE_FOUNDATION] PASS',json.dumps(contract))
