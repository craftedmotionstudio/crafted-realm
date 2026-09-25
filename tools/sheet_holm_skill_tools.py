"""Contact sheets for tools/capture_holm_skill_tools.js captures (Pillow).

Usage: python tools/sheet_holm_skill_tools.py before|after [compare]
  <phase>: scratchpad/holm_skill_tools_v1/<phase>/{held,skills}_sheet.png (every capture, labelled)
  compare: scratchpad/holm_skill_tools_v1/compare_{held,skills}.png (before | after, same shot side by side)
"""
import sys, re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1] / 'scratchpad' / 'holm_skill_tools_v1'
def font(sz):
    for f in ('arial.ttf', 'segoeui.ttf', 'DejaVuSans.ttf'):
        try: return ImageFont.truetype(f, sz)
        except OSError: pass
    return ImageFont.load_default()
F = font(18); FT = font(26)
TW, TH = 280, 333   # thumbnail of a 420x500 capture

def cell(p, label):
    im = Image.open(p).convert('RGB').resize((TW, TH), Image.LANCZOS)
    c = Image.new('RGB', (TW, TH + 26), (36, 40, 48)); c.paste(im, (0, 26))
    ImageDraw.Draw(c).text((6, 3), label, fill=(235, 230, 215), font=F); return c

def sheet(cells, cols, title, out):
    rows = (len(cells) + cols - 1) // cols
    W = cols * (TW + 6) + 6; H = rows * (TH + 32) + 50
    s = Image.new('RGB', (W, H), (24, 27, 33)); d = ImageDraw.Draw(s); d.text((10, 10), title, fill=(255, 220, 140), font=FT)
    for k, c in enumerate(cells):
        r, q = divmod(k, cols); s.paste(c, (6 + q * (TW + 6), 46 + r * (TH + 32)))
    s.save(out); print('sheet ->', out)

def shots(phase, prefix):
    ps = [p for p in (ROOT / phase).glob(prefix + '*.png') if not p.stem.endswith('_sheet')]
    return sorted(ps, key=lambda p: order(p.stem))
ORDER_W = ['hatchet', 'pickaxe', 'bronze_dagger', 'bronze_sword', 'worn_bow', 'apprentice_staff', 'bronze_dagger+wood_shield']
ORDER_S = ['chop', 'mine', 'net', 'firemake', 'cook', 'smith', 'smelt']
def order(stem):
    m = re.match(r'held_(.+)_(idle|walk|run)_(q|side)$', stem)
    if m:
        w = ORDER_W.index(m.group(1)) if m.group(1) in ORDER_W else 99
        return (0, w, ['idle', 'walk', 'run'].index(m.group(2)), m.group(3) == 'side')
    m = re.match(r'skill_([a-z]+)_f(\d+)_(q|side)$', stem)
    if m:
        return (1, ORDER_S.index(m.group(1)) if m.group(1) in ORDER_S else 99, int(m.group(2)), m.group(3) == 'side')
    return (2, 0, 0, stem)

def main():
    phase = sys.argv[1]
    if phase == 'compare':
        for prefix, cols in (('held_', 6), ('skill_', 4)):
            cells = []
            for p in shots('after', prefix):
                b = ROOT / 'before' / p.name
                if b.exists(): cells += [cell(b, 'BEFORE ' + p.stem[len(prefix):]), cell(p, 'AFTER ' + p.stem[len(prefix):])]
            sheet(cells, cols, 'Before | after: ' + ('held items (idle / walk / run)' if prefix == 'held_' else 'skilling clips with the tool in hand'),
                  ROOT / ('compare_%s.png' % prefix.rstrip('_')))
        return
    for prefix, cols, title in (('held_', 6, 'held items: idle / walk / run x (3/4, side)'), ('skill_', 4, 'skilling clips x (3/4, side)')):
        cells = [cell(p, p.stem[len(prefix):]) for p in shots(phase, prefix)]
        if cells: sheet(cells, cols, '%s: %s' % (phase, title), ROOT / phase / ('%s_sheet.png' % prefix.rstrip('_')))

if __name__ == '__main__':
    main()
