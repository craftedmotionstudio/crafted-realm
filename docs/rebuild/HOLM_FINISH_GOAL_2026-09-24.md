# Tutor's Holm — analyze, fix and finish (goal, 2026-09-24)

Owner request, 2026-09-24: "create a goal to analyze and fix Crafted Realms and finish the tutorial island."

This file is the **working checklist** for that request. It does not replace the governing design goals. It
turns them into one ordered path that ends with a finished island in the **live game**:

- `docs/rebuild/HOLM_OVERHAUL_GOAL_2026-09-12.md` — visual/world direction (governs *what it looks like*).
- `docs/rebuild/TUTORS_HOLM_COMPLETION_GOAL.md` — full-island functional checklist (governs *what it must do*).
- `docs/rebuild/HOLM_FULL_COMPLETION_AUDIT_2026-09-12.md` and `HOLM_FULL_CURRICULUM_EVENT_AUDIT_2026-09-13.md` —
  source evidence this plan is built on.

A work loop reads this file at the start of each tick, picks the first unchecked item, works it to verified
completion, ticks it with a proof link, and stops only when every item is ticked or a blocker is recorded.

## Owner style direction (2026-09-24)

"We want this like **2004 old school RuneScape** as much as possible." Every visual and feel decision in this goal
is judged against that era: early RuneScape 2 low-poly models, flat-shaded or small simple textures, chunky readable
silhouettes, saturated warm greens and browns, simple tree and rock shapes, the 2004 Tutorial Island's compact
layout of guide buildings, fenced yards and paths. That era also means simple chat-box dialogue, the classic side
panel, click-to-move on tiles and a 600 ms tick. Our own names, models and layouts only: no ripped assets, maps or
branded content (see GOAL.md). When a choice is unclear, pick the option closer to that era over a modern or
high-detail one. This tightens GOAL.md's "stepping into 2007" wording; the owner's 2004 target wins.

Reference source: the owner asked to use **2004scape** as needed. Clones and the usage rules are in
`docs/rebuild/REFERENCE_2004SCAPE.md`. We study its structure and feel and adapt MIT code with attribution. We never
copy its Jagex models, maps, textures, audio or text.

## Where things stand (analysis, 2026-09-24)

**Healthy:** `node tools/test_world_v2.js` passes every lock. `node tools/validate_content.js` passes (238 items,
30 NPCs, 10 shops, 10 quests, 14 zones). Every 2026-09-13 pass recorded foreground smoke 105/105 at 60 FPS, zero
errors.

**The central gap:** the 2026-09-12/13 overhaul work lives in **isolated Studio candidates**, not in the game.
A player who logs in today still gets the old island the owner rejected.

| Place | Live game today | Overhaul candidate | Candidate status |
|---|---|---|---|
| Arrival cove + dock | old landing | arrival package, dock, skiff, water, scenery | Studio + partial live integration; door-opening pointer proof still open |
| Guide house (Bram) | Guide Hall v7 slab | `holm_guide_house_overhaul_v1` | Studio only |
| Bakehouse / kitchen | Teaching Kitchen v2 | kitchen-wings v5 (L-plan, loft, fire, supplies) | Studio + terrain draft; 8.1 provisional |
| Quest lodge | Quest Lodge v2 | Blender lodge v3 (guest wing, stairs, hearth, door) | Studio + terrain draft; 8.3 provisional |
| Warden's Keep (castle) | none | keep v5 (towers, wall walk, 7 connected routes) | Studio + ridge draft; 8.3 provisional |
| Bank | Holm Bank v1/v2 | clipped hall + clerk wing (map only) | not built |
| Mine / cavern | Gatehouse v2 + Training Cavern | rock portal, hoist, lean-to (map only) | not built |
| Mage tower | Mage Tower v1 | octagonal tower + workroom (map only) | not built |
| Lastlight + ferry | live | keeper wing (map only) | not built |
| Terrain / creek / habitat | old `HolmLandscape` | concept02 plan, 46 Blender trees/plants | Studio only; **no terrain source/compiler for a new island exists** |

**Curriculum:** 18 lessons are designed; only **13 run**. `runtimeSteps()` filters out `bake_bread`,
`learn_quests`, `melee_trial`, `ranged_trial`, `magic_trial`. Supporting fixes are staged but not activated:
18-lesson save migration helper (13/13 tests), atomic combat kits (18/18), styled-kill attribution (28/28), quest
board success (13/13), bread recipe planner (31+6), bake cancellation (18/18).

**Missing entirely:** NPCs on the island (`worldNpcSpawns:false`; world-v2 spawns layer has no consumer), practice
enemies for the three combat trials, and an editable Blender source for the player character.

**Risk:** about 442 files of the Sept 12–13 work are uncommitted on `main` in a OneDrive folder. A bad sync or
accidental checkout could lose most of the overhaul.

## Definition of finished

A fresh character washes up, plays all 18 lessons on the redesigned island with real mouse input, meets modeled
and animated tutors, fights the three practice trials, banks, lights Lastlight and sails to the mainland, in about
20–30 minutes, with no stuck moments. Returning saves migrate without losing items or progress. All gates pass,
with foreground smoke at 60 FPS and zero errors. The owner has looked at it and said yes. **That final approval
comes from the owner and cannot be replaced by a self-assigned score.**

## Checklist

### M0 — Safety and baseline
- [x] **Checkpoint the uncommitted work.** 2026-09-24, owner approved: commit `9eb78fd` on branch
      `holm-overhaul-wip-2026-09-24` (1,200 files, secret and large-file scan clean). `main` still points at
      `7597a20`; advance it only with owner agreement.
- [x] **Gate baseline.** Record the results of `test_world_v2`, `validate_content`, `run_smoke_headless` (both
      phases) and `qa_holm_full_route` (20/20 expected) from today. Anything red becomes the first M1 fix.
      2026-09-24: world-v2 all locks PASS; content PASS; smoke PASS 105/105 foreground (boot 2027 ms) and hidden
      (boot 1914 ms), 0 page errors. `run_smoke_headless.js` and `qa_holm_full_route.js` now accept `SMOKE_BASE`
      because the in-app preview serves on 8088 (`.claude/launch.json` added). Full route (`qa_holm_full_route.js`):
      PASS 20/20 in 451 s: all 13 required lessons, optional bread and quest board, Lastlight, skiff to Veyhollow
      Commons (230 coins, 4 bread), zero page/console errors and zero failed asset loads.
- [x] **Live-player baseline.** Play the current live island in the in-app browser with a disposable
      `?qaProfile`. Record what a new player actually sees and every friction or defect, with screenshots.
      2026-09-24 (`?qaProfile=goal0924a`..`f`): a new adventurer boots onto the old, owner-rejected island with the
      Guide Hall objective. The full curriculum is proven by the route driver above; the 2026-09-10 play review's
      35 friction entries remain the detailed human-pace record. New defects found: (a) the welcome button read
      "ENTER VEYHOLLOW" for a Holm arrival; (b) the first frames after entering rendered from the world origin at
      sea level; (c) the appearance designer's close-up camera sat inside the Guide Hall walls or its open front
      door, with the overhead name tag filling the screen. The 5 → 55 crown change is correct (Apprentice deed
      pays 50 after entry), not a defect.

### M1 — Fix what is broken now
- [x] Fix every red gate or live defect from M0 and lock each fix with a test. 2026-09-24: no gate was red.
      (a) `src/login_overhaul.js` labels the button WASH ASHORE / RETURN TO TUTOR'S HOLM / ENTER VEYHOLLOW from the
      saved world provider; (b) `snapFollowCamera()` in `src/game5_main.js` places the camera on entry;
      (c) `CharCreator._clearYaw` in `src/char_creator.js` ray-tests eight yaws against visible geometry, restores
      the player's yaw on close, and hides the name tag while designing (restoring the declutter choice). Verified
      in the pane: new and continued profiles, designer framing, "Looks good!" restore, zero errors. Three locks in
      `tools/test_world_v2.js`; world-v2 all locks PASS; smoke 105/105 foreground and hidden, 0 page errors.
- [x] Close the open arrival door-opening pointer proof (HOLM_ARCHITECTURE_REVISION §Production). 2026-09-24:
      a far door click used to answer "Walk closer to the door." `src/holm_arrival_qa.js` now walks to the nearest
      stance on the player's side (`doorStance`) and opens the door on arrival, as in 2004. Pane proof
      (`?arrivalQA=1&qaProfile=arr0924a`): real click on the door from 15 tiles walked the path, the door swung open
      (`doors.arrival=true`), a real floor click then walked inside to `ground:65,97`; zero errors.
      `tools/test_holm_arrival_door_queue.js` locks walk-then-open-once, near toggle and unreachable refusal.
- [x] Wall line-of-sight for station reach (HOLM_STATION_REACH_PASS open item). 2026-09-24:
      `src/holm_station_reach.js` arrival also needs `CollisionGrid.hasLoS` on the surface, so a station cannot be
      used from the far side of a wall; while the only failure is the wall and the walk continues, it re-arms
      (max 40) so the player still walks round through the door and acts once. Contract tests 50/50 (5 new).
      Full real-pointer route PASS 20/20 in 403 s with the change: every station on the route still works.
- [x] Lazy-load the legacy mainland textures (P2-C follow-up). 2026-09-24: the real cost was nine painted PNGs,
      14.4 MB, fetched by `loadCreatureTextures()` at every boot. They are now lazy `TEX` getters in
      `src/game2_world.js` that fetch on first read; clones taken before the image arrives receive it on load.
      Pane proof: a fresh Holm game downloads **0** of the nine (was 14.4 MB), zero errors.

## ⚠ Rebase decision (owner, 2026-09-24, after review 6)

The v3 preview built on 2026-09-24 (`?holmV3=1`: `holm_v3_render/preview/scenery.js`, `holm_tile_house.js`,
`holm_tile_furniture.js`, the compact 112x84 island) drifted off the real latest state: it re-made the arrival and
guide house from code primitives, the look the owner has rejected since July ("These primitives are not what we're
looking for"). Owner reviews 1-6 of it never converged. On being shown the **Sept 13 Blender overhaul** in the
Terrain Studio (`tools/studio_holm_overhaul.html`) the owner decided: *"the version from September 13 ... that's way
better. We want to use that as our version ... make sure that you're building off of that."*

**Base from now on:** the Sept 13 composition: terrain `holm-overhaul-terrain-v1` (144x128, `src/holm_overhaul_terrain.js`),
guide house overhaul v1, arrival dock and skiff, provision rack, habitat v1, bakehouse v5 placement, Quest Lodge v3
placement, Warden's Keep v5 on its ridge foundation. All visible assets are Blender GLBs (owner rule, review 6).

**Kept from 2026-09-24:** M0/M1 below (live fixes, door queue, station LoS, lazy textures); the 2004scape reference and
style direction; the QA drivers (`qa_holm_full_route.js`, `run_smoke_headless.js` with `SMOKE_BASE`); the owner's
review-5/6 notes, which now apply to the Sept 13 base:
- ground tiles visible as squares but in **close shades** that merge in patches; slope does the shading;
- buildings with jut-outs / jettied taller upper storeys on posts, many-angled hand-made roofs, not box shells;
- trees with branches out of the crown (not round balls), better trunks; more planted detail; designed statues;
- everything modelled in Blender as low-poly assets.

**Shelved (kept in git as history, not extended):** the `?holmV3=1` provider, tile-house kit, tile furniture, v3
scenery and the compact v3 island source. Reusable plumbing (walk-height/route validation in `holm_v3_terrain.js`)
may be reused only behind Sept 13 visuals. Items M2/M3 below record what was done on the shelved track.

### M3R — Arrival → guide house on the Sept 13 base (replaces M3; STOP for owner review)
- [x] Ground look on the Sept 13 terrain: visible tile squares in close shades, soft patches, slope shading.
      `src/holm_overhaul_ground.js` (one colour per tile from the Sept 13 palette, 5-tile patch field +-5%,
      per-tile +-1.75%), used by the Terrain Studio and the in-game sampled renderer; no drawn grid on it.
- [x] Guide house v2 in Blender from the overhaul v1 source: taller jettied upper storey on posts/brackets,
      half-hipped roof tiled on every face, east dormer, orderly gable framing; v1 doors, stair, furnishings,
      hearth/chimney, porch and walk bands unchanged. `tools/blender/build_holm_guide_house_overhaul_v2.py`,
      21,153 tris, five proof renders.
- [x] Arrival habitat: tree family v3 oak (limbs show between separate crowns, leafy tips past the rim,
      2,434 tris) and the original Lantern Keeper statue (`build_holm_arrival_statue_v1.py`, 1,433 tris).
      Trees now block by a Blender-measured ground-contact footprint, not the whole canopy (2004 rule).
- [x] Playable: arrival package v4 (export `8d488d326998f957`, staged via Safe Publish, not applied) loaded by
      `?arrivalQA=1`. Standing gate `tools/qa_holm_arrival_v4.js` PASS 12/12 real pointer: landing path on
      cardinal steps, far door click walks and opens, inside with roof cut away, stair to the upper floor and
      back out, statue tiles refused, reload restores position and door, 0 errors. Colour maps now render as
      authored in the r128 game (they decoded near-black). Sheets `Bible_References/Complete/_compare/holm-arrival-v4-*.png`.
- [x] **Owner review of the slice.** 2026-09-24, owner: "approved, move on to step 4" (commit `1f0ccd4`,
      sheets `holm-arrival-v4-*.png`). This look (tile-true close-shade ground, Blender jettied/half-hipped
      buildings, branching trees, designed statues) is the language for the whole island.

### M2 — Terrain engine that allows the new island (enabling work, from the workspace handoff) — shelved track
- [x] New terrain source schema: versioned heights, material regions, shoreline and creek, crossings. One
      contract drives rendering, collision, minimap, `groundY` and navigation. 2026-09-24:
      `holm-terrain-source-v3` (`src/holm_v3_terrain.js`) layers path overlays (dirt/cobble/sand), crossings
      (bridge decks), anchors and required routes over the proven v1 heightfield compiler; one bundle gives per-tile
      walk height (null on water, deck height on bridges) used by rendering, `groundY`, collision and the validator.
- [x] General deterministic compiler and validator under a **new** schema. Lesson Green is untouched.
      `tools/build_holm_v3_terrain.js` compiles `assets/world/holm_v3/holm-v3.terrain.source.json`, reports every
      route and has a `--check` gate that fails on a stale bundle. `tools/test_holm_v3_terrain.js` 8/8:
      determinism, immutability, creek/sea blocked, deck walkable, cardinal BFS with the game's 1.05 step rule,
      overlays, and 16 malformed-source rejections (diagonal/empty paths, paths over water without a deck,
      decks in the sea / over no creek / too low / unreachable ends / overlapping / too wide, unknown anchors).
- [x] Cross-package validation (terrain side): bridges must span creek tiles, sit 0.3+ above water and land
      within one step on dry ground at both ends; named anchors must be connected. Draft island: all 8 building-site
      routes reachable. Finding for step 3: the concept creek starts inland, so the island is walkable round its
      head and the bridge is a shortcut, not a requirement. Building door/footprint checks join when step-3
      buildings exist (no v3 buildings yet).
- [x] Isolated preview provider (`tutors-holm-v3`, `src/holm_v3_preview.js`), opt-in with `?holmV3=1` and an
      isolated `qaProfile`; production boot untouched. `src/holm_v3_render.js` draws the 2004 look: smoothly
      blended underlay colours, crisp flat path tiles, flat-shaded Lambert, flat blue sea and creek, plank decks.
      Pane proof (`?holmV3=1&qaProfile=v3a`): boots onto v3 at the landing with 0 errors and a baked resident grid;
      real click walked the landing path to the guide pad (y 3); a click on the creek stopped on the dry bank;
      a click beyond the bridge crossed it on the deck (8 samples at exactly 3.3); save/reload restored the exact
      position on v3. Grass retuned from lime to 2004 meadow green after the first pane look.

### M3 — First live slice: arrival → guide house (shelved v3 track; superseded by M3R)
- [x] Arrival cove, creek crossing, guide house exterior, furnished interior and upper floor running in the
      `tutors-holm-v3` preview, with real-pointer walking both ways. 2026-09-24:
      new **tile house kit** (`src/holm_tile_house.js`): rooms of whole tiles on two levels, walls on tile edges
      (so collision is exactly what you see), L/T plans with a roof per wing, doors on the game's door contract,
      windows, arches, loft ladders; the planner proves every room and every clear floor tile reachable and keeps
      furniture off doors/arches/stairs (8/8 tests). **2004 furniture** (`src/holm_tile_furniture.js`) and **cove
      scenery** (`src/holm_v3_scenery.js`: round mottled oaks, pines, bushes, flowers, rocks, a beached rowboat,
      edge fences). Guide house (`assets/world/holm_v3/guide_house.tilehouse.json`): grey stone under slate,
      two-storey hall with loft + lower study wing through an arch, relief chart, hearth, provisions rack,
      bookcase, bed; cobbled yard; fenced flower garden. Lesson 1 (study_route) and tool provisions run on it.
      Standing gate `tools/qa_holm_v3_slice.js` PASS 13/13 with real pointer input: landing path, walled approach
      from behind forced through the door (auto-opens, roof lifts), lesson 1, loft up/walk/down, exit, creek
      refused, bridge crossed on the deck at y 3.3, reload restores position and lesson, 0 errors.
      Fixes found on the way: blocked-click fallback no longer snaps through walls; ladder hit proxies; loft
      label; restore greeting; floor picking per storey. Production: route 20/20 (361 s), smoke both phases.
- [ ] Slice review at the gameplay camera against the Bible references. **Ask the owner to look before
      continuing**, because this slice sets the visual language for every other area.
      2026-09-24 self-review vs `A_Tutorial_Island_Option.jpg`: first pass (cream plaster, terracotta roof,
      faceted trees, no paving) read as a different game; revised to grey stone blocks + slate courses (own
      canvas patterns), stone quoins, cobbled yard, round mottled canopies. Review captures:
      `scratchpad/holm_v3_review/01..06`. Known gaps for the owner: stone reads pale under the game sun; steep
      shoreline and creek banks; minimap blank on the loft; no Guide Bram yet (step 6). **Awaiting owner.**
      **Owner review 1 (2026-09-24): "Rework the look"** — too clean/plastic, buildings wrong, colours/lighting
      wrong, terrain/nature wrong; target = the real 2004 RS2 client. Also: tighten to ~2004 size; creek to the
      sea so the bridge is the only crossing. Rework, modelled on the 2004 client's scene builder (studied in the
      2004scape clone, our own code): terrain colours blended over an 11x11 tile box in HSL with light baked per
      vertex from the heightfield normal (ambient 96 + fixed low side light) and rendered unlit and smooth; black
      sky and a black edge ~25 tiles from the player; one low side light for models; own textures for field
      stone (irregular courses), slate, and dappled leaves; storey height 2.6 -> 2.2. Island reshaped to 109x81
      tiles with a coast-to-coast creek (test: guide -> kitchen unreachable without the bridge); new bridge site
      at z97-98. Bridge decks are now clickable (clicks used to fall through to the creek bed). Slice gate 13/13.
      Known: beach sand blends into grass (2004 blending); mine -> keep is 126 steps round by the bridge (step 4:
      cave passage under the creek). Owner reviews 2-5: "still off" / "close" / "still off, more detail".
      Pass 6 (review 5): per-tile palette shading, irregular coast, jettied timber upper storey on posts, an
      original statue on the plaza, rebuilt pines/oaks/rowboat/ferns. Owner review 6: "still off" — tiles read 8-bit,
      trees too round, roof rigid, house "two squares put together"; everything must be Blender-made. Then the
      rebase decision above: this track is shelved.

### M4 plan on the Sept 13 base (2026-09-24, after owner approval of M3R)
Finding (read-only survey): the arrival draft walks a hand-built 165-node graph around the dock and guide house
only; the Sept 13 keep (909 stances), bakehouse (281) and lodge (494, incl. terrain patch) carry Blender-measured
stance graphs with their own terrain patches; nothing composes them, and the old live island binds its lessons to
old coordinates on the grid pathfinder. Bundles, in order:
- [x] **M4.1 Island navigation composer + island provider** (`?holmIsland=1`, isolated qaProfile): one graph over
      every dry tile of the 144x128 Sept 13 terrain, with the arrival house graph and the Blender building graphs
      joined in at their terrain seams, tree/statue footprints refused, water refused; the arrival follower drives
      it. Proof: headless composer tests + real-pointer walk from the dock across the island.
      2026-09-24: `src/holm_island_nav.js` (11,653 nodes: 9,845 land + keep 909 + bakehouse 274 + lodge 462 +
      arrival 163), `src/holm_island_extras.js` (Blender keep/bakehouse/lodge bound to their graphs by model hash,
      tree-family-v3 habitat, bridges), island mode in `HolmArrivalQA` with its own checkpoint format. New Blender
      crossings `build_holm_island_bridges_v1.py` (timber teaching bridge, arched stone village bridge) on deck
      tiles measured from the water mask (`island-bridges.json`). Fixed: Blender patches let you wade the creek
      bed; corner-planted trunks blocked nothing; arrival checkpoints could not save island stances.
      `test_holm_island_nav.js` 10/10; `qa_holm_island.js` PASS 8/8 real pointer (dock over the timber deck to the
      bakehouse courtyard, lodge approach, keep gate, cardinal throughout, reload restores, 0 errors).
      Open owner question: the Sept 13 creek rises inland, so its head can be walked round (bridge saves 80 steps).
- [x] **M4.2 Keep, bakehouse, Quest Lodge in the island provider** with their doors and services (bread, quest
      board) on graph stances. 2026-09-24: authored service meshes (plus invisible hit boxes for small ones) walk
      the player to the measured stance, then call the existing lesson handlers (HolmTeachingKitchen,
      HolmQuestLodge accept the island draft); each building's Sept 13 cutaway (roof off, upper hidden, shell
      clipped) applies while inside; the lodge door is held at the open pose its graph was measured in (interlock
      later with M6 tutors). Fixed: a Continue during background boot could not restore an island save.
      `qa_holm_island.js` PASS 14/14 real pointer: full bread lesson in the Blender bakehouse (rack, flour, water,
      dough, knead, bake, optional lesson credited), quest board inside the lodge (learn_quests credited), keep
      gate, reload restores, 0 errors.
- [ ] **M4.3 Approved-look pass on those three in Blender** (jetties/half-hips/timber detail where it fits, gray
      masonry kept), graphs re-extracted.
- [x] **M4.4 New Blender buildings**: survival pond camp, quarry gate + cavern entrance, bank + service court, mage
      house + tower, departure haven; each with a measured graph. 2026-09-24: five Blender candidates
      (holm-{survival,quarry,bank,mage,haven}-v1, reports beside each), stances measured by the general extractor,
      hash-bound and composed into the island graph; bank counter/vault open the real bank, other stations chat
      until M5. `qa_holm_island.js` PASS 19/19 real pointer, full route 20/20, arrival v4 12/12, smoke PASS.
      Gaps for owner review: no pond in the Sept 13 terrain (fishing stage sits at the creek), haven pier faces
      east, quarry rock is a boulder heap.
- [ ] **M4.4b Lastlight keeper wing** (needs ladder/climb edges in the extractor and HolmIslandNav).
- [ ] **M4.5 Crossings, paths, habitat and signage** over the whole island; no barren stretches.
- [ ] **M4.6 Whole-island performance** (draw calls, streaming, boot).

### M4 — The rest of the island (original items)
- [ ] Place the bakehouse, quest lodge and keep candidates on the compiled terrain with services bound to their
      new coordinates (bread and quest board rebinding from the curriculum audit).
- [ ] Build the connected redesigns not yet started: bank, mine entrance with the cavern, mage tower, and the
      Lastlight keeper wing. Use the same Blender → nav extract → Studio → Safe Publish path as the keep and lodge.
- [ ] Complete the habitat, vegetation, roads and signage across the whole island, with no barren prototype
      stretches left.
- [ ] Measure and fix performance for the whole island (draw calls, streaming hitches, boot time).

### M5 — All 18 lessons
- [ ] Activate the 18-lesson migration helper in runtime; old 13-lesson saves keep their credit.
- [ ] Restore `bake_bread` and `learn_quests` as required lessons on the new buildings.
- [ ] Restore `melee_trial`, `ranged_trial`, `magic_trial` with atomic kits, styled-kill attribution, ammo and
      rune recovery, and aligned lesson copy (spell XP is granted on hit or miss).

### M6 — People
- [ ] Chunk-owned NPC lifecycle. Prove it first with one non-attackable tutor (Bram) at an authored socket:
      load/unload, failure, dialogue persistence.
- [ ] Full tutor cast (chef, quest guide, combat instructor, mage, banker, Lastlight keeper), modeled and animated.
- [ ] Practice enemies for the three trials: spawn, collision, respawn, retry.
- [ ] Editable Blender source for the canonical player (reference `male_b_turnaround.png`), preserving creator
      choices and saved appearances. Complete the worn-gear family (fix `leather_body` using the plate model).

### M7 — Cutover and proof
- [ ] Switch production to `tutors-holm-v3`, with save migration for positions, planes, items and lesson credit.
      Verify fresh characters, returning Holm saves, graduated saves, full inventory and interruptions.
- [ ] Rewrite `qa_holm_full_route.js` for the new island and 18 lessons, including bank, recovery, save/reload
      and negative cases.
- [ ] Human-pace real-input playthrough in the in-app browser, timed at 20–30 minutes, including NPCs and trials.
- [ ] Foreground smoke and performance gates are green. Bank sources, comparison sheets, PASS_LOG, GUIDING_LIGHT.
- [ ] **Owner acceptance recorded.** Only after this does the goal close.

## Loop rules

- Work one bounded bundle per tick and never leave half-wired runtime in the tree.
- Production boot stays on the old island until M7. All new-island work runs behind the preview provider.
- Verify in the in-app browser. Headless data alone never proves a step.
- Keep combat math, the XP curve, four-direction tile movement and player saves intact (CLAUDE.md).
- Read `GUIDING_LIGHT.md` at the start of every session. Author assets in Blender + the Studio, not the game.
- Record each tick in the root `PASS_LOG.md` (the project log) with a proof link, and tick the item here.
- Stop and write it under Blockers when a tick cannot make progress. Do not keep retrying the same failure.

## Owner decisions needed

1. Checkpoint commit of the uncommitted work (M0). Recommended yes.
2. Whether the M3 slice needs the owner's eyes before M4 starts. Recommended yes.
3. Draw-call target: the original 120 calls, or accept about 350 elevated / 170 play at a steady 60 FPS.

## Blockers

(none)
