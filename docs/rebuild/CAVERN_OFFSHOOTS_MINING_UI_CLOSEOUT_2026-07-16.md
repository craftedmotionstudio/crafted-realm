# Cavern Offshoots, Mineable Rocks, and Complete UI Reference Pass

Date: 2026-07-16

## Accepted work

- Expanded the Training Cavern to its full 48×40 reserved envelope and added two narrow side galleries: a north tin spur and a south clay spur. The main entry-to-exit route, two-ladder contract, and four-direction movement remain unchanged.
- Added a genuine Blender-authored mineable-rock family at `assets/blender/props/mining_rocks_v1.blend`, exported once to `assets/models/props/mining_rocks_v1.glb`. Tin, copper, and clay share a squat angular silhouette while using distinct mineral faces.
- Added Clay as a real item and Mining reward. Tin, copper, and clay all route through the established gather loop: best carried pickaxe, walk into reach, timed swings, Mining XP, inventory reward, depletion, and respawn.
- Corrected the Blender/runtime semantic boundary discovered by live testing. Blender's child `kind` metadata is removed on import so ray-picking reaches the authoritative mineable host rather than treating the model as scenery.
- Added permanent Test Travel bookmarks for the tin and clay offshoots.
- Replaced emoji tab placeholders with 20 authored raster icons and expanded the side panel to cover all 18 Bible UI references. New deliberate surfaces include clan, friends, ignore, emotes, music, and logout.

## Proof and comparisons

- Mining rock Blender proof: `scratchpad/mining_rocks_v1/` (gameplay plus north/south/east/west).
- Rock comparison: `Bible_References/Complete/_compare/Mining_Rocks_Tin_Copper_Clay_v1_compare.png`, accepted at 9.1/10.
- UI icon atlas and 18-reference coverage manifest: `scratchpad/ui_reference_pipeline/`.
- Eighteen UI comparison sheets: `Bible_References/Complete/_compare/UI_*_v2_compare.png`.
- Seventeen UI directions score 9.0–9.2. `UI_QuestScrollScreen` is deliberately banked at 8.7 because a full parchment quest-detail modal still needs its own authored pass.

## Live acceptance

- Real browser hover: `Mine Copper rock / 3 more options`.
- Real left click with a Bronze pickaxe walked into range and produced `You manage to mine copper.` in game messages.
- Content integrity passes with 137 items.
- World V2 and Training Cavern contracts pass every lock.
- Final foreground smoke: PASS 100/100; 513 ms boot, 60 FPS, 19 ms worst frame, 173 draw calls, 33,160 triangles, exact stream/save position, zero console errors.

## Banked next step

Build the dedicated parchment quest-detail screen, then return to the next authored Tutor's Holm environment slice. Multiplayer-only UI panels are presentation-complete but correctly remain nonfunctional until shared worlds exist.
