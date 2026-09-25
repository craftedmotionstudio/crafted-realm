"""Interior pass for the M4.4 island buildings (2026-09-25): mage, lastlight, haven, survival, quarry.

Per building (CONFIG): plain floors re-tiled in place (global pattern clipped to each top face, old top lowered
1 cm, so support heights and nodes do not move); furniture tops dressed with small props strictly inside each
top face (no footprint grows, so no node can change); and every non-wall mesh that shared a material with a
clipped wall mesh gets its own copy (the island cutaway clips per material). Service meshes keep their names and
geometry. Export mirrors the M4.4 builders (root and descendants, export_apply, extras).
Run: "Blender 5.1/blender.exe" -b --python tools/blender/build_holm_m44_interior.py -- <id> <version>
"""
import bpy,sys,json,math,random,zlib
from pathlib import Path
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE));ROOT=HERE.parents[1]
bid,ver=sys.argv[sys.argv.index('--')+1],int(sys.argv[sys.argv.index('--')+2])
BASE=ROOT/f'.studio-workspaces/holm-{bid}-v1/candidates';OUT=ROOT/f'.studio-workspaces/holm-{bid}-v{ver}/candidates';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(BASE/f'{bid}.blend'))
import holm_interior_kit as kit
from holm_interior_kit import Acc,M,family,jar,bowl,candle,books
from holm_interior_pass import retile_poly,separate_clip_materials,tris
PREFIX=bid.capitalize()+'_'
FLAGS=lambda n,h:(family(n,h),)
BOARDS=['#8a6440','#7b5838','#94704a','#6f5033'];GREYFLAGS=['#9a968c','#8a877e','#a7a398','#7f7c74'];WARMFLAGS=['#a8987a','#978a6e','#b3a383','#8c7f64']
CONFIG={
 'mage':dict(floors=[('Mage_FloorGround','flags',WARMFLAGS,'#5e5546','x',0.0,['Mage dressed sandstone']),('Mage_FloorGround','boards',BOARDS,'#3a2a1c','z',0.0,['Mage floorboards']),('Mage_UpperFloorLibrary','boards',BOARDS,'#3a2a1c','z'),('Mage_UpperFloorObservatory','boards',['#94704a','#86633f','#9e7a52','#7b5a3a'],'#3a2a1c','x')],
             levels=[0,3,6],dress=['Mage_Furnishing','Mage_UpperFurnishing'],theme='mage'),
 'lastlight':dict(floors=[('Lastlight_FloorTower','flags',GREYFLAGS,'#56534c','x'),('Lastlight_FloorWing','flags',WARMFLAGS,'#5e5546','x'),('Lastlight_FloorPorch','flags',WARMFLAGS,'#5e5546','x'),
             ('Lastlight_UpperFloorKeeper','boards',BOARDS,'#3a2a1c','z'),('Lastlight_UpperFloorWatch','boards',['#94704a','#86633f','#9e7a52','#7b5a3a'],'#3a2a1c','x'),('Lastlight_UpperFloorGallery','flags',GREYFLAGS,'#56534c','x')],
             levels=[0,3,6,9],dress=['Lastlight_Furnishing','Lastlight_UpperFurnishingKeeper','Lastlight_UpperFurnishingWatch'],theme='keeper'),
 'haven':dict(floors=[],levels=[0.15],dress=['Haven_Furnishing','Haven_Props'],theme='haven'),
 'survival':dict(floors=[],levels=[0,0.6],dress=['Survival_FurnishingCanopy','Survival_FurnishingStore','Survival_FurnishingYard'],theme='camp'),
 'quarry':dict(floors=[('Quarry_FloorMain','flags',GREYFLAGS,'#4e4b45','x'),('Quarry_FloorLeanToMain','flags',GREYFLAGS,'#4e4b45','x'),('Quarry_UpperFloorMain','boards',BOARDS,'#3a2a1c','z')],
             levels=[0,2.8],dress=['Quarry_FurnishingMain','Quarry_UpperFurnishingMain'],theme='quarry')}
C=CONFIG[bid];before=tris(PREFIX);root=next(o for o in bpy.data.objects if o.parent is None and o.name.startswith(PREFIX[:-1]))
log={'floors':[],'dressedFaces':0}
for f in C['floors']:
 name,style,tones,seam,run=f[:5];h=f[5] if len(f)>5 else None;mats=f[6] if len(f)>6 else None;tag=name+('Tiles' if not mats else 'Tiles'+style.capitalize())
 o,polys,top=retile_poly(name,tag,style,family(tag+' tone',tones),M(tag+' seam',seam),zlib.crc32(tag.encode())%9973,width=.3,run=run,height=h,mats=mats)
 log['floors'].append((name,len(polys),round(top,3)))
changed=separate_clip_materials(PREFIX,r'^%s(Shell|UpperShell|Glazing)'%PREFIX)
# ---- dress furniture tops (props strictly inside each face, inset 0.08)
P=dict(wax=M('Candle wax','#efe6c8'),flame=M('Candle flame','#ffc15a',emit=1.5),brass=M('Warm brass','#b59546'),
 pots=[M('Terracotta','#a85f39'),M('Glazed green','#6f8a63'),M('Stoneware cream','#cbbd98'),M('Glazed blue','#52708f'),M('Glazed brown','#7a4a2a')],
 books=family('Book cloth',['#7a2e25','#2f4d6b','#3f5e37','#8a6a2a','#5a3a5e']),paper=M('Parchment','#d9c89a'),ink=M('Ink black','#1f1c1a'),
 crystal=M('Rune crystal','#7fa0d8',emit=.8),iron=M('Wrought iron','#343534'),ore=family('Ore lump',['#8a5a3e','#6f6a60','#9a7a4a']),
 bread=M('Bread crust','#c08a4a'),fish=M('Fish silver','#9aa8ad'),rope=M('Hemp cord','#7a6440'),pewter=M('Pewter','#8d918f'))
rng=random.Random(zlib.crc32(bid.encode())%10007)
A=Acc(PREFIX+'FurnishingDressing');U=Acc(PREFIX+'UpperFurnishingDressing')
def item(T,x,z,y,rel,theme):
 r=rng.random()
 if rel>1.3:   # shelf: jars and books
  if r<.5:jar(T,x,z,y,rng.uniform(.04,.06),rng.uniform(.1,.16),P['pots'][rng.randrange(5)],style=rng.randrange(3))
  else:books(T,x-.08,x+.08,y,z-.07,z+.05,'x',P['books'],rng,hmin=.12,hmax=.2)
  return
 if theme=='mage' and r<.3:T.lathe(x,z,y,[(.03,0),(.045,.06),(0,.16)],5,P['crystal'],top=False)
 elif theme=='quarry' and r<.4:
  for i in range(3):T.lathe(x+rng.uniform(-.06,.06),z+rng.uniform(-.06,.06),y,[(.05,0),(.045,.04),(0,.07)],5,P['ore'][rng.randrange(3)],top=False,rot=rng.random())
 elif theme=='haven' and r<.35:T.lathe(x,z,y,[(.0,0),(.05,.0)],6,P['rope']);T.lathe(x,z,y,[(.1,0),(.1,.03),(.06,.03),(.06,0)],10,P['rope'],top=False)
 elif r<.45:candle(T,x,z,y,P['wax'],P['flame'],holder=P['brass'],h=.12)
 elif r<.65:jar(T,x,z,y,.06,.18,P['pots'][rng.randrange(5)],style=2)
 elif r<.82:bowl(T,x,z,y,.08,P['pots'][2],inner=P['pots'][4])
 else:T.box(x-.12,x+.12,y,y+.006,z-.09,z+.09,P['paper'],skip='b');T.lathe(x+.1,z+.05,y,[(.025,0),(.03,.04),(.018,.05)],6,P['ink'])
for o in list(bpy.data.objects):
 if o.type!='MESH' or not any(o.name.startswith(d) for d in C['dress']):continue
 mw=o.matrix_world
 for p in o.data.polygons:
  n=(mw.to_3x3()@p.normal).normalized()
  if n.z<.97 or not(.12<p.area<3.5):continue
  vs=[mw@o.data.vertices[i].co for i in p.vertices];y=vs[0].z;xs=[v.x for v in vs];zs=[-v.y for v in vs]
  if max(xs)-min(xs)<.3 or max(zs)-min(zs)<.3:continue
  if abs((max(xs)-min(xs))*(max(zs)-min(zs))-p.area)>1e-3:continue
  lv=max([l for l in C['levels'] if l<=y+.01] or [0]);rel=y-lv
  if not(.55<rel<2.3):continue
  mat=o.data.materials[p.material_index].name.lower() if o.data.materials else ''
  if any(k in mat for k in ('linen','blanket','wool','quilt','straw','cloth','bed')):continue
  T=U if lv>0.9 else A;k=min(4,max(1,int(p.area/.35)));log['dressedFaces']+=1
  for i in range(k):
   x=rng.uniform(min(xs)+.1,max(xs)-.1);z=rng.uniform(min(zs)+.1,max(zs)-.1);item(T,x,z,y,rel,C['theme'])
A.build(root);U.build(root)
after=tris(PREFIX)
bpy.ops.object.select_all(action='DESELECT')
def desc(o):
 yield o
 for c in o.children:yield from desc(c)
for o in desc(root):o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(OUT/f'{bid}.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_materials='EXPORT',export_extras=True,export_cameras=False,export_lights=False,export_animations=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'{bid}.blend'))
log.update(triangles=[before,after],materialCopies=changed,acc=kit.STATS)
(OUT/'interior_pass.json').write_text(json.dumps(log,indent=1))
print('[M44_INTERIOR]',bid,json.dumps(log)[:900])
