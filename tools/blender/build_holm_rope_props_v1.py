"""Hemp rope prop pack v1 (Tutor's Holm paths pass, 2026-09-28): the rope as a ground item, and the same rope tied at the
Quarry Gate's mine-shaft mouth. One GLB of named root empties (root name = id; the runtime clones by root name), built with
holm_interior_kit.Acc in plan coordinates (x east, y up, z south; Blender (x,-z,y)), 1 unit = 1 tile.
Roots:
  rope        kind 'item': a coil of hemp rope lying on the ground, the ground-item model of the item id 'rope'. The SAME design
              as its inventory icon (build_world_item_icons_v1.py b_rope(), Z-up there): the 3.1-turn flat spiral (outer radius
              .1 shrinking by .024 over the coil, rising .022 -> .042), a 6-sided tube of radius .02, twist bands 'rope' /
              'rope-dk' by (j+i)%3, the loose end trailing off +X; scaled x1.7 so it reads beside a 1.5-tile adventurer (the
              outer end gets a shade cap: the icon never shows it, the ground camera can). Origin at the resting base centre
              (bounds centred on x/z, min y 0), longest axis +X (the item convention of build_holm_items_v1.py).
  rope-tied   kind 'prop': the same hemp rope tied at the Quarry Gate's shaft mouth, authored in the Quarry Gate model's LOCAL
              plan coordinates (the runtime places this root at the quarry model origin, world (36, 9.15, 33), yaw 0; the
              coordinates are those of the glTF nodes of holm-quarry-props-v1/candidates/quarry.glb). 3.35 tight turns round the
              RIGHT mouth post (x .45, z -3.72; faces x .32/.58, z -3.85/-3.59) at y ~1.0-1.27, 0.012-0.016 off its faces; a
              chunky knot on the court face above the turns with a short loose tail hanging in front of them; from the bottom
              turn a gently sagging span down to one loose loop of slack on the floor at the post's foot (the span crosses over
              the loop); then a run back along the RIGHT side of the tunnel (x ~.625: between the lower sets' right posts,
              x <= .55, and the rock lining, x >= .70) to the edge of the black deep floor (z -5.2), over which it drops straight
              into the dark to y -2.6 (below the floor it is hidden in most views: it reads as hanging down the shaft).
              The mouth post stands 2 cm off the dressed stone pier (post x <= .58, pier x >= .60): where the turns pass through
              that gap the rope thins into it, pinched between timber and stone (hidden from every game view by the pier), so
              neither is entered.
Checks (in this script, against the real quarry model, imported for checking and proof renders only: never exported into
props.glb, never modified): no rope triangle intersects a quarry triangle except the shaft drop entering the black deep floor
(intended); no rope vertex inside the post / pier / lower posts / lanterns / lining / cart / floor slab; floor-resting rope
sits 0.003-0.01 above y 0; the adventurer's shaft stance box (x -.95..-.05, z -3.9..-5.1, y 0..1.9) stays clear. Results go
into manifest.json (asset 'rope-tied', 'checks').
Materials: flat matte authored sRGB, no textures: 'Hemp rope' #dbc794 (= the icon's rope (.86,.78,.58)) and 'Hemp rope
shade' #9e8554 (= its rope-dk (.62,.52,.33)). Blender 5.x keeps a node tree on every material, so the authored colour is also
written into its Principled node (else the glTF exporter writes the node's default grey); the exported factors are asserted.
Deterministic (no random draws). Original design; nothing copied from any game.
Run: "C:/Program Files/Blender Foundation/Blender 5.1/blender.exe" -b --python tools/blender/build_holm_rope_props_v1.py
Out: .studio-workspaces/holm-rope-props-v1/candidates/{props.glb, props.blend, manifest.json}
Proofs (EEVEE, 1280x800, Raw view = the game's unmanaged colour): scratchpad/holm_paths_rope/blender/
  rope_coil.png (coil beside a 1.5-tile capsule | the icon's camera with the icon inset), rope_tied_court.png (the game camera
  from the quarry court), rope_tied_close.png (the turns and the knot), rope_tied_side.png (down the tunnel | east section)."""
import bpy, sys, math, json, struct
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
import numpy as np
HERE = Path(__file__).resolve().parent; sys.path.insert(0, str(HERE)); ROOT = HERE.parents[1]
from holm_interior_kit import Acc, M
from holm_v2_pack import Pack
TAG = '[HOLM_ROPE_PROPS_V1]'
P = Pack('HOLM_ROPE_PROPS_V1', ROOT / '.studio-workspaces/holm-rope-props-v1/candidates', budget_tris=2400)
QUARRY_GLB = ROOT / '.studio-workspaces/holm-quarry-props-v1/candidates/quarry.glb'
PROOF = ROOT / 'scratchpad/holm_paths_rope/blender'; PROOF.mkdir(parents=True, exist_ok=True)
ICON = ROOT / 'assets/icons/items/rope.png'
tau = math.tau
ROPE = M('Hemp rope', '#dbc794'); SHADE = M('Hemp rope shade', '#9e8554')
def band(j, i): return ROPE if (j + i) % 3 else SHADE

# ---------------------------------------------------------------- tube helpers
def loft(rings, side, cap0=None, cap1=None, closed=False):
    """Quads between consecutive rings (the icon's M.loft); side(j, i) picks the material of segment j, side i."""
    n = len(rings[0]); L = len(rings); V = [q for r in rings for q in r]; F = []; FM = []
    for j in range(L if closed else L - 1):
        a, b = j, (j + 1) % L
        for i in range(n):
            F.append((a * n + i, a * n + (i + 1) % n, b * n + (i + 1) % n, b * n + i)); FM.append(side(j, i))
    if cap1: F.append(tuple((L - 1) * n + i for i in range(n))); FM.append(cap1)
    if cap0: F.append(tuple(reversed(range(n)))); FM.append(cap0)
    return V, F, FM
def ref_rings(pts, r, n=6, up=None, closed=False):
    """Rings framed against a reference axis: exactly build_world_item_icons_v1.M.ptube (flat 1, phase 0)."""
    Pp = [Vector(p) for p in pts]; L = len(Pp); rings = []
    for j, p in enumerate(Pp):
        t = (Pp[(j + 1) % L] - Pp[(j - 1) % L]) if closed else (Pp[min(j + 1, L - 1)] - Pp[max(j - 1, 0)]); t.normalize()
        u = Vector(up) if up is not None else (Vector((0, 0, 1)) if abs(t.z) < .9 else Vector((1, 0, 0)))
        a = t.cross(u).normalized(); b = t.cross(a).normalized()
        rings.append([p + (a * math.cos(tau * i / n) + b * math.sin(tau * i / n)) * r for i in range(n)])
    return rings
def pt_rings(pts, r, n=6, n0=(1, 0, 0), radii=None):
    """Rings on parallel-transported frames: no flips where the rope turns vertical, so the twist bands run on unbroken."""
    Pp = [Vector(p) for p in pts]; L = len(Pp); T = [(Pp[min(j + 1, L - 1)] - Pp[max(j - 1, 0)]).normalized() for j in range(L)]
    nr = Vector(n0); nr = (nr - T[0] * nr.dot(T[0])).normalized(); rings = []
    for j in range(L):
        if j: nr = T[j - 1].rotation_difference(T[j]) @ nr; nr = (nr - T[j] * nr.dot(T[j])).normalized()
        b = T[j].cross(nr); rr = radii[j] if radii else r
        rings.append([Pp[j] + (nr * math.cos(tau * i / n) + b * math.sin(tau * i / n)) * rr for i in range(n)])
    return rings
def emit(A, V, F, FM):
    """Faces into the Acc grouped by material (each group carries only the vertices it uses)."""
    for m in (ROPE, SHADE):
        fs = [f for f, fm in zip(F, FM) if fm == m]
        if not fs: continue
        used = sorted({k for f in fs for k in f}); idx = {k: n for n, k in enumerate(used)}
        A.poly([tuple(V[k]) for k in used], [tuple(idx[k] for k in f) for f in fs], m)
def catmull(pts, sub):
    Pp = [Vector(p) for p in pts]; out = []
    for k in range(len(Pp) - 1):
        p0, p1, p2, p3 = Pp[max(k - 1, 0)], Pp[k], Pp[k + 1], Pp[min(k + 2, len(Pp) - 1)]
        for s in range(sub):
            t = s / sub
            out.append(.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t ** 3))
    out.append(Pp[-1]); return out

# ---------------------------------------------------------------- 1. rope: the ground coil (the icon's b_rope() x1.7)
K = 1.7
spiral = []
for k in range(64):
    t = k / 63; a = t * tau * 3.1; rr = .1 - .024 * t
    spiral.append((rr * math.cos(a), rr * math.sin(a), .022 + .02 * t))
tail = [spiral[-1], (.02, .0, .05), (.1, -.02, .03), (.17, -.05, .02)]
parts = [loft(ref_rings(spiral, .02, up=(0, 0, 1)), band, cap0=SHADE),   # cap0: the outer end the ground camera can see
         loft(ref_rings(tail, .02), band, cap1=SHADE)]
V, F, FM = [], [], []
for pv, pf, pm in parts:
    k0 = len(V); V += [Vector((q.x, q.z, -q.y)) * K for q in pv]; F += [tuple(k0 + i for i in f) for f in pf]; FM += pm   # Z-up -> plan
lo = [min(v[i] for v in V) for i in range(3)]; hi = [max(v[i] for v in V) for i in range(3)]
off = Vector((-(lo[0] + hi[0]) / 2, -lo[1], -(lo[2] + hi[2]) / 2))
V = [v + off for v in V]
r = P.root('rope', kind='item', item='rope', icon='assets/icons/items/rope.png',
           design='build_world_item_icons_v1.py b_rope() x1.7: 3.1-turn flat spiral + loose end, 6-sided tube, (j+i)%3 twist bands')
A = Acc('rope_Coil'); emit(A, V, F, FM); A.build(r, vcol=False)
bpy.context.view_layer.update(); cb = P.bounds(r); ext = [cb['max'][i] - cb['min'][i] for i in range(3)]
assert abs(cb['min'][1]) < 1e-4 and abs(cb['min'][0] + cb['max'][0]) < 1e-4 and abs(cb['min'][2] + cb['max'][2]) < 1e-4, ('rope origin', cb)
assert ext[0] >= ext[1] and ext[0] >= ext[2], ('rope: longest axis must be +X', ext)
assert P.tris(r) <= 800, ('rope budget', P.tris(r))

# ---------------------------------------------------------------- 2. rope-tied: at the Quarry Gate's shaft mouth (quarry-local)
R = .032                                  # rope radius (tube) for the tied rope
FLOOR = .005                              # lowest point of floor-resting rope above y 0
PX0, PX1, PZ0, PZ1, PH = .32, .58, -3.85, -3.59, 3.75   # the right mouth post (0.26 square at x .45, z -3.72)
GAP = .003                                # rope off the pier face (x .60)
D = .012 + R                              # turn centre-line off the post's free faces (the rope sits 0.012+ off them)
DE = .0115                                # the east turns run in the 2 cm post|pier gap (x .58 | .60), thinned
Y0, PITCH = 1.01, .068                    # bottom turn centre height, rise per turn (touching turns)
X0 = .625                                 # the run along the right side of the tunnel
path = []                                 # (Vector, tag)
for y in (-2.6, -1.4, -.2): path.append((Vector((X0, y, -5.275)), 'hang'))           # the drop into the dark (hidden)
for q in ((X0, -.075, -5.272), (X0, -.012, -5.258), (X0, .024, -5.232)): path.append((Vector(q), 'lip'))
run = [(X0, .036, -5.19)] + [(X0 + .011 * math.sin(z * 7.3), .036, z) for z in (-5.07, -4.95, -4.83, -4.71, -4.59, -4.47)]
loop = [(.61, .036, -4.36), (.565, .036, -4.26), (.49, .036, -4.19), (.40, .036, -4.15), (.30, .036, -4.13), (.19, .036, -4.135),
        (.10, .036, -4.18), (.055, .036, -4.26), (.075, .036, -4.35), (.15, .036, -4.41), (.25, .036, -4.415), (.33, .036, -4.37),
        (.365, .036, -4.29)]
span = [(.37, .08, -4.215), (.36, .135, -4.15), (.345, .23, -4.07), (.325, .39, -3.99), (.30, .59, -3.935), (.285, .80, -3.893),
        (.278, .95, -3.862)]
for q in run: path.append((Vector(q), 'floor'))
for q in catmull([run[-1]] + loop, 2)[1:]: path.append((q, 'floor'))
for q in span: path.append((Vector(q), 'span'))
# the turns: a rounded rectangle round the post (quarter-circle corners of radius D on the free faces). On the east the turns
# pass through the 2 cm post|pier gap: the rope thins into it (radius R -> .016 at the corner -> .005 in the gap), so it is
# pinched between timber and stone without entering either (the gap is hidden from every game view by the pier).
# piece: kind, geometry..., segments, radius at each of its samples
RG = .005
pieces = [('line', (PX0 - D, PZ0), (PX0 - D, PZ1), 2, (R, R)),                      # west face, heading +z (court-ward)
          ('arc', (PX0, PZ1), (D, D), math.pi, math.pi / 2, 2, (R, R)),            # SW corner
          ('line', (PX0, PZ1 + D), (PX1, PZ1 + D), 3, (R, R, R)),                  # south (court) face, heading +x
          ('arc', (PX1, PZ1), (DE, D), math.pi / 2, 0, 2, (.016, RG)),             # SE corner, into the gap
          ('line', (PX1 + DE, PZ1), (PX1 + DE, PZ0), 1, (RG,)),                    # through the gap, heading -z
          ('arc', (PX1, PZ0), (DE, D), 0, -math.pi / 2, 2, (.016, R)),             # NE corner, out of the gap
          ('line', (PX1, PZ0 - D), (PX0, PZ0 - D), 2, (R, R)),                     # north (tunnel) face, heading -x
          ('arc', (PX0, PZ0), (D, D), -math.pi / 2, -math.pi, 2, (R, R))]          # NW corner, back to the west face
def piece_pt(pc, f):
    if pc[0] == 'line': (ax, az), (bx, bz) = pc[1], pc[2]; return (ax + (bx - ax) * f, az + (bz - az) * f)
    (cx, cz), (rx, rz), t0, t1 = pc[1], pc[2], pc[3], pc[4]; th = t0 + (t1 - t0) * f; return (cx + rx * math.cos(th), cz + rz * math.sin(th))
def piece_len(pc): return sum(math.dist(piece_pt(pc, k / 64), piece_pt(pc, (k + 1) / 64)) for k in range(64))
turn = [(piece_pt(pieces[0], 0), 0.0, R)]; s = 0.0
for pc in pieces:
    L = piece_len(pc); nseg, rads = pc[-2], pc[-1]
    for k in range(1, nseg + 1): turn.append((piece_pt(pc, k / nseg), s + L * k / nseg, rads[k - 1]))
    s += L
LT = s; wraps = []
for n in range(4):
    for (x, z), sv, rr in (turn if n == 0 else turn[1:]):
        wraps.append((x, z, sv + n * LT, rr))
        if n == 3 and abs(z - (PZ1 + D)) < 1e-9 and x > PX0 + .05: break    # end on the court face, 1/3 across
    else: continue
    break
for x, z, sv, rr in wraps: path.append((Vector((x, Y0 + PITCH * sv / LT, z)), 'wrap', rr))
TURNS = wraps[-1][2] / LT; top_wrap = path[-1][0]
# the knot: a chunky trefoil lump flat on the court face, sitting on the top turn; the rope runs up into it
KN, KS, KR = 18, .022, .036                                           # a fat tube on a tight trefoil: a lump
tre = [(math.sin(t) + 2 * math.sin(2 * t), math.cos(t) - 2 * math.cos(2 * t), -math.sin(3 * t)) for t in (tau * k / KN for k in range(KN))]
ymid = (min(p[1] for p in tre) + max(p[1] for p in tre)) / 2; ylo = min(p[1] for p in tre) - ymid
KX, KZ = .452, PZ1 + .008 + KS + KR
KY = top_wrap.y + R + (-ylo) * KS + KR - .02                       # settles .02 into the top turn
knot = [Vector((KX + KS * X, KY + KS * (Y - ymid), KZ + KS * Z)) for X, Y, Z in tre]
path.append((Vector((top_wrap.x + .035, top_wrap.y + .04, top_wrap.z + .006)), 'into'))
path.append((Vector((KX + .005, KY - .035, KZ - .01)), 'into'))
# the loose tail: out of the knot's lower front, hanging in front of the turns, a little splayed at the end
tail_t = [(KX + .035, KY - .03, KZ + .012), (KX + .05, KY - .1, KZ + .045), (KX + .058, KY - .2, KZ + .062), (KX + .055, KY - .32, KZ + .064),
          (KX + .046, KY - .43, KZ + .06), (KX + .038, KY - .5, KZ + .056)]
# obstacles the turns are pressed against: (x0, x1, y0, y1, z0, z1), clearance, directions a vertex may be pushed out
OBST = [((PX0, PX1, 0, PH, PZ0, PZ1), .006, ('-x', '+x', '-z', '+z')),     # the right mouth post
        ((.60, 1.15, 0, 4.0, -3.98, -3.42), GAP, ('-x', '-z', '+z'))]      # the dressed stone pier beside it
def settle(p):
    for _ in range(3):
        moved = False
        for (x0, x1, y0, y1, z0, z1), c, dirs in OBST:
            if y0 < p.y < y1 and x0 - c < p.x < x1 + c and z0 - c < p.z < z1 + c:
                pen = {'-x': p.x - (x0 - c), '+x': (x1 + c) - p.x, '-z': p.z - (z0 - c), '+z': (z1 + c) - p.z}
                d = min(dirs, key=lambda k: pen[k])
                if d == '-x': p.x = x0 - c
                elif d == '+x': p.x = x1 + c
                elif d == '-z': p.z = z0 - c
                else: p.z = z1 + c
                moved = True
        if not moved: break
    return p
pts = [e[0] for e in path]; tags = [e[1] for e in path]; rads = [e[2] if len(e) > 2 else R for e in path]
rings = pt_rings(pts, R, n0=(1, 0, 0), radii=rads)
squashed = 0
for j, ring in enumerate(rings):
    if tags[j] == 'floor':
        dy = FLOOR - min(q.y for q in ring)
        for q in ring: q.y += dy
    for q in ring:
        before = q.copy(); settle(q); squashed += (q - before).length > 1e-9
MAIN = loft(rings, band, cap0=SHADE, cap1=SHADE)
KNOT = loft(ref_rings(knot, KR, up=(0, 0, 1), closed=True), band, closed=True)
TAIL = loft(pt_rings(tail_t, R, n0=(0, 0, 1), radii=[R, R, R, R * 1.05, R * 1.15, R * 1.3]), band, cap0=SHADE, cap1=SHADE)
r = P.root('rope-tied', kind='prop', item='rope', frame='Quarry Gate model-local plan coordinates: place at the quarry model origin '
           '(world 36, 9.15, 33), yaw 0', attach='right mouth post (x .45, z -3.72) of Quarry_ServiceShaft_MouthSet')
A = Acc('rope-tied_Rope')
for V, F, FM in (MAIN, KNOT, TAIL): emit(A, V, F, FM)
tied = A.build(r, vcol=False)
assert P.tris(r) <= 1600, ('rope-tied budget', P.tris(r))
print(TAG, 'turns %.2f (LT %.3f), knot at (%.3f, %.3f, %.3f), %d turn vertices pressed off the post/pier' % (TURNS, LT, KX, KY, KZ, squashed))

# Blender 5.x keeps a node tree on every material: write the authored colour into it too (the exporter reads the nodes)
for m in (ROPE, SHADE):
    if m.node_tree is None: m.use_nodes = True
    bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value = (*m['srgb'], 1); bs.inputs['Roughness'].default_value = 1.0; bs.inputs['Metallic'].default_value = 0.0
    m.diffuse_color = (*m['srgb'], 1)

# ---------------------------------------------------------------- 3. check the tied rope against the real quarry model
def import_quarry():
    qc = bpy.data.collections.new('QuarryCheck'); bpy.context.scene.collection.children.link(qc)
    vl = bpy.context.view_layer; vl.active_layer_collection = vl.layer_collection.children[qc.name]
    bpy.ops.import_scene.gltf(filepath=str(QUARRY_GLB))
    vl.active_layer_collection = vl.layer_collection; bpy.context.view_layer.update(); return qc
def drop_quarry(qc):
    bpy.data.batch_remove(list(qc.all_objects)); bpy.data.collections.remove(qc)
    bpy.data.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)
def plan(v): return Vector((v.x, v.z, -v.y))
def world_polys(o):
    dg = bpy.context.evaluated_depsgraph_get(); ev = o.evaluated_get(dg); me = ev.to_mesh()
    vs = [o.matrix_world @ v.co for v in me.vertices]; ps = [tuple(p.vertices) for p in me.polygons]; ev.to_mesh_clear(); return vs, ps
def check_tied(qc):
    rv, rp = world_polys(tied); rb = BVHTree.FromPolygons(rv, rp)
    rc = [plan(sum((rv[k] for k in p), Vector()) / len(p)) for p in rp]
    bad = []; deep = 0; nearest = {}
    for o in qc.all_objects:
        if o.type != 'MESH': continue
        qv, qp = world_polys(o)
        if not qp: continue
        qb = BVHTree.FromPolygons(qv, qp)
        for a, b in rb.overlap(qb):
            qcen = plan(sum((qv[k] for k in qp[b]), Vector()) / len(qp[b]))
            if o.name.startswith('Quarry_FloorTunnel') and qcen.z <= -5.2 + 1e-4 and rc[a].z < -5.2: deep += 1; continue
            bad.append((o.name, tuple(round(c, 3) for c in rc[a]), tuple(round(c, 3) for c in qcen)))
        for v in rv:
            hit = qb.find_nearest(v)
            if hit[0] is not None and plan(v).y > -.004 and (o.name not in nearest or hit[3] < nearest[o.name]): nearest[o.name] = hit[3]
    for x in bad[:20]: print(TAG, 'INTERSECTS', x)
    assert not bad, '%d rope triangles intersect the quarry model' % len(bad)
    pv = [plan(v) for v in rv]
    solids = {'right mouth post': (PX0, PX1, 0, PH, PZ0, PZ1), 'pier': (.60, 1.15, 0, 4.0, -3.98, -3.42), 'pier course': (.58, 1.17, .9, .96, -4.0, -3.4),
              'set 2 right post': (.35, .55, 0, 2.8, -4.7, -4.5), 'set 3 right post': (.36, .54, 0, 2.5, -5.69, -5.51),
              'right lantern': (.33, .57, 1.75, 2.05, -3.47, -3.25), 'right lining': (.70, 1.05, -.3, 4.1, -6.75, -3.45),
              'cart': (-.95, -.05, .0, .98, -6.45, -5.55), 'tunnel floor': (-1.7, .7, -.3, -.004, -5.2, -3.5),
              'stance box': (-.95, -.05, 0, 1.9, -5.1, -3.9)}
    for name, (x0, x1, y0, y1, z0, z1) in solids.items():
        inside = [v for v in pv if x0 < v.x < x1 and y0 < v.y < y1 and z0 < v.z < z1]
        assert not inside, (name, len(inside), tuple(inside[0]))
    floor = [q for j, ring in enumerate(rings) if tags[j] == 'floor' for q in ring]
    fmin = min(q.y for q in floor); fmin_j = [min(q.y for q in ring) for j, ring in enumerate(rings) if tags[j] == 'floor']
    assert .003 <= fmin and max(fmin_j) <= .01, ('floor rest', fmin, max(fmin_j))
    above = [v for v in pv if v.z > -5.2]; lowest_above = min(v.y for v in above)
    assert lowest_above >= -.004 + .003, ('rope sinks into the tunnel floor before the deep edge', lowest_above)
    def post_gap(v):   # distance from a vertex outside the post to the post
        dx = max(PX0 - v.x, 0, v.x - PX1); dz = max(PZ0 - v.z, 0, v.z - PZ1); return math.hypot(dx, dz)
    # the innermost vertex of every turn ring on the free faces (west, south, north; not the corners into the gap)
    near_post = [min(post_gap(q) for q in ring) for j, ring in enumerate(rings) if tags[j] == 'wrap' and pts[j].x < PX1 - .03]
    res = {'intersections': 0, 'deepFloorEntry': deep, 'turns': round(TURNS, 2), 'turnGapToPost': [round(min(near_post), 4), round(max(near_post), 4)],
           'floorRest': [round(fmin, 4), round(max(fmin_j), 4)], 'lowestBeforeDeepEdge': round(lowest_above, 4),
           'nearest': {k: round(v, 4) for k, v in sorted(nearest.items()) if v < .06}, 'stanceClear': True,
           'dropBottomY': round(min(v.y for v in pv), 3)}
    print(TAG, 'CHECK PASS', json.dumps(res)); return res

qc = import_quarry(); CHECKS = check_tied(qc); drop_quarry(qc)
P.meta['rope-tied']['checks'] = CHECKS
man = P.export('props.glb')
raw = (P.out / 'props.glb').read_bytes(); n = struct.unpack_from('<I', raw, 12)[0]; doc = json.loads(raw[20:20 + n])
for mt in doc['materials']:
    f = mt['pbrMetallicRoughness']; want = mt['extras']['srgb']
    assert all(abs(a - b) < 1e-4 for a, b in zip(f['baseColorFactor'], want)) and f.get('roughnessFactor', 1) == 1, ('material export', mt)
print(TAG, 'materials', [(mt['name'], [round(c, 3) for c in mt['pbrMetallicRoughness']['baseColorFactor'][:3]]) for mt in doc['materials']])

# ---------------------------------------------------------------- 4. proof renders (not saved into props.blend)
sc = bpy.context.scene
for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
    try: sc.render.engine = eng; break
    except TypeError: pass
for vt in ('Raw', 'Standard'):
    try: sc.view_settings.view_transform = vt; break
    except TypeError: pass
try: sc.eevee.taa_render_samples = 32
except Exception: pass
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGB'; sc.render.film_transparent = False
sc.world = bpy.data.worlds.new('ProofWorld'); sc.world.use_nodes = True
bg = next(nd for nd in sc.world.node_tree.nodes if nd.type == 'BACKGROUND'); bg.inputs[0].default_value = (1, 1, 1, 1); bg.inputs[1].default_value = .45
for nm, en, rx, rz in (('Key', 2.3, 40, -28), ('Fill', .45, 70, 150)):
    lo_ = bpy.data.objects.new(nm, bpy.data.lights.new(nm, 'SUN')); lo_.data.energy = en; lo_.data.use_shadow = False
    lo_.rotation_euler = (math.radians(rx), 0, math.radians(rz)); sc.collection.objects.link(lo_)
def flat(name, rgb):
    m = bpy.data.materials.new(name)
    if m.node_tree is None: m.use_nodes = True
    bs = next(nd for nd in m.node_tree.nodes if nd.type == 'BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value = (*rgb, 1); bs.inputs['Roughness'].default_value = 1; return m
CAP_M = flat('proof capsule', (.55, .62, .75))
def bl(p): return Vector((p[0], -p[2], p[1]))
def capsule(x, z, h=1.5, rad=.22):
    obs = []
    bpy.ops.mesh.primitive_cylinder_add(radius=rad, depth=h - 2 * rad, location=bl((x, h / 2, z)), vertices=16); obs.append(bpy.context.object)
    for yy in (rad, h - rad):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=rad, location=bl((x, yy, z)), segments=16, ring_count=8); obs.append(bpy.context.object)
    for o in obs: o.data.materials.append(CAP_M)
    return obs
def camera(pos, target, vfov=None, ortho=None, clip=(.05, 200)):
    c = bpy.data.objects.new('ProofCam', bpy.data.cameras.new('ProofCam')); sc.collection.objects.link(c)
    c.location = bl(pos); c.rotation_euler = (bl(target) - bl(pos)).to_track_quat('-Z', 'Y').to_euler()
    if ortho: c.data.type = 'ORTHO'; c.data.ortho_scale = ortho
    else: c.data.sensor_fit = 'VERTICAL'; c.data.angle_y = math.radians(vfov)
    c.data.clip_start, c.data.clip_end = clip; return c
def shoot(cam, path, w=1280, h=800):
    sc.camera = cam; sc.render.resolution_x = w; sc.render.resolution_y = h; sc.render.resolution_percentage = 100
    sc.render.filepath = str(path); bpy.ops.render.render(write_still=True); return path
def load_px(p):
    im = bpy.data.images.load(str(p)); a = np.empty(im.size[0] * im.size[1] * 4, dtype=np.float32); im.pixels.foreach_get(a)
    out = a.reshape(im.size[1], im.size[0], 4).copy(); bpy.data.images.remove(im); return out
def save_px(arr, p):
    h, w = arr.shape[:2]; im = bpy.data.images.new(p.stem, w, h, alpha=False); im.pixels.foreach_set(np.clip(arr, 0, 1).astype(np.float32).ravel())
    im.filepath_raw = str(p); im.file_format = 'PNG'; im.save(); bpy.data.images.remove(im)
def side_by_side(a, b, out):
    L, Rr = load_px(a), load_px(b); L[:, -2:, :3] = .12; Rr[:, :2, :3] = .12; img = np.concatenate([L, Rr], axis=1); img[..., 3] = 1
    Path(a).unlink(); Path(b).unlink(); return img
def show(root, on):
    for x in root.children_recursive: x.hide_render = not on
coil, tied_root = P.roots
TMP_A, TMP_B = PROOF / '_tmp_a.png', PROOF / '_tmp_b.png'

# rope_coil.png: left, the coil on grass beside a 1.5-tile capsule (a game-like camera); right, the icon's own camera
# (orthographic, 50 deg, the item yawed 20 deg) with the inventory icon inset top-left, to compare shapes
show(tied_root, False)
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, -.001)); grass = bpy.context.object; grass.data.materials.append(flat('proof ground', (.42, .52, .24)))
cap_objs = capsule(-.62, .05)
cA = camera((.55, 2.15, 2.55), (-.2, .45, 0), vfov=36.13)
shoot(cA, TMP_A, 640, 800)
for o in cap_objs: o.hide_render = True
coil.rotation_euler = (0, 0, math.radians(20)); bpy.context.view_layer.update()
el = math.radians(50); cB = camera((0, 20 * math.sin(el), 20 * math.cos(el)), (0, 0, 0), ortho=.72)
shoot(cB, TMP_B, 640, 800)
img = side_by_side(TMP_A, TMP_B, PROOF / 'rope_coil.png')
if ICON.exists():
    ic = load_px(ICON); ic = ic.repeat(2, axis=0).repeat(2, axis=1); h, w = img.shape[:2]; y0, x0 = h - 16 - ic.shape[0], 640 + 16
    reg = img[y0:y0 + ic.shape[0], x0:x0 + ic.shape[1], :3]; al = ic[..., 3:4]
    img[y0:y0 + ic.shape[0], x0:x0 + ic.shape[1], :3] = ic[..., :3] * al + reg * (1 - al)
save_px(img, PROOF / 'rope_coil.png')
coil.rotation_euler = (0, 0, 0); show(coil, False); show(tied_root, True); grass.hide_render = True
print(TAG, 'proof ->', PROOF / 'rope_coil.png')

# the tied rope on the imported quarry model (import only; never saved or exported)
qc = import_quarry()
for im in bpy.data.images:
    try: im.colorspace_settings.name = 'Non-Color'    # the game samples textures unmanaged: show them the same way
    except Exception: pass
capsule(-.5, -4.5)
# rope_tied_court.png: the game camera (2004 vertical FOV 36.13 deg, 48 deg elevation, the 2004 boom 11.1) from the court,
# looking at the adventurer at the shaft stance
el = math.radians(48); boom = (48 * 2048 / 360 * 3 + 600) / 128; look = (-.5, .4, -4.5)
shoot(camera((look[0], look[1] + boom * math.sin(el), look[2] + boom * math.cos(el)), look, vfov=36.13), PROOF / 'rope_tied_court.png')
# rope_tied_close.png: the turns, the knot and the tail on the right mouth post, from the court side
shoot(camera((-.28, 1.78, -2.42), (.45, 1.1, -3.64), vfov=40), PROOF / 'rope_tied_close.png')
# rope_tied_side.png: left, looking down into the tunnel from high over the court with everything above ~1.6 cut away (the
# camera's near clip: roof, ceiling, lanterns and post tops go; the turns, knot, slack loop, the run past the lower sets and the
# drop point at the black deep floor stay); right, an east section (everything east of x .672 cut away) showing the run on the
# floor and the drop through the black deep floor to y -2.6
T = (.64, 0, -4.55); yaw, pit, dist = 0.0, math.radians(80), 6.2      # overhead the run: nothing cut leans over it
pos = (T[0] + dist * math.sin(yaw) * math.cos(pit), dist * math.sin(pit), T[2] + dist * math.cos(yaw) * math.cos(pit))
vd = (bl(T) - bl(pos)).normalized(); cut = (bl((.45, 1.6, -3.72)) - bl(pos)).dot(vd)
shoot(camera(pos, T, vfov=40, clip=(cut, 60)), TMP_A, 640, 800)
shoot(camera((5.0, -.3, -4.95), (0, -.3, -4.95), ortho=5.5, clip=(5.0 - .672, 30)), TMP_B, 640, 800)
save_px(side_by_side(TMP_A, TMP_B, None), PROOF / 'rope_tied_side.png')
print(TAG, 'proofs ->', PROOF)
print(TAG, 'DONE', json.dumps({a['name']: {'triangles': a['triangles'], 'bounds': a['bounds']} for a in man['assets']}))
