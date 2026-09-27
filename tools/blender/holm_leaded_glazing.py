"""Leaded glazing for Tutor's Holm windows (owner review 4, 2026-09-27: the Guide House "doesn't really look like there's
window panes/glass installed").

A 2004 window reads as glass because it is tinted and crossed by leads: each light gets a thin pane of pale green-grey glass
(semi-transparent, so the room shows through from outside and the day from inside), a lead came round its edge and a
diamond lattice of cames on both faces. Built in plan coordinates through the building script's own prism()/beam()
helpers (passed in B), named by the caller so the panes join the shell part they belong to (they hide with it).
Original design; no reference geometry."""
import bpy


def materials():
    """The pale tinted glass (alpha blended in the glTF) and the dark lead cames."""
    g = bpy.data.materials.get('Leaded glass pane')
    if g is None:
        g = bpy.data.materials.new('Leaded glass pane'); g.use_nodes = True
        sh = next(n for n in g.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        col = (.62, .72, .68, 1.0)
        sh.inputs['Base Color'].default_value = col; sh.inputs['Roughness'].default_value = 1.0; sh.inputs['Metallic'].default_value = 0.0
        sh.inputs['Alpha'].default_value = .38; g.diffuse_color = (col[0], col[1], col[2], .38)
        for attr, val in (('blend_method', 'BLEND'), ('surface_render_method', 'BLENDED')):
            try: setattr(g, attr, val)
            except Exception: pass
        try: g.use_backface_culling = False
        except Exception: pass
    lead = bpy.data.materials.get('Window lead iron')
    if lead is None:
        lead = bpy.data.materials.new('Window lead iron'); lead.diffuse_color = (.16, .17, .17, 1); lead.roughness = 1.0; lead.metallic = 0.0
    return g, lead


def _clip(p, d, u0, u1, v0, v1):
    """The part of the line p + t d inside the rectangle (Liang-Barsky), or None."""
    t0, t1 = -1e9, 1e9
    for pc, dc, lo, hi in ((p[0], d[0], u0, u1), (p[1], d[1], v0, v1)):
        if abs(dc) < 1e-12:
            if pc < lo or pc > hi: return None
            continue
        a, b = (lo - pc) / dc, (hi - pc) / dc
        t0, t1 = max(t0, min(a, b)), min(t1, max(a, b))
    if t1 - t0 < 1e-6: return None
    return (p[0] + d[0] * t0, p[1] + d[1] * t0), (p[0] + d[0] * t1, p[1] + d[1] * t1)


def light(B, name, axis, plane, u0, u1, v0, v1, dw=.2, dh=.28, pane=.012):
    """One glazed light: axis 'x' = the wall runs along x at z=plane; 'z' = along z at x=plane. u along the wall, v up.
    The pane is a thin slab; the cames are flat strips laid on both faces (two triangles a strip a face)."""
    glass, lead = materials()
    P = B['prism']; mesh = B['mesh']
    out = []
    if axis == 'x': out.append(P(name, u0, u1, v0, v1, plane - pane / 2, plane + pane / 2, glass))
    else: out.append(P(name, plane - pane / 2, plane + pane / 2, v0, v1, u0, u1, glass))
    V = []; F = []
    def strip(a, b, wid):
        du, dv = b[0] - a[0], b[1] - a[1]; L = (du * du + dv * dv) ** .5
        if L < .03: return
        nu, nv = -dv / L * wid / 2, du / L * wid / 2
        for off in (-pane / 2 - .003, pane / 2 + .003):
            q = [(a[0] + nu, a[1] + nv), (b[0] + nu, b[1] + nv), (b[0] - nu, b[1] - nv), (a[0] - nu, a[1] - nv)]
            k = len(V)
            for u, v in q: V.append((u, v, plane + off) if axis == 'x' else (plane + off, v, u))
            F.append((k, k + 1, k + 2, k + 3) if off > 0 else (k + 3, k + 2, k + 1, k))
    for a, b in (((u0, v0), (u1, v0)), ((u1, v0), (u1, v1)), ((u1, v1), (u0, v1)), ((u0, v1), (u0, v0))):
        strip(a, b, .03)
    w, h = u1 - u0, v1 - v0
    n = int(w / dw + h / dh) + 3
    for sgn in (1, -1):
        d = (sgn * dw, dh)   # rising to the right (1) or to the left (-1); lines dw apart along the sill
        for k in range(-n, n + 1):
            seg = _clip((u0 + dw / 2 + k * dw, v0), d, u0, u1, v0, v1)
            if seg: strip(seg[0], seg[1], .014)
    if F: out.append(mesh(name, V, F, lead))
    return out


def window(B, name, axis, plane, a, b, v0, v1, mullion=None, **kw):
    """A window opening from u=a to b, v0 to v1, glazed as one or two lights either side of a mullion (half width)."""
    if mullion is None:
        return light(B, name, axis, plane, a, b, v0, v1, **kw)
    m = (a + b) / 2
    return light(B, name, axis, plane, a, m - mullion, v0, v1, **kw) + light(B, name, axis, plane, m + mullion, b, v0, v1, **kw)


def lead_faces(obj, name, dw=.2, dh=.28, off=.004):
    """Lay lead cames (an edge came and a diamond lattice, both faces) over every four-sided pane of an existing glazing
    mesh, as a new mesh object `name` beside it (same parent and transform). Works in the mesh's own coordinates."""
    import bmesh
    from mathutils import Vector
    lead = materials()[1]
    V = []; F = []
    me = obj.data
    def strip(o, uvec, vvec, n, a, b, wid):
        du, dv = b[0] - a[0], b[1] - a[1]; L = (du * du + dv * dv) ** .5
        if L < .03: return
        nu, nv = -dv / L * wid / 2, du / L * wid / 2
        for side in (-1, 1):
            q = [(a[0] + nu, a[1] + nv), (b[0] + nu, b[1] + nv), (b[0] - nu, b[1] - nv), (a[0] - nu, a[1] - nv)]
            k = len(V)
            for u, v in q: V.append(o + uvec * u + vvec * v + n * (side * off))
            F.append((k, k + 1, k + 2, k + 3) if side > 0 else (k + 3, k + 2, k + 1, k))
    for p in me.polygons:
        if len(p.vertices) != 4: continue
        P = [me.vertices[i].co.copy() for i in p.vertices]
        n = p.normal.copy()
        up = Vector((0, 0, 1))   # Blender up
        vvec = (up - n * up.dot(n))
        if vvec.length < 1e-4: continue   # a horizontal pane: skip
        vvec.normalize(); uvec = vvec.cross(n).normalized()
        o = P[0]; us = [(q - o).dot(uvec) for q in P]; vs = [(q - o).dot(vvec) for q in P]
        u0, u1, v0, v1 = min(us), max(us), min(vs), max(vs)
        if u1 - u0 < .08 or v1 - v0 < .08: continue
        for a, b in (((u0, v0), (u1, v0)), ((u1, v0), (u1, v1)), ((u1, v1), (u0, v1)), ((u0, v1), (u0, v0))):
            strip(o, uvec, vvec, n, a, b, .03)
        w, h = u1 - u0, v1 - v0; nn = int(w / dw + h / dh) + 3
        for sgn in (1, -1):
            d = (sgn * dw, dh)
            for k in range(-nn, nn + 1):
                seg = _clip((u0 + dw / 2 + k * dw, v0), d, u0, u1, v0, v1)
                if seg: strip(o, uvec, vvec, n, seg[0], seg[1], .014)
    if not F: return None
    data = bpy.data.meshes.new(name); data.from_pydata([tuple(v) for v in V], [], F); data.update()
    ob = bpy.data.objects.new(name, data); bpy.context.collection.objects.link(ob)
    ob.parent = obj.parent; ob.matrix_world = obj.matrix_world.copy(); data.materials.append(lead)
    return ob
