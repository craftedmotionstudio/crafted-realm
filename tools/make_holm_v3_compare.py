"""Side-by-side sheets: a Bible reference on the left, the v3 preview capture on the right.
Run: python tools/make_holm_v3_compare.py   (writes scratchpad/holm_v3_review/compare_*.png)"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
REF, OURS = ROOT / 'Bible_References', ROOT / 'scratchpad' / 'holm_v3_review'
PAIRS = [
    ('island', 'A_Tutorial_Island_Option.jpg', '01_arrival_cove.png', 'Tutorial island overview'),
    ('building', 'Tutorial_Island_Building.jpg', '04_hall_interior.png', 'Tutorial building interior'),
    ('house', 'Elevation_Change_Ground_Tiles.jpg', '02_guide_house_front.png', 'Thatched house on the hill'),
]
H = 620          # each panel is scaled to this height
PAD, BAR = 16, 44

def font(size):
    for name in ('arialbd.ttf', 'arial.ttf', 'DejaVuSans-Bold.ttf'):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()

def panel(path):
    im = Image.open(path).convert('RGB')
    return im.resize((round(im.width * H / im.height), H), Image.LANCZOS)

for key, ref, ours, title in PAIRS:
    a, b = panel(REF / ref), panel(OURS / ours)
    sheet = Image.new('RGB', (a.width + b.width + PAD * 3, H + BAR + PAD * 2), (24, 22, 20))
    sheet.paste(a, (PAD, BAR + PAD))
    sheet.paste(b, (a.width + PAD * 2, BAR + PAD))
    d = ImageDraw.Draw(sheet)
    f = font(22)
    d.text((PAD, 12), 'Reference: ' + title, fill=(240, 220, 160), font=f)
    d.text((a.width + PAD * 2, 12), 'Crafted Realm v3 preview (review 4)', fill=(160, 220, 150), font=f)
    out = OURS / f'compare_{key}.png'
    sheet.save(out)
    print('wrote', out.relative_to(ROOT))
