# Quest Lodge straight-plank oak — 2026-09-13

Previous goal turn was verified progress: fitted animated hearth. This pass addresses the repeated broad/wavy timber defect. Full island goal stays active; no live publish or final art acceptance.

## Blender material revision

`tools/blender/refine_holm_lodge_oak.py` uses actual Blender4.5 to open v2 and change only the packed Warm oak image. Separate outputs in `.studio-workspaces/holm-quest-lodge-v3/candidates/`:lodge.blend,lodge.glb,oak.png,lodge_wood.png,material-contract.json. Eight subdued straight boards across128pixels yield approximately0.446worldunits per board with existingUV*.28, sparse grain and staggered joins. Gray masonry, slate and thatch remain unchanged.

Candidate GLB SHA `a8d57474e1a5cd6f8e13214e57905cf3bacecdf8e1fcc14c5b0ea1393248b324`,453,440bytes. Source v2 SHA `6de1fd292bfdd0f3dd51bf0031297f8905eb72ff19a8ed9be759b7f4f738140b` unchanged. Blender fingerprints of geometry/UV/object/animation data match. Main independent `python tools/verify_holm_lodge_material.py` also passes:all118exportedaccessors byte-identical; nodes,meshes,scenes,animations,materials,texture configuration and samplers identical; exactly one embedded PNG (lodge_wood) changed. Other three images byte-identical. Evidence in material-verification.json beside the candidate.

## Studio integration and verification

Shared `tools/studio_holm_lodge_material.js` validates contract/base hash and candidate bytes, then transfers only the candidate oak map onto existing cloned base materials. Tested geometry remains the same loaded v2 mesh; cutaway configuration is retained. Unused candidate geometry/materials/textures are disposed. Both lodge Studios default to the revision. Exterior/floor Studio has a real checkbox to compare against the old map at an identical paused camera. This is a Studio comparison overlay; eventual world bundle should use the authored final asset and coherent contract, not load duplicate models at runtime.

In-app pointer QA: ground floor view, pause, toggle old/new map, bank identical-camera screenshots; switch to exterior and inspect framing; reload walking Studio and walk from entrance approach to upstairs guest room. Arrival at(-3.5,3.3,.5) confirmed and screenshot banked. No teleport/programmatic movement. Both Studios load the actual authored image; no warnings/errors. Existing route gate16,884interpolation samples and door state10/10checks pass. Edited modules pass syntax checks.

## Direct visual review

Banked `Bible_References/Complete/_compare/holm-quest-lodge-oak-before-after.png` and `holm-quest-lodge-oak-reference.png`, reference Town2.jpg. Actual screenshots under scratchpad/holm_perf/quest-lodge-oak-*.

Score8.3provisional, not accepted. Silhouette/proportion: unchanged connected lodge and stair/upper room. Shape hierarchy: quieter floor leaves stair outline and furnishings clearer. Color/material separation: warm brown boards contrast with substantial gray stone and pale parchment/plaster. Reference-defining features: simple plank floors and restrained low-poly framing are closer to the reference than the previous wavy striped treatment. Gameplay camera: board boundaries read without dominating; upstairs furniture and aisle remain legible. Animation/interaction: door geometry and animation unchanged; upstairs walk and old/new toggle verified. Family consistency: warmer restrained timber works with stone and existing hearth; other island asset textures still need whole-scene review. Roof/window treatment remains uniform and placed-island context is missing, so no>=9acceptance.

## Remaining

Establish terrain approach and lodge world placement, compile a coherent publishable bundle including revised material and hearth, integrate real Player/journal/guide flow, finish remaining assets and all18lessons with durable progression. No live authoring install occurred in this pass.

Foreground existing-game smoke105/105PASS:boot743ms,out-and-back3601ms,six stream boundaries with exact/lossless save-load,60FPS,worst20ms,124drawcalls,34,268triangles,seven ticks,zero errors. Evidence scratchpad/holm_perf/quest-lodge-oak-smoke.json. Existing-game regression gate does not load the isolated lodge.
