"""Character kit v4 OPTIONS -- graded comparison against the 2004 reference captures (owner review 2026-09-27).

  python tools/holm_char_compare_v4.py --opt v4a [--ours scratchpad/holm_characters_v4/v4a]
         [--ref C:/Users/iQwaZ/ref2004_captures/characters/2004] [--sheets C:/Users/iQwaZ/ref2004_captures/sheets]
         [--passes <jsonl of designer-front passes>]

Reads our option renders (tools/blender/build_holm_characters_v4_options.py) and the reference captures IN PLACE, measures
both with the same code (tools/holm_char_metrics_v4.py) and writes
  <ours>/<opt>_score.json       per-criterion scores, the numbers behind them (ours vs 2004), the rubric notes
  <ours>/<opt>_scores.png       the option's panels + the score table -- no reference imagery
  <sheets>/<opt>_vs_2004.png    side by side with the 2004 captures at matched angles (stays OUTSIDE the repo)
Reference captures are never copied into the repo: only numbers derived from them are written here.
"""
import sys, os, json, math, glob
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import holm_char_metrics_v4 as M

ARGS = sys.argv[1:]
def arg(k, d=None):
    return ARGS[ARGS.index(k) + 1] if k in ARGS else d

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OPT = arg('--opt', 'v4a')
OURS = os.path.abspath(arg('--ours', os.path.join(ROOT, 'scratchpad', 'holm_characters_v4', OPT)))
REF = arg('--ref', 'C:/Users/iQwaZ/ref2004_captures/characters/2004')
SHEETS = arg('--sheets', 'C:/Users/iQwaZ/ref2004_captures/sheets')
PASSES = arg('--passes')
CELLS = os.path.join(OURS, 'cells')
MEAS = json.load(open(os.path.join(OURS, '%s_measure.json' % OPT)))
RUBRIC = json.load(open(os.path.join(os.path.dirname(OURS), 'rubric_v4.json')))[OPT]
FONT = None
for f in ('C:/Windows/Fonts/segoeui.ttf', 'C:/Windows/Fonts/arial.ttf'):
    if os.path.exists(f):
        FONT = f
        break

def font(sz):
    return ImageFont.truetype(FONT, sz) if FONT else ImageFont.load_default()

# ---------------------------------------------------------------------------------------------- reference masks
def ref_close_mask(g, view):
    f = '%s/%s/close_%s.png' % (REF, g, view)
    m = M.load_mask(f, crop=(4, 4, 512, 336), plate=f[:-4] + '_plate.png')
    m = ndimage.binary_opening(m)
    lab, k = ndimage.label(m)
    s = ndimage.sum(m, lab, range(1, k + 1))
    return ndimage.binary_fill_holes(lab == 1 + int(np.argmax(s)))

def mask_ok(m):
    """the plate difference fails where the figure matches what is behind it: keep only solid, figure-shaped masks"""
    ys, xs = np.nonzero(m)
    h, w = np.ptp(ys) + 1, np.ptp(xs) + 1
    fill = m.sum() / float(h * w)
    return 2.2 < h / float(w) < 5.5 and .30 < fill < .70

def plausible(m):
    """a figure-shaped front / back silhouette (a failed plate difference gives a blob: no neck, no arms, no crotch)"""
    rng = {'head_ratio': (.09, .20), 'neck_w': (.03, .09), 'hand_h': (.35, .60), 'crotch_h': (.35, .55), 'shoulder_deg': (-5, 35)}
    return all(m.get(k) is not None and lo <= m[k] <= hi for k, (lo, hi) in rng.items())

def ref_designer(g):
    if PASSES and os.path.exists(PASSES):
        ps = [json.loads(l)['m'] for l in open(PASSES) if json.loads(l)['g'] == g and json.loads(l)['view'] == 'designer_front']
        if ps:
            keys = [k for k in ps[0]]
            return {k: float(np.median([p[k] for p in ps if p.get(k) is not None])) for k in keys if any(p.get(k) is not None for p in ps)}, len(ps)
    m = M.load_mask('%s/%s/designer_front.png' % (REF, g), crop=(0, 0, 128, 212), thr=22, open_iter=0)
    return M.sil_metrics(m), 1

# ---------------------------------------------------------------------------------------------- silhouettes
views = []   # (label, gender, ours metrics, ref metrics)
for g, bt in (('m', 'A'), ('f', 'B')):
    rm, n = ref_designer(g)
    om = M.sil_metrics(M.load_mask(os.path.join(CELLS, '%s_%s_classic_front.png' % (OPT, bt))))
    views.append(('%s designer front (level camera; median of %d reference passes)' % ('man' if g == 'm' else 'woman', n), g, om, rm))
    for rel, nm in (('rel0', 'front'), ('rel1024', 'back')):
        try:
            rmask = ref_close_mask(g, rel)
        except Exception:
            continue
        if not mask_ok(rmask):
            continue
        rmet = M.sil_metrics(rmask)
        if not plausible(rmet):
            print('reference mask rejected (plate difference failed):', g, rel)
            continue
        om = M.sil_metrics(M.load_mask(os.path.join(CELLS, '%s_%s_classic_%s.png' % (OPT, bt, rel))))
        views.append(('%s in-game close camera, %s' % ('man' if g == 'm' else 'woman', nm), g, om, rmet))

SIL = ['head/body ratio', 'shoulder line', 'neck', 'arm hang', 'legs/feet']
per_view = []
for label, g, om, rm in views:
    s = M.score(om, rm)
    per_view.append({'view': label, 'scores': {c: s[c]['score'] for c in SIL if c in s}, 'detail': {c: s[c]['detail'] for c in SIL if c in s}})

# ---------------------------------------------------------------------------------------------- gait (the man's strips;
# 2004 plays the same walk / run sequences 819 / 824 for both genders, as our kit shares its clips)
def ref_gait(g):
    out = {}
    for clip, anim in (('walk_side', 819), ('run_side', 824)):
        d = json.load(open('%s/%s/%s/samples.json' % (REF, g, clip)))
        S = [s for s in d['samples'] if s['sa'] == anim]
        plate = np.asarray(Image.open('%s/%s/%s' % (REF, g, d['plate'])).convert('RGB')).astype(int)
        starts = [S[i]['lc'] for i in range(1, len(S)) if S[i]['saf'] == 0 and S[i - 1]['saf'] != 0]
        cyc = float(np.median(np.diff(starts))) * .02
        lc = np.array([s['lc'] for s in S]); z = np.array([s['z'] for s in S]); x = np.array([s['x'] for s in S])
        dist = np.hypot(np.diff(z), np.diff(x)); dl = np.diff(lc)
        speed = dist[dl == 1].mean() * 50
        H = float(np.median([s['h'] for s in S]))
        per = {}
        for s in S:
            f = '%s/%s/%s/%s' % (REF, g, clip, s['file'])
            if not os.path.exists(f):
                continue
            a = np.asarray(Image.open(f).convert('RGB')).astype(int)
            x0, y0, w, h = s['crop']
            pl = plate[y0:y0 + a.shape[0], x0:x0 + a.shape[1]]
            if pl.shape != a.shape:
                continue
            m = ndimage.binary_opening(np.abs(a - pl).sum(2) > 30)
            lab, k = ndimage.label(m)
            if not k:
                continue
            sz = ndimage.sum(m, lab, range(1, k + 1))
            m = ndimage.binary_fill_holes(lab == 1 + int(np.argmax(sz)))
            per.setdefault(s['saf'], []).append((m, s['feet'][1] - y0, f, s))
        rows = {}
        for saf, lst in per.items():
            gs = [M.gait_sil([m], ground=gy) for m, gy, f, s_ in lst]
            gs = [q for q in gs if q['apparent_h_px'] > 40]
            if not gs:
                continue
            rows[saf] = {k: float(np.median([q[k] for q in gs])) for k in ('bob_H', 'max_feet_spread_H', 'max_hand_band_H', 'apparent_h_px')}
            rows[saf]['height'] = float(np.median([gy - np.nonzero(m)[0].min() for m, gy, f, s_ in lst]))
            mid = lst[len(lst) // 2]
            ys_, xs_ = np.nonzero(mid[0])
            rows[saf]['file'] = (mid[2], (int(xs_.min()) - 6, int(ys_.min()) - 6, int(xs_.max()) + 6, int(ys_.max()) + 6))
        hh = np.median([r['apparent_h_px'] for r in rows.values()])
        hts = [r['height'] for r in rows.values()]
        mode = clip.split('_')[0]
        out[mode] = dict(cycle_s=cyc, frames=len(rows), stride_H=speed * cyc / H, bob_H=(max(hts) - min(hts)) / hh,
                         max_feet_spread_H=max(r['max_feet_spread_H'] for r in rows.values()),
                         max_hand_band_H=max(r['max_hand_band_H'] for r in rows.values()),
                         min_hand_band_H=min(r['max_hand_band_H'] for r in rows.values()),
                         apparent_h_px=float(hh), frames_files=[rows[k]['file'] for k in sorted(rows)])
    return out

RG = ref_gait('m')
ours_g, ref_g = {}, {}
ground = 100 + .92 * math.cos(math.radians(22.5)) / 2.3 * 200
for cn in ('walk', 'run'):
    fs = MEAS['renders']['gaitsil_A_%s' % cn]
    g = M.gait_sil([M.load_mask(f) for f in fs], ground=ground)
    r = RG[cn]
    for k in ('bob_H', 'max_feet_spread_H', 'max_hand_band_H', 'min_hand_band_H'):
        ours_g['%s_%s' % (cn, k)] = g[k]; ref_g['%s_%s' % (cn, k)] = r[k]
    ours_g[cn + '_stride_H'] = MEAS['gait'][cn]['stride_H']; ref_g[cn + '_stride_H'] = r['stride_H']
    ours_g[cn + '_poses'] = float(min(8, MEAS['gait'][cn]['poses_per_cycle'])) if MEAS['gait'][cn]['interpolation'] == 'CONSTANT' else \
        {'LINEAR': 6.5, 'BEZIER': 5.0}.get(MEAS['gait'][cn]['interpolation'], 3.0)   # in-betweened = less old-client
    ref_g[cn + '_poses'] = float(r['frames'])
    ours_g[cn + '_cycle_rel'] = MEAS['gait'][cn]['cycle_s'] / r['cycle_s']; ref_g[cn + '_cycle_rel'] = 1.0
    ref_g[cn + '_apparent_h_px'] = r['apparent_h_px']
gs = M.score(ours_g, ref_g)

# v4a.2b: the same gait graded against the REF2004 harness (docs/rebuild/REF2004_FEEL_REPORT.md): its 2004 numbers from
# C:/Users/iQwaZ/ref2004_captures/characters/metrics.json (numbers only), ours from our side renders with its formulas.
# The rubric's own 2004 references above (bob from the per-frame apparent height, the 12 % feet band, the 40-52 % hand band)
# disagree with the harness (walk bob 1.8 % vs 6 %), so the harness grade is the headline total; the old one is kept.
HARN_PATH = arg('--harness', 'C:/Users/iQwaZ/ref2004_captures/characters/metrics.json')
HARN = json.load(open(HARN_PATH))['man']['2004']['gait']
ours_h, ref_h = {}, {}
for cn in ('walk', 'run'):
    g = M.harness_gait([M.load_mask(f) for f in MEAS['renders']['gaitsil_A_%s' % cn]], ground=ground)
    r = HARN[cn]
    ours_h[cn + '_cycle_rel'] = MEAS['gait'][cn]['cycle_s'] / r['cycle_s']; ref_h[cn + '_cycle_rel'] = 1.0
    ours_h[cn + '_step_H'] = MEAS['gait'][cn]['step_H']; ref_h[cn + '_step_H'] = r['stride_in_body_heights']
    ours_h[cn + '_poses'] = ours_g[cn + '_poses']; ref_h[cn + '_poses'] = float(r.get('anim_frames_per_cycle', 8))
    ours_h[cn + '_bob_H'] = g['bob_H']; ref_h[cn + '_bob_H'] = r['bob_pct_of_H'] / 100.0
    ours_h[cn + '_leg_spread_H'] = g['leg_spread_H']; ref_h[cn + '_leg_spread_H'] = r['leg_spread_max_over_H']
    ours_h[cn + '_arm_band_max_H'] = g['arm_band_max_H']; ref_h[cn + '_arm_band_max_H'] = r['arm_band_width_max_over_H']
    ours_h[cn + '_arm_band_min_H'] = g['arm_band_min_H']; ref_h[cn + '_arm_band_min_H'] = r['arm_band_width_min_over_H']
    ours_h[cn + '_lean_deg'] = g['lean_deg']; ref_h[cn + '_lean_deg'] = r['lean_deg_forward']
    ref_h[cn + '_apparent_h_px'] = r['H_px_median']
gh = M.score(ours_h, ref_h, criteria=M.CRITERIA_HARNESS)

# ---------------------------------------------------------------------------------------------- totals
crit = {}
for c in SIL:
    vals = [v['scores'][c] for v in per_view if c in v['scores']]
    crit[c] = round(float(np.mean(vals)), 2)
crit['face'] = RUBRIC['face']['score']
crit['shading'] = RUBRIC['shading']['score']
crit_own = dict(crit, walk=gs['walk']['score'], run=gs['run']['score'])
total_own = round(float(np.mean(list(crit_own.values()))), 2)
crit['walk'] = gh['walk']['score']
crit['run'] = gh['run']['score']
total = round(float(np.mean(list(crit.values()))), 2)
res = {'option': OPT, 'label': MEAS['label'], 'total': total, 'criteria': crit, 'silhouette_views': per_view,
       'gait': {c: gh[c] for c in ('walk', 'run')}, 'gait_references': 'REF2004 harness metrics.json (2004) + its formulas on our renders',
       'total_with_own_gait_refs': total_own, 'criteria_with_own_gait_refs': crit_own, 'gait_own_refs': {c: gs[c] for c in ('walk', 'run')},
       'rubric': RUBRIC, 'notes': ['scores: 10 * max(0, 1 - (|ours - 2004| - measuring noise) / tolerance), averaged per criterion',
                                   'tolerances = "clearly a different figure" (tools/holm_char_metrics_v4.py CRITERIA)',
                                   'silhouette criteria: man + woman, designer (level) view + the old client close camera where the reference mask is clean',
                                   'walk / run: the man\'s side strips (2004 plays the same sequences 819 / 824 for both genders)',
                                   'face / shading: eye-judged rubric (see rubric notes)']}
json.dump(res, open(os.path.join(OURS, '%s_score.json' % OPT), 'w'), indent=1)
print(OPT, 'TOTAL', total, crit)
print(OPT, 'TOTAL with the rubric own 2004 gait references (as before)', total_own, {c: crit_own[c] for c in ('walk', 'run')})

# ---------------------------------------------------------------------------------------------- sheets
BG = (26, 26, 30)
def on_bg(path, bg=(214, 214, 218), crop_alpha=True, pad=8):
    im = Image.open(path).convert('RGBA')
    if crop_alpha:
        a = np.asarray(im)[..., 3]
        ys, xs = np.nonzero(a > 20)
        if len(ys):
            im = im.crop((max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.width, xs.max() + pad), min(im.height, ys.max() + pad)))
    b = Image.new('RGBA', im.size, bg + (255,))
    b.alpha_composite(im)
    return b.convert('RGB')

def ref_crop(path, mask=None, off=(4, 4), pad=8):
    im = Image.open(path).convert('RGB')
    if mask is not None:
        ys, xs = np.nonzero(mask)
        im = im.crop((xs.min() + off[0] - pad, ys.min() + off[1] - pad, xs.max() + off[0] + pad, ys.max() + off[1] + pad))
    return im

def fit(im, h):
    return im.resize((max(1, int(im.width * h / im.height)), h), Image.NEAREST if im.height < h else Image.LANCZOS)

def row_img(title, cells, h):
    ims = [(fit(i, h), lab) for i, lab in cells]
    W = sum(i.width for i, _ in ims) + 10 * (len(ims) + 1)
    out = Image.new('RGB', (max(W, 400), h + 58), BG)
    d = ImageDraw.Draw(out)
    d.text((10, 4), title, fill=(230, 220, 170), font=font(17))
    x = 10
    for i, lab in ims:
        out.paste(i, (x, 30))
        d.text((x + 2, 32 + h), lab, fill=(200, 200, 205), font=font(13))
        x += i.width + 10
    return out

def table_img(with_ref_numbers=True):
    lines = [('%s  --  %s' % (OPT, MEAS['label']), (240, 230, 180), 18), ('TOTAL similarity to 2004: %.2f / 10  (gait vs the REF2004 harness)' % total, (255, 255, 255), 22),
             ('with the rubric own 2004 gait references (before v4a.2b): %.2f' % total_own, (200, 200, 205), 15), ('', None, 8)]
    for c in ['head/body ratio', 'shoulder line', 'neck', 'arm hang', 'legs/feet', 'face', 'shading', 'walk', 'run']:
        lines.append(('%-16s %5.2f' % (c, crit[c]), (220, 220, 225), 16))
    lines.append(('', None, 8))
    for v in per_view:
        lines.append((v['view'], (170, 200, 230), 14))
        for c, dd in v['detail'].items():
            txt = '   %-16s %4.1f   ' % (c, v['scores'][c]) + '  '.join('%s %.3f vs %.3f' % (k, q['ours'], q['ref']) for k, q in dd.items())
            lines.append((txt, (190, 190, 195), 13))
    for cn in ('walk', 'run'):
        lines.append(('%s  %.2f  (harness)   own refs %.2f' % (cn, gh[cn]['score'], gs[cn]['score']), (170, 200, 230), 14))
        lines.append(('   ' + '  '.join('%s %.3f vs %.3f' % (k.replace(cn + '_', ''), q['ours'], q['ref']) for k, q in gh[cn]['detail'].items()), (190, 190, 195), 13))
    for c in ('face', 'shading'):
        lines.append(('%s (rubric) %.1f: %s' % (c, RUBRIC[c]['score'], RUBRIC[c]['note']), (190, 190, 195), 13))
    lines.append(('numbers: ours vs 2004 (ratios of standing height H; degrees)', (150, 150, 155), 12))
    Wd = 1500
    Ht = sum(sz + 8 for _, _, sz in lines) + 20
    out = Image.new('RGB', (Wd, Ht), BG)
    d = ImageDraw.Draw(out)
    y = 10
    for txt, col, sz in lines:
        if txt:
            d.text((12, y), txt, fill=col, font=font(sz))
        y += sz + 8
    return out

def stack(imgs, path):
    W = max(i.width for i in imgs)
    H = sum(i.height for i in imgs)
    out = Image.new('RGB', (W, H), BG)
    y = 0
    for i in imgs:
        out.paste(i, (0, y))
        y += i.height
    out.save(path)
    return path

def c(name):
    return os.path.join(CELLS, name)

# our walk / run 8 poses (the held poses of the stepped clip = its distinct frames)
def our_poses(bt, cn):
    fs = MEAS['renders']['gaitsil_%s_%s' % (bt, cn)]
    n = len(fs)
    idx = sorted(set(round(i * n / 8) for i in range(8)))
    return [on_bg(fs[i]) for i in idx]

rows_ours, rows_cmp = [], []
for g, bt, nm in (('m', 'A', 'man'), ('f', 'B', 'woman')):
    ours_cells = [(on_bg(c('%s_%s_classic_front.png' % (OPT, bt))), 'ours, level front')]
    ours_cells += [(on_bg(c('%s_%s_classic_%s.png' % (OPT, bt, r)), bg=(120, 100, 80)), 'ours, old-client camera %s' % lab)
                   for r, lab in (('rel0', 'front'), ('rel256', '45'), ('rel512', 'side'), ('rel768', '135'), ('rel1024', 'back'))]
    rows_ours.append(row_img('%s -- classic outfit (bald, short sleeves, plain trousers, boots)' % nm, ours_cells, 300))
    cmp_cells = []
    try:
        dm = M.load_mask('%s/%s/designer_front.png' % (REF, g), crop=(0, 0, 128, 212), thr=22, open_iter=0)
        cmp_cells.append((ref_crop('%s/%s/designer_front.png' % (REF, g), dm, off=(0, 0)), '2004 designer'))
    except Exception:
        pass
    cmp_cells.append(ours_cells[0])
    for r, lab in (('rel0', 'front'), ('rel256', '45'), ('rel512', 'side'), ('rel1024', 'back')):
        try:
            rm = ref_close_mask(g, r)
            cmp_cells.append((ref_crop('%s/%s/close_%s.png' % (REF, g, r), rm), '2004 %s' % lab))
        except Exception:
            pass
        cmp_cells.append((on_bg(c('%s_%s_classic_%s.png' % (OPT, bt, r)), bg=(120, 100, 80)), 'ours %s' % lab))
    rows_cmp.append(row_img('%s: 2004 vs %s at matched angles (level designer view; the old client close camera, 22.5 deg pitch)' % (nm, OPT), cmp_cells, 300))
def head_crop_ref(g, rel):
    rm = ref_close_mask(g, rel)
    ys, xs = np.nonzero(rm)
    h = ys.max() - ys.min()
    top = ys.min()
    band = rm[top:top + int(.30 * h)]
    bx = np.nonzero(band.any(0))[0]
    im = Image.open('%s/%s/close_%s.png' % (REF, g, rel)).convert('RGB')
    return im.crop((bx.min() + 4 - 6, top + 4 - 4, bx.max() + 4 + 6, top + 4 + int(.30 * h)))

def head_crop_ours(path):
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im)[..., 3]
    ys, xs = np.nonzero(a > 20)
    h = ys.max() - ys.min()
    band = a[ys.min():ys.min() + int(.30 * h)] > 20
    bx = np.nonzero(band.any(0))[0]
    im = im.crop((bx.min() - 6, ys.min() - 4, bx.max() + 6, ys.min() + int(.30 * h)))
    b = Image.new('RGBA', im.size, (120, 100, 80, 255))
    b.alpha_composite(im)
    return b.convert('RGB')

hc = []
for g, bt in (('m', 'A'), ('f', 'B')):
    for rel in ('rel0', 'rel256', 'rel1024'):
        try:
            hc.append((head_crop_ref(g, rel), '2004 %s' % rel))
        except Exception:
            pass
        hc.append((head_crop_ours(c('%s_%s_classic_%s.png' % (OPT, bt, rel))), 'ours %s' % rel))
rows_cmp.append(row_img('heads and shoulders at the old-client camera (2004 / ours)', hc, 170))

for cn in ('walk', 'run'):
    ours = our_poses('A', cn)
    rows_ours.append(row_img('%s: the 8 poses of one cycle (side, 22.5 deg pitch)' % cn, [(i, 'pose %d' % (k + 1)) for k, i in enumerate(ours)], 200))
    refs = [Image.open(f).convert('RGB').crop(bb) for f, bb in RG[cn]['frames_files']]
    rows_cmp.append(row_img('%s: 2004 frames (top) / ours (bottom), one cycle' % cn, [(i, '2004 f%d' % k) for k, i in enumerate(refs)], 200))
    rows_cmp.append(row_img('', [(i, 'ours %d' % (k + 1)) for k, i in enumerate(ours)], 200))
faces = [(on_bg(c('%s_A_face_front.png' % OPT), crop_alpha=False), 'man face'), (on_bg(c('%s_A_face_34.png' % OPT), crop_alpha=False), 'man 3/4'),
         (on_bg(c('%s_B_face_front.png' % OPT), crop_alpha=False), 'woman face'), (on_bg(c('%s_B_face_34.png' % OPT), crop_alpha=False), 'woman 3/4')]
rows_ours.append(row_img('faces (default hair)', faces, 220))
rows_cmp.append(row_img('faces: ours (default hair)', faces, 220))
npc = [(on_bg(c('%s_bram_34.png' % OPT)), 'Guide Bram 3/4'), (on_bg(c('%s_bram_game.png' % OPT), crop_alpha=False), 'Bram, game camera'),
       (on_bg(c('%s_bram_face.png' % OPT), crop_alpha=False), 'Bram face'), (on_bg(c('%s_hettie_face_front.png' % OPT), crop_alpha=False), 'Hettie face'),
       (on_bg(c('%s_hettie_face_34.png' % OPT), crop_alpha=False), 'Hettie 3/4'), (on_bg(c('%s_hettie_game.png' % OPT), crop_alpha=False), 'Hettie, game camera')]
rows_ours.append(row_img('NPCs in this style', npc, 260))
tab = table_img()
p1 = stack([tab] + rows_ours, os.path.join(OURS, '%s_scores.png' % OPT))
os.makedirs(SHEETS, exist_ok=True)
p2 = stack([tab] + rows_cmp, os.path.join(SHEETS, '%s_vs_2004.png' % OPT))
print('sheets', p1, p2)
