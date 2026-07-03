# PIPELINES.md — the three named asset workflows

Say the name, get the workflow. All three share the same spine — **concept image →
image-to-3D mesh → Blender (via the Blender MCP) → GLB → in-game wiring** — and all
three are gated by the **two-reviewer visual QA** (Claude structured critique + Gemini
Vision, both ~8+/10, lower score rules; see Maps/MAP_BUILD_LOG.md template).

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
4. **Gate**: Blender render vs the reference — Claude critique + Gemini score, both ~8+.
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

**Shared hard rules:** never trust our own screenshot judgment alone for 3D scale and
placement (gate through Gemini); engine-matched raw-sRGB colors before export; measure
axes, never assume; 1 world unit = 1 tile; keep procedural colliders when swapping in a
GLB. Secrets (`GEMINI_API_KEY`, `HF_TOKEN`) come from the environment — never hardcode.
