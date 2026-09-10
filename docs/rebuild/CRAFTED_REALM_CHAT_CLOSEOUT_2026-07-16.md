# Crafted Realm — chat closeout and continuation brief

Date: **2026-07-16**  
Current proving slice: **Tutor's Holm environment foundation and Survival Workyard**  
Release status: **development build, not yet a public-release candidate**

This document closes the long planning/build conversation and prevents the next task from having to rediscover its decisions, accepted work, evidence, or boundaries.

## 1. Product direction locked in this conversation

- Ship a polished **single-player desktop-browser game first**, targeting Chrome and Edge. Android/offline travel play and Steam come later through a portable, versioned save/profile path.
- Browser 1.0 is completely free. A later membership option may use separate member worlds/content, but must never be pay-to-win. Monetization is not a current development dependency.
- The intended player is someone who understands the basic loop immediately, makes visible progress in **15–30 minutes**, and may still choose to grind, quest, fight, explore, or relax for hours.
- Progression should feel roughly **three times faster than OSRS**, while retaining its open-ended, classless, skill-based freedom. There is no mandatory chosen-one campaign or single quest item that owns the player's identity.
- Launch breadth is a purposeful **four-region map**, roughly **10–20 authored hours**, eight to twelve genuinely distinct enemy families, three major bosses, regional shops, skilling, quests, minigames, and a replayable endgame rather than thousands of mandatory boss kills.
- Supported launch skills center on combat plus Woodcutting, Mining, Fishing, Cooking, Firemaking, Smithing, Crafting, and Prayer/Magic systems already established in planning. Mining and Smithing should eventually matter to armor, settlement upgrades, defenses, and the compact homestead.
- Browser 1.0 homesteading is one purchasable authored plot with modular snap construction. It is not unrestricted voxel building.
- Ordinary equipment never needs durability repair. Healthy sinks are food, ammunition, runes, potions, homestead materials, defense repairs/damage reducers, services, travel, and optional cosmetics.
- Death is forgiving outside the higher-risk Scarlands. Later PvP may use readable skull/protection rules inspired by familiar wilderness risk, but the public single-player release does not depend on multiplayer.
- Scarring Surges are milestone-triggered, telegraphed, knowingly started, and never destroy an absent player's progress. Fixed civic upgrade sockets connect gathering/production to defense without turning the game into Minecraft.
- Presentation is an elevated readable OSRS-style camera, warm low-poly 2007-era readability, concise serious/witty/cheesy dialogue, lightweight character creation, a cozy teen-friendly tone, and no graphic gore or sexual content.
- Browser 1.0 includes a performance-gated day/night cycle. Music may be produced in Suno, but audio must remain original and consistent.
- The future non-staked competitive venue is the **Oathring**: practice/ranked tournaments, cosmetics, and non-tradeable Laurels. Player-wealth wagering was rejected.
- Online later means text/clan/party chat, trading and exchange, small worlds, no voice chat, and server-authoritative shared-economy characters. Offline-earned wealth/XP never silently enters the online economy.
- The existing minimap concept and bezel remain useful, but the map image is not immutable; geography should follow purposeful regions and readable landmarks.

## 2. Technical and world foundation completed

### Phase 1 — startup, streaming, and safety

- Startup was rebuilt around real loading and recoverable failure rather than a long synchronous white/frozen page.
- Tutor's Holm uses a validated world-v2 provider with an 8×8 tile chunk law and a bounded 7×7 resident ring.
- Terrain, collision, authored object/interaction rows, minimap geography, streaming disposal, save migration, and retry behavior have automated gates.
- The current foreground smoke gate performs the real Continue flow, structural checks, a real cardinal walk out-and-back, multiple chunk-boundary crossings, save/load position verification, performance sampling, and console error capture.

### Phase 2 — Tutor's Holm landscape and flow

- The Holm reserves a 112×96 authored envelope across 195 catalog chunks while retaining bounded residency.
- Six districts, eight functional pads, the arrival cove, primary path spine, Survival Pond, Tidebridge/inlet, ridge/headland/cave/departure areas, and a reserved cavern are data-authored.
- A ten-station tutorial circuit and sixteen-lesson release curriculum are locked. Eleven environment/system gates are live; five NPC-dependent lessons remain deferred.
- Completing the island is designed to unlock the departure boat. Boarding transitions to the separate Veyhollow Commons provider rather than teleporting arbitrarily.
- Stable Test Travel coordinates exist for the Guide Hall, Workyard surface, Workyard basement locations, waterworks, fishing edge, departure dock, Veyhollow ferry arrival, and Hollow Well Square.

## 3. Building and art-production progress

### Guide Hall

- The Guide Hall has a large functional footprint, two-door flow, four purposeful rooms, semantic services/support/story clues, collision, roof cutaway, save/streaming integration, and Studio/runtime parity.
- Its current v6 visible shell remains a **functional graybox/reference candidate**, not final release art. The owner's later review correctly established that genuine Blender exports can still look like colored primitives. Preserve its proven flow and semantics while replacing visible meshes through the fully-designed gate.

### Fully-designed asset workflow now established

The governing workflow is:

1. purpose/scale/semantic recipe;
2. original Nano Banana concept in the project's cozy low-poly direction;
3. custom Blender topology and authored materials, not primitive provenance alone;
4. editable `.blend` and efficient `.glb`;
5. five-view isolated packet plus player-scale proof;
6. north/south/east/west installed-contact renders and written PASS/FAIL audit;
7. animation/motion strip when applicable;
8. concept-to-Blender comparison with a direct **9.0+** score;
9. r160 Studio loading and definition contract;
10. live r128 interaction, collision, save, smoke, performance, and gameplay-camera review.

`tools/asset_factory.py`, schema-3 recipes, manifests/catalogs, Blender builders, comparison tools, cardinal sheets, pure transaction tests, and the smoke gate make this repeatable. The workflow deliberately fails closed on giant scale, missing backs/interiors, opaque voids, floating contact, missing semantic nodes, lost animation targets, over-budget exports, or absent evidence.

## 4. Survival Workyard status

### Basement — frozen/accepted for now

- The basement has a registered walk surface and safe two-way traversal; black-void and non-movement defects were fixed.
- It uses one simple wall-leaning ladder, visible-mesh-only climb activation, and climb sounds. The unwanted basement hatch-on-wall presentation was removed.
- Fully modeled assets include the sealed animated reserve chest with creak/close sounds, slower cozy wall torches, masonry hearth/fire, tightened stone floor, rugs, shelves/storage, table/food preparation details, barrels/baskets with interiors, Moonward Watch picture, quiet chairs/side table/yarn, and supporting furnishings.
- Fireplace, tools, barrels, chest wall clearance, chair scale/placement, torch scale/mounting, shelf penetrations, portrait height, basket voids, and chest lid shell/end panels were iterated from live owner screenshots.
- Decorative objects use left-click Walk here and right-click Inspect; functional ladder/chest behaviors remain deliberate.
- The basement is not claimed as immutable release art, but it is checked off so surface progress can continue without accidental regeneration.

### Surface/upstairs U1–U5

- **U1 structural sanitation:** player-scaled fitted trail/pond doors, wall infill above lintels, one surface hatch owner, no grass/trees/fences through completed floors, true wall openings for stained glass, exterior-side timber hierarchy, and reversible 0.22-second roof ease.
- **U2 purposeful interior:** teaching hearth, tool-maintenance table, fitted crockery hutch, pegged mug shelf, two rugs, empty lesson bucket, stools/chairs, story relief, and clean cardinal circulation. Every visible furnishing has a lesson/story/support purpose and explicit interaction ownership.
- **U3 occupation exterior:** independent Blender family for timber rack, restrained log stack, chopping block, embedded axe, and sawbuck. Four-angle contact audits fixed the kerf and terraced stump before integration. The old random procedural occupation objects were retired.
- **U4 waterworks:** independent animated Blender L-dock and bucket pulley; continuous three-surface cardinal route; crank hit proxy; cozy pulley/splash/settle audio; atomic empty-bucket to bucket-of-water transaction; interruption and bounded save ledger. Accepted at 97/97 smoke before U5.
- **U5 fishing edge (completed in this closeout):** independent animated Blender water/fish/ripple/creel family; Small-net approach and exact-once catch contract; 28 Fishing XP and Raw mirrorperch reward; immediate durable save; three fishing sounds; four-angle Blender and live r128 audits; Test Travel bookmark.

The authoritative U5 detail is `docs/rebuild/WORKYARD_FISHING_EDGE_U5_HANDOFF.md`.

## 5. Current measured acceptance

- U5 pure contract: **25/25 PASS**.
- U4 regression contract: **21/21 PASS**.
- World-v2 contract: **all locks pass**.
- Content integrity: **PASS**.
- U5 Asset Factory: **31 locks PASS**.
- U5 export: **1,338 triangles / 15 primitives / 11 materials / 105,972 bytes**.
- Final foreground smoke: **100/100 PASS**, boot **712 ms**, **60 FPS**, **19 ms** worst frame, **169 draw calls**, **32,976 triangles**, zero uncaught/console errors, exact streaming save/load position.
- Hands-on normal-browser proof: Small net starts the authored sequence; two catches produced two visible Raw mirrorperch; Continue Adventure reload restored both.
- Live north/south/east/west sheet: `scratchpad/workyard_fishing_edge_u5_v1/live_turnaround_sheet.png` — **PASS 4/4**.
- U5 concept comparison: `Bible_References/Complete/_compare/workyard_fishing_edge_u5_v1_compare.png` — **9.0/10**.

The r160 Studio loads the complete Workyard and all 30 building-definition locks pass. Its total-scene HUD currently mixes the production asset with Studio floor and semantic helper draws; U6 should separate those numbers. Do not raise the real 170-draw gameplay budget to hide that tooling ambiguity—the live game passes at 169.

## 6. How to test now

1. Start/keep the local server on port 8777.
2. Open `http://127.0.0.1:8777/` and choose **Continue Adventure** → **CLICK HERE TO PLAY**.
3. Click the pink **Test Travel** pin.
4. Choose **Survival Workyard — fishing edge** (X 131.70, Z 151.10, plane 0).
5. Select **Small net** in the inventory and click the subtle ripple/fish water immediately beside the terminal dock.
6. Confirm the cast/bite/catch motion, restrained audio, one Raw mirrorperch, +28 Fishing XP, and game message.
7. Reload through Continue Adventure to confirm the catch persists.

For a complete automated gate, use `http://127.0.0.1:8777/?smoke=1` in a foreground tab and wait for the green PASS badge.

## 7. Deliberately unfinished

- The game is not shippable yet. It still needs the rest of the four-region world, authored quests/content, release-quality Guide Hall replacement art, NPC/monster production, combat encounters/bosses, economy/shop balance, complete tutorial comprehension testing, broader accessibility/settings work, outside human alpha testing, and deployment/account planning.
- Workyard **U6 room acceptance** remains: complete surface/upstairs interaction and collision sweep, roof timing from ordinary entry/exit, final owner-scale/composition review, and a Studio asset-only metric split.
- Guide Hall visible art must be rebuilt under the same fully-designed asset standard proven by U3–U5. Preserve its semantics/flow while changing only visible ownership.
- NPC production remains deferred until the chunk foundation and immediate tutorial environments are stable. The user has authorized NPC work once that condition is genuinely met.
- The main-island Hollow Well Square and broader landscape remain later proving-slice work; do not let them pull focus away from closing Tutor's Holm environment quality.
- Fishing rods, bait, catch variety, cooking expansion, homesteads, Surges, Oathring, multiplayer, Android, and Steam are roadmap content, not permission to inflate the current slice.
- Public beta still requires **10–20 uncoached outside human sessions**. AI and owner testing cannot prove comprehension or delight alone.

## 8. Recommended next-task order

1. Finish **Workyard U6** and obtain owner sign-off on the complete surface room/exterior as a whole.
2. Apply the proven custom-topology workflow to one owner-approved **Guide Hall replacement visual anchor**, then replace the Hall family without changing its accepted route/semantics.
3. Perform a complete Tutor's Holm environment acceptance pass: landscape beauty/density, station orientation, roof/door consistency, tutorial route readability, and frame-time stability.
4. Only after that gate, begin the smallest NPC slice required to make the Holm tutorial feel alive.
5. Continue the proving route to the Veyhollow arrival/Hollow Well Square before expanding the rest of the launch map.

## 9. Governing files for continuation

- North star: `GUIDING_LIGHT.md`
- Detailed engineering rules: `AGENTS.md`
- Story/product canon: `STORY_BIBLE.md`, `ROADMAP.md`, `TUTORIAL_ISLAND.md`
- Art workflow: `docs/rebuild/ART_PRODUCTION_PIPELINE.md`, `docs/rebuild/ASSET_FACTORY_V2.md`, `docs/rebuild/ASSET_PROMPT_STANDARD.md`
- Workyard ledger: `docs/rebuild/WORKYARD_UPSTAIRS_EXTERIOR_LEDGER.md`
- U4 handoff: `docs/rebuild/WORKYARD_WATERWORKS_U4_HANDOFF.md`
- U5 handoff: `docs/rebuild/WORKYARD_FISHING_EDGE_U5_HANDOFF.md`
- Historical visual/technical log: `Bible_References/PASS_LOG.md`

The most important continuation rule is simple: **preserve proven function, replace only the visible owner that fails the art bar, and never call an asset complete until Blender proof, four-angle contact review, live interaction, save, and performance all agree.**
