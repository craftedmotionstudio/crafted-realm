"""Slope of walkable vs blocked tiles, and grade along paths (study only)."""
import sys, os
import numpy as np
from scipy import ndimage
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rs04_load import load
d = load(); X0, Z0 = d["X0"], d["Z0"]
hgt, over, flags, present = d["height"], d["over"], d["flags"], d["present"]
T = 16.0
water = present & np.isin(over, [6, 7, 41]); land = present & ~water
indoor = present & ((flags & 4) != 0); blocked = present & ((flags & 1) != 0)
path = land & ~indoor & np.isin(over, [10, 34, 14, 15, 16, 22, 23, 12, 21])
road = land & ~indoor & np.isin(over, [10, 34])
cliffo = land & np.isin(over, [1, 2, 3, 4, 25, 26])
dx = np.zeros(hgt.shape); dz = np.zeros(hgt.shape)
dx[:-1, :] = np.abs(np.diff(hgt, axis=0)); dz[:, :-1] = np.abs(np.diff(hgt, axis=1))
both_x = np.zeros(hgt.shape, bool); both_x[:-1, :] = land[:-1, :] & land[1:, :]
both_z = np.zeros(hgt.shape, bool); both_z[:, :-1] = land[:, :-1] & land[:, 1:]
s = np.maximum(np.where(both_x, dx, 0), np.where(both_z, dz, 0)) / T
core = np.zeros(hgt.shape, bool); core[2880 - X0:3400 - X0, 3136 - Z0:3968 - Z0] = True
def p(m, name):
    v = s[m & core]
    print("%-34s n=%7d  p50 %.3f p90 %.3f p99 %.3f max %.2f  share>=0.5 %.3f share>=1 %.3f" % (name, v.size, *np.percentile(v, [50, 90, 99]), v.max(), (v >= .5).mean(), (v >= 1).mean()))
p(land & ~blocked & ~indoor, "walkable outdoor land")
p(land & blocked & ~indoor, "blocked land (no water)")
p(path, "any path")
p(road, "stone road")
p(indoor, "indoor floors")
p(cliffo, "cliff-overlay tiles")
# how steep tiles are handled: share of slope>=1 tiles that are blocked or carry a cliff overlay / a loc
st = (s >= 1) & land & core
print("tiles with rise>=1 tile: %d, blocked %.2f, cliff overlay %.2f" % (st.sum(), (blocked[st]).mean(), cliffo[st].mean()))
# cliff heights: for blocked bands, height difference between walkable tiles on either side within 3 tiles
lab, n = ndimage.label(blocked & land & core)
sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
drops = []
for i, sl in enumerate(ndimage.find_objects(lab), 1):
    if sizes[i - 1] < 6: continue
    m = lab[sl] == i
    x0, x1 = max(0, sl[0].start - 3), sl[0].stop + 3; z0, z1 = max(0, sl[1].start - 3), sl[1].stop + 3
    ring = ndimage.binary_dilation(lab[x0:x1, z0:z1] == i, iterations=2) & ~(lab[x0:x1, z0:z1] == i) & land[x0:x1, z0:z1] & ~blocked[x0:x1, z0:z1]
    if ring.sum() >= 4:
        hh = hgt[x0:x1, z0:z1][ring]
        drops.append((np.percentile(hh, 95) - np.percentile(hh, 5)) / T)
drops = np.array(drops)
print("blocked-band groups (>=6 tiles): %d; walkable-rim height span pct: %s" % (len(drops), np.percentile(drops, [25, 50, 75, 90, 99]).round(2)))
print("  share of blocked groups whose rims differ by >=2 tiles (i.e. real cliffs/ledges): %.2f" % (drops >= 2).mean())
