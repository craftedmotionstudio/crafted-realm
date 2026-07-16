# Crafted Realm — Nano Banana concept standard

Status: owner-approved direction, 2026-07-14

Every new 3D asset concept begins with this exact art-direction sentence:

> Similar to Old School RuneScape's 2007-era low-poly art style and hand-modelled
> simplicity, while remaining an original design and not copying any exact asset.

The prompt must then make the production constraints explicit:

- large, readable polygon planes and a deliberately hand-shaped silhouette;
- flat or vertex-color-like shading with a small warm palette;
- minimal surface texture; construction and wear come from topology and color placement;
- readable from Crafted Realm's elevated gameplay camera;
- no glossy mobile-game finish, dense beveling, PBR realism, Minecraft, or Roblox language;
- any real moving part is identified before Blender authoring so its pivot and clip can be built correctly.

Nano Banana output is a concept reference, not a runtime asset. Promotion still requires an editable
Blender source, a custom-topology proof packet, exported animation where applicable, Studio/gameplay review,
and the normal smoke/performance gates in `ART_PRODUCTION_PIPELINE.md`.

## Mandatory concept-to-Blender comparison

Every item must bank a comparison image in `Bible_References/Complete/_compare/` containing:

1. the owner-approved Nano Banana concept on the left;
2. the final shaded Blender render on the right;
3. an overlaid direct Codex closeness score and concise review note;
4. the next-pass target when the score is below 9.0.

The minimum promotion score is **9.0 / 10**. A lower score is useful review evidence, but it cannot be
called final or integrated. The score measures silhouette/proportion, large shape hierarchy, palette and
material separation, reference-defining features, gameplay-camera readability, animation-readiness, and
family consistency. It is never raised merely to satisfy the gate.
