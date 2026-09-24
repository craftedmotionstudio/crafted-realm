"""The Lantern Keeper: an original statue for the Holm arrival approach (owner review 5, 2026-09-24:
"unique statues that were designed"). The island's first guide, hooded, lifting a lantern toward the landing
and leaning on a crook staff, on a stepped plinth with a bronze plaque. Low-poly, hand-shaped with lathe
profiles and folded robes; weathered stone with moss. Coordinates x,z-plan,y-up mapped to Blender x,-z,y.
"""
import bpy,json,math,random,bmesh
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'.studio-workspaces/holm-arrival-statue-v1/candidates';OUT.mkdir(parents=True,exist_ok=True)
PROOF=ROOT/'scratchpad/holm_arrival_statue_v1';PROOF.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
def material(name,color,emit=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1)
 if emit:
  m.use_nodes=True;sh=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
  sh.inputs['Base Color'].default_value=(*color,1);sh.inputs['Emission Color'].default_value=(*color,1);sh.inputs['Emission Strength'].default_value=emit
 return m
stone=material('Statue stone',(.53,.53,.49));stone_dark=material('Statue stone shade',(.41,.41,.38));plinth=material('Plinth ashlar',(.60,.57,.49))
moss=material('Moss',(.25,.33,.12));bronze=material('Bronze plaque',(.42,.30,.14));iron=material('Lantern iron',(.16,.16,.15))
glow=material('Lantern glow',(1.0,.78,.35),emit=1.0)   # strength 1: no glTF emissive-strength extension (arrival validator)
root=bpy.data.objects.new('LanternKeeperStatue',None);bpy.context.collection.objects.link(root)
def mesh(name,v,f,mat):
 d=bpy.data.meshes.new(name);d.from_pydata([(x,-z,y) for x,y,z in v],[],f);d.update()
 o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.parent=root;o.data.materials.append(mat)
 bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(d);bm.free();return o
def box(name,x0,x1,y0,y1,z0,z1,mat,chamfer=0):
 o=mesh(name,[(x0,y0,z0),(x1,y0,z0),(x1,y1,z0),(x0,y1,z0),(x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],mat)
 if chamfer:b=o.modifiers.new('chamfer','BEVEL');b.width=chamfer;b.segments=1
 return o
def lathe(name,profile,n,mat,a0=0,a1=2*math.pi,fold=0,centre=(0,0,0),tilt=None,seed=1):
 # profile [(radius,y)] bottom->top; fold pushes alternate columns out (robe folds); partial arcs stay open
 rng=random.Random(seed);full=abs(a1-a0-2*math.pi)<1e-6;cols=n if full else n+1;v=[];f=[]
 for j,(r,y) in enumerate(profile):
  for i in range(cols):
   a=a0+(a1-a0)*i/n;rr=r*(1+(fold if i%2 else 0)*(1 if j<len(profile)-1 else .3))*(1+rng.uniform(-.02,.02))
   p=Vector((math.cos(a)*rr,y,math.sin(a)*rr))
   if tilt:p=tilt(p)
   v.append(tuple(p+Vector(centre)))
 for j in range(len(profile)-1):
  for i in range(n):
   i2=(i+1)%cols if full else i+1;f.append((j*cols+i,j*cols+i2,(j+1)*cols+i2,(j+1)*cols+i))
 if full:
  f.append(tuple(range(cols-1,-1,-1)))
  top=(len(profile)-1)*cols;f.append(tuple(top+i for i in range(cols)))
 return mesh(name,v,f,mat)
def tube(name,a,b,r0,r1,n,mat):
 a=Vector(a);b=Vector(b);ax=(b-a).normalized();s=ax.cross(Vector((0,1,0)))
 if s.length<.01:s=ax.cross(Vector((1,0,0)))
 s.normalize();u=ax.cross(s).normalized();v=[]
 for p,r in [(a,r0),(b,r1)]:
  for i in range(n):t=2*math.pi*i/n;v.append(tuple(p+s*math.cos(t)*r+u*math.sin(t)*r))
 f=[(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)]+[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
 return mesh(name,v,f,mat)

# ---- plinth: three steps, a die with a sunk panel and bronze plaque, a moulded cap ----
box('Plinth',-.85,.85,0,.22,-.85,.85,plinth,.04)
box('Plinth',-.68,.68,.22,.46,-.68,.68,stone_dark,.04)
box('Plinth',-.52,.52,.46,1.42,-.52,.52,plinth,.03)
box('Plinth',-.6,.6,1.42,1.56,-.6,.6,stone_dark,.05)
box('Plinth',-.56,.56,1.56,1.62,-.56,.56,plinth,.02)
box('PlinthPanel',-.36,.36,.66,1.24,.50,.53,stone_dark)                 # sunk panel on the front (+z)
box('PlinthPlaque',-.28,.28,.78,1.12,.52,.56,bronze,.012)
for i,(x,w) in enumerate([(-.18,.07),(-.07,.1),(.06,.08),(.17,.06)]):box('PlinthPlaqueLetters',x-w/2,x+w/2,.99-(i%2)*.1,1.03-(i%2)*.1,.555,.575,iron)
rng=random.Random(7)
for x,z,w in [(-.8,.6,.3),(.7,-.75,.35),(.78,.5,.2),(-.6,-.8,.25)]:box('PlinthMoss',x-w/2,x+w/2,.2,.25,z-.1,z+.1,moss)
box('PlinthMoss',-.5,-.2,.44,.49,.62,.7,moss)

# ---- the keeper: folded robe, belt, cloak, hood, head and beard ----
B=1.62
lathe('KeeperRobe',[(.40,B+.02),(.36,B+.35),(.28,B+.85),(.24,B+1.05),(.27,B+1.35),(.30,B+1.55),(.14,B+1.66)],14,stone,fold=.10,seed=3)
lathe('KeeperBelt',[(.265,B+.99),(.265,B+1.08)],14,stone_dark)
box('KeeperPouch',.12,.26,B+.82,B+1.0,.12,.24,stone_dark,.02)
lathe('KeeperCloak',[(.46,B+.04),(.40,B+.5),(.34,B+1.1),(.34,B+1.5),(.20,B+1.66)],10,stone_dark,a0=math.radians(200),a1=math.radians(340),fold=.08,seed=5)
for x in (-.1,.1):box('KeeperBoot',x-.07,x+.07,B,B+.08,.22,.42,stone_dark,.02)
lathe('KeeperHead',[(.02,B+1.66),(.13,B+1.72),(.15,B+1.84),(.12,B+1.95),(.02,B+2.0)],8,stone,seed=9)
lathe('KeeperHood',[(.22,B+1.62),(.21,B+1.8),(.17,B+1.98),(.06,B+2.12)],9,stone_dark,a0=math.radians(150),a1=math.radians(390),seed=11,tilt=lambda p:p+Vector((0,0,-.03)))
mesh('KeeperBeard',[(-.09,B+1.76,.11),(.09,B+1.76,.11),(0,B+1.52,.2),(-.05,B+1.62,.16),(.05,B+1.62,.16)],[(0,1,4,3),(3,4,2)],stone)
box('KeeperNose',-.02,.02,B+1.8,B+1.87,.13,.17,stone)

# ---- right arm raised toward the landing, holding the lantern high ----
sh=Vector((.28,B+1.5,0));el=Vector((.46,B+1.72,.12));wr=Vector((.5,B+2.12,.2))
tube('KeeperSleeve',sh,el,.09,.1,7,stone);tube('KeeperSleeve',el,wr,.1,.13,7,stone)   # bell sleeve
tube('KeeperHand',wr,wr+Vector((0,.09,0)),.05,.045,6,stone)
L=wr+Vector((0,.13,0))
tube('KeeperLanternBail',L,L+Vector((0,.1,0)),.012,.012,4,iron)
lathe('KeeperLanternCap',[(.12,0),(.02,.1)],6,iron,centre=tuple(L+Vector((0,-.02,0))))
lathe('KeeperLanternGlass',[(.09,-.24),(.1,-.1),(.09,-.02)],6,glow,centre=tuple(L))
lathe('KeeperLanternBase',[(.11,-.28),(.11,-.24)],6,iron,centre=tuple(L))
for i in range(6):
 a=i*math.pi/3;p=L+Vector((math.cos(a)*.1,0,math.sin(a)*.1))
 tube('KeeperLanternFrame',p+Vector((0,-.26,0)),p+Vector((0,-.02,0)),.01,.01,4,iron)

# ---- left arm down on a tall crook staff ----
lsh=Vector((-.28,B+1.5,0));lel=Vector((-.36,B+1.2,.1));lwr=Vector((-.34,B+1.0,.22))
tube('KeeperSleeve',lsh,lel,.09,.1,7,stone);tube('KeeperSleeve',lel,lwr,.1,.12,7,stone)
tube('KeeperHand',lwr,lwr+Vector((0,-.08,.02)),.05,.045,6,stone)
top=Vector((-.36,B+2.25,.24))
tube('KeeperStaff',Vector((-.33,B,.22)),top,.03,.028,6,stone_dark)
prev=top
for i in range(1,6):
 a=i*math.pi/5;p=top+Vector((-.13+math.cos(a)*.13*-1,math.sin(a)*.14,0))
 tube('KeeperStaff',prev,p,.028,.026,6,stone_dark);prev=p

# ---- weathering: moss in the robe folds and on the shoulders ----
for x,y,z in [(.2,B+.1,.3),(-.25,B+.2,.28),(.18,B+1.52,-.1)]:box('KeeperMoss',x-.06,x+.06,y,y+.04,z-.05,z+.05,moss)

# join by material family for few draws; keep the lantern glow separate so it can be animated later
for prefix in ['Plinth','Keeper']:
 parts=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith(prefix) and 'Glass' not in o.name]
 for o in parts:
  bpy.context.view_layer.objects.active=o
  for m in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=m.name)
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();parts[0].name=prefix
out=OUT/'lantern_keeper_statue_v1'
bpy.ops.wm.save_as_mainfile(filepath=str(out.with_suffix('.blend')))
bpy.ops.export_scene.gltf(filepath=str(out.with_suffix('.glb')),export_format='GLB',export_yup=True)
tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')
corners=[o.matrix_world@Vector(c) for o in bpy.context.scene.objects if o.type=='MESH' for c in o.bound_box]
dims=[max(v[i] for v in corners)-min(v[i] for v in corners) for i in range(3)]
(PROOF/'asset_report.json').write_text(json.dumps({'status':'candidate-unapproved','triangles':tris,'dimensionsTiles':dims,'footprintTiles':'1.7 x 1.7 (blocks its tile)','front':'+z (plaque)'},indent=2))
# proof renders
sc=bpy.context.scene;sc.render.engine='BLENDER_WORKBENCH';sc.display.shading.light='STUDIO';sc.display.shading.color_type='MATERIAL';sc.render.resolution_x=600;sc.render.resolution_y=800
cam=bpy.data.objects.new('C',bpy.data.cameras.new('C'));sc.collection.objects.link(cam);sc.camera=cam;cam.data.lens=50
for name,eye in [('front',(0,2.2,5.5)),('three_quarter',(4,3,4)),('side',(5.5,2.4,0)),('back',(-3,3,-4.5))]:
 e=Vector((eye[0],-eye[2],eye[1]));t=Vector((0,0,1.9));cam.location=e;cam.rotation_euler=(t-e).to_track_quat('-Z','Y').to_euler()
 sc.render.filepath=str(PROOF/('view_'+name+'.png'));bpy.ops.render.render(write_still=True)
print('[LANTERN_KEEPER] saved; triangles',tris,'dims',[round(d,2) for d in dims])
