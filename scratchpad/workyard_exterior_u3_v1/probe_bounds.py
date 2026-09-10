import bpy, json
from mathutils import Vector
root = bpy.data.objects.get("workyard_exterior_u3_v1")
rows = []
def walk(o):
    if o.type == "MESH":
        pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
        rows.append((o.name, round(max(p.z for p in pts), 3), round(min(p.z for p in pts), 3)))
    for c in o.children:
        walk(c)
walk(root)
rows.sort(key=lambda r: -r[1])
for r in rows[:8]:
    print("TOPZ", r)
