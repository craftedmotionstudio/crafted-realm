# Crafted Realm — The Goal (North Star)

> **What this file is.** The single statement of *what we're building and why*, and what
> "good enough to log in" means. Sibling docs answer the *how*: `STORY_BIBLE.md` (world &
> lore canon), `ROADMAP.md` (architecture & build phases), `OSRS_SCOPE.md` (content scale &
> waves), `OSRS_COMPARISON.md` (feature parity), `CLAUDE.md` (engineering rules). When those
> disagree with this file on *intent*, this file wins; when they disagree on *fact*, fix the
> disagreement deliberately.
>
> **Name history:** this idea started as **"MotionScape."** It is now **Crafted Realm**
> (a.k.a. Crafted Realms). The old plan to host it inside a WordPress site is **dropped** —
> see §9 Delivery.

---

## 1. The one-liner

**Crafted Realm is Old School RuneScape's soul in a browser — the cozy medieval grind, the
click-to-move tile world, the skill ladders and quests and loot — rebuilt as our own IP,
tighter and more optimized, and carried past where OSRS stops.**

Not a clone. A love letter that improves the parts that aged badly, keeps the parts that are
sacred, and adds the ideas OSRS never shipped. "A better version of the thing you already
love" — we're comfortable that it reads a little like an affectionate rip-off, because every
name, pixel, region, and number is ours.

---

## 2. Design pillars

1. **Oldschool feel is sacred.** 1-tile-per-tick click-to-move, a visible tile grid, a
   600 ms game tick, two-roll combat, the XP curve, the inventory/skills/quest texture. If it
   doesn't *feel* like stepping into 2007, we failed — no matter how nice the tech is.
2. **Cozy medieval adventure.** Bright, warm, low-poly, flat-shaded, readable. The majority
   of the world is inviting; darkness is earned (the Scarlands, the Undercrag), not default.
3. **Your account, your story.** No fixed classes. You become what you train. Grind the range
   and you're a ranger; skill non-combat and you're a merchant-artisan. Emergent identity.
4. **Everything is a reason to go somewhere.** Every region has a distinct biome, skill focus,
   and threat band; every quest gives a reason to visit a place and unlocks a system. Reward
   scales with distance + danger.
5. **Better, not just re-skinned.** Where OSRS is clunky (UI overlap, opaque mechanics, dead
   clicks), we optimize. Where OSRS stops, we continue (deeper endgame tiers, the Scarring
   metaplot, housing, our own minigames).
6. **Built to grow for years.** A stable engine core + data-driven content so new
   items/monsters/quests/regions are *data + a small script*, never an engine rewrite. The
   world is deliberately left open-ended at the top so there's always more ladder to climb.

---

## 3. Where we pick up where OSRS leaves off (the "better" list)

- **A HUD that never fights itself.** Clean OSRS-style tabbed side panel, no overlapping
  buttons, consistent flow, legible timers/XP-drops. The texture of OSRS, minus its cruft.
- **Legible mechanics.** Same depth, less mystery — clear hover text ("Action › Target
  (level)"), honest combat feedback, tooltips that actually explain.
- **A live creator/admin layer** baked in from day one (Build Mode + admin console) so the
  world can be reshaped, populated, and balanced without redeploys — see §8.
- **Deeper, cleaner progression.** Hybrid tier ladder (real metals → our signature alloys →
  boss-gated prestige), off-ladder prestige sets, no dead tiers.
- **Our own metaplot.** The Scarring — a burned catastrophe on the valley's rim — gives the
  whole world a spine and an endgame that keeps extending.
- **Modern delivery.** Instant-load browser game, phone-friendly later, no client download.

---

## 4. The player experience (first session → long game)

**Minute 1 — Title & character.** A proper animated title screen (medieval art, flickering
braziers), then character creation: gender, skin, hair, face, starting clothes (our own
OSRS-style creator).

**Minutes 2–15 — Tutor's Holm (our Tutorial Island).** The player washes ashore with no name
and no memory. **Guide Bram** walks them through the real basics on a small instructional
island built like a walled moat-castle with activity stations:
- **Movement & camera** (click-to-move, the tile grid, run).
- **Melee** — given a basic sword + shield, kill a training dummy / weak foe.
- **Ranged** — given a basic bow + a few arrows, hit a target.
- **Magic** — given a handful of starter runes, cast a first spell.
- **Gathering** — chop / mine / fish once each to feel the skill loop.
- **Inventory, equipment, banking, shops** — deposit, withdraw, buy, sell.
- Then a rowboat to the mainland.

**Minutes 15+ — Veyhollow Commons (the hub).** Bank, shops, smithy, pub, quest-givers, the
**Exchange** (marketplace). From here the world opens: pick a direction, pick a grind, pick a
quest. Most of the time the player does whatever they want — hang out in the Commons, train a
skill, chase a quest, hunt a monster, make money.

**The long game.** Climb the skill ladders; work the quest arcs (each gates a tier/region/
system); earn faction rank in the Wardens / Spire / Dawn / Whitmoor Hold; fight up the monster
ladder from field grubs to **Korthul the Undercrag**; collect gear, cosmetics, pets, blueprints,
clue-scroll rewards; eventually build a home and run with other players. The top is left open
on purpose — that's our content treadmill.

---

## 5. Systems catalogue — what's in the game, and our name for it

We adopt OSRS *structure and feel*; we rename anything that is RuneScape-specific, and keep
generic words (bank, inventory, mining) that are common RPG vocabulary. **✦ = our coined name;
"(proposed)" = not yet locked, see §11.**

| System | OSRS reference | Crafted Realm | Status |
|---|---|---|---|
| Tutorial island | Tutorial Island | **Tutor's Holm** ✦ | Exists (extend to teach all 3 combat styles) |
| Town hub | Lumbridge / GE square | **Veyhollow Commons** ✦ | Exists |
| Skill set | 23 skills | **15 skills** on the OSRS XP curve (see STORY_BIBLE §5) | Exists |
| Combat triangle | melee/range/magic | Same triangle, our own numbers (OSRS-exact math) | Exists |
| Tiered gear | bronze→rune→barrows | **Hybrid ladder**: Copper→Bronze→Iron→Steel→Whitsteel✦→Aurel✦→Veyrite✦→Undercrag✦ + off-ladder prestige sets | Exists / extending |
| Quests | quest arcs | Faction-linked quest spine (Wardens/Spire/Dawn arcs) | 4 live, extending |
| Bank | Bank | **Bank / the Vault** | Exists |
| Shops | shops | Fixed-stock shops (9 live) | Exists |
| Grand Exchange | Grand Exchange | **The Exchange** ✦ (proposed) — player marketplace at the Commons | Needs online layer |
| Player trade | trade window | Direct player-to-player trade | Needs online layer |
| Currency | coins (gp) | **Crowns** ✦ | Exists |
| Wilderness | the Wilderness | **The Scarlands** ✦ — deeper = deadlier, PvP-enabled | Zone exists; PvP needs online layer |
| Duel arena | Duel Arena | **The Proving Grounds** ✦ — staked duels | Zone exists; staking needs online layer |
| Castle Wars | Castle Wars | **Keep Siege** ✦ (proposed) — team war minigame, min 2 players | Needs online layer |
| Slayer | Slayer | **Warden Bounties** ✦ (proposed) — assigned monster contracts | Design hook (STORY_BIBLE) |
| Clue scrolls | clue scrolls | **Cipher Scrolls** ✦ (proposed) — riddle/treasure trails | Planned |
| Achievement diary | diaries | **Realm Deeds** ✦ (proposed) | Planned |
| Player housing | Construction / POH | **Homesteads** ✦ (proposed) + a **Construction** skill | Designed, tabled (STORY_BIBLE §7) |
| Teleportation | teleport runes / spells | Rune teleports + **Waystone** ✦ portals between hubs | Planned |
| Pets / creatures | pets | Collectible pets & creatures | Planned |
| Cosmetics | cosmetic overrides | Cosmetic gear/dyes | Planned |
| Guilds | skill guilds | Faction guildhalls with rank-gated minigames & gear | Design hook |
| Drop tables | drop tables | Per-NPC drop tables | Exists |
| Bosses | bosses | Boss ladder (Fenlord → Korthul → beyond) | 2 live |
| Minimap / world map | minimap / world map | Minimap (live) + world map (planned) | Partial |

**Zone rules (PvP / PvM / safe):**
- **Safe zones** (Commons, banks, tutorial): no player combat, ever.
- **PvM everywhere else**, threat scaling with distance from the Commons.
- **PvP is opt-in and place-gated**: the Scarlands (risk = reward, deeper is deadlier) and the
  Proving Grounds (consensual staked duels). You are never surprise-killed in a town.

---

## 6. Skills & progression

15 skills on the real OSRS XP curve (Attack, Strength, Defence, Hitpoints, Ranged, Magic,
Prayer, Woodcutting, Mining, Fishing, Cooking, Firemaking, Smithing, Fletching, Thieving),
each foregrounded by a region. Combat accuracy/max-hit and the XP table are **OSRS-exact and
must not regress** (`CLAUDE.md`). Open skill hooks for later: Construction, Crafting, Agility,
Warden Bounties (slayer-style). Progression law: *higher tier ⇒ better stats ⇒ harder to get*
(level-gated, rarer, boss-gated, or faction-locked). Cheap = easy = weak.

---

## 7. World & art direction

The world is the valley of **Veyhollow** ringed by wilder lands; the full canon (12 regions,
5 factions, the Scarring metaplot, the tier ladder, the quest spine) lives in `STORY_BIBLE.md`
and is not repeated here. Map design: hand-authored square 8×8-tile chunks, visible grid,
gradual biome transitions, roads radiating from the Commons, reward gradient = distance +
threat.

**Art:** as close to **2007-era OSRS as we can get, but our own** — low-poly, flat-shaded,
warm, cozy, readable. Bright and inviting across most of the map; darker and grimmer only
where the fiction earns it. **Items are 2D icons** (background-removed painted sprites);
procedural 3D is for world props + worn gear only (`CLAUDE.md`). Character art uses our own
modular/procedural avatar + creator. **UI feels old-school** — the OSRS side-panel texture,
cleaned up and de-cluttered.

---

## 8. Admin / creator layer (a first-class feature)

The owner must be able to run the entire game from an admin account, live, without a redeploy:
- **Admin console** (already bound to the backtick key) — teleport menu, spawn NPCs/items,
  give items, set stats, jump zones, toggle god/noclip for testing.
- **Build Mode editor** (exists) — click-to-place / remove / rotate / scale props, paint
  terrain, grab/move/clone whole chunks, save/load/export. Reshape the map significantly and
  easily; add NPCs and content as data.
- **Content as data** — new item/NPC/quest = a data row (+ optional small script), so the game
  scales to OSRS-like content counts (see `OSRS_SCOPE.md`) without engine edits, and the admin
  can add content without touching the core loop.

---

## 9. Delivery & business model

- **Standalone browser game.** Crafted Realm is a self-contained web app (the current
  `index.html` + `src/*.js`, served at `127.0.0.1:8777` in dev). It ships to any static host /
  CDN. **Not WordPress** — the earlier WordPress plan is dropped; no CMS dependency.
- **Phone later.** The low-poly, click-to-move design is mobile-friendly; a mobile/PWA wrapper
  is a post-beta goal, not a V1 requirement.
- **Money, eventually, in this order:** ship a **free full beta** first → later a **membership**
  tier (free base game + premium upgrade, à la members' worlds) → possibly **ads** on the site.
  None of this is built now and none of it blocks V1. We earn the audience before we monetize.

---

## 10. What "V1 — ready to log in" means

V1 is a **single-player-feeling vertical slice that already feels like OSRS**, playable
start-to-finish in a browser. Concretely, V1 is done when a new player can:

1. Load the game instantly, see a real title screen, and create a character.
2. Complete **Tutor's Holm**, learning movement, melee, ranged, magic, gathering, banking,
   and shopping — then sail to the mainland.
3. Move **tile-by-tile on the 600 ms tick** with a visible destination tile + path preview.
4. Use a **clean, non-overlapping OSRS-style tabbed HUD** (inventory, equipment, skills,
   combat, prayer, magic, settings, logout).
5. Train **every skill** and see honest XP drops / level-ups on the correct curve.
6. Fight monsters in **all three combat styles**, take real drops from per-NPC tables, and use
   **prayer** and **teleports**.
7. Play **3–4 fully realized regions** and beat **at least one boss**.
8. Complete **at least 3 quests** that each teach/gate a system and advance the fiction.
9. Bank, shop, and manage gear across the hybrid tier ladder.
10. Have progress **saved** (locally for V1; server sync comes with the online layer).
11. Let the **owner administer everything live** (teleport, spawn, give, edit the map).

**Explicitly NOT required for V1** (they need the online layer — see §11): real multiplayer,
player-to-player trade, the Exchange marketplace, open-world PvP, staked duels, team minigames
(Keep Siege), and shared housing districts. V1 proves the world and the feel; the online layer
is the next major milestone.

**Milestone ladder:**
- **V1 — The Slice:** the single-player-feeling OSRS experience above.
- **V2 — The Online Layer:** accounts, server, networking → real players sharing a world,
  trade, the Exchange, PvP in the Scarlands, staked Proving-Grounds duels, Keep Siege.
- **V3 — The Living World:** Homesteads/Construction, minigames & guild content at scale,
  Warden Bounties, Cipher Scrolls, cosmetics/pets economy → then membership, then ads.

---

## 11. Open decisions to confirm (naming & scope)

These are the forks where I want your call before locking them in:

1. **Skill names.** Today they're the generic OSRS-ish set (Attack, Mining, Fishing…). Keep
   the plain, readable ones and only re-flavor a few (e.g. Prayer→**Devotion**,
   Thieving→**Larceny**, Firemaking→**Kindling**)? Or push original names across the board?
   *Recommendation: keep generic/clear, re-flavor only the "flavored" ones.*
2. **Marketplace name.** "**The Exchange**" vs "Crafters' Exchange" vs "The Grand Ledger."
3. **Minigame names.** "**Keep Siege**" (Castle Wars analogue) and "**Warden Bounties**"
   (Slayer analogue) — lock or alternatives?
4. **Housing name.** "**Homesteads**" + a "Construction" skill — good, or coin a skill name too
   (e.g. **Homecraft**)?
5. **V1 online scope.** Confirm the milestone split above — V1 as a rich single-player slice,
   with true multiplayer/trade/PvP as V2 — vs. wanting *some* networking inside V1.

---

## 12. Private-server review — 16 open-source RuneScape projects

We surveyed **16 open-source RuneScape server/client/tooling projects** (verified against their
GitHub repos) to make sure Crafted Realm has *its own version of every capability the genre has
proven out*. **We adopt architecture, concepts, feature-lists, and UX only — never Jagex or
third-party assets, cache, code, or names** (see `ROADMAP.md` §IP boundary). Grouped by what
each teaches us:

**Modern JVM servers — the engine/content contract**
- **rsmod** (Kotlin, OSRS) — clean `engine`/`api`/`content` split; coroutine/suspendable
  multi-tick actions; gold-standard faithful pathfinder. *Take: the stable content-API layer;
  tick-scheduled state machines for dialogue/skilling/combat.*
- **rsbox** (Kotlin) — Bukkit-style drag-and-drop plugin bundles; first-run asset provisioning.
  *Take: keep the repo asset-light; content as self-contained bundles.*
- **Zenyte** (Java, production OSRS) — deepest end-game stack: instanced raids, boss scripting,
  **Combat Achievements + daily tasks + adventurer's log**. *Take: an instancing-ready world
  model and a retention meta-layer that sits on top of existing systems.*
- **Kronos** (Java, OSRS 184) — multi-world; **per-item optional attribute/charge bags**.
  *Take: an extensible item-attribute model with no schema churn.*

**Classic Java bases — correctness & clean content**
- **Apollo** (Java+Kotlin, 317, ex-Hyperion) — the **message↔codec "release" pattern**: game
  logic works on intent objects, never wire bytes; typed-event plugin system; `DistancedAction`
  scheduler. *Take: the intent/codec boundary (our single biggest MMO-readiness lever) + the
  action scheduler.*
- **Elvarg** (Java + web client) — "boring but correct": exact combat triangle, economy loop,
  and **gear/inventory presets** out of the box; ships a browser client. *Take: test-locked
  combat correctness; presets as cheap QoL; proof of RSPS-in-browser.*
- **Luna** (Java+Kotlin, 377) — one authoritative game-tick thread with async I/O; Kotlin event
  DSL; **first-class bots** for load-testing. *Take: single-tick-thread authority; promote our
  `Bots` to a core QA primitive.*
- **Blurite** libs (Kotlin) — subsystems as independent benchmarked libraries; **bounded-radius
  BFS** pathfinder + straight-line fallback. *Take: cap path-search radius (OSRS-accurate + cheap);
  split our big files into testable modules.*

**JS/web emulators — the browser blueprint (most directly transferable, we're also JS)**
- **RuneJS** (TypeScript, #435) — the **action-hook / content-plugin registry**: every content
  piece declares `{trigger, matching-ids, option, walkTo, handler}` into a central dispatcher;
  namespaced string ids (`crafted:cook`). *Take: a central interaction dispatcher keyed by
  (targetType, targetId, option) + self-registering content modules — this also kills our
  big-file tech debt.*
- **2009scape** (Java, #530, full live MMO) — the most content-complete: GE, slayer, clues,
  minigames, construction, clans, all data-editable without recompiling. *Take: our forward
  feature backlog + authenticity-as-spec + a standalone drop-table/hiscores data surface.*
- **2003scape / RSC** (JavaScript + Canvas, #204) — browser-native: **WebSocket transport,
  cache-over-fetch, and the server running inside a Web Worker** (same code single-player and
  server-authoritative). *Take: Web-Worker world sim + WebSocket transport as our MMO path.*
- **Lost City / 2004Scape** (TypeScript + WASM, #225) — hard **engine/content repo split** with
  content hot-reload; cycle-accurate deterministic tick. *Take: engine≠content separation +
  content hot-reload (ends the stale-cache hard-refresh dance).*

**Clients & tooling — UX, overlays, and the editor**
- **RuneLite** (Java client) — the QoL gold standard: everything is a **toggleable overlay**
  behind an OverlayManager, with an **auto-generated settings panel** from a config schema.
  *Take: the whole QoL overlay catalogue below + a central OverlayManager.*
- **OpenRS2** (Kotlin) — content-addressed, versioned asset storage with a browsable archive UI.
  *Take: dedup-by-hash asset store + an in-admin asset browser.*
- **RSPSi** (Java map editor) — region/chunk as the edit unit; underlay/overlay floor painting
  with blending; place→rotate→decorate; plane awareness; collision derived from placement.
  *Take: the Build Mode editing workflow.*
- **Displee rs-cache-library** (Kotlin) — a typed definition layer (items/npcs/objects) over a
  generic store, with rebuild + validate. *Take: a single definition registry gated by our
  content validator, exposed to the admin console.*

---

## 13. Functionality parity matrix (reconciled with our code)

Every genre capability, our status **as verified in `src/` today**. Legend: ✅ have ·
🟡 partial · 🔷 planned for V1 · 🌐 needs the online layer (V2) · 🏗️ later (V3).

| Capability | Status | Where / note |
|---|---|---|
| Fixed 600 ms game tick (accumulator, backlog cap) | ✅ | `game5_main.js` |
| Click-to-move, 4-dir tile BFS pathfinding | ✅ | `computePath`/`orderWalk` — add bounded radius |
| Visible destination-tile highlight + drawn path preview | ✅ | hover tile, pulsing dest tile, path preview, ground grid (`game4_ui.js` tile-FX) |
| Combat: melee / ranged / magic, OSRS-exact rolls | ✅ | `game3_systems.js` (`STYLE_DEFS`, specials) |
| Prayer (protect-from, boosts, drain) | ✅ | `PRAYERS` |
| Spellbook (offensive strike/bolt tiers, rune costs) | ✅ | `SPELLS` |
| Teleportation (per-zone spells, rune cost, cooldown) | ✅ | `SPELLS` utility + `castTeleport` |
| 15 skills on the exact OSRS XP curve | ✅ | `game1_data.js` `XP_TABLE` |
| NPC AI, aggression, respawn, per-instance state | ✅ | `NPC_TYPES` + `game5_main.js` |
| Data-driven drop tables (qty ranges + prob) | ✅ | `NPC_TYPES[].drops`, validator-gated |
| Boss scripting | ✅ | `BOSS_SCRIPTS` (2 bosses) — formalize as reusable SMs |
| Banking / vault | ✅ | `UI.openBank`, `Player.bank` |
| Shops (fixed stock, buy/sell) | ✅ | `SHOPS` (9) |
| Quest engine (typed stages, QP, journal, reward scroll) | ✅ | quest v2 (4 quests) |
| Run energy (drain/regen, toggle) | ✅ | `Player.energy` |
| Local save/load | ✅ | `SaveGame` (localStorage) |
| Bots (fake players) | ✅ | `Bots` — promote to QA primitive |
| Admin console (teleport menu, spawn, give) | ✅ | backtick console |
| Build Mode editor (place/remove/rotate/scale/save/export) | ✅ | `game_editor.js` |
| Minimap | ✅ | `game4_ui.js` |
| Character creator + live recolor customizer | ✅ | `char_creator.js` / `char_customizer.js` |
| Content-integrity validator | ✅ | `tools/validate_content.js` |
| Right-click "choose option" menu | ✅ | present — make priority-sorted |
| Zones (12), factions (5), hybrid tier ladder | ✅ | `ZONES` / `STORY_BIBLE.md` |
| Hover text "Action › Target (level)" | ✅ | top-left hover text live ("Attack Wanderer (level 2) / 4 more options") |
| Central interaction dispatcher + content hooks | 🔷 | architecture adoption (RuneJS pattern) |
| Intent/message + encode-decode boundary | 🔷 | adopt now (Apollo pattern) for cheap MMO later |
| Action scheduler (walk-to-then-do, repeat N ticks) | 🔷 | Apollo `DistancedAction` |
| Pluggable persistence interface (JSON now → SQL later) | 🔷 | wrap `SaveGame` |
| Per-item attribute/charge bag | 🔷 | Kronos pattern in item registry |
| QoL overlay layer + OverlayManager (see §14) | 🔷 | RuneLite catalogue |
| World map (top-down render) | 🔷 | minimap → full map |
| Chunk world model + streaming ring | 🔷 | ROADMAP Phase 2 |
| Clue scrolls / **Cipher Scrolls** | 🏗️ | content type |
| Slayer / **Warden Bounties** | 🏗️ | task system |
| Construction / **Homesteads** | 🏗️ | STORY_BIBLE §7 (tabled) |
| Cosmetics / dyes / pets | 🏗️ | collectibles |
| Achievements / daily tasks / **Realm Deeds** + activity log | 🏗️ | Zenyte retention layer |
| Instanced content (bosses/raids/minigames) | 🏗️ | world-model support |
| Accounts / server / networking | 🌐 | the online layer |
| Player trade | 🌐 | V2 |
| **The Exchange** (player market) | 🌐 | V2 |
| Open-world PvP (Scarlands) + staked duels (Proving Grounds) | 🌐 | zones exist; combat needs netcode |
| Team minigames (**Keep Siege**) | 🌐 | V2 |
| Clans / friends / social | 🌐 | V2 |
| WebSocket transport + cache-over-fetch | 🌐 | 2003scape blueprint |
| World sim in a Web Worker (single-player == server code) | 🌐 | architecture for V2 |

**Read:** the *core loop and content systems are largely built and OSRS-tight already.* The gaps
are (a) a thin set of V1 feel/QoL/architecture upgrades, (b) a content backlog we extend for
years, and (c) the online layer, which is a distinct milestone (V2), not scattered features.

---

## 14. Adopted architecture principles (the convergent lessons)

All 16 projects independently converge on these. We adopt the *shape*, in our own JS:

1. **Engine ≠ content.** Freeze a stable core (tick, render, path, collision, save, transport);
   move quests/skills/NPCs/items/interactions into **self-registering content modules**. This is
   also the fix for the oversized `game2/3/4` files (`CLAUDE.md` tech debt).
2. **Central interaction dispatcher.** Route all clicks through one dispatcher keyed by
   `(targetType, targetId, optionName)`; content registers hooks (`registerHook({...})`) instead
   of editing the loop. Use **namespaced ids** (`crafted:cook`) so behavior ≠ array index.
3. **Intent/transport boundary now.** Gameplay acts on intent objects (`{type:'walkTo',x,z}`)
   behind an encode/decode seam (local calls today, JSON/WebSocket later). Doing this while
   single-player makes the MMO jump nearly free.
4. **Deterministic tick, interpolated render.** The 600 ms sim tick is authoritative and
   deterministic; `animate()` interpolates between ticks. Prerequisite for multiplayer.
5. **One authoritative sim path; I/O async.** All state mutates on the tick path. Target: run the
   whole sim in a **Web Worker** so the same code serves single-player and server-authoritative.
6. **Bounded-radius BFS** on a collision-flag grid, straight-line fallback for long hauls.
7. **Action scheduler** for "walk to X, then do Y, repeat every N ticks" (gathering/combat).
8. **Everything is validated data.** Extend the `validate_content.js` gate to every new subsystem;
   keep a single definition registry the admin console can browse/edit/rebuild.
9. **Pluggable persistence.** `SaveGame` becomes one implementation of a serializer interface
   (localStorage now; SQL/remote later).
10. **Content hot-reload.** A content-only reload path so edits don't need engine restarts or the
    stale-cache hard-refresh dance.

---

## 15. Master build checklist

Reconciled against the code audit — **`[x]` = verified present today**, `[ ]` = forward work.
"Closing out" the *whole* list is the multi-year game; what's closed out now is the audit +
every genuinely-shipped system. Tagged by milestone.

### Core engine & architecture
- [x] Fixed 600 ms world-tick with backlog cap
- [x] 4-dir tile BFS click-to-move
- [x] Local save/load
- [x] Bounded-radius BFS (MAX=64) + closest-approach fallback + re-path on arrival
- [ ] Central interaction dispatcher keyed by (type,id,option) *(V1)*
- [ ] Self-registering content-hook modules + namespaced ids *(V1)*
- [ ] Intent/transport encode-decode boundary *(V1, MMO-enabling)*
- [ ] Action scheduler (walk-to-then-do, repeat N ticks) *(V1)*
- [ ] Pluggable persistence interface (localStorage impl now) *(V1)*
- [ ] Deterministic-tick + render-interpolation pass *(V1)*
- [ ] Split the big three files into content modules *(V1, ongoing)*
- [ ] World sim in a Web Worker *(V2)*
- [ ] WebSocket transport + cache-over-fetch *(V2)*

### Combat & skills
- [x] Melee / ranged / magic, OSRS-exact accuracy & max-hit
- [x] Special attacks
- [x] Prayer (protect / boosts / drain)
- [x] Offensive spellbook with rune costs
- [x] 15 skills on the exact XP curve
- [x] Run energy
- [ ] Isolated, test-locked combat core (guard like the validator) *(V1)*
- [ ] Per-item attribute/charge bags *(V1)*
- [ ] Configurable XP-rate / fatigue data knobs *(V1)*

### World & content
- [x] NPC AI + aggression + respawn (per-instance state)
- [x] Data-driven drop tables (validator-gated)
- [x] Boss scripting (2)
- [x] Banking / vault
- [x] Shops
- [x] Quest engine (typed stages / journal / reward scroll)
- [x] Teleportation network
- [x] 12 zones, 5 factions, hybrid tier ladder
- [ ] Boss scripts as reusable state machines *(V1)*
- [ ] Instanced-content support in the world model *(V1→V3)*
- [ ] Chunk world model + streaming ring *(V1→V2)*
- [ ] Clue scrolls / Cipher Scrolls *(V3)*
- [ ] Slayer / Warden Bounties *(V3)*
- [ ] Construction / Homesteads *(V3)*
- [ ] Cosmetics / dyes / pets *(V3)*
- [ ] Achievements / daily tasks / Realm Deeds + activity log *(V3)*
- [ ] Standalone drop-table + hiscores data surface *(V2)*

### HUD, QoL overlays & feel (RuneLite-inspired)
- [x] Right-click "choose option" menu, priority-sorted (left-click = top entry, user-swappable)
- [x] Minimap
- [ ] Clean, non-overlapping tabbed side panel (Combat/Stats/Inv/Equip/Prayer/Magic/Friends/Settings/Logout) *(V1)*
- [x] Destination-tile highlight + drawn path preview (+ hover tile + ground grid)
- [x] Hover text "Action › Target (level)"
- [x] Central OverlayManager + per-feature toggles + persisted config (`src/overlays.js`, 📊/Shift+L)
- [x] Generated settings list from overlay registrations + schema-generated game-settings section
- [x] XP drops + XP/hr session tracker (xp-to-level, time-to-level, per-skill clocks)
- [x] Enemy HP bar + opponent-info overlay (name, HP bar, HP%) + right-click drop-table lookup
- [x] NPC respawn timers (countdown over defeated monsters) — [ ] tile outline/hull highlight *(V1)*
- [x] Ground-item highlighting with value-tier coloring + junk fading (stacked piles)
- [x] Tile markers (right-click "Mark Tile", persisted, colored) — [ ] optional labels *(V1)*
- [x] Menu-entry swapper (shift+right-click "Set left-click", persisted; left-click = top entry)
- [x] Unified timers-and-buffs overlay (prayers, spec, stun, energy, teleport cd)
- [x] Loot tracker + gp/hr (kills + picked-up value)
- [x] Gear presets at the bank (3 slots, best-effort restore from vault) — [ ] inventory tags *(V1)*
- [x] Bank value + live search — [ ] bank tags *(V1)*
- [x] World map (terrain/zones/roads/buildings) + click-to-walk destination pin — [ ] name search *(V1)*
- [x] Notifications framework (idle alert, low-HP vignette, level-up banner + flash)
- [x] Declutter/perf toggles (hide name tags / shadows / tile grid / XP drops)

### Admin / creator layer
- [x] Admin console (teleport menu, spawn, give)
- [x] Build Mode editor (place/remove/rotate/scale/grid/save/load/export)
- [x] Content-integrity validator
- [x] Item catalog / definition grid
- [ ] Definition browser in-console (items/NPCs/objects by id, searchable) *(V1)*
- [ ] Live validation gate wired into the console on any def edit *(V1)*
- [ ] Editor: underlay/overlay floor painting with tile blending *(V1→V2)*
- [ ] Editor: region/chunk as edit unit + grab/move/clone chunks *(V2)*
- [ ] Editor: undo/redo + multi-angle review *(V1)*
- [ ] Collision auto-derived from placed objects (tile-BFS authoritative) *(V1)*
- [ ] Content-addressed / versioned asset store + asset browser *(V2)*
- [ ] Content hot-reload path *(V1)*

### Onboarding & presentation
- [x] Character creator (gender/skin/hair/face/clothes)
- [x] Tutor's Holm tutorial island + Guide Bram
- [ ] Extend Tutor's Holm to teach all 3 combat styles + gathering + banking *(V1)*
- [ ] Animated title screen (medieval art + flickering braziers) *(V1)*

### The online layer *(V2 — the second major milestone)*
- [ ] Accounts / auth / sessions
- [ ] Authoritative server + networking
- [ ] Player-to-player trade
- [ ] The Exchange (player market, dynamic pricing)
- [ ] Open-world PvP (Scarlands) + staked duels (Proving Grounds)
- [ ] Team minigames (Keep Siege)
- [ ] Clans / friends / social
- [ ] Server-side persistence + migration from local saves

### Delivery
- [x] Self-contained static web app (no WordPress/CMS dependency)
- [ ] Free public beta *(after V1)*
- [ ] Membership / premium tier *(post-beta)*
- [ ] Mobile / PWA wrapper *(post-beta)*
- [ ] Ads *(later, optional)*

---

## 16. Where this leaves us

Crafted Realm already has a genuinely OSRS-tight **core** — the tick, tile movement, exact
combat, prayer, magic, skills, drops, banking, shops, quests, teleports, the admin console, and
Build Mode are built and verified in `src/`. The private-server review confirms our architecture
instincts (tick + BFS + data-driven content) match the whole genre, and it hands us three concrete
upgrade tracks:

1. **V1 finish** — the feel/QoL/architecture layer (clean tabbed HUD, tile-highlight movement,
   the OverlayManager + RuneLite-style toggles, the interaction dispatcher + intent boundary,
   extended tutorial, title screen) that turns a deep prototype into a game that *reads* as OSRS.
2. **V2 online layer** — accounts, networking, trade, the Exchange, PvP, minigames — enabled cheaply
   *because* we adopt the intent/transport boundary and Web-Worker sim now.
3. **V3 living world** — the content treadmill (clues, bounties, homesteads, cosmetics, achievements)
   that keeps players for years.

The pending naming decisions in §11 are the only things blocked on you; everything else is a
build queue. This document is the target we build toward.

---

*Keep this file current as the vision evolves. It is the "why"; the other docs are the "how."*

---

## 17. Standing visual-improvement loop

> A repeatable pass to run whenever we push the game's look forward. Invoke with `/loop`.

**/loop** — Improve the visuals of Crafted Realm. Treat the previous iteration as a **100**;
this pass must land at **120 or better**: richer geometry and detail consistent with the art of
Old School RuneScape, better lighting and materials, more atmosphere and life. Open the file,
screenshot it, compare it side by side against the previous iteration, and **keep the changes
only if the improvement is obvious**. Log what you improved each pass.

*Each pass appends its notes to `OVERNIGHT_CLOSENESS.md` (before/after screenshots + what
changed), and gates on the Gemini Vision second opinion (`tools/gemini_vision.js`) per the
CLAUDE.md visual-change rule.*
