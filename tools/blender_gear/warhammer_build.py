# warhammer_build.py — Crafted Realm warhammer (set 2). Massive block head
# WELDED onto the haft (haft passes through it), gold bands, light strike faces.
# Grip at origin, head +Y, bake +90X. exec(open(this).read())
import bpy, bmesh, math, os
from mathutils import Matrix

OUT = r"C:\Users\iQwaZ\OneDrive\Desktop\craftedrealms-claude\assets\models\props\gear_warhammer_v1.glb"
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

MATS = [mk_mat("CR_GEAR_METAL_DARK", 0x6e5430), mk_mat("CR_GEAR_METAL_EDGE", 0xd8c090),
        mk_mat("CR_GEAR_GOLD", 0xd8b13c), mk_mat("WARHAMMER_WOOD", 0x6b4426),
        mk_mat("CR_GEAR_GRIP", 0x4a3520)]

mesh = bpy.data.meshes.new("gear_warhammer"); bm = bmesh.new()
def quad(a,b,c,d,mi): f=bm.faces.new([a,b,c,d]); f.material_index=mi; return f
def tri(a,b,c,mi): f=bm.faces.new([a,b,c]); f.material_index=mi; return f
def octo(y,r):
    return [bm.verts.new((r*math.cos(a), y, r*math.sin(a)))
            for a in [k*math.pi/4+math.pi/8 for k in range(8)]]
def tube(rings, mi):
    for A,B in zip(rings, rings[1:]):
        for i in range(8): quad(A[i],A[(i+1)%8],B[(i+1)%8],B[i],mi)
def capf(ring_, y, mi, flip=False):
    c=bm.verts.new((0,y,0))
    for i in range(8):
        if flip: tri(ring_[i],ring_[(i+1)%8],c,mi)
        else: tri(ring_[(i+1)%8],ring_[i],c,mi)
def box(cx,cy,cz,sx,sy,sz,mi,mi_ends=None):
    xs=(cx-sx/2,cx+sx/2); ys=(cy-sy/2,cy+sy/2); zs=(cz-sz/2,cz+sz/2); v={}
    for i,x in enumerate(xs):
        for j,y in enumerate(ys):
            for k,z in enumerate(zs): v[(i,j,k)]=bm.verts.new((x,y,z))
    F=[([(0,0,0),(0,1,0),(0,1,1),(0,0,1)],True),([(1,0,0),(1,0,1),(1,1,1),(1,1,0)],True),
       ([(0,0,0),(0,0,1),(1,0,1),(1,0,0)],False),([(0,1,0),(1,1,0),(1,1,1),(0,1,1)],False),
       ([(0,0,0),(1,0,0),(1,1,0),(0,1,0)],False),([(0,0,1),(0,1,1),(1,1,1),(1,0,1)],False)]
    for f,is_end in F:
        quad(v[f[0]],v[f[1]],v[f[2]],v[f[3]], (mi_ends if (is_end and mi_ends is not None) else mi))

# haft: wood, grip sleeve at origin, gold band under the head
h=[octo(-0.14,0.024),octo(-0.06,0.022),octo(0.06,0.022),octo(0.30,0.022),octo(0.42,0.024)]
tube(h,3); capf(h[0],-0.14,3,flip=True)
g=[octo(-0.065,0.027),octo(0.065,0.027)]; tube(g,4)
b1=[octo(0.36,0.032),octo(0.395,0.032)]; tube(b1,2); capf(b1[0],0.36,2,flip=True); capf(b1[1],0.395,2)
# block head — haft runs INTO it (top of haft at 0.42 is inside the block)
box(0,0.485,0,0.30,0.155,0.15,0,mi_ends=1)   # strike ends (x faces) lighter
# top cap stub above the block
t=[octo(0.5625,0.020),octo(0.60,0.018)]; tube(t,3); capf(t[1],0.60,3)
# gold pommel
p=[octo(-0.14,0.022),octo(-0.165,0.034),octo(-0.195,0.020)]
tube(p,2); capf(p[-1],-0.195,2)

bm.normal_update(); bm.to_mesh(mesh); bm.free()
obj=bpy.data.objects.new("gear_warhammer",mesh); bpy.context.scene.collection.objects.link(obj)
for m in MATS: obj.data.materials.append(m)
for p2 in obj.data.polygons: p2.use_smooth=False
mesh.update()
print("warhammer tris", sum(len(p2.vertices)-2 for p2 in obj.data.polygons))
obj.data.transform(Matrix.Rotation(math.pi/2,4,'X'))
obj.data.update()
root=bpy.data.objects.new("gear_warhammer_v1",None); bpy.context.scene.collection.objects.link(root)
obj.parent=root
for o in bpy.data.objects: o.select_set(False)
root.select_set(True); obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT,use_selection=True,export_format='GLB',
                          export_apply=True,export_yup=True)
print("exported",os.path.getsize(OUT))
