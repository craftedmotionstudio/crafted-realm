# Shared arrival water — 2026-09-12

Progress, not full-island acceptance. Added src/holm_arrival_water.js, shared by r128 isolated arrival game and r160 overhaul Studio. Both consume their terrain bundle creek arrays as [X,Z,Y]; only Studio applies (-72,-64) translation. Runtime consumes the validated export document. No authored package files were changed or published.

The previous isolated game had an ocean only. It now has the authored 13-section creek: 28 shared vertices and 26 triangles, one extra draw call, no bank/navigation changes. Ocean and creek use a shared Lambert material with time-driven fine highlights. Shoreline vertices do not move. Studio skiff stencil exclusion is retained. Water owns/disposes two geometries and one material; the Studio pause also stops its time progression.

Validation: deterministic ribbon, immutable input, exact coordinate translation/shared indices, invalid widths/duplicates/reversal/nonfinite rejection pass. Existing provisions validation still passes four door graphs and sixteen reversible route legs with 27 invalid cases rejected. Both actual browser renderers compiled the shader without console errors. Repeated Studio reload succeeded.

Real in-app Continue restored ground:68,96 at [68.5,3,96.5] and the chop_logs lesson. Pointer walking reached ground:66,97 and then ground:66,103 at Y3. Two initial clicks at the porch/outside had no open route; they are not counted as successful movement. This pass does not re-prove the entire dock route. Settled arrival performance was 59.996–60.006 FPS. Actual scene inspection confirms ArrivalOcean 4 vertices/2 triangles and ArrivalCreek 28 vertices/26 triangles. No console errors.

Direct visual review: first highlights looked like regular dots, corrected to thinner quieter streaks. In Studio the warm teal water separates from sand/green banks, shared creek bends are visibly closed, and the open skiff remains readable. The motion treatment is deliberately simple; no moving shoreline, foam or full water acceptance is claimed. Gameplay water appears brighter under the game lighting and needs the broader scene/material review. House proportions and sparse landscaping remain below the full visual bar. Evidence: scratchpad/holm_perf/arrival-water-studio.png and arrival-water-game.png. No asset score upgraded.

Remaining: final shoreline/mouth/oblique skiff animation review, package-owned landscape and skiff, north survival route, the rest of the authored island, all appearances/NPCs and end-to-end lessons. The goal stays active.

Default foreground regression smoke, arrival-water-gate-20260912: PASS, 105/105, real out/back 3598 ms, six streaming boundaries and exact lossless save/load, 60 FPS, worst20 ms, 94 calls/33,084 triangles, seven ticks, zero errors. This checks the default provider regression; isolated arrival evidence is separately recorded above.
