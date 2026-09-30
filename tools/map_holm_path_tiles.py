"""Top-down tile maps of the grey paths of Tutor's Holm (path tiles pass, 2026-09-29): one square per tile, the ground by its
terrain material (grass, sand, rock, creek bed; shaded by slope), water, creek banks, building floors, bridge and deck
tiles, the arrival house and its trail, dry tiles the walk graph refuses (hatched), tiles a placed object stands on (dark
squares) and tree trunks (green rings), the path tiles (grey), the named places the paths join (pins), a coordinate grid,
and, from the audit (tools/audit_holm_path_tiles.js), every stray square outlined by kind. With an authored layout the
segments are numbered and listed in a legend panel.
Run: python tools/map_holm_path_tiles.py <audit.json> <out.png> [--px 8] [--crop x0,z0,x1,z1] [--no-findings] [--title "..."]"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

def font(n, bold=True):
    for f in (('C:/Windows/Fonts/segoeuib.ttf' if bold else 'C:/Windows/Fonts/segoeui.ttf'), 'C:/Windows/Fonts/arialbd.ttf'):
        try: return ImageFont.truetype(f, n)
        except Exception: pass
    return ImageFont.load_default()

args = sys.argv[1:]
src, out = Path(args[0]), Path(args[1])
def opt(name, default=None):
    return args[args.index(name) + 1] if name in args else default
PX = int(opt('--px', 8))
crop = [int(v) for v in opt('--crop').split(',')] if opt('--crop') else None
show_findings = '--no-findings' not in args
title = opt('--title', '')

A = json.loads(src.read_text())
P, AU = A['picture'], A['audit']
W, D = P['W'], P['D']
x0, z0, x1, z1 = crop if crop else (0, 0, W - 1, D - 1)
MARGIN_L, MARGIN_T = 34, 58
seg_panel = 0
if A.get('segments') and not crop:
    seg_panel = 640
iw, ih = (x1 - x0 + 1) * PX, (z1 - z0 + 1) * PX
img = Image.new('RGB', (MARGIN_L + iw + 12 + seg_panel, MARGIN_T + ih + 150), (24, 22, 20))
d = ImageDraw.Draw(img, 'RGBA')
F, FS, FT = font(max(11, PX + 3)), font(12), font(20)

MAT = {0: (196, 180, 124), 1: (112, 146, 62), 2: (128, 124, 112), 3: (122, 106, 74), 4: (128, 138, 112), 5: (120, 124, 70)}
def at(x, z):
    return MARGIN_L + (x - x0) * PX, MARGIN_T + (z - z0) * PX
def rect(x, z, fill=None, outline=None, width=1, inset=0):
    X, Z = at(x, z)
    d.rectangle([X + inset, Z + inset, X + PX - 1 - inset, Z + PX - 1 - inset], fill=fill, outline=outline, width=width)

paths = set(A['paths'])
decor = set(f'{a},{b}' for a, b in P.get('decor', []))
for z in range(z0, z1 + 1):
    for x in range(x0, x1 + 1):
        i = z * W + x
        k = P['kinds'][i]
        m = P['mats'][i]
        c = [sum(MAT.get(v, MAT[1])[j] for v in m) / 4 for j in range(3)]
        shade = max(.55, 1 - P['slopes'][i] * .18)
        c = [v * shade for v in c]
        if k == 'water': c = (52, 86, 140)
        elif k == 'bank': c = (70, 104, 150)
        elif k == 'floor': c = (92, 70, 56)
        elif k == 'deck': c = (160, 118, 72)
        elif k == 'arrival': c = [v * .8 for v in c]
        if f'{x},{z}' in paths and k != 'water': c = (184, 184, 178)
        elif '--cells' in args and f'{x},{z}' in decor: c = [v * .8 + 60 * .2 for v in c]
        rect(x, z, fill=tuple(int(max(0, min(255, v))) for v in c))
        if k == 'none' and f'{x},{z}' not in paths:
            X, Z = at(x, z)
            d.line([X, Z + PX - 1, X + PX - 1, Z], fill=(40, 40, 30, 120), width=1)
        if k == 'arrival' and f'{x},{z}' not in paths:
            X, Z = at(x, z)
            d.line([X, Z, X + PX - 1, Z + PX - 1], fill=(90, 60, 40, 110), width=1)
# placed objects and trunks
for x, z, why in P['occupied']:
    if x0 <= x <= x1 and z0 <= z <= z1 and not str(why).startswith('habitat:') and P['kinds'][z * W + x] not in ('floor', 'water'):
        rect(x, z, fill=(50, 40, 34, 170), inset=max(1, PX // 4))
    elif x0 <= x <= x1 and z0 <= z <= z1 and str(why).startswith('habitat:') and P['kinds'][z * W + x] not in ('floor', 'water'):
        rect(x, z, fill=(40, 70, 30, 150), inset=max(1, PX // 3))
for tx, tz in P['trunks']:
    if x0 <= tx <= x1 + 1 and z0 <= tz <= z1 + 1:
        X, Z = MARGIN_L + (tx - x0) * PX, MARGIN_T + (tz - z0) * PX
        r = max(2, PX * .45)
        d.ellipse([X - r, Z - r, X + r, Z + r], outline=(20, 60, 20), width=max(1, PX // 5))
# cliff edges (walkable neighbours the walk graph does not join)
for x, z, east in (P.get('cliffs', []) if '--cliffs' in args else []):
    if x0 <= x <= x1 and z0 <= z <= z1:
        X, Z = at(x, z)
        if east: d.line([X + PX, Z, X + PX, Z + PX], fill=(200, 30, 30, 230), width=max(1, PX // 6))
        else: d.line([X, Z + PX, X + PX, Z + PX], fill=(200, 30, 30, 230), width=max(1, PX // 6))
if '--cells' in args:
    for x, z, dec in P.get('cells', []):
        if x0 <= x <= x1 + 1 and z0 <= z <= z1 + 1:
            X, Z = MARGIN_L + (x - x0) * PX, MARGIN_T + (z - z0) * PX
            r = max(1, PX // 8)
            d.ellipse([X - r, Z - r, X + r, Z + r], fill=(255, 200, 0) if dec else (255, 255, 255))
# grid
for x in range(x0, x1 + 2):
    if x % 4 == 0:
        X, _ = at(x, z0)
        d.line([X, MARGIN_T, X, MARGIN_T + ih], fill=(0, 0, 0, 70 if x % 8 == 0 else 30), width=1)
        if x % 8 == 0 or (crop and PX >= 14): d.text((X + 1, MARGIN_T - 16), str(x), fill=(220, 214, 196), font=FS)
for z in range(z0, z1 + 2):
    if z % 4 == 0:
        _, Z = at(x0, z)
        d.line([MARGIN_L, Z, MARGIN_L + iw, Z], fill=(0, 0, 0, 70 if z % 8 == 0 else 30), width=1)
        if z % 8 == 0 or (crop and PX >= 14): d.text((4, Z - 7), str(z), fill=(220, 214, 196), font=FS)
# findings
COLS = {'isolated': (255, 40, 40), 'offRoute': (255, 140, 0), 'ragged': (255, 230, 0), 'staircase': (190, 80, 255), 'clipped': (0, 230, 255), 'parallel': (255, 60, 200)}
if show_findings:
    order = ['staircase', 'ragged', 'parallel', 'offRoute', 'clipped', 'isolated']
    for cat in order:
        for p in AU['findings'][cat]:
            x, z = p[0], p[1]
            if x0 <= x <= x1 and z0 <= z <= z1:
                rect(x, z, outline=COLS[cat] + (255,), width=max(1, PX // 5), inset=0 if cat in ('offRoute', 'isolated') else 1)
# segments: numbered at their middle
if A.get('segments'):
    for n, s in enumerate(A['segments'], 1):
        pts = s.get('tiles') or []
        if not pts: continue
        mx, mz = pts[len(pts) // 2]
        if x0 <= mx <= x1 and z0 <= mz <= z1:
            X, Z = at(mx, mz)
            lab = str(n)
            d.rounded_rectangle([X - 2, Z - 2, X + 7 * len(lab) + 6, Z + 14], 3, fill=(20, 20, 60, 210))
            d.text((X + 1, Z - 1), lab, fill=(255, 255, 255), font=FS)
# places
for p in P['places']:
    px, pz = p['at']
    if not (x0 <= px <= x1 + 1 and z0 <= pz <= z1 + 1): continue
    X, Z = MARGIN_L + (px - x0) * PX, MARGIN_T + (pz - z0) * PX
    r = max(3, PX * .4)
    col = (230, 40, 40) if p.get('lesson') else (60, 120, 230)
    d.ellipse([X - r, Z - r, X + r, Z + r], fill=col + (255,), outline=(255, 255, 255), width=1)
    d.text((X + r + 2, Z - 8), p['name'], fill=(255, 255, 255), font=FS, stroke_width=2, stroke_fill=(0, 0, 0))
# title + legend + counts
d.text((MARGIN_L, 8), title or ('Tutor\'s Holm grey paths: ' + A['module']), fill=(240, 226, 190), font=FT)
c = AU['counts']
d.text((MARGIN_L, 32), f"{AU['tiles']} path tiles, {AU['components']} separate pieces; stray squares flagged: {AU['strayTiles']}   "
       f"cross-section widths on straight runs: {AU['crossWidths']}", fill=(220, 214, 196), font=FS)
ly = MARGIN_T + ih + 12
items = [('isolated', 'isolated tile / speck'), ('offRoute', 'stub, blob or spare lane (on no walk between two places)'), ('ragged', 'ragged edge / width change'),
         ('staircase', 'diagonal staircase'), ('clipped', 'lane clipped by a prop / refused tile'), ('parallel', 'parallel duplicate lane')]
for i, (k, label) in enumerate(items):
    X = MARGIN_L + (i % 2) * 520; Y = ly + (i // 2) * 22
    d.rectangle([X, Y + 2, X + 12, Y + 14], outline=COLS[k], width=3)
    d.text((X + 18, Y), f'{label}: {c.get(k, 0)}', fill=(230, 230, 222), font=FS)
Y = ly + 72
keys = [((184, 184, 178), 'path tile'), ((92, 70, 56), 'building floor'), ((160, 118, 72), 'bridge / deck'), ((52, 86, 140), 'water'), ((70, 104, 150), 'creek bank'),
        ((50, 40, 34), 'prop / lesson object'), ((40, 70, 30), 'plant'), ((230, 40, 40), 'lesson place'), ((60, 120, 230), 'other place')]
for i, (col, label) in enumerate(keys):
    X = MARGIN_L + (i % 5) * 200; YY = Y + (i // 5) * 22
    d.rectangle([X, YY + 2, X + 12, YY + 14], fill=col)
    d.text((X + 18, YY), label, fill=(230, 230, 222), font=FS)
if seg_panel:
    X = MARGIN_L + iw + 16
    d.text((X, MARGIN_T - 20), 'Segments (numbered on the map)', fill=(240, 226, 190), font=font(14))
    for n, s in enumerate(A['segments'], 1):
        d.text((X, MARGIN_T + (n - 1) * 17), f"{n:>2}. {s['name']} ({s.get('w', 2)}w, {len(s.get('tiles') or [])})", fill=(230, 230, 222), font=font(12, False))
    if A.get('courts'):
        Y0 = MARGIN_T + len(A['segments']) * 17 + 12
        d.text((X, Y0), 'Courts', fill=(240, 226, 190), font=font(14))
        for n, s in enumerate(A['courts'], 1):
            d.text((X, Y0 + n * 17), f"{s['name']} {s['rect']}", fill=(230, 230, 222), font=font(12, False))
out.parent.mkdir(parents=True, exist_ok=True)
img.save(out)
print('[HOLM PATH TILES MAP]', out, img.size)
