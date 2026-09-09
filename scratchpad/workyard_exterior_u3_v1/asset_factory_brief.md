# Survival Workyard Exterior Occupation Yard U3 — Asset Factory v2 brief

- Asset ID: `workyard_exterior_u3_v1`
- Status: `review`
- Gameplay role: The woodcutting occupation yard outside the Survival Workyard: restrained timber storage, log processing, and splitting explain the path from felled tree to hearth fuel
- Canonical scale fixture: 1.85-tile player, one-tile grid, gameplay camera

## Scale must pass before detail

| Measurement | Minimum | Maximum |
|---|---:|---:|
| rack frame height | 1.45 | 1.7 |
| log stack top height | 1.1 | 1.45 |
| chopping block height | 0.52 | 0.72 |
| axe overall length | 0.95 | 1.15 |
| embedded axe top height | 1.35 | 1.75 |
| sawbuck height | 0.85 | 1.1 |

## Required semantic parts

- `workyard_exterior_u3_v1`
- `timber_log_rack`
- `log_stack`
- `rope_restraints`
- `chopping_block`
- `embedded_axe`
- `sawbuck`

## Proof order

1. Purpose and human scale beside the canonical player
2. Hand-designed silhouette: irregular frames, individually authored logs, weathered stump
3. Authored contact: logs on bearers, ropes wrapping the load, axe biting the block
4. Material and color separation: bark, pale endgrain, forged iron, hemp rope
5. Gameplay-camera readability
6. Cardinal installed-contact turnaround: every object from north, south, east, west
7. Final comparison sheets against both Nano Banana boards

## Cardinal installed-contact proof

- Render and inspect the installed object from north, south, east, and west.
- Bank the contact sheet at `scratchpad/workyard_exterior_u3_v1/turnaround_sheet_family.png`.
- Record the collision audit at `scratchpad/workyard_exterior_u3_v1/turnaround_review_family.json`.

## Integration contract

- room: holm_survival_workyard exterior occupation court (Codex-owned integration)
- placement: Rack against the court's south edge near local (2.25, -4.70); chopping block near (0.80, -2.25); sawbuck east of the block; the chicken pen at (7.50, -4.00) is removed and its socket reserved
- collision: Rack, chopping block, and sawbuck are solid navigation blockers on their footprints; ropes, chips, and sawdust never collide
- interactions: Chopping block + embedded axe host the splitting lesson interaction; rack and sawbuck are right-click Inspect scenery until a gathering lesson claims them
