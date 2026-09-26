"""Tutorial-island proportions (study only): island size, relief, spacing of instructors."""
import sys, os, collections, re
import numpy as np
from scipy import ndimage
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rs04_load import load
d = load(); X0, Z0 = d["X0"], d["Z0"]
hgt, over, flags, present = d["height"], d["over"], d["flags"], d["present"]
ln, nn = d["locnames"], d["npcnames"]
water = present & np.isin(over, [6, 7, 41]); land = present & ~water
indoor = present & ((flags & 4) != 0)
T = 16.0
lab, n = ndimage.label(land, structure=np.ones((3, 3)))
cid = lab[3100 - X0, 3100 - Z0]
isl = lab == cid
xs, zs = np.nonzero(isl)
print("island land tiles", isl.sum(), "bbox x", xs.min() + X0, xs.max() + X0, "z", zs.min() + Z0, zs.max() + Z0,
      "w", xs.max() - xs.min() + 1, "h", zs.max() - zs.min() + 1)
hh = hgt[isl]
print("island heights (tiles): min %.2f p5 %.2f p50 %.2f p95 %.2f max %.2f" % tuple(np.percentile(hh, [0, 5, 50, 95, 100]) / T))
# height histogram in 1-tile bands
hist = np.bincount((hh / T).astype(int))
print("height band shares (1-tile bands):", [round(v / hh.size, 3) for v in hist])
# slope
dx = np.abs(np.diff(hgt, axis=0)); dz = np.abs(np.diff(hgt, axis=1))
sl = np.zeros(hgt.shape); sl[:-1, :] = np.maximum(sl[:-1, :], dx); sl[:, :-1] = np.maximum(sl[:, :-1], dz)
s = sl[isl] / T
print("slope bands: flat<1/16 %.2f gentle %.2f moderate %.2f steep %.2f cliff>1 %.2f" % (
    (s < 1 / 16).mean(), ((s >= 1 / 16) & (s < .25)).mean(), ((s >= .25) & (s < .5)).mean(), ((s >= .5) & (s < 1)).mean(), (s >= 1).mean()))
# coast distance vs height: shows how the island rises from shore
dist_coast = ndimage.distance_transform_edt(isl)
for lo, hi in ((0, 2), (2, 5), (5, 10), (10, 20), (20, 40)):
    m = isl & (dist_coast > lo) & (dist_coast <= hi)
    if m.any():
        print("  dist from shore %2d-%2d tiles: mean height %.2f tiles (p10 %.2f p90 %.2f) n=%d" % (lo, hi, hgt[m].mean() / T, np.percentile(hgt[m], 10) / T, np.percentile(hgt[m], 90) / T, m.sum()))
# buildings on island
bl, nb = ndimage.label(indoor & isl)
print("buildings (indoor comps):")
for i, o in enumerate(ndimage.find_objects(bl), 1):
    a = int((bl[o] == i).sum())
    if a >= 4:
        print("   %dx%d area %d at (%d,%d) floor h %.2f tiles" % (o[0].stop - o[0].start, o[1].stop - o[1].start, a, o[0].start + X0, o[1].start + Z0, hgt[o][bl[o] == i].mean() / T))
# instructors / npcs on island
print("npcs on island:")
guides = []
for lv, ax, az, nid in d["npcs"]:
    gx, gz = ax - X0, az - Z0
    if lv == 0 and 0 <= gx < isl.shape[0] and 0 <= gz < isl.shape[1] and (isl[gx, gz] or water[gx, gz]) and 3050 < ax < 3160 and 3050 < az < 3140:
        nm = nn.get(nid, "?")
        print("   ", nm, ax, az, "h %.2f" % (hgt[gx, gz] / T), "indoor" if indoor[gx, gz] else "")
        guides.append((nm, ax, az))
# loc census on island
c = collections.Counter()
for lv, ax, az, lid, shp, ang in d["locs"]:
    gx, gz = ax - X0, az - Z0
    if lv == 0 and 0 <= gx < isl.shape[0] and 0 <= gz < isl.shape[1] and isl[gx, gz]:
        c[(ln.get(lid, "?"), shp)] += 1
print("loc census (non-ground-decor):", [(k, v) for k, v in c.most_common(80) if k[1] != 22][:60])
print("ground decor:", [(k[0], v) for k, v in c.most_common(80) if k[1] == 22][:25])
# path share
path = np.isin(over, [10, 34, 14, 15, 16, 22, 23, 12, 21]) & ~indoor
print("island path share of outdoor land %.3f" % path[isl & ~indoor].mean())
# ladders / cave entrance
for lv, ax, az, lid, shp, ang in d["locs"]:
    nm = ln.get(lid, "")
    gx, gz = ax - X0, az - Z0
    if lv == 0 and 0 <= gx < isl.shape[0] and 0 <= gz < isl.shape[1] and isl[gx, gz] and re.search("ladder|trapdoor|gate|door|stairs", nm):
        print("   entrance-ish:", nm, shp, ax, az, "indoor" if indoor[gx, gz] else "outdoor", "h %.2f" % (hgt[gx, gz] / T))

# ---- water body at the fishing spots + route legs ----
wl, nw = ndimage.label(water)
w_id = wl[3101 - X0, 3091 - Z0]
wm = wl == w_id
wx, wz = np.nonzero(wm)
print("fishing water body: tiles", wm.sum(), "bbox %dx%d" % (np.ptp(wx) + 1, np.ptp(wz) + 1), "surface h %.2f tiles" % (hgt[wm].mean() / T),
      "touches sea?", bool(wm.sum() > 20000))
rim = ndimage.binary_dilation(wm, iterations=3) & ~wm & land
print("   land within 3 tiles of it: mean h %.2f, max %.2f tiles" % (hgt[rim].mean() / T, hgt[rim].max() / T))
from collections import deque
walk = isl & ((flags & 1) == 0)
def bfs(a, b):
    sx, sz = a[0] - X0, a[1] - Z0
    dist = np.full(walk.shape, -1, np.int32); dist[sx, sz] = 0; q = deque([(sx, sz)])
    while q:
        x, z = q.popleft()
        for dx in (-1, 0, 1):
            for dz in (-1, 0, 1):
                nx, nz = x + dx, z + dz
                if (dx or dz) and dist[nx, nz] < 0 and walk[nx, nz]:
                    dist[nx, nz] = dist[x, z] + 1; q.append((nx, nz))
    return dist[b[0] - X0, b[1] - Z0]
ROUTE = [("start house guide", (3094, 3107)), ("survival (fish/fire/wood)", (3103, 3095)), ("cook", (3075, 3085)),
         ("quest guide", (3085, 3122)), ("(cave ladder down)", (3088, 3119)), ("(ladder up)", (3111, 3126)),
         ("bank/advisor", (3122, 3124)), ("chapel", (3125, 3106)), ("magic instructor", (3141, 3088))]
tot = 0
for (na, a), (nb, b) in zip(ROUTE, ROUTE[1:]):
    if na == "(cave ladder down)":
        print("   %-26s -> %-26s (underground: mining + combat)" % (na, nb)); continue
    dd = int(bfs(a, b)); tot += dd
    ha, hb = hgt[a[0] - X0, a[1] - Z0] / T, hgt[b[0] - X0, b[1] - Z0] / T
    print("   %-26s -> %-26s %3d tiles  walk %3ds run %3ds   height %.2f -> %.2f" % (na, nb, dd, dd * .6, dd * .3, ha, hb))
print("   surface route total %d tiles (%.0fs walk)" % (tot, tot * .6))

# ---- densities for the gap table ----
FEN = re.compile(r"fencing|railing|fence|drystonewall|poshwallfencing")
TREE = re.compile(r"tree")
FLOW = re.compile(r"daisys|flower|plant\d|fern|bush")
GD = re.compile(r"grass_|twig|dugupsoil|sticks|leaves|stones|gravel")
cnt = collections.Counter()
for lv, ax, az, lid, shp, ang in d["locs"]:
    gx, gz = ax - X0, az - Z0
    if lv or not (0 <= gx < isl.shape[0] and 0 <= gz < isl.shape[1]) or not isl[gx, gz]: continue
    nm = ln.get(lid, "")
    if shp in (0, 1, 2, 3, 9) and FEN.search(nm): cnt["fence edges"] += 1
    elif shp in (10, 11) and TREE.search(nm) and "stump" not in nm: cnt["trees"] += 1
    elif shp in (10, 11) and FLOW.search(nm): cnt["flowers/plants"] += 1
    elif shp == 22 and GD.search(nm): cnt["ground decor"] += 1
    elif shp in (10, 11) and not indoor[gx, gz]: cnt["other outdoor objects"] += 1
nL = int(isl.sum())
print("TI densities per 100 land tiles:", {k: round(v / nL * 100, 2) for k, v in cnt.items()}, "raw", dict(cnt))
