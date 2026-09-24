"""Blender-authored original Tutor's Holm dock candidate; never installs live assets.
Game coordinates x,y(up),z are mapped to Blender x,-z,y. Static working timber.
"""
import bpy, bmesh, json, math, hashlib, struct
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'.studio-workspaces/holm-arrival-dock-v1/candidates'
assert (ROOT/'docs/rebuild/holm-overhaul/arrival-layout.json').is_file()
assert (ROOT/'tools/blender/build_holm_guide_house_overhaul_v1.py').is_file()
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
root=bpy.data.objects.new('ArrivalDock',None);bpy.context.collection.objects.link(root)
PALETTE=[('Sun-worn oak',(.43,.32,.21)),('Pale plank edges',(.50,.39,.26)),('Dark structural oak',(.29,.22,.15)),('Tarred iron',(.16,.18,.17)),('Hemp rope',(.53,.44,.29))]
mats=[]
for name,col in PALETTE:
 m=bpy.data.materials.new(name);m.diffuse_color=(*col,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*col,1);bs.inputs['Roughness'].default_value=.92
 mats.append(m)
groups={};obstacles=[]
def add(name,verts,faces,mat,obstacle=False):
 g=groups.setdefault(name,{'vertices':[],'faces':[],'ids':[]});offset=len(g['vertices'])
 g['vertices'].extend(verts);g['faces'].extend(tuple(offset+i for i in f) for f in faces);g['ids'].extend([mat]*len(faces))
 if obstacle:
  bounds={'min':[min(v[i] for v in verts) for i in range(3)],'max':[max(v[i] for v in verts) for i in range(3)]}
  obstacles.append({'part':name,**bounds})
def box(name,x0,x1,y0,y1,z0,z1,mat,obstacle=False):
 add(name,[(x0,y0,z0),(x1,y0,z0),(x1,y1,z0),(x0,y1,z0),(x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],mat,obstacle)
def beam(name,a,b,width,mat,obstacle=False):
 axis=(Vector(b)-Vector(a)).normalized();u=axis.cross(Vector((0,1,0)))
 if u.length<.01:u=axis.cross(Vector((1,0,0)))
 u.normalize();v=axis.cross(u).normalized()
 verts=[tuple(Vector(p)+u*s*width/2+v*t*width/2) for p in [a,b] for s,t in [(-1,-1),(1,-1),(1,1),(-1,1)]]
 add(name,verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat,obstacle)
def rod(name,a,b,r,mat,obstacle=False,n=8):
 axis=(Vector(b)-Vector(a)).normalized();u=axis.cross(Vector((0,1,0)))
 if u.length<.01:u=axis.cross(Vector((1,0,0)))
 u.normalize();v=axis.cross(u).normalized()
 verts=[tuple(Vector(p)+r*(math.cos(i*2*math.pi/n)*u+math.sin(i*2*math.pi/n)*v)) for p in [a,b] for i in range(n)]
 faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 add(name,verts,faces,mat,obstacle)
# Continuous deck support. Plank joints are narrow dark inlays, not fall-through gaps.
for i in range(28):
 z0=-4.5+i*9.0/28;z1=-4.5+(i+1)*9.0/28
 box('DockDeck',-1.7,1.7,-.18,0,z0,z1,1 if i%7 in (0,3) else 0)
 if i:
  box('DockDeck',-1.69,1.69,0,.001,z0-.008,z0+.008,2)
 # Long thin worn grain marks remain flush: no raised obstacles under feet.
 for j in range(2):
  x=-1.3+((i*13+j*19)%21)*.1
  box('DockDeck',x,min(x+.34,1.45),.001,.0015,z0+.08+j*.09,z0+.087+j*.09,2)
# Structural stringers and cross heads hold the surface, never a floating plank plane.
for x in [-1.28,1.28]:box('DockStructure',x-.11,x+.11,-.45,-.18,-4.5,4.5,2)
for z in [-3.72,-1.24,1.24,3.72]:
 box('DockStructure',-1.83,1.83,-.60,-.34,z-.15,z+.15,2)
 for x in [-1.64,1.64]:
  rod('DockPiles',(x,-3.5,z),(x,-.28,z),.16,2)
  # Housed braces cross in the outer side plane beneath the deck.
  sign=1 if z<0 else -1
  beam('DockStructure',(x,-2.0,z),(x,-.45,z+sign*1.0),.17,2)
# Guard posts are wholly outside the clear x[-1.5,1.5] strip.
for x in [-1.64,1.64]:
 for z in [-4.20,-1.30,1.30,4.43]:
  box('DockRails',x-.11,x+.11,-.22,1.0,z-.065,z+.065,2,True)
  box('DockIron',x-.115,x+.115,.12,.19,z-.07,z+.07,3,True)
 box('DockRails',x-.065,x+.065,.87,.99,-4.37,4.5,0,True)
 # Draped hemp safety ropes between posts (static tensioned ropes, no free flags).
 for za,zb in zip([-4.20,-1.3,1.3],[-1.3,1.3,4.43]):
  pts=[(x,.58-.13*math.sin(math.pi*j/6),za+(zb-za)*j/6) for j in range(7)]
  for a,b in zip(pts,pts[1:]):rod('DockRopes',a,b,.027,4,True,6)
 # Mooring horns sit outboard, preserving the entire clear strip.
 for z in [-2.65,2.65]:
  rod('DockBollards',(x,0,z),(x,.47,z),.105,2,True)
  rod('DockBollards',(x,.37,z-.23),(x,.37,z+.23),.064,2,True)
  rod('DockIron',(x,.08,z),(x,.14,z),.11,3,True)
box('DockRails',-1.7,1.7,.87,.99,4.36,4.5,0,True)
box('DockRails',-1.7,1.7,.40,.51,4.36,4.5,2,True)
# Manifest collision claim is conservative AABB exclusion, not a runtime capsule test.
for o in obstacles:
 lo,hi=o['min'],o['max']
 assert not (hi[1]>0 and lo[1]<2.2 and hi[0]>-1.5 and lo[0]<1.5 and hi[2]>-4.5 and lo[2]<4.3),o
meshes=[]
for name,g in groups.items():
 assert all(math.isfinite(c) for p in g['vertices'] for c in p)
 data=bpy.data.meshes.new(name);data.from_pydata([(x,-z,y) for x,y,z in g['vertices']],[],g['faces']);data.update()
 for mat in mats:data.materials.append(mat)
 for poly,idx in zip(data.polygons,g['ids']):poly.material_index=idx
 bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
 obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.parent=root;meshes.append(obj)
tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
assert tris<8000 and len(meshes)<=12 and len(mats)<=6
verts=[p for g in groups.values() for p in g['vertices']]
bounds={'min':[min(v[i] for v in verts) for i in range(3)],'max':[max(v[i] for v in verts) for i in range(3)]}
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'dock.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'dock.glb'),export_format='GLB',export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
glb_bytes=(OUT/'dock.glb').read_bytes()
json_length=struct.unpack_from('<I',glb_bytes,12)[0]
gltf=json.loads(glb_bytes[20:20+json_length])
primitive_count=sum(len(m['primitives']) for m in gltf['meshes'])
assert primitive_count<=12 and len(gltf['materials'])<=6
for mesh_data in gltf['meshes']:
 for primitive in mesh_data['primitives']:
  accessor=gltf['accessors'][primitive['attributes']['POSITION']]
  assert all(math.isfinite(value) for key in ['min','max'] for value in accessor[key])
manifest={'schema':'holm-arrival-dock-candidate-v1','status':'Blender candidate; not visually accepted or published','root':'ArrivalDock','coordinates':'local game x,y-up,z; north=-z','deck':{'topY':0,'thickness':.18,'width':3.4,'length':9.0,'bounds':{'x0':-1.7,'x1':1.7,'z0':-4.5,'z1':4.5},'surfaceDetailMaxY':.0015,'raycastMeshPrefix':'DockDeck'},'supportRectangle':{'x0':-1.5,'x1':1.5,'z0':-4.5,'z1':4.3,'y':0},'obstacles':obstacles,'obstacleClearanceVerified':'Every above-deck component AABB excludes open clear rectangle; below-deck components not obstacles. Runtime avatar radius must erode rectangle.','bounds':bounds,'triangles':tris,'meshes':len(meshes),'gltfPrimitives':primitive_count,'materials':len(mats),'animations':[],'references':['Bible_References/Complete/Fishing_Pier_Option1.jpg','Bible_References/INVENTORY.md'],'sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [OUT/'dock.blend',OUT/'dock.glb']},'remaining':['Main-session in-app Studio visual inspection and reference comparison','Placement, navigation, raycast and live performance gates','Safe Publish transaction']}
(OUT/'dock.manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print('[HOLM_DOCK] finite geometry, clear rectangle and budgets PASS',tris,'triangles',len(meshes),'meshes',len(mats),'materials')
