# Asset Factory v2 — scale-first object production

Asset Factory v2 sits above the proven Blender/GLB pipeline. It does not lower the 9.0 visual gate or replace
custom topology. It removes repeated bookkeeping and makes scale, function, semantic parts, proof order,
collision and interaction explicit before detailed modeling begins.

## Why v2 exists

The first quiet-corner model matched its isolated concept but failed in the game because the high-backed chair
was 2.54 tiles tall beside a roughly 1.9-tile character. Shape fidelity alone was not enough. Every new recipe
therefore carries numeric human-scale locks, and the ordinary asset pipeline now fails any authoring report that
falls outside them.

## The recipe is the technical source of truth

Recipes live in `assets/recipes/`. Each one owns:

- concept image, prompt and style standard;
- canonical player height and every required numeric scale range;
- manifest paths, semantic nodes, animation clips and performance budgets;
- fixed proof order and minimum direct Codex comparison score;
- north/south/east/west installed-contact renders plus a recorded collision-audit verdict for schema 3 recipes;
- room placement, collision, interaction and in-game proof requirements;
- deterministic proof and approved-library commands.

The descriptive catalog remains the durable art/gameplay record. Asset Factory checks that its asset ID, editable
source and runtime GLB agree with the recipe.

## Commands

```powershell
# Produce the scale/function brief before concept generation or modeling.
python tools/asset_factory.py brief assets/recipes/cellar_ladder_hatch_v1.json

# Check an approved asset without rebuilding Blender.
python tools/asset_factory.py check assets/recipes/cellar_quiet_corner_v1.json

# Rebuild Blender, proof sheet, comparison, GLB validation, factory result and approved library.
python tools/asset_factory.py run assets/recipes/cellar_quiet_corner_v1.json

# Repeat every gate against existing Blender/GLB output.
python tools/asset_factory.py run assets/recipes/cellar_quiet_corner_v1.json --no-build
```

`sync` deterministically updates the ordinary manifest from its recipe. Review the resulting diff before keeping
it. `check` fails if the manifest has drifted, so silent hand edits cannot weaken the scale or budget gate.

## Required production order

1. Write the recipe and generate its brief.
2. Generate a scale-aware concept showing the canonical player and one-tile grid.
3. Approve silhouette and proportions before detailed topology.
4. Add construction detail and reference-defining features.
5. Add restrained shared materials and face-color variation.
6. Render gameplay-camera and construction proofs.
7. Batch the installed object from north, south, east, and west; audit every direction and moving pose for bad
   contacts, clipping, floating parts, missing surfaces, and pivot errors.
8. Reach the asset in its real room; exercise interaction and collision.
9. Produce the comparison sheet, achieve 9.0+, then pass factory, world and smoke gates.

Schema 2 recipes are grandfathered records. New recipes are schema 3 and must provide
`proof.cardinalTurnaround` paths for `north`, `south`, `east`, `west`, `sheet`, and `review`. The factory fails
closed if any image is absent or the four-view audit verdict is not `PASS`.

## What becomes faster

- Human-scale defects fail before integration.
- Related objects share one family recipe, palette, proof setup and build command.
- Manifests and scale rules no longer need to be remembered across files.
- One command reproduces the Blender source, GLB, proof artifacts, validation and approved library.
- The next artist or agent receives an exact brief instead of rediscovering function, scale and semantics.

## What remains intentionally handcrafted

Nano Banana concepts and automatic scaffolding do not replace authored topology. Distinctive silhouettes,
joinery, surface treatment, wear, animation and gameplay placement still require direct visual judgment. The
factory accelerates repeatable work; it does not return to colored-primitives release art.
