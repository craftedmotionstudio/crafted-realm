"""Pair sheets for the tutorial, UI and scenery sections (imported by analyze.py).
2004 on the left (the 765x503 applet scaled x2, nearest), ours on the right (1530x1006). Sheets with 2004 imagery
go to C:/Users/iQwaZ/ref2004_captures/sheets only; our-only sheets to scratchpad/ref2004."""
import glob
import json
import os

import numpy as np
from PIL import Image

from analyze import CAP, col, label, load, out2004, outours, row, save_pair_sheet, scale_to_h, titled

W, H = 1530, 1006
# the 2004 applet's fixed layout (765 x 503)
UI2004 = {'viewport': (4, 4, 516, 338), 'chat': (0, 338, 519, 503), 'side': (522, 168, 765, 503), 'minimap': (550, 0, 765, 160),
          'tabs_top': (522, 160, 765, 205), 'tabs_bottom': (522, 460, 765, 503)}


def big2004(p):
    return load(p).resize((W, H), Image.NEAREST)


def first(*pats):
    for p in pats:
        g = sorted(glob.glob(p))
        if g:
            return g[0]
    return None


def pair(a, b, la, lb):
    ims = []
    ims.append(label(big2004(a), la) if a else label(Image.new('RGB', (W, H), (40, 0, 0)), la + ' (missing)'))
    ims.append(label(load(b).resize((W, H)), lb) if b else label(Image.new('RGB', (W, H), (40, 0, 0)), lb + ' (missing)'))
    return row(ims, gap=12)


def anim_strip(folder, game, n=8):
    """8 frames of one action cycle (2004: the primary animation counter wraps; ours: evenly over the burst)."""
    sj = os.path.join(folder, 'samples.json')
    if not os.path.exists(sj):
        return None, None
    d = json.load(open(sj))
    S = [r for r in d['samples'] if r.get('file')]
    if not S:
        return None, None
    info = {}
    if game == '2004':
        act = [i for i, r in enumerate(S) if r.get('pa', -1) != -1]
        if act:
            seq = max(set(S[i]['pa'] for i in act), key=[S[i]['pa'] for i in act].count)
            idx = [i for i in act if S[i]['pa'] == seq]
            starts = [k for a, k in zip(idx, idx[1:]) if S[k]['paf'] < S[a]['paf']]
            if len(starts) >= 2:
                a, b = starts[0], starts[1]
                info['cycle_s'] = round((S[b]['t'] - S[a]['t']) / 1000, 3)
                info['frames'] = int(max(S[k]['paf'] for k in idx) + 1)
                cyc = list(range(a, b))
            else:
                cyc = idx
            info['anim'] = seq
        else:
            cyc = list(range(len(S)))
    else:
        cyc = list(range(len(S)))
    if not cyc:
        return None, info
    t0, t1 = S[cyc[0]]['t'], S[cyc[-1]]['t']
    picks = [min(cyc, key=lambda k: abs(S[k]['t'] - (t0 + (t1 - t0) * i / n))) for i in range(n)]
    tiles = []
    for k in picks:
        im = load(os.path.join(folder, S[k]['file']))
        im = scale_to_h(im, 280, game == '2004')
        tiles.append(label(im, '%.0f ms' % (S[k]['t'] - t0), 14))
    return row(tiles), info


MOMENTS = [
    # name, 2004 still candidates, ours still candidates, 2004 anim folder, ours anim keyword
    ('arrival', ['arrival.png'], ['arrival.png'], None, None),
    ('first_instructor_building', ['guide_dialogue.png', 'guide_interior.png'], ['dialogue_bram.png', 'guide_interior.png'], None, None),
    ('survival_instructor', ['survival_dialogue.png', 'survival_area.png'], ['dialogue_wenna.png'], None, None),
    ('woodcutting', [], [], 'woodcutting', ['chop', 'wood', 'axe', 'hatchet']),
    ('firemaking', [], [], 'firemaking', ['fire', 'light', 'tinder', 'kneel']),
    ('fishing', [], [], 'fishing', ['net', 'fish']),
    ('cooking', [], [], 'cooking', ['cook']),
    ('chef_building', ['chef_dialogue.png', 'chef_building.png'], ['dialogue_hettie.png', 'chef_building.png'], 'baking', ['bake', 'knead']),
    ('quest_guide_building', ['quest_dialogue.png', 'quest_building.png'], ['dialogue_ansel.png', 'quest_building.png'], None, None),
    ('mine', ['mine.png', 'mining_dialogue.png'], ['dialogue_durgin.png', 'mine.png'], 'mining', ['mine', 'pick']),
    ('smelting_smithing', [], [], 'smelting', ['smelt', 'smith', 'hammer', 'anvil']),
    ('combat', ['combat_area.png', 'combat_dialogue.png'], ['dialogue_corrick.png', 'combat_melee_trial_3.png', 'combat_melee_trial_0.png'], 'combat', ['attack', 'slash', 'stab', 'punch', 'strike']),
    ('combat_hit', [], ['combat_melee_trial_4.png', 'combat_melee_trial_2.png'], 'combat', None),
    ('bank', ['bank.png'], ['bank.png'], 'bank', None),
]


def tutorial():
    d4, do = os.path.join(CAP, 'tutorial', '2004'), os.path.join(CAP, 'tutorial', 'ours')
    oursdirs = [p for p in glob.glob(os.path.join(do, 'anim_*')) if os.path.isdir(p)]
    for name, s4, so, a4, ao in MOMENTS:
        a = first(*[os.path.join(d4, x) for x in s4]) if s4 else None
        b = first(*[os.path.join(do, x) for x in so]) if so else None
        # an animated moment: take a mid-action full frame from the sampler for the still
        f4 = os.path.join(d4, a4) if a4 else None
        if f4 and not a and os.path.isdir(f4):
            a = first(f4 + '.png', os.path.join(f4, 'full_0010.png'), os.path.join(f4, 'full_00*.png'), os.path.join(f4, 'full_*.png'))
        fo = None
        if ao:
            for p in oursdirs:
                if any(k in os.path.basename(p).lower() for k in ao):
                    fo = p
                    break
        if fo and not b:
            b = first(fo + '.png')
        parts = [pair(a, b, '2004: ' + name, 'ours: ' + name)]
        info = {}
        if f4 and os.path.isdir(f4):
            s, info = anim_strip(f4, '2004')
            if s is not None:
                parts.append(label(s, '2004 action frames' + (' - cycle %.2fs, %d frames' % (info['cycle_s'], info['frames']) if info.get('cycle_s') else ''), 18))
        if fo:
            s, _ = anim_strip(fo, 'ours')
            if s is not None:
                parts.append(label(s, 'ours action frames (%s)' % os.path.basename(fo)[5:], 18))
                s.save(os.path.join(outours('tutorial'), 'ours_%s_frames.png' % name))
        if b:
            load(b).save(os.path.join(outours('tutorial'), 'ours_%s.png' % name))
        save_pair_sheet('tutorial_%s.png' % name, titled(col(parts), 'Tutorial island: %s' % name.replace('_', ' '), 'left 2004 (x2), right ours; default cameras'), 'tutorial')
        print('tutorial', name, 'ok' if (a and b) else 'partial', json.dumps(info))


def ui():
    d4, do = os.path.join(CAP, 'tutorial', '2004'), os.path.join(CAP, 'tutorial', 'ours')
    lo = {}
    try:
        lo = json.load(open(os.path.join(do, 'log.json'))).get('uiRects', {})
    except Exception:
        pass

    def crop_ours(p, key, pad=6):
        r = lo.get(key)
        im = load(p)
        if not r:
            return im
        x, y, w, h = r
        return im.crop((max(0, x - pad), max(0, y - pad), min(im.width, x + w + pad), min(im.height, y + h + pad)))

    def crop_2004(p, key):
        return load(p).crop(UI2004[key]).resize(((UI2004[key][2] - UI2004[key][0]) * 2, (UI2004[key][3] - UI2004[key][1]) * 2), Image.NEAREST)
    # 1) chat box with an NPC dialogue
    a = first(os.path.join(d4, 'guide_dialogue.png'), os.path.join(d4, 'chef_dialogue.png'))
    b = first(os.path.join(do, 'dialogue_bram.png'), os.path.join(do, 'dialogue_*.png'))
    if a and b:
        sheet = col([label(crop_2004(a, 'chat'), '2004 chat box, NPC dialogue (x2)'), label(crop_ours(b, 'chatbox-frame', 40), 'ours chat box, NPC dialogue (1:1)')])
        save_pair_sheet('ui_chat_dialogue.png', titled(sheet, 'Chat box with an NPC dialogue: text placement'), 'ui')
        save_pair_sheet('ui_chat_dialogue_full.png', titled(pair(a, b, '2004', 'ours'), 'Dialogue in context'), 'ui')
    # 2) right-click menus
    for m in ['menu_npc', 'menu_ground']:
        a, b = first(os.path.join(d4, m + '.png')), first(os.path.join(do, m + '.png'))
        if a or b:
            save_pair_sheet('ui_%s.png' % m, titled(pair(a, b, '2004', 'ours'), 'Right-click menu (%s)' % m[5:]), 'ui')
    # 3) side tabs
    tabs4 = sorted(glob.glob(os.path.join(d4, 'tab_*.png')))
    tabso = sorted(glob.glob(os.path.join(do, 'tab_*.png')))
    if tabs4:
        r4 = row([label(crop_2004(p, 'side'), os.path.basename(p)[4:-4], 14) for p in tabs4 if os.path.basename(p)[4:-4].isdigit()][:10], gap=6)
        ro = row([label(crop_ours(p, 'side-panel'), os.path.basename(p)[4:-4], 14) for p in tabso][:10], gap=6) if tabso else None
        parts = [label(r4, '2004 side panel per tab (x2)')] + ([label(ro, 'ours side panel per tab (1:1)')] if ro else [])
        save_pair_sheet('ui_side_tabs.png', titled(col(parts), 'Side tabs'), 'ui')
    # 4) minimap + run control
    a = first(os.path.join(d4, 'bank.png'), os.path.join(d4, 'arrival.png'))
    b = first(os.path.join(do, 'arrival.png'))
    if a and b:
        parts = [label(crop_2004(a, 'minimap'), '2004 minimap + compass (x2)'), label(crop_ours(b, 'minimap-frame', 12), 'ours minimap (1:1)')]
        if lo.get('run-orb'):
            parts.append(label(crop_ours(b, 'run-orb', 30), 'ours run orb'))
        c12 = first(os.path.join(d4, 'tab_12.png'))
        if c12:
            parts.append(label(crop_2004(c12, 'side'), '2004 run control: Walk / Run buttons in the controls tab (no run orb in 2004)'))
        save_pair_sheet('ui_minimap_run.png', titled(row(parts, gap=16), 'Minimap and run control'), 'ui')
    # 5) whole-screen layout
    a, b = first(os.path.join(d4, 'arrival.png')), first(os.path.join(do, 'arrival.png'))
    if a and b:
        save_pair_sheet('ui_layout.png', titled(pair(a, b, '2004 (x2)', 'ours'), 'Screen layout at the same window size'), 'ui')
    print('ui sheets done')


def scenery():
    d4, do = os.path.join(CAP, 'scenery', '2004'), os.path.join(CAP, 'scenery', 'ours')
    names4 = sorted(set(os.path.basename(p).split('_p128')[0] for p in glob.glob(os.path.join(d4, '*_p128_y0.png'))))
    kinds = ['town', 'field', 'water']
    stats = {}
    for k in kinds:
        n4 = [n for n in names4 if n.startswith(k)]
        ours_lens = sorted(glob.glob(os.path.join(do, k + '_holm_p128_y*.png')))
        for i, n in enumerate(n4):
            rows_ = []
            for j, y in enumerate([0, 1024]):
                a = os.path.join(d4, '%s_p128_y%d.png' % (n, y))
                vp = load(a).crop(UI2004['viewport']).resize((1536, 1002), Image.NEAREST)
                ims = [label(vp, '2004 %s, pitch 128 (viewport x3)' % n)]
                bo = ours_lens[j] if j < len(ours_lens) else None
                if bo:
                    ims.append(label(load(bo), 'ours %s through the 2004 lens' % os.path.basename(bo)[:-4]))
                    bd = bo.replace('_p128_', '_default_')
                    if os.path.exists(bd):
                        ims.append(label(load(bd), 'ours, our default camera'))
                rows_.append(row(ims, gap=12))
                stats.setdefault(k, []).append({'2004': image_stats(vp), 'ours': image_stats(load(bo)) if bo else None})
            save_pair_sheet('scenery_%s_%d.png' % (k, i), titled(col(rows_), 'Scenery: %s' % n.replace('_', ' ')), 'scenery')
    json.dump(stats, open(os.path.join(out2004('scenery'), 'image_stats.json'), 'w'), indent=1)
    print(json.dumps(summarise(stats), indent=1))


def image_stats(im):
    """Colour / texture numbers for the feel report: saturation, value contrast, edge density, palette size."""
    a = np.asarray(im.convert('RGB'), dtype=np.float32) / 255.0
    mx, mn = a.max(axis=2), a.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    lum = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    gx = np.abs(np.diff(lum, axis=1)).mean()
    gy = np.abs(np.diff(lum, axis=0)).mean()
    q = (np.asarray(im.convert("RGB").resize((256, 168))).astype(np.int32) // 16).reshape(-1, 3)
    pal = len(np.unique(q[:, 0] * 256 + q[:, 1] * 16 + q[:, 2]))
    return {'mean_sat': round(float(sat.mean()), 3), 'lum_mean': round(float(lum.mean()), 3), 'lum_std': round(float(lum.std()), 3),
            'edge_density': round(float((gx + gy) * 100), 2), 'palette_4bit': pal}


def summarise(stats):
    out = {}
    for k, lst in stats.items():
        for g in ['2004', 'ours']:
            vals = [x[g] for x in lst if x.get(g)]
            if vals:
                out.setdefault(k, {})[g] = {m: round(float(np.mean([v[m] for v in vals])), 3) for m in vals[0]}
    return out


def run(what):
    {'tutorial': tutorial, 'ui': ui, 'scenery': scenery}[what]()
