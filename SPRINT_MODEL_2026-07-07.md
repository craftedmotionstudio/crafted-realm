# Model Sprint — 2026-07-07 (Mixar workflow)

**Goal (user directive):** full model sprint on all V02–V20 characters; every existing NPC gets an
OSRS-equivalent modelled version; all buildings modelled. Uses the new **Mixar** workflow
(see memory `mixar-blender-fork`): concept imagegen (Gemini 3.1 Pro BYOK) → Hunyuan Pro image-to-3D
→ our deterministic bpy game-prep (remesh→decimate→unwrap→bake) → rig → export → wire → review.

**Credits:** started sprint at ~846 (of 1000 free). ~20–50 credits/model. Log balance each batch.
**Pipeline control:** blender-mcp addon INSIDE Mixar (port 9876); `bpy.ops.mixie_*` API; chat ops need
`temp_override` on the MIXIE area; bake/rig via `bpy.app.timers` with explicit selection override.

## Gotchas already learned (mole + guard)
- Baked NORMAL maps render BLACK in r128 → strip them (flat-shaded doesn't need them).
- Albedo bakes ~1.4× too dark for engine lighting → brighten albedo before export.
- Authored -Y-forward → +Z in GLB → engine lookAt aims -Z → driver/rig yaws root π.
- Never edit index.html with PowerShell Set-Content (UTF-8 mojibake) → use Edit tool. Bump each edited script `?v=`.
- Hunyuan output = ~500K-tri polygon soup, 1000+ shells → voxel REMESH 0.02 then decimate (Tripo retopo is BROKEN in 3.0.2).
- Menagerie (`Menagerie.go()`) = review lab; add new creatures to ROSTER + STATIC in starter_pen.js.

---

## TRACK A — V02–V20 characters (18 humanoids) — re-model w/ Mixar
Each needs: Mixar concept→3D (proven) + humanoid rig (Mixamo-named bones) + 4 baked clips
(idle/walk/attack/block) + brighten/flat + export `assets/models/vNN.glb` (REPLACES existing; wiring
already done in npc_chars.js). **Risk: authored humanoid animation clips — proving on v07 first.**

- [x] v07 Town Guard — **DONE at crisp bar** (2048+CONCAVE pack). Muddy-v1 root cause was the
      GHOST BAKE (low scaled 1.85 vs high 1.13 = no overlap; only ~25% of texels found source).
      Fix hard-coded into bake_maps (auto scale-match). Smoke PASS (earlier FAIL was self-inflicted:
      never teleport the player mid-smoke-walk). Claude-eye gate ~9/10 vs concept.
      NOTE: local GEMINI_API_KEY is DEAD (user rotated) → gemini_vision second-reviewer offline;
      Claude-eye is gate of record until user sets a new key. Mixar BYOK unaffected.
- [x] v18 Hold Soldier — **DONE.** Full chain ran clean FIRST TRY (concept→Hunyuan→prep→2048 bake→
      rig→4 clips→v18.glb). In-game: mixer READY, idle/walk/attack/block all present.
      ("no skin" GLTF export warning is cosmetic — binding verified.)
      USER DECISIONS 2026-07-07: crisp textures (2048+concave, chars) · interleave Tracks A+B.
      Docs for cross-model handoff: **MIXAR_WORKFLOW.md** (complete recipe). Credits after 4 gens: 740.
- [ ] v03 Hollow Mage (cn_mage)
- [ ] v09 Grey Wizard (cn_wizard)
- [ ] v04 Bryn Barbarian (cn_barbarian)
- [ ] v20 Bryn Berserker (cn_berserker)
- [ ] v13 Quarry Dwarf (cn_dwarf, h=1.5)
- [ ] v05 Road Rogue (cn_rogue)
- [ ] v08 Dawn Monk (cn_monk)
- [ ] v19 Dawn Priest (cn_priest)
- [ ] v14 Pond Corsair (cn_pirate)
- [ ] v10 Wood Archer (cn_archer)
- [ ] v17 Emberwood Ranger (cn_ranger)
- [ ] v11 Mill Hand (cn_farmer)
- [ ] v12 Gate Halberdier (cn_halberdier)
- [ ] v06 Aurel Knight (cn_goldknight)
- [ ] v16 Scarland Knight (cn_blackknight)
- [ ] v15 Ring Druid (cn_druid)
- (v02 hero / v01 concept-only = out of scope unless requested)

## TRACK B — NPC beast/creature archetypes — OSRS-equivalent models (proven mole pipeline)
Model the ARCHETYPE (many NPCs share each). Procedural driver (fx_*-style), simple rig. Replaces
crude procedural bodies. Wire via `glb`/`animDriver` on the NPC_TYPES entry (mole pattern).

- [ ] chicken (pasturehen)
- [ ] rat (burrowrat)
- [ ] cow (moorcalf)
- [ ] goblin (gnarlgob) — humanoid-ish, may use simple rig
- [ ] skeleton (skeleton, cinder_shade) — humanoid
- [ ] bogling (bogling)
- [x] wolf — **mosswolf DONE, LIVE & FACING-VERIFIED** (mosswolf.glb, axis-aware quad rig,
      fx_wolf.js driver, NPC wired glb/animDriver:'wolf'). Moonwalk check PASSED 2026-07-08 s2:
      root yaw == heading (0° diff across 13 moving samples) AND eyes-on in the Menagerie — head
      leads in both travel directions. Next: reuse the SAME glb for thornboar/dust_jackal/
      ash_stalker via recolor or per-type gen (blocked on credits).
      (Menagerie quirk found: pen-wander gets stuck when an exhibit hugs a fence — collides()
      resets wanderT in a 0.1s loop until a lucky direction; cosmetic, review-lab only.)
- [ ] crab (duneclaw)
- [ ] crawler (deep_crawler, grubkin, quarry_crawler)
- [ ] brute (oathbreaker, fenwretch, fenlord, korthul)
- Generic humanoid mobs (wizard/monk/wanderer/duelist/moss_seer/bryn_raider/hex_adept/gravewight/hold_knight/whitmoor):
  can reuse a Track-A humanoid base rather than new gen — decide during Track B.
- Already done: ash_wyrm ✅, giant_mole ✅

## TRACK C-0 — Tutorial Island interiors (USER DIRECTIVE 2026-07-08, in progress)
All 4 tut builds (tut_bld_chef/mage/guide/quest.js) have bespoke Buildkit-PRIMITIVE interiors.
Upgrade: 2 Mixar hero props each (prop chain: imagegen 1:1 flash-3-1 → hunyuan-pro-fal →
prep@1024, ~2.5K tris, static no-rig → assets/models/tut_<name>.glb), placed in the files replacing
the blockiest primitives, colliders where solid, entry lanes stay clear.
- [x] chef: tut_oven + tut_preptable — LIVE (replaced hearth/table/pottery primitives)
- [x] mage: tut_arcanedesk + tut_bookshelf ×2 — LIVE (replaced kit desk + east shelves)
- [x] guide: tut_banquettable + tut_fireplace — LIVE (one laden table replaces 3-table run + candles)
- [x] quest: tut_maptable + tut_questboard — LIVE (replaced kit table + candles; board on west wall)
ALL 8 verified placed in-scene (high-poly mesh query per building) + smoke PASS + validator PASS.
**INTERIOR VISIBILITY SAGA (2026-07-08, big pre-existing bugs found & partly fixed):**
(1) Tut interiors were seated via gy() but the REAL walk surfaces differ per building — chef/quest
sit on Holm LEVEL-PAD slabs (world tops 2.56 / 2.46, measured in-engine; now hardcoded PAD_TOP
consts in those files) while guide/mage use flattened terrain (per-item gy seating). Furniture had
been INVISIBLE (buried) in these buildings for months. Chef verified GORGEOUS in-game; quest same
pattern. (2) 2-storey Buildkit buildings NEVER showed their ground interior — roof lifted but the
storey-2 shell + ceiling slab stayed. FIXED: buildkit registers `it.storey2`, game5 roof-lift
toggles it on plane 0. (3) FIXED 2026-07-08 (session 2): mage tower's custom drum/spire/banners now
live in an `OH` overhead group registered as `it.overhead` on the interior entry; game5 roof-lift
toggles `it.overhead.visible = want` (same rule as the roof). Verified in-game by REAL walk-in:
interior fully visible inside (desk/rugs/shelves/orb-stand read clearly), turret+spire return when
stepping out. Guide hall verified same pass: roof+storey2 lift, banquet table + fireplace hero
props read beautifully, facing/seating good. `it.overhead` is now the generic hook for any
building whose character geometry rises above its shell roof. When re-measuring pads: query
full-footprint BoxGeometry slabs in-engine (see MIXAR_WORKFLOW.md §5 patterns).
Blend: scratchpad/tut_props_batch.blend. PENDING POLISH: per-prop facing/offset check with a proper
interior camera view (props' concept "front" is arbitrary; rotate by eye), and brightness check.
Batch lessons: (a) imagegen at 1:1 keeps the BASE image name (no .001 — only 2:3 does .001);
(b) Hunyuan free allowance = ~5 concurrent/day — overflow jobs FAIL "usage allowance", retry them on
model='tripo-v31' (separate provider allowance, ~1.4M-tri output, imports named tripo_node_<uuid> —
the node_ watcher misses them, rename by proportions/eyeball); (c) **MIXAR MONTHLY CREDITS EXHAUSTED
2026-07-08** ("You're out of credits" modal) — ALL further generation blocked → user decision:
upgrade plan / wait for monthly reset / different account. Local prep of already-imported meshes
still works fine (no credits needed).

## TRACK C — Buildings (mostly deploy existing ref-builds + a few new)
NOT Mixar-generation — procedural ref-builds. Largely a placement/wiring pass.
Dormant ref-builds authored but not deployed: ref_bld1 (tower tavern), ref_bld2 (L-manor),
ref_bld3 (farmhouse), ref_bld4 (clock-manor), ref_bank, ref_bankbasement, ref_churchinterior,
ref_dock, ref_townpool, ref_fountain.
- [ ] Deploy dormant ref-builds into towns (swap crude Buildkit boxes) — placement + colliders
- [ ] Author new type-specific structures where none exist (extra cottages, mill superstructure,
      smithy/warehouse exteriors, Gloomfen stilt houses, faction architecture)
- [ ] Replace remaining crude makeBuilding/makeHut boxes

---

## Log
- 2026-07-07: Sprint opened. Scoped all 3 tracks. Mole + ash_wyrm done. Started v07 Town Guard as
  Track-A pipeline proof. Credits ~846.
- 2026-07-08 (batch 1, Fable session): **v07 guard + v18 soldier + mosswolf DONE, all in-game,
  smoke PASS.** Full recipe canonized in MIXAR_WORKFLOW.md (cross-model handoff per user request).
  New gotchas: (a) GHOST BAKE — bake_maps now auto-scale-matches high↔low; (b) blind rotate+apply
  on beasts kept failing → rig_quadruped is now AXIS-AWARE (measures longest horizontal axis; never
  rotate the mesh, fix facing via fx-driver root yaw after ONE in-game look); (c) never touch the
  player mid-smoke-walk, and if the save is parked in the Menagerie the walk phase fails
  ("no reachable tile") — move to town + SaveGame.save() first; (d) local GEMINI_API_KEY rotated/dead
  → Claude-eye is QA gate of record until replaced. Credits: 740. Uncommitted work piling up —
  COMMIT EARLY next session (mole + 3 sprint assets + engine drivers + docs).
- NEXT UP (interleave): v03 Hollow Mage + chicken/rat pair → then v09/v04 + cow/crab, etc. Humanoid
  chain is one scripted pass/asset now (~20-25 min incl. gen); beasts need per-archetype fx driver
  (wolf/mole exist; crawler/brute/chicken/rat/cow/crab/goblin/skeleton/bogling to write, ~40 lines each).
- 2026-07-08 (session 2, Fable): **mage-tower overhead fix + guide-hall verify + mosswolf facing
  verify — the no-credit queue items.** `it.overhead` roof-lift hook added (game5 + tut_bld_mage);
  both remaining tut interiors verified in-game by real walk-in. Mosswolf: no moonwalk (numeric +
  eyes-on). Validator PASS 43-test structural suite PASS (run manually in-tab). **SMOKE verdict
  FAIL on this machine today — settle 44-51s vs 12s budget + fps 23 vs 25 across 3 runs; all
  FUNCTIONAL phases pass (boot, walk out+back, structural 43/43, zero console errors, draws/tris
  ~60% under budget).** Assessed environmental (the very first MANUAL login today froze the
  renderer ~40s during world build, before any smoke run; machine under harness load). Two smoke-
  harness debts found: (a) CR_smoke script-load race under load ("not a function" then loads fine),
  (b) settleMs isn't wall-clock-safe when the main thread stalls (recorded 51s with ok:true on a
  20s waitFor). FOUND (pre-existing, unfixed): the Holm's stream is baked near-BLACK into the
  terrain by the map-PNG bake (no water mesh) — runs through the plaza + under the mage tower;
  needs a water/recolor pass. Also a tree pokes through the mage tower's E wall (footprint sweep
  missed it).
