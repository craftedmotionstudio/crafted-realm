"""Before / after review sheet for a kit v4 option revision (our renders only -- no reference imagery).

  python tools/holm_char_before_after_v4.py --before v4a --after v4a2 --out scratchpad/holm_characters_v4/rollout/owner_review_v4a2.png

Reads the option driver's cells (tools/blender/build_holm_characters_v4_options.py):
  scratchpad/holm_characters_v4/<before>/cells/<before>_*.png  and  scratchpad/holm_characters_v4/rollout/<after>/cells/<after>_*.png
and lays out, per row, the same view before and after: turnarounds (clothes + shading), the bald classic head from the
front / side / back, the walk and run strips (8 held poses each)."""
import os, sys
from PIL import Image, ImageDraw, ImageFont

ARGS = sys.argv[1:]
def arg(k, d=None):
    return ARGS[ARGS.index(k) + 1] if k in ARGS else d
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BEFORE, AFTER = arg('--before', 'v4a'), arg('--after', 'v4a2')
OUT = os.path.join(ROOT, arg('--out', 'scratchpad/holm_characters_v4/rollout/owner_review_%s.png' % AFTER))
def cell_dir(opt):
    for d in (os.path.join(ROOT, 'scratchpad', 'holm_characters_v4', 'rollout', opt, 'cells'),
              os.path.join(ROOT, 'scratchpad', 'holm_characters_v4', opt, 'cells')):
        if os.path.isdir(d):
            return d
    raise SystemExit('no cells for ' + opt)
DB, DA = cell_dir(BEFORE), cell_dir(AFTER)
BG = (24, 22, 20)
def font(sz):
    for f in ('C:/Windows/Fonts/segoeui.ttf', 'C:/Windows/Fonts/arial.ttf'):
        if os.path.exists(f):
            return ImageFont.truetype(f, sz)
    return ImageFont.load_default()
F, FT = font(15), font(20)

def load(d, opt, name, h):
    p = os.path.join(d, '%s_%s.png' % (opt, name))
    im = Image.open(p).convert('RGBA')
    bg = Image.new('RGBA', im.size, (214, 214, 218, 255)); bg.alpha_composite(im); im = bg.convert('RGB')
    return im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)

def strip(ims, label, gap=4):
    w = sum(i.width for i in ims) + gap * (len(ims) - 1)
    h = max(i.height for i in ims) + 24
    out = Image.new('RGB', (w, h), BG)
    ImageDraw.Draw(out).text((4, 2), label, fill=(240, 220, 150), font=F)
    x = 0
    for i in ims:
        out.paste(i, (x, 24)); x += i.width + gap
    return out

def pair(names, h, title):
    b = strip([load(DB, BEFORE, n, h) for n in names], 'before (%s)' % BEFORE)
    a = strip([load(DA, AFTER, n, h) for n in names], 'after (%s)' % AFTER)
    w = b.width + a.width + 24
    out = Image.new('RGB', (w, max(b.height, a.height) + 30), BG)
    ImageDraw.Draw(out).text((4, 2), title, fill=(255, 255, 255), font=FT)
    out.paste(b, (0, 30)); out.paste(a, (b.width + 24, 30))
    return out

def seq(opt, d, base, h, label):
    return strip([load(d, opt, '%s_%02d' % (base, k), h) for k in range(8)], label)

rows = [
    pair(['A_front', 'A_34', 'A_side', 'A_back'], 300, '1+2  Man: form-fitting trousers; smooth inside each colour region (hard breaks at material edges / silhouette)'),
    pair(['B_front', 'B_34', 'B_side', 'B_back'], 300, '1+2  Woman: the same shading rule'),
    pair(['A_skull_front', 'A_skull_side', 'A_skull_back', 'A_skull_34back', 'A_face_34'], 220,
         '3  Skull (man): fuller, deeper, rounder cranium (head height 0.16 H unchanged) -- bald, front / side / back / 3-4 back'),
    pair(['B_skull_front', 'B_skull_side', 'B_skull_back', 'B_skull_34back', 'B_face_34'], 220, '3  Skull (woman)'),
]
for cn, n in (('walk', '4  Walk (man, side, the 8 held poses): heel strike toes-up, trailing heel lift + knee bend, swing-foot lift'),
              ('run', '5  Run (man, side, the 8 held poses): calmer -- arms +-52 deg with the elbows near 90, lower kick, same cycle / step / lean')):
    b, a = seq(BEFORE, DB, 'A_' + cn, 200, 'before (%s)' % BEFORE), seq(AFTER, DA, 'A_' + cn, 200, 'after (%s)' % AFTER)
    out = Image.new('RGB', (max(b.width, a.width), b.height + a.height + 34), BG)
    ImageDraw.Draw(out).text((4, 2), n, fill=(255, 255, 255), font=FT)
    out.paste(b, (0, 30)); out.paste(a, (0, 30 + b.height + 4))
    rows.append(out)
W = max(r.width for r in rows) + 20
H = sum(r.height for r in rows) + 16 * len(rows) + 50
sheet = Image.new('RGB', (W, H), BG)
ImageDraw.Draw(sheet).text((10, 10), 'Owner review 2026-09-27 -- kit %s -> %s (our Blender renders only)' % (BEFORE, AFTER), fill=(255, 210, 90), font=FT)
y = 50
for r in rows:
    sheet.paste(r, (10, y)); y += r.height + 16
os.makedirs(os.path.dirname(OUT), exist_ok=True)
sheet.save(OUT)
print('[BEFORE_AFTER]', OUT, sheet.size)
