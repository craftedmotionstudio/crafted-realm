# survival (Pond & woodland), M4.4 candidate v1 — 2026-09-24

Source: `tools/blender/build_holm_survival_v1.py` -> `survival.glb` / `survival.blend` (this folder).
Proofs: `scratchpad/holm_survival_v1/` (01_front_se, 02_back_nw, 03_side_east_jetty, 04_top, 05_cutaway, 06_detail_link_store, sheet.png).
Nav spec: `docs/rebuild/holm-overhaul/buildings/survival.nav.json` -> `.studio-workspaces/holm-survival-navigation-v1/candidates/`.
Status: unapproved candidate. Nothing in the world, runtime or terrain was changed.

## Budget
- Triangles: **21,301** (limit 25,000). Materials: **19** (limit 20), all `diffuse_color`, no textures and no emission.
- 30 meshes, batched by prefix. The heaviest are RoofThatch (5.3k), RoofStore (2.9k) and PlinthCanopy (1.6k).
- Local bounds: x -9.53..13.94, z -4.92..8.20, y -2.35..6.43 (23.5 x 13.1 x 8.8). The building itself covers x -6.65..6.5,
  z -4.65..1.85, plus the fire yard to z 5. The fishing stage extends east to reach the real water.

## Intended world placement
- **x = 31, z = 84** (plan). **y = 2.90**, measured: local y 0 is the canopy floor, and 2.90 is the Sept 13 terrain at the
  canopy's east edge (world (34,84) = 2.88). The terrain falls west to 2.0, so a fieldstone plinth takes the west
  and south edges down to the ground.
- Levels, local: canopy floor 0.00; store floor +0.60 (three 0.20 steps in the link); fire hard-standing -0.40
  (one 0.20 step off the canopy); fishing landing +0.45, then six 0.193 treads down to the stage deck at -0.90
  (world 2.00).

## Site check (terrain water mask)
- **There is no pond at plan (31,84).** The mask is dry over the whole footprint (terrain slopes 2.0 -> 3.3 from
  west to east). The nearest real water is the creek, whose west bank is at world x 42-45, z 87-97. The creek
  surface is at waterY ~1.6-1.7 there, the bed ~0.8-0.9 and the bank lip ~2.0. The bridge tiles are (45-47, 87).
- The **fishing stage is on the real water edge.** A landing on the upper bank at world (39,90) (terrain ~3.3) leads
  to a railed bank stair down to a deck over creek tiles **(42,90) and (43,90)** (both water in the mask). The
  deck top is world 2.00, about 0.35 above the water.
  The fishing stance is on tile (43,90) = local (12.5, -0.9, 6.5). The reeds and float marker sit in tile (44,90).
  None of it overlaps the bridge row z=87.
- The plan's "pond on a lower creek terrace" is therefore the creek pool below the bank. If the owner wants a
  separate pond at (31,84), that is a terrain change for the main session.

## Plan volumes -> what was built
- teaching-canopy (hip, thatch): open-sided, 11 crook posts on sandstone pads, with a bend under the plate,
  curved knee braces and a wall-plate ring. Two raised-cruck trusses with ties, collars and king struts carry an
  ochre thatch laid as straw courses (drooping butts, ridge roll with hazel liggers, hip rolls). The roof is a
  full hip to the west and a **half-hip gablet to the east**, with a weatherboarded, framed gable and a louvred
  smoke vent.
  The outline's (1,-4)->(3,-2) diagonal overlaps the store volume, so it was clipped. It survives as the chamfered
  NE corner (0.2,-4)->(0.8,-3.4), and the canopy stops at the store/link.
- tool-store (lean-to, timber): a fieldstone sill wall (relief facing on N/E/S) carries vertical oak planks with
  rails, braces and corner posts, under a shingle lean-to laid in courses. A separate lower, steeper **pentice**
  over the south front shelters the log pile. The west door is a boarded leaf standing open inside, with strap
  hinges, a hasp and a hanging padlock (lockable). The east window has an open shutter. A saw and a rope coil
  hang on the west wall.
- covered-link (lean-to): three stone steps from the canopy to the store door, under a shingle lean-to that
  butts the gablet.
- Outdoor lesson space: a flagged hard-standing with a kerb and stone facing, a stone fire ring with a laid fire,
  embers, a cooking tripod and a pot, and two log seats. Planted edge: reed clumps at the bank and yard corner,
  two hazel coppice stools west of the canopy.

## Services (mesh prefix -> nav target, local stance)
| mesh | target | stance (x, y, z) |
|---|---|---|
| `Survival_ServiceTools_Rack` (rack with hatchet, tinderbox + flint/steel, small hand net, coiled line) | `tools` | (4.5, 0.6, -2.5) |
| `Survival_ServiceFirePit_Ring` (fire ring, laid fire, tripod, pot) | `fire` | (-1.5, -0.4, 3.5) |
| `Survival_ServiceLogPile_Stack` (log pile, chopping block, axe, split billets) | `logs` | (4.5, 0.14, 1.5) |
| `Survival_ServiceFishing_Reeds` (reeds at the stage end + float marker) | `fishing` | (12.5, -0.9, 6.5) |
| (approach, extractor start) | `trail` | (9.5, 0.75, 3.5) = world tile (40,87) on the bridge path |
| (teaching bench, `Survival_FurnishingCanopy`) | `bench` | (-2.5, 0, -2.5) |

Walkable meshes: `Survival_FloorCanopy/FloorPorch/FloorStore/FloorYard`, `Survival_StepLink/StepYard/StepBank`,
`Survival_DeckLanding/DeckJetty`. Roofs: `Survival_RoofThatch` (includes the gablet), `RoofTruss`, `RoofStore`
(includes the pentice), `RoofLink`. Store walls: `Survival_ShellStore`, `Survival_ShellStoreBase`.

## Extractor
`[BUILDING_NAVIGATION] survival {"nodes": 259, "undirectedEdges": 408, "reachableNodes": 257, "targetsReachable": 6, "targetsTotal": 6, ... "complete": true}`
Two fixes were made to the model, not the extractor: (1) the canopy's east hip eave hung into the capsule above
the link steps, so the east end became a half-hip gablet; (2) the store's sill cap made a 6 cm kerb across the
doorway, so it was split at the door.

## Self-review against the references
- Reads well: the thatch is ochre and straw-coursed, the dominant, overhanging hip that the Building_Exterior_Option1
  reference is about. The open post-and-brace shelter over a stone plinth leaves the outdoor lesson space (fire yard,
  bench, logs) as the dominant room. The fieldstone relief courses match the house v2 family.
- The fishing stage is honest to the site: it reaches the real creek water. The lowered water fits the
  "water visibly lower" route note.
- Weak: the reference fishing spot is a soft pond in open lawn; ours is a stair down a steep creek bank 9-12 tiles
  east of the shelter. The flow works, but it does not read as one "pond & woodland" composition from the camera.
- Weak: the store's plank walls are orderly but plain. The north and west faces are large brown fields that could
  use a stone gable end or more hung kit. The shingle lean-to is a broad flat plane from above.
- Weak: the coppice stools (1.2k tris) and reeds are serviceable placeholders. Broad tree crowns are left to the
  tree family. The thatch butts still read slightly shingle-like at close range.
