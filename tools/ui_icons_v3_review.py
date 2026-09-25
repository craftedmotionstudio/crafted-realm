"""ui_icons_v3_review.py -- per-group review sheets of assets/icons/ui/v3 (each icon at 1x and 3x, labelled).
Run: python tools/ui_icons_v3_review.py [outdir]   (default scratchpad/holm_ui_v3/icons)"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[1]
V3 = ROOT / 'assets/icons/ui/v3'
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'scratchpad/holm_ui_v3/icons'
OUT.mkdir(parents=True, exist_ok=True)
files = json.loads((V3 / 'manifest.json').read_text())['files']
groups = {}
for d in files: groups.setdefault(d['file'].split('/')[0], []).append(d)
for g, lst in groups.items():
    cw = max(max(d['w'], d['h']) for d in lst) * 4 + 30; ch = max(d['h'] for d in lst) * 3 + 26
    per = max(1, 1400 // cw); rows = (len(lst) + per - 1) // per
    im = Image.new('RGBA', (per * cw + 8, rows * ch + 8), (62, 53, 41, 255)); dr = ImageDraw.Draw(im)
    for k, d in enumerate(lst):
        x, y = 4 + (k % per) * cw, 4 + (k // per) * ch
        dr.rectangle([x, y, x + cw - 6, y + ch - 6], fill=(84, 76, 62, 255))
        ic = Image.open(V3 / d['file']).convert('RGBA')
        im.alpha_composite(ic, (x + 4, y + 4))
        im.alpha_composite(ic.resize((ic.width * 3, ic.height * 3), Image.NEAREST), (x + ic.width + 10, y + 4))
        dr.text((x + 4, y + ch - 18), Path(d['file']).stem, fill=(255, 152, 31, 255))
    im.save(OUT / (g + '.png')); print(g, im.size)
