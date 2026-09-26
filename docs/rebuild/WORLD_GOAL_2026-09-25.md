# World goal: from Tutor's Holm to an online 2004-style world (opened 2026-09-25)

## Owner direction (2026-09-25, summarised from the owner's own words)

- Keep iterating the game until it is an open world like 2004 RuneScape: all skills trainable, monsters, weapons,
  monster drops, a storyline that makes sense in the old-school format. A small first version is fine.
- "Definitely a high PvP focus": a Wilderness zone for PvP, PvM too. Combat "has to be perfect".
- Online, so people can join; a mobile version as well.
- Use as much 2004scape code as possible, and make it our own ("very close to it, slightly iterated").
- It must feel cozy, medieval and old-school, not "too polished". Icons are pictures (images or Blender models),
  never basic shapes, across the whole interface.
- Characters (latest review): OSRS stance, shoulders that merge into the arms, less blocky boots and feet.
  The statue's lantern arm must read as holding the light.

This goal supersedes the ordering in `docs/rebuild/SHIP_PLAN.md`, where online and PvP came after a single-player
launch. SHIP_PLAN's Phase 6/7 rules still apply: no client-authoritative item, XP, combat, position or currency
mutation once online, and PvP rules must be understandable before crossing the Ditch. Building authority first,
before the content grows, is also the cheaper order: every system written after this is born server-side.
`HOLM_FINISH_GOAL_2026-09-24.md` stays open inside this goal (W0) until the owner approves the island.

## Map vision (owner, 2026-09-26)

First lock in Tutor's Holm (fun end to end), then build the heartland like the 2004 one but our own: a spawn town with
a castle (our Lumbridge: Veyhollow Commons + Wardenholm Keep); south a swamp with a small town; east a desert town (our
Al Kharid); west a village (our Draynor); north a big walled city (our Varrock); and the Wilderness for PvP (ours: the
Scarlands beyond the Ditch, with a frontier bank). Big castles where needed, big towns with varied, unique building
shapes, story flow between regions, every OSRS building type and its function present in our own version (organised
our way), a long grindy open world where every skill trains somewhere, all Blender-built and old-school medieval.
Plan: docs/rebuild/WORLD_CONTENT_PLAN.md (regions, building/function catalogue, per-skill grind ladder, metal-tier
sources, build order), measured against docs/rebuild/WORLD_LAYOUT_GUIDE.md.

Also wanted: an optional first-person camera (feasible: the follow camera is yaw/pitch/distance, so first person is the
camera at head height with a wider field of view, the head hidden, mouse-look; click picking still works). Queued after
the combat branch merges (it owns movement in game5_main.js).

## Reuse of 2004scape (see `REFERENCE_2004SCAPE.md`, survey 2026-09-25)

| Piece | Licence | Use |
|---|---|---|
| `Server/src` engine (Lost City) | MIT | Port the World.cycle phase order, entity/queue/timer/interaction model, zone model, save format idea. Credit in THIRD_PARTY_ASSETS.md. |
| `data/src/scripts/**/*.rs2` | MIT logic mixed with Jagex names/text | Port the rules and formulas only (combat, PvP, death, drops, skills), never names, ids or text. |
| `rsmod-pathfinder` (npm `@2004scape/rsmod-pathfinder`) | ISC | Use as is in Node (and in the client later) with our own collision flags. |
| `Client2`, `public/client` | no licence, Jagex-derived | Study only. |
| `data/src/{models,maps,sprites,textures,songs,fonts,...}` | Jagex content | Never. |

Decision (default, owner may override): our own authoritative Node server following their structure, not their
engine. Their engine only loads Jagex-format binary packs, runs content in RuneScript and speaks the rs225 protocol.
Our Three.js client and a mobile client speak JSON over WebSocket to our server.

## Architecture (target)

- `shared/`: pure logic loaded by both the browser and Node (UMD pattern): combat formulas, XP table, PvP rules,
  drop-table rolls, item/NPC definitions. One source of truth; the client's offline mode and the server use the
  same code.
- `server/`: Node 24, `ws`, built-in `node:sqlite`, `node:crypto` scrypt. A 600 ms World.cycle with 2004scape's
  phases (world queue, client input, NPC events, NPCs, players, logouts, logins, zones, info, output, cleanup,
  autosave). Entities with queues/timers; 8x8 zones; per-tick deltas to clients within view distance.
- Collision: per-tile flags per plane, exported from our Blender navigation data (the Holm already exports
  navigation graphs); the server owns pathing, the client may predict.
- Accounts: username + scrypt hash; versioned save with checksum (modelled on the 2004 `.sav`: magic, version,
  CRC). Local dev database first; hosting is an owner decision (see Open decisions).
- Client: `?online=1` connects, logs in, sends intents (walk, op on npc/player/loc/obj, style, spell, chat, eat,
  equip), renders other players with the character kit, overhead chat, splats from server hit events.
  Single-player/offline keeps working until the online world replaces it.
- Mobile: the same web client, touch-first HUD, installable (PWA manifest + service worker), native wrapper later.

## Milestones

- [ ] **W0 Holm round 3** (owner review 2026-09-25): characters v3.0 (stance, shoulder-arm merge, boots/feet),
      ten tutors + portraits rebuilt, statue v4 (lantern grip); interface pass: every icon rendered from Blender
      models with a pixel finish, combat tab with pictures, medieval chrome, pixel font; world look: smooth-shaded
      textured terrain, our own low-res texture kit on buildings/props, pale textured water, black void past the
      draw distance (proved on the Guide House and survival camp, then rolled out). Owner approval closes the Holm
      goal.
- [ ] **W0b Holm v2 land** (owner 2026-09-26): more elevation and height across the island; a small recessed pond
      where fishing is taught, with fishing that is actually fun (old-school: moving spots, splash feedback, varied
      catches, rare finds); a watermill building with a turning wheel on the creek and a cozy garden terrace on a house
      overlooking it; medieval clutter for realism (broken carriage, carts, barrels, hay, woodpiles); all shaped by a
      study of how 2004/OSRS land, towns and distances are laid out (docs/rebuild/WORLD_LAYOUT_GUIDE.md), applied to
      the island and the mainland slice. Right-click must work like OSRS (Choose Option over every entity).
- [ ] **Coffee** (owner 2026-09-26): an energy-style drink in 4 doses that restores run energy and gives a slight
      extra boost; a Blender mug/flask model and icon, a way to make or buy it, server + client rules.
- [x] **W1 Combat core + server skeleton** (branch world-server-2026-09-25 087623f: 78 tests, 2-client PvP over ws, 50 bots 6.7 ms avg tick): `shared/combat` with 2004 formulas (0..max damage, ranged and magic
      strength handled separately, attack delay ticks, hit delays, retaliation, 8-tick single-combat lock),
      `shared/pvp` (Wilderness level, combat-level range, skull 2000 ticks, items kept on death 3/0 +1 Protect
      Item, logout lock, teleport block above level 20, single/multi), weighted drop tables. `server/` tick loop,
      entities, pathfinder, combat, PvP, death/respawn, saves, ws protocol, bot clients. Tests for every rule.
      The combat numbers lock is re-baselined once, deliberately, for the 0..max change.
- [ ] **W2 Online alpha**: two browsers log in, see each other in a Blender-built Scarlands pocket past the Ditch
      (Wilderness 1-10), walk, chat overhead, fight melee/ranged/magic under 2004 PvP rules, eat, pray, die, drop
      loot, respawn in Commons. Protection prayers and food delays are part of "perfect".
- [ ] **W3 Mainland proving slice** (GUIDING_LIGHT): Hollow Well Square + four Commons buildings, one
      Emberwood/Stonereach road, the Ditch, the Scarlands pocket; all Blender-made; bank, shops, monsters with
      weighted drops, respawns, aggression; server-owned.
- [ ] **W4 Skills to 19**: add Crafting, Herblore, Agility, Runecrafting to the existing 15; every skill has a
      place to train in the slice and an early ladder of items.
- [ ] **W4b Equipment and progression** (owner 2026-09-26: "once we lock in the characters we're going to need to build
      out all the weapons, all the armor, the animations, and realistic progression for creating and obtaining the
      different classes of armor"): every metal tier (copper → undercrag) as weapons and armour families in Blender on
      the locked body, per-weapon-category attack animations, and a believable ladder to get each tier (mining +
      smelting + smithing levels, monster drops, shops, quest rewards), balanced with the combat grade tables.
- [ ] **W5 Storyline**: the STORY_BIBLE arc as a quest chain from the Holm to the Scarlands (our own names and
      text), 5 launch quests, quest journal, rewards.
- [ ] **W6 Mobile**: touch HUD, tap-to-walk/long-press menus, installable PWA, phone performance budget.
- [ ] **W7 Closed online test**: hosting, backups, moderation basics, rate limits, a small group of players.

## Owner decisions (2026-09-25)

- Movement: 8 directions like 2004 (replaces the earlier 4-direction rule, island included).
- Backpack: 28 slots like 2004 (saves keep their items).
- Combat: exact 2004 rules as ported in shared/combat.js (replaces "keep combat/XP maths intact"); the numbers lock
  is re-baselined once for it.
- Eating: 2004 behaviour, eating cancels the attack order and delays the next hit by 3 ticks.

- Holm v2 land (2026-09-26, from docs/rebuild/WORLD_LAYOUT_GUIDE.md): departure haven moves to Beacon Cove below
  Lastlight (timber stair; old haven site becomes a farm); route tightened (cave passage climbs out in the keep, legs
  6-39 tiles, ~250 tiles total); mainland gets a Frontier Post bank booth 24 tiles before the Ditch.

## Open decisions for the owner (defaults in use until answered)

1. Hosting for the game server and database (default: build and test locally; the existing VPS is a candidate).
2. Accounts: username/password only for the alpha (default) vs email or third-party sign-in later.
3. Mobile store release (default: installable web app first, native wrapper later).

## Log

- 2026-09-26 owner review: login art like the 2004 login (stone hall, braziers, carved-stone logo, stone box; our own
  design); world still "too polished" (measured: ground ~25% too light, foliage textures 10-15x busier than the refs)
  -> look pass 2 + optional classic-pixel render; characters must stand upright/vertical like OSRS (kit v3.1) and all
  emotes must work; stance locked before the armour refit; then W4b equipment and progression.

- 2026-09-25: goal opened from the owner's direction; surveys of the codebase and 2004scape done; W0 characters
  v3.0 and interface agents started in worktrees (CraftedRealms-Chars, CraftedRealms-UI2); W1 server/combat agent
  (CraftedRealms-Server) and the world look-dev agent (CraftedRealms-Look) started.
