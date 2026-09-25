"""Interior pass helpers for measured island buildings (2026-09-25).

These buildings carry navigation graphs measured from their exact bytes, so the pass only ever:
 - re-tiles floor tops *in place*: the original top face is lowered 1 cm and a gapless tiling (boards or flags,
   seams drawn as coplanar strips) lies exactly on the original plane, so every support ray still lands at the
   same height and node y values do not move;
 - recolours interior furniture materials (no geometry change);
 - adds props only where no node stands (the re-extraction proves it: node ids and target nodes must match).
New parts use the kit's vertex-colour Acc builder (one material per part). Names follow each building's cutaway
contract (<Prefix>_Upper... for upstairs pieces, <Prefix>_Shell... for wall-hung pieces that clip with the walls).
"""
import bpy,bmesh,math,random
from holm_interior_kit import Acc,M,family

def top_rects(name):
 """Axis-aligned rectangles of the object's top faces (plan x0,x1,z0,z1) and their height."""
 o=bpy.data.objects[name];mw=o.matrix_world;top=max((mw@v.co).z for v in o.data.vertices);out=[]
 for p in o.data.polygons:
  vs=[mw@o.data.vertices[i].co for i in p.vertices]
  if all(abs(v.z-top)<1e-4 for v in vs):
   xs=[v.x for v in vs];zs=[-v.y for v in vs];r=(min(xs),max(xs),min(zs),max(zs))
   if abs((r[1]-r[0])*(r[3]-r[2])-p.area)<1e-3:out.append(r)
   else:out.append([(v.x,-v.y) for v in vs])       # a non-rectangular top (a bay): covered by one flat piece
 return out,top
def lower_top(name,dy=.01):
 o=bpy.data.objects[name];mw=o.matrix_world;inv=mw.inverted();top=max((mw@v.co).z for v in o.data.vertices)
 for v in o.data.vertices:
  w=mw@v.co
  if abs(w.z-top)<1e-4:w.z-=dy;v.co=inv@w
 o.data.update()
def tile(A,rect,y,style,tones,seam,rng,width=.3,run='x',s=.012):
 """Gapless tiling of one rectangle at height y: boards ('boards') or irregular flagstones ('flags')."""
 x0,x1,z0,z1=rect
 def q(a0,a1,b0,b1,m):
  if a1-a0<1e-4 or b1-b0<1e-4:return
  if run=='x':A.poly([(a0,y,b0),(a0,y,b1),(a1,y,b1),(a1,y,b0)],[(0,1,2,3)],m)
  else:A.poly([(b0,y,a0),(b1,y,a0),(b1,y,a1),(b0,y,a1)],[(0,1,2,3)],m)
 al0,al1,ac0,ac1=(x0,x1,z0,z1) if run=='x' else (z0,z1,x0,x1)
 c=ac0;row=0
 while c<ac1-1e-4:
  w=width if style=='boards' else rng.uniform(.42,.7)
  c1=min(ac1,c+w)
  if ac1-c1<.12:c1=ac1
  cuts=[al0];a=al0+(rng.uniform(.2,1.0) if style=='boards' and row%2 else 0)
  while True:
   a+=rng.uniform(1.3,2.4) if style=='boards' else rng.uniform(.45,.85)
   if a>=al1-.15:break
   cuts.append(a)
  cuts.append(al1)
  for p,r in zip(cuts,cuts[1:]):
   m=tones[rng.randrange(len(tones))]
   q(p,r-s,c,c1-s,m);q(r-s,r,c,c1,seam);q(p,r-s,c1-s,c1,seam)
  c=c1;row+=1
def retile(name,new_name,style,tones,seam,seed,parent=None,**kw):
 rects,top=top_rects(name);lower_top(name);A=Acc(new_name);rng=random.Random(seed)
 for r in rects:
  if isinstance(r,list):A.poly([(x,top,z) for x,z in r],[tuple(range(len(r)))],tones[0])
  else:tile(A,r,top,style,tones,seam,rng,**kw)
 o=A.build(parent or bpy.data.objects[name].parent)
 # support rays only accept upward faces: every tile faces up
 bm=bmesh.new();bm.from_mesh(o.data)
 for f in bm.faces:
  f.normal_update()
  if f.normal.z<0:f.normal_flip()
 bm.to_mesh(o.data);bm.free();o.data.update();return o,rects,top
def recolor(names,mat):
 n=0
 for o in bpy.data.objects:
  if o.type=='MESH' and any(o.name.startswith(p) for p in names):
   for i in range(len(o.data.materials)):
    if o.data.materials[i] and o.data.materials[i].name in mat:o.data.materials[i]=mat[o.data.materials[i].name];n+=1
 return n
def matte(hexcol,name):
 """A node-based matte material (Blender 5 exports the Principled base colour, not diffuse_color)."""
 from holm_interior_kit import srgb
 m=bpy.data.materials.new(name);c=srgb(hexcol);m.diffuse_color=(*c,1)
 try:m.use_nodes=True
 except Exception:pass
 sh=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');sh.inputs['Base Color'].default_value=(*c,1);sh.inputs['Roughness'].default_value=1;sh.inputs['Metallic'].default_value=0
 return m
def tris(prefix):return sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.data.objects if o.type=='MESH' and o.name.startswith(prefix))

# ---------------------------------------------------------------- polygon floors (octagonal towers, bays, fans)
def _clip(poly,x0,x1,z0,z1):
 """Sutherland-Hodgman: clip a convex/simple plan polygon [(x,z)] to an axis rectangle."""
 def cut(pts,inside,inter):
  out=[]
  for i,p in enumerate(pts):
   q=pts[i-1]
   if inside(p):
    if not inside(q):out.append(inter(q,p))
    out.append(p)
   elif inside(q):out.append(inter(q,p))
  return out
 def ix(xv):return lambda a,b:(xv,a[1]+(b[1]-a[1])*(xv-a[0])/(b[0]-a[0]))
 def iz(zv):return lambda a,b:(a[0]+(b[0]-a[0])*(zv-a[1])/(b[1]-a[1]),zv)
 pts=list(poly)
 for inside,inter in ((lambda p:p[0]>=x0,ix(x0)),(lambda p:p[0]<=x1,ix(x1)),(lambda p:p[1]>=z0,iz(z0)),(lambda p:p[1]<=z1,iz(z1))):
  if not pts:break
  pts=cut(pts,inside,inter)
 return pts
def top_polys(name,tol=1e-4,height=None,mats=None,lower=False):
 """Upward faces at the top level (or at `height`, optionally only of material names `mats`) as plan polygons.
 lower=True drops exactly those faces' vertices 1 cm."""
 o=bpy.data.objects[name];mw=o.matrix_world;top=max((mw@v.co).z for v in o.data.vertices) if height is None else height;out=[];vids=set()
 for p in o.data.polygons:
  vs=[mw@o.data.vertices[i].co for i in p.vertices]
  if mats and o.data.materials[p.material_index].name not in mats:continue
  if all(abs(v.z-top)<tol for v in vs):out.append([(v.x,-v.y) for v in vs]);vids.update(p.vertices)
 if lower:
  inv=mw.inverted()
  for i in vids:
   w=mw@o.data.vertices[i].co;w.z-=.01;o.data.vertices[i].co=inv@w
  o.data.update()
 return out,top
def retile_poly(name,new_name,style,tones,seam,seed,parent=None,width=.3,run='x',s=.012,height=None,mats=None):
 """Global pattern (rows keyed to world position) clipped to each top face: works for any convex top faces,
 so the pattern runs unbroken across a fan of triangles. Same in-place rule: old top lowered 1 cm."""
 polys,top=top_polys(name,height=height,mats=mats,lower=True);A=Acc(new_name)
 xs=[x for p in polys for x,_ in p];zs=[z for p in polys for _,z in p]
 X0,X1,Z0,Z1=min(xs),max(xs),min(zs),max(zs)
 rects=[]  # (x0,x1,z0,z1,material) covering the bounding box gaplessly
 al0,al1,ac0,ac1=(X0,X1,Z0,Z1) if run=='x' else (Z0,Z1,X0,X1)
 c=ac0;row=0
 while c<ac1-1e-4:
  rr=random.Random(seed*1000+row);w=width if style=='boards' else rr.uniform(.42,.7);c1=min(ac1,c+w)
  cuts=[al0];a=al0+(rr.uniform(.2,1.0) if style=='boards' and row%2 else 0)
  while True:
   a+=rr.uniform(1.3,2.4) if style=='boards' else rr.uniform(.45,.85)
   if a>=al1:break
   cuts.append(a)
  cuts.append(al1)
  for p,q in zip(cuts,cuts[1:]):
   m=tones[rr.randrange(len(tones))]
   for (a0,a1,b0,b1,mm) in ((p,q-s,c,c1-s,m),(q-s,q,c,c1,seam),(p,q-s,c1-s,c1,seam)):
    if a1-a0>1e-5 and b1-b0>1e-5:rects.append((a0,a1,b0,b1,mm) if run=='x' else (b0,b1,a0,a1,mm))
  c=c1;row+=1
 for poly in polys:
  px=[x for x,_ in poly];pz=[z for _,z in poly]
  for x0,x1,z0,z1,m in rects:
   if x1<min(px) or x0>max(px) or z1<min(pz) or z0>max(pz):continue
   cp=_clip(poly,x0,x1,z0,z1)
   if len(cp)>=3:A.poly([(x,top,z) for x,z in cp],[tuple(range(len(cp)))],m)
 o=A.build(parent if parent is not None else bpy.data.objects[name].parent)
 bm=bmesh.new();bm.from_mesh(o.data)
 bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=1e-6)
 for f in bm.faces:
  f.normal_update()
  if f.normal.z<0:f.normal_flip()
 bm.to_mesh(o.data);bm.free();o.data.update();return o,polys,top
def separate_clip_materials(prefix,clip_re):
 """Give every non-wall mesh its own copy of any material it shares with a clipped wall mesh."""
 import re;C=re.compile(clip_re)
 walls={m.name for o in bpy.data.objects if o.type=='MESH' and C.match(o.name) for m in o.data.materials if m};copies={};changed=[]
 for o in bpy.data.objects:
  if o.type!='MESH' or not o.name.startswith(prefix) or C.match(o.name):continue
  for i,m in enumerate(o.data.materials):
   if m and m.name in walls:
    if m.name not in copies:cp=m.copy();cp.name=m.name+' (not clipped)';copies[m.name]=cp
    o.data.materials[i]=copies[m.name];changed.append((o.name,m.name))
 return changed
