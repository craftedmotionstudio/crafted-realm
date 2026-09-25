"""Low-poly fire for Tutor's Holm hearths, ovens and campfires (owner 2026-09-25: "the fire looks like a couple of
pieces of paper").

A fire is three layered flame shells, each a ring of solid twisted tongues (5-sided lofts closing to a tip, never
flat cards): a wide red outer layer, an orange middle layer and a tall yellow core with a white-hot heart. Each
layer is its own object with its origin at the fire's base and its own looping flicker action (height pulse,
narrowing as it stretches, a twisting sway and a lean), all loops 36 frames (1.5 s at 24 fps) with harmonics that
are whole multiples of the loop so it repeats seamlessly; the layers run at different phases and rates, so the
colour balance of the fire keeps shifting. Underneath: an ash bed, glowing ember chips, logs with charred,
ember-ringed ends, and a flat glow pool (concentric bands, no transparency) on the ash and optionally a glow card on
the firebox back. Coordinates are plan space (x east, y up, z south); the kit maps them to Blender (x, -z, y).
Original design; nothing copied from any game's models.
"""
import bpy,bmesh,math,random
from mathutils import Vector
from holm_interior_kit import Acc,M

LOOP=36          # frames per flicker loop (24 fps -> 1.5 s)
def mats():
 return dict(
  red=M('Fire red','#d23a1c',emit=1.4),orange=M('Fire orange','#f7861f',emit=1.6),yellow=M('Fire yellow','#ffd24c',emit=1.8),
  white=M('Fire white heart','#fff1b8',emit=2.0),ember=M('Fire ember','#ff7424',emit=1.6),ember2=M('Fire ember deep','#c93518',emit=1.2),
  emberhot=M('Fire ember hot','#ffc048',emit=1.8),char=M('Fire charcoal','#241b16'),ash=M('Fire ash','#5b554e'),ash2=M('Fire ash dark','#3c3834'),
  bark=M('Fire log bark','#5a3d26'),bark2=M('Fire log bark dark','#46301f'),endg=M('Fire log end grain','#b8905c'),
  pool1=M('Fire glow pool hot','#f29a3c',emit=.9),pool2=M('Fire glow pool','#c8662e',emit=.6),pool3=M('Fire glow pool dim','#8a4a2a',emit=.35),
  wall1=M('Fire glow wall hot','#8e4024',emit=.35),wall2=M('Fire glow wall','#5e2d1d',emit=.2),wall3=M('Fire glow wall dim','#3b2419',emit=.1))

def _tongue(A,base,h,r,lean,twist,rng,m,n=5):
 """A solid flame tongue from base (plan xyz): rings shrink, drift along lean (dx,dz) with height, twist, then a tip."""
 rings=[(0,.86),(.24,1.0),(.52,.78),(.78,.42)];V=[];F=[]
 for t,s in rings:
  cx=base[0]+lean[0]*t*t*h;cz=base[2]+lean[1]*t*t*h;y=base[1]+t*h;rot=twist*t
  for i in range(n):
   a=rot+2*math.pi*i/n;rr=r*s*(1+.14*rng.uniform(-1,1))
   V.append((cx+rr*math.cos(a),y,cz+rr*math.sin(a)))
 V.append((base[0]+lean[0]*h*1.05,base[1]+h,base[2]+lean[1]*h*1.05))
 for k in range(len(rings)-1):
  for i in range(n):
   a=k*n+i;b=k*n+(i+1)%n;F.append((a,a+n,b+n,b))
 last=(len(rings)-1)*n;tip=len(V)-1
 for i in range(n):F.append((last+i,tip,last+(i+1)%n))
 F.append(tuple(range(n-1,-1,-1)))
 A.poly(V,F,m)

def _blob(A,c,s,rng,m):
 """A faceted chip (jittered octahedron) centred at c with half-sizes s."""
 x,y,z=c;V=[(x+s[0]*rng.uniform(.8,1.2),y,z),(x-s[0]*rng.uniform(.8,1.2),y,z),(x,y+s[1],z),(x,y-s[1]*.4,z),(x,y,z+s[2]*rng.uniform(.8,1.2)),(x,y,z-s[2]*rng.uniform(.8,1.2))]
 A.poly(V,[(0,2,4),(4,2,1),(1,2,5),(5,2,0),(4,3,0),(1,3,4),(5,3,1),(0,3,5)],m)

def _log(A,a,b,r,P,burn=.3,n=7):
 """A split log: bark from a toward b, the last `burn` fraction charred and thinner, with a glowing ember ring."""
 a,b=Vector(a),Vector(b);c=a+(b-a)*(1-burn);ring=a+(b-a)*(1-burn*.35)
 A.tube(tuple(a),tuple(c),r,n,P['bark'],caps=True,cap_m=P['endg'])
 A.tube(tuple(c),tuple(ring),r*.93,n,P['char'],caps=False)
 A.tube(tuple(ring),tuple(b),r*.85,n,P['ember2'],caps=True,cap_m=P['ember'])

def _bands(A,centre,axis,radii,mats,n=12,rot=0.0,squash=1.0,kx=1.0):
 """Concentric glow bands on a plane (non-overlapping annuli; the hottest band in the middle). axis 'y' lies on a
 floor, 'x' on a wall facing +x or -x (sign in radii[0] ignored)."""
 cx,cy,cz=centre
 def P(r,i):
  a=rot+2*math.pi*i/n;u,v=r*math.cos(a)*kx,r*math.sin(a)*squash
  return (cx+u,cy,cz+v) if axis=='y' else (cx,cy+v,cz+u)
 # inner fan
 A.poly([centre]+[P(radii[0],i) for i in range(n)],[(0,1+(i+1)%n,1+i) if axis=='y' else (0,1+i,1+(i+1)%n) for i in range(n)],mats[0])
 for j in range(1,len(radii)):
  ri,ro=radii[j-1],radii[j]
  ring=[P(ri,i) for i in range(n)]+[P(ro,i) for i in range(n)]
  A.poly(ring,[(i,(i+1)%n,n+(i+1)%n,n+i) if axis=='y' else (i,n+i,n+(i+1)%n,(i+1)%n) for i in range(n)],mats[j])

def flame_layers(root,name,base,size=1.0,seed=1,spread=(1.0,1.0),kind='hearth',yaw=0.0):
 """The three animated flame shells. base = plan (x,y,z) of the fire's centre on the embers. spread scales the
 footprint along plan x and z (a hearth is wider than it is deep). Returns the three objects (outer, mid, core)."""
 P=mats();rng=random.Random(seed);out=[]
 s=size;sx,sz=spread
 cfg=[('Outer',P['red'],P['orange'],7,.095,(.26,.38),.2,.45),('Mid',P['orange'],P['yellow'],5,.08,(.34,.46),.12,-.5),('Core',P['yellow'],P['white'],3,.065,(.42,.56),.05,.55)]
 if kind=='oven':cfg=[('Outer',P['red'],P['orange'],6,.085,(.18,.26),.26,.45),('Mid',P['orange'],P['yellow'],5,.07,(.22,.3),.16,-.5),('Core',P['yellow'],P['white'],3,.055,(.26,.34),.07,.55)]
 cy,sy=math.cos(yaw),math.sin(yaw)
 for li,(tag,m0,m1,count,r,hr,rad,tw) in enumerate(cfg):
  A=Acc(name+str(li))
  for i in range(count):
   a=2*math.pi*i/count+rng.uniform(-.25,.25)+li*.6
   d=rad*rng.uniform(.6,1.05)
   px,pz=math.cos(a)*d*sx,math.sin(a)*d*sz
   bx,bz=px*cy+pz*sy,-px*sy+pz*cy
   k=rng.uniform(.6,1.2)*(1.0 if li==0 else .6 if li==1 else .3)
   ca,sa=math.cos(a),math.sin(a)
   lean=((ca*.16-sa*.07)*k,(sa*.16+ca*.07)*k)
   lean=(lean[0]*cy+lean[1]*sy,-lean[0]*sy+lean[1]*cy)
   h=rng.uniform(*hr)*s*(1.0 if d<rad*.9 else .82)
   _tongue(A,(bx*s,0,bz*s),h,r*s*rng.uniform(.85,1.15),lean,tw*rng.uniform(.7,1.3),rng,m0 if i%3 else m1)
  if li==2:   # a white-hot heart low in the core
   _tongue(A,(0,0,0),hr[0]*.55*s,r*.8*s,(0,0),.6,rng,P['white'])
  o=A.build(root)
  o.location=(base[0],-base[2],base[1])
  me=o.data;bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(me);bm.free()
  out.append(o)
 return out

def flicker(objs,prefix,start=0,seed=7,rate=(1,2,3),amp=(.16,.2,.26)):
 """One looping action per flame layer, named prefix+str(start+i): height pulse with narrowing, twist sway and lean.
 All harmonics are whole multiples of the 36-frame loop, so frame 1 == frame 37."""
 rng=random.Random(seed);names=[]
 for i,o in enumerate(objs):
  ph=[rng.uniform(0,2*math.pi) for _ in range(6)];A=amp[min(i,len(amp)-1)];k=rate[min(i,len(rate)-1)]
  o.animation_data_create();act=bpy.data.actions.new(prefix+str(start+i));o.animation_data.action=act
  for f in range(0,LOOP+1,2):
   t=2*math.pi*f/LOOP
   sy=1+A*(.6*math.sin(k*t+ph[0])+.3*math.sin(3*k*t+ph[1])+.15*math.sin(5*t+ph[2]))
   sw=1-.45*(sy-1)+.04*math.sin(2*t+ph[3])
   o.scale=(sw,sw*(1+.05*math.sin(4*t+ph[4])),sy)
   o.rotation_euler=(.07*math.sin(t+ph[5]),.07*math.cos(2*t+ph[4]),.16*math.sin(k*t+ph[3]))
   o.keyframe_insert('scale',frame=1+f);o.keyframe_insert('rotation_euler',frame=1+f)
  names.append(act.name)
 bpy.context.scene.frame_set(1)
 return names

def bed(A,base,size=1.0,seed=3,spread=(1.0,1.0),logs='hearth',log_y=None,pool=True,yaw=0.0,ash=True):
 """Static parts into Acc A: ash bed, ember chips, logs with charred ends, glow pool bands on the ash."""
 P=mats();rng=random.Random(seed);s=size;sx,sz=spread;x0,y0,z0=base
 cy,sy=math.cos(yaw),math.sin(yaw)
 def R(px,pz):return (x0+(px*cy+pz*sy)*s,z0+(-px*sy+pz*cy)*s)
 if ash:
  pts=[R(math.cos(2*math.pi*i/9)*.3*sx*rng.uniform(.85,1.1),math.sin(2*math.pi*i/9)*.22*sz*rng.uniform(.85,1.1)) for i in range(9)]
  A.slab(pts,y0-.005,y0+.02*s,P['ash'],side_m=P['ash2'])
 if pool:
  c=R(0,0);ex=sx*abs(cy)+sz*abs(sy);ez=sx*abs(sy)+sz*abs(cy)
  _bands(A,(c[0],y0+.026*s,c[1]),'y',[.07*s,.14*s,.21*s],[P['pool1'],P['pool2'],P['pool3']],n=10,squash=ez,kx=ex)
 for i in range(16):
  a=rng.uniform(0,2*math.pi);d=rng.uniform(.03,.27)
  c=R(math.cos(a)*d*sx,math.sin(a)*d*.8*sz)
  m=[P['ember'],P['ember2'],P['emberhot'],P['char'],P['ember'],P['char']][i%6]
  _blob(A,(c[0],y0+.03*s,c[1]),(.028*s*rng.uniform(.7,1.3),.02*s,.024*s*rng.uniform(.7,1.3)),rng,m)
 ly=(y0+.08*s) if log_y is None else log_y
 if logs=='hearth':
  # four split logs laid in from the sides on the firedogs, their inner ends burnt through, one across the top
  for ang,r in ((.35,.06),(2.8,.058),(3.5,.06),(5.9,.056)):
   o=R(math.cos(ang)*.36*sx,math.sin(ang)*.3*sz);t=R(math.cos(ang)*.07*sx,math.sin(ang)*.06*sz)
   _log(A,(o[0],ly+.02*s,o[1]),(t[0],ly-.03*s,t[1]),r*s,P,burn=.45)
  a=R(-.2*sx,-.16*sz);b=R(.18*sx,.17*sz);_log(A,(a[0],ly+.08*s,a[1]),(b[0],ly+.06*s,b[1]),.05*s,P,burn=.5)
 elif logs=='teepee':
  for i in range(5):
   a=2*math.pi*i/5+.3;o=R(math.cos(a)*.3,math.sin(a)*.3);t=R(math.cos(a)*.04,math.sin(a)*.04)
   _log(A,(o[0],y0+.03*s,o[1]),(t[0],y0+.34*s,t[1]),.045*s,P,burn=.4)
 elif logs=='oven':
  for dz in (-.12,.12):
   a=R(-.25*sx,dz*sz);b=R(.2*sx,dz*.6*sz);_log(A,(a[0],ly,a[1]),(b[0],ly+.02*s,b[1]),.05*s,P,burn=.55)
 return A

def back_glow(A,centre,axis_sign,radii,seed=0):
 """Glow card on a firebox back wall (plan x = const plane), bands from hot centre outward; centre=(x,y,z)."""
 P=mats();_bands(A,centre,'x',radii,[P['wall1'],P['wall2'],P['wall3']],n=10,squash=.7)
