# WORLD_QUALITY.md — the world-quality overhaul (user directive 2026-07-03)

The big push: make the world feel like real OSRS — detailed buildings you can stand in, thoughtful
placement, real elevation + smooth movement, richer flora, a proper UI, and life (pet, sewer, default hero).

> **HARD LESSON baked in (2026-07-03):** headless worktree agents CANNOT see the world — they hallucinate
> coordinates and object tags (pass-2 smithy/stall/bank all placed at wrong/nonexistent anchors). So:
> **agent work must be SELF-CONTAINED** (new builders/models/DOM, or upgrades to a shared builder) — it may
> NOT guess world placement coords. Anything needing eyes-on-world placement or review is a **MAIN-SESSION**
> (browser) task, done by Claude with the Chrome MCP, not a headless agent.

Legend: 🤖 = agent-buildable (self-contained) · 👁 = eyes-on main-session (browser) · 🎨 = heavy asset pipeline (Blender/GLB)

## A. Immediate / concrete
- [x] 👁 **Loading buffer screen** — DONE (game5_main showEnterBuffer: themed overlay holds ~2.4s while props settle, then fades). FOLLOW-UP PERF: the settle is a multi-second RENDER FREEZE (all ~15 prop IIFEs build synchronously on the first `running` tick) — stagger the prop builds across frames OR build them during the boot bar, so the buffer covers a smooth load not a hard freeze. — game is slow right after "enter world". Show a loading overlay with
      progress bound to the boot step sequence (`game5_main.js` populate steps) + first-frame gate; only
      reveal the world when built. (The current "Click here to play" fires before the world finishes.)
- [ ] 👁 **DEBUG PASS — fix pass-2 placements** (smithy / stall-goods / bank interior). Root cause: agents
      invented anchors. FIX: query the REAL Veyhollow smithy/forge, the REAL market-stall groups, and the
      REAL bank hall interior positions in-browser, re-anchor the 3 prop files, re-gate, promote. *(user: "definitely want")*

## B. Placement discipline (applies to ALL objects, forever)
- [ ] 👁 **Thoughtful-placement audit** — NO clustering (not 5 torches/trees/fountains jammed together).
      Every object deliberately placed. When a modeled variant exists, don't line up identical copies.
- [ ] 🎨+👁 **Fountains** — make BOTH `Fountain.jpg` + `Fountain_Option2.jpg` real models; place them in
      DIFFERENT locations (don't put both fountain types side by side). Variety across the map.

## C. UI track (its own effort) — *user: "start the UI track as its own effort"*
- [x] 🤖 OSRS interface overhaul — **COMPLETE for all existing HUD surfaces** (2026-07-03): side-panel/chatbox stone chrome + color orbs (ui_osrs), Combat panel (ui_combat), minimap bronze bezel + orb cluster (ui_minimap), Prayer+Magic icon grids (ui_prayer_magic), Skills grid (ui_skills), Equipment paper-doll + Quests journal (ui_equip_quest), Settings panel + OSRS numeral font-stack (ui_finish). NO un-reskinned panes remain — Emotes/Clan/Friends panes don't exist in this build (they'd arrive with future V2 social features). Real chat-channel filtering is a LOGIC change (not a reskin) → deferred to a gameplay pass, not a UI-appearance slice. 
      (orig) from `Bible_References/UI_*.jpg` (~17 screens) + `User Interface/`.
      DOM/CSS/HUD — self-contained, agent-friendly. Own workstream: tabs, chatbox, combat interface,
      equipment/inventory, emotes, clan chat, minimap frame, etc. Match the reference screens.

## D. Flora quality — *user: trees don't look good, need detail*
- [ ] 🎨 **Evil tree RE-EXPORT** — current GLB is a dense conifer; needs a gnarled/bare dead-tree mesh.
- [ ] 🤖/🎨 **Tree detail pass** — many trees look flat. Add detail; consider **mesh "stickers"** (small
      textured planes/decals on trunk/canopy features) to add bark/leaf texture. Upgrade shared builders.
- [ ] 🤖 **Plants & bushes** — better, more detailed procedural bush/plant/flower builders.

## E. Buildings task force — *user: "cookie-cutter cracker boxes", can't stand inside*
- [ ] 👁+🤖 Review EACH building individually — exterior AND interior. Find the matching OSRS reference
      (`Bible_References/`), make the character-in-building view look like OSRS.
- [ ] 🤖 **See-through windows** (currently opaque); add **blinds** to some; make each building UNIQUE.
- [ ] 🤖 **Roofs** — more detailed + textured.
- [ ] 👁 Interior scale — you should be able to "stand up" inside (headroom / storey height check).

## F. World geometry & movement — *user: floating castles, teleport-between-layers, want elevation*
- [ ] 👁 **Collision/floating audit** — buildings clipping moats, castles floating. Walk & fix.
- [ ] 👁 **Smooth elevation movement** — character teleports between land layers; make walking across
      elevation changes smooth + animated (like OSRS). Engine/movement work.
- [ ] 👁 **Add elevation** — mountains, caves. Reviewed, deliberate.
- [ ] 👁 **Ladders** — climbing building levels via a ladder doesn't feel right; review the plane/climb.
- [ ] 👁 **Chunk-by-chunk review** — a "walk the whole map" pass; every tile/chunk has a purpose & reads right.
- [x] Sidewalk/paving — DONE: 9 paving models (prop_paving.js) + merged-plaza builder (world_paved_plaza.js, 1 draw call) + PLACED on the real Commons plaza (world_pave_commons.js, 354 tiles, collides-guarded, muted grey palette). Gemini + Claude eye: matches OSRS town square. Fountain area now paved.
      models (agent builds models; 👁 places them thoughtfully).

## G. Content & life
- [ ] 👁+🤖 **Sewer system** — a nearby **manhole/crate** to climb down into a large sewer network (new area).
- [ ] 🎨 **Pet dragon** — NOT given at start; **unlockable via the storyline**. A cute dragon, MODELED NPC
      with full animation. (Heavy pipeline — Blender/Hunyuan.)
- [ ] 🤖/🎨 **Default character** — a main character (V02 or another V0#) SELECTED BY DEFAULT, with **male
      AND female** options, both with complete animations.

## Sequencing
1. NOW (main session): loading screen, DEBUG PASS. 2. Launch agent workstreams (UI track, flora, sidewalks,
   char-default). 3. Building task force + collision/elevation/chunk reviews (eyes-on, staged). 4. Heavy
   pipeline (evil-tree re-export, pet dragon, fountains) as deliberate Blender sessions.

## ⚠ PAVING PLACEMENT — reverted (too heavy), needs merged geometry
First attempt (world_paving_place.js) carpeted ~500 multi-mesh paving tiles over the plaza synchronously
→ hard render freeze + huge draw-call count. REVERTED. Correct approach: build the plaza paving as ONE
MERGED BufferGeometry (like prop_grass_tufts does — 1 mesh, 1 draw call), OR a single large textured
ground plane, placed on the real Commons plaza tiles. Models in prop_paving.js are fine; the PLACEMENT
needs the merged approach. (Perf lesson: same class as the prop-settle freeze — never add hundreds of
groups at once.)
