"""Independent candidate-data checks; no Blender or game mutation."""
import json, math, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=json.loads((ROOT/'.studio-workspaces/holm-quest-placement-v1/candidates/placement.json').read_text(encoding='utf8'))
t=ROOT/'.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json'
b=json.loads(t.read_text(encoding='utf8'))
assert hashlib.sha256(t.read_bytes()).hexdigest()==p['terrainSha256']
assert hashlib.sha256((ROOT/'.studio-workspaces/holm-quest-lodge-v3/candidates/lodge.glb').read_bytes()).hexdigest()==p['modelSha256']
assert p['schema']=='holm-quest-placement-v1' and p['yaw']==0
assert all(math.isfinite(v) for v in p['world'].values())
assert abs(p['world']['x']-36)<=2 and abs(p['world']['z']-51)<=2
pts=[v for tri in p['footprintTriangles'] for v in tri]
assert all(len(tri)==3 for tri in p['footprintTriangles'])
assert all(math.isfinite(v) for pt in pts for v in pt)
assert -5.002<min(v[0] for v in pts)<-5 and 6.34<max(v[0] for v in pts)<6.36
assert -4.002<min(v[1] for v in pts)<-4 and 4<max(v[1] for v in pts)<4.002
# Independent barycentric formula for the exact terrain triangle split.
def terrain(x,z):
 ix,iz=math.floor(x),math.floor(z);u,v=x-ix,z-iz;w=b['width']+1
 h=lambda dx,dz:b['heights'][(iz+dz)*w+ix+dx]
 return (1-u-v)*h(0,0)+u*h(1,0)+v*h(0,1) if u+v<=1 else (u+v-1)*h(1,1)+(1-u)*h(0,1)+(1-v)*h(1,0)
assert all(p['world']['y']-.18<=terrain(p['world']['x']+x,p['world']['z']+z)<p['world']['y'] for x,z in pts)
e=p['entranceWorld'];assert abs(e['x']-p['world']['x']-.5)<1e-8 and abs(e['z']-p['world']['z']-2)<1e-8
assert abs(terrain(e['x'],e['z'])-e['terrainHeight'])<1e-8
for a in p['approachSamples']:
 assert abs(terrain(a['x'],a['z'])-a['terrainHeight'])<1e-8
assert all(any(abs(a['z']-p['world']['z']-offset)<1e-7 for a in p['approachSamples']) for offset in [3.5,4.5])
assert p['supports'][1]['floorBottom']==0 and not p['fitsExistingFoundation'] and p['augmentedFoundationFits']
assert p['world']=={'x':35,'y':5.02,'z':51}
assert hashlib.sha256((ROOT/'.studio-workspaces/holm-quest-foundation-v1/candidates/foundation.glb').read_bytes()).hexdigest()==p['foundationSha256']
assert p['pathConflict']['status']=='blocked-by-lodge-north-wall'
print('[LODGE_TERRAIN_TEST] PASS: hashes, finite data, footprint bounds, exact vertex heights, entrance/apron measurements, explicit path conflict')
