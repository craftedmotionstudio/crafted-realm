# Crafted Realm — reference-driven art production pipeline

Status: **Browser 1.0 production contract**  
Owner direction locked: 2026-07-13

Visual-authoring reset: **2026-07-14**. A file passing through Blender is not, by itself, a designed
Blender asset. The owner rejected visible stacks of colored cubes, cylinders, cones, and beams as final
art. Existing scripted Blender assemblies remain useful functional grayboxes, but they must pass the
fully-designed gate below before they can be promoted again.

This is the single top-level contract for consistently producing Crafted Realm's environments,
buildings, props, characters, monsters, worn equipment, icons, effects, and animation. Detailed tool
recipes may remain in `PIPELINES.md`, `CHARACTER_PIPELINE.md`, and Studio documentation, but they may not
weaken the gates here.

The target is the **readability, authored density, silhouette quality, and functional detail associated
with Old School RuneScape**, interpreted through Crafted Realm's own names, geography, models, textures,
characters, and lore. References teach visual grammar; they are not permission to copy proprietary
meshes, textures, maps, dialogue, or branded designs.

## 1. Current production baseline

Repository snapshot on 2026-07-13:

- 39 images in the live `Bible_References/` root queue and 120 reference images recursively.
- 35 side-by-side sheets in `Bible_References/Complete/_compare/`.
- 97 GLB files under `assets/models/`, about 337.8 MiB including raw/backup experiments.
- A real r128 Studio, comparison-sheet tooling, a modelled player, character concepts, rigged GLB work,
  worn-gear fitting, runtime animation hooks, content validation, and a performance smoke gate.

The problem is not lack of experiments. It is promotion discipline: raw, reference-only, Studio-ready,
game-ready, and release-ready assets are not consistently separated. Browser 1.0 uses only assets that
pass the complete contract below.

## 2. The immutable visual grammar

Every asset family shares these rules:

1. **Readable at the game camera.** Silhouette, major color blocks, interactable edges, entrances, held
   weapons, and attack intent must read from the elevated gameplay view. Invisible micro-detail does not
   compensate for a weak silhouette.
2. **Warm low-poly form.** Deliberate planes, chunky proportions, restrained facets, and soft/cozy color
   relationships. Avoid Minecraft cubes, Roblox smooth-plastic figures, photoreal PBR imports, noisy
   texture detail, and thin fragile geometry.
3. **Purposeful detail.** Detail explains construction, occupation, ecology, wear, use, story, or
   interaction. Random clutter is not authored density.
4. **Shared scale.** One world unit is one tile. Assets are checked beside the player mannequin, a door,
   a one-tile marker, and neighboring assets before approval.
5. **Shared material language.** Reuse audited wood, fieldstone, plaster, lime mortar, thatch, tile,
   cloth, leather, bronze/iron/steel, vegetation, bone, ash, and water palettes. New materials extend a
   family; they do not invent an unrelated rendering style.
6. **Motion where expected.** Water, flame, smoke, flags, sails, foliage reactions, creatures, doors,
   machines, and characters cannot ship as lifeless stand-ins when motion is essential to their read.
7. **Original IP.** Match the reference's quality and design principles, not its protected asset data.
8. **Performance is part of appearance.** An asset that causes stalls, pop-in, or poor frame rate is not
   visually complete.

### 2.1 Blender provenance is not Blender design

Blender is the authoring and export environment, not a quality label. A model is still a graybox when its
visible result is predominantly recognizable, minimally altered primitives arranged together—even when a
Python builder created those primitives inside a genuine `.blend` file.

Primitive starter meshes are allowed. Raw primitive appearance is not. A fully designed asset requires:

- an asset-specific silhouette with deliberately edited vertices and meaningful secondary/tertiary forms;
- topology and planar breaks chosen for that object's construction, wear, anatomy, or function;
- fitted joins, thickness, openings, supports, and transitions without accidental intersections or floating
  parts;
- controlled asymmetry and proportion variation where a hand-built or organic object calls for it;
- authored color placement that follows form: deliberate face ramps, vertex color, or restrained low-resolution
  textures rather than one uniform color per generic shape;
- custom normals/flat shading and bevels chosen per edge role, not one generic modifier applied everywhere;
- a clean editable `.blend` source with semantic collections, pivots, dimensions, and material names;
- a proof sheet showing shaded, clay/silhouette, wireframe, material-ID, and actual gameplay-camera views.
- an installed-contact turnaround showing the final object from north, south, east, and west in every moving
  pose that can alter its contacts (open doors/chests, extended ladders, occupied chairs, and similar states).

Automation may perform repetitive Blender operations, but silhouette, topology, materials, and construction
decisions must be asset-specific. A render alone cannot prove this gate; the wireframe and editable source are
part of the acceptance evidence.

## 3. One asset record from request to release

Every promoted asset needs a catalog record with:

- stable semantic ID and display name;
- family and gameplay role;
- source/reference images and enumerated visible features;
- authoring source and final runtime file/builder;
- license/provenance, including AI tool/plan/date when applicable;
- intended dimensions, footprint, pivot, facing, and placement count;
- interaction/collision owner;
- material/palette family;
- triangle, draw-call, texture, bone, and clip budgets;
- required animation clips and named events;
- status: `reference`, `concept`, `source`, `review`, `final`, `integrated`, or `retired`;
- comparison sheet, review score, smoke result, and version.

Raw generations, backups, and failed variants remain source/archive material. They never enter the runtime
manifest by filename accident.

## 4. The repeatable production loop

### Gate A — brief and reference inventory

Before authoring:

1. Crop or identify the relevant reference view.
2. Enumerate every visible object and major design feature.
3. Mark each as reusable, needs revision, missing, reference-only, or out of launch scope.
4. Record gameplay purpose, placement count, footprint, interaction, motion, and camera distance.
5. Set the visual and technical budgets before building.

Create an Asset Factory v2 recipe at this gate and generate its brief. The recipe must include the canonical
1.9-tile player, one-tile grid, numeric bounds for every scale-critical measurement, semantic parts, proof order,
collision, interactions and integration evidence. Run `python tools/asset_factory.py brief <recipe>` before
concept generation or detailed topology. See `docs/rebuild/ASSET_FACTORY_V2.md`.

This prevents “headline object” recreations that omit the surrounding details responsible for the image's
quality.

### Gate B — family design

Design the family before the individual asset:

- Buildings begin with a construction kit, dimensions, roof language, windows, doors, service spaces,
  and region palette.
- Equipment begins with tier silhouettes, slot coverage, grip/attachment standards, and icon language.
- Characters begin with the canonical body proportions, skeleton, material regions, face language, and
  gear-clearance envelope.
- Monsters begin with a locomotion/rig archetype and combat read.

One excellent asset followed by unrelated variants is a failed pipeline. A family must reproduce quality.

### Gate C — isolated authoring

Build in the r128 Studio or Blender against fixed presets:

- neutral three-quarter inspection camera;
- actual elevated gameplay camera;
- standard warm daylight plus night-readability preset;
- player/door/tile scale mannequins;
- reference panel and silhouette view;
- triangle/draw/material/texture counters;
- animation controls when applicable.

Scale and silhouette are a separate first approval inside Gate C. Do not proceed to construction detail or
materials until the recipe's numeric scale contract passes. The ordinary `asset_pipeline.py` now enforces those
measurements from the computed authoring report; a beauty render cannot override a failed scale value.

Before leaving Gate C, the proof sheet must demonstrate the fully-designed requirements in §2.1. Recognizable
primitive stacking, default topology used as the final silhouette, uniformly colored component blocks, clipping,
or unexplained floating detail returns the asset to source status regardless of how attractive the beauty render
looks.

The Studio must eventually support all release families, not only procedural `ref_*` builders. It needs GLB
loading, clip selection/scrubbing, attachment previews, character/monster turntables, day/night lighting,
and automatic capture presets.

### Gate D — structured visual review

Review in this order:

1. silhouette and proportions;
2. large shape hierarchy;
3. palette/material grouping;
4. reference-defining features;
5. gameplay-camera readability;
6. animation and interaction readability;
7. family consistency.

The cardinal turnaround is a required acceptance gate for every new or materially changed object. Capture the
installed object from **north, south, east, and west** with the same lens, scale, lighting, and pose. Review all
four images for clipping, coplanar flicker, floating supports, impossible wall/floor contacts, pivot errors,
open-state collisions, missing backs/undersides, and silhouette failures. Bank both the four source images and a
2x2 contact sheet with a written PASS/FAIL note for each direction. A failed direction returns the asset to its
Blender source; camera tricks and scene nudges do not satisfy the gate.

Use `tools/blender/render_cardinal_turnaround.py` to batch the four Blender renders and
`tools/make_cardinal_contact_sheet.py` to compose the audited sheet. Asset Factory schema 3 requires the four
images, sheet, and review record; schema 2 remains readable only so already-approved assets are not silently
invalidated. All newly created recipes use schema 3.

Codex direct structured comparison at **9.0 or better** is the sole visual gate of record. Per the user's
2026-07-13 decision, no second-model visual review is required. Bank the side-by-side sheet and the written
findings so the decision remains inspectable.

For every Nano Banana-directed item, the banked sheet must show the approved Nano Banana concept beside the
actual final Blender shaded render and overlay a **concept-to-Blender closeness score**. A score below 9.0
returns the item to Blender before game integration. Use `tools/make_compare.py` with explicit concept/render
labels; do not substitute a generated concept image for the Blender side.

### Gate E — technical validation

The final runtime asset must:

- load in game Three.js r128 and tool Three.js r160;
- have finite bounds, correct +Y-up orientation, correct facing/pivot, and declared scale;
- stay within its family/placement-count budget;
- use supported materials and bounded texture sizes;
- contain only intended nodes, skins, clips, materials, and textures;
- preserve semantic interaction and collision separately from the visual mesh;
- produce no console errors or leaked resources after load/unload.

### Gate F — integration and replacement

Integrate through the asset catalog and chunk/building/spawn data—never a self-starting timer. A final
modelled asset replaces old procedural visuals of the same semantic type, while existing collision,
interaction, respawn, and save behavior remains intact unless deliberately migrated.

### Gate G — in-game acceptance

From a normal save and real traversal:

1. walk to the asset without teleporting;
2. inspect it at normal camera distance, rotation, daylight, and night;
3. use every interaction and enter every relevant space;
4. exercise animations, equipment, damage/death, roof-off, or moving parts as applicable;
5. capture the in-scene comparison;
6. run `?smoke=1` and compare performance/resource counts with the pre-integration baseline.

Only then can status become `integrated`. Only a release build/playtest can promote it to release-ready.

## 5. Family-specific contracts

### Environments, landscape, and buildings

- Author a small kit per region: ground/elevation, path/edge, wall, roof, opening, fence, vegetation,
  water/drainage, signage, lighting, and occupation clutter.
- Buildings use larger believable footprints and contain a primary service, secondary use, story clue,
  entrance, navigable interior, support/storage space, roof-off behavior, and collision/path validation.
- Reuse components, not whole cookie-cutter buildings. Vary footprint, massing, frontage, roofline,
  materials, wear, occupation, and landscape response.
- Build a complete camera-visible scene comparison, not only isolated hero props.
- Repeated geometry is merged/instanced and loaded by visible chunk.

### Player and humanoid characters

- One canonical rig, rest pose, bone naming scheme, proportions, material regions, attachment bones, and
  gear-clearance envelope.
- Lightweight customization changes approved regions/features without creating separate incompatible rigs.
- Required base clips: idle, four-direction locomotion presentation, combat-ready idle, attack families,
  block/parry, hit reaction, death, gathering, production, interaction, and emotes selected for launch.
- Root motion stays off; game movement owns tile position. Feet, hands, held items, and impact frames are
  checked at the gameplay camera.
- NPC character production begins only after the chunk/environment stability gate. NPCs reuse the same
  standards and are added last through spawn data.
- Browser 1.0 uses one canonical humanoid body/rig standard. Modular hair, faces, body presentation,
  clothing, colors, equipment, and accessories create breadth; important characters may receive distinctive
  silhouettes and authored overlays without introducing incompatible animation/gear systems.

### Monsters and bosses

- Build reusable rig families first: biped, quadruped, crawler, winged, serpentine, or declared exception.
- Every combat creature needs readable idle, move, attack wind-up/impact/recovery, hit, death, and any
  block/special/tell clips its mechanics require.
- Boss silhouettes and telegraphs remain readable without particle noise. Visual timing aligns with the
  600 ms simulation tick; animation never changes exact combat resolution.
- Variants may share a rig but require meaningful silhouette/material/behavior differences—not recolor-only
  inflation.
- Launch target: 8–12 genuinely distinct enemy families plus three major bosses. Boss anchors cover an
  iconic preparation-heavy lair beast, an unpredictable Scarlands anomaly, and a readable endurance
  capstone. The roles may evoke what makes classic encounters memorable, but creatures, models, arenas,
  attacks, lore, rewards, and tuning remain original.

### Weapons, armor, tools, and worn gear

Every equippable asset is a three-part deliverable:

1. inventory/ground 2D icon;
2. worn or held 3D representation;
3. animation/fit verification for its styles and body presentations.

Use canonical grip points and slot envelopes. Test every helm with hair rules, every body/leg set through a
full locomotion and combat matrix, shields with block poses, capes with movement, and tools with their skill
actions. Tier families share construction logic while improving silhouette, finish, and prestige. No severe
clipping, floating grips, invisible icon detail, or one-off hand-tuned fit that breaks other bodies.

Launch presentation: Copper is a crude starter subset; bronze, iron, and steel are complete conventional
families; Aurel and Veyrite become increasingly distinctive Crafted Realm tiers; Cinderbound is the prestige
boss family. Scope still follows supported gameplay—do not create unused equipment merely to fill a sheet.

### 2D items and interface art

- Items remain purpose-made 2D sprites in inventory and on the ground; worn/world gear remains 3D.
- One icon camera, lighting, background-removal, outline, scale, and padding template applies to the set.
- Verify recognition at actual slot size, stack-number contrast, color-blind differentiation, and tier
  consistency.
- UI references inform density, hierarchy, borders, typography, and interaction grammar without copying
  copyrighted UI assets pixel-for-pixel.

### Animation and effects

- Clip naming, duration, loop mode, event markers, and ownership are data—not ad hoc per model.
- Visual impact markers align with simulation events; the simulation remains authoritative.
- Blend transitions cannot cause foot sliding, T-pose flashes, weapon pops, or rest-pose snapping.
- Anything that moves in reality uses a baked clip or one approved shared engine effect.
- Reduced-motion/reduced-flash settings receive alternate effects without hiding gameplay information.
- Launch baseline covers idle, walk/run presentation, combat-ready stance, stab, slash, crush, ranged,
  magic, block, hit, death, woodcutting, mining, fishing, cooking, smithing, crafting/building,
  gathering/pickup, doors/interactions, and an initial set of roughly six expressive emotes.

## 6. Consistency fixtures to build before asset scale-up

Phase 2 must produce:

- a versioned palette/material library;
- player, door, tile, counter, bed, and ceiling scale mannequins;
- fixed Studio camera/lighting/night presets;
- canonical humanoid skeleton and attachment/gear-fit test scene;
- monster rig-archetype test scenes;
- a clip/event naming contract and animation matrix;
- a GLB validator and runtime manifest generator;
- a 2D icon template and contact-sheet generator;
- an asset catalog/provenance schema;
- automatic side-by-side and in-game capture presets;
- per-family budgets based on placement count and the v2 smoke budgets.
- four owner-approved anchors before production scales: Hollow Well Square as the environment benchmark;
  the player in a complete bronze set as the humanoid/gear benchmark; one important friendly NPC after the
  environment gate; and one common monster plus one boss as the creature/animation benchmark.

These fixtures are the manufacturing tooling. Large-scale asset production does not begin until they are
stable enough that two assets made weeks apart look like the same game.

## 7. Definition of done

An asset is not done because a file exists, a Studio render looks attractive, or a comparison sheet is
banked. It is done only when:

- its reference inventory and family brief are complete;
- it meets the shared style and family contract;
- its source/provenance and final runtime artifact are cataloged;
- it passes isolated and gameplay-camera visual review;
- all required clips/interactions/gear fits work;
- it is integrated through data and correctly replaces obsolete visuals;
- real traversal and use pass with no console error;
- the smoke/performance/resource gate passes;
- its comparison evidence and pass log are saved.

## 8. Production order

1. Lock this contract and remove contradictions from older pipeline documents.
2. Upgrade the Studio and create the consistency fixtures/catalog/validators.
3. Finish the v2 region/building/landscape kit and prove Hollow Well Square at release quality.
4. Lock the canonical player body, customization, gear-fit, icon, and animation standards.
5. Produce the essential launch equipment families and skill tools.
6. After the environment gate, produce the small essential NPC cast and shared humanoid clips.
7. Produce launch monster rig families, common creatures, bosses, and combat telegraphs.
8. Fill remaining props/icons/effects region by region; never build an unplaced content warehouse.
9. Run whole-scene consistency passes at Tutor's Holm, Hollow Well, each production road, Gloomfen, and
   the Scarlands before content lock.

This order makes the world coherent before populating it and makes every later character, monster, weapon,
and animation cheaper to produce consistently.
