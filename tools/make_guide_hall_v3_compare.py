"""Bank the owner-selected Compass Court comparison plate."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "Bible_References" / "Complete" / "_compare" / "GuideHall_v3_CompassCourt_compare.png"
OUT.parent.mkdir(parents=True, exist_ok=True)


def font(size, bold=False):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    paths = [Path("C:/Windows/Fonts") / ("arialbd.ttf" if bold else "arial.ttf"),
             Path("C:/Windows/Fonts") / name]
    for path in paths:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def fit(path, size):
    image = Image.open(path).convert("RGB")
    return ImageOps.fit(image, size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))


canvas = Image.new("RGB", (2200, 1240), "#171b19")
draw = ImageDraw.Draw(canvas)
draw.text((50, 34), "GUIDE HALL v3 — COMPASS COURT", font=font(42, True), fill="#f1d19a")
draw.text((50, 88), "OSRS spatial reference vs owner-selected original Blender production asset",
          font=font(24), fill="#b8c1b7")

ref = fit(ROOT / "Bible_References" / "Tutorial_Island_Building.jpg", (1040, 980))
exterior = fit(ROOT / "scratchpad" / "guide_hall_v3" / "guide_hall_v3_exterior.png", (1010, 470))
interior = fit(ROOT / "scratchpad" / "guide_hall_v3" / "guide_hall_v3_roof_off.png", (1010, 470))

canvas.paste(ref, (50, 170))
canvas.paste(exterior, (1140, 170))
canvas.paste(interior, (1140, 680))
for box in ((50, 170, 1090, 1150), (1140, 170, 2150, 640), (1140, 680, 2150, 1150)):
    draw.rectangle(box, outline="#8e7650", width=4)
draw.text((62, 127), "REFERENCE — generous roof-off spatial clarity", font=font(24, True), fill="#e6d4b0")
draw.text((1152, 127), "PRODUCTION GLB — exterior hierarchy", font=font(24, True), fill="#e6d4b0")
draw.text((1152, 647), "PRODUCTION GLB — roof-off function", font=font(24, True), fill="#e6d4b0")
draw.text((50, 1180), "18 × 16 tiles  •  3,348 tris  •  68 Studio draws  •  south-to-north route  •  four purposeful spaces",
          font=font(23, True), fill="#d6b675")
canvas.save(OUT, quality=95)
print(OUT)
