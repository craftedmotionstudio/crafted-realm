"""Plot a Holm height grid (v1 live or v2 proposal) with places, creek, paths.  Study figure only."""
import json, sys
import numpy as np
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import LightSource
ROOT = "C:/Users/iQwaZ/OneDrive/Desktop/CraftedRealms-Claude/"
grid = sys.argv[1] if len(sys.argv) > 1 else "_holm_v1_grid.json"
out = sys.argv[2] if len(sys.argv) > 2 else "fig_holm_v1.png"
title = sys.argv[3] if len(sys.argv) > 3 else "Tutor's Holm v1 (live Sept 13 terrain)"
g = json.load(open(grid))
H = np.array(g["h"]); Wt = np.array(g["water"])
plan = json.load(open(ROOT + "assets/holm_island/data/plan.json", encoding="utf8"))
fig, ax = plt.subplots(figsize=(12, 10.7), dpi=110)
ls = LightSource(azdeg=315, altdeg=40)
Hm = np.where(Wt == 1, np.nan, H)
from matplotlib.colors import LinearSegmentedColormap
cmap = LinearSegmentedColormap.from_list("holm", [(0, "#c9b98a"), (.08, "#5f8f3a"), (.3, "#8fb85a"), (.5, "#c8c07a"), (.7, "#a88a5a"), (.85, "#8a7a6a"), (1, "#e8e4dc")])
norm = plt.Normalize(-1, 18)
rgb = ls.shade(np.nan_to_num(Hm, nan=-1), cmap=cmap, norm=norm, blend_mode="soft", vert_exag=3)
rgb[Wt == 1] = [0.55, 0.68, 0.82, 1]
rgb[Wt == 2] = [0.25, 0.45, 0.85, 1]
if "pond" in g:
    for (x, z) in g["pond"]:
        rgb[z, x] = [0.2, 0.4, 0.9, 1]
ax.imshow(rgb, origin="upper", extent=(0, 144, 128, 0))
cs = ax.contour(np.arange(144) + .5, np.arange(128) + .5, Hm, levels=np.arange(1, 19, 1), colors="k", linewidths=.35, alpha=.55)
ax.clabel(cs, levels=np.arange(2, 19, 2), fontsize=6, fmt="%d")
for p in (g.get("places") or plan["places"]):
    ax.add_patch(plt.Rectangle((p["x"] - p["w"] / 2, p["z"] - p["d"] / 2), p["w"], p["d"], fill=False, ec="#8b0000", lw=1.3))
    ax.text(p["x"], p["z"], p.get("label", p["id"]), ha="center", va="center", fontsize=7, color="#5a0000", weight="bold")
for pa in (g.get("paths") or plan["paths"]):
    pts = np.array(pa["points"])
    ax.plot(pts[:, 0], pts[:, 1], color="#6b4a1f" if pa.get("kind") == "primary" else "#a07a42", lw=2.2 if pa.get("kind") == "primary" else 1.3, alpha=.9)
for m in g.get("marks", []):
    ax.plot(m["x"], m["z"], m.get("marker", "o"), color=m.get("color", "k"), ms=m.get("ms", 5))
    ax.text(m["x"] + 1, m["z"] - 1, m["label"], fontsize=6.5, color=m.get("color", "k"))
ax.set_xlim(0, 144); ax.set_ylim(128, 0)
ax.set_xticks(range(0, 145, 16)); ax.set_yticks(range(0, 129, 16)); ax.grid(alpha=.25, lw=.4)
ax.set_title(title + "  (north up = -z; contours every 1 tile)", fontsize=10)
plt.tight_layout(); plt.savefig(out); print("wrote", out)
