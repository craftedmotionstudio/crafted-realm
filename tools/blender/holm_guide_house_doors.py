"""Hinged oak leaves with exported Blender opening actions, kept unbatched."""
import bpy,math
from mathutils import Vector
def build(B):
 prism,beam,wood=B['prism'],B['beam'],B['wood']
 iron=B['material']('Forged hinge iron',(.15,.16,.14))
 result=[]
 half=B['DOOR_WIDTH']/2-.04;left=-half;right=half;plank=2*half/5
 for name,z,direction in [('South',5.30,-1),('North',-5.30,1)]:
  hinge=bpy.data.objects.new('Door'+name+'Hinge',None);bpy.context.collection.objects.link(hinge);hinge.parent=B['root'];hinge.location=(left,-z,0)
  parts=[]
  for i in range(5):parts.append(prism('Door'+name+'OakPlank',left+i*plank+.006,left+(i+1)*plank-.006,.04,2.26,z-.045,z+.045,wood))
  for y in [.36,1.83]:parts.append(prism('Door'+name+'HingeStrap',left-.01,right-.25,y-.055,y+.055,z-.064,z+.064,iron))
  parts.append(beam('Door'+name+'Brace',(left+.10,.45,z),(right-.11,1.72,z),.12,.12,wood))
  parts.append(prism('Door'+name+'Latch',right-.24,right-.10,.99,1.10,z-.09,z+.09,iron))
  bpy.ops.object.select_all(action='DESELECT')
  for obj in parts:obj.select_set(True)
  bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();leaf=parts[0];leaf.name='Door'+name+'Leaf'
  # Mesh coordinates were authored in house space; translate them to the hinge.
  for vertex in leaf.data.vertices:vertex.co-=hinge.location
  leaf.parent=hinge;leaf.location=(0,0,0)
  for frame,angle in [(1,0),(25,direction*math.pi/2)]:
   hinge.rotation_euler.z=angle;hinge.keyframe_insert(data_path='rotation_euler',frame=frame)
  hinge.animation_data.action.name='Door'+name+'Open'
  result.append(hinge)
 bpy.context.scene.render.fps=24;bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=25;bpy.context.scene.frame_set(1)
 # Confirm actual transformed geometry remains outside masonry at every pose.
 for frame in range(1,26):
  bpy.context.scene.frame_set(frame);bpy.context.view_layer.update()
  for hinge in result:
   sign=1 if 'South' in hinge.name else -1
   for leaf in hinge.children:
    for vertex in leaf.data.vertices:
     p=leaf.matrix_world@vertex.co
     assert (-p.y)*sign>=5.175-1e-5,'Door sweep touches masonry'
 bpy.context.scene.frame_set(1)
 print('[GUIDE_DOORS] both real mesh sweeps clear wall faces at 25 poses')

