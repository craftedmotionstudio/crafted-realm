# TUTORIAL ISLAND — spec (user, 2026-07-04)

A full guided onboarding, OSRS-Tutorial-Island style. The current tutorial island is too
small — **make it bigger** and build the station-by-station guided flow below. Every step
MUST have guidance telling the player what to do next: an **arrow/marker indicator AND/OR a
text box** (both preferred). The player cannot skip ahead — each step gates on completing
the required action before the next unlocks.

## GLOBAL REQUIREMENTS
- **Guidance at every step** — a persistent instruction text box ("Objective: …") and/or a
  world arrow pointing at the next NPC/object. No step without guidance.
- **Gated progression** — advancing requires performing the actual action (chop, light, cook,
  mine, smith, kill, cast, bank…), not just talking.
- Bigger island landmass than current. Distinct buildings per instructor (own initial building
  for the guide, then separate houses). An underground cave layer for mining/smithing/combat.
- Items are granted by the relevant NPC at each station.

## STATION FLOW

1. **GUIDE (own initial building).** Intro. Points the player onward.

2. **SURVIVAL EXPERT (by a pond).** Gives: **hatchet, tinderbox, fishing net**.
   Tasks, in order (each gated): (a) chop a tree → logs; (b) use tinderbox on logs → light a
   fire; (c) use fishing net → catch fish; (d) cook the fish on the fire. Then proceed.

3. **CHEF (in a chef outfit, next house).** Gives: **a piece of dough, a bucket of flour, a
   bucket of water**. Task: combine into **bread dough**, then **use it on the range** to bake
   bread. Then proceed.

4. **QUEST GUIDE (another house).** Briefly explains the **quest system**. Then proceed.

5. **LADDER DOWN → LARGE UNDERGROUND CAVE.** Descend one layer into a big cave system.
   - **MINING INSTRUCTOR** gives **pickaxe**. Task: mine a few rocks → ore.
   - Use ore on the **furnace** → a **smelted bar**.
   - Guide gives a **hammer**. Use the bar on the **anvil** → opens the smithing interface
     (see `Bible_References/Anvil_Interface_for_Making_Items.jpg` — a "What would you like to
     make?" grid with bar costs). Player makes the **lowest-tier item the bar is a recipe for
     = a Dagger (1 bar)**.

6. **COMBAT GUIDE (further down the cave).** Walks through **equipping** the weapon. Task:
   equip the dagger, then **kill one low-level NPC** (melee). Return to the instructor, who
   gives a **simple bow + 25 low-level arrows**. Task: **range-kill another low-level NPC**.

7. **OUT OF THE DUNGEON → SURFACE.** Task: **open your bank account** (banks are reachable
   anywhere in Crafted Realms at specified banks — teach the banking interface).

8. **MAGE TOWER (friendly mages only).** **MAGIC INSTRUCTOR (wizard)** gives **basic runes**
   for the lowest-level mage attack. Task: **kill a chicken** with the spell.

9. **LEAVE TUTORIAL.** After the chicken, the player may leave. On leaving → **teleport to the
   Mainland**, and grant a **STARTER INVENTORY**: 25 coins, bread, a basic shield, basic armour,
   basic runes, a few teleport tabs, plus anything else sensible (e.g. keep the hatchet/
   tinderbox/pickaxe/fishing net tools, a small food stack, the dagger + bow/arrows).

### Phase-2 departure clarification (2026-07-13)

“Leave” is now a physical ferry interaction, not an automatic dialogue teleport. Completing every active
lesson unlocks the skiff at the eastern Departure Dock. The player follows the final marked path, boards the
boat, receives the starter inventory, and crosses into the Veyhollow mainland provider. The boat is deliberately
at the end of the island circuit rather than beside the spawn beach. `docs/rebuild/TUTORS_HOLM_FLOW_V1.md` is
the current topology, lesson-order, gate, save, and transition authority.

## REFERENCE IMAGES (Bible_References/, user-provided 2026-07-04) — the look to match
- `A_Tutorial_Island_Option.jpg` — overall: grassy island + sandy coast ringed by water; grey
  2-storey STONE guide house (yellow guidance arrow over it); central statue; crates/well/props;
  wooden walkways + stone stairs between areas; trees/flowers/fences dressing.
- `Tutorial_Island_Building.jpg` — guide house INTERIOR: grey stone multi-room, dirt floor,
  furnished (banquet table+candles, kitchen sink/counter, grandfather clock, chairs, chest,
  wall pictures, potted plants), wooden fence yard. Caption confirms the FLASHING YELLOW ARROW.
- `Tutorial_Island_Fishing_Spot.jpg` — pond w/ a sparkling fishing spot (arrow), survival
  expert nearby, grassy + fenced, trees. (Our HOLM_POND@[176,144] already matches.)
- `Tutorial_Island_Mining_Cave_&_Mining_Rocks.jpg` — underground: sandy floor, grey ore-rock
  CLUSTERS (pyramid crystals), a GLOWING FURNACE, multiple ANVILS, stalagmites, wall torches,
  ladder exit. Build via Planes.addCave + makeRock/makeFurnace/makeAnvil (+ torches).

## STATION LAYOUT on the enlarged island (R=21 around anchor [158,141])
Surface (grass): Guide house (grey stone, furnished) near spawn; central statue/props; Survival
by the pond [176,144] (fish spot + trees + chop tree + firemaking); Chef house (range inside);
Quest house; Mage tower (floors:2 stone) — spread across the new N/W land. A trapdoor drops to
the underground cave (Planes.addCave at a far offset, e.g. 300,300): mining rocks → furnace →
anvil (uses the new ui_smith_grid), then a combat area, then a ladder back up. Bank booth on the
surface for the banking step. NPCs (modelled, LAST) attach at each station.

## MAPPING NOTES
- Anvil interface: 1-bar items in the ref = Dagger, Axe, Sword, Mace, Med helm, Dart tips,
  Arrowtips, Knives, Wire, Nails. Tutorial forces/hilights **Dagger (1 bar)**.
- Skills exercised: woodcutting, firemaking, fishing, cooking, mining, smelting, smithing,
  melee, ranged, magic, banking — reuse existing skill handlers; the tutorial only GATES on
  their success events.

## SEQUENCING DIRECTIVE (user, 2026-07-04)
**NPCs LAST, and ONLY modelled (GLB) NPCs** — the game only wants NPCs that have been
modelled. Build order for now: **environment → land → items → buildings → UI**. All NPC
placement, dialogue, give-item, and task-assignment is deferred to the end and must use a
real GLB character model (reuse existing v## chars; build a chef GLB before using one).
Until NPCs land, stations exist as buildings+props+markers; wire the guided steps against
the environment/props first (talk-steps stubbed) and attach NPCs in the final phase.

## BUILD APPROACH (this loop)
Fan out agents (user opted in) for the self-contained parts: (A) tutorial state-machine +
guidance UI, (B) island terrain enlargement + buildings, (C) underground cave layer + ladder,
(D) NPC definitions + dialogue/give-item/assign-task, (E) anvil smithing interface, (F) per-
station step logic + item grants, (G) mainland teleport + starter inventory. Eyes-on placement
& verification stays in the main session (headless agents can't see the world). Gate each piece
in-browser; keep only if it works. Log to PASS_LOG.md.

## STATUS (2026-09-09)
- Environment → land → buildings are done for Tutor's Holm: all eight stations are complete Blender-built
  functional grayboxes and the required thirteen-step route plus the NPC-free optional lessons are proven playable
  with real pointer input (`tools/qa_holm_full_route.js`, `docs/rebuild/TUTORS_HOLM_FULL_ROUTE_QA_2026-09-09.md`).
- Still deferred per the sequencing directive above: modelled NPCs (tutors, chef, quest guide, combat instructors,
  mage) and the three kill trials; their sockets are authored in the buildings. Art acceptance of every building
  waits on the owner's fully-designed gate.
