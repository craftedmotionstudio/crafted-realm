"""Verify the v4 stair repair preserves every non-circulation mesh exactly."""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def snapshot(version):
 bpy.ops.wm.open_mainfile(filepath=str(ROOT/f'.studio-workspaces/holm-kitchen-wings-v{version}/candidates/kitchen-character.blend'))
 return {o.name: {'vertices':[tuple(o.matrix_world@v.co)for v in o.data.vertices], 'faces':[tuple(p.vertices)for p in o.data.polygons]}for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('Kitchen_')}
a=snapshot(3);b=snapshot(4);assert set(a)==set(b)
changed=[];preserved=[]
for name in a:
 assert a[name]['faces']==b[name]['faces'],name
 assert len(a[name]['vertices'])==len(b[name]['vertices']),name
 count=0
 for p,q in zip(a[name]['vertices'],b[name]['vertices']):
  if p==q:continue
  assert name.startswith(('Kitchen_Stair_','Kitchen_UpperFloor_','Kitchen_UpperFurnishing_')),name
  assert abs(q[0]-p[0])<1e-6 and abs(q[2]-p[2])<1e-6 and abs(q[1]-p[1]-.35)<1e-6,(name,p,q)
  count+=1
 (changed if count else preserved).append(name)
report={'pass':True,'preservedMeshes':preserved,'changedMeshes':changed,'invariants':['Every polygon index is identical.','All changed vertices move only +0.35 Blender Y.','Only stair, upper floor edge and aperture guard meshes change.','All exterior, material-family, workstation and ground-floor mesh positions are unchanged.']}
(ROOT/'.studio-workspaces/holm-kitchen-wings-v4/candidates/geometry-preservation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('[KITCHEN_GEOMETRY_PRESERVATION]',len(preserved),'unchanged meshes;',len(changed),'circulation meshes checked')
