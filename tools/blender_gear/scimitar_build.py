# scimitar_build.py — Crafted Realm scimitar (sabres finally get their curve).
# Fully-designed: blade sweeps along a deepening arc, broadens toward a clipped
# angled tip; gold disc guard + short grip + gold pommel. Family conventions:
# grip at origin, blade exported along glTF -Y, edge toward +X.
# Blade uses CR_GEAR_METAL_DARK (muted tier brown) with an EDGE strip on the
# cutting side. Run: exec(open(this).read())
import bpy, bmesh, math, os
from mathutils import Matrix

OUT = r"C:\Users\iQwaZ\OneDrive\Desktop\craftedrealms-claude\assets\models\props\gear_scimitar_v1.glb"

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

MATS = [mk_mat("CR_GEAR_METAL_DARK", 0x6e5430),  # 0 blade body
        mk_mat("CR_GEAR_METAL_EDGE", 0xd8c090),  # 1 cutting edge strip
        mk_mat("CR_GEAR_GOLD", 0xd8b13c),        # 2 guard + pommel
        mk_mat("CR_GEAR_GRIP", 0x4a3520)]        # 3 grip

mesh = bpy.data.meshes.new("gear_scimitar")
bm = bmesh.new()

# blade rings along a curving centerline; cross-section 6 verts:
# edge (+x side, sharp), two face pairs, spine (-x)
def ring(y, xc, w, t):
    return [bm.verts.new((xc + w, y, 0)),            # cutting edge
            bm.verts.new((xc + 0.35*w, y,  t)),
            bm.verts.new((xc - 0.55*w, y,  t*0.8)),
            bm.verts.new((xc - w*0.95, y, 0)),       # spine
            bm.verts.new((xc - 0.55*w, y, -t*0.8)),
            bm.verts.new((xc + 0.35*w, y, -t))]

T = 0.017
# (y, curve offset, half-width) — curve deepens, blade broadens toward the tip
params = [(0.085, 0.000, 0.040), (0.28, 0.012, 0.046), (0.47, 0.040, 0.056),
          (0.64, 0.085, 0.072),  (0.78, 0.150, 0.096)]   # rev2: heavy flared tip
rings = [ring(y, xc, w, T if i < 3 else T*0.85) for i, (y, xc, w) in enumerate(params)]
for a, b in zip(rings, rings[1:]):
    for i in range(6):
        bm.faces.new([a[i], a[(i+1)%6], b[(i+1)%6], b[i]])
# clipped angled tip: edge side sweeps up past the spine side
last = rings[-1]
tipA = bm.verts.new((0.150 + 0.075, 0.865, 0))   # edge-side point (high)
tipB = bm.verts.new((0.150 - 0.055, 0.815, 0))   # spine-side (low) -> angled end
for i in range(6):
    v1, v2 = last[i], last[(i+1)%6]
    ta = tipA if (v1.co.x + v2.co.x)*0.5 > 0.150 else tipB
    try: bm.faces.new([v1, v2, ta])
    except ValueError: pass
try: bm.faces.new([last[0], tipA, tipB, last[3]])
except ValueError: pass
try: bm.faces.new(list(reversed(rings[0])))
except ValueError: pass

# round-ish gold guard disc
def octo(y, r, xc=0.0):
    return [bm.verts.new((xc + r*math.cos(a), y, r*math.sin(a)))
            for a in [k*math.pi/4 + math.pi/8 for k in range(8)]]
gtop = octo(0.078, 0.072); gbot = octo(0.060, 0.076)   # rev2: flat wide disc guard
for i in range(8):
    bm.faces.new([gtop[i], gtop[(i+1)%8], gbot[(i+1)%8], gbot[i]])
bm.faces.new(list(reversed(gtop))); bm.faces.new(gbot)

# grip spanning the origin + gold pommel
g0 = octo(0.052, 0.020); g1 = octo(-0.062, 0.018)
for i in range(8):
    bm.faces.new([g0[i], g0[(i+1)%8], g1[(i+1)%8], g1[i]])
p1 = octo(-0.078, 0.040); p2 = octo(-0.104, 0.026)
for a, b in [(g1, p1), (p1, p2)]:
    for i in range(8):
        bm.faces.new([a[i], a[(i+1)%8], b[(i+1)%8], b[i]])
pcap = bm.verts.new((0, -0.114, 0))
for i in range(8):
    bm.faces.new([p2[i], p2[(i+1)%8], pcap])

bm.normal_update(); bm.to_mesh(mesh); bm.free()
obj = bpy.data.objects.new("gear_scimitar", mesh)
bpy.context.scene.collection.objects.link(obj)
for m in MATS: obj.data.materials.append(m)
for p in obj.data.polygons: p.use_smooth = False

for poly in obj.data.polygons:
    c = poly.center
    if c.y <= 0.085 and abs(c.x) < 0.075 and c.y > -0.115:
        # hilt zone: guard gold, grip leather, pommel gold
        if c.y > 0.05 or c.y < -0.062: poly.material_index = 2
        else:                          poly.material_index = 3
    else:
        # blade: edge strip on +x flank, body dark
        xc = 0.0
        for (y, x0, w) in params:
            if c.y <= y: xc = x0; break
            xc = x0
        poly.material_index = 1 if (c.x - xc) > 0.032 else 0

mesh.update()
print("scimitar tris", sum(len(p.vertices)-2 for p in obj.data.polygons))

obj.data.transform(Matrix.Rotation(-math.pi/2, 4, 'X'))   # blade -> glTF -Y family convention
obj.data.update()
root = bpy.data.objects.new("gear_scimitar_v1", None)
bpy.context.scene.collection.objects.link(root)
obj.parent = root
for o in bpy.data.objects: o.select_set(False)
root.select_set(True); obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_format='GLB',
                          export_apply=True, export_yup=True)
print("exported", os.path.getsize(OUT))
