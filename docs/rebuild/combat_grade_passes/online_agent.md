# Combat grade, online agent (W2 online alpha, branch world-online-2026-09-25)

Rubric: `docs/rebuild/COMBAT_GRADE.md` (20 criteria, 0 / 0.25 / 0.5 each, a criterion scores 0.5 only with evidence).
This log grades the criteria **as they play online**: two or three real browser clients on the authoritative server
(`server/`), the server's 2004 rules (`shared/combat.js`, `shared/pvp.js`), and the online client
(`src/online_*.js`, `src/net_client.js`).

## What this agent owns

| Owned here (online) | Shared / owned elsewhere |
|---|---|
| 4 hit delays and the splat on arrival, 5 retaliation / single-way lock online, 7 protection prayers in play, 8 PvP rules, 10-15 feel and controls online, 18 PvP tension, 19 PvP kit balance, 20 online robustness | 1-3, 6, 9 formulas (server W1 + combat agent; verified here in live play), 16 weapon families and specials (content + combat agent), 17 monster variety (content; the Scarlands bestiary branch), 19 tier tables (combat agent) |

Scores below are the full 20 as they apply online; the "owned" line averages only the owned criteria, scaled to 10.

## Evidence and how to reproduce

- Unit: `node tools/test_online_client.js` (server-map model, ground, 8-direction tick mover, hit timing rules,
  connection / reconnect), `npm run test:server` (incl. `server/test/online_w2.test.js`).
- Three real browsers, 20 fights: `python tools/serve_static.py 8100 .` then
  `node tools/online_multi_browser.js --out docs/rebuild/combat_grade_passes/online_evidence/passN` (starts its own
  seeded world on 127.0.0.1:8201; report `online_report.json`, frame strips `strip_*.jpg`, desktop and phone
  screenshots `screen_*.jpg`). Every fight checks: splats per target on the attacker's, the defender's and the
  observer's page equal the server's hits; every page's view of every adventurer equals the server after the fight;
  every splat is tied to its swing or projectile; loot ownership; kept items; skull; respawn.
- Measured over a run (`report.measured`): live accuracy (observed hits vs the sum of per-roll 2004 chances, z-score),
  damage uniformity (chi-square per max hit), attack gaps per weapon (server swings), projectile hit delays (the tick a
  hit lands vs the client's landing rule).
- Balance: `node tools/online_pvp_balance.js` (kit matchups, simulated duels with food and prayers, PvM time to kill).

---

## Pass 1 (2026-09-26 morning): first end-to-end runs

Runs: `online_evidence/pass1/pvp_melee_first.json` (one PvP melee fight, all its checks green, before the timing
check existed), `pvp_ranged_pvm_sample.json` (PvP ranged + two PvM), `pvm_sample.json` (three PvM), and
`full_run_stopped.json` (the first full 20-fight run, stopped after two fights once its blocking bugs were clear).
Strips / screens: `pass1/strip_pvp_ranged.jpg`, `strip_pvp_melee.jpg`, `screen_pvp_1538x900.jpg`, `screen_pvp_phone.jpg`.

| # | Criterion | Score | Evidence and notes |
|---|---|---|---|
| 1 | Accuracy per style | 0.25 | Server rolls are the shared 2004 rolls (exhaustive `hitChance` test in `server/test/shared_combat.test.js`); live sample only 56 rolls (z = 0.25). |
| 2 | Max hit, 0..max uniform | 0.25 | Server tests; too few live draws per max hit to test uniformity. |
| 3 | Attack speeds in game | 0.25 | Measured live: longsword 5 ticks (8/8 gaps), staff 5 (6/6), monsters 4 and 5; bows not yet measured. |
| 4 | Hit delays, splat on arrival | 0.25 | PvP ranged: 60/60 hits tied to their arrows, none late; server delays = client rule 6/6. But PvP melee: 53 of 105 splats untimed (bug: the PID rule read an entity id instead of the pid). One PvM spell planned late. |
| 5 | Retaliation, single-way lock | 0.5 | Defenders auto-retaliate in every fight; a third adventurer attacking a fighter outside multi is refused ("Someone else is already fighting them"). |
| 6 | Eating | 0.25 | Server rules tested; fighters eat at 45% in every fight; the bite dropping the attack order not measured in the browser. |
| 7 | Prayers | 0.25 | Protect from Magic blocked every moss seer spell (all 0). PvP 40% cap check failed: the defender's prayer ran dry mid-fight (the check counted hits after that). Protect Item not yet exercised. |
| 8 | PvP rules | 0.25 | Wilderness level HUD, level-range menu, skull on the attacker only (2000-tick timer), kill credited, skulled loser keeps nothing (matches the client preview), pile private to the killer. Logout lock and kept-three not yet exercised online. |
| 9 | PvM rules | 0.25 | Aggressive monsters engage, XP per style arrives, drops private to the killer and picked up. Bug: loot of 2 of 4 kills stayed hidden (the body finished sinking before the server removed it). |
| 10 | Attack animations, impact frame | 0.25 | Kit clips per damage type (slash/stab/crush), bow, cast; NPC melee on the impact frame; PvP melee half untimed (see 4). |
| 11 | Projectiles, misses | 0.25 | Arrows fly hand-to-target, splat on arrival (strip_pvp_ranged); blue 0s; one late spell in PvM. |
| 12 | Readability | 0.5 | `screen_pvp_1538x900.jpg`, `screen_pvp_phone.jpg`: splats, bars, skull, protect icon, Scarlands level, orbs readable at both sizes. |
| 13 | Death reads | 0.25 | Player death clip + "Oh dear, you are dead!" screen listing kept items and the killer; NPC topple and sink; loot pop broken in 2 of 4 PvM kills. |
| 14 | Controls | 0.25 | Left click on a player attacks (top menu entry "Attack Name (level-51)"), closes distance for melee and ranged; switching mid-fight not measured yet. |
| 15 | 8-direction movement, no rubber band | 0.25 | Diagonal interpolation unit-tested; every page matched the server after each fight; one drawn-position lag flag (a background page stepping coarsely). |
| 16 | Weapon variety, specials | 0.25 | Style buttons per weapon category from the shared tables; staff/bow/melee kits differ; no special attack exercised (kit weapons had none). |
| 17 | Monster variety | 0.25 | Melee and magic monsters, an aggressive pack (gnarlgobs), a tough cinder shade; no ranged monster in the content yet. |
| 18 | PvP tension | 0.5 | Ditch warning, skull, level plaque, kept-items preview, food and prayer matter (sim: protection doubles duel length); equal duels measured 98-168 s. |
| 19 | Balance | 0.25 | Kit sim: every matchup 46-58% with food (`online_pvp_balance.js`); PvM time-to-kill table; no tier tables. |
| 20 | Online robustness | 0.25 | Three browsers, server-authoritative, zero page desyncs; 20-fight run and reconnect not completed. |

**Pass 1 total: 5.75 / 10** (owned criteria: 5.9 / 10).

### Fixed after pass 1

- PvP hit timing: `OnlineFX` passed entity ids where the 2004 PID rule needs pids, so a hit on a lower-pid target was
  never matched to its swing (untimed splat). Fixed (`who()`), and every splat is now required to be tied to a swing or
  a projectile.
- Loot of a monster whose body finished sinking before the server removed it stayed hidden: the loot now pops up the
  moment the body is gone, whichever arrives first.
- Taking a kit from far away gave up after 15 s of walking; it now waits until you arrive (any other order cancels).
- Driver: the prayer cap is checked only while the prayer is up; run energy and hitpoints restored between fights;
  the private-pile check uses the server's pile.
- Added: real-UI switching checks (style button, prayer button, a bite) timed in ticks, a special attack through a
  weapon switch and the orb (kits now carry a steel sword / ash bow for it), movement backlog metrics, the unmatched
  hit and late projectile logs, live accuracy / damage / attack-speed / hit-delay measurements, no tutorial guide
  arrow online.

---

## Pass 2 (2026-09-26, first complete 20-scenario run)

Run: `online_evidence/pass2/online_report.json` (20 scenarios, 4908 ticks, three pages), strips
`pass2/strip_{pvp,pvm}_{melee,ranged,magic}.jpg`, screens `pass2/screen_pvp_1538x900.jpg`, `screen_pvp_phone.jpg`.
11 PvP duels to the death and 6 PvM kills completed; 4 PvM scenarios never started (the kit walk, below) and the
skull / pile-pickup checks of 10 duels failed on test logic (below). Measured over the run (`report.measured`):

- **Accuracy (live):** 1232 server hit rolls, 509.2 hits expected from the per-roll 2004 chances, 504 observed:
  z = -0.3.
- **Damage 0..max:** 502 draws; chi-square per max hit 3/4/6/7/8/10 = 2.4/2.5/8.7/4.4/3.3/8.9 on 3/4/6/7/8/10
  degrees of freedom: uniform.
- **Attack speed (server swings):** steel longsword 5 ticks (420 of 451 gaps), gale longbow on rapid 5 (240/265; 6 - 1),
  storm staff casts 5 (226/245), monsters 4 (196/196) and 5 (15/15); the other gaps are 8 = 5 + the 3-tick bite delay.
- **Projectile hit delays:** 406 of 406 arrow and spell hits landed on exactly the tick the client's landing rule
  (distance delay + the 2004 PID rule) predicts.
- **Switching mid-fight (real UI clicks):** style button 0.84 ticks, prayer button 1.02, a bite 0.99 (next tick).
- **Kept on death (every death):** equal to the client's own preview: 0 when skulled, 3 unskulled, 4 with Protect Item
  (pvp-melee-vs-magic, pvp-ranged-swapped).
- **Protection vs players:** the biggest protected hit never passed the cap: 4/4, 3/4, 6/6 (melee, ranged, magic max
  8, 7 and 10 cut by 40%); vs monsters: every moss seer, hex adept, skeleton and raider hit a 0 while praying.
- **Reconnect mid-fight:** the dropped adventurer stayed in the world, the client re-attached, logging out mid-fight
  was refused (logout lock), the duel finished normally.
- **Page errors:** none on any page.

| # | Criterion | Score | Notes |
|---|---|---|---|
| 1 | Accuracy | 0.5 | live z = -0.3 over 1232 rolls + the server's exhaustive roll test |
| 2 | Max hit, 0..max | 0.5 | chi-square uniform for every max hit with 30+ draws; protected caps hold |
| 3 | Attack speeds | 0.5 | measured per weapon and for monsters, rapid -1 and the bite's +3 visible |
| 4 | Hit delays, splat on arrival | 0.25 | 406/406 server delays match; but duels where both swing on the same tick still showed untimed splats (9 of 82 in pvp-melee-swapped) and 4 late spells during a 14.6 s stall |
| 5 | Retaliation, single-way | 0.5 | as pass 1, plus every duel's defender retaliating |
| 6 | Eating | 0.5 | bite answers next tick (0.99), +3 on the attack clock measured (8-tick gaps), server test for the dropped attack order |
| 7 | Prayers | 0.5 | NPC protection total, player protection 40% measured, drain ran a prayer dry mid-duel, Protect Item +1 twice |
| 8 | PvP rules | 0.5 | level HUD + range menu, skull (incl. the 2004 no-skull-when-striking-back rule), kept 3/0/+1 = preview, killer's private pile, logout lock mid-fight, single-way refusal; teleport block only in server tests (the test map ends at level 10) |
| 9 | PvM rules | 0.25 | aggression, XP per style, private drops; loot stayed hidden after 6 kills on a background page |
| 10 | Animations, impact frame | 0.25 | same-tick duel swings were replaced by the defend flinch on the server (one animation per tick): those swings never showed |
| 11 | Projectiles, misses | 0.25 | arrows and bolts fly and land with the splat (strips); 4 late spells behind a stall |
| 12 | Readability | 0.5 | desktop and phone screens |
| 13 | Death reads | 0.25 | own death + respawn explained; monster loot pop broken on background pages |
| 14 | Controls | 0.5 | left-click attack, "Attack Name (level-51)" only in range, melee closes in, ranged / magic shoot from 4 tiles, switches next tick |
| 15 | 8-direction, no rubber band | 0.25 | movement backlog up to 39 steps during the stall (catch-up sprints) |
| 16 | Weapon variety, specials | 0.25 | no special attack exercised yet |
| 17 | Monster variety | 0.25 | melee + magic monsters; no ranged monster in the content |
| 18 | PvP tension | 0.5 | duels 62-197 s (median 105 s) between equal kits; food and prayer decided several |
| 19 | Balance | 0.25 | kit matchups 46-58% (sim), live duel winners split 6/5; no tier tables (combat agent) |
| 20 | Online robustness | 0.25 | zero page desyncs, splat counts = server hits on all three pages in every duel, no lost loot, reconnect keeps the lock; but 4 of 20 scenarios never started |

**Pass 2 total: 7.5 / 10** (owned criteria: 7.6 / 10).

### Fixed after pass 2

- **Server animation priority** (`server/engine/PathingEntity.js`): the defend flinch no longer replaces an attack,
  cast or death set earlier in the same tick. Two duellists with the same weapon speed swing on the same tick; the
  later one's blow used to overwrite the first one's swing with "defend", so that swing never reached any client.
  Test: `server/test/online_w2.test.js` (animation priority).
- **View adds carry this tick's animation and hits** (`server/engine/info.js`): a monster that walks into view and
  swings in the same tick used to show an untimed splat.
- **The combat layer keeps stepping on a hidden or occluded page** (`src/online_main.js`): the game's timer heartbeat
  skipped `CombatFX.update`, so bodies never sank and their loot stayed hidden until the page was looked at.
- **Far walks go in legs**: the server's path finder searches 64 tiles out (as in 2004); a kit taken from across the
  map now walks there in legs and asks again while the 16-tick fighting lock refuses it.
- **Driver**: the world runs in the driver's own process, and composing a strip with a blocking child process froze
  every tick for 14.6 s (all three pages saw the same gap); now asynchronous. Expected skull follows the 2004
  predator / prey rule; the death pile is the killer's private stacks on the death tile (arrows merge into an older
  stack); the pick-up waits for that pile only; far walks are re-clicked; a special attack through a weapon switch;
  reach per style.

---

## Pass 3 (2026-09-26, full run after the pass 2 fixes)

Run: `online_evidence/pass3/online_report.json` + `run.log` (18 of 20 scenarios ran; the report's end-of-run block is
missing because the driver crashed on a logged-out page, below), strips `pass3/strip_{pvp,pvm}_{melee,ranged,magic}.jpg`,
screens `pass3/screen_pvp_1538x900.jpg`, `screen_pvp_phone.jpg`. A focused PvM re-run before it
(`--only pvm-magic-skeleton,pvm-melee-moss_seer,pvm-magic-cinder_shade`) measured the movement fix: the busiest page's
replay backlog fell from 48 steps to 4, catch-up sprints from 991 to 0.

**Passed: 15.** All three single-style duels (melee, ranged, magic), all ten PvM fights (every style against every
monster, protection prayers blocking every monster hit, loot shown 3.7-4.6 s after the kill: the death clip and the
sink, then the pile), `pvp-melee-swapped`, `pvp-ranged-swapped` (Protect Item: 4 kept).

- **Every splat tied to its swing or projectile:** 1278 splats over the three pages: 656 on a projectile, 282 on a
  same-tick swing, 340 on a next-tick swing (the PID rule); **0 untimed, 0 late**. Pass 2 had 9 untimed in one duel
  and 4 late spells.
- **Splats = server hits on all three pages** in every duel that ran (e.g. pvp-ranged 70/70/70/70 and 71/71/71/71).
- **Kept on death = the preview** in every death (0 skulled, 3, 4 with Protect Item); the death screen names the killer.
- **Reach:** melee attackers adjacent 100% of samples, ranged and magic at range 100%.
- **Switching (real UI clicks):** style 0.4-0.6 ticks, prayer 0.71-0.96, a bite 1.14-1.16 (next tick).
- **Duels between equal kits:** 71-223 s (median 131 s).

**Failed: 3, not run: 2.**

1. `pvp-ranged-vs-melee` - **a real bug:** a bow's special attack spent its energy but its swing was not flagged
   `spec` (only melee specials were), so no client could play the special draw. Fixed in `server/engine/combat.js`
   (ranged on monsters and players), test in `server/test/online_w2.test.js`.
2. `pvp-melee-vs-magic` - driver: `kitUp` treated "already holding the kit's weapon" as "has the kit", so the defender
   was sent to the duel while their client was still walking to the chest for fresh food. The driver now waits for the
   server's own record of a new kit.
3. `pvp-magic-vs-ranged` - driver: the winner ate after the last blow and the observer still showed the hitpoints of
   that blow. That is the 2004 rule (someone else's hitpoints travel only with a hit), so the check now accepts either
   the server's hitpoints or those of the last hit.
4. `pvp-reconnect` hit the same kit fault as 2: with no fight running, the "logout refused" check logged the adventurer
   out for real, and the last two scenarios found no game on that page. The driver now logs a page back in before each
   scenario and ends a reconnect check early when nothing holds the adventurer.

Also fixed after pass 3: **the ticks keep a background tab logged in** (`src/net_client.js`). After 5 minutes hidden,
Chrome holds a tab's timers to one wake-up a minute, which would stretch the 10 s ping past the server's 60 s silence
limit; socket messages still arrive, so a tick is now answered with a ping when nothing went out for 10 s (test in
`tools/test_online_client.js`). A breath (the bestiary wyrmling's) now flies orange.

| # | Criterion | Score | Notes |
|---|---|---|---|
| 1 | Accuracy | 0.5 | pass 2's live z = -0.3 over 1232 rolls stands; no formula changed |
| 2 | Max hit, 0..max | 0.5 | as pass 2; protected caps held in every duel (4/4, 4/4, 6/6, 3/4) |
| 3 | Attack speeds | 0.5 | as pass 2 (focused re-run: staff 23/23 gaps of 5, longsword 6/6 of 5, monsters 27/27 of 4, 6/6 of 5) |
| 4 | Hit delays, splat on arrival | 0.5 | 0 untimed, 0 late of 1278 splats; projectile hits on the predicted tick |
| 5 | Retaliation, single-way | 0.5 | every defender retaliated; third adventurer refused |
| 6 | Eating | 0.5 | bite on the next tick, +3 on the attack clock |
| 7 | Prayers | 0.5 | monsters fully blocked (every hit 0), players capped at 60%, Protect Item +1 |
| 8 | PvP rules | 0.5 | skull by the 2004 predator rule, level range menu, kept 0/3/4 = preview, private pile |
| 9 | PvM rules | 0.5 | 10/10 PvM: aggression, XP per style, private drop shown after the sink, bones picked up |
| 10 | Animations, impact frame | 0.5 | same-tick duel swings now all shown (282 same-tick matches, 0 untimed) |
| 11 | Projectiles, misses | 0.5 | 656 projectile splats, 0 late; splashes read |
| 12 | Readability | 0.5 | desktop and phone screens |
| 13 | Death reads | 0.5 | every monster's loot appears once its body has sunk; own death screen explains kept / killer |
| 14 | Controls | 0.5 | reach 100% per style, left-click attack, switches next tick |
| 15 | 8-direction, no rubber band | 0.5 | backlog 48 -> 4 steps, no catch-up sprints (focused re-run); every page agreed on every tile |
| 16 | Weapon variety, specials | 0.25 | sword special fires and shows; the bow special's swing was unflagged (fixed after this pass) |
| 17 | Monster variety | 0.25 | the playable map still has no ranged monster; the bestiary (below) brings one |
| 18 | PvP tension | 0.5 | duels 71-223 s, food and prayer decided several |
| 19 | Balance | 0.25 | kit matchups 46-58% (sim); tier tables are the combat agent's |
| 20 | Online robustness | 0.25 | 0 desyncs, 0 double or lost hits in every duel that ran; but 5 scenarios failed or never ran (driver faults) |

**Pass 3 total: 8.75 / 10.** Owned criteria (4, 5, 7, 8, 10-15, 18, 19 kits, 20): 6.0 / 6.5 = **9.2 / 10**.

### The Scarlands bestiary, dropped in read-only

`online_evidence/bestiary_dropin/` (`lineup.jpg`, `strip_archer.jpg`, `strip_mage.jpg`, `strip_wyrmling.jpg`,
`result.json`): the live tree's bestiary v1 (manifest + GLBs) served locally and its `npcType` blocks injected in memory
(nothing in this branch or the live tree changed); one adventurer with the ranged kit fights each creature alone to its
death. All six creatures load (one mixer each, 0 failures, 0 page errors). Raider archer: 11 arrows on us, all tied to
their projectiles; ember mage: 5 bolts, all tied; cinder wyrmling (2x2): 7 melee blows tied to its swings and 3 breaths
(every third attack, magic-rolled), 0 late, 0 untimed; each death plays its clip, sinks, and the drop appears. When the
bestiary merge lands, criterion 17 has its ranged and magic monsters and a boss-like foe with a telegraphed breath.
Note for the bestiary: the wyrmling's head reaches over the adjacent tile (the model is about 3.5 tiles long on a 2x2
footprint), so it covers a melee fighter standing north of it.

---

## Pass 4 (2026-09-26, full run after the pass 3 fixes, plus a focused re-run)

Runs: `online_evidence/pass4/` (all 20 scenarios, 4721 ticks, three pages, report + `run.log`, strips, screens) and
`online_evidence/pass4b/` (`--only pvp-melee,pvp-ranged-vs-melee,pvp-reconnect` after the one fix below).
Review captures refreshed: `online_evidence/review/` (combat tab per kit, the special orb, kept on death, the Ditch
warning and crossings, the attack menu).

**Pass 4: 19 of 20 passed.** The one failure: in `pvp-reconnect` the page that dropped and re-attached showed 17 of its
own blows untimed (the observer's 78 were all timed). A client re-attached mid-fight did not know whom it was fighting
(the server only says so when the target changes), so its own swings had no target to time against. Fixed: the welcome
carries `f` (`server/engine/World.js`, test in `server/test/online_w2.test.js`), the client starts from it.
**Pass 4b: 3 of 3 passed**, the reconnected page 128 of 128 splats timed.

Measured (pass 4, `report.measured`):

- **Accuracy (live):** 1185 rolls, 472.7 hits expected, 454 observed: z = -1.11 (pass 2: z = -0.3 over 1232).
- **Damage 0..max:** chi-square 10.8 / 5.8 / 8.4 / 7.3 / 4.2 on 4 / 6 / 7 / 8 / 10 degrees of freedom (max 4, 6, 7, 8,
  10). Max 4 sits at p = 0.03, one table in five; 100,000 draws of the same roll on the server's RNG give 3.2 / 2.8 /
  9.4 / 7.1 / 13.9, uniform.
- **Attack speed (server swings):** steel longsword 5 ticks (354 of 379 gaps; the others 8 and 11 = one or two bites),
  gale longbow on rapid 5 (321/346), storm staff 5 (265/287), monsters 4 (107/107) and 5 (17/17).
- **Projectile hit delays:** 483 of 483 arrow and spell hits on the tick the client's landing rule predicts.
- **Every splat tied:** 1777 splats over three pages, 927 on a projectile, 419 on a same-tick swing, 414 on a next-tick
  swing; 17 untimed, all on the re-attached page (fixed, 0 of 617 in pass 4b); **0 late**.
- **Splats = server hits** on the attacker's, the defender's and the observer's page in all 10 duels (the re-attached
  page misses only the hits of the moment it was offline: 37 of 38).
- **No desyncs:** every page agreed with the server on every tile and hitpoints after every fight; movement backlog at
  most 4 steps, 0 catch-up sprints, on all three pages over 4721 ticks.
- **Loot:** every duel's pile reached the winner's pack (the observer never saw it); every monster's drop appeared after
  its body sank (3 ms - 4.7 s after the kill) and the bones reached the pack.
- **Kept on death = the preview** in all 10 deaths (0 skulled; 3; 4 with Keepsake Ward, the id `protect_item`).
- **Specials:** sword (25%) and bow (50%) specials fire from the orb after a weapon switch and are seen as special
  swings on every page.
- **Switching (real UI clicks):** style 0.27-1.15 ticks, prayer 0.93-1.17, a bite 0.85-0.91.
- **Reconnect mid-fight:** the adventurer stays in the world, the client re-attaches, logging out is refused.
- **Duels between equal kits:** 88-223 s (median 145 s). Mixed-style duels: magic won 3, ranged 2, melee 1.
- **Page errors:** none.

| # | Criterion | Score | Notes |
|---|---|---|---|
| 1 | Accuracy | 0.5 | z = -1.11 (1185 rolls) and -0.3 (1232) live; exhaustive server roll tests |
| 2 | Max hit, 0..max | 0.5 | uniform (live, and 100k draws); protection caps held in every duel |
| 3 | Attack speeds | 0.5 | per weapon and monster, rapid -1, the bite's +3 |
| 4 | Hit delays, splat on arrival | 0.5 | 483/483 delays; 0 late; the re-attach gap fixed and re-run clean |
| 5 | Retaliation, single-way | 0.5 | every defender; the third adventurer refused |
| 6 | Eating | 0.5 | next tick, +3 on the attack clock |
| 7 | Prayers | 0.5 | monsters 0, players capped at 60%, Keepsake Ward +1, drain |
| 8 | PvP rules | 0.5 | Scarlands level, level range, skull by the predator rule, kept 0/3/4 = preview, private pile, logout lock |
| 9 | PvM rules | 0.5 | 10/10 PvM, every style vs every monster kind, XP per style, private drops after the sink |
| 10 | Animations, impact frame | 0.5 | 419 same-tick + 414 next-tick swings timed; special swings shown |
| 11 | Projectiles, misses | 0.5 | 927 projectile splats, 0 late; splashes |
| 12 | Readability | 0.5 | desktop and phone screens (on the phone the zone plaque is partly under the top icon row: game layout) |
| 13 | Death reads | 0.5 | monster death, sink, loot; own death screen names the killer and what was kept |
| 14 | Controls | 0.5 | reach per style 100%, left-click attack, switches next tick |
| 15 | 8-direction, no rubber band | 0.5 | backlog <= 4 steps, 0 catch-ups, every page on the server's tiles |
| 16 | Weapon variety, specials | 0.25 | sword and bow specials online; the staff special in the table is not wired on the server's magic path, axe and pick untested online (combat agent) |
| 17 | Monster variety | 0.25 | the playable map has no ranged monster yet; the bestiary drop-in (pass 3) shows archer, mage and the breathing wyrmling working online |
| 18 | PvP tension | 0.5 | duels 88-223 s; food, prayers and the skull decided them |
| 19 | Balance | 0.25 | kit matchups 46-58% (sim), live mixed duels split 3/2/1; tier tables are the combat agent's |
| 20 | Online robustness | 0.5 | 20 fights with three browsers: 0 desyncs, 0 double or lost hits, 0 lost loot, reconnect keeps the lock |

**Pass 4 total: 9.25 / 10.** Owned criteria (4, 5, 7, 8, 10-15, 18, 19 kits, 20): 6.25 / 6.5 = **9.6 / 10**.

What stands between 9.25 and 9.5 is outside this branch: 17 reaches 0.5 once the bestiary is merged into the playable
map (evidence ready); 16 needs the staff special on the server's magic path and a special per family; 19 needs the tier
tables in band (the combat agent's rebalance).
