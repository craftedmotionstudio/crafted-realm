"""Hinged oak leaves with exported Blender opening actions, kept unbatched."""
import bpy,math
from mathutils import Vector
FRAMES=[]
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
  if B.get('GUIDE_VERSION',3)>=5:
   # v5 (owner: 'it doesn't look like it's completely sealing the door frame'): a dark oak frame the leaf closes into.
   # Latch jamb and head stand in the leaf's own plane with an even 8 mm gap to its edges; behind the leaf, stops
   # close the last 4 cm to the masonry opening; the hinge jamb sits just behind the hinge circle (the swing clears
   # it), and a stone threshold stands 1 cm under the leaf. Hinge position, swing and timing are unchanged.
   o=1 if z>0 else -1;g=.008;W2=B['DOOR_WIDTH']/2;fw=.15;timber=B['timber'];sill=B['sillmat']
   Z=lambda a,b:(min(o*a,o*b),max(o*a,o*b))
   za,zb=Z(5.175,5.35);zs0,zs1=Z(5.175,5.235)
   frame=[prism('GroundShellDoorFrame'+name,right+g,right+fw,0,2.26+g,za,zb,timber),                    # latch jamb, leaf plane
          prism('GroundShellDoorFrame'+name,left-fw,right+fw,2.26+g,2.44,za,zb,timber),                  # head, leaf plane
          prism('GroundShellDoorFrame'+name,left-fw,left-g,0,2.26+g,zs0,zs1,timber),                     # hinge jamb, behind the hinge circle
          prism('GroundShellDoorFrame'+name,right-.03,right+g,.03,2.26+g,zs0,zs1,timber),               # stop behind the latch edge
          prism('GroundShellDoorFrame'+name,left-g,left+.03,.03,2.26+g,zs0,zs1,timber),                  # stop behind the hinge edge
          prism('GroundShellDoorFrame'+name,left+.03,right-.03,2.2,2.26+g,zs0,zs1,timber),               # head stop
          prism('GroundShellDoorThreshold'+name,-W2-.12,W2+.12,0,.03,*Z(4.99,5.37),sill)]                # threshold, 1 cm under the leaf
   FRAMES.append((hinge,[(right+g,right+fw,za,zb),(left-fw,right+fw,za,zb),(left-fw,left-g,zs0,zs1),(right-.03,right+g,zs0,zs1),(left-g,left+.03,zs0,zs1),(left+.03,right-.03,zs0,zs1)],
                  [(0,2.26+g),(2.26+g,2.44),(0,2.26+g),(.03,2.26+g),(.03,2.26+g),(2.2,2.26+g)]))
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
  # v5: the swinging leaf never enters its frame (every leaf vertex, every pose, against every frame block)
  for hinge,boxes,ys in FRAMES:
   for leaf in hinge.children:
    for vertex in leaf.data.vertices:
     p=leaf.matrix_world@vertex.co;x,zz,y=p.x,-p.y,p.z
     for (x0,x1,z0,z1),(y0,y1) in zip(boxes,ys):
      assert not(x0+1e-4<x<x1-1e-4 and z0+1e-4<zz<z1-1e-4 and y0+1e-4<y<y1-1e-4),('Door leaf enters its frame',hinge.name,frame,(x,y,zz),(x0,x1,z0,z1))
 bpy.context.scene.frame_set(1)
 print('[GUIDE_DOORS] both real mesh sweeps clear wall faces at 25 poses'+(' and their v5 frames' if FRAMES else ''))

