"""Quest Lodge v6 (owner play-test 2026-09-25: "the fire ... looks like a couple pieces of paper").

Opens lodge v5 (the z-fighting sweep) and rebuilds only the hearth fire: the three flat flame cards, the loose ember
chips, the three logs and the flat glow plate inside the firebox are removed, and a holm_fire_kit fire takes their
place - an ash bed with glowing ember chips, four split logs across the firedogs with charred, ember-ringed inner
ends and a glow pool on the ash, and three layered solid flame shells
(Lodge_HearthFlame0..2) with looping flicker clips LodgeHearthFlicker0..2 (1.5 s). The firebox stones, soot
linings, ash slab and firedogs stay. Nothing outside the firebox changes.
Run: "Blender 5.1/blender.exe" -b --python tools/blender/build_holm_quest_lodge_fire_v6.py
Then tools/blender/fix_holm_coplanar.py (lodge profile) in place and the v4 terrain-navigation extraction.
"""
import bpy,bmesh,sys,math
from pathlib import Path
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE));ROOT=HERE.parents[1]
BASE=ROOT/'.studio-workspaces/holm-quest-lodge-v5/candidates';OUT=ROOT/'.studio-workspaces/holm-quest-lodge-v6/candidates'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(BASE/'lodge.blend'))
import holm_interior_kit as kit
from holm_interior_kit import Acc
import holm_fire_kit as FK
dress=bpy.data.objects['Lodge_FurnishingDressing'];parent=dress.parent
# firebox interior (plan): x 4.09..4.79 (back at +x), y .18..1.59, z .42..1.48; the fire sits on the ash slab at y .19
def srgb_close(c,h,tol=.02):t=kit.srgb(h);return all(abs(c[i]-t[i])<tol for i in range(3))
me=dress.data;col=me.color_attributes.get('Col');bm=bmesh.new();bm.from_mesh(me);bm.faces.ensure_lookup_table()
lay=bm.loops.layers.float_color.get('Col') or bm.loops.layers.color.get('Col')
gone=[]
for f in bm.faces:
 c=f.calc_center_median();x,y,z=c.x,c.z,-c.y
 mat=me.materials[f.material_index].name if me.materials else ''
 vc=tuple(f.loops[0][lay][:3]) if lay else (1,1,1)
 inside=4.1<x<4.785 and .192<y<1.2 and .44<z<1.46
 if not inside:continue
 glowing=mat.endswith('(glow)')
 wood=srgb_close(vc,'#4b3626') or srgb_close(vc,'#c4a172')
 if glowing or wood:gone.append(f)
removed=len(gone)
bmesh.ops.delete(bm,geom=gone,context='FACES')
bm.to_mesh(me);bm.free();me.update()
A=Acc('Lodge_FurnishingHearthFire')
FK.bed(A,(4.44,.19,.95),size=.9,spread=(1.0,.62),logs='hearth',log_y=.26,seed=7201,yaw=math.pi/2)
# no glow card on the firebox back (its bands read as a target); the glow pool on the ash stays
o=A.build(parent)
fl=FK.flame_layers(parent,'Lodge_HearthFlame',(4.44,.23,.95),size=.95,spread=(1.0,.62),seed=7202,yaw=math.pi/2)
FK.flicker(fl,'LodgeHearthFlicker',0,seed=7203)
for ob in [o]+fl:
 b2=bmesh.new();b2.from_mesh(ob.data);bmesh.ops.recalc_face_normals(b2,faces=b2.faces);b2.to_mesh(ob.data);b2.free()
bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lodge.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'lodge.glb'),export_format='GLB',export_yup=True,export_animations=True)
print('[LODGE_FIRE_V6] removed faces',removed,'fire parts',[o.name]+[f.name for f in fl],'clips',[a.name for a in bpy.data.actions])
