# Holm boot warm-up audit — 2026-09-12

Read-only source audit. Base files `src/world_v2_warmup.js` and `scratchpad/holm_guide_house_overhaul_v1/landscape25-late-boot.json` exist. GUIDING_LIGHT, CLAUDE and AGENT_SPEC_TEMPLATE were read. No browser execution, performance experiments, production edits or gate changes were performed by this auditor.

The captured boot is ready in 5612.8 ms: shaders 2733 ms and player 1465.5 ms. This exceeds the existing 5000 ms gate. These values establish a slow boot, but do not establish the CPU/GPU cause. In particular, `src/boot_coordinator.js:49` timestamps a step **before** its rAF/timer yield at line 51. Its duration includes scheduling delay and intervening callbacks, not only `step.run()`. The player figure is therefore not a measured humanoid construction cost. The shader step can be compared with `WorldV2Warmup.snapshot().ms` and its base pass to separate this ambiguity.

## Proven source issues and minimum changes

1. **Warm-up geometry remains attached between passes.** `src/world_v2_warmup.js:61` attaches a visible group containing every cloned template to the live scene. Line 91 removes it only when no deferred jobs remain; normally three or more remain. The next callback is scheduled 250 ms after ready (`src/game5_main.js:975`), and removal after Play happens only when that callback notices `running` (`world_v2_warmup.js:102`). The actual renderer can run after Play and before that callback (`game5_main.js:815–828`). Thus real rendering can traverse warm-up clones temporarily. A screenshot need not show these origin-positioned clones for the lifecycle defect to exist. It does **not** explain sustained low FPS after `finishDeferred` has detached the group.

   Minimum safe repair: retain the clone group off-scene between passes, add it only around each synchronous compile in a try/finally, then detach immediately. Restore temporary owner visibility and remove temporary lights in finally as well. Keep existing shader/light coverage and do not dispose shared materials or geometry. This change fixes resource ownership irrespective of whether it accounts for the measured boot miss.

2. **Eight building families are cloned through two paths.** `world_v2_warmup.js:51–57` obtains each `WorldV2Buildings.modelUrls` building, then all `WorldV2Objects.warmTemplates()`. The latter manifest (`src/world_v2_objects.js:107–140`) includes those same eight building families. `WorldV2Buildings.build` returns a clone of its loaded template (`src/world_v2_buildings.js:525`); the Objects cache obtains another clone and then warmTemplates clones it again (objects lines 269–280 and 390–396). Shared material/geometry references mean these are redundant objects and traversal, not necessarily duplicate GPU programs. No evidence establishes that eliminating eight clones saves seconds.

   A later safe optimization can export explicit covered building IDs from the Objects template API and omit duplicate direct Building clones. Do not assume all future Buildings are in the Objects manifest. Preserve unique material, semantic, instancing and skinning combinations. Do not simply compile one arbitrary mesh per material: object features can affect shader keys.

3. **Player initialization repeats presentation work.** `Player.init` adds coins (`src/game3_systems.js:81`); `addItem` calls `UI.refreshInv`, which calls `refreshPlayerGear` (`src/game4_ui.js:82–90`). The player boot step then explicitly calls `refreshPlayerGear` and subsequently `UI.refreshInv` again (`src/game5_main.js:958–960`). The default humanoid is a procedural builder (`src/game2_world.js:2145`), not an awaited GLB load in this step. This confirms redundant gear/inventory refreshes. It does not establish a meaningful fraction of the 1465.5 ms duration. Avoid changing initialization semantics until fine-grained measurements identify the cost.

## Remaining causal possibilities requiring live evidence

- Expensive actual shader compilation: read base-pass ms/program deltas, shader-step ms and current renderer/GPU information together. CPU construction before the pass is separately represented by the difference between overall warm-up time and pass time.
- Scheduling or intervening work: compare step duration with synchronous work timings. The coordinator races rAF against a 120 ms timer, but both can run late while the main thread is busy; 120 ms is not a hard scheduling bound.
- Light-count pollution from templates is conditional. Source searches find no direct PointLight construction in Buildings or Objects, but imported GLBs could contain lights. Count live template lights before asserting an inflated shader count. Hidden-owner passes deliberately alter visible owners; they currently restore `false`, matching how owners were selected, but future robust cleanup should restore the original value.
- The historical 12 FPS versus 60 FPS variability is unproven here. A temporary warm-up attachment cannot explain low FPS observed after verified detachment. Do not label this lifecycle repair an FPS fix without that evidence.

## Meaningful acceptance for the main integrator

- Exercise run/base/deferred/early-Play/error paths with an explicit scene fixture. After every externally observable return, no warm-up clone group or temporary lights remain in scene, original hidden-owner visibility is restored, and no shared resource is disposed.
- Preserve the existing base and extra-light variants; compare actual r128 program coverage before and after. Ensure early Play still cancels future deferred jobs.
- In the in-app browser, observe the first rendered frame and settled scene, record Warmup snapshot and boot telemetry, run a fresh foreground smoke without changing its 5000 ms budget, and drive the established streamed boundary route. Report any boot or boundary failure honestly.
- Capture sub-operation player timings or a CPU profile before modifying player construction/UI work. A coordinator duration alone cannot justify that refactor.

The full island overhaul remains open. This audit adds evidence and a small ownership repair proposal; it supplies no live-game acceptance or visual approval.
