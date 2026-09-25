"""Guide house v3 silhouette (owner, 2026-09-25: "a little bit more uniqueness to the shape").

Three additions chosen for the strongest read from the game camera, none on the walkable footprint, the
approach path or a door stance:
 1. an external stone chimney on the west wall: stepped breast (two sloped weatherings), a tall stack that
    breaks the roofline above the ridge, a corbelled cap and two clay pots;
 2. a lean-to log store (outshut) tucked against the west wall north of the chimney, with its own catslide
    roof and a stack of split logs showing their end grain;
 3. a fish weathervane on the ridge.
Parts: GroundShellChimney (ground storey height), UpperHearthChimney (the storey above, hidden with the upper
floor like the old internal flue), RoofChimney (above the eaves, hidden with the roof), GroundShellLeanTo,
RoofWeathervane. One exterior blocker covers the chimney foot and the log store (see BLOCKERS)."""
import math,random
from holm_interior_kit import Acc,M,family,log

BLOCKERS=[{'id':'west_chimney_and_log_store','surface':'exterior','x0':-7.7,'x1':-6.0,'z0':-5.05,'z1':-1.7}]
def build(B):
 root=B['root'];rng=random.Random(92504);SK='' if B.get('GUIDE_VERSION',3)>=4 else 'e'   # v4: closed courses (the stack's east side shows above the roof)
 greys=family('Chimney stone',['#6d7566','#848a76','#5e665a','#7a7f6e']);quoin=M('Chimney quoin','#91876b');cap=M('Chimney coping','#9b927a')
 pot=M('Chimney pot','#a4583a');soot=M('Chimney throat','#1d1a18')
 parts={'GroundShellChimney':Acc('GroundShellChimney'),'UpperHearthChimney':Acc('UpperHearthChimney'),'RoofChimney':Acc('RoofChimney')}
 def part(y):return parts['GroundShellChimney'] if y<2.8 else parts['UpperHearthChimney'] if y<5.5 else parts['RoofChimney']
 ZC=-2.9
 # (y0, y1, x_outer, half-depth in z); x_inner is the wall face (-6.18) and the stack sinks into the wall top
 sections=[(-.3,1.35,-7.35,1.12),(1.65,4.25,-7.1,.88),(4.55,9.35,-6.95,.62)]
 XI=-6.1
 for y0,y1,xo,hz in sections:
  y=y0;k=0
  while y<y1-.02:
   yh=min(y1,y+.3);A=part((y+yh)/2);j=rng.uniform(-.012,.012)
   A.box(xo-j,XI,y,yh,ZC-hz-j,ZC+hz+j,greys[rng.randrange(4)],skip=SK)
   # dressed quoins on the two outer corners, alternating long and short faces
   L=.34 if k%2 else .2;D=.2 if k%2 else .34
   A.box(xo-.02,xo+L,y+.01,yh-.01,ZC-hz-.02,ZC-hz+D,quoin,skip=SK)
   A.box(xo-.02,xo+(.54-L),y+.01,yh-.01,ZC+hz-(.54-D),ZC+hz+.02,quoin,skip=SK)
   y=yh;k+=1
 # sloped weatherings between the steps
 for (ya,xa,ha),(yb,xb,hb) in (((1.35,-7.35,1.12),(1.65,-7.1,.88)),((4.25,-7.1,.88),(4.55,-6.95,.62))):
  A=part(ya)
  V=[(xa,ya,ZC-ha),(XI,ya,ZC-ha),(XI,ya,ZC+ha),(xa,ya,ZC+ha),(xb,yb,ZC-hb),(XI,yb,ZC-hb),(XI,yb,ZC+hb),(xb,yb,ZC+hb)]
  A.poly(V,[(0,3,7,4),(0,4,5,1),(3,2,6,7),(4,7,6,5)],cap)
 R=parts['RoofChimney']
 R.box(-7.03,-6.02,8.95,9.1,ZC-.7,ZC+.7,cap);R.box(-6.95,-6.1,9.1,9.35,ZC-.62,ZC+.62,greys[1],skip='b');R.box(-7.0,-6.05,9.35,9.45,ZC-.67,ZC+.67,cap)
 for dz in (-.28,.28):
  R.lathe(-6.52,ZC+dz,9.45,[(.13,0),(.1,.3),(.12,.33),(.12,.36)],8,pot,top=True,top_m=soot)
 # ---- lean-to log store against the west wall, north of the chimney
 G=Acc('GroundShellLeanTo');post=M('Lean-to post','#4a3322');plank=family('Lean-to board',['#6f5a44','#5f4c39','#7a6650'])
 bark=M('Split log bark','#4d3a2a');endg=family('Split log end',['#c9a878','#b8966a','#d4b688'])
 x0,x1,z0,z1=-7.45,-6.2,-4.95,-4.1
 G.box(x0,x1,-.3,.06,z0,z1,M('Lean-to slab','#8a8578'),skip='b')
 for zz in (z0+.07,z1-.07):G.box(x0+.02,x0+.16,.06,1.78,zz-.07,zz+.07,post)
 G.box(x0,x0+.18,1.72,1.86,z0-.02,z1+.02,post)
 for zz in (z0+.05,(z0+z1)/2,z1-.05):G.beam((x1,2.42,zz),(x0-.12,1.83,zz),.08,.1,post)
 n=5
 for i in range(n):
  a=i/n;b=(i+1.15)/n
  V=[(x1+(x0-.14-x1)*a,2.49-(2.49-1.9)*a,z0-.1),(x1+(x0-.14-x1)*b,2.49-(2.49-1.9)*b-.015,z0-.1),(x1+(x0-.14-x1)*b,2.49-(2.49-1.9)*b-.015,z1+.1),(x1+(x0-.14-x1)*a,2.49-(2.49-1.9)*a,z1+.1)]
  V+=[(p[0],p[1]+.04,p[2]) for p in V]
  G.poly(V,[(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],plank[i%3])
 for row in range(5):
  for i in range(5):
   zz=z0+.14+i*.2+(.1 if row%2 else 0)
   if zz>z1-.1:continue
   y=.14+row*.16;log(G,(x1-.05,y,zz),(x0+.22,y,zz),.085,bark,endg[rng.randrange(3)],n=6)
 # ---- weathervane on the ridge: rod, compass arms, gilded ball and a swinging fish
 V=Acc('RoofWeathervane');iron=M('Vane iron','#2f3130');gilt=M('Vane gilt','#c6a24a')
 XR,RY,ZV=B['XR'],B['RIDGE']+.24,.6
 V.box(XR-.12,XR+.12,RY-.04,RY+.04,ZV-.12,ZV+.12,iron)
 V.tube((XR,RY,ZV),(XR,RY+1.35,ZV),.022,6,iron)
 for a in range(4):
  ang=a*math.pi/2;V.beam((XR,RY+.7,ZV),(XR+math.sin(ang)*.36,RY+.7,ZV-math.cos(ang)*.36),.02,.02,iron)
  V.lathe(XR+math.sin(ang)*.38,ZV-math.cos(ang)*.38,RY+.68,[(.03,0),(.03,.04)],6,gilt)
 V.lathe(XR,ZV,RY+.9,[(.02,0),(.07,.05),(.07,.1),(0,.15)],8,gilt,top=False)
 fy=RY+1.2;rot=.55;c,s=math.cos(rot),math.sin(rot)
 fish=[(-.55,0),(-.35,.12),(0,.14),(.25,.08),(.4,0),(.25,-.08),(0,-.14),(-.35,-.12)]
 tail=[(-.55,0),(-.75,.14),(-.7,0),(-.75,-.14)]
 def T(a,b,yy,d):return (XR+a*c+d*s,yy+b,ZV-a*s+d*c)
 for pts in (fish,tail):
  n=len(pts);V.poly([T(a,0,fy+b,-.012) for a,b in pts]+[T(a,0,fy+b,.012) for a,b in pts],[tuple(range(n)),tuple(range(2*n-1,n-1,-1))]+[(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)],iron)
 V.poly([T(.5,0,fy,0),T(.4,0,fy+.05,-.013),T(.4,0,fy-.05,-.013),T(.4,0,fy+.05,.013),T(.4,0,fy-.05,.013)],[(0,1,2),(0,4,3),(0,3,1),(0,2,4)],gilt)
 for A in list(parts.values())+[G,V]:A.build(root)
 return BLOCKERS
