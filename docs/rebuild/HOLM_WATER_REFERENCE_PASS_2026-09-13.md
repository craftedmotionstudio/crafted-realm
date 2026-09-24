# Muted reference water — 2026-09-13

The shared arrival-water material now uses unlit blue-gray color with subtle, slow variation and sparse low-contrast glints. This replaces the bright cyan and repeating stripe impression identified in direct terrain reviews. Warm directional lighting no longer changes the water to green/cyan. The ribbon vertices, elevations, stencil mask contract, ocean plane, navigation and disposal remain unchanged. Both script consumers were cache-bumped.

Changed source: `src/holm_arrival_water.js`; game and terrain Studio use the same source. `node tools/test_holm_arrival_water.js` passed deterministic ribbon, coordinate parity, immutability and invalid-input checks. These tests cover geometry, not visual appearance.

Direct in-app evidence: the r160 terrain Studio shows muted blue-gray sea and creek with no dominant repeated stripes (`scratchpad/holm_perf/water-reference-gray-studio.png`). The r128 actual game was entered through New Adventurer / Begin / Enter / Keep default look in isolated profile `water-gray-20260913`. A real pointer click walked the adventurer from landing to dock end. Water rendered correctly throughout; error log was empty. Existing warnings concerned Lambert flatShading and skipped legacy building warm-up, not the water shader. Game evidence: `scratchpad/holm_perf/water-reference-gray-game-dock.png`.

Direct visual findings: quiet broad color is much closer to `Bible_References/Landscape_Option.jpg` and separates clearly from the bank. Shoreline/silhouette unchanged; animation is deliberately restrained. This does not accept the whole landscape: terrain transitions, gray coast rocks, underwater plants, foliage, reference comparison and complete island integration still need work. The Studio and isolated game show different current vegetation families; this pass does not claim those have been unified.

Foreground ordinary-game smoke PASS:105/105; realwalk3425ms; six boundaries and exact/lossless save-load;60FPS, worst36ms,125draws,34270triangles,7ticks;zeroerrors. Total23121ms. This is regression proof; castle gameplay remains unintegrated.
