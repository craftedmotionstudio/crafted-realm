# kiteshield_build.py — Crafted Realm kiteshield (kite silhouette at last; wood
# shield keeps the round gear_shield). Fully-designed: kite face tapering to a
# bottom point, domed center, raised rim, cross ridge + boss. Family: face
# normal +X (gear_shield convention), height along Y. Run: exec(open(this).read())
import bpy, bmesh, math, os

OUT = r"C:\Users\iQwaZ\OneDrive\Desktop\craftedrealms-claude\assets\models\props\gear_kiteshield_v1.glb"

for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
for m in list(bpy.data.materials): bpy.data.materials.remove(m)

def mk_mat(name, hexcol):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    col = (((hexcol>>16)&255)/255, ((hexcol>>8)&255)/255, (hexcol&255)/255, 1)
    b.inputs["Base Color"].default_value = col
    b.inputs["Roughness"].default_value = 0.85; b.inputs["Metallic"].default_value = 0.0
    m.diffuse_color = col
    return m

MATS = [mk_mat("CR_GEAR_METAL", 0xb08d57),       # 0 face
        mk_mat("CR_GEAR_METAL_DARK", 0x6e5430),  # 1 rim
        mk_mat("CR_GEAR_METAL_EDGE", 0xd8c090)]  # 2 cross ridge + boss

mesh = bpy.data.meshes.new("gear_kiteshield")
bm = bmesh.new()

# kite outline: height along Blender Z (-> glTF Y so the fit's longest-axis =
# vertical), width along Blender Y, face normal +X. Origin = STRAP POINT at the
# upper third so the shield hangs naturally from the forearm (rev2 — the
# centered origin + swapped axes had it riding the avatar's back).
outline_hw = [( 0.300,  0.000), ( 0.256,  0.212), ( 0.106,  0.338), (-0.094,  0.375),
              (-0.306,  0.288), (-0.569,  0.119), (-0.800,  0.000), (-0.569, -0.119),
              (-0.306, -0.288), (-0.094, -0.375), ( 0.106, -0.338), ( 0.256, -0.212)]  # rev3: +25%, sharp long point
outline = [(h, w) for (h, w) in outline_hw]
back  = [bm.verts.new((-0.020, w, h)) for (h, w) in outline]
rim   = [bm.verts.new(( 0.040, w, h)) for (h, w) in outline]
inset = [bm.verts.new(( 0.055, w*0.80, h*0.82 - 0.02)) for (h, w) in outline]
center = bm.verts.new((0.095, 0.0, -0.13))       # domed apex

rim_faces = []; face_faces = []
n = len(outline)
for i in range(n):
    j = (i+1) % n
    bm.faces.new([back[j], back[i], rim[i], rim[j]])              # outer edge wall
    rim_faces.append(bm.faces.new([rim[j], rim[i], inset[i], inset[j]]))   # rim band
    face_faces.append(bm.faces.new([inset[j], inset[i], center])) # domed face fan
# back plate fan
bctr = bm.verts.new((-0.020, 0.0, -0.13))
for i in range(n):
    bm.faces.new([back[i], back[(i+1)%n], bctr])

# cross ridge (vertical + horizontal bars) + boss on the face
# coords: (x=face height off surface, y=across, z=up/down the shield)
def bar(z0, z1, y0, y1, h):
    a = bm.verts.new((h, y0, z0)); b = bm.verts.new((h, y1, z0))
    c = bm.verts.new((h, y1, z1)); d = bm.verts.new((h, y0, z1))
    return bm.faces.new([a, b, c, d])
cross = [bar(-0.50, 0.17, -0.030, 0.030, 0.105),
         bar(-0.17, -0.09, -0.24, 0.24, 0.105)]
def octo_boss(x, r):
    return [bm.verts.new((x, r*math.cos(a), -0.13 + r*math.sin(a)))
            for a in [k*math.pi/4 for k in range(8)]]
b0 = octo_boss(0.100, 0.085); b1 = octo_boss(0.145, 0.045)
boss = []
for i in range(8):
    boss.append(bm.faces.new([b0[i], b0[(i+1)%8], b1[(i+1)%8], b1[i]]))
bcap = bm.verts.new((0.155, 0, -0.13))
for i in range(8):
    boss.append(bm.faces.new([b1[i], b1[(i+1)%8], bcap]))

bm.normal_update(); bm.to_mesh(mesh); bm.free()
obj = bpy.data.objects.new("gear_kiteshield", mesh)
bpy.context.scene.collection.objects.link(obj)
for m in MATS: obj.data.materials.append(m)
for p in obj.data.polygons: p.use_smooth = False

for poly in obj.data.polygons:
    c = poly.center
    if c.x > 0.095:                       poly.material_index = 2   # boss + ridge tops
    elif c.x > 0.048 and c.x <= 0.095:    poly.material_index = 0   # domed face
    else:                                 poly.material_index = 1   # rim + back
mesh.update()
print("kiteshield tris", sum(len(p.vertices)-2 for p in obj.data.polygons))

root = bpy.data.objects.new("gear_kiteshield_v1", None)
bpy.context.scene.collection.objects.link(root)
obj.parent = root
for o in bpy.data.objects: o.select_set(False)
root.select_set(True); obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_format='GLB',
                          export_apply=True, export_yup=True)
print("exported", os.path.getsize(OUT))
