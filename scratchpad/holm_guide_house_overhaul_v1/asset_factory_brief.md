# Bram’s Guide House — Asset Factory v2 brief

- Asset ID: `holm_guide_house_overhaul_v1`
- Status: `source-unapproved`
- Gameplay role: Orientation downstairs; a usable study and sleeping room upstairs, reached by actual stairs.
- Canonical scale fixture: 1.9-tile player, one-tile grid, gameplay camera

## Scale must pass before detail

| Measurement | Minimum | Maximum |
|---|---:|---:|
| width | 12 | 13.5 |
| overall depth including south porch | 13.3 | 13.7 |
| height | 7 | 9 |
| door width | 2 | 2 |
| door height | 2.3 | 2.4 |
| upper floor | 2.8 | 2.8 |

## Required semantic parts

- `GuideHouse`
- `GroundShell`
- `UpperShell`
- `Roof`
- `GroundFloor`
- `UpperFloor`
- `StairFlight`
- `DoorNorthHinge`
- `DoorSouthHinge`
- `DoorNorthLeaf`
- `DoorSouthLeaf`

## Proof order

1. Scale and silhouette
2. Openings, fitted stairs and floor cutaway
3. Stone construction and roof hierarchy
4. Furnishings and warm materials
5. Cardinal installed contacts in open/closed poses
6. Real pointer upstairs traversal and smoke

## Cardinal installed-contact proof

- Render and inspect the installed object from north, south, east, and west.
- Bank the contact sheet at `scratchpad/holm_guide_house_overhaul_v1/sheet.png`.
- Record the collision audit at `scratchpad/holm_guide_house_overhaul_v1/review.json`.

## Integration contract

- layout: docs/rebuild/holm-overhaul/arrival-layout.json
- collision: Authored walls, stair surfaces and upper-floor opening; no live collision proof yet
- interactions: Study chart, speak to Bram, enter/exit and climb stairs
- porch: South porch roof reaches local z7.8; rear roof edge reaches z-5.6. Main house remains12x10. Overall depth contract intentionally includes this authored porch.
