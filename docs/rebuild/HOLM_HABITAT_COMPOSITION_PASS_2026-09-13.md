# Habitat composition on the draft terrain — 2026-09-13

Previous goal turn: progress (new Blender masonry and tree family assets plus browser evidence). This pass brings that family into the authored island terrain Studio; the live provider remains unchanged.

`tools/stage_holm_habitat.py` writes isolated `.studio-workspaces/holm-habitat-v1/working/vegetation.json`. Deliberate habitat anchors produce 47 instances: 13 oaks, 5 birches, 6 coastal pines, 18 meadow tufts and 5 reed clumps. The generator excludes eight candidate positions for route/building clearance, steep root ground or lack of dry support. Clearance uses conservative circles enclosing the sampled animated XZ bounds, plus route margins; building clearance includes all revised architectural volume bounds. This is design-envelope screening, not runtime collision or continuous animation proof.

New `tools/studio_holm_habitat.js` validates placements, loads five GLBs once, wraps each rigid animated clone with its terrain placement, samples the actual rendered triangle height, and disposes unique shared resources on reload. Deterministic animation phase offsets prevent synchronized vegetation sway. Its six data assertions pass; agent failure-path checks verified settled loading before cleanup and one disposal per shared resource.

The terrain Studio uses 47 instances / 76 meshes / 35,469 triangles / 9 unique geometries, materials and textures. Previous arrival oak/hazel placements are excluded in this view to avoid overlapping duplicate tree families; original garden files remain preserved. Reload working terrain re-created the same counts. Camera controls redraw while paused. Building outlines now use the revised connected-wing/tower footprints rather than the old rectangular pad outlines.

Direct in-app review: arrival and creek views now have recognizable broad oak versus slender birch silhouettes and irregular open gaps. Coast/ridge has sparse leaning pines. Plants fit visibly against the draft terrain at the reviewed distances. Remaining quality gaps: foliage still reads solid at close range, water is too cyan/striped, ground transitions remain too geometric, most buildings are still outlines, and not all root contacts have close-range proof. No >=9 acceptance and no final landscape claim. Prototype trees have no newly registered gameplay blockers, gathering or click bindings here.

Evidence: scratchpad/holm_perf/habitat-arrival-terrain.png and habitat-creek-terrain.png. Earlier fetch errors in the persistent tab predated the successful habitat module load; current-load error checks are recorded separately. Full-island visual, functional and Safe Publish work remains open.

Final in-app evidence also includes habitat-ridge-footprints.png. Repeated working reload reported the same47-instance/76-mesh counts. Current-load console warnings/errors after the first successful habitat module load: zero. Final assets remain below visual acceptance; this pass proves composition progress only.

Final foreground ordinary-game smoke PASS:105/105; real walk3613ms; six stream boundaries and exact/lossless save-load;60FPS, worst28ms,124draws,34268triangles,6ticks; zeroerrors. Total23318ms. This is regression evidence, not proof of new scenery collision or interaction integration.
