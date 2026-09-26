# Crafted Realm network protocol (version 1)

Opened 2026-09-25 with milestone W1 (`WORLD_GOAL_2026-09-25.md`). The server is authoritative: the
client sends **intents** ("walk here", "attack that"), the server decides everything and sends back
**one `tick` message every 600 ms** describing what changed. The client never moves items, changes
stats, rolls damage or moves itself except as a visual prediction.

Source of truth in code: `server/net/Protocol.js` (names, version, field types), `server/engine/input.js`
(what each intent does), `server/engine/info.js` (the tick delta), `server/engine/World.js` (`welcome`).
Keep this file in step with them and bump the version on any incompatible change (see Change log).

## Transport

- WebSocket, text frames, one JSON object per frame, every object has a string `t`.
- Default port `43594` (`CR_PORT`), interface `127.0.0.1` (`CR_HOST`; a hosted world sets it explicitly). `GET /health`
  on the same port returns `{ok, tick, players, cycleMs}`; `GET /map` (W2) returns the map the world runs (bounds,
  blocked / water / walls, areas, respawn, `decor`, `alpha`, optional `placement` for the Scarlands art kit; never the
  monster spawn table) so a client can build the world before logging in. Both answer with CORS `*`.
- Frames larger than 4096 bytes are refused.
- Coordinates are **tiles**: `x` grows east, `z` grows **north** (the Wilderness is north of the Ditch).
  Level (floor) is `0` in W1. One client world unit should equal one tile.
- Movement is 8-directional (2004 rules, rsmod-pathfinder). The current offline client walks
  4-directionally; the online client must render diagonal steps.

## Session flow

```
client                         server
hello {v:1}           ---->
                      <----    hello {v, tickMs, server}          (or error {code:'version', need} + close)
register {user,pass}  ---->
                      <----    register_ok {user} | auth_fail {code, text}
login {user,pass}     ---->
                      <----    welcome {...}                      (next tick; or auth_fail)
                      <----    tick {...}                         (every tick from now on)
intents...            ---->
logout {}             ---->
                      <----    logout {reason}   then the socket closes
```

- Register and login are only accepted after `hello`. Passwords are checked with scrypt off the tick.
- A login for an adventurer who is still standing in the world with no connection (a dropped
  socket, see Keeping alive) re-attaches to them: `welcome` then carries `reconnected: 1` and the
  client must rebuild its view from the next tick's `add` lists.
- A login for an adventurer who is connected elsewhere is refused (`already_online`).

## Client to server

### Before login

| `t` | Fields | Notes |
|---|---|---|
| `hello` | `v` (int, must be 1), `client` (string, optional) | First message. Wrong version: `error {code:'version', need:1}` and the socket closes. |
| `register` | `user` (1-12 letters, digits, space, `-`, `_`), `pass` (8-64 chars) | Creates an account. Case-insensitive names. |
| `login` | `user`, `pass`, `look` (optional, W2) | Enters the world on the next tick. `look` is the character-kit look (below); it is only used when the account has no saved look yet. |
| `ping` | `n` (any, optional) | Answered at once with `pong`. Also allowed in game. |

### In game (intents)

All are applied during the server's client-input phase, at most 10 per player per tick (the rest wait
for the next tick, up to 60 queued). Nothing is accepted from a player who is dead, teleporting or
otherwise delayed. Ids (`pid`, `nid`, `uid`) must be of something currently in the client's view.

| `t` | Fields | Effect |
|---|---|---|
| `walk` | `x`, `z` (int) | Clears the current action and paths to the tile (server path finder). |
| `run` | `on` (bool) | Run toggle (needs energy). |
| `op_npc` | `nid` (int), `op` = `"attack"` | Attack an NPC: walks into reach (melee: next to it, not diagonal; ranged/magic: in range with line of sight), then fights until stopped. |
| `op_player` | `pid` (int), `op` = `"attack"` \| `"follow"` | Attack (Wilderness rules apply) or follow a player. |
| `op_obj` | `uid` (int), `op` = `"take"` | Walk to a ground item and pick it up. |
| `cast_npc` | `nid`, `spell` (id from `SPELLS`) | Cast one combat spell on an NPC (continues only if it is also the autocast spell). |
| `cast_player` | `pid`, `spell` | The same on a player. |
| `eat` | `slot` (0-27) | Eat food in that pack slot. One bite per 3 ticks; adds 3 ticks to the attack timer; clears the current attack order (as in 2004). |
| `equip` | `slot` (0-27) | Wield/wear the item in that pack slot (swaps with what is worn). Level requirements apply. |
| `unequip` | `slot` = `head` `cape` `amulet` `weapon` `body` `shield` `legs` `hands` `feet` | Take it off into the pack. |
| `drop` | `slot` (0-27) | Drop the whole stack on your tile (private to you for 100 ticks, gone after 200). |
| `style` | `index` (0-3) | Combat style button for the wielded weapon's category (see `shared/combat.js` `CATEGORY_STYLES`); clamped to the category's buttons. |
| `auto_retaliate` | `on` (bool) | |
| `autocast` | `spell` (combat spell id) or `null` | Needs a staff (weapon with `style:'magic'`) and the Magic level. |
| `prayer` | `id` (from `shared/combat.js` `PRAYERS`), `on` (bool) | Same-group prayers switch each other off. Needs prayer points. |
| `spec` | `on` (bool) | Arms the weapon's special attack for the next swing (our design; 2004 had none). |
| `chat` | `text` (string) | Public overhead chat, up to 80 characters, one line per tick; `<` `>` and control characters are removed. |
| `teleport` | `spell` (a `SPELLS` entry with `utility:'teleport'`) | 2-tick cast, then the jump. Refused above Wilderness level 20. |
| `look` | `look` (object, W2) | Change your character-kit look `{body:'A'|'B', parts:{Hair,Jaw,Torso,Arms,Hands,Legs,Feet,Makeup: 1..64}, colors:{hair,torso,legs,feet,skin,makeup: 0..63}, build, feet}`; sanitised (`server/engine/look.js`); only outside the Scarlands and out of combat. |
| `kit` | `name` (W2 alpha) | Take a fighting kit from the Commons supply chest (`map.alpha.kits`: `melee` / `ranged` / `magic`): replaces the whole pack and all worn gear, sets the style (and autocast). Only within `alpha.reach` tiles of `alpha.chest`, outside the Scarlands, out of combat, once per `alpha.cooldown` ticks. |
| `logout` | | Leaves when the logout lock allows (not within 16 ticks of being hit or attacked). A refused request is dropped: ask again. |
| `ping` | `n` | Keep-alive, see below. |

## Server to client

| `t` | Fields |
|---|---|
| `hello` | `v`, `tickMs`, `server` |
| `pong` | `n` (echo), `tick` |
| `register_ok` | `user` |
| `auth_fail` | `code`, `text` (see codes below) |
| `error` | `code`, `text`; `need` for `version`. Sent for refused frames; 50 of them and the socket is closed (`kicked`). |
| `welcome` | see below |
| `tick` | see below |
| `logout` | `reason`: `logout` \| `timeout` \| `shutdown`, then the socket closes |

### `welcome`

```json
{ "t": "welcome", "pid": 3, "name": "Ash Rider", "tick": 1204, "tickMs": 600,
  "map": { "name": "scarlands_test", "bounds": {"x1":0,"z1":0,"x2":63,"z2":127},
           "areas": { "wilderness": [...], "multi": [...], "named": [...] }, "respawn": {"x":32,"z":10,"radius":2} },
  "x": 32, "z": 11, "level": 0,
  "stats": { "Attack": [xp10, baseLevel, currentLevel], "...": [] },
  "inv": [["coins", 250], null, ...28 slots],
  "eq": { "weapon": "iron_sword", "body": "bronze_plate" },
  "set": { "run": 1, "style": 0, "ar": 1, "ac": null, "spec": 100 },
  "en": 10000, "skull": 0, "pr": [], "lk": { "body": "A", "parts": {}, "colors": {} } }
```

W2: `map.alpha` (when the map has an alpha block) is `{chest:{x,z}, reach, kits:{name:{label, equip, inv}}}`; `lk` is
your saved look (or `null`).

`xp10` is experience in tenths (so 5.5 xp is 55). `en` is run energy 0-10000 (100.00%). `skull` is
ticks left. `pr` lists active prayer ids.

### `tick` (the per-tick delta)

Only keys with content are present. `n` is the server tick number.

```json
{ "t": "tick", "n": 1205,
  "me": { "x": 33, "z": 12, "mv": [[33,12]], "a": {"name":"attack","type":"slash"}, "h": [[4,"hit"]], "c": "hi",
          "hp": [26,30], "pp": [43,43], "en": 9866, "wl": 0, "multi": 0, "skull": 0, "cb": 41 },
  "pl": { "add": [ {"i":7,"nm":"Bob","x":35,"z":12,"cb":39,"eq":{"weapon":"iron_sword"},"sk":0,"oh":null,"hp":[30,30],"f":null} ],
          "upd": [ {"i":7,"x":36,"z":12,"mv":[[36,12]],"a":{"name":"defend"},"h":[[0,"block"]],"hp":[30,30],"c":"text","f":["p",3],
                    "eq":{...},"sk":1,"oh":"melee","cb":39} ],
          "del": [9] },
  "np": { "add": [ {"i":12,"ty":"gnarlgob","x":30,"z":52,"hp":[13,13],"f":null} ], "upd": [...same shape as pl.upd...], "del": [] },
  "ob": { "add": [ {"i":501,"id":"coins","q":250,"x":35,"z":12} ], "del": [498] },
  "fx": [ {"k":"arrow","from":["p",3],"to":["n",12],"d":3}, {"k":"spell","sp":"wind_strike","from":["p",3],"to":["p",7],"d":2,"splash":1} ],
  "inv": [...], "eq": {...}, "st": {"Attack": [xp10, base, cur]}, "pr": ["protect_melee"],
  "set": {"run":1,"style":2,"ar":1,"ac":null,"spec":75,"specOn":0},
  "msg": [["game","You eat the brooktrout. It heals some health."], ["combat","Oh dear, you are dead!"]] }
```

- `me`: always `x`,`z`. `mv` = tiles stepped this tick in order (1 walking, 2 running); `tele: 1`
  instead of `mv` means a jump (respawn, teleport, npc reset). `a` = animation, `h` = hit splats
  `[amount, "hit"|"block"]` taken this tick, `c` = your overhead chat. The status block (`hp`
  `[current,max]`, `pp` prayer points `[current,max]`, `en`, `wl` Wilderness level, `multi`, `skull`
  ticks left, `cb` combat level) is sent whenever any of its values changes (energy by whole
  percents).
- `pl` / `np`: everything within **15 tiles** (Chebyshev) on your level; at most 255 of each.
  Process `del` before `add` (a slot id can be reused in the same tick). `add` carries the full
  snapshot; `upd` only what changed: position (`x`,`z` + `mv` or `tele`), `a`, `h` (with `hp`),
  `c` (overhead chat), `f` (who it now faces/attacks: `["p",pid]`, `["n",nid]` or `null`), and for
  players `eq` (visible gear), `sk` (skull), `oh` (overhead prayer `melee`|`ranged`|`magic`|null),
  `cb` when their appearance changed.
- `ob`: ground items within 15 tiles that you may see. Private loot is only sent to its owner until
  it turns public; a re-sent `add` with the same `i` replaces the stack (quantity changed). W2: an `add` of an item that is
  still private to you carries `own: 1` and `pub` (ticks until everyone may see it).
- W2: `pl.add` / `pl.upd` carry `lk` (the adventurer's character-kit look) and `pl.add` carries `dd: 1` when the
  adventurer is lying dead right now; `me.f` is your own facing / attack target when it changes (auto-retaliate,
  follow, a new attack); a top-level `death: {kept: [[id, qty]], by: name|null, lost: n}` arrives with your respawn
  (and the chat line `You kept: ...`).
- `fx`: projectiles to draw, `d` = ticks until the server applies the hit, so the visual can land
  exactly with the splat. `splash: 1` = the spell missed.
- `inv` (28 slots), `eq`, `st` (changed skills), `pr`, `set`: present when they changed.
- `msg`: game messages `[kind, text]`; kinds `game`, `combat`, `level`.

Animation names in `a.name`: `attack` (`type`: stab/slash/crush/ranged, `spec: 1` for a special),
`defend`, `cast` (`spell`), `death`, `eat`, `teleport`.

### Codes

`auth_fail.code`: `bad_username`, `bad_password`, `name_taken`, `bad_credentials`, `banned`,
`too_many_attempts` (10 per minute per address), `already_online`, `save_invalid` (the stored save
failed its checksum; a moderator must restore it), `world_full`, `error`.

`error.code`: `version`, `too_large`, `bad_json`, `bad_shape`, `unknown_type`, `bad_field`,
`say_hello_first`, `busy` (an auth request is already running), `not_logged_in`, `rate_limited`,
`slow_down` (60 queued intents), `kicked`.

## Keeping alive and disconnects (2004 rules)

- Send something (a `ping` is fine) at least every 30 seconds. After **100 ticks (60 s)** without
  any message the server logs the player out regardless of combat.
- If the socket drops, the adventurer **stays in the world**. After 50 ticks (30 s) without a socket
  the server asks to log them out, which happens as soon as the logout lock allows. Logging in again
  before that re-attaches the same adventurer.
- Nobody leaves mid-death: the kept-items split and respawn finish first.

## Rate limits

20 frames per second sustained with bursts of 40 per connection; at most 10 intents applied per tick
and 60 queued per player; 10 register/login attempts per minute per address; one chat line per tick;
frames up to 4096 bytes; a client that falls 1 MB behind on reading is disconnected.

## Change log

- **v1 + W2 additions (2026-09-26, compatible: new optional fields and intents only)**: `look` and `kit` intents,
  `look` on login, `welcome.lk`, `welcome.map.alpha`, `lk` / `dd` in player snapshots, `me.f`, `own` / `pub` on
  ground items, the `death` summary, `GET /map`, `CR_HOST` (default 127.0.0.1). Clients: `src/net_client.js`
  (`?online=1`), `server/tools/BotClient.js`.

- **v1 (2026-09-25, W1)**: first version: accounts, movement, combat (melee/ranged/magic, PvM and PvP),
  prayers, eating, equipment, ground items, chat, death and respawn, logout rules.
