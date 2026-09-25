"""Guide house v3 interiors (owner feedback 2026-09-25: "just so plain", one colour, no intent).

Ground floor: oak wainscot, dado rail and cream limewash between dark studs on every wall, casings round the
doors, painted shutters folded open at the windows, a pale trestle chart table, a proper long table with
benches and a laid meal, a dresser, bookcase, chest, sideboard, window seat, barrels, crates, sacks, rugs,
herbs, a banner, a lantern and the cellar hatch. Upstairs: the same wall language (full-height linings, so the
room keeps its walls when the roof and upper shell are hidden), a bed with a patchwork quilt, wardrobe, writing
desk and chair, bookcase, chests, washstand and a sea-chest corner.

Placement rule: nothing but rugs and the flush hatch stands on a tile that has a navigation node, and nothing
comes within 0.45 of a node centre, so the compiled graph is unchanged (checked by the build: see
declared_blockers()). Coordinates are house-local plan (x east, y up, z south)."""
import bpy,math,random
from holm_interior_kit import (Acc,M,family,barrel,cask,crate,sack,jar,bowl,candle,lantern,books,log,rug,herbs)

PAL={}
def palette():
 if PAL:return PAL
 P=PAL
 P['oakdark']=M('Frame oak dark','#4a3322');P['oakdark2']=M('Frame oak shadow','#3c2919')
 P['wains']=family('Wainscot oak',['#6e4b2e','#7a5534','#654429'])
 P['wains_up']=family('Wainscot pine',['#94704a','#a07b52','#8a6742'])
 P['backing']=M('Board backing','#2f2217')
 P['plaster']=family('Limewash',['#d2c49e','#c9ba93','#beaf88'])
 P['plaster_up']=family('Limewash warm',['#d8c69b','#cdbb8f','#c2b084'])
 P['shutter']=family('Shutter green',['#4f6d5e','#587868','#46614f'])
 P['pine']=family('Table pine',['#b08a5c','#a37f52','#bb9666'])
 P['walnut']=M('Walnut legs','#5a3b24');P['iron']=M('Wrought iron','#343534');P['brass']=M('Warm brass','#b59546')
 P['pewter']=M('Pewter','#8d918f')
 P['staves']=family('Barrel stave',['#7b5635','#6c4a2e','#85603b']);P['lid']=M('Barrel head','#8d6a44')
 P['crate']=family('Crate board',['#9a7a52','#8a6b46','#a4845a']);P['batten']=M('Crate batten','#6a4c2f')
 P['sack']=family('Sackcloth',['#b8a476','#a8946a']);P['cord']=M('Hemp cord','#7a6440')
 P['books']=family('Book cloth',['#7a2e25','#2f4d6b','#3f5e37','#8a6a2a','#5a3a5e','#6b3b22'])
 P['pots']=[M('Terracotta','#a85f39'),M('Glazed green','#6f8a63'),M('Stoneware cream','#cbbd98'),M('Glazed blue','#52708f'),M('Glazed brown','#7a4a2a')]
 P['rugA']=[M('Rug madder','#8b3a2e'),M('Rug ochre','#c39a4a'),M('Rug indigo','#3d4b6c'),M('Rug cream','#dccaa0')]
 P['rugB']=[M('Runner cream','#cdbb90'),M('Runner indigo','#44557a'),M('Runner rust','#8e4430'),M('Runner moss','#5e7a45')]
 P['herbs']=family('Drying herbs',['#6f8f4a','#86a257','#8a7aa6','#a08a4a'])
 P['wax']=M('Candle wax','#efe6c8');P['flame']=M('Candle flame','#ffc15a',emit=1.5);P['glass']=M('Lantern glow','#ffd27a',emit=1.2)
 P['bread']=M('Bread crust','#c08a4a');P['cheese']=M('Cheese','#e2c25a');P['apple']=[M('Apple red','#b8392c'),M('Apple green','#8fae3e')]
 P['linen']=M('Cream linen','#e3d7b6');P['straw']=M('Straw mattress','#c8b07a');P['wool']=M('Brown wool','#7a5a3c')
 P['quilt']=[M('Quilt blue','#4d6788'),M('Quilt cream','#dccaa0'),M('Quilt moss','#5e7a45'),M('Quilt rust','#9a4a2e')]
 P['banner']=M('Banner red','#7c2a26');P['gold']=M('Banner gold','#c9a24a');P['cushion']=M('Cushion blue','#4d6788')
 P['paper']=M('Parchment','#d9c89a');P['ink']=M('Ink black','#1f1c1a');P['leaf']=family('Pot plant',['#4f7a3a','#62904a'])
 P['hatch']=M('Hatch oak','#6b4a2c');P['hatchframe']=M('Hatch frame oak','#4f3521')
 return P

# ------------------------------------------------------------------ wall linings
def lining(A,P,wall,face,inward,u0,u1,y0,height,openings,tones,wtones,studs_extra=(),core_to=None,rng=None):
 """Interior finish on one wall. wall 'x' = runs along x at z=face; 'z' = along z at x=face. inward = +1/-1
 toward the room. openings = [(a,b,v0,v1,kind)] in wall-local u/height; kind 'win'|'door'|'block'."""
 rng=rng or random.Random(face*100+u0)
 BACK={('x',-1):'s',('x',1):'n',('z',-1):'e',('z',1):'w'}[(wall,inward)];FRONT={'s':'n','n':'s','e':'w','w':'e'}[BACK]
 def bx(ua,ub,va,vb,d0,d1,m,skip=''):
  a,b=face+inward*d0,face+inward*d1
  skip=skip.replace('K',BACK).replace('F',FRONT)
  if wall=='x':A.box(ua,ub,y0+va,y0+vb,a,b,m,skip)
  else:A.box(a,b,y0+va,y0+vb,ua,ub,m,skip)
 def spans(v0,v1,lo=u0,hi=u1):
  """u intervals of the band [v0,v1] not cut by an opening."""
  cuts=sorted((o[0],o[1]) for o in openings if o[2]<v1 and o[3]>v0)
  out=[];p=lo
  for a,b in cuts:
   if a>p:out.append((p,min(a,hi)))
   p=max(p,b)
  if p<hi:out.append((p,hi))
  return [(a,b) for a,b in out if b-a>.02]
 # thick core (upper storey: the room keeps a wall when the shell is hidden)
 if core_to is not None:
  big=[(o[0]-.012,o[1]+.012,o[2]-.012,o[3]+.012)+tuple(o[4:]) for o in openings]
  edges=sorted(set([0,height]+[min(height,max(0,v)) for o in big for v in (o[2],o[3])]))
  for va,vb in zip(edges,edges[1:]):
   cuts=sorted((o[0],o[1]) for o in big if o[2]<vb-1e-6 and o[3]>va+1e-6);p=u0
   for a,b in cuts+[(u1,u1)]:
    if a>p+.02:bx(p,a,va,vb,-core_to,-.005,tones[1],skip='F')
    p=max(p,b)
 # studs positions: ends, opening edges, and no bay wider than ~1.7
 posts=[u0+.07,u1-.07]+[p for o in openings if o[4]!='block' for p in (o[0]-.07,o[1]+.07)]+list(studs_extra)
 posts=sorted(p for p in posts if u0<p<u1)
 full=sorted(set(posts));extra=[]
 for a,b in zip(full,full[1:]):
  n=int((b-a)/1.7)
  for i in range(n):extra.append(a+(b-a)*(i+1)/(n+1))
 posts=sorted(full+extra)
 shut=[]
 for o in openings:
  if o[4]=='win':
   for side in o[5] if len(o)>5 else 'LR':
    shut.append((o[0]-.86,o[0]-.14) if side=='L' else (o[1]+.14,o[1]+.86))
 posts=[p for p in posts if not any(a-.08<p<b+.08 for a,b in shut) or any(abs(p-(o[0]-.07))<.01 or abs(p-(o[1]+.07))<.01 for o in openings)]
 # plaster panels between posts, three related tones
 for a,b in spans(.86,height-.18):
  cuts=[a]+[p for p in posts if a+.1<p<b-.1]+[b]
  for p,q in zip(cuts,cuts[1:]):
   edges=sorted(set([.86,height-.18]+[v for o in openings if o[0]<(p+q)/2<o[1] for v in (o[2],o[3])]))
   for va,vb in zip(edges,edges[1:]):
    if any(o[0]<(p+q)/2<o[1] and o[2]<(va+vb)/2<o[3] for o in openings):continue
    bx(p,q,va,vb,0,.02,tones[rng.randrange(3)],skip='K')
 # wainscot: dark backing with boards, skirting, dado rail, top plate
 for a,b in spans(.14,.78):
  bx(a,b,.14,.78,0,.012,P['backing'],skip='Kbt');u=a
  while u<b-.03:
   w=min(b,u+rng.uniform(.3,.4));bx(u+.005,w-.005,.14,.78,.012,.032,wtones[rng.randrange(3)],skip='btK');u=w
 for a,b in spans(0,.14):bx(a,b,0,.14,0,.045,P['oakdark'],skip='bK')
 for a,b in spans(.78,.86):bx(a-.01,b+.01,.78,.86,0,.055,P['oakdark'])
 for a,b in spans(height-.18,height):bx(a,b,height-.18,height,0,.07,P['oakdark2'])
 for p in posts:
  segs=[(.86,height-.18)]
  for o in openings:
   if o[0]-.005<p<o[1]+.005:
    nxt=[]
    for a,b in segs:
     if b<=o[2] or a>=o[3]:nxt.append((a,b));continue
     if a<o[2]:nxt.append((a,o[2]))
     if b>o[3]:nxt.append((o[3],b))
    segs=nxt
  for a,b in segs:
   if b-a>.05:bx(p-.07,p+.07,a,b,0,.045,P['oakdark'],skip='Kbt')
 # casings, lintels, shutters
 for o in openings:
  a,b,v0,v1,kind=o[:5]
  if kind=='block':continue
  bx(a-.14,b+.14,v1,v1+.14,0,.06,P['oakdark2'])
  if kind=='door':
   for p in (a-.07,b+.07):bx(p-.07,p+.07,0,v1,0,.06,P['oakdark'])
  if kind=='win':
   bx(a-.06,b+.06,v0-.07,v0,0,.09,P['oakdark'])
   for side in o[5] if len(o)>5 else 'LR':
    s0,s1=(a-.84,a-.16) if side=='L' else (b+.16,b+.84);w=(s1-s0)/3
    for i in range(3):bx(s0+i*w+.004,s0+(i+1)*w-.004,v0+.03,v1-.03,.05,.085,P['shutter'][i%3])
    for vv in (v0+.2,v1-.25):bx(s0+.03,s1-.03,vv,vv+.07,.085,.105,P['shutter'][2])
    hx=s1 if side=='L' else s0
    for vv in (v0+.12,v1-.17):bx(hx-.1 if side=='L' else hx,hx if side=='L' else hx+.1,vv,vv+.035,.07,.11,P['iron'])

def ground_walls(P,holes_door=2.0):
 rng=random.Random(2509);A=Acc('GroundFurnishingWalls');H=2.78;d=holes_door/2
 win=lambda a,b,sides='LR':(a,b,1.0,2.15,'win',sides)
 lining(A,P,'x',4.825,-1,-5.825,5.825,0,H,[win(-4.5,-3.1),win(2.3,3.7,'R'),(-d,d,0,2.3,'door')],P['plaster'],P['wains'],rng=rng)
 lining(A,P,'x',-4.825,1,-5.825,5.825,0,H,[win(-4.5,-3.1,'L'),win(2.3,3.7),(-d,d,0,2.3,'door')],P['plaster'],P['wains'],rng=rng)
 lining(A,P,'z',5.825,-1,-4.825,4.825,0,H,[win(-3.7,-2.3),win(1.7,3.1)],P['plaster'],P['wains'],rng=rng)
 lining(A,P,'z',-5.825,1,-4.825,4.825,0,H,[win(1.7,3.1),(-3.8,-2.0,0,H,'block')],P['plaster'],P['wains'],rng=rng)
 return A

def upper_walls(P,XE,ZN,y0):
 rng=random.Random(2510);A=Acc('UpperFurnishingWalls');H=2.6
 win=lambda a,b,sides='LR':(a,b,1.0,2.3,'win',sides)
 xw,xe=-5.825,XE-.175;zn,zs=ZN+.175,4.825
 lining(A,P,'x',zs,-1,xw,xe,y0,H,[win(-4.5,-3.1),win(2.3,3.7)],P['plaster_up'],P['wains_up'],core_to=.345,rng=rng)
 lining(A,P,'x',zn,1,xw,xe,y0,H,[win(-4.5,-3.1,'L'),win(2.3,3.7)],P['plaster_up'],P['wains_up'],core_to=.345,rng=rng)
 lining(A,P,'z',xe,-1,zn,zs,y0,H,[win(-3.7,-2.3),win(1.7,3.1)],P['plaster_up'],P['wains_up'],core_to=.345,rng=rng)
 lining(A,P,'z',xw,1,zn,zs,y0,H,[win(1.7,3.1)],P['plaster_up'],P['wains_up'],core_to=.345,rng=rng)
 # window reveals read as windows upstairs: inner frame, mullion and a deep sill board
 for wall,face,inward,wl in (('x',zs,-1,[(-4.5,-3.1),(2.3,3.7)]),('x',zn,1,[(-4.5,-3.1),(2.3,3.7)]),('z',xe,-1,[(-3.7,-2.3),(1.7,3.1)]),('z',xw,1,[(1.7,3.1)])):
  for a,b in wl:
   for (ua,ub,va,vb,d0,d1,m) in [(a+.002,a+.08,1.002,2.298,-.1,.03,P['oakdark']),(b-.08,b-.002,1.002,2.298,-.1,.03,P['oakdark']),((a+b)/2-.035,(a+b)/2+.035,1.0,2.3,-.2,-.12,P['oakdark']),
                                 (a+.002,b-.002,2.2,2.298,-.1,.03,P['oakdark'])]:
    p0,p1=face+inward*d0,face+inward*d1
    if wall=='x':A.box(ua,ub,y0+va,y0+vb,p0,p1,m)
    else:A.box(p0,p1,y0+va,y0+vb,ua,ub,m)
 return A

# ------------------------------------------------------------------ tables, seats, storage
def trestle_table(A,P,x,z,y,w,d,top_tones,legs):
 """Plank top on two trestle ends joined by a through-stretcher with wedges."""
 n=4 if d>1.2 else 3;pw=d/n
 for i in range(n):A.box(x-w/2,x+w/2,y+.76,y+.82,z-d/2+i*pw+.004,z-d/2+(i+1)*pw-.004,top_tones[i%len(top_tones)],skip='')
 A.box(x-w/2+.08,x+w/2-.08,y+.72,y+.76,z-d/2+.08,z-d/2+.14,legs);A.box(x-w/2+.08,x+w/2-.08,y+.72,y+.76,z+d/2-.14,z+d/2-.08,legs)
 for dx in (-w*.36,w*.36):
  A.box(x+dx-.06,x+dx+.06,y+.66,y+.72,z-d/2+.1,z+d/2-.1,legs)
  for s in (-1,1):A.beam((x+dx,y+.05,z+s*d*.36),(x+dx,y+.68,z+s*d*.12),.1,.1,legs)
  A.box(x+dx-.07,x+dx+.07,y,y+.08,z-d*.43,z+d*.43,legs)
 A.box(x-w*.36-.1,x+w*.36+.1,y+.26,y+.36,z-.05,z+.05,legs)
 for s in (-1,1):A.box(x+s*(w*.36+.1)-.02,x+s*(w*.36+.1)+.02,y+.22,y+.4,z-.03,z+.03,P['oakdark'])
def bench(A,P,x,z,y,w,d,top,legs,h=.46):
 A.box(x-w/2,x+w/2,y+h-.05,y+h,z-d/2,z+d/2,top)
 for dx in (-w/2+.15,w/2-.15):
  for dz in (-d/2+.07,d/2-.07):A.beam((x+dx*1.02,y,z+dz*1.1),(x+dx,y+h-.05,z+dz*.8),.06,.06,legs)
 A.box(x-w/2+.15,x+w/2-.15,y+.15,y+.2,z-.02,z+.02,legs)
def chair(A,P,x,z,y,rot,seat,frame,cushion=None):
 c,s=math.cos(rot),math.sin(rot)
 def T(a,yy,b):return (x+a*c+b*s,yy,z-a*s+b*c)
 A.rbox(x,z,.46,.44,y+.42,y+.47,rot,seat)
 if cushion:A.rbox(x,z+0,.4,.38,y+.47,y+.51,rot,cushion)
 for a in (-.19,.19):
  for b in (-.18,.18):A.beam(T(a,y,b),T(a,y+.42,b),.045,.045,frame)
  A.beam(T(a,y+.42,-.19),T(a*1.05,y+1.0,-.23),.05,.05,frame)
 for yy in (.62,.8,.96):A.beam(T(-.19,y+yy,-.2-(yy-.42)*.07),T(.19,y+yy,-.2-(yy-.42)*.07),.04,.03 if yy<.9 else .05,frame)
 A.beam(T(-.19,y+.14,.18),T(.19,y+.14,.18),.03,.03,frame);A.beam(T(-.19,y+.14,-.18),T(.19,y+.14,-.18),.03,.03,frame)
def chest(A,P,x0,x1,z0,z1,y,h,wood,band,lidtone=None):
 A.box(x0,x1,y,y+h*.72,z0,z1,wood,skip='b');A.box(x0-.015,x1+.015,y+h*.72,y+h,z0-.015,z1+.015,lidtone or wood)
 L=(x1-x0)>(z1-z0)
 for t in (.18,.82):
  if L:p=x0+(x1-x0)*t;A.box(p-.03,p+.03,y,y+h+.005,z0-.02,z1+.02,band)
  else:p=z0+(z1-z0)*t;A.box(x0-.02,x1+.02,y,y+h+.005,p-.03,p+.03,band)
 if L:A.box((x0+x1)/2-.04,(x0+x1)/2+.04,y+h*.55,y+h*.78,z1+.012,z1+.03,P['brass'])
 else:A.box(x1+.012,x1+.03,y+h*.55,y+h*.78,(z0+z1)/2-.04,(z0+z1)/2+.04,P['brass'])
def shelf_unit(A,P,x0,x1,z0,z1,y,levels,carcass,back,axis='x'):
 """Open shelving against a wall: sides, back, shelves at the given heights. axis = the run direction."""
 if axis=='x':
  A.box(x0,x1,y,y+levels[-1]+.04,z0,z0+.02 if z0<z1 else z0-.02,back)
  for xx in (x0,x1-.04):A.box(xx,xx+.04,y,y+levels[-1]+.04,z0,z1,carcass)
  for l in levels:A.box(x0+.04,x1-.04,y+l,y+l+.035,z0,z1,carcass)
 else:
  A.box(x0,x0+.02,y,y+levels[-1]+.04,z0,z1,back)
  for zz in (z0,z1-.04):A.box(x0,x1,y,y+levels[-1]+.04,zz,zz+.04,carcass)
  for l in levels:A.box(x0,x1,y+l,y+l+.035,z0+.04,z1-.04,carcass)

def ground(B,P):
 rng=random.Random(9251);A=Acc('GroundFurnishing');y=0.0
 # chart table (the relief chart sits on it, built by holm_relief_chart)
 trestle_table(A,P,-2.5,-1.6,0,2.0,1.4,P['pine'],P['walnut'])
 # long table with benches and a laid meal
 trestle_table(A,P,-2.5,2.0,0,2.4,1.4,P['pine'][::-1],P['walnut'])
 for s in (-1,1):bench(A,P,-2.5,2.0+s*1.08,0,1.9,.36,P['pine'][2],P['walnut'])
 A.box(-3.2,-1.8,.82,.826,1.65,2.35,P['linen'])
 A.box(-2.75,-2.35,.826,.85,1.85,2.15,P['wains'][1]);A.lathe(-2.55,2.0,.85,[(.1,0),(.12,.06),(.09,.12),(0,.15)],8,P['bread'],top=False)
 A.rbox(-2.2,1.98,.12,.08,.826,.87,.4,P['cheese'])
 for x,z in ((-3.3,1.6),(-1.7,2.4)):bowl(A,x,z,.82,.11,P['pots'][2],inner=P['pots'][4])
 for x,z,c in ((-3.3,1.6,0),(-3.25,1.58,1),(-1.7,2.4,0)):A.lathe(x+rng.uniform(-.03,.03),z+rng.uniform(-.03,.03),.87,[(.03,0),(.04,.03),(0,.06)],6,P['apple'][c],top=False)
 for x,z in ((-3.0,2.45),(-2.0,1.55)):A.lathe(x,z,.82,[(.05,0),(.055,.14),(.058,.15)],8,P['pewter'],top=True)
 jar(A,-1.55,1.8,.82,.08,.24,P['pots'][0],style=2);candle(A,-2.5,1.62,.826,P['wax'],P['flame'],holder=P['brass'])
 # rugs: a patterned rug under the long table, an indigo runner from door to door
 rug(A,-4.05,-0.95,.45,3.55,0,P['rugA'][0],P['rugA'][3],[P['rugA'][2],P['rugA'][1],P['rugA'][2]],m_fringe=P['rugA'][1])
 rug(A,-.62,.62,-3.45,3.45,0,P['rugB'][0],P['rugB'][1],[P['rugB'][2],P['rugB'][0],P['rugB'][2]],m_fringe=P['rugB'][0],band=.1)
 # north wall: chest under the west window, dresser, water jar, barrels under the landing
 chest(A,P,-4.3,-3.25,-4.76,-4.25,0,.56,P['staves'][2],P['iron'],P['staves'][0])
 lantern(A,-3.55,-4.5,.565,P['iron'],P['glass'])
 x0,x1,z0,z1=-2.22,-1.2,-4.78,-4.34
 A.box(x0,x1,0,.82,z0,z1,P['wains'][0]);A.box(x0-.02,x1+.02,.82,.86,z0,z1+.03,P['pine'][0])
 for i,(a,b) in enumerate(((x0+.04,(x0+x1)/2-.01),((x0+x1)/2+.01,x1-.04))):
  A.box(a,b,.08,.76,z1,z1+.02,P['wains'][1+i]);A.box(b-.08 if i==0 else a+.04,b-.04 if i==0 else a+.08,.4,.46,z1+.02,z1+.04,P['brass'])
 shelf_unit(A,P,x0,x1,z0,z0+.26,.86,[.0,.4,.8,1.16],P['wains'][0],P['backing'])
 for i,xx in enumerate((x0+.14,x0+.38,x0+.64,x0+.88)):
  A.tube((xx,.86+.04+.12,z0+.08),(xx,.86+.04+.12,z0+.1),.11,8,P['pots'][[2,3,2,3][i]])
 for i,xx in enumerate((x0+.12,x0+.3,x0+.5,x0+.72,x0+.9)):jar(A,xx,z0+.14,.86+.435,.055,.13+.04*(i%2),P['pots'][i%5],style=i%3)
 books(A,x0+.06,x1-.06,.86+.835,z0+.04,z0+.24,'x',P['books'],rng)
 A.lathe(3.3,-4.45,0,[(.16,0),(.22,.2),(.2,.5),(.12,.6),(.14,.66)],8,P['pots'][0],top=True,top_m=P['pots'][4])
 A.lathe(2.95,-4.55,0,[(.12,0),(.15,.26),(.15,.28)],8,P['staves'][1],top=True,top_m=P['lid'])
 barrel(A,4.42,-4.45,0,.3,.86,P['staves'],P['iron'],P['lid'],rng)
 barrel(A,5.16,-4.42,0,.3,.9,P['staves'],P['iron'],P['lid'],rng)
 sack(A,4.8,-4.2,0,.36,.5,P['sack'][0],P['cord'],rot=.4)
 # east wall beside and under the stair: crates, barrel, sacks
 crate(A,5.15,5.75,0,.5,-3.05,-2.45,P['crate'],P['batten']);crate(A,5.2,5.7,.5,.9,-3.0,-2.5,P['crate'][::-1],P['batten'])
 crate(A,3.6,4.3,0,.62,-1.85,-1.2,P['crate'],P['batten']);crate(A,3.65,4.2,.62,1.12,-1.8,-1.3,P['crate'][1:],P['batten'])
 barrel(A,4.25,-.62,0,.3,.82,P['staves'],P['iron'],P['lid'],rng)
 sack(A,4.55,.22,0,.4,.52,P['sack'][1],P['cord']);sack(A,3.95,.35,0,.36,.46,P['sack'][0],P['cord'],rot=1.1)
 lantern(A,5.66,3.45,1.62,P['iron'],P['glass']);A.box(5.7,5.8,1.6,1.66,3.42,3.48,P['iron'])
 # south wall: sideboard with basin and jug under the west window, herbs drying above it, banner, lantern by the door
 A.box(-4.55,-3.05,0,.72,4.3,4.78,P['wains'][2]);A.box(-4.58,-3.02,.72,.77,4.27,4.79,P['pine'][1])
 for i,(a,b) in enumerate(((-4.5,-3.82),(-3.78,-3.1))):A.box(a,b,.1,.64,4.28,4.3,P['wains'][i]);A.box((a+b)/2-.03,(a+b)/2+.03,.36,.42,4.26,4.28,P['brass'])
 bowl(A,-4.05,4.52,.77,.17,P['pots'][2],inner=P['pots'][3]);jar(A,-3.45,4.55,.77,.08,.28,P['pots'][3],style=2)
 A.box(-4.65,-2.95,2.22,2.26,4.5,4.54,P['oakdark']);A.box(-4.62,-4.58,2.1,2.26,4.54,4.78,P['iron']);A.box(-3.02,-2.98,2.1,2.26,4.54,4.78,P['iron'])
 herbs(A,-3.8,4.52,2.22,P['herbs'],P['cord'],rng,n=6,span=1.4)
 bx0,bx1=-2.1,-1.42
 A.box(bx0-.05,bx1+.05,2.38,2.42,4.71,4.75,P['oakdark'])
 A.poly([(bx0,2.38,4.74),(bx1,2.38,4.74),(bx1,1.32,4.74),((bx0+bx1)/2,1.18,4.74),(bx0,1.32,4.74)],[(0,1,2,3,4)],P['banner'])
 cx=(bx0+bx1)/2
 A.poly([(cx-.1,1.95,4.735),(cx+.1,1.95,4.735),(cx+.07,1.62,4.735),(cx-.07,1.62,4.735)],[(0,1,2,3)],P['gold'])
 A.poly([(cx-.05,2.02,4.735),(cx+.05,2.02,4.735),(cx,2.12,4.735)],[(0,1,2)],P['gold'])
 A.box(cx-.13,cx+.13,1.5,1.55,4.735,4.74,P['gold']);A.box(cx-.13,cx+.13,2.2,2.24,4.735,4.74,P['gold'])
 lantern(A,1.36,4.55,1.7,P['iron'],P['glass']);A.box(1.33,1.39,1.66,1.72,4.55,4.78,P['iron'])
 crate(A,2.45,3.1,0,.55,4.15,4.75,P['crate'],P['batten']);barrel(A,3.45,4.47,0,.26,.62,P['staves'],P['iron'],P['lid'],rng)
 A.lathe(5.3,4.4,0,[(.12,0),(.17,.26),(.18,.3)],8,P['pots'][0],top=True,top_m=P['wool'])
 for i in range(6):
  a=i*1.05;A.poly([(5.3,.3,4.4),(5.3+math.cos(a)*.34,.62+.1*(i%2),4.4+math.sin(a)*.34),(5.3+math.cos(a+.35)*.18,.5,4.4+math.sin(a+.35)*.18)],[(0,1,2)],P['leaf'][i%2])
 # south-west corner: tall water urn and a broom
 A.lathe(-5.35,4.3,0,[(.18,0),(.26,.3),(.24,.6),(.14,.72),(.16,.78)],8,P['pots'][4],top=True,top_m=P['pots'][0])
 A.beam((-5.72,.05,4.62),(-5.6,1.45,4.72),.035,.035,P['wains'][1]);A.lathe(-5.72,4.62,0,[(.1,0),(.06,.3),(.035,.36)],6,P['straw'],top=True)
 # west wall: fire-side chair, bookcase, window seat
 chair(A,P,-4.52,-1.42,0,2.35,P['pine'][1],P['walnut'],cushion=P['cushion'])
 shelf_unit(A,P,-5.8,-5.36,-.9,.75,0,[.12,.58,1.04,1.5,1.96],P['wains'][0],P['backing'],axis='z')
 for l in (.12,.58,1.04,1.5):books(A,-5.76,-5.4,l+.035,-.85,.7,'z',P['books'],rng,hmax=.34)
 A.box(-5.8,-5.36,0,.12,-.9,.75,P['wains'][2])
 A.box(-5.8,-5.35,0,.4,1.75,3.05,P['wains'][1]);A.box(-5.82,-5.3,.4,.45,1.72,3.08,P['pine'][0]);A.box(-5.78,-5.36,.45,.53,1.8,3.0,P['cushion'])
 # the cellar hatch frame is built by the cellar module; nothing here stands on it
 return A

def upper(B,P,XE,ZN):
 rng=random.Random(9252);A=Acc('UpperFurnishing');y=2.8;L=B['LAYOUT']
 # stair-well guarding, as v1/v2 (navigation adds its own rail blockers)
 for x in [3.42,5.08]:
  for z in [L['stairs']['endZ']+i*(L['stairs']['startZ']+.05-L['stairs']['endZ'])/4 for i in range(5)]:A.beam((x,2.8,z),(x,3.73,z),.1,.1,P['oakdark'])
  A.beam((x,3.73,L['stairs']['endZ']),(x,3.73,L['stairs']['startZ']+.05),.12,.12,P['oakdark'])
 A.beam((3.42,3.73,L['stairs']['startZ']+.05),(5.08,3.73,L['stairs']['startZ']+.05),.12,.12,P['oakdark'])
 # bed (envelope x -4.365..-2.635, z 0.85..3.465): posts, headboard, footboard, straw mattress, patchwork quilt
 bx,bz,bw,bd=-3.5,2.2,1.6,2.4;x0,x1,z0,z1=bx-bw/2,bx+bw/2,bz-bd/2,bz+bd/2
 A.box(x0+.06,x1-.06,y+.24,y+.4,z0+.06,z1-.06,P['walnut'])
 for xx in (x0,x1-.08):A.box(xx,xx+.08,y+.2,y+.36,z0,z1,P['wains_up'][0])
 for xx in (x0+.02,x1-.02):
  for zz,h in ((z0+.04,1.12),(z1-.04,.72)):A.box(xx-.045,xx+.045,y,y+h,zz-.045,zz+.045,P['wains_up'][1])
 for i in range(4):A.box(x0+.08+i*(bw-.16)/4+.01,x0+.08+(i+1)*(bw-.16)/4-.01,y+.36,y+1.02,z0,z0+.06,P['wains_up'][i%3])
 A.box(x0,x1,y+1.02,y+1.08,z0-.02,z0+.08,P['oakdark']);A.box(x0,x1,y+.36,y+.64,z1-.06,z1,P['wains_up'][2]);A.box(x0,x1,y+.64,y+.69,z1-.08,z1+.01,P['oakdark'])
 A.box(x0+.08,x1-.08,y+.4,y+.56,z0+.08,z1-.08,P['straw'])
 A.box(x0+.18,x1-.18,y+.56,y+.68,z0+.12,z0+.5,P['linen'])
 cols,rows=4,5;qx0,qx1,qz0,qz1=x0+.05,x1-.05,z0+.55,z1-.08;cw,rh=(qx1-qx0)/cols,(qz1-qz0)/rows
 for i in range(cols):
  for j in range(rows):A.box(qx0+i*cw,qx0+(i+1)*cw,y+.56,y+.61,qz0+j*rh,qz0+(j+1)*rh,P['quilt'][(i+2*j)%4],skip='b')
 for s in (-1,1):A.box(x1-.02 if s>0 else x0-.03,x1+.03 if s>0 else x0+.02,y+.3,y+.61,qz0,qz1,P['quilt'][0])
 A.box(qx0,qx1,y+.61,y+.66,qz0,qz0+.18,P['linen'])
 # bedside table with candle and book; clothes chest at the foot; rug beside the bed
 A.box(-4.98,-4.5,y+.55,y+.6,.95,1.45,P['pine'][0])
 for xx in (-4.95,-4.57):
  for zz in (.98,1.38):A.box(xx,xx+.04,y,y+.55,zz,zz+.04,P['walnut'])
 A.box(-4.95,-4.53,y+.2,y+.23,.98,1.42,P['pine'][1]);candle(A,-4.66,1.1,y+.6,P['wax'],P['flame'],holder=P['brass'])
 A.box(-4.9,-4.68,y+.6,y+.64,1.22,1.4,P['books'][1])
 chest(A,P,-4.2,-2.95,4.15,4.72,y,.52,P['wains_up'][2],P['iron'],P['wains_up'][0])
 rug(A,-2.45,-.75,1.0,3.1,y,P['rugB'][2],P['rugB'][0],[P['rugB'][1],P['rugB'][3],P['rugB'][1]],m_fringe=P['rugB'][0])
 # wardrobe where the old internal flue stood (its 'flue' envelope is unchanged)
 wx0,wx1,wz0,wz1=-5.8,-5.22,-3.48,-2.3
 A.box(wx0,wx1,y+.08,y+2.05,wz0,wz1,P['wains'][0]);A.box(wx0,wx1+.04,y+2.05,y+2.14,wz0-.04,wz1+.04,P['oakdark']);A.box(wx0,wx1+.02,y,y+.08,wz0,wz1,P['oakdark'])
 for i,(a,b) in enumerate(((wz0+.04,(wz0+wz1)/2-.01),((wz0+wz1)/2+.01,wz1-.04))):
  A.box(wx1,wx1+.025,y+.14,y+1.98,a,b,P['wains'][1+i]);A.box(wx1+.025,wx1+.04,y+1.0,y+1.14,(b-.06) if i==0 else a+.02,(b-.02) if i==0 else a+.06,P['brass'])
  A.box(wx1+.02,wx1+.035,y+.3,y+.9,a+.08,b-.08,P['wains'][2]);A.box(wx1+.02,wx1+.035,y+1.2,y+1.85,a+.08,b-.08,P['wains'][2])
 # study: writing desk (envelope x -3.5..-1.5, z -3.4..-2.2), chair on the free tile north of it
 dx0,dx1,dz0,dz1=-3.45,-1.55,-3.35,-2.25
 A.box(dx0,dx1,y+.74,y+.8,dz0,dz1,P['pine'][2]);A.box(dx0+.05,dx0+.6,y+.08,y+.74,dz0+.05,dz1-.05,P['walnut'])
 for j in range(3):A.box(dx0+.6,dx0+.62,y+.12+j*.21,y+.3+j*.21,dz0+.1,dz1-.1,P['wains'][j]);A.box(dx0+.62,dx0+.64,y+.19+j*.21,y+.23+j*.21,(dz0+dz1)/2-.04,(dz0+dz1)/2+.04,P['brass'])
 for xx in (dx1-.1,):
  for zz in (dz0+.04,dz1-.1):A.box(xx,xx+.06,y,y+.74,zz,zz+.06,P['walnut'])
 A.box(dx0,dx1,y,y+.06,dz0+.04,dz0+.1,P['walnut'])
 bx0=-2.7;A.poly([(bx0-.3,y+.81,-3.05),(bx0,y+.84,-3.05),(bx0+.3,y+.81,-3.05),(bx0-.3,y+.81,-2.65),(bx0,y+.84,-2.65),(bx0+.3,y+.81,-2.65)],[(0,1,4,3),(1,2,5,4)],P['paper'])
 A.box(bx0-.32,bx0+.32,y+.8,y+.81,-3.07,-2.63,P['books'][0])
 A.lathe(-2.15,-2.5,y+.8,[(.04,0),(.045,.05),(.025,.06)],6,P['ink'],top=True);A.beam((-2.15,y+.84,-2.5),(-2.05,y+1.0,-2.62),.012,.006,P['linen'])
 candle(A,-1.8,-3.1,y+.8,P['wax'],P['flame'],holder=P['brass'])
 books(A,-3.4,-3.12,y+.8,-3.3,-3.1,'x',P['books'],rng,hmin=.05,hmax=.07)
 A.tube((-2.1,y+.83,-3.2),(-1.75,y+.83,-3.15),.03,6,P['paper'],cap_m=P['paper'])
 chair(A,P,-2.55,-3.75,y,math.pi,P['pine'][1],P['walnut'])
 # north wall: bookcase and a map chest; north-east jetty corner: crates, rope, oars
 shelf_unit(A,P,-1.4,.2,-5.25,-4.87,y,[.1,.52,.94,1.36,1.8],P['wains'][0],P['backing'])
 for l in (.1,.52,.94,1.36):books(A,-1.36,.16,y+l+.035,-5.23,-4.9,'x',P['books'],rng,hmax=.34)
 for i,xx in enumerate((-1.2,-.4,.05)):jar(A,xx,-5.05,y+1.835,.06,.14,P['pots'][i+1],style=i%3)
 chest(A,P,.6,1.8,-5.2,-4.62,y,.5,P['staves'][0],P['iron'],P['staves'][2])
 crate(A,5.25,5.95,y,y+.45,-5.2,-4.6,P['crate'],P['batten']);crate(A,5.3,5.9,y+.45,y+.9,-5.15,-4.65,P['crate'][::-1],P['batten'])
 crate(A,5.4,6.1,y,y+.45,-4.5,-3.95,P['crate'][1:],P['batten'])
 A.lathe(5.75,-3.6,y,[(.2,0),(.2,.06),(.12,.06),(.2,.09),(.2,.14)],10,P['cord'],top=True,top_m=P['sack'][0])
 for dz in (-.1,.1):A.beam((6.2,y,-3.2+dz),(6.12,y+1.7,-3.3+dz),.05,.03,P['wains_up'][1]);A.box(6.08,6.22,y+.02,y+.5,-3.25+dz,-3.15+dz,P['wains_up'][0])
 # east of the stair well: sea chest, barrel of rolled charts, hanging net
 chest(A,P,5.35,6.05,-1.45,-.55,y,.5,P['staves'][1],P['iron'],P['staves'][0])
 barrel(A,5.8,.8,y,.28,.72,P['staves'],P['iron'],P['lid'],rng)
 for i in range(5):
  a=i*1.3;A.tube((5.8+math.cos(a)*.1,y+.5,.8+math.sin(a)*.1),(5.8+math.cos(a)*.12,y+.98+.05*(i%2),.8+math.sin(a)*.12),.035,6,P['paper'],cap_m=P['linen'])
 # south wall: washstand with basin and jug, pegs with a cloak and hat
 A.box(.2,1.0,y+.72,y+.77,4.3,4.78,P['pine'][0])
 for xx in (.22,.94):
  for zz in (4.32,4.72):A.box(xx,xx+.05,y,y+.72,zz-.02,zz+.03,P['walnut'])
 A.box(.25,.95,y+.2,y+.24,4.32,4.76,P['pine'][1]);bowl(A,.52,4.55,y+.77,.18,P['pots'][2],inner=P['pots'][3]);jar(A,.84,4.58,y+.77,.08,.3,P['pots'][2],style=2)
 A.box(-1.75,-.85,y+1.62,y+1.7,4.74,4.79,P['oakdark'])
 for xx in (-1.6,-1.3,-1.0):A.beam((xx,y+1.66,4.74),(xx,y+1.72,4.6),.03,.03,P['oakdark'])
 A.poly([(-1.72,y+1.66,4.66),(-1.3,y+1.7,4.62),(-1.12,y+1.62,4.66),(-1.2,y+.7,4.7),(-1.78,y+.72,4.7)],[(0,1,2,3,4)],P['rugA'][2])
 A.poly([(-1.72,y+1.66,4.73),(-1.12,y+1.62,4.73),(-1.2,y+.7,4.76),(-1.78,y+.72,4.76)],[(0,1,2,3)],P['rugA'][2])
 A.lathe(-.98,4.62,y+1.52,[(.16,0),(.16,.02),(.08,.02),(.07,.14),(0,.15)],8,P['wool'],top=False)
 lantern(A,3.9,4.62,y+1.7,P['iron'],P['glass']);A.box(3.87,3.93,y+1.66,y+1.72,4.62,4.8,P['iron'])
 herbs(A,5.95,2.1,y+2.3,P['herbs'],P['cord'],rng,n=4,axis='z',span=.8);A.box(5.9,6.0,y+2.26,y+2.3,1.65,2.55,P['oakdark'])
 return A
