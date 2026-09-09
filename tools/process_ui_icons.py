# process_ui_icons.py — turn the Nano Banana raw UI icons (subject on flat magenta)
# into clean transparent, trimmed, square PNGs for the game UI. Pure PIL (no numpy).
#   key magenta -> transparent, erode opaque 1px to eat the AA fringe, light despill
#   of leftover purple edges, trim to content, pad square (~8% margin), resize 128px.
# in : Bible_References/UI_Icons/raw/<panel>.png
# out: assets/icons/ui/nb/<panel>.png
import os, glob
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW  = os.path.join(ROOT, "Bible_References", "UI_Icons", "raw")
OUT  = os.path.join(ROOT, "assets", "icons", "ui", "nb")
os.makedirs(OUT, exist_ok=True)
SIZE = 128

def is_magenta(R, G, B):
    return G < 100 and R > 135 and B > 135

done = 0
for f in sorted(glob.glob(os.path.join(RAW, "*.png"))):
    name = os.path.splitext(os.path.basename(f))[0]
    im = Image.open(f).convert("RGBA")
    px = list(im.getdata())

    # 1) alpha mask: transparent where magenta
    alpha = [0 if is_magenta(R, G, B) else 255 for (R, G, B, A) in px]
    amask = Image.new("L", im.size); amask.putdata(alpha)
    # 2) erode opaque by 1px (MinFilter shrinks the white/opaque region -> eats fringe)
    amask = amask.filter(ImageFilter.MinFilter(3))
    adata = list(amask.getdata())

    # 3) light despill: on still-opaque pixels with a magenta tint (R and B both well
    #    above G and close to each other), pull the purple down toward brown/neutral.
    out = []
    for (R, G, B, A), av in zip(px, adata):
        if av == 0:
            out.append((R, G, B, 0)); continue
        if R > G + 25 and B > G + 25 and abs(R - B) < 55:
            B = G + 10
            R = min(R, G + 55)
        out.append((R, G, B, 255))
    im.putdata(out)

    bbox = im.getchannel("A").getbbox()
    if not bbox:
        print("EMPTY (all keyed?):", name); continue
    crop = im.crop(bbox)
    w, h = crop.size
    side = int(max(w, h) * 1.16)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(crop, ((side - w) // 2, (side - h) // 2), crop)
    canvas = canvas.resize((SIZE, SIZE), Image.LANCZOS)
    canvas.save(os.path.join(OUT, name + ".png"))
    done += 1
    print("ok ", name)

print(f"\nprocessed {done} icons -> {OUT}")
