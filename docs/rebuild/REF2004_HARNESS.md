# 2004 reference harness (tools/ref2004)

Owner idea, 2026-09-27: "spin up a 2004scape game and have a bot play the 2004scape version and play our version,
compare and contrast everything to see how it feels, and continue to play out both games making corrections along
the way, making ours feel more like the 2004scape version."

This harness runs a **local, private** copy of the 2004 game (rs-sdk: the Lost City engine + a bot SDK + a browser bot
client) next to Crafted Realm, drives a bot through both, and produces matched pairs (2004 left, ours right) plus
plain-number measurements. The findings live in `docs/rebuild/REF2004_FEEL_REPORT.md`.

## IP rules (hard)

- The 2004 game content (models, maps, textures, sprites, audio, text, cache) belongs to Jagex. We only **run** it on
  this machine, as a visual / feel reference, exactly like the Bible_References screenshots.
- **Never** copy, extract, trace, convert or import any of its assets, data, maps or text into Crafted Realm. Targets
  in our docs are **numbers** (ratios, seconds, tiles per second, degrees), never shapes or text lifted from it.
- All 2004 captures and every sheet containing 2004 imagery live **outside the repo** in
  `C:\Users\iQwaZ\ref2004_captures\` and are never committed or published. The code enforces it:
  `tools/ref2004/lib/common.js out2004()` and `analyze.py out2004()` refuse any path inside the repo.
  Only sheets made purely of our own game go to `scratchpad/ref2004/`.
- **Localhost only.** Never connect to a public or demo server (rs-sdk-demo.fly.dev etc.). `common.js` refuses any
  2004 endpoint that is not localhost / 127.0.0.1; the harness sets `TELEMETRY=false` (rs-sdk's bug-report CLI posts to
  the public demo server - the harness never calls it).
- Nothing is committed to the rs-sdk checkout. Local config is passed as environment variables only.

## What runs where

| Piece | Path | Port |
|---|---|---|
| 2004 engine (Lost City, revision 274) | `C:\Users\iQwaZ\rs-sdk\server\engine` | web client + assets http://localhost:8888, game 43594, login/friend/logger workers 43500 / 45099 / 43501 |
| Bot gateway (SDK <-> bot client) | `C:\Users\iQwaZ\rs-sdk\server\gateway\gateway.ts` | ws://localhost:7780 |
| Web client (bot client bundle) | `C:\Users\iQwaZ\rs-sdk\server\webclient\out\bot` (prebuilt, served by the engine at `/bot`) | - |
| Our game | this worktree, `python tools/serve_static.py 8108 "<worktree>"` | http://127.0.0.1:8108 |

The harness drives both with headless Chrome (puppeteer-core from `CraftedRealms-Claude/node_modules`) under **bun**
(`C:\Users\iQwaZ\.bun\bin\bun.exe`, needed because the rs-sdk SDK is TypeScript).

## Start / stop

```sh
# 2004 stack (engine + gateway, supervised: the engine is restarted if it dies)
node tools/ref2004/stack.js start      # waits until :8888 and :7780 answer
node tools/ref2004/stack.js status
node tools/ref2004/stack.js stop       # kills only the PIDs it started (logs/stack_pids.json)

# what stack.js runs (for reference, env-only local config):
#   cd C:\Users\iQwaZ\rs-sdk\server\engine && NODE_TICKRATE=600 EASY_STARTUP=true bun run src/app.ts
#   cd C:\Users\iQwaZ\rs-sdk && bun server/gateway/gateway.ts
# NODE_TICKRATE=600 is the real 2004 tick (rs-sdk defaults to 400 ms); EASY_STARTUP=true runs the login / friend /
# logger servers in-process - without the logger the engine's (un-gated) player-telemetry socket errors and the
# whole engine exits on the first logout.
# The web client bundle is prebuilt; only if you change rs-sdk's client: cd server\webclient && bun run build
#   (README's `bun run watch` does the same continuously).

# our game
python tools/serve_static.py 8108 "C:\Users\iQwaZ\OneDrive\Desktop\CraftedRealms-Ref"
```

`bun tools/ref2004/run.js <section>` starts whichever of the two is missing, captures, then builds the sheets.
`bun tools/ref2004/run.js stop` stops the 2004 stack and the our-game server it started.

## One command per section

```sh
bun tools/ref2004/run.js characters   # designer (man, woman), idle in the world, turnaround, walk/run strips + metrics
bun tools/ref2004/run.js tutorial     # the tutorial island moments, both games played by a bot up to the bank
bun tools/ref2004/run.js ui           # chat-box dialogue, right-click menus, side tabs, minimap, run control (from the tutorial run)
bun tools/ref2004/run.js scenery      # town, field with trees, water at the default camera (+ colour/texture numbers)
bun tools/ref2004/run.js all
```

Options: `--side 2004|ours|both` (default both), `--gender m|f|both` (characters). The 2004 side never changes, so
**after a change to our game re-capture only ours**: `bun tools/ref2004/run.js characters --side ours` pairs the new
frames with the 2004 frames already on disk. Point the harness at another served tree (another agent's worktree) with
`REF_OURS_BASE=http://127.0.0.1:<port>`. Re-grade with `python tools/ref2004/analyze.py <section>` (sheets + metrics
only, no capture).

## Outputs

```
C:\Users\iQwaZ\ref2004_captures\
  characters\2004\{m,f}\   designer_*.png, world_rel*.png (+ _plate), close_rel*.png (+ _plate), walk|run_side|game\ frames + samples.json, meta.json
  characters\ours\{m,f}\   the same names for our game
  characters\SHEETS\       characters_*_{man,woman}.png  (pairs - 2004 imagery, private)
  characters\metrics.json  body proportions + gait numbers for both games
  tutorial\{2004,ours}\    moments (stills + action frame bursts), tabs, menus, log.json
  scenery\{2004,ours}\     4 yaws per spot at pitch 128 (+ pitch 256), ours also at our default camera
  sheets\                  every pair sheet
  logs\                    engine / gateway / capture logs, stack pids
scratchpad\ref2004\        our-only strips and turnarounds (safe to commit)
```

Naming: `rel` angles are in 2048ths of a turn around the character (0 = front, 512 = side, 1024 = back), the 2004
unit. Pitch 128 = 22.5 deg above the horizon (the lowest 2004 camera and its default at login), pitch 383 = 67.3 deg.

## How the pairs are matched

- **Window**: the 2004 applet is 765 x 503 with a 512 x 334 3D viewport; ours is captured at 1530 x 1006 (2x the
  applet, same aspect). Full-screen pairs scale the 2004 frame x2 (nearest); 3D-view pairs scale the 2004 viewport x3.
- **The 2004 lens, measured from its client**: focal 512 px over a 334 px viewport (vertical FOV 36.13 deg), camera boom
  `pitch*3 + 600` units (128 units = 1 tile: 7.69 tiles at pitch 128), look point 50 units (0.39 tile) above the ground.
  `lib/ours_client.js setCam()` puts our camera on the same lens: FOV, elevation, boom in tiles, look height.
- **Tile-matched** views (same lens, same tiles) show the character-to-world scale difference directly;
  **height-matched** views (boom scaled by our height / 2004 height) put both characters at the same screen height for
  shape comparisons (turnarounds, side strips).
- **Silhouettes**: every character frame is paired with a plate from the same camera with the player hidden; the
  difference is the silhouette (both renderers are deterministic between the two grabs). Walk / run side strips lock
  the camera across a proven straight lane and subtract one plate.

### Runtime-only adjustments to the 2004 bot client (in the page, never in rs-sdk)

- client cycle back to the authentic 20 ms (`deltime` 20; rs-sdk runs its client 30% fast at 14 ms, which would speed
  up every animation);
- walk packets: rs-sdk's client marks every move "run"; the harness restores the 2004 rule (run only with ctrl / the
  SDK's running flag) so walking walks;
- camera: rs-sdk forces pitch 383 at login; the harness puts the 2004 default (pitch 128) back and can override
  pitch / yaw / boom / a fixed look point (`camFollow` wrapper);
- `localPlayer.isReady` stubbed for plates; `crossMode` cleared in strips (the yellow click cross).

### Limits of the reference

- rs-sdk's engine is the Lost City **revision 274** content (late 2004 / early 2005 client), with its tutorial scripts
  reconstructed from 2006 sources. It is the closest runnable reference; small details (tutorial wording, some
  instructor steps) may postdate 2004.
- rs-sdk server tweaks (faster XP, infinite run energy, no random events) do not affect visuals or timing.
- The 2004 camera cannot go lower than pitch 128 (its renderer only has visibility tables for 128-383), so "side"
  views are 22.5 deg from above in both games; 2004 has no zoom (the boom follows the pitch).
- The 2004 character designer sways the model +-45 deg only (no side or back); side / back come from the in-world
  turnaround.
- The tutorial progress varp is not sent to the client, so the bot reads progress the way a player does: from the
  title of the tutorial text in the chat box (title -> step table built in memory from the local content scripts at
  run time; nothing stored).

## Bot scripts

- `lib/tutorial2004.js` plays the 2004 tutorial like a player: reads dialogs, clicks the flashing tab, follows the yellow
  hint arrow (talk to the NPC it points at, or use the door / gate / ladder / rock it points at) and does each skill step
  with the SDK's high-level actions (chop, burn, net, cook, mix, bake, prospect, mine, smelt, smith, equip, attack,
  bank). Stops at the bank by default (`--until`).
  Things the bot had to learn from the reference (all in `lib/tutorial2004.js`): a level-up message opens a dialog
  that stops the action, so waits click through it; lit fires block tiles the SDK's static path finder does not
  know, so fishing is retried from another tile; the mine has an ordinary furnace and anvils next to the lesson ones,
  so smelting / smithing use the loc the arrow points at; the SDK's own route check refuses NPCs across a fence or a
  closed pen gate, so the bot opens the gate with a plain click and attacks across the fence by clicking the rat on
  the canvas like a player.
- `--resume` (tutorial): logs the last tutorial account (`logs/tut_account.json`, a local test account) back in and
  carries on from its current step; stills already on disk are kept.
- Ours: `tools/qa_holm_island_playthrough.js` lesson steps (`DO`) are reused; a watcher beside it captures the first
  page of each tutor's dialogue (a wrapper around the driver's `talkTo`), each skill animation (a still at our default
  camera, then 2.6 s of frames from a close side-on camera), the fights and the bank.
- Scenery (2004): a fresh account takes the guide's skip offer on the local world, first fights the nearest weak
  monster in the open (hit splats, health bars, melee animation) -> `tutorial/2004/combat_open/`, then runs to each
  spot. `bun tools/ref2004/capture_scenery.js --side 2004 --fight-only` re-captures just the fight.

## Files

| File | Job |
|---|---|
| `tools/ref2004/stack.js` | start / status / stop the local 2004 stack |
| `tools/ref2004/run.js` | one command per section (ensures servers, captures, analyses) |
| `tools/ref2004/capture_characters.js` | section A + B |
| `tools/ref2004/capture_tutorial.js` | section C and the UI captures (D) |
| `tools/ref2004/capture_scenery.js` | section E |
| `tools/ref2004/analyze.py`, `ref2004_sections.py` | pair sheets, silhouettes, body / gait / image metrics |
| `tools/ref2004/lib/common.js` | paths, IP guard, browser launch |
| `tools/ref2004/lib/ref2004_client.js` | the 2004 page: open, capture, camera, plates, sampler, SDK connect |
| `tools/ref2004/lib/ours_client.js` | our page: open, 2004 lens, HUD hide, plates, sampler |
| `tools/ref2004/lib/tutorial2004.js` | the 2004 tutorial bot |
| `tools/ref2004/gait_metrics.py` | review 5: per-held-pose gait numbers (head / shoulder bob, legs ahead of / behind the hips, arms, lean, back foot off the ground) and idle stance numbers, for any capture set |
| `tools/ref2004/gait_options_page.py` | review 5: the owner's PRIVATE walk / run / idle options page (`C:\Users\iQwaZ\ref2004_captures\review\gait_options.html`, GIFs beside it; never committed or published) |
| `tools/ref2004/gait_options_page_r2.py` | review 5 round 2: the same page with the round-2 walk / run options (D, E, F) and the mesh options (a, b, c) on top, round 1 kept below |
| `tools/ref2004/facet_metrics.py` | review 5 round 2: faceting numbers of the close-up turnaround (flat-plane share, creases, facets per colour region) for 2004 and ours |
| `tools/ref2004/gait_lab_refpack.py` | review 5 round 3: the PRIVATE 2004 reference pack for the Gait Lab (one frame per held pose of each walk / run, side + game camera, man + woman) -> `C:\Users\iQwaZ\ref2004_captures\gait_lab\` with its `Start Gait Lab reference.bat` (localhost 8150); never committed |
| `tools/gait_lab.html`, `tools/gait_lab.js` | review 5 round 3: the owner's Gait Lab -- 2004 beside ours, presets, live sliders, Best / Not right picks, export (in the repo; loads the 2004 pack only at run time) |
| `tools/gait_lab_bake.js` | review 5 round 3: turns a Gait Lab pick / settings file into a bake JSON (`tools/blender/gait_lab_bakes/<walk_X>.json`) that the gaits build turns into a real clip |

### Gait options (review 5, 2026-09-28)

Capture one of our option sets beside the shipped one (ours only; the 2004 frames on disk are reused):

```sh
REF_OURS_BASE=http://127.0.0.1:<port> bun tools/ref2004/capture_characters.js --side ours --gender both \
    --tag optB --query "&gait=walkB,runB,idleB" --skip designer,world,matched     # -> characters/ours_optB/<g>
python tools/ref2004/gait_metrics.py C:/Users/iQwaZ/ref2004_captures/characters/2004/m C:/Users/iQwaZ/ref2004_captures/characters/ours_optB/m
python tools/ref2004/gait_options_page.py --sets cur,optA,optB,optC               # the private comparison page
```

`--skip designer` still picks body type B in the creator for the woman; only the designer screenshots are left out.

### Gait Lab (review 5 round 3, 2026-09-29)

The owner picks the walk and run himself: `http://localhost:8777/tools/gait_lab.html` (QA: any static server over the
worktree). Left the 2004 reference (8 held poses, looped at the 2004 pose timings), right our kit playing the chosen clip
live through the same 2004 lens (36.13 deg vfov, 22.5 deg elevation), side view or the game camera (3/4 from behind).

- The 2004 frames never enter the repo. Build the private pack once, then either double-click
  `C:\Users\iQwaZ\ref2004_captures\gait_lab\Start Gait Lab reference.bat` (serves that folder on http://127.0.0.1:8150,
  localhost only; the lab loads `gait_ref.js` with a script tag) or press "Choose the 2004 reference folder" in the lab and
  pick that folder. The frames are for the eye only; nothing is traced into our clips.

  ```sh
  python tools/ref2004/gait_lab_refpack.py        # -> C:/Users/iQwaZ/ref2004_captures/gait_lab/ (about 0.6 MB)
  ```

- Presets = the clips in `assets/models/holm_kit_v2_gaits.glb` (shipped, round 3 G / H, round 2 D-F, round 1 A-C).
  Sliders are runtime offsets on top of the preset (model-space bone rotations, scaled about each clip's mean pose;
  feet kept on the ground by the hips, the face kept level); nothing is written back to the GLB.
- Picks (Best / Not right + a note) and slider settings live in the browser (`localStorage` `gaitLab.state.v1`,
  `gaitLab.picks.v1`); "Export picks" downloads them, "Copy settings" copies one setting as JSON.
- Bake a pick into a real clip (the pick's frames are sampled from the lab itself, so the clip is exactly what was seen):

  ```sh
  SMOKE_BASE=http://127.0.0.1:<port> node tools/gait_lab_bake.js picks.json walk_P [pick index]   # -> tools/blender/gait_lab_bakes/walk_P.json
  blender -b --python tools/blender/build_holm_characters_v2.py -- --gait-options   # every bake becomes a clip; asserts each round-trips (< 0.1 deg)
  cp .studio-workspaces/holm-gait-options-v1/candidates/gaits.glb assets/models/holm_kit_v2_gaits.glb   # then bump URL in src/holm_gait_options.js
  blender -b --python tools/blender/check_holm_equipment_v4.py -- --no-render --out .studio-workspaces/holm-gait-options-v1/fit/P \
      --frames idle:0,idle:24,idle:36,walk:0,walk:4,walk:7,walk:10,walk:14,walk:18,walk:21,walk:24,run:0,run:2,run:3,run:5,run:8,run:10,run:12,run:13,run:15,run:18 \
      --gaits assets/models/holm_kit_v2_gaits.glb --clip-map idle=idle_A,walk=walk_P,run=run_G   # every held pose: 0 clipping
  ```

  In game the clip is then `?gait=walkP`.

### Round 4: the run locked in (2026-09-30)

- "shipped" in the Gait Lab is now the new walk and run (the kit's own clips in `assets/models/holm_kit_v2.glb`); **S** is the
  v4a.2b walk / run they replaced, **K** (walk, run) and **L** (run) are round-4 variants; A-H are exactly as the owner saw them
  (the profile builds them over the gait they were authored on: `GAIT_OPT_BASE`).
- A candidate build can be previewed in the lab before it ships: `?gaits=<repo path of a gaits GLB>&kit=<repo path of a kit
  GLB>` (repo-relative, this site only), e.g. `tools/gait_lab.html?gaits=.studio-workspaces/holm-gait-options-r4/candidates/gaits.glb`.
- The builds: `blender -b --python tools/blender/build_holm_characters_v2.py -- --no-render --tag r4` (kit + Bram + tutors),
  `... -- --gait-options --gtag holm-gait-options-r4`, `... -- --kit-only --profile v4a2_mb --tag v4mesh-b` (and `_mc` / `v4mesh-c`);
  then copy `kit.glb` -> `assets/models/holm_kit_v2.glb`, `bram.glb` -> `holm_tutor_bram_v2.glb`, the tutors, `gaits.glb` ->
  `holm_kit_v2_gaits.glb` and the mesh kits, and bump the URLs (`holm_kit_v2.glb?v=`, the tutors' `?v=`, the gaits / mesh hashes in
  `src/holm_gait_options.js`).
- The gait report now also measures the owner's round-4 words: `hip_fold_at_contact_deg` / `hip_fold_mid_stance_deg` (torso vs
  stance leg: 0 = one straight line, + = folded into a V), `ankle_rel_deg` (the ankle's bend against the shin over the cycle),
  `shoulder_vs_pelvis_twist_deg` (the torso's turn against the hips).
