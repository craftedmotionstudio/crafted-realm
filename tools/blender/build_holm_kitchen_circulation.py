"""Blender circulation repair: move stair flight north within the bakehouse.
Preserves exterior, materials, workstations and wall openings. Unpublished candidate.
"""
import bpy,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'.studio-workspaces/holm-kitchen-wings-v3/candidates'
OUT=ROOT/'.studio-workspaces/holm-kitchen-wings-v4/candidates'
assert hashlib.sha256((BASE/'kitchen-character.glb').read_bytes()).hexdigest()=='630e893e3efd7138a5cc8219db2e6cc78b56c0787e87a3de62cbd9a9477bf172'
bpy.ops.wm.open_mainfile(filepath=str(BASE/'kitchen-character.blend'))
OUT.mkdir(parents=True,exist_ok=True)
changed={}
for o in bpy.context.scene.objects:
 if o.type!='MESH' or not o.name.startswith('Kitchen_'):continue
 count=0
 for v in o.data.vertices:
  if o.name.startswith('Kitchen_Stair_') or (o.name.startswith('Kitchen_UpperFurnishing_') and v.co.x>-1.3):
   v.co.y+=.35;count+=1
  elif o.name.startswith('Kitchen_UpperFloor_') and -1.101<v.co.x<.651 and (abs(v.co.y+1.5)<.0001 or abs(v.co.y-3.2)<.0001):
   v.co.y+=.35;count+=1
 if count:o.data.update();changed[o.name]=count
production=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('Kitchen_')]
bpy.ops.object.select_all(action='DESELECT')
for o in production:o.select_set(True);o.hide_render=False;o.hide_set(False)
bpy.ops.export_scene.gltf(filepath=str(OUT/'kitchen-character.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=False)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'kitchen-character.blend'))
c=json.loads((BASE/'kitchen-character.contract.json').read_text(encoding='utf-8'))
c['schema']='holm.kitchen-character.v4';c['status']='Unpublished stair clearance repair; navigation and pointer QA pending'
c['circulationRepair']={'stairShiftBlenderY':.35,'changedMeshVertices':changed,'reason':'First stair railing blocked the cardinal entrance lane at local glTF z=1.5; south doorway lane at z=2.5 also clips jamb.'}
c['upperFloor']['aperture']=[-1.1,-1.15,.65,3.55]
for t in c['stairs']['treadTopCenters']:t['blender'][1]+=.35;t['gltf'][2]-=.35
c['stairs']['bottomLandingBlender']=[-.25,-1.75,0];c['stairs']['topLandingBlender']=[-.25,4.1,3.3]
c['groundApproach']['stairFirstEdgeY']=-.95
c['groundApproach']['clearSouthDepth']=1.895
c['groundApproach']['note']='Supersedes v2 nominal measurements; frozen mesh navigation is authoritative.'
c.pop('geometryMeasurements',None)
c['provenance']={'source':str(Path(__file__).relative_to(ROOT)),'sourceSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'baseBlendSha256':hashlib.sha256((BASE/'kitchen-character.blend').read_bytes()).hexdigest(),'baseModelSha256':'630e893e3efd7138a5cc8219db2e6cc78b56c0787e87a3de62cbd9a9477bf172','textureOrigin':'Inherited original v3 textures; no reference pixels copied','verificationScript':'tools/blender/verify_holm_kitchen_circulation.py'}
c['glb']['sha256']=hashlib.sha256((OUT/'kitchen-character.glb').read_bytes()).hexdigest();c['glb']['bytes']=(OUT/'kitchen-character.glb').stat().st_size
(OUT/'kitchen-character.contract.json').write_text(json.dumps(c,indent=2),encoding='utf-8')
print('[KITCHEN_CIRCULATION]',json.dumps(c['glb']),changed)
