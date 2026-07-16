# AGENTS.md — Crafted Realm

> ⭐ **FIRST, EACH SESSION: read `GUIDING_LIGHT.md`.** It's the one-page north star + anti-drift
> discipline (vision, the immutable "spine", verify-don't-assert, the Studio pipeline, current focus).
> This file below is the detailed engineering reference; the guiding light is what keeps us from
> silently undoing our own decisions.

OSRS-inspired browser RPG built in **Three.js**, served at `http://127.0.0.1:8777`. This file is
auto-loaded each session — read it before editing. Design canon lives in `STORY_BIBLE.md`,
`ROADMAP.md`, `OSRS_COMPARISON.md`, `VEYHOLLOW_DESIGN.md`.

## Architecture & file map
Plain **global `<script>` tags** (NOT ES modules) loaded in order from `index.html`:
- `src/game0_icons.js` — UI icon helpers
- `src/game1_data.js` — DATA: ITEMS, TIERS, SKILLS, XP_TABLE, NPC_TYPES, SHOPS, QUESTS, ZONES, PATHS
- `src/game2_world.js` — world build: terrain (`groundY`/`gy`), buildings, props, resources, `walkAnim`/`beastAnim`, `slideMove`, `collides`
- `src/game3_systems.js` — `Player` object, combat (`playerAttack`/`npcAttack`/`applyHit`, formulas), prayer, magic/`SPELLS`, `STYLE_DEFS`, `SPECIALS`, `BOSS_SCRIPTS`, projectiles
- `src/game4_ui.js` — `UI` object, HUD, tabs, `SaveGame`, `Bots`, input/raycast, tile FX overlays (`_tileFXLoop`), minimap
- `src/game5_main.js` — the loop: `update(dt)`/`animate()`, `computePath` (tile BFS), `orderWalk`, NPC AI, world timers, boot
- `src/proc_*.js`, `src/game_assets.js`, `src/game_editor.js`, `src/item_catalog.js` — procedural geometry, assets, Build Mode editor, item registry

## Critical constraints (these cause the most bugs)
- **Three.js r128** in-game (global script). Tools (`tools/*.html`) use **r160 ES modules** — any
  shared geometry must work in both.
- **Scope gotcha:** top-level `function`/`var` are reachable across files by name; top-level
  `let`/`const` are lexical globals (reachable by name, but **NOT on `window`** — so the browser
  `javascript_tool` can't see them). Confirmed globals usable from `javascript_tool`: `player`,
  `Player`, `scene`, `THREE`, `groundY`, `WORLD`, `SHOPS`, `ITEMS`, `SPELLS`, `UI`. The game's own
  functions (e.g. `orderWalk`, `worldTick`) are callable in-file but usually **not** on `window`.
- **1 world unit = 1 tile.** Movement is **4-directional (N/S/E/W) only — never diagonal.**
  `computePath` is a 4-dir tile BFS returning tile centres (no string-pulling).
- **Combat math + the XP curve are OSRS-exact** (`game3_systems.js` accuracy/max-hit; `game1_data.js`
  XP_TABLE). **Do not regress them.**
- **Never mutate shared `NPC_TYPES`** (e.g. `npc.t.hp`, `npc.t.speedTicks`) — it corrupts every NPC
  of that type. Store per-instance state on the instance (`npc._enraged`, `npc._sT`).
- **Items = 2D icons.** Inventory/ground item art are background-removed **Nano Banana 2D sprites**
  (`assets/icons/`); procedural 3D is only for world props + worn gear. (See `STORY_BIBLE.md`.)

## Dev workflow
- **The dev server (`python -m http.server 8777`) caches JS — hard-refresh (Ctrl+Shift+R)** to see
  edits, or it serves stale files. (To test on a phone it must run `--bind 0.0.0.0`.)
- **Verify in-browser** via the Codex-in-Chrome MCP: load the game, click/interact, **read console
  for errors**, and introspect the live Three.js scene with `javascript_tool` (this is our "engine
  sight"). After any change: hard-refresh → check `read_console_messages` for errors.
- **THE SMOKE GATE (run after every nontrivial change):** load `http://127.0.0.1:8777/?smoke=1`
  (`src/smoke.js`) — it drives the REAL login flow, waits for boot+settle, runs the structural suite
  (`tools/smoke_test.js`), a real computePath/orderWalk out-and-back, samples perf (FPS / worst frame /
  draw calls / tris / world-tick health) against `SMOKE_BUDGETS`, and records every console error from
  the first script. Read the verdict with `read_console_messages` pattern `\[SMOKE\]` (~30s after
  navigate); an on-screen PASS/FAIL badge also shows in screenshots. Background-tab runs skip
  FPS/draw-call checks (rAF is frozen there) — foreground the tab for a full perf reading. A saved
  adventurer is CONTINUED, never wiped. `window.SMOKE_ERRORS` records uncaught errors even without
  `?smoke=1`.
- **Visual review (do this for any visual/UI change):** capture the settled real game or Studio view,
  then perform and record a direct Codex review covering silhouette/proportion, shape hierarchy,
  color/material separation, reference-defining features, gameplay-camera readability, animation and
  interaction readability, and family consistency. Per the user's 2026-07-13 decision, no Gemini or
  other second-model visual review is required.
- **Secrets:** `GEMINI_API_KEY` / `HF_TOKEN` come from the Windows USER registry / env — **never
  hardcode, print, or commit them.** `tools/gemini_image.js` reads `process.env.GEMINI_API_KEY`.
- **Big risky refactors of the core loop** → do in a git **worktree agent**, but FIRST: **commit
  the work AND make `main` point to it.** Worktree isolation branches from **`main`** (the default
  branch), NOT your current branch — if you commit to a feature branch and leave `main` stale, the
  agent silently gets the OLD code (this burned two agent runs). After committing on a branch,
  `git branch -f main <branch>` to advance main, then spawn the agent. Give the agent a base-check
  guard ("confirm feature X exists or STOP"). Test, then merge.

## Conventions
- UI work goes through the `UI` object (`UI.chat`, `UI.refreshHud`, `UI.xpDrop`, etc.); player state
  on `Player`; world objects in `WORLD.*` arrays (`npcs`, `drops`, `clickables`, `interiors`).
- Procedural geometry uses the shared builder pattern `makeProcX(THREE, mat)` so game + tools render
  identical shapes.
- Art direction: **cozy 2007/OSRS, low-poly flat-shaded** — readable, warm, not hyper-real.

## Known tech debt
- **File size:** `game2_world.js` (2297), `game4_ui.js` (2105), `game3_systems.js` (1309) are far
  over the ~500-line target. **Prefer adding new systems as new files; split the big three when
  touching them** (the fixed-tick refactor is the natural moment to split `game5_main.js`).
- Gameplay QA now has a repeatable gate: the `?smoke=1` smoke run (see Dev workflow). Deeper
  flow coverage (quests, combat, banking end-to-end) still accrues there over time — extend
  `tools/smoke_test.js` / `src/smoke.js` when a regression slips past them.
  **Content data integrity IS gated:** `node tools/validate_content.js` headlessly executes
  `game1_data.js` (post `buildTieredGear`) and fails (exit 1) on any dangling drop/shop/quest
  item id, bad price/probability/quantity, unknown reward skill, missing boss `glb`/`script`, or
  broken tier generation. It also gates **combat-stat integrity** — every NPC must have finite,
  sane `level/hp/att/str/def/aBonus/sBonus/dBonus/speedTicks` and a derived `npcMaxHit` that is
  finite ≥ 1, and every item's `value/reqLvl/bonus` fields must be finite (weapons need a `style`
  + positive `speedTicks`) — so a malformed entry can't reach the OSRS-exact combat rolls as NaN.
  **Run it after any edit to items/tiers/NPCs/shops/quests** — it is the repeatable gate that lets
  content scale safely.
