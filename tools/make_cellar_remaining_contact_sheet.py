"""Compose the ten mandatory Nano Banana 2 -> Blender comparison gates."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "scratchpad" / "cellar_remaining_furnishings_v1" / "compare"
OUTPUT = SOURCE / "00_all_items_contact_sheet.png"


def font(size, bold=False):
    path = Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf")
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def fit(path, size):
    image = Image.open(path).convert("RGB")
    image.thumbnail(size, Image.Resampling.LANCZOS)
    result = Image.new("RGB", size, (22, 20, 18))
    result.paste(image, ((size[0] - image.width) // 2, (size[1] - image.height) // 2))
    return result


def main():
    entries = (
        ("Reserve shelf", "storage_shelf_compare.png", 9.1),
        ("Supply barrel", "supply_barrel_compare.png", 9.1),
        ("Lidded crock", "lidded_crock_compare.png", 9.4),
        ("Grain sack", "grain_sack_compare.png", 9.0),
        ("Handled basket", "handled_basket_compare.png", 9.1),
        ("Provision table", "provision_table_compare.png", 9.1),
        ("Root basket", "root_basket_compare.png", 9.2),
        ("Cutting board + knife", "cutting_board_knife_compare.png", 9.1),
        ("Aisle rug", "aisle_rug_compare.png", 9.2),
        ("Masonry hearth", "masonry_hearth_compare.png", 9.3),
    )
    width, margin, gutter, header = 2400, 42, 24, 150
    card_w = (width - margin * 2 - gutter) // 2
    image_h, label_h = 710, 62
    card_h = image_h + label_h
    height = header + 5 * card_h + 4 * gutter + margin
    sheet = Image.new("RGB", (width, height), (18, 17, 15))
    draw = ImageDraw.Draw(sheet)
    draw.text((margin, 24), "Workyard basement — all ten concept-to-Blender gates",
              fill=(246, 210, 131), font=font(42, True))
    draw.text((margin, 82), "Every final Blender render is shown beside its Nano Banana 2 production concept · minimum accepted score 9.0",
              fill=(188, 184, 174), font=font(22))
    for index, (name, filename, score) in enumerate(entries):
        col, row = index % 2, index // 2
        x = margin + col * (card_w + gutter)
        y = header + row * (card_h + gutter)
        draw.rounded_rectangle((x, y, x + card_w, y + card_h), 14,
                               fill=(35, 32, 28), outline=(101, 91, 75), width=2)
        sheet.paste(fit(SOURCE / filename, (card_w - 20, image_h - 12)), (x + 10, y + 8))
        draw.text((x + 18, y + image_h + 9), name, fill=(235, 229, 216), font=font(24, True))
        draw.text((x + card_w - 170, y + image_h + 9), f"{score:.1f} / 10",
                  fill=(123, 205, 128), font=font(24, True))
    sheet.save(OUTPUT, optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
