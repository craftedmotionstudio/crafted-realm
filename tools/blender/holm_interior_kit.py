"""Shared low-poly interior kit for Tutor's Holm buildings (2026-09-25 interiors pass).

Everything is authored in plan coordinates (x east, y up, z south) and mapped to Blender (x, -z, y) when a mesh
is built, like the guide-house scripts. Colours are sRGB display values written straight into the material
factor (the game renders without colour management, so authored factors are what the player sees); all
materials are matte (roughness 1, metallic 0), untextured. Pieces accumulate into one mesh per part name so a
room is a handful of objects, not hundreds. Original designs only; nothing is copied from reference models.
"""
import bpy,bmesh,math,random
from mathutils import Vector

_MATS={};STATS={}
def srgb(h):
 h=h.lstrip('#');return tuple(int(h[i:i+2],16)/255 for i in (0,2,4))
def M(name,hexcol,emit=None):
 """Matte flat colour, cached by name. emit: emission strength for glowing parts (fire, candle flames).
 Inside an Acc part the colour is written as a per-face vertex colour and the part shares one material
 (one draw call); a material object is still made so standalone meshes can use it directly."""
 m=_MATS.get(name)
 if m:return m
 m=bpy.data.materials.new(name);c=srgb(hexcol);m.diffuse_color=(*c,1);m.roughness=1.0;m.metallic=0.0;m['srgb']=c
 if emit:
  m.use_nodes=True;sh=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
  sh.inputs['Base Color'].default_value=(*c,1);sh.inputs['Roughness'].default_value=1.0;sh.inputs['Metallic'].default_value=0.0
  sh.inputs['Emission Color'].default_value=(*c,1);sh.inputs['Emission Strength'].default_value=emit;m['emit']=emit
 _MATS[name]=m;return m
def _vc_material(emissive=None):
 """The shared vertex-colour material (white factor x COLOR_0), or an emissive variant of one colour."""
 key='__vc__'+(emissive.name if emissive else '')
 if key in _MATS:return _MATS[key]
 m=bpy.data.materials.new('Holm flat colour' if not emissive else emissive.name+' (glow)');m.use_nodes=True;nt=m.node_tree
 sh=next(n for n in nt.nodes if n.type=='BSDF_PRINCIPLED');sh.inputs['Roughness'].default_value=1.0;sh.inputs['Metallic'].default_value=0.0
 vc=nt.nodes.new('ShaderNodeVertexColor');vc.layer_name='Col';nt.links.new(vc.outputs['Color'],sh.inputs['Base Color'])
 if emissive:
  # the game shows emissive at full strength over the lit base colour: half-strength glow keeps its hue
  c=[v*.5 for v in emissive['srgb']];sh.inputs['Emission Color'].default_value=(*c,1);sh.inputs['Emission Strength'].default_value=1.0
 m.diffuse_color=(1,1,1,1);_MATS[key]=m;return m
def family(prefix,hexes):
 """A family of related tones: [M(prefix+' 1',h1), ...]."""
 return [M('%s %d'%(prefix,i+1),h) for i,h in enumerate(hexes)]

class Acc:
 """Accumulates polygons for one named part; build() makes a single mesh object."""
 def __init__(s,name):s.name=name;s.v=[];s.f=[];s.fm=[];s.mats=[]
 def _mi(s,m):
  if m not in s.mats:s.mats.append(m)
  return s.mats.index(m)
 def poly(s,verts,faces,m):
  k=len(s.v);s.v.extend(tuple(p) for p in verts);i=s._mi(m)
  for f in faces:s.f.append(tuple(k+j for j in f));s.fm.append(i)
 def box(s,x0,x1,y0,y1,z0,z1,m,skip=''):
  """Axis box. skip letters drop hidden faces: b t n(-z) s(+z) w(-x) e(+x)."""
  if x0>x1:x0,x1=x1,x0
  if y0>y1:y0,y1=y1,y0
  if z0>z1:z0,z1=z1,z0
  V=[(x0,y0,z0),(x1,y0,z0),(x1,y1,z0),(x0,y1,z0),(x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)]
  F={'b':(0,1,5,4),'t':(3,7,6,2),'n':(0,3,2,1),'s':(4,5,6,7),'w':(0,4,7,3),'e':(1,2,6,5)}
  s.poly(V,[F[k] for k in 'btnswe' if k not in skip],m)
 def rbox(s,cx,cz,w,d,y0,y1,rot,m,skip=''):
  """Box of width w (local x) and depth d (local z) rotated by rot (radians, about y) around (cx,cz)."""
  c,sn=math.cos(rot),math.sin(rot)
  def P(a,b,y):return (cx+a*c+b*sn,y,cz-a*sn+b*c)
  pts=[(-w/2,-d/2),(w/2,-d/2),(w/2,d/2),(-w/2,d/2)]
  V=[P(a,b,y0) for a,b in pts]+[P(a,b,y1) for a,b in pts]
  F={'b':(0,1,2,3),'t':(4,7,6,5),'n':(0,4,5,1),'e':(1,5,6,2),'s':(2,6,7,3),'w':(3,7,4,0)}
  s.poly(V,[F[k] for k in 'btnesw' if k not in skip],m)
 def beam(s,a,b,w,d,m):
  a,b=Vector(a),Vector(b);axis=(b-a).normalized();side=axis.cross(Vector((0,1,0)))
  if side.length<.01:side=axis.cross(Vector((1,0,0)))
  side.normalize();up=axis.cross(side).normalized()
  V=[tuple(p+side*x*w/2+up*y*d/2) for p in (a,b) for x,y in ((-1,-1),(1,-1),(1,1),(-1,1))]
  s.poly(V,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],m)
 def tube(s,a,b,r,n,m,caps=True,cap_m=None,r2=None):
  """Cylinder (n sides) from point a to b; caps may take their own material (log end grain, cask heads)."""
  a,b=Vector(a),Vector(b);axis=(b-a).normalized();u=axis.cross(Vector((0,1,0)))
  if u.length<.01:u=axis.cross(Vector((1,0,0)))
  u.normalize();w=axis.cross(u).normalized();r2=r if r2 is None else r2
  ring=lambda p,rr:[tuple(p+(u*math.cos(2*math.pi*i/n)+w*math.sin(2*math.pi*i/n))*rr) for i in range(n)]
  k=len(s.v);s.poly(ring(a,r)+ring(b,r2),[(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)],m)
  if caps:
   s.poly(ring(a,r),[tuple(range(n-1,-1,-1))],cap_m or m);s.poly(ring(b,r2),[tuple(range(n))],cap_m or m)
 def lathe(s,cx,cz,y0,prof,n,m,top=True,bottom=False,top_m=None,rot=0.0):
  """Turned solid: prof = [(radius, height), ...] from the bottom up; a zero radius closes to a point."""
  V=[];idx=[]
  for r,h in prof:
   if r<=1e-6:idx.append([len(V)]*n);V.append((cx,y0+h,cz))
   else:idx.append(list(range(len(V),len(V)+n)));V.extend((cx+r*math.cos(rot+2*math.pi*i/n),y0+h,cz+r*math.sin(rot+2*math.pi*i/n)) for i in range(n))
  F=[]
  for a,b in zip(idx,idx[1:]):
   for i in range(n):
    q=[a[i],a[(i+1)%n],b[(i+1)%n],b[i]];q=[v for j,v in enumerate(q) if v not in q[:j]]
    if len(q)>=3:F.append(tuple(q))
  s.poly(V,F,m);k=len(s.v)-len(V)
  if top and prof[-1][0]>0:s.poly([V[i] for i in idx[-1]],[tuple(range(n-1,-1,-1))],top_m or m)
  if bottom and prof[0][0]>0:s.poly([V[i] for i in idx[0]],[tuple(range(n))],m)
 def slab(s,outline,y0,y1,m,side_m=None):
  """Extruded convex/simple polygon outline [(x,z),...] from y0 to y1 (top ngon, sides; no bottom)."""
  n=len(outline);V=[(x,y0,z) for x,z in outline]+[(x,y1,z) for x,z in outline]
  s.poly(V,[tuple(range(n,2*n))],m)
  s.poly(V,[(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)],side_m or m)
 def build(s,parent=None,vcol=True):
  if not s.v:return None
  data=bpy.data.meshes.new(s.name);data.from_pydata([(x,-z,y) for x,y,z in s.v],[],s.f);data.update()
  o=bpy.data.objects.new(s.name,data);bpy.context.collection.objects.link(o)
  if parent:o.parent=parent
  if vcol:
   slots=[_vc_material()];remap=[]
   for m in s.mats:
    if m.get('emit'):
     e=_vc_material(m)
     if e not in slots:slots.append(e)
     remap.append(slots.index(e))
    else:remap.append(0)
   for m in slots:data.materials.append(m)
   data.polygons.foreach_set('material_index',[remap[i] for i in s.fm])
   col=data.color_attributes.new('Col','FLOAT_COLOR','CORNER');cols=[]
   for p,fi in zip(data.polygons,s.fm):
    c=s.mats[fi].get('srgb',(1,1,1));cols.extend([c[0],c[1],c[2],1.0]*p.loop_total)
   col.data.foreach_set('color',cols);data.color_attributes.active_color=col;data.color_attributes.render_color_index=0
  else:
   for m in s.mats:data.materials.append(m)
   data.polygons.foreach_set('material_index',s.fm)
  data.update();STATS[s.name]=STATS.get(s.name,0)+sum(len(f)-2 for f in s.f);return o
def sharp_by_angle(o,deg=30):
 """Smooth shading with edges sharper than deg marked sharp: visible but not harsh planes."""
 if o.type!='MESH' or not o.data.polygons:return
 bm=bmesh.new();bm.from_mesh(o.data);lim=math.radians(deg)
 for f in bm.faces:f.smooth=True
 for e in bm.edges:
  e.smooth=not(len(e.link_faces)!=2 or e.calc_face_angle(math.pi)>lim or (e.link_faces[0].material_index!=e.link_faces[1].material_index))
 bm.to_mesh(o.data);bm.free();o.data.update()

# ---------------------------------------------------------------- furniture and clutter pieces
def barrel(A,x,z,y,r,h,staves,hoop,lid=None,rng=None,n=8):
 rng=rng or random.Random(int(x*100+z*10));st=staves[rng.randrange(len(staves))]
 A.lathe(x,z,y,[(r*.86,0),(r,h*.3),(r,h*.7),(r*.86,h)],n,st,top=True,top_m=lid or staves[-1],rot=rng.random())
 for hy in (h*.14,h*.86):A.lathe(x,z,y+hy-.025,[(r*.9+.012,0),(r*.9+.012,.05)],n,hoop,top=False)
def cask(A,a,b,r,staves,head,hoop,n=8):
 """A barrel lying on its side from a to b (end centres)."""
 a,b=Vector(a),Vector(b);mid=(a+b)/2
 A.tube(a,a+(mid-a)*.45,r*.88,n,staves[0],caps=True,cap_m=head,r2=r)
 A.tube(a+(mid-a)*.45,b+(mid-b)*.45,r,n,staves[1],caps=False)
 A.tube(b+(mid-b)*.45,b,r,n,staves[0],caps=True,cap_m=head,r2=r*.88)
 for t in (.16,.84):
  p=a+(b-a)*t;d=(b-a).normalized()*.022;A.tube(p-d,p+d,r*.95+.012,n,hoop,caps=False)
def crate(A,x0,x1,y0,y1,z0,z1,boards,batten):
 A.box(x0+.02,x1-.02,y0+.01,y1-.01,z0+.02,z1-.02,boards[0])
 # battened faces: frame boards on the four vertical faces and the lid
 for (a,b) in ((y0,y0+.07),(y1-.07,y1)):
  A.box(x0,x1,a,b,z0,z0+.03,batten);A.box(x0,x1,a,b,z1-.03,z1,batten)
  A.box(x0,x0+.03,a,b,z0,z1,batten);A.box(x1-.03,x1,a,b,z0,z1,batten)
 for i,t in enumerate((.33,.66)):
  A.box(x0+(x1-x0)*t-.012,x0+(x1-x0)*t+.012,y1-.005,y1+.012,z0+.03,z1-.03,boards[1+i%(len(boards)-1)])
def sack(A,x,z,y,w,h,cloth,tie,rot=0.0):
 A.lathe(x,z,y,[(w*.45,0),(w*.55,h*.2),(w*.5,h*.62),(w*.22,h*.86),(w*.12,h)],7,cloth,top=True,rot=rot)
 A.lathe(x,z,y+h*.86,[(w*.14,0),(w*.14,.035)],7,tie,top=False,rot=rot)
def jar(A,x,z,y,r,h,m,lid=None,n=6,style=0):
 if style==0:prof=[(r*.7,0),(r,h*.35),(r*.9,h*.75),(r*.55,h*.88),(r*.62,h)]    # pot with a lip
 elif style==1:prof=[(r*.8,0),(r,h*.2),(r,h*.85),(r*.75,h)]                    # storage jar
 else:prof=[(r*.6,0),(r,h*.4),(r*.45,h*.8),(r*.3,h*.9),(r*.38,h)]              # jug / bottle
 A.lathe(x,z,y,prof,n,m,top=True,top_m=lid or m)
def bowl(A,x,z,y,r,m,inner=None,n=8):
 A.lathe(x,z,y,[(r*.5,0),(r*.85,r*.35),(r,r*.62)],n,m,top=True,top_m=inner or m)
def candle(A,x,z,y,wax,flame,holder=None,h=.16):
 if holder:A.lathe(x,z,y,[(.05,0),(.055,.012),(.02,.02),(.02,.05),(.035,.06)],6,holder,top=True)
 b=y+(.06 if holder else 0);A.lathe(x,z,b,[(.018,0),(.018,h)],6,wax,top=True)
 A.poly([(x-.012,b+h,z),(x+.012,b+h,z),(x,b+h+.06,z),(x,b+h,z-.012),(x,b+h,z+.012)],[(0,1,2),(3,4,2)],flame)
def lantern(A,x,z,y,frame,glass,h=.3):
 A.lathe(x,z,y,[(.07,0),(.07,.02)],6,frame,top=True)
 A.lathe(x,z,y+.02,[(.06,0),(.06,h*.6)],6,glass,top=False)
 for i in range(6):
  a=2*math.pi*i/6+math.pi/6;A.beam((x+.066*math.cos(a),y+.02,z+.066*math.sin(a)),(x+.066*math.cos(a),y+.02+h*.6,z+.066*math.sin(a)),.014,.014,frame)
 A.lathe(x,z,y+.02+h*.6,[(.075,0),(.03,h*.25),(.012,h*.3)],6,frame,top=True)
 A.tube((x,y+h*.93,z),(x,y+h*1.05,z),.018,5,frame,caps=False)
def books(A,x0,x1,y,z0,z1,axis,mats,rng,hmin=.16,hmax=.27,gap=.004,lean_last=True):
 """A row of books standing along axis 'x' (spines face z1) or 'z' (spines face x1)."""
 p=x0 if axis=='x' else z0;end=x1 if axis=='x' else z1
 while p<end-.03:
  t=rng.uniform(.045,.085);h=rng.uniform(hmin,hmax);m=mats[rng.randrange(len(mats))]
  if p+t>end:break
  if axis=='x':A.box(p,p+t,y,y+h,z0+rng.uniform(0,.02),z1,m,skip='bn')
  else:A.box(x0+rng.uniform(0,.02),x1,y,y+h,p,p+t,m,skip='bw')
  p+=t+gap
def log(A,a,b,r,bark,end,n=7):A.tube(a,b,r,n,bark,caps=True,cap_m=end)
def rug(A,x0,x1,z0,z1,y,border,field,stripes,m_fringe=None,band=.12):
 A.box(x0,x1,y,y+.012,z0,z1,border,skip='b')
 A.box(x0+band,x1-band,y+.012,y+.016,z0+band,z1-band,field,skip='b')
 L=(x1-x0)>(z1-z0);n=len(stripes)
 for i,m in enumerate(stripes):
  t=(i+1)/(n+1)
  if L:xc=x0+band+(x1-x0-2*band)*t;A.box(xc-.05,xc+.05,y+.016,y+.019,z0+band+.05,z1-band-.05,m,skip='b')
  else:zc=z0+band+(z1-z0-2*band)*t;A.box(x0+band+.05,x1-band-.05,y+.016,y+.019,zc-.05,zc+.05,m,skip='b')
 if m_fringe:
  for e in ((x0-.04,x0),(x1,x1+.04)) if L else ():A.box(e[0],e[1],y,y+.006,z0+.03,z1-.03,m_fringe,skip='b')
  for e in ((z0-.04,z0),(z1,z1+.04)) if not L else ():A.box(x0+.03,x1-.03,y,y+.006,e[0],e[1],m_fringe,skip='b')
def herbs(A,x,z,y,greens,tie,rng,n=5,axis='x',span=.9):
 """Bundles hung from a pole at height y along axis."""
 for i in range(n):
  t=(i+.5)/n-.5;px=x+(t*span if axis=='x' else 0);pz=z+(t*span if axis=='z' else 0);m=greens[rng.randrange(len(greens))]
  A.lathe(px,pz,y-.42-rng.uniform(0,.06),[(.02,0),(.075,.12),(.06,.3),(.02,.36)],6,m,top=True,bottom=True,rot=rng.random())
  A.box(px-.012,px+.012,y-.07,y,pz-.012,pz+.012,tie)
def plank_floor(A,x0,x1,z0,z1,y,tones,under,rng,width=.3,holes=(),run='x',thick=.03,base=None):
 """Boards laid along run with 8 mm seams over a dark underlay; holes = [(x0,x1,z0,z1)] cut cleanly."""
 if under:A.box(x0,x1,(base if base is not None else y-.2),y-.012,z0,z1,under,skip='')
 across=(z0,z1) if run=='x' else (x0,x1);along=(x0,x1) if run=='x' else (z0,z1)
 c=across[0];row=0
 while c<across[1]-.01:
  c1=min(across[1],c+width);a=along[0]+(rng.uniform(.3,1.2) if row%2 else 0)
  cuts=[along[0]]
  while a<along[1]:
   if a>along[0]+.25:cuts.append(a)
   a+=rng.uniform(1.4,2.6)
  cuts.append(along[1])
  for p,q in zip(cuts,cuts[1:]):
   segs=[(p,q)]
   for hx0,hx1,hz0,hz1 in holes:
    h_along=(hx0,hx1) if run=='x' else (hz0,hz1);h_across=(hz0,hz1) if run=='x' else (hx0,hx1)
    if c1<=h_across[0] or c>=h_across[1]:continue
    nxt=[]
    for s0,s1 in segs:
     if s1<=h_along[0] or s0>=h_along[1]:nxt.append((s0,s1));continue
     if s0<h_along[0]:nxt.append((s0,h_along[0]))
     if s1>h_along[1]:nxt.append((h_along[1],s1))
    segs=nxt
   for s0,s1 in segs:
    if s1-s0<.05:continue
    m=tones[rng.randrange(len(tones))];g=.005
    # a board is its top face only: the dark underlay 12 mm below shows through every seam
    if run=='x':A.poly([(s0+g,y,c+g),(s0+g,y,c1-g),(s1-g,y,c1-g),(s1-g,y,c+g)],[(0,1,2,3)],m)
    else:A.poly([(c+g,y,s0+g),(c+g,y,s1-g),(c1-g,y,s1-g),(c1-g,y,s0+g)],[(0,1,2,3)],m)
  c=c1;row+=1
def stone_face(A,axis,plane,out,u0,u1,v0,v1,tones,rng,course=(.2,.3),length=(.25,.5),proud=(.012,.035),holes=(),skip_back=True):
 """Coursed stones on a vertical face: axis 'x' = face lies along x at z=plane, 'z' = along z at x=plane.
 out = +1/-1 the side the stones face. Stones stop at holes [(u0,u1,v0,v1)]."""
 v=v0
 while v<v1-.02:
  vh=min(v1,v+rng.uniform(*course));
  if v1-vh<.1:vh=v1
  u=u0+(rng.uniform(0,.2) if rng.random()<.5 else 0);us=[u0]
  while u<u1:
   u+=rng.uniform(*length)
   if u<u1-.12:us.append(u)
  us.append(u1)
  for a,b in zip(us,us[1:]):
   if any(h[0]<(a+b)/2<h[1] and h[2]<(v+vh)/2<h[3] for h in holes):continue
   pr=rng.uniform(*proud);g=.012;m=tones[rng.randrange(len(tones))]
   d0,d1=plane,plane+out*pr
   if axis=='x':A.box(a+g,b-g,v+g,vh-g,d0,d1,m,skip=('n' if out>0 else 's'))
   else:A.box(d0,d1,v+g,vh-g,a+g,b-g,m,skip=('w' if out>0 else 'e'))
  v=vh
