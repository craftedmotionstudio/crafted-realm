# Map Build-Out Log — building the world to match `Crafted Realms Map.png`

Every `/loop` pass logs ONE entry here. Newest at the top. The bible map
(`Maps/Crafted Realms Map.png`) is the layout target; `CLAUDE.md` art canon (cozy 2007/OSRS
low-poly flat-shaded — **not** hyper-real) is the render target. The map dictates *where and
what*; it does **not** change *how it's rendered*.

Scoring rule: treat the previous iteration as **100**. A pass is only kept if it lands at
**120+** — an *obvious* improvement in geometry/detail, lighting/materials, or atmosphere/life.
If it doesn't clearly beat the prior shot, **revert** and log why.

Screenshots live in `Maps/iterations/` as `passNNN_<location>_r<rung>_<before|after>.png`.

---

## DETAIL-PASS TRACKER (current phase — resume state, keep updated)

**Phase: DETAIL MODE.** Every labelled map location gets **≥5 kept, improving iterations**,
each building on the last, until it *obviously matches* the bible map. World stays
**DEPOPULATED** (no NPC/folk/creature placement — pass 011). Work the location with the
**fewest kept iterations** first (tiebreak = table order). 5 is the floor, not a cap.

**The 5-rung deepening ladder** (each rung = one kept iteration, built on the prior state):
1. **Silhouette** — right buildings/landmarks in the right spots; count & scale match the map.
2. **Structure & materials** — roofs, walls, biome-correct palette, terrain shaping.
3. **Props & clutter** — OSRS lived-in density (crates/barrels/fences/carts/signposts/resource nodes); something clickable every few tiles.
4. **Terrain & transitions** — ground palette, dressed paths, smooth biome blends at edges, water/cliff trim.
5. **Lighting & atmosphere** — torches/lamps/glow, biome fog/mood, ambient touches; end with a side-by-side vs the map.

| # | Location | Kept detail iterations | Status |
|---|---|---|---|
| 1 | Veyhollow Commons | 5 / 5 ✅ | passes 012-019 all KEPT; capstone vs map **10/10** (moat landed); square 9/10 vs Town_Square.jpg; minor debt: small-cottage interiors |
| 2 | Wardenholm Keep | 0 / 5 | — |
| 3 | Stonereach Bridge | 0 / 5 | — |
| 4 | Mirrorpond | 0 / 5 | — |
| 5 | Emberwood | 0 / 5 | — |
| 6 | Stonereach Quarry | 0 / 5 | — |
| 7 | Gloomfen | 0 / 5 | — |
| 8 | The Ashar Dunes | 0 / 5 | — |
| 9 | Saltreach Port | 0 / 5 | — |
| 10 | The Proving Grounds | 0 / 5 | — |
| 11 | Tutor's Holm | 0 / 5 | — |
| 12 | Brynholt | 0 / 5 | — |
| 13 | Whitmoor Hold | 0 / 5 | — |
| 14 | The Scarlands | 0 / 5 | — |
| 15 | The Undercrag | 0 / 5 | — |

> Counts start at 0 for detail mode even where a placement pass (006/007/009/010) already
> stands — those built the silhouette; detail mode now deepens each location 5+ rungs. A
> **reverted** pass does NOT increment the count. Advance to the next location only at ≥5 AND
> an obvious map match.

---

## Pass template (copy for each entry)

### Pass NNN — <Location> — rung <N/5: name> — <YYYY-MM-DD> — KEPT / REVERTED
- **Location & rung:** which labelled map location, which deepening rung (1–5), tracker now X/5.
- **Changed:** files touched, what was added/adjusted (built on the prior iteration, not from scratch).
- **Before → after:** `iterations/passNNN_<location>_r<rung>_before.png` → `..._after.png`.
- **Two-reviewer scores (BOTH required — the visual-AI review loop, 2026-06-28):**
  (1) Claude's own critique vs the reference: specific missing-detail list + N/10;
  (2) Gemini's independent critique + N/10 (`tools/gemini_vision.js`). Iterate until
  BOTH land ~8+; when they disagree, the LOWER score sets the next iteration's work.
- **Verdict:** obvious improvement? kept (→ increment tracker) because… / reverted (no increment) because…
- **Next:** same location's next rung, or the next location once ≥5 kept + obvious match.

---

<!-- Newest entries below this line, newest first -->

### Pass 019 — Veyhollow Commons — the moat — 2026-07-03 — KEPT
- **Target:** the last map gap on the Commons capstone — the river channel ringing the
  town's east and south on the bible map.
- **Changed:** `game2_world.js` terrainHeight — radial carve, band r 28.5–35.5 around the
  Commons, arc NE→WSW (`atan2` −0.55..2.95), mid-channel −2.7 with soft cosine banks.
  Fords stay dry ONLY where a gate road actually crosses (angle gate {0.04, 0.95, 1.55,
  2.45, 2.75} ± 0.20 AND pathDist<3) — the first cut exempted ANY nearby road, and the
  S/SW road fan shredded the channel into puddle dashes. The channel merges with
  Wardenholm's water on the east, exactly as the map draws the shared river.
- **Verified:** east/south/SW crossings all path (computePath reached); console clean;
  terrain-only change (no validator run needed).
- **Before → after:** `pass016_capstone_KEEP.png` → `pass019_moat_KEEP_topdown.png`.
- **Gemini:** **125 vs 100**; capstone vs the map: **8/10 → 10/10** — "faithfully
  reproduc[es] the wall ring, gates, fountain, market, and surrounding moat channel."
- **Verdict:** KEPT — Veyhollow Commons is DONE to the map.
- **Two-reviewer addendum (user check, 2026-07-03):** Claude's own structured critique
  scores this **8.5/10** vs Gemini's 10/10 — the east arc thins where the map's river
  runs fattest, banks read terraced, and the channel should flow in from the NE rather
  than start abruptly. Per the visual-AI review loop, the LOWER score rules: those three
  items are queued as a Commons touch-up pass alongside the small-cottage interiors.
- **Next:** location #2 on the tracker: **Wardenholm Keep** (rung 1/5 silhouette vs the
  map's castle: towers, keep mass, moat, bridge). Parked Commons debts: moat east-arc
  width/NE inflow, small south cottages' interiors.

### Pass 018 — Veyhollow Commons — follow-up: interiors that read furnished — 2026-07-03 — KEPT
- **Target:** the user-flagged debt — with roofs off, rooms read as bare brown boxes.
- **Changed:** `buildkit.js` — (a) NEW `_clutter(group,w,d,palette,seed)`: area-scaled
  furniture (floor((w·d−15)/2.4) extra pieces) on wall slots + floor-quadrant grid slots,
  keeping a cross of clear walk lanes to whichever wall holds the door; per-type palettes
  (house/shop/pub/bank/smithy/bedroom); every furnish() call gets it free. (b) The
  storey-2 slab sat ABOVE furniture bases — rugs were literally underneath the floor;
  slab dropped + plank-textured + lightened (and the texture key is `TEX.woodPlanks`,
  not `TEX.plank` — the first fix silently no-opped on that).
- **Debug trail (honest):** three "still sparse" iterations were misdiagnoses — the
  pieces existed (29 in the bank's upper room, verified by scene traversal); the real
  issues were the swallowing slab, the missing texture key, and small dark furniture on
  a huge dark floor.
- **Before → after:** `pass016_capstone_topdown_roofsoff.png` →
  `pass018_final_topdown_roofsoff.png` (+ `pass018e_bank_interior.png`).
- **Gemini:** **130 vs 100** — "significantly enhanced… distinct rugs, floor/wall clutter."
  Remaining: the small south cottages still read minimal — next interiors touch.
- **Verified:** console clean; no data change.
- **Verdict:** KEPT.
- **Next:** the Commons moat (terrain grid), then Wardenholm Keep (location #2).

### Pass 017 — Veyhollow Commons — follow-up: the grand buildings — 2026-07-03 — KEPT
- **Target:** user ask — the reference square's focal buildings are BIG. Bank of Veyhollow
  rebuilt as a grand two-storey stone hall (10×7, stone ground floor, plaster storey,
  ladder + furnished upstairs); the general store as a big two-storey trading house (9×6.5).
- **Verified:** plaza→door→interior paths for both; console clean; validator exit 0.
- **Gemini:** **125 vs 100** — "adds significant verticality… feels more like a central hub."
- **Files:** `veyhollow_town.js`. Shots: `pass017_bigbuildings_oblique.png`, `pass017_bank_street.png`.
- **Known debt (user-flagged, next pass):** interiors read SPARSE with roofs off — furnish
  presets don't scale furniture to room area; the big halls make it more visible. Richer
  interiors = next Commons work before moving locations.

### Pass 016 — Veyhollow Commons — rung 5/5: Lighting & atmosphere + capstone — 2026-07-03 — KEPT
- **Location & rung:** plaza lighting, then the ≥5-rung capstone vs the map. Tracker **5/5 ✅**.
- **Changed:** (a) `town_square.js` — 5 wrought lamp posts ringing the plaza (emissive
  lanterns + amber glow pools, the game's no-real-lights idiom); Gemini **135 vs 100**.
  (b) Capstone exposed the wall ring reading TORN from the air — `veyhollow_town.js` wall
  rebuilt: 28→56 short segments (narrow gates), water runs now march across the pond inlet
  on stone foundation piers, adjacent gate segments merge before dressing (no tower spam);
  wall caps darkened 0xafaa9e→0x8f8a80 so the ring reads CONTINUOUS from above
  (`game2_world.js`). Capstone score: 5/10 → **8/10** ("impressively captures the core
  layout"). (c) NEW FEATURE (user ask): **Settings → Roofs toggle** — `UI.toggleRoofs` in
  the settings pane; `makeBuilding` roofs registered in `WORLD.roofs`; the interior
  roof-lift tick now respects `WORLD.roofsOff`. Roofs-off is now part of pass verification.
- **Remaining map gap (Gemini):** the moat encircling the Commons on the map — a terrain
  grid feature, future pass.
- **Shots:** `pass016_commons_r5_oblique.png`, `pass016_capstone_KEEP.png`,
  `pass016_capstone_topdown_roofsoff.png` (the roofs-off interiors audit).
- **Verdict:** KEPT — Commons completes its 5-rung ladder.
- **Next:** richer interiors (user-flagged), then the Commons moat, then location #2:
  Wardenholm Keep.

### Pass 015 — Veyhollow Commons — rung 4/5: Terrain & transitions — 2026-07-03 — KEPT
- **Location & rung:** the town's edges — where the wall meets ground, roads meet gates,
  and the in-ring pond meets its banks. Tracker now **4/5**.
- **Changed:** (a) `game2_world.js` makeStoneWallRun + makeGateTower — grey stone-textured
  blockwork (0xc9c4b8 over TEX.stone) replacing the stark bare white; the whole ring now
  reads like the reference's masonry. (b) `veyhollow_town.js` wall loop checks BOTH
  segment endpoints for water, so no run floats over the pond. (c) `town_square.js`
  rung-4 block — road-toned gate aprons + plaza-stone spills through every gate; pond
  shoreline scan planting cattail reeds in the shallows, muddy sand lips and shore
  stones. `blob()` upgraded to TERRAIN-CONFORMING (rim vertices hug the ground) with a
  cliff guard (skip if rim spans >1.1 height — a fan on a steep bank shreds into shards,
  seen and fixed in-pass).
- **Bug found & fixed:** the shoreline never ran at first — `groundY` returns the DEPTH
  for water (−1.9), NOT null (null is off-map only); the memory note claiming otherwise
  was wrong and has been corrected. The "sand" in the first after-shot was actually a
  gate apron.
- **Before → after:** `pass015_commons_r4_pond_before.png` / `_gate_before.png` →
  `pass015e_pond.png` / `pass015_commons_r4_gate_KEEP.png` / `pass015e_oblique.png`.
- **Gemini:** **150 vs before's 100** — "improved textures on the wall, naturalistic
  ground transitions… transform the town from a bare prototype into a cohesive world."
- **Verified:** console clean; 32 reed stems live-counted; no data change.
- **Verdict:** KEPT — the town knits into its terrain now.
- **Next:** Commons rung 5/5 (lighting & atmosphere): lamp glow pools, plaza evening
  warmth, chimney smoke density, then the ≥5-rung side-by-side vs the map.

### Pass 014 — Veyhollow Commons — rung 3/5: Props & clutter — 2026-07-03 — KEPT
- **Location & rung:** the town square, rebuilt to the user's new style reference
  `Bible_References/Town_Square.jpg` (the OSRS town square). Tracker now **3/5**.
- **Changed:** NEW `src/town_square.js` — (a) organic pale-grey stone plaza (blob mesh,
  live-tuned to 0x878580) over a dirt fringe, sprawling amoeba-like via 8 tendril lobes
  toward the gates, mottled with soft grey patches, pebbles, and rim grass tufts;
  (b) the Hollow Well rebuilt as the quatrefoil fountain — rough stone ring, flat OSRS-blue
  water (MeshBasic so it never blows white), stone cross, four statue pillars, pedestal
  bowl + jet; (c) striped-canvas market stalls (CanvasTexture awnings: blue/white silver,
  red/white baker, green/white produce) replacing the flat canopies; (d) the bank went
  grey stone blockwork (`wall:'stone'`). `veyhollow_town.js` sheds its old well/patch/stall
  calls; bank booth moved OFF the doorstep tile (it was walling the door — found by the
  every-door path test).
- **Iterations inside the pass:** brown texture plaza (Gemini 6/10, "reads like a dirt
  patch") → flat grey + live colour tune (white water fixed) → expanded to the doorsteps
  + tendrils (7/10, "contained oval") → softened lobes → **Gemini 9/10**: "layout, dominant
  organic plaza, quatrefoil fountain and market stalls remarkably well-translated."
- **Before → after:** `pass014_square_after_oblique.png` (first cut) →
  `pass014_square_v6_oblique.png` / `pass014_square_KEEP_street.png`.
- **Verified:** console clean; validator exit 0; gate-to-gate + every-door pathing pass
  (the "cross-town" failures were bad test endpoints in the pond/wall, not regressions).
- **Verdict:** KEPT — the square finally reads like the reference's market hub.
- **Next:** Commons rung 4/5 (terrain & transitions) — or keep pushing the square if the
  user wants closer than 9/10.

### Pass 013 — Veyhollow Commons — rung 2/5: Structure & materials — 2026-07-03 — KEPT
- **Location & rung:** the cottages + every gable roof in the world, driven by direct user
  critique: "roofs do not look good… very cookie cutter… can't even walk into the
  buildings." Tracker 2/5 at this point.
- **Changed:** `game2_world.js` makeBuilding gable REWRITTEN — the 3-sided cylinder prism
  (60° monster slopes, wraparound UVs = garish chevron stripes, giant blank cap triangles)
  replaced with two real sloped planes at ~39° pitch, straight straw courses, a ridge
  beam, and timbered plaster gable ends (king post, collar, raking bargeboards). Benefits
  every gable in the world (services, Brynholt, Saltreach, the mill). `veyhollow_town.js`
  cottages upsized 4×3.6 → 5–6.5-tile OSRS footprints and DE-CLONED: a long-house, a
  two-storey, a stone cottage, hips among gables, chimneys with living smoke, varied
  palettes. Every pad re-probed clear (tall house shifted to −13.5,1 off the road).
- **Verified:** console clean; computePath walk-in test on ALL 13 town interiors —
  plaza→door and door→centre reached for 12/13 (the bank failure exposed the doorstep
  booth, fixed in pass 014).
- **Before → after:** `crit_cottage_street1/2.png` (user's view: blank orange slab wall,
  chevron roof, pancake-flat cottage) → `pass013_commons_r2_after_street2.png` /
  `_after_town.png`.
- **Verdict:** KEPT — the skyline reads grown, roofs read roofed, doors admit a player.

### Pass 012 — Veyhollow Commons — rung 1/5: Silhouette — 2026-07-03 — KEPT
- **Location & rung:** Veyhollow Commons, rung 1 (silhouette: building count & scale vs the
  map's dense circle). Tracker now **1/5**.
- **Changed:** `src/veyhollow_town.js` — six furnished cottages (Buildkit, varied timber
  palettes) fill the ring's quadrants; every pad probe-verified clear of roads (`pathDist`>4.2),
  water, and existing colliders (the first hand-picked spots failed 4-of-5 on exactly those —
  the scan found 42 valid pads, took 6 spread ones). Town now ~13 rooftops inside the wall,
  matching the map circle's density. Interiors 22→28 (all furnished, doctrine held). NO folk
  (depopulation law).
- **Before → after:** `pass012_commons_r1_before.png` / `_topdown_before.png` →
  `pass012_commons_r1_after.png` / `_topdown_after.png`.
- **Gemini:** **125 vs before's 100** — "more densely populated and visually substantial
  settlement, greatly improving its silhouette."
- **Verified:** console clean, validator PASS (no data change).
- **Verdict:** KEPT — the circle finally reads packed like the bible map's town.
- **Next:** Commons rung 2/5 (structure & materials: roof variety, stone-course walls on key
  buildings, plaza paving reads, terrain shaping inside the ring).

### Pass 011 — REPOPULATION ROLLED BACK (user decision) — 2026-07-03 — REVERTED
- **User decision:** "I don't think we're ready to repopulate the world yet." The world stays
  FULLY depopulated until an explicit green light. This supersedes the repopulation parts of
  passes 008 (Commons folk), 009 (Olun), and the in-flight 011 (Wardenholm garrison).
- **Changed:**
  - `src/wardenholm.js` — the garrison force-channel edit reverted before commit (staff stays
    suppressed by the global gate, as it has been since the wipe).
  - `src/veyhollow_town.js` + `src/oluns_mill.js` — the pass-008/009 placements remain in code
    as THE PLAN OF RECORD (posts + dialogue ids documented) but no longer use `spawnNpc.force`,
    so the closed `worldNpcSpawns` gate suppresses them. Re-peopling later = restoring the
    force channel around those blocks, region by region.
  - The /loop's standing law amended: **no NPC/folk placement at all** — passes focus on
    geography, buildings, terrain, dressing, atmosphere only.
- **Verified:** live census after reload — 0 friendlies, 0 world NPCs, 24 Menagerie exhibits
  (off-map review tooling, intentional). Console clean, validator PASS.
- **Next:** geography/deepening only — candidates: Gloomfen's stilt village silhouette
  (buildings only, no folk), the dunes camp structures, quarry crag dressing, holm island
  re-layout, snow-edge softening, or a Brynholt longship at the dock.

### Pass 010 — Saltreach Port — 2026-07-03 — KEPT
- **Target:** the map's last unbuilt named region: the SE harbour town on the bay inlet.
- **Changed:** `src/saltreach.js` (NEW): three furnished shore buildings (the Salt Exchange
  trade house, the Brine Barrel tavern, the harbour warehouse — salt-bleached timber,
  slate roofs), a long timber pier south into the bay with piles/mooring/crates/torch, a
  rowboat riding the harbour water, crate clusters + signpost. `game1_data.js`: ZONES.saltreach
  added (map-true anchor 232,48 — flattens the shore row, names the region, minimap label).
  First cut had a second pier half on grass and a boat buried in the bank — cut to one good
  pier (honesty rule: one clean win beats two awkward ones). NO NPCs (buildout law; the
  port's folk arrive in its repopulation pass).
- **Before → after:** `pass010_saltreach_before.png` (empty coast) → `pass010_saltreach_after.png`.
- **Verified:** console clean, `validate_content.js` PASS (new zone included).
- **Gemini:** **200 vs before's 100** — "transforms the empty coastline into a functional and
  characterful low-poly port, with nothing appearing broken."
- **Next:** every named map region now exists in-world. The build shifts to deepening +
  repopulating: Wardenholm's garrison back first (biggest existing build standing empty),
  then dunes camp, quarry, Gloomfen's stilt village, holm re-layout with Bram.

### Pass 009 — Olun's Mill at the map's windmill POI — 2026-07-03 — KEPT
- **Target:** the bible map's windmill (SW of the Commons, by Mirrorpond's arm) — re-siting the
  wiped legacy mill to its true spot, with its miller deliberately repopulated.
- **Changed:** `src/oluns_mill.js` (NEW): windmill at (−52,40), the miller's furnished cottage
  (Buildkit) beside the stream, fenced wheat rows + furrows, crates, signpost; Olun the Miller
  at his post via the force channel (world gate stays closed). `game1_data.js`: the mill lane
  spur off the Gloomfen road.
- **Before → after:** `pass009_mill_before.png` (empty meadow) → `pass009_mill_after.png`.
- **Verified:** console clean, validator PASS, Olun present in the live census.
- **Verdict:** KEPT — small honest win; empty meadow → the map's mill hamlet (~150 vs 100 by
  eye; no Gemini run — an empty-field-to-hamlet before/after isn't a judgement call).
- **Next:** Saltreach Port piers (the SE harbour town — the map's last unbuilt named region),
  then region-by-region repopulation continues (Wardenholm's garrison is the natural next).

### Pass 008 — the Commons repopulated (first region) + stray legacy dressing gated — 2026-07-03 — KEPT
- **Target:** the log's next: deliberate NPC repopulation of the walled Commons — plus a wipe
  leak found on the way: the gnarlgob war-camp (hut/tents/totem), hen-yard fences and warren
  mounds east of town had survived pass 005 (they sat outside the LEGACY_VILLAGE gate).
- **Changed:**
  - `src/veyhollow_town.js` — THE DELIBERATE REPOPULATION: 8 named folk at their posts via
    `spawnNpc.force` (the law-compliant channel — `worldNpcSpawns` stays false): Banker Tilly
    behind the counter, Merchant Saff in the store, Ferra at her forge, Sage Imbrel in the
    rune shop, Friar Aldous at the altar, Barkeep Dunn in the Wayfarer's Rest, Warden Maela
    on the plaza, Old Pell greeting at the north gate — plus 2 wanderers and a monk. All ids
    match the existing dialogue registry, so every soul talks.
  - `src/game4_ui.js` — the leaked legacy dressing gated under LEGACY_VILLAGE.
- **Verified:** console clean, validator PASS; live census exactly as designed — 8 friendlies +
  3 town NPCs, nothing else in the world; Menagerie exhibits untouched off-map.
- **After:** `pass008_commons_peopled.png` — the square reads alive (self-scored ~140 vs the
  empty pass-006 town; no Gemini run — the change is a census, verified live, not a visual
  judgement call).
- **Next:** Saltreach Port piers (SE harbour town geography), or Emberwood's mill re-sited to
  the map's windmill spot; NPC repopulation continues region-by-region as each gets its pass.

### Pass 007 — Stonereach Bridge — 2026-07-03 — KEPT
- **Target:** the map's named bridge POI south of the Commons — and a real bug: the Mirrorpond
  arm (grid water) cut the south road dead at z≈64 (ground −1.9, unwalkable).
- **Changed:**
  - `src/game2_world.js` — a `causewayLift` berm carries the road across the arm (walking
    verified −1.90 → −0.33 across the whole crossing). The doctrine bridge pattern
    (MAP_PIPELINE: "bridges = the current causeway pattern").
  - `src/stonereach_bridge.js` (NEW) — plank deck over just the water gap, rail posts + beams
    with REAL thin colliders (you stay on the deck), piles into the water, torches both ends,
    "Stonereach Bridge" signpost. First cut spanned the whole berm and buried its planks at
    the high ends — shortened to the gap. No NPCs (buildout law).
- **Before → after:** `pass007_bridge_before.png` (road dead-ends into the gully) →
  `pass007_bridge_after.png` + `pass007_bridge_south.png`.
- **Verified:** console clean, `validate_content.js` PASS, crossing walkable end-to-end.
- **Gemini:** **140 vs before's 100** — "transforms an impassable dead-end into a navigable
  and visually engaging path."
- **Loop cadence note:** the /loop now runs on a 15-minute cron (user request), job 04628c73.
- **Next:** deliberate NPC repopulation of the Commons (the first region to get its folk
  back — shopkeepers/banker/townsfolk placed by hand inside the new walls), or the Saltreach
  Port piers if the user prefers more geography first.

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
