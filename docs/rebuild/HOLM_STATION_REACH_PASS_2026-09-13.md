# Station reach hardening — 2026-09-13

## Test identity and scope

Focused shared-helper repair, not full new-bakehouse or island acceptance. Main integrator: Codex. In-app browser at `http://127.0.0.1:8777/?qaProfile=station-reach-20260913&smoke=1`. Disposable fresh profile; no Administrator Console or Test Travel used. Previous goal turn classified as progress (Blender animated hearth and recipe audit).

## Change

`src/holm_station_reach.js` previously called the station handler when its building, player or movement dependencies were missing. It also passed a handler straight to the scheduler, whose arrival check is horizontal only.

The helper now refuses malformed tile/reach inputs, missing roots/player state and unavailable movement dependencies. Stations default to plane 0 and may declare explicit `tile.plane` and local `tile.y`. Explicit local Y transforms with the building; legacy surface stations continue to use `groundY`. Arrival requires the same building instance, unchanged world station position, matching plane, finite coordinates, height difference at most 0.5 and the requested horizontal reach. The callback rechecks these conditions and runs at most once. A blocked request invalidates and cancels its pending callback. `guard` preserves handler context. Index cache key advanced to v2.

Existing guarded callers were inspected: seven building modules use ground X/Z stations, including the mine's surface Climb-down action. None intentionally requires nonzero plane under the old data. Existing worldTile consumers retain unsnapped X/Z positions.

## Acceptance evidence

- `node --check src/holm_station_reach.js`: PASS.
- `node tools/test_holm_station_reach.js`: **45/45 PASS**. VM fixtures cover immediate use, scheduled arrival, explicit height, legacy terrain height, missing dependencies, malformed inputs, wrong plane/height, moved/replaced/disappeared roots, stale callbacks, blocked scheduling, single execution and preserved context. These stub the scheduler and are not collision proof.
- Real-pointer in-app positive path: after smoke settled beside the Guide Hall, clicked its visible island chart. The avatar walked into the hall, the relief-chart dialogue appeared and the objective advanced to wielding the Bronze hatchet. Required recovery tools appeared in the pack through the existing tutorial flow. No programmatic gameplay invocation or teleport. Screenshot: `scratchpad/holm_perf/station-reach-chart.png`.
- Foreground smoke: **PASS105/105**, boot823ms, real walk3579ms, six streaming boundaries, exact lossless save/load,60FPS,worst22ms,125draws,34270triangles,seven ticks. Zero uncaught/console errors. Evidence `scratchpad/holm_perf/station-reach-smoke.json`.
- Console read after the real chart interaction: no warnings/errors.

## Limits and remaining requirements

This closes fail-open dependency and wrong-floor/stale-arrival defects. It does **not** prove line of sight through every wall: existing horizontal reach and authored station tile assumptions remain, and the scheduler/pathfinder still owns route execution. Unit-test wrong-floor cases are not a real upstairs interaction test. The new two-storey bakehouse needs explicit measured station/floor data and its own complete cooking, negative-case and save/reload flow. All seven old building service flows were not replayed in this pass; the Guide Hall is the real-pointer regression sample.

No item data, XP curve, combat math, save schema or world-authoring package was changed. No Safe Publish apply. The original 18-lesson curriculum, chef, new bakehouse ingredient bindings, post-advance save behavior and wider island completion remain active requirements. Full end-to-end acceptance is still incomplete.
