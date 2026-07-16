# CHARACTER_PIPELINE.md — Crafted Realm rigged-character pipeline

> Governing contract: `docs/rebuild/ART_PRODUCTION_PIPELINE.md` (2026-07-13). This document is a detailed
> rigging/tool recipe; the unified contract owns family consistency, required clips, equipment fit,
> provenance, gameplay-camera review, integration, and definition of done.

How we take a **2D concept** (`char_concepts/`) all the way to a **rigged, animated, game-ready
GLB** (`assets/models/*.glb`) for the Three.js **r128** game. This is the *character* pipeline
(player + humanoid NPCs); props use the simpler image-to-3D path in `ASSET_PIPELINE.md`.

> Origin: adapted from the workflow in *"Claude Code Took Over Blender and Created This..."*
> (YouTube `YwIGmEs0NdU`). The video drives Blender 5.1 via the **official Blender MCP** with
> Claude Code in `--dangerously-skip-permissions`, exactly our setup. Tool names below are decoded
> from the video's auto-generated transcript (some spellings were garbled — flagged where uncertain).

---

## 0. The canonical pipeline (from the video)

```
concept image
   │  (image→3D)
   ▼
3D mesh ──► [optional: split into parts] ──► clean / retopo
   │  (auto-rig)
   ▼
rigged skeleton  ──►  import to Blender
   │  (retarget a Mixamo clip onto the rig)
   ▼
animated character ──► texture / PBR ──► export GLB
```

**Tools the video used** (decoded — verify names before relying on them):

| Step | Video's tool | What it is | Cost |
|---|---|---|---|
| Mesh gen | **Tripo3D** ("triple") | image/text → 3D, can split into parts + texture | paid credits |
| Mesh gen (alt) | **Hunyuan3D** ("Hoonion") via **fal.ai** ("full ai") | image → 3D | paid (fal credits) |
| Scene/world gen | **World Labs "Marble"** ("world marble/labs") + the **"image blast"** skill | gaussian-splat worlds + colliders | ~$5/world |
| PBR materials | *"patina"* (transcript unclear — likely Poliigon or an AI PBR tool) | generate PBR material maps | paid |
| Auto-rig | **AccuRig** ("akarig", Reallusion ActorCore) | free standalone humanoid auto-rigger | **free** |
| Animation | **Mixamo** (Adobe) | free FBX animation clips | **free** |
| Retarget | a **custom retargeter** Claude wrote in Blender | maps Mixamo skeleton → AccuRig skeleton | — |
| Orchestration | **Claude Code + official Blender MCP**, Blender 5.1 | drives all of the above | — |

### The two lessons the video paid for (read these)

1. **Retargeting is the hard part.** Mixamo and AccuRig/Character-Creator skeletons differ in
   **bone count, bone naming, and rest pose**. The single biggest time-sink in the video was a
   **rest-pose mismatch**: the source had exported its **T-pose as an animation frame** while the
   author *told* Claude the rest poses matched — an hour lost. Claude eventually got legs/spine/head
   ~90% right but **arms, shoulders, wrists, and fingers** stayed wrong. → Always confirm the true
   rest pose of *both* skeletons before retargeting; expect to hand-fix the arm chain.
2. **Claude's spatial vision is weak.** The author repeatedly found Claude great at code/Blender
   ops but **poor at judging 3D placement/scale from screenshots** (Codex's built-in vision did a
   little better). → **Do not trust our own eyes for spatial QA.** Gate every visual step through an
   external vision model (we use **Gemini Vision**, already wired up) and compare against the concept.

---

## 1. Our adaptation (what Crafted Realm actually has)

Same shape as the canonical pipeline, but mapped to the keys/tools on **this** machine. Check
status before assuming a backend is live — keys live in the Windows USER env / `.env`, never in code.

| Step | Our tool | Status (2026-06-30) |
|---|---|---|
| Orchestration | Claude Code + **official Blender MCP** (Blender 5.1) | ✅ running, auto-start on |
| Concept art | our **Gemini / Nano-Banana** 2D concepts in `char_concepts/` | ✅ (20 in `char_grid_20.png`) |
| Mesh gen | **Hunyuan3D HF Space** via `tools/hunyuan_shape.py` (+ `hunyuan_textured.py`) | ✅ `HF_TOKEN` set — **ZeroGPU quota-limited** |
| Mesh gen (alt) | Hyper3D Rodin / Sketchfab (in the MCP) | ❌ no API key |
| Mesh gen (alt) | Hunyuan **local** server `localhost:8081` (MCP LOCAL_API mode) | ⚠️ configured but **server not running** |
| Auto-rig | **in-Blender** armature + automatic weights (Rigify optional) | ✅ — **AccuRig/UniRig not installed locally** |
| Animation | **Mixamo** FBX (manual download) **or** author idle/walk in Blender | ⚠️ no Mixamo API — manual or hand-authored |
| Retarget | custom Blender retargeter script (per the lessons above) | ✅ scriptable via MCP |
| Texture | bake concept colours into a low-poly material / Gemini-painted | ✅ |
| **Vision gate** | **Gemini Vision** `node tools/gemini_vision.js "<prompt>" <img> [<ref>]` | ✅ `GEMINI_API_KEY` set |
| Export | `bpy.ops.export_scene.gltf` GLB **Y-up** → `assets/models/` | ✅ |

### Gaps vs. the canonical pipeline (and the workaround)
- **No Tripo / fal.ai keys** → use **Hunyuan HF Space** for mesh gen instead (quota permitting).
- **No AccuRig/UniRig on disk** → rig **inside Blender** (standard humanoid armature, **Mixamo-named
  bones** `mixamorig:Hips/Spine/...` so a real Mixamo clip can retarget later) + auto-weights.
- **No Mixamo API** → either drop `idle.fbx` / `walk.fbx` from mixamo.com into the repo and retarget,
  or **hand-author** OSRS-style idle (breathing sway) + 4-dir walk cycles directly on the rig.

### Art-direction constraint (do not skip)
The game is **r128, low-poly flat-shaded, cozy 2007-OSRS**. Hunyuan/Tripo output is **smooth and
dense (~12k tris)** — the *opposite* look. After generation you **must decimate / retopo to a
low-poly faceted mesh** and flat-shade it, then Gemini-gate the result against the OSRS reference,
or the character will read as an out-of-place "realistic" import. (Shared geometry must also load in
the **r160** tools.)

---

## 2. Step-by-step (our path)

1. **Pick a concept** from `char_concepts/` (the 20-grid). Prefer rig-friendly silhouettes first —
   no cape/no loose robe/no complex held prop — to validate the pipeline, then do the fancy ones.
2. **Generate mesh:** `python tools/hunyuan_shape.py char_concepts/vNN.png assets/models/<name>_raw.glb`
   (textured variant: `hunyuan_textured.py`). Watch for ZeroGPU quota failures (exit 2).
3. **Import + clean in Blender** (MCP): center, scale to ~1.8 m, face -Y, **decimate/retopo to
   low-poly**, separate obvious parts if needed, recalc normals, flat-shade.
4. **Rig:** add a humanoid armature with **Mixamo bone names**, position bones to the mesh, bind with
   **Armature Deform ▸ With Automatic Weights**; test-pose to check deformation; fix weights.
5. **Animate:** retarget Mixamo `idle`/`walk` FBX onto the rig (mind rest-pose + arm chain), **or**
   author idle + walk cycles. Verify playback in the viewport.
6. **Texture:** apply concept colours as flat low-poly materials (or bake), Gemini-gate vs concept.
7. **Export:** `glTF (.glb)`, **+Y up**, include animations, → `assets/models/<name>.glb`.
8. **Verify in-game:** load via the game's GLB loader, hard-refresh, check console clean, confirm
   scale/orientation/animation play. Gemini-gate a screenshot vs the concept.

## 3. QA gates (every run)
- **Vision gate** after mesh, after texture, after in-game — `tools/gemini_vision.js` vs the concept.
- **Rest-pose check** before any retarget — confirm both skeletons' true rest pose.
- **Tri budget** — decimate to low-poly; log the final tri count.
- **In-game smoke** — loads, oriented +Y, animates, console clean.

## 4. Open improvements
- Stand up the **local Hunyuan server** (`localhost:8081`) to remove ZeroGPU quota limits.
- Add a **Tripo or fal.ai** key to match the video's higher-quality mesh + part-splitting.
- Install **AccuRig** (free) or restore the **UniRig** venv for one-click clean humanoid rigs.
- Build the **custom Mixamo→rig retargeter** as a reusable Blender add-on (the video's end goal).
- Wire a **headless Gemini smoke-test** that pipes each pipeline screenshot through the vision gate.
