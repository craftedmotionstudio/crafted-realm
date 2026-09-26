"""build_pixel_font.py -- "Realm Small": Crafted Realm's own bitmap-look interface font (original pixel glyphs drawn here).

Why our own: the interface wants a 2004-style small game font bundled locally (no runtime font fetch). Rather than ship a
third-party font, every glyph below is hand-placed on a 12 px em (8 px caps, 6 px x-height, 3 px descenders, 1 px strokes)
and compiled to TrueType with fontTools. A bold cut is derived by doubling every stem one pixel to the right.
Use at font-size 12px (or 24px) so one glyph pixel lands on one screen pixel.
Outputs: assets/fonts/realm_small.ttf, assets/fonts/realm_small_bold.ttf, scratchpad/holm_ui_v3/font_specimen.png
Run: python tools/build_pixel_font.py
"""
from pathlib import Path
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/fonts'; OUT.mkdir(parents=True, exist_ok=True)
PX = 100                     # font units per pixel
UPM, ASC, DESC = 1200, 900, 300

# Each glyph: rows from the cap line (y = 7) downward; rows beyond 8 go below the baseline (y = -1, -2, -3).
# Short lists are aligned to the baseline by the 'top' marker: 'c' = starts at the cap line, 'x' = at the x-height (y = 5).
G = {}
def g(ch, top, *rows): G[ch] = (top, rows)

g('A', 'c', '.###.', '#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#')
g('B', 'c', '####.', '#...#', '#...#', '####.', '#...#', '#...#', '#...#', '####.')
g('C', 'c', '.###.', '#...#', '#....', '#....', '#....', '#....', '#...#', '.###.')
g('D', 'c', '####.', '#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '####.')
g('E', 'c', '#####', '#....', '#....', '####.', '#....', '#....', '#....', '#####')
g('F', 'c', '#####', '#....', '#....', '####.', '#....', '#....', '#....', '#....')
g('G', 'c', '.###.', '#...#', '#....', '#....', '#.###', '#...#', '#...#', '.###.')
g('H', 'c', '#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#', '#...#')
g('I', 'c', '###', '.#.', '.#.', '.#.', '.#.', '.#.', '.#.', '###')
g('J', 'c', '.###', '...#', '...#', '...#', '...#', '#..#', '#..#', '.##.')
g('K', 'c', '#...#', '#..#.', '#.#..', '##...', '##...', '#.#..', '#..#.', '#...#')
g('L', 'c', '#...', '#...', '#...', '#...', '#...', '#...', '#...', '####')
g('M', 'c', '#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#', '#...#')
g('N', 'c', '#...#', '##..#', '##..#', '#.#.#', '#.#.#', '#..##', '#..##', '#...#')
g('O', 'c', '.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.')
g('P', 'c', '####.', '#...#', '#...#', '#...#', '####.', '#....', '#....', '#....')
g('Q', 'c', '.###.', '#...#', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#')
g('R', 'c', '####.', '#...#', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#')
g('S', 'c', '.###.', '#...#', '#....', '.##..', '...#.', '....#', '#...#', '.###.')
g('T', 'c', '#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..')
g('U', 'c', '#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.')
g('V', 'c', '#...#', '#...#', '#...#', '#...#', '.#.#.', '.#.#.', '.#.#.', '..#..')
g('W', 'c', '#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '##.##', '#...#')
g('X', 'c', '#...#', '#...#', '.#.#.', '..#..', '..#..', '.#.#.', '#...#', '#...#')
g('Y', 'c', '#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..', '..#..')
g('Z', 'c', '#####', '....#', '...#.', '..#..', '.#...', '#....', '#....', '#####')

g('a', 'x', '.###.', '....#', '.####', '#...#', '#...#', '.####')
g('b', 'c', '#....', '#....', '####.', '#...#', '#...#', '#...#', '#...#', '####.')
g('c', 'x', '.###', '#...', '#...', '#...', '#...', '.###')
g('d', 'c', '....#', '....#', '.####', '#...#', '#...#', '#...#', '#...#', '.####')
g('e', 'x', '.###.', '#...#', '#####', '#....', '#....', '.###.')
g('f', 'c', '..##', '.#..', '####', '.#..', '.#..', '.#..', '.#..', '.#..')
g('g', 'x', '.####', '#...#', '#...#', '#...#', '#...#', '.####', '....#', '#...#', '.###.')
g('h', 'c', '#....', '#....', '####.', '#...#', '#...#', '#...#', '#...#', '#...#')
g('i', 'c', '#', '.', '#', '#', '#', '#', '#', '#')
g('j', 'c', '..#', '...', '..#', '..#', '..#', '..#', '..#', '..#', '..#', '#.#', '.#.')
g('k', 'c', '#...', '#...', '#..#', '#.#.', '##..', '##..', '#.#.', '#..#')
g('l', 'c', '#.', '#.', '#.', '#.', '#.', '#.', '#.', '.#')
g('m', 'x', '###.##.', '#..#..#', '#..#..#', '#..#..#', '#..#..#', '#..#..#')
g('n', 'x', '####.', '#...#', '#...#', '#...#', '#...#', '#...#')
g('o', 'x', '.###.', '#...#', '#...#', '#...#', '#...#', '.###.')
g('p', 'x', '####.', '#...#', '#...#', '#...#', '#...#', '####.', '#....', '#....', '#....')
g('q', 'x', '.####', '#...#', '#...#', '#...#', '#...#', '.####', '....#', '....#', '....#')
g('r', 'x', '#.##', '##..', '#...', '#...', '#...', '#...')
g('s', 'x', '.###', '#...', '.##.', '...#', '...#', '###.')
g('t', 'c', '...', '.#.', '###', '.#.', '.#.', '.#.', '.#.', '..#')
g('u', 'x', '#...#', '#...#', '#...#', '#...#', '#...#', '.####')
g('v', 'x', '#...#', '#...#', '#...#', '.#.#.', '.#.#.', '..#..')
g('w', 'x', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.')
g('x', 'x', '#...#', '.#.#.', '..#..', '..#..', '.#.#.', '#...#')
g('y', 'x', '#...#', '#...#', '#...#', '#...#', '#...#', '.####', '....#', '#...#', '.###.')
g('z', 'x', '#####', '...#.', '..#..', '.#...', '#....', '#####')

g('0', 'c', '.###.', '#...#', '#..##', '#.#.#', '#.#.#', '##..#', '#...#', '.###.')
g('1', 'c', '.#.', '##.', '.#.', '.#.', '.#.', '.#.', '.#.', '###')
g('2', 'c', '.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#....', '#####')
g('3', 'c', '.###.', '#...#', '....#', '..##.', '....#', '....#', '#...#', '.###.')
g('4', 'c', '...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.', '...#.')
g('5', 'c', '#####', '#....', '#....', '####.', '....#', '....#', '#...#', '.###.')
g('6', 'c', '.###.', '#....', '#....', '####.', '#...#', '#...#', '#...#', '.###.')
g('7', 'c', '#####', '....#', '...#.', '...#.', '..#..', '..#..', '.#...', '.#...')
g('8', 'c', '.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '#...#', '.###.')
g('9', 'c', '.###.', '#...#', '#...#', '#...#', '.####', '....#', '....#', '.###.')

g('.', 'c', '.', '.', '.', '.', '.', '.', '.', '#')
g(',', 'c', '..', '..', '..', '..', '..', '..', '..', '.#', '#.')
g(':', 'x', '.', '#', '.', '.', '.', '#')
g(';', 'x', '..', '.#', '..', '..', '..', '.#', '#.')
g('!', 'c', '#', '#', '#', '#', '#', '#', '.', '#')
g('?', 'c', '.###.', '#...#', '....#', '...#.', '..#..', '..#..', '.....', '..#..')
g("'", 'c', '#', '#')
g('"', 'c', '#.#', '#.#')
g('’', 'c', '.#', '.#', '#.')
g('‘', 'c', '.#', '#.', '#.')
g('“', 'c', '.#.#', '#.#.', '#.#.')
g('”', 'c', '.#.#', '.#.#', '#.#.')
g('`', 'c', '#.', '.#')
g('-', 'x', '...', '...', '###')
g('–', 'x', '....', '....', '####')
g('—', 'x', '.......', '.......', '#######')
g('_', 'c', '.....', '.....', '.....', '.....', '.....', '.....', '.....', '.....', '#####')
g('(', 'c', '.#', '#.', '#.', '#.', '#.', '#.', '#.', '#.', '.#')
g(')', 'c', '#.', '.#', '.#', '.#', '.#', '.#', '.#', '.#', '#.')
g('[', 'c', '##', '#.', '#.', '#.', '#.', '#.', '#.', '#.', '##')
g(']', 'c', '##', '.#', '.#', '.#', '.#', '.#', '.#', '.#', '##')
g('{', 'c', '.##', '.#.', '.#.', '#..', '.#.', '.#.', '.#.', '.#.', '.##')
g('}', 'c', '##.', '.#.', '.#.', '..#', '.#.', '.#.', '.#.', '.#.', '##.')
g('/', 'c', '...#', '...#', '..#.', '..#.', '.#..', '.#..', '#...', '#...')
g('\\', 'c', '#...', '#...', '.#..', '.#..', '..#.', '..#.', '...#', '...#')
g('|', 'c', '#', '#', '#', '#', '#', '#', '#', '#', '#')
g('+', 'x', '..#..', '..#..', '#####', '..#..', '..#..')
g('=', 'x', '....', '####', '....', '####')
g('*', 'c', '.....', '..#..', '#.#.#', '.###.', '#.#.#', '..#..')
g('#', 'c', '.....', '.#.#.', '#####', '.#.#.', '.#.#.', '#####', '.#.#.')
g('%', 'c', '.....', '##..#', '##..#', '...#.', '..#..', '.#...', '#..##', '#..##')
g('&', 'c', '.##..', '#..#.', '#..#.', '.##..', '#.#.#', '#..#.', '#..#.', '.##.#')
g('@', 'c', '.###.', '#...#', '#.###', '#.#.#', '#.###', '#....', '#...#', '.###.')
g('$', 'c', '..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..', '.....')
g('^', 'c', '.#.', '#.#')
g('~', 'x', '.....', '.#..#', '#.##.')
g('<', 'c', '....', '...#', '..#.', '.#..', '#...', '.#..', '..#.', '...#')
g('>', 'c', '....', '#...', '.#..', '..#.', '...#', '..#.', '.#..', '#...')
g('·', 'x', '.', '.', '#')
g('•', 'x', '...', '.#.', '###', '.#.')
g('…', 'c', '.....', '.....', '.....', '.....', '.....', '.....', '.....', '#.#.#')
g('×', 'x', '#...#', '.#.#.', '..#..', '.#.#.', '#...#')
g('é', 'c', '...#.', '..#..', '.###.', '#...#', '#####', '#....', '#....', '.###.')
g('è', 'c', '.#...', '..#..', '.###.', '#...#', '#####', '#....', '#....', '.###.')
g(' ', 'c', '..')
g('▶', 'c', '.....', '#....', '##...', '###..', '####.', '###..', '##...', '#....')
g('●', 'x', '.###.', '#####', '#####', '#####', '.###.')
g('○', 'x', '.###.', '#...#', '#...#', '#...#', '.###.')
SPACE_ADV = 3

def bitmap(ch, bold):
    top, rows = G[ch]
    y0 = 7 if top == 'c' else 5
    w = max(len(r) for r in rows)
    px = set()
    for i, r in enumerate(rows):
        for x, c in enumerate(r.ljust(w, '.')):
            if c == '#': px.add((x, y0 - i))
    if bold:
        px |= {(x + 1, y) for x, y in px}; w += 1
    return px, w

def draw(px):
    pen = TTGlyphPen(None)
    # merge each row into horizontal runs, then stack identical runs vertically into rectangles
    runs = {}
    for y in sorted({p[1] for p in px}):
        xs = sorted(x for x, yy in px if yy == y); start = None
        for i, x in enumerate(xs):
            if start is None: start = x
            if i == len(xs) - 1 or xs[i + 1] != x + 1:
                runs.setdefault((start, x), []).append(y); start = None
    for (x0, x1), ys in runs.items():
        ys.sort(); k = 0
        while k < len(ys):
            j = k
            while j + 1 < len(ys) and ys[j + 1] == ys[j] + 1: j += 1
            a, b = ys[k], ys[j] + 1        # rows a .. b (pixel y is its bottom edge)
            X0, X1, Y0, Y1 = x0 * PX, (x1 + 1) * PX, a * PX, b * PX
            pen.moveTo((X0, Y0)); pen.lineTo((X0, Y1)); pen.lineTo((X1, Y1)); pen.lineTo((X1, Y0)); pen.closePath()   # clockwise = filled (TrueType)
            k = j + 1
    return pen.glyph()

def build(bold):
    name = 'Realm Small Bold' if bold else 'Realm Small'
    order = ['.notdef', 'space']; cmap = {32: 'space'}; glyphs = {}; metrics = {}
    empty = TTGlyphPen(None); glyphs['.notdef'] = empty.glyph(); metrics['.notdef'] = (5 * PX, 0)
    glyphs['space'] = TTGlyphPen(None).glyph(); metrics['space'] = ((SPACE_ADV + (1 if bold else 0)) * PX, 0)
    for ch in G:
        gn = 'uni%04X' % ord(ch)
        px, w = bitmap(ch, bold)
        glyphs[gn] = draw(px) if px else TTGlyphPen(None).glyph()
        metrics[gn] = ((w + 1) * PX, 0)
        order.append(gn); cmap[ord(ch)] = gn
    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(order); fb.setupCharacterMap(cmap); fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=ASC, descent=-DESC)
    fam = 'Realm Small'
    fb.setupNameTable({'familyName': fam, 'styleName': 'Bold' if bold else 'Regular', 'uniqueFontIdentifier': name.replace(' ', '') + '-2026',
                       'fullName': name, 'psName': name.replace(' ', '') + ('' if bold else '-Regular'), 'version': 'Version 1.000',
                       'copyright': 'Copyright 2026 Crafted Motion. Original glyphs drawn for Crafted Realm.',
                       'licenseDescription': 'Original work for Crafted Realm; see assets/fonts/LICENSE.txt'})
    fb.setupOS2(sTypoAscender=ASC, sTypoDescender=-DESC, sTypoLineGap=0, usWinAscent=ASC, usWinDescent=DESC,
                usWeightClass=700 if bold else 400, fsSelection=0x20 if bold else 0x40, achVendID='CRFT')
    fb.setupPost(); fb.setupHead(unitsPerEm=UPM, macStyle=1 if bold else 0)
    out = OUT / ('realm_small_bold.ttf' if bold else 'realm_small.ttf'); fb.save(str(out)); print('font ->', out, len(order), 'glyphs')
    return out

r = build(False); b = build(True)

# specimen (rendered with PIL at 1:1 and 2x) for review
try:
    from PIL import Image, ImageDraw, ImageFont
    lines = ['Unarmed  Combat Lvl: 18  Auto Retaliate (On)', 'The quick brown fox jumps over the lazy dog.', 'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG',
             '0123456789  !?.,;:\'"()[]{}<>/\\|+-=*#%&@$^~_  ’‘“” – — · … ×',
             'Guide Bram: Welcome to the Holm, adventurer. Take your time.', 'You gain 25 Attack XP. Total level: 748']
    fr = ImageFont.truetype(str(r), 12); fbd = ImageFont.truetype(str(b), 12)
    im = Image.new('RGB', (560, 18 * len(lines) * 2 + 20), (62, 53, 41)); d = ImageDraw.Draw(im)
    y = 6
    for f, col in ((fr, (255, 152, 31)), (fbd, (255, 255, 0))):
        for ln in lines:
            d.text((7, y + 1), ln, font=f, fill=(0, 0, 0)); d.text((6, y), ln, font=f, fill=col); y += 17
    im = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
    sp = ROOT / 'scratchpad/holm_ui_v3'; sp.mkdir(parents=True, exist_ok=True); im.save(sp / 'font_specimen.png'); print('specimen ->', sp / 'font_specimen.png')
except Exception as e:
    print('specimen skipped', e)
