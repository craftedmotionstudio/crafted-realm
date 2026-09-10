# Tutor's Holm completion goal

Created: 2026-09-09
Owner intent: "finish building out the tutorial island." This file is the standing checklist a work loop reads at
the start of every tick. The loop picks the first unchecked item, works it to **verified** completion, ticks it,
and records the proof link. The loop stops only when every non-deferred item is ticked.

## Definition of "complete"

Every reserved station pad on Tutor's Holm is a complete building through the project's own pipeline, its
optional lesson works without an NPC wherever the design allows, the required thirteen-step route still passes a
real-pointer regression, and the docs, locks, and comparison sheets are banked. NPC placement, dialogue, and
NPC-gated kills stay **deferred by owner decision (2026-07-13)** and do not block completion; each deferred lesson
keeps a ready socket so NPCs can be added last.

## Per-building definition of done (apply to every unchecked building below)

1. Brief the pad: purpose, rooms, two doors on the route, hero object, support cluster, human-scale contract.
2. Blender builder in `tools/blender/build_holm_<id>_v1.py` + manifest in `assets/manifests/`; source `.blend`,
   runtime GLB, previews, authoring report; `python tools/asset_pipeline.py <manifest> --no-build` passes.
3. Building definition in `src/world_v2_building_data.js` with acceptance locks; `ASSETS` entry in
   `src/world_v2_buildings.js`; `MANIFEST` template in `src/world_v2_objects.js`; authored object + compiled
   interaction rows in `src/world_v2_holm.js`; pad retired; `completedPads` and any overlapping scatter prop fixed in
   `src/holm_landscape_data.js`; station `buildingDef`/tiles in `src/holm_tutorial_flow_data.js`.
4. Interactions module `src/holm_<id>_interactions.js` loaded from `index.html`; optional lesson recorded in
   `Tutorial.optional` where NPC-free; anything that moves is animated.
5. Row-count and acceptance-count locks updated in `tools/test_world_v2.js` and `tools/smoke_test.js`.
6. Gates: `node tools/test_world_v2.js`, `node tools/validate_content.js`, `node tools/run_smoke_headless.js`
   all pass with zero errors.
7. Real-pointer golden path in the browser under a disposable `?qaProfile`, negative cases, both doors, and a
   headless `tools/qa_<id>.js` that passes; save/reload persistence checked.
8. Two comparison sheets in `Bible_References/Complete/_compare/` with an honest structured review score
   (grayboxes stay below 9.0 until the owner's fully-designed gate).
9. Closeout `docs/rebuild/<ID>_V1_<date>.md`, `Bible_References/PASS_LOG.md` entry, `GUIDING_LIGHT.md` focus
   bullet, this file ticked with the proof link.

## Checklist

- [x] **Guide Hall** — complete before this goal (v6, functional graybox).
- [x] **Survival Workyard** — complete before this goal (U1–U6, functional graybox).
- [x] **Training Cavern** — complete before this goal (mining/smelting/smithing lesson live).
- [x] **Lastlight lighthouse + Departure boat** — complete before this goal.
- [x] **Teaching Kitchen** (pad `teaching_kitchen`, 153,136) — 2026-09-09,
      `docs/rebuild/TEACHING_KITCHEN_V1_2026-09-09.md`.
- [x] **Quest Lodge** (pad `quest_lodge`, 136,136, 12x9, door E) — 2026-09-09,
      `docs/rebuild/QUEST_LODGE_V1_2026-09-09.md`. Board study opens the journal (`learn_quests` optional), guide
      socket reserved. Engine fixes banked: footprint collision re-bake across chunks, station inside-tile guard.
- [x] **Mine Gatehouse** (pad `mine_gatehouse`, 127,119, 10x8, door S) — 2026-09-09,
      `docs/rebuild/MINE_GATEHOUSE_V1_2026-09-09.md`. Shaft moved inside the winch house (124.5,119.5); the road
      passes through the gate tower; `descend_cavern` verified by real descent in QA.
- [x] **Holm Bank** (pad `holm_bank`, 157,116, 10x8, door S) — 2026-09-09, `docs/rebuild/HOLM_BANK_V1_2026-09-09.md`.
      Teller booths + relocated vault chest both open the bank; `open_bank` verified through the real interface.
- [x] **Combat Hall** (pad `combat_hall`, 172,119, 12x9, door S) — 2026-09-09, `docs/rebuild/COMBAT_HALL_V1_2026-09-09.md`.
      Drill hall + drill tower + covered yard + armoury apse; the cavern exit ladder now surfaces inside the tower at
      176.5,116.5. Pell study opens the ⚔ tab; `melee_trial`/`ranged_trial` remain NPC-deferred (sockets authored).
- [x] **Mage Tower** (pad `mage_tower`, 193,136, 11x11, door S) — 2026-09-09, `docs/rebuild/MAGE_TOWER_V1_2026-09-09.md`.
      Two-storey stone tower + scriptorium wing; rune table opens the 🪄 tab, lectern and register NPC-free;
      `magic_trial` remains NPC-deferred (`casting_socket` authored). No reservation pads remain.
- [x] **Full-route regression** — 2026-09-09, `docs/rebuild/TUTORS_HOLM_FULL_ROUTE_QA_2026-09-09.md`.
      `tools/qa_holm_full_route.js` drives all thirteen required steps, both optional NPC-free lessons and the
      departure boat with real pointer/DOM input in one fresh profile: PASS 20/20. Three route defects found and
      fixed on the way (no choppable tree, un-clickable relief chart, fishing edge ignoring the armed net).
- [x] **Closeout** — 2026-09-09. Flow doc completion state + open decisions, `TUTORIAL_ISLAND.md` STATUS note,
      guiding-light closing bullet, PASS_LOG entry. Every non-deferred item above is ticked; the loop ends here.

## Open owner decisions (recorded, not blockers)

- Fully-designed art acceptance (§2.1 gate) for each of the eight grayboxes; compare sheets in
  `Bible_References/Complete/_compare/` are all held below 9.0 on purpose.
- Modelled-NPC authorization: tutors, chef, quest guide, combat instructors, mage, and the practice enemies for the
  three kill trials. Sockets are authored; nothing ships a placeholder.
- Studio building-bundle workspaces for the six 2026-09-09 buildings (optional; district bundles are lock-checked).

## Deferred by owner decision (not blockers)

- Modelled NPC tutors, chef, quest guide, combat instructors, and mage; their dialogue and item grants.
- NPC-gated lessons: `learn_quests` (talk form), `melee_trial`, `ranged_trial`, `magic_trial` kills.
- Fully-designed art acceptance of any building (owner's §2.1 gate).

## Lessons that apply to every remaining building

- Centre each door opening on a tile centre (odd footprints put ±4.5 walls on tile centres; check the gap tiles).
- Wrap every wall-mounted station handler with `HolmStationReach.guard(buildingId, interactionTile, handler)`.
- Small polygonal bays under ~2.5 tiles radius become window bays, not rooms; put the interaction tile at the mouth.
- Furniture colliders within 0.6 tiles of a tile centre beside an arch or door seal it; stand posts on tile corners.
- Interior gaps (counter ends, arches) need two tiles so one centre clears both the furniture pad and the wall pad.
- The planner ignores closed doors; negatives must assert the long route (path length), not unreachability.
- Thin click targets (bars, sills, boards) need an invisible hit proxy box added by the interactions module.
- If a pad level changes, republish the district terrain bundle through `studio_workspace_cli.js` (build → export →
  plan → apply) before running the world gate.

- The Lastlight headland's route gate (`tileInsideLastlightRoute`, influence radius 28 around 196,112) used to
  reject every off-switchback tile, which made the east half of the Combat Hall unwalkable from inside. Building
  pads (plus a 1-tile doorstep shoulder) are now exempt via `HolmLandscape.padAt`; the Mage Tower pad (193,136) sits
  inside the same radius and inherits the exemption.
- `CollisionGrid._bakeWall` used to bake closed-door rect colliders as WALL edges, so a plan into a building whose
  door was shut stopped outside (the gatehouse from the hall side). Door colliders are now skipped in the bake, matching
  the planner's ignoreDoors contract; the walker still opens the leaf on arrival.
- After a plane change (cavern climb) the surface chunks stream back in asynchronously: QA must wait for the
  building's `WORLD.roofs` entry before asserting the cutaway.
- A hidden browser pane freezes rAF, so the game will not boot there; front the pane (screenshot) before login.

- A two-storey building hides its ground floor from the gameplay camera unless the upper storey (walls, quoins,
  upper windows, floor slab) is authored inside the `roof` semantic part so the cutaway removes it with the spire.
- Puppeteer captures that press the play button by script can leave the welcome overlay painted over the booted
  game; hide its fixed ancestor before screenshots, and never read visuals from a capture that disagrees with the
  live pane.

- `Sched.walkThen` gives up silently when the walk ends outside the hook's reach. A generic `Interact` walk-to on a
  wide object (the 3-tile relief chart) lands outside reach and nothing happens; every authored station must wrap
  its handler in `HolmStationReach.guard` with its interactionTile, and the reach script must load before the module.
- A station that is used *with* an inventory item (net on water, dough on range) must set `acceptsUseItem:true` on
  its interaction row, or the canvas click with an armed item falls through to `handleClick` and does nothing.
  Changing a Workyard row means recompiling both checked-in Studio bundles (`scratchpad/rebuild_workyard_bundle.js`
  then `node tools/build_survival_wood_district_bundle.js`) so the compile-pair lock stays green.
- Flow acceptance (13/13) proves the data, not the play: only a real-input drive of the whole route found that the
  chop lesson had no tree. Keep `tools/qa_holm_full_route.js` as the standing route gate.

## Loop rules

- One bounded bundle per tick; never leave a half-wired building in the tree at the end of a tick — either finish the
  bundle's gates or revert the partial wiring.
- Verify in the real browser; never claim a step from headless data alone.
- Do not commit; the owner commits. List changed files in each closeout.
- If a tick cannot make progress (server down, Blender missing, gate red with no fix), record the blocker here
  under "Blockers" and stop the loop rather than spinning.

## Blockers

(none)
