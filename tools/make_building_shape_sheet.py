"""Compose the current Guide Hall Blender massing studies into one review sheet."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "scratchpad" / "guide_hall_shape_studies"
OUT = SRC / "GuideHall_shape_studies.png"


def font(size, bold=False):
    names = ["C:/Windows/Fonts/seguisb.ttf", "C:/Windows/Fonts/arialbd.ttf"] if bold else ["C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf"]
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def fit(path, width, height):
    image = Image.open(path).convert("RGB")
    ratio = min(width / image.width, height / image.height)
    return image.resize((round(image.width * ratio), round(image.height * ratio)), Image.Resampling.LANCZOS)


studies = [
    ("A", "COMPASS COURT", "A_compass_court", "Radial chart hall + angled service wings", "Most distinct; roof junction needs refinement"),
    ("B", "WAYFARER L", "B_wayfarer_l", "Asymmetric L-plan + polygonal chart tower", "Most believable; some rectangular mass remains"),
    ("C", "THREE ROADS", "C_three_roads", "Long teaching nave + unequal polygonal bays", "Cleanest read; main rectangle still dominates"),
]

W, H = 1800, 1280
PAD, GAP = 26, 20
COL = (W - PAD * 2 - GAP * 2) // 3
sheet = Image.new("RGB", (W, H), (26, 25, 22))
draw = ImageDraw.Draw(sheet)
gold, ink, muted, green = (231, 178, 61), (238, 232, 218), (177, 168, 151), (120, 196, 120)
draw.text((PAD, 18), "GUIDE HALL v3 — NON-RECTANGULAR BLENDER MASSING STUDIES", font=font(36, True), fill=gold)
draw.text((PAD, 65), "Exterior character is judged twice: elevated gameplay camera and true top-down footprint.", font=font(20), fill=muted)

for i, (letter, title, key, idea, note) in enumerate(studies):
    x = PAD + i * (COL + GAP)
    y = 110
    draw.rounded_rectangle((x, y, x + COL, H - PAD), radius=10, outline=(73, 68, 57), width=2, fill=(33, 31, 27))
    draw.text((x + 14, y + 12), f"{letter}  {title}", font=font(27, True), fill=ink)
    draw.text((x + 14, y + 50), idea, font=font(17), fill=muted)
    iso = fit(SRC / f"{key}.png", COL - 28, 470)
    sheet.paste(iso, (x + (COL - iso.width) // 2, y + 86))
    draw.text((x + 14, y + 570), "TOP-DOWN SILHOUETTE GATE", font=font(17, True), fill=gold)
    plan = fit(SRC / f"{key}_plan.png", COL - 28, 440)
    sheet.paste(plan, (x + (COL - plan.width) // 2, y + 600))
    color = green if letter == "A" else muted
    draw.text((x + 14, H - 78), note, font=font(17), fill=color)

draw.text((PAD, H - 24), "Massing only — no study is approved for the live game yet. Recommended direction: A, refined into a calmer roof hierarchy.", font=font(17, True), fill=gold)
sheet.save(OUT)
print(OUT)
