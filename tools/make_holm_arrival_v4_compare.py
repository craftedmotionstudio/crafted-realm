"""Side-by-side sheets for the M3R review (2026-09-24): Bible references beside the Sept 13 base with the
review-6 changes, from the Terrain Studio and the real game (arrival draft v4). Banked in
Bible_References/Complete/_compare/ as the visual gate requires.
Run: python tools/make_holm_arrival_v4_compare.py [studio_capture_dir]"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / 'Bible_References'
GAME = ROOT / 'scratchpad/holm_arrival_v4'
STUDIO = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'scratchpad/holm_arrival_v4/studio'
OUT = REF / 'Complete/_compare'
OUT.mkdir(parents=True, exist_ok=True)
try:
    FONT = ImageFont.truetype('arialbd.ttf', 26)
except OSError:
    FONT = ImageFont.load_default()
H = 620


def fit(path):
    im = Image.open(path).convert('RGB')
    return im.resize((round(im.width * H / im.height), H))


def sheet(name, pairs):
    tiles = [(label, fit(p)) for label, p in pairs]
    w = sum(t.width for _, t in tiles) + 20 * (len(tiles) + 1)
    canvas = Image.new('RGB', (w, H + 80), (24, 22, 20))
    d = ImageDraw.Draw(canvas)
    x = 20
    for label, t in tiles:
        canvas.paste(t, (x, 60))
        d.text((x, 16), label, fill=(233, 214, 160) if label.startswith('Reference') else (160, 220, 150), font=FONT)
        x += t.width + 20
    canvas.save(OUT / name)
    print('wrote', OUT / name)


sheet('holm-arrival-v4-island.png', [('Reference: Tutorial island', REF / 'A_Tutorial_Island_Option.jpg'),
                                      ('Crafted Realm: Sept 13 base + review-6 pass (Studio)', STUDIO / 'arrival.png')])
sheet('holm-arrival-v4-house.png', [('Reference: tutorial building', REF / 'Tutorial_Island_Building.jpg'),
                                     ('Guide house v2 (Studio)', STUDIO / 'house_scale.png'),
                                     ('In game: v4 arrival draft', GAME / '02_path_statue.png')])
sheet('holm-arrival-v4-interior.png', [('Reference: building interior', REF / 'Complete/Building_Interior_Option1.jpg'),
                                        ('In game: hall (roof cut away)', GAME / '04_inside.png'),
                                        ('In game: upper floor', GAME / '05_upper.png')])
sheet('holm-arrival-v4-landscape.png', [('Reference: landscape', REF / 'Landscape_Option.jpg'),
                                         ('In game: landing and path', GAME / '01_landing.png')])
