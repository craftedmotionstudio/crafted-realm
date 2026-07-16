"""Compose the five-view Blender proof packet for cellar lantern v2."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "scratchpad" / "cellar_lantern_v2"
OUTPUT = SOURCE / "cellar_lantern_v2_proof_sheet.png"


def font(size, bold=False):
    candidates = [
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def fit(path, size):
    image = Image.open(path).convert("RGB")
    image.thumbnail(size, Image.Resampling.LANCZOS)
    result = Image.new("RGB", size, (24, 27, 24))
    result.paste(image, ((size[0] - image.width) // 2, (size[1] - image.height) // 2))
    return result


def main():
    width, height = 2100, 1460
    margin, gutter = 48, 28
    header, footer = 150, 90
    card_w = (width - margin * 2 - gutter * 2) // 3
    card_h = 570
    sheet = Image.new("RGB", (width, height), (20, 23, 21))
    draw = ImageDraw.Draw(sheet)
    title = font(46, True)
    card_title = font(27, True)
    body = font(20)
    small = font(18)
    draw.text((margin, 30), "Cellar lantern v2 — fully-designed Blender proof",
              fill=(246, 221, 164), font=title)
    draw.text((margin, 92),
              "Custom profile meshes + forged paths + fitted door hardware • no Blender primitive operators",
              fill=(188, 199, 184), font=body)

    cards = (
        ("01 — Shaded", "Designed silhouette and final palette", "01_shaded.png"),
        ("02 — Clay / silhouette", "Form must work without color", "02_clay_silhouette.png"),
        ("03 — Wireframe", "Custom topology is visible and inspectable", "03_wireframe.png"),
        ("04 — Material ID", "Blue iron • gold brass • cyan glass • red fire", "04_material_id.png"),
        ("05 — Gameplay camera", "Scale and readability beside a 1.8-unit player", "05_gameplay_camera.png"),
    )
    positions = [
        (margin, header), (margin + card_w + gutter, header),
        (margin + (card_w + gutter) * 2, header),
        (margin + (card_w + gutter) // 2, header + card_h + gutter),
        (margin + (card_w + gutter) * 3 // 2, header + card_h + gutter),
    ]
    for (name, note, filename), (x, y) in zip(cards, positions):
        draw.rounded_rectangle((x, y, x + card_w, y + card_h), 15,
                               fill=(38, 43, 38), outline=(100, 108, 94), width=2)
        draw.text((x + 18, y + 15), name, fill=(244, 219, 162), font=card_title)
        draw.text((x + 18, y + 53), note, fill=(184, 194, 181), font=small)
        sheet.paste(fit(SOURCE / filename, (card_w - 28, card_h - 92)), (x + 14, y + 82))

    draw.text((margin, height - footer + 20),
              "Review status: proof candidate only — not integrated until owner approval.",
              fill=(240, 179, 73), font=font(23, True))
    sheet.save(OUTPUT, optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
