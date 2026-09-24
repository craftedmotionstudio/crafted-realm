# Bakehouse ingredient supplies — 2026-09-13

Status: unpublished Blender/Studio model and measured service data. The preceding turn repaired save ordering; the full island goal remains active.

## Model and binding data

`tools/blender/build_holm_kitchen_supplies.py` creates v5 from frozen v4. Adds two hollow stave buckets on a low rack, a proving bowl placed clear of existing loaves, and a hollow water butt with a subtle two-second water-surface animation. All 53 original meshes, transforms, faces, UVs and material assignments remain exact. Original exported material JSON and embedded texture bytes match v4. 1,228 added triangles; total7,052 triangles,59 meshes,62 primitives,four inherited textures. Editable Blender file, GLB and contract remain in `.studio-workspaces/holm-kitchen-wings-v5/candidates/`.

Frozen GLB SHA256 `3681d0feb35f6f44be9992822e46b0f6a290e28ce431dc6260df5cf3f5020216`.

`tools/blender/extract_holm_kitchen_navigation_v3.py` resamples evaluated geometry including new props:281 stances,451 undirected edges,278 reachable stances,all five original destinations connected. `node tools/test_holm_kitchen_navigation.js` passes18,942 interpolation samples and graph/immutability checks.

`tools/stage_holm_kitchen_services.py` compiles five exact reachable ground-floor stances for bucket rack,flour,water,dough andoven. It refuses missing or ambiguous stances, records model/navigation hashes and preserves the existing recipe IDs and40-base Cooking XP reference. Output `.studio-workspaces/holm-kitchen-services-v1/candidates/services.json`. This is binding data, not an installed inventory handler. The walking Studio verifies the graph hash and model agreement before offering routes.

Bucket andwater services share the clear pantry stance(4.5,0,-2.5). Flour stance(2.5,0,-2.5),dough(-3.5,0,.5),oven(-2.5,0,-1.5). World placement remains(44,4.07,67). Foundation recheck2,032 samples passes; terrain and habitat data unchanged.

Both kitchen Studios load v5 and play its authored water clip. Terrain Studio also loads v5, water animation and the separate oven fire, with explicit mixer/fire disposal. Initial walking cutaway hid low supplies behind the wall and left floating glazing; lowering its wall cut and including glazing makes these props visible. This is a viewer change, not collision geometry.

## Remaining acceptance

No ingredients are granted by the Studio buttons. Service line-of-sight, inventory transactions, actual recipe dispatch, modeled chef, required curriculum/save migration and Safe Publish remain unfinished. Sampled navigation is not continuous swept-volume collision proof. The 18-lesson full objective is unchanged.

## In-app pointer and direct visual review

Real button clicks drove courtyard → bucket rack → water butt (same stance, correctly reported already there) → flour sacks → proving bowl → oven → courtyard. Every destination reached; no teleports/programmatic gameplay calls. Walking Studio console: no warnings/errors. Evidence `scratchpad/holm_perf/bakehouse-supplies-buckets.png`, `bakehouse-supplies-flour.png`, `bakehouse-supplies-dough.png`. Exterior Studio also loaded the new model and animation. Terrain Studio reloaded with42 habitat instances and no warnings/errors, then paused.

Banked comparison `Bible_References/Complete/_compare/holm-bakehouse-v5-supplies-reference.png` shows the revised ground cutaway and Bible exterior reference. Existing exterior silhouette is unchanged. This reference is suitable for family/material context, not proof of an exact supplied bucket design.

Direct Codex review: silhouette/proportion8.2 (buckets and barrel are visibly hollow and distinct in scale); shape hierarchy8.3 (supplies grouped along pantry edge); color/material separation8.1 (warm staves/iron, pale sacks and restrained blue water); reference-defining features8.0 (simple warm low-poly functional props); gameplay-camera readability8.3 after cutaway repair; animation/interaction7.8 (quiet water and visible fire, but inventory/service actions absent); family consistency8.1. Provisional overall8.1, below9.0 acceptance. Bowl is currently visibly empty; recipe-state visuals and the chef remain incomplete. The crowded pantry jars are still repetitive and the bakehouse masonry remains darker than the keep's latest palette.

Foreground ordinary-game smokePASS105/105:boot806ms,realwalk3563ms,sixstreamboundaries/exactlosslesssave-load,60FPS,worst31ms,125draws,34270triangles,seven ticks,zeroerrors. Evidence scratchpad/holm_perf/bakehouse-supplies-smoke.json. Existinggame regression only,notnewrecipeproof. Temporary tab closed.
