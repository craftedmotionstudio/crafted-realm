"""Original reference-led Holm vegetation. Blender 4.5; isolated candidate exports only."""
import bpy, math, random, json, struct, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
assert (ROOT/'Bible_References/Landscape_Option.jpg').exists()
assert (ROOT/'tools/blender/build_holm_arrival_garden_v1.py').exists()
OUT=ROOT/'.studio-workspaces/holm-tree-family-v2/candidates'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

def texture(name,base,kind):
 rng=random.Random(210+len(name)); n=64; pixels=[]
 # Original painted-size mottling; no reference-image pixels are sampled.
 for y in range(n):
  for x in range(n):
   noise=rng.uniform(-.025,.025)
   if kind=='leaf':
    gx=x/3.5;gy=y/3.5;ix=int(gx);iy=int(gy);tx=gx-ix;ty=gy-iy
    q=lambda a,b: random.Random(a*731+b*911+len(name)).uniform(-.065,.065)
    patch=(q(ix,iy)*(1-tx)+q(ix+1,iy)*tx)*(1-ty)+(q(ix,iy+1)*(1-tx)+q(ix+1,iy+1)*tx)*ty
    noise=patch+.030*math.sin(x*.31+y*.18)*math.cos(y*.27)+rng.uniform(-.012,.012)
   elif kind=='birch': noise-=.42 if y%13<2 and (x+y//13*7)%27<12 else 0
   else: noise+=.06*math.sin(x*.9)+.025*math.sin(x*2+y*.15)
   pixels.extend([max(.015,min(.95,c+noise)) for c in base]+[1])
 im=bpy.data.images.new(name, width=n,height=n); im.pixels=pixels
 im.filepath_raw=str(OUT/(name+'.png')); im.file_format='PNG'; im.save(); im.pack()
 m=bpy.data.materials.new(name);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.96
 t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=im;t.interpolation='Closest'
 m.node_tree.links.new(t.outputs['Color'],bs.inputs['Base Color']);m.diffuse_color=(*base,1)
 return m
oakb=texture('oak-bark',(.27,.205,.135),'bark')
birchb=texture('birch-bark',(.70,.69,.58),'birch')
pineb=texture('pine-bark',(.29,.235,.18),'bark')
leaves=texture('olive-leaves',(.285,.34,.155),'leaf')
birchleaf=texture('birch-leaves',(.355,.39,.205),'leaf')
needles=texture('pine-needles',(.22,.295,.205),'leaf')
grass=texture('meadow-leaves',(.36,.40,.215),'leaf')
reed=texture('reed-leaves',(.32,.365,.225),'leaf')
head=texture('reed-seedheads',(.31,.25,.17),'bark')

class Mesh:
 def __init__(self):self.v=[];self.f=[]
 def add(self,vs,fs):
  k=len(self.v);self.v+=vs;self.f += [tuple(k+i for i in f) for f in fs]
 def branch(self,points,radii,n=7):
  vs=[]
  for j,p in enumerate(points):
   for i in range(n):
    a=math.tau*i/n+j*.11;vs.append((p[0]+math.cos(a)*radii[j],p[1]+math.sin(a)*radii[j],p[2]))
  fs=[tuple(reversed(range(n))),tuple((len(points)-1)*n+i for i in range(n))]
  for j in range(len(points)-1):
   for i in range(n):fs.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
  self.add(vs,fs)
 def mass(self,c,s,seed):
  rng=random.Random(seed);vs=[];n=10
  # Broad irregular shoulders with offset lobes, not primitive spheres/cones.
  for j,(h,r) in enumerate([(-.5,.16),(-.29,.76),(.02,1),(.31,.74),(.48,.32)]):
   for i in range(n):
    a=math.tau*i/n+.12*j;rr=r*(1+.18*math.sin(a*3+seed))*rng.uniform(.86,1.12)
    vs.append((c[0]+s[0]*math.cos(a)*rr+s[0]*.1*h,c[1]+s[1]*math.sin(a)*rr,c[2]+s[2]*(h+rng.uniform(-.045,.045))))
  fs=[tuple(reversed(range(n))),tuple(4*n+i for i in range(n))]
  for j in range(4):
   for i in range(n):fs.extend([(j*n+i,j*n+(i+1)%n,(j+1)*n+i),(j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i)])
  self.add(vs,fs)
 def crown(self,c,s,seed):
  # Three overlapping unequal leaf clusters replace each broad solid lobe.
  for i,(dx,dy,dz,sx,sy,sz) in enumerate([(-.35,-.17,-.02,.66,.64,.93),(.31,.21,.05,.62,.64,.88),(.02,-.04,.35,.57,.55,.92)]):
   self.mass((c[0]+dx*s[0],c[1]+dy*s[1],c[2]+dz*s[2]),(s[0]*sx,s[1]*sy,s[2]*sz),seed*7+i)
 def spray(self,c,s,seed):
  # Uneven rising needle fans; pointed branch tips break the silhouette.
  rng=random.Random(seed)
  for i in range(3):
   cx=c[0]+(i-1)*s[0]*.42;cy=c[1]+(-.30 if i%2 else .21)*s[1];z=c[2]+(i%2)*.27
   w=s[0]*rng.uniform(.55,.73);d=s[1]*rng.uniform(.55,.78);h=s[2]*rng.uniform(.9,1.25)
   self.add([(cx-w,cy,z-.16*h),(cx-w*.45,cy-d,z),(cx+w*.40,cy-d*.68,z+.02*h),(cx+w,cy,z+.32*h),(cx+w*.32,cy+d,z+.12*h),(cx-w*.62,cy+d*.70,z-.07*h),(cx-.2*w,cy,z+.80*h),(cx+.12*w,cy-.12*d,z-.37*h)],[(0,1,6),(1,2,6),(2,3,6),(3,4,6),(4,5,6),(5,0,6),(1,0,7),(2,1,7),(3,2,7),(4,3,7),(5,4,7),(0,5,7)])
 def blade(self,p,a,h,w,bend):
  d=Vector((math.cos(a),math.sin(a),0));side=Vector((-d.y,d.x,0));p=Vector(p)
  pts=[p-side*w/2,p+side*w/2,p+d*bend*.35+Vector((0,0,h*.6))-side*w*.3,p+d*bend*.35+Vector((0,0,h*.6))+side*w*.3,p+d*bend+Vector((0,0,h))]
  self.add([tuple(v) for v in pts],[(0,1,3,2),(2,3,4)])
 def obj(self,name,parent,material,animated=False):
  me=bpy.data.meshes.new(name);me.from_pydata(self.v,[],self.f);me.update()
  ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);ob.parent=parent;me.materials.append(material)
  uv=me.uv_layers.new(name='OriginalTextureUV')
  for face in me.polygons:
   face.use_smooth=False
   axis=max(range(3),key=lambda i:abs(face.normal[i]));axes=[i for i in range(3) if i!=axis]
   for li in face.loop_indices:
    co=me.vertices[me.loops[li].vertex_index].co;uv.data[li].uv=(co[axes[0]]*.85,co[axes[1]]*.85)
  if animated:
   for f,v in [(1,0),(31,.008),(61,0),(91,-.008),(121,0)]:
    ob.rotation_euler=(v,v*.6,0);ob.keyframe_insert(data_path='rotation_euler',frame=f)
   action=ob.animation_data.action;action.name='Breeze';track=ob.animation_data.nla_tracks.new();track.name='Breeze';track.strips.new('Breeze',1,action);ob.animation_data.action=None
  return ob

assets=[]
def root(name,habitat):
 ob=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(ob);assets.append((ob,habitat));return ob
o=root('oak','Sheltered meadow and settlement margins; isolated mature trees, occasional uneven pair')
t=Mesh();l=Mesh();t.branch([(0,0,0),(.10,0,.8),(-.15,.1,2),(.1,.12,3.2)],[.43,.29,.22,.11])
for i,(c,s) in enumerate([((-1.25,.1,3.30),(1.42,1.03,1.35)),((1.03,.32,3.7),(1.47,1.22,1.6)),((-.3,-.83,4.04),(1.35,1.2,1.52)),((-.25,.78,4.46),(1.38,1.13,1.25)),((.5,-.1,4.78),(1.15,.95,1.38))]):
 t.branch([(-.10,.05,1.85),(c[0]*.65,c[1]*.65,c[2]-.6),c],[.19,.12,.035]);l.crown(c,s,100+i)
for i in range(5):
 a=math.tau*i/5;t.branch([(math.cos(a)*.78,math.sin(a)*.78,.03),(math.cos(a)*.23,math.sin(a)*.23,.20),(0,0,.55)],[.02,.12,.22])
t.obj('Oak_BranchedTrunk',o,oakb);l.obj('Oak_AsymmetricCrown',o,leaves,True)
o=root('birch','Cool creek terraces and woodland edge; loose small groups with open sightlines')
t=Mesh();l=Mesh();t.branch([(0,0,0),(.08,0,1.8),(.28,.06,3.7),(.12,.10,5.5)],[.20,.125,.085,.018])
for i,(c,s) in enumerate([((-.65,.05,3.35),(.7,.60,1.15)),((.82,.16,4.04),(.72,.60,1.5)),((-.43,-.30,4.69),(.77,.64,1.35)),((.28,.2,5.40),(.70,.64,1.35))]):
 t.branch([(.15,0,c[2]-1.25),(c[0]*.6,c[1]*.6,c[2]-.3),c],[.07,.035,.01]);l.crown(c,s,210+i)
t.obj('Birch_PaleForkedTrunk',o,birchb);l.obj('Birch_LightOpenCrown',o,birchleaf,True)
o=root('coastal-pine','Exposed headland and rocky upper slopes; sparse, consistently wind-shaped silhouettes')
t=Mesh();l=Mesh();t.branch([(0,0,0),(.12,0,1.2),(.65,.08,2.6),(1.05,.02,4.05),(1.70,.04,4.9)],[.30,.22,.16,.09,.02])
for i,(c,s) in enumerate([((.42,-.1,2.7),(1.13,.65,.75)),((1.43,.4,3.45),(1.37,.85,.77)),((.37,-.25,4.00),(1.15,.77,.73)),((1.70,-.03,4.72),(1.35,.90,.85)),((2.05,.1,5.05),(.82,.69,.68))]):
 t.branch([(.45+i*.19,0,c[2]-.55),(c[0]-.3,c[1],c[2]-.15),c],[.095,.05,.015]);l.spray(c,s,330+i)
t.obj('Pine_LeaningBranches',o,pineb);l.obj('Pine_WindwardCrown',o,needles,True)
for name,habitat,qty,material in [('meadow-tuft','Sparse grass islands at fence feet and meadow margins; leave broad open ground',13,grass),('creek-reeds','Small uneven clumps only at shallow creek banks and sheltered wet edges',9,reed)]:
 o=root(name,habitat);l=Mesh();t=Mesh();rng=random.Random(qty)
 for i in range(qty):
  a=rng.random()*math.tau;p=(rng.uniform(-.35,.35),rng.uniform(-.28,.28),.01)
  h=rng.uniform(.23,.54) if qty==13 else rng.uniform(.72,1.35)
  l.blade(p,a,h,.075 if qty==13 else .055,.2)
  if qty==9 and i%2==0:
   t.branch([p,(p[0]+.045,p[1],h*.86)],[.014,.010],5)
   t.branch([(p[0]+.045,p[1],h*.76),(p[0]+.045,p[1],h)],[.045,.036],6)
 l.obj(name+'_Leaves',o,material,True)
 if t.v:t.obj('Reed_Seedheads',o,head,True)

scene=bpy.context.scene;scene.frame_end=121;scene.render.fps=30
def bounds(ob,frames):
 pts=[]
 for frame in frames:
  scene.frame_set(frame);bpy.context.view_layer.update()
  pts.extend(tuple(x.matrix_world@v.co) for x in ob.children_recursive if x.type=='MESH' for v in x.data.vertices)
 assert all(math.isfinite(c) for p in pts for c in p)
 lo=[min(p[i] for p in pts) for i in range(3)];hi=[max(p[i] for p in pts) for i in range(3)]
 return {'min':[lo[0],lo[2],-hi[1]],'max':[hi[0],hi[2],-lo[1]]}
manifest={'schema':1,'status':'candidate-not-visual-or-runtime-accepted','axes':'glTF Y-up, 1 unit = tile','references':['Bible_References/Landscape_Option.jpg','Bible_References/Town2.jpg'],'blend':'tree-family.blend','assets':[]}
for ob,habitat in assets:
 rest=bounds(ob,[1]);swept=bounds(ob,range(1,122,3));scene.frame_set(1)
 meshes=[x for x in ob.children_recursive if x.type=='MESH'];tris=sum(len(p.vertices)-2 for x in meshes for p in x.data.polygons);mats=set(m.name for x in meshes for m in x.data.materials)
 assert tris<=2500 and len(mats)<=6
 bpy.ops.object.select_all(action='DESELECT');ob.select_set(True)
 for x in ob.children_recursive:x.select_set(True)
 path=OUT/(ob.name+'.glb');bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True)
 raw=path.read_bytes();jslen=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+jslen]);blob=raw[28+jslen:]
 assert [a['name'] for a in doc.get('animations',[])]==['Breeze']
 for sampler in doc['animations'][0]['samplers']:
  ac=doc['accessors'][sampler['output']];bv=doc['bufferViews'][ac['bufferView']];n={'SCALAR':1,'VEC3':3,'VEC4':4}[ac['type']];offset=bv.get('byteOffset',0)+ac.get('byteOffset',0);stride=bv.get('byteStride',n*4)
  first=struct.unpack_from('<'+'f'*n,blob,offset);last=struct.unpack_from('<'+'f'*n,blob,offset+(ac['count']-1)*stride)
  assert max(abs(a-b) for a,b in zip(first,last))<1e-6,'Non-looping channel'
 manifest['assets'].append({'name':ob.name,'file':path.name,'habitat':habitat,'triangles':tris,'materials':len(mats),'meshes':len(meshes),'bounds':rest,'animatedBounds':swept,'sampledFrames':list(range(1,122,3)),'clips':['Breeze'],'sha256':hashlib.sha256(raw).hexdigest()})
 print('[HOLM_TREE_FAMILY_V2]',ob.name,tris,'tris; finite rest + 41 sampled bounds; exported Breeze endpoints match')
scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'tree-family.blend'))
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
print('[HOLM_TREE_FAMILY_V2] 5/5 asset structural gates PASS; visual and game integration pending')
# Presentation only: asset exports and saved editable blend retain origin-centred roots.
for (ob,_),pos in zip(assets,[(-5,0,0),(0,0,0),(4,0,0),(-1,-2.2,0),(2,-2.2,0)]):ob.location=pos
scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Neutral');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.27,.29,.24,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
bpy.ops.object.light_add(type='AREA',location=(-6,-8,12));bpy.context.object.data.energy=1600;bpy.context.object.data.size=8
bpy.ops.object.camera_add(location=(9,-20,11));cam=bpy.context.object;cam.rotation_euler=(Vector((.1,0,2.4))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=17;scene.camera=cam
scene.view_settings.view_transform='Standard';scene.render.filepath=str(OUT/'tree-family.png');bpy.ops.render.render(write_still=True)
