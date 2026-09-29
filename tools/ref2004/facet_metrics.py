"""Faceting / shading-discontinuity numbers for the character close-ups (owner review 5, round 2: "2004's character shows
more flat planes ... ours looks too polished and round"). Same measure for the 2004 reference and for our captures.

    python tools/ref2004/facet_metrics.py <capture dir> [<capture dir> ...]      -> JSON per dir

For each close-up view (close_rel0 front, close_rel256 3/4, close_rel512 side) the character's silhouette (frame vs plate)
is scaled to the same height (H = 230 px, the 2004 close-up's own size; ours is area-averaged down, 2004 is not resampled)
and split into colour regions (skin, shirt, trousers, boots ... by hue / chroma clustering) so a colour boundary never
counts as a facet. Inside each region, away from its border, every pair of neighbouring pixels is classed by the change in
luminance |dL| (0-255):
  flat   |dL| < 1.5    -- the same plane
  ramp   1.5-8         -- a smooth shading gradient
  step   >= 8          -- a crease between two planes
Reported (pixel-pair weighted over the regions of the three views):
  planarity        flat / (flat + ramp): 1 = every panel evenly lit (faceted), low = smooth shading everywhere
  crease_per_100   step pairs per 100 pairs: how many plane edges cross the surfaces
  facets_per_1k    connected areas of one quantised luminance level (6 %) bigger than 12 px, per 1000 px of the body
Plain numbers only; the 2004 frames never leave C:/Users/iQwaZ/ref2004_captures.
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import analyze as A  # noqa: E402

H_REF = 230


def luminance(a):
    return 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]


def regions(rgb, mask, k=5):
    """colour regions inside the mask: k-means on (hue-ish chroma a, b) of the normalised colour (luminance removed)"""
    px = rgb[mask].astype(np.float64)
    s = px.sum(axis=1, keepdims=True) + 1e-6
    ch = px / s                       # chromaticity: independent of how brightly a plane is lit
    rng = np.random.default_rng(1)
    cent = ch[rng.choice(len(ch), size=min(k, len(ch)), replace=False)]
    for _ in range(25):
        d = ((ch[:, None, :] - cent[None, :, :]) ** 2).sum(axis=2)
        lab = d.argmin(axis=1)
        new = np.array([ch[lab == i].mean(axis=0) if np.any(lab == i) else cent[i] for i in range(len(cent))])
        if np.allclose(new, cent):
            break
        cent = new
    out = np.full(mask.shape, -1, np.int16)
    out[mask] = lab
    return out


def view_measures(frame, plate, game):
    if game == '2004':
        frame, plate = frame.crop(A.VIEW2004), plate.crop(A.VIEW2004)
    m = A.silhouette(frame, plate, (frame.width / 2, frame.height / 2), thr=8 if game == '2004' else 14)
    if m is None:
        return None
    ys, xs = np.nonzero(m)
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    im = frame.crop(box)
    mk = Image.fromarray((m[box[1]:box[3], box[0]:box[2]] * 255).astype(np.uint8))
    s = H_REF / im.height
    if abs(s - 1) > .05:
        size = (max(1, round(im.width * s)), H_REF)
        im = im.resize(size, Image.BOX if s < 1 else Image.NEAREST)
        mk = mk.resize(size, Image.BOX if s < 1 else Image.NEAREST)
    rgb = np.asarray(im.convert('RGB')).astype(np.float64)
    mask = np.asarray(mk) > 200
    mask = ndimage.binary_erosion(mask, iterations=2)          # away from the outline (antialiasing / background)
    reg = regions(rgb, mask)
    L = luminance(rgb)
    flat = ramp = step = 0
    for dy, dx in ((0, 1), (1, 0)):
        a_ = reg[:L.shape[0] - dy, :L.shape[1] - dx]
        b_ = reg[dy:, dx:]
        same = (a_ >= 0) & (a_ == b_)
        # the pair must also sit inside its region, not on the region's border (colour edges antialias)
        inner = ndimage.binary_erosion(reg >= 0, iterations=1)[:L.shape[0] - dy, :L.shape[1] - dx]
        d = np.abs(L[dy:, dx:] - L[:L.shape[0] - dy, :L.shape[1] - dx])[same & inner]
        flat += int((d < 1.5).sum())
        ramp += int(((d >= 1.5) & (d < 8)).sum())
        step += int((d >= 8).sum())
    # facets: connected areas of one quantised luminance level within one region
    q = np.floor(L / (255 * .06)).astype(np.int32)
    nfac = 0
    for r in np.unique(reg[reg >= 0]):
        rm = reg == r
        for lv in np.unique(q[rm]):
            lab, n = ndimage.label(rm & (q == lv))
            if n:
                sz = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
                nfac += int((np.asarray(sz) > 12).sum())
    tot = flat + ramp + step
    return {'pairs': tot, 'flat': flat, 'ramp': ramp, 'step': step, 'body_px': int(mask.sum()), 'facets': nfac}


def capture(gdir):
    game = '2004' if os.sep + '2004' + os.sep in gdir.replace('/', os.sep) else 'ours'
    views = {}
    for rel, name in ((0, 'front'), (256, '3/4'), (512, 'side')):
        f, p = os.path.join(gdir, 'close_rel%d.png' % rel), os.path.join(gdir, 'close_rel%d_plate.png' % rel)
        if os.path.exists(f) and os.path.exists(p):
            views[name] = view_measures(A.load(f), A.load(p), game)
    v = [x for x in views.values() if x]
    if not v:
        return {'dir': gdir, 'error': 'no close-ups'}
    flat, ramp, step = sum(x['flat'] for x in v), sum(x['ramp'] for x in v), sum(x['step'] for x in v)
    tot = flat + ramp + step
    return {'dir': gdir, 'game': game,
            'planarity': round(flat / max(1, flat + ramp), 3),
            'crease_per_100': round(100 * step / max(1, tot), 2),
            'facets_per_1k': round(1000 * sum(x['facets'] for x in v) / max(1, sum(x['body_px'] for x in v)), 2),
            'views': {k: (None if x is None else {'planarity': round(x['flat'] / max(1, x['flat'] + x['ramp']), 3),
                                                  'crease_per_100': round(100 * x['step'] / max(1, x['pairs']), 2),
                                                  'facets_per_1k': round(1000 * x['facets'] / max(1, x['body_px']), 2)}) for k, x in views.items()}}


if __name__ == '__main__':
    print(json.dumps([capture(d) for d in sys.argv[1:]], indent=1))
