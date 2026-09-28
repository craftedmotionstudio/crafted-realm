"""Character kit v4 OPTIONS -- silhouette + gait metrics and similarity scores (owner review 2026-09-27).

The same measuring code runs on our renders and on reference screenshots, so the numbers compare like for like. Nothing
from any reference is stored here: the script reads images from wherever they are and writes numbers only.

  python tools/holm_char_metrics_v4.py sil IMG [--crop x0,y0,x1,y1] [--view front|side] [--mask OUT.png]
  python tools/holm_char_metrics_v4.py score OURS.json REF.json [--out SCORE.json]

Silhouette metrics (all ratios of the standing height H, rows measured from the top of the head):
  head_ratio   top of head -> chin / H          chin = where the outline narrows from the head into the neck
  neck_len     chin -> shoulder-start / H        shoulder-start = first row twice as wide as the neck
  neck_w       narrowest neck width / H
  shoulder_w   widest row in the shoulder band / H (arms included, as in the 2004 outline)
  shoulder_deg slope of the top outline from the neck edge to the shoulder tip (0 = level, + = sloping down)
  hand_h       fingertips above the ground / H (the lowest separate arm pixels)
  arm_spread   outer width at elbow level / shoulder width
  crotch_h     legs split above the ground / H
  foot_len     (side view) sole length / H
"""
import sys, json, math
import numpy as np
from PIL import Image

try:
    from scipy import ndimage
except Exception:   # pragma: no cover
    ndimage = None


def load_mask(path, crop=None, bg=None, thr=30.0, plate=None, plate_thr=24, open_iter=1):
    im = Image.open(path)
    if crop:
        im = im.crop(crop)
    if plate:   # a plate = the same frame without the character: the mask is the difference
        pl = Image.open(plate)
        if crop:
            pl = pl.crop(crop)
        d = np.abs(np.asarray(im.convert('RGB')).astype(int) - np.asarray(pl.convert('RGB')).astype(int)).sum(2)
        m = d > plate_thr
    elif im.mode == 'RGBA' and np.asarray(im)[..., 3].min() < 250:
        m = np.asarray(im)[..., 3] > 40
    else:
        a = np.asarray(im.convert('RGB')).astype(float)
        if bg is None:   # background = the border colours (textured panels: distance to the nearest border cluster)
            border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
            q = (border // 12).astype(int)
            keys, counts = np.unique(q[:, 0] * 10000 + q[:, 1] * 100 + q[:, 2], return_counts=True)
            cols = []
            for k in keys[np.argsort(-counts)][:6]:
                sel = (q[:, 0] * 10000 + q[:, 1] * 100 + q[:, 2]) == k
                cols.append(border[sel].mean(0))
        else:
            cols = [np.array(bg, float)]
        d = np.min([np.linalg.norm(a - c, axis=2) for c in cols], axis=0)
        m = d > thr
    if ndimage is not None:
        if open_iter:
            m = ndimage.binary_opening(m, iterations=open_iter)
        lab, n = ndimage.label(m)
        if n > 1:
            sizes = ndimage.sum(m, lab, range(1, n + 1))
            m = lab == (1 + int(np.argmax(sizes)))
        m = ndimage.binary_fill_holes(m)
    return m


def runs(row):
    """[(x0, x1)] runs of True in a 1-D bool array"""
    x = np.flatnonzero(np.diff(np.concatenate([[0], row.astype(int), [0]])))
    return list(zip(x[::2], x[1::2] - 1))


def sil_metrics(m, view='front'):
    ys = np.flatnonzero(m.any(1))
    top, bot = int(ys[0]), int(ys[-1])
    H = bot - top + 1
    span = np.zeros(m.shape[0]); cx = np.zeros(m.shape[0])
    for y in range(top, bot + 1):
        xs = np.flatnonzero(m[y])
        span[y] = xs[-1] - xs[0] + 1
        cx[y] = (xs[-1] + xs[0]) / 2
    out = {'H_px': H}
    if view == 'side':
        low = [y for y in range(bot - max(2, int(.012 * H)), bot + 1)]
        out['foot_len'] = float(max(span[y] for y in low) / H)
        mid = [y for y in range(top + int(.20 * H), top + int(.45 * H))]
        out['body_depth'] = float(np.median([span[y] for y in mid]) / H)
        return out
    # the central run (the one over the body's centre line) = the head / neck / torso without the arms
    c0 = int(np.median(cx[top:top + int(.5 * H)]))
    def central(y):
        for a, b in runs(m[y]):
            if a <= c0 <= b:
                return a, b
        return None
    cw = np.zeros(m.shape[0])
    for y in range(top, bot + 1):
        r = central(y)
        cw[y] = (r[1] - r[0] + 1) if r else 0
    band = range(top + int(.07 * H), top + int(.26 * H))
    neck_y = min(band, key=lambda y: (cw[y] if cw[y] > 0 else 1e9, y))
    neck_w = cw[neck_y]
    head_rows = range(top, neck_y + 1)
    hy = max(head_rows, key=lambda y: cw[y])
    head_w = cw[hy]
    chin_y = next((y for y in range(hy, neck_y + 1) if cw[y] <= neck_w + .35 * (head_w - neck_w)), neck_y)
    sh_y = next((y for y in range(neck_y, top + int(.35 * H)) if cw[y] >= 2.0 * neck_w), neck_y)
    sband = range(sh_y, min(bot, sh_y + int(.12 * H)))
    sw_y = max(sband, key=lambda y: span[y])
    out.update(head_ratio=float((chin_y - top) / H), neck_len=float((sh_y - chin_y) / H), neck_w=float(neck_w / H),
               head_w=float(head_w / H), shoulder_w=float(span[sw_y] / H))
    # shoulder line: top outline from the neck edge to the shoulder tip, both sides
    slopes = []
    xs_sw = np.flatnonzero(m[sw_y])
    for side in (-1, 1):
        r = central(neck_y)
        x_neck = r[1] if side > 0 else r[0]
        x_tip = xs_sw[-1] if side > 0 else xs_sw[0]
        pts = []
        n = abs(x_tip - x_neck)
        for i in range(int(.15 * n), int(.85 * n) + 1):
            x = x_neck + side * i
            col = np.flatnonzero(m[chin_y:, x])
            if len(col):
                pts.append((i, chin_y + col[0]))
        if len(pts) > 3:
            p = np.polyfit([q[0] for q in pts], [q[1] for q in pts], 1)
            slopes.append(math.degrees(math.atan(p[0])))
    out['shoulder_deg'] = float(np.mean(slopes)) if slopes else None
    # arms: rows with separate runs left and right of the central run
    arm_rows = []
    for y in range(sh_y + int(.08 * H), bot + 1):
        rr = runs(m[y]); c = central(y)
        if c and any(b < c[0] for a, b in rr) and any(a > c[1] for a, b in rr):
            arm_rows.append(y)
    if arm_rows:
        hand_y = max(arm_rows)
        out['hand_h'] = float((bot - hand_y) / H)
        elbow_y = top + int(.40 * H)
        out['arm_spread'] = float(span[elbow_y] / span[sw_y])
    # crotch: highest row (below the hips) where the body's centre column is background and both legs are present
    for y in range(top + int(.40 * H), bot):
        if not m[y, c0] and len(runs(m[y])) >= 2:
            out['crotch_h'] = float((bot - y) / H)
            break
    return out


def gait_sil(masks, ground=None):
    """side-view gait numbers from one cycle of silhouettes (camera pitched like the game): bob = variation of the
    apparent height, feet spread = extent of the lowest 12% of the figure, hand band = extent of the 40-52% band (the arms'
    swing in front of / behind the body); all / the median apparent height"""
    rows = []
    for m in masks:
        ys, xs = np.nonzero(m)
        if not len(ys):
            continue
        top, bot = ys.min(), ys.max()
        hh = bot - top + 1
        low = np.nonzero(m[bot - int(.12 * hh):bot + 1].any(0))[0]
        mid = np.nonzero(m[top + int(.40 * hh):top + int(.52 * hh)].any(0))[0]
        g = ground if ground is not None else bot
        rows.append((g - top, hh, low.max() - low.min() + 1, mid.max() - mid.min() + 1))
    hh = float(np.median([r[1] for r in rows]))
    ht = [r[0] for r in rows]
    return dict(bob_H=float((max(ht) - min(ht)) / hh), max_feet_spread_H=float(max(r[2] for r in rows) / hh),
                min_feet_spread_H=float(min(r[2] for r in rows) / hh), max_hand_band_H=float(max(r[3] for r in rows) / hh),
                min_hand_band_H=float(min(r[3] for r in rows) / hh), apparent_h_px=hh, samples=len(rows))


def harness_gait(masks, ground=None):
    """the REF2004 harness's gait numbers (tools/ref2004/analyze.py gait()) from one cycle of side silhouettes: bob = p95 - p5
    of the top above the ground, leg spread = p95 of the bottom 28 %'s extent, arm band = p95 / p5 of rows 28-55 %'s
    extent, lean = median atan2(top-quarter centroid - bottom-quarter centroid, 0.75 H), + = top ahead (to screen right);
    all / the median height. v4a.2b: the rubric grades the gait against the harness's 2004 numbers with these formulas."""
    tops, spreads, arms, leans, hs = [], [], [], [], []
    for m in masks:
        ys, xs = np.nonzero(m)
        if len(ys) < 30:
            continue
        top, bot = ys.min(), ys.max()
        H = bot - top + 1
        hs.append(H)
        tops.append((ground if ground is not None else bot) - top)
        lx = np.nonzero(m[bot - int(.28 * H):bot + 1].any(axis=0))[0]
        spreads.append(lx.max() - lx.min() + 1)
        bx = np.nonzero(m[top + int(.28 * H):top + int(.55 * H)].any(axis=0))[0]
        arms.append(bx.max() - bx.min() + 1)
        ct = np.nonzero(m[top:top + int(.25 * H)])[1].mean()
        cb = np.nonzero(m[bot - int(.25 * H):bot + 1])[1].mean()
        leans.append(math.degrees(math.atan2(ct - cb, .75 * H)))
    hm = float(np.median(hs))
    return dict(bob_H=float((np.percentile(tops, 95) - np.percentile(tops, 5)) / hm), leg_spread_H=float(np.percentile(spreads, 95) / hm),
                arm_band_max_H=float(np.percentile(arms, 95) / hm), arm_band_min_H=float(np.percentile(arms, 5) / hm),
                lean_deg=float(np.median(leans)), apparent_h_px=hm, samples=len(hs))


# criterion -> [(metric, tolerance)]: a difference of `tolerance` beyond the measuring noise scores 0, none scores 10.
# Tolerances are "clearly a different figure" (e.g. a head 20% taller, a shoulder line 15 deg steeper); the noise is what
# the reference's pixel size allows (1.5 px of its height for the ratios, 4 deg for slopes), so a match within the
# reference's own resolution scores 10.
CRITERIA = {
    'head/body ratio': [('head_ratio', .030), ('head_w', .030)],
    'shoulder line': [('shoulder_deg', 15.0), ('shoulder_w', .06)],
    'neck': [('neck_len', .030), ('neck_w', .025)],
    'arm hang': [('hand_h', .08), ('arm_spread', .25)],
    'legs/feet': [('crotch_h', .06), ('foot_len', .05)],
    'walk': [('walk_stride_H', .30), ('walk_poses', 6.0), ('walk_bob_H', .025), ('walk_max_feet_spread_H', .20),
             ('walk_max_hand_band_H', .15), ('walk_min_hand_band_H', .10)],
    'run': [('run_cycle_rel', .45), ('run_stride_H', .40), ('run_poses', 6.0), ('run_bob_H', .03), ('run_max_feet_spread_H', .25),
            ('run_max_hand_band_H', .15), ('run_min_hand_band_H', .10)],
}
# v4a.2b: the gait criteria against the REF2004 harness numbers (same formulas both sides; the same tolerances as the old
# criteria, the stride per step instead of per cycle, plus the walk cycle and the forward lean)
CRITERIA_HARNESS = dict(CRITERIA,
    walk=[('walk_cycle_rel', .45), ('walk_step_H', .15), ('walk_poses', 6.0), ('walk_bob_H', .025), ('walk_leg_spread_H', .20),
          ('walk_arm_band_max_H', .15), ('walk_arm_band_min_H', .10), ('walk_lean_deg', 10.0)],
    run=[('run_cycle_rel', .45), ('run_step_H', .20), ('run_poses', 6.0), ('run_bob_H', .03), ('run_leg_spread_H', .25),
         ('run_arm_band_max_H', .15), ('run_arm_band_min_H', .10), ('run_lean_deg', 10.0)])
NOISE_DEG = 4.0


def _noise(k, ref):
    if k.endswith('_lean_deg'):   # the harness's median over a cycle: ~1.5 deg between repeat captures
        return 1.5
    if k.endswith('_deg'):
        return NOISE_DEG
    if k.endswith('_rel'):
        return .05
    if k.endswith('_poses'):
        return 0.0
    if k.startswith(('walk_', 'run_')) and k.endswith('_H'):
        hp = ref.get(k.split('_')[0] + '_apparent_h_px') or 0
        return 1.5 / hp if hp else 0.0
    hp = ref.get('H_px') or 0
    return 1.5 / hp if hp else 0.0


def score(ours, ref, rubric=None, criteria=None):
    """per-criterion scores 0..10 + total; rubric = {criterion: score} for the eye-judged ones (face, shading, ...)"""
    res = {}
    for crit, items in (criteria or CRITERIA).items():
        vals = []
        for k, tol in items:
            a, b = ours.get(k), ref.get(k)
            if a is None or b is None:
                continue
            d = max(0.0, abs(a - b) - _noise(k, ref))
            vals.append((k, a, b, 10 * max(0.0, 1 - d / tol)))
        if vals:
            res[crit] = {'score': round(sum(v[3] for v in vals) / len(vals), 2),
                         'detail': {k: {'ours': round(a, 4), 'ref': round(b, 4), 'score': round(s, 2)} for k, a, b, s in vals}}
    for crit, s in (rubric or {}).items():
        res[crit] = {'score': s, 'detail': 'rubric'}
    tot = [v['score'] for v in res.values()]
    res['total'] = round(sum(tot) / len(tot), 2) if tot else None
    return res


def main(argv):
    cmd = argv[0]
    if cmd == 'sil':
        path = argv[1]
        crop = tuple(int(v) for v in argv[argv.index('--crop') + 1].split(',')) if '--crop' in argv else None
        view = argv[argv.index('--view') + 1] if '--view' in argv else 'front'
        plate = argv[argv.index('--plate') + 1] if '--plate' in argv else None
        m = load_mask(path, crop, plate=plate)
        if '--mask' in argv:
            Image.fromarray((m * 255).astype(np.uint8)).save(argv[argv.index('--mask') + 1])
        print(json.dumps(sil_metrics(m, view), indent=1))
    elif cmd == 'score':
        ours, ref = json.load(open(argv[1])), json.load(open(argv[2]))
        r = score(ours, ref, ours.get('rubric'))
        if '--out' in argv:
            json.dump(r, open(argv[argv.index('--out') + 1], 'w'), indent=1)
        print(json.dumps(r, indent=1))


if __name__ == '__main__':
    main(sys.argv[1:])
