"""The PRIVATE 2004 reference pack for the Gait Lab (tools/gait_lab.html; owner review 5, round 3).

    python tools/ref2004/gait_lab_refpack.py

From the 2004 captures (characters/2004/<g>/{walk,run}_{side,game}) it picks ONE frame per 2004 animation pose (the 8 held
poses of a walk / run cycle, the most complete one seen), crops it round the character's ground point, and writes:

    C:/Users/iQwaZ/ref2004_captures/gait_lab/
        gait_ref.js                  window.GAIT_REF = {clips: {m_walk_side: {poses: [{file, ms}], anchor, H, ...}, ...}}
        <g>_<mode>_<view>_<k>.png    the pose with its own background
        <g>_<mode>_side_<k>_cut.png  side view only: the character alone (cut out with the empty-lane plate)
        Start Gait Lab reference.bat double-click: serves this folder on http://127.0.0.1:8150 (localhost only)
        README.txt

The lab loads gait_ref.js with a <script> tag and the frames as <img>, from http://127.0.0.1:8150 or from this folder picked in
the page -- nothing of it ever enters the repo (out2004 refuses any path inside it). The frames are shown for the owner's eye;
nothing is traced or extracted into our assets.
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import analyze as A  # noqa: E402

OUT = A.out2004('gait_lab')
CH = os.path.join(A.CAP, 'characters', '2004')
SEQ = {'walk': 819, 'run': 824}


def pose_frames(g, mode, view):
    folder = os.path.join(CH, g, '%s_%s' % (mode, view))
    d = json.load(open(os.path.join(folder, 'samples.json')))
    S = d['samples']
    plate = A.load(os.path.join(os.path.dirname(folder), d['plate'])) if d.get('plate') else None
    mv = [i for i in range(1, len(S)) if (S[i]['x'], S[i]['z']) != (S[i - 1]['x'], S[i - 1]['z'])]
    steady = [i for i in range(mv[len(mv) // 6], mv[len(mv) * 5 // 6]) if S[i]['sa'] == SEQ[mode] and S[i].get('file')]
    # display time of each pose (median over the steady cycles)
    runs_, prev = [], None
    for i in steady:
        s = S[i]
        if prev is None or s['saf'] != prev[0]:
            runs_.append([s['saf'], s['t']])
            prev = runs_[-1]
    dur = {}
    for a, b in zip(runs_, runs_[1:]):
        dur.setdefault(a[0], []).append(b[1] - a[1])
    ms = {k: float(np.median(v)) for k, v in dur.items()}
    best = {}
    for i in steady:
        r = S[i]
        im = A.load(os.path.join(folder, r['file']))
        x, y, w, h = r['crop']
        m = None
        score = 0.0
        if plate is not None:
            pl = plate.crop((x, y, x + w, y + h))
            c = (r['feet'][0] - x, r['feet'][1] - y - 0.4 * (r['feet'][1] - r['head'][1]))
            m = A.silhouette(im, pl, c, thr=8)
            clutter = 0
            if m is not None and m.any():
                # keep the character's own blob (the biggest part and the parts inside its box); what else changed between
                # frame and plate (a passer-by, the hint arrow) is clutter -- frames with less of it win
                lab, n = ndimage.label(m)
                if n > 1:
                    sz = ndimage.sum(m, lab, range(1, n + 1))
                    big = int(np.argmax(sz)) + 1
                    sl = ndimage.find_objects(lab)[big - 1]
                    y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
                    keep = np.zeros_like(m)
                    for i_, s_ in enumerate(ndimage.find_objects(lab)):
                        cy_, cx_ = (s_[0].start + s_[0].stop) / 2, (s_[1].start + s_[1].stop) / 2
                        if i_ + 1 == big or (y0 <= cy_ <= y1 and x0 <= cx_ <= x1):
                            keep |= lab == i_ + 1
                    clutter = int(m.sum() - keep.sum())
                    m = keep
                rgb = np.asarray(im).astype(int)
                yellow = int((m & (rgb[..., 0] > 200) & (rgb[..., 1] > 200) & (rgb[..., 2] < 90)).sum())
                clutter += 20 * yellow
                # the most complete view of the character alone: a big silhouette, but not one glued to scenery or another
                # person walking past (too wide / too tall for the character at this pose)
                ys, xs = np.nonzero(m)
                Hn = r['feet'][1] - r['head'][1]
                wide = (np.ptp(xs) + 1) / max(1.0, Hn) - (0.62 if mode == 'walk' else 0.85)
                tall = abs((np.ptp(ys) + 1) / max(1.0, Hn) - 1.1)
                score = float(m.sum()) - 1e5 * max(0.0, wide) - 1e5 * max(0.0, tall - .15) - 5.0 * clutter
            else:
                score = -1e9
        else:
            # no plate on the following camera: prefer the frame nearest the middle of the pose's display
            score = -abs(i - np.median([j for j in steady if S[j]['saf'] == r['saf']]))
        if r['saf'] not in best or score > best[r['saf']][0]:
            best[r['saf']] = (score, r, im, m)
    return best, ms


def main():
    ref = {'version': 1, 'note': 'PRIVATE 2004 reference frames for tools/gait_lab.html -- never commit or publish', 'clips': {}}
    for g in ('m', 'f'):
        for mode in ('walk', 'run'):
            for view in ('side', 'game'):
                best, ms = pose_frames(g, mode, view)
                if len(best) < 8:
                    print('skip', g, mode, view, 'poses', sorted(best))
                    continue
                # the standing height on this camera: the model top projected (the sampler's head / feet points)
                hs = [r['feet'][1] - r['head'][1] for _, r, _, _ in best.values() if r.get('head')]
                H = float(np.median(hs))
                if view == 'side':   # the side strips: the tallest silhouettes (the passing poses stand nearly straight)
                    sil = [np.ptp(np.nonzero(m)[0]) + 1 for _, _, _, m in best.values() if m is not None and m.any()]
                    H = float(np.percentile(sil, 90)) if sil else H
                W, Hc = int(round(1.0 * H)), int(round(1.3 * H))
                ax, ay = W // 2, int(round(1.15 * H))          # the ground point sits here in every crop
                poses = []
                key = '%s_%s_%s' % (g, mode, view)
                for k in range(8):
                    _, r, im, m = best[k]
                    fx, fy = r['feet'][0] - r['crop'][0], r['feet'][1] - r['crop'][1]
                    box = (int(round(fx - ax)), int(round(fy - ay)), int(round(fx - ax)) + W, int(round(fy - ay)) + Hc)
                    canvas = Image.new('RGB', (W, Hc), (0, 0, 0))
                    canvas.paste(im.crop((max(0, box[0]), max(0, box[1]), min(im.width, box[2]), min(im.height, box[3]))),
                                 (max(0, -box[0]), max(0, -box[1])))
                    f = '%s_%d.png' % (key, k)
                    canvas.save(os.path.join(OUT, f))
                    e = {'file': f, 'ms': round(ms.get(k, 0.0), 1)}
                    if m is not None:
                        mm = ndimage.binary_dilation(m, iterations=1)
                        a = np.zeros((Hc, W), np.uint8)
                        sy0, sx0 = max(0, box[1]), max(0, box[0])
                        sub = mm[sy0:min(im.height, box[3]), sx0:min(im.width, box[2])]
                        a[sy0 - box[1]:sy0 - box[1] + sub.shape[0], sx0 - box[0]:sx0 - box[0] + sub.shape[1]] = sub * 255
                        rgba = canvas.convert('RGBA')
                        rgba.putalpha(Image.fromarray(a))
                        fc = '%s_%d_cut.png' % (key, k)
                        rgba.save(os.path.join(OUT, fc))
                        e['cut'] = fc
                    poses.append(e)
                cyc = sum(p['ms'] for p in poses)
                ref['clips'][key] = {'poses': poses, 'cycle_ms': round(cyc, 1), 'anchor': [ax, ay], 'size': [W, Hc], 'H': round(H, 1),
                                     'facing': 'right' if view == 'side' else 'away-right'}
                print(key, 'cycle %.0f ms' % cyc, 'H %.0f px' % H, [p['ms'] for p in poses])
    with open(os.path.join(OUT, 'gait_ref.js'), 'w', encoding='utf-8') as fh:
        fh.write('/* PRIVATE: 2004 reference frames for the Gait Lab. Never commit or publish. */\n')
        fh.write('window.GAIT_REF = ' + json.dumps(ref, indent=1) + ';\n')
    with open(os.path.join(OUT, 'Start Gait Lab reference.bat'), 'w', encoding='utf-8') as fh:
        fh.write('@echo off\r\ncd /d "%~dp0"\r\necho Gait Lab 2004 reference: http://127.0.0.1:8150  (localhost only; close this window to stop)\r\n'
                 'python -m http.server 8150 --bind 127.0.0.1\r\n')
    with open(os.path.join(OUT, 'README.txt'), 'w', encoding='utf-8') as fh:
        fh.write('PRIVATE 2004 reference for the Gait Lab (http://localhost:8777/tools/gait_lab.html).\r\n'
                 'Either double-click "Start Gait Lab reference.bat" (the lab then loads it by itself), or in the lab press\r\n'
                 '"Choose reference folder" and pick this folder. Never commit, copy into the game, or publish these frames.\r\n')
    print('wrote', OUT)


if __name__ == '__main__':
    main()
