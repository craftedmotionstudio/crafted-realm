# Bakehouse cardinal circulation pass — 2026-09-13

Status: unpublished Blender/Studio repair, **not finished gameplay or accepted art**. The full tutorial-island goal remains active.

## Concrete repair

The frozen v3 model had zero reachable interior destinations from the courtyard approach. Its first stair handrail obstructed the cardinal entrance lane at local glTF z=1.5; the alternative z=2.5 lane clipped the south jamb. Nominal doorway width alone did not prove access.

`tools/blender/build_holm_kitchen_circulation.py` creates v4 from the frozen v3 Blender file. It shifts the actual flight, stringers, balusters and handrails +0.35 Blender Y, moves both aperture ends and the upper aperture guard by the same amount, and retains the exterior, walls, ground floors, workstations and textures. The upper opening is now [-1.1,-1.15,0.65,3.55] in Blender plan coordinates. The recipe and editable .blend are retained.

`tools/blender/verify_holm_kitchen_circulation.py` checks actual mesh vertices and polygon indices: 34 meshes unchanged, 19 circulation meshes changed only by the specified Y displacement; every polygon index identical. Export remains 5,824 triangles, 56 material primitives and four embedded texture images. GLB SHA256: `fa911f4634af7dd959d03430b25eb5765328cc46d52e792b4e2c944a87cc597e`.

## Navigation and pointer evidence

`tools/blender/extract_holm_kitchen_navigation_v2.py` samples evaluated Blender geometry and actual staged terrain triangles at placement (44,4.07,67). The graph has 284 stances, 456 undirected cardinal edges, 282 reachable stances, and all five required destinations reachable. Capsule radius 0.24, height 1.9; bidirectional edge samples every 0.05 tile; center step limit 0.24. Rejected routes remain rejected. The earlier disconnected graph is retained as v1.

`node tools/test_holm_kitchen_navigation.js`: PASS, 19,152 interpolation samples, input immutability, malformed adjacency rejection, unreachable handling, and all required destinations connected.

In the **in-app browser**, real destination-button clicks drove the avatar continuously through courtyard approach → oven → preparation table → pantry → upstairs room → courtyard approach. No teleport or programmatic gameplay calls. Reached states were read back and screenshots banked:

- `scratchpad/holm_perf/bakehouse-walk-oven.png`
- `scratchpad/holm_perf/bakehouse-walk-prep.png`
- `scratchpad/holm_perf/bakehouse-walk-pantry.png`
- `scratchpad/holm_perf/bakehouse-walk-loft.png`
- `scratchpad/holm_perf/bakehouse-walk-return.png`

Walking Studio and exterior Studio console warnings/errors: none. The walking preview verifies both the exact GLB and terrain hashes before enabling routes. Saved game data is untouched by this Studio.

This is sampled geometry plus a Studio pointer circuit, not continuous swept-volume collision proof. The shared follower interpolates between sampled foot heights; sub-sample riser contact still needs refinement before runtime acceptance. Targets are closest valid stances within the extractor's documented search tolerance, not workstation binding coordinates. Cooking/service reach checks are still outstanding.

## Visual review

Direct Codex review of settled exterior comparison and ground/upper walking views. Banked comparison: `Bible_References/Complete/_compare/holm-bakehouse-v4-studio-reference.png` (Building_Exterior_Option2 visible alongside).

- Silhouette/proportion: 8.2. Unequal perpendicular roofs and recessed court read clearly; still too regular and upright for final character.
- Shape hierarchy: 8.3. Tall hearth wing, low pantry and chimney distinguish the building from a single box.
- Color/material separation: 7.7. Gray stone is legible and warm reed separates from it; oversized pale windows and uniform roof texture remain weak.
- Reference-defining features: 8.0. Connected court and roof levels match the intended family; roof wear and facade rhythm need more authored variety.
- Gameplay-camera readability: 8.1. Oven, preparation surface, shelves and stairs are recognizable. Cutaway leaves floating window panels and some exposed framing.
- Animation/interaction readability: 8.0 for the walking study. Avatar reaches all tested spaces and returns; oven fire, doors, cooking and NPC interactions absent.
- Family consistency: 7.8. Bakehouse stone is darker than the keep's newer material pass; needs a shared palette pass.

Provisional overall 8.0, below the 9.0 acceptance gate. This repair is functional progress, not art approval.

## Integration and regression

Exterior and terrain Studios now reference v4. `tools/stage_holm_bakehouse_placement_v2.py` revalidates 2,032 terrain support samples and preserves world placement. No terrain heights or habitat placements changed in this pass. No Safe Publish apply or live provider edits.

Foreground ordinary-game smoke on disposable `qaProfile=bakehouse-walk-20260913`: PASS 105/105; boot 913 ms; real walk out/back 3,623 ms; six stream boundaries; exact lossless save/load; 60 FPS; worst frame 21 ms; 122 draw calls; 34,264 triangles; seven ticks; zero uncaught/console errors. Evidence: `scratchpad/holm_perf/bakehouse-walk-smoke.json`. This protects the existing game; it does not prove bakehouse cooking integration. Temporary smoke tab closed.

## Remaining scope

Door and fire animation, recipe/item bindings, tutor NPC, tutorial lesson/save flow, runtime floor/navigation integration, final art acceptance and safe publication remain incomplete. Wider island buildings, caves, services, characters and item coverage remain part of the active original goal. Next pass should address the bakehouse's live interaction contract and shared material/readability weaknesses, without declaring the island complete.
