"""Scarlands bestiary review sheets (W2/W3, 2026-09-26) from tools/capture_scarlands_bestiary.js captures.

  python tools/make_scarlands_bestiary_sheets.py <tag> [<tag_before>]

Per creature: <tag>_<id>.png = the turnaround (front, 3/4, side, back) and every clip as a strip, event frames marked.
Plus <tag>_lineup.png (the size lineup, front 3/4 and side). With <tag_before>: <tag>_vs_<before>.png puts both
passes' turnarounds and lineups side by side. Output: scratchpad/scarlands_bestiary_v1/sheets/.
"""
import sys, os, json
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'scratchpad', 'scarlands_bestiary_v1')
BG, INK, DIM, EV = (30, 27, 24), (239, 227, 196), (150, 140, 120), (255, 150, 60)


def font(sz, bold=False):
    for f in (('arialbd.ttf',) if bold else ()) + ('arial.ttf', 'segoeui.ttf', 'DejaVuSans.ttf'):
        try:
            return ImageFont.truetype(f, sz)
        except Exception:
            pass
    return ImageFont.load_default()


def tile(path, w, h):
    im = Image.open(path).convert('RGB')
    s = min(im.width / w, im.height / h)            # centre crop to the tile aspect
    cw, ch = int(w * s), int(h * s)
    x0, y0 = (im.width - cw) // 2, (im.height - ch) // 2
    return im.crop((x0, y0, x0 + cw, y0 + ch)).resize((w, h), Image.LANCZOS)


def creature_sheet(tag, cid, rec, man):
    d = os.path.join(ROOT, tag)
    TW, TH, SW, SH, PAD = 300, 300, 176, 176, 10
    rows = list(rec['clips'].items())
    ncol = max(len(r['shots']) for _, r in rows)
    W = max(4 * (TW + PAD), 130 + ncol * (SW + PAD)) + PAD
    H = 64 + TH + 40 + len(rows) * (SH + 34) + PAD
    sheet = Image.new('RGB', (W, H), BG)
    g = ImageDraw.Draw(sheet)
    c = next(x for x in man['creatures'] if x['id'] == cid)
    st, mo = c['stats'], c['model']
    g.text((PAD, 8), '%s  (%s)  -  %s' % (c['name'], cid, tag), font=font(22, True), fill=INK)
    g.text((PAD, 36), 'lvl %d  hp %d  %s max %d  every %.1f s  |  %d tris  %.2f m tall%s  |  %s' % (
        st['level'], st['hitpoints'], st['attackStyle'], st['maxHit'], st['attackSpeedSeconds'], mo['triangles'], mo['height_m'],
        ('  %.2f m long' % mo['length_m']) if mo.get('length_m') else '', mo['rig'][:60]), font=font(14), fill=DIM)
    y = 64
    for i, t in enumerate(rec['turn']):
        sheet.paste(tile(os.path.join(d, t['file']), TW, TH), (PAD + i * (TW + PAD), y))
        g.text((PAD + i * (TW + PAD) + 6, y + 4), t['label'].replace('_', ' '), font=font(14, True), fill=INK)
    y += TH + 12
    g.text((PAD, y), 'clips (30 fps, 3/4 view; orange = event frame)', font=font(15, True), fill=INK)
    y += 28
    for name, r in rows:
        ev = r.get('events', {})
        g.text((PAD, y + 4), name, font=font(16, True), fill=INK)
        g.text((PAD, y + 26), '%d f%s' % (r['frames'], ''.join('\n%s %d' % (k, v) for k, v in ev.items())), font=font(12), fill=DIM)
        for j, s in enumerate(r['shots']):
            x = 130 + j * (SW + PAD)
            sheet.paste(tile(os.path.join(d, s['file']), SW, SH), (x, y))
            hit = [k for k, v in ev.items() if v == s['frame']]
            if hit:
                g.rectangle((x - 2, y - 2, x + SW + 1, y + SH + 1), outline=EV, width=3)
            g.text((x + 4, y + SH + 2), 'f%d%s' % (s['frame'], (' ' + '/'.join(hit).upper()) if hit else ''), font=font(12, bool(hit)), fill=EV if hit else DIM)
        y += SH + 34
    out = os.path.join(ROOT, 'sheets', '%s_%s.png' % (tag, cid))
    sheet.save(out)
    return out


def lineup_sheet(tag, shots):
    d = os.path.join(ROOT, tag)
    ims = [Image.open(os.path.join(d, f)).convert('RGB') for f in shots['lineup']['files']]
    W = max(i.width for i in ims)
    sheet = Image.new('RGB', (W, 40 + sum(i.height + 8 for i in ims)), BG)
    g = ImageDraw.Draw(sheet)
    g.text((10, 8), 'Scarlands bestiary size lineup (%s): 1 grid square = 1 tile = 1 m; left = a player-sized kit human; bottom = at the game camera distance' % tag, font=font(18, True), fill=INK)
    y = 40
    for im in ims:
        sheet.paste(im, (0, y)); y += im.height + 8
    out = os.path.join(ROOT, 'sheets', '%s_lineup.png' % tag)
    sheet.save(out)
    return out


def versus(tag, before, ids):
    cols = []
    for t in (before, tag):
        d = os.path.join(ROOT, t)
        sh = json.load(open(os.path.join(d, 'shots.json')))
        col = [tile(os.path.join(d, sh['creatures'][i]['turn'][1]['file']), 260, 260) for i in ids]
        cols.append(col)
    W, H = 2 * 270 + 20, 40 + len(ids) * 270
    sheet = Image.new('RGB', (W, H), BG)
    g = ImageDraw.Draw(sheet)
    g.text((10, 10), before, font=font(16, True), fill=DIM); g.text((290, 10), tag, font=font(16, True), fill=INK)
    for r, i in enumerate(ids):
        for k in range(2):
            sheet.paste(cols[k][r], (10 + k * 280, 36 + r * 270))
    out = os.path.join(ROOT, 'sheets', '%s_vs_%s.png' % (tag, before))
    sheet.save(out)
    return out


if __name__ == '__main__':
    tag = sys.argv[1]
    os.makedirs(os.path.join(ROOT, 'sheets'), exist_ok=True)
    shots = json.load(open(os.path.join(ROOT, tag, 'shots.json')))
    man = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.studio-workspaces', 'scarlands-bestiary-v1', 'candidates', 'manifest.json')))
    for cid, rec in shots['creatures'].items():
        print(creature_sheet(tag, cid, rec, man))
    print(lineup_sheet(tag, shots))
    if len(sys.argv) > 2:
        print(versus(tag, sys.argv[2], list(shots['creatures'].keys())))
