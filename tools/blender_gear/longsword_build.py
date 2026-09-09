# longsword_build.py — Crafted Realm bronze longsword gear mesh (REPRODUCIBLE build).
# Run inside Blender/Mixar (the invisible background bridge): exec(open(this).read())
# rev3 2026-07-17 — round-2 two-model consensus: +15% length & width, chunkier
# guard, blade moved to the _DARK tint channel (the loader REPLACES METAL colors
# with light tier bronze; DARK = tint*0.72 = the reference's muted brown blade).
# rev2 2026-07-17 — two-model review (Gemini flash + Codex) consensus fixes:
#   +30% blade length (was reading shortsword on the v02 avatar, the only rig now)
#   grip origin moved to MID-GRIP so the fist no longer clips the crossguard
#   blade flattened to dark bronze (edge strips demoted to base metal; fuller darker)
#   guard + pommel now chunky BRIGHT GOLD (CR_GEAR_GOLD, untinted) like the reference
#   family convention: exported blade axis = glTF -Y (matches gear_sword de-facto)
import bpy, bmesh, math, os
from mathutils import Matrix

OUT = r"C:\Users\iQwaZ\OneDrive\Desktop\craftedrealms-claude\assets\models\props\gear_longsword_v1.glb"

for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
for m in list(bpy.data.materials): bpy.data.materials.remove(m)

def mk_mat(name, hexcol):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    col = (((hexcol>>16)&255)/255, ((hexcol>>8)&255)/255, (hexcol&255)/255, 1)
    b.inputs["Base Color"].default_value = col
    b.inputs["Roughness"].default_value = 0.85
    b.inputs["Metallic"].default_value = 0.0
    m.diffuse_color = col
    return m

# slot order: 0 metal blade, 1 dark fuller, 2 gold hilt, 3 leather grip
MATS = [mk_mat("CR_GEAR_METAL", 0x9a7844), mk_mat("CR_GEAR_METAL_DARK", 0x6e5430),
        mk_mat("CR_GEAR_GOLD", 0xd8b13c), mk_mat("CR_GEAR_GRIP", 0x4a3520)]

mesh = bpy.data.meshes.new("gear_longsword")
bm = bmesh.new()

# ---- BLADE (origin at MID-GRIP; guard top y=0.095; blade 0.10 -> ~1.0) ----
def ring(y, w, t):
    f = 0.95   # rev5: near-flat faces — the deep fuller groove doubled the silhouette
    pts = [( w,y,0),(0.5*w,y,t),(0.14*w,y,f*t),(-0.14*w,y,f*t),(-0.5*w,y,t),
           (-w,y,0),(-0.5*w,y,-t),(-0.14*w,y,-f*t),(0.14*w,y,-f*t),(0.5*w,y,-t)]
    return [bm.verts.new(p) for p in pts]

T = 0.019   # rev4: slightly thicker profile for elevated-camera readability
rings = [ring(0.100, 0.067, T), ring(0.370, 0.064, T), ring(0.640, 0.057, T*0.95),
         ring(0.880, 0.049, T*0.85), ring(1.030, 0.038, T*0.7)]
for a, b in zip(rings, rings[1:]):
    for i in range(10):
        bm.faces.new([a[i], a[(i+1)%10], b[(i+1)%10], b[i]])
last = rings[-1]
tipA = bm.verts.new(( 0.012, 1.085, 0)); tipB = bm.verts.new((-0.012, 1.125, 0))   # rev5: SHARP point
for i in range(10):
    v1, v2 = last[i], last[(i+1)%10]
    ta = tipA if (v1.co.x + v2.co.x)*0.5 > 0 else tipB
    try: bm.faces.new([v1, v2, ta])
    except ValueError: pass
try: bm.faces.new([last[0], tipA, tipB, last[5]])
except ValueError: pass
try: bm.faces.new(list(reversed(rings[0])))
except ValueError: pass

# ---- CROSSGUARD (chunkier + wider, GOLD) ----
gx = [(-0.150, 0.050, 0.010, 0.020, -0.014), (-0.090, 0.056, 0.038, 0.032, 0.0),
      ( 0.090, 0.056, 0.038, 0.032, 0.0),    ( 0.150, 0.050, 0.010, 0.020, -0.014)]
gr = []
for (x, ylo, yh, zt, dy) in gx:
    y0 = ylo + dy; y1 = ylo + yh + dy
    gr.append([bm.verts.new((x, y0, -zt)), bm.verts.new((x, y0, zt)),
               bm.verts.new((x, y1, zt)),  bm.verts.new((x, y1, -zt))])
for a, b in zip(gr, gr[1:]):
    for i in range(4):
        bm.faces.new([a[i], a[(i+1)%4], b[(i+1)%4], b[i]])
bm.faces.new(list(reversed(gr[0]))); bm.faces.new(gr[-1])

# ---- GRIP (octagonal, mid collar; spans the origin so the fist clears the guard) ----
def octo(y, r):
    return [bm.verts.new((r*math.cos(a), y, r*math.sin(a)))
            for a in [k*math.pi/4 + math.pi/8 for k in range(8)]]
g0 = octo(0.052, 0.021); g1 = octo(0.004, 0.019); g1b = octo(-0.004, 0.023); g2 = octo(-0.070, 0.018)
for a, b in [(g0, g1), (g1, g1b), (g1b, g2)]:
    for i in range(8):
        bm.faces.new([a[i], a[(i+1)%8], b[(i+1)%8], b[i]])

# ---- POMMEL (bigger faceted scent-stopper, GOLD) ----
p1 = octo(-0.088, 0.047); p2 = octo(-0.120, 0.030)   # rev4: prominent gold pommel
for a, b in [(g2, p1), (p1, p2)]:
    for i in range(8):
        bm.faces.new([a[i], a[(i+1)%8], b[(i+1)%8], b[i]])
pcap = bm.verts.new((0, -0.132, 0))
for i in range(8):
    bm.faces.new([p2[i], p2[(i+1)%8], pcap])

bm.normal_update(); bm.to_mesh(mesh); bm.free()
obj = bpy.data.objects.new("gear_longsword", mesh)
bpy.context.scene.collection.objects.link(obj)
for m in MATS: obj.data.materials.append(m)
for p in obj.data.polygons: p.use_smooth = False

# material assignment by region: gold hilt, leather grip, dark fuller, flat bronze blade
for poly in obj.data.polygons:
    c = poly.center
    if 0.05 < c.y < 0.095:                 poly.material_index = 2   # guard = gold
    elif c.y <= -0.07:                     poly.material_index = 2   # pommel = gold
    elif -0.07 < c.y <= 0.052:             poly.material_index = 3   # grip = leather
    else:
        poly.material_index = 1   # rev5 (owner): ONE uniform blade tone — the fuller
                                  # contrast read as "two swords combined"

mesh.update()
print("rev2 built: tris", sum(len(p.vertices)-2 for p in obj.data.polygons))

obj.data.transform(Matrix.Scale(0.78, 4))   # rev6 (owner): three-quarters of previous length
# family convention: blade -Y in glTF => rotate -90deg about X (Blender +Y -> -Z -> glTF -Y)
obj.data.transform(Matrix.Rotation(-math.pi/2, 4, 'X'))
obj.data.update()

root = bpy.data.objects.new("gear_longsword_v1", None)
bpy.context.scene.collection.objects.link(root)
obj.parent = root
for o in bpy.data.objects: o.select_set(False)
root.select_set(True); obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_format='GLB',
                          export_apply=True, export_yup=True)
print("exported", os.path.getsize(OUT), "bytes")
