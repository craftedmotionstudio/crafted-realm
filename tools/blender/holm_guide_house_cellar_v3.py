"""Guide house v3 cellar (owner, 2026-09-25: "a hatch that goes down to a cellar").

A wooden trapdoor in the dead pocket between the chart table and the long table (no navigation node stands
there: the chart and bench envelopes already exclude those tiles) opens onto a small stone cellar directly
below: coursed stone walls, a beamed ceiling, flagstone floor, casks on a cradle, standing barrels, sacks,
shelves of preserves, a wall lantern, a ladder up to the hatch and cobwebs in two corners.

Named parts (game contract, see REPORT.md):
 CellarHatch      hatch frame, flush in the ground floor; custom prop kind=arrival_hatch (exported as extras)
 CellarHatchLid   the lid, origin on its hinge (west edge); clip 'CellarHatchOpen' swings it 100 degrees
 CellarHatchLidIron  ring pull and strap hinges, child of the lid
 CellarFloor      flagstones (walk surface)
 CellarShell      walls; CellarCeiling beams and boards (hide it like a roof when the player is below)
 CellarLadder     the ladder; CellarFurnishing everything else
Plan coordinates are house-local (x east, y up, z south); floor y -2.75 (world 0.25 with foundation y 3)."""
import bpy,math,random
from holm_interior_kit import Acc,M,family,barrel,cask,crate,sack,jar,lantern,stone_face,plank_floor

FLOOR=-2.75
ROOM=(-5.5,-0.5,-1.5,2.5)                     # interior x0,x1,z0,z1
OPEN=(-2.0,-1.1,-0.75,0.15)                   # hatch clear opening
FRAME=(-2.08,-1.02,-0.83,0.23)                # frame outer edge = the hole in the ground floor
LID=(-2.04,-1.06,-0.79,0.19)
def build(B,P):
 root=B['root'];rng=random.Random(9253);x0,x1,z0,z1=ROOM;TOPY=-.2
 greys=family('Cellar stone',['#625f58','#6f6b63','#56534d','#7a7263','#68655e'])
 mortar=M('Cellar mortar','#3e3a35');flags=family('Cellar flag',['#6d695f','#7a756a','#605c54','#716c61']);grout=M('Cellar grout','#2e2b27')
 beam=M('Cellar beam oak','#4a3322');boards=family('Cellar ceiling board',['#5d4330','#533b29','#654a35']);web=M('Cobweb','#d6d6cf')
 # ---- floor
 F=Acc('CellarFloor');F.box(x0,x1,FLOOR-.12,FLOOR-.012,z0,z1,grout,skip='b')
 z=z0
 while z<z1-.05:
  zh=min(z1,z+rng.uniform(.45,.75));x=x0
  if z1-zh<.3:zh=z1
  while x<x1-.05:
   xh=min(x1,x+rng.uniform(.5,.95))
   if x1-xh<.3:xh=x1
   F.box(x+.012,xh-.012,FLOOR-.05,FLOOR+rng.uniform(-.004,.006),z+.012,zh-.012,flags[rng.randrange(4)],skip='b');x=xh
  z=zh
 F.build(root)
 # ---- walls: mortar core with coursed stones on the room side
 S=Acc('CellarShell');t=.35
 for bx in [(x0-t,x0,FLOOR-.12,TOPY,z0-t,z1+t),(x1,x1+t,FLOOR-.12,TOPY,z0-t,z1+t),(x0,x1,FLOOR-.12,TOPY,z0-t,z0),(x0,x1,FLOOR-.12,TOPY,z1,z1+t)]:S.box(*bx,mortar)
 kw=dict(course=(.34,.5),length=(.55,.95),proud=(.015,.045))
 stone_face(S,'z',x0,1,z0,z1,FLOOR,TOPY-.25,greys,rng,**kw);stone_face(S,'z',x1,-1,z0,z1,FLOOR,TOPY-.25,greys,rng,**kw)
 stone_face(S,'x',z0,1,x0,x1,FLOOR,TOPY-.25,greys,rng,**kw);stone_face(S,'x',z1,-1,x0,x1,FLOOR,TOPY-.25,greys,rng,**kw)
 S.build(root)
 # ---- beamed ceiling: summer beam along x, joists along z, boards; trimmed round the hatch
 C=Acc('CellarCeiling')
 plank_floor(C,x0,x1,z0,z1,TOPY-.01,boards,None,rng,width=.28,holes=[FRAME],run='x',thick=.025)
 C.box(x0,x1,-.5,TOPY-.035,.42,.62,beam)
 xs=[x0+.3+i*.62 for i in range(8)]
 for xx in xs:
  if FRAME[0]-.12<xx<FRAME[1]+.12:continue
  C.box(xx-.07,xx+.07,-.42,TOPY-.035,z0,z1,beam)
 for xx in (FRAME[0]-.07,FRAME[1]+.07):C.box(xx-.07,xx+.07,-.42,TOPY-.035,z0,.42,beam)
 for zz in (FRAME[2]-.07,FRAME[3]+.07):C.box(FRAME[0]-.14,FRAME[1]+.14,-.42,TOPY-.035,zz-.07,zz+.07,beam)
 C.build(root)
 # ---- ladder from the floor up to the hatch's east rim
 L=Acc('CellarLadder');lm=M('Ladder ash','#9b7a50');lr=M('Ladder rung','#8a6a43')
 top=(-1.2,-.06);foot=(-1.48,FLOOR)
 for zz in (-.66,-.24):L.beam((foot[0],foot[1],zz),(top[0],top[1],zz),.06,.08,lm)
 n=9
 for i in range(1,n):
  f=i/n;L.tube((foot[0]+(top[0]-foot[0])*f,foot[1]+(top[1]-foot[1])*f,-.69),(foot[0]+(top[0]-foot[0])*f,foot[1]+(top[1]-foot[1])*f,-.21),.022,6,lr,caps=False)
 L.build(root)
 # ---- furnishings
 A=Acc('CellarFurnishing');staves=P['staves']
 # cask cradle on the north wall: three casks lying, one small on top, a tap in the middle head
 for zz in (-1.36,-.86):A.box(-5.4,-3.22,FLOOR,FLOOR+.14,zz-.06,zz+.06,beam)
 for i,xx in enumerate((-5.02,-4.3,-3.58)):
  cask(A,(xx,FLOOR+.44,-1.42),(xx,FLOOR+.44,-.8),.3,[staves[i%3],staves[(i+1)%3]],P['lid'],P['iron'])
  for s in (-1,1):A.box(xx+s*.26-.04,xx+s*.26+.04,FLOOR+.14,FLOOR+.24,-1.4,-.82,beam)
 cask(A,(-4.66,FLOOR+.98,-1.38),(-4.66,FLOOR+.98,-.9),.22,[staves[2],staves[0]],P['lid'],P['iron'])
 A.tube((-4.3,FLOOR+.36,-.8),(-4.3,FLOOR+.36,-.7),.025,6,P['brass']);A.box(-4.32,-4.28,FLOOR+.36,FLOOR+.42,-.72,-.68,P['brass'])
 A.lathe(-4.3,-.62,FLOOR,[(.1,0),(.12,.12),(.12,.13)],8,staves[1],top=True,top_m=P['lid'])
 # standing barrels and sacks in the south-west corner
 barrel(A,-5.2,1.05,FLOOR,.27,.78,staves,P['iron'],P['lid'],rng);barrel(A,-5.2,1.62,FLOOR,.26,.72,staves,P['iron'],P['lid'],rng)
 sack(A,-5.2,2.2,FLOOR,.44,.62,P['sack'][0],P['cord'],rot=.3);sack(A,-4.72,2.28,FLOOR,.38,.5,P['sack'][1],P['cord'],rot=1.2)
 # preserves shelves on the south wall
 sx0,sx1=-4.35,-2.85
 for xx in (sx0,sx1-.05):A.box(xx,xx+.05,FLOOR,FLOOR+1.72,2.12,2.48,beam)
 for l in (.1,.55,1.0,1.45):A.box(sx0,sx1,FLOOR+l,FLOOR+l+.04,2.12,2.48,P['wains'][l>.5 and 1 or 0])
 glassy=[M('Preserve amber','#b8862f'),M('Preserve plum','#6b2f45'),M('Preserve green','#7d9443'),P['pots'][2],P['pots'][0]]
 for li,l in enumerate((.55,1.0,1.45)):
  xx=sx0+.14
  while xx<sx1-.14:
   r=rng.uniform(.07,.1);jar(A,xx,2.3+rng.uniform(-.04,.04),FLOOR+l+.04,r,rng.uniform(.14,.26),glassy[rng.randrange(5)],lid=P['linen'] if rng.random()<.5 else P['cord'],style=rng.randrange(3));xx+=2*r+.09
 for xx in (sx0+.25,sx0+.75,sx0+1.2):A.lathe(xx,2.3,FLOOR+.14,[(.17,0),(.17,.1),(.14,.12)],8,P['cheese'],top=True)
 # crates on the east wall, a small keg in the north-east corner
 crate(A,-1.0,-.52,FLOOR,FLOOR+.5,1.2,1.8,P['crate'],P['batten']);crate(A,-1.0,-.52,FLOOR,FLOOR+.5,1.85,2.45,P['crate'][::-1],P['batten'])
 crate(A,-.98,-.54,FLOOR+.5,FLOOR+.95,1.4,2.0,P['crate'][1:],P['batten'])
 barrel(A,-.78,-1.2,FLOOR,.2,.5,staves,P['iron'],P['lid'],rng)
 # a lantern on a wall bracket (south wall, above the shelves' east end, clear of every walk tile)
 lantern(A,-2.5,2.3,FLOOR+1.55,P['iron'],P['glass']);A.box(-2.53,-2.47,FLOOR+1.85,FLOOR+1.91,2.3,2.5,P['iron'])
 # cobwebs: radial strands and two sagging rings in the north-east and south-west top corners
 for cx,cz,sx,sz in ((x1,z0,-1,1),(x0,z1,1,-1)):
  y=-.47;pts=[(cx+sx*.55,y,cz),(cx+sx*.4,y-.3,cz+sz*.25),(cx+sx*.2,y-.45,cz+sz*.4),(cx,y,cz+sz*.55),(cx,y-.35,cz)]
  for p in pts:A.beam((cx,y,cz),p,.006,.006,web)
  for f in (.45,.8):
   ring=[(cx+(p[0]-cx)*f,y+(p[1]-y)*f-.03,cz+(p[2]-cz)*f) for p in pts]
   for a,b in zip(ring,ring[1:]):A.beam(a,b,.005,.005,web)
 A.build(root)
 # ---- the hatch in the ground floor: frame and lid (single-material meshes, so extras land on the mesh)
 fm=P['hatchframe'];H=Acc('CellarHatch')
 H.box(FRAME[0],FRAME[1],TOPY,0,FRAME[2],OPEN[2],fm);H.box(FRAME[0],FRAME[1],TOPY,0,OPEN[3],FRAME[3],fm)
 H.box(FRAME[0],OPEN[0],TOPY,0,OPEN[2],OPEN[3],fm);H.box(OPEN[1],FRAME[1],TOPY,0,OPEN[2],OPEN[3],fm)
 h=H.build(root);h['kind']='arrival_hatch';h['arrivalHatch']='cellar'
 lx0,lx1,lz0,lz1=LID;hy=.045
 Lid=Acc('CellarHatchLid');n=4;w=(lz1-lz0)/n
 for i in range(n):Lid.box(0,lx1-lx0,0,hy,lz0+i*w+.004,lz0+(i+1)*w-.004,P['hatch'])
 for zz in (lz0+.14,lz1-.14):Lid.box(.08,lx1-lx0-.08,-.035,0,zz-.05,zz+.05,P['hatch'])
 Lid.beam((.12,-.018,lz0+.2),(lx1-lx0-.12,-.018,lz1-.2),.07,.034,P['hatch'])
 lid=Lid.build(root)
 # the lid is authored relative to its hinge (x from the west edge, z about the lid's centre line): the object
 # origin sits on the hinge line at floor level, so a rotation about it swings the lid up and over to the west
 hz=(lz0+lz1)/2
 for v in lid.data.vertices:v.co.y+=hz
 lid.location=(lx0,-hz,0)
 lid['kind']='arrival_hatch';lid['arrivalHatch']='cellar'
 I=Acc('CellarHatchLidIron')
 for zz in (lz0+.14-hz,lz1-.14-hz):I.box(-.03,.32,hy,hy+.008,zz-.035,zz+.035,P['iron'])
 cx=(lx1-lx0)*.78;I.tube((cx-.07,hy+.012,0),(cx+.07,hy+.012,0),.012,6,P['iron'],caps=False)
 I.box(cx+.06,cx+.1,hy,hy+.02,-.02,.02,P['iron'])
 iron=I.build(lid)
 # opening clip: 100 degrees about the hinge (Blender -Y); three.js sees rotation.z 0 -> +1.745 rad
 for frame,ang in ((1,0),(25,-math.radians(100))):
  lid.rotation_euler=(0,ang,0);lid.keyframe_insert(data_path='rotation_euler',frame=frame)
 lid.animation_data.action.name='CellarHatchOpen';lid.rotation_euler=(0,0,0)
 return {'floorY':FLOOR,'room':ROOM,'opening':OPEN,'frame':FRAME}
