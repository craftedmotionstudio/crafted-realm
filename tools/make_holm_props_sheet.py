"""Before/after sheet for one building of the props pass (2026-09-28): the Blender renders of each prop view (the model
the island loaded before | the model with its props designed again, same camera) and the game-camera captures inside
the building (before | after, tools/capture_holm_props_pass.js), one pair per row, titled, with the triangle counts of
the parts that changed (scratchpad/holm_props_pass/<id>/result.json).
Run: python tools/make_holm_props_sheet.py <id> ["Building name"]
Writes scratchpad/holm_props_pass/<id>_before_after_blender.jpg and <id>_before_after_ingame.jpg."""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / 'scratchpad' / 'holm_props_pass'
bid = sys.argv[1]
title = sys.argv[2] if len(sys.argv) > 2 else bid


def font(size):
    for name in ('arialbd.ttf', 'arial.ttf', 'DejaVuSans-Bold.ttf'):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


F1, F2 = font(26), font(17)
res = json.loads((BASE / bid / 'result.json').read_text()) if (BASE / bid / 'result.json').exists() else {}
ch = (res.get('proof') or {}).get('changed', {}); ad = (res.get('proof') or {}).get('added', {})
before_t = sum(v[0] for v in ch.values()); after_t = sum(ad.values()) + sum(v[1] or 0 for v in ch.values())
sub = 'props triangles %d -> %d | graph %s | cutaway: %s | coplanar fights %s -> %s' % (
    before_t, after_t, 'identical' if (res.get('graph') or {}).get('identical') else '?',
    ('%d pieces, none clipped' % res['cutaway']['pieces']) if res.get('cutaway') else '?',
    (res.get('coplanar') or {}).get('before', '?'), (res.get('coplanar') or {}).get('after', '?'))


def sheet(pairs, out, cell, label):
    W, H = cell
    top = 86
    im = Image.new('RGB', (W * 2 + 30, top + len(pairs) * (H + 34) + 10), (28, 26, 24))
    d = ImageDraw.Draw(im)
    d.text((12, 10), '%s - props pass, %s (before | after)' % (title, label), font=F1, fill=(240, 228, 196))
    d.text((12, 48), sub, font=F2, fill=(200, 190, 160))
    y = top
    for name, a, b in pairs:
        d.text((12, y + 6), name, font=F2, fill=(230, 214, 170))
        for k, f in enumerate((a, b)):
            if f and f.exists():
                t = Image.open(f).convert('RGB')
                if label == 'in game':
                    t = t.crop((0, 0, 1290, 700))
                t = t.resize((W, H))
                im.paste(t, (10 + k * (W + 10), y + 30))
            else:
                d.text((20 + k * (W + 10), y + 60), 'no image', font=F2, fill=(160, 80, 80))
        y += H + 34
    im.save(out, quality=86)
    return out


bl = sorted((BASE / bid / 'blender_after').glob('*.png'))
pairs = [(p.stem, BASE / bid / 'blender_before' / p.name, p) for p in bl]
o1 = sheet(pairs, BASE / (bid + '_before_after_blender.jpg'), (640, 455), 'Blender')
ig = sorted((BASE / 'ingame').glob('after_%s_*.jpg' % bid))
pairs = [(p.stem[len('after_%s_' % bid):], BASE / 'ingame' / ('before_' + p.name[len('after_'):]), p) for p in ig]
o2 = sheet(pairs, BASE / (bid + '_before_after_ingame.jpg'), (645, 350), 'in game')
print(o1, o2)
