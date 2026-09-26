"""Fields, fences, building frontage (study only)."""
import sys, os, re, collections
import numpy as np
from scipy import ndimage
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rs04_load import load
d = load(); X0, Z0, W, H = d["X0"], d["Z0"], d["W"], d["H"]
over, flags, present, under = d["over"], d["flags"], d["present"], d["under"]
ln = d["locnames"]
water = present & np.isin(over, [6, 7, 41]); land = present & ~water
indoor = present & ((flags & 4) != 0)
path = land & ~indoor & np.isin(over, [10, 34, 14, 15, 16, 22, 23, 12, 21])
crop = np.zeros((W, H), bool); fence = np.zeros((W, H), bool)
FEN = re.compile(r"fencing|railing|fence|drystonewall|poshwallfencing|timberdefence|hedge")
for lv, ax, az, lid, s, a in d["locs"]:
    if lv: continue
    gx, gz = ax - X0, az - Z0
    if not (0 <= gx < W and 0 <= gz < H): continue
    n = ln.get(lid, "")
    if n in ("wheat", "potato", "cabbage", "flax_ground", "onion"): crop[gx, gz] = True
    if (s in (0, 1, 2, 3, 9) and FEN.search(n)) or n.startswith("hedge"): fence[gx, gz] = True
lab, n = ndimage.label(ndimage.binary_closing(crop, iterations=1) | crop)
rows = []
for i, sl in enumerate(ndimage.find_objects(lab), 1):
    m = lab[sl] == i
    if m.sum() < 6: continue
    ring = ndimage.binary_dilation(lab == i, iterations=2)[sl[0].start - 2 if sl[0].start >= 2 else 0: sl[0].stop + 2, sl[1].start - 2 if sl[1].start >= 2 else 0: sl[1].stop + 2]
    fz = fence[max(0, sl[0].start - 2): sl[0].stop + 2, max(0, sl[1].start - 2): sl[1].stop + 2]
    perim = ring & ~(lab[max(0, sl[0].start - 2): sl[0].stop + 2, max(0, sl[1].start - 2): sl[1].stop + 2] == i)
    rows.append((sl[0].stop - sl[0].start, sl[1].stop - sl[1].start, int(m.sum()), float(fz[perim].mean() > 0.15)))
rows.sort(key=lambda r: -r[2])
print("crop fields (>=6 plants):", len(rows))
print("  size w x h, plants, fenced? :", rows[:25])
print("  median bbox %s x %s, median plants %d, share fenced %.2f" % (np.median([min(r[0], r[1]) for r in rows]), np.median([max(r[0], r[1]) for r in rows]), np.median([r[2] for r in rows]), np.mean([r[3] for r in rows])))
# building frontage: distance from building footprint to nearest path tile
dist_path = ndimage.distance_transform_edt(~path)
bl, nb = ndimage.label(indoor)
dd = []
for i, sl in enumerate(ndimage.find_objects(bl), 1):
    m = bl[sl] == i
    if m.sum() < 9: continue
    edge = ndimage.binary_dilation(bl[sl] == i, iterations=1) & ~m
    # need padded: use a padded window
    x0, x1, z0, z1 = max(0, sl[0].start - 1), sl[0].stop + 1, max(0, sl[1].start - 1), sl[1].stop + 1
    mm = bl[x0:x1, z0:z1] == i
    ring = ndimage.binary_dilation(mm) & ~mm
    dd.append(dist_path[x0:x1, z0:z1][ring].min())
dd = np.array(dd)
print("buildings (area>=9): %d; distance from wall to nearest outdoor path tile: pct %s; share <=1 tile %.2f, <=3 %.2f" % (len(dd), np.percentile(dd, [25, 50, 75, 90]).round(1), (dd <= 1).mean(), (dd <= 3).mean()))
# underlay mixing: distinct underlays per 64 square & boundary share
ub = np.zeros((W, H), bool)
ub[:-1, :] |= (under[:-1, :] != under[1:, :]) & land[:-1, :] & land[1:, :]
ub[:, :-1] |= (under[:, :-1] != under[:, 1:]) & land[:, :-1] & land[:, 1:]
ds = []; bs = []
for mx in range(W // 64):
    for mz in range(H // 64):
        sl = (slice(mx * 64, mx * 64 + 64), slice(mz * 64, mz * 64 + 64)); lt = land[sl]
        if lt.sum() < 1200: continue
        c = collections.Counter(under[sl][lt].tolist()); ds.append(sum(1 for v in c.values() if v > 40)); bs.append(ub[sl][lt].mean())
print("underlay types (>40 tiles) per land square pct", np.percentile(ds, [25, 50, 75, 90]), " share of land tiles on an underlay boundary", np.percentile(bs, [25, 50, 75]).round(3))
