# MIXAR_WORKFLOW.md — the complete Mixar model workflow (canon, 2026-07-07)

The reproducible recipe for turning a one-line creature/character directive into a rigged, animated,
textured, in-game GLB using **Mixar** (open-source AI-native Blender 5.0 fork) + our own bpy game-prep.
Written so ANY session/model (Opus 4.8, Fable 5, …) can execute it identically. Proven on:
**Giant Mole** (beast, procedural driver) and **v07 Town Guard** (humanoid, 4 baked clips).

Live sprint state: `SPRINT_MODEL_2026-07-07.md`. Deep background: memory `mixar-blender-fork`.

---

## 0. One-time setup (already done on this machine — verify, don't redo)

- Mixar 3.0.2 installed at `C:\Program Files\Mixar\Mixar 3.0\mixar.exe`. **Launch it NON-elevated**
  (elevated windows reject all injected input via UIPI, and you can't Stop-Process it).
- Our blender-mcp addon copied to `%APPDATA%\Mixar\Mixar\5.0\scripts\addons\addon.py`.
- Launch with the bootstrap so the MCP socket (port 9876) comes up:
  `Start-Process "C:\Program Files\Mixar\Mixar 3.0\mixar.exe" -ArgumentList '--python','"<scratchpad>\mixar_mcp_bootstrap.py"'`
  (bootstrap = enable addon + `bpy.ops.blendermcp.start_server()` on a 4s `bpy.app.timers` delay).
  Then ALL work goes through `mcp__blender__execute_blender_code`.
- User is signed into Mixar (free account, credits) with **BYOK Gemini key** feeding generation.
- **Mouse injection does NOT work on Mixar** (SendInput/PostMessage both swallowed). Keyboard works.
  You never need the GUI: everything below is bpy.

## 1. Control-plane rules (violate these and ops fail mysteriously)

- Mixie/chat/gen operators need a UI context: wrap in
  `bpy.context.temp_override(window=wm.windows[0], area=<MIXIE area>, region=<its WINDOW region>)`.
- Heavy ops (remesh/bake/rig) run from `bpy.app.timers.register(fn)` so the MCP call returns; give
  bake/select ops an explicit `temp_override(window, area=<VIEW_3D>, region, active_object=..,
  object=.., selected_objects=[..], selected_editable_objects=[..])` — timer context has no selection.
- Progress/logging: write lines to a scratchpad log file from inside the timer fn; poll it with a
  background `until grep` (Bash run_in_background) or Monitor. Long chat/gen jobs: register a 5s
  repeating timer that appends chat state + `scene.mixie_queue.items` states to `mixie_state.jsonl`.
- `wm.read_homefile(app_template="")` = fresh scene between assets. Timers survive; re-register the
  state-dump timer anyway. MCP socket survives.

## 2. Generation (deterministic — DO NOT use the chat agent for batch work)

The Mixie chat agent re-asks questions and races answers; fine for exploration, useless for batches.
Call the operators directly (both async → poll the queue):

```python
# concept (Gemini 3.1 via BYOK). aspect 2:3 for full-body characters, 1:1 for beasts.
bpy.ops.mixie.imagegen_generate(prompt=PROMPT, model='flash-3-1', aspect_ratio='2:3',
                                number_of_images=1, name='<asset>')
# -> bpy.data.images['<asset>.001'] when its queue job hits SUCCESS ('<asset>' 1024x1024 is a placeholder; at 1:1 check both)

bpy.ops.mixie.image_to_3d_generate(image_name='<asset>.001', model='hunyuan-pro-fal',
                                   texture=True, texture_size=1024)
# -> imports ~500K-tri textured mesh as 'node_0' (Y-up!) when job SUCCESS (queue label = image name)
```
Valid model enums (HYPHENS, discovered by assignment-test — invalid throws, costs nothing):
imagegen `flash | flash-3-1 | pro`; image_to_3d `tripo-low | tripo-v31 | hunyuan-pro-fal | trellis2-fal`.
**Tripo retopology (`mixie.retopology_generate`) is BROKEN server-side in 3.0.2 — don't use.**

Concept-prompt template that works (Gemini 3.1): full body, **relaxed A-pose** (riggable), facing
viewer, plain neutral background, "cozy 2007 RuneScape style, flat-shaded low-poly game-asset",
explicit costume/colors, "no cape, no loose robe", head-to-boots in frame.

## 3. Game-prep (our bpy code — `tools/mixar_pipeline.py`)

`exec(open(r"...tools/mixar_pipeline.py").read(), ns)` inside the timer fn, then:

1. **Orientation:** Hunyuan meshes import **Y-up** → `rotation_euler=(radians(90),0,0)` + apply, then
   ground (min world z → 0). Character should face **-Y** in Blender.
2. `prep_lowpoly(high, out_name, target_tris≈5000, voxel=0.015..0.02)` — voxel REMESH (fixes the
   1000+-shell polygon soup), decimate, flat-shade, smart-UV 66°, **CONCAVE pack_islands** (bbox
   packing leaves humanoids at ~14% fill = muddy textures).
3. Scale: characters `1.85/dims.z` (dwarf 1.5), beasts by length; `transform_apply(rotation, scale)`.
4. `bake_maps(low, high, res=2048 chars / 1024 beasts)` — Cycles selected-to-active DIFFUSE(color-only)
   + ROUGHNESS, margin_type EXTEND, **NO NORMAL MAP** (renders black in r128), albedo brightened
   ~1.5x (engine light is dim), remaining void filled neutral grey (never pure black).

## 4. Rig + animation

**Beasts (Track B):** small named-bone rig (mole: root/body/head/arm_L/arm_R) + a per-archetype
procedural driver in `src/fx_<beast>.js` (copy `fx_mole.js`; fx_dragon pattern: stash rest quats,
`rotateOnWorldAxis` about root-derived axes, gait cadence from real ground speed). Export WITHOUT
animations. Engine wiring: NPC_TYPES entry gets `glb`, `glbHeight`, `barH`, `skinnedRig:true`,
`animDriver:'<beast>'`; dispatch lives in game5_main.js (~line 554).

**Humanoid V-characters (Track A):** `rig_biped(low)` (19-bone: hips/spine/chest/neck/head,
shoulder/uparm/forearm/hand L+R, thigh/shin/foot L+R; auto-weights) then `author_biped_clips(armo)` —
authors **idle/walk/attack/block** as Actions by keyframing pose-bone quaternions about
ARMATURE-space axes (`_rest_axis` converts; never think in bone-local axes). Export **WITH**
`export_animations=True, export_animation_mode='ACTIONS'` → engine's `charNpcModel` finds clips BY
NAME (idle/walk/attack/block) and crossfades. v03–v20 are already wired in `src/npc_chars.js` —
replacing `assets/models/vNN.glb` is the whole integration.

## 5. Verify (gates, every asset)

1. Export GLB → `assets/models/`. Save working blend → `scratchpad/<asset>.blend`.
2. `node tools/validate_content.js` after ANY data edit (must PASS).
3. Smoke: `http://127.0.0.1:8777/?smoke=1`, read `[SMOKE]` verdict (~30s) → must PASS.
   Char NPCs (cn_*) don't spawn under smoke — review them in the **Menagerie** (add to ROSTER +
   STATIC in `src/starter_pen.js`, `Menagerie.go()`); or `spawnNpc.force=true; spawnNpc('cn_x',x,z)`.
4. Eyes on it: browser screenshot + zoom; Blender material-preview desktop capture via
   `scratchpad/mixar_ctl.ps1` `Shot` (MCP viewport screenshot is unreliable — often black).
   Two-reviewer rule applies for reference-match passes (Claude critique + `tools/gemini_vision.js`).
5. Bump `?v=` of every edited script in index.html (dev server caches). **Never edit index.html with
   PowerShell Set-Content — UTF-8 mojibake; use the Edit tool.**

## 6. Known failure modes (cost us hours — check here FIRST)

| Symptom | Cause / fix |
|---|---|
| Model renders black in-game | Normal map (strip it) or albedo void (fill grey) or too-dark bake (brighten 1.5x) |
| Bake = seam confetti | UVs are decimated-soup micro-islands → voxel remesh BEFORE unwrap |
| `bake` "No valid selected objects" | timer context — pass selection in temp_override |
| DIFFUSE bake errors "requires Color…" | `use_pass_color=True` |
| Mixie op "context is incorrect" | missing MIXIE-area temp_override |
| Agent re-asks / ignores answers | stop using chat; direct operators (§2) |
| Character moonwalks / faces backward | -Y-forward authoring → +Z in GLB; engine lookAt aims -Z (fx driver yaws root π; biped rig authored -Y needs none) |
| Muddy character texture | bbox packing ~14% fill → CONCAVE pack + 2048 |
| GLB not updating in browser | asset cached — hard refresh; new spawn needed (fresh load per spawn) |
| Screenshot black via MCP | use desktop `Shot` (mixar_ctl.ps1) or browser screenshot |

## 7. Sprint decisions of record (user, 2026-07-07)

- **Texture bar: CRISP** — 2048 + concave packing for all characters (beasts 1024 OK).
- **Order: INTERLEAVE** Track A (characters) and Track B (beasts); Track C (buildings) is mostly
  deploying dormant ref-builds (`ref_bld1-4`, `ref_bank`, `ref_dock`, …) — placement, not generation.
- Credits: free tier started at 1000; check `scene.mixie_chat_credits` each batch; concept+mesh ≈
  a few dozen credits per asset. If exhausted mid-sprint, generation stalls — flag the user.
