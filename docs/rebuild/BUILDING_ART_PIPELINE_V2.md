# Building Art Pipeline v2 — Character Before Decoration

Date: 2026-07-13  
Status: superseded in detail by `LOW_POLY_ASSET_SYSTEM.md`; Guide Hall v5 is the current fitted-architecture proof

## Decision

Buildings are now authored in **Blender first** and exported as original low-poly GLB assets. JavaScript owns
streaming, collision, roof/door state, and semantic interactions; it is no longer the primary modelling tool for
finished architecture. Guide Hall v3 now proves the replacement path: one editable `.blend` source exports one
consolidated GLB loaded by both Studio and the live game. The former procedural Guide Hall is retired from runtime.

This change addresses the owner's central rejection: adding trim, props, and roof ornaments to a rectangular
shell does not create architectural character.

## Shape grammar

Every important building starts with a room/program diagram and must pass these silhouette rules before detail:

1. At least three purposeful masses tied to real rooms or services.
2. At least one polygonal, chamfered, diagonal, curved, or offset volume.
3. At least two roof heights or roof directions, with a clear primary/secondary hierarchy.
4. The entrance is composed as an arrival space, not merely a door cut into the centre of a rectangle.
5. The top-down footprint must not read as one square/rectangle with decorative projections.
6. Exterior irregularity must remain navigable on the one-tile, four-direction movement grid.
7. Repetition happens at the component level—windows, beams, doors, roof caps—not at the whole-building level.
8. Every wing, bay, tower, courtyard, porch, or apse must have a gameplay or world-story purpose.
9. Model one authoritative exterior perimeter from a shared vertex loop. Adjacent wall runs share endpoints;
   do not overlap complete room shells to fake a compound building.
10. Review the bare wall plan before roofs or trim. The only full-height shell gaps must be named doors, gates,
   windows, or deliberate open-air transitions.
11. Important buildings declare a `shapeClass` (compound, L, U, courtyard, polygonal, tower, bridge-house,
    terrace, or deliberately-simple cottage). Nearby important buildings may not repeat the same class by
    default. A simple square/rectangle is a minority exception for small cottages and sheds, not the baseline.
12. A roof overhang, porch, or decorative bay does not rescue a rectangular top-down footprint. At least one
    unusual mass must own a real room, service, courtyard, connector, stair, or sublevel transition.

## Blender kit

Build a small original asset library instead of modelling every building from nothing:

- 1/2/4-tile plaster, stone, and timber wall runs;
- 45-degree and clipped corner pieces;
- octagonal/hexagonal bays and towers;
- gable, hip, lean-to, polygonal, and intersecting roof modules;
- porches, steps, arcades, buttresses, balconies, chimneys, shutters, doors, and windows;
- room-scale hero pieces such as counters, hearths, tables, shelves, signs, and staircases;
- one shared warm flat-shaded material palette.
- authored furniture families with material, proportion, wear, and contents variants: tables, stools, shelves,
  cabinets, rugs, hearths, ladders/stairs, chests, barrels, sacks, paintings, crockery, and occupational kits.

Blender's Asset Browser should catalogue these as linked/reusable components. Buildings remain original
compositions assembled from the kit, never cookie-cutter prefabs. The deterministic component implementation is
`tools/blender/cr_lowpoly_assetkit.py`; the visual Asset Browser library is
`assets/blender/library/crafted_realm_lowpoly_v1.blend`.

## Runtime contract

GLB nodes use stable names so the game can retain semantic control:

- `roof_*` — hidden as a group when the player enters;
- `door_*` — pivot nodes animated by the runtime;
- `anchor_service_*`, `anchor_clue_*`, `anchor_support_*` — interaction attachment points;
- `floor_*` — navigable interior visual surfaces;
- `collision_hint_*` — authoring guides only; final collision remains pure game data.

The game and Studio load the same GLB. The Blender source, GLB, placement/interaction definition, and comparison
sheet are the four required production artifacts.

Every new production asset also requires a manifest in `assets/manifests/` and must pass
`tools/asset_pipeline.py`. See `docs/rebuild/LOW_POLY_ASSET_SYSTEM.md` for the complete package and gates.

## Budget and export

- Flat shading; no subdivision workflow for architecture.
- Prefer hand-authored low topology; use Decimate only as cleanup, not as art direction.
- One shared palette and as few material slots as the silhouette permits.
- Target per complete hero building: under 15,000 triangles, no more than 18 palette materials, and no more than
  40 renderable mesh primitives after semantic-safe consolidation. Routine buildings should target 12 materials
  and 25 primitives. Exceptions require a measured gameplay-camera benefit and a passing full-scene browser gate.
- Apply transforms, remove hidden faces, keep one tile equal to one Blender unit, and export GLB/glTF 2.0.
- Recheck draw calls, disposal, load recovery, and mobile-safe performance in the real browser.

## Approval loop

1. Write the building's purpose and room flow.
2. Produce three Blender massing studies.
3. Review both an elevated game-camera render and true top-down silhouette.
4. Owner selects or redirects the footprint language.
5. Build roof-off interior, semantic pivots/anchors, collision data, and final component detail.
6. Load the same GLB in Studio and the game.
7. Compare directly against the visual reference, then run the full smoke/performance gate.

No building is called visually accepted when the owner rejects its shape language, regardless of an earlier
Codex score.

Guide Hall v3 exposed an additional failure mode: an interesting plan can still look random when separately
authored room shells overlap. Guide Hall v4 is the corrected proof. Its 26x24 shell is one endpoint-sharing
perimeter, with functional zones expressed by floor, furniture, and subordinate roof masses instead of floating
full-height partitions.
