"""Proof renders of the Mage House & tower v1 (workbench, studio light, material colours): front 3/4, back 3/4,
side, top, cutaway (roofs and upper storeys hidden) and an upper cutaway, plus sheet.png. The Sept 13 terrain
around the placement is added as a context patch only (never exported)."""
import bpy,json,math,sys
import numpy as np
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'.studio-workspaces/holm-mage-v1/candidates/mage.blend'
OUT=ROOT/'scratchpad/holm_mage_v1';OUT.mkdir(parents=True,exist_ok=True)
PX,PY,PZ=114,6.15,58
bpy.ops.wm.open_mainfile(filepath=str(SRC))
sc=bpy.context.scene;sc.render.engine='BLENDER_WORKBENCH';sc.display.shading.light='STUDIO';sc.display.shading.color_type='MATERIAL'
sc.display.shading.show_shadows=True;sc.display.shading.show_cavity=True;sc.render.resolution_x=900;sc.render.resolution_y=700
T=json.loads((ROOT/'.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json').read_text());W=T['width']
V=[];F=[];x0,x1,z0,z1=-14,14,-13,15
for z in range(z0,z1+1):
 for x in range(x0,x1+1):V.append((x,-z,T['heights'][(z+PZ)*(W+1)+x+PX]-PY-.01))
n=x1-x0+1
for j in range(z1-z0):
 for i in range(x1-x0):F.append((j*n+i,j*n+i+1,(j+1)*n+i+1,(j+1)*n+i))
me=bpy.data.meshes.new('ContextTerrain');me.from_pydata(V,[],F);g=bpy.data.objects.new('ContextTerrain',me);sc.collection.objects.link(g)
gm=bpy.data.materials.new('ctx grass');gm.diffuse_color=(.36,.45,.22,1);me.materials.append(gm)
cam=bpy.data.objects.new('ProofCam',bpy.data.cameras.new('ProofCam'));sc.collection.objects.link(cam);sc.camera=cam;cam.data.lens=35
def look(name,eye,target,hide=()):
 for o in sc.objects:
  if o.type=='MESH':o.hide_render=any(o.name.startswith(h) for h in hide)
 e=Vector((eye[0],-eye[2],eye[1]));t=Vector((target[0],-target[2],target[1]))
 cam.location=e;cam.rotation_euler=(t-e).to_track_quat('-Z','Y').to_euler()
 sc.render.filepath=str(OUT/('view_'+name+'.png'));bpy.ops.render.render(write_still=True)
views=[('front_sw',(-17,13,19),(-1,4,1),()),('back_ne',(19,14,-17),(1,5,-1),()),('side_south',(1,6,27),(0,5,1),()),
 ('top',(0.5,32,6),(0,0,1),()),
 ('cutaway_ground',(4,21,9),(-.5,0,.8),('Mage_Roof','Mage_UpperShell','Mage_UpperFloor','Mage_UpperJoist','Mage_UpperRail','Mage_UpperGallery','Mage_UpperFurnishing','Mage_StairObservatory','Mage_ServiceLectern','Mage_ServiceTelescope','ContextTerrainX')),
 ('east_close',(14,5,1),(4,3,-1),()),
 ('cutaway_upper',(12,20,14),(1.5,5,-.5),('Mage_Roof','Mage_UpperShell','Mage_UpperGallery'))]
if len(sys.argv)>sys.argv.index('--')+1 if '--' in sys.argv else False:views=[v for v in views if v[0] in sys.argv[sys.argv.index('--')+1:]]
for v in views:look(*v)
# contact sheet 3 x 2
tiles=[]
for v in ['front_sw','back_ne','side_south','top','cutaway_ground','cutaway_upper']:
 p=OUT/('view_'+v+'.png')
 if not p.exists():continue
 im=bpy.data.images.load(str(p));a=np.array(im.pixels[:],dtype=np.float32).reshape(im.size[1],im.size[0],4);tiles.append(a)
if len(tiles)==6:
 h,w=tiles[0].shape[:2];sheet=np.zeros((h*2,w*3,4),dtype=np.float32)
 for i,a in enumerate(tiles):
  r,c=divmod(i,3);sheet[(1-r)*h:(2-r)*h,c*w:(c+1)*w]=a   # blender pixels start bottom-left
 img=bpy.data.images.new('sheet',w*3,h*2,alpha=True);img.pixels=sheet.ravel();img.filepath_raw=str(OUT/'sheet.png');img.file_format='PNG';img.save()
print('[MAGE_V1_VIEWS] done')
