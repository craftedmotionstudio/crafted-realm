# fullhelm_build.py — Crafted Realm full helm (replaces the hat-reading gear_helm
# for every helm tier). Head-replacement helm: fx_humanoid collapses the head
# bone and this mesh becomes the head, so it must READ as a face-framing helmet.
# rev8 (owner 2026-07-17 redesign): rounder dome (no boxy cone), front wraps
# FORWARD to the jaw and tucks under the CHIN, and a raised brow ridge over a
# recessed eye band split by two vertical bars into real EYE SLITS. Face toward
# +Z; per-face materials assigned inline in bmesh (no fragile center matching).
# Run via the invisible Mixar bridge: exec(open(this).read())
import bpy, bmesh, math, os
from mathutils import Matrix

OUT = r"C:\Users\iQwaZ\OneDrive\Desktop\craftedrealms-claude\assets\models\props\gear_fullhelm_v1.glb"

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

MATS = [mk_mat("CR_GEAR_METAL_DARK", 0x6e5430),  # 0 shell (muted tier bronze in-game)
        mk_mat("HELM_SLIT", 0x140d06),           # 1 eye opening (untinted near-black)
        mk_mat("CR_GEAR_METAL_EDGE", 0xd8c090),  # 2 brow ridge + eye bars (light bronze)
        mk_mat("HELM_PLUME", 0x5a3a9a)]          # 3 plume (untinted purple)

mesh = bpy.data.meshes.new("gear_fullhelm")
bm = bmesh.new()

def quad(a, b, c, d, mi):
    f = bm.faces.new([a, b, c, d]); f.material_index = mi; return f
def tri(a, b, c, mi):
    f = bm.faces.new([a, b, c]); f.material_index = mi; return f

# octagonal ring at height y, radius r; `front` scales only the +Z (face) side so
# the face can bulge forward and the chin can tuck under.
def ring(y, r, front=1.0):
    vs = []
    for k in range(8):
        a = k*math.pi/4 + math.pi/8
        x = r*math.sin(a); z = r*math.cos(a)
        if z > 0: z *= front
        vs.append(bm.verts.new((x, y, z)))
    return vs

# rev9 (owner r5): shell rings run crown -> face -> CHIN CONTOUR -> tight NECK
# COLLAR. front>1 = face bulges forward; front<1 at bottom = tucks toward the neck.
R = [(0.330, 0.050, 1.00),   # 0 crown cap ring
     (0.300, 0.118, 1.00),   # 1
     (0.235, 0.185, 1.02),   # 2 upper dome
     (0.150, 0.222, 1.06),   # 3 brow
     (0.055, 0.236, 1.10),   # 4 eye
     (-0.045, 0.236, 1.10),  # 5 cheek
     (-0.150, 0.222, 1.02),  # 6 jaw
     (-0.225, 0.190, 0.80),  # 7 chin (contours in under the jaw)
     (-0.285, 0.150, 0.88),  # 8 neck top (tight)
     (-0.370, 0.144, 0.92)]  # 9 neck bottom — collar wraps the neck
rings = [ring(y, r, f) for (y, r, f) in R]

for ri, (A, B) in enumerate(zip(rings, rings[1:])):
    for i in range(8):
        quad(A[i], A[(i+1) % 8], B[(i+1) % 8], B[i], 0)   # whole shell one bronze

# rounded crown cap (dome, not a point): small top ring + centre, shallow rise
cap = bm.verts.new((0, 0.362, 0))
for i in range(8):
    tri(rings[0][(i+1) % 8], rings[0][i], cap, 0)
# close the collar bottom inward so the shell reads solid
inner = ring(-0.370, 0.115, 0.92)
for i in range(8):
    quad(rings[-1][i], rings[-1][(i+1) % 8], inner[(i+1) % 8], inner[i], 0)
ictr = bm.verts.new((0, -0.370, 0.02))
for i in range(8):
    tri(inner[i], inner[(i+1) % 8], ictr, 0)

# --- face plate: SAME-bronze brow ridge over tall VERTICAL SLITS (reference) --
def box(cx, cy, cz, sx, sy, sz, mi):
    xs = (cx - sx/2, cx + sx/2); ys = (cy - sy/2, cy + sy/2); zs = (cz - sz/2, cz + sz/2)
    v = {}
    for i, x in enumerate(xs):
        for j, y in enumerate(ys):
            for k, z in enumerate(zs):
                v[(i, j, k)] = bm.verts.new((x, y, z))
    F = [[(0,0,0),(0,1,0),(0,1,1),(0,0,1)], [(1,0,0),(1,0,1),(1,1,1),(1,1,0)],
         [(0,0,0),(0,0,1),(1,0,1),(1,0,0)], [(0,1,0),(1,1,0),(1,1,1),(0,1,1)],
         [(0,0,0),(1,0,0),(1,1,0),(0,1,0)], [(0,0,1),(0,1,1),(1,1,1),(1,0,1)]]
    for f in F:
        quad(v[f[0]], v[f[1]], v[f[2]], v[f[3]], mi)

# brow ridge — SAME shell bronze; width capped to the flat face band (±0.09) so
# its ends can't hover off the curved shell (the floating-plank artifact)
box(0.0, 0.165, 0.234, 0.18, 0.050, 0.040, 0)
# four tall vertical dark slits down the face, like the Bible reference detail
# (kept inboard + shallow so the outer pair can't poke past the shell silhouette)
# near-flush: the shell's flat face band sits at z=0.240, so slit fronts at
# 0.246 read as inlays without ever breaking the silhouette at glancing angles
for sx_pos in (-0.078, -0.026, 0.026, 0.078):
    box(sx_pos, 0.005, 0.236, 0.026, 0.26, 0.020, 1)

# --- swept-back plume, seated on the new crown -------------------------------
plume_path = [(0.325, 0.020, 0.058, 0.060), (0.420, -0.060, 0.084, 0.140),
              (0.458, -0.175, 0.088, 0.150), (0.380, -0.300, 0.066, 0.110),
              (0.255, -0.380, 0.036, 0.060)]  # (y, z, half-width, crest height)
prings = []
for (py, pz, w, hh) in plume_path:
    prings.append([bm.verts.new((-w, py, pz)), bm.verts.new((w, py, pz)),
                   bm.verts.new((0, py + hh, pz - 0.015))])
for a, b in zip(prings, prings[1:]):
    for i in range(3):
        quad(a[i], a[(i+1) % 3], b[(i+1) % 3], b[i], 3)
tri(prings[0][2], prings[0][1], prings[0][0], 3)
tri(prings[-1][0], prings[-1][1], prings[-1][2], 3)

bm.normal_update(); bm.to_mesh(mesh); bm.free()
obj = bpy.data.objects.new("gear_fullhelm", mesh)
bpy.context.scene.collection.objects.link(obj)
for m in MATS: obj.data.materials.append(m)
for p in obj.data.polygons: p.use_smooth = False
mesh.update()
print("fullhelm tris", sum(len(p.vertices)-2 for p in obj.data.polygons))

# keep the accepted head-replacement footprint (rev7 scale) + the axis bake
obj.data.transform(Matrix.Scale(0.76, 4))
obj.data.transform(Matrix.Rotation(math.pi/2, 4, 'X'))   # authored top=+Y,face=+Z -> glTF
obj.data.update()

root = bpy.data.objects.new("gear_fullhelm_v1", None)
bpy.context.scene.collection.objects.link(root)
obj.parent = root
for o in bpy.data.objects: o.select_set(False)
root.select_set(True); obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_format='GLB',
                          export_apply=True, export_yup=True)
print("exported", os.path.getsize(OUT))
