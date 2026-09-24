"""Reversible Blender v3: gray masonry, directional thatch, authored roof irregularity.
Preserves v2 circulation geometry exactly. No installed assets or world placements.
"""
import bpy, bmesh, json, math, random, hashlib, struct
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'.studio-workspaces/holm-kitchen-wings-v2/candidates/kitchen-upper.blend'
assert BASE.is_file() and (ROOT/'tools/blender/build_holm_kitchen_upper.py').is_file()
OUT=ROOT/'.studio-workspaces/holm-kitchen-wings-v3/candidates'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(BASE))
for o in list(bpy.data.objects):
    if not o.name.startswith('Kitchen_'): bpy.data.objects.remove(o,do_unlink=True)
objects=list(bpy.context.scene.objects)
def geo(o):
    return [[float(c) for c in o.matrix_world@v.co] for v in o.data.vertices]
protected={o.name:geo(o) for o in objects if not o.name.startswith('Kitchen_Roof_')}
stone=bpy.data.materials['Warm fieldstone']; wood=bpy.data.materials['Smoked oak']
# Original pixel art is generated locally. No source image pixels are imported.
for kind in ['stone','plaster','thatch','wood']:
    im=bpy.data.images.get('kitchen_'+kind+'_128'); assert im
    rng=random.Random(9132603); pixels=[]
    for y in range(128):
        for x in range(128):
            n=rng.uniform(-.018,.018)
            if kind=='stone':
                row=y//24; shift=[0,23,7,28,13,31][row]; xx=(x+shift)%128
                col=xx//43; local=xx%43
                seam=y%24<1 or local<1
                v=.42+((row*19+col*7)%9-4)*.014+n
                relief=.027 if y%24 in [1,2] or local in [1,2] else (-.025 if y%24>21 else 0)
                c=(.305,.31,.30) if seam else (v+relief,v+relief,v*.97+relief)
            elif kind=='thatch':
                # Long fine reed fibres and broad, staggered bundles running down pitch.
                fibre=math.sin(x*2.37+math.sin(y*.045+x*.08))*.046
                bundle=math.sin(x*.21+math.sin(y*.08)*.5)*.025
                streak=math.sin(x*.75+y*.014)*.022
                v=.43+fibre+bundle+streak+n
                c=(v*1.17,v*.93,v*.46)
            elif kind=='plaster':
                v=.65+n*.32; c=(v*1.055,v*1.025,v*.89)
            else:
                v=.245+n+math.sin(x*.55+math.sin(y*.035))*.025
                c=(v*1.27,v*.92,v*.57)
            pixels.extend((*c,1))
    im.pixels.foreach_set(pixels);im.filepath_raw=str(OUT/(kind+'-128.png'));im.file_format='PNG';im.save();im.pack()
# Substantial masonry across the exterior; limewash remains on interior wall faces.
for o in objects:
    if not o.type=='MESH':continue
    for p in o.data.polygons:
        m=o.data.materials[p.material_index]
        if m.name=='Oat limewash':
            normal=o.matrix_world.to_3x3()@p.normal; center=o.matrix_world@p.center
            exterior=(abs(normal.z)<.1 and ((normal.y<-.5 and (center.y< -2.9 or .8<center.y<1.15)) or (normal.y>.5 and center.y>4.8) or (normal.x<-.5 and center.x< -4.8) or (normal.x>.5 and (center.x>.8))))
            if exterior:
                if stone.name not in o.data.materials:o.data.materials.append(stone)
                p.material_index=o.data.materials.find(stone.name)
        if o.data.materials[p.material_index]==stone:
            axes=(0,2) if abs(p.normal.y)>.5 else ((1,2) if abs(p.normal.x)>.5 else (0,1))
            for li in p.loop_indices:
                v=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co
                o.data.uv_layers.active.data[li].uv=(v[axes[0]]*.46,v[axes[1]]*.46)
# Roof fields: subdivided thatch planes gently swell between bindings; varying eaves
# change silhouette without shifting eave clearance, ridge height or structural walls.
for o in objects:
    if not o.name.startswith('Kitchen_Roof_'):continue
    if not any(m.name=='Weathered golden reed' for m in o.data.materials):continue
    bm=bmesh.new();bm.from_mesh(o.data)
    long_edges=[e for e in bm.edges if e.calc_length()>1.8]
    bmesh.ops.subdivide_edges(bm,edges=long_edges,cuts=7,use_grid_fill=True)
    bm.to_mesh(o.data);bm.free()
    for v in o.data.vertices:
        x,y,z=v.co
        v.co.z+=.045*math.sin(x*2.1+y*.7)+.026*math.sin(y*3.8+x*.43)
    o.data.update()
    for p in o.data.polygons:
        n=p.normal
        # Each pitch receives fibres in the gravity direction projected on its plane.
        down=Vector((0,0,-1))-n*n.dot(Vector((0,0,-1)))
        if down.length<.01:down=Vector((0,1,0))
        down.normalize();across=down.cross(n).normalized()
        for li in p.loop_indices:
            v=o.data.vertices[o.data.loops[li].vertex_index].co
            o.data.uv_layers.active.data[li].uv=(v.dot(across)*.7,v.dot(down)*.3)
# Distinct exterior casements: a shuttered pantry and the baker's upper window.
# Added boards sit outside walls; original apertures and all circulation stay exact.
def board(name,loc,size,group):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name='Kitchen_'+group+'_'+name;o.dimensions=size
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.data.materials.append(wood)
    uv=o.data.uv_layers.active
    for p in o.data.polygons:
        for li in p.loop_indices:
            v=o.data.vertices[o.data.loops[li].vertex_index].co;uv.data[li].uv=(v.x*.8,v.z*.5)
    return o
for center,bottom,top,y,group in [(3.9,1.05,2.35,.785,'Shell'),(-3,4.15,5.45,-3.2,'UpperShell')]:
    for side in [-1,1]:
        cx=center+side*1.13
        for j in range(3):board('ShutterBoard',(cx+(j-1)*.15,y,(bottom+top)/2),(.145,.085,top-bottom),group)
        for z in [bottom+.20,top-.20]:board('ShutterBrace',(cx,y-.065,z),(.49,.07,.095),group)
# Merge new boards per semantic family/material, preserving existing named meshes.
for group in ['Shell','UpperShell']:
    added=[o for o in bpy.data.objects if o.name.startswith('Kitchen_'+group+'_Shutter')]
    bpy.ops.object.select_all(action='DESELECT')
    for o in added:o.select_set(True)
    bpy.context.view_layer.objects.active=added[0];bpy.ops.object.join();bpy.context.object.name='Kitchen_'+group+'_Shutters'
production=[o for o in bpy.context.scene.objects if o.type=='MESH']
for name,vertices in protected.items():assert geo(bpy.data.objects[name])==vertices, name+' circulation geometry changed'
for o in production:
    assert all(math.isfinite(c) for v in geo(o) for c in v)
tris=sum(len(p.vertices)-2 for o in production for p in o.data.polygons)
mats=set(m.name for o in production for m in o.data.materials)
assert tris<=20000 and len(mats)<=24
for o in production:o.hide_render=False;o.hide_set(False)
bpy.ops.object.select_all(action='DESELECT')
for o in production:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'kitchen-character.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=False)
glb=(OUT/'kitchen-character.glb').read_bytes();g=json.loads(glb[20:20+struct.unpack_from('<I',glb,12)[0]])
assert len(g['images'])==4 and all('bufferView' in i and 'uri' not in i for i in g['images'])
contract=json.loads((BASE.parent/'kitchen-upper.contract.json').read_text())
contract.update(schema='holm.kitchen-character.v3',triangleCount=tris,materialCount=len(mats),meshCount=len(production),meshNames=[o.name for o in production])
contract['provenance']={'source':str(Path(__file__).relative_to(ROOT)),'sourceSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'baseBlendSha256':hashlib.sha256(BASE.read_bytes()).hexdigest(),'protectedGeometryIdentical':list(protected),'textureOrigin':'Original generated pixel art; no reference pixels copied'}
contract['glb']={'bytes':len(glb),'sha256':hashlib.sha256(glb).hexdigest(),'embeddedImages':4,'primitives':sum(len(m['primitives']) for m in g['meshes'])}
(OUT/'kitchen-character.contract.json').write_text(json.dumps(contract,indent=2),encoding='utf-8')
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=1400;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.world.color=(.38,.38,.38);scene.view_settings.view_transform='Standard'
bpy.ops.object.light_add(type='AREA',location=(-8,-10,16));bpy.context.object.data.energy=1800;bpy.context.object.data.size=12
bpy.ops.object.light_add(type='SUN');bpy.context.object.rotation_euler=(.5,-.5,-.5);bpy.context.object.data.energy=1.4
bpy.ops.object.camera_add(location=(17,-21,18));camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=23
camera.rotation_euler=(Vector((.5,1,3.5))-camera.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'kitchen-character.blend'))
scene.render.filepath=str(OUT/'kitchen-character-exterior.png');bpy.ops.render.render(write_still=True)
print('[KITCHEN_CHARACTER] protected geometry, finite vertices, budget and four embedded textures passed',tris,len(mats))
