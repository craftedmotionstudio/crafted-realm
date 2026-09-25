# holm-cavern-v1 — Ore workings under the quarry (prefix Cavern_) — candidate, not owner-accepted
Built by tools/blender/build_holm_cavern_v1.py -> cavern.glb / cavern.blend (proofs: scratchpad/holm_cavern_v1/).
Nav spec: docs/rebuild/holm-overhaul/buildings/cavern.nav.json.

- Triangles 13,229 / 25,000; materials 19 / 20 (diffuse_color, authored sRGB); emission 1.0 on torch flames and furnace
  glow only; no glTF extensions; 19 meshes + 4 socket empties.
- Walkable mask 18 x 14 (local x -9..9, z -7..7), flat floor at y 0; ceiling ~3.55 in passages, ~4.5 over the ore face,
  ~3.9 over the smelting nook (>= 3.3 where walls lean in); outer skin 20.1 x 16.0, 7.1 tall with the shaft head.
- Placement x=200, y=-30, z=60 (offshore, below sea level, 2004-style dungeon; joined to the quarry shaft by a ladder).

Services (mesh -> target, local stance): Cavern_ServiceLadderUp_Ladder -> ladder (-6.5,0,0.5) (start);
Cavern_ServiceFurnace_Furnace -> furnace (5.5,0,4.5); Cavern_ServiceAnvil_Anvil -> anvil (3.5,0,3.5).
Sockets (empties) -> stance: Copper_1 (0.5,0,-5.5) -> (0.5,0,-4.5); Copper_2 (3.5,0,-5.5) -> (3.5,0,-4.5);
Tin_1 (7.5,0,-4.5) -> (6.5,0,-4.5); Tin_2 (7.5,0,-2.5) -> (6.5,0,-2.5).

Naming: walkable Cavern_Floor; roof (hidden inside) Cavern_RoofCeiling/RoofBoulders/RoofShaftHead; shell
Cavern_ShellRock/ShellRockTop/ShellSkin/ShellPillar/ShellVein; other Cavern_Timber/Torch/TorchFlame/Rail/Rubble/
Furnishing/FurnishingCart.

Extractor: [BUILDING_NAVIGATION] cavern nodes 89, undirectedEdges 134, reachableNodes 88, targets 7/7, complete true
(the one unreachable node sits inside the solid pillar at tile (3,-3) and has no links).

Self-review: (1) reads as a carved rock mass: alcove, propped passage, hub, ore face, rail bay, smelting nook, faceted
walls with dark bases, strata and ore veins. (2) Facets fairly even; strata subtle; upper pillar reads like an inverted
cone. (3) With the roof hidden the hatch shaft and furnace flue stand as bare columns; exterior is a plain block (never
seen in play); torch glow only shows in game.
