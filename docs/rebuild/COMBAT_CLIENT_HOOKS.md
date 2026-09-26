# Combat client hooks (what the online layer calls instead of rolling)

Owner: combat agent (branch world-combat-2026-09-25). Opened 2026-09-26.

The client has ONE combat look and TWO sources of truth for what happens:

- **Offline** (Tutor's Holm, single player): `src/combat_engine.js` (`LocalCombat`) runs the 2004 rules from
  `shared/combat.js`, `shared/pvp.js` and `shared/drops.js` on the game loop's 600 ms tick and decides every hit.
- **Online** (`?online=1`): the server decides everything (`docs/rebuild/NET_PROTOCOL.md`). The client must not roll,
  must not run `LocalCombat` for server entities, and renders the server's tick deltas through the same presentation
  funnel, `CombatHooks` (`src/combat_hooks.js`).

Both paths share `CombatHooks` -> `CombatFX` (`src/combat_fx.js`: splats, health bars, projectiles, sounds, XP drops,
death sink), so a fight looks and sounds identical offline and online.

## 1. Turning the offline engine off for online play

```js
LocalCombat.enable(false);          // the game loop's LocalCombat.tick() becomes a no-op: no AI, no rolls, no queues
Player.target = null;               // clicks on remote NPCs/players send intents instead (below)
```

`LocalCombat.ready()` stays true (the interface keeps reading styles, stats and the kept-on-death preview from it).
Do not call `LocalCombat.orderAttack` / `eat` / `togglePrayer` online; send the intents instead:

| Player action | Offline call | Online intent (NET_PROTOCOL.md) |
|---|---|---|
| click / right-click "Attack <name> (level-N)" on an NPC | `LocalCombat.orderAttack(npc)` | `{t:'op_npc', nid, op:'attack'}` |
| attack a player (Wilderness) | n/a | `{t:'op_player', pid, op:'attack'}` |
| spell armed from the spellbook, then a target | `LocalCombat.selectSpell(id)` then `orderAttack` | `{t:'cast_npc', nid, spell}` / `{t:'cast_player', pid, spell}` |
| autocast (staff) | `LocalCombat.selectSpell(id)` with a staff | `{t:'autocast', spell}` |
| eat | `LocalCombat.eat(slot)` | `{t:'eat', slot}` |
| prayer on/off | `LocalCombat.togglePrayer(id)` | `{t:'prayer', id, on}` |
| combat style button | `LocalCombat.setStyle(i)` | `{t:'style', index:i}` |
| auto retaliate | `Player.autoRetaliate = v` | `{t:'auto_retaliate', on:v}` |
| special attack orb | `Player.specArmed = true` | `{t:'spec', on:true}` |

The style buttons are the same on both sides: `CRShared.combat.stylesFor(itemDef)` (2004 `CATEGORY_STYLES`), one
index per player clamped to the wielded category (`style` in the server settings = `Player.styleIndex`).

## 2. Rendering a server tick

For each entity in a `tick` delta, with `obj` = that entity's body (`THREE.Object3D`, the one in the scene):

| Delta field | Call |
|---|---|
| `a: {name:'attack', type}` (type stab / slash / crush / ranged) | melee: `CombatHooks.meleeSwing(obj, targetObj, type, 1)` for a player's blow on an NPC (the hit shows next tick), `CombatHooks.meleeSwing(obj, targetObj, type, 0)` for a blow that lands this tick (NPC on player, PvP melee); ranged: `CombatHooks.attackAnim(obj, 'bow')` |
| `a: {name:'cast', spell}` | `CombatHooks.attackAnim(obj, 'cast')` |
| `a: {name:'defend'}` | nothing: the block / flinch plays when the splat shows |
| `a: {name:'death'}` | NPC: `CombatHooks.death(npcView, dropMeshes)`; player: play the kit's `death` clip |
| `a: {name:'eat'}` | optional eat gesture; `Sfx.eat()` |
| `fx: {k:'arrow'|'spell', from, to, d, sp, splash}` | `const h = CombatHooks.projectile(fromObj, toObj, k === 'arrow' ? 'arrow' : 'spell', d, {spell: sp, splash: !!splash, tint: SPELLS[sp] && SPELLS[sp].color})`; keep `h` keyed by the target until its hit arrives |
| `h: [[amount, 'hit'|'block'], ...]` with `hp: [cur, max]` | `CombatHooks.hit(obj, amount, {kind, fx: h, frac: cur / max})` where `kind` is `'melee'` / `'npcMelee'` / `'arrow'` / `'magic'` (the attack that caused it; `'generic'` when unknown) and `h` the projectile handle from the `fx` that targeted this entity `d` ticks earlier (the splat then shows the moment the visual lands) |
| `msg: [[kind, text]]` | `CombatHooks.message(text, kind)` |
| `st` XP changes | `UI.xpDrop(skill, amount)` (CombatFX draws the drop by the minimap) |

Remote bodies (other players, server NPC views not in `WORLD.npcs`) get a health bar with
`CombatHooks.track(obj, () => hpCur / hpMax)` and lose it with `CombatHooks.untrack(obj)`. The adventurer's own bar
and hitpoints orb read `Player.hp` / `Player.maxHp`, so set those from `me.hp` before calling `hit(player, ...)`.

Timing contract: `ticks` / `d` are tick counts from NOW (the frame the tick message is processed). A projectile
launched with `d` lands exactly `d * 0.6 s` later; a splat passed its handle waits for the landing (never longer than
the frame the hit arrives). `meleeSwing(att, tgt, type, 1)` starts the swing so its impact frame is 0.6 s away (the
server applies a player's melee hit on the NPC's next turn); with `0` the swing starts now and the splat waits for
the impact frame (`CombatFX.impactTime`).

### The Scarlands HUD (`src/ui_pvp_hud.js`, `PvpHud`)

| Server data | Call |
|---|---|
| `me.wl`, `me.multi`, `me.skull` (status block) | `PvpHud.set({wl, multi, skull})`: the "Level: N" plaque, the multi-combat sign, the HUD skull with minutes left and the skull over the adventurer |
| another player's `sk` (skulled) in `pl.add` / `pl.upd` | `PvpHud.overheadSkull(bodyObj, !!sk)` |
| the adventurer clicks the Ditch | `PvpHud.ditchWarning({onCross: () => sendWalkAcross(), onStay: () => {}})`: the rules with their own numbers (`CRShared.pvp.ditchWarningLines` through `ditchWarning()` in game4_ui.js), the items they would keep (pictures), Cross / Stay |

`keptOnDeathPreview({skulled})` (game4_ui.js) gives the kept-items list for any other panel (the equipment pane's
"Kept on death" view already uses it).

## 3. Telemetry and QA

`CombatHooks.on(fn)` registers a listener that receives every presentation event
(`{k:'anim'|'swing'|'projectile'|'hit'|'death'|'msg', ...}`); the combat bench (`tools/qa_combat_pvm.js`) uses it to
measure attack gaps, hit ticks and splat-versus-projectile timing, and the online layer can use it the same way to
check it never shows a hit the server did not send.

## 4. Plain entry points for the interface (the right-click menu providers)

The menu system (CraftedRealms-Menu, `docs/rebuild/MENU_PROVIDERS.md`) calls these offline; online it sends the
matching intent instead (section 1):

| Menu option | Offline call |
|---|---|
| Attack <Name> (level-N) | `LocalCombat.attack(npc)` (= `orderAttack`: an armed spell turns it into a single cast) |
| Cast <Spell> -> <Name> | `LocalCombat.castOn(npc, spellId)` (one cast; continues only when it is also the staff's autocast) |
| (greying an option) | `LocalCombat.canAttack(npc)` |
| Eat <Food> | `LocalCombat.eat(slot)` |

`combatLevelColour(level)` (game4_ui.js) gives the 2004 colour of "(level-N)" relative to the adventurer.

## 5. What the offline engine exposes (read-only for the interface)

`LocalCombat.style()`, `styles()`, `category()`, `autocastSpell()`, `attackRange()`, `attackDelay()` (ticks),
`stats()` (`{style, bonuses, stats}` from `CRShared.combat.playerCombatStats`), `appraise(npcType)` (exact per-swing
odds both ways), `clock()`, and `qa.player()` / `qa.npc(n)` for tests. Shared helpers the interface uses directly:
`keptOnDeathPreview()` / `keptOnDeathNote()` (game4_ui.js, `CRShared.pvp.keptOnDeath`) and
`combatLevelColour(level)` (the 2004 menu colour of an opponent's level).

## 5. Known differences between the offline engine and the server (all intentional or content)

- Offline there is no PvP, no skull and no Wilderness; the kept-on-death rule runs with `skulled:false`.
- Harmless practice monsters (`t.harmless`, Tutor's Holm) swing but queue no hit (same as the server).
- The adventurer's movement offline is the client's walker (continuous, 8 directions, a diagonal step as long as a
  straight one); the engine reads the LOGICAL tile (the stance the current step ends on), like the 2004 position.
- Arrows that fall under a target pile into one ground stack per tile (`addGroundStack`); the server drops them as
  separate objects.
