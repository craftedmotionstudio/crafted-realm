"""Reference-pair sheets and measurements for the 2004 feel harness (tools/ref2004).

    python tools/ref2004/analyze.py characters     -> sheets + characters/metrics.json
    python tools/ref2004/analyze.py tutorial|ui|scenery   -> pair sheets for those sections

IP rule: every sheet that holds 2004 imagery is written under C:/Users/iQwaZ/ref2004_captures (never the repo).
Only sheets made purely of our own game go to the repo's scratchpad/ref2004. Measurements are plain numbers.
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

CAP = os.environ.get('REF2004_CAPTURES', 'C:/Users/iQwaZ/ref2004_captures')
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OURS_ONLY = os.path.join(REPO, 'scratchpad', 'ref2004')
VIEW2004 = (4, 4, 516, 338)            # the 3D viewport inside the 765x503 applet
REL = [0, 256, 512, 768, 1024, 1280, 1536, 1792]
REL_NAME = {0: 'front', 256: '3/4 front', 512: 'side', 768: '3/4 back', 1024: 'back', 1280: '3/4 back', 1536: 'side', 1792: '3/4 front'}


def font(sz, bold=False):
    try:
        return ImageFont.truetype('C:/Windows/Fonts/' + ('arialbd.ttf' if bold else 'arial.ttf'), sz)
    except OSError:
        return ImageFont.load_default()


def out2004(*parts):
    d = os.path.join(CAP, *parts)
    if os.path.abspath(d).lower().startswith(REPO.lower()):
        raise SystemExit('refusing to write 2004 imagery inside the repo: ' + d)
    os.makedirs(d, exist_ok=True)
    return d


def outours(*parts):
    d = os.path.join(OURS_ONLY, *parts)
    os.makedirs(d, exist_ok=True)
    return d


def load(p):
    return Image.open(p).convert('RGB')


def scale_to_h(im, h, nearest=False):
    w = max(1, round(im.width * h / im.height))
    return im.resize((w, h), Image.NEAREST if nearest else Image.LANCZOS)


# ------------------------------------------------------------------------------------------ silhouettes
def silhouette(frame, plate, center=None, thr=8, open_iter=0):
    """Pixels that change when the player is hidden; the blob nearest `center` (x, y).
    Both renderers are deterministic between the two grabs, so a low threshold is safe; animated scenery (water,
    leaves, idle NPCs) makes other blobs, and only the one at the character is kept."""
    a = np.asarray(frame, dtype=np.int16)
    b = np.asarray(plate, dtype=np.int16)
    raw = np.abs(a - b).sum(axis=2) > thr
    if open_iter:
        raw = ndimage.binary_opening(raw, iterations=open_iter)
    grown = ndimage.binary_dilation(raw, iterations=3)
    lab, n = ndimage.label(grown)
    if n == 0:
        return None
    sizes = ndimage.sum(grown, lab, range(1, n + 1))
    if center is None:
        k = int(np.argmax(sizes)) + 1
    else:
        cx, cy = center
        best, k = None, 1
        for i in range(1, n + 1):
            if sizes[i - 1] < max(30, 0.01 * sizes.max()):
                continue
            ys, xs = np.nonzero(lab == i)
            dd = np.sqrt(np.min((xs - cx) ** 2 + (ys - cy) ** 2))
            if best is None or dd < best:
                best, k = dd, i
    m = raw & (lab == k)
    # drop speckle (grass / leaf flicker that the dilation glued on): keep parts at least 3% of the biggest
    l2, n2 = ndimage.label(m)
    if n2 > 1:
        sz = ndimage.sum(m, l2, range(1, n2 + 1))
        keep = [i + 1 for i in range(n2) if sz[i] >= 0.03 * sz.max()]
        m = np.isin(l2, keep)
    m = ndimage.binary_closing(m, iterations=1)
    m = ndimage.binary_fill_holes(m)
    return m if m.any() else None


def runs(row):
    """(start, end) of each run of True in a 1-D bool array."""
    d = np.diff(np.concatenate([[0], row.astype(np.int8), [0]]))
    return list(zip(np.nonzero(d == 1)[0], np.nonzero(d == -1)[0] - 1))


def body_metrics(mask, view):
    ys, xs = np.nonzero(mask)
    top, bot, left, right = ys.min(), ys.max(), xs.min(), xs.max()
    H = bot - top + 1
    width = np.array([mask[y].sum() for y in range(top, bot + 1)])
    span = np.array([(np.nonzero(mask[y])[0].max() - np.nonzero(mask[y])[0].min() + 1) if mask[y].any() else 0 for y in range(top, bot + 1)])
    out = {'H_px': int(H), 'W_px': int(right - left + 1), 'width_over_H': round((right - left + 1) / H, 3)}
    # head: the neck is the narrowest row 9-26% down from the crown
    a, b = int(0.09 * H), int(0.26 * H)
    neck = a + int(np.argmin(span[a:b]))
    out['head_over_H'] = round(neck / H, 3)
    out['heads_tall'] = round(H / max(1, neck), 2)
    out['head_width_over_H'] = round(span[:neck].max() / H, 3)
    # shoulders / chest span just under the neck
    s0, s1 = neck, min(len(span), neck + int(0.16 * H))
    out['shoulder_span_over_H'] = round(span[s0:s1].max() / H, 3)
    if view == 'front':
        # hands: the lowest row with three or more separate runs (arm | body | arm), above the knees
        hand = None
        for i in range(int(0.75 * H), int(0.3 * H), -1):
            r = [q for q in runs(mask[top + i, left:right + 1]) if q[1] - q[0] >= 1]
            if len(r) >= 3:
                hand = i
                break
        out['hand_low_over_H'] = round(hand / H, 3) if hand else None
        # crotch: below the hands, the first row where the silhouette splits into two legs and stays split
        crotch = None
        start = max(int(0.4 * H), (hand or 0) + 2)
        two = lambda i: len([q for q in runs(mask[top + i, left:right + 1]) if q[1] - q[0] >= 2]) >= 2
        for i in range(start, int(0.92 * H)):
            k = max(2, int(0.03 * H))
            if all(two(j) for j in range(i, min(i + k, H))):
                crotch = i
                break
        out['crotch_from_top_over_H'] = round(crotch / H, 3) if crotch else None
        out['leg_over_H'] = round((H - crotch) / H, 3) if crotch else None
        foot = mask[bot - max(1, int(0.05 * H)):bot + 1, :]
        fx = np.nonzero(foot.any(axis=0))[0]
        out['stance_width_over_H'] = round((fx.max() - fx.min() + 1) / H, 3)
        # waist: narrowest row between chest and crotch
        w0, w1 = neck + int(0.18 * H), (crotch or int(0.55 * H))
        if w1 > w0 + 2:
            out['waist_over_H'] = round(width[w0:w1].min() / H, 3)
    if view == 'side':
        topb = mask[top:top + int(0.25 * H)]
        botb = mask[bot - int(0.25 * H):bot + 1]
        cx_t = np.nonzero(topb)[1].mean()
        cx_b = np.nonzero(botb)[1].mean()
        out['lean_deg_topminusbottom'] = round(math.degrees(math.atan2(cx_t - cx_b, 0.75 * H)), 1)
        out['depth_over_H'] = round(span.max() / H, 3)
    return out


def crop_to(mask, im, pad=0.08):
    ys, xs = np.nonzero(mask)
    H = ys.max() - ys.min() + 1
    p = int(pad * H)
    box = (max(0, xs.min() - p), max(0, ys.min() - p), min(im.width, xs.max() + p + 1), min(im.height, ys.max() + p + 1))
    return im.crop(box), box


# ------------------------------------------------------------------------------------------ gait
def gait(game, folder, meta_extra=None):
    """Cycle timing, speed, stride, bob, leg spread, arm swing, lean from a side strip (locked camera + plate)."""
    d = json.load(open(os.path.join(folder, 'samples.json')))
    S = d['samples']
    plate = load(os.path.join(os.path.dirname(folder), d['plate'])) if d.get('plate') else None
    mode = d.get('mode')
    frames = []
    for r in S:
        if not r.get('file') or not r.get('crop') or plate is None:
            continue
        x, y, w, h = r['crop']
        im = load(os.path.join(folder, r['file']))
        if game == '2004':
            pl = plate.crop((x, y, x + w, y + h))
        else:
            pl = plate.crop((x, y, x + w, y + h))
        if r.get('feet'):
            c = (r['feet'][0] - x, r['feet'][1] - y - 0.4 * (r['feet'][1] - r['head'][1] if r.get('head') else 40))
        else:
            c = (w / 2, h / 2)
        m = silhouette(im, pl, c, thr=8 if game == '2004' else 14)
        frames.append((r, im, m))
    # moving part: position changes
    pos = [(r['t'], (r['x'] / 128.0, r['z'] / 128.0) if game == '2004' else (r['x'], r['z'])) for r, _, _ in frames]
    moving = []
    for i in range(1, len(pos)):
        if math.dist(pos[i][1], pos[i - 1][1]) > 1e-6:
            moving.append(i)
    res = {'mode': mode, 'samples': len(S), 'frames_with_crop': len(frames)}
    if len(moving) < 6:
        res['error'] = 'no movement'
        return res, frames, []
    i0, i1 = moving[0], moving[-1]
    dist = math.dist(pos[i0 - 1][1], pos[i1][1])
    dt = (pos[i1][0] - pos[i0 - 1][0]) / 1000.0
    res['speed_tiles_per_s_whole_leg'] = round(dist / dt, 3) if dt > 0 else None
    # steady pace: the middle 60% of the moving frames (no start-up / stop)
    a_, b_ = moving[len(moving) // 5], moving[len(moving) * 4 // 5]
    dd, tt = math.dist(pos[a_][1], pos[b_][1]), (pos[b_][0] - pos[a_][0]) / 1000.0
    res['speed_tiles_per_s'] = round(dd / tt, 3) if tt > 0 else res['speed_tiles_per_s_whole_leg']
    # cycle: 2004 from the walk/run sequence frame counter, ours from the clip clock
    seq = None
    cyc = []
    if game == '2004':
        target = [r['sa'] for r, _, _ in frames[i0:i1]]
        seq = max(set(target), key=target.count)
        idx = [k for k in range(i0, i1 + 1) if frames[k][0]['sa'] == seq]
        starts = [k for a, k in zip(idx, idx[1:]) if frames[k][0]['saf'] < frames[a][0]['saf']]
        res['anim_seq'] = seq
        res['anim_frames_per_cycle'] = int(max(frames[k][0]['saf'] for k in idx) + 1)
        for a, b in zip(starts, starts[1:]):
            cyc.append((a, b))
    else:
        key = 'run' if mode == 'run' else 'walk'
        idx = [k for k in range(i0, i1 + 1) if frames[k][0].get(key) and frames[k][0][key][1] > 0.6]
        starts = [k for a, k in zip(idx, idx[1:]) if frames[k][0][key][0] < frames[a][0][key][0]]
        for a, b in zip(starts, starts[1:]):
            cyc.append((a, b))
    if cyc:
        durs = [(frames[b][0]['t'] - frames[a][0]['t']) / 1000.0 for a, b in cyc]
        res['cycle_s'] = round(float(np.median(durs)), 3)
        res['steps_per_s'] = round(2 / res['cycle_s'], 2)
        if res.get('speed_tiles_per_s'):
            res['stride_tiles_per_step'] = round(res['speed_tiles_per_s'] * res['cycle_s'] / 2, 3)
            res['tiles_per_cycle'] = round(res['speed_tiles_per_s'] * res['cycle_s'], 3)
            if meta_extra and meta_extra.get('height_tiles'):
                res['stride_in_body_heights'] = round(res['stride_tiles_per_step'] / meta_extra['height_tiles'], 3)
        a, b = cyc[len(cyc) // 2]
        cyc_frames = list(range(a, b))
    else:
        cyc_frames = moving[len(moving) // 3: len(moving) // 3 + 30]
    # silhouette measures over the steady part (middle 60% of the moving frames)
    steady = [k for k in moving[len(moving) // 5: len(moving) * 4 // 5] if frames[k][2] is not None]
    Hs, tops, spreads, arms, leans, widths = [], [], [], [], [], []
    for k in steady:
        r, im, m = frames[k]
        ys, xs = np.nonzero(m)
        if len(ys) < 30:
            continue
        top, bot = ys.min(), ys.max()
        H = bot - top + 1
        Hs.append(H)
        feet_y = r['feet'][1] - r['crop'][1] if r.get('feet') else bot
        tops.append(feet_y - top)
        legs = m[bot - int(0.28 * H):bot + 1]
        lx = np.nonzero(legs.any(axis=0))[0]
        spreads.append((lx.max() - lx.min() + 1))
        band = m[top + int(0.28 * H):top + int(0.55 * H)]
        bx = np.nonzero(band.any(axis=0))[0]
        arms.append((bx.max() - bx.min() + 1))
        ct = np.nonzero(m[top:top + int(0.25 * H)])[1].mean()
        cb = np.nonzero(m[bot - int(0.25 * H):bot + 1])[1].mean()
        leans.append(math.degrees(math.atan2(ct - cb, 0.75 * H)))
        widths.append(xs.max() - xs.min() + 1)
    if Hs:
        Hm = float(np.median(Hs))
        res['H_px_median'] = round(Hm, 1)
        res['bob_pct_of_H'] = round(100 * (np.percentile(tops, 95) - np.percentile(tops, 5)) / Hm, 1)
        res['leg_spread_max_over_H'] = round(np.percentile(spreads, 95) / Hm, 3)
        res['arm_band_width_max_over_H'] = round(np.percentile(arms, 95) / Hm, 3)
        res['arm_band_width_min_over_H'] = round(np.percentile(arms, 5) / Hm, 3)
        # lean sign: positive = top of the body ahead of the feet in the direction of travel (screen x)
        vx = np.sign(np.mean([frames[k][0]['feet'][0] - frames[k - 1][0]['feet'][0] for k in steady if frames[k][0].get('feet') and frames[k - 1][0].get('feet')]) or 1)
        res['lean_deg_forward'] = round(float(np.median(leans)) * vx, 1)
    return res, frames, cyc_frames


# ------------------------------------------------------------------------------------------ sheets
def label(im, text, sz=22, color=(255, 255, 255), bg=(0, 0, 0)):
    d = ImageDraw.Draw(im)
    f = font(sz, True)
    tw = d.textlength(text, font=f)
    d.rectangle((0, 0, tw + 12, sz + 8), fill=bg)
    d.text((6, 3), text, fill=color, font=f)
    return im


def row(images, gap=8, bg=(24, 22, 20)):
    H = max(i.height for i in images)
    W = sum(i.width for i in images) + gap * (len(images) - 1)
    out = Image.new('RGB', (W, H), bg)
    x = 0
    for i in images:
        out.paste(i, (x, (H - i.height) // 2))
        x += i.width + gap
    return out


def col(images, gap=8, bg=(24, 22, 20)):
    W = max(i.width for i in images)
    H = sum(i.height for i in images) + gap * (len(images) - 1)
    out = Image.new('RGB', (W, H), bg)
    y = 0
    for i in images:
        out.paste(i, (0, y))
        y += i.height + gap
    return out


def titled(im, title, sub=None):
    f, fs = font(30, True), font(18)
    h = 48 + (26 if sub else 0)
    out = Image.new('RGB', (im.width, im.height + h), (12, 12, 12))
    d = ImageDraw.Draw(out)
    d.text((12, 8), title, fill=(255, 215, 90), font=f)
    if sub:
        d.text((12, 46), sub, fill=(200, 200, 200), font=fs)
    out.paste(im, (0, h))
    return out


def save_pair_sheet(name, im, section):
    p = os.path.join(out2004('sheets'), name)
    im.save(p)
    if section:
        im.save(os.path.join(out2004(section, 'SHEETS'), name))
    return p


# ------------------------------------------------------------------------------------------ characters
def characters():
    root = os.path.join(CAP, 'characters')
    metrics = {}
    for g in ['m', 'f']:
        d04, dou = os.path.join(root, '2004', g), os.path.join(root, 'ours', g)
        if not (os.path.isdir(d04) and os.path.isdir(dou)):
            print('skip', g, '(missing a side)')
            continue
        gname = {'m': 'man', 'f': 'woman'}[g]
        m04 = json.load(open(os.path.join(d04, 'meta.json')))
        mou = json.load(open(os.path.join(dou, 'meta.json')))
        M = metrics.setdefault(gname, {'2004': {'height_units': m04.get('height'), 'height_tiles': round(m04.get('height', 0) / 128, 3)},
                                       'ours': {'height_units': mou.get('height'), 'height_tiles': mou.get('height'),
                                                'run_on_by_default': mou.get('runDefault'), 'clips': mou.get('clips')}})
        # ---- designer
        t04 = [scale_to_h(load(os.path.join(d04, 'designer_%s.png' % n)), 480, True) for n in ['yaw-45', 'yaw-22', 'front', 'yaw+22', 'yaw+45']]
        tou = [scale_to_h(load(os.path.join(dou, 'designer_%s.png' % n)), 480) for n in ['yaw-45', 'front', 'yaw+45', 'side', 'back']]
        sheet = col([label(row(t04), '2004 designer: sways +-45 deg (no side/back view)'), label(row(tou), 'ours: kit creator (full turntable)')])
        save_pair_sheet('characters_designer_views_%s.png' % gname, titled(sheet, 'Character designer, default %s' % gname, '2004 left-to-right: -45, -22, front, +22, +45 deg | ours: -45, front, +45, side, back'), 'characters')
        full = row([load(os.path.join(d04, 'designer_full.png')).resize((1530, 1006), Image.NEAREST), load(os.path.join(dou, 'designer_full.png')).resize((1530, 1006), Image.LANCZOS)], gap=12)
        save_pair_sheet('characters_designer_screen_%s.png' % gname, titled(full, 'Designer screen, default %s: 2004 (x2) | ours' % gname), 'characters')
        # ---- world, default cameras (each game's own)
        rowsw = []
        for rel in [0, 512]:
            a = load(os.path.join(d04, 'world_rel%d.png' % rel)).resize((1530, 1006), Image.NEAREST)
            b = load(os.path.join(dou, 'world_rel%d.png' % rel))
            rowsw.append(row([label(a, '2004 default camera (pitch 128), %s' % REL_NAME[rel]), label(b, 'ours default camera, %s' % REL_NAME[rel])], gap=12))
        save_pair_sheet('characters_world_default_%s.png' % gname, titled(col(rowsw), 'Idle in the world at each game\'s default camera, %s' % gname), 'characters')
        # ---- world, the 2004 lens on ours (tile-matched)
        rowsm = []
        for rel in [0, 512]:
            a = load(os.path.join(d04, 'world_rel%d.png' % rel)).crop(VIEW2004).resize((1536, 1002), Image.NEAREST)
            b = load(os.path.join(dou, 'matched_rel%d.png' % rel))
            rowsm.append(row([label(a, '2004 viewport x3'), label(b, 'ours through the 2004 lens (36.1 deg vfov, 22.5 deg, 7.7-tile boom)')], gap=12))
        save_pair_sheet('characters_world_matched_lens_%s.png' % gname, titled(col(rowsm), 'Same lens, same tiles: %s' % gname, 'tile-matched camera: the character-to-world scale difference shows directly'), 'characters')
        # ---- close-up turnaround + body metrics
        tiles04, tilesou = [], []
        M['2004']['body'], M['ours']['body'] = {}, {}
        for rel in REL:
            view = 'front' if rel == 0 else 'side' if rel in (512, 1536) else None
            for game, dd, tiles, nearest in [('2004', d04, tiles04, True), ('ours', dou, tilesou, False)]:
                fr = load(os.path.join(dd, 'close_rel%d.png' % rel))
                pl = load(os.path.join(dd, 'close_rel%d_plate.png' % rel))
                if game == '2004':
                    fr, pl = fr.crop(VIEW2004), pl.crop(VIEW2004)
                m = silhouette(fr, pl, (fr.width / 2, fr.height / 2), thr=8 if game == '2004' else 14)
                if m is None:
                    tiles.append(label(Image.new('RGB', (200, 420), (40, 0, 0)), 'no silhouette', 16))
                    continue
                if view and rel in (0, 512):
                    M[game]['body'][view] = body_metrics(m, view)
                c, box = crop_to(m, fr)
                c = scale_to_h(c, 420, nearest)
                tiles.append(label(c, REL_NAME[rel], 16))
        sheet = col([label(row(tiles04), '2004 close-up turnaround (pitch 128)'), label(row(tilesou), 'ours, same lens, height-matched')])
        save_pair_sheet('characters_turnaround_%s.png' % gname, titled(sheet, 'Turnaround, default %s (scaled to equal height)' % gname, 'camera 22.5 deg above, look point at mid-height; 0 = front'), 'characters')
        # ours-only turnaround for the repo
        row(tilesou).save(os.path.join(outours('characters'), 'ours_turnaround_%s.png' % gname))
        # front / side silhouettes overlay with guide lines
        overlay = []
        for game, dd, near in [('2004', d04, True), ('ours', dou, False)]:
            for rel in (0, 512):
                fr = load(os.path.join(dd, 'close_rel%d.png' % rel))
                pl = load(os.path.join(dd, 'close_rel%d_plate.png' % rel))
                if game == '2004':
                    fr, pl = fr.crop(VIEW2004), pl.crop(VIEW2004)
                m = silhouette(fr, pl, (fr.width / 2, fr.height / 2), thr=8 if game == '2004' else 14)
                if m is None:
                    continue
                c, box = crop_to(m, fr, 0.04)
                mm = m[box[1]:box[3], box[0]:box[2]]
                sil = Image.fromarray(np.where(mm[..., None], np.array([235, 235, 235], np.uint8), np.array([30, 30, 30], np.uint8)))
                sil = scale_to_h(sil, 460, True)
                dr = ImageDraw.Draw(sil)
                bm = M[game]['body'].get('front' if rel == 0 else 'side', {})
                ys = np.nonzero(mm)[0]
                H = ys.max() - ys.min() + 1
                y0 = (ys.min()) * 460 / mm.shape[0]
                Hs = H * 460 / mm.shape[0]
                for key, colr in [('head_over_H', (255, 80, 80)), ('crotch_from_top_over_H', (80, 160, 255)), ('hand_low_over_H', (90, 220, 90))]:
                    if bm.get(key):
                        yy = y0 + bm[key] * Hs
                        dr.line((0, yy, sil.width, yy), fill=colr, width=2)
                overlay.append(label(sil, '%s %s' % (game, 'front' if rel == 0 else 'side'), 16))
        if overlay:
            save_pair_sheet('characters_silhouettes_%s.png' % gname, titled(row(overlay), 'Silhouettes, %s: red = neck (head height), blue = crotch, green = hand tips' % gname), 'characters')
        # ---- gait strips + metrics
        M['2004']['gait'], M['ours']['gait'] = {}, {}
        for mode in ['walk', 'run']:
            for cam in ['side', 'game']:
                rowsg = []
                for game, dd, nearest in [('2004', d04, True), ('ours', dou, False)]:
                    folder = os.path.join(dd, '%s_%s' % (mode, cam))
                    if not os.path.isdir(folder):
                        continue
                    if cam == 'side':
                        res, frames, cyc = gait(game, folder, {'height_tiles': M[game]['height_tiles']})
                        M[game]['gait'][mode] = res
                    else:
                        res, frames, cyc = gait_game(game, folder)
                    tiles = strip_tiles(frames, cyc, nearest, cam == 'side')
                    txt = '%s %s (%s cam)' % (game, mode, cam)
                    if cam == 'side' and res.get('cycle_s'):
                        txt += ': cycle %.2fs, %.2f steps/s, %.2f tiles/s, stride %.2f tiles' % (res['cycle_s'], res['steps_per_s'], res.get('speed_tiles_per_s') or 0, res.get('stride_tiles_per_step') or 0)
                    if tiles:
                        rowsg.append(label(row(tiles), txt, 18))
                    if game == 'ours' and tiles:
                        row(tiles).save(os.path.join(outours('characters'), 'ours_%s_%s_%s.png' % (mode, cam, gname)))
                if rowsg:
                    save_pair_sheet('characters_%s_%s_%s.png' % (mode, cam, gname), titled(col(rowsg), '%s cycle, %s camera, %s: 8 evenly spaced frames of one cycle' % (mode.title(), cam, gname)), 'characters')
    json.dump(metrics, open(os.path.join(root, 'metrics.json'), 'w'), indent=1)
    print(json.dumps(metrics, indent=1)[:6000])


def gait_game(game, folder):
    d = json.load(open(os.path.join(folder, 'samples.json')))
    S = d['samples']
    frames = [(r, load(os.path.join(folder, r['file'])), None) for r in S if r.get('file')]
    res = {}
    cyc = []
    if game == '2004':
        target = [r['sa'] for r, _, _ in frames]
        mv = [k for k in range(1, len(frames)) if frames[k][0]['x'] != frames[k - 1][0]['x'] or frames[k][0]['z'] != frames[k - 1][0]['z']]
        if mv:
            seqs = [frames[k][0]['sa'] for k in mv]
            seq = max(set(seqs), key=seqs.count)
            idx = [k for k in range(mv[0], mv[-1]) if frames[k][0]['sa'] == seq]
            starts = [k for a, k in zip(idx, idx[1:]) if frames[k][0]['saf'] < frames[a][0]['saf']]
            cyc = list(zip(starts, starts[1:]))
    else:
        key = 'run' if d.get('mode') == 'run' else 'walk'
        idx = [k for k in range(len(frames)) if frames[k][0].get(key) and frames[k][0][key][1] > 0.6]
        starts = [k for a, k in zip(idx, idx[1:]) if frames[k][0][key][0] < frames[a][0][key][0]]
        cyc = list(zip(starts, starts[1:]))
    if cyc:
        a, b = cyc[len(cyc) // 2]
        return res, frames, list(range(a, b))
    return res, frames, []


def strip_tiles(frames, cyc, nearest, use_mask):
    if not cyc or not frames:
        return []
    t0, t1 = frames[cyc[0]][0]['t'], frames[cyc[-1]][0]['t'] + (frames[cyc[-1]][0]['t'] - frames[cyc[-2]][0]['t'] if len(cyc) > 1 else 20)
    picks = []
    for i in range(8):
        tt = t0 + (t1 - t0) * i / 8
        k = min(cyc, key=lambda k: abs(frames[k][0]['t'] - tt))
        picks.append(k)
    tiles = []
    # a common crop box around the character for all picked frames
    boxes = []
    for k in picks:
        r, im, m = frames[k]
        if use_mask and m is not None and m.any():
            ys, xs = np.nonzero(m)
            boxes.append((xs.min(), ys.min(), xs.max(), ys.max()))
        elif r.get('feet') and r.get('head'):
            fx, fy = r['feet'][0] - r['crop'][0], r['feet'][1] - r['crop'][1]
            hy = r['head'][1] - r['crop'][1]
            hh = fy - hy
            boxes.append((fx - 0.45 * hh, hy - 0.1 * hh, fx + 0.45 * hh, fy + 0.08 * hh))
    for k in picks:
        r, im, m = frames[k]
        if boxes:
            if use_mask and m is not None and m.any():
                ys, xs = np.nonzero(m)
                cx = (xs.min() + xs.max()) / 2
                hh = max(b[3] - b[1] for b in boxes)
                ww = max(b[2] - b[0] for b in boxes)
                bx = (cx - ww / 2 - 0.08 * hh, ys.max() - hh - 0.08 * hh, cx + ww / 2 + 0.08 * hh, ys.max() + 0.06 * hh)
            else:
                bx = boxes[picks.index(k)] if picks.index(k) < len(boxes) else boxes[0]
            c = im.crop(tuple(int(round(v)) for v in bx))
        else:
            c = im
        c = scale_to_h(c, 300, nearest)
        tiles.append(label(c, '%.0f ms' % (r['t'] - frames[picks[0]][0]['t']), 14))
    return tiles


if __name__ == '__main__':
    what = sys.argv[1] if len(sys.argv) > 1 else 'characters'
    if what == 'characters':
        characters()
    else:
        import ref2004_sections  # noqa: E402  (tutorial / ui / scenery pair sheets)
        ref2004_sections.run(what)
