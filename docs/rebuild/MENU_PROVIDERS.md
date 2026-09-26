# The old-school right-click menu: provider API

Owner, 2026-09-26: "The right click functionality doesn't really work like OSRS. We will need that added in."

Every menu in the game now comes from one model, `OsrsMenu` (`src/osrs_menu.js`). The world under the cursor
(`src/osrs_menu_world.js`) and every item slot (`src/osrs_menu_items.js`: pack, worn equipment, bank, shop) are
**providers**. A provider says what rows an entity has; the model orders them the 2004 way, colours them, draws the
"Choose Option" box, writes the top-left hover line, and makes a left click run the top row. It is our own code and
text throughout (no Jagex code, text or art).

## What the player sees

- **Right click**: a "Choose Option" box whose top edge sits at the cursor, centred on it horizontally and kept on
  screen. Rows, top to bottom:
  1. every entity the cursor ray meets before the ground, nearest first (a tutor standing in front of a door gives
     both), each with its options (its primary option first, then the rest by priority);
  2. tile rows (shift + right click: Mark / Label Tile);
  3. **Walk here**;
  4. one **Examine** per entity, in the same order;
  5. **Cancel**.
- **Left click** runs exactly the top row. The top-left line shows that row, then " / N more options" (every other
  row except Cancel).
- **Colours**: the option verb white, NPC names yellow, object names cyan, item names orange, player names white.
  An attackable NPC or player carries "(level-N)" on each of its rows, coloured by the level difference against the
  player's combat level: green when lower, yellow when equal, orange to red when higher (the old client's scale).
- The hovered row lights up yellow. The box closes when the mouse strays about 10 px outside it, on Escape, or on a
  click outside it (that click does nothing else). No animation.
- **Touch**: a long press opens the same menu.
- **Use-mode**: "Use" on a pack item picks it up. The hover line reads "Use <item> -> <target>", every entity and every
  other pack item offers that one row (no Examine), and Cancel or Escape puts the item away. Targets that take the item
  run the game's own handler (net on the fishing spot, raw fish or bread dough on a fire or the oven, ore on the
  furnace, a bar on the anvil, tinderbox or knife on logs, flour and water on dough); anything else says
  "Nothing interesting happens."
- **Shift + right click** adds the RuneLite-style extras that are not 2004: colour tags on items, Appraise and
  Drop-table on monsters, "Left-click:" swaps, tile markers.

## Entry shape

```js
{ option: 'Talk-to',          // the verb, plain text
  target: 'Guide Bram',       // the name (omit to use the entity's name from describe())
  targetType: 'npc',          // 'npc' | 'player' | 'object' | 'item' | 'ground' (colours the name)
  level: 3,                   // optional: shows "(level-3)" coloured by the level difference
  item: 'Tinderbox',          // optional: makes a use row, "Use Tinderbox -> Logs"
  fn: function(){ ... },      // what the row does (a left click on the top row calls it too)
  priority: 100,              // higher sits higher inside its entity (primary: 100+, others lower)
  examine: true,              // optional: this row is the entity's Examine (goes to the Examine band)
  below: true }               // optional: sits just under Walk here (e.g. a deprioritised Attack)
```

## Registering

```js
OsrsMenu.registerProvider({
  id: 'my-content',            // unique; registering the same id again replaces it
  order: 50,                   // providers run in this order (the world's own: holm 10, world 20, interact 5, generic 1000)
  kinds: ['player'],           // entity kinds (userData.kind) it answers, or '*' for every world entity
  describe(entity) {           // optional: the entity's identity (the first provider that answers wins)
    return { name: 'Zezima', type: 'player', level: 3, examine: false };   // examine: text, a function, or false (no Examine)
  },
  entries(entity, ctx, desc) { // the rows; ctx.e is the mouse event, ctx.shift the shift key, ctx.entities the whole list
    return [{ option: 'Follow', priority: 90, fn(){ ... } }];
  }
});
OsrsMenu.registerGround({ id, order, entries(ctx) });      // rows that belong to the tile (above Walk here)
OsrsMenu.registerHook(function(entries, ctx, entities){}); // reorder after sorting; return a new array to replace it
```

An **entity** is `{kind, obj, u, point, key}`: `obj` is the Three.js object the ray met (walked up to the first parent
with a `userData.kind`), `u` its `userData`, `point` the hit point, `key` what makes two meshes the same thing (one
tutor, one service and its hit box, one door). Item slots are entities of kind `slot-pack`, `slot-bank`,
`slot-deposit`, `slot-shop`, `slot-sell` and `slot-worn`.

Every entity gets an Examine: the provider's own Examine row if it gives one, else `describe().examine` (else a plain
"It's a <name>."). Give new content its own short line.

## Players (for the online layer)

Render another player's model with `userData.kind = 'player'` and push it (or its hit box) into `WORLD.clickables`, then:

```js
OsrsMenu.registerProvider({ id: 'online-players', order: 30, kinds: ['player'],
  describe: e => ({ name: e.u.player.name, type: 'player', level: e.u.player.combatLevel, examine: false }),
  entries: (e, ctx) => {
    const p = e.u.player, rows = [
      { option: 'Follow',     priority: 60, fn: () => Net.follow(p.id) },
      { option: 'Trade with', priority: 50, fn: () => Net.trade(p.id) },
      { option: 'Report',     priority: 10, fn: () => Net.report(p.id) }];
    if (inWilderness()) rows.unshift({ option: 'Attack', priority: 100, fn: () => Net.attack(p.id) });
    return rows;
  } });
```

The name is drawn white and "(level-N)" in the level-difference colour; old-school player menus have no Examine
(`examine: false`).

## The Interact dispatcher

Content registered with `Interact.register({target:'kind:holm_bank_booth', option:'Use', primary:true, ...})` shows up
automatically: `Interact.optionsFor(hit)` feeds the `interact` provider, primary options above the kind's own rows,
the rest after them. Nothing else to do.

## Holm objects and their rows

| Object | Rows (top first) |
| --- | --- |
| Tutors (Guide Bram ... Ferryman Tobin) | Talk-to, Walk here, Examine, Cancel |
| Island services (oven, flour bin, quest board, bank counter, ladders, lever ...) | its verb (`option` in `SERVICES`, `holm_island_extras.js`) + name, Walk here, Examine |
| Guide House doors | Open or Close Door |
| Relief chart / provision rack | Study Relief chart / Collect-tools Provision rack |
| Cellar hatch / cellar ladder / stairs | Climb-down Trapdoor / Climb-up Ladder / Climb-up or Climb-down Staircase |
| Lantern Keeper statue | Read-plaque Statue |
| Progress gates | Open Door or Gate (an open one: Walk here, Examine) |
| Signposts | Read Signpost |
| Teaching oaks, fishing spot, ore rocks | Chop down Oak, Net Fishing spot, Mine Copper rock |
| Fire / furnace / anvil | Cook Fire, Smelt Furnace, Smith Anvil |
| Ground items | one Take per item on the tile, Walk here, one Examine per item |
| Practice grubkins | Attack Practice grubkin (level-1), Walk here, Examine |

Every row calls the same click the game always handled (`handleClick` -> `HolmArrivalQA.handleClick`), so walking to
the stance, the tutor-first refusals (`HolmIslandTalk`) and the lessons are unchanged for left and right clicks alike.

## Tests

- `node tools/test_osrs_menu.js` — the model, order, colours, every Holm kind's rows and examine lines, use-mode,
  slot menus, and the data (every island service has a menu option, name and examine; every tutor an examine).
- `SMOKE_BASE=http://127.0.0.1:<port> node tools/qa_osrs_menu.js` — real mouse clicks on the live island; captures in
  `scratchpad/holm_menu_v1/`, then `python tools/make_osrs_menu_sheet.py` for the side-by-side with the reference.
