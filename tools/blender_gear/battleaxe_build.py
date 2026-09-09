# battleaxe_build.py — Crafted Realm battleaxe (own mesh at last; was sharing the
# hatchet). Fully-designed: long haft, broad single crescent head with a concave
# inner curve + EDGE rim on the cutting arc, small back spike. Family: grip at
# origin, head-up axis exported along glTF +Y like gear_hatchet (tool family),
# edge toward +X. Haft is untinted wood. Run: exec(open(this).read())
import bpy, bmesh, math, os
from mathutils import Matrix

OUT = r"C:\Users\iQwaZ\OneDrive\Desktop\craftedrealms-claude\assets\models\props\gear_battleaxe_v1.glb"

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

MATS = [mk_mat("CR_GEAR_METAL_DARK", 0x6e5430),  # 0 head body
        mk_mat("CR_GEAR_METAL_EDGE", 0xd8c090),  # 1 cutting arc rim
        mk_mat("BATTLEAXE_WOOD", 0xa9803c),      # 2 haft — golden like the reference
        mk_mat("BATTLEAXE_WRAP", 0x4a3520)]      # 3 grip wrap (untinted)

mesh = bpy.data.meshes.new("gear_battleaxe")
bm = bmesh.new()

# ---- haft: octagon, grip at origin (hand ~1/3 up), total 0.32 below..0.55 above
def octo(y, r):
    return [bm.verts.new((r*math.cos(a), y, r*math.sin(a)))
            for a in [k*math.pi/4 + math.pi/8 for k in range(8)]]
h = [octo(-0.22, 0.024), octo(-0.05, 0.022), octo(0.05, 0.026), octo(0.26, 0.022), octo(0.46, 0.024)]  # rev3: shorter, thicker
for a, b in zip(h, h[1:]):
    for i in range(8):
        bm.faces.new([a[i], a[(i+1)%8], b[(i+1)%8], b[i]])
bm.faces.new(list(reversed(h[0]))); bm.faces.new(h[-1])

# ---- crescent head: inner arc (concave, near haft) to outer cutting arc (+x)
# profile pairs along the crescent, z thickness tapers toward the edge
Z0, Z1 = 0.030, 0.012
# rev3: DOUBLE crescent (the reference's iconic two-lobed silhouette), bigger
N = 6
for side in (1, -1):
    inner_f = []; inner_b = []; outer_f = []; outer_b = []
    for k in range(N + 1):
        t = k / N
        ang = math.radians(-52 + 104*t)
        cy = 0.315
        # rev4 (owner): smaller lobes that ROOT INTO the haft (inner arc starts
        # inside the haft radius so metal always contacts the wood)
        ox = side * (0.040 + 0.225*math.cos(ang*0.92))
        oy = cy + 0.27*math.sin(ang)
        # rev5 (owner r3): the inner arc HUGS the haft (max 0.026 = haft radius)
        # across the whole sweep — the old base+0.060*cos left a visible air gap
        ix = side * (0.020 + 0.006*math.cos(ang))
        iy = cy + 0.15*math.sin(ang)
        inner_f.append(bm.verts.new((ix, iy,  Z0)))
        inner_b.append(bm.verts.new((ix, iy, -Z0)))
        outer_f.append(bm.verts.new((ox, oy,  Z1)))
        outer_b.append(bm.verts.new((ox, oy, -Z1)))
    for i in range(N):
        o = [inner_f[i], outer_f[i], outer_f[i+1], inner_f[i+1]]
        p = [inner_b[i+1], outer_b[i+1], outer_b[i], inner_b[i]]
        q = [outer_f[i], outer_b[i], outer_b[i+1], outer_f[i+1]]
        r = [inner_b[i], inner_b[i+1], inner_f[i+1], inner_f[i]]
        for verts in (o, p, q, r):
            bm.faces.new(verts if side == 1 else list(reversed(verts)))
    e0 = [inner_f[0], inner_b[0], outer_b[0], outer_f[0]]
    e1 = [outer_f[N], outer_b[N], inner_b[N], inner_f[N]]
    bm.faces.new(e0 if side == 1 else list(reversed(e0)))
    bm.faces.new(e1 if side == 1 else list(reversed(e1)))

bm.normal_update(); bm.to_mesh(mesh); bm.free()
obj = bpy.data.objects.new("gear_battleaxe", mesh)
bpy.context.scene.collection.objects.link(obj)
for m in MATS: obj.data.materials.append(m)
for p in obj.data.polygons: p.use_smooth = False

for poly in obj.data.polygons:
    c = poly.center
    if abs(c.x) <= 0.028 and abs(c.z) <= 0.028 and c.y < 0.47:
        poly.material_index = 3 if (-0.06 < c.y < 0.06) else 2      # haft; wrap at the grip
    elif abs(c.x) > 0.235:
        poly.material_index = 1                                     # cutting rims only
    else:
        poly.material_index = 0

mesh.update()
print("battleaxe tris", sum(len(p.vertices)-2 for p in obj.data.polygons))

# tool family: keep authored +Y up (hatchet convention) -> rotate +90 X so
# Blender +Y becomes +Z, exporting to glTF +Y
obj.data.transform(Matrix.Rotation(math.pi/2, 4, 'X'))
obj.data.update()
root = bpy.data.objects.new("gear_battleaxe_v1", None)
bpy.context.scene.collection.objects.link(root)
obj.parent = root
for o in bpy.data.objects: o.select_set(False)
root.select_set(True); obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_format='GLB',
                          export_apply=True, export_yup=True)
print("exported", os.path.getsize(OUT))
