"""Additive, unpublished bakehouse supplies. Existing v4 meshes/materials stay exact."""
import bpy, json, math, hashlib, struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'.studio-workspaces/holm-kitchen-wings-v4/candidates'
OUT=ROOT/'.studio-workspaces/holm-kitchen-wings-v5/candidates'
EXPECTED='fa911f4634af7dd959d03430b25eb5765328cc46d52e792b4e2c944a87cc597e'
assert hashlib.sha256((BASE/'kitchen-character.glb').read_bytes()).hexdigest()==EXPECTED
bpy.ops.wm.open_mainfile(filepath=str(BASE/'kitchen-character.blend'))
OUT.mkdir(parents=True,exist_ok=True)
def signature(o):
 return {'matrix':list(map(list,o.matrix_world)), 'vertices':[list(v.co) for v in o.data.vertices], 'faces':[(list(p.vertices),p.material_index,p.use_smooth) for p in o.data.polygons], 'materials':[m.name for m in o.data.materials], 'uv':[[list(d.uv) for d in l.data] for l in o.data.uv_layers]}
original={o.name:signature(o) for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('Kitchen_')}
material_ids={m.name:m.as_pointer() for m in bpy.data.materials}
WOOD=bpy.data.materials['Smoked oak']; IRON=bpy.data.materials['Iron']; CLAY=bpy.data.materials['Kitchen pottery']
groups={}
def mesh(name,verts,faces,mat):
 m=bpy.data.meshes.new(name); m.from_pydata(verts,[],faces);m.update()
 o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o);m.materials.append(mat)
 uv=m.uv_layers.new(name='UVMap')
 for p in m.polygons:
  for li in p.loop_indices:
   v=m.vertices[m.loops[li].vertex_index].co;uv.data[li].uv=(v.x*.8,v.z*.8+v.y*.1)
 groups.setdefault((name.split('__')[0],mat.name),[]).append(o)
 return o
def box(name,c,s,mat):
 vs=[(c[0]+x*s[0]/2,c[1]+y*s[1]/2,c[2]+z*s[2]/2) for x,y,z in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
 return mesh(name,vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat)
def hollow(name,c,r,h,mat,n=12):
 # Each stave has a small seam, inward surface and solid rim; open center, closed base.
 for i in range(n):
  a=2*math.pi*(i+.016)/n;b=2*math.pi*(i+.984)/n
  vs=[]
  for z,rr in [(0,r*.8),(h,r),(h,r-.035),(.045,r*.8-.035)]:
   for t in [a,b]:vs.append((c[0]+math.cos(t)*rr,c[1]+math.sin(t)*rr,c[2]+z))
  mesh(name+'__stave'+str(i),vs,[(0,1,3,2),(2,3,5,4),(4,5,7,6),(0,2,4,6),(1,7,5,3),(0,6,7,1)],mat)
 disk(name+'__bottom',(c[0],c[1],c[2]+.045),r*.8-.025,mat,n)
def disk(name,c,r,mat,n=12):
 vs=[c]+[(c[0]+r*math.cos(i*math.tau/n),c[1]+r*math.sin(i*math.tau/n),c[2]) for i in range(n)]
 return mesh(name,vs,[(0,1+i,1+(i+1)%n) for i in range(n)],mat)
def hoop(name,c,r,width,mat,n=12):
 vs=[]
 for z,rr in [(-width/2,r), (width/2,r), (width/2,r-.016), (-width/2,r-.016)]:
  vs += [(c[0]+rr*math.cos(i*math.tau/n),c[1]+rr*math.sin(i*math.tau/n),c[2]+z) for i in range(n)]
 fs=[]
 for a,b in [(0,1),(1,2),(2,3),(3,0)]:
  for i in range(n):j=(i+1)%n;fs.append((a*n+i,a*n+j,b*n+j,b*n+i))
 return mesh(name,vs,fs,mat)
box('Kitchen_SupplyBuckets__rack',(4.325,1.55,.20),(1.44,.66,.10),WOOD)
for x in [3.73,4.92]:
 for y in [1.32,1.78]:box('Kitchen_SupplyBuckets__foot',(x,y,.075),(.09,.09,.15),WOOD)
for idx,x in enumerate([4.0,4.65]):
 hollow('Kitchen_SupplyBuckets',(x,1.55,.25),.245,.43,WOOD,10)
 for z in [.34,.60]:
  r=.245*(.8+.2*(z-.25)/.43)+.01;hoop('Kitchen_SupplyBuckets',(x,1.55,z),r,.048,IRON,10)
 # Rigid upright iron bail makes an unmistakable carrying bucket silhouette.
 for side in [-1,1]:box('Kitchen_SupplyBuckets__bail',(x+side*.238,1.55,.72),(.027,.035,.24),IRON)
 box('Kitchen_SupplyBuckets__grip',(x,1.55,.84),(.50,.045,.035),WOOD)
# Existing loaves reach x=-4.02. This bowl stops at -4.115, leaving a measured gap.
hollow('Kitchen_SupplyDoughBowl',(-4.38,-1.55,1.02),.265,.15,CLAY,12)
hollow('Kitchen_SupplyWaterButt',(5.45,1.55,0),.31,.85,WOOD,12)
for z in [.14,.68]:hoop('Kitchen_SupplyWaterButt',(5.45,1.55,z),.31*(.8+.2*z/.85)+.01,.065,IRON,12)
# New matte water only; no original material datablock is edited.
water=bpy.data.materials.new('Supply water slate blue');water.diffuse_color=(.27,.38,.42,1);water.use_nodes=True
bs=water.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=water.diffuse_color;bs.inputs['Roughness'].default_value=.86
surface=disk('Kitchen_SupplyWaterSurface',(0,0,0),.259,water,12);surface.location=(5.45,1.55,.72)
scene=bpy.context.scene;scene.render.fps=24;scene.frame_start=1;scene.frame_end=49
for frame in range(1,50,3):
 phase=math.tau*(frame-1)/48
 surface.location.z=.72+.002*math.sin(phase);s=1+.004*math.sin(phase);surface.scale=(s,s,1)
 surface.keyframe_insert(data_path='location',frame=frame);surface.keyframe_insert(data_path='scale',frame=frame)
surface.animation_data.action.name='SupplyWaterQuietLoop'
for layer in surface.animation_data.action.layers:
 for strip in layer.strips:
  for bag in strip.channelbags:
   for fc in bag.fcurves:
    for k in fc.keyframe_points:k.interpolation='LINEAR'
scene.frame_set(1)
# Merge static parts by semantic and material. Keep animated surface independent.
added=[]
for (semantic,matname),objects in groups.items():
 if surface in objects:added.append(surface);continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.object.join();o=bpy.context.object;o.name=semantic+'_'+matname.replace(' ','_');added.append(o)
assert all(signature(bpy.data.objects[name])==sig for name,sig in original.items()),'Original mesh changed'
assert all(bpy.data.materials[name].as_pointer()==p for name,p in material_ids.items()),'Original material replaced'
def bounds(o):
 vv=[o.matrix_world@v.co for v in o.data.vertices]
 return {'min':[min(v[i] for v in vv) for i in range(3)],'max':[max(v[i] for v in vv) for i in range(3)]}
bpy.context.view_layer.update()
added_data=[]
for o in added:
 o.data.calc_loop_triangles();added_data.append({'name':o.name,'boundsBlender':bounds(o),'positionBlender':list(o.location),'triangles':len(o.data.loop_triangles)})
added_tris=sum(v['triangles'] for v in added_data);assert added_tris<1500,added_tris
for d in added_data:
 if d['name'].startswith('Kitchen_SupplyBuckets'):
  b=d['boundsBlender'];assert b['min'][0]>=3.6 and b['max'][0]<=5.1 and b['max'][1]<=1.95
 if d['name'].startswith('Kitchen_SupplyWater'):assert d['boundsBlender']['max'][1]<=1.9
production=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('Kitchen_')]
bpy.ops.object.select_all(action='DESELECT')
for o in production:o.select_set(True);o.hide_render=False;o.hide_set(False)
bpy.ops.export_scene.gltf(filepath=str(OUT/'kitchen-character.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_frame_range=True,export_force_sampling=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'kitchen-character.blend'))
raw=(OUT/'kitchen-character.glb').read_bytes();ln=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+ln]);assert len(g['images'])==4
def document(raw):
 size=struct.unpack_from('<I',raw,12)[0];return json.loads(raw[20:20+size]),raw[28+size:]
old,oldbin=document((BASE/'kitchen-character.glb').read_bytes());_,newbin=document(raw)
def viewbytes(doc,blob,idx):
 v=doc['bufferViews'][idx];a=v.get('byteOffset',0);return blob[a:a+v['byteLength']]
assert {im['name']:viewbytes(old,oldbin,im['bufferView']) for im in old['images']}=={im['name']:viewbytes(g,newbin,im['bufferView']) for im in g['images']},'Embedded texture bytes changed'
for mat in old['materials']:
 assert next(m for m in g['materials'] if m['name']==mat['name'])==mat,'Original exported material changed: '+mat['name']
def acc(doc,blob,idx):
 a=doc['accessors'][idx];v=doc['bufferViews'][a['bufferView']];size={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']]
 assert a['componentType']==5126
 stride=v.get('byteStride',4*size);start=v.get('byteOffset',0)+a.get('byteOffset',0)
 return [struct.unpack_from('<'+'f'*size,blob,start+i*stride) for i in range(a['count'])]
for anim in g.get('animations',[]):
 for sampler in anim['samplers']:
  times=acc(g,newbin,sampler['input']);values=acc(g,newbin,sampler['output'])
  assert abs(times[-1][0]-times[0][0]-2)<1e-6 and values[0]==values[-1],'Water loop endpoint mismatch'
tris=sum(g['accessors'][p['indices']]['count']//3 for m in g['meshes'] for p in m['primitives'])
assert len(g.get('animations',[]))==1
c=json.loads((BASE/'kitchen-character.contract.json').read_text(encoding='utf-8'))
c.update(schema='holm.kitchen-character.v5',status='Unpublished additive ingredient supplies; navigation and visual verification required')
c['supplyAdditions']={'meshes':added_data,'addedTriangles':added_tris,'preservedOriginalMeshCount':len(original),'preservationChecks':['Exact original local vertices, world matrices, polygon indices, per-face material indices, flat shading and UV arrays','Original material datablocks reused without mutation'],'bucketCentersBlender':[[4,1.55,.25],[4.65,1.55,.25]],'bowlCenterBlender':[-4.38,-1.55,1.02],'bowlPlacementReason':'Leaves 0.095 tile gap from existing west loaf and remains on table','waterLoop':{'clip':g['animations'][0].get('name'),'seconds':2,'sampleFrames':17,'centerZRange':[.718,.722],'xyScaleRange':[.996,1.004],'surfaceRadius':.259,'sampledBoundsBlender':{'min':[5.45-.260036,1.55-.260036,.718],'max':[5.45+.260036,1.55+.260036,.722]},'endpointsIdentical':True},'navigationAcceptance':None,'visualAcceptance':None}
c['triangleCount']=tris;c['meshCount']=len(g['meshes']);c['materialCount']=len(g['materials']);c['glb']={'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'triangles':tris,'meshes':len(g['meshes']),'primitives':sum(len(m['primitives']) for m in g['meshes']),'embeddedTextures':len(g['images'])}
c['meshNames']=sorted(o.name for o in production)
assert len(c['meshNames'])==c['meshCount']==len(set(c['meshNames']))
assert set(c['meshNames'])=={n['name'] for n in g['nodes'] if 'mesh' in n}
c['provenance']={'source':str(Path(__file__).relative_to(ROOT)),'sourceSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'baseModelSha256':EXPECTED,'baseBlendSha256':hashlib.sha256((BASE/'kitchen-character.blend').read_bytes()).hexdigest(),'textureOrigin':'All four original v4 embedded textures retained'}
(OUT/'kitchen-character.contract.json').write_text(json.dumps(c,indent=2),encoding='utf-8')
print('[KITCHEN_SUPPLIES]',json.dumps(c['glb']), 'added',added_tris, 'original meshes exact',len(original))
