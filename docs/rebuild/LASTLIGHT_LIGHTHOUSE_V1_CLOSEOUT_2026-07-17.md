# Lastlight Lighthouse four-level revision — 2026-07-17

## Outcome

Lastlight now uses a connected cylindrical Blender shell rather than loosely spaced masonry blocks. Its
difficult spiral remains retired: the interior is four distinct tutorial planes connected by three ordinary
ladders. Every level has a purpose, its own furnishings, a readable cutaway wall, and only the current level
is rendered.

## Floor plan

1. **Lastlight Stores:** a side-stored clinker dinghy, oar, storm barrels, wall torch, first ladder and an
   animated Underkeep trapdoor reserved for the later dungeon slice.
2. **Lastlight Gear Loft:** life rings, fishing rods, tackle chest, signal buoys, net rack, window, lower
   ladder and upper ladder.
3. **Lastlight Keeper's Room:** crossing ledger, sea chart, desk, bunk, rolled blankets, weather instrument,
   window, lower ladder and upper ladder.
4. **Lastlight Lantern Deck:** maintenance chest, signal ledger, gallery rail, lower ladder, animated lens
   and flame, plus a player-operated bronze lever that toggles and saves the beacon state.

The Blender file exports `CR_Exterior` plus `CR_Level1` through `CR_Level4`, six named ladder anchors,
`CR_TrapdoorLid`, `CR_BeaconLever`, the beacon flame and the lens. The browser owns the four floors,
collision, plane visibility, click targets, save state and animation.

## Camera and navigation corrections

- The ground-floor arrival was moved inside the bounded walk floor; the first ladder is now reachable.
- Lighthouse interaction proxies remain on their validated data coordinates instead of being translated a
  second time through nested GLTF roots.
- Interior walls use a shoulder-height circular cutaway. They preserve the room and window silhouette while
  keeping the player, both ladders and the furnishings readable from the elevated gameplay camera.
- Surface BFS still rejects cliff transitions over `1.05` units, so the broad switchback remains the legal
  ascent and the steep summit faces are not shortcuts.
- The south entry is a real hinged `CR_EntryDoor`. Clicking it walks to the threshold, swings the oak leaf
  inward, waits for the visible opening beat, and only then enters Lastlight Stores.
- A dedicated circular flagstone floor blocks summit grass from showing through the doorway.
- The summit camera eases onto the player's side of the cylindrical shell. The complete tower remains opaque,
  but the camera can no longer enter the beacon or masonry volume.
- The Blender runtime export preserves a dedicated `CR_CutawayBase` containing the lower stone courses,
  doorway frame and floor; this makes close views stable without weakening the distant lighthouse silhouette.

## Authored evidence

- Blender source: `assets/blender/environments/holm_lastlight_lighthouse_v1.blend`
- Runtime model: `assets/models/environments/holm_lastlight_lighthouse_v1.glb`
- Manifest: `assets/manifests/holm_lastlight_lighthouse_v1.json`
- Cardinal packet: `scratchpad/holm_lastlight_lighthouse_v1/` (four exterior views plus north, south, east
  and west views for every floor)
- Comparison: `Bible_References/Complete/_compare/holm_lastlight_lighthouse_v1_compare.png`

Final GLB: 16,184 triangles, 85 primitives, 23 materials and 1,054,860 bytes.

## Verification

- The one-command Blender asset pipeline passes every source, semantic-node, budget and render lock.
- World-v2, lighthouse data, cliff-routing, building-resource and provider-disposal locks pass.
- Content validation passes with no referential-integrity errors.
- A real pointer activated the stores ladder, completed the plane transition and displayed the independently
  furnished Gear Loft. The live pass also caught the original out-of-bounds arrival and displaced proxy before
  this revision was accepted.
- A real pointer operated the bronze lever; the beacon flame, lens emission and warm point light activated,
  and the expected relighting message appeared.
- A real pointer targeted the visible exterior door. The leaf visibly swung inward before the player changed
  planes, and the custom arrival message described stepping through rather than climbing or teleporting.
- Direct Codex visual review passed the connected cylindrical silhouette, warm/cool masonry hierarchy,
  south-door readability, opaque summit camera composition, stone interior threshold and family consistency
  with the existing Tutor's Holm low-poly language.
- Final foreground smoke: **PASS 101/101**, 100 FPS, 14 ms worst frame, 119 draw calls, 29,924 sampled
  triangles, seven healthy world ticks, zero uncaught errors and zero console errors.

## Next boundary

The visible trapdoor is a deliberate future hook only. The Underkeep dungeon, graduation quest dialogue,
signal-seal reward and ferry response are later slices and are not implied complete here.
