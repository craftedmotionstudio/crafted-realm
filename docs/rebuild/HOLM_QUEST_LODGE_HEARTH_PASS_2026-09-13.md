# Quest Lodge animated hearth — 2026-09-13

Previous turn was verified progress (door interlock). This pass adds the existing Blender-authored fire to the lodge hearth in both isolated Studios. Full island goal remains active; no world publish or final art acceptance.

## Asset and physical fit

New read-only `tools/blender/measure_holm_lodge_hearth.py` evaluates the actual lodge and fire Blender scenes. It recovers cavity surfaces with rays, fits a quarter-turned uniformly scaled fire, and checks every exported pose against the hearth masonry BVH. Blender5.1:49/49frames,6,468vertex checks,9,996triangle checks,zero intersections. Source blend/GLB hashes remain unchanged. The fit is sampled at exported poses, not a continuous collision proof between them.

Output `.studio-workspaces/holm-quest-hearth-v1/candidates/hearth.json`:position[4.3047242165,0.2599239945,0.9558191895],rotationY=pi/2,scale0.974048954. These are lodge-local coordinates only. Fitted flame/coal Y bounds0.18200007..0.94793957 above slab0.18000007. Fire SHA `b5138d41ee563df9dee97a403fdb6420acb719bb3985dd9f475974d423ac75cd`; lodge SHA `6de1fd292bfdd0f3dd51bf0031297f8905eb72ff19a8ed9be759b7f4f738140b`.

Fire reuses the authored bakehouse asset, maintaining family consistency:204triangles,15meshes,eight clips/16animated channels. The authored motion spans2seconds; actual exported clip duration is49/24=2.041667seconds because exported keys start at1/24. Existing loop verifier confirms finite nonstatic animation with matching endpoints. No geometry, navigation or collision tolerances changed.

## Integration and proof

New shared `tools/studio_holm_lodge_hearth.js` verifies the lodge fit hash, fire bytes, finite transform and animation names/durations before loading. Both walking and exterior/floor Studios advance the actual Blender clips and pause them with the preview. A west-facing Hearth and reading corner camera exposes the opening. The renderer reports the extra204triangles separately from the lodge body.

`node tools/test_holm_lodge_hearth.js`:12/12 checks, rejecting model drift and invalid transform/animation contracts. `python tools/verify_holm_bakehouse_fire.py`:16channels pass finite/nonstatic/endpoints. Existing navigation suite16,884samples and door controller10/10 still pass. All edited modules pass syntax checks.

Actual in-app pointer check: select hearth camera, observe and bank two different animated poses; pause preview; reload walking Studio, walk from entrance approach to map table and then reading bay. Both arrivals confirmed. No programmatic movement or teleport. Banked screenshots `scratchpad/holm_perf/quest-lodge-hearth-{a,b}.png`, walking console `quest-lodge-hearth-walk.json`. Studios report no warnings/errors.

## Direct visual review

Comparison `Bible_References/Complete/_compare/holm-quest-lodge-hearth-reference.png`, using Town2 Bible reference and actual hearth screenshot. Score8.0 provisional; not accepted. Substantial gray-stone cheeks and lintel frame the warm fire clearly. Flame height fits the opening, preserving the cap's hierarchy. Orange flame and dark coals separate from gray stone and brown floor. The map table and reading bay give the interior purpose, with sparse detail readable at the close review camera. Flame silhouettes visibly change across captured poses; pause stops the preview. Family consistency comes from reusing the bakehouse fire. Remaining visual limitations: pointed flame geometry is simple, broad/wavy wood grain still dominates floors, and this is not the finished placed-island camera/context.

## Remaining

Hearth is a visual animation, not a cooking or tutorial service. World terrain connection, real Player integration, guide/journal flow, final texture treatment, modeled NPCs and all18lessons remain unfinished. No live authoring files were installed; no>=9acceptance claimed.

Foreground existing-game smoke:105/105PASS,boot799ms,out-and-back3595ms,six streaming boundaries exact/lossless save-load,60FPS,worst29ms,124drawcalls,34,268triangles,seven ticks,zero errors. Evidence scratchpad/holm_perf/quest-lodge-hearth-smoke.json. This regression gate does not load the isolated lodge candidate.
