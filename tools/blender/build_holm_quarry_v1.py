"""Quarry Gate v1 (M4.4 building brief, 2026-09-24): plan.json places[id=mine], local origin = plan (36,33), y=0 at the
threshold-hall floor. Rock-cut portal house (stone walls, stone-cap roof with coping parapet and an open winch well),
an offset two-level timber-framed winch tower (jettied west, gable roof, winch drum + spoked wheel in the loft, head
frame and sheave over the well), a low smithy lean-to (repair bench, forge, anvil), and a faceted quarry outcrop that
is the rear enclosure with a timber-propped tunnel mouth going dark into the rock.
Style and helper patterns follow build_holm_guide_house_overhaul_v2.py (wall with real voids, stone_facing relief,
tile laying, timber framing on a metre rhythm). Original design; no reference geometry copied.
Game (x, y-up, z south) -> Blender (x, -z, y). Deterministic (seeded random only).
Run: blender -b --python tools/blender/build_holm_quarry_v1.py
"""
import bpy,json,math,random,bmesh,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'.studio-workspaces/holm-quarry-v1/candidates'
PROOF=ROOT/'scratchpad/holm_quarry_v1'
OUT.mkdir(parents=True,exist_ok=True);PROOF.mkdir(parents=True,exist_ok=True)
P='Quarry_'
bpy.ops.wm.read_factory_settings(use_empty=True)
def material(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);return m
stone=material('Quarry fieldstone',(.43,.46,.40));stone_light=material('Quarry stone lit faces',(.52,.54,.46));stone_dark=material('Quarry stone shaded faces',(.37,.40,.35))
sillmat=material('Quarry dressed sandstone',(.57,.53,.42));wood=material('Quarry aged oak',(.30,.20,.12));timber=material('Quarry dark frame oak',(.22,.15,.09))
plaster=material('Quarry limewash plaster',(.80,.74,.60));boards=material('Quarry floorboards',(.43,.32,.20));flags=material('Quarry worn flagstone',(.40,.39,.35))
rock=material('Quarry rock face',(.53,.46,.36));rock_light=material('Quarry rock lit top',(.64,.57,.44));rock_dark=material('Quarry rock shadow',(.33,.28,.22))
cave=material('Quarry cave dark',(.035,.03,.028));iron=material('Quarry iron',(.20,.21,.22));rope=material('Quarry hemp rope',(.55,.45,.28))
ore=material('Quarry copper ore',(.58,.34,.18));roofmat=material('Quarry clay',(.39,.22,.17));tile_light=material('Quarry clay tile warm',(.45,.27,.19))
tile_dark=material('Quarry clay tile cool',(.33,.19,.15));ember=material('Quarry forge ember',(.92,.42,.10))
root=bpy.data.objects.new('Quarry_Gate',None);bpy.context.collection.objects.link(root)
rng=random.Random(3633)

# ---------------- helpers (house v2 patterns) ----------------
def fix(o):
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free();return o
def mesh(name,vertices,faces,mat):
 data=bpy.data.meshes.new(name);data.from_pydata([(x,-z,y) for x,y,z in vertices],[],faces);data.update()
 obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.parent=root;obj.data.materials.append(mat);return obj
BOXF=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)]
def prism(name,x0,x1,y0,y1,z0,z1,mat):
 return mesh(name,[(x0,y0,z0),(x1,y0,z0),(x1,y1,z0),(x0,y1,z0),(x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)],BOXF,mat)
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
def cyl(name,a,b,r,seg,mat,phase=0):
 a=Vector(a);b=Vector(b);ax=(b-a).normalized();u=ax.cross(Vector((0,1,0)))
 if u.length<.01:u=ax.cross(Vector((1,0,0)))
 u.normalize();v=ax.cross(u)
 ring=[u*math.cos(phase+i*math.tau/seg)*r+v*math.sin(phase+i*math.tau/seg)*r for i in range(seg)]
 verts=[tuple(a+q) for q in ring]+[tuple(b+q) for q in ring]
 faces=[tuple(range(seg-1,-1,-1)),tuple(range(seg,2*seg))]+[(i,(i+1)%seg,seg+(i+1)%seg,seg+i) for i in range(seg)]
 return mesh(name,verts,faces,mat)
def poly_prism(name,pts,y0,y1,mat):
 n=len(pts);verts=[(x,y0,z) for x,z in pts]+[(x,y1,z) for x,z in pts]
 faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)]
 return mesh(name,verts,faces,mat)
def clip(poly,a,b,c):
 # Sutherland-Hodgman: keep a*x+b*z+c>=0
 out=[]
 for i in range(len(poly)):
  p=poly[i];q=poly[(i+1)%len(poly)];fp=a*p[0]+b*p[1]+c;fq=a*q[0]+b*q[1]+c
  if fp>=0:out.append(p)
  if (fp>=0)!=(fq>=0):t=fp/(fp-fq);out.append((p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t))
 return out
def inside(poly,x,z):
 s=None
 for i in range(len(poly)):
  p=poly[i];q=poly[(i+1)%len(poly)];c=(q[0]-p[0])*(z-p[1])-(q[1]-p[1])*(x-p[0])
  if abs(c)<1e-9:continue
  if s is None:s=c>0
  elif s!=(c>0):return False
 return True
PORTAL=[(-5,-3),(1,-4),(3,-2),(3,2),(0,3),(-5,3)]
CX=sum(p[0] for p in PORTAL)/6;CZ=sum(p[1] for p in PORTAL)/6
def frame(p0,p1,centre=(CX,CZ)):
 dx,dz=p1[0]-p0[0],p1[1]-p0[1];L=math.hypot(dx,dz);d=(dx/L,dz/L);n=(d[1],-d[0])
 mx,mz=(p0[0]+p1[0])/2,(p0[1]+p1[1])/2
 if n[0]*(mx-centre[0])+n[1]*(mz-centre[1])<0:n=(-n[0],-n[1])
 return d,n,L
def obox(name,p0,d,n,u0,u1,v0,v1,w0,w1,mat):
 def pt(u,v,w):return (p0[0]+d[0]*u+n[0]*w,v,p0[1]+d[1]*u+n[1]*w)
 return mesh(name,[pt(u0,v0,w0),pt(u1,v0,w0),pt(u1,v1,w0),pt(u0,v1,w0),pt(u0,v0,w1),pt(u1,v0,w1),pt(u1,v1,w1),pt(u0,v1,w1)],BOXF,mat)
def wall_seg(name,p0,p1,base,height,holes,mat,t=.35,ext=None,centre=(CX,CZ)):
 d,n,L=frame(p0,p1,centre);ext=t/2 if ext is None else ext
 us=sorted(set([-ext,L+ext]+[q for h in holes for q in h[:2]]));vs=sorted(set([base,base+height]+[q for h in holes for q in h[2:]]))
 parts=[]
 for a,b in zip(us,us[1:]):
  for c,e in zip(vs,vs[1:]):
   u=(a+b)/2;v=(c+e)/2
   if any(h[0]<u<h[1] and h[2]<v<h[3] for h in holes):continue
   parts.append(obox(name,p0,d,n,a,b,c,e,-t/2,t/2,mat))
 return join(parts,name)
def facing_seg(name,p0,p1,base,height,holes,centre=(CX,CZ),ua=-.175,ub=None):
 # the v2 hand-cut relief skin, on an arbitrary wall segment (outward side)
 d,n,L=frame(p0,p1,centre);ub=L+.175 if ub is None else ub
 r=random.Random(name+str(p0));vertices=[];faces=[];ids=[]
 def point(u,v,depth):return (p0[0]+d[0]*u+n[0]*depth,v,p0[1]+d[1]*u+n[1]*depth)
 for row in range(math.ceil(height/.36)):
  low=base+row*.36;high=min(base+height,low+.36);u=ua+(r.uniform(0,.35) if row%2 else 0)
  if u>ua:
   segs0=[(ua,u,low,high)]
  else:segs0=[]
  while True:
   if segs0:segments=segs0;segs0=[];right=u
   else:
    if u>=ub-.01:break
    right=min(ub,u+r.uniform(.58,1.05));segments=[(u,right,low,high)]
   for a,b,c,e in holes:
    nxt=[]
    for l,rr,lo,hi in segments:
     if rr<=a or l>=b or hi<=c or lo>=e:nxt.append((l,rr,lo,hi));continue
     if l<a:nxt.append((l,a,lo,hi))
     if rr>b:nxt.append((b,rr,lo,hi))
     if lo<c:nxt.append((max(l,a),min(rr,b),lo,c))
     if hi>e:nxt.append((max(l,a),min(rr,b),e,hi))
    segments=nxt
   for l,rr,lo,hi in segments:
    l+=.012;rr-=.012;lo+=.012;hi-=.012
    if rr-l<.04 or hi-lo<.04:continue
    bev=min(.045,(rr-l)/5,(hi-lo)/5);k=len(vertices)
    outline=[(l+bev,lo),(rr-bev,lo),(rr,lo+bev),(rr,hi-bev),(rr-bev,hi),(l+bev,hi),(l,hi-bev),(l,lo+bev)]
    vertices.extend(point(a,b,.178) for a,b in outline)
    vertices.extend(point(a+(1 if a<(l+rr)/2 else -1)*.015,b+(1 if b<(lo+hi)/2 else -1)*.015,.205+r.uniform(0,.018)) for a,b in outline)
    faces.append(tuple(k+8+i for i in range(8)));ids.append(r.choice([0,0,0,1,2]))
    for i in range(8):faces.append((k+i,k+(i+1)%8,k+8+(i+1)%8,k+8+i));ids.append(1 if i in [3,4] else 2)
   u=right
 o=mesh(name,vertices,faces,stone);o.data.materials.append(stone_light);o.data.materials.append(stone_dark)
 for p,index in zip(o.data.polygons,ids):p.material_index=index
 return o
def window_dress(g,p0,p1,a,b,c,e,shutters=True,centre=(CX,CZ),inner=.3):
 d,n,L=frame(p0,p1,centre)
 obox(g+'Sill',p0,d,n,a-.12,b+.12,c-.13,c,-min(inner,.3),.3,sillmat);obox(g+'Lintel',p0,d,n,a-.13,b+.13,e,e+.16,-min(inner,.23),.25,sillmat)
 for s in (a+.055,b-.055):obox(g+'Jamb',p0,d,n,s-.055,s+.055,c,e,-.19,.19,wood)
 obox(g+'Head',p0,d,n,a,b,e-.1,e,-.19,.19,wood);obox(g+'Mullion',p0,d,n,(a+b)/2-.04,(a+b)/2+.04,c,e,-.08,.08,wood)
 obox(P+'GlazingPane',p0,d,n,a,b,c,e,-.02,.0,iron)
 if shutters:
  w=(b-a)/2
  for s0,s1 in [(a-w-.04,a-.04),(b+.04,b+w+.04)]:
   obox(g+'Shutter',p0,d,n,s0,s1,c+.02,e-.02,.21,.25,wood)
   for vv in (c+.25,e-.25):obox(g+'ShutterBrace',p0,d,n,s0+.03,s1-.03,vv-.04,vv+.04,.25,.27,timber)

# ---------------- ground plan ----------------
H=4.4         # stair-hall wall height (west bay; roof deck 4.40..4.62) - clears the stair head
RT=4.62       # stair-hall roof top
HL=3.4        # threshold-hall wall height (east bay; roof deck 3.40..3.62)
RTL=3.62
SPLIT=-2.9    # the stair hall (x<=SPLIT) stands a course higher than the threshold hall
COURT_Z=1.2   # north of this the threshold hall is an open rock-cut court in front of the cave mouth
def zf(x):return -3-(x+5)/6        # rock line (the portal house north edge)
S=P+'Shell'
# floor slabs
poly_prism(P+'Floor',PORTAL,-.35,0,flags)
# stone walls with real voids, relief facing, plinth, dressed openings
ARCH=(.2,2.6,0,3.0)
walls=[('W',(-5,3),(-5,-4),[[1.6,2.2,2.5,3.4]],H),
 ('SW',(-5,3),(SPLIT,3),[[.8,1.7,1.2,2.3]],H),
 ('S',(SPLIT,3),(0,3),[list(ARCH)],HL),
 ('SE',(0,3),(3,2),[[1.0,2.2,1.2,2.3]],HL),
 ('E',(3,2),(3,-2),[[.7,2.3,0,2.3]],HL),
 ('NE',(3,-2),(1,-4),[],HL)]
for side,p0,p1,holes,hh in walls:
 wall_seg(S+side,p0,p1,0,hh,holes,stone)
 fh=[list(h) for h in holes]
 if side=='S':fh[0][3]=3.32
 facing_seg(S+side+'Facing',p0,p1,.2,hh-.2,fh)
 d,n,L=frame(p0,p1)
 H0=hh
 # plinth course meeting the terrain (terrain is 0.15 below the floor)
 for a,b in [(-.2,L+.2)]:
  cuts=sorted([(h[0],h[1]) for h in holes if h[2]<=0])
  us=[a]+[q for c in cuts for q in c]+[b]
  for i in range(0,len(us),2):obox(S+side+'Plinth',p0,d,n,us[i],us[i+1],-.5,.2,.1,.29,stone_dark)
 # top course under the roof slab
 obox(S+side+'Cornice',p0,d,n,-.2,L+.2,H0-.18,H0,.12,.3,sillmat)
wall_seg(S+'TowerNorth',(-5,-4),(-2,-4),0,H,[],stone,centre=(-3.5,-2))
# the step between the two roof heights: a short stone wall on the lower roof, faced on its east side
wall_seg(S+'RoofStep',(SPLIT,3),(SPLIT,0),HL,H-HL,[],stone,centre=(-4,1.5))
facing_seg(S+'RoofStepFacing',(SPLIT,3),(SPLIT,0),HL,H-HL,[],centre=(-4,1.5))
window_dress(S+'Window',(-5,3),(SPLIT,3),.8,1.7,1.2,2.3,inner=.12)
window_dress(S+'Window',(0,3),(3,2),1.0,2.2,1.2,2.3)
window_dress(S+'Window',(-5,3),(-5,-4),1.6,2.2,2.5,3.4,shutters=False,inner=.12)
# lean-to door dressing (east wall)
d,n,L=frame((3,2),(3,-2))
obox(S+'DoorLintel',(3,2),d,n,.55,2.45,2.3,2.48,-.24,.26,sillmat)
for s in (.7,2.3):obox(S+'DoorJamb',(3,2),d,n,s-.08,s+.08,0,2.3,-.2,.2,wood)
# rock-cut main arch: segmental head (springing 2.4, crown 3.0) filled back to a square head, with voussoirs
AX0=SPLIT
d,n,L=frame((AX0,3),(0,3));ua,ub=ARCH[0],ARCH[1];uc=(ua+ub)/2;R=(1.2**2+.6**2)/(2*.6);yc=3.0-R
def arc(k,m=8):
 a0=math.asin(1.2/R);ang=-a0+2*a0*k/m;return (uc+R*math.sin(ang),yc+R*math.cos(ang))
fill=[]
for half in [(0,4),(4,8)]:
 pts=[arc(k) for k in range(half[0],half[1]+1)]
 top=[(pts[-1][0],3.02),(pts[0][0],3.02)]
 prof=pts+top;m=len(prof)
 verts=[(AX0+d[0]*u+n[0]*w,v,3+d[1]*u+n[1]*w) for w in (-.175,.2) for u,v in prof]
 fill.append(mesh(S+'ArchFill',verts,[tuple(range(m-1,-1,-1)),tuple(range(m,2*m))]+[(i,(i+1)%m,m+(i+1)%m,m+i) for i in range(m)],stone))
for k in range(8):
 (u0,v0),(u1,v1)=arc(k),arc(k+1);a0=math.atan2(u0-uc,v0-yc);a1=math.atan2(u1-uc,v1-yc);Ro=R+.3+(.06 if k in (3,4) else 0)
 prof=[(u0,v0),(u1,v1),(uc+Ro*math.sin(a1),yc+Ro*math.cos(a1)),(uc+Ro*math.sin(a0),yc+Ro*math.cos(a0))]
 prof=[(uu+(.012 if i in (0,3) else -.012),vv) for i,(uu,vv) in enumerate(prof)]
 verts=[(AX0+d[0]*u+n[0]*w,v,3+d[1]*u+n[1]*w) for w in (-.2,.25) for u,v in prof]
 mesh(S+'ArchVoussoir',verts,[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],sillmat)
for u in (ua,ub):obox(S+'ArchImpost',(AX0,3),d,n,u-.22 if u==ua else u,u if u==ua else u+.22,2.3,2.45,-.24,.27,sillmat)
for u in (ua-.3,ub):obox(S+'ArchQuoin',(AX0,3),d,n,u,u+.3,0,2.3,.15,.24,sillmat)
# stone hood over the arch: a small gable of slabs on corbels
hx0,hx1,hz1=-3.05,.05,3.85;hy=3.05;hr=3.72;hxm=(hx0+hx1)/2
for s0,s1 in [(hx0,hxm),(hxm,hx1)]:
 ye0=hy if s0==hx0 else hr;ye1=hr if s0==hx0 else hy
 o=mesh(P+'RoofHood',[(s0,ye0,3.15),(s1,ye1,3.15),(s1,ye1,hz1),(s0,ye0,hz1)],[(0,1,2,3)],stone_light);sm=o.modifiers.new('s','SOLIDIFY');sm.thickness=.14
mesh(P+'RoofHoodGable',[(hx0+.15,hy,hz1-.12),(hx1-.15,hy,hz1-.12),(hxm,hr-.1,hz1-.12),(hx0+.15,hy,3.15),(hx1-.15,hy,3.15),(hxm,hr-.1,3.15)],[(0,1,2),(5,4,3),(0,3,4,1),(1,4,5,2),(2,5,3,0)],stone)
for x in (hx0+.25,hx1-.25):prism(P+'RoofHoodCorbel',x-.12,x+.12,2.75,3.05,3.15,3.6,sillmat)
beam(P+'RoofHoodRidge',(hxm,hr+.04,3.15),(hxm,hr+.04,hz1+.05),.16,.12,stone_dark)

# ---------------- threshold, approach ----------------
prism(P+'StepSill',-2.75,-.25,-.12,0,2.82,3.42,sillmat)
APP=[(-2.95,3.42),(-.05,3.42),(.55,6.9),(-3.55,6.9)]
z=3.44
while z<6.9:
 zh=rng.uniform(.5,.7);x=-3.7+rng.uniform(0,.3)
 while x<.7:
  w=rng.uniform(.55,.9)
  if all(inside(APP,a,b) for a in (x+.03,x+w-.03) for b in (z+.03,z+zh-.03)):prism(P+'FloorApproach',x+.025,x+w-.025,-.2,-.1+rng.uniform(-.015,0),z+.025,z+zh-.025,rng.choice([flags,flags,stone_light]))
  x+=w
 z+=zh
for (ax,az),(bx,bz),s in [((-2.95,3.42),(-3.55,6.9),-1),((-.05,3.42),(.55,6.9),1)]:
 d,n,L=frame((ax,az),(bx,bz),centre=(-1.5,5));u=0
 while u<L-.1:
  e=min(L,u+rng.uniform(.42,.6));obox(P+'FurnishingKerb',(ax,az),d,n,u+.03,e-.03,-.2,-.03+rng.uniform(-.02,.01),.02,.24,stone_dark);u=e

# ---------------- tunnel mouth: dressed piers, timber sets, dark depth ----------------
TX0,TX1=-1.7,.7
MY=4.0   # the mouth is a tall rock-cut portal; its ceiling slopes down into the dark
for x0,x1 in [(-2.15,-1.6),(.6,1.15)]:prism(S+'MouthPier',x0,x1,0,MY,-3.98,-3.42,sillmat)
for x0,x1 in [(-2.15,-1.6),(.6,1.15)]:
 for yy in (.9,1.9,2.9):prism(S+'MouthPierCourse',x0-.02,x1+.02,yy,yy+.06,-4.0,-3.4,stone_dark)
prism(S+'MouthLintel',-2.3,1.3,MY,MY+.5,-4.02,-3.4,sillmat);prism(S+'MouthKey',-.74,-.26,MY-.08,MY+.66,-4.06,-3.34,stone_light)
for x0 in (-2.3,.9):prism(S+'MouthLintelEnd',x0,x0+.4,MY+.5,MY+.62,-4.0,-3.42,stone_dark)
poly_prism(P+'FloorTunnel',[(TX0,-5.2),(TX1,-5.2),(TX1,-3.5),(TX0,-3.5)],-.3,-.005,rock_dark)
prism(P+'FloorTunnelShade',TX0,TX1,-.3,-.004,-5.2,-4.3,cave)
poly_prism(P+'FloorTunnelDeep',[(TX0,-6.75),(TX1,-6.75),(TX1,-5.2),(TX0,-5.2)],-.3,-.005,cave)
SH=P+'ServiceShaft_'
def ceil_y(z):return MY if z>-3.45 else max(2.75,MY-(-3.45-z)*(MY-2.75)/1.55)
for z0,z1,m in [(-3.75,-3.45,rock_dark),(-6.75,-3.75,cave)]:
 g=P+'CaveLining' if m is rock_dark else SH+'Depth'
 prism(g,-2.05,TX0,-.3,MY+.1,z0,z1,m);prism(g,TX1,1.05,-.3,MY+.1,z0,z1,m)
 zs=[z0,z1]+[q for q in (-5.0,) if z0<q<z1];zs=sorted(zs)
 for za,zb in zip(zs,zs[1:]):
  ya,yb=ceil_y(za),ceil_y(zb)
  mesh(g,[(-2.05,ya,za),(1.05,ya,za),(1.05,yb,zb),(-2.05,yb,zb),(-2.05,ya+.3,za),(1.05,ya+.3,za),(1.05,yb+.3,zb),(-2.05,yb+.3,zb)],BOXF,m)
prism(SH+'Depth',-2.05,1.05,-.3,3.0,-6.9,-6.75,cave)
# timber sets: the tall mouth set is the click target; lower sets step down into the dark
for z,wt,h,g in [(-3.72,.26,MY-.25,SH+'MouthSet'),(-4.6,.2,2.8,P+'CaveProps'),(-5.6,.18,2.5,P+'CaveProps')]:
 mt=wood if z>-4 else timber
 for x in (-1.45,.45):prism(g,x-wt/2,x+wt/2,0,h,z-wt/2,z+wt/2,mt)
 prism(g,-1.72,.72,h,h+wt+.02,z-wt/2-.02,z+wt/2+.02,mt)
 for x in (-1.35,.35):beam(g,(x,h-.5,z),(x+(.35 if x<0 else -.35),h-.01,z),.1,.1,timber)
for i in range(7):
 x=-1.55+i*.35;prism(P+'CaveProps',x,x+.3,2.68,2.74,-6.2,-5.1,timber)   # ceiling lagging in the deep part
for x in (-.9,-.1):prism(P+'CaveRail',x-.03,x+.03,-.005,.05,-6.75,-5.05,iron)
for z in [-5.2-.4*i for i in range(4)]:prism(P+'CaveRail',-1.1,.1,-.005,.03,z-.08,z+.08,timber)
# mine cart deep in the tunnel with a heap of ore
prism(P+'CaveCart',-.95,-.05,.22,.85,-6.45,-5.55,wood)
for z in (-6.3,-5.7):prism(P+'CaveCartBand',-.98,-.02,.3,.8,z-.03,z+.03,iron)
for x,z in [(-.95,-5.72),(-.95,-6.28),(-.05,-5.72),(-.05,-6.28)]:cyl(P+'CaveCartWheel',(x-.05 if x<-.5 else x+.05,.16,z),(x+.03 if x<-.5 else x-.03,.16,z),.15,8,iron)
prism(P+'CaveCartOre',-.88,-.12,.85,.98,-6.38,-5.62,ore)
# lanterns on the mouth set
for x in (-1.45,.45):
 prism(SH+'Lantern',x-.12,x+.12,1.75,2.05,-3.47,-3.25,iron);prism(SH+'Lantern',x-.07,x+.07,1.8,2.0,-3.44,-3.28,ember)
# hanging descent sign under the cap
for x in (-.85,-.15):beam(SH+'SignChain',(x,MY-.25,-3.6),(x,3.4,-3.6),.025,.025,iron)
prism(SH+'Sign',-.95,-.05,3.0,3.4,-3.63,-3.57,wood)

# ---------------- stone-cap roofs: slab decks at two heights, slab courses, coping parapets; open court behind ----------------
PA=clip(clip(PORTAL,1,0,2),0,1,-COURT_Z)                  # threshold hall: x >= -2, z >= COURT_Z
PB=clip(clip(clip(PORTAL,1,0,-SPLIT),-1,0,-2),0,1,0)      # the bay between stair hall and tower: SPLIT <= x <= -2, z >= 0
P2=clip(clip(PORTAL,-1,0,SPLIT),0,1,0)                    # stair hall: x <= SPLIT, z >= 0
for pc,y0,y1 in [(PA,HL,RTL),(PB,HL,RTL),(P2,H,RT)]:poly_prism(P+'RoofDeck',pc,y0,y1,stone)
def lay_slabs(poly,top):
 z=min(p[1] for p in poly)-.1
 while z<max(p[1] for p in poly):
  x=min(p[0] for p in poly)-.3+rng.uniform(0,.4);zh=rng.uniform(.5,.62)
  while x<max(p[0] for p in poly):
   w=rng.uniform(.55,.85)
   if all(inside(poly,a,b) for a in (x+.08,x+w-.08) for b in (z+.08,z+zh-.08)):
    prism(P+'RoofSlab',x+.02,x+w-.02,top,top+rng.uniform(.04,.08),z+.02,z+zh-.02,rng.choice([stone,stone_light,stone_light,stone_dark]))
   x+=w
  z+=zh
for pc,top in [(PA,RTL),(PB,RTL),(P2,RT)]:lay_slabs(pc,top)
# parapets with individual coping stones along the open edges
par=[((-5,0),(-5,3),RT),((-5,3),(SPLIT,3),RT),((SPLIT,3),(SPLIT,0),RT),((SPLIT,3),(0,3),RTL),((0,3),(3,2),RTL),((3,2),(3,COURT_Z),RTL),
 ((3,COURT_Z),(3,-2),HL),((3,-2),(1,-4),HL),((3,COURT_Z),(-2,COURT_Z),RTL-.02),((-2,COURT_Z),(-2,0),RTL-.02)]
for p0,p1,base in par:
 d,n,L=frame(p0,p1,centre=(-4,1.5) if p0[0]==SPLIT and p1[0]==SPLIT else (CX,CZ))
 low=(p1[1]==COURT_Z and p0[1]==COURT_Z) or (p0[0]==-2 and p1[0]==-2)
 hp=.22 if low else .42
 obox(P+'RoofParapet',p0,d,n,-.17,L+.17,base,base+hp,-.17,.19,stone)
 u=-.2
 while u<L+.2:
  e=min(L+.22,u+rng.uniform(.5,.8));obox(P+'RoofCoping',p0,d,n,u+.015,e-.015,base+hp,base+hp+.14,-.25,.27,sillmat);u=e
 if not low:
  for s in [L*.3,L*.75] if L>3 else []:obox(P+'RoofSpout',p0,d,n,s-.1,s+.1,base-.1,base+.06,.2,.62,stone_dark)
# the open court edge: an oak summer beam under the deck edge, on a post with knee braces
prism(S+'CourtBeam',-2.05,3.0,HL-.32,HL,COURT_Z-.02,COURT_Z+.26,timber)
prism(S+'CourtPost',.87,1.13,0,HL-.32,COURT_Z+.0,COURT_Z+.26,timber);prism(S+'CourtPostPad',.8,1.2,0,.12,COURT_Z-.05,COURT_Z+.31,sillmat)
for s in (-1,1):beam(S+'CourtBrace',(1.0,HL-1.0,COURT_Z+.13),(1.0+s*.7,HL-.34,COURT_Z+.13),.11,.11,timber)

# ---------------- head frame and sheave over the court ----------------
HZ=-2.72;AX=.1;AY=6.55
prism(S+'HeadFrameLedger',-1.84,-1.6,3.55,3.75,HZ-.9,HZ+.9,timber)
for zz in (HZ-.55,HZ+.55):
 fx=zz+5-.05                                   # on the NE wall coping
 beam(P+'RoofHeadFrame',(-1.72,3.75,zz),(AX-.12,AY,HZ+(zz-HZ)*.3),.2,.2,wood)
 beam(P+'RoofHeadFrame',(fx,HL+.56,zz),(AX+.12,AY,HZ+(zz-HZ)*.3),.2,.2,wood)
 beam(P+'RoofHeadFrame',(-1.2,4.8,zz),(fx-.55,4.8,zz),.14,.14,timber)
beam(P+'RoofHeadFrame',(AX,AY+.1,HZ-.4),(AX,AY+.1,HZ+.4),.26,.26,timber)
beam(P+'RoofHeadFrame',(-1.84,5.9,HZ),(AX-.25,AY-.05,HZ),.16,.16,wood)      # strut back to the tower wall
SHC=(AX,AY-.48,HZ);SR=.42
def wheel(g,c,axis,r,spokes,rimseg,mat,rimw=.1):
 c=Vector(c);ax=Vector(axis).normalized();u=ax.cross(Vector((0,1,0)))
 if u.length<.01:u=ax.cross(Vector((1,0,0)))
 u.normalize();v=ax.cross(u)
 pts=[c+u*math.cos(i*math.tau/rimseg)*r+v*math.sin(i*math.tau/rimseg)*r for i in range(rimseg)]
 for i in range(rimseg):beam(g,tuple(pts[i]),tuple(pts[(i+1)%rimseg]),rimw,rimw*1.3,mat)
 for i in range(spokes):
  q=c+u*math.cos(i*math.tau/spokes)*r*.95+v*math.sin(i*math.tau/spokes)*r*.95;beam(g,tuple(c),tuple(q),rimw*.7,rimw*.7,mat)
 cyl(g,tuple(c-ax*.12),tuple(c+ax*.12),r*.18,8,iron)
wheel(P+'RoofSheave',SHC,(0,0,1),SR,6,12,wood,.08)
cyl(P+'RoofSheave',(AX,SHC[1],HZ-.3),(AX,SHC[1],HZ+.3),.05,6,iron)
# rope: drum -> sheave top, sheave -> down the well to an ore bucket
DRUM_Y=4.9;DRUM_Z=-3.2
beam(P+'RoofRope',(-2.75,DRUM_Y+.3,DRUM_Z),(AX,SHC[1]+SR+.03,HZ),.04,.04,rope)
beam(P+'FurnishingRope',(AX+SR+.02,SHC[1],HZ),(AX+SR+.02,3.05,HZ),.045,.045,rope)
bx=AX+SR+.02
cyl(P+'FurnishingBucket',(bx,2.45,HZ),(bx,2.9,HZ),.26,8,wood);cyl(P+'FurnishingBucketBand',(bx,2.52,HZ),(bx,2.6,HZ),.27,8,iron);cyl(P+'FurnishingBucketBand',(bx,2.76,HZ),(bx,2.84,HZ),.27,8,iron)
beam(P+'FurnishingBucketBail',(bx-.26,2.9,HZ),(bx,3.05,HZ),.03,.03,iron);beam(P+'FurnishingBucketBail',(bx+.26,2.9,HZ),(bx,3.05,HZ),.03,.03,iron)
prism(P+'FurnishingBucketOre',bx-.2,bx+.2,2.88,2.98,HZ-.2,HZ+.2,ore)

# ---------------- winch tower: open ground bay, loft floor, stair ----------------
TW0,TW1,TN,TS=-5,-2,-4,0
for x,z in [(-2,.0),(-2,-3.83)]:prism(S+'TowerPost',x-.13,x+.13,0,2.8,z-.13,z+.13,timber)
prism(S+'TowerBeam',-2.14,-1.86,2.52,2.8,-4.0,.13,timber)
for z,s in [(0,-1),(-3.83,1)]:beam(S+'TowerBrace',(-2,2.0,z),(-2,2.52,z+s*.6),.12,.12,timber)
SZ0=2.0;STEP=.35;NT=12;STW=(-4.825,-3.6)
LOFT_Z1=SZ0-STEP*NT      # -2.2: the stair lands here
LOFT_EXT=-1.4            # beside the stairwell the loft runs further south (room for the winch stance)
prism(P+'UpperFloor',-4.825,-2.175,2.62,2.8,-3.825,LOFT_Z1,boards);prism(P+'UpperFloorExt',-3.6,-2.175,2.62,2.8,LOFT_Z1-.01,LOFT_EXT,boards)
for x in [-4.6+.55*i for i in range(5)]:prism(P+'UpperStructureJoist',x-.07,x+.07,2.44,2.62,-3.825,LOFT_EXT if x>-3.5 else LOFT_Z1,timber)
prism(P+'UpperStructureTrimmer',-4.825,-3.6,2.44,2.8,LOFT_Z1-.12,LOFT_Z1+.0,timber);prism(P+'UpperStructureTrimmer',-3.6,-2.175,2.44,2.8,LOFT_EXT-.12,LOFT_EXT,timber)
for i in range(NT):
 z1=SZ0-i*STEP;z0=z1-STEP;y=(i+1)*2.8/NT;prism(P+'Stair'+str(i),STW[0],STW[1],y-.16,y,z0,z1,wood)
 prism(P+'FurnishingStairRiser'.replace('Stair','Tread'),STW[0]+.02,STW[1]-.02,max(0,y-.16-2.8/NT+.02),y-.16,z1-.05,z1,timber)
mesh(P+'FurnishingStringer',[(-3.6,0,SZ0),(-3.6,2.62,LOFT_Z1),(-3.6,2.84,LOFT_Z1),(-3.6,.22,SZ0),(-3.48,0,SZ0),(-3.48,2.62,LOFT_Z1),(-3.48,2.84,LOFT_Z1),(-3.48,.22,SZ0)],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],timber)
for i in range(5):
 z=SZ0-.2-i*(SZ0-LOFT_Z1-.55)/4;y=(SZ0-z)*2.8/(SZ0-LOFT_Z1);prism(P+'FurnishingRailPost',-3.59,-3.49,y,y+.95,z-.05,z+.05,wood)
beam(P+'FurnishingRail',(-3.54,.98,SZ0-.1),(-3.54,.98+(SZ0-LOFT_Z1-.3)*2.8/(SZ0-LOFT_Z1),LOFT_Z1+.3),.08,.08,wood)
# loft edge rails (stairwell side and the open east side)
for x in [-3.45,-2.9,-2.3]:prism(P+'UpperFurnishingRailPost',x-.05,x+.05,2.8,3.8,LOFT_EXT-.1,LOFT_EXT,wood)
prism(P+'UpperFurnishingRail',-3.5,-2.2,3.72,3.82,LOFT_EXT-.1,LOFT_EXT,wood);prism(P+'UpperFurnishingRail',-3.5,-2.2,3.25,3.33,LOFT_EXT-.09,LOFT_EXT-.01,wood)
for z in [-3.7,-2.6]:prism(P+'UpperFurnishingRailPost',-2.35,-2.25,2.8,3.8,z-.05,z+.05,wood)
prism(P+'UpperFurnishingRail',-2.35,-2.25,3.72,3.82,-3.8,LOFT_EXT,wood)

# ---------------- winch (service) in the loft ----------------
WN=P+'ServiceWinch_'
cyl(WN+'Drum',(-4.45,DRUM_Y,DRUM_Z),(-2.8,DRUM_Y,DRUM_Z),.28,10,wood)
for x in (-4.3,-3.65,-3.0):cyl(WN+'DrumBand',(x-.04,DRUM_Y,DRUM_Z),(x+.04,DRUM_Y,DRUM_Z),.3,10,iron)
for i in range(6):
 a=i*math.tau/6;beam(WN+'DrumRope',(-4.2,DRUM_Y+.3*math.cos(a),DRUM_Z+.3*math.sin(a)),(-2.95,DRUM_Y+.3*math.cos(a+.4),DRUM_Z+.3*math.sin(a+.4)),.05,.05,rope)
cyl(WN+'Axle',(-4.85,DRUM_Y,DRUM_Z),(-2.45,DRUM_Y,DRUM_Z),.06,6,iron)
for x in (-4.62,-2.62):
 for s in (-1,1):beam(WN+'Trestle',(x,2.8,DRUM_Z+s*.3),(x,DRUM_Y+.05,DRUM_Z),.12,.12,timber)
 prism(WN+'TrestleSill',x-.08,x+.08,2.8,2.92,DRUM_Z-.36,DRUM_Z+.36,timber)
wheel(WN+'Wheel',(-2.5,DRUM_Y,DRUM_Z),(1,0,0),.62,8,16,wood,.09)
beam(WN+'Crank',(-4.85,DRUM_Y,DRUM_Z),(-4.85,DRUM_Y-.42,DRUM_Z+.12),.06,.06,iron);beam(WN+'Crank',(-4.85,DRUM_Y-.42,DRUM_Z+.12),(-4.7,DRUM_Y-.42,DRUM_Z+.12),.05,.05,wood)
beam(WN+'Pawl',(-2.62,DRUM_Y+.7,DRUM_Z+.25),(-2.62,DRUM_Y+.35,DRUM_Z+.1),.05,.05,iron)

# ---------------- tower upper storey: timber-framed plaster, jettied west ----------------
UB=RT;UT=6.5;JX=-5.3
def frame_member(name,axis,constant,out,u0,u1,v0,v1):
 f0,f1=constant+out*.175,constant+out*.235;lo,hi=min(f0,f1),max(f0,f1)
 return prism(name,u0,u1,v0,v1,lo,hi,timber) if axis=='x' else prism(name,lo,hi,v0,v1,u0,u1,timber)
def axwall(name,u0,u1,base,height,axis,constant,holes,mat,t=.35):
 us=sorted(set([u0,u1]+[q for h in holes for q in h[:2]]));vs=sorted(set([base,base+height]+[q for h in holes for q in h[2:]]))
 parts=[]
 for a,b in zip(us,us[1:]):
  for c,e in zip(vs,vs[1:]):
   u=(a+b)/2;v=(c+e)/2
   if any(h[0]<u<h[1] and h[2]<v<h[3] for h in holes):continue
   parts.append(prism(name,a,b,c,e,constant-t/2,constant+t/2,mat) if axis=='x' else prism(name,constant-t/2,constant+t/2,c,e,a,b,mat))
 return join(parts,name)
WY0,WY1=5.0,5.95
tw={'SouthW':('x',0.0,JX-.175,SPLIT,1,[],RT),'SouthE':('x',0.0,SPLIT,-1.825,1,[[-2.62,-2.12,WY0,WY1]],RTL),'North':('x',-4.0,JX-.175,-1.825,-1,[],H),
 'West':('z',JX,-4.175,.175,-1,[[-2.5,-1.6,WY0,WY1]],RT),'East':('z',-2.0,-4.175,.175,1,[[-3.65,-1.85,4.62,6.12]],RTL)}
for side,(axis,c,u0,u1,out,holes,UB) in tw.items():
 axwall(P+'UpperShell'+side,u0,u1,UB,UT-UB,axis,c,holes,plaster)
 fm=[frame_member(P+'UpperShellTimber',axis,c,out,u0,u1,UB,UB+.2),frame_member(P+'UpperShellTimber',axis,c,out,u0,u1,UT-.2,UT)]
 if side!='East':fm.append(frame_member(P+'UpperShellTimber',axis,c,out,u0,u1,WY0-.12,WY0))
 studs=[u0+.07,u1-.07];u=u0
 while u<u1-.8:
  u+=1.0
  if u<u1-.4 and not any(h[0]-.15<u<h[1]+.15 for h in holes):studs.append(u)
 for h in holes:studs+=[h[0]-.07,h[1]+.07]
 for s in studs:fm.append(frame_member(P+'UpperShellTimber',axis,c,out,s-.07,s+.07,UB+.2,UT-.2))
 f=c+out*.205
 for end,dirn in [(u0+.14,1),(u1-.14,-1)]:
  if any(h[0]-.2<end+dirn*.5<h[1]+.2 for h in holes):continue
  a=(end,UB+.2);b=(end+dirn*.75,WY0-.12)
  P0=(a[0],a[1],f) if axis=='x' else (f,a[1],a[0]);Q0=(b[0],b[1],f) if axis=='x' else (f,b[1],b[0]);fm.append(beam(P+'UpperShellTimber',P0,Q0,.12,.08,timber))
 for a,b,c0,c1 in holes:
  mm=(a+b)/2
  if side!='East':
   fm.append(prism(P+'UpperShellWindowMullion',mm-.04,mm+.04,c0,c1,c-.08,c+.08,wood) if axis=='x' else prism(P+'UpperShellWindowMullion',c-.08,c+.08,c0,c1,mm-.04,mm+.04,wood))
   so=c+out*.28
   fm.append(prism(P+'UpperShellWindowSill',a-.12,b+.12,c0-.14,c0-.04,min(c,so),max(c,so),sillmat) if axis=='x' else prism(P+'UpperShellWindowSill',min(c,so),max(c,so),c0-.14,c0-.04,a-.12,b+.12,sillmat))
   fm.append(prism(P+'GlazingUpper',a,b,c0,c1,c-.01,c+.01,iron) if axis=='x' else prism(P+'GlazingUpper',c-.01,c+.01,c0,c1,a,b,iron))
  else:
   # loading door: jambs, a head beam and one plank leaf swung open against the wall
   fm.append(prism(P+'UpperShellLoadingSill',c-.2,c+.32,c0-.1,c0,a-.1,b+.1,wood))
   fm.append(prism(P+'UpperShellLoadingLeaf',c+.2,c+.26,c0+.05,c1-.1,b+.12,b+.95,wood))
   for vv in (c0+.3,c1-.4):fm.append(prism(P+'UpperShellLoadingStrap',c+.26,c+.28,vv-.04,vv+.04,b+.15,b+.9,iron))
 join(fm,P+'UpperShellTimber'+side)
# west jetty: bressumer, joist ends and brackets over the stone wall
UB=RT
jet=[prism(P+'UpperShellJetty',JX-.2,JX+.12,UB-.28,UB,-4.25,.25,timber)]
z=-3.85
while z<0:jet.append(prism(P+'UpperShellJetty',-5.2,JX-.2,UB-.36,UB-.22,z-.08,z+.08,timber));z+=.5
for z in (-3.6,-.4):jet.append(beam(P+'UpperShellJetty',(-5.18,UB-1.05,z),(JX-.05,UB-.3,z),.12,.12,timber))
join(jet,P+'UpperShellJetty')
# gable roof, ridge along x, clay tiles laid on both slopes
TRX0,TRX1=JX-.55,-1.45;TZN,TZS=-4.6,.6;ZR=-2.0;TE=UT-.2;TR=8.05
roofs=[]
for zend in (TZN,TZS):
 o=mesh(P+'RoofTowerDeck',[(TRX0,TE,zend),(TRX1,TE,zend),(TRX1,TR,ZR),(TRX0,TR,ZR)],[(0,1,2,3)],roofmat);sm=o.modifiers.new('s','SOLIDIFY');sm.thickness=.14
for xg,out in ((JX,-1),(-2.0,1)):
 prof=[(-4.175,UT),(.175,UT),(ZR,TR-.12)]
 verts=[(xg+dx,y,z) for dx in (-.175,.175) for z,y in prof]
 mesh(P+'RoofGable',verts,[(2,1,0),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],plaster)
 f=xg+out*.205
 beam(P+'RoofGableTimber',(f,UT,ZR),(f,TR-.2,ZR),.14,.08,timber)
 beam(P+'RoofGableTimber',(f,UT+.62,-3.3),(f,UT+.62,-.7),.13,.08,timber)
 for zz in (-3.2,-.8):beam(P+'RoofGableTimber',(f,UT,zz),(f,UT+.55,zz),.12,.08,timber)
 for zz,s in ((-4.1,1),(.1,-1)):beam(P+'RoofGableTimber',(f,UT+.05,zz),(f,UT+.62,zz+s*.8),.11,.08,timber)
 prism(P+'RoofGableVent',f-.05 if out>0 else f-.03,f+.05 if out>0 else f+.03,UT+.8,UT+1.2,ZR-.28,ZR+.28,wood)
tv=[];tf=[];tid=[]
def lay(Pf,s_range,rows,normal,skip=None):
 for r in range(rows):
  t0=r/rows;t1=min(1,(r+1.1)/rows)
  s0,s1=s_range(t0);s=s0+(rng.uniform(0,.3) if r%2 else 0)
  while s<s1-.05:
   e=min(s1,s+rng.uniform(.55,.7));sa,sb=s_range(t1)
   lo_s,hi_s=max(s,sa),min(e,sb)
   if hi_s-lo_s>.06 and not(skip and skip(Pf((t0+t1)/2,(s+e)/2))):
    k=len(tv)
    for lift in [.03,.075]:
     nn=Vector(normal)*lift
     for (tt,ss) in [(t0,s+.012),(t0,e-.012),(t1,hi_s-.012),(t1,lo_s+.012)]:
      q=Vector(Pf(tt,ss))+nn+(Vector(normal)*.018 if tt==t1 else Vector((0,0,0)));tv.append(tuple(q))
    tf.extend([(k,k+3,k+2,k+1),(k+4,k+5,k+6,k+7),(k,k+1,k+5,k+4),(k+1,k+2,k+6,k+5),(k+2,k+3,k+7,k+6),(k+3,k,k+4,k+7)])
    tid.extend([rng.choice([0,0,0,1,2])]*6)
   s=e
def nrm(a,b,c):
 v=(Vector(b)-Vector(a)).cross(Vector(c)-Vector(a)).normalized()
 return v if v.y>0 else -v
for zend in (TZN,TZS):
 def Pf(t,s,zend=zend):return (s,TE+(TR-TE)*t,zend+(ZR-zend)*t)
 lay(Pf,lambda t:(TRX0,TRX1),6,nrm((0,TE,zend),(1,TE,zend),(0,TR,ZR)),skip=(lambda p:abs(p[0]+1.75)<.01))
beam(P+'RoofTowerRidge',(TRX0-.05,TR+.08,ZR),(TRX1+.05,TR+.08,ZR),.26,.2,roofmat)
x=TRX0
while x<TRX1-.2:beam(P+'RoofTowerRidgeCap',(x,TR+.13,ZR),(x+.34,TR+.13,ZR),.36,.14,tile_dark);x+=.42
for xg in (TRX0,TRX1):
 for zend in (TZN,TZS):beam(P+'RoofTowerBarge',(xg,TE-.02,zend),(xg,TR-.02,ZR),.14,.2,wood)
 mesh(P+'RoofTowerFinial',[(xg-.09,TR+.2,ZR-.09),(xg+.09,TR+.2,ZR-.09),(xg+.09,TR+.2,ZR+.09),(xg-.09,TR+.2,ZR+.09),(xg,TR+.72,ZR)],[(0,1,2,3),(0,1,4),(1,2,4),(2,3,4),(3,0,4)],wood)
for zend in (TZN,TZS):beam(P+'RoofTowerFascia',(TRX0,TE-.05,zend),(TRX1,TE-.05,zend),.16,.2,wood)

# ---------------- work lean-to: flag floor, plank back wall, posts, monopitch clay roof ----------------
LX0,LX1=3.175,5.45;LZ0,LZ1=-1.35,3.5;LYH,LYL=3.3,2.45
def ly(x):return LYH-(x-LX0)*(LYH-LYL)/(LX1-LX0)
poly_prism(P+'FloorLeanTo',[(3.0,-.83),(5.35,-.83),(5.35,3.25),(3.0,3.25)],-.3,0,flags)
x=3.2
while x<5.3:
 w=min(.26,5.3-x);prism(S+'LeanToBack',x+.01,x+w-.01,-.1,ly(x+w)-.08,-1.12,-.86,wood);x+=w
prism(S+'LeanToBackRail',3.175,5.3,1.1,1.22,-.86,-.8,timber)
for x,z in [(5.15,-.95),(5.15,1.1),(5.15,3.15),(3.4,3.15)]:
 prism(S+'LeanToPost',x-.11,x+.11,-.2,ly(x)-.12,z-.11,z+.11,timber);prism(S+'LeanToPad',x-.18,x+.18,-.3,.05,z-.18,z+.18,sillmat)
prism(S+'LeanToPlate',5.02,5.28,ly(5.15)-.3,ly(5.15)-.08,-1.2,3.35,timber)
beam(S+'LeanToPlate',(3.3,ly(3.4)-.2,3.15),(5.28,ly(5.28)-.2,3.15),.2,.2,timber)
prism(S+'LeanToLedger',3.175,3.36,LYH-.3,LYH-.1,LZ0,LZ1,timber)
for z in [LZ0+.2+.8*i for i in range(7)]:beam(S+'LeanToRafter',(LX0,LYH-.12,z),(LX1,LYL-.12,z),.1,.14,timber)
for z,s in [(1.1,-1),(1.1,1),(3.15,-1)]:beam(S+'LeanToBrace',(5.15,ly(5.15)-.9,z),(5.15,ly(5.15)-.3,z+s*.55),.1,.1,timber)
mesh(P+'RoofLeanToDeck',[(LX0,LYH-.1,LZ0),(LX1,LYL-.1,LZ0),(LX1,LYL-.1,LZ1),(LX0,LYH-.1,LZ1),(LX0,LYH,LZ0),(LX1,LYL,LZ0),(LX1,LYL,LZ1),(LX0,LYH,LZ1)],BOXF,roofmat)
def Pl(t,s):return (LX1+(LX0-LX1)*t,LYL+(LYH-LYL)*t,s)
lay(Pl,lambda t:(LZ0,LZ1),4,nrm((LX1,LYL,0),(LX0,LYH,0),(LX1,LYL,1)),skip=lambda p:(4.4<p[0]<5.0 and -.9<p[2]<-.2))
beam(P+'RoofLeanToFascia',(LX1,LYL-.05,LZ0),(LX1,LYL-.05,LZ1),.14,.2,wood)
for zz in (LZ0,LZ1):beam(P+'RoofLeanToBarge',(LX1,LYL-.02,zz),(LX0,LYH-.02,zz),.12,.18,wood)
# forge and chimney
prism(P+'FurnishingForge',4.3,5.08,0,.82,-.86,-.02,stone);prism(P+'FurnishingForgeTop',4.25,5.12,.82,.92,-.9,.02,sillmat)
prism(P+'FurnishingForgeCoals',4.48,4.92,.92,.98,-.7,-.2,ember)
mesh(P+'FurnishingForgeHood',[(4.3,1.55,-.9),(5.1,1.55,-.9),(5.1,1.55,.05),(4.3,1.55,.05),(4.47,2.15,-.8),(4.93,2.15,-.8),(4.93,2.15,-.3),(4.47,2.15,-.3)],BOXF,stone_dark)
prism(S+'Chimney',4.45,4.95,2.15,4.35,-.8,-.3,stone);prism(S+'ChimneyCap',4.38,5.02,4.35,4.47,-.87,-.23,sillmat)
for yy in (2.6,3.2,3.8):prism(S+'ChimneyCourse',4.43,4.97,yy,yy+.05,-.82,-.28,stone_dark)
# repair bench (service)
BN=P+'ServiceBench_'
prism(BN+'Top',3.25,4.22,.78,.9,-.9,-.36,wood)
for x,z in [(3.3,-.85),(4.17,-.85),(3.3,-.41),(4.17,-.41)]:prism(BN+'Leg',x-.04,x+.04,0,.78,z-.04,z+.04,timber)
prism(BN+'Shelf',3.3,4.17,.22,.28,-.85,-.41,wood);prism(BN+'Vise',3.32,3.48,.9,1.05,-.5,-.34,iron)
prism(BN+'Ingot',3.6,3.8,.9,.96,-.75,-.65,ore);prism(BN+'Ingot',3.62,3.82,.96,1.0,-.74,-.66,ore)
beam(BN+'PickHandle',(3.9,.93,-.78),(4.15,.93,-.42),.05,.05,wood);beam(BN+'PickHead',(3.93,.94,-.36),(4.2,.94,-.52),.06,.05,iron)
beam(BN+'Hammer',(3.5,.93,-.45),(3.75,.93,-.52),.04,.04,wood);prism(BN+'HammerHead',3.73,3.8,.9,.98,-.58,-.46,iron)
for x in (3.35,3.65,3.95):beam(BN+'WallTool',(x,1.35,-.84),(x,1.95,-.84),.04,.04,wood);prism(BN+'WallToolHead',x-.1,x+.1,1.9,1.98,-.86,-.8,iron)
# anvil on a stump, ore crates and an ore heap
cyl(P+'FurnishingStump',(4.55,0,2.25),(4.55,.5,2.25),.3,8,wood)
prism(P+'FurnishingAnvil',4.42,4.68,.5,.62,2.1,2.4,iron);prism(P+'FurnishingAnvil',4.48,4.62,.62,.72,2.15,2.35,iron);prism(P+'FurnishingAnvil',4.38,4.72,.72,.84,2.0,2.45,iron)
mesh(P+'FurnishingAnvil',[(4.42,.74,2.0),(4.68,.74,2.0),(4.55,.8,1.68),(4.42,.84,2.0),(4.68,.84,2.0)],[(0,1,2),(3,2,4),(0,3,4,1),(0,2,3),(1,4,2)],iron)
for x0,z0 in [(4.3,.6),(4.35,1.35)]:
 prism(P+'FurnishingCrate',x0,x0+.62,0,.55,z0,z0+.6,wood)
 for zz in (z0+.05,z0+.55):prism(P+'FurnishingCrateSlat',x0-.02,x0+.64,.05,.5,zz-.03,zz+.03,timber)
 prism(P+'FurnishingCrateOre',x0+.08,x0+.54,.55,.66,z0+.08,z0+.52,ore)

# ---------------- threshold hall furnishings: tool racks, inspection table, barrels ----------------
prism(P+'FurnishingRack',2.72,2.82,.9,2.1,-1.95,-.55,wood)
for zz in (-1.8,-1.4,-1.0,-.7):
 prism(P+'FurnishingRackPeg',2.55,2.72,1.95,2.02,zz-.03,zz+.03,timber)
 beam(P+'FurnishingRackTool',(2.64,1.98,zz),(2.64,.95,zz+.05),.045,.045,wood)
 prism(P+'FurnishingRackToolHead',2.6,2.68,1.9,2.02,zz-.22,zz+.22,iron)
prism(P+'FurnishingTable',.4,1.6,.76,.86,1.55,2.2,wood)
for x,z in [(.46,1.6),(1.54,1.6),(.46,2.15),(1.54,2.15)]:prism(P+'FurnishingTableLeg',x-.04,x+.04,0,.76,z-.04,z+.04,timber)
beam(P+'FurnishingTablePick',(.6,.9,1.75),(1.2,.9,1.95),.05,.05,wood);beam(P+'FurnishingTablePickHead',(1.15,.92,1.72),(1.25,.92,2.15),.06,.05,iron)
prism(P+'FurnishingTableLamp',1.3,1.45,.86,1.08,1.65,1.8,iron);prism(P+'FurnishingTableLamp',1.33,1.42,.9,1.04,1.68,1.77,ember)
for (bx0,bz0) in [(1.95,-2.25),(2.35,-1.45)]:
 cyl(P+'FurnishingBarrel',(bx0,0,bz0),(bx0,.9,bz0),.3,8,wood)
 for yy in (.15,.72):cyl(P+'FurnishingBarrelHoop',(bx0,yy,bz0),(bx0,yy+.06,bz0),.315,8,iron)
# hanging sign with a pick beside the arch
beam(S+'SignBracket',(-3.3,2.75,3.2),(-3.3,2.75,3.95),.08,.08,iron)
prism(P+'FurnishingSign',-3.34,-3.26,2.1,2.66,3.35,3.9,wood)
beam(P+'FurnishingSignPick',(-3.24,2.2,3.45),(-3.24,2.55,3.8),.04,.04,iron);beam(P+'FurnishingSignPick',(-3.24,2.55,3.45),(-3.24,2.2,3.8),.04,.04,iron)

# ---------------- quarry outcrop: faceted hand-shaped hulls (the rear enclosure) ----------------
def hull(name,box,cons,n,top_bias=0,oremix=0):
 x0,x1,y0,y1,z0,z1=box;pts=[];tries=0
 while len(pts)<n and tries<20000:
  tries+=1;p=(rng.uniform(x0,x1),y0+(y1-y0)*(rng.random()**(1-top_bias*.6)),rng.uniform(z0,z1))
  if all(c(p) for c in cons):pts.append(p)
 g=0
 while g<5 and tries<40000:
  tries+=1;p=(rng.uniform(x0,x1),-.6,rng.uniform(z0,z1))
  if all(c(p) for c in cons):pts.append(p);g+=1
 bm=bmesh.new()
 for x,y,z in pts:bm.verts.new((x,-z,y))
 res=bmesh.ops.convex_hull(bm,input=bm.verts)
 dead=list({v for v in res['geom_interior']+res['geom_unused'] if isinstance(v,bmesh.types.BMVert)})
 if dead:bmesh.ops.delete(bm,geom=dead,context='VERTS')
 data=bpy.data.meshes.new(name);bm.to_mesh(data);bm.free()
 o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.parent=root
 for m in (rock,rock_light,rock_dark,ore):o.data.materials.append(m)
 for poly in o.data.polygons:
  nz=poly.normal.z
  poly.material_index=1 if nz>.55 else (2 if nz<-.1 or rng.random()<.22 else 0)
  if oremix and rng.random()<oremix and nz>-.1:poly.material_index=3
 return fix(o)
RK=P+'Rock'
def block(name,x0,x1,z0,z1,ytop,cons=(),ybase=-.6,n_top=10,inset=.35,oremix=0):
 # a quarry bench block: a jittered, battered top on a wider foot; convex, faceted, hand-shaped
 pts=[];tries=0
 while len([p for p in pts if p[1]>ybase])<n_top and tries<20000:
  tries+=1;a=rng.uniform(x0+inset*rng.random(),x1-inset*rng.random());b=rng.uniform(z0+inset*rng.random(),z1-inset*rng.random())
  p=(a,ytop+rng.uniform(-.45,.15),b)
  if all(c(p) for c in cons):pts.append(p)
 g=0
 while g<6 and tries<40000:
  tries+=1;p=(rng.uniform(x0,x1),ybase,rng.uniform(z0,z1))
  if all(c(p) for c in cons):pts.append(p);g+=1
 for cx,cz in [(x0,z0),(x1,z0),(x1,z1),(x0,z1)]:
  p=(cx,ybase,cz)
  if all(c(p) for c in cons):pts.append(p)
  q=(cx+(.35 if cx==x0 else -.35),ybase+(ytop-ybase)*.55,cz+(.35 if cz==z0 else -.35))
  if all(c(q) for c in cons):pts.append(q)
 return hull_pts(name,pts,oremix)
def hull_pts(name,pts,oremix=0):
 bm=bmesh.new()
 for x,y,z in pts:bm.verts.new((x,-z,y))
 res=bmesh.ops.convex_hull(bm,input=bm.verts)
 dead=list({v for v in res['geom_interior']+res['geom_unused'] if isinstance(v,bmesh.types.BMVert)})
 if dead:bmesh.ops.delete(bm,geom=dead,context='VERTS')
 data=bpy.data.meshes.new(name);bm.to_mesh(data);bm.free()
 o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.parent=root
 for m in (rock,rock_light,rock_dark,ore):o.data.materials.append(m)
 for poly in o.data.polygons:
  nz=poly.normal.z
  poly.material_index=1 if nz>.6 else (2 if nz<-.1 or poly.normal.y>.55 or rng.random()<.18 else 0)
  if oremix and rng.random()<oremix and nz>-.1:poly.material_index=3
 return fix(o)
behind=lambda p:p[2]<=zf(min(1,max(-5,p[0])))-.05
ne=lambda p:p[2]<=p[0]-5.3
# tier 1: the cut face the building is set against (the tunnel box x -1.7..0.7, y<2.95, z<-3.4 stays clear)
block(RK,-8.3,-4.6,-7.2,-4.35,4.35)
block(RK,-4.8,-2.1,-7.0,-4.35,4.2)
block(RK,-8.6,-5.65,-4.4,-1.2,2.3,inset=.8)
block(RK,-2.35,1.35,-5.0,-3.45,5.2,[behind],ybase=4.4)
block(RK,-2.35,1.35,-7.1,-4.9,4.9,ybase=3.1)
block(RK,.78,3.7,-7.0,-3.3,4.0,[ne])
block(RK,3.0,7.6,-5.5,-1.62,2.7,[ne,lambda p:p[2]<=-1.62])
block(RK,-2.7,-1.78,-7.0,-4.3,3.4,inset=.2)
# tier 2: set back ~1.5 as a bench, joints between blocks
block(RK,-8.0,-4.7,-9.6,-5.6,5.9)
block(RK,-4.9,-1.8,-9.8,-5.9,6.2)
block(RK,-1.8,1.9,-9.6,-7.05,5.9)
block(RK,-1.9,1.9,-7.3,-4.9,5.6,ybase=3.2)
block(RK,1.8,5.6,-8.6,-4.9,5.0,[lambda p:p[2]<=p[0]-5.6])
block(RK,5.2,8.4,-7.4,-3.2,3.4,[lambda p:p[2]<=p[0]-5.6])
# tier 3: the crown of the outcrop
block(RK,-6.6,-1.2,-11.6,-8.2,7.3)
block(RK,-1.6,3.8,-11.2,-8.4,6.9)
block(RK,-9.6,-6.4,-10.2,-6.2,4.9)
block(RK,3.4,7.0,-10.6,-7.6,4.4)
# scree and loose blocks on the benches
for cx,cy,cz,s in [(-6.2,4.35,-5.3,.55),(-3.1,4.2,-5.0,.45),(2.6,4.0,-5.6,.5),(5.5,2.7,-3.2,.5),(-7.4,2.3,-2.1,.45),(.4,5.6,-6.3,.4)]:
 hull_pts(RK,[(cx+rng.uniform(-s,s),cy+rng.uniform(-.2,s*1.4),cz+rng.uniform(-s,s)) for _ in range(9)])
# loose quarry rubble and ore-veined mining rocks beside the approach (not on the path)
OR=P+'OreRock'
for cx,cz,s in [(-6.4,2.3,.9),(-6.1,4.3,.7),(6.4,4.1,.85),(6.6,2.2,.6),(-4.4,5.6,.45)]:
 block(OR,cx-s,cx+s,cz-s,cz+s,s*1.25,inset=s*.9,n_top=4,oremix=.3)
 for k in range(2):
  a=cx+rng.uniform(-s,s)*.8;b=cz+rng.uniform(-s,s)*.8;block(OR,a-s*.45,a+s*.45,b-s*.45,b+s*.45,s*.8,inset=s*.4,n_top=3,oremix=.3)

# ---------------- batch by prefix, export ----------------
for o in [o for o in bpy.context.scene.objects if o.type=='MESH' and not o.name.startswith(P+'Rock') and not o.name.startswith(P+'OreRock')]:fix(o)
GROUPS=[P+'ServiceShaft_',P+'ServiceWinch_',P+'ServiceBench_',P+'UpperFloor',P+'UpperShell',P+'UpperStructure',P+'UpperFurnishing',
 P+'FloorApproach',P+'FloorLeanTo',P+'FloorTunnel',P+'Floor',P+'Stair',P+'Step',P+'Shell',P+'Roof',P+'Glazing',P+'Cave',P+'Furnishing',P+'Rock',P+'OreRock']
NAMES={P+'ServiceShaft_':P+'ServiceShaft_Mouth',P+'ServiceWinch_':P+'ServiceWinch_Windlass',P+'ServiceBench_':P+'ServiceBench_Repair'}
pool=[o for o in bpy.context.scene.objects if o.type=='MESH']
for g in GROUPS:
 parts=[o for o in pool if o.name.startswith(g)]
 if g==P+'Floor':parts=[o for o in parts if not any(o.name.startswith(h) for h in (P+'FloorApproach',P+'FloorLeanTo',P+'FloorTunnel'))]
 if g==P+'Rock':parts=[o for o in parts if not o.name.startswith(P+'OreRock')]
 if not parts:continue
 for o in parts:
  bpy.context.view_layer.objects.active=o
  for modifier in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=modifier.name)
 pool=[o for o in pool if o not in parts]
 join(parts,NAMES.get(g,g+('Treads' if g==P+'Stair' else 'Main')))
assert not pool,[o.name for o in pool]
tm=bpy.data.meshes.new(P+'RoofTiles');tm.from_pydata([(x,-z,y) for x,y,z in tv],[],tf);tm.update()
to=bpy.data.objects.new(P+'RoofTiles',tm);bpy.context.collection.objects.link(to);to.parent=root
for m in (roofmat,tile_light,tile_dark):to.data.materials.append(m)
for p,i in zip(to.data.polygons,tid):p.material_index=i
fix(to);join([bpy.data.objects[P+'RoofMain'],to],P+'RoofMain')
bpy.context.view_layer.update()
model=OUT/'quarry'
bpy.ops.wm.save_as_mainfile(filepath=str(model.with_suffix('.blend')))
bpy.ops.export_scene.gltf(filepath=str(model.with_suffix('.glb')),export_format='GLB',export_yup=True)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
corners=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
dims=[max(v[i] for v in corners)-min(v[i] for v in corners) for i in range(3)]
tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
mats=sorted({m.name for o in meshes for m in o.data.materials if m})
report={'building':'quarry','prefix':P,'triangles':tris,'materials':len(mats),'materialNames':mats,
 'dimensionsTiles':{'x':round(dims[0],2),'z':round(dims[1],2),'y':round(dims[2],2)},
 'meshes':{o.name:sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes}}
(OUT/'asset_report.json').write_text(json.dumps(report,indent=1))
print('[QUARRY_V1] saved; triangles',tris,'materials',len(mats),'dims',[round(d,2) for d in dims],'meshes',len(meshes))

# ---------------- proof renders (workbench, studio light, material colours) ----------------
if '--no-render' not in sys.argv:
 sc=bpy.context.scene;sc.render.engine='BLENDER_WORKBENCH';sc.display.shading.light='STUDIO';sc.display.shading.color_type='MATERIAL'
 sc.display.shading.show_shadows=True;sc.display.shading.show_cavity=True;sc.render.resolution_x=900;sc.render.resolution_y=700
 sc.world=sc.world or bpy.data.worlds.new('w')
 ground=bpy.data.meshes.new('ProofGround');ground.from_pydata([(-14,14,-.15),(14,14,-.15),(14,-14,-.15),(-14,-14,-.15)],[],[(0,1,2,3)])
 gm=material('proof ground',(.36,.42,.24));ground.materials.append(gm);go=bpy.data.objects.new('ProofGround',ground);sc.collection.objects.link(go)
 cam=bpy.data.objects.new('ProofCam',bpy.data.cameras.new('ProofCam'));sc.collection.objects.link(cam);sc.camera=cam;cam.data.lens=38
 def look(name,eye,target=(0,2.2,-1)):
  e=Vector((eye[0],-eye[2],eye[1]));t=Vector((target[0],-target[2],target[1]))
  cam.location=e;cam.rotation_euler=(t-e).to_track_quat('-Z','Y').to_euler()
  sc.render.filepath=str(PROOF/(name+'.png'));bpy.ops.render.render(write_still=True)
 look('front_34',(13,11,17))
 look('back_34',(-14,15,-17))
 look('side_west',(-21,6.5,1.5),(0,3,-1))
 look('top',(.5,32,1.5),(.5,0,-.5))
 for o in meshes:
  if o.name.startswith((P+'Roof',P+'UpperShell',P+'Rock')):o.hide_render=True
 look('cutaway',(7,19,13),(0,1,-1))
 look('detail_court',(3.5,12,8),(-.5,2,-3.4))
 for o in meshes:o.hide_render=False
 import numpy as np
 names=['front_34','back_34','side_west','top','cutaway']
 W,Hh=900,700;sheet=np.ones((Hh*2,W*3,4),dtype=np.float32)
 for i,nme in enumerate(names):
  im=bpy.data.images.load(str(PROOF/(nme+'.png')));px=np.array(im.pixels[:],dtype=np.float32).reshape(Hh,W,4)
  r,c=i//3,i%3;sheet[(1-r)*Hh:(2-r)*Hh,c*W:(c+1)*W]=px
 out=bpy.data.images.new('sheet',W*3,Hh*2,alpha=True);out.pixels=sheet.ravel().tolist();out.filepath_raw=str(PROOF/'sheet.png');out.file_format='PNG';out.save()
 print('[QUARRY_V1] proof renders written to',PROOF)
