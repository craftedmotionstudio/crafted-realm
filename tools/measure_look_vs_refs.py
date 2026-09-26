"""Look measurements, ours vs the Bible references (world look pass 2, 2026-09-26).

Owner, 2026-09-26: "the overall feel is a little bit too polished; it needs to feel more like old school and follow more
like the Bible references style ... I think it might be [a textures thing]". Every look change is measured here, per
surface class (grass, path, sand, foliage, trunk, wall, roof, water), on the same numbers for our captures and the refs:
  L, S, H   HLS lightness / saturation / hue (degrees) of the region's mean colour (0..1, 0..1, 0..360)
  sd        spread of lightness inside the region (std of per-pixel luma, 0..255): blotchy vs even surfaces
  fine      local texture contrast: mean |luma difference| between neighbouring pixels inside the region (0..255),
            measured with every image scaled to the same 900 px screen height (our captures' height; large refs are
            area-averaged down, small 2004-size refs are nearest-scaled up the way a pixel-scaled client shows them)
  coarse    the same on 4 x 4 averaged pixels: the leaf-clump / blotch scale rather than the pixel speckle
  native    fine contrast at the image's own resolution (the numbers in the owner-review diagnosis)
Regions: refs use hand-picked boxes (docs/rebuild/holm-overhaul/oldschool/look_ref_regions.json, check them with
`regions`); our captures use the class mask that tools/capture_holm_look.js renders next to every view (LOOK_MASK=1,
<view>.mask.png: every mesh drawn in a flat class colour), eroded 2 px so silhouette edges never count as texture.
The reference band of a metric is the min..max over the refs that show the class, widened by a small tolerance (TOL).
Run:
  python tools/measure_look_vs_refs.py refs                       reference numbers + bands -> scratchpad/holm_look_v2/ref_bands.json
  python tools/measure_look_vs_refs.py regions                    draws the ref boxes -> scratchpad/holm_look_v2/ref_regions/
  python tools/measure_look_vs_refs.py capture <dir> [<dir> ...]  measures every <view>.png + mask -> <dir>/measure.json
  python tools/measure_look_vs_refs.py compare <dir> [<dir> ...]  class averages side by side, marks values outside the band
(<dir> is a capture folder, e.g. scratchpad/holm_look_v2/live, or a tag under scratchpad/holm_look_v2/)"""
import colorsys, json, math, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / 'Bible_References'
REGIONS = ROOT / 'docs' / 'rebuild' / 'holm-overhaul' / 'oldschool' / 'look_ref_regions.json'
OUT = ROOT / 'scratchpad' / 'holm_look_v2'
NORM_H = 900
COARSE = 4
MIN_PIXELS = 600          # a class needs this many (eroded, 900-scale) pixels in a view to be measured
ERODE = 2
# the flat class colours of the capture mask pass (tools/capture_holm_look.js MASK_CLASSES, keep in step)
CLASSES = {'grass': (0, 200, 0), 'path': (200, 100, 0), 'sand': (230, 220, 0), 'foliage': (0, 80, 255),
           'trunk': (120, 40, 160), 'wall': (255, 0, 255), 'roof': (255, 0, 0), 'water': (0, 220, 220)}
METRICS = ['L', 'S', 'H', 'sd', 'fine', 'coarse']
# band tolerance: absolute for L/S/H, relative for the spread/contrast numbers (a single ref sample still gets a band)
TOL = {'L': .02, 'S': .03, 'H': 6.0, 'sd': .25, 'fine': .35, 'coarse': .3}
REL = {'sd', 'fine', 'coarse'}
GREY = .08                # below this saturation a surface is grey: its hue is neither banded nor flagged
MATCH = 14                # max channel difference to count a mask pixel as a class colour (MSAA edge blends drop out)


def luma(a):
    return a[..., 0] * .299 + a[..., 1] * .587 + a[..., 2] * .114


def normalise(im):
    """The image at the common 900 px screen height: area-averaged down, or nearest-scaled up (pixel-scaled client)."""
    if im.height == NORM_H:
        return im
    w = round(im.width * NORM_H / im.height)
    return im.resize((w, NORM_H), Image.BOX if im.height > NORM_H else Image.NEAREST)


def pair_contrast(y, m):
    """mean |dY| over horizontally and vertically neighbouring pixel pairs that are both inside the mask"""
    dx = np.abs(y[:, 1:] - y[:, :-1])[m[:, 1:] & m[:, :-1]]
    dy = np.abs(y[1:, :] - y[:-1, :])[m[1:, :] & m[:-1, :]]
    d = np.concatenate([dx, dy])
    return float(d.mean()) if d.size else float('nan')


def pool(a, m, k):
    h, w = (a.shape[0] // k) * k, (a.shape[1] // k) * k
    a2 = a[:h, :w].reshape(h // k, k, w // k, k, *a.shape[2:]).mean(axis=(1, 3))
    m2 = m[:h, :w].reshape(h // k, k, w // k, k).all(axis=(1, 3))
    return a2, m2


def measure(arr, mask, native=None):
    """arr: HxWx3 float (0..255) at the 900 px scale; mask: HxW bool. native: (arr, mask) at the image's own scale."""
    n = int(mask.sum())
    if n == 0:
        return None
    px = arr[mask]
    mean = px.mean(axis=0)
    h, l, s = (float(v) for v in colorsys.rgb_to_hls(*(float(c) / 255.0 for c in mean)))
    y = luma(arr)
    ca, cm = pool(arr, mask, COARSE)
    r = {'n': n, 'rgb': [round(float(v), 1) for v in mean], 'L': round(l, 4), 'S': round(s, 4), 'H': round(h * 360, 1),
         'sd': round(float(y[mask].std()), 3), 'fine': round(pair_contrast(y, mask), 3),
         'coarse': round(pair_contrast(luma(ca), cm), 3)}
    if native is not None:
        r['native'] = round(pair_contrast(luma(native[0]), native[1]), 3)
    return r


def load_rgb(path):
    return Image.open(path).convert('RGB')


def boxes_mask(shape, boxes):
    m = np.zeros(shape, bool)
    H, W = shape
    for x0, y0, x1, y1 in boxes:
        m[round(y0 * H):round(y1 * H), round(x0 * W):round(x1 * W)] = True
    return m


def ref_numbers():
    spec = json.loads(REGIONS.read_text())['refs']
    out = {}
    for name, classes in spec.items():
        im = load_rgb(REF / name)
        nat = np.asarray(im, np.float32)
        norm = normalise(im)
        arr = np.asarray(norm, np.float32)
        colour_only = classes.get('colourOnly', False)
        out[name] = {'size': list(im.size), 'colourOnly': colour_only, 'classes': {}}
        for cls, boxes in classes.items():
            if cls == 'colourOnly':
                continue
            r = measure(arr, boxes_mask(arr.shape[:2], boxes), (nat, boxes_mask(nat.shape[:2], boxes)))
            if colour_only:
                for k in ('sd', 'fine', 'coarse', 'native'):
                    r.pop(k, None)
            out[name]['classes'][cls] = r
    return out


def bands_from(refs):
    bands = {}
    for cls in CLASSES:
        vals = {k: [] for k in METRICS + ['native']}
        for name, rr in refs.items():
            r = rr['classes'].get(cls)
            if not r:
                continue
            for k in vals:
                if k in r and not (k == 'H' and r['S'] < GREY):   # a grey surface has no meaningful hue
                    vals[k].append(r[k])
        if not vals['L']:
            continue
        b = {}
        for k in METRICS:
            v = vals[k]
            if not v:
                continue
            lo, hi = min(v), max(v)
            if k in REL:
                lo, hi = lo * (1 - TOL[k]), hi * (1 + TOL[k])
            else:
                lo, hi = lo - TOL[k], hi + TOL[k]
            b[k] = [round(lo, 4), round(hi, 4)]
        b['refs'] = len(vals['L'])
        if vals['native']:
            b['nativeRefs'] = [min(vals['native']), max(vals['native'])]
        bands[cls] = b
    return bands


def get_bands():
    p = OUT / 'ref_bands.json'
    if p.exists() and p.stat().st_mtime > REGIONS.stat().st_mtime and p.stat().st_mtime > Path(__file__).stat().st_mtime:
        return json.loads(p.read_text())['bands']
    return write_refs(quiet=True)


def write_refs(quiet=False):
    refs = ref_numbers()
    bands = bands_from(refs)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'ref_bands.json').write_text(json.dumps({'schema': 'crafted-realm-look-ref-bands-v1', 'normHeight': NORM_H,
                                                    'tolerance': TOL, 'refs': refs, 'bands': bands}, indent=1))
    if not quiet:
        print(f'{"ref":38s} {"class":8s} {"L":>6s} {"S":>6s} {"H":>6s} {"sd":>6s} {"fine":>6s} {"coarse":>6s} {"native":>6s}')
        for name, rr in refs.items():
            for cls, r in rr['classes'].items():
                print(f'{name[:38]:38s} {cls:8s} ' + ' '.join(f'{r.get(k, float("nan")):6.3f}' if k != 'H' else f'{r["H"]:6.1f}'
                                                            for k in ['L', 'S', 'H', 'sd', 'fine', 'coarse', 'native']))
        print('\nbands (min..max over refs, widened by TOL):')
        for cls, b in bands.items():
            print(f'  {cls:8s} ' + '  '.join(f'{k} {b[k][0]:.3g}..{b[k][1]:.3g}' for k in METRICS if k in b) + f'  ({b["refs"]} refs)')
        print('->', OUT / 'ref_bands.json')
    return bands


def draw_regions():
    spec = json.loads(REGIONS.read_text())['refs']
    d_out = OUT / 'ref_regions'
    d_out.mkdir(parents=True, exist_ok=True)
    for name, classes in spec.items():
        im = load_rgb(REF / name)
        w = 1600
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        d = ImageDraw.Draw(im)
        for cls, boxes in classes.items():
            if cls == 'colourOnly':
                continue
            c = CLASSES[cls]
            for x0, y0, x1, y1 in boxes:
                d.rectangle([x0 * im.width, y0 * im.height, x1 * im.width, y1 * im.height], outline=c, width=3)
                d.text((x0 * im.width + 3, y0 * im.height + 2), cls, fill=c)
        im.save(d_out / (Path(name).stem + '.png'))
    print('regions ->', d_out)


def class_masks(mask_img):
    """mask png -> {class: bool mask}, eroded so silhouette edges never count"""
    a = np.asarray(mask_img, np.int16)
    out = {}
    for cls, c in CLASSES.items():
        m = (np.abs(a - np.array(c, np.int16)).max(axis=2) <= MATCH)
        for _ in range(ERODE if m.any() else 0):   # erode by one pixel per pass (4-neighbour)
            e = m.copy()
            e[1:, :] &= m[:-1, :]
            e[:-1, :] &= m[1:, :]
            e[:, 1:] &= m[:, :-1]
            e[:, :-1] &= m[:, 1:]
            m = e
        out[cls] = m
    return out


def resolve(d):
    p = Path(d)
    if not p.is_absolute():
        p = (OUT / d) if (OUT / d).is_dir() else (ROOT / d)
    return p


def measure_dir(d):
    d = resolve(d)
    res = {}
    for shot in sorted(d.glob('*.png')):
        if shot.name.endswith('.mask.png'):
            continue
        mp = shot.with_name(shot.stem + '.mask.png')
        if not mp.exists():
            continue
        im, mk = load_rgb(shot), load_rgb(mp)
        if mk.size != im.size:
            mk = mk.resize(im.size, Image.NEAREST)
        nat = np.asarray(im, np.float32)
        masks = class_masks(mk)
        norm = normalise(im)
        arr = np.asarray(norm, np.float32)
        view = {}
        for cls, m in masks.items():
            mn = m if norm.size == im.size else np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize(norm.size, Image.NEAREST)) > 127
            if mn.sum() < MIN_PIXELS:
                continue
            view[cls] = measure(arr, mn, (nat, m))
        res[shot.stem] = view
    (d / 'measure.json').write_text(json.dumps({'schema': 'crafted-realm-look-measure-v1', 'dir': str(d), 'views': res}, indent=1))
    return res


def summary(res):
    """pixel-weighted class averages over every view of a capture"""
    acc = {}
    for view in res.values():
        for cls, r in view.items():
            a = acc.setdefault(cls, {'w': 0, **{k: 0.0 for k in METRICS}, 'hx': 0.0, 'hy': 0.0})
            w = math.sqrt(r['n'])  # large panoramas should not drown the close views
            a['w'] += w
            for k in METRICS:
                if k != 'H':
                    a[k] += r[k] * w
            a['hx'] += math.cos(math.radians(r['H'])) * w
            a['hy'] += math.sin(math.radians(r['H'])) * w
    out = {}
    for cls, a in acc.items():
        o = {k: a[k] / a['w'] for k in METRICS if k != 'H'}
        o['H'] = math.degrees(math.atan2(a['hy'], a['hx'])) % 360
        out[cls] = o
    return out


def flag(v, band):
    if band is None:
        return ' '
    return '+' if v > band[1] else '-' if v < band[0] else ' '


def in_band(v, band):
    return band is None or band[0] <= v <= band[1]


def fmt(k, v):
    return f'{v:6.1f}' if k == 'H' else f'{v:6.3f}' if k in ('L', 'S') else f'{v:6.2f}'


def print_compare(dirs):
    bands = get_bands()
    sums = []
    for d in dirs:
        p = resolve(d) / 'measure.json'
        res = json.loads(p.read_text())['views'] if p.exists() else measure_dir(d)
        sums.append(summary(res))
    print('class averages over the views (sqrt-pixel weighted); "+"/"-" = above/below the reference band')
    head = f'{"class":8s} {"metric":6s} {"ref band":>15s} ' + ' '.join(f'{Path(str(d)).name[:12]:>13s}' for d in dirs)
    print(head)
    outside = [0] * len(dirs)
    for cls in CLASSES:
        if not any(cls in s for s in sums):
            continue
        b = bands.get(cls, {})
        for k in METRICS:
            bb = b.get(k)
            row = f'{cls:8s} {k:6s} {(fmt(k, bb[0]).strip() + ".." + fmt(k, bb[1]).strip()) if bb else "-":>15s} '
            for i, s in enumerate(sums):
                if cls in s:
                    v = s[cls][k]
                    f = flag(v, bb) if not (k == 'H' and s[cls]['S'] < GREY) else ' '
                    outside[i] += f != ' '
                    row += f'{fmt(k, v):>12s}{f}'
                else:
                    row += f'{"":>13s}'
            print(row)
    print('values outside the band: ' + ', '.join(f'{Path(str(d)).name}={o}' for d, o in zip(dirs, outside)))
    return sums


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'refs'
    if cmd == 'refs':
        write_refs()
    elif cmd == 'regions':
        draw_regions()
    elif cmd == 'capture':
        for d in sys.argv[2:]:
            measure_dir(d)
            print('measured', resolve(d))
        print_compare(sys.argv[2:])
    elif cmd == 'compare':
        print_compare(sys.argv[2:])
    else:
        print(__doc__)
        sys.exit(2)


if __name__ == '__main__':
    main()
