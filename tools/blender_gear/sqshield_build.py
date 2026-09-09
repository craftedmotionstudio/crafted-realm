# sqshield_build.py — Crafted Realm square shield rev2 (owner r7): a CONCAVE
# tall rectangle that wraps slightly around the character — "a brown opaque
# riot shield". Curved 5x5 plate grid, rounded crown/taper, thin rim, one
# subtle horizontal band. Face normal +X, height on Blender Z (no bake),
# strap origin at the upper third. exec(open(this).read())
import bpy, bmesh, math, os

OUT = r"C:\Users\iQwaZ\OneDrive\Desktop\craftedrealms-claude\assets\models\props\gear_sqshield_v1.glb"
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

MATS = [mk_mat("CR_GEAR_METAL", 0xb08d57), mk_mat("CR_GEAR_METAL_DARK", 0x6e5430),
        mk_mat("CR_GEAR_METAL_EDGE", 0xd8c090)]

mesh = bpy.data.meshes.new("gear_sqshield"); bm = bmesh.new()
def quad(a,b,c,d,mi): f=bm.faces.new([a,b,c,d]); f.material_index=mi; return f

W = 0.28          # half width
CURVE = 0.115     # concave wrap depth at the edges
TH = 0.055        # plate thickness
cols = [-W, -W*0.5, 0.0, W*0.5, W]
def xoff(w): return -CURVE*(w/W)**2          # edges curl back toward the body
def htop(w): return 0.335 - 0.045*(w/W)**2   # crowned top
def hbot(w): return -0.525 + 0.055*(w/W)**2  # gently tapered foot
NR = 5
front = []; back = []
for w in cols:
    fcol = []; bcol = []
    for r in range(NR):
        t = r/(NR-1)
        h = htop(w)*(1-t) + hbot(w)*t
        fcol.append(bm.verts.new((0.030 + xoff(w), w, h)))
        bcol.append(bm.verts.new((0.030 + xoff(w) - TH, w, h)))
    front.append(fcol); back.append(bcol)

for c in range(len(cols)-1):
    for r in range(NR-1):
        quad(front[c][r],   front[c+1][r], front[c+1][r+1], front[c][r+1], 0)  # face
        quad(back[c+1][r],  back[c][r],    back[c][r+1],    back[c+1][r+1], 1) # back
# perimeter edge walls (dark rim)
for r in range(NR-1):
    quad(back[0][r],  front[0][r],  front[0][r+1],  back[0][r+1], 1)    # left edge
    quad(front[-1][r], back[-1][r], back[-1][r+1], front[-1][r+1], 1)   # right edge
for c in range(len(cols)-1):
    quad(front[c][0],  back[c][0],  back[c+1][0],  front[c+1][0], 1)    # top edge
    quad(back[c][-1],  front[c][-1], front[c+1][-1], back[c+1][-1], 1)  # bottom edge

# one subtle near-flush horizontal band across the face (riot-shield rib)
bh0, bh1 = -0.045, -0.105
for c in range(len(cols)-1):
    w0, w1 = cols[c], cols[c+1]
    a = bm.verts.new((0.042+xoff(w0), w0, bh0)); b2 = bm.verts.new((0.042+xoff(w1), w1, bh0))
    c2 = bm.verts.new((0.042+xoff(w1), w1, bh1)); d = bm.verts.new((0.042+xoff(w0), w0, bh1))
    quad(a, b2, c2, d, 2)

bm.normal_update(); bm.to_mesh(mesh); bm.free()
obj = bpy.data.objects.new("gear_sqshield", mesh); bpy.context.scene.collection.objects.link(obj)
for m in MATS: obj.data.materials.append(m)
for p in obj.data.polygons: p.use_smooth = False
mesh.update()
print("sqshield tris", sum(len(p.vertices)-2 for p in obj.data.polygons))

root = bpy.data.objects.new("gear_sqshield_v1", None); bpy.context.scene.collection.objects.link(root)
obj.parent = root
for o in bpy.data.objects: o.select_set(False)
root.select_set(True); obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_format='GLB',
                          export_apply=True, export_yup=True)
print("exported", os.path.getsize(OUT))
