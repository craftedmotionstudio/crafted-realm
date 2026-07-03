# The map build-out `/loop` prompt

Paste the block below after `/loop` (no interval — let Claude self-pace each pass). Reusable:
just run it again anytime to resume the build-out.

---

```
/loop Build out the Crafted Realms world to match the canonical bible map at Maps/Crafted Realms Map.png, one focused pass at a time.

CONTEXT TO LOAD FIRST (every pass, before touching anything):
- Maps/Crafted Realms Map.png — the layout target: every region's position, biome, roads, the Wilderness Ditch, and POIs (bank/store/smith/furnace/altar/cooking/magic/quest/dungeon/combat/mining/woodcutting/fishing/windmill/arena/boat).
- CLAUDE.md — hard constraints: Three.js r128, cozy 2007/OSRS LOW-POLY FLAT-SHADED art (NOT hyper-real — the map's painterly look is a LAYOUT reference only, never a render target), 1 unit = 1 tile, 4-dir movement, do NOT regress combat math/XP, never mutate NPC_TYPES, hard-refresh (Ctrl+Shift+R) after edits or the server serves stale JS.
- STORY_BIBLE.md §3 + MAP_PIPELINE.md + VEYHOLLOW_DESIGN.md — geography, the build recipe/doctrine (deterministic kits + hand placement, walk paths first), and the per-chunk quality checklist.
- Maps/MAP_BUILD_LOG.md — what prior passes did and what to target next.

EACH PASS:
1. Pick ONE target that moves the world closer to the map (a region's position/biome, a road, the Wilderness Ditch, a landmark, a town cluster). Prefer continuing the last pass's thread; if a region is already placed, deepen its detail/life rather than starting a new one.
2. Make the change following the pipeline doctrine (kit parts + generators for the repetitive 90%, hand placement for the identity 10%; interiors are non-negotiable; every structure states a purpose).
3. Verify: start the dev server (python -m http.server 8777) if not running, load http://127.0.0.1:8777 in the Claude-in-Chrome MCP, hard-refresh, and confirm read_console_messages is clean. If data changed, run node tools/validate_content.js (must exit 0).
4. Screenshot the target area (top-down for layout work, in-world for detail/atmosphere) and save to Maps/iterations/ as passNNN_<target>_after.png. Keep the previous pass's shot as _before.png.
5. Score it: treat the PREVIOUS iteration as 100 — this pass must land at 120 or better (obviously richer geometry and detail, better lighting and materials, more atmosphere and life, WITHIN the cozy low-poly style). Open the bible map and the before/after side by side and run node tools/gemini_vision.js "<critique or match-vs-map score prompt>" passNNN_<target>_after.png "Maps/Crafted Realms Map.png" for an independent second opinion.
6. KEEP the change only if the improvement is obvious (better than the before shot AND closer to the map). If it isn't clearly better, REVERT it (git checkout / editor undo) and note why.
7. Log the pass in Maps/MAP_BUILD_LOG.md using the template there: target, files changed, before→after screenshots, gemini scores, kept/reverted + reason, and the next target.

Keep passes small and honest. One obvious win per pass beats a big risky rewrite. Never claim an improvement the side-by-side doesn't show. Stop the loop if the console can't be made clean or validate_content.js fails and can't be fixed in-pass — surface the blocker instead of looping on a broken build.
```

---

**Tips**
- First few passes should nail *placement* (regions in their map positions, roads, the Ditch)
  before chasing *polish* — you can't score "more atmosphere" on a region that isn't there yet.
- `Maps/iterations/` is scratch; add it to `.gitignore` if you don't want the shots committed.
- If Gemini scoring stalls (missing `GEMINI_API_KEY`), the loop should fall back to an explicit
  side-by-side self-critique and still log a keep/revert decision.
