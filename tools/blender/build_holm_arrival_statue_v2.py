"""The Lantern Keeper monument v2 (owner, 2026-09-25: "redesign the statue ... make it look good and official").

A stepped sandstone plinth with a granite die in three courses, a base moulding and a stepped cornice, a brass
plaque with a raised border and the inscription THE LANTERN KEEPER / WHO FIRST LIT THE HOLM, flower tufts on
the lower step, and a bronze keeper (proportioned like the holm-characters-v2 cast, about 1.2x life) in a
hooded cloak, lantern held aloft (lit) in the right hand, staff in the left. Front faces local +z (the path).

The footprint is exactly v1's (x -0.95..0.88, z -0.90..0.85), so the measured landscape blocker, and with it
the arrival graph, does not change. Original design; flat matte sRGB colours, vertex coloured.
Run: "Blender 4.5/blender.exe" -b --python tools/blender/build_holm_arrival_statue_v2.py
"""
import bpy,sys,math,random,json,hashlib
from pathlib import Path
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE));ROOT=HERE.parents[1]
OUT=ROOT/'.studio-workspaces/holm-arrival-statue-v2/candidates';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
import holm_interior_kit as kit
from holm_interior_kit import Acc,M,family,sharp_by_angle
root=bpy.data.objects.new('LanternKeeperStatue',None);bpy.context.collection.objects.link(root)
X0,X1,Z0,Z1=-.95,.88,-.90,.85;CX,CZ=(X0+X1)/2,(Z0+Z1)/2
sand=family('Plinth sandstone',['#c2b08a','#b3a27e','#cbbb96']);gran=family('Plinth granite',['#a7a295','#9b968a','#b3ae9f','#8f8b80'])
bronze=family('Keeper bronze',['#5c452a','#3f2f1c','#735733']);patina=M('Keeper patina','#46705f')
brass=M('Plaque brass','#c8a24a');brass2=M('Plaque brass rim','#a8832f');ink=M('Plaque lettering','#3a2a14')
glow=M('Lantern light','#ffd27a',emit=1.2)
petals=[M('Flower red','#d95f5f'),M('Flower gold','#e8c54a'),M('Flower violet','#8a6fb8'),M('Flower white','#f0ece0')];leaf=family('Flower leaf',['#4f7a3a','#5f8a45'])
rng=random.Random(20260925)
P=Acc('LanternKeeperPlinth')
def ring(y0,y1,half_x,half_z,m,skip='b'):P.box(CX-half_x,CX+half_x,y0,y1,CZ-half_z,CZ+half_z,m,skip=skip)
hx,hz=(X1-X0)/2,(Z1-Z0)/2
ring(0,.16,hx,hz,sand[1],skip='')                      # lower step: exactly v1's footprint
ring(.16,.32,hx-.14,hz-.14,sand[0])
ring(.32,.40,.56,.56,sand[2])                          # base moulding
for i,(y0,y1) in enumerate(((.40,.66),(.66,.92),(.92,1.18))):ring(y0,y1,.5,.5,gran[i%3])   # granite die, three courses
ring(1.18,1.26,.57,.57,sand[2]);ring(1.26,1.34,.61,.61,sand[0]);ring(1.34,1.40,.58,.58,sand[1])   # stepped cornice and cap
# brass plaque on the front of the die, raised border, two lines of lettering
fz=CZ+.5
P.box(CX-.38,CX+.38,.50,1.06,fz-.004,fz+.012,brass2,skip='n');P.box(CX-.34,CX+.34,.54,1.02,fz+.012,fz+.02,brass,skip='n')
for y in (.66,.9):P.box(CX-.24,CX+.24,y-.004,y+.004,fz+.02,fz+.024,brass2)   # engraved rules
# flower tufts on the lower step: corners and the front edge, inside the footprint
for fx,fzz in [(X0+.08,Z0+.08),(X1-.08,Z0+.08),(X0+.08,Z1-.08),(X1-.08,Z1-.08),(CX-.45,Z1-.07),(CX+.45,Z1-.07),(X0+.07,CZ),(X1-.07,CZ)]:
 P.lathe(fx,fzz,.16,[(.055,0),(.065,.06),(0,.1)],6,leaf[rng.randrange(2)],top=False,rot=rng.random())
 for k in range(3):
  a=rng.random()*6.3;P.lathe(fx+math.cos(a)*.035,fzz+math.sin(a)*.035,.24,[(.022,0),(.026,.02),(0,.035)],5,petals[rng.randrange(4)],top=False)
P.build(root)
# ---- the keeper, figure space (x right, y up, z forward), scaled onto the cap
S=1.2;Y0=1.40
def W(p):x,y,z=p;return (CX+x*S,Y0+y*S,CZ+z*S)
F=Acc('LanternKeeperFigure')
def lathe(cx,cz,y0,prof,n,m,**kw):F.lathe(CX+cx*S,CZ+cz*S,Y0+y0*S,[(r*S,h*S) for r,h in prof],n,m,**kw)
def tube(a,b,r,n,m,**kw):F.tube(W(a),W(b),r*S,n,m,**kw)
lathe(0,0,0,[(.44,0),(.44,.05),(.4,.06)],12,bronze[1])                                   # cast ground disc
for sx in (-1,1):F.rbox(CX+sx*.12*S,CZ+.1*S,.16*S,.3*S,Y0+.06*S,Y0+.18*S,0,bronze[1])   # boots
# cloak: a flared, slightly flattened cone from hem to shoulders, opened a little at the front
prof=[(.40,.08),(.37,.35),(.33,.7),(.30,1.0),(.31,1.3),(.27,1.46),(.13,1.55)]
n=12;rings=[]
for r,h in prof:
 rings.append([(CX+r*S*math.sin(2*math.pi*i/n),Y0+h*S,CZ+r*S*.82*math.cos(2*math.pi*i/n)) for i in range(n)])
V=[p for rg in rings for p in rg];Fc=[]
for j in range(len(rings)-1):
 for i in range(n):
  if j<3 and i==0:continue          # the cloak parts at the front below the knees
  m=patina if (j>=4 and i%3==1) else (bronze[0] if (i+j)%3 else bronze[2])   # verdigris gathers on the shoulders
  Fc.append(((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i),m))
for f,m in Fc:F.poly([V[k] for k in f],[(0,1,2,3)],m)
# robe and legs showing in the cloak opening, belt and a satchel
lathe(0,.05,.08,[(.2,0),(.21,.5),(.2,.95)],8,bronze[1],top=False)
lathe(0,.02,.92,[(.25,0),(.25,.07)],10,bronze[1],top=False);F.rbox(CX-.22*S,CZ+.12*S,.14*S,.08*S,Y0+.75*S,Y0+.95*S,.3,bronze[1])
# head framed by a raised hood (open at the front), brow, nose, eyes and a full beard
lathe(0,.02,1.5,[(.09,0),(.15,.06),(.17,.18),(.16,.3),(.12,.38),(0,.42)],8,bronze[0],top=False)
n=10;hood=[(r,h) for r,h in ((.2,1.46),(.235,1.6),(.235,1.78),(.2,1.92),(.1,2.0))]
HR=[[W((r*math.sin(2*math.pi*i/n),h,-.02+r*math.cos(2*math.pi*i/n))) for i in range(n)] for r,h in hood]
for j in range(len(HR)-1):
 for i in range(n):
  if j<3 and i in (0,1,n-1):continue            # the face opening
  F.poly([HR[j][i],HR[j][(i+1)%n],HR[j+1][(i+1)%n],HR[j+1][i]],[(0,1,2,3)],bronze[2] if (i+j)%2 else bronze[0])
F.poly([W((-.1,1.62,.16)),W((.1,1.62,.16)),W((.08,1.44,.19)),W((0,1.33,.2)),W((-.08,1.44,.19))],[(0,1,2,3,4)],bronze[1])      # beard front
F.poly([W((-.1,1.62,.16)),W((-.08,1.44,.19)),W((0,1.33,.2)),W((0,1.4,.08)),W((-.12,1.6,.04))],[(0,1,2,3,4)],bronze[1])
F.poly([W((.1,1.62,.16)),W((.12,1.6,.04)),W((0,1.4,.08)),W((0,1.33,.2)),W((.08,1.44,.19))],[(0,1,2,3,4)],bronze[1])
F.poly([W((-.03,1.73,.175)),W((.03,1.73,.175)),W((0,1.64,.215))],[(0,1,2)],bronze[2])                                           # nose
for sx in (-1,1):F.box(CX+(sx*.075-.022)*S,CX+(sx*.075+.022)*S,Y0+1.72*S,Y0+1.75*S,CZ+.155*S,CZ+.172*S,bronze[1])               # eyes
F.box(CX-.12*S,CX+.12*S,Y0+1.765*S,Y0+1.8*S,CZ+.15*S,CZ+.175*S,bronze[1])                                                      # brow
# right arm raised, lantern held aloft (lit)
sh=(.3,1.42,0);el=(.44,1.72,.06);ha=(.4,2.08,.08)
tube(sh,el,.09,7,bronze[0]);tube(el,ha,.075,7,bronze[0]);lathe(ha[0],ha[2],ha[1]-.08,[(.09,0),(.11,.07),(.08,.1)],7,bronze[0])   # sleeve cuff
lathe(ha[0],ha[2],ha[1]-.02,[(.07,0),(.075,.08),(0,.12)],6,bronze[2],top=False)                                                   # hand
lx,lz,ly=ha[0],ha[2],ha[1]+.12
tube((lx,ly,lz),(lx,ly+.1,lz),.01,4,bronze[1],caps=False)
lathe(lx,lz,ly+.1,[(.1,0),(.1,.03)],6,bronze[1]);lathe(lx,lz,ly+.13,[(.085,0),(.085,.2)],6,glow,top=False)
for i in range(6):
 a=2*math.pi*i/6+math.pi/6;tube((lx+.09*math.cos(a),ly+.13,lz+.09*math.sin(a)),(lx+.09*math.cos(a),ly+.33,lz+.09*math.sin(a)),.012,4,bronze[1],caps=False)
lathe(lx,lz,ly+.33,[(.11,0),(.05,.08),(.02,.12)],6,bronze[1],top=True);lathe(lx,lz,ly+.45,[(.03,0),(.03,.04)],6,patina)
# left arm down, staff planted beside the keeper
sh2=(-.3,1.42,0);el2=(-.42,1.12,.08);ha2=(-.4,.95,.16)
tube(sh2,el2,.09,7,bronze[0]);tube(el2,ha2,.075,7,bronze[0]);lathe(ha2[0],ha2[2],ha2[1]-.05,[(.08,0),(.08,.12)],7,bronze[2])
tube((-.4,.05,.16),(-.4,2.0,.16),.035,6,bronze[1]);lathe(-.4,.16,2.0,[(.06,0),(.07,.06),(0,.12)],6,patina,top=False)
# shoulders' cloak clasp and patina in the folds
lathe(0,.19,1.4,[(.05,0),(.05,.03)],6,patina)
F.build(root)
# ---- lettering, Blender's own font converted to a flat mesh on the plate
L=Acc('LanternKeeperLettering')
for text,y,size in (("THE LANTERN KEEPER",.93,.065),("WHO FIRST LIT THE HOLM",.78,.05),("TUTOR'S HOLM",.6,.04)):
 cu=bpy.data.curves.new('t','FONT');cu.body=text;cu.size=size;cu.align_x='CENTER';cu.align_y='CENTER';cu.resolution_u=2;cu.fill_mode='FRONT'
 t=bpy.data.objects.new('t',cu);bpy.context.collection.objects.link(t);bpy.context.view_layer.update()
 dg=bpy.context.evaluated_depsgraph_get();tm=t.evaluated_get(dg).to_mesh()
 for f in tm.polygons:L.poly([(CX+tm.vertices[i].co.x,y+tm.vertices[i].co.y,fz+.0235) for i in f.vertices],[tuple(range(len(f.vertices)))],ink)
 t.evaluated_get(dg).to_mesh_clear();bpy.data.objects.remove(t,do_unlink=True)
L.build(root)
for o in root.children:sharp_by_angle(o,30)
out=OUT/'lantern_keeper_statue_v2'
bpy.ops.wm.save_as_mainfile(filepath=str(out.with_suffix('.blend')))
bpy.ops.export_scene.gltf(filepath=str(out.with_suffix('.glb')),export_format='GLB',export_yup=True)
from mathutils import Vector
pts=[o.matrix_world@v.co for o in root.children for v in o.data.vertices]
b={'min':[round(min(p[i] for p in pts),4) for i in range(3)],'max':[round(max(p[i] for p in pts),4) for i in range(3)]}
tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in root.children)
(OUT/'manifest.json').write_text(json.dumps({'schema':'holm-arrival-statue-v2','root':'LanternKeeperStatue','boundsBlender':b,'triangles':tris,'front':'local +z (path side after the 90 deg placement)','footprint':'identical to v1: x -0.95..0.88, z -0.90..0.85'},indent=1))
print('[STATUE_V2] triangles',tris,'bounds(blender x,y,z)',b)
