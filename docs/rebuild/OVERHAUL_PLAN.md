# Crafted Realm world-v2 overhaul decision

Date: 2026-07-13

> **Supersession note (owner, 2026-07-13):** statements below that freeze the current minimap appearance
> or macro-map source are obsolete. Preserve working map functions during migration, but redesign the
> final appearance and topology around the authored four-region launch world. `SHIP_PLAN.md` and
> `GUIDING_LIGHT.md` hold the current decision.

## Decision

Rebuild the **world runtime, world composition, buildings, tutorial, and opening story**. Do not
delete or fork the working RPG foundation. The current world remains available as a legacy reference
until world v2 reaches feature and save-safety gates.

The practical interpretation of “start fresh” is:

- start fresh with what is loaded, where it is placed, how it is streamed, and why it exists;
- preserve systems whose rules already define Crafted Realm;
- preserve the current minimap presentation and both relevant source images;
- preserve good final assets, but require every reused asset to earn a place in the new slice;
- exclude legacy self-placing modules entirely from the v2 manifest rather than letting them wake up
  and then trying to suppress them.

## Why the game freezes

The reported Page Unresponsive state was reproduced after Play. The repository supports a direct
architectural explanation:

1. Before the welcome screen, the game builds a 60,501-vertex full-map terrain, populates distant
   regions, and scans all 153,600 tiles for collision on the main browser thread.
2. The loading percentage is a series of fixed labels and delays, not measured completion.
3. Play sets `running=true`, releasing at least 32 synchronous world-building callbacks clustered
   between roughly 1.5 and 2.6 seconds after entry.
4. The entry overlay's own comments describe this as a “real render freeze.” The overlay cannot
   keep the browser responsive when the main thread is blocked.
5. Once running, simulation and minimap work continue to scan whole-world arrays every frame.

The freeze is therefore not reasonably attributable to Hollow Well Square, NPCs, or one bad model.
It is the accumulated result of a whole-world, side-effect-driven loading architecture.

## Preserve

- OSRS-exact combat math and XP curve.
- One world unit per tile, four-direction movement, deterministic tick rules, and tile BFS.
- Player, inventory, equipment, bank, skills, gathering, production, prayer, magic, and item data.
- Interaction dispatcher, intents, scheduler, plane/cave support, validators, and smoke-test concepts.
- Current minimap bezel, size, compass, dots, destination marker, rotation, and click-to-walk behavior.
- `Maps/Crafted Realms Map.png` as the canonical macro-geography source.
- `Bible_References/UI_OpenMiniMap.jpg` as the likely original minimap/UI visual reference.
- The existing 8x8 chunk data/editor substrate as the seed of the v2 authoring format.
- Final, audited modelled assets and the Studio/reference library as sources.

## Replace or retire from v2

- Monolithic full-map terrain and full-map collision bake.
- Self-starting region/prop timers and construction tied to the global `running` flag.
- The current `populate*` ownership model and direct global scene mutation by every content file.
- Whole-world resident simulation and per-frame minimap scans.
- Existing regional placements, small prefab civic buildings, random settlement scatter, and
  decorative objects with no functional or compositional purpose.
- Tutor's Holm's current checklist layout and monkey-patched tutorial integrations.
- Opening quests whose identities and coordinates are coupled to the old world.
- Raw, backup, and experimental GLBs from the production manifest. Archive them; do not delete them.
- Timer-based progress and an overlay that reaches completion without proving control.

## Target architecture

World selection goes through a single `ActiveWorld`/`WorldProvider` seam. The legacy adapter wraps
today's world. The v2 provider owns:

- a versioned map/coordinate contract;
- an explicit asset manifest and real asset promises;
- one measured `BootCoordinator` with named jobs and long-task telemetry;
- 8x8 authored world chunks and a small resident ring around the player;
- chunked terrain, collision flags, placements, interactions, and deterministic disposal;
- shared geometry/material caches and instancing for repeated non-interactive scenery;
- a cached minimap base plus bounded dynamic updates;
- versioned, isolated saves migrated by named landmarks rather than assumed coordinates.

The Play overlay closes only when the spawn chunk and safety ring are ready, the player has rendered,
input has been acknowledged, and a real four-direction path succeeds.

## Product definition

Crafted Realm is a cozy, account-driven frontier RPG where players choose how to become useful to
Veyhollow: train skills, make and eventually trade goods, explore dangerous country, fight for
valuable drops, solve quests, and turn rewards into personal power and a stronger settlement before
the next Scarring Surge.

The OSRS-like quality comes from readable routes, persistent account progress, banks and supplies,
economic interdependence, deliberate risk, rare drops, memorable quests, and the freedom to choose
the next goal—not from copying OSRS geography or filling a giant map.

## Proving slice: First Bell at Veyhollow

Build one connected 45–75 minute first-session loop:

1. A short, story-led Tutor's Holm arrival.
2. Hollow Well Square as a social and civic landmark.
3. Four large functional Commons buildings: bank, smithy, provisions kitchen/shop, and ward hall
   or pub.
4. One authored road with an Emberwood logging spur and Stonereach mining spur.
5. One preparation threshold at the Ditch.
6. One compact Scarlands risk/reward pocket.
7. A three-chapter opening quest connecting the wreck shard, Hollow Well, broken ward-lines, and
   evidence beyond the Ditch.
8. Two complete production chains and at least one reliable Crown route.

NPC modelling, spawning, placement, and encounter wiring remain deferred until explicitly approved.
The environment and services must be testable without placeholder NPCs.

## Building and landscape acceptance law

Every core building must have:

- a primary service, secondary use, and story clue;
- a frontage readable from the route the player uses;
- an interior large enough for camera, four-direction pathing, interactions, and future players;
- at least two useful interactions;
- one believable support space such as storage, office, yard, hearth, loading area, drain, or back
  entrance;
- working roof-off visibility, interaction tiles, doors, counters, and collision.

Every landscape object must justify itself through navigation, use, ecology, occupation, story, or
composition. Roads, worn ground, deliveries, drainage, yards, sightlines, and thresholds should
explain how a place works before decorative density is added.

## Scarring Surge direction

Use fixed, authored civic project sockets instead of Minecraft-style arbitrary construction.
Players can contribute logs, bars, food, runes, and other processed goods to choices such as gate
braces, ward braziers, supply racks, kitchens, or Well devices. This gives Mining, Smithing,
Woodcutting, Cooking, Prayer, and Magic a settlement-scale purpose while preserving authored streets,
collision, and camera readability.

The event should be forecast, opt-in or milestone-triggered in single-player, never punish offline
absence, and never permanently destroy banked progress or core services.

## Delivery sequence

### 0. Preserve and measure

- Keep the dirty Hollow Square work intact.
- Establish a clean baseline commit/branch before the risky runtime refactor.
- Add measured phase/long-task/object telemetry to the current boot.
- Keep the legacy world selectable and its saves untouched.

### 1. Fast v2 shell

- Add the provider seam and v2-only manifest.
- Load the login/title shell without constructing a world.
- Prove one empty authored chunk, player control, minimap, save isolation, and pathing.

### 2. Real chunk runtime

- Chunk terrain and collision.
- Centralize job scheduling with a per-frame construction budget.
- Add load/unload/dispose ownership, shared materials/geometries, and minimap caching.

### 3. Author the proving slice

- Build paths and functions first, then buildings and landscape in the Studio.
- Integrate only through placement data—never new self-starting scripts.
- Gate every chunk independently for pathing, purpose, visuals, and performance.

### 4. Make the first hour coherent

- Add production/economy flows, bounded shops, sinks, save migration, quest state, and route unlocks.
- Rewrite Tutor's Holm and the opening quest spine.
- Add NPC content only after explicit authorization.

### 5. Expand and go online later

- Expand one purposeful road/region at a time.
- Real player trade, Exchange, shared PvP, and shared surges require an authoritative server. Do not
  fake them with client-only state.

## Hard gates

- No Page Unresponsive dialog in five consecutive cold starts.
- Play to first controllable frame: target 0.75–1.5 seconds; hard failure above 2.5 seconds on the
  agreed baseline profile.
- No boot task above 250 ms; target zero above 100 ms.
- Only the spawn chunk and safety ring are resident at first control.
- Spawn view stays below 800 draw calls, 900k triangles, 250 unique materials, and 300 MiB JS heap;
  target substantially below each ceiling.
- No chunk boundary frame above 150 ms.
- Current minimap appearance and interaction remain recognizable and intact.
- A real out-and-back four-direction walk succeeds immediately after control.
- Combat/XP/content validators remain green.
- Content expansion stops whenever startup, traversal, save safety, or economy integrity fails.

## Immediate next implementation

Do not delete world files. First preserve the current state, then create the provider seam and a
v2 boot path that loads only the shell, player, minimap, and one empty Tutor's Holm chunk. That is
the smallest test that proves the overhaul can make the game responsive before new world art is
added.
