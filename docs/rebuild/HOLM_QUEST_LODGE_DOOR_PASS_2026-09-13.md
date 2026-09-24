# Quest Lodge door interlock — 2026-09-13

Progress on the active tutorial-island goal. Isolated Studio only; no live publish or final asset acceptance.

## Blender evidence

New `tools/blender/extract_holm_quest_door_envelope.py` opens the actual v2 Blender asset read-only, verifies both blend and GLB hashes and measures the animated leaf. Output is `.studio-workspaces/holm-quest-door-v1/candidates/door.json`. Model SHA remains `6de1fd292bfdd0f3dd51bf0031297f8905eb72ff19a8ed9be759b7f4f738140b`; geometry and textures are unchanged.

Rigid hierarchy and exclusive vertical rotation are checked in Blender and exported normalized quaternion animation channels. A cylinder about the fixed pivot contains every moving vertex for every angle, with 397 evaluated poses / 12,704 vertices providing additional sanity checks. Cylinder center X=-0.349999994, Z=2; raw radius1.700745152, vertical extent -0.00001..2.540009962. Clearance includes avatar radius0.24, height1.9, rendered foot lift0.015 and margin0.01. 239 of251 graph nodes are safe for operating the door. Entrance and initial approach are unsafe; outer approach, board, map, bay and guest-room destinations are safe.

## Behavior

New pure controller `tools/holm_quest_door_state.js` validates matching model and measured pose, finite envelope and declared safe stances; it recalculates clearance. Studio starts at the measured open pose. Door operation requires a stationary avatar outside the conservative sweep cylinder. Closing and opening play the authored clip opening segment backward/forward. Navigation is suspended whenever the door is not fully open. Selecting a route while closed first opens the door while the avatar remains stationary, then starts the route. Competing commands during motion are refused. A new outer-approach destination offers a safe exterior stance.

The walking Studio preserves the complete door silhouette while clipping walls, so the swing remains visible. No closed-door graph is claimed: even walks entirely within one room wait for the door to open. This deliberate conservative behavior can be refined with separately measured closed-door navigation later.

## Verification

`node tools/test_holm_quest_door_state.js`:10/10 pass, including model/pose drift, invalid envelope/stance refusal, moving/unsafe/unknown stance refusal, exact endpoint gating and invalid time steps. Existing navigation suite:16,884 interpolation samples pass, all five destinations still reachable. Module syntax check passes.

Actual in-app pointer flow: refuse close at initial approach; walk to outer approach; close to visible closed pose; choose quest board and observe opening before any walk; attempt closing during walking and observe refusal; arrive at board; walk to lodge entrance; refuse close while the avatar stands there. No teleport or programmatic gameplay call. Banked `scratchpad/holm_perf/quest-lodge-door-{closed,clearance}.png` and `quest-lodge-door-actions.json`; Studio console has no warnings/errors.

Foreground existing-game smoke PASS105/105:boot770ms,real out-and-back3575ms,six streaming boundaries with exact/lossless save-load,60FPS,worst31ms,125draws,34,270triangles,seven ticks,zero errors. `scratchpad/holm_perf/quest-lodge-door-smoke.json`. This is regression evidence for the existing game, which does not load the candidate lodge.

## Direct visual review

Banked comparison: `Bible_References/Complete/_compare/holm-quest-lodge-door-reference.png`, actual screenshot against `Bible_References/Town2.jpg`. Score8.0 provisional, not accepted. Door and avatar proportions are legible; full-height leaf gives clear open/closed silhouettes. Stair, shelf, map table and projecting masonry bay form a useful hierarchy. Warm timber, gray stone and parchment separate clearly, but timber grain remains broad and the cutaway lacks the reference's richer framing/plaster context. Cardinal motion and blocked-door feedback read clearly. Family consistency remains plausible with the other isolated lodge views; placed-island context and full interior composition are still unverified. Hearth remains cold.

## Remaining

Refine timber/roof/window treatment, animate hearth, establish actual terrain approach and world placement, integrate journal/guide services and real Player collision. Complete all18 lessons and durable progression, modeled NPCs/items, Lastlight and departure. The door-cylinder proof covers its motion around a stationary modeled capsule only; existing route samples remain distinct from continuous movement collision proof. Full goal stays active.
