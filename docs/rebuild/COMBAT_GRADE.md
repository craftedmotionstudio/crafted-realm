# Combat grade (owner bar: 9.5 / 10, "fun and like old-school RuneScape")

Owner (2026-09-25): "Make sure to test the combat logic using all types of combat, ranged, mage, melee. Also make sure
it works against PvP and PvM. Perform multiple passes until you think you've achieved a grade of 9.5/10. We want it
to be fun and like old-school RuneScape."

Every pass scores all 20 criteria below (0, 0.25 or 0.5 each; 20 × 0.5 = 10), for BOTH PvM and PvP where they
apply, and for EACH style (melee, ranged, magic). A criterion only scores 0.5 when its evidence exists: a test,
a measured number, or a capture/sheet that shows it. Record each pass in the log at the bottom with the evidence
paths and what was fixed. Stop only at ≥ 9.5 with no criterion below 0.25.

## A. Correctness (the 2004 rules, `shared/combat.js`, `shared/pvp.js`)
1. Accuracy rolls per style and stance match 2004 (golden tests + a 10,000-roll simulation whose hit rate matches
   the formula within 1%) for melee (stab/slash/crush), ranged, magic; PvM and PvP.
2. Max hit and damage 0..max per style (strength bonus for melee, the bow/arrow strength for ranged, the spell for
   magic); simulated damage distribution is uniform on 0..max.
3. Attack speeds per weapon (daggers/swords 4, 2h 7, bows by type, rapid −1, magic 5) measured in ticks in-game.
4. Hit delays: melee lands on the next turn; arrows and spells land by distance exactly as ported; the splat
   appears when the projectile arrives (measured frame/tick).
5. Retaliation and auto-retaliate timing, the 8-tick single-combat lock, "already under attack" messages.
6. Eating: 3-tick bite, +3 ticks to the attack timer, cancels the attack order (owner decision); combo rules if any.
7. Prayers: stat prayers change rolls; protection prayers block NPC hits fully and cut player hits by 40%; drain;
   Protect Item.
8. PvP rules: Wilderness level, combat-level range, skull (2000 ticks), items kept on death (3 / 0 skulled / +1),
   loot to the most-damage killer, logout lock, teleport block above 20, single vs multi zones.
9. PvM rules: aggression (ignore above 2× level outside the Wilderness), leash/max range, respawn, weighted drop
   tables, loot ownership timers, XP per damage for each style and stance.

## B. Feel and readability (in the browser, at the default camera)
10. Every attack has its animation (per weapon category and style), and the hit lands on the impact frame.
11. Arrows and spells fly visibly from the hand to the target, timed to the splat; misses read (blue 0, splash).
12. Hit splats, HP bars, XP drops and sounds are readable at 1538×900 and on a phone-sized window.
13. Death reads (fall, lie, sink; loot appears); the player's own death and respawn read and explain what was kept.
14. Controls: click-to-attack follows and closes distance correctly for each style (melee adjacent, ranged/magic in
    range with line of sight); right-click "Attack <name> (level-N)"; switching style/spell/prayer/food mid-fight
    responds on the next tick.
15. Diagonal (8-direction) movement and pathing around obstacles work in fights; no rubber-banding online.

## C. Fun (old-school feel)
16. Weapon variety: every tier and weapon family has its own speed/stance set; bows and staves feel different from
    melee; at least one special attack per family that has one, with the spec bar.
17. Monster variety in PvM: melee, ranged and magic monsters, an aggressive pack, a tougher "boss-like" foe, each
    with readable attack animations and fair telegraphs; drops worth fighting for.
18. PvP tension: Ditch warning, skull icon, Wilderness level shown, risk/reward (kept items preview), food and
    prayer switching matter; a fight between two equal players lasts a sensible time (measured).
19. Balance: time-to-kill tables per style and tier (PvM and PvP) are in a sensible band; no style dominates
    (simulated matchups: melee vs ranged vs magic at equal levels).
20. Online robustness: two or more real browser clients fight each other; server-authoritative results; no
    desyncs, double hits or lost loot across 20 fights; reconnect mid-fight keeps the logout lock.

## Log
