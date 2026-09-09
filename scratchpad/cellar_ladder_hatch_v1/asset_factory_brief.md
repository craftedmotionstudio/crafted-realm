# Storm Cellar Ladder and Descent — Asset Factory v2 brief

- Asset ID: `cellar_ladder_hatch_v1`
- Status: `planned-scale-lock`
- Gameplay role: Readable, safe two-way travel between the Survival Workyard and its storm cellar
- Canonical scale fixture: 1.9-tile player, one-tile grid, gameplay camera

## Scale must pass before detail

| Measurement | Minimum | Maximum |
|---|---:|---:|
| family width | 1.15 | 1.75 |
| family depth | 0.55 | 1.1 |
| family height | 2.2 | 2.65 |
| ladder rail height | 2.15 | 2.55 |
| clear rung width | 0.5 | 0.72 |
| rung spacing | 0.25 | 0.34 |
| descent visual depth | 0.3 | 0.7 |

## Required semantic parts

- `cellar_ladder_hatch_v1`
- `LadderFrame`
- `RaisedHatchSill`
- `DarkDescent`
- `LadderRuntimeMesh`
- `HatchRuntimeMesh`
- `DescentRuntimeMesh`

## Proof order

1. Scale fixture, wall lean and silhouette beside the canonical player
2. Raised sill, fitted rails, hand-spaced rungs and readable dark descent
3. Aged oak, forged iron and masonry material separation
4. Gameplay-camera descent-depth proof from both planes
5. Real climb down, real climb up, landing and collision proof
6. Final comparison sheet and smoke gate

## Integration contract

- rooms: Survival Workyard surface hatch and storm-cellar west-wall landing
- placement: Ladder leans against a raised fitted sill; dark descent occupies the opening, never grass
- collision: Preserve the proven cardinal landing tiles on both planes
- interactions: Climb-down on surface and Climb-up underground
- animationSockets: Hands, feet, top dismount and bottom landing for the later canonical player climb clip
