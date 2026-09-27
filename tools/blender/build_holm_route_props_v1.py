"""Route prop pack v1 (Tutor's Holm v2 land, phase 4, 2026-09-26): pieces the new route needs outside the buildings.
Roots (origin at floor level, 1 unit = 1 tile):
  trapdoor-open   the undercroft trapdoor in the Warden's Keep hall where the cavern's exit ladder comes up: an oak-framed
                  hatch (0.8 x 0.8) with a dark shaft, the leaf thrown open on iron strap hinges, ladder rails poking up
  cove-bell       a ferry bell on a timber gallows for the cove pier (Tobin rings it when the skiff is ready)
Run: "Blender 4.5/blender.exe" -b --python tools/blender/build_holm_route_props_v1.py"""
import bpy, sys, math
from pathlib import Path
HERE = Path(__file__).resolve().parent; sys.path.insert(0, str(HERE)); ROOT = HERE.parents[1]
from holm_interior_kit import Acc, M
from holm_v2_pack import Pack
P = Pack('HOLM_ROUTE_PROPS_V1', ROOT / '.studio-workspaces/holm-route-props-v1/candidates', budget_tris=3000)
OAK = M('Hatch oak frame', '#5e4228'); LEAF = M('Hatch oak planks', '#7a5836'); IRON = M('Iron strap', '#3e3d3c'); VOID = M('Shaft dark', '#0e0c0a'); RUNG = M('Ladder oak', '#6a4b2e')
BRONZE = M('Bell bronze', '#a0763a')
r = P.root('trapdoor-open', kind='route', block=[.45, .45])
A = Acc('trapdoor-open_Hatch')
A.box(-.4, .4, -.02, .005, -.4, .4, VOID, skip='b')
for (x0, x1, z0, z1) in ((-.52, .52, .0, .0), ):
    pass
A.box(-.52, .52, 0, .05, -.52, -.4, OAK); A.box(-.52, .52, 0, .05, .4, .52, OAK); A.box(-.52, -.4, 0, .05, -.4, .4, OAK); A.box(.4, .52, 0, .05, -.4, .4, OAK)
# the open leaf, hinged along the north edge (z -.46), thrown up past vertical onto a stop
a = math.radians(100); c, s = math.cos(a), math.sin(a)
def L(x, v, w): return (x, .05 + v * s + w * c * 0, -.46 - v * c + w * s * 0)
for k in range(4):
    x0 = -.4 + k * .2 + .005; x1 = x0 + .19
    A.poly([(x0, .06, -.46), (x1, .06, -.46), (x1, .06 + .8 * s, -.46 - .8 * c), (x0, .06 + .8 * s, -.46 - .8 * c)], [(0, 1, 2, 3), (3, 2, 1, 0)], LEAF)
for v in (.15, .65): A.beam((-.42, .07 + v * s, -.44 - v * c), (.42, .07 + v * s, -.44 - v * c), .06, .03, IRON)
for x in (-.25, .25): A.box(x - .03, x + .03, .04, .09, -.52, -.42, IRON)
for x in (-.28, .28): A.box(x - .03, x + .03, -1.2, .55, .3, .36, RUNG)
for y in (-.9, -.6, -.3, .0, .3): A.box(-.28, .28, y, y + .04, .31, .35, RUNG)
A.build(r, vcol=False)
r = P.root('cove-bell', kind='route', block=[.25, .25])
A = Acc('cove-bell_Bell')
for x in (-.3, .3): A.box(x - .05, x + .05, 0, 1.6, -.05, .05, OAK)
A.box(-.4, .4, 1.6, 1.7, -.07, .07, OAK)
A.lathe(0, 0, 1.1, [(.18, 0), (.17, .08), (.12, .28), (.06, .38), (0, .42)], 10, BRONZE, top=False)
A.box(-.01, .01, 1.5, 1.6, -.01, .01, IRON); A.beam((0, 1.12, 0), (.25, .7, .05), .015, .015, M('Bell rope', '#a8905e'))
A.build(r, vcol=False)
P.export('props.glb')
