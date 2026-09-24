"""Guide house v2 (owner reviews 5+6, 2026-09-24): the Sept 13 v1 shell kept where the game depends on it
(stone ground storey, doors, stair well, furnishings, hearth, porch, upper floor walk bands), with the massing
the owner asked for: a taller timber-framed upper storey jettied out over the east and north walls on a
bressumer, joist ends, brackets and posts; a half-hipped clay roof laid tile by tile on every face; a gabled
dormer on the east slope; ridge caps and finials. Original design; no reference geometry copied.
Coordinates x,z-plan,y-up mapped to Blender x,-z,y (as v1). Not accepted art until the owner reviews it.
"""
import bpy,json,math,random,bmesh,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'.studio-workspaces/holm-guide-house-overhaul-v2/candidates'
PROOF=ROOT/'scratchpad/holm_guide_house_overhaul_v2'
OUT.mkdir(parents=True,exist_ok=True);PROOF.mkdir(parents=True,exist_ok=True)
LAYOUT=json.loads((ROOT/'docs/rebuild/holm-overhaul/arrival-layout.json').read_text())
DOOR_WIDTH=LAYOUT['doors'][0]['clearWidth']
assert all(d['clearWidth']==DOOR_WIDTH for d in LAYOUT['doors'])
bpy.ops.wm.read_factory_settings(use_empty=True)
def material(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);return m
stone=material('Warm fieldstone',(.43,.46,.40));wood=material('Aged oak',(.30,.20,.12));roofmat=material('Muted clay',(.39,.22,.17));floor=material('Warm floorboards',(.43,.32,.20))
stone_light=material('Stone lit faces',(.52,.54,.46));stone_dark=material('Stone shaded faces',(.37,.40,.35));sillmat=material('Dressed sandstone',(.57,.53,.42))
plaster=material('Limewash plaster',(.80,.74,.60));plaster_shade=material('Limewash plaster shade',(.72,.66,.53))
timber=material('Dark frame oak',(.22,.15,.09))
tile_light=material('Clay tile warm face v2',(.45,.27,.19));tile_dark=material('Clay tile cool face v2',(.33,.19,.15))
root=bpy.data.objects.new('GuideHouse',None);bpy.context.collection.objects.link(root)
def fix(o):
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free();return o
def mesh(name,vertices,faces,mat):
 data=bpy.data.meshes.new(name);data.from_pydata([(x,-z,y) for x,y,z in vertices],[],faces);data.update()
 obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.parent=root;obj.data.materials.append(mat);return obj
def prism(name,x0,x1,y0,y1,z0,z1,mat):
 return mesh(name,[(x0,y0,z0),(x1,y0,z0),(x1,y1,z0),(x0,y1,z0),(x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],mat)
def beam(name,a,b,width,depth,mat):
 axis=(Vector(b)-Vector(a)).normalized();side=axis.cross(Vector((0,0,1)))
 if side.length<.01:side=axis.cross(Vector((1,0,0)))
 side.normalize();up=axis.cross(side).normalized()
 vertices=[tuple(Vector(p)+side*s*width/2+up*t*depth/2) for p in [a,b] for s,t in [(-1,-1),(1,-1),(1,1),(-1,1)]]
 return mesh(name,vertices,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat)
def join(parts,name):
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0]
 if len(parts)>1:bpy.ops.object.join()
 parts[0].name=name;return parts[0]
def wall(name,u0,u1,base,height,axis,constant,holes,mat,t=.35):
 # grid partition with real voids (as v1), over an arbitrary u range
 us=sorted(set([u0,u1]+[n for h in holes for n in h[:2]]));vs=sorted(set([base,base+height]+[n for h in holes for n in h[2:]]))
 parts=[]
 for a,b in zip(us,us[1:]):
  for c,d in zip(vs,vs[1:]):
   u=(a+b)/2;v=(c+d)/2
   if any(h[0]<u<h[1] and h[2]<v<h[3] for h in holes):continue
   parts.append(prism(name,a,b,c,d,constant-t/2,constant+t/2,mat) if axis=='x' else prism(name,constant-t/2,constant+t/2,c,d,a,b,mat))
 return join(parts,name)
def stone_facing(name,length,base,height,axis,constant,holes,outward):
 # v1's hand-cut relief skin, unchanged, for the ground storey
 rng=random.Random(name);vertices=[];faces=[];ids=[]
 def point(u,v,depth):return (u,v,constant+outward*depth) if axis=='x' else (constant+outward*depth,v,u)
 for row in range(math.ceil(height/.36)):
  low=base+row*.36;high=min(base+height,low+.36);u=-length/2
  while u<length/2-.01:
   right=min(length/2,u+rng.uniform(.58,1.05));segments=[(u,right,low,high)]
   for a,b,c,d in holes:
    nxt=[]
    for l,r,lo,hi in segments:
     if r<=a or l>=b or hi<=c or lo>=d:nxt.append((l,r,lo,hi));continue
     if l<a:nxt.append((l,a,lo,hi))
     if r>b:nxt.append((b,r,lo,hi))
     if lo<c:nxt.append((max(l,a),min(r,b),lo,c))
     if hi>d:nxt.append((max(l,a),min(r,b),d,hi))
    segments=nxt
   for l,r,lo,hi in segments:
    l+=.012;r-=.012;lo+=.012;hi-=.012
    if r-l<.04 or hi-lo<.04:continue
    bev=min(.045,(r-l)/5,(hi-lo)/5);k=len(vertices)
    outline=[(l+bev,lo),(r-bev,lo),(r,lo+bev),(r,hi-bev),(r-bev,hi),(l+bev,hi),(l,hi-bev),(l,lo+bev)]
    vertices.extend(point(a,b,.178) for a,b in outline)
    vertices.extend(point(a+(1 if a<(l+r)/2 else -1)*.015,b+(1 if b<(lo+hi)/2 else -1)*.015,.205+rng.uniform(0,.018)) for a,b in outline)
    faces.append(tuple(k+8+i for i in range(8)));ids.append(rng.choice([0,0,0,1,2]))
    for i in range(8):faces.append((k+i,k+(i+1)%8,k+8+(i+1)%8,k+8+i));ids.append(1 if i in [3,4] else 2)
   u=right
 o=mesh(name,vertices,faces,stone);o.data.materials.append(stone_light);o.data.materials.append(stone_dark)
 for p,index in zip(o.data.polygons,ids):p.material_index=index
 fix(o)

# ---------------- ground storey: v1 exactly ----------------
H0=2.8
windows0=[[-4.5,-3.1,1,2.15],[2.3,3.7,1,2.15]]
for side,z in [('South',5),('North',-5)]:
 holes=windows0+[[-DOOR_WIDTH/2,DOOR_WIDTH/2,0,2.3]]
 wall('GroundShell'+side,-6,6,0,H0,'x',z,holes,stone);stone_facing('GroundShell'+side+'Facing',12,0,H0,'x',z,holes,1 if z>0 else -1)
 for a,b,c,d in windows0:
  prism('GroundShell'+side+'Sill',a-.12,b+.12,c-.13,c,z-.30,z+.30,sillmat);prism('GroundShell'+side+'Lintel',a-.13,b+.13,d,d+.15,z-.23,z+.23,sillmat)
  for x in [a+.055,b-.055]:prism('GroundShell'+side+'WindowJamb',x-.055,x+.055,c,d,z-.19,z+.19,wood)
  prism('GroundShell'+side+'WindowHead',a,b,d-.10,d,z-.19,z+.19,wood);prism('GroundShell'+side+'WindowMullion',(a+b)/2-.045,(a+b)/2+.045,c,d,z-.08,z+.08,wood)
for side,x in [('East',6),('West',-6)]:
 holes=[[-3.7,-2.3,1,2.15],[1.7,3.1,1,2.15]]
 if side=='West':holes=holes[1:]
 wall('GroundShell'+side,-4.825,4.825,0,H0,'z',x,holes,stone);stone_facing('GroundShell'+side+'Facing',9.65,0,H0,'z',x,holes,1 if x>0 else -1)
prism('GroundFloor',-5.825,5.825,-.2,0,-4.825,4.825,floor)
STAIRS=LAYOUT['stairs'];SZ0=STAIRS['startZ'];SZ1=STAIRS['endZ']
for i,(x0,x1,z0,z1) in enumerate([(-5.825,3.5,-4.825,4.825),(5,5.825,-4.825,4.825),(3.5,5,-4.825,SZ1),(3.5,5,SZ0,4.825)]):prism('UpperFloor'+str(i),x0,x1,2.6,2.8,z0,z1,floor)
for i in range(12):
 z1=SZ0-i*.4;z0=z1-.4;y=(i+1)*2.8/12;prism('StairFlight'+str(i),3.5,5,y-.18,y,z0,z1,wood)
for x in [3.38,5.0]:
 mesh('StairStringer',[(x,0,SZ0),(x,2.62,SZ1),(x,2.8,SZ1),(x,.18,SZ0),(x+.12,0,SZ0),(x+.12,2.62,SZ1),(x+.12,2.8,SZ1),(x+.12,.18,SZ0)],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],wood)
for x in [3.38,5.12]:
 for z in [SZ1+i*(SZ0-SZ1)/4 for i in range(5)]:
  y=(SZ0-z)*2.8/4.8;prism('StairHandrailPost',x-.05,x+.05,y,y+.9,z-.05,z+.05,wood)
 mesh('StairHandrail',[(x-.055,.87,(SZ0+.1)),(x-.055,3.67,(SZ1+.1)),(x-.055,3.78,(SZ1+.1)),(x-.055,.98,(SZ0+.1)),(x+.055,.87,(SZ0+.1)),(x+.055,3.67,(SZ1+.1)),(x+.055,3.78,(SZ1+.1)),(x+.055,.98,(SZ0+.1))],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],wood)

# ---------------- upper storey v2: taller, timber-framed, jettied E and N ----------------
UH=3.0;TOP=H0+UH;JE=.45;JN=.45
XE=6+JE;ZN=-5-JN                     # jettied wall planes; the west and south walls stay flush
wins={'South':[[-4.5,-3.1],[2.3,3.7]],'North':[[-4.5,-3.1],[2.3,3.7]],'East':[[-3.7,-2.3],[1.7,3.1]],'West':[[1.7,3.1]]}
WY0,WY1=H0+1.0,H0+2.3
upper=[('South','x',5,-6.175,XE+.175,1),('North','x',ZN,-6.175,XE+.175,-1),('East','z',XE,ZN+.175,4.825,1),('West','z',-6,ZN+.175,4.825,-1)]
def frame_member(name,axis,constant,out,u0,u1,v0,v1):
 # a timber proud of the plaster face by .06
 f0,f1=constant+out*.175,constant+out*.235
 lo,hi=min(f0,f1),max(f0,f1)
 return prism(name,u0,u1,v0,v1,lo,hi,timber) if axis=='x' else prism(name,lo,hi,v0,v1,u0,u1,timber)
for side,axis,c,u0,u1,out in upper:
 holes=[[a,b,WY0,WY1] for a,b in wins[side]]
 wall('UpperShell'+side,u0,u1,H0,UH,axis,c,holes,plaster)
 fm=[]
 fm.append(frame_member('UpperShellTimber',axis,c,out,u0,u1,H0,H0+.2))            # sole plate
 fm.append(frame_member('UpperShellTimber',axis,c,out,u0,u1,TOP-.2,TOP))          # wall plate
 fm.append(frame_member('UpperShellTimber',axis,c,out,u0,u1,WY0-.12,WY0))         # sill rail
 fm.append(frame_member('UpperShellTimber',axis,c,out,u0,u1,WY1,WY1+.12))         # head rail
 # studs about a metre apart, never across a window; posts at both ends
 u=u0;studs=[u0+.05,u1-.05]
 while u<u1-.8:
  u+=1.0
  if u<u1-.4 and not any(a-.15<u<b+.15 for a,b in wins[side]):studs.append(u)
 for s in studs:fm.append(frame_member('UpperShellTimber',axis,c,out,s-.07,s+.07,H0+.2,TOP-.2))
 for a,b in wins[side]:
  for s in (a-.07,b+.07):fm.append(frame_member('UpperShellTimber',axis,c,out,s-.07,s+.07,H0+.2,TOP-.2))
 # curved-look braces in the end bays: two short straight members each
 f=c+out*.205
 for end,dirn in [(u0+.12,1),(u1-.12,-1)]:
  a=(end,H0+.2);m=(end+dirn*.5,H0+.55);b=(end+dirn*.9,WY0-.12)
  for p,q in [(a,m),(m,b)]:
   P=(p[0],p[1],f) if axis=='x' else (f,p[1],p[0]);Q=(q[0],q[1],f) if axis=='x' else (f,q[1],q[0])
   fm.append(beam('UpperShellTimber',P,Q,.12,.08,timber))
 # window frames and shutters: deep timber reveal, small mullion and a sill board
 for a,b in wins[side]:
  for s in (a+.05,b-.05):fm.append(prism('UpperShellWindowJamb',s-.05,s+.05,WY0,WY1,c-.19,c+.19,wood) if axis=='x' else prism('UpperShellWindowJamb',c-.19,c+.19,WY0,WY1,s-.05,s+.05,wood))
  mm=(a+b)/2
  fm.append(prism('UpperShellWindowMullion',mm-.04,mm+.04,WY0,WY1,c-.08,c+.08,wood) if axis=='x' else prism('UpperShellWindowMullion',c-.08,c+.08,WY0,WY1,mm-.04,mm+.04,wood))
  so=c+out*.26
  fm.append(prism('UpperShellWindowSill',a-.12,b+.12,WY0-.16,WY0-.06,min(c,so),max(c,so),sillmat) if axis=='x' else prism('UpperShellWindowSill',min(c,so),max(c,so),WY0-.16,WY0-.06,a-.12,b+.12,sillmat))
 join(fm,'UpperShellTimber'+side)
# the jettied floor reaches the new wall planes (visual; the walk bands above are unchanged)
prism('UpperFloorJettyEast',5.825,XE-.175,2.6,2.8,ZN+.175,4.825,floor)
prism('UpperFloorJettyNorth',-5.825,5.825,2.6,2.8,ZN+.175,-4.825,floor)
# jetty carpentry: bressumer beams, joist ends through the stone, brackets and posts on stone pads
jet=[]
jet.append(prism('GroundShellJettyBressumer',XE-.2,XE+.2,H0-.26,H0,ZN-.2,5.12,timber))
jet.append(prism('GroundShellJettyBressumer',-6.12,XE+.2,H0-.26,H0,ZN-.2,ZN+.2,timber))
z=-4.6
while z<4.8:
 jet.append(prism('GroundShellJoistEnd',6.17,XE+.2,H0-.36,H0-.22,z-.08,z+.08,timber));z+=.5
x=-5.6
while x<6.2:
 jet.append(prism('GroundShellJoistEnd',x-.08,x+.08,H0-.36,H0-.22,ZN-.2,-5.17,timber));x+=.5
for pz in [-5.45,-2.2,1.6,4.9]:
 jet.append(prism('GroundShellJettyPad',XE-.2,XE+.2,-.3,.12,pz-.2,pz+.2,sillmat))
 jet.append(prism('GroundShellJettyPost',XE-.1,XE+.1,.12,H0-.26,pz-.1,pz+.1,timber))
 for s in [-1,1]:
  if -5.4<pz+s*.6<5:jet.append(beam('GroundShellJettyBracket',(XE,H0-.9,pz),(XE,H0-.3,pz+s*.6),.1,.1,timber))
for px in [-5.7,-1.8,2.1]:
 jet.append(prism('GroundShellJettyPad',px-.2,px+.2,-.3,.12,ZN-.2,ZN+.2,sillmat))
 jet.append(prism('GroundShellJettyPost',px-.1,px+.1,.12,H0-.26,ZN-.1,ZN+.1,timber))
 for s in [-1,1]:jet.append(beam('GroundShellJettyBracket',(px,H0-.9,ZN),(px+s*.6,H0-.3,ZN),.1,.1,timber))
# diagonal dragon bracket at the jettied north-east corner
jet.append(beam('GroundShellJettyDragon',(6.0,H0-1.1,-5.0),(XE,H0-.3,ZN),.14,.14,timber))
join(jet,'GroundShellJetty')

# ---------------- half-hipped roof ----------------
OV=.4
XA,XB=-6.175-OV,XE+.175+OV;XR=(XA+XB)/2;W=(XB-XA)/2
ZS,ZNR=5+.175+OV,ZN-.175-OV
EAVE=TOP-OV*.46;RIDGE=TOP+3.1;HIP=TOP+1.95;D=1.3
def x_at(y,side):return XR+side*W*(RIDGE-y)/(RIDGE-EAVE)      # side slope point at height y
def slope_y(x):return RIDGE-abs(x-XR)*(RIDGE-EAVE)/W
roof=[]
for side in [-1,1]:
 xe=XB if side>0 else XA;xh=x_at(HIP,side)
 roof.append(mesh('RoofDeck',[(xe,EAVE,ZS),(xe,EAVE,ZNR),(xh,HIP,ZNR),(XR,RIDGE,ZNR+D),(XR,RIDGE,ZS-D),(xh,HIP,ZS)],[(0,1,2,3,4,5)],roofmat))
for zend,zin in [(ZS,ZS-D),(ZNR,ZNR+D)]:
 roof.append(mesh('RoofDeck',[(x_at(HIP,-1),HIP,zend),(x_at(HIP,1),HIP,zend),(XR,RIDGE,zin)],[(0,1,2)],roofmat))
for o in roof:
 s=o.modifiers.new('deck','SOLIDIFY');s.thickness=.14
# gable walls (plaster, timber king post and collar) under each half-hip, on the wall planes
for name,zc,out in [('GableSouth',5,1),('GableNorth',ZN,-1)]:
 frac=(ZS-zc if out>0 else zc-ZNR)/D;yg=HIP+(RIDGE-HIP)*frac-.08
 xl,xr=x_at(yg,-1)+.05,x_at(yg,1)-.05;xl0,xr0=x_at(TOP,-1),x_at(TOP,1)
 prof=[(max(-6.175,xl0),TOP),(min(XE+.175,xr0),TOP),(xr,yg),(xl,yg)]
 verts=[(x,y,zc+dz) for dz in [-.175,.175] for x,y in prof];n=len(prof)
 mesh(name,verts,[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],plaster)
 # orderly framing, never random beams (owner, July): a collar tie and upright studs on the storey's own
 # metre rhythm, each stopped under the roof line, plus a rail following each verge
 f=zc+out*.205
 beam(name+'Timber',(xl+.25,TOP+1.1,f),(xr-.25,TOP+1.1,f),.14,.08,timber)
 u=-6.175+.05
 while u<XE+.175:
  top=min(yg,slope_y(u))-.12
  if top>TOP+.35 and abs(u-XR)>.3:beam(name+'Timber',(u,TOP,f),(u,top,f),.13,.08,timber)
  u+=1.0
 beam(name+'Timber',(XR,TOP,f),(XR,yg-.05,f),.14,.08,timber)
 # a small attic light in the gable
 prism(name+'Vent',XR-.35,XR+.35,TOP+1.35,TOP+1.85,zc-.2,zc+.2,wood)
 prism(name+'VentPane',XR-.26,XR+.26,TOP+1.42,TOP+1.78,zc-.22,zc+.22,timber)

# ---------------- east dormer ----------------
DZ=1.15;DF=XE+.175;DE=TOP+1.25;DR=DE+.72
xe_d=x_at(DE,1);xm_d=x_at(DR,1)
dormer=[]
dh=[[-.5,.5,TOP+.15,TOP+1.05]]
dormer.append(wall('RoofDormerFront',-DZ,DZ,TOP,DE-TOP,'z',DF-.175,dh,plaster))
dormer.append(mesh('RoofDormerGable',[(DF-.35,DE,-DZ),(DF-.35,DE,DZ),(DF-.35,DR,0),(DF,DE,-DZ),(DF,DE,DZ),(DF,DR,0)],[(0,1,2),(5,4,3),(0,3,4,1),(1,4,5,2),(2,5,3,0)],plaster))
for s in [-1,1]:
 dormer.append(mesh('RoofDormerCheek',[(DF,TOP,s*DZ),(DF,DE,s*DZ),(xe_d,DE,s*DZ)],[(0,1,2)],plaster_shade))
 dormer.append(mesh('RoofDormerDeck',[(DF+.3,DE-.14,s*(DZ+.25)),(DF+.3,DR,0),(xm_d,DR,0),(xe_d-.1,DE-.14,s*(DZ+.25))],[(0,1,2,3)],roofmat))
 dormer.append(beam('RoofDormerBarge',(DF+.32,DR+.05,0),(DF+.32,DE-.12,s*(DZ+.25)),.14,.16,wood))
for s in (-.5,.5):dormer.append(prism('RoofDormerJamb',DF-.1,DF+.05,TOP+.15,TOP+1.05,s-.05,s+.05,wood))
dormer.append(prism('RoofDormerMullion',DF-.08,DF+.02,TOP+.15,TOP+1.05,-.04,.04,wood))
dormer.append(prism('RoofDormerSill',DF-.05,DF+.18,TOP+.05,TOP+.15,-.62,.62,sillmat))
dormer.append(beam('RoofDormerRidge',(DF+.3,DR+.06,0),(xm_d,DR+.06,0),.16,.14,roofmat))
for o in dormer:
 if o.name.startswith('RoofDormerDeck'):s=o.modifiers.new('deck','SOLIDIFY');s.thickness=.12

# ---------------- clay tiles laid on every roof face ----------------
rng=random.Random(924);tv=[];tf=[];tid=[]
def lay(P,s_range,rows,normal,skip=None):
 # P(t,s): point on the face; t 0..1 eave->top; s along the course. Each tile is a thin lipped slab.
 for r in range(rows):
  t0=r/rows;t1=min(1,(r+1.1)/rows)
  s0,s1=s_range(t0);s=s0+(rng.uniform(0,.3) if r%2 else 0)
  while s<s1-.05:
   e=min(s1,s+rng.uniform(.55,.7));sa,sb=s_range(t1)
   lo_s,hi_s=max(s,sa),min(e,sb)
   if hi_s-lo_s>.06 and not(skip and skip(P((t0+t1)/2,(s+e)/2))):
    k=len(tv)
    for lift in [.03,.075]:
     n=Vector(normal)*lift
     for (tt,ss) in [(t0,s+.012),(t0,e-.012),(t1,hi_s-.012),(t1,lo_s+.012)]:
      q=Vector(P(tt,ss))+n+(Vector(normal)*.018 if tt==t1 else Vector((0,0,0)));tv.append(tuple(q))
    tf.extend([(k,k+3,k+2,k+1),(k+4,k+5,k+6,k+7),(k,k+1,k+5,k+4),(k+1,k+2,k+6,k+5),(k+2,k+3,k+7,k+6),(k+3,k,k+4,k+7)])
    tid.extend([rng.choice([0,0,0,1,2])]*6)
   s=e
def nrm(a,b,c):
 v=(Vector(b)-Vector(a)).cross(Vector(c)-Vector(a)).normalized()
 return v if v.y>0 else -v
for side in [-1,1]:
 xe=XB if side>0 else XA
 def P(t,s,xe=xe,side=side):y=EAVE+(RIDGE-EAVE)*t;return (xe+(XR-xe)*t,y,s)
 def S(t):
  y=EAVE+(RIDGE-EAVE)*t
  if y<=HIP:return (ZNR,ZS)
  f=(y-HIP)/(RIDGE-HIP);return (ZNR+D*f,ZS-D*f)
 skip=(lambda p:abs(p[2])<DZ+.3 and p[1]<DR+.1) if side>0 else None
 lay(P,S,11,nrm((xe,EAVE,0),(XR,RIDGE,0),(xe,EAVE,1)),skip)
for zend,zin in [(ZS,ZS-D),(ZNR,ZNR+D)]:
 def P(t,s,zend=zend,zin=zin):y=HIP+(RIDGE-HIP)*t;return (s,y,zend+(zin-zend)*t)
 def S(t):xl,xr=x_at(HIP,-1),x_at(HIP,1);return (xl+(XR-xl)*t,xr+(XR-xr)*t)
 lay(P,S,4,nrm((0,HIP,zend),(1,HIP,zend),(XR,RIDGE,zin)))
for s in [-1,1]:
 def P(t,u,s=s):z=s*(DZ+.25)*(1-t);y=DE-.14+(DR-DE+.14)*t;return (u,y,z)
 def S(t):return (xm_d+(xe_d-xm_d)*(1-t)*.9,DF+.3)
 lay(P,S,3,nrm((DF,DE,s*(DZ+.25)),(DF,DR,0),(0,DE,s*(DZ+.25))))
o=mesh('RoofTiles',tv,tf,roofmat);o.data.materials.append(tile_light);o.data.materials.append(tile_dark)
for p,i in zip(o.data.polygons,tid):p.material_index=i
# ridge line, hip rafters, fascia, caps and finials
beam('RoofRidge',(XR,RIDGE+.1,ZNR+D-.1),(XR,RIDGE+.1,ZS-D+.1),.24,.2,roofmat)
zz=ZNR+D
while zz<ZS-D:
 beam('RoofRidgeCap',(XR,RIDGE+.14,zz),(XR,RIDGE+.14,zz+.34),.36,.14,tile_dark);zz+=.42
for zend,zin in [(ZS,ZS-D),(ZNR,ZNR+D)]:
 for side in [-1,1]:beam('RoofHipRoll',(x_at(HIP,side),HIP+.1,zend),(XR,RIDGE+.1,zin),.2,.16,roofmat)
 beam('RoofHipEaves',(x_at(HIP,-1),HIP-.04,zend),(x_at(HIP,1),HIP-.04,zend),.16,.18,wood)
 mesh('RoofFinial',[(XR-.09,RIDGE+.2,zin-.09),(XR+.09,RIDGE+.2,zin-.09),(XR+.09,RIDGE+.2,zin+.09),(XR-.09,RIDGE+.2,zin+.09),(XR,RIDGE+.75,zin)],[(0,1,2,3),(0,1,4),(1,2,4),(2,3,4),(3,0,4)],wood)
 for side in [-1,1]:
  xe=XB if side>0 else XA;beam('RoofVergeBoard',(xe,EAVE-.02,zend),(x_at(HIP,side),HIP-.02,zend),.16,.2,wood)
for xe in [XA,XB]:beam('RoofEaveFascia',(xe,EAVE-.05,ZNR),(xe,EAVE-.05,ZS),.16,.22,wood)

sys.path.insert(0,str(Path(__file__).resolve().parent))
from holm_guide_house_furnishings import build as furnish
furnish(globals())
from holm_guide_house_doors import build as add_doors
add_doors(globals())
from holm_guide_house_hearth import build as add_hearth
add_hearth(globals())
from holm_guide_house_exterior import build as add_exterior
add_exterior(globals())
# v1's tile field was fitted to the v1 gable; v2 lays its own on every face above
old=bpy.data.objects.get('RoofClayTiles')
if old:bpy.data.objects.remove(old,do_unlink=True)
for o in [o for o in bpy.context.scene.objects if o.type=='MESH']:fix(o)
for prefix in ['GroundShell','UpperShell','UpperFloor','Roof','Gable','Stair','GroundFurnishing','UpperFurnishing','GroundHearth','UpperHearth']:
 parts=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith(prefix)]
 if not parts:continue
 for o in parts:
  bpy.context.view_layer.objects.active=o
  for modifier in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=modifier.name)
 join(parts,'StairFlight' if prefix=='Stair' else prefix)
bpy.context.view_layer.update()
model=OUT/'holm_guide_house_overhaul_v2'
bpy.ops.wm.save_as_mainfile(filepath=str(model.with_suffix('.blend')))
bpy.ops.export_scene.gltf(filepath=str(model.with_suffix('.glb')),export_format='GLB',export_yup=True)
corners=[o.matrix_world@Vector(c) for o in bpy.context.scene.objects if o.type=='MESH' for c in o.bound_box]
dims=[max(v[i] for v in corners)-min(v[i] for v in corners) for i in range(3)]
tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')
report={'status':'v2-candidate-unapproved','owner':'reviews 5+6 2026-09-24: jettied taller upper storey on posts, many-angled hand-made roof',
 'keptFromV1':['ground storey shell and facing','doors and opening actions','stair well and flight','furnishings','hearth and chimney','porch','upper floor walk bands'],
 'humanScaleContract':{'doorWidth':DOOR_WIDTH,'doorHeight':2.3,'upperFloorY':2.8,'upperStoreyHeight':UH},
 'dimensionsTiles':{'width':dims[0],'depth':dims[1],'height':dims[2]},'triangles':tris,
 'meshes':sorted(o.name for o in bpy.context.scene.objects if o.type=='MESH')}
(PROOF/'asset_report.json').write_text(json.dumps(report,indent=2))
print('[GUIDE_HOUSE_V2] saved editable source and GLB; triangles',tris,'dims',[round(d,2) for d in dims])
