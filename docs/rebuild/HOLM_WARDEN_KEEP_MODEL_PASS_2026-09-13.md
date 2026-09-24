# Warden's Keep — first authored castle — 2026-09-13

Status: unpublished Blender candidate, not accepted art or working gameplay content. Previous turn was progress: habitat assets reached the actual draft terrain. This pass replaces another planning-only building with a reviewable authored model.

Source: `tools/blender/build_holm_warden_keep.py`. Outputs in `.studio-workspaces/holm-warden-keep-v1/candidates/`: editable keep.blend, keep.glb, numeric contract, original textures, exterior/cutaway renders and agent report. Final export SHA256: 3b35a22df01db975ca25804367541c4bc63f76b34137d92ce1524fa09220bf59; main independently checked bytes against contract. 4,074 triangles, 20 merged primitives, 9 materials and 3 embedded original images.

Modeled spaces: tall west teaching hall with upper guard chamber, lower stores, open court, south gate passage, gallery, east wall walk and unequal hollow octagonal towers. Furnishings include teaching table, spear rack, store chests/counter, beds and map desk. The plan's overlapping towers were relocated to produce actual connected rooms; the plan stair turret was replaced by a straight internal hall flight. These deviations are explicit in the contract. No world placement has been made: revised tower extents require checking and potentially revising the terrain foundation.

Geometry checks: sixteen actual treads measured at 1.6 width, .2 rise and .3 depth. Eight doorways were tested with 120 ray samples through the complete Blender scene; that caught a narrowing parapet, which was repaired before final export. Tread-center upward rays measured a minimum 4.292 headroom. These are authored geometry checks, not player capsule collision or graph traversal proof.

`tools/studio_holm_keep.html` loads the final model in the in-app browser with exterior, ground cutaway and upper-hall views. Original Bible Option4 remains alongside for reference to connected volumes and material family. Real buttons verified all three views and paused redraw. Error/warning log empty. Images: `scratchpad/holm_perf/keep-v1-studio-exterior.png`, `keep-v1-studio-ground.png`, `keep-v1-studio-upper.png` (refreshed after corrected final export).

## Direct visual review — provisional 8.0/10

Silhouette/proportions: unequal watchtower and guard tower, long hall and lower stores create a distinct castle skyline. Shape hierarchy: open court and connected ranges read clearly; gate platform remains visually plain. Color/material: substantial gray masonry and warm roof/wood are distinct, but stone and roof patterns still feel too regular and dark. Reference features: connected height variation and gray masonry are present; lived-in architectural character needs more work. Camera readability: room furnishings and stair/floor opening read in cutaway, upper gallery is identifiable. Animation/interaction: no door leaves or animation and no runtime bindings, so this category is unfinished. Family consistency: restrained palette fits the revised direction but requires actual terrain placement and final comparison. No >=9 acceptance.

Remaining: upper tower floors and stairs/lookout access, door leaves/animations, architectural refinement, foundation placement, runtime collision/navigation, wardens and teaching services, full gameplay/save QA, final comparison and Safe Publish. The full tutorial-island goal remains active.
