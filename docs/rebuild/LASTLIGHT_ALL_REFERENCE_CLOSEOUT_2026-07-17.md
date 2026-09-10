# Lastlight exhaustive all-reference closeout — 2026-07-17

## Outcome

Every supplied `Lighthouse_*` reference has now been audited object by object rather than treated as a broad mood board. Every static architecture, furniture, prop, landscape detail, interaction marker, and existing-system dependency is explicitly accounted for in `docs/rebuild/LASTLIGHT_REFERENCE_INVENTORY_V3.md`. Each reference has its own banked side-by-side comparison and a direct Codex environmental visual score of at least 9.3/10; no averaged score hides a weaker view.

| Reference | Authored coverage | Score |
|---|---|---:|
| `Lighthouse_Ref1.png` | pale connected cylinder, fitted entrance, gallery and corbels, complete rail, glass lantern crown, central mechanism, red faceted roof, finial/weather fixture, maintenance furniture, crag rocks, cliff guardrail and luminous signal marking | 9.4 |
| `Lighthouse_entrance.jpg` | human-scale arched oak leaf, full jambs/lintel, straps, handle, threshold, curved-wall fit and cliff-edge rail language | 9.3 |
| `Lighthouse_FloorMap.png` | three circular floors, two ladder transitions, ground hatch, water-bearing basement relationship, enlarged irregular Underkeep and return ladder | 9.3 |
| `Lighthouse_Interior.png` | full pale walls, warm boarded floor, dresser, fitted windows, wall shelf, individual and nested crockery, modeled cobweb, bed corner and slow wall lanterns | 9.3 |
| `Lighthouse_Interior2.png` | bed/mattress/pillow/blanket, dresser, low blanket chest, full bookcase/books, desk/ledger, chart table, weather instrument, wall shelf, windows and lanterns | 9.4 |
| `Lighthouse_Dungeon.png` | 38×30 cavern, three true elevation shelves, tidal pool and banks, rock bridge, recessed wall alcoves, drowned green wreckage, return ladder, lanterns, stalactites, stalagmites, moss, rubble, wet stones and bones | 9.3 |

The reference spiral remains intentionally replaced by the owner-approved ladder system. The pictured Larissa-equivalent keeper, humanoid cave dwellers, large aquatic/reptilian predator, and smaller cave-predator silhouettes are explicitly catalogued as modeled character/NPC assets. They are not counted as completed static environment art and will not be substituted with primitive placeholders.

## Asset and runtime proof

- Editable Blender source: `assets/blender/environments/holm_lastlight_lighthouse_v1.blend`
- Runtime model: `assets/models/environments/holm_lastlight_lighthouse_v1.glb`
- Asset Factory: PASS — 28,760 triangles, 119 primitives, 49 materials, 2,073,424 bytes.
- Functional dungeon footprint: 38×30 tiles.
- True runtime floor regions: three tower floors plus the Underkeep lower floor and three raised cavern shelves.
- Tidal water is non-walkable; raised shelves use real elevation values rather than color-only depth.
- Interior and dungeon lantern flames retain separate meshes and slow cozy animation.
- Dungeon camera uses a cavern-scale minimum view distance.
- Production GLB cache version advanced so the browser cannot reuse the pre-audit model.

## Real gameplay and regression QA

- The world-v2 contract passes all locks after correcting stale checks that still expected the rejected four-floor design.
- Content validation passes with no referential-integrity errors.
- The previous real-pointer lighthouse path remains banked: exterior door, both ladders up/down, hatch descent, raised-to-lower cavern walk, and return ladder.
- The final clean foreground smoke profile passed 101/101 at 100 FPS, 166 draw calls, and zero captured errors after loading the newly versioned production GLB.

## Evidence

- `Bible_References/Complete/_compare/holm_lastlight_exterior_v3_compare.png`
- `Bible_References/Complete/_compare/holm_lastlight_entrance_v3_compare.png`
- `Bible_References/Complete/_compare/holm_lastlight_floormap_v3_compare.png`
- `Bible_References/Complete/_compare/holm_lastlight_interior_v3_compare.png`
- `Bible_References/Complete/_compare/holm_lastlight_interior2_v3_compare.png`
- `Bible_References/Complete/_compare/holm_lastlight_dungeon_v3_compare.png`
- Four-direction proofs: `scratchpad/holm_lastlight_lighthouse_v1/lastlight_cardinal_sheet.png` and `dungeon_cardinal_sheet.png`
- Floor overview: `scratchpad/holm_lastlight_lighthouse_v1/floorplan_sheet.png`
- Exhaustive inventory: `docs/rebuild/LASTLIGHT_REFERENCE_INVENTORY_V3.md`

## Next boundary

The environmental reference pass is closed only against the exhaustive inventory above. The next lighthouse art boundary is the separately modeled character/NPC family visible in the references: keeper/guide, humanoid cave dweller, large aquatic predator, and smaller cave predator. Each must receive its own concept, Blender source, animation set, four-cardinal review, comparison evidence, and gameplay purpose. The Underkeep quest/reward layer can then use those models without changing the accepted circulation, scale, or environment language.
