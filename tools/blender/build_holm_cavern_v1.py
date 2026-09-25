"""Ore workings under the quarry v1 (finish goal M4.4, brief docs/rebuild/HOLM_M44_BUILDING_BRIEF.md), prefix Cavern_.
A closed 2004-style mine dungeon (a separate area: the runtime places it offshore below sea level, x=200 z=60 y=-30, and
joins it to Quarry_ServiceShaft_ by an instant ladder climb). Layout on an 18 x 14 tile mask (local x -9..9, z -7..7):
  (a) ladder landing alcove (west): a ladder rises to a timber-collared hatch in the ceiling (Cavern_ServiceLadderUp_);
  (b) a 2-wide propped passage east to a hub, which opens north into the high ore-face chamber with four ore-rock
      sockets (EMPTIES Cavern_SocketCopper_1/2, Cavern_SocketTin_1/2 on open floor tiles, each with a stance in front),
      a hourglass rock pillar and heavy timber sets; a dead-end rail bay (south-west of the hub) with a mine cart;
  (c) a smelting nook (south-east) with a stone furnace (glowing mouth, flue into the rock, Cavern_ServiceFurnace_) and
      an anvil on a stump (Cavern_ServiceAnvil_); an east passage closes the loop back to the ore chamber.
Rock: the mask boundary is traced into loops, rounded (Chaikin), and raised as faceted wall columns (7 rows, jittered
in/out, strata bands, ore veins near the sockets); the ceiling (Cavern_Roof...) and the rock top are constrained
Delaunay surfaces sealed to the wall tops; the floor (Cavern_Floor) is one flat mottled surface at y=0.
Local space: origin = footprint centre, y=0 = floor. Game (x,y,z) -> Blender (x,-z,y). Deterministic (seeded).
Also writes proof renders (workbench) into scratchpad/holm_cavern_v1/ after export (socket markers are render-only).
Run: blender -b --python tools/blender/build_holm_cavern_v1.py
"""
import bpy,json,math,random,bmesh
import numpy as np
from pathlib import Path
from mathutils import Vector,geometry
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'.studio-workspaces/holm-cavern-v1/candidates';PROOF=ROOT/'scratchpad/holm_cavern_v1'
OUT.mkdir(parents=True,exist_ok=True);PROOF.mkdir(parents=True,exist_ok=True)
P='Cavern_'
bpy.ops.wm.read_factory_settings(use_empty=True)
M={}
def material(key,name,color,emit=False):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1)
 if emit:
  m.use_nodes=True;b=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
  b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=.6
  b.inputs['Emission Color'].default_value=(*color,1);b.inputs['Emission Strength'].default_value=1.0
 M[key]=m
for k,n,c in [('rock','Cavern rock',(.35,.31,.27)),('rock_d','Cavern rock shadow',(.25,.22,.19)),('rock_l','Cavern rock strata',(.50,.45,.37)),
 ('floor','Cavern trodden floor',(.31,.28,.24)),('floor_l','Cavern floor gravel',(.39,.35,.29)),('timber','Cavern pit prop',(.40,.28,.16)),
 ('timber_d','Cavern dark timber',(.23,.16,.10)),('wood','Cavern crate wood',(.47,.34,.20)),('iron','Cavern iron',(.19,.19,.21)),
 ('copper','Cavern copper ore',(.68,.38,.19)),('tin','Cavern tin ore',(.63,.65,.64)),('coal','Cavern coal',(.08,.08,.08)),
 ('stone','Cavern furnace stone',(.47,.46,.42)),('stone_l','Cavern dressed stone',(.58,.55,.49)),('rope','Cavern hemp rope',(.56,.46,.29)),
 ('void','Cavern shaft dark',(.02,.02,.02)),('water','Cavern quench water',(.18,.28,.32))]:material(k,n,c)
material('flame','Cavern torch flame',(1.0,.72,.28),emit=True)
material('ember','Cavern furnace glow',(.96,.42,.11),emit=True)
root=bpy.data.objects.new('Cavern_Root',None);bpy.context.collection.objects.link(root)
rng=random.Random(20260924)

# ---------------- helpers (lastlight / quarry v1 patterns) ----------------
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
def ring(name,c,nrm,r,wid,thick,mat,n=10):
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
 parts[0].name=name;parts[0].data.name=name;return parts[0]
def hull(name,pts,mats,rule):
 bm=bmesh.new()
 for x,y,z in pts:bm.verts.new((x,-z,y))
 res=bmesh.ops.convex_hull(bm,input=bm.verts)
 dead=list({v for v in res['geom_interior']+res['geom_unused'] if isinstance(v,bmesh.types.BMVert)})
 if dead:bmesh.ops.delete(bm,geom=dead,context='VERTS')
 data=bpy.data.meshes.new(name);bm.to_mesh(data);bm.free()
 o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.parent=root
 for m in mats:o.data.materials.append(m)
 fix(o)
 for poly in o.data.polygons:poly.material_index=rule(poly)
 return o
def rock_rule(poly):
 nz=poly.normal.z;return 2 if nz>.6 and rng.random()<.5 else (1 if nz<-.2 or rng.random()<.25 else 0)
def boulder(name,c,rx,ry,rz,n=12,y0=None,mats=None,rule=rock_rule):
 pts=[]
 for i in range(n):
  u=rng.uniform(-1,1);th=rng.uniform(0,math.tau);s=math.sqrt(1-u*u)
  p=(c[0]+rx*s*math.cos(th)*rng.uniform(.8,1),c[1]+ry*u*rng.uniform(.8,1),c[2]+rz*s*math.sin(th)*rng.uniform(.8,1))
  if y0 is not None:p=(p[0],max(y0,p[1]),p[2])
  pts.append(p)
 return hull(name,pts,mats or [M['rock'],M['rock_d'],M['rock_l']],rule)
class Seg:
 def __init__(s,p0,p1,n):
  s.p0=Vector(p0);s.p1=Vector(p1);d=s.p1-s.p0;s.L=d.length;s.U=d/s.L;s.n=Vector(n).normalized()
 def p(s,u,v,w):q=s.p0+s.U*u+s.n*w;return (q.x,v,q.y)
def stones(name,Pf,rows_uv,holes,r,wr,mats):
 V=[];F=[];ids=[]
 for row,(low,high,ua,ub) in enumerate(rows_uv):
  u=ua;first=True
  while u<ub-.01:
   w=r.uniform(*wr)*(.55 if first and row%2 else 1);first=False
   right=min(ub,u+w)
   if ub-right<.18:right=ub
   segs=[(u,right,low,high)]
   for a,b,c,d in holes:
    nxt=[]
    for l,rr,lo,hi in segs:
     if rr<=a or l>=b or hi<=c or lo>=d:nxt.append((l,rr,lo,hi));continue
     if l<a:nxt.append((l,a,lo,hi))
     if rr>b:nxt.append((b,rr,lo,hi))
    segs=nxt
   for l,rr,lo,hi in segs:
    l+=.012;rr-=.012;lo+=.012;hi-=.012
    if rr-l<.04 or hi-lo<.04:continue
    bev=min(.04,(rr-l)/4,(hi-lo)/4);k=len(V);front=.025+r.uniform(0,.02)
    outline=[(l,lo),(rr,lo),(rr,hi),(l,hi)]
    V.extend(Pf(a,b,.003) for a,b in outline)
    V.extend(Pf(a+(1 if a<(l+rr)/2 else -1)*bev,b+(1 if b<(lo+hi)/2 else -1)*bev,front) for a,b in outline)
    F.append(tuple(k+4+i for i in range(4)));ids.append(r.choice([0,0,1]))
    for i in range(4):F.append((k+i,k+(i+1)%4,k+4+(i+1)%4,k+4+i));ids.append(0)
   u=right
 o=mesh(name,V,F,mats[0])
 for m in mats[1:]:o.data.materials.append(m)
 for p,i in zip(o.data.polygons,ids):p.material_index=i
 return o

# ---------------- the tile mask: rows z=-7..6, columns x=-9..8 ('.' = walkable floor) ----------------
MAP=['##################',   # z=-7
     '########........##',   # z=-6  ore face: copper sockets on this row
     '########.........#',   # z=-5  tin 1 socket at x=7
     '########.........#',   # z=-4
     '#######..........#',   # z=-3  tin 2 socket at x=7, rock pillar at x=3
     '#######..........#',   # z=-2
     '#..........####..#',   # z=-1  alcove | passage | hub | rock island | east passage
     '#..........####..#',   # z=0
     '#...###......##..#',   # z=1
     '#####............#',   # z=2   rail bay | hub | smelting nook
     '#####..####......#',   # z=3
     '###########......#',   # z=4
     '###########......#',   # z=5   furnace against the south wall
     '##################']   # z=6
X0,Z0=-9,-7;NX,NZ=18,14
def walk(i,j):
 c=i-X0;r=j-Z0;return 0<=c<NX and 0<=r<NZ and MAP[r][c]=='.'
def walkp(x,z):return walk(math.floor(x),math.floor(z))
SOCKETS=[('Cavern_SocketCopper_1',(0.5,-5.5)),('Cavern_SocketCopper_2',(3.5,-5.5)),('Cavern_SocketTin_1',(7.5,-4.5)),('Cavern_SocketTin_2',(7.5,-2.5))]
for nm,(x,z) in SOCKETS:assert walkp(x,z),nm
LADDER=(-7.35,.5);HATCH=(-8.05,-7.1,.05,.95)
FURN=(5.5,5.85);ANVIL=(3.5,4.6)

# ---------------- boundary loops (rock side on the right of travel) ----------------
out={}
for j in range(Z0,Z0+NZ):
 for i in range(X0,X0+NX):
  if not walk(i,j):continue
  for (di,dj),a,b in [((0,-1),(i+1,j),(i,j)),((0,1),(i,j+1),(i+1,j+1)),((-1,0),(i,j),(i,j+1)),((1,0),(i+1,j+1),(i+1,j))]:
   if walk(i+di,j+dj):continue
   assert a not in out,('diagonal pinch',a);out[a]=b
loops=[]
while out:
 s=next(iter(out));L=[s];c=out.pop(s)
 while c!=s:L.append(c);c=out.pop(c)
 loops.append(L)
def simplify(L):
 n=len(L);keep=[]
 for k in range(n):
  a,b,c=L[k-1],L[k],L[(k+1)%n]
  if (b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0])!=0:keep.append(b)
 return keep
def resample(L,step):
 pts=[]
 for k in range(len(L)):
  a=Vector(L[k]);b=Vector(L[(k+1)%len(L)]);n=max(1,round((b-a).length/step))
  for t in range(n):pts.append(a.lerp(b,t/n))
 return pts
def chaikin(pts):
 o=[]
 for k in range(len(pts)):
  a=pts[k];b=pts[(k+1)%len(pts)];o+=[a.lerp(b,.25),a.lerp(b,.75)]
 return o
def area(pts):return sum(pts[k].x*pts[(k+1)%len(pts)].y-pts[(k+1)%len(pts)].x*pts[k].y for k in range(len(pts)))/2
LOOPS=[chaikin(resample(simplify(L),.72)) for L in loops]
LOOPS.sort(key=lambda p:-abs(area(p)))
print('[CAVERN_V1] loops',[len(l) for l in LOOPS])
def enormal(a,b):d=(b-a).normalized();return Vector((-d.y,d.x))     # (x,z) plan: rock side
def avail(p,n):
 t=.08
 while t<3:
  q=p+n*t
  if walkp(q.x,q.y):return t
  t+=.04
 return 3.
def CH(x,z):
 # ceiling height: 3.55 in the alcove / passage / hub, rising to ~4.5 over the ore face, ~3.9 over the smelting nook
 sm=lambda t:0 if t<=0 else (1 if t>=1 else t*t*(3-2*t))
 ore=sm((-1.6-z)/1.6)*sm((x+2.4)/1.4);nook=sm((z-1.4)/1.2)*sm((x-1.6)/1.2)
 return 3.55+.95*ore+.35*nook+.12*math.sin(x*.9+z*.4)
# wall columns: rows (height rule, offset range); offsets are measured out from the (rounded) tile boundary into rock
ROWS=[(lambda H:-.35,(0,.03)),(lambda H:.3,(.02,.1)),(lambda H:.3*H,(0,.38)),(lambda H:.5*H,(.05,.45)),(lambda H:.68*H,(0,.35)),(lambda H:.85*H,(-.1,.18)),(lambda H:H,(-.25,.04))]
WALLS=[]   # per loop: list of columns [(x,y,z)...], normals, floor-edge points
for li,pts in enumerate(LOOPS):
 n=len(pts);en=[enormal(pts[k],pts[(k+1)%n]) for k in range(n)]
 vn=[(en[k-1]+en[k]).normalized() for k in range(n)]
 s=0;cols=[];fl=[];ph=rng.uniform(0,6);ph2=rng.uniform(0,6)
 for k in range(n):
  if k:s+=(pts[k]-pts[k-1]).length
  p=pts[k];nv=vn[k];av=avail(p,nv)
  lf=min(max(.02,.16+.12*math.sin(s*1.1+ph)+.07*math.sin(s*2.9+ph2)),av*.3)
  H=CH(p.x,p.y)+rng.uniform(-.1,.1);col=[]
  for ri,(hy,(o0,o1)) in enumerate(ROWS):
   off=lf+rng.uniform(o0,o1)
   if ri>=2:off=min(off,av*.45)
   y=hy(H)+(rng.uniform(-.14,.14) if 1<ri<len(ROWS)-1 else 0)
   q=p+nv*off;col.append((q.x,y,q.y))
  cols.append(col);f=p+nv*(lf+.12);fl.append((f.x,f.y))
 WALLS.append((cols,vn,fl))
def inside(x,z,polys):
 c=False
 for poly in polys:
  n=len(poly)
  for k in range(n):
   (x1,z1),(x2,z2)=poly[k],poly[(k+1)%n]
   if (z1>z)!=(z2>z) and x<(x2-x1)*(z-z1)/(z2-z1)+x1:c=not c
 return c
def seg_dist(px,pz,polys):
 best=9
 for poly in polys:
  n=len(poly)
  for k in range(n):
   (x1,z1),(x2,z2)=poly[k],poly[(k+1)%n];dx,dz=x2-x1,z2-z1;L2=dx*dx+dz*dz or 1e-9
   t=max(0,min(1,((px-x1)*dx+(pz-z1)*dz)/L2));best=min(best,math.hypot(px-x1-t*dx,pz-z1-t*dz))
 return best
def cdt_surface(name,polys,ys,extra,keep,up,mats,matfn):
 # polys: plan loops [(x,z)...], ys: matching heights; extra: [(x,y,z)] interior points; keep(cx,cz) filters triangles
 V=[];Y=[];E=[]
 for poly,yy in zip(polys,ys):
  k0=len(V);V+=[Vector(p) for p in poly];Y+=list(yy);n=len(poly);E+=[(k0+k,k0+(k+1)%n) for k in range(n)]
 for x,y,z in extra:V.append(Vector((x,z)));Y.append(y)
 res=geometry.delaunay_2d_cdt(V,E,[],0,1e-6,True)
 vo,eo,fo,ov=res[0],res[1],res[2],res[3]
 H=[]
 for i,v in enumerate(vo):
  if ov[i]:H.append(Y[ov[i][0]])
  else:H.append(Y[min(range(len(V)),key=lambda j:(V[j]-v).length)])
 verts=[(v.x,H[i],v.y) for i,v in enumerate(vo)];faces=[]
 for f in fo:
  cx=sum(vo[i].x for i in f)/len(f);cz=sum(vo[i].y for i in f)/len(f)
  if not keep(cx,cz):continue
  a,b,c=[Vector((vo[i].x,-vo[i].y,H[i])) for i in f[:3]];nz=(b-a).cross(c-a).z
  faces.append(tuple(f) if (nz>0)==up else tuple(reversed(f)))
 o=mesh(name,verts,faces,mats[0])
 for m in mats[1:]:o.data.materials.append(m)
 for p in o.data.polygons:p.material_index=matfn(p)
 return o
OPEN=set()

# ---------------- rock walls (Cavern_ShellRock) ----------------
SOCK_P=[(Vector(p),'tin' if 'Tin' in nm else 'copper') for nm,p in SOCKETS]
for li,(cols,vn,fl) in enumerate(WALLS):
 n=len(cols);R=len(ROWS);V=[];F=[];I=[];s=0;ph=rng.uniform(0,6)
 for col in cols:V+=col
 for k in range(n):
  kk=(k+1)%n
  if k:s+=math.hypot(cols[k][0][0]-cols[k-1][0][0],cols[k][0][2]-cols[k-1][0][2])
  for r in range(R-1):
   a,b,c,d=k*R+r,kk*R+r,kk*R+r+1,k*R+r+1
   tris=[(a,b,c),(a,c,d)] if (k+r)%2 else [(a,b,d),(b,c,d)]
   for t in tris:
    A,B,C=[Vector((V[i][0],-V[i][2],V[i][1])) for i in t];nrm=(B-A).cross(C-A)
    inward=Vector((-vn[k].x,vn[k].y,0))                     # plan (x,z) -> blender (x,-z)
    F.append(t if nrm.dot(inward)>=0 else (t[0],t[2],t[1]))
    cx=(A.x+B.x+C.x)/3;cz=-(A.y+B.y+C.y)/3;cy=(A.z+B.z+C.z)/3
    m=0
    if r<=1:m=1 if rng.random()<.6 else 0
    elif r==2 and math.sin(s*.33+ph)>-.25:m=2 if rng.random()<.8 else 0
    elif r==4 and math.sin(s*.5+ph*2)>.45:m=2 if rng.random()<.75 else 1
    elif rng.random()<.18:m=1
    for sp,kind in SOCK_P:
     if (Vector((cx,cz))-sp).length<1.55 and .25<cy<2.4 and rng.random()<.5:m=3 if kind=='copper' else 4
    I.append(m)
 o=mesh('Cavern_ShellRock',V,F,M['rock'])
 for mm in ('rock_d','rock_l','copper','tin'):o.data.materials.append(M[mm])
 for p,i in zip(o.data.polygons,I):p.material_index=i
 OPEN.add(o.name)
# the floor: one flat surface at y=0, edges tucked under the walls; faces mottled trodden earth / gravel
FLP=[fl for _,_,fl in WALLS]
ext=[]
for j in range(Z0,Z0+NZ):
 for i in range(X0,X0+NX):
  for (a,b) in ((.25,.25),(.75,.75)):
   x=i+a+rng.uniform(-.18,.18);z=j+b+rng.uniform(-.18,.18)
   if inside(x,z,FLP) and seg_dist(x,z,FLP)>.25:ext.append((x,0,z))
fo=cdt_surface('Cavern_Floor',FLP,[[0]*len(p) for p in FLP],ext,lambda x,z:inside(x,z,FLP),True,[M['floor'],M['floor_l'],M['rock_d']],
 lambda p:1 if rng.random()<.3 else (2 if rng.random()<.05 else 0))
OPEN.add(fo.name)
# the ceiling (Cavern_Roof, hidden by the runtime when the player is inside), sealed to the wall tops, hatch left open
TOP=[[(c[-1][0],c[-1][2]) for c in cols] for cols,_,_ in WALLS];TOPY=[[c[-1][1] for c in cols] for cols,_,_ in WALLS]
ext=[]
for j in range(Z0,Z0+NZ):
 for i in range(X0,X0+NX):
  x=i+.5+rng.uniform(-.3,.3);z=j+.5+rng.uniform(-.3,.3)
  if inside(x,z,TOP) and seg_dist(x,z,TOP)>.4:ext.append((x,CH(x,z)+rng.uniform(.15,.55),z))
hx0,hx1,hz0,hz1=HATCH
ro=cdt_surface('Cavern_RoofCeiling',TOP,TOPY,ext,lambda x,z:inside(x,z,TOP) and not (hx0-.1<x<hx1+.1 and hz0-.1<z<hz1+.1),False,
 [M['rock_d'],M['rock'],M['rock_l']],lambda p:1 if rng.random()<.35 else (2 if rng.random()<.08 else 0))
OPEN.add(ro.name)
# outer skin and the rock top between skin and wall tops (Cavern_ShellRockTop reads as solid rock in the cutaway)
SK=[]
for x,z in [(-9.25,-7.25),(9.25,-7.25),(9.25,7.25),(-9.25,7.25)]:SK.append(Vector((x,z)))
SK=chaikin(chaikin(resample([(p.x,p.y) for p in SK],1.2)))
skcols=[];sk2=[]
for p in SK:
 nrm=Vector((p.x/9.25,p.y/7.25));nrm=nrm.normalized();t=rng.uniform(0,.35)
 top=4.3+rng.uniform(0,.6);col=[]
 for y,o in ((-.8,t+.45),(.9+rng.uniform(-.2,.2),t+rng.uniform(.2,.45)),(2.4+rng.uniform(-.3,.3),t+rng.uniform(-.1,.2)),(top,t-rng.uniform(.2,.5))):
  q=p+nrm*o;col.append((q.x,y,q.y))
 skcols.append(col);sk2.append(nrm)
V=[];F=[];n=len(skcols)
for col in skcols:V+=col
for k in range(n):
 kk=(k+1)%n
 for r in range(3):
  a,b,c,d=k*4+r,kk*4+r,kk*4+r+1,k*4+r+1;F+=[(a,b,c),(a,c,d)] if (k+r)%2 else [(a,b,d),(b,c,d)]
sko=mesh('Cavern_ShellSkin',V,F,M['rock']);sko.data.materials.append(M['rock_d']);sko.data.materials.append(M['rock_l'])
for p in sko.data.polygons:p.material_index=rng.choice([0,0,1,2])
fix(sko);OPEN.add(sko.name)
SKT=[(c[-1][0],c[-1][2]) for c in skcols];SKY=[c[-1][1] for c in skcols]
ext=[]
for j in range(Z0*2-2,(Z0+NZ)*2+2):
 for i in range(X0*2-2,(X0+NX)*2+2):
  x=i*.5+.25+rng.uniform(-.12,.12);z=j*.5+.25+rng.uniform(-.12,.12)
  if inside(x,z,[SKT]) and not inside(x,z,TOP) and seg_dist(x,z,TOP+[SKT])>.3:ext.append((x,4.2+rng.uniform(0,.7),z))
cap=cdt_surface('Cavern_ShellRockTop',[SKT]+TOP,[SKY]+TOPY,ext,lambda x,z:inside(x,z,[SKT]+TOP),True,[M['rock'],M['rock_l'],M['rock_d']],
 lambda p:1 if p.normal.z>.8 and rng.random()<.35 else (2 if rng.random()<.25 else 0))
OPEN.add(cap.name)
# the hourglass rock pillar in the ore chamber (tile 3,-3)
px,pz=3.5,-2.5
def envpts(y0,y1,r0,r1,n):
 # random points inside an hourglass half: radius r0 at y0 -> r1 at y1, each point pushed to a jittered envelope
 pts=[]
 for i in range(n):
  t=rng.random();y=y0+(y1-y0)*t;th=rng.uniform(0,math.tau);r=(r0+(r1-r0)*t)*rng.uniform(.72,1.12)
  pts.append((px+r*math.cos(th)*rng.uniform(.9,1.25),y,pz+r*math.sin(th)))
 return pts+[(px+r0*math.cos(a),y0,pz+r0*math.sin(a)) for a in (.3,2.4,4.4)]+[(px+r1*math.cos(a),y1,pz+r1*math.sin(a)) for a in (1.1,3.3,5.3)]
hull('Cavern_ShellPillar',envpts(-.1,2.2,.6,.34,18),[M['rock'],M['rock_d'],M['rock_l']],rock_rule)
hull('Cavern_ShellPillar',envpts(2.0,CH(px,pz)+.6,.36,.8,18),[M['rock'],M['rock_d'],M['rock_l']],rock_rule)
boulder('Cavern_ShellPillar',(px+.35,1.9,pz-.2),.3,.35,.28,9)
# rubble and fallen blocks at the wall foot (only on tiles no stance needs)
for c,s in [((-7.7,-.75),.32),((-8.2,1.7),.28),((-.75,-5.8),.3),((6.7,-5.85),.34),((7.75,-.6),.26),((-3.8,3.7),.3),((2.3,5.75),.28),((7.7,5.7),.3),((-1.7,-3.8),.35),((4.2,-5.95),.22)]:
 boulder('Cavern_Rubble',(c[0],s*.55,c[1]),s,s*.9,s*.85,10,y0=0)
 boulder('Cavern_Rubble',(c[0]+rng.uniform(-.35,.35),s*.3,c[1]+rng.uniform(-.25,.25)),s*.55,s*.55,s*.5,8,y0=0)
# ore veins breaking out of the wall behind each socket (a lump of the vein, not on the socket tile)
for nm,(x,z) in SOCKETS:
 kind=M['tin'] if 'Tin' in nm else M['copper'];dx,dz=(0,-1) if 'Copper' in nm else (1,0)
 bx,bz=x+dx*.95,z+dz*.95
 for i in range(3):
  boulder('Cavern_ShellVein',(bx+dz*rng.uniform(-.45,.45),.7+i*.55,bz+dx*rng.uniform(-.45,.45)),.28,.22,.24,8,mats=[M['rock_d'],kind,M['rock']],
   rule=lambda p:1 if rng.random()<.55 else (0 if rng.random()<.6 else 2))
# render-only markers are added after export; the sockets themselves are EMPTIES on open floor
for nm,(x,z) in SOCKETS:
 e=bpy.data.objects.new(nm,None);e.empty_display_type='PLAIN_AXES';e.empty_display_size=.4;bpy.context.collection.objects.link(e);e.parent=root;e.location=(x,-z,0)

# ---------------- timber: pit-prop sets with caps, knee braces, stringers and lagging ----------------
T='Cavern_Timber'
def prop_set(a,b,h,wt=.22):
 a=Vector(a);b=Vector(b);d=(b-a).normalized()
 for p in (a,b):
  beam(T,(p.x,-.05,p.y),(p.x,h,p.y),wt,wt,M['timber'])
  prism(T,p.x-.16,p.x+.16,0,.08,p.y-.16,p.y+.16,M['timber_d'])          # sole block
 e0=a-d*.18;e1=b+d*.18
 beam(T,(e0.x,h+wt/2,e0.y),(e1.x,h+wt/2,e1.y),wt+.04,wt,M['timber'])
 for p,sg in ((a,1),(b,-1)):
  q=p+d*sg*.5;beam(T,(p.x,h-.55,p.y),(q.x,h-.02,q.y),.12,.12,M['timber_d'])
def stringer(a,b,h,wt=.22):beam(T,(a[0],h+wt+.07,a[1]),(b[0],h+wt+.07,b[1]),.16,.14,M['timber_d'])
def lagging(a0,a1,b0,b1,h,n):
 for i in range(n):
  t=(i+.5)/n;p=Vector(a0).lerp(Vector(b0),t);q=Vector(a1).lerp(Vector(b1),t)
  beam(T,(p.x,h+.36,p.y),(q.x,h+.36,q.y),.2,.05,M['timber_d'])
# passage (x -5..-2, z -1..1): three sets, stringers both sides, lagging boards across
PS=[-4.95,-3.55,-2.15]
for x in PS:prop_set((x,-.9),(x,.9),2.55)
for za in (-.9,.9):stringer((PS[0],za),(PS[-1],za),2.55)
lagging((PS[0],-.9),(PS[0],.9),(PS[-1],-.9),(PS[-1],.9),2.55,7)
# alcove mouth set (wider to the south where the alcove bulges)
prop_set((-5.95,-.9),(-5.95,1.9),2.75)
# ore chamber: two heavy sets across the face, stringers linking them past the pillar
for x in (2.0,5.0):prop_set((x,-5.88),(x,-2.1),3.05,.26)
for za in (-5.88,-2.1):stringer((2.0,za),(5.0,za),3.05,.26)
lagging((2.0,-5.88),(2.0,-2.1),(5.0,-5.88),(5.0,-2.1),3.05+.05,3)
# the pillar gets a timber collar-prop on its west side
beam(T,(2.85,-.05,-2.55),(2.95,3.3,-2.5),.2,.2,M['timber']);beam(T,(2.7,2.2,-2.52),(3.4,2.65,-2.5),.12,.12,M['timber_d'])
# east passage (x 6..8, z -1..2): two sets
for z in (-.02,1.0):prop_set((6.1,z),(7.9,z),2.7)
for xa in (6.1,7.9):stringer((xa,-.02),(xa,1.0),2.7)
# nook entry: a set spanning the opening from the hub (x 2..4 at z 1..2) and wall posts in the nook
prop_set((2.1,1.1),(3.9,1.1),2.9)
for p in ((2.1,5.9),(7.9,2.1),(7.9,5.9)):beam(T,(p[0],-.05,p[1]),(p[0],3.1,p[1]),.2,.2,M['timber'])
beam(T,(2.1,3.05,5.9),(4.45,3.15,5.9),.18,.18,M['timber_d']);beam(T,(7.9,3.05,2.1),(7.9,3.05,5.9),.18,.18,M['timber_d'])

# ---------------- wall torches in iron brackets ----------------
TW='Cavern_Torch'
def wall_at(px_,pz_,y):
 best=None
 for cols,vn,_ in WALLS:
  for k,col in enumerate(cols):
   d=math.hypot(col[0][0]-px_,col[0][2]-pz_)
   if best is None or d<best[0]:best=(d,col,vn[k])
 _,col,nv=best
 for a,b in zip(col,col[1:]):
  if a[1]<=y<=b[1]:t=(y-a[1])/(b[1]-a[1]);return Vector((a[0]+(b[0]-a[0])*t,a[2]+(b[2]-a[2])*t)),nv
 return Vector((col[3][0],col[3][2])),nv
def torch(px_,pz_,y=1.95):
 w,nv=wall_at(px_,pz_,y);inn=-nv;w=w+nv*.08
 base=(w.x,y,w.y);tip=w+inn*.34
 prism(TW,w.x-.09,w.x+.09,y-.25,y+.1,w.y-.09,w.y+.09,M['iron'])                  # wall plate (sunk into the rock)
 beam(TW,base,(tip.x,y,tip.y),.05,.05,M['iron'])
 ring(TW,(tip.x,y+.02,tip.y),(0,1,0),.07,.025,.05,M['iron'],8)
 beam(TW,(w.x+inn.x*.1,y-.2,w.y+inn.y*.1),(tip.x,y-.02,tip.y),.035,.035,M['iron'])
 cyl(TW,(tip.x-inn.x*.04,y-.22,tip.y-inn.y*.04),(tip.x+inn.x*.03,y+.2,tip.y+inn.y*.03),.035,.05,M['timber_d'],6)
 t2=Vector((tip.x+inn.x*.04,tip.y+inn.y*.04))
 cyl(TW,(t2.x,y+.2,t2.y),(t2.x,y+.27,t2.y),.06,.055,M['rope'],6)
 cyl('Cavern_TorchFlame',(t2.x,y+.26,t2.y),(t2.x+inn.x*.03,y+.52,t2.y+inn.y*.03),.075,.012,M['flame'],6)
for p in [(-6.5,-1.0),(-3.5,1.0),(-2.0,-2.5),(-1.0,-4.5),(5.5,-6.0),(8.0,-.5),(4.2,6.0),(8.0,4.5),(-4.2,4.0),(-8.0,1.6)]:
 torch(*p)

# ---------------- (a) ladder landing: ladder up through a timber-collared hatch (service) ----------------
LU='Cavern_ServiceLadderUp_Ladder'
B=Vector((LADDER[0],0,LADDER[1]));Tp=Vector((LADDER[0]-.28,4.95,LADDER[1]));S=Vector((0,0,1));w=.56
def at(y):return B.lerp(Tp,y/Tp.y)
for s in (-1,1):
 beam(LU,tuple(B+S*s*w/2),tuple(Tp+S*s*w/2),.08,.11,M['wood'])
 prism(LU,*(lambda p:(p.x-.07,p.x+.07,0,.05,p.z-.07,p.z+.07))(B+S*s*w/2),M['iron'])
y=.3
while y<4.8:p=at(y);cyl(LU,tuple(p-S*w/2),tuple(p+S*w/2),.028,.028,M['timber_d'],6);y+=.3
# hatch collar: a boxed timber shaft lining from below the ceiling up to a dark void plate (the way up to the quarry)
cy0,cy1=3.05,4.45
for a,b,c,d in ((hx0-.1,hx0,hz0-.1,hz1+.1),(hx1,hx1+.1,hz0-.1,hz1+.1),(hx0,hx1,hz0-.1,hz0),(hx0,hx1,hz1,hz1+.1)):
 prism(LU,a,b,cy0,cy1,c,d,M['timber_d'])
for a,b,c,d in ((hx0-.22,hx1+.22,hz0-.22,hz0-.06),(hx0-.22,hx1+.22,hz1+.06,hz1+.22),(hx0-.22,hx0-.06,hz0-.06,hz1+.06),(hx1+.06,hx1+.22,hz0-.06,hz1+.06)):
 prism(LU,a,b,cy0-.08,cy0+.14,c,d,M['timber'])
prism(LU,hx0,hx1,cy1-.05,cy1,hz0,hz1,M['void'])
for yy in (3.6,4.3):prism(LU,hx0+.02,hx1-.02,yy,yy+.06,hz0-.02,hz0+.02,M['iron'])
# rope hanging beside the ladder and an iron ring bolt
beam(LU,(hx1-.1,cy0,hz0+.12),(hx1-.12,1.2,hz0+.14),.035,.035,M['rope'])
# exterior: timber shaft head over the collar (part of the rock top, hidden inside) with a small windlass frame
RH='Cavern_RoofShaftHead'
for a,b,c,d in ((hx0-.2,hx0,hz0-.2,hz1+.2),(hx1,hx1+.2,hz0-.2,hz1+.2),(hx0,hx1,hz0-.2,hz0),(hx0,hx1,hz1,hz1+.2)):prism(RH,a,b,4.4,5.5,c,d,M['timber'])
for z in (hz0-.3,hz1+.3):beam(RH,(hx0-.1,5.4,z),((hx0+hx1)/2,6.3,z),.12,.12,M['timber_d']);beam(RH,(hx1+.1,5.4,z),((hx0+hx1)/2,6.3,z),.12,.12,M['timber_d'])
cyl(RH,((hx0+hx1)/2,6.2,hz0-.35),((hx0+hx1)/2,6.2,hz1+.35),.1,.1,M['wood'],8)
# lumpy rock hummocks on the roof so the closed cave reads as a rock mass from outside
for i in range(16):
 x=rng.uniform(-8.3,8.3);z=rng.uniform(-6.3,6.3)
 if abs(x-hx0)<1.3 and abs(z-.5)<1.3:continue
 boulder('Cavern_RoofBoulders',(x,4.6+rng.uniform(0,.3),z),rng.uniform(.8,1.6),rng.uniform(.4,.8),rng.uniform(.7,1.4),10)

# ---------------- rail bay (x -4..-2, z 2..4): stub track with buffer stop and a laden cart ----------------
RL='Cavern_Rail'
for i in range(5):x=-3.85+i*.42;prism(RL,x-.08,x+.08,0,.05,2.45,3.55,M['timber_d'])
for zc in (2.62,3.38):prism(RL,-3.95,-2.08,.05,.11,zc-.025,zc+.025,M['iron'])
for zc in (2.5,3.5):beam(RL,(-3.98,-.02,zc),(-3.98,.62,zc),.16,.16,M['timber'])
prism(RL,-4.08,-3.9,.38,.6,2.4,3.6,M['timber']);prism(RL,-3.92,-3.88,.42,.56,2.55,3.45,M['iron'])
CT='Cavern_FurnishingCart'
cx0,cx1=-3.55,-2.65
mesh(CT,[(cx0+.05,.3,2.6),(cx1-.05,.3,2.6),(cx1-.05,.3,3.4),(cx0+.05,.3,3.4),(cx0-.06,.9,2.5),(cx1+.06,.9,2.5),(cx1+.06,.9,3.5),(cx0-.06,.9,3.5)],
 [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],M['wood'])
for x in (cx0+.08,cx1-.08):
 for zc in (2.47,3.53):prism(CT,x-.035,x+.035,.3,.92,zc-.03,zc+.03,M['iron'])
prism(CT,cx0-.08,cx1+.08,.86,.93,2.47,3.53,M['iron'])
for x in (cx0+.18,cx1-.18):
 for zc in (2.62,3.38):cyl(CT,(x,.27,zc-.07 if zc<3 else zc+.03),(x,.27,zc+.03 if zc<3 else zc-.07),.16,.16,M['iron'],8)
boulder(CT,(-3.1,.92,3.0),.42,.2,.44,14,mats=[M['copper'],M['rock_d'],M['tin']],rule=lambda p:0 if rng.random()<.55 else (1 if rng.random()<.5 else 2))
beam(CT,(cx1+.05,.62,3.0),(cx1+.55,.7,3.0),.05,.05,M['iron'])

# ---------------- clutter: crates, barrels, sacks, tool racks ----------------
FN='Cavern_Furnishing'
def crate(x0,x1,y0,y1,z0,z1,fill=None):
 prism(FN,x0,x1,y0,y1,z0,z1,M['wood'])
 for zz in (z0-.012,z1):prism(FN,x0+.03,x1-.03,y0+.03,y0+.09,zz,zz+.012,M['timber_d']);prism(FN,x0+.03,x1-.03,y1-.09,y1-.03,zz,zz+.012,M['timber_d'])
 for xx in (x0-.012,x1):prism(FN,xx,xx+.012,y0+.03,y1-.03,z0+.03,z0+.09,M['timber_d']);prism(FN,xx,xx+.012,y0+.03,y1-.03,z1-.09,z1-.03,M['timber_d'])
 if fill:prism(FN,x0+.05,x1-.05,y1-.04,y1+.05,z0+.05,z1-.05,fill)
def barrel(x,z,h=.85,r=.3,y=0,lid=None):
 cyl(FN,(x,y,z),(x,y+h*.5,z),r*.88,r,M['wood'],8);cyl(FN,(x,y+h*.5,z),(x,y+h,z),r,r*.88,M['wood'],8)
 for f in (.15,.85):rr=r*(.9+.08*(1-abs(f-.5)*2))+.012;cyl(FN,(x,y+h*f-.03,z),(x,y+h*f+.03,z),rr,rr,M['iron'],8)
 if lid:cyl(FN,(x,y+h-.03,z),(x,y+h+.03,z),r*.8,r*.8,lid,8)
def sack(x,z,r=.24):
 cyl(FN,(x,0,z),(x,r*1.4,z),r,r*.8,M['rope'],7);cyl(FN,(x,r*1.4,z),(x,r*1.75,z),r*.8,r*.3,M['rope'],7)
def pick(a,b):
 beam(FN,a,b,.05,.05,M['wood']);hb=Vector(b);ax=(hb-Vector(a)).normalized();sd=ax.cross(Vector((0,1,0)))
 if sd.length<.1:sd=Vector((1,0,0))
 sd.normalize();beam(FN,tuple(hb-sd*.26-ax*.03),tuple(hb+sd*.26-ax*.03),.06,.05,M['iron'])
def coil(x,y,z,r=.28,turns=3):
 for i in range(turns):ring(FN,(x,y+.04+i*.06,z),(0,1,0),r-i*.035,.07,.06,M['rope'],8)
# alcove: crates by the ladder, a barrel and rope in the SW corner
crate(-7.95,-7.35,0,.6,-.95,-.35);crate(-7.9,-7.45,.6,1.02,-.9,-.45);coil(-7.66,1.02,-.66,.18,2)
barrel(-7.55,1.6,.9,.3,lid=M['wood']);sack(-7.0,1.75,.2)
# hub: sacks and a crate against the west wall (tile -2,1)
sack(-1.7,1.35);sack(-1.72,1.78,.22);crate(-1.95,-1.4,0,.55,1.1,1.55,M['coal'])
# ore chamber: ore crates in the NW corner, tool rack on the north wall between the copper sockets, barrels NE
crate(-.95,-.35,0,.55,-5.95,-5.4,M['copper']);crate(-.95,-.4,0,.5,-5.3,-4.8,M['tin'])
for x in (1.25,2.75):beam(FN,(x,0,-5.9),(x,2.0,-5.9),.1,.1,M['timber_d'])
prism(FN,1.15,2.85,1.85,1.97,-5.98,-5.82,M['timber_d']);prism(FN,1.15,2.85,.12,.2,-5.98,-5.8,M['timber_d'])
for i,x in enumerate((1.45,1.8,2.15,2.5)):
 if i%2==0:pick((x,.2,-5.84),(x+.05,1.8,-5.86))
 else:beam(FN,(x,.2,-5.84),(x,1.72,-5.86),.05,.05,M['wood']);prism(FN,x-.13,x+.13,1.65,1.97,-5.9,-5.83,M['iron'])
barrel(6.55,-5.6,.85,.3,lid=M['wood']);barrel(5.9,-5.7,.7,.26)
pick((6.2,0,-5.25),(6.35,1.0,-5.55))
# a heap of broken ore by the pillar (not on a stance tile) and a shovel
boulder(FN,(4.35,.08,-2.35),.36,.2,.3,12,y0=0,mats=[M['rock'],M['copper'],M['rock_d']],rule=lambda p:1 if rng.random()<.35 else rock_rule(p))
# smelting nook: coal bin and ore crate, quench trough on the east wall, tongs rack on the west wall
crate(7.1,7.8,0,.65,5.1,5.8,M['coal']);crate(2.15,2.8,0,.55,5.15,5.8,M['copper']);crate(2.2,2.75,.55,.95,5.2,5.75,M['tin'])
prism(FN,7.3,7.9,0,.55,2.25,3.75,M['wood']);prism(FN,7.36,7.84,.46,.5,2.31,3.69,M['water'])
for zz in (2.3,3.7):prism(FN,7.27,7.93,.1,.18,zz-.04,zz+.04,M['iron'])
prism(FN,2.02,2.12,1.0,2.1,3.2,4.5,M['timber_d'])
for i,z in enumerate((3.4,3.75,4.1,4.35)):
 prism(FN,2.12,2.24,1.85,1.9,z-.03,z+.03,M['iron'])
 beam(FN,(2.2,1.88,z),(2.24,1.1,z+(.08 if i%2 else -.08)),.04,.04,M['iron'])
barrel(4.35,5.55,.6,.22,lid=M['water'])
# bellows beside the furnace
bx0,bx1=6.4,7.0
mesh(FN,[(bx0,.3,5.2),(bx1,.3,5.2),(bx1,.3,5.9),(bx0,.3,5.9),(bx0,.55,5.35),(bx1,.8,5.2),(bx1,.8,5.9),(bx0,.55,5.75)],BOXF,M['rope'])
prism(FN,bx0-.02,bx1+.02,.26,.32,5.18,5.92,M['wood']);prism(FN,bx0-.02,bx1+.02,.8,.84,5.18,5.92,M['wood'])
beam(FN,(bx0,.45,5.55),(6.2,.55,5.55),.07,.07,M['iron']);beam(FN,(bx1,.82,5.55),(bx1+.35,1.25,5.55),.05,.05,M['wood'])
for x,z in ((bx0+.05,5.25),(bx1-.05,5.85)):prism(FN,x-.04,x+.04,0,.28,z-.04,z+.04,M['wood'])

# ---------------- (c) furnace (service): fieldstone body, glowing mouth, tapering stack, flue into the rock ----------------
FU='Cavern_ServiceFurnace_Furnace'
fx,fz=FURN;x0,x1=fx-.8,fx+.8;zf,zb=5.2,6.55
prism(FU,x0-.1,x1+.1,0,.3,zf-.1,zb,M['stone_l'])                                   # plinth
prism(FU,x0,fx-.3,.3,1.4,zf,zb,M['stone']);prism(FU,fx+.3,x1,.3,1.4,zf,zb,M['stone'])  # cheeks
prism(FU,fx-.3,fx+.3,1.02,1.4,zf,zb,M['stone'])                                     # over the mouth
prism(FU,fx-.3,fx+.3,.3,1.02,zf+.55,zb,M['stone'])                                  # back of the fire chamber
prism(FU,fx-.3,fx+.3,.3,.4,zf+.02,zf+.55,M['ember'])                                # glowing bed
prism(FU,fx-.28,fx+.28,.4,1.0,zf+.52,zf+.55,M['ember'])                             # glow on the back wall
for i in range(6):
 cx=fx+rng.uniform(-.2,.2);cz=zf+rng.uniform(.12,.45);boulder(FU,(cx,.44,cz),.07,.05,.07,6,mats=[M['coal'],M['ember']],rule=lambda p:1 if p.normal.z>.5 and rng.random()<.5 else 0)
for i,(a,b,c,d) in enumerate(((fx-.42,fx-.22,.95,1.14),(fx-.22,fx-.07,1.02,1.2),(fx-.07,fx+.07,1.04,1.24),(fx+.07,fx+.22,1.02,1.2),(fx+.22,fx+.42,.95,1.14))):
 prism(FU,a+.01,b-.01,c,d,zf-.06,zf+.02,M['stone_l'])                               # arch voussoirs
prism(FU,fx-.42,fx+.42,.3,.36,zf-.18,zf+.02,M['stone_l'])                           # mouth sill
stones('Cavern_ServiceFurnace_Facing',lambda u,v,w:(x0+u,v,zf-w),[(.3+i*.275,.3+(i+1)*.275,0,1.6) for i in range(4)],[(.5,1.1,.3,1.24)],
 random.Random(5),(.3,.5),[M['stone'],M['stone_l']])
mesh(FU,[(x0,1.4,zf),(x1,1.4,zf),(x1,1.4,zb),(x0,1.4,zb),(fx-.42,2.55,zf+.3),(fx+.42,2.55,zf+.3),(fx+.42,2.55,zb-.05),(fx-.42,2.55,zb-.05)],BOXF,M['stone'])
for yy in (1.38,2.5):
 t=(yy-1.4)/1.15;ax0=x0+(fx-.42-x0)*t;ax1=x1+(fx+.42-x1)*t;az0=zf+.3*t
 prism(FU,ax0-.04,ax1+.04,yy-.04,yy+.06,az0-.04,zb,M['iron'])
prism(FU,fx-.36,fx+.36,2.55,CH(fx,zf)+.55,zf+.36,zb-.1,M['stone'])                            # flue stack into the rock
for yy in (3.0,3.45):prism(FU,fx-.38,fx+.38,yy,yy+.05,zf+.34,zb-.08,M['stone_l'])
prism(FU,fx-.5,fx+.5,0,.12,zf-.45,zf-.1,M['stone_l'])                               # hearth apron
# a ladle and an ingot mould on the apron edge
prism(FU,fx+.55,fx+.78,.3,.36,zf-.05,zf+.2,M['iron']);beam(FU,(fx+.66,.36,zf+.08),(fx+.95,.9,zf+.1),.04,.04,M['iron'])

# ---------------- (c) anvil on a stump (service) ----------------
AN='Cavern_ServiceAnvil_Anvil'
ax_,az_=ANVIL
cyl(AN,(ax_,0,az_),(ax_,.52,az_),.34,.3,M['timber'],8);ring(AN,(ax_,.2,az_),(0,1,0),.33,.03,.06,M['iron'],8)
prism(AN,ax_-.2,ax_+.2,.52,.62,az_-.14,az_+.14,M['iron']);prism(AN,ax_-.12,ax_+.12,.62,.74,az_-.09,az_+.09,M['iron'])
prism(AN,ax_-.24,ax_+.2,.74,.86,az_-.14,az_+.14,M['iron'])
mesh(AN,[(ax_+.2,.76,az_-.12),(ax_+.2,.76,az_+.12),(ax_+.5,.84,az_),(ax_+.2,.86,az_-.12),(ax_+.2,.86,az_+.12)],[(0,1,2),(3,2,4),(0,3,4,1),(0,2,3),(1,4,2)],M['iron'])
beam(AN,(ax_-.15,.87,az_+.05),(ax_+.08,.87,az_+.12),.035,.035,M['wood']);prism(AN,ax_+.06,ax_+.14,.86,.93,az_+.06,az_+.18,M['iron'])
beam(AN,(ax_-.3,.52,az_-.05),(ax_-.3,0,az_-.3),.03,.03,M['iron']);beam(AN,(ax_-.26,.52,az_-.05),(ax_-.2,0,az_-.32),.03,.03,M['iron'])

# ---------------- finish: fix normals on closed parts, batch by name ----------------
for o in [o for o in bpy.context.scene.objects if o.type=='MESH']:
 bpy.context.view_layer.objects.active=o
 for m in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=m.name)
 if o.name not in OPEN and not o.name.startswith(('Cavern_ShellPillar','Cavern_Rubble','Cavern_ShellVein','Cavern_RoofBoulders')):fix(o)
GROUPS=[('Cavern_ServiceLadderUp_','Cavern_ServiceLadderUp_Ladder'),('Cavern_ServiceFurnace_','Cavern_ServiceFurnace_Furnace'),('Cavern_ServiceAnvil_','Cavern_ServiceAnvil_Anvil'),
 ('Cavern_Floor','Cavern_Floor'),('Cavern_RoofCeiling','Cavern_RoofCeiling'),('Cavern_RoofBoulders','Cavern_RoofBoulders'),('Cavern_RoofShaftHead','Cavern_RoofShaftHead'),
 ('Cavern_ShellRockTop','Cavern_ShellRockTop'),('Cavern_ShellRock','Cavern_ShellRock'),('Cavern_ShellSkin','Cavern_ShellSkin'),('Cavern_ShellPillar','Cavern_ShellPillar'),
 ('Cavern_ShellVein','Cavern_ShellVein'),('Cavern_Rubble','Cavern_Rubble'),('Cavern_Timber','Cavern_Timber'),('Cavern_TorchFlame','Cavern_TorchFlame'),('Cavern_Torch','Cavern_Torch'),
 ('Cavern_Rail','Cavern_Rail'),('Cavern_FurnishingCart','Cavern_FurnishingCart'),('Cavern_Furnishing','Cavern_Furnishing')]
finals=set()
for pre,final in GROUPS:
 parts=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith(pre) and o.name not in finals]
 if not parts:continue
 finals.add(join(parts,final).name)
left=[o.name for o in bpy.context.scene.objects if o.type=='MESH' and o.name not in finals]
assert not left,left
bpy.context.view_layer.update()
model=OUT/'cavern'
bpy.ops.wm.save_as_mainfile(filepath=str(model.with_suffix('.blend')))
bpy.ops.export_scene.gltf(filepath=str(model.with_suffix('.glb')),export_format='GLB',export_yup=True)
ms=[o for o in bpy.context.scene.objects if o.type=='MESH']
corners=[o.matrix_world@Vector(c) for o in ms for c in o.bound_box]
dims=[max(v[i] for v in corners)-min(v[i] for v in corners) for i in range(3)]
tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in ms)
mats=sorted({s.material.name for o in ms for s in o.material_slots if s.material})
report={'id':'cavern','prefix':'Cavern_','triangles':tris,'materials':len(mats),'materialNames':mats,'dimensionsTiles':{'x':round(dims[0],2),'z':round(dims[1],2),'y':round(dims[2],2)},
 'placement':{'x':200,'y':-30,'z':60},'sockets':{nm:[x,0,z] for nm,(x,z) in SOCKETS},
 'meshes':{o.name:sum(len(p.vertices)-2 for p in o.data.polygons) for o in ms}}
(PROOF/'asset_report.json').write_text(json.dumps(report,indent=2))
print('[CAVERN_V1] tris',tris,'materials',len(mats),'dims',[round(d,2) for d in dims],'meshes',len(ms))

# ---------------- proof renders (workbench, studio light, material colours); socket markers are render-only ----------------
for nm,(x,z) in SOCKETS:
 kind=M['tin'] if 'Tin' in nm else M['copper']
 boulder('ProofSocketMarker',(x,.3,z),.42,.36,.4,14,y0=0,mats=[M['rock'],kind,M['rock_d']],rule=lambda p:1 if rng.random()<.4 else 0)
sc=bpy.context.scene;sc.world=bpy.data.worlds.new('ProofSky');sc.world.color=(.05,.05,.06);sc.render.engine='BLENDER_WORKBENCH';sc.display.shading.light='STUDIO';sc.display.shading.color_type='MATERIAL'
sc.display.shading.show_shadows=True;sc.display.shading.show_cavity=True;sc.render.resolution_x=1000;sc.render.resolution_y=760
cam=bpy.data.objects.new('ProofCam',bpy.data.cameras.new('ProofCam'));sc.collection.objects.link(cam);sc.camera=cam
def look(name,eye,target,hide=(),ortho=None,lens=30):
 for o in sc.objects:
  if o.type=='MESH':o.hide_render=any(o.name.startswith(h) for h in hide)
 cam.data.type='ORTHO' if ortho else 'PERSP'
 if ortho:cam.data.ortho_scale=ortho
 cam.data.lens=lens
 e=Vector((eye[0],-eye[2],eye[1]));t=Vector((target[0],-target[2],target[1]))
 cam.location=e;cam.rotation_euler=(t-e).to_track_quat('-Z','Y').to_euler()
 sc.render.filepath=str(PROOF/('view_'+name+'.png'));bpy.ops.render.render(write_still=True)
CUT=('Cavern_Roof',)
views=[('cutaway_top',(0,30,.001),(0,0,0),CUT+('Cavern_ShellSkin',),20.5),('interior_ore_face',(-3.5,9.5,3.5),(3.0,0,-3.8),CUT,None),
 ('interior_smelting',(0.5,8.5,-1.0),(4.6,.6,4.4),CUT,None),('interior_ladder',(-2.0,7.5,-2.2),(-7.2,1.2,.5),CUT,None),
 ('exterior',(-17,15,17),(0,1.5,0),(),None),('cutaway_3q',(-12,17,14),(.5,0,-.5),CUT,None)]
for v in views:look(*v)
tiles=[]
order=['cutaway_top','interior_ore_face','interior_smelting','interior_ladder','exterior','cutaway_3q']
for v in order:
 im=bpy.data.images.load(str(PROOF/('view_'+v+'.png')));tiles.append(np.array(im.pixels[:],dtype=np.float32).reshape(im.size[1],im.size[0],4))
h,w=tiles[0].shape[:2];sheet=np.zeros((h*2,w*3,4),dtype=np.float32)
for i,a in enumerate(tiles):r,c=divmod(i,3);sheet[(1-r)*h:(2-r)*h,c*w:(c+1)*w]=a
img=bpy.data.images.new('sheet',w*3,h*2,alpha=True);img.pixels=sheet.ravel();img.filepath_raw=str(PROOF/'sheet.png');img.file_format='PNG';img.save()
print('[CAVERN_V1_VIEWS] done')
