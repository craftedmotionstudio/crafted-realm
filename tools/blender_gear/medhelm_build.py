# medhelm_build.py — Crafted Realm med helm (set 2). OPEN-FACE skull cap: round
# dome + brow rim + side/back skirt, the FACE stays visible (no head collapse in
# fx — model 'medhelm' seats on the head). One shell bronze (no off-color
# extrusions), nothing hovering off the curve. Face +Z, bake +90X.
# exec(open(this).read())
import bpy, bmesh, math, os
from mathutils import Matrix

OUT = r"C:\Users\iQwaZ\OneDrive\Desktop\craftedrealms-claude\assets\models\props\gear_medhelm_v1.glb"
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

MATS = [mk_mat("CR_GEAR_METAL_DARK", 0x6e5430),
        mk_mat("MEDHELM_BAND", 0x3a5aad),   # owner r7: blue halo band, like the reference's red ring
        mk_mat("MEDHELM_EYE", 0x140d06)]    # owner r8: dark eye holes in the built-in "glasses"

mesh = bpy.data.meshes.new("gear_medhelm"); bm = bmesh.new()
def quad(a,b,c,d,mi=0): f=bm.faces.new([a,b,c,d]); f.material_index=mi; return f
def tri(a,b,c,mi=0): f=bm.faces.new([a,b,c]); f.material_index=mi; return f
def ring(y, r):
    return [bm.verts.new((r*math.sin(a), y, r*math.cos(a)))
            for a in [k*math.pi/4 + math.pi/8 for k in range(8)]]

# dome down to a flared brow rim (full 360)
R=[(0.300,0.050),(0.272,0.120),(0.205,0.182),(0.115,0.215),(0.030,0.226),(0.000,0.245)]
rings=[ring(y,r) for (y,r) in R]
for A,B in zip(rings,rings[1:]):
    for i in range(8): quad(A[i],A[(i+1)%8],B[(i+1)%8],B[i])
cap=bm.verts.new((0,0.328,0))
for i in range(8): tri(rings[0][(i+1)%8],rings[0][i],cap)
# rim underside back to the skull line
under=ring(-0.015,0.226)
for i in range(8): quad(rings[-1][i],rings[-1][(i+1)%8],under[(i+1)%8],under[i])
# side/back skirt ONLY — the FRONT three segments stay open (face visible)
skirt=ring(-0.125,0.212)
FRONT={6,7,0}   # +Z-facing octagon segments (verts 6-7, 7-0, 0-1)
for i in range(8):
    if i in FRONT: continue
    quad(under[i],under[(i+1)%8],skirt[(i+1)%8],skirt[i])
# close the two skirt side-edges so the open front reads as cut metal, not paper
for i in (6,1):   # leading edges of the opening
    e_top,e_bot=under[i],skirt[i]
    inn=bm.verts.new((e_top.co.x*0.92,e_top.co.y,e_top.co.z*0.92))
    inb=bm.verts.new((e_bot.co.x*0.92,e_bot.co.y,e_bot.co.z*0.92))
    quad(e_top,e_bot,inb,inn) if i==6 else quad(e_bot,e_top,inn,inb)
# thin inner skirt shell so the back doesn't show as single-sided from the front
skirt_in_top=ring(-0.015,0.205); skirt_in_bot=ring(-0.125,0.192)
for i in range(8):
    if i in FRONT: continue
    quad(skirt_in_bot[i],skirt_in_bot[(i+1)%8],skirt_in_top[(i+1)%8],skirt_in_top[i])

# blue HALO band around the upper dome (owner r7 — like the reference's red ring),
# slightly proud of the shell all the way around
band_t=ring(0.170,0.203); band_b=ring(0.115,0.226)
for i in range(8):
    quad(band_t[i],band_t[(i+1)%8],band_b[(i+1)%8],band_b[i],1)

# owner r8: "built-in glasses" — the FRONT of the rim extends down over the eyes
# in the SAME bronze, with two dark eye holes (open-face motorcycle-helmet read)
# pushed OUT past the face (r 0.212 sat inside the head and vanished)
eyeband=ring(-0.100,0.245)
for i in FRONT:
    quad(under[i],under[(i+1)%8],eyeband[(i+1)%8],eyeband[i])
# close the eye-band bottom edge inward slightly so it reads as solid metal
eyeband_in=ring(-0.100,0.225)
for i in FRONT:
    quad(eyeband[i],eyeband[(i+1)%8],eyeband_in[(i+1)%8],eyeband_in[i])
# two near-flush dark eye holes on the front plane
def eyehole(cx):
    zf=0.232   # just proud of the pushed-out front face
    a=bm.verts.new((cx-0.030,-0.028,zf)); b=bm.verts.new((cx+0.030,-0.028,zf))
    c=bm.verts.new((cx+0.030,-0.062,zf)); d=bm.verts.new((cx-0.030,-0.062,zf))
    quad(a,b,c,d,2)
eyehole(-0.068); eyehole(0.068)

bm.normal_update(); bm.to_mesh(mesh); bm.free()
obj=bpy.data.objects.new("gear_medhelm",mesh); bpy.context.scene.collection.objects.link(obj)
for m in MATS: obj.data.materials.append(m)
# owner r8: fewer visible flat facets ON TOP — smooth-shade the dome, keep the
# rim/skirt/eye band crisp flat
for p in obj.data.polygons:
    p.use_smooth = (p.center.y > 0.03)
mesh.update()
print("medhelm tris", sum(len(p.vertices)-2 for p in obj.data.polygons))
obj.data.transform(Matrix.Rotation(math.pi/2,4,'X'))   # top +Y, face +Z -> glTF
obj.data.update()
root=bpy.data.objects.new("gear_medhelm_v1",None); bpy.context.scene.collection.objects.link(root)
obj.parent=root
for o in bpy.data.objects: o.select_set(False)
root.select_set(True); obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT,use_selection=True,export_format='GLB',
                          export_apply=True,export_yup=True)
print("exported",os.path.getsize(OUT))
