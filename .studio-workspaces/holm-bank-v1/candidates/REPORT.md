# Bank & service court v1 (M4.4) — candidate report

- Script `tools/blender/build_holm_bank_m44_v1.py` (the name `build_holm_bank_v1.py` already holds the unrelated
  Sept 9 bank; left untouched). The build overwrote the old `scratchpad/holm_bank_v1/asset_report.json`.
- Triangles 24,712; materials 20 (diffuse colours); 43 meshes; bounds 12.4 x 11.1 x 9.6; hall ridge 5.43, wing 7.85.
- Intended placement: x 86, y 6.30 (flat pad 6.00 over x 80..92, z 52..62; 0.30 stone plinth; one 0.15 `Bank_Step`),
  z 57, no rotation. Main entrance south at local x 0.5 (world 86.5) facing the lane at z 62; chamfered corner with a
  hanging coin sign faces the same lane from the south-east.
- Upper glazing is `Bank_UpperGlazing` (hides with the upper storey).

## Services and targets (local)
| Target | Service mesh | Stance |
|---|---|---|
| entrance | lane outside the south door (extractor start) | (0.5, -0.3, 5.5) |
| counter | `Bank_ServiceCounter_Booths` (three grilled booths) | (0.5, 0, -0.5) |
| vault | `Bank_ServiceVault_Gate` + `Bank_ServiceVault_Chests` | (3.5, 0, -1.5) |
| shop | `Bank_ServiceShelves_Goods` | (4.5, 0, 0.5) |
| clerk | upstairs clerk room via `Bank_StairTreads` (12 treads, rise 0.231, run 0.40, 1.3 wide) | (-3.5, 3.0, 0.5) |

## Extractor
`[BUILDING_NAVIGATION] bank {"nodes": 197, "undirectedEdges": 279, "reachableNodes": 186, "targetsReachable": 5, "targetsTotal": 5, "complete": true}`
Model fixes found by the extractor: floor normals flipped by export vertex merging (merge disabled); stair stringer foot
cut the stair from the wing floor (pulled back).

## Self-review (agent)
1. Massing matches Building_Exterior_Option3: lower hipped, clipped-corner block joining a taller gabled wing, clipped
   corner to the lane, timber upper jettied over it on beam and brackets.
2. Stone base, plaster and timber above; checker floor, grilled booths and queue ropes echo Bank.jpg / Bank_Option1.jpg.
3. Weak: the hall hips nearly meet at a point (pavilion) rather than the reference's longer hip ridge.
4. Weak: the vault lean-to shows only from behind; the hall's east wall is a long blank stone field.
5. Interior walls are stone colour, not plaster; clay tiles (guide-house family) instead of thatch. Blender renders only
   so far; Studio/game review pending.
