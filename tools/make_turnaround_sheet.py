#!/usr/bin/env python3
"""make_turnaround_sheet.py -- compose a 2x2 cardinal turnaround contact sheet.

Places the north, south, east, and west renders of one installed object on a
single labelled sheet for the Asset Factory schemaVersion 3 installed-contact
gate. The per-direction PASS/FAIL verdicts live in the paired review JSON; the
sheet renders them in each panel corner so the evidence is self-describing.

Usage:
  python tools/make_turnaround_sheet.py <sheet.json>

sheet.json:
  {
    "name": "Timber Log Rack — Cardinal Turnaround",
    "views": {"north": "path.png", "south": "...", "east": "...", "west": "..."},
    "review": "scratchpad/.../turnaround_review_rack.json",   # optional
    "note": "identical lighting, ortho lens, and framing scale",
    "out": "scratchpad/.../turnaround_sheet_rack.png"
  }
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORDER = ("north", "east", "south", "west")


def font(sz, bold=False):
    names = (["arialbd.ttf", "seguisb.ttf"] if bold else ["arial.ttf", "segoeui.ttf"])
    for n in names:
        for p in (n, os.path.join("C:/Windows/Fonts", n)):
            try:
                return ImageFont.truetype(p, sz)
            except Exception:
                pass
    return ImageFont.load_default()


def fit(im, box_w, box_h):
    r = min(box_w / im.width, box_h / im.height)
    return im.resize((max(1, int(im.width * r)), max(1, int(im.height * r))), Image.LANCZOS)


def main(cfg):
    pad, head_h = 20, 84
    panel_w, panel_h = 760, 570
    W = pad * 3 + panel_w * 2
    H = head_h + pad * 3 + panel_h * 2
    BG = (28, 26, 23); INK = (238, 232, 220); SUB = (176, 168, 152)
    GOLD = (226, 178, 64); GOOD = (120, 196, 120); BAD = (220, 110, 96)

    verdicts = {}
    if cfg.get("review"):
        try:
            review = json.load(open(os.path.join(ROOT, cfg["review"]), encoding="utf-8-sig"))
            verdicts = {k: v.get("verdict", "") for k, v in review.get("views", {}).items()}
        except Exception:
            pass

    sheet = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(sheet)
    d.text((pad, 18), cfg["name"], font=font(36, True), fill=GOLD)
    d.text((pad, 58), cfg.get("note", "installed-contact cardinal turnaround"),
           font=font(18), fill=SUB)

    for i, direction in enumerate(ORDER):
        x0 = pad + (i % 2) * (panel_w + pad)
        y0 = head_h + pad + (i // 2) * (panel_h + pad)
        d.rectangle([x0, y0, x0 + panel_w, y0 + panel_h], outline=(64, 60, 54), width=2)
        path = cfg["views"].get(direction)
        try:
            im = Image.open(os.path.join(ROOT, path)).convert("RGB")
            im = fit(im, panel_w - 12, panel_h - 44)
            sheet.paste(im, (x0 + (panel_w - im.width) // 2,
                             y0 + 38 + (panel_h - 44 - im.height) // 2))
        except Exception:
            d.text((x0 + 12, y0 + 48), f"[missing: {path}]", font=font(16), fill=BAD)
        d.text((x0 + 10, y0 + 8), f"FROM {direction.upper()}", font=font(19, True), fill=INK)
        verdict = verdicts.get(direction, "")
        if verdict:
            color = GOOD if verdict == "PASS" else BAD
            tw = d.textlength(verdict, font=font(19, True))
            d.text((x0 + panel_w - tw - 12, y0 + 8), verdict, font=font(19, True), fill=color)

    out = os.path.join(ROOT, cfg["out"])
    os.makedirs(os.path.dirname(out), exist_ok=True)
    sheet.save(out)
    print("wrote", out, sheet.size)


if __name__ == "__main__":
    main(json.load(open(sys.argv[1], encoding="utf-8-sig")))
