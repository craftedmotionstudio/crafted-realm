"""Original Blender-authored hollow keep candidate, never a live world installer.
Blender X/Y plan, Z up; exported glTF X/Y/Z = Blender X/Z/-Y.
"""
import bpy, math, json, random, hashlib, struct
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
assert (ROOT/'tools/blender/build_holm_kitchen_character.py').is_file()
plan=json.loads((ROOT/'docs/rebuild/holm-overhaul/plan.json').read_text(encoding='utf-8-sig'))
assert any(p['id']=='keep' for p in plan['places'])
OUT=ROOT/'.studio-workspaces/holm-warden-keep-v1/candidates';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
GROUPS={}; DOORS=[]; TREADS=[]
def mat(name,c,kind=None):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=.95
 if kind:
  im=bpy.data.images.new('keep_'+kind,128,128);rng=random.Random(913261);pix=[]
  for y in range(128):
   for x in range(128):
    n=rng.uniform(-.017,.017)
    if kind=='stone':
     row=y//20;xx=(x+(row%2)*23)%128;v=.45+((row*7+xx//43*3)%9-4)*.014+n
     c=(.32,.325,.315) if y%20<1 or xx%43<1 else (v,v,v*.98)
    elif kind=='shingle':
     row=y//24;xx=(x+(row%2)*12)%128;v=.33+n+math.sin(x*1.4+y*.04)*.025
     c=(.17,.14,.085) if y%24<2 or xx%24<1 else (v*1.17,v*.94,v*.59)
    else:
     v=.26+n+math.sin(x*.8+math.sin(y*.04))*.028;c=(v*1.28,v*.94,v*.60)
    pix.extend((*c,1))
  im.pixels.foreach_set(pix);im.filepath_raw=str(OUT/('keep-'+kind+'.png'));im.file_format='PNG';im.save();im.pack()
  t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=im;t.interpolation='Closest';m.node_tree.links.new(t.outputs['Color'],bs.inputs['Base Color'])
 return m
STONE=mat('Keep gray fieldstone',(.46,.46,.44),'stone');WOOD=mat('Keep aged oak',(.32,.25,.15),'wood');ROOF=mat('Keep warm shingles',(.4,.31,.18),'shingle')
TRIM=mat('Keep pale dressed stone',(.56,.55,.49));IRON=mat('Keep dark iron',(.15,.17,.17));LINEN=mat('Keep oat linen',(.65,.62,.48));RED=mat('Keep muted oxblood',(.32,.12,.10));PAPER=mat('Keep parchment',(.68,.62,.44));FLAG=mat('Keep floor flags',(.37,.37,.32))
def reg(o,n,m,g):
 o.name=n;o.data.materials.append(m);GROUPS.setdefault(g,[]).append(o)
 o.data.update();uv=o.data.uv_layers.new(name='UVMap') if not o.data.uv_layers else o.data.uv_layers.active
 for p in o.data.polygons:
  axes=(0,1) if abs(p.normal.z)>.5 else ((0,2) if abs(p.normal.y)>.5 else (1,2))
  for li in p.loop_indices:
   v=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co;uv.data[li].uv=(v[axes[0]]*.42,v[axes[1]]*.42)
 return o
def box(n,lo,sz,m=STONE,g='Shell'):
 bpy.ops.mesh.primitive_cube_add(size=1,location=lo);o=bpy.context.object;o.dimensions=sz;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return reg(o,n,m,g)
def mesh(n,v,f,m,g):
 me=bpy.data.meshes.new(n);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(n,me);bpy.context.collection.objects.link(o);return reg(o,n,m,g)
def beam(n,a,b,w,m=WOOD,g='Furnishing'):
 d=Vector(b)-Vector(a);o=box(n,(Vector(a)+Vector(b))/2,(w,w,d.length),m,g);o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return o
def slab(n,x0,y0,x1,y1,top,m=FLAG,g='Floor',depth=.18):return box(n,((x0+x1)/2,(y0+y1)/2,top-depth/2),(x1-x0,y1-y0,depth),m,g)
def wall(n,axis,fixed,a,b,z0,z1,holes=(),g='Shell',thick=.38):
 # Grid subdivision leaves true voids; no boolean dust or hidden solid doorway wall.
 cuts=sorted(set([a,b]+[v for h in holes for v in h[:2] if a<v<b]));zs=sorted(set([z0,z1]+[v for h in holes for v in h[2:] if z0<v<z1]));out=[]
 for s,e in zip(cuts,cuts[1:]):
  for lo,hi in zip(zs,zs[1:]):
   if any(h[0]<(s+e)/2<h[1] and h[2]<(lo+hi)/2<h[3] for h in holes):continue
   pos=((s+e)/2,fixed,(lo+hi)/2) if axis=='x' else (fixed,(s+e)/2,(lo+hi)/2)
   sz=(e-s,thick,hi-lo) if axis=='x' else (thick,e-s,hi-lo)
   out.append(box(n,pos,sz,STONE,g))
 return out
def door(n,axis,fixed,a,b,base=0,top=2.5):
 DOORS.append({'id':n,'axis':axis,'fixed':fixed,'span':[a,b],'base':base,'top':top,'width':b-a,'height':top-base})
def gable(n,x0,y0,x1,y1,eave,ridge):
 mid=(x0+x1)/2
 mesh(n,[(x0,y0,eave),(mid,y0,ridge),(x1,y0,eave),(x0,y1,eave),(mid,y1,ridge),(x1,y1,eave)],[(0,3,4,1),(1,4,5,2),(0,1,2),(3,5,4)],ROOF,'Roof')
 for y in [y0,y1]:
  beam(n+' verge',(x0,y,eave),(mid,y,ridge),.18,WOOD,'Roof');beam(n+' verge',(mid,y,ridge),(x1,y,eave),.18,WOOD,'Roof')
 beam(n+' ridge',(mid,y0,ridge+.04),(mid,y1,ridge+.04),.24,WOOD,'Roof')
def crenel_line(n,axis,fixed,a,b,z,g='Upper_Wallwalk'):
 wall(n,axis,fixed,a,b,z,z+.60,(),g, .36)
 count=max(1,int((b-a)/1.35))
 for i in range(count):
  s=a+(i+.5)*(b-a)/count;pos=(s,fixed,z+.94) if axis=='x' else (fixed,s,z+.94)
  box(n+' merlon',pos,(.68,.42,.68) if axis=='x' else (.42,.68,.68),STONE,g)
# Main hall: 7 by 15, two floors, court doorway and upper gallery door.
slab('Hall flags',-10,-6,-3,9,0)
court=[-.5,1.5,0,2.55];gallery=[-5.8,-4.0,3.2,5.65];store=[6.05,7.95,0,2.55]
wall('Hall west','y',-10,-6,9,0,6.25,[(y,y+1.1,1.2,2.45) for y in [-3,1,5]]+[(y,y+1.1,4.4,5.6) for y in [-3,1,5]])
wall('Hall court','y',-3,-6,9,0,3.2,[court,store],g='GroundFront')
wall('Hall upper court','y',-3,-6,9,3.2,6.25,[gallery,(0,1.2,4.35,5.65),(4,5.2,4.35,5.65)],g='Upper_Shell')
wall('Hall south','x',-6,-10,-3,0,6.25,[(-8.6,-7.4,1.2,2.5),(-8.6,-7.4,4.35,5.65)],g='GroundFront')
wall('Hall north','x',9,-10,-3,0,6.25,[(-7.9,-6.1,0,2.5)])
door('court-hall','y',-3,*court[:2]);door('hall-store','y',-3,*store[:2]);door('upper-gallery','y',-3,*gallery[:2],3.2,5.65);door('hall-watchtower','x',9,-7.9,-6.1)
# Stair flight hugs west side, leaving more than four metres beside it; opening includes both ends.
sx0=-9.4;sx1=-7.8;sy0=-3.8;sy1=1.0
slab('Upper east floor',-7.65,-5.81,-3.19,8.81,3.2,WOOD,'Upper_Floor')
slab('Upper south landing',-9.81,-5.81,-7.65,-4,3.2,WOOD,'Upper_Floor')
slab('Upper north landing',-9.81,1.0,-7.65,8.81,3.2,WOOD,'Upper_Floor')
for i in range(16):
 y=sy0+(i+.5)*.3;z=(i+1)*.2;o=box('Tread %02d'%i,(-8.6,y,z-.07),(1.6,.3,.14),WOOD,'Stair')
 TREADS.append({'index':i,'object':o,'center':[-8.6,y,z]})
for x in [-9.5,-7.7]:
 beam('Stair stringer',(x,-3.8,.05),(x,1,3.18),.12,WOOD,'Stair')
 beam('Stair rail',(x,-3.8,.95),(x,1,4.08),.08,WOOD,'Stair')
 for i in [0,4,8,12,15]:beam('Stair post',(x,sy0+(i+.5)*.3,(i+1)*.2),(x,sy0+(i+.5)*.3,(i+1)*.2+.85),.065,WOOD,'Stair')
beam('Upper aperture rail',(-7.69,-3.95,4.1),(-7.69,1,4.1),.09,WOOD,'Upper_Furnishing')
for y in [-3.95,-2.8,-1.6,-.4,1]:beam('Opening post',(-7.69,y,3.2),(-7.69,y,4.1),.075,WOOD,'Upper_Furnishing')
gable('Hall roof',-10.45,-6.45,-2.55,9.35,6.34,8.8)
# Low connected stores: common west wall supplied by hall, door matched exactly.
slab('Store flags',-3,5,7,9,0)
wall('Store court','x',5,-3,7,0,3.05,[(0,1.9,0,2.45)],g='GroundFront');door('court-stores','x',5,0,1.9,0,2.45)
wall('Store north','x',9,-3,7,0,3.05,[(0,1.2,1.2,2.4),(3.4,4.6,1.2,2.4)])
wall('Store east','y',7,5,9,0,3.05,[(6.15,7.85,0,2.45)]);door('stores-east-tower','y',7,6.15,7.85,0,2.45)
# Roof ridge across the east-west range via rotated mesh coordinates.
mesh('Store low roof',[(-2.8,4.65,3.15),(-2.8,7,4.65),(-2.8,9.35,3.15),(7,4.65,3.15),(7,7,4.65),(7,9.35,3.15)],[(0,3,4,1),(1,4,5,2)],ROOF,'Roof')
beam('Store ridge',(-2.8,7,4.69),(7,7,4.69),.20,WOOD,'Roof')
# South gate passage and gallery; ground stays open from south into court.
slab('Gate passage',-1,-10,5,-4,0)
for x in [-1,5]:wall('Gate side','y',x,-10,-4,0,3.2)
for y in [-10,-4]:
 wall('Gate arch piers','x',y,-1,5,0,3.2,[(.45,3.55,0,2.75)],g='GroundFront');door('gate-'+str(y),'x',y,.45,3.55,0,2.75)
 for x in [.28,3.72]:box('Gate dress jamb',(x,y,1.36),(.30,.53,2.72),TRIM,'GroundFront')
 slab('Gate lintel',.28,y-.26,3.72,y+.26,3.16,TRIM,'GroundFront',.4)
slab('Gate roof gallery',-1,-10,5,-4,3.2,FLAG,'Upper_Floor')
for a,b in [(-3,-1),(5,9)]:
 slab('Connecting gallery',a,-6.2,b,-3.8,3.2,FLAG,'Upper_Floor')
 for y in [-6.2,-3.8]:crenel_line('Gallery battlements','x',y,a,b,3.2)
crenel_line('Gate south battlements','x',-10,-1,5,3.2)
crenel_line('Gate court battlements','x',-4,-1,5,3.2)
slab('East wall walk',7,-4,9,4.7,3.2,FLAG,'Upper_Floor')
wall('East curtain foundation','y',9,-6,4.7,0,3.2)
for x in [7,9]:crenel_line('East walk battlements','y',x,-4,4.7,3.2)
crenel_line('East walk stop','x',4.7,7,9,3.2)
# Octagonal towers moved clear of overlapping hall/store footprints. Bottom rooms are hollow.
def tower(n,cx,cy,apothem,h,door_side,door_span,door_fixed,roof=False):
 r=apothem/math.cos(math.pi/8);pts=[(cx+r*math.cos(math.pi/8+i*math.pi/4),cy+r*math.sin(math.pi/8+i*math.pi/4)) for i in range(8)]
 mesh(n+' floor',[(x,y,-.03) for x,y in pts],[tuple(range(8))],FLAG,'Floor')
 for i in range(8):
  a=Vector((*pts[i],0));b=Vector((*pts[(i+1)%8],0));d=b-a;L=d.length;mid=(a+b)/2
  isdoor=(door_side=='south' and abs(mid.y-door_fixed)<.01) or (door_side=='west' and abs(mid.x-door_fixed)<.01)
  segs=[(0,L,0,h)]
  if isdoor:
   w=door_span[1]-door_span[0];segs=[(0,(L-w)/2,0,h),((L+w)/2,L,0,h),((L-w)/2,(L+w)/2,2.5,h)]
  elif i%2==0:segs=[(0,(L-.55)/2,0,h),((L+.55)/2,L,0,h),((L-.55)/2,(L+.55)/2,0,h-2.5),((L-.55)/2,(L+.55)/2,h-1.0,h)]
  for s,e,z0,z1 in segs:
   p=a+d*((s+e)/2/L);o=box(n+' wall',(p.x,p.y,(z0+z1)/2),(e-s,.30,z1-z0),STONE,'Shell');o.rotation_euler.z=math.atan2(d.y,d.x)
  for t in [.2,.8]:
   p=a+d*t;o=box(n+' merlon',(p.x,p.y,h+.35),(.66,.42,.7),STONE,'Roof');o.rotation_euler.z=math.atan2(d.y,d.x)
 if roof:
  mesh(n+' conical cap',[(x,y,h+.06) for x,y in pts]+[(cx,cy,h+2.0)],[(i,(i+1)%8,8) for i in range(8)],ROOF,'Roof')
 return pts
tower('High watch',-7,12,3,10.2,'south',[-7.9,-6.1],9)
tower('East turret',9.3,7,2.3,6.7,'west',[6.15,7.85],7,True)
# Dressed buttress corners emphasize scale without filling rooms.
for x,y in [(-10.1,-5.7),(-10.1,4.2),(-10.1,8.5),(-3,-5.8),(9,-3.5),(9,1.6)]:
 box('Buttress foot',(x,y,.55),(.8,.8,1.1),STONE);box('Buttress shaft',(x,y,1.7),(.55,.55,1.3),STONE);box('Buttress cap',(x,y,2.4),(.65,.65,.16),TRIM)
# Human-scale teaching hall and armoury, clear stair/door routes kept free.
def table(n,x,y,z,g='Furnishing',sx=2.3,sy=1.0):
 box(n+' top',(x,y,z+.84),(sx,sy,.16),WOOD,g)
 for dx in [-sx/2+.14,sx/2-.14]:
  for dy in [-sy/2+.12,sy/2-.12]:box(n+' leg',(x+dx,y+dy,z+.4),(.13,.13,.8),WOOD,g)
table('Teaching table',-5.3,3.4,0,sx=2.3,sy=1.45)
box('Unrolled lesson parchment',(-5.3,3.4,.935),(1.4,.85,.025),PAPER,'Furnishing')
for x in [-6.4,-4.2]:box('Teaching bench',(x,3.4,.43),(.42,1.7,.16),WOOD,'Furnishing')
for y in [5.3,6.3,7.3]:
 beam('Armoury rack rail',(-9.5,y,.95),(-8.6,y,.95),.1)
 beam('Training spear',(-9.0,y,.1),(-9.0,y,2.1),.055)
 mesh('Spear head',[(-9.13,y,1.95),(-8.87,y,1.95),(-9,y,2.4),(-9,y+.07,2.05)],[(0,1,2),(0,3,1),(0,2,3),(1,3,2)],IRON,'Furnishing')
for x in [2.8,4.2,5.6]:
 box('Store chest',(x,8.1,.5),(1.0,1.15,1.0),WOOD,'Furnishing')
 for dx in [-.32,.32]:box('Chest iron band',(x+dx,8.1,1.02),(.07,1.18,.04),IRON,'Furnishing')
table('Store counter',4,5.7,0,sx=2.8,sy=.65)
table('Upper map desk',-5.3,6.8,3.2,'Upper_Furnishing',2.1,1.1)
box('Upper map',(-5.3,6.8,4.135),(1.6,.85,.025),PAPER,'Upper_Furnishing')
for y in [2.6,4.6]:
 box('Guard bed',(-5,y,3.53),(2.7,1.1,.35),WOOD,'Upper_Furnishing');box('Guard mattress',(-5,y,3.8),(2.6,1,.22),LINEN,'Upper_Furnishing');box('Guard cover',(-4.8,y,3.93),(1.6,1.01,.035),RED,'Upper_Furnishing')
# Record actual tread vertices before grouping.
for t in TREADS:
 o=t.pop('object');v=[o.matrix_world@p.co for p in o.data.vertices];t['measuredWidth']=max(p.x for p in v)-min(p.x for p in v);t['measuredTop']=max(p.z for p in v)
 assert abs(t['measuredWidth']-1.6)<1e-5 and abs(t['measuredTop']-t['center'][2])<1e-5
for g,items in GROUPS.items():
 buckets={}
 for o in items:buckets.setdefault(o.data.materials[0].name,[]).append(o)
 for mi,items in enumerate(buckets.values()):
  bpy.ops.object.select_all(action='DESELECT')
  for o in items:o.select_set(True)
  bpy.context.view_layer.objects.active=items[0];bpy.ops.object.join();o=bpy.context.object;o.name='Keep_'+g+'_'+str(mi);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
production=[o for o in bpy.context.scene.objects if o.type=='MESH'];tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in production);mats={m.name for o in production for m in o.data.materials}
assert tris<30000 and len(mats)<=20 and all(d['width']>=1.7-1e-6 and d['height']>=2.4-1e-6 for d in DOORS)
# Cross actual exported meshes at an aperture grid, including shared tower walls.
# This proves local openings only, not avatar navigation through the whole building.
bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();samples=0
for d in DOORS:
 for fraction in [.05,.25,.5,.75,.95]:
  along=d['span'][0]+fraction*d['width']
  for up in [.10,.5,.9]:
   z=d['base']+up*d['height']
   origin=Vector((along,d['fixed']-.55,z)) if d['axis']=='x' else Vector((d['fixed']-.55,along,z))
   direction=Vector((0,1,0)) if d['axis']=='x' else Vector((1,0,0))
   hit=bpy.context.scene.ray_cast(deps,origin,direction,distance=1.1)
   assert not hit[0],('Door aperture obstructed',d['id'],fraction,up,hit[4].name if hit[0] else '')
   samples+=1
for t in TREADS:
 origin=Vector(t['center'])+Vector((0,0,.02));hit=bpy.context.scene.ray_cast(deps,origin,Vector((0,0,1)),distance=20)
 assert hit[0],('Missing roof above flight',t['index'])
 t['measuredHeadroom']=hit[1].z-t['measuredTop'];assert t['measuredHeadroom']>=2.4
verts=[o.matrix_world@v.co for o in production for v in o.data.vertices];bounds=[[min(v[i] for v in verts) for i in range(3)],[max(v[i] for v in verts) for i in range(3)]]
assert all(math.isfinite(c) for b in bounds for c in b)
bpy.ops.object.select_all(action='DESELECT')
for o in production:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'keep.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=False)
data=(OUT/'keep.glb').read_bytes();gltf=json.loads(data[20:20+struct.unpack_from('<I',data,12)[0]]);assert len(gltf['images'])==3 and all('bufferView' in i for i in gltf['images'])
contract={'schema':'holm.warden-keep.v1','status':'unpublished geometry candidate, not runtime/visual acceptance','coordinates':'Blender X/Y plan Z up; glTF X/Y/Z = Blender X/Z/-Y','boundsBlender':bounds,'triangleCount':tris,'materialCount':len(mats),'meshCount':len(production),'meshNames':[o.name for o in production],'glb':{'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'embeddedImages':3,'primitives':sum(len(m['primitives']) for m in gltf['meshes'])},'doorways':DOORS,'stairs':{'treads':TREADS,'count':16,'rise':.2,'depth':.3,'width':1.6,'upperTop':3.2,'aperture':[-9.81,-4,-7.65,1],'upperRoomHeadroom':3.05,'minimumRailClearWidth':1.72,'bottomLanding':[-8.6,-4.9,0],'topLanding':[-8.6,1.8,3.2]},'upperRouteBlender':[[-8.6,1.8,3.2],[-6.8,1.8,3.2],[-6.8,-4.9,3.2],[-2,-4.9,3.2],[2,-4.9,3.2],[8,-4.9,3.2],[8,3,3.2]],'deviations':['Watchtower moved north to center (-7,12), apothem3, avoiding plan hall overlap. Hollow ground room connects at hall north door.','East turret center (9.3,7) apothem2.3 connects to stores without intersecting a room.','Overlapping plan stair turret removed: usable straight flight is inside hall.','Wallwalk has closed north stop; upper turret connection and watchtower upper floors/stairs unfinished.'],'unfinished':['Upper tower floors and access; tower roof lookout access','Door leaves/animation and other animated props','Runtime collision/nav/stations/combat teaching/NPC bindings','Reference comparison and main eyes-on review','World placement and Safe Publish']}
contract['geometryAcceptance']={'doorApertureRaySamples':samples,'doorCrossingDepth':1.1,'sampleFractions':[.05,.25,.5,.75,.95],'sampleHeightFractions':[.1,.5,.9],'scope':'Local aperture geometry only; cardinal runtime paths not proven'}
(OUT/'keep.contract.json').write_text(json.dumps(contract,indent=2),encoding='utf-8')
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=12;scene.render.resolution_x=1500;scene.render.resolution_y=1200;scene.render.resolution_percentage=100;scene.world.color=(.35,.35,.35);scene.view_settings.view_transform='Standard'
ground=mat('Preview ground',(.23,.28,.13));box('Preview ground',(0,0,-.3),(200,200,.1),ground,'PreviewOnly')
bpy.ops.object.light_add(type='AREA',location=(-10,-15,25));bpy.context.object.data.energy=2400;bpy.context.object.data.size=18
bpy.ops.object.light_add(type='SUN');bpy.context.object.rotation_euler=(.4,-.5,-.4);bpy.context.object.data.energy=1.6
bpy.ops.object.camera_add(location=(28,-36,31));cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=39;scene.camera=cam
def photo(n,target):
 cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/(n+'.png'));bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'keep.blend'));photo('keep-exterior',(0,1,3))
for o in production:
 if o.name.startswith(('Keep_Roof_','Keep_Upper_','Keep_GroundFront_')):o.hide_render=True
cam.location=(22,-30,38);photo('keep-cutaway',(-1,1,1))
for o in production:o.hide_render=False
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'keep.blend'))
print('[WARDEN_KEEP] PASS budgets finite bounds 16 measured treads 3 embedded textures; triangles',tris)

