# Dev Log — Character System (2026-06-30 → 07-01)

Session focus: building a playable, customizable humanoid player character for Crafted Realm.
Tabled at the end of the session by decision — this doc is the clean hand-off / resume point.

---

## TL;DR
We tried hard to generate a bespoke rigged character (AI mesh → Blender → rig → color), hit real
quality walls, and ultimately **pivoted to a free CC0 pro asset pack (Quaternius)**, which is now the
in-game player and looks far better. All bespoke work is preserved and reversible.

**Current in-game state:** a **Quaternius CC0 "Female Ranger"** is the player — PBR-textured (hood,
leather bracers, quilted belt, buckled boots), natural arms-down idle, procedural walk, faces travel
direction. Toggle in-game with **Shift+U**. CC0 = safe to ship commercially.

---

## The arc (what we tried, in order)
1. **Bespoke generation (v02 concept → Hunyuan mesh → Blender).** Modeled, rigged (23-bone Mixamo),
   idle/walk. Got a working avatar but coloring was the hard part.
2. **Coloring attempts:** flat Z-band vertex colors (read "lazy") → **concept-art texture projection**
   (looked OK in Blender, went **muddy/black in-game** under directional light — abandoned) →
   **per-region flat material slots + runtime recolor** (this worked; see below).
3. **Live recolor system** (`recolorPlayer`) + a **swatch customizer panel** (`char_customizer.js`,
   🎨 button / Shift+C) — click a color per region (skin/hair/tunic/belt/legs/boots), persists to
   `CharCfg.colors`. Verified working in-game.
4. **Boundary sharpness problem** ("torso/legs bleed"). Tried **PartPacker** (NVIDIA part-decomposition
   AI, `tools/partpacker.py`) — only separated the boots, left the body one blob (volume-based AI can't
   split a continuous clothed silhouette). **Fix that worked: BISECT** the mesh at each boundary plane
   (`bmesh.ops.bisect_plane`) so material edges land on real continuous edges → razor-sharp OSRS bands.
   Weights survived (interpolated), no re-rig.
5. **Pivot decision.** Given the effort vs. result, chose to use **pre-made low-poly models**. Picked
   **Quaternius "Modular Character Outfits: Fantasy"** (CC0). Wired the Female Ranger in-game.

---

## What's working now (final state)
- **Player character:** Quaternius Female Ranger (`assets/vendor/quaternius/Female_Ranger.gltf`).
  - Loads via `src/char_quaternius.js` → `installQuaterniusPlayer()` (Shift+U).
  - Normalized to 1.85 m, `metalness=0` (avoids black PBR with no env map).
  - **Arms-down idle** baked (the asset ships a T-pose bind; we rotate upper arms ±1.35 rad about
    world-Z from the captured rest).
  - **Procedural walk/idle** via `player.userData.qrig` + `quaterniusAnim()` (world-axis bone swing,
    same technique as `fx_humanoid`), routed through a `qrig` branch in `pAnim` (game5_main).
  - Faces travel direction; idle↔walk ease blend; legs/arms swing confirmed.
- **Also available** in `assets/vendor/quaternius/`: Male Ranger, Female/Male Peasant (+ PBR textures).
  Pass a different `.gltf` path to `installQuaterniusPlayer(url)`.
- **Bespoke avatar still present & reversible:** `assets/models/player.glb` (6 flat region materials,
  sharp bisected bands, idle/walk) + its loader `installPlayerGLB()` (Shift+P) + the recolor customizer.

---

## Files created / changed this session
**New**
- `src/char_quaternius.js` — Quaternius character loader + procedural drive (Shift+U).
- `src/char_customizer.js` — recolor swatch panel for the bespoke player.glb (🎨 / Shift+C).
- `tools/partpacker.py` — PartPacker image→3D (kept for distinct-volume cases; `PARTPACKER_SPACE` env override).
- `THIRD_PARTY_ASSETS.md` — license log (provenance record; Quaternius/CC0).
- `assets/vendor/quaternius/*` — the CC0 character glTFs + textures.
- `assets/models/player.glb` — bespoke v02 avatar (rebuilt several times this session).

**Changed**
- `src/fx_humanoid.js` — `installPlayerGLB`, `playerGLBAnim`, `recolorPlayer`, region-material map.
- `src/game5_main.js` — `pAnim()` routes to qrig/gmix/hrig drivers.
- `src/input_controls.js` — WASD snapped to 4-direction (N/E/S/W only).
- `index.html` — script tags for char_quaternius.js + char_customizer.js.

**Note:** these are currently **uncommitted** working-tree changes. Nothing was committed or pushed
this session.

---

## Licensing (the question that drove the pivot)
Using third-party models commercially is fine **if the license allows it**:
- **CC0** = zero risk forever, no attribution (Quaternius, Kenney, Poly Pizza). ← what we used.
- **CC-BY** = ok with credit. **CC-BY-NC / "editorial" = non-commercial only (the trap).**
- **Paid commercial** (e.g. Synty ~$30/pack) = ok; don't ship raw extractable files.
- Never use game-ripped models (e.g. a "RuneScape" Sketchfab upload) — infringing regardless.
Keep `THIRD_PARTY_ASSETS.md` current = proof of provenance if ever distributed.

---

## Key learnings (so a future session doesn't re-pay for them)
- Single-front-view **texture projection fails in-engine** under directional light → don't bake a photo
  onto a curved mesh.
- **Volume-based AI part-decomposition** (PartPacker/etc.) won't split a continuous clothed body.
- **Bisect-at-boundary** is the free, deterministic way to get sharp region edges on a fused mesh.
- For **runtime customization**, recoloring = per-region material color (not one baked texture);
  type-swapping = separate meshes on a shared skeleton (the `gltf-avatar-threejs` pattern).
- **Claude + Blender MCP is rapid-prototyping, not a rigging solution** — bespoke rigged characters are
  genuinely costly; pre-made CC0 packs are the pragmatic path. (Industry surveys agree.)
- Blender gotcha: never put `*/` inside a `/* */` JS comment (a `_*/` sequence closed a comment and
  caused a parse error).

---

## If ever resumed — next steps (none started)
1. **Commit** the working tree (character + loaders + license log).
2. **Quaternius modular customizer:** swap among the 62 modular parts + 3 texture variations (the real
   Quaternius customization model; the bespoke recolor panel does NOT apply to PBR characters).
3. **Better animation:** download Quaternius **Universal Animation Library** (CC0, same 65-joint rig,
   no retargeting) for pro idle/walk/run/attack instead of the procedural stopgap.
4. Decide bespoke-vs-Quaternius as the canonical character (both currently coexist behind toggles).

Related memory: `quaternius-characters`, `character-pipeline`, `blender-pipeline-videos`.
