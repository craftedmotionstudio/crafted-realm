# Pending bake cancellation — 2026-09-13

Status: runtime lifecycle repair verified with controlled tests and ordinary foreground smoke. Full tutorial-island goal remains active. Previous pass made progress through the shared recipe planner and real-pointer Studio recipe circuit.

## Change

`src/cooking_bread.js` now keeps one pending bake request. A replacement clears its predecessor; even an already queued callback cannot execute after replacement. A request expires after 30 seconds. Stopping out of range, changing floor or world provider, moving the target, an expired fire, invalid positions, deselection, missing dough or a competing action cancels the request. Cancelled requests preserve inventory and award no XP or tutorial credit. Timely arrival still commits the shared recipe once. Index cache version is now v3.

## Evidence

- `node --check src/cooking_bread.js`: PASS.
- `node tools/test_bread_recipe_wrappers.js`: 18/18 PASS, executing the actual module with controlled positions, movement and time. Includes deadline/late arrival, stopped walk, floor/provider changes, moved/expired target, malformed positions, replacement and stale callback, and successful timely arrival.
- Shared recipe planner suite: 31/31 PASS.
- Foreground in-app browser `?qaProfile=bake-cancellation-20260913&smoke=1`: PASS 105/105; boot 798 ms; actual out-and-back walk 3583 ms; six streaming boundaries with exact save/load and lossless progress; 60 FPS, worst frame 29 ms, 125 draw calls, 34,270 triangles, seven world ticks; zero console or uncaught errors. Browser boot log confirms cooking_bread.js?v=3.
- Banked verdict: `scratchpad/holm_perf/bake-cancellation-smoke.json`.

## Limits and next work

This pass does not claim a real-pointer unreachable-bake reproduction. Controlled timer tests prove cancellation behavior; ordinary smoke proves startup and existing movement/save gates. Full new Blender bakehouse integration with real Player inventory, tutorial, save/reload, modeled chef and all 18 required lessons remains unfinished. Reach still uses the existing 2.4-unit distance contract; general wall line-of-sight and station provenance require separate work. No world authoring publish, combat/XP-curve change or save-schema change occurred.
