"""Classic-pixels palette (look pass 2, 2026-09-26): one shared median-cut palette for the island, the same finish as the
owner-approved login art (tools/process_login_art_v4.py: downsample + one 64-colour palette, no dither, hard edges).
src/classic_pixels.js maps every pixel of the 2004-size render to its nearest palette colour when Classic pixels is on.
Built from look-v2 captures of the ten standard views (tools/capture_holm_look.js), void pixels left out, pure black
added for the void past the draw distance. Deterministic for the same captures.
Run: python tools/build_classic_palette.py [capture_dir] [colours]
  (defaults: the newest scratchpad/holm_look_v2/v2_pass* folder, 64)"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / 'scratchpad' / 'holm_look_v2'
OUT = ROOT / 'assets' / 'textures' / 'oldschool' / 'classic_palette.json'


def main():
    passes = sorted([p for p in BASE.glob('v2_pass*') if p.is_dir() and not p.name.endswith('classic')],
                    key=lambda p: int(''.join(c for c in p.name if c.isdigit()) or 0))
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else passes[-1]
    if not src.is_absolute() and not src.exists():
        src = BASE / src
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 64
    views = sorted(p for p in src.glob('*.png') if not p.name.endswith('.mask.png'))
    if not views:
        sys.exit(f'no captures in {src}')
    # the size classic pixels draws at (900 px screen -> 769 x 450), so the palette sees what it will quantise
    px = np.concatenate([np.asarray(Image.open(p).convert('RGB').resize((769, 450), Image.BOX)).reshape(-1, 3) for p in views])
    lum = px.astype(np.int32) @ np.array([299, 587, 114]) // 1000
    px = px[lum >= 10]
    pal = Image.fromarray(px.reshape(1, -1, 3)).quantize(colors=n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    cols = np.asarray(pal.getpalette()[:n * 3]).reshape(-1, 3)
    cols = sorted({tuple(int(v) for v in c) for c in cols}, key=lambda c: (c[0] * 299 + c[1] * 587 + c[2] * 114))
    if (0, 0, 0) not in cols:
        cols = [(0, 0, 0)] + cols
    OUT.write_text(json.dumps({'schema': 'crafted-realm-classic-palette-v1', 'generator': 'tools/build_classic_palette.py',
                               'source': str(src.relative_to(ROOT)).replace('\\', '/'), 'views': len(views),
                               'colors': [list(c) for c in cols]}, indent=None) + '\n')
    # swatch for review
    sw = Image.new('RGB', (16 * 20, ((len(cols) + 15) // 16) * 20))
    for i, c in enumerate(cols):
        sw.paste(c, ((i % 16) * 20, (i // 16) * 20, (i % 16) * 20 + 20, (i // 16) * 20 + 20))
    sw.save(BASE / 'classic_palette.png')
    print(f'{len(cols)} colours from {len(views)} views of {src.name} -> {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
