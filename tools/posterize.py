#!/usr/bin/env python
"""posterize.py — flatten an image toward the cozy 2007-OSRS look.

Desaturates slightly + quantizes colors into bands (posterize) to kill the
realistic gradients SF3D bakes. Usable on the input sprite or an extracted
texture atlas.

Usage:
    python tools/posterize.py <in.png> <out.png> [bits] [saturation]
      bits        per-channel bits, lower = flatter bands (default 3 -> 8 levels)
      saturation  color multiplier (default 0.9, slightly muted)
"""
import sys

from PIL import Image, ImageEnhance, ImageOps

inp, out = sys.argv[1], sys.argv[2]
bits = int(sys.argv[3]) if len(sys.argv) > 3 else 3
sat = float(sys.argv[4]) if len(sys.argv) > 4 else 0.9

img = Image.open(inp).convert("RGB")
img = ImageEnhance.Color(img).enhance(sat)   # mute saturation a touch
img = ImageOps.posterize(img, bits)          # band the colors -> flat/cozy
img.save(out)
print(f"posterized {out} (bits={bits}, sat={sat})")
