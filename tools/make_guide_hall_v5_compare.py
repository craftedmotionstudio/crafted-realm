"""Bank the Guide Hall v5 fitted-architecture comparison plate."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "Bible_References" / "Complete" / "_compare" / "GuideHall_v5_FittedArchitecture_compare.png"
OUT.parent.mkdir(parents=True, exist_ok=True)


def font(size, bold=False):
    path = Path("C:/Windows/Fonts") / ("arialbd.ttf" if bold else "arial.ttf")
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def fit(path, size, centering=(0.5, 0.5)):
    return ImageOps.fit(Image.open(path).convert("RGB"), size, Image.Resampling.LANCZOS,
                        centering=centering)


canvas = Image.new("RGB", (2460, 1740), "#171b19")
draw = ImageDraw.Draw(canvas)
draw.text((50, 28), "GUIDE HALL v5 - FITTED ARCHITECTURE", font=font(44, True), fill="#f1d19a")
draw.text((50, 84), "Reference-led spatial purpose, one seated contour roof, full-frame doors, and Blender-authored interiors",
          font=font(24), fill="#b8c1b7")

panel_size = (760, 690)
items = [
    (ROOT / "Bible_References" / "Tutorial_Island_Building.jpg", "REFERENCE - occupational interior depth", (0.5, 0.48)),
    (ROOT / "scratchpad" / "guide_hall_v5" / "guide_hall_v5_exterior.png", "v5 EXTERIOR - one connected roof contour", (0.5, 0.5)),
    (ROOT / "scratchpad" / "guide_hall_v5" / "guide_hall_v5_roof_off.png", "v5 ROOF OFF - authored functional rooms", (0.5, 0.5)),
    (ROOT / "scratchpad" / "guide_hall_v5" / "guide_hall_v5_door_detail.png", "v5 DOOR - fitted leaf, frame, lintel, infill", (0.5, 0.5)),
    (ROOT / "scratchpad" / "guide_hall_v5" / "guide_hall_v5_interior_detail.png", "v5 INTERIOR - Blender furniture kit", (0.5, 0.5)),
    (ROOT / "scratchpad" / "guide_hall_v5" / "guide_hall_v5_plan.png", "v5 PLAN - clear cardinal circulation", (0.5, 0.5)),
]
for index, (path, label, centering) in enumerate(items):
    col, row = index % 3, index // 3
    x, y = 50 + col * 805, 175 + row * 750
    image = fit(path, panel_size, centering)
    canvas.paste(image, (x, y))
    draw.rectangle((x, y, x + panel_size[0], y + panel_size[1]), outline="#8e7650", width=4)
    draw.text((x + 8, y - 38), label, font=font(22, True), fill="#e6d4b0")

draw.text((50, 1688),
          "26 x 24 tiles | 6,346 tris | 51 GLB primitives | 18 materials | 0.10-tile roof seat | 0.06-tile door fit gaps",
          font=font(23, True), fill="#d6b675")
canvas.save(OUT, quality=95)
print(OUT)
