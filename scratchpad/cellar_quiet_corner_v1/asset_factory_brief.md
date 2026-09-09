# Storm Cellar Quiet Corner — Asset Factory v2 brief

- Asset ID: `cellar_quiet_corner_v1`
- Status: `integrated`
- Gameplay role: Human-scale resting, conversation and domestic-story vignette
- Canonical scale fixture: 1.9-tile player, one-tile grid, gameplay camera

## Scale must pass before detail

| Measurement | Minimum | Maximum |
|---|---:|---:|
| family width | 2.9 | 3.3 |
| family depth | 1.35 | 1.7 |
| family height | 1.72 | 1.82 |
| tall chair height | 1.7 | 1.82 |
| low chair height | 1.25 | 1.45 |
| tall chair seat | 0.52 | 0.65 |
| low chair seat | 0.48 | 0.6 |

## Required semantic parts

- `cellar_quiet_corner_v1`
- `TallFiresideChair`
- `LowWovenWorkChair`
- `SevenSidedSideTable`
- `HandledYarnBasket`
- `TallChairRuntimeMesh`
- `LowChairRuntimeMesh`
- `SideTableRuntimeMesh`
- `YarnBasketRuntimeMesh`

## Proof order

1. Scale fixture and silhouette beside the canonical player
2. Construction and reference-defining features
3. Materials and color separation
4. Gameplay-camera proof
5. Room placement, collision and interaction
6. Final comparison sheet and smoke gate

## Integration contract

- room: holm_survival_workyard_cellar
- placement: East-side quiet corner facing room center
- collision: Tight furnishing-only boundary outside the central cardinal route
- interactions: Two Sit targets and two Examine targets
