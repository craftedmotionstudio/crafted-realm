"""Look v4 metrics (2026-09-28): how "planey / plain / pixelated" a 3D view is, measured the same way on the 2004
reference and on ours. Owner review 5b: "everything in the game looks a little bit too polished ... we need more
plainy style designs ... maybe even just more pixelated, slightly pixelated". Settle it by numbers, not a guess.

    python tools/ref2004/look_metrics.py options [ROOT]      2004 scenery vs every option folder under ROOT
    python tools/ref2004/look_metrics.py image FILE [2004]   the numbers for one frame (2004 = a 765x503 applet frame)

Inputs
  2004: the 512 x 334 3D viewport of a 765 x 503 applet frame (C:/Users/iQwaZ/ref2004_captures/scenery/2004, private).
  ours: a 1530 x 1006 frame (HUD hidden) at the 2004 lens (36.13 deg vertical FOV, 22.5 deg, 7.7-tile boom), i.e. 3x the
        2004 viewport. Every content number is taken at the 2004 pixel scale: ours box-averaged 3 x 3 -> 510 x 335 (one
        2004 pixel per 3 x 3 block of our window), so detail finer than a 2004 pixel counts as the eye would see it there.

Numbers (all on luminance L in 0-255 levels unless said; the black void past the draw distance is left out of a-c)
  (a) faceting: the view cut into 6 x 6 blocks at the 2004 scale, each block sorted by its luminance shape:
        flat    - one plain tone (a plane fit leaves < 2 levels RMS and the slope is under 1/3 level per pixel)
        ramp    - a smooth gradient (plane fit < 2 levels RMS, sloped): gouraud / smooth-normal shading
        step    - two plain parts with a hard jump (>= 4 levels between neighbours across the split) in the SAME colour:
                  a shading jump between faces (flat-shaded planes)
        edge    - two plain parts of DIFFERENT colour: an object / material boundary
        busy    - none of those: texture or clutter
      facet_share = step / (flat + ramp + step): of the plain, shaded surface, how much shows face-to-face jumps;
      ramp_share  = ramp / (flat + ramp + step): how much is smooth gradient ("round");
      flat_share  = flat / (flat + ramp + step): how much is one plain tone per face ("plain").
  (b) texture detail: busy_share = busy / all blocks; surface_hf = mean |L - 3x3 mean| (levels) on surface blocks
      (flat / ramp / step / busy: object edges left out) = high-frequency energy inside surfaces.
  (c) colours: unique 24-bit colours in the view at the 2004 pixel count (ours: nearest sample of each 3 x 3 block, so no
      averaged colours are invented), colours_90 = how many colours cover 90% of the pixels, ramp_levels = distinct colours
      inside a 36-pixel smooth-gradient block (few = banded like a small palette).
  (d) pixels: block_px = the size of the hard pixel blocks on screen (2004's viewport at our window = 3); lines_per_deg =
      rendered lines per degree of vertical view (2004: 334 lines over 36.13 deg = 9.24).
  (e) lum_mean / lum_std (0-1), mean_sat: the same formula as analyze.py image_stats (all pixels, as in the feel report).
"""
import glob
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

CAP = os.environ.get('REF2004_CAPTURES', 'C:/Users/iQwaZ/ref2004_captures')
VIEW2004 = (4, 4, 516, 338)
VFOV = 36.13
BLOCK = 6
R0, G0, S0, C0 = 2.0, 1 / 3, 6.0, 0.02
KINDS = [('town', 'town_'), ('field', 'field_'), ('water', 'water_')]
# 2004 frames left out of the means: the camera sits against the castle wall (the view is one wall and a door, no scene)
EXCLUDE = {'town_courtyard_p128_y1536.png'}

# plane-fit design matrix for one 6 x 6 block (shared by every block)
_yy, _xx = np.mgrid[0:BLOCK, 0:BLOCK]
_A = np.stack([np.ones(BLOCK * BLOCK), _xx.ravel() - (BLOCK - 1) / 2, _yy.ravel() - (BLOCK - 1) / 2], 1)
_PINV = np.linalg.pinv(_A)
# 4-neighbour pairs inside a block (for the jump test across a split)
_PAIRS = [(i, i + 1) for i in range(BLOCK * BLOCK) if (i % BLOCK) < BLOCK - 1] + [(i, i + BLOCK) for i in range(BLOCK * (BLOCK - 1))]
_P0 = np.array([p[0] for p in _PAIRS])
_P1 = np.array([p[1] for p in _PAIRS])


def lum_of(a):
    return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


def load_view(path, kind):
    """-> (content image at the 2004 scale 0-255 float, nearest-sampled image uint8, screen image uint8, lines of the 3D view)"""
    im = np.asarray(Image.open(path).convert('RGB'))
    if kind == '2004':
        v = im[VIEW2004[1]:VIEW2004[3], VIEW2004[0]:VIEW2004[2]]
        screen = np.repeat(np.repeat(v, 3, 0), 3, 1)      # the viewport as it fills our window (x3, hard pixels)
        return v.astype(np.float64), v, screen, v.shape[0]
    h, w = (im.shape[0] // 3) * 3, (im.shape[1] // 3) * 3
    c = im[:h, :w].astype(np.float64).reshape(h // 3, 3, w // 3, 3, 3).mean(axis=(1, 3))
    return c, im[1:h:3, 1:w:3], im, im.shape[0]


def block_px(screen):
    """The hard-pixel block size of a screen image: the most common length (1-6) of the short runs of identical pixels
    along rows and columns (a picture scaled up k times with hard pixels repeats every pixel k times; a native render
    changes from pixel to pixel wherever it holds detail). Robust to a block grid that drifts by a line (1006 / 335)."""
    a = screen.astype(np.int64)
    code = a[..., 0] * 65536 + a[..., 1] * 256 + a[..., 2]
    sizes = []
    for arr in (code, code.T):
        change = np.ones(arr.shape, bool)
        change[:, 1:] = arr[:, 1:] != arr[:, :-1]
        idx = np.nonzero(change.ravel())[0]
        runs = np.diff(np.append(idx, change.size))
        # runs cut at row ends are fine: a row start is a change by construction
        hist = np.bincount(runs[runs <= 6], minlength=7)[1:]
        sizes.append(int(np.argmax(hist)) + 1 if hist.sum() else 1)
    return int(round(float(np.mean(sizes))))


def straight(g):
    """True when the split of a block is (all but 2 pixels) a half-plane: a straight face / object boundary, not the
    blobby split of a texture pattern."""
    X = _A[:, 1:]
    w = X[g].mean(0) - X[~g].mean(0)
    if np.hypot(*w) < 1e-6:
        return False
    p = X @ w
    order = np.argsort(p)
    gs = g[order].astype(np.int32)
    # agreement when everything above position i is 'g': ones above + zeros below
    ones_above = gs[::-1].cumsum()[::-1]
    zeros_below = np.concatenate([[0], (1 - gs).cumsum()[:-1]])
    return int((ones_above + zeros_below).max()) >= len(g) - 2


def classify_blocks(c):
    """c: H x W x 3 (0-255) at the 2004 scale -> per-block class counts and the per-block labels."""
    L = lum_of(c)
    s = c.sum(axis=2) + 1e-6
    chroma = np.stack([c[..., 0] / s, c[..., 1] / s], -1)
    void = c.max(axis=2) < 9       # the black void / dark fade (max channel < 9 of 255)
    H, W = L.shape[0] // BLOCK, L.shape[1] // BLOCK
    Lb = L[:H * BLOCK, :W * BLOCK].reshape(H, BLOCK, W, BLOCK).transpose(0, 2, 1, 3).reshape(H, W, BLOCK * BLOCK)
    Cb = chroma[:H * BLOCK, :W * BLOCK].reshape(H, BLOCK, W, BLOCK, 2).transpose(0, 2, 1, 3, 4).reshape(H, W, BLOCK * BLOCK, 2)
    # a void block is mostly void (dark mortar lines or outlines inside a surface do not make it void)
    Vb = void[:H * BLOCK, :W * BLOCK].reshape(H, BLOCK, W, BLOCK).transpose(0, 2, 1, 3).reshape(H, W, BLOCK * BLOCK).mean(-1) > 0.5
    coef = Lb @ _PINV.T                                    # H x W x 3
    fit = coef @ _A.T
    rms = np.sqrt(((Lb - fit) ** 2).mean(-1))
    slope = np.hypot(coef[..., 1], coef[..., 2])
    lab = np.full((H, W), '', dtype=object)
    lab[Vb] = 'void'
    plain = (~Vb) & (rms < R0)
    lab[plain & (slope < G0)] = 'flat'
    lab[plain & (slope >= G0)] = 'ramp'
    for y, x in zip(*np.nonzero((~Vb) & (rms >= R0))):
        v = Lb[y, x]
        # Otsu split of the block's tones (at least 4 pixels a side): least summed squared deviation, from cumulative sums
        o = np.sort(v)
        n1 = np.arange(1, len(o))
        c1, q1 = np.cumsum(o)[:-1], np.cumsum(o * o)[:-1]
        c2, q2 = o.sum() - c1, (o * o).sum() - q1
        n2 = len(o) - n1
        wv = (q1 - c1 * c1 / n1) + (q2 - c2 * c2 / n2)
        wv[:3] = np.inf
        wv[-3:] = np.inf
        i = int(np.argmin(wv)) + 1
        g = v > (o[i - 1] + o[i]) / 2
        if g.sum() < 9 or (~g).sum() < 9:   # a quarter of the block each side: a thin line (mortar, outline) is not a face step
            lab[y, x] = 'busy'
            continue
        # each part must be a plane (plain shading), and the parts must meet in a hard jump
        res = []
        for part in (g, ~g):
            A = _A[part]
            cf, *_ = np.linalg.lstsq(A, v[part], rcond=None)
            res.append(((v[part] - A @ cf) ** 2).sum())
        pooled = np.sqrt(sum(res) / len(v))
        cross = g[_P0] != g[_P1]
        jump = np.median(np.abs(v[_P0][cross] - v[_P1][cross])) if cross.any() else 0
        if pooled < R0 and jump >= S0 and straight(g):
            dc = np.hypot(*(Cb[y, x][g].mean(0) - Cb[y, x][~g].mean(0)))
            lab[y, x] = 'step' if dc < C0 else 'edge'
        else:
            lab[y, x] = 'busy'
    return lab, L, void


def measure(path, kind):
    c, near, screen, lines = load_view(path, kind)
    lab, L, void = classify_blocks(c)
    n = {k: int((lab == k).sum()) for k in ['flat', 'ramp', 'step', 'edge', 'busy', 'void']}
    solid = sum(n[k] for k in ['flat', 'ramp', 'step', 'edge', 'busy']) or 1
    plain = (n['flat'] + n['ramp'] + n['step']) or 1
    # (b) high-frequency energy inside surfaces (object edges and the void left out)
    hf = np.abs(L - ndimage.uniform_filter(L, 3, mode='nearest'))
    H, W = lab.shape
    surf = np.isin(lab, ['flat', 'ramp', 'step', 'busy'])
    mask = np.repeat(np.repeat(surf, BLOCK, 0), BLOCK, 1)
    hfc = hf[:H * BLOCK, :W * BLOCK][mask]
    # (c) colours (nearest sample: the renderer's own colours)
    nv = near.reshape(-1, 3)[~(near.max(axis=2) < 9).ravel()].astype(np.int64)
    codes = nv[:, 0] * 65536 + nv[:, 1] * 256 + nv[:, 2]
    uniq, cnt = np.unique(codes, return_counts=True)
    cs = np.sort(cnt)[::-1].cumsum()
    col90 = int(np.searchsorted(cs, 0.9 * cs[-1]) + 1) if len(cs) else 0
    nb = near[:H * BLOCK, :W * BLOCK].astype(np.int64)
    nb = (nb[..., 0] * 65536 + nb[..., 1] * 256 + nb[..., 2]).reshape(H, BLOCK, W, BLOCK).transpose(0, 2, 1, 3).reshape(H, W, -1)
    rl = [len(np.unique(nb[y, x])) for y, x in zip(*np.nonzero(lab == 'ramp'))]
    # (e) the feel report's formula (all pixels of the view at the 2004 scale)
    a = c / 255.0
    mx, mn = a.max(axis=2), a.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    lum = lum_of(a)
    bp = block_px(screen)
    # per surface family (each block by its mean colour): green = grass / leaves, grey = stone / plaster / cobbles,
    # earth = dirt / wood / roofs / sand, blue = water / sky: how much of it is textured, and how contrasty the texture is
    fam = {}
    bm = c[:H * BLOCK, :W * BLOCK].reshape(H, BLOCK, W, BLOCK, 3).mean(axis=(1, 3)) / 255.0
    hsv_max, hsv_min = bm.max(-1), bm.min(-1)
    bs = np.where(hsv_max > 0, (hsv_max - hsv_min) / np.maximum(hsv_max, 1e-6), 0)
    r, g, b = bm[..., 0], bm[..., 1], bm[..., 2]
    hue = (np.degrees(np.arctan2(np.sqrt(3) * (g - b), 2 * r - g - b)) + 360) % 360
    fams = {'grey': bs < 0.18, 'green': (bs >= 0.18) & (hue >= 65) & (hue < 170), 'earth': (bs >= 0.18) & ((hue < 65) | (hue >= 300)),
            'blue': (bs >= 0.18) & (hue >= 170) & (hue < 300)}
    hfb = hf[:H * BLOCK, :W * BLOCK].reshape(H, BLOCK, W, BLOCK).mean(axis=(1, 3))
    for k, m in fams.items():
        m = m & surf
        if m.sum() >= 20:
            fam[k] = {'share': round(float(m.sum() / max(1, surf.sum())), 3), 'busy': round(float((lab[m] == 'busy').mean()), 3), 'hf': round(float(hfb[m].mean()), 2)}
    return {
        'faceting': {'facet_share': round(n['step'] / plain, 3), 'ramp_share': round(n['ramp'] / plain, 3), 'flat_share': round(n['flat'] / plain, 3),
                     'plain_of_view': round(plain / solid, 3)},
        'texture': {'busy_share': round(n['busy'] / solid, 3), 'surface_hf': round(float(hfc.mean()) if hfc.size else 0, 2),
                    'edge_share': round(n['edge'] / solid, 3)},
        'colour': {'unique': int(len(uniq)), 'colours_90': col90, 'ramp_levels': round(float(np.mean(rl)), 1) if rl else None},
        'pixels': {'block_px': bp, 'lines': int(round(lines / bp)) if kind != '2004' else lines,
                   'lines_per_deg': round((lines / bp if kind != '2004' else lines) / VFOV, 2)},
        'light': {'lum_mean': round(float(lum.mean()), 3), 'lum_std': round(float(lum.std()), 3), 'mean_sat': round(float(sat.mean()), 3)},
        'blocks': n,
        'family': fam,
    }


def character(frame, plate, kind):
    """The same block shapes inside the adventurer only (frame minus a plate from the same camera with the player
    hidden), on the height-matched close-up: how the body is shaded (faces vs gradients) and how many colours it uses."""
    c, near, _, _ = load_view(frame, kind)
    p, pnear, _, _ = load_view(plate, kind)
    sil = np.abs(c - p).max(axis=2) > 12
    sil = ndimage.binary_opening(sil, iterations=1)
    lab, L, _ = classify_blocks(c)
    H, W = lab.shape
    inside = sil[:H * BLOCK, :W * BLOCK].reshape(H, BLOCK, W, BLOCK).transpose(0, 2, 1, 3).reshape(H, W, -1).all(-1)
    n = {k: int(((lab == k) & inside).sum()) for k in ['flat', 'ramp', 'step', 'edge', 'busy']}
    plain = (n['flat'] + n['ramp'] + n['step']) or 1
    allb = sum(n.values()) or 1
    nv = near[sil[:near.shape[0], :near.shape[1]]].astype(np.int64)
    Ls = L[sil[:L.shape[0], :L.shape[1]]]
    return {'char_facet_share': round(n['step'] / plain, 3), 'char_ramp_share': round(n['ramp'] / plain, 3), 'char_flat_share': round(n['flat'] / plain, 3),
            'char_busy_share': round(n['busy'] / allb, 3), 'char_colours': int(len(np.unique(nv[:, 0] * 65536 + nv[:, 1] * 256 + nv[:, 2]))),
            'char_px': int(sil.sum()), 'char_lum_std': round(float(Ls.std()), 1), 'char_blocks': allb}


def flat_metrics(m):
    out = {}
    for g, d in m.items():
        if g == 'blocks':
            continue
        if g == 'family':
            for fk, fv in d.items():
                for k, v in fv.items():
                    out['%s_%s' % (fk, k)] = v
            continue
        for k, v in d.items():
            out[k] = v
    return out


def mean_of(rows):
    keys = []
    for r in rows:
        keys += [k for k in r if r[k] is not None and k not in keys]
    return {k: round(float(np.mean([r[k] for r in rows if r.get(k) is not None])), 3) for k in keys}


# closeness to 2004: each number as a ratio (log) or a difference against the 2004 value, then averaged
SCORE = {'facet_share': ('diff', 0.10), 'ramp_share': ('diff', 0.10), 'flat_share': ('diff', 0.10), 'busy_share': ('diff', 0.10),
         'surface_hf': ('log', 0.5), 'unique': ('log', 0.7), 'colours_90': ('log', 0.7), 'lines_per_deg': ('log', 0.5),
         'lum_mean': ('diff', 0.05), 'mean_sat': ('diff', 0.10)}
# the adventurer close up: how its body shades and how many colours it uses
CHAR_SCORE = {'char_facet_share': ('diff', 0.10), 'char_ramp_share': ('diff', 0.10), 'char_flat_share': ('diff', 0.10), 'char_colours': ('log', 0.7)}


def distance(ours, ref, score=None):
    parts = {}
    for k, (how, unit) in (score or SCORE).items():
        if ours.get(k) is None or ref.get(k) is None:
            continue
        if how == 'log':
            d = abs(np.log(max(ours[k], 1e-6) / max(ref[k], 1e-6))) / unit
        else:
            d = abs(ours[k] - ref[k]) / unit
        parts[k] = round(float(d), 2)
    return round(float(np.mean(list(parts.values()))), 3), parts


def options(root):
    d4 = os.path.join(CAP, 'scenery', '2004')
    res = {'2004': {}, 'options': {}}
    for kind, pre in KINDS:
        rows = [flat_metrics(measure(p, '2004')) for p in sorted(glob.glob(os.path.join(d4, pre + '*_p128_y*.png'))) if os.path.basename(p) not in EXCLUDE]
        res['2004'][kind] = mean_of(rows)
    res['2004']['all'] = mean_of([res['2004'][k] for k, _ in KINDS])
    c4 = os.path.join(CAP, 'characters', '2004', 'm')
    res['2004']['character'] = mean_of([character(os.path.join(c4, 'close_rel%d.png' % r), os.path.join(c4, 'close_rel%d_plate.png' % r), '2004') for r in (0, 256)])
    for opt in sorted(os.listdir(root)):
        od = os.path.join(root, opt, 'scenery')
        if not os.path.isdir(od):
            continue
        r = {}
        for kind, pre in KINDS:
            files = sorted(glob.glob(os.path.join(od, pre + 'holm_p128_y*.png')))
            if files:
                r[kind] = mean_of([flat_metrics(measure(p, 'ours')) for p in files])
        if not r:
            continue
        r['all'] = mean_of([r[k] for k, _ in KINDS if k in r])
        r['distance'], r['distance_parts'] = distance(r['all'], res['2004']['all'])
        cd = os.path.join(root, opt, 'character')
        # the sun at four sides of the body (capture_look_options.js), front and 3/4 front each
        files = sorted(glob.glob(os.path.join(cd, 'close_f*_rel*.png')))
        files = [p for p in files if not p.endswith('_plate.png')] or [os.path.join(cd, 'close_rel%d.png' % q) for q in (0, 256)]
        ch = [character(p, p.replace('.png', '_plate.png'), 'ours') for p in files if os.path.exists(p.replace('.png', '_plate.png'))]
        if ch:
            r['character'] = mean_of(ch)
            r['char_distance'], r['char_distance_parts'] = distance(r['character'], res['2004']['character'], CHAR_SCORE)
            # one number: the scenery and the adventurer weighed alike
            r['overall'] = round((r['distance'] + r['char_distance']) / 2, 3)
        res['options'][opt] = r
    out = os.path.join(root, 'metrics.json')
    json.dump(res, open(out, 'w'), indent=1)
    cols = ['facet_share', 'ramp_share', 'flat_share', 'busy_share', 'surface_hf', 'unique', 'colours_90', 'ramp_levels', 'block_px', 'lines_per_deg', 'lum_mean', 'mean_sat']
    print('%-8s' % '' + ''.join('%12s' % c[:11] for c in cols) + '    dist')
    print('%-8s' % '2004' + ''.join('%12s' % res['2004']['all'].get(c) for c in cols))
    for o, r in res['options'].items():
        print('%-8s' % o + ''.join('%12s' % r['all'].get(c) for c in cols) + '   %6.3f' % r['distance'])
    cc = ['char_facet_share', 'char_ramp_share', 'char_flat_share', 'char_busy_share', 'char_colours', 'char_lum_std', 'char_px']
    print('%-8s' % 'char' + ''.join('%12s' % c[5:16] for c in cc))
    print('%-8s' % '2004' + ''.join('%12s' % res['2004']['character'].get(c) for c in cc))
    for o, r in res['options'].items():
        if 'character' in r:
            print('%-8s' % o + ''.join('%12s' % r['character'].get(c) for c in cc) + '   %6.3f' % r['char_distance'])
    print('overall distance to 2004 (scenery + adventurer): ' + ', '.join('%s %.3f' % (o, r['overall']) for o, r in res['options'].items() if 'overall' in r))
    print('->', out)
    return res


LABEL_RGB = {'flat': (60, 170, 60), 'ramp': (60, 110, 220), 'step': (240, 200, 40), 'edge': (230, 60, 60), 'busy': (150, 150, 150), 'void': (0, 0, 0)}


def label_map(path, kind, out):
    """A picture of the block classes over the view at the 2004 scale (for checking the classifier by eye)."""
    c, *_ = load_view(path, kind)
    lab, *_ = classify_blocks(c)
    img = np.zeros(lab.shape + (3,), np.uint8)
    for k, rgb in LABEL_RGB.items():
        img[lab == k] = rgb
    big = np.repeat(np.repeat(img, BLOCK, 0), BLOCK, 1)
    base = c[:big.shape[0], :big.shape[1]]
    Image.fromarray((base * 0.45 + big * 0.55).astype(np.uint8)).resize((big.shape[1] * 2, big.shape[0] * 2), Image.NEAREST).save(out)


if __name__ == '__main__':
    what = sys.argv[1] if len(sys.argv) > 1 else 'options'
    if what == 'image':
        print(json.dumps(measure(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else 'ours'), indent=1))
        if len(sys.argv) > 4:
            label_map(sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        options(sys.argv[2] if len(sys.argv) > 2 else os.path.join(CAP, 'look_options'))
