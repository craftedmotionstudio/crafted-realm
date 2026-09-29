"""Owner review 5 (2026-09-28) before/after sheets: the purposeful grey paths, the rock-bank treatment of the grey squares on
steep edges, and the rope into the mine shaft. Pairs the captures of tools/capture_holm_paths_rope.js (scratchpad/
holm_paths_rope/before/ and after/) side by side at the game camera, with a caption per row, plus the top-down path maps
(tools/map_holm_paths.js). Our renders only.
Run: python tools/make_holm_paths_rope_sheets.py"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
D = ROOT / 'scratchpad' / 'holm_paths_rope'
W, H, PAD, CAP = 760, 451, 10, 30

def font(n):
    for f in ('C:/Windows/Fonts/segoeuib.ttf', 'C:/Windows/Fonts/arialbd.ttf'):
        try: return ImageFont.truetype(f, n)
        except Exception: pass
    return ImageFont.load_default()

F, FS = font(20), font(15)

def pair_sheet(rows, out, title):
    sheet = Image.new('RGB', (PAD * 3 + W * 2, 48 + len(rows) * (H + CAP + PAD) + PAD), (24, 22, 20))
    d = ImageDraw.Draw(sheet)
    d.text((PAD, 12), title, fill=(240, 226, 190), font=F)
    for i, row in enumerate(rows):
        names, caption = (row[0], row[0]) if len(row) == 2 else (row[0], row[1]), row[-1]
        y = 48 + i * (H + CAP + PAD)
        d.text((PAD, y + 5), caption, fill=(230, 230, 222), font=FS)
        for j, tag in enumerate(('before', 'after')):
            p = D / tag / (names[j] + '.jpg')
            x = PAD + j * (W + PAD)
            if p.exists():
                sheet.paste(Image.open(p).convert('RGB').resize((W, H), Image.LANCZOS), (x, y + CAP))
            else:
                d.rectangle([x, y + CAP, x + W, y + CAP + H], outline=(120, 60, 60))
                d.text((x + 12, y + CAP + 12), 'missing ' + tag, fill=(220, 120, 120), font=FS)
            d.text((x + 8, y + CAP + 6), tag.upper(), fill=(255, 235, 120), font=F)
    sheet.save(out, quality=86)
    print('[HOLM PATHS ROPE SHEET]', out.relative_to(ROOT), sheet.size)

pair_sheet([
    ('p02_guide_house_yard', 'Guide House front: the trail from the landing is a grey stone path to the porch'),
    ('p03_guide_house_back_fork', 'Behind the Guide House: one 2-tile lane from the back door to the fork, then west to the bridge and east'),
    ('p11_bank_court', 'Holm Bank court: the soft brown field becomes defined grey lanes and a small court at the door'),
    ('p07_bakehouse_lodge_lane', 'Bakehouse to Quest Lodge: the lesson route, a 2-tile lane (the grey banks by the Lodge are grass now)'),
], D / 'sheet_1_paths_guide_house_and_court.jpg', 'Purposeful grey paths (owner review 5): Guide House, back fork, bank court, lesson route')
pair_sheet([
    ('p05_survival_camp_path', 'Survival camp and the Hollow Path down to the Fire Beach'),
    ('p06_timber_bridge', 'The timber bridge on the route west'),
    ('p09_quarry_approach', 'The Quarry Gate approach'),
    ('p12_mage_yard', 'Mage tower door and practice yard'),
], D / 'sheet_2_paths_lesson_route.jpg', 'Purposeful grey paths (owner review 5): along the lesson route')
pair_sheet([
    ('p14_route_overview_west', 'The west of the island, wide: lanes only where the route and the building lanes run'),
    ('p15_route_overview_east', 'The east of the island, wide'),
    ('p13_crown_climb', 'The climb to Lastlight'),
    ('p10_keep_court', 'The Warden\'s Keep court (its crag keeps real rock cliffs)'),
], D / 'sheet_3_paths_overview.jpg', 'Purposeful grey paths (owner review 5): overview')
pair_sheet([
    ('r01_knoll_south_edge', 'Guide House knoll, south: the grey squares on the lawn edge'),
    ('r02_knoll_west_edge', 'Guide House knoll, west edge: a grey band of rock tiles becomes a grassy earth bank'),
    ('r03_knoll_north_edge', 'Guide House knoll, north edge'),
    ('r04_knoll_east_edge', 'Guide House knoll, east edge'),
], D / 'sheet_4_rock_squares_knoll.jpg', 'The grey rock squares on steep edges: the Guide House knoll')
pair_sheet([
    ('r05_seat_edge_bakehouse', 'Bakehouse seat edge'),
    ('r06_ravine_cliff', 'The ravine: its low banks turn to grass, the true cliff keeps its rock'),
    ('r07_keep_crag_cliff', 'The keep crag: a real cliff face, rock kept'),
    ('p04_guide_knoll_wide', 'The knoll from the landing, wide'),
], D / 'sheet_5_rock_squares_elsewhere.jpg', 'The grey rock squares on steep edges: elsewhere (true cliffs keep their rock)')
# the rope into the mine shaft: before = the shaft as it was (a "shaft ladder" nobody could see), after = the coil by the shaft,
# then the rope tied to the frame and hanging into the dark
pair_sheet([
    ('q06_hall_top', 'q10_rope_coil', 'The Quarry Gate hall: a coil of rope now lies on the floor beside the mine shaft (right-click Take)'),
    ('q06_hall_top', 'q11_rope_coil_close', 'The coil up close: the same Blender coil as its inventory icon'),
    ('q06_hall_top', 'q12_rope_tied', 'Use the rope on the shaft (or Tie-rope): the rope is knotted round the frame, its slack on the floor'),
    ('q01_shaft_stance', 'q13_rope_tied_close', 'At the shaft mouth: turns round the post, a knot and a loose tail'),
    ('q04_shaft_top', 'q14_rope_tied_inside', 'Inside the mouth: the rope runs back along the tunnel and hangs down into the dark shaft'),
    ('q05_shaft_side', 'q15_rope_cavern_foot', 'Climb-down lowers the adventurer on the rope to Foreman Durgin in the ore workings (the ladder clip); the ladder brings them back up'),
], D / 'sheet_6_rope_into_the_shaft.jpg', 'The rope into the mine shaft (owner review 5): take the coil, tie it to the frame, climb down')
# the path maps, before and after (tools/map_holm_paths.js)
maps = [D / 'before' / 'map_paths_before.png', D / 'after' / 'map_paths_after.png']
if all(p.exists() for p in maps):
    ims = [Image.open(p).convert('RGB') for p in maps]
    w, h = ims[0].size
    sheet = Image.new('RGB', (w * 2 + PAD * 3, h + 60), (24, 22, 20))
    d = ImageDraw.Draw(sheet)
    d.text((PAD, 12), 'Path tiles, top down: before (phase-5 worn dirt, 1,671 tiles with soft verges) / after (grey lanes)', fill=(240, 226, 190), font=F)
    for j, im in enumerate(ims): sheet.paste(im, (PAD + j * (w + PAD), 50))
    sheet.save(D / 'sheet_0_path_maps.jpg', quality=88)
    print('[HOLM PATHS ROPE SHEET] scratchpad/holm_paths_rope/sheet_0_path_maps.jpg', sheet.size)
