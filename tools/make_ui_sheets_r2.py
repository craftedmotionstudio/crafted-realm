"""Before/after sheets for UI round 2 (scratchpad/holm_ui_v2/{before,after} -> sheets/). Run: python tools/make_ui_sheets_r2.py"""
import os, json
from PIL import Image, ImageDraw, ImageFont
R = os.path.join(os.path.dirname(__file__), '..', 'scratchpad', 'holm_ui_v2')
B, A, O = os.path.join(R, 'before'), os.path.join(R, 'after'), os.path.join(R, 'sheets')
os.makedirs(O, exist_ok=True)
try: F = ImageFont.truetype('arialbd.ttf', 22)
except Exception: F = ImageFont.load_default()

def load(d, n, scale):
    p = os.path.join(d, n)
    if not os.path.exists(p): return None
    im = Image.open(p).convert('RGB')
    return im.resize((int(im.width * scale), int(im.height * scale))) if scale != 1 else im

def pair(names, out, scale=1.0, label='', vertical=False):
    cols = []
    for d, t in ((B, 'BEFORE'), (A, 'AFTER')):
        ims = [i for i in (load(d, n, scale) for n in names) if i]
        if not ims: continue
        w = max(i.width for i in ims); h = sum(i.height for i in ims) + 6 * (len(ims) - 1)
        c = Image.new('RGB', (w, h), (20, 17, 12)); y = 0
        for i in ims: c.paste(i, (0, y)); y += i.height + 6
        cols.append((t, c))
    if not cols: return
    if vertical:
        w = max(c.width for _, c in cols); h = sum(c.height + 34 for _, c in cols)
        s = Image.new('RGB', (w, h), (20, 17, 12)); d = ImageDraw.Draw(s); y = 0
        for t, c in cols: d.text((8, y + 6), t + '  ' + label, fill=(255, 210, 74), font=F); s.paste(c, (0, y + 34)); y += c.height + 34
    else:
        w = sum(c.width for _, c in cols) + 10 * (len(cols) - 1); h = max(c.height for _, c in cols) + 34
        s = Image.new('RGB', (w, h), (20, 17, 12)); d = ImageDraw.Draw(s); x = 0
        for t, c in cols: d.text((x + 8, 6), t + '  ' + label, fill=(255, 210, 74), font=F); s.paste(c, (x, 34)); x += c.width + 10
    s.save(os.path.join(O, out))

pair(['01_login.png'], '01_login_torches.png', 0.6, 'login: standing torches')
pair(['01z_torch_left.png'], '01z_torch_detail.png', 1.4, 'torch detail')
pair(['01b_login_create.png'], '02_new_adventurer.png', 0.6, "'Who are you?' (Begin now enters the world)")
pair(['03_chat_tabs.png'], '03_chat_tabs.png', 2.0, 'chat tab labels (centred)', vertical=True)
pair(['04_tabs_top.png', '04_tabs_bottom.png', '04_rail.png'], '04_tab_icons.png', 2.0, 'side-tab icons + rail')
pair(['05_hint_arrow.png'], '05_hint_arrow.png', 0.6, 'hint arrow over the target')
pair(['05z_hint_arrow_zoom.png'], '05z_hint_arrow_zoom.png', 1.0, 'hint arrow (zoom)')
pair(['06_item_ring.png'], '06_item_ring.png', 1.4, 'item ring')
for n in ['bank', 'shop', 'worldmap', 'quest_scroll', 'droptable', 'overlays', 'deeds', 'smithing', 'music_menu', 'dialogue', 'equip_stats', 'bestiary_drops']:
    pair(['07_%s.png' % n], '07_window_%s.png' % n, 0.8, n.replace('_', ' ') + ' (X + Escape)')
pair(['08_creator_1538.png'], '08_creator_wide.png', 0.5, 'character creator 1538 px')
pair(['08_creator_700.png', '08_creator_480.png'], '08_creator_narrow.png', 0.7, 'creator at 700 px and 480 px')
rep = {}
for d, t in ((B, 'before'), (A, 'after')):
    p = os.path.join(d, 'escape.json')
    if os.path.exists(p): rep[t] = json.load(open(p))
json.dump(rep, open(os.path.join(O, 'escape_report.json'), 'w'), indent=1)
print(sorted(os.listdir(O)))
