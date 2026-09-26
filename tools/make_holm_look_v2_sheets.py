"""Look pass 2 sheets (2026-09-26): for each of the ten standard views (tools/capture_holm_look.js), side by side
  Bible reference | current live look (?lookv=1) | look v2 | look v2 + classic pixels | the approved login (mood)
and under them the per-view numbers from tools/measure_look_vs_refs.py: for every surface class in the view, the
reference band and the three looks' values for L, S, H, sd, fine, coarse (red = outside the band).
Also sheets/overview.png (every view at half size) and sheets/summary.png + summary.json (class averages over the
ten views and how many values fall outside the band per look, pass by pass).
Run: python tools/make_holm_look_v2_sheets.py [live_tag v2_tag classic_tag]
  (defaults: live_final v2_final v2_final_classic under scratchpad/holm_look_v2/; the login mood panel is
   scratchpad/holm_look_v2/login_mood.png, a copy of the owner-approved login capture)"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
import measure_look_vs_refs as M  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / 'scratchpad' / 'holm_look_v2'
REF = ROOT / 'Bible_References'
TAGS = sys.argv[1:4] if len(sys.argv) >= 4 else ['live_final', 'v2_final', 'v2_final_classic']
LABELS = ['current live look', 'look v2', 'look v2 + classic pixels']
PAIRS = [
    ('01_arrival_landing', 'Landscape_Option.jpg', 'Arrival landing'),
    ('02_guide_house_exterior', 'Elevation_Change_Ground_Tiles.jpg', 'Guide House exterior'),
    ('03_guide_house_interior', 'Tutorial_Island_Building.jpg', 'Guide House interior'),
    ('04_survival_camp', 'Tutorial_Island_Fishing_Spot.jpg', 'Survival camp'),
    ('05_timber_bridge', 'Landscape_Option.jpg', 'Timber bridge'),
    ('06_fishing_spot', 'Tutorial_Island_Fishing_Spot.jpg', 'Fishing spot'),
    ('07_bakehouse_court', 'Town_Square.jpg', 'Bakehouse court'),
    ('08_keep_court', 'Town_Square.jpg', 'Keep court'),
    ('09_lighthouse_approach', 'Lighthouse_entrance.jpg', 'Lighthouse approach'),
    ('10_hill_panorama', 'Elevation_Change_Ground_Tiles.jpg', 'Hill panorama'),
]
H, PAD, BAR = 360, 12, 36
OUT = BASE / 'sheets'
OUT.mkdir(parents=True, exist_ok=True)
BG, INK, DIM, BAD, HEAD = (22, 20, 18), (240, 226, 186), (190, 180, 150), (255, 110, 90), (150, 200, 140)


def font(size, bold=False):
    for name in (('arialbd.ttf',) if bold else ()) + ('arial.ttf', 'DejaVuSans.ttf'):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def panel(path, h=H):
    im = Image.open(path).convert('RGB')
    return im.resize((round(im.width * h / im.height), h), Image.LANCZOS if im.height > h else Image.NEAREST)


def load(tag):
    p = BASE / tag / 'measure.json'
    if not p.exists():
        M.measure_dir(BASE / tag)
    return json.loads(p.read_text())['views']


def perf(tag):
    try:
        d = json.loads((BASE / tag / 'perf.json').read_text())
        return {v['view']: v for v in d['views']}, d.get('look', {})
    except (OSError, ValueError, KeyError):
        return {}, {}


def table(draw, x, y, view, meas, bands, f, fb):
    """numbers under a view: one row per class, per metric the band and the three looks"""
    classes = [c for c in M.CLASSES if any(c in m.get(view, {}) for m in meas)]
    cw_cls, cwb, cw, gap = 74, 112, 58, 22
    draw.text((x, y), 'class', fill=HEAD, font=fb)
    cx = x + cw_cls
    for k in M.METRICS:
        draw.text((cx, y), f'{k}: band', fill=HEAD, font=fb)
        for i, lab in enumerate(('live', 'v2', 'v2+cp')):
            draw.text((cx + cwb + cw * i, y), lab, fill=HEAD, font=fb)
        cx += cwb + cw * 3 + gap
    y += 22
    for cls in classes:
        draw.text((x, y), cls, fill=INK, font=f)
        cx = x + cw_cls
        b = bands.get(cls, {})
        for k in M.METRICS:
            bb = b.get(k)
            draw.text((cx, y), (M.fmt(k, bb[0]).strip() + '-' + M.fmt(k, bb[1]).strip()) if bb else '-', fill=DIM, font=f)
            for i, m in enumerate(meas):
                r = m.get(view, {}).get(cls)
                if r is None:
                    continue
                v = r[k]
                grey = k == 'H' and r['S'] < M.GREY
                bad = not grey and not M.in_band(v, bb)
                draw.text((cx + cwb + cw * i, y), M.fmt(k, v).strip(), fill=BAD if bad else INK, font=f)
            cx += cwb + cw * 3 + gap
        y += 20
    return y


def count_out(meas):
    bands = M.get_bands()
    n = 0
    for view in meas.values():
        for cls, r in view.items():
            b = bands.get(cls, {})
            for k in M.METRICS:
                if k == 'H' and r['S'] < M.GREY:
                    continue
                n += not M.in_band(r[k], b.get(k))
    return n


def main():
    bands = M.get_bands()
    meas = [load(t) for t in TAGS]
    perfs = [perf(t) for t in TAGS]
    login = BASE / 'login_mood.png'
    f, fb, ft = font(14), font(14, True), font(22, True)
    rows = []
    for view, ref, title in PAIRS:
        ims = [panel(REF / ref)] + [panel(BASE / t / (view + '.png')) for t in TAGS] + ([panel(login)] if login.exists() else [])
        w = sum(i.width for i in ims) + PAD * (len(ims) + 1)
        th = 26 + 20 * max(1, len([c for c in M.CLASSES if any(c in m.get(view, {}) for m in meas)])) + 16
        sheet = Image.new('RGB', (max(w, 1900), BAR + H + 30 + th), BG)
        d = ImageDraw.Draw(sheet)
        d.text((PAD, 7), f'{title}  -  reference | {" | ".join(LABELS)}' + (' | approved login (mood)' if login.exists() else '') + '   (same camera, same build)', fill=INK, font=ft)
        x = PAD
        labs = [f'Bible reference: {ref}']
        for i, t in enumerate(TAGS):
            pv = perfs[i][0].get(view, {})
            labs.append(f'{LABELS[i]} ({t}): {pv.get("calls", "?")} calls, {pv.get("fps", "?")} fps')
        labs.append('login v4 (owner: "exactly what I\'m going for")')
        for im, lab in zip(ims, labs):
            sheet.paste(im, (x, BAR))
            d.text((x + 4, BAR + H + 6), lab, fill=DIM, font=f)
            x += im.width + PAD
        table(d, PAD, BAR + H + 30, view, meas, bands, f, fb)
        sheet.save(OUT / (view + '.png'))
        rows.append(sheet)
    ow = max(r.width for r in rows) // 2
    ov = Image.new('RGB', (ow, sum(r.height // 2 for r in rows)), BG)
    y = 0
    for r in rows:
        s = r.resize((r.width // 2, r.height // 2), Image.LANCZOS)
        ov.paste(s, (0, y))
        y += s.height
    ov.save(OUT / 'overview.png')
    # summary: class averages and out-of-band counts, every pass in the folder
    passes = ['live_final'] + sorted([p.name for p in BASE.glob('v2_pass*') if (p / 'measure.json').exists()],
                                     key=lambda n: (int(''.join(c for c in n if c.isdigit()) or 0), n)) + ['v2_final', 'v2_final_classic']
    passes = [p for i, p in enumerate(passes) if p not in passes[:i] and (BASE / p / 'measure.json').exists()]
    summ = {p: {'classAverages': M.summary(load(p)), 'perViewOutside': count_out(load(p))} for p in passes}
    for p in passes:
        ca = summ[p]['classAverages']
        summ[p]['classAveragesOutside'] = sum(1 for cls, v in ca.items() for k in M.METRICS
                                              if not (k == 'H' and v['S'] < M.GREY) and not M.in_band(v[k], bands.get(cls, {}).get(k)))
    (OUT / 'summary.json').write_text(json.dumps({'bands': bands, 'passes': summ}, indent=1))
    lines = ['Look pass 2 - values outside the Bible-reference band (10 standard views)', '',
             f'{"capture":22s} {"class averages":>16s} {"per-view values":>16s}']
    for p in passes:
        lines.append(f'{p:22s} {summ[p]["classAveragesOutside"]:>16d} {summ[p]["perViewOutside"]:>16d}')
    lines += ['', 'class averages (live -> v2 -> v2 + classic), band in brackets:']
    for cls in M.CLASSES:
        b = bands.get(cls)
        if not b:
            continue
        parts = []
        for k in M.METRICS:
            vals = [summ[p]['classAverages'].get(cls, {}).get(k) for p in ('live_final', 'v2_final', 'v2_final_classic') if p in summ]
            parts.append(f'{k} ' + ' > '.join(M.fmt(k, v).strip() if v is not None else '-' for v in vals) + f' [{M.fmt(k, b[k][0]).strip()}..{M.fmt(k, b[k][1]).strip()}]')
        lines.append(f'  {cls:8s} ' + '  '.join(parts))
    img = Image.new('RGB', (2300, 30 + 22 * len(lines)), BG)
    d = ImageDraw.Draw(img)
    for i, line in enumerate(lines):
        d.text((14, 12 + 22 * i), line, fill=INK if i else HEAD, font=font(15, i == 0))
    img.save(OUT / 'summary.png')
    print('\n'.join(lines))
    print('sheets ->', OUT)


if __name__ == '__main__':
    main()
