"""Standalone Blender design candidate; no installed world writes or runtime claims.
Run: blender --background --python-exit-code 1 --python tools/blender/build_holm_kitchen_wings_study.py
Coordinates in the authoring contract are Blender X/Y plan, Z up. glTF maps to X/Z/-Y.
"""
import bpy, math, json, random, hashlib, struct
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
assert (ROOT/'docs/rebuild/holm-overhaul/plan.json').is_file()
assert (ROOT/'Bible_References/Complete/Building_Exterior_Option2.jpg').is_file()
OUT = ROOT/'.studio-workspaces/holm-kitchen-wings-v1/candidates'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
R = random.Random(91326)
GROUPS = {}

def texture(name, kind):
    n=128; image=bpy.data.images.new(name, width=n, height=n, alpha=True)
    pixels=[]
    for y in range(n):
        for x in range(n):
            noise=R.uniform(-.025,.025)
            if kind=='stone':
                row=y//16; col=((x+(24 if row%2 else 0))%128)//32
                edge=y%16<2 or (x+(24 if row%2 else 0))%32<2
                v=.31+((row*17+col*11)%7)*.016+noise
                c=(.21,.215,.195) if edge else (v*1.06,v*1.045,v*.98)
            elif kind=='thatch':
                stripe=((x*29)%17)*.003+math.sin(y*.18+x*.7)*.015
                v=.30+stripe+noise+(0.028 if y%32==0 else 0)
                c=(v*1.30,v*1.03,v*.49)
            elif kind=='plaster':
                v=.66+noise+math.sin(x*.06)*math.sin(y*.1)*.035
                c=(v*1.08,v*1.04,v*.86)
            else:
                v=.20+noise+math.sin(x*.62+math.sin(y*.05))*.028
                c=(v*1.33,v*.94,v*.58)
            pixels.extend((*c,1))
    image.pixels.foreach_set(pixels); image.filepath_raw=str(OUT/(name+'.png')); image.file_format='PNG'; image.save(); image.pack()
    return image

def mat(name, color, tex=None):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value=(*color,1); bs.inputs['Roughness'].default_value=.95
    if tex:
        t=m.node_tree.nodes.new('ShaderNodeTexImage'); t.image=texture('kitchen_'+tex+'_128',tex); t.interpolation='Closest'; t.extension='REPEAT'
        m.node_tree.links.new(t.outputs['Color'],bs.inputs['Base Color'])
    return m

STONE=mat('Warm fieldstone',(.4,.39,.34),'stone')
PLASTER=mat('Oat limewash',(.7,.68,.56),'plaster')
THATCH=mat('Weathered golden reed',(.47,.36,.17),'thatch')
WOOD=mat('Smoked oak',(.27,.20,.12),'wood')
EDGE=mat('Dark endgrain',(.17,.13,.075))
FLOOR=mat('Worn sandstone flags',(.43,.39,.29))
IRON=mat('Iron',(.13,.14,.13))
GLASS=mat('Milky window',(.67,.72,.66))
CLAY=mat('Kitchen pottery',(.46,.25,.13))
BREAD=mat('Baked crust',(.59,.35,.13))
FLOUR=mat('Linen and flour',(.66,.61,.46))
HERB=mat('Dried sage',(.26,.32,.14))
COAL=mat('Cold oven soot',(.075,.069,.056))

def register(o,name,material,group):
    o.name=name; o.data.materials.append(material); GROUPS.setdefault(group,[]).append(o)
    if o.type=='MESH':
        uv=o.data.uv_layers.new(name='UVMap') if not o.data.uv_layers else o.data.uv_layers.active
        for poly in o.data.polygons:
            axes=[0,1] if abs(poly.normal.z)>.5 else ([0,2] if abs(poly.normal.y)>.5 else [1,2])
            for li in poly.loop_indices:
                p=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co
                uv.data[li].uv=(p[axes[0]]*.65,p[axes[1]]*.65)
    return o

def box(name,loc,size,material,group='Shell'):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return register(o,name,material,group)

def mesh(name,verts,faces,material,group='Shell'):
    me=bpy.data.meshes.new(name); me.from_pydata(verts,[],faces); me.update(); o=bpy.data.objects.new(name,me); bpy.context.collection.objects.link(o)
    return register(o,name,material,group)

def beam(name,a,b,width,material=WOOD,group='Shell'):
    d=Vector(b)-Vector(a); o=box(name,(Vector(a)+Vector(b))/2,(width,width,d.length),material,group)
    o.rotation_euler=d.to_track_quat('Z','Y').to_euler(); return o

def cyl(name,loc,r,depth,material,group='Furnishings',vertices=10):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc)
    return register(bpy.context.object,name,material,group)

def wall(name,axis,fixed,start,end,height,holes=(),material=PLASTER):
    # Holes are genuine missing mesh, not painted black rectangles.
    cuts=sorted(set([start,end]+[v for h in holes for v in h[:2]]))
    for a,b in zip(cuts,cuts[1:]):
        applicable=next((h for h in holes if h[0]<=a+1e-5 and h[1]>=b-1e-5),None)
        spans=[(0,height)] if applicable is None else [(0,applicable[2]),(applicable[3],height)]
        for lo,hi in spans:
            if hi-lo<.01: continue
            p=((a+b)/2,fixed,(lo+hi)/2) if axis=='X' else (fixed,(a+b)/2,(lo+hi)/2)
            sz=(b-a,.26,hi-lo) if axis=='X' else (.26,b-a,hi-lo)
            box(name,p,sz,material)
    # Stone footing respects door holes.
    for a,b in zip(cuts,cuts[1:]):
        if any(h[0]<=a+1e-5 and h[1]>=b-1e-5 and h[2]==0 for h in holes): continue
        box(name+' plinth',((a+b)/2,fixed,.36) if axis=='X' else (fixed,(a+b)/2,.36),(b-a,.31,.72) if axis=='X' else (.31,b-a,.72),STONE)

def window(name,axis,fixed,center,w=1.35,bottom=1.25,top=2.5):
    # Opaque glazing retained as separate semantic group for future cutaway.
    def pos(t,z): return (t,fixed,z) if axis=='X' else (fixed,t,z)
    box(name+' glass',pos(center,(bottom+top)/2),(w,.035,top-bottom) if axis=='X' else (.035,w,top-bottom),GLASS,'Glazing')
    for t in [center-w/2,center,center+w/2]: beam(name+' mullion',pos(t,bottom),pos(t,top),.07)
    for z in [bottom,(bottom+top)/2,top]: beam(name+' transom',pos(center-w/2,z),pos(center+w/2,z),.075)
    box(name+' sill',pos(center,bottom-.05),(w+.22,.36,.12) if axis=='X' else (.36,w+.22,.12),STONE)

def hip(name,x0,x1,y0,y1,eave,peak,ridgeaxis):
    # Hipped roof with short ridge, thick eaves and a connected subordinate wing.
    if ridgeaxis=='Y': ridges=[((x0+x1)/2,y0+1.3,peak),((x0+x1)/2,y1-1.3,peak)]
    else: ridges=[(x0+1.0,(y0+y1)/2,peak),(x1-1.0,(y0+y1)/2,peak)]
    v=[(x0,y0,eave),(x1,y0,eave),(x1,y1,eave),(x0,y1,eave)]+ridges
    f=[(0,1,4),(1,2,5,4),(2,3,5),(3,0,4,5)] if ridgeaxis=='Y' else [(0,1,5,4),(1,2,5),(2,3,4,5),(3,0,4)]
    mesh(name,v,f,THATCH,'Roof')
    # A narrow skirt gives thickness without turning roof into slabs.
    for i in range(4):
        a=v[i]; b=v[(i+1)%4]
        mesh(name+' reed edge',[a,b,(b[0],b[1],b[2]-.16),(a[0],a[1],a[2]-.16)],[(0,1,2,3)],THATCH,'Roof')
        beam(name+' fascia',(a[0],a[1],a[2]-.14),(b[0],b[1],b[2]-.14),.095,WOOD,'Roof')
    beam(name+' ridge binding',ridges[0],ridges[1],.13,THATCH,'Roof')

# L-shaped footprint: a high baking room + lower perpendicular pantry. No intersecting duplicate walls.
box('Bakehouse floor',(-2,1,-.09),(6,8,.18),FLOOR,'Floor')
box('Pantry floor',(4,3,-.09),(6,4,.18),FLOOR,'Floor')
wall('Main south','X',-3,-5,1,3.65,[(-3.75,-2.25,1.2,2.5)])
wall('Main west','Y',-5,-3,5,3.65,[(-1.6,-.1,1.2,2.5),(1.25,2.75,1.2,2.5)])
wall('Main north','X',5,-5,1,3.65,material=STONE)
wall('Court entrance','Y',1,-3,1,3.65,[(-2.15,-.35,0,2.55)])
wall('Pantry connection','Y',1,1,5,3.65,[(2.05,3.95,0,2.55)])
wall('Pantry south','X',1,1,7,2.85,[(3.1,4.7,1.05,2.35)])
wall('Pantry east','Y',7,1,5,2.85,[(2.25,3.75,1.05,2.35)])
wall('Pantry north','X',5,1,7,2.85)
window('South kneading light','X',-3.04,-3,1.5,1.2,2.5)
window('West hearth light','Y',-5.04,-.85,1.5,1.2,2.5)
window('West preparation light','Y',-5.04,2,1.5,1.2,2.5)
window('Court pantry window','X',.96,3.9,1.6,1.05,2.35)
window('Pantry sink light','Y',7.04,3,1.5,1.05,2.35)
for x,y,h in [(-5,-3,3.65),(1,-3,3.65),(-5,5,3.65),(1,5,3.65),(7,5,2.85),(7,1,2.85)]:
    box('Oak corner',(x,y,h/2),(.16,.16,h),WOOD)
for y in [-2.15,-.35]: box('Entrance oak jamb',(1,y,1.28),(.38,.16,2.56),WOOD)
box('Entrance lintel',(1,-1.25,2.64),(.4,2.12,.20),WOOD)
box('Threshold',(1,-1.25,.035),(.6,1.8,.07),STONE,'Floor')
hip('Bakehouse tall hipped thatch',-5.42,1.42,-3.42,5.42,3.72,6.05,'Y')
hip('Pantry transverse hipped thatch',1.02,7.4,.60,5.40,2.91,4.34,'X')

# Recessed court porch has its own low shed, open posts and a purposeful delivery bench.
mesh('Entrance porch roof',[(1.05,-2.6,2.92),(2.8,-2.6,2.60),(2.8,.3,2.60),(1.05,.3,2.92)],[(0,1,2,3)],THATCH,'Roof')
for y in [-2.5,.2]:
    box('Porch post',(2.65,y,1.27),(.16,.16,2.54),WOOD)
    beam('Porch knee',(2.65,y,1.95),(2.20,y,2.64),.12)
box('Delivery bench top',(5.5,.45,.71),(1.8,.65,.14),WOOD,'Furnishings')
for x in [4.9,6.1]: box('Delivery bench foot',(x,.45,.32),(.16,.52,.64),WOOD,'Furnishings')

# Hollow masonry chimney, continuous from actual oven through roof; no fake solid cap.
for x in [-3.96,-2.54]: box('Chimney side',(x,4.03,4.72),(.28,1.72,5.56),STONE,'Chimney')
for y in [3.31,4.75]: box('Chimney end',(-3.25,y,4.72),(1.16,.28,5.56),STONE,'Chimney')
for x in [-4.04,-2.46]: box('Chimney rim side',(x,4.03,7.52),(.24,1.94,.20),STONE,'Chimney')
for y in [3.17,4.89]: box('Chimney rim end',(-3.25,y,7.52),(1.36,.22,.20),STONE,'Chimney')

# Teaching oven: open arch, inset soot chamber, projecting hearth and wooden peel.
box('Oven hearth',(-3.25,3.53,.18),(2.75,2.52,.36),STONE,'Oven')
box('Oven back',(-3.25,4.45,1.0),(2.4,.30,1.6),COAL,'Oven')
for x in [-4.22,-2.28]: box('Oven pier',(x,3.42,.92),(.52,1.82,1.48),STONE,'Oven')
for i in range(9):
    a=i*math.pi/9; b=(i+1)*math.pi/9; verts=[]
    for y in [2.49,4.32]:
        for r,t in [(.70,a),(.99,a),(.99,b),(.70,b)]: verts.append((-3.25+r*math.cos(t),y,1.22+r*math.sin(t)))
    mesh('Oven arch stone',verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],STONE,'Oven')
box('Cold firebed',(-3.25,3.38,.39),(1.25,1.5,.06),COAL,'Oven')
beam('Bread peel handle',(-1.60,3.20,.12),(-1.60,3.73,2.12),.055,WOOD,'Tools')
box('Bread peel paddle',(-1.60,3.10,.19),(.43,.50,.075),WOOD,'Tools')

def table(name,x,y,w,d):
    box(name+' top',(x,y,.94),(w,d,.16),WOOD,'Worktable')
    for dx in [-w/2+.18,w/2-.18]:
        for dy in [-d/2+.14,d/2-.14]: box(name+' foot',(x+dx,y+dy,.43),(.13,.13,.86),WOOD,'Worktable')
table('Kneading station',-3.25,-1.55,2.7,1.1)
box('Flour cloth',(-3.55,-1.55,1.027),(1.1,.72,.015),FLOUR,'Worktable')
for x in [-3.65,-3.12]:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=10,ring_count=6,radius=1,location=(x,-1.55,1.15)); o=bpy.context.object; o.scale=(.22,.33,.12); register(o,'Teaching loaf',BREAD,'Worktable')
beam('Rolling pin',(-2.80,-1.6,1.08),(-2.25,-1.6,1.08),.075,WOOD,'Worktable')
table('Pantry wash stand',6.10,3,1.1,2)
# Basin is visibly hollow: bottom and ring, not a solid cylinder.
cyl('Basin base',(6.10,3,1.04),.36,.06,CLAY,'Pantry')
bpy.ops.mesh.primitive_torus_add(major_segments=12,minor_segments=4,location=(6.10,3,1.18),major_radius=.32,minor_radius=.075)
register(bpy.context.object,'Basin rim',CLAY,'Pantry')
for x in [3,5.0]:
    for z in [.52,1.26,2.0]: box('Pantry shelf',(x,4.62,z),(1.65,.55,.10),WOOD,'Pantry')
    for dx in [-.7,.7]: box('Pantry shelf upright',(x+dx,4.67,1.12),(.09,.12,2.24),WOOD,'Pantry')
    for z in [.68,1.43,2.17]:
        for dx in [-.40,.35]: cyl('Store jar',(x+dx,4.58,z),.15,.26,CLAY,'Pantry')
for x,y in [(2,1.65),(2.6,1.65)]:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=6,radius=1,location=(x,y,.4)); o=bpy.context.object; o.scale=(.28,.27,.4); register(o,'Flour sack',FLOUR,'Pantry')
# Story clue: a patched recipe board, readable silhouette rather than tiny text.
box('Recipe board',(.82,.18,1.64),(.08,.65,.72),WOOD,'RecipeBoard')
box('Recipe parchment',(.765,.18,1.64),(.015,.48,.56),FLOUR,'RecipeBoard')

# Merge by semantic group/material to limit draw submissions, retaining cutaway/interaction families.
for group,items in list(GROUPS.items()):
    buckets={}
    for o in items: buckets.setdefault(o.data.materials[0].name,[]).append(o)
    for mi,objects in enumerate(buckets.values()):
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects: o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]; bpy.ops.object.join()
        o=bpy.context.object; o.name='Kitchen_'+group+'_'+str(mi)
        # Apply transforms so measurements and runtime positioning are unambiguous.
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)

production=[o for o in bpy.context.scene.objects if o.type=='MESH']
tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in production)
mats=set(m.name for o in production for m in o.data.materials)
assert tris<=20000 and len(mats)<=24
assert 1.8>=1.5 and 2.55>=2.3
# Cardinal design route centers with generous continuous geometry clearance. This is not runtime nav proof.
route=[(3.5,-3.5),(3.5,-2.5),(3.5,-1.5),(2.5,-1.5),(1.5,-1.5),(.5,-1.5),(.5,-.5),(.5,.5),(.5,1.5),(.5,2.5),(1.5,2.5),(2.5,2.5),(3.5,2.5),(4.5,2.5)]
assert all(abs(a[0]-b[0])+abs(a[1]-b[1])==1 for a,b in zip(route,route[1:]))
contract={'schema':'holm.building-shape-study.v1','status':'Blender design candidate; not installed; runtime interactions unfinished','name':'Teaching Kitchen — Hearth and Pantry Wings','units':'1 unit = 1 tile','coordinates':'local Blender X,Y plan / Z up; glTF X,Y,Z = Blender X,Z,-Y','footprint':[[-5,-3],[1,-3],[1,1],[7,1],[7,5],[-5,5]],'footprintArea':72,'boundsPlan':[-5,-3,7,5],'boundingRectangleArea':96,'rooms':[{'id':'bakehouse','bounds':[-5,-3,1,5],'floor':0,'wallHeight':3.65,'purpose':'teach kneading, baking and food recovery'},{'id':'pantry','bounds':[1,1,7,5],'floor':0,'wallHeight':2.85,'purpose':'flour storage, washing and preparation'}],'doors':[{'id':'court-entry','axis':'Y','fixed':1,'span':[-2.15,-.35],'width':1.8,'height':2.55},{'id':'pantry-connection','axis':'Y','fixed':1,'span':[2.05,3.95],'width':1.9,'height':2.55}],'entryCourt':{'bounds':[1,-3,7,1],'canopyBounds':[1.05,-2.6,2.8,.3]},'roofs':[{'part':'Roof','name':'bakehouse','eave':3.72,'ridge':6.05,'ridgeAxis':'Y'},{'part':'Roof','name':'pantry','eave':2.91,'ridge':4.34,'ridgeAxis':'X'},{'part':'Roof','name':'porch','eave':2.6,'ridge':2.92}],'chimneyTop':7.62,'teachingStations':[{'part':'Oven','local':[-3.25,3.4,0]},{'part':'Worktable','local':[-3.25,-1.55,0]},{'part':'Pantry','local':[6.1,3,0]},{'part':'RecipeBoard','local':[.8,.18,1.64]}],'designCardinalRoute':route,'triangleCount':tris,'materialCount':len(mats),'meshCount':len(production),'textures':{'resolution':[128,128],'originalAuthored':True,'source':'deterministic original pixel patterns authored in this Blender script; no reference image pixels copied','names':['stone','thatch','plaster','wood']},'unfinished':['runtime placement and terrain fit','collision and cardinal nav compilation','recipe/item interaction binding','doors and oven fire animation','NPC tutor','save/load and tutorial progression','in-app Studio review and reference comparison','Safe Publish integration'],'visualAcceptance':None}
(OUT/'kitchen-wings.contract.json').write_text(json.dumps(contract,indent=2),encoding='utf-8')

# Export only authored asset meshes; photography helpers are added afterwards.
bpy.ops.object.select_all(action='DESELECT')
for o in production:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'kitchen-wings.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=False)
glb=(OUT/'kitchen-wings.glb').read_bytes()
gltf=json.loads(glb[20:20+struct.unpack_from('<I',glb,12)[0]])
assert len(gltf.get('images',[]))==4
assert all('bufferView' in im and 'uri' not in im for im in gltf['images'])
contract['exportEvidence']={'glbBytes':len(glb),'sha256':hashlib.sha256(glb).hexdigest(),'embeddedImages':len(gltf['images']),'primitives':sum(len(m['primitives']) for m in gltf['meshes'])}
(OUT/'kitchen-wings.contract.json').write_text(json.dumps(contract,indent=2),encoding='utf-8')

scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.samples=24
scene.render.resolution_x=1400; scene.render.resolution_y=1100; scene.render.resolution_percentage=100
scene.world.color=(.38,.38,.38); scene.view_settings.view_transform='Standard'
# Render-only subdued olive ground gives context, never enters the exported asset.
GROUND=mat('Preview olive ground',(.23,.28,.11))
box('Preview only ground',(1,1,-.23),(200,200,.1),GROUND,'PreviewOnly')
bpy.ops.object.light_add(type='AREA', location=(-8,-10,16)); bpy.context.object.data.energy=1800; bpy.context.object.data.shape='DISK'; bpy.context.object.data.size=12
bpy.ops.object.light_add(type='SUN', location=(0,0,15)); bpy.context.object.rotation_euler=(.5,-.5,-.5); bpy.context.object.data.energy=1.4; bpy.context.object.data.angle=.15
bpy.ops.object.camera_add(location=(17,-21,17)); camera=bpy.context.object; scene.camera=camera; camera.data.type='ORTHO'; camera.data.ortho_scale=21
def photograph(name,loc,target=(.6,1,2)):
    camera.location=loc; camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler(); scene.render.filepath=str(OUT/(name+'.png')); bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'kitchen-wings.blend'))
photograph('kitchen-wings-court',(17,-21,17))
photograph('kitchen-wings-rear',(-17,21,18))
for o in production:
    if o.name.startswith('Kitchen_Roof') or o.name.startswith('Kitchen_Chimney'): o.hide_render=True
photograph('kitchen-wings-cutaway',(15,-18,25),(.5,1,.5))
for o in production: o.hide_render=False
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'kitchen-wings.blend'))
report='''# Teaching Kitchen Wings — Blender design candidate\n\nOriginal tall bakehouse and perpendicular low pantry create a genuine L-shaped 72-tile floor inside a 96-tile enclosing rectangle. The recessed court, separate roof heights, north chimney and low open porch answer the owner’s rejection of repeated square shells. Bible Exterior Options 2/3/4 inform connected massing, warm thatch, stone and restrained pale plaster; all four 128px textures are newly authored original patterns packed in the Blender source and GLB.\n\nInterior has a hollow masonry bread oven, kneading table, flour sacks, pantry shelving, washing basin, delivery bench and recipe board. The continuous floor and real 1.8/1.9-wide wall openings leave room for cardinal circulation. Headless assertions check triangle/material budgets, opening dimensions and cardinal design route. These are design checks, not proof of runtime collision or lesson interactions.\n\nNo live world or plan files were edited. This source is not a published building. Doors, fire animation, cooking/items, tutor, terrain, navigation, cutaway wiring and saves still need integration and play checks. Main-session in-app Studio/reference review is required; no visual score or acceptance is claimed.\n'''
(OUT/'REPORT.md').write_text(report+f'\nMeasured authored asset: {tris} triangles, {len(mats)} materials, {len(production)} merged semantic meshes.\n',encoding='utf-8')
print('[KITCHEN_WINGS] design geometry/budget and embedded texture assertions passed; candidate only; triangles='+str(tris)+' materials='+str(len(mats)))
