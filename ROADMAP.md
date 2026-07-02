# Crafted Realm — Oldschool Sprint Roadmap

Synthesis of research on 5 open-source OSRS clients/servers (RuneLite, rsbox, OpenRS2,
RuneJS, rsmod, 2009scape) + the plan to reach a chunk-based, hand-designed, editable world
with an oldschool feel. **We adopt architecture/concepts/math, never Jagex assets/cache/code.**

---

## A. Architecture decisions adopted from the research

### World model — the spine of everything
- **Tile → 8×8 chunk → 64×64 region** nested grid (the OSRS model, used by all of them).
- The **chunk (8×8 tiles) is our unit of editing, saving, and streaming.**
- Per chunk, keep **three independent data layers**:
  1. **terrain** — underlay (grass/sand/dirt), overlay (paths), height, tile flags
  2. **objects/locs** — sparse list `{defId, lx, lz, level, type, rot}` (NOT a dense grid)
  3. **spawns** — `{npcId, x, z, wanderRadius}` (kept separate from static scenery)
- **Definition vs placement split:** `defs/objects.json`, `defs/npcs.json`, `defs/items.json`
  keyed by id; placements only reference an id (re-skin globally, drive interaction menus).
- **Streaming:** keep a 5×5 (radius-2) chunk ring around the player loaded as `THREE.Group`s;
  unload the rest. World = `Map<"cx,cz", Chunk>`, lazily created.
- **Coordinate keys:** packed int `(level<<28)|(x<<14)|z` for fast hashing/saving.
- **Mutations as diffs:** store runtime changes (chopped tree→stump, opened door) as
  added/removed overlays over static chunk data — clean save/sync, never mutate base.

### Simulation — the oldschool feel
- **600 ms game tick** decoupled from the `requestAnimationFrame` render loop:
  fixed-timestep accumulator runs `worldTick()`; render **interpolates** entity positions
  between tick states for smoothness. *Foundational — build first of the sim work.*
- **Tile collision grid** (`Uint8Array`, bitflags: blocked / wall NESW / projectile / occupied),
  derived per chunk from terrain flags + object footprints.
- **BFS click-to-move pathfinding** on that grid (A* only if needed). This is the core
  "OSRS movement" sensation: 1 tile/tick walk, 2/tick run, pre-expanded waypoints.
- **Combat** (documented wiki formulas, our own numbers): two-stage accuracy roll then
  damage roll, resolved on ticks. Defence lowers hit *chance*, not damage.

### Content system — keep hundreds of entities maintainable
- **Data = JSON, behavior = JS modules, engine = stable core.** Never mix.
- **Declarative plugin/event registry** (RuneJS/2009scape pattern): content registers by id —
  `on('object:option', defId, 'Chop', handler)`, `on('npc:talk', id, handler)`. Auto-load a
  `content/` folder (Vite `import.meta.glob`). Adding an NPC = a data row + optional script,
  zero engine edits.
- **One item-container abstraction** reused by inventory / bank / shop / equipment.

### Interaction & HUD — the OSRS texture (much already exists here)
- ✅ Right-click "Choose Option" menu (have it) — make entries **priority-sorted**, top entry = left-click.
- **Hover text** top-left ("Action › Target (level)") updated each raycast. *Cheap, high-feel.*
- **Click markers** (yellow X walk / red X interact), **XP drop** numbers, **infobox timers**.
- **Minimap dots** colored by type, click-to-walk (have minimap); world-map via top-down render-to-texture.
- Optional later: **overlay/plugin architecture** (EventBus + `renderOverlay(ctx)` on a 2D layer).

### IP boundary (applies to everything)
Adopt: the grid math, tick, BFS technique, data architecture, UX patterns (public/community
knowledge). **Never** copy Jagex cache/`.dat2`/`m_`/`l_` files, models, textures, sprites,
sounds, names (RuneScape/Lumbridge/item & NPC names), XTEA keys, world layout, or verbatim
repo source. Our own art, names, ids, world, and file bytes — "oldschool feel," not OSRS content.

---

## B. Phased sprint plan

> **The live master checklist now lives in `GOAL.md` §15** (reconciled against the code, tagged by
> V1/V2/V3 milestone, and cross-checked against a 16-project private-server review in `GOAL.md`
> §12–14). The phases below are the original sprint framing, with status updated to match.

Each phase is shippable and reviewable. ★ = parallelizable across agents.

**Phase 0 — Art foundation (in progress)**
- [x] Procedural goblin + Nano-Banana skin texture (Path A pipeline proven)
- [x] Bogling sized to ~¾ player
- [x] Player + humanoid NPCs realized (character pipeline: 19 region-colored rigged GLBs + worn-gear GearFit; `CHARACTER_PIPELINE.md`)
- [ ] ★ Generate more creature skins + item icons via Nano Banana

**Phase 1 — Live editor (in progress)**
- [x] Build Mode MVP: palette, click-to-place, right-click remove, rotate/scale, grid overlay, save/load/export
- [ ] Ghost = real prop preview (not just a marker); snap-to-tile; multi-select; copy/paste
- [ ] Per-chunk save format (write placements into chunk JSON, not one flat blob)

**Phase 2 — Chunk world**
- [ ] ★ Chunk data model + `Map<"cx,cz",Chunk>` + 3 data layers (terrain/objects/spawns)
- [ ] ★ Chunk streaming ring around player; convert current world into authored chunks
- [ ] Editor: grab/move/clone whole chunks, add new chunks, paint terrain underlay/overlay
- [ ] Hand-design starter chunks (town square, bank, shops, woods, mine) — reviewed each

**Phase 3 — Oldschool sim** — largely landed (see GOAL.md §15)
- [x] 600ms tick (accumulator + backlog cap) — [ ] render interpolation still to layer on
- [x] BFS click-to-move — [ ] harden collision-flag grid + add bounded search radius
- [x] Tick-based combat (OSRS-exact rolls) + NPC AI/aggression + data-driven drop tables

**Phase 4 — Content framework**
- [ ] defs/*.json (objects/npcs/items) + def-vs-placement wiring
- [ ] Declarative content registry (`on('object:option',…)`) + auto-load `content/`
- [ ] One item-container abstraction (inventory/bank/shop/equipment)

**Phase 5 — Feel polish**
- [ ] Hover text, click markers, XP drops, infobox timers, priority-sorted menu
- [ ] World map (top-down render), minimap dot types

---

## C. How we streamline (agent strategy)
- **Research/audit/sweep work → parallel background agents** (as we just did for the 5 repos).
- **Independent build chunks → agents in worktrees** (e.g. one agent per starter-chunk design,
  or texture-generation batches) so they don't collide.
- **Architecture, integration, and review → main thread** (me), so the pieces fit and you
  review coherent results, not file dumps.
- **You review** via `localhost:8777` (hard-refresh) for feel, or images I push for quick glances.

Detailed per-system notes from each repo: see the research agent outputs (summarized above).

---

## D. Current priorities (2026-06-28) — toward a playable vertical slice

New direction from the user: a *deep, complete-feeling* OSRS-inspired game with a strong
foundation and room to iterate for months/years. World/story now formalized in
`STORY_BIBLE.md`. The game already has serious depth (full tiered gear, 15 skills, ~30
monsters, 9 shops, 4 quests, 12 zones, 2 bosses) — the work is to **surface it, make it
feel OSRS-tight, and extend it**. New threads from the user, slotted into the plan:

### D1. The OSRS "feel" core — ✅ LANDED (tile grid, hover/dest tile, path preview, tick, BFS)
The single highest-leverage, most-visible, most-foundational gap the user named directly:
- **Square tile system + visible grid.** Replace the current round click-marker with an
  OSRS-style **highlighted destination tile** + **drawn path preview** of where the
  character will walk. (Roadmap Phase 3 + Phase 5 click-markers.)
- **Tile-based movement on a 600ms tick** with render interpolation (Phase 3). Pragmatic
  first slice: overlay a tile grid on the *existing* world and move tile-by-tile, before the
  full chunk-streaming refactor.
- Everything else (combat timing, building placement, real estate) sits on this.

### D2. HUD / menu overhaul ★ (high-visibility, mostly independent)
User flagged the current overlays as messy: music button overlapping combat, run button
overlapping menus, missing tabs (no logout, etc.). Plan:
- Rebuild the sidebar as a clean **OSRS-style tabbed panel set** (Combat, Stats, Inventory,
  Equipment, Prayer, Magic, Friends, Settings, Logout, Music/Run toggles) with no overlap
  and consistent flow — "OSRS texture, but better."
- Audit *all* existing HUD functionality (`game4_ui.js`, 1883 lines) and fix flow.

### D3. Login screen redo
- New **Nano Banana background** (our own medieval art) + **animated brazier/totem fire**
  (the "fire on the statues") as a looping particle/sprite animation.
- Replace the current very-basic login with a proper title screen.

### D4. Item display in all 3 contexts
- Inventory icon ✅ (2D cozy sprites). **Ground item** = billboard the same sprite. **Worn
  gear** = gear-panel slot uses the 2D icon; armour *on the body* = procedural 3D worn mesh
  tinted per tier (one mesh, recolored across the ladder).

### D5. Tier extension (hybrid, per STORY_BIBLE §4)
- Add **Copper** (T0) and late/endgame tiers (**Whitsteel**, **Undercrag**) + prestige boss
  sets. Generate each as a *cohesive set* with the shared-material-anchor Nano Banana method
  (proven on the bronze set).

### D6. Map / ecosystem build-out (later, big)
- Analyze OSRS biome diversity (done in STORY_BIBLE §3) → hand-author square chunks per
  region → "better-than-OSRS" detailed buildings. Depends on D1's chunk work.

### D7. Real Estate / Construction (TABLED — STORY_BIBLE §7)
- Design captured; build deferred until the world/engine foundation lands.

### Recommended execution order
1. **D1** (tile feel core) — foundational + most-requested + most visible.
2. **D2** (HUD overhaul) — independent, big perceived-quality jump.
3. **D3** (login) — self-contained polish.
4. **D4 / D5** (item contexts + tier sets) — content scaling on the new foundation.
5. **D6 / D7** — large world + housing, once the base is solid.

