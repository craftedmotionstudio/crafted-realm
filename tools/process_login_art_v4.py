"""process_login_art_v4.py -- the old-school pixel finish for the login art rendered by tools/blender/build_login_art_v4.py.

Reads .studio-workspaces/login-art-v4/raw/manifest.json and writes assets/icons/ui/v3/login/*:
  background  hall_dim.png + hall_lit.png: box-downsampled to 768 x 432 (shown 2x in the page) and mapped to ONE shared
              64-colour palette, saved as 8-bit palette PNGs (small, and the torch flicker cross-fades cleanly)
  sprite      trimmed, fitted, hard alpha, limited palette, 1 px ink outline + hard shadow (the title)
  fixed       the frame is kept exactly (brazier: it must line up with the fire sheet), hard alpha, palette, ink outline
  sheet       the fire: every frame downsampled in the same fixed frame, one shared palette, no outline, laid side by side
  nine        9-slice panel / buttons: exact frame, hard alpha, palette, ink line on the outermost pixels
Also writes scratchpad/holm_login_v4/art_sheet.png (every output at 1x and 2x) for review.
Run: python tools/process_login_art_v4.py
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / '.studio-workspaces/login-art-v4/raw'
OUT = ROOT / 'assets/icons/ui/v3'
SHEET = ROOT / 'scratchpad/holm_login_v4'; SHEET.mkdir(parents=True, exist_ok=True)
INK = np.array([16, 13, 12])

def load(p): return np.asarray(Image.open(p).convert('RGBA'), dtype=np.float64) / 255.0
def box(a, w, h):
    pm = a.copy(); pm[..., :3] *= pm[..., 3:4]; H, W = a.shape[:2]
    ch = [np.asarray(Image.fromarray((pm[..., c] * 255).astype(np.float32), 'F').resize((w, h), Image.BOX), dtype=np.float64) / 255 for c in range(4)]
    o = np.stack(ch, -1); rgb = np.where(o[..., 3:4] > 1e-4, o[..., :3] / np.maximum(o[..., 3:4], 1e-4), 0)
    return np.concatenate([np.clip(rgb, 0, 1), o[..., 3:4]], -1)
def trim(a, thr=.02):
    ys, xs = np.where(a[..., 3] > thr)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1] if len(xs) else a
def shift(m, dy, dx):
    o = np.zeros_like(m); h, w = m.shape[:2]
    o[max(dy, 0):h + min(dy, 0), max(dx, 0):w + min(dx, 0)] = m[max(-dy, 0):h + min(-dy, 0), max(-dx, 0):w + min(-dx, 0)]; return o
def palette_of(rgbs, n):
    """one median-cut palette for a list of (N,3) uint8 pixel arrays"""
    px = np.concatenate(rgbs, 0)
    im = Image.fromarray(px.reshape(1, -1, 3), 'RGB').quantize(colors=n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    return im
def apply_pal(rgb_u8, pal_im):
    h, w = rgb_u8.shape[:2]
    return np.asarray(Image.fromarray(rgb_u8, 'RGB').quantize(palette=pal_im, dither=Image.Dither.NONE).convert('RGB'))
def punch(rgb, k=1.08):
    g = (rgb * [.3, .59, .11]).sum(-1, keepdims=True); return np.clip(g + (rgb - g) * k, 0, 1)
def to_u8(a): return (np.clip(a, 0, 1) * 255).round().astype(np.uint8)
def outline(img, inner=False, shadow=True):
    m = img[..., 3] > 0
    if inner:   # 9-slices have no spare pixels outside: ink the outermost opaque pixels
        edge = m & ~(shift(m, 1, 0) & shift(m, -1, 0) & shift(m, 0, 1) & shift(m, 0, -1))
        img[edge, :3] = INK / 255; return img
    ring = (shift(m, 1, 0) | shift(m, -1, 0) | shift(m, 0, 1) | shift(m, 0, -1)) & ~m
    img[ring, :3] = INK / 255; img[ring, 3] = 1
    if shadow:
        body = m | ring; sh = shift(body, 1, 1) & ~body; img[sh] = [0, 0, 0, .43]
    return img
def finish_rgba(a, colors, k=1.08):
    mask = a[..., 3] >= .5; rgb = punch(a[..., :3], k); u8 = to_u8(rgb)
    if mask.any():
        pal = palette_of([u8[mask]], colors); q = apply_pal(u8, pal); u8 = np.where(mask[..., None], q, 0)
    out = np.zeros(a.shape); out[..., :3] = u8 / 255; out[..., 3] = mask; return out
def save(img, rel):
    p = OUT / rel; p.parent.mkdir(parents=True, exist_ok=True); Image.fromarray(to_u8(img), 'RGBA').save(p, optimize=True); return p

man = json.loads((RAW / 'manifest.json').read_text())
written = []
for e in man:
    k, o = e['kind'], e['out']
    if k == 'background':
        imgs = {v: box(load(RAW / f), o['w'], o['h']) for v, f in e['raw'].items()}
        u8 = {v: to_u8(punch(a[..., :3], 1.05)) for v, a in imgs.items()}
        pal = palette_of([x.reshape(-1, 3) for x in u8.values()], 64)
        for v, x in u8.items():
            q = Image.fromarray(x, 'RGB').quantize(palette=pal, dither=Image.Dither.NONE)
            p = OUT / e['files'][v]; p.parent.mkdir(parents=True, exist_ok=True); q.save(p, optimize=True); written.append(p)
    elif k == 'sprite':
        a = trim(load(RAW / e['raw'])); W, H = o['w'], o['h']; iw, ih = W - 3, H - 3
        s = min(iw / a.shape[1], ih / a.shape[0]); sw, sh = max(1, round(a.shape[1] * s)), max(1, round(a.shape[0] * s))
        small = box(a, sw, sh); canvas = np.zeros((H, W, 4)); ox, oy = 1 + (iw - sw) // 2, 1 + (ih - sh) // 2
        canvas[oy:oy + sh, ox:ox + sw] = small
        written.append(save(outline(finish_rgba(canvas, e.get('colors', 24))), e['file']))
    elif k == 'fixed':
        img = finish_rgba(box(load(RAW / e['raw']), o['w'], o['h']), e.get('colors', 20))
        written.append(save(outline(img, inner=False, shadow=False) if e.get('outline') else img, e['file']))
    elif k == 'sheet':
        frames = [box(load(RAW / f), o['w'], o['h']) for f in e['raw']]
        masks = [f[..., 3] >= .42 for f in frames]; u8s = [to_u8(punch(f[..., :3], 1.12)) for f in frames]
        pal = palette_of([u[m] for u, m in zip(u8s, masks)], e.get('colors', 12))
        sheet = np.zeros((o['h'], o['w'] * len(frames), 4))
        for i, (u, m) in enumerate(zip(u8s, masks)):
            q = apply_pal(u, pal); sheet[:, i * o['w']:(i + 1) * o['w'], :3] = np.where(m[..., None], q, 0) / 255; sheet[:, i * o['w']:(i + 1) * o['w'], 3] = m
        written.append(save(sheet, e['file']))
    elif k == 'nine':
        img = finish_rgba(box(load(RAW / e['raw']), o['w'], o['h']), e.get('colors', 20), k=1.0)
        written.append(save(outline(img, inner=True), e['file']))
    print('[login-art-v4]', e['name'], '->', [str(p.relative_to(ROOT)) for p in written[-2:]] if k == 'background' else str(written[-1].relative_to(ROOT)))

# review sheet: each file at 1x and 2x on a dark field
tiles = []
for p in written:
    im = Image.open(p).convert('RGBA'); big = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
    t = Image.new('RGBA', (im.width + big.width + 30, big.height + 20), (24, 22, 20, 255)); t.alpha_composite(im, (6, 10)); t.alpha_composite(big, (im.width + 20, 10)); tiles.append(t)
W = max(t.width for t in tiles); Hh = sum(t.height for t in tiles)
sheet = Image.new('RGBA', (W, Hh), (24, 22, 20, 255)); y = 0
for t in tiles: sheet.alpha_composite(t, (0, y)); y += t.height
sheet.save(SHEET / 'art_sheet.png'); print('[login-art-v4] review ->', SHEET / 'art_sheet.png', sheet.size, 'bytes', sum(p.stat().st_size for p in written))
