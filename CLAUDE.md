# CLAUDE.md — Crafted Realm

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
- **Verify in-browser** via the Claude-in-Chrome MCP: load the game, click/interact, **read console
  for errors**, and introspect the live Three.js scene with `javascript_tool` (this is our "engine
  sight"). After any change: hard-refresh → check `read_console_messages` for errors.
- **Second visual opinion (do this for any visual/UI change):** an independent model catches blind
  spots one set of eyes rationalizes past. Capture a screenshot, then run
  `node tools/gemini_vision.js "<prompt>" <img.png> [<reference.png>]` (Gemini Vision, gemini-2.5-flash)
  for a critique or a 1–10 match-vs-reference score. Used this way it drove item quality 6.5→9.6.
  Use it as a gate on HUD/scene changes and to compare our renders to OSRS references (e.g. Veyhollow
  chunks vs Lumbridge). The planned smoke-test should pipe each key screen through it automatically.
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
- No full automated test harness yet — gameplay QA is manual via the browser MCP (load →
  interact → assert console clean). A repeatable smoke-test script is a planned add.
  **Content data integrity IS gated:** `node tools/validate_content.js` headlessly executes
  `game1_data.js` (post `buildTieredGear`) and fails (exit 1) on any dangling drop/shop/quest
  item id, bad price/probability/quantity, unknown reward skill, missing boss `glb`/`script`, or
  broken tier generation. It also gates **combat-stat integrity** — every NPC must have finite,
  sane `level/hp/att/str/def/aBonus/sBonus/dBonus/speedTicks` and a derived `npcMaxHit` that is
  finite ≥ 1, and every item's `value/reqLvl/bonus` fields must be finite (weapons need a `style`
  + positive `speedTicks`) — so a malformed entry can't reach the OSRS-exact combat rolls as NaN.
  **Run it after any edit to items/tiers/NPCs/shops/quests** — it is the repeatable gate that lets
  content scale safely.
