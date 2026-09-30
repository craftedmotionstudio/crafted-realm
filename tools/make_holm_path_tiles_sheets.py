"""Path tiles pass (2026-09-29) before/after sheets: the captures of tools/capture_holm_path_tiles.js (scratchpad/
holm_path_tiles/before/ and after/) side by side at the game camera, a caption per row. Our renders only.
Also the tile maps side by side, zoomed on four areas (rendered by tools/map_holm_path_tiles.py from the audits
scratchpad/holm_path_tiles/audit_before.json and audit_after.json): maps_before_after_zoomed.jpg.
Run: python tools/make_holm_path_tiles_sheets.py [before-tag] [after-tag]"""
import json, subprocess, sys, tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
D = ROOT / 'scratchpad' / 'holm_path_tiles'
A, B = (sys.argv[1] if len(sys.argv) > 1 else 'before'), (sys.argv[2] if len(sys.argv) > 2 else 'after')
W, H, PAD, CAP = 760, 451, 10, 30

def font(n):
    for f in ('C:/Windows/Fonts/segoeuib.ttf', 'C:/Windows/Fonts/arialbd.ttf'):
        try: return ImageFont.truetype(f, n)
        except Exception: pass
    return ImageFont.load_default()

F, FS = font(20), font(15)
ROWS = [
    ('v01_guide_house_front', 'Guide House front: the dock trail (unchanged: it lies under the arrival ribbon)'),
    ('v02_guide_house_back', 'Guide House back door: one 2-wide lane down the knoll, the east lane off its foot'),
    ('v03_knoll_to_bridge', 'the knoll foot to the timber bridge: one straight 1-wide lane on the causeway row'),
    ('v04_survival_hollow', 'Survival camp: the Hollow Path straight down past Wenna to Fire Beach'),
    ('v05_bakehouse_lane', 'the Bakehouse lane, the door and the lane north to the Quest Lodge'),
    ('v06_lodge_village_lane', 'the village lane past Hettie\'s Garden gate to the stone village bridge'),
    ('v07_quarry_climb', 'Quest Lodge up the mesa ramp (one tile wide) to the Quarry Gate'),
    ('v07b_quarry_gate', 'the Quarry Gate: the ramp lane arrives at the gate'),
    ('v08_keep_ledge', 'Warden\'s Keep gate court and the ledge down to the bank'),
    ('v09_bank_court', 'Holm Bank court and the lane east to the Mage tower'),
    ('v10_gully_to_mage', 'across the gully to the Mage tower door; the crown climb leaves north'),
    ('v11_crown_climb', 'the crown climb switchback to Lastlight'),
    ('v12_village_road', 'the village road and the east lane'),
    ('v13_overview_west', 'overview, west'),
    ('v14_overview_east', 'overview, east')]

def pair_sheet(rows, out, title):
    sheet = Image.new('RGB', (PAD * 3 + W * 2, 48 + len(rows) * (H + CAP + PAD) + PAD), (24, 22, 20))
    d = ImageDraw.Draw(sheet)
    d.text((PAD, 12), title, fill=(240, 226, 190), font=F)
    for i, (name, caption) in enumerate(rows):
        y = 48 + i * (H + CAP + PAD)
        d.text((PAD, y + 5), caption, fill=(230, 230, 222), font=FS)
        for j, tag in enumerate((A, B)):
            f = D / tag / (name + '.jpg')
            x = PAD + j * (W + PAD)
            if f.exists():
                sheet.paste(Image.open(f).convert('RGB').resize((W, H)), (x, y + CAP))
            d.text((x + 8, y + CAP + 6), tag.upper(), fill=(255, 240, 120), font=FS, stroke_width=2, stroke_fill=(0, 0, 0))
    sheet.save(out, quality=86)
    print('[PATH TILES SHEET]', out, sheet.size)

CROPS = [('the Guide House back door, the knoll and the timber bridge', '44,78,80,100'),
         ("the Warden's Keep gate court, the Holm Bank court, the gully and the Mage tower", '74,40,112,70'),
         ('the lesson lanes: Survival camp, Hollow Path, Bakehouse, Quest Lodge, the village lane', '22,48,62,92'),
         ('the Quest Lodge and the Quarry Gate', '20,30,48,60')]

def maps_sheet(out):
    tmp = Path(tempfile.mkdtemp())
    rows = []
    for caption, crop in CROPS:
        pair = []
        for tag in ('before', 'after'):
            f = tmp / f'{tag}_{crop.replace(",", "_")}.png'
            subprocess.run([sys.executable, str(ROOT / 'tools' / 'map_holm_path_tiles.py'), str(D / f'audit_{tag}.json'), str(f), '--px', '16', '--crop', crop,
                            '--title', tag.upper()], check=True, capture_output=True)
            im = Image.open(f).convert('RGB')
            pair.append(im.crop((0, 0, im.width, im.height - 150)))
        rows.append((caption, pair))
    w = max(a.width + b.width for _, (a, b) in rows) + PAD * 3
    h = 48 + sum(max(a.height, b.height) + CAP + PAD for _, (a, b) in rows) + 150
    sheet = Image.new('RGB', (w, h), (24, 22, 20))
    d = ImageDraw.Draw(sheet)
    d.text((PAD, 12), "Tutor's Holm grey paths, tile by tile: review-5 lanes (left) vs the authored layout (right)", fill=(240, 226, 190), font=F)
    y = 48
    for caption, (a, b) in rows:
        d.text((PAD, y + 5), caption, fill=(230, 230, 222), font=FS)
        sheet.paste(a, (PAD, y + CAP)); sheet.paste(b, (PAD * 2 + a.width, y + CAP))
        y += max(a.height, b.height) + CAP + PAD
    legend = Image.open(tmp / f'after_{CROPS[0][1].replace(",", "_")}.png').convert('RGB')
    sheet.paste(legend.crop((0, legend.height - 150, min(legend.width, w), legend.height)), (0, y))
    sheet.save(out, quality=88)
    print('[PATH TILES MAPS]', out, sheet.size)

if __name__ == '__main__':
    if (D / 'audit_before.json').exists() and (D / 'audit_after.json').exists():
        maps_sheet(D / 'maps_before_after_zoomed.jpg')
    halves = [ROWS[:5], ROWS[5:10], ROWS[10:]]   # 15 rows, 5 a sheet
    for n, rows in enumerate(halves, 1):
        pair_sheet(rows, D / f'sheet_{n}_{A}_vs_{B}.jpg', f'Tutor\'s Holm grey paths, {A} (review-5 lanes) vs {B} (authored tile layout) - sheet {n}/3')
