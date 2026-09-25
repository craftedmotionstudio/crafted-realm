"""Holm equipment v1: every wieldable / wearable item as a Blender model (Blender 4.5, headless).

Usage: "C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe" -b --python tools/blender/build_holm_equipment_v1.py
       [-- --only kind1,kind2 --no-proof --no-icons]
Outputs
  .studio-workspaces/holm-equipment-v1/candidates/{equipment.glb,equipment.blend,manifest.json,REPORT.md}
  assets/icons/items/<id>.png for the remodelled island equipment (same icon pipeline as build_holm_items_v1.py)
  scratchpad/holm_equipment_v1/{lineup,tiers_weapons,tiers_armour,inhand,worn,compare}.png   (proof renders)

Conventions (build_holm_items_v1.py): one named root Empty per model (root name = eq_<kind>, the runtime clones by
root name); Blender Z-up exported as glTF Y-up; 1 unit = 1 tile (= 1 m; the player is 1.85 tall); flat matte colours
authored as the sRGB values we want to SEE, roughness 1, no textures; deterministic (no unseeded randomness).
Shading: every face smooth, edges sharper than 30 deg marked sharp (visible chunky planes, no smooth blobs).

Two frames:
  grip  held weapons, tools and shields. Origin = the hand grip, exactly the frame of the live gear templates
        (src/gear_models_v1.js) and the EquipBuilder specs (src/equip_builder.js): blade family along glTF -Y,
        tools/maces/2h/bows/staves along +Y, edge/pick/hammer face +X, shields face +X. The spec grip point
        (palm) is stored per model; `legacy` is the extra rotation into the old procedural world_gear.js frame.
  bind  worn armour. Authored in the bind (rest) space of the Crafted Realm character kit
        (assets/models/holm_kit_v2.glb: feet at 0, facing glTF +Z). Each child mesh carries extras.bone (Mixamo short
        name); the runtime parents it to that bone through the skeleton's inverse bind matrix, so it follows the pose.
Tier recolour: M_METAL is the tier colour (METALS in world_gear.js); M_METAL_DARK = x0.72; M_METAL_EDGE = 30% toward
white (the gear_models_v1 rule). M_CLOTH / M_CLOTH_DARK and M_GEM are recoloured the same way from cloth / gem colours.
Style: 2004 old-school RuneScape. Original designs (no Jagex models, textures or names).
"""
import bpy, bmesh, math, random, json, struct, hashlib, sys, re, shutil
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.studio-workspaces/holm-equipment-v1/candidates'
ICONS = ROOT / 'assets/icons/items'
PROOF = ROOT / 'scratchpad/holm_equipment_v1'
KIT = ROOT / 'assets/models/holm_kit_v2.glb'
for d in (OUT, ICONS, PROOF): d.mkdir(parents=True, exist_ok=True)
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ONLY = set(argv[argv.index('--only') + 1].split(',')) if '--only' in argv else None
NO_PROOF = '--no-proof' in argv
ALLOW_OVER = '--allow-over' in argv
NO_ICONS = '--no-icons' in argv or ONLY is not None
bpy.ops.wm.read_factory_settings(use_empty=True)
TAG = '[HOLM_EQUIP_V1]'
tau = math.tau
SMOOTH_ANGLE = math.radians(30.5)   # 12-gons (30 deg) smooth, anything coarser keeps its planes

# ---------------------------------------------------------------- tier colours (METALS in src/world_gear.js)
def hex3(h): return ((h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255)
METALS = {'copper': 0xc6794a, 'bronze': 0x8a6437, 'iron': 0x9aa0a8, 'steel': 0xd0d4dc, 'whitsteel': 0xe8ecf2,
          'aurel': 0xd4a83e, 'veyrite': 0x3ec6b4, 'undercrag': 0x6a5a7a}
TIER_ORDER = list(METALS)
def metal_dark(rgb): return tuple(c * .72 for c in rgb)
def metal_edge(rgb): return tuple(c + (1 - c) * .3 for c in rgb)
def metal_mid(rgb): return tuple(c * .86 for c in rgb)

# ---------------------------------------------------------------- materials (authored sRGB, used as-is; 16 max)
PALETTE = {
    'M_METAL':        hex3(METALS['bronze']),              # recoloured per tier at runtime
    'M_METAL_DARK':   metal_dark(hex3(METALS['bronze'])),  # fullers, sockets, lame shadows, slits
    'M_METAL_EDGE':   metal_edge(hex3(METALS['bronze'])),  # honed edges, rims, ridges
    'M_METAL_MID':    metal_mid(hex3(METALS['bronze'])),   # mail rows (subtle second tone)
    'M_WOOD':         (.50, .30, .16),                     # hafts, staves, bow limbs, planks (redder than bronze)
    'M_WOOD_DARK':    (.30, .18, .09),                     # plank backing, end grain, nocks
    'M_LEATHER':      (.58, .37, .18),                     # jerkin, chaps, boots, gloves
    'M_LEATHER_DARK': (.36, .22, .11),                     # straps, belts, seams, soles, trims
    'M_WRAP':         (.46, .25, .15),                     # grip bindings (red-brown cord)
    'M_BRASS':        (.88, .68, .27),                     # fixed brass fittings: buckles, ferrules, settings
    'M_STRING':       (.92, .88, .76),                     # bowstrings, fletching
    'M_CLOTH':        hex3(0x3a5aad),                      # recoloured: hats, capes
    'M_CLOTH_DARK':   metal_dark(hex3(0x3a5aad)),          # hat band, cape lining
    'M_GEM':          hex3(0x9ad0ff),                      # recoloured: staff orbs, amulet stones
}
MAT = {}
for name, rgb in PALETTE.items():
    m = bpy.data.materials.new(name); m.use_nodes = True
    bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value = (*rgb, 1); bs.inputs['Roughness'].default_value = 1.0
    bs.inputs['Metallic'].default_value = 0.0
    if 'Specular IOR Level' in bs.inputs: bs.inputs['Specular IOR Level'].default_value = 0.0
    m.diffuse_color = (*rgb, 1); m.roughness = 1.0; m.metallic = 0
    MAT[name] = m
MT, MD, ME, MM = 'M_METAL', 'M_METAL_DARK', 'M_METAL_EDGE', 'M_METAL_MID'
WD, WK, LE, LK, WR, BR, ST, CL, CK, GM = ('M_WOOD', 'M_WOOD_DARK', 'M_LEATHER', 'M_LEATHER_DARK', 'M_WRAP', 'M_BRASS',
                                          'M_STRING', 'M_CLOTH', 'M_CLOTH_DARK', 'M_GEM')

# ---------------------------------------------------------------- mesh builder (build_holm_items_v1.py + helpers)
class M:
    def __init__(s): s.v = []; s.f = []; s.mi = []
    def add(s, vs, fs, mats):
        k = len(s.v); s.v += [Vector(v) for v in vs]
        for n, f in enumerate(fs):
            s.f.append(tuple(k + i for i in f)); s.mi.append(mats[n] if isinstance(mats, (list, tuple)) else mats)
    def tris(s): return sum(len(f) - 2 for f in s.f)
    def merge(s, o): s.add(o.v, [tuple(f) for f in o.f], o.mi); return s

    def loft(s, rings, side, cap0=None, cap1=None, closed_rings=True):
        n = len(rings[0]); k = len(s.v); vs = [p for r in rings for p in r]; fs = []; ms = []
        cnt = n if closed_rings else n - 1
        for j in range(len(rings) - 1):
            for i in range(cnt):
                fs.append((k + j*n + i, k + j*n + (i+1) % n, k + (j+1)*n + (i+1) % n, k + (j+1)*n + i))
                ms.append(side(j, i) if callable(side) else side)
        s.v += [Vector(p) for p in vs]
        for f, mm in zip(fs, ms): s.f.append(f); s.mi.append(mm)
        if cap1: s.f.append(tuple(k + (len(rings)-1)*n + i for i in range(n))); s.mi.append(cap1)
        if cap0: s.f.append(tuple(k + i for i in reversed(range(n)))); s.mi.append(cap0)
        return k

    def fan(s, ring, apex, mat):
        """Close a ring onto an apex point; mat may be a callable(i)."""
        k = len(s.v); n = len(ring); s.v += [Vector(p) for p in ring] + [Vector(apex)]
        for i in range(n):
            s.f.append((k + i, k + (i+1) % n, k + n)); s.mi.append(mat(i) if callable(mat) else mat)

    def ptube(s, pts, r, n, side, up=None, closed=False, cap0=None, cap1=None, flat=1.0, phase=0.0, front=None):
        """Tube along a polyline. r scalar or per-point list; flat squashes the second frame axis. front fixes
        where angle 0 points (projected perpendicular to the tangent)."""
        Pp = [Vector(p) for p in pts]; L = len(Pp); rr = r if isinstance(r, (list, tuple)) else [r] * L
        rings = []
        for j, p in enumerate(Pp):
            if closed: t = (Pp[(j+1) % L] - Pp[(j-1) % L])
            else: t = Pp[min(j+1, L-1)] - Pp[max(j-1, 0)]
            t.normalize()
            if front is not None:
                f = Vector(front); a = (f - t * f.dot(t)).normalized(); b = t.cross(a).normalized()
            else:
                u = Vector(up) if up is not None else (Vector((0, 0, 1)) if abs(t.z) < .9 else Vector((1, 0, 0)))
                a = t.cross(u).normalized(); b = t.cross(a).normalized()
            ring = []
            for i in range(n):
                ang = tau * i / n + phase
                ring.append(p + (a * math.cos(ang) + b * math.sin(ang) * flat) * rr[j])
            rings.append(ring)
        if closed: rings = rings + [rings[0]]
        return s.loft(rings, side, None if closed else cap0, None if closed else cap1)

    def hull(s, pts, matfn):
        bm = bmesh.new()
        for p in pts: bm.verts.new(p)
        r = bmesh.ops.convex_hull(bm, input=list(bm.verts), use_existing_faces=False)
        junk = list(dict.fromkeys(g for g in r['geom_interior'] + r['geom_unused'] if isinstance(g, bmesh.types.BMVert)))
        if junk: bmesh.ops.delete(bm, geom=junk, context='VERTS')
        bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(2.5), verts=bm.verts[:], edges=bm.edges[:])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        bm.verts.index_update()
        vs = [v.co.copy() for v in bm.verts]
        fs = [tuple(v.index for v in f.verts) for f in bm.faces]
        ms = [(matfn(f.normal.copy(), f.calc_center_median()) if callable(matfn) else matfn) for f in bm.faces]
        bm.free(); s.add(vs, fs, ms)

    def lathe(s, prof, n, side, c=(0, 0), sc=(1, 1), phase=0.0, cap0=None, cap1=None, rfn=None, zfn=None):
        """Revolve (r, z) about the Z axis. r == 0 at an end becomes an apex. rfn(j,i,a)/zfn(j,i,a) perturb."""
        rings = []; apex0 = apex1 = None; pr = list(prof)
        if pr[0][0] == 0: apex0 = pr.pop(0)
        if pr[-1][0] == 0: apex1 = pr.pop()
        for j, (r, z) in enumerate(pr):
            ring = []
            for i in range(n):
                a = tau * i / n + phase
                rr = r * (rfn(j, i, a) if rfn else 1); zz = z + (zfn(j, i, a) if zfn else 0)
                ring.append(Vector((c[0] + rr * sc[0] * math.cos(a), c[1] + rr * sc[1] * math.sin(a), zz)))
            rings.append(ring)
        if len(rings) > 1: s.loft(rings, side, None if apex0 else cap0, None if apex1 else cap1)
        mat = lambda i: (side(len(rings) - 1, i) if callable(side) else side)
        if apex1: s.fan(rings[-1], (c[0], c[1], apex1[1]), mat)
        if apex0: s.fan(list(reversed(rings[0])), (c[0], c[1], apex0[1]), (lambda i: side(0, i) if callable(side) else side))
        return rings

    def transform(s, mtx, start=0):
        for i in range(start, len(s.v)): s.v[i] = mtx @ s.v[i]
        return s

def ell(c, r, nu=8, nv=4, floor=None):
    pts = []
    for j in range(1, nv):
        th = math.pi * j / nv
        for i in range(nu):
            ph = tau * i / nu + (j % 2) * math.pi / nu
            pts.append(Vector((c[0] + r[0] * math.sin(th) * math.cos(ph), c[1] + r[1] * math.sin(th) * math.sin(ph),
                               c[2] + r[2] * math.cos(th))))
    pts += [Vector((c[0], c[1], c[2] + r[2])), Vector((c[0], c[1], c[2] - r[2]))]
    if floor is not None:
        for p in pts: p.z = max(p.z, floor)
    return pts

def cbox(c, h, ch=0.0):
    pts = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            for sz in (-1, 1):
                x, y, z = c[0] + sx * h[0], c[1] + sy * h[1], c[2] + sz * h[2]
                if ch: pts += [Vector((x - sx * ch, y, z)), Vector((x, y - sy * ch, z)), Vector((x, y, z - sz * ch))]
                else: pts.append(Vector((x, y, z)))
    return pts

def sring(z, rx, ryf, ryb, n, cx=0.0, cy=0.0, p=2.5, phase=0.0, off=None):
    """Superellipse armour ring. Front (-Y) half uses ryf, back half ryb. off(i, a) adds a radial offset."""
    pts = []
    for i in range(n):
        a = tau * i / n + phase; c, s = math.cos(a), math.sin(a)
        k = (abs(c) ** p + abs(s) ** p) ** (-1 / p)
        ry = ryf if s < 0 else ryb
        o = off(i, a) if off else 0.0
        pts.append(Vector((cx + rx * c * k + o * c, cy + ry * s * k + o * s, z)))
    return pts
FRONT_I = lambda n: 3 * n // 4          # index of the front-centre vertex in a ring built with phase 0

def slab(m, outline, thick, mface, mside, plane='xz', fan_c=None, mside_fn=None, mface_back=None):
    """Extrude a 2D outline (list of (u, v)) symmetrically along the plane normal. thick(u, v) -> half thickness.
    Faces are fans from the centroid so a varying thickness (wedge) stays well shaped."""
    n = len(outline); cu = sum(p[0] for p in outline) / n; cv = sum(p[1] for p in outline) / n
    if fan_c: cu, cv = fan_c
    def P(u, v, w):
        return Vector((u, w, v)) if plane == 'xz' else (Vector((w, u, v)) if plane == 'yz' else Vector((u, v, w)))
    front = [P(u, v, thick(u, v)) for u, v in outline]; back = [P(u, v, -thick(u, v)) for u, v in outline]
    k = len(m.v); m.v += front + back + [P(cu, cv, thick(cu, cv)), P(cu, cv, -thick(cu, cv))]
    cf, cb = k + 2 * n, k + 2 * n + 1
    for i in range(n):
        j = (i + 1) % n
        m.f.append((k + i, k + j, cf)); m.mi.append(mface)
        m.f.append((k + n + j, k + n + i, cb)); m.mi.append(mface_back or mface)
        m.f.append((k + j, k + i, k + n + i, k + n + j)); m.mi.append(mside_fn(i) if mside_fn else mside)

# ---------------------------------------------------------------- shared weapon parts
BLADE_MATS = [ME, MT, MD, MD, MT, ME, ME, MT, MD, MD, MT, ME]
def blade(m, stations, sign, tip, z0, xcurve=None, bev=.42):
    """Lofted blade along +-Z from z0. stations: (s, halfwidth, halfthick, fuller halfwidth, fuller depth).
    Section: honed bevels (edge colour), flats, and a real fuller groove (dark). tip = (s, x offset)."""
    rings = []
    for s, w, t, f, g in stations:
        z = z0 + sign * s; xo = xcurve(s) if xcurve else 0.0; b = w * bev; f = min(f, (w - b) * .8)
        sec = [(w, 0), (w - b, t), (f, t), (0, t - g), (-f, t), (-(w - b), t), (-w, 0), (-(w - b), -t), (-f, -t), (0, -t + g),
               (f, -t), (w - b, -t)]
        rings.append([Vector((xo + x, y, z)) for x, y in sec])
    m.loft(rings, lambda j, i: BLADE_MATS[i], cap0=MD)
    ts, tx = tip
    m.fan(rings[-1], (tx, 0, z0 + sign * ts), lambda i: ME if BLADE_MATS[i] == ME else MT)

def wrapped_grip(m, z0, z1, r, n=6, ridges=4, mat=WR, collar=LE, x=0.0, y=0.0):
    """Cord-bound grip: rings alternate r / r*1.14 with a slight twist (reads as a spiral binding)."""
    rings = []; N = ridges * 2
    for k in range(N + 1):
        z = z0 + (z1 - z0) * k / N; rr = r * (1.14 if k % 2 else 1.0)
        rings.append([Vector((x + rr * math.cos(tau * i / n + k * .18), y + rr * math.sin(tau * i / n + k * .18), z)) for i in range(n)])
    m.loft(rings, mat, cap0=collar, cap1=collar)

def collar_ring(m, z, r, h, n=6, mat=MD, x=0.0, y=0.0):
    m.lathe([(r * .92, z - h / 2), (r, z - h / 2 + h * .25), (r, z + h / 2 - h * .25), (r * .92, z + h / 2)], n, mat,
            c=(x, y), cap0=mat, cap1=mat, phase=math.pi / n)

def haft(m, z0, z1, r0, r1, n=7, mat=WD, x=0.0, bend=0.0, endcap=WK):
    pts = []; rs = []
    for k in range(5):
        t = k / 4; pts.append((x + bend * math.sin(math.pi * t), 0, z0 + (z1 - z0) * t)); rs.append(r0 + (r1 - r0) * t)
    m.ptube(pts, rs, n, mat, cap0=endcap, cap1=endcap, phase=math.pi / n)

def edge_head(m, outline, edge_idx, t_eye, t_edge, x_eye, x_edge, band=.028, face=MT, side=MD, edgemat=ME):
    """Axe-style head in the XZ plane: body slab tapering from the eye (x_eye) toward the cutting edge (x_edge),
    plus a honed band along the cutting edge (outline indices edge_idx, in order) that thins to a sharp edge."""
    def tt(u, v):
        k = max(0.0, min(1.0, (abs(u) - abs(x_eye)) / max(1e-6, abs(x_edge) - abs(x_eye))))
        return t_eye + (t_edge - t_eye) * k
    E = [Vector((outline[i][0], 0, outline[i][1])) for i in edge_idx]
    cx = sum(p[0] for p in outline) / len(outline); cz = sum(p[1] for p in outline) / len(outline)
    inner = []
    for i, p in enumerate(E):
        a = E[max(i - 1, 0)]; b = E[min(i + 1, len(E) - 1)]; tg = (b - a).normalized()
        nrm = Vector((-tg.z, 0, tg.x))
        if nrm.dot(Vector((cx - p.x, 0, cz - p.z))) < 0: nrm = -nrm
        inner.append(p + nrm * band)
    body = []
    for i, (u, v) in enumerate(outline):
        if i in edge_idx: q = inner[edge_idx.index(i)]; body.append((q.x, q.z))
        else: body.append((u, v))
    slab(m, body, tt, face, side)
    # honed band: inner line (body thickness) -> outer edge (thin)
    k = len(m.v)
    for q, p in zip(inner, E):
        th = tt(q.x, q.z); m.v += [Vector((q.x, th, q.z)), Vector((q.x, -th, q.z)), Vector((p.x, t_edge * .35, p.z)), Vector((p.x, -t_edge * .35, p.z))]
    for i in range(len(E) - 1):
        a, b = k + 4 * i, k + 4 * (i + 1)
        m.f.append((a, b, b + 2, a + 2)); m.mi.append(edgemat)
        m.f.append((b + 1, a + 1, a + 3, b + 3)); m.mi.append(edgemat)
        m.f.append((a + 2, b + 2, b + 3, a + 3)); m.mi.append(edgemat)
    for a in (k, k + 4 * (len(E) - 1)):
        m.f.append((a, a + 2, a + 3, a + 1)); m.mi.append(edgemat)

# ================================================================ HELD MODELS (grip frame)
# Blender axes: glTF +Y = Blender +Z (item "up" / blade axis), glTF +Z = Blender -Y, glTF +X = Blender +X.
def b_dagger():
    m = M(); z0 = -.042
    blade(m, [(0, .042, .012, .011, .005), (.07, .04, .0115, .011, .005), (.2, .032, .011, .007, .004), (.26, .022, .009, 0, 0)],
          -1, (.33, 0), z0)
    g = [(-.078, 0, -.02), (-.04, 0, -.03), (.04, 0, -.03), (.078, 0, -.02)]                   # short quillons, tipped up
    m.ptube(g, [.012, .016, .016, .012], 6, MT, cap0=ME, cap1=ME, flat=.8)
    m.hull(cbox((0, 0, -.033), (.028, .02, .014), .005), MD)
    wrapped_grip(m, -.022, .066, .019, ridges=3)
    m.hull(ell((0, 0, .086), (.026, .022, .024), nu=7, nv=3), MT)                              # ball pommel
    return m

def b_sword():
    m = M(); z0 = -.052
    blade(m, [(0, .054, .014, .013, .006), (.1, .052, .0135, .013, .006), (.42, .046, .0125, .011, .005),
              (.53, .04, .0115, .004, .002), (.58, .031, .01, 0, 0)], -1, (.665, 0), z0)
    g = [(-.15, 0, -.078), (-.1, 0, -.052), (-.04, 0, -.042), (.04, 0, -.042), (.1, 0, -.052), (.15, 0, -.078)]
    m.ptube(g, [.012, .016, .018, .018, .016, .012], 6, MT, cap0=ME, cap1=ME, flat=.85)     # quillons curl to the blade
    for sx in (-1, 1): m.hull(ell((sx * .155, 0, -.084), (.019, .019, .019), nu=6, nv=3), ME)
    m.hull(cbox((0, 0, -.042), (.036, .024, .02), .006), MD)                                  # ecusson
    wrapped_grip(m, -.024, .085, .021, ridges=3)
    m.lathe([(0, .09), (.03, .095), (.036, .11), (.03, .126), (0, .132)], 8, MT)               # wheel pommel
    return m

def b_longsword():
    m = M(); z0 = -.062
    blade(m, [(0, .05, .013, .012, .006), (.1, .049, .013, .012, .006), (.6, .043, .012, .01, .005), (.72, .035, .011, 0, 0)],
          -1, (.815, 0), z0)
    g = [(-.16, 0, -.05), (-.05, 0, -.05), (.05, 0, -.05), (.16, 0, -.05)]                    # long straight cross
    m.ptube(g, [.017, .015, .015, .017], 4, MT, cap0=ME, cap1=ME, phase=math.pi / 4)
    for sx in (-1, 1): m.hull(cbox((sx * .165, 0, -.05), (.012, .019, .022), .004), ME)
    m.hull(cbox((0, 0, -.05), (.03, .022, .022), .006), MD)
    wrapped_grip(m, -.034, .11, .02, ridges=5)
    m.hull([Vector(p) for p in [(0, 0, .105), (.03, 0, .125), (-.03, 0, .125), (0, .022, .125), (0, -.022, .125),
                                (.02, 0, .155), (-.02, 0, .155), (0, .015, .155), (0, -.015, .155), (0, 0, .165)]], MT)  # faceted pommel
    return m

def b_sabre():
    m = M(); z0 = -.05
    xc = lambda s: .32 * (s / .72) ** 2.2 * .72                                               # curves toward +X
    blade(m, [(0, .034, .012, .007, .004), (.2, .038, .0115, .007, .004), (.45, .048, .0105, .004, .002),
              (.6, .05, .0095, 0, 0), (.68, .038, .009, 0, 0)], -1, (.79, xc(.79) + .01), z0, xcurve=xc)
    g = [(-.09, 0, -.012), (-.06, 0, -.042), (.06, 0, -.042), (.085, 0, -.07)]                # S-guard
    m.ptube(g, [.012, .015, .015, .011], 6, MT, cap0=ME, cap1=ME, flat=.8)
    m.hull(cbox((0, 0, -.04), (.026, .02, .016), .005), MD)
    wrapped_grip(m, -.028, .08, .019, ridges=4)
    m.hull([Vector(p) for p in [(-.02, -.018, .08), (.02, -.018, .08), (-.02, .018, .08), (.02, .018, .08),
                                (-.055, -.012, .112), (-.055, .012, .112), (-.03, 0, .122), (.012, 0, .104)]], MT)  # bird-head pommel
    return m

def b_greatsword():
    m = M(); z0 = .2
    blade(m, [(0, .075, .016, .017, .008), (.12, .07, .0155, .017, .008), (.72, .06, .014, .013, .006),
              (.84, .048, .012, 0, 0)], 1, (.95, 0), z0)
    g = [(-.21, 0, .23), (-.16, 0, .19), (-.05, 0, .175), (.05, 0, .175), (.16, 0, .19), (.21, 0, .23)]   # wings toward blade
    m.ptube(g, [.014, .02, .022, .022, .02, .014], 6, MT, cap0=ME, cap1=ME, flat=.85)
    m.hull(cbox((0, 0, .18), (.05, .03, .028), .008), MD)
    wrapped_grip(m, -.14, .15, .026, ridges=6)
    m.lathe([(0, -.2), (.036, -.19), (.042, -.17), (.034, -.148), (0, -.142)], 8, MT)
    return m

def b_mace():
    m = M()
    haft(m, -.16, .5, .02, .022, n=6, mat=MT, endcap=MD)
    wrapped_grip(m, -.12, .07, .025, ridges=4)
    m.lathe([(0, -.18), (.035, -.172), (.035, -.156), (0, -.15)], 6, ME)                     # butt knob
    collar_ring(m, .47, .035, .035)
    m.hull(ell((0, 0, .575), (.058, .058, .085), nu=8, nv=4), MD)                              # core
    for k in range(6):                                                                        # six flanges
        a = tau * k / 6 + tau / 12; ca, sa = math.cos(a), math.sin(a)
        prof = [(.03, .48), (.11, .525), (.14, .6), (.122, .66), (.03, .68)]
        pts = []
        for r, z in prof:
            for w in (-.008, .008):
                pts.append(Vector((ca * r - sa * w, sa * r + ca * w, z)))
        m.hull(pts, lambda n, c: ME if (n.x * ca + n.y * sa) > .8 else MT)
    m.lathe([(.022, .66), (0, .72)], 4, ME, phase=math.pi / 4)                                # top spike
    return m

def b_warhammer():
    m = M()
    haft(m, -.19, .56, .024, .027, n=7)
    wrapped_grip(m, -.13, .05, .028, ridges=4)
    for sx in (-1, 1): m.hull(cbox((0, sx * .028, .41), (.016, .006, .1)), MD)               # langets down the haft
    m.hull(cbox((.045, 0, .5), (.095, .052, .062), .012), lambda n, c: ME if n.x > .9 else MT)  # hammer block + face
    m.hull(cbox((.143, 0, .5), (.008, .06, .07), .01), ME)                                    # proud striking face
    m.hull([Vector(p) for p in [(-.05, -.04, .46), (-.05, .04, .46), (-.05, -.04, .54), (-.05, .04, .54),
                                (-.16, 0, .45), (-.14, 0, .47)]], MT)                        # back spike, drooping
    m.lathe([(.02, .562), (0, .615)], 4, ME, phase=math.pi / 4)
    return m

def b_battleaxe():
    m = M()
    haft(m, -.24, .5, .025, .028, n=7)
    wrapped_grip(m, -.22, -.05, .029, ridges=3)
    m.lathe([(0, -.26), (.032, -.25), (.032, -.235), (0, -.228)], 6, MD)
    m.hull([Vector(p) for p in cbox((0, 0, .36), (.04, .036, .085), .01)], MD)               # socket
    for sx in (-1, 1):                                                                         # crescent blades
        o = [(.03, .29), (.08, .27), (.15, .19), (.21, .14), (.258, .2), (.268, .3), (.262, .42), (.23, .52), (.15, .5),
             (.085, .44), (.03, .43)]
        o = [(sx * u, v) for u, v in o]
        if sx < 0: o = list(reversed(o))
        edge = list(range(3, 9)) if sx > 0 else list(range(2, 8))
        edge_head(m, o, edge, .024, .006, sx * .05, sx * .26, band=.03)
    m.lathe([(.024, .44), (.014, .52), (0, .6)], 4, ME, phase=math.pi / 4)                   # top spike
    return m

def b_hatchet():
    m = M()
    haft(m, -.34, .37, .024, .022, n=7, bend=.012)
    m.hull(ell((.008, 0, -.345), (.032, .028, .02), nu=6, nv=3), WK)                            # swollen butt
    wrapped_grip(m, -.17, -.03, .026, ridges=3, x=.01)
    m.hull(cbox((.004, 0, .3), (.034, .03, .052), .008), MD)                                  # eye / socket
    o = [(.03, .345), (.1, .335), (.18, .35), (.222, .362), (.232, .31), (.225, .24), (.2, .175), (.17, .14),
         (.13, .165), (.09, .22), (.03, .255)]                                                 # bearded head
    edge_head(m, o, [3, 4, 5, 6, 7], .026, .005, .04, .225, band=.026)
    m.hull(cbox((-.042, 0, .3), (.012, .026, .036), .006), MT)                                # poll
    return m

def b_pickaxe():
    m = M()
    haft(m, -.35, .33, .024, .022, n=7)
    wrapped_grip(m, -.17, -.03, .026, ridges=3)
    m.hull(cbox((0, 0, .285), (.04, .034, .05), .01), MD)                                     # socket
    for sx in (-1, 1):
        pts = [(sx * .035, 0, .292), (sx * .12, 0, .3), (sx * .2, 0, .282), (sx * .258, 0, .245), (sx * .29, 0, .2)]
        m.ptube(pts, [.03, .026, .02, .012, .003], 4, lambda j, i: ME if j >= 3 else MT, phase=math.pi / 4, up=(0, 1, 0))
    m.lathe([(.018, .33), (0, .355)], 4, MD, phase=math.pi / 4)
    return m

def b_bow(long=False):
    """Recurve shortbow (long=False) or D-profile longbow. String plane x=0 side; riser toward +X."""
    m = M()
    if not long:
        c, H = -.05, .47
        up = [(.142, 0), (.142, .06), (.132, .14), (.108, .24), (.07, .33), (.03, .4), (.014, .44), (.03, .468)]
        rr = [.024, .024, .02, .017, .014, .011, .009, .008]
        grip_c, grip_x, nock_z = -.10, .142, .44
    else:
        c, H = -.03, .62
        up = [(.19, 0), (.19, .07), (.18, .18), (.155, .3), (.115, .42), (.065, .52), (.022, .6), (.012, .62)]
        rr = [.026, .026, .022, .019, .016, .013, .01, .008]
        grip_c, grip_x, nock_z = -.11, .19, .6
    spine = [(x, 0, c - z) for x, z in reversed(up[1:])] + [(x, 0, c + z) for x, z in up]
    rad = list(reversed(rr[1:])) + rr
    m.ptube(spine, rad, 6, lambda j, i: WD if i not in (2, 3) else WK, flat=.62, front=(1, 0, 0), cap0=WK, cap1=WK)
    wrapped_grip(m, grip_c - .06, grip_c + .06, .03 if long else .028, n=6, ridges=3, x=grip_x - .002, mat=LK, collar=WR)
    m.hull(cbox((grip_x - .02, 0, grip_c + .075), (.016, .018, .012), .004), BR if long else LE)   # arrow shelf / plate
    for sz in (-1, 1):                                                                          # nocks
        k = (nock_z) * sz + c
        xk = next(x for x, z in up if z >= nock_z)
        m.hull(ell((xk, 0, k), (.016, .014, .016), nu=5, nv=3), BR if long else WK)
    xs = next(x for x, z in up if z >= nock_z) - .012
    m.ptube([(xs, 0, c - nock_z), (xs, 0, c + nock_z)], .0045, 3, ST)                        # string
    return m

def b_staff():
    m = M()
    pts = [(.004 * math.sin(k * 1.7), 0, -.4 + 1.22 * k / 6) for k in range(7)]
    m.ptube(pts, [.024, .025, .026, .027, .028, .029, .031], 7, WD, cap0=WK, cap1=WK, phase=.2)
    m.lathe([(0, -.43), (.025, -.41), (.027, -.34), (.022, -.33)], 6, BR, cap1=BR)   # ferrule
    for z in (-.08, .1):
        collar_ring(m, z, .032, .02, n=6, mat=LK)
    collar_ring(m, .74, .034, .03, n=7, mat=BR)
    for k in range(3):                                                                           # three carved prongs
        a = tau * k / 3 + .3; ca, sa = math.cos(a), math.sin(a)
        pr = [(.02, .8), (.06, .87), (.07, .95), (.045, 1.02), (.018, 1.05)]
        m.ptube([(ca * r, sa * r, z) for r, z in pr], [.018, .016, .013, .01, .006], 3, WD, cap1=WD)
    m.hull(ell((0, 0, .95), (.058, .058, .062), nu=7, nv=4), GM)                                # orb
    return m

def rot_about_x_to_face(m, start=0):
    """Rotate lathe output (built about +Z) so its axis points +X (shield bosses)."""
    return m.transform(Matrix.Rotation(math.radians(90), 4, 'Y'), start)

def clip_half(poly, nrm, off):
    out = []
    for i in range(len(poly)):
        a, b = poly[i], poly[(i + 1) % len(poly)]
        da, db = a[0] * nrm[0] + a[1] * nrm[1] - off, b[0] * nrm[0] + b[1] * nrm[1] - off
        if da <= 0: out.append(a)
        if (da <= 0) != (db <= 0):
            t = da / (da - db); out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out

def b_round():
    """Round plank shield: four planks over a dark backing, tier-metal rim, domed boss, straps; face +X."""
    m = M(); RY, RZ, T, n = .31, .322, .036, 16
    circ = [(RY * math.cos(tau * i / n), RZ * math.sin(tau * i / n)) for i in range(n)]
    edges = [-RY, -.155, 0, .155, RY]
    for k in range(4):                                                                         # planks (x 0..T)
        poly = clip_half(circ, (1, 0), edges[k + 1] - .004); poly = clip_half(poly, (-1, 0), -(edges[k] + .004))
        slab(m, [(y, z) for y, z in poly], lambda u, v: T / 2, WD, WK, plane='yz')
    m.transform(Matrix.Translation((T / 2, 0, 0)))
    bk = [(T * .45, RY * .97 * math.cos(tau * i / n), RZ * .97 * math.sin(tau * i / n)) for i in range(n)]
    m.add(bk, [tuple(reversed(range(n)))], [WK])                                              # dark backing shows in the gaps
    rim = [(T * .6, RY * math.cos(tau * i / 14), RZ * math.sin(tau * i / 14)) for i in range(14)]
    m.ptube(rim, .02, 4, lambda j, i: ME if i == 0 else MT, closed=True, front=(1, 0, 0))
    s0 = len(m.v)
    m.lathe([(.088, 0), (.086, .012), (.068, .032), (.036, .054), (0, .06)], 10, lambda j, i: MD if j == 0 else MT, cap0=MD)
    rot_about_x_to_face(m, s0); m.transform(Matrix.Translation((T, 0, 0)), s0)
    for zz in (.16, -.16):                                                                     # iron straps
        w = RY * math.sqrt(max(0, 1 - (zz / RZ) ** 2)) * .92
        m.hull(cbox((T + .004, 0, zz), (.005, w, .017)), MD)
    m.ptube([(-.028, 0, -.08), (-.042, 0, -.05), (-.042, 0, .05), (-.028, 0, .08)], .012, 5, LK, cap0=LK, cap1=LK)
    return m

def b_sq():
    """Curved rectangular shield, convex toward +X: raised rim, sunken field, cross band and boss."""
    m = M()
    ys = [-.28, -.258, -.236, -.1, 0, .1, .236, .258, .28]
    zs = [-.52, -.498, -.476, .06, .286, .308, .33]
    W, Hn = len(ys), len(zs)
    def X(y): return .042 - .182 * (y / .28) ** 2
    def ringi(i, j): return min(i, W - 1 - i, j, Hn - 1 - j)
    k = len(m.v)
    for j, z in enumerate(zs):
        for i, y in enumerate(ys):
            m.v.append(Vector((X(y) + (.012 if ringi(i, j) <= 1 else 0.0), y, z)))
    for j in range(Hn - 1):
        for i in range(W - 1):
            rq = min(i, W - 2 - i, j, Hn - 2 - j)
            m.f.append((k + j * W + i, k + j * W + i + 1, k + (j + 1) * W + i + 1, k + (j + 1) * W + i))
            m.mi.append(ME if rq == 0 else (MD if rq == 1 else MT))
    kb = len(m.v)
    for j, z in enumerate(zs):
        for i, y in enumerate(ys): m.v.append(Vector((X(y) - .022, y, z)))
    for j in range(Hn - 1):
        for i in range(W - 1):
            m.f.append((kb + j * W + i, kb + (j + 1) * W + i, kb + (j + 1) * W + i + 1, kb + j * W + i + 1)); m.mi.append(MD)
    border = [(0, i) for i in range(W)] + [(j, W - 1) for j in range(1, Hn)] + \
             [(Hn - 1, i) for i in range(W - 2, -1, -1)] + [(j, 0) for j in range(Hn - 2, 0, -1)]
    for a, b in zip(border, border[1:] + border[:1]):
        fa, fb = k + a[0] * W + a[1], k + b[0] * W + b[1]; ba, bb = kb + a[0] * W + a[1], kb + b[0] * W + b[1]
        m.f.append((fa, fb, bb, ba)); m.mi.append(MD)
    m.hull([Vector((X(y) + .004 + d, y, z)) for y in (-.2, -.1, 0, .1, .2) for z in (-.1, -.06) for d in (0, .008)], MD)
    s0 = len(m.v)
    m.lathe([(.075, 0), (.072, .016), (.044, .044), (0, .054)], 10, lambda j, i: MD if j == 0 else MT, cap0=MD)
    rot_about_x_to_face(m, s0); m.transform(Matrix.Translation((X(0), 0, .06)), s0)
    m.ptube([(-.05, 0, -.07), (-.062, 0, -.04), (-.062, 0, .06), (-.05, 0, .09)], .012, 5, LK, cap0=LK, cap1=LK)
    return m

def b_kite():
    """Kite shield: raised rim, sunken band, bulging field with a centre ridge, boss at the grip; face +X."""
    m = M()
    half = [(0, .3), (.14, .285), (.27, .235), (.35, .16), (.372, .08), (.36, -.05), (.33, -.18), (.27, -.36), (.19, -.54),
            (.1, -.7), (0, -.8)]
    out = half + [(-y, z) for y, z in reversed(half[1:-1])]
    def bulge(y, z): return .028 + .065 * max(0.0, 1 - (y / .372) ** 2) * (1 - .35 * max(0.0, -z) / .8)
    cy, cz = 0.0, -.12
    rings = [[Vector((-.02, y, z)) for y, z in out]]
    for sc, lift in ((1.0, .012), (.93, .012), (.88, 0.0), (.55, 0.0), (.22, 0.0)):
        ring = []
        for y, z in out:
            yy, zz = cy + (y - cy) * sc, cz + (z - cz) * sc
            ridge = .014 if (abs(yy) < 1e-4 and sc < .9) else 0.0
            ring.append(Vector((bulge(yy, zz) + lift + ridge, yy, zz)))
        rings.append(ring)
    m.loft(rings, lambda j, i: MD if j == 0 else (ME if j == 1 else (MD if j == 2 else MT)), cap0=MD)
    m.fan(list(rings[-1]), (bulge(cy, cz) + .014, cy, cz), MT)
    m.hull(ell((bulge(0, -.12) + .022, 0, -.12), (.03, .062, .062), nu=8, nv=3), ME)          # boss on the field
    for sy in (-1, 1):                                                                         # raised cross-band either side of the boss
        m.hull([Vector((bulge(y, -.12) + .004 + d, y, z)) for y in (sy * .07, sy * .2, sy * .3) for z in (-.145, -.095) for d in (0, .012)], MD)
    m.ptube([(-.03, 0, -.07), (-.045, 0, -.04), (-.045, 0, .06), (-.03, 0, .09)], .012, 5, LK, cap0=LK, cap1=LK)
    return m

def b_arrow():
    m = M()                                                                                   # points to Blender -Y (= glTF +Z)
    m.ptube([(0, .3, 0), (0, -.29, 0)], .011, 5, WD, cap0=WK, cap1=WD, phase=.3)
    m.hull([Vector(p) for p in [(0, -.4, 0), (.034, -.3, 0), (-.034, -.3, 0), (0, -.3, .011), (0, -.3, -.011),
                                (.02, -.28, 0), (-.02, -.28, 0)]], lambda n, c: ME if abs(n.z) > .5 else MT)
    for a in (0, tau / 3, 2 * tau / 3):
        ca, sa = math.cos(a), math.sin(a)
        pts = [(0, .3, 0), (0, .17, 0), (.034, .28, 0), (.03, .31, 0)]
        vs = [Vector((ca * x, y, sa * x)) for x, y, _ in pts]
        m.add(vs, [(0, 1, 2, 3), (3, 2, 1, 0)], [ST, ST])
    m.hull(cbox((0, .31, 0), (.013, .012, .013)), LK)
    return m

# ================================================================ WORN MODELS (kit bind space; parts carry a bone)
KIT_HEAD = Vector((0, -.022, 1.685))
def P(bone, m): return (bone, m)

def b_fullhelm():
    m = M(); n = 16; cx, cy = 0.0, -.02
    fi = FRONT_I(n)
    def front_sector(i, span=2): return min(abs(i - fi), n - abs(i - fi)) <= span
    specs = [(1.49, .132, .158, .138), (1.52, .126, .152, .132), (1.6, .128, .162, .134), (1.65, .13, .166, .135),
             (1.672, .131, .167, .136), (1.702, .131, .167, .136), (1.725, .13, .165, .135), (1.78, .124, .155, .13),
             (1.84, .106, .13, .112), (1.89, .07, .086, .075), (1.915, .03, .036, .032)]
    rings = []
    for j, (z, rx, rf, rb) in enumerate(specs):
        def off(i, a, j=j):
            o = 0.0
            if j in (4, 5) and front_sector(i, 3): o -= .018                                   # eye slit
            if 1 <= j <= 3 and min(abs(i - fi), n - abs(i - fi)) == 0: o -= .012              # breath groove
            if j >= 7 and (i == fi or i == n // 4): o += .014                                 # crest ridge
            return o
        rings.append(sring(z, rx, rf, rb, n, cx, cy, p=2.4, off=off))
    inner = [Vector((p.x * .9, cy + (p.y - cy) * .9, p.z + .012)) for p in rings[0]]
    def side(j, i):
        if j == 0: return MD
        jj = j - 1
        if jj in (3, 4, 5) and front_sector(i, 3): return MD
        if jj in (0, 1, 2) and (i == fi or (i + 1) % n == fi): return MD
        if jj >= 7 and (i in (fi, fi - 1, n // 4, n // 4 - 1)): return ME
        if jj == 0: return ME
        return MT
    m.loft([inner] + rings, side)
    m.fan(rings[-1], (cx, cy + .003, 1.93), lambda i: ME if i in (fi, fi - 1, n // 4, n // 4 - 1) else MT)
    for sx in (-1, 1):                                                                         # temple rivets
        m.hull(ell((sx * .133, cy - .02, 1.61), (.012, .014, .014), nu=5, nv=3), ME)
    return [P('Head', m)]

def b_medhelm():
    m = M(); n = 16; cx, cy = 0.0, -.02; fi = FRONT_I(n)
    def zdrop(i, a): return -.13 * max(0.0, math.sin(a)) ** 1.6                              # sallet tail at the back
    specs = [(1.672, .132, .156, .14), (1.69, .134, .158, .142), (1.712, .131, .154, .138), (1.77, .125, .146, .13),
             (1.83, .108, .124, .112), (1.88, .072, .082, .075), (1.905, .03, .034, .032)]
    rings = []
    for j, (z, rx, rf, rb) in enumerate(specs):
        ring = sring(z, rx, rf, rb, n, cx, cy, p=2.3)
        if j <= 2:
            for i, p in enumerate(ring):
                a = tau * i / n; p.z += zdrop(i, a) * (1 if j == 0 else (1 if j == 1 else .9))
        rings.append(ring)
    inner = [Vector((p.x * .9, cy + (p.y - cy) * .9, p.z + .01)) for p in rings[0]]
    m.loft([inner] + rings, lambda j, i: MD if j == 0 else (ME if j in (1, 2) else MT))
    m.fan(rings[-1], (cx, cy, 1.915), MT)
    y0 = rings[1][fi].y                                                                        # nasal guard
    m.hull([Vector(p) for p in [(-.016, y0 - .004, 1.705), (.016, y0 - .004, 1.705), (-.016, y0 + .012, 1.705),
                                (.016, y0 + .012, 1.705), (-.009, y0 - .002, 1.6), (.009, y0 - .002, 1.6),
                                (-.009, y0 + .01, 1.6), (.009, y0 + .01, 1.6)]], lambda nn, c: ME if nn.y < -.8 else MT)
    comb = [(-.11, 1.84), (-.06, 1.9), (0, 1.925), (.06, 1.905), (.1, 1.86)]                  # low comb along the crown
    outline = [(y + cy, z) for y, z in comb] + [(y + cy, z - .045 * (1 - abs(y) / .13)) for y, z in reversed(comb)]
    slab(m, [(y, z) for y, z in outline], lambda u, v: .008, MT, ME, plane='yz')
    return [P('Head', m)]

def b_hat():
    m = M(); cy = -.02
    n = 12
    brim_o = [Vector((.215 * math.cos(tau * i / n), cy + .225 * math.sin(tau * i / n), 1.742 - .012 * math.cos(2 * tau * i / n))) for i in range(n)]
    brim_i = [Vector((.118 * math.cos(tau * i / n), cy + .128 * math.sin(tau * i / n), 1.768)) for i in range(n)]
    brim_ob = [Vector((p.x, p.y, p.z - .014)) for p in brim_o]
    brim_ib = [Vector((p.x, p.y, p.z - .016)) for p in brim_i]
    m.loft([brim_i, brim_o, brim_ob, brim_ib, brim_i], lambda j, i: CL if j < 2 else CK)
    cone = [(.121, .126, 1.766, 0, 0), (.121, .126, 1.805, 0, 0), (.112, .118, 1.812, 0, 0), (.086, .09, 1.9, 0, .006),
            (.06, .062, 1.99, 0, .02), (.038, .04, 2.06, 0, .05), (.022, .024, 2.1, 0, .09)]
    rings = []
    for rx, ry, z, dx, dy in cone:
        rings.append([Vector((dx + rx * math.cos(tau * i / 10), cy + dy + ry * math.sin(tau * i / 10), z)) for i in range(10)])
    m.loft(rings, lambda j, i: CK if j in (0, 1) else CL, cap0=CK)
    m.fan(rings[-1], (0, cy + .15, 2.075), CL)
    return [P('Head', m)]

def arm_line(side):
    """Rest-pose arm joints (kit): shoulder, elbow, wrist (x mirrored by side +1 = left, -1 = right)."""
    return [Vector((side * .11, .01, 1.4)), Vector((side * .25, .04, 1.15)), Vector((side * .26, 0, .93))]

def btube(m, a, b, radii, n, side, front=(0, -1, 0), flat=1.0, off=None, cap0=None, cap1=None, ts=None):
    """Tube from a to b; radii per station (evenly spaced unless ts given); off(j, i) radial offsets."""
    a, b = Vector(a), Vector(b); t = (b - a).normalized(); f = Vector(front)
    fa = (f - t * f.dot(t)).normalized(); fb = t.cross(fa).normalized()
    N = len(radii); ts = ts or [k / (N - 1) for k in range(N)]
    rings = []
    for j, (r, tt) in enumerate(zip(radii, ts)):
        c = a.lerp(b, tt); ring = []
        rr = r if isinstance(r, (tuple, list)) else (r, r)
        for i in range(n):
            ang = tau * i / n; o = off(j, i) if off else 0.0
            ring.append(c + fa * math.cos(ang) * (rr[0] + o) + fb * math.sin(ang) * (rr[1] * flat + o))
        rings.append(ring)
    m.loft(rings, side, cap0=cap0, cap1=cap1)
    return rings

def b_platebody():
    torso = M(); n = 12; fi = FRONT_I(n)
    def ridge(i, a): return .014 if i == fi else 0.0
    lip = .012
    specs = [  # (z, rx, ryf, ryb, off-fn, material of the band ABOVE this ring)
        (.905, .214, .158, .156, None, ME), (.94, .206, .15, .15, None, MD),
        (.94, .206 - lip, .15 - lip, .15 - lip, None, MT), (.995, .204 + lip * .6, .148 + lip, .148 + lip * .6, None, MD),
        (.995, .204, .148, .146, None, MT), (1.05, .205 + lip * .6, .15 + lip, .146 + lip * .6, None, MD),
        (1.05, .205, .15, .145, None, MT), (1.11, .208, .156, .142, ridge, MT), (1.22, .226, .172, .142, ridge, MT),
        (1.31, .232, .174, .146, ridge, MT), (1.39, .23, .162, .146, ridge, MT), (1.45, .214, .142, .138, None, MT),
        (1.495, .168, .112, .11, None, ME), (1.52, .106, .088, .088, None, MD), (1.565, .096, .082, .08, None, ME)]
    rings = [sring(z, rx, rf, rb, n, 0, 0, p=2.6, off=o) for z, rx, rf, rb, o, _ in specs]
    inner_top = [Vector((p.x * .8, p.y * .8, p.z - .02)) for p in rings[-1]]
    inner_bot = [Vector((p.x * .93, p.y * .93, p.z + .03)) for p in rings[0]]
    def side(j, i):
        if j == 0: return MD
        if j == len(specs): return MD
        mat = specs[j - 1][5]
        return mat
    torso.loft([inner_bot] + rings + [inner_top], side)
    parts = [P('Spine1', torso)]
    for sd, bone_arm, bone_fore in ((1, 'LeftArm', 'LeftForeArm'), (-1, 'RightArm', 'RightForeArm')):
        sh, el, wr = arm_line(sd)
        pa = M()                                                                               # pauldron: 3 overlapping lames
        s0 = len(pa.v)
        pa.lathe([(0, .09), (.07, .075), (.118, .012), (.112, .004), (.128, -.026), (.122, -.032), (.13, -.058), (.1, -.052)],
                 8, lambda j, i: ME if j in (2, 4, 6) else (MD if j in (3, 5) else MT), sc=(1.0, 1.08), phase=math.pi / 8)
        up = Vector((sd * .55, 0, .835)).normalized()
        R = Vector((0, 0, 1)).rotation_difference(up).to_matrix().to_4x4()
        pa.transform(Matrix.Translation((sd * .2, .018, 1.39)) @ Matrix.Scale(1.12, 4) @ R, s0)
        ua = M()                                                                               # rerebrace
        d = (el - sh).normalized()
        btube(ua, sh + d * .06, el - d * .01, [(.105, .11), (.1, .104), (.09, .094)], 8, lambda j, i: MT, cap0=MD)
        fo = M()                                                                               # couter + vambrace with a flared cuff
        d2 = (wr - el).normalized()
        btube(fo, el - d2 * .02, wr + d2 * .005, [.092, .084, .08, .094], 7, lambda j, i: ME if j == 2 else MT, ts=[0, .45, .82, 1.0],
              cap0=MD)
        fo.hull(ell(el + Vector((0, .07, 0)), (.045, .035, .045), nu=6, nv=3), ME)
        parts += [P(bone_arm, pa.merge(ua)), P(bone_fore, fo)]
    return parts

def b_leather_body():
    t = M(); n = 16; fi = FRONT_I(n)
    def lace(i, a): return -.008 if i == fi else 0.0
    specs = [(.93, .205, .15, .15, None, LK), (.955, .205, .15, .15, None, LE), (.985, .203, .148, .146, None, LK),
             (1.025, .204, .15, .146, lace, LE), (1.15, .21, .158, .142, lace, LE), (1.28, .222, .166, .142, lace, LE),
             (1.39, .222, .156, .142, lace, LE), (1.45, .206, .138, .135, lace, LE), (1.49, .16, .108, .106, None, LK),
             (1.525, .1, .086, .084, None, LK)]
    rings = [sring(z, rx, rf, rb, n, 0, 0, p=2.4, off=o) for z, rx, rf, rb, o, _ in specs]
    inner_top = [Vector((p.x * .82, p.y * .82, p.z - .02)) for p in rings[-1]]
    inner_bot = [Vector((p.x * .93, p.y * .93, p.z + .03)) for p in rings[0]]
    seams = {2, 6, 9, 13}
    def side(j, i):
        if j == 0 or j == len(specs): return LK
        mat = specs[j - 1][5]
        if mat == LE and i in (fi, fi - 1) and 3 <= j <= 7: return LK                         # laced opening
        if mat == LE and i in seams: return LK                                               # stitched panel seams
        return mat
    t.loft([inner_bot] + rings + [inner_top], side)
    fz = rings[1][fi]
    t.hull(cbox((0, fz.y - .012, .97), (.03, .01, .024), .005), BR)                           # belt buckle
    for z in (1.08, 1.16, 1.24, 1.32):                                                         # lacing crosses
        yy = sring(z, .21, .16, .14, n, p=2.4)[fi].y - .002
        t.hull([Vector(p) for p in [(-.026, yy, z - .006), (.026, yy, z + .006), (-.026, yy - .006, z - .006),
                                    (.026, yy - .006, z + .006), (-.02, yy, z - .012), (.02, yy, z)]], WK)
    parts = [P('Spine1', t)]
    for sd, bone in ((1, 'LeftArm'), (-1, 'RightArm')):
        sh, el, _ = arm_line(sd); d = (el - sh).normalized(); s = M()
        btube(s, sh + d * .05, sh + d * .16, [.09, .088, .094], 8, lambda j, i: LK if j == 1 else LE, cap0=LK)
        parts.append(P(bone, s))
    return parts

def b_chainbody():
    t = M(); n = 14
    zs = [.84, .9, .96, 1.02, 1.08, 1.14, 1.2, 1.26, 1.32, 1.38, 1.44, 1.49]
    prof = {.84: (.214, .162, .166), .9: (.21, .155, .16), .96: (.205, .148, .15), 1.02: (.204, .146, .146),
            1.08: (.205, .148, .142), 1.14: (.21, .154, .14), 1.2: (.22, .164, .14), 1.26: (.226, .168, .142),
            1.32: (.228, .166, .144), 1.38: (.226, .158, .144), 1.44: (.212, .14, .136), 1.49: (.165, .11, .108)}
    rings = []
    for j, z in enumerate(zs):
        rx, rf, rb = prof[z]; rings.append(sring(z, rx, rf, rb, n, p=2.5, phase=(math.pi / n if j % 2 else 0.0)))
    top = sring(1.53, .1, .086, .084, n, p=2.5); top2 = sring(1.555, .094, .08, .078, n, p=2.5)
    hem = [Vector((p.x * 1.03, p.y * 1.03, p.z - .015)) for p in rings[0]]
    inner_top = [Vector((p.x * .82, p.y * .82, p.z - .02)) for p in top2]
    inner_bot = [Vector((p.x * .93, p.y * .93, p.z + .03)) for p in hem]
    allr = [inner_bot, hem] + rings + [top, top2, inner_top]
    last = len(allr) - 2
    def side(j, i):
        if j <= 1 or j >= last - 2: return LK                                                 # leather hem + collar trim
        return MM if (i + j) % 2 else MT                                                      # staggered mail rows
    t.loft(allr, side)
    parts = [P('Spine1', t)]
    for sd, bone in ((1, 'LeftArm'), (-1, 'RightArm')):
        sh, el, _ = arm_line(sd); d = (el - sh).normalized(); s = M()
        btube(s, sh + d * .04, sh + d * .2, [.09, .088, .086, .09], 8, lambda j, i: LK if j == 2 else (MM if (i + j) % 2 else MT),
              ts=[0, .5, .9, 1.0], cap0=LK)
        parts.append(P(bone, s))
    return parts

LEG = {1: (Vector((.11, .02, .95)), Vector((.12, .06, .52)), Vector((.13, .1, .12))),
       -1: (Vector((-.11, .02, .95)), Vector((-.12, .06, .52)), Vector((-.13, .1, .12)))}

def b_platelegs():
    hips = M(); n = 14; fi = round(3 * n / 4)
    specs = [(1.035, .2, .15, .14, MD), (1.0, .206, .154, .146, MT), (.955, .214, .162, .152, MD), (.955, .222, .17, .16, MT),
             (.905, .228, .176, .166, ME), (.89, .222, .17, .16, MD)]
    rings = [sring(z, rx, rf, rb, n, p=2.6) for z, rx, rf, rb, _ in specs]
    inner = [Vector((p.x * .9, p.y * .9, p.z + .02)) for p in rings[-1]]
    hips.loft(rings + [inner], lambda j, i: specs[j][4] if j < len(specs) else MD)
    for sx in (-1, 1):                                                                         # front tassets
        y0 = sring(.89, .23, .176, .16, n, p=2.6)[fi].y
        hips.hull([Vector(p) for p in [(sx * .03, y0 - .002, .905), (sx * .19, y0 + .045, .905), (sx * .03, y0 + .014, .905),
                                       (sx * .19, y0 + .06, .905), (sx * .04, y0 - .012, .79), (sx * .17, y0 + .02, .79),
                                       (sx * .04, y0 + .004, .79), (sx * .17, y0 + .036, .79)]],
                  lambda nn, c: ME if nn.y < -.7 else MT)
    parts = [P('Hips', hips)]
    for sd, up_b, lo_b in ((1, 'LeftUpLeg', 'LeftLeg'), (-1, 'RightUpLeg', 'RightLeg')):
        hip, knee, ank = LEG[sd]
        th = M(); nn = 10; ffi = 0
        d = (knee - hip).normalized()
        btube(th, hip + d * .05, knee + d * .01, [(.118, .122), (.112, .114), (.1, .1)], nn,
              lambda j, i: ME if i in (0, nn - 1) else MT, off=lambda j, i: .012 if i == 0 else 0.0, cap0=MD)
        kn = M()
        kc = knee + Vector((0, -.085, .0))
        kn.hull(ell(kc, (.062, .03, .058), nu=8, nv=3) + [kc + Vector((sx * .085, .035, 0)) for sx in (-1, 1)], ME)
        gr = M(); d2 = (ank - knee).normalized()
        btube(gr, knee + d2 * .04, ank + Vector((0, 0, .0)), [(.1, .098), (.094, .09), (.084, .08), (.098, .096)], nn,
              lambda j, i: ME if i in (0, nn - 1) else MT, off=lambda j, i: .011 if i == 0 else 0.0, ts=[0, .35, .75, 1.0],
              cap0=MD, cap1=MD)
        parts += [P(up_b, th), P(lo_b, kn.merge(gr))]
    return parts

def b_plateskirt():
    s = M(); n = 16
    belt = [sring(z, rx, rf, rb, n, p=2.6) for z, rx, rf, rb in ((1.045, .198, .148, .14), (1.0, .206, .154, .146))]
    def flute(i, a): return .02 if i % 2 else 0.0
    skirt = [sring(z, rx, rf, rb, n, p=2.3, off=(flute if k else None))
             for k, (z, rx, rf, rb) in enumerate(((1.0, .212, .16, .152), (.985, .222, .17, .162), (.8, .26, .21, .2),
                                                  (.62, .29, .24, .228), (.46, .31, .258, .246)))]
    inner = [Vector((p.x * .94, p.y * .94, p.z + .02)) for p in skirt[-1]]
    s.loft(belt, LK)
    s.loft(skirt + [inner], lambda j, i: MD if j == 0 else (MD if j == len(skirt) - 1 else (ME if i % 2 else MT)))
    fz = belt[0][round(3 * n / 4)]
    s.hull(cbox((0, fz.y - .01, 1.022), (.03, .01, .024), .005), BR)
    return [P('Hips', s)]

def b_chaps():
    parts = []; n = 12
    belt = M()
    rings = [sring(z, rx, rf, rb, n, p=2.6) for z, rx, rf, rb in ((1.035, .2, .15, .14), (.985, .206, .156, .146))]
    belt.loft(rings, LK, cap0=None)
    fz = rings[0][round(3 * n / 4)]
    belt.hull(cbox((0, fz.y - .01, 1.01), (.028, .01, .022), .005), BR)
    parts.append(P('Hips', belt))
    for sd, up_b, lo_b in ((1, 'LeftUpLeg', 'LeftLeg'), (-1, 'RightUpLeg', 'RightLeg')):
        hip, knee, ank = LEG[sd]; nn = 8
        outer = 2 if sd > 0 else 6                                                            # seam on the outside of the leg
        th = M(); d = (knee - hip).normalized()
        btube(th, hip + d * .06, knee + d * .03, [.112, .108, .1], nn, lambda j, i: LK if i == outer else LE, cap0=LK)
        sh = M(); d2 = (ank - knee).normalized()
        btube(sh, knee - d2 * .01, ank + d2 * -.04, [.1, .092, .088, .095], nn, lambda j, i: LK if (i == outer or j == 2) else LE,
              ts=[0, .4, .85, 1.0], cap0=LK, cap1=LK)
        sh.hull(ell(knee + Vector((0, -.09, -.02)), (.055, .024, .06), nu=7, nv=3), LK)       # knee patch
        parts += [P(up_b, th), P(lo_b, sh)]
    return parts

def b_gloves():
    parts = []
    for sd, bone in ((1, 'LeftHand'), (-1, 'RightHand')):
        g = M(); wr = Vector((sd * .26, 0, .93)); tip = Vector((sd * .271, -.022, .79))
        d = (tip - wr).normalized()
        btube(g, wr - d * .075, wr + d * .005, [(.058, .064), (.05, .054), (.042, .046)], 8, lambda j, i: LK if j == 0 else LE,
              front=(sd, 0, 0), ts=[0, .6, 1.0], cap0=LK)                                     # flared gauntlet cuff
        btube(g, wr + d * .005, tip + d * .02, [(.03, .046), (.033, .05), (.028, .042), (.018, .03)], 8, LE,
              front=(sd, 0, 0), ts=[0, .35, .8, 1.0], cap1=LE)                                # mitt (flat across the palm)
        g.hull(ell(wr + d * .06 + Vector((sd * -.012, -.045, 0)), (.016, .02, .03), nu=6, nv=3), LE)   # thumb
        parts.append(P(bone, g))
    return parts

def b_boots():
    parts = []
    for sd, foot_b, leg_b in ((1, 'LeftFoot', 'LeftLeg'), (-1, 'RightFoot', 'RightLeg')):
        cx = sd * .135
        f = M(); n = 8
        st = [(.17, .058, .118), (.1, .07, .13), (0, .073, .12), (-.08, .07, .088), (-.15, .062, .062), (-.188, .046, .046)]
        rings = []
        for y, w, h in st:
            ring = []
            for i in range(n):
                a = tau * i / n + math.pi / n; c, s = math.cos(a), math.sin(a)
                k = (abs(c) ** 3 + abs(s) ** 3) ** (-1 / 3)
                ring.append(Vector((cx + w * c * k, y, max(0.0, h / 2 + h / 2 * s * k))))
            rings.append(ring)
        f.loft(rings, lambda j, i: LK if i in (5, 6) else LE, cap0=LE)
        f.fan(rings[-1], (cx, -.2, .02), lambda i: LK if i in (5, 6) else LE)
        f.hull(cbox((cx, .03, .006), (.07, .15, .006)), LK)                                    # sole
        sh = M(); _, knee, ank = LEG[sd]
        bot = Vector((cx, .08, .08)); top = Vector((cx * .98, .085, .345))
        btube(sh, bot, top, [(.074, .08), (.08, .084), (.09, .094), (.104, .108), (.108, .112)], 9,
              lambda j, i: LK if j in (1, 3) else LE, ts=[0, .3, .75, .88, 1.0], cap0=LE)     # shaft + folded cuff
        sh.hull(cbox((cx + sd * .086, .07, .165), (.008, .02, .016), .003), BR)               # ankle strap buckle
        parts += [P(foot_b, f), P(leg_b, sh)]
    return parts

def b_amulet():
    m = M()
    pts = [(0, .085, 1.49), (.06, .06, 1.485), (.09, .0, 1.47), (.085, -.07, 1.44), (.045, -.118, 1.4), (0, -.132, 1.378),
           (-.045, -.118, 1.4), (-.085, -.07, 1.44), (-.09, .0, 1.47), (-.06, .06, 1.485)]
    m.ptube(pts, .0055, 3, BR, closed=True)
    s0 = len(m.v)
    m.lathe([(0, -.008), (.03, -.008), (.034, .0), (.03, .008), (0, .008)], 10, BR)
    m.transform(Matrix.Translation((0, -.146, 1.345)) @ Matrix.Rotation(math.radians(90), 4, 'X'), s0)
    m.hull(ell((0, -.156, 1.345), (.02, .012, .024), nu=6, nv=3), GM)
    return [P('Spine2', m)]

def b_cape():
    m = M(); cols = 9
    rows = [(1.475, .2, .15, 0.0), (1.33, .23, .2, .004), (1.08, .26, .235, .012), (.8, .29, .27, .02), (.53, .31, .3, .026)]
    outer = []; inner = []
    for z, hw, y, fold in rows:
        ro = []; ri = []
        for c in range(cols):
            u = -1 + 2 * c / (cols - 1); x = u * hw
            yy = y + .05 * u * u + fold * math.cos(c * math.pi)                                # wraps round; folds alternate
            ro.append(Vector((x, yy + .012, z))); ri.append(Vector((x, yy, z)))
        outer.append(ro); inner.append(ri)
    k = len(m.v); W = cols
    for r in outer: m.v += r
    for r in inner: m.v += r
    H = len(rows); ko, ki = k, k + H * W
    for j in range(H - 1):
        for i in range(W - 1):
            m.f.append((ko + j * W + i, ko + j * W + i + 1, ko + (j + 1) * W + i + 1, ko + (j + 1) * W + i)); m.mi.append(CL)
            m.f.append((ki + j * W + i, ki + (j + 1) * W + i, ki + (j + 1) * W + i + 1, ki + j * W + i + 1)); m.mi.append(CK)
    border = [(0, i) for i in range(W)] + [(j, W - 1) for j in range(1, H)] + [(H - 1, i) for i in range(W - 2, -1, -1)] + \
             [(j, 0) for j in range(H - 2, 0, -1)]
    for a, b in zip(border, border[1:] + border[:1]):
        m.f.append((ko + a[0] * W + a[1], ki + a[0] * W + a[1], ki + b[0] * W + b[1], ko + b[0] * W + b[1])); m.mi.append(CK)
    col = [(x, y - .01, 1.49) for x, y, _ in [(p.x, p.y, p.z) for p in outer[0]]]
    col = [(-.2, -.01, 1.46)] + col + [(.2, -.01, 1.46)]
    m.ptube(col, .022, 5, CL, cap0=CK, cap1=CK)                                                # rolled collar
    for sx in (-1, 1):
        m.hull(ell((sx * .2, -.03, 1.46), (.022, .014, .022), nu=6, nv=3), BR)                 # clasps
    return [P('Spine2', m)]

# ---------------------------------------------------------------- registry
# kind: (builder, slot, frame, equipSpec, grip glTF, axis glTF, roll glTF, legacy quat xyzw, description)
Q_ID, Q_FLIPX = [0, 0, 0, 1], [1, 0, 0, 0]
MODELS = [
    ('dagger',     b_dagger,     'weapon', 'grip', 'sword',      [0, .02, 0],    [0, -1, 0], [1, 0, 0], Q_FLIPX,
     'Leaf-flat dagger: fullered blade, up-tipped quillons, cord grip, ball pommel'),
    ('sword',      b_sword,      'weapon', 'grip', 'sword',      [0, .025, 0],   [0, -1, 0], [1, 0, 0], Q_FLIPX,
     'Arming sword: fullered blade with honed bevels, blade-curled quillons, ecusson, cord grip, wheel pommel'),
    ('longsword',  b_longsword,  'weapon', 'grip', 'longsword',  [0, .025, 0],   [0, -1, 0], [1, 0, 0], Q_FLIPX,
     'Longsword: long fullered blade, straight block cross, hand-and-a-half grip, faceted pommel'),
    ('sabre',      b_sabre,      'weapon', 'grip', 'sabre',      [0, .028, 0],   [0, -1, 0], [1, 0, 0], Q_FLIPX,
     'Sabre: curved blade that widens toward a clipped tip, S-guard, bird-head pommel'),
    ('greatsword', b_greatsword, 'weapon', 'grip', 'greatsword', [0, 0, 0],      [0, 1, 0],  [1, 0, 0], Q_ID,
     'Two-hander: broad fullered blade, winged cross, long two-hand grip, wheel pommel'),
    ('mace',       b_mace,       'weapon', 'grip', 'mace',       [0, 0, 0],      [0, 1, 0],  [1, 0, 0], Q_ID,
     'Flanged mace: iron haft, six flanges on a core, top spike, cord grip'),
    ('warhammer',  b_warhammer,  'weapon', 'grip', 'warhammer',  [0, 0, 0],      [0, 1, 0],  [1, 0, 0], Q_ID,
     'Warhammer: oak haft with langets, square striking face (+X), drooping back spike'),
    ('battleaxe',  b_battleaxe,  'weapon', 'grip', 'battleaxe',  [0, -.14, 0],   [0, 1, 0],  [0, 0, 1], Q_ID,
     'Battleaxe: twin crescent blades with honed edges, socket, top spike, long grip'),
    ('hatchet',    b_hatchet,    'weapon', 'grip', 'axe',        [0, -.10, 0],   [0, 1, 0],  [0, 0, 1], Q_ID,
     'Hatchet: bearded wedge head (edge +X), socket and poll, oak haft with a swollen butt and grip wrap'),
    ('pickaxe',    b_pickaxe,    'weapon', 'grip', 'pick',       [0, -.10, 0],   [0, 1, 0],  [0, 0, 1], Q_ID,
     'Pickaxe: two curved faceted picks from a socket, oak haft, grip wrap'),
    ('shortbow',   lambda: b_bow(False), 'weapon', 'grip', 'bow', [.13, -.10, 0], [0, 1, 0], [1, 0, 0], Q_ID,
     'Recurve shortbow: riser toward +X, flattened limbs with recurved tips, leather grip wrap, string'),
    ('longbow',    lambda: b_bow(True),  'weapon', 'grip', 'longbow', [.185, -.11, 0], [0, 1, 0], [1, 0, 0], Q_ID,
     'Longbow: tall D-profile stave, brass nocks and arrow plate, grip wrap, string'),
    ('staff',      b_staff,      'weapon', 'grip', 'staff',      [0, 0, 0],      [0, 1, 0],  [1, 0, 0], Q_ID,
     'Staff: knotted oak stave, brass ferrule and bands, three carved prongs holding an orb (M_GEM)'),
    ('round_shield', b_round,    'shield', 'grip', None,         [0, 0, 0],      [1, 0, 0],  [0, 1, 0], Q_ID,
     'Round plank shield: four planks, tier-metal rim, domed boss and straps, rear handle; face +X'),
    ('sqshield',   b_sq,         'shield', 'grip', None,         [0, 0, 0],      [1, 0, 0],  [0, 1, 0], Q_ID,
     'Square shield: curved sheet convex to +X, raised rim, sunken field, cross band and boss'),
    ('kiteshield', b_kite,       'shield', 'grip', None,         [0, 0, 0],      [1, 0, 0],  [0, 1, 0], Q_ID,
     'Kite shield: tall kite outline, raised rim, centre ridge, field boss and cross-band, rear handle; face +X'),
    ('arrow',      b_arrow,      'ammo',   'grip', None,         [0, 0, 0],      [0, 0, 1],  [1, 0, 0], Q_ID,
     'Arrow (projectile): metal head, wooden shaft, three string-colour vanes; points glTF +Z'),
    ('fullhelm',   b_fullhelm,   'head',   'bind', None, None, None, None, None,
     'Full helm: rounded bucket with eye slit, breath groove, crest ridge, flared neck lip, temple rivets'),
    ('medhelm',    b_medhelm,    'head',   'bind', None, None, None, None, None,
     'Open helm: crowned cap with brow band, nasal guard, low comb and a sallet tail at the back'),
    ('hat',        b_hat,        'head',   'bind', None, None, None, None, None,
     'Pointed cloth hat: wavy brim, band, slumped cone tip (M_CLOTH)'),
    ('platebody',  b_platebody,  'body',   'bind', None, None, None, None, None,
     'Platebody: breastplate with centre ridge, three overlapping belly lames, gorget, 3-lame pauldrons, rerebraces, vambraces'),
    ('leather_body', b_leather_body, 'body', 'bind', None, None, None, None, None,
     'Leather body: panelled jerkin, laced front, belt and brass buckle, short sleeves'),
    ('chainbody',  b_chainbody,  'body',   'bind', None, None, None, None, None,
     'Chainbody: hip-length mail shirt (staggered two-tone rows), leather hem and collar trim, short sleeves'),
    ('platelegs',  b_platelegs,  'legs',   'bind', None, None, None, None, None,
     'Platelegs: laminated fauld with front tassets, ridged cuisses, knee cops, greaves'),
    ('plateskirt', b_plateskirt, 'legs',   'bind', None, None, None, None, None,
     'Plateskirt: fluted plate skirt to the shin on a leather belt with brass buckle'),
    ('chaps',      b_chaps,      'legs',   'bind', None, None, None, None, None,
     'Leather chaps: belt and buckle, thigh and shin covers with outside seams, knee patches'),
    ('gloves',     b_gloves,     'hands',  'bind', None, None, None, None, None,
     'Leather gloves: flared gauntlet cuffs, mitts with thumbs'),
    ('boots',      b_boots,      'feet',   'bind', None, None, None, None, None,
     'Leather boots: rounded toe, dark sole, folded cuff, brass ankle buckle'),
    ('amulet',     b_amulet,     'amulet', 'bind', None, None, None, None, None,
     'Amulet: brass chain loop, round setting, gem (M_GEM)'),
    ('cape',       b_cape,       'cape',   'bind', None, None, None, None, None,
     'Cape: rolled collar, folds that alternate down to a flared hem, dark lining, brass clasps (M_CLOTH)'),
]
if ONLY: MODELS = [r for r in MODELS if r[0] in ONLY]

# ================================================================ game data: every equipable item -> kind
def read(f): return (ROOT / f).read_text(encoding='utf8', errors='replace')
def parse_items():
    txt = read('src/game1_data.js'); s = txt.index('const ITEMS'); e = txt.index('\n};', s)
    block = txt[s:e]; items = {}
    starts = [(m_.start(), m_.group(1)) for m_ in re.finditer(r"^\s{2}([a-z_0-9]+)\s*:\s*\{name:", block, re.M)]
    for k, (pos, iid) in enumerate(starts):
        body = block[pos:starts[k + 1][0] if k + 1 < len(starts) else len(block)]
        d = {a: b for a, b in re.findall(r"\b(equip|model|tier|tool|style)\s*:\s*'([^']*)'", body)}
        nm = re.search(r"name:\s*(['\"])(.*?)(?<!\\)\1", body); d['name'] = nm.group(2).replace("\\'", "'") if nm else iid
        items[iid] = d
    tiers = re.findall(r"\{key:'(\w+)',\s*label:'([^']+)'", txt)
    ts = txt.index('const GEAR_TEMPLATES'); te = txt.index('\n};', ts)
    templates = {k: dict(name=n, equip=q, model=mo) for k, n, q, mo in
                 re.findall(r"^\s*(\w+)\s*:\s*\{name:'([^']*)',\s*equip:'(\w+)'.*?model:'(\w+)'\}", txt[ts:te], re.M)}
    ga = txt.index('const GEAR_ALIASES'); aliases = dict(re.findall(r"^\s*(\w+):\s*'(\w+)',", txt[ga:txt.index('};', ga)], re.M))
    for tk, tl in tiers:
        for k, tp in templates.items():
            iid = '%s_%s' % (tk, k)
            if iid in aliases or iid in items: continue
            items[iid] = dict(name='%s %s' % (tl, tp['name']), equip=tp['equip'], model=tp['model'], tier=tk, generated='1')
    dg = read('src/smith_bronze_dagger.js')                                                      # runtime addition
    if 'bronze_dagger' not in items and 'equip:' in dg:
        items['bronze_dagger'] = dict(name='Bronze dagger', equip='weapon', model='sword', tier='bronze',
                                      runtime='src/smith_bronze_dagger.js')
    return items, [t for t, _ in tiers], aliases
GAME_ITEMS, GAME_TIERS, GEAR_ALIASES = parse_items()
MODEL_TO_KIND = {'sword': 'sword', 'longsword': 'longsword', 'sabre': 'sabre', 'greatsword': 'greatsword', 'mace': 'mace',
                 'warhammer': 'warhammer', 'battleaxe': 'battleaxe', 'axe': 'hatchet', 'pick': 'pickaxe', 'bow': 'shortbow',
                 'longbow': 'longbow', 'staff': 'staff', 'shield': 'round_shield', 'sqshield': 'sqshield',
                 'kiteshield': 'kiteshield', 'helm': 'fullhelm', 'medhelm': 'medhelm', 'hat': 'hat', 'plate': 'platebody',
                 'legs': 'platelegs', 'chainbody': 'chainbody', 'plateskirt': 'plateskirt', 'chaps': 'chaps',
                 'gloves': 'gloves', 'boots': 'boots', 'amulet': 'amulet', 'cape': 'cape', 'robe': None}
ID_TO_KIND = {'bronze_dagger': 'dagger', 'iron_dagger': 'dagger', 'leather_body': 'leather_body'}
def kind_for(iid, d):
    if iid in ID_TO_KIND: return ID_TO_KIND[iid]
    if d.get('model') == 'plate' and d.get('tier') == 'leather': return 'leather_body'
    return MODEL_TO_KIND.get(d.get('model'))
PROC_BUILDER = {'sword': 'swordMesh', 'longsword': 'swordMesh', 'sabre': 'swordMesh', 'mace': 'swordMesh', 'greatsword': 'swordMesh',
                'battleaxe': 'axeMesh', 'warhammer': 'axeMesh', 'axe': 'axeMesh', 'pick': 'pickMesh', 'bow': 'bowMesh',
                'longbow': 'bowMesh', 'staff': 'staffMesh', 'shield': 'shieldMesh', 'kiteshield': 'shieldMesh',
                'sqshield': 'shieldMesh', 'helm': 'helmMesh', 'medhelm': 'helmMesh', 'plate': 'bodyArmorMesh',
                'legs': 'legArmorMesh / fx_humanoid thigh cylinders', 'chainbody': 'chainBodyMesh', 'plateskirt': 'plateSkirtMesh',
                'chaps': 'chapsCover', 'gloves': 'gloveMesh', 'boots': 'bootMesh', 'amulet': 'amuletMesh', 'cape': 'capeMesh',
                'hat': 'inline brim+cone (game3_systems / fx_humanoid)', 'robe': 'torso/legs recolour (no mesh)'}
def parse_gear_models():
    g = read('src/gear_models_v1.js')
    a = g.index('var MODEL_MAP'); b = g.index('var ID_MAP')
    mm = dict(re.findall(r"(\w+)\s*:\s*'(gear_\w+)'", g[a:g.index('};', a)]))
    im = dict(re.findall(r"(\w+)\s*:\s*'(gear_\w+)'", g[b:g.index('};', b)]))
    return mm, im
GM_MODEL_MAP, GM_ID_MAP = parse_gear_models()
def today(iid, d):
    proc = PROC_BUILDER.get(d.get('model'), 'none: gearMesh returns null (no model field)' if not d.get('model') else '?')
    glb_ = GM_ID_MAP.get(iid) or GM_MODEL_MAP.get(d.get('model'))
    return (('%s GLB (gear_models_v1) over ' % glb_) if glb_ else '') + proc
EQUIP_TABLE = []
for iid in sorted(GAME_ITEMS, key=lambda i: (bool(GAME_ITEMS[i].get('generated')), i)):
    d = GAME_ITEMS[iid]
    if not d.get('equip'): continue
    EQUIP_TABLE.append(dict(id=iid, name=d['name'], slot=d['equip'], model=d.get('model', ''), tier=d.get('tier', ''),
                            today=today(iid, d), kind=kind_for(iid, d), generated=bool(d.get('generated'))))
print(TAG, 'equipable items in game data:', len(EQUIP_TABLE))

# ================================================================ build objects
C_G2B = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))          # glTF vector -> Blender vector
def g2b(v): return C_G2B @ Vector(v)
def b2g(v): return C_G2B.inverted() @ Vector(v)

def make_mesh(name, m):
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(v) for v in m.v], [], m.f); me.validate(clean_customdata=False)
    slots = list(dict.fromkeys(m.mi))
    for sname in slots: me.materials.append(MAT[sname])
    for poly, sname in zip(me.polygons, m.mi): poly.material_index = slots.index(sname)
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges[:], dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    me.set_sharp_from_angle(angle=SMOOTH_ANGLE)
    me.update()
    return me

BUILT = []
for kind, fn, slot, frame, spec, grip, axis, roll, legacy, desc in MODELS:
    res = fn()
    parts = res if isinstance(res, list) else [(None, res)]
    root = bpy.data.objects.new('eq_' + kind, None); bpy.context.collection.objects.link(root)
    obs = []
    for bone, m in parts:
        nm = 'eq_%s__%s' % (kind, bone) if bone else 'eq_%s_mesh' % kind
        me = make_mesh(nm, m)
        ob = bpy.data.objects.new(nm, me); bpy.context.collection.objects.link(ob); ob.parent = root
        if bone: ob['bone'] = bone
        obs.append((ob, bone))
    root['eq_kind'] = kind; root['slot'] = slot; root['frame'] = frame
    if frame == 'grip':
        root['grip'] = grip; root['axis'] = axis; root['roll'] = roll; root['legacy'] = legacy
        if spec: root['equipSpec'] = spec
    BUILT.append(dict(kind=kind, root=root, obs=obs, slot=slot, frame=frame, spec=spec, grip=grip, axis=axis, roll=roll,
                      legacy=legacy, desc=desc))
bpy.context.view_layer.update()

def tri_count(ob): return sum(len(p.vertices) - 2 for x in ob.children_recursive if x.type == 'MESH' for p in x.data.polygons)
def raw_bounds(ob, objs=None):
    objs = objs or [x for x in ob.children_recursive if x.type == 'MESH']
    pts = [x.matrix_world @ v.co for x in objs for v in x.data.vertices]
    return [min(p[i] for p in pts) for i in range(3)], [max(p[i] for p in pts) for i in range(3)]
def gl_bounds(lo, hi): return {'min': [round(lo[0], 4), round(lo[2], 4), round(-hi[1], 4)],
                               'max': [round(hi[0], 4), round(hi[2], 4), round(-lo[1], 4)]}

LIMIT = {'grip': 400, 'bind': 820}
for b in BUILT:
    b['tris'] = tri_count(b['root'])
    if b['tris'] > LIMIT[b['frame']]: print(TAG, 'OVER BUDGET', b['kind'], b['tris'])
    assert b['tris'] <= LIMIT[b['frame']] or ALLOW_OVER, (b['kind'], b['tris'])
    lo, hi = raw_bounds(b['root']); b['lo'], b['hi'] = lo, hi
    if b['frame'] == 'grip':          # lay: long axis -> +X (far end from the grip), thin axis -> +Z (shield face up)
        ext = [hi[i] - lo[i] for i in range(3)]
        order = sorted(range(3), key=lambda i: ext[i])
        thin, long_ = order[0], order[2]
        if b['slot'] == 'shield': thin, long_ = 0, 2
        ls = 1 if abs(hi[long_]) >= abs(lo[long_]) else -1
        el = Vector((0, 0, 0)); el[long_] = ls
        et = Vector((0, 0, 0)); et[thin] = 1
        em = et.cross(el)
        R = Matrix((el, em, et))                                        # rows: maps el->X, em->Y, et->Z
        Rg = C_G2B.inverted() @ R @ C_G2B
        q = Rg.to_quaternion(); b['lay'] = [round(q.x, 6), round(q.y, 6), round(q.z, 6), round(q.w, 6)]
        b['lay_b'] = R
    else:
        b['lay'] = [0.0, 0.0, 0.0, 1.0]; b['lay_b'] = Matrix.Identity(3)
    b['root']['lay'] = b['lay']
    print(TAG, b['kind'], b['frame'], b['tris'], 'tris', 'parts', len(b['obs']))

# ---------------------------------------------------------------- export
bpy.ops.object.select_all(action='DESELECT')
for b in BUILT:
    b['root'].select_set(True)
    for x in b['root'].children_recursive: x.select_set(True)
glb = OUT / 'equipment.glb'
bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', use_selection=True, export_animations=False,
                          export_yup=True, export_apply=True, export_materials='EXPORT', export_extras=True)
raw = glb.read_bytes(); jslen = struct.unpack_from('<I', raw, 12)[0]; doc = json.loads(raw[20:20 + jslen])
sha = hashlib.sha256(raw).hexdigest()
nodes = doc['nodes']; top_nodes = set(doc['scenes'][0]['nodes'])
def glb_tris(ni):
    n = nodes[ni]; t = 0
    if 'mesh' in n:
        for pr in doc['meshes'][n['mesh']]['primitives']: t += doc['accessors'][pr['indices']]['count'] // 3
    return t + sum(glb_tris(c) for c in n.get('children', []))
glb_roots = {nodes[i]['name']: i for i in top_nodes}
assert len(doc.get('materials', [])) <= 16, len(doc['materials'])
assert not doc.get('images') and not doc.get('textures'), 'no image textures allowed'
for gm in doc['materials']:
    got = gm['pbrMetallicRoughness']['baseColorFactor'][:3]
    assert all(abs(a - c) < 1e-4 for a, c in zip(got, PALETTE[gm['name']])), (gm['name'], got)
for b in BUILT:
    ni = glb_roots['eq_' + b['kind']]; assert glb_tris(ni) == b['tris'], (b['kind'], glb_tris(ni), b['tris'])
    ex = nodes[ni].get('extras', {}); assert ex.get('eq_kind') == b['kind'], (b['kind'], ex)
    for c in nodes[ni].get('children', []):
        if b['frame'] == 'bind': assert nodes[c].get('extras', {}).get('bone'), (b['kind'], nodes[c]['name'])
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'equipment.blend'))
if (OUT / 'equipment.blend1').exists(): (OUT / 'equipment.blend1').unlink()
print(TAG, 'GLB PASS', sum(b['tris'] for b in BUILT), 'tris', len(doc['materials']), 'materials sha256', sha)


# ================================================================ render utilities (build_holm_items_v1.py pipeline)
import numpy as np
scene = bpy.context.scene
for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
    try: scene.render.engine = eng; break
    except TypeError: pass
vts = [i.identifier for i in scene.view_settings.bl_rna.properties['view_transform'].enum_items]
scene.view_settings.view_transform = 'Raw' if 'Raw' in vts else 'Standard'
scene.view_settings.look = 'None'
scene.world = bpy.data.worlds.new('EqWorld'); scene.world.use_nodes = True
bg = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
key = bpy.data.objects.new('EqKey', bpy.data.lights.new('EqKey', 'SUN')); key.data.angle = math.radians(3)
fill = bpy.data.objects.new('EqFill', bpy.data.lights.new('EqFill', 'SUN'))
scene.collection.objects.link(key); scene.collection.objects.link(fill)
try: scene.eevee.taa_render_samples = 16
except Exception: pass
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGBA'
scene.render.filter_size = 1.0; scene.render.resolution_percentage = 100
def light_icon():
    bg.inputs[0].default_value = (1, 1, 1, 1); bg.inputs[1].default_value = .42
    key.data.energy = 2.3; key.rotation_euler = (math.radians(38), 0, math.radians(-40))
    fill.data.energy = .45; fill.rotation_euler = (math.radians(70), 0, math.radians(140))
    scene.render.film_transparent = True
def light_proof(sky=(.62, .7, .8)):
    bg.inputs[0].default_value = (*sky, 1); bg.inputs[1].default_value = .5
    key.data.energy = 1.8; key.rotation_euler = (math.radians(42), 0, math.radians(-35))
    fill.data.energy = .4; fill.rotation_euler = (math.radians(70), 0, math.radians(140))
    scene.render.film_transparent = False
TMP = PROOF / '_tmp'; TMP.mkdir(exist_ok=True)
def load_px(p):
    im = bpy.data.images.load(str(p)); a = np.empty(im.size[0] * im.size[1] * 4, dtype=np.float32); im.pixels.foreach_get(a)
    out = a.reshape(im.size[1], im.size[0], 4).copy(); bpy.data.images.remove(im); return out
def save_px(arr, p):
    h, w = arr.shape[:2]; im = bpy.data.images.new(p.stem, w, h, alpha=True)
    im.pixels.foreach_set(np.clip(arr, 0, 1).astype(np.float32).ravel()); im.filepath_raw = str(p); im.file_format = 'PNG'; im.save()
    bpy.data.images.remove(im)
def down(arr, f):
    h, w = arr.shape[0] // f, arr.shape[1] // f
    arr = arr[:h * f, :w * f]
    a = arr[..., 3:4]; pm = arr[..., :3] * a
    pm = pm.reshape(h, f, w, f, 3).mean(axis=(1, 3)); aa = a.reshape(h, f, w, f, 1).mean(axis=(1, 3))
    return np.concatenate([np.where(aa > 1e-6, pm / np.maximum(aa, 1e-6), 0), aa], axis=-1)
def over(top, bot):
    ta, ba = top[..., 3:4], bot[..., 3:4]; oa = ta + ba * (1 - ta)
    rgb = (top[..., :3] * ta + bot[..., :3] * ba * (1 - ta)) / np.maximum(oa, 1e-6)
    return np.concatenate([rgb, oa], axis=-1)
def shift(a, dy, dx):
    out = np.zeros_like(a); h, w = a.shape[:2]
    out[max(dy, 0):h + min(dy, 0), max(dx, 0):w + min(dx, 0)] = a[max(-dy, 0):h + min(-dy, 0), max(-dx, 0):w + min(-dx, 0)]
    return out
def srgb_decode(c): return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
INK = np.array([.07, .055, .04])
def outline(arr):
    a = arr[..., 3]
    dil = np.max([shift(a, dy, dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1)], axis=0)
    ol = np.zeros_like(arr); ol[..., :3] = INK; ol[..., 3] = np.clip(dil, 0, 1) * .9
    sh = np.zeros_like(arr); sh[..., :3] = INK; sh[..., 3] = shift(dil, -1, 1) * .35
    return over(arr, over(ol, sh))
def render_to(path, w, h, cam):
    scene.camera = cam; scene.render.resolution_x = w; scene.render.resolution_y = h
    scene.render.filepath = str(path); bpy.ops.render.render(write_still=True)
    img = load_px(path); img[..., :3] = srgb_decode(img[..., :3]); return img
def flat(name, rgb):
    m = bpy.data.materials.new(name); m.use_nodes = True
    bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value = (*rgb, 1); bs.inputs['Roughness'].default_value = 1
    if 'Specular IOR Level' in bs.inputs: bs.inputs['Specular IOR Level'].default_value = 0.0
    return m
INKM = flat('proof_ink', (.08, .08, .07))

# ---------------------------------------------------------------- tinted instances (object-level material overrides)
TINT = {}
def tinted(name, metal=None, cloth=None, gem=None):
    rgb = PALETTE[name]
    if name in (MT, MD, ME, MM) and metal is not None:
        c = hex3(metal); rgb = {MT: c, MD: metal_dark(c), ME: metal_edge(c), MM: metal_mid(c)}[name]
    elif name in (CL, CK) and cloth is not None:
        c = hex3(cloth); rgb = c if name == CL else metal_dark(c)
    elif name == GM and gem is not None: rgb = hex3(gem)
    else: return MAT[name]
    k = (name, tuple(round(v, 5) for v in rgb))
    if k not in TINT:
        m = MAT[name].copy(); m.name = '%s_%02x%02x%02x' % ((name,) + tuple(int(round(v * 255)) for v in rgb))
        bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); bs.inputs['Base Color'].default_value = (*rgb, 1)
        TINT[k] = m
    return TINT[k]
BYKIND = {b['kind']: b for b in BUILT}
for b in BUILT:
    for ob, _ in b['obs']: ob.hide_render = True
def new_coll(name):
    c = bpy.data.collections.new(name); scene.collection.children.link(c); return c
def instance(kind, coll, metal=None, cloth=None, gem=None, mtx=None):
    b = BYKIND[kind]
    r = bpy.data.objects.new('i_' + kind, None); coll.objects.link(r); r.matrix_world = mtx if mtx is not None else Matrix.Identity(4)
    obs = []
    for ob, bone in b['obs']:
        o = bpy.data.objects.new(ob.name + '_i', ob.data); coll.objects.link(o); o.parent = r
        for i, sl in enumerate(o.material_slots):
            sl.link = 'OBJECT'; sl.material = tinted(ob.data.materials[i].name, metal, cloth, gem)
        o.hide_render = False; obs.append((o, bone))
    return r, obs
def inst_bounds(r, objs=None):
    bpy.context.view_layer.update()
    objs = objs or [o for o in r.children_recursive if o.type == 'MESH']
    pts = [o.matrix_world @ v.co for o in objs for v in o.data.vertices]
    return Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)])
def upright(kind):
    b = BYKIND[kind]
    if b['frame'] == 'bind': return Matrix.Identity(4)
    if b['slot'] == 'shield': return Matrix.Rotation(-math.pi / 2, 4, 'Z')
    if kind == 'arrow': return Matrix.Rotation(-math.pi / 2, 4, 'X')
    if b['legacy'] == Q_FLIPX: return Matrix.Rotation(math.pi, 4, 'X')
    return Matrix.Identity(4)
def place(r, x, z0, y=0.0):
    lo, hi = inst_bounds(r)
    r.matrix_world = Matrix.Translation((x - (lo.x + hi.x) / 2, y, z0 - lo.z)) @ r.matrix_world
    return hi.x - lo.x
def label(coll, txt, loc, size=.06, rot=(math.pi / 2, 0, 0)):
    cu = bpy.data.curves.new('lbl', 'FONT'); cu.body = txt; cu.size = size; cu.align_x = 'CENTER'
    o = bpy.data.objects.new('lbl_' + txt[:20], cu); o.location = loc; o.rotation_euler = rot
    cu.materials.append(INKM); coll.objects.link(o); return o
def show_only(*colls):
    for c in scene.collection.children: c.hide_render = c not in colls
def ortho_cam(name, target, elev_deg, scale, yaw_deg=0.0, dist=30):
    cam = bpy.data.objects.new(name, bpy.data.cameras.new(name)); scene.collection.objects.link(cam)
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = scale; cam.data.clip_end = 200
    e, yw = math.radians(elev_deg), math.radians(yaw_deg)
    d = Vector((math.sin(yw) * math.cos(e), -math.cos(yw) * math.cos(e), math.sin(e)))
    cam.location = Vector(target) + d * dist; cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler(); return cam

# ================================================================ icons (same camera / light / post as build_holm_items_v1.py)
ICON_SET = [('bronze_dagger', 'dagger', METALS['bronze'], 40), ('bronze_sword', 'sword', METALS['bronze'], 40),
            ('iron_sword', 'sword', METALS['iron'], 40), ('hatchet', 'hatchet', METALS['bronze'], 40),
            ('iron_hatchet', 'hatchet', METALS['iron'], 40), ('pickaxe', 'pickaxe', METALS['bronze'], 40),
            ('iron_pickaxe', 'pickaxe', METALS['iron'], 40), ('worn_bow', 'shortbow', None, 40),
            ('apprentice_staff', 'staff', None, 40), ('wood_shield', 'round_shield', METALS['bronze'], 15),
            ('leather_body', 'leather_body', None, 12), ('bronze_plate', 'platebody', METALS['bronze'], 12),
            ('bronze_legs', 'platelegs', METALS['bronze'], 12)]
ICON_ROWS = []
if not NO_ICONS:
    ic = new_coll('icons'); show_only(ic); light_icon()
    ICON, SS, EL, MARGIN = 96, 4, math.radians(50), .07
    icam = bpy.data.objects.new('IconCam', bpy.data.cameras.new('IconCam')); scene.collection.objects.link(icam)
    icam.data.type = 'ORTHO'
    icam.location = Vector((0, -math.cos(EL), math.sin(EL))) * 20
    icam.rotation_euler = (-icam.location).to_track_quat('-Z', 'Y').to_euler()
    bk = PROOF / '_icon_backup'; bk.mkdir(exist_ok=True)
    for iid, kind, metal, yaw in ICON_SET:
        if kind not in BYKIND: continue
        src = ICONS / (iid + '.png')
        if src.exists() and not (bk / src.name).exists(): shutil.copy2(src, bk / src.name)   # keep the pre-v1 icon
        b = BYKIND[kind]
        base = b['lay_b'].to_4x4() if b['frame'] == 'grip' else Matrix.Rotation(math.radians(-40), 4, 'X')
        r, obs = instance(kind, ic, metal=metal, mtx=Matrix.Rotation(math.radians(yaw), 4, 'Z') @ base)
        bpy.context.view_layer.update()
        inv = icam.matrix_world.inverted()
        pts = [inv @ (o.matrix_world @ v.co) for o, _ in obs for v in o.data.vertices]
        x0, x1 = min(p.x for p in pts), max(p.x for p in pts); y0, y1 = min(p.y for p in pts), max(p.y for p in pts)
        span = max(x1 - x0, y1 - y0) * (1 + 2 * MARGIN)
        icam.data.ortho_scale = span; icam.data.shift_x = (x0 + x1) / 2 / span; icam.data.shift_y = (y0 + y1) / 2 / span
        img = render_to(TMP / (iid + '.png'), ICON * SS, ICON * SS, icam)
        img = outline(down(img, SS)); save_px(img, ICONS / (iid + '.png')); ICON_ROWS.append((iid, img))
        for o, _ in obs: bpy.data.objects.remove(o)
        bpy.data.objects.remove(r)
    def hexc(h): return np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)])
    PANEL, SLOT, LINE = hexc('#3e3529'), hexc('#473e30'), hexc('#5d5447')
    COLS = 4; CW, CH = 104 + 56 + 40 + 24, 116
    rowsN = (len(ICON_ROWS) + COLS - 1) // COLS
    sheet = np.zeros((rowsN * CH + 12, COLS * CW + 12, 4)); sheet[..., :3] = PANEL; sheet[..., 3] = 1
    def paste(img, x, y, slot):
        H = sheet.shape[0]; h, w = img.shape[:2]; y0 = H - (y + slot)
        sheet[y0:y0 + slot, x:x + slot, :3] = LINE; sheet[y0 + 1:y0 + slot - 1, x + 1:x + slot - 1, :3] = SLOT
        ox, oy = x + (slot - w) // 2, y0 + (slot - h) // 2
        sheet[oy:oy + h, ox:ox + w] = over(img, sheet[oy:oy + h, ox:ox + w])
    for k, (n, img) in enumerate(ICON_ROWS):
        cx, cy = 12 + (k % COLS) * CW, 12 + (k // COLS) * CH
        paste(img, cx, cy, 104); paste(down(img, 2), cx + 110, cy, 56); paste(down(img, 3), cx + 172, cy, 40)
    save_px(sheet, PROOF / 'icons_sheet.png')
    print(TAG, 'icons ->', ICONS, len(ICON_ROWS), 'order:', ' '.join(n for n, _ in ICON_ROWS))

# ================================================================ proof: lineup (every model, default colours)
def sheet_lineup():
    co = new_coll('lineup'); show_only(co); light_proof()
    rows = [['dagger', 'sword', 'longsword', 'sabre', 'greatsword', 'mace', 'warhammer', 'battleaxe', 'hatchet', 'pickaxe'],
            ['shortbow', 'longbow', 'staff', 'arrow', 'round_shield', 'sqshield', 'kiteshield'],
            ['fullhelm', 'medhelm', 'hat', 'amulet', 'gloves', 'boots', 'cape'],
            ['platebody', 'leather_body', 'chainbody', 'platelegs', 'plateskirt', 'chaps']]
    z = 0.0; maxw = 0
    for row in reversed(rows):
        x = 0.0; hmax = 0
        for kind in row:
            if kind not in BYKIND: continue
            r, _ = instance(kind, co, mtx=upright(kind))
            lo, hi = inst_bounds(r); w = hi.x - lo.x
            x += w / 2 + .08; place(r, x, z + .12); label(co, kind, (x, -.5, z + .02)); x += w / 2 + .08
            hmax = max(hmax, hi.z - lo.z)
        maxw = max(maxw, x); z += hmax + .3
    cam = ortho_cam('LineCam', (maxw / 2, 0, z / 2), 12, max(maxw, z * 2400 / 1500) * 1.04)
    img = render_to(PROOF / 'lineup.png', 2400, 1500, cam); save_px(img, PROOF / 'lineup.png')
    print(TAG, 'lineup ->', PROOF / 'lineup.png')

# ================================================================ proof: every metal tier
def sheet_tiers():
    co = new_coll('tiers_w'); show_only(co); light_proof()
    kinds = [k for k in ['dagger', 'sword', 'longsword', 'sabre', 'greatsword', 'mace', 'warhammer', 'battleaxe', 'hatchet',
                         'pickaxe', 'round_shield', 'sqshield', 'kiteshield', 'fullhelm', 'medhelm'] if k in BYKIND]
    z = 0.0; maxw = 0
    for tier in reversed(TIER_ORDER):
        x = .5
        label(co, tier, (.2, -.5, z + .3), size=.12, rot=(math.pi / 2, 0, 0)).data.align_x = 'RIGHT'
        for kind in kinds:
            r, _ = instance(kind, co, metal=METALS[tier], mtx=upright(kind))
            lo, hi = inst_bounds(r); w = hi.x - lo.x
            x += w / 2 + .06; place(r, x, z); x += w / 2 + .06
        maxw = max(maxw, x); z += 1.42
    cam = ortho_cam('TierCam', (maxw / 2 - .2, 0, (z - .1) / 2), 8, max((maxw + .6) * 2600 / 2400, z + .2) * 1.03)
    img = render_to(PROOF / 'tiers_weapons.png', 2400, 2600, cam); save_px(img, PROOF / 'tiers_weapons.png')
    co2 = new_coll('tiers_a'); show_only(co2)
    x = 0.0
    for tier in TIER_ORDER:
        for row, suit in enumerate((('fullhelm', 'platebody', 'platelegs'), ('medhelm', 'chainbody', 'plateskirt'))):
            zz = row * -2.1
            for kind in suit:
                if kind in BYKIND: instance(kind, co2, metal=METALS[tier], mtx=Matrix.Translation((x, 0, zz)))
        label(co2, tier, (x, -.5, -2.25), size=.12)
        x += .75
    cam = ortho_cam('TierCamA', (x / 2 - .375, 0, -.1), 6, max(x + .2, 4.4 * 2400 / 1500) * 1.02)
    img = render_to(PROOF / 'tiers_armour.png', 2400, 1500, cam); save_px(img, PROOF / 'tiers_armour.png')
    print(TAG, 'tiers ->', PROOF / 'tiers_weapons.png', PROOF / 'tiers_armour.png')

if not NO_PROOF:
    sheet_lineup(); sheet_tiers()

# ================================================================ kit rig (in-hand + worn proofs)
def parse_specs():
    t = read('src/equip_builder.js'); out = {}
    for m_ in re.finditer(r"(\w+):\s*\{axis:\[([^\]]+)\],\s*roll:\[([^\]]+)\],\s*neutral:\[([^\]]+)\],\s*rollAim:\[([^\]]+)\],"
                          r"\s*grip:\[([^\]]+)\],\s*palmAlong:([\d.]+)\}", t):
        f = lambda g: [float(x) for x in g.split(',')]
        out[m_.group(1)] = dict(axis=f(m_.group(2)), roll=f(m_.group(3)), neutral=f(m_.group(4)), rollAim=f(m_.group(5)),
                                grip=f(m_.group(6)), palmAlong=float(m_.group(7)))
    return out
SPECS = parse_specs()
SPEC_MISMATCH = [(b['kind'], b['spec'], b['grip'], SPECS[b['spec']]['grip']) for b in BUILT
                 if b['spec'] and b['spec'] in SPECS and any(abs(a - c) > 1e-6 for a, c in zip(b['grip'], SPECS[b['spec']]['grip']))]
KIT_STATE = {}
def load_kit():
    if KIT_STATE: return KIT_STATE
    co = new_coll('kit')
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(KIT))
    new = [o for o in bpy.data.objects if o not in before]
    for o in new:
        for c in list(o.users_collection): c.objects.unlink(o)
        co.objects.link(o)
    arm = next(o for o in new if o.type == 'ARMATURE')
    for o in new:
        if o.type == 'MESH':
            o.hide_render = not re.match(r'Kit_A_(Torso|Arms|Hands|Legs|Feet|Hair|Jaw)_01$', o.name)
    act = bpy.data.actions.get('idle')
    ad = arm.animation_data or arm.animation_data_create()
    for t in list(ad.nla_tracks): ad.nla_tracks.remove(t)
    if act:
        ad.action = act
        if hasattr(ad, 'action_slot') and getattr(act, 'slots', None): ad.action_slot = act.slots[0]
    scene.frame_set(1); bpy.context.view_layer.update()
    KIT_STATE.update(coll=co, arm=arm, objs=new); return KIT_STATE
def bone_world(arm, short):
    pb = arm.pose.bones['mixamorig:' + short]; return arm.matrix_world @ pb.matrix, pb
def solve_held(arm, spec_key, grip_override=None):
    sp = SPECS[spec_key]
    yW = Vector(sp['neutral']).normalized(); xa = Vector(sp['rollAim']); xW = (xa - yW * xa.dot(yW)).normalized(); zW = xW.cross(yW)
    yl = Vector(sp['axis']).normalized(); xl0 = Vector(sp['roll']); xl = (xl0 - yl * xl0.dot(yl)).normalized(); zl = xl.cross(yl)
    Rg = Matrix((xW, yW, zW)).transposed() @ Matrix((xl, yl, zl)).transposed().inverted()
    Rb = C_G2B @ Rg @ C_G2B.inverted()
    Mh, _ = bone_world(arm, 'RightHand')
    palm = Mh.translation + Mh.to_3x3().col[1].normalized() * sp['palmAlong']
    grip = C_G2B @ Vector(grip_override or sp['grip'])
    return Matrix.Translation(palm - Rb @ grip) @ Rb.to_4x4(), palm
def solve_shield(arm, kind):
    sq = kind == 'sqshield'
    nW = Vector((-.72, 0, .69) if sq else (-.9, 0, -.45)).normalized()
    upr = Vector((0, .71, .71) if sq else (0, 1, 0)); upW = (upr - nW * upr.dot(nW)).normalized()
    nL, uL = Vector((1, 0, 0)), Vector((0, 1, 0))
    Rg = Matrix((nW, upW, nW.cross(upW))).transposed() @ Matrix((nL, uL, nL.cross(uL))).transposed().inverted()
    Rb = C_G2B @ Rg @ C_G2B.inverted()
    Mh, _ = bone_world(arm, 'LeftHand')
    pos = Mh @ Vector((.12, -.05 if sq else .03, .04))
    return Matrix.Translation(pos) @ Rb.to_4x4()
def wear(kind, coll, arm, metal=None, cloth=None, gem=None, ratio=1.0):
    """Bind-space parts follow their bones: world = pose_bone @ rest_bone^-1 @ S(ratio) (the runtime fit rule)."""
    r, obs = instance(kind, coll, metal=metal, cloth=cloth, gem=gem)
    for o, bone in obs:
        pb = arm.pose.bones['mixamorig:' + bone]
        o.parent = None
        o.matrix_world = arm.matrix_world @ pb.matrix @ pb.bone.matrix_local.inverted() @ Matrix.Scale(ratio, 4)
    return r, obs
def persp_cam(name, target, yaw_deg, elev_deg, dist, lens=50):
    cam = bpy.data.objects.new(name, bpy.data.cameras.new(name)); scene.collection.objects.link(cam)
    cam.data.lens = lens; cam.data.clip_end = 100
    e, yw = math.radians(elev_deg), math.radians(yaw_deg)
    d = Vector((math.sin(yw) * math.cos(e), -math.cos(yw) * math.cos(e), math.sin(e)))
    cam.location = Vector(target) + d * dist; cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler(); return cam
def cam_label(cam, txt, size=.045):
    cu = bpy.data.curves.new('cl', 'FONT'); cu.body = txt; cu.size = size; cu.align_x = 'CENTER'
    o = bpy.data.objects.new('cl_' + txt[:16], cu); o.parent = cam; o.location = (0, -.3, -1.0)
    cu.materials.append(INKM); scene.collection.objects.link(o); return o
def grid(panels, cols, pad=6, bgc=(.24, .26, .3)):
    h, w = panels[0].shape[:2]; rows = (len(panels) + cols - 1) // cols
    out = np.zeros((rows * (h + pad) + pad, cols * (w + pad) + pad, 4)); out[..., :3] = bgc; out[..., 3] = 1
    H = out.shape[0]
    for k, p in enumerate(panels):
        r, c = divmod(k, cols); y0 = H - (r + 1) * (h + pad); x0 = pad + c * (w + pad)
        out[y0:y0 + h, x0:x0 + w] = p
    return out

HELD_SHOW = [('dagger', METALS['bronze']), ('sword', METALS['bronze']), ('longsword', METALS['iron']), ('sabre', METALS['steel']),
             ('greatsword', METALS['iron']), ('mace', METALS['iron']), ('warhammer', METALS['steel']),
             ('battleaxe', METALS['bronze']), ('hatchet', METALS['bronze']), ('pickaxe', METALS['bronze']),
             ('shortbow', None), ('longbow', None), ('staff', None), ('round_shield', METALS['bronze']),
             ('sqshield', METALS['iron']), ('kiteshield', METALS['steel'])]
GRIP_REPORT = []
def sheet_inhand():
    K = load_kit(); arm = K['arm']; light_proof((.58, .66, .74))
    co = new_coll('inhand'); show_only(co, K['coll'])
    full = persp_cam('HandFull', (-.15, -.1, 1.0), -38, 45, 3.3, lens=50)
    panels = []
    for kind, metal in HELD_SHOW:
        if kind not in BYKIND: continue
        b = BYKIND[kind]
        if b['slot'] == 'shield':
            mtx = solve_shield(arm, kind); palm = None
        else:
            mtx, palm = solve_held(arm, b['spec'])
        r, obs = instance(kind, co, metal=metal, mtx=mtx)
        if palm is not None:                                                   # grip audit: palm vs authored grip point
            gw = mtx @ (C_G2B @ Vector(b['grip']))
            GRIP_REPORT.append((kind, b['spec'], round((gw - palm).length, 4)))
        Mh, _ = bone_world(arm, 'LeftHand' if b['slot'] == 'shield' else 'RightHand')
        hp = Mh.translation
        close = persp_cam('HandClose', hp + Vector((0, -.12, -.05)), -38, 45, 1.9, lens=50)
        lb1 = cam_label(full, kind); a = render_to(TMP / ('ih_%s_a.png' % kind), 420, 480, full); lb1.hide_render = True
        lb2 = cam_label(close, 'close-up'); c = render_to(TMP / ('ih_%s_c.png' % kind), 420, 480, close)
        panels.append(np.concatenate([a, c], axis=1))
        for o in (lb1, lb2, close): bpy.data.objects.remove(o)
        for o, _ in obs: bpy.data.objects.remove(o)
        bpy.data.objects.remove(r)
    save_px(grid(panels, 3), PROOF / 'inhand.png')
    print(TAG, 'inhand ->', PROOF / 'inhand.png', 'grip-to-palm', GRIP_REPORT)

OUTFITS = [('bronze warrior', METALS['bronze'], ['fullhelm', 'platebody', 'platelegs'], 'kiteshield', 'sword', None),
           ('iron guard', METALS['iron'], ['medhelm', 'chainbody', 'plateskirt', 'boots'], 'sqshield', 'mace', None),
           ('leather ranger', None, ['leather_body', 'chaps', 'gloves', 'boots', 'cape'], None, 'shortbow', 0x3a8a3a),
           ('steel + wizard hat', METALS['steel'], ['hat', 'platebody', 'platelegs', 'amulet', 'cape'], 'round_shield', 'battleaxe', 0xa83232)]
def sheet_worn():
    K = load_kit(); arm = K['arm']; light_proof((.58, .66, .74))
    panels_f, panels_b = [], []
    heads = [o for o in K['objs'] if re.match(r'Kit_A_(Hair|Jaw)_01$', o.name)]
    for name, metal, worn, shield, weapon, cape in OUTFITS:
        co = new_coll('worn_' + name); show_only(co, K['coll'])
        for kind in worn:
            if kind in BYKIND: wear(kind, co, arm, metal=metal, cloth=(cape if kind == 'cape' else 0x3a5aad), gem=0xc84a4a)
        for o in heads: o.hide_render = 'fullhelm' in worn                 # the full helm replaces the head (fx_humanoid rule)
        if shield and shield in BYKIND: instance(shield, co, metal=metal or METALS['bronze'], mtx=solve_shield(arm, shield))
        if weapon and weapon in BYKIND:
            mtx, _ = solve_held(arm, BYKIND[weapon]['spec']); instance(weapon, co, metal=metal or METALS['bronze'], mtx=mtx)
        fcam = persp_cam('WornF', (0, 0, .98), -30, 20, 4.4); bcam = persp_cam('WornB', (0, 0, .98), 150, 20, 4.4)
        l1 = cam_label(fcam, name, .03); panels_f.append(render_to(TMP / ('w_%s_f.png' % metal), 460, 600, fcam)); l1.hide_render = True
        l2 = cam_label(bcam, name + ' (back)', .03); panels_b.append(render_to(TMP / ('w_%s_b.png' % metal), 460, 600, bcam))
        for o in (l1, l2, fcam, bcam): bpy.data.objects.remove(o)
        co.hide_render = True
    for o in heads: o.hide_render = False
    save_px(grid(panels_f + panels_b, len(OUTFITS)), PROOF / 'worn.png')
    print(TAG, 'worn ->', PROOF / 'worn.png')

# ---------------------------------------------------------------- old vs new: world_gear.js primitives rebuilt from their code
def three_mtx(pos=(0, 0, 0), rot=(0, 0, 0), sc=(1, 1, 1)):
    Rx, Ry, Rz = (Matrix.Rotation(rot[0], 4, 'X'), Matrix.Rotation(rot[1], 4, 'Y'), Matrix.Rotation(rot[2], 4, 'Z'))
    return Matrix.Translation(pos) @ Rx @ Ry @ Rz @ Matrix.Diagonal((*sc, 1))
def t_cyl(m, rt, rb, h, seg, mat, mtx, t0=0.0, tl=tau):
    n = seg; ring = lambda r, y: [Vector((r * math.sin(t0 + tl * i / n), y, r * math.cos(t0 + tl * i / n))) for i in range(n)]
    s0 = len(m.v)
    if rt == 0:
        m.fan(list(reversed(ring(rb, -h / 2))), (0, h / 2, 0), mat)
    else:
        m.loft([ring(rb, -h / 2), ring(rt, h / 2)], mat, cap0=mat, cap1=mat)
    m.transform(mtx, s0)
def t_box(m, w, h, d, mat, mtx):
    s0 = len(m.v); m.hull(cbox((0, 0, 0), (w / 2, h / 2, d / 2)), mat); m.transform(mtx, s0)
def t_sph(m, r, mat, mtx, half=False):
    s0 = len(m.v); pts = ell((0, 0, 0), (r, r, r), nu=8, nv=6)
    if half: pts = [Vector((p.x, max(p.y, 0), p.z)) for p in [Vector((q.x, q.z, q.y)) for q in pts]]
    m.hull(pts, mat); m.transform(mtx, s0)
def t_torus(m, R, tube, arc, mat, mtx, seg=12):
    s0 = len(m.v); pts = [(R * math.cos(arc * i / seg), R * math.sin(arc * i / seg), 0) for i in range(seg + 1)]
    m.ptube(pts, tube, 5, mat, cap0=mat, cap1=mat); m.transform(mtx, s0)
def old_model(kind):
    """Reconstruction of the world_gear.js builder that draws this kind today (three.js Y-up coordinates)."""
    m = M(); I = Matrix.Identity(4)
    if kind in ('sword', 'dagger', 'longsword'):
        t_box(m, .055, .66, .13, MT, three_mtx((0, .45, 0))); t_box(m, .07, .6, .02, MT, three_mtx((0, .43, 0)))
        t_cyl(m, 0, .07, .14, 4, MT, three_mtx((0, .84, 0), (0, math.pi / 4, 0))); t_box(m, .26, .05, .09, BR, three_mtx((0, .1, 0)))
        t_cyl(m, .035, .035, .2, 6, WK, I); t_sph(m, .045, BR, three_mtx((0, -.11, 0)))
    elif kind in ('hatchet',):
        t_cyl(m, .03, .035, .6, 5, WD, I); t_box(m, .2, .16, .045, MT, three_mtx((.1, .24, 0))); t_box(m, .04, .2, .05, MT, three_mtx((.2, .24, 0)))
    elif kind == 'pickaxe':
        t_cyl(m, .03, .035, .6, 5, WD, I); t_box(m, .4, .06, .06, MT, three_mtx((0, .27, 0)))
        for s in (-1, 1): t_cyl(m, 0, .04, .12, 4, MT, three_mtx((s * .23, .27, 0), (0, 0, s * -math.pi / 2)))
    elif kind == 'shortbow':
        t_torus(m, .46, .035, math.pi * 1.15, WD, three_mtx(rot=(0, 0, math.pi * .93))); t_cyl(m, .01, .01, .85, 4, ST, three_mtx((.11, 0, 0)))
    elif kind in ('round_shield', 'kiteshield'):
        t_cyl(m, .3, .3, .06, 10, WD, three_mtx(rot=(0, 0, math.pi / 2)))
        t_torus(m, .29, .025, tau, WK, three_mtx(rot=(0, math.pi / 2, 0))); t_sph(m, .08, ME, three_mtx((.05, 0, 0)))
    elif kind == 'fullhelm':
        t_sph(m, .21, MT, I, half=True); t_cyl(m, .215, .215, .07, 8, MT, three_mtx((0, -.01, 0))); t_box(m, .03, .12, .3, MT, three_mtx((0, .15, 0)))
    elif kind == 'staff':
        t_cyl(m, .028, .035, 1.1, 6, WD, three_mtx((0, .25, 0))); s0 = len(m.v)
        m.hull([Vector(p) for p in [(.09, 0, 0), (-.09, 0, 0), (0, .09, 0), (0, -.09, 0), (0, 0, .09), (0, 0, -.09)]], GM)
        m.transform(three_mtx((0, .86, 0)), s0)
    elif kind == 'platebody':
        t_cyl(m, .3, .2, .54, 4, MT, three_mtx((0, 1.26, 0), sc=(1, 1, .62)), t0=math.pi / 4)
        for s in (-1, 1): t_cyl(m, .11, .15, .15, 4, MT, three_mtx((s * .28, 1.47, 0)), t0=math.pi / 4)
        t_box(m, .42, .06, .3, BR, three_mtx((0, 1.0, 0)))
    elif kind == 'boots':
        for s in (-1, 1):
            t_box(m, .1, .07, .19, LE, three_mtx((s * .13, .035, .04))); t_cyl(m, .055, .06, .14, 7, LE, three_mtx((s * .13, .115, -.02)))
    for i, v in enumerate(m.v): m.v[i] = C_G2B @ v                                   # three Y-up -> Blender Z-up
    return m
LIVE_GLB = {'dagger': ('worn_gear_starter_v1.glb', 'gear_dagger'), 'sword': ('worn_gear_starter_v1.glb', 'gear_sword'),
            'longsword': ('gear_longsword_v1.glb', 'gear_longsword_v1'), 'hatchet': ('worn_gear_starter_v1.glb', 'gear_hatchet'),
            'pickaxe': ('worn_gear_starter_v1.glb', 'gear_pickaxe'), 'shortbow': ('worn_gear_starter_v1.glb', 'gear_shortbow'),
            'round_shield': ('worn_gear_starter_v1.glb', 'gear_shield'), 'kiteshield': ('gear_kiteshield_v1.glb', 'gear_kiteshield_v1'),
            'fullhelm': ('gear_fullhelm_v1.glb', 'gear_fullhelm_v1')}
def live_glb(kind, coll):
    f, node = LIVE_GLB[kind]; before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT / 'assets/models/props' / f))
    new = [o for o in bpy.data.objects if o not in before]
    root = next((o for o in new if o.name.startswith(node)), None)
    keep = set([root] + list(root.children_recursive)) if root else set()
    for o in new:
        for c in list(o.users_collection): c.objects.unlink(o)
        if o in keep: coll.objects.link(o)
        else: bpy.data.objects.remove(o)
    root.parent = None if root.parent not in keep else root.parent
    bc = hex3(METALS['bronze'])
    for o in root.children_recursive:
        if o.type != 'MESH': continue
        for sl in o.material_slots:
            mn = sl.material.name if sl.material else ''
            if mn.startswith('CR_GEAR_METAL'):
                rgb = metal_edge(bc) if 'EDGE' in mn else (metal_dark(bc) if 'DARK' in mn else bc)
                sl.link = 'OBJECT'; sl.material = flat('live_' + mn, rgb)
            elif sl.material:
                bs = next((n for n in sl.material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None) if sl.material.use_nodes else None
                if bs: bs.inputs['Metallic'].default_value = 0; bs.inputs['Roughness'].default_value = 1
    return root
def orient_up(r, kind, shieldlike):
    bpy.context.view_layer.update()
    if shieldlike: r.matrix_world = Matrix.Rotation(-math.pi / 2, 4, 'Z') @ r.matrix_world
    lo, hi = inst_bounds(r)
    if not shieldlike and abs(lo.z) > abs(hi.z) + .02: r.matrix_world = Matrix.Rotation(math.pi, 4, 'X') @ r.matrix_world
def sheet_compare():
    co = new_coll('compare'); show_only(co); light_proof()
    kinds = ['dagger', 'sword', 'longsword', 'hatchet', 'pickaxe', 'shortbow', 'round_shield', 'kiteshield', 'fullhelm', 'staff',
             'platebody', 'boots']
    x = 0.0; ROWZ = [2.9, 1.45, 0.0]
    for kind in kinds:
        if kind not in BYKIND: continue
        shieldlike = BYKIND[kind]['slot'] == 'shield'
        # row 0: code primitive
        om = old_model(kind); me = make_mesh('old_' + kind, om)
        o = bpy.data.objects.new('old_' + kind, me); co.objects.link(o)
        for i, sl in enumerate(o.material_slots): sl.link = 'OBJECT'; sl.material = tinted(me.materials[i].name, METALS['bronze'], None, 0x9ad0ff)
        r0 = bpy.data.objects.new('old_root_' + kind, None); co.objects.link(r0); o.parent = r0
        orient_up(r0, kind, shieldlike)
        w0 = place(r0, x, ROWZ[0])
        # row 1: live GLB today
        if kind in LIVE_GLB:
            r1 = live_glb(kind, co)
            if kind == 'fullhelm': r1.matrix_world = Matrix.Scale(.63, 4) @ r1.matrix_world
            orient_up(r1, kind, shieldlike); w1 = place(r1, x, ROWZ[1])
        else:
            label(co, '(no GLB: the code', (x, 0, ROWZ[1] + .5), size=.06); label(co, 'primitive is live)', (x, 0, ROWZ[1] + .42), size=.06); w1 = 0
        # row 2: new
        r2, _ = instance(kind, co, metal=METALS['bronze'], mtx=upright(kind)); w2 = place(r2, x, ROWZ[2])
        label(co, kind, (x, 0, -.14), size=.07)
        x += max(w0, w1, w2, .5) + .18
    for txt, z in (('code primitive (world_gear.js)', ROWZ[0] + 1.25), ('live GLB today (gear_models_v1)', ROWZ[1] + 1.25),
                   ('new: holm_equipment_v1', ROWZ[2] + 1.25)):
        label(co, txt, (-.3, 0, z), size=.1).data.align_x = 'LEFT'
    cam = ortho_cam('CmpCam', (x / 2 - .3, 0, 2.0), 5, max(x + .4, 4.4 * 2400 / 1400) * 1.02)
    img = render_to(PROOF / 'compare.png', 2400, 1400, cam); save_px(img, PROOF / 'compare.png')
    print(TAG, 'compare ->', PROOF / 'compare.png')

if not NO_PROOF:
    sheet_inhand(); sheet_worn(); sheet_compare()

# ================================================================ manifest.json
SERVES = {}
for r in EQUIP_TABLE:
    if r['kind']: SERVES.setdefault(r['kind'], []).append(r['id'])
manifest = {'schema': 1, 'status': 'candidate-not-runtime-wired', 'file': 'equipment.glb', 'blend': 'equipment.blend', 'sha256': sha,
            'axes': 'glTF Y-up, 1 unit = 1 tile (= 1 m, player 1.85 tall)',
            'colour': 'authored sRGB used as-is, roughness 1, metallic 0, no textures; smooth with sharp edges > 30 deg',
            'recolour': {'M_METAL': 'tier hex (METALS in src/world_gear.js)', 'M_METAL_DARK': 'tier x0.72', 'M_METAL_MID': 'tier x0.86',
                         'M_METAL_EDGE': 'tier lerp white 0.3', 'M_CLOTH': 'cloth hex', 'M_CLOTH_DARK': 'cloth x0.72', 'M_GEM': 'gem hex'},
            'frames': {'grip': 'origin = hand grip; same frame as gear_models_v1 templates + EquipBuilder specs; `grip` = the spec palm '
                               'point (mesh-local glTF); `legacy` = quaternion into the old world_gear.js builder frame; `lay` = quaternion '
                               'that lays it flat for drops / icons',
                       'bind': 'authored in the bind pose of assets/models/holm_kit_v2.glb (same skeleton as holm_player_v1.glb); every '
                               'child mesh has extras.bone; fit through the skin inverse bind matrix'},
            'runtime': 'src/holm_equipment.js', 'models': []}
for b in BUILT:
    ent = {'id': 'eq_' + b['kind'], 'kind': b['kind'], 'slot': b['slot'], 'frame': b['frame'], 'description': b['desc'],
           'triangles': b['tris'], 'budget': LIMIT[b['frame']], 'bounds': gl_bounds(b['lo'], b['hi']),
           'size': [round(v, 3) for v in (b['hi'][0] - b['lo'][0], b['hi'][2] - b['lo'][2], b['hi'][1] - b['lo'][1])],
           'materials': sorted({ob.data.materials[p.material_index].name for ob, _ in b['obs'] for p in ob.data.polygons}),
           'serves': SERVES.get(b['kind'], []), 'lay': b['lay']}
    if b['frame'] == 'grip':
        ent.update({'attach': 'RightHand' if b['slot'] in ('weapon',) else ('LeftHand' if b['slot'] == 'shield' else None),
                    'origin': 'hand grip', 'grip': b['grip'], 'axis': b['axis'], 'roll': b['roll'], 'legacy': b['legacy'],
                    'equipSpec': b['spec']})
    else:
        ent['parts'] = [{'node': ob.name, 'bone': bone, 'triangles': sum(len(p.vertices) - 2 for p in ob.data.polygons)} for ob, bone in b['obs']]
    manifest['models'].append(ent)
manifest['items'] = EQUIP_TABLE
manifest['icons'] = [{'id': n, 'file': 'assets/icons/items/%s.png' % n} for n, _ in ICON_ROWS]
manifest['totals'] = {'models': len(BUILT), 'triangles': sum(b['tris'] for b in BUILT), 'materials': len(doc['materials']),
                      'equipableItems': len(EQUIP_TABLE), 'itemsCovered': sum(1 for r in EQUIP_TABLE if r['kind'])}
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1) + '\n', encoding='utf8')

# ================================================================ REPORT.md
WIRING = r'''
## Wiring edits (not applied: the live tree is running a playthrough batch)

Apply in this order. Every step fails soft: until equipment.glb loads, or for a kind it does not have, the old path runs.

### 1. index.html: load the module after the gear router (line ~834)

```html
<script src="src/holm_items_v1.js?v=2"></script>
<script src="src/holm_equipment.js?v=1"></script>          <!-- NEW -->
<script>HolmEquipment.install();</script>                  <!-- NEW: new held models win over gear_models_v1 -->
```

`install()` wraps the global `gearMesh()` exactly like gear_models_v1 does, so every caller (player, GLB avatar GearFit,
NPCs, ground drops, crafting tool visuals, anim showcase) gets the new grip-frame models. Order of precedence becomes
HolmEquipment > gear_models_v1 GLB > world_gear.js primitive. The models are authored in the same frame as the
gear_models_v1 templates and carry the same EquipBuilder grip points, so `EquipBuilder.solveHeld` needs no change
(verified: 0 mm grip-to-palm for every spec, see inhand.png and scratchpad/holm_equipment_v1/runtime_test.html).

### 2. src/world_gear.js: direct builder callers (NPC holds, anim showcase, projectiles, shield fallbacks)

Add one line at the top of each builder:

```js
function swordMesh(metal){
  const he=window.HolmEquipment&&HolmEquipment.mesh('sword',metal,{frame:'legacy'}); if(he) return he;
  ...
function bowMesh(){
  const he=window.HolmEquipment&&HolmEquipment.mesh('shortbow',null,{frame:'legacy'}); if(he) return he;
function arrowMesh(){
  const he=window.HolmEquipment&&HolmEquipment.mesh('arrow',0x9aa0a8,{frame:'legacy'}); if(he) return he;
function axeMesh(metal){
  const he=window.HolmEquipment&&HolmEquipment.mesh('hatchet',metal,{frame:'legacy'}); if(he) return he;
function pickMesh(metal){
  const he=window.HolmEquipment&&HolmEquipment.mesh('pickaxe',metal,{frame:'legacy'}); if(he) return he;
function shieldMesh(){
  const he=window.HolmEquipment&&HolmEquipment.mesh('round_shield',0x8a6437,{frame:'legacy'}); if(he) return he;
function staffMesh(orb){
  const he=window.HolmEquipment&&HolmEquipment.mesh('staff',null,{frame:'legacy',gem:orb}); if(he) return he;
```

`{frame:'legacy'}` rotates the blade family into the old +Y-blade builder frame, which `holdWeapon()` (game2_world.js)
assumes. helmMesh / bodyArmorMesh / legArmorMesh / chainBodyMesh / plateSkirtMesh / chapsCover / gloveMesh / bootMesh
stay as they are: they only serve the legacy angular humanoid, and the GLB avatar gets the new armour through step 3.
In itemGroundMesh(), put this first so drops lie flat with their base on the ground (holm_items_v1 still overrides
wood_shield / leather_body drops with its own item-pack models, since it wraps outermost):

```js
  const heg=window.HolmEquipment&&HolmEquipment.groundMesh(id); if(heg) return heg;
```

### 3. src/fx_humanoid.js (refreshGLBGear): worn armour follows the bones

Just before `// 4) full armour READS as armour` add:

```js
  const HE=(window.HolmEquipment&&HolmEquipment.status().ready)?HolmEquipment:null;
  const fitWorn=(key,id)=>{ const r=HE&&id?HE.forItem(id):null; if(!r||r.frame!=='bind') return false;
    const h=HE.fit(rig,r.kind,r.metal,Object.assign({compensateBoneScale:true},r.opts)); if(!h) return false;
    h.parts.forEach((p,i)=>{ p.traverse(o=>{ if(o.isMesh) o.castShadow=true; }); gear[key+'_he'+i]=p; }); return true; };
```

then guard the existing blocks (the removal loop at the top of refreshGLBGear already detaches anything in `gear`):

```js
  if(e.body && ITEMS[e.body].model!=='robe' && !fitWorn('body',e.body)){ ...existing bodyArmorMesh / chainBodyMesh... }
  if(e.legs && !fitWorn('legs',e.legs)){ ...existing plateskirt / thigh cylinders... }
  if(e.hands && ITEMS[e.hands].model==='gloves' && !fitWorn('hands',e.hands)){ ...existing... }
  if(e.feet && ITEMS[e.feet].model==='boots' && !fitWorn('feet',e.feet)){ ...existing... }
```

Move the helm / amulet / cape blocks below the fitWorn definition and guard them the same way:
`if(e.head && !fitWorn('head',e.head)){ ...existing head attach... }`, `if(e.amulet && !fitWorn('amulet',e.amulet)){...}`,
`if(e.cape && !fitWorn('cape',e.cape)){...}`. Keep the head-bone collapse for full helms: `compensateBoneScale` undoes it
for the helm itself. Robes stay a recolour (no model). The leg-region recolour can stay (the plates cover it).
Optional, closer to 2004: hide the kit's Torso/Arms parts under a platebody and the Legs part under platelegs.

### 4. src/game0_icons.js: use the new icons

Add the remodelled ids to `HOLM_ITEM_ICONS`:
`'bronze_dagger','bronze_sword','iron_sword','iron_hatchet','pickaxe','iron_pickaxe','hatchet','worn_bow','apprentice_staff','bronze_plate','bronze_legs'`
(`wood_shield` and `leather_body` are already in the set and were re-rendered in place). src/smith_bronze_dagger.js
paints `ICONS['bronze_dagger']` from a canvas first; drop its `makeIcon()` call (or skip it when
`HOLM_ITEM_ICONS.has('bronze_dagger')`) so the rendered icon wins.

### 5. Publishing

Like the other island candidates, the GLB loads from the gitignored `/.studio-workspaces/`; publish it into `assets/`
with the Studio Safe Publish CLI (M7.1) and update `PATH` in src/holm_equipment.js.
'''

REVIEW = r'''
## Self-review (renders checked by eye: lineup, tiers_weapons, tiers_armour, inhand, worn, compare, icons_sheet)

Fixed during review (second render pass):
- Wood and bronze were almost the same colour (hafts vanished into heads): wood is now redder and darker.
- The platebody's centre-ridge highlight read as a pasted-on panel and sat off-centre (14-sided rings have no front
  vertex): rings are now 12-sided with the ridge as geometry only.
- The chainbody's light/dark checker read as a harlequin pattern: it is now a subtle two-tone (M_METAL_MID).
- The kit's puffed green sleeves poked through the plate rerebraces and pauldrons: the arm plates and pauldrons are bigger.
- The platebody poked through the cape at the collar: the cape now hangs clear of the back plate.
- The hat cone had inward normals (the only real flip found by a per-piece normals check): it is capped and now faces out.
- The kite shield was plainer than the live one: it now has a field boss and a raised cross-band.
- Five models were over budget: they have been trimmed, and all budgets are asserted (held <= 400, worn <= 820).

Still weak / open:
- Bronze (METALS.bronze 0x8a6437, what tierMetal() returns at runtime) is a dull dark brown and reads close to leather.
  The inventory CSS / TIERS table uses a brighter 0xb08d57. Recommend aligning METALS.bronze to 0xb08d57 (a one-line
  data change, not done here).
- The existing hold doctrine (EquipBuilder specs) carries the hatchet/pickaxe heads down near the feet, and the
  battleaxe head sits at hand height beside the legs. That is the spec, reproduced faithfully, but at the 45-degree camera
  the tools read low. Worth an owner look.
- The live bronze sword/dagger (gear_sword/gear_dagger) are authored blade +Y while the EquipBuilder `sword` spec expects
  blade -Y, so today they are probably held blade-backwards. The new models follow the spec. `iron_dagger` has no
  `model` field, so EquipBuilder skips it (fx_humanoid falls back to the bbox path) and gearMesh only reaches it via
  gear_models' ID_MAP; forItem() handles it by id.
- crag_maul is `model:'sword'` with tier 'crag' (not in METALS), so it gets a bronze-coloured sword. A maul/warhammer
  mapping needs a data change.
- The armour is fitted to the kit's body A. Body B and the live holm_player_v1 share the identical skeleton (checked:
  every bone head matches), so the bone parenting is exact, but their meshes were not clip-tested. Rigid parts do not
  deform: deep bends (climb, death) may show gaps at the elbow and knee, and the plateskirt is rigid on the hips, as in 2004.
- Gloves are small at the game camera. Chainbody sleeves are short, so the shirt sleeves show below them (intended).
- At icon size the dagger and sword look alike (the icons are auto-framed to fill the slot).
- Robes are still a recolour (no model); tinderbox, net, hammer and runes are not equipable (no equip slot) and are
  already modelled in the holm-items-v1 pack.
- The hands on the kit are open, so held items pass through a flat palm (no fist pose clip exists yet).
'''

def fmt_items_table():
    lines = ['| id | name | slot | model | tier | drawn today by | new kind |', '|---|---|---|---|---|---|---|']
    for r in EQUIP_TABLE:
        if r['generated']: continue
        lines.append('| %s | %s | %s | %s | %s | %s | %s |' % (r['id'], r['name'], r['slot'], r['model'] or '-', r['tier'] or '-',
                                                             r['today'], r['kind'] or '**none (recolour)**'))
    gen = {}
    for r in EQUIP_TABLE:
        if r['generated']: gen.setdefault(r['model'], []).append(r)
    lines += ['', 'Tier-generated gear (buildTieredGear: %d tiers x templates, minus legacy aliases %s):' %
              (len(GAME_TIERS), ', '.join(sorted(GEAR_ALIASES))), '',
              '| template model | slot | ids | drawn today by | new kind |', '|---|---|---|---|---|']
    for mo, rs in sorted(gen.items()):
        lines.append('| %s | %s | %d: %s | %s | %s |' % (mo, rs[0]['slot'], len(rs), ', '.join(r['id'] for r in rs),
                                                         rs[0]['today'], rs[0]['kind']))
    return lines

rep = ['# Holm equipment v1 -- report', '',
       'Built by `tools/blender/build_holm_equipment_v1.py` (Blender 4.5 headless, deterministic). Candidate only: nothing',
       'is wired into the runtime yet (see Wiring edits). Style: 2004 old-school RuneScape; original designs.', '',
       '## Outputs', '',
       '- `.studio-workspaces/holm-equipment-v1/candidates/equipment.glb` (one root `eq_<kind>` per model), `equipment.blend`, `manifest.json`, this file',
       '- `src/holm_equipment.js`: runtime (`mesh`, `itemMesh`, `groundMesh`, `forItem`, `fit`, `install`, `status`)',
       '- icons (96x96, same camera/light/outline as the item pack): ' + ', '.join('`assets/icons/items/%s.png`' % n for n, _ in ICON_ROWS),
       '  (`wood_shield` and `leather_body` overwrite the item-pack icons; originals backed up in `scratchpad/holm_equipment_v1/_icon_backup/`.',
       '  Re-running build_holm_items_v1.py would put its own versions back.)',
       '- proofs in `scratchpad/holm_equipment_v1/`: `lineup.png`, `tiers_weapons.png`, `tiers_armour.png`, `inhand.png`, `worn.png`,',
       '  `compare.png`, `icons_sheet.png`, `runtime_test.html` (three r128 page: loads the GLB + kit, fits armour, real EquipBuilder solve)', '',
       '## Models', '',
       '| kind | slot | frame | tris | serves (ids) | design |', '|---|---|---|---|---|---|']
for b in BUILT:
    sv = SERVES.get(b['kind'], [])
    rep.append('| %s | %s | %s | %d | %d%s | %s |' % (b['kind'], b['slot'], b['frame'], b['tris'], len(sv),
                                                   (': ' + ', '.join(sv[:6]) + (' ...' if len(sv) > 6 else '')) if sv else ' (projectile)', b['desc']))
rep += ['', '**Totals:** %d models, %d triangles, %d materials, no textures. %d equipable items in game data, %d covered by a new model.' %
        (len(BUILT), sum(b['tris'] for b in BUILT), len(doc['materials']), len(EQUIP_TABLE), sum(1 for r in EQUIP_TABLE if r['kind'])), '',
        '## Attach points', '',
        '| kind | attach | EquipBuilder spec | grip (glTF, mesh-local) | axis | legacy |', '|---|---|---|---|---|---|']
for b in BUILT:
    if b['frame'] == 'grip':
        rep.append('| %s | %s | %s | %s | %s | %s |' % (b['kind'], 'LeftHand (fx_humanoid shield fit)' if b['slot'] == 'shield' else
                   ('projectile' if b['slot'] == 'ammo' else 'RightHand'), b['spec'] or '-', b['grip'], b['axis'],
                   'flip X 180' if b['legacy'] == Q_FLIPX else 'identity'))
    else:
        rep.append('| %s | bones: %s | - | bind space | - | - |' % (b['kind'], ', '.join(sorted({bn for _, bn in b['obs']}))))
rep += ['', 'Grip audit (in-hand proof, palm = hand bone + palmAlong along the bone, exactly as EquipBuilder): ' +
        ', '.join('%s %.1f mm' % (k, d * 1000) for k, _, d in GRIP_REPORT) if GRIP_REPORT else '',
        'Spec grip mismatches: ' + (', '.join('%s (%s): %s vs %s' % m_ for m_ in SPEC_MISMATCH) if SPEC_MISMATCH else 'none'), '',
        '## Every equipable item', ''] + fmt_items_table() + ['', WIRING, REVIEW]
(OUT / 'REPORT.md').write_text('\n'.join(rep) + '\n', encoding='utf8')
shutil.rmtree(TMP, ignore_errors=True)
print(TAG, 'DONE', OUT / 'REPORT.md')
