"""Original Blender-authored Holm open skiff. Candidates only; game x,y-up,z units."""
import bpy, bmesh, math, json, struct, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
assert (ROOT/'docs/rebuild/holm-overhaul/arrival-dock.json').is_file()
assert (ROOT/'tools/blender/build_holm_arrival_dock_v1.py').is_file()
OUT=ROOT/'.studio-workspaces/holm-arrival-skiff-v1/candidates'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
root=bpy.data.objects.new('ArrivalSkiff',None);bpy.context.collection.objects.link(root)
palette=[('Honey oak',(.46,.31,.16)),('Worn golden edges',(.59,.43,.24)),('Dark tar seams',(.21,.16,.105)),('Sea green strake',(.24,.35,.28)),('Forged iron',(.14,.17,.16))]
mats=[]
for name,col in palette:
 m=bpy.data.materials.new(name);m.diffuse_color=(*col,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*col,1);p.inputs['Roughness'].default_value=.93;mats.append(m)
groups={}
def add(name,verts,faces,material):
 g=groups.setdefault(name,{'v':[],'f':[],'m':[]});offset=len(g['v']);g['v']+=verts;g['f'] += [tuple(offset+i for i in f) for f in faces];g['m'] += [material]*len(faces)
def box(name,x0,x1,y0,y1,z0,z1,mat):
 add(name,[(x0,y0,z0),(x1,y0,z0),(x1,y1,z0),(x0,y1,z0),(x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],mat)
def rod(name,a,b,r,mat,n=6):
 axis=(Vector(b)-Vector(a)).normalized();u=axis.cross(Vector((0,1,0)))
 if u.length<.001:u=axis.cross(Vector((1,0,0)))
 u.normalize();v=axis.cross(u).normalized()
 verts=[tuple(Vector(p)+r*(math.cos(i*math.tau/n)*u+math.sin(i*math.tau/n)*v)) for p in [a,b] for i in range(n)]
 add(name,verts,[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],mat)
# Longitudinal station shape: pointed bow, broad shoulders, narrowed rounded stern.
stations=[(-2.4,.035,.13),(-2.14,.40,.06),(-1.65,.70,0),(-.85,.875,0),(0,.9,0),(.85,.855,0),(1.6,.66,.01),(2.1,.37,.06),(2.4,.06,.12)]
# A continuous thick U section. No top polygon spans either gunwale.
section=[(-1,.55),(-.94,.30),(-.77,-.03),(-.43,-.31),(0,-.45),(.43,-.31),(.77,-.03),(.94,.30),(1,.55)]
outer=[];inner=[]
for z,w,lift in stations:
 outer.append([(x*w,y+lift*(.55-y),z) for x,y in section])
 inner.append([(x*max(.015,w-.075),y+.065 if abs(x)<.95 else y,z) for x,y in section])
for k in range(len(stations)-1):
 for j in range(8):
  # Both skins plus station caps form a real, closed hull shell, open above.
  add('Hull', [outer[k][j],outer[k+1][j],outer[k+1][j+1],outer[k][j+1]],[(0,1,2,3)],3 if j in (0,7) else 0)
  add('Hull', [inner[k][j],inner[k][j+1],inner[k+1][j+1],inner[k+1][j]],[(0,1,2,3)],0)
 for j in (0,8):
  add('Hull',[outer[k][j],inner[k][j],inner[k+1][j],outer[k+1][j]],[(0,1,2,3)],1)
 # Dark thin lapped strake seams follow the curved chines.
 for j in (1,2,6,7):rod('Strakes',outer[k][j],outer[k+1][j],.012,2)
 for j in (0,8):rod('Gunwales',outer[k][j],outer[k+1][j],.043,1)
for k in (0,len(stations)-1):
 for j in range(8):add('Hull',[outer[k][j],outer[k][j+1],inner[k][j+1],inner[k][j]],[(0,1,2,3)],1)
# Exposed interior frames run down the bilges; only broad details survive overhead.
for k in (2,3,4,5,6):
 for a,b in zip(inner[k],inner[k][1:]):rod('Ribs',a,b,.032,1)
# Raised duckboards keep feet above water. Narrow gaps expose interior below.
for i in range(5):
 x=-.425+i*.17;box('Fittings',x,x+.15,.015,.07,-1.52,1.50,1 if i%2 else 0)
for z,w in [(-1.28,.69),(0,.805),(1.27,.66)]:
 box('Fittings',-w,w,.34,.43,z-.19,z+.19,1)
 for x in (-w+.1,w-.1):box('Fittings',x-.04,x+.04,.08,.34,z-.07,z+.07,0)
# Stem and keel visibly support the tapered hull.
for k in range(len(stations)-1):rod('Keel',outer[k][4],outer[k+1][4],.025,2)
for k in (0,len(stations)-1):rod('Keel',outer[k][4],(0,.60,stations[k][0]),.038,2)
# Two oars stowed along the inboard gunwales, not blocking the central seating spaces.
for sign in (-1,1):
 x=sign*.66
 rod('Oars',(x,.48,-1.54),(x,.48,.98),.027,1)
 # Six-sided paddle blade tapered at the shaft.
 pts=[(x-.045,.455,.85),(x+.045,.455,.85),(x+.115,.455,1.65),(x+.06,.455,1.90),(x-.06,.455,1.90),(x-.115,.455,1.65)]
 add('Oars',pts+[(a,b+.035,c) for a,b,c in pts],[tuple(range(5,-1,-1)),tuple(range(6,12))]+[(i,(i+1)%6,(i+1)%6+6,i+6) for i in range(6)],1)
 for z in (-.33,.33):
  rod('Iron',(sign*.9,.53,z),(sign*.9,.65,z),.021,4)
# Fore/aft mooring cleats, with unoccupied eye for main-session mooring line.
for z in (-1.98,1.98):
 rod('Iron',(0,.32,z),(0,.49,z),.028,4)
 rod('Iron',(-.14,.47,z),(.14,.47,z),.022,4)
meshes=[]
for name,g in groups.items():
 assert all(math.isfinite(c) for p in g['v'] for c in p)
 mesh=bpy.data.meshes.new(name);mesh.from_pydata([(x,-z,y) for x,y,z in g['v']],[],g['f']);mesh.update()
 for m in mats:mesh.materials.append(m)
 for p,m in zip(mesh.polygons,g['m']):p.material_index=m
 bm=bmesh.new();bm.from_mesh(mesh)
 if name=='Hull':
  bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
  assert all(e.is_manifold for e in bm.edges), 'Hull shell must be watertight around its open interior'
 bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(mesh);bm.free()
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.parent=root;meshes.append(obj)
# Blender Y axis maps to game -Z: rocking here is roll around the boat long axis.
bpy.context.scene.render.fps=24;bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=97
for i in range(17):
 phase=math.tau*i/16;frame=1+i*6
 root.location=(0,0,.028*math.sin(phase));root.rotation_euler=(0,.016*math.sin(phase),0)
 root.keyframe_insert(data_path='location',frame=frame);root.keyframe_insert(data_path='rotation_euler',frame=frame)
root.animation_data.action.name='IdleBob'
bpy.context.scene.frame_set(1)
triangles=sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)
assert triangles<6500 and len(meshes)<=10 and len(mats)<=6
# Open-interior geometry witness: center gap at z=.65 from deck top to gunwale.
# No authored face covers this point, except the intentionally low duckboards.
from mathutils.bvhtree import BVHTree
probe=Vector((0,-.65,.54));hits=[]
for o in meshes:
 tree=BVHTree.FromPolygons([v.co for v in o.data.vertices],[list(p.vertices) for p in o.data.polygons])
 hit=tree.ray_cast(probe,Vector((0,0,-1)),1)
 if hit[0] is not None:hits.append(float(hit[0].z))
assert hits and max(hits)<=.071,hits
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'skiff.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'skiff.glb'),export_format='GLB',export_yup=True,export_animations=True,export_animation_mode='ACTIONS',export_cameras=False,export_lights=False)
raw=(OUT/'skiff.glb').read_bytes();size=struct.unpack_from('<I',raw,12)[0];gltf=json.loads(raw[20:20+size])
clips=[a['name'] for a in gltf.get('animations',[])];assert 'IdleBob' in clips,clips
for mesh in gltf['meshes']:
 for p in mesh['primitives']:
  a=gltf['accessors'][p['attributes']['POSITION']];assert all(math.isfinite(v) for key in ('min','max') for v in a[key])
allv=[v for g in groups.values() for v in g['v']]
manifest={'schema':'holm-arrival-skiff-candidate-v1','status':'Blender candidate; not visually accepted or published','root':'ArrivalSkiff','coordinates':'game x,y-up,z; origin on waterline; length along Z','bounds':{'min':[min(v[i] for v in allv) for i in range(3)],'max':[max(v[i] for v in allv) for i in range(3)]},'triangles':triangles,'meshes':len(meshes),'materials':len(gltf['materials']),'gltfPrimitives':sum(len(m['primitives']) for m in gltf['meshes']),'animations':clips,'idleBob':{'durationSeconds':4,'translationAmplitude':.028,'rollAmplitudeRadians':.016,'loopEndpointsMatch':True},'interior':{'waterlineY':0,'duckboardTopY':.07,'seatTopY':.43,'seatZ':[-1.28,0,1.27],'gunwaleY':.55,'openRayProbe':[0,.54,.65],'probeHighestHitY':max(hits),'proofScope':'One downward interior probe plus explicit U-shaped hull source; not avatar boarding/capsule proof'},'reference':'Bible_References/Complete/Fishing_Pier_Option1.jpg','sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [OUT/'skiff.blend',OUT/'skiff.glb']},'remaining':['Main-session Studio visual review and reference comparison','Placement and boarding interaction','NPC rower','Performance and Safe Publish']}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print('[HOLM_SKIFF] finite geometry, open interior ray, clip and budgets PASS',triangles,'triangles',len(meshes),'meshes',clips)


