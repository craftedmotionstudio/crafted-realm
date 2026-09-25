"""Local teaching-tool furniture. Blender background builder; no world placement.

v2 (2026-09-25 z-fighting sweep): the bronze hatchet blade stops at the inner curve of the ochre cutting edge
instead of sharing its outer faces (the two coloured faces fought along the edge). Everything else is v1; the
manifest keeps the contract id holm-provision-rack-v1 that src/holm_arrival_provisions.js checks, with revision 2.

Coordinates are game X/Y-up/Z, converted to Blender X/-Z/Y. The exported
glTF front is +Z. Static tools are secured to the rack, not loose physics props.
"""
import bpy
import bmesh
import json
import math
import struct
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.studio-workspaces/holm-provision-rack-v2/candidates'
OUT.mkdir(parents=True, exist_ok=True)
PALETTE = {
    'Oak heart': (.29, .18, .095), 'Oak cut edges': (.46, .31, .16),
    'Oak dark joints': (.16, .095, .05), 'Forged iron': (.23, .26, .25),
    'Warm bronze': (.49, .275, .12), 'Hemp cord': (.61, .53, .34),
    'Oiled leather': (.37, .19, .095), 'Teaching ochre': (.66, .43, .16),
}
DIMENSIONS = {'width': 1.6, 'depth': .55, 'height': 1.7}
bpy.ops.wm.read_factory_settings(use_empty=True)
materials = {}
for name, rgb in PALETTE.items():
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*rgb, 1)
    shader.inputs['Roughness'].default_value = .87
    materials[name] = mat
families = {}


def mesh(family, points, faces, material):
    data = bpy.data.meshes.new(family)
    data.from_pydata([(x, -z, y) for x, y, z in points], [], faces)
    data.update()
    bm = bmesh.new()
    bm.from_mesh(data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(data)
    bm.free()
    obj = bpy.data.objects.new(family, data)
    bpy.context.collection.objects.link(obj)
    data.materials.append(materials[material])
    families.setdefault(family, []).append(obj)
    return obj


def profile(family, outline, z0, z1, material):
    count = len(outline)
    points = [(x, y, z) for z in (z0, z1) for x, y in outline]
    faces = [tuple(reversed(range(count))), tuple(range(count, 2 * count))]
    faces += [(i, (i + 1) % count, (i + 1) % count + count, i + count) for i in range(count)]
    return mesh(family, points, faces, material)


def box(family, x0, x1, y0, y1, z0, z1, material, bevel=.01):
    b = min(bevel, (x1-x0)/3, (y1-y0)/3)
    return profile(family, [(x0+b,y0),(x1-b,y0),(x1,y0+b),(x1,y1-b),
                           (x1-b,y1),(x0+b,y1),(x0,y1-b),(x0,y0+b)], z0,z1,material)


def rod(family, a, b, radius, material, sides=6):
    axis = (Vector(b)-Vector(a)).normalized()
    side = axis.cross(Vector((0,0,1)))
    if side.length < .01:
        side = axis.cross(Vector((1,0,0)))
    side.normalize()
    up = axis.cross(side).normalized()
    points = [tuple(Vector(p)+radius*(side*math.cos(i*math.tau/sides)+up*math.sin(i*math.tau/sides)))
              for p in (a,b) for i in range(sides)]
    faces = [tuple(reversed(range(sides))), tuple(range(sides, 2*sides))]
    faces += [(i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides)]
    return mesh(family,points,faces,material)


# Splayed shoe feet and chamfered uprights support a shaped oak crest.
for x in (-.66,.66):
    box('ProvisionsRack',x-.14,x+.14,0,.115,-.275,.275,'Oak heart',.04)
    profile('ProvisionsRack',[(x-.085,.07),(x+.085,.07),(x+.066,1.49),
                             (x+.10,1.56),(x,1.64),(x-.10,1.56),(x-.066,1.49)],
            -.105,.055,'Oak heart')
    box('ProvisionsRack',x-.065,x+.065,.11,.18,-.12,.08,'Oak cut edges')
    rod('ProvisionsRack',(x,.34,-.02),(x*.65,.57,-.02),.035,'Oak cut edges')
profile('ProvisionsRack',[(-.8,1.36),(.8,1.36),(.78,1.53),(.48,1.56),
                         (.28,1.64),(0,1.7),(-.28,1.64),(-.48,1.56),(-.78,1.53)],
        -.12,.06,'Oak cut edges')
box('ProvisionsRack',-.64,.64,1.37,1.42,.061,.078,'Oak dark joints',.015)
# Quiet central carved diamond, legible at the game camera without lettering.
profile('ProvisionsRack',[(-.065,1.535),(0,1.59),(.065,1.535),(0,1.48)],.061,.077,'Teaching ochre')
for x in (-.48,-.08,.39):
    rod('ProvisionsRack',(x,1.34,.025),(x,1.34,.15),.026,'Forged iron')
    rod('ProvisionsRack',(x,1.34,.15),(x,1.38,.15),.026,'Forged iron')
# Lower slatted shelf, with rear rail and restrained exposed joinery.
for z in (-.14,.015,.17):
    box('ProvisionsRack',-.68,.68,.28,.355,z-.061,z+.061,'Oak cut edges')
box('ProvisionsRack',-.67,.67,.19,.27,-.12,.12,'Oak heart')
box('ProvisionsRack',-.64,.64,.35,.46,-.17,-.125,'Oak heart')
for x in (-.66,.66):
    for y in (.23,1.45):
        rod('ProvisionsRack',(x,y,.06),(x,y,.073),.023,'Oak dark joints')

# Bronze teaching hatchet: swept hardwood haft and purpose-shaped flaring blade.
rod('ProvisionHatchet',(-.50,.51,.14),(-.47,1.33,.14),.036,'Oak cut edges',8)
profile('ProvisionHatchet',[(-.53,1.25),(-.42,1.24),(-.307,1.325),(-.275,1.18),
                            (-.32,1.105),(-.43,1.16),(-.53,1.16)],.103,.18,'Warm bronze')
profile('ProvisionHatchet',[(-.28,1.34),(-.24,1.18),(-.29,1.095),
                            (-.32,1.105),(-.275,1.18),(-.307,1.325)],.1,.184,'Teaching ochre')
for y in (.55,.60,.65):
    rod('ProvisionHatchet',(-.52,y,.14),(-.447,y,.14),.022,'Oiled leather')

# Hand net: polygonal hoop, deep hanging bag and tied diamond lattice.
cx, cy, cz = .30, 1.095, .16
ring = [(cx+.205*math.cos(i*math.tau/12),cy+.195*math.sin(i*math.tau/12),cz) for i in range(12)]
for i in range(12):
    rod('ProvisionNet',ring[i],ring[(i+1)%12],.017,'Oak cut edges')
# Crossed strands fill the hoop; their inset depth makes a shallow net mouth.
# Analytic ellipse clipping gives each diagonal a fitted rim endpoint.
for direction in (-1,1):
    for offset in (-.64,-.32,0,.32,.64):
        half=math.sqrt(1-offset*offset)
        endpoints=[]
        for t in (-half,half):
            u=(t+offset)/math.sqrt(2)
            v=direction*(t-offset)/math.sqrt(2)
            endpoints.append((cx+.205*u,cy+.195*v,cz-.014))
        rod('ProvisionNet',*endpoints,.008,'Hemp cord',4)
bottom=(cx,.59,.13)
lower=[(cx+(p[0]-cx)*.58,.76+(p[1]-cy)*.12,.20) for p in ring]
for i in range(12):
    rod('ProvisionNet',ring[i],lower[(i+2)%12],.008,'Hemp cord',4)
    rod('ProvisionNet',ring[i],lower[(i-2)%12],.008,'Hemp cord',4)
    rod('ProvisionNet',lower[i],bottom,.008,'Hemp cord',4)
    rod('ProvisionNet',lower[i],lower[(i+2)%12],.008,'Hemp cord',4)
rod('ProvisionNet',(.30,1.29,.16),(.37,1.37,.15),.014,'Hemp cord')
rod('ProvisionNet',(.30,.91,.16),(.32,.48,.14),.025,'Oak heart')

# Tinderbox rests visibly on the shelf: fitted lid, iron clasp and flint.
box('ProvisionTinderbox',-.22,.11,.36,.49,.06,.245,'Oiled leather',.025)
box('ProvisionTinderbox',-.235,.125,.49,.525,.05,.25,'Oak cut edges',.018)
box('ProvisionTinderbox',-.07,-.025,.40,.52,.246,.259,'Forged iron')
profile('ProvisionTinderbox',[(.16,.36),(.255,.365),(.285,.40),(.22,.425)],.10,.18,'Forged iron')

merged=[]
for name, parts in families.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    bpy.ops.object.join()
    obj=parts[0]
    obj.name=name
    obj.data.name=name+'Mesh'
    merged.append(obj)

triangles=0
all_points=[]
for obj in merged:
    obj.data.calc_loop_triangles()
    triangles+=len(obj.data.loop_triangles)
    all_points += [(v.co.x,v.co.z,-v.co.y) for v in obj.data.vertices]
bounds={'min':[min(p[i] for p in all_points) for i in range(3)],
        'max':[max(p[i] for p in all_points) for i in range(3)]}
checks=[triangles<=2500,len(materials)<=8,len(merged)==4,
        all(math.isfinite(v) for p in all_points for v in p),
        all(abs((bounds['max'][i]-bounds['min'][i])-DIMENSIONS[key])<.001
            for i,key in enumerate(('width','height','depth'))),
        bounds['min'][1]==0,'ProvisionsRack' in families]
assert all(checks), {'checks':checks,'triangles':triangles,'bounds':bounds}
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'provisions.blend'))
# Export all four parts, not only the last selected family.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(OUT/'provisions.glb'),export_format='GLB',
                         use_selection=True,export_yup=True,export_animations=False)
raw=(OUT/'provisions.glb').read_bytes()
length,kind=struct.unpack_from('<II',raw,12)
gltf=json.loads(raw[20:20+length])
exported_tris=sum(gltf['accessors'][p['indices']]['count']//3 for m in gltf['meshes'] for p in m['primitives'])
assert exported_tris==triangles and len(gltf.get('materials',[]))<=8
manifest={'schema':'crafted-realms-local-prop-v1','id':'holm-provision-rack-v1',
          'units':'tiles','coordinateSystem':'glTF X/Y-up/Z','origin':'floor centre',
          'frontDirection':[0,0,1],'dimensions':DIMENSIONS,'localBounds':bounds,
          'semanticInteractionMeshes':['ProvisionsRack','ProvisionHatchet','ProvisionNet','ProvisionTinderbox'],
          'primaryInteractionMesh':'ProvisionsRack','triangles':triangles,
          'materials':len(gltf.get('materials',[])),
          'primitives':sum(len(m['primitives']) for m in gltf['meshes']),
          'meshFamilies':list(families),'animationNames':[],
          'sourceFile':'provisions.blend','modelFile':'provisions.glb',
          'revision':2,'builder':'tools/blender/build_holm_provision_rack_v2.py','palette':PALETTE,
          'visualAcceptance':False,'worldPlacement':None,
          'notes':'Secured static teaching props. Inventory sprites remain 2D. Main session owns Studio review and placement.'}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print('[HOLM_PROVISION_RACK] 8/8 technical acceptance ok; '+str(triangles)+' triangles; visual acceptance pending')
