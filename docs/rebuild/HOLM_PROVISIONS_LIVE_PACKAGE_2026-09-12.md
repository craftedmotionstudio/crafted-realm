# Rack-enabled arrival export and real interaction

Status: opt-in arrival QA integration; full-island completion and final art acceptance remain open. The previous turn made progress by establishing a measured placement contract and direct Studio route evidence.

## Validated package

`tools/stage_holm_arrival_provisions.js` stages fourteen files in `holm-arrival-package-v2`, exports `a0c7148866b7787c`, and obtains an all-green plan. It never applies. Original ten-file export remains unchanged. The new package carries the rack `.blend`/GLB plus manifest and placement sources. Compiler reconstruction derives the additional object, blocker, service stance and return routes together. The browser loader accepts the complete fourteen-file export and returns augmented layout/envelopes only after byte/hash and deterministic reconstruction checks.

`tools/validate_provision_model.js` measures actual transformed GLB positions and verifies local bounds, primitive/triangle/material counts and semantic families. Its 26 checks include altered geometry with a fresh hash, unsafe accessor/index bounds and transformed hierarchy cases. The actual export test verifies a rehashed/recompiled package with geometry drift is still rejected. This establishes model-to-bound correspondence, not visual quality or Blender-source/export correspondence.

## Real in-app evidence

The QA provider now loads this validated export. The isolated `arrival-live-01` save retained its equipped hatchet, tinderbox, net, five coins and `chop_logs` lesson. Because graph revision changed, its old draft checkpoint returned to the landing; this is the existing conservative draft policy, not a completed normal-save migration feature.

Using real pointer clicks, the player walked landing → shore approach → porch → ground-floor interior. Clicking the visible rack moved the player to `ground:68,96`, Y 3, and called `HolmGuideHall.collectTools` through the original atomic recovery service. The service reported that all unlocked tools were already carried/equipped. Read-only inspection confirmed one equipped hatchet, one tinderbox, one net, five coins and zero console errors; no duplicates appeared. Screenshot: `.studio-workspaces/holm-arrival-package-v2/rack-live-recovery.png`.

The model owner registers all rack parts as one service identity and hides the rack on the upper floor. Disposal remains within its existing owned-resource lifecycle. Collection only executes after the pending walk settles at the authored stance. Clicking elsewhere clears the pending service.

## Limits and remaining work

The actual no-op collection path is verified. Full-pack, bank-owned, save-refusal and successful replacement logic retain passing service tests; these adverse paths have not all been played through the new rack UI. Final same-revision reload/Continue/Enter restored exactly `ground:68,96`, position `[68.5,3,96.5]`, equipped hatchet, one tinderbox/net, five coins and `chop_logs`; zero errors. The rack retains provisional visual status: room scale and placement are readable, but no 9.0 comparison acceptance is claimed. The larger island, northern survival connection, guidance/minimap, remaining buildings/NPCs, lessons, caves, Lastlight/departure and intermittent performance defect remain unfinished.

## Checks

Original package tests, original 26-case loader suite, model owner lifecycle, provision compiler, recovery service, old transaction rejection and new actual fourteen-file export tests pass. Geometry validator passes 26/26. No live Safe Publish apply or default-provider switch occurred.

Foreground default-world smoke `arrival-rack-live-regression-20260912` **FAIL at 14 FPS**. Structural 105/105, real walk 2835 ms, six boundaries/25 tiles and exact lossless save/load passed. Boot 3822 ms, worst frame 91 ms, 120 draw calls, 34,008 triangles, five ticks, no console errors. Historical intermittent performance is not resolved; this result is retained rather than replaced by repeated attempts.
