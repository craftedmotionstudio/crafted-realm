# ⭐ GUIDING LIGHT — read at the START of every session

The one page that keeps Crafted Realm from drifting. Vision lives in `GOAL.md`, engineering rules in
`CLAUDE.md`, world canon in `STORY_BIBLE.md` — this file is the **north star + the working discipline**,
short on purpose so it actually gets re-read. If a change here fights a decision below, the decision wins
unless we change it *deliberately* (and edit this file).

## The game, in one breath
**Old School RuneScape's soul in a browser** — cozy medieval grind, click-to-move tile world, skill
ladders, quests, loot — as our own IP, tighter and more optimized, carried past where OSRS stops. A love
letter, not a clone. Warm, low-poly, flat-shaded 2007 charm. (Full vision: `GOAL.md`.)

## The spine — decisions that MUST NOT be silently eroded
1. **Combat math + XP curve are OSRS-exact.** Never regress. (`game3_systems.js`, `game1_data.js`.)
   Browser 1.0 targets at least ~3× effective progression through action/quest/reward XP and unlock
   pacing—not by replacing or distorting the XP table.
2. **1 world unit = 1 tile. Movement is 4-directional (N/S/E/W), never diagonal.**
3. **Art: cozy 2007/OSRS, low-poly flat-shaded, WARM — cohesive over individually-cool.** Consistency wins.
4. **Items are 2D icon sprites; 3D is only world props + worn gear.**
5. **NPCs: only MODELLED (GLB) NPCs, added LAST** (user, 2026-07-04). Never mutate shared `NPC_TYPES` —
   per-instance state only.
6. **Modelled assets replace ALL procedural instances of that type** (asset-replacement rule).
7. **Anything that moves in reality ships ANIMATED** (flames, flags, water, sails).
8. **Secrets come from env, never hardcoded/printed/committed.**

## The discipline — how we work (the anti-drift rules)
1. **Re-read this file each session.** A fix that undoes an earlier decision is the #1 silent failure
   (r/aigamedev). If you're about to change core/shared code, check the spine first.
2. **VERIFY, don't assert.** I (the AI) will confidently claim things are done that aren't. Prove every
   change by DRIVING THE REAL FLOW in-browser (walk in, click, read the console) — **never by teleport,
   never by "should work."** Cautionary tales: claimed the brown-plane fixed after only teleporting;
   deleted the `band` slab and hung the boot because I missed a second reference.
   **The smoke gate is live (2026-07-06):** `?smoke=1` drives real login → settle → structural suite →
   real walk out-and-back → perf budgets → console-error sweep, and prints one `[SMOKE]` verdict line
   (+ an on-screen badge). Run it after every nontrivial change; it replaces nothing about eyes-on
   visual judgment, it catches the "boot is broken / flow regressed / perf fell off a cliff" class.
3. **Plan → small bundles → gate each.** Decompose before building; fan out agents for independent,
   self-contained work; verify each piece before the next. Eyes-on placement stays in the main session
   (headless agents hallucinate world coords). **FRONT-LOAD agents at the START of every loop** (user,
   2026-07-04): open each pass by dispatching as many parallel agents as the work has independent seams —
   each writes its own NEW reversible file — so we build from all angles while the main session does the
   eyes-on verification/placement that can't be parallelized. Then integrate + gate the clean ones.
   **Brief every agent with `AGENT_SPEC_TEMPLATE.md`** (2026-07-06): base-check guard, pure-DATA
   contract, boot-time acceptance tests, anti-goals — the agent proves its data layer headlessly.
4. **Author assets in the STUDIO, not the live game.** `tools/studio.html` renders one building/object in
   isolation with an orbit camera + hot-reload (seconds, not the 60–90s game boot). Gate assets there —
   including vs the `Bible_References/` image — before they enter the game. This is a STAPLE, not a one-off.
5. **Data over code.** Buildings/objects/values want to be DATA a composer reads, not bespoke procedural
   code per asset. Keep tunables (stats, prices, layouts) in data files.
6. **Separate logic from visuals** so a visual rewrite can't break mechanics.
7. **Know when a thing is "good enough."** Fine interior detail does NOT read from the fixed overhead
   camera — stop polishing what the camera can't show; use the Studio's close camera for detail work.
8. **Perf is a feature.** Three.js devours memory → crashes/slow boot. Merge repeated geometry into ONE
   draw call; stagger heavy builds across frames; watch the boot time and tick health.
9. **Log every pass in `PASS_LOG.md`** (survives context compaction — it's our memory between sessions).
9b. **"Done" has a HARD visual definition:** an asset needs a banked side-by-side comparison sheet in
   `Bible_References/Complete/_compare/` and a structured Codex visual review of **≥9.0** against its reference
   and in-game context. The review covers silhouette, proportions, shape hierarchy, color/material separation,
   reference-defining features, gameplay-camera readability, animation/interaction readability, and family
   consistency. Screenshots and written evidence remain required. Per the user's 2026-07-13 decision, Codex's
   direct review is the sole visual gate; no second-model visual review or score is required.
10. **Visual review protocol:** settle the real Studio/game view, capture it, inspect it directly, record the
   structured findings and score, and fix material defects before acceptance.

## Current focus (update as it moves)
- **OWNER ART RESET / BLENDER RE-AUDIT (2026-07-14):** the owner correctly identified that a genuine Blender
  export can still be only colored primitives arranged together. Blender provenance is no longer treated as
  visual acceptance. Guide Hall v3–v6, Survival Workyard v1/v2, its cellar, the furnishing catalog, and their
  scripted construction kit are retained as functional grayboxes/reference evidence but are **not release art**.
  Preserve proven flow, collision, doors, interiors, streaming, and interactions while replacing their visible
  meshes through the fully-designed gate in `docs/rebuild/ART_PRODUCTION_PIPELINE.md` §2.1. Do not scale asset
  production until one owner-approved proof asset demonstrates custom silhouette/topology, authored surface
  treatment, and the five-view proof sheet.
- **PRIMARY OBJECTIVE (user, 2026-07-13): rebuild Crafted Realm around a fast, purposeful, OSRS-like
  first hour.** Startup responsiveness is the first gate. The current world becomes a reversible legacy
  provider while world v2 loads authored chunks around the player. Do not expand content while Play can
  freeze the browser or while the loader reports timer-based rather than real progress.
- **PHASE 1 COMPLETE (2026-07-13):** Tutor's Holm streams a real 7x7 terrain/collision ring plus validated
  chunk-owned object/interaction rows and shared templates. The minimap uses cached static geography,
  chunk/resource markers, and a bounded 128-marker live layer while preserving compass, landmarks,
  destination, orientation, and real click-to-walk. One-shot asset failure → **Try again** recovery is
  browser-proven. Five consecutive foreground gates passed 71/71 at 60 FPS, eight boundary crossings each,
  exact save/progress restoration, 22–44 ms worst frames, and zero errors. Remaining global Holm dressing is
  frozen temporary content to replace/retire through data authoring, not a reason to expand legacy builders.
- **CURRENT PHASE 2 FOCUS:** define and validate the data language for chunks, complete buildings, rooms,
  doors, services, interactions, roofs, collision, landscape roles, and civic project sockets. Upgrade the
  Studio/Build Mode path until one complete building and chunk can be authored, moved, saved, reloaded,
  removed, traversed, visually reviewed, and resource-gated without editing the engine. This comes before
  production work on Hollow Well Square or NPCs.
- **PHASE 2 LANDSCAPE PROVING SLICE LIVE (2026-07-13):** Tutor's Holm now reserves a 112x96 authored
  envelope across 195 catalog chunks while retaining the Phase-1 7x7 resident budget. Six surface districts,
  a 221-tile cardinal route, eight functional building pads, the Tidebridge/inlet, Arrival Cove, Survival
  Pond, elevation bands, deterministic landscape placements, and a reserved 48x40 cavern are data-locked.
  This is an environment blockout, not final building/content acceptance: complete the building/room/door/
  service authoring contract before replacing the pads, and keep NPC production deferred.
- **PHASE 2 FLOW CONTRACT LIVE (2026-07-13):** the Holm is a ten-station circuit from Arrival Cove through
  Survival Wood, Lesson Green, the forward-only training cavern, Warden's Ridge, Mage Headland, and an eastern
  Departure Dock. The 16-lesson release curriculum is data-locked; 11 environment/system gates are active and
  five NPC-dependent gates remain deferred. Completion unlocks a chunk-owned boat instead of teleporting.
  Boarding activates a separate bounded Veyhollow Commons provider and saves the provider transition. The
  mainland footprint is an arrival shell, not authorization to build Hollow Well Square before the Guide Hall
  proves the complete building/room/door/service Studio round-trip.
- **PHASE 2 GUIDE HALL v6 LIVE / FUNCTIONAL GRAYBOX (reclassified 2026-07-14):** v3/v4/v5 remain rejected evidence: they
  established the required 26x24 functional footprint, fitted doors, collision, semantics, and browser gates,
  but did not meet the owner's hand-authored visual bar. The owner approved the smaller art-direction anchor.
  v6 now carries that language into the complete Hall: recessed openings, irregular fieldstone, load-bearing
  timber bays, broad material variation, fitted seven-plank doors, stained glass, detailed records/provision
  clusters, and one dominant connected gable hierarchy with 656 orderly roof tiles. The production GLB passes
  at 35,314 triangles, 51 primitives, 18 materials, and 2,623,512 bytes. The live arrival was moved to the clear
  south apron so the larger footprint cannot trap a new character; the full-height arrival door opens and the
  roof hides on entry. Headless world/content gates and the foreground smoke gate pass (75/75, 100 FPS, 11 ms
  worst frame, zero errors). Its gameplay shell remains valuable, but the owner has rejected primitive-assembly
  modeling as final art. Keep v6 only as a functional/reference candidate until its visible meshes are rebuilt
  and approved under the fully-designed gate.
- **PHASE 2 SURVIVAL WORKYARD v1/v2 LIVE / FUNCTIONAL GRAYBOX (reclassified 2026-07-14):** the old 8x7 shelter pad is replaced by a complete 16x13
  hand-authored lodge and open lean-to using the approved construction language without copying the Guide Hall
  composition. A south trail door and east pond door create a proven cardinal through-route; the tool bay,
  teaching hearth, ordered log yard, chopping block, net rack, and storm tally support four static semantic
  interactions before NPC production. The pipeline passes at 17,640 triangles / 39 primitives / 16 materials /
  1.31 MB. Direct visual review is 9.1/10 and banked. Real click-to-walk entry, door animation, roof cutaway,
  tool-bench dialogue, save/streaming, and foreground smoke pass 75/75 at 100 FPS with zero errors. The next
  environment slice is paused while the visible building, cellar, lantern, and furnishing meshes are re-audited;
  NPCs remain deferred.
- **SURVIVAL WORKYARD FULLY-DESIGNED SLICES U3–U5 ACCEPTED (2026-07-16):** keep the basement frozen for
  now and preserve the proven U1/U2 shell, door, floor, roof, furnishing and circulation corrections. U3 is the
  separate timber-rack/chopping-block/axe/sawbuck Blender occupation family; U4 is the animated L-dock and
  bucket-pulley transaction; U5 is the animated Small-net fish/ripple/open-creel family with a deterministic
  catch/reward ledger. U5 passes its 31-lock factory gate, 25/25 pure contract, live four-angle audit, durable
  Continue reload, and foreground smoke at 100/100, 60 FPS, 169 draws, 19 ms worst frame and zero errors. The
  next boundary is U6 whole-room owner acceptance—not fishing breadth or NPC production. Full closeout:
  `docs/rebuild/CRAFTED_REALM_CHAT_CLOSEOUT_2026-07-16.md`.
- **FABLE ORCHESTRATION RECOVERED (2026-07-16):** the full accepted U5 state is banked on
  `codex/u5-accepted-checkpoint`. Deterministic Studio authoring is integrated with 18/18 locks. The Training Cavern
  remains a functional graybox but is now explicitly owned and disposed by the Holm provider rather than polling and
  placing global objects. Foreground smoke is back to 100/100 with zero errors. Keep the unfinished Teaching Kitchen
  isolated; resume at U6 whole-room Workyard acceptance. Recovery detail:
  `docs/rebuild/FABLE_ORCHESTRATION_RECOVERY_2026-07-16.md`.
- **LOW-POLY ASSET SYSTEM v1 FUNCTIONAL / VISUAL GATE SUPERSEDED:** `tools/asset_pipeline.py`, per-asset manifests, the deterministic
  `cr_lowpoly_assetkit.py`, and the Blender Asset Browser library now form the shared Blender-to-GLB workflow.
  They gate scale, semantic nodes, geometric fit, review renders, triangles, primitives, materials, and bytes
  before Studio/game review, but those technical checks did not prevent primitive-looking final art. Retain the
  validators and export tooling; require the new fully-designed mesh/source proof before Studio/game acceptance.
  Reuse approved components and palette; never reuse whole-building compositions as prefabs.
- **ASSET FACTORY v2 SCALE-FIRST GATE LIVE (2026-07-14):** `tools/asset_factory.py` and `assets/recipes/`
  now put function, canonical-player scale, numeric dimension ranges, semantic parts, budgets, proof order,
  collision, interactions and integration evidence in one technical recipe. The ordinary asset pipeline enforces
  the scale contract. The rejected 2.54-tile giant chair is a permanent regression test. New object families begin
  with `brief`; no detailed topology starts before the scale/silhouette fixture passes.
- **PROVING SLICE:** Tutor's Holm arrival → Hollow Well Square and four functional Commons buildings →
  one Emberwood/Stonereach production road → the Ditch → one compact Scarlands risk pocket. Preserve exact
  combat/XP, tile scale, four-direction movement, player systems, inventory/bank/skills, semantic
  interactions, saves through migration, and independently strong modelled assets.
- **MAP/MINIMAP DIRECTION (user, 2026-07-13):** the supplied minimap image, current bezel/drawing, and old
  macro-map layout are useful early references, not immutable canon. Redesign around the purposeful four-
  region launch world. Preserve useful orientation, compass, landmark, destination, risk-warning, and
  click-to-walk functions; require owner approval for the new visual/topology anchor.
- **WORLD LAW:** authored density over map size. Every enterable building needs a primary service,
  secondary use, story clue, readable entrance, navigable interior, and believable support space. Every
  placed prop must support function, navigation, ecology, occupation, story, or composition. No random
  settlement scatter and no decorative-only prefab shells.
- **PERIODIC THREAT DIRECTION:** design Scarring Surges around fixed civic upgrade sockets (gates,
  braziers, kitchens, smithy racks, ward devices), not unrestricted voxel/block construction. This ties
  gathering and production to settlement defense without turning the game into Minecraft. Surges are
  milestone-gated, telegraphed, and knowingly player-started after preparation; they never resolve
  offline or permanently erase an absent player's property/progress. A launch capstone can permanently
  secure Veyhollow from involuntary Surges while voluntary challenge Surges/deeper threats remain.
- **OPEN-WORLD STORY LAW:** no mandatory main quest owns the player's journey and the player is not a
  chosen one. Regional/faction arcs can be pursued in flexible order. A mysterious shard may be an
  optional quest item only; never make it the character's identity or a required campaign rail.
- **HOMESTEAD DIRECTION (locked for Browser 1.0):** one purchasable authored plot supports modular
  snap construction within a fixed build envelope. Crafted foundations, walls, roofs, fences, stations,
  and repairable defenses can make Woodcutting, Mining, Smithing, Masonry, and Crafting matter together.
  Build it after the proving slice; do not allow unrestricted construction across the authored world.
- **ECONOMY LAW:** ordinary weapons, armor, and tools never degrade. Consume food, ammunition, runes,
  potions, construction materials, defense repairs, travel/services, reclaim fees, and optional cosmetics
  instead. Important boss power uniques should normally be achievable in roughly 10–30 successful kills;
  extreme rarity is for optional prestige.
- **PRESENTATION LAW:** elevated OSRS-style camera, concise serious/witty/cheesy dialogue, lightweight
  classless character creation, cozy teen-friendly fantasy, no graphic gore or sexual content. Browser
  1.0 includes a readable/performance-gated visual day/night cycle with no forced waiting or offline time.
- **COMPETITIVE DUEL LAW:** the post-online venue is the non-staked **Oathring**—practice/ranked
  tournaments, cosmetics, and non-tradeable Laurels. No player-wealth wagering. It does not block
  Browser 1.0.
- **PLATFORM/SAVE LAW:** Windows Chrome/Edge first; Android and Steam later. Design the portable solo
  profile for versioned export, migration, cloud portability, and eventual offline Android travel play.
  Future shared-economy characters are connected/server-authoritative; never upload offline-earned items,
  XP, or Crowns into the online economy. Preserve account/character IDs and migrate rather than restart.
- **TEST LAW:** owner and AI automation test continuously, but 10–20 outside humans must complete
  uncoached private-alpha sessions before public beta. Human comprehension and delight cannot be asserted
  from automation.
- **REFERENCE ASSET DISCIPLINE REMAINS:** use the Studio and `Bible_References/` to build or upgrade the
  assets selected for the proving slice. Modelled replacements win over procedural duplicates. Quality
  comparisons remain required, but asset breadth no longer outranks startup, gameplay purpose, or chunk
  budgets. `docs/rebuild/ART_PRODUCTION_PIPELINE.md` is the governing contract for environments,
  characters, monsters, worn gear, icons, motion, integration, and release acceptance.
- **NPCs: CONDITIONALLY AUTHORIZED (user, 2026-07-13)** once the v2 chunk foundation and environments
  are stable. Until that gate is demonstrated, world NPC spawns remain off
  (`GameConfig.worldNpcSpawns:false`) and no modelling, placement, animation, dialogue, or encounter
  wiring begins. After the gate, add only modelled GLB NPCs, last, through chunk/spawn data.
- **The Studio is the staple** for building/object work — author in isolation (roof-off interior view,
  orbit detail camera) against the reference image, then integrate through v2 chunk data.
- **Infra reality:** the current boot has two proven synchronous construction waves and can make Chrome
  unresponsive. See `docs/rebuild/startup_performance_audit.md`; do not normalize or hide the freeze.
