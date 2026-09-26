"""Before/after sheet for the Lantern Keeper statue v4 in the old-school look (2026-09-26), in game at the game camera
(pitch 1.08; zoomed fully in and at the default distance): previous look (?oldschool=0, statue v3) | live old-school
build before this change (statue v3, untextured) | statue v4 textured (arrival package oldschool-v3).
Run: python tools/make_holm_statue_sheet.py   -> scratchpad/holm_look_v1/sheets/statue_v4_before_after.png"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / 'scratchpad' / 'holm_look_v1'
VIEWS = [('c26_statue_path_zoomed', 'from the arrival path, zoomed in (dist 12)'),
         ('c27_statue_west_zoomed', 'from the west lawn, zoomed in (dist 12)'),
         ('c28_statue_game_default', 'default game camera (dist 33)')]
COLS = [('statue_prev', 'previous look (?oldschool=0): statue v3'), ('statue_before', 'old-school, live build: statue v3 untextured'),
        ('statue_after', 'old-school: statue v4, pale stone texture')]
W, H, PAD, BAR = 640, 375, 10, 30

def font(size):
    for name in ('arialbd.ttf', 'arial.ttf', 'DejaVuSans-Bold.ttf'):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()

sheet = Image.new('RGB', (PAD + len(COLS) * (W + PAD), 44 + len(VIEWS) * (H + BAR + PAD)), (22, 20, 18))
d = ImageDraw.Draw(sheet)
d.text((PAD, 10), 'Lantern Keeper statue v4 - old-school texture, in game at the game camera (pitch 1.08)', fill=(240, 226, 186), font=font(22))
for r, (view, label) in enumerate(VIEWS):
    y = 44 + r * (H + BAR + PAD)
    for c, (tag, title) in enumerate(COLS):
        x = PAD + c * (W + PAD)
        im = Image.open(BASE / tag / (view + '.png')).convert('RGB')
        # crop the centre of the 1538x900 frame so the statue fills the panel
        k = 0.62 if 'default' in view else 0.46
        cw, ch = im.width * k, im.height * k
        top = max(0, round(im.height / 2 - ch * (0.78 if k < 0.6 else 0.5)))   # the statue rises above the ground focus: keep its head and lantern
        box = (round((im.width - cw) / 2), top, round((im.width + cw) / 2), top + round(ch))
        sheet.paste(im.crop(box).resize((W, H), Image.LANCZOS), (x, y))
        d.text((x + 4, y + H + 6), (title if r == 0 else '') + ('  |  ' if r == 0 else '') + label, fill=(200, 190, 160), font=font(14))
out = BASE / 'sheets' / 'statue_v4_before_after.png'
out.parent.mkdir(parents=True, exist_ok=True)
sheet.save(out)
print('statue sheet ->', out)
