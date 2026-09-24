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

### M2 — Terrain engine that allows the new island (enabling work, from the workspace handoff)
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

### M3 — First live slice: arrival → guide house
- [ ] Arrival cove, creek crossing, guide house exterior, furnished interior and upper floor running in the
      `tutors-holm-v3` preview, with real-pointer walking both ways.
- [ ] Slice review at the gameplay camera against the Bible references. **Ask the owner to look before
      continuing**, because this slice sets the visual language for every other area.

### M4 — The rest of the island
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
- Record each tick in `Bible_References/PASS_LOG.md` with a proof link, and tick the item here.
- Stop and write it under Blockers when a tick cannot make progress. Do not keep retrying the same failure.

## Owner decisions needed

1. Checkpoint commit of the uncommitted work (M0). Recommended yes.
2. Whether the M3 slice needs the owner's eyes before M4 starts. Recommended yes.
3. Draw-call target: the original 120 calls, or accept about 350 elevated / 170 play at a steady 60 FPS.

## Blockers

(none)
