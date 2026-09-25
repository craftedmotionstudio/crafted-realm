#!/usr/bin/env python3
"""make_combat_feel_sheets.py -- review sheets for the combat feel pass (scratchpad/holm_combat_v1).

Reads the screencast frames + frames.json timelines written by tools/capture_holm_combat_feel.js and composes labelled
frame strips keyed to real events in the timeline (attack clip start, the splat appearing, the kill), each frame
cropped around the fight (the recorded screen positions of the adventurer and the target).

Usage: python tools/make_combat_feel_sheets.py <raw_dir> <out_dir> [before_raw_dir]
With a before run (capture with BEFORE=1) it also writes before/after comparison strips: the same moments after the
attack starts, old presentation on top, new below.
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

def font(sz, bold=False):
    for n in (["arialbd.ttf"] if bold else ["arial.ttf"]):
        for p in (n, os.path.join("C:/Windows/Fonts", n)):
            try: return ImageFont.truetype(p, sz)
            except OSError: pass
    return ImageFont.load_default()

class Run:
    def __init__(self, d, label):
        self.dir = os.path.join(d, label); self.label = label
        m = json.load(open(os.path.join(self.dir, 'frames.json')))
        self.frames = [(f['i'], f['ts'] * 1000.0) for f in m['frames']]
        self.samples = m['samples']
    def frame_at(self, wall):
        return min(self.frames, key=lambda f: abs(f[1] - wall))
    def attacks(self):
        out, prev = [], None
        for s in self.samples:
            c = s.get('clip'); name = c.split('@')[0] if c else None; t = float(c.split('@')[1]) if c else 9
            if name and name != 'hit' and name != 'block' and t < 0.2 and (prev is None or prev[0] != name or prev[1] > t):
                out.append(s['wall'] - t * 1000 / (1.35 if name == 'bow' else 1.15 if name == 'cast' else 1.0))
            prev = (name, t) if name else None
        return out
    def splats(self, kind=None, on_player=False):
        out, seen = [], set()
        for s in self.samples:
            for q in s['splats']:
                if q['player'] != on_player or (kind and q['kind'] != kind): continue
                born = round(s['wall'] - q['age'] * 1000)
                if not any(abs(born - b) < 150 for b in seen):
                    seen.add(born); out.append((born, q['dmg'], q['kind']))
        return sorted(out)
    def death(self):
        for s in self.samples:
            if s['dead']: return s['wall']
        return None
    def hits(self):
        """wall times where the target's hp dropped (the logical hit), from the samples"""
        out, prev = [], None
        for s in self.samples:
            if prev is not None and s['npcHp'] < prev: out.append(s['wall'])
            prev = s['npcHp']
        return out
    def attack_with_hit(self, within=1500, skip=0):
        hs = self.hits(); a = [t for t in self.attacks() if any(0 <= h - t <= within for h in hs)]
        return a[skip] if len(a) > skip else (a[0] if a else None)
    def span(self, t0, t1, who=(0, 1)):
        pts = [s['scr'] for s in self.samples if t0 - 100 <= s['wall'] <= t1 + 100 and 'scr' in s]
        if not pts: return (769, 450, 0)
        xs = [p[k][0] for p in pts for k in who]; ys = [p[k][1] for p in pts for k in who]
        return ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2 - 50, max(xs) - min(xs))

def crop_box(c, w=700, h=470):
    # widen to cover both fighters (plus room for bars and splats), keep the aspect, stay on screen
    k = max(1.0, (c[2] + 300) / w) if len(c) > 2 else 1.0
    w, h = min(1538, int(w * k)), min(900, int(h * k))
    x0 = int(max(0, min(1538 - w, c[0] - w / 2))); y0 = int(max(0, min(900 - h, c[1] - h / 2)))
    return (x0, y0, x0 + w, y0 + h)

def strip(run, t0, offs, labels, title, note='', w=700, h=470, cols=5, who=(0, 1), dy=0):
    c = run.span(t0 + min(offs), t0 + max(offs), who)
    box = crop_box((c[0], c[1] + dy, c[2]), w, h)
    tw, th = 300, int(300 * h / w)
    rows = (len(offs) + cols - 1) // cols; pad, head, cap = 6, 48 if note else 30, 22
    im = Image.new('RGB', (cols * (tw + pad) + pad, head + rows * (th + cap + pad)), (24, 21, 17))
    dr = ImageDraw.Draw(im); dr.text((pad, 6), title, fill=(255, 210, 74), font=font(18, True))
    if note: dr.text((pad, 28), note, fill=(200, 190, 165), font=font(13))
    for k, (o, lab) in enumerate(zip(offs, labels)):
        i, ts = run.frame_at(t0 + o)
        fr = Image.open(os.path.join(run.dir, '%03d.jpg' % i)).convert('RGB').crop(box).resize((tw, th), Image.LANCZOS)
        x, y = pad + (k % cols) * (tw + pad), head + (k // cols) * (th + cap + pad)
        im.paste(fr, (x, y))
        dr.text((x + 2, y + th + 3), '%s  %+d ms' % (lab, round(ts - t0)), fill=(232, 224, 204), font=font(13))
    return im

def stack(imgs, out, gap=10):
    W = max(i.width for i in imgs); H = sum(i.height for i in imgs) + gap * (len(imgs) - 1)
    s = Image.new('RGB', (W, H), (14, 12, 10)); y = 0
    for i in imgs: s.paste(i, (0, y)); y += i.height + gap
    s.save(out); print(out, s.size)

def main():
    raw, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
    have = lambda l: os.path.exists(os.path.join(raw, l, 'frames.json'))
    MEL = [0, 120, 220, 280, 320, 380, 520, 800, 1100, 1300]
    MEL_L = ['swing starts', 'wind-up', 'strike', 'impact', 'splat pops', 'splat', 'recover', 'splat holds', 'fading', 'gone']
    # 1. melee: the three attack styles, splat on the impact frame
    parts = []
    for lab, name, note in [('melee_stab', 'Melee: stab (Accurate), bronze dagger', 'splat and flinch at the stab clip\'s impact frame (f9 = 300 ms); the logical hit landed at 0 ms'),
                            ('melee_crush', 'Melee: pound (Aggressive)', 'crush clip impact at f12 = 400 ms'),
                            ('melee_slash', 'Melee: slash (Controlled)', 'slash clip impact at f9 = 300 ms')]:
        if not have(lab): continue
        r = Run(raw, lab); a = [t for t in r.attacks() if any(0 < b - t < 700 for b, _, _ in r.splats())]
        if a: parts.append(strip(r, a[0], MEL, MEL_L, name, note))
    if parts: stack(parts, os.path.join(out, 'sheet_melee.png'))
    # 2. ranged: draw, release at the bow clip's release frame, arrow in flight, splat on arrival; the kill
    parts = []
    if have('ranged'):
        r = Run(raw, 'ranged'); sp = r.splats()
        a = [t for t in r.attacks() if any(0 < b - t < 1400 for b, _, _ in sp)]
        if a:
            b = min(b for b, _, _ in sp if b > a[0])
            parts.append(strip(r, a[0], [0, 250, 450, b - a[0] - 260, b - a[0] - 170, b - a[0] - 90, b - a[0], b - a[0] + 80, b - a[0] + 400, b - a[0] + 1000],
                               ['draw', 'drawing', 'full draw', 'release', 'in flight', 'arriving', 'impact + splat', 'puff', 'splat holds', 'fading'],
                               'Ranged: worn shortbow', 'the arrow (the Blender equipment arrow) leaves at the bow clip\'s release frame and flies a slight arc; the splat shows on arrival'))
        d = r.death()
        if d:
            k = min((b for b, _, _ in sp if b >= d - 50), default=d)
            parts.append(strip(r, k, [0, 90, 200, 400, 650, 900, 1150, 1350, 1550, 1800],
                               ['killing splat', 'topple', 'rolling', 'on its back', 'lies', 'lies', 'sinking', 'sinking', 'sunk', 'after'], 'Ranged kill'))
    if parts: stack(parts, os.path.join(out, 'sheet_ranged.png'))
    # 3. magic: cast glow, release, wind orb + trail, burst + splat; a splash; the kill
    parts = []
    if have('magic'):
        r = Run(raw, 'magic'); hits = r.splats('hit') + r.splats('max'); miss = r.splats('miss')
        for kind, sps, title in [('hit', hits, 'Magic: Wind Strike (a hit)'), ('miss', miss, 'Magic: Wind Strike splashes (a miss = blue 0)')]:
            a = [t for t in r.attacks() if any(0 < b - t < 1400 for b, _, _ in sps)]
            if not a: continue
            b = min(bb for bb, _, _ in sps if bb > a[0]); L = b - a[0]
            parts.append(strip(r, a[0], [0, 150, 300, 400, 470, L - 250, L - 120, L, L + 120, L + 300],
                               ['cast starts', 'hands glow', 'charging', 'release', 'orb leaves', 'wind orb', 'arriving', 'burst + splat' if kind == 'hit' else 'splash + 0', 'ring' if kind == 'hit' else 'puff', 'after'],
                               title, 'cast clip release f14 (410 ms at 1.15x); pale swirling orb with a comet trail; ' + ('impact ring + wisps' if kind == 'hit' else 'blue-grey splash puff + blue 0')))
        d = r.death()
        if d:
            k = min((b for b, _, _ in hits if b >= d - 50), default=d)
            parts.append(strip(r, k, [0, 90, 200, 400, 650, 900, 1150, 1350, 1550, 1800],
                               ['killing splat', 'topple', 'rolling', 'on its back', 'lies', 'lies', 'sinking', 'sinking', 'sunk', 'after'], 'Magic kill'))
    if parts: stack(parts, os.path.join(out, 'sheet_magic.png'))
    # 4. melee kill (death: waits for the splat, flips onto its back, lies, sinks)
    if have('melee_stab'):
        r = Run(raw, 'melee_stab'); d = r.death()
        if d:
            k = min((b for b, _, _ in r.splats() if b >= d - 50), default=d)
            stack([strip(r, k - 330, [0, 330, 420, 520, 640, 780, 1000, 1250, 1450, 1700],
                         ['killing swing', 'killing splat', 'topple', 'rolling', 'on its back', 'lies still', 'lies', 'sinking', 'sunk', 'respawn timer'],
                         'Death: melee kill', 'the body falls only when the killing splat shows (the kill was logged at the swing), rolls onto its back, lies ~0.4 s, then sinks away')],
                  os.path.join(out, 'sheet_death.png'))
    # 5. stacking + a hurt adventurer (presentation demos: CombatFX.hit called directly)
    parts = []
    if have('stack'):
        r = Run(raw, 'stack'); sp = r.splats()
        if sp:
            parts.append(strip(r, sp[0][0], [0, 60, 170, 330, 500, 650, 800, 1000, 1200, 1400],
                               ['1st', 'pop', '2nd (above)', '3rd (left)', '4th (right)', 'four stacked', 'oldest fading', 'fading', 'fading', 'clear'],
                               'Stacking: four hits inside 1.2 s (demo)', 'OSRS pattern: centre, above, left, right; each pops in (scale 1.45 to 1) and fades over its last 0.28 s', 560, 380, who=(1,)))
    if have('hurt'):
        r = Run(raw, 'hurt'); pl = r.splats('hit', on_player=True)   # anchor on the demo's red 3 (the grubkin keeps landing 0s)
        if pl:
            parts.append(strip(r, pl[0][0], [-150, 0, 60, 150, 300, 700, 780, 900, 1300, 2000],
                               ['before', 'hit: 3', 'pop', 'hit clip', 'bar trail', 'block: 0', 'guard', 'stacked', 'fading', 'after'],
                               'The adventurer hurt (demo)', "red splat + the kit's hit clip, the overhead bar drops with a pale trail; then a blue 0 with the block clip", 560, 380, who=(0,), dy=-70))
    if parts: stack(parts, os.path.join(out, 'sheet_stack_and_player.png'))
    if len(sys.argv) > 3: compare_all(sys.argv[3], raw, out)

def compare(before, after, label, offs, title, note, out):
    rows = []
    for tag, raw in (('BEFORE', before), ('AFTER', after)):
        if not os.path.exists(os.path.join(raw, label, 'frames.json')): return
        r = Run(raw, label); t0 = r.attack_with_hit()
        if t0 is None: return
        rows.append(strip(r, t0, offs, ['%s' % tag] * len(offs), '%s  %s' % (tag, title), note if tag == 'AFTER' else 'the game before the combat feel pass'))
    stack(rows, out)

def compare_all(before, after, out):
    compare(before, after, 'melee_stab', [0, 200, 320, 500, 900], 'melee (stab)', 'splat + flinch on the impact frame; bars; sparks; XP drops by the minimap', os.path.join(out, 'compare_melee.png'))
    compare(before, after, 'ranged', [0, 450, 650, 850, 1100], 'ranged (shortbow)', 'arrow leaves at the release frame, splat on arrival, impact puff', os.path.join(out, 'compare_ranged.png'))
    compare(before, after, 'magic', [0, 250, 450, 700, 950], 'magic (Wind Strike)', 'cast glow, release ring, wind orb + trail, burst + splat on arrival', os.path.join(out, 'compare_magic.png'))

if __name__ == '__main__':
    main()
