# Survival Workyard Purposeful Upstairs Furnishings — Asset Factory v2 brief

- Asset ID: `workyard_upstairs_furnishings_v1`
- Status: `in-production`
- Gameplay role: A complete human-scale teaching lodge interior where every visible item explains survival, firemaking, cooking, storage, or the island's storm history
- Canonical scale fixture: 1.85-tile player, one-tile grid, gameplay camera

## Scale must pass before detail

| Measurement | Minimum | Maximum |
|---|---:|---:|
| work bench height | 1.02 | 1.18 |
| stool seat height | 0.5 | 0.64 |
| lesson table height | 0.88 | 1.06 |
| hutch height | 2.65 | 2.95 |
| bucket height | 0.68 | 0.88 |
| hearth height | 2.75 | 3.15 |
| wall fixture top | 2.65 | 3.65 |

## Required semantic parts

- `workyard_upstairs_furnishings_v1`
- `tool_bench`
- `workyard_crockery_hutch`
- `workyard_mug_shelf`
- `workyard_empty_bucket`
- `teaching_fireplace`
- `hearth_flame`
- `workyard_lesson_table`
- `workyard_lodge_rug`
- `workyard_hearth_rug`
- `firemaking_board`
- `storm_tally_beam`
- `net_rack`
- `workyard_storm_warden_relief`

## Proof order

1. Purpose and human scale beside the canonical player
2. Hand-designed silhouette and visible joinery
3. Material and color separation
4. Gameplay-camera readability
5. Room placement, collision and interaction
6. Final comparison sheets and smoke gate

## Integration contract

- room: holm_survival_workyard surface lodge and teaching hearth
- placement: Wall-led furnishing clusters with a clear cardinal route between both doors and the cellar hatch
- collision: Only the work bench and masonry hearth block navigation; wall fixtures, rugs, and tucked stools do not create invisible barriers
- interactions: Lesson bench, board, tally, net, and hearth retain service actions; all domestic scenery is left-click walk and right-click Inspect
