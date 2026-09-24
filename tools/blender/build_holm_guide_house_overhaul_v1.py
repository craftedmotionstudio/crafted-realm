"""Original overhaul shell study: explicit wall openings and usable floor well.
Not final art; no live world publication. Coordinates x,z-plan,y-up mapped to Blender x,-z,y.
"""
import bpy,json,math,random
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'.studio-workspaces/holm-guide-house-overhaul-v1/candidates'
PROOF=ROOT/'scratchpad/holm_guide_house_overhaul_v1'
OUT.mkdir(parents=True,exist_ok=True);PROOF.mkdir(parents=True,exist_ok=True)
LAYOUT=json.loads((ROOT/'docs/rebuild/holm-overhaul/arrival-layout.json').read_text())
DOOR_WIDTH=LAYOUT['doors'][0]['clearWidth']
assert all(d['clearWidth']==DOOR_WIDTH for d in LAYOUT['doors'])
bpy.ops.wm.read_factory_settings(use_empty=True)
def material(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);return m
stone=material('Warm fieldstone',(.43,.46,.40));wood=material('Aged oak',(.30,.20,.12));roofmat=material('Muted clay',(.39,.22,.17));floor=material('Warm floorboards',(.43,.32,.20))
stone_light=material('Stone lit faces',(.52,.54,.46));stone_dark=material('Stone shaded faces',(.37,.40,.35));sillmat=material('Dressed sandstone',(.57,.53,.42))
root=bpy.data.objects.new('GuideHouse',None);bpy.context.collection.objects.link(root)
def mesh(name,vertices,faces,mat):
 data=bpy.data.meshes.new(name);data.from_pydata([(x,-z,y) for x,y,z in vertices],[],faces);data.update()
 obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.parent=root;obj.data.materials.append(mat);return obj
def prism(name,x0,x1,y0,y1,z0,z1,mat):
 return mesh(name,[(x0,y0,z0),(x1,y0,z0),(x1,y1,z0),(x0,y1,z0),(x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],mat)
def beam(name,a,b,width,depth,mat):
 # Rectangular timber section swept between fitted endpoints.
 axis=(Vector(b)-Vector(a)).normalized();side=axis.cross(Vector((0,0,1)))
 if side.length<.01:side=axis.cross(Vector((1,0,0)))
 side.normalize();up=axis.cross(side).normalized()
 vertices=[tuple(Vector(p)+side*s*width/2+up*t*depth/2) for p in [a,b] for s,t in [(-1,-1),(1,-1),(1,1),(-1,1)]]
 return mesh(name,vertices,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat)
def wall(name,length,height,base,axis,constant,holes):
 # Grid partition creates actual voids with reveal thickness, never false windows.
 us=sorted(set([-length/2,length/2]+[n for h in holes for n in h[:2]]));vs=sorted(set([base,base+height]+[n for h in holes for n in h[2:]]))
 parts=[]
 for u0,u1 in zip(us,us[1:]):
  for v0,v1 in zip(vs,vs[1:]):
   u=(u0+u1)/2;v=(v0+v1)/2
   if any(a<u<b and c<v<d for a,b,c,d in holes):continue
   if axis=='x':o=prism(name,u0,u1,v0,v1,constant-.175,constant+.175,stone)
   else:o=prism(name,constant-.175,constant+.175,v0,v1,u0,u1,stone)
   parts.append(o)
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();parts[0].name=name
 return parts[0]
def stone_facing(name,length,base,height,axis,constant,holes,outward):
 # Staggered hand-cut faces are a shallow relief skin over the structural wall.
 # Clip courses to every opening; chamfered silhouettes and face ramps describe stone.
 rng=random.Random(name);vertices=[];faces=[];ids=[]
 def point(u,v,depth):return (u,v,constant+outward*depth) if axis=='x' else (constant+outward*depth,v,u)
 for row in range(math.ceil(height/.36)):
  low=base+row*.36;high=min(base+height,low+.36);u=-length/2
  while u<length/2-.01:
   right=min(length/2,u+rng.uniform(.58,1.05));segments=[(u,right,low,high)]
   for a,b,c,d in holes:
    next_segments=[]
    for l,r,lo,hi in segments:
     if r<=a or l>=b or hi<=c or lo>=d:next_segments.append((l,r,lo,hi));continue
     if l<a:next_segments.append((l,a,lo,hi))
     if r>b:next_segments.append((b,r,lo,hi))
     if lo<c:next_segments.append((max(l,a),min(r,b),lo,c))
     if hi>d:next_segments.append((max(l,a),min(r,b),d,hi))
    segments=next_segments
   for l,r,lo,hi in segments:
    l+=.012;r-=.012;lo+=.012;hi-=.012
    if r-l<.04 or hi-lo<.04:continue
    bevel=min(.045,(r-l)/5,(hi-lo)/5);k=len(vertices)
    outline=[(l+bevel,lo),(r-bevel,lo),(r,lo+bevel),(r,hi-bevel),(r-bevel,hi),(l+bevel,hi),(l,hi-bevel),(l,lo+bevel)]
    vertices.extend(point(a,b,.178) for a,b in outline)
    vertices.extend(point(a+(1 if a<(l+r)/2 else -1)*.015,b+(1 if b<(lo+hi)/2 else -1)*.015,.205+rng.uniform(0,.018)) for a,b in outline)
    faces.append(tuple(k+8+i for i in range(8)));ids.append(rng.choice([0,0,0,1,2]))
    for i in range(8):faces.append((k+i,k+(i+1)%8,k+8+(i+1)%8,k+8+i));ids.append(1 if i in [3,4] else 2)
   u=right
 o=mesh(name,vertices,faces,stone);o.data.materials.append(stone_light);o.data.materials.append(stone_dark)
 for p,index in zip(o.data.polygons,ids):p.material_index=index
 # Surface facing winding is adjusted per side so the visible relief faces outward.
 import bmesh
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free()
 o.data.materials[0].use_backface_culling=False
for upper in [False,True]:
 base=2.8 if upper else 0;height=2.6 if upper else 2.8;prefix='UpperShell' if upper else 'GroundShell'
 windows=[[-4.5,-3.1,base+1,base+2.15],[2.3,3.7,base+1,base+2.15]]
 for side,z in [('South',5),('North',-5)]:
  holes=windows+([] if upper else [[-DOOR_WIDTH/2,DOOR_WIDTH/2,0,2.3]])
  wall(prefix+side,12,height,base,'x',z,holes);stone_facing(prefix+side+'Facing',12,base,height,'x',z,holes,1 if z>0 else -1)
  for a,b,c,d in windows:
   prism(prefix+side+'Sill',a-.12,b+.12,c-.13,c,z-.30,z+.30,sillmat)
   prism(prefix+side+'Lintel',a-.13,b+.13,d,d+.15,z-.23,z+.23,sillmat)
   for x in [a+.055,b-.055]:prism(prefix+side+'WindowJamb',x-.055,x+.055,c,d,z-.19,z+.19,wood)
   prism(prefix+side+'WindowHead',a,b,d-.10,d,z-.19,z+.19,wood)
   prism(prefix+side+'WindowMullion',(a+b)/2-.045,(a+b)/2+.045,c,d,z-.08,z+.08,wood)
 for side,x in [('East',6),('West',-6)]:
  holes=[[-3.7,-2.3,base+1,base+2.15],[1.7,3.1,base+1,base+2.15]]
  if side=='West':holes=holes[1:] # west hearth/flue owns the northern wall bay
  wall(prefix+side,9.65,height,base,'z',x,holes);stone_facing(prefix+side+'Facing',9.65,base,height,'z',x,holes,1 if x>0 else -1)
prism('GroundFloor',-5.825,5.825,-.2,0,-4.825,4.825,floor)
STAIRS=LAYOUT['stairs'];SZ0=STAIRS['startZ'];SZ1=STAIRS['endZ']
# Four fitted floor bands around a 1.5 x 4.8 stair well.
for i,(x0,x1,z0,z1) in enumerate([(-5.825,3.5,-4.825,4.825),(5,5.825,-4.825,4.825),(3.5,5,-4.825,SZ1),(3.5,5,SZ0,4.825)]):prism('UpperFloor'+str(i),x0,x1,2.6,2.8,z0,z1,floor)
for i in range(12):
 z1=SZ0-i*.4;z0=z1-.4;y=(i+1)*2.8/12
 prism('StairFlight'+str(i),3.5,5,y-.18,y,z0,z1,wood)
# Fitted sloping stringers under both tread edges; preserve the 1.5-tile clear flight.
for x in [3.38,5.0]:
 mesh('StairStringer',[(x,0,SZ0),(x,2.62,SZ1),(x,2.8,SZ1),(x,.18,SZ0),(x+.12,0,SZ0),(x+.12,2.62,SZ1),(x+.12,2.8,SZ1),(x+.12,.18,SZ0)],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],wood)
for x in [3.38,5.12]:
 for z in [SZ1+i*(SZ0-SZ1)/4 for i in range(5)]:
  y=(SZ0-z)*2.8/4.8
  prism('StairHandrailPost',x-.05,x+.05,y,y+.9,z-.05,z+.05,wood)
 mesh('StairHandrail',[(x-.055,.87,(SZ0+.1)),(x-.055,3.67,(SZ1+.1)),(x-.055,3.78,(SZ1+.1)),(x-.055,.98,(SZ0+.1)),(x+.055,.87,(SZ0+.1)),(x+.055,3.67,(SZ1+.1)),(x+.055,3.78,(SZ1+.1)),(x+.055,.98,(SZ0+.1))],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],wood)
# Gable roof: eave flare and ridge break are explicitly shaped vertices.
for side in [-1,1]:
 vertices=[]
 for z in [-5.5,5.5]:
  for x,y in [(0,8.1),(side*4.6,6.2),(side*6.5,5.55)]:vertices.append((x,y,z))
 faces=[(0,1,4,3),(1,2,5,4)]
 if side==1:faces=[tuple(reversed(f)) for f in faces]
 o=mesh('Roof'+str(side),vertices,faces,roofmat)
 solid=o.modifiers.new('Roof edge thickness','SOLIDIFY');solid.thickness=.18
for z in [-5,5]:
 # Follows both roof pitches, with actual masonry thickness and no open eave slit.
 profile=[(-6,5.4),(6,5.4),(6,5.55+.5*.65/1.9),(4.6,6.2),(0,8.1),(-4.6,6.2),(-6,5.55+.5*.65/1.9)]
 verts=[(x,y,z+dz) for dz in [-.175,.175] for x,y in profile];n=len(profile)
 mesh('Gable',verts,[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],stone)
for z in [-5.53,5.53]:
 for sign in [-1,1]:
  beam('RoofBargeboard',(0,8.08,z),(sign*4.6,6.18,z),.22,.22,wood)
  beam('RoofBargeboard',(sign*4.6,6.18,z),(sign*6.52,5.53,z),.22,.22,wood)
for x in [-6.5,6.5]:beam('RoofEaveFascia',(x,5.5,-5.53),(x,5.5,5.53),.20,.23,wood)
beam('RoofRidge',(0,8.15,-5.6),(0,8.15,5.6),.22,.20,roofmat)
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from holm_guide_house_furnishings import build as furnish
furnish(globals())
from holm_guide_house_doors import build as add_doors
add_doors(globals())
from holm_guide_house_hearth import build as add_hearth
add_hearth(globals())
from holm_guide_house_exterior import build as add_exterior
add_exterior(globals())
# Batch fixed parts by cutaway owner; modifiers must be baked before joining.
for prefix in ['GroundShell','UpperShell','UpperFloor','Roof','Stair','GroundFurnishing','UpperFurnishing','GroundHearth','UpperHearth']:
 parts=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith(prefix)]
 for o in parts:
  bpy.context.view_layer.objects.active=o
  for modifier in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=modifier.name)
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0]
 if len(parts)>1:bpy.ops.object.join()
 parts[0].name='StairFlight' if prefix=='Stair' else prefix
bpy.context.view_layer.update()
model=OUT/'holm_guide_house_overhaul_v1'
bpy.ops.wm.save_as_mainfile(filepath=str(model.with_suffix('.blend')))
bpy.ops.export_scene.gltf(filepath=str(model.with_suffix('.glb')),export_format='GLB',export_yup=True)
corners=[o.matrix_world@Vector(c) for o in bpy.context.scene.objects if o.type=='MESH' for c in o.bound_box]
dims=[max(v[i] for v in corners)-min(v[i] for v in corners) for i in range(3)]
report={'status':'shell-study-unapproved','humanScaleContract':{'doorWidth':DOOR_WIDTH,'doorHeight':2.3,'upperFloorY':2.8},'dimensionsTiles':{'width':dims[0],'depth':dims[1],'height':dims[2]},'unfinished':['masonry surface design','roof construction detail','furnishings final review','door hinge mounting detail and runtime collision','fireplace','porch and planting','installed contact and scale proofs']}
(PROOF/'asset_report.json').write_text(json.dumps(report,indent=2))
print('[GUIDE_HOUSE_SHELL] saved editable source and GLB; not accepted')


