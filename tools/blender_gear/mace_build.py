# mace_build.py — Crafted Realm mace (set 2). Flanged head WELDED through the
# haft, gold collar + pommel. Grip at origin, head +Y (spec-driven axis),
# bake +90X on export. exec(open(this).read())
import bpy, bmesh, math, os
from mathutils import Matrix

OUT = r"C:\Users\iQwaZ\OneDrive\Desktop\craftedrealms-claude\assets\models\props\gear_mace_v1.glb"
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

MATS = [mk_mat("CR_GEAR_METAL_DARK", 0x6e5430), mk_mat("CR_GEAR_GOLD", 0xd8b13c),
        mk_mat("MACE_WOOD", 0x6b4426), mk_mat("CR_GEAR_GRIP", 0x4a3520)]

mesh = bpy.data.meshes.new("gear_mace"); bm = bmesh.new()
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

# haft (wood) with leather grip zone around the origin
h=[octo(-0.12,0.022),octo(-0.06,0.020),octo(0.06,0.020),octo(0.30,0.020),octo(0.40,0.022)]
tube(h,2); capf(h[0],-0.12,2,flip=True)
g=[octo(-0.062,0.024),octo(0.062,0.024)]; tube(g,3)   # grip sleeve over the haft
# gold collar where the head meets the haft (welds the join visually)
c=[octo(0.40,0.034),octo(0.435,0.034)]; tube(c,1); capf(c[0],0.40,1,flip=True); capf(c[1],0.435,1)
# head: SPIKED BALL (owner r8 — morning-star): round octo-ring ball with spikes
# radiating THROUGH the surface, all welded by construction
CY=0.515   # ball centre height
k=[octo(CY-0.075,0.030),octo(CY-0.052,0.062),octo(CY,0.080),octo(CY+0.052,0.062),octo(CY+0.075,0.030)]
tube(k,0); capf(k[0],CY-0.075,0,flip=True); capf(k[-1],CY+0.075,0)
import mathutils
def spike(dirv, ln=0.145, hw=0.020):
    d=mathutils.Vector(dirv).normalized()
    u=d.cross(mathutils.Vector((0,1,0)))
    if u.length<1e-4: u=mathutils.Vector((1,0,0))
    u.normalize(); v=d.cross(u)
    c=mathutils.Vector((0,CY,0))+d*0.055          # base sunk into the ball
    bpts=[c+u*hw+v*hw, c-u*hw+v*hw, c-u*hw-v*hw, c+u*hw-v*hw]
    bv=[bm.verts.new(tuple(p)) for p in bpts]
    apex=bm.verts.new(tuple(mathutils.Vector((0,CY,0))+d*ln))
    for i in range(4): tri(bv[i],bv[(i+1)%4],apex,0)
    tri(bv[2],bv[1],bv[0],0); tri(bv[3],bv[2],bv[0],0)
# spikes: top, 4 equatorial, 4 upper-diagonal, 4 lower-diagonal
spike((0,1,0), ln=0.16)
for ang in (0, math.pi/2, math.pi, 3*math.pi/2):
    spike((math.cos(ang),0,math.sin(ang)))
for ang in (math.pi/4, 3*math.pi/4, 5*math.pi/4, 7*math.pi/4):
    spike((math.cos(ang)*0.75, 0.65, math.sin(ang)*0.75))
    spike((math.cos(ang)*0.85,-0.45, math.sin(ang)*0.85), ln=0.125)
# gold pommel
p=[octo(-0.12,0.020),octo(-0.145,0.032),octo(-0.175,0.020)]
tube(p,1); capf(p[-1],-0.175,1)

bm.normal_update(); bm.to_mesh(mesh); bm.free()
obj=bpy.data.objects.new("gear_mace",mesh); bpy.context.scene.collection.objects.link(obj)
for m in MATS: obj.data.materials.append(m)
for p2 in obj.data.polygons: p2.use_smooth=False
mesh.update()
print("mace tris", sum(len(p2.vertices)-2 for p2 in obj.data.polygons))
obj.data.transform(Matrix.Rotation(math.pi/2,4,'X'))   # +Y head -> glTF +Y
obj.data.update()
root=bpy.data.objects.new("gear_mace_v1",None); bpy.context.scene.collection.objects.link(root)
obj.parent=root
for o in bpy.data.objects: o.select_set(False)
root.select_set(True); obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT,use_selection=True,export_format='GLB',
                          export_apply=True,export_yup=True)
print("exported",os.path.getsize(OUT))
