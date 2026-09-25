"""Holm prop pack v3 (doors and gates): original hand-built low-poly leaves and posts (Blender 4.5, headless).

Usage: blender -b --python tools/blender/build_holm_props_v3.py [-- --render <dir>]
Outputs .studio-workspaces/holm-props-v3/candidates/{props.glb,props.blend,manifest.json,REPORT.md}.
One named root Empty per asset (runtime clones by root name). Blender Z-up is exported as glTF Y-up; 1 unit = 1 tile.
PIVOTS (differ from v1/v2): door-leaf and yard-gate roots sit on the HINGE line at floor level; the closed leaf runs
along +X from the hinge, thickness centred on glTF z=0, so a rotation of the root about Y swings it open; the runtime
scales X per doorway (door up to 2.0, gate up to 4.0). gate-post origin = its ground centre.
COLOUR RULE (as v2): material colours are written as the sRGB values we want to SEE (no linear conversion); timber
and iron match the guide-house door leaf (Aged oak .30/.20/.12, Dark frame oak .22/.15/.09, hinge iron .15/.16/.14).
Deterministic: every random draw comes from a seeded random.Random.
"""
import bpy, bmesh, math, random, json, struct, hashlib, sys
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.studio-workspaces/holm-props-v3/candidates'
OUT.mkdir(parents=True, exist_ok=True)
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
RENDER = Path(argv[argv.index('--render') + 1]).resolve() if '--render' in argv else None
bpy.ops.wm.read_factory_settings(use_empty=True)
TAG = '[HOLM_PROPS_V3]'

# ---------------------------------------------------------------- materials (authored sRGB, used as-is)
PALETTE = {
    'oak':        (.30, .20, .12),     # = guide-house 'Aged oak' door planks
    'oak-light':  (.36, .245, .145),   # alternate plank / weathered face
    'oak-dark':   (.22, .15, .09),     # = guide-house 'Dark frame oak': ledges, brace, rails, post foot
    'oak-end':    (.45, .33, .20),     # sawn end grain, chamfer highlights, post cap
    'plank-gap':  (.085, .06, .04),    # shadowed gaps between planks
    'iron':       (.15, .16, .14),     # = guide-house 'Forged hinge iron'
    'iron-worn':  (.29, .29, .27),     # rubbed nail heads, ring and latch wear
}
MAT = {}
for name, rgb in PALETTE.items():
    m = bpy.data.materials.new(name); m.use_nodes = True
    bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value = (*rgb, 1); bs.inputs['Roughness'].default_value = .95
    if 'Specular IOR Level' in bs.inputs: bs.inputs['Specular IOR Level'].default_value = .12
    m.diffuse_color = (*rgb, 1); m.roughness = .95; m.metallic = 0
    MAT[name] = m

# ---------------------------------------------------------------- mesh builder (v2 style)
class M:
    def __init__(s): s.v = []; s.f = []; s.mi = []
    def add(s, vs, fs, mats):
        k = len(s.v); s.v += [Vector(v) for v in vs]
        for n, f in enumerate(fs):
            s.f.append(tuple(k + i for i in f)); s.mi.append(mats[n] if isinstance(mats, (list, tuple)) else mats)
    def tris(s): return sum(len(f) - 2 for f in s.f)
    def loft(s, rings, side, cap0=None, cap1=None):
        n = len(rings[0]); k = len(s.v); vs = [p for r in rings for p in r]; fs = []; ms = []
        for j in range(len(rings) - 1):
            for i in range(n):
                fs.append((j*n+i, j*n+(i+1) % n, (j+1)*n+(i+1) % n, (j+1)*n+i))
                ms.append(side(j, i) if callable(side) else side)
        s.add(vs, fs, ms)
        if cap1: s.f.append(tuple(k + (len(rings)-1)*n + i for i in range(n))); s.mi.append(cap1)
        if cap0: s.f.append(tuple(k + i for i in reversed(range(n)))); s.mi.append(cap0)
        return k
    def pyramid(s, base, apex, mat, basemat=None):
        n = len(base); k = len(s.v); s.v += [Vector(p) for p in base] + [Vector(apex)]
        for i in range(n): s.f.append((k+i, k+(i+1) % n, k+n)); s.mi.append(mat)
        s.f.append(tuple(k + i for i in reversed(range(n)))); s.mi.append(basemat or mat)

def sec(w, d, c=0., front=False):
    """Cross-section (u across, v through thickness; -v = front face). front=True chamfers only the front edges."""
    a, b = w / 2, d / 2
    if c <= 0: return [(-a, -b), (a, -b), (a, b), (-a, b)]
    if front: return [(-a, b), (-a, -b + c), (-a + c, -b), (a - c, -b), (a, -b + c), (a, b)]
    return [(-a + c, -b), (a - c, -b), (a, -b + c), (a, b - c), (a - c, b), (-a + c, b), (-a, b - c), (-a, -b + c)]

def beam(m, p0, p1, section, side, dv=(0, 1, 0), rings=2, hook=None, cap0='oak-end', cap1='oak-end'):
    """Straight faceted member from p0 to p1; section u runs along axis x dv, v along dv (thickness)."""
    p0, p1, dv = Vector(p0), Vector(p1), Vector(dv).normalized()
    ax = (p1 - p0).normalized(); wv = dv.cross(ax).normalized()
    out = []
    for j in range(rings):
        t = j / (rings - 1); c = p0.lerp(p1, t)
        ring = [c + wv * u + dv * v for u, v in section]
        if hook: ring = hook(j, t, ring, wv, dv, ax)
        out.append(ring)
    return m.loft(out, side, cap0, cap1)

def box(m, x0, x1, y0, y1, z0, z1, mat):
    vs = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    m.add(vs, [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)], mat)

def knuckle(m, x, z0, z1, r, mat, n=6):
    """Hinge barrel on the hinge line (axis along Z through x, y=0)."""
    ring = lambda z: [Vector((x + r * math.cos(math.tau * i / n + .26), r * math.sin(math.tau * i / n + .26), z)) for i in range(n)]
    m.loft([ring(z0), ring(z1)], mat, mat, mat)

def nail(m, x, y, z, r, mat='iron-worn', face=-1):
    """Square forged nail head proud of a face (face=-1 front / -Y, +1 back)."""
    base = [(x - r, y, z - r), (x + r, y, z - r), (x + r, y, z + r), (x - r, y, z + r)]
    m.pyramid(base, (x, y + face * r * .9, z), mat)

def strap(m, z, y_face, length, w0, w1, rng, face=-1, t=.012):
    """Tapered black strap hinge from the hinge line along +X, ending in a spear point; nailed through."""
    xs = [0., length * .45, length * .86, length * .92, length]
    ws = [w0, (w0 + w1) / 2, w1, w1 * 1.7, .006]
    zs = [0, rng.uniform(-.004, .004), rng.uniform(-.004, .004), 0, 0]
    rings = []
    for x, w, dz in zip(xs, ws, zs):
        y0, y1 = y_face, y_face + face * t
        rings.append([Vector((x, y0, z + dz - w / 2)), Vector((x, y1, z + dz - w / 2)),
                      Vector((x, y1, z + dz + w / 2)), Vector((x, y0, z + dz + w / 2))])
    m.loft(rings, 'iron', 'iron', 'iron')
    for f in (.2, .48, .78):
        nail(m, xs[-1] * f, y_face + face * t, z + zs[1], .012, face=face)

# ---------------------------------------------------------------- assets
assets = []   # (name, habitat, pivot, [(mesh_name, M)])
def asset(name, habitat, pivot, parts): assets.append((name, habitat, pivot, parts))

# 1. door-leaf: 5 oak planks (varied widths, front-chamfered, faint dark gaps), 2 ledges + diagonal brace on the back,
#    2 spear-point strap hinges on the front with barrels on the hinge line, drop-ring pull + back thumb latch.
dl = M(); fe = M(); rng = random.Random(3101)
H, T = 2.3, .052                       # leaf height; plank thickness (front face at y=-T/2... planks y -0.045..0.007)
PY0, PY1 = -.045, .007                 # plank thickness span (front = -Y = glTF +Z)
LY1 = .045                             # ledges stand on the back face out to +0.045 (total ~0.09)
GAP = .012
wts = [1.08, .92, 1.04, .9, 1.06]; W = 1.0 - GAP * 4
x = 0.; plank_x = []
for i, wt in enumerate(wts):
    w = W * wt / sum(wts); plank_x.append((x, x + w)); x += w + GAP
for i, (x0, x1) in enumerate(plank_x):
    w = x1 - x0; top = H - rng.uniform(0, .025); slope = rng.uniform(-.018, .018); bow = rng.uniform(-.004, .004)
    mat = 'oak' if i % 2 == 0 else 'oak-light'
    def hook(j, t, ring, wv, dv, ax, top=top, slope=slope, bow=bow, x0=x0, x1=x1):
        out = []
        for p in ring:
            q = p.copy()
            if j == 1: q.x += bow
            if j == 2: q.z = top + slope * ((q.x - (x0 + x1) / 2) / (x1 - x0))
            out.append(q)
        return out
    sc = [(u, v + (PY0 + PY1) / 2) for u, v in sec(w, PY1 - PY0, .012, front=True)]
    # side faces (1st/last of the 6-pt section) are shadowed gap walls
    beam(dl, ((x0 + x1) / 2, 0, .01), ((x0 + x1) / 2, 0, H), sc,
         lambda j, k, mat=mat: 'plank-gap' if k in (0, 4) else mat, dv=(0, 1, 0), rings=3, hook=hook,
         cap0='oak-dark', cap1='oak-end')
for (a0, a1), (b0, b1) in zip(plank_x, plank_x[1:]):       # recessed gap filler, visible only through the gaps
    box(dl, a1 - .004, b0 + .004, -.03, 0., .03, H - .03, 'plank-gap')
# back: two ledges and a diagonal brace (hinge-bottom to latch-top), chamfered, dark frame oak
LZ = [(.3, .46), (1.8, 1.96)]
for z0, z1 in LZ:
    zc = (z0 + z1) / 2
    beam(dl, (.05, 0, zc), (.95, 0, zc), [(u, v + (PY1 + LY1) / 2) for u, v in sec(z1 - z0, LY1 - PY1, .014)],
         'oak-dark', dv=(0, 1, 0), cap0='oak-end', cap1='oak-end')
bw = .13; ba = Vector((.1, 0, LZ[0][1] + .005)); bb = Vector((.88, 0, LZ[1][0] - .005))
def brace_hook(j, t, ring, wv, dv, ax):
    # square-cut the brace ends so they seat flat on the ledges (horizontal end faces)
    out = []
    zt = ba.z if j == 0 else bb.z
    for p in ring:
        q = p.copy(); s = (q.z - zt) / ax.z; out.append(q - ax * s)
    return out
beam(dl, ba, bb, [(u, v + (PY1 + LY1) / 2 - .002) for u, v in sec(bw, LY1 - PY1 - .004, .012)], 'oak-dark',
     dv=(0, 1, 0), hook=brace_hook, cap0='oak-end', cap1='oak-end')
# clench-nail rows through the ledges, visible on the front between straps
for z0, z1 in LZ:
    for i, (x0, x1) in enumerate(plank_x):
        if x0 < .75: continue
        nail(fe, (x0 + x1) / 2 + .02, PY0, (z0 + z1) / 2 + rng.uniform(-.02, .02), .009)
# front: strap hinges over the ledges, barrels on the hinge line
for z0, z1 in LZ:
    zc = (z0 + z1) / 2
    strap(fe, zc, PY0, .76, .075, .05, rng)
    knuckle(fe, 0., zc - .085, zc + .085, .026, 'iron')
# ring pull on the latch edge: faceted rose plate, spindle, drop ring (authored narrow so X-stretch stays round-ish)
RX, RZ = .86, 1.08
rose = [Vector((RX + .042 * math.cos(math.tau * i / 6) * .72, PY0, RZ + .042 * math.sin(math.tau * i / 6))) for i in range(6)]
fe.loft([rose, [p + Vector((0, -.008, 0)) for p in rose]], 'iron', 'iron', None)
fe.pyramid([p + Vector((0, -.008, 0)) for p in rose], (RX, PY0 - .03, RZ), 'iron-worn')
ring_n, tube_n, rx, rz, rt = 8, 4, .034, .058, .011
cz = RZ - rz + .012; cy = PY0 - .03
rings = []
for i in range(ring_n + 1):
    a = math.tau * i / ring_n - math.pi / 2
    c = Vector((RX + rx * math.sin(a), cy, cz - rz * math.cos(a)))
    tng = Vector((rx * math.cos(a), 0, rz * math.sin(a))).normalized(); nrm = Vector((0, 1, 0)).cross(tng).normalized()
    rings.append([c + (nrm * math.cos(math.tau * k / tube_n + math.pi / 4) + Vector((0, 1, 0)) * math.sin(math.tau * k / tube_n + math.pi / 4)) * rt
                  for k in range(tube_n)])
fe.loft(rings[:-1] + [rings[0]], lambda j, k: 'iron-worn' if j in (3, 4) else 'iron')
# back thumb latch: bar + lift
box(fe, .72, .96, LY1 - .038, LY1 - .026 + .012, 1.1, 1.135, 'iron')
box(fe, .93, .96, PY1, LY1 - .026, 1.095, 1.14, 'iron')
asset('door-leaf', 'Oak plank door leaf that closes a tutorial doorway until its lesson is done; runtime scales X to the '
      'doorway (1.0-2.0) and rotates the root about Y at the hinge to open it',
      'hinge line at floor level; closed leaf spans +X 0..1, thickness centred on z=0; front face = +Z',
      [('door-leaf_Planks', dl), ('door-leaf_Iron', fe)])

# 2. yard-gate: hinge + head stiles, top + bottom rails, 3 front palings, back brace, iron hinge bands + latch
yg = M(); gi = M(); rng = random.Random(3201)
GD = .064                               # rail/stile depth, centred on y=0
def jit_hook(amt, seed):
    r = random.Random(seed)
    offs = [Vector((r.uniform(-amt, amt), 0, r.uniform(-amt, amt))) for _ in range(4)]
    return lambda j, t, ring, wv, dv, ax: [p + offs[j] for p in ring]
# stiles (full height, chamfered, cap faces sloped as weathering cuts)
def stile(xc, w, z1, seed, slope):
    def h(j, t, ring, wv, dv, ax):
        if j == 0: return ring
        return [p + Vector((0, 0, slope * (p.x - xc) / w)) for p in ring]
    beam(yg, (xc, 0, .06), (xc, 0, z1), sec(w, GD + .01, .012), 'oak', dv=(0, 1, 0), rings=2, hook=h,
         cap0='oak-dark', cap1='oak-end')
stile(.04, .08, 1.25, 1, -.03)
stile(.965, .07, 1.2, 2, .03)
# rails between stiles
for zc, hgt, seed in ((1.14, .11, 3), (.26, .12, 4)):
    beam(yg, (.08, 0, zc), (.93, 0, zc + rng.uniform(-.006, .006)), sec(hgt, GD - .008, .012), 'oak', dv=(0, 1, 0),
         rings=3, hook=lambda j, t, ring, wv, dv, ax: [p + Vector((0, 0, .006 if j == 1 else 0)) for p in ring])
# middle rail: thin, keeps it a gate and not a fence
beam(yg, (.08, 0, .7), (.93, 0, .7), sec(.075, GD - .016, .01), 'oak', dv=(0, 1, 0))
# 3 palings on the front face with pointed tops
for i, xc in enumerate((.3, .5, .7)):
    xc += rng.uniform(-.012, .012); w = .07
    y0, y1 = -GD / 2 - .026, -GD / 2 + .004
    top = 1.21 + rng.uniform(-.01, .01)
    k0 = beam(yg, (xc, 0, .17), (xc, 0, top), [(u, v + (y0 + y1) / 2) for u, v in sec(w, y1 - y0, .01, front=True)],
              'oak-light', dv=(0, 1, 0), cap0='oak-dark', cap1=None)
    ka = len(yg.v); yg.v.append(Vector((xc, (y0 + y1) / 2 - .004, top + .06)))   # blunt faceted point
    for q in range(6):
        yg.f.append((k0 + 6 + q, k0 + 6 + (q + 1) % 6, ka)); yg.mi.append('oak-end' if q in (1, 3) else 'oak-light')
# brace on the back: bottom hinge side up to top latch side
ga = Vector((.1, 0, .32)); gb = Vector((.9, 0, 1.08))
def gbh(j, t, ring, wv, dv, ax):
    zt = ga.z if j == 0 else gb.z
    return [p - ax * ((p.z - zt) / ax.z) for p in ring]
beam(yg, ga, gb, [(u, v + GD / 2 + .015) for u, v in sec(.085, .03, .008)], 'oak-dark', dv=(0, 1, 0), hook=gbh)
# iron: hinge bands wrapping the rails from the hinge line + barrels, latch on the far end
for zc in (1.14, .26):
    x0, x1 = 0., .2
    rings = []
    for x, w in ((x0, .05), (x1 * .8, .042), (x1, .02)):
        rings.append([Vector((x, -GD / 2 - .01, zc - w / 2)), Vector((x, GD / 2 + .01, zc - w / 2)),
                      Vector((x, GD / 2 + .01, zc + w / 2)), Vector((x, -GD / 2 - .01, zc + w / 2))])
    gi.loft(rings, 'iron', 'iron', 'iron')
    nail(gi, .1, -GD / 2 - .01, zc, .01)
    knuckle(gi, 0., zc - .07, zc + .07, .024, 'iron')
# latch: keeper plate on the head stile, sliding bar reaching the far edge, drop handle
box(gi, .9, 1.0, -GD / 2 - .02, -GD / 2 - .005, .96, 1.02, 'iron')
box(gi, .82, 1.0, -GD / 2 - .035, -GD / 2 - .02, .975, 1.005, 'iron-worn')
gi.pyramid([(.86, -GD / 2 - .035, .975), (.88, -GD / 2 - .035, .975), (.88, -GD / 2 - .035, 1.005), (.86, -GD / 2 - .035, 1.005)],
           (.87, -GD / 2 - .06, .93), 'iron')
asset('yard-gate', 'Timber yard gate that bars a lesson path until the lesson is done; runtime scales X (1.0-4.0, pier gate) '
      'and rotates the root about Y at the hinge to open it',
      'hinge line at ground level; closed gate spans +X 0..1, thickness centred on z=0; front face = +Z',
      [('yard-gate_Timber', yg), ('yard-gate_Iron', gi)])

# 3. gate-post: squared chamfered post, darker weathered foot, collar + pyramidal cap
gp = M(); rng = random.Random(3301)
s8 = sec(.2, .2, .03)
def post_hook(j, t, ring, wv, dv, ax):
    off = [Vector((0, 0, 0)), Vector((rng.uniform(-.004, .004), rng.uniform(-.004, .004), 0)), Vector((0, 0, 0))][j]
    return [p + off for p in ring]
beam(gp, (0, 0, -.03), (0, 0, 1.33), s8, lambda j, k: 'oak-dark' if j == 0 else ('oak-end' if k % 2 else 'oak'),
     dv=(0, 1, 0), rings=3, hook=lambda j, t, ring, wv, dv, ax: [p + Vector((0, 0, -.49 if j == 1 else 0)) for p in post_hook(j, t, ring, wv, dv, ax)],
     cap0='oak-dark', cap1=None)
top = [Vector((p.x, p.y, 1.33)) for p in (Vector((x, y, 0)) for x, y in [(-.1 + .03, -.1), (.1 - .03, -.1), (.1, -.1 + .03), (.1, .1 - .03), (.1 - .03, .1), (-.1 + .03, .1), (-.1, .1 - .03), (-.1, -.1 + .03)])]
cap = [Vector((p.x * 1.12, p.y * 1.12, 1.35)) for p in top]
cap2 = [Vector((p.x * 1.12, p.y * 1.12, 1.375)) for p in top]
k = len(gp.v); gp.v += top + cap + cap2
for A, B, mat in ((0, 8, 'oak-dark'), (8, 16, 'oak-dark')):
    for i in range(8):
        gp.f.append((k + A + i, k + A + (i + 1) % 8, k + B + (i + 1) % 8, k + B + i)); gp.mi.append(mat)
apex = Vector((0, 0, 1.45)); kk = len(gp.v); gp.v.append(apex)
for i in range(8):   # 8 cap facets alternate lit/weathered so the pyramid reads faceted
    gp.f.append((k + 16 + i, k + 16 + (i + 1) % 8, kk)); gp.mi.append('oak-end' if i % 2 == 0 else 'oak')
asset('gate-post', 'Squared timber gate post; runtime stands one each side of a yard gate',
      'ground centre', [('gate-post_Post', gp)])

# ---------------------------------------------------------------- build objects (no re-centring: pivots are authored)
def clean(m):
    """Recalculate outward normals per closed shell (hand-lofted rings have mixed winding)."""
    me = bpy.data.meshes.new('tmp'); me.from_pydata([tuple(v) for v in m.v], [], m.f)
    for poly, sname in zip(me.polygons, m.mi): poly.material_index = list(PALETTE).index(sname)
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free()
    return me
roots = []
for name, habitat, pivot, parts in assets:
    root = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(root)
    for mname, m in parts:
        me = clean(m); me.name = mname
        used = sorted({p.material_index for p in me.polygons}); names = list(PALETTE)
        for u in used: me.materials.append(MAT[names[u]])
        for poly in me.polygons: poly.material_index = used.index(poly.material_index); poly.use_smooth = False
        me.validate(clean_customdata=False); me.update()
        ob = bpy.data.objects.new(mname, me); bpy.context.collection.objects.link(ob); ob.parent = root
    roots.append((root, habitat, pivot))

def tri_count(ob): return sum(len(p.vertices) - 2 for x in ob.children_recursive if x.type == 'MESH' for p in x.data.polygons)
def bounds(ob):
    pts = [x.matrix_world @ v.co for x in ob.children_recursive if x.type == 'MESH' for v in x.data.vertices]
    lo = [min(p[i] for p in pts) for i in range(3)]; hi = [max(p[i] for p in pts) for i in range(3)]
    return {'min': [lo[0], lo[2], -hi[1]], 'max': [hi[0], hi[2], -lo[1]]}

bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT')
for r, _, _ in roots:
    r.select_set(True)
    for x in r.children_recursive: x.select_set(True)
glb = OUT / 'props.glb'
bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', use_selection=True, export_animations=False,
                          export_yup=True, export_apply=True, export_materials='EXPORT')
raw = glb.read_bytes(); jslen = struct.unpack_from('<I', raw, 12)[0]; doc = json.loads(raw[20:20 + jslen])
sha = hashlib.sha256(raw).hexdigest()
nodes = doc['nodes']; top_nodes = set(doc['scenes'][0]['nodes'])
def glb_tris(ni):
    n = nodes[ni]; t = 0
    if 'mesh' in n:
        for pr in doc['meshes'][n['mesh']]['primitives']: t += doc['accessors'][pr['indices']]['count'] // 3
    return t + sum(glb_tris(c) for c in n.get('children', []))
glb_roots = {nodes[i]['name']: i for i in top_nodes}
assert len(doc.get('materials', [])) <= 8, len(doc['materials'])
assert not doc.get('images') and not doc.get('textures'), 'no image textures allowed'
for gm in doc['materials']:   # authored sRGB must survive export untouched
    got = gm['pbrMetallicRoughness']['baseColorFactor'][:3]
    assert all(abs(a - b) < 1e-4 for a, b in zip(got, PALETTE[gm['name']])), (gm['name'], got)
for nm in ('door-leaf', 'yard-gate', 'gate-post'):   # root nodes carry identity transforms (pivot = authored origin)
    n = nodes[glb_roots[nm]]
    assert not n.get('translation') and not n.get('rotation') and not n.get('scale'), n

manifest = {'schema': 1, 'status': 'candidate-not-visual-or-runtime-accepted', 'axes': 'glTF Y-up, 1 unit = tile',
            'colour': 'material colours are authored sRGB, drawn as-is (no linear conversion); no emissive',
            'references': ['Bible_References/Landscape_Option.jpg', 'Bible_References/Town2.jpg',
                           'tools/blender/holm_guide_house_doors.py (timber + iron colours)'],
            'blend': 'props.blend', 'file': 'props.glb', 'sha256': sha, 'assets': []}
total = 0; rows = []
for r, habitat, pivot in roots:
    b = bounds(r); tris = tri_count(r); meshes = [x for x in r.children_recursive if x.type == 'MESH']
    mats = sorted({m.name for x in meshes for m in x.data.materials})
    assert r.name in glb_roots, r.name
    gt = glb_tris(glb_roots[r.name]); assert gt == tris, (r.name, gt, tris)
    assert b['min'][1] > -.1, (r.name, b)
    total += tris
    manifest['assets'].append({'name': r.name, 'root': r.name, 'file': glb.name, 'habitat': habitat, 'pivot': pivot,
                               'triangles': tris, 'materials': len(mats), 'materialNames': mats, 'meshes': len(meshes),
                               'bounds': b, 'animatedBounds': b, 'sampledFrames': [1], 'clips': [],
                               'groundMinY': b['min'][1], 'sha256': sha})
    rows.append((r.name, tris, b))
    print(TAG, r.name, tris, 'tris', len(mats), 'mats', [round(v, 3) for v in b['min']], [round(v, 3) for v in b['max']])
manifest['totals'] = {'triangles': total, 'materials': len(doc['materials']), 'assets': len(roots),
                      'budget': {'triangles': 1500, 'materials': 8}}
assert total <= 1500, total
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'props.blend'))
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf8')
print(TAG, 'PASS', total, 'tris', len(doc['materials']), 'materials sha256', sha)

SELF_REVIEW = '''1. Reads well: ragged front-chamfered planks with dark gaps, spear-point strap hinges and drop ring read as a 2004-style
   oak door at x1 and x2; the gate's pointed palings, back brace and iron bands read as a gate, not a fence, at x1.
2. Weaker: at x4 the stiles/palings become 0.28-0.32 wide boards and nail heads stretch (inherent to X-scaling); plank
   colour alternation is subtle at distance.
3. Not yet checked in the runtime (hinge-side sign of the swing, per-doorway scaling, lighting).'''
f2 = lambda v: ', '.join('%.2f' % c for c in v)
REPORT = f"""# holm-props-v3 — doors and gates

Built by `tools/blender/build_holm_props_v3.py` (Blender 4.5 headless). Outputs `props.glb` ({len(roots)} roots), `props.blend`,
`manifest.json` (v2 format + a `pivot` note per asset). Status: candidate; runtime check still to do.

## Conventions
- glTF Y-up, 1 unit = 1 tile. Colours authored sRGB, drawn as-is; the script checks every exported baseColorFactor.
- Timber and iron reuse the guide-house door leaf colours (oak .30/.20/.12, dark frame oak .22/.15/.09, iron .15/.16/.14).
- PIVOTS: `door-leaf` and `yard-gate` roots sit on the hinge line at floor level; the closed leaf runs along +X (0..1),
  thickness centred on z=0, front face (straps, palings, ring pull, latch bar) towards +Z. Rotating the root about +Y
  swings the far edge towards -Z (the back / ledge side), i.e. the leaf opens away from the viewer looking at the front.
  Hinge barrels are centred on the hinge line so they stay put as it turns. `gate-post` origin = ground centre.
- Runtime stretching: X is scaled per doorway (door 1.0-2.0, gate 1.0-4.0); proofs show door x2 and gate x4.
- Seeded; the build asserts identity root transforms, triangle counts in the GLB and the budget. sha256 {sha[:8]}…{sha[-6:]}.

## Assets
| root | tris | min (x,y,z) | max (x,y,z) |
|---|---|---|---|
""" + ''.join(f'| {n} | {t} | {f2(b["min"])} | {f2(b["max"])} |\n' for n, t, b in rows) + f"""
Totals: {total:,} triangles (budget 1,500), {len(doc['materials'])} materials (budget 8): {', '.join(sorted(PALETTE))}.

- door-leaf: 5 front-chamfered oak planks (alternating two oaks, widths varied +-9%, ragged/sloped tops, 12 mm gaps with
  recessed dark fillers), 2 back ledges + a square-seated diagonal brace (hinge-bottom to latch-top), 2 spear-point
  strap hinges with nails and hinge barrels, faceted rose + drop ring pull (authored narrow so it stays near-round at x2),
  back thumb latch, clench-nail heads on the latch side. Thickness 0.09 (+ iron).
- yard-gate: hinge + head stiles (sloped weathering tops), top, middle and bottom rails, 3 pale palings with blunt points
  on the front, dark diagonal brace on the back, 2 wrap-around hinge bands with barrels, keeper + slide bar + drop handle.
- gate-post: 8-sided chamfered 0.2 post with alternating lit/dark faces, dark weathered foot, collar and 8-facet cap.

## Proof renders
EEVEE, Raw view transform (as the game): scratchpad/holm_props_v3/lineup.png, swing.png, stretched.png, back.png, sheet.png.

## Self-review
{SELF_REVIEW}
"""
(OUT / 'REPORT.md').write_text(REPORT, encoding='utf8')

# ---------------------------------------------------------------- proof renders (presentation only; not saved)
if RENDER:
    import numpy as np
    RENDER.mkdir(parents=True, exist_ok=True); scene = bpy.context.scene
    for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
        try: scene.render.engine = eng; break
        except TypeError: pass
    vts = [i.identifier for i in scene.view_settings.bl_rna.properties['view_transform'].enum_items]
    scene.view_settings.view_transform = 'Raw' if 'Raw' in vts else 'Standard'
    scene.world = bpy.data.worlds.new('Studio'); scene.world.use_nodes = True
    bg = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs[0].default_value = (.62, .7, .8, 1); bg.inputs[1].default_value = .45
    def flat(name, rgb):
        m = bpy.data.materials.new(name); m.use_nodes = True
        bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        bs.inputs['Base Color'].default_value = (*rgb, 1); bs.inputs['Roughness'].default_value = 1; return m
    ground_m = flat('ground', (.36, .46, .2)); cap_m = flat('capsule', (.55, .62, .75)); ink = flat('label', (.1, .12, .07))
    wall_m = flat('wall', (.52, .54, .46))
    bpy.ops.mesh.primitive_plane_add(size=600, location=(60, 0, 0)); bpy.context.object.data.materials.append(ground_m)
    sun = bpy.data.objects.new('Key', bpy.data.lights.new('Key', 'SUN')); sun.data.energy = 1.05; sun.data.angle = .08
    sun.rotation_euler = (math.radians(48), 0, math.radians(-38)); scene.collection.objects.link(sun)
    fill = bpy.data.objects.new('Fill', bpy.data.lights.new('Fill', 'SUN')); fill.data.energy = .25
    fill.rotation_euler = (math.radians(65), 0, math.radians(150)); scene.collection.objects.link(fill)
    def capsule(x, y):
        objs = []
        bpy.ops.mesh.primitive_cylinder_add(radius=.24, depth=1.42, location=(x, y, .95), vertices=16); objs.append(bpy.context.object)
        for z in (.24, 1.66):
            bpy.ops.mesh.primitive_uv_sphere_add(radius=.24, location=(x, y, z), segments=16, ring_count=8); objs.append(bpy.context.object)
        for o in objs: o.data.materials.append(cap_m)
    def label(txt, x, y, size=.17):
        cu = bpy.data.curves.new('lbl', 'FONT'); cu.body = txt; cu.size = size; cu.align_x = 'CENTER'
        o = bpy.data.objects.new('lbl_' + txt, cu); o.location = (x, y, .005); cu.materials.append(ink); scene.collection.objects.link(o)
    def wall(x0, x1, y, h=2.6, t=.3):
        """Stone jamb blocks either side of a doorway gap, for context only."""
        for a, b in ((x0 - .35, x0), (x1, x1 + .35)):
            bpy.ops.mesh.primitive_cube_add(size=1, location=((a + b) / 2, y + t / 2, h / 2)); o = bpy.context.object
            o.scale = (b - a, t, h); o.data.materials.append(wall_m)
    cams = []
    def cam(loc, tgt, ortho=None, lens=50):
        c = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam')); scene.collection.objects.link(c); c.location = loc
        c.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        if ortho: c.data.type = 'ORTHO'; c.data.ortho_scale = ortho
        else: c.data.lens = lens
        scene.camera = c; return c
    def shot(path, w, h):
        scene.render.resolution_x = w; scene.render.resolution_y = h; scene.render.resolution_percentage = 100
        scene.render.filepath = str(path); bpy.ops.render.render(write_still=True)
    by = {r.name: r for r, _, _ in roots}
    def clone(name, loc, rotz=0, sx=1):
        src = by[name]; e = bpy.data.objects.new(name + '_show', None); scene.collection.objects.link(e)
        e.location = loc; e.rotation_euler = (0, 0, rotz); e.scale = (sx, 1, 1)
        for ch in src.children:
            o = ch.copy(); scene.collection.objects.link(o); o.parent = e
        return e
    OPEN = -math.radians(80)   # swing towards the front so the camera sees the leaf face (either sense is a Y rotation)
    for r in by.values(): r.location = (0, 0, -50)
    # glTF rotation about +Y == Blender rotation about +Z; runtime scales X then rotates (T R S), same as Blender.
    # lineup: capsule, door-leaf, gate-post, yard-gate between two posts
    capsule(0, 0); label('1.9 capsule', 0, -.9)
    clone('door-leaf', (.7, 0, 0)); label('door-leaf', 1.2, -.9)
    clone('gate-post', (2.35, 0, 0)); label('gate-post', 2.35, -.9)
    clone('gate-post', (2.9, 0, 0)); clone('yard-gate', (3.01, 0, 0)); clone('gate-post', (4.12, 0, 0)); label('yard-gate', 3.51, -.9)
    cam((2.6, -11, 4.2), (2.3, .3, .95), ortho=5.6); shot(RENDER / 'lineup.png', 1600, 900)
    # swing: closed and 80 deg open, in a doorway / between posts (3/4 view from the front)
    B = 20
    wall(B, B + 1, 0); clone('door-leaf', (B, 0, 0)); label('door closed', B + .5, -.8, .14)
    wall(B + 2.6, B + 3.6, 0); clone('door-leaf', (B + 2.6, 0, 0), OPEN); label('door open 80', B + 3.1, -.8, .14)
    clone('gate-post', (B + 5.09, 0, 0)); clone('yard-gate', (B + 5.2, 0, 0)); clone('gate-post', (B + 6.31, 0, 0)); label('gate closed', B + 5.7, -.8, .14)
    clone('gate-post', (B + 7.29, 0, 0)); clone('yard-gate', (B + 7.4, 0, 0), OPEN); clone('gate-post', (B + 8.51, 0, 0)); label('gate open 80', B + 7.9, -.8, .14)
    capsule(B + 9.3, .3)
    cam((B + 5.2, -7.6, 3.0), (B + 4.3, .2, .9), lens=32); shot(RENDER / 'swing.png', 1600, 900)
    # stretched: door x2 in a double doorway closed + open, gate x4 pier gate closed + open
    S = 45
    wall(S, S + 2, 0); clone('door-leaf', (S, 0, 0), 0, 2); label('door x2 closed', S + 1, -.8, .14)
    wall(S + 3.4, S + 5.4, 0); clone('door-leaf', (S + 3.4, 0, 0), OPEN, 2); label('door x2 open 80', S + 4.4, -.8, .14)
    capsule(S + 6.1, .2)
    clone('gate-post', (S - .11, -4, 0)); clone('yard-gate', (S, -4, 0), 0, 4); clone('gate-post', (S + 4.11, -4, 0)); label('gate x4 closed', S + 2, -4.8, .14)
    clone('gate-post', (S + 5.39, -4, 0)); clone('yard-gate', (S + 5.5, -4, 0), OPEN, 4); clone('gate-post', (S + 9.61, -4, 0)); label('gate x4 open 80', S + 7.5, -4.8, .14)
    cam((S + 4.4, -11.2, 4.3), (S + 4.4, -1.7, .7), lens=30); shot(RENDER / 'stretched.png', 1600, 900)
    # back + close: door back (ledges, brace, latch) and gate back, 3/4 from behind
    K = 75
    clone('door-leaf', (K, 0, 0), 0); clone('door-leaf', (K + 1.5, -.3, 0), math.radians(-35))
    clone('gate-post', (K + 3.09, 0, 0)); clone('yard-gate', (K + 3.2, 0, 0)); clone('gate-post', (K + 4.31, 0, 0))
    cam((K + 2.6, 5.2, 2.6), (K + 2.0, 0, 1.0), lens=40); shot(RENDER / 'back.png', 1600, 900)
    cam((K + .9, -2.4, 1.6), (K + .5, 0, 1.2), lens=45); shot(RENDER / 'door_front_close.png', 900, 900)
    def px(p):
        im = bpy.data.images.load(str(p)); a = np.empty(im.size[0] * im.size[1] * 4, dtype=np.float32); im.pixels.foreach_get(a)
        return a.reshape(im.size[1], im.size[0], 4)
    Ls = [px(RENDER / f) for f in ('back.png', 'stretched.png', 'lineup.png', 'swing.png')]
    sheet = np.ones((1800, 3200, 4), dtype=np.float32)   # pixel rows run bottom-up
    sheet[:900, :1600] = Ls[0]; sheet[:900, 1600:] = Ls[1]; sheet[900:, :1600] = Ls[2]; sheet[900:, 1600:] = Ls[3]
    im = bpy.data.images.new('sheet', 3200, 1800); im.pixels.foreach_set(sheet.ravel())
    im.filepath_raw = str(RENDER / 'sheet.png'); im.file_format = 'PNG'; im.save()
    print(TAG, 'renders ->', RENDER)
