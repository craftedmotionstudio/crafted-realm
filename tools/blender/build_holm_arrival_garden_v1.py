"""Blender-authored original Holm garden candidates, no world placements.
Units metres/tiles. Asset roots at origin. Reference: Tree1.jpg and Landscape_Option.jpg.
Broad lobed crowns, visible forked timber, restrained leaf-value hierarchy.
"""
import bpy, math, json, random, hashlib, struct
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
assert (ROOT/'tools/blender/build_holm_guide_house_overhaul_v1.py').exists()
assert (ROOT/'docs/rebuild/holm-overhaul/arrival-layout.json').exists()
OUT=ROOT/'.studio-workspaces/holm-arrival-garden-v1/candidates'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, rgb):
 m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True
 m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*rgb,1)
 m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.95
 return m
bark=mat('Warm fissured oak',(.255,.151,.072))
greens=[mat('Leaf shadow',(.13,.225,.065)),mat('Leaf mid',(.245,.36,.10)),mat('Leaf sun',(.365,.445,.145))]
stone=[mat('Fieldstone warm grey',(.42,.425,.35)),mat('Fieldstone upper',(.54,.525,.425)),mat('Fieldstone moss',(.32,.365,.19))]
class Builder:
 def __init__(self):self.v=[];self.f=[];self.mi=[]
 def add(self,v,f,mi=0):
  offset=len(self.v);self.v.extend(v);self.f.extend([tuple(offset+i for i in face) for face in f]);self.mi.extend([mi]*len(f))
 def object(self,name,root,mats):
  data=bpy.data.meshes.new(name);data.from_pydata(self.v,[],self.f);data.update()
  obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.parent=root
  for m in mats:data.materials.append(m)
  for p,i in zip(data.polygons,self.mi):p.material_index=i;p.use_smooth=False
  return obj
 def branch(self,points,radii,seed):
  rng=random.Random(seed);v=[];n=7
  for j,p in enumerate(points):
   for k in range(n):
    a=2*math.pi*k/n+.09*j;r=radii[j]*rng.uniform(.86,1.12)
    v.append((p[0]+math.cos(a)*r,p[1]+math.sin(a)*r,p[2]))
  f=[tuple(reversed(range(n)))]
  for j in range(len(points)-1):
   for k in range(n):f.append((j*n+k,j*n+(k+1)%n,(j+1)*n+(k+1)%n,(j+1)*n+k))
  f.append(tuple((len(points)-1)*n+k for k in range(n)));self.add(v,f)
 def crown(self,center,scale,seed,rock=False):
  # Seven irregular contour rings with offset phase form broad scalloped plates.
  rng=random.Random(seed);n=15 if not rock else 9
  profile=[(-.52,.28),(-.38,.78),(-.18,1.0),(.08,.94),(.31,.74),(.48,.37)] if not rock else [(-.50,.72),(-.27,1),(.14,.94),(.43,.55)]
  v=[]
  for j,(h,r) in enumerate(profile):
   for k in range(n):
    a=2*math.pi*k/n+.045*j
    lobes=1+.13*math.sin(a*5+seed)+.07*math.cos(a*3-.4*j)
    radius=r*lobes*rng.uniform(.94,1.06)
    v.append((center[0]+math.cos(a)*radius*scale[0],center[1]+math.sin(a)*radius*scale[1],center[2]+(h+rng.uniform(-.035,.035))*scale[2]))
  f=[tuple(reversed(range(n)))];ids=[0]
  for j in range(len(profile)-1):
   for k in range(n):
    a=j*n+k;b=j*n+(k+1)%n;c=(j+1)*n+(k+1)%n;d=(j+1)*n+k
    f.extend([(a,b,c),(a,c,d)]);tone=0 if j==0 else (2 if j>=len(profile)-3 and k%4 else 1)
    if rock:tone=2 if j==len(profile)-2 and k%3==0 else (1 if j>=2 else 0)
    ids.extend([tone,tone])
  f.append(tuple((len(profile)-1)*n+k for k in range(n)));ids.append(2 if not rock else 1)
  off=len(self.v);self.v.extend(v);self.f.extend([tuple(off+i for i in face) for face in f]);self.mi.extend(ids)
def root(name):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);return o

def breeze(obj,amplitude):
 obj.rotation_mode='XYZ'
 for frame,angle in [(1,0),(31,amplitude),(61,0),(91,-amplitude),(121,0)]:
  obj.rotation_euler=(angle,angle*.45,0);obj.keyframe_insert(data_path='rotation_euler',frame=frame)
 action=obj.animation_data.action;action.name='Breeze'
 track=obj.animation_data.nla_tracks.new();track.name='Breeze';strip=track.strips.new('Breeze',1,action)
 obj.animation_data.action=None
 return obj
assets=[]
oak=root('ArrivalOak');timber=Builder();leaf=Builder()
timber.branch([(0,0,0),(.09,.03,.65),(-.07,.01,1.7),(.12,.02,2.6),(.32,.10,3.5)],[.39,.28,.23,.18,.035],3)
for i,(end,start) in enumerate([((-1.15,.16,3.25),(-.03,0,1.65)),((1.15,.38,3.60),(.07,0,2)),((.1,-1,3.70),(.05,0,2.25)),((-.52,.82,3.83),(.09,0,2.45))]):
 mid=tuple((a+b)/2 for a,b in zip(start,end));timber.branch([start,mid,end],[.17,.11,.025],10+i)
for i in range(5):
 a=i*math.tau/5;timber.branch([(math.cos(a)*.73,math.sin(a)*.73,.02),(math.cos(a)*.27,math.sin(a)*.27,.18),(0,0,.45)],[.05,.14,.20],20+i)
# Side-reaching overlapping crowns with asymmetric negative spaces, not stacked balls.
for i,(c,s) in enumerate([((-.98,.18,3.45),(1.25,1.1,1.15)),((1.04,.32,3.79),(1.20,1.07,1.22)),((.1,-.9,3.93),(1.25,1.10,1.3)),((-.48,.86,4.05),(1.3,1.08,1.12)),((.13,.02,4.54),(1.30,1.16,1.36))]):leaf.crown(c,s,101+i)
timber.object('OakTimber',oak,[bark]);breeze(leaf.object('OakCrown',oak,greens),.008)
assets.append((oak,'arrival_oak_v1.glb',.78))
shrub=root('ArrivalHazel');twigs=Builder();leaf=Builder()
for i in range(7):
 a=i*math.tau/7;end=(math.cos(a)*.59,math.sin(a)*.48,.79+(i%3)*.12)
 twigs.branch([(0,0,0),(end[0]*.35,end[1]*.35,.42),end],[.06,.038,.012],60+i)
 leaf.crown((end[0],end[1],end[2]),(.62,.52,.75),211+i)
twigs.object('HazelStems',shrub,[bark]);breeze(leaf.object('HazelLeaves',shrub,greens),.014)
assets.append((shrub,'arrival_hazel_v1.glb',1.5))
rocks=root('ArrivalFieldstones');rock=Builder()
for i,(c,s) in enumerate([((-.28,0,.40),(.75,.56,.83)),((.51,.18,.25),(.45,.40,.54)),((-.08,.52,.15),(.35,.27,.35))]):rock.crown(c,s,321+i,True)
rock.object('Fieldstones',rocks,stone);assets.append((rocks,'arrival_fieldstones_v1.glb',1.35))
bpy.context.scene.frame_end=121;bpy.context.scene.render.fps=30;bpy.context.scene.frame_set(1)
bpy.context.view_layer.update()
manifest={'schema':1,'status':'candidate-awaiting-main-Studio-review','units':'tiles','upAxis':'Y (GLB), Z (Blender)','references':['Bible_References/Complete/Tree1.jpg','Bible_References/Landscape_Option.jpg'],'assets':[]}
for r,file,radius in assets:
 meshes=[o for o in r.children_recursive if o.type=='MESH'];pts=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
 mins=[min(p[i] for p in pts) for i in range(3)];maxs=[max(p[i] for p in pts) for i in range(3)]
 tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
 mats=set(m.name for o in meshes for m in o.data.materials)
 assert len(meshes)<=5 and len(mats)<=4 and all(math.isfinite(x) for x in mins+maxs)
 assert tuple(r.location)==(0,0,0) and mins[2]>-.08
 bpy.ops.object.select_all(action='DESELECT');r.select_set(True)
 for o in r.children_recursive:o.select_set(True)
 bpy.context.view_layer.objects.active=r
 bpy.ops.export_scene.gltf(filepath=str(OUT/file),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_nla_strips=True,export_animation_mode="NLA_TRACKS")
 binary=(OUT/file).read_bytes();document=json.loads(binary[20:20+struct.unpack_from('<I',binary,12)[0]])
 assert [a.get('name') for a in document.get('animations',[])]==([] if r==rocks else ['Breeze'])
 manifest['assets'].append({'root':r.name,'file':file,'triangles':tris,'meshes':len(meshes),'materials':sorted(mats),'bounds':{'min':[mins[0],mins[2],-maxs[1]],'max':[maxs[0],maxs[2],-mins[1]]},'suggestedConservativeGroundExclusionRadius':radius,'clips':['Breeze'] if r!=rocks else [],'sha256':hashlib.sha256((OUT/file).read_bytes()).hexdigest()})
assert sum(a['triangles'] for a in manifest['assets'])<9000
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'holm_arrival_garden_v1.blend'))
manifest['blend']='holm_arrival_garden_v1.blend'
manifest['checks']=['Base guard','Origin roots','Finite GLB-space bounds','Per-asset <=5 meshes / <=4 materials','Whole-kit <9000 triangles','Separate selected exports','Exported clip names verified']
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print('[HOLM_ARRIVAL_GARDEN] 7/7 structural acceptance ok; Studio visual and runtime Breeze review pending')
# A presentation-only proof image; saved .blend retains all three roots at origin.
oak.location.x=-2.1;shrub.location.x=1.45;rocks.location.x=3.3
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=1400;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Warm neutral');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.25,.27,.22,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.55
bpy.ops.object.light_add(type='AREA',location=(-4,-6,9));bpy.context.object.data.energy=1800;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=7
bpy.ops.object.camera_add(location=(8,-13,9));cam=bpy.context.object;direction=Vector((0,0,2.1))-cam.location;cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=10;scene.camera=cam
scene.view_settings.view_transform='Standard';scene.render.filepath=str(OUT/'garden-kit-proof.png');bpy.ops.render.render(write_still=True)
