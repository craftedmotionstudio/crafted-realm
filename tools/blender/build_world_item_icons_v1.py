"""World item icons v1 (2026-09-28): a Blender render for every item the skill guides, the inventory, the bank, the shops
and the equipment screen showed without a picture. Owner rule: every icon is an image or a Blender render (no drawn
placeholder shapes, no emoji, no glyphs); style 2004 old-school RuneScape: cozy, chunky, not too polished.

Two sources, one camera:
  1. EQUIPMENT: the worn / held models of tools/blender/build_holm_equipment_v4.py, read from its saved scene
     (.studio-workspaces/holm-equipment-v4/candidates/equipment.blend, opened read-only through bpy.data.libraries), so an
     icon has the exact shape the player wears. Tier colours go through the runtime's own material rule
     (src/holm_equipment.js tinted(): M_METAL = the tier metal of src/world_gear.js METALS, M_METAL_DARK x0.72, M_METAL_MID
     x0.86, M_METAL_EDGE 30% toward white; M_CLOTH / M_CLOTH_DARK from the cloth colour; M_GEM from the gem colour).
     One model per kind (sword, hatchet, pickaxe, platebody, platelegs, staff, hat, shortbow, leather body, chaps, gloves,
     cape) + a tier colour covers every id. Where the runtime gives two ids the same look (the three shortbows, leather /
     riveted / fenhide), the icon adds a distinct wood / hide colour (and rivets) so the ids read apart.
  2. PROPS: items with no equipment model (food, ores, bars, logs, runes, robes, amulets, the crag maul...) modelled here
     as small chunky low-poly props in the build_holm_items_v1.py conventions (flat matte authored sRGB, lying as dropped;
     robes stand like the worn body armour icons).
Icons: exactly the build_holm_items_v1.py / equipment v4 pipeline: orthographic camera at 50 deg elevation, item yawed for
a diagonal read, auto-framed to its projected bounds with a 7% margin, 384 px EEVEE (Raw view transform, white world .42,
key sun 2.3 + fill .45), box-downsampled to 96 px, then a 1 px dark ink outline + faint 1 px drop shadow (numpy).
Runes: the 2004 idea of a rune (a stone with a raised sigil) on the same stone as the Gale and Wit runes; every sigil is
our own design (docs/rebuild/NAMING_BIBLE.md names), none copies any game's rune symbols.

Usage: "C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe" -b --python tools/blender/build_world_item_icons_v1.py
       [-- --only id1,id2]
Outputs: assets/icons/items/<id>.png (96x96 RGBA) + their entries in assets/icons/items/manifest.json;
         scratchpad/item_icons/future_runes/<rune>.png: the five planned runes (Writ, Grave, Star, Vein, Spirit) have no
         item yet, their sigils are rendered as proof only (register them when the items exist).
Deterministic: every random draw comes from a seeded random.Random. All geometry authored here or read from our own
equipment scene; nothing traced or extracted from any game.
"""
import bpy, bmesh, math, random, json, sys, re
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
EQUIP_BLEND = ROOT / '.studio-workspaces/holm-equipment-v4/candidates/equipment.blend'
ICONS = ROOT / 'assets/icons/items'
PROOF = ROOT / 'scratchpad/item_icons'
FUTURE = PROOF / 'future_runes'
TMP = PROOF / '_tmp'
for d in (ICONS, PROOF, FUTURE, TMP): d.mkdir(parents=True, exist_ok=True)
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ONLY = set(argv[argv.index('--only') + 1].split(',')) if '--only' in argv else None
bpy.ops.wm.read_factory_settings(use_empty=True)
TAG = '[WORLD_ITEM_ICONS_V1]'
tau = math.tau
SRC = 'tools/blender/build_world_item_icons_v1.py'

def read(f): return (ROOT / f).read_text(encoding='utf8', errors='replace')
def hex3(h): return ((h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255)
def c_dark(c): return tuple(x * .72 for x in c)
def c_mid(c): return tuple(x * .86 for x in c)
def c_edge(c): return tuple(x + (1 - x) * .3 for x in c)

# ---------------------------------------------------------------- the runtime's colours (read, not copied)
def parse_metals():
    t = read('src/world_gear.js'); s = t.index('const METALS'); e = t.index('};', s)
    return {k: int(v, 16) for k, v in re.findall(r"(\w+)\s*:\s*0x([0-9a-fA-F]{6})", t[s:e])}
METALS = parse_metals()                                   # tierMetal(def) in src/world_gear.js
HAT_CLOTH = {'wizard': 0x3a5aad, 'cloth': 0x7a86b8, 'glimmer': 0xb48ae0}   # src/holm_equipment.js forItem()
AMULET_GEM = {'amulet_of_might': 0xc84a4a, 'amulet_of_precision': 0x4a9ac8, 'amulet_of_warding': 0x4ac86a}
STAFF_GEM = {'ember_staff': 0xff8c4a, 'storm_staff': 0x7ad0ff}

def game_items():
    """every item id the game has at runtime: ITEMS literals + buildTieredGear's <tier>_<template> ids"""
    txt = read('src/game1_data.js'); s = txt.index('const ITEMS'); e = txt.index('\n};', s)
    items = {}
    for m_ in re.finditer(r"^\s*([a-z_0-9]+)\s*:\s*\{name:\s*(['\"])(.*?)(?<!\\)\2(.*)$", txt[s:e], re.M):
        body = m_.group(4)
        items[m_.group(1)] = dict(name=m_.group(3).replace("\\'", "'"), capeColor=(int(re.search(r"capeColor:0x([0-9a-f]+)", body).group(1), 16)
                                  if 'capeColor' in body else None))
    tiers = re.findall(r"\{key:'(\w+)',\s*label:'([^']+)'", txt)
    ts = txt.index('const GEAR_TEMPLATES'); te = txt.index('\n};', ts)
    tpls = dict(re.findall(r"^\s*(\w+)\s*:\s*\{name:'([^']*)'", txt[ts:te], re.M))
    ga = txt.index('const GEAR_ALIASES'); aliases = dict(re.findall(r"^\s*(\w+):\s*'(\w+)',", txt[ga:txt.index('};', ga)], re.M))
    for tk, tl in tiers:
        for k, nm in tpls.items():
            iid = '%s_%s' % (tk, k)
            if iid not in aliases and iid not in items: items[iid] = dict(name='%s %s' % (tl, nm), capeColor=None)
    return items
GAME = game_items()

# ================================================================ PROP materials (authored sRGB, drawn as-is)
PAL = {
    # the build_holm_items_v1.py palette (same values, so the new props sit in the same set)
    'wood': (.58, .40, .21), 'wood-dark': (.33, .21, .11), 'iron': (.40, .41, .45), 'tin': (.80, .82, .85),
    'bronze': (.78, .52, .25), 'gold': (.97, .79, .28), 'water': (.30, .58, .84), 'flour': (.96, .94, .88),
    'dough': (.92, .80, .56), 'crust': (.76, .46, .17), 'char': (.17, .14, .12), 'stone': (.63, .61, .58),
    'ore': (.90, .50, .19), 'rock': (.42, .38, .34), 'leather': (.56, .35, .17),
    # new
    'wood-lt': (.72, .54, .32), 'cork': (.80, .64, .42), 'brass': (.88, .68, .27), 'string': (.92, .88, .76),
    'cord': (.55, .40, .24), 'rivet': (.74, .75, .78),
    'cab': (.30, .56, .20), 'cab-lt': (.60, .80, .38), 'cab-rib': (.80, .90, .60),
    'cheese': (.98, .85, .38), 'cheese-cut': (.99, .92, .58), 'cheese-rind': (.86, .56, .16), 'cheese-hole': (.80, .62, .22),
    'meat': (.56, .27, .12), 'meat-hi': (.74, .42, .19), 'meat-dk': (.34, .16, .08),
    'trout-back': (.44, .47, .30), 'trout-band': (.86, .50, .50), 'trout-belly': (.92, .90, .80), 'trout-spot': (.20, .17, .13),
    'trout-fin': (.56, .52, .36),
    'oak-bark': (.40, .30, .21), 'oak-end': (.82, .66, .44), 'oak-ring': (.60, .42, .24),
    'willow-bark': (.46, .48, .33), 'willow-end': (.92, .88, .70), 'willow-ring': (.72, .68, .47),
    'clay': (.60, .53, .47), 'clay-lt': (.71, .64, .57), 'sigil-dk': (.30, .18, .10),
    'iron-ore': (.62, .29, .19), 'coal': (.15, .14, .14), 'coal-hi': (.33, .33, .36),
    'iron-bar': (.52, .54, .58), 'steel-bar': (.80, .83, .88), 'gold-bar': (.97, .78, .26),
    'silver': (.84, .86, .90), 'silver-dk': (.55, .57, .62), 'gem-blue': (.26, .48, .92),
    'wool': (.95, .92, .85), 'wool-dk': (.80, .75, .64),
    'terracotta': (.76, .44, .23), 'terracotta-dk': (.44, .23, .11), 'clay-bowl': (.84, .60, .36), 'glaze': (.36, .56, .62),
    'crag': (.47, .44, .41), 'crag-dk': (.31, .29, .28), 'crag-vein': (.93, .55, .18),
    # rune sigils (the Gale rune's is 'flour', the Wit rune's 'ore')
    'sig-tide': (.24, .52, .92), 'sig-stone': (.50, .33, .16), 'sig-ember': (.88, .20, .09), 'sig-flesh': (.80, .32, .34),
    'sig-wild': (.60, .24, .74), 'sig-verdant': (.26, .64, .20), 'sig-spark': (.99, .86, .22),
    'sig-writ': (.22, .26, .66), 'sig-grave': (.12, .11, .12), 'sig-star': (.30, .16, .56), 'sig-vein': (.72, .08, .10),
    'sig-spirit': (.40, .80, .78),
    # robes: body / trim / lining per tier (body = the tier colour of src/world_gear.js METALS)
    'robe-in': (.14, .11, .09),
    'gold-trim': (.95, .76, .28),
}
for tier in ('cloth', 'glimmer', 'starweave', 'monk'):
    c = hex3(METALS[tier]) if tier in METALS else hex3(0x8a6a44)
    PAL['robe-' + tier] = c
    PAL['robe-' + tier + '-dk'] = c_dark(c)
PAL['rope'] = (.86, .78, .58)
PMAT = {}
def pmat(name):
    if name in PMAT: return PMAT[name]
    rgb = PAL[name]; m = bpy.data.materials.new('wi-' + name); m.use_nodes = True
    bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value = (*rgb, 1); bs.inputs['Roughness'].default_value = 1.0
    bs.inputs['Metallic'].default_value = 0.0
    if 'Specular IOR Level' in bs.inputs: bs.inputs['Specular IOR Level'].default_value = 0.0
    m.diffuse_color = (*rgb, 1); PMAT[name] = m; return m

# ================================================================ mesh builder (build_holm_items_v1.py)
class M:
    def __init__(s): s.v = []; s.f = []; s.mi = []
    def add(s, vs, fs, mats):
        k = len(s.v); s.v += [Vector(v) for v in vs]
        for n, f in enumerate(fs):
            s.f.append(tuple(k + i for i in f)); s.mi.append(mats[n] if isinstance(mats, (list, tuple)) else mats)
    def loft(s, rings, side, cap0=None, cap1=None, inset0=None, inset1=None):
        n = len(rings[0]); k = len(s.v); vs = [p for r in rings for p in r]; fs = []; ms = []
        for j in range(len(rings) - 1):
            for i in range(n):
                fs.append((j*n+i, j*n+(i+1) % n, (j+1)*n+(i+1) % n, (j+1)*n+i))
                ms.append(side(j, i) if callable(side) else side)
        s.add(vs, fs, ms)
        if cap1: s.cap([k + (len(rings)-1)*n + i for i in range(n)], cap1, inset1)
        if cap0: s.cap([k + i for i in reversed(range(n))], cap0, inset0)
        return k
    def cap(s, ring, mat, inset=None):
        if not inset: s.f.append(tuple(ring)); s.mi.append(mat); return
        rim, sc, depth = inset
        pts = [s.v[i] for i in ring]; c = sum(pts, Vector()) / len(pts)
        nrm = Vector()
        for a, b in zip(pts, pts[1:] + pts[:1]): nrm += (a - c).cross(b - c)
        nrm.normalize(); k = len(s.v)
        s.v += [c + (p - c) * sc - nrm * depth for p in pts]
        n = len(ring)
        for i in range(n):
            s.f.append((ring[i], ring[(i+1) % n], k + (i+1) % n, k + i)); s.mi.append(rim)
        s.f.append(tuple(k + i for i in range(n))); s.mi.append(mat)
    def ptube(s, pts, r, n, side, up=None, closed=False, cap0=None, cap1=None, inset0=None, inset1=None,
              flat=1.0, phase=0.0, seed=None, jit=0.0):
        Pp = [Vector(p) for p in pts]; L = len(Pp); rr = r if isinstance(r, (list, tuple)) else [r] * L
        rng = random.Random(seed) if seed is not None else None; rings = []
        for j, p in enumerate(Pp):
            if closed: t = (Pp[(j+1) % L] - Pp[(j-1) % L])
            else: t = Pp[min(j+1, L-1)] - Pp[max(j-1, 0)]
            t.normalize()
            u = Vector(up) if up is not None else (Vector((0, 0, 1)) if abs(t.z) < .9 else Vector((1, 0, 0)))
            a = t.cross(u).normalized(); b = t.cross(a).normalized()
            ring = []
            for i in range(n):
                ang = tau * i / n + phase
                k = 1 + (rng.uniform(-jit, jit) if rng else 0)
                ring.append(p + (a * math.cos(ang) + b * math.sin(ang) * flat) * rr[j] * k)
            rings.append(ring)
        if closed: rings = rings + [rings[0]]
        return s.loft(rings, side, None if closed else cap0, None if closed else cap1, inset0, inset1)
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
    def poly(s, pts, mat, face=(0, 0, 1), both=False):
        pts = [Vector(p) for p in pts]; c = sum(pts, Vector()) / len(pts); nrm = Vector()
        for a, b in zip(pts, pts[1:] + pts[:1]): nrm += (a - c).cross(b - c)
        if nrm.dot(Vector(face)) < 0: pts = pts[::-1]
        s.add(pts, [tuple(range(len(pts)))], [mat])
        if both: s.add(pts[::-1], [tuple(range(len(pts)))], [mat])
    def pyramid(s, base, apex, mat):
        n = len(base); k = len(s.v); s.v += [Vector(p) for p in base] + [Vector(apex)]
        for i in range(n): s.f.append((k+i, k+(i+1) % n, k+n)); s.mi.append(mat)
    def lathe(s, prof, n, side, cap0=None, cap1=None, c=(0, 0), phase=0.0):
        rings = [[(c[0] + r * math.cos(tau * i / n + phase), c[1] + r * math.sin(tau * i / n + phase), z) for i in range(n)] for r, z in prof]
        return s.loft(rings, side, cap0, cap1)
    def slab(s, outline, z0, z1, top, side, bottom=None):
        """a flat 2D outline (x, y) extruded from z0 to z1 (non-convex tops are fine: Blender tessellates the n-gon)"""
        s.loft([[(x, y, z0) for x, y in outline], [(x, y, z1) for x, y in outline]], side, cap0=bottom or side, cap1=top)

def blob(c, s, seed, n=14, cuts=2, floor=None, flat_top=None, jit=(.84, 1.06), cut=(.58, .8)):
    rng = random.Random(seed); pts = []
    for i in range(n):
        z = 1 - 2 * (i + .5) / n; r = math.sqrt(max(0, 1 - z * z)); a = i * 2.39996 + rng.uniform(-.35, .35)
        pts.append(Vector((r * math.cos(a), r * math.sin(a), z)) * rng.uniform(*jit))
    planes = []
    for _ in range(cuts):
        u = rng.uniform(-.25, .9); th = rng.uniform(0, tau); rr = math.sqrt(1 - u * u)
        planes.append((Vector((rr * math.cos(th), rr * math.sin(th), u)), rng.uniform(*cut)))
    if flat_top: planes.append((Vector((rng.uniform(-.2, .2), rng.uniform(-.2, .2), 1)).normalized(), flat_top))
    for nrm, off in planes:
        for p in pts:
            d = p.dot(nrm)
            if d > off: p -= nrm * (d - off)
    out = [Vector((c[0] + p.x * s[0], c[1] + p.y * s[1], c[2] + p.z * s[2])) for p in pts]
    if floor is not None:
        for p in out: p.z = max(p.z, floor)
    return out
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
def cbox(c, h, ch):
    pts = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            for sz in (-1, 1):
                x, y, z = c[0] + sx * h[0], c[1] + sy * h[1], c[2] + sz * h[2]
                pts += [Vector((x - sx * ch, y, z)), Vector((x, y - sy * ch, z)), Vector((x, y, z - sz * ch))]
    return pts
def chip(m, loc, nrm, size, seed, mat, flat=.5, n=8):
    rng = random.Random(seed)
    pts = blob((0, 0, 0), (size, size * rng.uniform(.6, .85), size * flat), seed, n=n, cuts=1, cut=(.6, .8))
    q = Vector((0, 0, 1)).rotation_difference(nrm); rz = Matrix.Rotation(rng.uniform(0, tau), 3, 'Z')
    c = Vector(loc) + nrm * size * flat * .25
    m.hull([c + q @ (rz @ p) for p in pts], lambda nn, cc: mat)
def arc(cx, cy, z, rx, ry, a0, a1, seg):
    return [(cx + rx * math.cos(a0 + (a1 - a0) * i / seg), cy + ry * math.sin(a0 + (a1 - a0) * i / seg), z) for i in range(seg + 1)]
def sring(z, w, d, n, p=2.6, off=None, cx=0.0, cy=0.0):
    """superellipse ring (a rounded box section): x half-width w, y half-depth d; front = -Y at i = 3n/4"""
    out = []
    for i in range(n):
        a = tau * i / n; c, s = math.cos(a), math.sin(a); k = (abs(c) ** p + abs(s) ** p) ** (-1 / p)
        rr = 1 + (off(a, z) if off else 0.0)
        out.append((cx + w * c * k * rr, cy + d * s * k * rr, z))
    return out
def lerp_rows(rows, z):
    """(w, d) of a lofted body at height z (rows: [(z, w, d)] bottom -> top)"""
    for (z0, w0, d0), (z1, w1, d1) in zip(rows, rows[1:]):
        if z0 <= z <= z1:
            t = (z - z0) / max(1e-6, z1 - z0); return w0 + (w1 - w0) * t, d0 + (d1 - d0) * t
    return rows[-1][1], rows[-1][2]
def front_y(rows, x, z, p=2.6):
    w, d = lerp_rows(rows, z); u = min(.999, abs(x) / w)
    return -d * (1 - u ** p) ** (1 / p)

# ================================================================ PROPS
# -- food
def b_cabbage():
    m = M(); rng = random.Random(5)
    m.hull(ell((0, 0, .08), (.07, .068, .068), nu=10, nv=5, floor=.014), 'cab-lt')                 # the pale heart
    for ring, (n, rad, z, tilt, sx, sz) in enumerate(((5, .05, .075, .35, .07, .075), (6, .075, .058, .8, .085, .072))):
        for k in range(n):
            a = tau * k / n + ring * .52 + rng.uniform(-.14, .14)
            rad_d = Vector((math.cos(a), math.sin(a), 0)); tan = Vector((-math.sin(a), math.cos(a), 0))
            R = Matrix((tan, rad_d, (0, 0, 1))).transposed() @ Matrix.Rotation(-tilt, 3, 'X')
            c = Vector((0, 0, z)) + rad_d * rad
            pts = [c + R @ p for p in ell((0, 0, 0), (sx, .016, sz), nu=8, nv=4)]
            m.hull(pts, lambda nn, cc, rd=rad_d: 'cab' if nn.dot(rd) > -.1 else 'cab-lt')
            top = c + R @ Vector((0, .018, sz * .55)); bot = c + R @ Vector((0, .018, -sz * .6))
            m.ptube([bot, top], [.007, .004], 4, 'cab-rib', phase=math.pi / 4)                             # midrib
    return m
def b_cheese():
    m = M(); R, H = .17, .085; a0, a1 = -.46, .46
    arcp = [(R * math.cos(a0 + (a1 - a0) * i / 6), R * math.sin(a0 + (a1 - a0) * i / 6)) for i in range(7)]
    out = [(-.02, 0)] + arcp
    m.loft([[(x, y, 0) for x, y in out], [(x, y, H) for x, y in out]],
           lambda j, i: 'cheese-rind' if 1 <= i <= 6 else 'cheese-cut', cap0='cheese-cut', cap1='cheese')
    inner = [((R - .014) * math.cos(a0 + (a1 - a0) * i / 6), (R - .014) * math.sin(a0 + (a1 - a0) * i / 6)) for i in range(7)]
    m.poly([(x, y, H + .001) for x, y in arcp] + [(x, y, H + .001) for x, y in reversed(inner)], 'cheese-rind')   # rind on top
    def hole(cx, cy, cz, r, nrm):
        nrm = Vector(nrm).normalized(); a = nrm.cross(Vector((0, 0, 1)) if abs(nrm.z) < .9 else Vector((1, 0, 0))).normalized(); b = nrm.cross(a)
        m.poly([Vector((cx, cy, cz)) + nrm * .0015 + (a * math.cos(tau * i / 7) + b * math.sin(tau * i / 7)) * r for i in range(7)], 'cheese-hole', face=nrm)
    for x, y, r in ((.07, -.012, .014), (.11, .03, .01), (.045, .022, .008), (.13, -.035, .009)):
        hole(x, y, H, r, (0, 0, 1))
    apex = Vector((-.02, 0, 0))
    for a in (a0, a1):                                                                                  # holes on the two cut faces
        tip = Vector((R * math.cos(a), R * math.sin(a), 0)); e = (tip - apex).normalized()
        nrm = Vector((e.y, -e.x, 0))
        if nrm.dot(Vector((.1, 0, 0))) > 0: nrm = -nrm                                                  # outward, away from the middle
        for u, z, r in ((.32, .036, .012), (.64, .056, .009), (.8, .026, .007)):
            p = apex + (tip - apex) * u + Vector((0, 0, z)); hole(p.x, p.y, p.z, r, nrm)
    return m
def b_cooked_meat():
    m = M(); ore = M()
    pts = blob((-.03, 0, .065), (.13, .09, .068), 31, n=22, cuts=2, floor=0., jit=(.9, 1.05))
    m.hull(pts, lambda n, c: 'meat-hi' if n.z > .6 else 'meat')
    bvh = BVHTree.FromPolygons([tuple(v) for v in m.v], m.f); rng = random.Random(33)
    for k, (az, el) in enumerate([(.4, 1.1), (2.2, .9), (3.8, 1.2), (5.2, .8), (1.3, .6)]):
        d = Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el)))
        loc, nrm, _, _ = bvh.ray_cast(Vector((-.03, 0, .06)) + d * 2, -d)
        if loc is None: continue
        if nrm.dot(d) < 0: nrm = -nrm
        chip(ore, loc, nrm, rng.uniform(.03, .04), 40 + k, 'meat-dk', flat=.3, n=7)
    m.add(ore.v, [tuple(f) for f in ore.f], ore.mi)
    m.ptube([(.07, .004, .06), (.21, .012, .052)], [.02, .017], 6, 'flour', cap1='flour')            # the bone
    m.hull(ell((.228, .03, .052), (.026, .024, .024), nu=7, nv=3) + ell((.224, -.008, .05), (.024, .022, .022), nu=7, nv=3), 'flour')
    return m
def b_tankard():
    m = M(); n = 12
    def ring(r, z): return [(r * math.cos(tau * i / n + .26), r * math.sin(tau * i / n + .26), z) for i in range(n)]
    rb, rt, H, wall, floor = .08, .072, .17, .012, .022
    rout = lambda z: rb + (rt - rb) * z / H
    m.loft([ring(rb, 0), ring(rt, H), ring(rt - wall, H), ring(rb - wall, floor)],
           lambda j, i: ('wood' if i % 2 else 'wood-lt') if j == 0 else 'wood' if j == 1 else 'wood-dark', cap0='wood-dark', cap1='wood-dark')
    for z0, z1 in ((.022, .044), (.122, .144)):                                                      # iron hoops
        m.loft([ring(rout(z0) + .001, z0 - .002), ring(rout(z0) + .008, z0), ring(rout(z1) + .008, z1), ring(rout(z1) + .001, z1 + .002)], 'iron')
    pts = [(rout(.13) - .006 + .06 * math.sin(math.pi * k / 6), 0, .04 + .1 * (1 - math.cos(math.pi * k / 6)) / 2) for k in range(7)]
    m.ptube(pts, .014, 5, 'wood-dark', up=(0, 1, 0), cap0='wood-dark', cap1='wood-dark')           # handle on +X
    rng = random.Random(8)                                                                              # the ale's foam head
    heap = [ring(rt - wall + .002, H - .004), ring(rt + .006, H + .012)]
    heap.append([(x * .78 * (1 + rng.uniform(-.06, .06)), y * .78 * (1 + rng.uniform(-.06, .06)), H + .03 + rng.uniform(-.004, .004)) for x, y, _ in ring(rt, 0)])
    m.loft(heap, 'flour'); m.pyramid(heap[-1], (.004, -.004, H + .042), 'flour')
    m.hull(ell((-rt - .002, -.02, H - .012), (.012, .014, .022), nu=6, nv=3), 'flour')                 # a drip over the rim
    return m
def b_trout(back, band, belly, fin, spot, eye):
    """a brooktrout lying on its side (flank up): long body, a pale pink lateral band, dark spots, square tail"""
    m = M(); n = 10
    st = [(.25, .026, .02), (.225, .066, .04), (.18, .098, .054), (.12, .114, .06), (.05, .116, .06), (-.02, .106, .055),
          (-.09, .088, .046), (-.15, .062, .034), (-.195, .04, .024), (-.215, .034, .02)]
    rings = [[(x, D / 2 * math.cos(tau * i / n), T / 2 + T / 2 * math.sin(tau * i / n)) for i in range(n)] for x, D, T in st]
    def side(j, i):
        c = math.cos(tau * (i + .5) / n)
        return belly if c < -.42 else band if c < .3 else back
    m.loft(rings, side, cap1=back)
    m.pyramid(list(reversed(rings[0])), (.272, -.004, .012), back)                                   # snout
    m.hull([(-.205, s * .006, z) for s in (-1, 1) for z in (.006, .016)] + [(-.3, s * .064, z) for s in (-1, 1) for z in (.008, .012)] +
           [(-.29, 0, .01)], fin)                                                                      # square tail
    m.poly([(.07, .056, .03), (-.03, .052, .03), (-.01, .098, .03), (.05, .096, .03)], fin, both=True)   # dorsal fin
    m.poly([(-.12, .038, .026), (-.15, .03, .024), (-.145, .058, .024)], fin, both=True)                  # adipose fin
    m.poly([(.13, -.01, .062), (.115, .014, .063), (.075, -.03, .062)], fin)                           # pectoral fin
    rng = random.Random(21)
    for k in range(13):                                                                                  # spots over back + band
        x = rng.uniform(-.17, .17); th = rng.uniform(.25, 1.45)
        D, T = next(((D, T) for (xx, D, T) in st if xx <= x + .03), (.06, .04))
        y = D / 2 * math.cos(th) * .95; z = T / 2 + T / 2 * math.sin(th) + .002
        m.hull(ell((x, y, z), (.008, .008, .004), nu=6, nv=3), spot)
    m.hull(ell((.195, .014, .05), (.012, .012, .012), nu=6, nv=3), eye)
    return m
# -- wood, stone, metal
def b_logs(bark, end, ring):
    m = M(); r = .062
    cs = [(-.02, -.064, r), (.02, .064, r), (0, 0, r + .108)]
    for k, (dx, y, z) in enumerate(cs):
        m.ptube([(-.28 + dx, y, z), (.28 + dx, y, z)], [r, r * .96], 7, bark, seed=40 + k, jit=.06, phase=.2 * k,
                cap0=end, inset0=(ring, .6, .006), cap1=end, inset1=(ring, .6, .006))
    for bx in (-.15, .14):
        pts = []
        for dx, y, z in cs:
            for i in range(8):
                a = tau * i / 8
                for sx in (-.017, .017): pts.append((bx + sx, y + math.cos(a) * (r + .01), z + math.sin(a) * (r + .01)))
        m.hull(pts, 'leather')
    return m
def b_ore(base, fleck, seed, chips=7):
    m = M(); ore = M()
    pts = blob((0, 0, .08), (.14, .11, .085), seed, n=18, cuts=4, floor=0., jit=(.84, 1.06))
    m.hull(pts, lambda n, c: base)
    bvh = BVHTree.FromPolygons([tuple(v) for v in m.v], m.f); rng = random.Random(seed + 1)
    for k, (az, el) in enumerate([(.3, .9), (2.0, .7), (3.6, .8), (5.0, .6), (1.1, .25), (4.2, .2), (2.9, 1.35)][:chips]):
        d = Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el)))
        loc, nrm, _, _ = bvh.ray_cast(Vector((0, 0, .06)) + d * 2, -d)
        if loc is None: continue
        if nrm.dot(d) < 0: nrm = -nrm
        chip(ore, loc, nrm, rng.uniform(.042, .052), seed + 10 + k, fleck, flat=.45, n=7)
    m.add(ore.v, [tuple(f) for f in ore.f], ore.mi)
    return m
def b_coal():
    m = M()
    for k, (c, s) in enumerate((((-.05, -.02, .05), (.08, .07, .055)), ((.06, -.03, .045), (.07, .06, .048)),
                                ((.005, .055, .045), (.07, .06, .046)), ((0, .0, .1), (.065, .055, .045)))):
        m.hull(blob(c, s, 60 + k, n=12, cuts=3, floor=0.), lambda nn, cc: 'coal-hi' if nn.z > .72 else 'coal')
    return m
def b_clay():
    m = M()
    shade = lambda nn, cc: 'clay-lt' if nn.z > .55 else 'clay'
    m.hull(blob((0, 0, .062), (.135, .105, .066), 77, n=28, cuts=3, floor=0., jit=(.92, 1.03)), shade)
    m.hull(blob((.035, .012, .112), (.06, .048, .036), 78, n=14, cuts=1, jit=(.92, 1.03)), shade)
    return m
def b_bar(mat):
    m = M(); pts = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            pts += [(sx * .15, sy * .064, 0), (sx * .145, sy * .06, .012), (sx * .128, sy * .05, .066), (sx * .114, sy * .037, .078)]
    m.hull(pts, mat)
    return m
def arrowhead(m, b, d, mat, sc=1.0):
    b = Vector(b); d = Vector(d).normalized(); s = Vector((-d.y, d.x, 0)); z = Vector((0, 0, 1))
    tip = b + d * .095 * sc; bb = b - d * .018 * sc
    m.hull([tip, b + s * .036 * sc, b - s * .036 * sc, bb + s * .042 * sc, bb - s * .042 * sc, b + z * .011 * sc, b - z * .009 * sc,
            b + d * .02 * sc + z * .008 * sc], mat)
    m.ptube([b - d * .01 * sc, b - d * .05 * sc], .011 * sc, 6, mat, cap1='wood-dark')                 # the socket
def b_tips(mat):
    m = M()
    for x, y, rot in ((-.07, -.04, .35), (.05, -.05, -.5), (-.01, .035, 1.25), (-.1, .06, 2.5), (.09, .045, .85)):
        arrowhead(m, (x, y, .012), (math.cos(rot), math.sin(rot), 0), mat, 1.15)
    return m
def b_shafts():
    m = M(); r = .011
    for k, (yt, yh) in enumerate([(-.075, -.03), (-.045, -.018), (-.015, -.006), (.015, .006), (.045, .018), (.075, .03)]):
        z = r + (.012 if k in (2, 3) else 0)
        m.ptube([(-.29, yt, z), (.29, yh, z)], r, 5, 'wood-lt', phase=math.pi / 5, cap0='wood-dark', cap1='wood')
    pts = []
    for i in range(10):
        a = tau * i / 10
        for sx in (-.012, .012): pts.append((.02 + sx, .0 + math.cos(a) * .06, .02 + math.sin(a) * .03))
    m.hull(pts, 'string')                                                                               # binding
    return m
def b_trinket():
    """a small silver locket: domed face, engraved ring, a blue stone, a hanging loop (no chain)"""
    m = M(); n = 16; R = .072
    def ring(r, z): return [(r * math.cos(tau * i / n), r * math.sin(tau * i / n), z) for i in range(n)]
    m.loft([ring(R * .94, 0), ring(R, .012), ring(R * .96, .024), ring(R * .74, .036)], 'silver', cap0='silver-dk', cap1='silver')
    m.ptube(arc(0, 0, .03, R * .85, R * .85, 0, tau * 15 / 16, 15), .005, 4, 'silver-dk', closed=True, up=(0, 0, 1), phase=math.pi / 4)
    m.ptube(arc(0, 0, .038, .03, .03, 0, tau * 11 / 12, 11), .006, 4, 'silver', closed=True, up=(0, 0, 1), phase=math.pi / 4)
    m.hull(ell((0, 0, .042), (.024, .024, .014), nu=8, nv=3), 'gem-blue')
    for a in (math.pi / 4, 3 * math.pi / 4, 5 * math.pi / 4, 7 * math.pi / 4):
        m.hull(ell((.05 * math.cos(a), .05 * math.sin(a), .034), (.009, .009, .007), nu=6, nv=3), 'silver')
    m.ptube(arc(R + .018, 0, .016, .022, .014, math.pi * .9, -math.pi * .9, 10), .007, 5, 'silver', up=(0, 0, 1))   # loop
    return m
# -- tools and crafts
def b_rod(fly=False):
    m = M()
    m.ptube([(-.44, 0, .022), (.0, .0, .017), (.44, 0, .01)], [.017, .012, .006], 6, 'wood-lt' if fly else 'wood',
            cap0='wood-dark', cap1='wood-dark')
    m.ptube([(-.445, 0, .022), (-.28, 0, .02)], .024, 7, 'cork', cap0='wood-dark', cap1='cork')        # grip
    if fly:
        k0 = len(m.v)
        m.lathe([(.001, -.02), (.034, -.02), (.038, -.012), (.038, .012), (.034, .02), (.001, .02)], 10, 'brass', cap0='brass', cap1='iron')
        for i in range(k0, len(m.v)):                                                                   # the reel: axis along Y, beside the grip
            v = m.v[i]; m.v[i] = Vector((-.24 + v.x, -.03 + v.z, .04 + v.y))
        line = [(.44, 0, .012), (.4, -.09, .006), (.28, -.15, .005), (.16, -.14, .005)]
        m.ptube(line, .005, 4, 'string', up=(0, 0, 1))
        m.hull(ell((.15, -.138, .012), (.02, .014, .012), nu=6, nv=3), 'sig-ember')                    # the fly: red body
        m.hull(ell((.132, -.13, .014), (.016, .01, .008), nu=6, nv=3), 'gold')                          # yellow hackle
    else:
        line = [(.44, 0, .012), (.42, -.08, .006), (.34, -.13, .005), (.24, -.12, .005)]
        m.ptube(line, .005, 4, 'string', up=(0, 0, 1))
        m.ptube(arc(.22, -.105, .006, .018, .018, math.pi * .5, math.pi * 1.6, 6), .005, 4, 'iron', up=(0, 0, 1))   # hook
        m.hull(ell((.36, -.128, .012), (.014, .014, .014), nu=6, nv=3), 'sig-ember')                   # a float
    return m
def b_wool():
    m = M(); R = .075; c = Vector((0, 0, R + .004))
    m.hull(ell(c, (R, R, R * .96), nu=12, nv=7), 'wool')
    rng = random.Random(12)
    for k in range(7):                                                                                   # wound strands
        nrm = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-.2, 1))).normalized()
        a = nrm.cross(Vector((0, 0, 1)) if abs(nrm.z) < .9 else Vector((1, 0, 0))).normalized(); b = nrm.cross(a)
        pts = [c + (a * math.cos(tau * i / 16) + b * math.sin(tau * i / 16)) * (R + .004) for i in range(16)]
        m.ptube(pts, .0075, 4, 'wool-dk' if k % 2 else 'wool', closed=True, phase=math.pi / 4)
    m.ptube([c + Vector((R * .7, -R * .5, -R * .55)), (.12, -.075, .008), (.155, -.06, .007), (.185, -.03, .006), (.22, -.028, .006)], .007, 4, 'wool',
            up=(0, 0, 1), cap1='wool')                                                                    # the loose end
    return m
def b_pot():
    m = M(); n = 14
    prof = [(.06, 0), (.085, .025), (.098, .07), (.09, .115), (.068, .142), (.07, .152), (.08, .16), (.074, .168)]
    k = m.lathe(prof, n, lambda j, i: 'terracotta', cap0='terracotta-dk')
    m.lathe([(.074, .168), (.062, .16), (.058, .15), (.07, .09), (.06, .03)], n, 'terracotta-dk', cap1='terracotta-dk')   # inside
    m.lathe([(.0995, .06), (.1005, .07), (.0985, .08)], n, 'terracotta-dk')                             # incised band
    return m
def b_bowl():
    m = M(); n = 16
    m.lathe([(.05, 0), (.058, .006), (.1, .03), (.128, .062), (.132, .072), (.124, .074)], n,
            lambda j, i: 'glaze' if j == 3 else 'clay-bowl', cap0='terracotta-dk')
    m.lathe([(.124, .074), (.11, .064), (.075, .034), (.0, .026)], n, 'terracotta')
    return m
def b_bow_string():
    m = M(); pts = []
    for k in range(46):
        t = k / 45; a = t * tau * 2.4 + .3; r = .07 + .006 * math.sin(a * 3)
        pts.append((r * math.cos(a) * 1.2, r * math.sin(a), .006 + .006 * t))
    m.ptube(pts, .0065, 5, 'string', up=(0, 0, 1))
    m.ptube([pts[-1], (.14, .02, .008), (.19, -.03, .006)], .0065, 5, 'string', up=(0, 0, 1))
    m.ptube(arc(.2, -.04, .006, .018, .014, 0, tau * 11 / 12, 11), .0065, 5, 'string', closed=True, up=(0, 0, 1))   # end loop
    m.ptube([pts[0], (-.02, -.03, .006), (-.07, -.05, .006)], .0065, 5, 'string', up=(0, 0, 1))
    m.ptube(arc(-.085, -.058, .006, .018, .014, 0, tau * 11 / 12, 11), .0065, 5, 'string', closed=True, up=(0, 0, 1))
    return m
# -- runes: the Gale / Wit rune stone (build_holm_items_v1.py rune_stone) + our own raised sigils
def rune_stone():
    m = M(); n = 14
    def rr(sx, sy, z):
        out = []
        for i in range(n):
            a = tau * i / n + .1; c, s = math.cos(a), math.sin(a)
            k = (abs(c) ** 3 + abs(s) ** 3) ** (-1 / 3)
            out.append((sx * c * k, sy * s * k, z))
        return out
    m.loft([rr(.088, .074, 0), rr(.1, .086, .02), rr(.098, .084, .046), rr(.084, .07, .062)], 'stone', cap0='stone', cap1='stone')
    return m
SZ = .066
def s_line(m, pts, mat, r=.009, closed=False):
    m.ptube([(x, y, SZ) for x, y in pts], r, 4, mat, up=(0, 0, 1), flat=.8, phase=math.pi / 4, closed=closed,
            cap0=None if closed else mat, cap1=None if closed else mat)
def s_dot(m, x, y, mat, r=.012): m.hull(ell((x, y, .068), (r, r, .01), nu=7, nv=3), mat)
def s_flat(m, outline, mat): m.slab(outline, .06, .073, mat, mat)
def s_arc(cx, cy, rx, ry, a0, a1, seg): return [(cx + rx * math.cos(a0 + (a1 - a0) * i / seg), cy + ry * math.sin(a0 + (a1 - a0) * i / seg)) for i in range(seg + 1)]
def b_rune(kind):
    m = rune_stone()
    if kind == 'tide':          # Tide: three rolling waves, the middle one longest
        for dy, x0, x1 in ((.026, -.03, .034), (0, -.048, .048), (-.026, -.034, .03)):
            s_line(m, [(x0 + (x1 - x0) * i / 10, dy + .01 * math.sin(tau * i / 10 * 1.2)) for i in range(11)], 'sig-tide')
    elif kind == 'stone':       # Stone: a cairn of three stacked stones
        for (y, rx, ry) in ((-.028, .042, .014), (-.001, .031, .012), (.023, .019, .01)):
            m.hull(ell((0, y, .069), (rx, ry, .009), nu=9, nv=3), 'sig-stone')
    elif kind == 'ember':       # Ember: a hearth triangle holding a glowing coal
        s_line(m, [(0, .044), (.042, -.03), (-.042, -.03)], 'sig-ember', closed=True)
        s_dot(m, 0, -.006, 'sig-ember', .013)
    elif kind == 'flesh':       # Flesh: an upright seed (vesica) with a heart-line through it
        h = math.acos(.6)                                                   # two circles (r .05, centres +-.03) meet at (0, +-.04)
        s_line(m, s_arc(-.03, 0, .05, .05, h, -h, 6) + s_arc(.03, 0, .05, .05, math.pi + h, math.pi - h, 6)[1:-1], 'sig-flesh', closed=True)
        s_line(m, [(0, -.022), (0, .022)], 'sig-flesh')
    elif kind == 'wild':        # Wild: three hooked arms turning from a centre dot
        for k in range(3):
            a0 = tau * k / 3 + .4
            s_line(m, [(.012 * (1 + 2.6 * t) * math.cos(a0 + 1.6 * t), .012 * (1 + 2.6 * t) * math.sin(a0 + 1.6 * t)) for t in [i / 6 for i in range(7)]], 'sig-wild')
        s_dot(m, 0, 0, 'sig-wild', .011)
    elif kind == 'verdant':     # Verdant: a sapling, two branches rising from one stem, a bud on top
        s_line(m, [(0, -.046), (0, .034)], 'sig-verdant')
        for sx in (-1, 1): s_line(m, [(0, -.004), (sx * .02, .014), (sx * .034, .036)], 'sig-verdant')
        s_dot(m, 0, .04, 'sig-verdant', .01)
    elif kind == 'spark':       # Spark: a four-point glint with a small companion
        st = []
        for i in range(8):
            a = tau * i / 8 + math.pi / 2; r = .046 if i % 2 == 0 else .011
            st.append((-.006 + r * math.cos(a), -.004 + r * math.sin(a)))
        s_flat(m, st, 'sig-spark'); s_dot(m, .032, .03, 'sig-spark', .009)
    # the five planned runes (proof only until their items exist)
    elif kind == 'writ':        # Writ: a sealed writ, two lines of script
        s_line(m, [(-.03, -.04), (.03, -.04), (.03, .04), (-.03, .04)], 'sig-writ', closed=True)
        for y, x1 in ((.014, .014), (-.008, .006)): s_line(m, [(-.014, y), (x1, y)], 'sig-writ', r=.007)
        s_dot(m, 0, -.026, 'sig-writ', .01)
    elif kind == 'grave':       # Grave: a headstone arch over the ground line
        s_line(m, [(-.026, -.022)] + s_arc(0, .012, .026, .03, math.pi, 0, 6) + [(.026, -.022)], 'sig-grave')
        s_line(m, [(-.044, -.036), (.044, -.036)], 'sig-grave')
    elif kind == 'star':        # Star: an eight-ray star, long and short rays
        for i in range(8):
            a = tau * i / 8; r = .046 if i % 2 == 0 else .03
            s_line(m, [(.012 * math.cos(a), .012 * math.sin(a)), (r * math.cos(a), r * math.sin(a))], 'sig-star', r=.0075)
        s_dot(m, 0, 0, 'sig-star', .01)
    elif kind == 'vein':        # Vein: a winding vein ending in a drop
        s_line(m, [(.012 * math.sin(i * 1.6), .046 - .06 * i / 6) for i in range(7)], 'sig-vein')
        m.hull(ell((0, -.03, .068), (.016, .016, .01), nu=8, nv=3) + [Vector((0, -.008, .068))], 'sig-vein')
    elif kind == 'spirit':      # Spirit: a ring within a ring around a spark
        s_line(m, s_arc(0, 0, .044, .044, 0, tau, 16)[:-1], 'sig-spirit', r=.0075, closed=True)
        s_line(m, s_arc(0, 0, .022, .022, 0, tau, 10)[:-1], 'sig-spirit', r=.0075, closed=True)
        s_dot(m, 0, 0, 'sig-spirit', .008)
    return m
# -- jewellery (lying flat, chain loop above the pendant)
def chain_loop(m, mat, beads=True, r=.007):
    pts = [(0, -.07, .008)]
    for i in range(21):
        a = math.radians(-60 + 300 * i / 20)
        pts.append((.078 * math.cos(a), .035 + .098 * math.sin(a), .008))
    pts.append((0, -.07, .008))
    m.ptube(pts, r, 5, mat, up=(0, 0, 1), cap0=mat, cap1=mat)
    if beads:
        for p in pts[1:-1:2]: m.hull(ell(p, (.011, .011, .009), nu=6, nv=3), mat)
def b_amulet(gem):
    m = M(); chain_loop(m, 'brass')
    m.hull(cbox((0, -.078, .012), (.012, .012, .008), .004), 'brass')                                  # bail
    c = (0, -.118)
    m.lathe([(.046, 0), (.05, .01), (.046, .02), (.038, .024)], 12, 'brass', cap0='brass', cap1='brass', c=c)
    m.ptube(arc(c[0], c[1], .024, .037, .037, 0, tau * 11 / 12, 11), .006, 4, 'brass', closed=True, up=(0, 0, 1), phase=math.pi / 4)
    m.hull(ell((c[0], c[1], .026), (.031, .031, .018), nu=10, nv=4), gem)
    return m
def b_holy_symbol():
    m = M(); chain_loop(m, 'cord', beads=False, r=.006)
    c = (0, -.13); st = []
    for i in range(16):
        a = tau * i / 16 + math.pi / 2; r = .062 if i % 2 == 0 else .038
        st.append((c[0] + r * math.cos(a), c[1] + r * math.sin(a)))
    m.slab(st, 0, .016, 'silver', 'silver-dk')                                                           # the dawn star, eight rays
    m.hull(ell((c[0], c[1], .016), (.028, .028, .014), nu=10, nv=3, floor=.014), 'silver')             # raised sun boss
    m.ptube(arc(c[0], c[1], .02, .032, .032, 0, tau * 13 / 14, 13), .004, 4, 'silver-dk', closed=True, up=(0, 0, 1), phase=math.pi / 4)
    m.ptube(arc(0, -.069, .008, .012, .01, 0, tau * 9 / 10, 9), .006, 4, 'silver', closed=True, up=(1, 0, 0))   # ring
    return m
# -- weapons with no equipment model
def b_crag_maul():
    """Korthul's arm, quarried: a craggy rock head lashed onto a heavy dark haft, ember-bright fissures"""
    m = M(); veins = M()
    m.ptube([(-.36, 0, .038), (.2, 0, .05)], [.036, .042], 7, 'wood-dark', cap0='char', seed=3, jit=.04)
    m.ptube([(-.365, 0, .038), (-.22, 0, .041)], .045, 7, 'leather', cap0='char', cap1='leather')      # grip
    head = blob((.31, 0, .145), (.2, .17, .145), 66, n=24, cuts=4, floor=0., jit=(.86, 1.06))
    m.hull(head, lambda n, c: 'crag' if n.z > .2 else 'crag-dk')
    bvh = BVHTree.FromPolygons([tuple(v) for v in m.v], m.f); rng = random.Random(67)
    for k, (az, el) in enumerate([(.5, .9), (2.3, .7), (3.9, .9), (5.3, .5), (1.4, 1.3)]):
        d = Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el)))
        loc, nrm, _, _ = bvh.ray_cast(Vector((.3, 0, .12)) + d * 2, -d)
        if loc is None: continue
        if nrm.dot(d) < 0: nrm = -nrm
        chip(veins, loc, nrm, rng.uniform(.03, .04), 70 + k, 'crag-vein', flat=.22, n=7)
    m.add(veins.v, [tuple(f) for f in veins.f], veins.mi)
    for bx in (.1, .14):                                                                                 # lashing where haft meets head
        m.ptube([(bx + .008 * math.sin(tau * i / 8), .05 * math.cos(tau * i / 8), .05 + .05 * math.sin(tau * i / 8)) for i in range(8)],
                .011, 4, 'leather', closed=True)
    return m
# -- robes: standing like the worn body armour icons (front -Y), cloth in the tier colour (src/world_gear.js METALS)
ROBE_TOP = [(0, .245, .16), (.035, .24, .158), (.2, .185, .128), (.26, .18, .125), (.40, .205, .13), (.50, .215, .12),
            (.555, .15, .1), (.585, .095, .075)]
def b_robe_top(tier):
    body, dk, n = 'robe-' + tier, 'robe-' + tier + '-dk', 16
    trim = 'gold-trim' if tier in ('glimmer', 'starweave') else dk
    m = M(); rows = ROBE_TOP
    m.loft([sring(z, w, d, n) for z, w, d in rows], lambda j, i: trim if j in (0, len(rows) - 2) else body, cap0='robe-in', cap1='robe-in')
    for sx in (-1, 1):                                                                                   # bell sleeves
        pts = [(sx * .19, 0, .5), (sx * .25, -.004, .42), (sx * .3, -.01, .28), (sx * .33, -.014, .15), (sx * .34, -.014, .105)]
        m.ptube(pts, [.07, .075, .086, .1, .102], 9, lambda j, i: trim if j == 3 else body, cap1='robe-in')
    v = [(x, z) for x, z in ((-.07, .575), (-.035, .51), (0, .445))]; v = v + [(-x, z) for x, z in v[::-1][1:]]   # V collar
    m.ptube([(x, front_y(rows, x, z) - .006, z) for x, z in v], .013, 5, trim, up=(0, 1, 0), flat=.55, cap0=trim, cap1=trim)
    if tier == 'monk':                                                                                   # rope belt + cowl
        m.loft([sring(.225, .192, .134, n), sring(.235, .195, .137, n), sring(.255, .192, .134, n)], 'rope')
        for sx in (-1, 1):
            m.ptube([(sx * .03, front_y(rows, .03, .23) - .01, .23), (sx * .045, front_y(rows, .04, .16) - .012, .15),
                     (sx * .05, front_y(rows, .05, .08) - .012, .07)], .011, 5, 'rope', cap1='rope')
        m.ptube([(.13 * math.cos(tau * i / 14), .092 * math.sin(tau * i / 14), .565) for i in range(14)], .034, 6, dk, closed=True)
    else:                                                                                                # sash
        m.loft([sring(.205, .19, .131, n), sring(.212, .193, .134, n), sring(.258, .189, .132, n), sring(.264, .185, .129, n)], trim)
    if tier == 'starweave':                                                                              # a scatter of gold stars
        for x, z in ((-.11, .38), (.1, .33), (-.06, .12), (.12, .1), (-.14, .06), (.05, .4)):
            y = front_y(rows, x, z) - .004
            m.hull([Vector((x + .016 * math.cos(tau * i / 8) * (1 if i % 2 == 0 else .4), y, z + .016 * math.sin(tau * i / 8) * (1 if i % 2 == 0 else .4))) for i in range(8)]
                   + [Vector((x, y - .006, z))], 'gold-trim')
    return m
ROBE_SKIRT = [(0, .3, .2), (.04, .292, .196), (.3, .222, .152), (.5, .175, .122), (.54, .172, .12), (.6, .168, .117)]
def b_robe_skirt(tier):
    body, dk, n = 'robe-' + tier, 'robe-' + tier + '-dk', 28
    trim = 'gold-trim' if tier in ('glimmer', 'starweave') else dk
    m = M(); rows = ROBE_SKIRT
    fold = lambda a, z: .085 * math.sin(7 * a) * max(0.0, 1 - z / .54) ** .8
    m.loft([sring(z, w, d, n, off=fold) for z, w, d in rows], lambda j, i: trim if j in (0, len(rows) - 2) else body,
           cap0='robe-in', cap1='robe-in')
    if tier == 'monk':
        m.loft([sring(.55, .18, .126, n), sring(.565, .183, .129, n), sring(.585, .18, .126, n)], 'rope')
        for sx in (-1, 1):
            m.ptube([(sx * .03, front_y(rows, .03, .56) - .01, .56), (sx * .05, front_y(rows, .05, .45) - .014, .44),
                     (sx * .06, front_y(rows, .06, .36) - .018, .35)], .011, 5, 'rope', cap1='rope')
    return m

# -- capes and vambraces (the worn models do not read at icon size: see the icon list)
def sheet(m, rows, side):
    """quads between consecutive open rows (lists of points of one length), no wrap"""
    n = len(rows[0]); k = len(m.v); m.v += [Vector(p) for r in rows for p in r]
    for j in range(len(rows) - 1):
        for i in range(n - 1):
            m.f.append((k + j*n + i, k + j*n + i + 1, k + (j+1)*n + i + 1, k + (j+1)*n + i)); m.mi.append(side(j, i) if callable(side) else side)
    return k
CAPE_H, CAPE_N, CAPE_R = .9, 14, 9
def cape_y(x, z, inner=False):
    t = 1 - z / CAPE_H; w = .13 + .21 * t; c = .1 - .05 * t; s_ = max(-1.0, min(1.0, x / w))
    return -c * (1 - s_ * s_) - .026 * t * math.sin(s_ * math.pi * 3.5) + (.014 if inner else 0.0)
def cape_row(z, inner=False):
    w = .13 + .21 * (1 - z / CAPE_H)
    return [(w * (-1 + 2 * i / CAPE_N), cape_y(w * (-1 + 2 * i / CAPE_N), z, inner), z) for i in range(CAPE_N + 1)]
def b_cape(cloth, sigil=False):
    """a cape standing as worn, seen from the back (the outer cloth toward -Y): narrow at the rolled collar, flaring to a
    folded hem, the dark lining at the edges, brass clasps. The Wardens' sigil carries a dark tower device."""
    m = M(); dk = cloth + '-dk'; N, R = CAPE_N, CAPE_R
    zs = [CAPE_H * j / R for j in range(R + 1)]
    outer = [cape_row(z) for z in zs]; inner = [cape_row(z, True) for z in zs]
    sheet(m, outer, cloth)                                                        # outer cloth, faces toward -Y
    sheet(m, inner[::-1], dk)                                                     # lining, faces toward +Y
    sheet(m, [inner[0], outer[0]], dk)                                            # hem edge
    sheet(m, [[outer[j][0] for j in range(R + 1)], [inner[j][0] for j in range(R + 1)]], dk)     # side edges
    sheet(m, [[inner[j][N] for j in range(R + 1)], [outer[j][N] for j in range(R + 1)]], dk)
    top = [(x, y + .006, z + .012) for x, y, z in outer[-1]]
    m.ptube(top, .032, 7, dk, cap0=dk, cap1=dk)                                   # rolled collar
    for p in (top[0], top[-1]): m.hull(ell((p[0], p[1] - .01, p[2]), (.028, .02, .028), nu=7, nv=3), 'brass')
    if sigil:                                                                     # the Wardens' device: a small dark tower
        tw = [(-.05, .3), (.05, .3), (.05, .5), (.065, .5), (.065, .56), (.035, .56), (.035, .53), (.015, .53), (.015, .56),
              (-.015, .56), (-.015, .53), (-.035, .53), (-.035, .56), (-.065, .56), (-.065, .5), (-.05, .5)]
        tw = [(x * 1.5, .43 + (z - .43) * 1.5) for x, z in tw]
        m.poly([(x, cape_y(x, z) - .016, z) for x, z in tw], 'sigil-dk', face=(0, -1, 0))
    return m
def b_vambraces():
    """two hide bracers lying side by side: tapered, slightly flattened tubes (dark inside), two straps with brass buckles"""
    m = M()
    for k, y in enumerate((-.06, .06)):
        x0 = -.02 * k
        pts = [(x0 - .15, y, .052), (x0 - .05, y, .048), (x0 + .05, y, .043), (x0 + .14, y, .04)]
        m.ptube(pts, [.056, .052, .046, .043], 9, 'fen', flat=.85, cap0='fen-dk', inset0=('fen', .8, .03),
                cap1='fen-dk', inset1=('fen', .8, .03))
        for bx, r in ((x0 - .08, .06), (x0 + .06, .05)):
            m.ptube([(bx, y + r * math.cos(tau * i / 10), .05 + r * .9 * math.sin(tau * i / 10)) for i in range(10)], .011, 4,
                    'fen-dk', closed=True)
            m.hull(cbox((bx, y - .014, .05 + r * .9), (.015, .013, .006), .003), 'brass')
    return m

# ================================================================ the equipment scene (read-only)
EQ = {}
def load_equipment():
    if not EQUIP_BLEND.exists(): raise SystemExit('%s missing: build_holm_equipment_v4.py writes it' % EQUIP_BLEND)
    with bpy.data.libraries.load(str(EQUIP_BLEND), link=False) as (src, dst):
        dst.objects = [n for n in src.objects if n.startswith('eq_')]
    for o in bpy.data.objects:
        k = o.get('eq_kind')
        if k is None or o.get('body', 'A') != 'A': continue
        meshes = [c for c in o.children if c.type == 'MESH'] if o.type == 'EMPTY' else [o]
        EQ[k] = dict(root=o, meshes=meshes, frame=o.get('frame'), lay=list(o.get('lay', [0, 0, 0, 1])))
    print(TAG, 'equipment kinds', sorted(EQ))
C_G2B = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))
def lay_b(lay):
    x, y, z, w = lay
    return C_G2B @ Quaternion((w, x, y, z)).to_matrix() @ C_G2B.inverted()
MT, MD, ME, MM, CL, CK, GM = 'M_METAL', 'M_METAL_DARK', 'M_METAL_EDGE', 'M_METAL_MID', 'M_CLOTH', 'M_CLOTH_DARK', 'M_GEM'
TINT = {}
def tinted(name, t):
    base = bpy.data.materials[name]; rgb = None
    if name in (MT, MD, ME, MM) and t.get('metal') is not None:
        c = hex3(t['metal']); rgb = {MT: c, MD: c_dark(c), ME: c_edge(c), MM: c_mid(c)}[name]
    elif name in (CL, CK) and t.get('cloth') is not None:
        c = hex3(t['cloth']); rgb = c if name == CL else c_dark(c)
    elif name == GM and t.get('gem') is not None: rgb = hex3(t['gem'])
    if name in t.get('over', {}): rgb = t['over'][name]
    if rgb is None: return base
    key = (name, tuple(round(v, 5) for v in rgb))
    if key not in TINT:
        m = base.copy(); m.name = '%s_%02x%02x%02x' % ((name,) + tuple(int(round(v * 255)) for v in rgb))
        bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); bs.inputs['Base Color'].default_value = (*rgb, 1)
        TINT[key] = m
    return TINT[key]

# ================================================================ scene, camera, light (build_holm_items_v1.py)
scene = bpy.context.scene
for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
    try: scene.render.engine = eng; break
    except TypeError: pass
vts = [i.identifier for i in scene.view_settings.bl_rna.properties['view_transform'].enum_items]
scene.view_settings.view_transform = 'Raw' if 'Raw' in vts else 'Standard'
scene.view_settings.look = 'None'
scene.world = bpy.data.worlds.new('IconWorld'); scene.world.use_nodes = True
bg = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
bg.inputs[0].default_value = (1, 1, 1, 1); bg.inputs[1].default_value = .42
key = bpy.data.objects.new('IconKey', bpy.data.lights.new('IconKey', 'SUN')); key.data.energy = 2.3; key.data.angle = math.radians(3)
key.rotation_euler = (math.radians(38), 0, math.radians(-40)); scene.collection.objects.link(key)
fill = bpy.data.objects.new('IconFill', bpy.data.lights.new('IconFill', 'SUN')); fill.data.energy = .45
fill.rotation_euler = (math.radians(70), 0, math.radians(140)); scene.collection.objects.link(fill)
try: scene.eevee.taa_render_samples = 16
except Exception: pass
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGBA'
scene.render.filter_size = 1.0; scene.render.resolution_percentage = 100
ICON, SS, EL, MARGIN = 96, 4, math.radians(50), .07
cam = bpy.data.objects.new('IconCam', bpy.data.cameras.new('IconCam')); scene.collection.objects.link(cam)
cam.data.type = 'ORTHO'; cam.data.clip_end = 200; scene.camera = cam
cam.location = Vector((0, -math.cos(EL), math.sin(EL))) * 20
cam.rotation_euler = (-cam.location).to_track_quat('-Z', 'Y').to_euler()

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
    """RS-style 1px dark ink outline around the silhouette (+ faint 1px drop shadow down-right)"""
    a = arr[..., 3]
    dil = np.max([shift(a, dy, dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1)], axis=0)
    ol = np.zeros_like(arr); ol[..., :3] = INK; ol[..., 3] = np.clip(dil, 0, 1) * .9
    sh = np.zeros_like(arr); sh[..., :3] = INK; sh[..., 3] = shift(dil, -1, 1) * .35
    return over(arr, over(ol, sh))

COLL = bpy.data.collections.new('icon'); scene.collection.children.link(COLL)
def clear_coll():
    for o in list(COLL.objects): bpy.data.objects.remove(o, do_unlink=True)
def render(objs, out_path):
    bpy.context.view_layer.update()
    inv = cam.matrix_world.inverted()
    pts = []
    for o in objs:
        if o.type != 'MESH': continue
        mw = o.matrix_world
        pts += [inv @ (mw @ v.co) for v in o.data.vertices]
    x0, x1 = min(p.x for p in pts), max(p.x for p in pts); y0, y1 = min(p.y for p in pts), max(p.y for p in pts)
    span = max(x1 - x0, y1 - y0) * (1 + 2 * MARGIN)
    cam.data.ortho_scale = span; cam.data.shift_x = (x0 + x1) / 2 / span; cam.data.shift_y = (y0 + y1) / 2 / span
    scene.render.resolution_x = scene.render.resolution_y = ICON * SS
    tmp = TMP / (out_path.stem + '.png'); scene.render.filepath = str(tmp); bpy.ops.render.render(write_still=True)
    raw = load_px(tmp); raw[..., :3] = srgb_decode(raw[..., :3])
    img = outline(down(raw, SS)); save_px(img, out_path); tmp.unlink()
    return img

def prop_object(name, m):
    xs = [p.x for p in m.v]; ys = [p.y for p in m.v]; zs = [p.z for p in m.v]
    cx, cy, z0 = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, min(zs)
    me = bpy.data.meshes.new(name); me.from_pydata([(v.x - cx, v.y - cy, v.z - z0) for v in m.v], [], m.f)
    slots = list(dict.fromkeys(m.mi))
    for s in slots: me.materials.append(pmat(s))
    for p, s in zip(me.polygons, m.mi): p.material_index = slots.index(s); p.use_smooth = False
    me.validate(clean_customdata=False); me.update()
    ob = bpy.data.objects.new(name, me); COLL.objects.link(ob); return ob

def eq_instance(kind, t, mtx, gather=None):
    e = EQ[kind]
    r = bpy.data.objects.new('i_' + kind, None); COLL.objects.link(r); r.matrix_world = mtx
    obs = []
    for ob in e['meshes']:
        o = bpy.data.objects.new(ob.name + '_i', ob.data if gather is None else ob.data.copy()); COLL.objects.link(o); o.parent = r
        if gather is not None:                                    # bring a pair (gloves) side by side
            if o.data.shape_keys: o.shape_key_clear()
            vs = o.data.vertices; L = [v for v in vs if v.co.x < 0]; R_ = [v for v in vs if v.co.x >= 0]
            il, ir = max(v.co.x for v in L), min(v.co.x for v in R_)
            for v in L: v.co.x += -gather / 2 - il
            for v in R_: v.co.x += gather / 2 - ir
            o.data.update()
        for i, sl in enumerate(o.material_slots):
            sl.link = 'OBJECT'; sl.material = tinted(o.data.materials[i].name, t)
        obs.append(o)
    return r, obs
def add_studs(r, obs, grid, mat, size):
    """rivets on the front (-Y) of an equipment instance, cast onto its surface in the instance's own frame"""
    vs, ps = [], []
    for o in obs:
        k = len(vs); vs += [v.co.copy() for v in o.data.vertices]; ps += [tuple(k + i for i in p.vertices) for p in o.data.polygons]
    bvh = BVHTree.FromPolygons(vs, ps); m = M(); n = 0
    lo = Vector([min(v[i] for v in vs) for i in range(3)]); hi = Vector([max(v[i] for v in vs) for i in range(3)])
    for u, w in grid:
        x = lo.x + (hi.x - lo.x) * u; z = lo.z + (hi.z - lo.z) * w
        loc, nrm, _, _ = bvh.ray_cast(Vector((x, lo.y - 1, z)), Vector((0, 1, 0)))
        if loc is None: continue
        if nrm.y > 0: nrm = -nrm
        m.hull(ell(loc + nrm * size * .3, (size, size, size), nu=6, nv=3), mat); n += 1
    me = bpy.data.meshes.new('studs'); me.from_pydata([tuple(v) for v in m.v], [], m.f); me.materials.append(pmat(mat))
    me.validate(); me.update()
    ob = bpy.data.objects.new('studs', me); COLL.objects.link(ob); ob.parent = r
    return ob, n

# ================================================================ the icon list
def Rz(d): return Matrix.Rotation(math.radians(d), 4, 'Z')
def Rx(d): return Matrix.Rotation(math.radians(d), 4, 'X')
def Ry(d): return Matrix.Rotation(math.radians(d), 4, 'Y')
JOBS = []   # dict(id, desc, ...)
def EQJ(iid, kind, desc, yaw=40, tilt=-40, back=False, gather=None, studs=None, flip=False, out=None, **t):
    JOBS.append(dict(id=iid, src='eq', kind=kind, desc=desc, yaw=yaw, tilt=tilt, back=back, gather=gather, studs=studs, flip=flip,
                     out=out, tint=t))
def PJ(iid, fn, desc, yaw=25, tilt=0, out=None):
    JOBS.append(dict(id=iid, src='prop', fn=fn, desc=desc, yaw=yaw, tilt=tilt, out=out))

# the icon's metal per tier: the runtime colour (src/world_gear.js METALS), except whitsteel. Steel (0xd0d4dc) and whitsteel
# (0xe8ecf2) both light to plain white under the icon key light, so the icons could not tell them apart; whitsteel's icon
# takes an icy blue-white finish (steel stays neutral grey) so every tier reads by colour.
ICON_METAL = dict(METALS, whitsteel=0xc8dcff)
for t in ('copper', 'steel', 'whitsteel', 'aurel', 'veyrite', 'undercrag'):
    EQJ(t + '_sword', 'sword', 'arming sword (equipment v4 eq_sword), %s metal' % t, metal=ICON_METAL[t])
    EQJ(t + '_hatchet', 'hatchet', 'hatchet (eq_hatchet), %s head' % t, metal=ICON_METAL[t])
    EQJ(t + '_pickaxe', 'pickaxe', 'pickaxe (eq_pickaxe), %s picks' % t, metal=ICON_METAL[t])
for t in ('copper', 'iron', 'steel', 'whitsteel', 'aurel', 'veyrite', 'undercrag'):
    EQJ(t + '_platebody', 'platebody', 'platebody (eq_platebody, worn suit at rest), %s' % t, yaw=12, metal=ICON_METAL[t])
    EQJ(t + '_platelegs', 'platelegs', 'platelegs (eq_platelegs), %s' % t, yaw=12, metal=ICON_METAL[t])
for iid in ('ember_staff', 'storm_staff'):
    EQJ(iid, 'staff', 'staff (eq_staff), gem %06x as worn' % STAFF_GEM[iid], gem=STAFF_GEM[iid])
BOW_WOOD = {'ash_bow': (.76, .60, .38), 'blackthorn_bow': (.34, .25, .20), 'duskwood_bow': (.42, .32, .50)}
for iid, c in BOW_WOOD.items():
    EQJ(iid, 'shortbow', 'shortbow (eq_shortbow), %s wood' % iid.split('_')[0], over={'M_WOOD': c, 'M_WOOD_DARK': c_dark(c)})
for iid, cloth in (('wizard_hat', HAT_CLOTH['wizard']), ('apprentice_hat', HAT_CLOTH['cloth']), ('glimmer_hat', HAT_CLOTH['glimmer']),
                   ('starweave_hat', METALS['starweave'])):
    EQJ(iid, 'hat', 'pointed hat (eq_hat), cloth %06x as worn' % cloth, yaw=20, tilt=-22, cloth=cloth)
RIV, FEN = hex3(METALS['riveted']), hex3(METALS['fenhide'])
BODY_RIVETS = [(u, w) for w in (.3, .43, .56) for u in (.24, .36, .64, .76)]
CHAPS_RIVETS = [(u, w) for w in (.55, .7, .85) for u in (.22, .32, .68, .78)]
EQJ('riveted_body', 'leather_body', 'leather body (eq_leather_body) in riveted hide, iron rivets', yaw=12,
    over={'M_LEATHER': RIV, 'M_LEATHER_DARK': c_dark(RIV)}, studs=(BODY_RIVETS, .015))
EQJ('fenhide_body', 'leather_body', 'leather body (eq_leather_body) in green fenhide', yaw=12, over={'M_LEATHER': FEN, 'M_LEATHER_DARK': c_dark(FEN)})
EQJ('riveted_chaps', 'chaps', 'chaps (eq_chaps) in riveted hide, iron rivets', yaw=12,
    over={'M_LEATHER': RIV, 'M_LEATHER_DARK': c_dark(RIV)}, studs=(CHAPS_RIVETS, .015))
EQJ('fenhide_chaps', 'chaps', 'chaps (eq_chaps) in green fenhide', yaw=12, over={'M_LEATHER': FEN, 'M_LEATHER_DARK': c_dark(FEN)})
# capes and vambraces: the worn models (a long narrow cape at rest, thumbless mitts) do not read at icon size, so these are
# props in the worn colours (capeColor cloth + its x0.72 lining + brass clasps; fenhide green + dark straps)
PAL['fen'] = FEN; PAL['fen-dk'] = c_dark(FEN)
PJ('fenhide_vambraces', b_vambraces, 'a pair of fenhide vambraces: green hide bracers, dark straps, brass buckles', yaw=28)
for iid in ('trav_cape_red', 'trav_cape_blue', 'trav_cape_green', 'guild_sigil'):
    cc = GAME[iid]['capeColor'] if iid in GAME and GAME[iid]['capeColor'] else 0xa83232
    PAL['cape-%06x' % cc] = hex3(cc); PAL['cape-%06x-dk' % cc] = c_dark(hex3(cc))
    PJ(iid, (lambda k='cape-%06x' % cc, sig=(iid == 'guild_sigil'): b_cape(k, sig)),
       'cape seen from the back: flared folds, rolled collar, brass clasps; cloth %06x as worn' % cc, yaw=12, tilt=-40)

PJ('cabbage', b_cabbage, 'cabbage: pale heart, cupped outer leaves with pale midribs', yaw=20)
PJ('cheese', b_cheese, 'wedge of cheese: rind on the curved back and top edge, holes', yaw=205)
PJ('cooked_meat', b_cooked_meat, 'roast haunch: browned crust, darker char, bone end', yaw=25)
PJ('hollow_ale', b_tankard, 'wooden tankard: staves, two iron hoops, handle, foam head', yaw=25)
PJ('raw_trout', lambda: b_trout('trout-back', 'trout-band', 'trout-belly', 'trout-fin', 'trout-spot', 'char'), 'raw brooktrout: olive back, pink band, dark spots', yaw=25)
PJ('trout', lambda: b_trout('crust', 'meat-hi', 'dough', 'wood-dark', 'wood-dark', 'char'), 'cooked brooktrout: browned, darker spots', yaw=25)
PJ('oak_logs', lambda: b_logs('oak-bark', 'oak-end', 'oak-ring'), 'three oak logs: grey-brown bark, warm end grain', yaw=30)
PJ('willow_logs', lambda: b_logs('willow-bark', 'willow-end', 'willow-ring'), 'three willow logs: grey-olive bark, pale end grain', yaw=30)
PJ('clay', b_clay, 'a soft lump of clay', yaw=20)
PJ('iron_ore', lambda: b_ore('rock', 'iron-ore', 160), 'rock lump with rust-red iron chips', yaw=20)
PJ('gold_ore', lambda: b_ore('rock', 'gold', 180), 'rock lump with gold chips', yaw=20)
PJ('coal', b_coal, 'a heap of black coal lumps', yaw=20)
PJ('iron_bar', lambda: b_bar('iron-bar'), 'bevelled iron ingot', yaw=30)
PJ('steel_bar', lambda: b_bar('steel-bar'), 'bevelled steel ingot', yaw=30)
PJ('gold_bar', lambda: b_bar('gold-bar'), 'bevelled gold ingot', yaw=30)
PJ('bronze_tips', lambda: b_tips('bronze'), 'five bronze arrowtips', yaw=25)
PJ('iron_tips', lambda: b_tips('iron-bar'), 'five iron arrowtips', yaw=25)
PJ('arrow_shafts', b_shafts, 'a bound bundle of arrow shafts', yaw=35)
PJ('silver_trinket', b_trinket, 'a small silver locket with a blue stone', yaw=20)
PJ('fishing_rod', lambda: b_rod(False), 'fishing rod: cork grip, guides, line, float and hook', yaw=35)
PJ('fly_fishing_rod', lambda: b_rod(True), 'fly fishing rod: pale cane, brass reel, line and a red fly', yaw=35)
PJ('ball_of_wool', b_wool, 'ball of wool with a loose end', yaw=20)
PJ('pot', b_pot, 'terracotta pot', yaw=20)
PJ('bowl', b_bowl, 'clay bowl with a glazed band', yaw=20)
PJ('bow_string', b_bow_string, 'a coiled bow string with end loops', yaw=20)
for iid, kind in (('water_rune', 'tide'), ('earth_rune', 'stone'), ('fire_rune', 'ember'), ('body_rune', 'flesh'),
                  ('chaos_rune', 'wild'), ('nature_rune', 'verdant'), ('spark_rune', 'spark')):
    PJ(iid, (lambda k=kind: b_rune(k)), 'rune stone, our own %s sigil' % kind, yaw=15)
for kind in ('writ', 'grave', 'star', 'vein', 'spirit'):
    PJ(kind + '_rune_sigil', (lambda k=kind: b_rune(k)), 'planned %s rune (no item yet): sigil proof' % kind, yaw=15, out=FUTURE)
for iid, g in AMULET_GEM.items():
    PAL['gem-%06x' % g] = hex3(g)
    PJ(iid, (lambda k='gem-%06x' % g: b_amulet(k)), 'amulet laid flat: brass bead chain, round setting, gem %06x as worn' % g, yaw=10)
PJ('holy_symbol', b_holy_symbol, 'holy symbol: a silver eight-ray dawn star on a cord', yaw=10)
PJ('crag_maul', b_crag_maul, 'crag maul: a craggy rock head lashed to a dark haft, ember fissures', yaw=35)
for iid, tier, fn in (('cloth_robe_top', 'cloth', b_robe_top), ('glimmer_robe_top', 'glimmer', b_robe_top), ('starweave_robe_top', 'starweave', b_robe_top),
                      ('monk_robe_top', 'monk', b_robe_top), ('cloth_robe_skirt', 'cloth', b_robe_skirt), ('starweave_robe_skirt', 'starweave', b_robe_skirt),
                      ('monk_robe_bottom', 'monk', b_robe_skirt)):
    PJ(iid, (lambda f=fn, t=tier: f(t)), '%s robe %s, standing like the worn armour icons' % (tier, 'top' if 'top' in iid else 'bottom'), yaw=12, tilt=-40)


# ================================================================ run
unknown = [j['id'] for j in JOBS if j.get('out') is None and j['id'] not in GAME]
assert not unknown, ('icon ids not in the game data', unknown)
todo = [j for j in JOBS if not ONLY or j['id'] in ONLY]
if any(j['src'] == 'eq' for j in todo): load_equipment()
done = []
for j in todo:
    clear_coll()
    out_dir = j.get('out') or ICONS
    if j['src'] == 'eq':
        e = EQ[j['kind']]
        if e['frame'] == 'grip': mtx = Rz(j['yaw']) @ lay_b(e['lay']).to_4x4()
        else: mtx = Rz(j['yaw']) @ Rx(j['tilt']) @ (Rz(180) if j['back'] else Matrix.Identity(4)) @ (Ry(180) if j['flip'] else Matrix.Identity(4))
        r, obs = eq_instance(j['kind'], j['tint'], mtx, j['gather'])
        if j['studs']:
            so, ns = add_studs(r, obs, j['studs'][0], 'rivet', j['studs'][1]); obs.append(so)
        objs = obs
    else:
        ob = prop_object(j['id'], j['fn']())
        ob.rotation_euler = (0, 0, 0); ob.matrix_world = Rz(j['yaw']) @ Rx(j['tilt'])
        objs = [ob]
    img = render(objs, out_dir / (j['id'] + '.png'))
    done.append(j)
    print(TAG, j['id'], '->', (out_dir / (j['id'] + '.png')).relative_to(ROOT))
clear_coll()

# manifest: add / replace this script's entries
mp = ICONS / 'manifest.json'; man = json.loads(mp.read_text())
new = [j for j in done if j.get('out') is None]
ids = {j['id'] for j in new}
man['icons'] = [e for e in man['icons'] if e['id'] not in ids] + [{'id': j['id'], 'file': j['id'] + '.png', 'source': SRC,
                                                                     'model': ('equipment v4 eq_' + j['kind']) if j['src'] == 'eq' else 'prop',
                                                                     'description': j['desc']} for j in new]
mp.write_text(json.dumps(man, indent=2) + '\n', encoding='utf8')
try: TMP.rmdir()
except OSError: pass
print(TAG, 'DONE', len(done), 'icons;', len(new), 'in the manifest')
