"""Holm Bank interior pass (bank v2, 2026-09-25) over the measured v1 model.

The counting hall already had its checker flags, booths, shelves and vault; the plain parts were the clerks'
wing and the upstairs office. Wing and upper floors re-tiled in place as boards (walk planes unchanged), a
strongroom store under the wing stair (iron-bound boxes, ledger crates, coin sacks, a lantern), and a strongbox
in the office's free corner. Service meshes (Bank_Service*) keep their names and geometry.
Run: "Blender 5.1/blender.exe" -b --python tools/blender/build_holm_bank_interior_v2.py
"""
import bpy,sys,math,random
from pathlib import Path
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE));ROOT=HERE.parents[1]
BASE=ROOT/'.studio-workspaces/holm-bank-v1/candidates';OUT=ROOT/'.studio-workspaces/holm-bank-v2/candidates'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(BASE/'bank.blend'))
import holm_interior_kit as kit
from holm_interior_kit import Acc,M,family,barrel,crate,sack,lantern,books
from holm_interior_pass import retile,tris
before=tris('Bank_');root=bpy.data.objects['Bank_Root']
retile('Bank_FloorWing','Bank_FloorWingBoards','boards',family('Bank wing board',['#8a6440','#7b5838','#94704a','#6f5033']),M('Bank wing seam','#3a2a1c'),8101,parent=root,run='z',width=.28)
retile('Bank_UpperFloor','Bank_UpperFloorBoards','boards',family('Bank office board',['#94704a','#86633f','#9e7a52','#7b5a3a']),M('Bank office seam','#3a2a1c'),8102,parent=root,run='z',width=.26)
P=dict(staves=family('Barrel stave',['#7b5635','#6c4a2e','#85603b']),lid=M('Barrel head','#8d6a44'),iron=M('Wrought iron','#343534'),brass=M('Warm brass','#b59546'),
 crate=family('Crate board',['#9a7a52','#8a6b46','#a4845a']),batten=M('Crate batten','#6a4c2f'),coin=family('Coin sack',['#b8a476','#a8946a']),
 box=family('Strongbox oak',['#6e4b2e','#5a3c24']),glass=M('Lantern glow','#ffd27a',emit=1.2),books=family('Ledger cloth',['#2f4d6b','#6b2a22','#3f5e37']))
rng=random.Random(8103)
def strongbox(A,x0,x1,z0,z1,y,h):
 A.box(x0,x1,y,y+h*.75,z0,z1,P['box'][0],skip='b');A.box(x0-.012,x1+.012,y+h*.75,y+h,z0-.012,z1+.012,P['box'][1])
 for t in (.15,.5,.85):p=x0+(x1-x0)*t;A.box(p-.025,p+.025,y,y+h+.004,z0-.018,z1+.018,P['iron'])
 A.box((x0+x1)/2-.05,(x0+x1)/2+.05,y+h*.5,y+h*.78,z1+.018,z1+.035,P['brass'])
G=Acc('Bank_FurnishingStrongroom')
# under the wing stair (the treads above keep every node off these tiles): heights stay under the flight
strongbox(G,-5.2,-4.55,-1.2,-.7,0,.5);strongbox(G,-5.15,-4.6,-1.15,-.75,.5,.4)
crate(G,-4.45,-3.98,0,.5,-1.2,-.7,P['crate'],P['batten'])
for j in range(3):G.box(-4.4+j*.12,-4.3+j*.12,.5,.8,-1.1,-.8,P['books'][j])   # ledgers on the crate
for i,(sx,sz) in enumerate(((-5.0,-.3),(-4.65,-.25),(-4.9,.05),(-4.45,-.2))):
 sack(G,sx,sz,0,.26,.34,P['coin'][i%2],P['brass'],rot=i)
barrel(G,-4.55,.45,0,.25,.72,P['staves'],P['iron'],P['lid'],rng)
lantern(G,-4.55,.45,.72,P['iron'],P['glass'],h=.26)
G.build(root)
U=Acc('Bank_UpperFurnishingStrongbox')
strongbox(U,-5.42,-4.84,-3.92,-3.4,3.0,.5)
books(U,-5.38,-4.9,3.5,-3.85,-3.5,'x',P['books'],rng,hmin=.05,hmax=.09)
U.build(root)
after=tris('Bank_')
bpy.ops.object.select_all(action='DESELECT')
def desc(o):
 yield o
 for c in o.children:yield from desc(c)
for o in desc(root):o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(OUT/'bank.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_materials='EXPORT',export_extras=True,export_cameras=False,export_lights=False)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bank.blend'))
print('[BANK_V2] triangles',before,'->',after,kit.STATS)
