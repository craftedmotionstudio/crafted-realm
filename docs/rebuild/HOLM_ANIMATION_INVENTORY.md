# Tutor's Holm animation inventory (finish goal M6.4 + owner acceptance "everything that could have an animation has one")

Branch `holm-anim-pass` (worktree `CraftedRealms-Anim`, from live `540e403d`). Style bar: 2004 old-school RuneScape:
simple, readable, stepped where the old client stepped, never floaty. Timing, XP, odds, combat and the navigation graph
are not touched (proof at the end).

How each thing moves is written as:
- **GLB clip**: a Blender clip in the model itself, played by `THREE.AnimationMixer`;
- **Blender curve**: a Blender-authored motion (an animated empty in a Blender pack) applied at runtime to a model that
  cannot carry a new clip (the building models are hash-bound to their measured navigation graphs, so their bytes never
  change);
- **code**: runtime motion written in JavaScript (effects: flicker, sparks, smoke, dust);
- **none**: it does not move.

## Before (live `540e403d`, measured 2026-09-29 in the in-app browser on `?holmIsland=1` and by reading the GLBs)

### M6.4 list

| Thing | Where | Before |
|---|---|---|
| Beacon lever pull | Lastlight lantern gallery | **GLB clip** `beacon-lever` Pull / Reset (holm-props-v4), the building's own lever mesh hidden; works |
| Beacon beam | Lastlight lamp | **GLB clip** `beacon-beam` Sweep (holm-props-v4), shown while lit; lamp meshes go emissive; works |
| Tree fall on chop | the three teaching oaks (survival camp) | **code**: the felled tree is cloned and rotated 90 degrees about x in 0.9 s (smooth quadratic), in a random direction (`Math.random`), then removed at 1.6 s; the stump (child 0 of the lesson group) stays until the 8 s respawn. Works, but floaty, random direction, no landing |
| Fishing ripple | Minnow Hollow (3 moving spots) | **GLB clip** `fishing-ripple-anim` Ripple (holm-props-v4) per spot + code net splash ring and droplets on every roll, fish shadows, leaping fish, ducks, frog (holm_fishing.js). Done |
| Furnace glow | cavern furnace | **GLB clip** `furnace-glow` Flicker (holm-props-v4), always on; no change while smelting |
| Anvil sparks | cavern anvil | **GLB clip** `anvil-sparks` Burst, fired by a 0.9 s timer while `Player.action.type==='smith'`: not tied to the hammer strike |
| Island building doors | bakehouse, Quest Lodge, bank, Lastlight storm door (progress gates) | **code** smoothstep swing (lodge: its own GLB clip `Lodge_DoorOpenClose`) once, when the lesson that earns it completes, usually while the player is far away; then open for good. No swing when the player walks through |
| Guide marker | current objective | **Blender render**: the hint arrow is a sprite rendered from our Blender arrow (`assets/icons/ui/v3/misc/hint_arrow.png`), bobbing in code; the older Blender `guide-marker` stands down. Done |
| Ferry departure | Lanternfoot Cove, Tobin's skiff | **code**: the boat node slides sideways (+x, quadratic) for 2.2 s with a small roll while the adventurer stays on the pier; then the crossing loads. Weak: sideways, player left behind, gangplank still out |
| Grubkin death | keep court / mage yard practice grubkins, Proving Ground grubkins | **code**: `deathStyle:'flip'` root roll onto the back, hop, lie, sink (combat_fx + tickDeath); the rig freezes in whatever pose it was in (no death clip; the mixer is not updated while dying) |
| Bank | Holm Bank counter and vault | **none**: the counter and the vault gate call `UI.openBank()`; nothing in the world reacts |

### Owner acceptance list and the task's extras

| Thing | Where | Before |
|---|---|---|
| Tutors idle / talk / wave | 10 tutors | **GLB clips** idle, talk (while the chat box is open), wave (first approach). Done |
| Tutors walk | 10 tutors | **none**: every tutor GLB has a `walk` clip but nobody walks; they stand on one tile |
| Practice enemies idle / walk / attack / block | grubkins | **GLB clips** idle, walk, attack, block (holm_grubkin_v1); hit = code root squash + lean-back recoil. Done |
| Practice enemies death | grubkins | code flip only (above) |
| Proving Ground humanoids death | poacher, warlock | code root topple; the kit's own `death` / `hit` clips are never played |
| Player walk / run / skilling / combat / climb | adventurer | **GLB clips** (character kit). Hands off in this pass (the owner is choosing gait in the Gait Lab) |
| Guide House doors | arrival Guide House | **GLB clips** DoorNorthOpen / DoorSouthOpen on click (holm_arrival_door_motion). Done |
| Guide House cellar hatch | Guide House | **code** lid swing on climb. Done |
| Keep undercroft trapdoor | Warden's Keep hall | **none**: a static open-hatch prop |
| Levers | Lastlight | see beacon lever. Done |
| Lastlight beacon light | Lastlight | lamp emissive + beam. Done |
| Mill wheel | Creakwheel Mill | **GLB clips** WheelTurn (6 rpm), FoamFlow, SplashPulse + paddle / creak / water sounds. Done |
| Fires: kitchen hearth + oven (range) | bakehouse | **GLB clips** HearthFlicker0-2, OvenFlicker0-2. Done |
| Fires: lodge hearth | Quest Lodge | **GLB clips** LodgeHearthFlicker0-2. Done |
| Fires: Guide House hearth | Guide House | **GLB clips** HearthFlicker0-2. Done |
| Fires: lit logs (firemaking) | anywhere | Blender campfire, game flicker drives its flame mesh. Done |
| Fires: cavern wall torches | ore workings | **none**: `Cavern_TorchFlame` x3 stand still |
| Bellows | cavern furnace | **none**: `Cavern_FurnishingPropsBellows` never pumps |
| Rope into the shaft | Quarry Gate | **none**: the tied rope appears at once (visible toggle); climbing uses the kit climb clip |
| Ferry bell | Lanternfoot Cove | **none**: `cove-bell_Bell` hangs still ("Tobin rings it when the skiff is ready") |
| Water: sea, creek, pond | island | animated (look v3 water, creek sheet, Minnow Hollow). Done |
| Trees: breeze | habitat oaks / birches / pines, hazel | **GLB clips** Breeze. Done; the oaks drop the odd Blender leaf (fx_leaves). Done |
| Level-up | adventurer | Blender-sprite fireworks. Done |
| Chickens, sheep, cow | Haycombe Farm | **none**: five hens, four sheep and a cow are still props (examine only) |
| Chimney smoke | Guide House, bakehouse, Quest Lodge, bank chimneys | **none** |
| Flags / banners | none on the island | n/a (no flag or banner model exists on the Holm) |
| Moored boats | arrival dock boat, haven skiff | **GLB clips** Breeze (arrival dock), HavenBoatIdleBob. Done |

## After

(filled in at the end of the pass)
