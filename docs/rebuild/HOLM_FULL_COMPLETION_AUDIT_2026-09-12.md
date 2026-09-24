# Full-island completion audit — 2026-09-12

The new active goal includes finished buildings, player appearances, NPCs, all tutorial functionality and items.
Read this with the active checklist in `TUTORS_HOLM_COMPLETION_GOAL.md`. Previous NPC-free/graybox acceptance
is a useful baseline, not the new finish line.

## Verified baseline this session

Blender 4.5 exists locally. `node tools/test_world_v2.js` passes all current locks;
`node tools/validate_content.js` passes with 238 items, 30 NPC definitions, 10 shops, 10 quests and 14 zones.
Those NPC definitions do not imply tutorial populations are live. No fresh browser acceptance is claimed yet.

## Work sequence

1. **Reward integrity:** `tutorial_holm.js` sets departurePackClaimed before item delivery and ignores failures;
   `holm_departure.js` sails regardless. `Player.addItem` can partially insert a nonstackable quantity. Add an
   atomic pure-data inventory planner, integrate all-or-nothing pack delivery, retain departure on the Holm if
   capacity is insufficient, and test retry/reload/no duplication with real UI. Planner agent owns only
   `src/holm_reward_plan.js` and `tools/test_holm_reward_plan.js`; main owns runtime integration and browser QA.
2. **Tool recovery:** step grants mark delivery before success and no longer run at later lessons. Add a purposeful
   supply service that restores missing required tools without duplicating equipped/banked items or losing grants
   when the inventory is full. Cover net, tinderbox, pickaxe, hammer and hatchet.
3. **Finish building art:** Gatehouse/Bank are the next existing redesign pair. Resolve Guide Hall 8.8/8.9,
   Kitchen 8.9/9.0 and Lodge 8.8/8.8 gaps as well; a ticked art pass below 9.0 is not final asset acceptance.
4. **Canonical character:** preserve `assets/models/player.glb` (23-joint rig, seven material regions,
   attack/block/idle/walk). `male_default.glb` remains rejected. Approved reference is
   `Bible_References/Character/male_concepts/male_b_turnaround.png`. No checked-in humanoid Blender source was
   found by the audit. Establish an editable source/manifest and inspect in character Studio before replacing
   procedural character creation. Preserve gender/hair/beard/color choices and saved appearances.
5. **NPC lifecycle:** world-v2 has a spawns layer but no consumer. Legacy `npc_chars.js` is an attackable global
   population loader and `spawnFriendly` is procedural. Build a model-only chunk-owned lifecycle, first proving
   one non-attackable quest tutor at its authored socket with unload/reload, failure and dialogue persistence.
   Do not globally enable the unrelated legacy population. Then complete the island cast and practice enemies.
6. **Combat lessons:** melee/ranged/magic trials are `npcPhase` declarations, not functioning optional lessons.
   Supply practice equipment on-island; add styled-success recording based on actual attack events and preserve
   it after graduation. Cover ammo/rune consumption, interruptions, kills, respawns and streaming.
7. **Equipment and final QA:** inspect missing modeled torso apparel (`leather_body` uses procedural plate model),
   complete the family and verify equip/grip/animations. Expand route QA beyond its current coins/bread departure
   assertion to all pack items, bank deposit/withdrawal, full inventory, recovery, saves and all optional lessons.

## Discipline

Keep current uncommitted work intact; owner commits. Use small reversible modules, deterministic contracts,
Blender source plus structured visual proof, Studio journaled publication, real-pointer routes and foreground
smoke. No authoring gate or owner visual acceptance is asserted merely from production authorization.
