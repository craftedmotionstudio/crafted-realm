# In-app performance diagnosis and walk-surface repair - 2026-09-12

Previous goal turn: progress, with actual floor-click and checkpoint implementation. Full island goal remains active.

The repeated12-13FPS failure did not reproduce in this session. A fresh in-app smoke passed at60FPS before any source edit: boot857ms, structural105/105, worst22ms,92draws33044tris,6ticks,console0errors. CDP reported visible tab, DPR1.5, framebuffer2418x1590, ANGLE/NVIDIA RTX4070 Laptop D3D11. These facts do not establish why prior runs were slower.

A short settled CPU profile was captured using in-app CDP Profiler and disabled afterward. File scratchpad/holm_perf/iab-settled.cpuprofile contains9549 samples,80.6percent idle. updateMatrixWorld229 and getObjectByProperty205 aggregated samples are candidates, not proof of the former low-FPS cause. No page/game state was altered by profiling.

Independent source audit found WorldWalkSurfaces called root.updateMatrixWorld(true) per overlapping height query, recursively updating visual descendants. Replaced both bounds and height refreshes with root.updateWorldMatrix(true,false), resolving the owner's ancestors without descending through building art. This also fixes bounds computed under a newly transformed ancestor.

In-app regression tools/test_walk_surfaces.html against actual Three r128 failed the first transformed-height assertion before the change. Afterward it passed105 checks: translated parent, rotated owner, repeated exact heights, outside rejection, overlapping highest ground platform, unregister restoration/removal, and zero visual descendant updates across100queries. This retains the existing ground-platform semantics; upstairs still uses the separate new navigation module.

node tools/test_world_v2.js passed all contract locks. Post-change full foreground in-app smoke on continued disposable profile: PASS60FPS, boot645ms, structural105/105, out/back2815ms, stream6boundaries25tiles/exact save-load, worst21ms,91draws33042tris,ticks7,console0errors,total22412ms. Saved walk-surface-smoke.json. A real pointer floor click moved the adventurer from outside the old Guide Hall through the doorway; saved walk-surface-live-pointer.png. No new visual acceptance is claimed for old rejected art.

Important limit: pre-change was already60FPS. This pass fixes independently demonstrated transform correctness/redundant work; it does not prove resolution of historical12-13FPS or identify their cause. Platforms remain static in X/Z after registration; moving-owner bounds refresh is not added here. No combat/XP, NPC state, saves, world authoring, or graphics quality settings changed. index.html only bumps the changed script URL in this pass. Full overhaul, live integration of new arrival/terrain and all remaining art/content/QA still required.
