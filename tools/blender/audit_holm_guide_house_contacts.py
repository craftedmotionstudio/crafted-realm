"""Read-only mesh-level contact diagnostics on the saved Blender candidate."""
import bpy,json,hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2]
import sys
# optional: blender -b --python audit_holm_guide_house_contacts.py -- <source.blend> <out.json>  (defaults: v1)
_args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
SOURCE=Path(_args[0]) if _args else ROOT/'.studio-workspaces/holm-guide-house-overhaul-v1/candidates/holm_guide_house_overhaul_v1.blend'
OUT_JSON=Path(_args[1]) if len(_args)>1 else None
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
def tree(objects):
 vertices=[];faces=[]
 for obj in objects:
  start=len(vertices);vertices.extend(obj.matrix_world@v.co for v in obj.data.vertices)
  faces.extend(tuple(start+i for i in p.vertices) for p in obj.data.polygons)
 return BVHTree.FromPolygons(vertices,faces,all_triangles=False)
static=[o for o in bpy.context.scene.objects if o.type=='MESH' and not o.name.startswith(('Door','HearthFlame','CellarHatchLid'))]
bpy.context.scene.frame_set(1);bpy.context.view_layer.update();environment=tree(static)
collisions=[]
for frame in range(1,26):
 bpy.context.scene.frame_set(frame);bpy.context.view_layer.update()
 for name in ['DoorNorthLeaf','DoorSouthLeaf']:
  hits=tree([bpy.data.objects[name]]).overlap(environment)
  if hits:collisions.append({'frame':frame,'leaf':name,'trianglePairs':len(hits)})
headroom=[]
layout=json.loads((ROOT/'docs/rebuild/holm-overhaul/arrival-layout.json').read_text());s=layout['stairs']
# Ray from each actual tread's standing height, along world up (Blender Z).
for i in range(12):
 z=s['startZ']-(i+.5)*s['treadRun'];y=(i+1)*s['riserHeight']
 location,normal,index,distance=environment.ray_cast(Vector((4.25,-z,y+.015)),Vector((0,0,1)),10)
 headroom.append({'tread':i+1,'clearance':None if location is None else round(distance+.015,5)})
minimum=min(h['clearance'] for h in headroom if h['clearance'] is not None)
# Probe the hole between tread edges so the upper floor cannot mask it.
upper=bpy.data.objects['UpperFloor'];floorTree=tree([upper]);opening=[]
for z in [s['endZ']+.2+i*(s['startZ']-s['endZ']-.4)/5 for i in range(6)]:
 hit=floorTree.ray_cast(Vector((4.25,-z,4)),Vector((0,0,-1)),2)
 opening.append({'z':z,'clear':hit[0] is None})
report={'sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'scope':'Candidate mesh intersection/headroom diagnostics; not live gameplay collision or full visual acceptance',
 'doorSweep':{'poses':25,'collisions':collisions},'stairHeadroom':headroom,'minimumStairHeadroom':minimum,'upperOpening':opening,
 'passed':not collisions and minimum>=2.2 and all(p['clear'] for p in opening)}
out=OUT_JSON or ROOT/'scratchpad/holm_guide_house_overhaul_v1/contact_diagnostics.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
if not report['passed']:raise RuntimeError('Guide-house mesh contact diagnostics failed; see report')
