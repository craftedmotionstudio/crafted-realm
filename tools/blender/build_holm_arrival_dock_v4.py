"""Tutor's Holm arrival dock v4 (2026-09-25 world fixes, owner play-test: "with the boat that's tied to the dock, I can
see water inside the bottom of the boat"). The dock itself is byte-for-byte the v3 geometry (same deck, structure,
rails, landing; the arrival navigation is unchanged). Only the moored rowing boat changes: the flat sea plane (world
y -0.03) cut through the open hull, whose bottom ran 22 cm under it, so the sea showed between the thwarts. The boat now
floats 12 cm higher (a light, empty skiff: 10 cm draught, keel and garboards still under the waterline outside) and has
a closed inner floor (a sole of dark oak) across the hull at the old waterline, laid with three pale bottom boards; the
thwarts, stern seat, oars, rope coil, sack and crate are lifted onto it. Under the full idle bob (heave, list, pitch)
the sole stays at least 3 cm over the sea plane, so no water can show inside. Previous notes (v3):
Tutor's Holm arrival dock v3 (owner, 2026-09-25, z-fighting sweep): v2 plus a gapless deck top (plank and
joint quads on one plane, no stacked inlays), posts and bollards seated into the timber, lapped X-braces, end rails
that no longer share faces, and a stone landing at the shore end. The landing pad under the first 3.3 m of the
dock is terrain at exactly world y 1.00, the dock's navigation height; the arrival navigation requires the deck
and the shore to meet at one height, so the navigation plane stays at 1.00 and the planked surface is laid 4 cm
above it (DockDeck top at local +0.04), with a 3 cm sandstone threshold between shore and deck. Nothing the graph
uses moves. Previous notes (v2, 2026-09-25): v1's deck, rails, ropes and bollards unchanged; the
under-deck structure rebuilt so every member connects (stringers and edge joists sit on the bearers, bearers are
housed on the pile heads, piles run from the deck down through the water into the seabed, X-braces are bolted to
the outboard faces of two neighbouring piles at both ends, guard posts are fixed to the edge joists), plus a small
moored rowing boat with a gentle idle bob (clip 'Breeze', which the arrival model owner already loops).
Game coordinates x,y(up),z are mapped to Blender x,-z,y. Original design.
"""
import bpy, bmesh, json, math, hashlib, struct
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'.studio-workspaces/holm-arrival-dock-v4/candidates'
assert (ROOT/'docs/rebuild/holm-overhaul/arrival-layout.json').is_file()
assert (ROOT/'tools/blender/build_holm_guide_house_overhaul_v1.py').is_file()
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
root=bpy.data.objects.new('ArrivalDock',None);bpy.context.collection.objects.link(root)
PALETTE=[('Sun-worn oak',(.43,.32,.21)),('Pale plank edges',(.50,.39,.26)),('Dark structural oak',(.29,.22,.15)),('Tarred iron',(.16,.18,.17)),('Hemp rope',(.53,.44,.29)),('Boat sackcloth',(.69,.61,.44)),('Boat sheer paint',(.31,.43,.37)),('Landing sandstone',(.62,.57,.46)),('Footing stone',(.45,.46,.42))]
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
# v3 deck: one timber body (no top face) under a single plane of plank and joint quads, so no two faces share
# the walk plane; no stacked grain inlays.
TOPY=.04   # planked surface 4 cm above the 1.00 navigation plane (and the landing pad)
box('DockDeck',-1.7,1.7,-.18,TOPY-.01,-4.5,4.5,2)   # closed timber body; the plank plane lies 1 cm above its top
for i in range(28):
 z0=-4.5+i*9.0/28;z1=-4.5+(i+1)*9.0/28;j0=z0+(.008 if i else 0);j1=z1-(.008 if i<27 else 0)
 add('DockDeck',[(-1.7,TOPY,j0),(1.7,TOPY,j0),(1.7,TOPY,j1),(-1.7,TOPY,j1)],[(0,3,2,1)],1 if i%7 in (0,3) else 0)
 if i<27:add('DockDeck',[(-1.7,TOPY,j1),(1.7,TOPY,j1),(1.7,TOPY,z1+.008),(-1.7,TOPY,z1+.008)],[(0,3,2,1)],2)
for x in (-1.7,1.7):add('DockDeck',[(x,TOPY-.01,-4.5),(x,TOPY-.01,4.5),(x,TOPY,4.5),(x,TOPY,-4.5)],[(0,1,2,3)],1)
for z in (-4.5,4.5):add('DockDeck',[(-1.7,TOPY-.01,z),(1.7,TOPY-.01,z),(1.7,TOPY,z),(-1.7,TOPY,z)],[(0,1,2,3)],1)
# landward landing: a sandstone threshold (top 3 cm over the 1.00-1.006 shore, 1 cm under the planks) on a stone
# footing wall that the deck end bears on, both sunk into the ground
box('DockLanding',-1.95,1.95,-.45,.03,-4.95,-4.5,7)
box('DockLanding',-1.9,1.9,-1.4,-.19,-4.9,-4.5,8)
# ---- v2 structure: deck (y -.18..0) on stringers and edge joists (y -.34..-.18) on bearers (y -.60..-.34)
# housed on the pile heads; piles from the seabed (y -3.5, about 1 m into the bed) up into the bearers.
BEARERS=[-3.72,-1.24,1.24,3.72];PILE_X=1.64;PILE_R=.16;BOLTS=set()
for x in [-1.28,0.0,1.28]:box('DockStructure',x-.11,x+.11,-.34,-.18,-4.5,4.5,2)          # stringers
for x in [-1.6,1.6]:box('DockStructure',x-.08,x+.08,-.34,-.18,-4.5,4.5,2)                # edge joists (posts bolt here)
for z in BEARERS:
 box('DockStructure',-1.83,1.83,-.60,-.34,z-.15,z+.15,2)
 for x in [-PILE_X,PILE_X]:
  rod('DockPiles',(x,-3.5,z),(x,-.36,z),PILE_R,2)                                          # top housed inside the bearer
  rod('DockIron',(x,-.66,z),(x,-.60,z),PILE_R+.02,3)                                       # iron band under the bearer
# X-braces in each bay, bolted flat to the outboard faces of the two piles they join
for x in [-PILE_X,PILE_X]:
 out=1 if x>0 else -1;bx=x+out*(PILE_R+.035)
 for za,zb in zip(BEARERS,BEARERS[1:]):
  for lap,(lo,hi) in enumerate(((za,zb),(zb,za))):
   bxl=bx+out*.075*lap           # the second brace of each X laps over the first
   a=Vector((bxl,-1.75,lo+(.06 if hi>lo else -.06)));b=Vector((bxl,-.66,hi-(.06 if hi>lo else -.06)))
   d=(b-a).normalized()
   box_pts=[a-d*.08,b+d*.08]
   beam('DockStructure',tuple(box_pts[0]),tuple(box_pts[1]),.07,2)
  for zz in (za,zb):
   for yy in (-1.75,-.66):
    if (x,zz,yy) in BOLTS:continue       # piles between two bays carry one bolt per height, not two
    BOLTS.add((x,zz,yy));rod('DockIron',(bx-out*.05,yy,zz),(bx+out*.135,yy,zz),.03,3,n=6)       # bolt heads through brace and pile
# Guard posts are wholly outside the clear x[-1.5,1.5] strip.
for x in [-1.64,1.64]:
 for z in [-4.20,-1.30,1.30,4.43]:
  box('DockRails',x-.11,x+.11,-.36,1.0,z-.065,z+.065,2,True)   # seated 2 cm past the edge joist
  box('DockIron',x-.115,x+.115,.12,.19,z-.07,z+.07,3,True)
 box('DockRails',x-.065,x+.065,.87,.99,-4.37,4.36,0,True)   # butts into the end rail
 # Draped hemp safety ropes between posts (static tensioned ropes, no free flags).
 for za,zb in zip([-4.20,-1.3,1.3],[-1.3,1.3,4.43]):
  pts=[(x,.58-.13*math.sin(math.pi*j/6),za+(zb-za)*j/6) for j in range(7)]
  for a,b in zip(pts,pts[1:]):rod('DockRopes',a,b,.027,4,True,6)
 # Mooring horns sit outboard, preserving the entire clear strip.
 for z in [-2.65,2.65]:
  rod('DockBollards',(x,-.05,z),(x,.47,z),.105,2,True)          # seated into the deck
  rod('DockBollards',(x,.37,z-.23),(x,.37,z+.23),.064,2,True)
  rod('DockIron',(x,.08,z),(x,.14,z),.11,3,True)
box('DockRails',-1.72,1.72,.87,.99,4.36,4.52,0,True)
box('DockRails',-1.72,1.72,.40,.51,4.36,4.52,2,True)
# Manifest collision claim is conservative AABB exclusion, not a runtime capsule test.
for o in obstacles:
 lo,hi=o['min'],o['max']
 assert not (hi[1]>0 and lo[1]<2.2 and hi[0]>-1.5 and lo[0]<1.5 and hi[2]>-4.5 and lo[2]<4.3),o
# ---- the moored rowing boat (decorative: no deck surface, not clickable, off the walking deck), authored in
# boat space (x across, y up from the waterline, z along, bow +z) and parented to an animated pivot
from mathutils import Matrix
dock_groups=groups;groups={};boat_obstacles=obstacles;obstacles=[]
L2=1.55
def half_beam(z):
 t=(z+.12)/1.68;return max(.30 if z<-1.4 else 0,.56*math.sqrt(max(0.0,1-t*t)))
def sheer(z):return .30+.10*(z/L2)**2
def keel(z):return -.22*(1-(z/1.62)**4)
FR=[0,.28,.55,.8,1.0];ST=[-1.55+i*3.1/10 for i in range(11)]
def sec(z,side):
 b=half_beam(z);h=sheer(z);k=keel(z)
 return [(side*b*(1-f**1.7),h+(k-h)*f**.85,z) for f in FR]
for side in (-1,1):
 for za,zb in zip(ST,ST[1:]):
  A=sec(za,side);Bs=sec(zb,side)
  for i in range(4):add('DockBoatHull',[A[i],A[i+1],Bs[i+1],Bs[i]],[(0,1,2,3)],6 if i==0 else (1 if i%2 else 0))
# transom and stem
T=sec(-1.55,-1)[::-1]+sec(-1.55,1)[1:]
add('DockBoatHull',T,[tuple(range(len(T)))],2)
for side in (-1,1):
 for za,zb in zip(ST,ST[1:]):
  a=sec(za,side)[0];b=sec(zb,side)[0]
  beam('DockBoatHull',(a[0],a[1]+.02,a[2]),(b[0],b[1]+.02,b[2]),.055,2)                      # gunwale rail
for za,zb in zip(ST,ST[1:]):beam('DockBoatHull',(0,keel(za)-.02,za),(0,keel(zb)-.02,zb),.06,2) # keel
beam('DockBoatHull',(0,keel(1.5),1.58),(0,sheer(1.55)+.06,1.6),.07,2)                          # stem post
# v4: the closed sole. At each hull station the faceted section is cut at SOLE (boat space, the v3 waterline) and the
# cut points are joined into one floor from the transom to the bow, eased 1.2 cm into the planking so no seam opens.
SOLE=0.0
def cut(z,side):
 s=sec(z,side)
 for p,q in zip(s,s[1:]):
  if (p[1]-SOLE)*(q[1]-SOLE)<=0 and p[1]!=q[1]:
   t=(SOLE-p[1])/(q[1]-p[1]);return p[0]+(q[0]-p[0])*t
 return 0.0
rows=[(z,cut(z,-1),cut(z,1)) for z in ST]
for (za,la,ra),(zb,lb,rb) in zip(rows,rows[1:]):
 e=.012
 add('DockBoatHull',[(la-e*(la<0),SOLE,za),(ra+e*(ra>0),SOLE,za),(rb+e*(rb>0),SOLE,zb),(lb-e*(lb<0),SOLE,zb)],[(0,3,2,1)],2)
# bottom boards laid on the sole, thwarts and stern seat (each lifted 3 cm for the shallower well)
for x0b,x1b,z0b,z1b in ((-.26,-.1,-1.05,.8),(-.08,.08,-1.3,1.2),(.1,.26,-1.05,.8)):
 box('DockBoatHull',x0b,x1b,SOLE+.002,SOLE+.027,z0b,z1b,1)
for z,w in ((-.35,.2),(.55,.2)):
 b=half_beam(z)-.03;box('DockBoatHull',-b,b,.15,.19,z-w/2,z+w/2,0)
b=half_beam(-1.2)-.03;box('DockBoatHull',-b,b,.13,.17,-1.4,-1.05,0)
# oars resting on the thwarts, blades forward; oarlock pins on the gunwales
for x in (-.17,.17):
 rod('DockBoatFittings',(x,.22,-1.3),(x,.22,1.0),.026,1,n=6)
 box('DockBoatFittings',x-.065,x+.065,.21,.23,1.0,1.42,1)
for side in (-1,1):
 g=sec(.55,side)[0];rod('DockBoatFittings',(g[0],g[1]+.04,.55),(g[0],g[1]+.14,.55),.018,3,n=6)
# coil of rope in the bow, luggage (a sack and a small crate) aft
for i,(r,y) in enumerate(((.17,SOLE+.028),(.15,SOLE+.068),(.13,SOLE+.108))):
 n=10;pts=[(r*math.cos(2*math.pi*j/n),y,1.05+r*math.sin(2*math.pi*j/n)) for j in range(n+1)]
 for a,b in zip(pts,pts[1:]):rod('DockBoatFittings',a,b,.028,4,n=5)
rod('DockBoatFittings',(0,SOLE,-.85),(0,SOLE+.35,-.85),.17,5,n=7);rod('DockBoatFittings',(0,SOLE+.35,-.85),(0,SOLE+.43,-.85),.06,4,n=6)
box('DockBoatFittings',-.34,-.02,SOLE+.027,SOLE+.317,-.72,-.42,1);box('DockBoatFittings',-.35,-.01,SOLE+.187,SOLE+.217,-.73,-.41,2)
# boat pose beside the east side of the deck, bow toward the bollard at z 2.65
RAISE=.12   # v4: the empty skiff rides 12 cm higher; the sea plane (world -0.03) now meets the hull at boat y -RAISE
PIV=Vector((2.62,-1.03+RAISE,1.55));YAW=math.radians(-4);LIST=math.radians(4)   # dock at world 1.00
def to_dock(p):
 x,y,z=p;c,s=math.cos(LIST),math.sin(LIST);x,y=x*c-y*s,x*s+y*c
 c,s=math.cos(YAW),math.sin(YAW);x,z=x*c+z*s,-x*s+z*c
 return Vector((x,y,z))+PIV
def to_boat(p):
 v=Vector(p)-PIV;c,s=math.cos(-YAW),math.sin(-YAW);x,z=v.x*c+v.z*s,-v.x*s+v.z*c;y=v.y
 c,s=math.cos(-LIST),math.sin(-LIST);x,y=x*c-y*s,x*s+y*c
 return (x,y,z)
# mooring line: bow ring to the east bollard horn, sagging a little
ring=(0,sheer(1.55)+.05,1.62);rod('DockBoatFittings',(ring[0],ring[1],ring[2]-.03),(ring[0],ring[1],ring[2]+.03),.035,3,n=6)
horn=to_boat((1.70,.37,2.58));pts=[]
for j in range(9):
 t=j/8;p=Vector(ring).lerp(Vector(horn),t);p.y-=.28*math.sin(math.pi*t);pts.append(tuple(p))
for a,b in zip(pts,pts[1:]):rod('DockBoatFittings',a,b,.022,4,n=5)
rod('DockBoatFittings',horn,(horn[0],horn[1]-.02,horn[2]+.08),.03,4,n=5)
boat_groups=groups;groups=dock_groups;obstacles=boat_obstacles
meshes=[]
for name,g in groups.items():
 assert all(math.isfinite(c) for p in g['vertices'] for c in p)
 data=bpy.data.meshes.new(name);data.from_pydata([(x,-z,y) for x,y,z in g['vertices']],[],g['faces']);data.update()
 for mat in mats:data.materials.append(mat)
 for poly,idx in zip(data.polygons,g['ids']):poly.material_index=idx
 bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
 obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.parent=root;meshes.append(obj)
boat=bpy.data.objects.new('DockBoat',None);bpy.context.collection.objects.link(boat);boat.parent=root
boat.location=(PIV.x,-PIV.z,PIV.y);boat.rotation_mode='XYZ'
for name,g in boat_groups.items():
 data=bpy.data.meshes.new(name);data.from_pydata([(x,-z,y) for x,y,z in g['vertices']],[],g['faces']);data.update()
 for mat in mats:data.materials.append(mat)
 for poly,idx in zip(data.polygons,g['ids']):poly.material_index=idx
 obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.parent=boat;meshes.append(obj)
# Blender rotation of the pivot: game yaw about y = Blender Z; game list about the boat's long axis (game z) = Blender -Y
def pose(t):
 heave=.015*math.sin(2*math.pi*t);roll=LIST+math.radians(2.2)*math.sin(2*math.pi*t+.7);pitch=math.radians(.9)*math.sin(4*math.pi*t)
 return heave,roll,pitch
bpy.context.scene.render.fps=24;N=120
for f in range(0,N+1,6):
 h,r,pi=pose(f/N);boat.location=(PIV.x,-PIV.z,PIV.y+h);boat.rotation_euler=(pi,-r,YAW);boat.keyframe_insert('location',frame=f+1);boat.keyframe_insert('rotation_euler',frame=f+1)
boat.animation_data.action.name='Breeze'
# v4 gate: every sole vertex stays at least 3 cm over the sea plane (dock local y -1.03) in every frame of the bob
sole=[v for (z,l,r) in rows for v in ((l,SOLE,z),(r,SOLE,z))]
low=9
for f in range(0,N+1):
 h,r,pi=pose(f/N);bpy.context.scene.frame_set(f+1);M=boat.matrix_world
 for (x,y,z) in sole:
  w=M@Vector((x,-z,y));low=min(low,w.z-(-1.03))
assert low>=.03,('sole dips to %.3f over the sea plane'%low)
print('[HOLM_DOCK_V4] lowest sole point over the sea plane through the bob: %.3f m'%low)
bpy.context.scene.frame_set(1)
bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=N+1;bpy.context.scene.frame_set(1)
tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
assert tris<12000 and len(meshes)<=14 and len(mats)<=10
verts=[p for g in groups.values() for p in g['vertices']]
bounds={'min':[min(v[i] for v in verts) for i in range(3)],'max':[max(v[i] for v in verts) for i in range(3)]}
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'dock.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'dock.glb'),export_format='GLB',export_yup=True,export_animations=True,export_cameras=False,export_lights=False)
glb_bytes=(OUT/'dock.glb').read_bytes()
json_length=struct.unpack_from('<I',glb_bytes,12)[0]
gltf=json.loads(glb_bytes[20:20+json_length])
primitive_count=sum(len(m['primitives']) for m in gltf['meshes'])
assert primitive_count<=48 and len(gltf['materials'])<=10
for mesh_data in gltf['meshes']:
 for primitive in mesh_data['primitives']:
  accessor=gltf['accessors'][primitive['attributes']['POSITION']]
  assert all(math.isfinite(value) for key in ['min','max'] for value in accessor[key])
manifest={'schema':'holm-arrival-dock-candidate-v4','boat':{'raise':RAISE,'soleY':SOLE,'soleClearanceOverSea':round(low,4),'note':'closed sole at the v3 waterline; the boat rides 12 cm higher'},'deckVisualTopY':.04,'navigationY':0,'status':'Blender candidate; not visually accepted or published','root':'ArrivalDock','coordinates':'local game x,y-up,z; north=-z','deck':{'topY':.04,'thickness':.18,'width':3.4,'length':9.0,'bounds':{'x0':-1.7,'x1':1.7,'z0':-4.5,'z1':4.5},'surfaceDetailMaxY':0,'raycastMeshPrefix':'DockDeck'},'supportRectangle':{'x0':-1.5,'x1':1.5,'z0':-4.5,'z1':4.3,'y':0},'obstacles':obstacles,'obstacleClearanceVerified':'Every above-deck component AABB excludes open clear rectangle; below-deck components not obstacles. Runtime avatar radius must erode rectangle.','bounds':bounds,'triangles':tris,'meshes':len(meshes),'gltfPrimitives':primitive_count,'materials':len(mats),'animations':['Breeze (DockBoat idle bob: 1.5 cm heave, 4+/-2.2 deg list, 5 s loop)'],'references':['Bible_References/Complete/Fishing_Pier_Option1.jpg','Bible_References/INVENTORY.md'],'sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [OUT/'dock.blend',OUT/'dock.glb']},'remaining':['Main-session in-app Studio visual inspection and reference comparison','Placement, navigation, raycast and live performance gates','Safe Publish transaction']}
(OUT/'dock.manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print('[HOLM_DOCK] v4 finite geometry, clear rectangle and budgets PASS',tris,'triangles',len(meshes),'meshes',len(mats),'materials')
