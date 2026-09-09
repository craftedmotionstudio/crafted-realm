# greatsword_build.py — Crafted Realm greatsword / 2h (set 2). Longsword recipe
# scaled up: broad single-tone DARK blade with SHARP point, wide gold guard,
# LONG two-hand leather grip, gold pommel. Blade authored +Y (spec-driven),
# bake +90X. exec(open(this).read())
import bpy, bmesh, math, os
from mathutils import Matrix

OUT = r"C:\Users\iQwaZ\OneDrive\Desktop\craftedrealms-claude\assets\models\props\gear_greatsword_v1.glb"
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
        mk_mat("CR_GEAR_GRIP", 0x4a3520)]

mesh = bpy.data.meshes.new("gear_greatsword"); bm = bmesh.new()
def quad(a,b,c,d,mi): f=bm.faces.new([a,b,c,d]); f.material_index=mi; return f
def tri(a,b,c,mi): f=bm.faces.new([a,b,c]); f.material_index=mi; return f

# blade: near-flat 10-vert profile (fuller depth ~1 → single-plane read; lesson:
# contrast stripes read as "two swords")
def ring(y, w, t):
    f=0.95
    pts=[( w,y,0),(0.5*w,y,t),(0.14*w,y,f*t),(-0.14*w,y,f*t),(-0.5*w,y,t),
         (-w,y,0),(-0.5*w,y,-t),(-0.14*w,y,-f*t),(0.14*w,y,-f*t),(0.5*w,y,-t)]
    return [bm.verts.new(p) for p in pts]
T=0.024
rings=[ring(0.11,0.085,T),ring(0.38,0.082,T),ring(0.65,0.074,T*0.95),
       ring(0.90,0.062,T*0.85),ring(1.06,0.046,T*0.7)]
for A,B in zip(rings,rings[1:]):
    for i in range(10): quad(A[i],A[(i+1)%10],B[(i+1)%10],B[i],0)
last=rings[-1]
tipA=bm.verts.new((0.014,1.10,0)); tipB=bm.verts.new((-0.014,1.15,0))   # SHARP point
for i in range(10):
    v1,v2=last[i],last[(i+1)%10]
    ta=tipA if (v1.co.x+v2.co.x)*0.5>0 else tipB
    try: tri(v1,v2,ta,0)
    except ValueError: pass
try: quad(last[0],tipA,tipB,last[5],0)
except ValueError: pass
try: bm.faces.new(list(reversed(rings[0]))).material_index=0
except ValueError: pass

# wide gold crossguard with dropped quillon tips (welded across the blade base)
gx=[(-0.175,0.055,0.012,0.024,-0.016),(-0.105,0.062,0.046,0.038,0.0),
    (0.105,0.062,0.046,0.038,0.0),(0.175,0.055,0.012,0.024,-0.016)]
gr=[]
for (x,ylo,yh,zt,dy) in gx:
    y0=ylo+dy; y1=ylo+yh+dy
    gr.append([bm.verts.new((x,y0,-zt)),bm.verts.new((x,y0,zt)),
               bm.verts.new((x,y1,zt)),bm.verts.new((x,y1,-zt))])
for A,B in zip(gr,gr[1:]):
    for i in range(4): quad(A[i],A[(i+1)%4],B[(i+1)%4],B[i],1)
bm.faces.new(list(reversed(gr[0]))).material_index=1
bm.faces.new(gr[-1]).material_index=1

# LONG two-hand grip spanning the origin + gold pommel
def octo(y,r):
    return [bm.verts.new((r*math.cos(a),y,r*math.sin(a)))
            for a in [k*math.pi/4+math.pi/8 for k in range(8)]]
g0=octo(0.055,0.024); g1=octo(-0.015,0.022); g1b=octo(-0.025,0.027); g2=octo(-0.105,0.022)
for A,B in [(g0,g1),(g1,g1b),(g1b,g2)]:
    for i in range(8): quad(A[i],A[(i+1)%8],B[(i+1)%8],B[i],2)
p1=octo(-0.12,0.045); p2=octo(-0.155,0.028)
for A,B in [(g2,p1),(p1,p2)]:
    for i in range(8): quad(A[i],A[(i+1)%8],B[(i+1)%8],B[i],1)
pc=bm.verts.new((0,-0.168,0))
for i in range(8): tri(p2[i],p2[(i+1)%8],pc,1)

bm.normal_update(); bm.to_mesh(mesh); bm.free()
obj=bpy.data.objects.new("gear_greatsword",mesh); bpy.context.scene.collection.objects.link(obj)
for m in MATS: obj.data.materials.append(m)
for p in obj.data.polygons: p.use_smooth=False
mesh.update()
print("greatsword tris", sum(len(p.vertices)-2 for p in obj.data.polygons))
obj.data.transform(Matrix.Rotation(math.pi/2,4,'X'))   # blade +Y -> glTF +Y
obj.data.update()
root=bpy.data.objects.new("gear_greatsword_v1",None); bpy.context.scene.collection.objects.link(root)
obj.parent=root
for o in bpy.data.objects: o.select_set(False)
root.select_set(True); obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT,use_selection=True,export_format='GLB',
                          export_apply=True,export_yup=True)
print("exported",os.path.getsize(OUT))
