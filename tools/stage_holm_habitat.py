"""Build an isolated Studio composition from deliberate habitat anchors; no live install."""
import json, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=json.loads((ROOT/'docs/rebuild/holm-overhaul/plan.json').read_text(encoding='utf-8'))
b=json.loads((ROOT/'.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json').read_text())
m=json.loads((ROOT/'.studio-workspaces/holm-tree-family-v2/candidates/manifest.json').read_text())
assets={a['name']:a for a in m['assets']}
def height(x,z):
 ix=min(b['width']-1,max(0,math.floor(x)));iz=min(b['depth']-1,max(0,math.floor(z)));fx=x-ix;fz=z-iz;w=b['width']+1
 a,bb,c,d=[b['heights'][i] for i in [iz*w+ix,iz*w+ix+1,(iz+1)*w+ix,(iz+1)*w+ix+1]]
 return a+fx*(bb-a)+fz*(c-a) if fx+fz<=1 else d+(1-fx)*(c-d)+(1-fz)*(bb-d)
def distance(x,z,a,bb):
 dx=bb[0]-a[0];dz=bb[1]-a[1];t=max(0,min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)))
 return math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)
segments=[(a,bb) for r in p['paths'] for a,bb in zip(r['points'],r['points'][1:])]
rects=[]
for place in p['places']:
 for v in place['architecture']['volumes']:
  pts=v['outline'];rects.append((place['x']+min(a[0] for a in pts),place['z']+min(a[1] for a in pts),place['x']+max(a[0] for a in pts),place['z']+max(a[1] for a in pts)))
anchors={'oak':[(23,97),(29,103),(35,99),(52,103),(77,106),(84,100),(24,71),(28,65),(34,71),(24,48),(26,42),(47,43),(91,87)],'birch':[(40,83),(54,83),(58,75),(62,68),(65,62),(58,51),(76,43),(77,32),(42,111)],'coastal-pine':[(108,99),(116,109),(129,85),(133,69),(126,51),(103,28),(109,20),(119,15)]}
placements=[];rejected=[]
def add(asset,x,z,scale=1,yaw=0):
 tree=asset in anchors;bounds=assets[asset]['animatedBounds'];radius=math.hypot(*[max(abs(bounds['min'][i]),abs(bounds['max'][i])) for i in [0,2]])*scale
 # Conservative circular canopy projection keeps routes and buildings readable.
 clearance=radius+1 if tree else .7
 if height(x,z)<=.05:reason='off dry land'
 elif any(distance(x,z,a,bb)<clearance for a,bb in segments):reason='route clearance'
 elif any(x>a-clearance and x<c+clearance and z>bb-clearance and z<d+clearance for a,bb,c,d in rects):reason='building clearance'
 elif tree and max(height(x+dx,z+dz) for dx,dz in [(-.45,0),(.45,0),(0,-.45),(0,.45)])-min(height(x+dx,z+dz) for dx,dz in [(-.45,0),(.45,0),(0,-.45),(0,.45)])>.65:reason='steep root support'
 else:reason=None
 if reason:rejected.append({'asset':asset,'x':x,'z':z,'reason':reason});return
 placements.append({'id':asset+'-'+str(len(placements)+1),'asset':asset,'x':x,'z':z,'scale':scale,'yaw':yaw})
for asset,pts in anchors.items():
 for i,(x,z) in enumerate(pts):add(asset,x,z,[.88,1,.77,1.08][i%4],(.25+i*.61) if asset!='coastal-pine' else .45+i*.07)
# Loose grass accents at tree edges; deliberately leave most ground empty.
for i,q in enumerate(list(placements)):
 if i%2==0:
  add('meadow-tuft',q['x']+1.7,q['z']+1.4,.8,.3+i)
  if i%4==0:add('meadow-tuft',q['x']+2.5,q['z']+.9,.62,i)
# Small clumps near sheltered creek edges; alternate gaps rather than continuous lining.
for i,(a,bb) in enumerate(zip(b['creek']['points'],b['creek']['points'][1:])):
 if i%2:continue
 dx=bb[0]-a[0];dz=bb[1]-a[1];length=math.hypot(dx,dz)
 x=(a[0]+bb[0])/2-dz/length*1.65;z=(a[1]+bb[1])/2+dx/length*1.65
 add('creek-reeds',round(x,3),round(z,3),.8,i*.7)
assert len(placements)>=20
out=ROOT/'.studio-workspaces/holm-habitat-v1/working';out.mkdir(parents=True,exist_ok=True)
(out/'vegetation.json').write_text(json.dumps({'schema':'holm-habitat-study-v1','status':'unpublished visual composition; no gameplay collision registration','placements':placements,'rejected':rejected},indent=2)+'\n')
print(json.dumps({'accepted':len(placements),'rejected':rejected},indent=2))
