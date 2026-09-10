#!/usr/bin/env python
"""recolor_gear_tiers.py — make per-tier metal variants of the bronze Nano Banana
gear sprites by recoloring ONLY the tierable metal (bronze blade/head/plate) to each
tier's metal colour, preserving shading, and leaving gold guards + leather grips.

Bronze metal is a mid-saturation tan; gold guards are more saturated/yellow and
leather grips darker/more saturated, so a hue+saturation swap gated on
saturation<~0.60, value>~0.34, hue in the bronze band recolours the metal only.

Input : Bible_References/UI_Icons/gear_nb/bronze_<template>.png (RGBA, keyed)
Output: assets/icons/gear/<tier>_<template>.png
Run   : python tools/recolor_gear_tiers.py [--test]
"""
import os, sys, colorsys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, 'Bible_References', 'UI_Icons', 'gear_nb')
OUT  = os.path.join(ROOT, 'assets', 'icons', 'gear')
os.makedirs(OUT, exist_ok=True)

# the 12 metal-tiered templates (id = <tier>_<template>)
TEMPLATES = ['longsword','sabre','battleaxe','kiteshield','helm','mace','warhammer',
             'greatsword','medhelm','sqshield','chainbody','plateskirt']
# tier -> metal hex (from src/game1_data.js TIERS). bronze is the source, skip it.
TIERS = {
 'copper':'#c6794a', 'iron':'#9aa0a8', 'steel':'#d0d4dc', 'whitsteel':'#e8ecf2',
 'aurel':'#d4a83e', 'veyrite':'#3ec6b4', 'undercrag':'#6a5a7a',
}

def hx(h):
    h=h.lstrip('#'); return tuple(int(h[i:i+2],16)/255 for i in (0,2,4))

def recolor(img, target_rgb):
    """Swap bronze-metal pixels to target hue/sat, keeping per-pixel value (shading)."""
    tr,tg,tb = target_rgb
    th,ts,tv = colorsys.rgb_to_hsv(tr,tg,tb)
    px = img.load(); W,H = img.size
    out = Image.new('RGBA',(W,H)); op = out.load()
    for y in range(H):
        for x in range(W):
            r,g,b,a = px[x,y]
            if a==0: op[x,y]=(0,0,0,0); continue
            h,s,v = colorsys.rgb_to_hsv(r/255,g/255,b/255)
            hue_deg = h*360
            # bronze/orange metal = warm hue <=40 (gold guards sit at ~43+, plume is
            # blue/purple, outline is near-black) — recolour those, protect the rest.
            is_metal = (hue_deg <= 40) and (s >= 0.15) and (v >= 0.22)
            if is_metal:
                # keep value (shading), adopt tier hue/sat; nudge value toward tier brightness a touch
                nv = min(1.0, v * (0.55 + 0.55*tv))
                nr,ng,nb = colorsys.hsv_to_rgb(th, ts, nv)
                op[x,y]=(int(nr*255),int(ng*255),int(nb*255),a)
            else:
                op[x,y]=(r,g,b,a)
    return out

def main():
    test = '--test' in sys.argv
    tiers = {'iron':TIERS['iron'],'steel':TIERS['steel'],'veyrite':TIERS['veyrite']} if test else TIERS
    tpls = ['longsword'] if test else TEMPLATES
    made=0
    for tpl in tpls:
        src = os.path.join(SRC, 'bronze_%s.png'%tpl)
        if not os.path.exists(src):
            print('MISS', src); continue
        base = Image.open(src).convert('RGBA')
        for tier,hexc in tiers.items():
            out = recolor(base, hx(hexc))
            dst = os.path.join(OUT, '%s_%s.png'%(tier,tpl))
            out.save(dst); made+=1
    print('made', made, 'sprites', '(test)' if test else '')

if __name__=='__main__':
    main()
