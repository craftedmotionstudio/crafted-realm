# Map Build-Out Log — building the world to match `Crafted Realms Map.png`

Every `/loop` pass logs ONE entry here. Newest at the top. The bible map
(`Maps/Crafted Realms Map.png`) is the layout target; `CLAUDE.md` art canon (cozy 2007/OSRS
low-poly flat-shaded — **not** hyper-real) is the render target. The map dictates *where and
what*; it does **not** change *how it's rendered*.

Scoring rule: treat the previous iteration as **100**. A pass is only kept if it lands at
**120+** — an *obvious* improvement in geometry/detail, lighting/materials, or atmosphere/life.
If it doesn't clearly beat the prior shot, **revert** and log why.

Screenshots live in `Maps/iterations/` as `passNNN_<target>_<before|after>.png`.

---

## Pass template (copy for each entry)

### Pass NNN — <target region/landmark> — <YYYY-MM-DD> — KEPT / REVERTED
- **Target:** which part of the map this pass built toward (e.g. "Wilderness Ditch + Scarlands N band").
- **Changed:** files touched, what was added/adjusted.
- **Before → after:** `iterations/passNNN_<target>_before.png` → `..._after.png`.
- **Gemini match/quality:** before X/10 → after Y/10 (`tools/gemini_vision.js`), vs bible map.
- **Verdict:** obvious improvement? kept because… / reverted because…
- **Next:** the target for the following pass.

---

<!-- Newest entries below this line, newest first -->

### Pass 006 — the walled Veyhollow Commons — 2026-07-03 — KEPT
- **Target:** the map's most iconic silhouette — the circular walled town at the world's heart,
  rebuilt from scratch on the wiped hub (pass 005 cleared the pre-map village).
- **Changed:** `src/veyhollow_town.js` (NEW, self-booting):
  - **The wall**: 28 straight stone runs round a radius-26 ring; any segment within 3.6 of a
    road auto-opens as a GATE (`pathDist`), so every map road walks straight through. Gate
    towers flank the north + east gates; torches mark the rest. Water cells stay unwalled.
  - **Map-icon services, all furnished** (Buildkit presets): Bank of Veyhollow + booth,
    general store, Stonereach Smithy + furnace + cinder yard, Glimmerveil Arcana (rune shop),
    Chapel of the Dawn + altar, the Hearthhouse kitchen + range — and **the Wayfarer's Rest
    returns** as the town's 2-storey pub (the pipeline reference build, now map-true).
  - Hollow Well plaza at the centre, market stalls + crates, gate signposts.
  - **Zero NPCs** — buildout law holds; folk are placed deliberately in a later pass.
- **Before → after:** `pass006_commons_before.png` (the cleared hub) → `pass006_commons_after.png`,
  `pass006_commons_topdown.png`.
- **Verified:** console clean, boot clean, interiors 11→18 (the 7 furnished town buildings).
  Two screenshot anomalies investigated and cleared: the dark lattice = the player's own
  faint tile-grid QoL overlay (only reads from altitude); the thatch hut SE of the wall =
  the PLAYER's claimed homestead rebuilding from their save (player content — untouched).
- **Gemini:** **10/10 layout-identity match** — "circular wall, four major road gates, central
  plaza, and surrounding buildings… an excellent match." Named next improvement: the water
  arcs + bridges hugging the town (the map's pond arms / Stonereach Bridge).
- **Next:** Stonereach Bridge + the pond-arm water crossing at the town's south (the map's
  named bridge POI), then deliberate NPC repopulation of the Commons (first region to get
  its folk back).

### Pass 005 — THE GREAT WIPE (NPCs + pre-map buildings) — 2026-07-03 — KEPT
- **User decision:** nuke ALL world NPC placement (each region's pass will place its folk
  deliberately later) and wipe every building that predates the map rebuild unless it's part
  of today's map.
- **Changed:**
  - `src/config.js` — `GameConfig.worldNpcSpawns:false` (buildout mode, not persisted; flip in
    code when repopulating). `spawnNpc`/`spawnFriendly` gate on it; gameplay/tooling spawns
    bypass via `spawnNpc.force`: Admin console, the Menagerie, duels, instance dungeons. The
    ambient Bots are silenced by the same flag; the Proving Ring's sparring pair too.
  - `src/game4_ui.js` — `LEGACY_VILLAGE=false` wraps the whole pre-map Veyhollow village
    (bank/bazaar/pub/smithy/arcana/chapel/hearthhouse/cottages/stalls/well/pens/graves/windmill/
    wheat/Spire) + the dunes trading post. Map-era keepers pulled out of the gate: Whitmoor's
    plazas + road signpost, butterflies, dressWorld.
  - `index.html` — map_showcase (Wayfarer's Rest) and north_cottage script tags disabled
    (pre-map builds; patterns preserved in git).
  - `src/starter_pen.js` + `game2_world.js` — the Menagerie moved truly off-map to (420,420)
    (the bigger world had swallowed its old pad at 110,120); it brings its own stone pad,
    recognised by a `MENAGERIE_PAD` exception in `groundY` so its aisles stay walkable.
- **Verified:** boot clean, `validate_content.js` PASS, world NPCs = 0, friendlies = 0,
  24 Menagerie exhibits penned off-map at (~402,408), admin force-spawn works, duel/instance
  spawns bypass the gate. `wipe_worldmap_topdown.png` shows only map-era content standing.
- **Known consequences (accepted for buildout):** no Guide Bram on the Holm (tutorial talk
  step stalls — Skip tutorial in admin), no shopkeepers/bankers anywhere until region passes
  repopulate, quests needing kills/talks stall.
- **Next:** the walled Veyhollow Commons ring (the map's most iconic silhouette), rebuilt on
  the now-clear hub with map-icon services (bank, general store, smithy, altar, rune shop,
  quest start) — and its folk placed deliberately, the first region to repopulate.

### Pass 004 — Brynholt, the raider village on the frost coast — 2026-07-03 — KEPT
- **Target:** Brynholt's identity (bible: "Raiders & bowyers", NE coast). Was 3 empty huts.
- **Changed:**
  - `src/brynholt.js` (NEW, self-booting) — 4 Buildkit one-liners, ALL furnished (doctrine:
    interiors non-negotiable): the Whalebone Hall (mead-hall/pub), Hask's Bows (shop), 2 homes —
    northern palette (weathered timber, slate-blue roofs). Hand-placed identity: a timber dock
    probed to the real coastline, piles into the sea, mooring post, crates, torch, a FLOATING
    rowboat (makeRowboat grounds at gy — deep water sank it; hull pinned to the sea plane),
    2 dockside fishing spots, west palisade facing the Scarlands, signpost.
  - `src/game4_ui.js` — populateBrynholt reduced to folk + hearth (Bowyer Hask now stands in
    his shop; +1 raider).
  - `src/biome_snow.js` — blanket + drift threshold raised to −0.35: snow no longer pokes out
    of the sea at the shoreline (the "white wedge in the water" artifact).
- **Before → after:** `pass004_brynholt_before/after.png` (same camera), `pass004_brynholt_dock.png`.
- **Verified:** console clean; no data changes (validator N/A but engine content untouched).
- **Gemini:** **215 vs the before's 100** — "dramatically improves settlement believability…
  finally establishes its coastal identity." Weakest point: wants more boats at the dock.
- **Verdict:** KEPT — obvious win, matches the map's NE village.
- **Next:** the walled Veyhollow Commons ring (the map's most iconic town silhouette: circular
  wall + gates around the existing village), or a raider longship at Brynholt's dock as a
  small flourish if the wall proves too big for one pass.

### Pass 003 — grid-following snow (the frost is map-shaped) — 2026-07-03 — KEPT
- **Target:** Gemini's "rectangular inset" artifact — biome_snow's two square blankets.
- **Changed:**
  - `tools/bake_worldgrid.html` — snow south of the Ditch reclassifies to grass (POI icons /
    bright paint misread as snow scattered ~7k stray cells across the heartland); regenerated
    `src/worldgrid.js`.
  - `src/biome_snow.js` — the blanket is now ONE vertex-masked mesh per frost region: verts keep
    snow only where the baked map paints snow (plus a 1-tile melt skirt); region bboxes scanned
    from the grid at boot; drift mounds and snow-dusted pines now sample ONLY true snow cells.
- **Before → after:** `pass002_worldmap_topdown.png` → `pass003_worldmap_topdown.png`;
  `pass003_whitmoor_after.png` (the Hold in organic frost, pines, sea behind).
- **Verified:** console clean, `validate_content.js` PASS.
- **Gemini:** "incredibly effective… natural biome boundaries… integrated with the dark northern
  wilderness." Remaining nitpicks: hard snow edge (soft-dusting = future polish), straight world-rim
  edges (a world-edge treatment is its own future pass).
- **Verdict:** KEPT — the NW frost is an organic blob threading the scar mountains exactly as
  painted; the NE keeps only its true small frost pockets.
- **Next:** Brynholt village on its NE coast (currently 3 tiny huts + a campfire — needs its
  raider-village identity: longhouses, bowyer, docks, cottage), or the walled Veyhollow Commons
  ring if Brynholt's coast needs the sea-edge treatment first.

### Pass 002 — Gloomfen + the SW coast — 2026-07-03 — KEPT
- **Target:** Gemini's #1 mismatch from pass 001 — the artificial rectangular slab where the
  map's title box masked the SW corner — plus making Gloomfen read like the map's drowned fen.
- **Changed:**
  - `tools/bake_worldgrid.html` — the masked title-box corner is now *authored*: Gloomfen bleeds
    south into the sea on a triple-sine wiggly coastline (regenerated `src/worldgrid.js`).
  - `src/game2_world.js` — swamp relief digs drowned pools (never under a road via `pathDist`
    guard); fen banks tint dark mud instead of beach sand.
  - `src/gloomfen.js` (NEW) — self-booting fen dressing: murk sheet at −1.5 (pools read
    stagnant-green, not ocean-blue; sized to stop at the world's west rim), +24 dead/dark trees
    on dry footing, 30 reeds on pool rims, mushroom clusters, 2 eel fishing spots in deep pools,
    3 green marsh-light wisps (the Wardens' lights, per the bible's identity line).
- **Before → after:** `pass002_gloomfen_before/after.png` (same camera), `pass002_swcoast_after.png`,
  `pass002_worldmap_topdown.png` vs pass 001's topdown.
- **Verified:** console clean, `validate_content.js` PASS, pools verified in-engine (15/200 random
  fen samples below −1.3 → maze-of-pools footing), roads stay dry.
- **Gemini:** overall layout "excellent"; SW fen "completely resolved… organic, irregular…
  looks excellent."
- **Verdict:** KEPT — the corner artifact is gone and the fen now has pools/murk/mud/density the
  before-shot simply lacks.
- **Capture harness note:** create ONE persistent capture renderer per page load — per-shot
  WebGLRenderers exhaust Chrome's context pool ("Context Lost") and textures render black.
- **Next (from Gemini's remaining-artifact list):** the snow regions read as stark rectangular
  "insets" — replace biome_snow's square blankets with grid-following snow cover (Whitmoor/
  Brynholt), then Brynholt's village on its NE coast.

### Pass 001 — MAP-DRIVEN REBUILD FOUNDATION (whole-world layout) — 2026-07-03 — KEPT
- **User decision this pass:** nuke the *terrain + layout* and rebuild map-driven; keep all kits,
  systems, and building modules and re-seat them. The old Veyhollow Keep (`castle.js`) is
  **retired** (not on the bible map; Wardenholm is the one castle). Friendly mode added first
  (`GameConfig.friendlyMode`, default ON, admin toggle) so review walks stop ending in death.
- **Target:** the whole bible-map layout at once — the map itself became data.
- **Changed:**
  - `tools/bake_worldgrid.html` (NEW) — bakes `Maps/Crafted Realms Map.png` into a 480×320
    biome-per-tile grid (anchor colors *measured* off the PNG; mode-filter melts icon/label
    noise; geo rules fix rock/scar ambiguity + building-cluster misreads). Regenerate any time.
  - `src/worldgrid.js` (NEW, generated) — the grid + `gridBiome(x,z)` sampler. Commons = (0,0).
  - `src/game2_world.js` — `terrainHeight` now reads the grid (biome base heights blended over a
    5-tile kernel + low-poly per-biome relief); rectangular 480×320 world, single landmass;
    `groundY` analytic over the grid; vertex colors keyed by biome; **the Wilderness Ditch**
    carved at z=−58 (dry floor −1.45: below walk line −1.2, above sea −1.6) with 3 gate
    causeways + hard colliders between them; water cells always flood (min −1.9).
  - `src/game1_data.js` — all ZONES re-anchored to map-true coords; `DITCH` const;
    `scarThreat` flipped north; PATHS re-traced from the map (3 ditch crossings align w/ gates).
  - `src/game4_ui.js` — Whitmoor Hold block relocated wholesale to the NW snow corner
    (−163,−105); `populateScarlands` rebuilt north of the Ditch; world map draws real biome
    colors + the Ditch; round minimap landmass = grid rect.
  - `src/wardenholm.js` anchor → (77,0) east of the Commons; `src/game5_main.js` boot drops
    `buildVeyhollowKeep`, undercrag exit re-seated; `index.html` retires castle.js, loads worldgrid.
- **Verified:** boot clean (no console errors), `validate_content.js` PASS, trench unwalkable +
  collider-blocked, gate causeway walkable (h≈0.68), Wardenholm bailey dry, friendly mode holds
  (stood among gravewights untouched).
- **Before → after:** `pass001_ditch_gate_before/after.png`, `pass001_scarlands_before/after.png`
  (same camera coords), `pass001_wilderness_gate.png` (the new gate), `pass001_worldmap_topdown.png`
  (whole world vs the bible map).
- **Gemini match:** **8/10 layout match vs the bible map** (previous world was never scored — it
  contradicted the map's geography outright: Scarlands south, Whitmoor NE, north half accidental
  ocean). Strongest matches called out: Veyhollow radial town, the Wilderness Ditch, Mirrorpond.
- **Verdict:** KEPT. The world layout now *is* the map: scar band + Ditch north, snow corners NW/NE
  (Whitmoor Hold rebuilt in the NW), autumn Emberwood W, Gloomfen SW, dunes + Saltreach E,
  Mirrorpond S, Tutor's Holm SE island, Wardenholm + moat E of the Commons.
- **Known debts (from Gemini + own eyes):**
  1. SW corner: the map's title-box mask fills as a stark rectangular water/swamp slab — author
     that corner by hand.
  2. Snow reads weak from altitude (blanket squares are hard-edged; biome tint under plaza).
  3. Gloomfen borders blocky from the fix-box; wants organic edge + its stilt village.
  4. Tutor's Holm island is tight (~34×18) — holm content needs a re-layout pass.
  5. Saltreach Port, Stonereach Bridge, the walled Commons ring, Brynholt village on its coast —
     all still to build/deepen.
- **Next:** SW corner terrain fix + Gloomfen organic pass, then the walled Veyhollow Commons ring
  (the map's most iconic town silhouette).
