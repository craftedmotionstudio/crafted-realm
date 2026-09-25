"""Quest Lodge interior pass (lodge v4, 2026-09-25) over the measured v3 model.

Plank floors re-tiled in place on both storeys (walk planes unchanged), warm oak furniture instead of the
near-black textured oak, and dressing only where no navigation node stands: an adventurers' store under the
stair, a bench under the quest board, a chest and books in the bay, and a quilt, desk things and a chest in the
guest room. Lesson meshes (Lodge_FurnishingBoard_*, Lodge_FurnishingMap_*) keep their names and geometry.
Run: "Blender 5.1/blender.exe" -b --python tools/blender/build_holm_quest_lodge_interior_v4.py
"""
import bpy,sys,json,math,random,hashlib,shutil
from pathlib import Path
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE));ROOT=HERE.parents[1]
BASE=ROOT/'.studio-workspaces/holm-quest-lodge-v3/candidates';OUT=ROOT/'.studio-workspaces/holm-quest-lodge-v4/candidates'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(BASE/'lodge.blend'))
import holm_interior_kit as kit
from holm_interior_kit import Acc,M,family
from holm_interior_kit import barrel,crate,sack,jar,candle,lantern,books,log
from holm_interior_pass import retile,recolor,matte,tris
before=tris('Lodge_');parent=bpy.data.objects['Lodge_GroundFloor_Warm_oak'].parent
retile('Lodge_GroundFloor_Warm_oak','Lodge_GroundFloor_Boards','boards',family('Lodge board',['#7d5a38','#6f4f31','#86623e','#654730']),M('Lodge board seam','#2f2217'),7101,width=.32)
retile('Lodge_UpperFloor_Warm_oak','Lodge_UpperFloor_Boards','boards',family('Lodge guest board',['#8a6440','#7b5838','#94704a','#6f5033']),M('Lodge guest seam','#3a2a1c'),7102,run='z',width=.28)
oak=matte('#6e4b2e','Lodge furniture oak')
recolor(['Lodge_FurnishingMap_Warm','Lodge_FurnishingBay_Warm','Lodge_FurnishingShelf_Warm','Lodge_FurnishingBoard_Warm','Lodge_UpperFurnishing_Warm'],{'Warm oak':oak})
recolor(['Lodge_Stair_'],{'Warm oak':matte('#5a3c24','Lodge stair oak')})
P=dict(staves=family('Barrel stave',['#7b5635','#6c4a2e','#85603b']),lid=M('Barrel head','#8d6a44'),iron=M('Wrought iron','#343534'),
 crate=family('Crate board',['#9a7a52','#8a6b46','#a4845a']),batten=M('Crate batten','#6a4c2f'),sack=family('Sackcloth',['#c4b184','#b09c70','#d3c29a']),cord=M('Hemp cord','#7a6440'),
 books=family('Book cloth',['#7a2e25','#2f4d6b','#3f5e37','#8a6a2a','#5a3a5e']),paper=M('Parchment','#d9c89a'),ink=M('Ink black','#1f1c1a'),
 wax=M('Candle wax','#efe6c8'),flame=M('Candle flame','#ffc15a',emit=1.5),brass=M('Warm brass','#b59546'),glass=M('Lantern glow','#ffd27a',emit=1.2),
 quilt=[M('Quilt blue','#4d6788'),M('Quilt cream','#dccaa0'),M('Quilt moss','#5e7a45'),M('Quilt rust','#9a4a2e')],
 chest=family('Chest oak',['#7a5534','#654429']),bench=family('Bench pine',['#a37f52','#8a6742']),shield=[M('Shield blue','#3f5a86'),M('Shield rim','#8d918f')])
rng=random.Random(7103)
def chest(A,x0,x1,z0,z1,y,h):
 A.box(x0,x1,y,y+h*.72,z0,z1,P['chest'][0],skip='b');A.box(x0-.015,x1+.015,y+h*.72,y+h,z0-.015,z1+.015,P['chest'][1])
 for t in (.2,.8):p=x0+(x1-x0)*t;A.box(p-.03,p+.03,y,y+h+.005,z0-.02,z1+.02,P['iron'])
G=Acc('Lodge_FurnishingDressing')
# adventurers' store under the stair flight (the treads above keep every node off these tiles)
barrel(G,-2.0,-.55,0,.28,.8,P['staves'],P['iron'],P['lid'],rng)
for i in range(4):a=i*1.6;G.tube((-2.0+math.cos(a)*.1,.6,-.55+math.sin(a)*.1),(-2.0+math.cos(a)*.13,1.15,-.55+math.sin(a)*.13),.018,5,P['staves'][2])   # spears and staves in the barrel
crate(G,-1.62,-1.02,0,.55,-.95,-.35,P['crate'],P['batten']);crate(G,-1.55,-1.08,.55,.95,-.88,-.42,P['crate'][::-1],P['batten'])
sack(G,-2.05,.35,0,.4,.45,P['sack'][0],P['cord'],rot=.3);sack(G,-1.35,.3,0,.36,.42,P['sack'][2],P['cord'],rot=1.1)
G.lathe(-1.32,-.65,.95,[(.13,0),(.13,.02),(0,.02)],10,P['shield'][1]);G.lathe(-1.32,-.65,.97,[(.11,0),(.02,.03),(0,.035)],10,P['shield'][0],top=False)   # a round shield laid on the crates
# a low bench under the quest board (its tiles are already blocked by the board)
G.box(-4.1,-1.9,.4,.46,3.3,3.66,P['bench'][0])
for x in (-3.95,-2.05):G.box(x-.05,x+.05,0,.4,3.35,3.61,P['bench'][1])
G.box(-3.9,-3.5,.46,.52,3.35,3.6,P['books'][1]);G.lathe(-2.4,3.48,.46,[(.07,0),(.08,.12),(.05,.16)],6,P['staves'][0])
# the bay: a chest in the north end, books and a candle on the bay desk
chest(G,5.15,5.75,-2.92,-2.4,0,.5)
books(G,5.15,5.45,.91,-1.1,-.95,'x',P['books'],rng,hmin=.05,hmax=.07);candle(G,5.62,-1.05,.91,P['wax'],P['flame'],holder=P['brass'])
# map table: an inkpot, a quill and a lantern at the free corner
G.lathe(3.1,.05,1.01,[(.04,0),(.045,.05),(.025,.06)],6,P['ink']);G.beam((3.1,1.07,.05),(3.0,1.22,-.05),.012,.006,P['paper'])
lantern(G,.85,-1.05,1.01,P['iron'],P['glass'],h=.26)
# the hearth (measured: slab to y .18, back x 4.79, jambs z .20-.42 and 1.48-1.70, mantel from y 1.59): a sooted
# firebox with firedogs, logs, embers, a glowing back and three still flames, all inside the stone box
soot=M('Firebox soot','#27221e');glow=M('Ember glow','#a3401a',emit=1.0);ember=M('Ember bed','#e2691f',emit=1.5)
fire=[M('Fire gold','#ffb035',emit=1.7),M('Fire ember','#e2621c',emit=1.2)];bark=M('Log bark','#4b3626');endg=M('Log end grain','#c4a172')
G.box(4.775,4.79,.18,1.59,.42,1.48,soot);G.box(4.76,4.775,.26,.9,.62,1.28,glow)
G.box(4.09,4.79,.18,1.59,.42,.435,soot);G.box(4.09,4.79,.18,1.59,1.465,1.48,soot);G.box(4.09,4.79,1.575,1.59,.42,1.48,soot)
G.box(4.12,4.76,.18,.19,.44,1.46,M('Hearth ash','#6d6860'),skip='b')
for zz in (.72,1.18):
 G.beam((4.22,.19,zz),(4.62,.19,zz),.03,.03,P['iron']);G.beam((4.22,.19,zz),(4.22,.4,zz),.03,.03,P['iron'])
for a,b in (((4.3,.3,.62),(4.66,.34,1.3)),((4.3,.3,1.28),(4.66,.34,.6)),((4.42,.42,.8),(4.5,.42,1.12))):log(G,a,b,.065,bark,endg)
for i in range(8):G.rbox(rng.uniform(4.3,4.7),rng.uniform(.6,1.3),rng.uniform(.06,.1),rng.uniform(.05,.09),.19,.19+rng.uniform(.02,.04),rng.random()*3,ember,skip='b')
for i,(fx,fz) in enumerate(((4.5,.8),(4.46,.95),(4.52,1.12))):
 h=.42 if i==1 else .32;G.poly([(fx-.09,.35,fz-.08),(fx+.09,.35,fz-.06),(fx+.04,.35+h*.4,fz+.05),(fx,.35+h,fz),(fx-.06,.35+h*.45,fz+.06)],[(0,1,2),(0,2,4),(2,3,4)],fire[0] if i==1 else fire[1])
 G.poly([(fx,.35,fz-.1),(fx,.35,fz+.1),(fx+.03,.35+h*.4,fz+.12),(fx,.35+h*.95,fz),(fx-.03,.35+h*.45,fz-.12)],[(0,1,2),(0,2,4),(2,3,4)],fire[1] if i==1 else fire[0])
G.build(parent)
U=Acc('Lodge_UpperFurnishingDressing');ly=3.3
cols,rows=3,5;qx0,qx1,qz0,qz1=-4.98,-4.22,1.45,3.1;cw,rh=(qx1-qx0)/cols,(qz1-qz0)/rows
for i in range(cols):
 for j in range(rows):U.box(qx0+i*cw,qx0+(i+1)*cw,4.08,4.105,qz0+j*rh,qz0+(j+1)*rh,P['quilt'][(i+2*j)%4],skip='b')
candle(U,-4.45,-1.98,4.27,P['wax'],P['flame'],holder=P['brass']);books(U,-4.95,-4.55,4.27,-2.2,-1.95,'x',P['books'],rng,hmin=.05,hmax=.08)
U.lathe(-4.7,-2.9,4.27,[(.035,0),(.04,.05),(.022,.06)],6,P['ink'])
chest(U,-5.12,-4.42,-4.02,-3.55,ly,.5)
U.build(parent)
after=tris('Lodge_')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(OUT/'lodge.glb'),export_format='GLB',export_yup=True,export_animations=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lodge.blend'))
for f in ('lodge_wood.png','oak.png'):
 if (BASE/f).exists():shutil.copy(BASE/f,OUT/f)
c=json.loads((BASE/'material-contract.json').read_text());c['interiorPass']='2026-09-25 lodge v4 over v3: floors re-tiled in place, furniture oak, dressing off-node';c['baseSha256']=hashlib.sha256((BASE/'lodge.glb').read_bytes()).hexdigest();c['modelSha256']=hashlib.sha256((OUT/'lodge.glb').read_bytes()).hexdigest()
(OUT/'material-contract.json').write_text(json.dumps(c,indent=2))
print('[LODGE_V4] triangles',before,'->',after,kit.STATS)
