"""Heartland plan figure for docs/rebuild/WORLD_CONTENT_PLAN.md.

Frame: server map, +x east, +z north, origin = the Hollow Well (Veyhollow Commons), 1 unit = 1 tile.
Run:  python heartland_map.py   ->  heartland_map.png + heartland_map.svg (same folder)
Planning figure only: shapes are schematic, the coordinates are the plan's anchors.
"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon, Circle, Rectangle, FancyBboxPatch

HERE = os.path.dirname(os.path.abspath(__file__))

SEA = "#6f93ad"
fig, ax = plt.subplots(figsize=(13, 17), dpi=110)
ax.set_facecolor("#8fae6a")  # temperate heartland grass

def poly(pts, fc, ec="none", alpha=1.0, z=1, lw=0.8, ls="-"):
    ax.add_patch(Polygon(pts, closed=True, fc=fc, ec=ec, alpha=alpha, zorder=z, lw=lw, ls=ls))

def line(pts, color, lw, z=5, ls="-", alpha=1.0):
    xs, zs = zip(*pts)
    ax.plot(xs, zs, color=color, lw=lw, zorder=z, ls=ls, alpha=alpha, solid_capstyle="round")

# ---------------------------------------------------------------- sea (south coast, south-east bay, east coast)
poly([(-260, -215), (-150, -212), (-60, -205), (20, -170), (55, -140), (70, -128), (95, -112), (130, -92),
      (165, -100), (185, -106), (215, -100), (255, -80), (285, -40), (292, 60), (300, 200), (292, 300),
      (300, 420), (310, 560), (330, 560), (330, -260), (-260, -260)], SEA, z=0.5)
# west fells (unexplored mountains)
poly([(-260, -205), (-238, -120), (-244, 40), (-236, 180), (-248, 300), (-260, 300)], "#8a8574", z=0.6)

# ---------------------------------------------------------------- biome regions
# Scarlands (north of the Ditch)
poly([(-262, 300), (292, 300), (300, 420), (310, 560), (-262, 560)], "#4a3f3a", z=0.8)
poly([(-262, 460), (300, 460), (305, 560), (-262, 560)], "#382f2c", z=0.85)          # deep band L21+
# Emberwood (autumn forest, west)
poly([(-236, -40), (-150, -45), (-95, -30), (-60, -8), (-58, 30), (-80, 85), (-150, 110), (-236, 95)], "#b8753a", alpha=0.85, z=1)
# Gloomfen (drowned fen, south)
poly([(-160, -78), (-60, -72), (10, -80), (40, -110), (20, -168), (-60, -200), (-150, -206), (-200, -170), (-190, -110)], "#6b5a86", alpha=0.9, z=1)
# Ashar Dunes (east desert) + deep dunes
poly([(96, 60), (96, -30), (110, -60), (150, -80), (200, -85), (250, -70), (286, -38), (292, 70), (220, 90), (150, 85)], "#d9c28a", z=1)
poly([(205, 80), (205, -80), (250, -70), (286, -38), (292, 70), (240, 88)], "#c9ae6e", z=1.05)
# Stonereach crag
poly([(55, 10), (70, 45), (100, 55), (112, 30), (98, 8), (72, 2)], "#9a948a", z=1.1)
# Whitmoor highlands (snow)
poly([(-250, 190), (-200, 175), (-150, 200), (-125, 250), (-140, 298), (-252, 298)], "#e6eaee", z=1)
# Brynholt frost coast
poly([(180, 215), (230, 205), (292, 215), (292, 298), (190, 298), (170, 260)], "#b9c7cf", z=1)
# Aldermarch farmland ring (lighter green)
poly([(-95, 135), (80, 130), (110, 190), (100, 262), (-100, 268), (-120, 200)], "#9dbb74", alpha=0.7, z=0.9)

# ---------------------------------------------------------------- water
# River Vey: west fells -> Emberford -> Spire Isle -> south of Veyhollow -> Mirrorpond -> Veymouth
vey = [(-250, 18), (-205, 8), (-170, -4), (-140, -12), (-110, -18), (-85, -28), (-60, -30), (-30, -26),
       (0, -24), (20, -26), (32, -34), (40, -42)]
line(vey, "#4f7fa6", 5.0, z=2)
line([(40, -58), (52, -80), (60, -105), (70, -128)], "#4f7fa6", 6.0, z=2)
ax.add_patch(Circle((40, -50), 14, fc="#4f7fa6", ec="none", zorder=2))          # Mirrorpond (schematic)
ax.add_patch(Circle((52, -52), 11, fc="#4f7fa6", ec="none", zorder=2))
# Hollow Brook (feeds the keep moat) and Alder Beck (Aldermarch -> Brynstead -> Emberwood -> Vey)
line([(24, 70), (30, 40), (30, 16), (30, 0), (30, -24)], "#5d8db3", 2.2, z=2)
line([(-40, 290), (-70, 250), (-100, 200), (-108, 150), (-120, 95), (-128, 40), (-138, -10)], "#5d8db3", 2.4, z=2)
# fen channels
for ch in [[(-20, -40), (-25, -70), (-40, -100), (-70, -130), (-90, -170)], [(-40, -100), (0, -130), (10, -160)]]:
    line(ch, "#5a6f86", 1.6, z=2)
# oasis at Palmgate
ax.add_patch(Circle((140, -18), 5, fc="#4f7fa6", ec="none", zorder=2))

# ---------------------------------------------------------------- the Ditch (z = 300) + level ticks
line([(-262, 300), (292, 300)], "#111111", 4.5, z=6)
ax.plot([-46, -14], [300, 300], ls="none", marker="s", ms=6, color="#e8d9a0", zorder=7)
for lvl in range(1, 36, 5):
    zl = 300 + (lvl - 1) * 8
    ax.plot([300, 308], [zl, zl], color="#dddddd", lw=1, zorder=7)
    ax.text(311, zl, f"L{lvl}", fontsize=7, color="#222", va="center", zorder=7)

# ---------------------------------------------------------------- roads (3-wide dirt/cobble; schematic)
ROAD = "#7a5a34"
roads = [
    [(0, 0), (0, 26), (0, 62), (8, 100), (0, 150)],                                   # North Road
    [(0, 250), (-10, 262), (-30, 276)],                                                # city north gate -> Frontier Post
    [(-30, 276), (-46, 300)], [(-30, 276), (-14, 300)],                                # to the two Ditch crossings
    [(0, 0), (-26, 0), (-62, 2), (-72, -26), (-100, -16), (-138, -10)],                # West Road -> Spire bridge -> Emberford
    [(-138, -10), (-140, 45)],                                                         # Emberford -> Blackbriar lane
    [(-62, 2), (-70, 20), (-100, 70)],                                                 # logging camp -> Longbow Lodge
    [(0, 0), (26, 0), (30, 0), (36, 18), (74, 20)],                                    # East Road to the quarry
    [(74, 20), (98, 6), (110, -6), (128, -12)],                                                  # quarry -> Palm Gate -> Palmgate
    [(128, -12), (130, -68)], [(130, -68), (185, -95)], [(128, -12), (184, -36), (205, -20)],
    [(128, -12), (132, 35)],                                                           # Palmgate mine
    [(12, -24), (-10, -60), (-18, -98)],                                               # Fen Causeway to Reedwick
    [(12, -24), (-34, -42)],                                                           # mill lane
    [(-60, 205), (-105, 192), (-160, 215), (-200, 228)],                               # Highland Road (Brynstead -> Whitmoor)
    [(60, 195), (120, 215), (180, 235), (235, 250)],                                   # Salt/Frost Road to Brynholt
    [(-138, -10), (-128, 60), (-112, 140), (-105, 192)],                               # Old Forest Road (Emberford -> Brynstead)
    [(-30, 276), (-80, 282)],                                                          # to the monastery
]
for r in roads:
    line(r, ROAD, 2.2, z=4, ls=(0, (4, 2)))

# ---------------------------------------------------------------- Aldermarch walls
ax.add_patch(Rectangle((-60, 150), 120, 102, fc="#b7b2a6", ec="#4b4b4b", lw=2.2, zorder=3, alpha=0.95))
ax.add_patch(Rectangle((-8, 192), 16, 16, fc="#d6cfbf", ec="#4b4b4b", lw=1, zorder=3.1))   # square
# Whitmoor + Palmgate walls
ax.add_patch(Rectangle((-222, 212), 44, 34, fc="#f4f4f4", ec="#4b4b4b", lw=1.6, zorder=3))
ax.add_patch(Rectangle((110, -30), 38, 32, fc="#e4cf98", ec="#6b5a3a", lw=1.6, zorder=3))
# Veyhollow ring + keep
ax.add_patch(Circle((0, 0), 26, fc="#a9b78c", ec="#4b4b4b", lw=1.6, zorder=3))
ax.add_patch(Rectangle((34, -9), 22, 22, fc="#9b9b96", ec="#333", lw=1.6, zorder=3.2))
ax.add_patch(Circle((45, 2), 16, fc="none", ec="#4f7fa6", lw=2.5, zorder=3.1))            # moat

# ---------------------------------------------------------------- places
# (x, z, label, kind)  kind: T = town/city, V = village, S = site/landmark, D = dungeon, B = boss, G = guild
places = [
    (0, 0, "VEYHOLLOW\n(spawn town)", "T"), (45, 2, "Wardenholm Keep\n(respawn castle)", "S"),
    (0, -18, "ferry quay", "S"), (-34, -42, "Olun's Mill", "S"), (36, -14, "sawmill", "S"),
    (58, 30, "Moor Pasture", "S"), (74, 20, "Stonereach Quarry\n+ the Deeps", "D"),
    (-48, 44, "Seers' Ring", "S"), (-72, -30, "The Spire\n(isle)", "G"), (-70, 20, "logging camp", "S"),
    (-138, -10, "EMBERFORD\n(west village)", "V"), (-140, 45, "Blackbriar Manor", "D"),
    (-100, 70, "Longbow Lodge", "G"), (-180, 15, "canopy course", "S"), (-205, 55, "glimmerbark grove", "S"),
    (0, 62, "Watch Pass", "S"), (8, 100, "Wayfarer's Rest", "S"), (32, 112, "Grey Circle", "S"),
    (-30, 125, "south mine", "S"),
    (0, 200, "ALDERMARCH\n(walled city)", "T"), (-72, 160, "Wardens' Guildhall", "G"),
    (-88, 205, "Cooks' Hall", "G"), (80, 235, "lumberyard", "S"), (95, 210, "earth ruin", "S"), (-56, 58, "air ruin", "S"), (-20, -70, "Sallow + Ebb (Phase 1)", "S"),
    (-30, 276, "FRONTIER POST\n(bank, rules board)", "V"), (-80, 282, "Monastery\nof the Dawn", "G"),
    (-105, 192, "BRYNSTEAD", "V"), (-112, 176, "Four Seals Barrow", "D"),
    (-200, 228, "WHITMOOR HOLD", "T"), (-160, 270, "Frostpeak", "S"),
    (235, 250, "BRYNHOLT", "V"),
    (98, 6, "Palm Gate (toll)", "S"), (128, -12, "PALMGATE\n(desert town)", "T"), (132, 35, "Palmgate mine", "S"),
    (130, -68, "Proving Grounds\n(Oathring)", "G"), (184, -36, "nomad camp", "S"), (205, -20, "Heat Gate", "S"),
    (240, -44, "Sunken Cistern", "D"), (262, 4, "nature altar", "S"),
    (-18, -98, "REEDWICK\n(stilt village)", "V"), (-40, -140, "Gloomfen caves", "D"),
    (-70, -170, "Fenlord's\nDrowned Throne", "B"), (70, -128, "Veymouth", "S"),
    (185, -95, "SALTREACH PORT", "T"), (165, -78, "Crafters' Hall", "G"),
    (150, -190, "TUTOR'S HOLM", "V"),
    (-120, 345, "raider camp L6", "S"), (-60, 352, "Air Pillar L7", "S"), (40, 340, "Cinder mine L6", "S"), (60, 368, "Cinder Chapel L9", "S"), (-10, 382, "Scar run L11", "S"),
    (150, 415, "Warded Circle L15", "S"), (0, 430, "Old Veymarch ruins L17", "S"), (-150, 430, "wyrmling nests", "S"),
    (-40, 470, "the Slagfield L22", "S"), (100, 478, "Ash Wyrm L23", "B"), (-60, 500, "the Maw (Undercrag) L26", "D"),
]
style = {"T": ("s", 11, "#f2e6c8", "#222"), "V": ("s", 8, "#f2e6c8", "#222"), "S": ("o", 5, "#fff6d8", "#333"),
         "D": ("^", 8, "#3a2a1e", "#000"), "B": ("X", 9, "#b42a1e", "#000"), "G": ("D", 7, "#d8b04a", "#222")}
for x, z, label, kind in places:
    m, ms, fc, ec = style[kind]
    ax.plot([x], [z], marker=m, ms=ms, mfc=fc, mec=ec, ls="none", zorder=8)
    dark = z > 300 or kind in ("T",)
    fs = 8.5 if kind in ("T", "V") else 6.8
    weight = "bold" if kind in ("T", "V") else "normal"
    col = "#f3ead6" if z > 300 else "#111"
    ax.text(x + 4, z + 3, label, fontsize=fs, fontweight=weight, color=col, zorder=9, va="bottom")

# region labels
for x, z, t, col in [(-200, -30, "EMBERWOOD", "#4a2a10"), (-120, -150, "GLOOMFEN", "#f0e8ff"),
                     (215, 40, "ASHAR DUNES", "#6a5020"), (240, -60, "deep dunes", "#6a5020"),
                     (80, 318, "THE SCARLANDS  (PvP, level = 1 + (z-300)/8)", "#f3ead6"),
                     (0, 520, "deep Scarlands L21+  ->  the Undercrag below", "#f3ead6"),
                     (-235, 285, "WHITMOOR\nHIGHLANDS", "#333"), (80, -250, "SOUTHERN SEA", "#e8f0f6"),
                     (40, -64, "Mirrorpond", "#e8f0f6")]:
    ax.text(x, z, t, fontsize=10, color=col, fontweight="bold", ha="left", zorder=9, alpha=0.9)
ax.text(-258, 304, "THE DITCH  z = 300  (2 crossings at the Frontier Post)", fontsize=8, color="#f3ead6",
        fontweight="bold", zorder=9)

# ---------------------------------------------------------------- grid, scale, compass
for g in range(-256, 577, 64):
    ax.axhline(g, color="#000", lw=0.3, alpha=0.18, zorder=0.95)
for g in range(-256, 321, 64):
    ax.axvline(g, color="#000", lw=0.3, alpha=0.18, zorder=0.95)
ax.plot([-250, -150], [-245, -245], color="#111", lw=3, zorder=9)
ax.text(-250, -240, "100 tiles = 60 s walk / 30 s run    grid = 64-tile map squares", fontsize=8, zorder=9)
ax.annotate("N", xy=(285, 545), xytext=(285, 515), ha="center", fontsize=12, fontweight="bold",
            arrowprops=dict(arrowstyle="-|>", color="#111"), zorder=9)

ax.set_xlim(-262, 322)
ax.set_ylim(-260, 560)
ax.set_aspect("equal")
ax.set_xlabel("x (tiles, east +)")
ax.set_ylabel("z (tiles, north +)   origin = the Hollow Well")
ax.set_title("Crafted Realm heartland plan (WORLD_CONTENT_PLAN.md)  |  server frame, 1 unit = 1 tile", fontsize=11)

legend_items = [("s", 11, "#f2e6c8", "town / city"), ("s", 8, "#f2e6c8", "village"), ("D", 7, "#d8b04a", "guild / special hall"),
                ("^", 8, "#3a2a1e", "dungeon entrance"), ("X", 9, "#b42a1e", "boss lair"), ("o", 5, "#fff6d8", "site / landmark")]
for i, (m, ms, fc, lab) in enumerate(legend_items):
    ax.plot([222], [-178 - i * 12], marker=m, ms=ms, mfc=fc, mec="#222", ls="none", zorder=10)
    ax.text(230, -178 - i * 12, lab, fontsize=7.5, va="center", zorder=10, color="#f5f5f5")
ax.add_patch(FancyBboxPatch((214, -252), 100, 84, boxstyle="round,pad=2", fc="#3b556b", ec="none", alpha=0.85, zorder=9.5))

plt.tight_layout()
plt.savefig(os.path.join(HERE, "heartland_map.png"))
plt.savefig(os.path.join(HERE, "heartland_map.svg"))
print("wrote heartland_map.png / .svg")
