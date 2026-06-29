# OSRS Private-Server Mechanics vs Crafted Realm — Comparison & Incorporation Plan

> **What this is:** a full system-by-system comparison of canonical Old School RuneScape
> mechanics (as implemented by the open-source emulators — RuneJS, 2009scape, rsmod, rsbox,
> OpenRS2, and RuneLite) against what Crafted Realm has **today**, with the **big wins** and
> exactly **how to incorporate** each. Built from a line-level audit of our codebase + a
> mechanics reference for the emulators.
> **IP stance:** we adopt *mechanics, formulas, and architecture* (public knowledge). We never
> copy Jagex/emulator code, cache, assets, or names. Our code, our world, our numbers.
>
> **Legend:** ✅ = matches OSRS · ⚠️ = partial · ❌ = missing.
> **The headline:** our **combat math and XP curve are already OSRS-accurate**, movement is now
> true tile-based. The biggest gaps are **special attacks, ground-item/loot timers, real PvP &
> wilderness, the 600ms server tick, teleport variety, and content volume (quests/skills/spells).**

---

## 1. Movement & Pathfinding

| | |
|---|---|
| **OSRS** | Tile grid; walk 1 tile/tick, run 2 tiles/tick; **BFS** over tiles in a bounded window; **diagonal allowed** only if the destination AND both orthogonal corner tiles are clear; per-tile collision bitmask (full-block, per-direction walls, projectile-block, occupied); unreachable click → nearest reachable tile. |
| **Us** | ✅ True tile BFS, tile-by-tile movement, snap-to-tile, visible grid, nearest-reachable fallback (`game5_main.js:16-54`). **By design we are 4-directional only (no diagonal)** per your call. Collision is a radius check + ground height, not a per-tile bitmask. |
| **Verdict** | ✅ Core matches/exceeds OSRS feel. ⚠️ No per-tile collision-flag system, no projectile-block flags, no run-energy "2 steps per tick" model (we use continuous speed). |
| **Big win + how** | **(a)** If you ever want OSRS-exact diagonal movement, add the corner rule to `computePath` (allow `[1,1]` etc. only if both orthogonals walkable) — trivial toggle. **(b)** Move to a real **per-tile collision bitmask** (`Uint8Array` per chunk: blocked / wall-N/E/S/W / projectile / occupied) baked from object footprints. This is the foundation for line-of-sight, projectile blocking, and "NPC occupies a tile." Medium effort, unlocks a lot. |

## 2. The Game Tick

| | |
|---|---|
| **OSRS** | Fixed **600ms server tick**. Everything discretizes to ticks: movement, hits, skill rolls, prayer drain, regen, AI, respawns. Strict per-tick pipeline order (NPCs → players → world events → build update blocks). Client interpolates for smoothness. |
| **Us** | ⚠️ Per-frame `dt` loop with a 0.6s **accumulator** for skill/gather/attack actions (`game1_data.js:6` TICK=0.6, `game5_main.js`). Combat cooldowns use seconds derived from ticks. So timing is *tick-flavored* but frame-dependent and client-authoritative. |
| **Verdict** | ⚠️ Functionally close for single-player; not a true fixed-timestep simulation. |
| **Big win + how** | **Adopt a real fixed 600ms `worldTick()`** decoupled from render, with render interpolation between tick states (already in `ROADMAP.md` §sim). Run all sim (movement step, combat resolve, AI, drains, respawns, ground-item timers) inside it in a fixed order. **This is the single most important architectural change** — it makes every other system deterministic, networkable (future MMO), and bug-resistant. High effort, highest long-term payoff. |

## 3. Combat

| | |
|---|---|
| **OSRS** | Two-roll accuracy (attack roll vs defence roll) with exact effective-level math (`floor(level×prayer)+styleBonus+8`, then `×(bonus+64)`); **max hit** `floor(0.5 + effStr×(strBonus+64)/640)`; 4 melee styles (Accurate/Aggressive/Defensive/Controlled) + ranged/magic styles; attack speed in ticks (4–7); **combat triangle** via stab/slash/crush + ranged + magic bonus categories; **special attacks** with a 0–100% energy bar (+10%/30s regen); **auto-retaliate**. |
| **Us** | ✅ **Exact OSRS accuracy formula** (`game3_systems.js:299-304`) and **exact max-hit formula** (`:302-304`). ✅ All attack styles with invisible boosts + XP split (`:551-567`). ✅ Attack speeds in ticks. ✅ Ranged (arrows + projectile) & Magic (runes + bolts) with same rolls. ✅ Combat-level formula (`:200-206`). ✅ Prayers boost rolls multiplicatively. ❌ **No special attacks / spec bar.** ❌ Combat triangle is coarse (no stab/slash/crush split; one `aBonus`/`dBonus`). ❌ No auto-retaliate toggle (NPCs auto-target on being hit, but no player toggle). |
| **Verdict** | ✅ The hard part (the math) is **already OSRS-accurate**. The gaps are features layered on top. |
| **Big win + how** | **(1) Special attacks** — add `Player.spec` (0–100, +10%/30s regen) + a `SPECIALS` registry keyed by weapon (`{cost, accMult, dmgMult, effect}`), a spec orb in the HUD, and override the accuracy/max-hit in `playerAttack` when spec is armed. High player-value, moderate effort. **(2) Auto-retaliate toggle** in the Combat tab (one boolean, check it before the player passively fights back). Trivial. **(3) Stab/Slash/Crush split** — expand item bonuses to `{stab,slash,crush,rangedAtk,magicAtk}` + matching defences so the triangle and weapon-vs-armour matchups matter. Medium; do this when you expand the item set in D5. |

## 4. NPC Behavior

| | |
|---|---|
| **OSRS** | Aggro scan radius (~5 tiles); **tolerance** (most low-level aggressives go passive after ~10 min in-area); **combat-level cutoff** (aggressive only if your cb ≤ 2×theirs+1, outside Wildy); **leash** to spawn (disengage + **heal to full** if lured too far); wander within a radius; per-NPC respawn timer; per-NPC combat scripts (styles, max hit, special phases). |
| **Us** | ✅ Aggro radius (<7 tiles), ✅ combat-level cutoff (ignore if player >2× level), ✅ **10-min tolerance**, ✅ leash + return-home, ✅ per-type respawn, ✅ fixed spawns, ✅ ranged/melee NPC attacks (`game5_main.js:440-489`, `game3_systems.js:800-836`). ⚠️ Return-home uses simple lerp, not BFS. ❌ No multi-aggression, ❌ no NPC special attacks/phased bosses, ❌ no per-NPC scripts (all data-driven). |
| **Verdict** | ✅ Surprisingly faithful — aggression/tolerance/leash/respawn all present. |
| **Big win + how** | **(1) Boss combat scripts** — a lightweight per-NPC script hook (`onTick(npc)`) so bosses (Korthul, Fenlord) can do phases/specials/summons. Big "endgame feels real" win, low-medium effort. **(2)** Route NPC movement through the same tile BFS as the player so they path around obstacles. Medium. **(3)** Heal-to-full on leash reset (we return home; confirm we also reset HP). Trivial. |

## 5. Ground / Dropped Items  ⭐ BIG GAP

| | |
|---|---|
| **OSRS** | Drops are **private to the owner for ~60s**, then **public**, then **despawn ~2 min later**. Per-zone ground-item lists so players entering see existing public items. Stackables merge on a tile. |
| **Us** | ❌ Drops are **public immediately, in-memory only, never despawn** (held in `WORLD.drops`, `game3_systems.js:472-489`). No ownership, no timers, no persistence. |
| **Verdict** | ❌ Missing the whole lifecycle. |
| **Big win + how** | Give each drop `{itemId, qty, tile, ownerId, spawnTick, publicTick, despawnTick}`. On the world tick: hide from non-owners until `publicTick` (~100 ticks), remove at `despawnTick` (~300 ticks). This also fixes **death drops** (see §6) and clutter. Low-medium effort, high polish + correctness win. **Do this right after the fixed tick (§2).** |

## 6. PvP, Wilderness & Items Kept on Death

| | |
|---|---|
| **OSRS** | Wilderness attack range = `|cbDiff| ≤ wildyLevel` (deeper = wider); **skull** (~20 min) on attacking a player; **IKOD: keep 3** (4 with Protect Item prayer; **0**, or 1 with Protect Item, if skulled), ranked by value, rest drop to the killer; **multi vs single** combat zones + PJ timer. |
| **Us** | ⚠️ **IKOD: keep top 3 by value** is implemented (`game3_systems.js:950-967`) and now shown in the Equipment tab. ✅ Arena **duels** vs a scaled NPC (`:896-944`). ❌ No open PvP, no real player-vs-player, no wilderness level, no skull, no Protect-Item interaction, no multi/single zones. |
| **Verdict** | ⚠️ IKOD core is there (single-player). ❌ Real PvP is absent (expected — it's an MMO feature). |
| **Big win + how** | **PvP is gated on networking** (the MMO milestone). For now: **(1)** wire **Protect Item prayer → keep 4** and a **skull state → keep 0/1** into the existing IKOD calc so the system is PvP-ready. Trivial. **(2)** Add a `multiCombat` flag per zone now (cheap, future-proofs). **(3)** Design the Scarlands as our "wilderness" with the cb-range + skull rules ready for when networking lands. The math is documented; reimplement when multiplayer exists. |

## 7. Teleports & Movement Abilities

| | |
|---|---|
| **OSRS** | Spell teleports (runes + level + XP, cast delay), teleport tablets, **Home Teleport** (free, ~30-min cooldown), **teleblock** (~5 min, halved by Protect Magic), teleports blocked above Wildy 20/30. |
| **Us** | ⚠️ One **Home Teleport** to Veyhollow (2.2s cast, 60s cooldown, `game3_systems.js:762-768`). ❌ No destination-teleport spells, no tablets, no teleblock. |
| **Verdict** | ⚠️ The mechanism exists; variety is thin. |
| **Big win + how** | Add a handful of **destination teleport spells** (one per major region — Veyhollow/Stonereach/Gloomfen/etc.) as `SPELLS` entries with rune cost + Magic level + XP, reusing the existing home-teleport cast/animation/cooldown path. Cheap content win that makes the map feel connected and trains Magic. |

## 8. Skills & Progression

| | |
|---|---|
| **OSRS** | 23 skills, levels 1–99, **XP curve** `XP(L)=floor(¼ Σ floor(n+300·2^(n/7)))` (L99 = 13,034,431); level-ups unlock content; gathering/production roll success per cycle scaling with level/tier. |
| **Us** | ✅ **Exact OSRS XP curve** (`game1_data.js:146-149`). ✅ 15 skills, all with real training loops (combat, woodcutting, mining, fishing, cooking, firemaking, smithing, fletching, thieving, prayer, magic) with level-scaled success rolls. ✅ Tiered tools/resources. ❌ Missing skills: Crafting, Runecrafting, Herblore, Agility, Construction, Slayer, Hunter, Farming. |
| **Verdict** | ✅ Progression engine is OSRS-grade; ⚠️ fewer skills (by design — we pick our own set). |
| **Big win + how** | **(1) Construction** ties directly into your **Real Estate** idea (STORY_BIBLE §7) — high strategic value. **(2) Crafting** + **a Slayer-style bounty system** add huge replayability and a reason to fight specific monsters. Add skills as data + a training loop each; the framework already supports it. Pick 2–3 signature skills rather than all 8. |

## 9. Banking, Shops, Grand Exchange, Trade

| | |
|---|---|
| **OSRS** | Big tabbed bank (noted/stacked, withdraw-X); shops with **restocking** stock + price scaling by quantity; **Grand Exchange** order-book; **two-stage player trade**. |
| **Us** | ✅ Bank (stacks everything, deposit/withdraw, multiple booths). ✅ Shops (fixed stock, buy full / sell 50%). ❌ No restock/price-scaling, ❌ no GE, ❌ no player trade. |
| **Verdict** | ✅ Bank + shops work; ❌ economy depth + multiplayer commerce missing. |
| **Big win + how** | GE & trade are **MMO-gated**. Pre-MMO win: **shop restock + dynamic pricing** (each stock slot gets `defaultQty`; price scales with `currentQty/defaultQty`; restock on the world tick). Cheap, makes the economy feel alive and prevents infinite-buy exploits. |

## 10. Interfaces / Widgets

| | |
|---|---|
| **OSRS** | Cache-defined widget tree; tabbed sidebar (Combat/Stats/Quests/Inventory/Equipment/Prayer/Magic + lower row Friends/Account/Logout/Settings/Emotes/Music); fixed vs resizable. |
| **Us** | ✅ OSRS-style **tabbed sidebar, now top + bottom rows** (Combat/Inv/Equip/Skills/Quests + Prayer/Magic/Bestiary/Settings+Logout), HP/Prayer/Run/Combat orbs, minimap, chatbox, context menu, bank/shop/dialogue/worldmap modals, admin console. |
| **Verdict** | ✅ Strong, OSRS-textured UI already. ⚠️ Missing Friends/Emotes (MMO/social), XP-drop popups, hover "Action › Target" text. |
| **Big win + how** | Add **XP-drop numbers** and **top-left hover action text** — cheap, very high "feels like OSRS" payoff (already noted in `ROADMAP.md` §feel polish). |

## 11. Persistence

| | |
|---|---|
| **OSRS** | Server-side per-character save. |
| **Us** | ✅ Full `localStorage` save (XP, inv, bank, equip, quests, prayer, spell, energy, styles, look, position, tutorial, music) every 20s + manual + logout-save (`game4_ui.js:1462-1538`). ❌ Local only; no cloud/account. |
| **Verdict** | ✅ Solid for single-player. Cloud save = MMO milestone. |

## 12. Content Volume

| | OSRS | Us |
|---|---|---|
| Quests | 150+ | 4 (`game1_data.js:286-315`) — good structure, low count |
| Spells | 150+ | 10 |
| Prayers | ~29 | 9 |
| Monsters | 1000+ | ~25 typed |
| Regions | huge | 12 named |

**Big win + how:** the **engines exist**; this is a *content authoring* effort. Each quest/spell/monster is a data row (+ optional script). The multiplier here is the Build Mode editor + the tier/region plan in `STORY_BIBLE.md`. Scale content wave by wave, not all at once.

---

## The Biggest Wins — prioritized

Ranked by **(player value × foundation value) ÷ effort**:

1. **Fixed 600ms world tick + render interpolation** (§2) — the keystone. Makes everything deterministic and MMO-ready. *High effort, do it deliberately.*
2. **Ground-item lifecycle** (owner/public/despawn timers) (§5) — fixes drops, death loot, and clutter. *Low-medium, do right after the tick.*
3. **Special attacks + spec bar + auto-retaliate** (§3) — the most-felt combat gap. *Medium.*
4. **Boss combat scripts** (§4) — makes the endgame (Korthul/Fenlord) feel real. *Low-medium.*
5. **Destination teleport spells** (§7) + **shop restock/pricing** (§9) — cheap content/economy life. *Low.*
6. **XP-drops + hover action text** (§10) — huge "OSRS feel" for tiny effort. *Low.*
7. **Stab/Slash/Crush bonus split** (§3) — real combat triangle; fold into D5 item expansion. *Medium.*
8. **Signature new skills (Construction→Real Estate, a Slayer-style bounty)** (§8) — replayability + ties to the housing vision. *Medium-high, content-heavy.*
9. **PvP / Wilderness / GE / Trade** (§6, §9) — **MMO-gated**; pre-build the rules (skull, cb-range, IKOD 3/4/0/1, multi-flags) so they're ready when networking lands.

## Formulas to keep locked (we already match — don't regress)
- Accuracy two-roll branches and effective-level order (`floor(level×prayer)+style+8`) → **already exact**.
- Max hit `floor(0.5 + effStr×(strBonus+64)/640)` → **already exact**.
- XP curve `floor(¼ Σ floor(n+300·2^(n/7)))`, L99 = 13,034,431 → **already exact**.
- IKOD keep-count: 3 / 4 (Protect Item) / 0 / 1 (skulled) → wire the prayer/skull modifiers in.

---

*Sources: line-level audit of `src/*.js` + `index.html`; OSRS mechanics per the open-source
emulator projects and the OSRS Wiki (combat/accuracy/experience pages). Reimplement as our own.*
