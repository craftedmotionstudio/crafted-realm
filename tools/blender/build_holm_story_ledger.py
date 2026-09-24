"""Original static world-prop candidate. Run with Blender 4.5 --background --python."""
import bpy, hashlib, json, math, struct
from pathlib import Path
from mathutils import Matrix, Quaternion, Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.studio-workspaces/holm-story-ledger-v1/candidates'
BASE = ROOT / '.studio-workspaces/holm-quest-lodge-v3/candidates/lodge.blend'
BASE_SHA = '4047f4015447c9dd0a200923afb1b3f14386259fc187d778de76a6964f680b2e'
assert hashlib.sha256(BASE.read_bytes()).hexdigest() == BASE_SHA, 'STOP: lodge base drift'
assert "table(5.45,1.5,.84,.72,1.15,'FurnishingBay')" in (ROOT / 'tools/blender/build_holm_quest_lodge_study.py').read_text(encoding='utf-8')
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
root = bpy.data.objects.new('story_ledger', None)
bpy.context.collection.objects.link(root)

def material(name, rgb):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Roughness'].default_value = .95
    return m

leather = material('Ledger oxblood leather', (.25, .105, .065))
binding = material('Ledger dark binding', (.115, .065, .038))
paper = material('Ledger warm pages', (.76, .665, .435))
ink = material('Ledger faded ink', (.16, .205, .165))
ribbon = material('Ledger red ribbon', (.48, .09, .065))
groups = {}

def mesh(name, vertices, faces, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    ob = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(mat)
    ob.parent = root
    groups.setdefault(mat.name, []).append(ob)
    return ob

def box(name, x0, x1, y0, y1, z0, z1, mat):
    return mesh(name, [(x,y,z) for z in (z0,z1) for y in (y0,y1) for x in (x0,x1)],
                [(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)], mat)

# Two thick covers and a separate recessed binding give the opened silhouette a gutter.
box('left_cover', -.22,-.009,-.315,.315,0,.022,leather)
box('right_cover', .009,.22,-.315,.315,0,.022,leather)
box('spine', -.014,.014,-.313,.313,0,.034,binding)

def page_height(x):
    # Broad facets: a raised page shoulder and a visibly recessed central fold.
    t=abs(x)
    return .044 + (.098-.044)*(t-.013)/(.12-.013) if t<=.12 else .098-(t-.12)*(.098-.074)/(.207-.12)

for side in (-1,1):
    xs=sorted([side*.013,side*.12,side*.207])
    vs=[(x,y,z) for z in (.024,) for y in (-.298,.298) for x in xs]
    vs += [(x,y,page_height(x)) for y in (-.298,.298) for x in xs]
    mesh('page_block',vs,[(0,3,4,1),(1,4,5,2),(6,7,10,9),(7,8,11,10),
                         (0,1,7,6),(1,2,8,7),(3,9,10,4),(4,10,11,5),
                         (0,6,9,3),(2,5,11,8)],paper)
    # Ink rows are actual planar strips, broken at the page shoulder, no tiny text texture.
    for i, (y, length, width) in enumerate([(.20,.13,.012),(.12,.145,.007),(.065,.124,.007),(.01,.14,.007),(-.10,.118,.007),(-.155,.14,.007)]):
        a,b=sorted([side*.04,side*(.04+length)])
        cuts=sorted(set([a,b]+([side*.12] if a<side*.12<b else [])))
        for x0,x1 in zip(cuts,cuts[1:]):
            mesh('ink_row',[(x0,y,page_height(x0)+.0005),(x1,y,page_height(x1)+.0005),
                            (x1,y+width,page_height(x1)+.0005),(x0,y+width,page_height(x0)+.0005)],[(0,1,2,3)],ink)

# Ribbon lies in the fold and turns over the near page edge, staying inside the cover footprint.
mesh('ribbon', [(-.009,.23,.045),(.009,.23,.045),(-.009,-.295,.045),(.009,-.295,.045),
                (-.009,-.307,.027),(.009,-.307,.027),(-.009,-.310,.012),(.009,-.310,.012)],
               [(0,2,3,1),(2,4,5,3),(4,6,7,5)],ribbon)

# Merge each material group to bound draw calls while retaining material semantics.
for name, objects in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects: ob.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    if len(objects)>1: bpy.ops.object.join()
    bpy.context.object.name=name.replace(' ','_')
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'ledger.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'ledger.glb'),export_format='GLB',export_yup=True,export_animations=False)

# Validate exported bytes, with scene transforms, not merely the Blender source mesh.
raw=(OUT/'ledger.glb').read_bytes()
json_len=struct.unpack_from('<I',raw,12)[0]
g=json.loads(raw[20:20+json_len])
bin_start=20+json_len+8
binary=raw[bin_start:]
positions=[]
triangles=0
def visit(index,parent):
    global triangles
    n=g['nodes'][index]
    if 'matrix' in n:
        a=n['matrix']; local=Matrix([[a[c*4+r] for c in range(4)] for r in range(4)])
    else:
        q=n.get('rotation',[0,0,0,1])
        local=Matrix.LocRotScale(Vector(n.get('translation',[0,0,0])),Quaternion((q[3],*q[:3])),Vector(n.get('scale',[1,1,1])))
    world=parent@local
    if 'mesh' in n:
        for primitive in g['meshes'][n['mesh']]['primitives']:
            assert primitive.get('mode',4)==4
            a=g['accessors'][primitive['attributes']['POSITION']]
            assert a['componentType']==5126 and a['type']=='VEC3' and 'sparse' not in a
            v=g['bufferViews'][a['bufferView']]
            offset=v.get('byteOffset',0)+a.get('byteOffset',0)
            for i in range(a['count']):
                p=world@Vector(struct.unpack_from('<fff',binary,offset+i*v.get('byteStride',12)))
                assert all(math.isfinite(c) for c in p)
                positions.append(list(p))
            count=g['accessors'][primitive['indices']]['count'] if 'indices' in primitive else a['count']
            assert count%3==0
            triangles+=count//3
    for child in n.get('children',[]):visit(child,world)
for index in g['scenes'][g.get('scene',0)]['nodes']:visit(index,Matrix.Identity(4))
lower=[min(v[i] for v in positions) for i in range(3)]
upper=[max(v[i] for v in positions) for i in range(3)]
dimensions=[upper[i]-lower[i] for i in range(3)]
assert len([n for n in g['nodes'] if n.get('name')=='story_ledger'])==1
assert abs(lower[1])<1e-7 and dimensions[0]<=.45 and dimensions[2]<=.65 and .07<=dimensions[1]<=.11
assert triangles<=350 and len(g.get('materials',[]))<=5 and not g.get('animations')
contract={'schema':'holm-story-ledger-v1','name':'Ledger of Choices','rootNode':'story_ledger',
          'status':'isolated original Blender prop candidate; not placed, published or visually accepted',
          'baseLodgeBlendSha256':BASE_SHA,'coordinates':'glTF X width, Y up, Z depth; origin on bottom centre',
          'bounds':{'min':lower,'max':upper},'dimensions':dimensions,'triangleCount':triangles,
          'materialCount':len(g['materials']),'primitiveCount':sum(len(m['primitives']) for m in g['meshes']),
          'materials':[m['name'] for m in g['materials']], 'animations':[],
          'glbSha256':hashlib.sha256(raw).hexdigest(),'glbBytes':len(raw),
          'blendSha256':hashlib.sha256((OUT/'ledger.blend').read_bytes()).hexdigest(),
          'validation':'Actual exported POSITION accessors transformed through glTF scene hierarchy; finite bounds, bottom, footprint, height, triangle and material budgets, named root and static animation contract asserted.',
          'visualAcceptance':None,'externalAssets':[]}
(OUT/'contract.json').write_text(json.dumps(contract,indent=2)+'\n',encoding='utf-8')
print('[STORY_LEDGER] exported geometry acceptance PASS',json.dumps(contract))
