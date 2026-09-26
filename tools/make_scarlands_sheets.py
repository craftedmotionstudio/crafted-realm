"""Scarlands kit proof sheets (W2/W3, 2026-09-26): each game-camera view as reference | day look | old-school black
void, the improvement passes side by side, and the kit catalog.
Run: python tools/make_scarlands_sheets.py [final_tag]   -> scratchpad/scarlands_v1/sheets/"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / 'scratchpad' / 'scarlands_v1'
FINAL = sys.argv[1] if len(sys.argv) > 1 else 'pass3'
OUT = BASE / 'sheets'
OUT.mkdir(parents=True, exist_ok=True)
REF = ROOT / 'Bible_References'
VIEWS = [('s01_plank_crossing', 'The Ditch: plank crossing, warning sign, lip wall', 'SkeletonBones.jpg'),
         ('s02_stone_causeway', 'The Ditch: stone causeway (filled trench)', 'Landscape_Option.jpg'),
         ('s03_game_camera_crossing', 'Default game camera over the crossing', 'SkeletonBones.jpg'),
         ('s04_wall_line', 'The long ruined wall (row 70) and its gap', 'Complete/Ruins.jpg'),
         ('s05_ruined_room', 'The ruined room, portico and arch', 'Complete/Ruins.jpg'),
         ('s06_rock_camp', 'Burnt camp: tent, crates, cart, fire', 'Complete/Ruins.jpg'),
         ('s07_ditch_panorama', 'The Ditch across the map', 'Landscape_Option.jpg'),
         ('s08_pocket_panorama', 'The Scarlands pocket', 'Complete/Ruins.jpg'),
         ('s09_depth_road', 'The east road north with its depth stones', 'Landscape_Option.jpg')]
H, PAD, BAR = 360, 10, 34

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

perf = {}
try:
    perf = {(v['view'], v['mode']): v for v in json.loads((BASE / FINAL / 'perf.json').read_text())['views']}
except (OSError, ValueError, KeyError):
    pass
rows = []
for view, title, ref in VIEWS:
    ims = [panel(REF / ref), panel(BASE / FINAL / (view + '_day.png')), panel(BASE / FINAL / (view + '_void.png'))]
    w = sum(i.width for i in ims) + PAD * 4
    sheet = Image.new('RGB', (w, H + BAR * 2), (22, 20, 18))
    d = ImageDraw.Draw(sheet)
    d.text((PAD, 7), f'{title}  -  reference | day look | old-school black void (game camera)', fill=(240, 226, 186), font=font(19))
    labels = ['reference: ' + ref.split('/')[-1], 'day: %s draw calls' % perf.get((view, 'day'), {}).get('calls', '?'),
              'void: %s draw calls, %s triangles' % (perf.get((view, 'void'), {}).get('calls', '?'), perf.get((view, 'void'), {}).get('triangles', '?'))]
    x = PAD
    for im, lab in zip(ims, labels):
        sheet.paste(im, (x, BAR)); d.text((x + 4, BAR + H + 6), lab, fill=(200, 190, 160), font=font(14)); x += im.width + PAD
    sheet.save(OUT / (view + '.png')); rows.append(sheet)
ow = max(r.width for r in rows) // 2
ov = Image.new('RGB', (ow, sum(r.height // 2 for r in rows)), (22, 20, 18)); y = 0
for r in rows:
    s = r.resize((r.width // 2, r.height // 2), Image.LANCZOS); ov.paste(s, (0, y)); y += s.height
ov.save(OUT / 'overview.png')
# the improvement passes, same camera
passes = [t for t in ('pass0', 'pass1', 'pass2', 'pass3') if (BASE / t).exists()]
passes = list(dict.fromkeys(passes))
for view in ('s03_game_camera_crossing', 's05_ruined_room', 's08_pocket_panorama'):
    ims = [panel(BASE / t / (view + '_void.png'), 300) for t in passes]
    sheet = Image.new('RGB', (sum(i.width for i in ims) + PAD * (len(ims) + 1), 300 + BAR * 2), (22, 20, 18))
    d = ImageDraw.Draw(sheet); d.text((PAD, 7), 'Improvement passes: ' + ' -> '.join(passes), fill=(240, 226, 186), font=font(19))
    x = PAD
    for im, t in zip(ims, passes):
        sheet.paste(im, (x, BAR)); d.text((x + 4, BAR + 306), t, fill=(200, 190, 160), font=font(14)); x += im.width + PAD
    sheet.save(OUT / ('passes_' + view + '.png'))
Image.open(BASE / FINAL / 'catalog.png').save(OUT / 'catalog.png')
print('sheets ->', OUT)
