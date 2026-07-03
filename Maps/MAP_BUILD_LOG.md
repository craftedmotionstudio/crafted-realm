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
