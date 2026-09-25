"""build_ui_textures_v3.py -- small hand-tuned pixel textures and frame sprites for the old-school interface chrome.

Every tile is painted pixel by pixel from a tiny palette (no gradients, no blur), seeded so it is reproducible, and
wraps seamlessly. Outputs assets/ui/tex/*.png:
  stone.png        light dressed-stone blocks (buttons, tabs, plaques)
  stone_dark.png   darker weathered blocks (panel + chat frames, the rail)
  stone_red.png    red-stained blocks (the selected tab / style / toggle)
  stone_lit.png    lighter blocks (hover)
  slate.png        the dark recessed panel floor (side-panel pane)
  slate_dark.png   deeper slate (plaques, number wells)
  parch.png        chat / dialogue parchment
  wood.png         planks (creator, misc)
  frame_stone.png  9-slice frame: 6 px bevelled stone border with iron corner studs (border-image)
  frame_inset.png  9-slice 3 px sunken border (wells, lists)
  btn.png / btn_on.png / btn_hover.png   9-slice stone button faces (normal / selected red / hover)
  frame_parch.png  9-slice torn parchment edge (quest scroll)   tick.png  the green check for pixel checkboxes
Run: python tools/build_ui_textures_v3.py   (writes a preview to scratchpad/holm_ui_v3/textures.png)
"""
import random
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/ui/tex'; OUT.mkdir(parents=True, exist_ok=True)

def img(w, h, c=(0, 0, 0, 0)): return Image.new('RGBA', (w, h), c)
def sh(c, k): return tuple(max(0, min(255, int(v + k))) for v in c[:3]) + (255,)

def blocks(w, h, base, seed, mortar, rows=(9, 12), cols=(12, 22), tones=(-10, -4, 0, 5, 9), speck=.06, hi=14, lo=-18):
    """irregular coursed stone: every block a flat tone with a 1 px lit top/left edge, 1 px shaded bottom/right edge,
    1 px mortar, and a few single-pixel pits and glints. Courses wrap horizontally and fill the height exactly."""
    r = random.Random(seed); im = img(w, h, mortar + (255,)); px = im.load()
    heights = []
    while sum(heights) < h:
        heights.append(r.randint(*rows))
    heights[-1] -= sum(heights) - h
    if heights[-1] < 5: heights[-2] += heights[-1]; heights.pop()
    y = 0
    for ch in heights:
        x = -r.randint(0, cols[1]); starts = []
        while x < w:
            bw = r.randint(*cols); starts.append((x, bw)); x += bw
        # close the course so the last block wraps into the first
        for bx, bw in starts:
            t = r.choice(tones); col = sh(base, t)
            for yy in range(y, y + ch - 1):
                for xx in range(bx, bx + bw - 1):
                    X = xx % w
                    edge_top = yy == y; edge_left = xx == bx; edge_bot = yy == y + ch - 2; edge_right = xx == bx + bw - 2
                    c = col
                    if edge_top or edge_left: c = sh(col, hi)
                    if edge_bot or edge_right: c = sh(col, lo)
                    if (edge_top and edge_right) or (edge_bot and edge_left): c = col
                    px[X, yy] = c
            # pits and glints
            for _ in range(int(bw * ch * speck)):
                xx = (bx + 1 + r.randint(0, max(0, bw - 4))) % w; yy = y + 1 + r.randint(0, max(0, ch - 4))
                px[xx, yy] = sh(col, r.choice((-16, -12, 10)))
            if r.random() < .3:   # a chip
                xx = (bx + 2 + r.randint(0, max(0, bw - 6))) % w; yy = y + 2 + r.randint(0, max(0, ch - 5))
                px[xx, yy] = sh(col, -22); px[(xx + 1) % w, yy] = sh(col, -14); px[xx, yy + 1] = sh(col, 8)
        y += ch
    return im

def speckle(w, h, base, seed, n, tones, clumps=0):
    r = random.Random(seed); im = img(w, h, tuple(base) + (255,)); px = im.load()
    for _ in range(n):
        x, y = r.randrange(w), r.randrange(h); px[x, y] = sh(base, r.choice(tones))
    for _ in range(clumps):
        x, y = r.randrange(w), r.randrange(h); t = r.choice(tones)
        for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1), (2, 0), (-1, 1)):
            if r.random() < .75: px[(x + dx) % w, (y + dy) % h] = sh(base, t)
    return im

def parchment(w, h, seed):
    r = random.Random(seed); base = (214, 200, 164); im = img(w, h, base + (255,)); px = im.load()
    for _ in range(26):   # faint blotches (hard-edged pixel clusters, two tones)
        cx, cy, rad = r.randrange(w), r.randrange(h), r.randint(3, 8); t = r.choice((-7, -5, 5))
        for dy in range(-rad, rad + 1):
            for dx in range(-rad, rad + 1):
                if dx * dx + dy * dy * 2 <= rad * rad and r.random() < .55: px[(cx + dx) % w, (cy + dy) % h] = sh(base, t)
    for _ in range(40):   # fibres
        x, y = r.randrange(w), r.randrange(h); L = r.randint(2, 5)
        for k in range(L): px[(x + k) % w, y] = sh(base, -12)
    for _ in range(90):
        x, y = r.randrange(w), r.randrange(h); px[x, y] = sh(base, r.choice((-16, 8)))
    return im

def planks(w, h, seed):
    r = random.Random(seed); base = (104, 72, 40); im = img(w, h, base + (255,)); px = im.load()
    ph = 8
    for y0 in range(0, h, ph):
        t = r.choice((-8, -3, 0, 4)); off = r.randrange(w)
        for y in range(y0, y0 + ph):
            for x in range(w):
                c = sh(base, t)
                if y == y0: c = sh(base, t + 16)
                if y == y0 + ph - 1: c = (38, 24, 12, 255)
                px[x, y] = c
        for _ in range(8):   # grain streaks
            x, y = r.randrange(w), r.randint(y0 + 1, y0 + ph - 2); L = r.randint(4, 12)
            for k in range(L): px[(x + k) % w, y] = sh(base, t - 12)
        x = (off + r.randint(10, 40)) % w          # plank joint
        for y in range(y0, y0 + ph - 1): px[x, y] = (38, 24, 12, 255)
        kx, ky = r.randrange(w), y0 + 3                # knot
        px[kx, ky] = sh(base, -30); px[(kx + 1) % w, ky] = sh(base, -22)
    return im

def frame(size, border, stone, seed, studs=True):
    """9-slice frame: a bevelled stone border (outer ink line, light top/left bevel, dark bottom/right bevel) whose
    interior is transparent; iron studs sit in the corners."""
    r = random.Random(seed); im = img(size, size); px = im.load(); ink = (13, 11, 8, 255)
    tex = blocks(size, size, stone, seed, (40, 35, 28), rows=(5, 7), cols=(6, 11), hi=12, lo=-14, speck=.04).load()
    for y in range(size):
        for x in range(size):
            d = min(x, y, size - 1 - x, size - 1 - y)
            if d >= border: continue
            if d == 0: px[x, y] = ink; continue
            if d == border - 1: px[x, y] = ink; continue
            c = tex[x, y]
            if d == 1 and (x < size - 2 and y < size - 2) and (x == 1 or y == 1): c = sh(c, 26)
            if d == 1 and (x == size - 2 or y == size - 2): c = sh(c, -26)
            if d == border - 2 and (x == size - 1 - (border - 2) or y == size - 1 - (border - 2)): c = sh(c, 18)
            if d == border - 2 and (x == border - 2 or y == border - 2): c = sh(c, -22)
            px[x, y] = c
    if studs:
        for cx, cy in ((2, 2), (size - 5, 2), (2, size - 5), (size - 5, size - 5)):
            for dy in range(3):
                for dx in range(3):
                    v = (150, 146, 138) if (dx, dy) == (0, 0) else (96, 92, 86) if dx + dy < 3 else (46, 44, 40)
                    px[cx + dx, cy + dy] = v + (255,)
    return im

def inset(size, border):
    im = img(size, size); px = im.load()
    for y in range(size):
        for x in range(size):
            d = min(x, y, size - 1 - x, size - 1 - y)
            if d >= border: continue
            if d == 0: px[x, y] = (13, 11, 8, 255)
            elif x == d or y == d: px[x, y] = (26, 22, 17, 255)              # shaded top/left (sunken)
            else: px[x, y] = (104, 96, 80, 255)                               # lit bottom/right lip
    return im

def button(size, base, seed, border=3):
    """a stone button face: dressed stone, 1 px ink edge, 1 px lit top/left, 1 px dark bottom/right"""
    b = blocks(size, size, base, seed, sh(base, -40)[:3], rows=(6, 8), cols=(8, 14), tones=(-5, 0, 4), hi=8, lo=-10, speck=.05)
    px = b.load(); ink = (13, 11, 8, 255)
    for y in range(size):
        for x in range(size):
            d = min(x, y, size - 1 - x, size - 1 - y)
            if d == 0: px[x, y] = ink
            elif d == 1:
                if x == 1 or y == 1: px[x, y] = sh(px[x, y], 34) if not (x == size - 2 or y == size - 2) else px[x, y]
                if x == size - 2 or y == size - 2: px[x, y] = sh(px[x, y], -30)
    return b


def frame_parch(size=30, border=10, seed=41):
    """9-slice torn parchment edge (the quest scroll): ragged transparent outer edge, a brown singed band, parchment inside"""
    r = random.Random(seed); base = parchment(size, size, seed).load(); im = img(size, size); px = im.load()
    rag = [[r.randint(0, 3) for _ in range(size)] for _ in range(4)]      # per-side ragged depth
    for y in range(size):
        for x in range(size):
            ds = [(y, rag[0][x]), (size - 1 - y, rag[1][x]), (x, rag[2][y]), (size - 1 - x, rag[3][y])]
            d = min(v - t for v, t in ds)
            if d < 0: continue
            c = base[x, y]
            if d == 0: c = (70, 48, 22, 255)
            elif d == 1: c = (122, 90, 48, 255)
            elif d == 2: c = sh(c, -34)
            elif d == 3 and r.random() < .5: c = sh(c, -18)
            px[x, y] = c
    return im

def tick(n=11):
    im = img(n, n); px = im.load()
    pts = [(1, 5), (2, 6), (3, 7), (4, 8), (5, 7), (6, 6), (7, 5), (8, 4), (9, 3), (9, 2)]
    for x, y in pts:
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            X, Y = x + dx, y + dy
            if 0 <= X < n and 0 <= Y < n and px[X, Y][3] == 0: px[X, Y] = (13, 11, 8, 255)
    for x, y in pts:
        px[x, y] = (60, 220, 40, 255)
        if y + 1 < n: px[x, y + 1] = (30, 150, 20, 255)
    return im


def torch_shaft(w=8, h=12):
    """twisted iron rod tile (repeats vertically): diagonal light / mid / dark bands between ink edges"""
    im = img(w, h); px = im.load(); cols = ((122, 112, 98), (92, 84, 74), (64, 58, 51), (46, 41, 36), (36, 32, 28), (58, 52, 46))
    for y in range(h):
        for x in range(w):
            if x in (0, w - 1): px[x, y] = (13, 11, 8, 255); continue
            px[x, y] = cols[(y + x) % 6] + (255,)
    return im

T = {}
T['stone.png'] = blocks(64, 64, (96, 88, 74), 7, (76, 69, 57), rows=(10, 14), cols=(14, 26), tones=(-4, -2, 0, 2, 4), speck=.07, hi=7, lo=-8)
T['stone_dark.png'] = blocks(64, 64, (70, 63, 52), 19, (40, 35, 28), rows=(10, 14), cols=(14, 26), tones=(-6, -3, 0, 3, 5), hi=10, lo=-12)
T['stone_red.png'] = blocks(64, 64, (112, 38, 25), 7, (92, 28, 18), rows=(10, 14), cols=(14, 26), tones=(-3, -1, 0, 2, 3), speck=.07, hi=9, lo=-9)
T['stone_lit.png'] = blocks(64, 64, (114, 105, 88), 7, (92, 84, 70), rows=(10, 14), cols=(14, 26), tones=(-4, -2, 0, 2, 4), speck=.07, hi=7, lo=-8)
T['slate.png'] = speckle(64, 64, (62, 54, 43), 3, 170, (-7, -4, 5), clumps=10)
T['slate_dark.png'] = speckle(64, 64, (40, 34, 26), 11, 120, (-5, 5), clumps=6)
T['parch.png'] = parchment(64, 64, 5)
T['wood.png'] = planks(64, 32, 9)
T['frame_stone.png'] = frame(24, 7, (86, 78, 64), 21)
T['frame_thin.png'] = frame(12, 4, (86, 78, 64), 22, studs=False)
T['frame_inset.png'] = inset(8, 2)
T['frame_parch.png'] = frame_parch()
T['tick.png'] = tick()
T['torch_shaft.png'] = torch_shaft()
T['btn.png'] = button(24, (92, 84, 70), 31)
T['btn_hover.png'] = button(24, (112, 103, 86), 31)
T['btn_on.png'] = button(24, (122, 38, 24), 31)
T['btn_off.png'] = button(24, (64, 58, 48), 31)
for n, im in T.items(): im.save(OUT / n)
# preview
prev = img(64 * 4 * 2 + 40, 64 * 2 * 2 + 20, (30, 26, 20, 255)); x = 4; y = 4
for n, im in T.items():
    big = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
    if x + big.width > prev.width: x = 4; y += 132
    prev.alpha_composite(big, (x, y)); x += big.width + 6
p = ROOT / 'scratchpad/holm_ui_v3'; p.mkdir(parents=True, exist_ok=True); prev.save(p / 'textures.png'); print('textures ->', OUT, list(T))
