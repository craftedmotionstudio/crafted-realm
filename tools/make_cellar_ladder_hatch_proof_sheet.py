"""Compose the six-view Blender proof packet for cellar ladder/hatch v1."""

from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "scratchpad" / "cellar_ladder_hatch_v1"
OUTPUT = SOURCE / "cellar_ladder_hatch_v1_proof_sheet.png"


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
    report = json.loads((SOURCE / "asset_report.json").read_text(encoding="utf-8"))
    width, height = 2200, 1540
    margin, gutter, header = 48, 28, 150
    card_w = (width - margin * 2 - gutter * 2) // 3
    card_h = 620
    sheet = Image.new("RGB", (width, height), (19, 18, 16))
    draw = ImageDraw.Draw(sheet)
    draw.text((margin, 27), "Cellar ladder & descent v1 — scale-locked Blender proof",
              fill=(246, 210, 131), font=font(44, True))
    draw.text((margin, 91),
              "1.9-tile player • one-tile opening • seven rungs • fitted sill • true recessed darkness",
              fill=(188, 184, 174), font=font(20))
    cards = (
        ("01 — Scale fixture", "Canonical player and one-tile grid", "01_scale_silhouette.png"),
        ("02 — Shaded", "Aged oak • iron • warm fieldstone", "02_shaded.png"),
        ("03 — Clay / silhouette", "Construction reads without color", "03_clay.png"),
        ("04 — Wireframe", "Custom authored topology is inspectable", "04_wireframe.png"),
        ("05 — Gameplay descent", "Dark opening remains readable from above", "05_gameplay_descent.png"),
        ("06 — Gameplay ascent", "Lower rungs and fitted landing from below", "06_gameplay_ascent.png"),
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
              f"Technical gate: {report['triangles']:,} triangles • 16 primitives • "
              f"{len(report['materials'])} materials • 1.57 × 1.04 × 2.64 tiles",
              fill=(126, 203, 126), font=font(23, True))
    sheet.save(OUTPUT, optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
