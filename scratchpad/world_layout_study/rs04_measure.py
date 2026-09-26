"""Measure 2004 world proportions (study only; prints summary numbers).

Run:  python rs04_measure.py > rs04_metrics.txt
Outputs only statistics (sizes, spacings, ratios).  No layout data is kept.
"""
import sys, os, json, collections, re
import numpy as np
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rs04_load import load, MAPS

d = load()
X0, Z0, W, H = d["X0"], d["Z0"], d["W"], d["H"]
hgt, over, under, flags, present = d["height"], d["over"], d["under"], d["flags"], d["present"]
ln, nn = d["locnames"], d["npcnames"]
T = 16.0  # h-units per tile of vertical rise
WALK, RUN = 0.6, 0.3  # seconds per tile

WATER_O = {6, 7, 41}
ROAD_O = {10, 34}                  # grey stone road (+bridge deck)
DIRT_O = {14, 15, 16, 22, 23, 12}  # dirt/mud/pebble paths
SAND_O = {21}
CLIFF_O = {1, 2, 3, 4, 25, 26}
water = present & np.isin(over, list(WATER_O))
indoor = present & ((flags & 4) != 0)
blocked = present & ((flags & 1) != 0)
land = present & ~water
road = land & ~indoor & np.isin(over, list(ROAD_O))
dirt = land & ~indoor & np.isin(over, list(DIRT_O | SAND_O))
path = road | dirt
cliff = land & np.isin(over, list(CLIFF_O))


# ---- bridges: level-1 tiles with bridge flag make level-0 water walkable ----
def bridge_mask():
    cache = os.path.join(__import__("tempfile").gettempdir(), "cr_world_layout_rs04_bridge.npy")  # 2004-derived: keep out of the repo
    if os.path.exists(cache):
        return np.load(cache)
    m = np.zeros((W, H), bool)
    for f in os.listdir(MAPS):
        if not f.endswith(".jm2"):
            continue
        mx, mz = map(int, f[1:-4].split("_"))
        bx, bz = mx * 64 - X0, mz * 64 - Z0
        if not (0 <= bx < W and 0 <= bz < H):
            continue
        sec = None
        for line in open(os.path.join(MAPS, f), encoding="utf8"):
            if line.startswith("===="):
                sec = line[5:8]
                continue
            if sec != "MAP" or not line.startswith("1 "):
                continue
            head, _, body = line.partition(":")
            _, lx, lz = map(int, head.split())
            for tok in body.split():
                if tok[0] == "f" and (int(tok[1:]) & 2):
                    m[bx + lx, bz + lz] = True
    np.save(cache, m)
    return m


bridge = bridge_mask()
walk = (land & ~blocked) | bridge

out = {}
P = print


def g(ax, az):
    return ax - X0, az - Z0


def pct(a, qs=(5, 25, 50, 75, 95)):
    a = np.asarray(a)
    if a.size == 0:
        return {}
    return {q: round(float(np.percentile(a, q)), 2) for q in qs}


# ---------------- buildings (indoor components) ----------------
lab, nb = ndimage.label(indoor, structure=[[0, 1, 0], [1, 1, 1], [0, 1, 0]])
objs = ndimage.find_objects(lab)
B = []
for i, sl in enumerate(objs, 1):
    area = int((lab[sl] == i).sum())
    if area < 4:
        continue
    w = sl[0].stop - sl[0].start
    h = sl[1].stop - sl[1].start
    B.append(dict(id=i, x0=sl[0].start, x1=sl[0].stop, z0=sl[1].start, z1=sl[1].stop,
                  w=w, h=h, area=area, cx=(sl[0].start + sl[0].stop) / 2, cz=(sl[1].start + sl[1].stop) / 2))
P("== BUILDINGS (indoor-flag components, level 0, area>=4) :", len(B))


def gap(a, b):
    dx = max(0, max(a["x0"], b["x0"]) - min(a["x1"], b["x1"]))
    dz = max(0, max(a["z0"], b["z0"]) - min(a["z1"], b["z1"]))
    return max(dx, dz)


# ---------------- towns ----------------
TOWNS = {  # approximate centres (absolute tiles), used only to pick clusters
    "Lumbridge": (3222, 3218), "Draynor Village": (3093, 3250), "Varrock": (3212, 3424),
    "Falador": (2965, 3380), "Port Sarim": (3023, 3220), "Rimmington": (2957, 3214),
    "Al Kharid": (3293, 3180), "Barbarian Village": (3082, 3420), "Edgeville": (3094, 3496),
    "Tutorial Island": (3100, 3100), "Brimhaven": (2760, 3178), "Catherby": (2809, 3436),
    "Seers Village": (2715, 3480), "East Ardougne": (2660, 3305), "Yanille": (2570, 3090),
    "Taverley": (2895, 3450), "Burthorpe": (2900, 3545), "Port Khazard": (2660, 3160),
    "Musa Point": (2918, 3170),
}
ICON = collections.defaultdict(list)
for (lv, ax, az, lid, shp, ang) in d["locs"]:
    if lv == 0 and ln.get(lid, "").endswith("_icon"):
        ICON[ln[lid]].append((ax, az))

# building adjacency graph with link gap <= LINK tiles
LINK = 14
cent = np.array([[b["cx"], b["cz"]] for b in B])
town_rows = []
town_members = {}
for name, (ax, az) in TOWNS.items():
    gx, gz = g(ax, az)
    dd = np.hypot(cent[:, 0] - gx, cent[:, 1] - gz)
    seed = int(np.argmin(dd))
    if dd[seed] > 40:
        continue
    mem = {seed}
    frontier = [seed]
    while frontier:
        k = frontier.pop()
        near = np.nonzero(np.hypot(cent[:, 0] - cent[k, 0], cent[:, 1] - cent[k, 1]) < 60)[0]
        for j in near:
            j = int(j)
            if j not in mem and gap(B[k], B[j]) <= LINK and np.hypot(cent[j, 0] - gx, cent[j, 1] - gz) < 110:
                mem.add(j)
                frontier.append(j)
    mb = [B[i] for i in mem]
    town_members[name] = mb
    x0 = min(b["x0"] for b in mb); x1 = max(b["x1"] for b in mb)
    z0 = min(b["z0"] for b in mb); z1 = max(b["z1"] for b in mb)
    areas = [b["area"] for b in mb]
    # nearest neighbour edge gaps
    nng = []
    for b in mb:
        gg = [gap(b, c) for c in mb if c is not b]
        if gg:
            nng.append(min(gg))
    box = (slice(x0, x1), slice(z0, z1))
    lt = land[box]
    outdoor_land = lt & ~indoor[box]
    hh = hgt[box][lt]
    # services
    svc = collections.Counter()
    for icon, pts in ICON.items():
        for (ix, iz) in pts:
            gx2, gz2 = g(ix, iz)
            if x0 - 6 <= gx2 <= x1 + 6 and z0 - 6 <= gz2 <= z1 + 6:
                svc[icon.replace("_icon", "")] += 1
    trees = 0
    for (lv, ax2, az2, lid, shp, ang) in d["locs"]:
        pass
    row = dict(town=name, n_buildings=len(mb), bbox_w=x1 - x0, bbox_h=z1 - z0,
               built_share=round(sum(areas) / max(1, (x1 - x0) * (z1 - z0)), 3),
               bldg_area_med=int(np.median(areas)), bldg_area_max=int(max(areas)),
               bldg_dims_med="%dx%d" % (np.median([min(b["w"], b["h"]) for b in mb]), np.median([max(b["w"], b["h"]) for b in mb])),
               nn_gap_med=float(np.median(nng)) if nng else None,
               path_share_outdoor=round(float(path[box][outdoor_land].mean()), 3) if outdoor_land.any() else None,
               road_share_outdoor=round(float(road[box][outdoor_land].mean()), 3) if outdoor_land.any() else None,
               water_share=round(float(water[box].mean()), 3),
               h_p5_p95_tiles=(round(np.percentile(hh, 5) / T, 2), round(np.percentile(hh, 95) / T, 2)) if hh.size else None,
               services=dict(svc), centre=(int((x0 + x1) / 2 + X0), int((z0 + z1) / 2 + Z0)))
    town_rows.append(row)
P("\n== TOWNS (cluster of buildings linked by <=%d-tile gaps)" % LINK)
for r in town_rows:
    P(json.dumps(r))
out["towns"] = town_rows

# global building size distribution (mainland only, excl. tiny)
areas = np.array([b["area"] for b in B])
mins = np.array([min(b["w"], b["h"]) for b in B]); maxs = np.array([max(b["w"], b["h"]) for b in B])
P("\n== BUILDING SIZE (all surface): area pct", pct(areas), "short side", pct(mins), "long side", pct(maxs))
P("  share area<=30:", round(float((areas <= 30).mean()), 2), " 31-80:", round(float(((areas > 30) & (areas <= 80)).mean()), 2),
  " 81-200:", round(float(((areas > 80) & (areas <= 200)).mean()), 2), " >200:", round(float((areas > 200).mean()), 2))

# ---------------- BFS path distances between towns ----------------
from collections import deque


def bfs(src):
    dist = np.full((W, H), -1, np.int32)
    sx, sz = src
    dist[sx, sz] = 0
    q = deque([src])
    nbr = [(1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)]
    while q:
        x, z = q.popleft()
        dv = dist[x, z] + 1
        for dx, dz in nbr:
            nx, nz = x + dx, z + dz
            if 0 <= nx < W and 0 <= nz < H and dist[nx, nz] < 0 and walk[nx, nz]:
                if dx and dz and not (walk[x + dx, z] and walk[x, z + dz]):
                    continue
                dist[nx, nz] = dv
                q.append((nx, nz))
    return dist


def snap(ax, az):
    gx, gz = g(ax, az)
    ys, zs = np.nonzero(walk[gx - 15:gx + 16, gz - 15:gz + 16] & ~indoor[gx - 15:gx + 16, gz - 15:gz + 16])
    k = int(np.argmin((ys - 15) ** 2 + (zs - 15) ** 2))
    return gx - 15 + int(ys[k]), gz - 15 + int(zs[k])


PAIRS = [("Lumbridge", "Draynor Village"), ("Lumbridge", "Varrock"), ("Lumbridge", "Al Kharid"),
         ("Draynor Village", "Port Sarim"), ("Port Sarim", "Rimmington"), ("Draynor Village", "Falador"),
         ("Falador", "Barbarian Village"), ("Barbarian Village", "Varrock"), ("Barbarian Village", "Edgeville"),
         ("Varrock", "Edgeville"), ("Falador", "Rimmington"), ("Draynor Village", "Varrock"),
         ("Catherby", "Seers Village"), ("Seers Village", "East Ardougne"), ("Taverley", "Burthorpe"),
         ("Falador", "Taverley")]
cen = {r["town"]: r["centre"] for r in town_rows}
P("\n== TRAVEL between town centres: straight(euclid) / chebyshev / walked path tiles, walk s, run s")
dist_cache = {}
travel = []
for a, b in PAIRS:
    if a not in cen or b not in cen:
        continue
    if a not in dist_cache:
        dist_cache[a] = bfs(snap(*cen[a]))
    sb = snap(*cen[b])
    pth = int(dist_cache[a][sb])
    dx, dz = cen[a][0] - cen[b][0], cen[a][1] - cen[b][1]
    e = round(float(np.hypot(dx, dz)))
    c = max(abs(dx), abs(dz))
    row = (a, b, e, c, pth, round(pth * WALK), round(pth * RUN), round(pth / max(1, c), 2))
    travel.append(row)
    P("  %-17s -> %-17s straight %4d cheb %4d path %4d  walk %4ds run %4ds  detour %.2f" % row)
out["travel"] = travel

# ---------------- heights / slopes ----------------
dh = np.zeros((W, H))
for sx, sz in ((1, 0), (0, 1)):
    a = np.abs(np.diff(hgt, axis=0 if sx else 1)).astype(float)
    m = np.diff(land.astype(int), axis=0 if sx else 1) == 0
    both = (land[:-1, :] & land[1:, :]) if sx else (land[:, :-1] & land[:, 1:])
    a[~both] = 0
    if sx:
        dh[:-1, :] = np.maximum(dh[:-1, :], a)
    else:
        dh[:, :-1] = np.maximum(dh[:, :-1], a)
slope = dh / T  # tiles of rise per tile of run (max of +x/+z)


def slope_bands(mask):
    s = slope[mask]
    if s.size == 0:
        return {}
    bands = [(0, 1 / 16, "flat<1/16"), (1 / 16, 0.25, "gentle 1/16-1/4"), (0.25, 0.5, "moderate 1/4-1/2"),
             (0.5, 1.0, "steep 1/2-1"), (1.0, 99, "cliff>1")]
    return {lab: round(float(((s >= lo) & (s < hi)).mean()), 3) for lo, hi, lab in bands}


surf = land & (np.arange(H)[None, :] + Z0 < 3968)
P("\n== SLOPE bands, all surface land:", slope_bands(surf))
explicit_share = None
# per 64x64 square
sq_rows = []
BIOME = {"grass": {48, 49, 50, 51, 52}, "mud": {62, 63, 64, 65, 66, 67, 68, 69, 70, 71}, "desert": {61, 62, 68, 75},
         "rock": {55, 56, 57, 72}, "swamp": {53, 54}, "snow": {58, 59, 60}}
for mx in range(W // 64):
    for mz in range(H // 64):
        sl = (slice(mx * 64, mx * 64 + 64), slice(mz * 64, mz * 64 + 64))
        lt = land[sl]
        if lt.sum() < 1200:
            continue
        hh = hgt[sl][lt]
        u = collections.Counter(under[sl][lt].tolist()).most_common(1)[0][0] - 1
        bio = next((k for k, v in BIOME.items() if u in v), "other")
        ax, az = mx * 64 + X0, mz * 64 + Z0
        sq_rows.append(dict(sq="%d_%d" % (ax // 64, az // 64), biome=bio, land=int(lt.sum()),
                            water=round(float(water[sl].mean()), 3), hmin=int(hh.min()), hmax=int(hh.max()),
                            range_tiles=round((np.percentile(hh, 98) - np.percentile(hh, 2)) / T, 2),
                            steep_share=round(float((slope[sl][lt] >= 0.5).mean()), 3),
                            path=round(float(path[sl][lt].mean()), 3), wild=az >= 3520 and 2944 <= ax < 3392))
rng = np.array([r["range_tiles"] for r in sq_rows])
P("== ELEVATION per 64x64 square (p2-p98 range in tiles), %d land squares:" % len(sq_rows), pct(rng, (10, 25, 50, 75, 90, 100)))
for bio in BIOME:
    rr = [r["range_tiles"] for r in sq_rows if r["biome"] == bio]
    if rr:
        P("   biome %-6s n=%3d range tiles" % (bio, len(rr)), pct(rr, (25, 50, 75, 90)))
P("   steep(>=1/2 tile per tile) share per square", pct([r["steep_share"] for r in sq_rows], (25, 50, 75, 90, 100)))
top = sorted(sq_rows, key=lambda r: -r["range_tiles"])[:8]
P("   most relief:", [(r["sq"], r["biome"], r["range_tiles"]) for r in top])
out["squares"] = sq_rows

# explicit vs noise heights
P("   (height note: tiles without explicit height use a smooth noise band 10..60 h = 0.6..3.75 tiles)")

# town heights detail
P("\n== TOWN relief (land within building bbox + 20 tile margin), tiles")
for r in town_rows:
    mb = town_members[r["town"]]
    x0 = min(b["x0"] for b in mb) - 20; x1 = max(b["x1"] for b in mb) + 20
    z0 = min(b["z0"] for b in mb) - 20; z1 = max(b["z1"] for b in mb) + 20
    box = (slice(max(0, x0), x1), slice(max(0, z0), z1))
    lt = land[box]
    hh = hgt[box][lt]
    P("  %-17s range p2-p98 %.2f  max-min %.2f  steep share %.3f  flat share %.2f  slopes %s" % (
        r["town"], (np.percentile(hh, 98) - np.percentile(hh, 2)) / T, (hh.max() - hh.min()) / T,
        float((slope[box][lt] >= 0.5).mean()), float((slope[box][lt] < 1 / 16).mean()), slope_bands(np.pad(lt, 0) & True if False else None) if False else ""))

# ---------------- roads ----------------
def runs(mask):
    hr = np.zeros(mask.shape, np.int32); vr = np.zeros(mask.shape, np.int32)
    for x in range(mask.shape[0]):
        col = mask[x, :]
        z = 0
        while z < mask.shape[1]:
            if col[z]:
                s = z
                while z < mask.shape[1] and col[z]:
                    z += 1
                vr[x, s:z] = z - s
            else:
                z += 1
    for z in range(mask.shape[1]):
        row = mask[:, z]
        x = 0
        while x < mask.shape[0]:
            if row[x]:
                s = x
                while x < mask.shape[0] and row[x]:
                    x += 1
                hr[s:x, z] = x - s
            else:
                x += 1
    return hr, vr


# restrict to the F2P-ish mainland core to keep it fast
core = (slice(g(2880, 0)[0], g(3400, 0)[0]), slice(g(0, 3136)[1], g(0, 3968)[1]))
for nm, m in (("stone road", road), ("dirt path", dirt), ("any path", path)):
    mm = m[core]
    hr, vr = runs(mm)
    wdt = np.minimum(hr, vr)[mm]
    c = collections.Counter(np.clip(wdt, 0, 9).tolist())
    tot = sum(c.values())
    P("== ROAD WIDTH %-10s tiles=%d  width distribution:" % (nm, tot), {k: round(v / tot, 3) for k, v in sorted(c.items())})

# path share by context
P("   path share of outdoor land: whole core %.3f" % float(path[core][land[core] & ~indoor[core]].mean()))

# ---------------- water ----------------
wl, nw = ndimage.label(water)
sizes = ndimage.sum(water, wl, range(1, nw + 1))
edge = set(np.unique(np.concatenate([wl[0, :], wl[-1, :], wl[:, 0], wl[:, -1]]))) - {0}
ocean = {i for i in range(1, nw + 1) if sizes[i - 1] > 20000} | edge
bodies = [(i, int(sizes[i - 1])) for i in range(1, nw + 1) if i not in ocean]
bs = np.array([s for _, s in bodies])
P("\n== INLAND WATER bodies:", len(bodies), " size pct", pct(bs, (25, 50, 75, 90, 99)),
  " ponds(<=150):", int((bs <= 150).sum()), " lakes(151-2000):", int(((bs > 150) & (bs <= 2000)).sum()), " big(>2000):", int((bs > 2000).sum()))
# river width: water tiles in non-ocean bodies > 400 tiles, elongated
riv = np.isin(wl, [i for i, s in bodies if s > 400])
hr, vr = runs(riv[core])
wdt = np.minimum(hr, vr)[riv[core]]
P("   inland water width (min run) pct:", pct(wdt, (10, 25, 50, 75, 90)))
P("   bridge-deck tiles:", int(bridge.sum()))
bl, nbl = ndimage.label(bridge)
bsz = ndimage.find_objects(bl)
P("   bridges:", nbl, " span/width (tiles):", sorted({(max(s[0].stop - s[0].start, s[1].stop - s[1].start), min(s[0].stop - s[0].start, s[1].stop - s[1].start)) for s in bsz})[:30])
# land share of water in land squares
P("   water share of land squares median", pct([r["water"] for r in sq_rows], (25, 50, 75, 90)))

# fishing spots
fish = [(n[1], n[2], nn.get(n[3], "")) for n in d["npcs"] if n[0] == 0 and ("fish" in nn.get(n[3], "") and n[3] in nn and nn[n[3]].startswith("0_"))]
dist_road = ndimage.distance_transform_edt(~path)
dist_bank = None
banks = [g(*p) for p in ICON.get("bank_store_icon", [])]
fs_rows = []
for ax, az, nm in fish:
    gx, gz = g(ax, az)
    if not (0 <= gx < W and 0 <= gz < H):
        continue
    db = min(np.hypot(gx - bx, gz - bz) for bx, bz in banks) if banks else None
    fs_rows.append((nm, round(float(dist_road[gx, gz]), 1), round(float(db), 0)))
P("== FISHING SPOTS (surface):", len(fs_rows))
P("   dist to nearest path/road tiles", pct([r[1] for r in fs_rows], (25, 50, 75, 90)))
P("   dist to nearest bank tiles", pct([r[2] for r in fs_rows], (10, 25, 50, 75, 90)))
# cluster sizes: spots within 6 tiles of each other
pts = np.array([g(a, b) for a, b, _ in fish])
from scipy.cluster.hierarchy import fcluster, linkage
if len(pts) > 2:
    cl = fcluster(linkage(pts, "single"), 8, "distance")
    cs = collections.Counter(cl).values()
    P("   spots per cluster (<=8 tile link):", pct(list(cs), (25, 50, 75, 100)), "clusters", len(cs))

# ---------------- props / trees per square ----------------
TREE = re.compile(r"(^|_)(tree|oaktree|willow_tree|maple_tree|yew_tree|deadtree\d?.*|lighttree\d?|tree\d|jungletree.*|snowtree.*|magic_tree|hollowtree)$")
TREE2 = re.compile(r"tree")
FENCE = re.compile(r"fencing|railing|fence|drystonewall|gnomefence|poshwallfencing|timberdefence")
CLUT = {
    "barrel": re.compile(r"^barrel|barrel_fish|barrelwithtap"), "crate": re.compile(r"crate"), "sacks": re.compile(r"^sacks"),
    "hay": re.compile(r"^hay|haystack|haybail"), "cart": re.compile(r"cart"), "well": re.compile(r"^well$"),
    "bench/table": re.compile(r"bench|table"), "standing_torch": re.compile(r"standing_torch"),
    "flowers/plants": re.compile(r"flower|daisys|tulips|plant\d|fern|bush|heather"), "rocks(mine)": re.compile(r"rock\d$"),
    "sign": re.compile(r"sign"), "stall": re.compile(r"market|stall"), "gravestone": re.compile(r"grave"),
    "crops": re.compile(r"^(wheat|potato|cabbage|flax_ground)$"), "hedge": re.compile(r"hedge"),
}
lvl0 = [l for l in d["locs"] if l[0] == 0]
tree_ct = np.zeros((W // 64 + 1, H // 64 + 1)); fence_ct = np.zeros_like(tree_ct)
clut_ct = {k: np.zeros_like(tree_ct) for k in CLUT}
tree_grid = np.zeros((W, H), bool)
for (lv, ax, az, lid, shp, ang) in lvl0:
    gx, gz = g(ax, az)
    if not (0 <= gx < W and 0 <= gz < H):
        continue
    nm = ln.get(lid, "")
    if shp in (10, 11) and TREE2.search(nm) and "stump" not in nm and "bamboo" not in nm and "vinetree" not in nm and "spirit" not in nm:
        tree_ct[gx // 64, gz // 64] += 1
        tree_grid[gx, gz] = True
    elif shp in (0, 1, 2, 3, 9) and FENCE.search(nm):
        fence_ct[gx // 64, gz // 64] += 1
    for k, rx in CLUT.items():
        if rx.search(nm) and shp in (10, 11, 22):
            clut_ct[k][gx // 64, gz // 64] += 1
rows = []
for r in sq_rows:
    ax, az = map(int, r["sq"].split("_"))
    i, j = ax - X0 // 64, az - Z0 // 64
    r["trees"] = int(tree_ct[i, j]); r["tree_per100"] = round(tree_ct[i, j] / r["land"] * 100, 2)
    r["fence"] = int(fence_ct[i, j])
    for k in CLUT:
        r[k] = int(clut_ct[k][i, j])
tp = [r["tree_per100"] for r in sq_rows]
P("\n== TREES per 100 land tiles per square:", pct(tp, (10, 25, 50, 75, 90, 100)))
for bio in BIOME:
    rr = [r["tree_per100"] for r in sq_rows if r["biome"] == bio]
    if rr:
        P("   biome %-6s" % bio, pct(rr, (25, 50, 75, 90)))
P("   trees per square abs:", pct([r["trees"] for r in sq_rows], (25, 50, 75, 90, 100)))
P("   fence segments per square:", pct([r["fence"] for r in sq_rows], (25, 50, 75, 90, 100)))
# nearest-tree spacing in forests vs open
tl, _ = ndimage.label(tree_grid)
tdist = ndimage.distance_transform_edt(~tree_grid)
tp_idx = np.argwhere(tree_grid)
nnd = []
for (x, z) in tp_idx[::7]:
    sub = tree_grid[max(0, x - 8):x + 9, max(0, z - 8):z + 9]
    pts2 = np.argwhere(sub) - [min(8, x), min(8, z)]
    dd2 = np.hypot(pts2[:, 0], pts2[:, 1]); dd2 = dd2[dd2 > 0]
    if dd2.size:
        nnd.append(dd2.min())
P("   nearest-neighbour tree spacing (tiles)", pct(nnd, (10, 25, 50, 75, 90)))
P("   share of trees within 1.5 tiles of another tree (clumping):", round(float((np.array(nnd) <= 1.5).mean()), 2))

# clutter per town
P("\n== CLUTTER within town bbox (+6 tiles)")
town_clutter = {}
for r in town_rows:
    mb = town_members[r["town"]]
    x0 = min(b["x0"] for b in mb) - 6; x1 = max(b["x1"] for b in mb) + 6
    z0 = min(b["z0"] for b in mb) - 6; z1 = max(b["z1"] for b in mb) + 6
    c = collections.Counter(); ind = collections.Counter()
    trees = 0; fence = 0
    for (lv, ax, az, lid, shp, ang) in lvl0:
        gx, gz = g(ax, az)
        if x0 <= gx < x1 and z0 <= gz < z1:
            nm = ln.get(lid, "")
            for k, rx in CLUT.items():
                if rx.search(nm) and shp in (10, 11, 22):
                    (ind if indoor[gx, gz] else c)[k] += 1
            if shp in (10, 11) and TREE2.search(nm) and "stump" not in nm:
                trees += 1
            if shp in (0, 1, 2, 3, 9) and FENCE.search(nm):
                fence += 1
    area = (x1 - x0) * (z1 - z0)
    town_clutter[r["town"]] = dict(outdoor=dict(c), indoor=dict(ind), trees=trees, fence_segments=fence, area=area)
    P("  %-17s area %5d trees %3d fence %4d  outdoor %s  | indoor %s" % (r["town"], area, trees, fence, dict(c), dict(ind)))
out["town_clutter"] = town_clutter

# ---------------- dungeon entrances ----------------
ENT = re.compile(r"ladder|trapdoor|caveentrance|cave_entrance|manhole|staircase|stairs")
ents = []
for (lv, ax, az, lid, shp, ang) in lvl0:
    nm = ln.get(lid, "")
    if ENT.search(nm) and "broken" not in nm:
        gx, gz = g(ax, az)
        if 0 <= gx < W and 0 <= gz < H and land[gx, gz]:
            ents.append((nm, bool(indoor[gx, gz]), round(float(dist_road[gx, gz]), 1)))
P("\n== LADDERS/TRAPDOORS/CAVES on level 0:", len(ents), " indoor share", round(np.mean([e[1] for e in ents]), 2))
P("   outdoor ones dist to path", pct([e[2] for e in ents if not e[1]], (25, 50, 75, 90)))
P("   dungeon icons:", len(ICON.get("dungeonentrance_icon", [])))
de = []
for (ax, az) in ICON.get("dungeonentrance_icon", []):
    gx, gz = g(ax, az)
    if 0 <= gx < W and 0 <= gz < H:
        tc = min(np.hypot(ax - c[0], az - c[1]) for c in cen.values())
        de.append((round(float(dist_road[gx, gz]), 1), round(float(tc)), round(float(slope[max(0,gx-3):gx+4, max(0,gz-3):gz+4].max()), 2)))
P("   dungeon icon: (dist to path, dist to nearest town centre, max local slope)", sorted(de))

# ---------------- wilderness edge ----------------
P("\n== WILDERNESS EDGE (z=3520, x 2944..3391)")
edge_locs = collections.Counter()
for (lv, ax, az, lid, shp, ang) in lvl0:
    if 2944 <= ax < 3392 and 3516 <= az <= 3523:
        edge_locs[(ln.get(lid, "?"), shp, az)] += 1
P("   locs near edge (name, shape, z): top", edge_locs.most_common(25))
bx0, _ = g(2944, 0); bx1, _ = g(3392, 0)
for zz in (3500, 3510, 3515, 3518, 3519, 3520, 3521, 3525, 3540):
    _, gz = g(0, zz)
    rowl = land[bx0:bx1, gz]
    P("   z=%d land %d  path %d  water %d  trees %d  mean h %.2f tiles" % (zz, rowl.sum(), path[bx0:bx1, gz].sum(), water[bx0:bx1, gz].sum(), tree_grid[bx0:bx1, gz].sum(), hgt[bx0:bx1, gz][rowl].mean() / T))
# tree / path / clutter density south vs north of edge
for nm, zlo, zhi in (("south band 3456-3519", 3456, 3520), ("wild 1-10 3520-3599", 3520, 3600), ("wild 20-30 3680-3759", 3680, 3760), ("deep 40+ 3840-3967", 3840, 3968)):
    _, a = g(0, zlo); _, b = g(0, zhi)
    sl = (slice(bx0, bx1), slice(a, b))
    lt = land[sl]
    P("   %-22s trees/100 %.2f  path share %.3f  indoor share %.3f  steep %.3f  relief p2-98 %.2f tiles  water %.3f" % (
        nm, tree_grid[sl][lt].sum() / lt.sum() * 100, path[sl][lt].mean(), indoor[sl][lt].mean(), (slope[sl][lt] >= .5).mean(),
        (np.percentile(hgt[sl][lt], 98) - np.percentile(hgt[sl][lt], 2)) / T, water[sl].mean()))

with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "rs04_metrics.json"), "w") as f:
    json.dump(out, f, default=str, indent=1)
