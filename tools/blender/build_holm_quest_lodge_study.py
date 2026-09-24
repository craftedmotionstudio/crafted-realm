"""Original Blender-authored Quest Lodge study. Only isolated candidate writes."""
import bpy, math, random, json, hashlib, struct
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
for p in ['GUIDING_LIGHT.md','docs/rebuild/holm-overhaul/plan.json','Bible_References/Complete/Building_Exterior_Option3.jpg','Bible_References/Town2.jpg','tools/blender/build_holm_kitchen_wings_study.py']: assert (ROOT/p).is_file(),p
OUT=ROOT/'.studio-workspaces/holm-quest-lodge-v1/candidates'; OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
R=random.Random(913271); groups={}
def material(name,color,kind=None):
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True; bs=m.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value=(*color,1); bs.inputs['Roughness'].default_value=.95
 if kind:
  im=bpy.data.images.new('lodge_'+kind,width=128,height=128); pix=[]
  for y in range(128):
   for x in range(128):
    noise=R.uniform(-.016,.016)
    if kind=='stone':
     edge=y%16<1 or (x+(16 if (y//16)%2 else 0))%32<1; v=.43 if edge else .56+((y//16*7+(x+16*(y//16%2))//32*3)%5)*.013; c=(v+noise,v+noise,v*.96+noise)
    elif kind=='slate':
     edge=y%16<2 or (x+((y//16)%2)*16)%32<1; v=.235 if edge else .31+((x//32+y//16)%3)*.013; c=(v*.92+noise,v+noise,v*1.07+noise)
    elif kind=='reed':
     v=.43+noise+math.sin(x*1.6)*.026-(.025 if y%32<2 else 0); c=(v*1.21,v,v*.60)
    else:
     v=.24+noise+math.sin(x*.7+math.sin(y*.03))*.025; c=(v*1.16,v*.90,v*.61)
    pix.extend((*c,1))
  im.pixels.foreach_set(pix); im.filepath_raw=str(OUT/(im.name+'.png')); im.file_format='PNG'; im.save(); im.pack(); t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=im;t.interpolation='Closest';m.node_tree.links.new(t.outputs['Color'],bs.inputs['Base Color'])
 return m
stone=material('Light gray limestone',(.58,.58,.55),'stone');wood=material('Warm oak',(.28,.22,.15),'wood');slate=material('Blue gray slate',(.29,.32,.35),'slate');reed=material('Muted wheat thatch',(.52,.43,.27),'reed')
plaster=material('Oat plaster',(.75,.72,.61));glass=material('Muted old glass',(.56,.64,.60));paper=material('Original parchment',(.77,.68,.46));ink=material('Faded map ink',(.20,.27,.25));wax=material('Burgundy wax',(.40,.12,.10));linen=material('Sage guest blanket',(.34,.43,.31));iron=material('Dark iron',(.16,.17,.16))
def reg(o,g,m):
 o.name='Lodge_'+g; o.data.materials.append(m); groups.setdefault((g,m.name),[]).append(o)
 uv=o.data.uv_layers.active or o.data.uv_layers.new(name='UVMap');uv.active_render=True
 for p in o.data.polygons:
  axes=(0,1) if abs(p.normal.z)>.5 else ((0,2) if abs(p.normal.y)>.5 else (1,2))
  for li in p.loop_indices:
   v=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co;uv.data[li].uv=(v[axes[0]]*.28,v[axes[1]]*.28)
 return o
def box(g,p,s,m):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.dimensions=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return reg(o,g,m)
def mesh(g,v,f,m):
 me=bpy.data.meshes.new(g);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(g,me);bpy.context.collection.objects.link(o);return reg(o,g,m)
def beam(g,a,b,w,m=wood):
 d=Vector(b)-Vector(a);o=box(g,(Vector(a)+Vector(b))/2,(w,w,d.length),m);o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return o
def wall(axis,fixed,a,b,z0,z1,holes=[],g='GroundShell',m=stone):
 cuts=sorted(set([a,b]+[v for h in holes for v in h[:2]]))
 def pos(t,z):return (t,fixed,z) if axis=='X' else (fixed,t,z)
 for u,v in zip(cuts,cuts[1:]):
  h=next((h for h in holes if h[0]<=u and h[1]>=v),None)
  for lo,hi in ([(z0,z1)] if not h else [(z0,h[2]),(h[3],z1)]):
   if hi>lo:box(g,pos((u+v)/2,(lo+hi)/2),(v-u,.24,hi-lo) if axis=='X' else (.24,v-u,hi-lo),m)
 for h in holes:
  if h[2]<=z0:continue
  l,r,bot,top=h
  box('Glazing',pos((l+r)/2,(bot+top)/2),(r-l,.025,top-bot) if axis=='X' else (.025,r-l,top-bot),glass)
  for t in [l,(l+r)/2,r]:beam(g,pos(t,bot),pos(t,top),.085)
  for z in [bot,(bot+top)/2,top]:beam(g,pos(l,z),pos(r,z),.085)
 # Frames on both faces of wall, never buried inside masonry/plaster slabs.
 for face in [-.15,.15]:
  def fp(t,z):return (t,fixed+face,z) if axis=='X' else (fixed+face,t,z)
  for t in [a,b]:beam(g,fp(t,z0),fp(t,z1),.17)
  beam(g,fp(a,z1-.1),fp(b,z1-.1),.17)
  for u,v in zip(cuts,cuts[1:]):
   if not any(h[0]<=u and h[1]>=v and h[2]<=z0 for h in holes):beam(g,fp(u,z0+.1),fp(v,z0+.1),.17)
  if g=='UpperShell':
   for t in range(math.ceil(a),math.floor(b),2):
    if not any(h[0]<t+1.5 and h[1]>t for h in holes):beam(g,fp(t,z0+.2),fp(min(t+1.5,b),z1-.2),.14)

def floor(x0,y0,x1,y1,z,g='GroundFloor'):
 box(g,((x0+x1)/2,(y0+y1)/2,z-.09),(x1-x0,y1-y0,.18),wood)
def roof(x0,y0,x1,y1,eave,peak,axis,m):
 if axis=='Y':r=[((x0+x1)/2,y0+.7,peak),((x0+x1)/2,y1-.7,peak)]
 else:r=[(x0+.7,(y0+y1)/2,peak),(x1-.7,(y0+y1)/2,peak)]
 v=[(x0,y0,eave),(x1,y0,eave),(x1,y1,eave),(x0,y1,eave)]+r
 f=[(0,1,4),(1,2,5,4),(2,3,5),(3,0,4,5)] if axis=='Y' else [(0,1,5,4),(1,2,5),(2,3,4,5),(3,0,4)]
 mesh('Roof',v,f,m)
 for i in range(4):beam('Roof',v[i],v[(i+1)%4],.16)
 beam('Roof',r[0],r[1],.16)
# Connected ground footprint; crosswing projects south; east shallow polygon reading bay.
floor(-5,-2,5,4,0);floor(-5,-4,-1,-2,0)
poly=[(5,0),(5.95,.55),(6.35,1.5),(5.95,2.45),(5,3)]
mesh('GroundFloor',[(x,y,0) for x,y in poly],[(0,1,2,3,4)],wood)
wall('X',-2,-1,5,0,3.3,[(-.4,1.4,0,2.6),(2,3.2,1.15,2.4)])
wall('X',-4,-5,-1,0,3.3,[(-3.8,-2.2,1.15,2.4)])
wall('Y',-5,-4,4,0,3.3,[(-.8,.8,1.15,2.4),(2,3.2,1.15,2.4)])
wall('Y',-1,-4,-2,0,3.3)
wall('X',4,-5,5,0,3.3,[(-3.8,-2.2,1.15,2.4),(.1,1.5,1.15,2.4)])
wall('Y',5,-2,0,0,3.3);wall('Y',5,3,4,0,3.3)
for a,b in zip(poly,poly[1:]):
 beam('GroundShell',(*a,.48),(*b,.48),.95,stone);beam('GroundShell',(*a,2.9),(*b,2.9),.4,stone);beam('GroundShell',(*a,.7),(*a,2.9),.13)
 mesh('Glazing',[(*a,1),(*b,1),(*b,2.7),(*a,2.7)],[(0,1,2,3)],glass)
roof(4.95,0,6.55,3,3.3,4.05,'Y',reed)
# Tall west guest crosswing above a distinctly lower roadside hall.
floor(-5.25,-4.2,-2.65,4.2,3.3,'UpperFloor')
floor(-.65,-4.2,-.5,4.2,3.3,'UpperFloor')
floor(-2.65,-4.2,-.65,-1.9,3.3,'UpperFloor')
floor(-2.65,2.78,-.65,4.2,3.3,'UpperFloor')
wall('X',-4.2,-5.25,-.5,3.3,6.5,[(-4.5,-3.1,4.35,5.8)],'UpperShell',plaster)
wall('Y',-5.25,-4.2,4.2,3.3,6.5,[(-1.3,.2,4.35,5.8),(2.1,3.5,4.35,5.8)],'UpperShell',plaster)
wall('X',4.2,-5.25,-.5,3.3,6.5,[(-4.5,-3.1,4.35,5.8)],'UpperShell',plaster)
wall('Y',-.5,-4.2,4.2,3.3,6.5,[(.4,1.9,4.35,5.8)],'UpperShell',plaster)
for i in range(16):
 z=(i+1)*3.3/16;y=-1.7+i*.28;box('Stair',(-1.65,y+.14,z-.10),(1.6,.28,.2),wood)
for x in [-2.51,-.79]:
 beam('Stair',(x,-1.7,1),(x,2.78,4.3),.09)
 for i in [0,4,8,12,15]:
  y=-1.56+i*.28;z=(i+1)*3.3/16;beam('Stair',(x,y,z),(x,y,z+1),.08)
for x in [-2.7,-.6]:beam('UpperFurnishing',(x,-1.9,4.25),(x,2.78,4.25),.10)
roof(-5.6,-4.55,-.2,4.55,6.58,8.35,'Y',slate)
roof(-.25,-2.35,5.4,4.35,3.4,5.12,'X',reed)
# Visible knee brackets support the jettied upper guest wing.
for y in [-3.4,-1.1,1.25,3.45]:
 beam('GroundShell',(-4.99,y,2.68),(-5.23,y,3.22),.16)
 beam('GroundShell',(-.99,y,2.68),(-.55,y,3.22),.16)
for x in [-4.5,-3.2,-1.5]:beam('GroundShell',(x,-3.99,2.7),(x,-4.19,3.23),.16)
# Hero notice board on south crosswing wall facing room, seals and original drawn line cards.
box('FurnishingBoard',(-3,-3.79,1.75),(2.7,.14,1.9),wood)
for i,(x,z,w,h) in enumerate([(-3.8,2,.58,.92),(-3,1.9,.62,1.05),(-2.2,2.05,.5,.78)]):
 box('FurnishingBoard',(x,-3.69,z),(w,.025,h),paper)
 for j in range(3):box('FurnishingBoard',(x,-3.669,z+.17-j*.15),(w*.64,.012,.022),ink)
 bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=4,radius=.07,location=(x,-3.65,z-h*.34));o=bpy.context.object;o.scale=(1,.22,1);reg(o,'FurnishingBoard',wax)
def table(x,y,z,w,d,g):
 box(g,(x,y,z),(w,d,.14),wood)
 for dx in [-w*.4,w*.4]:
  for dy in [-d*.36,d*.36]:box(g,(x+dx,y+dy,(z-.1)/2 if z<2 else z-.45),(.13,.13,.8),wood)
table(2,.5,.94,2.6,1.4,'FurnishingMap');box('FurnishingMap',(2,.5,1.02),(1.9,.95,.015),paper)
for a,b in [((-2.7,.15,1.04),(-1.9,.35,1.04)),((-1.9,.35,1.04),(-1.4,.8,1.04)),((-2.4,.8,1.04),(-1.55,.1,1.04))]:beam('FurnishingMap',(a[0]+4,a[1],a[2]),(b[0]+4,b[1],b[2]),.023,ink)
for x in [-2.4,-1.2]:box('FurnishingMap',(x+4,.75,1.07),(.10,.10,.07),wax)
# Shelves group against north wall, few large books.
for z in [.3,1.05,1.8,2.55]:box('FurnishingShelf',(2.5,3.63,z),(2.3,.52,.12),wood)
for x in [1.38,3.62]:box('FurnishingShelf',(x,3.63,1.45),(.13,.55,2.6),wood)
for i in range(10):box('FurnishingShelf',(1.6+i*.18,3.61,1.37),(.13,.35,.51),[linen,wax,paper][i%3])
table(5.45,1.5,.84,.72,1.15,'FurnishingBay');box('FurnishingBay',(5.4,1.5,.94),(.45,.65,.05),paper)
# Guest room bed, writing desk and bench at upper level.
box('UpperFurnishing',(-4.15,-2.1,3.65),(1.5,2.3,.55),wood);box('UpperFurnishing',(-4.15,-2.1,3.98),(1.4,2.15,.2),linen);box('UpperFurnishing',(-4.15,-2.8,4.12),(1.1,.5,.2),paper)
table(-3.95,2.7,4.2,2.1,1,'UpperFurnishing');box('UpperFurnishing',(-3.95,2.7,4.29),(.7,.5,.035),paper);box('UpperFurnishing',(-3.95,1.8,3.75),(1.5,.42,.15),wood)
# Hollow cold masonry hearth: open west face, substantial flue through low roof.
box('FurnishingHearth',(4.5,-.95,.09),(1.05,1.55,.18),stone)
box('FurnishingHearth',(4.9,-.95,1.04),(.22,1.5,1.9),stone)
for y in [-1.59,-.31]:box('FurnishingHearth',(4.5,y,.87),(.82,.22,1.55),stone)
box('FurnishingHearth',(4.5,-.95,1.73),(1.05,1.55,.28),stone)
box('Chimney',(4.65,-.95,3.87),(.65,.83,4.05),stone)
box('Chimney',(4.65,-.95,5.93),(.85,1.03,.18),stone)
for x in [-4.45,-3.45]:box('UpperFurnishing',(x,1.8,3.49),(.14,.32,.38),wood)
# Genuine door pivot, separate animated leaf. Never merged into wall.
pivot=bpy.data.objects.new('Lodge_DoorPivot',None);bpy.context.collection.objects.link(pivot);pivot.location=(-.35,-2,0);bpy.context.view_layer.update()
door=box('Door',(.5,-2,1.27),(1.7,.1,2.54),wood)
for x in [-.18,.5,1.18]:box('Door',(x,-2.075,1.27),(.045,.055,2.5),iron)
for o in [o for (g,m),os in groups.items() if g=='Door' for o in os]:o.parent=pivot;o.matrix_parent_inverse=pivot.matrix_world.inverted()
for frame,angle in [(1,0),(20,0),(44,-math.pi*.51),(76,-math.pi*.51),(100,0)]:pivot.rotation_euler.z=angle;pivot.keyframe_insert(data_path='rotation_euler',frame=frame)
pivot.animation_data.action.name='Lodge_DoorOpenClose';bpy.context.scene.frame_end=100;bpy.context.scene.render.fps=24;bpy.context.scene.frame_set(1)
# Merge only identical semantic/material groups; pivot stays parent of door mesh.
for (g,m),objects in groups.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 if len(objects)>1:bpy.ops.object.join()
 bpy.context.object.name='Lodge_'+g+'_'+m.replace(' ','_')
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
assert tris<=14000 and len(meshes)<=65
assert all(math.isfinite(c) for o in meshes for v in o.data.vertices for c in v.co)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lodge.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'lodge.glb'),export_format='GLB',export_yup=True,export_animations=True)
b=(OUT/'lodge.glb').read_bytes();g=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]])
contract={'schema':'holm.building-shape-study.v1','name':'Quest Lodge — Jettied Reading Crosswing','status':'isolated Blender candidate; not installed or visually accepted','coordinates':'Blender X,Y plan Z up; glTF X,Y,Z = X,Z,-Y','footprint':[[-5,-4],[-1,-4],[-1,-2],[5,-2],[5,0],[5.95,.55],[6.35,1.5],[5.95,2.45],[5,3],[5,4],[-5,4]],'floorHeights':[0,3.3],'doorway':{'axis':'X','fixed':-2,'span':[-.4,1.4],'width':1.8,'height':2.6},'stairs':{'bounds':[-2.45,-1.7,-.85,2.78],'rise':3.3/16,'run':.28,'treads':16,'width':1.6,'upperAperture':[-2.65,-1.9,-.65,2.78],'headroomDesign':2.6},'triangleCount':tris,'meshCount':len(meshes),'meshNames':[o.name for o in meshes],'textures':'four original deterministic 128px patterns; no copied reference pixels','exportEvidence':{'sha256':hashlib.sha256(b).hexdigest(),'glbBytes':len(b),'embeddedImages':len(g.get('images',[])),'primitives':sum(len(m['primitives']) for m in g['meshes'])},'animations':[a['name'] for a in g.get('animations',[])],'unfinished':['actual measured capsule clearance and cardinal navigation','functional quest and journal binding','NPC','terrain placement','in-app reference review','door trigger and obstruction handling','Safe Publish'],'visualAcceptance':None}
(OUT/'contract.json').write_text(json.dumps(contract,indent=2),encoding='utf-8')
print('[QUEST_LODGE] finite geometry and budgets PASS',tris,len(meshes),contract['exportEvidence'])
