"""make_world_item_icons_sheet.py -- the review sheet for the world item icons (tools/blender/build_world_item_icons_v1.py)
and the four W4 stat sprites (tools/blender/build_ui_icons_v1.py + tools/process_ui_icons_v3.py).

One row per kind: the EXISTING icons of that kind first (grey label, "was"), then every NEW icon (gold label). Each icon is
shown at its native 96 px and at the display size the game uses (34 px: the skill guide / kit slots; box filter like the
browser's downscale) on the inventory slot colours. The five planned runes (no item yet) close the rune row, marked.
Output: scratchpad/item_icons/contact_sheet.png
Run: python tools/make_world_item_icons_sheet.py
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ITEMS = ROOT / 'assets/icons/items'; GEAR = ROOT / 'assets/icons/gear'; UI = ROOT / 'assets/icons/ui/v3'
OUT = ROOT / 'scratchpad/item_icons'; OUT.mkdir(parents=True, exist_ok=True)
FUT = OUT / 'future_runes'
T = ['copper', 'steel', 'whitsteel', 'aurel', 'veyrite', 'undercrag']
T7 = ['copper', 'iron'] + T[1:]
ROWS = [
    ('Swords', ['bronze_sword', 'iron_sword'], [t + '_sword' for t in T] + ['crag_maul']),
    ('Hatchets', ['hatchet', 'iron_hatchet'], [t + '_hatchet' for t in T]),
    ('Pickaxes', ['pickaxe', 'iron_pickaxe'], [t + '_pickaxe' for t in T]),
    ('Platebodies', ['bronze_plate'], [t + '_platebody' for t in T7]),
    ('Platelegs', ['bronze_legs'], [t + '_platelegs' for t in T7]),
    ('Ranged', ['worn_bow', 'gear:gale_longbow', 'leather_body', 'gear:leather_chaps', 'gear:leather_gloves'],
     ['ash_bow', 'blackthorn_bow', 'duskwood_bow', 'riveted_body', 'riveted_chaps', 'fenhide_body', 'fenhide_chaps', 'fenhide_vambraces']),
    ('Magic', ['apprentice_staff'], ['ember_staff', 'storm_staff', 'wizard_hat', 'apprentice_hat', 'glimmer_hat', 'starweave_hat',
                                     'cloth_robe_top', 'cloth_robe_skirt', 'glimmer_robe_top', 'starweave_robe_top', 'starweave_robe_skirt']),
    ('Prayer, neck, cape', ['tarnished_ring'], ['monk_robe_top', 'monk_robe_bottom', 'holy_symbol', 'amulet_of_might', 'amulet_of_precision',
                                                'amulet_of_warding', 'trav_cape_red', 'trav_cape_blue', 'trav_cape_green', 'guild_sigil']),
    ('Food', ['bread', 'raw_perch', 'cooked_perch'], ['cabbage', 'cheese', 'cooked_meat', 'hollow_ale', 'raw_trout', 'trout']),
    ('Resources', ['logs', 'copper_ore', 'tin_ore', 'bronze_bar'], ['oak_logs', 'willow_logs', 'clay', 'iron_ore', 'coal', 'gold_ore',
                                                                     'iron_bar', 'steel_bar', 'gold_bar']),
    ('Crafts, tools', ['arrows', 'fishing_net'], ['bronze_tips', 'iron_tips', 'arrow_shafts', 'bow_string', 'silver_trinket', 'fishing_rod',
                                                  'fly_fishing_rod', 'ball_of_wool', 'pot', 'bowl']),
    ('Was canvas-drawn', ['bones', 'bread_dough'], ['beast_hide', 'feathers', 'knife', 'ashes', 'chisel', 'rope', 'shears', 'spade', 'jug',
                                                   'jug_water', 'soft_clay', 'leather', 'wool', 'flax', 'grain', 'potato', 'onion', 'egg',
                                                   'raw_beef', 'big_bones', 'fen_charm']),
    ('Runes', ['air_rune', 'mind_rune'], ['water_rune', 'earth_rune', 'fire_rune', 'body_rune', 'chaos_rune', 'nature_rune', 'spark_rune',
                                         'future:writ', 'future:grave', 'future:star', 'future:vein', 'future:spirit']),
]
SKILLS_OLD = ['attack', 'strength', 'defence', 'hitpoints', 'ranged', 'magic', 'prayer', 'woodcutting', 'mining', 'fishing', 'cooking',
              'firemaking', 'smithing', 'fletching', 'thieving']
SKILLS_NEW = ['crafting', 'herblore', 'agility', 'runecrafting']

PANEL, SLOT, LINE = (62, 53, 41), (71, 62, 48), (93, 84, 71)
OLD_C, NEW_C, FUT_C = (170, 160, 140), (255, 200, 60), (140, 190, 255)
CW, CH = 150, 128

def path(k):
    if k.startswith('gear:'): return GEAR / (k[5:] + '.png')
    if k.startswith('future:'): return FUT / (k[7:] + '_rune_sigil.png')
    return ITEMS / (k + '.png')
def slot(img, size):
    s = Image.new('RGBA', (size, size), LINE + (255,)); ImageDraw.Draw(s).rectangle([1, 1, size - 2, size - 2], fill=SLOT + (255,))
    im = img.copy(); im.thumbnail((size - 2, size - 2), Image.BOX)
    s.alpha_composite(im, ((size - im.width) // 2, (size - im.height) // 2)); return s
def cell(k, kind):
    c = Image.new('RGBA', (CW, CH), PANEL + (255,)); d = ImageDraw.Draw(c)
    p = path(k)
    if not p.exists():
        d.text((6, 50), 'MISSING ' + k, fill=(255, 80, 60, 255)); return c
    im = Image.open(p).convert('RGBA')
    c.alpha_composite(slot(im, 100), (2, 2))
    c.alpha_composite(slot(im, 36), (108, 2))
    name = k.split(':')[-1]
    col = {'old': OLD_C, 'new': NEW_C, 'future': FUT_C}[kind]
    d.text((4, 106), ('was ' if kind == 'old' else 'planned ' if kind == 'future' else '') + name[:22], fill=col + (255,))
    return c
rows = []
for label, old, new in ROWS:
    cells = [cell(k, 'old') for k in old] + [cell(k, 'future' if k.startswith('future:') else 'new') for k in new]
    per = 9
    for i in range(0, len(cells), per):
        chunk = cells[i:i + per]
        r = Image.new('RGBA', (140 + per * (CW + 6), CH + 6), PANEL + (255,)); d = ImageDraw.Draw(r)
        if i == 0: d.text((6, 8), label, fill=(255, 152, 31, 255))
        for k, c in enumerate(chunk): r.alpha_composite(c, (140 + k * (CW + 6), 3))
        rows.append(r)
# stat sprites: every skill at 1x and 3x, the four new ones last
r = Image.new('RGBA', (140 + 19 * 64, 100), PANEL + (255,)); d = ImageDraw.Draw(r); d.text((6, 8), 'Stat sprites', fill=(255, 152, 31, 255))
for k, s in enumerate(SKILLS_OLD + SKILLS_NEW):
    p = UI / 'skills' / (s + '.png'); x = 140 + k * 64
    if not p.exists(): d.text((x, 40), 'MISSING', fill=(255, 80, 60, 255)); continue
    im = Image.open(p).convert('RGBA'); r.alpha_composite(im, (x, 6))
    r.alpha_composite(im.resize((im.width * 2, im.height * 2), Image.NEAREST), (x, 34))
    p18 = UI / 'skills18' / (s + '.png')
    if p18.exists(): r.alpha_composite(Image.open(p18).convert('RGBA'), (x + 30, 6))
    d.text((x, 86), s[:9], fill=(NEW_C if s in SKILLS_NEW else OLD_C) + (255,))
rows.append(r)
W = max(x.width for x in rows); H = sum(x.height for x in rows) + 40
sheet = Image.new('RGBA', (W, H), PANEL + (255,)); d = ImageDraw.Draw(sheet)
d.text((8, 10), 'World item icons v1 -- grey "was" = existing icons, gold = new Blender renders (96 px and 34 px display size), '
                'blue = planned runes (no item yet)', fill=(235, 225, 200, 255))
y = 40
for x in rows: sheet.alpha_composite(x, (0, y)); y += x.height
sheet.convert('RGB').save(OUT / 'contact_sheet.png')
print('sheet ->', OUT / 'contact_sheet.png', sheet.size)
