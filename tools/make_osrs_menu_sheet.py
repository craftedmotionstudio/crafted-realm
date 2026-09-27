"""Owner review sheet for the old-school right-click menu (owner 2026-09-26).

Reads the captures tools/qa_osrs_menu.js wrote to scratchpad/holm_menu_v1/ (each full frame plus the menu rect it
recorded in qa_osrs_menu.json) and writes:
  compare_ref_vs_bram.png   the reference "Choose Option" menu (Bible_References/Lighthouse_entrance.jpg, reference only)
                            beside our Guide Bram menu, both enlarged 3x with nearest-neighbour pixels
  sheet_menus.png           every captured menu, cropped with a little of the world around it, labelled
Run: python tools/make_osrs_menu_sheet.py
"""
import json
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'scratchpad', 'holm_menu_v1')
REF = os.path.join(ROOT, 'Bible_References', 'Lighthouse_entrance.jpg')
REF_MENU = (22, 208, 143, 299)   # the reference menu's box in the 488x321 image
BG = (24, 21, 16)
INK = (230, 220, 190)


def enlarge(im, k):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


def label(draw, xy, text):
    draw.text((xy[0] + 1, xy[1] + 1), text, fill=(0, 0, 0))
    draw.text(xy, text, fill=INK)


def main():
    data = json.load(open(os.path.join(OUT, 'qa_osrs_menu.json'), encoding='utf-8'))
    shots = {s['name']: s['rect'] for s in data.get('shots', [])}
    if '05_guide_bram' not in shots:
        sys.exit('no Guide Bram capture in qa_osrs_menu.json; run tools/qa_osrs_menu.js first')

    def menu_crop(name, pad=4):
        x, y, w, h = shots[name]
        frame = Image.open(os.path.join(OUT, name + '.png')).convert('RGB')
        return frame.crop((int(x) - pad, int(y) - pad, int(x + w) + pad, int(y + h) + pad))

    # 1. reference vs ours (the reference is shown only for comparison; nothing of it is used in the game)
    ref = enlarge(Image.open(REF).convert('RGB').crop(REF_MENU), 3)
    ours = enlarge(menu_crop('05_guide_bram'), 3)
    W = ref.width + ours.width + 60
    H = max(ref.height, ours.height) + 70
    sheet = Image.new('RGB', (W, H), BG)
    sheet.paste(ref, (20, 50))
    sheet.paste(ours, (40 + ref.width, 50))
    d = ImageDraw.Draw(sheet)
    label(d, (20, 16), 'Reference (Bible_References/Lighthouse_entrance.jpg), 3x')
    label(d, (40 + ref.width, 16), 'Crafted Realm: right-click Guide Bram, 3x')
    sheet.save(os.path.join(OUT, 'compare_ref_vs_bram.png'))

    # 2. every menu with its surroundings
    tiles = []
    for name in sorted(shots):
        tiles.append((name, menu_crop(name, pad=40)))
    cols = 3
    cw = max(t.width for _, t in tiles) + 20
    ch = max(t.height for _, t in tiles) + 40
    rows = (len(tiles) + cols - 1) // cols
    grid = Image.new('RGB', (cols * cw + 20, rows * ch + 20), BG)
    d = ImageDraw.Draw(grid)
    for i, (name, t) in enumerate(tiles):
        cx, cy = 20 + (i % cols) * cw, 20 + (i // cols) * ch
        label(d, (cx, cy), name.replace('_', ' '))
        grid.paste(t, (cx, cy + 18))
    grid.save(os.path.join(OUT, 'sheet_menus.png'))
    print('wrote compare_ref_vs_bram.png and sheet_menus.png (%d menus)' % len(tiles))


if __name__ == '__main__':
    main()
