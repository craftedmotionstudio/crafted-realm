"""Z-fighting fix pass (2026-09-25): open a model's source .blend, find visible coplanar overlaps with
holm_coplanar.analyze, move the overlay faces (holm_coplanar.fix) for up to eight passes, then save the .blend
and export the GLB with the building's own export settings. Walk surfaces are never moved; faces larger than
1.2 m2 (wall, roof and floor planes) are never moved either, so walking geometry and wall planes stay put.
Run: blender -b --python tools/blender/fix_holm_coplanar.py -- <in.blend> <out.blend> <out.glb> <profile> <report.json> [navigation.json]
profiles: guide kitchen lodge keep m44"""
import bpy,sys,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import holm_coplanar as C
a=sys.argv[sys.argv.index('--')+1:];src,oblend,oglb,prof,rep=Path(a[0]),Path(a[1]),Path(a[2]),a[3],Path(a[4])
# optional 6th argument: the building's current navigation.json; no face beside a stance is pushed sideways
NODES=None;nav=None
if len(a)>5:
 nav=json.loads(Path(a[5]).read_text());NODES=[(n['x'],-n['z'],n['y']) for n in nav['nodes']]
 # edge samples matter as much as stances: add the midpoint of every measured link
 byid={n['id']:n for n in nav['nodes']}
 for u,vs in nav.get('links',{}).items():
  for v in vs:
   if u<v and u in byid and v in byid:
    p,q=byid[u],byid[v];NODES.append(((p['x']+q['x'])/2,-(p['z']+q['z'])/2,min(p['y'],q['y'])))
bpy.ops.wm.open_mainfile(filepath=str(src))
bpy.context.scene.frame_set(bpy.context.scene.frame_start)
PREFIX={'guide':'','kitchen':'Kitchen_','lodge':'Lodge_','keep':'Keep_'}.get(prof)
if prof=='m44':
 root=next(o for o in bpy.data.objects if o.parent is None and o.type=='EMPTY')
 def desc(o):
  yield o
  for c in o.children:yield from desc(c)
 exp=list(desc(root))
else:exp=[o for o in bpy.data.objects if o.name.startswith(PREFIX) and o.type in ('MESH','EMPTY')]
meshes=[o for o in exp if o.type=='MESH']
C.apply_modifiers(meshes)
# fights are judged in every view the game shows (outside and each cutaway storey), not only from outside
VIEWS=C.building_views(prof,nav,meshes[0].name.split('_')[0] if prof=='m44' else None)
for o in meshes:
 if o.data.users>1:o.data=o.data.copy()
log={'profile':prof,'source':str(src),'views':[v['name'] for v in VIEWS],'passes':[]}
for it in range(8):
 fights=C.analyze(meshes,views=VIEWS);s=C.summary(fights)
 if not fights:log['passes'].append({'pass':it,**s});break
 moved,skipped=C.fix(fights,nodes=NODES)
 log.setdefault('movedFaces',[]).extend(moved)
 log['passes'].append({'pass':it,**s,'moved':len(moved),'skipped':len(skipped)})
 if not moved:break
final=C.analyze(meshes,views=VIEWS)
# stage 2: cut the covered part out of the face behind for pairs the push left (walk heights untouched)
import bmesh
def by_obj(fs):
 d={}
 for f in fs:
  for n in {f['a'],f['b']}:d[n]=d.get(n,0)+f['area']
 return d
for it in range(2):
 if not final:break
 area0=C.summary(final)['area'];b0=by_obj(final);keep={}
 for o in meshes:bm=bmesh.new();bm.from_mesh(o.data);keep[o.name]=bm
 carved,_=C.carve(final);new=C.analyze(meshes,views=VIEWS)
 # a part whose fighting area the cut did not reduce (thin stacked sheets) is put back as it was
 b1=by_obj(new);worse=[o for o in meshes if b1.get(o.name,0)>b0.get(o.name,0)+1e-9]
 for o in worse:keep[o.name].to_mesh(o.data);o.data.update()
 if worse:new=C.analyze(meshes,views=VIEWS)
 area1=C.summary(new)['area']
 if area1>=area0:
  for o in meshes:keep[o.name].to_mesh(o.data);o.data.update()
  new=final
 for bm in keep.values():bm.free()
 kept=[c for c in carved if c[0] not in {o.name for o in worse}] if area1<area0 else []
 log.setdefault('carved',[]).extend(kept);log['passes'].append({'carve':it,'faces':len(kept),'restored':[o.name for o in worse] if area1<area0 else 'all','area':[area0,area1]})
 final=new
 if not kept:break
log['after']=C.summary(final);log['residual']=sorted(final,key=lambda f:-f['area'])[:80]
oblend.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(oblend))
if prof=='guide':
 bpy.ops.export_scene.gltf(filepath=str(oglb),export_format='GLB',export_yup=True,export_extras=True)
else:
 bpy.ops.object.select_all(action='DESELECT')
 for o in exp:o.select_set(True)
 if prof=='kitchen':bpy.ops.export_scene.gltf(filepath=str(oglb),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_frame_range=True,export_force_sampling=True)
 elif prof=='lodge':bpy.ops.export_scene.gltf(filepath=str(oglb),export_format='GLB',export_yup=True,export_animations=True)
 elif prof=='keep':bpy.ops.export_scene.gltf(filepath=str(oglb),export_format='GLB',use_selection=True,export_yup=True,export_animations=False)
 else:
  bpy.context.view_layer.objects.active=root
  bpy.ops.export_scene.gltf(filepath=str(oglb),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_materials='EXPORT',export_extras=True,export_cameras=False,export_lights=False,export_animations=True)
rep.parent.mkdir(parents=True,exist_ok=True);rep.write_text(json.dumps(log,indent=1,default=str))
print('[ZFIX]',prof,json.dumps({k:v for k,v in log.items() if k!='residual'},default=str)[:1200])
