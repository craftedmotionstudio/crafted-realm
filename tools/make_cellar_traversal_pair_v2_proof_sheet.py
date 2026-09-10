"""Compose the six-view Blender proof packet for the corrective traversal pair."""

from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "scratchpad" / "cellar_traversal_pair_v2"
OUTPUT = SOURCE / "cellar_traversal_pair_v2_proof_sheet.png"


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
    draw.text((margin, 27), "Cellar traversal pair v2 - purpose-built Blender proof",
              fill=(246, 210, 131), font=font(44, True))
    draw.text((margin, 91),
              "1.9-tile player | flush surface opening | animated lid | simple one-colour wall ladder",
              fill=(188, 184, 174), font=font(20))
    cards = (
        ("01 - Surface scale", "Opening and short rails beside player", "01_surface_gameplay.png"),
        ("02 - Surface construction", "Pegged rim, real recess and banded animated lid", "02_surface_construction.png"),
        ("03 - Surface wireframe", "Custom authored topology is inspectable", "03_surface_wireframe.png"),
        ("04 - Cellar scale", "Three-tile ladder beside canonical player", "04_cellar_gameplay.png"),
        ("05 - Cellar construction", "Two plain rails, nine rungs, one uniform aged-oak material", "05_cellar_construction.png"),
        ("06 - Cellar wireframe", "Separate purpose root and controlled topology", "06_cellar_wireframe.png"),
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
    surface = report["dimensionsTiles"]["surface"]
    cellar = report["dimensionsTiles"]["cellar"]
    draw.text((margin, height - 68),
              f"Technical gate: {report['triangles']:,} triangles | {report['visibleMeshObjects']} runtime meshes | "
              f"surface {surface['width']} x {surface['depth']} x {surface['height']} tiles | "
              f"cellar {cellar['width']} x {cellar['depth']} x {cellar['height']} tiles",
              fill=(126, 203, 126), font=font(23, True))
    sheet.save(OUTPUT, optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
