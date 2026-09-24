"""Reversible Blender keep v3: measured tower switchbacks and open lookouts.
Reuses the frozen v1 authoring recipe, never edits or installs its outputs.
"""
import bpy, json, hashlib, math, struct
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'.studio-workspaces/holm-warden-keep-v1/candidates'
assert (BASE/'keep.blend').is_file() and (BASE/'keep.contract.json').is_file()
assert hashlib.sha256((BASE/'keep.glb').read_bytes()).hexdigest()=='3b35a22df01db975ca25804367541c4bc63f76b34137d92ce1524fa09220bf59'
recipe=(ROOT/'tools/blender/build_holm_warden_keep.py').read_text(encoding='utf-8')
V2=ROOT/'.studio-workspaces/holm-warden-keep-v2/candidates'
assert hashlib.sha256((V2/'keep.glb').read_bytes()).hexdigest()=='d28071220a250f4cff16e18dd1b7acec6fa7ccab6c0eda5e3457bee79190e324'
prefix=recipe.split('# Record actual tread vertices before grouping.')[0]
prefix=prefix.replace('holm-warden-keep-v1/candidates','holm-warden-keep-v4/candidates')
prefix=prefix.replace("tower('East turret',9.3,7,2.3,6.7,'west',[6.15,7.85],7,True)","tower('East turret',10,7,3,6.7,'west',[6.15,7.85],7,False)")
prefix=prefix.replace("for y in [-6.2,-3.8]:crenel_line('Gallery battlements','x',y,a,b,3.2)","for y in [-6.2,-3.8]:crenel_line('Gallery battlements','x',y,a,7 if a==5 and y==-3.8 else b,3.2)")
exec(compile(prefix,str(ROOT/'tools/blender/build_holm_warden_keep.py'),'exec'))
slab('Hall gallery threshold',-3.21,-5.8,-2.99,-4,3.2,WOOD,'Upper_Floor')
TOWERS=[]; ACCESS=[]

def clip(poly,axis,value,greater):
 out=[]
 for a,b in zip(poly,poly[1:]+poly[:1]):
  ia=(a[axis]>=value) if greater else (a[axis]<=value)
  ib=(b[axis]>=value) if greater else (b[axis]<=value)
  if ia:out.append(a)
  if ia!=ib:
   t=(value-a[axis])/(b[axis]-a[axis]);out.append([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])])
 return out

def polygon_slab(name,poly,z,g='Upper_Floor'):
 n=len(poly)
 if n<3:return
 mesh(name,[(x,y,z-.16) for x,y in poly]+[(x,y,z) for x,y in poly],[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],WOOD,g)

for name,cx,cy,ap,h,count in [('High watch',-7,12,3,10.2,3),('East turret',10,7,3,6.7,2)]:
 inner=ap-.18;r=inner/math.cos(math.pi/8)
 boundary=[[cx+r*math.cos(math.pi/8+i*math.pi/4),cy+r*math.sin(math.pi/8+i*math.pi/4)] for i in range(8)]
 record={'id':name,'center':[cx,cy],'apothem':ap,'innerBoundary':boundary,'floors':[],'flights':[],'landings':[],'lookoutHeight':h}
 if name=='East turret':cx+=.5
 # The aperture includes both flights AND their mid-height turn. A slab above
 # that turn would create a head strike; it deliberately stays open at every level.
 for level in range(1,count+1):
  z=h*level/count;panels=[]
  for axis,value,greater in [(1,cy-.9,False),(0,cx-1.4,False),(0,cx+1.4,True),(1,cy+2.1,True)]:
   poly=clip(boundary,axis,value,greater)
   # Side/north panels are clipped against previous panels to avoid coplanar overlaps.
   if axis==0:poly=clip(poly,1,cy-.9,True)
   if axis==1 and greater:poly=clip(clip(poly,0,cx-1.4,True),0,cx+1.4,False)
   if len(poly)>=3:polygon_slab(name+' upper floor',poly,z,'Upper_Tower_'+name.replace(' ','')+'_Level'+str(level)+'_Floor');panels.append(poly)
  guard_group='Upper_Tower_'+name.replace(' ','')+'_Level'+str(level)+'_Floor'
  guards=[((cx-1.44,cy-.9,z+.9),(cx-1.44,cy+2.14,z+.9)),((cx+1.44,cy-.9,z+.9),(cx+1.44,cy+2.14,z+.9)),((cx-1.44,cy+2.14,z+.9),(cx+1.44,cy+2.14,z+.9))]
  # Intermediate floors must leave BOTH stair entrances open. The left side is
  # a fall edge only at the final lookout, where there is no following flight.
  if level==count:guards.append(((cx-1.44,cy-.86,z+.9),(cx,cy-.86,z+.9)))
  for a,b in guards:
   beam(name+' aperture guard',a,b,.07,WOOD,guard_group)
   for p in [a,b]:beam(name+' aperture post',(p[0],p[1],z),p,.07,WOOD,guard_group)
  record['floors'].append({'top':z,'polygons':panels,'aperture':[cx-1.4,cy-.9,cx+1.4,cy+2.1]})
 for level in range(count):
  base=h*level/count;rise=h/count/16;stair_group='Tower_'+name.replace(' ','')+'_Level'+str(level+1)+'_Stair'
  for flight in range(2):
   x=cx+(-.7 if flight==0 else .7);steps=[]
   for i in range(8):
    y=cy-.9+(i+.5)*.225 if flight==0 else cy+.9-(i+.5)*.225
    z=base+(i+1+flight*8)*rise
    o=box(name+' tower tread',(x,y,z-.06),(1.25,.225,.12),WOOD,stair_group)
    t={'tower':name,'level':level,'flight':flight,'index':i,'center':[x,y,z],'object':o};ACCESS.append(t);steps.append(t)
   record['flights'].append({'level':level,'flight':flight,'direction':'+Y' if flight==0 else '-Y','rise':rise,'depth':.225,'width':1.25,'treads':steps})
   for side in [-1,1]:
    rx=x+side*.68
    a=(rx,cy-.9,base+.88 if flight==0 else base+16*rise+.88)
    b=(rx,cy+.9,base+8*rise+.88)
    beam(name+' flight rail',a,b,.065,WOOD,stair_group)
    for i in [0,3,7]:
     t=steps[i];beam(name+' stair baluster',(rx,t['center'][1],t['center'][2]),(rx,t['center'][1],t['center'][2]+.87),.055,WOOD,stair_group)
  top=base+8*rise
  slab(name+' return landing',cx-1.325,cy+.9,cx+1.325,cy+2.1,top,WOOD,stair_group,.12)
  record['landings'].append({'type':'turn','top':top,'rectangle':[cx-1.325,cy+.9,cx+1.325,cy+2.1],'clearDepth':1.2,'clearWidth':2.65})
  record['landings'].append({'type':'end','top':base,'rectangle':[cx-1.325,cy-2.1,cx+1.325,cy-.9],'clearDepth':1.2,'clearWidth':2.65})
  beam(name+' turn rail',(cx-1.33,cy+2.13,top+.9),(cx+1.33,cy+2.13,top+.9),.08,WOOD,stair_group)
 if name=='East turret':cx-=.5
 # Plain parapet base below existing merlons makes a safe readable lookout edge.
 rr=ap/math.cos(math.pi/8);outer=[(cx+rr*math.cos(math.pi/8+i*math.pi/4),cy+rr*math.sin(math.pi/8+i*math.pi/4)) for i in range(8)]
 for a,b in zip(outer,outer[1:]+outer[:1]):
  d=Vector(b)-Vector(a);o=box(name+' lookout parapet',((a[0]+b[0])/2,(a[1]+b[1])/2,h+.3),(d.length,.30,.6),STONE,'Roof');o.rotation_euler.z=math.atan2(d.y,d.x)
 # Landings and flights lie wholly inside the actual octagonal inner wall.
 for land in record['landings']:
  x0,y0,x1,y1=land['rectangle']
  for x,y in [(x0,y0),(x0,y1),(x1,y0),(x1,y1)]:
   assert abs(x-cx)<=inner and abs(y-cy)<=inner
   assert abs(x-cx)+abs(y-cy)<=inner*math.sqrt(2)+1e-6,(name,'chamfer landing collision')
 record['landings'].append({'type':'lookout-end','top':h,'rectangle':[cx-1.325,cy-2.1,cx+1.325,cy-.9],'clearDepth':1.2,'clearWidth':2.65})
 TOWERS.append(record)

bpy.context.view_layer.update()
for t in TREADS+ACCESS:
 o=t.pop('object');v=[o.matrix_world@p.co for p in o.data.vertices]
 t['measuredWidth']=max(p.x for p in v)-min(p.x for p in v);t['measuredTop']=max(p.z for p in v)
 assert abs(t['measuredTop']-t['center'][2])<1e-5
 assert t['measuredWidth']>=1.25-1e-5
for g,items in GROUPS.items():
 buckets={}
 for o in items:buckets.setdefault(o.data.materials[0].name,[]).append(o)
 for items in buckets.values():
  bpy.ops.object.select_all(action='DESELECT')
  for o in items:o.select_set(True)
  bpy.context.view_layer.objects.active=items[0];bpy.ops.object.join();o=bpy.context.object;o.name='Keep_'+g+'_'+str(len(buckets))+'_'+str(len(items));bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
production=[o for o in bpy.context.scene.objects if o.type=='MESH']
bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();door_samples=0
threshold_samples=0
for x in [-3.2,-3.1,-3.0]:
 for y in [-5.75,-4.9,-4.05]:
  hit=bpy.context.scene.ray_cast(deps,Vector((x,y,3.25)),Vector((0,0,-1)),distance=.1)
  assert hit[0] and abs(hit[1].z-3.2)<1e-5,('Missing gallery threshold support',x,y)
  threshold_samples+=1
for d in DOORS:
 for fraction in [.05,.25,.5,.75,.95]:
  along=d['span'][0]+fraction*d['width']
  for up in [.1,.5,.9]:
   z=d['base']+up*d['height'];origin=Vector((along,d['fixed']-.55,z)) if d['axis']=='x' else Vector((d['fixed']-.55,along,z));direction=Vector((0,1,0)) if d['axis']=='x' else Vector((1,0,0))
   hit=bpy.context.scene.ray_cast(deps,origin,direction,distance=1.1)
   assert not hit[0],('Blocked doorway',d['id'],hit[4].name if hit[0] else '')
   door_samples+=1
entry_samples=0;entry_evidence=[]
for tower_data in TOWERS:
 cx,cy=tower_data['center']
 for flight in tower_data['flights']:
  # Left flight begins at a floor; right flight terminates at the next floor.
  is_up=flight['flight']==0
  base=flight['treads'][0]['center'][2]-flight['rise'] if is_up else flight['treads'][-1]['center'][2]
  x=flight['treads'][0]['center'][0]
  for dx in [-.6,-.4,-.2,0,.2,.4,.6]:
   for chest in [.45,.9,1.35,1.8]:
    origin=Vector((x+dx,cy-1.1,base+chest))
    hit=bpy.context.scene.ray_cast(deps,origin,Vector((0,1,0)),distance=.45)
    assert not hit[0],('Blocked stair entry',tower_data['id'],flight['level'],flight['flight'],dx,chest,hit[4].name if hit[0] else '')
    entry_samples+=1
  entry_evidence.append({'tower':tower_data['id'],'level':flight['level'],'flight':flight['flight'],'floorTop':base,'span':[x-.6,x+.6],'ySweep':[cy-1.1,cy-.65],'chestHeights':[.45,.9,1.35,1.8],'samples':28})
head_samples=0
for t in TREADS+ACCESS:
 rooms=[]
 for dx in [-.5,0,.5]:
  p=Vector(t['center'])+Vector((dx,0,.025));hit=bpy.context.scene.ray_cast(deps,p,Vector((0,0,1)),distance=30)
  room=hit[1].z-t['measuredTop'] if hit[0] else 30
  assert room>=2,('Head strike',t,dx,room,hit[4].name if hit[0] else '')
  rooms.append(room);head_samples+=1
 t['measuredHeadroom']=min(rooms)
for tower_data in TOWERS:
 for land in tower_data['landings']:
  x0,y0,x1,y1=land['rectangle'];results=[]
  for x in [x0+.04,(x0+x1)/2,x1-.04]:
   for y in [y0+.04,(y0+y1)/2,y1-.04]:
    hit=bpy.context.scene.ray_cast(deps,Vector((x,y,land['top']+.025)),Vector((0,0,1)),distance=30)
    room=hit[1].z-land['top'] if hit[0] else 30
    assert room>=2,('Landing head strike',tower_data['id'],land,room)
    support=bpy.context.scene.ray_cast(deps,Vector((x,y,land['top']+.02)),Vector((0,0,-1)),distance=.12)
    assert support[0] and abs(support[1].z-land['top'])<=.031,('Missing landing support',tower_data['id'],land,x,y)
    results.append(room);head_samples+=1
  land['measuredMinimumHeadroom']=min(results)
tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in production)
verts=[o.matrix_world@v.co for o in production for v in o.data.vertices];bounds=[[min(v[i] for v in verts) for i in range(3)],[max(v[i] for v in verts) for i in range(3)]]
assert tris<=12000 and all(math.isfinite(c) for b in bounds for c in b)
bpy.ops.object.select_all(action='DESELECT')
for o in production:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'keep.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=False)
data=(OUT/'keep.glb').read_bytes();gltf=json.loads(data[20:20+struct.unpack_from('<I',data,12)[0]]);primitives=sum(len(m['primitives']) for m in gltf['meshes']);assert primitives<=45
contract=json.loads((BASE/'keep.contract.json').read_text(encoding='utf-8'));contract.update(schema='holm.warden-keep.v4',boundsBlender=bounds,triangleCount=tris,meshCount=len(production),meshNames=[o.name for o in production],towers=TOWERS)
contract['glb']={'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'embeddedImages':len(gltf.get('images',[])),'primitives':primitives}
contract['galleryThreshold']={'rectangleBlender':[-3.21,-5.8,-2.99,-4],'top':3.2,'downwardSupportRaySamples':threshold_samples,'purpose':'Bridge the hall floor edge at x-3.19 to gallery start x-3 without changing the doorway.'}
contract['geometryAcceptance'].update(doorApertureRaySamples=door_samples,headroomRaySamples=head_samples,minimumHeadroom=min(t['measuredHeadroom'] for t in TREADS+ACCESS),towerTreads=len(ACCESS),landingChamferContainment=True)
contract['geometryAcceptance'].update(stairEntryHorizontalRaySamples=entry_samples,stairEntries=entry_evidence,stairEntryScope='Discrete horizontal scene rays through 1.2m clear entrance width at four heights; not a continuous avatar volume sweep or runtime navigation test.')
contract['deviations']=['East turret expanded from apothem2.3 at(9.3,7) via v2 apothem2.65 at(9.65,7) to v3 apothem3 at(10,7), keeping west doorwayx7. Parent authorized expansion for half-grid cardinal flight access.','East turret conical cap replaced by open crenellated lookout.','Tower apertures include mid-flight turns, avoiding low overhead slabs. Tower upper spaces are circulation/lookout galleries around the open stairs.']
contract['deviations'].append('V4 opens gallery-to-wallwalk junction and offsets east stair/aperture assembly 0.5 tile east inside the unchanged v3 shell.')
contract['unfinished']=['Runtime collision/cardinal navigation and actual player stair movement','Door leaves/animation and other animated props','Reference comparison and main eyes-on review','World placement and Safe Publish','Upper east wallwalk connection remains closed; turret access is via its ground entrance']
(OUT/'keep.contract.json').write_text(json.dumps(contract,indent=2),encoding='utf-8')
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=8;scene.render.resolution_x=1500;scene.render.resolution_y=1200;scene.render.resolution_percentage=100;scene.world.color=(.35,.35,.35);scene.view_settings.view_transform='Standard'
ground=mat('Preview ground',(.23,.28,.13));box('Preview ground',(0,0,-.3),(200,200,.1),ground,'PreviewOnly')
bpy.ops.object.light_add(type='AREA',location=(-10,-15,25));bpy.context.object.data.energy=2400;bpy.context.object.data.size=18
bpy.ops.object.light_add(type='SUN');bpy.context.object.rotation_euler=(.4,-.5,-.4);bpy.context.object.data.energy=1.6
bpy.ops.object.camera_add(location=(28,-36,31));cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=40;scene.camera=cam
def photo(n,target):
 cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/(n+'.png'));bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'keep.blend'));photo('keep-exterior',(0,2,4))
for o in production:
 if o.name.startswith(('Keep_Roof_','Keep_Shell_','Keep_Upper_Shell_','Keep_GroundFront_')):o.hide_render=True
cam.location=(22,-30,38);photo('keep-cutaway',(0,3,3))
for o in production:o.hide_render=False
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'keep.blend'))
(OUT/'REPORT.md').write_text(f'''# Keep v4 tower access candidate\n\nActual Blender source and exports, unpublished. {tris} triangles, {primitives} primitives.\n\nBoth towers have stacked 1.25 m cardinal switchback flights, 1.2 m deep landings, open floor apertures and lookout parapets. The east tower expansion to center(10,7), apothem3 is recorded in the contract. The upper hall/gallery threshold now bridges x[-3.21,-2.99] at top3.2, with nine mesh support rays. {len(ACCESS)} tower treads plus the preserved 16 hall treads were measured from actual mesh vertices. {head_samples} vertical scene rays and {door_samples} doorway crossing rays and {entry_samples} horizontal stair-entry rays passed; these are discrete geometry samples, not runtime avatar validation.\n\nFull-world placement, navigation/player integration, animation, reference review and Safe Publish remain unimplemented. The east wallwalk still has its closed north stop; turret entry is on the ground.\n''',encoding='utf-8')
print('[WARDEN_KEEP_V4] PASS',tris,primitives,door_samples,head_samples,contract['glb']['sha256'])
