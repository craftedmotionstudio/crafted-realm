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
valley of **Veyhollow** — a frontier hollow ringed by wilder lands: burned scrub to the
south, a drowned fen to the west, quarried crags and a dark undercity to the north, and
shifting dunes to the east. Civilisation here is young and thin; most of the map is
contested by monsters, raiders, and older, hungrier things.

The player washes ashore on **Tutor's Holm**, a small instructional island off the coast,
with no memory and no name. **Guide Bram** sets them on their feet, then sends them by
rowboat to the mainland at Veyhollow Commons. From there the world opens up.

**The long arc (↻ ITERATE):** Veyhollow sits on the rim of an old catastrophe — *the
Scarring* — that burned the southern lands and woke things under the crag. The Wardens'
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

Twelve zones already exist (`ZONES` in `game1_data.js`). Mapped to biomes, with the OSRS
ecosystem-diversity lesson applied: **each region = a distinct biome, a distinct skill
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
| **The Scarlands** | Burned wasteland (wilderness-style: deeper = deadlier) | High-risk combat | Scales w/ depth | Ash stalkers, rare drops |
| **The Proving Grounds** | Arena | PvP/duel sandbox | Opt-in | Pit duelist |
| **The Undercrag** | Lightless undercity | Endgame combat | Highest | **Korthul** (lvl 58 boss) |
| **Tutor's Holm** | Tutorial island | Onboarding | Safe | Guide Bram |

**The macro biome plan (2026-07-02 — the full OSRS-style biosphere split, per direction):**

| Compass | Biome band | Zones (built ✅ / planned ⏳) |
|---|---|---|
| Centre | Temperate heartland (the "Lumbridge belt") | ✅ Commons, Wardenholm Keep, Mirrorpond |
| West | Autumn forest → drowned dark fen (our Morytania) | ✅ Emberwood (amber canopies), ✅ Gloomfen |
| North | Frost coast → true snow | ✅ Brynholt (frost ground), ✅ Whitmoor Hold (snow ground) |
| North-east | Rocky crag | ✅ Stonereach Quarry |
| East | Desert → the far coast | ✅ Ashar Dunes · ⏳ **Saltreach Port** (harbour town on the east coast — ships, charters, smuggler flavor; our Port Sarim) |
| South | THE BIG WILDERNESS | ✅ Scarlands (threat scales with depth) — ⏳ **extend southward 2-3× as the true wilderness band**: deeper = deadlier, rare resources, eventual opt-in PvP |
| Deep/endgame | Volcanic underworld | ✅ The Undercrag (Korthul) · ⏳ surface volcano/tropic isle (post-V1, reached by boat from Saltreach) |

**Rule: you should know which biome you're in from ONE glance at the ground** — each band
gets its own terrain palette (snow/frost painted 2026-07-02), flora (autumn canopies ✅,
pines for the north ⏳, palms for the tropics ⏳) and NPC cast. NPC placement law: every
spawn needs a geographic REASON (a rogue on a road, knights at their hold, wizards at
their study) — no flavor NPCs loitering in the starter town.

**Map design principles (for the future "better-than-OSRS" map — Phase: Chunk World):**
- **Square chunks**, hand-authored, 8×8 tiles each (per `ROADMAP.md`). Visible tile grid.
- **Biome transitions are gradual** (forest→fen→scar), not hard seams.
- **Roads radiate from Veyhollow** (the `PATHS` array already paints these) — every road
  leads somewhere with a reason to go.
- **Reward gradient = distance + threat.** Best stuff is far, dangerous, and gated.

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
XP + item reward. The **deep storyline** is a spine of linked quest arcs, each tied to a
faction and region, gating the next tier/region:

1. **Onboarding** (Tutor's Holm) — Guide Bram teaches movement, combat, skills.
2. **Veyhollow arc** — *Grub Trouble* → *The Thirsty Smith* → *Splinters & Sparks* (learn
   the three gathering skills + the town).
3. **Wardens arc** — *The Wardens' Trial* (kill the Fenlord) → guild rank → bounty board.
4. **The Spire arc (↻)** — why did the Scarring happen? Unlocks magic progression.
5. **The Undercrag arc (↻)** — descend, face Korthul, earn the boss-tier set.
6. **Post-game (↻)** — what the Scarring left behind. Open-ended, our content treadmill.

**Quest design law:** every quest gives a *reason to visit a region*, *teaches or gates a
system*, and *advances the world fiction*. No fetch quests without narrative payload.

---

## 7. Real Estate / Housing system (TABLED — design only)

Your idea, captured for later. **Concept:** a **Construction-style** player housing system
that scales into the MMO vision.

- **Buy a plot** in a housing realm/instance with Crowns.
- **Build with your own materials** (logs, bars, stone) → ties into gathering + a new
  **Construction** skill. Rooms, furniture, walls — tiered like gear.
- **Solo now, social later:** today each house is a private instanced realm reached via a
  portal/fast-travel. In the MMO version, houses occupy plots in a shared **neighbourhood
  district** on the map you can physically walk to.
- **Medieval theme** throughout (timber-frame, stone keeps, thatch).
- **↻ ITERATE:** house levels, trophy rooms (boss kills), shops/stalls players run, a
  "visit friend's house" fast-travel.

*Not built yet — parked until the world/engine foundation lands. Logged here so it's part
of the plan, not forgotten.*

---

## 8. Currency & economy

- **Crowns** (coins) — base currency.
- Shops have fixed stock (9 shops live). **↻ ITERATE:** a player market / Grand-Exchange
  analogue once MMO networking exists.

---

## 9. Open creative hooks (the "room to iterate" list)

These are intentionally unfinished so we always have somewhere to grow:
- Tiers 6+ and new prestige boss sets.
- New regions beyond the current 12 (the Scarlands deep-end is open-ended).
- Construction / Real Estate (§7).
- The Scarring metaplot (§1, §6).
- Player market, neighbourhoods, MMO networking.
- Additional skills (Construction, Crafting, Agility, Slayer/bounty).

> Keep this file updated as the canon. When code and bible disagree, **fix the disagreement
> deliberately** — don't let them drift.
