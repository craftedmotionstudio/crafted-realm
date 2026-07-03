# ALORA_PORT.md — Alora → Crafted Realm parity log

**Method:** Play Alora screen-by-screen, screenshot each, and rebuild an *equivalent* in Crafted
Realm at the **same level of detail** — using OUR pipeline (procedural geometry + Nano Banana
sprites + the `UI`/`Player`/`WORLD` architecture). We recreate Alora's **functionality, layout,
and detail**, never its Jagex-copyrighted pixels. This log is the backbone of the effort so it
survives across sessions.

Capture harness: `scratchpad/alora_ctl.ps1` (shot | click | move | key | drag) drives the live
Alora Java client and screenshots it. Reference caps land in `scratchpad/alora_*.png`.

## Status legend
🔴 not started · 🟡 in progress · 🟢 built + verified in-browser · ✅ Gemini-gated

## Screen log

| # | Alora screen | What it shows (detail to match) | Crafted Realm target | Status |
|---|--------------|--------------------------------|----------------------|--------|
| 1 | Worn Equipment / "Equip Your Character" | Classic cross-layout slot grid, **live paperdoll of worn gear**, weight (kg), equipment-bonus panel (Attack/Defence/Other), Game Style controls | Add live 3D character portrait to the already-strong equipment tab | 🟢 |

| 2 | Login / lobby screen ("Equip Your Character" + CLICK HERE TO PLAY) | Character render + **full OSRS directional bonus breakdown** — Attack: Stab/Slash/Crush/Magic/Ranged; Defence: same 5; Other: Strength/Prayer; Weight. Plus Game Style (2007/2010) + Graphics (SD/HD) toggles | Add per-style Stab/Slash/Crush/Magic/Ranged bonuses to equipment panel | 🔴 |

| 3 | In-world hub (bank/still area) | Dense OSRS props: ornate **gold coffer/money-pot** (skull + coin glyph, red base), a **brewing still** (metal boiler + piped stove w/ glowing coals + kettle), wooden shutter windows, barred gate w/ handle, floor mats. Players with layered gear (kiteshield + cape + amulet + mohawk). Prop density & gear layering exceed our world. | World/prop detail reference — raise prop density + character gear layering | 🔴 |

| 4 | Northern cottage (roof-cutaway, two rooms) | Bedroom (bed w/ slatted headboard + chair + stocked bookshelf) partitioned from a hearth/kitchen room (fireplace w/ glowing embers, table w/ pottery, barrel, rug, round window); pale walls, wood trim; snowy/aurora north setting | Build a faithful two-room cottage via Buildkit in the snow biome | 🟢 |

## Built (screen 4)
- **`src/north_cottage.js`** — self-booting placement (polls `running`, then grid-scans around the
  snow zones `ZONES.brynholt`/`ZONES.whitmoor` and picks the valid spot NEAREST a zone centre;
  `valid()` requires all 4 footprint corners dry (`groundY>-0.3`), level (Δ≤1.1), and clear of
  existing structures via `collides(x,z,5,true)`). Landed at [68,-64] on Whitmoor's snow.
  **Gotcha learned:** a centre-only ground check placed the first build half-over a lake — must
  validate the whole footprint. Whitmoor-adjacent dry spots also collide with the Hold's buildings,
  so the collision check in `valid()` is essential.
- **Buildkit enrichments** (`src/buildkit.js`, v5): `bed` gained a slatted wooden **headboard** +
  `opt.blanket` colour; `hearth` gained a **mantel, burning log, glowing embers, taller flame**;
  new **`pottery`** builder (jug + bowl); `_put` now honours `opt.y` so clutter can sit on tabletops.
  New **`cottage`** furnish preset = a real interior **partition wall + doorway** (2 wall segments
  with `addRectCollider`s → two rooms) + the Alora furniture layout. Verified via scene-graph query
  (156 meshes, 2 lights, hearth+candle emissives, barrel torus hoops, pottery spheres, partition
  colliders) and in-browser (roof lifts, sits on snow). Console clean.

## Blockers
- **Cannot drive the Alora Java client via synthetic input.** Confirmed the window takes foreground
  focus (GetForegroundWindow matches), but single- and double-`mouse_event` clicks on "CLICK HERE TO
  PLAY" don't register — typical of Java/AWT/OpenGL game canvases ignoring programmatic clicks.
  **Screenshotting Alora works perfectly.** → Division of labor: USER plays/advances Alora, Claude
  observes each screen + recreates. (Retry ideas if needed: SendInput scan-code path, or a real
  input-injection tool; not worth it while the user is at the machine.)

## Notes / decisions
- **Screen 1 finding:** the equipment tab was NOT a bare list — `src/ui_medieval.js` `UI.refreshEquip`
  already renders a full OSRS paper-doll (cross-layout slots w/ drawn ghost silhouettes, bonuses,
  items-kept). (The old `game4_ui.js:refreshEquip` list is superseded by ui_medieval.js.) So parity
  was ~90% already; the ONE gap vs Alora was a **live character render** inside the interface.
- **Built (screen 1):** `src/equip_preview.js` — `EquipPreview`, a live 3D character portrait shown
  at the top of the Worn Equipment tab. Renders the LIVE `player` object (no clone) via a 2nd
  WebGLRenderer + a camera locked to THREE **layer 1** (player subtree tagged onto it each frame, so
  new gear shows automatically; 3 dedicated lights also on layer 1; scene.background/fog nulled during
  the portrait render so the world sky doesn't fill the panel). Drag-to-rotate, double-click to
  auto-spin. Wired in `ui_medieval.js` refreshEquip; script + CSS added; `index.html` bumped
  ui_medieval to v3 and loads equip_preview.js. Verified in-browser (character "Adventurer" renders,
  console clean). NOTE: `.layers` was previously unused project-wide — layer 1 is ours.
- **Tooling note:** the WebGL preview canvas won't appear in `zoom`/secondary captures
  (preserveDrawingBuffer:false) — it DOES show in full-page screenshots. Gemini-gate still pending
  (capture plumbing fought back; do opportunistically).
