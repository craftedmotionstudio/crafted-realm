# Workyard basement — sprint completion

The basement's visible environment pass is complete, live, and **owner-approved-for-now as of 2026-07-15**. Every
furnishing family is accounted for by a Blender source, runtime model, concept comparison, human-scale check, and
purposeful room placement. The room is frozen while work moves upstairs.

## Complete and live

- Two-way ladder travel, registered floor, cardinal movement, collision, camera transitions, and black-void protection.
- Owner-feedback rework of the traversal pair: a flush pegged surface hatch with a true dark shaft, readable six-plank
  lid, forged bands and animation; plus a separate three-tile, one-colour oak ladder leaning against the cellar wall
  with no visible downstairs hatch, recess, hooks, pads or lashings.
- Irregular masonry cutaway shell and tightly laid flagstone/lime-mortar floor.
- Ten new Blender furnishing families: reserve shelf, supply barrel, lidded crock, grain sack, handled basket,
  provision table, root basket, cutting board/knife, aisle rug, and masonry hearth.
- Sixteen placed instances from the optimized furnishing GLB, with ten right-click Inspect descriptions and no remaining graybox
  versions of those families.
- One visible animated masonry hearth with a more legible five-second cozy flame loop; smaller 0.72-scale wall torches,
  restrained glow, west-shelf readability light, and shelf stores resized to remain below every plank.
- Animated Storm Reserve Chest with ration state, icon, opening creak, reverse creak, and closing impact.
- Quiet corner with two character-scale chairs pushed against the east wall, seven-sided table, yarn basket, and Inspect descriptions.
- Distinct wooden ladder-step sound cues for climbing down and climbing up.
- Stable Test Travel coordinates for the ladder landing, reserve chest, shelf, provision table, hearth, and quiet corner.
- Direct Codex concept gates of 9.0–9.4 for every new family; the traversal rework gates at 9.0 for the hatch and 9.4
  for the wall ladder.

## Intentionally deferred

1. **Canonical humanoid animations.** Proper climb and seated character clips belong to the shared character rig pass;
   the traversal and chair mechanics already work without them.
2. **Shared-library promotion.** Room acceptance does not automatically promote every furnishing family into the global
   reusable catalog; reuse still requires its recorded comparison score and fit for the new room.
3. **Global ambience.** Continuous cellar room tone should be added with the game-wide music/ambience mixer, rather than
   as a one-off loop. The local hearth interaction cue is already present.

The authoritative item-by-item record is `docs/rebuild/WORKYARD_CELLAR_ITEM_LEDGER.md`.
