# longbow_build.py — Crafted Realm longbow (gale_longbow stops sharing the
# shortbow). Fully-designed: tall D-curve stave with tapering octagonal limbs
# and a leather grip wrap set BELOW center. Height along glTF Y (authored along
# Blender Z), belly curve toward +X, grip at origin.
# rev4 (owner 2026-07-17): NO STRING on the held model — the string is drawn
# only on the 2D inventory icon, never the 3D held mesh. Grip wrap lowered so
# the hand grabs further down the wooden riser.
# Run: exec(open(this).read())
import bpy, bmesh, math, os

OUT = r"C:\Users\iQwaZ\OneDrive\Desktop\craftedrealms-claude\assets\models\props\gear_longbow_v1.glb"

for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
for m in list(bpy.data.materials): bpy.data.materials.remove(m)

def mk_mat(name, hexcol):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    col = (((hexcol>>16)&255)/255, ((hexcol>>8)&255)/255, (hexcol&255)/255, 1)
    b.inputs["Base Color"].default_value = col
    b.inputs["Roughness"].default_value = 0.9; b.inputs["Metallic"].default_value = 0.0
    m.diffuse_color = col
    return m

MATS = [mk_mat("LONGBOW_WOOD", 0xa9803c),   # 0 stave — golden yew like the reference
        mk_mat("LONGBOW_WRAP", 0x4a3520)]   # 1 grip wrap (no string material — string is icon-only)

mesh = bpy.data.meshes.new("gear_longbow")
bm = bmesh.new()

# stave: rings along Blender Z (height), belly curve in +X, tapered square-oct section
def ring(z, x, r):
    pts = [(x + r, z, 0), (x, z, r), (x - r, z, 0), (x, z, -r)]
    return [bm.verts.new((px, pz2, pz)) for (px, pz2, pz) in
            [(p[0], p[2], p[1]) for p in pts]]  # (x, y=width axis, z=height)

# height t: -0.62 .. +0.62 ; curve x = depth * cos-ish
H = 0.62
N = 8
rings = []
for k in range(N + 1):
    t = -1 + 2*k/N
    z = H * t
    x = 0.20 * math.cos(t * math.pi/2)            # deeper D-curve belly
    r = 0.044 - 0.024*abs(t)                       # chunkier limbs, tapered tips
    rings.append(ring(z, x, r))
for a, b in zip(rings, rings[1:]):
    for i in range(4):
        bm.faces.new([a[i], a[(i+1)%4], b[(i+1)%4], b[i]])
bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])

# rev4: string geometry deliberately omitted — the bowstring appears only on the
# 2D inventory icon, never on the held 3D model (owner directive).

bm.normal_update(); bm.to_mesh(mesh); bm.free()
obj = bpy.data.objects.new("gear_longbow", mesh)
bpy.context.scene.collection.objects.link(obj)
for m in MATS: obj.data.materials.append(m)
for p in obj.data.polygons: p.use_smooth = False

for poly in obj.data.polygons:
    c = poly.center
    # rev4: grip wrap set BELOW center (-0.24..0.02 in height) on the belly side,
    # so the hand grabs further down the riser like the owner asked
    if -0.24 < c.z < 0.02 and c.x > 0.10:     poly.material_index = 1   # grip wrap
    else:                                     poly.material_index = 0
mesh.update()
print("longbow tris", sum(len(p.vertices)-2 for p in obj.data.polygons))

root = bpy.data.objects.new("gear_longbow_v1", None)
bpy.context.scene.collection.objects.link(root)
obj.parent = root
for o in bpy.data.objects: o.select_set(False)
root.select_set(True); obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_format='GLB',
                          export_apply=True, export_yup=True)
print("exported", os.path.getsize(OUT))
