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
- **TUTOR'S HOLM COMPLETION GOAL CLOSED (2026-09-09):** every reservation pad is a building, the full route is a
  standing real-input gate, and the closeout docs are written (`docs/rebuild/TUTORS_HOLM_COMPLETION_GOAL.md`). Two
  owner decisions stay open and are recorded there and in the flow doc: fully-designed art acceptance for the eight
  grayboxes, and modelled-NPC authorization (practice enemies, tutors) with their sockets already authored.
- **HOLM ROUTE PLAYABLE END TO END WITH REAL INPUT (2026-09-09):** `tools/qa_holm_full_route.js` clicks its way
  through all thirteen required lessons, bake_bread, learn_quests and the skiff in one fresh profile (20/20). The
  drive found three defects the data acceptance never could — no choppable tree, an un-clickable relief chart, a
  fishing edge that ignored the armed net — all fixed (marked trees module, Guide Hall reach guards, acceptsUseItem +
  bundle republish). Report `docs/rebuild/TUTORS_HOLM_FULL_ROUTE_QA_2026-09-09.md`. Remaining goal item: closeout.
- **MAGE TOWER v1 LIVE / FUNCTIONAL GRAYBOX (2026-09-09):** the eighth and last Holm building: a two-storey ashlar
  tower under a pyramid spire with a timber scriptorium wing. The rune table counts the player's air and mind runes,
  explains Wind Strike and opens the 🪄 tab; lectern and register teach NPC-free; the magic trial keeps its
  `casting_socket`. The upper storey lives in the roof group so the cutaway exposes the ground floor. All gates green
  (smoke 104/104, 60 FPS, zero errors; tower QA 14/14). **Every reservation pad on Tutor's Holm is now a building.**
  Next: the full-route real-pointer regression, then closeout. Proof `docs/rebuild/MAGE_TOWER_V1_2026-09-09.md`.
- **COMBAT HALL v1 LIVE / FUNCTIONAL GRAYBOX (2026-09-09):** the seventh complete Holm building: gabled drill hall
  with pell and rack of arms, a taller drill tower where the Training Cavern's exit ladder now surfaces (176.5,116.5),
  a covered practice yard and an armoury apse. Pell study opens the ⚔ tab; the melee/ranged trials stay NPC-deferred
  with their sockets authored. Two engine fixes rode along: building pads are exempt from the Lastlight route gate,
  and closed doors no longer bake wall edges into the collision grid. All gates green (smoke 104/104, 60 FPS, zero
  errors; hall QA 17/17 including the real cavern round trip). Remaining pad: Mage Tower. Proof
  `docs/rebuild/COMBAT_HALL_V1_2026-09-09.md`.
- **HOLM BANK v1 LIVE / FUNCTIONAL GRAYBOX (2026-09-09):** the second required-route pad is a complete banking hall:
  teller booths and the relocated vault chest both open the real bank, so `open_bank` happens inside a building. All
  gates green (smoke 104/104, 60 FPS, zero errors; bank QA 12/12). Sheets 8.4/8.4. Remaining pads: Combat Hall,
  Mage Tower. Proof `docs/rebuild/HOLM_BANK_V1_2026-09-09.md`.
- **MINE GATEHOUSE v1 LIVE / FUNCTIONAL GRAYBOX (2026-09-09):** the first required-route pad is a complete building:
  a gate tower the mine road passes through, a winch house holding the cavern shaft (moved from the open road tile to
  124.5,119.5), and an ore bay. `descend_cavern` now happens inside the building via the unchanged cavern climb. All
  gates green (smoke 104/104, 60 FPS, zero errors; gatehouse QA 12/12). Sheets 8.5/8.3. Remaining pads: Holm Bank,
  Combat Hall, Mage Tower. Proof `docs/rebuild/MINE_GATEHOUSE_V1_2026-09-09.md`.
- **QUEST LODGE v1 LIVE / FUNCTIONAL GRAYBOX (2026-09-09):** Lesson Green's second pad is a complete hall + chart
  turret + porch. The quest board opens the real journal and records the optional `learn_quests` lesson NPC-free; a
  silent guide socket waits for the modelled NPC. Two engine gaps closed on the way: building footprints are now
  re-baked into neighbouring chunks (walls were walk-through after streaming) and wall stations walk the player
  inside before acting (`holm_station_reach.js`). Doors must open on a tile centre. All gates green (smoke 104/104,
  60 FPS, zero errors; lodge QA 14/14; kitchen QA 11/11). Sheets 8.5/8.4. Standing goal and checklist:
  `docs/rebuild/TUTORS_HOLM_COMPLETION_GOAL.md`; proof `docs/rebuild/QUEST_LODGE_V1_2026-09-09.md`.
- **TEACHING KITCHEN v1 LIVE / FUNCTIONAL GRAYBOX (2026-09-09):** the Lesson Green kitchen pad is now the third
  complete Blender-built building. The optional bread lesson runs NPC-free through authored stations (bucket shelf,
  flour bin, water butt, dough trough) and a range that bakes dough and roasts fish; `Tutorial.optional` records the
  bake and survives saves. Asset pipeline, world-v2, content, and headless smoke gates pass (104/104, 60 FPS, zero
  errors); a real-pointer golden path and an 11/11 headless QA are banked. Visual sheets score 8.6/8.4: keep it a
  functional graybox until the fully-designed gate. Remaining pads: Quest Lodge, Mine Gatehouse, Holm Bank, Combat
  Hall, Mage Tower. Proof: `docs/rebuild/TEACHING_KITCHEN_V1_2026-09-09.md`.
- **LESSON GREEN TERRAIN PACKAGE LIVE (2026-09-07):** the next terrain/navigation boundary now has a
  canonical 20-chunk source/bundle, two route contracts, two reserved pads, and a read-only Studio map review.
  Journaled two-file publication rejects mismatched packages and altered navigation; overlapping Survival Wood
  dock overrides are preserved. World and transaction gates pass; foreground smoke passes 104/104 at 60 FPS
  with zero game errors. Quest Lodge/Kitchen remain foundations, not promoted buildings; terrain painting and
  owner art acceptance remain separate work. Proof: `docs/rebuild/LESSON_GREEN_TERRAIN_PACKAGE_2026-09-07.md`.
- **STUDIO CRASH RECOVERY v1 LIVE (2026-07-20):** every multi-file building/district publish now creates a durable
  pre-install journal. Pending transactions block further mutation and can be recovered only from verified backup or
  installed hashes; unknown bytes fail closed. Recovery preserves the staged draft, retires interrupted receipts,
  archives evidence, and handles a fully committed cleanup without undoing it. The 23-lock disposable gate passes.
  This clears the safety prerequisite for the Lesson Green terrain/navigation district package. Proof:
  `docs/rebuild/STUDIO_CRASH_RECOVERY_V1_2026-07-20.md`.
- **FABLE SIDE-WORK RECOVERED (2026-07-18):** retain the validated 101-file tiered gear-icon family and its
  Nano Banana/recoloring pipeline. The generated `male_default.glb` remains an experimental prototype because it
  misses the approved turnaround and has no checked-in Blender source; it is not the boot or canonical opt-in avatar.
  `player.glb` is restored byte-identical to the prior accepted backup. The same recovery repaired `index.html` UTF-8
  mojibake and added a repeatable side-work gate. Proof:
  `docs/rebuild/FABLE_SIDEWORK_RECOVERY_2026-07-18.md`.
- **LOGIN OVERHAUL v1 ACCEPTED (2026-07-18):** the browser welcome screen now uses an original old-school
  fantasy composition with a live three-layer brazier/flame system, safe local-profile selection, explicit
  save-erasure confirmation, character setup, returning-player summary, keyboard/accessibility preferences,
  and responsive presentation. The real fresh and returning flows pass, isolated flame frames prove motion,
  and foreground smoke passes 101/101 at 100 FPS with zero errors. Proof:
  `docs/rebuild/LOGIN_OVERHAUL_V1_CLOSEOUT_2026-07-18.md`.
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
  a 228-tile cardinal route, eight functional building pads, the Tidebridge/inlet, Arrival Cove, Survival
  Pond, elevation bands, deterministic landscape placements, and a reserved 48x40 cavern are data-locked.
  This is an environment blockout, not final building/content acceptance: complete the building/room/door/
  service authoring contract before replacing the pads, and keep NPC production deferred.
- **PHASE 2 COMPACT FLOW CONTRACT LIVE (2026-07-18):** the Holm remains an eleven-station island, but graduation
  is a 20–30 minute, thirteen-action route through five major destinations: Guide Hall, Survival Workyard,
  Mine Gatehouse/Training Cavern, Warden's Ridge banking, and Lastlight. Bread-making, quest orientation,
  extended melee/ranged practice, and magic practice are optional; their buildings enrich the island without
  blocking departure. Relighting Lastlight is now the live final capstone and unlocks the chunk-owned boat.
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
- **TRAINING CAVERN + CORE UI SLICE ACCEPTED (2026-07-16):** the old narrow cavern graybox is replaced by a
  Blender-authored 44×34 three-chamber mining route with irregular ochre terrain, distinct ore fields, smithing
  landmarks, animated torchlight, and two browser-proven ladder interactions from Mine Gatehouse to Combat Hall.
  Inventory, chat, combat, and skills now load the OSRS-directed desktop treatments while the existing minimap is
  preserved. Five direct comparison sheets pass at 9.0–9.1. Foreground smoke passes 100/100 at 60 FPS with zero
  console errors. Closeout: `docs/rebuild/TRAINING_CAVERN_UI_CLOSEOUT_2026-07-16.md`.
- **CAVERN OFFSHOOTS + MINEABLE FAMILY + FULL UI REFERENCE PASS (2026-07-16):** the Training Cavern now uses
  its full 48×40 envelope with narrow tin and clay side galleries. Tin, copper, and clay use one accepted Blender
  rock family and the proven left-click Mining loop; a real browser click produced copper ore with the modelled
  pickaxe. Twenty authored tab/control icons and deliberate panels now route all 18 Bible UI references through
  the comparison pipeline. Seventeen UI surfaces pass at 9.0–9.2; the full parchment quest-detail screen remains
  honestly banked at 8.7. Foreground smoke passes 100/100 at 60 FPS with zero errors. Closeout:
  `docs/rebuild/CAVERN_OFFSHOOTS_MINING_UI_CLOSEOUT_2026-07-16.md`.
- **CAVERN FLOOR + QUEST PARCHMENT CLOSEOUT (2026-07-16):** live-camera review rejected both the first flat
  floor and an over-raised Blender revision. The accepted cavern base is one continuous shallow faceted bowl,
  lifted just above the invisible cardinal walk plane, with topology-led earth-value variation and no floor
  islands or grid bleed. Quest rows now open a dedicated parchment detail page using real quest stages,
  requirements, rewards, icons, and tracking. Both comparison sheets pass at 9.0+; final smoke passes 100/100
  at 100 FPS with zero errors. Closeout: `docs/rebuild/CAVERN_TERRAIN_QUEST_SCROLL_CLOSEOUT_2026-07-16.md`.
- **TRUE-DEPTH CAVERN SUPERSEDES THE SHALLOW FLOOR (2026-07-16):** the owner correctly rejected color-led
  faceting as fake depth. `CavernFloor` is now a genuine clipped heightfield: lesson routes remain near-level,
  excavated earth between them sinks, and irregular perimeter shoulders rise. The global surface grid is hidden
  underground so it cannot flatten the result. The next phase has begun with live Mining impact dust, animated
  depletion, and animated respawn. Preserve this topology and the four-direction route contract. Closeout:
  `docs/rebuild/CAVERN_TRUE_DEPTH_MINING_FEEDBACK_2026-07-16.md`.
- **CAVERN SMITHING LESSON ACCEPTED (2026-07-17):** basement fog no longer leaks into the Training Cavern, and
  cavern lighting is readable without washing out its forms. One Blender-authored station now supplies a recessed
  soot-stone furnace with bellows and a custom-profile anvil with working-context tools. The live lesson is copper
  Mining → tin Mining → one bronze bar → one Bronze dagger. Procedural and modelled players carry the correct tools
  and use distinct Mining, smelting, and smithing poses, sounds, sparks, depletion, and respawn feedback. The new
  12-lock crafting contract, a real pointer-driven copper-to-dagger run, World V2, content, gear, swing, and
  foreground smoke gates pass. The live run caught and fixed displaced station hitboxes and a tall-proxy reach
  deadlock before acceptance. Closeout:
  `docs/rebuild/CAVERN_SMITHING_LESSON_CLOSEOUT_2026-07-17.md`.
- **GAMEPLAY QA STANDARD LIVE (2026-07-17):** larger additions now declare Light, Full, or Swarm QA before
  implementation. Full/Swarm work requires a real-pointer golden path, negative/interruption cases, four-cardinal
  interaction review, persistence, and final foreground smoke. Tester agents are read-only; simultaneous browser
  testers use separate contexts and disposable `?qaProfile=<id>` saves; the main integrator alone repairs and accepts.
  Standard and report: `docs/rebuild/QA_STANDARD.md` and `docs/rebuild/templates/GAMEPLAY_QA_REPORT_TEMPLATE.md`.
- **STUDIO SAFE PUBLISH v1 LIVE (2026-07-17):** building authoring now has a clean-room, transactional publish
  boundary. Chrome/Edge Studio can stage a validated draft only inside an isolated local workspace; deterministic
  exports carry SHA-256 hashes and the CLI refuses stale live targets, backs up before install, verifies exact
  installed bytes, records receipts, and rolls back only when no later edit would be overwritten. This adapts the
  useful isolated-world-builder idea without importing Open-RSC code or assets. Workflow and proof:
  `docs/rebuild/STUDIO_SAFE_PUBLISH_V1.md`.
- **STUDIO GUIDE HALL BUNDLE v1 LIVE (2026-07-17):** the authoring placement and compiled runtime chunk now
  publish as one validated pair. One Guide Hall definition supplies its six live interactions, room/door/support
  contract, collider count, and resource list; the Holm provider no longer hand-writes a competing copy. Studio
  refuses missing, mismatched, or transform-drifted pairs. Preserve this single-source pattern when Workyard and
  landscape data enter Studio. Proof: `docs/rebuild/STUDIO_WORLD_BUNDLE_V1.md`.
- **STUDIO WORKYARD BUNDLE v1 LIVE; U6 CODEX ACCEPTANCE COMPLETE (2026-07-18):** the same transaction covers the Survival Workyard's
  25 interactions, including right-click-only furnishing text and the animated water/fishing services, while the
  future poultry socket remains deliberately non-interactive. Studio switches workspace profiles per building and
  complete room. Studio now separates production-asset, helper, and whole-scene metrics. The U4 dock/pulley Blender
  source was consolidated without changing its 5,204 triangles, animation clips, semantic nodes, or 9.0+ visuals;
  the production asset is now exactly 25,202 triangles / 170 draws against the unchanged lock. Deterministic cardinal
  reach and inspect-only behavior gates pass. A real normal-route pass then proved door/roof and cellar traversal,
  bucket pickup, the animated bucket-to-water transaction, the missing-net fishing case, and walk-first/right-click
  Inspect scenery. Foreground smoke passes 103/103 at 100 FPS with zero errors. Codex structured review is 9.2/10;
  owner whole-room visual sign-off remains open. Proof:
  `docs/rebuild/WORKYARD_U6_CODEX_ACCEPTANCE_2026-07-18.md`.
- **LASTLIGHT ELEVATION FOUNDATION ACCEPTED (2026-07-17):** Tutor's Holm's districts now carry explicit
  tutorial purposes and elevation bands. Mage Headland owns a separate northern shoulder, a roughly 14-tile
  high building-sized crown, and a 40-tile cardinal wrap road; the Mage Tower remains on its own terrace.
  A real minimap click-to-walk climb reached the summit, four-direction blockout review is banked, and foreground
  smoke passes 100/100 at 60 FPS with zero errors. The beacon mesh, relighting behavior, and ferry response are
  the next authored slice, not silently implied complete. Proof:
  `docs/rebuild/LASTLIGHT_ELEVATION_PROVING_SLICE_2026-07-17.md`.
- **LASTLIGHT LIGHTHOUSE FOUR-LEVEL REVISION (2026-07-17):** the rejected spiral is retired. The authored
  Blender lighthouse now exposes four purposeful cutaway floors connected by three ordinary ladders: storm
  stores with a repair dinghy and reserved Underkeep hatch; fishing/signal gear loft; keeper's chart room and
  bunk; and the lantern deck with a player-operated animated beacon. The 21-tile exterior, 17.6-tile clear
  interior and accessible rooftop preserve the circulation contract. Surface pathfinding refuses cliff-height
  cardinal transitions (1.05-tile ceiling) while the authored switchback remains legal at a measured 1.022-tile
  maximum step. Shoulder-height circular walls keep the current floor readable from the elevated camera.
  Blender/GLB gates pass at 15,596 triangles, 71 primitives, 24 materials and 994,236 bytes.
  Proof: `docs/rebuild/LASTLIGHT_LIGHTHOUSE_V1_CLOSEOUT_2026-07-17.md`.
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
