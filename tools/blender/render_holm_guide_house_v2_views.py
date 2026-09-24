"""Proof renders of the guide house v2 source: five fixed views (workbench, flat studio light)."""
import bpy,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'.studio-workspaces/holm-guide-house-overhaul-v2/candidates/holm_guide_house_overhaul_v2.blend'
OUT=ROOT/'scratchpad/holm_guide_house_overhaul_v2';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(SRC))
sc=bpy.context.scene;sc.render.engine='BLENDER_WORKBENCH';sc.display.shading.light='STUDIO';sc.display.shading.color_type='MATERIAL'
sc.display.shading.show_shadows=True;sc.render.resolution_x=900;sc.render.resolution_y=700
sc.world=sc.world or bpy.data.worlds.new('w')
cam=bpy.data.objects.new('ProofCam',bpy.data.cameras.new('ProofCam'));sc.collection.objects.link(cam);sc.camera=cam;cam.data.lens=40
# game (x,y,z) -> blender (x,-z,y); the house centre is near the origin
def look(name,eye,target=(0,4,0)):
 e=Vector((eye[0],-eye[2],eye[1]));t=Vector((target[0],-target[2],target[1]))
 cam.location=e;cam.rotation_euler=(t-e).to_track_quat('-Z','Y').to_euler()
 sc.render.filepath=str(OUT/('view_'+name+'.png'));bpy.ops.render.render(write_still=True)
look('front_se',(16,11,19))
look('east_dormer',(19,9,2),(4,6,0))
look('north_west',(-17,12,-18))
look('south_gable',(0,8,22))
look('roof_top',(8,24,8),(0,6,0))
print('[GUIDE_HOUSE_V2_VIEWS] done')
