#!/usr/bin/env python3
"""make_strip_sheet.py -- compose a labelled horizontal proof strip.

Used for motion proofs: a row of keyframe renders (idle, lowering, water
contact, lifting, settled) with per-panel labels and optional PASS/FAIL badges
from a paired review JSON (keys matched by panel id).

Usage:
  python tools/make_strip_sheet.py <sheet.json>

sheet.json:
  {
    "name": "U4 Pulley Motion Proof",
    "panels": [{"id": "idle", "label": "IDLE", "image": "path.png"}, ...],
    "review": "scratchpad/.../motion_review.json",   # optional; views[id].verdict
    "note": "one lens, five keyed moments",
    "out": "scratchpad/.../motion_sheet.png"
  }
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


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
    panels = cfg["panels"]
    pad, head_h = 16, 78
    panel_w, panel_h = 470, 388
    W = pad * (len(panels) + 1) + panel_w * len(panels)
    H = head_h + pad * 2 + panel_h
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
    d.text((pad, 14), cfg["name"], font=font(34, True), fill=GOLD)
    d.text((pad, 52), cfg.get("note", ""), font=font(17), fill=SUB)

    for i, panel in enumerate(panels):
        x0 = pad + i * (panel_w + pad)
        y0 = head_h + pad
        d.rectangle([x0, y0, x0 + panel_w, y0 + panel_h], outline=(64, 60, 54), width=2)
        try:
            im = Image.open(os.path.join(ROOT, panel["image"])).convert("RGB")
            im = fit(im, panel_w - 10, panel_h - 40)
            sheet.paste(im, (x0 + (panel_w - im.width) // 2,
                             y0 + 34 + (panel_h - 40 - im.height) // 2))
        except Exception:
            d.text((x0 + 10, y0 + 44), f"[missing: {panel.get('image')}]",
                   font=font(15), fill=BAD)
        d.text((x0 + 8, y0 + 7), panel["label"], font=font(17, True), fill=INK)
        verdict = verdicts.get(panel.get("id", ""), "")
        if verdict:
            color = GOOD if verdict == "PASS" else BAD
            tw = d.textlength(verdict, font=font(17, True))
            d.text((x0 + panel_w - tw - 10, y0 + 7), verdict, font=font(17, True), fill=color)

    out = os.path.join(ROOT, cfg["out"])
    os.makedirs(os.path.dirname(out), exist_ok=True)
    sheet.save(out)
    print("wrote", out, sheet.size)


if __name__ == "__main__":
    main(json.load(open(sys.argv[1], encoding="utf-8-sig")))
