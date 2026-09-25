"""Warden's Keep interior pass (keep v6, 2026-09-25) over the measured v5 model.

Hall, barracks range and gate passage floors re-tiled in place as coursed grey flags, the hall's upper floor as
boards (walk planes unchanged); warm oak for the near-black furniture; dressing on the tables and bunks and only
on tiles no navigation node uses: a store under the hall stair, a barrel and crate in the hall's south-east
corner, a barrel of arrows and shields in its south-west corner. Original design.
Run: "Blender 5.1/blender.exe" -b --python tools/blender/build_holm_warden_keep_interior_v6.py
"""
import bpy,sys,json,math,random
from pathlib import Path
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE));ROOT=HERE.parents[1]
BASE=ROOT/'.studio-workspaces/holm-warden-keep-v5/candidates';OUT=ROOT/'.studio-workspaces/holm-warden-keep-v6/candidates'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(BASE/'keep.blend'))
import holm_interior_kit as kit
from holm_interior_kit import Acc,M,family,barrel,crate,sack,jar,bowl,candle,lantern,books
from holm_interior_pass import retile,recolor,matte,tris
before=tris('Keep_')
retile('Keep_Floor_1_5','Keep_Floor_Flags','flags',family('Keep flag',['#6f6d64','#7c7a70','#615f57','#86837a']),M('Keep flag joint','#3f3d38'),9101)
retile('Keep_Upper_Floor_2_4','Keep_Upper_Floor_Boards','boards',family('Keep hall board',['#7d5a38','#6f4f31','#86623e','#654730']),M('Keep hall seam','#2f2217'),9102,run='z',width=.3)
recolor(['Keep_Furnishing_3_21','Keep_Upper_Furnishing_4_13'],{'Keep aged oak':matte('#6e4b2e','Keep furniture oak')})
recolor(['Keep_Stair_1_30'],{'Keep aged oak':matte('#5a3c24','Keep stair oak')})
P=dict(staves=family('Barrel stave',['#7b5635','#6c4a2e','#85603b']),lid=M('Barrel head','#8d6a44'),iron=M('Wrought iron','#343534'),brass=M('Warm brass','#b59546'),
 crate=family('Crate board',['#9a7a52','#8a6b46','#a4845a']),batten=M('Crate batten','#6a4c2f'),sack=family('Sackcloth',['#c4b184','#b09c70']),cord=M('Hemp cord','#7a6440'),
 pewter=M('Pewter','#8d918f'),bread=M('Bread crust','#c08a4a'),wax=M('Candle wax','#efe6c8'),flame=M('Candle flame','#ffc15a',emit=1.5),glass=M('Lantern glow','#ffd27a',emit=1.2),
 blanket=family('Barracks blanket',['#6b2a22','#5f6a74','#6b5a3c']),linen=M('Cream linen','#e3d7b6'),paper=M('Parchment','#d9c89a'),ink=M('Ink black','#1f1c1a'),
 books=family('Book cloth',['#7a2e25','#2f4d6b','#3f5e37']),shield=[M('Shield red','#7c2a26'),M('Shield blue','#3f5a86'),M('Shield rim','#8d918f')],fletch=M('Arrow fletching','#e6e0d0'))
rng=random.Random(9103)
G=Acc('Keep_Furnishing_Dressing')
# hall table (x -6.45..-4.15, z -4.12..-2.68, top .92): tankards, bread, a candle, an unrolled muster roll
t=.92
for x,z in ((-6.1,-3.9),(-5.2,-2.9),(-4.5,-3.8)):G.lathe(x,z,t,[(.05,0),(.055,.14),(.058,.15)],8,P['pewter'])
G.lathe(-5.6,-3.4,t,[(.11,0),(.13,.06),(.09,.12),(0,.14)],8,P['bread'],top=False);candle(G,-4.9,-3.35,t,P['wax'],P['flame'],holder=P['brass'])
G.box(-5.1,-4.55,t,t+.004,-4.0,-3.6,P['paper'],skip='b');G.tube((-5.1,t+.02,-4.0),(-5.1,t+.02,-3.6),.02,6,P['paper'])
# barracks: blankets and pillows on the three bunks (tops y 1.0), dice and tankards on the long table
for bx in (2.3,3.7,5.1):
 G.box(bx+.05,bx+.95,1.0,1.06,-8.4,-7.58,P['blanket'][int(bx)%3],skip='b');G.box(bx+.2,bx+.8,1.0,1.09,-8.62,-8.42,P['linen'],skip='b')
for x in (2.9,3.8,4.9):G.lathe(x,-5.7,t,[(.05,0),(.055,.14),(.058,.15)],8,P['pewter'])
for i in range(3):G.box(4.2+i*.07,4.24+i*.07,t,t+.04,-5.62-i*.04,-5.58-i*.04,P['linen'])
lantern(G,3.35,-5.55,t,P['iron'],P['glass'],h=.26)
# under the hall stair (heights kept below the flight): sacks of meal, a crate of stores, a small barrel
sack(G,-9.1,1.25,0,.4,.6,P['sack'][0],P['cord'],rot=.3);sack(G,-8.55,1.3,0,.36,.55,P['sack'][1],P['cord'],rot=1.2)
crate(G,-9.4,-8.8,0,.5,1.55,1.95,P['crate'],P['batten']);barrel(G,-8.2,1.6,0,.26,.7,P['staves'],P['iron'],P['lid'],rng)
# hall south-east corner: barrel and crate; south-west corner: a barrel of arrows and two shields against the wall
barrel(G,-3.6,5.55,0,.3,.85,P['staves'],P['iron'],P['lid'],rng);crate(G,-4.2,-3.72,0,.55,5.25,5.9,P['crate'],P['batten'])
barrel(G,-9.3,5.55,0,.28,.75,P['staves'],P['iron'],None,rng)
for i in range(7):
 a=i*.9;x=-9.3+math.cos(a)*.12;z=5.55+math.sin(a)*.12;G.tube((x,.5,z),(x*1.0+math.cos(a)*.03,1.15,z+math.sin(a)*.03),.012,4,P['staves'][2],caps=False)
 G.box(x-.02,x+.02,1.05,1.15,z-.006,z+.006,P['fletch'])
for i,(x,c) in enumerate(((-9.1,0),(-9.62,1))):
 G.tube((x,.45,5.93),(x,.45,5.97),.23,10,P['shield'][c],cap_m=P['shield'][c]);G.tube((x,.45,5.9),(x,.45,5.93),.25,10,P['shield'][2],caps=False)
G.build(None)
U=Acc('Keep_Upper_Furnishing_Dressing');ut=4.12
candle(U,-4.5,-6.5,ut,P['wax'],P['flame'],holder=P['brass']);books(U,-6.3,-5.9,ut,-7.3,-7.0,'x',P['books'],rng,hmin=.05,hmax=.08)
U.lathe(-5.0,-7.05,ut,[(.035,0),(.04,.05),(.022,.06)],6,P['ink']);U.beam((-5.0,ut+.06,-7.05),(-4.9,ut+.2,-7.15),.012,.006,P['linen'])
U.box(-6.2,-5.7,3.95,4.0,-5.05,-4.65,P['linen'])   # a pillow at the bed head
U.build(None)
after=tris('Keep_')
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects:
 if o.type=='MESH' and o.name.startswith('Keep_'):o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'keep.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=False)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'keep.blend'))
c=json.loads((BASE/'keep.contract.json').read_text());c['schema']='holm.warden-keep.v6';c['interiorPass']='2026-09-25 over v5: floors re-tiled in place, furniture oak, dressing off-node; navigation re-extracted in holm-keep-navigation-v5'
(OUT/'keep.contract.json').write_text(json.dumps(c,indent=2))
for f in ('roof-128.png','stone-128.png','keep-exterior.png'):
 if (BASE/f).exists():(OUT/f).write_bytes((BASE/f).read_bytes())
print('[KEEP_V6] triangles',before,'->',after,kit.STATS)
