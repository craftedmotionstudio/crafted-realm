"""Report coplanar overlaps (z-fighting) in an exported model.
Run: blender -b --python tools/blender/check_holm_coplanar.py -- <model.glb> <out.json> [profile [navigation.json]]
With a profile (guide, kitchen, lodge, keep, m44) fights are judged in the game's views: outside and every cutaway
storey (roof hidden, uppers hidden, shells clipped), the storeys taken from the building's measured graph."""
import bpy,sys,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import holm_coplanar as C
a=sys.argv[sys.argv.index('--')+1:];src,out=Path(a[0]),Path(a[1])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(src))
bpy.context.scene.frame_set(0)
objs=[o for o in bpy.context.scene.objects if o.type=='MESH']
views=None
if len(a)>2:
 nav=json.loads(Path(a[3]).read_text()) if len(a)>3 else None
 views=C.building_views(a[2],nav,next(o.name for o in objs if '_' in o.name).split('_')[0] if a[2]=='m44' else None)
fights=C.analyze(objs,views=views);s=C.summary(fights)
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps({'model':str(src),'views':[v['name'] for v in views] if views else ['all'],'summary':s,'fights':fights},indent=1,default=str))
print('[COPLANAR]',src.name,json.dumps(s)[:600])
