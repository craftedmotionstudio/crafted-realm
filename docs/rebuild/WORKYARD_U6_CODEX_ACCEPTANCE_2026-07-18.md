# Survival Workyard U6 — Codex whole-room acceptance

Date: 2026-07-18  
Status: Codex gameplay/composition acceptance complete; owner visual sign-off remains open

## Outcome

The Survival Workyard now passes its U6 whole-room engineering and hands-on gameplay boundary. The surface lodge,
two-door circulation, roof transition, cellar traversal, furnishing policy, occupation yard, animated waterworks,
and fishing-edge prerequisite were reviewed together in the real r128 game rather than as isolated asset previews.

This closes the implementation and Codex-review portion of U6. It does **not** manufacture the owner's final visual
approval: the owner should still walk the room and decide whether the complete composition is ready to freeze.

## Real-flow evidence

- A disposable profile used the real login flow and the World Map to ordinary-walk from the Guide Hall district to
  the Workyard approach. Tutorial skipping was used only to unlock the isolated acceptance profile; it is not counted
  as onboarding or curriculum proof.
- The character entered through the normal building route, the roof eased away, and the trail door changed from
  `Open Trail door` to `Close Door`. Leaving through the ordinary doorway restored the roof.
- The surface hatch was clicked with the real pointer, the player descended into the accepted cellar, clicked the
  cellar ladder, and returned upstairs. The game reported both climb actions.
- The empty lesson bucket was found and taken in the furnished lodge. Its saved spawn disappeared and the inventory
  gained exactly one Empty bucket.
- The water-pulley negative path rejected operation without a bucket. After the bucket was collected, the visible
  crank ran the lowering/contact/lifting sequence and atomically replaced it with one Bucket of water. The game
  reported: `You crank the brimming bucket onto the ledge. It is now a bucket of water.`
- The fishing edge presented `Net-fish Mirrorperch` and correctly rejected the profile without a Small net. The
  successful Small-net catch, exact-once reward, interruption, and reload contracts remain accepted U5 evidence and
  were not duplicated here.
- Hovering the lodge runner showed `Walk here`, not Inspect. A real right-click opened `Inspect lodge runner`,
  `Walk here`, and `Cancel`; selecting Inspect printed the authored room-specific message.
- Local Test Travel bookmarks were used only after the ordinary route proof to isolate the cellar, pulley, and fishing
  service checks. They are not counted as traversal evidence.

## Defect found and repaired

Inspect-only scenery previously derived its walk destination from the terrain hidden behind the model. From some
camera angles that could route a harmless scenery click through a wall or out of the room. Inspect-only movement and
its context-menu Walk action now target the clicked model surface and let the cardinal planner choose the nearest
legal tile beside the object. A deterministic World V2 lock preserves this behavior.

## Structured Codex visual review — 9.2/10

- **Silhouette and proportion:** the asymmetrical lodge, covered court, pond dock, occupation yard, and cellar read as
  one believable survival-teaching compound. Doors, furnishings, bucket, stools, and service controls remain at
  player scale.
- **Shape hierarchy:** lodge mass first, stained-glass/firemaking teaching wall second, worktable/hatch/rugs third;
  the dock and crank read as a distinct exterior service rather than random shoreline clutter.
- **Color and material separation:** warm timber and plaster, blue-gold runner, stone/cement approach, ochre roofing,
  and cool water remain legible from the fixed elevated camera without modern gloss.
- **Reference-defining features:** fitted openings, visible structural bays, purposeful tool and crockery storage,
  hatch/cellar ownership, L-shaped dock, rope/crank/bucket, mirrorperch ripples, creel, and occupation props are present.
- **Gameplay-camera readability:** both door routes, hatch, bucket, pulley control, fishing water, and clear standing
  areas remain discoverable. Roof fade exposes the room without erasing its perimeter.
- **Animation and interaction readability:** roof, doors, hatch traversal, pulley phases, water contact, and U5 fish
  family have distinct readable states. Decorative furnishings remain walk-first/right-click Inspect.
- **Family consistency:** the Workyard uses the established cozy low-poly Tutor's Holm palette and construction
  language while retaining a unique working-compound identity.

The remaining 0.8 is deliberately held for the owner's subjective whole-room read and any polish they identify while
walking it themselves, not for a known functional defect.

## Gates

- `node --check src/game4_ui.js` — PASS.
- `node tools/test_world_v2.js` — PASS, including the new inspect-only model-surface destination lock.
- `node tools/validate_content.js` — PASS; 238 items, 30 NPCs, 10 shops, 10 quests, 14 zones.
- `node tools/test_waterworks_u4_contract.js` — PASS 21/21.
- Foreground `?smoke=1&qaProfile=u6-final-smoke-v2` — PASS:
  - structural 103/103;
  - real walk out-and-back 3,556 ms;
  - six streaming boundaries with exact save/load position and no progress loss;
  - 100 FPS, 12 ms worst frame, 168 draw calls, 32,934 triangles;
  - seven world ticks, zero uncaught errors, zero console errors.

## Next boundary

The owner should perform one ordinary walk-through of the whole Workyard and either approve the room freeze or name
specific visual changes. No new Workyard lesson breadth, fishing expansion, or NPC production should begin before
that decision. Engineering work can proceed elsewhere without reopening the accepted basement or U3–U5 contracts.
