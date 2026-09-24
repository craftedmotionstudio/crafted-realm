# Quest Lodge measured walking pass — 2026-09-13

Previous turn was progress: original Blender lodge authored and reviewed. This pass repairs physical circulation and adds an isolated real-pointer walking study. Full island goal remains active; no world publish or final art acceptance.

## Geometry and navigation

`tools/blender/build_holm_quest_lodge_support_seams.py` hash-checks the original authoring source and creates a separate v2 candidate. V1 remains frozen. Floor slabs extend0.002 in X/Y; tread depth becomes0.282 while run remains0.28, closing tiny support-ray seams. The original narrow guest-room floor was then blocked by the desk/bench and bed: those furnishings move against the west wall and become narrower, preserving an aisle at x=-3.5. The desk, seat and bed remain physical furnishings.

Final model: `.studio-workspaces/holm-quest-lodge-v2/candidates/lodge.glb`, SHA `6de1fd292bfdd0f3dd51bf0031297f8905eb72ff19a8ed9be759b7f4f738140b`,473,212bytes,5,117triangles,32meshes,4embedded textures. Exported asset verifier passes; texture hashes are unchanged from v1. Source and contract record the circulation repair.

`tools/blender/extract_holm_quest_navigation.py` evaluates the actual Blender meshes with the door frozen at frame60. It uses a local flat Studio apron at y=-0.02, **not island terrain or a world placement**. The exported nav document has251 valid standing nodes and402 undirected cardinal edges; all251 nodes and all five exact requested destinations are reachable. Each edge is sampled independently in both directions at0.05 intervals, with radius0.24/height1.9 avatar, maximum center-support step0.24, footprint support samples and sphere-covered body obstruction checks. The extraction initially failed guest-room reach, first on support seams and then on furniture; those failures were repaired in the physical asset, not by increasing tolerances or moving the target.

`node tools/test_holm_quest_navigation.js`:16,884 interpolation samples pass; immutable graph, symmetric cardinal edges, malformed graph refusal, missing routes and exact destination X/Z/floor assertions pass. `python tools/verify_holm_quest_lodge_asset.py .studio-workspaces/holm-quest-lodge-v2/candidates`: exported binary verification PASS.

## In-app walking proof

New `tools/studio_holm_quest_walk.html` and `.js` load the nav-selected model URL and verify its hash. The modeled adventurer follows measured cardinal routes; the door remains frozen at the same authored open pose as extraction. Unavailable targets are disabled. It is a Studio rig, not the game's Player, inventory, lessons or save.

Actual pointer sequence: entrance approach → quest board → upstairs guest room → reading bay → map table → return to entrance approach. Arrival text confirms board(-3.5,0,2.5), upstairs(-3.5,3.3,0.5), bay(4.5,0,-1.5), map(2.5,0,1.5). The upstairs screenshot shows the adventurer in the aisle beside the resized bed, with the stair opening and desk visible. No teleport or programmatic gameplay call was used. Banked screenshots/logs are under `scratchpad/holm_perf/quest-lodge-walk-*`.

Exterior Studio now loads v2 and links to the walking study. Both modules pass ES-module syntax checks.

Final existing-game foreground smoke:105/105PASS,boot836ms,real walk3435ms,six streaming boundaries with exact/lossless save-load,60FPS,worst20ms,123draw calls,34,266triangles,seven ticks,zero console/uncaught errors. Evidence: `scratchpad/holm_perf/quest-lodge-walk-smoke.json`. This gate does not load the isolated new lodge; it is regression evidence only. Walking Studio itself also reported no warnings/errors.

## Direct visual review

Comparison `Bible_References/Complete/_compare/holm-quest-lodge-v2-walk-reference.png`: **8.0 provisional, not accepted**. Silhouette, height hierarchy and gray-stone/timber/plaster separation remain as v1. The narrower bed is a plausible cot; the wall-side desk and seat free a clear aisle. Furniture and stair read at the following camera. Reference-family timber framing and connected rooms persist. The original oak texture is still too broad/wavy; roof fields and window treatment remain too uniform. Door motion is frozen for this test and the hearth is cold. Gameplay readability is demonstrated only in isolated Studio, not the placed island. No >=9 art acceptance is claimed.

## Limits and next work

Sampled support/body checks and the follower are not a continuous swept-volume collision proof; capsuleBase interpolation across risers remains an explicit limitation. Closed-door route changes, trigger/obstruction behavior, integrated terrain approach, guide NPC, journal service, all18 required lessons and real save/load remain unimplemented here. The flat apron cannot certify island placement. Dynamic door routing and the actual terrain connection are required before this can be a playable world building.
