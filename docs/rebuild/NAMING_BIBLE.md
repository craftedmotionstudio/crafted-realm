# Naming bible (2026-09-26)

Owner: "I want you to come up with the best names you can think of. All names previously used were just random ideas
that aren't locked in." Owner also approved renaming every name that belongs to RuneScape (one pass, saves keep working).

## Rules for every name
1. Ours alone: no Jagex/RuneScape names or near-copies, no famous names from other games or books (no "Stormwind",
   "Rivendell", "Murkmire", no Strike/Bolt/Blast/Wave or Burst/Blitz/Barrage spell tiers, no Protect-from prayers).
2. Old-school sounding: two or three syllables, easy to say and spell, a little odd, like a real old map
   (Lumbridge, Varrock and Falador all work this way).
3. Says what the place is: a player should guess the town's mood from its name.
4. Distinct: no two major places share a first syllable or ending (no two "-reach", no two "Bryn-", no "-wick" twins).
5. Internal ids never change (saves, tests and server data keep `veyhollow`, `air_rune`, `tutors-holm-v3`...); only
   display names, text and new ids use these names.

## Places
| Role (2004 equivalent) | Name | Why |
|---|---|---|
| Tutorial island (Tutorial Island) | **Tutor's Holm** (kept) | Says exactly what it is; "holm" = small island; charming |
| Its lighthouse finale | **Lastlight** (kept) | The last light you see before the mainland |
| Spawn town (Lumbridge) | **Hearthmere** (was Veyhollow) | Hearth = home, where every adventurer starts; mere = the lake beside it. Cozy, easy to say |
| Spawn castle (Lumbridge Castle) | **Hearthmere Castle** (was Wardenholm Keep) | The respawn castle belongs to the town, as in 2004 |
| The heartland around it | **the Hearthlands** (was the valley of Veyhollow) | Safe centre of the realm |
| Big walled city, north (Varrock) | **Aldermarch** (kept from the plan) | "Alder" old + "march" borderland: the old city that guards the frontier |
| Bank post before the Wilderness (Edgeville) | **Brinkhold** (was Frontier Post) | A hold at the brink of the Scarlands |
| Wilderness | **the Scarlands** (kept) | Burned land of the Scarring; reads as danger |
| Its boundary | **the Ditch** (kept) | Plain and old-school |
| East desert | **the Ashar Dunes** (kept) | Its own language, like the desert people |
| Desert town (Al Kharid) | **Zahrim** (was Palmgate) | A name in the desert people's own tongue, so the east feels foreign; its toll gate is **the Sun Gate** |
| West village (Draynor) | **Duskford** (was Emberford) | A river crossing where the light fails early: cozy by day, with the spooky **Blackbriar Manor** above it |
| West forest | **Emberwood** (kept) | Autumn forest, amber canopy |
| South swamp | **Gloomfen** (kept) | Reads instantly as a swamp, like 2004's plain names |
| Swamp stilt village | **Reedwick** (kept) | Gentle village name among the reeds |
| South lake | **Mirrorpond** (kept) | Still water, fishing |
| East quarry | **Stonereach** (kept) | The only "-reach" left |
| South-east port (Port Sarim) | **Gullhaven** (was Saltreach Port) | Gulls over a harbour; removes the second "-reach" |
| North-west snow keep | **Whitmoor Hold** (kept) | Knightly highland keep |
| North-west hamlet | **Rimeby** (was Brynstead) | Frost hamlet; removes the second "Bryn-" |
| North-east raider coast | **Brynholt** (kept) | Raiders and bowyers |
| Deep north underworld | **the Undercrag** (kept); its lord **Korthul** (kept) | |
| Duel arena (Duel Arena) | **the Oathring** (kept) | Fights by oath |

## Magic (replaces RuneScape's spell names)
Element words: Gale (air), Tide (water), Stone (earth), Ember (fire). Tier words: **Dart** (1), **Lance** (2), **Wrath** (3).

| RuneScape name in our code | Our name |
|---|---|
| Wind / Water / Earth / Fire Strike | Gale / Tide / Stone / Ember Dart |
| Wind / Water / Earth / Fire Bolt | Gale / Tide / Stone / Ember Lance |
| Wind / Water / Earth / Fire Blast | Gale / Tide / Stone / Ember Wrath |
| Confuse | Befuddle |
| Weaken | Sap |
| Curse | Hex |
| Low / High Level Alchemy | Lesser / Greater Transmute |
| <Place> Teleport | <Place> Teleport (follows the place names, e.g. Hearthmere Teleport) |

## Runes (display names; item ids unchanged)
| id | Our name |
|---|---|
| air_rune | Gale rune |
| water_rune | Tide rune |
| earth_rune | Stone rune |
| fire_rune | Ember rune |
| mind_rune | Wit rune |
| body_rune | Flesh rune |
| chaos_rune | Wild rune |
| nature_rune | Verdant rune |
| law_rune | Writ rune |
| death_rune | Grave rune |
| cosmic_rune | Star rune |
| blood_rune | Vein rune |
| soul_rune | Spirit rune |

## Prayers (the Dawn's vows)
| RuneScape name | Our name |
|---|---|
| Thick Skin / Rock Skin / Steel Skin | Oak Hide / Stone Hide / Iron Hide |
| Burst of Strength / Superhuman Strength / Ultimate Strength | Boar's Heart / Bear's Heart / Lion's Heart |
| Clarity of Thought / Improved Reflexes / Incredible Reflexes | Steady Hand / Sure Hand / True Hand |
| Sharp Eye / Hawk Eye | Kestrel's Sight / Falcon's Sight |
| Mystic Will / Mystic Lore | Candle Will / Lantern Lore |
| Rapid Restore / Rapid Heal | Quick Mend / Quick Renewal |
| Protect Item | Keepsake Ward |
| Protect from Magic / Missiles / Melee | Ward against Spells / Arrows / Blades |

## Monsters
| RuneScape name | Our name |
|---|---|
| Giant Mole | the Great Delver |
Generic creature words (rat, skeleton, goblin, spider, chicken, cow) stay; any other creature name that is distinctly
RuneScape's is renamed when found (the renaming pass greps the whole data set against this bible).

## Kept on purpose
Generic armour and item words (sword, platebody, platelegs, kiteshield, helm, shortbow, bar, ore, logs) stay: they are
ordinary words players expect. Skill names stay generic (Attack, Mining, Cooking...). "Crafted Realm" is the game.

## Applying it
One renaming pass after the combat, online and menu branches merge (they touch the same data and dialogue): display
names, dialogue, quest text, docs, map labels, teleports and the login badge; ids unchanged; a test that fails if any
RuneScape name from this bible reappears in player-facing text.

## Added by the naming pass (2026-09-27)
Names the pass had to invent or settle, each with its reason (`docs/rebuild/NAMING_PASS_2026-09-27.md` has the full
before/after list).

| Name | Replaces | Why |
|---|---|---|
| **Roaring Swing** (battleaxe special attack) | Rampage | "Rampage" is RuneScape's own dragon battleaxe special; the new name is the swing its chat line already describes ("You wade in with a roaring swing!") |
| **Map of the Hearthlands** (world map title) | Map of Veyhollow | The map is of the valley, and the valley is now the Hearthlands |
| **Hearthmere Square** (respawn message, the old editor's square) | Veyhollow square | The bible's own rule: "Hearthmere Square where it means the square" |
| **Hearthmere Bank**, **the Bank of Hearthmere**, **Hearthmere Ferry Landing**, **Hearthmere Teleport** (spell and tablet) | the Veyhollow forms | They follow the town |
| **Spark rune** (singular) | Spark runes | Every rune reads singular like the 2004 book ("Gale rune"), so the one rune that was already ours matches |

The guard `tools/test_naming_bible.js` fails when any RuneScape name from this bible, or from its extra list (2004
places, gods, quests, NPC titles, metals, monsters, prayers, spells and the brand), reappears in player-facing text,
and when an id this pass kept (`air_rune`, `wind_strike`, `protect_item`, `giant_mole`, `commons`...) goes missing.

## Added by the skill guides (2026-09-27)
The skill guides (`src/skill_guide_data.js`) show the planned content of `docs/rebuild/WORLD_CONTENT_PLAN.md` as "Coming
later" rows. Where the plan still used a retired root or a name this bible had already settled another way, the guides use:

| Name | Replaces | Why |
|---|---|---|
| **Salmon** (Fishing 30, Cooking 25) | the plan's "Vey salmon" | "Vey" is the root of the retired Veyhollow; a plain fish word reads like 2004's |
| **Ford stepping stones** (Agility 5) | the plan's "Vey ford stones" | The same retired root; it is simply the ford by Hearthmere |
| **Writ rune** (Runecrafting 54) | the plan's "Way" rune | This bible already names `law_rune` the Writ rune |
| **Whitsteel, Aurel, Veyrite, Undercrag** (the metal tiers after steel, `TIERS` in `game1_data.js`) | the roles of 2004's four top metals | Already live; recorded so the anvil and the guides' tiers are on the list. Whitsteel is Whitmoor's pale knightly steel, aurel a gold-bright alloy, undercrag the ore of the Undercrag. Veyrite also carries the retired "Vey" root: renaming it is an owner call (ids stay) |

## Added by the creatures pass (2026-09-29)
The owner asked for the old-school creatures under their plain names ("a giant rat would be a good option instead - we'll
call it a large rat"; goblins, chickens, cows). Generic creature words stay (above), so the display names became the plain
words and every internal id stayed (saves, drop tables, map spawns and tests name them). New models: Blender, our own
(`tools/blender/build_holm_creatures_v1.py`). The guard checks these names and that no creature is a grubkin any more.

| Name | Replaces | Why |
|---|---|---|
| **Large rat** (`large_rat`, level 3; the island trial rats and the Proving Ground pack) | the grubkin (all of its forms: the practice, wild and mainland ones) | The owner never liked the grubkins; a big rat is the 2004 first foe. "Large" keeps it our own, a generic word |
| **Rat** (`burrowrat`) | Burrow rat | A plain creature word, like 2004's |
| **Goblin** (`gnarlgob`) | Gnarlgob | "Goblin" is on the kept list; the invented name read as a stand-in |
| **Chicken** (`pasturehen`) | Pasture hen | A plain farm-animal word |
| **Cow** (`moorcalf`) | Moorcalf | A plain farm-animal word |
| **Rat matriarch** (`pg_rat_matriarch`, the Proving Ground's boss) | the grubkin broodmother | The pack's mother follows the pack; our own title |
| **Rat Trouble** (quest id `grub_trouble` kept) | Grub Trouble | Warden Maela's pests are large rats now |
| **Vermin Bane** (deed id `grubslayer` kept, title "the Vermin Bane") | Grubslayer | The deed counts large rats and goblins; earned deeds keep their id |
