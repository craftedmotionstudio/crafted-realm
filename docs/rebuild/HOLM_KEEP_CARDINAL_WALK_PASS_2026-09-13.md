# Keep cardinal walking pass

Status: isolated Studio gameplay prototype; full-island goal active.

The v3 castle graph connected five of seven named destinations. Main inspection confirmed the hall-gallery threshold had fixed its original gap. Two remaining physical blockers were a gallery railing crossing the east wallwalk junction and the east stair assembly crowding the tower door corridor.

Blender v4 opens the junction railing at local x7..9 and moves the east stair assembly plus its floor apertures 0.5 tile east within the existing tower shell. Original v1/v2/v3 outputs remain preserved. The entry-ray verifier now reads actual tread centers instead of assuming symmetric flight positions. Final v4 GLB hash a20d8806695c1420c1e64716d7a31936587cb549e96f0066bce1f0e076c57e74; 7,222 triangles, 30 primitives. Blender session75910 completed successfully after geometry checks and both renders.

Actual evaluated Blender geometry plus the staged terrain generated navigation-v3: 909 stances, 1,417 undirected cardinal edges, all seven destinations reachable. Extraction sampled edges every0.05 tile in both directions, with footprint support, per-sample rises and capsule clearance. This remains discrete measurement, not continuous volume proof. The graph follower test passed59,514 interpolation samples, immutability, malformed/asymmetric edge rejection and target reachability.

The walking Studio verifies exact model and terrain byte hashes before loading, uses measured capsule footbase, and performs BFS through the measured graph. It does not affect live saves. New files: src/holm_keep_navigation.js, tools/studio_holm_keep_walk.html/js, tools/test_holm_keep_navigation.js. Candidate measured data lives in .studio-workspaces/holm-keep-navigation-v3/candidates; extractor tools/blender/extract_holm_keep_navigation_v3.py.

Foreground ordinary smoke PASS105/105, boot3427ms, walk1731ms, six chunk crossings and exact/lossless save/load,60FPS,worst21ms,124draws,34270tris,7ticks,zeroerrors. This proves ordinary game regression safety, not castle integration.

Browser walkthrough evidence is appended after actual movement completes. Remaining: reference-matched lighter masonry and roof character, doors/animations, game provider and saves integration, stations/NPCs/combat/services and all other island requirements. No visual acceptance claimed.

Main in-app pointer walkthrough on v4: gate approach to east lookout(10.5,6.7,-5.5), then east wallwalk(8.5,3.2,.5), then high watch lookout(-6.5,10.2,-10.5), each reached with onscreen state and screenshots. Return togateinitiated. Evidence scratchpad/holm_perf/keep-v4-walk-east.png, keep-v4-walk-wallwalk.png, keep-v4-walk-watch.png. These walks use actualmeasurededges and animatedplayer, no teleport. Exterior/TerrainStudio linksupdatedv4 and mapfootprintaligned;46habitatinstances remain. Visualquality stillbelowacceptance; the sidepanel was narrowduringwalk and responsive layout correctlystacked beneathview. Model cutaway followsplayerheight.

Return completed: onscreen Reached gate approach at(2.50,-0.03,11.50), console reached2:11:0; zeroerrorlogs. Banked keep-v4-walk-return.png. Previewpausedafterverification. No acceptance of textures, animation-completeness, saveintegration orliveprovider implied.
