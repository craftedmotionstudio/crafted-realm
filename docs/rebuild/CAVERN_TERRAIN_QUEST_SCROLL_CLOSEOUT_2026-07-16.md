# Cavern Terrain + Quest Scroll Closeout - 2026-07-16

## Outcome

This slice closes the two remaining presentation gaps from the preceding Training Cavern and UI pass:

1. The cavern base no longer reads as a flat tile card.
2. The quest journal now has the full parchment detail surface represented in the Bible references.

## Training Cavern terrain

The accepted Blender source is `assets/blender/environments/holm_training_cavern_v1.blend`; the runtime export is
`assets/models/environments/holm_training_cavern_v1.glb`. The builder remains
`tools/blender/build_holm_training_cavern_v1.py`.

The floor is one continuous low-poly mesh made from three irregular nested elevation rings and a triangulated
center. Elevation is intentionally shallow because runtime movement remains on the cardinal tile plane. Restrained
material changes are assigned to the floor's real polygons so the excavation reads as hand cut without separate
decorative slabs. The authored visual is lifted 0.055 tiles above the invisible walk plane to prevent grid bleed.

Live review explicitly rejected two intermediate states:

- a flat top slab that exposed the underlying grid;
- flattened boulder shelves that became large foreground terrain islands.

The accepted live capture is `scratchpad/holm_training_cavern_v1/live_bowl_final_v4.png`. It shows grounded player,
rocks, and anvils; unobstructed cardinal lanes; a shallow irregular basin; and no coplanar shimmer. The movement and
collision contract remains flat by design, so this visual improvement cannot introduce diagonal or height-path bugs.

## Quest parchment

`src/ui_quest_scroll.js` extends the existing `UI`, `Quest`, `Player`, `QUESTS`, and item-icon systems without owning
new quest state. `src/quest_ui.js` routes quest-row clicks to the parchment presentation, while the existing tracking
action remains authoritative. `src/ui_reference_finish.js` supplies the parchment treatment and `index.html` owns the
single modal shell and load order.

The page renders real difficulty, giver, description, prerequisite quests, every journal stage, XP rewards, item
rewards, quest points, and tracking state. The accepted browser capture is
`scratchpad/ui_quest_scroll_live_v3.png`.

## Visual gates

- `Bible_References/Complete/_compare/Training_Cavern_v2_compare.png` - 9.0/10.
- `Bible_References/Complete/_compare/UI_QuestScrollScreen_v3_compare.png` - 9.1/10.

The cavern review covers continuous silhouette, shallow proportions, readable floor hierarchy, warm earth material
separation, gameplay-camera visibility, grounded interactions, and consistency with the mineable rock family. The UI
review covers parchment hierarchy, reference-like title and body treatment, readable steps, compact rewards, existing
side-panel family consistency, and real click behavior.

## Verification

- Blender source rebuilt and GLB exported successfully.
- `node --check` passes for the touched UI and cavern JavaScript.
- `node tools/test_world_v2.js` passes every World V2, Holm flow, and Training Cavern lock.
- Real browser click opens the new parchment detail page.
- Final foreground smoke: 100/100 structural, boot 347 ms, 100 FPS, 12 ms worst frame, 118 draw calls, 5,074
  triangles in the sampled scene, exact save/load position, zero uncaught errors, and zero console errors.

## Next boundary

The cavern terrain and core UI reference set are accepted. The next environment work should improve cave atmosphere
and mining feedback only if it preserves this topology and performance: localized dust, slightly brighter far-chamber
fill, ore-depletion visuals, and swing-impact particles. Do not reopen the floor as disconnected decorative meshes.
