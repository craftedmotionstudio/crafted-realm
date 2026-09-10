"""Bank the Guide Hall v4 coherent-shell comparison plate."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "Bible_References" / "Complete" / "_compare" / "GuideHall_v4_CoherentShell_compare.png"
OUT.parent.mkdir(parents=True, exist_ok=True)


def font(size, bold=False):
    candidates = [
        Path("C:/Windows/Fonts") / ("arialbd.ttf" if bold else "arial.ttf"),
        Path("C:/Windows/Fonts") / ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def fit(path, size, centering=(0.5, 0.5)):
    image = Image.open(path).convert("RGB")
    return ImageOps.fit(image, size, method=Image.Resampling.LANCZOS, centering=centering)


canvas = Image.new("RGB", (2200, 1370), "#171b19")
draw = ImageDraw.Draw(canvas)
draw.text((50, 34), "GUIDE HALL v4 - COHERENT SHELL", font=font(42, True), fill="#f1d19a")
draw.text(
    (50, 88),
    "One shared perimeter, a larger open hall, aligned purpose zones, and two intentional door gaps",
    font=font(24),
    fill="#b8c1b7",
)

ref = fit(ROOT / "Bible_References" / "Tutorial_Island_Building.jpg", (1040, 550), (0.5, 0.48))
exterior = fit(ROOT / "scratchpad" / "guide_hall_v4" / "guide_hall_v4_exterior.png", (1010, 550))
roof_off = fit(ROOT / "scratchpad" / "guide_hall_v4" / "guide_hall_v4_roof_off.png", (1040, 550))
plan = fit(ROOT / "scratchpad" / "guide_hall_v4" / "guide_hall_v4_plan.png", (1010, 550))

panels = [
    (ref, (50, 180), "REFERENCE - generous roof-off spatial clarity"),
    (exterior, (1140, 180), "v4 PRODUCTION GLB - exterior hierarchy"),
    (roof_off, (50, 785), "v4 ROOF OFF - one open, functional hall"),
    (plan, (1140, 785), "v4 PLAN - one perimeter with aligned junctions"),
]
for image, (x, y), label in panels:
    canvas.paste(image, (x, y))
    draw.rectangle((x, y, x + image.width, y + image.height), outline="#8e7650", width=4)
    draw.text((x + 12, y - 42), label, font=font(24, True), fill="#e6d4b0")

draw.text(
    (50, 1343),
    "26 x 24 tiles  |  3,696 tris  |  74 Studio draws  |  24 endpoint-sharing wall runs  |  south-to-north route",
    font=font(22, True),
    fill="#d6b675",
)
canvas.save(OUT, quality=95)
print(OUT)
