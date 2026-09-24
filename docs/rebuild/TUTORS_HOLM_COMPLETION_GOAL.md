# Tutor's Holm completion goal

> **SUPERSEDED VISUAL BASELINE — owner, 2026-09-12 (latest):** this file's historical completed buildings,
> scores, footprints and phase closures are prototype history, not current visual acceptance. The owner
> requests a full world/visual overhaul, including richer terrain, castle, creek, caves and climbable
> multi-storey houses. The governing revised goal/checklist is
> `docs/rebuild/HOLM_OVERHAUL_GOAL_2026-09-12.md`. Keep the complete functional scope below; follow the new
> composition/first-slice sequence rather than simply selecting the next old unchecked polish item.


Created: 2026-09-09
Owner intent: "finish building out the tutorial island." Phase 1 (every pad a building, the route playable with real
input) closed on 2026-09-09. Owner intent restated 2026-09-10: **"tutorial island needs to be optimized, played,
redesigned, improved"** — Phase 2 below carries that. This file is the standing checklist a work loop reads at the
start of every tick. The loop picks the first unchecked item, works it to **verified** completion, ticks it, and
records the proof link. The loop stops only when every non-deferred item is ticked.

## Definition of "complete"

**Owner scope supersession — 2026-09-12:** a new active goal requires the tutorial island to be fully functional,
including finished building design, player appearances, modeled NPCs, tutorial items and equipment, and Blender
work as needed. Earlier NPC/art deferrals below describe historical milestone scope only; they no longer exclude
that work from completion. Production is authorized now. Integrate NPCs through the stable chunk foundation after
their environments and assets pass their gates; do not enable legacy global spawns as a shortcut. Owner approval
of an individual visual result must still be recorded honestly rather than inferred from this production request.

### Full-island acceptance checklist (active 2026-09-12)

- [ ] Reconcile current source, real-play evidence, assets and remaining defects into a complete island inventory.
- [ ] Finish the building redesign passes and resolve every below-9.0 visual gap, including earlier ticked passes.
- [ ] Finish terrain, cavern, landscape, HUD and navigation readability gaps from the play review.
- [ ] Finish the canonical player appearance family, editable sources, rig/animation and worn-gear fit; preserve
      character creation choices and saved appearance migration.
- [ ] Complete modeled/animated tutors and other purposeful island NPCs, dialogue and service interactions.
- [ ] Complete modeled practice enemies and melee/ranged/magic trials through chunk-owned lifecycle data.
- [ ] Verify every island lesson item, grant, equipped tool, consumable, crafting recipe, bank operation and
      reward; repair full-inventory, interruption, duplicate-reward and save/reload cases.
- [ ] Verify Lastlight, graduation, ferry transition and return/continue behavior without losing progress.
- [ ] Run a fresh real-input complete island playthrough including NPCs and optional combat/crafting lessons,
      returning-save migration, negative cases and final foreground performance/error gates.
- [ ] Bank required visual/contact sheets, editable Blender sources, provenance, test evidence and final remaining
      owner acceptance decisions. Do not close this goal on graybox or NPC-free route acceptance alone.

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
      guiding-light closing bullet, PASS_LOG entry. Phase 1 closed; the loop continues on Phase 2 below.

## Phase 2 — played, improved, optimized, redesigned (opened 2026-09-10)

Definition of done for Phase 2: a first-time player can finish the island in the 20–30 minute target without a
stuck moment, every friction found by play is fixed and locked by a gate, the island runs inside the smoke budgets
with headroom on a mid laptop, and each building reaches the fully-designed bar (compare sheet ≥ 9.0) through a
play-informed redesign pass. NPCs remain deferred unless the owner authorizes them (see Open owner decisions).

### P2-A Play (baseline first, always in the real browser)

- [x] **Human-pace playthrough review** — 2026-09-10, `docs/rebuild/TUTORS_HOLM_PLAY_REVIEW_2026-09-10.md`.
      Played the whole route in the visible pane with real pointer input: 13/13 lessons, 23.3 min including the
      boat, 35 friction entries logged with severities and proposed fixes. One critical defect fixed in-run:
      click-to-walk was dead on the entire island surface (terrain chunks named `ground-chunk-*` were not
      recognised by the picker) — `isGroundName` in `src/game4_ui.js`, locked in `tools/test_world_v2.js`.
- [x] **Route pacing audit** — 2026-09-10, `tools/audit_holm_route_pacing.js`, table in §9 of the play review.
      543 required tiles; the only leg over 45 s (bank → Lastlight, 48.9 s) was walked on an empty energy bar.
      Holm run-energy pacing applied (quarter drain, triple regen while the Holm provider is active; locked):
      walking time 160 s → 123 s, longest leg 27.9 s, energy never below 67%. Full-route driver re-run below.

### P2-B Improve (fix what play found; each fix gets a lock)

- [x] **Camera–terrain collision** — 2026-09-10. `cameraTerrainClamp` in `src/game5_main.js` samples the
      boom from the look target to the desired camera against `groundY` (clearance 1.1) and against registered
      `WORLD.cameraBlockers` cylinders (Lastlight registers its tower on init, removes it on dispose); the boom
      shortens to the last clear sample. Verified in the pane at the Combat Hall (camera 2.9 above the slope,
      was inside the hill) and the Mage Tower facing north (camera 12 tiles from the lighthouse centre, outside
      it). Locked in `tools/test_world_v2.js`; smoke green.
- [x] **Walk-order feedback** — 2026-09-10 (`src/game4_ui.js`). A blocked tile (wall, furniture, tree) snaps to
      the nearest walkable tile within three (`nearestWalkableTile`) instead of stalling; water/off-map says
      "You cannot walk there." once per 2.5 s (`noWalkMessage`); a fresh in-radius order whose plan ends more than
      three tiles short says so once (`announceWalkOrder`). Pane: three rapid water clicks → one line; a click on
      the rune table tile walked to the tile beside it; the partial line fires for a far shortfall and stays silent
      for a near one. Locked; smoke green. The full-route driver is re-run at the end of P2-B.
- [x] **Interior readability pass** — 2026-09-10. The three invisible or hidden interaction targets from the play
      review now read on screen: the cavern exit ladder has a timber ladder with a lit lamp inside its click group
      (`src/holm_training_cavern.js`), the Lastlight lever has an iron pedestal, bronze arm and brass knob that throws
      when the beacon lights (`src/holm_lastlight_runtime.js`), and the Combat Hall tower's band above hall height
      moved into the roof group so the cutaway exposes the stair landing (builder rebuilt, GLB `?v=2`). Verified in
      the pane (ladder, lever) and by the hall QA's surfacing screenshot; locks added; hall QA 17/17; smoke green.
      Carried to Guidance clarity: the Guide Hall exit door hidden behind the register dais (F-09) gets a door arrow.
- [x] **Guidance clarity** — 2026-09-10. The beacon now follows what the player must do next: `src/holm_guidance.js`
      redirects it to the building's exit door when the objective is outside (F-09, label lifted above the dais),
      to the cavern exit ladder while underground (F-25) and to the live fire while cooking (F-16, Holm fires burn
      150 s). Climb-down is the winch frame's left click during the descend lesson (F-20), menu rows use the
      authored names (F-18), Mark Tile is hidden for tutorial players (F-19), the net-use walk announces itself
      (F-15), the tin/bank/writ wording matches the geography (F-22/F-25/F-33) and the post-graduation banner keeps
      "Board the skiff" until the crossing (F-35). Verified in the pane; five locks; smoke green; gatehouse QA PASS 12/12; full route driver PASS 20/20 in 424 s.
      Still open from the friction log for later phases: F-01/F-26 HUD layout (P2-D), F-23 offshoot floor (P2-D).
- [x] **Boot robustness** — 2026-09-10. Root cause: `BootCoordinator` yielded between steps through
      `requestAnimationFrame`, which a hidden or occluded tab never receives, so a background boot stalled at the
      loading screen and a scripted play click could start the loop before the world existed. Fixed: the yield races
      rAF against a 120 ms timer (`src/boot_coordinator.js`); `animate`, the heartbeat and the play button wait for
      `_worldReady` (`src/game5_main.js`); the Workyard cellar binds through a timer while hidden instead of only in
      its rAF loop (`src/holm_survival_workyard_cellar.js`). Gate: `tools/run_smoke_headless.js` now runs the
      foreground gate and then the same gate booted in a background tab on a disposable profile, asserting the
      hidden boot reached ready with zero errors (`[SMOKE HIDDEN BOOT] PASS`, boot 1.5 s hidden, 104/104 both).
      Locks added; normal pane boot verified (telemetry ready in 0.5 s, 0 errors).

### P2-C Optimize (measure, then cut)

- [x] **Performance baseline and budget** — 2026-09-10. `src/perf_probe.js` (read-only telemetry) +
      `tools/audit_holm_perf.js` measure every station at play and elevated camera distance; table recorded in the
      play review §11. Result: frame time meets the budget (60 FPS, worst 21 ms real browser) but draw calls do not:
      worst elevated view 706 calls at the Quest Lodge (target 120), because buildings are 50-180 meshes with 25-78
      materials each. Budget stands (≤ 120 calls, ≤ 30 ms); the miss is handed to Asset consolidation as its exit
      bar. Lock: probe/audit sources present and the baseline JSON banked.
- [x] **Asset consolidation** — 2026-09-10. `src/world_v2_consolidate.js` (load-time merge, locked, `?consolidate=0`
      for A/B): meshes merge per semantic part into vertex-coloured meshes on six shared bucket materials; parts,
      doors, roof cutaway, animation targets, hit proxies, flames and glass are untouched; props without parts become
      one mesh. Worst elevated view 706 -> 347 draw calls (-51%), worst play view 345 -> 167; buildings 51-178 ->
      15-66 meshes, 25-78 -> 4-14 materials; triangles and every GLB/manifest budget unchanged (pipeline unaffected).
      Verified in the pane (Guide Hall, Lesson Green, dock) and by gates: locks, smoke 105/105 both phases, gatehouse
      12/12, bank 12/12, kitchen 11/11, full route PASS 20/20 in 526 s (solo rerun). Table in play review §11a. The 120-call bar is NOT met: the
      remainder is workyard families (69), atmosphere FX (56), terrain chunks (48) and the player (27); the levers
      for those are logged under Open owner decisions. Hidden-geometry drops in the builders were not needed for
      draw calls and are deferred to the P2-D art passes where the meshes are rebuilt anyway.
- [x] **Streaming and load** — 2026-09-10. `tools/audit_holm_streaming.js` (cold-cache boot + full-route rAF gap
      recorder) found the real hitches were shader compiles triggered by light-count changes as chunks with point
      lights stream (104-156 ms real, 510-585 ms headless), not chunk loads. Fixed with `src/world_v2_warmup.js`
      (template programs + extra light counts compiled behind the loading bar and on the welcome screen) and
      budgeted chunk loads in `src/world_v2_contract.js` (one per frame, nearest first, forced calls synchronous).
      Result: 71 boundary crossings across the route with no chunk-boundary gap over 60 ms (worst gap 69.4 ms headless
      at the hall door, 50.7 ms real browser); cold-cache headless boot 3585 ms (bar 5 s), real warm boot 1.24 s. Table in play review §12;
      locks (source + banked audit); smoke PASS both phases (fresh-profile boot 2235 ms foreground / 2521 ms hidden), full route PASS 20/20 in 503 s. Follow-up logged: 17.7 MB of legacy mainland PNG textures still
      load at boot in the Holm build (lazy-load behind the provider).

### P2-D Redesign (play-informed art pass toward the fully-designed bar)

- [x] **Redesign brief per building** — 2026-09-10. `docs/rebuild/TUTORS_HOLM_REDESIGN_BRIEFS_2026-09-10.md`: eight
      briefs (current score and the reviewer's named gap, silhouette, hero object, interior read, colour/material
      separation, reference-defining features, cut, score target) plus the shared rules the P2-C work imposes
      (contract tiles fixed, semantic parts named, storeys in the roof part, family palette, budgets) and the
      play-review items each pass must carry (F-06/F-09 hall, F-12/F-13/F-14 wood, F-29 hall tower, F-30 bank,
      F-36 tower drum, F-23 offshoot floor). Combat Hall and Mage Tower have no banked numeric score; their passes
      record the first. Locked (file present with all eight building sections).
- [x] **Guide Hall / Survival Workyard art pass** — 2026-09-10. Guide Hall v7
      (`docs/rebuild/GUIDE_HALL_V7_2026-09-10.md`): chimney, ridge caps, soffits, hero chart rim + districts +
      compass rose + flags (F-06 click target), teaching dais off the door axis (F-09), ledger and oilskins;
      palette held at 18; sheets 8.8 / 8.9 with the gaps named (honest score, not rounded up). Survival Workyard
      v3 (`docs/rebuild/SURVIVAL_WORKYARD_V3_2026-09-10.md`): ridge caps, finials, flue pot, soffits; marked lesson
      trees banded and chalked (F-12); fire ring at the firemaking tile (F-13/F-14); sheets 9.0 / 9.1. Both
      buildings inside their manifest budgets, pipeline PASS, locks, smoke PASS both phases 105/105 after moving the smoke's workyard revision pin from 18 to 19 (boot 2401 ms foreground / 2052 ms hidden), full route PASS 20/20 in 428 s. The owner's eyes-on review remains
      the final gate for both.
- [x] **Teaching Kitchen / Quest Lodge art pass** — 2026-09-10 (`docs/rebuild/KITCHEN_LODGE_V2_2026-09-10.md`).
      Kitchen v2: louvred shutters with hinges, gable bargeboards + finials, flue pot, herb/onion strings, loaves,
      flour dust, bread peel; sheets 8.9 / 9.0. Lodge v2: porch balusters + rails, hall ridge caps + finials,
      reading corner (rug, candle stand, open pages), chart title + contours; sheets 8.8 / 8.8. Both inside their
      v1 manifest budgets, pipeline PASS, locks, smoke PASS both phases 105/105 (boot 3063 ms foreground / 2599 ms hidden), full route PASS 20/20 in 479 s, kitchen QA PASS 11/11, lodge QA PASS 14/14 after its closed-wall check was rewritten to the door-auto-open rule. Honest score: the remaining gaps are roof-field and course
      geometry (next-pass target named in the closeout), not rounded up to 9.0.
- [ ] **Mine Gatehouse / Holm Bank art pass** — same bar.
- [ ] **Combat Hall / Mage Tower art pass** — same bar (partition/cutaway fixes from P2-B folded in).
- [ ] **Landscape and route dressing** — road, shore, scatter and signage along the spine so each leg reads as a
      place; the switchback and headland camera framing reviewed with the camera fix.
- [ ] **Phase 2 regression and closeout** — full-route driver 20/20, human-pace playthrough re-timed inside
      20–30 minutes, all gates green, PASS_LOG/GUIDING_LIGHT/flow doc updated, this file ticked.

## Open owner decisions (recorded, not blockers)

- **Draw-call bar below 347.** Reaching the original 120-call target at the elevated camera needs changes beyond the
  asset merge: (1) instance the atmosphere FX (clouds, leaves, petals: 56 draws), (2) merge resident terrain chunks
  into 2x2 tiles at rest (48 draws), (3) give station parts invisible pick proxies so their geometry can join the
  building shell (buildings 14-26 -> ~6 each). Each touches a system beyond art; decide whether P2-D should carry
  them or whether ~350 elevated / ~170 play at a steady 60 FPS is the accepted Phase 2 bar.

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

- Ground clicks resolve through `pick()` in `src/game4_ui.js`, which walks up to a mesh named like ground; any new
  walkable surface (chunk terrain, plane floors) must satisfy `isGroundName` or clicking it does nothing.
- The minimap rotates with camera yaw; scripted or scripted-looking minimap targets must go through
  `CRMinimap.screenToWorld` with the live yaw (the play review's `mmFor` helper does the inverse search).
- HUD chips (orbs, energy, overlay toggle) sit over the world in a narrow viewport and swallow clicks; when a
  world click does nothing, check `document.elementFromPoint` before blaming the pick.
- Invisible click proxies (cavern exit ladder, Lastlight lever) pass every headless gate and still fail a player;
  the play review, not the driver, is the gate for "can you see what to click".

- The follow camera is a bare boom; terrain and solid landmarks must be checked along it every frame
  (`cameraTerrainClamp`). Buildings with a roof cutaway must NOT be blockers (the camera is meant to look in);
  only solid towers like Lastlight register in `WORLD.cameraBlockers`.

## Loop rules

- One bounded bundle per tick; never leave a half-wired building in the tree at the end of a tick — either finish the
  bundle's gates or revert the partial wiring.
- Verify in the real browser; never claim a step from headless data alone.
- Do not commit; the owner commits. List changed files in each closeout.
- If a tick cannot make progress (server down, Blender missing, gate red with no fix), record the blocker here
  under "Blockers" and stop the loop rather than spinning.

## Blockers

(none)
