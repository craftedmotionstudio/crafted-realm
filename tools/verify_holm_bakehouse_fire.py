import json,struct,math
from pathlib import Path
p=Path('.studio-workspaces/holm-bakehouse-fire-v1/candidates/oven-fire.glb');b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);data=b[28+n:]
def values(index):
 a=g['accessors'][index];v=g['bufferViews'][a['bufferView']];dims={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']];assert a['componentType']==5126
 return struct.unpack_from('<'+'f'*a['count']*dims,data,v.get('byteOffset',0)+a.get('byteOffset',0)),dims
channels=0
for clip in g['animations']:
 for sample in clip['samplers']:
  times,_=values(sample['input']);vs,dims=values(sample['output']);assert all(map(math.isfinite,vs));assert abs(times[-1]-times[0]-2)<1e-6
  assert all(abs(a-b)<1e-6 for a,b in zip(vs[:dims],vs[-dims:])), 'loop endpoint discontinuity'
  assert any(abs(vs[i]-vs[i%dims])>1e-4 for i in range(len(vs))), 'static animation'
  channels+=1
assert channels==16
print('[OVEN_FIRE_ANIMATION] PASS',channels,'animated transform channels; finite values; two-second seamless endpoints')
