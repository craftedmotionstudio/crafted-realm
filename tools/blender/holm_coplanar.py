"""Coplanar-overlap (z-fighting) finder and fixer for Tutor's Holm models (2026-09-25).

A pair of faces is a *fight* when their planes are within TOL (3 mm, parallel within ~0.6 degrees), their
projections overlap by more than MIN_AREA, and both can be seen from the same side:
 - same-facing pairs always (both front faces render at one depth);
 - opposite-facing pairs when either face belongs to an open shell (a sheet with no back, visible from both
   sides because the game renders these materials double-sided) or both belong to one closed island (a
   zero-thickness box).
Two closed solids resting face to face (a book on a shelf) are not fights: those faces hide each other.

carve() then cuts the covered part out of the face behind for same-facing pairs the push could not separate.
fix() pushes the overlay: the non-support face (never a walk surface: Floor/Stair/Step/Deck/Landing/Porch), else
the smaller island, moves PUSH along the direction that separates the pair. Moving a box face stretches the box,
so an overlay gains real thickness instead of floating.
"""
import bpy,bmesh,math
from mathutils import Vector
TOL=.003;MIN_AREA=1e-4;PUSH=.015;CELL=.25;BIGFACE=1.2   # faces larger than 1.2 m2 (wall and roof planes) are never moved
SUPPORT=('Floor','Stair','Step','Deck','Landing','Porch','Walk')
def is_support(name):return any(k in name for k in SUPPORT)

def _clip(subject,clipper):
 out=subject
 for i in range(len(clipper)):
  a,b=clipper[i-1],clipper[i];inp=out;out=[]
  if not inp:break
  def inside(p):return (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0])>=-1e-12
  def inter(p,q):
   x1,y1,x2,y2=a[0],a[1],b[0],b[1];x3,y3,x4,y4=p[0],p[1],q[0],q[1]
   den=(x1-x2)*(y3-y4)-(y1-y2)*(x3-x4)
   if abs(den)<1e-18:return q
   t=((x1-x3)*(y3-y4)-(y1-y3)*(x3-x4))/den;return (x1+t*(x2-x1),y1+t*(y2-y1))
  for j in range(len(inp)):
   p,q=inp[j-1],inp[j]
   if inside(q):
    if not inside(p):out.append(inter(p,q))
    out.append(q)
   elif inside(p):out.append(inter(p,q))
 return out
def _area(poly):return .5*sum(poly[i-1][0]*poly[i][1]-poly[i][0]*poly[i-1][1] for i in range(len(poly)))
def _ccw(t):return t if _area(t)>0 else t[::-1]

def islands(obj,me):
 """polygon index -> (island id, closed?) after welding coincident vertices."""
 bm=bmesh.new();bm.from_mesh(me);lay=bm.faces.layers.int.new('orig')
 for f in bm.faces:f[lay]=f.index
 bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=1e-4);bm.normal_update();bm.faces.ensure_lookup_table()
 seen={};res={};iid=0;verts={};bound={}
 mw=obj.matrix_world
 for f in bm.faces:
  if f.index in seen:continue
  stack=[f];members=[];closed=True
  seen[f.index]=iid
  while stack:
   g=stack.pop();members.append(g)
   for e in g.edges:
    if len(e.link_faces)<2:closed=False
    for h in e.link_faces:
     if h.index not in seen:seen[h.index]=iid;stack.append(h)
  vs={v.index:mw@v.co for g in members for v in g.verts}
  for g in members:res[g[lay]]=(iid,closed)
  verts[iid]=list(vs.values())
  if not closed:
   nm=mw.inverted().transposed().to_3x3()
   bound[iid]=[(e.link_faces[0][lay],mw@((e.verts[0].co+e.verts[1].co)/2),(nm@e.link_faces[0].normal).normalized()) for g in members for e in g.edges if len(e.link_faces)==1]
  iid+=1
 bm.free();return res,verts,bound

def analyze(objs,depsgraph=None,tol=TOL,min_area=MIN_AREA,report_hidden=False,views=None):
 dg=depsgraph or bpy.context.evaluated_depsgraph_get()
 tris=[];isl={};iverts={};ibound={};names=[];tmat=[];polymat={};partmin={}
 for oi,o in enumerate(objs):
  eo=o.evaluated_get(dg);me=eo.to_mesh();me.calc_loop_triangles();mw=o.matrix_world;names.append(o.name)
  isl[oi],iverts[oi],ibound[oi]=islands(o,me)
  W=[mw@v.co for v in me.vertices]
  for t in me.loop_triangles:
   a,b,c=(W[i] for i in t.vertices);n=(b-a).cross(c-a)
   if n.length<2e-7:continue
   n.normalize();s=1
   for comp in n:
    if abs(comp)>1e-6:s=1 if comp>0 else -1;break
   nc=n*s;tris.append((oi,t.polygon_index,nc,nc.dot(a),s,(a,b,c)))
   mi=me.polygons[t.polygon_index].material_index;tmat.append(mi);polymat[(oi,t.polygon_index)]=mi
   partmin[(oi,mi)]=min(partmin.get((oi,mi),1e9),a.z,b.z,c.z)
  eo.to_mesh_clear()
 buckets={}
 for i,t in enumerate(tris):
  k=(tuple(round(c*100) for c in t[2]),math.floor(t[3]/tol));buckets.setdefault(k,[]).append(i)
 pairs={}
 done=set()
 for (nk,db),ids in buckets.items():
  cand=list(ids)+buckets.get((nk,db+1),[])
  if len(cand)<2:continue
  n=tris[ids[0]][2];u=n.orthogonal().normalized();v=n.cross(u)
  proj={};grid={}
  for i in cand:
   P=[(p.dot(u),p.dot(v)) for p in tris[i][5]];proj[i]=_ccw(P)
   x0=min(p[0] for p in P);x1=max(p[0] for p in P);y0=min(p[1] for p in P);y1=max(p[1] for p in P)
   for gx in range(math.floor(x0/CELL),math.floor(x1/CELL)+1):
    for gy in range(math.floor(y0/CELL),math.floor(y1/CELL)+1):grid.setdefault((gx,gy),[]).append(i)
  for cell in grid.values():
   for x in range(len(cell)):
    for y in range(x+1,len(cell)):
     i,j=cell[x],cell[y]
     if i==j:continue
     key=(min(i,j),max(i,j))
     if key in done:continue
     done.add(key)
     ti,tj=tris[i],tris[j]
     if ti[0]==tj[0] and ti[1]==tj[1]:continue
     if abs(ti[3]-tj[3])>tol:continue
     cp=_clip(proj[i],proj[j])
     if len(cp)<3:continue
     A=abs(_area(cp))
     if A<1e-7:continue
     cx=sum(q[0] for q in cp)/len(cp);cy=sum(q[1] for q in cp)/len(cp);Q=u*cx+v*cy
     # back onto the two faces' own planes (the bucket normal may be tilted a little from theirs)
     P3=Q+n*(sum((t_[3]-t_[2].dot(Q))/(t_[2].dot(n) or 1) for t_ in (ti,tj))/2)
     a,b=(ti,tj) if (ti[0],ti[1])<=(tj[0],tj[1]) else (tj,ti)
     pk=(a[0],a[1],b[0],b[1]);r=pairs.setdefault(pk,{'area':0,'same':a[4]==b[4],'sa':a[4],'sb':b[4],'n':a[2],'d':(a[3],b[3]),'at':tuple(round(c,3) for c in cp[0]) and None})
     r['area']+=A;r.setdefault('pt',tuple(round(c,3) for c in (a[5][0]+a[5][1]+a[5][2])/3))
     # sample every triangle-sized piece of the overlap (the 16 largest), so a polygon pair is judged at the same
     # points as the triangle pairs of the exported model
     sm=r.setdefault('sampleA',[]);sm.append((A,P3.copy()))
     if len(sm)>16:sm.sort(key=lambda q:-q[0]);sm.pop()
 from mathutils.bvhtree import BVHTree
 allv=[];allf=[]
 for t in tris:
  k=len(allv);allv.extend(t[5]);allf.append((k,k+1,k+2))
 bvh=BVHTree.FromPolygons(allv,allf,all_triangles=True) if allf else None
 # an open edge that lies on another face turned the same way as its own face, or square to it, lets nothing
 # through: a hole cut by carve() under the face that covers it, or a panel ending flush on a wall. An island
 # whose open edges are all of that kind counts as closed. (A sheet laid face-down on a surface stays open.)
 if bvh:
  for oi,bd in ibound.items():
   for iid,edges in bd.items():
    ok=True
    for pi,m,nf in edges:
     if not any(tris[h[2]][:2]!=(oi,pi) and (h[1].dot(nf)>.99 or abs(h[1].dot(nf))<.02) for h in bvh.find_nearest_range(m,TOL+.0005)):ok=False;break
    if ok:
     for k,(i2,c) in list(isl[oi].items()):
      if i2==iid:isl[oi][k]=(i2,True)
 # what the game shows: every view (outside, and each cutaway storey) hides some parts and clips others
 import re
 views=views or [{'name':'all'}]
 def shown(v,oi,mi,z):
  nm=names[oi]
  if any(re.search(r,nm) for r in v.get('hide',[])):return False
  if v.get('only') and not any(re.search(r,nm) for r in v['only']):return False
  u=v.get('upper')
  if u and re.search(u['re'],nm) and partmin[(oi,mi)]>u['max']:return False
  c=v.get('clip')
  if c and re.search(c['re'],nm) and z>c['z']:return False
  return True
 vbvh=[]
 for v in views:
  if len(views)==1 and not any(k in v for k in ('hide','only','upper','clip')):vbvh.append(bvh);continue
  vv=[];vf=[]
  for i,t in enumerate(tris):
   if not shown(v,t[0],tmat[i],(t[5][0].z+t[5][1].z+t[5][2].z)/3):continue
   k=len(vv);vv.extend(t[5]);vf.append((k,k+1,k+2))
  vbvh.append(BVHTree.FromPolygons(vv,vf,all_triangles=True) if vf else None)
 dirs=[]
 for el in (25,45,65,85):
  for yw in range(12):
   e=math.radians(el);a=yw*math.pi/6;dirs.append(Vector((math.cos(e)*math.cos(a),math.cos(e)*math.sin(a),math.sin(e))))
 def visible_from(pt,nrm,bvh):
  # seen if, from just in front of the overlap, at least a quarter of the game-camera directions on that side
  # have 0.25 m of open space whose first hit is a front face (a back face means we started inside a solid)
  for side in nrm:
   o=pt+side*.004;tot=0;op=0
   for dvec in dirs:
    if dvec.dot(side)<.05:continue
    tot+=1;hit=bvh.ray_cast(o,dvec,80.0)
    if hit[0] is None or hit[3]>.3:op+=1     # face normals of joined wall cells are unreliable: distance only
   if tot and op>=max(3,.3*tot):return True
  return False
 fights=[]
 for r in pairs.values():r['samples']=[q[1] for q in sorted(r['sampleA'],key=lambda q:-q[0])]
 for (oa,pa,ob,pb),r in pairs.items():
  if r['area']<min_area:continue
  ia,ca=isl[oa].get(pa,(-1,True));ib,cb=isl[ob].get(pb,(-2,True))
  if r['same']:kind='same-facing'
  elif not ca or not cb:kind='open-shell'
  elif oa==ob and ia==ib:
   nv=Vector(r['n']);pr=[p.dot(nv) for p in iverts[oa][ia]]
   if max(pr)-min(pr)>tol:continue      # faces inside a welded solid (planks laid edge to edge), hidden
   kind='zero-thickness'
  else:continue
  nv=Vector(r['n'])
  if kind=='same-facing':sides=[nv*r['sa']]
  elif kind=='open-shell' and ca!=cb:sides=[nv*(r['sa'] if ca else r['sb'])]   # a closed face is only seen from its front
  else:sides=[nv,-nv]
  vis=False;seen_in=None
  for v,vb in zip(views,vbvh):
   if vb is None:continue
   for p in r['samples']:
    if shown(v,oa,polymat[(oa,pa)],p.z) and shown(v,ob,polymat[(ob,pb)],p.z) and visible_from(p,sides,vb):vis=True;seen_in=v['name'];break
   if vis:break
  if not vis and not report_hidden:continue
  pa_=[q.dot(nv) for q in iverts[oa][ia]] if ia in iverts[oa] else [0];pb_=[q.dot(nv) for q in iverts[ob][ib]] if ib in iverts[ob] else [0]
  def ext(vs):
   if not vs:return 0
   return (Vector((max(q.x for q in vs),max(q.y for q in vs),max(q.z for q in vs)))-Vector((min(q.x for q in vs),min(q.y for q in vs),min(q.z for q in vs)))).length
  fights.append({'da':r['d'][0],'db':r['d'][1],'extA':round(ext(iverts[oa].get(ia,[])),3),'extB':round(ext(iverts[ob].get(ib,[])),3),'thickA':round(max(pa_)-min(pa_),4),'thickB':round(max(pb_)-min(pb_),4),'visible':vis,'a':names[oa],'pa':pa,'b':names[ob],'pb':pb,'kind':kind,'area':round(r['area'],5),'at':r['pt'],'closedA':ca,'closedB':cb,'islandA':ia,'islandB':ib,'sa':r['sa'],'sb':r['sb'],'n':tuple(r['n']),'view':seen_in,**({'samples':[tuple(round(c,4) for c in q) for q in r['samples']]} if report_hidden else {})})
 return fights

GUIDE_VIEWS=[{'name':'outside','hide':['^Cellar(?!Hatch)']},
 {'name':'ground','hide':['^(Roof|Gable|UpperShell|UpperFloor|UpperFurnishing|UpperHearth)','^Cellar(?!Hatch)']},
 {'name':'upper','hide':['^(Roof|Gable|UpperShell)','^Cellar(?!Hatch)']},
 {'name':'cellar','only':['^Cellar'],'hide':['^CellarCeiling']}]
# mirror of CUTAWAY in src/holm_island_extras.js: (roof, upper, clip, lift)
CUTAWAY={'keep':(r'^Keep_Roof_',r'^Keep_(Upper|Tower)_',r'^Keep_(Shell|Upper_Shell|GroundFront)_',1.25),
 'kitchen':(r'^Kitchen_(Roof|Chimney)_',r'^Kitchen_Upper',r'^Kitchen_(Shell|UpperShell|GroundFront|Glazing)_',.5),
 'lodge':(r'^Lodge_(Roof|Chimney)',r'^Lodge_Upper(?!.*Stair)',r'^Lodge_(GroundShell|UpperShell|Glazing)',.5)}
def building_views(profile,nav=None,prefix=None):
 """Outside, plus the game's cutaway for every storey the building's measured graph stands on (a level with at
 least six stances): roof hidden, upper parts above the storey hidden, shells clipped at the storey + lift."""
 if profile=='guide':return GUIDE_VIEWS
 if profile in CUTAWAY:roof,up,clip,lift=CUTAWAY[profile]
 else:roof,up,clip,lift='^'+prefix+'_Roof','^'+prefix+'_Upper','^'+prefix+'_(Shell|UpperShell|Glazing)',.5
 views=[{'name':'outside'}]
 if nav:
  from collections import Counter
  c=Counter(round(n['y'],1) for n in nav['nodes'] if not str(n.get('surface','')).endswith('Terrain'))
  levels=[]
  for y,k in sorted(c.items()):
   if k>=6 and all(abs(y-q)>.3 for q in levels):levels.append(y)
  for y in levels:views.append({'name':'inside:%.1f'%y,'hide':[roof],'upper':{'re':up,'max':y+.45},'clip':{'re':clip,'z':y+lift}})
 return views

def summary(fights):
 from collections import Counter
 c=Counter(f['kind'] for f in fights);objs=Counter(tuple(sorted((f['a'],f['b']))) for f in fights)
 return {'fights':len(fights),'byKind':dict(c),'area':round(sum(f['area'] for f in fights),4),'topPairs':[[list(k),v] for k,v in objs.most_common(12)]}

def fix(fights,push=PUSH,nodes=None):
 """Separate each visible fight by moving one face PUSH (1.5 cm). Rules:
  same-facing: at floor level a walk surface wins (the other face drops behind it); otherwise the smaller face
               steps out along its normal (the overlay gains thickness);
  open-shell / opposite contact: a thin sheet steps away from the other face; a volume face moves into the
               other solid (interpenetration hides both faces, no gap opens);
  zero-thickness: the box is thickened outward.
 Walk surfaces and faces larger than BIGFACE are never moved; if neither face may move the fight is reported."""
 disp={};moved=[];skipped=[];dele=[]
 def area(name,pi):return bpy.data.objects[name].data.polygons[pi].area
 for f in fights:
  A,B=f['a'],f['b'];n=Vector(f['n']);N={'a':n*f['sa'],'b':n*f['sb']}
  sup={'a':is_support(A),'b':is_support(B)};big={'a':area(A,f['pa'])>BIGFACE,'b':area(B,f['pb'])>BIGFACE};thick={'a':f['thickA'],'b':f['thickB']}
  closed={'a':f['closedA'],'b':f['closedB']};other=lambda k:'b' if k=='a' else 'a'
  small='a' if area(A,f['pa'])<=area(B,f['pb']) else 'b'
  if f['kind']=='same-facing':pref=small if sup['a']==sup['b'] else ('b' if sup['a'] else 'a')
  elif f['kind']=='open-shell':pref=small if closed['a']==closed['b'] else ('a' if not closed['a'] else 'b')
  else:pref=small
  m=None
  if f['kind']=='same-facing' and sup['a'] and sup['b']:
   # two walk surfaces on one plane (a floor laid twice): delete a duplicate face only when the other covers it
   # completely, so every support height and support area stays exactly as it was
   # keep the face nearer the viewer (the one support rays reach first): delete the one behind it
   off={'a':f['da']*f['sa'],'b':f['db']*f['sb']}
   k='a' if off['a']<off['b']-1e-6 else ('b' if off['b']<off['a']-1e-6 else small)
   nm,pi=(A,f['pa']) if k=='a' else (B,f['pb'])
   if f['area']>=.98*area(nm,pi):dele.append((nm,pi));moved.append(('delete',nm,pi));continue   # fully covered by the front face
   skipped.append(f);continue
  def near_walk(k):
   # refuse a push that brings a face closer to a navigation stance's capsule (a vertical segment from 0.24 to
   # 1.66 above the stance) when the face is within 1 m of it: the measured walk space must not shrink
   if not nodes:return False
   dv=N[k]
   if f['kind']=='open-shell' and (f['thickA'] if k=='a' else f['thickB'])<.01:dv=N[other(k)]
   if f['kind']=='same-facing' and sup[other(k)] and N[k].z>.7:dv=-N[k]
   o=bpy.data.objects[A if k=='a' else B];c=o.matrix_world@o.data.polygons[f['pa'] if k=='a' else f['pb']].center
   c2=c+dv*push
   def dist(p,q):
    zc=min(max(p.z,q[2]+.24),q[2]+1.66);return ((p.x-q[0])**2+(p.y-q[1])**2+(p.z-zc)**2)**.5
   for q in nodes:
    if abs(c.x-q[0])>1.2 or abs(c.y-q[1])>1.2:continue
    d0=dist(c,q)
    if d0<1.0 and dist(c2,q)<d0-1e-6:return True
   return False
  for k in (pref,other(pref)):
   if not sup[k] and not big[k] and not near_walk(k):m=k;break
  if m is None and f['kind']=='same-facing':
   for k in (pref,other(pref)):
    if not sup[k] and sup[other(k)] and N[k].z>.7:m=k;break      # a floor always wins, even over a large face
  if m is None:
   for k in (small,other(small)):
    if not sup[k] and not near_walk(k):m=k;break                   # two large faces: the smaller one still yields
  if m is None:skipped.append(f);continue
  o_=other(m)
  if f['kind']=='same-facing':
   d=-N[m]*push if (sup[o_] and N[m].z>.7) else N[m]*push
  elif f['kind']=='open-shell':
   d=(N[o_] if thick[m]<.01 else N[m])*push
  else:d=N[m]*push
  name,pi=(A,f['pa']) if m=='a' else (B,f['pb'])
  o=bpy.data.objects[name];dl=o.matrix_world.inverted().to_3x3()@d
  for vi in o.data.polygons[pi].vertices:
   cur=disp.setdefault((name,vi),Vector())
   for k in range(3):
    if abs(dl[k])>abs(cur[k]):cur[k]=dl[k]
  moved.append((name,pi,f['kind'],tuple(round(c,2) for c in (o.matrix_world@o.data.polygons[pi].center))))
 for (name,vi),dv in disp.items():bpy.data.objects[name].data.vertices[vi].co+=dv
 for o in {bpy.data.objects[n] for n,_ in disp}:o.data.update()
 byobj={}
 for name,pi in dele:byobj.setdefault(name,set()).add(pi)
 for name,ids in byobj.items():
  o=bpy.data.objects[name];bm=bmesh.new();bm.from_mesh(o.data);bm.faces.ensure_lookup_table()
  bmesh.ops.delete(bm,geom=[bm.faces[i] for i in sorted(ids) if i<len(bm.faces)],context='FACES_ONLY');bm.to_mesh(o.data);bm.free();o.data.update()
 return moved,skipped

def _inside(pt,poly):
 x,y=pt;c=False;j=len(poly)-1
 for i in range(len(poly)):
  xi,yi=poly[i];xj,yj=poly[j]
  if (yi>y)!=(yj>y) and x<(xj-xi)*(y-yi)/(yj-yi)+xi:c=not c
  j=i
 return c

def carve(fights):
 """Second stage for pairs the push could not separate: cut the covered part out of the face behind (the one
 further back along its normal; on an exact tie the non-walk face, else the larger face, so a floor or an inlay
 stays visible) and delete it; a sheet lying back to back with a solid's face loses the part over that face. Nothing moves, so every surface height stays exactly where it was; the union of the
 two faces is unchanged. A walk surface is never opened under a non-walk face (a rug keeps its floor), so every
 walkable area still has a walk surface on top. The face behind is triangulated first so every cut piece is
 convex and lies wholly inside or outside the front face."""
 jobs={};skipped=[]
 other=lambda k:'b' if k=='a' else 'a'
 for f in fights:
  A,B=f['a'],f['b'];O={'a':bpy.data.objects[A],'b':bpy.data.objects[B]};P={'a':f['pa'],'b':f['pb']}
  sup={'a':is_support(A),'b':is_support(B)};off={'a':f['da']*f['sa'],'b':f['db']*f['sb']}
  ar={k:O[k].data.polygons[P[k]].area for k in 'ab'}
  if f['kind']=='open-shell' and f['closedA']!=f['closedB']:
   # a sheet back to back with a solid's face: its front looks into the solid, its back fights the face
   rear='a' if not f['closedA'] else 'b'
  elif f['kind']!='same-facing':skipped.append(f);continue
  elif abs(off['a']-off['b'])>1e-6:rear='a' if off['a']<off['b'] else 'b'
  elif sup['a']!=sup['b']:rear='a' if not sup['a'] else 'b'   # one plane, one walk surface: the walk surface stays
  else:rear='a' if (ar['a'],A,P['a'])>(ar['b'],B,P['b']) else 'b'
  front=other(rear)
  if sup[rear] and not sup[front]:skipped.append(f);continue
  o=O[front];cutter=[o.matrix_world@o.data.vertices[i].co for i in o.data.polygons[P[front]].vertices]
  nw=Vector(f['n'])*f['s'+rear]
  jobs.setdefault((O[rear].name,P[rear]),[]).append((cutter,nw))
 carved=[]
 byobj={}
 for (name,pi),cs in jobs.items():byobj.setdefault(name,{})[pi]=cs
 for name,m in byobj.items():
  o=bpy.data.objects[name];inv=o.matrix_world.inverted();i3=inv.to_3x3()
  bm=bmesh.new();bm.from_mesh(o.data);bm.faces.ensure_lookup_table()
  lay=bm.faces.layers.int.new('carve_rid')
  for g in bm.faces:g[lay]=-1
  for pi in m:bm.faces[pi][lay]=pi
  bmesh.ops.triangulate(bm,faces=[bm.faces[pi] for pi in m])
  loose=set()
  for pi,cs in m.items():
   for cutter,nw in cs:
    d=(i3@nw).normalized();C=[inv@p for p in cutter]
    for j in range(len(C)):
     e=C[j]-C[j-1];pn=e.cross(d)
     if pn.length<1e-9:continue
     pn.normalize();fs=[g for g in bm.faces if g[lay]==pi]
     if not fs:break
     geom=list(set(fs)|{x for g in fs for x in g.edges}|{x for g in fs for x in g.verts})
     bmesh.ops.bisect_plane(bm,geom=geom,dist=1e-6,plane_co=C[j],plane_no=pn)
    u=d.orthogonal().normalized();v=d.cross(u);poly=[(p.dot(u),p.dot(v)) for p in C]
    kill=[]
    for g in bm.faces:
     if g[lay]!=pi:continue
     c=g.calc_center_median()
     if _inside((c.dot(u),c.dot(v)),poly):kill.append(g)
    for g in kill:loose.update(g.edges)
    if kill:bmesh.ops.delete(bm,geom=kill,context='FACES_ONLY');carved.append((name,pi,len(kill)))
  le=[e for e in loose if e.is_valid and not e.link_faces]
  if le:bmesh.ops.delete(bm,geom=le,context='EDGES')
  lv=[x for x in bm.verts if not x.link_edges]
  if lv:bmesh.ops.delete(bm,geom=lv,context='VERTS')
  bm.faces.layers.int.remove(lay)
  bm.to_mesh(o.data);bm.free();o.data.update()
 return carved,skipped

def apply_modifiers(objs):
 for o in objs:
  if o.type!='MESH' or not o.modifiers:continue
  if o.data.users>1:o.data=o.data.copy()
  bpy.context.view_layer.objects.active=o
  for m in list(o.modifiers):
   try:bpy.ops.object.modifier_apply(modifier=m.name)
   except Exception:pass
