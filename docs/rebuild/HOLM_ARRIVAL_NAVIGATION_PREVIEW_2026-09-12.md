# Arrival navigation preview - 2026-09-12

Status: isolated Studio movement prototype, not published or integrated with live Player/save/provider. Full overhaul goal remains active.

Adds explicit ground/stair/upper states, source-derived collision envelopes, cardinal BFS and sampled edge support. Shared X/Z does not select highest floor. Tread heights follow the Blender flight. Initial porch placement initializes the fixture; subsequent routes move continuously in X/Z.

The lower turn initially failed. Including handrail overhang required shifting the flight 0.3 tile north, to startZ2.9/endZ-1.9. Blender floor well, stringers, handrails and upper guarding follow layout endpoints. The regression fixture rejects startZ3.0. Avatar radius stays0.42 and door width2.0.

Tests pass110 stance nodes, immutable deterministic compilation, porch/chart/study/return, cardinal edges, distinct floor heights3/5.8, well exclusion, side/diagonal rejection, closed doors, blocked landing, rail-overhang regression and malformed inputs. Arrival numeric and terrain chunk tests pass. Source-envelope checks are not a full exported-mesh swept capsule or head-clearance proof.

Blender4.5 saved editable source/GLB. Mesh sweep25poses has zero door intersections; minimum sampled stair centre-ray headroom3.3499; six well probes clear. Source hash: 67265b2b3148515a2b17ba2ce6a91f66d81ab0ab4486265c42612afff46c5fbd.

In-app pointer checks: house15 reached chart, upper study and returned to porch. House16 added existing player idle/walk clips and facing; a direct screenshot caught stair ascent and then upper arrival. House17 contains final rail-clear alignment. This is an isolated movement fixture, not accepted character art or live gameplay proof.

Visual review: stair/furniture/player scale readable, warm stone/roof/porch hierarchy intact. Gait is present; foot planting and turn smoothing still need work. Upper floor disappears during stair traversal and needs a better reveal policy. Upstairs remains sparse, gables untreated, shutters/planting absent, context barren. Family consistency incomplete. No new9/10 or Bible comparison acceptance.

Foreground live smoke on fresh holm-house16-gate-20260912 FAIL13FPS vs45min. Structural105/105; boot4434ms; out/back5478ms; stream6boundaries25tiles/exact save-load; worst92ms;130draws34280tris;ticks4;console0errors;total38649ms. This is the old live provider, not certification of new navigation.

Remaining: full mesh/capsule contacts, source hash binding/startup guards, floor pointer hit testing, animated door collision, save/interruption, chunk ownership/pinning/disposal, live adapter/Safe Publish, terrain approach, NPC interactions, all remaining island content and final visual/performance gates.

Final house17 pointer verification: upper:65,96 reached height5.80, return ground:66,105 reached height3.00; console errors empty. Saved walk_upper_final.png; in-app preview left ready.
