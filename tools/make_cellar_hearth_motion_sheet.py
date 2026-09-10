"""Compose four authored Blender frames proving the slow cozy hearth loop."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "scratchpad" / "cellar_remaining_furnishings_v1"
OUTPUT = SOURCE / "hearth_motion_proof.png"


def font(size, bold=False):
    path = Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf")
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def fit(path, size):
    image = Image.open(path).convert("RGB")
    image.thumbnail(size, Image.Resampling.LANCZOS)
    result = Image.new("RGB", size, (23, 21, 18))
    result.paste(image, ((size[0]-image.width)//2, (size[1]-image.height)//2))
    return result


def main():
    width, height = 2000, 1760
    margin, gutter, header = 42, 24, 142
    card_w = (width-margin*2-gutter)//2
    card_h = (height-header-margin-gutter)//2
    sheet = Image.new("RGB", (width, height), (18, 17, 15))
    draw = ImageDraw.Draw(sheet)
    draw.text((margin, 24), "Cellar hearth - five-second cozy motion proof",
              fill=(246, 210, 131), font=font(42, True))
    draw.text((margin, 82), "Blender-authored flame shape at four points in one smooth 121-frame loop",
              fill=(188, 184, 174), font=font(23))
    frames = ((1, "rest"), (31, "tall drift"), (61, "low settle"), (91, "return drift"))
    for index, (frame, label) in enumerate(frames):
        col, row = index % 2, index // 2
        x = margin + col*(card_w+gutter)
        y = header + row*(card_h+gutter)
        draw.rounded_rectangle((x,y,x+card_w,y+card_h), 14, fill=(35,32,28),
                               outline=(101,91,75), width=2)
        sheet.paste(fit(SOURCE/f"hearth_motion_{frame:03d}.png", (card_w-20, card_h-60)),
                    (x+10,y+48))
        draw.text((x+18,y+12), f"Frame {frame:03d} - {label}",
                  fill=(235,229,216), font=font(25, True))
    sheet.save(OUTPUT, optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
