"""Gait measures for the walk / run / idle options (owner review 5, 2026-09-28): the same silhouette numbers for the
2004 reference strips and for our captures, frame by frame, so the options can be compared with the reference.

    python tools/ref2004/gait_metrics.py <capture dir> [<capture dir> ...]    -> prints JSON

A capture dir is characters/<game>/<g> as written by tools/ref2004/capture_characters.js (2004 or ours, or an
ours_<tag> set). Plain numbers only: no 2004 imagery or data leaves C:/Users/iQwaZ/ref2004_captures.

Per strip (walk_side / run_side, locked side camera + plate; fractions of the standing height H measured on the same
strip before the walker sets off):
  bob_pct            head-top height range over the cycle (5th-95th percentile), % of H
  shoulder_bob_pct   the same for the shoulder line (the neck's narrowest row), % of H
  reach / trail      how far the legs reach AHEAD of the hips / trail BEHIND them (max over the cycle; the hips = the
                     character's ground point, which both games animate in place over), fraction of H
  reach_at_spread    front-foot reach / rear-leg trail on the widest-legged frame (the contact pose)
  arm_front / arm_back  hands / elbows ahead of / behind the hips (arm band, 28-55 % of H down), fraction of H
  arm_band           arm band width, max over the cycle (the analyze.py measure), fraction of H
  lean_sil           analyze.py lean: top-quarter vs bottom-quarter centroid, degrees
  torso_lean         shoulder line (neck row centre) ahead of the hips over the hips-to-shoulder height, degrees
                     (median; min / max over the cycle) -- what reads as "leaning forward"
  head_ahead         head centre (top 12 %) ahead of the hips, fraction of H
  knee_lift          highest point of the leading leg's front edge above the ground, fraction of H (the knee)
  cycle_s, speed, stride_H   from the clock / sequence counter (analyze.gait)
Idle (close_rel0 / close_rel512 turnaround frames): stance width, front-back stagger of the feet, hands' height, hands
out from the body, hands ahead of the hips, head ahead of the feet centre, lean.
"""
import json
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import analyze as A  # noqa: E402

HIP_H = 0.52     # hip joint height, fraction of H (2004 crotch at 0.55 from the crown; our kit 0.52)
SHOULDER_H = 0.80


def _row_span(m, y):
    xs = np.nonzero(m[y])[0]
    return (xs.min(), xs.max()) if len(xs) else None


def frame_measures(m, fx, fy, direction, Hs):
    """one silhouette frame: fx, fy = the character's ground point in the crop, direction = +1 / -1 screen x of travel"""
    ys, xs = np.nonzero(m)
    top, bot = ys.min(), ys.max()
    H = bot - top + 1
    rel = lambda x: (x - fx) * direction / Hs
    out = {'top': (fy - top) / Hs, 'H': H / Hs}
    # neck: narrowest row 9-26 % down from the crown (the shoulder line sits just under it)
    a, b = top + int(0.09 * H), top + int(0.26 * H)
    spans = [(y, _row_span(m, y)) for y in range(a, b)]
    spans = [(y, s) for y, s in spans if s]
    if spans:
        y_n, s_n = min(spans, key=lambda q: q[1][1] - q[1][0])
        out['neck'] = (fy - y_n) / Hs
        out['neck_x'] = rel((s_n[0] + s_n[1]) / 2)
    head = m[top:top + max(2, int(0.12 * H))]
    hx = np.nonzero(head)[1]
    out['head_x'] = rel(hx.mean())
    legs = m[bot - int(0.30 * H):bot + 1]
    lx = np.nonzero(legs.any(axis=0))[0]
    ex = [rel(lx.min()), rel(lx.max())]
    out['leg_front'], out['leg_back'] = max(ex), -min(ex)
    out['leg_spread'] = (lx.max() - lx.min() + 1) / Hs
    band = m[top + int(0.28 * H):top + int(0.55 * H)]
    bx = np.nonzero(band.any(axis=0))[0]
    ex = [rel(bx.min()), rel(bx.max())]
    out['arm_front'], out['arm_back'] = max(ex), -min(ex)
    out['arm_band'] = (bx.max() - bx.min() + 1) / Hs
    ct = np.nonzero(m[top:top + int(0.25 * H)])[1].mean()
    cb = np.nonzero(m[bot - int(0.25 * H):bot + 1])[1].mean()
    out['lean_sil'] = math.degrees(math.atan2((ct - cb) * direction, 0.75 * H))
    # the hips: the crotch -- the top of the gap between the legs, on frames where the legs are apart
    hip = None
    for y in range(top + int(0.40 * H), bot - int(0.10 * H)):
        rs = [q for q in A.runs(m[y]) if q[1] - q[0] >= 1]
        if len(rs) < 2:
            continue
        # the two runs either side of the widest gap that lies within 0.25 H of the ground point (not a hand beside a leg)
        gaps = [(rs[i + 1][0] - rs[i][1], (rs[i][1] + rs[i + 1][0]) / 2) for i in range(len(rs) - 1)]
        gaps = [g for g in gaps if abs(rel(g[1])) < 0.25 and g[0] >= 2]
        if gaps and y > top + int(0.45 * H):
            hip = (max(gaps)[1], y)
            break
    if hip is not None:
        out['hip_x'] = rel(hip[0])
        out['hip_h'] = (fy - hip[1]) / Hs
        if 'neck' in out:
            out['torso_lean'] = math.degrees(math.atan2(out['neck_x'] - out['hip_x'], max(1e-3, out['neck'] - out['hip_h'])))
    # the trailing foot off the ground: the lowest point of the rearmost 0.06 H of the lower body, above the ground line
    lo_ = m[top + int(0.45 * H):bot + 1]
    cols = np.nonzero(lo_.any(axis=0))[0]
    if len(cols):
        rear = cols.min() if direction > 0 else cols.max()
        w = max(1, int(round(0.06 * Hs)))
        sel = lo_[:, rear:rear + w] if direction > 0 else lo_[:, max(0, rear - w + 1):rear + 1]
        ys_ = np.nonzero(sel.any(axis=1))[0]
        out['rear_lift'] = max(0.0, (fy - (top + int(0.45 * H) + ys_.max())) / Hs) if len(ys_) else 0.0
    # knee lift: in the lower 55 %, the highest row where the silhouette reaches further ahead than the hips + 0.08 H
    # (the thigh / knee of the swing leg); 0 when no leg is ahead
    lo = m[top + int(0.45 * H):bot + 1]
    kl = 0.0
    for i in range(lo.shape[0]):
        r = np.nonzero(lo[i])[0]
        if len(r) and max(rel(r.min()), rel(r.max())) > 0.10:
            kl = (fy - (top + int(0.45 * H) + i)) / Hs
            break
    out['knee_lift'] = kl
    return out


def pct(v, p):
    return float(np.percentile(v, p)) if len(v) else None


def strip(folder, game, Hs=None):
    """walk_side / run_side: per-frame measures over the steady part + the analyze.py gait numbers"""
    d = json.load(open(os.path.join(folder, 'samples.json')))
    S = d['samples']
    plate = A.load(os.path.join(os.path.dirname(folder), d['plate']))
    res, frames, cyc = A.gait(game, folder, {'height_tiles': 1.0})
    dur = None   # ours: the clip length (meta.json clips), to read the held pose off the clip clock
    try:
        cl = json.load(open(os.path.join(os.path.dirname(folder), 'meta.json'))).get('clips') or {}
        dur = (cl.get(d.get('mode')) or {}).get('dur')
    except (OSError, ValueError):
        dur = None
    pos = [((r['x'] / 128.0, r['z'] / 128.0) if game == '2004' else (r['x'], r['z'])) for r, _, _ in frames]
    moving = [i for i in range(1, len(pos)) if math.dist(pos[i], pos[i - 1]) > 1e-6]
    if len(moving) < 6:
        return {'error': 'no movement'}
    # standing height: the tallest walking silhouettes (95th percentile of the steady walk: the passing pose stands
    # nearly straight); the run strip uses its walk strip's value (same camera) -- Hs passed in
    steady0 = [k for k in moving[len(moving) // 5: len(moving) * 4 // 5] if frames[k][2] is not None and frames[k][2].any()]
    allh = [np.ptp(np.nonzero(frames[k][2])[0]) + 1 for k in steady0]
    if Hs is None:
        Hs = pct(allh, 95)
    vx = np.sign(np.mean([frames[k][0]['feet'][0] - frames[k - 1][0]['feet'][0] for k in moving if frames[k][0].get('feet') and frames[k - 1][0].get('feet')]) or 1)
    steady = [k for k in moving[len(moving) // 5: len(moving) * 4 // 5] if frames[k][2] is not None]
    rows = []
    for k in steady:
        r, im, m = frames[k]
        if m is None or np.count_nonzero(m) < 30 or not r.get('feet'):
            continue
        fx, fy = r['feet'][0] - r['crop'][0], r['feet'][1] - r['crop'][1]
        q = frame_measures(m, fx, fy, vx, Hs)
        q['t'] = r['t']
        # the held pose this frame shows: 2004 = the sequence frame, ours = the clip clock (8 poses a cycle)
        if game == '2004':
            q['pose'] = r['saf']
        else:
            ck = r.get(d.get('mode') == 'run' and 'run' or 'walk')
            q['pose'] = int((ck[0] % dur) * 30 + 1e-3) % max(1, int(round(dur * 30))) if ck and dur else None   # the clip frame (held poses repeat)
        rows.append(q)
    # drop frames where scenery hides part of the body (the silhouette is much shorter than the others)
    hm = np.median([q['H'] for q in rows])
    rows = [q for q in rows if q['H'] > 0.9 * hm]
    # one row per held pose (median over every frame showing it): the pose numbers, not camera / sub-pixel noise
    poses = {}
    for q in rows:
        if q.get('pose') is not None:
            poses.setdefault(q['pose'], []).append(q)
    if len(poses) >= 6:
        med = lambda qs, k: float(np.median([x[k] for x in qs if x.get(k) is not None])) if any(x.get(k) is not None for x in qs) else None
        rows = [dict({k: med(qs, k) for k in qs[0]}, n=len(qs)) for p_, qs in sorted(poses.items())]
    col = lambda k: [q[k] for q in rows if q.get(k) is not None]
    wide = sorted(rows, key=lambda q: -q['leg_spread'])[:2]
    out = {'H_px': round(Hs, 1), 'frames': len(rows),
           'cycle_s': res.get('cycle_s'), 'speed_tiles_per_s': res.get('speed_tiles_per_s'), 'steps_per_s': res.get('steps_per_s'),
           'poses': len(poses), 'bob_pct': round(100 * (max(col('top')) - min(col('top'))), 1),
           'shoulder_bob_pct': round(100 * (max(col('neck')) - min(col('neck'))), 1) if col('neck') else None,
           'reach': round(max(col('leg_front')), 3), 'trail': round(max(col('leg_back')), 3),
           'reach_at_spread': round(float(np.median([q['leg_front'] for q in wide])), 3),
           'trail_at_spread': round(float(np.median([q['leg_back'] for q in wide])), 3),
           'leg_spread': round(max(col('leg_spread')), 3),
           'arm_front': round(max(col('arm_front')), 3), 'arm_back': round(max(col('arm_back')), 3),
           'arm_band': round(max(col('arm_band')), 3),
           'lean_sil': round(float(np.median(col('lean_sil'))), 1),
           'torso_lean': round(float(np.median(col('torso_lean'))), 1) if col('torso_lean') else None,
           'torso_lean_range': [round(min(col('torso_lean')), 1), round(max(col('torso_lean')), 1)] if col('torso_lean') else None,
           'head_ahead': round(float(np.median(col('head_x'))), 3),
           'knee_lift': round(max(col('knee_lift')), 3),
           # time-weighted over the cycle (each held pose by how long it shows)
           'rear_lift': round(max(col('rear_lift')), 3) if col('rear_lift') else None,
           'mean_rear_lift': round(float(np.average([q.get('rear_lift', 0.0) for q in rows], weights=[q.get('n', 1) for q in rows])), 3),
           'mean_reach': round(float(np.average([q['leg_front'] for q in rows], weights=[q.get('n', 1) for q in rows])), 3),
           'mean_trail': round(float(np.average([q['leg_back'] for q in rows], weights=[q.get('n', 1) for q in rows])), 3),
           'per_pose': [{k: (round(v, 3) if isinstance(v, float) else v) for k, v in q.items() if k in ('pose', 'n', 'top', 'neck', 'leg_front', 'leg_back', 'arm_front', 'arm_back', 'torso_lean', 'hip_x')} for q in rows] if len(poses) >= 6 else None}
    if out['reach'] and out['trail']:
        out['trail_over_reach'] = round(out['trail'] / max(1e-3, out['reach']), 2)
    if res.get('cycle_s') and res.get('speed_tiles_per_s'):
        out['stride_tiles_per_step'] = round(res['speed_tiles_per_s'] * res['cycle_s'] / 2, 3)
    return out


def idle(gdir, game):
    out = {}
    for rel, view in ((0, 'front'), (512, 'side')):
        fr = A.load(os.path.join(gdir, 'close_rel%d.png' % rel))
        pl = A.load(os.path.join(gdir, 'close_rel%d_plate.png' % rel))
        if game == '2004':
            fr, pl = fr.crop(A.VIEW2004), pl.crop(A.VIEW2004)
        m = A.silhouette(fr, pl, (fr.width / 2, fr.height / 2), thr=8 if game == '2004' else 14)
        if m is None:
            continue
        ys, xs = np.nonzero(m)
        top, bot = ys.min(), ys.max()
        H = bot - top + 1
        foot = m[bot - max(1, int(0.05 * H)):bot + 1]
        fxs = np.nonzero(foot.any(axis=0))[0]
        fc = (fxs.min() + fxs.max()) / 2
        if view == 'front':
            bm = A.body_metrics(m, 'front')
            out['stance_width'] = bm.get('stance_width_over_H')
            out['hands_low'] = bm.get('hand_low_over_H')
            # arms out from the body: the widest row between 35 and 50 % down (the hands / forearms) over the hip width
            w = [(_row_span(m, top + i) or (0, 0)) for i in range(int(0.35 * H), int(0.50 * H))]
            out['arm_span_low'] = round(max(b - a + 1 for a, b in w) / H, 3)
            # the gap between arm and body at the wrist level: count background runs inside the span
            gaps = []
            for i in range(int(0.40 * H), int(0.50 * H)):
                rs = A.runs(m[top + i])
                if len(rs) >= 3:
                    gaps.append((rs[1][0] - rs[0][1] - 1 + rs[-1][0] - rs[-2][1] - 1) / 2 / H)
            out['hand_gap'] = round(float(np.median(gaps)), 3) if gaps else 0.0
            # the legs: outer span and the gap between them over the shins (75-90 % down) -- how far apart they stand
            spans, lgaps = [], []
            for i in range(int(0.75 * H), int(0.90 * H)):
                rs = [q for q in A.runs(m[top + i]) if q[1] - q[0] >= 1]
                if rs:
                    spans.append((rs[-1][1] - rs[0][0] + 1) / H)
                    lgaps.append(max([rs[k + 1][0] - rs[k][1] - 1 for k in range(len(rs) - 1)] or [0]) / H)
            out['leg_span'] = round(float(np.median(spans)), 3) if spans else None
            out['leg_gap'] = round(float(np.median(lgaps)), 3) if lgaps else None
        else:
            fb = m[bot - max(1, int(0.15 * H)):bot + 1]   # the lower legs and both feet (the 22.5 deg camera lifts the far foot)
            fbx = np.nonzero(fb.any(axis=0))[0]
            out['stagger'] = round((fbx.max() - fbx.min() + 1) / H, 3)   # both feet, heel of the back one to toe of the front
            head = m[top:top + int(0.12 * H)]
            hx = np.nonzero(head)[1].mean()
            # facing: at rel 512 both games show the character facing screen-left (the harness turns our camera by the
            # 2004 convention; checked on the frames)
            direction = -1
            fcx = (fbx.min() + fbx.max()) / 2
            out['head_ahead_of_feet'] = round((hx - fcx) * direction / H, 3)
            ct = np.nonzero(m[top:top + int(0.25 * H)])[1].mean()
            cb = np.nonzero(m[bot - int(0.25 * H):bot + 1])[1].mean()
            out['lean_sil'] = round(math.degrees(math.atan2((ct - cb) * direction, 0.75 * H)), 1)
            band = m[top + int(0.40 * H):top + int(0.52 * H)]
            bx = np.nonzero(band.any(axis=0))[0]
            out['hands_ahead'] = round(((bx.max() if direction > 0 else -bx.min()) - fcx * direction) / H, 3)
    return out


def capture(gdir):
    game = '2004' if os.sep + '2004' + os.sep in gdir.replace('/', os.sep) else 'ours'
    out = {'dir': gdir, 'game': game}
    Hs = None
    for mode in ('walk', 'run'):
        f = os.path.join(gdir, mode + '_side')
        if os.path.isdir(f):
            try:
                out[mode] = strip(f, game, Hs)
                Hs = Hs or out[mode].get('H_px')
            except Exception as e:  # a bad strip is reported, not fatal
                out[mode] = {'error': repr(e)}
    try:
        out['idle'] = idle(gdir, game)
    except Exception as e:
        out['idle'] = {'error': repr(e)}
    return out


if __name__ == '__main__':
    res = [capture(d) for d in sys.argv[1:]]
    print(json.dumps(res, indent=1))
