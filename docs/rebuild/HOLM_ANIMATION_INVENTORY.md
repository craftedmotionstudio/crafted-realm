# Tutor's Holm animation inventory (finish goal M6.4 + owner acceptance "everything that could have an animation has one")

Branch `holm-anim-pass` (worktree `CraftedRealms-Anim`, from live `540e403d`). Style bar: 2004 old-school RuneScape:
simple, readable, stepped where the old client stepped, never floaty. Timing, XP, odds, combat and the navigation graph
are not touched (proof at the end).

**Scope change (owner, via the coordinator, 2026-09-29):** the grubkins are being replaced by a creatures pass
(`CraftedRealms-Creatures`: a large rat, goblins, chickens and cows with full idle / walk / attack / hit / death clips).
Every practice-enemy and animal animation is **owned by the creatures pass** and was dropped from this pass (a grubkin
death clip and animated hens, sheep and a cow were built here first and then removed, unmerged). This pass also stays
clear of the adventurer's clip timing (another agent is fixing a stuck action loop): it only reads the player's clips.

How each thing moves is written as:
- **GLB clip**: a Blender clip in the model itself, played by `THREE.AnimationMixer`;
- **Blender curve**: a Blender-authored motion (an animated empty in `holm-anim-motions-v1`) applied at runtime to a part
  that cannot carry a new clip (the building models are hash-bound to their measured navigation graphs, so their bytes
  never change; the teaching oak is the shared tree-family model);
- **Blender sprite**: a Blender-rendered image drawn by code (smoke, dust, the hint arrow);
- **code**: runtime motion written in JavaScript;
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
| Guide marker | current objective | **Blender sprite**: the hint arrow is rendered from our Blender arrow (`assets/icons/ui/v3/misc/hint_arrow.png`), bobbing in code; the older Blender `guide-marker` stands down. Done |
| Ferry departure | Lanternfoot Cove, Tobin's skiff | **code**: the boat node slides sideways (+x, quadratic) for 2.2 s with a small roll while the adventurer stays on the pier; then the crossing loads. Weak: sideways, player left behind, gangplank still out |
| Grubkin death | keep court / mage yard practice grubkins, Proving Ground grubkins | **code**: `deathStyle:'flip'` root roll onto the back, hop, lie, sink (combat_fx + tickDeath); the rig freezes (no death clip) |
| Bank | Holm Bank counter and vault | **none**: the counter and the vault gate call `UI.openBank()`; nothing in the world reacts |

### Owner acceptance list and the task's extras

| Thing | Where | Before |
|---|---|---|
| Tutors idle / talk / wave | 10 tutors | **GLB clips** idle, talk (while the chat box is open), wave (first approach). Done |
| Tutors walk | 10 tutors | **none**: every tutor GLB has a `walk` clip but nobody walks; they stand on one tile |
| Practice enemies idle / walk / attack / block | grubkins | **GLB clips** idle, walk, attack, block (holm_grubkin_v1); hit = code root squash + lean-back recoil |
| Practice enemies death | grubkins | code flip only (above) |
| Proving Ground humanoids death | poacher, warlock | code root topple; the kit's own `death` / `hit` clips are never played |
| Player walk / run / skilling / combat / climb | adventurer | **GLB clips** (character kit). Hands off in this pass (the owner is choosing gait in the Gait Lab) |
| Guide House doors | arrival Guide House | **GLB clips** DoorNorthOpen / DoorSouthOpen on click (holm_arrival_door_motion). Done |
| Guide House cellar hatch | Guide House | **code** lid swing on climb. Done |
| Bakehouse store door | bakehouse, kitchen to store room | **none**: a door leaf drawn shut across a walkable doorway (the adventurer walks through it) |
| Keep undercroft trapdoor | Warden's Keep hall | **none**: a route prop modelled standing open |
| Levers | Lastlight | see beacon lever. Done |
| Lastlight beacon light | Lastlight | lamp emissive + beam. Done |
| Mill wheel | Creakwheel Mill | **GLB clips** WheelTurn (6 rpm), FoamFlow, SplashPulse + paddle / creak / water sounds. Done |
| Fires: kitchen hearth + oven (range) | bakehouse | **GLB clips** HearthFlicker0-2, OvenFlicker0-2. Done |
| Fires: lodge hearth | Quest Lodge | **GLB clips** LodgeHearthFlicker0-2. Done |
| Fires: Guide House hearth | Guide House | **GLB clips** HearthFlicker0-2. Done |
| Fires: lit logs (firemaking) | anywhere | Blender campfire, game flicker drives its flame mesh. Done |
| Fires: cavern wall torches | ore workings | **none**: `Cavern_TorchFlame` (all three flames in one mesh) stands still |
| Fire rings | survival camp, Minnow Hollow | unlit rings of stones (nothing burns) |
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

## After (branch `holm-anim-pass`)

Runtime: `src/holm_island_anim.js` (HolmIslandAnim, loaded, ticked and disposed by HolmIslandFx; island only).
Blender: `tools/blender/build_holm_anim_motions_v1.py` -> `.studio-workspaces/holm-anim-motions-v1` (published to
`assets/holm_island/ws/holm-anim-motions-v1/candidates/motions.glb`), `tools/blender/build_fx_smoke_v1.py` ->
`assets/textures/fx/chimney_smoke_v1.png`. Unit test: `tools/test_holm_anim_pass.js`. Frame sequences:
`scratchpad/holm_anim_pass/frames/<anim>/` (fNN.png, frames.json, sheet.png; `tools/capture_holm_anim_pass.js`).

### M6.4 list

| Thing | After | How it is triggered |
|---|---|---|
| Beacon lever pull | unchanged (GLB clip Pull / Reset) | the lever service (HolmIslandLessons.pullLever) |
| Beacon beam | unchanged (GLB clip Sweep) | the beacon lit |
| Tree fall on chop | **Blender curve** `tree-fall` Fall, 2.2 s, stepped 15 poses a second: a creak (lean, settle, lean), the fall with gravity, a bounce on the ground and the settle, a puff of Blender-sprite dust and a soft thud where the crown lands, a moment lying, then it sinks away. It always falls AWAY from the woodcutter (no randomness). The stump stays for the 8 s respawn, as in 2004 | the game's own depletion (`u.alive=false`, the tree hidden, the stump kept) on a teaching oak |
| Fishing ripple | unchanged (done) | the fishing spots |
| Furnace glow | flares in two steps (x1.18 / x1.28) while smelting, back to its flicker after | a smelt action within 3.5 tiles of the furnace |
| Bellows (new) | **Blender curve** `bellows-pump` Pump, 0.8 s loop, stepped: squash to 0.7 from the base and fill again | a smelt action at the furnace |
| Anvil sparks | the existing Burst fires on each hammer STRIKE: the lowest point of the adventurer's right hand in the smith clip (read live; one strike per stroke), with a small clink; a clip-time fallback (clip second 0.42) if a dropped frame skips the low | a smith action at the anvil |
| Island building doors | the four progress doors now stand shut until the adventurer comes to them (within 2.2 tiles on their level) or walks a route through them (the next four steps), swing open on the **Blender curve** `door-swing` Open (0 -> 94 -> 90 deg, stepped) and swing shut 1.2 s after the adventurer has passed (Close: 90 -> 0 with a knock on the latch), with the furnishing creak / thud; a locked door stays shut and says why, as before; the lodge's own oak door uses its own clip, driven the same way. The bakehouse **store door** (a loose leaf across a walkable doorway) swings the same way. The old-school menu offers **Open** on a door that stands shut. The doorways' walk-graph state is unchanged (proof below) | `HolmIslandGates.setDriver` (HolmIslandAnim drives the leaves) + `HolmArrivalPlayer.route()`; the store door by the same rule |
| Guide marker | unchanged (Blender-rendered hint arrow) | the objective |
| Ferry departure | boarding rings the **ferry bell** (Blender curve `bell-swing` Swing: three strokes dying away, stepped; three dings); the adventurer and Tobin are aboard (deck and stern points found on the hull), the **plank slides aboard**, the skiff **pushes off the pier and pulls out north** to the open sea about six tiles with a bob, a roll and a small yaw, turning about its own keel (Blender curve `ferry-castoff` CastOff, 5 s); then the crossing loads. The "Board the skiff" arrow is cleared and the island guide stands down while sailing, so no arrow follows the boat or lingers on the mainland | `HolmIslandCurriculum.board()` -> `HolmIslandFx.sail(go)` -> `HolmIslandAnim.sail` |
| Grubkin death | **owned by the creatures pass** (the grubkins are being replaced) | - |
| Bank | at the **vault** the iron gate swings open 60 degrees about its hinge while the bank window is open and shut when it closes (door curves, with the creak / thud); at the **counter** Teller Maud turns to the adventurer and talks while the bank is open, with a coin chink | the bank window opening (`#bank-modal`) at the vault or the counter stance |

### Owner acceptance list and the task's extras

| Thing | After | How it is triggered |
|---|---|---|
| Tutors idle / talk / wave | unchanged | as before |
| Tutors walk | **GLB clip** walk: while nobody is within 9 tiles, a tutor now and then strolls one linked tile off their spot (same floor, 2004 pace, a tile a tick), stands a few seconds and strolls back; once the adventurer is within 7 tiles they walk home and stay; talking settles them home first and they wave only from home | HolmIslandTutors.update (distance to the adventurer) |
| Practice enemies (idle, walk, attack, hit, death), Proving Ground foes | **owned by the creatures pass** | - |
| Player | hands off (Gait Lab; stuck-loop fix by another agent) | - |
| Guide House doors, cellar hatch | unchanged | as before |
| Bakehouse store door | swings open / shut as the adventurer passes (see doors) | walking through |
| Keep undercroft trapdoor | unchanged: a route prop that stands open (ladder climbs are instant, 2004 style) | - |
| Levers, beacon light | unchanged | as before |
| Mill wheel | unchanged | always |
| Hearth, oven, lodge, Guide House fires; lit logs | unchanged | always |
| Cavern wall torches | flicker in brightness on the **Blender curve** `flame-flicker` Flicker (the three flames are one mesh, so they pulse together) | always |
| Bellows | pump while smelting (above) | smelt action |
| Rope into the shaft | **Blender curve** `rope-drop` Drop, 0.8 s, stepped: the rope pays out from the knot down the shaft with a small overshoot. A restored save's rope just hangs | `HolmShaftRope.tie()` (the rope becoming visible while the adventurer stands at the shaft) |
| Ferry bell | swings and rings on boarding (above) | board |
| Chimney smoke | **Blender sprite** puffs (chimney_smoke_v1.png: four faceted puff cells) rise, drift, grow and fade from the four lit hearths' chimney tops (Guide House, bakehouse, Quest Lodge, bank), one puff about every 0.9 s each, one Points draw call for all of them and the tree dust, only within 48 tiles | always |
| Water, tree breeze, level-up, moored boats | unchanged | as before |
| Chickens, sheep, cow | **owned by the creatures pass** | - |
| Flags | none exist on the island | - |

Still static and not required by the lists (candidates for later): the Quarry Gate winch windlass (an Inspect-only
prop), the bee skep in Hettie's Garden, the scarecrow, the lamp posts and the garden / farm field gates (the farm gates
are walk-graph blockers).

## Proof: rules, timings and the walk graph unchanged

- `git diff 540e403d -- shared/combat.js src/skill_timing.js src/game5_main.js src/game3_systems.js src/combat_engine.js
  src/holm_island_nav.js src/holm_arrival_follower.js src/holm_arrival_player.js docs/rebuild/holm-overhaul/` is empty:
  skilling timings, XP, odds, combat, movement and the island data are untouched. The pass never calls `Math.random` and
  never writes XP, items, actions, ticks, clip timings or the graph (pinned by `tools/test_holm_anim_pass.js`).
- The composed island walk graph (in-browser, `HolmArrivalQA.navGraph()`, nodes and links hashed) is identical before and
  after: fresh adventurer 10459 nodes / 55508 links `ebd4abe4-ddc32966`, all 18 lessons (every gate earned) 10463 / 55548
  `3894178f-5a739b13`, including after three seconds of the door driver
  (`scratchpad/holm_anim_pass/graph_hash_base.json`, `graph_hash_after.json`). No building model byte changed (the
  motions drive parts of the loaded models; the models' hashes against their graphs still check at load).
- Animations follow the game's own events: the fall on the game's depletion, the sparks on the smith clip the game plays
  on its 2.4 s stroke, the bellows and glow during the game's smelt, the doors on the adventurer's route, the ferry on
  board(), the vault gate on the bank window.
