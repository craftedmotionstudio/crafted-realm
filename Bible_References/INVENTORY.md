# Reference Inventory (the Reference Inventory Rule, PIPELINES.md)

## ⏳ BUILT + IN-GAME, GATED (reference-loop pass 1–2, 2026-07-03 — 8 parallel agents)
Each was BUILT procedurally, PLACED in-game, loads with a CLEAN console (verified in-browser). Gating
pipeline SOLVED (receiver `scratchpad/recv2.py` :9098 + in-page canvas capture → `gemini_vision.js`).
**Gemini noise-drift confirmed** — rocks/fallen_tree scored "perfect / indistinguishable from OSRS"
descriptively, then 7.5 / 6.0 numerically on the SAME image; it kept returning prose not numbers
("exact 3D model", "instantly recognizable as Draynor", "they ARE OSRS assets"). Gemini's NUMERIC gate
is UNUSABLE here → per the escape hatch, **Claude-eye is the operative reviewer** (Gemini prose as
corroboration). **PROMOTED to Complete/ 2026-07-03 (pass 2):** Ruins, Fence, Crates+More, Buggy,
RocksToMine, Fallen_Tree — all strong Claude-eye + positive Gemini prose (user may veto/revert).
**STILL QUEUED:** Port+Dock (modest jetty, railings unclear — cleaner hero + verify), Beds+Torches
(interior capture blocked by roof occlusion; torch flame IS animated). Scores:
| Reference | Gemini | Claude-eye | Verdict |
|---|---|---|---|
| Ruins.jpg | 10 | strong (chunky columns/walls/moss; stone a touch bright) | best of batch — user call to promote |
| RocksToMine.jpg | 7.5 (glowing on 1st pass) | good faceted boulders + veins | noise — user eyes |
| Crates+More.jpg | 9 | good barrels/sacks/crates | close |
| Buggy.jpg | 9 | good handcart (colors a hair vibrant per Gemini) | close |
| Fence.jpg | 9 | strong wrought iron, confirmed in-game | close |
| Fallen_Tree.png | 6.0 (glowing on 1st pass) | good toppled trunk | noise — user eyes |
| Port+Dock.jpg | 5 | LOW — capture likely framed buildings not the jetty | RE-SHOOT / verify placement |
| Beds+Torches.jpg | — | capture came back dark/blank (interior+roof) | RE-SHOOT (roof-lift interior angle) |
| Reference | File | Placement | Claude-eye |
|---|---|---|---|
| RocksToMine.jpg | `makeRock` upgrade (game2_world.js) | ALL mining rocks world-wide (quarry/undercrag) | faceted boulder + ore veins/flecks + dirt base — big improvement over the old blob |
| Ruins.jpg | `src/prop_ruins.js` | Scarlands (walls/arches/columns/rubble) + Commons NW rubble row | weathered grey masonry family, reads OSRS |
| Crates+More.jpg | `src/prop_crates.js` | Commons market, Saltreach, Brynholt docks | barrels + sacks + stacked crates, warm wood/burlap |
| Beds+Torches.jpg | `src/prop_beds_torches.js` | inn/cottage interiors + wall torches (ANIMATED flame via WORLD.fires) | beds + flickering wall torches |
| Buggy.jpg | `src/prop_buggy.js` | Commons market/store, Saltreach, Olun's Mill | planked handcart, spoked wheels, pull-shafts |
| Fence.jpg | `src/prop_iron_fence.js` | wrought-iron fence + gate ringing the Bank of Veyhollow | **visually confirmed in-game — reads as OSRS black wrought iron, pointed pickets, ornate gate** |
| Fallen_Tree.png | `src/prop_fallen_tree.js` | Emberwood, Gloomfen, Scarlands | toppled trunk + root disc + broken branches, per-zone palette |
| Port+Dock.jpg | `src/prop_dock.js` | Saltreach Port (railed T-jetty) + Brynholt | planked pier + railings + pilings + bollards + ladder |



Every visible object per reference → have / missing → pipeline → status.
Bar: both reviewers ≥9.5/10 per modeled item (user RE-RAISED from 9.0, 2026-07-03 — quality dip).
Escape hatch: user eyes outrank Gemini when it noise-drifts/contradicts pixels.
Finished references move to `Complete/`. Folder checked EVERY loop pass.
Anything that moves in reality ships ANIMATED (flags, flames, sails).

## COMPLETE ✅
- `Complete/Stall.jpg` — stall.glb live (ALL stalls world-wide: square trio + `makeStall` upgraded)
- `Complete/Ladder.jpg` — parametric ladder builder (world-wide)
- `Complete/Tree1.jpg` — tree_oak.glb v3 (ragged notched tiers, flat apexes, olive palette) on all ~94 world oaks; Claude 9.5, Gemini noise-drifted 3rd time (4/10 w/ pixel-false claims) — user eyes pending
- `Complete/Tree2.jpg` — tree_young.glb v2 (two-blob crown, pale trunk) mixed ~35% of normal trees; **Claude 9.5 + Gemini 10/10 — CLEAN PASS**
- `Complete/Evergreen_Tree.jpg` — tree_evergreen.glb v5 (layered drooping conifer, sharp apex, snow flecks) REPLACES the procedural snow pines in the north; Claude 9.0 (silhouette+apex nailed), Gemini flip-flopped green light↔dark 3× + unfixable "flecks not facets" flat-shade nit → escape hatch, user eyes
- `Complete/Ironwood_Tree.webp` + `Complete/Mahogany_tree.webp` + `Complete/Rosewood_Tree.jpg` — the HARDWOOD FAMILY (tree_ironwood/mahogany/rosewood.glb v2), one shared domed-canopy recipe: Ironwood = triple rounded dome + dead spikes + mauve trunk, Mahogany = single dominant bell-dome + pale tan trunk, Rosewood = twin pointed tents + dark trunk. Placed as a higher-tier woodcutting stand deep in Emberwood (own logs, respawn 14). Claude 9.0 (distinct silhouettes match refs in-game); Gemini nits all flat-shading (angular facets, "no fringe" where fringe exists) → escape hatch
- `Complete/Closed Door.jpg` + `Complete/Open Door.jpg` — `procDoorPanel` shared builder (vertical planks on a dark backing so seams read, proud frame border, iron dumbbell latch, warm tan oak) REPLACES the old single-box door on ALL 27 doors world-wide (asset-replacement rule); open/close swing + colliders unchanged. Claude 9.0; Gemini 7.5→6.5 (misread the 5 planks as "2 sections" off the 3/4 angle + shadowed frame) → escape hatch. Green trellis windows in the ref already exist on our stone walls.
- `Complete/Fence+Flowers.jpg` — `makeFence` upgraded (chunky posts + SHARP pointed pyramid caps + two rails, warm brown) — applies to EVERY fence world-wide; + new `makeGardenPlot(cx,cz,r)` helper (rail-fence ring, tilled soil bed, flowers + bushes, entry gap) placed by a cottage in Veyhollow Commons. **Claude 9.0 + Gemini 10/10 — CLEAN PASS.** ⚠ NOTE: active town dressing lives in `veyhollow_town.js` — `populateMainland()` in game4_ui is DEAD (`LEGACY_VILLAGE=false`, wiped in the map-driven rebuild). Fills the Town_Square.jpg "fenced garden plots" gap.

## STILL QUEUED (fence family)
- `Fence.jpg` — the BLACK WROUGHT-IRON picket fence + ornate gate on a stone kerb (a separate asset from the wood rail fence). Queued.

## ASSET REPLACEMENT RULE (user, 2026-07-03 pm)
When a modeled asset ships, EVERY old procedural instance of that asset type is replaced
world-wide (trees→tree_oak.glb via makeTree; stalls→stall.glb via makeStall+town_square;
fountains→fountain.glb incl. Wardenholm; doors will follow when the door model lands).
Different species stay separate (snow pines keep their conifer builder until a pine model exists).

## NEW BATCH (added 2026-07-03 pm — pending full enumeration, queued in order)
| Reference | Track | First read |
|---|---|---|
| Cake_Stall.jpg / Gem_Stall.jpg / EmptyStall+FurStall.jpg | Prop | stall VARIANTS — reuse stall.glb base, per-trade counters/goods |
| Bank.jpg / Bank Basement.jpg | Kit + Prop | bank interior style, vault/basement (plane -1) |
| Anvil_Building_For_Smithing.jpg | Kit + Prop | smithy building + anvil set |
| Grass.jpg | Terrain | ground tuft/texture treatment |
| Windows.jpg | Kit | the green trellis window style (feeds General Store pass) |
| Town2.jpg | Scene | second town-scene enumeration |
| UI_*.jpg (~17 screens) + User Interface/ | **UI TRACK** (CSS/HUD, not 3D) | full OSRS interface overhaul — needs its own workstream |

## NEWER BATCH (found 2026-07-03 eve folder check — queued after current)
| Reference | Track | First read |
|---|---|---|
| Tree2.jpg | Prop | small young tree (NEXT in queue) |
| Evergreen_Tree.jpg / Ironwood_Tree.webp / Mahogany_tree.webp / Rosewood_Tree.jpg | Prop | tree FAMILY — reuse tree_oak authoring recipe w/ per-species silhouettes/palettes (evergreen also replaces biome_snow pines) |
| Evil_Tree.png / Fallen_Tree.png | Prop | evil tree (character-like, maybe animated) + fallen log set piece |
| Fence.jpg / Fence+F;pwers.jpg | Kit | wooden fence runs + flowerbed dressing |
| Fountain_Option2.jpg | Prop | alternate fountain style — compare vs current fountain.glb, user pick |
| Port+Dock.jpg / RowBoat.jpg | Kit+Prop | docks (Saltreach!) + rowboat prop |
| RocksToMine.jpg | Prop | mining rock style pass (ours are plain blobs) |
| Ruins.jpg | Prop | ruined wall stubs (also feeds Town_Square rubble row) |
| Beds+Torches.jpg | Prop | bed styles + WALL TORCHES (animated flame per animation rule) |
| Crates+More.jpg | Prop | crate/barrel/sack dressing variety |
| Buggy.jpg | Prop | handcart/buggy (matches Character.jpg background cart) |
| DragonDagger_Equiped.jpg / Runes_In_Inventory.jpg | UI TRACK | equip render + rune icon set |

## Stall.jpg
| Item | Have? | Pipeline | Status |
|---|---|---|---|
| Market stall (posts, planked counter, sagging striped canvas) | ✅ NEW `assets/models/stall.glb` | Prop | Claude 9.5 — Gemini gate noisy (fell 6→3 w/ pixel-false claims); AWAITING USER EYES |
| Gravel path / grass tufts (background) | ✅ (plaza tendrils, tufts) | — | done |

## Town_Square.jpg
| Item | Have? | Pipeline | Status |
|---|---|---|---|
| Quatrefoil stone fountain | ✅ `fountain.glb` | Prop | done (v2 scrolling water) |
| Market stalls (striped canvas) | ✅ `stall.glb` | Prop | see Stall.jpg row |
| Grey-stone buildings, green trellis windows | ⚠️ partial (bank is stone; trellis windows MISSING) | Kit | queued — General Store pass |
| Big leafy trees | ⚠️ have procedural `makeTree` (weak vs ref) | Prop (Hunyuan) | queued — Tree1/Tree2 |
| Fenced garden plots (green fenced squares) | ❌ | Kit/Prop | queued |
| Rubble / ruined wall stubs | ❌ | Prop | queued |
| Street lamp posts | ✅ (pass 016 lamps) | — | done |
| NPCs / players | ⏸ depopulation law | NPC | on hold until green light |

## General Store.jpg
| Item | Have? | Pipeline | Status |
|---|---|---|---|
| White stone-block lower walls + tan plaster | ❌ (our walls are timber/plaster) | Kit | queued — store style pass |
| Green trellis/leaded windows | ❌ | Kit | queued |
| Tall shop shelving w/ goods (bottles, jugs, plates) | ⚠️ have plain `shelf`; goods variety missing | Prop | queued |
| Crates (stacked, stenciled) | ✅ crate + crate.glb | — | done |
| Shop counter | ✅ counter piece | — | done |
| Stools | ✅ | — | done |
| Step-ladder (freestanding A-frame) | ❌ (queued Ladder.jpg is wall ladder) | Prop | queued |
| Hanging sacks/bags on walls | ❌ | Prop | queued |
| Hanging candle sconce | ⚠️ candle exists; hanging variant missing | Prop | queued |
| Wall planters/hanging baskets (exterior) | ❌ | Prop | queued |
| Interior door (wood, gold handle) | ❌ (our doors are plain slabs) | Prop | queued — Closed/Open Door.jpg |
| NPCs (shopkeeper, customers) | ⏸ depopulation law | NPC | on hold |

## Ladder.jpg
| Item | Have? | Pipeline | Status |
|---|---|---|---|
| Wooden rung ladder (round rails/rungs) | ✅ NEW parametric builder in planes.js (every ladder world-wide upgraded) | Prop | Claude 9.5; Gemini geometry "perfect" then noise-drifted 8→6 w/ pixel-false colour claim; AWAITING USER EYES |
| Blue patterned rug beneath | ❌ | Prop | queued |
| Monk NPC | ⏸ depop law | NPC | on hold |

## Closed Door.jpg / Open Door.jpg
| Item | Have? | Pipeline | Status |
|---|---|---|---|
| Plank door w/ frame + gold handle (closed + open states) | ⚠️ makeBuilding has working doors, plain slab look | Prop | queued — upgrade panel to reference |

## Tree1.jpg / Tree2.jpg
| Item | Have? | Pipeline | Status |
|---|---|---|---|
| Big layered-canopy oak (Tree1) | ⚠️ procedural makeTree weak | Prop (Hunyuan) | queued next after ladder |
| Small young tree (Tree2) | ❌ | Prop (Hunyuan) | queued |

## Character.jpg
| Item | Have? | Pipeline | Status |
|---|---|---|---|
| Elder in blue/gold coat | ❌ | NPC Pipeline | queued (concept→Hunyuan→crpipe rig) |
| Wooden handcart w/ sacks (background) | ❌ | Prop | queued |

## ⏳ PASS-2 BUILDS — IN-GAME, GATE PENDING (2026-07-03)
Built + merged + load clean (meshes probe-confirmed). Gating deferred: per-asset screenshot FRAMING
needs care — a first capture pass mis-framed these (caught landscape/water, not the target), and Gemini
prose confirmed it. Re-shoot each tight on the asset next pass, then promote.
| Reference | File | Placement |
|---|---|---|
| Grass.jpg | `src/prop_grass_tufts.js` | grass-biome scatter (400 clumps, 1 merged mesh/draw call) |
| Anvil_Building_For_Smithing.jpg | `src/prop_smithy.js` | Stonereach smithy yard — anvil/forge(animated coals)/bellows/quench/rack/ingots |
| Cake_Stall.jpg / Gem_Stall.jpg / EmptyStall+FurStall.jpg | `src/prop_stall_goods.js` | dresses market stalls per trade (baker→cake, silver→gem, spice→fur) |
| Bank.jpg / Bank Basement.jpg | `src/prop_bank_interior.js` | Bank of Veyhollow hall — counter/booths/ledger shelves/vault chests/deposit boxes/blue rug |

## ⚠ PASS-2 PLACEMENT PROBLEM (2026-07-03, found on gating)
Gating the 4 pass-2 builds revealed placement issues — NOT promotable until fixed:
- prop_smithy anvil + prop_stall_goods found at world (-155,-103)/(-158,-100) = **Whitmoor**, NOT the
  intended Stonereach/Commons (agents used zone-local/approx coords; no 'stonereach' zone exists —
  Veyhollow forge is near Commons 0,0). prop_bank_interior meshes NOT found in scene at all.
- ROOT CAUSE: headless agents can't verify placement; their coords need an in-browser fix pass that
  queries real world positions (e.g. the Veyhollow forge/bank building actual coords) and re-anchors.
- These 4 (grass/smithy/stall/bank) stay QUEUED. They are a DEBUG task (fix anchors), not new builds.
