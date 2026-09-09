# Training Cavern True Depth + Mining Feedback — 2026-07-16

## Outcome

The owner rejected the prior cave floor because its apparent variation came mainly from color. That acceptance is superseded. The Training Cavern now has real depth in the Blender-authored mesh, and the next mining-feedback phase has begun in the live game.

## True-depth terrain

`tools/blender/build_holm_training_cavern_v1.py` now creates `CavernFloor` as a clipped, two-tile triangulated heightfield rather than a flat center with differently colored faces. The exact entry, copper, smithing, exit, tin, and clay lesson routes stay near the invisible walk plane. Earth between those routes sinks to about -0.34 tiles, while irregular perimeter shoulders add up to 0.58 tiles of lift. Low-frequency variation prevents a machine-flat basin without creating blocking boulder shelves.

This is deliberately a presentation mesh over the existing four-direction movement contract: the player keeps predictable OSRS-style cardinal navigation, while the surrounding excavation supplies genuine visible height. `src/game4_ui.js` also hides the global surface tile grid on underground planes; the grid previously drew over the depressed geometry and visually erased the relief.

Accepted live capture: `scratchpad/holm_training_cavern_v1/live_true_depth_accepted.png`.

Comparison: `Bible_References/Complete/_compare/Training_Cavern_v3_compare.png` — 9.1/10.

## Mining-feedback phase begun

`src/mining_rocks_v1.js` now owns lightweight reusable feedback for the accepted tin/copper/clay rock family:

- each mining swing gives the target a short impact kick and emits five faceted dust chips;
- successful depletion collapses the deposit over 0.34 seconds with a stronger nine-chip burst;
- respawn grows the deposit back from 64 percent scale with a restrained dust cue;
- one shared animation loop updates all active rock and dust effects.

`src/game5_main.js` calls those visual hooks from the real mining action, depletion, and resource-respawn paths. A live left click on a copper deposit produced two successful `You manage to mine copper.` messages, two ore rewards, and Mining XP with no console error.

## Visual review

- Silhouette/proportion: the playable lanes read as worn shelves inside a larger excavation instead of a colored rectangle.
- Shape hierarchy: low routes, depressed cut earth, and raised perimeter shoulders establish three visible depth bands.
- Color/material separation: warm earthen facets support the topology instead of being the only source of variation.
- Reference features: irregular cave footprint, branching galleries, ore clusters, timber supports, ladders, furnace, and anvil remain readable.
- Gameplay camera: depth is visible from the elevated camera without hiding the character or lesson targets.
- Animation/interaction: the real left-click Mining loop remains authoritative; visual feedback is fail-soft and does not own rewards or state.
- Family consistency: tin, copper, and clay share one Blender-authored rock family and one feedback system.

## Verification

- Blender source rebuilt and the environment GLB re-exported successfully.
- JavaScript syntax checks pass for the mining, main-loop, and UI changes.
- `node tools/test_world_v2.js` passes every World V2, Holm flow, and Training Cavern lock.
- Live browser mining produced copper ore and Mining XP through the normal interaction path.
- Final foreground smoke passes: **100/100** structural, **100 FPS**, **125 draw calls**, and **zero errors**.

## Boundary for the next slice

Continue the mining lesson with readable but cozy timing, a clear depleted state, and reliable respawn. Preserve the true-depth heightfield, near-level cardinal routes, real Blender rock family, and the existing OSRS-exact XP/combat foundations.
