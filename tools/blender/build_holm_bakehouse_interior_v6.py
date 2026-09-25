"""Bakehouse interior pass (kitchen wings v6, 2026-09-25) over the measured v5 model.

Floor flags and loft boards re-tiled in place (walk planes unchanged), warm oak for the furniture that read as
near-black smoked oak, and dressing only where no navigation node stands: an under-stair store, a crate by the
flour, laid worktables, a quilt on the loft bed, and a loft storage corner. Original design.
Run: "Blender 5.1/blender.exe" -b --python tools/blender/build_holm_bakehouse_interior_v6.py
"""
import bpy,sys,json,math,random
from pathlib import Path
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE));ROOT=HERE.parents[1]
BASE=ROOT/'.studio-workspaces/holm-kitchen-wings-v5/candidates';OUT=ROOT/'.studio-workspaces/holm-kitchen-wings-v6/candidates'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(BASE/'kitchen-character.blend'))
import holm_interior_kit as kit
from holm_interior_kit import Acc,M,family,barrel,crate,sack,jar,bowl,candle,lantern,books,log
from holm_interior_pass import retile,recolor,matte,tris
before=tris('Kitchen_')
parent=bpy.data.objects['Kitchen_Floor_0'].parent
# ---- floors: sandstone flags below, pine boards in the loft (same walk planes)
retile('Kitchen_Floor_0','Kitchen_Floor_Flags','flags',family('Bakehouse flag',['#9c8862','#8f7b57','#a7926b','#85724f']),M('Bakehouse flag joint','#5c4f3b'),6101)
retile('Kitchen_UpperFloor_0','Kitchen_UpperFloor_Boards','boards',family('Bakehouse loft board',['#8a6440','#7b5838','#94704a','#6f5033']),M('Bakehouse loft seam','#3a2a1c'),6102,run='z')
# ---- furniture: warm oak instead of near-black smoked oak (shell, roof and stair frames keep theirs)
oak=matte('#74502f','Bakehouse furniture oak');smoked=bpy.data.materials['Smoked oak']
recolor(['Kitchen_Worktable_','Kitchen_Pantry_1','Kitchen_Furnishings_','Kitchen_Tools_','Kitchen_UpperFurnishing_0'],{'Smoked oak':oak})
recolor(['Kitchen_Oven_0'],{'Warm fieldstone':matte('#8a5a3e','Bakehouse oven brick')});recolor(['Kitchen_Oven_1'],{'Cold oven soot':matte('#2e2622','Bakehouse oven mouth')})
recolor(['Kitchen_Stair_Tread'],{'Smoked oak':matte('#5e3f26','Bakehouse stair oak')})
P=dict(staves=family('Barrel stave',['#7b5635','#6c4a2e','#85603b']),lid=M('Barrel head','#8d6a44'),iron=M('Wrought iron','#343534'),
 crate=family('Crate board',['#9a7a52','#8a6b46','#a4845a']),batten=M('Crate batten','#6a4c2f'),sack=family('Sackcloth',['#c4b184','#b09c70','#d3c29a']),cord=M('Hemp cord','#7a6440'),
 pots=[M('Terracotta','#a85f39'),M('Glazed green','#6f8a63'),M('Stoneware cream','#cbbd98'),M('Glazed blue','#52708f'),M('Glazed brown','#7a4a2a')],
 bread=family('Bread crust',['#c08a4a','#a8703a','#d19a58']),wood=family('Kitchen treen',['#9c7448','#b48a58']),flour=M('Flour dust','#ece3cc'),
 wax=M('Candle wax','#efe6c8'),flame=M('Candle flame','#ffc15a',emit=1.5),brass=M('Warm brass','#b59546'),
 quilt=[M('Quilt blue','#4d6788'),M('Quilt cream','#dccaa0'),M('Quilt moss','#5e7a45'),M('Quilt rust','#9a4a2e')],books=family('Book cloth',['#7a2e25','#2f4d6b','#3f5e37','#8a6a2a']))
rng=random.Random(6103)
G=Acc('Kitchen_Furnishings_Dressing')
# under the stair flight (no floor node: the treads above obstruct the capsule)
barrel(G,-.55,-1.62,0,.27,.78,P['staves'],P['iron'],P['lid'],rng)
sack(G,.18,-1.82,0,.4,.62,P['sack'][0],P['cord'],rot=.5);sack(G,.12,-1.28,0,.36,.52,P['sack'][2],P['cord'],rot=1.4)
G.lathe(-.55,-1.62,.78,[(.2,0),(.22,.05),(0,.05)],8,P['sack'][1],top=False)   # a folded sack on the barrel head
# a crate between the flour sacks and the supply buckets, with a basket on it
crate(G,2.96,3.5,0,.5,-1.88,-1.36,P['crate'],P['batten'])
G.lathe(3.23,-1.62,.5,[(.14,0),(.19,.12),(.2,.14)],8,P['wood'][1],top=True,top_m=P['bread'][1])
# prep table (free end of the top, x -2.9..-2.1): rolling pin, flour scatter, jug, stacked bowls
y=1.02;G.box(-2.85,-2.2,y,y+.004,1.25,1.85,P['flour'],skip='b')
G.tube((-2.75,y+.035,1.5),(-2.3,y+.035,1.62),.032,6,P['wood'][1]);G.tube((-2.82,y+.035,1.48),(-2.75,y+.035,1.5),.015,5,P['wood'][0],caps=False);G.tube((-2.3,y+.035,1.62),(-2.23,y+.035,1.64),.015,5,P['wood'][0],caps=False)
jar(G,-2.35,1.95,y,.08,.26,P['pots'][2],style=2)
for i in range(3):bowl(G,-2.55,1.18,y+i*.05,.13-.01*i,P['pots'][[0,4,0][i]],inner=P['pots'][2])
# the wing worktable (x 5.55..6.65, z -4..-2): loaves on a board, a crock of salt, a basket of eggs
G.box(5.7,6.3,y,y+.03,-3.9,-3.3,P['wood'][0])
for i,(bx,bz) in enumerate(((5.85,-3.72),(6.12,-3.5),(5.9,-3.45))):G.lathe(bx,bz,y+.03,[(.1,0),(.12,.05),(.08,.1),(0,.12)],7,P['bread'][i],top=False)
jar(G,6.4,-2.3,y,.1,.2,P['pots'][3],lid=P['wood'][0],style=1)
G.lathe(5.95,-2.45,y,[(.13,0),(.16,.1),(.17,.12)],8,P['wood'][1],top=True,top_m=P['sack'][2])
for i in range(5):a=i*1.26;G.lathe(5.95+math.cos(a)*.07,-2.45+math.sin(a)*.07,y+.1,[(.028,0),(.035,.03),(0,.07)],6,P['pots'][2],top=False)
G.build(parent)
# ---- loft: quilt on the bed, candle on the chest, and a storage corner north of the loft stance
U=Acc('Kitchen_UpperFurnishing_Dressing');ly=3.3
cols,rows=4,4;qx0,qx1,qz0,qz1=-4.48,-3.1,.95,2.3;cw,rh=(qx1-qx0)/cols,(qz1-qz0)/rows
for i in range(cols):
 for j in range(rows):U.box(qx0+i*cw,qx0+(i+1)*cw,4.07,4.1,qz0+j*rh,qz0+(j+1)*rh,P['quilt'][(i+2*j)%4],skip='b')
candle(U,-4.1,-1.2,4.08,P['wax'],P['flame'],holder=P['brass']);U.box(-4.6,-4.25,4.08,4.13,-1.8,-1.5,P['books'][0])
barrel(U,-3.85,-4.45,ly,.28,.82,P['staves'],P['iron'],P['lid'],rng);barrel(U,-3.25,-4.5,ly,.26,.74,P['staves'],P['iron'],P['lid'],rng)
for i,(sx,sz) in enumerate(((-2.55,-4.45),(-2.2,-4.35),(-2.4,-3.85))):sack(U,sx,sz,ly,.38,.58-.06*i,P['sack'][i%3],P['cord'],rot=i)
crate(U,-3.95,-3.35,ly,ly+.5,-3.85,-3.3,P['crate'],P['batten'])
lantern(U,-3.65,-3.58,ly+.5,P['iron'],M('Lantern glow','#ffd27a',emit=1.2))
U.build(parent)
after=tris('Kitchen_')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(OUT/'kitchen-character.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_frame_range=True,export_force_sampling=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'kitchen-character.blend'))
c=json.loads((BASE/'kitchen-character.contract.json').read_text());c['schema']='holm.kitchen-character.v6';c['status']='Interior pass 2026-09-25 over v5 (floors re-tiled in place, furniture oak, dressing off-node); navigation re-extracted in holm-kitchen-navigation-v4'
(OUT/'kitchen-character.contract.json').write_text(json.dumps(c,indent=2))
print('[BAKEHOUSE_V6] triangles',before,'->',after,'dressing',kit.STATS)
