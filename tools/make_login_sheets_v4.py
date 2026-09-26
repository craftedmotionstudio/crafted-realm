"""Before / after (/ reference) sheets for the login art round: scratchpad/holm_login_v4/{before,after} -> sheets/.
The reference (Bible_References/Login_2004_Reference.png) is shown for comparison of mood only; nothing is traced from it.
Run: python tools/make_login_sheets_v4.py"""
import os, json
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
R = os.path.join(ROOT, 'scratchpad', 'holm_login_v4')
B, A, O = os.path.join(R, 'before'), os.path.join(R, 'after'), os.path.join(R, 'sheets')
REF = os.path.join(ROOT, 'Bible_References', 'Login_2004_Reference.png')
os.makedirs(O, exist_ok=True)
try: F = ImageFont.truetype('arialbd.ttf', 20)
except Exception: F = ImageFont.load_default()
BG = (20, 17, 12)
def load(p, scale=1.0, h=None):
    if not p or not os.path.exists(p): return None
    im = Image.open(p).convert('RGB')
    if h: scale = h / im.height
    return im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.LANCZOS if scale < 1 else Image.NEAREST) if scale != 1 else im
def sheet(names, out, label, scale=1.0, ref=False, cols=None):
    names = names if isinstance(names, list) else [names]
    parts = []
    for d, t in ((B, 'BEFORE'), (A, 'AFTER')):
        ims = [i for i in (load(os.path.join(d, n), scale) for n in names) if i]
        if not ims: continue
        if cols == 'row':
            w = sum(i.width for i in ims) + 6 * (len(ims) - 1); h = max(i.height for i in ims); c = Image.new('RGB', (w, h), BG); x = 0
            for i in ims: c.paste(i, (x, 0)); x += i.width + 6
        else:
            w = max(i.width for i in ims); h = sum(i.height for i in ims) + 6 * (len(ims) - 1); c = Image.new('RGB', (max(w, 330), h), BG); y = 0
            for i in ims: c.paste(i, (0, y)); y += i.height + 6
        parts.append((t, c))
    if not parts: return
    if ref:
        r = load(REF, h=max(c.height for _, c in parts))
        if r: parts.append(('REFERENCE (mood only: 2004 login)', r))
    w = sum(c.width for _, c in parts) + 12 * (len(parts) - 1); h = max(c.height for _, c in parts) + 32
    s = Image.new('RGB', (w, h), BG); dr = ImageDraw.Draw(s); x = 0
    for t, c in parts:
        dr.text((x + 6, 5), t + ('  ' + label if not t.startswith('REF') else ''), fill=(255, 210, 74), font=F); s.paste(c, (x, 32)); x += c.width + 12
    s.save(os.path.join(O, out))
sheet('01_choose.png', '01_login_choose.png', 'welcome screen 1538 x 900', .62, ref=True)
sheet('06_logo.png', '02_title.png', 'the title', 1.0)
sheet('07_panel.png', '03_panel.png', 'the login panel', 1.0)
sheet('02_create.png', '04_new_adventurer.png', 'new adventurer', .62)
sheet('03_options.png', '05_options.png', 'options', .62)
sheet('04_play.png', '06_ready.png', 'adventure ready (continue)', .62)
sheet('05_confirm.png', '07_erase_confirm.png', 'erase confirm', .62)
sheet(['11_fire_0.png', '11_fire_1.png', '11_fire_2.png', '11_fire_3.png'], '08_fire_frames.png', 'brazier fire, 4 frames 140 ms apart', .8, cols='row')
sheet('08_1280x720.png', '09_1280x720.png', '1280 x 720', .8, ref=True)
sheet('09_760x820.png', '10_760x820.png', 'narrow 760 x 820', .8)
sheet('10_390x844.png', '11_phone_390x844.png', 'phone 390 x 844', 1.0)
rep = {}
for d, t in ((B, 'before'), (A, 'after')):
    p = os.path.join(d, 'report.json')
    if os.path.exists(p):
        j = json.load(open(p)); rep[t] = {k: j[k] for k in ('welcomeShownMs', 'loginAssetBytes', 'errors') if k in j}
json.dump(rep, open(os.path.join(O, 'report.json'), 'w'), indent=1)
print(len(os.listdir(O)), 'files ->', O, rep)
