# Veyhollow Keep — a Lumbridge-style castle

A faithful, low-poly recreation of **OSRS Lumbridge Castle**, themed as the seat of Veyhollow
("Veyhollow Keep"). Built from a **modular stone kit** (modelled in code) and **hand-placed piece by
piece** — the RuneScape workflow (a library of reusable models + careful placement on the tile grid),
NOT a single sculpted mesh and NOT procedural box-buildings.

Implementation: `src/castle.js` (kit + `buildVeyhollowKeep()` authoring). Plateau carved in
`terrainHeight()` / `CASTLE_SITE` (`src/game2_world.js`). Build hooked in `src/game5_main.js`
(step "Populating Veyhollow"). Script tag in `index.html`.

## Location & footprint
- Plateau centre **(0, −51)**; keep centre **(0, −57)**, sitting north of Veyhollow Commons by the
  river, so the player approaches the gate from the south (the commons side).
- Keep ~**16×16 tiles**, three tall storeys; walled courtyard to the south (~20×12) with the gate.
- Whole complex ~**20 wide × 28 deep** — a compact square keep, Lumbridge-style.

## What's built (v1)
- **Exterior:** square grey-stone keep, four **square** corner towers (crenellated, red pennants),
  **belt-course** floor lines, arched **window-slits**, **blocky crenellations** lined with **black
  cannons**, a tall **gatehouse** (twin towers + raised crenellated block + cannon), and a **cobbled
  approach causeway** with parapets up to the gate.
- **Courtyard:** cobbled path, **two octagonal fountains**, **two statues**, wall torches.
- **Walk-in ground floor** (roof + upper storeys lift away on entry via `WORLD.interiors`):
  - **Great hall** — long dining table, benches, chandelier, **lit fireplace**, wall portraits, banners.
  - **Kitchen** (NW, partitioned) — cooking **range**, **trapdoor** (to a future cellar), barrels/crates, table.
  - Two **grand staircases** (north & south ends) — currently landmarks.
  - NPCs: a cook (kitchen) and a monk (hall).

## Faithful to Lumbridge (from OSRS Wiki research)
Square keep + 4 square corner towers · blocky crenellations + **black cannons** (signature) · grassy
walled courtyard with **2 fountains + 2 statues** · **3-step** front entrance · **rear (north)
entrance** · two N/S staircases · ground-floor **kitchen range + trapdoor** · long table + wall
portraits · grey stone on green lawn by a river.

## Deliberately deferred (engine limits / scope)
- **Upper floors are exterior-only.** The engine has no player floor-switching yet (chunk objects
  carry a `level` field but there's no climb-up). The Duke's bedroom + spinning room (Upper-1) and the
  top-floor bank + log spawns (Upper-2) and the cellar are **not yet walkable**. The staircases are
  landmarks until a floor system is added — the data is structured so it can be.
- Saradomin heraldry → generic red pennants (our world isn't Saradomin).

## Next passes (ideas)
- Add a floor-switching system → make the staircases functional; furnish Upper-1 (Duke + spinning
  wheel + drawers), Upper-2 (bank), and the cellar.
- More courtyard life (NPCs, market, church/graveyard to the south, a bridge over the river east).
- Expose castle kit pieces in the Build palette (`game_editor.js`) so they're placeable in-editor.
- Texture polish: stronger stone/cobble texture contrast; larger cannons.

## Reference
OSRS Wiki: Lumbridge_Castle, Lumbridge, Staircase/Cooking range/Bank (Lumbridge Castle).
