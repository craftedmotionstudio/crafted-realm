"""Tutor's Holm bakehouse v8 - a full redesign (owner play-test 2026-09-25: "pretty much everything in the bakehouse
needs to be redone ... it looks like it was just blocky stuff ... even the layout should be redone"; "the door on the
bakehouse is incorrect").

Same footprint (plan x -5..7, z -5..3 around the placement 44, 4.07, 67) and the same entrance: the court door in the
hall's east wall at x = 1, z 1..2, the doorway the island gate `bakehouse-door` closes with its oak leaf (props v3
`door-leaf`, 1.0 x 2.29, hung at y 0.07 on the hinge at z 2). The doorway is now built for that leaf: dressed oak jambs
and head in the leaf's plane with an even 5-10 mm gap, a stone threshold 1 cm under it, and a splayed inner reveal so
the leaf swings in cleanly.

Layout (2004-style bakery, L-shaped around the entrance court):
 - the bake hall (x -5..1, z -5..3), stone below and a jettied timber-framed, limewashed upper storey under a steep
   thatched gable roof; a brick bread oven with a domed chamber, arched mouth, iron door and its own flue on the north
   wall, beside an open hearth with a cauldron on a crane, both under one brick chimney breast and stack; a long
   kneading table with the dough trough; the bucket rack and the water butt by the court door; the recipe board on
   the east wall; an oak stair along the west wall to a sleeping and storage loft over the north half (y 3.3);
 - the flour store (x 1..7, z -5..0), a low stone wing reached from the hall: the flour bin, loaf shelves, sacks,
   grain barrels and a meal chest;
 - the entrance court (x 1..7, z 0..3), open to the path on the south, a low wall on its east and south-east, a
   woodpile against the store and a bakery sign by the door.
Service meshes are compact and apart (one click box each): Kitchen_SupplyBuckets_ (bucket rack), Kitchen_Pantry_
(flour bin only), Kitchen_SupplyWater (water butt + surface), Kitchen_SupplyDoughBowl_ (dough trough), Kitchen_Oven_
(the oven body only), Kitchen_RecipeBoard_ (board). Fire: holm_fire_kit flames in the oven (OvenFlicker0..2) and the
hearth (HearthFlicker0..2), 1.5 s loops.
Blender only; original design; flat matte sRGB vertex colours.
Run: "Blender 5.1/blender.exe" -b --python tools/blender/build_holm_bakehouse_v8.py
"""
import bpy,bmesh,sys,math,random,json,hashlib,shutil
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE));ROOT=HERE.parents[1]
OUT=ROOT/'.studio-workspaces/holm-kitchen-wings-v8/candidates';OUT.mkdir(parents=True,exist_ok=True)
PREV=ROOT/'.studio-workspaces/holm-kitchen-wings-v7/candidates'
bpy.ops.wm.read_factory_settings(use_empty=True)
import holm_interior_kit as kit
from holm_interior_kit import Acc,M,family,plank_floor,sharp_by_angle,barrel,crate,sack,jar,bowl,candle,lantern,log,herbs,books
import holm_fire_kit as FK
rng=random.Random(2026092508)
root=bpy.data.objects.new('Kitchen_Root',None);bpy.context.collection.objects.link(root)

# ---------------------------------------------------------------- palette
stone=family('Bakehouse fieldstone',['#8f877a','#817a6e','#9b9386','#766f64','#a39c8e']);mortar=M('Bakehouse mortar','#6a6358')
quoin=family('Bakehouse quoin',['#b3a88f','#a69b82'])
lime=family('Bakehouse limewash',['#ddd2b5','#d3c7a8','#e4dac0']);lime_in=family('Bakehouse inner limewash',['#e0d6bd','#d6ccb2'])
timber=family('Bakehouse frame oak',['#4a3321','#3f2b1b','#553b27']);oak=family('Bakehouse furniture oak',['#7a5434','#6c4a2d','#86603c']);oak_dark=M('Bakehouse dark oak','#4e3622')
thatch=family('Bakehouse thatch',['#b89455','#a8854a','#c49f5e','#9c7a42']);thatch_dark=M('Bakehouse thatch shade','#7d6035')
brick=family('Bakehouse brick',['#9a4d34','#8b432e','#a85a3e','#7e3c29']);brick_mortar=M('Bakehouse brick mortar','#6f5c4c')
soot=M('Bakehouse soot','#241c18');soot2=M('Bakehouse soot edge','#3a2e27');ash=M('Bakehouse ash','#5d5750')
flag=family('Bakehouse flag',['#9c8862','#8f7b57','#a7926b','#85724f']);flag_joint=M('Bakehouse flag joint','#5c4f3b')
board=family('Bakehouse loft board',['#8a6440','#7b5838','#94704a','#6f5033']);board_under=M('Bakehouse board underlay','#3a2a1c')
iron=M('Bakehouse iron','#35363a');iron2=M('Bakehouse iron worn','#4b4a47');copper=M('Bakehouse copper','#b0663a');brass=M('Bakehouse brass','#b99a4c')
flour=M('Bakehouse flour','#f0ead8');flour2=M('Bakehouse flour dust','#e2d9c2');dough=M('Bakehouse dough','#ead8b0');crust=family('Bakehouse crust',['#b8783c','#a7652f','#c98a4a'])
linen=M('Bakehouse linen','#d9ceb2');cloth=family('Bakehouse sackcloth',['#c4b184','#b09c70','#d3c29a']);cord=M('Bakehouse cord','#7a6440')
staves=family('Bakehouse stave',['#7b5635','#6c4a2e','#85603b']);lid=M('Bakehouse barrel head','#8d6a44')
water=M('Bakehouse water','#4d7389');pottery=family('Bakehouse pottery',['#a85f39','#6f8a63','#cbbd98'])
glass=M('Bakehouse window','#c9d7cf');glass_warm=M('Bakehouse lit window','#f1d9a0',emit=.5)
wax=M('Bakehouse candle','#efe6c8');cflame=M('Bakehouse candle flame','#ffc15a',emit=1.5);lamp=M('Bakehouse lantern glow','#ffd27a',emit=1.2)
greens=family('Bakehouse herbs',['#6d8a4a','#58743d','#8a9a55']);paper=M('Bakehouse parchment','#d9c89a');ink=M('Bakehouse ink','#2a241e')
straw=family('Bakehouse straw',['#d6bf7a','#c7ad68']);blanket=family('Bakehouse blanket',['#7a2e25','#2f4d6b','#8a6a2a'])
paint=M('Bakehouse sign paint','#c9a14a');paint2=M('Bakehouse sign ground','#3c5a44')

# ---------------------------------------------------------------- helpers (plan x east, y up, z south)
def facing(A,axis,plane,out,u0,u1,v0,v1,holes,rng,depth=(.03,.055),row=(.26,.36),run=(.45,.9)):
 """Coursed fieldstone on a wall face, cut cleanly around holes [(u0,u1,v0,v1)]; each stone is a bevelled block."""
 v=v0;ri=0
 while v<v1-.02:
  vh=min(v1,v+rng.uniform(*row))
  if v1-vh<.1:vh=v1
  u=u0+(rng.uniform(.1,.35) if ri%2 else 0);us=[u0]
  while u<u1:
   u+=rng.uniform(*run)
   if u<u1-.18:us.append(u)
  us.append(u1)
  for a,b in zip(us,us[1:]):
   segs=[(a,b,v,vh)]
   for ha,hb,hc,hd in holes:
    nxt=[]
    for l,r,lo,hi in segs:
     if r<=ha or l>=hb or hi<=hc or lo>=hd:nxt.append((l,r,lo,hi));continue
     if l<ha:nxt.append((l,ha,lo,hi))
     if r>hb:nxt.append((hb,r,lo,hi))
     if lo<hc:nxt.append((max(l,ha),min(r,hb),lo,hc))
     if hi>hd:nxt.append((max(l,ha),min(r,hb),hd,hi))
    segs=nxt
   for l,r,lo,hi in segs:
    g=.012;l+=g;r-=g;lo+=g;hi-=g
    if r-l<.06 or hi-lo<.06:continue
    d=rng.uniform(*depth);m=stone[rng.randrange(5)];bv=min(.03,(r-l)/4,(hi-lo)/4)
    # a bevelled stone: back rectangle on the wall, front face inset by the bevel
    def P(uu,vv,dd):return (uu,vv,plane+out*dd) if axis=='x' else (plane+out*dd,vv,uu)
    V=[P(l,lo,0),P(r,lo,0),P(r,hi,0),P(l,hi,0),P(l+bv,lo+bv,d),P(r-bv,lo+bv,d),P(r-bv,hi-bv,d),P(l+bv,hi-bv,d)]
    F=[(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    if (axis=='x')==(out<0):F=[tuple(reversed(f)) for f in F]
    A.poly(V,F,m)
  v=vh;ri+=1

def wall(A,axis,c,u0,u1,t,y0,y1,holes,m,inner=None):
 """A wall slab: axis 'x' runs along x at z=c, 'z' along z at x=c; thickness t; holes [(u0,u1,v0,v1)] cut through."""
 us=sorted(set([u0,u1]+[h[k] for h in holes for k in (0,1) if u0<h[k]<u1]));vs=sorted(set([y0,y1]+[h[k] for h in holes for k in (2,3) if y0<h[k]<y1]))
 for a,b in zip(us,us[1:]):
  for p,q in zip(vs,vs[1:]):
   if any(h[0]<(a+b)/2<h[1] and h[2]<(p+q)/2<h[3] for h in holes):continue
   if axis=='x':A.box(a,b,p,q,c-t/2,c+t/2,m)
   else:A.box(c-t/2,c+t/2,p,q,a,b,m)

def win(A,axis,c,u0,u1,v0,v1,out,t=.3,lit=False):
 """A window in a wall opening: oak frame, mullion and transom, glazing set back, a stone sill outside."""
 def P(u,v,d):return (u,v,c+d) if axis=='x' else (c+d,v,u)
 g=glass_warm if lit else glass
 d=out*(t/2-.06)
 def bx(ua,ub,va,vb,da,db,m):
  if axis=='x':A.box(ua,ub,va,vb,c+min(da,db),c+max(da,db),m)
  else:A.box(c+min(da,db),c+max(da,db),va,vb,ua,ub,m)
 bx(u0,u1,v0,v1,d-.012*out,d-.006*out,g)                                   # glass
 # frame: stiles full height, rails between them; mullion and transom set back so no two faces share a plane
 for ua,ub in ((u0,u0+.06),(u1-.06,u1)):bx(ua,ub,v0,v1,d-.03*out,d+.02*out,timber[1])
 for va,vb in ((v0,v0+.06),(v1-.06,v1)):bx(u0+.06,u1-.06,va,vb,d-.028*out,d+.016*out,timber[1])
 bx((u0+u1)/2-.03,(u0+u1)/2+.03,v0+.06,v1-.06,d-.024*out,d+.01*out,timber[1])
 tv=(v0+v1)/2+.08;bx(u0+.06,(u0+u1)/2-.03,tv,tv+.05,d-.02*out,d+.004*out,timber[1]);bx((u0+u1)/2+.03,u1-.06,tv,tv+.05,d-.02*out,d+.004*out,timber[1])
 bx(u0-.08,u1+.08,v0-.09,v0-.005,out*t/2-.02*out,out*t/2+.09*out,quoin[0])   # sill, proud outside

def thatch_slope(A,eave,ridge,u0,u1,axis,rows=5,ov=.35):
 """A thatched slope from eave line to ridge line; eave=(x,y,z) of one eave point, ridge likewise; u runs along the
 ridge. Layered courses: each course a slab overlapping the one below, the lowest with a thick rounded edge."""
 ex,ey,ez=eave;rx,ry,rz=ridge
 for i in range(rows):
  t0,t1=i/rows,min(1,(i+1.25)/rows)
  def P(t,u,lift):
   x=ex+(rx-ex)*t;y=ey+(ry-ey)*t+lift;z=ez+(rz-ez)*t
   return (u,y,z) if axis=='x' else (x,y,u)
  th=.2 if i==0 else .14
  nj=max(10,int((u1-u0+2*ov)/.45));jag=[u0-ov+(u1-u0+2*ov)*k/nj for k in range(nj+1)];cm=thatch[i%4]
  for a,b in zip(jag,jag[1:]):
   dl=rng.uniform(-.02,.03)
   V=[P(t0,a,0+dl),P(t0,b,0+dl),P(t1,b,.02),P(t1,a,.02),P(t0,a,th+dl),P(t0,b,th+dl),P(t1,b,th*.6+.02),P(t1,a,th*.6+.02)]
   A.poly(V,[(4,5,6,7),(0,4,7,3),(1,2,6,5),(0,1,5,4),(3,7,6,2),(0,3,2,1)],(cm if rng.random()<.8 else thatch[(i+1)%4]) if i else thatch_dark)

def recalc(o):
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free()

# ---------------------------------------------------------------- dimensions
X0,X1,XE=-5.0,1.0,7.0;Z0,Z1,ZS=-5.0,3.0,0.0          # hall x X0..X1, z Z0..Z1; store x X1..XE, z Z0..ZS
T=.3;HG=3.1;LOFT=3.3;EAVE=5.3;RIDGE=8.9;SE=2.7;SR=4.3   # wall thickness, hall storey, loft floor, eaves, ridge; store eaves/ridge
DZ0,DZ1,DHEAD=1.0,2.0,2.38                              # court door (the island gate's leaf is 1.0 x 2.29 on y .07..2.37)
IN=lambda a:a+T/2                                        # inner face helpers
hx0,hx1,hz0,hz1=X0+T/2,X1-T/2,Z0+T/2,Z1-T/2             # hall inner faces: x -4.85..0.85, z -4.85..2.85
sx0,sx1,sz0,sz1=X1+T/2,XE-T/2,Z0+T/2,ZS-T/2             # store inner faces: x 1.15..6.85, z -4.85..-0.15

# ---------------------------------------------------------------- floors and foundations (supports: names with Floor)
F=Acc('Kitchen_Floor_Flags')
def flags(x0,x1,z0,z1,y=0.0):
 z=z0;ri=0
 while z<z1-.02:
  z2=min(z1,z+rng.uniform(.45,.62));x=x0+(rng.uniform(0,.3) if ri%2 else 0);xs=[x0]
  while x<x1:
   x+=rng.uniform(.5,.85)
   if x<x1-.2:xs.append(x)
  xs.append(x1)
  for a,b in zip(xs,xs[1:]):F.box(a+.006,b-.006,y-.02,y,z+.006,z2-.006,flag[rng.randrange(4)],skip='b')
  z=z2;ri+=1
flags(hx0,hx1,hz0,hz1);flags(sx0,sx1,sz0,sz1)
flags(X1-T/2+.004,X1+T/2-.004,DZ0+.004,DZ1-.004);flags(X1-T/2+.004,X1+T/2-.004,-3.0+.004,-2.0-.004)   # doorway floors
F.build(root)
B=Acc('Kitchen_Floor_Base')
B.box(X0,X1,-.3,-.022,Z0,Z1,flag_joint);B.box(X1,XE,-.3,-.022,Z0,ZS,flag_joint)
B.build(root)
Th=Acc('Kitchen_Floor_Threshold')
Th.box(X1-T/2+.01,X1+T/2+.08,0,.06,DZ0-.12,DZ1+.12,quoin[1])      # court door: a stone threshold, 1 cm under the leaf
Th.build(root)

# ---------------------------------------------------------------- ground storey walls (Kitchen_Shell_: clipped in the cutaway)
S=Acc('Kitchen_Shell_Walls')
# hall: north (with the chimney breast bonded in), west, south, east (court door, store doorway)
wall(S,'x',Z0,X0-T/2,X1+T/2,T,-.3,HG,[(-3.2,-2.4,1.0,2.0)],stone[3])                          # north: a small window over the oven flue side? (kept high)
wall(S,'z',X0,Z0+T/2,Z1-T/2,T,-.3,HG,[(-3.1,-2.1,1.2,2.2),(.5,1.6,1.9,2.9)],stone[3])                   # west: two windows (one over the stair)
wall(S,'x',Z1,X0-T/2,X1+T/2,T,-.3,HG,[(-3.6,-2.4,1.0,2.1)],stone[3])                           # south (court side): window
wall(S,'z',X1,Z0+T/2,Z1-T/2,T,-.3,HG,[(DZ0-.16,DZ1+.16,0,DHEAD+.2),(-3.0,-2.0,0,2.2),(-.8,.2,1.0,2.0)],stone[3])  # east: court door, store doorway, window to the court
# store: north, east, south (court side)
wall(S,'x',Z0,X1+T/2,XE+T/2,T,-.3,SE,[(2.2,3.0,1.1,1.9)],stone[3])
wall(S,'z',XE,Z0+T/2,ZS-T/2,T,-.3,SE,[(-3.1,-2.1,1.0,1.9)],stone[3])
wall(S,'x',ZS,X1+T/2,XE+T/2,T,-.3,SE,[(2.2,3.2,1.0,1.9)],stone[3])
S.build(root)
# exterior stone facing, cut around every opening, and dressed quoins on the corners
Fa=Acc('Kitchen_Shell_Facing')
facing(Fa,'x',Z0-T/2,-1,X0-T/2,XE+T/2,-.25,HG,[(-3.2,-2.4,1.0,2.0),(2.2,3.0,1.1,1.9),(X1+T/2,XE+T/2,SE,HG+1)],rng)
facing(Fa,'z',X0-T/2,-1,Z0-T/2,Z1+T/2,-.25,HG,[(-3.1,-2.1,1.2,2.2),(.5,1.6,1.9,2.9)],rng)
facing(Fa,'x',Z1+T/2,1,X0-T/2,X1+T/2,-.25,HG,[(-3.6,-2.4,1.0,2.1)],rng)
facing(Fa,'z',X1+T/2,1,ZS+T/2,Z1+T/2,-.25,HG,[(DZ0-.16,DZ1+.16,0,DHEAD+.2),(-.8,.2,1.0,2.0)],rng)
facing(Fa,'z',XE+T/2,1,Z0-T/2,ZS+T/2,-.25,SE,[(-3.1,-2.1,1.0,1.9)],rng)
facing(Fa,'x',ZS+T/2,1,X1+T/2,XE+T/2,-.25,SE,[(2.2,3.2,1.0,1.9)],rng)
Fa.build(root)
Q=Acc('Kitchen_Shell_Quoins')
for (cx,cz,top,sx,sz) in ((X0,Z0,HG,-1,-1),(X0,Z1,HG,-1,1),(X1,Z1,HG,1,1),(XE,Z0,SE,1,-1),(XE,ZS,SE,1,1)):
 y=-.25;i=0
 while y<top-.05:
  h=min(top,y+.3);e1,e2=(.34,.22) if i%2 else (.22,.34)
  ax0,ax1=sorted((cx+sx*(T/2+.06),cx+sx*T/2-sx*e1));az0,az1=sorted((cz+sz*T/2,cz+sz*(T/2+.06)))
  Q.box(ax0,ax1,y+.008,h-.008,az0,az1,quoin[i%2])
  bz0,bz1=sorted((cz+sz*T/2,cz+sz*T/2-sz*e2));bx0,bx1=sorted((cx+sx*T/2,cx+sx*(T/2+.06)))
  Q.box(bx0,bx1,y+.008,h-.008,bz0,bz1,quoin[(i+1)%2])
  y=h;i+=1
Q.build(root)
# the court door: oak frame in the leaf's plane (leaf x .955..1.083 when shut), even gaps, splayed inner reveal
D=Acc('Kitchen_Shell_DoorFrame')
D.box(X1-.045,X1+T/2+.08,0,DHEAD+.005,DZ0-.16,DZ0-.005,timber[0])            # north (latch) jamb, 5 mm from the leaf edge
D.box(X1+.0,X1+T/2+.08,0,DHEAD+.005,DZ1+.005,DZ1+.16,timber[0])             # south (hinge) jamb, outside the hinge line
D.box(X1-.045,X1+T/2+.08,DHEAD+.015,DHEAD+.2,DZ0-.16,DZ1+.16,timber[2])       # head, 1.5 cm over the leaf
D.box(X1+T/2+.08,X1+T/2+.12,DHEAD+.08,DHEAD+.14,DZ0-.3,DZ1+.3,timber[1])      # drip board over the door
for y in (.35,1.9):D.box(X1+T/2+.08,X1+T/2+.1,y,y+.05,DZ1+.02,DZ1+.14,iron)   # the hinge pintles on the jamb
D.build(root)
R=Acc('Kitchen_Shell_Reveals')    # splayed inner reveal and soffit (limewash) behind the frame
R.box(X1-T/2,X1-.045,0,DHEAD+.2,DZ0-.16,DZ0-.12,lime_in[0]);R.box(X1-T/2,X1,0,DHEAD+.2,DZ1+.12,DZ1+.16,lime_in[0])
R.build(root)
# the store doorway (open, no leaf): oak casing on the hall side
Ds=Acc('Kitchen_Shell_StoreDoor')
for zz in (-3.0,-2.0):Ds.box(X1-T/2-.05,X1-T/2+.005,0,2.3,zz-.09 if zz<-2.5 else zz-.0,zz+.0 if zz<-2.5 else zz+.09,timber[0])
Ds.box(X1-T/2-.05,X1-T/2+.005,2.2,2.36,-3.09,-1.91,timber[0])
Ds.build(root)

BX1,OZF=-.5,-3.0
Ln=Acc('Kitchen_Shell_Lining')
def lining(axis,c,sign,u0,u1,top,holes,m):
 us=sorted(set([u0,u1]+[h[k] for h in holes for k in (0,1) if u0<h[k]<u1]));vs=sorted(set([.0,top]+[h[k] for h in holes for k in (2,3) if 0<h[k]<top]))
 for a,b in zip(us,us[1:]):
  for p,q in zip(vs,vs[1:]):
   if any(h[0]<(a+b)/2<h[1] and h[2]<(p+q)/2<h[3] for h in holes):continue
   if axis=='x':Ln.box(a,b,p,q,c,c+sign*.015,m)
   else:Ln.box(c,c+sign*.015,p,q,a,b,m)
lining('x',hz0,1,hx0,hx1,HG,[(-3.2,-2.4,1.0,2.0),(hx0-.01,BX1,-.01,HG+.01)],lime_in[0]);lining('x',hz1,-1,hx0,hx1,HG,[(-3.6,-2.4,1.0,2.1)],lime_in[1])
lining('z',hx0,1,hz0,hz1,HG,[(-3.1,-2.1,1.2,2.2),(.5,1.6,1.9,2.9),(hz0-.01,OZF,-.01,1.9)],lime_in[0]);lining('z',hx1,-1,hz0,hz1,HG,[(DZ0-.16,DZ1+.16,0,DHEAD+.2),(-3.0,-2.0,0,2.2),(-.8,.2,1.0,2.0)],lime_in[1])
lining('x',sz0,1,sx0,sx1,SE,[(2.2,3.0,1.1,1.9)],lime_in[1]);lining('x',sz1,-1,sx0,sx1,SE,[(2.2,3.2,1.0,1.9)],lime_in[0])
lining('z',sx1,-1,sz0,sz1,SE,[(-3.1,-2.1,1.0,1.9)],lime_in[1])
Ln.build(root)
# ---------------------------------------------------------------- windows (glazing is its own part: Kitchen_Glazing_)
Gz=Acc('Kitchen_Glazing_Windows')
win(Gz,'x',Z0,-3.2,-2.4,1.0,2.0,-1)
win(Gz,'z',X0,-3.1,-2.1,1.2,2.2,-1);win(Gz,'z',X0,.5,1.6,1.9,2.9,-1)
win(Gz,'x',Z1,-3.6,-2.4,1.0,2.1,1,lit=True)
win(Gz,'z',X1,-.8,.2,1.0,2.0,1,lit=True)
win(Gz,'x',Z0,2.2,3.0,1.1,1.9,-1);win(Gz,'z',XE,-3.1,-2.1,1.0,1.9,1);win(Gz,'x',ZS,2.2,3.2,1.0,1.9,1)
Gz.build(root)

# ---------------------------------------------------------------- upper storey: jettied timber frame, limewash (Kitchen_UpperShell_)
U=Acc('Kitchen_UpperShell_Frame');J=.28   # the south gable wall juts out over the court
uy0,uy1=HG,EAVE
def frame_wall(axis,c,u0,u1,out,holes,top=None):
 """Plaster panel wall with a timber frame (sill, posts, braces, rail, wall plate) on the outer face."""
 wall(U,axis,c,u0,u1,.22,uy0,top or uy1,holes,lime[0])
 f=c+out*.11
 def bx(ua,ub,va,vb,d0,d1,m):
  if axis=='x':U.box(ua,ub,va,vb,f+min(d0,d1),f+max(d0,d1),m)
  else:U.box(f+min(d0,d1),f+max(d0,d1),va,vb,ua,ub,m)
 tt=top or uy1
 bx(u0,u1,uy0,uy0+.22,0,out*.05,timber[0]);bx(u0,u1,tt-.2,tt,0,out*.05,timber[0]);bx(u0,u1,uy0+1.05,uy0+1.17,0,out*.04,timber[1])
 n=max(2,int((u1-u0)/1.2));ps=[u0+(u1-u0)*k/n for k in range(n+1)]
 for p in ps:
  if any(h[0]-.05<p<h[1]+.05 for h in holes):continue
  a,b=max(u0,p-.08),min(u1,p+.08);bx(a,b,uy0+.22,tt-.2,0,out*.045,timber[(int(p*7))%3])
 for a,b in zip(ps,ps[1:]):
  if any(h[0]<(a+b)/2<h[1] for h in holes):continue
  # a curved-look brace: two straight pieces in the lower panel
  ya,yb=uy0+.22,uy0+1.05
  p0=(a+.1,ya);p1=((a+b)/2,yb) if int(a*3)%2 else (b-.1,ya)
  if axis=='x':U.beam((p0[0],p0[1]+.05,f+out*.022),((a+b)/2,yb-.04,f+out*.022),.1,.045,timber[1])
  else:U.beam((f+out*.022,p0[1]+.05,p0[0]),(f+out*.022,yb-.04,(a+b)/2),.1,.045,timber[1])
 for h in holes:   # window casings
  bx(h[0]-.08,h[0],h[2]-.08,h[3]+.08,0,out*.05,timber[2]);bx(h[1],h[1]+.08,h[2]-.08,h[3]+.08,0,out*.05,timber[2])
  bx(h[0]-.08,h[1]+.08,h[2]-.1,h[2],0,out*.06,timber[2]);bx(h[0]-.08,h[1]+.08,h[3],h[3]+.1,0,out*.05,timber[2])
frame_wall('z',X0,Z0+.11,Z1+J-.11,-1,[(-2.6,-1.6,uy0+.6,uy0+1.5)])
frame_wall('z',X1,Z0+.11,Z1+J-.11,1,[(-3.2,-2.2,uy0+.6,uy0+1.5)])
frame_wall('x',Z1+J,X0-.11,X1+.11,1,[(-2.55,-1.45,uy0+.55,uy0+1.55)])
frame_wall('x',Z0,X0-.11,X1+.11,-1,[])
# jetty: oak joists' ends and a moulded bressumer under the projecting south wall
for x in [X0+.2+k*.5 for k in range(12)]:U.box(x-.06,x+.06,HG-.18,HG,Z1+T/2,Z1+J+.12,timber[0])
U.box(X0-.1,X1+.1,HG-.26,HG-.06,Z1+J-.02,Z1+J+.16,timber[2]);U.box(X0-.1,X1+.1,HG,HG+.06,Z1-T/2,Z1+J+.1,timber[0])
U.build(root)
Ug=Acc('Kitchen_UpperShell_Glazing')
for (axis,c,u0,u1,v0,v1,out) in (('z',X0,-2.6,-1.6,uy0+.6,uy0+1.5,-1),('z',X1,-3.2,-2.2,uy0+.6,uy0+1.5,1),('x',Z1+J,-2.55,-1.45,uy0+.55,uy0+1.55,1)):
 win(Ug,axis,c,u0,u1,v0,v1,out,t=.22,lit=True)
Ug.build(root)
# gable triangles (limewash panels, timber) above the eaves on north and south
Gb=Acc('Kitchen_Roof_Gables');XR=(X0+X1)/2
for zc,out in ((Z0,-1),(Z1+J,1)):
 zf=zc+out*.11
 Gb.poly([(X0-.11,EAVE,zf),(X1+.11,EAVE,zf),(XR,RIDGE-.15,zf)],[(0,1,2)],lime[1])
 for a,b in (((X0-.11,EAVE),(XR,RIDGE-.15)),((X1+.11,EAVE),(XR,RIDGE-.15))):Gb.beam((a[0],a[1],zf+out*.03),(b[0],b[1],zf+out*.03),.18,.06,timber[0])
 Gb.beam((X0,EAVE+.05,zf+out*.03),(X1,EAVE+.05,zf+out*.03),.2,.06,timber[0]);Gb.beam((XR,EAVE+.1,zf+out*.03),(XR,RIDGE-.3,zf+out*.03),.16,.06,timber[1])
 Gb.beam((XR-1.1,EAVE+.1,zf+out*.03),(XR,EAVE+1.5,zf+out*.03),.12,.05,timber[1]);Gb.beam((XR+1.1,EAVE+.1,zf+out*.03),(XR,EAVE+1.5,zf+out*.03),.12,.05,timber[1])
Gb.build(root)

# ---------------------------------------------------------------- roofs: steep thatch on the hall, a lower thatch on the store
Rf=Acc('Kitchen_Roof_Thatch')
thatch_slope(Rf,(X0-.45,EAVE-.3,0),(XR,RIDGE,0),Z0-.1,Z1+J+.1,'z',rows=6,ov=.4)
thatch_slope(Rf,(X1+.45,EAVE-.3,0),(XR,RIDGE,0),Z0-.1,Z1+J+.1,'z',rows=6,ov=.4)
for i in range(9):   # the ridge roll and its pegged sways
 z=Z0-.45+(Z1+J-Z0+.9)*i/9;z2=Z0-.45+(Z1+J-Z0+.9)*(i+1)/9
 Rf.tube((XR,RIDGE+.12,z),(XR,RIDGE+.12,z2),.2,7,thatch_dark,caps=(i in (0,8)))
thatch_slope(Rf,(X1,SE-.25,Z0-.45),(X1,SR,(Z0+ZS)/2),X1+T/2,XE+.4,'x',rows=4,ov=.0)
thatch_slope(Rf,(X1,SE-.25,ZS+.45),(X1,SR,(Z0+ZS)/2),X1+T/2,XE+.4,'x',rows=4,ov=.0)
for i in range(6):
 x=X1+T/2+(XE+.4-X1-T/2)*i/6;x2=X1+T/2+(XE+.4-X1-T/2)*(i+1)/6
 Rf.tube((x,SR+.1,(Z0+ZS)/2),(x2,SR+.1,(Z0+ZS)/2),.16,7,thatch_dark,caps=(i==5))
Rf.build(root)
Rg=Acc('Kitchen_Roof_StoreGable')   # the store's east gable: stone to the eaves, weatherboard above
Rg.poly([(XE+.15,SE,Z0-.15),(XE+.15,SE,ZS+.15),(XE+.15,SR-.1,(Z0+ZS)/2)],[(0,1,2)],timber[1])
for k in range(5):
 y=SE+(SR-.1-SE)*k/5
 f=(y-SE)/(SR-.1-SE);w=(ZS-Z0+.3)/2*(1-f)
 Rg.box(XE+.15,XE+.19,y,y+.04,(Z0+ZS)/2-w,(Z0+ZS)/2+w,timber[0])
Rg.build(root)

# ---------------------------------------------------------------- chimney breast (oven + hearth) and stack
# inside: the breast stands on the north wall from x -3.9 to -0.5, z -4.85..-4.2 (hearth recess in its east half);
# it rises through the loft (Kitchen_UpperHearth_) and out of the thatch (Kitchen_Chimney_Stack).
HB=Acc('Kitchen_Hearth_Breast');BX0,BX1,BZ=-3.9,-.5,-4.2
def brickwork(A,x0,x1,y0,y1,z0,z1,face='s'):
 """A brick mass with coursed brick faces (brick tones on a mortar core)."""
 A.box(x0,x1,y0,y1,z0,z1,brick_mortar,skip='n' if z0<=hz0+1e-6 else '')   # no face against the wall
 y=y0;ri=0
 while y<y1-.01:
  y2=min(y1,y+.12);u=x0+(.12 if ri%2 else 0);us=[x0]
  while u<x1-.05:
   u+=.25
   if u<x1-.05:us.append(u)
  us.append(x1)
  for a,b in zip(us,us[1:]):
   if face=='s':A.box(a+.008,b-.008,y+.008,y2-.008,z1,z1+.018,brick[rng.randrange(4)],skip='n')
  y=y2;ri+=1
FX0,FX1,FY1=-2.1,-.9,1.05
brickwork(HB,BX0,FX0,0,LOFT-.2,hz0,BZ);brickwork(HB,FX1,BX1,0,LOFT-.2,hz0,BZ);brickwork(HB,FX0,FX1,FY1,LOFT-.2,hz0,BZ)   # the breast round the recess
HB.box(FX0,FX1,0,FY1,hz0,hz0+.05,soot,skip='n')                                                 # the sooted back of the recess
Hf=Acc('Kitchen_Hearth_Firebox')
Hf.box(FX0,FX1,.0,.12,hz0+.05,BZ+.25,quoin[1],skip='b')               # raised hearth stone
Hf.box(FX0,FX0+.03,.12,FY1,hz0+.05,BZ+.02,soot2);Hf.box(FX1-.03,FX1,.12,FY1,hz0+.05,BZ+.02,soot2)
Hf.box(FX0-.08,FX1+.08,FY1,FY1+.22,BZ,BZ+.1,brick[2]);Hf.box(FX0-.14,FX1+.14,FY1+.22,FY1+.28,BZ,BZ+.2,oak[0])   # arch lintel + mantel
for x in (FX0-.06,FX1+.06):Hf.box(x-.06,x+.06,0,FY1,BZ,BZ+.08,brick[1])
FK.bed(Hf,((FX0+FX1)/2,.12,(hz0+BZ)/2+.02),size=.72,spread=(1.0,.7),logs='hearth',log_y=.2,seed=881)
cx=(FX0+FX1)/2;cz=(hz0+BZ)/2+.02
Hf.tube((FX1-.08,.12,hz0+.08),(FX1-.08,.95,hz0+.08),.022,5,iron)                     # crane post
Hf.tube((FX1-.08,.9,hz0+.08),(cx,.9,cz),.018,5,iron);Hf.tube((cx,.9,cz),(cx,.68,cz),.008,4,iron)   # arm and pot hook
Hf.lathe(cx,cz,.38,[(.1,0),(.16,.08),(.17,.2),(.14,.28),(.15,.3)],8,iron2,top=True,top_m=M('Bakehouse pottage','#8a6a3a'))   # the cauldron
for i in range(3):a=2*math.pi*i/3;Hf.tube((cx+math.cos(a)*.12,.12,cz+math.sin(a)*.12),(cx+math.cos(a)*.1,.4,cz+math.sin(a)*.1),.012,4,iron)
Hf.build(root);HB.build(root)
hf=FK.flame_layers(root,'Kitchen_HearthFlame',(cx,.16,cz),size=.62,spread=(1.0,.7),seed=882)
FK.flicker(hf,'HearthFlicker',0,seed=883)
UH=Acc('Kitchen_UpperHearth_Breast');brickwork(UH,-3.3,-1.0,LOFT-.2,EAVE+.4,hz0,BZ+.1);UH.build(root)
CS=Acc('Kitchen_Chimney_Stack')
brickwork(CS,-3.1,-1.2,EAVE+.4,RIDGE+1.4,Z0-T/2-.05,BZ+.1)
CS.box(-3.2,-1.1,RIDGE+1.4,RIDGE+1.52,Z0-T/2-.15,BZ+.2,quoin[0]);CS.box(-3.05,-1.25,RIDGE+1.52,RIDGE+1.6,Z0-T/2-.05,BZ+.1,brick[3])
for px in (-2.65,-1.7):CS.lathe(px,(Z0-T/2+BZ+.1)/2-.02,RIDGE+1.6,[(.1,0),(.085,.25),(.11,.3)],7,M('Bakehouse chimney pot','#a4583a'),top=True,top_m=soot)
CS.build(root)

# ---------------------------------------------------------------- the bread oven (service Kitchen_Oven_: the oven body only)
OX0,OX1,OZ0,OZF=-4.85,-2.55,-4.85,-3.0;OCX=-3.65     # footprint; mouth centred on x -3.65 in the south face z -3.0
Ov=Acc('Kitchen_Oven_Body')
Ov.box(OX0,OX1,0,.55,OZ0,OZF,brick_mortar,skip='bnw')                                  # plinth core
for y in (0,.12,.24,.36,.48):                                                         # plinth brick courses (front)
 u=OX0+(.12 if int(y*10)%2 else 0);us=[OX0]
 while u<OX1-.05:
  u+=.25
  if u<OX1-.05:us.append(u)
 us.append(OX1)
 for a,b in zip(us,us[1:]):Ov.box(a+.008,b-.008,y+.008,y+.112,OZF,OZF+.018,brick[rng.randrange(4)],skip='n')
Ov.box(OX0,OX1+.04,.55,.62,OZ0,OZF+.06,quoin[0],skip='nw')                                       # hearth slab of the oven floor
# the dome: an oval brick vault (lathe rings, alternating brick tones per course)
dcx,dcz=(OX0+OX1)/2+.05,(OZ0+OZF)/2-.02;rx,rz=(OX1-OX0)/2-.02,(OZF-OZ0)/2-.02
prof=[(1.0,0),(1.0,.18),(.95,.42),(.84,.66),(.66,.86),(.42,1.0),(0,1.08)];n=14;rings=[]
for k,(r,h) in enumerate(prof):rings.append([(dcx+rx*r*math.cos(2*math.pi*i/n),.62+h*1.1,dcz+rz*r*math.sin(2*math.pi*i/n)) for i in range(n)] if r>0 else [(dcx,.62+h*1.1,dcz)]*n)
MOUTH=(OCX-.4,OCX+.4,1.25)
for k in range(len(rings)-1):
 for i in range(n):
  q=[rings[k][i],rings[k][(i+1)%n],rings[k+1][(i+1)%n],rings[k+1][i]];q=[p for j,p in enumerate(q) if p not in q[:j]]
  c=[sum(p[j] for p in q)/len(q) for j in range(3)]
  if MOUTH[0]<c[0]<MOUTH[1] and c[1]<MOUTH[2] and c[2]>dcz+rz*.4:continue           # the mouth passes through the dome here
  Ov.poly(q,[tuple(range(len(q)))],brick[(i+k)%4])
  qi=[(dcx+(p[0]-dcx)*.93,.62+(p[1]-.62)*.93,dcz+(p[2]-dcz)*.93) for p in q];Ov.poly(qi,[tuple(range(len(qi)-1,-1,-1))],soot)
# the mouth: a brick arch front (a flat face on the dome's south side) with a dark arched opening and an iron door hung open
mx0,mx1,my0,my1=OCX-.33,OCX+.33,.62,1.12
for (ax0,ax1,ay0,ay1) in ((OX0+.3,mx0,.62,1.5),(mx1,OX1-.2,.62,1.5),(mx0,mx1,my1,1.5)):Ov.box(ax0,ax1,ay0,ay1,OZF-.02,OZF+.1,brick[1])   # arch front round the mouth
Ov.box(mx0,mx1,.62,.64,OZF-.3,OZF+.1,quoin[1])                                          # the mouth's sill
for i in range(6):                                                                     # voussoirs round the arch
 a0,a1=math.pi*i/6,math.pi*(i+1)/6
 p0=(OCX+math.cos(a0)*.33,my1-.12+math.sin(a0)*.12);p1=(OCX+math.cos(a1)*.33,my1-.12+math.sin(a1)*.12)
 q0=(OCX+math.cos(a0)*.45,my1-.12+math.sin(a0)*.24);q1=(OCX+math.cos(a1)*.45,my1-.12+math.sin(a1)*.24)
 Ov.poly([(p0[0],p0[1],OZF+.108),(p1[0],p1[1],OZF+.108),(q1[0],q1[1],OZF+.108),(q0[0],q0[1],OZF+.108)],[(0,1,2,3)],quoin[i%2])
for x in (mx0-.1,mx1+.1):Ov.box(x-.1,x+.1,my0,my1-.12,OZF+.1,OZF+.13,quoin[0])            # dressed jambs
Ov.box(mx1+.2,mx1+.24,my0+.02,my1-.02,OZF+.13,OZF+.5,iron)                              # the iron door, swung open against the face
Ov.box(mx1+.18,mx1+.2,my0+.2,my0+.26,OZF+.12,OZF+.16,iron2)
Ov.box(OX0,OX1+.04,1.5,1.58,OZ0,OZF+.14,quoin[1])                                       # capping stone over the front
Ov.build(root)
# the oven fire deep in the chamber, seen through the mouth; the oven's flue rises into the breast
OF=Acc('Kitchen_OvenFire');FK.bed(OF,(OCX,.62,(OZ0+OZF)/2+.05),size=.7,spread=(1.2,.8),logs='oven',log_y=.66,seed=891,ash=True);OF.build(root)
of=FK.flame_layers(root,'Kitchen_OvenFlame',(OCX,.64,(OZ0+OZF)/2+.05),size=.7,spread=(1.2,.8),seed=892,kind='oven')
FK.flicker(of,'OvenFlicker',0,seed=893)
# peel, rake and a wood box by the oven (not part of the Cook click box)
Tl=Acc('Kitchen_Tools_Oven')
Tl.tube((OX1+.12,.02,OZF+.25),(OX1+.24,1.9,OZF+.1),.018,5,oak[2]);Tl.box(OX1+.02,OX1+.3,.0,.03,OZF+.18,OZF+.4,oak[1])   # the peel leaning on the wall
Tl.tube((OX1+.34,.02,OZF+.2),(OX1+.4,1.7,OZF+.05),.015,5,oak[0]);Tl.box(OX1+.3,OX1+.5,1.66,1.74,OZF+.02,OZF+.08,iron)
Tl.build(root)

# ---------------------------------------------------------------- the kneading table and the dough trough
W=Acc('Kitchen_Worktable_Kneading');TX0,TX1,TZ0,TZ1,TY=-2.9,-.9,-.95,-.15,.82
W.box(TX0,TX1,TY-.07,TY,TZ0,TZ1,oak[2])
for x in (TX0+.08,TX1-.08):
 for z in (TZ0+.08,TZ1-.08):W.box(x-.05,x+.05,0,TY-.07,z-.05,z+.05,oak[0])
W.box(TX0+.1,TX1-.1,.15,.22,(TZ0+TZ1)/2-.04,(TZ0+TZ1)/2+.04,oak[1])                  # stretcher
W.box(TX0+.15,TX0+.95,TY,TY+.006,TZ0+.1,TZ1-.1,flour2)                                # a floured board end
for i in range(3):W.lathe(TX0+.3+i*.22,(TZ0+TZ1)/2,TY+.006,[(.07,0),(.075,.03),(.05,.07),(0,.08)],7,dough)   # shaped rolls
W.tube((TX0+.2,TY+.035,TZ1-.12),(TX0+.6,TY+.035,TZ1-.12),.028,6,oak[1])                 # rolling pin
for i in range(2):W.lathe(TX0+1.05+i*.22,TZ0+.2,TY,[(.09,0),(.1,.04),(.07,.09),(0,.11)],8,crust[i])    # two fresh loaves
bowl(W,TX0+1.1,TZ1-.2,TY,.1,pottery[2],inner=flour)
W.build(root)
Dg=Acc('Kitchen_SupplyDoughBowl_Trough')   # the dough trough: a service, compact on the table's east end
dx0,dx1,dz0,dz1=-1.62,-1.0,-.82,-.28
Dg.box(dx0,dx1,TY,TY+.04,dz0,dz1,oak_dark)
for (a,b,c,d) in ((dx0,dx1,dz0,dz0+.04),(dx0,dx1,dz1-.04,dz1),(dx0,dx0+.04,dz0,dz1),(dx1-.04,dx1,dz0,dz1)):Dg.box(a,b,TY+.04,TY+.2,c,d,oak[0])
Dg.lathe((dx0+dx1)/2,(dz0+dz1)/2,TY+.04,[(.2,0),(.22,.08),(.14,.14),(0,.16)],9,dough)
Dg.build(root)

# ---------------------------------------------------------------- bucket rack and water butt by the court door
Bk=Acc('Kitchen_SupplyBuckets_Rack');bx0,bx1,bz0,bz1=-2.25,-1.25,2.42,2.84
for x in (bx0+.04,bx1-.04):Bk.box(x-.035,x+.035,0,1.2,bz0+.02,bz1-.02,oak[0])
Bk.box(bx0,bx1,.4,.46,bz0,bz1,oak[1]);Bk.box(bx0,bx1,1.12,1.2,bz0+.1,bz1,oak[1])
for i in range(3):
 x=bx0+.18+i*.32;Bk.lathe(x,(bz0+bz1)/2,.46,[(.1,0),(.13,.26),(.135,.28)],8,staves[i],top=True,top_m=staves[2])
 Bk.lathe(x,(bz0+bz1)/2,.52,[(.113,0),(.113,.03)],8,iron,top=False)
 Bk.tube((x-.12,.74,(bz0+bz1)/2),(x+.12,.74,(bz0+bz1)/2),.006,4,iron,caps=False)
for i in range(2):   # two more buckets hung on pegs above
 x=bx0+.3+i*.4;Bk.tube((x,1.15,bz1-.02),(x,1.15,bz1-.12),.015,4,oak[0]);Bk.lathe(x,bz1-.16,.8,[(.1,0),(.125,.25),(.13,.27)],8,staves[i+1],top=True,top_m=staves[0])
Bk.build(root)
Wb=Acc('Kitchen_SupplyWaterButt');wx,wz=.42,2.42
Wb.lathe(wx,wz,0,[(.26,0),(.3,.25),(.3,.6),(.27,.84),(.25,.84)],10,staves[0],top=False,bottom=False)   # open staves
Wb.lathe(wx,wz,0,[(.24,.05),(.24,.8)],10,staves[2],top=False)                             # the inside of the staves
Wb.box(wx-.26,wx+.26,0,.05,wz-.26,wz+.26,staves[1])
for hy in (.12,.72):Wb.lathe(wx,wz,hy-.025,[(.285,0),(.285,.05)],10,iron,top=False)
Wb.box(wx-.34,wx+.34,.84,.87,wz-.04,wz+.04,oak[1])                                      # a bar across the rim
Wb.lathe(wx+.3,wz-.26,0,[(.08,0),(.1,.18),(.1,.2)],6,staves[1],top=True)                 # a dipper standing by it
Wb.tube((wx+.3,.2,wz-.26),(wx+.22,.62,wz-.2),.012,4,oak[0])
Wb.build(root)
Ws=Acc('Kitchen_SupplyWaterSurface');Ws.lathe(wx,wz,.74,[(.238,0),(.238,.004)],10,water,top=True);Ws.build(root)

# ---------------------------------------------------------------- recipe board on the east wall (service)
Rb=Acc('Kitchen_RecipeBoard_Board');ry0,ry1,rz0,rz1=1.3,2.0,-1.62,-1.0
Rb.box(hx1-.05,hx1,ry0,ry1,rz0,rz1,oak[1]);Rb.box(hx1-.052,hx1-.05,ry0+.06,ry1-.06,rz0+.06,rz1-.06,paper)
for k in range(5):Rb.box(hx1-.054,hx1-.052,ry1-.14-k*.1,ry1-.12-k*.1,rz0+.12,rz1-.12-(.1 if k%2 else 0),ink)
Rb.box(hx1-.058,hx1-.054,ry1-.1,ry1-.07,(rz0+rz1)/2-.02,(rz0+rz1)/2+.02,iron)            # the nail
Rb.build(root)

# ---------------------------------------------------------------- hall dressing: shelves of loaves, herbs, lamps, a bench
Hd=Acc('Kitchen_Furnishings_Hall')
# a bread bench under the south window (clear of the stair foot), loaves cooling on it and a basket below
Hd.box(-3.05,-2.3,.62,.67,hz1-.4,hz1-.03,oak[2])
for x in (-3.0,-2.35):Hd.box(x-.03,x+.03,0,.62,hz1-.37,hz1-.06,oak[0])
for i in range(3):Hd.lathe(-2.9+i*.24,hz1-.22,.67,[(.08,0),(.085,.035),(.06,.08),(0,.1)],8,crust[i%3])
Hd.lathe(-2.68,hz1-.22,0,[(.16,0),(.2,.22),(.21,.24)],8,M('Bakehouse basket','#a58352'),top=True,top_m=crust[1])
# a bench under the court window on the east wall
Hd.box(hx1-.38,hx1-.02,.42,.47,-.72,.12,oak[2]);[Hd.box(hx1-.34,hx1-.06,0,.42,z-.04,z+.04,oak[0]) for z in (-.62,.02)]
# herbs hung from a pole over the table, two lanterns on hooks, candles on the mantel
Hd.tube((TX0-.1,2.5,(TZ0+TZ1)/2),(TX1+.1,2.5,(TZ0+TZ1)/2),.02,5,oak[0]);herbs(Hd,(TX0+TX1)/2,(TZ0+TZ1)/2,2.48,greens,cord,rng,n=6,axis='x',span=1.6)
lantern(Hd,-.3,-2.9,2.2,iron,lamp);Hd.tube((-.3,2.5,-2.9),(-.3,2.9,-2.9),.01,4,iron)
for x in (FX0-.02,FX1+.02):candle(Hd,x,BZ+.1,FY1+.28,wax,cflame,holder=brass)
jar(Hd,(FX0+FX1)/2-.25,BZ+.1,FY1+.28,.06,.16,pottery[0],style=2)
# sacks of flour under the high end of the stair, and a meal barrel
for i,(x,z) in enumerate(((-4.5,-.7),(-4.45,-.2),(-4.52,.35))):sack(Hd,x,z,0,.42,.62,cloth[i%3],cord,rot=i*.7)
barrel(Hd,-4.45,-1.5,0,.26,.7,staves,iron,lid=lid,rng=random.Random(72))
Hd.build(root)

# ---------------------------------------------------------------- stair to the loft along the west wall
SX0,SX1=hx0+.02,hx0+.9;NT=16;RUN=.215;Z_BOT=2.35
for i in range(NT):
 st=Acc('Kitchen_Stair_Tread%02d'%i);ya=(i+1)*LOFT/NT
 z1=Z_BOT-i*RUN;z0=z1-RUN-(.02 if i<NT-1 else 0)
 st.box(SX0,SX1,ya-.06,ya,z0,z1,oak[i%3]);st.build(root)
Sg=Acc('Kitchen_Stair_Stringers')
Sg.beam((SX1+.04,.05+.3*LOFT/NT/RUN,Z_BOT-.3),(SX1+.04,LOFT-.1,Z_BOT-NT*RUN+.05),.07,.24,oak_dark)
Sg.beam((SX0-.01,.05,Z_BOT+.05),(SX0-.01,LOFT-.1,Z_BOT-NT*RUN+.05),.05,.24,oak_dark)
for i in range(2,NT+1,3):   # balusters and the handrail on the open side (the foot left clear)
 z=Z_BOT-i*RUN;y=i*LOFT/NT;Sg.box(SX1+.02,SX1+.07,y,y+.95,z-.025,z+.025,oak[0])
Sg.beam((SX1+.045,2*LOFT/NT+.95,Z_BOT-2*RUN),(SX1+.045,LOFT+.95,Z_BOT-NT*RUN),.06,.06,oak[2])
Sg.build(root)

# ---------------------------------------------------------------- the loft (y 3.3) over the north half: boards, joists, rail
LZ1=Z_BOT-NT*RUN-.0      # loft edge meets the top tread
U2=Acc('Kitchen_UpperFloor_Boards')
plank_floor(U2,hx0,hx1,hz0,LZ1,LOFT,board,board_under,rng,width=.28,holes=[(-3.3,-1.0,hz0-.01,BZ+.1)],run='z',base=LOFT-.2)
U2.build(root)
Uj=Acc('Kitchen_UpperFloor_Joists')
for x in [hx0+.3+k*.6 for k in range(10)]:Uj.box(x-.06,x+.06,LOFT-.42,LOFT-.2,hz0,LZ1,oak_dark)
Uj.box(hx0,hx1,LOFT-.46,LOFT-.2,LZ1-.18,LZ1,oak_dark)                                   # the edge beam
Uj.build(root)
Ur=Acc('Kitchen_UpperFurnishing_Rail')
for x in [SX1+.1+k*.6 for k in range(9)]:
 if x<hx1-.05:Ur.box(x-.03,x+.03,LOFT,LOFT+.95,LZ1-.1,LZ1-.04,oak[0])
Ur.box(SX1+.05,hx1,LOFT+.9,LOFT+.97,LZ1-.11,LZ1-.03,oak[2]);Ur.box(SX1+.05,hx1,LOFT+.45,LOFT+.5,LZ1-.1,LZ1-.04,oak[1])
Ur.build(root)
# loft dressing: Hettie's box bed, a chest, flour sacks, a stool and a candle
Uf=Acc('Kitchen_UpperFurnishing_Loft');ly=LOFT
Uf.box(-.4,.75,ly,ly+.32,-4.75,-3.8,oak[0]);Uf.box(-.35,.7,ly+.32,ly+.44,-4.7,-3.85,straw[0])
Uf.box(-.35,.7,ly+.44,ly+.5,-4.4,-3.85,blanket[0]);Uf.box(-.3,.1,ly+.44,ly+.52,-4.7,-4.45,linen)
Uf.box(-.45,.8,ly,ly+.9,-4.8,-4.72,oak[1])
crate(Uf,-.4,.25,ly,ly+.45,-3.4,-2.95,[oak[1],oak[2],oak[0]],oak_dark)
for i,(x,z) in enumerate(((-4.4,-4.4),(-4.0,-4.45),(-4.45,-3.95))):sack(Uf,x,z,ly,.42,.6,cloth[i%3],cord,rot=i)
Uf.lathe(-1.0,-2.5,ly,[(.14,0),(.12,.42),(.16,.45)],6,oak[2],top=True)
candle(Uf,-1.0,-2.5,ly+.45,wax,cflame,holder=brass)
Uf.build(root)

# ---------------------------------------------------------------- the flour store (x 1..7, z -5..0)
Pb=Acc('Kitchen_Pantry_FlourBin')    # service: the flour bin, compact against the north wall
fx0,fx1,fz0,fz1=3.95,5.05,sz0+.02,sz0+.72
Pb.box(fx0,fx1,0,.1,fz0,fz1,oak_dark)
for (a,b,c,d) in ((fx0,fx1,fz0,fz0+.05),(fx0,fx1,fz1-.05,fz1),(fx0,fx0+.05,fz0,fz1),(fx1-.05,fx1,fz0,fz1)):Pb.box(a,b,.1,.92,c,d,oak[1])
Pb.box(fx0+.05,fx1-.05,.1,.8,fz0+.05,fz1-.05,flour)                                     # heaped flour
Pb.lathe((fx0+fx1)/2,(fz0+fz1)/2,.8,[(.3,0),(.2,.07),(0,.1)],8,flour)
Pb.box(fx0-.02,fx1+.02,.92,.97,fz0-.02,fz0+.2,oak[2])                                   # the hinged lid, propped up
Pb.beam((fx0+.02,.97,fz0+.12),(fx0+.02,1.55,fz0+.02),.06,.03,oak[2]);Pb.beam((fx1-.02,.97,fz0+.12),(fx1-.02,1.55,fz0+.02),.06,.03,oak[2])
Pb.box(fx0,fx1,1.5,1.58,fz0-.06,fz0+.02,oak[2])
Pb.lathe(fx1-.25,fz1-.2,.8,[(.06,0),(.08,.08)],6,copper,top=True)                        # a copper scoop
Pb.build(root)
St=Acc('Kitchen_Store_Shelves')      # loaf shelves along the east wall, sacks and barrels (not a service)
for y in (.35,.85,1.35,1.85):
 St.box(sx1-.42,sx1-.02,y,y+.035,-4.6,-2.4,oak[1])
 for k in range(6):St.lathe(sx1-.22,-4.4+k*.34,y+.035,[(.1,0),(.11,.04),(.08,.09),(0,.12)],8,crust[(k+int(y*3))%3])
for z in (-4.62,-3.5,-2.42):St.box(sx1-.42,sx1-.02,0,2.0,z-.03,z+.03,oak[0])
for i,(x,z) in enumerate(((1.55,-4.5),(2.0,-4.55),(1.6,-4.0),(2.45,-4.5),(1.6,-3.5))):sack(St,x,z,0 if i<4 else .02,.46,.66,cloth[i%3],cord,rot=i*.9)
sack(St,1.8,-4.3,.6,.42,.55,cloth[1],cord,rot=.3)
for i,(x,z) in enumerate(((6.3,-1.0),(5.75,-.75))):barrel(St,x,z,0,.3,.82,staves,iron,lid=lid,rng=random.Random(80+i))
crate(St,3.9,4.7,0,.5,-.8,-.25,[oak[1],oak[2],oak[0]],oak_dark)                          # a meal chest by the court window
jar(St,4.1,-.55,.5,.1,.3,pottery[2],style=1);jar(St,4.45,-.5,.5,.08,.22,pottery[0])
St.tube((1.3,2.2,-4.7),(2.6,2.2,-4.7),.015,4,iron);herbs(St,1.95,-4.62,2.2,greens,cord,rng,n=4,axis='x',span=1.1)
lantern(St,4.0,-2.5,2.0,iron,lamp);St.tube((4.0,2.3,-2.5),(4.0,SE-.05,-2.5),.01,4,iron)
St.build(root)
Sb=Acc('Kitchen_Store_Beams')        # the store's tie beams and rafters (seen under the thatch)
for x in (2.5,4.0,5.5):Sb.box(x-.08,x+.08,SE-.2,SE,Z0,ZS,oak_dark)
Sb.build(root)

# ---------------------------------------------------------------- the entrance court: low walls, woodpile, sign
Ct=Acc('Kitchen_Court_Dressing')
def lowwall(x0,x1,z0,z1,h=.85):
 Ct.box(x0,x1,0,h,z0,z1,stone[2]);Ct.box(x0-.04,x1+.04,h,h+.08,z0-.04,z1+.04,quoin[0])
lowwall(XE-.2,XE+.15,ZS+.15,Z1+.2);lowwall(4.2,XE+.15,Z1-.15,Z1+.2)
for i in range(4):   # woodpile against the store's court wall, split logs showing their ends
 for k in range(5-i):
  z=ZS+T/2+.18+i*.17;x=5.0+k*.26+i*.13
  log(Ct,(x,.1+i*.17,ZS+T/2+.02),(x,.1+i*.17,ZS+T/2+.62),.085,oak_dark,M('Bakehouse log end','#c4a172'))
Ct.box(4.85,6.55,0,.05,ZS+T/2,ZS+T/2+.66,oak[0])
# the bakery sign: an iron bracket and a painted board with a loaf, beside the door
sy=2.75;Ct.tube((X1+T/2+.05,sy,DZ0-.35),(X1+T/2+.75,sy,DZ0-.35),.02,5,iron);Ct.beam((X1+T/2+.05,sy-.35,DZ0-.35),(X1+T/2+.5,sy,DZ0-.35),.03,.03,iron)
Ct.box(X1+T/2+.2,X1+T/2+.7,sy-.5,sy-.05,DZ0-.37,DZ0-.33,paint2)
Ct.poly([(X1+T/2+.28,sy-.35,DZ0-.325),(X1+T/2+.62,sy-.35,DZ0-.325),(X1+T/2+.58,sy-.22,DZ0-.325),(X1+T/2+.45,sy-.17,DZ0-.325),(X1+T/2+.32,sy-.22,DZ0-.325)],[(0,1,2,3,4)],paint)
Ct.poly([(X1+T/2+.28,sy-.35,DZ0-.375),(X1+T/2+.32,sy-.22,DZ0-.375),(X1+T/2+.45,sy-.17,DZ0-.375),(X1+T/2+.58,sy-.22,DZ0-.375),(X1+T/2+.62,sy-.35,DZ0-.375)],[(0,1,2,3,4)],paint)
Ct.build(root)

# ---------------------------------------------------------------- finish, save, export
for o in root.children:
 if o.type=='MESH':
  recalc(o)
  if 'Flame' not in o.name:sharp_by_angle(o,30)
bpy.context.scene.render.fps=24;bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=37;bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'kitchen-character.blend'))
bpy.ops.object.select_all(action='DESELECT')
exp=[o for o in bpy.data.objects if o.name.startswith('Kitchen_')]
for o in exp:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'kitchen-character.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_frame_range=True,export_force_sampling=True)
tris={o.name:sum(len(p.vertices)-2 for p in o.data.polygons) for o in exp if o.type=='MESH'}
SERV={'Take bucket':'Kitchen_SupplyBuckets_','Fill bucket with flour':'Kitchen_Pantry_','Fill bucket with water':'Kitchen_SupplyWater','Take dough':'Kitchen_SupplyDoughBowl_','Cook':'Kitchen_Oven_','Read recipe':'Kitchen_RecipeBoard_'}
bounds={}
for label,pre in SERV.items():
 pts=[o.matrix_world@v.co for o in exp if o.type=='MESH' and o.name.startswith(pre) for v in o.data.vertices]
 # plan space (x, y up, z south) = Blender (x, z, -y)
 bounds[label]={'prefix':pre,'min':[round(min(p.x for p in pts),3),round(min(p.z for p in pts),3),round(min(-p.y for p in pts),3)],'max':[round(max(p.x for p in pts),3),round(max(p.z for p in pts),3),round(max(-p.y for p in pts),3)],
  'meshes':sorted({o.name for o in exp if o.type=='MESH' and o.name.startswith(pre)})}
contract=json.loads((PREV/'kitchen-character.contract.json').read_text()) if (PREV/'kitchen-character.contract.json').exists() else {}
contract.update({'version':'holm-kitchen-wings-v8','note':'2026-09-25 v8: full redesign in Blender (owner play-test); same footprint and court door; services compact',
 'modelSha256':hashlib.sha256((OUT/'kitchen-character.glb').read_bytes()).hexdigest(),'triangles':sum(tris.values()),'serviceBounds':bounds,
 'clips':[a.name for a in bpy.data.actions]})
(OUT/'kitchen-character.contract.json').write_text(json.dumps(contract,indent=1))
print('[BAKEHOUSE_V8] triangles',sum(tris.values()),'parts',len(tris),'clips',[a.name for a in bpy.data.actions])
print('[BAKEHOUSE_V8_SERVICES]',json.dumps(bounds))
