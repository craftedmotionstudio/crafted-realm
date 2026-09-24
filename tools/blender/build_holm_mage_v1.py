"""Mage House & tower v1 (finish goal M4.4, brief docs/rebuild/HOLM_M44_BUILDING_BRIEF.md), prefix Mage_.
Plan place `mage` (x=114, z=58): a three-level octagonal fieldstone observatory (rune workroom, library, open
timber observatory gallery under a thatched cone) joined through a stone link to a low timber-framed study wing
under a crooked clay hip roof with a cross gable over the west door; a thatched pent skirts the east faces; a
split-rail practice yard with gate, coop, straw target and dummy lies south of the wing. Helpers follow
build_holm_guide_house_overhaul_v2.py (mesh/prism/beam, walls with real voids, relief stone facing, laid tiles).
Local space: origin = plan centre, y=0 = ground floor (0.15 above the measured 6.00 pad). Game (x,y,z) ->
Blender (x,-z,y). Deterministic (seeded). Original design.
"""
import bpy,json,math,random,bmesh
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'.studio-workspaces/holm-mage-v1/candidates';PROOF=ROOT/'scratchpad/holm_mage_v1'
OUT.mkdir(parents=True,exist_ok=True);PROOF.mkdir(parents=True,exist_ok=True)
PX,PZ=114,58;LIFT=.15
TER=json.loads((ROOT/'.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json').read_text())
TWID=TER['width']
def raw_h(x,z):
 wx,wz=x+PX,z+PZ;ix,iz=int(math.floor(wx)),int(math.floor(wz));fx,fz=wx-ix,wz-iz
 h=lambda a,b:TER['heights'][b*(TWID+1)+a]
 return h(ix,iz)*(1-fx)*(1-fz)+h(ix+1,iz)*fx*(1-fz)+h(ix,iz+1)*(1-fx)*fz+h(ix+1,iz+1)*fx*fz
PAD=min(raw_h(x,z) for x in range(-6,7) for z in range(-5,5));PY=PAD+LIFT
def ground(x,z):return raw_h(x,z)-PY
bpy.ops.wm.read_factory_settings(use_empty=True)
M={}
def material(key,name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);M[key]=m
for k,n,c in [('stone','Mage fieldstone',(.43,.46,.40)),('stone_l','Mage stone lit',(.52,.54,.46)),('stone_d','Mage stone shade',(.37,.40,.35)),
 ('sill','Mage dressed sandstone',(.57,.53,.42)),('plaster','Mage limewash',(.80,.74,.60)),('timber','Mage dark frame oak',(.22,.15,.09)),
 ('wood','Mage aged oak',(.30,.20,.12)),('floor','Mage floorboards',(.43,.32,.20)),('thatch','Mage ochre thatch',(.55,.43,.20)),
 ('thatch_l','Mage thatch sunlit',(.63,.51,.26)),('thatch_d','Mage thatch shade',(.44,.33,.15)),('clay','Mage clay tile',(.39,.22,.17)),
 ('clay_l','Mage clay warm',(.45,.27,.19)),('clay_d','Mage clay cool',(.33,.19,.15)),('iron','Mage wrought iron',(.17,.17,.18)),
 ('brass','Mage brass',(.62,.47,.20)),('rune','Mage rune slate',(.33,.38,.50)),('chart','Mage star chart',(.12,.15,.30)),
 ('parch','Mage parchment',(.82,.75,.57)),('leather','Mage book leather',(.45,.16,.13))]:material(k,n,c)
root=bpy.data.objects.new('Mage_Root',None);bpy.context.collection.objects.link(root)
BOXF=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)]
def fix(o):
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free();return o
def mesh(name,vertices,faces,mat):
 data=bpy.data.meshes.new(name);data.from_pydata([(x,-z,y) for x,y,z in vertices],[],faces);data.update()
 obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.parent=root;obj.data.materials.append(mat);return obj
def prism(name,x0,x1,y0,y1,z0,z1,mat):
 return mesh(name,[(x0,y0,z0),(x1,y0,z0),(x1,y1,z0),(x0,y1,z0),(x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)],BOXF,mat)
def beam(name,a,b,width,depth,mat):
 axis=(Vector(b)-Vector(a)).normalized();side=axis.cross(Vector((0,1,0)))
 if side.length<.01:side=axis.cross(Vector((1,0,0)))
 side.normalize();up=axis.cross(side).normalized()
 vertices=[tuple(Vector(p)+side*s*width/2+up*t*depth/2) for p in [a,b] for s,t in [(-1,-1),(1,-1),(1,1),(-1,1)]]
 return mesh(name,vertices,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat)
def cyl(name,a,b,r0,r1,mat,n=8):
 a=Vector(a);b=Vector(b);ax=(b-a).normalized();side=ax.cross(Vector((0,1,0)))
 if side.length<.1:side=ax.cross(Vector((1,0,0)))
 side.normalize();up=ax.cross(side).normalized();V=[];F=[]
 for c,r in ((a,r0),(b,r1)):
  for i in range(n):th=(i+.5)*math.tau/n;V.append(tuple(c+(side*math.cos(th)+up*math.sin(th))*r))
 for i in range(n):F.append((i,(i+1)%n,n+(i+1)%n,n+i))
 F.append(tuple(range(n-1,-1,-1)));F.append(tuple(range(n,2*n)))
 return mesh(name,V,F,mat)
def ring(name,c,nrm,r,wid,thick,mat,n=14):
 c=Vector(c);nrm=Vector(nrm).normalized();a=nrm.cross(Vector((0,1,0)))
 if a.length<.1:a=nrm.cross(Vector((1,0,0)))
 a.normalize();b=nrm.cross(a).normalized();V=[];F=[]
 for i in range(n):
  d=a*math.cos(i*math.tau/n)+b*math.sin(i*math.tau/n)
  for rr,tt in ((r-wid/2,-thick/2),(r+wid/2,-thick/2),(r+wid/2,thick/2),(r-wid/2,thick/2)):V.append(tuple(c+d*rr+nrm*tt))
 for i in range(n):
  j=(i+1)%n
  for k in range(4):F.append((4*i+k,4*i+(k+1)%4,4*j+(k+1)%4,4*j+k))
 return mesh(name,V,F,mat)
def join(parts,name):
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0]
 if len(parts)>1:bpy.ops.object.join()
 parts[0].name=name;return parts[0]
def upface(pts):
 a,b,c=Vector(pts[0]),Vector(pts[1]),Vector(pts[2]);n=(b-a).cross(c-a)
 return list(pts) if n.y>=0 else list(reversed(pts))
def deck(name,polys,thick,mat):
 V=[];F=[]
 for p in polys:k=len(V);p=upface(p);V+=p;F.append(tuple(range(k,k+len(p))))
 o=mesh(name,V,F,mat);s=o.modifiers.new('deck','SOLIDIFY');s.thickness=thick;s.offset=-1;return o

class Seg:
 # a wall line in plan: p0->p1 (x,z), n = outward unit normal; p(u,v,w) = point u along, v up, w out
 def __init__(s,p0,p1,n):
  s.p0=Vector(p0);s.p1=Vector(p1);d=s.p1-s.p0;s.L=d.length;s.U=d/s.L;s.n=Vector(n).normalized()
 def p(s,u,v,w):q=s.p0+s.U*u+s.n*w;return (q.x,v,q.y)
def sbox(name,sg,u0,u1,v0,v1,w0,w1,mat):
 return mesh(name,[sg.p(u,v,w) for w in (w0,w1) for u,v in ((u0,v0),(u1,v0),(u1,v1),(u0,v1))],BOXF,mat)
def wall(name,sg,ua,ub,v0,v1,holes,t,mat,m0=0,m1=0):
 us=sorted(set([ua,ub]+[h[i] for h in holes for i in (0,1)]));vs=sorted(set([v0,v1]+[h[i] for h in holes for i in (2,3)]))
 us=[u for u in us if ua<=u<=ub];vs=[v for v in vs if v0<=v<=v1];parts=[]
 for a,b in zip(us,us[1:]):
  for c,d in zip(vs,vs[1:]):
   if any(h[0]<(a+b)/2<h[1] and h[2]<(c+d)/2<h[3] for h in holes):continue
   P=[]
   for w in (-t/2,t/2):
    aa=a-m0*w if a==ua else a;bb=b+m1*w if b==ub else b
    P+=[sg.p(aa,c,w),sg.p(bb,c,w),sg.p(bb,d,w),sg.p(aa,d,w)]
   parts.append(mesh(name,P,BOXF,mat))
 return join(parts,name)
def facing(name,sg,ua,ub,v0,v1,holes,t,rowh=.36,wr=(.58,1.05)):
 # hand-cut relief stones in courses (v2 stone_facing, generalised to any wall line)
 rng=random.Random(name+'%.3f%.3f'%(sg.p0.x,sg.p0.y));V=[];F=[];ids=[];d0=t/2+.003
 rows=max(1,round((v1-v0)/rowh));rh=(v1-v0)/rows
 for row in range(rows):
  low=v0+row*rh;high=low+rh;u=ua;first=True
  while u<ub-.01:
   w=rng.uniform(*wr)*(.55 if first and row%2 else 1);first=False
   right=min(ub,u+w)
   if ub-right<.22:right=ub
   segs=[(u,right,low,high)]
   for a,b,c,d in holes:
    nxt=[]
    for l,r,lo,hi in segs:
     if r<=a or l>=b or hi<=c or lo>=d:nxt.append((l,r,lo,hi));continue
     if l<a:nxt.append((l,a,lo,hi))
     if r>b:nxt.append((b,r,lo,hi))
     if lo<c:nxt.append((max(l,a),min(r,b),lo,c))
     if hi>d:nxt.append((max(l,a),min(r,b),d,hi))
    segs=nxt
   for l,r,lo,hi in segs:
    l+=.012;r-=.012;lo+=.012;hi-=.012
    if r-l<.04 or hi-lo<.04:continue
    # pillow-cut stone: a bevelled front face on four chamfers (10 triangles, budget form of v2's relief stone)
    bev=min(.05,(r-l)/4,(hi-lo)/4);k=len(V);front=d0+.03+rng.uniform(0,.02)
    outline=[(l,lo),(r,lo),(r,hi),(l,hi)]
    V.extend(sg.p(a,b,d0) for a,b in outline)
    V.extend(sg.p(a+(1 if a<(l+r)/2 else -1)*bev,b+(1 if b<(lo+hi)/2 else -1)*bev,front) for a,b in outline)
    F.append(tuple(k+4+i for i in range(4)));ids.append(rng.choice([0,0,0,1,2]))
    for i in range(4):F.append((k+i,k+(i+1)%4,k+4+(i+1)%4,k+4+i));ids.append(1 if i in [1,2] else 2)
   u=right
 o=mesh(name,V,F,M['stone']);o.data.materials.append(M['stone_l']);o.data.materials.append(M['stone_d'])
 for p,i in zip(o.data.polygons,ids):p.material_index=i
 return o
class Layer:
 def __init__(s,name,mats):s.name=name;s.mats=mats;s.V=[];s.F=[];s.I=[]
 def build(s):
  o=mesh(s.name,s.V,s.F,s.mats[0])
  for m in s.mats[1:]:o.data.materials.append(m)
  for p,i in zip(o.data.polygons,s.I):p.material_index=i
  return o
def lay(L,A,B,C,D,rows,size,lift,thick,tilt,rng,skip=None,drop=0,bands=False):
 # courses laid eave (A->B) to top (D->C); each piece a thin lipped slab, odd courses staggered
 A,B,C,D=map(Vector,(A,B,C,D));n=(B-A).cross((D if (D-A).length>1e-6 else C)-A).normalized()
 if n.y<0:n=-n
 def P(t,s):return A.lerp(D,t).lerp(B.lerp(C,t),s)
 for r in range(rows):
  t0=r/rows;t1=min(1,(r+1.3)/rows);length=(P(t0,1)-P(t0,0)).length
  if length<.08:continue
  k=max(1,round(length/size))
  inner=[(i+(.5 if r%2 else 0))/k+rng.uniform(-.12,.12)/k for i in range(1,k+(1 if r%2 else 0))]
  edges=[0]+[e for e in inner if .02<e<.98]+[1];band=rng.choice([0,0,1,2])
  for s0,s1 in zip(edges,edges[1:]):
   g=.012/length;a0,a1=s0+g,s1-g
   if skip and skip(P((t0+t1)/2,(a0+a1)/2)):continue
   q=len(L.V)
   for lf in (lift,lift+thick):
    tb=t0-rng.uniform(0,drop)/rows if drop else t0
    for tt,ss in ((tb,a0),(tb,a1),(t1,a1),(t1,a0)):L.V.append(tuple(P(tt,ss)+n*(lf+(tilt if tt==t1 else 0))))
   L.F.extend([(q,q+3,q+2,q+1),(q+4,q+5,q+6,q+7),(q,q+1,q+5,q+4),(q+1,q+2,q+6,q+5),(q+2,q+3,q+7,q+6),(q+3,q,q+4,q+7)])
   L.I.extend([(band if rng.random()<.8 else rng.choice([0,1,2])) if bands else rng.choice([0,0,0,1,2])]*6)
def poly_slab(name,outline,ytop,thick,holes,mat):
 bm=bmesh.new();f=bm.faces.new([bm.verts.new((x,-z,ytop)) for x,z in outline]);bm.normal_update()
 if f.normal.z<0:bmesh.ops.reverse_faces(bm,faces=[f])
 for x0,x1,z0,z1 in holes:
  for co,no in [((x0,0,0),(1,0,0)),((x1,0,0),(1,0,0)),((0,-z0,0),(0,1,0)),((0,-z1,0),(0,1,0))]:
   bmesh.ops.bisect_plane(bm,geom=bm.verts[:]+bm.edges[:]+bm.faces[:],plane_co=co,plane_no=no)
 dead=[f for f in bm.faces if any(x0<f.calc_center_median().x<x1 and z0<-f.calc_center_median().y<z1 for x0,x1,z0,z1 in holes)]
 bmesh.ops.delete(bm,geom=dead,context='FACES')
 me=bpy.data.meshes.new(name);bm.to_mesh(me);bm.free()
 o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.parent=root;me.materials.append(mat)
 s=o.modifiers.new('slab','SOLIDIFY');s.thickness=thick;s.offset=-1;return o

# ---------------- plan geometry ----------------
C=Vector((2,-1));RV=4.0;MT=math.tan(math.radians(22.5))
def odir(deg):return Vector((math.cos(math.radians(deg)),math.sin(math.radians(deg))))
def octo(apo):r=apo/math.cos(math.radians(22.5));return [tuple(C+odir(45*k)*r) for k in range(8)]
OV=octo(RV*math.cos(math.radians(22.5)))
FACE=[Seg(OV[k],OV[(k+1)%8],odir(22.5+45*k)) for k in range(8)];FL=FACE[0].L
APO=RV*math.cos(math.radians(22.5))                       # 3.696, wall centre line
def inside_oct(x,z,apo):return all((Vector((x,z))-C).dot(odir(22.5+45*k))<apo for k in range(8))
def oct_span(z,apo):
 xs=[i/100 for i in range(-800,1200) if inside_oct(i/100,z,apo)];return (min(xs),max(xs)) if xs else None
def clip_tower(o,apo=APO+.2):
 # cut a wing/link mesh at the tower's outer faces and drop what lies inside the tower
 bm=bmesh.new();bm.from_mesh(o.data)
 for k in range(8):
  n=odir(22.5+45*k);co=C+n*apo
  bmesh.ops.bisect_plane(bm,geom=bm.verts[:]+bm.edges[:]+bm.faces[:],plane_co=(co.x,-co.y,0),plane_no=(n.x,-n.y,0))
 dead=[f for f in bm.faces if inside_oct(f.calc_center_median().x,-f.calc_center_median().y,apo-1e-3)]
 bmesh.ops.delete(bm,geom=dead,context='FACES');bm.to_mesh(o.data);bm.free();o.data.update();return o
TW=.4;G1=2.8;L2Y=3.0;G2=5.8;L3Y=6.0;H13=3/13;RUN=.4

# ---------------- tower shell: fieldstone, three levels ----------------
g_holes={0:[(1.03,2.03,1.0,2.2)],1:[(1.03,2.03,1.0,2.2)],2:[(.75,1.65,1.0,2.2)],3:[(.6,2.6,0,2.3)],5:[(1.33,1.73,1.2,2.2)],6:[(1.03,2.03,1.0,2.2)],4:[],7:[]}
u_holes={2:[(.8,1.8,3.95,5.1)],5:[(1.03,2.03,3.95,5.1)],6:[(1.03,2.03,3.95,5.1)],7:[(1.03,2.03,3.95,5.1)],0:[],1:[],3:[],4:[]}
fe=MT*(TW/2+.045)
for k,sg in enumerate(FACE):
 wall('Mage_ShellTower',sg,0,FL,0,G1,g_holes[k],TW,M['stone'],MT,MT)
 wall('Mage_UpperShellTower',sg,0,FL,G1,G2,u_holes[k],TW,M['stone'],MT,MT)
 facing('Mage_ShellTowerFacing',sg,-fe,FL+fe,0,G1,g_holes[k],TW,.35)
 facing('Mage_UpperShellTowerFacing',sg,-fe,FL+fe,G1,G2,u_holes[k],TW,.375,(.7,1.2))
 if k not in (3,4):
  sbox('Mage_ShellPlinth',sg,-MT*.32,FL+MT*.32,-.35,.05,.18,.32,M['stone_d'])
  sbox('Mage_ShellString',sg,-MT*.34,FL+MT*.34,G1-.1,G1+.08,.18,.34,M['sill'])
 sbox('Mage_UpperShellCorbel',sg,-MT*.36,FL+MT*.36,G2-.28,G2-.02,.15,.34,M['sill'])
 # window dressing: dressed sills and lintels, oak frames and mullions, shutters on the ground floor
 for holes,up in ((g_holes[k],False),(u_holes[k],True)):
  pre='Mage_UpperShell' if up else 'Mage_Shell'
  for a,b,c,d in holes:
   if d<=2.3 and c==0:continue
   sbox(pre+'Sill',sg,a-.12,b+.12,c-.12,c,-.12,TW/2+.12,M['sill']);sbox(pre+'Lintel',sg,a-.16,b+.16,d,d+.2,-.05,TW/2+.07,M['sill'])
   for s in (a,b-.07):sbox(pre+'Frame',sg,s,s+.07,c,d,-.07,.07,M['wood'])
   sbox(pre+'Frame',sg,a,b,d-.08,d,-.07,.07,M['wood'])
   if b-a>.6:sbox(pre+'Frame',sg,(a+b)/2-.035,(a+b)/2+.035,c,d,-.04,.04,M['wood']);sbox(pre+'Frame',sg,a,b,(c+d)/2-.03,(c+d)/2+.03,-.04,.04,M['wood'])
   if not up and b-a>.6:
    hw=(b-a)/2
    for s0,s1 in ((a-hw-.05,a-.05),(b+.05,b+hw+.05)):
     sbox(pre+'Shutter',sg,s0,s1,c+.02,d-.02,TW/2+.25,TW/2+.29,M['wood'])
     for vv in (c+.2,d-.25):sbox(pre+'Shutter',sg,s0+.03,s1-.03,vv,vv+.08,TW/2+.29,TW/2+.32,M['timber'])
# the doorway from the study wing: dressed jambs and a heavy lintel on the wing side
sg=FACE[3]
for s in (.45,2.6):sbox('Mage_ShellDoorJamb',sg,s,s+.15,0,2.3,-.24,.26,M['sill'])
sbox('Mage_ShellDoorLintel',sg,.4,2.8,2.3,2.62,-.24,.28,M['sill'])

# ---------------- floors ----------------
poly_slab('Mage_FloorTower',octo(APO+.22),0,.25,[],M['sill'])
wf=poly_slab('Mage_FloorWing',[(-6.175,-2.175),(-0.825,-2.175),(-0.825,4.175),(-6.175,4.175)],0,.25,[],M['floor']);clip_tower(wf)
prism('Mage_FloorThresholdWest',-6.6,-6.1,-.2,0,-.5,1.5,M['sill']);prism('Mage_FloorThresholdSouth',-4.3,-2.7,-.2,0,4.1,4.55,M['sill'])
HOLE1=(.2,4.625,-3.1,-1.9);HOLE2=(-.625,3.8,-1.1,.1)
poly_slab('Mage_UpperFloorLibrary',octo(3.6),L2Y,.2,[HOLE1],M['floor'])
poly_slab('Mage_UpperFloorObservatory',octo(APO+.26),L3Y,.2,[HOLE2],M['floor'])
# rune circle inlaid in the workroom flags (walkable, 1 cm proud)
cx,cz=2.0,-.5
for i in range(16):
 a0,a1=i*math.tau/16,(i+.82)*math.tau/16
 pts=[(cx+r*math.cos(a),.012,cz+r*math.sin(a)) for r,a in ((.92,a0),(1.08,a0),(1.08,a1),(.92,a1))]
 mesh('Mage_FloorRuneCircle',pts+[(x,0,z) for x,_,z in pts],BOXF,M['rune'])
for i in range(8):
 a=i*math.tau/8+.2;x,z=cx+.72*math.cos(a),cz+.72*math.sin(a);prism('Mage_FloorRuneCircle',x-.07,x+.07,0,.012,z-.07,z+.07,M['rune'])
prism('Mage_FloorRug',-5.0,-2.3,0,.012,-.25,1.25,M['leather']);prism('Mage_FloorRug',-4.85,-2.45,0,.014,-.1,1.1,M['clay_d'])
# joists under both upper floors (never over a stair line)
for yb,zs,nm in ((G1-.2,(-1.5,.9,2.3),'Mage_UpperJoist'),(G2-.2,(-2.3,-1.6,1.0,2.2),'Mage_UpperJoist')):
 for z in zs:
  sp=oct_span(z,3.5);prism(nm,sp[0]-.1,sp[1]+.1,yb,yb+.2,z-.1,z+.1,M['timber'])

# ---------------- stairs: two straight flights, 13 risers of 0.231, run 0.40 ----------------
def flight(name,railname,x0,dx,zc,yb,exit_side):
 parts=[]
 for i in range(1,13):
  xa=x0+dx*RUN*(i-1);xb=x0+dx*RUN*i;y=yb+H13*i
  parts.append(prism(name,min(xa,xb),max(xa,xb),y-.28,y,zc-.6,zc+.6,M['wood']))
  parts.append(prism(name,min(xa,xa+dx*.06),max(xa,xa+dx*.06),y-.06,y-.003,zc-.6,zc+.6,M['timber']))
 join(parts,name)
 x1=x0+dx*RUN*12
 # the side the player steps off at the top keeps its stringer and rail short of the top tread
 for side in (-1,1):
  zz=zc+side*.63;ex=side==exit_side;f=9.6/12 if ex else 1
  xe=x0+dx*RUN*12*f;ye=yb+3*f
  mesh(railname+'Stringer',[(x0-dx*.05,yb-.02,zz-.03),(xe,ye-.4,zz-.03),(xe,ye+.05,zz-.03),(x0-dx*.05,yb+.3,zz-.03),
   (x0-dx*.05,yb-.02,zz+.03),(xe,ye-.4,zz+.03),(xe,ye+.05,zz+.03),(x0-dx*.05,yb+.3,zz+.03)],BOXF,M['timber'])
  last=9 if ex else 12
  for i in (1,4,7,last) if ex else (1,4,7,10,12):
   x=x0+dx*RUN*(i-.5);y=yb+H13*i;prism(railname+'Post',x-.04,x+.04,y,y+.95,zz-.04,zz+.04,M['wood'])
  beam(railname+'Hand',(x0+dx*RUN*.5,yb+H13+.95,zz),(x0+dx*RUN*(last-.5),yb+H13*last+.95,zz),.08,.07,M['wood'])
flight('Mage_StairLibrary','Mage_Rail',-.175,1,-2.5,0,1)
flight('Mage_StairObservatory','Mage_UpperRail',4.175,-1,-.5,L2Y,-1)
def rail_line(name,a,b,y,mat=None,posts=1.0):
 a=Vector((a[0],y,a[1]));b=Vector((b[0],y,b[1]));n=max(1,round((b-a).length/posts))
 for i in range(n+1):p=a.lerp(b,i/n);prism(name,p.x-.045,p.x+.045,y,y+1.0,p.z-.045,p.z+.045,M['wood'])
 beam(name,a+Vector((0,1.0,0)),b+Vector((0,1.0,0)),.09,.08,M['wood']);beam(name,a+Vector((0,.5,0)),b+Vector((0,.5,0)),.06,.06,M['wood'])
# guards around the stair wells
rail_line('Mage_UpperRail',(.2,-1.87),(3.9,-1.87),L2Y);rail_line('Mage_UpperRail',(.2,-3.13),(.2,-1.87),L2Y);rail_line('Mage_UpperRail',(.2,-3.13),(4.3,-3.13),L2Y)
rail_line('Mage_UpperRail',(.2,-1.13),(3.83,-1.13),L3Y);rail_line('Mage_UpperRail',(3.83,-1.13),(3.83,.13),L3Y);rail_line('Mage_UpperRail',(-.9,.13),(3.83,.13),L3Y)

# ---------------- observatory gallery and thatched cone ----------------
PR=3.72;PT=[C+odir(45*k)*PR for k in range(8)]
EY=7.95;ER=5.35;AY=12.5
for k in range(8):
 p=PT[k];q=PT[(k+1)%8]
 prism('Mage_UpperGalleryPost',p.x-.12,p.x+.12,L3Y,8.8,p.y-.12,p.y+.12,M['timber'])
 beam('Mage_UpperGalleryRing',(p.x,8.68,p.y),(q.x,8.68,q.y),.2,.24,M['timber'])
 for yy,w,d in ((L3Y+.98,.1,.08),(L3Y+.12,.1,.08)):beam('Mage_UpperGalleryRail',(p.x,yy,p.y),(q.x,yy,q.y),w,d,M['wood'])
 sgk=Seg(tuple(p),tuple(q),odir(22.5+45*k))
 for i in range(1,8):
  u=sgk.L*i/8
  if i%2:sbox('Mage_UpperGalleryBaluster',sgk,u-.09,u+.09,L3Y+.16,L3Y+.94,-.025,.025,M['wood'])
  else:beam('Mage_UpperGalleryBaluster',sgk.p(u-sgk.L/8+.1,L3Y+.2,0),sgk.p(u+sgk.L/8-.1,L3Y+.9,0),.08,.05,M['wood'])
 for s in (1,-1):
  d=(q-p).normalized()*s;a=p if s>0 else q
  beam('Mage_UpperGalleryBrace',(a.x,8.0,a.y),(a.x+d.x*.6,8.58,a.y+d.y*.6),.1,.1,M['timber'])
EV=[C+odir(45*k)*ER for k in range(8)];APEX=(C.x,AY,C.y)
deck('Mage_RoofBoardCone',[[(EV[k].x,EY,EV[k].y),(EV[(k+1)%8].x,EY,EV[(k+1)%8].y),APEX] for k in range(8)],.14,M['thatch_d'])
rng=random.Random(58);TH=Layer('Mage_RoofThatch',[M['thatch'],M['thatch_l'],M['thatch_d']])
for k in range(8):
 A=(EV[k].x,EY,EV[k].y);B=(EV[(k+1)%8].x,EY,EV[(k+1)%8].y);lay(TH,A,B,APEX,APEX,9,1.6,.03,.16,.13,rng,drop=.35,bands=True)
 beam('Mage_RoofHipRoll',(EV[k].x,EY+.14,EV[k].y),(C.x,AY+.12,C.y),.3,.2,M['thatch_d'])
 e=C+odir(45*k)*(ER-.25);beam('Mage_RoofRafter',(e.x,EY-.02,e.y),(C.x,AY-.4,C.y),.14,.16,M['timber'])
 p=PT[k];yr=EY-.02+(ER-.25-PR)/(ER-.25)*(AY-.4-EY+.02)-.1;prism('Mage_RoofRafter',p.x-.07,p.x+.07,8.78,yr,p.y-.07,p.y+.07,M['timber'])
cyl('Mage_RoofFinial',(C.x,AY-.1,C.y),(C.x,AY+.6,C.y),.5,.14,M['thatch_d'])
cyl('Mage_RoofFinial',(C.x,AY+.5,C.y),(C.x,AY+1.35,C.y),.05,.04,M['wood'],6)
for ax in ((1,0,0),(0,0,1)):
 a=Vector(ax)*.28;mesh('Mage_RoofFinial',[(C.x-a.x,AY+1.25,C.y-a.z),(C.x,AY+1.53,C.y),(C.x+a.x,AY+1.25,C.y+a.z),(C.x,AY+.97,C.y)]+[(C.x-a.x+ax[2]*.02,AY+1.25,C.y-a.z+ax[0]*.02),(C.x+ax[2]*.02,AY+1.53,C.y+ax[0]*.02),(C.x+a.x+ax[2]*.02,AY+1.25,C.y+a.z+ax[0]*.02),(C.x+ax[2]*.02,AY+.97,C.y+ax[0]*.02)],BOXF,M['brass'])
# thatched pent skirting the east faces over the ground-floor windows
PTOP,PEAVE,PW=3.75,2.85,1.3
pent=[7,0,1]
for j,k in enumerate(pent):
 sg=FACE[k];s0=-MT*.2 if j==0 else -MT*PW;s1=FL+MT*.2 if j==2 else FL+MT*PW;t0=-MT*.2 if j==0 else -MT*.2;t1=FL+MT*.2
 A=sg.p(s0 if j else -MT*.2,PEAVE,PW);B=sg.p(s1 if j<2 else FL+MT*.2,PEAVE,PW);Cc=sg.p(FL+MT*.2,PTOP,.2);D=sg.p(-MT*.2,PTOP,.2)
 deck('Mage_RoofBoardPent',[[A,B,Cc,D]],.1,M['thatch_d']);lay(TH,A,B,Cc,D,3,1.4,.03,.14,.1,rng,drop=.3,bands=True)
 if j<2:beam('Mage_RoofHipRoll',sg.p(FL+MT*PW,PEAVE+.12,PW),sg.p(FL+MT*.2,PTOP+.1,.2),.26,.18,M['thatch_d'])
 for u in (FL*.5,)+((0,) if j==0 else ())+((FL,) if j==2 else ()):
  beam('Mage_RoofPentBracket',sg.p(u,2.25,.25),sg.p(u,PEAVE-.05,PW-.2),.1,.1,M['timber'])
for j,u,w in ((0,-MT*.2,1),(2,FL+MT*.2,1)):
 sg=FACE[pent[j]];beam('Mage_RoofPentVerge',sg.p(u,PEAVE+.02,PW+.05),sg.p(u,PTOP+.02,.2),.1,.2,M['wood'])
TH.build()

# ---------------- study wing: stone base, framed plaster, crooked hip roof ----------------
WT=.35;SB=1.0;WP=2.9
WING={'W':(Seg((-6,-2.175),(-6,4.175),(-1,0)),[(1.575,3.775,0,2.3),(4.675,5.675,1.15,2.3)]),
 'N':(Seg((-5.825,-2),(-1.6,-2),(0,-1)),[(2.625,3.425,1.15,2.3)]),
 'S':(Seg((-5.825,4),(-1.175,4),(0,1)),[(1.425,3.225,0,2.3),(3.525,4.325,1.15,2.3),(.225,.925,1.15,2.3)]),
 'E':(Seg((-1,1.3),(-1,4.175),(1,0)),[(1.75,2.45,1.15,2.3)])}
FEXT={'W':(-.03,6.38),'N':(-.4,4.05),'S':(-.4,5.03),'E':(1.1,2.9)}
for side,(sg,holes) in WING.items():
 doors=[h for h in holes if h[2]==0]
 wall('Mage_ShellWingBase',sg,0,sg.L,0,SB,doors,WT,M['stone']);facing('Mage_ShellWingFacing',sg,FEXT[side][0],FEXT[side][1],0,SB,doors,WT,.34)
 sbox('Mage_ShellPlinth',sg,FEXT[side][0],FEXT[side][1],-.35,.05,.15,.3,M['stone_d']) if not doors else None
 for a,b in ([(FEXT[side][0],doors[0][0]),(doors[0][1],FEXT[side][1])] if doors else []):sbox('Mage_ShellPlinth',sg,a,b,-.35,.05,.15,.3,M['stone_d'])
 wall('Mage_ShellWingPlaster',sg,0,sg.L,SB,WP,holes,.3,M['plaster'])
 fm=[];f0,f1=WT/2-.02,WT/2+.05
 def fmem(u0,u1,v0,v1):fm.append(sbox('Mage_ShellTimber',sg,u0,u1,v0,v1,f0,f1,M['timber']))
 ua,ub=max(0,FEXT[side][0]),min(sg.L,FEXT[side][1])
 cuts=[(ua,ub)]
 for a,b,c,d in doors:cuts=[(ua,a),(b,ub)]
 for a,b in cuts:fmem(a,b,SB,SB+.14)
 fmem(ua,ub,WP-.16,WP);fmem(ua,ub,2.3,2.42)
 studs=[ua+.07,ub-.07];u=ua
 while u<ub-.8:
  u+=1.0
  if u<ub-.35 and not any(h[0]-.2<u<h[1]+.2 for h in holes):studs.append(u)
 for s in studs:fmem(s-.07,s+.07,SB+.14,WP-.16)
 for a,b,c,d in holes:
  for s in (a-.07,b+.07):fmem(s-.07,s+.07,SB+.14,2.3)
  if c>0:
   fm.append(sbox('Mage_ShellWindow',sg,a-.1,b+.1,c-.12,c-.02,-.05,WT/2+.14,M['sill']))
   for s in (a,b-.06):fm.append(sbox('Mage_ShellWindow',sg,s,s+.06,c,d,-.06,.06,M['wood']))
   fm.append(sbox('Mage_ShellWindow',sg,(a+b)/2-.03,(a+b)/2+.03,c,d,-.04,.04,M['wood']))
 for end,dirn in ((ua+.14,1),(ub-.14,-1)):
  if not any(h[0]-.6<end<h[1]+.6 for h in holes):
   fm.append(beam('Mage_ShellTimber',sg.p(end,SB+.14,(f0+f1)/2),sg.p(end+dirn*.85,2.3,(f0+f1)/2),.12,.07,M['timber']))
 join(fm,'Mage_ShellTimber'+side)
# shutters on the south (yard) windows and door frames
sg=WING['S'][0]
for a,b in ((3.525,4.325),(.225,.925)):
 for s0,s1 in ((a-.42,a-.04),(b+.04,b+.42)):sbox('Mage_ShellShutter',sg,s0,s1,1.2,2.25,WT/2+.18,WT/2+.22,M['wood'])
for side,(a,b) in (('W',(1.575,3.775)),('S',(1.425,3.225))):
 sg=WING[side][0]
 for s0,s1 in ((a,a+.1),(b-.1,b)):sbox('Mage_ShellDoorFrame',sg,s0,s1,0,2.3,-.19,.19,M['timber'])
 sbox('Mage_ShellDoorFrame',sg,a-.1,b+.1,2.3,2.45,-.2,.22,M['timber'])
# open doors: double leaves on the west, a single leaf onto the yard
for z0,z1 in ((-.48,-.41),(1.41,1.48)):
 prism('Mage_DoorWest',-5.825,-4.87,.02,2.26,z0,z1,M['wood'])
 for yy in (.4,1.9):prism('Mage_DoorWest',-5.8,-4.9,yy,yy+.14,z0-.03 if z0<0 else z1,z0 if z0<0 else z1+.03,M['timber'])
 prism('Mage_DoorWest',-5.1,-5.02,1.0,1.1,z0-.06 if z0<0 else z1,z0 if z0<0 else z1+.06,M['iron'])
prism('Mage_DoorSouth',-2.73,-2.66,.02,2.26,2.23,3.825,M['wood'])
for yy in (.4,1.9):prism('Mage_DoorSouth',-2.66,-2.62,yy,yy+.14,2.28,3.78,M['timber'])
# chimney on the north wall, a stepped stone stack
prism('Mage_RoofChimney',-5.2,-3.8,-.35,2.1,-2.85,-2.175,M['stone']);beam('Mage_RoofChimney',(-5.2,2.1,-2.5),(-5.0,2.45,-2.5),.7,.12,M['sill'])
prism('Mage_RoofChimney',-5.0,-4.0,2.1,6.05,-2.75,-2.175,M['stone']);prism('Mage_RoofChimney',-5.1,-3.9,6.05,6.22,-2.85,-2.075,M['sill'])
facing('Mage_RoofChimneyFacing',Seg((-5.0,-2.46),(-4.0,-2.46),(0,-1)),-.03,1.03,2.1,6.05,[],.58,.39,(.35,.6))
for x in (-4.72,-4.28):cyl('Mage_RoofChimney',(x,6.2,-2.46),(x,6.62,-2.46),.13,.11,M['clay'])
# the crooked hip roof: ridge skewed in plan and dropping to the south
XA,XB,ZA,ZB,EYW=-6.625,-.375,-2.625,4.625,2.58
RN=(-3.35,5.25,-.1);RS=(-3.62,5.1,2.4)
NW,NE,SE,SW=(XA,EYW,ZA),(XB,EYW,ZA),(XB,EYW,ZB),(XA,EYW,ZB)
faces_w=[('W',SW,NW,RN,RS),('E',NE,SE,RS,RN),('N',NW,NE,RN,RN),('S',SE,SW,RS,RS)]
wroof=[deck('Mage_RoofBoardWing',[[a,b,c,d] if c!=d else [a,b,c] for _,a,b,c,d in faces_w],.12,M['clay_d'])]
GZ0,GZ1,GR,GE=-1.05,2.05,4.45,2.95
def under_gable(p):return GZ0+.05<p.z<GZ1-.05 and p.x<-4.2 and p.y<GR-abs(p.z-.5)*(GR-GE)/(.5-GZ0)+.05
TL=Layer('Mage_RoofTilesWing',[M['clay'],M['clay_l'],M['clay_d']]);trng=random.Random(4)
for side,a,b,c,d in faces_w:lay(TL,a,b,c,d,9,.72,.03,.05,.025,trng,under_gable if side=='W' else None)
# cross gable over the west door
def main_y(x):return EYW+(x-XA)*(5.2-EYW)/(-3.48-XA)
xm=XA+(GR-EYW)/((5.2-EYW)/(-3.48-XA))+.12;xv=XA+(GE-EYW)/((5.2-EYW)/(-3.48-XA))+.1
for ze in (GZ0,GZ1):
 A=(-6.72,GE,ze);B=(xv,GE,ze);Cc=(xm,GR,.5);D=(-6.72,GR,.5)
 if ze>0:A,B,Cc,D=B,A,D,Cc
 wroof.append(deck('Mage_RoofBoardGable',[[A,B,Cc,D]],.1,M['clay_d']));lay(TL,A,B,Cc,D,5,.5,.03,.05,.02,trng)
 beam('Mage_RoofGableBarge',(-6.74,GE-.05,ze),(-6.74,GR+.02,.5),.1,.22,M['wood'])
beam('Mage_RoofGableRidge',(-6.72,GR+.1,.5),(xm,GR+.1,.5),.2,.16,M['clay_d'])
gsg=Seg((-6,-.9),(-6,1.9),(-1,0))
mesh('Mage_RoofGableWall',[gsg.p(0,WP,-.15),gsg.p(2.8,WP,-.15),gsg.p(1.4,GR-.12,-.15),gsg.p(0,WP,.15),gsg.p(2.8,WP,.15),gsg.p(1.4,GR-.12,.15)],[(0,1,2),(5,4,3),(0,3,4,1),(1,4,5,2),(2,5,3,0)],M['plaster'])
beam('Mage_RoofGableTimber',gsg.p(.2,WP+.12,.18),gsg.p(2.6,WP+.12,.18),.14,.07,M['timber'])
beam('Mage_RoofGableTimber',gsg.p(1.4,WP+.12,.18),gsg.p(1.4,GR-.2,.18),.14,.07,M['timber'])
for u in (.7,2.1):beam('Mage_RoofGableTimber',gsg.p(u,WP+.12,.18),gsg.p(u,WP+.12+(GR-.2-WP)*(1-abs(u-1.4)/1.4)-.12,.18),.12,.07,M['timber'])
sbox('Mage_RoofGableVent',gsg,.95,1.85,3.45,3.95,-.1,.22,M['wood']);sbox('Mage_RoofGableVent',gsg,1.03,1.77,3.52,3.88,-.12,.24,M['timber'])
# ridge, hips, fascia and finials of the wing roof
beam('Mage_RoofRidgeWing',(RN[0],RN[1]+.1,RN[2]),(RS[0],RS[1]+.1,RS[2]),.24,.2,M['clay_d'])
for (e,r) in ((NW,RN),(NE,RN),(SE,RS),(SW,RS)):beam('Mage_RoofHipWing',(e[0],e[1]+.08,e[2]),(r[0],r[1]+.1,r[2]),.2,.16,M['clay_d'])
for a,b in ((NW,NE),(NE,SE),(SE,SW),(SW,NW)):beam('Mage_RoofFasciaWing',(a[0],a[1]-.05,a[2]),(b[0],b[1]-.05,b[2]),.14,.2,M['wood'])
for r in (RN,RS):cyl('Mage_RoofFinial',(r[0],r[1]+.15,r[2]),(r[0],r[1]+.75,r[2]),.08,.02,M['wood'],6)
# tie beams and king posts carrying the skewed ridge
for z,r in ((-.2,RN),(2.3,RS)):
 sp=(-5.825,-2.0 if z<0 else -1.175);prism('Mage_RoofTruss',sp[0],sp[1],2.72,2.9,z-.09,z+.09,M['timber'])
 prism('Mage_RoofTruss',r[0]-.08,r[0]+.08,2.9,r[1]-.1,z-.08,z+.08,M['timber'])
# the stone link: a lean-to cupboard filling the corner between wing and tower, over the internal passage
lk=[prism('Mage_ShellLink',-.825,.2,-.3,3.05,1.4,2.8,M['stone'])]
lk.append(facing('Mage_ShellLinkFacing',Seg((-.825,2.8),(.2,2.8),(0,1)),0,1.03,0,3.05,[(.35,.65,1.3,2.0)],0.))
for o in lk:clip_tower(o,APO+.2)
sbox('Mage_ShellLinkSlit',Seg((-.825,2.8),(.2,2.8),(0,1)),.35,.65,1.3,2.0,.0,.06,M['timber'])
LA=(-.9,3.02,3.2);LB=(.45,3.02,3.2);LC=(.45,3.9,1.2);LD=(-.9,3.9,1.2)
lr=deck('Mage_RoofBoardLink',[[LA,LB,LC,LD]],.1,M['clay_d']);LT=Layer('Mage_RoofTilesLink',[M['clay'],M['clay_l'],M['clay_d']])
lay(LT,LA,LB,LC,LD,4,.5,.03,.05,.02,trng)
for o in wroof+[TL.build(),LT.build(),lr]:clip_tower(o,APO+.19)
for nm in ('Mage_RoofRidgeWing','Mage_RoofHipWing','Mage_RoofFasciaWing'):
 for o in [o for o in bpy.data.objects if o.name.startswith(nm)]:clip_tower(o,APO+.19)

# ---------------- furnishings ----------------
def f_sbox(nm,sg,*a):return sbox(nm,sg,*a)
def shelf_unit(nm,sg,u0,u1,yb,depth,h,rng,shelves=4):
 w0,w1=-TW/2-depth,-TW/2
 sbox(nm,sg,u0,u0+.05,yb,yb+h,w0,w1,M['wood']);sbox(nm,sg,u1-.05,u1,yb,yb+h,w0,w1,M['wood']);sbox(nm,sg,u0,u1,yb+h-.05,yb+h,w0,w1,M['wood'])
 sbox(nm,sg,u0,u1,yb,yb+h,w1-.03,w1,M['timber'])
 for i in range(shelves):
  y=yb+.08+i*(h-.1)/shelves;sbox(nm,sg,u0,u1,y,y+.04,w0,w1,M['wood'])
  u=u0+.08
  while u<u1-.2:
   bw=rng.uniform(.22,.48);hh=rng.uniform(.2,.3)
   if rng.random()<.85:sbox(nm,sg,u,min(u+bw,u1-.08),y+.04,y+.04+hh,w0+.04,w1-.06,rng.choice([M['leather'],M['chart'],M['rune'],M['wood'],M['parch'],M['leather']]))
   u+=bw+rng.uniform(.01,.12)
frng=random.Random(11)
# rune workroom (tower ground): cabinet of rune jars, window bench, candle stand
shelf_unit('Mage_Furnishing',FACE[7],.35,2.7,0,.42,1.9,frng,3)
sbox('Mage_Furnishing',FACE[0],.55,2.5,0,.45,-TW/2-.45,-TW/2,M['wood']);sbox('Mage_Furnishing',FACE[0],.5,2.55,.45,.52,-TW/2-.5,-TW/2,M['timber'])
cyl('Mage_Furnishing',(0.6,0,1.95),(0.6,1.4,1.95),.04,.03,M['iron'],6);cyl('Mage_Furnishing',(0.6,0,1.95),(0.6,.06,1.95),.22,.18,M['iron'],6)
cyl('Mage_Furnishing',(0.6,1.4,1.95),(0.6,1.52,1.95),.05,.04,M['parch'],6)
# study wing: hearth, desk, bookcase, table and bench, potion shelf
prism('Mage_Furnishing',-5.2,-3.8,0,.25,-1.825,-1.25,M['sill']);prism('Mage_Furnishing',-5.2,-4.95,.25,1.2,-1.825,-1.4,M['stone'])
prism('Mage_Furnishing',-4.05,-3.8,.25,1.2,-1.825,-1.4,M['stone']);prism('Mage_Furnishing',-5.3,-3.7,1.2,1.42,-1.825,-1.3,M['wood'])
prism('Mage_Furnishing',-4.95,-4.05,.25,1.2,-1.825,-1.78,M['iron']);cyl('Mage_Furnishing',(-4.5,.3,-1.55),(-4.5,.55,-1.55),.22,.05,M['clay_l'],6)
prism('Mage_Furnishing',-3.0,-2.2,.74,.8,-1.8,-1.1,M['wood'])
for x,z in ((-2.95,-1.75),(-2.25,-1.75),(-2.95,-1.15),(-2.25,-1.15)):prism('Mage_Furnishing',x-.035,x+.035,0,.74,z-.035,z+.035,M['wood'])
prism('Mage_Furnishing',-2.85,-2.45,.8,.82,-1.6,-1.3,M['parch']);cyl('Mage_Furnishing',(-2.35,.8,-1.65),(-2.35,.95,-1.65),.04,.03,M['brass'],6)
shelf_unit('Mage_Furnishing',Seg((-6,-.75),(-6,-1.75),(-1,0)),.0,1.0,0,.36,2.1,frng,4)
prism('Mage_Furnishing',-5.5,-4.4,.72,.78,2.4,3.4,M['wood'])
for x,z in ((-5.42,2.48),(-4.48,2.48),(-5.42,3.32),(-4.48,3.32)):prism('Mage_Furnishing',x-.04,x+.04,0,.72,z-.04,z+.04,M['wood'])
prism('Mage_Furnishing',-5.4,-4.5,.42,.47,3.5,3.78,M['wood']);prism('Mage_Furnishing',-5.35,-5.28,0,.42,3.55,3.73,M['wood']);prism('Mage_Furnishing',-4.62,-4.55,0,.42,3.55,3.73,M['wood'])
prism('Mage_Furnishing',-5.2,-4.8,.78,.8,2.7,3.0,M['parch'])
shelf_unit('Mage_Furnishing',Seg((-1,2.6),(-1,1.5),(1,0)),0,1.1,0,.3,1.6,frng,3)
# library (level 2): bookcases on four faces
for k,(u0,u1) in ((0,(.4,2.65)),(1,(.35,2.0)),(3,(.4,2.65)),(4,(.4,2.65))):shelf_unit('Mage_UpperFurnishing',FACE[k],u0,u1,L2Y,.35,2.2,frng,4)
# observatory (level 3): star-chart table, armillary sphere, stool
prism('Mage_UpperFurnishing',.7,1.7,L3Y+.82,L3Y+.9,-3.1,-2.4,M['wood'])
for x,z in ((.76,-3.04),(1.64,-3.04),(.76,-2.46),(1.64,-2.46)):prism('Mage_UpperFurnishing',x-.04,x+.04,L3Y,L3Y+.82,z-.04,z+.04,M['wood'])
prism('Mage_UpperFurnishing',.76,1.64,L3Y+.9,L3Y+.915,-3.04,-2.46,M['chart'])
srng=random.Random(7)
for i in range(22):
 x=srng.uniform(.8,1.6);z=srng.uniform(-3.0,-2.5);s=srng.choice([.012,.018,.026]);prism('Mage_UpperFurnishing',x-s,x+s,L3Y+.915,L3Y+.925,z-s,z+s,M['parch'])
ring('Mage_UpperFurnishing',(1.2,L3Y+.92,-2.75),(0,1,0),.24,.02,.008,M['brass'],12)
cyl('Mage_UpperFurnishing',(1.2,L3Y,1.6),(1.2,L3Y+.9,1.6),.1,.07,M['wood'],6);cyl('Mage_UpperFurnishing',(1.2,L3Y,1.6),(1.2,L3Y+.08,1.6),.3,.26,M['wood'],6)
for nrm in ((0,1,0),(1,0,0),(.6,.3,.74)):ring('Mage_UpperFurnishing',(1.2,L3Y+1.3,1.6),nrm,.34,.04,.03,M['brass'],14)
cyl('Mage_UpperFurnishing',(1.2,L3Y+.9,1.6),(1.2,L3Y+1.7,1.6),.015,.015,M['iron'],4);cyl('Mage_UpperFurnishing',(1.2,L3Y+1.24,1.6),(1.2,L3Y+1.36,1.6),.07,.07,M['rune'],6)
cyl('Mage_UpperFurnishing',(3.1,L3Y,-2.9),(3.1,L3Y+.5,-2.9),.2,.18,M['wood'],6)

# ---------------- services ----------------
sv=[]
sv.append(prism('Mage_ServiceRuneTable_Workroom',1.7,3.3,.78,.86,1.05,1.8,M['wood']))
for x,z in ((1.78,1.12),(3.22,1.12),(1.78,1.73),(3.22,1.73)):sv.append(prism('Mage_ServiceRuneTable_Workroom',x-.045,x+.045,0,.78,z-.045,z+.045,M['wood']))
sv.append(prism('Mage_ServiceRuneTable_Workroom',1.8,3.2,.2,.26,1.4,1.46,M['timber']))
rr=random.Random(3)
for i,(x,z) in enumerate(((1.95,1.25),(2.25,1.2),(2.55,1.28),(2.85,1.22),(2.1,1.5),(2.45,1.55))):
 sv.append(cyl('Mage_ServiceRuneTable_Workroom',(x,.86,z),(x,.9,z),.085,.075,M['rune'],6))
 sv.append(prism('Mage_ServiceRuneTable_Workroom',x-.035,x+.035,.9,.905,z-.008,z+.008,M['parch']))
 if i%2:sv.append(prism('Mage_ServiceRuneTable_Workroom',x-.008,x+.008,.9,.905,z-.035,z+.035,M['parch']))
sv.append(prism('Mage_ServiceRuneTable_Workroom',2.75,3.15,.86,.9,1.45,1.72,M['leather']));sv.append(prism('Mage_ServiceRuneTable_Workroom',2.78,3.12,.9,.91,1.47,1.7,M['parch']))
sv.append(cyl('Mage_ServiceRuneTable_Workroom',(1.95,.86,1.65),(1.95,1.0,1.65),.07,.06,M['brass'],6))
join(sv,'Mage_ServiceRuneTable_Workroom')
lx,lz=2.25,2.3;sv=[]
sv.append(prism('Mage_ServiceLectern_Library',lx-.3,lx+.3,L2Y,L2Y+.06,lz-.22,lz+.22,M['wood']))
sv.append(prism('Mage_ServiceLectern_Library',lx-.07,lx+.07,L2Y,L2Y+1.0,lz-.07,lz+.07,M['wood']))
top=[(lx-.33,L2Y+1.02,lz-.2),(lx+.33,L2Y+1.02,lz-.2),(lx+.33,L2Y+1.22,lz+.2),(lx-.33,L2Y+1.22,lz+.2)]
sv.append(mesh('Mage_ServiceLectern_Library',top+[(x,y+.05,z) for x,y,z in top],BOXF,M['wood']))
bk=[(lx-.26,L2Y+1.08,lz-.14),(lx+.26,L2Y+1.08,lz-.14),(lx+.26,L2Y+1.23,lz+.14),(lx-.26,L2Y+1.23,lz+.14)]
sv.append(mesh('Mage_ServiceLectern_Library',bk+[(x,y+.03,z) for x,y,z in bk],BOXF,M['parch']))
sv.append(mesh('Mage_ServiceLectern_Library',[(x,y-.01,z) for x,y,z in bk]+[(x,y+.005,z) for x,y,z in bk],BOXF,M['leather']))
sv.append(cyl('Mage_ServiceLectern_Library',(lx+.4,L2Y,lz),(lx+.4,L2Y+1.15,lz),.03,.03,M['iron'],6))
join(sv,'Mage_ServiceLectern_Library')
tx,tz=4.3,-2.4;hy=L3Y+1.3;sv=[]
for a in (0,120,240):
 d=Vector((math.cos(math.radians(a+20)),math.sin(math.radians(a+20))))*.42;sv.append(beam('Mage_ServiceTelescope_Observatory',(tx+d.x,L3Y,tz+d.y),(tx,hy,tz),.06,.06,M['wood']))
sv.append(prism('Mage_ServiceTelescope_Observatory',tx-.1,tx+.1,hy-.05,hy+.1,tz-.1,tz+.1,M['iron']))
dv=Vector((.62,.62,-.48)).normalized();el=math.radians(32);dirv=Vector((math.cos(el)*.707,math.sin(el),-math.cos(el)*.707))
base=Vector((tx,hy+.18,tz))
sv.append(cyl('Mage_ServiceTelescope_Observatory',tuple(base-dirv*.7),tuple(base+dirv*1.1),.08,.13,M['brass'],8))
for f in (-.55,.1,.95):sv.append(cyl('Mage_ServiceTelescope_Observatory',tuple(base+dirv*(f-.04)),tuple(base+dirv*(f+.04)),.12+f*.02,.12+f*.02,M['iron'],8))
sv.append(cyl('Mage_ServiceTelescope_Observatory',tuple(base-dirv*.9),tuple(base-dirv*.7),.035,.05,M['iron'],6))
join(sv,'Mage_ServiceTelescope_Observatory')

# ---------------- practice yard: split-rail fence, gate, coop, straw target, dummy ----------------
yrng=random.Random(64);yd=[]
def fence(a,b,skip=None):
 a=Vector(a);b=Vector(b);n=max(1,math.ceil((b-a).length/1.45))
 pts=[a.lerp(b,i/n) for i in range(n+1)]
 for p in pts:
  g=ground(p.x,p.y);yd.append(prism('Mage_YardFence',p.x-.07,p.x+.07,g-.2,g+1.12,p.y-.07,p.y+.07,M['wood']))
 for p,q in zip(pts,pts[1:]):
  for h in (.45,.92):
   j=yrng.uniform(-.05,.05);yd.append(beam('Mage_YardFence',(p.x,ground(p.x,p.y)+h+j,p.y),(q.x,ground(q.x,q.y)+h-j,q.y),.08,.07,M['wood']))
fence((-1,4.5),(-1,5.0));fence((-1,7.0),(-1,8.0));fence((-1,8.0),(-7,8.0));fence((-7,8.0),(-7,4.0));fence((-7,4.0),(-6.35,4.0))
for z in (5.0,7.0):
 g=ground(-1,z);yd.append(prism('Mage_YardGate',-1.1,-.9,g-.25,g+1.4,z-.1,z+.1,M['timber']));yd.append(prism('Mage_YardGate',-1.14,-.86,g+1.4,g+1.48,z-.14,z+.14,M['wood']))
g=ground(-1.9,6.95)
for yy in (.15,1.05):yd.append(prism('Mage_YardGate',-2.8,-1.12,g+yy,g+yy+.1,6.9,6.96,M['wood']))
for x in (-2.78,-1.95,-1.14):yd.append(prism('Mage_YardGate',x-.04,x+.04,g+.15,g+1.15,6.9,6.96,M['wood']))
yd.append(beam('Mage_YardGate',(-2.75,g+.22,6.93),(-1.17,g+1.08,6.93),.07,.05,M['wood']))
# coop in the south-west corner, on legs, thatched
x0,x1,z0,z1=-6.8,-5.6,6.85,7.8;g=ground(-6.2,7.3)
for x,z in ((x0+.06,z0+.06),(x1-.06,z0+.06),(x0+.06,z1-.06),(x1-.06,z1-.06)):yd.append(prism('Mage_YardCoop',x-.05,x+.05,g-.1,g+.5,z-.05,z+.05,M['timber']))
yd.append(prism('Mage_YardCoop',x0,x1,g+.45,g+1.2,z0,z1,M['wood']))
for x in (x0+.3,x0+.6,x0+.9):yd.append(prism('Mage_YardCoop',x-.02,x+.02,g+.45,g+1.2,z0-.02,z0,M['timber']))
yd.append(prism('Mage_YardCoop',x1,x1+.02,g+.55,g+.9,7.2,7.5,M['timber']))
yd.append(beam('Mage_YardCoop',(x1+.02,g+.52,7.35),(x1+.6,g+.02,7.35),.28,.03,M['wood']))
for zz,zr in ((z0-.15,(z0+z1)/2),(z1+.15,(z0+z1)/2)):
 cp=[(x0-.15,g+1.15,zz),(x1+.15,g+1.15,zz),(x1+.15,g+1.62,zr),(x0-.15,g+1.62,zr)]
 yd.append(mesh('Mage_YardCoop',cp+[(x,y+.12,z) for x,y,z in cp],BOXF,M['thatch']))
yd.append(mesh('Mage_YardCoop',[(x0,g+1.2,z0),(x0,g+1.2,z1),(x0,g+1.6,(z0+z1)/2),(x1,g+1.2,z0),(x1,g+1.2,z1),(x1,g+1.6,(z0+z1)/2)],[(0,1,2),(5,4,3),(0,3,4,1),(1,4,5,2),(2,5,3,0)],M['wood']))
# straw archery/spell target facing the house
g=ground(-2.0,7.55)
for dx in (-.35,.35):yd.append(beam('Mage_YardTarget',(-2.0+dx,g-.1,7.7),(-2.0+dx*.2,g+1.35,7.5),.08,.08,M['wood']))
yd.append(beam('Mage_YardTarget',(-2.0,g-.1,7.95),(-2.0,g+1.2,7.55),.08,.08,M['wood']))
yd.append(cyl('Mage_YardTarget',(-2.0,g+.95,7.62),(-2.0,g+.95,7.4),.48,.48,M['thatch_l'],10))
yd.append(cyl('Mage_YardTarget',(-2.0,g+.95,7.41),(-2.0,g+.95,7.385),.32,.32,M['rune'],10))
yd.append(cyl('Mage_YardTarget',(-2.0,g+.95,7.39),(-2.0,g+.95,7.37),.16,.16,M['parch'],10))
# practice dummy: post, arms and a straw sack
g=ground(-5.6,5.1)
yd.append(prism('Mage_YardDummy',-5.66,-5.54,g-.2,g+1.7,5.04,5.16,M['wood']));yd.append(beam('Mage_YardDummy',(-6.05,g+1.3,5.1),(-5.15,g+1.3,5.1),.08,.08,M['wood']))
yd.append(cyl('Mage_YardDummy',(-5.6,g+.7,5.1),(-5.6,g+1.45,5.1),.2,.18,M['thatch'],8));yd.append(cyl('Mage_YardDummy',(-5.6,g+1.48,5.1),(-5.6,g+1.75,5.1),.13,.1,M['parch'],8))
g=ground(-4.6,7.6);yd.append(prism('Mage_YardTrough',-5.1,-4.1,g-.05,g+.4,7.4,7.75,M['wood']));yd.append(prism('Mage_YardTrough',-5.02,-4.18,g+.3,g+.38,7.46,7.69,M['rune']))
join(yd,'Mage_Yard')

# ---------------- finish: apply modifiers, fix normals, batch by prefix ----------------
for o in [o for o in bpy.context.scene.objects if o.type=='MESH']:
 bpy.context.view_layer.objects.active=o
 for m in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=m.name)
 fix(o)
GROUPS=[('Mage_ServiceRuneTable_','Mage_ServiceRuneTable_Workroom'),('Mage_ServiceLectern_','Mage_ServiceLectern_Library'),('Mage_ServiceTelescope_','Mage_ServiceTelescope_Observatory'),
 ('Mage_StairLibrary','Mage_StairLibrary'),('Mage_StairObservatory','Mage_StairObservatory'),('Mage_UpperFloorLibrary','Mage_UpperFloorLibrary'),
 ('Mage_UpperFloorObservatory','Mage_UpperFloorObservatory'),('Mage_UpperShell','Mage_UpperShell'),('Mage_UpperJoist','Mage_UpperJoist'),('Mage_UpperRail','Mage_UpperRail'),
 ('Mage_UpperGallery','Mage_UpperGallery'),('Mage_UpperFurnishing','Mage_UpperFurnishing'),('Mage_Floor','Mage_FloorGround'),('Mage_Shell','Mage_Shell'),
 ('Mage_RoofThatch','Mage_RoofThatch'),('Mage_Roof','Mage_Roof'),('Mage_Rail','Mage_RailStairLibrary'),('Mage_Furnishing','Mage_Furnishing'),('Mage_Door','Mage_Door'),('Mage_Yard','Mage_Yard')]
finals=set()
for pre,final in GROUPS:
 parts=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith(pre) and o.name not in finals]
 if not parts:continue
 finals.add(join(parts,final).name)
left=[o.name for o in bpy.context.scene.objects if o.type=='MESH' and not any(o.name.startswith(p) for p,_ in GROUPS)]
assert not left,left
bpy.context.view_layer.update()
model=OUT/'mage'
bpy.ops.wm.save_as_mainfile(filepath=str(model.with_suffix('.blend')))
bpy.ops.export_scene.gltf(filepath=str(model.with_suffix('.glb')),export_format='GLB',export_yup=True)
ms=[o for o in bpy.context.scene.objects if o.type=='MESH']
corners=[o.matrix_world@Vector(c) for o in ms for c in o.bound_box]
dims=[max(v[i] for v in corners)-min(v[i] for v in corners) for i in range(3)]
tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in ms)
mats=sorted({s.material.name for o in ms for s in o.material_slots if s.material})
report={'id':'mage','prefix':'Mage_','triangles':tris,'materials':len(mats),'materialNames':mats,'dimensionsTiles':{'x':round(dims[0],2),'z':round(dims[1],2),'y':round(dims[2],2)},
 'measuredPadY':round(PAD,3),'groundFloorLift':LIFT,'placement':{'x':PX,'y':round(PY,3),'z':PZ},
 'terrainUnderYardLocal':[round(min(ground(x,z) for x in range(-7,0) for z in range(4,9)),3),round(max(ground(x,z) for x in range(-7,0) for z in range(4,9)),3)],
 'meshes':{o.name:sum(len(p.vertices)-2 for p in o.data.polygons) for o in ms}}
(PROOF/'asset_report.json').write_text(json.dumps(report,indent=2))
print('[MAGE_V1] tris',tris,'materials',len(mats),'dims',[round(d,2) for d in dims],'pad',round(PAD,3))
