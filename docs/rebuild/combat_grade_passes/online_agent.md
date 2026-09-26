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
