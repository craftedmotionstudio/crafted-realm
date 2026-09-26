"""Contact sheet of the old-school texture kit: each texture at 4x (nearest, so texels read) and tiled 2x2 at 2x
(to check seams). Run: python tools/sheet_oldschool_kit.py  -> scratchpad/holm_look_v1/sheets/kit_sheet.png"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
KIT = json.loads((ROOT / 'assets/textures/oldschool/kit.json').read_text())
OUT = ROOT / 'scratchpad/holm_look_v1/sheets'
OUT.mkdir(parents=True, exist_ok=True)
CELL, PAD, COLS = 256, 14, 4
names = list(KIT['textures'])
rows = (len(names) + COLS - 1) // COLS
sheet = Image.new('RGB', (COLS * (CELL * 2 + PAD * 2), rows * (CELL + 40 + PAD)), (20, 18, 16))
d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype('arialbd.ttf', 18)
except OSError:
    font = ImageFont.load_default()
for i, n in enumerate(names):
    t = KIT['textures'][n]
    im = Image.open(ROOT / t['file']).convert('RGB')
    big = im.resize((CELL, CELL), Image.NEAREST)
    tile = Image.new('RGB', (im.width * 2, im.height * 2))
    for oy in (0, im.height):
        for ox in (0, im.width):
            tile.paste(im, (ox, oy))
    tile = tile.resize((CELL, CELL), Image.NEAREST)
    x, y = (i % COLS) * (CELL * 2 + PAD * 2) + PAD, (i // COLS) * (CELL + 40 + PAD) + 34
    sheet.paste(big, (x, y)); sheet.paste(tile, (x + CELL + 4, y))
    d.text((x, y - 26), f"{n}  {t['size']}px  - {t['use']}", fill=(235, 220, 180), font=font)
sheet.save(OUT / 'kit_sheet.png')
print('kit sheet ->', OUT / 'kit_sheet.png')
