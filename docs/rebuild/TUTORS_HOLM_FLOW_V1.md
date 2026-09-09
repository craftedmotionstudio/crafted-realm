# Tutor's Holm compact curriculum v2

Date: 2026-07-18 (status updated 2026-09-09)
Status: Live graduation contract; every station is a complete functional-graybox building and the whole
required route is proven playable with real pointer input (`tools/qa_holm_full_route.js`, 20/20)

## Length rule

Tutor's Holm remains a broad, believable place, but graduation is now a compact 20–30 minute route. Buildings
that deepen the island are allowed to exist without becoming chores. A player may stay, explore, and complete
side lessons, but only thirteen real-success actions across five major destinations block the ferry.

## Required graduation route

1. **Guide Hall:** study the relief chart. This is the arrival/orientation action.
2. **Survival Workyard:** wield the hatchet, chop logs, light a fire, catch a fish, and cook it. The three marked
   trees beside the chop arrow (124,161 / 131,161 / 126,164) are provider-owned gather resources
   (`src/holm_survival_trees.js`, added 2026-09-09 when the route regression found no choppable tree).
3. **Mine Gatehouse and Training Cavern:** descend, mine copper and tin, smelt bronze, and forge a dagger. Since
   2026-09-09 the shaft stands inside the complete gatehouse (`holm_mine_gatehouse_v1`) at (124.5,119.5).
4. **Warden's Ridge:** open the bank once so account storage is understood. Since 2026-09-09 this happens inside the
   complete Holm Bank (`holm_bank_v1`) at a teller booth or the vault chest.
5. **Lastlight:** climb the lighthouse and relight the beacon. This signals the mainland ferry and completes
   the curriculum.

The required route contains thirteen steps. Every step is tied to a real interaction or successful skill action;
walking into an area alone never grants credit.

## Optional island content

- **Teaching Kitchen:** bread-making extension. Live since 2026-09-09 as a complete building (`holm_teaching_kitchen_v1`);
  the bake is recorded in the save's `tut.optional.bake_bread` and never gates the ferry.
- **Quest Lodge:** story and quest explanation. Live since 2026-09-09 as a complete building (`holm_quest_lodge_v1`);
  the board study opens the journal and records `tut.optional.learn_quests`; the modeled guide's socket is reserved.
- **Combat Hall:** melee and ranged practice when modeled practice NPCs are authorized. Live since 2026-09-09 as a
  complete building (`holm_combat_hall_v1`); the cavern exit ladder surfaces inside its drill tower at 176.5,116.5,
  the pell study opens the combat tab NPC-free, and the trial sockets are authored for the deferred practice enemies.
- **Mage Tower:** basic magic practice when its modeled practice target is authorized. Live since 2026-09-09 as a
  complete building (`holm_mage_tower_v1`); the rune table study opens the spellbook NPC-free, and the trial's
  `casting_socket` is authored inside the casting circle for the deferred practice target.
- **Holm Bank building depth:** richer banking service and stories beyond the one required open-bank action.
- **Lastlight Underkeep:** exploration and later quest material, not a graduation requirement.

These five authored lessons remain in the curriculum data as optional content. They do not prevent departure.

## Departure law

- The boat is a chunk-owned `holm_departure` interaction with **Board** as its primary click.
- Before graduation, the lesson-lock repeats the current required objective.
- Relighting Lastlight completes the curriculum, hides the objective, saves progress, and unlocks the boat.
- Boarding walks to the authored pier tile, grants the starter pack once, activates the Veyhollow Commons
  provider, and lands at the mainland ferry landmark.
- Saves record both curriculum revision and stable lesson id. Incomplete revision-4 saves migrate by lesson
  meaning; the removed mandatory bread step advances to the cavern descent instead of landing on a wrong index.

## Completion state (2026-09-09)

- Every reservation pad is a complete Blender-built building: Guide Hall, Survival Workyard, Teaching Kitchen,
  Quest Lodge, Mine Gatehouse, Holm Bank, Combat Hall, Mage Tower (closeouts under `docs/rebuild/*_V1_2026-09-09.md`).
- The thirteen required lessons, `bake_bread`, `learn_quests` and the skiff are driven end to end with real mouse and
  DOM input by `tools/qa_holm_full_route.js` (report `docs/rebuild/TUTORS_HOLM_FULL_ROUTE_QA_2026-09-09.md`).
- Standing gates: `node tools/test_world_v2.js`, `node tools/validate_content.js`, `node tools/run_smoke_headless.js`,
  the per-building `tools/qa_*.js` drivers, and the full-route driver.

## Open owner decisions

- **Art acceptance:** all eight buildings are functional grayboxes held below 9.0 on their compare sheets; the owner's
  §2.1 fully-designed gate is still open for each.
- **NPC authorization:** modelled NPCs only, added last. Their standing sockets are authored without geometry
  (`quest_guide_socket`, `melee_dummy_socket`, `ranged_target_socket`, `casting_socket`); the three kill trials stay
  optional and NPC-phase until the owner authorizes the practice enemies.
- **Studio workspaces:** the six 2026-09-09 buildings are not yet Studio building-bundle workspaces; the Workyard
  and district bundles are recompiled and lock-checked.
