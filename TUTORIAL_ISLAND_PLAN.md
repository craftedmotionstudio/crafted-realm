# TUTORIAL ISLAND — build plan + grounded system map (2026-07-04)

Spec: `TUTORIAL_ISLAND.md`. This doc = the 6-agent system map + the decomposition. Most
mechanisms already exist; this is mostly wiring + 5 new components. All file:line refs verified.

## WHAT ALREADY EXISTS (reuse)
- **Tutorial step-machine** — `Tutorial` obj `game4_ui.js:1006` (`steps[]{text,ev,match}`, `notify(ev,match)`, `banner()`, `finish()`). Extend the array; `tutorial_ext.js` is the splice template. Persisted as `tut:{step,complete}`.
- **Instruction banner** — `#objective` box, driven by `Tutorial.banner()`. Free.
- **Items** — `ITEMS` (string-keyed) `game1_data.js:8`. Grant via `Player.addItem(id,qty)` (auto-refreshes UI). EXIST: hatchet, tinderbox, fishing_net, raw_perch, cooked_perch, logs, pickaxe, copper_ore/tin_ore, bronze_bar, hammer, bronze_sword, worn_bow, arrows, air_rune+mind_rune (wind_strike), coins, wood_shield, bronze_helm/plate/legs.
- **Skill gates** (`Tutorial.notify`): chop→`gather/logs`, fish→`gather/raw_perch`, cook→`cook/cooked_perch`, mine→`gather/copper_ore`, equip→`equip/<id>`, kill→`kill/<typeId>` + `killStyle/melee|ranged|magic`, bank→`bank/open`. Firemaking/smelting/smithing have NO notify → gate on `Events.on('xp',e=>e.skill===...)` or produced item.
- **Smelt/smith pipeline** — `SMELTS`,`SMITHABLES`,`openSmelting`,`openSmithing` (`game3_systems.js:23-52,772,787`). Lowest 1-bar recipe = `bronze_sword`. Anvil/furnace are clickables `kind:'anvil'|'furnace'`.
- **NPCs** — combat via `spawnNpc(type,x,z)` (`NPC_TYPES`), friendly via `spawnFriendly(id,name,x,z,color,face,opts)`; dialogue = hand-written branch in `talkTo` `game4_ui.js:1056` calling `UI.dialogue(name,text,opts,face)`. Reusable GLB chars: guard v07→guide, ranger v17→survival, dwarf v13→mining, wizard v09→magic, soldier v18→combat. Chicken EXISTS (`pasturehen`). Enemy EXISTS (`grubkin`). Set `spawnNpc.force=true` around spawns.
- **Buildings** — `Buildkit.house({x,z,w,d,floors,doorSide,interior,shellOpts})` `buildkit.js:300`; interiors: house/pub/shop/bank/smithy/bedroom. Mage tower = `floors:2`+stone. Placement template `veyhollow_town.js:64`.
- **Underground layer** — `planes.js`: `Planes.addCave({x,z,hw,hd,y:-6,plane:-1})` = a cave room; `Planes.addClimb({down/up})` = ladder/trapdoor. Copy `map_showcase.js:24-45`. Caves live at FAR offset (e.g. 300,300), not under the island. Retag underground prop colliders `plane:-1`.
- **Bank** — `UI.openBank()`, `kind:'bank'`; tutorial bank chest example `tutorial_ext.js:49`.

## WHAT MUST BE BUILT (5 new components + wiring)
1. **NEW ITEMS** (`ITEMS`): `dough`(exists? no)→create `pastry_dough`? Use: `dough`, `bucket_flour`, `bucket_water`, `bread_dough`, + teleport tabs (`home_tab`, etc.). Small.
2. **BREAD COOKING CHAIN** (new module `cooking_bread.js`): combine flour+water+dough → `bread_dough`; use `bread_dough` on a `range` (kind:'fire' + range:true) → `bread`. Cooking is currently FISH-ONLY — this is net-new. Add a `Tutorial.notify('bake','bread')` hook.
3. **ANVIL GRID UI** (`ui_smith_grid.js`): icon grid matching `Anvil_Interface_for_Making_Items.jpg` — render `SMITHABLES[bar]` cells via `iconFor(id)` + name + "N bar(s)", green/dim by req, qty badge, bar-type tabs. Replace `openSmithing`'s text dialogue; keep the `Player.action={type:'smith',...}` contract.
4. **WORLD GUIDANCE ARROW** (`ui_guide_arrow.js`): a world-space beacon/arrow at the current tutorial target (clone `TileMarkers`/`_labelSprite` + edge arrow via `UI.worldToScreen`), driven off `Tutorial.step`. Banner text already exists; this adds the pointer.
5. **CHEF NPC** — no chef model. Build via `spawnFriendly` humanoid with chef-white color + hat, OR a new `humanoid` NPC_TYPES entry. Cheapest: friendly humanoid, white robe.

## WIRING (main session, eyes-on — cannot be headless)
- **Enlarge island**: override biome grid around `[158,141]` (water→grass) for a wider pad + widen the 18-tile flatten; place stations over the larger area. (Full fix = re-bake `Maps/*.png` via `tools/bake_worldgrid.html` — heavier, later.)
- **New Holm module** `tutorial_island.js` (self-booting like veyhollow_town): places 5 buildings, the pond+survival area, the trapdoor→cave, cave rooms (mining/smithing/combat), mage tower; spawns all NPCs; extends `Tutorial.steps` with the full station flow; adds `talkTo` branches; grants per-station kits; expands `finish()` starter inventory.
- **Starter inventory** (mainland): 25 coins, bread, wood_shield, bronze armour, air+mind runes, teleport tabs, + keep tools (hatchet/tinderbox/pickaxe/net), dagger/sword, bow+arrows, small food.

## DECOMPOSITION FOR AGENTS
Independent NEW-FILE components → parallel worktree agents (no shared-file conflicts):
 (A) ui_smith_grid.js  (B) ui_guide_arrow.js  (C) cooking_bread.js + new items  (D) chef NPC.
Shared-file, sequential, EYES-ON (main session): the `tutorial_island.js` state machine +
`talkTo` branches + island terrain + cave placement + starter inventory. Verify each station
in-browser (placement can't be verified headless). Gate/keep-only-if-obvious; log to PASS_LOG.

## KEY RISK
The tutorial core concentrates in a few files (game1_data.js, game4_ui.js talkTo/Tutorial,
game3_systems.js) + is a LINEAR state machine — NOT ideal for mass parallel edits (conflicts).
So parallelize the 4 independent modules; integrate the linear tutorial in the main session.
