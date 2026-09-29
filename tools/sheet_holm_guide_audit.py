"""Contact sheet for the Tutor's Holm guidance audit (goal items "exact arrows" and "clear direction, objective and
process at every moment", 2026-09-29).

Reads scratchpad/holm_full_route/guide_probes.json and the probe_NNN.png captures written by tools/qa_holm_full_route.js
(before every route action: the objective line, the guide arrow's resolved target and label, the object about to be
used) and lays them out as pages of thumbnails. On each capture a yellow ring marks where the arrow's tip falls and a
green cross the object the adventurer then used; the caption gives the lesson, the objective line, the arrow's label,
the verdict (exact / exact-family / tutor-first / door-first / drift-ladder-first / pack / use-on / mismatch) and the gap in tiles.
Run: python tools/sheet_holm_guide_audit.py  -> scratchpad/holm_full_route/guide_contact_sheet_pN.png
"""
import json
import os
import textwrap

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, 'scratchpad', 'holm_full_route')
COLS, ROWS = 4, 4
TW, TH = 480, 281          # thumbnail (1538x900 captures scaled 0.312)
CAP = 118                  # caption height
PAD = 10
GOOD = {'exact', 'exact-family', 'tutor-first', 'lesson-already-done', 'door-first', 'drift-ladder-first', 'pack', 'use-on', 'use-item-on-arrow-target'}


def font(size):
    for name in ('arial.ttf', 'DejaVuSans.ttf', 'segoeui.ttf'):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main():
    probes = json.load(open(os.path.join(DIR, 'guide_probes.json'), encoding='utf-8'))
    shots = [p for p in probes if p.get('shot') and os.path.exists(os.path.join(DIR, p['shot'] + '.png'))]
    f_head, f_txt, f_small = font(15), font(13), font(12)
    per = COLS * ROWS
    pages = (len(shots) + per - 1) // per
    counts = {}
    for p in probes:
        counts[p.get('verdict', '?')] = counts.get(p.get('verdict', '?'), 0) + 1
    for page in range(pages):
        chunk = shots[page * per:(page + 1) * per]
        W = COLS * (TW + PAD) + PAD
        H = 54 + ROWS * (TH + CAP + PAD) + PAD
        sheet = Image.new('RGB', (W, H), (24, 22, 20))
        d = ImageDraw.Draw(sheet)
        d.text((PAD, 10), "Tutor's Holm guidance audit - objective line and guide arrow before every route action "
               "(page %d/%d; %d probes: %s)" % (page + 1, pages, len(probes),
                                                ', '.join('%s %d' % kv for kv in sorted(counts.items()))),
               fill=(235, 225, 200), font=f_head)
        d.text((PAD, 31), 'yellow ring = where the arrow tip falls; green cross = the object then used; '
               'tools/qa_holm_full_route.js, real input, fresh adventurer on the live island',
               fill=(170, 160, 140), font=f_small)
        for i, p in enumerate(chunk):
            cx, cy = PAD + (i % COLS) * (TW + PAD), 54 + (i // COLS) * (TH + CAP + PAD)
            im = Image.open(os.path.join(DIR, p['shot'] + '.png')).convert('RGB')
            sx, sy = TW / im.width, TH / im.height
            im = im.resize((TW, TH), Image.LANCZOS)
            di = ImageDraw.Draw(im)
            scr = p.get('screen') or {}
            if scr.get('arrow'):
                ax, ay = scr['arrow'][0] * sx, scr['arrow'][1] * sy
                di.ellipse([ax - 13, ay - 13, ax + 13, ay + 13], outline=(255, 214, 0), width=3)
            if scr.get('target'):
                tx, ty = scr['target'][0] * sx, scr['target'][1] * sy
                di.line([tx - 9, ty, tx + 9, ty], fill=(40, 230, 90), width=3)
                di.line([tx, ty - 9, tx, ty + 9], fill=(40, 230, 90), width=3)
            sheet.paste(im, (cx, cy))
            ok = p.get('verdict') in GOOD
            d.rectangle([cx, cy + TH, cx + TW, cy + TH + CAP], fill=(40, 36, 32))
            d.rectangle([cx, cy, cx + TW - 1, cy + TH + CAP - 1], outline=(70, 170, 90) if ok else (220, 60, 50), width=2)
            head = '%s  %s  [%s%s]' % (p['shot'].replace('probe_', '#'), p.get('lesson', ''), p.get('verdict', '?'),
                                       '' if p.get('dist') is None else ', gap %.2f' % p['dist'])
            d.text((cx + 6, cy + TH + 4), head, fill=(140, 230, 150) if ok else (255, 120, 110), font=f_txt)
            d.text((cx + 6, cy + TH + 22), 'action: %s %s' % (p.get('kind', ''), p.get('what', ''))[:74], fill=(215, 205, 185), font=f_small)
            d.text((cx + 6, cy + TH + 38), 'arrow: %s' % (p.get('label') or ('pack pulse: %s' % p.get('pulse') if p.get('pulse') else '(none)'))[:70],
                   fill=(255, 214, 90), font=f_small)
            obj = textwrap.wrap('objective: ' + (p.get('objective') or '(none)'), 76)[:4]
            for k, line in enumerate(obj):
                d.text((cx + 6, cy + TH + 54 + k * 15), line, fill=(200, 195, 180), font=f_small)
        out = os.path.join(DIR, 'guide_contact_sheet_p%d.png' % (page + 1))
        sheet.save(out, optimize=True)
        print('[GUIDE SHEET]', out, len(chunk), 'captures')


if __name__ == '__main__':
    main()
