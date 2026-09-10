# Survival Workyard U5 Small-Net Fishing Edge — Asset Factory v2 brief

- Asset ID: `workyard_fishing_edge_u5_v1`
- Status: `brief`
- Gameplay role: A compact authored fishing target at the accepted U4 dock terminal, teaching the existing Small net and Raw mirrorperch loop without rebuilding the dock
- Canonical scale fixture: 1.85-tile player, one-tile grid, gameplay camera

## Scale must pass before detail

| Measurement | Minimum | Maximum |
|---|---:|---:|
| clear cardinal walking lane | 1.2 | 2.0 |
| fishable water patch width | 2.6 | 3.4 |
| fishable water patch depth | 1.6 | 2.4 |
| water below dock | 0.4 | 0.6 |
| creel height | 0.35 | 0.65 |
| fish length | 0.32 | 0.65 |

## Required semantic parts

- `workyard_fishing_edge_u5_v1`
- `fishing_water_patch`
- `fishing_ripple`
- `fish_school`
- `dock_creel`
- `catch_fish`
- `catch_presentation_socket`
- `fishing_operator_socket`
- `fish_reward_socket`
- `water_surface_socket`

## Proof order

1. Purpose and human scale beside the canonical player
2. Readable fishing-water silhouette without a giant marker
3. Open woven creel with visible interior and fitted lid/strap
4. Underwater fish, sparse ripples, bubbles, and material separation
5. Animation readability: calm drift, bite response, catch presentation
6. Installed-contact turnaround from north, south, east, and west
7. Final concept-to-Blender comparison

## Cardinal installed-contact proof

- Render and inspect the installed object from north, south, east, and west.
- Bank the contact sheet at `scratchpad/workyard_fishing_edge_u5_v1/turnaround_sheet_installed.png`.
- Record the collision audit at `scratchpad/workyard_fishing_edge_u5_v1/turnaround_review_installed.json`.

## Integration contract

- room: holm_survival_workyard U4 terminal fishing platform
- placement: Compose the U5 root at the live U4 fishing_edge_socket; do not alter the accepted U4 family
- collision: Water, fish, ripples, bubbles, sockets, and catch presentation add no collision. The creel stays outside the 1.2-tile cardinal lane and needs no new blocker at this scale.
- interactions: The visible water/ripple family owns a forgiving Small-net target. The operator socket owns approach; the runtime requires fishing_net, awards raw_perch and Fishing XP exactly once, and persists a bounded operation ledger.
