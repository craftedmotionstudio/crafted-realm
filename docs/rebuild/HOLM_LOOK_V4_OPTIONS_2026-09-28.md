# Look v4 options: planey, plain, pixelated, measured against 2004 (2026-09-28)

Owner, review 5b (near-verbatim): "Our character looks way too polished and round. Almost everything in the game looks a
little bit too polished ... it just doesn't feel as plainy and old school as 2004scape ... maybe it's the textures ...
we need more plainy style designs ... maybe even just more pixelated, slightly pixelated, not too much."

Branch `holm-look-v4` (worktree `CraftedRealms-Look4`, from f9313bd6). The owner has swung between "too round" and "too
many planes" before, so this pass measures before it changes anything. Three options are switchable in game. **None of
them is the default**: the owner picks.

| Switch | What it is |
|---|---|
| `?look=3` | the current look (look v3, the 2004 light); also the config default `GameConfig.holmLookOption = '3'` |
| `?look=4a` | **Slight pixels**: the world drawn at the 2004 applet's full height (503 lines over the 36.1 deg view, 2 px blocks at 1006 px), no anti-aliasing; colours, textures and shading as v3 |
| `?look=4b` | **2004 pixels and colours**: 2004's pixel density (334 lines, 3 px blocks), every pixel in the 2004 client's colour space (64 hues x 8 saturations x 128 lightnesses, no dither: banded gradients), textures sampled texel by texel, characters' normals 70% of the way to their faces |
| `?look=4c` | **Planey and plain**: 4b's pixels and colours, flat per-face shading on every scenery model and character, wood / plaster / roofs / bark / hay / cloth in their texture's average colour, and the textures it keeps (stone, cobbles, rock, leaves, water) bolder |

The choice is remembered for the tab's session (sessionStorage), so reloads keep it. UI chrome stays crisp (the world is
drawn into an off-screen target by `ClassicPixels`); picking, the camera and clicks are unchanged. The Settings
"Classic pixels" toggle keeps working as before when no option is chosen.

## How it was measured (tools/ref2004/look_metrics.py)

- **Frames**: the harness's matched scenery spots (tools/ref2004/capture_scenery.js): 2004 = the town courtyard, town
  square, a field with trees and the river by a bridge at pitch 128, 4 yaws each (15 frames; one courtyard frame has the
  camera against a wall and is left out); ours = the lodge / bakehouse path, the oak field and the arrival dock, two
  yaws each, through the 2004 lens (36.13 deg vertical FOV, 22.5 deg elevation, 7.69-tile boom, look point 0.39 tile up),
  1530 x 1006, HUD hidden. `node tools/ref2004/capture_look_options.js` takes the same frames for every option.
- **Scale**: content numbers are taken at the 2004 pixel scale (2004's 512 x 334 viewport; ours box-averaged 3 x 3 = one
  2004 pixel). Colour counts sample one pixel per 3 x 3 block (no averaged colours invented).
- **(a) Faceting**: the view in 6 x 6 blocks, each sorted by its luminance shape: *flat* (one tone), *ramp* (smooth
  gradient), *step* (two plain parts with a hard jump in the same colour = a jump between faces), *edge* (two plain parts
  of different colour = an object boundary), *busy* (texture). Shares are of the plain, shaded blocks.
- **(b) Texture**: busy share and the high-frequency energy inside surfaces (|L - 3x3 mean|, object edges left out), also
  per surface family by colour (grey stone / plaster / cobbles, green grass / leaves, earth / wood / roofs, blue water).
- **(c) Colours**: distinct colours, how many cover 90% of the view, colours inside a smooth-gradient block (banding).
- **(d) Pixels**: the hard-pixel block size on screen (run lengths of identical pixels) and rendered lines per degree.
- **(e) Light**: mean luminance and saturation (the feel report's formula).
- **The adventurer**: the same block shapes inside the silhouette (frame minus a plate with the player hidden) on the
  height-matched close-up (front and 3/4 front). 2004's close-ups are front-lit; ours are averaged over the sun at four
  sides of the body (our sun is fixed to the world, so a player sees all four).
- **Distance to 2004**: each number's gap in plain units (0.10 for shares, 0.05 luminance, a log ratio for counts and
  densities), averaged; overall = scenery and adventurer weighed alike.

## The numbers (2004 vs current vs options)

Scenery, mean of the matched frames:

| | 2004 | current (v3) | 4a | 4b | 4c |
|---|---|---|---|---|---|
| hard pixel block on screen (px) | 3 | 1 | 2 | 3 | 3 |
| rendered lines per degree | 9.24 | 27.84 | 13.92 | 9.28 | 9.28 |
| distinct colours in the view | 1,051 | 7,961 | 8,112 | 1,157 | 1,173 |
| colours covering 90% | 185 | 1,968 | 1,990 | 177 | 163 |
| colours in a smooth-gradient patch (banding) | 2.9 | 11.4 | 11.7 | 3.8 | 3.5 |
| hard jumps between faces (share of plain surface) | 0.016 | 0.045 | 0.050 | 0.036 | 0.034 |
| smooth gradients | 0.478 | 0.385 | 0.387 | 0.463 | 0.423 |
| one flat tone | 0.507 | 0.571 | 0.563 | 0.501 | 0.543 |
| busy (textured) share of surface | 0.456 | 0.477 | 0.469 | 0.529 | 0.521 |
| fine detail inside surfaces (levels) | 4.36 | 2.00 | 1.94 | 2.98 | 3.69 |
| stone / grey: busy, detail | 0.70, 8.5 | 0.81, 2.8 | 0.80, 2.7 | 0.90, 4.3 | 0.96, 6.3 |
| grass / leaves: busy, detail | 0.39, 3.2 | 0.23, 1.1 | 0.22, 1.1 | 0.26, 1.7 | 0.24, 1.8 |
| earth / wood / roofs: busy, detail | 0.58, 4.1 | 0.80, 3.9 | 0.79, 3.8 | 0.84, 5.1 | 0.75, 5.3 |
| water: busy, detail | 1.00, 7.9 | 0.61, 2.2 | 0.57, 2.0 | 0.72, 3.2 | 0.84, 5.7 |
| mean luminance | 0.222 | 0.220 | 0.220 | 0.220 | 0.219 |
| mean saturation | 0.496 | 0.518 | 0.518 | 0.509 | 0.515 |
| **distance to 2004, scenery** | 0 | 1.237 | 1.096 | **0.228** | 0.268 |

The adventurer, close-up:

| | 2004 | current (v3) | 4a | 4b | 4c |
|---|---|---|---|---|---|
| hard jumps between faces | 0.137 | 0.046 | 0.050 | 0.115 | 0.139 |
| smooth gradients | 0.769 | 0.493 | 0.502 | 0.449 | 0.355 |
| one flat tone | 0.093 | 0.461 | 0.448 | 0.436 | 0.507 |
| colours in the body | 168 | 1,105 | 1,128 | 291 | 330 |
| luminance spread in the body (levels) | 32.7 | 21.5 | 21.5 | 22.7 | 23.1 |
| **distance to 2004, adventurer** | 0 | 2.510 | 2.453 | **1.910** | 2.317 |
| **overall distance** | 0 | 1.873 | 1.774 | **1.069** | 1.292 |

Per scenery kind (luminance / saturation / colours / fine detail): 2004 town 0.246 / 0.29 / 1,142 / 6.0, field 0.202 /
0.74 / 844 / 2.7, water 0.219 / 0.45 / 1,166 / 4.4; current town 0.217 / 0.47 / 7,229 / 2.2, field 0.209 / 0.58 /
8,361 / 2.1, water 0.234 / 0.51 / 8,294 / 1.7. The 2004 light from look v3 holds in every option (0.216-0.235).

## What the numbers say

1. **Pixels and colours are the biggest gap.** Ours draws three times 2004's lines per degree, anti-aliased, with 8x the
   colours and gradients four times smoother. 4b closes both: 3 px blocks, ~1,150 colours a view, 3.8 colours per
   gradient patch.
2. **"Round" or "too many planes": both, in different places.** The *world's* plain surfaces already show more hard
   jumps between faces than 2004's (0.045 against 0.016): the scenery is not too round, and flat-shading it (4c) moves
   away from 2004. The *adventurer* is too round: 2004's body shows about three times our face jumps (0.14 against 0.05).
   4b's partial facet (normals 70% of the way to the face) reaches 0.12; 4c's flat faces 0.14.
3. **Textures: bolder where textured, plainer elsewhere.** Where 2004 textures a surface its texels are 2-4x as
   contrasty as ours (stone 8.5 against 2.8, water 7.9 against 2.2); it also leaves more of its wood, plaster and earth
   plain (busy 0.58 against 0.80). Our soft, low-contrast texture everywhere reads as "polished". Texel-by-texel sampling
   (4b) and the bolder textures (4c) move the detail up (3.0 / 3.7 against 4.4) but no option reaches 2004's contrast
   without turning more of the surface busy.
4. **The adventurer's range of light and dark** (33 against 22 levels) is a lighting matter (v3's dim fill and sun), not a
   material one; outside these options (characters: material shading only).

## Recommendation

**4b** (2004 pixels and colours): closest to 2004 overall (1.07 against 1.87 today), on the scenery (0.23 against 1.24)
and on the adventurer (1.91 against 2.51). 4c is the owner's "planey and plain" at full strength: its flat scenery faces
add jumps 2004 does not have, so it measures a little further (1.29). 4a is the gentle step (pixels only, half-way).

## Performance

Headless Chrome on the GPU (RTX 4070 laptop, ANGLE D3D11), frame cap off (`node tools/bench_look_v4.js`), 1530 x 1006,
median fps at the Guide House / bakehouse court / hill panorama: current 89 / 77 / 65, 4a 91 / 78 / 66, 4b 99 / 87 / 69,
4c 93 / 81 / 67. Draw calls are unchanged (+1 blit). The reduced resolution helps a little (the island is draw-call
bound, not fill bound). Smoke (60 Hz cap) passes with the default look and each option.

## Gates (2026-09-28/29, QA server http://127.0.0.1:8141 serving this worktree)

- `tools/test_*.js`: 93/93 pass (new: `test_holm_look_v4.js` 4/4).
- Smoke (`run_smoke_headless.js`, `SMOKE_QUERY` per option): PASS with the default look and with 4a, 4b and 4c; 100 fps,
  worst frame 11-13 ms, 109-111 draw calls, structural 108/108, hidden-tab boot PASS each (`scratchpad/look_v4/gates/smoke.txt`).
- `qa_osrs_menu.js`: 65/65 with `&look=4b` (3 px blocks: every click still lands) and 65/65 with the default look. Before
  that the menu QA failed 2 checks on the default look too: the island's rope coil by the mine shaft (owner review 5) lies
  in `WORLD.drops`, so "both items lie on the ground" counted three. The QA now counts only its own two drops (coins,
  bones); the rope logic is untouched.
- `qa_holm_island.js`: PASS 34/34 (default look). `qa_holm_island_playthrough.js 1`: 1/1 complete, 12.8 min, lessons 18/18,
  tutors 10/10, 0 page errors (default look).
- In-app browser (the Claude desktop pane) at 1530 x 1006: `?look=4a` (765 x 503 internal, 2 px), `?look=4b` (510 x 335,
  3 px, 2004 colours; a left click on the ground walks), `?look=4c` (510 x 335, 983 flat materials, 253 plain, 149 bolder
  textures, ground tuned), `?look=3` (no change, pixels off); UI crisp in every option. The same few 404s appear with the
  default look (not from this pass).

## Files

| File | Job |
|---|---|
| `src/holm_look_v4.js` | the options, `?look=` switch, the material pass (texels, part-flat / flat characters, flat scenery, plain families, bolder textures), ground / water tune hook |
| `src/classic_pixels.js` | `configure()`: lines per degree of the camera's view with a floor (300 lines; 4a 360), and the 2004 colour-space blit (`hsl2004`); the Settings option unchanged |
| `src/holm_oldschool_look.js` | `eachTexture()`; calls `HolmLookV4.tuneGround()` before the ground compiles; the ground's program key carries the option |
| `src/config.js`, `index.html` | `holmLookOption: '3'`; the script tag (cache-busted) |
| `tools/test_holm_look_v4.js` | locks: default is 3, the switch, pixel sizes and floors, the material pass, the colour step |
| `tools/ref2004/look_metrics.py` | the numbers above (`python tools/ref2004/look_metrics.py options`) |
| `tools/ref2004/capture_look_options.js` | our frames per option (`REF_OURS_BASE=... node tools/ref2004/capture_look_options.js --looks 3,4a,4b,4c`) |
| `tools/ref2004/look_options_page.py` | the private review page `C:\Users\iQwaZ\ref2004_captures\review\look_options.html` (2004 imagery: outside the repo, never published) |
| `tools/bench_look_v4.js` | the frame-rate bench |
| `tools/run_smoke_headless.js`, `qa_osrs_menu.js`, `qa_holm_island.js`, `qa_holm_island_playthrough.js` | `SMOKE_QUERY` (e.g. `&look=4b`) appended to the page URL |

IP: numbers and our own eyes only; no 2004 texture, model or image is in our assets. 2004 frames and every sheet or
page that shows them stay in `C:\Users\iQwaZ\ref2004_captures\`; localhost only.
