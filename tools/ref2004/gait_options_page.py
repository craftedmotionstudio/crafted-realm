"""The owner's PRIVATE gait comparison page (review 5, 2026-09-28): 2004 vs our shipped clips vs each walk / run / idle
option, as looping GIFs at the same height, lens and speed, with the measured numbers under each.

    python tools/ref2004/gait_options_page.py [--sets cur,optA,optB,optC] [--genders m,f]

Reads the captures of tools/ref2004/capture_characters.js (characters/2004/<g>, characters/ours_<set>/<g>) and the option
notes / skeleton numbers from .studio-workspaces/holm-gait-options-v1/candidates/manifest.json. Writes ONLY to
C:/Users/iQwaZ/ref2004_captures/review/ (gait_options.html + gait_options/*.gif|png): the page holds 2004 imagery, so it is
never committed, published or copied into the repo (the out2004 guard refuses any path inside the repo).
"""
import html
import json
import math
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import analyze as A  # noqa: E402
import gait_metrics as GM  # noqa: E402

CAP = A.CAP
CH = os.path.join(CAP, 'characters')
GIF_H = 260            # every character is scaled to this standing height (px)
STEP_MS = 40           # GIF frame step (25 fps): each held pose shows for its real time
ROWS = [('walk', 'side'), ('walk', 'game'), ('run', 'side'), ('run', 'game'), ('idle', 'front'), ('idle', 'side')]
ROW_TITLE = {('walk', 'side'): 'Walk -- side view', ('walk', 'game'): 'Walk -- game camera (3/4 from behind)',
             ('run', 'side'): 'Run -- side view', ('run', 'game'): 'Run -- game camera (3/4 from behind)',
             ('idle', 'front'): 'Standing -- front', ('idle', 'side'): 'Standing -- side'}
MANIFEST = os.path.join(A.REPO, '.studio-workspaces', 'holm-gait-options-v1', 'candidates', 'manifest.json')


def arg(k, d):
    return sys.argv[sys.argv.index('--' + k) + 1] if '--' + k in sys.argv else d


def one_cycle(game, gdir, mode, cam):
    """-> [(t_ms, image, feet_xy_in_image, standing_H_px)] for one steady cycle of the strip"""
    folder = os.path.join(gdir, '%s_%s' % (mode, cam))
    if cam == 'side':
        res, frames, cyc = A.gait(game, folder, {'height_tiles': 1.0})
    else:
        res, frames, cyc = A.gait_game(game, folder)
    if not cyc:
        return []
    out = []
    for k in cyc:
        r, im, m = frames[k]
        if not r.get('feet'):
            continue
        fx, fy = r['feet'][0] - r['crop'][0], r['feet'][1] - r['crop'][1]
        hy = (r['head'][1] - r['crop'][1]) if r.get('head') else None
        out.append((r['t'], im, (fx, fy), hy, m))
    return out


def standing_px(game, gdir):
    """standing height in the side strips (px): the metric's H (95th percentile of the steady walk silhouettes)"""
    try:
        return GM.strip(os.path.join(gdir, 'walk_side'), game).get('H_px')
    except Exception:
        return None


def make_gif(frames, H_px, out, nearest, box_w=0.74, box_up=1.12, box_down=0.10):
    """frames of one cycle -> a looping GIF: the character's ground point fixed in the frame (a treadmill view),
    scaled so the standing height is GIF_H, resampled every STEP_MS at the real timing"""
    if not frames or not H_px:
        return None
    t0, t1 = frames[0][0], frames[-1][0] + (frames[-1][0] - frames[-2][0] if len(frames) > 1 else 20)
    s = GIF_H / H_px
    W, Hh = int(GIF_H * box_w), int(GIF_H * (box_up + box_down))
    imgs = []
    n = max(1, int(round((t1 - t0) / STEP_MS)))
    for i in range(n):
        tt = t0 + (t1 - t0) * i / n
        t, im, (fx, fy), hy, m = min(frames, key=lambda f: abs(f[0] - tt))
        box = (fx - W / 2 / s, fy - GIF_H * box_up / s, fx + W / 2 / s, fy + GIF_H * box_down / s)
        c = im.crop(tuple(int(round(v)) for v in box)).resize((W, Hh), Image.NEAREST if nearest else Image.LANCZOS)
        imgs.append(c.convert('P', palette=Image.ADAPTIVE, colors=128))
    dur = int(round((t1 - t0) / n))
    imgs[0].save(out, save_all=True, append_images=imgs[1:], duration=dur, loop=0, optimize=True, disposal=1)
    return {'file': os.path.basename(out), 'frames': n, 'ms': round(t1 - t0)}


def idle_still(game, gdir, rel, out):
    fr = A.load(os.path.join(gdir, 'close_rel%d.png' % rel))
    pl = A.load(os.path.join(gdir, 'close_rel%d_plate.png' % rel))
    if game == '2004':
        fr, pl = fr.crop(A.VIEW2004), pl.crop(A.VIEW2004)
    m = A.silhouette(fr, pl, (fr.width / 2, fr.height / 2), thr=8 if game == '2004' else 14)
    if m is None:
        return None
    ys, xs = np.nonzero(m)
    H = ys.max() - ys.min() + 1
    cx = (xs.min() + xs.max()) / 2
    s = GIF_H / H
    W, Hh = int(GIF_H * 0.62), int(GIF_H * 1.22)
    box = (cx - W / 2 / s, ys.min() - GIF_H * 0.12 / s, cx + W / 2 / s, ys.min() + Hh / s - GIF_H * 0.12 / s)
    c = fr.crop(tuple(int(round(v)) for v in box)).resize((W, Hh), Image.NEAREST if game == '2004' else Image.LANCZOS)
    c.save(out)
    return {'file': os.path.basename(out)}


NUM = {  # (label, key, format, 2004-closeness hint)
    'walk': [('head bob', 'bob_pct', '%.1f %%'), ('legs ahead (contact / avg)', ('reach', 'mreach'), '%.2f / %.2f H'),
             ('legs behind (contact / avg)', ('trail', 'mtrail'), '%.2f / %.2f H'), ('arms ahead / behind', ('arm_front', 'arm_back'), '%.2f / %.2f H'),
             ('arm band', 'arm_band', '%.2f H'), ('lean (silhouette)', 'lean_sil', '%.1f deg'), ('head ahead of hips', 'head_ahead', '%.2f H'),
             ('back foot off the ground (max / avg)', ('rear_lift', 'mean_rear_lift'), '%.2f / %.2f H'),
             ('step', 'stride_H', '%.2f H'), ('cycle', 'cycle_s', '%.2f s')],
    'idle_front': [('gap between the legs', 'leg_gap', '%.3f H'), ('legs outer width', 'leg_span', '%.2f H'),
                   ('arm off the body (wrist)', 'hand_gap', '%.3f H'), ('fists height from crown', 'hands_low', '%.2f H')],
    'idle_side': [('feet heel-to-toe', 'stagger', '%.2f H'), ('head ahead of feet', 'head_ahead_of_feet', '%.3f H'),
                  ('lean (silhouette)', 'lean_sil', '%.1f deg'), ('fists ahead', 'hands_ahead', '%.3f H')],
}
NUM['run'] = NUM['walk']


# distance to 2004: the mean of |ours - 2004| / scale over the measures that define each row (lower = closer)
SCORE = {'walk': {'bob_pct': 1.0, 'reach': .05, 'trail': .05, 'mreach': .03, 'mtrail': .03, 'arm_band': .05, 'lean_sil': 2.0, 'head_ahead': .03},
         'run': {'bob_pct': 1.0, 'reach': .05, 'trail': .05, 'mreach': .03, 'mtrail': .03, 'arm_front': .05, 'arm_band': .05,
                 'lean_sil': 2.0, 'head_ahead': .03, 'rear_lift': .03, 'mean_rear_lift': .02},
         'idle': {'leg_gap': .02, 'leg_span': .03, 'hand_gap': .015, 'stagger': .04, 'head_ahead_of_feet': .02, 'lean_sil': 1.5, 'hands_ahead': .02}}


def distance(kind, ours, ref):
    sc = SCORE[kind]
    d = [abs(ours[k] - ref[k]) / v for k, v in sc.items() if ours.get(k) is not None and ref.get(k) is not None]
    return round(sum(d) / len(d), 2) if d else None


def fmt(d, key, f):
    if isinstance(key, tuple):
        vals = [d.get(k) for k in key]
        if any(v is None for v in vals):
            return '-'
        return f % tuple(vals)
    v = d.get(key)
    return '-' if v is None else f % v


def summarize(metric, height_tiles):
    for mode in ('walk', 'run'):
        x = metric.get(mode) or {}
        x['mreach'], x['mtrail'] = x.get('mean_reach'), x.get('mean_trail')
        if x.get('stride_tiles_per_step') and height_tiles:
            x['stride_H'] = x['stride_tiles_per_step'] / height_tiles
    return metric


def main():
    sets = arg('sets', 'cur,optA,optB,optC').split(',')
    genders = arg('genders', 'm,f').split(',')
    out_dir = A.out2004('review', 'gait_options')
    page = os.path.join(A.out2004('review'), 'gait_options.html')
    man = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {'options': {}}
    cols = [('2004', '2004')] + [(s, s) for s in sets]
    data = {}
    for g in genders:
        H04 = {'m': 1.523, 'f': 1.492}[g]
        for col, s in cols:
            game = '2004' if s == '2004' else 'ours'
            gdir = os.path.join(CH, '2004' if s == '2004' else 'ours_' + s, g)
            if not os.path.isdir(gdir):
                continue
            met = summarize(GM.capture(gdir), H04 if game == '2004' else 1.5)
            meta = json.load(open(os.path.join(gdir, 'meta.json'))) if os.path.exists(os.path.join(gdir, 'meta.json')) else {}
            Hs = (met.get('walk') or {}).get('H_px')
            cell = {'metrics': met, 'gait': meta.get('gait'), 'query': meta.get('query')}
            for mode, cam in ROWS:
                key = '%s_%s_%s_%s' % (g, s, mode, cam)
                if mode == 'idle':
                    cell[(mode, cam)] = idle_still(game, gdir, 0 if cam == 'front' else 512, os.path.join(out_dir, key + '.png'))
                    continue
                fr = one_cycle(game, gdir, mode, cam)
                if cam == 'side':
                    cell[(mode, cam)] = make_gif(fr, Hs, os.path.join(out_dir, key + '.gif'), game == '2004')
                else:
                    # the game camera follows the character: height from the sampler's head / feet projection
                    hs = [f[2][1] - f[3] for f in fr if f[3] is not None]
                    cell[(mode, cam)] = make_gif(fr, float(np.median(hs)) if hs else None, os.path.join(out_dir, key + '.gif'), game == '2004',
                                                 box_w=0.80, box_up=1.25, box_down=0.18)
            data[(g, s)] = cell
            print('[PAGE]', g, s, 'done')
    # distances to 2004 per gender / set / row, and the closest option per row (the man's strips are the clean reference;
    # the woman's 2004 lane passes a bush, so her numbers are noisier -- shown, not used to pick)
    for g in genders:
        ref = data.get((g, '2004'))
        for col, s in cols:
            c = data.get((g, s))
            if not ref or not c or s == '2004':
                continue
            c['distance'] = {}
            for kind in ('walk', 'run', 'idle'):
                c['distance'][kind] = distance(kind, c['metrics'].get(kind) or {}, ref['metrics'].get(kind) or {})
    rec = {}
    over = json.load(open(RECOMMEND)) if os.path.exists(RECOMMEND) else {}
    for kind in ('walk', 'run', 'idle'):
        cand = [(data[('m', s)]['distance'][kind], s) for c_, s in cols if s.startswith('opt') and ('m', s) in data and data[('m', s)].get('distance', {}).get(kind) is not None]
        if not cand:
            continue
        d, s = min(cand)
        cur = data.get(('m', 'cur'), {}).get('distance', {}).get(kind)
        o = man.get('options', {}).get('%s_%s' % (kind, s[3:])) or {}
        rec[kind] = {'set': s, 'pick': o.get('label', s), 'distance': d, 'current': cur,
                     'why': (over.get(kind) or {}).get('why') or 'distance to 2004 %.2f (shipped now %s); every option: %s' % (
                         d, cur, ', '.join('%s %.2f' % (x[1][3:], x[0]) for x in sorted(cand, key=lambda q: q[1])))}
    json.dump({'scores': {'%s_%s' % k: v.get('distance') for k, v in data.items() if v.get('distance')}, 'recommend': rec},
              open(os.path.join(A.out2004('review'), 'gait_options_scores.json'), 'w'), indent=1)
    write_html(page, data, genders, cols, man, rec)
    print('[PAGE] wrote', page)


FIT = os.path.join(A.REPO, '.studio-workspaces', 'holm-gait-options-v1', 'fit')


def fit_summary(s):
    """equipment fit on this set's idle / walk / run (check_holm_equipment_v4.py --gaits ... --clip-map ...): failing tests"""
    key = 'base' if s == 'cur' else s[3:]
    p = os.path.join(FIT, key, 'fit_check_gait%s.json' % key)
    if not os.path.exists(p):
        return None
    d = json.load(open(p))
    n, tests, kinds = 0, 0, {}
    for kind, rows in d['rows'].items():
        if kind == 'kit_legs':
            bad = [r for r in rows if r.get('lr_cross')]
        elif kind in d['held']:
            rows = [r for r in rows if r['clip'] in ('idle', 'walk', 'run')]
            bad = [r for r in rows if r['through_body']]
        else:
            rows = [r for r in rows if r['clip'] in ('idle', 'walk', 'run')]
            bad = [r for r in rows if r.get('exposed', 0) > 2 or r.get('through') or r.get('hair_through') or r.get('lr_cross')]
        tests += len(rows)
        n += len(bad)
        if bad:
            kinds[kind] = len(bad)
    return {'failing': n, 'tests': tests, 'kinds': kinds}


def opt_note(man, s, kind):
    if not s.startswith('opt'):
        return None
    o = man.get('options', {}).get('%s_%s' % (kind, s[3:]))
    return o


RECOMMEND = os.path.join(A.out2004('review'), 'gait_options_recommendation.json')


def write_html(page, data, genders, cols, man, rec):
    E = html.escape
    css = """
body{background:#15120d;color:#e9dfc8;font:14px/1.45 Arial,Helvetica,sans-serif;margin:0;padding:16px}
h1{color:#ffdf8a;font-size:22px;margin:0 0 4px}h2{color:#ffdf8a;font-size:17px;margin:22px 0 6px}
.lead{color:#bfb39a;max-width:1100px}.warn{color:#e0a060}
.tabs button{background:#3a3226;color:#ffdf8a;border:1px solid #6b5a3a;padding:5px 14px;font:14px Arial;cursor:pointer;margin-right:4px}
.tabs button.on{background:#c9a45a;color:#1a1208}
table{border-collapse:collapse;margin-top:6px}td,th{border:1px solid #3b3326;padding:6px;vertical-align:top;text-align:center}
th{background:#231d15;color:#ffdf8a;font-size:13px;width:196px}th.row{width:120px;text-align:left}
td img{display:block;margin:0 auto;background:#000;image-rendering:auto}td.c2004 img{image-rendering:pixelated}
.num{font-size:11.5px;text-align:left;color:#cfc4ab;margin-top:5px;white-space:nowrap}.num b{color:#fff}
.note{font-weight:normal;color:#cfc4ab;font-size:12px;text-align:left;margin-top:4px}
.rec{background:#221c12;border:1px solid #6b5a3a;padding:10px 14px;max-width:1100px}
.best{outline:3px solid #7ccf6a}
"""
    L = ['<!doctype html><html><head><meta charset="utf-8"><title>Gait options -- private</title><style>%s</style></head><body>' % css,
         '<h1>Walk, run and standing options vs 2004 &mdash; private review page</h1>',
         '<p class="lead">Owner review 5 (2026-09-28). Each cell loops one cycle at its real speed. Every character is scaled to the '
         'same standing height, through the same 2004 lens (36 deg lens, 22.5 deg above) and at the 2004 pace (walk 1 tile / 600 ms '
         'tick, run 2). Numbers are fractions of the standing height H. The 2004 frames come from the local reference engine and stay on '
         'this machine: <span class="warn">this page is never committed or published</span>.</p>',
         '<p class="lead">Try any mix in the game: <code>?gait=walkB,runA,idleA</code> (add <code>,panel</code> for a live picker; '
         '<code>walkcur</code> = the shipped clip). The shipped clips stay the default until you pick.</p>',
         '<p class="lead">"Distance to 2004" = the average gap to the 2004 number over the row&#39;s measures, each gap divided by a '
         'noticeable step (head bob 1 % of H, legs 0.05 H, lean 2 deg ...): lower is closer; below ~1 means within one noticeable '
         'step on average.</p>']
    if rec:
        L.append('<div class="rec"><b>Recommendation (closest to 2004 by the numbers):</b><ul>')
        for k in ('walk', 'run', 'idle'):
            if rec.get(k):
                L.append('<li><b>%s: %s</b> &mdash; %s</li>' % (k.title(), E(rec[k]['pick']), E(rec[k]['why'])))
        L.append('</ul></div>')
    L.append('<div class="tabs">' + ''.join('<button data-g="%s"%s>%s</button>' % (g, ' class="on"' if i == 0 else '', {'m': 'Man', 'f': 'Woman'}[g])
                                              for i, g in enumerate(genders)) + '</div>')
    for gi, g in enumerate(genders):
        L.append('<div class="gset" data-g="%s"%s>' % (g, '' if gi == 0 else ' style="display:none"'))
        for mode, cam in ROWS:
            kind = mode
            L.append('<h2>%s</h2><table><tr><th class="row"></th>' % E(ROW_TITLE[(mode, cam)]))
            for col, s in cols:
                o = opt_note(man, s, kind)
                title = '2004 (reference)' if s == '2004' else 'Shipped now' if s == 'cur' else (o['label'] if o else s)
                bestc = rec.get(kind, {}).get('set') == s
                fs_ = fit_summary(s) if s != '2004' and cam in ('side', 'front') else None
                fit = ('<div class="note">equipment fit (idle / walk / run): <b>%d</b> of %d tests failing%s</div>' % (
                    fs_['failing'], fs_['tests'], (' (' + ', '.join('%s %d' % kv for kv in fs_['kinds'].items()) + ')') if fs_['kinds'] else '')) if fs_ else ''
                L.append('<th%s>%s%s%s</th>' % (' class="best"' if bestc else '', E(title), '<div class="note">%s</div>' % E(o['note']) if o and cam in ('side', 'front') else '', fit))
            L.append('</tr><tr><th class="row">%s</th>' % E(cam))
            for col, s in cols:
                cell = data.get((g, s))
                if not cell or not cell.get((mode, cam)):
                    L.append('<td>-</td>')
                    continue
                f = cell[(mode, cam)]['file']
                nums = ''
                met = cell['metrics']
                if mode in ('walk', 'run') and cam == 'side':
                    d = met.get(mode) or {}
                    nums = '<div class="num">' + '<br>'.join('%s: <b>%s</b>' % (E(lab), fmt(d, key, ff)) for lab, key, ff in NUM[mode]) + '</div>'
                elif mode == 'idle':
                    d = met.get('idle') or {}
                    nums = '<div class="num">' + '<br>'.join('%s: <b>%s</b>' % (E(lab), fmt(d, key, ff)) for lab, key, ff in NUM['idle_' + cam]) + '</div>'
                dist = (cell.get('distance') or {}).get(kind)
                if dist is not None and cam in ('side', 'front'):
                    nums += '<div class="num">distance to 2004: <b>%.2f</b></div>' % dist
                L.append('<td class="c%s"><img src="gait_options/%s" alt="">%s</td>' % (s, E(f), nums))
            L.append('</tr></table>')
        L.append('</div>')
    L.append("""<script>document.querySelectorAll('.tabs button').forEach(function(b){b.onclick=function(){
document.querySelectorAll('.tabs button').forEach(function(x){x.classList.toggle('on',x===b)});
document.querySelectorAll('.gset').forEach(function(d){d.style.display=d.getAttribute('data-g')===b.getAttribute('data-g')?'':'none'})}})</script>""")
    L.append('<p class="lead" style="margin-top:24px">Measures: tools/ref2004/gait_metrics.py (silhouettes, one median per held pose). '
             'Options built by tools/blender/build_holm_characters_v2.py --gait-options (companion GLB assets/models/holm_kit_v2_gaits.glb).</p>')
    L.append('</body></html>')
    with open(page, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(L))


if __name__ == '__main__':
    main()
