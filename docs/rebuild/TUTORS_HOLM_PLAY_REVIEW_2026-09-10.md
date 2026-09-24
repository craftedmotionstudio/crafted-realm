# Gameplay QA Report — Tutor's Holm human-pace playthrough review (Phase 2, P2-A)

## 1. Test identity

- Feature/slice: the whole Holm route played at human pace in the visible browser pane with real pointer input only
  (ground clicks to walk, object clicks, pack clicks); no minimap walk orders, no scripted helpers for play actions
- QA level: Full (live, eyes-on)
- Candidate build/revision: `main` at 7597a20 plus the Phase 2 working tree
- Date and timezone: 2026-09-10, local
- Main integrator: Claude (Fable 5.1) working the completion goal loop
- Browser and version: Claude desktop Browser pane (Chromium), pane 580x893
- URL/query parameters: `http://127.0.0.1:8777/?qaProfile=fable-play-review-1`
- Evidence root: this document (timings, friction log); screenshots described inline

## 2. Scope and risk

### In scope

- Every required lesson and both optional NPC-free lessons, timed per leg, with a friction entry for every stuck
  moment, unclear hint, wrong camera, dead click, walk-nowhere or repeated message.

### Out of scope

- NPC-gated trials (owner-deferred). Art scoring (P2-D uses this log as input).

### Risk surfaces

- Gameplay: hint clarity at the net/dough/climb-down steps; lesson gates.
- Navigation/collision: long legs, doors, planes, camera against terrain.
- Visual/animation/audio: readability of the station object from the default camera.
- Inventory/economy/XP: kit grants on step change.
- Performance/startup: boot time on the pane; hitches at chunk boundaries.

## 3. Profiles and assignments

| Profile ID | Tester/role | Baseline save/state | Permitted setup | Scenario IDs |
|---|---|---|---|---|
| `fable-play-review-1` | eyes-on play at human pace | fresh adventurer | none | PLAY-01..PLAY-15 |

Administrator Console/Test Travel usage: none.

Confirm that no shortcut bypassed the behavior under test: PASS (pointer and pack clicks only; an in-page step-time
recorder was attached read-only to `Tutorial.notify` for timestamps)

## 4. Acceptance contract

Starting state: fresh adventurer on the arrival apron, step 0. Target: the required route in 20–30 minutes with no
leg over 45 s of pure walking and no stuck moment.

## 6. Live golden-path run

Clock: seconds of play from the moment the character creator closed (tool latency between clicks is included, so
each leg is an upper bound on a human's time; walking time is reported from the walk speed of 4.2 tiles/s running).

| Leg | Station / lesson | Lesson fired at | Walk ≈ (s) | What happened | Friction | Result |
|---|---|---|---|---|---|---|
| 1 | Guide Hall — study_route | 50 s | 4 | front door, floor click into the hall (dead until F-05 was fixed), chart click after one rim misclick | F-04, F-05, F-06 | PASS |
| 2 | equip_hatchet | 73 s | 0 | pack click (DOM, panel off-screen) | F-01, F-07 | PASS |
| 3 | Survival Wood — chop_logs | 315 s | 12 | north door hidden behind the dais; two camera drags; a wrong-way walk; minimap leg; tree click | F-08, F-09, F-10, F-11, F-12 | PASS |
| 4 | light_fire | 340 s | 0 | logs click; fire under the canopy | F-13, F-14 | PASS |
| 5 | catch_fish | 389 s | 7 | net then edge click; silent 25 s walk round the pond | F-15 | PASS |
| 6 | cook_fish | 452 s | 0 | first fire already ashes; second fire lit on the dock; cook | F-16 | PASS |
| 7 | Mine Gatehouse — descend_cavern | 544 s | 8 | gate frame click walked but did not open; leaf click; right-click menu, Climb-down | F-17, F-18, F-19, F-20 | PASS |
| 8 | mine_copper | 600 s | 3 | rock click | F-21 | PASS |
| 9 | mine_tin | 661 s | 5 | "north" offshoot is south-east; floor undrawn | F-22, F-23 | PASS |
| 10 | smelt_bronze | 708 s | 3 | furnace dialogue opens before the walk; smelts every pair | F-24 | PASS |
| 11 | forge_dagger | 764 s | 1 | first anvil click missed (small target); grid; three daggers | F-24 | PASS |
| 12 | cavern exit → Holm Bank — open_bank | 974 s | 12 | exit ladder invisible, arrow pointed at the surface bank; HUD chip caught a walk click; surfaced hidden in the tower; minimap leg; booth click | F-25, F-26, F-27, F-28, F-29, F-30 | PASS |
| 13 | Lastlight — relight_lastlight | 1214 s | 27 | four minimap legs up the switchback, door, two ladders, lever (invisible; first click hit the HUD orbs) | F-26, F-31 | PASS |
| + | Departure — board | 1396 s | 12 | teleported out of the lantern room; walked the wrong way once (minimap follows camera yaw); boat click sailed to Veyhollow with 180 crowns and 3 bread | F-32, F-33, F-34, F-35 | PASS |

Optional lessons (bake_bread, learn_quests) were not played in this run; both pass under real input in
`tools/qa_holm_full_route.js`.

Final inventory/equipment/XP/progress: hatchet wielded; 3 bronze daggers, 4 spare ores, 2 logs, cooked perch, kit;
Woodcutting 3, Firemaking 2, Fishing 2, Cooking 2, Mining 5, Smithing 2; curriculum complete; arrived Veyhollow Commons.

Golden-path verdict: PASS with friction — 23.3 min including the boat (target 20–30), 13/13 lessons, zero page errors.

## 7. Friction log

| ID | Where | What a player sees | Severity | Proposed fix (Phase 2 item) |
|---|---|---|---|---|
| F-01 | any window narrower than ~1100 px | the whole right-hand panel (pack, tabs, minimap controls) sits off-screen; a 580-px pane shows no inventory at all | high | responsive layout: dock the panel below the canvas or scale it under 1100 px (P2-B guidance/readability) |
| F-02 | login, "Adventure ready" card for a brand-new adventurer | shows "1,154 Total XP" and "5 crowns" before the character has done anything | low | show 0 XP (or hide the row) for a fresh save |
| F-03 | login, same card | the text says "wash ashore on Tutor's Holm" but the button reads "ENTER VEYHOLLOW" | medium | button label follows the destination ("Wash ashore on Tutor's Holm") |
| F-04 | first boot | the tutorial objective banner and world arrow are painted over the "Design your adventurer" panel before the player has accepted a look; the camera is zoomed into the wall behind the name label | medium | hold the banner/arrow until the creator closes; use the creator's own framing |
| F-05 | every outdoor click on the island | **click-to-walk did nothing anywhere on the Holm surface** (only doors and objects reacted; the cavern floor worked). Cause: the picker only accepted a mesh named `ground`, while streamed terrain chunks are named `ground-chunk-<id>`. | critical | FIXED this tick in `src/game4_ui.js` (`isGroundName`), locked in `tools/test_world_v2.js`; re-verified below |
| F-06 | Guide Hall, relief chart | a click on the chart's table rim or the carpet ring reads as "Walk here"; only the small relief model itself offers Study | medium | give the whole table (top + rim) the chart's click target |
| F-07 | Guide Hall, after wielding the hatchet | the objective banner still read the previous objective for a moment after the step changed | low | refresh the banner in the same tick as the step change |
| F-08 | Guide Hall, chop objective | the world arrow points west through the hall wall toward the wood while the only exit that way is the north teaching door | medium | arrow should route via the exit door (or the door gets its own arrow while the player is indoors) |
| F-09 | Guide Hall, teaching (north) door | from the north-up camera the north door is hidden behind the lesson-register dais and board; the click still lands through the visuals but a player cannot see the door | high | move the register dais off the door axis or shorten the board; keep the exit door visibly clear FIXED 2026-09-10: `src/holm_guidance.js` bends the beacon to the building's exit door ("Leave by the Teaching door") whenever the objective lies outside the room, with the label lifted above the dais |
| F-10 | Guide Hall, walking out | a ground click just past the north wall was resolved to a target on the far side and the walker set off the long way round through the south door before correcting | medium | prefer the nearest reachable tile to the clicked point when the click lands on architecture |
| F-11 | Guide Hall -> Survival Wood leg | ~40-tile run drained energy 100% -> 60%; later legs will fall to walking speed (2.4 tiles/s) | medium | pacing audit: raise starting energy/regen on the Holm or shorten legs |
| F-12 | Survival Wood | the three marked trees look identical to the scenery oak beside them; the "Chop tree" arrow label sits on the road sign, not on a tree | medium | give marked trees a ribbon/blaze mark and put the arrow target on the nearest marked tree |
| F-13 | Survival Wood, fire objective | the "Light a fire" arrow target sits at the pond edge next to the dock rather than on a hearth or a clear patch | low | move the light_fire target beside the marked trees |
| F-14 | Survival Wood, after lighting | the campfire is lit under the marked tree's canopy and cannot be seen from the default camera | low | keep the marked trees a tile apart from the light_fire target, or lift the canopy |
| F-15 | fishing edge clicked from the trees with the net armed | the net icon un-highlights at once and nothing is said while the character walks ~25 s around the pond to the dock; it reads as a failed click until the catch lands | medium | keep the net highlighted until the cast starts, and print "You head to the fishing spot." FIXED 2026-09-10: the fishing edge prints "You head for the fishing spot, net in hand." when the net is used from afar |
| F-16 | cook objective | the first campfire (65 s lifetime) had burnt to ashes before the player was back from fishing; the "Cook the fish" arrow still pointed at a fixed pond-edge spot with no fire there; a second fire had to be lit on the dock planks | high | lengthen the teaching fire's life (or make the teaching hearth the cook target and point the arrow at the live fire) FIXED 2026-09-10: Holm teaching fires burn 150 s; the cook beacon follows the live player fire ("Cook on your fire") or reads "Light another fire here" |
| F-17 | Mine Gatehouse south gate (and other doors) | a click on the door frame or step walks the player to the door without opening it; only the leaf itself opens it, so a second click is usually needed | medium | widen door click targets to the whole opening (frame + leaf), as the bank booths did with hit proxies FIXED 2026-09-10: closed doors are no longer baked as walls (walk-order pass), so a frame/step click walks to the door and the walker opens it on approach; gatehouse QA asserts the gate stands open behind the player |
| F-18 | Mine Gatehouse winch frame, right-click menu | rows read "Study shaft_frame" / "Climb-down shaft_frame": the raw part id leaks instead of the authored name "Winch frame" | medium | Interact entries must use the row's display label, not the part id, when `userData.name` is absent FIXED 2026-09-10: `Interact` rows take the name from the authored label's bold segment ("Study Winch frame") |
| F-19 | any right-click menu | a developer/QoL "Mark Tile" row sits between the real options for a brand-new player | low | hide Mark Tile outside Build/QoL modes or move it below Walk here FIXED 2026-09-10: the Mark Tile row is hidden while the tutorial is incomplete |
| F-20 | Mine Gatehouse, descend lesson | the required action is a secondary menu row; the left-click primary is "Study", so the objective text ("climb down the shaft") does not match what a left click does | high | make Climb-down the primary option while descend_cavern is the current lesson (or always on the shaft) FIXED 2026-09-10: Climb-down is the primary row (left click and hover) while descend_cavern is current; Study returns to primary afterwards |
| F-21 | Training Cavern | the minimap is a blank dark disc underground; no cavern map, no rock/furnace markers | medium | draw the cavern floor and station markers on the minimap for plane -1 |
| F-22 | Training Cavern, tin objective | the text says "Follow the north offshoot" while the compass and arrow send the player south-east (the offshoot sits at larger z) | medium | fix the objective wording to match the compass, or rotate the cavern layout FIXED 2026-09-10: "Follow the offshoot south-east and mine a tin rock." (gatehouse dialogue and the pickaxe grant say the same) |
| F-23 | Training Cavern, tin offshoot | past the ledge the offshoot floor is not drawn at all: the tin rock and the player stand over solid black, and the "Mine tin" label floats at the ledge rather than on the rock | high | author the offshoot floor/walls in the cavern GLB (P2-D landscape/route dressing) and put the arrow target on the rock |
| F-24 | Training Cavern, furnace and anvil | one click smelts every ore pair and one dagger click forges every bar (three daggers); the lesson asks for one | low | tutorial-phase smelt/smith should make one, or the grid should ask how many |
| F-25 | Training Cavern, after the dagger | the objective says "Emerge on Warden's Ridge" without naming the exit ladder, and the world arrow points west at the surface bank's coordinates rather than at the ladder 20 tiles east | high | while underground, target the exit ladder and say "Climb the far ladder up to the Combat Hall" FIXED 2026-09-10: the bank lesson reads "Climb the far ladder up into the Combat Hall, cross Warden's Ridge..." and the beacon targets the exit ladder while underground |
| F-26 | HUD, narrow viewport | the overlay-settings chip and the stat chips float over the world; a walk click near the top-right opened the Overlays panel instead of walking | medium | keep HUD chips in a gutter that does not overlap the walkable view, or give the canvas precedence outside the chip glyphs |
| F-27 | Training Cavern, walking east to the exit | the character disappears behind the large boulders from the default camera; only the name label shows | medium | camera–geometry occlusion fade for cavern rocks, or lower the boulders along the route |
| F-28 | Training Cavern exit | the exit ladder has no visible model at all: the climb is an invisible proxy at (322,354) and the only ladder-looking mesh nearby sits 50 tiles away; a player has nothing to click on | high | author a visible exit ladder (and a light) at the proxy; put the arrow on it while underground |
| F-36 | Mage Tower, camera facing north | with the boom pointed at the headland the camera came to rest inside the Lastlight lighthouse's masonry | high | FIXED 2026-09-10: `WORLD.cameraBlockers` (Lastlight registers a cylinder) shortens the boom like terrain |
| F-29 | Combat Hall drill tower, after surfacing | the camera arrives looking at the tower's east wall; the character is hidden inside the 6-tile tower walls and only the name label shows | medium | on plane change, reset the camera to look down into the room (or lower the tower's partition, P2-B readability) |
| F-30 | Holm Bank, teller booth | the interface is titled "The Bank of Veyhollow" inside the Holm Bank; the pack view also shows the three surplus daggers and four surplus ores from F-24 | low | title the interface after the building the player is in |
| F-31 | Lastlight lantern room | the bronze lever has no visible model: the click target is an invisible proxy beside the lantern, and the "Relight Lastlight" arrow label sits at the far rail, not at the lever | high | author a visible lever at the proxy (this is the graduation action) and target the arrow at it |
| F-32 | Lastlight, after the lever | the moment the beacon lights, the player is moved from the lantern room (plane 3) to the exterior summit ring (plane 0) with no transition or message; the camera lands on the lighthouse's outside wall | medium | keep the player in the lantern room and let them climb down, or fade/announce the descent |
| F-34 | after the lever | the zone label still reads "Lastlight Lantern Room" on the summit ring and down the switchback until the next zone change | low | refresh the zone label on plane change |
| F-35 | after completion | the objective banner disappears entirely; the only remaining hint to board the boat is inside the dismissed writ | low | keep a final "Board the skiff at Departure Dock" banner until the crossing FIXED 2026-09-10: the objective banner keeps "Board the skiff at Departure Dock." with a dock beacon until the crossing; both clear when the skiff sails |
| F-33 | Holm passage writ | "Follow the eastern path over Tidebridge to the Mage Headland" is read while standing on the Mage Headland's own lighthouse; the direction is stale for the current geography | low | rewrite the writ: "Take the switchback down and follow the road south to Departure Dock" FIXED 2026-09-10: the writ now reads "Take the switchback down from Lastlight and follow the road south to Departure Dock, where the skiff waits." |
## 8. Notes

- Bot-speed baseline for comparison: `tools/qa_holm_full_route.js` completes the same route in 578 s.

## 9a. Fix log

- 2026-09-10: guidance clarity — `src/ui_guide_arrow.js` gained per-frame redirect hooks (`addRedirect`), a
  `labelLift` for door labels and a `keepAfterComplete` flag; `src/holm_guidance.js` registers the Holm rules:
  underground with a surface objective -> the cavern exit ladder (F-25); inside a building whose objective lies
  outside -> that building's best exit door, the authored flow exit door getting a five-tile preference (F-09);
  `cook_fish` -> the nearest live player fire or "Light another fire here" (F-16, Holm fires burn 150 s).
  Verified in the pane: "Leave by the Teaching door" at (151,141.7) floating above the register board; the
  underground beacon at the ladder (322.5,354.5); the cook beacon on a fresh fire and the fallback with none.
  Wording: south-east offshoot (F-22), far-ladder bank lesson, switchback writ (F-33), "Board the skiff" banner
  kept until the crossing (F-35). Menus: rows named from the authored label (F-18), `primary` predicates make
  Climb-down the winch frame's left click during descend_cavern (F-20), Mark Tile hidden for tutorial players
  (F-19), the net-use walk announces itself (F-15). Gates: five locks; smoke PASS 104/104 at 60 FPS, 21 ms worst;
  gatehouse QA PASS 12/12; full route driver PASS 20/20 in 424 s. The gatehouse QA's "closed gate blocks the road" check was rewritten to the door-auto-open rule,
  which also closes F-17.
- 2026-09-10: interior readability — visible cavern exit ladder (F-28), visible Lastlight lever (F-31), Combat
  Hall tower band into the roof group (F-29).
- 2026-09-10: walk-order feedback — blocked tiles snap to the nearest walkable tile, the water refusal is
  deduped, and a plan that falls short announces itself once (F-10 and the "You cannot walk there." spam).
- 2026-09-10: camera–terrain clamp (`cameraTerrainClamp`, clearance 1.1) plus Lastlight camera blocker; the
  "camera inside the headland" cases from the baseline (Combat Hall tower, Mage Tower facing the hill) verified
  clear in the pane. F-05 click-to-walk fixed earlier the same day.

## 9. Route pacing audit (P2-A, `tools/audit_holm_route_pacing.js`)

Bot-pace walking between the authored station tiles, staged inside the chunk residency radius. "Before" is the
tree as played above; "after" is with the Holm run-energy pacing change (`src/game3_systems.js`: quarter drain,
triple regeneration while the Holm provider is active; mainland untouched).

| Leg | Tiles | Before (s) | Energy after leg | After (s) | Energy after leg |
|---|---:|---:|---:|---:|---:|
| L1 arrival apron -> relief chart tile | 13 | 3.3 | 96% | 3.3 | 99% |
| L2 chart -> marked tree (via teaching door) | 83 | 19.3 | 69% | 19.3 | 92% |
| L3 tree -> fishing dock | 50 | 11.7 | 53% | 11.7 | 88% |
| L4 dock -> gatehouse winch tile | 47 | 10.2 | 39% | 10.3 | 85% |
| L5 cavern entry -> copper rock | 10 | 2.3 | 36% | 2.3 | 85% |
| L6 copper -> tin (offshoot) | 31 | 6.9 | 26% | 6.9 | 83% |
| L7 tin -> furnace | 23 | 5.3 | 19% | 5.3 | 81% |
| L8 furnace -> anvil -> exit ladder | 32 | 7.2 | 9% | 7.2 | 79% |
| L9 hall tower -> bank booth tile | 43 | 10.4 | 2% | 9.3 | 84% |
| L10 bank -> Lastlight door step (switchback) | 121 | 48.9 | 46% | 27.9 | 74% |
| L11 summit -> Departure Dock (via tower road) | 90 | 34.7 | 77% | 19.7 | 67% |
| O1 dock road -> Teaching Kitchen door (optional) | 242 | 99.3 | 100% | 56.7 | 47% |
| O2 kitchen -> Quest Lodge board tile (optional) | 19 | 6.7 | 100% | 3.8 | 46% |

- Required route: 543 tiles. Walking time 160 s → 123 s. Before the change the energy bar was empty by the bank
  (2%) and the 121-tile bank → Lastlight leg took 48.9 s at walking speed; after it, no leg exceeds 45 s (longest
  27.9 s) and the bar never drops below 67%.
- Back-tracking: the route passes the Combat Hall twice (surfacing there, then returning east from the bank toward
  the switchback). The optional kitchen and lodge are a 242-tile detour from the dock but sit on the natural
  Wood → Gatehouse leg (pond loop), so the arrow order should offer them there (P2-B guidance).
- Longest legs by tiles: L10 bank → Lastlight (121), L11 summit → dock (90), L2 chart → tree (83). None needs a
  geometry change to meet the 45 s rule; L10 and L11 are candidates for the P2-D switchback/road dressing so the
  walk reads as a place rather than a corridor.

## 10. Sign-off

- Result: PASS with 35 friction entries (1 critical fixed in-run, 6 high, 17 medium, 11 low). Play time 23.3 min.
- Severity order for P2-B/P2-D: F-05 (fixed), F-28/F-31 (invisible ladder and lever), F-16 (fire burns out),
  F-20 (descend is not the primary click), F-09 (exit door hidden), F-25 (cavern arrow), F-23 (undrawn floor),
  F-01/F-26 (HUD layout), F-15/F-17 (feedback and click targets), then the wording and label items.
- Human alpha remains required; this is the automated-eyes baseline with real pointer input.

## 11. Performance baseline (P2-C, 2026-09-10)

Measured with `src/perf_probe.js` (read-only telemetry) through `tools/audit_holm_perf.js` (headless Chrome,
1538x900, fresh profile) at every station entry tile, camera at play distance (33) and at the elevated maximum
(70), pitch 1.08. Shadows are off in world-v2 mode, so draw calls equal visible meshes. Budget from the goal:
**<= 120 draw calls and <= 30 ms worst frame at the elevated camera on the full island.**

| Station | Play calls | Play tris | Elevated calls | Elevated tris |
|---|---:|---:|---:|---:|
| Guide Hall | 204 | 33,116 | 371 | 54,548 |
| Survival Wood | 250 | 23,366 | 394 | 39,514 |
| Teaching Kitchen | 282 | 59,778 | 586 | 82,772 |
| Quest Lodge | 345 | 77,128 | 706 | 103,380 |
| Mine Gatehouse | 203 | 18,876 | 332 | 23,726 |
| Training Cavern | 136 | 3,402 | 246 | 5,002 |
| Combat Hall | 103 | 17,022 | 182 | 27,624 |
| Holm Bank | 320 | 37,198 | 492 | 50,930 |
| Mage Tower | 161 | 17,528 | 172 | 17,808 |
| Lastlight Beacon | 145 | 16,768 | 183 | 23,088 |
| Departure Dock | 141 | 12,082 | 253 | 25,848 |

Real-browser frame sample (Claude pane, 580x893 canvas, foreground, 3 s rAF sample per view):

| Station | View | Draw calls | Triangles | FPS | Worst frame ms |
|---|---|---:|---:|---:|---:|
| arrival | play | 112 | 29,456 | 60 | 20.3 |
| arrival | elevated | 165 | 33,058 | 61 | 19.3 |
| quest_lodge | play | 255 | 65,904 | 60 | 20.4 |
| quest_lodge | elevated | 571 | 92,824 | 60 | 20.8 |
| bank | play | 236 | 32,930 | 60 | 18.9 |
| bank | elevated | 401 | 45,748 | 61 | 21.1 |
| cavern | play | 81 | 2,715 | 60 | 18.7 |
| cavern | elevated | 146 | 3,577 | 61 | 18.7 |

Per-building inventory (visible meshes = draw calls when in view; triangles as rendered; materials as
distinct three.js materials) against each manifest budget:

| Building | Meshes | Triangles | Materials | Manifest tris / prims / materials |
|---|---:|---:|---:|---|
| holm_guide_hall | 42 | 26,544 | 16 | 36000 / 70 / 18 |
| holm_survival_workyard | 168 | 25,178 | 70 | 32000 / 110 / 40 |
| holm_mage_tower | 75 | 11,544 | 38 | 20000 / 100 / 50 |
| holm_teaching_kitchen | 75 | 10,794 | 37 | 18000 / 90 / 30 |
| holm_bank | 81 | 8,674 | 37 | 18000 / 95 / 45 |
| holm_quest_lodge | 65 | 7,842 | 34 | 18000 / 90 / 40 |
| holm_mine_gatehouse | 62 | 7,754 | 29 | 18000 / 90 / 40 |
| holm_combat_hall | 51 | 5,976 | 25 | 18000 / 100 / 45 |

Reading:

- Frame time is healthy everywhere: 60 FPS with a worst frame of 21 ms in the real browser and under 21 ms
  headless, so the 30 ms half of the budget is met today.
- Draw calls are the miss. The elevated camera on Lesson Green sees five buildings at once (Quest Lodge station:
  706 calls headless, 571 in the pane) because every building is 50-180 separate meshes with 25-78 materials;
  the Survival Workyard alone is 178 meshes and the Guide Hall carries 26.5k triangles (the relief chart).
  Worst elevated view is 5.9x the 120-call target; even the quiet Combat Hall view is 182.
- The lever is therefore mesh count, not triangles: asset consolidation (next item) must merge each building to
  a handful of draws by sharing a family palette and merging per-material meshes, and drop hidden geometry.
  Interim smoke budget stays at 800 draw calls until the merge lands; the 120 target is the P2-C exit bar.
- Raw data: `scratchpad/holm_perf/baseline.json` and `baseline.md` (regenerate with `node tools/audit_holm_perf.js`).

### 11a. After asset consolidation (2026-09-10)

`src/world_v2_consolidate.js` merges each loaded template once: meshes group under their nearest semantic part
(door, roof, station, static shell) and, within a group, everything sharing a surface bucket (material type,
roughness and metalness to 0.5, transparency, side, texture) becomes one vertex-coloured mesh on a shared bucket
material. Parts keep their node, transform and userData, so picking, doors and the roof cutaway are untouched;
animation targets (read from the family clips), hit proxies, emissive flames, glass and skinned meshes stay.
Props without parts (trees, rocks, fences, decks) collapse to one mesh. `?consolidate=0` disables it for A/B.

| Station | Play calls before -> after | Elevated calls before -> after |
|---|---:|---:|
| Guide Hall | 204 -> 133 | 371 -> 202 |
| Survival Wood | 250 -> 158 | 394 -> 225 |
| Teaching Kitchen | 282 -> 139 | 586 -> 283 |
| Quest Lodge | 345 -> 167 | 706 -> 347 |
| Mine Gatehouse | 203 -> 119 | 332 -> 209 |
| Training Cavern | 136 -> 136 | 246 -> 246 |
| Combat Hall | 103 -> 67 | 182 -> 102 |
| Holm Bank | 320 -> 153 | 492 -> 224 |
| Mage Tower | 161 -> 97 | 172 -> 101 |
| Lastlight Beacon | 145 -> 94 | 183 -> 111 |
| Departure Dock | 141 -> 76 | 253 -> 134 |

| Building | Meshes before -> after | Materials before -> after |
|---|---:|---:|
| holm_guide_hall | 51 -> 15 | 25 -> 4 |
| holm_survival_workyard | 178 -> 66 | 78 -> 14 |
| holm_teaching_kitchen | 75 -> 22 | 37 -> 7 |
| holm_quest_lodge | 65 -> 16 | 34 -> 6 |
| holm_mine_gatehouse | 62 -> 24 | 29 -> 7 |
| holm_bank | 81 -> 26 | 37 -> 8 |
| holm_combat_hall | 58 -> 17 | 32 -> 4 |
| holm_mage_tower | 75 -> 25 | 38 -> 7 |

Result: worst elevated view 706 -> 347 draw calls (-51%), worst play view 345 -> 167; shared bucket materials 6;
triangles unchanged (the merge does not drop geometry); every GLB and manifest budget untouched because the merge
is a load-time pass, so the Blender pipeline is unaffected. Frame time stays 60 FPS / ~19 ms worst.

What is left at the worst view (Quest Lodge, elevated): Survival Workyard 69 (its dock, pulley and fishing families
keep per-part meshes and the animated nodes), atmosphere FX 56 (per-object drifting clouds, leaves and petals),
terrain 48 (one draw per resident 8x8 chunk), the player 27, then the buildings at 14-26 each. The 120-call bar
therefore needs three further levers that change more than assets: instancing the atmosphere FX, merging terrain
chunks into 2x2 tiles at rest, and giving station parts invisible pick proxies so their geometry can join the shell.
Those are logged as an open owner decision in the goal doc rather than forced here.

## 12. Streaming and load (P2-C, 2026-09-10)

`tools/audit_holm_streaming.js` boots on a cold cache, then walks every required leg with an rAF gap recorder
that stamps each slow frame with the player tile and whether a chunk boundary changed within 250 ms.

What the first run found (before any change): the two largest hitches on the island were not chunk loads
but shader compiles. three.js keys every program on the number of visible lights; a chunk that streams in a
point light (the kitchen range flame) or a plane group that shows its own lights changes that count, and every
material in view recompiles once per new count: 104 ms and 156 ms in the real browser (510/585 ms headless),
with the program count climbing 12 -> 37 over the first two legs. Ordinary boundary crossings cost 25-35 ms of
residency work plus the frame, peaking at 70 ms once.

Fixes:

- `src/world_v2_warmup.js` (boot step "Warming the renderer"): one clone of every building/prop template joins
  the scene and the renderer compiles their programs at the base light count; the light-count passes
  (+1..+3 point lights, the cavern, the cellar torches, the lighthouse lantern) run one per idle macrotask on
  the welcome screen and stop the moment play starts. Real browser: 85 programs ready before Play, none
  compiled during the walk.
- `src/world_v2_contract.js`: chunk loads are budgeted at one per frame, nearest first; unloads stay immediate
  and forced calls (spawn, travel, save/load) stay synchronous. The walker drains the queue every frame, so the
  window is complete within seven frames of a crossing and nothing is missing at rest (pending 0 at every leg end).

| Leg | Boundary crossings | Residency max ms | Worst frame gap ms | Gaps > 60 ms |
|---|---:|---:|---:|---:|
| L1 arrival apron -> relief chart tile | 3 | 117.8 | 39.3 | 0 |
| L2 chart -> marked tree (via teaching door) | 11 | 5.1 | 69.4 | 1 |
| L3 tree -> fishing dock | 7 | 4.6 | 44.0 | 0 |
| L4 dock -> gatehouse winch tile | 8 | 14.5 | 56.5 | 0 |
| L5-L8 cavern copper -> tin -> furnace -> exit | 11 | 5.3 | 29.4 | 0 |
| L9 hall tower -> bank booth tile | 7 | 6.3 | 48.0 | 0 |
| L10 bank -> Lastlight door step (switchback) | 16 | 15.9 | 53.8 | 0 |
| L11 summit -> Departure Dock (via tower road) | 8 | 3.9 | 47.0 | 0 |

Headless result: 71 boundary crossings, worst frame gap 69.4 ms, no chunk-boundary gap over 60 ms; the one 69 ms gap sits on the
Guide Hall door (interior transition, not a chunk). Real browser (pane) after the change: worst 40 / 37.5 / 50.7 ms on L1 / L2 / L4 with no shader growth. Cold-cache
boot (headless, software GL): welcome screen at 3585 ms, 231 resources / 32.5 MB, 37 GLB files / 12.8 MB (bar 5 s);
real browser warm boot 1.24 s with the shader step at 0.4-0.65 s.

Boot bytes (cold, headless): PNG 51 files / 17.7 MB, GLB 37 / 12.8 MB, JS 140 / 1.9 MB. The PNGs are the legacy
mainland textures (market_cloth.png and thatch_roof.png at 1.9 MB each) fetched at boot even though the Holm build
does not draw them; lazy-loading them behind the provider is the next boot-size lever (logged, not done here).

Lesson: light count is a shader key. A chunk that carries a point light should not change the visible light
count on its own; a fixed pool of surface light slots assigned to the nearest flames would remove the last
reason for mid-walk compiles and is the follow-up if the deferred passes ever prove insufficient.
