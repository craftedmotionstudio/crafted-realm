"""Guide-house furnishings with local, layout-owned positions and edited profiles."""
import json
def build(B):
 mesh,prism,beam,material=B['mesh'],B['prism'],B['beam'],B['material']
 wood=B['wood'];floor=B['floor'];root=B['ROOT']
 cloth=material('Moss wool blanket',(.28,.38,.23));linen=material('Cream linen',(.73,.68,.52));ink=material('Ink blue',(.12,.23,.26));paper=material('Parchment',(.70,.61,.41))
 layout=json.loads((root/'docs/rebuild/holm-overhaul/arrival-layout.json').read_text())
 def top(name,x,z,y,w,d,mat):
  c=.10;outline=[(-w/2+c,-d/2),(w/2-c,-d/2),(w/2,-d/2+c),(w/2,d/2-c),(w/2-c,d/2),(-w/2+c,d/2),(-w/2,d/2-c),(-w/2,-d/2+c)]
  verts=[(x+a,y+h,z+b) for h in [-.12,0] for a,b in outline]
  return mesh(name,verts,[tuple(range(7,-1,-1)),tuple(range(8,16))]+[(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)],mat)
 def table(s,prefix):
  x,z,y,w,d=s['x'],s['z'],s['y'],s['w'],s['d'];top(prefix+'Top',x,z,y+.82,w,d,floor)
  for dx in [-w*.34,w*.34]:
   beam(prefix+'Trestle',(x+dx,y+.12,z-d*.38),(x+dx,y+.70,z-d*.22),.16,.17,wood)
   beam(prefix+'Trestle',(x+dx,y+.12,z+d*.38),(x+dx,y+.70,z+d*.22),.16,.17,wood)
   beam(prefix+'Foot',(x+dx,y+.1,z-d*.42),(x+dx,y+.1,z+d*.42),.18,.18,wood)
  beam(prefix+'Stretcher',(x-w*.34,y+.3,z),(x+w*.34,y+.3,z),.13,.17,wood)
  return x,z,y+.82
 for s in layout['groundServices']+layout['upperServices']:
  prefix='UpperFurnishing' if s['y'] else 'GroundFurnishing'
  if s['id'] in ['chart','shared_table','study']:
   x,z,y=table(s,prefix+s['id'])
   if s['id']=='chart':
    top(prefix+'ChartBoard',x,z,y+.055,1.7,1.1,ink)
    plan=json.loads((root/'docs/rebuild/holm-overhaul/plan.json').read_text())
    coast=[(x+(a-72)/105,y+.07,z+(b-64)/130) for a,b in plan['coast']]
    mesh(prefix+'IslandRelief',coast,[tuple(range(len(coast)))],cloth)
    for a,b in zip(plan['creek'],plan['creek'][1:]):beam(prefix+'ChartCreek',(x+(a[0]-72)/105,y+.08,z+(a[1]-64)/130),(x+(b[0]-72)/105,y+.08,z+(b[1]-64)/130),.015,.015,ink)
   elif s['id']=='study':
    # Folded spread with a raised spine; readable from the overhead camera.
    mesh(prefix+'OpenBook',[(x-.42,y+.03,z-.25),(x,y+.07,z-.25),(x+.42,y+.03,z-.25),(x-.42,y+.03,z+.3),(x,y+.07,z+.3),(x+.42,y+.03,z+.3)],[(0,1,4,3),(1,2,5,4)],paper)
    for i in range(3):prism(prefix+'BoundBook',x+.55,x+.85,y,y+.10+i*.08,z-.4+i*.15,z-.3+i*.15,cloth)
   else:
    top(prefix+'LinenRunner',x,z,y+.008,.55,1.18,linen)
    for side in [-1,1]:
     bz=z+side*1.08;top(prefix+'BenchSeat',x,bz,s['y']+.46,1.9,.38,floor)
     for dx in [-.66,.66]:
      beam(prefix+'BenchLeg',(x+dx,s['y'],bz),(x+dx,s['y']+.36,bz),.15,.21,wood)
  if s['id']=='bed':
   x,z,y=s['x'],s['z'],s['y'];w,d=s['w'],s['d']
   prism(prefix+'BedFrame',x-w/2,x+w/2,y+.28,y+.47,z-d/2,z+d/2,wood)
   # Mattress has a crowned top and tucked bevel, not a single rectangular slab.
   vertices=[(x+a,y+h,z+b) for h,ww,dd in [(.47,w-.12,d-.1),(.63,w-.06,d-.04),(.71,w-.22,d-.2)] for a,b in [(-ww/2,-dd/2),(ww/2,-dd/2),(ww/2,dd/2),(-ww/2,dd/2)]]
   mesh(prefix+'Mattress',vertices,[(8,9,10,11)]+[(j+i,j+(i+1)%4,j+(i+1)%4+4,j+i+4) for j in [0,4] for i in range(4)],linen)
   top(prefix+'Blanket',x,z+.25,y+.73,w-.16,1.55,cloth)
   top(prefix+'Pillow',x,z-.8,y+.79,w-.35,.46,linen)
   for a in [-w/2,w/2]:
    for b in [-d/2,d/2]:beam(prefix+'BedPost',(x+a,y,z+b),(x+a,y+(.96 if b<0 else .57),z+b),.13,.13,wood)
   beam(prefix+'Headboard',(x-w/2,y+.91,z-d/2),(x+w/2,y+.91,z-d/2),.12,.30,wood)
 # Upper-floor guarding remains outside the clear 1.5-tile stair opening.
 for x in [3.42,5.08]:
  for z in [layout['stairs']['endZ']+i*(layout['stairs']['startZ']+.05-layout['stairs']['endZ'])/4 for i in range(5)]:
   beam('UpperFurnishingWellPost',(x,2.8,z),(x,3.73,z),.1,.1,wood)
  beam('UpperFurnishingWellRail',(x,3.73,layout['stairs']['endZ']),(x,3.73,layout['stairs']['startZ']+.05),.12,.12,wood)
 beam('UpperFurnishingWellEndRail',(3.42,3.73,layout['stairs']['startZ']+.05),(5.08,3.73,layout['stairs']['startZ']+.05),.12,.12,wood)
