# Crafted Realm — World & Story Bible (v0.1)

> **Purpose:** the single source of truth for lore, world, progression, and systems.
> **Status:** v0.1 — a *strong, deep foundation built to iterate on*, the way OSRS keeps
> shipping new content on a stable base. Everything here is grounded in lore that already
> exists in `src/game1_data.js` (zones, NPCs, quests, factions, tiers) so the game and the
> fiction never contradict each other. Sections marked **↻ ITERATE** are deliberate open
> hooks for future expansion.
>
> **IP stance (non-negotiable):** we adopt *structure and feel* from OSRS (tiered metals,
> skill grind, tick combat, quest arcs) but every name, item, region, stat, and pixel is
> ours. Never copy Jagex names, assets, cache, or layout. See `ROADMAP.md` §IP boundary.

---

## 1. The Realm — premise

**Crafted Realm** is a medieval fantasy world. The known, civilised heart of it is the
valley of **Veyhollow** — a frontier hollow ringed by wilder lands: an autumn forest to the
west, a drowned fen to the south-west, quarried crags and shifting dunes to the east, calm
lakes to the south — and, to the **north beyond the Wilderness Ditch**, the burned
**Wilderness** (the Scarlands), flanked by a snow keep (Whitmoor Hold, NW) and a frost coast
(Brynholt, NE), and rising to the lightless **Undercrag** at its deep-north edge.
Civilisation here is young and thin; most of the map is contested by monsters, raiders, and
older, hungrier things.

> **World-map status (owner, 2026-07-13):** `Maps/Crafted Realms Map.png` and
> `Bible_References/UI_OpenMiniMap.jpg` are planning/reference artifacts, not immutable geography or UI
> canon. Browser 1.0 is authored around the four locked region roads and purposeful travel. Preserve the
> strong north-beyond-the-Ditch risk concept unless a later owner decision changes it, but revise exact
> coastlines, distances, roads, topology, icons, bezel, and map drawing whenever gameplay and readability
> improve. The approved v2 chunk/map data becomes the eventual source of truth.

The player washes ashore on **Tutor's Holm**, a small instructional island off the coast,
with no memory and no name. **Guide Bram** sets them on their feet, then sends them by
rowboat to the mainland at Veyhollow Commons. From there the world opens up.

**The long arc (↻ ITERATE):** Veyhollow sits on the rim of an old catastrophe — *the
Scarring* — that burned the northern reaches and woke things under the crag. The Wardens'
Guild holds the line; the Spire studies why it happened; the Dawn prays it won't repeat.
The player's journey climbs from clearing grubs out of a field to standing against
**Korthul the Undercrag**, the mountain's grudge given legs — and beyond, into whatever
the Scarring left behind. This top-end is intentionally open so we can keep extending the
ladder for months/years of content.

---

## 2. Factions (already seeded in code)

| Faction | Identity | In-game hooks today | ↻ Iterate toward |
|---|---|---|---|
| **The Wardens' Guild** | Frontier law & monster-culling | Warden Maela, Wardens' sigil, quests *Grub Trouble* / *Wardens' Trial* | Player rank ladder, bounty board, guildhall |
| **The Spire** | Arcane scholars, rune trade | Spire Vaults shop, wizards, runes, Glimmerveil Arcana | Spellbook progression, research quests |
| **The Dawn** | Monastic order, Prayer | Monks, holy symbol, monk robes | Prayer altars, blessing quests |
| **Whitmoor Hold** | Knightly martial order | Hold Knights, Whitmoor Hold zone | Combat training, honour/duel arc |
| **Brynholt northerners** | Raiders & bowyers | Bryn raiders, Brynholt Bowyer | Raider faction quests, fletching |

---

## 3. The world map — regions & ecosystems

Twelve legacy zones already exist (`ZONES` in `game1_data.js`). They are a reusable idea inventory, not a
Browser 1.0 obligation. The locked launch roads are Tutor's Holm/Veyhollow, Emberwood/Stonereach,
Mirrorpond/Gloomfen, and the Scarlands. They apply the OSRS ecosystem-diversity lesson:
**each region = a distinct biome, a distinct skill
focus, a distinct threat band, connected by roads** (the OSRS "every direction feels
different" principle).

| Region | Biome | Skill focus | Threat | Anchor content |
|---|---|---|---|---|
| **Veyhollow Commons** | Green valley hub | All (banks, shops, tutor) | Safe | Town square, bank, smithy, pub |
| **Emberwood** | Warm autumn forest | Woodcutting / Firemaking | Low | Olun the Miller, emberwood logs |
| **Stonereach Quarry** | Rocky crag | Mining / Smithing | Low | Stonereach Smithy, Ferra |
| **Mirrorpond** | Calm lake | Fishing / Cooking | Low | Mirrorperch fishing |
| **Gloomfen** | Drowned purple fen | Combat (mid) | Mid | The Fenlord (boss), boglings |
| **Brynholt** | Cold northern coast | Fletching / Ranged | Mid | Bryn raiders, bowyer |
| **The Ashar Dunes** | Desert | Thieving / exploration | Mid | Duneclaws |
| **Whitmoor Hold** | Snowy highland keep | Combat (knightly) | Mid-high | Hold Knights |
| **The Scarlands** (the Wilderness) | Burned wasteland, **NORTH past the Wilderness Ditch** (deeper = deadlier) | High-risk combat, opt-in PvP | Scales w/ depth | Ash stalkers, rare drops, the Ditch gate |
| **The Proving Grounds** | Arena (south, by Mirrorpond) | PvP/duel sandbox | Opt-in | Pit duelist |
| **The Undercrag** | Lightless undercity at the wild's deep-north edge | Endgame combat | Highest | **Korthul** (lvl 58 boss) |
| **Tutor's Holm** | Tutorial island | Onboarding | Safe | Guide Bram |

**The macro biome plan (revised 2026-07-03 — Wilderness moved NORTH to match the bible map,
OSRS-style; matches `Maps/Crafted Realms Map.png`):**

| Compass | Biome band | Zones (built ✅ / planned ⏳) |
|---|---|---|
| Centre (safe core, below the Ditch) | Temperate heartland (the "Lumbridge belt") | ✅ Veyhollow Commons, ✅ Wardenholm Keep |
| **North — beyond the WILDERNESS DITCH** | **THE BIG WILDERNESS** — burned wasteland + frontier | ✅ **The Scarlands** (centre; threat scales with depth, opt-in PvP), ✅ **Whitmoor Hold** (NW snow keep), ✅ **Brynholt** (NE frost coast, raiders/bowyers) — ⏳ **extend the Scarlands northward 2-3× as the true deep-wild**: deeper = deadlier, rare resources |
| Deep north / endgame | Volcanic underworld at the wild's far edge | ✅ **The Undercrag** (Korthul) · ⏳ surface volcano/tropic isle (post-V1, reached by boat from Saltreach) |
| West | Autumn forest | ✅ Emberwood (amber canopies) |
| South-west | Drowned dark fen (our Morytania) | ✅ Gloomfen |
| East | Rocky crag → desert → far coast | ✅ Stonereach Quarry, ✅ Ashar Dunes · ⏳ **Saltreach Port** (SE harbour town — ships, charters, smuggler flavor; our Port Sarim) |
| South | Lakes & arena | ✅ Mirrorpond (fishing), ✅ The Proving Grounds |
| South-east (offshore) | Tutorial isle | ✅ Tutor's Holm (rowboat to the mainland) |

**The Wilderness Ditch (OSRS-style gate, built into the game):** a single east–west trench
runs the full width of the map, separating the safe south from the northern Wilderness.
Crossing it northward is an explicit, deliberate act (a jump-across with a warning) — north
of it, threat climbs with depth and PvP is opt-in. It is a hard fiction-and-mechanics gate,
not decoration.

**Rule: you should know which biome you're in from ONE glance at the ground** — each band
gets its own terrain palette (snow/frost painted 2026-07-02), flora (autumn canopies ✅,
pines for the NW frost corner ⏳, ash/dead trees for the Wilderness ⏳, palms for the
tropics ⏳) and NPC cast. NPC placement law: every spawn needs a geographic REASON (a rogue
on a road, knights at their hold, wizards at their study) — no flavor NPCs loitering in the
starter town.

**Map design principles (for the future "better-than-OSRS" map — Phase: Chunk World):**
- **Square chunks**, hand-authored, 8×8 tiles each (per `ROADMAP.md`). Visible tile grid.
- **Biome transitions are gradual** (forest→fen→scar), not hard seams.
- **Roads radiate from Veyhollow** (the `PATHS` array already paints these) — every road
  leads somewhere with a reason to go.
- **The Wilderness Ditch** is the one hard east–west gate between the safe south and the
  northern Wilderness — crossing north is opt-in danger/PvP (see §3).
- **Reward gradient = distance + threat.** Best stuff is far, dangerous, and gated —
  and *most* of all, north across the Ditch.

> **Coordinate migration (2026-07-03):** `ZONES` in `game1_data.js` still uses the old
> south-Wilderness layout (Scarlands at +z south; cold zones north). The map build-out pass
> migrates zone positions to this north-Wilderness geography to match
> `Maps/Crafted Realms Map.png`. Until that lands, treat THIS document + the bible map as the
> source of truth when they disagree with the code.

---

## 4. Progression ladder — the hybrid tier system

You confirmed **hybrid**, and the code already does exactly this: real-metal floor, custom
top. Current ladder in `TIERS` (`game1_data.js`):

| # | Tier | Req lvl | Stat mult | Identity |
|---|---|---|---|---|
| 1 | **Bronze** | 1 | 1.0× | Familiar starter metal |
| 2 | **Iron** | 5 | 2.0× | Familiar early metal |
| 3 | **Steel** | 10 | 3.2× | Familiar mid metal |
| 4 | **Aurel** ✦ | 20 | 5.0× | *Custom* — golden alloy |
| 5 | **Veyrite** ✦ | 30 | 7.5× | *Custom* — teal crystal-metal of Veyhollow |

**Proposed extension to ~8 tiers (↻ ITERATE — fills the late/endgame, keeps boss sets off-ladder):**

| # | Tier | Req | Source / gate | Identity |
|---|---|---|---|---|
| 0 | **Copper** | 1 | Shops, trivial | True starter (below bronze) |
| 1 | Bronze | 1 | Smith / shop | — |
| 2 | Iron | 5 | Smith / shop | — |
| 3 | Steel | 10 | Smith | — |
| 3.5 | **Whitsteel** ✦ | 15 | Whitmoor Hold (faction) | Knightly white steel |
| 4 | Aurel ✦ | 20 | Smith (rare ore) | Golden |
| 5 | Veyrite ✦ | 30 | Veyhollow crystal ore | Teal, signature endgame metal |
| 6 | **Undercrag** ✦ | 40 | **Korthul drops only** | Black volcanic, boss-gated prestige |

**Off-ladder prestige sets (the "Barrows/Bandos" equivalent — best stats, hardest to get):**
- **Fenlord set** — from the Fenlord boss (Gloomfen). Mid-tier prestige.
- **Crag set / Crag maul** — Korthul drops (`crag_maul` already exists).
- **Wardens' sigil** — faction-rank reward, not buyable.

**Design law:** *higher tier ⇒ better stats ⇒ harder to acquire* (higher level req, rarer
ore, boss-gated, or faction-locked). Cheap = easy = weak. This is already encoded in
`req`/`mult`/`price` and the drop tables — we just extend it.

---

## 5. Skills (15, live in code)

Attack, Strength, Defence, Hitpoints, Ranged, Magic, Prayer, Woodcutting, Mining, Fishing,
Cooking, Firemaking, Smithing, Fletching, Thieving — on the real OSRS XP curve (`XP_TABLE`).
Each region foregrounds 1–2 skills (see §3). **↻ ITERATE:** Construction (ties to Real
Estate §7), Crafting, Agility, Slayer-style bounty system.

---

## 6. Quest & story structure

Four quests exist (`QUESTS`). They already follow OSRS shape: giver → staged objectives →
XP + item reward. Crafted Realm has **intersecting regional and faction quest arcs**, not one
mandatory main campaign. They offer reasons, knowledge, conveniences, equipment, and local access;
the player remains free to skill, trade with shops, explore, build wealth, improve a homestead, or
fight without following a prescribed story order. A mysterious shard may appear as an optional
quest item, but is not the player's identity or destiny.

1. **Onboarding** (Tutor's Holm) — Guide Bram teaches movement, combat, skills.
2. **Veyhollow arc** — *Grub Trouble* → *The Thirsty Smith* → *Splinters & Sparks* (learn
   the three gathering skills + the town).
3. **Wardens arc** — *The Wardens' Trial* (kill the Fenlord) → guild rank → bounty board.
4. **The Spire arc (↻)** — investigate why the Scarring happened; offers a magic road without
   making the whole spellbook depend on one story rail.
5. **The Undercrag arc (↻)** — descend, face Korthul, earn the boss-tier set.
6. **Surge capstone (↻)** — permanently secure Veyhollow from involuntary breaches. Afterward,
   controlled challenge Surges and deeper Scarlands threats remain available by choice.
7. **Continuing world (↻)** — bosses, skills, wealth, rare equipment, collections, minigames,
   homestead improvement, and new self-contained arcs continue without a final game-over state.

**Quest design law:** every quest gives a *reason to visit a region*, *teaches or gates a
system*, and *advances the world fiction*. No fetch quests without narrative payload.

---

## 7. Real Estate / Housing system (LOCKED FOR BROWSER 1.0 — build after proving slice)

Locked Browser 1.0 concept: a compact **Construction-style** player housing system that can scale into
the later online vision without delaying the proving slice.

- **Buy one fixed authored plot** with Crowns; its ownership is permanent save state.
- **Build only within its envelope** using modular snap foundations, floors, walls, siding,
  roofs, fences, gates, stations, storage, furnishings, and traps—never unrestricted world voxels.
- **Build with your own materials** (logs, bars, stone, clay, lime, rope, hides) so Woodcutting,
  Mining, Smithing, Masonry, Crafting, and Construction reinforce one another.
- **Solo now, social later:** Browser 1.0 owns one personal plot. A future online version uses
  instanced or phased homesteads so scarce physical land cannot be monopolized indefinitely.
- **Medieval theme** throughout: timber framing, wattle-and-daub, fieldstone/lime mortar, thatch,
  wood shingles, clay tile, and iron fittings rather than modern cement.
- **Surge purpose:** crafted defenses can be damaged and repaired during player-started Surges,
  but no event deletes the deed, bank, house, or offline progress.
- **↻ ITERATE:** house levels, trophy rooms (boss kills), shops/stalls players run, a
  "visit friend's house" fast-travel.

*Not built yet. It begins only after the world-v2 proving slice and environment gate pass.*

---

## 8. Currency & economy

- **Crowns** (coins) — base currency.
- Shops have bounded stock, restocking, buy/sell limits, controlled price bands, and regional specialties.
  They reward travel and knowledge without allowing deterministic infinite-profit loops.
- Ordinary weapons, armor, and tools are permanent and never require routine durability repair.
- Core sinks are food, ammunition, runes, potions, homestead construction, civic/homestead defense
  repairs, travel, services, reclaim fees, and optional cosmetics.
- Important boss power uniques target roughly 10–30 successful kills; extreme rarity belongs to optional
  prestige rather than required progression.
- **↻ ITERATE:** a player market / Grand-Exchange analogue once authoritative networking exists.
- **Profile boundary:** offline-capable solo saves never transfer wealth, XP, or items into a future
  authoritative shared economy. One account may own both solo and online characters, with separate state.
- **Membership/purchased currency:** deferred. Member-specific worlds/items and purchasable Crowns require
  a later entitlement/economy decision. They are not current canon and do not block free Browser 1.0.

### Naming status

Early proper nouns—including **Undercrag**, **Korthul**, and their gear names—are working canon and may
be improved in one deliberate naming/originality pass before their Browser 1.0 content is authored.
Renaming must update lore, display names, map labels, quests, data references, tests, and save migrations
as one coherent change; do not casually rename isolated strings.

---

## 9. Presentation, time, and tone

- The camera remains elevated and OSRS-readable with bounded rotation and zoom.
- Character creation is lightweight and classless: name and a compact set of body/skin/hair/face choices;
  equipment and accomplishments define the character afterward.
- Dialogue mixes sincere local stakes with dry humor, eccentricity, and occasional deliberate cheesiness.
  Mandatory exchanges stay concise; deeper lore is optional.
- Browser 1.0 has a true visual day/night cycle, but essential content never requires waiting for a clock.
  Darkness never defeats readability, accessibility, or performance budgets, and time does not advance
  while the game is offline.
- Tone is cozy and broadly teen-friendly. Stylized fantasy violence and eerie threats are welcome; graphic
  gore and sexual content are not.
- Shipped Suno-assisted music requires paid-plan commercial rights at creation, track-level provenance,
  original inputs, retained exports/records, and any required platform AI disclosure. Free-plan output is
  not a shippable commercial asset.

### Future competitive venue

Locked post-online direction: **The Oathring**, a voluntary practice/tournament venue with declared rules,
rankings, cosmetics, and non-tradeable Laurels. There is no player-wealth staking. It requires the later
authoritative online foundation and is not Browser 1.0 content.

---

## 10. Open creative hooks (the "room to iterate" list)

These are intentionally unfinished so we always have somewhere to grow:
- Tiers 6+ and new prestige boss sets.
- New regions beyond the current 12 (the Scarlands deep-end is open-ended).
- Construction / Real Estate (§7).
- The Scarring metaplot (§1, §6).
- Player market, neighbourhoods, MMO networking.
- Additional skills (Construction, Crafting, Agility, Slayer/bounty).

> Keep this file updated as the canon. When code and bible disagree, **fix the disagreement
> deliberately** — don't let them drift.
