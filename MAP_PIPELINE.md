# Crafted Realm — Map & Building Pipeline

> **What this is.** The repeatable method for creating the world: terrain, buildings,
> multi-storey interiors, caves, whole villages — to OSRS's level of development, our own IP.
> Companion docs: `VEYHOLLOW_DESIGN.md` (the starter-town design brief + per-chunk checklist),
> `LUMBRIDGE_CASTLE.md` (the hand-built castle precedent), `STORY_BIBLE.md` (where every
> location must fit), `GOAL.md` (why), and **`Maps/Crafted Realms Map.png`** (the canonical
> top-down world layout — every region's position, biome, and POIs; the whole world must be
> built to match it). Research grounded in RuneLite/OpenRS2/rsmod cache
> internals, RSPSi editor workflows, and modular-kit level-design practice — structure and
> concepts only, never Jagex data or assets.

---

## 1. Doctrine (settled — three independent confirmations)

**AI generates assets; deterministic kits + human intent build the world.**
Every attempt at AI *scene assembly* we studied failed the same way — misplaced objects,
wrong rotations, "not usable" (two of our transcript sources tried and abandoned it; our own
prop pipeline reached the same verdict). What works, proven by OSRS itself, by the 72-hour
game build, and by our castle:

1. **A concept/reference image first** — extract the PARTS it implies (walls, roofs, props).
2. **A modular kit of parts** — procedural builders in code (our `makeProcX` pattern) or
   AI-generated props for statics; every piece grid-snapped, 90°-rotatable.
3. **Deterministic generators** for the repetitive assembly (a house from a footprint).
4. **Hand placement with intent** for everything that matters (the RuneScape way).
5. **Walk paths first** — design where the player walks, then build the world around the
   routes (the 72-hour build's best lesson; VEYHOLLOW_DESIGN's "guided first loop").

## 2. The OSRS structural model we adopt (verified numbers)

| Concept | OSRS | Crafted Realm |
|---|---|---|
| Tile | 128 fine units | 1 world unit (existing) |
| Zone | 8×8 tiles | our chunk (`src/chunks.js`) |
| Mapsquare | 64×64 tiles × 4 planes, region id `(mx<<8)\|my` | authoring/streaming unit (adopt when the map grows) |
| Storey height | 240 units = **1.875 tiles** (squat = the OSRS read) | **2.0 units** (`Buildkit.STOREY_H`) |
| Loc placement | 4 fields: id, packed pos, shape 0-22, rot 0-3 | def-vs-placement in chunks.js; shape taxonomy below |
| Loc shapes | walls 0-3/9 · wall-decor 4-8 · centrepiece 10-11 · roof 12-17 · roof-edge 18-21 · ground-decor 22 | 5 simplified layers, one loc per layer per tile |
| Walls | live on tile **edges**, doors are 1-tile wall locs w/ open/closed morph | v2 kit target (v1 = box shells) |
| Planes | 0-3; ladders/stairs are ordinary locs + a teleport script | `src/planes.js` (built, verified) |
| Underground | plane 0 displaced **+6400 tiles** | far-offset rooms on plane -1 (`Planes.addCave`) |
| Bridges | flag 0x2: plane-1 tile renders/collides one plane down | roadmap (with river crossings) |
| Terrain | per-vertex heights (×8 steps) + blended **underlay** colors (radius-5 average → vertex colors) + hard-edged **overlay** shapes (13 shapes for diagonal path edges) | heightfield exists; underlay/overlay painting = roadmap |
| Town density | ~1-3k locs per town mapsquare; something clickable every few tiles | the VEYHOLLOW_DESIGN checklist enforces this |

## 3. What's built and verified today (the pipeline v1)

- **`src/planes.js` — verticality.** `Player.plane`; `Planes.addFloor` (walkable upper-storey
  rects) + `edgeFence`; plane-tagged colliders (`collides(x,z,pad,doors,plane)`);
  plane-aware pathing (`pElev`/`tileWalkable` in game5); `Planes.addClimb` (ladder/stair/
  trapdoor teleports — click → walk to base → climb, with menu entries); `Planes.addCave`
  (authored underground rooms at far offsets: floor, rock walls, ceiling, torchlight);
  visibility rules (roofs hide above you; off-plane entities hidden).
- **`src/buildkit.js` — the building generator.** `Buildkit.house({x,z,w,d,floors,doorSide,
  roof,interior,upstairs})` → complete multi-storey building in ONE LINE: proven cottage
  shell (Tudor framing, working door, glowing windows, colliders, roof-lift) + second storey
  + walkable plane-1 floor + interior ladder + furnishing. ~20-piece **furniture kit**
  (table/chair/stool/bench/bed/shelf/counter/barrel/crate/rug/hearth/candle…) with
  **room presets**: house, shop, pub, bank, smithy, bedroom — each following the OSRS
  lived-in checklist (a light + a floor item + a wall item + corner clutter + an
  interactable; 40-60% tile occupancy). `Buildkit.autoRoof(tiles)` — 4-dir-erosion roof
  (the straight-skeleton degenerate case) for L/T-shaped footprints.
- **`src/map_showcase.js` — the reference build.** *The Wayfarer's Rest* east of the square:
  2 storeys, pub downstairs, bedroom upstairs, interior ladder, trapdoor → stocked cellar
  (plane -1, far-offset), ladder back out. Every pipeline capability standing in the world
  to inspect and copy. Verified end-to-end: climb up (correct elevation, walkable floor,
  rim blocked, roof hides), climb down (roof restores), cellar route both ways.

Plus the pre-existing substrate: heightfield terrain + `groundY`, `WORLD.interiors`
roof-lift, `chunks.js` def-vs-placement model, Build Mode editor (palette, place/rotate,
undo/redo, auto-collision, chunk serialization, templates groundwork), the castle kit.

## 4. How to build (the method)

### Buildings
- **One-liners for the common cases:**
  `Buildkit.house({x:14, z:26, w:7, d:6, floors:2, doorSide:'S', roof:'gable', interior:'pub', upstairs:'bedroom'})`
- **Proportions are law:** storey 2.0 units, doors 1 tile, footprints small (house 5×7,
  shop 7×9, church ~9×14, keep 16×16+). Squat reads OSRS; tall reads wrong.
- **Landmark structures** (castles, temples, mills): hand-assemble from kit pieces like
  `src/castle.js` — generators for the repetitive 90%, hands for the 10% that gives identity.
- **Interiors are non-negotiable.** No hollow buildings: use the room presets, then add
  1-2 bespoke touches per building (this shop's crate stack, that pub's rug color).
- **Every building states its purpose** via an NPC, a shop, a resource, or a story hook.

### Verticality
- Upper floors: `floors:2` in Buildkit (floor+fence+ladder wired automatically), or manual
  `Planes.addFloor` + `edgeFence` + `addClimb` for towers/keeps.
- Caves/cellars/dungeons: `Planes.addCave` at a far offset (keep a ledger of used offsets in
  this file — e.g. (300,300) = Wayfarer's cellar) + `addClimb` pairs for entrance/exit.
- Dungeon entrances go **near the loop** (in or beside towns); the dungeon lives wherever.

### Terrain & roads
- Roads = the `PATHS` array (painted overlays radiating from anchors); dress them
  (fences, lamp posts, carts) so they read traveled.
- Water/cliffs = blocked terrain; bridges = the current causeway pattern (flag-0x2 bridges
  are roadmap).

## 5. THE RECIPE — adding a new village (repeatable, ~an afternoon)

1. **Story first** (30 min, on paper / in `STORY_BIBLE.md`): name it (our own — Veyhollow,
   Brynholt, not Anytown), pick its faction alignment (§2 of the bible), its skill focus,
   its threat band, and ONE sentence of identity ("the fen-edge stilt village where the
   Wardens burn marsh-lights"). If it doesn't fit the Scarring arc's geography, move it.
2. **Macro plan** (30 min): a 4×4-chunk grid sketch like VEYHOLLOW_DESIGN §4 — anchor
   landmark, service cluster, resource ring at graded distances, road connections to
   existing regions, biome transition per approach direction, dungeon entrance if any.
3. **Claim ground**: pick clear terrain (or extend `terrainHeight` for a new biome pad);
   add the zone to `ZONES` in `game1_data.js` (name, pos, threat).
4. **Roads in** before buildings: extend `PATHS` from the nearest existing road.
5. **Buildings** (fastest part now): one `Buildkit.house` line per structure in a new
   `src/village_<name>.js` (copy `map_showcase.js`'s boot-poll shape); hand-place the one
   landmark that gives the village its silhouette.
6. **NPCs**: add types to `NPC_TYPES` (data only — the validator gates the stats) or reuse;
   spawn them in the village file; give 1-2 of them dialogue via `Interact.register`.
7. **Content hooks**: a shop (`SHOPS`), a bounty/gathering node, one quest seed (`QUESTS`)
   that gives a *reason to come* — per the bible's quest design law.
8. **Validate**: `node tools/validate_content.js` (data) + the **movement audit** (walk
   every road in, path to every interactable, corner every building — the RSPS community's
   #1 quality gate) + console clean.
9. **Reference compare**: screenshot the village center vs an OSRS reference shot
   (`node tools/gemini_vision.js`) — gate on "clearer and more characterful, not just different."
10. **Log it**: one entry in `OVERNIGHT_CLOSENESS.md`; update the offset ledger if caves added.

**The per-chunk quality checklist** (from VEYHOLLOW_DESIGN §6, enforced): purpose ·
landmark/sightline · reason to cross · smooth transitions · connectivity · tuned encounters ·
no dead space · 2-second readability.

## 6. Story coherence rules

- **Geography is the fiction**: threat rises with distance from Veyhollow, and northward
  past the **Wilderness Ditch** most of all; biome per direction (autumn forest W, drowned
  fen SW, the burned **Wilderness/Scarlands** N behind the Ditch — flanked by the Whitmoor
  snow keep NW and the Brynholt frost coast NE — the Undercrag at its deep-north edge, crag
  and dunes E, lakes and arena S, Tutor's Holm offshore SE); each faction's architecture
  recurs where it holds power (Wardens' timber palisades; the Dawn's pale chapel stone;
  Spire glass). Match `Maps/Crafted Realms Map.png` for every position.
- **Names from the same well**: hollow/reach/holt/moor/crag compounds (Veyhollow,
  Stonereach, Brynholt, Whitmoor, Undercrag). No Earth names, no RuneScape names.
- **Every location answers three questions**: who holds it (faction), why players come
  (content), what it fears (the arc). If any answer is missing, it isn't ready to build.

## 7. Pipeline roadmap (next upgrades, in order)

1. **Edge-wall kit v2** — walls as tile-edge placements (the OSRS slot model: wallN/E/S/W +
   corner per tile) with door-morph collision; unlocks true per-room flood-fill, clean
   multi-room buildings, and castle interiors.
2. **Underlay/overlay vertex-color terrain** — radius-5 blended ground colors + 13-shape
   hard-edged overlays (the entire OSRS ground look; replaces baked ground textures).
3. **Editor: plane selector** (edit floor 1 with floor 0 ghosted), **wall-run tool**,
   **building-stamp tool** (Buildkit params in the palette), **template save/stamp**.
4. **Bridge flag** (render/collide plane-1 deck one plane down) for real river crossings.
5. **Auto-roof v2** — true piece classification (slope/hip/valley/ridge/edge-trim meshes)
   replacing the v1 approximations.
6. **Mapsquare streaming** — 64×64 authoring files + the load-ring, when the world outgrows
   one scene (pairs with the chunk editor's grab/move/clone).

---

## 8. The Jagex detail blueprint (castle/landmark checklist, research-locked)

From the OSRS castle-anatomy research (Lumbridge / Falador / Ardougne / Fisher Realm):
one bridge in — and put someone ON it · moat is read-only · floor = function (ground
public / middle power / top reward) · two staircases so no floor dead-ends · tower top
reserved for exactly one crown object · kitchen trapdoor = the future quest socket ·
**8–15 objects per interior room** (2-4 furniture anchors, 2-4 wall items, a rug, 2-4
searchables, 1-3 surface item spawns, ≥1 non-door click) · ranked attackable garrison =
decor AND training gym · courtyard trades clutter for motion (patrols, sparring pairs) +
centerpiece + statues with lore examines · one absurd object per castle (the chicken
law) · a locked skill-gated room that isn't a quest · examine text is 30% of the detail
budget. **Reference builds:** The Wayfarer's Rest (inn/cellar scale, east of the square)
and **WARDENHOLM KEEP** (landmark scale, the moated island at (56,4) — ramparts, towers,
Proving Ring, undercroft dungeon + chained boss + quest). Cave/undercroft offset ledger:
(300,300)=Wayfarer cellar · (330,330)=Wardenholm undercroft.

## 9. Blender's place (workflow research verdict, 2 agents, 2026-07-02)

The successful Claude-gamedev pattern everywhere: **the world ships as engine-side data,
never as scene meshes** — Claude emits placement data, deterministic code builds it, and
Blender (via the MCP) is the tool for **individual kit pieces and hero props** (thrones,
statues, gates, boss set-dressing): model low-poly flat-shaded → apply transforms →
origin at base snap-point → one GLB per piece → engine places on the grid. Blender never
lays out levels (proven failure mode). Landmark polish pass = replace the most-seen
procedural hero props with Blender-authored ones, one GLB at a time.

---

*When in doubt about proportions, furnishing density, or how a ladder/cellar/dungeon
should feel — go stand in the Wayfarer's Rest, then walk Wardenholm's walls.*
