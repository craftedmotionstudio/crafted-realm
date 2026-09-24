"""General stance-graph extractor for Tutor's Holm buildings (finish goal M4.4, Sept 13 base).
Generalises extract_holm_keep_navigation_v3.py: imports a building GLB (local space, origin = placement) with the
Sept 13 terrain around it into one BVH, probes every local tile centre for supports (floors, stairs, steps, decks
and terrain), keeps stances where a 1.9 x 0.24 capsule fits, and links cardinal neighbours whose edge is
independently sampled both ways every 0.05 with rises <= 0.24. Terrain over water is left out (the creek bed is
not walkable). Output schema is holm-keep-navigation-v1, so HolmIslandNav composes it like the keep/bakehouse/lodge.
Run: blender -b --python tools/blender/extract_holm_building_navigation.py -- docs/rebuild/holm-overhaul/buildings/<id>.nav.json
"""
import bpy,json,math,hashlib,sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from collections import Counter,deque
ROOT=Path(__file__).resolve().parents[2]
SPEC_PATH=ROOT/sys.argv[sys.argv.index('--')+1]
spec=json.loads(SPEC_PATH.read_text())
MODEL=ROOT/spec['model'];OUT=ROOT/spec['out'];P=spec['placement'];L=spec['local'];PREFIX=spec['prefix']
KEYS=spec.get('supportKeywords',['Floor','Stair','Step','Deck','Porch','Landing'])
model_bytes=MODEL.read_bytes();SHA=hashlib.sha256(model_bytes).hexdigest()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(MODEL))
deps=bpy.context.evaluated_depsgraph_get()
verts=[];faces=[];labels=[];support_faces=[];support_labels=[]
def owner_name(ob):
 q=ob
 while q is not None:
  if q.name.startswith(PREFIX):return q.name
  q=q.parent
 return ob.name
for ob in bpy.context.scene.objects:
 if ob.type!='MESH':continue
 name=owner_name(ob);eo=ob.evaluated_get(deps);me=eo.to_mesh();me.calc_loop_triangles()
 off=len(verts);verts+=[eo.matrix_world@v.co for v in me.vertices]
 for t in me.loop_triangles:
  f=tuple(off+i for i in t.vertices);faces.append(f);labels.append(name)
  n=(verts[f[1]]-verts[f[0]]).cross(verts[f[2]]-verts[f[0]]).normalized()
  if n.z>.7 and any(k in name for k in KEYS):support_faces.append(f);support_labels.append(name)
 eo.to_mesh_clear()
terrain_path=ROOT/'.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json'
terrain_bytes=terrain_path.read_bytes();terrain=json.loads(terrain_bytes);W=terrain['width'];stride=W+1
for wz in range(P['z']+L['z0']-1,P['z']+L['z1']+2):
 for wx in range(P['x']+L['x0']-1,P['x']+L['x1']+2):
  if wx<0 or wz<0 or wx>=W or wz>=terrain['depth']:continue
  off=len(verts)
  for x,z in [(wx,wz),(wx+1,wz),(wx,wz+1),(wx+1,wz+1)]:verts.append(Vector((x-P['x'],-(z-P['z']),terrain['heights'][z*stride+x]-P['y'])))
  wet=terrain['water'][wz*W+wx]!=0
  for tri in [(0,2,1),(1,2,3)]:
   f=tuple(off+i for i in tri);faces.append(f);labels.append('StagedTerrain')
   if not wet:support_faces.append(f);support_labels.append('StagedTerrain')
all_bvh=BVHTree.FromPolygons(verts,faces,all_triangles=True);floor_bvh=BVHTree.FromPolygons(verts,support_faces,all_triangles=True)
R=.24;HEIGHT=1.9;STEP=.24;SPACING=.05
foot=[(0,0)]+[(R*math.cos(i*math.tau/16),R*math.sin(i*math.tau/16)) for i in range(16)]
counts=Counter();failures=[];cache={}
def heights(x,z):
 key=(round(x,5),round(z,5))
 if key in cache:return cache[key]
 out=[];top=40
 for _ in range(60):
  hit=floor_bvh.ray_cast(Vector((x,-z,top)),Vector((0,0,-1)),80)
  if hit[0] is None:break
  y=hit[0].z
  if not out or abs(out[-1][0]-y)>.49:out.append((y,support_labels[hit[2]]))
  top=y-.002
 cache[key]=out;return out
def stance(x,z,y):
 near=[]
 for dx,dz in foot:
  o=[h for h,s in heights(x+dx,z+dz) if abs(h-y)<=.49]
  if not o:return None,{'reason':'footprint-support','x':x+dx,'z':z+dz,'y':y}
  near.append(max(o))
 base=max(near)
 if base-min(near)>.72:return None,{'reason':'footprint-rise','x':x,'z':z,'y':y}
 n=math.ceil((HEIGHT-2*R)/.08);gap=(HEIGHT-2*R)/n;radius=math.sqrt(R*R+(gap/2)**2)
 for i in range(n+1):
  p=Vector((x,-z,base+R+i*gap+.004));hit=all_bvh.find_nearest(p,radius);counts['capsuleSphereQueries']+=1
  if hit[0] is not None and hit[3]<radius-.00001:return None,{'reason':'capsule-obstruction','x':x,'z':z,'y':y,'object':labels[hit[2]]}
 return {'x':round(x,5),'y':round(y,6),'z':round(z,5),'capsuleBase':round(base,6)},None
nodes=[];tiles={};rejected=[]
for xi in range(L['x0'],L['x1']+1):
 for zi in range(L['z0'],L['z1']+1):
  x=xi+.5;z=zi+.5
  for y,surface in heights(x,z):
   p,err=stance(x,z,y)
   if err:rejected.append(err);continue
   ident=f'{xi}:{zi}:{len(tiles.get((xi,zi),[]))}';node=dict(p,id=ident,surface=surface);nodes.append(node);tiles.setdefault((xi,zi),[]).append(node)
lookup={n['id']:n for n in nodes};links={n['id']:[] for n in nodes};profiles={}
def edge(a,b):
 prev=a['y'];prof=[];steps=math.ceil(1/SPACING)
 for i in range(steps+1):
  t=i/steps;x=a['x']+(b['x']-a['x'])*t;z=a['z']+(b['z']-a['z'])*t
  ch=[(h,s) for h,s in heights(x,z) if abs(h-prev)<=STEP+.0001]
  if not ch:return None,{'reason':'missing-step-support','from':a['id'],'to':b['id']}
  h,s=max(ch,key=lambda q:q[0]);p,err=stance(x,z,h)
  if err:return None,dict(err,**{'from':a['id'],'to':b['id']})
  prof.append(p);prev=h;counts['edgeSamples']+=1
 if abs(prev-b['y'])>.051:return None,{'reason':'different-floor-end','from':a['id'],'to':b['id']}
 return prof,None
for (xi,zi),aa in tiles.items():
 for nb in [(xi+1,zi),(xi,zi+1)]:
  for a in aa:
   for b in tiles.get(nb,[]):
    if abs(a['y']-b['y'])>1.25:continue
    p,err=edge(a,b)
    if err:failures.append(err);continue
    r,err=edge(b,a)
    if err:failures.append(err);continue
    links[a['id']].append(b['id']);links[b['id']].append(a['id']);profiles[a['id']+'|'+b['id']]=p
def closest(x,y,z,cond=lambda n:True):
 o=[n for n in nodes if cond(n)];return min(o,key=lambda n:(n['x']-x)**2+(n['z']-z)**2+4*(n['y']-y)**2) if o else None
sx,sy,sz=spec['start'];start=closest(sx,sy,sz)
assert start,'no start stance'
seen={start['id']};q=deque(seen)
while q:
 for v in links[q.popleft()]:
  if v not in seen:seen.add(v);q.append(v)
targets=[]
for t in spec['targets']:
 x,y,z=t['at'];node=closest(x,y,z,lambda n:abs(n['y']-y)<.35 and abs(n['x']-x)<2 and abs(n['z']-z)<2)
 targets.append({'id':t['id'],'label':t['label'],'nodeId':node['id'] if node else None,'reachable':bool(node and node['id'] in seen),'requestedLocal':[x,y,z]})
for a,ds in links.items():
 for b in ds:assert a in links[b] and abs(lookup[a]['x']-lookup[b]['x'])+abs(lookup[a]['z']-lookup[b]['z'])==1
report={'nodes':len(nodes),'undirectedEdges':len(profiles),'reachableNodes':len(seen),'targetsReachable':sum(t['reachable'] for t in targets),'targetsTotal':len(targets),
 'nodeRejections':dict(Counter(e['reason'] for e in rejected)),'edgeRejections':dict(Counter(e['reason'] for e in failures)),'queries':dict(counts),'complete':all(t['reachable'] for t in targets),
 'method':'extract_holm_building_navigation.py (general form of the keep v3 extractor); terrain over water excluded'}
data={'schema':'holm-keep-navigation-v1','building':spec['id'],'modelSha256':SHA,'terrainSha256':hashlib.sha256(terrain_bytes).hexdigest(),'placement':{'x':P['x'],'y':P['y'],'z':P['z']},
 'avatar':{'radius':R,'height':HEIGHT},'edgeSampleSpacing':SPACING,'nodes':nodes,'links':links,'profiles':profiles,'startId':start['id'],'targets':targets,'report':report}
OUT.mkdir(parents=True,exist_ok=True)
(OUT/'navigation.json').write_text(json.dumps(data,separators=(',',':')),encoding='utf-8')
(OUT/'obstructions.json').write_text(json.dumps({'nodes':rejected[:400],'edges':failures[:400]},indent=1),encoding='utf-8')
print('[BUILDING_NAVIGATION]',spec['id'],json.dumps(report),flush=True)
print('[BUILDING_NAVIGATION_TARGETS]',json.dumps(targets),flush=True)
