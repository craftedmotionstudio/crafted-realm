"""Original Guide Bram candidate. Blender 4.5 background, no live publication."""
import bpy, math, json, pathlib, hashlib, struct
from mathutils import Vector

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / '.studio-workspaces/guide-bram-overhaul-v1/candidates'
OUT.mkdir(parents=True, exist_ok=True)
assert 'Guide Bram' in (ROOT/'STORY_BIBLE.md').read_text(encoding='utf-8')
assert (ROOT/'docs/rebuild/holm-overhaul/arrival-layout.json').exists()
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
palette = [('Olive wool',(.27,.34,.16)),('Ochre mantle',(.55,.36,.13)),('Weathered skin',(.62,.40,.26)),('Grey hair',(.43,.44,.38)),('Dark leather',(.16,.085,.043)),('Trouser wool',(.23,.24,.18)),('Eyes and seams',(.065,.048,.027)),('Brass clasp',(.65,.47,.18)),('Book pages',(.67,.59,.39))]
mats=[]
for name,color in palette:
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
 m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*color,1)
 m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.88; mats.append(m)
verts=[]; faces=[]; mi=[]; weights=[]
def vertex(p,w):
 verts.append(tuple(p)); weights.append(w if isinstance(w,dict) else {w:1}); return len(verts)-1
def face(ids,mat): faces.append(ids); mi.append(mat)
def rings(profiles,mat,bone,n=10):
 # profile = cx,cy,z, radius x, radius y, optional bone-weight mapping.
 rows=[]
 for p in profiles:
  cx,cy,z,rx,ry=p[:5]; w=p[5] if len(p)>5 else bone
  rows.append([vertex((cx+rx*math.sin(2*math.pi*i/n),cy-ry*math.cos(2*math.pi*i/n),z),w) for i in range(n)])
 face(tuple(reversed(rows[0])),mat)
 for a,b in zip(rows,rows[1:]):
  for i in range(n): face((a[i],a[(i+1)%n],b[(i+1)%n],b[i]),mat)
 face(tuple(rows[-1]),mat)
def ellipsoid(c,s,mat,bone,n=10):
 rings([(c[0],c[1],c[2]+s[2]*math.sin(t),max(.001,s[0]*math.cos(t)),max(.001,s[1]*math.cos(t))) for t in [-math.pi/2,-1.0,-.5,0,.5,1.0,math.pi/2]],mat,bone,n)
def prism(points,depth,mat,bone):
 a=[vertex(p,bone) for p in points]; b=[vertex((p[0],p[1]+depth,p[2]),bone) for p in points]
 face(tuple(reversed(a)),mat); face(tuple(b),mat)
 for i in range(len(a)): face((a[i],a[(i+1)%len(a)],b[(i+1)%len(a)],b[i]),mat)
# Torso: flared tunic hem, shaped waist, broad shoulder seam, fitted neck.
rings([(0,0,.83,.24,.15),(0,0,.95,.205,.137),(0,0,1.08,.19,.13),(0,0,1.28,.235,.14),(0,0,1.44,.265,.125),(0,0,1.49,.19,.105),(0,0,1.52,.078,.075)],0,'Spine',12)
rings([(0,0,1.49,.074,.067),(0,0,1.64,.068,.065)],2,'Head')
rings([(0,0,1.025,.2,.143),(0,0,1.085,.2,.143)],4,'Spine',12)
prism([(-.034,-.151,1.035),(.034,-.151,1.035),(.034,-.151,1.078),(-.034,-.151,1.078)],.009,7,'Spine')
# Mantle is a shaped shoulder drape with its own ragged angled hem.
rings([(0,.006,1.26,.265,.18),(0,.006,1.40,.289,.173),(0,.01,1.47,.255,.139),(0,0,1.535,.09,.087)],1,'Spine',12)
# Open front V leaves the underlying olive tunic legible.
# Front mantle stays one continuous textile surface; no floating overlay.
ellipsoid((.055,-.147,1.46),(.024,.013,.024),7,'Spine',8)
for side,sign in [('L',1),('R',-1)]:
 thigh='Thigh'+side; shin='Shin'+side; foot='Foot'+side; arm='Arm'+side; fore='Forearm'+side
 x=sign*.119
 rings([(x,0,.92,.084,.102,{thigh:1}),(x,0,.77,.103,.102),(x,0,.53,.083,.089,{thigh:.55,shin:.45}),(x,0,.43,.078,.081,{shin:1}),(x,0,.22,.065,.064,{shin:1})],5,thigh)
 rings([(x,-.035,0,.08,.152),(x,-.038,.10,.086,.16),(x,-.004,.155,.075,.098),(x,0,.28,.078,.079),(x,0,.31,.084,.084)],4,foot,10)
 # Sleeves narrow into elbow; forearm cuff and actual thumb/palm form.
 rings([(sign*.24,0,1.445,.091,.102),(sign*.30,0,1.34,.091,.09),(sign*.345,-.004,1.19,.073,.079,{arm:.5,fore:.5}),(sign*.376,-.008,1.10,.069,.074,{fore:1}),(sign*.39,-.012,1.035,.068,.072,{fore:1})],0,arm)
 rings([(sign*.39,-.012,1.04,.071,.075),(sign*.395,-.013,1.005,.067,.071)],1,fore)
 rings([(sign*.399,-.015,1.015,.046,.043),(sign*.41,-.021,.953,.055,.042),(sign*.414,-.028,.906,.047,.031),(sign*.402,-.035,.88,.034,.022)],2,fore,8)
 ellipsoid((sign*.366,-.055,.956),(.024,.025,.046),2,fore,8)
# Face 6.8 heads tall: cheek, temples and defined jaw rather than a sphere.
rings([(0,-.015,1.60,.074,.06),(0,-.015,1.64,.105,.085),(0,0,1.71,.125,.10),(0,.003,1.79,.124,.099),(0,.012,1.855,.107,.087),(0,.02,1.88,.07,.06)],2,'Head',12)
for s in [-1,1]: ellipsoid((s*.126,.003,1.729),(.022,.026,.045),2,'Head',8)
# Grey crown with a receding brow and short side hair.
rings([(0,.037,1.77,.114,.078),(0,.023,1.845,.123,.094),(0,.02,1.888,.08,.065),(0,.02,1.90,.022,.023)],3,'Head',12)
for s in [-1,1]:
 prism([(s*.105,-.03,1.82),(s*.126,-.01,1.82),(s*.122,-.012,1.69),(s*.103,-.045,1.70)],.025,3,'Head')
 # Angled brows frame dark inset eyes.
 prism([(s*.023,-.103,1.773),(s*.084,-.088,1.779),(s*.086,-.089,1.762),(s*.023,-.105,1.76)],.006,3,'Head')
 ellipsoid((s*.051,-.099,1.746),(.016,.008,.009),6,'Head',8)
# Authored wedge nose and moustache, beard lower outline not a hanging sphere.
prism([(-.018,-.105,1.773),(.018,-.105,1.773),(.027,-.145,1.709),(-.026,-.145,1.709)],.035,2,'Head')
rings([(0,-.038,1.585,.04,.04),(0,-.041,1.62,.079,.065),(0,-.025,1.68,.105,.09),(0,-.027,1.705,.101,.087)],3,'Head',12)
for s in [-1,1]: ellipsoid((s*.033,-.113,1.699),(.04,.018,.016),3,'Head',8)
prism([(-.026,-.12,1.679),(.026,-.12,1.679),(.025,-.12,1.672),(-.025,-.12,1.672)],.004,6,'Head')
# Diagonal satchel strap, compact leather bag and visibly layered book.
strap=[(-.177,-.17,1.45),(-.10,-.194,1.36),(.003,-.194,1.25),(.171,-.161,1.06)]
for a,b in zip(strap,strap[1:]):
 prism([(a[0]-.016,a[1],a[2]-.014),(a[0]+.016,a[1],a[2]+.014),(b[0]+.016,b[1],b[2]+.014),(b[0]-.016,b[1],b[2]-.014)],.009,4,'Spine')
prism([(.15,-.09,.89),(.32,-.09,.92),(.32,-.09,1.11),(.15,-.09,1.10)],.16,4,'Spine')
prism([(.17,-.095,1.02),(.293,-.095,1.035),(.293,-.095,1.137),(.17,-.095,1.127)],.085,8,'Spine')
prism([(.158,-.107,.987),(.307,-.107,1.0),(.307,-.107,1.065),(.158,-.107,1.052)],.012,4,'Spine')
mesh=bpy.data.meshes.new('Bram authored topology'); mesh.from_pydata(verts,[],faces); mesh.materials.clear()
for m in mats: mesh.materials.append(m)
for p,m in zip(mesh.polygons,mi): p.material_index=m; p.use_smooth=False
obj=bpy.data.objects.new('Bram_ClothedBody',mesh); bpy.context.collection.objects.link(obj)
rig_data=bpy.data.armatures.new('Bram_Skeleton'); rig=bpy.data.objects.new('Bram_Rig',rig_data); bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig; rig.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
spec=[('Root',(0,0,.86),(0,0,1.02),None),('Spine',(0,0,1.02),(0,0,1.51),'Root'),('Head',(0,0,1.51),(0,0,1.88),'Spine')]
for s,sign in [('L',1),('R',-1)]:
 spec += [('Arm'+s,(sign*.24,0,1.44),(sign*.345,0,1.19),'Spine'),('Forearm'+s,(sign*.345,0,1.19),(sign*.405,0,.91),'Arm'+s),('Thigh'+s,(sign*.119,0,.94),(sign*.119,0,.49),'Root'),('Shin'+s,(sign*.119,0,.49),(sign*.119,0,.16),'Thigh'+s),('Foot'+s,(sign*.119,0,.16),(sign*.119,-.14,.06),'Shin'+s)]
for name,h,t,parent in spec:
 b=rig_data.edit_bones.new(name); b.head=h; b.tail=t
 if parent: b.parent=rig_data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT'); obj.parent=rig
for name,*_ in spec: obj.vertex_groups.new(name=name)
for i,ws in enumerate(weights):
 for name,w in ws.items(): obj.vertex_groups[name].add([i],w,'REPLACE')
mod=obj.modifiers.new('Bram skin','ARMATURE'); mod.object=rig
scene=bpy.context.scene; scene.render.fps=24
for p in rig.pose.bones: p.rotation_mode='XYZ'
for clip,duration in [('Idle',72),('Talk',72),('Walk',24)]:
 action=bpy.data.actions.new(clip); rig.animation_data_create(); rig.animation_data.action=action
 for f in range(1,duration+2,3):
  if f>duration+1: f=duration+1
  t=(f-1)/duration*2*math.pi
  for p in rig.pose.bones: p.rotation_euler=(0,0,0); p.location=(0,0,0); p.scale=(1,1,1)
  if clip in ['Idle','Talk']:
   rig.pose.bones['Spine'].scale=(1+.005*math.sin(t),1+.005*math.sin(t),1+.005*math.sin(t))
   rig.pose.bones['Head'].rotation_euler[1]=.025*math.sin(t)
  if clip=='Talk':
   rig.pose.bones['ArmR'].rotation_euler[0]=-.18-.11*math.sin(t)
   rig.pose.bones['ForearmR'].rotation_euler[0]=-.65-.17*math.sin(t)
   rig.pose.bones['ForearmR'].rotation_euler[1]=.15*math.sin(t)
   rig.pose.bones['Head'].rotation_euler[0]=.035*math.sin(t)
  if clip=='Walk':
   for s,sign in [('L',1),('R',-1)]:
    swing=math.sin(t)*sign
    rig.pose.bones['Thigh'+s].rotation_euler[0]=.30*swing
    rig.pose.bones['Shin'+s].rotation_euler[0]=-.38*max(0,-swing)
    rig.pose.bones['Arm'+s].rotation_euler[0]=-.23*swing
    rig.pose.bones['Forearm'+s].rotation_euler[0]=-.10-.1*max(0,swing)
  for p in rig.pose.bones:
   for path in ['rotation_euler','location','scale']: p.keyframe_insert(path,frame=f,group=p.name)
 track=rig.animation_data.nla_tracks.new(); track.name=clip; strip=track.strips.new(clip,1,action); strip.name=clip
 rig.animation_data.action=None; track.mute=True
# NLA tracks unmuted for export; exporter groups each named track independently.
for tr in rig.animation_data.nla_tracks: tr.mute=False
scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True); obj.select_set(True); bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'bram.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_yup=True)
# Save a clean neutral editable asset with render helpers excluded from GLB.
for tr in rig.animation_data.nla_tracks: tr.mute=True
for p in rig.pose.bones: p.rotation_euler=(0,0,0); p.location=(0,0,0); p.scale=(1,1,1)
scene.frame_set(1)
world=bpy.data.worlds.new('Warm studio'); scene.world=world; world.use_nodes=True; world.node_tree.nodes['Background'].inputs[0].default_value=(.18,.20,.22,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.6
def aim(o,p): o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(2.7,-5,2.65)); camera=bpy.context.object; aim(camera,(0,0,.96)); camera.data.type='ORTHO'; camera.data.ortho_scale=2.5; scene.camera=camera
for pos,power,size in [(( -3,-4,6),450,4),((3,-2,3),200,3),((0,3,4),300,2)]:
 bpy.ops.object.light_add(type='AREA',location=pos); light=bpy.context.object; light.data.energy=power; light.data.shape='DISK'; light.data.size=size; aim(light,(0,0,1))
bpy.ops.mesh.primitive_plane_add(size=200); floor=bpy.context.object; floor.name='Proof only backdrop'; fm=bpy.data.materials.new('Proof backdrop'); fm.diffuse_color=(.22,.25,.23,1); floor.data.materials.append(fm)
scene.render.engine='CYCLES'; scene.cycles.samples=32; scene.render.resolution_x=768; scene.render.resolution_y=900; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.filepath=str(OUT/'proof.png'); scene.view_settings.view_transform='Standard'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bram.blend')); bpy.ops.render.render(write_still=True)
# Independent GLB structural contract. POSITION bounds are in exported Y-up axes.
raw=(OUT/'bram.glb').read_bytes(); size,typ=struct.unpack_from('<II',raw,12); doc=json.loads(raw[20:20+size]); access=doc['accessors']
prims=[p for m in doc['meshes'] for p in m['primitives']]
tri=sum(access[p['indices']]['count']//3 for p in prims)
ys=[access[p['attributes']['POSITION']] for p in prims]; height=max(a['max'][1] for a in ys)-min(a['min'][1] for a in ys)
clips={a['name']:max(access[s['input']]['max'][0]-access[s['input']]['min'][0] for s in a['samplers']) for a in doc['animations']}
# All animation channels must loop, comparing exported binary first/last samples.
bin_start=20+size+8
def values(index):
 a=access[index]; view=doc['bufferViews'][a['bufferView']]; width={'SCALAR':1,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
 assert a['componentType']==5126
 offset=bin_start+view.get('byteOffset',0)+a.get('byteOffset',0)
 return [struct.unpack_from('<'+'f'*width,raw,offset+i*view.get('byteStride',width*4)) for i in range(a['count'])]
for animation in doc['animations']:
 for sampler in animation['samplers']:
  seq=values(sampler['output']); assert all(math.isfinite(v) for row in seq for v in row)
  delta=max(abs(a-b) for a,b in zip(seq[0],seq[-1]))
  if len(seq[0])==4: delta=min(delta,max(abs(a+b) for a,b in zip(seq[0],seq[-1]))) # q and -q encode the same rotation
  assert delta<.0001, animation['name']
assert tri<=8000 and len(doc['meshes'])<=10 and len(doc['materials'])<=10
assert abs(height-1.9)<.04 and set(clips)=={'Idle','Talk','Walk'},(height,clips)
assert all(math.isfinite(v) for p in verts for v in p)
assert all(d>0 for d in clips.values())
manifest={'status':'candidate-unapproved','name':'Guide Bram','height':height,'triangles':tri,'meshes':len(doc['meshes']),'primitives':len(prims),'materials':len(doc['materials']),'clips':clips,'ground':0,'forward':'+Z in exported GLB','reference':'Bible_References/Character/male_concepts/male_b_turnaround.png','source':str(pathlib.Path(__file__).relative_to(ROOT)),'sha256':hashlib.sha256(raw).hexdigest(),'limitations':['Studio visual acceptance and live NPC integration pending','Walk is an in-place authored gait; foot contact requires runtime review']}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8'); print('[BRAM_CANDIDATE] PASS',json.dumps(manifest))
