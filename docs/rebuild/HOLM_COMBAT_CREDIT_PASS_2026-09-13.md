# Combat lesson attack attribution — 2026-09-13

Previous pass was progress: quest-board success/save ordering repair. This pass fixes an existing combat event seam needed for the restored melee/ranged/magic lessons. It does not create those teaching encounters or activate the full curriculum.

## Implementation

`applyHit` now passes the killing hit's style to `killNpc`, derived from its XP token: Attack/Strength/Defence/Shared are melee, Ranged/RangedDef are ranged, Magic/MagicDef are magic. Projectiles already retain this token at launch and pass it through on impact. `npcKilled` retains its existing `npc` field and adds `attackStyle`; calls without attribution emit null. The tutorial listener accepts only recognized styles from this payload, rather than reading current equipment. Administrative and other unattributed kills cannot grant a styled lesson.

Damage, accuracy, maximum-hit formulas, XP calculations and the XP table are unchanged. Other inspected event subscribers destructure `npc`, which remains intact. Index versions are game3_systems g14 and tutorial_ext v2; events.js documents the additive payload.

## Verification

- Syntax checks PASS for both edited executable modules.
- `node tools/test_combat.js`: combat math and canonical XP curve lock PASS.
- `node tools/test_holm_combat_credit.js`: **28/28 PASS**. Actual-function VM suite covers all eight XP tokens with switched current equipment, exact XP calls, unknown/missing attribution, administrative kills, completed tutorial, nonlethal/zero hits and the separate duel path. Four cases execute actual updateProjectiles through applyHit/killNpc and the actual tutorial listener with ranged/magic tokens and current equipment set to melee. A source assertion checks launch token capture; playerAttack launch itself is not dynamically exercised.
- Foreground in-app smoke **105/105 PASS**, boot 817 ms, actual walk 3566 ms, six streaming boundaries with exact/lossless save-load, 60 FPS, worst frame 21 ms, 125 draw calls, 34,270 triangles, six ticks, zero console/uncaught errors. Evidence: `scratchpad/holm_perf/combat-credit-smoke.json`.

## Remaining acceptance

Controlled function tests and ordinary smoke do not prove a real-pointer in-flight equipment-switch combat scenario. Full encounter provenance still needs provider/target identity restrictions for the actual tutorial actors. Modeled/animated teaching targets, transactional equipment/rune recovery, guidance, full 18-lesson activation and save/reload playthrough remain unfinished. No visual acceptance or world-authoring publish occurred. Full island goal remains active.
