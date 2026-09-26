"""Close-up sheets for the old-school rollout (2026-09-26): one sheet per rolled-out asset, same camera three ways:
the previous look (?oldschool=0) | the old-school look before the rollout (terrain/water/void + Guide House + survival
camp only) | the old-school look with every island model textured.
Run: python tools/make_holm_look_closeup_sheets.py [prev_tag] [before_tag] [after_tag]
  (defaults: closeup_prev closeup_before closeup_after under scratchpad/holm_look_v1/)
Writes scratchpad/holm_look_v1/sheets/closeups/<view>.png and sheets/closeups_overview.png."""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / 'scratchpad' / 'holm_look_v1'
PREV, BEFORE, AFTER = (sys.argv[1:4] + ['closeup_prev', 'closeup_before', 'closeup_after'][len(sys.argv[1:4]):])
OUT = BASE / 'sheets' / 'closeups'
OUT.mkdir(parents=True, exist_ok=True)
TITLES = {
    'c01_keep': "Warden's Keep", 'c02_bakehouse': 'Bakehouse (kitchen wings)', 'c03_quest_lodge': 'Quest Lodge',
    'c04_bank': 'Bank', 'c05_mage_tower': 'Mage house + tower', 'c06_lastlight': 'Lastlight',
    'c07_lastlight_interior': 'Lastlight interior (roof lifted)', 'c08_quarry_gatehouse': 'Quarry gatehouse',
    'c09_cavern': 'Training cavern (roof lifted)', 'c10_haven': 'Departure haven', 'c11_timber_bridge': 'Timber bridge',
    'c12_stone_bridge': 'Stone bridge', 'c13_dock_boat': 'Arrival dock + moored boat', 'c14_oaks_tufts': 'Oaks + meadow tufts',
    'c15_birch': 'Birch', 'c16_coastal_pine': 'Coastal pine', 'c17_creek_reeds': 'Creek reeds',
    'c18_habitat_props': 'Habitat props (shrubs, rocks, logs)', 'c19_signpost': 'Signpost (props pack)',
    'c20_provisions': 'Provision rack + Guide House floor', 'c21_landing_props': 'Landing: waypost, cargo, fieldstones, dock',
    'c22_garden_hazel': 'Garden: hazels, wall, bench', 'c23_lesson_trees_fire': 'Lesson oaks + campfire (props v5)',
    'c24_cavern_ores': 'Cavern ore rocks (props v5)', 'c25_bakehouse_gate': 'Bakehouse gate (props v3)'}
H, PAD, BAR = 380, 10, 36

def font(size):
    for name in ('arialbd.ttf', 'arial.ttf', 'DejaVuSans-Bold.ttf'):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()

def perf(tag):
    try:
        return {v['view']: v for v in json.loads((BASE / tag / 'perf.json').read_text())['views']}
    except (OSError, ValueError, KeyError):
        return {}

pp, pb, pa = perf(PREV), perf(BEFORE), perf(AFTER)
rows = []
for view, title in TITLES.items():
    ims = [Image.open(BASE / t / (view + '.png')).convert('RGB') for t in (PREV, BEFORE, AFTER)]
    ims = [im.resize((round(im.width * H / im.height), H), Image.LANCZOS) for im in ims]
    w = sum(im.width for im in ims) + PAD * 4
    sheet = Image.new('RGB', (w, H + BAR * 2), (22, 20, 18))
    d = ImageDraw.Draw(sheet)
    d.text((PAD, 7), f'{title}  -  previous look | old-school before rollout | rolled out (same camera)', fill=(240, 226, 186), font=font(20))
    labels = [f'previous: {pp.get(view, {}).get("calls", "?")} draw calls', f'before rollout: {pb.get(view, {}).get("calls", "?")} draw calls',
              f'rolled out: {pa.get(view, {}).get("calls", "?")} draw calls']
    x = PAD
    for im, lab in zip(ims, labels):
        sheet.paste(im, (x, BAR))
        d.text((x + 4, BAR + H + 6), lab, fill=(200, 190, 160), font=font(15))
        x += im.width + PAD
    sheet.save(OUT / (view + '.png'))
    rows.append(sheet)
ow = max(r.width for r in rows) // 3
ov = Image.new('RGB', (ow, sum(r.height // 3 for r in rows)), (22, 20, 18))
y = 0
for r in rows:
    s = r.resize((r.width // 3, r.height // 3), Image.LANCZOS)
    ov.paste(s, (0, y)); y += s.height
ov.save(BASE / 'sheets' / 'closeups_overview.png')
print('close-up sheets ->', OUT)
