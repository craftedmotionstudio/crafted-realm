# Lastlight beacon & keeper wing v1 (lastlight, prefix Lastlight_): candidate, not owner-accepted
Source tools/blender/build_holm_lastlight_v1.py -> lastlight.glb / lastlight.blend (the same script also writes the proofs:
scratchpad/holm_lastlight_v1/ has front_sw, back_ne, side_south, top, cutaway_ground, cutaway_keeper, cutaway_watch, deck_close
and sheet.png). Nav spec: docs/rebuild/holm-overhaul/buildings/lastlight.nav.json.
Triangles 24,797 / 25,000. Materials 17 / 20. All colours come from diffuse_color/baseColor. The flame uses emissive, strength 1.0,
so the GLB has no emissive-strength extension. The lantern glass has alpha 0.45 and alphaMode BLEND. 39 meshes.
Bounds: 12.0 x 10.0 tiles in plan (porch step to gallery rail), 15.4 tall from the plinth foot (-0.7) to the vane. The vane top is at y 14.7.

## Form
- Beacon: an octagon with its centre at local (1,-1). Outer apothem 3.51 at the floor, battered to 3.0 at the gallery. The inner faces are plumb
  on each storey (apothem 2.95 / 2.80 / 2.65), and the set-offs carry the floors. I rotated the octagon 22.5 deg against the plan outline,
  so faces run N/E/S/W and cardinal tile rows meet flat walls. The plan outline put vertices on the cardinals. Size and centre are kept.
- Levels: storm store at 0, keeper's room at 3.0, watch room at 6.0, lantern deck at 9.0. Each storey has 2.8 clear, or 2.6 under the joists.
- Floor contents: oil casks, a net rack, crates, a lens case and a hanging lamp in the storm store. A box bed, table, sea chest, iron stove,
  shelf, barometer and chart in the keeper's room. A log desk, brass oil tank, wick cabinet and oil cans in the watch room.
- Gallery: 24 corbels hold a projecting deck (apothem 4.0) with an iron railing. A fog bell hangs outboard on the west side.
- Lantern: stone dwarf wall with a small iron service door, 8 glazed bays with iron mullions and a transom, and a boarded cap of
  red clay tiles laid in courses. It has hip rolls, an iron ventilator, a brass ball and a weathervane.
- Keeper wing: x -5..-1, z -2..4. The plan said z -1..4. I moved the north wall 1 tile so the internal 1.8-wide doorway fits the
  beacon's west face. One storey of coursed fieldstone with plinth, sandstone eaves course, dressed sills and lintels, glazed casements
  and shutters. Clay hip roof clipped into the tower. Forge hearth under a stepped fieldstone chimney with clay pots.
- Storm porch (west): stone cheeks, oak posts and braces, a gabled clay roof, and a framed limewash gable. The double storm doors are
  modelled OPEN, swung outward against the cheeks.
- Outside: a lit wall lantern, a rain butt, crates, a lobster pot and a rope coil.

## Site / placement
Measured terrain pad under the footprint: 14.00 flat. Min and max are both 14.00 over world x 115-125, z 20-30. The ground floor sits
0.30 above it on a plinth that goes down past the terrain (to local -0.7). The threshold is 0.30 above ground, so there is a porch step:
ground -0.30 -> Lastlight_StepPorch -0.15 -> Lastlight_FloorPorch 0.00.
Intended world placement: **x=121, y=14.30, z=26**. The storm door faces west, onto the arriving path (114,26)->(121,26).

## Services (mesh -> target)
| mesh | target | local stance |
|---|---|---|
| Lastlight_ServiceDoor_Storm | door | (-5.5, 0, 0.5) in the porch |
| Lastlight_ServiceStores_Workbench | stores | (-3.5, 0, 2.5) |
| Lastlight_ServiceLadder1Up_Ladder / Lastlight_ServiceLadder1Down_Hatch | ladder1-foot / ladder1-top | (1.5, 0, -2.5) / (1.5, 3, -2.5) |
| Lastlight_ServiceLadder2Up_Ladder / Lastlight_ServiceLadder2Down_Hatch | ladder2-foot / ladder2-top | (2.5, 3, -1.5) / (2.5, 6, -1.5) |
| Lastlight_ServiceLadder3Up_Ladder / Lastlight_ServiceLadder3Down_Hatch | ladder3-foot / ladder3-top | (0.5, 6, 0.5) / (-0.5, 9, 1.5) |
| Lastlight_ServiceLever_Deck | lever | (3.5, 9, -1.5) |
| Lastlight_ServiceBeacon_Lamp | beacon | (3.5, 9, -0.5) |
Each ladder leans slightly with the wall, one tile in front of its foot stance. The Down mesh has the grab rails above the hatch, the
hatch trim and the trap leaf standing open.

## Walk surfaces (names)
- Ground: Lastlight_FloorTower, Lastlight_FloorWing, Lastlight_FloorPorch, Lastlight_StepPorch.
- Upper: Lastlight_UpperFloorKeeper, Lastlight_UpperFloorWatch, Lastlight_UpperFloorGallery (deck ring).
- Cutaway groups: Lastlight_Roof* (wing roof, porch roof, lantern cap, chimney), Lastlight_UpperShellKeeper/Watch/String,
  Lastlight_UpperGallery, Lastlight_UpperLantern, Lastlight_UpperJoist*, Lastlight_UpperFurnishingKeeper/Watch,
  Lastlight_Glazing{Lantern,Keeper,Watch,Wing}.

## Extractor
[BUILDING_NAVIGATION] lastlight nodes 229, undirectedEdges 345, reachableNodes 229, targets 10/10, climbs 3, complete true
(edge rejections 0).
Climbs: ladder1 1:-3:2 (y0) -> 1:-3:1 (y3); ladder2 2:-2:1 (y3) -> 2:-2:0 (y6); ladder3 0:0:0 (y6) -> -1:1:0 (y9).

## Self-review against Bible_References/Lighthouse_Ref1.png
1. Reads well: a tall tapered gray tower with a strong projecting corbelled gallery, railing and red lantern cap, like the reference. The
   low hip-roofed stone wing and gabled porch give a sheltered entry and an unequal, many-angled massing. Each storey is furnished.
2. Weak: the relief stone courses read fairly regular and brick-like. The budget forced larger 10-triangle stones on the upper storeys.
   The taper is subtle (0.5 over 9 m).
3. Weak: the lantern cap tiles are fine and read almost smooth from game distance. The glass is alpha-blended, so check sorting in the
   runtime. The wing is 1 tile longer north than the plan, and the octagon is rotated 22.5 deg from the plan outline.
