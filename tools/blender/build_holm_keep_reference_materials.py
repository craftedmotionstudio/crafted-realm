"""Blender material-only keep revision. Original textures; preserve measured geometry."""
import bpy, json, math, random, hashlib, struct
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'.studio-workspaces/holm-warden-keep-v4/candidates'
OUT=ROOT/'.studio-workspaces/holm-warden-keep-v5/candidates';OUT.mkdir(parents=True,exist_ok=True)
assert hashlib.sha256((BASE/'keep.glb').read_bytes()).hexdigest()=='a20d8806695c1420c1e64716d7a31936587cb549e96f0066bce1f0e076c57e74'
bpy.ops.wm.open_mainfile(filepath=str(BASE/'keep.blend'))
production=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('Keep_')]
def geometry():return {o.name:{'vertices':[[float(c) for c in o.matrix_world@v.co] for v in o.data.vertices],'faces':[list(p.vertices) for p in o.data.polygons]} for o in production}
before=geometry()
for material,kind in [('Keep gray fieldstone','stone'),('Keep warm shingles','roof')]:
 m=bpy.data.materials[material];node=next(n for n in m.node_tree.nodes if n.type=='TEX_IMAGE');im=bpy.data.images.new('keep_reference_'+kind,128,128);pixels=[];rng=random.Random(9132605)
 for y in range(128):
  for x in range(128):
   noise=rng.uniform(-.012,.012)
   if kind=='stone':
    rows=[0,21,43,64,87,108,128];row=next(i for i in range(6) if y<rows[i+1]);localY=y-rows[row];xx=(x+[0,23,8,31,15,39][row])%128;col=int(xx//42.6667);localX=xx%42.6667
    field=.60+((row*13+col*7)%11-5)*.007+noise+math.sin(x*.24+y*.31)*.009
    edge=.027 if localY in [1,2] or localX<2 else (-.023 if y>=rows[row+1]-2 else 0)
    c=(.435,.44,.425) if localY==0 or localX<1 else (field+edge,field+edge,field*.985+edge)
   else:
    fibre=math.sin(x*2.37+math.sin(y*.035+x*.07))*.045
    bundle=math.sin(x*.19+math.sin(y*.045)*.5)*.025
    field=.425+fibre+bundle+math.sin(x*.76+y*.012)*.019+noise
    c=(field*1.18,field*.98,field*.53)
   pixels.extend((*c,1))
 im.pixels.foreach_set(pixels);im.filepath_raw=str(OUT/(kind+'-128.png'));im.file_format='PNG';im.save();im.pack();node.image=im;node.interpolation='Closest'
for o in production:
 for polygon in o.data.polygons:
  if o.data.materials[polygon.material_index].name!='Keep warm shingles':continue
  # Ridge runs along Blender Y; reed fibres descend the X/Z roof pitch.
  for li in polygon.loop_indices:
   v=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co
   o.data.uv_layers.active.data[li].uv=(v.y*.42,v.x*.42)
assert geometry()==before,'material pass changed measured mesh geometry'
bpy.ops.object.select_all(action='DESELECT')
for o in production:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'keep.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=False)
raw=(OUT/'keep.glb').read_bytes();g=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])
contract=json.loads((BASE/'keep.contract.json').read_text(encoding='utf-8'));contract['schema']='holm.warden-keep.v5'
contract['glb']={'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'embeddedImages':len(g['images']),'primitives':sum(len(m['primitives'])for m in g['meshes'])}
contract['materialRevision']={'sourceModelSha256':'a20d8806695c1420c1e64716d7a31936587cb549e96f0066bce1f0e076c57e74','meshVerticesAndFacesUnchanged':True,'originalTextures':['lighter gray coursed masonry','directional warm reed roof'],'review':'pending direct Studio comparison'}
(OUT/'keep.contract.json').write_text(json.dumps(contract,indent=2),encoding='utf-8')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'keep.blend'))
scene=bpy.context.scene;scene.render.filepath=str(OUT/'keep-exterior.png');scene.cycles.samples=8;bpy.ops.render.render(write_still=True)
print('[KEEP_MATERIALS] PASS geometry identical',contract['glb'])
