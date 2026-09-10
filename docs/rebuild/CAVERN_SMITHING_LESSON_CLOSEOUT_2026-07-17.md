# Training Cavern smithing lesson closeout — 2026-07-17

## Outcome

Tutor's Holm now carries a complete first Smithing lesson: mine copper, mine tin, smelt the pair into one bronze
bar, and forge that bar into a Bronze dagger. The lesson remains optional/open-world in presentation, but its
runtime order and rewards are deterministic.

## Visibility and environment

- The cavern no longer inherits the Workyard basement's short-range fog. Underground fog now uses a readable
  78–230 tile range and a warm brown-black color instead of obscuring the route.
- Cavern-only hemisphere, ambient, directional, torch, and smithing lights were rebalanced after live review.
  The final pass preserves clear paths and ore silhouettes without washing out the authored station.
- The true-depth clipped heightfield, invisible cardinal walk plane, offshoot galleries, and ore-field placement
  remain unchanged.

## Authored furnace and anvil

The station was rebuilt in Blender and exported through the existing cavern environment source pair:

- `assets/blender/environments/holm_training_cavern_v1.blend`
- `assets/models/environments/holm_training_cavern_v1.glb`

The furnace now has stepped soot-stone courses, a tapered shoulder, recessed full-depth mouth, ember bed, hearth
lip, jambs, arch stones, iron lintel, crooked flue, band, bellows, and lever. The anvil is one custom extruded
profile with feet, waist, shoulder, face, horn, heel, hardy hole, oak block, tongs, and quench bucket. Invisible
interaction proxies and collision remain separate from the visible art.

## Playable crafting chain

1. Copper rocks award `copper_ore`; tin rocks award `tin_ore` through the existing left-click Mining loop.
2. A carried or equipped pickaxe is shown in the player's right hand and performs a broad lift–bite–recover swing.
3. The furnace consumes one copper ore plus one tin ore and awards one `bronze_bar` and Smithing XP.
4. The anvil requires a hammer, consumes one bronze bar, and awards one `bronze_dagger` and Smithing XP.
5. The dagger is a level-1, one-bar recipe and becomes a real equippable melee weapon.

## Animation and sound

- Mining uses its own pick swing, impact sound, faceted impact dust, depletion motion, and respawn motion.
- Smelting uses two-handed tongs with a glowing bar, a slower furnace-reach motion, furnace rush sound, and warm
  sparks.
- Smithing uses a compact hammer strike distinct from Mining, a metal impact sound, and smaller hot sparks.
- Both the procedural player and the modelled GLB player now receive distinct Mining, smelting, and smithing poses.
- Furnace embers and nearby smithing light pulse slowly; route torches retain their cozy restrained flicker.

## Verification

- `tools/test_cavern_crafting_lesson.js`: all 12 chain, reach, asset, and animation locks pass.
- `tools/test_world_v2.js`: all World V2 and Training Cavern locks pass; flow is 12 live / 17 release lessons.
- Content validation: pass, including all item, recipe, combat-stat, drop, shop, and quest references.
- Gear gate: 34/34 pass.
- Swing-distinctness gate: all pass.
- Live foreground smoke after the interaction fixes: 100/100, 100 FPS, 133 draw calls, zero console errors.
- A real pointer-driven run mined both ores, rejected premature anvil use, smelted the bronze bar, forged the
  dagger, awarded 21 total Smithing XP, equipped the dagger, and survived reload. That pass found and fixed a
  displaced visible-station/hitbox pair and a tall-proxy reach deadlock. Full QA record:
  `docs/rebuild/CAVERN_BRONZE_LESSON_LIVE_QA_2026-07-17.md`.

## Direct visual review

- Silhouette/proportion: the furnace is the dominant heat landmark; the lower anvil and block read as its working
  companion rather than another cube.
- Shape hierarchy: body → mouth/embers → flue/bellows and block → waist/face/horn is readable at the elevated game
  camera.
- Color/material separation: soot stone, iron, oak, ember, and surrounding ochre earth remain distinct after the
  final light reduction.
- Reference-defining features: recessed mouth, arch, flue, bellows, anvil horn, hardy hole, tongs, and quench
  bucket are all present.
- Gameplay readability: ore rocks, routes, furnace, anvil, held tools, sparks, and player motion remain visible
  without the previous fog wall.
- Animation/interaction readability: the three actions use visibly different cadence and props; interaction
  proxies stay aligned with the authored station.
- Family consistency: flat shading, faceted profiles, warm palette, restrained glow, and readable exaggeration
  match the accepted Training Cavern family.

Accepted for the current Tutor's Holm production slice.
