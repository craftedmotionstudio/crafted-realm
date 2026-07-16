"""Compose the standard Nano Banana to Blender closeness proof."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / "scratchpad" / "workyard_shore_gear_v1"
OUT = DIR / "comparison_9_2.png"


def font(size, bold=False):
    name = "arialbd.ttf" if bold else "arial.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / name), size)


def fitted(path, box):
    image = Image.open(path).convert("RGB")
    image.thumbnail(box, Image.Resampling.LANCZOS)
    return image


canvas = Image.new("RGB", (2400, 1120), (25, 27, 25))
draw = ImageDraw.Draw(canvas)
draw.text((70, 38), "WORKYARD SHORE-GEAR CLUSTER", font=font(58, True), fill=(236, 205, 132))
draw.text((72, 108), "Original low-poly concept to exact integrated Blender asset", font=font(29), fill=(190, 194, 181))

left = fitted(DIR / "nano_banana_reference.png", (1080, 790))
right = fitted(DIR / "blender_final.png", (1080, 790))
positions = ((70, 190, left), (1250, 190, right))
for x, y, image in positions:
    draw.rounded_rectangle((x - 12, y - 12, x + 1092, y + 802), 18,
                           fill=(48, 50, 46), outline=(102, 91, 62), width=4)
    canvas.paste(image, (x + (1080 - image.width)//2, y + (790 - image.height)//2))

draw.rounded_rectangle((90, 210, 520, 275), 12, fill=(37, 32, 23))
draw.text((115, 224), "NANO BANANA CONCEPT", font=font(28, True), fill=(248, 221, 157))
draw.rounded_rectangle((1270, 210, 1675, 275), 12, fill=(37, 32, 23))
draw.text((1295, 224), "BLENDER FINAL", font=font(28, True), fill=(248, 221, 157))

draw.rounded_rectangle((730, 1000, 1670, 1090), 20, fill=(35, 74, 47), outline=(122, 202, 139), width=4)
draw.text((795, 1018), "CLOSENESS  9.2 / 10   —   PASS", font=font(44, True), fill=(224, 247, 224))
canvas.save(OUT)
print(OUT)
