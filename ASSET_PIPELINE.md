# Crafted Realm — Asset Pipeline

> ⚠️ **DEPRECATED (2026-06-27).** The Blockbench/cube pipeline documented below was
> rejected — cube geometry reads as Minecraft, not OSRS. The **current** NPC pipeline
> is **"Path A": smooth low-poly *procedural* geometry + Nano-Banana (Gemini) painted
> textures.** See `ASSET_PIPELINE_PATHA.md`. The text below is kept for reference only;
> `src/game_assets.js` (`CR_buildAsset`) is unused and may be retired.

---

A **data-driven, Blockbench-compatible** model pipeline. Every asset is authored as
plain data (cubes + bones) plus a **texture painted in code**. No external image
files, no GUI tool required, and recolouring stays programmatic (character creation,
NPC variants). It produces low-poly, flat-shaded models that match the game's
Classic-2007-OSRS look, and it routes the work onto code — which is what Claude can
author directly and verify in-browser.

It lives in **`src/game_assets.js`** (loaded after `game2_world.js`, before
`game3_systems.js`). The first asset authored through it is the **Bogling** creature,
at the bottom of that file — copy it as a template.

---

## The 4 steps to add an asset

### 1. Author the model (geometry as data)
A model def is Blockbench format: a `resolution` and a list of `elements` (cubes with
`from`/`to` corners in Blockbench units, and per-face atlas `uv`s), plus our lightweight
`bones` (animation pivots).

```js
const def = {
  resolution:{width:64,height:64},
  scale: CR_UNIT,            // 1 BB unit -> world units (0.0605). Omit to use default.
  handY:-6.4,                // local Y of the hand grip on each arm bone
  bones:[
    {name:'legL', pivot:[-1.3,7,0],   match:'leg_L|foot_L'},  // pivot in BB units
    {name:'legR', pivot:[ 1.3,7,0],   match:'leg_R|foot_R'},
    {name:'armL', pivot:[-4.3,14.2,0],match:'arm_L'},
    {name:'armR', pivot:[ 4.3,14.2,0],match:'arm_R'},
  ],
  elements:[
    {name:'leg_L', from:[-2.4,0,-1.4], to:[-0.3,7.2,1.4], faces:CR_faceset(SKIN)},
    {name:'head',  from:[-3.5,15,-2.9],to:[3.5,21.6,2.7],  faces:CR_faceset(SKIN,{north:FACE})},
    // ...
  ],
};
```

- **Coordinates** are Blockbench units, Y-up, ground at `y=0`. ~16.5 units ≈ 1 world unit.
- **Bones** are pivots; each element joins the **first** bone whose `match` regex accepts
  its `name` (else it's static on the root). Name bones `legL/legR/armL/armR` and shared
  animation code (`walkAnim`, `tickSwing`) works for free.
- **`CR_faceset(region, overrides)`** points all six faces at one inset atlas region
  `[x,y,w,h]`; `overrides` re-points specific faces (e.g. `{north: FACE}` for a face on
  the front / +z).

### 2. Paint the texture atlas (in code)
A `texFn(colors)` returns a cached `CanvasTexture`. Fill each region used by your UVs
with `CR_fillRegion` (top-lit gradient) and hand-draw detail (faces, trims) on top.

```js
function tex(c){
  const skin = c.skin || 0x6f9a4a;
  return paintedTex('mything_'+skin, x=>{
    CR_fillRegion(x, 0,0,16,16, skin);        // SKIN region
    CR_fillRegion(x, 16,0,16,16, skin);       // FACE base region
    // draw eyes/mouth inside the FACE region (16,0..32,16):
    x.fillStyle='#e6e23a'; x.fillRect(18,6,4,3); x.fillRect(26,6,4,3);
    x.fillStyle='#100f08'; x.fillRect(20,7,2,2); x.fillRect(26,7,2,2);
  });
}
```

`paintedTex` (from `game2_world.js`) caches by key and uses NearestFilter for crisp
pixels. Keep the cache key unique per colour combo so variants don't collide.

### 3. Register it
```js
CR_registerAsset('mything', def, tex);
```

### 4. Wire it to gameplay
- **As a monster** — add to `NPC_TYPES` in `src/game1_data.js` with `assetModel:'mything'`
  (and optional `assetColors:{skin:0x..}`), then `spawnNpc('mything', x, z)` in a
  `populate*()` in `src/game4_ui.js`.
- **As a friendly NPC / the player** — call `CR_buildAsset('mything', colors)` to get a
  rigged `THREE.Group` and add it like any other mesh.

That's it. `CR_buildAsset` returns a group whose `userData.parts` exposes every element
**and** bone by name, plus `handL/handR` grips and a `headTop` mount — so held weapons,
worn helmets, and the walk/attack animations all work exactly like the procedural
`humanoid()`.

---

## Editing visually in Blockbench (optional, two-way)
The `def` object **is** Blockbench's format. To tweak a model in the GUI:
1. Wrap the `elements`/`resolution` into a `.bbmodel` JSON and open it in
   [Blockbench](https://www.blockbench.net) (free).
2. Move/resize cubes, adjust UVs visually.
3. Paste the updated `elements` back into the asset's `def`.

(Bones are our own lightweight layer — keep the `bones` list in the `def`; Blockbench
groups can mirror them if you want visual pivots.)

---

## Conventions & tips
- **UV insets:** `CR_faceset` insets regions by 1px to stop texture bleeding — keep your
  painted detail ≥1px inside a region's edge.
- **Atlas layout (default 64×64):** the Bogling uses `SKIN[0,0]`, `FACE[16,0]`,
  `CLOTH[0,16]`, `BELLY[32,0]`, `WHITE[48,0]`. Reuse or redefine per asset.
- **Facing:** models face **+z**; put faces/fronts on the `north` face.
- **Flat colours without a texture:** give an element a `color:0x..` and omit `faces`
  (and pass no `texFn`) for pure flat-shaded cubes — the fastest path for simple props.
- **Scale per spawn:** `NPC_TYPES.size` multiplies the built model, so author at a
  natural size and tune `size` per creature.
- **Verify in-browser:** run `python -m http.server` in the project root, open the game,
  and (during dev) spawn with the JS console: `spawnNpc('mything', player.position.x+2, player.position.z)`.

---

## Where each tool fits (the bigger picture)
- **This pipeline (Blockbench data + code textures)** — the backbone: characters,
  monsters, props, items. Fully Claude-authorable, free, coherent, animated.
- **Procedural Three.js** (`makeTree`, `humanoid`, …) — organic/irregular shapes and
  terrain dressing that don't suit a cube grid.
- **External (Tripo / itch.io packs)** — deliberately **not** used; see
  the project decision in memory (`models-stay-procedural`). Revisit only if the art
  direction changes.
