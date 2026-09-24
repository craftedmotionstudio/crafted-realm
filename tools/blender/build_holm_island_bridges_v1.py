"""Tutor's Holm creek crossings (finish goal M4.1, Sept 13 base): an original timber teaching bridge and an
arched stone village bridge, built to the deck tiles measured from the terrain (docs/rebuild/holm-overhaul/
island-bridges.json). Each GLB's origin is the bridge's world centre at y=0, so the runtime places it at
(cx, 0, cz); deck heights are world heights. Both run east-west (along game x). Game (x,y,z) -> Blender (x,-z,y).
"""
import bpy,bmesh,json,math,random
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
DATA=json.loads((ROOT/'docs/rebuild/holm-overhaul/island-bridges.json').read_text())
OUT=ROOT/'.studio-workspaces/holm-island-bridges-v1/candidates';OUT.mkdir(parents=True,exist_ok=True)
PROOF=ROOT/'scratchpad/holm_island_bridges_v1';PROOF.mkdir(parents=True,exist_ok=True)
def material(name,c):
 m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.diffuse_color=(*c,1);return m
def build(br):
 bpy.ops.wm.read_factory_settings(use_empty=True)
 wood=material('Weathered oak',(.36,.24,.14));wood_dark=material('Oak shade',(.27,.18,.10));wood_light=material('Oak lit',(.44,.31,.18))
 rope=material('Hemp rope',(.55,.47,.32));stone=material('Village stone',(.50,.50,.46));stone_light=material('Dressed stone',(.60,.58,.52))
 stone_dark=material('Stone shade',(.40,.40,.37));moss=material('Moss',(.26,.33,.13))
 t=br['tiles'];x0=br['ends'][0][0];x1=br['ends'][1][0]+1;xw0=t[0][0];xw1=t[-1][0]+1;cz=t[0][1]+.5;cx=(x0+x1)/2
 dy=br['deckY'];e0,e1=br['endY'];bed=br['bedY'];rng=random.Random(br['id'])
 root=bpy.data.objects.new('IslandBridge_'+br['id'],None);bpy.context.collection.objects.link(root)
 def mesh(name,v,f,mat):
  d=bpy.data.meshes.new(name);d.from_pydata([(x-cx,-(z-cz),y) for x,y,z in v],[],f);d.update()
  o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.parent=root;o.data.materials.append(mat)
  bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(d);bm.free();return o
 def box(name,xa,xb,ya,yb,za,zb,mat):return mesh(name,[(xa,ya,za),(xb,ya,za),(xb,yb,za),(xa,yb,za),(xa,ya,zb),(xb,ya,zb),(xb,yb,zb),(xa,yb,zb)],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],mat)
 def slab(name,xa,xb,ya,yb,za,zb,th,mat):   # a sloped plank from (xa,ya) to (xb,yb), thickness th, across z za..zb
  return mesh(name,[(xa,ya-th,za),(xb,yb-th,za),(xb,yb,za),(xa,ya,za),(xa,ya-th,zb),(xb,yb-th,zb),(xb,yb,zb),(xa,ya,zb)],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],mat)
 def top(x):   # walking surface height along the bridge: ramps over the bank tiles, level over the water
  if x<=xw0:return e0+(dy-e0)*(x-x0)/(xw0-x0)
  if x>=xw1:return dy+(e1-dy)*(x-xw1)/(x1-xw1)
  return dy
 if br['id'].startswith('timber'):
  # planks across the span, each its own board with a gap, a little twist and a shade
  x=x0+.02
  while x<x1-.05:
   w=rng.uniform(.19,.24);xa,xb=x,min(x1-.02,x+w)
   slab('BridgePlank',xa,xb,top(xa)+rng.uniform(-.008,.008),top(xb)+rng.uniform(-.008,.008),cz-.78-rng.uniform(0,.05),cz+.78+rng.uniform(0,.05),.07,rng.choice([wood,wood,wood_light,wood_dark]))
   x=xb+.035
  for s in (-.55,.55):   # log stringers under the deck
   for a,b in [(x0,xw0),(xw0,xw1),(xw1,x1)]:slab('BridgeStringer',a,b,top(a)-.07,top(b)-.07,cz+s-.09,cz+s+.09,.16,wood_dark)
  posts=sorted(set([x0+.1,xw0,xw1,x1-.1]+[float(tx) for tx,_ in t[1:]]))
  for px in posts:
   base=bed-.25 if xw0-.01<=px<=xw1+.01 else top(px)-.35
   for s in (-.82,.82):
    box('BridgePost',px-.07,px+.07,base,top(px)+1.0,cz+s-.07,cz+s+.07,wood_dark)
    box('BridgePostCap',px-.09,px+.09,top(px)+1.0,top(px)+1.06,cz+s-.09,cz+s+.09,wood)
    if xw0-.01<=px<=xw1+.01:box('BridgePostWrap',px-.08,px+.08,bed+.15,bed+.27,cz+s-.08,cz+s+.08,rope)   # rope lashing at the waterline
  for a,b in zip(posts,posts[1:]):
   for s in (-.82,.82):
    for h in (.5,.92):slab('BridgeRail',a,b,top(a)+h+.035,top(b)+h+.035,cz+s-.035,cz+s+.035,.07,wood if h>.6 else wood_dark)
   if xw0-.01<=a and b<=xw1+.01:   # X braces between the water posts, below the deck
    for s in (-.82,.82):
     for ya,yb in [(bed,dy-.2),(dy-.2,bed)]:slab('BridgeBrace',a+.07,b-.07,ya+.04,yb+.04,cz+s-.035,cz+s+.035,.08,wood_dark)
 else:
  # stone: rubble body with one arch over the water, extruded across the bridge width
  prof=[(x0,bed-.3),(xw0-.05,bed-.3)]
  am=(xw0+xw1)/2;ar=(xw1-xw0)/2+.05;apex=dy-.32;n=10
  for i in range(n+1):
   a=math.pi*(1-i/n);prof.append((am+math.cos(a)*ar,bed+math.sin(a)*(apex-bed)))
  prof+=[(xw1+.05,bed-.3),(x1,bed-.3),(x1,e1-.02),(xw1,dy),(xw0,dy),(x0,e0-.02)]
  v=[(x,y,cz-.95) for x,y in prof]+[(x,y,cz+.95) for x,y in prof];m=len(prof)
  f=[tuple(range(m-1,-1,-1)),tuple(range(m,2*m))]+[(i,(i+1)%m,(i+1)%m+m,i+m) for i in range(m)]
  body=mesh('BridgeBody',v,f,stone)
  # coursed rubble relief on both faces (the Sept 13 gray-masonry language), cut around the arch
  def in_arch(x,y):return abs(x-am)<ar+.05 and y<bed+math.sqrt(max(0,1-((x-am)/(ar+.26))**2))*(apex-bed+.26)
  for side,dz in ((-.95,-1),(.95,1)):
   row=0;y=bed-.3
   while y<dy-.05:
    h=rng.uniform(.26,.34);x=x0+(.18 if row%2 else 0)
    while x<x1-.05:
     w=rng.uniform(.42,.7);xa,xb=x+.02,min(x1-.02,x+w)-.02;ya,yb=y+.02,y+h-.02
     lim=min(top(xa),top(xb))-.04
     if yb>lim:yb=lim
     if xb-xa>.12 and yb-ya>.1 and not in_arch((xa+xb)/2,(ya+yb)/2):
      zf=cz+side;o=.03*dz;c=.03
      mesh('BridgeStone',[(xa,ya,zf),(xb,ya,zf),(xb,yb,zf),(xa,yb,zf),(xa+c,ya+c,zf+o),(xb-c,ya+c,zf+o),(xb-c,yb-c,zf+o),(xa+c,yb-c,zf+o)],
       [(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],rng.choice([stone,stone,stone_light,stone_dark]))
     x+=w
    y+=h;row+=1
  # arch ring stones on both faces and a keystone
  for side in (-.97,.97):
   for i in range(n):
    a0=math.pi*(1-i/n);a1=math.pi*(1-(i+1)/n);r0,r1=ar,ar+.22
    pts=[(am+math.cos(a0)*r0,bed+math.sin(a0)*(apex-bed)),(am+math.cos(a1)*r0,bed+math.sin(a1)*(apex-bed)),(am+math.cos(a1)*r1,bed+math.sin(a1)*(apex-bed+.22)),(am+math.cos(a0)*r1,bed+math.sin(a0)*(apex-bed+.22))]
    zz=cz+side;dz=.03 if side>0 else -.03
    mesh('BridgeVoussoir',[(p[0],p[1],zz) for p in pts]+[(p[0],p[1],zz+dz) for p in pts],[(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],stone_light if i%2 else stone_dark)
  # parapets following the ramps, with a coping and stepped end piers
  segs=[(x0,xw0),(xw0,xw1),(xw1,x1)]
  for s in (-.8,.8):
   for a,b in segs:
    # two courses of laid stones, each block its own shade, following the ramp; coping on top
    for course in range(2):
     x=a+(.2 if course else 0)
     while x<b-.04:
      w=rng.uniform(.38,.6);xa,xb=x,min(b,x+w)
      slab('BridgeParapet',xa+.015,xb-.015,top(xa)+.27*(course+1)-.01,top(xb)+.27*(course+1)-.01,cz+s-.14-rng.uniform(0,.02),cz+s+.14+rng.uniform(0,.02),.25,rng.choice([stone,stone,stone_light,stone_dark]))
      x=xb
     if course==0 and a>x0:slab('BridgeParapet',a,min(b,a+.2),top(a)+.26,top(min(b,a+.2))+.26,cz+s-.14,cz+s+.14,.25,stone)
    slab('BridgeParapetCore',a,b,top(a)+.5,top(b)+.5,cz+s-.11,cz+s+.11,.5,stone_dark)
    slab('BridgeCoping',a-.02,b+.02,top(a)+.63,top(b)+.63,cz+s-.18,cz+s+.18,.08,stone_light)
   for px in (x0+.18,x1-.18):box('BridgePier',px-.2,px+.2,top(px)-.1,top(px)+.8,cz+s-.2,cz+s+.2,stone_dark)
  # a cobbled deck: small setts laid in rows along the walking line
  x=x0+.05
  while x<x1-.1:
   w=rng.uniform(.22,.3);zc=cz-.6
   while zc<cz+.6:
    h=rng.uniform(.18,.26);xa,xb=x,min(x1-.05,x+w)
    slab('BridgeSett',xa,xb,top(xa)+.035,top(xb)+.035,zc,min(cz+.62,zc+h),.05,rng.choice([stone,stone_light,stone_dark]))
    zc+=h+.03
   x+=w+.03
  for mx,mz in [(x0+.3,cz-.7),(x1-.4,cz+.75),(xw0-.1,cz+.9)]:box('BridgeMoss',mx-.15,mx+.15,top(mx)+.56,top(mx)+.6,mz-.08,mz+.08,moss)
 for o in [o for o in bpy.context.scene.objects if o.type=='MESH']:
  bpy.context.view_layer.objects.active=o
  for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
 parts=[o for o in bpy.context.scene.objects if o.type=='MESH']
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();parts[0].name='BridgeBody'
 out=OUT/br['id']
 bpy.ops.wm.save_as_mainfile(filepath=str(out.with_suffix('.blend')))
 bpy.ops.export_scene.gltf(filepath=str(out.with_suffix('.glb')),export_format='GLB',export_yup=True)
 tris=sum(len(p.vertices)-2 for p in parts[0].data.polygons)
 # proof render
 sc=bpy.context.scene;sc.render.engine='BLENDER_WORKBENCH';sc.display.shading.light='STUDIO';sc.display.shading.color_type='MATERIAL';sc.render.resolution_x=900;sc.render.resolution_y=600
 cam=bpy.data.objects.new('C',bpy.data.cameras.new('C'));sc.collection.objects.link(cam);sc.camera=cam;cam.data.lens=35
 from mathutils import Vector
 e=Vector((3.5,-5.5,dy+3.2));tg=Vector((0,0,dy-.3));cam.location=e;cam.rotation_euler=(tg-e).to_track_quat('-Z','Y').to_euler()
 sc.render.filepath=str(PROOF/(br['id']+'.png'));bpy.ops.render.render(write_still=True)
 return {'id':br['id'],'file':out.with_suffix('.glb').name,'centre':[cx,0,cz],'triangles':tris}
report=[build(b) for b in DATA['bridges']]
(OUT/'manifest.json').write_text(json.dumps({'schema':'holm-island-bridges-models-v1','bridges':report},indent=1))
print('[ISLAND_BRIDGES]',json.dumps(report))
