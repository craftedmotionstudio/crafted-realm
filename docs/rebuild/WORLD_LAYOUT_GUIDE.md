# World layout guide: how 2004 RuneScape lays out land, applied to Tutor's Holm v2 and the mainland slice

Status: study + plan (2026-09-26), for W0b in `WORLD_GOAL_2026-09-25.md`. No game code was changed.
Readers: the Blender/terrain artist and the gameplay engineer who build Holm v2 and the W3 mainland slice.

Owner brief (2026-09-26): *"more overall elevation change, more height to the island. Maybe a small pond in a
recessed area where we learn to fish, but make the fishing skill actually fun to perform. Maybe one of the buildings
has a water wheel in the creek. Maybe add a cozy greenery area on one of the houses that overlooks the water
wheel... other random medieval objects to give it a sense of realism, like a broken carriage... study the lay of the
land for OSRS and understand how environments and cities are distanced and created, then incorporate that."*

**Where the numbers come from.** Every 2004 figure below was measured by read-only scripts in
`scratchpad/world_layout_study/`, run over the 2004scape map source (`C:\Users\iQwaZ\repos\2004scape\Server\data\src\maps`,
417 map squares, 920,657 surface tiles). The scripts output statistics only. No map data, layout, name or text
from that source goes into Crafted Realm (rules: `REFERENCE_2004SCAPE.md`). The Holm figures come from the live
Sept 13 terrain (`holm-arrival-package-oldschool-v3`, export `9348a2aba6c3f2c8`) and `assets/holm_island/data/*.json`.
How to re-run everything is in §6.

---

## 0. Units, conversions and the twelve rules

| Quantity | 2004 | Crafted Realm |
|---|---|---|
| Tile | 128 world units | 1 unit = 1 tile (= 1 m) |
| Height unit | map `h` × 8 units, so **16 h = 1 tile** of rise | tiles |
| One storey | 240 units = **1.875 tiles** (client level offset) | 2.2 on the shelved v3 track; check the Sept 13 buildings |
| Player height | man model 202 units = **1.58 tiles** (head/torso/legs/feet vertices) | **1.85 tiles** (equipment manifest) |
| Tick / walk / run | 0.6 s; walk 1 tile per tick (0.6 s per tile, 100 tiles/min); run 2 per tick (0.3 s per tile) | same (`shared/movement.js`, `TICK_MS = 600`) |
| Movement | 8 directions | 8 directions (owner, 2026-09-25) |
| Draw distance | 25 tiles from the camera eye (`World3D` min/max draw tile ±25) | fog from camera distance +24 to +32 (`holm_oldschool_look.js` `SCENE`) |
| Walkable step | no slope limit (only flagged tiles block) | `MAX_SURFACE_STEP = 1.05` per tile (`game5_main.js`); authored path grades ≤ 0.4 per tile |

**The 1.2 rule.** Our player is 1.85 / 1.58 = **1.17×** taller in tiles than the 2004 man. To make a slope *look*
as tall next to the player as it did in 2004, multiply 2004 heights by about 1.2. Heights in the targets below
already include this factor. Distances and widths in tiles are *not* scaled.

**Frames.** Holm tiles: x east, z south (north = −z; "north up" in every figure). Mainland server maps:
+z = north (`server/data/maps`). The client World V2 uses north = −z, so client z = −server z.

### The twelve rules (the short version of §1)

1. **Terrace, don't dome.** Towns and buildings sit on flat ground (22–42% flat). The relief lives in short, steep
   banks and cliffs *between* flat terraces: 18% steep and 12% cliff tiles on the 2004 Tutorial Island (TI).
2. **Ground is never perfectly flat.** 43% of 2004 surface tiles use a smooth "swell" noise: std 0.53 tiles,
   correlated over 4–6 tiles, only 3% flat.
3. **Low island, one high block.** On the TI, 68% of land is ≤ 3 tiles high and 15% is ≥ 7 tiles. The first building
   stands on the summit (10.6 tiles). The route then drops 8 tiles in its first 40 tiles walked.
4. **Legs of 12–37 tiles.** On the TI the next instructor is 11–37 tiles away. With a 25-tile draw distance that
   keeps the next goal at or just past the fog edge. Any leg longer than 25 tiles needs a landmark mid-way.
5. **Neighbouring settlements are 65–90 walked tiles apart** (40–55 s walk). Major towns are 130–230 apart
   (80–140 s walk).
   Walked distance is 1.0–1.55× the straight 8-direction distance.
6. **A village is 4–10 buildings across 20–60 tiles.** It has a square 12–18 tiles across, houses of about
   6×8 tiles (median 44 tiles²) with 1–7 tile gaps, and one landmark building 3–10× bigger than a house.
7. **Every town touches water** (within 0–7 tiles). Cities carry the full service set (banks, a general store,
   ranges, an altar, an anvil or furnace, specialist shops). Villages specialise (mining, fishing, herbs).
8. **Roads are 3 wide** (stone roads: width 3 is the mode, 2–4 wide = 75%). Dirt paths vary from 1 to 9+. Roads
   climb gently: 90% of stone-road tiles rise ≤ 0.375 per tile.
9. **Ponds are small and common.** 57 of 69 inland water bodies are ≤ 150 tiles (median 37). The TI fishing pond is
   19 tiles, set 0.6 tiles below its rim.
10. **Fishing spots move.** Every 280–529 ticks a spot jumps to a random free tile from a fixed list of 5–12.
    Clusters hold about 2 spots. A catch is rolled every 5 ticks.
11. **Trees clump, fences are everywhere, clutter lives indoors.** Median tree spacing is 2.2 tiles and 25% of trees
    stand within 1.5 tiles of another. The TI has 7.2 fence edges and 33 ground-decor pieces per 100 tiles.
    Crates and tables are mostly indoors (Varrock: crates 7×, tables 13× more indoors).
12. **The Wilderness edge is a gradient, not a wall.** A warning appears 5–8 tiles before the line. Levels change
    every 8 tiles. Paths thin out (15% → 8% → 1% → 0%) and buildings vanish. A bank town (Edgeville) sits 26 tiles
    from the edge.

---

## 1. Measured principles of 2004 geography

### 1.1 The travel clock: distances between settlements

Walked distance = 8-direction BFS over walkable tiles and bridge decks (walls and gates are ignored, so it is a lower
bound). Straight distance is from the building-cluster centre. Detour = walked / Chebyshev.

| From → to | Straight | Walked | Walk | Run | Detour |
|---|---:|---:|---:|---:|---:|
| Taverley → Burthorpe | 65 | 67 | 40 s | 20 s | 1.03 |
| Barbarian Village → Edgeville | 71 | 71 | 43 s | 21 s | 1.00 |
| Lumbridge → Al Kharid (toll gate) | 78 | 71 | 43 s | 21 s | 1.08 |
| Port Sarim → Rimmington | 77 | 76 | 46 s | 23 s | 1.00 |
| Draynor → Port Sarim | 80 | 88 | 53 s | 26 s | 1.28 |
| Catherby → Seers' Village | 97 | 81 | 49 s | 24 s | 1.00 |
| Falador → Taverley | 127 | 130 | 78 s | 39 s | 1.38 |
| Barbarian Village → Varrock | 128 | 130 | 78 s | 39 s | 1.02 |
| Lumbridge → Draynor | 140 | 133 | 80 s | 40 s | 0.99 |
| Falador → Barbarian Village | 125 | 152 | 91 s | 46 s | 1.50 |
| Draynor → Falador | 142 | 163 | 98 s | 49 s | 1.51 |
| Varrock → Edgeville | 136 | 192 | 115 s | 58 s | 1.55 |
| Seers' Village → East Ardougne | 223 | 190 | 114 s | 57 s | 1.00 |
| Lumbridge → Varrock | 219 | 225 | 135 s | 68 s | 1.03 |
| Draynor → Varrock | 218 | 276 | 166 s | 83 s | 1.52 |

What to take from it:
- **Neighbouring settlements sit 65–90 walked tiles apart**, about one 64×64 map square (40–55 s walk, 20–27 s run).
  **Major towns sit 130–230 apart** (80–140 s walk).
- **Terrain is allowed to bend roads.** Rivers, walls and hills add up to 55% to the straight distance.
- **What a starter town has within walking range** (walked tiles from the town centre):

| From | Tree | Oak | Willow | Range | Gen. store | Altar | Water | Goblins | Fishing | Cows | Chickens | Copper/tin | Anvil | Bank |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Lumbridge | 12 | 12 | 19 | 9 | 27 | 21 | 6 | 29 | 53 | 58 | 58 | 114 | 192 | upstairs |
| Draynor | 5 | 8 | 10 | 79 | 118 | 136 | 48 | 32 | 17 | 61 | 79 | 112 | 166 | 4 |
| Varrock | 11 | 16 | 65 | 29 | 9 | 51 | 30 | 80 | 112 | 127 | 67 | 45 | 18 | 22 |
| Falador | 12 | 12 | 58 | 22 | 10 | 105 | 14 | 103 | 106 | 77 | 31 | 55 | 72 | 17 |
| Edgeville | 8 | 31 | 18 | 117 | 14 | 162 | 9 | 93 | 64 | 151 | 169 | 68 | 160 | 0 |

  The pattern: **trees within 5–16**, **cooking and a shop within 10–30** (Draynor, a bank village, is the
  exception), **first people or goblins to fight within 30**, **fishing and farm animals at about 15–80** (Lumbridge
  50–60), **ore at 45–115**. Resources get farther away as they get more valuable.

### 1.2 Towns: footprint, buildings, squares, services

Buildings = connected indoor-flagged tile groups (≥ 4 tiles). A town = buildings linked by gaps ≤ 14 tiles.

| Town | Buildings | Footprint (tiles) | Built share | Median house (area, dims) | Largest | Median gap to nearest bldg | Square | Outdoor path share | Relief (p2–p98, town + 20) | Water |
|---|---:|---|---:|---|---:|---:|---|---:|---:|---|
| Draynor | 6 | 20×44 | 44% | 49, 6×9 | 154 | 1 | 12×11 | 41% | 2.4 | 2 tiles |
| Rimmington | 4 | 46×17 | 39% | 80, 7×14 | 100 | 2 | 8×8 | 17% | 2.9 | in town |
| Barbarian Village | 7 | 27×39 | 24% | 32, 6×6 | 80 | 2 | 6×5 | 22% | 4.7 | 4 |
| Edgeville | 7 | 45×47 | 19% | 63, 7×9 | 96 | 5 | 9×27 | 14% | 4.1 | in town |
| Catherby | 9 | 42×42 | 20% | 31, 5×7 | 63 | 2 | — | 34% | 7.5 | coast |
| Lumbridge | 10 | 49×68 | 21% | 43, 6×8 | 251 (castle) | 7 | castle court | 22% | 3.2 | river |
| Taverley | 10 | 39×61 | 19% | 41, 6×7 | 105 | 3 | 6×12 | 32% | 8.0 | in town |
| Seers' Village | 10 | 94×59 | 28% | 94, 9×12 | 567 | 3 | 20×10 | 23% | 4.7 | in town |
| Al Kharid | 11 | 59×48 | 33% | 42, 6×8 | 370 (palace) | 4 | — | 1% (sand) | 3.1 | 3 |
| Port Sarim | 13 | 68×88 | 12% | 51, 6×9 | 136 | 5 | 5×8 | 13% | 3.1 | coast (39%) |
| Falador | 27 | 162×86 | 17% | 50, 7×13 | 636 (castle) | 1 | 13×13 | 12% | 3.9 | in town |
| East Ardougne | 34 | 135×130 | 12% | 55, 6×10 | 277 | 3 | 19×23 (market) | 23% | 3.4 | in town |
| Varrock | 42 | 151×129 | 21% | 67, 8×10 | 700 (palace) | 3 | 16×18 | 18% | 2.4 | in town |
| *Tutorial Island* | 6 | island 101×77 | — | 94, 7×11 | 116 | 6 | — | 19% | 10.6 | pond + sea |

(Yanille and Port Khazard merged into one cluster in the script, so they are left out.)

Rules for a settlement:
- **Village: 4–10 buildings in 20–60 tiles. City: 25–45 buildings in 130–160 tiles.** Buildings cover 12–44% of
  the footprint.
- **Houses stand close.** The median gap to the nearest building is 1–7 tiles (villages 2–7). Cities form terraces
  with gaps of 0–1.
- **One square, 12–18 tiles across** (Draynor 12×11, Falador 13×13, Varrock 16×18). Markets reach 19×23. The square
  is where the roads meet.
- **Towns are flat and level with their surroundings.** Mean town height is within ±0.6 tiles of the ring 20–50
  tiles outside it. Relief inside town + 20 tiles is 2.4–4.7 tiles on plains and 7.5–8.9 where hills back the town.
  Towns backed by hills sit *below* the surrounding ring: Catherby −1.5, Taverley −1.0, Burthorpe −2.2.
- **Every town touches water.** The nearest water is 0–7 tiles from the building box in all 19 settlements
  (river, sea, fountain or well).
- **Doors open onto paths.** 52% of all buildings have a path tile within 1 tile of a wall, 63% within 3.
- **Services** (from the minimap-icon locations):
  - Cities (25+ buildings) have 1–2 banks, a general store, several ranges, an altar or church, an anvil or furnace
    and 5–15 specialist shops.
  - Villages specialise and often lack a bank: Barbarian Village has mining + pottery; Port Sarim a fishing shop +
    food; Taverley herbs + swords.
  - Lumbridge (the starter town) has a general store, ranges, a furnace, an altar and water, with the bank upstairs
    in the castle.
  - Edgeville's bank is the Wilderness hub.

### 1.3 Buildings

- **Size, all 423 surface buildings** (tiles²): p5 9, p25 25, **median 44**, p75 78, p95 233. The short side has a
  median of 6 (p25 4, p75 8); the long side has a median of 8 (p25 6, p75 12).
  - ≤ 30 tiles²: 34% (sheds, huts)
  - 31–80: 42% (houses, shops)
  - 81–200: 18% (halls, banks)
  - > 200: 6% (castles, palaces, churches)
- **One landmark per town, 250–700 tiles² of footprint** (Lumbridge castle 251, Falador castle 636, Varrock palace 700).
  That is 3–10× the median house.
- **Storey = 1.875 tiles = 1.19 player heights.**
- **Clutter lives indoors.** Within Varrock: crates 82 indoors vs 12 outdoors, tables/benches 118 vs 9. Within
  Draynor: crates 13 vs 4, barrels 10 vs 6.

### 1.4 Roads and paths

| Measure | Stone road | Dirt path | All paths |
|---|---|---|---|
| Tiles measured (F2P core) | 9,299 | 16,704 | 26,003 |
| Width 1 / 2 / 3 / 4 | 2% / 19% / **36%** / 20% | 8% / 18% / 14% / 12% | 6% / 18% / 21% / 14% |
| Width 5–8 / ≥ 9 | 15% / 8% | 21% / 27% (yards, mines) | 20% / 21% |
| Rise per tile p50 / p90 / p99 | 0.125 / **0.375** / 0.875 | — | 0.19 / 1.1 / 2.6 |

- **Path share of outdoor land:** 7.2% across the F2P core, 12–41% inside towns, **19.4% on the TI**.
- **Grades.** Only 0.5% of stone-road tiles rise ≥ 1 tile per tile. Paths go *around* steep ground, while ordinary
  walkable grass is often steep: 4.1% of walkable tiles rise ≥ 1 per tile, which the 2004 engine allows.
- **Branching.** Roads join neighbouring settlements directly (detour 1.0–1.5), widen into the square, and leave each
  town by 3–4 exits (observation). Spurs to resources are dirt and 1–2 wide.

### 1.5 Elevation

**How 2004 stores height.** 57% of surface tiles have an explicit height. The other 43% use a smooth noise ground:
- mean 2.07, std 0.53, p5–p95 1.2–2.9 tiles;
- correlation 0.94 at 1 tile, 0.57 at 4, 0.19 at 8, 0 at 16;
- slope bands: 3% flat, 59% gentle, 36% moderate.

That noise is why 2004 grass always rolls a little.

**Slope bands** (the rise to the +x or +z neighbour; "cliff" = more than 1 tile per tile):

| | Flat < 1/16 | Gentle ≤ 1/4 | Moderate ≤ 1/2 | Steep ≤ 1 | Cliff > 1 |
|---|---:|---:|---:|---:|---:|
| All 2004 surface land | 22.2% | 38.7% | 25.2% | 8.2% | 5.8% |
| **2004 Tutorial Island** | **21%** | **30%** | **20%** | **18%** | **12%** |

**Relief per 64×64 square** (p2–p98 height span, tiles), 206 land squares:
- all: p10 2.2, p25 2.7, **median 3.75**, p75 6.3, p90 8.4, max 14.9;
- by biome (median): grass 3.1, mud 4.0, desert 3.75, rock 6.3, snow 8.3;
- steep share (≥ 0.5 per tile) per square: median 12%, p90 28%.

**Cliffs.** Around blocked (unwalkable) land groups, the height span of the walkable rim is a median 1.9 tiles.
46% of the groups are real ledges (≥ 2 tiles). Only 32% of tiles rising ≥ 1 per tile are blocked. 2004 lets players
walk steep grass and blocks only true faces.

**The 2004 Tutorial Island.** Land 5,771 tiles; bbox 101×77.
- Heights: p5 0.94, **median 2.44**, p95 10.12, max 10.62 tiles.
- 68% of land is ≤ 3 tiles high and 15% is ≥ 7 tiles.
- Relief per 32×32 block: median 5.8, max 10.5.
- Mean height by distance from the shore:

  | Distance from shore | 0–2 | 2–5 | 5–10 | 10–20 | 20–40 |
  |---|---:|---:|---:|---:|---:|
  | Mean height (tiles) | 1.67 | 2.65 | 3.38 | 4.42 | 3.11 |

  The p90 already reaches 6.9 at 2–5 tiles from the shore, because sea cliffs rise straight from the beach.

Route elevation (instructor to instructor):

| Leg | Walked | Height change |
|---|---:|---|
| Start house → survival (net, pond, trees, fire) | 12 | 10.6 → 8.2 |
| Survival → cook | 28 | 8.2 → 2.5 (1 in 5) |
| Cook → quest guide | 37 | 2.5 → 4.0 |
| Quest guide → ladder down (inside the house) | 3 | — |
| Underground: mining, then the rat pen (14 rats), then ladder up | ~57 | — |
| Ladder up → bank / advisor | 11 | 2.5 |
| Bank → chapel | 18 | 2.5 → 1.3 |
| Chapel → magic instructor | 18 | 1.3 → 2.9 |

**Surface total: 127 tiles (76 s walk).** The references (`Elevation_Change_Ground_Tiles.jpg`, `Landscape_Option.jpg`,
`Tutorial_Island_Fishing_Spot.jpg`) show the same thing:
- steep green banks with dark round hollows in them;
- a fence line climbing a ridge;
- buildings on flat pads at different heights;
- brown cliff faces dropping to the beach and river.

**How height frames views and routes.**
- The TI starts on its summit, so the whole first lesson zone lies below you. On the mainland, relief sits between
  towns: hills back the towns and rivers cut in front of them.
- Roads take the gentle line (p90 grade 0.375). The steep line is left to cliffs, fences and hollows.

### 1.6 Water, bridges and fishing

- **Inland water bodies:** 69 in total.
  - Size: p25 16, **median 37**, p75 74, p90 407 tiles.
  - By class: 57 ponds (≤ 150 tiles), 10 lakes (151–2,000), 2 large.
- **Water share per land square:** median 1%, p75 12%, p90 46%.
- **Bridges:** 58 bridge decks, spans 3–15 tiles, 1–4 wide.
- **Fishing spots:** 87 on the surface.
  - Grouped (spots within 8 tiles of each other), each group holds p25 1, median 2, p75 4, max 17 spots.
  - Nearest path: median 15.5 tiles (p25 9.7).
  - Nearest bank: median 55 (p10 19, p25 28.5). You carry fish a fair way.
- **Spot movement** (MIT logic, `skill_fishing/scripts/fishing_movement.rs2`): each spot has a timer of
  **280 + random(250) ticks** (2.8–5.3 min). It then waits 2 ticks and teleports to a random tile from its area's
  fixed list of **5–12 candidate tiles**, skipping any tile another spot holds.
- **Catch loop** (`fishing.rs2`):
  - cast; then a roll every **5 ticks (3 s)**;
  - success = low→high over levels 1→99, out of 256. The basic net fish is 48→256, i.e. **19% at level 1** (about
    one fish per 15 s), rising to 100%;
  - failure is silent (you keep casting);
  - rare "macro events" exist: a big fish, a whirlpool, a river troll.
- **Tutorial pond:**
  - 19 water tiles in a 5×5 box, with 3 spots;
  - the water sits 7.5 tiles high on the island's upper slope;
  - land within 3 tiles averages 8.05, so the water is recessed 0.55–0.75;
  - the tutorial catch is **guaranteed** after about 5 ticks, with 3 splash sounds, so the lesson cannot fail.

### 1.7 Landmarks and sight lines

- **Sight lines are short.** The 2004 draw distance is 25 tiles, so no landmark is "visible from everywhere". Layouts
  work by **chaining**:
  - each TI leg (11–37 tiles) ends at a building you can see from the last one;
  - between towns 65–90 tiles apart, you leave one town's view and walk 15–40 tiles past a bridge, field, mill,
    tree clump or fishing spot before the next town appears.
- **Landmark buildings are big, not tall-at-distance** (250–700 tiles² of footprint). Our fog (camera +24 to +32)
  works the same way, so design for chains: **a readable feature at least every 20–25 tiles along any route**.

### 1.8 Biomes and transitions

- **Soft edges from hard data.** The 2004 client blends underlay colours over an 11×11 tile box, so a boundary that
  is hard in the data reads as a soft transition 5–10 tiles wide.
- **Mixing:** each land square carries a median of 4 underlay types (p90 6), and 15% of land tiles (p25 6%, p75 21%)
  lie on a boundary between two.
- **Trees per 100 land tiles by biome** (median): grass 1.6, mud or forest floor 2.7, desert 0, rock 0.4, snow 0.
  Wilderness bands: 1.6 south of the edge, 2.1 at levels 1–10, 2.7 at 21–30, 0.8 at 41 and above.
- **Where transitions sit:** mostly on a road, river, fence or cliff (observation from the maps, not measured).

### 1.9 Trees, fences, fields, ground decor, clutter

| Measure | Value |
|---|---|
| Trees per 100 land tiles, per 64-square | p10 0, p25 0.45, **median 1.46**, p75 2.9, p90 3.9, max 14.4 (forest) |
| Tree nearest-neighbour spacing | p10 1.0, p25 1.41, **median 2.24**, p75 3.16, p90 5.0 tiles; **25%** within 1.5 tiles of another (clumps of 2–4) |
| Fence segments (tile edges) per 64-square | p25 0, **median 29**, p75 115, p90 212, max 447 |
| Crop fields | 20 fields. The 6 big ones are 12–22 × 13–25 tiles (115–430 plants) and all fenced; small plots are 3–7 wide (8–27 plants). 70% of all fields are fenced |
| **TI densities per 100 land tiles** | trees **2.56**, fence edges **7.2** (414 total), flowers/plants 2.8, ground decor **32.8** (grass tufts, twigs, worn soil), other outdoor objects **0.43** (25 in total) |

**Outdoor clutter in towns.** Counts are within the building box + 6 tiles. Indoors, most towns have several times
more (Varrock crates 82 vs 12, tables 118 vs 9).

| Town | Area (tiles²) | Barrels | Crates | Carts | Stalls | Hay | Well | Other |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Draynor | 1,792 | 6 | 4 | 2 | 2 | — | — | 10 crop plants |
| Varrock | 22,983 | 11 | 12 | 4 | 5 | 2 | 1 | 11 mining rocks |
| East Ardougne | 20,874 | 22 | 12 | 5 | 16 | 28 | 1 | 231 crop plants, 61 gravestones |
| Edgeville | 3,363 | — | — | 1 | — | — | 1 | 8 signs |

Across the whole map: 26 carts, 22 broken carts, 8 loose cart wheels, 13 wells, about 40 haystacks and bales,
18 market stalls.

### 1.10 Dungeons and entrances

- **Surface ladders, trapdoors and cave mouths:** 64 in total, **45% of them inside buildings**.
- **Outdoor ones** are p25 2 tiles and median 7 tiles from a path. The long tail (p75 71) is remote caves.
- **Dungeon map icons:** 21. The **median distance to the nearest town centre is 71 tiles** (22–103 on the mainland).
  A quarter sit on a path. Many sit at the foot of a slope, with local rises of 2–6 tiles.
- **TI:** the ladder down is inside the quest guide's house. The ladder up is outdoors, 11 tiles from the bank. The
  cave carries you under the island to a new area, so you never walk back.

### 1.11 The Wilderness edge

- **Line and levels.** The line is z = 3520 across 448 tiles. Level = (z − 3520) / 8 + 1, so a new level every
  **8 tiles** (max 56).
- **Warning.** A one-time warning screen opens when you enter a **4-row band 5–8 tiles before the line**
  (z 3512–3515), coming from the south.
- **No wall.** Broken walls and fences touch only **75 of 448 columns (17%)** near the line.
- **The gradient north:**

  | Band | Path share of land | Buildings (indoor share) | Trees per 100 | Relief (p2–p98) |
  |---|---:|---|---:|---:|
  | South of the edge | 15.2% | 7.8% | 1.6 | ~8 |
  | Levels 1–10 | 8.2% | none | 2.1 | ~8 |
  | Levels 21–30 | 0.8% | ruins and forts (~0.7–0.8%) | 2.7 | ~8.6 |
  | Levels 41+ | 0% | ruins and forts (~0.7–0.8%) | 0.8 | ~8.9 |

  Relief stays the same (8.0–8.9 tiles) the whole way; only the dressing changes.
- **NPCs per 8-level band** (x 2944–3391): 48, 23, 111, 69, 82, 89, 97.
- **Distance from towns to the edge:**
  - **Edgeville 26 tiles** (bank + general store: the PvP gear-up town);
  - Varrock 92, Barbarian Village 100, Falador 142.

### 1.12 What makes a place read as real (the checklist)

A settlement passes when it has:
- a square 12–18 across where 3–4 roads meet;
- water within 7 tiles;
- a bank or shop, a cooking range, and a well or fountain;
- houses about 6×8 with 1–7 tile gaps, doors facing a path (half within 1 tile);
- one landmark building 3–10× a house;
- fenced gardens and plots (fence edges on the order of 5–7 per 100 tiles);
- trees in clumps of 2–4 at the edges, not in the square;
- clutter concentrated at doors, yards and stalls (about 2–9 objects per 1,000 tiles outdoors: Varrock 2, East
  Ardougne 5, Draynor 8), and most of it indoors;
- ground decor everywhere (tufts, twigs, worn earth);
- and it sits level with its surroundings, with the relief rising behind it.

---

## 2. Tutor's Holm measured, and the gap to 2004

Live Sept 13 terrain (`holm-overhaul-terrain-v1` source in `holm-arrival-package-oldschool-v3`), plan places,
`island-bridges.json`, `holm_island_paths_data.js` and habitat v4 (`vegetation.json`). Figure:
`scratchpad/world_layout_study/fig_holm_v1.png` (hillshade + 1-tile contours); steep/cliff map: `fig_cliffs_v1.png`.

**Holm v1 facts:**
- **Land:** 11,660 dry tiles plus 255 creek tiles; bbox 128×114. That is **2.0× the TI's land**.
- **Heights:** p5 0.83, median 3.74, p95 8.01, max 14.03. 38% of land is ≤ 3 tiles; 14% is ≥ 7.
- **Relief:** 7.2 tiles p5–p95 = **3.9 player heights** (TI: 9.2 tiles = 5.8 player heights). Median relief per
  32×32 block 4.2 (TI 5.8).
- **Slopes:** flat 28%, gentle 37%, moderate 17%, steep 13%, cliff 5%. 4.5% of tiles exceed our 1.05 step.
- **Shape:** broad smoothstep domes (radius 20–40 tiles) on a 2-tile base. Relief is smeared over wide slopes, so
  nothing reads as a bank or a cliff. Building pads blend over 5 tiles.
- **Route** (pad centre to pad centre, 8-direction BFS over dry tiles + bridge decks):

  | Leg | Walked | Walk time | Pad height |
  |---|---:|---:|---|
  | Landing → guide | 19 | 11 s | 1 → 3 |
  | Guide → survival | 35 | 21 s | 3 → 2 |
  | Survival → bakehouse | 17 | 10 s | 2 → 4 |
  | Bakehouse → lodge | 16 | 10 s | 4 → 5 |
  | Lodge → quarry | 18 | 11 s | 5 → 7 |
  | Quarry → keep (same shaft back up, then walk) | 51 | 31 s | 7 → 8 |
  | Keep → bank | 22 | 13 s | 8 → 6 |
  | Bank → mage | 28 | 17 s | 6 → 6 |
  | Mage → Lastlight | 32 | 19 s | 6 → 14 |
  | Lastlight → haven | 77 | 46 s | 14 → 1 |

  **Total 315 tiles, 189 s walk** (TI: 127 surface tiles + ~57 underground). Without the bridges, guide → survival
  is 130 tiles (the creek head can be walked round).
- **Buildings:** 11 places, 40–360 tiles² (median about 90); nearest gaps 8–12 (TI 6).
- **Paths:** 756 worn tiles = **6.5%** of land, **78% exactly 2 wide**.
- **Vegetation** (526 placements):
  - trees: 94 = **0.81 per 100** tiles; spacing median 4.5; **0% clumped**;
  - shrubs and flowers: 225 (1.9 per 100);
  - ground decor: tufts and small stones 147 = **1.3 per 100**;
  - fallen logs 16, signposts 2.
- **Fences:** effectively none (a fence piece exists in the prop pack but is not laid out as runs).
- **Water:** the creek is 2.4 wide, falls 5.2 → 0 over 108 tiles (0.048 per tile), and has two bridges. **No pond.**
  Fishing uses one fixed ripple at the creek stage.

### Gap table

The target column already includes the 1.2 rule for heights. "Sketch" = the v2 numeric proposal in §3.2 (a study
evaluator, not game code).

| Metric | 2004 TI | 2004 mainland band | Holm v1 | **Target v2** | v2 sketch |
|---|---|---|---|---|---|
| Land tiles | 5,771 | — | 11,660 | keep the owner-approved coast | 11,621 |
| Height p5 / p50 / p95 / max (tiles) | 0.94 / 2.44 / 10.1 / 10.6 | square relief median 3.75 | 0.83 / 3.74 / 8.0 / 14.0 | **0.8 / 3–3.5 / 11–12 / 17–18** | 0.81 / 3.54 / 11.0 / 17.5 |
| Relief p5–p95 in player heights | 5.8 | — | 3.9 | **≥ 5.5** | 5.5 |
| Relief per 32×32 block, median | 5.8 | — | 4.2 | **6.5–8** | 7.8 |
| Land ≤ 3 tiles / ≥ 7 tiles | 68% / 15% | — | 38% / 14% | **≥ 45% / 20–25%** | 46% / 24% |
| Slopes flat / gentle / moderate / steep / cliff | 21 / 30 / 20 / 18 / 12 | 22 / 39 / 25 / 8 / 6 | 28 / 37 / 17 / 13 / 5 | **22–26 / 28–35 / 16–20 / 15–19 / 9–12** | 24 / 28 / 16 / 19 / 13 |
| Tiles above our 1.05 step (unwalkable faces) | (no limit) | — | 4.5% | **10–12%**, dressed as rock | 11.8% |
| Ground swell (non-pad land) | std 0.53, 4–6 tile correlation | same | none (smooth domes) | **std ≈ 0.5, cell ≈ 5** | amplitude 1.0, cell 5 |
| Surface route | 127 tiles (+~57 cave) | — | 315 tiles, 189 s | **≤ 250 tiles, ≤ 150 s** | 250 tiles, 150 s |
| Leg length | 11–37 (median 18) | — | 16–77 (median 25) | **≤ 35, a feature every ≤ 20–25** | 6–39 |
| Height change per leg | −2.4, −5.7, +1.5, 0, −1.2, +1.6 | — | +2, −1, +2, +1, +2, +1, −2, 0, +8, −13 | **≥ 1.5 on most legs, up and down** | +3.4, −0.4, −2.3, +3.7, +1.0, +2.6, cave, −4.0, +0.6, +9.9, −4.3, stair −12 |
| Path share / width | 19.4% / dirt bands | towns 12–41%; stone mode 3 | 6.5% / 78% 2 wide | **12–15%; trail 3, links 2, spurs 1–2, door aprons** | layout task |
| Trees per 100 tiles | 2.56 | median 1.5 (grass 1.6, forest floor 2.7) | 0.81 | **2.0–2.5 (230–290 trees)** | placement task |
| Tree spacing median / clumped share | — | 2.24 / 25% | 4.5 / 0% | **2.2–3 / 20–30%** | placement task |
| Fence edges per 100 tiles | 7.2 | median 29 per 64-square | ~0 | **3–5 (350–580 edges)** | placement task |
| Ground decor per 100 tiles | 32.8 | — | 1.3 | **12–20** (instanced, sparse sprites) | placement task |
| Flowers and plants per 100 | 2.8 | — | 1.9 | 2.5–3 | placement task |
| Outdoor clutter objects per 100 | 0.43 | towns 0.2–0.8 | ~0.3 | **1.0–1.6** (owner wants realism), 80% in yards | §3.5 lists 190 |
| Pond | 19 tiles, 0.6 below rim | ponds median 37 tiles | none | **30–45 tiles, ≥ 2 below rim** | 40 tiles, water 1.25, rim median 3.4 |
| Fishing spots | 3 fixed (tutorial) | move every 280–529 ticks among 5–12 | 1 fixed | **3 moving among 7** | §3.3 |
| Water within 7 tiles of each building | yes | yes (all towns) | guide house ~20 from the creek | add a **well** at the guide house | §3.5 |

---

## 3. Tutor's Holm v2 plan

Keep the owner-approved Sept 13 coast, building sites and their Blender models. Reshape the land under them,
add the Fishing Hollow, the Holm Mill with Hettie's garden terrace, and the clutter, fences, trees and decor, then
re-cut the route. Figures: `fig_holm_v2.png` (hillshade, contours, sites, grades) and `fig_cliffs_v2.png`.

### 3.1 The principles applied

1. **Terraces with banks, not domes.** Each site sits on a flat terrace with a crisp 1–4 tile bank. Pad blend drops
   from 5 to 2–2.5.
2. **Low south, high north.** The south (landing, meadow, farm) stays at 1–3 tiles. The north is three massifs:
   - the Quarry Mesa, 9;
   - the Keep Crag, 11;
   - the Lastlight Crown, 17.5.
   The creek cuts a ravine between the mesa and the crag.
3. **Up and down.** Every leg changes height visibly (see §3.7), and the route ends with the island's biggest
   climb, then its biggest drop.
4. **Chain the views.** A feature at least every 20–25 tiles (bridge, mill, statue, signpost, tree clump).
5. **2004 texture of land:**
   - the ground swell (never flat);
   - hillside dimples (small dark hollows, 1 tile deep, 5–6 across);
   - sea cliffs 2–4 tiles tall with rock faces, except at the coves.

### 3.2 Elevation plan

Heights are ground in tiles; v1 is the live pad height.

| Zone | v1 | **v2** | Shape and view |
|---|---:|---:|---|
| Arrival Cove (landing) | 1 | **0.9** | Beach cove. The path climbs 3.5 tiles over 15 (grade ≤ 0.24) with a switchback. Turn round at the top for the skiff-and-cove view |
| Guide house knoll | 3 | **4.4** | Flat knoll, radius ~18×15, falling 3 tiles on the S and E sides. From the north door you look down into the creek valley |
| South meadow | 2–3 | **1.5–3** | Rolling swell, 2–3 dimples, two low hummocks (1.3–1.6). The broken carriage lies here (§3.5) |
| Survival camp | 2 | **4.0** | Bench above the Fishing Hollow; the rim looks 2.5–2.8 tiles down to the water |
| **Fishing Hollow** (new) | — | **water 1.25, floor ~0.5, rim 3.3–4.0 (N, W, S)** | §3.3 |
| Creek, timber-bridge reach | water 2.0 | **water 1.3–1.55** | Valley floor 0.9 above the water on both banks (no perched channel) |
| Bakehouse (Hettie) | 4 | **5.4** | West Shelf terrace, radius ~20, edge 0.4. East side drops steeply to the creek |
| **Garden terrace** (new) | — | **5.4** | 6×5 on the bakehouse's NE corner, **3.4 above the mill tailrace** (§3.4) |
| **Holm Mill** (new) | — | **floor 3.2** | East bank at the weir (§3.4) |
| Stone village bridge | water 3.9 | **water ~3.5** | Stone arch; the approaches ramp up to the shelf (5.2) and the bank shoulder (7) |
| Quest lodge | 5 | **6.4** | Terrace 1.2 above the shelf, on the mesa's southern foot |
| Quarry gate | 7 | **9.0** | On the Quarry Mesa. The quarry face behind the gate is a 3–4 tile rock cut; the shaft opens at its foot |
| Creek ravine under the keep | water 5.2–4.1 | **water 6.0 → 3.8** | Spring pool at the foot of the crag (72,30). One cascade near (68,41). Ravine 3–5 tiles deep; rock faces on the keep side |
| Warden's Keep | 8 | **11.0** | Crag, with cliffs on the west (ravine) and north (sea). The south apron steps down to 9 |
| Keep approach | — | 7.0 → 11.0 | Ramp along the crag's south face: (95,58) → (95,50) → (89,50) → gate (89,46); grade ≤ 0.33, under the walls |
| Bank + service court | 6 | **7.0** | Bank shoulder, radius ~17×14, gentle to the south and east |
| Mage house and tower | 6 | **7.6** | East Hill top, sea view east |
| Crown climb | — | 7.6 → 17.5 | 48-tile path, average grade 0.21, two switchbacks (§3.7) |
| Lastlight | 14 | **17.5** | Crown, the island's summit and landmark. Sea cliffs 8–10 tall on the N and E |
| **Beacon Cove** (proposed departure haven) | (haven SE, 1) | **1.0** | Low saddle between the crag and the crown on the north coast, facing the mainland (NW) |
| Holm Farm (old haven site) | 1 | **2.4** | Hay barn, paddock and orchard on the south-east meadow |
| West coast | 2–4 | **3–4 with 2–3 tile sea cliffs** | West Downs and West Cliff Rim; beaches only at the coves |

**What the v2 sketch measures** (`holm_v2_proposal.js`, same metrics as v1):
- heights p5 0.81, median 3.54, p95 11.0, max 17.5;
- slopes flat 24%, gentle 28%, moderate 16%, steep 19%, cliff 13% (11.8% of tiles above the 1.05 step);
- median relief per 32-block 7.8;
- every route leg is reachable with the 1.05 step limit.

These sit inside the 2004 TI band (after the 1.2 rule) and give the owner the "more height" he asked for without
raising the lowland.

**Terrain-source features the engineer must add** to `src/holm_overhaul_terrain.js` (schema v2). The sketch shows
one way to do each.
1. **Plateaus with an edge fraction.** Flat top, steep rim (`h += height · smooth((1 − r) / edge)`, edge 0.3–0.6).
   Overlapping plateaus combine by **max, not sum**, so terraces form steps, not spikes.
2. **Ground swell.** Two-octave value noise, amplitude ≈ 1.0, cell ≈ 5 tiles (std ≈ 0.5). Fade it to 0 on pads,
   to ×0.3 on paths, and to 0 within 2 tiles of water.
3. **Basins with a pond level.** A basin lowers the ground; tiles inside it below `pond` become still water (a third
   water kind: 0 dry, 1 sea, 2 creek, **3 pond**). The renderer uses a flat pond plane at that level.
4. **Dimples.** Small dry hollows: [x, z, radius 2.5–3.5, depth 0.7–1.1].
5. **Creek valley + steps.**
   - `valley {above 0.9, rise 0.12, radius 10}` raises low banks to follow the water line, so the channel is never
     perched.
   - Close-spaced creek points make a step (weir or cascade). The renderer draws a sloped white-water strip between
     them.
6. **Rock where it is steep.** Material = rock where the tile rise exceeds 1.0. Those tiles are **blocked** in the
   nav graph (`holm_island_nav.js`: refuse edges whose rise exceeds 1.05) and dressed with Blender rock faces or
   cliff strips.
7. **Pad blend 2–3 and cardinal grades ≤ 0.4.** Grades already exist (`grades`). Use them for every climbing path.

After the terrain changes, re-measure and regenerate:
- `island-bridges.json` (decks sit higher over the ravine: stone bridge water ~3.5, deck ~4.1–4.3);
- lesson positions (§3.7);
- building seams (each Blender building graph re-joins its terrain patch);
- paths data.

### 3.3 The Fishing Hollow (recessed pond; where fishing is taught)

**Where.**
- South-west of the survival camp, in the West Downs.
- Pond centre about (27, 96) with a lobe towards (31.5, 99).
- Water **~40 tiles** in a kidney shape, bbox about 9×7 (x 23–31, z 93–99).
- Water level 1.25; floor about 0.5.

**How deep it reads.**
- The rim is 3.3–4.0 on the N, W and S sides (median ground 3.4 at 4–6 tiles from the water); the east side opens
  down to about 1.8 towards the creek. The water sits **2.1–2.75 tiles below the rim** and 2.75 below the camp.
- That is 1.2–1.5 player heights of bowl: clearly recessed, sheltered and cozy.
- West rim: a narrow grass ridge with the sea cliff behind it (sea glimpses through a notch).
- North rim: the survival camp terrace.
- The east side opens gently towards the creek.

**Getting down.**
- From the camp's south gate (33, 89.5) the Hollow Path descends: (33,89.5) → (33,92) → (36,92) → (36,99.5) → (33,99.5).
- About 12 tiles long, dropping 2.45 tiles (grade ≤ 0.32). The steepest 3 tiles are log steps.
- A fence runs on the drop side.
- Walk time about 7 s.

**The shore.**
- **Fire Beach:** a shingle strip 6×2.5 at 1.55 on the south-east shore. You light your fire and cook here.
- **Jetty:** 3 tiles of timber over the water on the north-east shore.
- **Oaks:** 3 lesson oaks on the east rim at the top of the path, with 2 stumps.
- The pond drains east by a 1-wide rill to the creek at (44, 98), crossed by 3 stepping stones.

**The lesson** (Wenna; talk-first; hint box + arrow on the exact object):

| Lesson | Where | What the player does |
|---|---|---|
| `chop_logs` | Oaks on the hollow rim | Chop an oak |
| `light_fire` | Fire Beach | Walk down the Hollow Path; tinderbox on the logs lights a fire on the shingle (a new fire stance; the camp fire ring stays as scenery) |
| `catch_fish` | Pond | Net at a ripple. **The first catch is guaranteed on the 2nd roll (~6 s)**, like 2004's guaranteed tutorial catch |
| `cook_fish` | Your fire on the beach | Cook; it can burn (taught failure); net another and retry |

The whole survival loop then happens within about 10 tiles, as it did on the TI. Wenna stands at the head of the
path, above the hollow, so she is visible from the camp and from the water.

**Making fishing fun, old-school style** (no minigame UI; feedback and variety):

1. **Moving spots.** 3 ripple spots on the pond out of **7 candidate shore-edge tiles**, each ≥ 2 apart and each
   fishable from a dry stance.
   - On the Holm, a spot moves every **60–100 ticks** (36–60 s): faster than the 2004 280–529, so a new player sees a
     move within the lesson. Keep 280–529 on the mainland.
   - A move is telegraphed: the ripple fades out over 2 ticks with a few bubbles, and the new one fades in 1 tick later.
   - If you were fishing it, a chat line says "The fish have moved on." and you stop, 2004-style.
   - During `catch_fish` the arrow follows the active spot.
2. **Every roll is visible.** Rolls come every 5 ticks (3 s), each with:
   - a cast animation and a net splash ring + droplets at the spot;
   - a soft *plish*.
   On success:
   - the net lifts with a flapping fish for about 1 s;
   - a *flop* sound;
   - the item appears in the pack and a chat line reads "You catch a …".
   Failure is silent: keep casting.
3. **Varied catches** (our own item names; after the lesson):
   - the common pond fish, about 85%;
   - a second, bigger fish at Fishing 5+, about 12%;
   - junk, about 3% (an old boot, a clump of weed: comic, sellable for 1 coin or droppable);
   - **rare finds**: 1 in 150 rolls a *sealed bottle* with a short island-lore note (once per account), and
     1 in 400 a *tarnished ring* worth a few coins.
   - Chance per roll follows the 2004 curve: about 19% at level 1 for the common fish, rising with level.
4. **A living pond.**
   - 2–3 dark fish shadows circling under the ripples;
   - a fish **leaps** somewhere on the pond every 15–25 s (splash + sound);
   - 2 ducks paddle (2004 has ducks everywhere);
   - dragonflies over the reeds;
   - a frog on a lily pad that *plops* in when you come within 2 tiles;
   - 6 reed clumps and 8–10 lily pads, never on spot tiles.
5. **A rare moment.** After the lesson only, 1 in 60 rolls: "A big fish leaps and soaks you!" A cosmetic splash on the
   player, with no damage or loss.
6. **Sounds.**
   - An ambient loop inside the hollow: birds, frogs, reeds, far surf beyond the rim. It fades out over 4 tiles as
     you climb out.
   - Action sounds: cast *whoosh*, net *splash*, catch *flop*, and a leap *splash*.

The old creek fishing stage becomes jetty scenery. Later it can be a second, post-lesson spot (creek fish) so there
is somewhere to practise.

### 3.4 Holm Mill (water wheel) and Hettie's garden terrace

**Where.** The creek bends at (55–62, 58–64) between the stone village bridge and the bakehouse. v2 puts a weir
there:
- **weir crest (59.6, 60.3) at water 3.1**, falling to **2.0 at (58.4, 61.6)**: a 1.1-tile cascade;
- a head pool above the weir;
- the tailrace below.

**The mill.**
- Footprint 8×7 (56 tiles², a 2004-typical house size), centred (62.5, 64) on the east bank; floor terrace 3.2.
- Two storeys:
  - stone ground floor, with the wheel pit on the creek side;
  - jettied timber upper floor overhanging the creek;
  - thatched roof, many-angled (the owner's roof rule).
- **Wheel (breastshot):**
  - diameter **2.6 tiles**, 0.8 wide;
  - 8 spokes, 12 paddles;
  - axle at about 3.0, dipping 0.3 into the tailrace (2.0);
  - fed by a 3-tile timber leat from the head pool at breast height (~2.9);
  - turns continuously at about **6 rpm** (one turn per 10 s, ~17 ticks): slow and readable;
  - white-water strips on the weir face, a splash puff where the paddles enter, a creak + water loop audible
    within 8 tiles.
- **Inside:** millstones, hopper, flour sacks, a grain bin.
- **The miller is not a talkable NPC** (one tutor per area). Hettie's bread dialogue mentions the flour comes from
  the mill across the creek.
- **Weir walkway:** a 1-wide plank path on the weir crest (x 57–60, z 61) links the lodge path to the mill.
  It is a third creek crossing and a nice shortcut.

**Hettie's garden terrace.**
- 6×5 at **5.4**, on the bakehouse's NE corner (51.5, 61.5), reached by a side door and a small gate from the
  lodge path.
- It looks east-north-east across the creek to the wheel, about 7 tiles away and **3.4 tiles above the tailrace**.
  This is the owner's "cozy greenery area on one of the houses that overlooks the water wheel".
- Contents:
  - a low stone parapet on the creek side (0.5 tall, 6–8 tiles);
  - 2 raised herb beds;
  - a vine-and-rose arbour over a bench;
  - a small table with a jug and two cups;
  - 4 flower tubs;
  - a bee skep;
  - a bird table;
  - one lantern (warm light at dusk).
- Planted: dappled leaves, small flowers in close warm shades, not busy textures (owner: foliage 10–15× too busy).
- The terrace also frames the view down the creek valley towards the timber bridge (~26 tiles, the fog edge).

### 3.5 Medieval clutter, fences and life, per area

About 190 clutter props, 350–450 fence edges, about 250 trees and 1,400–2,300 ground-decor pieces in total.
Keep 80% of clutter inside yards and at doors and junctions, and leave the open land open.

| Area | Clutter (rough counts) | Fences, trees, life |
|---|---|---|
| Arrival Cove | cargo stack: 4 crates, 3 barrels, 2 sacks; rope coil; 3 lobster pots; oars; 4 mooring posts; upturned rowboat; net-drying rack; lantern post | 2 gulls; rocks at the cove ends |
| Guide house yard | **well** (the island's first water); woodpile under the eave; chopping block with axe; **washing line** (2 posts + cloth); bench; 3 flower tubs; water butt; wheelbarrow; signpost at the junction | kitchen-garden fence ~20 edges + gate; 2 trees; chickens ×3 |
| Survival camp + Fishing Hollow | log pile and tool rack (lesson); fire ring (scenery); lean-to; 2 stumps; sawhorse; fish-drying rack; 2 buckets; fish basket; crate of nets; rowboat pulled up on the shingle; 3-tile jetty; 3 stepping stones | Hollow-rim fence ~16 edges; 3 lesson oaks + 6 wood-edge trees in clumps; reeds 6; lily pads 8–10; 2 ducks; frog; dragonflies |
| Bakehouse + garden terrace | 4 flour sacks by the door; 2 water barrels; 2 apple crates; oven woodpile; bread rack; terrace set (§3.4) | fenced veg plot 4×6 (~20 edges); 2 fruit trees |
| Holm Mill | spare millstone leaning on the wall; 4 grain sacks; hand-cart with sacks; 2 barrels; sluice gate; leat; eel trap; grain bin; lantern | millrace fence ~8 edges; willow-like tree by the tailrace |
| Quest lodge | notice board (lesson); 2 benches; barrel; 2 crates; woodpile; 2 flower tubs; hitching rail | 2 trees |
| Quarry gate | **ore cart on 6 tiles of rail**; loose cart wheel; 4 rubble piles; 3 stacked stone blocks; 2 tool crates; 2 barrels; pick-and-hammer rack; warning sign; 2 spoil heaps; 2 lamps | rail fence at the quarry lip ~12 edges |
| Warden's Keep | 2 weapon racks; 3 training dummies; 2 archery butts with 4 hay bales behind them (ranged trial); 4 barrels; 3 crates; 2 banners; 2 braziers; water trough; supply cart | — |
| Bank + service court | 4 crates; 3 sacks; 3 barrels; strongbox hand-cart; one market stall (the small shop); bench; 2 lamp posts | 2 trees |
| Mage house | 3 standing rune stones; lens stand; herb bed; 3 pots; barrel; telescope on the balcony | **practice-yard fence ~24 edges** with gate; 4 chickens as the magic-trial foes' neighbours |
| Lastlight + Beacon Cove | 4 oil barrels; 2 rope coils; 2 crates; lookout bench; 2 lantern posts; spyglass stand; 2 gull nests / pier, skiff, 4 mooring posts, 4 crates, 3 barrels, 3 lobster pots, drying rack, boat shed, notice board | cliff-top rail ~20 edges on the crown path |
| Holm Farm + south meadow | small hay barn; 3 haystacks; 6 hay bales; chicken coop; scarecrow; wheelbarrow; water trough; plough; **the broken carriage** (below); a roadside shrine | **sheep paddock ~60 edges** + 2 gates; 5 sheep; 4 chickens; orchard of 8 apple trees; 3 beehives |
| Along every path | 6–8 signposts (one per junction); 4 waymark cairns; 8 lamp posts at buildings; 3 benches; 2 stiles | ravine and cliff-top rails ~80–120 edges |

**The broken carriage.**
- Location: on the old cart track where it bends at **(79–81, 80–82)**, halfway along guide house → bank, where
  that 40-tile stretch needs a mid-way feature.
- A small covered carriage tipped on its side in the verge ditch, one wheel off and lying 2 tiles away, the axle
  snapped.
- Spilled around it: 2 crates (one split open), a sack, a travel trunk. Two crows on it; ruts in the worn path.
- Examine text (our own words), e.g. "Somebody's journey ended early."
- No interaction required. It is also a good future hook for a mainland quest.

**Ground decor.** 12–20 small pieces per 100 tiles: grass tufts, twigs, worn-earth patches, pebbles. Instance them;
they are sparse single sprites or low-poly bits, not a busy texture. Denser at wood edges and doors (worn earth);
none on paths.

**Trees.**
- 230–290 in total (2.0–2.5 per 100): clumps of 2–4 with 1.5–3 tile spacing, and single anchors near buildings.
- Wood edge: 5–8 per 100 around the survival camp and the mesa's lower slopes. Exposed coast: 0.5 per 100 (pines).
- Branchy Blender trees (owner rule), not round balls.

### 3.6 Paths

Widen the main island trail to **3 tiles** (worn centre, soft edge):
landing → guide → timber bridge → survival → bakehouse → lodge → quarry, then keep → bank → mage → crown.
- Link paths: 2 tiles.
- Spurs (the hollow path, the mill walkway, the farm track, the cove stair): 1–2.
- Every door gets a **worn apron** 2–3 tiles deep, and every station a worn patch.
- Yards (keep court, service court, quarry floor) are wide worn areas (the 2004 "dirt width 9+" class).
- Target path share: **12–15% of land** (2004 TI 19%; towns 12–41%).

### 3.7 Route and lessons, v2

**One tutor per area** and the **talk-first rule** (`HolmIslandTalk`) stay as they are. No new talkable NPCs; the mill
and farm have animals and machinery only. Gates stay 2004-style (`island-gates.json`), plus one new gate:
**the cavern exit ladder works only after `forge_dagger`**.

| # | Lesson | Tutor | Area / station (v2) | Change |
|---|---|---|---|---|
| 1 | `study_route` | Bram | Guide house chart | — |
| 2 | `equip_hatchet` | Bram | Provision rack at the guide house | — |
| 3 | `chop_logs` | Wenna | Oaks on the Fishing Hollow rim | trees move from north of the camp to the hollow rim |
| 4 | `light_fire` | Wenna | **Fire Beach** in the hollow | new fire stance |
| 5 | `catch_fish` | Wenna | **Pond ripples** (3 moving spots) | moves off the creek stage |
| 6 | `cook_fish` | Wenna | Your beach fire | — |
| 7 | `bake_bread` | Hettie | Bakehouse (flour from the mill, flavour) | bakehouse door gate unchanged |
| 8 | `learn_quests` | Ansel | Quest lodge board | — |
| 9 | `descend_cavern` | Durgin | Quarry gate shaft at the foot of the quarry face | — |
| 10–13 | `mine_copper`, `mine_tin`, `smelt_bronze`, `forge_dagger` | Durgin | Cavern | the cavern gains an **east passage under the creek** |
| 14–15 | `melee_trial`, `ranged_trial` | Corrick | Keep court | player arrives by the **exit ladder in the keep undercroft** (88, 42) |
| 16 | `open_bank` | Maud | Bank counter | — |
| 17 | `magic_trial` | Ilse | Mage practice yard | — |
| 18 | `relight_lastlight` | Aldous | Lastlight lever | — |
| — | departure | Tobin | **Beacon Cove** (recommended) or the SE haven | see below |

**Legs** (walked tiles, from the sketch's slope-limited BFS):

| Leg | Walked | Walk time | Height change | Mid-way feature |
|---|---:|---:|---:|---|
| Landing → guide | 19 | 11 s | +3.4 | switchback view of the cove |
| Guide → survival | 35 | 21 s | −0.4 (down to the bridge and up again) | timber bridge at ~20 |
| Survival → Fire Beach | 16 | 10 s | −2.3 | the hollow opens below |
| Beach → bakehouse | 33 | 20 s | +3.7 | stepping stones, then the valley climb past the timber-bridge signpost |
| Bakehouse → garden → lodge | 6 + 15 | 4 + 9 s | +1.0 | mill wheel in view |
| Lodge → quarry | 14 | 8 s | +2.6 | quarry face |
| Cavern | underground | — | — | mine → furnace → anvil → east passage → ladder up into the keep |
| Keep → bank | 17 | 10 s | −4.0 | the approach ramp under the walls |
| Bank → mage | 28 | 17 s | +0.6 | signpost + stall at ~14 |
| Mage → Lastlight | 39 | 23 s | **+9.9** | two switchbacks and a cliff-top rail; sea views |
| Lastlight → Beacon Cove | 16 + ~12 (stair) | ~17 s | **−16.5** | the Beacon Stair |

**Surface total: about 250 tiles (150 s)**, down from 315 (189 s).

**Route changes, in order of value.**
1. **Cavern east passage + exit ladder in the keep undercroft.** This removes the 51-tile quarry → keep walk and the
   backtrack. It is the 2004 "down here, up over there" (the TI cave carries you under the island to the bank).
   - Underground length target: 45–60 tiles (the TI cave: ladder → mining 15, mining → rats 25, rats → ladder 17).
   - Ladder mechanics exist (`island-ladders.json`, extractor `climbs`).
2. **Beacon Cove** (recommended; owner decision).
   - Move the departure haven to the north-coast saddle between the crag and the crown, at (104, 16), reusing the
     haven model.
   - The ferry the beacon calls then arrives right below it, facing the mainland (Veyhollow lies to the Holm's NW in
     `STORY_BIBLE.md`).
   - The descent is the **Beacon Stair**: a Blender timber-and-stone stair structure with its own measured stances
     (like the keep and Lastlight ladders), from a landing at (111, 22, h 13) down to the cove.
   - It replaces the 77-tile walk to the SE haven with ~28 tiles and gives the capstone its big drop.
   - The SE haven site becomes the Holm Farm.
   - *If the owner keeps the SE haven:* build a 79-tile cliff path down the east coast (grade ≤ 0.31) with 3
     features (cliff lookout, waterfall rill, farm).
3. **Fishing moves into the Hollow** (§3.3); the survival lessons are tighter.
4. **Arrow targets** follow the moved objects: oak, beach fire, active ripple, cavern exit ladder, cove skiff.

### 3.8 Build order and acceptance

1. **Engineer:** terrain source v2 features (§3.2 list), pond water kind 3, and the nav step limit. Proof: the v2
   source compiles and `holm_measure.js` numbers land in the target column.
2. **Artist + engineer:** move the land. Re-seat every Blender building on its v2 terrace; re-extract seams;
   regenerate bridges (higher decks) and the paths data.
3. **Artist:** Fishing Hollow (pond plane, shingle, jetty, reeds, lily pads, rill, stepping stones, log steps,
   rim fence).
4. **Artist:** Holm Mill (wheel animation, leat, weir, walkway) and the garden terrace set.
5. **Engineer:** fishing v2 (7 candidates, 3 spots, move timer, telegraph, catch table, rare finds, fauna, sounds);
   lessons 3–6 at their new stances; cavern exit ladder + gate; Beacon Stair (after the owner decides).
6. **Artist:** clutter pack (barrels, crates, sacks, hay, carts, the broken carriage, well, washing line, woodpiles,
   lobster pots, signposts, lamp posts, fences and gates), then placement per §3.5.
7. **Artist:** trees to 230–290 in clumps; ground decor at 12–20 per 100; paths widened (§3.6).
8. **QA:** full-route playthroughs (`HOLM_PLAYTHROUGHS.md`), plus re-measure against the gap table:
   - the target column met;
   - no leg over 40 tiles without a mid-way feature;
   - every station reachable within the 1.05 step.

---

## 4. The mainland slice (W3) with the same principles

**Frame:** server map (+x east, +z north), origin at the Hollow Well (0, 0). Client World V2 = (x, −z), so the
`world_v2_mainland.js` Ferry Landing at client (0, 18) is server (0, −18), 18 tiles south of the well, where it
belongs.

```
                       N
      Scarlands pocket z 124..187 (L1..L8), ridge h 7-8, basin h 3
   ==== THE DITCH z 122-123 (cut 2.2) ==== plank x-16 ==== causeway x+16 ====
      warning band z 116-119
      Frontier Post (0,98): watch hut, rules board, bank booth (safe), h 4.5
      North Road, 3 wide dirt
      Watch Pass (0,62) h 6.0
 logging camp (-70,20)      Woodline trees       Stonereach Quarry (74,20) floor 6.5, faces 4
      \  spur                 N gate (0,26)            / spur
 Emberwood edge (-62,0) --W gate--[ SQUARE 16x16 + Hollow Well ]--E gate-- brook bridge (32,0) -- (52,0) --> east
                          bank N / provisions W / smithy E / hall SW
                                Commons green (12..28, -20..-10)
                      quay (0,-18) ~~~~ the River Vey (water 0.6, 6 wide, z -21..-27) ~~~~
                         bridge (12,-24) -> Mirrorpond (40,-50) water 0.5, ~470 tiles
                       S
```

### 4.1 Veyhollow Commons (the starter town)

- **Size and shape.**
  - Envelope 56×52 (x −28..28, z −22..30): a Lumbridge-sized village (49×68).
  - The full town grows to 8–10 buildings; W3 builds 4 + the well square.
- **Elevation: a hollow, true to the name.**
  - River Vey water 0.6 (south edge); quay 1.5.
  - Square 2.0; houses 2.0–2.4 (flat, as 2004 towns are); town edge 3.0.
  - A **rim of low hills at 5–6** at radius 32–40 to the W, N and E. The town sits 3–4 below its rim and level with
    its own ground (§1.2: towns backed by hills sit below them).
  - Every road leaves through a notch in the rim; the north gate is at 3.5.
- **Square.**
  - **16×16 paved** (x, z −8..8): Varrock-sized.
  - Note: `hollow_square_data.js` rings the square at radius 14.6–16.8 (about 30–34 across), **twice a 2004
    square**. Shrink the paved civic ring to about 8 radius and give the rest to buildings, aprons and stalls.
  - The Hollow Well is at the centre (3×3 well-house) with 6 standing stones at radius 5.5. The well reads within
    25 tiles, so it is visible from every gate (gates at 26).
- **W3 buildings** (houses 6×8 to 10×8, gaps 3–7, doors onto the square, 2-tile worn aprons):

| Building | Footprint (x, z) | Size | Storeys | Door |
|---|---|---|---:|---|
| Bank | x −5..5, z 10..18 (north side) | 10×8 | 2 | (0, 10), facing S |
| Provisions (general store + range) | x −18..−10, z −4..3 (west) | 8×7 | 1 | (−10, 0), facing E |
| Smithy | x 10..17, z 2..9 (east) | 7×7 | 1 | facing W |
| Forge yard (open, south of the smithy) | x 10..16, z −5..1 | 6×6 | — | furnace, anvil, trough, ore bins |
| Ward Hall / pub | x −18..−9, z −17..−10 (south-west) | 9×7 | 1 | faces the square's SW corner |

- **Later town** (keeps the 2004 checklist):
  - Chapel NW (x −22..−14, z 14..26), 8×12, the landmark roofline;
  - 3 bazaar stalls on the square's NE quarter;
  - 3 cottages (7×6) on the W and E roads;
  - a mill on the Hollow Brook at (36, −14).
- **Water.**
  - The River Vey on the south (the quay; a stone bridge at (12, −24) to the south side).
  - The Hollow Brook, 3 wide, running south along x ≈ 32 into the Vey.
  - The well.
- **Clutter** (2004 town density, doubled for "realism"):
  - Outdoors: 2 stalls, 6 barrels, 5 crates, 1 cart, a well, a noticeboard, 4 lamp posts, 2 benches, 4 flower tubs,
    a signpost at each gate.
  - Indoors: 2–3× that.
  - Fenced gardens behind the houses (~5 fence edges per 100 tiles).
  - Trees in clumps at the rim, none in the square.

### 4.2 Roads, spurs and distances

- **Road standards.**
  - Inside the town: 3 wide cobble.
  - Outside: 3 wide dirt, 2 on spurs.
  - Grades ≤ 0.375 (2004 road p90), switchbacks where steeper.
  - A signpost at every fork; a feature every 20–25 tiles.

**Walked distances from the well** (target ±15%):

| Destination | Tiles | Walk | Run | 2004 anchor |
|---|---:|---:|---:|---|
| Bank, provisions, smithy doors | 10 | 6 s | 3 s | Varrock gen. store 9 |
| Ferry quay | 18 | 11 s | 5 s | — |
| Woodline copse (first trees, x −14..−4, z 20..30) | 20 | 12 s | 6 s | trees 5–16 |
| Commons green, first combat (grubkins) | 22 | 13 s | 7 s | Lumbridge goblins 29 |
| Town gates N / W / E | 26 | 16 s | 8 s | — |
| Brook bridge (32, 0) | 32 | 19 s | 10 s | — |
| Logging spur sign (−50, 0) / mining spur sign (52, 0) | 50–52 | 30 s | 15 s | — |
| **Mirrorpond shore** (fishing; lake ~30×20 at (40, −50), water 0.5) | 55 | 33 s | 17 s | Lumbridge fishing 53 |
| Pasture (moorcalves, NE across the brook) | 55 | 33 s | 17 s | Lumbridge cows 58 |
| **Emberwood edge** (oaks begin; ground 3.5–4.5) | 62 | 37 s | 19 s | Lumbridge → Al Kharid 71 |
| Watch Pass (0, 62) | 62 | 37 s | 19 s | — |
| Logging camp (−70, 20): clearing 12×10, woodcutter's hut 6×6, log piles, sawpit | 75 | 45 s | 23 s | — |
| **Stonereach Quarry mouth** (74, 20) | 78 | 47 s | 23 s | Varrock ore 45, Lumbridge 114 |
| **Frontier Post** (0, 98) | 98 | 59 s | 29 s | — |
| **The Ditch** (z 122) | 122 | 73 s | 37 s | Varrock → wild 92, Barbarian Village 100 |
| Scarlands ruins (L4–5, z ~155) | 155 | 93 s | 47 s | — |

- **Emberwood–Stonereach road** (the one W3 road): from the logging camp to the quarry is about **150 tiles end to
  end (90 s walk)**, like Lumbridge → Draynor. The Emberwood and Stonereach regions proper start at the spurs and
  grow outward later.
- **Stonereach Quarry.**
  - The road rises from 2.5 at the brook to 5 at the spur.
  - Quarry floor 14×12 at 6.5, with rock faces 4 tiles tall on N, E and W (rim 10.5).
  - 6–8 copper/tin rocks, an ore cart and a spoil heap.
  - A future cave mouth sits at the foot of the north face (2004 dungeon mouths: foot of a slope, near a path,
    ~70 tiles from a town).
- **Emberwood.**
  - Rolling forest floor 3.5–4.5 with swell and a stream.
  - Trees 5–8 per 100 inside, 2 per 100 at the edge, in clumps.
  - Oaks at the edge; the named autumn trees deeper in.

### 4.3 The North Road, the Frontier and the Ditch

- **Watch Pass.** The road climbs out of the hollow from the north gate (3.5) to the Watch Pass (0, 62) at **6.0**
  (grade 0.07), then falls gently to 4.5 at the Frontier. Features at about 20-tile intervals: milestone, wayside
  shrine, lone oak, ruined wall.
- **Frontier Post (0, 98), 24 tiles before the Ditch: the Edgeville analogue.**
  - A walled yard 20×16 with a watch hut, a lamp and a guard.
  - A **rules board** (PvP rules must be understandable before crossing: `SHIP_PLAN.md`, `WORLD_GOAL`).
  - A **bank booth** in a safe zone (no player combat, `GOAL.md`). It is the one addition this guide asks for
    beyond the four Commons buildings: 2004's PvP loop lives on a bank 26 tiles from the edge.
  - Respawn stays in the Commons.
- **Warning band z 116–119.** The first entry shows the warning screen once, as in 2004 (4 rows, 5–8 tiles before
  the line). Warning signs stand at both crossings.
- **The Ditch** (z 122–123).
  - 2 wide, cut 2.2, lip walls, as in the proof kit.
  - **Two crossings only**, 32 tiles apart: a plank crossing at x −16 and a stone causeway at x +16.
  - Depth stones every 8 tiles beyond the Ditch (one per Wilderness level; already in `proof_placement.json`).
  - Unlike 2004's 17%-broken wall, the Ditch is a clear edge, which suits a PvP-first game.

### 4.4 The Scarlands pocket

- **Size.** 64 wide (x −32..32) × 64 deep (z 124..187) = **levels 1–8** at 8 tiles per level (`shared/pvp.js`
  already uses 8). The W2 JSON's 80 rows (L1–10) can stay; the pocket then ends at z 203.
- **Elevation.**
  - Raise relief from the proof's **−1.4..+1.4 (2.75 tiles)** to **5–7 tiles** (the 2004 Wilderness keeps its
    8–9 tile relief, and a 64-square's median is 3.75).
  - L1–2: 4–5, rolling.
  - A **scorched ridge at 7–8** around z 150–160 (L4–5), holding the ruins.
  - A **basin at about 3** around z 170–180 (L7–8), the multi-combat zone.
  - Keep **flat fighting plateaus of 10×10 or more** so PvP stays readable.
- **Gradient.** Paths drop from 2 wide at L1 to broken tracks by L4 and none beyond (15% → 8% → 1% → 0%). No
  buildings: only ruins, camps and an arch. Burnt trees get sparser deeper in.
- **Monsters.** About 2 hostile spawns per 1,000 tiles (the W2 pocket has 11 in 5,120 tiles; 2004 L1–8 had about
  1.7).
- **Re-mapping the W2 pocket.** In the W2 pocket JSON, the southern 44 rows labelled "Veyhollow Commons" become the
  **Frontier approach**. Its ~24-tile run-up to the Ditch already matches Edgeville's 26. W3 then joins the Frontier
  to the real Commons by the 98-tile North Road.

---

## 5. Engineering and art notes that follow from the study

- **Collision** follows 2004: tiles, walls on tile edges and blocked faces. Steep faces (rise > 1.05) are blocked,
  and everything else stays walkable even when steep. Paths use grades ≤ 0.4.
- **View distance stays at about 25 tiles.** Place a feature at least every 20–25 tiles along routes. Do not rely on
  far skyline landmarks.
- **Reuse the MIT fishing rules** (spot timer 280 + random(250) ticks; candidate lists; roll every 5 ticks; the
  low/high success curve) with our own items and numbers. Credit `THIRD_PARTY_ASSETS.md`. The Holm uses a shorter
  60–100 tick timer for teaching.
- **Everything visible is Blender-made:** mill, wheel, weir, carriage, clutter, fences, stair, pond set. Ground tiles
  in close shades. Trees branchy.

---

## 6. Method and re-running

Study scripts (read-only; statistics out) are in `scratchpad/world_layout_study/`.

| Script | What it measures |
|---|---|
| `rs04_load.py` | Parses the 2004scape `.jm2` map source into grids (heights incl. the noise ground, overlays, flags, locs, NPCs). The parse cache goes to the OS temp dir, never into this repo |
| `rs04_measure.py` → `rs04_metrics.txt`, `rs04_metrics.json` | Towns, buildings, travel, slopes, relief, roads, water, fishing, trees, fences, clutter, entrances, Wilderness edge |
| `rs04_tutorial.py` | Tutorial Island: size, heights, shore profile, buildings, instructors, route legs, pond, densities |
| `rs04_slopes.py` | Walkable vs blocked slopes, road grades, cliff heights |
| `rs04_access.py` | Walked distance from town centres to the first resources and services |
| `rs04_fields.py` | Crop fields, fencing, building frontage, underlay mixing |
| `holm_measure.js` → `holm_metrics.txt` | The live Holm with the same metrics |
| `holm_v2_proposal.js` → `holm_v2_metrics.txt`, `_holm_v2_grid.json` | The v2 land sketch: source, evaluator, metrics, slope-limited route |
| `holm_plot.py`, `holm_cliffs.py` | Figures: `fig_holm_v1.png`, `fig_holm_v2.png`, `fig_cliffs_v1.png`, `fig_cliffs_v2.png` |

```
cd C:\Users\iQwaZ\OneDrive\Desktop\CraftedRealms-Claude\scratchpad\world_layout_study
python rs04_measure.py > rs04_metrics.txt      # first run parses the maps (~80 s), then caches in %TEMP%
python rs04_tutorial.py; python rs04_slopes.py; python rs04_access.py; python rs04_fields.py
node holm_measure.js > holm_metrics.txt
node holm_v2_proposal.js > holm_v2_metrics.txt
python holm_plot.py _holm_v2_grid.json fig_holm_v2.png "Tutor's Holm v2"; python holm_cliffs.py _holm_v2_grid.json fig_cliffs_v2.png
```

**Caveats.**
- Walked distances ignore walls, fences and doors, so they are lower bounds.
- Town clusters are automatic (gap ≤ 14 tiles); Yanille and Port Khazard merged and are excluded.
- Path classes come from floor overlays (grey road vs brown/mud/pebble/sand).
- "Indoors" is the 2004 roof flag.
- Player height is the first male identity-kit parts (head/torso/legs/feet); hair adds a little.
- The v2 sketch's evaluator is a proposal for the engineer, not a drop-in compiler.
