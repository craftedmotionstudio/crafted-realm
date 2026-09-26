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
