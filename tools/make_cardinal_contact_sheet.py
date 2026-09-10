#!/usr/bin/env python3
"""Compose four cardinal renders and their recorded collision audit."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ORDER = ("north", "south", "east", "west")


def workspace_path(value):
    path = (ROOT / value).resolve()
    if ROOT not in path.parents and path != ROOT:
        raise ValueError(f"path escapes workspace: {value}")
    return path


def fit(image, size):
    copy = image.convert("RGB")
    copy.thumbnail(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", size, (24, 20, 16))
    canvas.paste(copy, ((size[0] - copy.width) // 2, (size[1] - copy.height) // 2))
    return canvas


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest")
    parser.add_argument("review")
    parser.add_argument("output")
    args = parser.parse_args()
    manifest = json.loads(workspace_path(args.manifest).read_text(encoding="utf-8"))
    review = json.loads(workspace_path(args.review).read_text(encoding="utf-8"))
    if tuple(manifest.get("auditOrder", ())) != ORDER:
        raise ValueError("turnaround manifest must contain north, south, east, west in order")
    if set(review.get("views", {})) != set(ORDER):
        raise ValueError("review must record exactly north, south, east, and west")
    if review.get("verdict") not in ("PASS", "FAIL"):
        raise ValueError("review verdict must be PASS or FAIL")

    cell = (640, 700)
    sheet = Image.new("RGB", (cell[0] * 2, cell[1] * 2 + 118), (18, 15, 12))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default(size=22)
    small = ImageFont.load_default(size=17)
    for index, direction in enumerate(ORDER):
        x, y = (index % 2) * cell[0], (index // 2) * cell[1] + 76
        image = fit(Image.open(workspace_path(manifest["views"][direction])), (640, 640))
        sheet.paste(image, (x, y + 60))
        view_review = review["views"][direction]
        status = view_review.get("status", "UNREVIEWED")
        draw.rectangle((x, y, x + cell[0], y + 60), fill=(45, 36, 27))
        draw.text((x + 18, y + 14), f"FROM {direction.upper()}  |  {status}", fill=(244, 205, 105), font=font)
        notes = view_review.get("notes", "")
        draw.text((x + 18, y + 672), notes[:88], fill=(230, 222, 204), font=small)

    title = f"{review.get('asset', manifest['target'])} - CARDINAL CONTACT AUDIT"
    draw.text((20, 18), title, fill=(248, 222, 148), font=font)
    verdict_color = (105, 220, 135) if review["verdict"] == "PASS" else (245, 105, 90)
    draw.text((1035, 18), review["verdict"], fill=verdict_color, font=font)
    output = workspace_path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output)
    print("CARDINAL_CONTACT_SHEET_READY", output)


if __name__ == "__main__":
    main()
