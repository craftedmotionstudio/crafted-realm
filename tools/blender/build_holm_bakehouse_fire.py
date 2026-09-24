"""Original low-poly animated oven fire, authored with Blender. Studio only."""
import bpy, math, json, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'.studio-workspaces/holm-bakehouse-fire-v1/candidates';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Emission Color'].default_value=(*color,1);b.inputs['Emission Strength'].default_value=.7;b.inputs['Roughness'].default_value=1;return m
orange=material('Banked amber flame',(.8,.20,.028));gold=material('Golden flame heart',(.95,.53,.085));coal=material('Glowing coals',(.28,.065,.012))
for i,(x,y,h)in enumerate([(-.35,0,.52),(0,.14,.67),(.33,-.1,.48),(-.08,-.3,.39)]):
 for core in [False,True]:
  r=.16 if not core else .095;hh=h if not core else h*.66
  verts=[(math.cos(k*math.tau/5)*r,math.sin(k*math.tau/5)*r,0)for k in range(5)]+[(.025,-.015,hh)]
  faces=[(k,(k+1)%5,5)for k in range(5)]+[(4,3,2,1,0)]
  me=bpy.data.meshes.new('Five sided flame');me.from_pydata(verts,[],faces);me.update();ob=bpy.data.objects.new('OvenFire_'+str(i)+('_Heart' if core else '_Amber'),me);bpy.context.collection.objects.link(ob);ob.location=(x,y,.03 if core else 0);me.materials.append(gold if core else orange)
  for frame in range(1,50,3):
   t=(frame-1)/48*math.tau;p=i*1.71
   ob.scale=(1+.055*math.sin(3*t+p),1+.035*math.sin(2*t+p),.9+.10*math.sin(3*t+p)+.06*math.sin(5*t+p));ob.rotation_euler[1]=.06*math.sin(2*t+p)
   ob.keyframe_insert(data_path='scale',frame=frame);ob.keyframe_insert(data_path='rotation_euler',frame=frame)
  ob.animation_data.action.name='OvenFireLoop_'+str(i)+('_Heart' if core else '_Amber')
for i in range(7):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.1,location=((i%4-1.5)*.22,(i//4-.5)*.34,-.035));ob=bpy.context.object;ob.name='OvenFire_Coal';ob.scale=(1.2,1,.45);ob.data.materials.append(coal)
scene=bpy.context.scene;scene.render.fps=24;scene.frame_start=1;scene.frame_end=49;scene.frame_set(1)
production=[o for o in scene.objects if o.type=='MESH'];tri=sum(len(p.vertices)-2 for o in production for p in o.data.polygons);assert tri<300
# Sample every authored frame for finite bounds; placement is on the existing cold firebed.
lo=[999]*3;hi=[-999]*3
for frame in range(1,50):
 scene.frame_set(frame)
 for o in production:
  for v in o.data.vertices:
   p=o.matrix_world@v.co
   for a in range(3):assert math.isfinite(p[a]);lo[a]=min(lo[a],p[a]);hi[a]=max(hi[a],p[a])
assert lo[0]>-.625 and hi[0]<.625 and lo[1]>-.75 and hi[1]<.75 and hi[2]<1.1
scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'oven-fire.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'oven-fire.glb'),export_format='GLB',export_yup=True,export_animations=True,export_animation_mode='SCENE',export_frame_range=True)
c={'schema':'holm-oven-fire-v1','status':'unpublished Blender animation candidate','placementLocalGltf':[-3.25,.46,-3.38],'triangleCount':tri,'durationSeconds':2,'sampledFrames':49,'boundsBlender':{'min':lo,'max':hi},'modelSha256':hashlib.sha256((OUT/'oven-fire.glb').read_bytes()).hexdigest(),'source':str(Path(__file__).relative_to(ROOT)),'interaction':'Visual fire only. Recipe and live station binding remain separate.'}
(OUT/'oven-fire.contract.json').write_text(json.dumps(c,indent=2),encoding='utf-8');print('[OVEN_FIRE]',json.dumps(c))
