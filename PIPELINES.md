# PIPELINES.md — the three named asset workflows

## THE REFERENCE INVENTORY RULE (user, 2026-07-03 — runs FIRST on every reference)

When analyzing ANY reference image in `Bible_References/`, before modeling anything:

1. **Enumerate everything visible** — every object, prop, item, piece of furniture,
   ground treatment, building element, and character in the image. No skipping
   background items.
2. **Check each against our asset inventory** (procedural builders, `assets/models/*.glb`,
   Buildkit furniture pieces, Decor).
3. **Anything missing gets queued and BUILT** through the appropriate pipeline (Prop /
   Hero / NPC) and **placed into the game** where the reference implies it belongs.
4. Log the inventory table (item → have/missing → pipeline → status) so coverage is
   auditable. A reference isn't "done" until every enumerated item exists in-game.
5. **Completed references move to `Bible_References/Complete/`** — the folder root is
   the live queue. **Check the folder EVERY loop pass** — the user adds references
   continuously.
6. **Animation is part of the Blender workflow**: if the real object moves (flags wave,
   torch flames flicker, water flows, windmill sails turn), the asset ships animated —
   baked GLB clips (stash to NLA before export, play via mixer) or the engine idiom
   where one exists (scrolling `WORLD.waterTextures`, `WORLD.fires` smoke/flame).
   A static flag is an unfinished flag.
7. **Modeled assets replace ALL old procedural instances** (user, 2026-07-03): when an
   asset ships, upgrade the shared builder (`makeTree`, `makeStall`, `addClimb`…) so
   EVERY instance world-wide uses the model — no old-version stragglers in remote
   corners. Same rule applies forward (doors, torches, fences…). Different species
   stay separate (snow pines keep the conifer builder until a pine model exists).
   Keep the builder's colliders/userData — the GLB is visual only.

Say the name, get the workflow. All three share the same spine — **concept image →
image-to-3D mesh → Blender (via the Blender MCP) → GLB → in-game wiring** — and all
three are gated by the visual QA canon (**GUIDING_LIGHT §9b, 2026-07-04**): **Claude-eye
structured critique ≥9.0 vs the reference is THE GATE OF RECORD**; Gemini Vision is an
**advisory second critique only** (mine its defect list, never gate on its noisy number).

The v02–v20 characters were built on the **NPC Pipeline** (v02 itself became the
**Hero Pipeline** foundation). Fountains, statues and flags go through the **Prop
Pipeline**.

---

## 1. PROP PIPELINE — static world objects (fountains, statues, flags, set pieces)

No rig, no clips — shape, materials, placement.

1. **Concept**: `node tools/gemini_image.js "<prompt>"` — OSRS-style low-poly render of
   the object, ¾ view, plain background. Iterate the prompt until the concept itself
   passes both reviewers vs the reference (e.g. `Bible_References/Town_Square.jpg`).
2. **Mesh**: `python tools/hunyuan_shape.py <concept.png>` (HF_TOKEN; ~12s/mesh) →
   raw GLB. Fallbacks: local SF3D for simple shapes; Pixal3D (HF-Pro) for complex ones.
3. **Blender (MCP)**: import → median-recenter, rest on z=0, real-world scale
   (1 unit = 1 tile) → decimate to flat-shaded low-poly (~2–6k tris) → **engine-matched
   materials**: raw sRGB base colors (r128 shows baseColorFactor RAW — spec-linear
   exports go black), metalness 0, roughness 1, doubleSided where thin → export
   `assets/models/<name>.glb`.
4. **Gate**: Blender render vs the reference — Claude-eye structured critique ≥9.0
   (gate of record); Gemini critique advisory.
5. **In-game**: load the GLB where the procedural version stood; KEEP the procedural
   builder's colliders/interactables (the GLB is visual only). Verify: console clean,
   pathing unchanged, screenshot in-scene → both reviewers again (in-scene lighting is
   the real test).

## 2. HERO PIPELINE — the player character (the v02 line)

Everything in the NPC Pipeline, plus the player-only layers:

- **Region material slots** (`R_SKIN, R_HAIR, R_TUNIC, R_BELT, R_LEGS, R_BOOTS`) cut by
  bisect-plane + bone-weight hybrid classification → razor OSRS bands.
- **Runtime recolor** (`recolorPlayer`, `src/char_customizer.js` swatch UI, persisted in
  `CharCfg.colors`).
- **Gear fitting** (`refreshGLBGear` in fx_humanoid.js): canonical-pose-first fit,
  measured axes, layering rules (helm hides hair, plate does not recolor the tunic).
- Full recipe + gotchas: `CHARACTER_PIPELINE.md`.

## 3. NPC PIPELINE — the character fleet (v03–v20)

1. **Concept** → **Hunyuan mesh** (same as Prop steps 1–2).
2. **Blender (MCP), the `crpipe` toolkit**: load_clean (median-recenter) → landmarks →
   23-bone rig + auto-weights (pin loose islands to Head) → bisect region cuts →
   region_grow material classification (dom-bone audit table) → nose-anchored face
   quads → **4 clips: idle / walk / attack / block** (stash to NLA before export) →
   engine-matched sRGB palette → export `assets/models/vNN.glb`.
3. **In-game**: `src/npc_chars.js` — CHAR_NPC_TYPES entry (`glbChar` field, per-char
   scale), fresh GLB load per spawn (r128 clone breaks skins), crossfade anim by
   `n.moving`; hit-react/death layers work unchanged.
4. **Gate**: Gemini vs concept per character + in-game verification.

---

## 4. AUTOPASS — the closed-loop asset runner (adopted 2026-07-06)

The throughput multiplier from the r/ClaudeAI 3D-modeling post (Reddit_Posts/): one
directive in, a gated in-game asset out, no human between steps. Since Claude-eye is the
gate of record, the loop can self-gate. **Run assets through AUTOPASS instead of ad-hoc
passes** — it is the Prop Pipeline steps wrapped in an explicit iterate-until-bar loop:

```
AUTOPASS(<reference or directive>):
  0. BUDGET: set the tri budget = base (2-6k) scaled DOWN by placement count
     (repeated cottage ≪ one-off landmark). Note the placement count now.
  1. BUILD (Studio or Blender MCP) — check KNOWN DEFECTS below BEFORE building.
  2. CAPTURE: mcp screenshot first (forces paint on a background tab), then
     STUDIO_CAPTURE('cr_<name>.jpg') on a settled frame, one object per call.
  3. CLAUDE-EYE CRITIQUE vs the reference: missing-detail list + N/10.
       < 9.0 → fix the LISTED defects only (no drive-by rework) → back to 2.
       Stall rule: if two consecutive iterations don't raise the score, STOP and
       log it (anti-perfectionism-spiral) — don't burn passes.
  4. GEMINI ADVISORY: one run, record the critique on the sheet; never gate on it.
  5. BANK the side-by-side sheet in Bible_References/Complete/_compare/.
  6. WIRE-IN: place in the live game (keep procedural colliders; replacement rule —
     ALL instances world-wide). Eyes-on in-scene check at game camera distance
     (fine detail that can't read from the overhead camera is DONE, stop polishing).
  7. PERF GATE: run the smoke gate (?smoke=1) — [SMOKE] must PASS; compare draw
     calls/tris to the pre-wire-in numbers; a repeated asset that moves the totals
     noticeably goes back to 1 with a tighter budget (merge geometry first).
  8. LOG one line in Bible_References/PASS_LOG.md + INVENTORY.md status.
```

An asset is DONE only after step 7 — **"sheet banked" is not done; IN THE GAME and
smoke-clean is done** (this is the 2026-07-06 fix for the 29 Studio assets that never
made it into the world).

### KNOWN DEFECTS (check before building; append when a new one costs a pass)
- **Gold/saturated-yellow bloom** — bright gold materials read neon in-engine; use the
  muted OSRS gold ramp (a shared material fix is pending; don't hand-tune per asset).
- **Spec-linear export goes black in r128** — export RAW sRGB baseColor, metalness 0,
  roughness 1 (engine-matched materials, Prop step 3).
- **Background-tab captures are blank** — rAF frozen; mcp screenshot first, then capture.
- **Hunyuan output is smooth/dense (~12k tris)** — always decimate to flat-shaded
  low-poly or it reads as a realistic import (CHARACTER_PIPELINE art constraint).
- **r128 clone() breaks skinned meshes** — fresh GLB load per spawn.
- **Legacy-village dead code** — `populateMainland()` paths behind `LEGACY_VILLAGE=false`
  never run at boot; wire into the ACTIVE builders (e.g. `veyhollow_town.js`).
- **Fine plank/seam detail does not read at game camera distance** — camera-distance
  limitation, not a material bug; stop polishing what the camera can't show.
- **Hundreds of separate meshes at once freeze the renderer** — merge repeated geometry
  into ONE BufferGeometry; stagger heavy builds across frames.
- **`WORLD.interiors` entries MUST carry `roof` (an Object3D)** — game5's per-frame roof
  loop does `it.roof.visible` unguarded; an entry without it crashes update() EVERY frame,
  and the heartbeat's try/catch swallows it in background tabs (symptom: silent tick
  starvation, zero console errors). Caught by the smoke gate 2026-07-06.
- **A bigger replacement building SWALLOWS pre-existing scatter** — carts/bushes/trees
  placed around the old footprint end up inside the new one WITH live colliders. Sweep
  the new footprint (scene + clickables/resources/fires/colliders, in-place prune) and
  re-run it delayed for late-booting prop files (see veyhollow_town.js church sweep).

---

**Shared hard rules:** never trust a single screenshot judgment for 3D scale and placement —
verify IN-SCENE (walk to it, compare against neighbours) and use Gemini's critique as the
advisory second pair of eyes; engine-matched raw-sRGB colors before export; measure
axes, never assume; 1 world unit = 1 tile; keep procedural colliders when swapping in a
GLB. Secrets (`GEMINI_API_KEY`, `HF_TOKEN`) come from the environment — never hardcode.
