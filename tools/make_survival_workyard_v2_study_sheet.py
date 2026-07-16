"""Compose the three Survival Workyard v2 Blender massing studies for review."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "scratchpad" / "survival_workyard_v2_shape_studies"
OUTPUT = SOURCE / "survival_workyard_v2_shape_studies_sheet.png"


def font(size, bold=False):
    candidates = [
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def fit_image(path, target_size):
    image = Image.open(path).convert("RGB")
    image.thumbnail(target_size, Image.Resampling.LANCZOS)
    result = Image.new("RGB", target_size, (35, 36, 31))
    result.paste(image, ((target_size[0] - image.width) // 2,
                         (target_size[1] - image.height) // 2))
    return result


def main():
    width, height = 2100, 1500
    margin, gutter = 55, 30
    header_h, footer_h = 135, 100
    card_w = (width - margin * 2 - gutter * 2) // 3
    card_h = height - header_h - footer_h - margin
    image_h = (card_h - 155) // 2
    sheet = Image.new("RGB", (width, height), (25, 28, 24))
    draw = ImageDraw.Draw(sheet)
    title_font, card_font, small_font = font(44, True), font(28, True), font(20)

    draw.text((margin, 35), "Survival Workyard v2 — shape studies", fill=(244, 220, 163), font=title_font)
    draw.text((margin, 92), "Exterior silhouette above • gameplay-plan readability below",
              fill=(191, 200, 179), font=small_font)

    studies = (
        ("A — Hearth Court", "Selected", "A_hearth_court.png", "A_hearth_court_plan.png",
         "Offset lodge + passage + many-sided teaching hearth"),
        ("B — Crooked Larder", "Rejected: too block-like", "B_crooked_larder.png",
         "B_crooked_larder_plan.png", "The broad roof still dominates as a rectangle"),
        ("C — Rain-Catch U", "Reserved for a farmstead", "C_rain_catch_u.png",
         "C_rain_catch_u_plan.png", "Memorable, but too busy for this tutorial function"),
    )
    for index, (name, verdict, exterior, plan, note) in enumerate(studies):
        x = margin + index * (card_w + gutter)
        y = header_h
        selected = index == 0
        card_fill = (50, 58, 43) if selected else (39, 42, 36)
        outline = (207, 158, 66) if selected else (93, 99, 86)
        draw.rounded_rectangle((x, y, x + card_w, y + card_h), 18,
                               fill=card_fill, outline=outline, width=5 if selected else 2)
        draw.text((x + 22, y + 19), name, fill=(250, 226, 172), font=card_font)
        draw.text((x + 22, y + 60), verdict,
                  fill=(238, 178, 76) if selected else (188, 191, 177), font=small_font)

        image_w = card_w - 36
        top_y = y + 100
        sheet.paste(fit_image(SOURCE / exterior, (image_w, image_h)), (x + 18, top_y))
        plan_y = top_y + image_h + 16
        sheet.paste(fit_image(SOURCE / plan, (image_w, image_h)), (x + 18, plan_y))
        draw.text((x + 22, y + card_h - 40), note, fill=(211, 213, 199), font=small_font)

    draw.text((margin, height - 67),
              "Production direction: A. Its rooms explain the training flow and remain distinct on the minimap.",
              fill=(244, 220, 163), font=font(24, True))
    sheet.save(OUTPUT, optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
