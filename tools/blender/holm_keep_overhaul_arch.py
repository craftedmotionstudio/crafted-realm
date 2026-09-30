"""Warden's Keep overhaul (owner review 2026-09-29): the architecture kit.

Everything is authored in keep-local plan coordinates (x east, y up, z south; metres = tiles) and mapped to Blender
(x, -z, y) when a part is built, like every Holm building script. Walls stand centred on the tile grid lines, 0.38 thick,
so the tile centres beside them keep the 0.31 m of clearance the keep's measured walk graph has always had.

 - Arch: an architecture part. Its materials are the keep's own textured ones (the fieldstone, dressed stone, aged oak and
   warm shingles the island already knows, appended from the model that ships) and each face gets planar UVs in world
   metres at that material's scale (0.42 a metre, as the keep's walls always had). No vertex colour.
 - wall / octagon faces with openings (doors, windows, loops) cut by grid subdivision: true voids, no booleans.
 - lancet(): a stained-glass window: a pointed light of tinted panes (ruby, cobalt, amber, green round a pale field and
   a medallion) with lead cames on both faces, translucent (alpha-blended in the glTF), in a dressed-stone surround.
 - door_leaf(): a real planked leaf with ledges, a brace, strap hinges and a ring, on its own pivot empty at the hinge
   (the glTF node the door turns about). It stands open as modelled; the pivot carries the closed and open yaw.
Original designs only."""
import bpy, bmesh, math
from mathutils import Vector
import holm_interior_kit as K
from holm_interior_kit import Acc

T8 = math.tan(math.pi / 8)
C8 = math.cos(math.pi / 8)
WALL = .38


# ------------------------------------------------------------------ materials
def append_materials(blend, names):
    """Append the named materials (and their packed images) from another .blend."""
    have = {m.name for m in bpy.data.materials}
    want = [n for n in names if n not in have]
    if want:
        with bpy.data.libraries.load(str(blend), link=False) as (src, dst):
            dst.materials = [n for n in src.materials if n in want]
    out = {}
    for n in names:
        m = bpy.data.materials.get(n)
        assert m is not None, 'material not found in ' + str(blend) + ': ' + n
        out[n] = m
    return out


def flat(name, hexcol, alpha=None, emit=None):
    """A matte node material (the glTF exporter reads the Principled node), optionally alpha-blended or glowing."""
    m = bpy.data.materials.get(name)
    if m is not None:
        return m
    c = K.srgb(hexcol)
    m = bpy.data.materials.new(name); m.use_nodes = True
    sh = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    sh.inputs['Base Color'].default_value = (*c, 1); sh.inputs['Roughness'].default_value = 1.0; sh.inputs['Metallic'].default_value = 0.0
    m.diffuse_color = (*c, 1 if alpha is None else alpha)
    if alpha is not None:
        sh.inputs['Alpha'].default_value = alpha
        for attr, val in (('blend_method', 'BLEND'), ('surface_render_method', 'BLENDED')):
            try: setattr(m, attr, val)
            except Exception: pass
        try: m.use_backface_culling = False
        except Exception: pass
    if emit:
        sh.inputs['Emission Color'].default_value = (*c, 1); sh.inputs['Emission Strength'].default_value = emit
    return m


def stained_glass_material(alpha=.62):
    """Stained glass: the pane's colour is its vertex colour (a ruby, cobalt, amber or green quarry), alpha-blended."""
    name = 'Keep stained glass'
    m = bpy.data.materials.get(name)
    if m is not None:
        return m
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    sh = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    sh.inputs['Roughness'].default_value = 1.0; sh.inputs['Metallic'].default_value = 0.0; sh.inputs['Alpha'].default_value = alpha
    vc = nt.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'Col'
    nt.links.new(vc.outputs['Color'], sh.inputs['Base Color'])
    m.diffuse_color = (1, 1, 1, alpha)
    for attr, val in (('blend_method', 'BLEND'), ('surface_render_method', 'BLENDED')):
        try: setattr(m, attr, val)
        except Exception: pass
    try: m.use_backface_culling = False
    except Exception: pass
    return m


# ------------------------------------------------------------------ parts
class Arch(Acc):
    """An architecture part: its materials used as they are, planar UVs in world metres (SCALE: uv units per metre by
    material name), flat shaded, outward normals. props: custom properties (exported as glTF extras)."""
    SCALE = {}

    def __init__(s, name, props=None):
        Acc.__init__(s, name)
        s.props = props or {}

    def build(s, parent=None, recalc=True):
        if not s.v:
            return None
        me = bpy.data.meshes.new(s.name)
        me.from_pydata([(x, -z, y) for x, y, z in s.v], [], s.f); me.update()
        o = bpy.data.objects.new(s.name, me); bpy.context.collection.objects.link(o)
        for m in s.mats:
            me.materials.append(m)
        me.polygons.foreach_set('material_index', s.fm)
        if recalc:
            bm = bmesh.new(); bm.from_mesh(me)
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            bm.to_mesh(me); bm.free()
        uv = me.uv_layers.new(name='UVMap')
        for p in me.polygons:
            m = me.materials[p.material_index]
            k = Arch.SCALE.get(m.name, .42) if m else .42
            n = p.normal
            if abs(n.z) > .7:
                for li in p.loop_indices:
                    w = me.vertices[me.loops[li].vertex_index].co
                    uv.data[li].uv = (w.x * k, w.y * k)
            else:
                t = Vector((-n.y, n.x, 0))
                t = t.normalized() if t.length > 1e-6 else Vector((1, 0, 0))
                for li in p.loop_indices:
                    w = me.vertices[me.loops[li].vertex_index].co
                    uv.data[li].uv = (w.dot(t) * k, w.z * k)
        me.update()
        for key, val in s.props.items():
            o[key] = val
        if parent is not None:
            o.parent = parent
        K.STATS[s.name] = K.STATS.get(s.name, 0) + sum(len(f) - 2 for f in s.f)
        return o


def prism(A, pts, y0, y1, m, skip_top=False, skip_bottom=False, side_m=None, top_m=None):
    """A vertical prism over a plan polygon [(x, z), ...] (any winding): sides, top and bottom, wound outward (it needs
    no normal recalculation). Repeated points (a clip through a vertex) are dropped."""
    dq = []
    for p in pts:
        if not dq or abs(dq[-1][0] - p[0]) + abs(dq[-1][1] - p[1]) > 1e-6:
            dq.append(p)
    if len(dq) > 1 and abs(dq[0][0] - dq[-1][0]) + abs(dq[0][1] - dq[-1][1]) <= 1e-6:
        dq.pop()
    pts = dq
    n = len(pts)
    if n < 3:
        return
    area = sum(pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1] for i in range(n))
    if area > 0:
        pts = pts[::-1]
    V = [(x, y0, z) for x, z in pts] + [(x, y1, z) for x, z in pts]
    sides = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    if top_m is None and side_m is None:              # one welded piece (shared corners): a closed solid
        F = sides + ([tuple(range(n, 2 * n))] if not skip_top else []) + ([tuple(range(n - 1, -1, -1))] if not skip_bottom else [])
        A.poly(V, F, m)
        return
    if not skip_top:
        A.poly(V, [tuple(range(n, 2 * n))], top_m or m)
    if not skip_bottom:
        A.poly(V, [tuple(range(n - 1, -1, -1))], m)
    A.poly(V, sides, side_m or m)


def quad_prism(A, corners, y0, y1, m, skip=''):
    """A prism over four plan corners (a mitred wall piece)."""
    c = list(corners)
    area = sum(c[i][0] * c[(i + 1) % 4][1] - c[(i + 1) % 4][0] * c[i][1] for i in range(4))
    if area > 0:
        c = c[::-1]
    V = [(x, y0, z) for x, z in c] + [(x, y1, z) for x, z in c]
    F = []
    if 't' not in skip:
        F.append((4, 5, 6, 7))
    if 'b' not in skip:
        F.append((3, 2, 1, 0))
    F += [(i, (i + 1) % 4, 4 + (i + 1) % 4, 4 + i) for i in range(4)]
    A.poly(V, F, m)


# ------------------------------------------------------------------ walls with openings
def grid(a, b, y0, y1, holes):
    """Pieces (s, e, lo, hi) of a wall span a..b, y0..y1 with rectangular holes (s0, s1, h0, h1) left void."""
    cuts = sorted({a, b} | {v for h in holes for v in h[:2] if a < v < b})
    zs = sorted({y0, y1} | {v for h in holes for v in h[2:] if y0 < v < y1})
    out = []
    for s, e in zip(cuts, cuts[1:]):
        for lo, hi in zip(zs, zs[1:]):
            if any(h[0] <= (s + e) / 2 <= h[1] and h[2] <= (lo + hi) / 2 <= h[3] for h in holes):
                continue
            out.append((s, e, lo, hi))
    merged = []
    for p in out:
        if merged and merged[-1][0] == p[0] and merged[-1][1] == p[1] and abs(merged[-1][3] - p[2]) < 1e-9:
            merged[-1] = (p[0], p[1], merged[-1][2], p[3])
        else:
            merged.append(p)
    return merged


def wall(A, axis, fixed, a, b, y0, y1, m, holes=(), thick=WALL, reveal=None):
    """A straight wall: axis 'x' runs along x at z = fixed, 'z' runs along z at x = fixed. holes: (s0, s1, h0, h1) along
    the wall. reveal: a material lining the holes' reveals (dressed stone)."""
    t = thick / 2
    for s, e, lo, hi in grid(a, b, y0, y1, holes):
        if axis == 'x':
            A.box(s, e, lo, hi, fixed - t, fixed + t, m)
        else:
            A.box(fixed - t, fixed + t, lo, hi, s, e, m)
    if reveal is not None:
        for s0, s1, h0, h1 in holes:
            if h1 - h0 < .1:                             # a notch under a doorway above: no lining
                continue
            L = .03
            pcs = [(s0, s0 + L, h0, h1), (s1 - L, s1, h0, h1), (s0 + L, s1 - L, h1 - L, h1)]
            if h0 - max(y0, 0.0) > .5 and h0 % 3.2 > .3:    # a window's sill; a doorway at a floor gets none (it would trip the walk)
                pcs.append((s0 + L, s1 - L, h0, h0 + L))
            for u0, u1, v0, v1 in pcs:
                if axis == 'x':
                    A.box(u0, u1, v0, v1, fixed - t - .004, fixed + t + .004, reveal)
                else:
                    A.box(fixed - t - .004, fixed + t + .004, v0, v1, u0, u1, reveal)


def surround(A, axis, fixed, s0, s1, h0, h1, thick, m, band=.16, proud=.03, faces=(1, -1), sill=True, head=True):
    """A dressed-stone architrave round an opening on one or both faces (+1 = the +z/+x face): jambs, a head, a sill."""
    t = thick / 2
    for side in faces:
        f0 = fixed + side * t
        f1 = f0 + side * proud
        lo, hi = min(f0, f1), max(f0, f1)
        top = h1 + (band if head else 0)
        pieces = [(s0 - band, s0, h0, top), (s1, s1 + band, h0, top)]
        if head:
            pieces.append((s0, s1, h1, h1 + band))
        if sill:
            pieces.append((s0 - band * .6, s1 + band * .6, h0 - band * .7, h0))
        for u0, u1, v0, v1 in pieces:
            if axis == 'x':
                A.box(u0, u1, v0, v1, lo, hi, m)
            else:
                A.box(lo, hi, v0, v1, u0, u1, m)


def crenel(A, axis, fixed, a, b, y, m, parapet=.62, merlon=.6, thick=.36, gap=1.3, merlon_w=.66, cap=None, ports=(), port_sill=.32):
    """A parapet with merlons: a continuous breastwork from y to y+parapet, merlons above it; cap: a coping material.
    ports: (u0, u1) gun ports cut down to port_sill over the walk (a cannon's barrel rides through them)."""
    t = thick / 2
    holes = [(u0, u1, y + port_sill, y + parapet + .2) for u0, u1 in ports]
    for s, e, lo, hi in grid(a, b, y, y + parapet, holes):
        if axis == 'x':
            A.box(s, e, lo, hi, fixed - t, fixed + t, m)
        else:
            A.box(fixed - t, fixed + t, lo, hi, s, e, m)
    if cap is not None:
        for s, e, lo, hi in grid(a, b, y + parapet, y + parapet + .06, holes):
            if axis == 'x':
                A.box(s, e, lo, hi, fixed - t - .03, fixed + t + .03, cap)
            else:
                A.box(fixed - t - .03, fixed + t + .03, lo, hi, s, e, cap)
        for u0, u1 in ports:                       # a dressed sill in each port
            if axis == 'x':
                A.box(u0 + .005, u1 - .005, y + port_sill, y + port_sill + .05, fixed - t - .02, fixed + t + .02, cap)
            else:
                A.box(fixed - t - .02, fixed + t + .02, y + port_sill, y + port_sill + .05, u0 + .005, u1 - .005, cap)
    L = b - a
    n = max(1, int(round(L / gap)))
    base = y + parapet + (.06 if cap is not None else 0)
    for i in range(n):
        c = a + (i + .5) * L / n
        hw = min(merlon_w, L / n * .62) / 2
        if any(c + hw > u0 - .05 and c - hw < u1 + .05 for u0, u1 in ports):
            continue
        if axis == 'x':
            A.box(c - hw, c + hw, base, base + merlon, fixed - t, fixed + t, m)
        else:
            A.box(fixed - t, fixed + t, base, base + merlon, c - hw, c + hw, m)


# ------------------------------------------------------------------ octagonal towers
def oct_face(cx, cz, ap, i):
    """Face i of an octagon of apothem ap: outward normal at i*45 degrees in plan (0 = east, 90 = south). Returns (centre,
    outward normal, tangent, half length at the apothem)."""
    a = math.radians(i * 45)
    nrm = Vector((math.cos(a), math.sin(a)))
    tan = Vector((-math.sin(a), math.cos(a)))
    return Vector((cx, cz)) + nrm * ap, nrm, tan, ap * T8


def oct_poly(cx, cz, r_ap):
    """The octagon of apothem r_ap as a plan polygon (its vertices lie between the faces)."""
    R = r_ap / C8
    return [(cx + R * math.cos(math.radians(i * 45 + 22.5)), cz + R * math.sin(math.radians(i * 45 + 22.5))) for i in range(8)]


def oct_wall(A, cx, cz, ap, i, y0, y1, m, holes=(), thick=.3, reveal=None):
    """One face of an octagonal tower's wall ring, mitred at its corners; holes (u0, u1, h0, h1) along the face (u from
    -half to +half along the face tangent)."""
    c, nrm, tan, half = oct_face(cx, cz, ap, i)
    di, do = ap - thick / 2, ap + thick / 2
    cc = Vector((cx, cz))
    P = lambda d, u: tuple(cc + nrm * d + tan * u)
    for s, e, lo, hi in grid(-half, half, y0, y1, holes):
        ui0 = -di * T8 if abs(s + half) < 1e-6 else s
        uo0 = -do * T8 if abs(s + half) < 1e-6 else s
        ui1 = di * T8 if abs(e - half) < 1e-6 else e
        uo1 = do * T8 if abs(e - half) < 1e-6 else e
        quad_prism(A, [P(di, ui0), P(di, ui1), P(do, uo1), P(do, uo0)], lo, hi, m)
    if reveal is not None:
        for u0, u1, h0, h1 in holes:
            if h1 - h0 < .1:
                continue
            for (a0, a1, v0, v1) in ((u0, u0 + .03, h0, h1), (u1 - .03, u1, h0, h1), (u0 + .03, u1 - .03, h1 - .03, h1)):
                quad_prism(A, [P(di - .004, a0), P(di - .004, a1), P(do + .004, a1), P(do + .004, a0)], v0, v1, reveal)


# ------------------------------------------------------------------ stained glass
GLASS = {'ruby': '#9b2226', 'cobalt': '#23408e', 'amber': '#d39a2c', 'green': '#2f7a45', 'pale': '#d9d3b4',
         'straw': '#e3c56e', 'white': '#efe9d6', 'violet': '#5b3a78'}


def lancet(G, L, T, axis, fixed, s0, s1, y0, y1, thick, lead, trim, design='quarry', seed=0, point=.45):
    """A stained-glass lancet in a wall hole (s0..s1 along the wall, y0..y1): a pointed light whose head is closed by
    two dressed-stone spandrels (T, material trim), the glass a thin slab at the wall's centre plane (G, a vertex-colour
    part on the stained-glass material, translucent) divided into quarries: a ruby and cobalt border, a pale or rich
    field and an amber medallion; lead cames on both faces (L, material lead)."""
    import random
    rng = random.Random(seed)
    w = s1 - s0; cxu = (s0 + s1) / 2
    top_rect = y1 - point * w
    pane = .012

    def P(u, v, off):
        return (u, v, fixed + off) if axis == 'x' else (fixed + off, v, u)
    for side in (-1, 1):
        a = s0 if side < 0 else s1
        tri = [(a, top_rect), (a, y1), (cxu, y1)]
        V = [P(u, v, -thick / 2 + .01) for u, v in tri] + [P(u, v, thick / 2 - .01) for u, v in tri]   # set 1 cm into the reveal
        T.poly(V, [(0, 1, 2), (5, 4, 3), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)], trim)
    cols, rows = (3, 6) if w < 1.0 else (4, 7)
    du = w / cols; dv = (top_rect - y0) / rows

    mid_r = int(rows * .55)

    def colour(ci, ri):
        # a border of ruby and cobalt, a field (cobalt in the rich lights, pale quarries in the plain ones) and a gold
        # medallion with a ruby heart in the middle of the light
        if ci == 0 or ci == cols - 1 or ri == 0:
            return GLASS['ruby' if ri % 2 == 0 else 'cobalt']
        centre = abs((ci + .5) - cols / 2) < .6 * max(1, cols - 2) / 2 + .01
        if centre and ri == mid_r:
            return GLASS['ruby']
        if centre and abs(ri - mid_r) == 1:
            return GLASS['amber']
        if design == 'rich':
            return GLASS['violet' if ri > mid_r + 1 and (ci + ri) % 2 == 0 else 'cobalt']
        return GLASS['white' if (ci + ri) % 2 else 'pale']
    for ri in range(rows):
        for ci in range(cols):
            u0, u1 = s0 + ci * du, s0 + (ci + 1) * du
            v0, v1 = y0 + ri * dv, y0 + (ri + 1) * dv
            _pane(G, P, [(u0, v0), (u1, v0), (u1, v1), (u0, v1)], pane, colour(ci, ri))
    _pane(G, P, [(s0, top_rect), (cxu, top_rect), (cxu, y1)], pane, GLASS['cobalt'])
    _pane(G, P, [(cxu, top_rect), (s1, top_rect), (cxu, y1)], pane, GLASS['ruby'])
    strips = []
    for ci in range(cols + 1):
        u = s0 + ci * du
        strips.append(((u, y0), (u, top_rect), .026 if ci in (0, cols) else .018, .004))
    for ri in range(rows + 1):
        v = y0 + ri * dv
        strips.append(((s0, v), (s1, v), .026 if ri == 0 else .018, .008))
    strips += [((s0, top_rect), (cxu, y1), .026, .012), ((s1, top_rect), (cxu, y1), .026, .016), ((cxu, top_rect), (cxu, y1), .018, .004)]
    for a, b, wid, off in strips:
        _came(L, P, a, b, wid, pane, lead, off)


def _pane(G, P, poly, pane, hexcol):
    """One quarry: a single face at the wall's centre plane (the stained-glass material is double-sided)."""
    m = K.M('Keep glass ' + hexcol, hexcol)
    G.poly([P(u, v, 0.0) for u, v in poly], [tuple(range(len(poly)))], m)


def _came(L, P, a, b, wid, pane, lead, off0=.004):
    """A lead came: a flat strip on each face of the glass, 3 mm proud, each facing out from its own face (the lead
    part is built without recalculating normals, so the winding is set here)."""
    du, dv = b[0] - a[0], b[1] - a[1]
    Ln = math.hypot(du, dv)
    if Ln < .02:
        return
    nu, nv = -dv / Ln * wid / 2, du / Ln * wid / 2
    q = [(a[0] + nu, a[1] + nv), (b[0] + nu, b[1] + nv), (b[0] - nu, b[1] - nv), (a[0] - nu, a[1] - nv)]
    for off in (-off0, off0):
        V = [Vector(P(u, v, off)) for u, v in q]
        nrm = (V[1] - V[0]).cross(V[2] - V[1])
        side = Vector(P(0, 0, 1)) - Vector(P(0, 0, 0))            # the wall's +normal in plan
        if nrm.dot(side) * off < 0:
            V = V[::-1]
        L.poly([tuple(v) for v in V], [(0, 1, 2, 3)], lead)


# ------------------------------------------------------------------ doors
def door_leaf(name, hinge, d_closed, n_room, w, h, y0, mats, props, studs=False, against=False):
    """A door leaf on its own pivot. hinge: plan (x, z) of the hinge line on the room face of the wall; d_closed: plan unit
    vector from the hinge along the doorway (the leaf's closed direction); n_room: plan unit vector into the room it opens
    into. The leaf is modelled standing open (turned 90 degrees into the room, as a 2004 door stands open). Returns
    (pivot empty, leaf object). The pivot is an empty (Keep_[Upper_]DoorPivot_<door>-<leaf>) at the hinge, at the
    threshold's height; its rotation about +y (three.js rotation.y) is the open yaw, and its custom properties carry
    closedYaw / openYaw, the hinge point, the leaf size and the door id, so gameplay code can swing it shut and open.
    mats: dict(oak, oak_d, iron) of props colours."""
    import holm_props_pass_kit as PK
    dc = Vector(d_closed).normalized(); nr = Vector(n_room).normalized()
    yaw = lambda d: math.atan2(-d.y, d.x)
    th_c, th_o = yaw(dc), yaw(nr)
    # the leaf's thickness lies behind it when it stands open (toward its own jamb, away from the doorway), so the
    # doorway keeps its full width for the walk; shut, the leaf hangs on the room face of the wall
    sgn = -1.0 if Vector((-nr.y, nr.x)).dot(dc) > 0 else 1.0
    if against:                                      # a gate leaf opened flat against the passage wall: its back to the wall
        sgn = -sgn
    t = .07
    P = PK.Part(name)
    oak, oak_d, iron = mats['oak'], mats['oak_d'], mats['iron']

    def box(x0, x1, yy0, yy1, z0, z1, m):
        a, b = sorted((sgn * z0, sgn * z1))
        P.box(x0, x1, yy0, yy1, a, b, m)
    n = max(3, int(round(w / .2)))
    pw = w / n
    for k in range(n):
        box(k * pw + .003, (k + 1) * pw - .003, 0, h, 0.0, t, oak if k % 2 == 0 else oak_d)
    box(.03, w - .03, .03, h - .03, .015, t - .015, oak_d)
    for yy in (.28, h * .5, h - .32):
        box(.04, w - .04, yy - .07, yy + .07, t, t + .035, oak_d)
    bl = Vector((.1, .38)); tr = Vector((w - .1, h * .5 - .1))
    dd = (tr - bl).normalized(); nn = Vector((-dd.y, dd.x)) * .045
    q = [bl + nn, tr + nn, tr - nn, bl - nn]
    V = [(p.x, p.y, sgn * t) for p in q] + [(p.x, p.y, sgn * (t + .03)) for p in q]
    F = [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    P.poly(V, F if sgn > 0 else [f[::-1] for f in F], oak_d)
    for yy in (.34, h - .38):
        box(-.01, w * .7, yy - .035, yy + .035, -.006, .012, iron)
        box(w * .7, w * .76, yy - .05, yy + .05, -.006, .012, iron)
        box(w * .76, w * .8, yy - .022, yy + .022, -.006, .012, iron)
        box(-.035, .02, yy - .07, yy + .07, -.02, t + .03, iron)
    if studs:
        for yy in (.75, 1.25, 1.75, 2.25):
            if yy < h - .5:
                for k in range(n):
                    cxs = k * pw + pw / 2
                    box(cxs - .02, cxs + .02, yy - .02, yy + .02, -.014, .012, iron)
    rx = w - .16
    box(rx - .05, rx + .05, .98, 1.1, -.006, .012, iron)
    box(rx - .045, rx + .045, .84, .87, -.035, -.006, iron)
    box(rx - .045, rx - .025, .84, .98, -.035, -.006, iron)
    box(rx + .025, rx + .045, .84, .98, -.035, -.006, iron)
    ob = P.build(None)
    piv = bpy.data.objects.new(name.replace('_Door_', '_DoorPivot_'), None)
    piv.empty_display_type = 'ARROWS'; piv.empty_display_size = .3
    bpy.context.collection.objects.link(piv)
    piv.location = (hinge[0], -hinge[1], y0)
    piv.rotation_euler = (0, 0, th_o)
    ob.parent = piv
    for k, v in props.items():
        piv[k] = v
    piv['closedYaw'] = round(th_c, 6); piv['openYaw'] = round(th_o, 6)
    piv['hinge'] = [round(hinge[0], 4), round(y0, 4), round(hinge[1], 4)]
    piv['leafWidth'] = round(w, 4); piv['leafHeight'] = round(h, 4)
    ob['door'] = props.get('door', ''); ob['leaf'] = props.get('leaf', ''); ob['cutaway'] = 'door'
    return piv, ob


def anchor(name, x, y, z, props):
    """A named anchor empty at a plan point (a stair foot or head, a service stance)."""
    e = bpy.data.objects.new(name, None)
    e.empty_display_type = 'SPHERE'; e.empty_display_size = .15
    bpy.context.collection.objects.link(e)
    e.location = (x, -z, y)
    for k, v in props.items():
        e[k] = v
    return e
