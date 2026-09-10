# Workyard Cellar Traversal Pair v2 — Asset Factory v2 brief

- Asset ID: `cellar_traversal_pair_v2`
- Status: `integrated-awaiting-owner-review`
- Gameplay role: Two purpose-built architectural forms for readable travel into and out of the Survival Workyard cellar
- Canonical scale fixture: 1.9-tile player, one-tile grid, gameplay camera

## Scale must pass before detail

| Measurement | Minimum | Maximum |
|---|---:|---:|
| surface width | 1.05 | 1.3 |
| surface depth including open lid | 1.7 | 1.95 |
| surface height | 1.35 | 1.55 |
| surface opening width | 0.85 | 1.05 |
| surface opening depth | 0.9 | 1.1 |
| surface ladder rise | 0.8 | 1.0 |
| cellar width | 1.1 | 1.4 |
| cellar depth | 0.6 | 0.9 |
| cellar height | 3.0 | 3.3 |
| cellar ladder rise | 2.9 | 3.1 |
| cellar clear rung width | 0.55 | 0.72 |
| cellar rung spacing | 0.27 | 0.34 |
| cellar rung count | 9 | 9 |

## Required semantic parts

- `cellar_traversal_pair_v2`
- `SurfaceFloorHatch`
- `SurfaceHatchStatic`
- `SurfaceHatchLid`
- `CellarWallLadder`
- `SurfaceHatchStaticRuntimeMesh`
- `SurfaceHatchLidRuntimeMesh`
- `CellarLadderRuntimeMesh`

## Proof order

1. Separate the surface floor opening from the cellar wall ladder
2. Lock both forms against the 1.9-tile canonical player
3. Prove hand-shaped topology and restrained medieval material separation
4. Gate the floor hatch and wall ladder independently against their concepts
5. Replace rejected runtime visuals while preserving proven travel mechanics
6. Climb both directions in the real game and pass smoke

## Integration contract

- room: holm_survival_workyard_cellar
- surfacePlacement: Flush inside the workyard floor opening; open lid rises clearly behind it without hiding the shaft
- cellarPlacement: Against the west cellar wall with rails disappearing into the upper opening
- collision: Preserve existing cardinal landing tiles and proxy-owned pathing
- interactions: Existing Climb-down and Climb-up proxies remain the mechanics owners
