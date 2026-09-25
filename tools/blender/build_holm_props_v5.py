"""Tutor's Holm prop pack v5 = pack v2 with a new campfire flame (owner play-test 2026-09-25: the fire "looks like a
couple pieces of paper").

Opens .studio-workspaces/holm-props-v2/candidates/props.blend (every other asset byte-for-byte in intent) and rebuilds
only the campfire's flame: `campfire_Flames` becomes a group (the node the lessons runtime scales for its flicker)
holding three layered solid flame shells from holm_fire_kit (red outer, orange middle, yellow core with a white
heart), each with its own looping flicker clip CampfireFlicker0..2 (1.5 s) for any runtime that binds clips; and a
`campfire_Embers` part adds glowing ember chips and a glow pool on the ash bed. The stones, logs and ash of
`campfire_Base` stay.
Run: "Blender 4.5/blender.exe" -b --python tools/blender/build_holm_props_v5.py
"""
import bpy,sys,json,struct,hashlib,math
from pathlib import Path
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE));ROOT=HERE.parents[1]
SRC=ROOT/'.studio-workspaces/holm-props-v2/candidates';OUT=ROOT/'.studio-workspaces/holm-props-v5/candidates';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(SRC/'props.blend'))
from holm_interior_kit import Acc
import holm_fire_kit as FK
root=bpy.data.objects['campfire']
old=bpy.data.objects.get('campfire_Flames')
old_tris=sum(len(p.vertices)-2 for p in old.data.polygons) if old else 0
if old:bpy.data.objects.remove(old,do_unlink=True)
grp=bpy.data.objects.new('campfire_Flames',None);bpy.context.collection.objects.link(grp);grp.parent=root;grp.location=(0,0,.05)
fl=FK.flame_layers(grp,'campfire_FlameLayer',(0,0,0),size=1.05,seed=8801)
FK.flicker(fl,'CampfireFlicker',0,seed=8802)
E=Acc('campfire_Embers');FK.bed(E,(0,.036,0),size=.95,logs=None,ash=False,pool=True,seed=8803);eo=E.build(root)
import bmesh
for ob in fl+[eo]:
 b=bmesh.new();b.from_mesh(ob.data);bmesh.ops.recalc_face_normals(b,faces=b.faces);b.to_mesh(ob.data);b.free()
bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
roots=[o for o in bpy.data.objects if o.parent is None and o.type=='EMPTY']
bpy.ops.object.select_all(action='DESELECT')
for r in roots:
 r.select_set(True)
 for x in r.children_recursive:x.select_set(True)
glb=OUT/'props.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_animations=True,export_yup=True,export_apply=True,export_materials='EXPORT')
raw=glb.read_bytes();sha=hashlib.sha256(raw).hexdigest()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'props.blend'))
man=json.loads((SRC/'manifest.json').read_text());man['file']='props.glb';man['blend']='props.blend';man['sha256']=sha
man['status']='v5 = v2 + layered campfire flame (candidate)'
new_tris=sum(len(p.vertices)-2 for o in fl+[eo] for p in o.data.polygons)
for a in man['assets']:
 a['sha256']=sha
 if a['name']=='campfire':a['triangles']=a['triangles']-old_tris+new_tris;a['clips']=['CampfireFlicker0','CampfireFlicker1','CampfireFlicker2'];a['note']='campfire_Flames is a group of three flame layers; the lessons runtime scales it'
(OUT/'manifest.json').write_text(json.dumps(man,indent=2)+'\n',encoding='utf8')
print('[HOLM_PROPS_V5] campfire flame tris',old_tris,'->',new_tris,'sha',sha[:16],'roots',len(roots))
