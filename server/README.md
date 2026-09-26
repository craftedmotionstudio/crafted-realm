# Crafted Realm game server (W1)

The authoritative online server for Crafted Realm: a 600 ms tick world in Node 24 that owns movement,
combat, items, experience, deaths and saves. Clients send intents over WebSocket and draw what the
server tells them (`docs/rebuild/NET_PROTOCOL.md`). Structure and rules follow the 2004 game as
reconstructed by Lost City's 2004scape (MIT); every name, text and map here is our own.

## Run it

```
npm install                    # ws + @2004scape/rsmod-pathfinder (plus the repo's existing dev deps)
npm run server                 # listens on CR_PORT (default 43594); GET /health for monitoring
npm run test:server            # every server and shared-rules test (node:test), ~10 s
npm run bots -- --bots 50 --seconds 120      # soak: 50 bots fighting over ws, prints tick timing
```

Environment: `CR_PORT` (port), `CR_DB` (sqlite file, default `server/data/runtime/world.db`),
`CR_SAVE_KEY` (save-signing secret, 32+ chars; otherwise one is generated into
`server/data/runtime/save.key`), `CR_LOG=debug` (also log chat, pickups, npc deaths). The runtime
folder is git-ignored; back up `world.db` and `save.key` together (saves signed with a lost key will
not load).

## Play the online alpha locally (W2)

```
python tools/serve_static.py 8100 .                      # the game client (static files, 127.0.0.1 only)
set CR_PORT=8200 && npm run server                         # the world (PowerShell: $env:CR_PORT=8200; npm run server)
open http://127.0.0.1:8100/?online=1                       # a second browser / window = a second adventurer
```

`?online=1` connects to `ws://<page host>:8200` (`&server=ws://host:port` for another world). Create an account on
the login screen; new adventurers start in the Commons at the map's alpha levels (`map.alpha.startStats`, combat
level 51, Prayer 43) and take a fighting kit (melee, ranged or magic) from the supply chest beside the campfire. Walk
north over a Ditch crossing into the Scarlands (Wilderness 1-10) to fight. Without `?online=1` the game is the
offline single-player build, unchanged. The server listens on 127.0.0.1 unless `CR_HOST` says otherwise.

The client side lives in `src/online_*.js` + `src/net_client.js` (loaded only in online mode by `src/online_boot.js`):
`online_world.js` (the map as the old-school world, or the Scarlands art kit when the map names a `placement`,
`online_kit.js`), `online_actors.js` (other adventurers with the character kit, monsters, loot, tick interpolation),
`online_fx.js` (swings, splats and projectiles timed to the server's hits), `online_ui.js` (login, panels, PvP
interface), `online_main.js` (glue, intents, QA hooks). Tests: `node tools/test_online_client.js` (unit),
`node tools/online_multi_browser.js` (three real browsers, 20 fights; needs the static server on 8100; starts its own
world on 8201), `node tools/online_pvp_balance.js` (kit matchups and PvM time-to-kill).

## Layout

```
shared/                 pure rules, UMD (browser global CRShared.* and Node require)
  combat.js             accuracy, max hit, styles by weapon category, bonuses, prayers, delays,
                        combat level, xp split, eating, special-attack hook
  pvp.js                wilderness level, attack eligibility, single/multi, skulls, kept items,
                        Protect Item, logout lock, teleport block, hero
  drops.js              weighted random(128) drop ladders, shared tables, loot timers
  xp.js, rng.js, movement.js   xp curve (tenths), seedable RNG, run energy
server/
  index.js, app.js      entry point / assembly (database, accounts, saves, world, socket server)
  engine/World.js       the tick and its phases, spawning, ground items, login/logout
  engine/Player.js      a player: stats, pack, gear, timers, interactions, movement, saving
  engine/Npc.js         NPC AI: wander, leash, hunt, respawn
  engine/PathingEntity.js   stepping along checkpoints, entity queues (2004 countdown rules)
  engine/combat.js      player/NPC/PvP attack flows, damage, retaliation, deaths, drops
  engine/input.js       every client intent, validated
  engine/info.js        the per-tick delta each client receives (15-tile view)
  engine/CollisionMap.js    our collision JSON loaded into rsmod-pathfinder
  engine/ZoneMap.js, coord.js, GroundItem.js, HeadlessSession.js
  content/GameData.js   loads src/game1_data.js + src/magic_spells.js (+ SPECIALS) in a vm sandbox
  persist/              Database (node:sqlite), Accounts (scrypt), SaveCodec (signed JSON), PlayerStore
  net/                  WsServer + Session, Protocol (names, shapes), RateLimiter
  data/maps/scarlands_test.json   the W1 test map;  data/drops.json   drop tables
  test/*.test.js        the test suite;  tools/bots.js, tools/BotClient.js   soak + scripted client
```

## The tick (World.cycle)

Same phase order as the 2004 engine (`src/engine/World.ts` in Lost City):

1. world queue (scheduled work) and NPC hunting
2. client input (up to 10 intents per player; eating/equipping act immediately)
3. NPC spawn events
4. NPCs: respawn, hunt target, regen, queue (damage, retaliation, death), movement / attacks
5. players in pid order: death timer, queue, timers, interaction and movement, run energy
6. logouts (logout lock, x-log timeouts) 7. logins 8. ground items reveal / despawn
9. build each client's delta 10. send 11. clear per-tick masks; autosave every 1500 ticks

The real-time loop is drift-corrected like the engine: the next cycle is scheduled at
`tickMs - cycleTime - lateness`. Tests call `world.cycle()` directly with a seeded RNG, so every
fight in a test is reproducible.

### Queues and hit timing

Hits are queued exactly like 2004 scripts queue them, with the engine's two countdown rules: a
player queue entry with delay d runs on the (d+1)th pass; an NPC queue entry runs on pass max(1, d).
So, from the tick T of the swing:

| Attack | Lands |
|---|---|
| player melee on an NPC | T+1 (the NPC's next turn) |
| player ranged on an NPC at distance d | T + floor((46 + 5d + 30) / 30) |
| player magic on an NPC at distance d | T + floor((46 + 10d) / 30) + 1 |
| player on player | melee: 0, ranged: floor((46 + 5d) / 30), magic: floor((46 + 10d) / 30) + 1 ticks, landing that tick if the target's pid is higher, one tick later if lower (the 2004 PID effect) |
| NPC melee on a player | the same tick (NPCs act before players) |
| NPC ranged / magic on a player | T + floor((32 + 5d) / 30) / T + floor((46 + 10d) / 30) |

### Soak numbers (2026-09-25, this Windows dev machine, bots in the same process)

| Bots | Real time | World.cycle avg / p50 / p95 / p99 / max (ms) | Sent per tick |
|---|---|---|---|
| 50 (25 PvP, 25 PvM) | 300 s, 550 ticks at 600 ms, 19 PvP kills | 6.7 / 5.7 / 11.8 / 27.7 / 91.8 | ~19 KB |
| 100 | 120 s, 300 ticks | 11.7 / 11.1 / 21.7 / 52.1 / 68.7 | ~63 KB |

The budget is 600 ms. Most of the cost is building and serialising the per-client deltas (`info`,
`clientsOut`), which grows with players-in-view squared; the occasional spikes are GC / OS jitter.

## Collision map format (`server/data/maps/*.json`)

```json
{ "format": "crafted-realm-map", "version": 1, "name": "...", "level": 0,
  "bounds": { "x1": 0, "z1": 0, "x2": 63, "z2": 127 },          // inclusive; outside is solid
  "respawn": { "x": 32, "z": 10, "radius": 2 },
  "blocked": [[x1, z1, x2, z2], ...],   // solid tiles (block walking AND projectiles): rocks, trees, buildings
  "water":   [[x1, z1, x2, z2], ...],   // unwalkable floor that arrows still cross: water, the Ditch
  "walls":   [[x, z, "N"], [x1, z1, x2, z2, "E"], ...],   // a wall on that side of each tile (N/E/S/W)
  "flags":   [[x, z, mask], ...],       // optional raw rsmod collision masks
  "areas": { "wilderness": [rects], "multi": [rects], "named": [{ "name", x1, z1, x2, z2 }] },
  "spawns": [{ "npc": "gnarlgob", "x": 30, "z": 52, "wander": 5, "hunt": 3, "maxRange": 7 }] }
```

North is +z. The Wilderness level of a tile in a wilderness rect is `floor((z - z1) / 8) + 1`.
The Blender/Holm navigation export should produce this file (W2/W3).

## Saves and accounts

- Accounts: `username` (1-12 chars, case-insensitive), password hashed with scrypt
  (`scrypt$N$r$p$salt$hash`, N=32768 r=8 p=1), compared in constant time, hashed off the tick.
- Saves: `{magic:"CRSAVE", version, body, mac}` where `body` is canonical JSON of the player (position,
  xp in tenths and current level per skill, 28-slot pack, gear, settings, run energy, skull ticks
  left, playtime) and `mac` is HMAC-SHA256 with the server secret. A save that fails the check is
  refused at login (`save_invalid`). Older versions upgrade through `SaveCodec.MIGRATIONS`. The last
  five saves per account are kept in `save_log` for restores.
- Saved on logout, every 15 minutes and at shutdown.

## Content

`GameData` evaluates the client's own data files (`src/game1_data.js`, `src/magic_spells.js`, and
`SPECIALS` from `src/game3_systems.js` when that file still evaluates headlessly) in a Node `vm`
sandbox, the same way `tools/validate_content.js` does, then deep-freezes the result. There is no
copy to drift: edit an item or monster for the client and the server simulates that item or monster.
Monsters without an entry in `server/data/drops.json` keep their inline drop lists, converted exactly
(`drops.fromLegacy`). NPC `respawn` values in the client data are seconds; the server converts to
ticks.

## Where the rules came from

Every ported rule cites its source script in the file header or next to the code (Lost City
2004scape, MIT, `data/src/scripts/**` for content rules and `src/engine/**` for engine behaviour;
RS Mod's rsmod-pathfinder, ISC, for paths and line of sight). Credits are in `THIRD_PARTY_ASSETS.md`.

## Rules that differ from the current offline client (`src/game3_systems.js`)

The server follows the 2004 rules; the offline client still uses its own. W2 switches the client's
online mode (and later its offline mode) to `shared/`, and re-baselines `tools/test_combat.js` once.

- Damage on a successful roll is 0..max (client: 1..max), for players and monsters.
- Hit odds are identical (the client's closed-form chance equals the two-roll comparison), but the
  server rolls the two numbers like 2004.
- Magic accuracy: effective magic gets the 2004 +1 style bonus and no flat +10 bonus (client adds 10
  to the magic bonus). Magic defence blends 70% magic and 30% defence (client: defence only).
- Ranged max hit uses the ranged level with its style bonus and RANGED strength only (the bow's
  strength; client: melee strength total including amulets, no style bonus). Ranged prayers now apply
  to ranged accuracy.
- Monster rolls use level + 9 (client + 8): monster max hits rise by up to 1 (e.g. skeleton 2 -> 3).
- Melee styles come from the weapon's category (2004 tables, e.g. a sabre: Chop/Slash/Lunge/Block)
  instead of one fixed Stab/Pound/Slash/Block set.
- Hits land on 2004 queue timings (melee next NPC turn, ranged/magic by distance); the client applies
  melee instantly and projectiles after a fixed flight.
- Retaliation waits floor(attack speed / 2) ticks and never interrupts walking or another action;
  NPCs flinch the same way.
- XP: magic gives 2 xp per damage plus the cast xp (client 4 per damage); controlled 1.33 each
  (client 1.34); no Defence xp for being hit; amounts are exact tenths, not rounded up.
- Eating: one bite per 3 ticks, +3 ticks on the attack timer, allowed at full health, and it drops
  the current attack order (client: instant, refused at full health).
- Death: 3 single units kept (a stack gives one unit), 0 when skulled, +1 with Protect Item (new
  prayer, level 25); the killer owns the pile for 100 ticks, gone after 200 (client: 3 whole stacks,
  no skulls, 180 s).
- Prayer drain uses the 2004 drain-effect counter (steel skin/ultimate strength/incredible reflexes
  drain like the protection prayers: 1 point per 3 s; client 1 per 5 s).
- Run energy is the 2004 per-tick model (much slower regeneration than the client; no Holm pacing).
- Movement is 8-directional; the pack has 28 slots (client 24); autocast needs a staff; arrows are
  taken from the pack as in the client (a quiver slot is optional later).
- Not yet on the server: curse spells (confuse/weaken), boss scripts, skilling, shops, banks, quests.
