"""Read-only actual Blender extraction: v3 lodge, foundation, terrain, rest-pose habitat.
Reuses frozen v1 sampler without changing its tolerances. No live publication.
"""
import bpy, json, math, hashlib, struct
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(ROOT/'.studio-workspaces/holm-quest-lodge-v3/candidates/lodge.blend')=='4047f4015447c9dd0a200923afb1b3f14386259fc187d778de76a6964f680b2e'
assert sha(ROOT/'.studio-workspaces/holm-quest-door-v1/candidates/door.json')=='97f11a1310e73f074c7f6a18392e1fc686e498c0637ba1de7e227ab03a99ed56'
SOURCE=ROOT/'tools/blender/extract_holm_quest_navigation.py'
assert sha(SOURCE)=='40bfe5b04af161a05aad742e19720190ca5a2f87587b86c1ca7af5fe7b77aa72'
# Revalidate every geometry/animation accessor; no verifier output is written.
check=(ROOT/'tools/verify_holm_lodge_material.py').read_text(encoding='utf-8')
exec(compile(check[:check.index("(OUT/'material-verification.json').write_text")],'<geometry-equivalence>','exec'),{})
TERRAIN=ROOT/'.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json'
TSHA='655e69f88d24b389ccf6b7c90e61d60d1d9b4ccde32030b0a45754285feb1d98'
assert sha(TERRAIN)==TSHA
bundle=json.loads(TERRAIN.read_bytes()); origin={'x':35,'y':5.02,'z':51}
bounds={'minX':-9,'maxX':11,'minZ':-14,'maxZ':11}
def ground(x,z):
 ix=math.floor(x);iz=math.floor(z);fx=x-ix;fz=z-iz;w=bundle['width']+1
 a,b,c,d=[bundle['heights'][i] for i in [iz*w+ix,iz*w+ix+1,(iz+1)*w+ix,(iz+1)*w+ix+1]]
 return a+fx*(b-a)+fz*(c-a) if fx+fz<=1 else d+(1-fx)*(c-d)+(1-fz)*(b-d)
def add_environment():
 global terrain_data
 positions=[];indices=[];materials=[]
 offset=len(verts)
 for z in range(-14,12):
  for x in range(-9,12):
   y=bundle['heights'][(z+51)*145+x+35]-5.02
   positions.extend([x,y,z]);materials.append(bundle['materials'][(z+51)*145+x+35]);verts.append(Vector((x,-z,y)))
 for zi in range(25):
  for xi in range(20):
   a=zi*21+xi
   for tri in [(a,a+21,a+1),(a+1,a+21,a+22)]:
    indices.extend(tri);f=tuple(offset+i for i in tri);faces.append(f);labels.append('IslandTerrain');support_faces.append(f);support_labels.append('IslandTerrain')
 rest_geometry={}
 def imported(path,label,placement=None,include=True):
  # Read exported default node TRS directly. Blender's GLB importer evaluates animation
  # at the existing scene frame; clearing its action afterwards retains that pose.
  blob=path.read_bytes();length=struct.unpack_from('<I',blob,12)[0]
  g=json.loads(blob[20:20+length]);binary=blob[28+length:]
  assert not g.get('skins'), 'Skinned rest geometry needs separate treatment'
  def accessor(i):
   a=g['accessors'][i];assert not a.get('sparse') and not a.get('normalized')
   v=g['bufferViews'][a['bufferView']];assert v.get('buffer',0)==0
   n={'SCALAR':1,'VEC3':3}[a['type']];fmt={5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']]
   size=struct.calcsize('<'+fmt*n);stride=v.get('byteStride',size);off=v.get('byteOffset',0)+a.get('byteOffset',0)
   return [struct.unpack_from('<'+fmt*n,binary,off+j*stride) for j in range(a['count'])]
  identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
  def mul(a,b):return [sum(a[k*4+r]*b[c*4+k] for k in range(4)) for c in range(4) for r in range(4)]
  def matrix(node):
   if 'matrix' in node:return node['matrix']
   x,y,z,w=node.get('rotation',[0,0,0,1]);sx,sy,sz=node.get('scale',[1,1,1]);tx,ty,tz=node.get('translation',[0,0,0])
   return [(1-2*y*y-2*z*z)*sx,(2*x*y+2*z*w)*sx,(2*x*z-2*y*w)*sx,0,
    (2*x*y-2*z*w)*sy,(1-2*x*x-2*z*z)*sy,(2*y*z+2*x*w)*sy,0,
    (2*x*z+2*y*w)*sz,(2*y*z-2*x*w)*sz,(1-2*x*x-2*y*y)*sz,0,tx,ty,tz,1]
  parts=[];proof=[]
  def visit(index,parent):
   node=g['nodes'][index];m=mul(parent,matrix(node))
   if 'mesh' in node:
    for pi,prim in enumerate(g['meshes'][node['mesh']]['primitives']):
     assert prim.get('mode',4)==4 and not prim.get('targets'), 'Unsupported rest geometry'
     vv=[];flat=[]
     for x,y,z in accessor(prim['attributes']['POSITION']):
      xx=m[0]*x+m[4]*y+m[8]*z+m[12];yy=m[1]*x+m[5]*y+m[9]*z+m[13];zz=m[2]*x+m[6]*y+m[10]*z+m[14]
      flat.extend([xx,yy,zz]);vv.append(Vector((xx,-zz,yy)))
     ii=[v[0] for v in accessor(prim['indices'])] if 'indices' in prim else list(range(len(vv)))
     assert len(ii)%3==0 and all(0<=i<len(vv) for i in ii)
     parts.append((vv,[tuple(ii[j:j+3]) for j in range(0,len(ii),3)]))
     proof.append({'nodeIndex':index,'nodeName':node.get('name',''),'meshIndex':node['mesh'],'primitiveIndex':pi,'positions':flat,'indices':ii})
   for child in node.get('children',[]):visit(child,m)
  for index in g['scenes'][g.get('scene',0)]['nodes']:visit(index,identity)
  # Use original double-precision transformed coordinates for the render minY contract.
  min_y=min(mesh['positions'][i] for mesh in proof for i in range(1,len(mesh['positions']),3))
  if placement is not None:
   p=placement;s=p['scale'];c=math.cos(p['yaw']);q=math.sin(p['yaw']);root_y=ground(p['x'],p['z'])-min_y*s-5.02
   transform=lambda v:Vector((p['x']-35+s*(c*v.x-q*v.y),51-p['z']+s*(q*v.x+c*v.y),root_y+s*v.z))
   if include:rest_geometry[p['asset']]={'positions':[v for mesh in proof for v in mesh['positions']],'minY':min_y,'derivation':'Every default-scene primitive POSITION accessor transformed through exported node TRS hierarchy, without evaluating animation. Repeated primitive accessors are retained to match Three mesh traversal.'}
  else:transform=lambda v:v
  if placement is not None:
   assert max(math.hypot(v.x,v.y) for vv,ff in parts for v in vv)*placement['scale'] < 10, 'Habitat selection margin too small'
  for vv,ff in (parts if include else []):
   off=len(verts);verts.extend(transform(v) for v in vv)
   for f in ff:faces.append(tuple(off+i for i in f));labels.append(label)
  return min_y
 foundation=ROOT/'.studio-workspaces/holm-quest-foundation-v1/candidates/foundation.glb'
 assert sha(foundation)=='6ab1692c4e1fad24dc60ab5584d1d44dbe12353689ee63dd718d4c2c672d556c'
 imported(foundation,'LodgeFoundation')
 vegetation=ROOT/'.studio-workspaces/holm-habitat-v1/working/vegetation.json';all_rows=json.loads(vegetation.read_bytes())['placements']
 # Ten tiles conservatively exceed the largest source tree horizontal reach at selected scales.
 rows=[p for p in all_rows if 16<=p['x']<=56 and 27<=p['z']<=72];hashes={};mins={}
 for p in all_rows:
  path=ROOT/('.studio-workspaces/holm-tree-family-v2/candidates/'+p['asset']+'.glb')
  minimum=imported(path,'Habitat_'+p['id'],p,p in rows)
  if p in rows:hashes[p['asset']]=sha(path);mins[p['asset']]=minimum
 terrain_data={'schema':'holm-quest-terrain-surface-v1','positions':positions,'indices':indices,'materials':materials,'origin':origin,'terrainSha256':TSHA,'bounds':bounds,'heightGrid':{'width':bundle['width'],'depth':bundle['depth'],'heights':bundle['heights']},'habitat':{'placements':rows,'assetHashes':hashes,'sourceMinY':mins,'restGeometry':rest_geometry,'dataSha256':sha(vegetation),'pose':'exported rest pose; animated sweep not certified'},'foundationSha256':sha(foundation)}
src=SOURCE.read_text(encoding='utf-8')
src=src.replace("holm-quest-lodge-v2/candidates","holm-quest-lodge-v3/candidates").replace("holm-quest-navigation-v1/candidates","holm-quest-terrain-navigation-v1/candidates").replace('6de1fd292bfdd0f3dd51bf0031297f8905eb72ff19a8ed9be759b7f4f738140b','a8d57474e1a5cd6f8e13214e57905cf3bacecdf8e1fcc14c5b0ea1393248b324')
src=src.replace("assert (BASE/'contract.json').exists() and (BASE/'lodge.blend').exists()","assert (BASE/'material-contract.json').exists() and (BASE/'lodge.blend').exists()")
a=src.index('# Flat local Studio apron');b=src.index('all_bvh=')
src=src[:a]+'add_environment()\n'+src[b:]
src=src.replace('range(-8,8):','range(-9,11):',1).replace('range(-8,8):','range(-14,11):',1)
src=src.replace('start=closest(.5,-.02,3.5)',"start=closest(1.5,ground(36.5,60.5)-5.02,9.5,lambda n:abs(n['x']-1.5)<.01 and abs(n['z']-9.5)<.01 and abs(n['y']-(ground(36.5,60.5)-5.02))<.01)\nassert start is not None,'Exact south approach blocked'")
src=src.replace("('guest','Upstairs guest room',-3.5,3.3,.5)]","('guest','Upstairs guest room',-3.5,3.3,.5),('north-lane','North lane',1.5,ground(36.5,38.5)-5.02,-12.5)]")
src=src[:src.index("OUT.mkdir(parents=True")]
exec(compile(src,str(SOURCE),'exec'),globals())
# Derive an outside-only route: support must be island terrain and at least outside wall footprint.
north=targets[-1]['nodeId'];prev={start['id']:None};queue=deque(prev)
while queue:
 a=queue.popleft()
 for b in links[a]:
  if b not in prev and lookup[b]['surface']=='IslandTerrain':prev[b]=a;queue.append(b)
path=[]
if north in prev:
 cursor=north
 while cursor is not None:path.append(cursor);cursor=prev[cursor]
 path.reverse()
report['geometryFindings']=['Connectivity and rejected samples are recorded in report.md; no flat Studio apron remains.']
report['outsideLaneRouteFound']=bool(path);report['outsideLaneRoute']=path
report['geometryFindings'].append('Habitat and foundation use direct exported GLB rest node TRS/accessors, avoiding Blender importer animation evaluation. Render proof exports every primitive position in asset-root glTF coordinates.')
report['limitations'].append('Habitat obstacles use exported rest transforms only, not an animated breeze sweep; terrain patch and its boundary only, not whole island.')
data.update(origin=origin,terrainSha256=TSHA,bounds=bounds,geometryBaseSha256='6de1fd292bfdd0f3dd51bf0031297f8905eb72ff19a8ed9be759b7f4f738140b',surfaceContext='Actual island terrain patch, v3 lodge, bay foundation and exported rest-pose habitat')
OUT.mkdir(parents=True,exist_ok=True)
terrain_bytes=json.dumps(terrain_data,separators=(',',':'),allow_nan=False).encode();(OUT/'terrain.json').write_bytes(terrain_bytes)
data['renderDataUrl']='../.studio-workspaces/holm-quest-terrain-navigation-v1/candidates/terrain.json';data['renderDataSha256']=hashlib.sha256(terrain_bytes).hexdigest()
nav_bytes=json.dumps(data,separators=(',',':'),allow_nan=False).encode();(OUT/'navigation.json').write_bytes(nav_bytes)
# Original rigid-door cylinder remains valid: v3 changes textures only (geometry base checked by its asset verifier).
door=json.loads((ROOT/'.studio-workspaces/holm-quest-door-v1/candidates/door.json').read_bytes())
e=door['envelope'];av=door['avatar']
def safe(n):return n['capsuleBase']+av['height']+av['renderFootLift']<e['minY']-av['clearanceMargin'] or n['capsuleBase']>e['maxY']+av['clearanceMargin'] or math.hypot(n['x']-e['centerX'],n['z']-e['centerZ'])>e['radius']+av['radius']+av['clearanceMargin']
door.update(modelSha256=SHA,navigationSha256=hashlib.sha256(nav_bytes).hexdigest(),blendSha256=sha(BASE/'lodge.blend'),safeNodeIds=[n['id'] for n in nodes if safe(n)])
door['verification'].update(standingNodes=len(nodes),safeNodes=len(door['safeNodeIds']),startSafe=start['id'] in door['safeNodeIds'])
(OUT/'door.json').write_text(json.dumps(door,indent=2,allow_nan=False),encoding='utf-8')
(OUT/'report.md').write_text('# Lodge terrain navigation\n\n'+json.dumps(report,indent=2)+'\n\nTargets\n'+json.dumps(targets,indent=2)+'\n\nRejected samples (diagnostic)\n'+json.dumps({'nodes':rejected,'edges':failures},indent=2),encoding='utf-8')
print('[LODGE_TERRAIN_NAV]',json.dumps(report));print('[TARGETS]',json.dumps(targets));print('[HABITAT]',json.dumps({k:v for k,v in terrain_data['habitat'].items() if k!='restGeometry'}))
