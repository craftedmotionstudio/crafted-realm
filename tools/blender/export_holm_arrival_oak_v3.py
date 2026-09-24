"""Export the tree family v3 oak under the arrival scenery contract's root name (ArrivalOak) with its one
Breeze clip, so the in-game arrival package can use the branching oak (owner review 6). Reads the saved
v3 family .blend (origin-centred roots); never edits it."""
import bpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'.studio-workspaces/holm-tree-family-v3/candidates'
bpy.ops.wm.open_mainfile(filepath=str(BASE/'tree-family.blend'))
oak=bpy.data.objects['oak'];oak.name='ArrivalOak';oak.location=(0,0,0)
bpy.ops.object.select_all(action='DESELECT');oak.select_set(True)
for x in oak.children_recursive:x.select_set(True)
out=BASE/'arrival_oak_v3.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True)
print('[ARRIVAL_OAK_V3] exported',out.name,out.stat().st_size,'bytes')
