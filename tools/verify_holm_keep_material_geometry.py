"""Transfer measured navigation only after exact exported geometry equivalence."""
import json,struct,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read(folder):
 raw=(ROOT/folder/'keep.glb').read_bytes();length=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+length]);binary=raw[28+length:]
 def accessor(index):
  a=g['accessors'][index];v=g['bufferViews'][a['bufferView']];start=v.get('byteOffset',0)+a.get('byteOffset',0)
  sizes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};dims={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
  size=sizes[a['componentType']]*dims[a['type']];stride=v.get('byteStride',size)
  return (a['componentType'],a['type'],a['count'],b''.join(binary[start+i*stride:start+i*stride+size]for i in range(a['count'])))
 meshes=[[({k:accessor(v)for k,v in p['attributes'].items() if not k.startswith('TEXCOORD')},accessor(p['indices']))for p in m['primitives']]for m in g['meshes']]
 nodes=[{k:v for k,v in n.items()if k in ['mesh','children','matrix','translation','rotation','scale','skin']}for n in g['nodes']]
 return raw,(meshes,nodes,g['scenes'])
old,oldGeometry=read('.studio-workspaces/holm-warden-keep-v4/candidates');new,newGeometry=read('.studio-workspaces/holm-warden-keep-v5/candidates')
assert oldGeometry==newGeometry,'Exported position/index/normal data or scene transforms changed'
nav=json.loads((ROOT/'.studio-workspaces/holm-keep-navigation-v3/candidates/navigation.json').read_text(encoding='utf-8'))
assert nav['modelSha256']==hashlib.sha256(old).hexdigest()
nav['modelSha256']=hashlib.sha256(new).hexdigest();nav['report']['materialTransfer']={'exactExportedGeometry':True,'sourceModelSha256':hashlib.sha256(old).hexdigest()}
out=ROOT/'.studio-workspaces/holm-keep-navigation-v4/candidates';out.mkdir(parents=True,exist_ok=True);(out/'navigation.json').write_text(json.dumps(nav,separators=(',',':')),encoding='utf-8')
print('[KEEP_MATERIAL_GEOMETRY] PASS all exported geometry/transforms identical; measured graph transferred',nav['modelSha256'])
