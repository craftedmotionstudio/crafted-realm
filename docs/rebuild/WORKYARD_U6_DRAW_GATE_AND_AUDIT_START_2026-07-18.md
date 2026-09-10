# Workyard U6 draw gate and room-audit start

Date: 2026-07-18  
Status: engineering acceptance; owner whole-room review remains

## Outcome

The Survival Workyard now meets its unchanged production budget. Its U4 waterworks family was optimized in the
editable Blender source, rebuilt, and revalidated rather than patched in the browser. The dock silhouette, plank
variation, piles, braces, pulley, bucket, semantic anchors, and three animation clips are unchanged.

| Metric | Before | After | Lock |
|---|---:|---:|---:|
| U4 triangles | 5,204 | 5,204 | unchanged |
| U4 primitives | 47 | 26 | — |
| Production triangles | 25,202 | 25,202 | 42,000 |
| Production draws | 191 | 170 | 170 |
| Helper triangles / draws | 1,352 / 43 | 1,352 / 43 | reported separately |
| Whole Studio preview | 26,134 / 248 | 26,134 / 227 | diagnostic only |

The static roof-off composition owns 168 GLB primitives. The remaining two production draws are the animated runtime
hearth-flame effect. `tools/test_world_v2.js` now calculates and locks that relationship.

## Direct visual review

- **Silhouette and proportion:** dock and pulley silhouettes are unchanged; player-scale relationships remain clear.
- **Shape hierarchy:** shore span, turning platform, bank span, frame, crank, rope, and bucket remain distinct.
- **Color/material separation:** compatible hidden/redundant slots were remapped; visible oak, iron, rope, and water
  separation remains readable at the gameplay camera.
- **Reference-defining features:** varied planks, structural braces, rope detail, bucket and hand crank remain present.
- **Animation/interaction readability:** idle, lowering, water contact, lifting, and settled proof frames pass.
- **Family consistency:** dock comparison remains 9.1/10 and pulley comparison remains 9.0/10.

## Whole-room audit foundation

The room audit now has deterministic coverage for the two most regression-prone rules:

1. every functional surface lesson/service interaction with an authored interaction tile is cardinally reachable
   from the trail entrance within interaction distance;
2. all fourteen decorative furnishing/yard props remain right-click Inspect only, with no accidental primary action.

This does not replace the owner's final composition review. U6 should close only after a normal play pass through both
doors, roof transition, work court, waterworks, fishing edge, hatch approach, and all contextual interactions.

## Verification

- U4 one-command asset pipeline: PASS.
- U4 pure contract: 21/21 PASS.
- World V2 contract, including composed draw and cardinal room locks: PASS.
- Content integrity: PASS.
- Real r160 Studio: 25,202 triangles / 170 production draws, no over-budget warning.
- Foreground real-game smoke: 103/103 PASS, 99 FPS, 168 calls, zero errors.
