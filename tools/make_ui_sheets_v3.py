"""Before / after (/ reference) sheets for UI round 3: scratchpad/holm_ui_v3/{before,after} -> sheets/.
Each sheet puts the old screen, the new one and -- where the owner gave one -- the Bible reference side by side.
Run: python tools/make_ui_sheets_v3.py"""
import os, json
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
R = os.path.join(ROOT, 'scratchpad', 'holm_ui_v3')
B, A, O, REF = os.path.join(R, 'before'), os.path.join(R, 'after'), os.path.join(R, 'sheets'), os.path.join(ROOT, 'Bible_References')
os.makedirs(O, exist_ok=True)
try: F = ImageFont.truetype('arialbd.ttf', 20)
except Exception: F = ImageFont.load_default()
BG = (20, 17, 12)

def load(p, scale=1.0, h=None, nearest=True):
    if not p or not os.path.exists(p): return None
    im = Image.open(p).convert('RGB')
    if h: scale = h / im.height
    if scale != 1: im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.NEAREST if nearest else Image.LANCZOS)
    return im

def sheet(name, out, label, scale=1.0, ref=None):
    cols = []
    for d, t in ((B, 'BEFORE'), (A, 'AFTER')):
        ims = [i for i in (load(os.path.join(d, n), scale) for n in (name if isinstance(name, list) else [name])) if i]
        if not ims: continue
        w = max(i.width for i in ims); h = sum(i.height for i in ims) + 6 * (len(ims) - 1)
        c = Image.new('RGB', (w, h), BG); y = 0
        for i in ims: c.paste(i, (0, y)); y += i.height + 6
        cols.append((t, c))
    if not cols: return
    if ref:
        H = max(c.height for _, c in cols); r = load(os.path.join(REF, ref), h=H, nearest=False)
        if r: cols.append(('REFERENCE (' + ref + ')', r))
    w = sum(c.width for _, c in cols) + 12 * (len(cols) - 1); h = max(c.height for _, c in cols) + 32
    s = Image.new('RGB', (w, h), BG); dr = ImageDraw.Draw(s); x = 0
    for t, c in cols:
        dr.text((x + 6, 5), t + ('  ' + label if not t.startswith('REF') else ''), fill=(255, 210, 74), font=F); s.paste(c, (x, 32)); x += c.width + 12
    s.save(os.path.join(O, out))

sheet('01_login.png', '01_login.png', 'login screen', .62)
sheet('01b_login_create.png', '01b_login_create.png', 'new adventurer', .62)
sheet('02_hud.png', '02_hud.png', 'in-game HUD', .62)
sheet('03_minimap.png', '03_minimap_orbs.png', 'minimap, compass, orbs', 2.0, 'UI_QuickPanel.jpg')
sheet(['03_rail.png', '05b_tabs_top.png', '05c_tabs_bottom.png'], '03b_rail_tabs_zoom.png', 'rail + side-tab icons (2x)', 2.0)
sheet('04_chatbox.png', '04_chatbox.png', 'chat box', 1.0, 'UI_ChatBar+More.jpg')
sheet('05_tooltip.png', '05_tooltip.png', 'tooltip', 1.4)
sheet('05d_hint_arrow.png', '05d_hint_arrow.png', 'hint arrow + label', 1.0)
REFS = {'combat': 'UI_Combat.jpg', 'skills': 'UI_Stats.jpg', 'quests': 'UI_Quests.jpg', 'inv': 'UI_Inventory1.jpg', 'equip': 'UI_Player_Worn_Inventory.jpg',
        'prayers': 'UI_Prayer.jpg', 'spells': 'UI_MagicBook.jpg', 'drops': None, 'clan': 'UI_ClanChat.jpg', 'friends': 'UI_FriendsList.jpg', 'ignore': 'UI_IgnoreList.jpg',
        'logout': 'UI_LogoutScreen.jpg', 'settings': 'UI_Settings.jpg', 'emotes': 'UI_Emotes.jpg', 'music': 'UI_MusicList.jpg'}
for i, t in enumerate(REFS, 1):
    sheet('06_tab_%02d_%s.png' % (i, t), '06_tab_%02d_%s.png' % (i, t), 'side tab: ' + t, 1.6, REFS[t])
sheet('07_equip_worn.png', '07_equip_worn.png', 'worn equipment with gear on', 1.6, 'UI_Player_Worn_Inventory.jpg')
sheet('07b_item_ring.png', '07b_item_ring.png', 'tutorial item ring', 1.6)
for w in ('unarmed', 'sword', 'axe', 'pick', 'mace', 'bow', 'staff'):
    sheet('08_combat_%s.png' % w, '08_combat_%s.png' % w, 'combat options: ' + w, 1.6, 'UI_Combat.jpg')
sheet('09_rightclick.png', '09_rightclick.png', 'right-click menu', 2.0)
for n, ref in (('bank', None), ('shop', None), ('worldmap', 'UI_OpenMiniMap.jpg'), ('quest_scroll', 'UI_QuestScrollScreen.jpg'), ('droptable', None), ('overlays', None),
               ('deeds', None), ('smithing', 'Anvil_Interface_for_Making_Items.jpg'), ('music_menu', None), ('dialogue', None)):
    sheet('10_%s.png' % n, '10_%s.png' % n, 'window: ' + n.replace('_', ' '), 1.0, ref)
sheet('11_bestiary_drops.png', '11_bestiary_drops.png', 'bestiary drop list', 1.6)
sheet('13_creator_1538.png', '13_creator_1538.png', 'character creator', .62)
sheet('13_creator_700.png', '13_creator_700.png', 'creator at 700 px', .8)
sheet('14_narrow_hud.png', '14_narrow_hud.png', 'narrow / mobile HUD (760 px)', .8)
rep = {}
for d, t in ((B, 'before'), (A, 'after')):
    p = os.path.join(d, 'report.json')
    if os.path.exists(p): rep[t] = json.load(open(p))
json.dump(rep, open(os.path.join(O, 'escape_report.json'), 'w'), indent=1)
print(len(os.listdir(O)), 'sheets ->', O)
