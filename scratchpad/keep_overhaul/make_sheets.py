"""Before/after contact sheets for the Warden's Keep overhaul (scratch; run: python make_sheets.py from this folder).
Each row: BEFORE (old keep, holm-keep-props-v1) | AFTER (holm-keep-overhaul-v1), same camera."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
HERE = Path(__file__).resolve().parent
try:
    FONT = ImageFont.truetype('arial.ttf', 22); SMALL = ImageFont.truetype('arial.ttf', 16)
except OSError:
    FONT = SMALL = ImageFont.load_default()

def fit(p, w):
    im = Image.open(p).convert('RGB')
    return im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)

def pairs(title, rows, out, w=760):
    tiles = []
    for label, a, b in rows:
        A, B = fit(a, w), fit(b, w)
        tiles.append((label, A, B))
    head, lab, gap = 66, 26, 8
    H = head + sum(lab + max(A.height, B.height) + gap for _, A, B in tiles)
    W = 2 * w + 3 * gap
    sheet = Image.new('RGB', (W, H), (24, 22, 20)); d = ImageDraw.Draw(sheet)
    d.text((gap, 12), title, fill=(240, 220, 160), font=FONT)
    d.text((gap, 40), 'BEFORE (old keep)', fill=(200, 200, 200), font=SMALL)
    d.text((2 * gap + w, 40), 'AFTER (overhaul)', fill=(200, 200, 200), font=SMALL)
    y = head
    for label, A, B in tiles:
        d.text((gap, y + 4), label, fill=(230, 230, 230), font=SMALL); y += lab
        sheet.paste(A, (gap, y)); sheet.paste(B, (2 * gap + w, y))
        y += max(A.height, B.height) + gap
    sheet.save(HERE / out, quality=86); print(out, sheet.size)

def grid(title, items, out, w=620, cols=3):
    ims = [(n, fit(p, w)) for n, p in items]
    head, lab, gap = 50, 24, 8
    rows = [ims[i:i + cols] for i in range(0, len(ims), cols)]
    H = head + sum(lab + max(im.height for _, im in r) + gap for r in rows)
    W = cols * w + (cols + 1) * gap
    sheet = Image.new('RGB', (W, H), (24, 22, 20)); d = ImageDraw.Draw(sheet)
    d.text((gap, 12), title, fill=(240, 220, 160), font=FONT)
    y = head
    for r in rows:
        for i, (n, im) in enumerate(r):
            x = gap + i * (w + gap)
            d.text((x, y + 3), n, fill=(230, 230, 230), font=SMALL); sheet.paste(im, (x, y + lab))
        y += lab + max(im.height for _, im in r) + gap
    sheet.save(HERE / out, quality=86); print(out, sheet.size)

BB, BA, IG = HERE / 'blender_before', HERE / 'blender_after', HERE / 'ingame'
bl = lambda names: [(n, BB / (n + '.png'), BA / (n + '.png')) for n in names]
ig = lambda names: [(n, IG / ('before_' + n + '.jpg'), IG / ('after_' + n + '.jpg')) for n in names]
pairs("Warden's Keep - Blender, outside (GLB as the game loads it)", bl(['ext_front', 'ext_se', 'ext_sw', 'ext_ne', 'ext_nw']), 'sheet_blender_outside.jpg')
pairs("Warden's Keep - Blender, inside: plans and cutaways, ground and upper floor", bl(['plan_ground', 'plan_upper', 'cut_ground', 'cut_upper']), 'sheet_blender_inside.jpg')
det = sorted((HERE / 'blender_after_detail').glob('*.png'))
grid("Warden's Keep AFTER - Blender detail views", [(p.stem, p) for p in det], 'sheet_blender_detail_after.jpg')
pairs("Warden's Keep - in game (draft ?holmIsland=1), outside", ig(['out_front', 'out_gate', 'out_se', 'out_sw', 'out_ne', 'out_nw', 'court']), 'sheet_ingame_outside.jpg')
pairs("Warden's Keep - in game, inside ground floor", ig(['gate_passage', 'hall_south', 'hall_north', 'hall_stair', 'barracks']), 'sheet_ingame_ground.jpg')
pairs("Warden's Keep - in game, inside upper floor, wall-walk and towers", ig(['upper_chamber', 'upper_solar', 'upper_barracks', 'gatehouse_upper', 'walk_east', 'walk_south', 'watch_l1', 'turret_l1', 'watch_top', 'turret_top']), 'sheet_ingame_upper.jpg')
