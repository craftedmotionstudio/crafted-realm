"""Read-only loader for the 2004scape map source (study/measurement only).

Parses data/src/maps/*.jm2 into numpy grids so we can MEASURE proportions
(heights, slopes, water share, building footprints, spacing).  Nothing here is
game code and no map data is copied into Crafted Realm -- outputs are summary
statistics only (see docs/rebuild/REFERENCE_2004SCAPE.md).

Conventions (from the 2004 map packer/client, studied not copied):
  * file mX_Z.jm2 -> absolute tile x = X*64 + lx, z = Z*64 + lz (z = north)
  * 'h<n>' explicit height; world height = n*8 units, 128 units = 1 tile,
    so 16 h-units = 1 tile of vertical rise.  A tile with no 'h' on level 0
    uses a smooth value-noise height in the band 10..60 (centred ~35).
  * 'o<id>;shape;rot' overlay (1-based into flo.pack), 'u<id>' underlay
    (1-based), 'f<n>' flags (bit 1 = blocked, bit 2 = bridge link).
  * LOC lines: level lx lz: id shape angle.  Shapes 0-3,9 = walls,
    4-8 wall decoration, 10/11 = free-standing objects, 12-21 = roofs,
    22 = ground decoration.
"""
import os, re, math, pickle, tempfile
import numpy as np

RS = r"C:/Users/iQwaZ/repos/2004scape/Server/data/src"
MAPS = os.path.join(RS, "maps")
HERE = os.path.dirname(os.path.abspath(__file__))
# the parse cache holds 2004 map data, so it lives in the OS temp dir, never in this repo
CACHE = os.path.join(tempfile.gettempdir(), "cr_world_layout_rs04_cache.pkl")


def read_pack(name):
    out = {}
    with open(os.path.join(RS, "pack", name), encoding="utf8") as f:
        for line in f:
            line = line.strip()
            if "=" in line:
                k, v = line.split("=", 1)
                out[int(k)] = v
    return out


# --- value-noise height for tiles without an explicit height -------------
COS = [int(math.cos(i * 0.0030679615) * 65536.0) for i in range(2048)]


def _noise(x, y):
    n = (x + y * 57) & 0xFFFFFFFF
    n = ((n << 13) & 0xFFFFFFFF) ^ n
    # emulate signed 32-bit then bigint maths like the client does
    if n & 0x80000000:
        n -= 1 << 32
    v = (n * (n * n * 15731 + 789221) + 1376312589) & 0x7FFFFFFF
    return (v >> 19) & 0xFF


def _smooth(x, y):
    c = _noise(x - 1, y - 1) + _noise(x + 1, y - 1) + _noise(x - 1, y + 1) + _noise(x + 1, y + 1)
    s = _noise(x - 1, y) + _noise(x + 1, y) + _noise(x, y - 1) + _noise(x, y + 1)
    return int(c / 16) + int(s / 8) + int(_noise(x, y) / 4)


def _interp(a, b, x, scale):
    f = (65536 - COS[int((x * 1024) / scale)]) >> 1
    return ((a * (65536 - f)) >> 16) + ((b * f) >> 16)


def _pscale(x, z, scale):
    ix, fx = x // scale, x & (scale - 1)
    iz, fz = z // scale, z & (scale - 1)
    v1, v2 = _smooth(ix, iz), _smooth(ix + 1, iz)
    v3, v4 = _smooth(ix, iz + 1), _smooth(ix + 1, iz + 1)
    return _interp(_interp(v1, v2, fx, scale), _interp(v3, v4, fx, scale), fz, scale)


def noise_height(ax, az):
    x, z = ax + 932731, az + 556238
    v = _pscale(x + 45365, z + 91923, 4) + ((_pscale(x + 10294, z + 37821, 2) - 128) >> 1) + ((_pscale(x, z, 1) - 128) >> 2) - 128
    v = int(v * 0.3) + 35
    return min(60, max(10, v))


def _noise_np(x, y):
    x = np.asarray(x, np.int64); y = np.asarray(y, np.int64)
    n = (x + y * 57).astype(np.int64)
    n32 = (n & 0xFFFFFFFF).astype(np.uint64)
    n1 = (((n32 << np.uint64(13)) & np.uint64(0xFFFFFFFF)) ^ n32)
    # sign-extend int32 -> 64 bit two's complement (uint64 wrap keeps low bits right)
    neg = (n1 & np.uint64(0x80000000)) != 0
    n1 = np.where(neg, n1 | np.uint64(0xFFFFFFFF00000000), n1)
    with np.errstate(over="ignore"):
        v = n1 * (n1 * n1 * np.uint64(15731) + np.uint64(789221)) + np.uint64(1376312589)
    v = v & np.uint64(0x7FFFFFFF)
    return ((v >> np.uint64(19)) & np.uint64(0xFF)).astype(np.int64)


def _smooth_np(x, y):
    N = _noise_np
    c = N(x - 1, y - 1) + N(x + 1, y - 1) + N(x - 1, y + 1) + N(x + 1, y + 1)
    s = N(x - 1, y) + N(x + 1, y) + N(x, y - 1) + N(x, y + 1)
    return c // 16 + s // 8 + N(x, y) // 4


COS_NP = np.array(COS, np.int64)


def _interp_np(a, b, x, scale):
    f = (65536 - COS_NP[(x * 1024) // scale]) >> 1
    return ((a * (65536 - f)) >> 16) + ((b * f) >> 16)


def _pscale_np(x, z, scale):
    ix, fx = x // scale, x & (scale - 1)
    iz, fz = z // scale, z & (scale - 1)
    S = _smooth_np
    return _interp_np(_interp_np(S(ix, iz), S(ix + 1, iz), fx, scale),
                      _interp_np(S(ix, iz + 1), S(ix + 1, iz + 1), fx, scale), fz, scale)


def noise_height_np(ax, az):
    x = np.asarray(ax, np.int64) + 932731
    z = np.asarray(az, np.int64) + 556238
    v = _pscale_np(x + 45365, z + 91923, 4) + ((_pscale_np(x + 10294, z + 37821, 2) - 128) >> 1) + ((_pscale_np(x, z, 1) - 128) >> 2) - 128
    v = (v * 0.3).astype(np.int64) + 35
    return np.clip(v, 10, 60)


def parse_all(xr=(29, 54), zr=(44, 64)):
    """Surface squares only (mapsquare z < 100). Returns dict of grids."""
    files = [f for f in os.listdir(MAPS) if f.endswith(".jm2")]
    sq = []
    for f in files:
        mx, mz = map(int, f[1:-4].split("_"))
        if xr[0] <= mx < xr[1] and zr[0] <= mz < zr[1]:
            sq.append((mx, mz, f))
    X0, Z0 = xr[0] * 64, zr[0] * 64
    W, H = (xr[1] - xr[0]) * 64, (zr[1] - zr[0]) * 64
    height = np.full((W, H), -1, np.int32)  # h units, level 0
    over = np.zeros((W, H), np.int16)
    under = np.zeros((W, H), np.int16)
    flags = np.zeros((W, H), np.int16)
    present = np.zeros((W, H), bool)
    locs = []  # (level, ax, az, id, shape, angle)
    npcs = []  # (level, ax, az, id)
    for mx, mz, f in sq:
        section = None
        bx, bz = mx * 64, mz * 64
        with open(os.path.join(MAPS, f), encoding="utf8") as fh:
            for line in fh:
                line = line.rstrip("\r\n")
                if not line:
                    continue
                if line.startswith("===="):
                    section = line[5:8]
                    continue
                head, _, body = line.partition(":")
                parts = head.split()
                level, lx, lz = int(parts[0]), int(parts[1]), int(parts[2])
                body = body.strip()
                if section == "MAP":
                    if level != 0:
                        continue
                    gx, gz = bx + lx - X0, bz + lz - Z0
                    present[gx, gz] = True
                    for tok in body.split():
                        t, info = tok[0], tok[1:]
                        if t == "h":
                            height[gx, gz] = int(info)
                        elif t == "o":
                            over[gx, gz] = int(info.split(";")[0])
                        elif t == "u":
                            under[gx, gz] = int(info)
                        elif t == "f":
                            flags[gx, gz] = int(info)
                elif section == "LOC":
                    b = body.split()
                    lid = int(b[0])
                    shape = int(b[1]) if len(b) > 1 else 10
                    ang = int(b[2]) if len(b) > 2 else 0
                    locs.append((level, bx + lx, bz + lz, lid, shape, ang))
                elif section == "NPC":
                    npcs.append((level, bx + lx, bz + lz, int(body)))
    # fill noise heights for present tiles without explicit height
    gx, gz = np.nonzero(present & (height < 0))
    height[gx, gz] = noise_height_np(gx + X0, gz + Z0)
    height[present & (height == 1)] = 0
    return dict(X0=X0, Z0=Z0, W=W, H=H, height=height, over=over, under=under,
                flags=flags, present=present, locs=locs, npcs=npcs)


def load():
    if os.path.exists(CACHE):
        with open(CACHE, "rb") as f:
            return pickle.load(f)
    d = parse_all()
    d["locnames"] = read_pack("loc.pack")
    d["npcnames"] = read_pack("npc.pack")
    d["flonames"] = read_pack("flo.pack")
    with open(CACHE, "wb") as f:
        pickle.dump(d, f)
    return d


if __name__ == "__main__":
    d = load()
    print("grid", d["W"], d["H"], "origin", d["X0"], d["Z0"], "tiles present", int(d["present"].sum()))
    print("locs", len(d["locs"]), "npcs", len(d["npcs"]))
