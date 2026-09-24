# Keep ridge and tower access pass

Status: unpublished Studio work. Full tutorial-island goal remains active. This pass does not establish playable castle navigation or accepted art.

The Blender keep is now placed in Terrain Studio at world (87, 8.025, 35), with no rotation or scale distortion. Its local foundation terrace extends beneath the actual north tower, widened east turret and south gate approach. The rest of the landscape is preserved.

`tools/stage_holm_keep_foundation.js` generated the candidate source and matching compiled terrain. Before the repair, sampled north-tower ground descended to 5.433 beneath floor height 8. Afterward, 4,281 quarter-tile samples across conservative foundation rectangles are exactly height 8. Only 254 height vertices changed, all in the keep neighborhood. Creek data and water classifications remain identical. This measures rendered terrain triangles; it is not a continuous collision or retaining-wall test.

The source and compiled bundle were staged through Studio Safe Publish into `holm-overhaul-terrain-v1`, exported as `b9ce8ae6766b7a11`, and received an all-green plan. No apply was performed. The ordinary live provider is unchanged.

The design map now matches the modeled eight-part castle footprint: connected hall/stores, gate, galleries, wall walk and two octagonal towers. The obsolete overlapping stair turret was removed from the plan; the hall has its own internal stairs. The east tower grows to apothem 2.65 at Blender (9.65, 7), keeping its west doorway at x7. Habitat clearance was regenerated against these real footprints: 46 placements remain (13 oak, 5 birch, 5 pine, 18 grass and 5 reeds). A pine at (103,28) was excluded because it crowded the larger turret.

Blender v2 adds stacked switchback stairs and guarded upper-floor apertures to both towers. The Studio viewer provides individual floor/lookout sections. During direct review, an intermediate-floor guard was found crossing the next ascending flight entrance. It was removed at continuing floors and retained only at final lookouts. Upward rays alone did not detect this risk. The repair passed 280 horizontal scene rays through ten stair entrances across 1.2 m width at four body heights. These are discrete rays, not a swept player capsule or runtime movement proof.

Frozen model: `.studio-workspaces/holm-warden-keep-v2/candidates/keep.glb`, SHA256 `d28071220a250f4cff16e18dd1b7acec6fa7ccab6c0eda5e3457bee79190e324`, 575,520 bytes, 7,214 triangles, 30 primitives and three embedded original textures. Main independently verified the hash. Blender exited successfully and preserved v1. Additional geometry checks cover 80 new tower treads plus 16 hall treads, 120 doorway rays, 396 headroom rays and 108 landing support rays. Minimum sampled tread headroom is 3.23.

## Verification and direct review

- Terrain compiler: 9/9; shared chunk lattice/seams and triangle surface checks pass.
- Safe Publish terrain pairing, drift and stale-export refusal checks pass.
- Arrival trail geometry remains valid against the staged terrain.
- Foreground ordinary game smoke: PASS 105/105; actual out-and-back movement and six chunk boundaries; exact/lossless save round trip; 60 FPS, worst frame 20 ms, 116 draw calls, 33,982 triangles, seven world ticks, zero console errors. This checks regression safety, not castle gameplay integration.
- Initial ridge review: connected volumes and height hierarchy read clearly; the building is grounded rather than floating over the ridge. The terrace still needs authored retaining edges and a finished approach.
- Material separation: gray stone and warm roofs read, but stone is substantially darker than the Bible reference and the roof texture is too regular. Do not accept it at 9.0.
- Interaction readability: stairs/landings are now inspectable, but actual player movement, doors and service/NPC bindings remain unfinished.
- Final Studio and Terrain views loaded the repaired model without console errors or warnings. Main selected both lookout cutaways with real browser controls, then inspected the exterior and ridge composition. Evidence: `scratchpad/holm_perf/keep-v2-watch-stairs.png`, `keep-v2-east-stairs.png`, `keep-v2-exterior.png`, `keep-v2-ridge.png`.

Direct visual review: silhouette/proportions 8.4 (unequal towers and connected ranges; open lookouts are legible), shape hierarchy 8.4 (tall hall/lower store roof and gate court), material separation 7.5 (dark stone and regular roof pattern), reference-defining features 8.0 (connected medieval massing present; lived-in landmarks and brighter masonry missing), gameplay-camera readability 8.2 (gate and skyline clear, stairs visible only in inspection), interaction/animation readability 7.2 (modeled stairs repaired, no runtime traversal or doors), family consistency 8.0 (warm low-poly geometry, material match unfinished). Overall provisional 8.0; not accepted and no 9.0 completion claim.

Remaining: brighter reference-matched masonry, finished courtyard/approach and retaining edges, animated doors/props, cardinal navigation and collisions, real-pointer ground-to-lookout walkthrough, services/combat/NPCs and full-island integration.
