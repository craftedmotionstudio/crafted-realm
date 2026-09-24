# In-app Studio render contention — 2026-09-12

The arrival game recovered to 59.998 FPS (180 frames, p95 17.3 ms, 128 draw calls, 21,893 triangles) after the new Pause preview control stopped the Studio render loop. The Studio scene and Blender models remained loaded. Previous same-session A/B/A observations: game alone about 60 FPS; Studio restored about 9.19 FPS; unloading Studio about 60 FPS. Both in-app documents reported visible/focused, so automatic visibility pausing would not reliably address this case.

Added an explicit Pause preview / Resume preview control to the overhaul Studio. Pausing freezes preview animation and camera updates; resuming resets the frame clock and retains authored scene state. This changes the authoring preview, not gameplay quality or model geometry.

Added bounded frame-stage telemetry to CRDebugStats, separating synchronous update, minimap and renderer submission from time outside the frame callback. The latter is not attributed to GPU or idle time without evidence. Nine deterministic tests and five module acceptance checks pass. Core loop syntax passes.

The house and provision rack retain actual editable Blender sources in their candidate workspaces. Their art acceptance is still open. This performance pass neither accepts the art nor publishes the staged arrival package. Full island goal remains active.

Foreground default smoke on disposable profile studio-pause-gate-20260912: PASS, 105/105 structural checks, real out-and-back 3598 ms, six streaming boundaries, exact save/load and lossless progress, 60 FPS, worst frame 21 ms, 92 calls / 33,044 triangles, seven ticks, zero console errors. Previous 14 FPS failures remain in the record. Timing snapshot: scratchpad/holm_perf/studio-paused-smoke.json.

Direct Studio review: the pause button is legible above the controls and its Resume preview state is clear. Existing broad roof and stone-wall hierarchy, warm roof/wood separation and human-scaled dock remain readable. The island still has sparse planting and unbuilt envelopes; the house remains too regular for final acceptance. Animation is intentionally frozen while paused. No asset score upgraded.
