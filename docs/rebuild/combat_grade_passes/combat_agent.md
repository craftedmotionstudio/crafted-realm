# Combat grade passes (combat agent, branch world-combat-2026-09-25)

Rubric: `docs/rebuild/COMBAT_GRADE.md` (20 criteria, 0 / 0.25 / 0.5 each, owner bar 9.5). Every score below cites the
evidence that earns it; a criterion without evidence scores at most 0.25.

## Re-baseline of the combat numbers lock (once, deliberately, 2026-09-26)

Owner decision 2026-09-25: exact 2004 combat rules everywhere, one formula set. The client's offline combat now runs
`shared/combat.js`, `shared/pvp.js` and `shared/drops.js` through `src/combat_engine.js` (LocalCombat); the old
per-frame formulas in `src/game3_systems.js` and `src/combat_math.js` (rollAccuracy, osrsMaxHit) are deleted.

What was re-baselined:

| Lock | Before | After |
|---|---|---|
| `tools/test_combat.js` | combat_math.js rollAccuracy / osrsMaxHit / npcDef + XP curve | shared/combat.js golden values, 40,000-roll hit-rate simulations per style (PvM + PvP, 3 level points, all within 1%), uniform 0..max damage (chi-square), XP curve (client = shared), appraisal helpers, and the seeded engine fingerprint through the REAL client engine headless (`tools/fixtures/combat_fingerprint_2004.json`) |
| `tools/qa_holm_combat_numbers.js` | 440 seeded swings of the old per-frame code vs `holm_combat_numbers_baseline.json` (commit 9670a03) | the same fingerprint scenario (`tools/combat_fingerprint.js`) run inside the live game; it must equal the headless fixture byte for byte (PASS 2026-09-26: 360 attacks + 120 monster blows identical) |
| `tools/test_combat_fx_static.js` | old game3 roll lines unchanged since 9670a03 | presentation files never roll or write combat state; the engine rolls only through CRShared; game3 keeps no combat formula; every engine attack rolls before its first presentation call |

Seeded fingerprint summary (same shape of scenario: 40 attacks for each of 4 dagger styles, 3 shortbow styles and
2 Wind Strike casting styles, then 40 blows from each monster):

| | before (old client, seed 20260925) | after (2004 engine, seed 20260926) |
|---|---|---|
| player damage over 360 attacks | 567 | 464 |
| landed-or-missed attacks showing 0 | 56 | 115 (0..max damage: a landed hit can roll 0) |
| spell splashes | not modelled (a miss was a 0 splat) | 14 (no splat, splash graphic, instant retaliation) |
| XP (Attack / Strength / Defence / Ranged / Magic / Hitpoints) | 399 / 407 / 807 / 644 / 726 / 871 | 204 / 424 / 338 / 660 / 547.4 / 604.1 |
| monster blows (melee oathbreaker + magic moss seer) | 80 blows, 103 damage (+ Defence XP for being hit) | 80 blows, 89 damage (no XP for being hit, 2004); + 40 archer blows, 4 damage |

Why the numbers moved, per style (analytic, the fingerprint's levels against a level-1 target):

| attack (Att 20 / Str 22 / Rng 21 / Mag 19 vs a level-1 target) | before: hit % | before: max | before: dmg per 100 ticks | 2004: hit % | 2004: max | 2004: dmg per 100 ticks |
|---|---|---|---|---|---|---|
| dagger Stab -> Stab (accurate/stab) | 85.2 | 3 | 42.6 | 85.2 | 3 | 32.0 |
| dagger Pound -> Lunge (aggressive/stab) | 82.1 | 3 | 41.0 | 83.6 | 3 | 31.4 |
| dagger Slash -> Slash (aggressive/slash) | 83.5 | 3 | 41.7 | 82.9 | 3 | 31.1 |
| dagger Block -> Block (defensive/stab) | 82.9 | 3 | 41.4 | 83.6 | 3 | 31.4 |
| shortbow Accurate | 86.1 | 3 | 34.4 | 86.1 | 4 | 34.4 |
| shortbow Rapid | 84.6 | 3 | 42.3 | 84.6 | 3 | 31.7 |
| shortbow Longrange | 84.6 | 3 | 33.9 | 84.6 | 3 | 25.4 |
| Wind Strike (staff) | 85.1 | 2 | 25.5 | 83.6 | 2 | 16.7 |

The main effects: damage on a landed hit is 0..max (2004) instead of 1..max, so sustained damage drops by roughly a
quarter at low max hits; the dagger's styles follow its 2004 category (Stab / Lunge / Slash / Block) instead of one
fixed Stab/Pound/Slash/Block set; ranged max hit uses the ranged level with its style bonus and the bow's ranged
strength; magic accuracy loses the flat +10 and gains the +1 style bonus, and magic defence blends 70% magic;
monsters roll with level + 9; XP is exact tenths (magic 2 per damage, controlled 1.33) and being hit gives none.

## Passes

(pass log below)

### Pass 1 (2026-09-26): the 2004 engine, 8 directions, 28 slots, the Proving Ground

State: `LocalCombat` runs every offline fight on shared/ rules; the island graph has 2004 diagonals; the pack has 28
slots; eating, Protect Item, per-category styles and "Attack <name> (level-N)" are in; balance data follows the 2004
triangle; the Proving Ground adds a poacher (ranged), a warlock (magic), a wild pack (aggressive) and the broodmother
(boss-like, telegraphed slam).

Evidence (all reproducible):
- `node tools/test_combat.js` (golden values, 40,000-roll hit-rate sims per style PvM + PvP within 1%, worst 0.65%;
  chi-square uniform 0..max; the seeded engine fingerprint);
- `node tools/test_combat_engine.js` (66 checks on the real engine, headless: delays, retaliation, single-way, eating,
  prayers, deaths, XP, 8-direction chase, safespots, specials, mid-fight switching, weapon families, loot timers);
- `SMOKE_BASE=... node tools/qa_combat_pvm.js` (37/37 in the live game: `pass1/pvm.json` + stills in `pass1/`);
- `SMOKE_BASE=... node tools/qa_holm_combat_numbers.js` (the live game = the headless fingerprint, byte for byte);
- `node tools/combat_bench.js pass1` (`pass1/bench_pass1.md`, `pass1/bench_pvmfood.md`: PvM kill times, PvP matchups,
  mirror fights); `npm run test:server` 78/78 (PvP rules, 2-client ws PvP).

| # | criterion | score | evidence / gap |
|---|---|---|---|
| 1 | accuracy rolls per style, PvM + PvP | 0.5 | test_combat.js sims (30 cases, worst 0.65%), golden rolls |
| 2 | max hits, uniform 0..max | 0.5 | golden max hits (melee str, ranged strength, spells), chi-square 15-dof, engine uniformity check |
| 3 | attack speeds measured in game | 0.5 | pvm.json: dagger/sword 4, 2h 7, warhammer 6, shortbow 4 / rapid 3, autocast 5 (live ticks) |
| 4 | hit delays, splat on arrival | 0.5 | live: arrows floor((46+5d+30)/30) at every d measured, spells floor((46+10d)/30)+1, splat - land 0..0.039 s |
| 5 | retaliation, auto-retaliate, 8-tick lock | 0.5 | live retaliation 4 ticks (grubkin speed 6); engine: auto-retaliate +2, "You are already under attack!" |
| 6 | eating | 0.5 | live: order dropped, +3 ticks; engine: 3-tick bites, full-health bites |
| 7 | prayers | 0.5 | engine: roll boosts, drain 1/5 ticks, Thick Skin 1/20, Protect Item 4 kept; live: Protect from Melee blocks the broodmother; server: 40% vs players |
| 8 | PvP rules | 0.5 | server tests (Wilderness level, range, skull 2000, 3/0/+1 kept, hero loot, logout lock, teleport block, single/multi) |
| 9 | PvM rules | 0.5 | live: pack aggression + 2x-level rule; engine: leash, respawn, weighted drops, 100/200-tick loot, XP per style |
| 10 | animation per category/style on the impact frame | 0.5 | live splat - impact frame within 0.042 s for dagger, sword, 2h, warhammer; kit clips per damage type (stab/slash/crush), bow, cast |
| 11 | projectiles visible, timed; misses read | 0.5 | stills ranged_arrow / magic_orb; blue 0 splats; splash lands without a splat (pvm.json magic) |
| 12 | readable at 1538x900 and on a phone | 0.25 | desktop stills fine; no phone-size fight evidence yet |
| 13 | deaths read | 0.5 | kill_fall / kill_loot (drop shown ~1.45 s after the fall), player_death + "On Tutor's Holm nothing is lost" |
| 14 | controls | 0.5 | live approach ends on a side tile; right-click "(level-18)"; engine: style / weapon switch answers next attack |
| 15 | 8 directions in fights | 0.25 | live approach took 5 diagonal steps; engine safespot; online rubber-banding not testable here |
| 16 | weapon variety + specials | 0.5 | engine: 12 families all with a special, distinct speeds; CATEGORY_STYLES per category (tab stills) |
| 17 | monster variety | 0.5 | Proving Ground: melee, ranged, magic, aggressive pack, boss-like with a telegraph (still), weighted drops |
| 18 | PvP tension | 0.25 | kept-items preview (skull-aware) and shared Ditch-warning text exist; fight lengths measured; no Wilderness/skull HUD in this client |
| 19 | balance | 0.25 | triangle at 40/60 (melee > ranged 100%, ranged > magic 73-87%, magic > melee 52-63%); at 25 magic beats both |
| 20 | online robustness | 0 | needs the online client (server-side 2-client PvP test exists) |

Total pass 1: **8.5 / 10**. Weakest: 12 (phone), 18 (PvP HUD), 19 (level-25 magic), 15/20 (online).
Fixed during pass 1 (found by the benches): driver artifacts aside, building floors had no diagonals (measured
profiles counted as stairs) -> flat profiles now get diagonals; a despawned aggressor held the single-way lock; the
broodmother's wind-up was too short to react to (2 -> 3 ticks); leather took the ranged-armour role (spells kept out).

### Pass 2 (2026-09-26): phone readability, the Scarlands HUD, mages in their robes

Fixes from pass 1's weakest criteria:
- 12: a phone-size (430x860) fight on the Proving Ground meadow: the splat draws at 51 px with its health bar and XP
  drops by the minimap (`pass2/phone_fight.jpg`, `pass2/pvm.json`).
- 18: `src/ui_pvp_hud.js` (PvpHud): the "Level: N" plaque, the skull on the HUD and over the head, the multi-combat
  sign, and the Ditch warning with the adventurer's own numbers and the pictures of what they would keep
  (`shared/pvp.js ditchWarningLines`); Blender-rendered icons pk_skull, multi_combat, wild_plaque
  (`pass2/pvp_hud_ditch.jpg`, `pass2/pvp_hud_skulled.jpg`); the online layer drives it from the status block
  (COMBAT_CLIENT_HOOKS.md). Food and prayer matter (bench variants change winners and lengths).
- bench realism: mages wear their best robes (glimmer from level 15); the PvM driver no longer picks a foe felled by
  an earlier scenario (the one flaky check); NPC tile outlines show the engine's true tile.

Evidence: `pass2/bench_pass2.md` (full bench), `pass2/pvm.json` (40/40 live checks).

| # | score | change |
|---|---|---|
| 1-11 | 0.5 each | unchanged, re-run green |
| 12 | 0.5 | phone fight evidence |
| 13, 14, 16, 17 | 0.5 each | unchanged, re-run green |
| 15 | 0.25 | online part pending |
| 18 | 0.5 | Scarlands HUD + Ditch warning + kept-items pictures, measured fight lengths |
| 19 | 0.25 | the triangle holds at 40 and 60 (melee > ranged 100%, ranged > magic 78-82%, magic > melee 65-68% with food) but at 25 magic beats both (water bolt 10 against a level-25 archer's max hit of 4) |
| 20 | 0 | online |

Total pass 2: **9.0 / 10**. Remaining offline gap: 19 at level 25.

### Pass 3 (2026-09-26): the level-25 archer

Diagnosis (pass-2 bench + hand check): at level 25 the ash shortbow (23 ranged strength) gives a rapid max hit of
floor((33 x 87 + 320) / 640) = 4, one short of 5; against water bolt's 10 that let magic beat ranged 60-75%.
Fix: the ash shortbow carries 26 ranged strength (the bow in our data carries its arrows' strength; 26 sits between
the 2004 mithril 22 and adamant 31 arrows a level-20..30 archer used). Now a level-25 archer hits 5, level 40 hits 7,
level 60 hits 10.
Also: plain entry points for the menu providers (`LocalCombat.attack`, `castOn`, `canAttack`).

Result (`pass3/bench_pass3.md`, 60 fights per pairing, sides alternated, with food):

| level | melee vs ranged | ranged vs magic | magic vs melee |
|---|---|---|---|
| 25 | melee 93% | ranged 65% | magic 100% |
| 40 | melee 100% | ranged 78% | magic 68% |
| 60 | melee 100% | ranged 90% | magic 65% |

Every style wins one matchup and loses one at every level point: no style dominates; PvM kill times with food sit
at 26-66 s against monsters of the adventurer's level, PvP fights between equals last 23-100 s without food and
85-290 s with ten trout each.

Grader review of pass 3 (coordinator, 2026-09-26): criteria 1-14 and 16-18 agreed; **19 stays 0.25**: a 100% matchup
(melee over ranged at 40/60, magic over melee at 25) is a foregone conclusion, not a triangle. Ask: keep the 2004
formulas, tune our item stats and gear assumptions so the favoured style wins roughly 60-85% at every level point and
the underdog can still win with good food/prayer play; report fight-length spread, not only win rates. 15 (online
part) and 20 are graded by the online agent's run.

| # | pass 3 score |
|---|---|
| 1-14, 16-18 | as pass 2 (12 and 18 at 0.5) |
| 15 | 0.25 (online part) |
| 19 | 0.25 |
| 20 | online |

Total pass 3: **9.0 / 10** (offline 9.0 of 9.5 reachable; 20 online).

### Pass 4 (2026-09-26): the triangle at every level point (our item ladders, not the formulas)

Diagnosis (pass-3 bench + `tools/combat_triangle_sim.js` sweeps, `pass4/sweep_pass4.txt`):
- **40 and 60**: the metal ladder ran to level 40 but ranged stopped at the ash shortbow (10) and leather (1), magic at
  the storm staff (25) and glimmer robes (15). A level-40 archer (+29 ranged attack) shot a +130 ranged-defence plate
  set at a 24% hit chance, so melee won 100%.
- **25**: our spells keep their 2004 fixed maximum hits (water bolt 10) while a level-25 aurel sabre hits 5. With
  2004's small minus on metal magic defence (a set -12) the mage won 99% of food fights, and nothing on the mage's
  side or the spell side moved it: the weakest mage gear 99%, bolt spells cut by two 95%, a +8 strength amulet on the
  blade 97%. Only metal's magic defence moves that fight (set 0: 98%, +20: 89%, +24: 84%, +31: 72%).
- **60**: every ladder stops at 40; blades and arrows keep growing with Strength and Ranged, the book stopped at
  Earth Blast (15): without Fire Blast magic falls to 47% against the blade.

Changes (formulas untouched; `src/game1_data.js`, `src/magic_spells.js`), each against the 2004 ladder:

| item | now | 2004 anchor / why it still sits on the ladder |
|---|---|---|
| riveted leather body / chaps (NEW, Ranged 20) | +8 / +6 ranged attack; blade def 10-14 / 7-9; magic 16 / 9; ranged 16 / 10 | studded body/chaps (20): +8 / +6 ranged; less blade defence than studded (the ranger must still lose to a blade) and more magic defence (the ranger must beat a mage) |
| fenhide body / chaps / vambraces (NEW, Ranged 40) | +15 / +8 / +8 ranged; blade 22-30 / 12-16 / 4; magic 16 / 8 / 3; ranged 30 / 16 / 6 | green hide set (40): +15 / +8 / +8 ranged, body ~20-30 blade defence |
| blackthorn shortbow (NEW, Ranged 30) | +29 attack, 33 strength, 4 ticks | 30: +29 bow with +31 arrows (our bow carries its arrows' strength: one arrow type) |
| duskwood shortbow (NEW, Ranged 40) | +45 attack, 44 strength | 40: +47 bow with +49 arrows |
| starweave hat / top / skirt (NEW, Magic 40) | +12 / +36 / +26 magic attack; magic def 6 / 18 / 12; ranged def 3 / 8 / 6; no blade def | 40 robes: +4 / +20 / +15 in 2004; ours carry more because our staves stay near +10 and plate now has a small plus (the one number above the ladder, see below) |
| storm staff / ember staff | +12 (was 22) / +10 (was 13) | 2004 staves are +10 at every level |
| glimmer robe top / hat | magic attack +5 / +3 (was 9 / 5); magic defence 15 / 8 (was 9 / 5) | wizard robes +3 / +2 attack; the defence keeps robes above plate against spells from level 15 |
| leather body / chaps / gloves / boots | magic def 6 / 3 / 1 / 1 (was 20 / 12 / 5 / 3, a pass-2 stopgap) | leather keeps a little magic out; the new ladder carries the rest |
| metal armour (ARMOUR_PROFILE) | magic defence helm +4, body +8, legs +6, shield +6 (a set +24; was the 2004 -1/-6/-4/-1) | the 2004 casting penalties stay (body -30 magic attack: you cannot cast in plate); the defence is still the lowest of the three sets (ranged sets +23 and +28, robes +36) |
| Fire Blast (NEW spell, 59) | max 16, fire 5 / air 4 / spark 1 | the 2004 book's last blast (59, 16); the Blender sprite already existed |

Result (`pass4/bench_pass4.md`: server engine, 100 fights per pairing, sides alternated, each style in its own
level's best gear; win rate of the favoured style, fight length mean (sd; 10th-90th percentile)):

| level | melee vs ranged | ranged vs magic | magic vs melee |
|---|---|---|---|
| 25, food | 73% (183 s, sd 25; 152-217) | 68% (116 s, sd 17; 93-140) | 84% (134 s, sd 23; 104-159) |
| 40, food | 67% (133 s, sd 20; 110-162) | 65% (82 s, sd 11; 69-96) | 68% (92 s, sd 14; 78-107) |
| 60, food | 69% (117 s, sd 24; 86-146) | 72% (75 s, sd 12; 62-90) | 61% (84 s, sd 12; 68-97) |
| 25 / 40 / 60, no food | 59 / 62 / 62% | 59 / 55 / 68% | 64 / 66 / 57% |

The underdog can win with good play (same file):
- prayer (only the underdog prays: protection plus its own stat prayers): at 25 (no protection prayers yet) the
  favourite drops to 58% / 68% / 68%; at 40 the underdog wins 63% / 94% / 71%; at 60 92% / 99% / 92%.
- armour: the blade that meets a mage in ranged armour: magic 84% -> 65% at 25, 68% -> 59% at 40, 61% -> 51% at 60.
- both sides praying protection: 60 in band (70% / 78% / 58%); at 40 the 2004 prayer order shows (Protect from
  Magic 37 and Missiles 40, Melee only at 43): the blade protects and nobody can protect from it, melee 95-96%.
PvM (section A): every style kills a monster of its level in 26-58 s with food (sd 8-15 s), 30/30.

Between the level points (`pass4/sweep_pass4_between.txt`, 60 fights, food), stated plainly:
- 20-60 the triangle holds with integer max-hit steps showing: at 20 melee beats ranged 92% (a level-20..23 archer
  hits 4, the aurel blade 5; from 24 both hit 5) and ranged/magic are even (50%); at 30 ranged beats magic 87%; at 50
  53% / 78% / 72%.
- **Below 20 magic is the strongest style** (level 10: magic beats ranged 80%, melee 100%; level 15: 98% / 93%), the
  2004 low-level mage: Earth Strike hits 6 at 9 and Fire Strike 8 at 13 while a level-10..15 blade or bow hits 3-4.
  No item within the ladders fixes it (the lever that fixed 25, metal magic defence, would have to rise far enough to
  break 40 and 60; a stronger leather set moves ranged 2% -> 17% at 15). The levers are the owner's: the strike
  spells' 2004 maximum hits, or level-10..19 weapons above the 2004 ladder. Left 2004-exact here.

| # | score | change |
|---|---|---|
| 1-14 | 0.5 each | re-run green (unit tests, server 78/78, live fingerprint = headless, PvM driver 40/40) |
| 15 | 0.25 | online part (rubber-banding) graded by the online agent |
| 16-18 | 0.5 each | unchanged |
| 19 | 0.5 | every favoured pairing wins 61-84% with food (55-68% without) at 25, 40 and 60; the underdog wins with prayer or the right armour; spread reported |
| 20 | online | graded by the online agent's run |

Total pass 4: **9.25 / 10** = every offline criterion at 0.5; the remaining 0.75 is online (15's online half, 20).
