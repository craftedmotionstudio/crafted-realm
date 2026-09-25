"""Relief chart of Tutor's Holm for the guide-house chart table (interiors pass 2026-09-25).

The island is taken from its own terrain: contour lines of the Sept 13 terrain bundle (marching squares on the
real heightfield) become stacked, painted terrace plates, like a carved and painted table relief. Sea, shallows,
the creek, worn paths, bridges, trees from the habitat study and small models of every building sit at their
real island positions (building placements from the measured navigation files). A compass rose, walnut frame
and a brass name plate finish it. Original design.
"""
import bpy,bmesh,json,math,random
from pathlib import Path
from mathutils import Vector
from holm_interior_kit import Acc,M

def _dp(pts,tol):
 """Douglas-Peucker on an open polyline."""
 if len(pts)<3:return pts
 a,b=Vector(pts[0]),Vector(pts[-1]);ab=b-a;best=-1;idx=0
 for i in range(1,len(pts)-1):
  p=Vector(pts[i])
  d=(p-a).length if ab.length<1e-9 else abs(ab.x*(a.y-p.y)-ab.y*(a.x-p.x))/ab.length
  if d>best:best=d;idx=i
 if best<=tol:return [pts[0],pts[-1]]
 return _dp(pts[:idx+1],tol)[:-1]+_dp(pts[idx:],tol)
def _simplify_loop(loop,tol):
 n=len(loop)
 if n<8:return loop
 # split the closed loop at its two farthest-apart points
 i0=0;i1=max(range(n),key=lambda i:(Vector(loop[i])-Vector(loop[0])).length)
 a=_dp(loop[i0:i1+1],tol);b=_dp(loop[i1:]+[loop[0]],tol)
 return a[:-1]+b[:-1]
def _area(loop):return .5*sum(loop[i][0]*loop[(i+1)%len(loop)][1]-loop[(i+1)%len(loop)][0]*loop[i][1] for i in range(len(loop)))

def contours(H,W,D,L):
 """Closed contour loops (tile coords) of the heightfield H[z][x] (vertices 0..W, 0..D) at level L."""
 def h(x,z):return H[z][x] if 0<=x<=W and 0<=z<=D else -99.0
 def pt(e):
  k,x,z=e
  if k=='h':a,b=h(x,z),h(x+1,z);t=(L-a)/(b-a) if b!=a else .5;return (x+t,z)
  a,b=h(x,z),h(x,z+1);t=(L-a)/(b-a) if b!=a else .5;return (x,z+t)
 adj={}
 def seg(e1,e2):adj.setdefault(e1,[]).append(e2);adj.setdefault(e2,[]).append(e1)
 for z in range(-1,D+1):
  for x in range(-1,W+1):
   a,b,c,d=h(x,z),h(x+1,z),h(x+1,z+1),h(x,z+1)
   i=(a>L)*8+(b>L)*4+(c>L)*2+(d>L)
   if i in (0,15):continue
   T,R,B,Lf=('h',x,z),('v',x+1,z),('h',x,z+1),('v',x,z)
   ctr=(a+b+c+d)/4>L
   table={1:[(Lf,B)],2:[(B,R)],3:[(Lf,R)],4:[(T,R)],6:[(T,B)],7:[(Lf,T)],8:[(Lf,T)],9:[(T,B)],11:[(T,R)],12:[(Lf,R)],13:[(B,R)],14:[(Lf,B)],
    5:[(Lf,T),(B,R)] if ctr else [(T,R),(Lf,B)],10:[(T,R),(Lf,B)] if ctr else [(Lf,T),(B,R)]}
   for e1,e2 in table[i]:seg(e1,e2)
 loops=[];seen=set()
 for start in list(adj):
  if start in seen:continue
  loop=[start];seen.add(start);prev=None;cur=start
  while True:
   nxt=[e for e in adj[cur] if e!=prev and e not in seen]
   if not nxt:break
   prev,cur=cur,nxt[0];seen.add(cur);loop.append(cur)
  if len(loop)>3:loops.append([pt(e) for e in loop])
 return loops

def build(B):
 root=B['ROOT'];parent=B['root']
 # ---- where the chart lies: on the chart table, house-local plan coordinates
 CX,CZ,TOP=B['CHART_X'],B['CHART_Z'],B['CHART_TOP']
 OW,OD=1.86,1.30;BAR=.075;IW,ID=OW-2*BAR,OD-2*BAR
 bundle=json.loads((root/'.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json').read_text())
 W,D=bundle['width'],bundle['depth'];Hf=bundle['heights'];H=[Hf[z*(W+1):(z+1)*(W+1)] for z in range(D+1)]
 s=min(IW/(W-4),ID/(D-4));DX=.12
 def P(tx,tz):return (CX+DX+(tx-W/2)*s,CZ+(tz-D/2)*s)
 def hat(tx,tz):
  x=min(W-1e-6,max(0,tx));z=min(D-1e-6,max(0,tz));x0,z0=int(x),int(z);fx,fz=x-x0,z-z0
  return (H[z0][x0]*(1-fx)*(1-fz)+H[z0][x0+1]*fx*(1-fz)+H[z0+1][x0]*(1-fx)*fz+H[z0+1][x0+1]*fx*fz)
 # palette: related tones per family (sRGB display values)
 sea=M('Chart sea deep','#2e5a84');sea2=M('Chart sea shallows','#6f9fc0');foam=M('Chart surf line','#c9dcd6')
 sand=M('Chart sand','#d6c28a')
 lands=[(0.0,.006,sand),(1.3,.013,M('Chart meadow','#9cb363')),(3.0,.022,M('Chart pasture','#7c9a4b')),(5.0,.032,M('Chart woodland','#5d7c3d')),
        (7.0,.044,M('Chart heath brown','#8c7a50')),(9.5,.057,M('Chart upland stone','#9f927a')),(12.0,.070,M('Chart crown stone','#c3b99d'))]
 side=M('Chart relief edge','#6b5238');board=M('Chart board','#8a6a45')
 walnut=M('Chart frame walnut','#4b3120');walnut2=M('Chart frame lip','#6d4a2c');brass=M('Chart brass','#b89a4c');ink=M('Chart ink','#34261a')
 path1=M('Chart path','#e6d7a6');path2=M('Chart lane','#cdbb88');creek=M('Chart creek','#3f7fb0')
 wall=M('Chart model plaster','#efe4c4');roof=M('Chart model clay roof','#a8472f');roof2=M('Chart model thatch','#c09a45');slate=M('Chart model slate','#56606b')
 grey=M('Chart model stone','#9a968c');grey2=M('Chart model dark stone','#66625b');tower=M('Chart model tower blue','#5b5e93');lamp=M('Chart model lamp','#f2c24a',emit=.6)
 red=M('Chart model red band','#b3392c');wood=M('Chart model timber','#6b4a2c');dark=M('Chart model doorway','#221c17')
 treeG=[M('Chart tree green','#4f7536'),M('Chart tree deep green','#3f5f2e'),M('Chart tree olive','#6a8440')]
 rose1=M('Chart rose ivory','#efe5c8');rose2=M('Chart rose umber','#5a4431')
 A=Acc('GroundFurnishingChart');base=TOP
 # ---- frame and board
 A.box(CX-OW/2,CX+OW/2,base,base+.02,CZ-OD/2,CZ+OD/2,board,skip='b')
 yS=base+.02
 for x0,x1,z0,z1 in [(-OW/2,OW/2,-OD/2,-OD/2+BAR),(-OW/2,OW/2,OD/2-BAR,OD/2),(-OW/2,-OW/2+BAR,-OD/2+BAR,OD/2-BAR),(OW/2-BAR,OW/2,-OD/2+BAR,OD/2-BAR)]:
  A.box(CX+x0,CX+x1,base,base+.055,CZ+z0,CZ+z1,walnut,skip='b')
 for x0,x1,z0,z1 in [(-IW/2,IW/2,-ID/2,-ID/2+.018),(-IW/2,IW/2,ID/2-.018,ID/2),(-IW/2,-IW/2+.018,-ID/2,ID/2),(IW/2-.018,IW/2,-ID/2,ID/2)]:
  A.box(CX+x0,CX+x1,yS,yS+.035,CZ+z0,CZ+z1,walnut2,skip='b')
 # corner brass caps
 for sx in (-1,1):
  for sz in (-1,1):A.box(CX+sx*OW/2-(.09 if sx>0 else 0),CX+sx*OW/2+(0 if sx>0 else .09),base+.055,base+.061,CZ+sz*OD/2-(.09 if sz>0 else 0),CZ+sz*OD/2+(0 if sz>0 else .09),brass,skip='b')
 # sea plate
 ySea=yS+.004;A.box(CX-IW/2+.018,CX+IW/2-.018,yS,ySea,CZ-ID/2+.018,CZ+ID/2-.018,sea,skip='b')
 A.build(parent)
 # ---- terraces from the terrain's own contours
 bm=bmesh.new();mats=[sea2,foam]+[m for _,_,m in lands]+[side];mi={m.name:i for i,m in enumerate(mats)}
 levels=[(-0.9,.0015,sea2),(-0.25,.0028,foam)]+lands
 prev_y=0.0;count={}
 for L,top,m in levels:
  y=ySea+top;loops=[]
  for lp in contours(H,W,D,L):
   lp=_simplify_loop(lp,.35)
   if len(lp)>=3 and abs(_area(lp))>2.5:loops.append(lp)
  count[m.name]=len(loops)
  vs_all=[];edges=[]
  for lp in loops:
   vs=[bm.verts.new((P(tx,tz)[0],-P(tx,tz)[1],y)) for tx,tz in lp];vs_all.append(vs)
   for i in range(len(vs)):edges.append(bm.edges.new((vs[i],vs[(i+1)%len(vs)])))
  if edges:
   res=bmesh.ops.triangle_fill(bm,use_beauty=True,use_dissolve=False,edges=edges,normal=(0,0,1))
   for f in res['geom']:
    if isinstance(f,bmesh.types.BMFace):f.material_index=mi[m.name]
  # side walls down to the level below (the relief edge reads as carved board)
  for vs in vs_all:
   for i in range(len(vs)):
    a,b=vs[i],vs[(i+1)%len(vs)]
    a2=bm.verts.new((a.co.x,a.co.y,ySea+prev_y));b2=bm.verts.new((b.co.x,b.co.y,ySea+prev_y))
    f=bm.faces.new((a,b,b2,a2));f.material_index=mi[(side if m not in (sea2,foam) else m).name]
  prev_y=top
 R=Acc('GroundFurnishingChartRelief')
 for f in bm.faces:
  R.poly([(v.co.x,v.co.z,-v.co.y) for v in f.verts],[tuple(range(len(f.verts)))],mats[f.material_index])
 bm.free();R.build(parent)
 def ytop(tx,tz):
  h=hat(tx,tz);t=0 if h<-.9 else .0015
  for L,top,_ in levels:
   if h>=L:t=top
  return ySea+t
 A=Acc('GroundFurnishingChartDetail')
 def ribbon(pts,width,m,lift=.0015,step=2.0):
  sm=[]
  for (x0,z0),(x1,z1) in zip(pts,pts[1:]):
   n=max(1,int(math.hypot(x1-x0,z1-z0)/step))
   for i in range(n):sm.append((x0+(x1-x0)*i/n,z0+(z1-z0)*i/n))
  sm.append(pts[-1])
  for (x0,z0),(x1,z1) in zip(sm,sm[1:]):
   y=max(ytop(x0,z0),ytop(x1,z1))+lift;(a,b),(c,d)=P(x0,z0),P(x1,z1);L=math.hypot(c-a,d-b)
   if L<1e-6:continue
   nx,nz=-(d-b)/L*width/2,(c-a)/L*width/2
   A.poly([(a+nx,y,b+nz),(c+nx,y,d+nz),(c-nx,y,d-nz),(a-nx,y,b-nz)],[(0,1,2,3)],m)
 plan=json.loads((root/'docs/rebuild/holm-overhaul/plan.json').read_text())
 ribbon([(p[0],p[1]) for p in bundle['creek']['points']],.011,creek,step=1.5)
 for p in plan['paths']:ribbon([tuple(q) for q in p['points']],.0075 if p['kind']=='primary' else .0055,path1 if p['kind']=='primary' else path2)
 ribbon([(61,118),(61,114),(66,114),(66,104)],.0075,path1)
 for br in plan['bridges']:
  x,z=P(br['x'],br['z']);y=ytop(br['x'],br['z'])+.004
  A.box(x-2.2*s,x+2.2*s,y,y+.004,z-.9*s,z+.9*s,wood)
 # ---- building models at the measured placements (world tiles)
 WS=root/'.studio-workspaces'
 def nav(ws):
  try:return json.loads((WS/ws/'candidates/navigation.json').read_text())['placement']
  except Exception:return None
 places={p['id']:p for p in plan['places']}
 def house(tx,tz,w,d,h,rh,rm,wm=wall,chimney=False,rot=0.0):
  x,z=P(tx,tz);y=ytop(tx,tz);ww,dd=w*s,d*s
  A.rbox(x,z,ww,dd,y,y+h,rot,wm,skip='b')
  c,sn=math.cos(rot),math.sin(rot)
  def Q(a,b,yy):return (x+a*c+b*sn,yy,z-a*sn+b*c)
  hw,hd=ww/2+.004,dd/2+.004
  V=[Q(-hw,-hd,y+h),Q(hw,-hd,y+h),Q(hw,hd,y+h),Q(-hw,hd,y+h),Q(0,-hd,y+h+rh),Q(0,hd,y+h+rh)]
  A.poly(V,[(0,4,5,3),(1,2,5,4),(0,1,4),(3,5,2)],rm)
  if chimney:A.rbox(x+(-ww*.3)*c,z-(-ww*.3)*sn,.012,.012,y+h,y+h+rh*1.1,rot,grey)
  return y
 g=house(66,99,12,10,.03,.026,roof,chimney=True)                                    # Guide House (you are here)
 A.lathe(P(66,99)[0],P(66,99)[1],g+.075,[(.006,0),(.012,.012),(0,.024)],6,M('Chart marker pin','#c8342a'),top=False)
 A.tube((P(66,99)[0],g+.03,P(66,99)[1]),(P(66,99)[0],g+.078,P(66,99)[1]),.0025,4,brass)
 k=nav('holm-kitchen-navigation-v3') or {'x':44,'z':67};house(k['x'],k['z'],11,8,.026,.022,roof2,chimney=True)   # bakehouse
 q=nav('holm-quest-terrain-navigation-v1') or {'x':35,'z':51};house(q['x'],q['z'],10,8,.028,.03,slate)              # quest lodge
 bk=nav('holm-bank-navigation-v1') or {'x':86,'z':57};y=house(bk['x'],bk['z'],11,8,.028,.022,slate,wm=grey)         # bank
 A.lathe(P(bk['x'],bk['z'])[0],P(bk['x'],bk['z'])[1],y+.05,[(.008,0),(.008,.004)],8,brass)
 hv=nav('holm-haven-navigation-v1') or {'x':124,'z':103};y=house(hv['x'],hv['z'],6,5,.022,.018,roof)                 # departure haven
 hx,hz=P(hv['x'],hv['z']);A.box(hx-.006,hx+.006,ySea+.004,ySea+.009,hz+.02,hz+.075,wood)
 A.box(hx-.012,hx+.012,ySea+.004,ySea+.012,hz+.08,hz+.1,M('Chart model hull','#7a4e2c'))
 lx,lz=P(61,121);A.box(lx-.012,lx+.012,ySea+.004,ySea+.009,lz-.01,lz+.03,wood)                                          # arrival dock
 # quarry gate: a dark doorway in a rock knoll with a winch frame
 qy=nav('holm-quarry-navigation-v1') or {'x':36,'z':33};x,z=P(qy['x'],qy['z']);y=ytop(qy['x'],qy['z'])
 A.lathe(x,z,y,[(.05,0),(.045,.018),(.025,.036),(0,.042)],7,grey2,top=False)
 A.box(x-.012,x+.012,y,y+.022,z+.036,z+.046,dark,skip='b')
 A.beam((x-.02,y+.035,z+.03),(x+.02,y+.035,z+.03),.004,.004,wood)
 # warden's keep: curtain block, four corner towers and a tall keep tower
 kp=nav('holm-keep-navigation-v4') or {'x':87,'z':35};x,z=P(kp['x'],kp['z']);y=ytop(kp['x'],kp['z']);w,d=20*s/2,18*s/2
 A.box(x-w,x+w,y,y+.03,z-d,z+d,grey,skip='b')
 for sx in (-1,1):
  for sz in (-1,1):A.lathe(x+sx*w,z+sz*d,y,[(.022,0),(.022,.05),(.027,.05),(.027,.058)],8,grey,top=True,top_m=grey2)
 A.box(x-.035,x+.035,y+.03,y+.075,z-.035,z+.035,grey,skip='b');A.box(x-.04,x+.04,y+.075,y+.082,z-.04,z+.04,grey2,skip='b')
 A.box(x-.015,x+.015,y,y+.024,z+d-.001,z+d+.004,dark)
 # mage house and its tower
 mg=nav('holm-mage-navigation-v1') or {'x':114,'z':58};y=house(mg['x']-2,mg['z']+1,8,7,.024,.02,slate);x,z=P(mg['x']+3,mg['z']-2)
 A.lathe(x,z,ytop(mg['x']+3,mg['z']-2),[(.028,0),(.026,.075),(.034,.075),(0,.12)],8,tower,top=False)
 # Lastlight lighthouse: white tower, red bands, glowing lamp
 ll=nav('holm-lastlight-navigation-v1') or {'x':121,'z':26};x,z=P(ll['x'],ll['z']);y=ytop(ll['x'],ll['z'])
 A.lathe(x,z,y,[(.03,0),(.022,.1)],8,wall,top=False)
 for yy in (.025,.065):A.lathe(x,z,y+yy,[(.03-.08*yy+.001,0),(.03-.08*(yy+.014)+.001,.014)],8,red,top=False)
 A.lathe(x,z,y+.1,[(.024,0),(.024,.006)],8,grey2,top=True);A.lathe(x,z,y+.106,[(.016,0),(.016,.022)],8,lamp,top=False)
 A.lathe(x,z,y+.128,[(.022,0),(0,.02)],8,red,top=False)
 # survival pond camp: a tent and a fire ring
 sv=nav('holm-survival-navigation-v1') or {'x':31,'z':84};x,z=P(sv['x'],sv['z']);y=ytop(sv['x'],sv['z'])
 A.poly([(x-.02,y,z-.015),(x+.02,y,z-.015),(x,y+.028,z-.015),(x-.02,y,z+.02),(x+.02,y,z+.02),(x,y+.028,z+.02)],[(0,3,5,2),(1,2,5,4),(0,2,1),(3,4,5)],M('Chart model canvas','#d9ccaa'))
 # trees from the habitat study (every fourth tree, so the chart stays legible)
 veg=json.loads((WS/'holm-habitat-v2/working/vegetation.json').read_text())
 trees=[p for p in veg['placements'] if p['asset'] in ('oak','birch','coastal-pine')][::4]
 rng=random.Random(925)
 for t in trees:
  x,z=P(t['x'],t['z']);y=ytop(t['x'],t['z']);m=treeG[rng.randrange(3)];r=.011*t.get('scale',1)
  A.lathe(x,z,y,[(r,.006),(0,.03*t.get('scale',1))] if t['asset']=='coastal-pine' else [(r*.7,.004),(r*1.1,.013),(r*.6,.026),(0,.03)],5,m,top=False,bottom=True,rot=rng.random())
 # ---- compass rose on the open sea in the south-west, and the brass name plate on the frame
 rx,rz=CX-IW/2+.17,CZ+ID/2-.17;ry=ySea+.002;R=.085
 for i in range(8):
  a=i*math.pi/4;L=R if i%2==0 else R*.6;w=.02 if i%2==0 else .014
  tip=(rx+math.sin(a)*L,ry+.001,rz-math.cos(a)*L);lft=(rx+math.sin(a-math.pi/2)*w,ry,rz-math.cos(a-math.pi/2)*w);rgt=(rx+math.sin(a+math.pi/2)*w,ry,rz-math.cos(a+math.pi/2)*w);c=(rx,ry+.007,rz)
  A.poly([c,lft,tip],[(0,1,2)],rose1 if i%2==0 else rose2);A.poly([c,tip,rgt],[(0,1,2)],rose2 if i%2==0 else rose1)
 n=16;ring=[]
 for i in range(n):
  a=2*math.pi*i/n;ring+=[(rx+math.cos(a)*R*.5,ry+.004,rz+math.sin(a)*R*.5),(rx+math.cos(a)*R*.58,ry+.004,rz+math.sin(a)*R*.58)]
 A.poly(ring,[(2*i,2*i+1,(2*i+3)%(2*n),(2*i+2)%(2*n)) for i in range(n)],brass)
 A.poly([(rx-.012,ry+.002,rz-R-.012),(rx-.006,ry+.002,rz-R-.012),(rx+.006,ry+.002,rz-R-.03),(rx+.012,ry+.002,rz-R-.03),(rx+.012,ry+.002,rz-R-.012),(rx+.006,ry+.002,rz-R-.012),(rx-.006,ry+.002,rz-R-.03),(rx-.012,ry+.002,rz-R-.03)],
        [(0,1,6,7),(1,2,6),(2,3,4,5),(1,5,2)],rose2)   # a blocky N
 # name plate on the south bar
 py=base+.055;A.box(CX-.2,CX+.2,py,py+.004,CZ+OD/2-BAR+.012,CZ+OD/2-.012,brass,skip='b')
 A.build(parent)
 # engraved lettering: Blender's own font, converted to a flat mesh
 cu=bpy.data.curves.new('ChartPlateText','FONT');cu.body="TUTOR'S HOLM";cu.size=.034;cu.align_x='CENTER';cu.align_y='CENTER';cu.extrude=0;cu.resolution_u=2;cu.fill_mode='FRONT'
 t=bpy.data.objects.new('ChartPlateTextTmp',cu);bpy.context.collection.objects.link(t)
 bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();tm=t.evaluated_get(dg).to_mesh()
 T=Acc('GroundFurnishingChartPlateText');ty=py+.0045;cz0=CZ+OD/2-BAR/2
 for f in tm.polygons:T.poly([(CX+tm.vertices[i].co.x,ty,cz0-tm.vertices[i].co.y) for i in f.vertices],[tuple(range(len(f.vertices)))],ink)
 t.evaluated_get(dg).to_mesh_clear();bpy.data.objects.remove(t,do_unlink=True);T.build(parent)
 return {'scale':s,'levels':count,'trees':len(trees)}
