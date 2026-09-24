# Bakehouse upper room — 2026-09-13

Status: unpublished Blender candidate, not accepted art or playable content.

The connected L-shaped bakehouse now has a full upper sleeping room, a timber floor with a stair aperture,16 individually measured treads, rails, bed and storage. The low pantry wing remains lower. The court entry moved south so it can reach the stair foot and preparation area without crossing the flight. Actual merged geometry gives1.499m south approach,1.645m north landing and.88m between preparation furniture and stair side. These dimensions require runtime collision/player proof before acceptance.

Source: `tools/blender/build_holm_kitchen_upper.py`. Editable source, GLB, four embedded original128px material textures, contract and three Blender renders are in `.studio-workspaces/holm-kitchen-wings-v2/candidates/`. The exported candidate has4,590triangles,12materials and51primitives. V1 is preserved.

Studio `tools/studio_holm_kitchen_wings.html` now has exterior, ground-floor and upper-floor controls. Upper walls clip only in the inspection view; authored geometry remains intact. Controls also redraw while preview is paused, verified by real clicks. Three settled in-app screenshots are banked under `scratchpad/holm_perf/kitchen-upper-studio-{exterior,room,ground}.png`. Browser warning/error log was empty.

## Direct visual review — provisional8.0/10, below acceptance

- Silhouette/proportion: unequal connected wings and two-story height read clearly; much stronger than the earlier single-height box.
- Shape hierarchy: court, main roof, pantry roof and offset chimney are identifiable. Main wall mass remains rather slab-like.
- Color/material separation: original wood, stone, plaster and thatch are distinct. Thatch remains too uniform, plaster too broadly mottled; window repetition and stone bands need closer reference treatment.
- Reference features: L-shaped court and unequal roofs correspond to ExteriorOption2. Roof breakup, stone density and lived-in details still lag it.
- Gameplay-camera readability: large worktable, oven, pantry shelves, stair opening and bed are visible in floor views. This is a Studio review; actual game placement is unverified.
- Animation/interaction: no door/fire animations or station bindings in this candidate. Dimensions alone do not prove stairs traversable.
- Family consistency: palette is aligned with the revised direction, but the family/environment itself remains under overhaul. Flat preview ground is not the intended landscape.

Remaining: reference material/shape refinement, doors/fire, cardinal floor navigation and collision integration, station/tutorial/save QA, banked final comparison and full visual acceptance, then Safe Publish. The full-island goal remains active.

Foreground ordinary-game smoke PASS: 105/105, real walk3572ms, six streaming boundaries, exact/lossless save-load,60FPS, worst20ms,122draws,34264triangles,7ticks, zero errors; total23902ms. This is regression proof, not candidate traversal proof. Final export SHA a9f1510e64641460737f5488fc5a9dd3486deeab0f0de501132b19f6bdcddc1f; refreshed browser evidence after final export. Actual entry clearance:1.64 wide and2.47 above threshold.
