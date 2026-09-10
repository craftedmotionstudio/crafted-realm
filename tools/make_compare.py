#!/usr/bin/env python3
"""make_compare.py -- build a Complete/ comparison sheet for the reference loop.

Composes a side-by-side sheet: OSRS reference | Crafted Realms in-game, with a
header and direct Codex visual-review footer. Legacy two-reviewer JSON remains
supported so historical sheets can still be reproduced.

Usage:
  python tools/make_compare.py <sheet.json>

sheet.json:
  {
    "name": "Stall",
    "osrs": "Bible_References/Complete/Stall.jpg",
    "cr":   "scratchpad/cr_stall.jpg",
    "codex": 9.1,
    "review_note": "Gameplay-camera readability and silhouette are production-ready.",
    "verdict": "approved",
    "improve": "none for this slice",
    "out": "Bible_References/Complete/_compare/Stall_compare.png"
  }
"""
import json, os, sys, textwrap
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def font(sz, bold=False):
    names = (["arialbd.ttf", "seguisb.ttf"] if bold else ["arial.ttf", "segoeui.ttf"])
    for n in names:
        for p in (n, os.path.join("C:/Windows/Fonts", n)):
            try: return ImageFont.truetype(p, sz)
            except Exception: pass
    return ImageFont.load_default()

def fit(im, box_w, box_h):
    r = min(box_w / im.width, box_h / im.height)
    return im.resize((max(1,int(im.width*r)), max(1,int(im.height*r))), Image.LANCZOS)

def main(cfg):
    W = 1600
    pad = 24
    panel_w = (W - pad*3) // 2
    panel_h = 620
    head_h = 92
    foot_h = 250
    H = head_h + panel_h + foot_h + pad*2

    BG=(28,26,23); INK=(238,232,220); SUB=(176,168,152)
    GOLD=(226,178,64); GOOD=(120,196,120); WARN=(224,176,84); BAD=(220,110,96)
    sheet = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(sheet)

    # header
    d.text((pad, 22), cfg["name"], font=font(40, True), fill=GOLD)
    d.text((pad, 66), cfg.get("subtitle", "OSRS reference  vs  Crafted Realms in-game"),
           font=font(20), fill=SUB)

    # panels
    y0 = head_h + pad
    labels = [(cfg.get("left_label", "OLD SCHOOL RUNESCAPE"), cfg["osrs"]),
              (cfg.get("right_label", "CRAFTED REALMS"), cfg["cr"])]
    for i,(lab,path) in enumerate(labels):
        x0 = pad + i*(panel_w+pad)
        d.rectangle([x0, y0, x0+panel_w, y0+panel_h], outline=(64,60,54), width=2)
        try:
            im = Image.open(os.path.join(ROOT, path)).convert("RGB")
            im = fit(im, panel_w-16, panel_h-48)
            ox = x0 + (panel_w - im.width)//2
            oy = y0 + 40 + (panel_h-48 - im.height)//2
            sheet.paste(im, (ox, oy))
        except Exception as e:
            d.text((x0+12, y0+50), f"[missing: {path}]", font=font(18), fill=BAD)
        d.text((x0+12, y0+10), lab, font=font(20, True), fill=INK)

    # footer caption
    fy = y0 + panel_h + pad
    d.line([pad, fy, W-pad, fy], fill=(64,60,54), width=2)
    fy += 16
    def col(v): return GOOD if v>=9 else (WARN if v>=8 else BAD)
    if "codex" in cfg:
        score = float(cfg["codex"])
        d.text((pad, fy), "DIRECT CODEX VISUAL REVIEW", font=font(22, True), fill=SUB)
        d.text((pad, fy+34), f"Codex: {score:.1f} / 10", font=font(28, True), fill=col(score))
        bar = GOOD if score>=9 else WARN
        d.text((pad+440, fy+34), f"Verdict: {cfg.get('verdict','')}", font=font(24, True), fill=bar)
        note = cfg.get("review_note","")
        note_label = "Review: "
    else:
        cl, gm = float(cfg["claude"]), float(cfg["gemini"])
        d.text((pad, fy), "HISTORICAL TWO-REVIEWER GATE", font=font(22, True), fill=SUB)
        d.text((pad, fy+34), f"Claude-eye: {cl:.1f} / 10", font=font(28, True), fill=col(cl))
        d.text((pad+340, fy+34), f"Gemini Vision: {gm:.1f} / 10", font=font(28, True), fill=col(gm))
        bar = GOOD if (cl>=9 and gm>=9) else WARN
        d.text((pad+720, fy+34), f"Verdict: {cfg.get('verdict','')}", font=font(24, True), fill=bar)
        note = cfg.get("gemini_note","")
        note_label = "Historical Gemini note: "
    for j,line in enumerate(textwrap.wrap(note_label+note, 150)[:2]):
        d.text((pad, fy+82+j*26), line, font=font(18), fill=SUB)
    imp = cfg.get("improve","")
    if imp:
        for j,line in enumerate(textwrap.wrap("Next-pass target: "+imp, 150)[:2]):
            d.text((pad, fy+140+j*26), line, font=font(18), fill=GOLD)

    out = os.path.join(ROOT, cfg["out"])
    os.makedirs(os.path.dirname(out), exist_ok=True)
    sheet.save(out)
    print("wrote", out, sheet.size)

if __name__ == "__main__":
    main(json.load(open(sys.argv[1], encoding="utf-8")))
