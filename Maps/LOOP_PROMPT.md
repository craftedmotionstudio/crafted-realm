# The map build-out `/loop` prompt

Paste the block below after `/loop` (no interval — let Claude self-pace each pass). Reusable:
just run it again anytime to resume the build-out.

---

```
/loop DETAIL MODE — deepen every labelled location on the bible map (Maps/Crafted Realms Map.png) until each obviously matches, giving every location AT LEAST 5 kept, improving iterations that each build on the last.

CONTEXT TO LOAD FIRST (every pass, before touching anything):
- Maps/Crafted Realms Map.png — the match target: every region's buildings, biome, roads, POIs (bank/store/smith/furnace/altar/cooking/magic/quest/dungeon/combat/mining/woodcutting/fishing/windmill/arena/boat).
- CLAUDE.md — hard constraints: Three.js r128, cozy 2007/OSRS LOW-POLY FLAT-SHADED art (NOT hyper-real — the map's painterly look is a LAYOUT reference only, never a render target), 1 unit = 1 tile, 4-dir movement, do NOT regress combat math/XP, never mutate NPC_TYPES, hard-refresh (Ctrl+Shift+R) after edits or the server serves stale JS.
- STORY_BIBLE.md §3 + MAP_PIPELINE.md + VEYHOLLOW_DESIGN.md — geography, the build recipe/doctrine (deterministic kits + hand placement, walk paths first), the per-chunk checklist, and the landmark detail blueprint (MAP_PIPELINE §8: 8–15 objects per room, examine text, the lived-in checklist).
- Maps/MAP_BUILD_LOG.md — prior passes AND the DETAIL-PASS TRACKER table (per-location kept-iteration counts) = your resume state.

STANDING LAW: the world stays DEPOPULATED — NO NPC / folk / creature placement (pass 011). Detail passes are geometry, buildings, terrain, dressing, lighting, and atmosphere ONLY.

TARGET SELECTION (one location at a time): pick the labelled location with the FEWEST kept detail-iterations in the tracker (tiebreak by tracker order: Veyhollow Commons, Wardenholm Keep, Stonereach Bridge, Mirrorpond, Emberwood, Stonereach Quarry, Gloomfen, The Ashar Dunes, Saltreach Port, The Proving Grounds, Tutor's Holm, Brynholt, Whitmoor Hold, The Scarlands, The Undercrag). Stay on that location until it has ≥5 kept iterations AND obviously matches the map — only then advance. 5 is the floor, not a cap.

THE 5-RUNG DEEPENING LADDER (each rung = ONE kept iteration built ON TOP OF the prior in-world state — NEVER rebuild from scratch): (1) SILHOUETTE — the right buildings/landmarks in the right spots, count & scale matching the map. (2) STRUCTURE & MATERIALS — roofs, walls, biome-correct palette/materials, terrain shaping. (3) PROPS & CLUTTER — the OSRS lived-in density (crates/barrels/fences/carts/signposts/resource nodes), something clickable every few tiles. (4) TERRAIN & TRANSITIONS — ground palette, dressed paths, smooth biome blend at the edges, water/cliff trim. (5) LIGHTING & ATMOSPHERE — torches/lamps/glow, biome fog/mood, ambient touches; end with a side-by-side vs the map. Deepen further past rung 5 if it still doesn't match.

EACH PASS:
1. Read the tracker; pick the target location + its next unbuilt rung.
2. Make ONE improving change that BUILDS ON the location's current state (per the pipeline doctrine: kit + generators for the repetitive 90%, hand placement for the identity 10%; interiors non-negotiable; every structure states a purpose).
3. Verify: start the dev server (python -m http.server 8777) if not running, load http://127.0.0.1:8777 in the Claude-in-Chrome MCP, hard-refresh, confirm read_console_messages is clean; if data changed run node tools/validate_content.js (must exit 0).
4. Screenshot the target to Maps/iterations/passNNN_<location>_r<rung>_after.png; keep the location's prior shot as _before.png.
5. Score it: treat the PREVIOUS state of THIS location as 100 — this pass must land 120+ (obviously richer geometry/detail, better materials/lighting, more atmosphere, WITHIN the low-poly style AND closer to the map). Open the bible map + before/after side by side and run node tools/gemini_vision.js "<critique / match-vs-map prompt>" passNNN_<location>_r<rung>_after.png "Maps/Crafted Realms Map.png" for an independent second opinion.
6. KEEP only if the improvement is obvious AND closer to the map — then INCREMENT this location's tracker count. If it is not clearly better, REVERT it (git checkout / editor undo) and retry the rung differently — a reverted pass does NOT count toward the 5.
7. Log the pass in Maps/MAP_BUILD_LOG.md using the template (location, rung, files, before→after, gemini scores, kept/reverted + reason, tracker now e.g. 3/5, next target) AND update the tracker table's count/status.

Small, honest, incremental — one obvious deepening win per pass, always building on the last. Never claim an improvement the side-by-side doesn't show. Stop and surface the blocker if the console can't be made clean or validate_content.js fails and can't be fixed in-pass.
```

---

**Tips**
- Placement is done — this is the DETAIL phase. Every labelled location earns **≥5 kept,
  improving iterations** (the 5-rung ladder), each built on the last, until it matches the map.
- The tracker table in `MAP_BUILD_LOG.md` is the resume state — the loop always continues the
  lowest-count location. Re-run this same command anytime to pick up where it left off.
- World stays **depopulated** — detail passes touch geometry/terrain/dressing/lighting only, no NPCs.
- `Maps/iterations/` is scratch; add it to `.gitignore` if you don't want the shots committed.
- If Gemini scoring stalls (missing `GEMINI_API_KEY`), the loop should fall back to an explicit
  side-by-side self-critique and still log a keep/revert decision.
- 5 is the floor. If a location still doesn't match the map after 5 rungs, keep deepening it
  before advancing.
