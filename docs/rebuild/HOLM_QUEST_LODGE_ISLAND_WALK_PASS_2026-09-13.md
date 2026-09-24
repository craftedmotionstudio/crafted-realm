# Quest Lodge island walking study — 2026-09-13

Status: navigation study pointer route verified; full island goal remains active. No live authoring install.

The new in-app `tools/studio_holm_quest_terrain_walk.html` loads the actual rebuilt terrain, full Blender v3 lodge, separate bay foundation, authored hearth and seven nearby habitat placements. The shared walker retains the separate flat-apron study. Outside the lodge, the exterior remains visible; interior cutaway begins on entry.

`tools/blender/extract_holm_quest_terrain_navigation.py` measures the actual terrain triangles, lodge and foundation obstacles, and nearby vegetation. It produces 494 standing positions, 871 undirected cardinal edges, and six reachable destinations. Capsule and footprint sampling are bounded discrete checks, not an exhaustive continuous sweep. The new deterministic test passes 36,582 interpolation checks, target floor checks, immutable input, malformed edge rejection, and an exterior-only 35-node lane route. The proposed plan line now follows those measured tile centers around the lodge; this is not yet an authored road surface or live navigation integration.

A stricter renderer comparison caught Blender retaining an evaluated Breeze pose after imported animation actions were cleared. The extractor now decodes the exported GLB POSITION/index accessors and default node transforms directly for Blender BVH input. The browser checks every primitive position against that evidence before rendering. Oak: 4,698 vertices; meadow tuft: 91 vertices; both match with zero numerical difference in the tested browser. The matcher allows only 1e-5 transform arithmetic tolerance, preserves duplicate vertices and rejects unmatched geometry. Trees remain frozen at that measured rest pose in this collision study; animated vegetation clearance remains unfinished.

Actual in-app pointer verification reached the north lane with the avatar visible and centered. Arrival diagnostics confirm local position (1.5, 2.136425, -12.5) and body center about (1.463, 3.057, -12.451). The earlier ambiguous screenshot is superseded by `scratchpad/holm_perf/quest-lodge-island-walk-north.png`; no camera fix was needed after rechecking the corrected geometry.

## Visual status

The prior banked reference comparison remains 8.3/10, below acceptance. Silhouette/proportions retain the tall projecting wing, lower connected hall and polygonal reading bay. Shape hierarchy and substantial gray masonry read clearly; warm timber and roof colors distinguish the rooms. The sparse oak and grass support a woodland terrace, but the cropped terrain study has exposed edges and is not a finished island composition. Character and door/cutaway motion must be judged in the final pointer run. Family consistency, road surfacing, landscape material quality and remaining buildings still need work. No new 9.0 art acceptance is claimed.

## Remaining integration

Form a coherent Safe Publish bundle after visual and gameplay gates. Connect real Player movement, quest board/journal, guide and other services. Complete all 18 lessons, remaining buildings and interiors, animated habitat clearance, player appearances, modeled NPCs, required items, Lastlight and departure. The study has no live Player progression or persistence proof.

Final pointer route: south lane → north lane → upstairs guest room → south lane. Avatar visibly stood on the upper floor with readable stairs and cutaway; banked upper screenshot replaces the earlier capture. Closing the door during the return walk was correctly refused. Closing at the clear south-lane stance succeeded; requesting the entrance from the closed state opened the door before walking. Existing game smoke result recorded below.

Foreground regression smoke PASS: 105/105 structural checks, boot 804 ms, real out-and-back 3,589 ms, six streaming boundaries with exact position and lossless progression after save/load, 60 FPS, worst frame 22 ms, 125 draw calls, 34,270 triangles, seven healthy ticks, zero errors. Evidence: `scratchpad/holm_perf/quest-lodge-island-walk-smoke.json`. This validates the existing game only; it does not imply the new lodge is installed. Current study log has 14 events and zero warnings/errors after the corrected geometry reload; earlier failed guards are retained in browser history and excluded by explicit run timestamp.
