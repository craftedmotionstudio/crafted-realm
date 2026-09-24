"""Reversible upper-room extension of the authored v1 design; no live writes."""
import bpy, json, math, hashlib, struct
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'tools/blender/build_holm_kitchen_wings_study.py'
assert BASE.is_file() and (ROOT/'.studio-workspaces/holm-kitchen-wings-v1/candidates/kitchen-wings.blend').is_file()
source=BASE.read_text(encoding='utf-8').split('# Merge by semantic group/material')[0]
source=source.replace("holm-kitchen-wings-v1/candidates", "holm-kitchen-wings-v2/candidates")
source=source.replace("3.72,6.05,'Y'", "6.22,8.55,'Y'")
source=source.replace('(-2.15,-.35,0,2.55)', '(-2.7,-.9,0,2.55)').replace('[-2.15,-.35]', '[-2.7,-.9]').replace('(1,-1.25,', '(1,-1.8,')
# Chimney has continuous original shaft, with extension above the new roof.
exec(compile(source,str(BASE),'exec'))
# Move preparation ensemble west .15 so stair-side circulation clears .74 diameter allowance.
for o in GROUPS['Worktable']:
    if o.location.x<0:o.location.x-=.15
# Preserve semantic separation for roof-off ground inspection.
for group,items in list(GROUPS.items()):
    if group in ['Roof','Chimney']: continue
    for o in list(items):
        if o.name.startswith(('Main south','Court entrance','South kneading','Entrance oak')):
            items.remove(o); GROUPS.setdefault('GroundFront',[]).append(o)
# Upper floor top 3.30; real opening around the whole stair flight.
box('Upper west floor',(-3.05,1,3.23),(3.9,8,.14),WOOD,'UpperFloor')
box('Upper east edge',(.825,1,3.23),(.35,8,.14),WOOD,'UpperFloor')
box('Upper south landing',(-.225,-2.25,3.23),(1.75,1.5,.14),WOOD,'UpperFloor')
box('Upper north landing',(-.225,4.1,3.23),(1.75,1.8,.14),WOOD,'UpperFloor')
# Upper walls with actual clear window apertures. Existing ground shell retained.
def upper_wall(name,axis,fixed,start,end,holes=()):
    before=set(bpy.data.objects)
    wall(name,axis,fixed,start,end,2.85,holes)
    for o in set(bpy.data.objects)-before:
        GROUPS['Shell'].remove(o); GROUPS.setdefault('UpperShell',[]).append(o); o.location.z+=3.3
upper_wall('Upper south','X',-3,-5,1,[(-3.8,-2.2,.85,2.15)])
upper_wall('Upper west','Y',-5,-3,5,[(-1.8,-.2,.85,2.15),(1.5,3.1,.85,2.15)])
upper_wall('Upper north','X',5,-5,1)
upper_wall('Upper east','Y',1,-3,5,[(-1.9,-.3,.85,2.15),(2.6,4.2,.85,2.15)])
for axis,fixed,c in [('X',-3.04,-3),('Y',-5.04,-1),('Y',-5.04,2.3),('Y',1.04,-1.1),('Y',1.04,3.4)]:
    before=set(bpy.data.objects); window('Upper casement',axis,fixed,c,1.6,4.15,5.45)
    for o in set(bpy.data.objects)-before:
        for items in GROUPS.values():
            if o in items: items.remove(o); break
        GROUPS.setdefault('UpperShell',[]).append(o)
for x,y in [(-5,-3),(1,-3),(-5,5),(1,5)]:box('Upper oak upright',(x,y,4.725),(.16,.16,2.85),WOOD,'UpperShell')
for y in [-3.03,5.03]:box('Upper storey beam',(-2,y,3.34),(6.12,.18,.18),WOOD,'UpperShell')
for x in [-5.03,1.03]:box('Upper storey beam',(x,1,3.34),(.18,8.12,.18),WOOD,'UpperShell')
# Sixteen actual treads with separate semantic names, clear width 1.50 between rails.
treads=[]
for i in range(16):
    y=-1.3+(i+.5)*.28125; z=(i+1)*3.3/16
    o=box('Tread %02d'%i,(-.25,y,z-.06),(1.5,.28125,.12),WOOD,'Stair_Tread%02d'%i)
    treads.append({'index':i,'blender':[-.25,y,z],'gltf':[-.25,z,-y]})
for x in [-1.09,.59]:
    beam('Stair stringer',(x,-1.3,.08),(x,3.2,3.21),.16,WOOD,'Stair')
    beam('Stair handrail',(x,-1.3,.98),(x,3.2,4.11),.10,WOOD,'Stair')
    for i in [0,4,8,12,15]:
        y=-1.3+(i+.5)*.28125; z=(i+1)*3.3/16
        beam('Stair baluster',(x,y,z-.03),(x,y,z+.86),.065,WOOD,'Stair')
# Aperture guard at upper west lip; leave north landing open.
beam('Upper opening rail',(-1.16,-1.5,4.2),(-1.16,3.15,4.2),.09,WOOD,'UpperFurnishing')
for y in [-1.5,-.5,.5,1.5,2.5,3.15]:beam('Upper opening guard',(-1.16,y,3.3),(-1.16,y,4.2),.065,WOOD,'UpperFurnishing')
# A resident baker's bunk, chest and wash shelf, with free circulation beside them.
box('Bed frame',(-3.8,-1.3,3.65),(1.65,2.3,.20),WOOD,'UpperFurnishing')
box('Linen mattress',(-3.8,-1.3,3.84),(1.48,2.12,.22),FLOUR,'UpperFurnishing')
box('Folded wool cover',(-3.8,-.9,3.97),(1.49,1.28,.08),HERB,'UpperFurnishing')
box('Pillow',(-3.8,-2.02,4.0),(1.05,.45,.15),FLOUR,'UpperFurnishing')
for x in [-4.5,-3.1]:
    for y in [-2.3,-.3]:box('Bed leg',(x,y,3.54),(.12,.12,.48),WOOD,'UpperFurnishing')
box('Bed headboard',(-3.8,-2.44,4.0),(1.7,.12,.85),WOOD,'UpperFurnishing')
box('Baker chest',(-4.25,1.3,3.69),(1.1,1.35,.78),WOOD,'UpperFurnishing')
for y in [.85,1.75]:box('Chest strap',(-4.25,y,4.09),(1.12,.09,.035),IRON,'UpperFurnishing')
box('Chest clasp',(-3.68,1.3,3.91),(.04,.12,.23),IRON,'UpperFurnishing')
# Carry chimney above raised ridge. Four walls retain hollow bore.
for x in [-3.96,-2.54]:box('Chimney extension',(x,4.03,8.49),(.28,1.72,1.94),STONE,'Chimney')
for y in [3.31,4.75]:box('Chimney extension',(-3.25,y,8.49),(1.16,.28,1.94),STONE,'Chimney')
for o in GROUPS['Chimney']:
    if o.name.startswith('Chimney rim'):o.location.z+=1.94
# Merge per semantic/material; tread names retained for exact mesh measurement.
for group,items in GROUPS.items():
    buckets={}
    for o in items:buckets.setdefault(o.data.materials[0].name,[]).append(o)
    for mi,objects in enumerate(buckets.values()):
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name='Kitchen_'+group+'_'+str(mi)
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
production=[o for o in bpy.context.scene.objects if o.type=='MESH']
tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in production)
mats=set(m.name for o in production for m in o.data.materials)
assert tris<20000 and len(mats)<=24
for t in treads:
    o=bpy.data.objects['Kitchen_Stair_Tread%02d_0'%t['index']];v=[o.matrix_world@v.co for v in o.data.vertices]
    top=max(p.z for p in v);assert abs(top-t['blender'][2])<1e-5
    assert abs(max(p.x for p in v)-min(p.x for p in v)-1.5)<1e-5
# Read actual merged mesh geometry, not nominal constants, for passage measurements.
stairverts=[o.matrix_world@v.co for o in production if o.name.startswith('Kitchen_Stair_') for v in o.data.vertices]
workverts=[o.matrix_world@v.co for o in production if o.name.startswith('Kitchen_Worktable_') for v in o.data.vertices]
workverts=[v for v in workverts if v.x<0]
measuredGap=min(v.x for v in stairverts)-max(v.x for v in workverts)
measuredSouth=min(v.y for v in stairverts)-(-2.845)
assert measuredGap>=.74 and measuredSouth>=1.4
contract={'schema':'holm.kitchen-upper-study.v1','status':'unpublished Blender candidate; no runtime navigation proof','coordinates':'Blender X,Y plan Z up; glTF X,Y,Z = Blender X,Z,-Y','upperFloor':{'top':3.3,'underside':3.16,'aperture':[-1.1,-1.5,.65,3.2],'roomBounds':[-4.87,-2.87,.87,4.87],'wallTop':6.15,'minimumWallHeadroom':2.85},'stairs':{'axis':'Blender +Y / glTF -Z','clearWidth':1.5,'treadDepth':.28125,'rise':3.3/16,'count':16,'treadTopCenters':treads,'bottomLandingBlender':[-.25,-2.1,0],'topLandingBlender':[-.25,4,3.3],'apertureClearAboveFlight':True},'groundApproach':{'southWallInnerY':-2.87,'stairFirstEdgeY':-1.3,'clearSouthDepth':1.545,'preparationToStairSideGap':.88,'courtDoorSpan':[-2.7,-.9],'entryCenter':[1,-1.8,0],'routeSketchBlender':[[1.5,-2.1],[.5,-2.1],[-.25,-2.1],[-1.65,-2.1],[-1.65,.5],[-2.5,.5]],'note':'Design clearance only; nav mesh and real pointer flow pending'},'doorClearances':[{'id':'court-entry','clearWidthBetweenJambs':1.64,'clearHeightAboveThreshold':2.47,'thresholdTop':.07,'lintelUnderside':2.54},{'id':'pantry-connection','width':1.9,'height':2.55}],'mainRoof':{'eave':6.22,'ridge':8.55},'pantryUnchanged':True,'triangleCount':tris,'materialCount':len(mats),'meshCount':len(production),'meshNames':[o.name for o in production],'unfinished':['runtime floor/nav and cardinal follower','door and fire animation','all station bindings and lesson/save QA','reference visual acceptance','Safe Publish']}
bpy.ops.object.select_all(action='DESELECT')
for o in production:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'kitchen-upper.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=False)
glb=(OUT/'kitchen-upper.glb').read_bytes();gltf=json.loads(glb[20:20+struct.unpack_from('<I',glb,12)[0]])
assert len(gltf['images'])==4 and all('bufferView'in i for i in gltf['images'])
contract['geometryMeasurements']={'stairWestX':min(v.x for v in stairverts),'preparationEastX':max(v.x for v in workverts),'preparationSidePassage':measuredGap,'stairSouthY':min(v.y for v in stairverts),'southPassageIncludingRails':measuredSouth,'northLandingDepth':4.845-3.2}
contract['glb']={'bytes':len(glb),'sha256':hashlib.sha256(glb).hexdigest(),'embeddedImages':4,'primitives':sum(len(m['primitives']) for m in gltf['meshes'])}
(OUT/'kitchen-upper.contract.json').write_text(json.dumps(contract,indent=2),encoding='utf-8')
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.resolution_x=1400;scene.render.resolution_y=1100;scene.render.resolution_percentage=100;scene.world.color=(.38,.38,.38);scene.view_settings.view_transform='Standard'
GROUND=mat('Preview olive ground',(.23,.28,.11));box('Preview only ground',(1,1,-.23),(200,200,.1),GROUND,'PreviewOnly')
bpy.ops.object.light_add(type='AREA',location=(-8,-10,16));bpy.context.object.data.energy=1800;bpy.context.object.data.size=12
bpy.ops.object.light_add(type='SUN');bpy.context.object.rotation_euler=(.5,-.5,-.5);bpy.context.object.data.energy=1.4
bpy.ops.object.camera_add(location=(17,-21,18));camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=23
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'kitchen-upper.blend'))
def photo(name,target):
    camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
photo('kitchen-upper-exterior',(.5,1,3.5))
for o in production:
    if o.name.startswith(('Kitchen_Roof_','Kitchen_Chimney_','Kitchen_UpperShell_')):o.hide_render=True
camera.location=(13,-18,23);photo('kitchen-upper-room',(-1,1,3.3))
for o in production:
    if o.name.startswith(('Kitchen_UpperFloor_','Kitchen_UpperFurnishing_','Kitchen_GroundFront_')):o.hide_render=True
photo('kitchen-upper-ground',(-1,1,1.5))
for o in production:o.hide_render=False
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'kitchen-upper.blend'))
print('[KITCHEN_UPPER] measured16 tread tops; width/headroom/budget/4 embedded image checks passed',tris,len(mats))
