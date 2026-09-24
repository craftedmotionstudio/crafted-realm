"""Blender-authored arrival props. Candidate exports only; no world placements.

Run with Blender --background --python-exit-code 1 --python this_file.
Plan coordinates are game x/y-up/z, converted to Blender x/-z/y.
"""
import bpy, bmesh, json, math, random, hashlib, struct
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
assert (ROOT/'docs/rebuild/holm-overhaul/arrival-layout.json').exists()
assert (ROOT/'tools/blender/build_holm_guide_house_overhaul_v1.py').exists()
OUT = ROOT/'.studio-workspaces/holm-landing-props-v1/candidates'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

def material(name, color):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*color, 1)
    m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .92
    return m

oak = material('Landing aged oak', (.30,.20,.12))
cut = material('Landing cut oak', (.43,.32,.20))
rope = material('Landing flax rope', (.57,.49,.31))
iron = material('Landing dark iron', (.15,.17,.15))
stones = [material('Landing fieldstone '+str(i), c) for i,c in enumerate([
    (.43,.46,.40),(.52,.54,.46),(.37,.40,.35),(.46,.45,.37)])]
active_root = None

def mesh(name, vertices, faces, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata([(x,-z,y) for x,y,z in vertices], [], faces)
    data.update()
    bm = bmesh.new(); bm.from_mesh(data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(data); bm.free()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.parent = active_root
    obj.data.materials.append(mat)
    return obj

def box(name, center, size, mat, bevel=.025):
    x,y,z = center; a,b,c = [s/2 for s in size]
    o = mesh(name, [(x+dx*a,y+dy*b,z+dz*c) for dx,dy,dz in
        [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]],
        [(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)], mat)
    if bevel:
        bpy.context.view_layer.objects.active = o
        mod = o.modifiers.new('Hand softened edges', 'BEVEL'); mod.width=bevel; mod.segments=1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return o

def tube(name, points, radius, mat, sides=6):
    verts=[]; faces=[]
    for i,p in enumerate(points):
        axis = Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])
        axis.normalize(); side=axis.cross(Vector((0,1,0)))
        if side.length < .01: side=axis.cross(Vector((1,0,0)))
        side.normalize(); up=axis.cross(side).normalized()
        for j in range(sides):
            angle=j*math.tau/sides
            verts.append(tuple(Vector(p)+radius*(side*math.cos(angle)+up*math.sin(angle))))
    for i in range(len(points)-1):
        for j in range(sides):
            a=i*sides+j; b=i*sides+(j+1)%sides
            faces.append((a,b,b+sides,a+sides))
    faces.extend([tuple(reversed(range(sides))),tuple((len(points)-1)*sides+j for j in range(sides))])
    return mesh(name,verts,faces,mat)

def wall():
    rng=random.Random(514)
    # Three fitted, staggered courses: generous base, narrower coping. Individual
    # corner clips and tilted upper rings avoid a stack of identical cubes.
    for row in range(3):
        count=[6,7,6][row]; weights=[rng.uniform(.75,1.25) for _ in range(count)]
        length=3-.06*row; left=-length/2
        for n,w in enumerate(weights):
            width=length*w/sum(weights); right=left+width
            low=row*.26+.006; high=(row+1)*.26-.007
            depth=.60-row*.08; clip=.055
            outline=[(left+.01+clip,-depth/2),(right-.01-clip,-depth/2),
                (right-.01,-depth/2+clip),(right-.01,depth/2-clip),
                (right-.01-clip,depth/2),(left+.01+clip,depth/2),
                (left+.01,depth/2-clip),(left+.01,-depth/2+clip)]
            vertices=[(x,low,z) for x,z in outline]
            for x,z in outline:
                vertices.append((x+rng.uniform(-.012,.012), high+rng.uniform(-.012,.012), z+rng.uniform(-.013,.013)))
            mesh('Fitted rubble',vertices,[tuple(reversed(range(8))),tuple(range(8,16))]+
                 [(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)],stones[rng.randrange(4)])
            left=right

def bench():
    # Two broad seat boards, splayed trestles, pegged stretcher and back rail.
    for z in [-.145,.145]: box('Seat board',(0,.45,z),(2,.10,.275),cut,.018)
    for x in [-.69,.69]:
        for z in [-.20,.20]:
            tube('Splayed oak leg',[(x,.035,z*1.3),(x,.43,z)],.09,oak,4)
        box('Trestle crosspiece',(x,.37,0),(.16,.13,.62),oak)
    box('Low stretcher',(0,.21,0),(1.55,.12,.12),oak,.014)
    for x in [-.77,.77]:
        box('Back upright',(x,.73,-.25),(.11,.83,.12),oak,.014)
        tube('Oak peg',[(x,.37,-.34),(x,.37,-.30)],.025,cut)
    box('Shaped back rail',(0,.98,-.265),(1.93,.20,.10),cut,.04)

def waypost():
    box('Oak post',(0,1.10,0),(.20,2.20,.20),oak,.038)
    # Asymmetric hand-cut arrow profile; deliberately no text or invented lore.
    shape=[(-.64,1.54),(.43,1.56),(.43,1.43),(.83,1.70),(.43,1.94),(.43,1.83),(-.64,1.80)]
    mesh('Carved direction arrow',[(x,y,z) for z in [-.19,-.08] for x,y in shape],
         [tuple(reversed(range(7))),tuple(range(7,14))]+[(i,(i+1)%7,(i+1)%7+7,i+7) for i in range(7)],cut)
    for y in [1.60,1.70,1.80]:
        tube('Rope lashing',[(-.13,y,-.215),(.13,y,-.215),(.145,y,-.07),(.13,y,.13),(-.13,y,.13),(-.145,y,-.07),(-.13,y,-.215)],.018,rope)
    tube('Tied rope end',[(.12,1.63,-.225),(.18,1.55,-.23),(.14,1.42,-.23)],.019,rope)

def crate():
    # Planked cargo case, raised corner battens and two continuous rope hoops.
    box('Dark case core',(0,.39,0),(.84,.74,.70),oak,.015)
    for x in [-.315,-.105,.105,.315]:
        for z in [-.365,.365]:box('Face plank',(x,.39,z),(.198,.70,.045),cut,.010)
        box('Lid plank',(x,.78,0),(.198,.05,.74),cut,.010)
    for x in [-.45,.45]:
        for z in [-.31,.31]:box('Corner batten',(x,.39,z),(.065,.78,.11),oak,.015)
    for x in [-.25,.25]:
        tube('Cargo rope hoop',[(x,.04,-.40),(x,.76,-.40),(x,.825,-.34),(x,.825,.34),
             (x,.76,.40),(x,.04,.40),(x,.012,.34),(x,.012,-.34),(x,.04,-.40)],.024,rope)
    tube('Lid cross tie',[(-.46,.82,0),(-.25,.844,0),(0,.85,0),(.25,.844,0),(.46,.82,0)],.022,rope)
    tube('Knot loop',[(0,.85,0),(.08,.86,-.04),(.10,.87,.04),(0,.85,0),(-.07,.86,.06),(-.10,.87,-.02),(0,.85,0)],.019,rope)

manifest={'schema':1,'status':'candidate-unreviewed','units':'tiles','upAxis':'Y',
    'source':'tools/blender/build_holm_landing_props_v1.py','blenderVersion':bpy.app.version_string,
    'references':['Bible_References/INVENTORY.md','Bible_References/Complete/Crates+More.jpg',
                  'Bible_References/Complete/Ruins.jpg','Bible_References/Town_Square.jpg'],
    'worldPlacements':[], 'assets':[]}
assets=[('LandingGardenWall',wall),('LandingOakBench',bench),('LandingWaypost',waypost),('LandingCargoCrate',crate)]
for index,(root_id,build) in enumerate(assets):
    scene=bpy.context.scene if index==0 else bpy.data.scenes.new(root_id+'Scene')
    bpy.context.window.scene=scene; scene.name=root_id+'Scene'
    active_root=bpy.data.objects.new(root_id,None);scene.collection.objects.link(active_root)
    build()
    # A single mesh per palette slot: repeated stones/planks never cost one draw each.
    pieces=list(active_root.children)
    groups={mat.name:[o for o in pieces if o.data.materials[0]==mat] for mat in set(o.data.materials[0] for o in pieces)}
    for mat_name,group in sorted(groups.items()):
        bpy.ops.object.select_all(action='DESELECT')
        for o in group:o.select_set(True)
        bpy.context.view_layer.objects.active=group[0]
        if len(group)>1:bpy.ops.object.join()
        group[0].name=root_id+'_'+mat_name.replace(' ','_')
    children=list(active_root.children);points=[];triangles=0
    bottom=min(v.co.z for o in children for v in o.data.vertices)
    for o in children:
        for v in o.data.vertices:v.co.z-=bottom
    for o in children:
        o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
        for v in o.data.vertices:
            p=o.matrix_world@v.co;points.append((p.x,p.z,-p.y))
    assert all(math.isfinite(v) for p in points for v in p)
    low=[min(p[a] for p in points) for a in range(3)]
    high=[max(p[a] for p in points) for a in range(3)]
    assert len(children)<=5 and len({m.name for o in children for m in o.data.materials})<=4
    assert low[1]>=-.02 and high[1]>0
    bpy.ops.object.select_all(action='SELECT')
    path=OUT/(['wall.glb','bench.glb','waypost.glb','cargo.glb'][index])
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False)
    raw=path.read_bytes();json_size=struct.unpack_from('<I',raw,12)[0]
    gltf=json.loads(raw[20:20+json_size])
    assert [gltf['nodes'][n]['name'] for n in gltf['scenes'][gltf.get('scene',0)]['nodes']]==[root_id], 'Leaked other asset scene'
    assert len(gltf['meshes'])==len(children) and len(gltf['materials'])<=4
    assert sum(gltf['accessors'][p['indices']]['count']//3 for m in gltf['meshes'] for p in m['primitives'])==triangles
    manifest['assets'].append({'rootId':root_id,'file':path.name,'triangles':triangles,'meshes':len(children),
        'materials':sorted({m.name for o in children for m in o.data.materials}),
        'bounds':{'min':low,'max':high},'dimensions':[high[a]-low[a] for a in range(3)],
        'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
        'animations':[], 'purpose':{'LandingGardenWall':'Garden boundary; keep outside route clearance',
            'LandingOakBench':'Arrival rest seating','LandingWaypost':'Direction cue; arrow points local +X',
            'LandingCargoCrate':'Landing cargo and occupation evidence'}[root_id]})
assert sum(a['triangles'] for a in manifest['assets'])<6000
bpy.context.window.scene=bpy.data.scenes['LandingGardenWallScene']
blend=OUT/'holm_landing_props_v1.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
manifest['editableBlend']=blend.name
manifest['blendSha256']=hashlib.sha256(blend.read_bytes()).hexdigest()
manifest['totalTriangles']=sum(a['triangles'] for a in manifest['assets'])
manifest['tests']={'finiteCoordinates':True,'groundedOrigins':True,'meshBudget':True,
    'materialBudget':True,'totalTriangleBudget':True,'visualAcceptance':'pending Studio review'}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print('[HOLM_LANDING_PROPS] 5/5 technical acceptance checks passed; '+str(manifest['totalTriangles'])+' triangles; visual review pending')
