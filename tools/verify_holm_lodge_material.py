"""Compare exported geometry, UVs and animation values for a material-only candidate."""
import json, struct, hashlib
from pathlib import Path
BASE=Path('.studio-workspaces/holm-quest-lodge-v2/candidates/lodge.glb')
OUT=Path('.studio-workspaces/holm-quest-lodge-v3/candidates')
def load(path):
 b=path.read_bytes();n=struct.unpack_from('<I',b,12)[0]
 assert b[:4]==b'glTF'
 return json.loads(b[20:20+n]),b[28+n:]
def accessor(g,b,a):
 v=g['bufferViews'][a['bufferView']]
 size={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}[a['componentType']]*{'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
 offset=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',size)
 return b''.join(b[offset+i*stride:offset+i*stride+size] for i in range(a['count']))
a,ab=load(BASE);c,cb=load(OUT/'lodge.glb')
assert len(a['accessors'])==len(c['accessors'])
for i,(x,y) in enumerate(zip(a['accessors'],c['accessors'])):
 assert all(x.get(k)==y.get(k) for k in ['componentType','count','type','normalized','min','max']),('accessor metadata',i)
 assert accessor(a,ab,x)==accessor(c,cb,y),('accessor data',i)
for key in ['nodes','meshes','animations','scenes','scene','skins','materials','textures','samplers']:
 assert a.get(key)==c.get(key),('non-material export drift',key)
def image_bytes(g,b,im):
 v=g['bufferViews'][im['bufferView']];start=v.get('byteOffset',0)
 return b[start:start+v['byteLength']]
assert len(a['images'])==len(c['images'])
changed=[]
for x,y in zip(a['images'],c['images']):
 if image_bytes(a,ab,x)!=image_bytes(c,cb,y):changed.append((x.get('name'),y.get('name')))
assert len(changed)==1,changed
contract=json.loads((OUT/'material-contract.json').read_text(encoding='utf-8'))
assert contract['baseSha256']==hashlib.sha256(BASE.read_bytes()).hexdigest()
assert contract['modelSha256']==hashlib.sha256((OUT/'lodge.glb').read_bytes()).hexdigest()
result={'accessorsIdentical':len(a['accessors']),'nodesMeshesAnimationsIdentical':True,'changedImages':changed,'baseSha256':contract['baseSha256'],'modelSha256':contract['modelSha256']}
(OUT/'material-verification.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print('[LODGE_MATERIAL] PASS',json.dumps(result))
