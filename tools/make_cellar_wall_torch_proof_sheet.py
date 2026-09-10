"""Compose the six-view fully-designed proof packet for cellar wall torch v1."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "scratchpad" / "cellar_wall_torch_v1"
OUTPUT = SOURCE / "cellar_wall_torch_v1_proof_sheet.png"


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
    result = Image.new("RGB", size, (26, 25, 22))
    result.paste(image, ((size[0] - image.width) // 2, (size[1] - image.height) // 2))
    return result


def main():
    width, height = 2100, 1540
    margin, gutter = 48, 28
    header, footer = 150, 92
    card_w = (width - margin * 2 - gutter * 2) // 3
    card_h = 620
    sheet = Image.new("RGB", (width, height), (20, 19, 17))
    draw = ImageDraw.Draw(sheet)
    draw.text((margin, 27), "Cellar wall torch v1 — fully-designed Blender proof",
              fill=(246, 210, 131), font=font(46, True))
    draw.text((margin, 91),
              "Edited custom topology • authored face colors • seamless 2.875-second cozy Flame_Flicker clip",
              fill=(188, 187, 177), font=font(20))

    cards = (
        ("01 — Shaded", "Final palette and hand-built silhouette", "01_shaded.png"),
        ("02 — Clay / silhouette", "Form reads without material color", "02_clay_silhouette.png"),
        ("03 — Wireframe", "Asset-specific topology is inspectable", "03_wireframe.png"),
        ("04 — Material ID", "Iron • ashwood • pitch cloth • fire", "04_material_id.png"),
        ("05 — Gameplay camera", "Wall scale beside the 1.8-unit player", "05_gameplay_camera.png"),
        ("06 — Flicker pose", "A second authored animation key pose", "06_flicker_pose.png"),
    )
    for index, (name, note, filename) in enumerate(cards):
        col, row = index % 3, index // 3
        x = margin + col * (card_w + gutter)
        y = header + row * (card_h + gutter)
        draw.rounded_rectangle((x, y, x + card_w, y + card_h), 15,
                               fill=(39, 37, 33), outline=(104, 96, 82), width=2)
        draw.text((x + 18, y + 15), name, fill=(244, 208, 130), font=font(27, True))
        draw.text((x + 18, y + 53), note, fill=(184, 182, 171), font=font(18))
        sheet.paste(fit(SOURCE / filename, (card_w - 28, card_h - 92)), (x + 14, y + 82))

    draw.text((margin, height - footer + 20),
              "Technical gate: 856 triangles • 13 primitives • 11 materials • 61 KB GLB",
              fill=(126, 203, 126), font=font(23, True))
    sheet.save(OUTPUT, optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
