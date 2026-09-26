"""Holm v2 land before/after sheets (W0b, 2026-09-26): pairs the same game-camera views from two capture folders under
scratchpad/holm_v2_land/ (tools/capture_holm_v2_land.js) side by side, three views per sheet, with labels.
Run: python tools/make_holm_v2_land_sheets.py <before-tag> <after-tag> <sheet-prefix> [view-substring ...]"""
import sys, os, glob
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'scratchpad', 'holm_v2_land')
before, after, prefix = sys.argv[1], sys.argv[2], sys.argv[3]
only = sys.argv[4:]
views = sorted(os.path.basename(p) for p in glob.glob(os.path.join(ROOT, after, 'v*.png')))
views = [v for v in views if os.path.exists(os.path.join(ROOT, before, v)) and (not only or any(o in v for o in only))]
out = os.path.join(ROOT, 'sheets'); os.makedirs(out, exist_ok=True)
try:
    font = ImageFont.truetype('arial.ttf', 22); small = ImageFont.truetype('arial.ttf', 16)
except Exception:
    font = small = ImageFont.load_default()
W, H = 760, 451  # each capture scaled from 1280x760
for i in range(0, len(views), 3):
    group = views[i:i + 3]
    sheet = Image.new('RGB', (W * 2 + 30, 40 + len(group) * (H + 34)), (24, 22, 20))
    d = ImageDraw.Draw(sheet)
    d.text((10, 8), 'Tutor\'s Holm v2 land - ' + prefix + ': before (' + before + ') | after (' + after + ')', fill=(235, 225, 200), font=font)
    for r, v in enumerate(group):
        y = 40 + r * (H + 34)
        for c, tag in enumerate((before, after)):
            im = Image.open(os.path.join(ROOT, tag, v)).convert('RGB').resize((W, H), Image.LANCZOS)
            sheet.paste(im, (10 + c * (W + 10), y + 24))
        d.text((10, y + 2), v[:-4] + '   (before)', fill=(210, 200, 170), font=small)
        d.text((20 + W, y + 2), v[:-4] + '   (after)', fill=(210, 200, 170), font=small)
    name = os.path.join(out, '%s_%02d.jpg' % (prefix, i // 3 + 1))
    sheet.save(name, quality=88)
    print('wrote', name)
