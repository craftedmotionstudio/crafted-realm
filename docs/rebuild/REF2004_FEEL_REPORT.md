# How ours feels next to 2004: side-by-side report (2026-09-27)

Harness: `docs/rebuild/REF2004_HARNESS.md` (tools/ref2004). Reference: a local, private run of the Lost City 2004
engine (rs-sdk, revision 274) played by an SDK bot; ours: this worktree (branch `ref2004-harness`, from 18a0efa) played
by the Tutor's Holm driver. Every pair was captured at the same window size (2004 applet x2 = 1530 x 1006) and, where
the section needs it, through the same lens (the 2004 camera measured from its client: 36.1 deg vertical FOV,
22.5-67.3 deg elevation, boom 7.7-13.7 tiles).

**All pair sheets are private** (`C:\Users\iQwaZ\ref2004_captures\sheets\` and `...\characters\SHEETS\`); they are
named below so a reviewer on this machine can open them. Only our-only strips are in the repo (`scratchpad/ref2004/`).
Every target is a number measured from the reference, never a shape or text taken from it.

## The biggest differences, in priority order

| # | Difference | 2004 (measured) | Ours (measured) | Target for ours |
|---|---|---|---|---|
| 1 | **Default camera**: how far and how high | elevation 22.5 deg (pitch 128, the login default; range 22.5-67.3), boom 7.7 tiles (range 7.7-13.7, tied to pitch: +0.023 tile per 2048th), vertical FOV 36.1 deg, look point 0.39 tile above the ground; the player stands **~104 px tall in the 334 px view = 31% of the view height** (measured from the frame) | elevation ~47 deg, boom ~38 tiles (camCtl.dist 33), FOV 30 deg, look point 1.2 above the feet; the player stands **~62 px tall of 1006 = 6%** (projected), i.e. 5x smaller on screen | default elevation 22.5 deg, boom 7.7 tiles, FOV 36 deg, look +0.4 tile; player 28-32% of the view height; arrow-key pitch between 22.5 and 67 deg with the boom growing 7.7 -> 13.7 tiles; no free zoom (or a zoom whose default is the numbers above) |
| 2 | **Walk and run pace** | walk 1.61 tiles/s (1 tile per 600 ms tick), run 3.39 tiles/s (2 tiles per tick); new characters start **walking** (run is a toggle in the controls tab) | walk 2.40, run 4.25 tiles/s; **run is on by default** | walk 1.67 tiles/s, run 3.33 tiles/s; run off for a new character |
| 3 | **Walk / run cadence and stride** | walk cycle 0.94 s (8 anim frames) = 2.13 steps/s, 0.50 body heights per step; run cycle 0.66 s = 3.04 steps/s, 0.73-0.75 body heights per step | walk cycle 0.50 s = 4.0 steps/s, 0.32 body heights per step; run 0.53 s = 3.75 steps/s, 0.61 body heights | walk: 2.1 steps/s with 0.5 H steps; run: 3.0 steps/s with 0.74 H steps (at our 1.85-tile height that is 0.93 / 1.37 tiles per step - see #4) |
| 4 | **Character scale in the world** | man 193 units = **1.51 tiles**, woman 1.49 | **1.85 tiles** (+23%) | 1.5 tiles tall (keep doors, counters and trees where they are) |
| 5 | **Walk / run body motion** | forward lean +5 deg walking, **+14 deg running**; arms swing with bent elbows (arm band up to 0.42-0.50 H walking, 0.53-0.59 H running); legs open to 0.51-0.62 H walking, 0.78 H running; head bob 2.5-6% H | upright (0 to -3 deg), arms nearly straight (0.31-0.32 H walking, 0.39-0.45 running), legs 0.50 / 0.62-0.68 H, bob 1.3-2% H | lean +5 / +14 deg, elbow-bent arm swing reaching 0.45 / 0.56 H, leg opening 0.56 / 0.78 H, bob 3-5% H |
| 6 | **Body proportions** (front, fraction of height H) | head 0.16 H (6.2 heads tall); fingertips 0.50 H down; legs 0.45 H (man) / 0.43 (woman); waist 0.18 H; feet together (stance 0.08-0.09 H) with one foot slightly forward | head 0.185 H (5.4 heads); fingertips 0.56 H; legs 0.40 H; waist 0.24 H; feet apart (stance 0.23 H) | head 0.16 H, fingertips 0.50 H, legs 0.44 H, waist 0.18-0.20 H, stance 0.08-0.10 H (heels close, one foot a little forward) |
| 7 | **Screen layout** | a fixed 765 x 503 frame: the 3D view is only **512 x 334 (67% x 66%)**, framed by heavy stone chrome; chat box 519 x 165 under the view, side panel 243 x 335 right, minimap top-right; no orbs | full-bleed 3D with floating panels; HP / prayer / run / spec orbs, an objective banner, zone label, XP tracker, hover label on the target | see the UI section: fixed frame proportions, no orbs, tutorial text in the chat box |
| 8 | **Scenery colour, light and texture** | dark and saturated: mean luminance 0.19-0.25, field grass saturation 0.73, edge density (texture) 2.3 in town / 1.7 on water; black past ~25 tiles | 1.7x brighter (0.35-0.41), grass saturation 0.50, edge density 1.2 / 0.8; pale sky haze | luminance 0.20-0.25, grass saturation ~0.7, textured paths / walls / water / canopies (edge density ~2), black void past ~25 tiles |
| 9 | **Skilling animation timing** | chop 0.78 s per swing (6 frames), net cast 1.80 s (11 frames), cook 1.77 s, bake 2.43 s, smelt 2.42 s, fire-lighting kneel held ~4 s | chop 1.0 s, net 1.6 s, cook 1.33 s, smelt 1.2 s, firemake 1.0 s | chop 0.78 s, net 1.8 s, cook ~1.8 s, smelt ~2.4 s, light a fire with a held kneel of several seconds |

Rubric grades are at the end.

## A. Characters: the default man and woman

Sheets (private): `characters/SHEETS/characters_{designer_views,designer_screen,world_default,world_matched_lens,turnaround,silhouettes,walk_side,run_side,walk_game,run_game}_{man,woman}.png`.
Numbers: `characters/metrics.json`. Our-only strips: `scratchpad/ref2004/characters/`.

**The designer.** 2004's designer fills the whole 3D view with a stone panel: seven Design rows and five Colour rows of
big white arrow buttons (about 42 x 30 px of a 765 px frame, 5.5% of its width) with yellow 12 px labels, Male /
Female buttons, and the model in the middle **swaying +-45 deg** (never showing its side or back) under a light that
comes from the front-left. The default man is bald with a beard, yellow-olive shirt with short puffed sleeves, green
trousers, dark boots, grey wristbands; the default woman is also bald, olive top with a bare midriff, the same trousers.
Ours (DOM-measured at 1530 x 1006): a 760 x 600 window (50% x 60% of the screen) on a dark backdrop, arrows 38 x 26 px
(2.5% of the width), 12 px labels (1.2% of the height), a Body type A/B switch plus Build and Feet-size rows, and a full
turntable. The 2004 panel is ~480 x 310 of 765 x 503 (63% x 62%) with arrows at 5.5% of the width and labels at 2.4% of
the height: **its controls and type are about twice our relative size**. *Target*: panel ~63% x 62% of the window,
arrows >= 5% of the window width, labels >= 2.4% of the window height; sway the preview +-45 deg around the front
(a turntable can stay as an extra, not the default view).

**Proportions** (front silhouettes at the same lens, height-matched; `characters_silhouettes_*`):

| fraction of standing height H | 2004 man | 2004 woman | ours man | ours woman |
|---|---|---|---|---|
| height in tiles | 1.51 | 1.49 | 1.85 | 1.85 |
| head, crown to neck | 0.162 (6.2 heads) | 0.159 | 0.185 (5.4 heads) | - (hair covers the neck) |
| fingertips below the crown (arms hanging) | 0.50 | 0.52 | 0.56 | 0.56 |
| crotch below the crown / leg length | 0.55 / 0.45 | 0.57 / 0.43 | 0.60 / 0.40 | skirt |
| width across shoulders incl. arms | 0.33 | 0.30 | 0.34 | - |
| waist width | 0.18 | 0.18 | 0.24 | 0.24 |
| feet spread when idle | 0.09 | 0.08 | 0.23 | 0.23 |
| side-view depth (idle stride + arms) | 0.26 | 0.26 | 0.16 | 0.22 |

What the numbers say: 2004's people are **smaller in the world, longer-legged, with shorter arms and a narrower waist**,
and they **stand with the heels together and one foot slightly forward, knees soft, arms bent a little with loose fists**
(an idle that reads as "about to move"). Ours stand like a mannequin: feet a quarter of the height apart, legs straight
and parallel, arms straight down, hands open. Our heads are ~15% bigger relative to the body (5.4 vs 6.2 heads).

**Walk and run** (`characters_walk_side_*`, `characters_run_side_*`; 8 evenly spaced frames of one cycle):

| | 2004 walk | ours walk | 2004 run | ours run |
|---|---|---|---|---|
| speed, tiles/s (steady) | 1.61 | 2.40 | 3.39 | 4.25 |
| cycle (two steps), s | 0.94 (8 frames) | 0.50 | 0.66 (8 frames) | 0.53 |
| steps per second | 2.13 | 4.0 | 3.04 | 3.75 |
| stride per step, in body heights | 0.50 | 0.32 | 0.73-0.75 | 0.61 |
| max leg opening / H | 0.51-0.62 | 0.50 | 0.78 | 0.62-0.68 |
| widest arm band / H (arm swing) | 0.42-0.50 | 0.31-0.32 | 0.53-0.59 | 0.39-0.45 |
| vertical bob, % of H | 2.5-6 | 1.3 | 4-5 | 2.0 |
| forward lean, deg | +5 to +6 | 0 to -3 | +13 to +14 | +1 to -4 |

2004's walk is slow, long and loose: the head leads the body, the arms swing from the shoulder with the elbows bent and
the hands ahead of the hips on the forward swing, the rear leg straightens fully before it lifts. Its run is a
distinctive forward-pitched sprint (14 deg), elbows at ~90 deg pumping, the back leg extended almost horizontal. Ours
shuffle quickly with the torso upright and the arms nearly locked; our run is a crouched jog. The game-camera strips
(`characters_walk_game_*`) show the same differences from the angle players actually see, and show how small our
character is at our default camera.

**At the default camera** (`characters_world_default_*`, `characters_world_matched_lens_*`): 2004's login view is low
and close - the camera sits 22.5 deg above the horizon, 7.7 tiles from a point 0.4 tile above the player's feet - so
the player is a third of the view tall and the room around him fills the rest. Ours starts ~47 deg up and ~38 tiles
away: the player is a 6%-tall figure on a map (5x smaller than 2004's 31%). Put ours through the 2004 lens (same FOV, elevation, boom in tiles)
and it frames the same way, with our character visibly larger against the world (1.85 vs 1.5 tiles).

## B. What the numbers mean for the character and animation work

- Scale the player (and NPCs) to **1.5 tiles** (our 1.85 -> 1.5, x0.81), keeping the world as it is.
- Re-proportion toward 6.2 heads tall, legs 0.45 H, fingertips at 0.50 H, waist 0.18 H.
- Idle: heels together (stance <= 0.10 H), one foot ~0.1 H forward, soft knees, elbows slightly bent.
- Walk clip: 0.94 s cycle, 0.5 H per step (0.75 tiles at 1.5 tiles tall) so it is slide-free at **1.6-1.67 tiles/s**;
  lean +5 deg, arm band 0.45 H, bob 3-5% H. Run clip: 0.66 s cycle, 0.74 H per step (1.1 tiles) at **3.3 tiles/s**;
  lean +14 deg, elbows ~90 deg, arm band 0.56 H, leg opening 0.78 H.
- Game rules: walk 1.67 tiles/s and run 3.33 tiles/s (a 0.6 s tick moves 1 / 2 tiles); new characters walk.

## C. The tutorial island, played by a bot in both games

Sheets (private): `sheets/tutorial_{arrival,first_instructor_building,survival_instructor,woodcutting,firemaking,fishing,cooking,chef_building,quest_guide_building,mine,smelting_smithing,combat_instructor,combat_melee,combat_ranged,bank}.png`
- each is a full-screen pair (2004 x2 | ours, each game's default camera) and, for actions, 8 frames of one action cycle
from a close side-on camera in both games. Our-only frames: `scratchpad/ref2004/tutorial/`.

The 2004 bot (fresh account, rs-sdk SDK) played from the character designer through the guide, survival, cooking,
quest, mining and combat areas to the bank (step 510); ours played Tutor's Holm lessons 1-16 (study route -> open bank).

| Moment | 2004 | Ours | What differs most |
|---|---|---|---|
| Arrival | inside the first instructor's house, the instructor 2 tiles away, the hint arrow over him, tutorial text in the chat box | on the dock outside, camera high over the island, objective banner at the top | 2004 starts **indoors, close, dark around the edges**; ours starts outdoors on a map |
| First instructor's building | one room, walls and furniture seen from inside at 22.5 deg, the roof removed, black beyond the walls | the whole house seen from above with the roof cut away and the forest around it | framing (camera) and the black surroundings |
| Woodcutting | swing cycle **0.78 s** (6 frames), a quick full-body swing; the tree has a dark trunk and a round leaf-textured crown | chop clip **1.0 s**, one-hand overhead swing, faceted oak | faster, heavier swing in 2004 |
| Firemaking | the player kneels and strikes for ~4 s (tinderbox), then the fire appears on the player's tile and the player steps west | kneel clip 1.0 s at the fire ring | 2004's lighting is a long held kneel |
| Fishing | net cast cycle **1.80 s** (11 frames) at a fishing spot on a pond | net clip 1.6 s | close |
| Cooking | a one-shot 1.77 s cook motion over the fire (19 frames) | cook clip 1.33 s | slightly slower in 2004 |
| Chef's building | a small kitchen interior (range, table), the chef beside the player; baking at the range 2.43 s | bakehouse seen from above with the roof cut away | framing; the interior fills 2004's view |
| Quest guide's building | a small room with the quest guide; the quest tab flashes | the lodge from above | framing |
| The mine | a brown cave with walls all round, rocks with ore specks, black ceiling | a flat cave floor slab in a black void, isometric | 2004's cave is a place you stand in; ours reads as a diorama |
| Smelting / smithing | furnace one-shot 2.42 s (16 frames); the anvil opens a big smithing panel | smelt clip 1.2 s, smith 1.0 s | 2004's are twice as long |
| Combat | red hit splats with white numbers on the target, a 30 x 5 px green/red health bar over the head (1x), one attack animation per attack cycle (the bronze dagger attacks every 4 ticks = 2.4 s); ranged over the fence with arrows | health bars over heads, attack clip 0.6 s, practice foes in a keep court | see the pairs; splat and bar size / placement are measurable on the sheets |
| Bank | the bank window fills most of the 3D view, items in a grid | our bank modal | UI scale (see D) |

*Targets from this section*: the action timings in row 9 of the priority table; the arrival indoors with the camera at
22.5 deg and 7.7 tiles; buildings seen from inside at the low camera (roofs removed, walls kept) rather than from above.

## D. UI: chat box, dialogue, menus, side tabs, minimap, run control

Sheets (private): `sheets/ui_{layout,chat_dialogue,chat_dialogue_full,menu_npc,menu_ground,side_tabs,minimap_run}.png`,
plus every tutorial pair (they are full screens). Our DOM rects: `tutorial/ours/log.json` (`uiRects`).

**Layout at the same window size (1530 x 1006).** 2004 is a fixed frame scaled to fill the window: the 3D view is
512 x 334 of the 765 x 503 frame, so **44% of the screen is 3D and 56% is stone UI chrome**: a chat box of 519 x 165
under the view (34% of the width x 33% of the height, including a 36 px row of chat-filter buttons), a side panel of 243 x 335 on the right (32% x 67%) with seven tab icons above the pack and seven below
(icons ~33 x 36), and a minimap block of ~215 x 160 top-right (the map disc ~145 px = 29% of the height, compass
top-left of it). Ours is full-bleed 3D with floating panels drawn at **the same pixel sizes 2004 used at 1x, on a
screen twice as big**: chat 520 x 190 (34% x 19%), side panel 242 x 386 (16% x 38%; tab buttons 28 x 34, pack slots
46 x 37), minimap 152 x 152 (15% of the height), plus four orbs, an objective banner (226 x 60), a zone label, an
XP-this-session tracker and floating hover labels. Our chrome covers ~17% of the screen, 2004's 56%.
*Targets*: either scale the whole chrome x2 at 1530 x 1006 (i.e. size it to the window height: chat box 33% of the
height, side panel 67%, minimap disc 29%, tab icons 7% of the height, type 2.4% of the height = 24 px at 1006), or,
if the full-bleed view stays, keep those proportions for each panel. No orbs in the 2004 frame (HP is in the
skills tab, run is the Walk / Run buttons in the controls tab); the tutorial instructions live **in the chat box**,
not in a floating banner; no hover labels in the world (2004 shows the hovered action as one line of text in the
top-left corner of the view, with a count of further options).

**NPC dialogue in the chat box** (`ui_chat_dialogue.png`). 2004: chathead at the left, **~65 px tall = 39% of the
chat box height**, the NPC name in dark red centred at the top, 1-4 lines of centred text in a quill-style font at 12 px
(2.4% of the frame height), a blue continue line centred at the bottom, nothing else in the box (no close
button). Ours: chathead ~60 px (32% of our 190 px box), name in dark red, text ~11 px (1.1% of the screen height),
a small blue "Continue", and a close "X" at the top-right. *Targets*: text 2.4% of the screen height (24 px at 1006),
chathead 39% of the box height, no close button (the dialogue ends by clicking through), continue line centred at
~80% of the box height.

**Right-click menu** (`ui_menu_*`): 2004 draws a plain black-bordered box with a one-line header and one row per
option, the target name coloured (yellow NPCs with a green-to-red combat level, cyan objects), rows 15 px tall at 1x
(3% of the height; ~30 px at 1006). Our NPC menu was not captured this run (no tutor within reach at the bank); the
ground menu is in `ui_menu_ground.png`.

**Side tabs** (`ui_side_tabs.png`): 2004's panel is a stone frame with the pack as a 4 x 7 grid of ~36 x 32 cells at
1x (7% x 6% of the frame); ours is a 4 x 7 grid of 46 x 37 at 1530 (3% x 4%).

**Minimap** (`ui_minimap_run.png`): 2004's disc shows ~18 tiles around the player in dark-green terrain with white wall / fence
lines, yellow NPC dots, a flag and the compass; ours shows a zoomed-out island in blue sea. *Target*: the disc at 29%
of the screen height showing ~18 tiles around the player (the 2004 minimap scale), walls as white lines.

**Run control**: 2004 has **no run orb**: run is off at login and toggled with the Walk / Run buttons in the controls
tab (energy shown there). Our run orb and run-on default are later-era features.

## E. Scenery at the default camera: town, field with trees, water

Sheets (private): `sheets/scenery_{town_0,town_1,field_0,water_0}.png` - left the 2004 viewport x3 at pitch 128, middle
ours through the same lens (spot and yaw chosen so the adventurer is in view), right ours at our own default camera.
2004 spots: the castle courtyard and the town square on the mainland, a field with trees, the river by a bridge.
Ours: the paths by the lodge / bakehouse, the oak stand by the survival camp, the arrival dock and sea.
Numbers (`scenery/image_stats.json`, mean over the views; the 3D view only, no UI):

| | town 2004 | town ours | field 2004 | field ours | water 2004 | water ours |
|---|---|---|---|---|---|---|
| mean saturation | 0.31 | 0.39 | **0.73** | 0.50 | 0.46 | 0.46 |
| mean luminance (0-1) | **0.25** | 0.37 | **0.19** | 0.35 | **0.21** | 0.41 |
| luminance spread (std) | 0.10 | 0.12 | 0.08 | 0.13 | 0.12 | 0.10 |
| edge density (texture / detail, x100) | **2.29** | 1.24 | 1.15 | 0.95 | **1.68** | 0.81 |

Reading the sheets with the numbers:
- **2004 is darker and deeper**: mean luminance 0.19-0.25 against our 0.35-0.41 (ours ~1.7x brighter). Its grass is a
  deep, saturated green (saturation 0.73 in the field vs our 0.50) shaded smoothly across the slopes; ours is paler and
  shows the tile checker of close shades. Above the ground 2004 is **black** past ~25 tiles (the draw distance); ours
  is a pale sky / sea haze.
- **2004 carries its detail in textures**: cobblestone paths with dark mortar, stone walls, textured water, leaf
  textures on round tree canopies - roughly **2x our edge density** in towns and on water. Ours is flat-shaded
  facets with little texture, so it reads cleaner and more "polished".
- **Trees**: 2004 trees are tall trunks with two or three round, leaf-textured canopy lumps; ours are faceted low-poly
  crowns. **Water**: 2004's river is a pale blue-grey textured surface with hard banks; ours is a smooth blue sheet.

*Targets*: mean luminance 0.20-0.25 at the default camera, grass saturation ~0.7, edge density ~2 (paths, walls,
water, canopies textured), black beyond ~25 tiles, water pale blue-grey and textured.

## F. Rubric grades (how close ours feels, 1 = far, 5 = indistinguishable in feel)

Graded from the pair sheets named above; "-" = not what the pair tests.

| Pair | Proportions | Stance | Animation timing / feel | Colour / lighting | Texture density | UI layout | Polish level (5 = as rough as 2004) |
|---|---|---|---|---|---|---|---|
| Designer, default man / woman | 2 | 2 | 2 (full spin vs +-45 sway) | 3 | 3 | 2 (controls and type half size) | 2 |
| Idle turnaround (8 angles) | 2 | 1 | - | 3 | 3 | - | 2 |
| Walk strips (side + game camera) | - | - | 1 (2x cadence, upright, stiff arms) | - | - | - | 2 |
| Run strips | - | - | 1 (no lean, crouched jog) | - | - | - | 2 |
| Default camera / world framing | 2 (1.85 vs 1.5 tiles) | - | - | 2 | 2 | 1 (camera 5x farther, 2x higher) | 2 |
| Tutorial moments (arrival -> bank) | - | - | 2 (skill clips near 2004 length, see C) | 2 | 2 | 2 | 2 |
| NPC dialogue in the chat box | - | - | - | 3 | 3 | 3 (right structure, half-size type, extra close button) | 3 |
| Right-click menu | - | - | - | 3 | - | 3 | 3 |
| Side tabs / pack | - | - | - | 3 | 3 | 2 (half-size at the same window) | 3 |
| Minimap | - | - | - | 2 | 2 | 2 (small, zoomed-out, sea-blue) | 2 |
| Run control | - | - | - | - | - | 1 (orb + run on by default vs Walk/Run buttons, walk default) | - |
| Scenery: town | - | - | - | 2 (1.5x brighter, less contrast) | 2 (half the edge density) | - | 2 |
| Scenery: field with trees | - | - | - | 2 (grass saturation 0.50 vs 0.73) | 3 | - | 2 |
| Scenery: water | - | - | - | 2 | 2 | - | 2 |

## G. Suggested order of work (each is re-measurable with one harness command)

1. **Camera** (#1) - biggest single change to the feel; re-check with `bun tools/ref2004/run.js characters --side ours`
   (`world_default` sheets) and `... scenery --side ours`.
2. **Pace**: walk 1.67 / run 3.33 tiles/s, run off for new characters (#2) - `characters --side ours` gait numbers.
3. **Character scale 1.5 tiles and proportions** (#4, #6) - the character agent; `characters --side ours` body numbers.
4. **Walk / run clips** (#3, #5) - cadence 2.1 / 3.0 steps/s, stride 0.5 / 0.74 H, lean 5 / 14 deg, arm band 0.45 / 0.56 H.
5. **UI scale and frame** (#7) - `tutorial --side ours` then `analyze.py ui`.
6. **Scenery light and texture** (#8) - `scenery --side ours`, compare `image_stats.json`.
7. **Skill clip timings** (#9) - `tutorial --side ours`.

