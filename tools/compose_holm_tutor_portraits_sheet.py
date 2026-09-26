"""Contact sheet for the tutor chat-box portraits: the shipped set (assets/icons/tutors/<id>.png) next to a candidate set
(<cand>/portraits/<id>.png) at 2x, plus the candidate's 288 px review renders (same framing). Read-only on assets/.

  python tools/compose_holm_tutor_portraits_sheet.py <cand_dir> <review_dir> <out.png> [label]
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont

LIVE = r"C:\Users\iQwaZ\OneDrive\Desktop\CraftedRealms-Claude"
IDS = ['bram', 'wenna', 'hettie', 'ansel', 'durgin', 'corrick', 'maud', 'ilse', 'aldous', 'tobin']
NAMES = {'bram': 'Guide Bram', 'wenna': 'Wenna', 'hettie': 'Cook Hettie', 'ansel': 'Loremaster Ansel', 'durgin': 'Foreman Durgin',
         'corrick': 'Warden Corrick', 'maud': 'Teller Maud', 'ilse': 'Magister Ilse', 'aldous': 'Keeper Aldous', 'tobin': 'Ferryman Tobin'}
BG, PANEL = (38, 34, 30), (84, 72, 56)   # page / the dialogue box colour


def font(sz):
    for f in ('arial.ttf', 'segoeui.ttf', 'DejaVuSans.ttf'):
        try:
            return ImageFont.truetype(f, sz)
        except Exception:
            pass
    return ImageFont.load_default()


def on(bg, im, size):
    im = im.convert('RGBA').resize(size, Image.NEAREST if size[0] <= 192 else Image.LANCZOS)
    base = Image.new('RGBA', size, bg + (255,))
    return Image.alpha_composite(base, im).convert('RGB')


def main(cand, review, out, label='v3.0'):
    cell, big, gap, pad = 192, 288, 10, 12
    W = pad * 2 + len(IDS) * (big + gap)
    H = 48 + (cell + 34) * 2 + big + 60
    page = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(page)
    d.text((pad, 10), 'Tutor chat-box portraits %s -- 96x96 RGBA, transparent. Row 1: shipped (assets/icons/tutors) at 2x; row 2: %s at 2x on the '
                      'dialogue colour; row 3: %s 288 px review renders, same framing' % (label, label, label), fill=(240, 220, 150), font=font(18))
    y = 48
    for row, src in (('shipped: assets/icons/tutors/<id>.png', lambda i: os.path.join(LIVE, 'assets', 'icons', 'tutors', i + '.png')),
                     ('%s: %s/portraits/<id>.png' % (label, os.path.relpath(cand, LIVE).replace('\\', '/')), lambda i: os.path.join(cand, 'portraits', i + '.png'))):
        d.text((pad, y), row, fill=(220, 220, 220), font=font(14))
        for k, tid in enumerate(IDS):
            p = src(tid)
            if os.path.exists(p):
                page.paste(on(PANEL, Image.open(p), (cell, cell)), (pad + k * (big + gap), y + 20))
        y += cell + 34
    for k, tid in enumerate(IDS):
        p = os.path.join(review, tid + '_288.png')
        if os.path.exists(p):
            page.paste(on((136, 136, 132), Image.open(p), (big, big)), (pad + k * (big + gap), y))
        d.text((pad + k * (big + gap), y + big + 4), NAMES[tid], fill=(230, 230, 230), font=font(15))
    page.save(out)
    print('[PORTRAITS SHEET]', out)


if __name__ == '__main__':
    main(*sys.argv[1:5])
