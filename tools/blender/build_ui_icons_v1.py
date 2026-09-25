"""UI icon pack v1 (holm UI round 3): every interface icon modelled as a small, chunky low-poly Blender prop.

Owner 2026-09-25: "the icons look basic, like shapes -- use images or Blender models; more old-school RuneScape,
more medieval, cozy". So each interface icon is an original little 3D prop (crossed swords, leather pack, helm,
harp, fist, boot, anvil, ...) rendered here to a large RGBA frame; tools/process_ui_icons_v3.py then gives it the
2004 pixel finish (box downsample to the display size, limited palette, hard alpha, 1 px dark outline, small hard
drop shadow) and writes assets/icons/ui/v3/**.png.

Usage:  blender -b --python tools/blender/build_ui_icons_v1.py [-- --only name1,name2 | --group tabs]
Output: .studio-workspaces/ui-icons-v3/raw/<name>.png  (large, transparent, straight from EEVEE)
        .studio-workspaces/ui-icons-v3/raw/manifest.json (what to make of each render: outputs, sizes, finish)
All geometry is authored here (our own designs; nothing traced or ripped from any game). Deterministic: seeded RNG.
"""
import bpy, bmesh, math, random, json, sys
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / '.studio-workspaces/ui-icons-v3/raw'
RAW.mkdir(parents=True, exist_ok=True)
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ONLY = set(argv[argv.index('--only') + 1].split(',')) if '--only' in argv else None
GROUP = argv[argv.index('--group') + 1] if '--group' in argv else None
TAG = '[UI_ICONS_V1]'
bpy.ops.wm.read_factory_settings(use_empty=True)
TAU = math.tau

# ------------------------------------------------------------------ palette (authored sRGB; 'e_' = emissive)
PAL = {
    'steel': (.74, .76, .80), 'steel_dk': (.46, .48, .53), 'iron': (.36, .37, .40), 'iron_dk': (.22, .22, .24),
    'bronze': (.80, .52, .24), 'gold': (.97, .78, .24), 'gold_dk': (.72, .50, .12), 'brass': (.86, .66, .30),
    'wood': (.58, .38, .19), 'wood_dk': (.34, .21, .10), 'wood_lt': (.76, .56, .31), 'oak': (.47, .30, .15),
    'leather': (.55, .33, .15), 'leather_dk': (.36, .21, .09), 'leather_lt': (.70, .47, .24),
    'skin': (.94, .73, .55), 'skin_dk': (.80, .56, .40), 'hair': (.38, .22, .10),
    'bone': (.93, .90, .80), 'bone_dk': (.72, .67, .55), 'horn': (.62, .55, .44),
    'parch': (.92, .85, .64), 'parch_dk': (.74, .63, .42), 'ink': (.30, .20, .10),
    'stone': (.58, .56, .52), 'stone_lt': (.70, .68, .63), 'stone_dk': (.40, .38, .35), 'slate': (.30, .29, .27),
    'black': (.09, .08, .07), 'white': (.96, .96, .93), 'cream': (.97, .93, .80),
    'red': (.80, .13, .09), 'red_dk': (.52, .07, .05), 'blue': (.22, .40, .82), 'blue_dk': (.12, .20, .50),
    'green': (.30, .62, .22), 'green_dk': (.17, .38, .13), 'yellow': (.99, .85, .18), 'orange': (.95, .52, .12),
    'purple': (.55, .26, .78), 'purple_dk': (.32, .13, .48), 'teal': (.22, .62, .72),
    'water': (.28, .56, .90), 'water_lt': (.62, .82, .98), 'ice': (.80, .92, .99), 'sand': (.90, .76, .46),
    'grass': (.36, .62, .22), 'cloth_red': (.72, .14, .10), 'cloth_blue': (.20, .32, .70), 'cloth_green': (.27, .50, .21),
    'tunic': (.29, .50, .22), 'trousers': (.42, .28, .15), 'swoosh': (.98, .95, .85), 'wax': (.72, .10, .08),
    'orb_red': (.84, .14, .09), 'orb_blue': (.33, .66, .90), 'orb_yellow': (.93, .74, .14), 'orb_grey': (.56, .54, .50),
    'orb_teal': (.24, .70, .80), 'orb_green': (.30, .72, .24), 'stew': (.62, .34, .12),
    'e_fire': (1.0, .56, .10), 'e_fire_core': (1.0, .90, .42), 'e_fire_dk': (.86, .24, .04),
    'e_blue': (.45, .72, 1.0), 'e_white': (1.0, 1.0, .92), 'e_purple': (.78, .48, 1.0), 'e_green': (.45, .95, .35),
    'e_yellow': (1.0, .92, .30), 'e_portal': (.42, .55, 1.0), 'e_gold': (1.0, .82, .30),
}
def lin(c): return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4
MATS = {}
def mat(name):
    if name in MATS: return MATS[name]
    rgb = PAL[name]; m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    if name.startswith('e_'):
        sh = nt.nodes.new('ShaderNodeEmission'); sh.inputs['Color'].default_value = (*[lin(c) for c in rgb], 1); sh.inputs['Strength'].default_value = 1.0
    else:
        sh = nt.nodes.new('ShaderNodeBsdfDiffuse'); sh.inputs['Color'].default_value = (*[lin(c) for c in rgb], 1); sh.inputs['Roughness'].default_value = 1.0
    nt.links.new(sh.outputs[0], out.inputs['Surface'])
    MATS[name] = m; return m

# ------------------------------------------------------------------ mesh builder
class M:
    def __init__(s): s.v = []; s.f = []; s.mi = []
    def add(s, vs, fs, mats):
        k = len(s.v); s.v += [Vector(v) for v in vs]
        for n, f in enumerate(fs):
            s.f.append(tuple(k + i for i in f)); s.mi.append(mats[n] if isinstance(mats, (list, tuple)) else mats)
    def mark(s): return len(s.v)
    def tf(s, k, mx):
        for i in range(k, len(s.v)): s.v[i] = mx @ s.v[i]
        return s
    def loft(s, rings, side, cap0=None, cap1=None, closed=False):
        n = len(rings[0]); k = len(s.v); vs = [p for r in rings for p in r]; fs = []; ms = []
        R = len(rings)
        for j in range(R if closed else R - 1):
            j1 = (j + 1) % R
            for i in range(n):
                fs.append((j*n+i, j*n+(i+1) % n, j1*n+(i+1) % n, j1*n+i)); ms.append(side(j, i) if callable(side) else side)
        s.add(vs, fs, ms)
        if cap1: s.f.append(tuple(k + (R-1)*n + i for i in range(n))); s.mi.append(cap1)
        if cap0: s.f.append(tuple(k + i for i in reversed(range(n)))); s.mi.append(cap0)
        return k
    def ptube(s, pts, r, n, side, up=None, closed=False, cap0=None, cap1=None, flat=1.0, phase=0.0):
        Pp = [Vector(p) for p in pts]; L = len(Pp); rr = r if isinstance(r, (list, tuple)) else [r] * L; rings = []
        for j, p in enumerate(Pp):
            t = (Pp[(j+1) % L] - Pp[(j-1) % L]) if closed else (Pp[min(j+1, L-1)] - Pp[max(j-1, 0)])
            t.normalize()
            u = Vector(up) if up is not None else (Vector((0, 0, 1)) if abs(t.z) < .9 else Vector((1, 0, 0)))
            a = t.cross(u).normalized(); b = t.cross(a).normalized()
            rings.append([p + (a * math.cos(TAU*i/n + phase) + b * math.sin(TAU*i/n + phase) * flat) * rr[j] for i in range(n)])
        return s.loft(rings, side, None if closed else cap0, None if closed else cap1, closed=closed)
    def hull(s, pts, matfn):
        bm = bmesh.new()
        for p in pts: bm.verts.new(p)
        r = bmesh.ops.convex_hull(bm, input=list(bm.verts), use_existing_faces=False)
        junk = list(dict.fromkeys(g for g in r['geom_interior'] + r['geom_unused'] if isinstance(g, bmesh.types.BMVert)))
        if junk: bmesh.ops.delete(bm, geom=junk, context='VERTS')
        bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(1.5), verts=bm.verts[:], edges=bm.edges[:])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.verts.index_update()
        vs = [v.co.copy() for v in bm.verts]; fs = [tuple(v.index for v in f.verts) for f in bm.faces]
        ms = [(matfn(f.normal.copy(), f.calc_center_median()) if callable(matfn) else matfn) for f in bm.faces]
        bm.free(); s.add(vs, fs, ms)
    # ---- flat front-facing shapes (outline in the XZ plane, camera looks along +Y) ----
    def ext(s, pts, d, front, side=None, bev=0.0, y=0.0, back=None):
        P = [Vector((p[0], p[1])) for p in pts]
        if area2(P) < 0: P = P[::-1]
        side = side or front; back = back or side; n = len(P)
        def ring(Q, yy): return [(q.x, yy, q.y) for q in Q]
        yb, yf = y + d / 2, y - d / 2
        if bev > 0:
            Q = offset(P, -bev)
            rings = [ring(P, yb), ring(P, yf), ring(Q, yf - bev * .7)]
            s.loft(rings, lambda j, i: side if j == 0 else front, cap0=back, cap1=front)
        else:
            s.loft([ring(P, yb), ring(P, yf)], side, cap0=back, cap1=front)
    def box(s, c, h, m, ch=0.0): s.hull(cbox(c, h, ch), m)
    def cyl(s, p0, p1, r, m, n=8, caps=None):
        s.ptube([p0, p1], r, n, m, cap0=caps or m, cap1=caps or m)
    def sph(s, c, r, m, nu=10, nv=6):
        rr = r if isinstance(r, (list, tuple)) else (r, r, r); s.hull(ell(c, rr, nu, nv), m)
    def lathe(s, prof, n, side, cap0=None, cap1=None, c=(0, 0, 0), phase=0.0):
        rings = [[(c[0] + r * math.cos(TAU*i/n + phase), c[1] + r * math.sin(TAU*i/n + phase), c[2] + z) for i in range(n)] for r, z in prof]
        return s.loft(rings, side, cap0, cap1)
    def ring2(s, c, ro, ri, d, m, n=16, side=None, a0=0.0, a1=TAU):
        """A flat washer (front-facing) or an arc band when a0..a1 is not a full turn."""
        full = abs(a1 - a0 - TAU) < 1e-6; seg = n if full else n + 1
        def pts(r, yy): return [(c[0] + r[0] * math.cos(a0 + (a1 - a0) * i / n), c[1] + yy, c[2] + r[1] * math.sin(a0 + (a1 - a0) * i / n)) for i in range(seg)]
        rx = ro if isinstance(ro, (tuple, list)) else (ro, ro); ix = ri if isinstance(ri, (tuple, list)) else (ri, ri)
        if full:
            s.loft([pts(rx, d/2), pts(rx, -d/2), pts(ix, -d/2), pts(ix, d/2)], lambda j, i: m if j == 1 else (side or m), closed=True)
        else:
            outer = [(p[0], p[2]) for p in pts(rx, 0)]; inner = [(p[0], p[2]) for p in pts(ix, 0)][::-1]
            s.ext(outer + inner, d, m, side, y=c[1])

def area2(P): return sum(P[i].x * P[(i+1) % len(P)].y - P[(i+1) % len(P)].x * P[i].y for i in range(len(P))) / 2
def offset(P, dist):
    out = []; n = len(P)
    for i in range(n):
        a, b, c = P[i-1], P[i], P[(i+1) % n]
        e1 = (b - a).normalized(); e2 = (c - b).normalized()
        n1 = Vector((e1.y, -e1.x)); n2 = Vector((e2.y, -e2.x)); m = (n1 + n2)
        m = m.normalized() if m.length > 1e-6 else n1
        out.append(b + m * (dist / max(.35, m.dot(n1))))
    return out
def ell(c, r, nu=10, nv=6, floor=None):
    pts = []
    for j in range(1, nv):
        th = math.pi * j / nv
        for i in range(nu):
            ph = TAU * i / nu + (j % 2) * math.pi / nu
            pts.append(Vector((c[0] + r[0]*math.sin(th)*math.cos(ph), c[1] + r[1]*math.sin(th)*math.sin(ph), c[2] + r[2]*math.cos(th))))
    pts += [Vector((c[0], c[1], c[2] + r[2])), Vector((c[0], c[1], c[2] - r[2]))]
    if floor is not None:
        for p in pts: p.z = max(p.z, floor)
    return pts
def cbox(c, h, ch):
    pts = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            for sz in (-1, 1):
                x, y, z = c[0] + sx*h[0], c[1] + sy*h[1], c[2] + sz*h[2]
                if ch: pts += [Vector((x - sx*ch, y, z)), Vector((x, y - sy*ch, z)), Vector((x, y, z - sz*ch))]
                else: pts.append(Vector((x, y, z)))
    return pts
def blob(c, s, seed, n=14, cuts=2, jit=(.84, 1.06)):
    rng = random.Random(seed); pts = []
    for i in range(n):
        z = 1 - 2 * (i + .5) / n; r = math.sqrt(max(0, 1 - z*z)); a = i * 2.39996 + rng.uniform(-.35, .35)
        pts.append(Vector((r*math.cos(a), r*math.sin(a), z)) * rng.uniform(*jit))
    for _ in range(cuts):
        u = rng.uniform(-.25, .9); th = rng.uniform(0, TAU); rr = math.sqrt(1 - u*u)
        nrm = Vector((rr*math.cos(th), rr*math.sin(th), u)); off = rng.uniform(.58, .8)
        for p in pts:
            dd = p.dot(nrm)
            if dd > off: p -= nrm * (dd - off)
    return [Vector((c[0] + p.x*s[0], c[1] + p.y*s[1], c[2] + p.z*s[2])) for p in pts]
def circ(n, r, c=(0, 0), a0=0.0, rz=None):
    rz = r if rz is None else rz
    return [(c[0] + r*math.cos(a0 + TAU*i/n), c[1] + rz*math.sin(a0 + TAU*i/n)) for i in range(n)]
def star2(n, R, r, c=(0, 0), a0=math.pi/2):
    return [(c[0] + (R if i % 2 == 0 else r)*math.cos(a0 + math.pi*i/n), c[1] + (R if i % 2 == 0 else r)*math.sin(a0 + math.pi*i/n)) for i in range(2*n)]
def heart2(sc=1.0, n=28, c=(0, 0)):
    out = []
    for i in range(n):
        t = TAU * i / n
        x = 16 * math.sin(t)**3; z = 13*math.cos(t) - 5*math.cos(2*t) - 2*math.cos(3*t) - math.cos(4*t)
        out.append((c[0] + x/17*sc, c[1] + (z+2)/17*sc))
    return out
def rrect(x0, z0, x1, z1, r, seg=3):
    pts = []
    for cx, cz, a in ((x1 - r, z0 + r, -math.pi/2), (x1 - r, z1 - r, 0), (x0 + r, z1 - r, math.pi/2), (x0 + r, z0 + r, math.pi)):
        for k in range(seg + 1): pts.append((cx + r*math.cos(a + math.pi/2*k/seg), cz + r*math.sin(a + math.pi/2*k/seg)))
    return pts
def rotY(deg):  # counter-clockwise on screen (camera looks along +Y, x right, z up)
    return Matrix.Rotation(-math.radians(deg), 4, 'Y')
def rotZ(deg): return Matrix.Rotation(math.radians(deg), 4, 'Z')
def rotX(deg): return Matrix.Rotation(math.radians(deg), 4, 'X')
def T(x, y, z): return Matrix.Translation((x, y, z))
def S(k): return Matrix.Scale(k, 4)
def place(m, fn, mx, *a, **kw):
    k = m.mark(); fn(m, *a, **kw); m.tf(k, mx); return m

# ------------------------------------------------------------------ prop library (each draws into M at the origin)
def p_sword(m, blade='steel', guard='gold', grip='leather', pommel='gold', L=1.0, w=.075, gw=.2):
    t = .028; z0 = .25
    m.hull([(w, 0, z0), (-w, 0, z0), (0, t, z0), (0, -t, z0), (w*.9, 0, L - .16), (-w*.9, 0, L - .16), (0, t, L - .16), (0, -t, L - .16), (0, 0, L)],
           lambda n, c: blade if n.y < 0 else 'steel_dk' if blade == 'steel' else blade)
    m.box((0, 0, z0 - .02), (gw, .045, .035), guard, .012)
    m.cyl((0, 0, .06), (0, 0, z0 - .05), .036, grip, n=6)
    m.sph((0, 0, .05), .055, pommel, 8, 4)
def p_dagger(m): p_sword(m, L=.7, w=.07, gw=.14)
def p_axe(m, head='steel', handle='wood', L=1.0, big=False):
    m.ptube([(0, 0, 0), (.02, 0, L*.5), (0, 0, L)], [.04, .038, .036], 6, handle, cap0='wood_dk', cap1='wood_dk')
    hz = L - .15; bw = .38 if big else .32
    blade = [(-.03, hz + .08), (-.03, hz - .08), (-bw*.55, hz - .11), (-bw, hz - .24), (-bw - .04, hz), (-bw, hz + .24), (-bw*.55, hz + .11)]
    m.ext(blade, .06, head, 'steel_dk', bev=.02)
    if big: m.ext([(x*-1, z) for x, z in blade], .06, head, 'steel_dk', bev=.02)
    else: m.box((.05, 0, hz), (.05, .045, .06), 'steel_dk')
    m.box((0, 0, hz), (.055, .05, .085), 'iron')
def p_pick(m, head='iron', handle='wood', L=1.0):
    m.cyl((0, 0, 0), (0, 0, L - .05), .04, handle, n=6, caps='wood_dk')
    hz = L - .1; pts = [(-.42, 0, hz - .16), (-.26, 0, hz - .02), (0, 0, hz + .06), (.26, 0, hz - .02), (.42, 0, hz - .16)]
    m.ptube(pts, [.012, .045, .07, .045, .012], 6, head, flat=.8, cap0=head, cap1=head)
    m.box((0, 0, hz + .02), (.065, .065, .07), 'iron_dk')
def p_mace(m, L=1.0):
    m.cyl((0, 0, 0), (0, 0, L - .2), .04, 'wood', n=6, caps='wood_dk')
    m.box((0, 0, .08), (.05, .05, .08), 'leather_dk')
    c = (0, 0, L - .12); m.sph(c, .13, 'iron', 8, 5)
    for i in range(6):
        a = TAU * i / 6; d = Vector((math.cos(a), math.sin(a), 0))
        m.hull([Vector(c) + d * .1 + Vector((0, 0, z)) for z in (-.14, .14)] + [Vector(c) + d * .24 + Vector((0, 0, z)) for z in (-.08, .08)] +
               [Vector(c) + d.cross(Vector((0, 0, 1))) * .025 * sgn + d * .12 for sgn in (-1, 1)], 'steel')
    m.sph((0, 0, L + .03), .05, 'steel', 6, 3)
def p_hammer(m, L=.9):
    m.cyl((0, 0, 0), (0, 0, L - .05), .035, 'wood', n=6, caps='wood_dk')
    m.box((0, 0, L - .06), (.2, .075, .08), 'iron', .02)
    m.box((.2, 0, L - .06), (.03, .085, .09), 'steel_dk')
def p_staff(m, L=1.3, orb='e_blue'):
    rng = random.Random(4); pts = [(rng.uniform(-.02, .02), 0, L * i / 7) for i in range(8)]
    m.ptube(pts, [.06, .055, .055, .058, .052, .055, .06, .065], 6, 'oak', cap0='wood_dk', cap1='wood_dk')
    for a in (0, 2.1, 4.2):
        m.ptube([(0, 0, L - .02), (math.cos(a)*.08, math.sin(a)*.08, L + .08), (math.cos(a)*.05, math.sin(a)*.05, L + .2)], [.03, .025, .012], 5, 'oak')
    m.hull(blob((0, 0, L + .13), (.12, .12, .14), 9, n=10, cuts=1), orb)
def p_bow(m, L=1.2, arrow=False, string=True):
    pts = []
    for i in range(11):
        u = i / 10 * 2 - 1; pts.append((-.3 * (1 - u*u) ** .8 + .06 * u*u, 0, u * .6 * L / 1.2))
    m.ptube(pts, [.022, .03, .036, .04, .045, .05, .045, .04, .036, .03, .022], 6, 'wood')
    m.ptube([(-.305, 0, -.09), (-.305, 0, .09)], .06, 6, 'leather', cap0='leather', cap1='leather')
    if string: m.cyl(pts[0], pts[-1], .009, 'cream', n=4)
    if arrow: p_arrow_at(m, (-.3, 0, 0), (.55, 0, 0))
def p_arrow_at(m, a, b, head='steel', fl='white', fl2='red', r=.016, hs=1.0, fs=1.0):
    a, b = Vector(a), Vector(b); d = (b - a).normalized(); L = (b - a).length
    m.cyl(a, b - d * .1, r, 'wood_lt', n=5)
    side = d.cross(Vector((0, 1, 0))).normalized()
    tip = b + d * .06 * hs; base = b - d * .1 * hs
    m.hull([tip, base + side * .06 * hs, base - side * .06 * hs, base + Vector((0, .03, 0)) * hs, base - Vector((0, .03, 0)) * hs], head)
    for sgn, col in ((1, fl), (-1, fl2)):
        p0 = a + d * .02; p1 = a + d * .2 * fs
        m.ext([((p0 + side * sgn * .005).x, (p0 + side * sgn * .005).z), ((p1 + side * sgn * .005).x, (p1 + side * sgn * .005).z),
               ((p0 + side * sgn * .08 * fs).x, (p0 + side * sgn * .08 * fs).z)], .02, col, y=a.y)
def p_shield_kite(m, face='blue', rim='steel', boss='gold', emblem=None):
    out = [(0, -.62), (.3, -.25), (.38, .15), (.36, .42), (0, .5), (-.36, .42), (-.38, .15), (-.3, -.25)]
    m.ext(out, .09, rim, 'steel_dk')
    P = [Vector(p) for p in out]
    if area2(P) < 0: P = P[::-1]
    m.ext([(v.x, v.y) for v in offset(P, -.06)], .06, face, face, y=-.03, bev=.02)
    if emblem == 'cross':
        m.ext(rrect(-.05, -.35, .05, .35, .015, 1), .03, 'white', y=-.09)
        m.ext(rrect(-.24, .06, .24, .15, .015, 1), .03, 'white', y=-.09)
    if boss: m.sph((0, -.08, .02), (.09, .06, .09), boss, 8, 4)
def p_shield_round(m, face='wood', rim='iron', boss='iron', r=.5, planks=True):
    m.ring2((0, 0, 0), r, r - .06, .1, rim, n=20, side='iron_dk')
    if planks:
        for i in range(-2, 3):
            x0 = i * r * .38; w = r * .18
            pts = [(x, z) for x, z in circ(20, r - .05) if abs(x - x0) <= w]
            xs = [x0 - w, x0 + w]
            poly = []
            for k in range(21):
                x = xs[0] + (xs[1] - xs[0]) * k / 20; zz = math.sqrt(max(0, (r - .05)**2 - x*x)); poly.append((x, zz))
            for k in range(21):
                x = xs[1] - (xs[1] - xs[0]) * k / 20; zz = math.sqrt(max(0, (r - .05)**2 - x*x)); poly.append((x, -zz))
            m.ext(poly, .06, face if i % 2 else 'wood_lt' if face == 'wood' else face, 'wood_dk', y=.0)
    else:
        m.ext(circ(20, r - .05), .06, face, bev=.02)
    if boss: m.sph((0, -.05, 0), (r*.26, r*.2, r*.26), boss, 8, 4)
def p_helm(m, metal='steel'):
    """a full helm: riveted drum below a domed crown, a dark T-shaped eye and breath slit, a crest ridge"""
    m.lathe([(.38, -.46), (.4, -.4), (.4, .02)], 14, lambda j, i: 'steel_dk' if j == 0 else metal, cap0='iron_dk')
    m.hull(ell((0, 0, 0), (.4, .4, .42), 14, 7, floor=0), lambda n, c: metal)
    m.ptube([(math.cos(a)*.41, math.sin(a)*.41, .02) for a in [TAU*i/18 for i in range(18)]], .04, 5, 'steel_dk', closed=True)
    m.ptube([(0, -.3, .3), (0, .0, .46), (0, .3, .3)], .045, 5, 'steel_dk')
    m.box((0, -.395, -.13), (.26, .03, .035), 'black')
    m.box((0, -.395, -.26), (.035, .03, .12), 'black')
    for a in (-2.3, -1.9, -1.24, -.84):
        m.sph((math.cos(a)*.405, math.sin(a)*.405, -.38), .028, 'gold', 5, 3)
def p_fist(m, skin="skin", cuff="tunic"):
    """a clenched fist in profile, knuckles to the right: four curled fingers stacked top to bottom with dark creases,
    rounded knuckle ends, the thumb folded across the top, a short sleeve cuff at the wrist"""
    m.hull(cbox((-.08, .02, 0), (.16, .14, .2), .06), skin)
    for i in range(4):
        z = .15 - i * .1
        m.hull(cbox((.08, 0, z), (.12, .13, .045), .02), skin)
        m.sph((.2, 0, z), (.05, .12, .047), skin, 8, 4)
        if i: m.box((.1, -.135, z + .05), (.12, .006, .009), "skin_dk")
    m.ptube([(-.2, -.05, .2), (-.02, -.15, .2), (.15, -.16, .13)], [.07, .065, .055], 6, skin, cap1=skin)
    m.box((.16, -.2, .13), (.03, .01, .025), "cream")
    m.cyl((-.22, .02, -.02), (-.42, .02, -.04), .17, cuff, n=8, caps="green_dk")
def p_palm(m, skin='skin', cuff='tunic'):
    m.box((0, 0, 0), (.19, .06, .2), skin, .05)
    for i, x in enumerate((-.14, -.045, .045, .14)):
        h = (.2, .26, .24, .17)[i]
        m.ptube([(x, 0, .18), (x * 1.1, -.01, .18 + h)], [.045, .04], 6, skin, cap1=skin)
    m.ptube([(-.18, -.02, -.02), (-.3, -.04, .12), (-.35, -.05, .22)], [.055, .05, .045], 6, skin, cap1=skin)
    m.cyl((0, .02, -.18), (0, .04, -.42), .16, cuff, n=8)
def p_boot(m, col='leather', sole='leather_dk'):
    m.box((0, 0, .38), (.14, .13, .3), col, .04)
    m.box((0, 0, .66), (.17, .15, .06), 'leather_lt', .02)
    m.hull(cbox((.1, 0, .09), (.25, .13, .09), .04) + [Vector((.36, 0, .14))], col)
    m.box((.1, 0, .015), (.27, .14, .025), sole)
    m.box((-.02, -.14, .2), (.06, .015, .03), 'gold')
def p_swoosh(m, c, R, a0, a1, w, col='swoosh', n=14, d=.03, y=.3):
    outer, inner = [], []
    for i in range(n + 1):
        t = i / n; a = a0 + (a1 - a0) * t; ww = w * math.sin(math.pi * t) ** .7 + .004
        outer.append((c[0] + (R + ww/2) * math.cos(a), c[1] + (R + ww/2) * math.sin(a)))
        inner.append((c[0] + (R - ww/2) * math.cos(a), c[1] + (R - ww/2) * math.sin(a)))
    m.ext(outer + inner[::-1], d, col, y=y)
def p_speed(m, x0, x1, zs, w=.035, col='swoosh', y=.3):
    for k, z in enumerate(zs):
        m.ext(rrect(x0 + k * .06, z - w/2, x1 - k*.08, z + w/2, w/2 * .9, 2), .03, col, y=y)
def p_burst(m, c, R, col='e_yellow', inner='e_fire', y=-.35, n=8, seed=3):
    rng = random.Random(seed)
    pts = [(c[0] + (R if i % 2 == 0 else R*.45) * rng.uniform(.8, 1.1) * math.cos(TAU*i/(2*n)), c[1] + (R if i % 2 == 0 else R*.45) * rng.uniform(.8, 1.1) * math.sin(TAU*i/(2*n))) for i in range(2*n)]
    m.ext(pts, .03, col, y=y)
    m.ext([(c[0] + (x - c[0]) * .5, c[1] + (z - c[1]) * .5) for x, z in pts], .03, inner, y=y - .03)
def p_star4(m, R=.5, r=.14, col='ice', side='steel', d=.14, bev=.05, c=(0, 0), y=0):
    m.ext(star2(4, R, r, c), d, col, side, bev=bev, y=y)
def p_heart(m, sc=.5, col='red', side='red_dk', d=.16):
    m.ext(heart2(sc), d, col, side, bev=.05)
def p_flame(m, sc=1.0, c=(0, 0), y=0.0, cols=('e_fire_dk', 'e_fire', 'e_fire_core')):
    shape = [(0, -.02), (.26, .08), (.34, .3), (.26, .56), (.14, .5), (.12, .76), (0, 1.0), (-.08, .66), (-.2, .78), (-.3, .42), (-.33, .18), (-.24, .04)]
    for k, (col, s2, dz) in enumerate(zip(cols, (1.0, .72, .42), (0, .0, .0))):
        m.ext([(c[0] + x * sc * s2, c[1] + z * sc * s2) for x, z in shape], .04, col, y=y - k * .05)
def p_coins(m, n=4, col='gold', seed=2):
    edge = ('gold_dk', 'brass') if col == 'gold' else ('bronze', 'leather_lt')
    for (x, y, cnt) in ((-.2, .1, n + 1), (.2, -.02, max(2, n - 1))):
        for i in range(cnt):
            m.ptube([(x + (i % 2) * .012, y, i * .07), (x + (i % 2) * .012, y, i * .07 + .062)], .26, 14, edge[i % 2], cap0=col, cap1=col)
    m.ptube([(.02, -.34, 0), (.02, -.34, .06)], .26, 14, edge[0], cap0=col, cap1=col)
def p_skull(m, horns=True, bone='bone', dk='bone_dk'):
    m.hull(ell((0, 0, .12), (.33, .3, .3), 10, 6), bone)
    m.hull(cbox((0, -.1, -.14), (.2, .16, .12), .05), bone)
    for sx in (-1, 1):
        m.sph((sx * .13, -.25, .08), (.085, .05, .075), 'black', 6, 3)
        m.box((sx * .03, -.27, -.1), (.022, .02, .035), 'black')
    for x in (-.09, -.03, .03, .09): m.box((x, -.25, -.24), (.022, .02, .035), 'cream')
    if horns:
        for sx in (-1, 1):
            m.ptube([(sx*.26, 0, .26), (sx*.46, -.02, .36), (sx*.6, -.05, .28), (sx*.62, -.08, .08), (sx*.52, -.1, -.02)], [.08, .075, .06, .04, .012], 7, 'horn', cap0='horn', cap1='horn')
def p_figure(m, pose='idle', tunic='tunic', legs='trousers', skin='skin', hair='hair', boots='leather_dk', armour=False, helm=False):
    J = {'hipL': (-.1, 0, .86), 'hipR': (.1, 0, .86), 'kneeL': (-.12, 0, .46), 'kneeR': (.12, 0, .46), 'footL': (-.13, 0, .06), 'footR': (.13, 0, .06),
         'shL': (-.25, 0, 1.3), 'shR': (.25, 0, 1.3), 'elL': (-.31, 0, 1.02), 'elR': (.31, 0, 1.02), 'haL': (-.33, -.02, .76), 'haR': (.33, -.02, .76),
         'neck': (0, 0, 1.38), 'head': (0, 0, 1.58)}
    lean = 0.0; hlean = 0.0; hturn = 0.0
    P = POSES.get(pose, {})
    for k, v in P.items():
        if k == 'lean': lean = v
        elif k == 'hlean': hlean = v
        elif k == 'hturn': hturn = v
        else: J[k] = v
    J = {k: Vector(v) for k, v in J.items()}
    if lean:  # bow forward (toward the camera, -Y) about the pelvis
        R = Matrix.Rotation(-math.radians(lean), 3, 'X'); piv = Vector((0, 0, .9))
        for k in ('shL', 'shR', 'elL', 'elR', 'haL', 'haR', 'neck', 'head'): J[k] = piv + R @ (J[k] - piv)
    hipc = (J['hipL'] + J['hipR']) / 2; shc = (J['shL'] + J['shR']) / 2
    up = (shc - hipc).normalized(); fwd = Vector((0, -1, 0)); rt = up.cross(fwd).normalized() * -1
    tp = []
    for c, w, dd in ((hipc + up * -.04, .19, .12), (hipc + up * .12, .2, .13), (shc + up * -.18, .27, .15), (shc + up * -.02, .26, .13)):
        for sx in (-1, 1):
            for sy in (-1, 1): tp.append(c + rt * sx * w + Vector((0, sy * dd, 0)))
    tcol = 'steel' if armour else tunic
    m.hull(tp, tcol)
    m.hull([hipc + up * .02 + rt * sx * .205 + Vector((0, sy * .14, z)) for sx in (-1, 1) for sy in (-1, 1) for z in (-.03, .03)], 'leather_dk' if not armour else 'steel_dk')
    lc = 'steel_dk' if armour else legs
    for s in 'LR':
        m.ptube([J['hip' + s], J['knee' + s], J['foot' + s] + Vector((0, 0, .06))], [.1, .085, .075], 6, lc, cap0=lc, cap1=lc)
        f = J['foot' + s]; m.box((f.x, f.y - .06, f.z), (.07, .12, .05), boots, .02)
        ac = 'steel' if armour else tunic
        m.ptube([J['sh' + s], J['el' + s], J['ha' + s]], [.085, .075, .065], 6, ac, cap0=ac, cap1=ac)
        m.sph(J['ha' + s], .07, 'steel_dk' if armour else skin, 6, 4)
        if armour: m.sph(J['sh' + s] + up * .03, .13, 'steel', 7, 4)
    m.cyl(J['neck'] + Vector((0, 0, -.06)), J['neck'] + Vector((0, 0, .06)), .07, skin, n=6)
    hc = J['head']; hk = m.mark()
    m.hull(ell((0, 0, 0), (.15, .15, .17), 10, 6), skin)
    if helm:
        m.hull(ell((0, .0, .04), (.18, .18, .17), 10, 6, floor=.0), 'steel')
        m.box((0, -.17, -.02), (.025, .02, .09), 'steel_dk')
    else:
        m.hull(ell((0, .03, .05), (.165, .16, .15), 10, 6, floor=.0), hair)
        m.hull(cbox((0, .1, -.02), (.15, .07, .1), .03), hair)
    for sx in (-1, 1): m.box((sx * .055, -.148, .0), (.022, .01, .022), 'black')
    m.tf(hk, T(*hc) @ Matrix.Rotation(math.radians(hturn), 4, 'Z') @ Matrix.Rotation(-math.radians(hlean), 4, 'X'))
    return J
POSES = {
    'idle': {},
    'cheer': {'elL': (-.42, 0, 1.55), 'haL': (-.47, -.02, 1.84), 'elR': (.42, 0, 1.55), 'haR': (.47, -.02, 1.84), 'hlean': -8},
    'wave': {'elR': (.5, 0, 1.4), 'haR': (.56, -.04, 1.72)},
    'yes': {'hlean': 26},
    'no': {'hturn': 38},
    'bow': {'lean': 38, 'elR': (.08, -.22, 1.08), 'haR': (-.12, -.24, 1.06), 'hlean': 16},
    'angry': {'elL': (-.46, -.05, 1.2), 'haL': (-.4, -.12, 1.5), 'elR': (.46, -.05, 1.2), 'haR': (.4, -.12, 1.5), 'hlean': 10},
    'think': {'elR': (.3, -.12, 1.06), 'haR': (.07, -.18, 1.42), 'elL': (-.18, -.12, 1.0), 'haL': (.12, -.16, 1.04), 'hlean': 8, 'hturn': -12},
    'laugh': {'elL': (-.33, -.12, 1.0), 'haL': (-.12, -.2, .96), 'elR': (.33, -.12, 1.0), 'haR': (.12, -.2, .96), 'hlean': -30},
    'dance': {'elL': (-.5, 0, 1.28), 'haL': (-.62, -.02, 1.5), 'elR': (.5, 0, 1.2), 'haR': (.62, -.02, 1.0), 'kneeR': (.32, -.1, .56), 'footR': (.2, -.05, .3), 'hlean': -6},
    'sit': {'hipL': (-.1, 0, .46), 'hipR': (.1, 0, .46), 'kneeL': (-.12, -.4, .46), 'kneeR': (.12, -.4, .46), 'footL': (-.13, -.42, .06), 'footR': (.13, -.42, .06),
            'shL': (-.25, 0, .9), 'shR': (.25, 0, .9), 'elL': (-.29, -.1, .64), 'elR': (.29, -.1, .64), 'haL': (-.2, -.3, .52), 'haR': (.2, -.3, .52), 'neck': (0, 0, .98), 'head': (0, 0, 1.18)},
    'shrug': {'elL': (-.44, -.06, 1.08), 'haL': (-.62, -.12, 1.2), 'elR': (.44, -.06, 1.08), 'haR': (.62, -.12, 1.2), 'shL': (-.25, 0, 1.36), 'shR': (.25, 0, 1.36), 'hlean': 6},
    'clap': {'elL': (-.3, -.14, 1.06), 'haL': (-.03, -.3, 1.18), 'elR': (.3, -.14, 1.06), 'haR': (.03, -.3, 1.2)},
    'guard': {'elL': (-.36, -.16, 1.04), 'haL': (-.24, -.3, 1.08), 'elR': (.38, -.05, 1.0), 'haR': (.42, -.12, 1.08)},
}
def p_wizhat(m, col='blue', band='gold', stars=True):
    m.lathe([(.62, .0), (.64, .03), (.36, .06), (.34, .02)], 16, 'blue_dk' if col == 'blue' else col, cap0=col)
    m.ptube([(0, 0, .04), (0, .02, .36), (.04, .04, .66), (.22, .1, .9), (.36, .12, .92)], [.32, .24, .15, .07, .015], 10, col, cap0=col, cap1=col)
    m.ptube([(math.cos(a)*.33, math.sin(a)*.33, .1) for a in [TAU*i/16 for i in range(16)]], .035, 5, band, closed=True)
    if stars:
        for (x, z, s) in ((-.1, .3, .085), (.07, .54, .06), (-.02, .16, .05)):
            m.ext(star2(5, s, s * .45), .03, 'gold', y=-.3 + (z * .25))
def p_book(m, cover='blue', pages='cream', emblem='gold'):
    m.box((0, 0, 0), (.36, .1, .46), cover, .02)
    m.box((.03, -.0, 0), (.33, .085, .43), pages)
    m.box((0, -.105, 0), (.37, .012, .47), cover)
    m.box((-.36, 0, 0), (.035, .1, .47), 'blue_dk' if cover == 'blue' else cover)
    for x, z in ((.33, .43), (.33, -.43), (-.33, .43), (-.33, -.43)): m.box((x, -.11, z), (.045, .02, .045), 'gold_dk')
    m.ring2((0, -.13, 0), .16, .12, .02, emblem, n=18)
    m.ext(star2(4, .12, .04, (0, 0)), .02, emblem, y=-.13)
def p_scroll(m):
    m.ext(rrect(-.34, -.46, .34, .46, .02, 1), .03, 'parch', 'parch_dk')
    for z in (-.48, .48):
        m.cyl((-.4, 0, z), (.4, 0, z), .075, 'parch_dk', n=8)
        for sx in (-1, 1): m.cyl((sx * .4, 0, z), (sx * .47, 0, z), .045, 'wood_dk', n=6)
    for k, z in enumerate((.3, .18, .06, -.06, -.18)):
        m.ext(rrect(-.24, z - .018, .24 - (k % 2) * .1, z + .018, .01, 1), .01, 'ink', y=-.03)
    m.ptube([(.14, -.03, -.3), (.1, -.05, -.46), (.06, -.04, -.6)], .03, 4, 'cloth_blue', flat=.3)
    m.ptube([(.2, -.03, -.3), (.24, -.05, -.46), (.28, -.04, -.58)], .03, 4, 'cloth_blue', flat=.3)
    m.ext(circ(12, .1, (.17, -.3)), .04, 'wax', 'red_dk', bev=.02, y=-.05)
def p_backpack(m):
    m.hull(cbox((0, 0, .38), (.32, .2, .36), .1), 'leather')
    m.hull(cbox((0, -.07, .62), (.35, .18, .14), .07), 'leather_dk')
    m.hull(cbox((0, -.25, .26), (.21, .06, .15), .05), 'leather_lt')
    for x in (-.17, .17):
        m.box((x, -.25, .5), (.04, .02, .13), 'leather_dk')
        m.box((x, -.28, .42), (.045, .02, .035), 'gold')
    m.box((0, -.32, .32), (.05, .02, .04), 'gold')
    m.ptube([(-.2, 0, .74), (-.12, 0, .92), (.12, 0, .92), (.2, 0, .74)], .04, 5, 'leather_dk')
def p_banner(m):
    m.cyl((-.34, 0, -.7), (-.34, 0, .62), .04, 'wood', n=6, caps='wood_dk')
    m.cyl((-.42, 0, .5), (.42, 0, .5), .03, 'wood', n=6, caps='wood_dk')
    m.sph((-.34, 0, .68), .06, 'gold', 6, 4)
    m.ext([(-.3, .47), (.36, .47), (.36, -.38), (.03, -.2), (-.3, -.38)], .04, 'cloth_red', 'red_dk', bev=.015)
    m.ext(star2(5, .15, .065, (.03, .15)), .02, 'gold', y=-.04)
def p_smiley(m, col='yellow', happy=True):
    m.hull(ell((0, 0, 0), (.5, .42, .5), 14, 8), col)
    for sx in (-1, 1): m.hull(ell((sx * .17, -.4, .12), (.06, .04, .1), 6, 3), 'black')
    if happy: pts = [(-math.cos(math.pi*i/8) * .27, -.43 + .06 * abs(math.cos(math.pi*i/8)), -.14 - math.sin(math.pi*i/8) * .15) for i in range(9)]
    else: pts = [(-math.cos(math.pi*i/8) * .25, -.43 + .06 * abs(math.cos(math.pi*i/8)), -.3 + math.sin(math.pi*i/8) * .13) for i in range(9)]
    m.ptube(pts, .04, 5, 'black', cap0='black', cap1='black')
def p_door(m):
    arch = [(-.3, -.55), (.3, -.55), (.3, .2)] + [(math.cos(a) * .3, .2 + math.sin(a) * .3) for a in [math.pi * i / 10 for i in range(1, 10)]] + [(-.3, .2)]
    for i in range(4):
        x0, x1 = -.3 + i * .15 + .006, -.3 + (i + 1) * .15 - .006
        poly = [(x, z) for x, z in [(x0, -.55), (x1, -.55)]]
        top = lambda x: .2 + math.sqrt(max(0, .09 - x*x))
        poly += [(x1, top(x1))] + [(x0 + (x1 - x0) * (1 - k / 4), top(x0 + (x1 - x0) * (1 - k / 4))) for k in range(1, 4)] + [(x0, top(x0))]
        m.ext(poly, .06, 'wood' if i % 2 == 0 else 'oak', 'wood_dk')
    for z in (-.35, .15):
        m.ext(rrect(-.31, z - .035, .31, z + .035, .01, 1), .03, 'iron', y=-.05)
        for x in (-.22, 0, .22): m.sph((x, -.075, z), .022, 'steel', 5, 3)
    m.ring2((.17, -.08, -.1), .07, .045, .03, 'iron', n=12)
    for k in range(9):
        a0 = math.pi * k / 9; a1 = math.pi * (k + 1) / 9
        m.ring2((0, .0, .2), .44, .31, .16, 'stone' if k % 2 else 'stone_lt', n=3, side='stone_dk', a0=a0 + .02, a1=a1 - .02)
    for sx in (-1, 1):
        for k in range(3):
            z0 = -.58 + k * .26; m.box((sx * .375, 0, z0 + .12), (.065, .08, .12), 'stone_lt' if (k + (sx > 0)) % 2 else 'stone', .015)
def p_spanner(m):
    m.ext(rrect(-.055, -.42, .055, .42, .05, 2), .06, 'steel', 'steel_dk', bev=.02)
    for z, flip in ((.5, 1), (-.5, -1)):
        outer = [(math.cos(a) * .17, z + math.sin(a) * .17) for a in [flip * math.pi/2 + math.radians(40) + (TAU - math.radians(80)) * i / 14 for i in range(15)]]
        inner = [(math.cos(a) * .075, z + math.sin(a) * .075 + flip * .03) for a in [flip * math.pi/2 + math.radians(40) + (TAU - math.radians(80)) * i / 14 for i in range(15)]][::-1]
        m.ext(outer + inner, .07, 'steel', 'steel_dk', bev=.015)
def p_harp(m):
    m.ptube([(-.34, 0, -.62), (-.36, 0, .0), (-.3, 0, .56)], [.055, .05, .06], 6, 'wood', cap0='wood_dk', cap1='wood_dk')
    neck = [(-.32, 0, .58), (-.1, 0, .66), (.1, 0, .52), (.24, 0, .5), (.36, 0, .62)]
    m.ptube(neck, [.06, .055, .05, .055, .06], 6, 'gold', cap0='gold_dk', cap1='gold_dk')
    m.ptube([(.36, 0, .6), (.18, 0, -.04), (-.3, 0, -.62)], [.07, .09, .06], 6, 'wood', cap0='wood_dk', cap1='wood_dk')
    for i in range(6):
        t = (i + 1) / 7; x = -.32 + .62 * t
        ztop = .6 - .1 * math.sin(t * math.pi) - .06
        zbot = -.62 + (x + .3) / .66 * 1.22 + .04
        if ztop - zbot > .08: m.cyl((x, -.01, ztop), (x, -.01, zbot), .012, 'cream', n=4)
    m.sph((-.3, 0, .62), .07, 'gold', 6, 4)
def p_note(m, col='gold', side='gold_dk'):
    for x, z in ((-.3, -.35), (.3, -.22)):
        m.ext([(x + math.cos(a) * .17 - math.sin(a) * .0, z + math.sin(a) * .12) for a in [TAU * i / 14 for i in range(14)]], .1, col, side, bev=.03)
    m.ext([(-.18, -.35), (-.13, -.35), (-.13, .42), (-.18, .42)], .08, col, side)
    m.ext([(.42, -.22), (.47, -.22), (.47, .55), (.42, .55)], .08, col, side)
    m.ext([(-.18, .3), (.47, .43), (.47, .58), (-.18, .45)], .08, col, side, bev=.02)
def p_cross_x(m, col='orange', side='red_dk', L=.46, w=.1):
    for a in (45, -45):
        k = m.mark(); m.ext(rrect(-w, -L, w, L, w * .8, 2), .08, col, side, bev=.03); m.tf(k, rotY(a))
def p_layers(m):
    for k, (c, dk) in enumerate((('water', 'blue_dk'), ('sand', 'wood_lt'), ('grass', 'green_dk'))):
        m.hull(cbox((k * .06 - .06, -k * .04, k * .15), (.42, .32, .045), .02), lambda n, cc, c=c, dk=dk: c if n.z > .5 else dk)
    m.hull(blob((.05, -.12, .36), (.1, .08, .07), 5, n=10), 'green_dk')
    m.hull(blob((-.2, .1, .34), (.08, .07, .04), 6, n=10), 'stone')
def p_medal(m, ribbon=True, col='gold', side='gold_dk'):
    if ribbon:
        m.ext([(-.24, .7), (-.02, .7), (.06, .12), (-.08, .12)], .03, 'cloth_red', 'red_dk', y=.05)
        m.ext([(.02, .7), (.24, .7), (.08, .12), (-.06, .12)], .03, 'cloth_blue', 'blue_dk', y=.08)
    m.ext(circ(18, .32), .08, col, side, bev=.035)
    m.ext(star2(5, .19, .085), .03, 'e_gold' if col == 'gold' else col, y=-.07)
def p_bust(m):
    m.hull([Vector((x, y, z)) for x in (-.42, .42) for y in (-.16, .16) for z in (-.4, -.18)] + [Vector((x, y, -.05)) for x in (-.3, .3) for y in (-.12, .12)], 'tunic')
    m.cyl((0, 0, -.1), (0, 0, .05), .1, 'skin', n=6)
    m.hull(ell((0, 0, .22), (.2, .2, .23), 10, 6), 'skin')
    m.hull(ell((0, .04, .29), (.22, .21, .2), 10, 6, floor=.24), 'hair')
    m.hull(cbox((0, .12, .18), (.2, .1, .14), .04), 'hair')
    for sx in (-1, 1): m.box((sx * .075, -.2, .23), (.028, .012, .028), 'black')
    m.box((0, -.21, .14), (.05, .01, .012), 'skin_dk')
def p_orb(m, col):
    m.hull(ell((0, 0, 0), (.5, .5, .5), 16, 10), col)
def p_socket(m, n=10):
    for k in range(n):
        a0 = TAU * k / n + .03; a1 = TAU * (k + 1) / n - .03
        m.ring2((0, 0, 0), .5, .39, .14, 'stone' if k % 2 else 'stone_lt', n=3, side='stone_dk', a0=a0, a1=a1)
    m.ring2((0, .05, 0), .41, .37, .1, 'slate', n=24)
def p_ring_big(m, n=18):
    for k in range(n):
        a0 = TAU * k / n + .012; a1 = TAU * (k + 1) / n - .012
        m.ring2((0, 0, 0), 1.0, .87, .16, ('stone', 'stone_lt', 'stone', 'stone_dk')[k % 4] if k % 4 != 3 else 'stone', n=4, side='stone_dk', a0=a0, a1=a1)
    m.ring2((0, .06, 0), .88, .86, .1, 'slate', n=48)
    for k in range(4):
        a = TAU * k / 4 + TAU / 8; c = (math.cos(a) * .935, -.1, math.sin(a) * .935)
        m.sph(c, (.05, .04, .05), 'iron', 6, 3)
def p_compass(m):
    m.ext(circ(24, .44), .06, 'parch', 'parch_dk')
    m.ring2((0, -.02, 0), .5, .43, .12, 'brass', n=24, side='gold_dk')
    for k in range(8):
        a = -math.pi/2 * 0 + TAU * k / 8; L = .1 if k % 2 == 0 else .05
        kk = m.mark(); m.ext(rrect(-.016, .42 - L, .016, .41, .004, 1), .02, 'ink', y=-.04); m.tf(kk, rotY(math.degrees(a)))
    m.ext([(0, .36), (.085, 0), (-.085, 0)], .05, 'red', 'red_dk', y=-.07)
    m.ext([(0, -.36), (.085, 0), (-.085, 0)], .05, 'white', 'stone', y=-.07)
    m.sph((0, -.1, 0), (.045, .03, .045), 'gold', 6, 3)
    m.ext([(-.075, .49), (-.075, .65), (-.035, .65), (.035, .56), (.035, .65), (.075, .65), (.075, .49), (.035, .49), (-.035, .58), (-.035, .49)], .05, 'red', 'red_dk', y=-.06)
def p_globe(m):
    m.hull(ell((0, 0, 0), (.5, .5, .5), 16, 10), 'water')
    for i, (a, b, s) in enumerate(((-.5, .5, (.2, .12, .16)), (.35, .1, (.16, .1, .2)), (-.1, -.45, (.2, .1, .1)), (.55, -.3, (.1, .08, .08)), (-.7, -.1, (.1, .1, .12)))):
        d = Vector((math.sin(a) * math.cos(b), -math.cos(a) * math.cos(b), math.sin(b))).normalized()
        c = d * .44; q = Vector((0, 0, 1)).rotation_difference(d)
        m.hull([c + q @ p for p in blob((0, 0, 0), (s[0], s[2], .09), 20 + i, n=12, cuts=1)], 'grass')
    m.ptube([(math.cos(a) * .58, 0, math.sin(a) * .58) for a in [math.pi * (-.25 + 1.5 * i / 16) for i in range(17)]], .035, 5, 'brass')
    m.sph((0, 0, -.62), (.09, .09, .05), 'wood', 6, 3)
def p_candle(m):
    m.lathe([(.3, -.5), (.3, -.44), (.12, -.4), (.1, -.3), (.2, -.28), (.2, -.24)], 12, 'brass', cap0='brass', cap1='gold_dk')
    m.cyl((0, 0, -.26), (0, 0, .22), .1, 'cream', n=10)
    m.ptube([(.1, 0, .2), (.14, 0, .1), (.13, 0, .02)], [.035, .03, .02], 5, 'cream')
    m.cyl((0, 0, .22), (0, 0, .28), .012, 'black', n=4)
    p_flame(m, .34, (0, .24), y=-.05)
def p_hourglass(m, frame='wood', sand='sand', glow=False):
    for z in (-.5, .5): m.cyl((0, 0, z - .04), (0, 0, z + .04), .34, frame, n=12)
    for a in (0, 2.1, 4.2): m.cyl((math.cos(a) * .28, math.sin(a) * .28, -.46), (math.cos(a) * .28, math.sin(a) * .28, .46), .03, frame, n=5)
    m.lathe([(.02, -.46), (.24, -.36), (.26, -.18), (.05, -.02), (.05, .02), (.26, .18), (.24, .36), (.02, .46)], 12, 'ice')
    m.lathe([(.01, -.45), (.2, -.36), (.18, -.22), (.01, -.2)], 10, sand, cap1=sand)
    m.lathe([(.01, .12), (.12, .16), (.18, .24), (.01, .25)], 10, sand, cap1=sand)
    if glow: m.ext(star2(4, .22, .06, (.28, .4)), .03, 'e_blue', y=-.35)
def p_eye(m, iris='green'):
    shape = [(math.cos(a) * .5, math.sin(a) * .26 * (1 if math.sin(a) > 0 else .9)) for a in [TAU * i / 20 for i in range(20)]]
    shape = [(x, z * (1 - (abs(x) / .5) ** 2) ** .2) for x, z in shape]
    m.ext(shape, .12, 'white', 'bone_dk', bev=.03)
    m.ext(circ(14, .17), .04, iris, y=-.1); m.ext(circ(10, .08), .04, 'black', y=-.13)
    m.ext(circ(6, .035, (-.05, .06)), .02, 'white', y=-.15)
    lid = [(math.cos(a) * .56, math.sin(a) * .34) for a in [math.pi * i / 12 for i in range(13)]] + [(math.cos(a) * .5, math.sin(a) * .26) for a in [math.pi * (12 - i) / 12 for i in range(13)]]
    m.ext(lid, .14, 'skin', 'skin_dk', y=-.02)
def p_feather(m):
    pts = [(-.08, -.6), (.12, -.2), (.18, .2), (.08, .55), (-.02, .62), (-.14, .3), (-.16, -.1)]
    m.ext(pts, .04, 'leather_lt', 'leather_dk', bev=.02)
    for k in range(5):
        z = -.25 + k * .17; m.ext(rrect(-.13, z - .025, .15, z + .025, .01, 1), .02, 'wood_dk', y=-.04)
    m.cyl((-.1, -.04, -.72), (.06, -.04, .56), .018, 'cream', n=4)
def p_crystal_orb(m):
    m.lathe([(.3, -.5), (.32, -.44), (.18, -.36), (.22, -.28)], 10, 'bronze', cap0='bronze', cap1='gold_dk')
    m.hull(ell((0, 0, .06), (.36, .36, .36), 14, 8), 'purple')
    m.hull(ell((-.08, -.2, .14), (.13, .1, .13), 8, 4), 'e_purple')
def p_open_book(m, glyph='e_purple'):
    for sx in (-1, 1):
        m.hull([Vector((sx * x, y, z)) for x in (.02, .46) for y in (-.04, .02) for z in (-.3, .3)] + [Vector((sx * .24, -.08, z)) for z in (-.3, .3)], 'cream')
        m.hull([Vector((sx * x, y, z)) for x in (.0, .5) for y in (.03, .07) for z in (-.33, .33)], 'purple_dk')
    for sx in (-1, 1):
        for k in range(3): m.ext(rrect(sx * .08 if sx > 0 else -.38, .12 - k * .12, .38 if sx > 0 else -.08, .15 - k * .12, .005, 1), .01, 'ink', y=-.09)
    m.ext(star2(5, .24, .1, (0, .6)), .04, glyph, y=-.2); m.ext(circ(10, .08, (0, .6)), .03, 'e_white', y=-.24)
def p_ward(m, face, sym):
    m.ring2((0, 0, 0), .5, .41, .12, 'bronze', n=20, side='gold_dk')
    m.ext(circ(20, .42), .06, face, face)
    if sym == 'magic': m.ext(star2(4, .3, .08), .04, 'e_white', y=-.06); m.ext(star2(4, .18, .05, a0=math.pi/4), .03, 'e_blue', y=-.09)
    if sym == 'range': k = m.mark(); p_arrow_at(m, (-.3, -.05, -.3), (.26, -.05, .26), fl='white', fl2='white'); m.tf(k, T(0, -.04, 0))
    if sym == 'melee': k = m.mark(); p_sword(m, L=.8, w=.07, gw=.16); m.tf(k, T(0, -.1, 0) @ rotY(-45) @ T(0, 0, -.42))
def p_bolt_zig(m, c=(0, 0), s=1.0, col='e_yellow', y=-.3):
    pts = [(.02, .5), (.2, .5), (.06, .1), (.2, .1), (-.14, -.5), (-.04, -.06), (-.18, -.06)]
    m.ext([(c[0] + x * s, c[1] + z * s) for x, z in pts], .04, col, 'gold_dk', y=y)
def p_arm_flex(m):
    m.ptube([(-.45, 0, -.2), (-.12, 0, -.16), (.18, 0, -.12)], [.12, .16, .12], 8, 'skin', cap0='skin')
    m.ptube([(.18, 0, -.12), (.24, 0, .15), (.2, 0, .36)], [.12, .11, .1], 8, 'skin')
    m.hull(cbox((.19, -.02, .45), (.12, .1, .11), .04), 'skin')
    m.hull(ell((-.1, -.06, -.02), (.18, .12, .12), 8, 4), 'skin')
    m.cyl((-.62, 0, -.2), (-.44, 0, -.2), .15, 'tunic', n=8)
def p_stump_axe(m):
    m.lathe([(.44, -.5), (.4, -.4), (.36, -.1), (.36, .1)], 12, 'wood', cap0='wood_dk', cap1='wood_lt')
    m.ptube([(math.cos(a) * .2, math.sin(a) * .2, .105) for a in [TAU * i / 14 for i in range(14)]], .018, 4, 'wood_dk', closed=True)
    k = m.mark(); p_axe(m, L=1.0); m.tf(k, T(.02, -.05, .0) @ rotY(-40) @ S(1.1))
    for a in (1.2, 2.8, 4.3): m.ptube([(math.cos(a)*.36, math.sin(a)*.36, -.42), (math.cos(a)*.55, math.sin(a)*.55, -.5)], [.08, .03], 5, 'wood_dk')
def p_fish(m):
    body = [(-.5, 0), (-.36, .14), (-.05, .22), (.28, .16), (.46, .04), (.5, -.01), (.44, -.08), (.2, -.16), (-.12, -.18), (-.4, -.1)]
    m.ext(body, .2, 'steel', 'steel_dk', bev=.06)
    m.ext([(-.06, -.12), (.2, -.12), (.26, -.04), (.1, .0), (-.1, -.02)], .03, 'water_lt', y=-.13)
    m.ext([(-.46, .01), (-.72, .24), (-.66, 0), (-.74, -.2)], .06, 'water', 'blue_dk', bev=.01)
    m.ext([(-.2, .2), (.06, .38), (.14, .2)], .04, 'water', 'blue_dk')
    m.ext([(0, -.17), (.14, -.3), (.2, -.16)], .04, 'water', 'blue_dk')
    m.ext(circ(8, .045, (.34, .06)), .02, 'black', y=-.13)
    m.ext(circ(6, .018, (.33, .075)), .01, 'white', y=-.15)
def p_pot(m):
    m.lathe([(.0, -.46), (.24, -.44), (.42, -.26), (.46, -.02), (.4, .2), (.42, .26), (.36, .26), (.34, .2)], 14, 'iron', cap0='iron_dk')
    m.lathe([(.34, .16), (.0, .16)], 14, 'stew', cap1='stew')
    for (x, z, c) in ((-.1, .19, 'green'), (.12, .2, 'orange'), (.02, .2, 'bone')): m.sph((x, -.06, z), .06, c, 6, 3)
    m.ptube([(math.cos(a) * .46, math.sin(a) * .1 - .05, .26 + math.sin(a) * .35) for a in [math.pi * i / 10 for i in range(11)]], .025, 5, 'iron_dk')
    for sx in (-1, 1): m.box((sx * .45, 0, .2), (.04, .05, .05), 'iron_dk')
    m.ptube([(.18, -.05, .18), (.34, -.12, .5), (.4, -.14, .62)], .03, 5, 'wood')
def p_logs_fire(m):
    for a, y in ((25, .08), (-25, -.02), (0, .12)):
        k = m.mark(); m.cyl((-.46, 0, 0), (.46, 0, 0), .1, 'wood', n=7, caps='wood_lt'); m.tf(k, T(0, y, -.42) @ rotZ(a * 2.2) @ rotY(0))
    p_flame(m, .9, (0, -.38), y=-.2)
def p_anvil(m):
    prof = [(-.62, .3), (-.3, .2), (-.3, .36), (.44, .36), (.44, .16), (.2, .1), (.16, -.12), (.32, -.22), (.36, -.34), (-.3, -.34), (-.26, -.22), (-.1, -.12), (-.14, .1), (-.3, .14)]
    m.ext(prof, .34, 'steel_dk', 'iron', bev=.035)
    k = m.mark(); p_hammer(m, .7); m.tf(k, T(.2, -.25, .1) @ rotY(55) @ S(.8))
def p_arrow_feather(m):
    p_arrow_at(m, (-.45, 0, -.45), (.36, 0, .36), fl='white', fl2='cloth_red', r=.035, hs=2.0, fs=1.9)
def p_mask(m):
    for sx in (-1, 1):
        m.ring2((sx * .23, 0, 0), (.24, .18), (.12, .09), .1, 'slate', n=14, side='black')
    m.box((0, 0, .03), (.07, .05, .06), 'slate')
    for sx in (-1, 1): m.ptube([(sx * .46, .02, .04), (sx * .58, .08, .1), (sx * .66, .12, -.06)], .03, 4, 'leather_dk')
def p_house(m, s=1.0):
    m.box((0, 0, -.1 * s), (.3 * s, .22 * s, .2 * s), 'stone_lt')
    m.hull([Vector((x, y, z)) for x in (-.36 * s, .36 * s) for y in (-.28 * s, .28 * s) for z in (.1 * s,)] + [Vector((x, 0, .36 * s)) for x in (-.36 * s, .36 * s)], 'cloth_red')
    m.box((0, -.23 * s, -.17 * s), (.07 * s, .01, .13 * s), 'wood_dk')
    m.box((.3 * s * .6, 0, .3 * s), (.05 * s, .05 * s, .1 * s), 'stone_dk')
def p_rocks(m, s=1.0, col='stone', seed=5):
    m.hull(blob((0, 0, 0), (.3 * s, .26 * s, .36 * s), seed, n=14), col)
    m.hull(blob((.26 * s, -.08 * s, -.16 * s), (.16 * s, .14 * s, .16 * s), seed + 1, n=10), 'stone_dk' if col == 'stone' else 'leather')
    m.hull(blob((-.28 * s, -.05 * s, -.2 * s), (.14 * s, .12 * s, .12 * s), seed + 2, n=10), col)
def p_deadtree(m, s=1.0):
    m.ptube([(0, 0, -.45 * s), (.02 * s, 0, 0), (-.04 * s, 0, .3 * s)], [.08 * s, .06 * s, .03 * s], 6, 'wood_dk')
    for (a, b) in (((0, 0, .02), (.28, 0, .26)), ((0, 0, .12), (-.26, 0, .34)), ((.14, 0, .14), (.26, 0, .4)), ((-.14, 0, .2), (-.3, 0, .16))):
        m.ptube([tuple(v * s for v in a), tuple(v * s for v in b)], [.04 * s, .012 * s], 5, 'wood_dk')
    m.hull(blob((0, 0, -.5 * s), (.4 * s, .2 * s, .07 * s), 7, n=12), 'green_dk')
def p_snowflake(m, s=1.0):
    for k in range(3):
        kk = m.mark(); m.ext(rrect(-.045 * s, -.42 * s, .045 * s, .42 * s, .02 * s, 1), .05, 'blue', 'blue_dk'); m.tf(kk, rotY(60 * k))
        for sgn in (1, -1):
            for zz in (.24, -.24):
                kk = m.mark(); m.ext(rrect(-.035 * s, 0, .035 * s, .15 * s, .01 * s, 1), .04, 'blue', 'blue_dk'); m.tf(kk, rotY(60 * k) @ T(0, 0, zz * s) @ rotY(sgn * 45 + (180 if zz < 0 else 0)))
def p_sun_dune(m, s=1.0):
    m.ext(circ(14, .2 * s, (0, .12 * s)), .04, 'e_yellow', 'gold_dk', y=.05)
    for k in range(8):
        a = TAU * k / 8; kk = m.mark(); m.ext([(-.04 * s, .26 * s), (.04 * s, .26 * s), (0, .36 * s)], .03, 'e_gold', y=.05); m.tf(kk, T(0, 0, .12 * s) @ rotY(math.degrees(a)) @ T(0, 0, -.12 * s) @ T(0, 0, .0))
    m.ext([(-.5 * s, -.42 * s), (.5 * s, -.42 * s), (.36 * s, -.2 * s), (.1 * s, -.12 * s), (-.2 * s, -.18 * s), (-.44 * s, -.3 * s)], .1, 'sand', 'wood_lt', y=-.08)
def p_portal(m):
    m.ring2((0, .05, 0), .56, .48, .08, 'e_portal', n=24)
    m.ext(circ(24, .49), .02, 'ice', y=.1)
def p_chest(m):
    m.box((0, 0, -.1), (.42, .26, .22), 'wood', .02)
    m.hull([Vector((x, y, .12)) for x in (-.42, .42) for y in (-.26, .26)] + [Vector((x, y * math.cos(a), .12 + .24 * math.sin(a))) for x in (-.42, .42) for y in (-.26, .26) for a in (.5, 1.1, math.pi / 2)], 'oak')
    for x in (-.28, .28): m.box((x, 0, 0), (.04, .28, .38), 'iron')
    m.box((0, -.28, .08), (.07, .02, .08), 'gold')
def p_bell(m):
    m.lathe([(.0, .5), (.1, .48), (.18, .36), (.22, .1), (.3, -.2), (.42, -.34), (.4, -.38), (.0, -.38)], 14, 'brass', cap1='gold_dk')
    m.sph((0, 0, -.44), .08, 'iron', 6, 3)
    m.ring2((0, 0, .54), .1, .06, .04, 'iron', n=10)
def p_roof(m):
    m.box((0, 0, -.25), (.4, .3, .18), 'stone_lt', .02)
    m.hull([Vector((x, y, -.07)) for x in (-.52, .52) for y in (-.4, .4)] + [Vector((x, 0, .38)) for x in (-.52, .52)], lambda n, c: 'cloth_red' if n.y < 0 else 'red_dk')
    m.box((.3, 0, .26), (.06, .06, .14), 'stone')
def p_cape(m, col='cloth_red'):
    m.ext([(-.2, .5), (.2, .5), (.34, .2), (.44, -.5), (.2, -.42), (0, -.5), (-.2, -.42), (-.44, -.5), (-.34, .2)], .06, col, 'red_dk', bev=.02)
    m.ext(rrect(-.24, .44, .24, .56, .04, 2), .08, 'gold', 'gold_dk')
def p_amulet(m):
    m.ptube([(math.cos(a) * .3, 0, .1 + math.sin(a) * .42) for a in [math.pi * i / 12 for i in range(13)]], .025, 4, 'gold')
    m.ptube([(-.3, 0, .1), (-.2, 0, -.18), (0, 0, -.28), (.2, 0, -.18), (.3, 0, .1)], .025, 4, 'gold')
    m.ext(circ(10, .12, (0, -.38)), .06, 'gold', 'gold_dk', bev=.02)
    m.ext(circ(8, .07, (0, -.38)), .04, 'e_blue', y=-.04)
def p_arrows3(m):
    for k, dx in enumerate((-.12, 0, .12)): p_arrow_at(m, (dx - .15, 0, -.5), (dx + .15, 0, .5), fl='white', fl2='white', r=.018)
def p_platebody(m):
    m.hull([Vector((x, y, z)) for x in (-.3, .3) for y in (-.17, .17) for z in (-.44,)] + [Vector((x, y, z)) for x in (-.36, .36) for y in (-.2, .2) for z in (.2,)] +
           [Vector((x, y, .38)) for x in (-.18, .18) for y in (-.14, .14)], 'steel')
    for sx in (-1, 1):
        m.hull(ell((sx * .42, 0, .22), (.2, .2, .15), 8, 4), 'steel_dk')
        m.ptube([(sx * .46, 0, .14), (sx * .5, -.02, -.2)], [.1, .09], 6, 'steel', cap1='steel')
    m.box((0, -.2, -.1), (.03, .01, .3), 'steel_dk')
    m.box((0, 0, -.44), (.31, .19, .04), 'leather_dk')
def p_platelegs(m):
    m.box((0, 0, .42), (.3, .16, .08), 'steel_dk')
    for sx in (-1, 1):
        m.ptube([(sx * .15, 0, .38), (sx * .17, 0, -.02), (sx * .18, 0, -.46)], [.15, .12, .11], 7, 'steel', cap1='steel')
        m.sph((sx * .17, -.08, -.02), (.1, .06, .08), 'steel_dk', 6, 3)
def p_ring(m):
    m.ring2((0, 0, -.1), .38, .27, .12, 'gold', n=20, side='gold_dk')
    m.hull(ell((0, -.02, .36), (.14, .12, .14), 8, 4), 'red')
    m.box((0, 0, .24), (.1, .07, .05), 'gold')
def p_gloves(m):
    m.box((0, 0, 0), (.19, .07, .2), 'leather', .05)
    for i, x in enumerate((-.14, -.045, .045, .14)):
        h = (.2, .26, .24, .17)[i]; m.ptube([(x, 0, .18), (x * 1.1, -.01, .18 + h)], [.05, .045], 6, 'leather', cap1='leather')
    m.ptube([(-.18, -.02, -.02), (-.3, -.04, .12), (-.35, -.05, .22)], [.06, .055, .05], 6, 'leather', cap1='leather')
    m.cyl((0, .02, -.2), (0, .04, -.42), .22, 'leather_dk', n=8)

# ------------------------------------------------------------------ icon registry
ICONS = []
def I(name, group, fn, outs, el=12.0, yaw=0.0, style='sprite', colors=16, span=None, aspect=(1, 1), ctr=(0, 0, 0), light=None, raw=None):
    ICONS.append(dict(name=name, group=group, fn=fn, outs=outs, el=el, yaw=yaw, style=style, colors=colors, span=span, aspect=aspect, ctr=ctr, light=light, raw=raw))
def O(path, w, h=None): return {'file': path, 'w': w, 'h': h or w}

def crossed_swords(m):
    k = m.mark(); p_sword(m); m.tf(k, rotY(-45) @ T(0, 0, -.5))
    k = m.mark(); p_sword(m, guard='gold'); m.tf(k, T(0, .05, 0) @ rotY(45) @ T(0, 0, -.5))
def skills_bars(m):
    for k, (h, c) in enumerate(((.5, 'green'), (.9, 'red'), (.7, 'blue'))):
        m.hull(cbox((-.34 + k * .34, 0, h / 2 - .45), (.13, .12, h / 2), .02), lambda n, cc, c=c: c if n.y < .5 else c)
    m.box((0, 0, -.49), (.54, .16, .04), 'wood', .01)
def spec_sword(m):
    k = m.mark(); p_sword(m); m.tf(k, rotY(-45) @ T(0, 0, -.5))
    m.ext(star2(4, .14, .03, (.3, .3)), .02, 'e_white', y=-.2)

# -- tabs (28 px) + rail/plaque sizes
I('tab_combat', 'tabs', crossed_swords, [O('tabs/combat.png', 28), O('rail/combat.png', 18)], el=8)
I('tab_skills', 'tabs', skills_bars, [O('tabs/skills.png', 28)], el=18, yaw=-18)
I('tab_quests', 'tabs', lambda m: (p_scroll(m), m.tf(0, rotY(-10))), [O('tabs/quests.png', 28)], el=6, yaw=-10)
I('tab_inv', 'tabs', p_backpack, [O('tabs/inv.png', 28)], el=16, yaw=-24)
I('tab_equip', 'tabs', p_helm, [O('tabs/equip.png', 28)], el=16, yaw=-28)
I('tab_prayers', 'tabs', lambda m: p_star4(m), [O('tabs/prayers.png', 28), O('orb/prayer.png', 18)], el=10, yaw=-12)
I('tab_spells', 'tabs', p_book, [O('tabs/spells.png', 28)], el=10, yaw=-24)
I('tab_drops', 'tabs', p_skull, [O('tabs/drops.png', 28)], el=10, yaw=-14)
I('tab_clan', 'tabs', p_banner, [O('tabs/clan.png', 28)], el=6, yaw=-14)
I('tab_friends', 'tabs', lambda m: p_smiley(m, 'yellow', True), [O('tabs/friends.png', 28)], el=6, yaw=-10)
I('tab_ignore', 'tabs', lambda m: p_smiley(m, 'red', False), [O('tabs/ignore.png', 28)], el=6, yaw=-10)
I('tab_logout', 'tabs', p_door, [O('tabs/logout.png', 28), O('misc/door.png', 18)], el=6, yaw=-16)
I('tab_settings', 'tabs', lambda m: (p_spanner(m), m.tf(0, rotY(-45))), [O('tabs/settings.png', 28)], el=8, yaw=-10)
I('tab_emotes', 'tabs', lambda m: p_figure(m, 'cheer'), [O('tabs/emotes.png', 28)], el=6, yaw=-10)
I('tab_music', 'tabs', p_harp, [O('tabs/music.png', 28)], el=6, yaw=-14)
# -- rail + orbs + minimap
I('rail_coins', 'rail', p_coins, [O('rail/coins.png', 18)], el=38, yaw=20)
I('rail_music', 'rail', p_note, [O('rail/music.png', 20), O('misc/note.png', 18)], el=6, yaw=-12)
I('rail_muted', 'rail', lambda m: p_cross_x(m, 'red', 'red_dk', .44, .08), [O('rail/muted.png', 20)], el=4)
I('rail_layers', 'rail', p_layers, [O('rail/layers.png', 20)], el=36, yaw=-20)
I('rail_medal', 'rail', p_medal, [O('rail/medal.png', 20), O('misc/medal.png', 16)], el=6, yaw=-10)
I('medal_off', 'misc', lambda m: p_medal(m, False, 'stone', 'stone_dk'), [O('misc/medal_off.png', 16)], el=6, yaw=-10)
I('rail_look', 'rail', p_bust, [O('rail/look.png', 20)], el=8, yaw=-20)
I('orb_heart', 'orb', p_heart, [O('orb/heart.png', 18), O('misc/heart.png', 16)], el=8, yaw=-14)
I('orb_run', 'orb', p_boot, [O('orb/run.png', 18), O('misc/boot.png', 18)], el=12, yaw=-24)
I('orb_spec', 'orb', spec_sword, [O('orb/spec.png', 18)], el=8)
for col in ('red', 'blue', 'yellow', 'grey', 'teal', 'green'):
    I('orbfill_' + col, 'orb', lambda m, col=col: p_orb(m, 'orb_' + col), [O('orb/fill_%s.png' % col, 26)], el=0, style='flat', colors=10, light={'key': 1.35, 'amb': .12, 'fill': .05})
I('orb_socket', 'orb', p_socket, [O('orb/socket.png', 34)], el=0, colors=12)
I('compass', 'orb', p_compass, [O('orb/compass.png', 36)], el=0, colors=18)
I('globe', 'orb', p_globe, [O('orb/globe.png', 26), O('misc/globe.png', 18)], el=14, yaw=-10, colors=14)
I('minimap_ring', 'orb', p_ring_big, [O('orb/minimap_ring.png', 172)], el=0, colors=20, style='sprite')
I('close_x', 'misc', lambda m: p_cross_x(m, 'orange', 'red_dk'), [O('misc/close.png', 17)], el=4, colors=8)
I('misc_bell', 'misc', p_bell, [O('misc/bell.png', 18)], el=10, yaw=-10)
I('misc_roof', 'misc', lambda m: p_house(m, 1.3), [O('misc/roof.png', 18)], el=18, yaw=-30)
I('misc_chest', 'misc', p_chest, [O('misc/chest.png', 18)], el=20, yaw=-25)
def p_hint_arrow(m):
    m.ext([(-.2, .95), (.2, .95), (.2, .22), (.46, .22), (0, -.5), (-.46, .22), (-.2, .22)], .26, 'yellow', 'gold_dk', bev=.06)
I('hint_arrow', 'misc', p_hint_arrow, [O('misc/hint_arrow.png', 64, 80)], el=22, yaw=0, aspect=(4, 5), colors=10)
I('hint_arrow_up', 'misc', lambda m: (p_hint_arrow(m), m.tf(0, rotY(180))), [O('misc/hint_arrow_up.png', 34)], el=0, yaw=0, colors=8)
I('chathead', 'misc', p_bust, [O('misc/chathead.png', 64)], el=6, yaw=-24, colors=20)

# -- combat styles (36 px)
def comp(*parts):
    def f(m):
        for fn, mx in parts:
            k = m.mark(); fn(m); m.tf(k, mx)
    return f
SW = lambda m: p_sword(m); AX = lambda m: p_axe(m); PK = lambda m: p_pick(m); MC = lambda m: p_mace(m); ST = lambda m: p_staff(m)
BK = lambda m: p_shield_round(m, 'wood', 'iron', 'iron', .34)
def w_stab(fn):  return comp((fn, T(.05, 0, 0) @ rotY(-80) @ T(0, 0, -.5)), (lambda m: p_speed(m, -.95, -.45, (.1, -.04, -.18)), T(0, 0, .0)))
def w_lunge(fn): return comp((fn, rotY(-60) @ T(0, 0, -.5)), (lambda m: p_swoosh(m, (-.2, -.5), .8, math.radians(100), math.radians(40), .11), Matrix.Identity(4)))
def w_slash(fn): return comp((fn, rotY(-35) @ T(0, 0, -.5)), (lambda m: p_swoosh(m, (-.3, -.35), .9, math.radians(-5), math.radians(105), .13), Matrix.Identity(4)))
def w_smash(fn): return comp((fn, rotY(150) @ T(0, 0, -.5)), (lambda m: p_burst(m, (.25, -.62), .3), Matrix.Identity(4)))
def w_block(fn): return comp((fn, T(.18, .15, .0) @ rotY(-20) @ T(0, 0, -.5)), (BK, T(-.1, -.2, -.05)))
I('c_punch', 'combat', comp((lambda m: p_fist(m), Matrix.Identity(4)), (lambda m: p_speed(m, -1.05, -.5, (.12, -.03, -.18)), T(0, 0, 0))), [O('combat/punch.png', 36)], el=8, yaw=-12)
I('c_kick', 'combat', comp((lambda m: p_boot(m), rotY(40) @ T(0, 0, -.3)), (lambda m: p_speed(m, -1.0, -.45, (.12, -.04, -.2)), T(0, 0, -.1))), [O('combat/kick.png', 36)], el=6, yaw=-10)
I('c_shove', 'combat', lambda m: (p_palm(m), m.tf(0, rotY(-12))), [O('combat/shove.png', 36)], el=6, yaw=-12)
def arms_crossed(m):
    for a, y in ((40, 0), (-40, -.12)):
        k = m.mark(); m.ptube([(0, 0, -.55), (0, 0, .35)], [.1, .09], 7, 'skin', cap0='tunic'); m.box((0, 0, .45), (.1, .1, .11), 'skin', .04)
        m.cyl((0, 0, -.72), (0, 0, -.5), .13, 'tunic', n=7); m.tf(k, T(0, y, 0) @ rotY(a))
I('c_block_unarmed', 'combat', arms_crossed, [O('combat/block_unarmed.png', 36)], el=8)
for wn, fn in (('sword', SW), ('axe', AX), ('pick', PK), ('mace', MC)):
    I('c_%s_stab' % wn, 'combat', w_stab(fn), [O('combat/%s_stab.png' % wn, 36)], el=8)
    I('c_%s_lunge' % wn, 'combat', w_lunge(fn), [O('combat/%s_lunge.png' % wn, 36)], el=8)
    I('c_%s_slash' % wn, 'combat', w_slash(fn), [O('combat/%s_slash.png' % wn, 36)], el=8)
    I('c_%s_smash' % wn, 'combat', w_smash(fn), [O('combat/%s_smash.png' % wn, 36)], el=8)
    I('c_%s_block' % wn, 'combat', w_block(fn), [O('combat/%s_block.png' % wn, 36)], el=10, yaw=-8)
def bow_acc(m):
    k = m.mark(); p_bow(m, arrow=True); m.tf(k, rotY(-20) @ S(.9))
    m.ring2((.62, -.1, .5), .2, .0001, .04, 'white', n=14)
    for r, c in ((.2, 'red'), (.14, 'white'), (.08, 'red')): m.ext(circ(14, r, (.62, .5)), .02, c, y=-.12 - (.2 - r) * .3)
def bow_rapid(m):
    k = m.mark(); p_bow(m, arrow=True); m.tf(k, rotY(-20) @ S(.9))
    for dz in (.32, .6):
        p_arrow_at(m, (.05, -.1, dz), (.68, -.1, dz + .12))
def bow_long(m):
    k = m.mark(); p_bow(m, arrow=False); m.tf(k, T(-.3, 0, -.1) @ rotY(-20) @ S(.75))
    p_arrow_at(m, (-.1, -.1, .1), (.7, -.1, .5))
    p_speed(m, -.45, -.05, (.06, -.06), .03)
    for r, c in ((.1, 'red'), (.06, 'white')): m.ext(circ(12, r, (.86, .62)), .02, c, y=-.1 - (.1 - r))
I('c_bow_accurate', 'combat', bow_acc, [O('combat/bow_accurate.png', 36)], el=6)
I('c_bow_rapid', 'combat', bow_rapid, [O('combat/bow_rapid.png', 36)], el=6)
I('c_bow_longrange', 'combat', bow_long, [O('combat/bow_longrange.png', 36)], el=6)
I('c_staff_cast', 'combat', comp((lambda m: p_staff(m, 1.1), rotY(-35) @ T(0, 0, -.55)), (lambda m: (p_star4(m, .3, .08, 'e_blue', 'e_blue', .03, 0, (.62, .6), -.3), p_star4(m, .12, .035, 'e_white', 'e_white', .02, 0, (.28, .82), -.3), p_star4(m, .09, .03, 'e_white', 'e_white', .02, 0, (.86, .3), -.3)), Matrix.Identity(4))), [O('combat/staff_cast.png', 36)], el=8)
I('c_staff_focus', 'combat', w_block(ST), [O('combat/staff_focus.png', 36)], el=10, yaw=-8)
def retaliate(m):
    J = p_figure(m, 'guard', armour=True, helm=True)
    k = m.mark(); p_sword(m, L=.8, w=.06, gw=.14); m.tf(k, T(*J['haR']) @ rotY(-30) @ T(0, 0, -.1))
    k = m.mark(); p_shield_kite(m, 'cloth_red', 'steel', 'gold'); m.tf(k, T(J['haL'].x + .02, -.26, 1.0) @ S(.55))
I('c_retaliate', 'combat', retaliate, [O('combat/retaliate.png', 30, 40)], el=6, yaw=-16, aspect=(3, 4))

# -- skills (24 px)
I('s_attack', 'skills', lambda m: (p_sword(m), m.tf(0, rotY(-45))), [O('skills/attack.png', 24), O('skills18/attack.png', 18)], el=8)
I('s_strength', 'skills', p_arm_flex, [O('skills/strength.png', 24), O('skills18/strength.png', 18)], el=6, yaw=-10)
I('s_defence', 'skills', lambda m: p_shield_kite(m, 'blue', 'steel', 'gold', 'cross'), [O('skills/defence.png', 24), O('skills18/defence.png', 18)], el=6, yaw=-14)
I('s_hitpoints', 'skills', p_heart, [O('skills/hitpoints.png', 24), O('skills18/hitpoints.png', 18)], el=8, yaw=-14)
I('s_ranged', 'skills', lambda m: (p_bow(m, arrow=True), m.tf(0, rotY(-40))), [O('skills/ranged.png', 24), O('skills18/ranged.png', 18)], el=6)
I('s_magic', 'skills', p_wizhat, [O('skills/magic.png', 24), O('skills18/magic.png', 18)], el=14, yaw=-20)
I('s_prayer', 'skills', lambda m: p_star4(m), [O('skills/prayer.png', 24), O('skills18/prayer.png', 18)], el=10, yaw=-12)
I('s_woodcutting', 'skills', p_stump_axe, [O('skills/woodcutting.png', 24), O('skills18/woodcutting.png', 18)], el=22, yaw=-16)
I('s_mining', 'skills', lambda m: (p_pick(m), m.tf(0, rotY(-40))), [O('skills/mining.png', 24), O('skills18/mining.png', 18)], el=8)
I('s_fishing', 'skills', lambda m: (p_fish(m), m.tf(0, rotY(20))), [O('skills/fishing.png', 24), O('skills18/fishing.png', 18)], el=6, yaw=-10)
I('s_cooking', 'skills', p_pot, [O('skills/cooking.png', 24), O('skills18/cooking.png', 18)], el=24, yaw=-10)
I('s_firemaking', 'skills', p_logs_fire, [O('skills/firemaking.png', 24), O('skills18/firemaking.png', 18)], el=14, yaw=-10)
I('s_smithing', 'skills', p_anvil, [O('skills/smithing.png', 24), O('skills18/smithing.png', 18)], el=16, yaw=-22)
I('s_fletching', 'skills', p_arrow_feather, [O('skills/fletching.png', 24), O('skills18/fletching.png', 18)], el=6)
I('s_thieving', 'skills', p_mask, [O('skills/thieving.png', 24), O('skills18/thieving.png', 18)], el=8, yaw=-10)

# -- prayers (32 px)
def fist_plus(extra):
    def f(m):
        k = m.mark(); p_fist(m); m.tf(k, T(0, 0, .0))
        extra(m)
    return f
I('p_thick_skin', 'prayers', lambda m: p_shield_round(m, 'leather', 'leather_dk', 'bronze', .5, planks=False), [O('prayers/thick_skin.png', 30)], el=8, yaw=-10)
I('p_burst_str', 'prayers', fist_plus(lambda m: None), [O('prayers/burst_str.png', 30)], el=8, yaw=-12)
I('p_clarity', 'prayers', p_candle, [O('prayers/clarity.png', 30)], el=10, yaw=-10)
I('p_sharp_eye', 'prayers', lambda m: p_eye(m, 'green'), [O('prayers/sharp_eye.png', 30)], el=4)
I('p_mystic_will', 'prayers', p_crystal_orb, [O('prayers/mystic_will.png', 30)], el=10)
I('p_rock_skin', 'prayers', lambda m: p_shield_kite(m, 'stone', 'stone_dk', 'stone_lt'), [O('prayers/rock_skin.png', 30)], el=6, yaw=-12)
I('p_superhuman', 'prayers', fist_plus(lambda m: p_bolt_zig(m, (.46, .3), .7)), [O('prayers/superhuman.png', 30)], el=8, yaw=-12)
I('p_reflexes', 'prayers', lambda m: p_hourglass(m), [O('prayers/reflexes.png', 30)], el=10, yaw=-10)
I('p_hawk_eye', 'prayers', lambda m: (p_feather(m), m.tf(0, rotY(-30))), [O('prayers/hawk_eye.png', 30)], el=6)
I('p_mystic_lore', 'prayers', p_open_book, [O('prayers/mystic_lore.png', 30)], el=16)
I('p_steel_skin', 'prayers', lambda m: p_shield_kite(m, 'steel', 'steel_dk', 'gold', 'cross'), [O('prayers/steel_skin.png', 30)], el=6, yaw=-12)
I('p_ultimate_str', 'prayers', fist_plus(lambda m: p_flame(m, .55, (.3, .08), y=.25)), [O('prayers/ultimate_str.png', 30)], el=8, yaw=-12)
I('p_incredible_ref', 'prayers', lambda m: p_hourglass(m, 'gold', 'e_gold', True), [O('prayers/incredible_ref.png', 30)], el=10, yaw=-10)
I('p_protect_magic', 'prayers', lambda m: p_ward(m, 'blue', 'magic'), [O('prayers/protect_magic.png', 30)], el=4)
I('p_protect_range', 'prayers', lambda m: p_ward(m, 'green', 'range'), [O('prayers/protect_range.png', 30)], el=4)
I('p_protect_melee', 'prayers', lambda m: p_ward(m, 'red', 'melee'), [O('prayers/protect_melee.png', 30)], el=4)

# -- spells (24 px, fixed framing so strike < bolt < blast)
def el_wind(m, s):
    m.ptube([(math.cos(a) * r * s, 0, math.sin(a) * r * s) for a, r in [(TAU * 1.5 * i / 16, .42 * (1 - i / 19)) for i in range(17)]], [.07 * s * (1 - i / 20) for i in range(17)], 6, 'white')
def el_water(m, s): m.lathe([(.0, .5 * s), (.08 * s, .32 * s), (.2 * s, .06 * s), (.26 * s, -.14 * s), (.22 * s, -.3 * s), (.1 * s, -.4 * s), (0, -.42 * s)], 12, 'water'); m.sph((-.1 * s, -.2 * s, -.1 * s), .06 * s, 'water_lt', 5, 3)
def el_earth(m, s): p_rocks(m, s * 1.05, 'leather_lt', 8)
def el_fire(m, s): p_flame(m, s, (0, -.45 * s))
ELEM = {'wind': el_wind, 'water': el_water, 'earth': el_earth, 'fire': el_fire}
TRAIL = {'wind': 'white', 'water': 'water_lt', 'earth': 'wood_lt', 'fire': 'e_fire'}
def spell(elem, tier):
    def f(m):
        s = {1: .62, 2: .78, 3: .92}[tier]
        k = m.mark(); ELEM[elem](m, s); m.tf(k, T(.12 if tier > 1 else 0, 0, 0))
        if tier >= 2:
            p_speed(m, -.62, -.2, (.14, -.02, -.18) if tier == 3 else (.08, -.1), .05, TRAIL[elem], y=.3)
        if tier == 3:
            for a in (40, 140, 220, 320):
                x, z = math.cos(math.radians(a)) * .56, math.sin(math.radians(a)) * .56
                m.ext(star2(4, .1, .03, (x + .12, z)), .02, 'e_white' if elem != 'fire' else 'e_yellow', y=-.3)
    return f
SP_SPAN = 1.25
for elem, names in (('wind', ('wind_strike', 'wind_bolt', 'wind_blast')), ('water', ('water_strike', 'water_bolt', 'water_blast')),
                    ('earth', ('earth_strike', 'earth_bolt', 'earth_blast')), ('fire', ('fire_strike', 'fire_bolt', 'fire_blast'))):
    for tier, nm in enumerate(names, 1):
        I('sp_' + nm, 'spells', spell(elem, tier), [O('spells/%s.png' % nm, 24)], el=6, span=SP_SPAN)
def confuse(m):
    for k in range(3):
        a = TAU * k / 3 + .4; m.ext(star2(5, .17, .075, (math.cos(a) * .32, math.sin(a) * .2 + .1)), .04, 'e_yellow', 'gold_dk', y=-.2 - k * .02)
    m.ring2((0, .05, .08), (.44, .26), (.4, .22), .02, 'e_purple', n=20)
    m.sph((0, .1, -.3), (.2, .16, .2), 'purple', 8, 4)
def weaken(m):
    k = m.mark(); p_skull(m, False, 'green', 'green_dk'); m.tf(k, S(.9))
    m.ext([(.28, .1), (.44, .1), (.44, -.18), (.54, -.18), (.36, -.42), (.18, -.18), (.28, -.18)], .04, 'e_green', 'green_dk', y=-.35)
def tele(token, s=.75):
    def f(m):
        p_portal(m); k = m.mark(); token(m, s); m.tf(k, T(0, -.12, 0))
    return f
I('sp_confuse', 'spells', confuse, [O('spells/confuse.png', 24)], el=10)
I('sp_weaken', 'spells', weaken, [O('spells/weaken.png', 24)], el=8)
I('sp_home_tele', 'spells', tele(lambda m, s: p_house(m, s * 1.0)), [O('spells/home_tele.png', 24)], el=6)
I('sp_tele_quarry', 'spells', tele(lambda m, s: p_rocks(m, s * .9, 'stone', 11)), [O('spells/tele_quarry.png', 24)], el=6)
I('sp_tele_gloomfen', 'spells', tele(lambda m, s: p_deadtree(m, s)), [O('spells/tele_gloomfen.png', 24)], el=6)
I('sp_tele_brynholt', 'spells', tele(lambda m, s: p_snowflake(m, s * .95)), [O('spells/tele_brynholt.png', 24)], el=4)
I('sp_tele_dunes', 'spells', tele(lambda m, s: p_sun_dune(m, s * .9)), [O('spells/tele_dunes.png', 24)], el=4)
I('sp_low_alch', 'spells', comp((lambda m: p_coins(m, 3, 'bronze'), T(0, 0, -.5) @ S(.9)), (lambda m: p_flame(m, .6, (0, -.1), y=-.4, cols=('green_dk', 'e_green', 'e_white')), Matrix.Identity(4))), [O('spells/low_alch.png', 24)], el=16)
I('sp_high_alch', 'spells', comp((lambda m: p_coins(m, 4, 'gold'), T(0, 0, -.5) @ S(.9)), (lambda m: p_flame(m, .7, (0, -.1), y=-.4), Matrix.Identity(4))), [O('spells/high_alch.png', 24)], el=16)

# -- equipment slot ghosts (dark silhouettes, 30 px)
for nm, fn, el_, yaw_ in (('head', p_helm, 10, -20), ('cape', p_cape, 4, 0), ('amulet', p_amulet, 4, 0), ('ammo', p_arrows3, 4, 0),
                          ('weapon', lambda m: (p_sword(m), m.tf(0, rotY(-45))), 4, 0), ('body', p_platebody, 6, -10), ('shield', lambda m: p_shield_kite(m, 'steel', 'steel', 'steel'), 4, -8),
                          ('legs', p_platelegs, 4, -8), ('hands', p_gloves, 4, -8), ('feet', p_boot, 8, -20), ('ring', p_ring, 14, -10)):
    I('ghost_' + nm, 'ghosts', fn, [O('ghosts/%s.png' % nm, 28)], el=el_, yaw=yaw_, style='ghost')

# -- emotes (figures, 30 x 40)
def sym_tick(m):
    m.ext([(-.2, .02), (-.12, .1), (-.04, .02), (.18, .28), (.26, .2), (-.04, -.14)], .05, 'e_green', 'green_dk')
def sym_q(m):
    m.ptube([(math.cos(a) * .11, 0, .14 + math.sin(a) * .11) for a in [math.radians(170 - 250 * i / 10) for i in range(11)]] + [(0, 0, -.04)], .035, 5, 'e_yellow', cap0='e_yellow', cap1='e_yellow')
    m.sph((0, 0, -.14), .04, 'e_yellow', 5, 3)
def sym_bang(m):
    m.ext(rrect(-.04, -.04, .04, .3, .03, 1), .05, 'red', 'red_dk'); m.ext(circ(8, .045, (0, -.14)), .05, 'red', 'red_dk')
def sym_note(m):
    k = m.mark(); p_note(m); m.tf(k, S(.35))
def sym_x(m):
    k = m.mark(); p_cross_x(m, 'red', 'red_dk', .2, .045); m.tf(k, Matrix.Identity(4))
def sym_clap(m):
    for a in (-30, 0, 30):
        k = m.mark(); m.ext(rrect(-.018, .12, .018, .24, .01, 1), .03, 'white'); m.tf(k, rotY(a))
SYM = {'yes': sym_tick, 'no': sym_x, 'think': sym_q, 'angry': sym_bang, 'dance': sym_note, 'clap': sym_clap}
def emote(pose, nm):
    def f(m):
        J = p_figure(m, pose)
        if nm in SYM:
            k = m.mark(); SYM[nm](m); hx = J['head']
            m.tf(k, T(.36 if nm != 'clap' else 0, -.3, (hx.z + .22) if nm != 'clap' else J['haL'].z + .02))
    return f
for nm, pose, yaw_ in (('yes', 'yes', -20), ('no', 'no', -10), ('bow', 'bow', -62), ('angry', 'angry', -12), ('think', 'think', -18), ('wave', 'wave', -12),
                       ('cheer', 'cheer', -10), ('laugh', 'laugh', -14), ('dance', 'dance', -16), ('sit', 'sit', -38), ('shrug', 'shrug', -10), ('clap', 'clap', -26)):
    I('emote_' + nm, 'emotes', emote(pose, nm), [O('emotes/%s.png' % nm, 30, 40)], el=6, yaw=yaw_, aspect=(3, 4), span=2.24, ctr=(0, 0, 1.0))

# -- login screen: the gilded title and the standing iron torches (rendered small, shown at 2x for chunky pixels)
TITLE_FONT = next((f for f in ('C:/Windows/Fonts/georgiab.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf') if Path(f).exists()), None)
def p_title(m, text='CRAFTED REALM'):
    """gold 3D lettering: the title is set in the system's bold serif, converted to a mesh here, extruded and bevelled"""
    cu = bpy.data.curves.new('title', 'FONT'); cu.body = text; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'; cu.size = 1.0; cu.space_character = 1.04
    if TITLE_FONT: cu.font = bpy.data.fonts.load(TITLE_FONT)
    cu.extrude = .12; cu.bevel_depth = .055; cu.bevel_resolution = 2; cu.resolution_u = 3
    ob = bpy.data.objects.new('title_tmp', cu); scene.collection.objects.link(ob)
    ob.rotation_euler = (math.radians(90), 0, 0); bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    mw = ob.matrix_world.copy(); k = len(m.v)
    for v in me.vertices: m.v.append(mw @ v.co)
    for f in me.polygons:
        m.f.append(tuple(k + i for i in f.vertices))
        wn = mw.to_3x3() @ f.normal
        m.mi.append('e_gold' if wn.y < -.8 else 'yellow' if wn.z > .3 else 'gold_dk' if wn.z < -.3 else 'gold')
    bpy.data.objects.remove(ob, do_unlink=True); bpy.data.meshes.remove(me)
def p_torch_head(m):
    rim_top, rim_bot = .5, .2
    m.ptube([(math.cos(a) * rim_top, math.sin(a) * rim_top, .55) for a in [TAU * i / 20 for i in range(20)]], .035, 5, 'iron', closed=True)
    m.ptube([(math.cos(a) * rim_bot, math.sin(a) * rim_bot, .05) for a in [TAU * i / 14 for i in range(14)]], .035, 5, 'iron', closed=True)
    for k in range(10):
        a = TAU * k / 10; m.ptube([(math.cos(a) * rim_bot, math.sin(a) * rim_bot, .05), (math.cos(a + .25) * rim_top, math.sin(a + .25) * rim_top, .55)], .028, 4, 'iron_dk')
    m.hull(ell((0, 0, .5), (.46, .46, .12), 12, 4), 'e_fire_dk')
    for i, (x, y) in enumerate(((-.2, -.1), (.12, -.2), (.22, .1), (-.08, .18), (0, -.02))):
        m.hull(blob((x, y, .56), (.13, .12, .08), 30 + i, n=9, cuts=1), 'e_fire' if i % 2 else 'e_fire_core')
    for a in (0, TAU / 3, 2 * TAU / 3): m.sph((math.cos(a) * rim_top, math.sin(a) * rim_top - .02, .55), .045, 'steel_dk', 5, 3)
    m.lathe([(.16, .05), (.18, -.02), (.12, -.12), (.14, -.2), (.1, -.34), (.07, -.36)], 10, 'iron', cap0='iron_dk', cap1='iron_dk')
    m.lathe([(.11, -.14), (.13, -.18), (.13, -.22), (.11, -.26)], 10, 'steel_dk')
def p_torch_base(m):
    m.hull(ell((0, 0, .5), (.1, .1, .08), 10, 5), 'iron')
    m.cyl((0, 0, .5), (0, 0, .7), .055, 'iron', n=8)
    m.lathe([(.08, .38), (.1, .42), (.1, .46), (.08, .48)], 10, 'steel_dk')
    for k in range(3):
        a = TAU * k / 3 + math.pi / 2; d = Vector((math.cos(a), math.sin(a), 0))
        pts = [Vector((0, 0, .44)) + d * .02, d * .18 + Vector((0, 0, .3)), d * .42 + Vector((0, 0, .1)), d * .6 + Vector((0, 0, .03)),
               d * .7 + Vector((0, 0, .06)), d * .7 + Vector((0, 0, .14)), d * .62 + Vector((0, 0, .15)), d * .6 + Vector((0, 0, .09))]
        m.ptube(pts, [.05, .045, .04, .035, .03, .028, .025, .02], 5, 'iron', cap0='iron', cap1='iron')
I('login_title', 'login', p_title, [O('login/title.png', 400, 50)], el=8, yaw=0, aspect=(8, 1), colors=24, raw=1600, light={'key': 1.1, 'amb': .25, 'fill': .2})
I('login_torch_head', 'login', p_torch_head, [O('login/torch_head.png', 60, 48)], el=24, yaw=0, aspect=(5, 4), colors=20)
I('login_torch_base', 'login', p_torch_base, [O('login/torch_base.png', 80, 55)], el=20, yaw=10, aspect=(16, 11), colors=14)

# ------------------------------------------------------------------ scene + render
scene = bpy.context.scene
for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
    try: scene.render.engine = eng; break
    except TypeError: pass
try: scene.view_settings.view_transform = 'Standard'
except TypeError: pass
try: scene.view_settings.look = 'None'
except TypeError: pass
scene.view_settings.exposure = 0; scene.view_settings.gamma = 1
scene.world = bpy.data.worlds.new('IconWorld'); scene.world.use_nodes = True
bg = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs[0].default_value = (1, .97, .92, 1); bg.inputs[1].default_value = .34
try: scene.eevee.taa_render_samples = 16
except Exception: pass
try: scene.eevee.use_shadows = True
except Exception: pass
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGBA'; scene.render.image_settings.color_depth = '8'
scene.render.filter_size = 1.0; scene.render.resolution_percentage = 100
cam = bpy.data.objects.new('IconCam', bpy.data.cameras.new('IconCam')); scene.collection.objects.link(cam)
cam.data.type = 'ORTHO'; cam.data.clip_start = .1; cam.data.clip_end = 200; scene.camera = cam
key = bpy.data.objects.new('Key', bpy.data.lights.new('Key', 'SUN')); key.data.energy = .95; key.data.angle = math.radians(2)
fill = bpy.data.objects.new('Fill', bpy.data.lights.new('Fill', 'SUN')); fill.data.energy = .18; fill.data.angle = math.radians(10)
for L in (key, fill): scene.collection.objects.link(L); L.parent = cam
key.rotation_euler = Vector((.62, -.62, -.48)).normalized().to_track_quat('-Z', 'Y').to_euler()     # from upper-left, toward the viewer
fill.rotation_euler = Vector((-.7, .2, -.6)).normalized().to_track_quat('-Z', 'Y').to_euler()        # weak bounce from the lower right

def to_object(m, name):
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(v) for v in m.v], [], [list(f) for f in m.f])
    names = sorted(set(m.mi)); idx = {n: i for i, n in enumerate(names)}
    for n in names: me.materials.append(mat(n))
    for p, n in zip(me.polygons, m.mi): p.material_index = idx[n]; p.use_smooth = False
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free()
    me.validate(); me.update()
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob); return ob

manifest = []
for ic in ICONS:
    if ONLY and ic['name'] not in ONLY: continue
    if GROUP and ic['group'] != GROUP: continue
    m = M(); ic['fn'](m)
    ob = to_object(m, ic['name']); ob.rotation_euler = (0, 0, math.radians(ic['yaw'])); bpy.context.view_layer.update()
    lt = ic['light'] or {}; key.data.energy = lt.get('key', .95); bg.inputs[1].default_value = lt.get('amb', .34); fill.data.energy = lt.get('fill', .18)
    el = math.radians(ic['el']); cam.location = Vector((0, -math.cos(el), math.sin(el))) * 40
    cam.rotation_euler = (-cam.location).to_track_quat('-Z', 'Y').to_euler(); bpy.context.view_layer.update()
    aw, ah = ic['aspect']; big = max(o['w'] if o['w'] >= o['h'] else o['h'] for o in ic['outs'])
    LS = ic['raw'] or min(640, max(256, big * 10)); rw, rh = (LS, int(LS * ah / aw)) if aw >= ah else (int(LS * aw / ah), LS)
    inv = cam.matrix_world.inverted(); pts = [inv @ (ob.matrix_world @ v.co) for v in ob.data.vertices]
    x0, x1 = min(p.x for p in pts), max(p.x for p in pts); y0, y1 = min(p.y for p in pts), max(p.y for p in pts)
    if ic['span']:
        ys = ic['span']; xs = ys * rw / rh; cc = inv @ Vector(ic['ctr']); cx, cy = cc.x, cc.y
    else: xs, ys = (x1 - x0) * 1.04, (y1 - y0) * 1.04; cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    if rw >= rh: osc = max(xs, ys * rw / rh)
    else: osc = max(ys, xs * rh / rw)
    cam.data.ortho_scale = osc; cam.data.shift_x = cx / osc; cam.data.shift_y = cy / osc
    scene.render.resolution_x = rw; scene.render.resolution_y = rh
    out = RAW / (ic['name'] + '.png'); scene.render.filepath = str(out)
    bpy.ops.render.render(write_still=True)
    manifest.append({k: ic[k] for k in ('name', 'group', 'outs', 'style', 'colors')} | {'raw': out.name, 'tris': sum(len(f) - 2 for f in m.f)})
    bpy.data.objects.remove(ob, do_unlink=True)
    print(TAG, ic['name'], rw, 'x', rh, 'tris', manifest[-1]['tris'])

mp = RAW / 'manifest.json'
old = json.loads(mp.read_text()) if mp.exists() and (ONLY or GROUP) else []
names = {e['name'] for e in manifest}
merged = [e for e in old if e['name'] not in names] + manifest
order = {ic['name']: i for i, ic in enumerate(ICONS)}
merged.sort(key=lambda e: order.get(e['name'], 1e9))
mp.write_text(json.dumps(merged, indent=1))
print(TAG, 'DONE', len(manifest), 'renders ->', RAW)
