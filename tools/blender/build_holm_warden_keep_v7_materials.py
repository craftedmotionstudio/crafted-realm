"""Warden's Keep v7 (2026-09-25): keep v6 with the cutaway material fix. The island cutaway sets clipping planes
per material, and GLTFLoader shares a material across every mesh that uses it, so an unclipped mesh sharing a
wall material decides (by draw order) whether the walls clip. Every non-wall mesh that shared a wall material
(roof, wallwalk) gets its own copy, so only Keep_Shell / Keep_Upper_Shell / Keep_GroundFront meshes are clipped.
Geometry is unchanged.
Run: "Blender 5.1/blender.exe" -b --python tools/blender/build_holm_warden_keep_v7_materials.py"""
import bpy,re,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'.studio-workspaces/holm-warden-keep-v6/candidates';OUT=ROOT/'.studio-workspaces/holm-warden-keep-v7/candidates';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(BASE/'keep.blend'))
CLIP=re.compile(r'^Keep_(Shell|Upper_Shell|GroundFront)_')
wall_mats={m.name for o in bpy.data.objects if o.type=='MESH' and CLIP.match(o.name) for m in o.data.materials if m}
copies={};changed=[]
for o in bpy.data.objects:
 if o.type!='MESH' or not o.name.startswith('Keep_') or CLIP.match(o.name):continue
 for i,m in enumerate(o.data.materials):
  if m and m.name in wall_mats:
   if m.name not in copies:c=m.copy();c.name=m.name+' (not clipped)';copies[m.name]=c
   o.data.materials[i]=copies[m.name];changed.append((o.name,m.name))
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects:
 if o.type=='MESH' and o.name.startswith('Keep_'):o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'keep.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=False)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'keep.blend'))
c=json.loads((BASE/'keep.contract.json').read_text());c['schema']='holm.warden-keep.v7';c['materialFix']='non-wall meshes no longer share wall materials: '+json.dumps(changed)
(OUT/'keep.contract.json').write_text(json.dumps(c,indent=2))
for f in ('roof-128.png','stone-128.png','keep-exterior.png'):
 if (BASE/f).exists():(OUT/f).write_bytes((BASE/f).read_bytes())
print('[KEEP_V7] separated',changed)
