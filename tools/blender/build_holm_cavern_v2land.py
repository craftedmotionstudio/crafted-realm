"""Ore workings v2 land (Tutor's Holm v2 land, phase 4, 2026-09-26): the cavern of build_holm_cavern_v1.py with the
EAST PASSAGE the v2 route needs (docs/rebuild/WORLD_LAYOUT_GUIDE.md §3.7: "down here, up over there"): from the east
passage by the smelting nook a 2-wide propped drift runs 16 tiles east under the creek to an exit chamber, where a
ladder climbs a timber-lined shaft that comes up inside the Warden's Keep (Cavern_ServiceLadderExit_, the island joins it
to the keep's trapdoor by island-ladders.json). The v1 recipe runs unchanged apart from the swaps below (the same
technique as relock_with_swapped_paths.py: the v1 script is never edited): the tile mask gains the drift and the chamber,
the outer rock skin follows the wider mask, and the drift gets timber sets, lagging, torches, the exit ladder and a
little dressing. Underground walk: shaft ladder -> ore face -> furnace -> anvil -> exit ladder about 55 tiles.
Local space as v1 (origin = placement (200,-30,60), y 0 = floor). Output: .studio-workspaces/holm-cavern-v2land-v1.
Run: "Blender 4.5/blender.exe" -b --python tools/blender/build_holm_cavern_v2land.py"""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'tools/blender/build_holm_cavern_v1.py'
src = SRC.read_text(encoding='utf-8')
def swap(a, b):
    global src
    assert a in src, 'swap not found: ' + a[:70]
    src = src.replace(a, b, 1)
OLD_MAP = src[src.index("MAP=['"):src.index("X0,Z0=-9,-7;NX,NZ=18,14")]
rows = [l.split("'")[1] for l in OLD_MAP.split('\n') if "'" in l]
assert len(rows) == 14 and all(len(r) == 18 for r in rows)
# extend to x 9..30 (22 more columns): the drift on rows z=0,1 from x=8 to x=23, the exit chamber x 23..28, z -2..3
new = []
for k, r in enumerate(rows):
    z = k - 7; ext = ['#'] * 22   # columns x = 9 .. 30
    r = list(r)
    if z in (0, 1): r[17] = '.'   # x = 8 opens east
    for x in range(9, 31):
        if (z in (0, 1) and x <= 23) or (-2 <= z <= 3 and 23 <= x <= 28): ext[x - 9] = '.'
    new.append(''.join(r) + ''.join(ext))
map_src = 'MAP=[' + ',\n     '.join("'" + r + "'" for r in new) + ']\n'
swap(OLD_MAP, map_src)
swap("X0,Z0=-9,-7;NX,NZ=18,14", "X0,Z0=-9,-7;NX,NZ=40,14")
swap("OUT=ROOT/'.studio-workspaces/holm-cavern-v1/candidates';PROOF=ROOT/'scratchpad/holm_cavern_v1'",
     "OUT=ROOT/'.studio-workspaces/holm-cavern-v2land-v1/candidates';PROOF=ROOT/'scratchpad/holm_v2_land/cavern_v2land'")
# the outer rock skin: a rounded rectangle round the whole mask (v1 hard-coded +-9.25 x +-7.25)
swap("for x,z in [(-9.25,-7.25),(9.25,-7.25),(9.25,7.25),(-9.25,7.25)]:SK.append(Vector((x,z)))",
     "SKX0,SKX1,SKZ=-9.25,31.25,7.25\nfor x,z in [(SKX0,-SKZ),(SKX1,-SKZ),(SKX1,SKZ),(SKX0,SKZ)]:SK.append(Vector((x,z)))")
swap(" nrm=Vector((p.x/9.25,p.y/7.25));nrm=nrm.normalized();t=rng.uniform(0,.35)",
     " cxm=(SKX0+SKX1)/2;hx=(SKX1-SKX0)/2;nrm=Vector(((p.x-cxm)/hx,p.y/SKZ));nrm=nrm.normalized();t=rng.uniform(0,.35)")
PASSAGE = r'''
# ---------------- v2 land: the east drift and the exit chamber (Cavern_ServiceLadderExit_) ----------------
DS=[9.9,12.9,15.9,18.9,21.9]
for x in DS:prop_set((x,.1),(x,1.9),2.55)
for za in (.1,1.9):stringer((DS[0],za),(DS[-1],za),2.55)
lagging((DS[0],.1),(DS[0],1.9),(DS[-1],.1),(DS[-1],1.9),2.55,11)
prop_set((23.1,-1.9),(23.1,3.9),2.95,.26)
for p in [(11.4,0.0),(17.4,2.0),(20.4,0.0),(25.0,-2.0),(27.5,4.0)]:torch(*p)
EX='Cavern_ServiceLadderExit_Ladder'
EB=Vector((28.35,0,.5));ET=Vector((28.63,4.95,.5));w2=.56
def at2(y):return EB.lerp(ET,y/ET.y)
for s in (-1,1):
 beam(EX,tuple(EB+S*s*w2/2),tuple(ET+S*s*w2/2),.08,.11,M['wood'])
 prism(EX,*(lambda p:(p.x-.07,p.x+.07,0,.05,p.z-.07,p.z+.07))(EB+S*s*w2/2),M['iron'])
y=.3
while y<4.8:p=at2(y);cyl(EX,tuple(p-S*w2/2),tuple(p+S*w2/2),.028,.028,M['timber_d'],6);y+=.3
ex0,ex1,ez0,ez1=28.25,29.0,.05,.95
for a,b,c,d in ((ex0-.1,ex0,ez0-.1,ez1+.1),(ex1,ex1+.1,ez0-.1,ez1+.1),(ex0,ex1,ez0-.1,ez0),(ex0,ex1,ez1,ez1+.1)):prism(EX,a,b,3.05,4.45,c,d,M['timber_d'])
prism(EX,ex0,ex1,4.4,4.45,ez0,ez1,M['void'])
beam(EX,(ex0+.1,3.05,ez1-.12),(ex0+.12,1.2,ez1-.14),.035,.035,M['rope'])
# dressing in the exit chamber: a crate stack and a barrel by the south wall, a coil of rope, a pick on the crates
crate(24.2,25.0,0,.7,2.7,3.5);crate(24.35,24.95,.7,1.25,2.8,3.4);barrel(26.0,3.35);coil(27.2,.05,-1.4)
pick((24.3,1.3,3.0),(24.95,1.3,3.2))
'''
swap("# ---------------- finish: fix normals on closed parts, batch by name ----------------", PASSAGE + "\n# ---------------- finish: fix normals on closed parts, batch by name ----------------")
swap("GROUPS=[('Cavern_ServiceLadderUp_','Cavern_ServiceLadderUp_Ladder'),", "GROUPS=[('Cavern_ServiceLadderUp_','Cavern_ServiceLadderUp_Ladder'),('Cavern_ServiceLadderExit_','Cavern_ServiceLadderExit_Ladder'),")
swap("print('[CAVERN_V1] tris'", "print('[CAVERN_V2LAND] tris'")
exec(compile(src, str(SRC), 'exec'), {'__name__': '__main__', '__file__': str(SRC)})
