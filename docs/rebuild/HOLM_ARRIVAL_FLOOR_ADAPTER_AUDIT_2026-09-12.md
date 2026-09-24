# Arrival house floor adapter audit — 2026-09-12

Read-only architecture audit. No runtime registration, browser verification, asset acceptance, or existing-file edits occurred. The source layout remains a numeric proposal. This document specifies work and tests; it does not claim those tests pass.

## Base guard and scope

Read `GUIDING_LIGHT.md` and `AGENT_SPEC_TEMPLATE.md`. Confirmed the current `arrival-layout.json` has the 12 × 10 Guide house at world (66, 99), foundation 3, upper floor 2.8 above foundation, and east staircase with 12 treads. Confirmed `Planes.elevAt`, `WorldWalkSurfaces.heightAt`, cardinal `computePath`, plane-filtered `collides`, and resident `CollisionGrid` exist. Therefore the intended architecture base is present. Inspected `src/planes.js`, `src/world_walk_surfaces.js`, `src/game2_world.js`, `src/game5_main.js`, `src/collision_grid.js`, and building installation in `src/world_v2_objects.js`.

## Findings that must shape implementation

1. `WorldWalkSurfaces.heightAt(x,z)` returns the highest overlapping world Y, with no plane parameter. Registration strips unknown row fields, including any proposed plane tag. Registering the whole upstairs there would raise the ground-floor actor into the upper floor. Only genuinely ground-level foundation/deck overrides can use this registry unchanged.
2. `Planes.elevAt` ignores its floor registry on plane 0, using `groundY`; other planes use the first matching flat rectangle. It has no ramp/step evaluator, explicit holes, ownership removal, or overlap conflict validation. Upstairs can be decomposed into disjoint rectangles surrounding a well, but a single full-footprint rectangle would make the opening walkable.
3. `computePath` keys nodes by X/Z only and considers only `Player.plane`. Its result stores no per-node plane/surface identity. `orderWalk` samples all waypoint heights on that one current plane. The frame follower samples `pElev` between centers and uses cached waypoint Y at endpoints. A cross-storey route needs an explicit plane/surface-aware path contract; switching `Player.plane` halfway through an ordinary cached route is insufficient.
4. `Planes.addClimb`/`climbTo` implement a destination teleport, clear movement, and recenter the camera. They are useful existing ladder behavior, but do not prove the requested visible staircase traversal. `canEnter` proves only finite destination elevation, not capsule clearance or unblocked landing.
5. `collides` filters by plane and uses radius-expanded 2D shapes; it has no height interval. `slideMove` permits movement out of an existing collision. The normal click-route follower shown in `game5_main.js` moves directly along its cached path rather than rechecking collision every frame. A stair adapter must explicitly validate swept movement and invalidate paths on unloading/door changes; it cannot assume the follower supplies this.
6. `CollisionGrid` is ground-plane-only and samples `groundY` plus ground colliders. Upstairs currently falls back to analytic checks. Surface step-height checks skip nonzero planes. Stair side entry, railing crossing, and unsupported descent therefore need an explicit transition rule; finite height alone is inadequate.
7. The building object adapter registers colliders, doors, one interior roof group, and optional ground walk surfaces. It does not currently install an owned upper-floor/stair package. `Planes` visibility watchers and floor arrays have no corresponding owner removal API. Streaming integration must own and remove these resources, including references held by pending interaction/path state.

## Immediate geometry/grid mismatch

Integrator update: the finding below was addressed in the draft after this audit. Both openings now measure 2.0 tiles in the layout and rebuilt Blender source; the numeric tile-lane regression test and sampled mesh sweep pass. Runtime jamb colliders and real traversal remain unverified.

World tile centers are `integer + 0.5`. Both 1.6-wide door openings are centered at world X=66. The nearest possible lane centers, 65.5 and 66.5, are only 0.3 from a jamb. Required actor radius is 0.42, so neither lane fits exact jamb collision. The continuous local-center circulation drawing does not prove a cardinal tile route.

Resolve deliberately in authored data and Blender: align the opening with a tile-center lane (e.g. shift its local center), revise placement and revalidate every related feature, or widen the opening sufficiently (strict geometric minimum 1.84 for this current centered pair, before extra tolerance). Do not silently shrink avatar radius or remove jamb collision. A placement shift also changes terrain pad/grade fit and stair alignment, so is not a free fix.

The staircase's world X range is 69.5–71.0; its radius-clear center interval is 69.92–70.58. World X=70.5 is a possible tile lane. Stair world Z extends 102.2 down to 97.4 while rising from Y=3 to 5.8. Authored center X=70.25 and landing Z values are not themselves tile centers. Prove the entire route after quantization, including the first and last edge and the upper turn. Do not round semantic interaction points and assume reach still works.

## Proposed pure-data contract

Compile the layout and measured mesh contract into a new versioned package. No Three.js objects, functions, automatic registration, or player mutation belong in this output:

```js
{
  schema: 'holm-arrival-navigation-v1', version: 1,
  owner: 'guide', providerId: 'explicit-isolated-preview-id',
  sourceHashes: { layout: 'sha256', terrainBundle: 'sha256', glb: 'sha256' },
  transform: { x: 66, z: 99, foundationY: 3, quarterTurns: 0 },
  actor: { radius: 0.42, height: 1.9, headMargin: 0.3 },
  surfaces: [
    // Stable IDs; non-overlapping rectangles/polygons per plane.
    // Ground floor excludes stair solid footprint where required.
    // Upper floor explicitly excludes stair opening.
    { id: 'ground', plane: 0, kind: 'flat', y: 0, regions: [] },
    { id: 'upper', plane: 1, kind: 'flat', y: 2.8, regions: [] },
    { id: 'east_stair', kind: 'stair', axis: 'z', direction: -1,
      bounds: { x0: 3.5, x1: 5, z0: -1.6, z1: 3.2 },
      treads: [], entrySurface: 'ground', exitSurface: 'upper' }
  ],
  blockers: [], // id, surfaceId/plane, shape, local bounds; dynamic door ownership
  portals: [],  // explicit cardinal entrance/exit edges, source/destination surface
  nodes: [],    // id, surfaceId, plane, integer tileX/tileZ, validated support Y
  edges: [],    // from/to IDs, cardinal delta, allowed surface transition
  interactions: [], // semantic node, surfaceId/plane, reachable stance tile IDs
  visibility: [],   // semantic groups and active-storey/cutaway policy data
  residency: { requiredChunkIds: [], unloadPolicy: 'pin-while-occupied' }
}
```

Empty arrays above are schema illustrations, not valid compiled geometry. Choose a reserved plane allocation through the provider instead of globally assuming plane 1 is unoccupied. Reject duplicate or ambiguous supporting regions. Stairs need their own surface identity because ground beneath and upstairs beside them overlap in X/Z. Represent precise tread intervals from the source/GLB and a deliberate support-height sampling policy; never invent a height function that disagrees with rendered steps. A smoothed visual rise can be an animation offset only if feet/contact tests support it.

## Adapter requirements and recommended boundary

Build and test the pure surface/portal graph independently first. An isolated preview can consume it before changing the live engine. Limit transformations to validated cardinal rotations and unit scale initially; fail on unsupported transforms.

The runtime adapter must resolve support by explicit active surface/plane, not maximum Y. Route states must preserve surface identity across portals; movement across each portal must be continuous in X/Z and supported in Y, with the plane committed at a defined boundary. Stair side walls and upper-well rails need blockers on the applicable traversal surfaces. Reserve clear lower/upper portal edges; do not blindly call `edgeFence` on each floor rectangle, which would fence internal seams and the stair exit.

Provide a shared support/clearance query for click navigation, manual movement, route endpoints, interaction stance, player placement, and save restoration. Add a separate plane-aware hit target for upper floors and steps; a hit must retain surface identity so clicking upstairs cannot become a ground-floor X/Z goal. Visibility and clickability must agree, and existing roof cutaway updates must not fight the new storey policy.

Registration must be transactional and owned by the building/provider: validate all required chunks/assets first, install surfaces/colliders/clickables/visibility together, rebake affected ground cells, and remove them together. Pin required chunks during occupancy/traversal or block unloading safely. Restore saves only after the saved surface is resident and its stance is validated; keep the preview profile/provider isolated. On invalid movement, stop at the last valid supported position instead of falling, snapping upstairs, or silently teleporting to a landing.

## Required acceptance tests

- Headless deterministic compilation, input immutability, finite/range validation, unique IDs, source-hash agreement, and no registration side effects.
- Enumerate actual world tile centers and use radius-expanded walls/props: south door → chart stance → staircase lane → upper study → return → north door, all cardinal and reachable. Include reversed routes and all relevant quarter turns.
- At identical X/Z, ground stays Y=3 and upper resolves Y=5.8 only on its own valid region. The upper opening returns no upper-floor support; the staircase returns its authored tread support only in staircase state.
- Every graph edge remains supported for a swept actor footprint; sample both ends and tread boundaries. Reject sideways stair entry, entry through rails, upper-well crossing, unsupported descent, and diagonal links. Check 2.2 minimum head clearance over the full actor footprint, not only a center ray.
- Destination loading, closed/open door behavior, blocked landing, interrupted stair movement, stale cached path, unload/reload, save/reload on each storey and on stairs, and provider/profile separation.
- Boot-time self-check prints a concise named pass count for the pure contract, with failures stopping adapter installation. This is not a substitute for the next gate.
- Main-session in-app browser: real-pointer arrival, both doors, ground interactions, visible stair ascent, upper interaction, descent and exit; manual movement where supported; cutaway/readability review; persistence/interruption cases; console sweep and final foreground smoke. No teleport evidence for traversal.

## Anti-goals and residual risks

Do not change exact combat/XP, shared NPC data, cardinal movement, existing saves, live provider selection, or unrelated building families. Do not publish the draft through copied JSON, treat Blender mesh contact diagnostics as gameplay proof, or accept the visual candidate through this audit.

The large integration risk is that true continuous multistorey navigation exceeds the current single-plane route contract. Keep it isolated until its data and movement tests pass. Plane IDs alone do not distinguish multiple supporting surfaces or temporary stair state. Collider padding, half-tile alignment, doorway animation, cutaway ownership, streamed residency, and world-to-local transforms must be proven together; each already has a concrete failure mode in the inspected architecture.
