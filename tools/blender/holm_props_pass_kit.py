"""Props pass kit (owner, 2026-09-28: "props ... blocky -> redo in Blender purposefully"; "every object in every building
reviewed in Blender"). Shared plumbing for the per-building scripts tools/blender/build_holm_<id>_props_pass.py, which
open the .blend of the model the island loads, take away the plain-box props and build each object again in its old
footprint (tools/blender/holm_trade_props.py, tools/blender/holm_purposeful_props.py).

 - New parts are Acc parts (holm_interior_kit) with their own vertex-colour material 'Holm props colour', so the
   old-school texture recipe (tools/blender/apply_oldschool_textures.py) textures exactly the new faces and nothing the
   building already had.
 - Colours are declared with C(name, hex, tex=...): tex names the kit texture a face of that colour takes ('beam' wood
   grain, 'rock', 'plaster', 'planks') or None to stay flat (metal, cloth, paper, glaze, food). build() writes it as the
   face attribute 'holm_tex' (an index into TEX), which the recipe reads (vertexColour.faceAttribute) instead of guessing
   wood from a colour, so brass, bread and rope never take wood grain.
 - Parts are built in building-local plan coordinates (x east, y up, z south), which is Blender world space in every
   building file; build(parent) keeps that placement under a transformed root (the cove haven).
Original designs only."""
import bpy, bmesh, json, math, re, sys
from pathlib import Path
import holm_interior_kit as K
from holm_interior_kit import Acc, M, sharp_by_angle

TEX = ['', 'beam', 'planks', 'rock', 'plaster', 'stone_course', 'thatch']
VC_NAME = 'Holm props colour'
REPORT = {'removed': [], 'islandsRemoved': {}, 'facesRemoved': {}, 'built': {}, 'notes': []}


def spec():
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    root = Path(__file__).resolve().parents[2]
    return json.loads((root / a[0]).read_text()) if a else {}


def begin():
    """The props' own vertex-colour material (never the building's 'Holm flat colour')."""
    K._MATS.clear()
    m = K._vc_material()
    m.name = VC_NAME
    return m


def C(name, hexcol, tex=None, emit=None):
    """A props colour: matte flat colour, the kit texture its faces take (None = flat), optional glow."""
    m = M('Props ' + name, hexcol, emit=emit)
    m['tex'] = tex or ''
    return m


class Part(Acc):
    """An Acc part that records each face's texture class and finishes like the review-4 props (sharp by angle 30,
    outward normals).

    Objects (group() ... close()): the game's cutaway (src/holm_cutaway_parts.js) splits every building mesh into its
    connected pieces at load and clips a piece with the walls when it is tall and thin, or has nothing under it (a
    shelf's books, a candle's flame, a helm on a post top), so an object built of loose boxes comes apart when the
    adventurer walks in. close() welds each object into one piece per draw material (the pieces the game sees): a
    hidden sliver (0.2 mm wide) joins each loose bit to its nearest neighbour, the object's own faces only, so it stands
    or rests as a whole (tools/check_holm_cutaway_props.js proves it on the exported model)."""

    def __init__(s, name):
        Acc.__init__(s, name)
        s.groups = []

    def group(self):
        return len(self.f)

    def close(self, g, anchor=True):
        """End an object begun with group(). anchor: every draw material's piece of the object also reaches down to
        the object's base (a hidden vertical sliver from its lowest point), so a flame, a mattress or a spear head
        stands with the object instead of floating in the cutaway's eyes."""
        if len(self.f) > g:
            self.groups.append((g, len(self.f), anchor))

    def obj(self, fn, *a, anchor=True, **kw):
        """Draw one object (fn(self, ...)) as a welded group."""
        g = self.group()
        r = fn(self, *a, **kw)
        self.close(g, anchor)
        return r

    def _weld(self, me):
        from mathutils import kdtree, Vector
        if not self.groups:
            return 0
        tex = me.attributes['holm_tex'].data
        polys = me.polygons
        verts = me.vertices
        cols = me.color_attributes.get('Col')
        slivers = []; anchors = []
        for g0, g1, anchor in self.groups:
            keys = {}
            for pi in range(g0, g1):
                keys.setdefault((polys[pi].material_index, tex[pi].value), []).append(pi)
            if anchor:
                base = min(verts[vi].co.z for pi in range(g0, g1) for vi in polys[pi].vertices)
                for key, pis in keys.items():
                    low = min((vi for pi in pis for vi in polys[pi].vertices), key=lambda vi: verts[vi].co.z)
                    if verts[low].co.z > base + .02:
                        anchors.append((low, base, key, pis[0]))
            for key, pis in keys.items():
                vs = sorted({vi for pi in pis for vi in polys[pi].vertices})
                par = {v: v for v in vs}
                def find(a):
                    while par[a] != a:
                        par[a] = par[par[a]]; a = par[a]
                    return a
                def unite(a, b):
                    a, b = find(a), find(b)
                    if a != b:
                        par[b] = a
                for pi in pis:
                    pv = polys[pi].vertices
                    for q in pv[1:]:
                        unite(pv[0], q)
                seen = {}
                for v in vs:                                  # the game welds by position (0.5 mm)
                    k = tuple(round(c * 2000) for c in verts[v].co)
                    if k in seen:
                        unite(seen[k], v)
                    else:
                        seen[k] = v
                kd = kdtree.KDTree(len(vs))
                for i, v in enumerate(vs):
                    kd.insert(verts[v].co, i)
                kd.balance()
                for _ in range(64):
                    comps = {}
                    for v in vs:
                        comps.setdefault(find(v), []).append(v)
                    if len(comps) <= 1:
                        break
                    best = {}
                    for r, members in comps.items():
                        bb = None
                        for u in members:
                            for co, i, d in kd.find_n(verts[u].co, 24):
                                w = vs[i]
                                if find(w) != r:
                                    if bb is None or d < bb[0]:
                                        bb = (d, u, w)
                                    break
                        if bb is None:                      # nothing near in 24 neighbours: search everything
                            for u in members[::max(1, len(members) // 40)]:
                                for co, i, d in kd.find_n(verts[u].co, len(vs)):
                                    w = vs[i]
                                    if find(w) != r:
                                        if bb is None or d < bb[0]:
                                            bb = (d, u, w)
                                        break
                        best[r] = bb
                    for r, (d, u, w) in best.items():
                        if find(u) != find(w):
                            unite(u, w)
                            slivers.append((u, w, key, pis[0]))
        if not slivers and not anchors:
            return 0
        bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
        lay_tex = bm.faces.layers.int.get('holm_tex')
        lay_col = bm.loops.layers.float_color.get('Col') if hasattr(bm.loops.layers, 'float_color') else None
        from mathutils import Vector
        col_of = lambda pi: tuple(bm.faces[pi].loops[0][lay_col]) if lay_col is not None else None
        todo = [(bm.verts[u], bm.verts[w], key, col_of(pi)) for u, w, key, pi in slivers]
        todo_a = [(bm.verts[u], base, key, col_of(pi)) for u, base, key, pi in anchors]
        def sliver(va, vb, key, col):
            mi, tx = key
            a, b = va.co, vb.co
            d = b - a
            side = d.cross(Vector((0, 0, 1)))
            if side.length < 1e-6:
                side = Vector((1, 0, 0))
            side.normalize()
            m = bm.verts.new((a + b) / 2 + side * .0002)
            try:
                f = bm.faces.new((va, vb, m))
            except ValueError:
                return
            f.material_index = mi
            f[lay_tex] = tx
            if col is not None:
                for l in f.loops:
                    l[lay_col] = col
        for va, vb, key, col in todo:
            sliver(va, vb, key, col)
        for top, base, key, col in todo_a:
            bot = bm.verts.new((top.co.x, top.co.y, base))
            sliver(top, bot, key, col)
        bm.to_mesh(me); bm.free(); me.update()
        return len(slivers) + len(anchors)

    def build(self, parent=None, sharp=30):
        if not self.v:
            return None
        o = Acc.build(self, None)
        me = o.data
        att = me.attributes.new('holm_tex', 'INT', 'FACE')
        att.data.foreach_set('value', [TEX.index(self.mats[i].get('tex', '') or '') for i in self.fm])
        bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
        if sharp:
            sharp_by_angle(o, sharp)
        n = self._weld(me)
        if n:
            REPORT.setdefault('welds', {})[self.name] = n
        if parent is not None:
            o.parent = parent
            o.matrix_parent_inverse = parent.matrix_world.inverted()
        REPORT['built'][self.name] = REPORT['built'].get(self.name, 0) + sum(len(f) - 2 for f in self.f)
        return o


def obj(name):
    o = bpy.data.objects.get(name)
    assert o is not None, 'missing object ' + name
    return o


def remove(*names):
    for n in names:
        o = obj(n)
        REPORT['removed'].append(n)
        me = o.data if o.type == 'MESH' else None
        bpy.data.objects.remove(o, do_unlink=True)
        if me is not None and me.users == 0:
            bpy.data.meshes.remove(me)             # free the name, so a part rebuilt under it keeps it exactly


def _islands(o):
    bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
    mw = o.matrix_world
    seen = set(); out = []
    for f in bm.faces:
        if f.index in seen:
            continue
        st = [f]; seen.add(f.index); fs = []
        while st:
            g = st.pop(); fs.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h.index not in seen:
                        seen.add(h.index); st.append(h)
        ws = [mw @ v.co for g in fs for v in g.verts]
        b = (min(w.x for w in ws), max(w.x for w in ws), min(w.z for w in ws), max(w.z for w in ws), -max(w.y for w in ws), -min(w.y for w in ws))
        out.append((b, fs))
    return bm, out


def inside(box, x0, x1, y0, y1, z0, z1, pad=.02):
    """test for drop(): the island's plan box lies inside this box (plus pad)."""
    return box[0] >= x0 - pad and box[1] <= x1 + pad and box[2] >= y0 - pad and box[3] <= y1 + pad and box[4] >= z0 - pad and box[5] <= z1 + pad


def drop(name, *boxes, pad=.02, expect=None):
    """Delete the connected pieces of an object that lie inside any of the plan boxes (x0,x1,y0,y1,z0,z1).
    Returns the triangles removed; expect = the number of pieces that must match (a guard against a missed box)."""
    o = obj(name)
    bm, isl = _islands(o)
    kill = []; hit = 0
    for b, fs in isl:
        if any(inside(b, *bx, pad=pad) for bx in boxes):
            kill.extend(fs); hit += 1
    tris = sum(len(f.verts) - 2 for f in kill)
    if expect is not None:
        assert hit == expect, '%s: %d pieces matched, expected %d' % (name, hit, expect)
    bmesh.ops.delete(bm, geom=kill, context='FACES'); bm.to_mesh(o.data); bm.free(); o.data.update()
    REPORT['islandsRemoved'][name] = REPORT['islandsRemoved'].get(name, 0) + tris
    return tris


def drop_faces(name, test):
    """Delete the faces of an object whose world-space plan centre (x, y, z) passes test(x, y, z, material_name)."""
    o = obj(name); mw = o.matrix_world
    bm = bmesh.new(); bm.from_mesh(o.data)
    kill = []
    for f in bm.faces:
        c = mw @ f.calc_center_median()
        mn = o.data.materials[f.material_index].name if f.material_index < len(o.data.materials) and o.data.materials[f.material_index] else ''
        if test(c.x, c.z, -c.y, mn):
            kill.append(f)
    tris = sum(len(f.verts) - 2 for f in kill)
    bmesh.ops.delete(bm, geom=kill, context='FACES'); bm.to_mesh(o.data); bm.free(); o.data.update()
    REPORT['facesRemoved'][name] = REPORT['facesRemoved'].get(name, 0) + tris
    return tris


def left(name):
    """Triangles left on an object (0 = it is empty and can go)."""
    o = obj(name)
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


def remove_if_empty(*names):
    for n in names:
        if bpy.data.objects.get(n) is not None and left(n) == 0:
            remove(n)


def clearance(nav_path, names, R=.24, H=1.9, margin=.01, step=.1):
    """Early warning before the real measure: does any new part reach into a stance capsule (a 1.9 x 0.24 capsule on
    each node of the building's graph) or the corridor of a link between two nodes? Mirrors the extractors' capsule
    (spheres up the capsule, each a hair wider than R). Returns [(what, part, distance)] closer than R + margin."""
    from mathutils.bvhtree import BVHTree
    from mathutils import Vector
    nav = json.loads(Path(nav_path).read_text())
    verts, faces, owner = [], [], []
    for n in names:
        o = bpy.data.objects.get(n)
        if o is None or o.type != 'MESH':
            continue
        me = o.data; mw = o.matrix_world; k = len(verts)
        verts += [mw @ v.co for v in me.vertices]
        for p in me.polygons:
            for i in range(1, len(p.vertices) - 1):
                faces.append((k + p.vertices[0], k + p.vertices[i], k + p.vertices[i + 1])); owner.append(n)
    if not faces:
        return []
    bvh = BVHTree.FromPolygons(verts, faces, all_triangles=True)
    nn = math.ceil((H - 2 * R) / .08); gap = (H - 2 * R) / nn; rad = math.sqrt(R * R + (gap / 2) ** 2)
    def probe(x, z, base):
        best = None
        for i in range(nn + 1):
            hit = bvh.find_nearest(Vector((x, -z, base + R + i * gap + .004)), rad + margin)
            if hit[0] is not None and (best is None or hit[3] < best[1]):
                best = (owner[hit[2]], hit[3])
        return best
    out = []
    byid = {n['id']: n for n in nav['nodes']}
    for n in nav['nodes']:
        b = probe(n['x'], n['z'], n.get('capsuleBase', n['y']))
        if b and b[1] < rad + margin:
            out.append(('node ' + n['id'], b[0], round(b[1], 3)))
    seen = set()
    for a, bs in nav['links'].items():
        for b in bs:
            key = tuple(sorted((a, b)))
            if key in seen:
                continue
            seen.add(key); na, nb = byid[a], byid[b]
            k = int(1 / step)
            for i in range(1, k):
                t = i / k
                x = na['x'] + (nb['x'] - na['x']) * t; z = na['z'] + (nb['z'] - na['z']) * t
                base = na.get('capsuleBase', na['y']) + (nb.get('capsuleBase', nb['y']) - na.get('capsuleBase', na['y'])) * t
                hit = probe(x, z, base)
                if hit and hit[1] < rad + margin:
                    out.append(('link ' + a + '|' + b, hit[0], round(hit[1], 3))); break
    return out


def save(sp, root):
    """Save the untextured build (the recipe textures it into the workspace next)."""
    bpy.context.scene.frame_set(1); bpy.context.view_layer.update()
    out = root / sp['flat']
    out.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(out), copy=True, compress=False)
    rep = root / sp['buildReport']
    rep.parent.mkdir(parents=True, exist_ok=True)
    rep.write_text(json.dumps(REPORT, indent=1) + '\n')
    print('[PROPS_PASS_BUILD]', json.dumps({'flat': sp['flat'], 'built': REPORT['built'], 'removed': REPORT['removed'],
                                             'islandsRemoved': REPORT['islandsRemoved']}))
