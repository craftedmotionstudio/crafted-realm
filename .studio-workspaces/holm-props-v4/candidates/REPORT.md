# holm-props-v4 — animated props

Built by `tools/blender/build_holm_props_v4.py` (Blender 4.5 headless). Outputs `props.glb` (6 roots, 8 clips),
`props.blend`, `manifest.json` (v3 format + per-asset `clips` with duration / loop intent / driven nodes). Status: candidate;
runtime check still to do.

## Conventions
- glTF Y-up, 1 unit = 1 tile, root origin at ground contact unless noted in the table. Colours authored sRGB, drawn as-is;
  the build checks every exported baseColorFactor / emissiveFactor. Emission strength exactly 1.0 (no
  KHR_materials_emissive_strength in the file; asserted). `beam-light` is alphaMode BLEND, alpha 0.25.
- Animation = object transforms only (no morph targets, no skins), exported with NLA_TRACKS mode: every clip is an NLA
  track of that exact name on each node it drives, merged by the exporter into one glTF animation, sampled at 30 fps and
  slid to t=0. Root nodes are never animated, so the runtime can place/rotate roots freely. Looping clips end on their
  start pose. Clip names are unique across the pack, so `THREE.AnimationClip.findByName(gltf.animations, name)` works.
- Validation (in the build): GLB JSON check (every clip present, duration = authored length, channels only under the
  expected root, root nodes identity) + re-import of the GLB into a clean Blender scene asserting each clip name exists
  as an action with non-zero duration. sha256 dcdd2a5f…8e1299.

## Assets and clips
| root | tris | pivot | rest bounds min / max (x,y,z) | clips (duration, mode) |
|---|---|---|---|---|
| beacon-lever | 308 | ground centre of the pedestal; arm pivot = child node beacon-lever_Arm at y 0.92 (axle, rotates about X) | -0.18, 0.00, -0.23 / 0.18, 1.27, 0.18 | `Pull` 0.90s once; `Reset` 0.90s once |
| beacon-beam | 16 | cone apex (the lamp) | 0.00, -1.11, -1.11 / 12.00, 1.11, 1.11 | `Sweep` 6.00s loop |
| guide-marker | 48 | arrow tip at rest (Hover lifts it 0..0.25); runtime sets the float height on the root | -0.22, 0.00, -0.22 / 0.22, 0.60, 0.22 | `Hover` 1.20s loop; `Spin` 2.00s loop |
| fishing-ripple-anim | 608 | water-surface centre | -0.39, -0.03, -0.40 / 0.38, 0.07, 0.39 | `Ripple` 1.60s loop |
| furnace-glow | 352 | ground (hearth floor) centre | -0.26, 0.00, -0.16 / 0.29, 0.54, 0.14 | `Flicker` 1.00s loop |
| anvil-sparks | 96 | strike point on the anvil face | -0.75, -0.34, -0.80 / 0.73, 0.24, 0.67 | `Burst` 0.50s once |

Totals: 1,428 triangles (budget 2,500), 10 materials (budget 10): iron, iron-worn, bronze, marker-rim, ripple, marker-gold, beam-light, flame-orange, flame-yellow, ember.

- beacon-lever: 8-sided iron plinth, tapered column, collar, head block with two fork cheeks, axle + nuts, stop block and a
  front catch lug. Bronze arm (hub, 6-sided tapering rod, iron ferrule, faceted knob) is the child node
  `beacon-lever_Arm` at y=0.92 on the axle; its rest pose is up-back (-32 deg). `Pull` swings it about X to 112 deg
  (down-forward, towards +Z) with a small overshoot and settle; `Reset` returns it. Play once, clampWhenFinished.
- beacon-beam: two nested open 8-sided cones (outer r 1.2 at x=12, inner r 0.6 core at x=10.8) with apex at the root
  origin, pointing +X; translucent pale gold, emissive 1.0, double-sided. `Sweep` spins `beacon-beam_Cone` 360 deg about
  +Y in 6 s (linear, loop). Runtime should keep depthWrite off for the cone if sorting artefacts show.
- guide-marker: 4-sided yellow arrow head pointing down (tip at origin), dark bronze outline collar at the girdle, square
  shaft with dark upper band and faceted cap, 0.6 tall. `Hover` (on `guide-marker_Bob`: tip 0..0.25, 1.2 s sine loop) and
  `Spin` (on `guide-marker_Gem`: 360 deg about Y, 2 s loop) drive different nodes, so play both at once.
- fishing-ripple-anim: 3 broken, tapered, crested ripple rings in the v2 style + 3 bubble lumps. `Ripple` (1.6 s loop):
  each ring rises from just under y=0, spreads from r~0.09 to r~0.49 while its crest swells then flattens, and sinks
  back under the surface; rings are staggered by 1/3 cycle so one is always spreading. Bubbles bob through the surface.
  The fade relies on the water plane at y=0 hiding what is below it.
- furnace-glow: low faceted ember bed (emissive red-orange) with dark coal lumps and hot chips, 4 orange + 3 yellow flame
  tongues (each its own node pivoting at its base). `Flicker` (1.0 s loop): seeded, irregular stretch / squash / sway
  keys every 1/6 s per tongue.
- anvil-sparks: 12 elongated emissive-yellow chips at the origin. Rest pose scale 0 (invisible). `Burst` (0.5 s, once):
  flash, then fly outward on ballistic arcs (gravity 5.5), turning to face their velocity and shrinking to zero at a
  seeded 75-100 % of the clip.

## Validation
- `Pull`: re-imported as 1 action(s), duration 0.900 s
- `Reset`: re-imported as 1 action(s), duration 0.900 s
- `Sweep`: re-imported as 1 action(s), duration 6.000 s
- `Hover`: re-imported as 1 action(s), duration 1.200 s
- `Spin`: re-imported as 1 action(s), duration 2.000 s
- `Ripple`: re-imported as 1 action(s), duration 1.600 s
- `Flicker`: re-imported as 1 action(s), duration 1.000 s
- `Burst`: re-imported as 1 action(s), duration 0.500 s

## Proof renders
EEVEE, Raw view transform (as the game), in `scratchpad/holm_props_v4/`: lineup.png, <Clip>_1..3.png (3 frames per clip),
sheet.png (lineup + all clip frames: Pull, Reset / Sweep, Hover / Spin, Ripple / Flicker, Burst).

## Self-review
1. Reads well: lever swing (up-back -> down-forward on its axle), flicker, spark burst and beam sweep are unmistakable in
   the frame strips; the furnace glow and sparks keep full colour under the Raw view (emissive 1.0, no extension).
2. Weaker: guide-marker Spin is 4-fold symmetric, so it reads as a glint more than a turn; ripple fade relies on the water
   plane at y=0 hiding the sunk rings (would pop on a translucent/absent water surface); beam alpha sorting untested.
3. Not yet checked in the runtime (three.js r128 mixer playback, LoopOnce clamp for Pull/Reset/Burst, beam depthWrite).
