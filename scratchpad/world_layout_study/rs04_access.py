"""Distances from town centres to first resources/services (study only)."""
import sys, os, re, collections
import numpy as np
from collections import deque
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rs04_load import load
d = load(); X0, Z0, W, H = d["X0"], d["Z0"], d["W"], d["H"]
hgt, over, flags, present = d["height"], d["over"], d["flags"], d["present"]
ln, nn = d["locnames"], d["npcnames"]
water = present & np.isin(over, [6, 7, 41]); land = present & ~water
blocked = present & ((flags & 1) != 0)
br = np.load(os.path.join(__import__("tempfile").gettempdir(), "cr_world_layout_rs04_bridge.npy"))  # made by rs04_measure.py
walk = (land & ~blocked) | br
TARGETS = {
  "tree": lambda n, s: s == 10 and n in ("tree", "tree2", "tree3", "lighttree", "lighttree2"),
  "oak": lambda n, s: n == "oaktree", "willow": lambda n, s: n == "willow_tree",
  "copper/tin rock": lambda n, s: re.match(r"(copper|tin)rock\d", n) is not None,
  "iron rock": lambda n, s: re.match(r"ironrock\d", n) is not None,
  "range/fire": lambda n, s: n == "range_icon", "anvil": lambda n, s: n == "anvil_icon", "furnace": lambda n, s: n == "furnace_icon",
  "bank": lambda n, s: n == "bank_store_icon", "general store": lambda n, s: n == "general_store_icon", "altar": lambda n, s: n == "altar_icon",
  "dungeon": lambda n, s: n == "dungeonentrance_icon", "well/water": lambda n, s: n == "water_source_icon",
  "wheat field": lambda n, s: n == "wheat",
}
NPCT = {"fishing spot": lambda n: n.startswith("0_") and "fish" in n, "cow": lambda n: n in ("cow", "cow2", "cowcalf"),
        "chicken": lambda n: n.startswith("chicken"), "goblin": lambda n: n.startswith("goblin"), "man/woman": lambda n: n in ("man", "woman", "man2", "man3", "woman2", "woman3")}
pts = collections.defaultdict(list)
for lv, ax, az, lid, s, a in d["locs"]:
    if lv: continue
    n = ln.get(lid, "")
    for k, f in TARGETS.items():
        if f(n, s): pts[k].append((ax - X0, az - Z0))
for lv, ax, az, nid in d["npcs"]:
    if lv: continue
    n = nn.get(nid, "")
    for k, f in NPCT.items():
        if f(n): pts[k].append((ax - X0, az - Z0))
tgt = {k: set(v) for k, v in pts.items()}
def bfs(sx, sz, lim=400):
    dist = np.full((W, H), -1, np.int32); dist[sx, sz] = 0; q = deque([(sx, sz)]); found = {}
    while q:
        x, z = q.popleft(); dv = dist[x, z]
        if dv > lim: break
        for k, S in tgt.items():
            if k not in found:
                # target tile itself may be blocked (tree/rock): accept adjacency
                for ddx in (-1, 0, 1):
                    for ddz in (-1, 0, 1):
                        if (x + ddx, z + ddz) in S: found[k] = dv
        for dx in (-1, 0, 1):
            for dz in (-1, 0, 1):
                nx, nz = x + dx, z + dz
                if (dx or dz) and 0 <= nx < W and 0 <= nz < H and dist[nx, nz] < 0 and walk[nx, nz]:
                    if dx and dz and not (walk[x + dx, z] and walk[x, z + dz]): continue
                    dist[nx, nz] = dv + 1; q.append((nx, nz))
    return found
CEN = {"Lumbridge": (3222, 3218), "Draynor": (3093, 3248), "Varrock": (3212, 3428), "Falador": (2965, 3378),
       "Edgeville": (3094, 3494), "Al Kharid": (3293, 3180), "Port Sarim": (3023, 3220), "Barbarian Village": (3082, 3420)}
keys = list(TARGETS) + list(NPCT)
print("walked tiles from town centre to nearest (blank = >400)")
print("%-18s" % "", " ".join("%6s" % k[:6] for k in keys))
for t, (ax, az) in CEN.items():
    gx, gz = ax - X0, az - Z0
    if not walk[gx, gz]:
        ys, zs = np.nonzero(walk[gx - 5:gx + 6, gz - 5:gz + 6]); gx, gz = gx - 5 + ys[0], gz - 5 + zs[0]
    f = bfs(gx, gz)
    print("%-18s" % t, " ".join("%6s" % (f.get(k, "")) for k in keys))
# wilderness edge distance
print("\nwalked tiles to z=3520 from Edgeville centre, Varrock centre, Barbarian Village:")
for t in ("Edgeville", "Varrock", "Barbarian Village", "Falador"):
    ax, az = CEN[t]
    print("  %-18s straight %d" % (t, 3520 - az))
