"""Lastlight beacon & keeper wing v1 (finish goal M4.4, brief docs/rebuild/HOLM_M44_BUILDING_BRIEF.md), prefix Lastlight_.
Plan place `lastlight` (x=121, z=26): a tapered octagonal fieldstone beacon of four levels (storm store, keeper's room,
watch room, lantern deck) with a corbelled projecting gallery, iron railing, glazed lantern and a red clay lantern
cap, joined at its foot to a low stone keeper wing (repair stores, forge hearth) under a clay hip roof, entered from
the west through a gabled storm porch with outward-opening storm doors. Storeys are joined by LADDERS (2004-style
instant climb): each ladder is modelled with rails and rungs, the upper end rising through a hatch with its trap leaf
standing open. The octagon is turned so its faces run N/E/S/W (cardinal tile rows meet flat walls; the plan outline
had vertices on the cardinals) and it keeps the plan's centre (1,-1) and ~3.8 radius; walls batter from 3.51 to 3.0
apothem outside while each storey's inner face stays plumb (set-offs carry the floors).
Helpers follow build_holm_mage_v1.py / build_holm_guide_house_overhaul_v2.py (mesh/prism/beam, walls with real
voids, relief stone facing, laid tiles). Local space: origin = plan centre, y=0 = ground floor (0.30 above the
measured 14.00 pad). Game (x,y,z) -> Blender (x,-z,y). Deterministic (seeded). Original design.
Also writes proof renders (workbench) into scratchpad/holm_lastlight_v1/ after export (context terrain not exported).
"""
import bpy,json,math,random,bmesh
import numpy as np
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'.studio-workspaces/holm-lastlight-v1/candidates';PROOF=ROOT/'scratchpad/holm_lastlight_v1'
OUT.mkdir(parents=True,exist_ok=True);PROOF.mkdir(parents=True,exist_ok=True)
PX,PZ=121,26;LIFT=.30
TER=json.loads((ROOT/'.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json').read_text())
TWID=TER['width']
def raw_h(x,z):
 wx,wz=x+PX,z+PZ;ix,iz=int(math.floor(wx)),int(math.floor(wz));fx,fz=wx-ix,wz-iz
 h=lambda a,b:TER['heights'][b*(TWID+1)+a]
 return h(ix,iz)*(1-fx)*(1-fz)+h(ix+1,iz)*fx*(1-fz)+h(ix,iz+1)*(1-fx)*fz+h(ix+1,iz+1)*fx*fz
FOOT=[(x+.5,z+.5) for x in range(-6,5) for z in range(-6,5)]          # footprint tiles incl. porch and gallery overhang
PAD=min(raw_h(x,z) for x,z in FOOT);PY=PAD+LIFT
PADMAX=max(raw_h(x,z) for x,z in FOOT)
def ground(x,z):return raw_h(x,z)-PY
bpy.ops.wm.read_factory_settings(use_empty=True)
M={}
def material(key,name,color,alpha=1.0,emit=False):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,alpha)
 if emit or alpha<1:
  m.use_nodes=True;b=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
  b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=.6
  if alpha<1:
   b.inputs['Alpha'].default_value=alpha
   if hasattr(m,'surface_render_method'):m.surface_render_method='BLENDED'
   else:m.blend_method='BLEND'
  if emit:b.inputs['Emission Color'].default_value=(*color,1);b.inputs['Emission Strength'].default_value=1.0
 M[key]=m
for k,n,c in [('stone','Lastlight fieldstone',(.43,.46,.42)),('stone_l','Lastlight stone lit',(.53,.55,.50)),('stone_d','Lastlight stone shade',(.36,.39,.36)),
 ('sill','Lastlight dressed sandstone',(.58,.54,.44)),('plaster','Lastlight limewash',(.80,.74,.60)),('timber','Lastlight dark frame oak',(.22,.15,.09)),
 ('wood','Lastlight aged oak',(.31,.21,.12)),('floor','Lastlight floorboards',(.43,.32,.20)),('clay','Lastlight clay tile',(.52,.20,.14)),
 ('clay_l','Lastlight clay warm',(.60,.25,.16)),('clay_d','Lastlight clay cool',(.40,.17,.13)),('iron','Lastlight wrought iron',(.17,.17,.19)),
 ('brass','Lastlight brass',(.64,.49,.21)),('cloth','Lastlight red wool',(.50,.16,.12)),('rope','Lastlight hemp rope',(.62,.52,.33))]:material(k,n,c)
material('glass','Lastlight lantern glass',(.62,.74,.80),alpha=.45)
material('flame','Lastlight beacon flame',(1.0,.72,.28),emit=True)
root=bpy.data.objects.new('Lastlight_Root',None);bpy.context.collection.objects.link(root)
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
def ring(name,c,nrm,r,wid,thick,mat,n=12):
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

class Seg:
 # a straight wall line in plan: p0->p1 (x,z), n = outward unit normal; p(u,v,w) = point u along, v up, w out
 def __init__(s,p0,p1,n):
  s.p0=Vector(p0);s.p1=Vector(p1);d=s.p1-s.p0;s.L=d.length;s.U=d/s.L;s.n=Vector(n).normalized()
 def p(s,u,v,w):q=s.p0+s.U*u+s.n*w;return (q.x,v,q.y)
def sbox(name,sg,u0,u1,v0,v1,w0,w1,mat):
 return mesh(name,[sg.p(u,v,w) for w in (w0,w1) for u,v in ((u0,v0),(u1,v0),(u1,v1),(u0,v1))],BOXF,mat)
def wall(name,sg,ua,ub,v0,v1,holes,t,mat):
 us=sorted(set([ua,ub]+[h[i] for h in holes for i in (0,1)]));vs=sorted(set([v0,v1]+[h[i] for h in holes for i in (2,3)]))
 us=[u for u in us if ua<=u<=ub];vs=[v for v in vs if v0<=v<=v1];parts=[]
 for a,b in zip(us,us[1:]):
  for c,d in zip(vs,vs[1:]):
   if any(h[0]<(a+b)/2<h[1] and h[2]<(c+d)/2<h[3] for h in holes):continue
   parts.append(mesh(name,[sg.p(u,v,w) for w in (-t/2,t/2) for u,v in ((a,c),(b,c),(b,d),(a,d))],BOXF,mat))
 return join(parts,name)
def stones(name,P,rows_uv,holes,rng,wr):
 # hand-cut relief stones in courses; P(u,v,w) is a wall-surface point (w out from the face); rows_uv yields (low,high,ua,ub)
 V=[];F=[];ids=[]
 for row,(low,high,ua,ub) in enumerate(rows_uv):
  u=ua;first=True
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
    bev=min(.05,(r-l)/4,(hi-lo)/4);k=len(V);front=.03+rng.uniform(0,.02)
    outline=[(l,lo),(r,lo),(r,hi),(l,hi)]
    V.extend(P(a,b,.003) for a,b in outline)
    V.extend(P(a+(1 if a<(l+r)/2 else -1)*bev,b+(1 if b<(lo+hi)/2 else -1)*bev,front) for a,b in outline)
    F.append(tuple(k+4+i for i in range(4)));ids.append(rng.choice([0,0,0,1,2]))
    for i in range(4):F.append((k+i,k+(i+1)%4,k+4+(i+1)%4,k+4+i));ids.append(1 if i in [1,2] else 2)
   u=right
 o=mesh(name,V,F,M['stone']);o.data.materials.append(M['stone_l']);o.data.materials.append(M['stone_d'])
 for p,i in zip(o.data.polygons,ids):p.material_index=i
 return o
def facing(name,sg,ua,ub,v0,v1,holes,t,rowh=.36,wr=(.58,1.05)):
 rng=random.Random(name+'%.3f%.3f'%(sg.p0.x,sg.p0.y));rows=max(1,round((v1-v0)/rowh));rh=(v1-v0)/rows
 return stones(name,lambda u,v,w:sg.p(u,v,t/2+w),[(v0+i*rh,v0+(i+1)*rh,ua,ub) for i in range(rows)],holes,rng,wr)
class Layer:
 def __init__(s,name,mats):s.name=name;s.mats=mats;s.V=[];s.F=[];s.I=[]
 def build(s):
  o=mesh(s.name,s.V,s.F,s.mats[0])
  for m in s.mats[1:]:o.data.materials.append(m)
  for p,i in zip(o.data.polygons,s.I):p.material_index=i
  return o
def lay(L,A,B,C_,D,rows,size,lift,thick,tilt,rng,skip=None,drop=0):
 # courses laid eave (A->B) to top (D->C); each piece a thin lipped slab, odd courses staggered
 A,B,C_,D=map(Vector,(A,B,C_,D));n=(B-A).cross((D if (D-A).length>1e-6 else C_)-A).normalized()
 if n.y<0:n=-n
 def P(t,s):return A.lerp(D,t).lerp(B.lerp(C_,t),s)
 for r in range(rows):
  t0=r/rows;t1=min(1,(r+1.3)/rows);length=(P(t0,1)-P(t0,0)).length
  if length<.08:continue
  k=max(1,round(length/size))
  inner=[(i+(.5 if r%2 else 0))/k+rng.uniform(-.12,.12)/k for i in range(1,k+(1 if r%2 else 0))]
  edges=[0]+[e for e in inner if .02<e<.98]+[1]
  for s0,s1 in zip(edges,edges[1:]):
   g=.012/length;a0,a1=s0+g,s1-g
   if skip and skip(P((t0+t1)/2,(a0+a1)/2)):continue
   q=len(L.V)
   for lf in (lift,lift+thick):
    tb=t0-rng.uniform(0,drop)/rows if drop else t0
    for tt,ss in ((tb,a0),(tb,a1),(t1,a1),(t1,a0)):L.V.append(tuple(P(tt,ss)+n*(lf+(tilt if tt==t1 else 0))))
   L.F.extend([(q,q+3,q+2,q+1),(q+4,q+5,q+6,q+7),(q,q+1,q+5,q+4),(q+1,q+2,q+6,q+5),(q+2,q+3,q+7,q+6),(q+3,q,q+4,q+7)])
   L.I.extend([rng.choice([0,0,0,1,2])]*6)

# ---------------- beacon plan geometry: octagon with flat N/E/S/W faces ----------------
C=Vector((1,-1));MT=math.tan(math.radians(22.5));CO=math.cos(math.radians(22.5))
def N(k):a=math.radians(45*k);return Vector((math.cos(a),math.sin(a)))
def T(k):n=N(k);return Vector((-n.y,n.x))
def AO(v):return 3.51-.0567*v                      # battered outer apothem: 3.51 at the floor, 3.0 at the gallery
AI={0:2.95,1:2.80,2:2.65}                           # plumb inner apothem per storey (set-offs carry the floors)
Y1,Y2,Y3=3.0,6.0,9.0                                # keeper room, watch room, lantern deck
def tq(k,u,v,A):q=C+N(k)*A+T(k)*u;return (q.x,v,q.y)
def octo(A):r=A/CO;return [tuple(C+Vector((math.cos(math.radians(22.5+45*k)),math.sin(math.radians(22.5+45*k))))*r) for k in range(8)]
def W(a,b):return (C.x+a,C.y+b)                     # beacon offset (a,b) -> local (x,z)
def inside_oct(x,z,A):return all((Vector((x,z))-C).dot(N(k))<A for k in range(8))
def clip_tower(o,apo):
 bm=bmesh.new();bm.from_mesh(o.data)
 for k in range(8):
  n=N(k);co=C+n*apo
  bmesh.ops.bisect_plane(bm,geom=bm.verts[:]+bm.edges[:]+bm.faces[:],plane_co=(co.x,-co.y,0),plane_no=(n.x,-n.y,0))
 dead=[f for f in bm.faces if inside_oct(f.calc_center_median().x,-f.calc_center_median().y,apo-1e-3)]
 bmesh.ops.delete(bm,geom=dead,context='FACES');bm.to_mesh(o.data);bm.free();o.data.update();return o
def band(name,k,prof,mat):
 # one face of an octagonal lathe: prof = closed loop of (y, apothem)
 V=[];F=[]
 for y,A in prof:V+=[tq(k,-A*MT,y,A),tq(k,A*MT,y,A)]
 n=len(prof)
 for i in range(n):j=(i+1)%n;F.append((2*i,2*i+1,2*j+1,2*j))
 F.append(tuple(2*i for i in range(n)));F.append(tuple(2*i+1 for i in range(n)))
 return mesh(name,V,F,mat)
def lathe(name,prof,mat,skip=()):
 return [band(name,k,prof,mat) for k in range(8) if k not in skip]
def twall(name,k,v0,v1,Ain,holes,mat):
 hu=sorted(set(h[i] for h in holes for i in (0,1)));us=['L']+hu+['R']
 vs=sorted(set([v0,v1]+[h[i] for h in holes for i in (2,3) if v0<h[i]<v1]))
 num=lambda u:-9 if u=='L' else (9 if u=='R' else u)
 for a,b in zip(us,us[1:]):
  for c,d in zip(vs,vs[1:]):
   if any(h[0]<(num(a)+num(b))/2<h[1] and h[2]<(c+d)/2<h[3] for h in holes):continue
   P=[]
   for side in (0,1):
    for uu,vv in ((a,c),(b,c),(b,d),(a,d)):
     A=Ain if side==0 else AO(vv);U=-A*MT if uu=='L' else (A*MT if uu=='R' else uu);P.append(tq(k,U,vv,A))
   mesh(name,P,BOXF,mat)
def tbox(name,k,u0,u1,v0,v1,w0,w1,mat):
 # box on the battered outer face; w measured out from the outer surface at each height
 return mesh(name,[tq(k,u,v,AO(v)+w) for w in (w0,w1) for u,v in ((u0,v0),(u1,v0),(u1,v1),(u0,v1))],BOXF,mat)
def ibox(name,k,u0,u1,v0,v1,d0,d1,Ain,mat):
 # box against a plumb inner face; d measured inward from the inner apothem
 return mesh(name,[tq(k,u,v,Ain-d) for d in (d0,d1) for u,v in ((u0,v0),(u1,v0),(u1,v1),(u0,v1))],BOXF,mat)
def tfacing(name,k,v0,v1,holes,rowh,wr):
 rng=random.Random('%s%d%.2f'%(name,k,v0));rows=max(1,round((v1-v0)/rowh));rh=(v1-v0)/rows;R=[]
 for i in range(rows):lo=v0+i*rh;hw=(AO(lo)+.02)*MT;R.append((lo,lo+rh,-hw,hw))
 return stones(name,lambda u,v,w:tq(k,u,v,AO(v)+w),R,holes,rng,wr)

# ---------------- openings (u along each face; E:u=b, S:u=-a, W:u=-b, N:u=a) ----------------
SLIT=lambda v0,v1:(-.16,.16,v0,v1)
WIN=lambda w,v0,v1:(-w/2,w/2,v0,v1)
HOLES={0:{0:[SLIT(1.0,2.0)],1:[SLIT(1.0,2.0)],2:[SLIT(1.0,2.0)],3:[],4:[(-1.4,.4,0,2.3)],5:[SLIT(1.0,2.0)],6:[],7:[SLIT(1.0,2.0)]},
 1:{0:[(.35,.67,4.0,5.0)],1:[SLIT(4.0,5.0)],2:[WIN(.8,3.95,5.1)],3:[],4:[SLIT(4.9,5.6)],5:[WIN(.8,3.95,5.1)],6:[(-.75,-.43,4.0,5.0)],7:[WIN(.8,3.95,5.1)]},
 2:{0:[],1:[WIN(.7,6.85,7.95)],2:[(-.9,-.3,6.85,7.95)],3:[WIN(.7,6.85,7.95)],4:[WIN(.7,6.85,7.95)],5:[WIN(.7,6.85,7.95)],6:[WIN(.7,6.85,7.95)],7:[WIN(.7,6.85,7.95)]}}
LV=[(-.3,Y1),(Y1,Y2),(Y2,8.75)]
FV=[(.3,2.9),(3.1,5.9),(6.1,8.05)]
for lvl in range(3):
 pre='Lastlight_ShellTower' if lvl==0 else 'Lastlight_UpperShell'+('Keeper' if lvl==1 else 'Watch')
 for k in range(8):
  twall(pre,k,LV[lvl][0],LV[lvl][1],AI[lvl],HOLES[lvl][k],M['stone'])
  tfacing(pre+'Facing',k,FV[lvl][0],FV[lvl][1],HOLES[lvl][k],.37 if lvl==0 else .43,(.62,1.1) if lvl==0 else (.8,1.35))
  for a,b,c,d in HOLES[lvl][k]:
   if c<.1:continue
   tbox(pre+'Sill',k,a-.12,b+.12,c-.13,c,-.16,.1,M['sill']);tbox(pre+'Lintel',k,a-.16,b+.16,d,d+.2,-.08,.07,M['sill'])
   if b-a>.5:
    for s in (a,b-.07):tbox(pre+'Frame',k,s,s+.07,c,d,-.2,-.1,M['wood'])
    tbox(pre+'Frame',k,a,b,d-.08,d,-.2,-.1,M['wood']);tbox(pre+'Frame',k,(a+b)/2-.03,(a+b)/2+.03,c,d,-.18,-.12,M['wood'])
    tbox(pre+'Frame',k,a,b,(c+d)/2-.03,(c+d)/2+.03,-.18,-.12,M['wood'])
    tbox('Lastlight_Glazing'+('Keeper' if lvl==1 else 'Watch'),k,a,b,c,d,-.16,-.15,M['glass'])
    if lvl==1:
     hw=(b-a)/2
     for s0,s1 in ((a-hw-.06,a-.06),(b+.06,b+hw+.06)):
      tbox(pre+'Shutter',k,s0,s1,c+.03,d-.03,.06,.1,M['wood'])
      for vv in (c+.18,d-.26):tbox(pre+'Shutter',k,s0+.03,s1-.03,vv,vv+.08,.1,.13,M['timber'])
# string courses at the floor set-offs and the battered plinth (not inside the keeper wing)
for y in (Y1,Y2):lathe('Lastlight_UpperShellString',[(y-.1,AO(y-.1)-.12),(y-.1,AO(y-.1)+.09),(y+.1,AO(y+.1)+.09),(y+.1,AO(y+.1)-.12)],M['sill'])
lathe('Lastlight_ShellPlinth',[(-.7,3.2),(-.7,3.8),(.12,3.64),(.3,AO(.3)+.06),(.3,3.2)],M['stone_d'],skip=(3,4))
# the doorway from the keeper wing: dressed quoin jambs and a heavy lintel on the wing side
for s0,s1 in ((-1.55,-1.4),(.4,.55)):
 for i,(v0,v1) in enumerate(((0,.55),(.55,1.15),(1.15,1.75),(1.75,2.3))):tbox('Lastlight_ShellDoorJamb',4,s0-(.1 if i%2 and s0<0 else 0),s1+(.1 if i%2 and s0>0 else 0),v0+.01,v1-.01,-.02,.08,M['sill'])
tbox('Lastlight_ShellDoorLintel',4,-1.7,.7,2.3,2.62,-.02,.1,M['sill'])

# ---------------- floors, joists, hatches ----------------
H1=(W(.1,0)[0],W(.9,0)[0],W(0,-3.0)[1],W(0,-2.1)[1])      # keeper floor hatch over ladder 1 (north)
H2=(W(2.1,0)[0],W(3.0,0)[0],W(0,-.9)[1],W(0,-.1)[1])      # watch floor hatch over ladder 2 (east)
H3=(W(-.9,0)[0],W(-.1,0)[0],W(0,2.05)[1],W(0,2.62)[1])    # deck hatch over ladder 3 (south)
poly_slab('Lastlight_FloorTower',octo(3.3),0,.3,[],M['sill'])
poly_slab('Lastlight_UpperFloorKeeper',octo(AI[0]),Y1,.2,[H1],M['floor'])
poly_slab('Lastlight_UpperFloorWatch',octo(AI[1]),Y2,.2,[H2],M['floor'])
poly_slab('Lastlight_UpperFloorGallery',octo(4.0),Y3,.25,[H3],M['stone_l'])
# flag joints on the tower floor (flush, 1 cm proud strips would trip the capsule, so they are inset lines of sill tone)
def oct_span(b,A):
 xs=[i/100 for i in range(-500,500) if inside_oct(C.x+i/100,C.y+b,A)];return (min(xs),max(xs)) if xs else None
for yb,bs,nm,A in ((Y1-.4,(-1.7,-.3,1.1,2.3),'Lastlight_UpperJoistKeeper',AI[0]),(Y3-.45,(-1.8,-.6,.6,1.8),'Lastlight_UpperJoistDeck',AI[2])):
 for b in bs:
  sp=oct_span(b,A-.05);prism(nm,C.x+sp[0],C.x+sp[1],yb,yb+.2,C.y+b-.1,C.y+b+.1,M['timber'])
for a in (-1.9,-.6,.7,1.9):
 sp=oct_span(0,AI[1]-.05);bb=[i/100 for i in range(-500,500) if inside_oct(C.x+a,C.y+i/100,AI[1]-.05)]
 prism('Lastlight_UpperJoistWatch',C.x+a-.1,C.x+a+.1,Y2-.4,Y2-.2,C.y+min(bb),C.y+max(bb),M['timber'])

# ---------------- ladders (2004-style: click to change storey) ----------------
def ladder(n,foot,top,yb,yt,side,hole,hinge):
 # foot/top: beacon offsets (a,b) of the ladder centre at the lower floor and at yt+0.95; side: unit (a,b) along the rungs
 S=Vector((side[0],0,side[1]));B=Vector((C.x+foot[0],yb,C.y+foot[1]));Tp=Vector((C.x+top[0],yt+.95,C.y+top[1]))
 def at(y):return B.lerp(Tp,(y-yb)/(Tp.y-yb))
 up='Lastlight_ServiceLadder%dUp_Ladder'%n;dn='Lastlight_ServiceLadder%dDown_Hatch'%n;w=.56
 for s in (-1,1):
  beam(up,tuple(B+S*s*w/2),tuple(at(yt)+S*s*w/2),.07,.1,M['wood'])
  beam(dn,tuple(at(yt)+S*s*w/2),tuple(Tp+S*s*w/2),.07,.1,M['wood'])
  cyl(dn,tuple(Tp+S*s*w/2),tuple(Tp+S*s*w/2+Vector((0,.06,0))),.05,.02,M['wood'],6)
  prism(up,*(lambda p:(p.x-.05,p.x+.05,yb,yb+.04,p.z-.06,p.z+.06))(B+S*s*w/2),M['iron'])
 y=yb+.3
 while y<yt-.05:
  p=at(y);cyl(up,tuple(p-S*w/2),tuple(p+S*w/2),.026,.026,M['timber'],6);y+=.3
 for y in (yt+.3,yt+.6):p=at(y);cyl(dn,tuple(p-S*w/2),tuple(p+S*w/2),.026,.026,M['timber'],6)
 # hatch trim lining the hole just below the floor surface, and the trap leaf standing open on its hinge side
 x0,x1,z0,z1=hole
 for a,b,c,d in ((x0-.06,x0,z0,z1),(x1,x1+.06,z0,z1),(x0,x1,z0-.06,z0),(x0,x1,z1,z1+.06)):prism(dn,a,b,yt-.2,yt-.005,c,d,M['timber'])
 if hinge=='x0':
  prism(dn,x0-.06,x0,yt,yt+.82,z0+.04,z1-.04,M['wood']);[prism(dn,x0-.08,x0-.06,yt+hh,yt+hh+.06,z0+.06,z1-.2,M['iron']) for hh in (.15,.6)]
  prism(dn,x0-.1,x0-.06,yt+.4,yt+.46,(z0+z1)/2-.05,(z0+z1)/2+.05,M['iron'])
 else:
  prism(dn,x0+.04,x1-.04,yt,yt+.82,z0-.06,z0,M['wood']);[prism(dn,x0+.06,x1-.2,yt+hh,yt+hh+.06,z0-.08,z0-.06,M['iron']) for hh in (.15,.6)]
  prism(dn,(x0+x1)/2-.05,(x0+x1)/2+.05,yt+.4,yt+.46,z0-.1,z0-.06,M['iron'])
ladder(1,(.5,-2.3),(.5,-2.72),0,Y1,(1,0),H1,'x0')
ladder(2,(2.3,-.5),(2.55,-.5),Y1,Y2,(0,1),H2,'z0')
ladder(3,(-.5,2.25),(-.5,2.5),Y2,Y3,(1,0),H3,'x0')

# ---------------- gallery: corbel table, projecting deck, iron railing, fog bell ----------------
for k in range(8):
 for u in (-.85,0,.85):
  tbox('Lastlight_UpperGalleryCorbel',k,u-.14,u+.14,8.05,8.42,-.05,.42,M['sill'])
  tbox('Lastlight_UpperGalleryCorbel',k,u-.16,u+.16,8.42,8.75,-.05,.9,M['sill'])
lathe('Lastlight_UpperGalleryEdge',[(8.72,3.0),(8.72,4.0),(9.0,4.03),(9.0,3.0)],M['sill'])
RA=3.88;RV_=octo(RA)
for k in range(8):
 p=Vector(RV_[k]);q=Vector(RV_[(k+1)%8])
 for i in range(3):
  s=p.lerp(q,i/3);prism('Lastlight_UpperGalleryRail',s.x-.04,s.x+.04,Y3,Y3+1.08,s.y-.04,s.y+.04,M['iron'])
 cyl('Lastlight_UpperGalleryRail',(p.x,Y3+1.08,p.y),(p.x,Y3+1.16,p.y),.06,.03,M['iron'],6)
 for yy,wd in ((1.05,.07),(.58,.045),(.12,.04)):beam('Lastlight_UpperGalleryRail',(p.x,Y3+yy,p.y),(q.x,Y3+yy,q.y),wd,wd,M['iron'])
# fog bell hung outboard of the west rail on a gallows bracket
bx,bz=C.x-3.88,C.y-.6
beam('Lastlight_UpperGalleryBell',(bx,Y3+1.08,bz),(bx-.62,Y3+1.08,bz),.07,.07,M['iron']);beam('Lastlight_UpperGalleryBell',(bx,Y3+.55,bz),(bx-.5,Y3+1.05,bz),.05,.05,M['iron'])
cyl('Lastlight_UpperGalleryBell',(bx-.55,Y3+1.04,bz),(bx-.55,Y3+.62,bz),.1,.24,M['brass'],10);cyl('Lastlight_UpperGalleryBell',(bx-.55,Y3+.62,bz),(bx-.55,Y3+.57,bz),.25,.25,M['brass'],10)
cyl('Lastlight_UpperGalleryBell',(bx-.55,Y3+.62,bz),(bx-.55,Y3+.45,bz),.03,.05,M['iron'],6)
beam('Lastlight_UpperGalleryBell',(bx-.55,Y3+.5,bz),(bx-.2,Y3+.2,bz-.3),.02,.02,M['rope'])

# ---------------- lantern: stone dwarf wall, iron-framed glazing, red clay cap ----------------
lathe('Lastlight_UpperLanternBase',[(Y3,1.45),(Y3,1.76),(9.72,1.72),(9.72,1.45)],M['stone'])
lathe('Lastlight_UpperLanternBase',[(9.72,1.4),(9.72,1.84),(9.84,1.84),(9.84,1.4)],M['sill'])
GA=1.62
for k in range(8):
 mesh('Lastlight_GlazingLantern',[tq(k,u,v,GA+w) for w in (-.012,.012) for u,v in ((-GA*MT,9.84),(GA*MT,9.84),(GA*MT,11.3),(-GA*MT,11.3))],BOXF,M['glass'])
 vv=Vector(octo(GA+.02)[k]);prism('Lastlight_UpperLanternFrame',vv.x-.055,vv.x+.055,9.84,11.3,vv.y-.055,vv.y+.055,M['iron'])
 m_=C+N(k)*(GA+.02);prism('Lastlight_UpperLanternFrame',m_.x-.025,m_.x+.025,9.84,11.3,m_.y-.025,m_.y+.025,M['iron'])
lathe('Lastlight_UpperLanternFrame',[(10.55,1.58),(10.55,1.69),(10.61,1.69),(10.61,1.58)],M['iron'])
lathe('Lastlight_UpperLanternFrame',[(11.3,1.4),(11.3,1.76),(11.42,1.8),(11.42,1.4)],M['iron'])
# small iron service door in the east face of the lantern (closed), beside the lever
tbox_d=[tq(0,u,v,1.77+w) for w in (0,.04) for u,v in ((-.3,9.1),(.3,9.1),(.3,9.7),(-.3,9.7))];mesh('Lastlight_UpperLanternFrame',tbox_d,BOXF,M['iron'])
# the cap: boarded cone laid with clay tiles in courses, hip rolls, ventilator, ball finial and vane
EY,ER,AY=11.42,2.12,13.25;EV=octo(ER);APEX=(C.x,AY,C.y)
deck('Lastlight_RoofBoardLantern',[[(EV[k][0],EY,EV[k][1]),(EV[(k+1)%8][0],EY,EV[(k+1)%8][1]),APEX] for k in range(8)],.1,M['clay_d'])
lathe('Lastlight_RoofLanternEave',[(EY-.12,1.7),(EY-.12,ER+.02),(EY+.02,ER+.06),(EY+.02,1.7)],M['iron'])
rng=random.Random(121);TL=Layer('Lastlight_RoofTilesLantern',[M['clay'],M['clay_l'],M['clay_d']])
for k in range(8):
 A=(EV[k][0],EY,EV[k][1]);B=(EV[(k+1)%8][0],EY,EV[(k+1)%8][1]);lay(TL,A,B,APEX,APEX,5,.55,.03,.05,.03,rng)
 beam('Lastlight_RoofHipLantern',(EV[k][0],EY+.07,EV[k][1]),(C.x,AY+.05,C.y),.13,.1,M['clay_d'])
cyl('Lastlight_RoofVentilator',(C.x,AY-.15,C.y),(C.x,AY+.3,C.y),.26,.2,M['iron'],8)
cyl('Lastlight_RoofVentilator',(C.x,AY+.3,C.y),(C.x,AY+.42,C.y),.34,.3,M['iron'],8)
cyl('Lastlight_RoofVentilator',(C.x,AY+.42,C.y),(C.x,AY+.6,C.y),.26,.05,M['iron'],8)
cyl('Lastlight_RoofVentilator',(C.x,AY+.58,C.y),(C.x,AY+.72,C.y),.1,.14,M['brass'],8);cyl('Lastlight_RoofVentilator',(C.x,AY+.72,C.y),(C.x,AY+.86,C.y),.14,.08,M['brass'],8)
cyl('Lastlight_RoofVentilator',(C.x,AY+.86,C.y),(C.x,AY+1.45,C.y),.025,.015,M['iron'],6)
mesh('Lastlight_RoofVane',[(C.x-.42,AY+1.2,C.y),(C.x+.32,AY+1.2,C.y),(C.x+.32,AY+1.36,C.y),(C.x-.42,AY+1.36,C.y),(C.x-.42,AY+1.2,C.y+.015),(C.x+.32,AY+1.2,C.y+.015),(C.x+.32,AY+1.36,C.y+.015),(C.x-.42,AY+1.36,C.y+.015)],BOXF,M['iron'])
mesh('Lastlight_RoofVane',[(C.x+.32,AY+1.14,C.y),(C.x+.52,AY+1.28,C.y),(C.x+.32,AY+1.42,C.y),(C.x+.32,AY+1.14,C.y+.015),(C.x+.52,AY+1.28,C.y+.015),(C.x+.32,AY+1.42,C.y+.015)],[(0,1,2),(5,4,3),(0,3,4,1),(1,4,5,2),(2,5,3,0)],M['iron'])
for ang in (0,90):
 d=Vector((math.cos(math.radians(ang)),0,math.sin(math.radians(ang))))*.3
 beam('Lastlight_RoofVane',(C.x-d.x,AY+1.02,C.y-d.z),(C.x+d.x,AY+1.02,C.y+d.z),.02,.02,M['iron'])

# ---------------- keeper wing: stone walls, clay hip roof, storm porch ----------------
WT=.4;WP=2.85
WING={'W':(Seg((-5,-2.2),(-5,4.2),(-1,0)),[(1.7,3.7,0,2.3),(4.6,5.4,1.1,2.0)],(-.02,6.42)),
 'S':(Seg((-4.8,4),(-.8,4),(0,1)),[(.9,1.7,1.1,2.0)],(-.42,4.02)),
 'E':(Seg((-1,1.5),(-1,3.8),(1,0)),[(1.1,1.8,1.1,2.0)],(0,2.72)),
 'N':(Seg((-4.8,-2),(-2.2,-2),(0,-1)),[],(-.42,2.6))}
for side,(sg,holes,(fa,fb)) in WING.items():
 doors=[h for h in holes if h[2]==0]
 o=wall('Lastlight_ShellWing'+side,sg,0,sg.L,-.3,WP,holes,WT,M['stone'])
 f=facing('Lastlight_ShellWingFacing'+side,sg,fa,fb,.14,WP-.14,holes,WT,.37,(.62,1.1))
 pl=[]
 for a,b in ([(fa,doors[0][0]-.8),(doors[0][1]+.8,fb)] if doors else [(fa,fb)]):pl.append(sbox('Lastlight_ShellWingPlinth'+side,sg,a,b,-.45,.14,.12,.34,M['stone_d']))
 ev=sbox('Lastlight_ShellWingEaves'+side,sg,fa-.02,fb+.02,WP-.14,WP,-.22,.3,M['sill'])
 if side in 'EN':
  for q in [o,f,ev]+pl:clip_tower(q,3.25)
 for a,b,c,d in holes:
  if c==0:continue
  sbox('Lastlight_ShellWingSill',sg,a-.1,b+.1,c-.12,c,-.05,WT/2+.14,M['sill']);sbox('Lastlight_ShellWingLintel',sg,a-.14,b+.14,d,d+.2,-.05,WT/2+.08,M['sill'])
  for s in (a,b-.06):sbox('Lastlight_ShellWingFrame',sg,s,s+.06,c,d,-.06,.06,M['wood'])
  sbox('Lastlight_ShellWingFrame',sg,(a+b)/2-.03,(a+b)/2+.03,c,d,-.04,.04,M['wood']);sbox('Lastlight_ShellWingFrame',sg,a,b,(c+d)/2-.03,(c+d)/2+.03,-.04,.04,M['wood'])
  sbox('Lastlight_GlazingWing',sg,a,b,c,d,-.012,.012,M['glass'])
  for s0,s1 in ((a-.42,a-.04),(b+.04,b+.42)):
   sbox('Lastlight_ShellWingShutter',sg,s0,s1,c+.03,d-.03,WT/2+.2,WT/2+.24,M['wood'])
   for vv in (c+.15,d-.23):sbox('Lastlight_ShellWingShutter',sg,s0+.03,s1-.03,vv,vv+.08,WT/2+.24,WT/2+.27,M['timber'])
# storm door frame (heavy oak posts, sandstone lintel) and the open outward storm leaves (service: door)
sg=WING['W'][0]
for s0,s1 in ((1.6,1.7),(3.7,3.8)):sbox('Lastlight_ShellWingDoorFrame',sg,s0,s1,0,2.3,-.19,.24,M['timber'])
sbox('Lastlight_ShellWingDoorFrame',sg,1.5,3.9,2.3,2.58,-.19,.26,M['sill'])
dv=[]
for z0,z1 in ((-.58,-.51),(1.51,1.58)):
 dv.append(prism('Lastlight_ServiceDoor_Storm',-6.2,-5.24,.02,2.26,z0,z1,M['wood']))
 out=z0 if z0<0 else z1
 for yy in (.35,1.1,1.85):dv.append(prism('Lastlight_ServiceDoor_Storm',-6.15,-5.28,yy,yy+.12,min(out,out+(-.025 if z0<0 else .025)),max(out,out+(-.025 if z0<0 else .025)),M['iron']))
 dv.append(beam('Lastlight_ServiceDoor_Storm',(-6.1,.45,(z0+z1)/2),(-5.35,1.8,(z0+z1)/2),.1,.075,M['timber']))
 for yy in (.4,1.9):dv.append(prism('Lastlight_ServiceDoor_Storm',-5.26,-5.2,yy,yy+.14,z0-.03,z1+.03,M['iron']))
dv.append(ring('Lastlight_ServiceDoor_Storm',(-6.0,1.15,-.61),(0,0,1),.08,.02,.02,M['iron'],8))
join(dv,'Lastlight_ServiceDoor_Storm')
# storm porch: low stone cheeks, oak posts, gabled clay roof with a framed plaster gable
for z0,z1 in ((-.95,-.6),(1.6,1.95)):
 prism('Lastlight_ShellPorch',-6.45,-5.2,-.35,1.0,z0,z1,M['stone']);prism('Lastlight_ShellPorch',-6.52,-5.2,1.0,1.1,z0-.04,z1+.04,M['sill'])
 facing('Lastlight_ShellPorchFacing',Seg((-5.2,z0 if z0<0 else z1),(-6.45,z0 if z0<0 else z1),(0,-1 if z0<0 else 1)),0,1.25,-.28,1.0,[],0.,.33,(.4,.7))
 prism('Lastlight_ShellPorch',-6.4,-6.22,1.1,2.32,(z0+z1)/2-.09,(z0+z1)/2+.09,M['timber'])
 beam('Lastlight_ShellPorch',(-6.31,1.8,(z0+z1)/2),(-5.85,2.3,(z0+z1)/2),.1,.1,M['timber'])
prism('Lastlight_ShellPorch',-6.45,-5.2,2.3,2.44,-.95,1.95,M['timber'])        # wall plate across the cheeks
for zz in (-.9,1.9):prism('Lastlight_ShellPorch',-6.6,-5.1,2.32,2.44,zz-.07,zz+.07,M['timber'])
prism('Lastlight_FloorPorch',-6.45,-4.78,-.3,0,-.6,1.6,M['sill'])
prism('Lastlight_StepPorch',-6.95,-6.45,-.45,-.15,-.5,1.5,M['sill'])
PR_E,PR_Y,PR_Z=2.36,3.3,.5
pr=[]
for ze in (-1.2,2.2):
 A=(-6.72,PR_E,ze);B=(-5.0,PR_E,ze);C_=(-5.0,PR_Y,PR_Z);D=(-6.72,PR_Y,PR_Z)
 if ze>0:A,B,C_,D=B,A,D,C_
 pr.append(deck('Lastlight_RoofBoardPorch',[[A,B,C_,D]],.1,M['clay_d']))
 PL=Layer('Lastlight_RoofTilesPorch',[M['clay'],M['clay_l'],M['clay_d']]);lay(PL,A,B,C_,D,5,.5,.03,.05,.02,random.Random(ze));pr.append(PL.build())
 beam('Lastlight_RoofPorchBarge',(-6.75,PR_E-.05,ze),(-6.75,PR_Y+.03,PR_Z),.09,.22,M['wood'])
beam('Lastlight_RoofPorchRidge',(-6.74,PR_Y+.09,PR_Z),(-5.0,PR_Y+.09,PR_Z),.18,.14,M['clay_d'])
gs=Seg((-6.45,-.95),(-6.45,1.95),(-1,0))
mesh('Lastlight_RoofPorchGable',[gs.p(.05,2.44,-.06),gs.p(2.85,2.44,-.06),gs.p(1.45,PR_Y-.08,-.06),gs.p(.05,2.44,.06),gs.p(2.85,2.44,.06),gs.p(1.45,PR_Y-.08,.06)],[(0,1,2),(5,4,3),(0,3,4,1),(1,4,5,2),(2,5,3,0)],M['plaster'])
beam('Lastlight_RoofPorchGable',gs.p(1.45,2.44,.09),gs.p(1.45,PR_Y-.12,.09),.12,.06,M['timber'])
for u in (.75,2.15):beam('Lastlight_RoofPorchGable',gs.p(u,2.44,.09),gs.p(1.45+(u-1.45)*.35,2.44+(PR_Y-2.44)*.65-.1,.09),.1,.06,M['timber'])
# the hip roof: eave 2.85 all round, ridge north-south, clipped where it meets the beacon
XA,XB,ZA,ZB,EYW,RY,RXX=-5.45,-.55,-2.45,4.45,2.85,4.9,-3.0
RN=(RXX,RY,ZA+2.45);RS=(RXX,RY,ZB-2.45)
NW,NE,SE,SW=(XA,EYW,ZA),(XB,EYW,ZA),(XB,EYW,ZB),(XA,EYW,ZB)
faces_w=[('W',SW,NW,RN,RS),('E',NE,SE,RS,RN),('N',NW,NE,RN,RN),('S',SE,SW,RS,RS)]
wroof=[deck('Lastlight_RoofBoardWing',[[a,b,c,d] if c!=d else [a,b,c] for _,a,b,c,d in faces_w],.12,M['clay_d'])]
def under_porch(p):return p.x<-5.0 and -1.1<p.z<2.1 and p.y<PR_Y+.1
def at_chimney(p):return -4.55<p.x<-3.25 and p.z<-1.9
WL=Layer('Lastlight_RoofTilesWing',[M['clay'],M['clay_l'],M['clay_d']]);trng=random.Random(26)
for side,a,b,c,d in faces_w:lay(WL,a,b,c,d,8,.74,.03,.05,.025,trng,(lambda p:under_porch(p) or at_chimney(p)))
wroof.append(WL.build())
wroof.append(beam('Lastlight_RoofRidgeWing',(RN[0],RN[1]+.1,RN[2]),(RS[0],RS[1]+.1,RS[2]),.24,.2,M['clay_d']))
for e,r in ((NW,RN),(NE,RN),(SE,RS),(SW,RS)):wroof.append(beam('Lastlight_RoofHipWing',(e[0],e[1]+.08,e[2]),(r[0],r[1]+.1,r[2]),.2,.16,M['clay_d']))
for a,b in ((NW,NE),(NE,SE),(SE,SW),(SW,NW)):wroof.append(beam('Lastlight_RoofFasciaWing',(a[0],a[1]-.05,a[2]),(b[0],b[1]-.05,b[2]),.14,.2,M['wood']))
wroof.append(cyl('Lastlight_RoofFinialWing',(RS[0],RS[1]+.15,RS[2]),(RS[0],RS[1]+.7,RS[2]),.08,.02,M['wood'],6))
for o in wroof:clip_tower(o,3.2)
for z in (-.9,1.4,3.3):prism('Lastlight_RoofTrussWing',-4.8,-1.2 if z>1.9 else -2.3,2.72,2.9,z-.09,z+.09,M['timber'])
for o in [o for o in bpy.data.objects if o.name.startswith('Lastlight_RoofTrussWing')]:clip_tower(o,3.0)
prism('Lastlight_RoofTrussWing',RXX-.08,RXX+.08,2.9,RY-.12,1.31,1.49,M['timber'])
# forge chimney on the north wall: stepped fieldstone stack with clay pots
prism('Lastlight_RoofChimney',-4.5,-3.3,-.45,2.1,-2.75,-2.2,M['stone']);beam('Lastlight_RoofChimney',(-4.5,2.1,-2.47),(-4.3,2.45,-2.47),.62,.12,M['sill'])
beam('Lastlight_RoofChimney',(-3.3,2.1,-2.47),(-3.5,2.45,-2.47),.62,.12,M['sill'])
prism('Lastlight_RoofChimney',-4.3,-3.5,2.1,5.55,-2.68,-2.2,M['stone']);prism('Lastlight_RoofChimney',-4.4,-3.4,5.55,5.72,-2.78,-2.1,M['sill'])
facing('Lastlight_RoofChimneyFacing',Seg((-4.3,-2.44),(-3.5,-2.44),(0,-1)),-.03,.83,2.1,5.55,[],.48,.39,(.3,.5))
facing('Lastlight_RoofChimneyFacing',Seg((-4.5,-2.475),(-3.3,-2.475),(0,-1)),-.03,1.23,.14,2.1,[],.55,.35,(.4,.7))
for x in (-4.1,-3.7):cyl('Lastlight_RoofChimney',(x,5.7,-2.44),(x,6.12,-2.44),.13,.11,M['clay'])
# floors of the wing
wf=poly_slab('Lastlight_FloorWing',[(-4.8,-1.8),(-1.2,-1.8),(-1.2,3.8),(-4.8,3.8)],0,.3,[],M['sill']);clip_tower(wf,3.05)

# ---------------- furnishings ----------------
frng=random.Random(7)
def barrel(nm,x,y,z,h=.8,r=.3):
 cyl(nm,(x,y,z),(x,y+h*.5,z),r*.88,r,M['wood'],8);cyl(nm,(x,y+h*.5,z),(x,y+h,z),r,r*.88,M['wood'],8)
 for f in (.15,.85):rr=r*(.9+.08*(1-abs(f-.5)*2))+.012;cyl(nm,(x,y+h*f-.03,z),(x,y+h*f+.03,z),rr,rr,M['iron'],8)
def coil(nm,x,y,z,r=.3,turns=3):
 for i in range(turns):ring(nm,(x,y+.04+i*.06,z),(0,1,0),r-i*.035,.07,.06,M['rope'],8)
def crate(nm,x0,x1,y0,y1,z0,z1):
 prism(nm,x0,x1,y0,y1,z0,z1,M['wood'])
 for zz in (z0-.012,z1):prism(nm,x0+.03,x1-.03,y0+.03,y0+.09,zz,zz+.012,M['timber']);prism(nm,x0+.03,x1-.03,y1-.09,y1-.03,zz,zz+.012,M['timber'])
# ground floor (storm store): oil casks on a cradle (east), net rack and spare wicks (south), crates, rope, lens case
F0='Lastlight_Furnishing'
for b in (-.75,0,.75):
 x,z=W(2.5,b);cyl(F0,(x-.35,.62,z),(x+.35,.62,z),.3,.3,M['wood'],8)
 for dx in (-.25,.25):cyl(F0,(x+dx-.03,.62,z),(x+dx+.03,.62,z),.315,.315,M['iron'],8)
 cyl(F0,(x-.4,.62,z),(x-.47,.62,z),.05,.04,M['brass'],6)
x,z=W(2.5,0);prism(F0,x-.35,x+.35,0,.3,z-1.1,z-1.0,M['timber']);prism(F0,x-.35,x+.35,0,.3,z+1.0,z+1.1,M['timber']);prism(F0,x-.3,x+.3,.26,.34,z-1.1,z+1.1,M['timber'])
x,z=W(0,2.55);prism(F0,x-1.0,x+1.0,1.55,1.61,z-.3,z+.3,M['wood']);prism(F0,x-1.0,x+1.0,.45,.5,z-.3,z+.3,M['wood'])
for dx in (-.95,.9):prism(F0,x+dx,x+dx+.05,0,1.61,z-.3,z+.3,M['wood'])
for i in range(7):
 xx=x-.8+i*.26;beam(F0,(xx,1.55,z+.18),(xx+.06,.55,z+.22+frng.uniform(-.03,.03)),.16,.02,M['rope'])
barrel(F0,W(-1.8,1.8)[0],0,W(-1.8,1.8)[1]);barrel(F0,W(-2.05,1.3)[0],0,W(-2.05,1.3)[1],.7,.26)
coil(F0,W(1.75,1.75)[0],0,W(1.75,1.75)[1],.34,4)
xc,zc=W(1.75,-1.75);crate(F0,xc-.3,xc+.3,0,.6,zc-.3,zc+.3);crate(F0,xc-.22,xc+.22,.6,1.02,zc-.2,zc+.2)
xc,zc=W(-1.7,-1.7);crate(F0,xc-.3,xc+.3,0,.5,zc-.3,zc+.3)
prism(F0,xc-.25,xc+.25,.5,.72,zc-.2,zc+.2,M['brass']);prism(F0,xc-.2,xc+.2,.72,.76,zc-.15,zc+.15,M['glass'])
cyl(F0,(C.x,Y1-.4,C.y),(C.x,Y1-.95,C.y),.012,.012,M['iron'],4);cyl(F0,(C.x,Y1-.95,C.y),(C.x,Y1-1.25,C.y),.1,.14,M['iron'],6)
cyl(F0,(C.x,Y1-1.22,C.y),(C.x,Y1-1.1,C.y),.09,.09,M['flame'],6)
# keeper's room: box bed with red blanket (south), table and stool (west), sea chest (NE), stove (SW), shelf, barometer
F1='Lastlight_UpperFurnishingKeeper';y=Y1
x0,x1=C.x-1.0,C.x+1.0;z0,z1=C.y+1.95,C.y+2.72
prism(F1,x0,x1,y,y+.42,z0,z1,M['wood']);prism(F1,x0+.05,x1-.3,y+.42,y+.56,z0+.04,z1-.04,M['cloth'])
prism(F1,x1-.32,x1-.06,y+.42,y+.58,z0+.12,z1-.12,M['plaster']);prism(F1,x1-.06,x1,y,y+1.0,z0,z1,M['wood']);prism(F1,x0,x0+.06,y,y+.7,z0,z1,M['wood'])
for i in range(3):prism(F1,x0+.2+i*.55,x0+.26+i*.55,y+.56,y+.565,z0+.04,z1-.04,M['brass'])
x,z=W(-2.25,0);prism(F1,x-.33,x+.33,y+.74,y+.8,z-.6,z+.6,M['wood'])
for dx,dz in ((-.28,-.55),(.28,-.55),(-.28,.55),(.28,.55)):prism(F1,x+dx-.035,x+dx+.035,y,y+.74,z+dz-.035,z+dz+.035,M['wood'])
prism(F1,x-.2,x+.05,y+.8,y+.82,z-.35,z-.05,M['plaster']);cyl(F1,(x+.1,y+.8,z+.3),(x+.1,y+.92,z+.3),.05,.04,M['clay'],6)
cyl(F1,(x-.05,y+.8,z+.05),(x-.05,y+.95,z+.05),.04,.04,M['brass'],6);cyl(F1,(x-.05,y+.95,z+.05),(x-.05,y+1.02,z+.05),.025,.02,M['flame'],6)
xc,zc=W(2.52,.71);prism(F1,xc-.23,xc+.23,y,y+.48,zc-.4,zc+.4,M['wood']);prism(F1,xc-.25,xc+.25,y+.48,y+.56,zc-.42,zc+.42,M['timber'])
for dz in (-.28,.28):prism(F1,xc-.26,xc+.26,y,y+.57,zc+dz-.03,zc+dz+.03,M['iron'])
xs,zs=W(-1.65,1.65);cyl(F1,(xs,y,zs),(xs,y+.7,zs),.3,.28,M['iron'],8);cyl(F1,(xs,y+.7,zs),(xs,y+.78,zs),.32,.32,M['iron'],8)
cyl(F1,(xs,y+.78,zs),(xs,y+1.8,zs),.07,.07,M['iron'],6);beam(F1,(xs,y+1.8,zs),(xs-.6,y+2.1,zs+.6),.12,.12,M['iron'])
cyl(F1,(xs+.1,y+.84,zs),(xs+.1,y+1.0,zs),.1,.07,M['brass'],6)
ibox(F1,5,-.9,.9,y+1.5,y+1.55,0,.3,AI[1],M['wood'])
for i in range(5):ibox(F1,5,-.8+i*.35,-.62+i*.35,y+1.55,y+1.55+frng.uniform(.14,.28),.04,.24,AI[1],frng.choice([M['clay'],M['brass'],M['cloth'],M['wood']]))
for s in (-.8,.8):ibox(F1,5,s-.03,s+.03,y+1.3,y+1.5,0,.26,AI[1],M['timber'])
ibox(F1,1,-.2,.2,y+1.2,y+1.75,0,.05,AI[1],M['wood']);ibox(F1,1,-.13,.13,y+1.3,y+1.64,.05,.07,AI[1],M['plaster'])
ibox(F1,6,-1.0,-.35,y+1.3,y+1.9,0,.03,AI[1],M['plaster'])
# watch room: log desk (north), oil tank on its cradle (west), wick cabinet (NE), oil cans
F2='Lastlight_UpperFurnishingWatch';y=Y2
x,z=W(0,-2.25);prism(F2,x-.8,x+.8,y+.76,y+.82,z-.32,z+.3,M['wood'])
for dx in (-.74,.74):prism(F2,x+dx-.05,x+dx+.05,y,y+.76,z-.3,z+.28,M['wood'])
prism(F2,x-.5,x-.05,y+.82,y+.86,z-.2,z+.1,M['plaster']);prism(F2,x-.5,x-.27,y+.86,y+.87,z-.2,z+.1,M['cloth'])
cyl(F2,(x+.3,y+.86,z),(x+.62,y+.9,z-.1),.035,.05,M['brass'],6);cyl(F2,(x+.1,y+.82,z+.1),(x+.1,y+.95,z+.1),.06,.05,M['brass'],6)
x,z=W(-2.2,0);cyl(F2,(x,y+.75,z-.85),(x,y+.75,z+.85),.38,.38,M['brass'],10)
for dz in (-.6,.6):prism(F2,x-.3,x+.3,y,y+.5,z+dz-.06,z+dz+.06,M['timber'])
cyl(F2,(x,y+1.13,z),(x,y+1.28,z),.07,.07,M['iron'],6);cyl(F2,(x+.3,y+.5,z+.9),(x+.45,y+.3,z+.9),.03,.03,M['iron'],6)
xc,zc=W(1.6,-1.6);prism(F2,xc-.25,xc+.25,y,y+1.4,zc-.2,zc+.2,M['wood']);prism(F2,xc-.23,xc+.23,y+.7,y+.73,zc-.21,zc+.21,M['timber'])
for i,(dx,dz) in enumerate(((-.1,.05),(.12,.1),(.02,-.12))):xo,zo=W(-1.6+dx,1.6+dz);cyl(F2,(xo,y,zo),(xo,y+.34,zo),.11,.1,M['iron'] if i%2 else M['clay'],6)

# ---------------- repair stores in the keeper wing: forge hearth (north), stores (south, service), rack ----------------
FW='Lastlight_Furnishing'
prism(FW,-4.45,-3.35,0,.7,-1.8,-1.3,M['stone']);prism(FW,-4.5,-3.3,.7,.82,-1.82,-1.25,M['sill']);prism(FW,-4.2,-3.6,.82,.9,-1.7,-1.4,M['iron'])
prism(FW,-4.1,-3.7,.84,.92,-1.65,-1.45,M['flame'])
mesh(FW,[(-4.45,1.3,-1.8),(-3.35,1.3,-1.8),(-3.6,2.3,-1.8),(-4.2,2.3,-1.8),(-4.45,1.3,-1.35),(-3.35,1.3,-1.35),(-3.6,2.3,-1.7),(-4.2,2.3,-1.7)],BOXF,M['stone_d'])
cyl(FW,(-3.0,0,-1.55),(-3.0,.55,-1.55),.18,.14,M['wood'],6);prism(FW,-3.2,-2.8,.55,.78,-1.65,-1.45,M['iron'])
beam(FW,(-3.05,.78,-1.55),(-2.75,.8,-1.55),.1,.08,M['iron'])
barrel(FW,-4.45,0,2.3,.9,.28)
sv=[]
S='Lastlight_ServiceStores_Workbench'
sv.append(prism(S,-4.6,-2.4,.82,.9,3.2,3.78,M['wood']))
for x in (-4.52,-2.48):
 for z in (3.26,3.72):sv.append(prism(S,x-.05,x+.05,0,.82,z-.05,z+.05,M['wood']))
sv.append(prism(S,-4.55,-2.45,.2,.25,3.25,3.75,M['wood']))
sv.append(prism(S,-4.55,-2.45,1.25,2.2,3.76,3.8,M['timber']))
for i,xx in enumerate((-4.35,-4.05,-3.75,-3.45,-3.15)):
 sv.append(prism(S,xx-.02,xx+.02,1.4,1.95,3.72,3.76,M['iron' if i%2 else 'wood']))
 sv.append(prism(S,xx-.06,xx+.06,1.85 if i%2 else 1.4,1.95 if i%2 else 1.5,3.7,3.76,M['iron']))
sv.append(prism(S,-2.9,-2.6,.9,1.05,3.3,3.5,M['iron']));sv.append(beam(S,(-2.75,1.05,3.25),(-2.75,1.05,3.6),.05,.05,M['iron']))
sv.append(prism(S,-4.4,-3.9,.9,1.2,3.35,3.65,M['glass']));sv.append(prism(S,-4.45,-3.85,.9,.95,3.3,3.7,M['wood']))
sv.append(cyl(S,(-3.5,.9,3.45),(-3.5,1.05,3.45),.1,.08,M['brass'],6));sv.append(cyl(S,(-3.3,.9,3.5),(-3.3,1.0,3.5),.06,.06,M['iron'],6))
for xx,zz in ((-2.0,3.5),(-2.0,2.95),(-1.5,3.5)):sv.append(prism(S,xx-.22,xx+.22,0,.45,zz-.2,zz+.2,M['wood']))
sv.append(prism(S,-1.72,-1.28,.45,.9,3.3,3.7,M['wood']))
for i in range(4):sv.append(prism(S,-1.68+i*.1,-1.62+i*.1,.45,.85,3.35,3.65,M['glass']))
for xx,zz in ((-2.1,2.9),(-1.95,2.95)):sv.append(cyl(S,(xx,.45,zz),(xx,.68,zz),.07,.06,M['iron'],6))
sv.append(prism(S,-1.2,-1.12,1.2,2.0,2.2,3.7,M['timber']))
for yy in (1.3,1.7):sv.append(prism(S,-1.45,-1.12,yy,yy+.04,2.2,3.7,M['wood']))
join(sv,S)
coil('Lastlight_Furnishing',-4.35,0,-.95,.3,3)

# ---------------- lamp (service: beacon) and lever (service: lever) ----------------
bv=[];B_='Lastlight_ServiceBeacon_Lamp'
bv.append(cyl(B_,(C.x,Y3,C.y),(C.x,Y3+.1,C.y),.46,.42,M['iron'],8));bv.append(cyl(B_,(C.x,Y3+.1,C.y),(C.x,9.95,C.y),.14,.1,M['iron'],8))
bv.append(cyl(B_,(C.x,9.95,C.y),(C.x,10.05,C.y),.52,.52,M['brass'],10))
for y0,y1,r0,r1 in ((10.05,10.3,.42,.5),(10.3,10.75,.5,.5),(10.75,11.0,.5,.4)):bv.append(cyl(B_,(C.x,y0,C.y),(C.x,y1,C.y),r0,r1,M['glass'],10))
for yy in (10.3,10.52,10.75):bv.append(ring(B_,(C.x,yy,C.y),(0,1,0),.51,.03,.03,M['brass'],10))
bv.append(cyl(B_,(C.x,10.2,C.y),(C.x,10.8,C.y),.16,.1,M['flame'],8));bv.append(cyl(B_,(C.x,11.0,C.y),(C.x,11.15,C.y),.3,.1,M['brass'],10))
for i in range(4):
 a=math.radians(45+90*i);bv.append(beam(B_,(C.x+math.cos(a)*.5,10.05,C.y+math.sin(a)*.5),(C.x+math.cos(a)*.4,11.02,C.y+math.sin(a)*.4),.03,.03,M['brass']))
join(bv,B_)
lv=[];L_='Lastlight_ServiceLever_Deck';lx,lz=W(1.98,-.5)
lv.append(prism(L_,lx-.2,lx+.2,Y3,Y3+.12,lz-.24,lz+.24,M['sill']))
lv.append(prism(L_,lx-.08,lx+.08,Y3+.12,Y3+.95,lz-.08,lz+.08,M['iron']))
lv.append(mesh(L_,[(lx-.02,Y3+.95,lz-.34),(lx-.02,Y3+.95,lz+.34),(lx-.02,Y3+1.3,lz+.2),(lx-.02,Y3+1.3,lz-.2),(lx+.02,Y3+.95,lz-.34),(lx+.02,Y3+.95,lz+.34),(lx+.02,Y3+1.3,lz+.2),(lx+.02,Y3+1.3,lz-.2)],BOXF,M['brass']))
for dz in (-.28,-.1,.1,.28):lv.append(prism(L_,lx+.02,lx+.04,Y3+1.02,Y3+1.2,lz+dz-.02,lz+dz+.02,M['iron']))
lv.append(beam(L_,(lx,Y3+.95,lz),(lx+.14,Y3+1.52,lz-.18),.05,.05,M['iron']));lv.append(cyl(L_,(lx+.14,Y3+1.5,lz-.18),(lx+.16,Y3+1.66,lz-.2),.045,.045,M['wood'],6))
lv.append(beam(L_,(lx-.08,Y3+.5,lz),(C.x+1.7,Y3+.5,lz),.05,.05,M['iron']))
join(lv,L_)
# wall lantern at the storm porch (lit), rain butt, lobster pots and crates by the approach
g=0
beam('Lastlight_ShellWingLamp',(-5.2,2.0,-1.2),(-5.55,2.05,-1.2),.05,.05,M['iron'])
prism('Lastlight_ShellWingLamp',-5.68,-5.42,1.62,1.95,-1.33,-1.07,M['iron']);prism('Lastlight_ShellWingLamp',-5.65,-5.45,1.65,1.92,-1.3,-1.1,M['flame'])
cyl('Lastlight_ShellWingLamp',(-5.55,1.95,-1.2),(-5.55,2.08,-1.2),.18,.03,M['iron'],4)
barrel('Lastlight_Yard',-.45,ground(-.45,4.5),4.55,.95,.33)
beam('Lastlight_Yard',(-.8,2.6,4.25),(-.5,2.2,4.45),.07,.07,M['iron'])
for i,(x,z) in enumerate(((-5.9,-1.75),(-6.35,-1.45),(-6.1,-2.3))):
 gy=ground(x,z)
 if i<2:crate('Lastlight_Yard',x-.3,x+.3,gy,gy+.5,z-.25,z+.25)
 else:
  cyl('Lastlight_Yard',(x-.35,gy+.28,z),(x+.35,gy+.28,z),.28,.28,M['wood'],8)
  for dx in (-.3,0,.3):cyl('Lastlight_Yard',(x+dx-.015,gy+.28,z),(x+dx+.015,gy+.28,z),.29,.29,M['rope'],8)
coil('Lastlight_Yard',-6.1,ground(-6.1,-1.6)+.5,-1.6,.22,3)
for x,z in ((-5.7,4.6),(-4.9,4.75)):
 gy=ground(x,z);crate('Lastlight_Yard',x-.28,x+.28,gy,gy+.45,z-.25,z+.25)

# ---------------- finish: apply modifiers, fix normals, batch by name ----------------
for o in [o for o in bpy.context.scene.objects if o.type=='MESH']:
 bpy.context.view_layer.objects.active=o
 for m in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=m.name)
 fix(o)
GROUPS=[('Lastlight_ServiceDoor_','Lastlight_ServiceDoor_Storm'),('Lastlight_ServiceStores_','Lastlight_ServiceStores_Workbench'),
 ('Lastlight_ServiceBeacon_','Lastlight_ServiceBeacon_Lamp'),('Lastlight_ServiceLever_','Lastlight_ServiceLever_Deck')]
for n in (1,2,3):GROUPS+=[('Lastlight_ServiceLadder%dUp_'%n,'Lastlight_ServiceLadder%dUp_Ladder'%n),('Lastlight_ServiceLadder%dDown_'%n,'Lastlight_ServiceLadder%dDown_Hatch'%n)]
GROUPS+=[('Lastlight_FloorTower','Lastlight_FloorTower'),('Lastlight_FloorWing','Lastlight_FloorWing'),('Lastlight_FloorPorch','Lastlight_FloorPorch'),('Lastlight_StepPorch','Lastlight_StepPorch'),
 ('Lastlight_UpperFloorKeeper','Lastlight_UpperFloorKeeper'),('Lastlight_UpperFloorWatch','Lastlight_UpperFloorWatch'),('Lastlight_UpperFloorGallery','Lastlight_UpperFloorGallery'),
 ('Lastlight_UpperShellKeeper','Lastlight_UpperShellKeeper'),('Lastlight_UpperShellWatch','Lastlight_UpperShellWatch'),('Lastlight_UpperShellString','Lastlight_UpperShellString'),
 ('Lastlight_UpperJoistKeeper','Lastlight_UpperJoistKeeper'),('Lastlight_UpperJoistWatch','Lastlight_UpperJoistWatch'),('Lastlight_UpperJoistDeck','Lastlight_UpperJoistDeck'),
 ('Lastlight_UpperFurnishingKeeper','Lastlight_UpperFurnishingKeeper'),('Lastlight_UpperFurnishingWatch','Lastlight_UpperFurnishingWatch'),
 ('Lastlight_UpperGallery','Lastlight_UpperGallery'),('Lastlight_UpperLantern','Lastlight_UpperLantern'),
 ('Lastlight_GlazingLantern','Lastlight_GlazingLantern'),('Lastlight_GlazingKeeper','Lastlight_GlazingKeeper'),('Lastlight_GlazingWatch','Lastlight_GlazingWatch'),('Lastlight_GlazingWing','Lastlight_GlazingWing'),
 ('Lastlight_ShellTower','Lastlight_ShellTower'),('Lastlight_ShellPlinth','Lastlight_ShellPlinth'),('Lastlight_ShellDoor','Lastlight_ShellTowerDoorway'),
 ('Lastlight_ShellWing','Lastlight_ShellWing'),('Lastlight_ShellPorch','Lastlight_ShellPorch'),
 ('Lastlight_RoofTilesLantern','Lastlight_RoofLanternTiles'),('Lastlight_Roof','Lastlight_Roof'),('Lastlight_Furnishing','Lastlight_Furnishing'),('Lastlight_Yard','Lastlight_Yard')]
finals=set()
for pre,final in GROUPS:
 parts=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith(pre) and o.name not in finals]
 if not parts:continue
 finals.add(join(parts,final).name)
left=[o.name for o in bpy.context.scene.objects if o.type=='MESH' and o.name not in finals]
assert not left,left
bpy.context.view_layer.update()
model=OUT/'lastlight'
bpy.ops.wm.save_as_mainfile(filepath=str(model.with_suffix('.blend')))
bpy.ops.export_scene.gltf(filepath=str(model.with_suffix('.glb')),export_format='GLB',export_yup=True)
ms=[o for o in bpy.context.scene.objects if o.type=='MESH']
corners=[o.matrix_world@Vector(c) for o in ms for c in o.bound_box]
dims=[max(v[i] for v in corners)-min(v[i] for v in corners) for i in range(3)]
tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in ms)
mats=sorted({s.material.name for o in ms for s in o.material_slots if s.material})
report={'id':'lastlight','prefix':'Lastlight_','triangles':tris,'materials':len(mats),'materialNames':mats,'dimensionsTiles':{'x':round(dims[0],2),'z':round(dims[1],2),'y':round(dims[2],2)},
 'measuredPadY':round(PAD,3),'padMaxY':round(PADMAX,3),'groundFloorLift':LIFT,'placement':{'x':PX,'y':round(PY,3),'z':PZ},
 'meshes':{o.name:sum(len(p.vertices)-2 for p in o.data.polygons) for o in ms}}
(PROOF/'asset_report.json').write_text(json.dumps(report,indent=2))
print('[LASTLIGHT_V1] tris',tris,'materials',len(mats),'dims',[round(d,2) for d in dims],'pad',round(PAD,3),'meshes',len(ms))

# ---------------- proof renders (workbench, studio light, material colours); context terrain is render-only ----------------
sc=bpy.context.scene;sc.world=bpy.data.worlds.new('ProofSky');sc.world.color=(.52,.60,.68);sc.render.engine='BLENDER_WORKBENCH';sc.display.shading.light='STUDIO';sc.display.shading.color_type='MATERIAL'
sc.display.shading.show_shadows=True;sc.display.shading.show_cavity=True;sc.render.resolution_x=900;sc.render.resolution_y=700
V=[];F=[];x0,x1,z0,z1=-13,12,-12,13
for z in range(z0,z1+1):
 for x in range(x0,x1+1):V.append((x,-z,TER['heights'][(z+PZ)*(TWID+1)+x+PX]-PY-.01))
nn=x1-x0+1
for j in range(z1-z0):
 for i in range(x1-x0):F.append((j*nn+i,j*nn+i+1,(j+1)*nn+i+1,(j+1)*nn+i))
me=bpy.data.meshes.new('ContextTerrain');me.from_pydata(V,[],F);gobj=bpy.data.objects.new('ContextTerrain',me);sc.collection.objects.link(gobj)
gm=bpy.data.materials.new('ctx grass');gm.diffuse_color=(.40,.47,.27,1);me.materials.append(gm)
cam=bpy.data.objects.new('ProofCam',bpy.data.cameras.new('ProofCam'));sc.collection.objects.link(cam);sc.camera=cam;cam.data.lens=35
def look(name,eye,target,hide=()):
 for o in sc.objects:
  if o.type=='MESH':o.hide_render=any(o.name.startswith(h) for h in hide)
 e=Vector((eye[0],-eye[2],eye[1]));t=Vector((target[0],-target[2],target[1]))
 cam.location=e;cam.rotation_euler=(t-e).to_track_quat('-Z','Y').to_euler()
 sc.render.filepath=str(PROOF/('view_'+name+'.png'));bpy.ops.render.render(write_still=True)
UP_ALL=('Lastlight_Roof','Lastlight_Upper','Lastlight_Glazing','Lastlight_ServiceLadder1Down','Lastlight_ServiceLadder2','Lastlight_ServiceLadder3','Lastlight_ServiceLever','Lastlight_ServiceBeacon')
UP_KEEP=('Lastlight_Roof','Lastlight_GlazingWatch','Lastlight_GlazingLantern','Lastlight_UpperShellWatch','Lastlight_UpperFloorWatch','Lastlight_UpperFloorGallery','Lastlight_UpperFurnishingWatch','Lastlight_UpperJoistWatch','Lastlight_UpperJoistDeck',
 'Lastlight_UpperGallery','Lastlight_UpperLantern','Lastlight_ServiceLadder2Down','Lastlight_ServiceLadder3','Lastlight_ServiceLever','Lastlight_ServiceBeacon')
UP_WATCH=('Lastlight_Roof','Lastlight_Glazing','Lastlight_UpperShellWatch','Lastlight_UpperFloorGallery','Lastlight_UpperJoistDeck','Lastlight_UpperGallery','Lastlight_UpperLantern','Lastlight_ServiceLadder3Down','Lastlight_ServiceLever','Lastlight_ServiceBeacon')
views=[('front_sw',(-16,12,15),(-1,4.5,0),()),('back_ne',(17,15,-16),(1,5.5,-1),()),('side_south',(0,7,24),(-.5,6,0),()),('top',(-.5,30,5),(-.5,0,0),()),
 ('cutaway_ground',(3,17,11),(-1.5,0,.6),UP_ALL),('cutaway_keeper',(7,20,8),(.5,3,-1),UP_KEEP),('cutaway_watch',(-7,19,9),(1,6,-1),UP_WATCH),('deck_close',(9,14,6),(1,9.5,-1),())]
for v in views:look(*v)
tiles=[]
for v in ['front_sw','back_ne','side_south','top','cutaway_ground','cutaway_keeper']:
 im=bpy.data.images.load(str(PROOF/('view_'+v+'.png')));tiles.append(np.array(im.pixels[:],dtype=np.float32).reshape(im.size[1],im.size[0],4))
h,w=tiles[0].shape[:2];sheet=np.zeros((h*2,w*3,4),dtype=np.float32)
for i,a in enumerate(tiles):r,c=divmod(i,3);sheet[(1-r)*h:(2-r)*h,c*w:(c+1)*w]=a
img=bpy.data.images.new('sheet',w*3,h*2,alpha=True);img.pixels=sheet.ravel();img.filepath_raw=str(PROOF/'sheet.png');img.file_format='PNG';img.save()
print('[LASTLIGHT_V1_VIEWS] done')
