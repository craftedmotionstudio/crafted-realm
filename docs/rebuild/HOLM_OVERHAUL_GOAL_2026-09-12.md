# Tutor's Holm — full world and visual overhaul

Owner direction: 2026-09-12. ACTIVE. This supersedes earlier visual acceptance, existing-pad preservation, and incremental polish priorities. It supplements the active full-island completion objective; it does not remove any functional requirement.

## Revised objective

Owner clarification, 2026-09-13: the planned buildings are still too square. Each building must have architectural character through its overall footprint and massing: connected unequal wings, projecting rooms or supported upper jetties where appropriate, recessed entrances, hipped/cross-gabled roofs, and a castle with projecting towers and offset connected ranges. Changing trim or color on the same square shell does not satisfy this request. Match the Bible references' environmental appearance and texture language as well as building shape. Review the relevant earlier Crafted Realms chats to recover repeated unmet requests. The concept02 map records this revision; it does not certify built or playable replacements.
Rebuild Crafted Realms' Tutor's Holm as a cohesive, richly authored, cozy old-school RPG island, guided by the original project vision and Bible_References. Treat the current visible island as a rejected prototype: redesign terrain, settlement composition, buildings, vegetation, water, interiors, player appearances, NPCs, props and presentation from first principles wherever necessary. Retain an existing element only after demonstrating that it serves the new composition and meets the reference standard. Deliver varied, traversable elevation; a castle/fortified settlement; distinct building families; a creek and purposeful crossings; convincing shorelines and planted spaces; caves and underground exploration; and furnished houses with usable upper floors. Complete all original tutorial lessons, modeled/animated characters, items, equipment, crafting, combat, services, saving, Lastlight and ferry departure. Use editable Blender assets and Studio Safe Publish; preserve proven exact combat/XP, four-cardinal tile navigation and player saves with deliberate migration. Verify style and function together in the in-app browser. The first completed area establishes the visual language; it is not a substitute for completing the whole island.

## What the owner rejected
The visible result feels blocky, unfinished, plain, barren and flat. The owner cannot identify an in-game visual they like. Earlier self-assigned scores and completed checkboxes therefore do not establish current visual acceptance. More roof trim, clutter or color variation on the same primitive composition is not the requested overhaul. Low-poly is a deliberate style; raw primitive assemblies are not final art.

## Retention policy
- Retain as engineering candidates: exact combat/XP, inventory/bank/item identities, save isolation/migration, cardinal navigation, chunk residency, interaction semantics, animation infrastructure, transactional authoring, and useful tests. Revalidate when topology changes.
- Retain as design intent: original IP/lore, guided teaching sequence, Lastlight capstone, ferry departure, purposeful interiors and services. Recompose physical locations where needed.
- No visible asset, building footprint, map outline, old screenshot score, or previous model acceptance is automatically grandfathered. Evaluate geometry, materials and animation against the new scene and references before reuse.
- Preserve old source/assets as recoverable history during replacement. Do not erase functioning systems or owner saves to simulate starting fresh.
- Do not preserve brittle coordinate tests at the expense of the redesigned world. Replace them with tests of the new approved contracts, while retaining meaningful regression coverage.

## Reference findings actually inspected
- Bible_References/A_Tutorial_Island_Option.jpg: compact two-storey stone landmark, small planted spaces, sandy shore, linked bridge/stair routes, objects with clear purposes.
- Bible_References/Tutorial_Island_Building.jpg: human-scaled multi-room stone interior, thick openings, useful furnishings, material definition, readable circulation.
- Bible_References/Landscape_Option.jpg: sloped coastal ground, layered rock/shore forms, dense-but-readable vegetation, fences and paths defining spaces.
- GOAL.md section4: walled moat-castle tutorial settlement and instruction in movement, melee/ranged/magic, gathering, equipment, bank and shops.
- TUTORIAL_ISLAND.md: distinct guide/instructor houses; survival pond; chef; quest guide; substantial underground mining/smithing/melee/ranged route; surface bank; friendly mage tower and spell-on-chicken lesson.
- docs/rebuild/ART_PRODUCTION_PIPELINE.md: authored silhouette/topology/material language and meaningful density; Blender provenance alone is not visual quality.
Use OSRS as a visual-language reference, not a source of copied assets, map layouts or branded content.

## Proposed island composition (design direction, not installed topology)
1. Sheltered arrival cove: irregular sand/rock edge, rising footpath and working landing.
2. Guide settlement: furnished two-storey stone guide house beside a small enclosed court; views toward a compact castle/keep, not a giant empty hall.
3. Creek valley: headwater-to-sea flow, banks and bends, a bridge with a reason to cross, survival pond/wet edge, woodland clearings and a working kitchen garden.
4. Village: timber-and-plaster instructor cottages, a kitchen/bakehouse with distinct roof and chimney, a quest lodge/home with an accessible loft or upper room. Different silhouettes and plans within a shared material palette.
5. Fortified ridge: a compact castle/keep and gatehouse, bank/service courtyard, stone retaining walls, stairs/ramps and a legible skyline. Existing lesson services may be redistributed within this ensemble.
6. Underground: a convincing entry, connected ore workings, furnace/anvil workshop, separate safe teaching and creature spaces, and a useful alternate surface exit. Mining/smithing/combat are real lessons.
7. Mage/headland: friendly tower, planted approach, usable floors, Lastlight beacon and an earned coastal descent to the ferry.
Heights, footprints, creek route and lesson locations are design variables, not frozen coordinates. Required walking remains cardinal; cliffs and water must guide the route rather than create accidental traps.

## Delivery sequence and acceptance
- [ ] Inventory original references and remaining intent; choose explicit visual anchors for each family and record retain/rebuild decisions.
- [ ] Author a whole-island topographic/route plan: coast, creek drainage, height bands, bridges, castle, settlement, cave connections, upper floors, services, views and short optional exploration loops.
- [ ] Build one complete arrival-to-guide-house slice in an isolated authoring workspace, including terrain, water edge/crossing, vegetation, exterior, furnished interior and accessible upper floor. Start with forms/scale/materials, then refine; do not proliferate unproven grayboxes.
- [ ] Review that slice against references at the actual gameplay camera and in Studio: silhouette/proportions, material identity, landform/shore quality, composition/density, doors/routes, vertical traversal, animation and performance. Record owner's response when available; never invent owner approval from an internal score.
- [ ] Apply the established language across the entire redesigned island, including cave system and all upper floors. Every area needs purpose and transitions; no remaining barren prototype expanses or unreviewed old buildings.
- [ ] Complete original required gathering/crafting/melee/ranged/magic/service lessons and all modeled/animated player/NPC appearances. Prior optional/deferred labels cannot silently delete the original teaching requirements.
- [ ] Migrate saves/positions and item/service state; verify returning adventurers and fresh characters, full inventory, interruptions and rewards.
- [ ] Complete a full real-input island journey in the in-app browser; verify all ladders/stairs, rooms/caves, bank/shop flows, combat, Lastlight and ferry; run foreground smoke and performance gates.
- [ ] Bank editable sources, comparison evidence, reference provenance, test results and remaining decisions; close only after the full revised objective is proven.

## Immediate priority
The world composition and first fully designed playable slice now lead the work. Existing small bug audits remain recorded, but they must not turn the overhaul into an indefinite sequence of unrelated test fixes. Fix foundational defects when they block the new slice, then continue authoring the requested world.

## Tracker limitation
The active app goal remains open. The available goal API cannot edit an active objective's text (only complete or blocked status); do not falsely mark the old objective complete to replace it. This file, GOAL.md, GUIDING_LIGHT.md and the completion checklist carry the owner's governing revision for every continuation.

### Concept01 artifact (2026-09-12)
A reviewable whole-island composition is now at `docs/rebuild/holm-overhaul/index.html` with editable `plan.json`.
In-app map selection/layer controls verified. This is a proposal: heightfield, actual path/collision, drainage,
vertical rooms and visual assets are still unbuilt. See `HOLM_OVERHAUL_WORKSPACE_HANDOFF_2026-09-12.md` for
why the old terrain authoring path must be extended before safe installation. Next work is implementation,
not another paper-only acceptance claim.


Owner clarification, 2026-09-13: emphasize substantial gray brick/stone wall fields and the old-school low-poly asset character. Build multiple recognizable tree silhouettes, with sparse irregular vegetation appropriate to meadow, creek, woodland and exposed coast. Bible image details guide original counterparts; generic uniform scatter is insufficient. `docs/rebuild/holm-overhaul/plan.json` records habitat direction. This adds fidelity requirements and does not narrow full-island functionality.
