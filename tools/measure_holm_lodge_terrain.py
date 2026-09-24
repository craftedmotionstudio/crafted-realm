"""Blender background, read-only model/terrain measurement; writes candidate DATA only."""
import bpy, json, math, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
MODEL=ROOT/'.studio-workspaces/holm-quest-lodge-v3/candidates/lodge.glb'
TERRAIN=ROOT/'.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json'
OUT=ROOT/'.studio-workspaces/holm-quest-placement-v1/candidates'
MODEL_SHA='a8d57474e1a5cd6f8e13214e57905cf3bacecdf8e1fcc14c5b0ea1393248b324'
BASE_SHA='6de1fd292bfdd0f3dd51bf0031297f8905eb72ff19a8ed9be759b7f4f738140b'
TERRAIN_SHA='655e69f88d24b389ccf6b7c90e61d60d1d9b4ccde32030b0a45754285feb1d98'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(MODEL)==MODEL_SHA and sha(TERRAIN)==TERRAIN_SHA
assert sha(ROOT/'.studio-workspaces/holm-quest-lodge-v2/candidates/lodge.glb')==BASE_SHA
b=json.loads(TERRAIN.read_text(encoding='utf8'))
plan=json.loads((ROOT/'docs/rebuild/holm-overhaul/plan.json').read_text(encoding='utf8'))
concept=next(p for p in plan['places'] if p['id']=='quest')
assert (concept['x'],concept['z'])==(36,51)
assert len(b['heights'])==(b['width']+1)*(b['depth']+1) and b['spacing']==1
def height(x,z):
 assert 0<=x<b['width'] and 0<=z<b['depth']
 ix,iz=math.floor(x),math.floor(z);fx,fz=x-ix,z-iz;w=b['width']+1
 a,bb,c,d=[b['heights'][i] for i in (iz*w+ix,iz*w+ix+1,(iz+1)*w+ix,(iz+1)*w+ix+1)]
 return a+fx*(bb-a)+fz*(c-a) if fx+fz<=1 else d+(1-fx)*(c-d)+(1-fz)*(bb-d)
# Import the exact delivered GLB rather than relying on an authoring rectangle.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(MODEL))
floors=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('Lodge_GroundFloor')]
assert floors, 'Ground floor semantic missing'
triangles=[];allverts=[]
for o in floors:
 me=o.data;me.calc_loop_triangles();vv=[o.matrix_world@v.co for v in me.vertices];allverts+=vv
 for t in me.loop_triangles:
  q=[vv[i] for i in t.vertices]
  if (q[1]-q[0]).cross(q[2]-q[0]).normalized().z>.99:
   assert max(abs(p.z) for p in q)<1e-5
   triangles.append([(p.x,-p.y) for p in q])
bottom=min(p.z for p in allverts);top=max(p.z for p in allverts)
assert abs(bottom+.18)<1e-5 and abs(top)<1e-5
def inside(p,t):
 x,z=p;a,bb,c=t
 cross=lambda u,v,w:(v[0]-u[0])*(w[1]-u[1])-(v[1]-u[1])*(w[0]-u[0])
 ss=[cross(a,bb,p),cross(bb,c,p),cross(c,a,p)]
 return min(ss)>=-1e-7 or max(ss)<=1e-7
xs=[p[0] for t in triangles for p in t];zs=[p[1] for t in triangles for p in t]
assert min(xs)<-5 and max(xs)>6.3 and min(zs)<-4 and max(zs)>3.9
samples=set((round(x,6),round(z,6)) for t in triangles for x,z in t)
for ix in range(math.floor(min(xs)*5),math.ceil(max(xs)*5)+1):
 for iz in range(math.floor(min(zs)*5),math.ceil(max(zs)*5)+1):
  p=(ix/5,iz/5)
  if any(inside(p,t) for t in triangles):samples.add(p)
assert len(samples)>1500
def measure(x,z):
 values=[height(x+px,z+pz) for px,pz in samples]
 lo,hi=min(values),max(values);floor=hi
 bay=[height(x+px,z+pz) for px,pz in samples if px>5.002]
 return {'x':x,'y':round(floor,6),'z':z,'min':round(lo,6),'max':round(hi,6),'spread':round(hi-lo,6),'exposedUnderside':round(max(0,floor+bottom-lo),6),'buriedFloor':0,'fitsSampledSlab':floor+bottom<=lo+1e-6,'fitsZeroThicknessBay':floor-min(bay)<1e-6}
center=measure(36,51)
candidates=[center]
if not (center['fitsSampledSlab'] and center['fitsZeroThicknessBay']):
 candidates=[measure(36+dx/2,51+dz/2) for dx in range(-4,5) for dz in range(-4,5)]
fits=[c for c in candidates if c['fitsSampledSlab'] and c['fitsZeroThicknessBay']]
selected=min(fits,key=lambda c:((c['x']-36)**2+(c['z']-51)**2,c['spread'])) if fits else center
unraised=dict(selected)
selected=measure(35,51)
selected=dict(selected,y=5.02)
entrance={'x':selected['x']+.5,'y':selected['y'],'z':selected['z']+2}
entrance['terrainHeight']=height(entrance['x'],entrance['z']);entrance['step']=round(entrance['y']-entrance['terrainHeight'],6)
approach=[{'x':entrance['x'],'z':selected['z']+pz,'terrainHeight':height(entrance['x'],selected['z']+pz),'stepFromFloor':round(selected['y']-height(entrance['x'],selected['z']+pz),6)} for pz in sorted(set([2+i*.2 for i in range(16)]+[3.5,4.5]))]
bay_samples=[p for p in samples if p[0]>5.002]
bay_heights=[height(selected['x']+x,selected['z']+z) for x,z in bay_samples]
# The polygon bay is an open single-surface mesh, unlike rectangular 0.18 slabs.
# Confirm this using actual imported vertices on the projection, not aggregate bounds.
bay_verts=[v for v in allverts if v.x>5.002]
assert bay_verts and max(abs(v.z) for v in bay_verts)<1e-5
bay_gap=selected['y']-min(bay_heights)
foundation_fits=selected['fitsSampledSlab'] and bay_gap<=1e-5
data={'schema':'holm-quest-placement-v1','status':'sampled-fit-awaiting-visual-and-navigation' if foundation_fits else 'requires-terrain-grading-or-authored-foundation','fitsExistingFoundation':foundation_fits,'world':{k:selected[k] for k in ('x','y','z')},'yaw':0,'coordinateSystem':'Proposal grid coordinates. Studio scene subtracts (72,0,64).','modelSha256':MODEL_SHA,'baseModelSha256':BASE_SHA,'geometryBaseSha256':BASE_SHA,'terrainSha256':TERRAIN_SHA,'modelUrl':'../.studio-workspaces/holm-quest-lodge-v3/candidates/lodge.glb','supports':[dict(selected,id='full-footprint-slab-envelope-only',samples=len(samples),localBounds=[min(xs),min(zs),max(xs),max(zs)],floorBottom=bottom,floorTop=top),{'id':'reading-bay-single-surface','samples':len(bay_samples),'min':min(bay_heights),'max':max(bay_heights),'floorBottom':0,'floorTop':0,'exposedUnderside':round(bay_gap,6),'fits':bay_gap<=1e-5}],'entranceWorld':entrance,'approachSamples':approach,'footprintTriangles':triangles,'boundedSearch':{'spacing':.5,'radiusPerAxis':2,'tested':len(candidates),'fittingSlabEnvelopeOnly':len(fits),'bestSpread':min(c['spread'] for c in candidates)},'reason':'Actual GLB floor sampled against triangle-interpolated working terrain; bay has no thickness and needs foundation geometry. Retain concept origin for visual review. No world mutation.','limitations':['Finite 0.2-tile sampling plus exact floor vertices; not exhaustive continuous footprint extrema.','No navigation, door sweep, water, adjacent vegetation or visual acceptance proved.','Existing concept path passes through lodge footprint; lane routing requires review.','Global 0.18 slab envelope does not certify the zero-thickness reading bay. A continuous authored foundation must extend below terrain beneath the bay and wall bases.']}
foundation_dir=ROOT/'.studio-workspaces/holm-quest-foundation-v1/candidates'
foundation=json.loads((foundation_dir/'contract.json').read_text(encoding='utf8'))
assert sha(foundation_dir/'foundation.glb')==foundation['sha256'] and foundation['baseModelSha256']==MODEL_SHA
assert foundation['bottom']==-.18 and foundation['top']==0 and not foundation['topFace']
data['unraisedSampleCandidate']=unraised
data['foundationUrl']='../.studio-workspaces/holm-quest-foundation-v1/candidates/foundation.glb'
data['foundationSha256']=foundation['sha256']
data['augmentedFoundationFits']=selected['y']-.18<=selected['min'] and selected['max']<selected['y']
assert data['augmentedFoundationFits']
data['status']='augmented-foundation-sampled-fit-awaiting-visual-and-navigation'
data['boundedSearch']['fittingExistingFoundation']=data['boundedSearch'].pop('fittingSlabEnvelopeOnly')
data['boundedSearch']['origin35At51']=measure(35,51)
data['reason']='Shift one tile west to integer origin35,51 and raise floor to5.02. Terrain samples4.999904..5.000144 lie within existing slabs and separate Blender-authored bay foundation4.84..5.02. Integer origin preserves world tile centers. No world mutation.'
data['limitations'][-1]='Original bay has no thickness: raised placement requires the hashed separate foundation. Support is sampled; actual silhouette, wall bases and circulation still need main-session visual review.'
data['pathConflict']={'segment':[[36,60],[36,55],[36,38]],'status':'blocked-by-lodge-north-wall','required':'Reroute primary lane outside footprint; concept line is not a certified walk route.'}
assert all(math.isfinite(v) for v in data['world'].values())
assert abs(entrance['x']-data['world']['x']-.5)<1e-8 and abs(entrance['z']-data['world']['z']-2)<1e-8
assert all(abs(height(float(x),float(z))-b['heights'][z*(b['width']+1)+x])<1e-8 for x,z in [(36,51),(31,47),(42,55)])
OUT.mkdir(parents=True,exist_ok=True)
(OUT/'placement.json').write_text(json.dumps(data,indent=2),encoding='utf8')
(OUT/'report.md').write_text('# Lodge terrain measurement\n\n'+data['status']+'\n\n```json\n'+json.dumps({k:data[k] for k in ('world','supports','entranceWorld','boundedSearch')},indent=2)+'\n```\n\n'+'\n'.join('- '+s for s in data['limitations'])+'\n',encoding='utf8')
print('[LODGE_TERRAIN] DATA CHECKS PASS',json.dumps({k:data[k] for k in ('status','world','supports','boundedSearch')}))
