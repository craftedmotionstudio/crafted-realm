"""The Lantern Keeper monument v3 (owner play-test 2026-09-25: the bronze keeper "just looks bad ... very blocky").

A pale granite statue carved on the proportions of the character kit itself: Guide Bram from holm-characters-v28
(bram.glb, read only; its hash is recorded) is posed in Blender - right arm raised with a lantern held aloft, left
hand on a staff planted beside him, head lifted toward the light - the pose is applied, and the body is re-coloured
as weathered stone (pale granite, darker carved eyes and hair, darker undersides and creases, lichen low on the
figure). Over it: a hooded cloak of angular draped planes (pleated rings, an inner face, a ragged hem, open at the
front), a carved staff with a knop, and a real iron lantern with six glowing panes, a roof, finial and a bail handle
in the keeper's fist. The v2 plinth, brass plaque and lettering stay (in the same footprint, so the measured blocker
and the arrival graph do not change); the plinth is now weathered granite with lichen on its lowest course.
Front faces local +z (the path). Original design; flat matte sRGB vertex colours.
Run: "Blender 4.5/blender.exe" -b --python tools/blender/build_holm_arrival_statue_v3.py
"""
import bpy,bmesh,sys,math,random,json,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE));ROOT=HERE.parents[1]
OUT=ROOT/'.studio-workspaces/holm-arrival-statue-v3/candidates';OUT.mkdir(parents=True,exist_ok=True)
SRC=ROOT/'.studio-workspaces/holm-characters-v28/candidates/bram.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
import holm_interior_kit as kit
from holm_interior_kit import Acc,M,family,sharp_by_angle
root=bpy.data.objects.new('LanternKeeperStatue',None);bpy.context.collection.objects.link(root)
X0,X1,Z0,Z1=-.95,.88,-.90,.85;CX,CZ=(X0+X1)/2,(Z0+Z1)/2
gran=family('Statue granite',['#c4c1b8','#b7b4aa','#cfccc3','#aaa79e','#bdbab1']);lich=family('Statue lichen',['#97a07c','#a9ad8c','#868f6c'])
dark=M('Statue granite shadow','#8f8c84');brass=M('Plaque brass','#c8a24a');brass2=M('Plaque brass rim','#a8832f');ink=M('Plaque lettering','#3a2a14')
iron=M('Lantern iron','#3b3a37');iron2=M('Lantern iron worn','#55524c');glass=M('Lantern pane glow','#ffd27a',emit=1.3);flame=M('Lantern flame','#fff0b0',emit=1.8)
petals=[M('Flower red','#d95f5f'),M('Flower gold','#e8c54a'),M('Flower violet','#8a6fb8'),M('Flower white','#f0ece0')];leaf=family('Flower leaf',['#4f7a3a','#5f8a45'])
rng=random.Random(20260926)

# ---------------------------------------------------------------- plinth: v2's stepped plinth, weathered granite
P=Acc('LanternKeeperPlinth')
def ring(y0,y1,half_x,half_z,m,skip='b'):P.box(CX-half_x,CX+half_x,y0,y1,CZ-half_z,CZ+half_z,m,skip=skip)
hx,hz=(X1-X0)/2,(Z1-Z0)/2
# lowest course in separate blocks, some green with lichen, all exactly within v1's footprint
xs=[X0,X0+.5,X0+.95,X1-.42,X1];zs=[Z0,Z0+.55,Z1-.5,Z1]
for i,(a,b) in enumerate(zip(xs,xs[1:])):
 for j,(c,d) in enumerate(zip(zs,zs[1:])):
  edge=i in (0,len(xs)-2) or j in (0,len(zs)-2)
  if not edge:continue
  m=lich[(i+j)%3] if (i*3+j)%4==0 else gran[(i+2*j)%5]
  P.box(a+(.004 if i else 0),b-(.004 if i<len(xs)-2 else 0),0,.16,c+(.004 if j else 0),d-(.004 if j<len(zs)-2 else 0),m,skip='b')
P.box(X0+.5,X1-.42,0,.155,Z0+.55,Z1-.5,gran[3],skip='b')      # the course's hidden middle, just under the joints
ring(.16,.32,hx-.14,hz-.14,gran[1])
ring(.32,.40,.56,.56,gran[2])                          # base moulding
for i,(y0,y1) in enumerate(((.40,.66),(.66,.92),(.92,1.18))):ring(y0,y1,.5,.5,gran[(i+3)%5])   # die, three courses
ring(1.18,1.26,.57,.57,gran[2]);ring(1.26,1.34,.61,.61,gran[0]);ring(1.34,1.40,.58,.58,gran[1])   # stepped cornice and cap
fz=CZ+.5
P.box(CX-.38,CX+.38,.50,1.06,fz-.004,fz+.012,brass2,skip='n');P.box(CX-.34,CX+.34,.54,1.02,fz+.012,fz+.02,brass,skip='n')
for y in (.66,.9):P.box(CX-.24,CX+.24,y-.004,y+.004,fz+.02,fz+.024,brass2)
for fx,fzz in [(X0+.08,Z0+.08),(X1-.08,Z0+.08),(X0+.08,Z1-.08),(X1-.08,Z1-.08),(CX-.45,Z1-.07),(CX+.45,Z1-.07),(X0+.07,CZ),(X1-.07,CZ)]:
 P.lathe(fx,fzz,.16,[(.055,0),(.065,.06),(0,.1)],6,leaf[rng.randrange(2)],top=False,rot=rng.random())
 for k in range(3):
  a=rng.random()*6.3;P.lathe(fx+math.cos(a)*.035,fzz+math.sin(a)*.035,.24,[(.022,0),(.026,.02),(0,.035)],5,petals[rng.randrange(4)],top=False)
P.build(root)

# ---------------------------------------------------------------- the keeper: Guide Bram, posed and turned to stone
S=1.2;Y0=1.40
src_sha=hashlib.sha256(SRC.read_bytes()).hexdigest()
before=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(SRC))
imported=[o for o in bpy.data.objects if o not in before]
arm=next(o for o in imported if o.type=='ARMATURE')
for o in imported:
 if o.type=='MESH' and (o.name.startswith('Icosphere') or 'Staff' in o.name):bpy.data.objects.remove(o,do_unlink=True)
imported=[o for o in bpy.data.objects if o not in before]
for a in list(bpy.data.actions):
 if arm.animation_data:arm.animation_data.action=None
bpy.context.view_layer.objects.active=arm;bpy.ops.object.mode_set(mode='POSE')
for pb in arm.pose.bones:pb.rotation_mode='QUATERNION';pb.rotation_quaternion=(1,0,0,0);pb.location=(0,0,0)
bpy.context.view_layer.update()
def aim(name,d):
 """Turn one pose bone about its head so it points along d (Blender world, x = the figure's left, -y forward)."""
 pb=arm.pose.bones[name];bpy.context.view_layer.update()
 cur=(pb.tail-pb.head).normalized();R=cur.rotation_difference(Vector(d).normalized()).to_matrix().to_4x4()
 h=pb.head.copy();pb.matrix=Matrix.Translation(h)@R@Matrix.Translation(-h)@pb.matrix;bpy.context.view_layer.update()
aim('mixamorig:RightArm',(-.3,-.14,.94));aim('mixamorig:RightForeArm',(-.06,-.12,1.0));aim('mixamorig:RightHand',(-.02,-.06,1.0))
aim('mixamorig:LeftArm',(.38,-.28,-.88));aim('mixamorig:LeftForeArm',(.12,-.93,.33));aim('mixamorig:LeftHand',(.08,-.95,.2))
aim('mixamorig:Head',(-.08,.12,1.0))
hand_r=arm.matrix_world@arm.pose.bones['mixamorig:RightHand'].tail.copy()
hand_rh=arm.matrix_world@arm.pose.bones['mixamorig:RightHand'].head.copy()
hand_l=arm.matrix_world@((arm.pose.bones['mixamorig:LeftHand'].head+arm.pose.bones['mixamorig:LeftHand'].tail)/2)
bpy.ops.object.mode_set(mode='OBJECT')
meshes=[o for o in imported if o.type=='MESH']
for o in meshes:
 bpy.context.view_layer.objects.active=o
 for m in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=m.name)
 o.parent=None
 o.matrix_world=Matrix.Identity(4)@o.matrix_world
bpy.data.objects.remove(arm,do_unlink=True)
# posed reference clouds (figure space) for fitting the cloak and hood: torso+legs, and hair+jaw
body_pts=[o.matrix_world@v.co for o in meshes if any(k in o.name for k in ('Torso','Legs')) for v in o.data.vertices]
head_pts=[o.matrix_world@v.co for o in meshes if any(k in o.name for k in ('Hair','Jaw')) for v in o.data.vertices]
rfist=[o.matrix_world@v.co for o in meshes if 'Hands' in o.name for v in o.data.vertices];lfist=[p for p in rfist if p.x>0];rfist=[p for p in rfist if p.x<0]
# stone colours per original material, then weathering
TONE={'SKIN':'#c0bdb4','EYES':'#6d6a64','HAIR':'#9d9a91','TORSO':'#b3b0a6','SHIRT':'#a9a69c','TRIM':'#c8c5bc','LEGS':'#aeaba1','BELT':'#95928a','METAL':'#a19e95','FEET':'#a5a298'}
def tone(mname):
 for k,h in TONE.items():
  if k in mname.upper():return kit.srgb(h)
 return kit.srgb('#bab7ad')
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join();body=meshes[0];body.name='LanternKeeperFigure'
me=body.data;zmin=min(v.co.z for v in me.vertices)
col=me.color_attributes.get('Col') or me.color_attributes.new('Col','FLOAT_COLOR','CORNER')
for ca in list(me.color_attributes):
 if ca.name!='Col':me.color_attributes.remove(ca)
col=me.color_attributes['Col'];cols=[]
for p in me.polygons:
 c=list(tone(me.materials[p.material_index].name if me.materials else ''))
 n=p.normal;k=1+rng.uniform(-.035,.035)
 if n.z<-.25:k*=.8                      # undersides and deep folds carved darker
 elif n.z<.1:k*=.93
 cz=p.center.z-zmin
 if cz<.28 and rng.random()<.35:c=list(kit.srgb(['#97a07c','#a9ad8c','#868f6c'][rng.randrange(3)]))   # lichen low on the figure
 cols.extend([min(1,c[0]*k),min(1,c[1]*k),min(1,c[2]*k),1.0]*p.loop_total)
col.data.foreach_set('color',cols);me.color_attributes.active_color=col;me.color_attributes.render_color_index=0
me.materials.clear();me.materials.append(kit._vc_material())
for p in me.polygons:p.material_index=0
# scale onto the cap: figure feet at the cap, front toward plan +z (Blender -y), centred on the plinth
body.scale=(S,S,S);body.location=(CX,-CZ,Y0);bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
body.parent=root
def W(p):return Vector((CX+p.x*S,-CZ+p.y*S,Y0+p.z*S))      # Blender figure space -> world
hand_r,hand_rh,hand_l=W(hand_r),W(hand_rh),W(hand_l)
body_pts=[W(p) for p in body_pts];head_pts=[W(p) for p in head_pts];rfist=[W(p) for p in rfist];lfist=[W(p) for p in lfist]

# ---------------------------------------------------------------- hooded cloak: angular draped planes
def extent(y0,y1,cloud=None):
 cloud=cloud or body_pts;pts=[v for v in cloud if y0<=v.z<=y1];pts=pts or cloud
 return (min(p.x for p in pts),max(p.x for p in pts),min(p.y for p in pts),max(p.y for p in pts))
C=Acc('LanternKeeperCloak');cloak=[M('Statue cloak','#b3b0a6'),M('Statue cloak fold','#a29f95'),M('Statue cloak lit','#c2bfb5')];inner=M('Statue cloak inner','#8a877f')
def P3(v):return (v.x,v.z,-v.y)          # Blender -> kit plan space
sh_z=Y0+1.36*S;hem=Y0+.1*S
levels=[(sh_z,.0),(Y0+1.16*S,.03),(Y0+.86*S,.06),(Y0+.56*S,.09),(Y0+.3*S,.12),(hem,.14)]
n=18;open_half=math.radians(52)          # the cloak is open over the front, from the chest down
rings=[]
for li,(z,flare) in enumerate(levels):
 x0,x1,y0,y1=extent(z-.12,z+.12)
 cx,cy=CX,-CZ;rx=max(abs(x0-cx),abs(x1-cx))+.035+flare*.35;ry=max(abs(y0-cy),abs(y1-cy))+.035+flare*.3
 pts=[]
 for i in range(n+1):
  a=-math.pi+open_half+(2*math.pi-2*open_half)*i/n if li>0 else -math.pi+.25+(2*math.pi-.5)*i/n
  fold=(1.07 if i%2 else .95) if li>0 else 1.0
  zz=z+((.03 if i%2 else -.02) if li==len(levels)-1 else 0)
  pts.append(Vector((cx+math.sin(a)*rx*fold,cy+math.cos(a)*ry*fold,zz)))      # a=0 at the back (+y), front at +-pi
 rings.append(pts)
for j in range(len(rings)-1):
 for i in range(n):
  q=[rings[j][i],rings[j][i+1],rings[j+1][i+1],rings[j+1][i]]
  C.poly([P3(p) for p in q],[(0,1,2,3)],cloak[(i+j)%3])
  # inner face, offset toward the body, darker
  qi=[p+(Vector((CX,-CZ,p.z))-p).normalized()*.018 for p in q]
  C.poly([P3(p) for p in qi],[(0,3,2,1)],inner)
# the hood: a cowl around the head, open over the face, peaked at the back, falling onto the shoulders
hx0,hx1,hy0,hy1=extent(-1e9,1e9,head_pts);hcx,hcy=(hx0+hx1)/2,(hy0+hy1)/2;htop=max(p.z for p in head_pts);hbot=min(p.z for p in head_pts)
hr=max(hx1-hx0,hy1-hy0)/2+.035
hood=[(hbot-.06,1.5),(hbot+.08,1.12),(hbot+(htop-hbot)*.55,1.05),(htop-.02,.9),(htop+.08,.52)]
face=math.radians(58);HR=[]
for k,(z,f) in enumerate(hood):
 pts=[]
 for i in range(n+1):
  a=-math.pi+face+(2*math.pi-2*face)*i/n if k<4 else -math.pi+(2*math.pi)*i/n
  back=1+.12*max(0,math.cos(a))*(k/4)                          # the peak draws back
  pts.append(Vector((hcx+math.sin(a)*hr*f,hcy+math.cos(a)*hr*f*back+(.03*k/4),z)))
 HR.append(pts)
for j in range(len(HR)-1):
 for i in range(n):
  q=[HR[j][i],HR[j][i+1],HR[j+1][i+1],HR[j+1][i]]
  C.poly([P3(p) for p in q],[(0,1,2,3)],cloak[(i+j+1)%3])
  qi=[p+(Vector((hcx,hcy,p.z))-p).normalized()*.016 for p in q];C.poly([P3(p) for p in qi],[(0,3,2,1)],inner)
tip=Vector((hcx,hcy+hr*.55,htop+.16));last=HR[-1]
for i in range(n):C.poly([P3(last[i]),P3(last[i+1]),P3(tip)],[(0,1,2)],cloak[i%3])
# a clasp at the throat
C.lathe(CX,CZ+.14,Y0+1.4*S,[(.045,0),(.045,.02)],8,dark)
C.build(root)

# ---------------------------------------------------------------- staff in the left hand, planted on the cap
K=Acc('LanternKeeperStaff');lc=sum(lfist,Vector())/len(lfist);sx,sy=lc.x,lc.y
K.tube((sx,Y0+.02,-sy),(sx,Y0+1.9*S,-sy),.04,7,gran[3])
K.lathe(sx,-sy,Y0+1.9*S,[(.055,0),(.075,.05),(.06,.1),(.035,.16),(0,.2)],7,gran[1],top=False)
K.lathe(sx,-sy,Y0+1.45*S,[(.047,0),(.047,.05)],7,dark)
K.lathe(sx,-sy,Y0,[(.06,0),(.05,.05)],7,lich[0])
K.build(root)

# ---------------------------------------------------------------- the lantern, hanging from the raised fist by its bail
Lt=Acc('LanternKeeperLantern');ft=max(rfist,key=lambda p:p.z);fc=sum(rfist,Vector())/len(rfist)
lx,lz=fc.x,-fc.y;H=.34;R=.11;base=ft.z-.03                                               # held up on the fist, base in the palm
Lt.lathe(lx,lz,base-.05,[(.03,0),(.045,.03),(.02,.05)],6,iron2,top=False)            # socket under the base, in the grip
Lt.lathe(lx,lz,base,[(R+.014,0),(R+.014,.03)],6,iron)                                 # base plate
for i in range(6):
 a=2*math.pi*i/6;Lt.tube((lx+R*math.cos(a),base+.03,lz+R*math.sin(a)),(lx+R*math.cos(a),base+.03+H,lz+R*math.sin(a)),.01,4,iron)
 a0,a1=a+.09,a+2*math.pi/6-.09;r2=R-.004
 Lt.poly([(lx+r2*math.cos(a0),base+.04,lz+r2*math.sin(a0)),(lx+r2*math.cos(a1),base+.04,lz+r2*math.sin(a1)),(lx+r2*math.cos(a1),base+.02+H,lz+r2*math.sin(a1)),(lx+r2*math.cos(a0),base+.02+H,lz+r2*math.sin(a0))],[(0,1,2,3)],glass)
 Lt.tube((lx+r2*math.cos(a0),base+.03+H*.5,lz+r2*math.sin(a0)),(lx+r2*math.cos(a1),base+.03+H*.5,lz+r2*math.sin(a1)),.005,4,iron,caps=False)   # a glazing bar across each pane
Lt.lathe(lx,lz,base+.06,[(.024,0),(.02,.09),(0,.15)],5,flame,top=False)             # the flame inside
top=base+.03+H
Lt.lathe(lx,lz,top,[(R+.022,0),(R+.022,.016),(.055,.08),(.022,.115)],6,iron,top=True)   # roof
Lt.lathe(lx,lz,top+.115,[(.026,0),(.026,.016)],6,iron2)                              # finial ring
for i in range(7):                                                                     # bail handle arching over the roof
 a0,a1=math.pi*i/7,math.pi*(i+1)/7;w=R*.9
 Lt.tube((lx+math.cos(a0)*w,top+.02+math.sin(a0)*.16,lz),(lx+math.cos(a1)*w,top+.02+math.sin(a1)*.16,lz),.007,4,iron2,caps=False)
Lt.build(root)

# ---------------------------------------------------------------- lettering on the plaque (as v2)
L=Acc('LanternKeeperLettering')
for text,y,size in (("THE LANTERN KEEPER",.93,.065),("WHO FIRST LIT THE HOLM",.78,.05),("TUTOR'S HOLM",.6,.04)):
 cu=bpy.data.curves.new('t','FONT');cu.body=text;cu.size=size;cu.align_x='CENTER';cu.align_y='CENTER';cu.resolution_u=2;cu.fill_mode='FRONT'
 t=bpy.data.objects.new('t',cu);bpy.context.collection.objects.link(t);bpy.context.view_layer.update()
 dg=bpy.context.evaluated_depsgraph_get();tm=t.evaluated_get(dg).to_mesh()
 for f in tm.polygons:L.poly([(CX+tm.vertices[i].co.x,y+tm.vertices[i].co.y,fz+.0235) for i in f.vertices],[tuple(range(len(f.vertices)))],ink)
 t.evaluated_get(dg).to_mesh_clear();bpy.data.objects.remove(t,do_unlink=True)
L.build(root)
for o in root.children:
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free()
 if o.name!='LanternKeeperFigure':sharp_by_angle(o,30)
for o in list(bpy.data.objects):
 if o.type=='MESH' and o.parent is None and o is not root:bpy.data.objects.remove(o,do_unlink=True)
out=OUT/'lantern_keeper_statue_v3'
bpy.ops.wm.save_as_mainfile(filepath=str(out.with_suffix('.blend')))
bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
for o in root.children:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out.with_suffix('.glb')),export_format='GLB',export_yup=True,use_selection=True,export_animations=False)
pts=[o.matrix_world@v.co for o in root.children for v in o.data.vertices]
b={'min':[round(min(p[i] for p in pts),4) for i in range(3)],'max':[round(max(p[i] for p in pts),4) for i in range(3)]}
tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in root.children)
assert b['min'][0]>=X0-1e-3 and b['max'][0]<=X1+1e-3 and b['min'][1]>=-Z1-1e-3 and b['max'][1]<=-Z0+1e-3,('figure leaves the v1 footprint',b)
(OUT/'manifest.json').write_text(json.dumps({'schema':'holm-arrival-statue-v3','root':'LanternKeeperStatue','boundsBlender':b,'triangles':tris,
 'figureSource':{'path':str(SRC.relative_to(ROOT)).replace('\\','/'),'sha256':src_sha,'note':'Guide Bram from the character kit, posed and applied; read only'},
 'front':'local +z (path side after the 90 deg placement)','footprint':'identical to v1: x -0.95..0.88, z -0.90..0.85'},indent=1))
print('[STATUE_V3] triangles',tris,'bounds(blender x,y,z)',b,'hands',tuple(round(c,2) for c in hand_r),tuple(round(c,2) for c in hand_l))
