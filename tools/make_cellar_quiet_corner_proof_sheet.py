"""Compose the six-view fully-designed proof packet for quiet corner v1."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "scratchpad" / "cellar_quiet_corner_v1"
OUTPUT = SOURCE / "cellar_quiet_corner_v1_proof_sheet.png"


def font(size, bold=False):
    path = Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf")
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def fit(path, size):
    image = Image.open(path).convert("RGB")
    image.thumbnail(size, Image.Resampling.LANCZOS)
    result = Image.new("RGB", size, (25, 23, 20))
    result.paste(image, ((size[0] - image.width) // 2, (size[1] - image.height) // 2))
    return result


def main():
    width, height = 2200, 1540
    margin, gutter, header = 48, 28, 150
    card_w = (width - margin * 2 - gutter * 2) // 3
    card_h = 620
    sheet = Image.new("RGB", (width, height), (19, 18, 16))
    draw = ImageDraw.Draw(sheet)
    draw.text((margin, 27), "Cellar quiet corner v1 — fully-designed Blender proof",
              fill=(246, 210, 131), font=font(46, True))
    draw.text((margin, 91),
              "Two distinct chairs • seven-sided tripod table • handled yarn basket • semantic interaction roots",
              fill=(188, 184, 174), font=font(20))
    cards = (
        ("01 — Shaded", "Final warm cellar furnishing palette", "01_shaded.png"),
        ("02 — Clay / silhouette", "Shape reads without material color", "02_clay_silhouette.png"),
        ("03 — Wireframe", "1,746 authored vertices are inspectable", "03_wireframe.png"),
        ("04 — Material ID", "Wood • rush • cloth • iron • wool • clay", "04_material_id.png"),
        ("05 — Gameplay camera", "1.8-unit player and cellar wall scale", "05_gameplay_camera.png"),
        ("06 — Rear construction", "Mortise logic, stretchers, spindles and shawl", "06_rear_construction.png"),
    )
    for index, (name, note, filename) in enumerate(cards):
        col, row = index % 3, index // 3
        x = margin + col * (card_w + gutter)
        y = header + row * (card_h + gutter)
        draw.rounded_rectangle((x, y, x + card_w, y + card_h), 15,
                               fill=(38, 35, 31), outline=(103, 94, 79), width=2)
        draw.text((x + 18, y + 15), name, fill=(244, 208, 130), font=font(27, True))
        draw.text((x + 18, y + 53), note, fill=(184, 180, 169), font=font(18))
        sheet.paste(fit(SOURCE / filename, (card_w - 28, card_h - 92)), (x + 14, y + 82))
    draw.text((margin, height - 68),
              "Technical gate: 3,236 triangles • 25 primitives • 16 materials • 184 KB GLB",
              fill=(126, 203, 126), font=font(23, True))
    sheet.save(OUTPUT, optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()

