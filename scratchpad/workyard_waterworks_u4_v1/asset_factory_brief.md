# Survival Workyard U4 Waterworks Dock and Bucket Pulley — Asset Factory v2 brief

- Asset ID: `workyard_waterworks_u4_v1`
- Status: `review`
- Gameplay role: The tutorial waterworks: an L-shaped pond dock connecting the Workyard shore toward the adjacent bank, carrying the bucket-pulley lesson station and the future fishing edge
- Canonical scale fixture: 1.85-tile player, one-tile grid, gameplay camera

## Scale must pass before detail

| Measurement | Minimum | Maximum |
|---|---:|---:|
| deck width | 1.9 | 2.2 |
| clear cardinal walking lane | 1.2 | 2.0 |
| deck height over water | 0.4 | 0.7 |
| pulley frame height | 1.8 | 2.4 |
| crank grip height | 1.3 | 1.8 |
| lesson bucket height | 0.4 | 0.6 |
| dock east-west extent | 5.5 | 7.5 |
| dock north-south extent | 5.5 | 7.5 |

## Required semantic parts

- `workyard_waterworks_u4_v1`
- `dock_shore_span`
- `dock_turn_platform`
- `dock_bank_span`
- `pulley_frame`
- `pulley_crank`
- `pulley_rope`
- `pulley_bucket`
- `fishing_edge_socket`
- `water_contact_socket`
- `shore_entry_socket`
- `bank_exit_socket`
- `pulley_operator_socket`

## Proof order

1. Purpose and human scale beside the canonical player on the deck
2. Unmistakable L silhouette with a clear cardinal walking lane
3. Hand-cut planks, fitted piles, braces, and selective rope-rail rhythm
4. Pulley station: frame, drum, crank, rope guide, hook, and open lesson bucket
5. Animation readability: idle sway, lower to water contact, lift to settled
6. Cardinal installed-contact turnarounds for shell, raised, and lowered poses
7. Final comparison sheets against both Nano Banana boards

## Cardinal installed-contact proof

- Render and inspect the installed object from north, south, east, and west.
- Bank the contact sheet at `scratchpad/workyard_waterworks_u4_v1/turnaround_sheet_raised.png`.
- Record the collision audit at `scratchpad/workyard_waterworks_u4_v1/turnaround_review_raised.json`.

## Integration contract

- room: holm_survival_workyard pond shore, from u4_waterworks_shore_socket (Codex-owned integration)
- placement: Family root pivot = shore-entry walking surface at Workyard-local (9.92, 1.85, 0.20); the dock runs +X over the pond, turns right, and lands on the bank at -Y; Codex adjusts after eyes-on terrain review
- collision: Deck spans are walkable surfaces bounded by rail edges; piles/braces below deck never collide with the walk lane; ropes, bucket travel path, and sockets never collide
- interactions: Pulley operator tile = pulley_operator_socket, left-click Operate, right-click Inspect (U4.07); fishing_edge_socket reserved for U5; the pure-data transaction contract lives in src/waterworks_u4_contract.js and is NOT runtime-installed
