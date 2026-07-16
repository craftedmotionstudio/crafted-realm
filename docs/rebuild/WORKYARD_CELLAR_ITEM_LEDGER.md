# Workyard basement — item-by-item production ledger

## Owner freeze — 2026-07-15

The owner has accepted the basement **for the time being**. Its room composition, placements, interactions, traversal,
and current asset versions are now frozen while production moves upstairs. This is room-level acceptance, not automatic
promotion of every prop into the shared reusable library. Reopen this room only for a demonstrated regression, a direct
owner request, or a shared system upgrade (for example the eventual canonical climb/seated character animations).

Status vocabulary: **owner-approved-for-now** means modeled in Blender, exported, integrated, verified by Codex, seen by
the owner in the live room, and protected by the freeze above. Individual comparison scores still govern whether a
family may be reused elsewhere.

## Room and traversal

| Family | Instances | Blender source | Runtime | Animation / function | Status |
|---|---:|---|---|---|---|
| Masonry shell + flagstone floor | 1 room | `assets/blender/buildings/holm_survival_workyard_cellar_v2.blend` | `assets/models/buildings/holm_survival_workyard_cellar_v2.glb` | Cutaway visibility, registered walkable floor, collision | Owner-approved-for-now |
| Surface floor hatch | 1 | `assets/blender/props/cellar_traversal_pair_v2.blend` | `assets/models/props/cellar_traversal_pair_v2.glb` | `Hatch_Open`, real climb down, black terrain occluder | Owner-approved-for-now, 9.0 |
| Cellar wall ladder | 1 | `assets/blender/props/cellar_traversal_pair_v2.blend` | `assets/models/props/cellar_traversal_pair_v2.glb` | Visible-mesh-only climb up, stronger wall lean/contact, climb audio, stable landing | Owner-approved-for-now, 9.4 |

## Stores and work station

| Family | Instances | Concept → Blender score | Interaction | Status |
|---|---:|---:|---|---|
| Reserve shelf | 1 | 9.1 | Right-click Inspect | Owner-approved-for-now |
| Supply barrels | 2 | 9.1 | Right-click Inspect | Owner-approved-for-now |
| Lidded crocks | 4 | 9.4 | Right-click Inspect | Owner-approved-for-now |
| Grain sacks | 2 | 9.0 | Right-click Inspect | Owner-approved-for-now |
| Handled baskets | 2 | 9.1 | Right-click Inspect | Owner-approved-for-now; open willow hoops, recessed woven floor, visible inner ribs |
| Provision table | 1 | 9.1 | Right-click Inspect | Owner-approved-for-now |
| Root basket | 1 | 9.2 | Right-click Inspect | Owner-approved-for-now; vegetables nested inside the rim over a visible woven interior |
| Cutting board + knife | 1 authored set | 9.1 | Right-click Inspect | Owner-approved-for-now |
| Aisle rug | 1 | 9.2 | Right-click Inspect | Owner-approved-for-now |
| The Moonward Watch framed pixel picture | 1 | 9.5 | Right-click Inspect | Owner-approved-for-now |
| Masonry hearth | 1 | 9.3 | North/back-wall fixture with positive masonry overlap; right-click Inspect; five-second `Hearth_Flame`; full recessed arched cavity; forged poker/shovel/brush set | Owner-approved-for-now |

All eleven families above live in one independently editable Blender collection:
`assets/blender/props/cellar_remaining_furnishings_v1.blend`. The optimized runtime family is
`assets/models/props/cellar_remaining_furnishings_v1.glb`. The machine-readable catalog is
`assets/catalogs/cellar_remaining_furnishings_v1.json`. The current export is **6,491 vertices / 11,146 triangles**.

## Previously completed furnishing families retained in the room

| Family | Instances | Blender source | Function | Status |
|---|---:|---|---|---|
| Storm Reserve Chest | 1 | `assets/blender/props/cellar_reserve_chest_v1.blend` | Continuous curved underside shell; two sealed arched outer end panels; wall-safe 60° overshoot / 54° settled pose; 0.28-tile roomward correction; 0.263-tile measured open-lid clearance; reserve state and audio | Owner-approved-for-now |
| Medieval wall torches | 2 | `assets/blender/props/cellar_wall_torch_v1.blend` | 0.72 scale; both fixtures anchored to east-wall masonry; slow `Flame_Flicker`; right-click Inspect | Owner-approved-for-now |
| Quiet corner chairs | 2 | `assets/blender/props/cellar_quiet_corner_v1.blend` | Player-scale seating snapped against the east wall; right-click Inspect | Owner-approved-for-now |
| Quiet corner table | 1 | `assets/blender/props/cellar_quiet_corner_v1.blend` | Right-click Inspect | Owner-approved-for-now |
| Yarn basket | 1 | `assets/blender/props/cellar_quiet_corner_v1.blend` | Right-click Inspect | Owner-approved-for-now |

## Stable Test Travel coordinates

| Station | X | Z | Plane |
|---|---:|---:|---:|
| Ladder landing | 325.95 | 302.47 | -1 |
| Reserve chest | 326.50 | 303.50 | -1 |
| Reserve shelf | 326.25 | 299.15 | -1 |
| Provision table | 330.00 | 298.35 | -1 |
| Masonry hearth | 333.28 | 302.55 | -1 |
| Moonward Watch picture | 326.22 | 302.55 | -1 |
| Quiet corner | 333.35 | 300.58 | -1 |

## Verification record

- Real surface-hatch click reaches the basement. Climb-up is now bound only to the visible wall-ladder meshes; the live return click awaits the owner/browser refresh gate.
- Clicking the floor underneath the cellar ladder is movement-only and cannot trigger climb-up.
- Generic furnishings display **Walk here** as the reachable left-click action and remain movement-only; right-click **Inspect** writes short descriptions to game messages.
- The hearth overlaps the north/back wall instead of floating in front of it, both torches carry east-wall mount metadata, and the picture's top edge is structurally locked below the full-height masonry cap.
- The barrel pair clears the forged hearth-tool stand by **0.192 tiles**; both basket families are genuinely open rather than capped with black discs; the root vegetables cross the rim from inside the basket; and the firebox has a full arched back, soot-darkened returns, and a recessed floor.
- The functional chest and both travel directions retain their primary actions; climb-up and climb-down have separate wooden-ladder cues.
- The Storm Reserve Chest remains visually wall-backed after a 0.28-tile roomward correction; its continuous-shell lid settles at 54° with **0.263 tiles of measured open clearance** from the masonry. False wooden underside partitions are structurally prohibited, and two full arched end panels seal the closed lid down to its lower chord.
- Eleven furnishing semantic families and their inspection targets are structurally gated by smoke.
- Final smoke result and performance numbers are recorded in `Bible_References/PASS_LOG.md`.
