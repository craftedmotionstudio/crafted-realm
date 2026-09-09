# Cellar Quiet Corner v1 — direct Codex visual review

Concept-to-Blender closeness: **9.1 / 10 — approved for game integration**.

- **Silhouette and proportions — 9.2:** the tall notched fireside chair and lower curved spindle chair are immediately distinct, while the table and basket retain the concept's compact supporting scale.
- **Large shape hierarchy — 9.1:** the high chair anchors the group, the low chair balances it, and the table/basket create a readable inward conversational triangle.
- **Color and material separation — 9.0:** aged oak, honey rush, russet cloth, charcoal repair iron, willow, three wool colors, and earthenware remain distinct without texture noise.
- **Reference-defining features — 9.1:** crooked uprights, faceted finials, crescent-notched crest, uneven rails, shaped arms, woven fan seat, five spindles, fitted repair collar, seven-sided tripod table, cup, handled basket, wool, needles, and trailing yarn are all present.
- **Gameplay-camera readability — 9.3:** the chair silhouettes, pale rush seat, colored wool, cup, and basket handle survive the elevated view beside a 1.8-unit player.
- **Animation and interaction readability — 9.0:** no prop requires autonomous motion; both chairs and both supporting objects have separate semantic roots for Sit or Examine, while player sitting remains correctly deferred to the canonical humanoid pass.
- **Family consistency — 9.2:** the restrained face-color ramps and hand-shaped construction belong beside the approved cellar chest and torches without copying either asset.

Known controlled difference: the concept's loose shawl is simplified into three chunky folds so it remains readable and does not demand cloth simulation at the gameplay camera.

## Human-scale revision — 2026-07-14

The initial live integration failed the character-scale review even though it passed the isolated concept comparison:
the 2.54-tile high chair was substantially taller than the approximately 1.9-tile player and its 0.88-tile seat
sat near the character's waist. Version 2 bakes separate scale corrections into the actual Blender mesh data.
The tall chair is now 1.79 tiles high with a 0.62-tile seat; the low chair is 1.38 tiles high with a 0.57-tile
seat. The table and basket were scaled independently so each retains a believable domestic function.

Direct in-game scale and readability review: **9.2 / 10**. The high-backed chair remains the visual anchor without
being made for a giant, the work chair is visibly smaller, the table reaches seated-hand height, and the basket
reads as portable. A real canvas click on the resized woven chair completed its Sit interaction.
