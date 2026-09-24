# Quest Lodge terrain placement and bay foundation — 2026-09-13

Previous turn was progress: authored quieter oak and proved material-only geometry equivalence. This pass places that lodge on the existing rebuilt terrain, with actual support measurements and a new Blender bay foundation. Full goal remains active. No live world install or terrain edits.

## Measured placement

New `tools/measure_holm_lodge_terrain.py` imports actual v3 GLB floor geometry in Blender, uses the working terrain triangle split, samples the footprint every0.2units plus actual vertices, and searches81candidates within2tiles of the concept. The original concept(36,51) crosses the terrace edge. A coplanar half-tile shift was initially possible but unsuitable for surface rendering and future world tile centers. The final integer origin is(35,5.02,51),yaw0. Actual footprint terrain samples range4.999904..5.000144, beneath floor5.02 and above slab base4.84. Entrance is(35.5,5.02,53), roughly0.02above terrain, with measured apron samples at localZ3.5/4.5.

The reading bay was a zero-thickness polygon; applying the main slab thickness to it would falsely certify support. New `tools/blender/build_holm_lodge_bay_foundation.py` imports the actual outline and authors separate limestone sides and bottom down to localY=-0.18. It has13triangles and no top face, avoiding a coplanar duplicate. Outward side and downward bottom normals explicitly asserted after correcting initial winding. Saved editable Blender and GLB in `.studio-workspaces/holm-quest-foundation-v1/candidates/`. GLB SHA `6ab1692c4e1fad24dc60ab5584d1d44dbe12353689ee63dd718d4c2c672d556c`.

Placement JSON/report in `.studio-workspaces/holm-quest-placement-v1/candidates/`. `fitsExistingFoundation:false`, `augmentedFoundationFits:true`; source diagnosis remains visible. Model SHA `a8d57474e1a5cd6f8e13214e57905cf3bacecdf8e1fcc14c5b0ea1393248b324`; terrain SHA `655e69f88d24b389ccf6b7c90e61d60d1d9b4ccde32030b0a45754285feb1d98` unchanged. `python tools/test_holm_lodge_terrain.py` independently checks hashes, footprint bounds, exact terrain vertex interpolation, entrance/apron values, foundation requirement and explicit path conflict. Sampled support is not exhaustive continuous collision proof.

## Terrain Studio integration

New `tools/studio_holm_lodge_placement.js` checks actual terrain byte hash, model bytes, foundation bytes and fit data; loads the complete revised Blender lodge, foundation and authored hearth into a single local placement group. Geometry base hash matches the separately proven material-only v3/v2 equivalence. Disposal releases the added resources. Terrain Studio includes an aspect-aware Inspect Quest Lodge terrace camera and updates authored flame animation. Existing keep, bakehouse, habitat and terrain remain present. Module syntax checks pass.

Actual in-app inspection: load terrain, select lodge terrace, orbit around front/rear/context views. Screenshots `scratchpad/holm_perf/quest-lodge-terrain-{front,rear,context}.png`; log `quest-lodge-terrain-log.json`, no warnings/errors. The base sits at the grass edge without visible floating gap in inspected views. Full ground contact is supported by measured data; it has not been walked using a terrain-aware lodge player. The old local flat-apron lodge walker does not certify this placement.

## Direct visual review

`Bible_References/Complete/_compare/holm-quest-lodge-terrain-reference.png` against Town2 Bible reference:8.3provisional, not accepted. Silhouette/proportions: jettied tall wing, low hall and polygonal bay remain clear alongside the bakehouse. Shape hierarchy: slate guest roof and lower wheat roof distinguish lodge from its neighbor. Materials: substantial gray masonry and quiet warm timber/plaster remain legible. Reference features: connected irregular rooms, sparse woodland and height variation read as a settlement rather than a lone box. Camera/context: front/rear views fit the viewport after aspect correction; nearby bakehouse can occlude the doorway from some angles. Animation: authored hearth loaded, but enclosed exterior views do not prove flame readability. Interaction: visual placement only. Family consistency is improving; terrain shading, roof/window treatment, paths and other unfinished buildings still prevent final acceptance.

## Required next work

The proposed primary line(36,60)->(36,55)->(36,38) crosses the lodge's north wall. This is recorded in pathConflict and the UI; it is NOT a certified walk route. Reroute the primary lane outside the measured footprint, extract real terrain-to-interior routes on the common cardinal grid, and drive a pointer walk from the lane through the door to the rooms and back. Then form a coherent Safe Publish bundle and integrate real Player/journal/guide services. All18lessons, other unfinished assets/NPCs/items, Lastlight and departure remain required.

Foreground existing-game smoke105/105PASS:boot814ms,real out-and-back3443ms,six streaming boundaries exact/lossless save-load,60FPS,worst23ms,125drawcalls,34,270triangles,six ticks,zero errors. Evidence scratchpad/holm_perf/quest-lodge-terrain-smoke.json. This is regression evidence for the existing game, not a lodge-in-world player proof.
