# Porch click correction — 2026-09-12

The scenery integration pass was verified progress. Real play exposed a narrow valid doorway lane inside a visibly wider porch; edge clicks were rejected. The arrival QA adapter now attempts a tightly bounded porch target only when the original exact walk order fails. It then submits that supported ground node to the same route follower. No geometry, navigation graph, saved revision, model asset, or ordinary provider was changed.

The helper derives the south apron from the existing door/building/avatar dimensions and the existing porch end used by the trail. Current targeting bounds are x64.18..67.82, z104.175..106.4, y3 +/-0.15. It selects a ground graph node within1.5 tiles, with a stable tie break. It rejects upper/stair/dock surfaces, interior and distant clicks, and malformed data. These limits improve targeting; they do not declare new walkable floor.

Tests:88 cases across actual25-file package's four door states, plus deterministic ties, output detachment, distance boundaries, malformed input and classic-script parity. Five boot assertions pass. Actual QA handler dispatch test verifies exact orders retain priority, fallback only occurs on failure, failed follower reachability still rejects, and ordinary providers stay inactive. Closed-door follower tests confirm that targeting never allows a crossing through a shut door.

Real in-app verification and foreground gate recorded below. Full art and tutorial-island completion remain open.

In-app pointer proof: the previously rejected hit near [65.542,3,104.599] reached ground:66,104 at [66.5,3,104.5]. The second previously rejected edge near [67.151,3,105.114] was clicked at screen [913,687] and reached ground:66,105 at [66.5,3,105.5]. Both used ordinary pointer orders; no teleport or state mutation. Zero uncaught errors. Evidence: scratchpad/holm_perf/arrival-porch-click.png.

Foreground ordinary-provider smoke with Studio paused: PASS 105/105; real walk out/back 3588 ms; six streamed boundaries and exact lossless save/load; 60 FPS, worst frame 23 ms, 92 draw calls, 33,044 triangles, six ticks; zero console or uncaught errors. This regression gate is separate from the actual arrival pointer proof above.

Blender provenance rechecked at the owner's request: Blender 4.5.10 LTS successfully reopened .studio-workspaces/holm-arrival-garden-v1/candidates/holm_arrival_garden_v1.blend, reporting five mesh datablocks, eight objects and Breeze/Breeze.001 actions. The editable landing-props source also exists in its candidate workspace. These are isolated draft sources, not files installed under live assets/blender. Source provenance does not establish final visual quality; the scenery review's remaining defects still apply.
