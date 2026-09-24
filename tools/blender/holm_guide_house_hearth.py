"""Fitted west-wall fireplace, tapered flue and low-poly animated fire."""
import bpy,math
def build(B):
 mesh,prism,beam=B['mesh'],B['prism'],B['beam'];stone,trim=B['stone'],B['sillmat']
 soot=B['material']('Sooted firebox',(.10,.10,.085));ember=B['material']('Ember ochre',(.80,.27,.035));flame=B['material']('Fire gold',(.98,.59,.08))
 for mat,power in [(ember,.7),(flame,1.7)]:
  mat.use_nodes=True;shader=mat.node_tree.nodes.get('Principled BSDF');shader.inputs['Base Color'].default_value=mat.diffuse_color;shader.inputs['Emission Color'].default_value=mat.diffuse_color;shader.inputs['Emission Strength'].default_value=power
 center=-2.9
 prism('GroundHearthSlab',-6.1,-4.65,.015,.13,center-1,center+1,trim)
 prism('GroundHearthBack',-6,-5.83,.13,1.65,center-.7,center+.7,soot)
 for sign in [-1,1]:
  z=center+sign*.72;prism('GroundHearthJamb',-5.88,-4.96,.13,1.1,z-.18,z+.18,stone)
 # Seven radial wedge stones form a real open arch, with a thick reveal.
 for i in range(7):
  a=i*math.pi/7+.018;b=(i+1)*math.pi/7-.018;verts=[]
  for x in [-5.88,-4.96]:
   for r,t in [(.56,a),(.88,a),(.88,b),(.56,b)]:verts.append((x,1.1+r*math.sin(t),center+r*math.cos(t)))
  mesh('GroundHearthArch',verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],trim)
 prism('GroundHearthMantel',-6,-4.82,1.98,2.14,center-1,center+1,trim)
 # Sloped hood narrows to the flue embedded at the wall; no room-height pillar.
 mesh('GroundHearthHood',[(-6.12,2.14,center-.86),(-4.99,2.14,center-.86),(-4.99,2.14,center+.86),(-6.12,2.14,center+.86),(-6.12,2.8,center-.46),(-5.40,2.8,center-.46),(-5.40,2.8,center+.46),(-6.12,2.8,center+.46)],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],stone)
 prism('UpperHearthFlue',-6.12,-5.40,2.8,6.5,center-.46,center+.46,stone)
 prism('RoofChimneyStack',-6.12,-5.40,6.5,7.45,center-.46,center+.46,stone)
 prism('RoofChimneyCoping',-6.23,-5.29,7.45,7.60,center-.57,center+.57,trim)
 prism('RoofChimneyThroat',-6.06,-5.46,7.60,7.64,center-.39,center+.39,soot)
 for sign in [-1,1]:beam('GroundHearthLog',(-5.58,.23,center-sign*.38),(-5.12,.23,center+sign*.38),.15,.15,B['wood'])
 for i in range(3):
  x=-5.45+i*.12;z=center+(i-1)*.20
  obj=mesh('HearthFlame'+str(i),[(-.10,0,-.10),(.10,0,-.10),(.13,.20,.03),(.02,.60,.02),(-.13,.24,.08)],[(0,1,2),(0,2,4),(2,3,4)],flame if i==1 else ember)
  obj.location=(x,-z,.23)
  for frame,scale in [(1,1),(7,.78+i*.08),(13,1.10-i*.07),(19,.83),(25,1)]:
   obj.scale=(1,1,scale);obj.keyframe_insert(data_path='scale',frame=frame)
  obj.animation_data.action.name='HearthFlicker'+str(i)
 bpy.context.scene.frame_set(1)
