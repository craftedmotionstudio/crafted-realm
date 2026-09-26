"""Before/after sheets for the old-school look pass (2026-09-25): for each of the ten fixed camera views, the matching
Bible reference | the previous look (?oldschool=0) | the old-school look, same camera, same build.
Run: python tools/make_holm_look_sheets.py [after_tag] [before_tag]
  (defaults: the newest scratchpad/holm_look_v1/pass* folder, and 'before')
Writes scratchpad/holm_look_v1/sheets/<view>.png and sheets/overview.png."""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / 'scratchpad' / 'holm_look_v1'
REF = ROOT / 'Bible_References'
passes = sorted([p.name for p in BASE.glob('pass*') if p.is_dir()], key=lambda n: int(''.join(c for c in n if c.isdigit()) or 0))
AFTER = sys.argv[1] if len(sys.argv) > 1 else passes[-1]
BEFORE = sys.argv[2] if len(sys.argv) > 2 else 'before'
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
H, PAD, BAR = 420, 12, 40
OUT = BASE / 'sheets'
OUT.mkdir(parents=True, exist_ok=True)

def font(size):
    for name in ('arialbd.ttf', 'arial.ttf', 'DejaVuSans-Bold.ttf'):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()

def panel(path, h=H):
    im = Image.open(path).convert('RGB')
    return im.resize((round(im.width * h / im.height), h), Image.LANCZOS)

def perf(tag):
    try:
        return {v['view']: v for v in json.loads((BASE / tag / 'perf.json').read_text())['views']}
    except (OSError, ValueError, KeyError):
        return {}

pb, pa = perf(BEFORE), perf(AFTER)
rows = []
for view, ref, title in PAIRS:
    a, b, c = panel(REF / ref), panel(BASE / BEFORE / (view + '.png')), panel(BASE / AFTER / (view + '.png'))
    w = a.width + b.width + c.width + PAD * 4
    sheet = Image.new('RGB', (w, H + BAR * 2 + PAD), (22, 20, 18))
    d = ImageDraw.Draw(sheet)
    d.text((PAD, 8), f'{title}  -  reference | previous look | old-school look (same camera)', fill=(240, 226, 186), font=font(22))
    x = PAD
    labels = [f'Bible reference: {ref}', f'before ({BEFORE}): {pb.get(view, {}).get("calls", "?")} draw calls',
              f'after ({AFTER}): {pa.get(view, {}).get("calls", "?")} draw calls, {pa.get(view, {}).get("fps", "?")} fps']
    for im, lab in zip((a, b, c), labels):
        sheet.paste(im, (x, BAR))
        d.text((x + 4, BAR + H + 6), lab, fill=(200, 190, 160), font=font(16))
        x += im.width + PAD
    sheet.save(OUT / (view + '.png'))
    rows.append(sheet)
# overview: every row at half size
ow = max(r.width for r in rows) // 2
ov = Image.new('RGB', (ow, sum(r.height // 2 for r in rows)), (22, 20, 18))
y = 0
for r in rows:
    s = r.resize((r.width // 2, r.height // 2), Image.LANCZOS)
    ov.paste(s, (0, y)); y += s.height
ov.save(OUT / 'overview.png')
print('sheets ->', OUT, 'after =', AFTER, 'before =', BEFORE)
