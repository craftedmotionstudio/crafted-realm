# Arrival skiff and frame-delivery isolation

Previous goal turn was progress: the Blender dock and its navigation/checkpoints were implemented, and a real warm-up ownership defect was fixed. This pass continues the full arrival slice and investigates the remaining intermittent performance failure. The full tutorial island objective is unchanged and incomplete.

## Blender skiff

Actual Blender source `tools/blender/build_holm_arrival_skiff_v1.py` generated `.studio-workspaces/holm-arrival-skiff-v1/candidates/skiff.blend`, `skiff.glb`, and `manifest.json`. The candidate has 2688 triangles, eight meshes, five materials, eleven exported primitives, thick open hull, ribs, three thwarts, duckboards, cleats and stowed oars. Export checks include finite geometry, open-interior probe and the four-second IdleBob clip (translation amplitude .028 and roll .016 radians). These are structural export checks, not complete avatar boarding proof.

Placement data `docs/rebuild/holm-overhaul/arrival-skiff.json` puts the skiff beside the dock at58.65,-.03,126.2, shifted seaward after checking terrain samples to avoid grounding its bow. The Studio uses the actual exported animation inside a separate placement parent. The Boat & landing camera shows the hull and its relationship to the deck. Clicking the boat uses a declared dock approach stance, with ordinary cardinal walking, rather than teleporting onto the boat.

Direct close review found ocean geometry drawing through the open interior. The Studio now uses a stencil water mask based on inset source hull stations; opaque boat geometry remains intact. The mask is fitted to this fixed mooring pose, not a general traveling-boat water solution. The final view has a dry interior and visible waterline. The mask does not change collision or live water.

In-app house29: restored dock stance, walked ashore to exterior:61,118, clicked the visible hull, and received a real route to the skiff mooring. Final arrival evidence follows below. Dock cardinal/shore/railing/water/checkpoint tests remain passing (171 nodes).

Visual findings: open hull silhouette, gunwales, ribs/thwarts and warm wood are readable beside the player; olive upper strake fits the landscape. The boat helps explain the landing's purpose. Reference remains Bible_References/Complete/Fishing_Pier_Option1.jpg. No 9/10 acceptance or publication. Still missing: boarding/disembarking, rower, departure interaction, mooring line, refined shoreline/water motion, full scene comparison and live integration. The whole island's NPCs, buildings, caves and lesson requirements remain open.

## Performance evidence

`tools/qa_frame_delivery.html` is a local diagnostic with DOM-only and empty-WebGL2 modes, each four seconds, no game scripts. In the in-app browser:

- DOM-only:60FPS,16.8ms p95,62.41Hz timer, visible and focused.
- Empty1600x900WebGL2 canvas:60FPS,16.8ms p95,62.30Hz timer, visible and focused.
- Fresh game profile holm-frame-isolation-20260912, with no profiler/CDP access before smoke:PASS. Boot766ms,105/105structural, real walk3584ms, six streamed boundaries/exact save-load,60FPS/worst22ms/122calls/34264triangles/six ticks, zero errors.
- A later read-only CDP telemetry read still showed59.996FPS, visible and focused. A preceding four-second awaitPromise measurement exceeded the tool's observation timeout; no timing result was recovered and it is not treated as evidence. Its bounded callback completed; no game settings were altered.

Evidence files in scratchpad/holm_perf:dom-frame-delivery.json,empty-webgl-delivery.json,frame-isolation-smoke.json,frame-isolation-after-cdp.json. The same game code previously measured9FPS with94.6%CPU-profile idle time. This comparison disproves a universal in-app9FPS limit and proves a passing run is possible. It does not isolate the intermittent cause or prove a stable repair; do not credit unrelated art changes for the recovered performance or relax the budgets.

House29 final pointer result: clicking the hull from exterior:61,118 walked to dock:60,125 atY1. Console errors0. Close view after water-mask correction shows a dry interior, visible ribs/floor/thwarts and hull clear of the shore. Evidence scratchpad/holm_guide_house_overhaul_v1/skiff_house29_mooring.png. Mask pose and boarding remain limited as stated above. Final continued-profile live smoke pending.


Final continued-profile smoke: FAIL performance11FPS/worst139ms/3ticks,114calls/33976triangles. Boot reports ready with5125ms (phase ok despite over nominal5000); structural105/105, realwalk5012ms, sixboundaries/26tiles/exactsave, zeroerrors. Evidence skiff29-final-smoke.json. Immediate failed-run telemetry reports11.344FPS,document visible,document.hasFocus true (skiff29-failed-focus.json). This contradicts a stable resolution and does not isolate profiling/focus as cause. Fresh60 and continued11 are evidence, not proof that save state causes the failure; prior failures included fresh profiles too. Full performance acceptance remains open.

