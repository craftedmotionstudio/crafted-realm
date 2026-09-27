# Naming pass (2026-09-27): before and after

The one renaming pass the owner approved in `NAMING_BIBLE.md`: every name that belongs to RuneScape, and every place
name the bible superseded, is gone from what a player can read. Only display text changed. Ids, keys, file names,
save fields, server data keys and test fixtures that key on ids are untouched, so saves, the server and the tests keep
working. Branch `names-pass-2026-09-27` (from `05dcbc0`).

How it was done: a small JS lexer rewrote string literals only (never identifiers, comments or regexes), then every
hunk was read by hand. The guard `tools/test_naming_bible.js` now fails if any of these names comes back.

## Counts by category (player-facing strings changed)

| Category | Before → after | Where it shows | Count |
|---|---|---|---|
| Spawn town | Veyhollow → **Hearthmere**; Veyhollow Commons → Hearthmere; Veyhollow square → **Hearthmere Square**; Bank of Veyhollow → **Bank of Hearthmere**; Veyhollow Teleport / teleport tablet → **Hearthmere Teleport** / teleport | Zone label, quest steps, dialogue (Tobin, Maela, bankers), signposts, world map, loading and arrival lines, examine lines, statue plaque, music track, dev travel | 56 strings in 28 files, + 4 in `index.html`, + 2 server map area names |
| Online start area | "the Commons" → **Hearthmere** | Respawn line (client and server), supply chest line, register button, Scarlands warning button, death panel, zone fallback, region chart | 8 |
| Spawn castle | Wardenholm Keep → **Hearthmere Castle** (the Wardens' Guild keeps its name) | Zone name, quest *Oath of the Undercroft*, keep greeting, signpost, deeds log | 12 |
| Harbour town | Saltreach Port → **Gullhaven** | Zone name, signpost, harbour chat line | 3 |
| The boundary | the Wilderness Ditch → **the Ditch** | Quest *The Seer's Ashes* | 1 |
| Login | WORLD 1 VEYHOLLOW → **WORLD 1 HEARTHMERE**; ENTER VEYHOLLOW → **ENTER HEARTHMERE**; Map of Veyhollow → **Map of the Hearthlands** | Login badge, play button, world map title, bank title | 4 in `index.html` + 1 in `login_overhaul.js` |
| Spells | Wind/Water/Earth/Fire Strike → **Gale/Tide/Stone/Ember Dart**; … Bolt → **… Lance**; Wind/Water/Earth Blast → **… Wrath** (Fire Blast was already Ember Wrath); Confuse → **Befuddle**; Weaken → **Sap**; Low/High Level Alchemy → **Lesser/Greater Transmute** | Spellbook names and tooltips, the island's magic lesson (Magister Ilse's lines, banner, lectern, rune table, curriculum hint) | 15 spell names + 8 text lines |
| Runes | Air/Water/Earth/Fire/Mind/Body/Chaos/Nature runes → **Gale/Tide/Stone/Ember/Wit/Flesh/Wild/Verdant rune**; Spark runes → **Spark rune** (every rune singular now) | Item names, spell costs ("1 gale, 1 wit"), rune header, quest text ("2 ember runes and 2 stone runes"), island rune lines | 9 item names + 13 text mentions |
| Prayers | Thick/Rock/Steel Skin → **Oak/Stone/Iron Hide**; Burst of/Superhuman/Ultimate Strength → **Boar's/Bear's/Lion's Heart**; Clarity of Thought/Improved/Incredible Reflexes → **Steady/Sure/True Hand**; Sharp/Hawk Eye → **Kestrel's/Falcon's Sight**; Mystic Will/Lore → **Candle Will/Lantern Lore**; Protect Item → **Keepsake Ward**; Protect from Magic/Missiles/Melee → **Ward against Spells/Arrows/Blades** | Prayer book and tooltips, death and skull help (`game4_ui`, `ui_pvp_hud`, `shared/pvp.js`), the death chat line | 17 names + 5 text lines |
| Monsters | Giant Mole → **The Great Delver** | NPC name | 1 |
| Special attacks | Rampage (RuneScape's dragon battleaxe special) → **Roaring Swing** | Spec bar name | 1 |
| Brand | "OSRS-style" → "old-school style" (village chatter overlay tooltip); "Refined OSRS character preview" → "Refined character preview"; "old bitmap RuneScape numerals" (a CSS note) → "old bitmap numerals of 2004" | Options tooltip, dev chat line | 3 |

Code: 54 files in the first commit (48 scripts, `index.html`, 2 server maps, 4 tests and QA drivers). Every changed
script's `?v=` is now a content hash (index.html, the legacy loader lines and the `online_boot.js` list). The world
map no longer draws "Hearthmere" twice (the commons zone and the town label now share the name).

Docs (forward-looking and lore only): `STORY_BIBLE.md`, `docs/rebuild/WORLD_CONTENT_PLAN.md` (Zahrim and the Sun
Gate, Duskford, Gullhaven, Rimeby, Brinkhold, Hearthmere, Hearthmere Castle; its ASCII region map re-aligned),
`WORLD_GOAL_2026-09-25.md`, `WORLD_LAYOUT_GUIDE.md`, `SHIP_PLAN.md`, `GUIDING_LIGHT.md`: 275 lines. `VEYHOLLOW_DESIGN.md`
got a names note at the top instead of a rewrite. `NAMING_BIBLE.md` gained "Added by the naming pass".

Tests that asserted old display text now assert the new names (nothing weaker): `tools/test_online_client.js` (area
name), `server/test/integration.test.js` (respawn line), `tools/qa_holm_island_playthrough.js` and
`tools/qa_holm_island.js` (pick "Gale Dart" in the spellbook).

## Kept unchanged on purpose

- **Ids and files:** `veyhollow-commons-v2`, `commons`, `wardenholm`, `saltreach`, `air_rune` and the other rune ids,
  `wind_strike` … `fire_blast`, `confuse`, `weaken`, `low_alch`, `high_alch`, `home_tele`, `home_tab`, the 17 prayer ids,
  `giant_mole` (and `giant_mole.glb`), the icon file names, `src/veyhollow_town.js`, `src/wardenholm.js`,
  `src/saltreach.js`, `VEYHOLLOW_DESIGN.md`, lowercase log tags like `[wardenholm]`.
- **Comments, dated logs and closeouts:** they record what was true when written.
- **Test descriptions in tools/ and server/test** that name the 2004 rule under test ("Protect from Melee zeroes an
  NPC melee roll"): developer text, not player text, and they still describe the 2004 source.

## Left alone, and why (owner's call if any of these should change)

1. **The "Hollow" family** (Hollow Well, Hollow Well Square, Hollow ale, Hollow Bazaar, the "of the Hollow" title) and
   the **"Vey" family** (Veyrite, the river Vey, Veymouth, Old Veymarch): our own words, not RuneScape's, and the
   bible does not rename them. They were born from the old town name, so a later pass may want Hearth- forms.
2. **2004 system messages** copied word for word ("Oh dear, you are dead!", "Nothing interesting happens.",
   "I can't reach that!", "You are already under attack!", "Someone else is fighting that.", "Congratulations, you
   just advanced a … level."): they are lines, not names, they carry the 2004 feel the owner asked for, and the
   server tests assert them. If the owner wants them ours too, it is one small follow-up.
3. **Ordinary words that RuneScape also uses** stay, as the bible says: Monk robe, Wizard hat, Holy symbol, Big bones,
   Raw shrimps, the combat style names (Stab, Lunge, Slash, Block, Chop, Pound), "Items kept on death", "curse" as the
   plain word in "cast the curse", and the axe special **Cleave** (RuneScape's longsword special shares the word, but
   it is the plain verb for an axe; Rampage was renamed because RuneScape uses it on the same weapon, the battleaxe).
4. **"the Commons"** became Hearthmere wherever it named the town (the online alpha). The Holm district name
   "Commons Threshold" (author-facing layout data) and the grubkin's "a wriggling pest of the commons" (common land,
   lowercase) stay.
5. **"Map of the Hearthlands"**, not "Map of Hearthmere": the map shows the whole valley, which the bible renames the
   Hearthlands.
6. **The duel arena zone is still "The Proving Grounds".** The bible lists the Oathring as the duel arena, but the
   live zone has always been the Proving Grounds and neither is RuneScape's; the world agent can settle it when the
   arena is built.
7. **"OSRS" inside internal strings** (CSS comments carried in style strings, the item catalog's reference notes, the
   building "look" notes) is not player-facing; the guard does not ban it. The one player-visible "OSRS-style" is gone.
8. **Text an old save already holds.** A save made on an upper floor stores the zone label it showed, and the
   Realm Deeds log stores its lines as written ("Slew Giant Mole (level 46)"); those old entries keep their old words
   (the label until the next zone change, the log like any diary). Saves themselves load unchanged: they keep ids only.
9. **`src/castle.js`** (retired 2026-07-03, never loaded): its one chat line now says "The old keep rises to the north"
   so the guard stays simple.

## Gates

| Gate | Result |
|---|---|
| Unit tests (`for t in tools/test_*.js`) | 85/85 pass (84 existing + the new `test_naming_bible.js`) |
| `npm run test:server` | 98/98 pass |
| Smoke, both phases (`run_smoke_headless.js`) | PASS foreground and hidden: structural 108/108, 0 page errors |
| Island playthrough (`qa_holm_island_playthrough.js 1`) | 1/1 complete: 18/18 lessons, 10/10 tutors met, 0 page errors, 11.8 min; the magic trial (68 s) picked Gale Dart from the spellbook by its new name |
| Login screen (headless screenshot) | the WORLD 1 HEARTHMERE badge and ENTER HEARTHMERE button fit (no overflow), 0 page errors; spellbook, prayer book and rune names read live from the page |
| The guard, seeded | fails (6 checks) with "Wind Strike" and the VEYHOLLOW badge put back; clean when reverted |
