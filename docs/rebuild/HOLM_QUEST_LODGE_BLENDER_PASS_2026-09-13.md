# Quest Lodge Blender buildout — 2026-09-13

Previous pass was progress: durable initial combat kits. This pass returns to the owner's physical world overhaul with a new original lodge candidate. Full island goal remains active; no live publish or visual acceptance.

## Actual authored asset

Source: `tools/blender/build_holm_quest_lodge_study.py`. Actual Blender was run; editable `.blend`, `lodge.glb`, four original texture PNGs and `contract.json` are in `.studio-workspaces/holm-quest-lodge-v1/candidates/`.

Final GLB SHA256: `6cff72acdf676125c915378b995a42b5c9c0a2cf4146647f21fe1f40df2d6fa2`, 473,140 bytes, 5,117 triangles, 32 meshes/primitives, four distinct embedded textures. Actual bounds in glTF coordinates: approximately (-5.68,-0.18,-4.63) to (6.79,8.43,4.63). This is a standalone local model, not a world placement.

The low notice hall (eave3.4/ridge5.12) joins a taller west guest wing (eave6.58/ridge8.35) and a shallow polygonal reading bay. Light gray masonry forms substantial lower walls, with warm timber framing and oat plaster above. Original stone, oak, slate and reed patterns are authored in Blender; reference image pixels are not copied. Town2 informs framing/interior character; Exterior Option3 informs unequal connected volumes. These are original adaptations, not exact replicas.

Inside: a three-notice quest board, parchment map table, book shelving, bay writing desk, hollow cold hearth and chimney. Upstairs: bed, desk and supported bench. Sixteen physical stairs rise0.20625/run0.28, width1.6, to floor3.3. Stair bounds are [-2.45,-1.7,-0.85,2.78] in Blender XY; matching upper aperture reaches the final tread end at2.78. These dimensions do not prove capsule clearance or cardinal routes.

Door uses a separate hinge pivot and authored open/close clip: 100 exported samples across4.125seconds. The Studio provides an explicit preview button. Runtime click routing, obstruction, collision and queued walking remain unfinished.

## Corrections made before banking

The initial draft gave both main volumes two storeys; it was corrected to a genuinely low hall and taller guest wing, with the stair and upper floor moved together. A0.22 landing gap was closed. The first in-app view exposed buried framing and default cube UV export: beams now sit on both wall faces, and the intended UV layer is active for rendering. Jetty brackets support the projection. A sill beam across the actual entry was removed. Cold hearth/chimney and bench supports were added. Floor-camera fitting now responds to viewport size.

## Verification and direct visual review

`tools/verify_holm_quest_lodge_asset.py` passes against the final bytes. It inspects118 accessors, finite positions/normals/UVs, indices, mesh semantics, bounds, distinct embedded texture bytes, contract hash/counts and nonstatic loop endpoints. Report is `asset-verification.json` beside the candidate. ES-module syntax check passes.

In-app Studio loaded the exact final SHA with no warnings/errors. Real pointer controls exercised exterior, ground, upstairs, rear view, door preview and pause. Captured exterior, ground and upper images are in `scratchpad/holm_perf/quest-lodge-*.png`. Door motion has exported-data proof; a distinct in-flight visual pose was not banked, so complete animation readability remains unproven.

Comparison: `Bible_References/Complete/_compare/holm-quest-lodge-v1-reference.png`. Direct provisional score **8.0/10 — not accepted**:

- Silhouette/proportions: unequal heights and polygon bay are clear; tall guest wing remains rather rectangular.
- Shape hierarchy: tall slate wing, lower reed hall and smaller bay read in that order. The entry recess survives the projection.
- Color/material separation: light gray stone, cream plaster and oak separate well. Wood grain is too broad and wavy, especially across the floor/stairs.
- Reference-defining features: substantial masonry, visible diagonal frames, connected volumes and roof texture are present. Roof edges and fields remain too uniform; upper window treatment is sparse.
- Gameplay-camera readability: exterior and major furniture groups read at Studio overview distance. Actual island-camera/context proof is missing.
- Animation/interaction readability: separate door and real stair are present; continuous walking, door-trigger interaction and active hearth are not proved. Hearth is deliberately cold in this candidate.
- Family consistency: warm palette, original low-poly surfaces and gray masonry align with the rebuilt keep/bakehouse direction. Wood/material refinement remains necessary.
- Purposeful interior: board, map, library, writing bay and guest room are distinct; modeled quest guide and actual service bindings are absent.

The existing game's foreground smoke passed105/105,60FPS,worst22ms,122draw calls,34,264triangles,six world ticks,zero errors. Six streaming boundaries preserved exact save/load. Banked `quest-lodge-study-smoke.json`. This regression gate does not load the new isolated lodge and cannot certify its gameplay integration.

## Next required work

Refine plank-scale wood and roof character; extract measured floor/door/stair navigation with explicit model hash; prove a real-pointer entrance/board/bay/upstairs/return circuit; place on measured terrain through Studio Safe Publish; bind the quest journal service; author the modeled/animated guide and active hearth; integrate full curriculum/save flow. No original requirement is removed by this candidate pass.
