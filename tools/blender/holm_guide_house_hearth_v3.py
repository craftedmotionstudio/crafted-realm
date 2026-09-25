"""Guide house v3 fireplace (interiors pass 2026-09-25): a coursed chimney breast of distinctly different grey
stones on the west wall, a timber mantel with its shelf dressed, a soot-dark firebox with firedogs, logs, an
ember bed and glow, flagged hearth stones, fire irons and a log basket. Stays inside the declared 'hearth'
envelope (x -6.12..-4.65, z -3.9..-1.9) apart from the irons and basket, which stand on tiles no navigation
node uses. The animated HearthFlame0..2 / HearthFlicker0..2 contract of v1/v2 is kept."""
import bpy,math,random
from holm_interior_kit import Acc,M,family,stone_face,log,candle,jar

def build(B):
 root=B['root'];rng=random.Random(92503)
 greys=family('Hearth stone',['#8e8b83','#77766f','#a4a095','#66655f','#848a86'])
 mortar=M('Hearth mortar','#57534c');soot=M('Firebox soot','#27221e');sootback=M('Firebox back','#1c1816')
 glow=M('Ember glow','#a3401a',emit=1.0);ember=M('Ember bed','#e2691f',emit=1.5);char=M('Charred wood','#221a15')
 flags=family('Hearth flag',['#8f8a80','#a39d90','#7c776e'])
 oak=M('Mantel oak','#5e3e25');oak2=M('Mantel shelf oak','#7a5534');bark=M('Log bark','#4b3626');endg=M('Log end grain','#c4a172')
 iron=M('Hearth iron','#303130');brass=M('Warm brass','#b59546');wax=M('Candle wax','#efe6c8');flamec=M('Candle flame','#ffc15a',emit=1.5)
 clay=M('Terracotta','#a85f39');wicker=family('Wicker',['#a58352','#8c6c42']);board=M('Plaque board','#6e4a2c');fish=M('Plaque fish','#8ea3a8');fish2=M('Plaque fish back','#5f7880')
 A=Acc('GroundHearthBreast')
 X0,X1=-5.825,-5.10;Z0,Z1=-3.8,-2.0;OZ0,OZ1=-3.4,-2.4;OY=1.1;TOP=2.78
 # mortar core around the firebox, then the stones laid over it
 A.box(X0,X1,0,TOP,Z0,OZ0,mortar);A.box(X0,X1,0,TOP,OZ1,Z1,mortar);A.box(X0,X1,OY,TOP,OZ0,OZ1,mortar)
 stone_face(A,'z',X1,1,Z0,Z1,0,TOP,greys,rng,course=(.2,.3),length=(.24,.46),proud=(.015,.04),holes=[(OZ0-.01,OZ1+.01,-1,OY+.23)])
 for z,out in ((Z0,-1),(Z1,1)):stone_face(A,'x',z,out,X0+.02,X1,0,TOP,greys,rng,course=(.2,.3),length=(.2,.4),proud=(.015,.035))
 A.box(X0,X1+.04,TOP-.06,TOP,Z0-.04,Z1+.04,greys[3],skip='b')
 # firebox: soot lining, dark back with a glowing lower half, raised hearth stone, firedogs, logs, embers
 A.box(X0,X0+.03,0,OY,OZ0,OZ1,sootback);A.box(X0+.03,X0+.034,.08,.62,OZ0+.2,OZ1-.2,glow)
 A.box(X0,X1,0,OY,OZ0-.02,OZ0,soot);A.box(X0,X1,0,OY,OZ1,OZ1+.02,soot);A.box(X0,X1,OY-.02,OY,OZ0,OZ1,soot)
 A.box(X0+.03,X1+.02,0,.06,OZ0,OZ1,flags[1],skip='b')
 for z in (-3.14,-2.66):
  A.beam((-5.62,.06,z),(-5.2,.06,z),.03,.03,iron);A.beam((-5.2,.06,z),(-5.2,.28,z),.03,.03,iron);A.box(-5.23,-5.17,.28,.33,z-.03,z+.03,iron)
 for a,b in (((-5.62,.16,-3.25),(-5.25,.2,-2.55)),((-5.62,.16,-2.55),(-5.25,.2,-3.25)),((-5.55,.3,-3.1),(-5.5,.3,-2.7))):log(A,a,b,.07,bark,endg)
 for i in range(9):
  x=rng.uniform(-5.72,-5.22);z=rng.uniform(-3.28,-2.52);A.rbox(x,z,rng.uniform(.06,.12),rng.uniform(.05,.1),.06,.06+rng.uniform(.02,.05),rng.random()*3,ember if i%3 else char,skip='b')
 # mantel beam and shelf, dressed with candles, a jug, a box and a pewter plate
 A.box(X1-.02,X1+.14,OY,OY+.22,-3.95,-1.85,oak);A.box(X1-.02,X1+.2,OY+.22,OY+.26,-3.98,-1.82,oak2)
 sy=OY+.26
 for z in (-3.72,-2.1):candle(A,-4.99,z,sy,wax,flamec,holder=brass,h=.14)
 jar(A,-5.0,-3.2,sy,.07,.2,clay,style=2);A.box(-5.06,-4.94,sy,sy+.09,-2.62,-2.42,oak)
 A.tube((-5.08,sy+.17,-2.9),(-5.06,sy+.17,-2.9),.15,10,M('Pewter','#8d918f'))
 # a carved plaque with a painted fish above the mantel (the house is a coastal one)
 A.box(X1+.04,X1+.07,1.72,2.12,-3.25,-2.55,board)
 fx=X1+.075;A.poly([(fx,1.92,-3.1),(fx,1.99,-2.95),(fx,1.98,-2.78),(fx,1.92,-2.7),(fx,1.86,-2.78),(fx,1.85,-2.95)],[(0,1,2,3,4,5)],fish)
 A.poly([(fx,1.92,-2.7),(fx,1.99,-2.62),(fx,1.85,-2.62)],[(0,1,2)],fish2);A.poly([(fx+.002,1.95,-3.02),(fx+.002,1.96,-3.0),(fx+.002,1.94,-3.0)],[(0,1,2)],fish2)
 # flagged hearth in front of the fire: three slabs of different stones
 zs=[-3.85,-3.2,-2.55,-1.95]
 for i,(a,b) in enumerate(zip(zs,zs[1:])):A.box(X1+.005,-4.66,0,(.035 if i%2 else .041),a+.006,b-.006,flags[i%3],skip='b')
 # iron kettle on the hearth, fire irons stand, log basket by the north wall
 A.lathe(-4.86,-2.2,.04,[(.07,0),(.1,.05),(.09,.12),(.05,.15),(.05,.16)],8,iron,top=True);A.beam((-4.86,.2,-2.3),(-4.86,.28,-2.2),.012,.012,iron);A.beam((-4.86,.28,-2.2),(-4.86,.2,-2.1),.012,.012,iron)
 A.beam((-4.78,.12,-2.2),(-4.7,.17,-2.2),.018,.018,iron)
 A.lathe(-4.86,-1.68,0,[(.09,0),(.09,.02),(.015,.02),(.015,.6)],6,iron,top=True)
 for dz,top in ((-.03,.7),(.03,.66),(0,.72)):A.beam((-4.86,.08,-1.68+dz*3),(-4.86,top,-1.68+dz),.018,.018,iron)
 A.lathe(-4.75,-4.4,0,[(.22,0),(.27,.3),(.29,.36)],8,wicker[0],top=True,top_m=wicker[1])
 A.lathe(-4.75,-4.4,.12,[(.277,0),(.281,.05)],8,wicker[1],top=False)
 for i in range(5):
  a=i*1.2;log(A,(-4.75+math.cos(a)*.12,.3,-4.4+math.sin(a)*.12-.18),(-4.75+math.cos(a)*.1,.52,-4.4+math.sin(a)*.1+.16),.05,bark,endg,n=6)
 A.build(root)
 for i in range(3):
  x=-5.45+i*.12;z=-2.9+(i-1)*.20
  obj=B['mesh']('HearthFlame'+str(i),[(-.10,0,-.10),(.10,0,-.10),(.13,.20,.03),(.02,.60,.02),(-.13,.24,.08)],[(0,1,2),(0,2,4),(2,3,4)],M('Fire gold v3','#ffb035',emit=1.7) if i==1 else M('Fire ember v3','#e2621c',emit=1.2))
  obj.location=(x,-z,.26)
  for frame,scale in [(1,1),(7,.78+i*.08),(13,1.10-i*.07),(19,.83),(25,1)]:
   obj.scale=(1,1,scale);obj.keyframe_insert(data_path='scale',frame=frame)
  obj.animation_data.action.name='HearthFlicker'+str(i)
 bpy.context.scene.frame_set(1)
