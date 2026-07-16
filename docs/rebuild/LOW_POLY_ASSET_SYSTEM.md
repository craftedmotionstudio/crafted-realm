# Crafted Realm Low-Poly Asset System v1

Date: 2026-07-13  
Status: live; Guide Hall v5 is the first complete asset through the system

## Outcome

Crafted Realm now has a deterministic Blender-to-browser production system rather than a sequence of unrelated
hand-built scripts. The system is designed around one useful separation:

- **Components repeat:** doors, windows, benches, shelves, lecterns, cabinets, banners, roof methods, palettes.
- **Compositions do not:** every complete building still begins with its own purpose, circulation, perimeter,
  roof response, and visual hierarchy.

This provides family consistency without creating cookie-cutter buildings.

## The production package

Every production asset must have:

1. A short purpose and gameplay-camera brief.
2. A one-tile-equals-one-unit Blender builder or carefully maintained `.blend` source.
3. A manifest in `assets/manifests/` declaring source, output, semantic nodes, previews, and class-specific budget.
4. An editable `.blend` source and a runtime `.glb` generated from it.
5. Exterior, roof-off or exploded, top/orthographic, and detail renders appropriate to the asset class.
6. A generated authoring report for geometric rules that image review cannot prove.
7. A passing generic pipeline result from `tools/asset_pipeline.py`.
8. Studio and live-game review, followed by the foreground smoke gate.

For Guide Hall v5 the repeatable command is:

`python tools/asset_pipeline.py assets/manifests/holm_guide_hall_v5.json`

It launches Blender 4.5 LTS, regenerates the source, GLB and previews, then fails if any required contract or
browser budget is broken. `--no-build` validates existing outputs quickly.

## Component library

`tools/blender/cr_lowpoly_assetkit.py` is the deterministic component API used by asset builders. The first kit
contains:

- a contour-following continuous hip roof;
- a full-frame fitted semantic door;
- two-sided stained-glass windows;
- backed civic benches;
- detailed bookcases;
- lecterns with books, ink and quills;
- provision display cabinets;
- heraldic wall banners.

`assets/blender/library/crafted_realm_lowpoly_v1.blend` exposes the same components as Blender Asset Browser
assets for close visual editing. Component origins, scale, palette, naming, and low-poly treatment are shared.
The Python form remains the repeatable source for automated builds; the Asset Browser form supports visual
composition and iteration.

## Architecture rules

### Shell

- One authoritative ordered perimeter owns the external walls.
- Adjacent wall runs share exact endpoints.
- Openings are declared; missing wall pieces are never used as an implicit doorway.
- Full-height internal walls require an actual room or service reason.

### Roof

- The roof is derived from the wall perimeter or from named room volumes, never eyeballed above them.
- Every eave has an explicit seat band that overlaps the wall plate; merely hovering near it fails.
- Complex roofs must have a primary mass, named secondary masses, explicit valleys, and no crossing planes.
- Exterior and top-down review must show continuous fascia and no daylight at the wall plate.

### Doors and windows

- A door contract declares opening width/height and panel width/height.
- The default maximum visual gap is 0.06 tile on each dimension.
- Jambs, lintel, threshold, over-door infill, hinge pivot, and leaf are one fitted system.
- Windows need an outer frame, sill, mullion/transom rhythm, and both interior and exterior faces.
- Stained glass uses a small shared jewel palette; it is a visual/story accent, not random color noise.

### Interiors

- Floor colors may organize a room but cannot be the room's primary evidence of purpose.
- Every functional zone needs one room-scale hero object and at least two believable support objects.
- Major objects are authored in Blender and remain readable at the gameplay camera.
- A generic cube with a wood material is not a finished table, cabinet, stool, fireplace, or storage object.
  Finished furnishings require a designed silhouette, joinery/support structure, readable contents or use marks,
  and variants that preserve family identity without duplicating complete room arrangements.
- Reuse is at component level. Furniture arrangement, wear, contents, color emphasis, and silhouette vary by
  occupation and region.
- Anything that should move in reality needs an animation or remains a deliberately inactive spawn socket; this
  includes flames, hanging signs, water wheels, livestock, and machinery.

## Automated gates

The manifest pipeline currently proves:

- Blender source, GLB, report, and all review renders exist;
- one unit equals one tile;
- authoring-specific checks pass (including roof contact and door fit where relevant);
- required semantic nodes survive glTF export;
- custom pipeline/version metadata survives as glTF extras;
- GLB header and document are valid;
- triangle, primitive, material, and transfer-size budgets pass.

The Studio then proves runtime loading, roof visibility ownership, placement, semantic click targets, browser
draws/triangles, and visual readability. The game smoke gate proves boot, real movement, streaming, save
migration, frame rate, world ticks, and console health. No single gate substitutes for the others.

## Art review loop

1. Gather the relevant `Bible_References/` anchor and identify its defining spatial/occupational features.
2. Write the silhouette, circulation, hero-object, palette, semantic, and budget brief.
3. Author blockout and bare shell; review top-down before detailing.
4. Fit roof, doors and windows; pass geometric contact checks.
5. Compose the interior from kit components and original hero objects.
6. Run the manifest pipeline.
7. Review exterior, roof-off, plan, door/contact, interior detail, and gameplay camera.
8. Integrate the same GLB in Studio and the live game.
9. Bank the comparison and record a direct visual review. Owner rejection always supersedes a prior score.

This loop applies next to environment props and buildings. Worn gear and characters will use the same manifest,
semantic-node, preview, export, and budget structure with class-specific rig and animation checks.

## Technical foundation

The system intentionally follows Blender's native direction: registered Asset Libraries are indexed for reuse;
collection exporters support repeated glTF iteration; object custom properties export as glTF `extras`; and GLB
is a single browser-friendly delivery file. Khronos' glTF Validator remains the external format conformance
reference. These upstream mechanisms support the workflow, while Crafted Realm's manifests and geometric art
checks provide the game-specific quality layer they do not supply on their own.
