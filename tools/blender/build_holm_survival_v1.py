"""Tutor's Holm M4.4 building: `survival` (Pond & woodland), prefix Survival_. 2026-09-24.
Open-sided crook-post teaching canopy under an ochre thatched hip, a low plank tool store on a fieldstone sill wall
with a catslide shingle lean-to carried forward as a sheltered front, a lean-to covered link with steps to the store
door, a flagged fire hard-standing with a stone fire ring and cooking tripod, a log pile with chopping block and axe,
and a timber bank stair + fishing stage reaching the REAL creek edge (terrain water mask, world tiles (42-43,90)).
Style and helpers follow tools/blender/build_holm_guide_house_overhaul_v2.py. Original design; seeded randomness only.
Local space: origin = plan (31,84), y=0 = canopy floor = world y 2.90. Game (x,y,z) -> Blender (x,-z,y).
Run: blender -b --python tools/blender/build_holm_survival_v1.py
"""
import bpy,json,math,random,bmesh
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'.studio-workspaces/holm-survival-v1/candidates'
PROOF=ROOT/'scratchpad/holm_survival_v1'
OUT.mkdir(parents=True,exist_ok=True);PROOF.mkdir(parents=True,exist_ok=True)
PX,PZ,PY=31,84,2.90
TER=json.loads((ROOT/'.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json').read_text())
TW=TER['width'];TS=TW+1
def terrain_world(x,z):
 ix=min(int(math.floor(x)),TW-1);iz=min(int(math.floor(z)),TER['depth']-1);tx=x-ix;tz=z-iz;H=TER['heights']
 a,b,c,d=H[iz*TS+ix],H[iz*TS+ix+1],H[(iz+1)*TS+ix],H[(iz+1)*TS+ix+1]
 return (a+(b-a)*tx)*(1-tz)+(c+(d-c)*tx)*tz
def th(x,z):return terrain_world(PX+x,PZ+z)-PY
def tmin(x0,x1,z0,z1):
 return min(th(x0+(x1-x0)*i/8,z0+(z1-z0)*j/8) for i in range(9) for j in range(9))
def tmax(x0,x1,z0,z1):
 return max(th(x0+(x1-x0)*i/8,z0+(z1-z0)*j/8) for i in range(9) for j in range(9))

bpy.ops.wm.read_factory_settings(use_empty=True)
def material(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);return m
stone=material('Warm fieldstone',(.43,.46,.40));stone_light=material('Stone lit faces',(.52,.54,.46));stone_dark=material('Stone shaded faces',(.37,.40,.35))
sillmat=material('Dressed sandstone',(.57,.53,.42));wood=material('Aged oak',(.30,.20,.12));timber=material('Dark frame oak',(.22,.15,.09))
floor=material('Warm floorboards',(.43,.32,.20));plank=material('Weathered plank',(.38,.29,.18))
thatch=material('Ochre thatch',(.50,.39,.16));thatch_light=material('Ochre thatch sunlit',(.58,.46,.20));thatch_dark=material('Ochre thatch shade',(.40,.30,.12))
shingle=material('Oak shingle',(.34,.26,.18));shingle_dark=material('Oak shingle weathered',(.26,.20,.15))
flag=material('Hard-standing flag',(.47,.45,.39));iron=material('Blackened iron',(.16,.16,.17));ember=material('Ember and fish scale',(.72,.33,.10))
reed=material('Reed green',(.33,.40,.16));twine=material('Twine and bulrush',(.36,.24,.13));leaf=material('Coppice leaf',(.24,.35,.13))
root=bpy.data.objects.new('Survival_Root',None);bpy.context.collection.objects.link(root)

def fix(o):
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free();return o
def mesh(name,vertices,faces,mat):
 data=bpy.data.meshes.new(name);data.from_pydata([(x,-z,y) for x,y,z in vertices],[],faces);data.update()
 obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.parent=root;obj.data.materials.append(mat);return obj
def prism(name,x0,x1,y0,y1,z0,z1,mat):
 return mesh(name,[(x0,y0,z0),(x1,y0,z0),(x1,y1,z0),(x0,y1,z0),(x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],mat)
def beam(name,a,b,width,depth,mat):
 axis=(Vector(b)-Vector(a)).normalized();side=axis.cross(Vector((0,1,0)))
 if side.length<.01:side=axis.cross(Vector((1,0,0)))
 side.normalize();up=axis.cross(side).normalized()
 vertices=[tuple(Vector(p)+side*s*width/2+up*t*depth/2) for p in [a,b] for s,t in [(-1,-1),(1,-1),(1,1),(-1,1)]]
 return mesh(name,vertices,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat)
def log(name,a,b,r,mat,sides=7,endmat=None):
 # a round timber: n-gon prism between points a and b (end grain faces use endmat)
 axis=(Vector(b)-Vector(a)).normalized();side=axis.cross(Vector((0,1,0)))
 if side.length<.01:side=axis.cross(Vector((1,0,0)))
 side.normalize();up=axis.cross(side).normalized()
 ring=[side*math.cos(i*math.tau/sides+.3)*r+up*math.sin(i*math.tau/sides+.3)*r for i in range(sides)]
 v=[tuple(Vector(a)+q) for q in ring]+[tuple(Vector(b)+q) for q in ring]
 f=[(i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides)]+[tuple(range(sides-1,-1,-1)),tuple(range(sides,2*sides))]
 o=mesh(name,v,f,mat)
 if endmat:
  o.data.materials.append(endmat)
  for p in o.data.polygons[sides:]:p.material_index=1
 return o
def poly_prism(name,pts,y0,y1,mat):
 n=len(pts);v=[(x,y0,z) for x,z in pts]+[(x,y1,z) for x,z in pts]
 return mesh(name,v,[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],mat)
def rock(name,c,rx,ry,rz,mat,seed):
 # a faceted fieldstone (low-poly, flattened), for rings and bank stones
 r=random.Random(seed);v=[];f=[]
 rings=[(-1,.55),(0,1),(1,.55)];n=6
 for k,(yy,s) in enumerate(rings):
  for i in range(n):
   a=i*math.tau/n+k*.5+r.uniform(-.2,.2);v.append((c[0]+math.cos(a)*rx*s*r.uniform(.85,1.1),c[1]+yy*ry*.8,c[2]+math.sin(a)*rz*s*r.uniform(.85,1.1)))
 v.append((c[0],c[1]-ry,c[2]));v.append((c[0],c[1]+ry,c[2]))
 for k in range(2):
  for i in range(n):f.append((k*n+i,k*n+(i+1)%n,(k+1)*n+(i+1)%n,(k+1)*n+i))
 for i in range(n):f.append((3*n,(i+1)%n,i));f.append((3*n+1,2*n+i,2*n+(i+1)%n))
 return mesh(name,v,f,mat)
def join(parts,name):
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0]
 if len(parts)>1:bpy.ops.object.join()
 parts[0].name=name;return parts[0]
def stone_facing(name,u0,u1,base,height,axis,constant,holes,outward):
 # the guide house v2 hand-cut relief skin, over an absolute u range
 rng=random.Random(name+str(constant)+str(u0));vertices=[];faces=[];ids=[]
 def point(u,v,depth):return (u,v,constant+outward*depth) if axis=='x' else (constant+outward*depth,v,u)
 for row in range(math.ceil(height/.36)):
  low=base+row*.36;high=min(base+height,low+.36);u=u0
  while u<u1-.01:
   right=min(u1,u+rng.uniform(.58,1.05));segments=[(u,right,low,high)]
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
 return o
def stone_wall(name,axis,constant,u0,u1,top,outward,t=.35,skin=True):
 # a fieldstone footing / plinth: solid core down to the lowest terrain along it, relief facing outward
 lo=(min(th(u,constant) for u in [u0+(u1-u0)*i/12 for i in range(13)]) if axis=='x' else min(th(constant,u) for u in [u0+(u1-u0)*i/12 for i in range(13)]))-.12
 lo=min(lo,top-.3)
 c=constant-outward*t/2
 if axis=='x':prism(name,u0,u1,lo,top,c-t/2,c+t/2,stone)
 else:prism(name,c-t/2,c+t/2,lo,top,u0,u1,stone)
 if skin:stone_facing(name+'Facing',u0,u1,lo,top-lo,axis,c,[],outward)
 return lo
def lay(name,P,s_range,rows,normal,mats,skip=None,seed=0,size=(.5,.7),lip=(.03,.075)):
 # house-v2 course laying: P(t,s) point on the face, t 0..1 eave->top; each piece a thin lipped slab
 rng=random.Random(seed);tv=[];tf=[];tid=[]
 for r in range(rows):
  t0=r/rows;t1=min(1,(r+1.1)/rows)
  s0,s1=s_range(t0);s=s0+(rng.uniform(0,.25) if r%2 else 0)
  while s<s1-.05:
   e=min(s1,s+rng.uniform(*size));sa,sb=s_range(t1)
   lo_s,hi_s=max(s,sa),min(e,sb)
   if hi_s-lo_s>.06 and not(skip and skip(P((t0+t1)/2,(s+e)/2))):
    k=len(tv)
    for lift in lip:
     n=Vector(normal)*lift
     for (tt,ss) in [(t0,s+.012),(t0,e-.012),(t1,hi_s-.012),(t1,lo_s+.012)]:
      q=Vector(P(tt,ss))+n+(Vector(normal)*.018 if tt==t1 else Vector((0,0,0)));tv.append(tuple(q))
    tf.extend([(k,k+3,k+2,k+1),(k+4,k+5,k+6,k+7),(k,k+1,k+5,k+4),(k+1,k+2,k+6,k+5),(k+2,k+3,k+7,k+6),(k+3,k,k+4,k+7)])
    tid.extend([rng.choice([0,0,0,1,2])]*6)
   s=e
 o=mesh(name,tv,tf,mats[0])
 for m in mats[1:]:o.data.materials.append(m)
 for p,i in zip(o.data.polygons,tid):p.material_index=min(i,len(mats)-1)
 return o
def nrm(a,b,c):
 v=(Vector(b)-Vector(a)).cross(Vector(c)-Vector(a)).normalized()
 return v if v.y>0 else -v

# =====================================================================================================
# 1. TEACHING CANOPY: board floor on a fieldstone plinth, crook posts, knee braces, raised-cruck trusses
# =====================================================================================================
CANOPY=[(-6,-4),(.2,-4),(.8,-3.4),(.8,1),(-6,1)]          # plan outline clipped by the store; NE corner cut
poly_prism('Survival_FloorCanopy',CANOPY,-.26,-.03,floor)
rng=random.Random(31)
z=-4.0
while z<1-.01:
 z1=min(1,z+.3);xmax=.8 if z>=-3.4 else .2+(z+4)
 x=-6+(rng.uniform(.4,1.6) if int((z+4)/.3)%2 else 0);xs=[-6]
 while x<xmax-1:x+=rng.uniform(2.4,3.4);xs.append(min(x,xmax)) if x<xmax-.4 else None
 xs.append(xmax)
 for a,b in zip(xs,xs[1:]):prism('Survival_FloorCanopy',a+.01,b-.01,-.05,0,z+.012,z1-.012,floor if rng.random()<.75 else plank)
 z=z1
# plinth under the canopy edges (west, north, south; the east edge meets the rising ground)
stone_wall('Survival_PlinthWest','z',-6,-4,1,-.02,-1)
stone_wall('Survival_PlinthNorth','x',-4,-6,.2,-.02,-1)
stone_wall('Survival_PlinthSouth','x',1,-6,.8,-.02,1)
# chamfer plinth (short diagonal) as a plain stone prism
mesh('Survival_PlinthChamfer',[(.2,tmin(.2,.8,-4,-3.4)-.1,-4),(.8,tmin(.2,.8,-4,-3.4)-.1,-3.4),(.8,-.02,-3.4),(.2,-.02,-4),(.45,tmin(.2,.8,-4,-3.4)-.1,-4.1),(.9,tmin(.2,.8,-4,-3.4)-.1,-3.55),(.9,-.02,-3.55),(.45,-.02,-4.1)],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],stone)
# dressed kerb on the floor edge (thin, level with the boards so it never trips the walk surface)
for a,b in zip(CANOPY,CANOPY[1:]+CANOPY[:1]):
 if a[0]==.8 and b[0]==.8:continue
 beam('Survival_PlinthKerb',(a[0],-.09,a[1]),(b[0],-.09,b[1]),.22,.12,sillmat)

PLATE=2.9
posts=[(-6,-4),(-3.5,-4),(-1.65,-4),(.2,-4),(.8,-3.4),(.8,-1.0),(.8,1),(-1.65,1),(-3.5,1),(-6,1),(-6,-1.5)]
CX,CZ=-2.6,-1.5
frame=[]
for px,pz in posts:
 frame.append(prism('Survival_FrameCanopy',px-.2,px+.2,-.02,.12,pz-.2,pz+.2,sillmat))     # pad stone
 d=Vector((CX-px,0,CZ-pz));d.y=0;d=d.normalized()*.10 if d.length>0 else Vector((0,0,0))
 # the crook: straight from the pad, then a gentle bend inward under the plate
 frame.append(beam('Survival_FrameCanopy',(px,.1,pz),(px,2.05,pz),.2,.2,timber))
 frame.append(beam('Survival_FrameCanopy',(px,2.0,pz),(px+d.x,PLATE,pz+d.z),.19,.19,timber))
# wall plate ring and knee braces toward each neighbour along the ring
ring=[(-6,-4),(.2,-4),(.8,-3.4),(.8,1),(-6,1)]
for a,b in zip(ring,ring[1:]+ring[:1]):frame.append(beam('Survival_FrameCanopy',(a[0],PLATE,a[1]),(b[0],PLATE,b[1]),.22,.2,wood))
def on_ring(p):
 return [q for q in posts if q!=p and (q[0]==p[0] or q[1]==p[1] or {p,q}=={(.2,-4),(.8,-3.4)})]
for p in posts:
 for q in on_ring(p):
  dv=Vector((q[0]-p[0],0,q[1]-p[1]))
  if dv.length<.5 or dv.length>2.6:continue
  u=dv.normalized()
  a=Vector((p[0],2.05,p[1]));m=a+u*.28+Vector((0,.38,0));b=a+u*.62+Vector((0,.8,0))
  frame.append(beam('Survival_FrameCanopy',tuple(a),tuple(m),.12,.1,wood));frame.append(beam('Survival_FrameCanopy',tuple(m),tuple(b),.12,.1,wood))
join(frame,'Survival_FrameCanopy')

# ----- thatched roof over the canopy: full hip to the west, half-hip (gablet) to the east over the link -----
X0,X1,Z0,Z1=-6.65,1.1,-4.65,1.65;K=1.15;HD=(Z1-Z0)/2;EAVE=PLATE-.62*K;RIDGE=EAVE+HD*K;ZC=(Z0+Z1)/2
TH=.55;DZ=TH*HD;HIPY=EAVE+DZ*K;XG=.9                  # gablet: vertical verge up to HIPY, small hip above
RA,RB=X0+HD,X1-(HD-DZ)
TA,TB=Vector((RA,RIDGE,ZC)),Vector((RB,RIDGE,ZC))
def slope_pt(side,t,x):                               # side +1 south slope, -1 north slope
 y=EAVE+t*(RIDGE-EAVE);return (x,y,(Z1-t*HD) if side>0 else (Z0+t*HD))
def slope_rng(t):return (X0+t*HD,X1 if t<=TH else X1-(t-TH)*HD)
deck=[]
for side in [1,-1]:
 pts=[slope_pt(side,0,X0),slope_pt(side,0,X1),slope_pt(side,TH,X1),slope_pt(side,1,RB),slope_pt(side,1,RA)]
 deck.append(mesh('Survival_RoofThatchDeck',pts,[tuple(range(5))],thatch_dark))
deck.append(mesh('Survival_RoofThatchDeck',[(X0,EAVE,Z0),(X0,EAVE,Z1),tuple(TA)],[(0,1,2)],thatch_dark))
deck.append(mesh('Survival_RoofThatchDeck',[(X1,HIPY,Z0+DZ),(X1,HIPY,Z1-DZ),tuple(TB)],[(0,1,2)],thatch_dark))
for o in deck:s=o.modifiers.new('deck','SOLIDIFY');s.thickness=.12;s.offset=-1
trng=random.Random(8402);tv=[];tf=[];tid=[]
def thatch_lay(P,srange,rows,n,first=True):
 # straw courses: each row cut into narrow bundles whose butts droop and stand proud of the course above
 for r in range(rows):
  ta=r/rows;tb=min(1,(r+1.55)/rows)
  sa0,sa1=srange(ta);sb0,sb1=srange(tb)
  width=sa1-sa0;nch=max(1,round(width/.34));cuts=[0]+[(i+trng.uniform(-.25,.25))/nch for i in range(1,nch)]+[1]
  cuts=sorted(c for c in cuts if 0<=c<=1)
  for ca,cb in zip(cuts,cuts[1:]):
   if cb-ca<.02:continue
   lb=.2+trng.uniform(0,.09)+(.07 if r==0 and first else 0);lt=.06
   drop=Vector((0,-.03-trng.uniform(0,.09)-(.06 if r==0 and first else 0),0))
   Pp=[Vector(P(ta,sa0+(sa1-sa0)*ca))+n*lb+drop,Vector(P(ta,sa0+(sa1-sa0)*cb))+n*lb+drop,Vector(P(tb,sb0+(sb1-sb0)*cb))+n*lt,Vector(P(tb,sb0+(sb1-sb0)*ca))+n*lt]
   Q=[q-n*.16 for q in Pp]
   k=len(tv);tv.extend(tuple(q) for q in Pp+Q)
   tf.extend([(k,k+1,k+2,k+3),(k+7,k+6,k+5,k+4),(k,k+4,k+5,k+1),(k+1,k+5,k+6,k+2),(k+2,k+6,k+7,k+3),(k+3,k+7,k+4,k)])
   c=trng.choice([0,0,0,1,1,2]);tid.extend([c]*6)
for side in [1,-1]:
 n=nrm(slope_pt(side,0,0),slope_pt(side,0,1),slope_pt(side,1,0))
 thatch_lay(lambda t,s,side=side:slope_pt(side,t,s),slope_rng,8,n)
n=nrm((X0,EAVE,Z0),(X0,EAVE,Z1),tuple(TA))
thatch_lay(lambda t,s:(X0+t*HD,EAVE+t*(RIDGE-EAVE),s),lambda t:(Z0+t*HD,Z1-t*HD),8,n)
n=nrm((X1,HIPY,Z0+DZ),(X1,HIPY,Z1-DZ),tuple(TB))
thatch_lay(lambda t,s:(X1-(TH+t*(1-TH)-TH)*HD,EAVE+(TH+t*(1-TH))*(RIDGE-EAVE),s),lambda t:(Z0+(TH+t*(1-TH))*HD,Z1-(TH+t*(1-TH))*HD),3,n)
o=mesh('Survival_RoofThatch',tv,tf,thatch);o.data.materials.append(thatch_light);o.data.materials.append(thatch_dark)
for p_,i in zip(o.data.polygons,tid):p_.material_index=i
# ridge roll with hazel liggers, hip rolls, verge rolls and straw knobs at the ridge ends
log('Survival_RoofThatch',(RA-.15,RIDGE+.28,ZC),(RB+.15,RIDGE+.28,ZC),.26,thatch_dark,sides=6)
for a,b in [((X0,EAVE,Z0),TA),((X0,EAVE,Z1),TA),((X1,HIPY,Z0+DZ),TB),((X1,HIPY,Z1-DZ),TB)]:
 log('Survival_RoofThatch',tuple(Vector(a)+Vector((0,.2,0))),tuple(Vector(b)+Vector((0,.18,0))),.2,thatch_dark,sides=5)
for zz,s in [(Z0,1),(Z1,-1)]:
 log('Survival_RoofThatch',(X1+.08,EAVE+.12,zz),(X1+.08,HIPY+.16,zz+s*DZ),.17,thatch_dark,sides=5)
x=RA
while x<=RB+.01:
 for s in [-1,1]:beam('Survival_RoofThatch',(x,RIDGE+.52,ZC),(x+.3,RIDGE+.3,ZC+s*.32),.04,.04,wood)
 x+=.37
for i,tp in enumerate([TA,TB]):rock('Survival_RoofThatch',(tp.x+(-.1 if i==0 else .1),RIDGE+.42,ZC),.3,.2,.3,thatch_light,1500+i)
# the east gablet: weatherboarded, framed, with a louvred smoke vent (it stands over the link lean-to)
gz0,gz1=Z0+(PLATE-EAVE)/K,Z1-(PLATE-EAVE)/K
gab=[]
gpts=[(gz1,PLATE),(Z1-DZ-.12,HIPY-.08),(Z0+DZ+.12,HIPY-.08),(gz0,PLATE)]
gab.append(mesh('Survival_RoofGablet',[(XG-.06,y,z) for z,y in gpts]+[(XG+.06,y,z) for z,y in gpts],[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],plank))
def gab_top(z):
 if z>Z1-DZ:return PLATE+(gz1-z)/(gz1-(Z1-DZ))*(HIPY-.08-PLATE)
 if z<Z0+DZ:return PLATE+(z-gz0)/((Z0+DZ)-gz0)*(HIPY-.08-PLATE)
 return HIPY-.08
zz=gz0+.3
while zz<gz1-.2:
 gab.append(beam('Survival_RoofGablet',(XG+.1,PLATE,zz),(XG+.1,gab_top(zz)-.05,zz),.05,.05,timber));zz+=.42
gab.append(beam('Survival_RoofGablet',(XG+.12,PLATE+.05,gz0),(XG+.12,PLATE+.05,gz1),.14,.16,timber))
gab.append(beam('Survival_RoofGablet',(XG+.12,HIPY-.12,Z0+DZ),(XG+.12,HIPY-.12,Z1-DZ),.12,.14,timber))
gab.append(prism('Survival_RoofGablet',XG+.06,XG+.2,HIPY-.95,HIPY-.25,ZC-.45,ZC+.45,timber))
for k in range(4):gab.append(prism('Survival_RoofGablet',XG+.18,XG+.26,HIPY-.9+k*.16,HIPY-.84+k*.16,ZC-.4,ZC+.4,wood))
join(gab,'Survival_RoofGablet')

# raised-cruck trusses (above head height, hidden with the roof in the cutaway)
truss=[]
for tx in [-3.5,-1.65]:
 truss.append(beam('Survival_RoofTruss',(tx,PLATE-.05,-4),(tx,PLATE-.05,1),.2,.22,wood))                # tie beam
 for zz,s in [(-4,1),(1,-1)]:
  a=(tx,PLATE,zz);m=(tx,3.72,zz+s*.95);b=(tx,4.92,ZC-s*.38);c=(tx,RIDGE-.3,ZC)
  truss.append(beam('Survival_RoofTruss',a,m,.2,.2,timber));truss.append(beam('Survival_RoofTruss',m,b,.19,.19,timber));truss.append(beam('Survival_RoofTruss',b,c,.18,.18,timber))
 truss.append(beam('Survival_RoofTruss',(tx,4.35,-2.85),(tx,4.35,-.15),.16,.16,wood))                   # collar
 truss.append(beam('Survival_RoofTruss',(tx,PLATE+.1,ZC),(tx,4.35,ZC),.14,.14,wood))                    # king strut
truss.append(beam('Survival_RoofTruss',(RA-.3,RIDGE-.32,ZC),(min(RB+.3,XG-.1),RIDGE-.32,ZC),.18,.18,wood))           # ridge purlin
for zz in [-3.0,0.0]:truss.append(beam('Survival_RoofTruss',(-6,3.75 if zz<0 else 3.75,zz),(.8,3.75,zz),.15,.15,wood))
join(truss,'Survival_RoofTruss')

# ----- canopy furnishings: dry teaching bench, trestle, drying pole with fish and herbs -----
fur=[]
fur.append(prism('Survival_FurnishingBench',-5.1,-.95,.38,.46,-3.45,-3.02,plank))
for bx in [-4.9,-3.0,-1.15]:
 for bz in [-3.38,-3.09]:fur.append(beam('Survival_FurnishingBench',(bx,0,bz),(bx+(.06 if bz<-3.2 else -.06),.39,bz),.08,.08,wood))
fur.append(prism('Survival_FurnishingBench',-5.0,-1.05,.14,.2,-3.28,-3.2,wood))
# tools laid out on the bench for the lesson: kindling bundle, a knife and a wrapped line
fur.append(log('Survival_FurnishingBench',(-4.6,.52,-3.24),(-3.9,.52,-3.24),.06,twine,sides=5,endmat=sillmat))
fur.append(prism('Survival_FurnishingBench',-2.3,-1.9,.46,.49,-3.3,-3.18,sillmat));fur.append(prism('Survival_FurnishingBench',-2.62,-2.3,.46,.5,-3.27,-3.21,timber))
# trestle table at the west end with a cleaning board and fish
fur.append(prism('Survival_FurnishingTable',-5.65,-4.45,.74,.82,-1.95,-.65,plank))
for tz in [-1.8,-.8]:
 for s in [-1,1]:fur.append(beam('Survival_FurnishingTable',(-5.05+s*.45,0,tz),(-5.05+s*.1,.75,tz),.07,.07,wood))
fur.append(prism('Survival_FurnishingTable',-5.4,-4.75,.82,.86,-1.55,-1.05,sillmat))
for i,fz in enumerate([-1.45,-1.2]):
 fur.append(mesh('Survival_FurnishingTable',[(-5.3,.87,fz),(-5.05,.93,fz-.06),(-4.85,.87,fz),(-5.05,.9,fz+.06),(-4.75,.9,fz-.05),(-4.75,.9,fz+.05)],[(0,1,2,3),(2,4,5)],ember))
fur.append(prism('Survival_FurnishingTable',-5.55,-5.15,.82,1.02,-.95,-.75,timber))     # a creel
# drying pole between the trusses: hanging fish and herb bunches (bottoms stay above head height)
fur.append(log('Survival_FurnishingDrying',(-3.5,2.62,-2.1),(-1.65,2.62,-2.1),.04,wood,sides=5))
for i in range(6):
 hx=-3.3+i*.3;fur.append(beam('Survival_FurnishingDrying',(hx,2.62,-2.1),(hx,2.44,-2.1),.015,.015,twine))
 if i%2==0:fur.append(mesh('Survival_FurnishingDrying',[(hx,2.44,-2.1),(hx+.07,2.33,-2.1),(hx,2.2,-2.1),(hx-.07,2.33,-2.1),(hx,2.33,-2.05),(hx,2.33,-2.15)],[(0,1,2,3),(0,4,2,5)],ember))
 else:fur.append(mesh('Survival_FurnishingDrying',[(hx-.06,2.44,-2.1),(hx+.06,2.44,-2.1),(hx,2.24,-2.1),(hx,2.44,-2.04),(hx,2.44,-2.16)],[(0,1,2),(3,4,2)],reed))
join(fur,'Survival_FurnishingCanopy')

# =====================================================================================================
# 2. TOOL STORE: fieldstone sill wall, board floor at +0.6, vertical plank walls, catslide shingle lean-to
# =====================================================================================================
SF=.6
def store_top(z):return 3.3+.25*(-z)            # plank tops fall from 4.3 (north) to 3.3 (south front)
for name,axis,c,u0,u1,out in [('North','x',-4,1.8,6.2,-1),('South','x',0,1.8,6.2,1),('East','z',6,-4.2,.2,1),('West','z',2,-4.2,.2,-1)]:
 cc=c+out*.2-out*.2   # wall centred on the outline
 lo=(min(th(u,c) for u in [u0+(u1-u0)*i/12 for i in range(13)]) if axis=='x' else min(th(c,u) for u in [u0+(u1-u0)*i/12 for i in range(13)]))-.12
 lo=min(lo,SF-.4)
 if axis=='x':prism('Survival_ShellStoreBase',u0,u1,lo,SF,c-.2,c+.2,stone)
 else:prism('Survival_ShellStoreBase',c-.2,c+.2,lo,SF,u0,u1,stone)
 if name!='West':stone_facing('Survival_ShellStoreBaseFacing',u0+.05,u1-.05,lo,SF-lo,axis,c+out*.03,[],out)
 for a,b in ([(u0-.02,-2.95),(-1.05,u1+.02)] if name=='West' else [(u0-.02,u1+.02)]):   # no kerb across the door
  prism('Survival_ShellStoreBase',*((a,b,SF-.02,SF+.06,c-.23,c+.23) if axis=='x' else (c-.23,c+.23,SF-.02,SF+.06,a,b)),sillmat)
prism('Survival_FloorStore',2.2,5.8,SF-.16,SF-.03,-3.8,-.2,floor)
srng=random.Random(606);z=-3.8
while z<-.2-.01:
 z1=min(-.2,z+.28);prism('Survival_FloorStore',2.2,5.8,SF-.05,SF,z+.01,z1-.01,floor if srng.random()<.7 else plank);z=z1
prism('Survival_FloorStore',1.8,2.2,SF-.05,SF,-2.9,-1.1,sillmat)          # worn threshold stone
DOOR=[-2.9,-1.1,SF,SF+2.3];WIN=[-2.6,-1.4,SF+1.1,SF+1.9]
def plank_wall(name,axis,c,u0,u1,y0,top,holes,out):
 prng=random.Random(name+str(c));cuts=sorted(set([u0,u1]+[h for hh in holes for h in hh[:2]]+[u0+i*.26 for i in range(1,int((u1-u0)/.26)+1) if u0+i*.26<u1-.05]))
 parts=[]
 for i,(a,b) in enumerate(zip(cuts,cuts[1:])):
  if b-a<.03:continue
  m=(a+b)/2;segs=[(y0,None)]
  spans=[(y0,'top')]
  pieces=[(y0,top(m))]
  for h in holes:
   if h[0]<m<h[1]:pieces=[(y0,h[2]),(h[3],'top')]
  off=out*(.02 if i%2 else -.005);mat=plank if prng.random()<.72 else wood
  for lo,hi in pieces:
   ha=top(a) if hi=='top' else hi;hb=top(b) if hi=='top' else hi
   if max(ha,hb)-lo<.03:continue
   f0,f1=c-.06+off,c+.06+off
   if axis=='x':v=[(a+.01,lo,f0),(b-.01,lo,f0),(b-.01,hb,f0),(a+.01,ha,f0),(a+.01,lo,f1),(b-.01,lo,f1),(b-.01,hb,f1),(a+.01,ha,f1)]
   else:v=[(f0,lo,a+.01),(f0,lo,b-.01),(f0,hb,b-.01),(f0,ha,a+.01),(f1,lo,a+.01),(f1,lo,b-.01),(f1,hb,b-.01),(f1,ha,a+.01)]
   parts.append(mesh(name,v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],mat))
 # rails (outside, dark oak) and corner posts
 f0,f1=(c+out*.08,c+out*.16)
 for ry in [y0+.35,y0+1.55]:
  spans=[(u0,u1)]
  for h in holes:
   if h[2]<ry+.14 and ry<h[3]:spans=[q for a,b in spans for q in [(a,min(b,h[0]-.12)),(max(a,h[1]+.12),b)]]
  for a,b in spans:
   if b-a>.1:parts.append(prism(name,a,b,ry,ry+.14,min(f0,f1),max(f0,f1),timber) if axis=='x' else prism(name,min(f0,f1),max(f0,f1),ry,ry+.14,a,b,timber))
 return parts
walls=[]
walls+=plank_wall('Survival_ShellStoreNorth','x',-4,1.85,6.15,SF,lambda u:store_top(-4),[],-1)
walls+=plank_wall('Survival_ShellStoreSouth','x',0,1.85,6.15,SF,lambda u:store_top(0),[],1)
walls+=plank_wall('Survival_ShellStoreEast','z',6,-4.05,.05,SF,store_top,[WIN],1)
walls+=plank_wall('Survival_ShellStoreWest','z',2,-4.05,.05,SF,store_top,[DOOR],-1)
for cx,cz in [(1.9,-4.1),(6.1,-4.1),(1.9,.1),(6.1,.1)]:walls.append(prism('Survival_ShellStorePost',cx-.13,cx+.13,SF,store_top(cz)+.05,cz-.13,cz+.13,timber))
# plates under the lean-to and the long wall heads
walls.append(prism('Survival_ShellStorePlate',1.75,6.25,store_top(-4)-.05,store_top(-4)+.12,-4.2,-3.95,timber))
walls.append(prism('Survival_ShellStorePlate',1.75,6.25,store_top(0)-.05,store_top(0)+.12,-.05,.2,timber))
# door frame, heavy boarded leaf standing open against the inside, strap hinges, hasp and padlock
walls.append(prism('Survival_ShellStoreDoor',1.84,2.16,SF,SF+2.42,-3.03,-2.9,timber));walls.append(prism('Survival_ShellStoreDoor',1.84,2.16,SF,SF+2.42,-1.1,-.97,timber))
walls.append(prism('Survival_ShellStoreDoor',1.8,2.2,SF+2.3,SF+2.46,-3.05,-.95,timber))
door=[]
for i in range(6):door.append(prism('Survival_ShellStoreDoor',2.22+i*.29,2.22+i*.29+.28,SF+.03,SF+2.26,-2.89,-2.83,plank if i%2 else wood))
for ly in [SF+.35,SF+1.9]:door.append(prism('Survival_ShellStoreDoor',2.25,3.95,ly,ly+.14,-2.83,-2.79,wood))
door.append(beam('Survival_ShellStoreDoor',(2.35,SF+.45,-2.81),(3.85,SF+1.9,-2.81),.04,.12,wood))
for ly in [SF+.4,SF+1.95]:door.append(prism('Survival_ShellStoreDoor',2.24,3.3,ly,ly+.07,-2.9,-2.88,iron))
door.append(prism('Survival_ShellStoreDoor',3.84,3.96,SF+1.1,SF+1.3,-2.9,-2.78,iron))     # hasp staple
door.append(prism('Survival_ShellStoreDoor',2.16,2.22,SF+1.12,SF+1.3,-1.04,-.99,iron))      # hasp on the jamb
door.append(prism('Survival_ShellStoreDoor',2.14,2.24,SF+.95,SF+1.1,-1.08,-.98,iron))       # padlock hanging open
walls+=door
# east window: frame and a side-hung shutter open against the wall
walls.append(prism('Survival_ShellStoreWindow',5.9,6.24,WIN[2]-.1,WIN[2],WIN[0]-.12,WIN[1]+.12,sillmat))
for wz in [WIN[0]-.05,WIN[1]+.05]:walls.append(prism('Survival_ShellStoreWindow',5.92,6.2,WIN[2],WIN[3],wz-.05,wz+.05,timber))
walls.append(prism('Survival_ShellStoreWindow',5.92,6.2,WIN[3],WIN[3]+.1,WIN[0]-.1,WIN[1]+.1,timber))
for i in range(4):walls.append(prism('Survival_ShellStoreWindow',6.2,6.25,WIN[2]+.02,WIN[3]-.02,WIN[1]+.12+i*.3,WIN[1]+.4+i*.3,plank))
for a,b in [((2.15,SF+.5,-4.15),(3.25,SF+1.55,-4.15)),((5.85,SF+.5,-4.15),(4.75,SF+1.55,-4.15)),((6.15,SF+.5,-.15),(6.15,SF+1.55,-1.15)),((2.15,SF+.5,.15),(3.1,SF+1.55,.15))]:
 walls.append(beam('Survival_ShellStoreBrace',a,b,.06,.14,timber))
walls.append(prism('Survival_ShellStoreHung',1.8,1.84,SF+1.35,SF+1.55,-.85,-.15,iron))                 # bow saw blade
walls.append(beam('Survival_ShellStoreHung',(1.82,SF+1.55,-.85),(1.82,SF+1.95,-.5),.03,.05,wood));walls.append(beam('Survival_ShellStoreHung',(1.82,SF+1.95,-.5),(1.82,SF+1.55,-.15),.03,.05,wood))
walls.append(log('Survival_ShellStoreHung',(1.78,SF+1.0,-3.6),(1.9,SF+1.0,-3.6),.22,twine,sides=8))       # rope coil
walls.append(log('Survival_ShellStoreHung',(1.74,SF+1.0,-3.6),(1.94,SF+1.0,-3.6),.1,wood,sides=6))
join(walls,'Survival_ShellStore')
# ----- catslide shingle lean-to: over the store and forward as the sheltered front -----
def roof_y(z):return store_top(z)+.14
RZ0,RZ1,RX0,RX1=-4.45,.42,1.62,6.5
store_roof=[mesh('Survival_RoofStoreDeck',[(RX0,roof_y(RZ1),RZ1),(RX1,roof_y(RZ1),RZ1),(RX1,roof_y(RZ0),RZ0),(RX0,roof_y(RZ0),RZ0)],[(0,1,2,3)],shingle_dark)]
s=store_roof[0].modifiers.new('deck','SOLIDIFY');s.thickness=.08;s.offset=-1
nrm_store=Vector((0,1,.25)).normalized()
lay('Survival_RoofStoreShingles',lambda t,s:(s,roof_y(RZ1+(RZ0-RZ1)*t),RZ1+(RZ0-RZ1)*t),lambda t:(RX0,RX1),11,nrm_store,[shingle,shingle_dark,wood],seed=77,size=(.26,.42),lip=(.02,.06))
for bx in [RX0,RX1]:beam('Survival_RoofStoreBarge',(bx,roof_y(RZ1)+.02,RZ1),(bx,roof_y(RZ0)+.02,RZ0),.1,.2,wood)
beam('Survival_RoofStoreBarge',(RX0,roof_y(RZ0)+.1,RZ0),(RX1,roof_y(RZ0)+.1,RZ0),.16,.2,timber)          # top capping
# pentice front: its own lower, steeper lean-to against the front wall, plate on two posts with braces
def pen_y(z):return 3.05-(z-.05)*.3
PZ0,PZ1,PX0,PX1=.05,1.85,1.62,6.5
pd=mesh('Survival_RoofPenticeDeck',[(PX0,pen_y(PZ1),PZ1),(PX1,pen_y(PZ1),PZ1),(PX1,pen_y(PZ0),PZ0),(PX0,pen_y(PZ0),PZ0)],[(0,1,2,3)],shingle_dark)
s_=pd.modifiers.new('deck','SOLIDIFY');s_.thickness=.08;s_.offset=-1
lay('Survival_RoofPenticeShingles',lambda t,s:(s,pen_y(PZ1+(PZ0-PZ1)*t)+.1,PZ1+(PZ0-PZ1)*t),lambda t:(PX0,PX1),5,Vector((0,1,.3)).normalized(),[shingle,shingle_dark,wood],seed=79,size=(.26,.42),lip=(.02,.06))
for bx in [PX0,PX1]:beam('Survival_RoofPenticeBarge',(bx,pen_y(PZ1)+.1,PZ1),(bx,pen_y(PZ0)+.1,PZ0),.1,.18,wood)
beam('Survival_RoofPenticeBarge',(PX0,pen_y(PZ0)+.14,PZ0+.05),(PX1,pen_y(PZ0)+.14,PZ0+.05),.14,.14,timber)     # flashing batten on the wall
pen=[]
pen.append(beam('Survival_FramePentice',(1.7,pen_y(1.55)-.12,1.55),(6.45,pen_y(1.55)-.12,1.55),.18,.18,timber))
for px in [3.2,6.25]:
 g=th(px,1.55);pen.append(prism('Survival_FramePentice',px-.18,px+.18,g-.25,g+.1,1.37,1.73,sillmat))
 pen.append(beam('Survival_FramePentice',(px,g+.05,1.55),(px,pen_y(1.55)-.2,1.55),.18,.18,timber))
 for s in [-1,1]:
  if 1.8<px+s*.5<6.5:pen.append(beam('Survival_FramePentice',(px,pen_y(1.55)-.75,1.55),(px+s*.5,pen_y(1.55)-.22,1.55),.1,.1,wood))
x=1.75
while x<6.5:
 pen.append(beam('Survival_FramePentice',(x,pen_y(.1)-.02,0.1),(x,pen_y(1.8)+.02,1.8),.09,.1,wood));x+=.68
join(pen,'Survival_FramePentice')

# =====================================================================================================
# 3. COVERED LINK: steps up to the store door under a shingle lean-to leaning on the canopy thatch
# =====================================================================================================
for i,(x0,x1) in enumerate([(.75,1.1),(1.1,1.45),(1.45,1.8)]):
 y=.2*(i+1);prism('Survival_StepLink',x0,x1,-.25,y,-3.0,-1.0,sillmat if i==2 else stone)
link=[]
LZ0,LZ1=-3.45,-.62
def link_y(x):return 3.42-(1.95-x)*.36
link.append(mesh('Survival_RoofLinkDeck',[(.97,link_y(.97),LZ0),(1.95,link_y(1.95),LZ0),(1.95,link_y(1.95),LZ1),(.97,link_y(.97),LZ1)],[(0,1,2,3)],shingle_dark))
s=link[0].modifiers.new('deck','SOLIDIFY');s.thickness=.08;s.offset=-1
nrm_link=Vector((-.36,1,0)).normalized()
lay('Survival_RoofLinkShingles',lambda t,s:(.97+(1.95-.97)*t,link_y(.97+(1.95-.97)*t),s),lambda t:(LZ0,LZ1),4,nrm_link,[shingle,shingle_dark,wood],seed=78,size=(.26,.42),lip=(.02,.06))
lf=[]
lf.append(beam('Survival_FrameLink',(.85,PLATE+.02,-3.45),(.85,PLATE+.02,-.62),.18,.18,timber))           # link beam on the canopy posts
lf.append(prism('Survival_FrameLink',.76,.94,PLATE+.1,link_y(.85)-.05,-3.1,-3.0,wood))
lf.append(prism('Survival_FrameLink',.76,.94,PLATE+.1,link_y(.85)-.05,-1.0,-.9,wood))
for lz in [-3.3,-2.2,-1.3,-.75]:lf.append(beam('Survival_FrameLink',(.8,link_y(.8)-.1,lz),(1.9,link_y(1.9)-.1,lz),.08,.1,wood))
join(lf,'Survival_FrameLink')

# porch boards between canopy, link and the store front
PORCH=[(.8,-1),(1.8,-1),(1.8,.2),(3,.2),(3,1),(.8,1)]
poly_prism('Survival_FloorPorch',PORCH,min(-.3,tmin(.8,3,-1,1)-.1),-.03,stone)
z=-1.0
while z<1-.01:
 z1=min(1,z+.3);xmax=1.8 if z<.2 else 3.0
 prism('Survival_FloorPorch',.8,xmax-.01,-.05,0,z+.012,z1-.012,floor);z=z1

# =====================================================================================================
# 4. FIRE HARD-STANDING: flagged pad with kerb and a step from the canopy, fire ring, tripod and pot
# =====================================================================================================
YF=-.4;FX0,FX1,FZ0,FZ1=-4.6,.6,1.0,5.0
pad_lo=tmin(FX0,FX1,FZ0,FZ1)-.12
prism('Survival_FloorYard',FX0,FX1,pad_lo,YF-.03,FZ0,FZ1,stone_dark)
frng=random.Random(4040);z=FZ0+.04
while z<FZ1-.05:
 z1=min(FZ1-.04,z+frng.uniform(.55,.85));x=FX0+.04
 while x<FX1-.05:
  x1=min(FX1-.04,x+frng.uniform(.6,1.0))
  prism('Survival_FloorYard',x+.025,x1-.025,YF-.05,YF,z+.025,z1-.025,frng.choice([flag,flag,sillmat,stone_light]))
  x=x1
 z=z1
stone_facing('Survival_PlinthYardFacingW',FZ0,FZ1,pad_lo,YF-pad_lo,'z',FX0+.2,[],-1)
stone_facing('Survival_PlinthYardFacingS',FX0,FX1,pad_lo,YF-pad_lo,'x',FZ1-.2,[],1)
prism('Survival_StepYard',-3.25,-1.9,YF,-.2,1.0,1.36,sillmat)
FIRE=(-2.5,YF,3.5)
fire=[]
for i in range(11):
 a=i*math.tau/11;fire.append(rock('Survival_ServiceFirePit_Ring',(FIRE[0]+math.cos(a)*.44,YF+.1,FIRE[2]+math.sin(a)*.44),.13,.12,.11,stone_light if i%3 else stone,1100+i))
fire.append(poly_prism('Survival_ServiceFirePit_Ring',[(FIRE[0]+math.cos(i*math.tau/8)*.36,FIRE[2]+math.sin(i*math.tau/8)*.36) for i in range(8)],YF,YF+.03,stone_dark))
for i in range(4):
 a=i*math.tau/4+.4;fire.append(log('Survival_ServiceFirePit_Ring',(FIRE[0]+math.cos(a)*.3,YF+.06,FIRE[2]+math.sin(a)*.3),(FIRE[0]+math.cos(a)*.03,YF+.42,FIRE[2]+math.sin(a)*.03),.05,wood,sides=5,endmat=sillmat))
for i in range(5):
 a=i*1.3;fire.append(rock('Survival_ServiceFirePit_Ring',(FIRE[0]+math.cos(a)*.14,YF+.06,FIRE[2]+math.sin(a)*.14),.06,.04,.05,ember,1200+i))
# cooking tripod and a hanging pot
apex=Vector((FIRE[0],YF+1.35,FIRE[2]))
for i in range(3):
 a=i*math.tau/3+.5;fire.append(beam('Survival_ServiceFirePit_Ring',(FIRE[0]+math.cos(a)*.52,YF,FIRE[2]+math.sin(a)*.52),tuple(apex+Vector((0,.08,0))),.06,.06,wood))
fire.append(beam('Survival_ServiceFirePit_Ring',tuple(apex),(FIRE[0],YF+.82,FIRE[2]),.02,.02,iron))
fire.append(poly_prism('Survival_ServiceFirePit_Ring',[(FIRE[0]+math.cos(i*math.tau/8)*.17,FIRE[2]+math.sin(i*math.tau/8)*.17) for i in range(8)],YF+.56,YF+.8,iron))
fire.append(poly_prism('Survival_ServiceFirePit_Ring',[(FIRE[0]+math.cos(i*math.tau/8)*.12,FIRE[2]+math.sin(i*math.tau/8)*.12) for i in range(8)],YF+.5,YF+.56,iron))
join(fire,'Survival_ServiceFirePit_Ring')
# log seats round the fire (south and west, clear of the approach from the canopy step)
seats=[log('Survival_FurnishingYard',(-3.25,YF+.2,4.75),(-1.75,YF+.2,4.75),.2,wood,sides=7,endmat=sillmat),
 log('Survival_FurnishingYard',(-3.95,YF+.2,2.85),(-3.95,YF+.2,4.15),.2,wood,sides=7,endmat=sillmat)]
join(seats,'Survival_FurnishingYard')

# =====================================================================================================
# 5. LOG PILE, CHOPPING BLOCK AND AXE under the sheltered front
# =====================================================================================================
lp=[];LB=tmax(3.1,6.0,.25,1.0)+.02
for bz in [.35,.85]:lp.append(prism('Survival_ServiceLogPile_Stack',3.05,6.0,tmin(3.1,6,.25,1)-.1,LB,bz-.07,bz+.07,timber))
lrng=random.Random(515)
for row,count in enumerate([9,8,7,5]):
 for i in range(count):
  x=3.25+i*.31+row*.155+lrng.uniform(-.02,.02);y=LB+.14+row*.26
  lp.append(log('Survival_ServiceLogPile_Stack',(x,y,.28+lrng.uniform(-.04,.04)),(x,y,.98+lrng.uniform(-.05,.05)),.14,wood,sides=6,endmat=sillmat))
for sx in [3.0,6.05]:lp.append(beam('Survival_ServiceLogPile_Stack',(sx,LB-.1,.62),(sx,LB+1.05,.62),.08,.08,timber))
BK=(5.5,th(5.5,1.5),1.5)
lp.append(log('Survival_ServiceLogPile_Stack',(BK[0],BK[1]-.15,BK[2]),(BK[0],BK[1]+.5,BK[2]),.27,wood,sides=8,endmat=sillmat))
ax=Vector((BK[0]-.05,BK[1]+.5,BK[2]))
lp.append(beam('Survival_ServiceLogPile_Stack',tuple(ax+Vector((0,.02,0))),tuple(ax+Vector((-.5,.55,-.1))),.05,.05,wood))
lp.append(prism('Survival_ServiceLogPile_Stack',ax.x-.06,ax.x+.08,ax.y-.07,ax.y+.12,ax.z-.03,ax.z+.03,iron))
lp.append(mesh('Survival_ServiceLogPile_Stack',[(ax.x+.08,ax.y-.1,ax.z-.03),(ax.x+.2,ax.y-.12,ax.z-.03),(ax.x+.2,ax.y+.15,ax.z-.03),(ax.x+.08,ax.y+.12,ax.z-.03),(ax.x+.08,ax.y-.1,ax.z+.03),(ax.x+.2,ax.y-.12,ax.z+.03),(ax.x+.2,ax.y+.15,ax.z+.03),(ax.x+.08,ax.y+.12,ax.z+.03)],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],iron))
for i,(sx,sz) in enumerate([(5.95,2.0),(5.1,2.05),(6.1,1.2)]):
 g=th(sx,sz);lp.append(mesh('Survival_ServiceLogPile_Stack',[(sx-.14,g,sz-.05),(sx+.14,g,sz-.05),(sx,g+.1,sz-.05),(sx-.14,g,sz+.3),(sx+.14,g,sz+.3),(sx,g+.1,sz+.3)],[(0,1,2),(5,4,3),(0,3,4,1),(1,4,5,2),(2,5,3,0)],sillmat if i%2 else wood))
join(lp,'Survival_ServiceLogPile_Stack')

# =====================================================================================================
# 6. TOOL RACK in the store: hatchet, tinderbox on a shelf, small net; crate and barrel beside
# =====================================================================================================
tr=[]
for rx in [3.35,5.65]:tr.append(prism('Survival_ServiceTools_Rack',rx-.06,rx+.06,SF,SF+2.2,-3.9,-3.72,wood))
for ry in [SF+1.05,SF+1.75]:tr.append(prism('Survival_ServiceTools_Rack',3.25,5.75,ry,ry+.1,-3.85,-3.72,timber))
tr.append(prism('Survival_ServiceTools_Rack',3.3,4.4,SF+1.02,SF+1.06,-3.9,-3.55,plank))      # shelf
for px in [3.6,4.1,4.7,5.3]:tr.append(prism('Survival_ServiceTools_Rack',px-.025,px+.025,SF+1.78,SF+1.82,-3.72,-3.55,wood))
# hatchet hung on a peg
tr.append(beam('Survival_ServiceTools_Rack',(4.7,SF+1.8,-3.62),(4.7,SF+1.2,-3.62),.05,.05,wood))
tr.append(mesh('Survival_ServiceTools_Rack',[(4.73,SF+1.25,-3.65),(4.95,SF+1.22,-3.65),(4.95,SF+1.42,-3.65),(4.73,SF+1.36,-3.65),(4.73,SF+1.25,-3.59),(4.95,SF+1.22,-3.59),(4.95,SF+1.42,-3.59),(4.73,SF+1.36,-3.59)],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],iron))
# tinderbox with flint and steel on the shelf
tr.append(prism('Survival_ServiceTools_Rack',3.5,3.78,SF+1.06,SF+1.2,-3.82,-3.62,wood))
tr.append(prism('Survival_ServiceTools_Rack',3.48,3.8,SF+1.2,SF+1.24,-3.84,-3.6,timber))
tr.append(prism('Survival_ServiceTools_Rack',3.9,4.05,SF+1.06,SF+1.1,-3.76,-3.66,iron))
tr.append(rock('Survival_ServiceTools_Rack',(4.18,SF+1.1,-3.7),.05,.04,.04,stone_dark,1300))
# small hand net: hoop, handle and a mesh of cords, hung from the right peg
hc=Vector((5.3,SF+1.25,-3.63));pts=[hc+Vector((math.cos(i*math.tau/8)*.26,math.sin(i*math.tau/8)*.26,0)) for i in range(8)]
for a,b in zip(pts,pts[1:]+pts[:1]):tr.append(beam('Survival_ServiceTools_Rack',tuple(a),tuple(b),.03,.03,wood))
tr.append(beam('Survival_ServiceTools_Rack',tuple(hc+Vector((0,.26,0))),(5.3,SF+1.8,-3.63),.04,.04,wood))
for k in [-.16,-.05,.06,.17]:
 tr.append(beam('Survival_ServiceTools_Rack',tuple(hc+Vector((k,-(.26**2-k*k)**.5,.01))),tuple(hc+Vector((k,(.26**2-k*k)**.5,.01))),.012,.012,twine))
 tr.append(beam('Survival_ServiceTools_Rack',tuple(hc+Vector((-(.26**2-k*k)**.5,k,.01))),tuple(hc+Vector(((.26**2-k*k)**.5,k,.01))),.012,.012,twine))
tr.append(poly_prism('Survival_ServiceTools_Rack',[(5.3+math.cos(i*math.tau/6)*.22,-3.6+math.sin(i*math.tau/6)*.12) for i in range(6)],SF,SF+.12,twine))   # coiled line
join(tr,'Survival_ServiceTools_Rack')
st=[prism('Survival_FurnishingStore',4.9,5.65,SF,SF+.7,-1.1,-.3,plank)]
for ex in [4.9,5.65]:st.append(prism('Survival_FurnishingStore',ex-.04,ex+.04,SF,SF+.7,-1.14,-.26,timber))
st.append(beam('Survival_FurnishingStore',(4.95,SF+.05,-1.12),(5.6,SF+.65,-1.12),.08,.04,timber))
st.append(log('Survival_FurnishingStore',(2.65,SF,-.62),(2.65,SF+.85,-.62),.3,wood,sides=8,endmat=plank))
for by in [SF+.18,SF+.67]:st.append(log('Survival_FurnishingStore',(2.65,by,-.62),(2.65,by+.06,-.62),.315,iron,sides=8))
join(st,'Survival_FurnishingStore')

# =====================================================================================================
# 7. BANK STAIR AND FISHING STAGE on the real creek edge (world x 39-44, z 90-91; water tiles (42,90),(43,90))
# =====================================================================================================
LZa,LZb=5.8,7.2;YL=.45;RISE=(YL-(-.9))/7;YD=-.9
prism('Survival_DeckLanding',7.9,8.62,YL-.08,YL,LZa,LZb,floor)
for i in range(1,7):
 x0=8.6+.35*(i-1);x1=x0+.35;y=YL-RISE*i
 prism('Survival_StepBank',x0,x1+.02,y-.07,y,LZa+.05,LZb-.05,floor if i%2 else plank)
prism('Survival_DeckJetty',10.7,13.0,YD-.1,YD-.035,LZa+.08,LZb-.08,timber)
x=10.7
while x<13.0-.01:
 prism('Survival_DeckJetty',x+.01,min(13.0,x+.26)-.01,YD-.05,YD,LZa-.05,LZb+.05,floor if int(x*4)%3 else plank);x+=.26
jf=[]
for z in [LZa+.02,LZb-.02]:
 jf.append(beam('Survival_JettyFrame',(8.55,YL-.14,z),(10.75,YD-.14,z),.1,.22,wood))                     # stair stringers
 jf.append(beam('Survival_JettyFrame',(10.7,YD-.14,z),(13.05,YD-.14,z),.12,.2,timber))                   # deck bearers
 for px in [10.8,11.9,12.92]:jf.append(log('Survival_JettyFrame',(px,-2.35,z),(px,YD-.1,z),.09,timber,sides=6))
 for px in [7.95,8.55]:jf.append(log('Survival_JettyFrame',(px,th(px,z)-.2,z),(px,YL-.08,z),.08,timber,sides=6))
 g=th(9.6,z);jf.append(log('Survival_JettyFrame',(9.6,g-.2,z),(9.6,YL-RISE*3-.2,z),.08,timber,sides=6))
 jf.append(beam('Survival_JettyFrame',(10.8,-2.0,z),(11.9,-1.1,z),.06,.1,wood));jf.append(beam('Survival_JettyFrame',(11.9,-2.0,z),(12.92,-1.1,z),.06,.1,wood))
 # handrails: posts, a sloping rail down the stair, a level rail along the stage
 rp=[(8.6,YL),(9.65,YL-RISE*3),(10.7,YD),(11.85,YD),(13.0,YD)]
 for px,py in rp:jf.append(prism('Survival_JettyFrame',px-.05,px+.05,py-.05,py+1.02,z-.05,z+.05,wood))
 jf.append(beam('Survival_JettyFrame',(8.6,YL+1.0,z),(10.7,YD+1.0,z),.07,.07,wood));jf.append(beam('Survival_JettyFrame',(10.7,YD+1.0,z),(13.0,YD+1.0,z),.07,.07,wood))
 jf.append(beam('Survival_JettyFrame',(8.6,YL+.5,z),(10.7,YD+.5,z),.05,.05,wood));jf.append(beam('Survival_JettyFrame',(10.7,YD+.5,z),(13.0,YD+.5,z),.05,.05,wood))
for px in [10.8,12.92]:jf.append(beam('Survival_JettyFrame',(px,-1.1,LZa),(px,-2.0,LZb),.06,.1,wood))
# mooring post with a rope turn at the stage end
jf.append(log('Survival_JettyFrame',(13.1,-2.3,LZb+.18),(13.1,YD+.55,LZb+.18),.1,timber,sides=6))
jf.append(log('Survival_JettyFrame',(13.1,YD+.2,LZb+.18),(13.1,YD+.3,LZb+.18),.12,twine,sides=6))
# bank stones at the stair foot
for i,(bx,bz) in enumerate([(10.4,5.55),(10.6,7.5),(9.9,7.55),(11.2,5.45)]):jf.append(rock('Survival_JettyFrame',(bx,th(bx,bz)+.05,bz),.26,.16,.22,stone if i%2 else stone_light,1400+i))
join(jf,'Survival_JettyFrame')
# fishing service: reed beds flanking the stage end and a float-marker pole for the fishing spot
fs=[];rr=random.Random(9090)
def reed_clump(parts,cx,cz,n,base,name):
 for i in range(n):
  a=rr.uniform(0,math.tau);d=rr.uniform(0,.28);x=cx+math.cos(a)*d;z=cz+math.sin(a)*d;h=rr.uniform(.9,1.45);lean=Vector((rr.uniform(-.15,.15),0,rr.uniform(-.15,.15)))
  b0=Vector((x,base,z));top=b0+Vector((0,h,0))+lean
  parts.append(mesh(name,[(x-.03,base,z),(x+.03,base,z),(x,base,z+.04),tuple(top)],[(0,1,3),(1,2,3),(2,0,3)],reed))
  if i%3==0:parts.append(log(name,tuple(b0.lerp(top,.72)),tuple(b0.lerp(top,.86)),.035,twine,sides=5))
WATER_LOCAL=1.62-PY
reed_clump(fs,13.45,5.55,11,WATER_LOCAL-.35,'Survival_ServiceFishing_Reeds')
reed_clump(fs,13.5,7.5,11,WATER_LOCAL-.35,'Survival_ServiceFishing_Reeds')
fs.append(log('Survival_ServiceFishing_Reeds',(13.85,WATER_LOCAL-.6,6.5),(13.85,YD+.9,6.5),.035,wood,sides=5))
fs.append(poly_prism('Survival_ServiceFishing_Reeds',[(13.85+math.cos(i*math.tau/6)*.09,6.5+math.sin(i*math.tau/6)*.09) for i in range(6)],WATER_LOCAL-.02,WATER_LOCAL+.1,ember))
fs.append(mesh('Survival_ServiceFishing_Reeds',[(13.85,YD+.9,6.5),(13.85,YD+.72,6.5),(13.85,YD+.81,6.78)],[(0,1,2)],ember))
join(fs,'Survival_ServiceFishing_Reeds')

# =====================================================================================================
# 8. PLANTED EDGE: bank reeds by the stair and two hazel coppice stools west of the canopy
# =====================================================================================================
bank=[]
reed_clump(bank,11.3,5.2,8,th(11.3,5.2)-.1,'Survival_Reeds');reed_clump(bank,11.6,7.9,9,th(11.6,7.9)-.1,'Survival_Reeds')
reed_clump(bank,-5.3,5.6,7,th(-5.3,5.6)-.1,'Survival_Reeds')
join(bank,'Survival_Reeds')
cop=[];crng=random.Random(2112)
for cx,cz in [(-8.4,-2.6),(-7.9,3.2)]:
 g=th(cx,cz);cop.append(log('Survival_Coppice',(cx,g-.2,cz),(cx,g+.28,cz),.42,wood,sides=8,endmat=sillmat))
 for i in range(7):
  a=i*math.tau/7+crng.uniform(-.2,.2);b=Vector((cx+math.cos(a)*.22,g+.25,cz+math.sin(a)*.22));t=b+Vector((math.cos(a)*.55,crng.uniform(2.2,3.0),math.sin(a)*.55))
  cop.append(beam('Survival_Coppice',tuple(b),tuple(t),.07,.07,wood))
  for j in range(2):
   c=b.lerp(t,.72+j*.22)+Vector((crng.uniform(-.15,.15),0,crng.uniform(-.15,.15)));r=crng.uniform(.32,.45)
   cop.append(rock('Survival_Coppice',tuple(c),r*1.15,r*.8,r*1.15,leaf,int(c.x*100+c.z*10+j)))
join(cop,'Survival_Coppice')

# =====================================================================================================
# batch, apply modifiers, save, export
# =====================================================================================================
for o in [o for o in bpy.context.scene.objects if o.type=='MESH']:
 bpy.context.view_layer.objects.active=o
 for modifier in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=modifier.name)
 fix(o)
groups={}
for o in [o for o in bpy.context.scene.objects if o.type=='MESH']:
 base=o.name.split('.')[0]
 for key in ['Survival_ShellStoreBaseFacing','Survival_PlinthYardFacing','Survival_RoofThatchDeck','Survival_RoofStoreDeck','Survival_RoofLinkDeck']:
  if base.startswith(key):base={'Survival_ShellStoreBaseFacing':'Survival_ShellStoreBase','Survival_PlinthYardFacing':'Survival_PlinthYard','Survival_RoofThatchDeck':'Survival_RoofThatch',
   'Survival_RoofStoreDeck':'Survival_RoofStore','Survival_RoofLinkDeck':'Survival_RoofLink'}[key]
 if base.startswith('Survival_Plinth') and not base.startswith('Survival_PlinthYard'):base='Survival_PlinthCanopy'
 if base.startswith('Survival_RoofStore') or base.startswith('Survival_RoofPentice'):base='Survival_RoofStore'
 if base.startswith('Survival_RoofLink'):base='Survival_RoofLink'
 if base.startswith('Survival_RoofGablet'):base='Survival_RoofThatch'
 groups.setdefault(base,[]).append(o)
for base,parts in groups.items():join(parts,base)
# merge material slots that point to the same material
for o in [o for o in bpy.context.scene.objects if o.type=='MESH']:
 mats=[s.material for s in o.material_slots];uniq=[]
 for m in mats:
  if m not in uniq:uniq.append(m)
 remap=[uniq.index(m) for m in mats]
 idx=[remap[p.material_index] for p in o.data.polygons]
 o.data.materials.clear()
 for m in uniq:o.data.materials.append(m)
 for p,i in zip(o.data.polygons,idx):p.material_index=i
bpy.context.view_layer.update()
model=OUT/'survival'
bpy.ops.wm.save_as_mainfile(filepath=str(model.with_suffix('.blend')))
bpy.ops.export_scene.gltf(filepath=str(model.with_suffix('.glb')),export_format='GLB',export_yup=True)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
corners=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
dims=[max(v[i] for v in corners)-min(v[i] for v in corners) for i in range(3)]
tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
used=sorted({s.material.name for o in meshes for s in o.material_slots if s.material})
report={'id':'survival','prefix':'Survival_','triangles':tris,'materials':len(used),'materialNames':used,
 'dimensionsTiles':{'x':round(dims[0],2),'z':round(dims[1],2),'y':round(dims[2],2)},
 'bounds':{'xmin':round(min(v.x for v in corners),2),'xmax':round(max(v.x for v in corners),2),'zmin':round(-max(v.y for v in corners),2),'zmax':round(-min(v.y for v in corners),2),
  'ymin':round(min(v.z for v in corners),2),'ymax':round(max(v.z for v in corners),2)},
 'placement':{'x':PX,'y':PY,'z':PZ},'meshes':sorted((o.name,sum(len(p.vertices)-2 for p in o.data.polygons)) for o in meshes)}
(PROOF/'asset_report.json').write_text(json.dumps(report,indent=1))
print('[SURVIVAL_V1] tris',tris,'materials',len(used),'meshes',len(meshes),'dims',[round(d,2) for d in dims])

# =====================================================================================================
# proof renders (terrain + creek patch added AFTER export; not part of the asset)
# =====================================================================================================
gv=[];gf=[];gid=[];WM=TER['water']
for wz in range(PZ-9,PZ+12):
 for wx in range(PX-11,PX+17):
  k=len(gv)
  for x,z in [(wx,wz),(wx+1,wz),(wx+1,wz+1),(wx,wz+1)]:gv.append((x-PX,TER['heights'][z*TS+x]-PY-.01,z-PZ))
  gf.append((k,k+1,k+2,k+3));gid.append(1 if WM[wz*TW+wx] else 0)
grass=material('Proof grass',(.33,.40,.17));bed=material('Proof creek bed',(.30,.27,.2));water=material('Proof water',(.36,.45,.52))
t=mesh('ProofTerrain',gv,gf,grass);t.data.materials.append(bed)
for p,i in zip(t.data.polygons,gid):p.material_index=i
# creek surface patch at the creek water height (runtime draws it at waterY along the centreline)
C=TER['creek']['points']
def creek(x,z):
 best=(1e9,0)
 for a,b in zip(C,C[1:]):
  dx,dz=b[0]-a[0],b[1]-a[1];L=dx*dx+dz*dz;tt=max(0,min(1,((x-a[0])*dx+(z-a[1])*dz)/L));px,pz=a[0]+dx*tt,a[1]+dz*tt
  d=math.hypot(x-px,z-pz)
  if d<best[0]:best=(d,a[2]+(b[2]-a[2])*tt)
 return best
wv=[];wf=[]
for wz in range(PZ-9,PZ+12):
 for wx in range(PX-11,PX+17):
  if WM[wz*TW+wx] or creek(wx+.5,wz+.5)[0]<1.6:
   y=creek(wx+.5,wz+.5)[1]-PY;k=len(wv)
   for x,z in [(wx,wz),(wx+1,wz),(wx+1,wz+1),(wx,wz+1)]:wv.append((x-PX,y,z-PZ))
   wf.append((k,k+1,k+2,k+3))
if wv:mesh('ProofWater',wv,wf,water)
sc=bpy.context.scene;sc.render.engine='BLENDER_WORKBENCH';sc.display.shading.light='STUDIO';sc.display.shading.color_type='MATERIAL'
sc.display.shading.show_shadows=True;sc.display.shading.show_cavity=True;sc.render.resolution_x=960;sc.render.resolution_y=720
sc.world=sc.world or bpy.data.worlds.new('w')
cam=bpy.data.objects.new('ProofCam',bpy.data.cameras.new('ProofCam'));sc.collection.objects.link(cam);sc.camera=cam;cam.data.lens=35
def look(name,eye,target,lens=35):
 cam.data.lens=lens;e=Vector((eye[0],-eye[2],eye[1]));tt=Vector((target[0],-target[2],target[1]))
 cam.location=e;cam.rotation_euler=(tt-e).to_track_quat('-Z','Y').to_euler()
 sc.render.filepath=str(PROOF/(name+'.png'));bpy.ops.render.render(write_still=True)
look('01_front_se',(15,11,17),(2.5,.5,1.5))
look('02_back_nw',(-13,11,-14),(0,1,-1))
look('03_side_east_jetty',(9,7,19),(7,-.3,4),lens=30)
look('04_top',(3.5,34,1.5),(3.5,0,1.49),lens=35)
look('06_detail_link_store',(-1.5,3.2,6.5),(2.6,1.2,-1.2),lens=28)
for o in bpy.context.scene.objects:
 if o.name.startswith('Survival_Roof'):o.hide_render=True
look('05_cutaway',(9,13,13),(0,0,-.5))
import numpy as np
names=['01_front_se','02_back_nw','03_side_east_jetty','04_top','05_cutaway','06_detail_link_store']
imgs=[bpy.data.images.load(str(PROOF/(n+'.png'))) for n in names]
w,h=imgs[0].size;sheet=np.ones((h*2,w*3,4),dtype=np.float32)*.12;sheet[...,3]=1
for i,im in enumerate(imgs):
 px=np.array(im.pixels[:],dtype=np.float32).reshape(h,w,4);r,c=divmod(i,3)
 sheet[(1-r)*h:(2-r)*h,c*w:(c+1)*w]=px
out=bpy.data.images.new('sheet',w*3,h*2,alpha=True);out.pixels=sheet.ravel();out.filepath_raw=str(PROOF/'sheet.png');out.file_format='PNG';out.save()
print('[SURVIVAL_V1] proofs written to',PROOF)
