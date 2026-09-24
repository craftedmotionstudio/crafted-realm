# Bram’s guide house — overhaul design

Original compact grey fieldstone house, 12 by 10 tiles, two inhabited storeys. Reference grammar: substantial masonry around real openings, warm timber frames, clear circulation, furnished rooms and planting. The old 26 by 24 teaching hall is not reused.

Ground floor: south and north openings on the central axis, hearth on the west wall, shared table south-west, chart north-west. Straight east stair rises 2.8 tiles in twelve treads, with a full open well in the upper floor. Upstairs: study overlooking the cove, sleeping space and a clear landing. Layout dimensions come from arrival-layout.json.

Silhouette: broad gable, slight eave flare, thick roof edges, off-centre chimney tied to the hearth, modest south porch. Muted clay roof, grey-green fieldstone, pale lime joints, dark oak and ochre shutters. Use edited wall topology with actual window voids and reveals; never dark rectangles pasted onto closed walls. Facade course variation follows construction, not random clutter.

First build is a scale/shell study, not finished art. It must prove openings, stair headroom and removable floors/roof before surface detail. Doors, shutters, furnishings, planting, expected motion, gameplay collision and final proof sheets remain required for acceptance.

Door revision, 2026-09-12: both clear openings are now 2.0 tiles, with matching Blender leaves derived from arrival-layout.json. At world X=66 the closest cardinal tile centres are 65.5 and 66.5; the former 1.6 opening could not clear radius 0.42. The new opening provides 0.08 tile geometric margin per viable lane. This resolves the authored width defect, not installed collision or traversal acceptance.

Stair revision: startZ2.9/endZ-1.9, 0.3 tile north of first draft. Well/stringers/guards follow layout endpoints. Shift preserves radius-clear cardinal lower turn including handrail overhang; full runtime acceptance remains open.
