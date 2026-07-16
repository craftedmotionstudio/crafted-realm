# Survival Workyard upstairs and waterworks — production ledger

This is the authoritative checklist for the surface room, covered court, exterior occupation yard, and proposed
waterworks. It incorporates the basement lessons: one visible owner per object, a Blender source for every visible prop,
player-scale fixtures, purposeful placement, right-click Inspect for scenery, real animation for moving parts, and a
banked concept-to-Blender comparison of **9.0 or better** before an asset family is called complete.

## Scope and sequencing

The work is intentionally split into gated slices. The dock is not “too much,” but it is a gameplay system rather than
decoration and must not be tangled into the shell repair.

1. **U1 — Structural sanitation:** doors, one hatch assembly, floor/terrain separation, landscape exclusions, windows.
2. **U2 — Purposeful interior:** hearth, work table, storage, mugs, rugs, bucket spawn, readable circulation.
3. **U3 — Occupation exterior:** coherent timber hierarchy, log rack, chopping block/axe, and a decision on the pen.
4. **U4 — Waterworks dock:** L-shaped dock/bridge, pulley, bucket animation, splash/audio, and inventory transaction.
5. **U5 — Fishing lesson:** use the existing small net first; fishing rod content may follow as a separate lesson.
6. **U6 — Room acceptance:** interaction sweep, collision sweep, smoke/performance gate, comparison packet, owner review.

## U1 — Structural sanitation

| ID | Family / defect | Required result | Blender / data owner | Status |
|---|---|---|---|---|
| U1.01 | Trail door | Player-scaled fitted leaf covers threshold-to-lintel opening; plaster continues above the frame | Workyard Blender source | Corrected in revision 8; 2.50 high x 1.55 wide with over-door wall infill |
| U1.02 | Pond door | Same player-scale and over-door wall contract as trail door | Workyard Blender source | Corrected in revision 8; 2.50 high x 1.50 wide with over-door wall infill |
| U1.03 | Surface cellar traversal | Exactly one approved floor hatch assembly; no legacy lid, duplicate ladder, rim, or rung set underneath it | Traversal GLB + one semantic socket in building GLB | Complete in revision 6 |
| U1.04 | Interior terrain | No grass or terrain z-fighting through lodge, passage, hearth room, or covered court floors | Landscape pad + floor/walk-surface contract | Implemented in revision 7; live owner review pending |
| U1.05 | Interior landscape intrusions | No streamed tree, rock, fence, or planning prop overlaps a completed building footprint | Holm landscape data | Complete; landscape acceptance gate 13/13 |
| U1.06 | Workyard windows | Two or three transparent, muted bottle/stained-glass windows seated in real wall openings, flush to the wall with visible sill/reveal | New Blender window family + shell openings | Corrected in revision 10: the hearth window moved off the fireplace wall and every colored pane overlaps its mullions so the complete opening is glazed |
| U1.07 | Exterior timber hierarchy | Remove incoherent decorative beam scatter; retain posts/rails/braces only where they carry or lock a bay | Workyard Blender source | Corrected in revision 10: structure is deterministically assigned to the exterior wall face, leaving interior art and fixtures unobstructed |
| U1.08 | Cardinal circulation | Both doors, hatch approach, hearth passage, and work court remain reachable by four-direction movement | Building data + browser verification | Revision 8 route and minimum-width contracts pass; final room sweep remains in U6 |
| U1.09 | Roof transition | Entering fades the complete roof/band/storey shell away quickly; exiting restores it with the same reversible ease when roofs are enabled | Shared `RoofTransitions` runtime, not a Workyard-only animation | Implemented as a 0.22-second smoothstep material transition with a deterministic unit gate; live foreground timing remains in U6 |

## U2 — Purposeful upstairs interior

| ID | Family | Purpose / placement contract | Animation / interaction | Status |
|---|---|---|---|---|
| U2.01 | Upstairs teaching hearth | Cooking/firemaking focus; derive the proven basement fire system but give the upstairs hearth its own mantle, cooking crane, and brighter room-scale silhouette | Slow cozy flame; teaching interaction remains primary | Refined in revision 10: solid north fireplace wall, recessed full soot insert and floor, brighter independently moving flame layers and warm light pulse |
| U2.02 | Survival work table | Tool maintenance, not a generic dining rectangle; modeled joinery, hatchet/wedge/whetstone placement, clear work side | Primary tool lesson; right-click Inspect after lesson | Refined in revision 10: contrasting willow top/apron and a toothed hand-saw blade, grip and grip opening improve gameplay-camera definition |
| U2.03 | Crockery/storage cabinet | Player-scale fitted hutch against a wall; nothing penetrates shelves | Right-click Inspect | Refined in revision 10: symmetrical shaped sides, centered fitted doors and latches, shelf-relative crockery and upright plate racks |
| U2.04 | Mug shelf | Separate wall shelf with three to five modeled mugs, readable silhouettes and no shelf intersections | Right-click Inspect | Refined in revision 10: mug handles center on capped wall pegs, eliminating every unsupported floating cup |
| U2.05 | Lodge rug | Woven variation derived from the proven basement rug workflow; subdued workroom palette | Scenery: left click walks, right-click Inspect | Complete: subdued blue/gold runner marks the clear standing and circulation zone |
| U2.06 | Hearth-room rug | Related family, different border/medallion pattern; does not obstruct lesson table | Scenery: left click walks, right-click Inspect | Complete: separate octagonal red/blue/gold safety rug with no collision |
| U2.07 | Empty bucket | One believable empty bucket spawn inside the lodge, visibly reserved for the waterworks lesson | Take action once; saved spawn state | Visual asset complete: open stave bucket at player scale; inventory transaction remains correctly gated to U4 |
| U2.08 | Story/service fixtures | Keep storm tally, firemaking board, and fishing-preparation stand only if each remains readable, reachable, and tied to a lesson | Existing semantic interactions | Revision 12 replaces the trapped wall net with a floor-standing crate, painted buoys, grounded rope coil, A-frame and weighted net while preserving the single `net_rack` semantic owner |

## U3 — Exterior occupation yard

| ID | Family | Required result | Status |
|---|---|---|---|
| U3.01 | Covered court | Supports and braces align to the roof load and circulation; no random fence-like sticks | Refined in revision 12: owner review removed all five exposed underside rafters that blocked the elevated exterior view; the fitted roof, wall ledger, continuous eave beam, three outer posts, stone feet and two high knee braces remain |
| U3.02 | Sawn-log rack | Authored irregular logs with readable cut ends, restrained variation, rack contact, and optional rope restraint | Integrated from the dedicated U3 Blender GLB; fixed transform, collision, walk-first Inspect behavior, r160 and live r128 proof all pass |
| U3.03 | Chopping block | Used stump/block with cut marks and believable ground contact | Integrated from the dedicated U3 Blender GLB; continuous lofted stump, fixed circular collision, and accepted gameplay-camera contact |
| U3.04 | Embedded axe | Purpose-built axe head and handle seated into the block at a plausible angle | Integrated from the dedicated U3 Blender GLB; exact proof transform retained and no separate invisible collision added |
| U3.05 | Current chicken pen | Remove from the first polished surface pass unless it earns a real poultry lesson; preserve a data socket for later rather than shipping an empty random enclosure | Complete in revision 11: visual, interaction and five fence colliders removed; one non-visible deferred `chicken_spawn_socket` remains |
| U3.06 | Shore approach | Clear cardinal path from pond door to dock without colliding with logs, court posts, or future waterworks | Refined in revision 12: continuous mortar and irregular cement courses underlap the east foundation, retain low stone edges, own no collision and preserve `u4_waterworks_shore_socket`; final live walk remains in U6 |
| U3.07 | Fishing-preparation cluster | Purposeful court artwork with a crate, stacked floats/buoys, rope and a nearby net; open placement, no modern plastic and no anonymous wall geometry | Complete in revision 12: Nano Banana concept, integrated Blender source, isolated proof and 9.2/10 comparison are banked under `scratchpad/workyard_shore_gear_v1/` |

## U4 — Waterworks dock

Recommended shape: an **L-shaped dock/footbridge** leaves the Workyard shore, reaches over fishable water, turns right,
and lands on the adjacent bank. The bend creates a memorable silhouette and separates the fishing edge from the bucket
station.

| ID | System / asset | Acceptance contract | Status |
|---|---|---|---|
| U4.01 | Dock shell | Authored low-poly deck, piles, braces, rope/rail rhythm, dry cardinal walk path, shore contacts at both ends | Integrated and accepted: three walk surfaces form the L-route over the raised freshwater pond; the far end is the reserved U5 fishing platform |
| U4.02 | Pulley station | Modeled frame, axle, crank, rope, hook, and lesson bucket; no free-floating parts | Integrated from the dedicated Blender GLB; modeled crank owns the forgiving interaction hitbox |
| U4.03 | Animation | Idle → lower → water contact → crank/lift → settle; moving parts are Blender-authored and readable at gameplay camera | Accepted live after preserving original GLTF node names so all Three.js clip tracks bind to their intended nodes |
| U4.04 | Water response | Small contact splash/ripple and restrained splash sound exactly when the bucket reaches water | Complete: live ripple, droplets, restrained splash, crank creak and bucket-settle cues use the authored clip events |
| U4.05 | Inventory rule | Requires one empty bucket; atomically removes it and adds one bucket of water; no reward on full inventory or interrupted action | Complete: deterministic 21/21 contract gate plus hands-on live transaction proof |
| U4.06 | Save/state | Indoor bucket spawn and filled-bucket transaction survive save/reload without duplication | Complete: empty and filled buckets are core items; manual save/reload retained `bucket_water` and one applied operation ID |
| U4.07 | Interaction | Walk-to/reach gate, left-click `Operate`, right-click Inspect, useful game-message feedback for missing bucket | Complete: the visible crank is the primary target, with a stable operator anchor and right-click Inspect |

## U5 — Fishing lesson boundary

- **Status: integrated and accepted on 2026-07-16.** The separate Blender family adds three underwater mirrorperch,
  subtle ripples/bubbles, an open modeled creel, three animation clips, and stable operator/reward sockets at the accepted
  U4 terminal platform.
- The first lesson uses the existing **Small net**. It awards exactly one Raw mirrorperch and 28 Fishing XP through a
  deterministic 25/25 contract, interrupts without reward, and immediately saves a bounded exact-once operation ledger.
- The pulley and fishing spot share the dock but retain separate visible owners, hit targets, animations, sounds, and state.
- Blender and live r128 north/south/east/west contact audits pass. The concept comparison scores 9.0/10; foreground smoke
  passes 100/100 at 60 FPS, 169 draw calls, 19 ms worst frame and zero errors.
- A fishing rod, bait family, additional catches, and cooking expansion remain later content and must not reopen U5.

## U6 — Complete room acceptance

- **Status: partially proven, owner review still required.** U3, U4 and U5 individually pass their asset, interaction,
  save, cardinal, and foreground performance gates. The basement remains frozen/accepted for now.
- Remaining work is a single whole-space pass over the surface/upstairs: every left/right-click option, every cardinal
  route and collider, ordinary door/roof entry timing, object scale and placement as a composition, and owner sign-off.
- The r160 Studio loads the complete Workyard and all definition locks pass, but its HUD mixes production and semantic
  helper draws. Split asset-only/helper metrics in U6; do not raise the real 170-draw gameplay budget, which currently
  passes at 169.

## Asset proof and room acceptance gates

Every new visible family must have:

1. a brief with function, canonical player scale, dimensions, semantic parts, collision and animation needs;
2. a Nano Banana reference in the project’s cozy 2007 low-poly direction without copying protected game assets;
3. an editable Blender source, exported GLB, catalog/manifest row, and isolated five-view proof;
4. a side-by-side concept → Blender comparison with a direct Codex score of **9.0+**;
5. an in-game gameplay-camera screenshot proving scale, contact, orientation, material separation and no collisions;
6. left-click behavior appropriate to function, right-click Inspect for reachable scenery, and no accidental primary actions;
7. a foreground `?smoke=1` pass with zero console errors and performance inside the current budgets.

No slice is complete merely because a GLB exists or because Blender was used. The visible result must pass the hand-designed
quality gate and the room must still make spatial and gameplay sense.

## Production lessons carried forward

- **Freeze approved rooms.** The basement is a dependency, not something the surface builder should regenerate on every
  upstairs iteration.
- **One visible owner per object.** A building may keep a semantic interaction socket, but a replacement GLB must not sit
  on top of a second visible fallback asset. Revision 6 therefore retains one `cellar_ladder` socket and the terrain-dark
  occluder, while the approved traversal GLB owns the visible hatch.
- **Building reservations must exclude landscape dressing.** Two trees and one fence were not “inside the Blender model”;
  they came from the chunk landscape catalog. The catalog now gates passive prop extents against both completed building
  footprints.
- **Separate build targets by ownership.** The old all-in-one Workyard script spent 264 seconds rebuilding an unrelated
  cellar and still had not rendered/exported. The surface-only target completed its full build, three proofs, save and GLB
  export in 140 seconds. Further speed work should split shell and furnishing families so unchanged geometry can be reused.
- **A structural pass is not an art pass.** Taller doors, clean traversal ownership, and landscape clearance do not approve
  the current windows, table, hutch, rugs, log rack, axe, pen, roof treatment, or exterior beams.
- **A tall wall does not require a tall door.** Revision 7 incorrectly stretched the entrance to the eave to cover a wall
  gap, producing a barn-scale leaf more than twice the apparent character height. Revision 8 locks cottage openings to
  the 1.85-tile player: 2.50 tiles high, 1.55/1.50 tiles wide, slender timber frames, and authored plaster above the
  lintel. The wall continues independently; the door no longer substitutes for missing architecture.
- **Windows must subtract wall, not decorate it.** Revision 7 divides the plaster and masonry around two window-sized
  voids, then seats sills, lintels, frames, and alpha-blended glass inside those openings. No opaque wall remains behind
  the panes.
- **Floor clearance needs a deliberate tolerance.** The hearth wedge and covered-court surface now sit slightly above
  the landscape rather than sharing nearly coincident planes. This tolerance is part of the shell contract for future
  authored buildings.
- **Purpose is a placement rule, not flavor text.** Revision 9 groups the lodge around tool care, storage and storm
  history, while the many-sided room is exclusively a firemaking/cooking classroom. Every prop now explains one of
  those functions and the cardinal route between doors, hatch and hearth passage stays clear.
- **Model families before room assembly.** The complete upstairs set is authored once in a dedicated Blender family,
  proved beside the canonical player, and then called by the building builder. This preserves hand-designed topology,
  makes isolated iteration faster, and prevents placeholder geometry from returning during a shell rebuild.
- **Separate scenery behavior from lesson behavior.** Domestic furnishings use left-click Walk here and right-click
  Inspect; the bench, fire board, tally, net rack and hearth retain their deliberate tutorial actions. Visual detail
  no longer creates accidental primary actions.
- **The interior wall face must stay visually clean.** Wall plaster may be shared, but posts, braces, rails and masonry
  trim are now assigned to the exterior face from an explicit room-side anchor. Art and service fixtures no longer
  compete with coplanar structural timber.
- **Contact is authored, not implied.** Hanging mugs center their handles on capped pegs; cabinet doors fit the carcass;
  plates stand in individual racks; and the hearth's soot plane is recessed behind the arch with a separate dark floor.
  Future rooms must receive the same contact audit before they are described as furnished.
- **Parallel production needs explicit ownership boundaries.** Revision 11 removes the old log-rack, chopping-block and
  axe meshes, then exports stable empty sockets instead of temporary stand-ins. Claude can author the isolated U3 family
  without touching the live Workyard; Codex retains building structure, placement, collision, interaction and integration.
- **A lean-to needs one readable load path.** The court is fixed to the lodge by its high ledger; five overhead rafters
  meet one continuous low eave beam carried by three outer posts. Knee braces stay high and parallel to the eave instead
  of reaching across the occupation floor like fence rails.
- **Compose finished prop families as dependencies instead of rebuilding the building GLB.** U3 remains an independently
  rebuildable Blender source and GLB, while `WorldV2Buildings` clones its semantic family into the Workyard at fixed
  transforms. The same composition passed r160 Studio and live r128, and the building retained its route and budget locks.
- **Animated dependencies keep their GLTF node names.** Three.js clip tracks bind by node name. Runtime semantics belong
  in `userData.partId`; renaming an animated crank, rope, or bucket after load can redirect a clip onto the family root.
- **Clickable pivots must match the visible control.** The U4 family root sat five tiles from the modeled crank, so the
  crank now owns Operate and carries a deliberately invisible, forgiving raycast proxy around its visible mechanism.
- **Transaction items must be core data before save sanitization.** Both `bucket` and `bucket_water` load with the base
  item catalog; a late add-on registration can make a correct session reward disappear during reload.
- **Resident-template counts are location-dependent.** The smoke gate compares live instances to the current resident
  object ledger, while template completeness is checked separately; it never assumes every asset family is resident.
- **Inventory-item dispatch must be explicit.** The Small net correctly armed but initially bypassed custom Interact
  hooks. Only authored targets carrying `acceptsUseItem` now receive item-on-world dispatch; unmarked scenery, doors,
  legacy resources and every other click path remain unchanged.
- **Reward ledgers should save at the reward boundary.** U5 writes its successful exact-once catch immediately, so a
  browser refresh cannot land between the reward and a later manual save.
