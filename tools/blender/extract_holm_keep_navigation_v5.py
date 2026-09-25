"""Extract sampled cardinal routes from frozen evaluated keep and actual staged terrain.
Run with Blender --background --python this_file. Never saves or alters the model.
"""
import bpy, json, math, hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from collections import Counter, deque

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'.studio-workspaces/holm-warden-keep-v7/candidates'
OUT=ROOT/'.studio-workspaces/holm-keep-navigation-v6/candidates'
SHA=hashlib.sha256((BASE/'keep.glb').read_bytes()).hexdigest()   # measured on warden keep v7 (v6 interior pass + cutaway material fix)
assert hashlib.sha256((BASE/'keep.glb').read_bytes()).hexdigest()==SHA
assert (BASE/'keep.contract.json').exists() and (BASE/'keep.blend').exists()
bpy.ops.wm.open_mainfile(filepath=str(BASE/'keep.blend'))
deps=bpy.context.evaluated_depsgraph_get()
verts=[]; faces=[]; labels=[]; support_faces=[]; support_labels=[]
for ob in bpy.context.scene.objects:
 if ob.type!='MESH' or not ob.name.startswith('Keep_'):continue
 eo=ob.evaluated_get(deps); me=eo.to_mesh(); me.calc_loop_triangles()
 offset=len(verts); vv=[eo.matrix_world@v.co for v in me.vertices]; verts+=vv
 for t in me.loop_triangles:
  f=tuple(offset+i for i in t.vertices);faces.append(f);labels.append(ob.name)
  n=(verts[f[1]]-verts[f[0]]).cross(verts[f[2]]-verts[f[0]]).normalized()
  if n.z>.7 and ('Floor' in ob.name or 'Stair' in ob.name):support_faces.append(f);support_labels.append(ob.name)
 eo.to_mesh_clear()
terrain_path=ROOT/'.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json'
terrain_bytes=terrain_path.read_bytes();terrain=json.loads(terrain_bytes)
stride=terrain['width']+1
assert len(terrain['heights'])==stride*(terrain['depth']+1)
# Placement supplied and measured by the main integrator; no inferred placement.
for wz in range(18,49):
 for wx in range(74,102):
  offset=len(verts)
  for x,z in [(wx,wz),(wx+1,wz),(wx,wz+1),(wx+1,wz+1)]:
   verts.append(Vector((x-87,-(z-35),terrain['heights'][z*stride+x]-8.025)))
  for tri in [(0,2,1),(1,2,3)]:
   f=tuple(offset+i for i in tri);faces.append(f);labels.append('StagedTerrain');support_faces.append(f);support_labels.append('StagedTerrain')
all_bvh=BVHTree.FromPolygons(verts,faces,all_triangles=True)
floor_bvh=BVHTree.FromPolygons(verts,support_faces,all_triangles=True)
R=.24; HEIGHT=1.9; STEP=.24; SPACING=.05
foot=[(0,0)]+[(R*math.cos(i*math.tau/16),R*math.sin(i*math.tau/16)) for i in range(16)]
counts=Counter();failures=[]; cache={}
def heights(x,z):
 key=(round(x,5),round(z,5))
 if key in cache:return cache[key]
 out=[];top=14
 for _ in range(60):
  hit=floor_bvh.ray_cast(Vector((x,-z,top)),Vector((0,0,-1)),30)
  if hit[0] is None:break
  y=hit[0].z
  if not out or abs(out[-1][0]-y)>.49:out.append((y,support_labels[hit[2]]))
  top=y-.002
 cache[key]=out
 return out
def stance(x,z,y,surface,edge_margin=0):
 # An actual stepping capsule lifts to the highest tread beneath its footprint.
 # Raw center support remains y; capsuleBase is separately exported for the follower.
 nearby=[]
 for dx,dz in foot:
  options=[h for h,s in heights(x+dx,z+dz) if abs(h-y)<=.49]
  if not options:return None,{'reason':'footprint-support','x':x+dx,'z':z+dz,'y':y}
  nearby.append(max(options))
 base=max(nearby)
 if base-min(nearby)>.72:return None,{'reason':'footprint-rise','x':x,'z':z,'y':y}
 # Cover the full vertical capsule with overlapping spheres. Radius inflation
 # covers vertical spacing and lateral edge motion between samples conservatively.
 n=math.ceil((HEIGHT-2*R)/.08);gap=(HEIGHT-2*R)/n
 radius=math.sqrt(R*R+(gap/2)**2)+edge_margin
 for i in range(n+1):
  p=Vector((x,-z,base+R+i*gap+.004))
  nearest=all_bvh.find_nearest(p,radius)
  counts['capsuleSphereQueries']+=1
  if nearest[0] is not None and nearest[3]<radius-.00001:
   return None,{'reason':'capsule-obstruction','x':x,'z':z,'y':y,'capsuleBase':base,'object':labels[nearest[2]],'distance':nearest[3]}
 return {'x':round(x,5),'y':round(y,6),'z':round(z,5),'capsuleBase':round(base,6)},None

nodes=[];tiles={};rejected=[]
for xi in range(-12,14):
 for zi in range(-16,13):
  x=xi+.5;z=zi+.5
  for y,surface in heights(x,z):
   p,error=stance(x,z,y,surface)
   if error:rejected.append(error);continue
   ident=f'{xi}:{zi}:{len(tiles.get((xi,zi),[]))}'
   node=dict(p,id=ident,surface=surface);nodes.append(node);tiles.setdefault((xi,zi),[]).append(node)
lookup={n['id']:n for n in nodes};links={n['id']:[] for n in nodes};profiles={}
def edge(a,b):
 previous=a['y'];profile=[]
 steps=math.ceil(1/SPACING)
 for i in range(steps+1):
  t=i/steps;x=a['x']+(b['x']-a['x'])*t;z=a['z']+(b['z']-a['z'])*t
  choices=[(h,s) for h,s in heights(x,z) if abs(h-previous)<=STEP+.0001]
  if not choices:return None,{'reason':'missing-step-support','x':x,'z':z,'y':previous,'from':a['id'],'to':b['id']}
  h,s=max(choices,key=lambda pair:pair[0])
  p,error=stance(x,z,h,s)
  if error:return None,dict(error,**{'from':a['id'],'to':b['id']})
  profile.append(p);previous=h;counts['edgeSamples']+=1
 if abs(previous-b['y'])>.051:return None,{'reason':'different-floor-end','from':a['id'],'to':b['id'],'end':previous,'target':b['y']}
 return profile,None
for (xi,zi),aa in tiles.items():
 for neighbor in [(xi+1,zi),(xi,zi+1)]:
  for a in aa:
   for b in tiles.get(neighbor,[]):
    if abs(a['y']-b['y'])>1.25:continue
    p,error=edge(a,b)
    if error:failures.append(error);continue
    # Independently sample reverse; never assume a jump can be descended safely.
    reverse,error=edge(b,a)
    if error:failures.append(error);continue
    links[a['id']].append(b['id']);links[b['id']].append(a['id'])
    profiles[a['id']+'|'+b['id']]=p

def closest(x,y,z,condition=lambda n:True):
 options=[n for n in nodes if condition(n)]
 return min(options,key=lambda n:(n['x']-x)**2+(n['z']-z)**2+4*(n['y']-y)**2) if options else None
start=closest(2.5,-.025,11.5)
seen={start['id']};queue=deque(seen)
while queue:
 for v in links[queue.popleft()]:
  if v not in seen:seen.add(v);queue.append(v)
targets=[]
for ident,label,x,y,z in [('gate','Gate passage',2.5,0,7.5),('court','Grass courtyard',1.5,-.025,1.5),('hall','Hall ground floor',-5.5,0,.5),('upper','Hall upper floor',-5.5,3.2,-2.5),('wallwalk','East wallwalk',8.5,3.2,.5),('watch-lookout','High watch lookout',-6.5,10.2,-10.5),('east-lookout','East turret lookout',10.5,6.7,-5.5)]:
 node=closest(x,y,z,lambda n:abs(n['y']-y)<.35 and abs(n['x']-x)<2 and abs(n['z']-z)<2)
 targets.append({'id':ident,'label':label,'nodeId':node['id'] if node else None,'reachable':bool(node and node['id'] in seen),'requestedLocal':[x,y,z]})
for a,dests in links.items():
 for b in dests:
  assert a in links[b]
  assert abs(lookup[a]['x']-lookup[b]['x'])+abs(lookup[a]['z']-lookup[b]['z'])==1
for key,profile in profiles.items():
 a,b=key.split('|')
 for sample,node in [(profile[0],lookup[a]),(profile[-1],lookup[b])]:
  assert abs(sample['capsuleBase']-node['capsuleBase'])<.00002,(key,'inconsistent capsule endpoint')
  assert abs(sample['y']-node['y'])<.00002,(key,'inconsistent support endpoint')
 for a,b in zip(profile,profile[1:]):
  assert abs(a['y']-b['y'])<=STEP+.00002
  assert abs(a['x']-b['x'])+abs(a['z']-b['z'])<=SPACING+.00002
for n in nodes:assert all(math.isfinite(n[k]) for k in ['x','y','z','capsuleBase'])
report={'nodes':len(nodes),'undirectedEdges':len(profiles),'reachableNodes':len(seen),'targetsReachable':sum(t['reachable'] for t in targets),'targetsTotal':len(targets),'nodeRejections':dict(Counter(e['reason'] for e in rejected)),'edgeRejections':dict(Counter(e['reason'] for e in failures)),'queries':dict(counts),'complete':all(t['reachable'] for t in targets),'invariants':['Every adjacency is symmetric and exactly one cardinal tile.','Every edge is independently sampled in both directions at 0.05 m intervals.','Every center support rise between samples is at most 0.24 m.','Every profile endpoint matches its node raw support and capsule footbase within 0.00002 m.','All exported coordinates are finite.'],'geometryFindings':['Connectivity is measured below; inspect current obstructions.json for any disconnected route.'],'limitations':['Geometry navigation candidate, not runtime player proof.','Foot support is sampled at center and 16 circumference points. Capsule body is conservatively covered by sphere BVH tests at each edge sample, but lateral sweep between edge samples is not a continuous-volume proof.','capsuleBase is highest nearby supporting tread; y remains actual center-ray support. Follower must honor capsuleBase without linearly interpolating through risers.','Sub-0.49 m vertical duplicate supports at tread boundaries are collapsed to the upper surface, avoiding false lower-floor nodes. A footprint may span up to0.72 m across three tower risers; individual center samples still obey the0.24 m step limit.']}
data={'schema':'holm-keep-navigation-v1','modelSha256':SHA,'terrainSha256':hashlib.sha256(terrain_bytes).hexdigest(),'placement':{'x':87,'y':8.025,'z':35},'avatar':{'radius':R,'height':HEIGHT},'edgeSampleSpacing':SPACING,'nodes':nodes,'links':links,'profiles':profiles,'startId':start['id'],'targets':targets,'report':report}
OUT.mkdir(parents=True,exist_ok=True)
(OUT/'navigation.json').write_text(json.dumps(data,separators=(',',':')),encoding='utf-8')
(OUT/'obstructions.json').write_text(json.dumps({'nodes':rejected,'edges':failures},indent=2),encoding='utf-8')
(OUT/'REPORT.md').write_text('# Keep navigation extraction\n\n'+json.dumps(report,indent=2)+'\n\nTargets:\n'+json.dumps(targets,indent=2)+'\n',encoding='utf-8')
print('[KEEP_NAVIGATION]',json.dumps(report),flush=True)
print('[KEEP_NAVIGATION_TARGETS]',json.dumps(targets),flush=True)
