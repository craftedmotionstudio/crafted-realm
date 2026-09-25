"""process_ui_icons_v3.py -- the 2004 pixel finish for the Blender-rendered interface icons.

Reads .studio-workspaces/ui-icons-v3/raw/manifest.json (written by tools/blender/build_ui_icons_v1.py) and for every
output of every icon:
  1. premultiplied BOX downsample of the big EEVEE frame to the icon's inner size (display size minus outline/shadow room)
  2. hard alpha (a pixel is either there or not -- no soft edges)
  3. a limited palette per icon (median-cut, no dithering) so the shading bands like hand-placed pixels
  4. a 1 px warm-black outline around the silhouette and a 1 px hard drop shadow down-right
Finishes: 'sprite' (outline + shadow), 'flat' (hard alpha only: orb fills), 'ghost' (dark translucent silhouette for empty
equipment slots). Output: assets/icons/ui/v3/<file> + assets/icons/ui/v3/manifest.json, and a contact sheet
scratchpad/holm_ui_v3/icons_sheet.png (every icon at 1x and 3x on the panel colours) for review.
Run: python tools/process_ui_icons_v3.py [--only name1,name2]
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / '.studio-workspaces/ui-icons-v3/raw'
OUT = ROOT / 'assets/icons/ui/v3'
SHEET = ROOT / 'scratchpad/holm_ui_v3'
OUT.mkdir(parents=True, exist_ok=True); SHEET.mkdir(parents=True, exist_ok=True)
argv = sys.argv[1:]
ONLY = set(argv[argv.index('--only') + 1].split(',')) if '--only' in argv else None

INK = np.array([20, 14, 8], dtype=np.float64)          # outline: warm near-black
SHADOW = (0, 0, 0, 110)                                # hard 1 px drop shadow
GHOST_LO, GHOST_HI = np.array([24, 20, 15.]), np.array([70, 62, 50.])

def load(p):
    a = np.asarray(Image.open(p).convert('RGBA'), dtype=np.float64) / 255.0
    return a
def fit_box(a, w, h):
    """premultiplied box downsample of the whole frame into (w, h) keeping aspect (content is already framed tight)"""
    H, W = a.shape[:2]
    pm = a.copy(); pm[..., :3] *= pm[..., 3:4]
    s = min(w / W, h / H); nw, nh = max(1, round(W * s)), max(1, round(H * s))
    chans = []
    for c in range(4):
        ch = Image.fromarray((pm[..., c] * 255.0).astype(np.float32), mode='F')
        chans.append(np.asarray(ch.resize((nw, nh), Image.BOX), dtype=np.float64) / 255.0)
    out = np.stack(chans, -1)
    rgb = np.where(out[..., 3:4] > 1e-4, out[..., :3] / np.maximum(out[..., 3:4], 1e-4), 0)
    return np.concatenate([np.clip(rgb, 0, 1), out[..., 3:4]], -1)
def trim(a, thr=.02):
    ys, xs = np.where(a[..., 3] > thr)
    if not len(xs): return a
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
def quantize(rgb, mask, n):
    if mask.sum() == 0: return rgb
    px = (rgb[mask] * 255).round().astype(np.uint8)
    im = Image.fromarray(px.reshape(1, -1, 3), 'RGB')
    q = im.quantize(colors=int(n), method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    out = rgb.copy(); out[mask] = np.asarray(q, dtype=np.float64).reshape(-1, 3) / 255.0
    return out
def shift(m, dy, dx):
    o = np.zeros_like(m); h, w = m.shape[:2]
    o[max(dy, 0):h + min(dy, 0), max(dx, 0):w + min(dx, 0)] = m[max(-dy, 0):h + min(-dy, 0), max(-dx, 0):w + min(-dx, 0)]
    return o
def finish(a, w, h, style, colors):
    pad = {'sprite': (1, 1, 2, 2), 'flat': (0, 0, 0, 0), 'ghost': (1, 1, 1, 1)}[style]   # left, top, right, bottom
    iw, ih = w - pad[0] - pad[2], h - pad[1] - pad[3]
    a = trim(a); small = fit_box(a, iw, ih)
    sh, sw = small.shape[:2]
    canvas = np.zeros((h, w, 4))
    ox = pad[0] + (iw - sw) // 2; oy = pad[1] + (ih - sh) // 2 + (ih - sh) % 2
    canvas[oy:oy + sh, ox:ox + sw] = small
    alpha = canvas[..., 3]
    mask = alpha >= .5
    rgb = canvas[..., :3]
    if style == 'ghost':
        lum = (rgb * [.3, .59, .11]).sum(-1)
        t = np.clip((lum - .25) / .6, 0, 1)[..., None]
        col = (GHOST_LO + (GHOST_HI - GHOST_LO) * t) / 255.0
        col = quantize(col, mask, 4)
        out = np.zeros((h, w, 4)); out[..., :3] = col; out[..., 3] = np.where(mask, .86, 0)
        return (out * 255).round().astype(np.uint8)
    # a touch of extra punch so the bands read at 1x (old sprites were saturated and contrasty)
    mean = rgb[mask].mean(0) if mask.any() else np.zeros(3)
    g = (rgb * [.3, .59, .11]).sum(-1, keepdims=True)
    rgb = np.clip(g + (rgb - g) * 1.12, 0, 1)
    rgb = quantize(rgb, mask, colors)
    out = np.zeros((h, w, 4)); out[..., :3] = rgb; out[..., 3] = mask.astype(float)
    if style == 'sprite':
        m = mask
        ring = (shift(m, 1, 0) | shift(m, -1, 0) | shift(m, 0, 1) | shift(m, 0, -1)) & ~m
        out[ring, :3] = INK / 255.0; out[ring, 3] = 1
        body = m | ring
        sh = shift(body, 1, 1) & ~body
        out[sh] = np.array(SHADOW) / 255.0
    return (out * 255).round().astype(np.uint8)

man = json.loads((RAW / 'manifest.json').read_text())
done = []
for ic in man:
    if ONLY and ic['name'] not in ONLY: continue
    a = load(RAW / ic['raw'])
    for o in ic['outs']:
        img = finish(a, o['w'], o['h'], ic['style'], ic['colors'] if o['w'] >= 24 else max(8, ic['colors'] - 4))
        dst = OUT / o['file']; dst.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(img, 'RGBA').save(dst)
        done.append({'icon': ic['name'], 'file': o['file'], 'w': o['w'], 'h': o['h'], 'finish': ic['style']})
# manifest of everything on disk (merge with previous partial runs)
mp = OUT / 'manifest.json'
prev = json.loads(mp.read_text())['files'] if mp.exists() else []
keep = {d['file'] for d in done}
files = sorted([d for d in prev if d['file'] not in keep] + done, key=lambda d: d['file'])
mp.write_text(json.dumps({'schema': 1, 'source': ['tools/blender/build_ui_icons_v1.py', 'tools/process_ui_icons_v3.py'],
                          'note': 'original low-poly Blender props rendered and pixel-finished; no third-party art',
                          'files': files}, indent=1) + '\n')
print('[ui-icons-v3] wrote', len(done), 'files ->', OUT)

# contact sheet: every file at 1x and 3x on slate + stone
groups = {}
for d in files: groups.setdefault(d['file'].split('/')[0], []).append(d)
rows = []
BG1, BG2 = (62, 53, 41), (92, 84, 70)
for g, lst in groups.items():
    cell = max(max(d['w'], d['h']) for d in lst) * 3 + 16
    per = max(1, 1500 // (cell + 40))
    for i in range(0, len(lst), per):
        chunk = lst[i:i + per]
        row = Image.new('RGBA', (len(chunk) * (cell + 40) + 90, cell + 10), BG1 + (255,))
        from PIL import ImageDraw
        dr = ImageDraw.Draw(row); dr.text((4, 4), g if i == 0 else '', fill=(255, 152, 31, 255))
        for k, d in enumerate(chunk):
            im = Image.open(OUT / d['file']).convert('RGBA')
            x = 90 + k * (cell + 40)
            row.paste(Image.new('RGBA', (cell + 34, cell + 4), BG2 + (255,)), (x - 2, 3))
            row.alpha_composite(im, (x, 6))
            big = im.resize((im.width * 3, im.height * 3), Image.NEAREST)
            row.alpha_composite(big, (x + d['w'] + 6, 6))
        rows.append(row)
W = max(r.width for r in rows); H = sum(r.height for r in rows)
sheet = Image.new('RGBA', (W, H), BG1 + (255,)); y = 0
for r in rows: sheet.alpha_composite(r, (0, y)); y += r.height
sheet.save(SHEET / 'icons_sheet.png'); print('[ui-icons-v3] sheet ->', SHEET / 'icons_sheet.png', sheet.size)
