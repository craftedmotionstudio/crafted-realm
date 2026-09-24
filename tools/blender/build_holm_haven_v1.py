"""Departure Haven v1 (Tutor's Holm M4.4, 2026-09-24): plan place `ferry` at (124,103).
A fieldstone-abutted timber pier runs east from the dry pad down a stepped flight to a low landing stage over the
sea (sea plane world y -0.12), with a T-head davit at its end; a hipped-thatch waiting shelter sits to the north of
the pier root (stone back walls, framed plaster panel, low east parapet so the benches see the boat); a gabled
departure notice board with a ferry bell stands at the lane root; a sturdy single-mast clinker ferry skiff with a
furled lug sail, oars and mooring lines lies alongside the landing's south boarding gap. Original design.
Local space: origin = plan footprint centre, y 0 = measured pad (world 2.00). Game (x,y-up,z) -> Blender (x,-z,y).
Style and helpers follow tools/blender/build_holm_guide_house_overhaul_v2.py (walls with real voids, stone_facing
relief courses, framed plaster, course-laid roof). Deterministic (seeded).
"""
import bpy,bmesh,json,math,random,struct,hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'.studio-workspaces/holm-haven-v1/candidates'
PROOF=ROOT/'scratchpad/holm_haven_v1'
OUT.mkdir(parents=True,exist_ok=True);PROOF.mkdir(parents=True,exist_ok=True)
PLAN=json.loads((ROOT/'docs/rebuild/holm-overhaul/plan.json').read_text())
PLACE=[p for p in PLAN['places'] if p['id']=='ferry'][0];PX,PZ=PLACE['x'],PLACE['z']
TER=json.loads((ROOT/'.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json').read_text())
TW=TER['width'];TS=TW+1
def world_ground(wx,wz):
 i=min(TW-1,max(0,int(math.floor(wx))));j=min(TER['depth']-1,max(0,int(math.floor(wz))));fx=wx-i;fz=wz-j;H=TER['heights']
 a=H[j*TS+i];b=H[j*TS+i+1];c=H[(j+1)*TS+i];d=H[(j+1)*TS+i+1]
 return (a*(1-fx)+b*fx)*(1-fz)+(c*(1-fx)+d*fx)*fz
PAD=[world_ground(PX+x+.5,PZ+z+.5) for x in range(-3,6) for z in range(-6,2)]
PY=round(sum(PAD)/len(PAD),2)
def ground(x,z):return world_ground(PX+x,PZ+z)-PY          # local terrain height
def wet(x,z):return TER['water'][int(math.floor(PZ+z))*TW+int(math.floor(PX+x))]!=0
WATER=-.12-PY                                               # sea plane in local space
DECK=.15;LOW=-1.05                                          # pier/shelter walk level and the landing stage
bpy.ops.wm.read_factory_settings(use_empty=True)

# ---------------- materials (diffuse_color drives the runtime; principled base colour mirrors it) ----------------
MATS=[]
def material(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.92
 MATS.append(m);return m
stone=material('Warm fieldstone',(.43,.46,.40));stone_light=material('Stone lit faces',(.52,.54,.46));stone_dark=material('Stone shaded faces',(.37,.40,.35))
sillmat=material('Dressed sandstone',(.57,.53,.42));plaster=material('Limewash plaster',(.80,.74,.60))
timber=material('Dark frame oak',(.22,.15,.09));wood=material('Aged oak',(.30,.20,.12))
plank=material('Sun-worn deck oak',(.43,.32,.21));plank_pale=material('Pale plank edges',(.50,.39,.26))
thatch=material('Ochre thatch',(.62,.48,.22));thatch_light=material('Ochre thatch sunlit',(.70,.56,.28));thatch_dark=material('Ochre thatch weathered',(.49,.37,.17))
rope=material('Hemp rope',(.53,.44,.29));iron=material('Tarred iron',(.16,.18,.17))
hull=material('Honey oak strakes',(.46,.31,.16));paint=material('Sea green strake',(.24,.35,.28))
canvas=material('Furled canvas',(.76,.70,.56));tar=material('Dark tar seams',(.21,.16,.105))
bronze=material('Bell bronze',(.55,.40,.18));parchment=material('Notice parchment',(.84,.78,.62))
assert len(MATS)<=20

# ---------------- geometry accumulator: one mesh per group name ----------------
G={}
def add(group,verts,faces,mat):
 g=G.setdefault(group,{'v':[],'f':[],'m':[]});o=len(g['v'])
 g['v']+=[tuple(v) for v in verts];g['f']+=[tuple(o+i for i in f) for f in faces]
 g['m']+=mat if isinstance(mat,list) else [mat]*len(faces)
BOXF=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)]
def prism(g,x0,x1,y0,y1,z0,z1,mat):
 add(g,[(x0,y0,z0),(x1,y0,z0),(x1,y1,z0),(x0,y1,z0),(x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)],BOXF,mat)
def frame(axis):
 axis=axis.normalized();side=axis.cross(Vector((0,1,0)))
 if side.length<.01:side=axis.cross(Vector((1,0,0)))
 side.normalize();return side,axis.cross(side).normalized()
def beam(g,a,b,width,depth,mat):
 side,up=frame(Vector(b)-Vector(a))
 add(g,[tuple(Vector(p)+side*s*width/2+up*t*depth/2) for p in [a,b] for s,t in [(-1,-1),(1,-1),(1,1),(-1,1)]],
     [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat)
def rod(g,a,b,r,mat,n=8,r2=None):
 side,up=frame(Vector(b)-Vector(a));r2=r if r2 is None else r2
 v=[tuple(Vector(p)+rr*(math.cos(i*math.tau/n)*side+math.sin(i*math.tau/n)*up)) for p,rr in [(a,r),(b,r2)] for i in range(n)]
 add(g,v,[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],mat)
def slab(g,pts,thick,mat):
 # planar polygon extruded straight down by `thick` (closed solid)
 n=len(pts);v=list(pts)+[(x,y-thick,z) for x,y,z in pts]
 add(g,v,[tuple(range(n)),tuple(range(2*n-1,n-1,-1))]+[(i,i+n,(i+1)%n+n,(i+1)%n) for i in range(n)],mat)
def rope_line(g,a,b,sag,r=.028,segs=7):
 pts=[Vector(a).lerp(Vector(b),i/segs)-Vector((0,sag*math.sin(math.pi*i/segs),0)) for i in range(segs+1)]
 for p,q in zip(pts,pts[1:]):rod(g,tuple(p),tuple(q),r,rope,6)
def wall(g,u0,u1,base,height,axis,constant,holes,mat,t=.35):
 # grid partition with real voids (house v2 pattern)
 us=sorted(set([u0,u1]+[n for h in holes for n in h[:2]]));vs=sorted(set([base,base+height]+[n for h in holes for n in h[2:]]))
 for a,b in zip(us,us[1:]):
  for c,d in zip(vs,vs[1:]):
   u=(a+b)/2;v=(c+d)/2
   if any(h[0]<u<h[1] and h[2]<v<h[3] for h in holes):continue
   if axis=='x':prism(g,a,b,c,d,constant-t/2,constant+t/2,mat)
   else:prism(g,constant-t/2,constant+t/2,c,d,a,b,mat)
def stone_facing(g,u0,u1,base,height,axis,constant,holes,outward,seed):
 # house v2 relief skin: hand-cut stones in .36 courses, bevelled, three tones, real voids at openings
 rng=random.Random(seed);V=[];F=[];M=[]
 def point(u,v,depth):return (u,v,constant+outward*depth) if axis=='x' else (constant+outward*depth,v,u)
 for row in range(math.ceil(height/.36)):
  low=base+row*.36;high=min(base+height,low+.36);u=u0-(rng.uniform(0,.3) if row%2 else 0)
  while u<u1-.01:
   right=min(u1,u+rng.uniform(.58,1.05));segments=[(max(u0,u),right,low,high)]
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
    bev=min(.045,(r-l)/5,(hi-lo)/5);k=len(V)
    outline=[(l+bev,lo),(r-bev,lo),(r,lo+bev),(r,hi-bev),(r-bev,hi),(l+bev,hi),(l,hi-bev),(l,lo+bev)]
    V.extend(point(a,b,.178) for a,b in outline)
    V.extend(point(a+(1 if a<(l+r)/2 else -1)*.015,b+(1 if b<(lo+hi)/2 else -1)*.015,.205+rng.uniform(0,.018)) for a,b in outline)
    F.append(tuple(k+8+i for i in range(8)));M.append(rng.choice([stone,stone,stone,stone_light,stone_dark]))
    for i in range(8):F.append((k+i,k+(i+1)%8,k+8+(i+1)%8,k+8+i));M.append(stone_light if i in [3,4] else stone_dark)
   u=right
 add(g,V,F,M)
def frame_member(g,axis,constant,out,u0,u1,v0,v1):
 f0,f1=constant+out*.175,constant+out*.235;lo,hi=min(f0,f1),max(f0,f1)
 if axis=='x':prism(g,u0,u1,v0,v1,lo,hi,timber)
 else:prism(g,lo,hi,v0,v1,u0,u1,timber)
def nrm(a,b,c):
 v=(Vector(b)-Vector(a)).cross(Vector(c)-Vector(a)).normalized();return v if v.y>0 else -v

# =====================================================================================================
# PIER: stone abutment + upper deck (land level) -> stepped flight -> low landing stage + T-head
# =====================================================================================================
X0,XS,XL,XE=-2.5,8.0,10.25,17.5          # deck root, stair head, landing start, landing end
LANE=1.5
rng=random.Random(124103)
def planks(g,x0,x1,z0,z1,top,ragged_lo=True,ragged_hi=True):
 # flush boards laid across the walk; tone varies per board, ends ragged only outboard of the lane
 x=x0
 while x<x1-.01:
  e=min(x1,x+.3);m=rng.choice([plank,plank,plank_pale,wood])
  a=z0-(rng.uniform(0,.07) if ragged_lo else 0);b=z1+(rng.uniform(0,.07) if ragged_hi else 0)
  prism(g,x,e,top-.08,top,a,b,m);x=e
planks('Haven_DeckPier',X0,XS,-LANE,LANE,DECK)
planks('Haven_DeckLanding',XL,XE,-LANE,LANE,LOW)
# T-head bay to the north of the landing end (boards run the other way)
z=-3.6
while z<-LANE-.01:
 e=min(-LANE,z+.3);prism('Haven_DeckLanding',15.0,XE+rng.uniform(0,.06),LOW-.08,LOW,z,e,rng.choice([plank,plank_pale,plank]));z=e
# the flight: five treads of .2 rise / .45 run, full 3.0 lane width; the landing is the sixth tread
for i in range(1,6):
 top=DECK-.2*i;x0=XS+.45*(i-1);prism('Haven_StairFlight',x0,x0+.45,top-.08,top,-LANE,LANE,rng.choice([plank,plank_pale]))
 prism('Haven_PierFrame',x0+.4,x0+.45,top-.28,top-.08,-LANE+.05,LANE-.05,wood)          # riser board under the nosing
for zz in (-1.4,0,1.4):beam('Haven_PierFrame',(XS,DECK-.4,zz),(XL,LOW-.4,zz),.12,.24,timber)   # stringers
# joists / sleepers under every walked board
for zz in (-1.3,-.45,.45,1.3):
 prism('Haven_PierFrame',X0+.1,XS,DECK-.28,DECK-.08,zz-.07,zz+.07,timber)
 prism('Haven_PierFrame',XL,XE,LOW-.28,LOW-.08,zz-.07,zz+.07,timber)
for xx in (15.4,16.5,17.3):prism('Haven_PierFrame',xx-.07,xx+.07,LOW-.28,LOW-.08,-3.6,-LANE,timber)
# edge fascia beams (below the walk surface)
for s in (-1,1):
 prism('Haven_PierFrame',X0,XS,DECK-.34,DECK-.1,s*LANE-.07+s*.07,s*LANE+.07+s*.07,timber)
 prism('Haven_PierFrame',XL,XE,LOW-.34,LOW-.1,s*LANE-.07+s*.07,s*LANE+.07+s*.07,timber)
# fieldstone abutment where the bank falls away, with a sandstone cope under the deck
AB0,AB1,ABZ=5.6,7.6,1.75
abot=min(ground(x,z) for x in (AB0,AB1) for z in (-ABZ,ABZ))-.35;atop=DECK-.34
prism('Haven_PierStone',AB0,AB1,abot,atop,-ABZ,ABZ,stone)
stone_facing('Haven_PierStone',-ABZ,ABZ,abot,atop-abot,'z',AB1-.175,[],1,'abut-e')
stone_facing('Haven_PierStone',AB0,AB1,abot,atop-abot,'x',-ABZ+.175,[],-1,'abut-n')
stone_facing('Haven_PierStone',AB0,AB1,abot,atop-abot,'x',ABZ-.175,[],1,'abut-s')
prism('Haven_PierStone',AB0-.05,AB1+.12,atop-.02,atop+.06,-ABZ-.1,ABZ+.1,sillmat)
# kerb stones at the land root (flush with the ground, a threshold that reads as a quay edge)
for zz in (-LANE-.25,LANE+.25):
 x=X0
 while x<AB0:
  e=min(AB0,x+rng.uniform(.5,.9));prism('Haven_PierStone',x+.02,e-.02,-.12,.08,zz-.22,zz+.22,rng.choice([sillmat,stone_light,stone]));x=e
# piles, caps and bracing over the bank and the sea
def bent(x,z0,z1,top):
 caps=top-.34
 for z in (z0,z1):
  bot=ground(x,z)-.45
  rod('Haven_PierFrame',(x,bot,z),(x,caps,z),.15,wood,8)
  rod('Haven_PierFrame',(x,WATER-.05,z),(x,WATER+.12,z),.165,tar,8)          # tide stain band
  rod('Haven_PierFrame',(x,caps-.2,z),(x,caps-.12,z),.17,iron,8)
 prism('Haven_PierFrame',x-.13,x+.13,caps-.26,caps,z0-.2,z1+.2,timber)       # cap beam
 lo=max(ground(x,z0),ground(x,z1),WATER-.4)+.2
 if caps-lo>.6:
  beam('Haven_PierFrame',(x,lo,z0),(x,caps-.3,z1),.1,.12,timber);beam('Haven_PierFrame',(x,lo,z1),(x,caps-.3,z0),.1,.12,timber)
PILES=[(8.3,DECK),(9.4,-.45),(10.6,LOW),(12.4,LOW),(14.4,LOW),(16.2,LOW),(17.35,LOW)]
for x,top in PILES:bent(x,-1.62,1.62,top)
for x in (15.2,17.35):bent(x,-3.55,-2.4,LOW)
# longitudinal sway braces in the outer planes, between neighbouring bents
for (xa,ta),(xb,tb) in zip(PILES,PILES[1:]):
 for z in (-1.62,1.62):
  lo=max(ground((xa+xb)/2,z),WATER-.3)+.15
  if min(ta,tb)-.7-lo>.35:beam('Haven_PierFrame',(xa,lo,z),(xb,min(ta,tb)-.7,z),.1,.1,timber)

# ---------------- railings: posts outboard of the lane, top + mid rails ----------------
def rail_run(x0,x1,z,y_at,gate=False,axis='x'):
 n=max(1,math.ceil(abs(x1-x0)/1.55));pts=[x0+(x1-x0)*i/n for i in range(n+1)]
 for i,u in enumerate(pts):
  y=y_at(u);tall=1.25 if gate and i in (0,n) else 1.0
  if axis=='x':
   prism('Haven_PierRail',u-.07,u+.07,y-.35,y+tall,z-.07,z+.07,wood);prism('Haven_PierRail',u-.075,u+.075,y+.82,y+.88,z-.075,z+.075,iron)
  else:
   prism('Haven_PierRail',z-.07,z+.07,y-.35,y+tall,u-.07,u+.07,wood);prism('Haven_PierRail',z-.075,z+.075,y+.82,y+.88,u-.075,u+.075,iron)
 for h,w in [(.95,.09),(.5,.07)]:
  for a,b in zip(pts,pts[1:]):
   A=(a,y_at(a)+h,z) if axis=='x' else (z,y_at(a)+h,a);B=(b,y_at(b)+h,z) if axis=='x' else (z,y_at(b)+h,b)
   beam('Haven_PierRail',A,B,w,w,plank_pale if h>.9 else wood)
flat=lambda y:(lambda u:y)
def stair_y(u):return DECK+(LOW-DECK)*min(1,max(0,(u-XS)/(XL-XS)))
R=LANE+.12
rail_run(5.6,XS,-R,flat(DECK));rail_run(5.0,XS,R,flat(DECK))
rail_run(XS,XL,-R,stair_y);rail_run(XS,XL,R,stair_y)
rail_run(XL,15.0,-R,flat(LOW));rail_run(XL,12.4,R,flat(LOW),True);rail_run(16.6,XE,R,flat(LOW),True)
rail_run(15.0,XE,-3.72,flat(LOW));rail_run(-3.6,-LANE-.05,14.88,flat(LOW),axis='z');rail_run(-3.6,LANE,XE+.12,flat(LOW),axis='z')
# rail ends on land: stout newel posts with sandstone caps where the rails begin
for x,z in [(5.6,-R),(5.0,R)]:prism('Haven_PierRail',x-.12,x+.12,-.2,1.35,z-.12,z+.12,timber);prism('Haven_PierRail',x-.16,x+.16,1.35,1.45,z-.16,z+.16,sillmat)

# ---------------- mooring: bollards, cleats, fenders, lantern post, T-head davit ----------------
for x,z in [(11.9,R+.05),(17.2,R+.05),(13.2,-3.72+.02),(10.9,-R-.05)]:
 rod('Haven_Mooring',(x,LOW-.1,z),(x,LOW+.42,z),.13,wood,8);rod('Haven_Mooring',(x,LOW+.42,z),(x,LOW+.5,z),.15,iron,8)
 rod('Haven_Mooring',(x-.26,LOW+.3,z),(x+.26,LOW+.3,z),.055,iron,6)
for x in (13.1,14.5,15.9):                                                       # rope fenders on the boarding face
 rope_line('Haven_Mooring',(x,LOW-.12,LANE+.2),(x,LOW-.5,LANE+.22),0,.02,1);rod('Haven_Mooring',(x,LOW-.5,LANE+.24),(x,LOW-.95,LANE+.24),.11,rope,8)
# lantern post at the landing end (outboard corner) and at the stair head
def lantern(x,z,y):
 prism('Haven_Mooring',x-.08,x+.08,y-.4,y+2.3,z-.08,z+.08,timber);beam('Haven_Mooring',(x,y+2.2,z),(x,y+2.2,z+(.45 if z>0 else -.45)),.07,.07,iron)
 zz=z+(.45 if z>0 else -.45);rod('Haven_Mooring',(x,y+1.72,zz),(x,y+2.02,zz),.12,iron,6,.09);rod('Haven_Mooring',(x,y+1.78,zz),(x,y+1.98,zz),.1,parchment,6)
 rod('Haven_Mooring',(x,y+2.02,zz),(x,y+2.2,zz),.02,iron,4)
lantern(XE+.3,LANE+.3,LOW);lantern(XS-.1,-R-.2,DECK)
# davit on the T-head: post, jib, stay, hook and a net of cargo
DX,DZ=16.9,-3.25
prism('Haven_Mooring',DX-.13,DX+.13,LOW-.1,LOW+2.9,DZ-.13,DZ+.13,timber)
JT=(DX,LOW+3.25,DZ-1.75)                                                              # luffed jib, not a gibbet
beam('Haven_Mooring',(DX,LOW+2.1,DZ),JT,.14,.16,timber);beam('Haven_Mooring',(DX,LOW+1.2,DZ),(DX,LOW+2.45,DZ-.75),.1,.1,timber)
beam('Haven_Mooring',(DX,LOW+2.9,DZ),JT,.06,.06,wood)                                 # topping lift
rod('Haven_Mooring',(DX-.28,LOW+1.0,DZ+.18),(DX+.28,LOW+1.0,DZ+.18),.16,wood,8);rod('Haven_Mooring',(DX-.2,LOW+1.0,DZ+.18),(DX+.2,LOW+1.0,DZ+.18),.19,rope,8)
beam('Haven_Mooring',(DX+.28,LOW+1.0,DZ+.18),(DX+.28,LOW+.75,DZ+.45),.04,.04,iron)   # winch drum and crank
rope_line('Haven_Mooring',(DX,LOW+1.2,DZ+.1),(DX,LOW+2.9,DZ-.05),0,.018,1)
rope_line('Haven_Mooring',JT,(DX,LOW+1.55,DZ-1.75),0,.022,1);rod('Haven_Mooring',(DX,LOW+1.55,DZ-1.75),(DX,LOW+1.4,DZ-1.75),.07,iron,6)
rod('Haven_Mooring',(DX,LOW+.75,DZ-1.75),(DX,LOW+1.4,DZ-1.75),.34,rope,8,.12)          # slung cargo net
for x,z in [(15.55,-3.2),(15.6,-2.5)]:                                             # two barrels on the T-head
 rod('Haven_Props',(x,LOW,z),(x,LOW+.8,z),.3,wood,10);rod('Haven_Props',(x,LOW+.14,z),(x,LOW+.2,z),.31,iron,10);rod('Haven_Props',(x,LOW+.6,z),(x,LOW+.66,z),.31,iron,10)

# =====================================================================================================
# WAITING SHELTER (north of the pier root): x .5..5.5, z -5.5..-1.6, hipped thatch
# =====================================================================================================
SX0,SX1,SZ0,SZ1=.5,5.5,-5.5,-1.6
PLATE=2.95
# flagstone floor at deck level, laid flush; a stone footing ring meets the ground
x=SX0
while x<SX1-.01:
 e=min(SX1,x+rng.uniform(.6,.95));z=SZ0
 while z<SZ1-.01:
  f=min(SZ1,z+rng.uniform(.55,.9));prism('Haven_FloorShelter',x,e,-.15,DECK,z,f,rng.choice([sillmat,stone_light,stone,sillmat]));z=f
 x=e
prism('Haven_FloorShelter',SX0,SX1,-.15,DECK,SZ1,-LANE,sillmat)      # threshold strip to the pier boards
# west wall: full fieldstone with a shuttered window, faced both sides
WW=[[-4.0,-3.1,1.3,2.15]]
wall('Haven_ShellWest',SZ0,SZ1,-.3,PLATE+.3,'z',SX0+.175,WW,stone)
stone_facing('Haven_ShellWest',SZ0,SZ1,-.3,PLATE+.3,'z',SX0+.175,WW,-1,'w-out')
stone_facing('Haven_ShellWest',SZ0+.35,SZ1,DECK,PLATE-DECK,'z',SX0+.175,WW,1,'w-in')
# north wall: fieldstone to 1.2, then timber-framed limewash panels with a small window
wall('Haven_ShellNorth',SX0,SX1,-.3,1.5,'x',SZ0+.175,[],stone)
stone_facing('Haven_ShellNorth',SX0,SX1,-.3,1.5,'x',SZ0+.175,[],-1,'n-out')
stone_facing('Haven_ShellNorth',SX0+.35,SX1-.35,DECK,1.2-DECK,'x',SZ0+.175,[],1,'n-in')
NW=[[2.6,3.4,1.65,2.45]]
wall('Haven_ShellNorth',SX0,SX1,1.2,PLATE-1.2,'x',SZ0+.175,[[a,b,c,d] for a,b,c,d in NW],plaster)
for out in (-1,1):
 c=SZ0+.175
 frame_member('Haven_ShellTimber','x',c,out,SX0,SX1,1.2,1.38)              # sole plate on the stone
 frame_member('Haven_ShellTimber','x',c,out,SX0,SX1,PLATE-.18,PLATE)       # wall plate
 frame_member('Haven_ShellTimber','x',c,out,SX0,SX1,NW[0][2]-.1,NW[0][2])  # sill rail
 frame_member('Haven_ShellTimber','x',c,out,SX0,SX1,NW[0][3],NW[0][3]+.1)  # head rail
 studs=[SX0+.08,SX1-.08]+[u for u in (1.5,2.5,3.5,4.5) if not any(a-.15<u<b+.15 for a,b,_,_ in NW)]+[NW[0][0]-.07,NW[0][1]+.07]
 for s in studs:frame_member('Haven_ShellTimber','x',c,out,s-.07,s+.07,1.38,PLATE-.18)
 for end,d in [(SX0+.15,1),(SX1-.15,-1)]:                                   # end-bay braces, two straight members
  f=c+out*.205;beam('Haven_ShellTimber',(end,1.38,f),(end+d*.45,1.65,f),.11,.07,timber);beam('Haven_ShellTimber',(end+d*.45,1.65,f),(end+d*.85,NW[0][2]-.1,f),.11,.07,timber)
# window dressing: sills, lintels, jambs, mullions, open plank shutters
a,b,c,d=WW[0];x=SX0+.175
prism('Haven_ShellWest',x-.3,x+.3,c-.12,c,a-.12,b+.12,sillmat);prism('Haven_ShellWest',x-.24,x+.24,d,d+.16,a-.14,b+.14,sillmat)
prism('Haven_ShellWest',x-.1,x+.1,c,d,(a+b)/2-.04,(a+b)/2+.04,wood)
for zz,dz in [(a,-1),(b,1)]:prism('Haven_ShellWest',x-.3,x-.26,c,d,zz+dz*.02,zz+dz*.47,wood);prism('Haven_ShellWest',x-.32,x-.3,c+.15,c+.23,zz+dz*.04,zz+dz*.45,iron)
a,b,c,d=NW[0];zc=SZ0+.175
prism('Haven_ShellTimber',a-.12,b+.12,c-.16,c-.06,zc-.3,zc+.1,sillmat);prism('Haven_ShellTimber',(a+b)/2-.04,(a+b)/2+.04,c,d,zc-.08,zc+.08,wood)
for xx,dx in [(a,-1),(b,1)]:prism('Haven_ShellTimber',xx+dx*.03,xx+dx*.42,c,d,zc-.27,zc-.23,wood)
# east parapet: low fieldstone wall with sandstone coping - the benches see over it to the sea and the boat
wall('Haven_ShellEast',SZ0+.35,SZ1,-.3,1.3,'z',SX1-.175,[],stone)
stone_facing('Haven_ShellEast',SZ0+.35,SZ1,-.3,1.3,'z',SX1-.175,[],1,'e-out')
stone_facing('Haven_ShellEast',SZ0+.35,SZ1,DECK,1.0-DECK,'z',SX1-.175,[],-1,'e-in')
prism('Haven_ShellEast',SX1-.4,SX1+.05,1.0,1.1,SZ0+.3,SZ1+.05,sillmat)
# posts, wall plates, tie beams and braces carrying the roof over the open south and east sides
POSTS=[(3.0,SZ1-.12,0),(SX1-.175,SZ1-.12,1.1),(SX1-.175,-3.55,1.1),(SX1-.175,SZ0+.2,1.1)]
for px,pz,py in POSTS:
 if py==0:prism('Haven_ShellTimber',px-.22,px+.22,-.2,DECK+.12,pz-.22,pz+.22,sillmat)
 prism('Haven_ShellTimber',px-.12,px+.12,py,PLATE-.2,pz-.12,pz+.12,timber)
prism('Haven_ShellTimber',SX0,SX1+.05,PLATE-.24,PLATE,SZ1-.25,SZ1+.02,timber)          # south plate (bressumer)
prism('Haven_ShellTimber',SX1-.3,SX1-.05,PLATE-.24,PLATE,SZ0,SZ1,timber)                 # east plate
for tx in (SX0+.2,3.0,SX1-.2):prism('Haven_ShellTimber',tx-.1,tx+.1,PLATE-.22,PLATE-.02,SZ0+.2,SZ1-.1,timber)   # tie beams
for px,pz,py in POSTS[:2]:
 for s in (-1,1):
  if SX0+.3<px+s*.7<SX1:beam('Haven_ShellTimber',(px,PLATE-.9,pz),(px+s*.65,PLATE-.24,pz),.1,.1,timber)
for pz in (-3.55,SZ0+.2,SZ1-.12):
 for s in (-1,1):
  if SZ0+.3<pz+s*.7<SZ1:beam('Haven_ShellTimber',(SX1-.175,PLATE-.9,pz),(SX1-.175,PLATE-.24,pz+s*.65),.1,.1,timber)
# seats: north bench facing the pier, west bench facing the sea over the parapet, a sea chest (the starter pack)
def bench(x0,x1,z0,z1):
 prism('Haven_Furnishing',x0,x1,.55,.62,z0,z1,plank_pale)
 along=(x1-x0)>(z1-z0)
 for t in (.15,.5,.85):
  if along:xx=x0+(x1-x0)*t;prism('Haven_Furnishing',xx-.18,xx+.18,DECK,.55,z0+.05,z1-.05,stone_light)
  else:zz=z0+(z1-z0)*t;prism('Haven_Furnishing',x0+.05,x1-.05,DECK,.55,zz-.18,zz+.18,stone_light)
bench(1.35,4.0,SZ0+.35,SZ0+.8);bench(SX0+.35,SX0+.8,-4.7,-2.0)
prism('Haven_Furnishing',4.25,5.0,DECK,.62,SZ0+.4,SZ0+.95,wood);prism('Haven_Furnishing',4.23,5.02,.62,.72,SZ0+.38,SZ0+.97,timber)
for xx in (4.35,4.9):prism('Haven_Furnishing',xx-.03,xx+.03,DECK,.73,SZ0+.37,SZ0+.98,iron)
# pegs with a coil of rope and a lantern hook on the north wall inside
for px in (1.6,2.1):prism('Haven_Furnishing',px-.03,px+.03,2.0,2.06,SZ0+.35,SZ0+.55,wood)
rod('Haven_Furnishing',(1.85,1.95,SZ0+.5),(1.85,1.5,SZ0+.5),.2,rope,10,.22)

# ---------------- hipped thatch roof, laid in courses ----------------
OV=.5;XA,XB,ZA,ZB=SX0-OV,SX1+OV,SZ0-OV,SZ1+OV
HD=(ZB-ZA)/2;ZM=(ZA+ZB)/2;K=1.25
EY=PLATE+.1-OV*K;RY=EY+HD*K
XRA,XRB=XA+HD,XB-HD
faces=[('S',[(XA,EY,ZB),(XB,EY,ZB),(XRB,RY,ZM),(XRA,RY,ZM)]),('N',[(XB,EY,ZA),(XA,EY,ZA),(XRA,RY,ZM),(XRB,RY,ZM)]),
       ('E',[(XB,EY,ZB),(XB,EY,ZA),(XRB,RY,ZM)]),('W',[(XA,EY,ZA),(XA,EY,ZB),(XRA,RY,ZM)])]
for _,pts in faces:slab('Haven_RoofDeck',pts,.12,timber)
def lay_thatch(P,s_range,rows,normal,seed):
 r_=random.Random(seed);n=Vector(normal)
 for r in range(rows):
  t0=max(0,r/rows-(.04 if r==0 else 0));t1=min(1,(r+1.45)/rows)
  s0,s1=s_range(t0);s=s0
  while s<s1-.05:
   e=min(s1,s+r_.uniform(.3,.5));sa,sb=s_range(t1);lo_s,hi_s=max(s,sa),min(e,sb)
   if hi_s-lo_s>.08:
    drop=(.14 if r==0 else .04)+r_.uniform(0,.08)
    lo=[Vector(P(t0,s+.01))-Vector((0,drop,0)),Vector(P(t0,e-.01))-Vector((0,drop,0)),Vector(P(t1,hi_s-.01)),Vector(P(t1,lo_s+.01))]
    thick=.24+r_.uniform(0,.06)
    V=[tuple(p+n*l) for p,l in zip(lo,[.03,.03,.03,.03])]+[tuple(p+n*l) for p,l in zip(lo,[thick,thick,.1,.1])]
    add('Haven_RoofThatch',V,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],r_.choice([thatch]*6+[thatch_light,thatch_dark]))
   s=e
ROWS=8
lay_thatch(lambda t,s:(s,EY+(RY-EY)*t,ZB+(ZM-ZB)*t),lambda t:(XA+HD*t,XB-HD*t),ROWS,nrm(*faces[0][1][:3]),'thS')
lay_thatch(lambda t,s:(s,EY+(RY-EY)*t,ZA+(ZM-ZA)*t),lambda t:(XA+HD*t,XB-HD*t),ROWS,nrm(*faces[1][1][:3]),'thN')
lay_thatch(lambda t,s:(XB+(XRB-XB)*t,EY+(RY-EY)*t,s),lambda t:(ZA+HD*t,ZB-HD*t),ROWS,nrm(*faces[2][1]),'thE')
lay_thatch(lambda t,s:(XA+(XRA-XA)*t,EY+(RY-EY)*t,s),lambda t:(ZA+HD*t,ZB-HD*t),ROWS,nrm(*faces[3][1]),'thW')
# block ridge with a scalloped apron, hip rolls, hazel liggers
beam('Haven_RoofRidge',(XRA-.25,RY+.22,ZM),(XRB+.25,RY+.22,ZM),.62,.34,thatch_dark)
for s in (-1,1):
 x=XRA-.2
 while x<XRB+.15:
  add('Haven_RoofRidge',[(x,RY+.12,ZM+s*.3),(x+.34,RY+.12,ZM+s*.3),(x+.17,RY-.2,ZM+s*.55),(x,RY+.06,ZM+s*.24),(x+.34,RY+.06,ZM+s*.24),(x+.17,RY-.24,ZM+s*.47)],
      [(0,1,2),(5,4,3),(0,3,4,1),(1,4,5,2),(2,5,3,0)],thatch_light);x+=.36
 for zz in (-.28,.28):beam('Haven_RoofRidge',(XRA-.1,RY+.4,ZM+zz),(XRB+.1,RY+.4,ZM+zz),.04,.04,wood)
for (ex,ez),(rx) in [((XA,ZA),XRA),((XA,ZB),XRA),((XB,ZA),XRB),((XB,ZB),XRB)]:
 beam('Haven_RoofRidge',(ex,EY+.12,ez),(rx,RY+.2,ZM),.42,.3,thatch_dark)
x=XRA
while x<=XRB+.01:beam('Haven_RoofRidge',(x,RY+.4,ZM-.33),(x,RY+.4,ZM+.33),.035,.035,wood);x+=.3
for xx in (XRA-.3,XRB+.3):rod('Haven_RoofRidge',(xx,RY+.3,ZM),(xx,RY+.75,ZM),.07,thatch_dark,6,.02)   # straw finials

# =====================================================================================================
# DEPARTURE NOTICE BOARD + FERRY BELL at the lane root (service `notice`)
# =====================================================================================================
NB0,NB1,NBZ='Haven_ServiceNotice_Board',None,-2.05
for px in (-1.75,-.35):
 prism(NB0,px-.08,px+.08,-.25,2.35,NBZ-.08,NBZ+.08,timber);prism(NB0,px-.14,px+.14,-.25,.08,NBZ-.14,NBZ+.14,sillmat)
prism(NB0,-1.75,-.35,.95,1.95,NBZ-.04,NBZ+.04,wood)
for y0,y1 in [(.9,1.0),(1.9,2.0)]:prism(NB0,-1.85,-.25,y0,y1,NBZ-.06,NBZ+.07,timber)
for x0,x1,y0,y1 in [(-1.62,-1.12,1.3,1.82),(-1.02,-.5,1.45,1.85),(-1.0,-.55,1.05,1.38),(-1.6,-1.2,1.05,1.22)]:
 prism(NB0,x0,x1,y0,y1,NBZ+.04,NBZ+.06,parchment)
prism(NB0,-1.46,-1.3,1.72,1.78,NBZ+.06,NBZ+.07,iron)
# a little gabled hood over the board
for s in (-1,1):
 add(NB0,[(-1.95,2.3,NBZ),(-.15,2.3,NBZ),(-.15,2.1,NBZ+s*.38),(-1.95,2.1,NBZ+s*.38),(-1.95,2.36,NBZ),(-.15,2.36,NBZ),(-.15,2.16,NBZ+s*.38),(-1.95,2.16,NBZ+s*.38)],BOXF,wood)
rod(NB0,(-1.95,2.38,NBZ),(-.15,2.38,NBZ),.04,timber,6)
# bell arm, yoke, bell and pull rope on the east post (toward the shelter)
beam(NB0,(-.35,2.15,NBZ),(.3,2.15,NBZ),.09,.11,timber);beam(NB0,(-.35,1.7,NBZ),(-.05,2.12,NBZ),.07,.07,timber)
rod(NB0,(.15,2.1,NBZ),(.15,2.02,NBZ),.05,iron,6)
rod(NB0,(.15,2.02,NBZ),(.15,1.72,NBZ),.09,bronze,10,.19);rod(NB0,(.15,1.72,NBZ),(.15,1.67,NBZ),.2,bronze,10)
rod(NB0,(.15,1.72,NBZ),(.15,1.3,NBZ),.015,rope,4)

# =====================================================================================================
# THE FERRY SKIFF (service `boat`): single mast, clinker planked, furled lug sail, oars, rudder
# =====================================================================================================
BX0,BZ0=14.5,LANE+1.47
BOAT='Haven_ServiceBoat_'
def B(p):return (BX0+p[0],WATER+p[1],BZ0+p[2])
ST=[(-3.05,.07,.34),(-2.6,.55,.15),(-1.85,.93,.05),(-.9,1.08,0),(.3,1.1,0),(1.35,.98,.03),(2.25,.68,.12),(2.85,.3,.27),(3.15,.06,.42)]
SEC=[(1,.55),(.94,.30),(.77,-.03),(.43,-.31),(0,-.45),(-.43,-.31),(-.77,-.03),(-.94,.30),(-1,.55)]
GUN=.62
def hp(st,j,lap=0.,inner=False,toward=None,frac=0.):
 bx,w,lift=st;sx,sy=SEC[j]
 if toward is not None:sx=sx+(SEC[toward][0]-sx)*frac;sy=sy+(SEC[toward][1]-sy)*frac
 y=sy*1.13;y=y+lift*(GUN-y)+.2*(bx/3.1)**2;z=sx*w
 if inner:z=sx*max(.02,w-.075);y+=.065 if abs(sx)<.97 else 0
 if lap:
  d=Vector((sx,(sy-.1)*.9));d.normalize();z+=d.x*lap;y+=d.y*lap
 return (bx,y,z)
ROWS_O=[];ROWS_I=[]
for j in range(9):
 if j in (1,2,3):ROWS_O+=[(j,.035),(j,0)];ROWS_I+=[(j,j-1),(j,j+1)]
 elif j in (5,6,7):ROWS_O+=[(j,0),(j,.035)];ROWS_I+=[(j,j-1),(j,j+1)]
 else:ROWS_O.append((j,0));ROWS_I.append((j,None))
outer=[[hp(s,j,lap) for j,lap in ROWS_O] for s in ST]
inner=[[hp(s,j,0,True,t,.06 if t is not None else 0) for j,t in ROWS_I] for s in ST]
def rowmat(r):
 (ja,la),(jb,lb)=ROWS_O[r],ROWS_O[r+1]
 if ja==jb:return tar
 if {ja,jb}<= {0,1} or {ja,jb}<={7,8}:return paint
 return hull if (min(ja,jb)%2==0) else plank_pale
V=[];F=[];M=[]
def q(pts,m):k=len(V);V.extend(pts);F.append((k,k+1,k+2,k+3));M.append(m)
NR=len(ROWS_O)
for k in range(len(ST)-1):
 for r in range(NR-1):
  q([outer[k][r],outer[k+1][r],outer[k+1][r+1],outer[k][r+1]],rowmat(r))
  q([inner[k][r],inner[k][r+1],inner[k+1][r+1],inner[k+1][r]],hull)
 for r in (0,NR-1):q([outer[k][r],inner[k][r],inner[k+1][r],outer[k+1][r]],paint)
for k in (0,len(ST)-1):
 for r in range(NR-1):q([outer[k][r],outer[k][r+1],inner[k][r+1],inner[k][r]],hull)
add(BOAT+'Hull',[B(p) for p in V],F,M)
HULLKEY=BOAT+'Hull'
def w_at(bx):
 for a,b in zip(ST,ST[1:]):
  if a[0]<=bx<=b[0]:t=(bx-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*t
 return .05
def gun_y(bx):return GUN+.2*(bx/3.1)**2
# keel, stem, sternpost, gunwale rubbing strakes
for k in range(len(ST)-1):rod(BOAT+'Hull',B(outer[k][NR//2]),B(outer[k+1][NR//2]),.04,tar,6)
rod(BOAT+'Hull',B(outer[-1][NR//2]),B((3.3,gun_y(3.15)+.28,0)),.06,wood,6)
rod(BOAT+'Hull',B(outer[0][NR//2]),B((-3.18,gun_y(-3.05)+.2,0)),.06,wood,6)
for r in (0,NR-1):
 for k in range(len(ST)-1):
  a=Vector(outer[k][r]);b=Vector(outer[k+1][r]);s=1 if r==0 else -1
  rod(BOAT+'Hull',B(tuple(a+Vector((0,-.02,s*.035)))),B(tuple(b+Vector((0,-.02,s*.035)))),.04,wood,6)
# floorboards, thwarts with knees, mast partner
for i in range(5):
 z=-.5+i*.25;prism(BOAT+'Fittings',BX0-2.0,BX0+2.0,WATER-.3,WATER-.25,BZ0+z-.11,BZ0+z+.11,plank if i%2 else plank_pale)
for bx in (-2.1,-.9,1.1):
 w=w_at(bx)*.95-.1;y=WATER+.3
 prism(BOAT+'Fittings',BX0+bx-.17,BX0+bx+.17,y,y+.08,BZ0-w,BZ0+w,plank_pale)
 for s in (-1,1):beam(BOAT+'Fittings',(BX0+bx,y+.04,BZ0+s*(w-.05)),(BX0+bx,WATER+gun_y(bx)-.05,BZ0+s*(w_at(bx)-.06)),.06,.06,wood)
prism(BOAT+'Fittings',BX0-2.95,BX0-2.1,WATER+.36,WATER+.43,BZ0-.35,BZ0+.35,plank_pale)       # stern sheets
# mast, masthead truck, lowered yard with the furled lug sail, halyard, shrouds and forestay
MX=1.1;MT=4.55
rod(BOAT+'Rig',B((MX,-.3,0)),B((MX,MT,0)),.085,wood,8,.055);prism(BOAT+'Rig',BX0+MX-.08,BX0+MX+.08,WATER+MT,WATER+MT+.12,BZ0-.08,BZ0+.08,timber)
YA,YB=B((-1.8,1.55,.16)),B((2.6,2.05,.16))
rod(BOAT+'Rig',YA,YB,.05,wood,6)
r_=random.Random(77);n=12
for i in range(n):
 t0=i/n;t1=(i+1)/n
 a=Vector(YA).lerp(Vector(YB),t0)-Vector((0,.16,0));b=Vector(YA).lerp(Vector(YB),t1)-Vector((0,.16,0))
 ra=.1+.09*math.sin(math.pi*t0)+r_.uniform(0,.03);rb=.1+.09*math.sin(math.pi*t1)+r_.uniform(0,.03)
 rod(BOAT+'Rig',tuple(a),tuple(b),ra,canvas,8,rb)
 if i%2==1:rod(BOAT+'Rig',tuple(b-(b-a)*.05),tuple(b+(b-a)*.05),rb+.025,rope,8)
rod(BOAT+'Rig',B((MX,MT-.1,.07)),tuple(Vector(YA).lerp(Vector(YB),.66)),.015,rope,4)
for bx in (.55,1.55):
 for s in (-1,1):rod(BOAT+'Rig',B((MX,MT-.25,0)),B((bx,gun_y(bx),s*(w_at(bx)-.02))),.013,rope,4)
rod(BOAT+'Rig',B((MX,MT-.2,0)),B((3.28,gun_y(3.15)+.25,0)),.013,rope,4)
rod(BOAT+'Rig',YA,B((-2.6,gun_y(-2.6),0)),.012,rope,4)
# rudder and tiller
add(BOAT+'Fittings',[B(p) for p in [(-3.2,-.45,-.04),(-3.62,-.3,-.04),(-3.62,.55,-.04),(-3.22,.7,-.04),(-3.2,-.45,.04),(-3.62,-.3,.04),(-3.62,.55,.04),(-3.22,.7,.04)]],BOXF,wood)
beam(BOAT+'Fittings',B((-3.3,.68,0)),B((-2.35,.85,0)),.06,.06,timber)
for y in (0,.45):rod(BOAT+'Fittings',B((-3.2,y,0)),B((-3.28,y,0)),.05,iron,6)
# oars shipped along the thwarts, looms toward the stern, with rowlocks on the gunwales
for s in (-1,1):
 z=s*.42;rod(BOAT+'Fittings',B((-2.4,.42,z)),B((1.2,.42,z)),.03,plank_pale,6)
 pts=[(1.1,-.045),(1.1,.045),(1.9,.12),(2.15,.07),(2.15,-.07),(1.9,-.12)]
 add(BOAT+'Fittings',[B((a,.4,z+b)) for a,b in pts]+[B((a,.44,z+b)) for a,b in pts],[tuple(range(5,-1,-1)),tuple(range(6,12))]+[(i,(i+1)%6,(i+1)%6+6,i+6) for i in range(6)],plank_pale)
 for bx in (-.9,-.2):rod(BOAT+'Fittings',B((bx,gun_y(bx),s*w_at(bx))),B((bx,gun_y(bx)+.14,s*w_at(bx))),.022,iron,4)
# cleats fore and aft, a gangplank laid from the landing edge onto the gunwale
for bx in (2.55,-2.5):
 rod(BOAT+'Fittings',B((bx,gun_y(bx)-.05,0)),B((bx,gun_y(bx)+.1,0)),.035,iron,6);rod(BOAT+'Fittings',B((bx-.16,gun_y(bx)+.09,0)),B((bx+.16,gun_y(bx)+.09,0)),.028,iron,6)
GP0,GP1=14.05,14.95
add(BOAT+'Gangplank',[(GP0,LOW-.06,LANE+.05),(GP1,LOW-.06,LANE+.05),(GP1,WATER+GUN+.04,BZ0-w_at(0)+.15),(GP0,WATER+GUN+.04,BZ0-w_at(0)+.15),
     (GP0,LOW-.01,LANE+.05),(GP1,LOW-.01,LANE+.05),(GP1,WATER+GUN+.09,BZ0-w_at(0)+.15),(GP0,WATER+GUN+.09,BZ0-w_at(0)+.15)],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],plank_pale)
for t in (.3,.65):
 y=LOW-.01+(WATER+GUN+.09-(LOW-.01))*t+.015;z=LANE+.05+(BZ0-w_at(0)+.1-LANE-.05)*t
 prism(BOAT+'Gangplank',GP0+.05,GP1-.05,y,y+.035,z-.03,z+.03,wood)
# mooring lines from the boat's cleats to the landing bollards (static, laid with sag)
rope_line('Haven_Mooring',B((2.55,gun_y(2.55)+.1,0)),(17.2,LOW+.36,LANE+.17),.2)
rope_line('Haven_Mooring',B((-2.5,gun_y(-2.5)+.1,0)),(11.9,LOW+.36,LANE+.17),.2)

# =====================================================================================================
# PROPS on the south apron (dry land beside the lane root) - cargo for the crossing
# =====================================================================================================
def crate(x,z,y,s,rot=0):
 prism('Haven_Props',x-s,x+s,y,y+2*s,z-s,z+s,plank)
 for yy in (y+.04,y+2*s-.1):prism('Haven_Props',x-s-.02,x+s+.02,yy,yy+.07,z-s-.02,z+s+.02,wood)
 for xx in (x-s+.06,x+s-.06):prism('Haven_Props',xx-.04,xx+.04,y,y+2*s,z-s-.025,z+s+.025,wood)
for x,z,y,s in [(-1.2,2.4,0,.4),(-.3,2.55,0,.35),(-1.0,2.45,.8,.3),(3.3,2.3,0,.38)]:crate(x,z+ground(x,z)*0,y+ground(x,z),s)
for x,z in [(.6,2.35),(1.35,2.6),(.9,3.2)]:
 g=ground(x,z);rod('Haven_Props',(x,g,z),(x,g+.85,z),.3,wood,10,.3);rod('Haven_Props',(x,g+.4,z),(x,g+.46,z),.33,wood,10)
 for yy in (.12,.72):rod('Haven_Props',(x,g+yy,z),(x,g+yy+.06,z),.315,iron,10)
g=ground(2.3,2.5);rod('Haven_Props',(2.3,g,2.5),(2.3,g+.22,2.5),.42,rope,12);rod('Haven_Props',(2.3,g+.22,2.5),(2.3,g+.24,2.5),.2,tar,12)
for x,z in [(4.3,2.9),(4.4,2.3)]:
 g=ground(x,z);add('Haven_Props',[(x-.32,g,z-.22),(x+.32,g,z-.22),(x+.26,g+.34,z-.16),(x-.26,g+.34,z-.16),(x-.32,g,z+.22),(x+.32,g,z+.22),(x+.26,g+.38,z+.16),(x-.26,g+.38,z+.16)],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],canvas)

# =====================================================================================================
# build objects, boat bob, export
# =====================================================================================================
root=bpy.data.objects.new('Haven_Root',None);bpy.context.collection.objects.link(root)
boat_root=bpy.data.objects.new('Haven_ServiceBoat_Bob',None);bpy.context.collection.objects.link(boat_root);boat_root.parent=root
objs=[]
for name,g in G.items():
 assert all(math.isfinite(c) for p in g['v'] for c in p),name
 mats=[];idx={}
 for m in g['m']:
  if m.name not in idx:idx[m.name]=len(mats);mats.append(m)
 data=bpy.data.meshes.new(name);data.from_pydata([(x,-z,y) for x,y,z in g['v']],[],g['f']);data.update()
 for m in mats:data.materials.append(m)
 for p,m in zip(data.polygons,g['m']):p.material_index=idx[m.name]
 bm=bmesh.new();bm.from_mesh(data)
 if name==HULLKEY:bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
 bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
 o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.parent=boat_root if name.startswith(BOAT) else root;objs.append(o)
# idle bob: the skiff rides the swell (translation only, 4 s loop, endpoints equal)
sc=bpy.context.scene;sc.render.fps=24;sc.frame_start=1;sc.frame_end=97
for i in range(17):
 ph=math.tau*i/16;boat_root.location=(0,0,.03*math.sin(ph));boat_root.keyframe_insert(data_path='location',frame=1+i*6)
boat_root.animation_data.action.name='HavenBoatIdleBob';sc.frame_set(1)
assert all(o.name.startswith('Haven_') for o in bpy.data.objects)
tris=sum(len(p.vertices)-2 for o in objs for p in o.data.polygons)
used=sorted({m.name for o in objs for m in o.data.materials})
assert tris<=25000,tris;assert len(used)<=20,used
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'haven.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'haven.glb'),export_format='GLB',export_yup=True,export_animations=True,export_cameras=False,export_lights=False)
raw=(OUT/'haven.glb').read_bytes();size=struct.unpack_from('<I',raw,12)[0];gltf=json.loads(raw[20:20+size])
assert all('KHR_materials_emissive_strength' not in json.dumps(m) for m in gltf['materials'])
allv=[v for g in G.values() for v in g['v']]
dims={'min':[round(min(v[i] for v in allv),3) for i in range(3)],'max':[round(max(v[i] for v in allv),3) for i in range(3)]}
report={'id':'haven','prefix':'Haven_','placement':{'x':PX,'y':PY,'z':PZ,'padSamples':[round(min(PAD),3),round(max(PAD),3)]},'waterLocalY':round(WATER,3),
 'deckY':DECK,'landingY':LOW,'triangles':tris,'materials':len(used),'materialNames':used,'meshes':sorted(o.name for o in objs),'gltfMaterials':len(gltf['materials']),
 'gltfPrimitives':sum(len(m['primitives']) for m in gltf['meshes']),'animations':[a['name'] for a in gltf.get('animations',[])],'boundsLocal':dims,
 'overWaterWalkables':{'Haven_DeckPier(x>=9)':any(wet(x,0) for x in (8.5,)), 'landing':all(wet(x,z) for x in (11.5,14.5,17.2) for z in (-.5,.5))},
 'sha256':hashlib.sha256(raw).hexdigest()}
(PROOF/'asset_report.json').write_text(json.dumps(report,indent=2))
print('[HAVEN_V1]',json.dumps({k:report[k] for k in ('placement','triangles','materials','gltfPrimitives','animations','boundsLocal','overWaterWalkables')}))

# =====================================================================================================
# proof renders (workbench, studio light, material colours) with a render-only terrain + sea context
# =====================================================================================================
def ctx_material(name,col):
 m=bpy.data.materials.new(name);m.diffuse_color=(*col,1);return m
grass=ctx_material('Proof grass',(.36,.47,.22));sand=ctx_material('Proof bank',(.55,.47,.32));sea=ctx_material('Proof sea',(.33,.43,.52))
tv=[];tf=[];tm=[]
for zi in range(-9,7):
 for xi in range(-9,22):
  k=len(tv)
  for x,z in [(xi,zi),(xi+1,zi),(xi+1,zi+1),(xi,zi+1)]:tv.append((x,z,ground(x,z)))
  tf.append((k,k+1,k+2,k+3));tm.append(1 if min(ground(xi,zi),ground(xi+1,zi+1))<-.4 else 0)
td=bpy.data.meshes.new('Proof_Terrain');td.from_pydata([(x,-z,y) for x,z,y in tv],[],tf);td.materials.append(grass);td.materials.append(sand)
for p,m in zip(td.polygons,tm):p.material_index=m
tobj=bpy.data.objects.new('Proof_Terrain',td);sc.collection.objects.link(tobj)
wd=bpy.data.meshes.new('Proof_Sea');wd.from_pydata([(-9,9,WATER),(22,9,WATER),(22,-7,WATER),(-9,-7,WATER)],[],[(0,1,2,3)]);wd.materials.append(sea)
wobj=bpy.data.objects.new('Proof_Sea',wd);sc.collection.objects.link(wobj)
sc.render.engine='BLENDER_WORKBENCH';sc.display.shading.light='STUDIO';sc.display.shading.color_type='MATERIAL'
sc.display.shading.show_shadows=True;sc.render.resolution_x=1000;sc.render.resolution_y=720
sc.world=sc.world or bpy.data.worlds.new('w')
cam=bpy.data.objects.new('ProofCam',bpy.data.cameras.new('ProofCam'));sc.collection.objects.link(cam);sc.camera=cam;cam.data.lens=35
def look(name,eye,target,hide=()):
 for o in objs:o.hide_render=any(o.name.startswith(h) for h in hide)
 e=Vector((eye[0],-eye[2],eye[1]));t=Vector((target[0],-target[2],target[1]))
 cam.location=e;cam.rotation_euler=(t-e).to_track_quat('-Z','Y').to_euler()
 sc.render.filepath=str(PROOF/(name+'.png'));bpy.ops.render.render(write_still=True)
VIEWS=[('front_34',(-9,11,15),(7,-.2,0),()),('back_34',(27,12,-16),(7,-.5,-.5),()),('side_south',(8,3.5,21),(8,-.3,0),()),
       ('top',(7.5,34,.2),(7.5,0,-.5),()),('cutaway',(12,11,9),(3,.3,-3),('Haven_Roof','Haven_Upper')),('detail_boat',(20,3.2,9),(14.5,-1.4,2.6),())]
for v in VIEWS:look(*v)
cam.data.lens=35
import numpy as np
tiles=[]
for name,*_ in VIEWS:
 im=bpy.data.images.load(str(PROOF/(name+'.png')));a=np.array(im.pixels[:],dtype=np.float32).reshape(im.size[1],im.size[0],4);tiles.append(a)
h,w=tiles[0].shape[:2];sheet=np.full((h*2,w*3,4),.2,dtype=np.float32);sheet[...,3]=1
for i,a in enumerate(tiles):
 r,c=divmod(i,3);sheet[(1-r)*h:(2-r)*h,c*w:(c+1)*w]=a   # blender pixel rows start at the bottom
img=bpy.data.images.new('sheet',w*3,h*2,alpha=True);img.pixels=sheet.ravel().tolist();img.filepath_raw=str(PROOF/'sheet.png');img.file_format='PNG';img.save()
print('[HAVEN_V1] proofs written to',PROOF)
