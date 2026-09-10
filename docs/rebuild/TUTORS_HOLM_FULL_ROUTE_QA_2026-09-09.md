# Gameplay QA Report — Tutor's Holm full curriculum route (real pointer input)

## 1. Test identity

- Feature/slice: the complete thirteen-step required Holm curriculum, both optional NPC-free lessons, and the departure boat, driven end to end in one fresh profile
- QA level: Full (headless Chrome, real game, real mouse/DOM input through the game's own handlers)
- Candidate build/revision: working tree of `codex/u5-accepted-checkpoint` on 2026-09-09 (uncommitted; owner commits)
- Final accepted build/revision: same tree after the route fixes recorded in §9
- Date and timezone: 2026-09-09, local
- Main integrator: Claude (Fable 5.1) working the completion goal loop
- Browser and version: system Chrome (headless new) via puppeteer-core, viewport 1538x900
- URL/query parameters: `http://127.0.0.1:8777/?qaProfile=fable-route-qa-mtujy4ca`
- Evidence root: `scratchpad/holm_full_route/` (per-step screenshots, `qa_result.json`, run logs)

## 2. Scope and risk

### In scope

- Every required lesson: study_route, equip_hatchet, chop_logs, light_fire, catch_fish, cook_fish, descend_cavern, mine_copper, mine_tin, smelt_bronze, forge_dagger, open_bank, relight_lastlight.
- Optional NPC-free lessons: bake_bread (Teaching Kitchen), learn_quests (Quest Lodge).
- Departure: the one-way cavern exit into the Combat Hall, the lighthouse door, ladders and lever, and the skiff to the mainland.

### Out of scope

- The three NPC-deferred trials (melee, ranged, magic) — practice enemies are owner-deferred; their sockets are authored.
- Visual art acceptance (every new building is a functional graybox under the owner's §2.1 gate).

### Risk surfaces

- Gameplay: lesson gates fire from real engine events (gather, firemake, cook, descend, smelt, smith, bank, beacon).
- Navigation/collision: long walks along the guided spine, door auto-open, planes (cavern −1, lighthouse 1–3).
- Visual/animation/audio: not scored here beyond "the object was on screen and its game pick hit it".
- Inventory/economy/XP: kit grants per step, bar/ore consumption, departure pack.
- Save/migration: not exercised in this run (per-building QAs cover reload persistence).
- Performance/startup: headless smoke gate run separately (see §5).

## 3. Profiles and assignments

| Profile ID | Tester/role | Baseline save/state | Permitted setup | Scenario IDs |
|---|---|---|---|---|
| `fable-route-qa-mtujy4ca` | automated driver | fresh adventurer, step 0 | none (real login flow) | G-01..G-20 |

Administrator Console/Test Travel usage:

- None. Travel between stations used the minimap walk order only; every lesson trigger was a real click.

Confirm that no shortcut bypassed the behavior under test: PASS

## 4. Acceptance contract

### Starting state

- Fresh profile on the arrival apron (151,169), tutorial step 0 (study_route), empty pack beyond starting coins.

### Golden-path actions and observable results

| Step | Player action | Expected state/UI/feedback | Evidence | Result |
|---:|---|---|---|---|
| 1 | click the relief chart | chart dialogue, step → equip_hatchet, survival kit granted | 01_study_route.png | PASS |
| 2 | click the hatchet in the pack | wielded, step → chop_logs | 02_equip_hatchet.png | PASS |
| 3 | click a marked tree | logs gathered, step → light_fire | 03_chop_logs.png | PASS |
| 4 | click the logs | campfire lit, step → catch_fish | 04_light_fire.png | PASS |
| 5 | click the net, then the fishing edge | mirrorperch caught, step → cook_fish | 05_catch_fish.png | PASS |
| 6 | click the campfire | perch roasted, step → descend_cavern | 06_cook_fish.png | PASS |
| 7 | right-click the winch frame, Climb-down | plane −1, step → mine_copper, pickaxe granted | 07_descend_cavern.png | PASS |
| 8 | click the copper rock | copper ore, step → mine_tin | 08_mine_copper.png | PASS |
| 9 | click the tin rock | tin ore, step → smelt_bronze | 09_mine_tin.png | PASS |
| 10 | click the furnace, choose Bronze bar | bar smelted, step → forge_dagger, hammer granted | 10_smelt_bronze.png | PASS |
| 11 | click the anvil, choose Bronze dagger | dagger forged, step → open_bank | 11_forge_dagger.png | PASS |
| 12 | click the cavern exit ladder; click a teller booth | surfaces in the Combat Hall tower; bank opens, step → relight_lastlight | 11b_surface.png, 12_open_bank.png | PASS |
| 13 | door, two ladders, lever | beacon lit, curriculum complete, passage writ | 15_relight_lastlight.png | PASS |
| + | kitchen chain; quest board | bake_bread and learn_quests recorded | 13_bake_bread.png, 14_learn_quests.png | PASS |
| + | click the skiff | sails to Veyhollow with the departure pack | 17_mainland.png | PASS |

### Invalid-action expectations

| Case | Expected rejection/recovery | Result | Evidence |
|---|---|---|---|
| fishing edge clicked without the net armed | "Click the Small net in your pack, then click the fishing water." and no catch | PASS (observed in earlier runs) | run2.log chat |
| chopping without a wielded axe | "You must be wielding an axe to chop down this tree." | PASS (observed in earlier runs) | run2.log chat |

### Persistence expectations

- Not exercised in this run; every per-building QA (`tools/qa_*.js`) reloads mid-route and passes.

### Performance budgets

- Headless smoke budget (boot ≤ 5 s, ≥ 45 FPS, worst frame ≤ 150 ms) — see §5.

## 5. Automated gates

| Check/command | Result | Key output/evidence |
|---|---|---|
| `node tools/test_world_v2.js` | world-v2 contract: all locks pass | all locks incl. the new marked-tree lock |
| `node tools/validate_content.js` | PASS - no referential-integrity errors. | |
| `node tools/run_smoke_headless.js` | PASS 104/104, 60 FPS, 20 ms worst, 182 draws, 0 errors | |
| `node tools/qa_holm_full_route.js` | PASS 20/20 in 578.2s | this report |

## 6. Live golden-path run

Start timestamp: 2026-09-09 (driver clock 0 s)

Starting inventory/equipment/XP/progress:

- coins only; nothing wielded; step 0

Action log:

| Time/step | Visible interaction performed | Actual result and state delta | Animation/audio/message observed | Evidence | Result |
|---|---|---|---|---|---|
| 0 (4.5s) | fresh profile boots at step 0 of the thirteen-step Holm curriculum | {"step":0,"complete":false,"plane":0,"pos":[151,169],"errors":0,"stepId":"study_route"} | see evidence | `scratchpad/holm_full_route/` | PASS |
| 1 (10.3s) | 1 study_route: a real click on the relief chart records the lesson | {"step":1,"complete":false,"plane":0,"pos":[151.5,157.5],"errors":0,"stepId":"equip_hatchet"} | see evidence | `scratchpad/holm_full_route/01_*.png` | PASS |
| 2 (11.4s) | 2 equip_hatchet: a real click on the pack hatchet wields it | {"step":2,"complete":false,"plane":0,"pos":[151.5,157.5],"errors":0,"stepId":"chop_logs"} | see evidence | `scratchpad/holm_full_route/02_*.png` | PASS |
| 3 (36.5s) | 3 chop_logs: a real click on a marked tree gathers emberwood logs | {"step":3,"complete":false,"plane":0,"pos":[125.5,159.4],"errors":0,"stepId":"light_fire"} | see evidence | `scratchpad/holm_full_route/03_*.png` | PASS |
| 4 (45.5s) | 4 light_fire: a real click on the logs lights a campfire with the tinderbox | {"step":4,"complete":false,"plane":0,"pos":[124.4,159.4],"errors":0,"stepId":"catch_fish"} | see evidence | `scratchpad/holm_full_route/04_*.png` | PASS |
| 5 (64.9s) | 5 catch_fish: net then a real click on the fishing edge lands a mirrorperch | {"step":5,"complete":false,"plane":0,"pos":[130.5,150.5],"errors":0,"stepId":"cook_fish"} | see evidence | `scratchpad/holm_full_route/05_*.png` | PASS |
| 6 (153.1s) | 6 cook_fish: a real click on the campfire roasts the perch | {"step":6,"complete":false,"plane":0,"pos":[130.5,150.5],"errors":0,"stepId":"descend_cavern"} | see evidence | `scratchpad/holm_full_route/06_*.png` | PASS |
| 7 (167.8s) | 7 descend_cavern: right-click the winch frame, Climb-down from the menu, land in the cavern | {"step":7,"complete":false,"plane":-1,"pos":[286,354],"errors":0,"stepId":"mine_copper"} | see evidence | `scratchpad/holm_full_route/07_*.png` | PASS |
| 8 (180.4s) | 8 mine_copper: a real click on the copper rock mines copper ore | {"step":8,"complete":false,"plane":-1,"pos":[294.9,355.5],"errors":0,"stepId":"mine_tin"} | see evidence | `scratchpad/holm_full_route/08_*.png` | PASS |
| 9 (191.8s) | 9 mine_tin: a real click on the tin rock mines tin ore | {"step":9,"complete":false,"plane":-1,"pos":[304.5,376.7],"errors":0,"stepId":"smelt_bronze"} | see evidence | `scratchpad/holm_full_route/09_*.png` | PASS |
| 10 (203.9s) | 10 smelt_bronze: a real click on the furnace then the Bronze bar option smelts a bar | {"step":10,"complete":false,"plane":-1,"pos":[307.5,363.5],"errors":0,"stepId":"forge_dagger"} | see evidence | `scratchpad/holm_full_route/10_*.png` | PASS |
| 11 (215.8s) | 11 forge_dagger: a real click on the anvil then the Bronze dagger option forges it | {"step":11,"complete":false,"plane":-1,"pos":[302.5,364.5],"errors":0,"stepId":"open_bank"} | see evidence | `scratchpad/holm_full_route/11_*.png` | PASS |
| 12 (227.8s) | cavern exit ladder: a real click climbs out into the Combat Hall drill tower | {"step":11,"complete":false,"plane":0,"pos":[176.5,116.5],"errors":0,"stepId":"open_bank"} | see evidence | `scratchpad/holm_full_route/11b_surface.png` | PASS |
| 13 (241.1s) | 12 open_bank: a real click on a teller booth opens the bank interface | {"step":12,"complete":false,"plane":0,"pos":[157.5,117.5],"errors":0,"stepId":"relight_lastlight"} | see evidence | `scratchpad/holm_full_route/12_*.png` | PASS |
| 14 (336.1s) | optional bake_bread: real clicks on the shelf, bin, butt, trough, pack and range bake a loaf | {"k1":true,"k2":true,"k3":true,"k4":true,"k5":true,"k6":true,"dough":1,"kneaded":1,"bake":{"bread":1,"optional":true,"step":12}} | see evidence | `scratchpad/holm_full_route/13_bake_bread.png` | PASS |
| 15 (359.3s) | optional learn_quests: a real click on the quest board records the lesson | {"r":{"centre":[136.8,3.1,132.4],"screen":[769,233],"hit":[769,233]},"quests":{"optional":true,"step":12}} | see evidence | `scratchpad/holm_full_route/14_learn_quests.png` | PASS |
| 16 (469.9s) | 13 relight_lastlight: real clicks on the door, both ladders and the lever light the beacon and complete the curriculum | {"step":13,"complete":true,"plane":0,"pos":[196.5,113.5],"errors":0,"stepId":null} | see evidence | `scratchpad/holm_full_route/13_*.png` | PASS |
| 17 (512.9s) | descent: the lighthouse returns the player to the summit (ladders clicked where still needed) and the road reaches Departure Dock | {"step":13,"complete":true,"plane":0,"pos":[205.5,151.5],"errors":0,"stepId":null} | see evidence | `scratchpad/holm_full_route/16_departure_dock.png` | PASS |
| 18 (577.8s) | departure: a real click on the skiff sails to the mainland with the departure pack | {"r":{"centre":[211,-1.2,153.9],"screen":[769,323],"hit":[769,323]},"sailed":false,"arrival":{"provider":"veyhollow-commons-v2","zone":"Veyhollow Commons","coin | see evidence | `scratchpad/holm_full_route/17_mainland.png` | PASS |
| 19 (577.8s) | no page errors, console errors, or failed asset loads across the whole route | {"pageErrors":[],"consoleErrors":[],"failedLoads":[]} | see evidence | `scratchpad/holm_full_route/` | PASS |

Final inventory/equipment/XP/progress:

- {"provider":"veyhollow-commons-v2","zone":"Veyhollow Commons","coins":230,"bread":4,"errors":0}

Golden-path verdict: PASS

## 7. Negative and interruption matrix

| Scenario ID | Case | Starting state | Steps | Expected | Actual | Evidence | Result |
|---|---|---|---|---|---|---|---|
| N-01 | Missing/wrong tool | no axe wielded | click marked tree | refusal message | refusal message | run2.log | PASS |
| N-02 | Missing/insufficient input | net not armed | click fishing edge | prompt to click the net first | prompt shown | run2.log | PASS |
| N-03 | Full inventory | | | | not run | | N/A |
| N-04 | Wrong order/target | plan from outside walls | per-building QAs | plan goes round through a door | as expected | tools/qa_*.js | PASS |
| N-05 | Repeated/rapid activation | | | | not run | | N/A |
| N-06 | Walk away/change target | | | | not run | | N/A |
| N-07 | UI/equipment/reload interruption | mid-route reload | per-building QAs | position, step and optional ledger persist | as expected | tools/qa_*.js | PASS |
| N-08 | Blocked/edge/cardinal approach | pad approach steps | landscape acceptance | every approach step ≤ 1.05 | as expected | test_world_v2 | PASS |
| N-09 | Depleted/already claimed/completed | fish burnt | cook loop | refish and recook | driver handles it | qa_holm_full_route.js | PASS |
| N-10 | Leave and re-enter | cavern out, hall in | route | one-way ladder surfaces indoors | as expected | 11b_surface.png | PASS |

## 8. Four-direction visual and interaction review

Not part of this run; each building's closeout carries its compare sheets and the owner's fully-designed gate stays open.

## 9. Defects found and fixed during this regression

- The required `chop_logs` lesson had no choppable tree on the Holm (the landscape oaks are scenery). Three
  provider-owned marked trees now stand beside the arrow target (`src/holm_survival_trees.js`).
- The Guide Hall relief chart could not be started by clicking it: the generic walk-to stopped 2.55 tiles from a
  3-tile-wide table, outside its 2.25 reach, and `Sched.walkThen` gave up silently. All Guide Hall stations now
  walk onto their authored interaction tiles first (`HolmStationReach.guard`).
- The fishing edge never declared `acceptsUseItem`, so a real "net, then water" click fell through to nothing.
  The Survival Workyard definition and its checked-in Studio bundles were republished with the flag.
- Driver-side: the smithing grid's dagger cell needs the smallest matching element, and the lit beacon returns the
  player to the summit so the descent ladders are only clicked when still inside.

## 10. Sign-off

- Result: PASS (20/20)
- Page errors / console errors / failed loads: 0 / 0 / 0
- Human alpha remains required per `docs/rebuild/QA_STANDARD.md`; this run is the automated real-input baseline.
