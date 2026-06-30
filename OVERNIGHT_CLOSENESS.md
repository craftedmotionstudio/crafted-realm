# Overnight Closeness Push — Checklist & Log

Tracker for the 8-hour push to raise OSRS / private-server closeness percentages.
Categories are Leeroy's QA scoring buckets (separate from `osrs_checklist.html`, which
tracks *mechanics* parity). Update the **Done log** after each safe change.

## Baseline (start of run, 2026-06-30)
| Category | Baseline % |
|---|---|
| Overall | 31 |
| Functionality | 47 |
| Graphics | 30 |
| NPCs | 22 |
| Characters | 22 |
| **Animations** | **18** ← weakest |
| Items | 24 |

## Weakest-first priority
1. **Animations (18)** — strong preference this run.
2. Characters (22) / NPCs (22).
3. Items (24).
4. Graphics (30).

## Animation system — state audit (2026-06-30)
What already exists (procedural rig, `game2_world.js` + `game3_systems.js`):
- [x] Walk/run gait + idle breathing (humanoid `walkAnim`, beast `beastAnim`).
- [x] Per-weapon attack swings: slash / stab / crush / bow draw / cast (`tickSwing`).
- [x] Hit-react squash-and-stretch flinch (`tickHit`, fired from `UI.floatDmg`).
- [x] Death topple + sink (`startDeath`/`tickDeath`).
- [x] Auto-retaliate facing/tracking.
- [x] **Armless-beast attack motions** — wolf bite-lunge, crawler mandible scissor,
      crab pincer thrust+clamp (`tickBeastSwing`). _Added this run._
- [x] **Real skeletal/GLB animation pipeline proof** — the Ash Wyrm (`skinnedRig:true`) loads its
      `ash_wyrm_built.glb` skin, the loop calls `riggedDragonAnim` each frame, and the named-bone
      drive (wings/legs/neck/head/tail) is now *proven against the real asset + real code* by
      `tools/_dragon_rig_test.js`. _Verified this run (was wired but unproven)._ **NEXT: strafe / walk-while-attacking.**
- [x] **Browser-testable animation proof path** — `Shift+A` opens an in-game Animation Showcase
      that spawns one of every archetype and fires every animation (idle / combat stance / walk /
      per-weapon swing / block / hit / death) on demand, so all of the above is finally QA-able
      without hunting a mob. Per-weapon swing variety proven distinct headlessly. _Added this run._
- [x] **Block/parry pose distinct from idle** — a fully-absorbed hit (the `0` hitsplat) now
      raises a per-archetype guard instead of doing nothing. _Added this run._
- [x] **Combat-ready stance** — an idle entity that's locked in a fight no longer just breathes:
      humanoids/player adopt a bladed stance (weapon arm up, off-hand guard, weight forward,
      tense ready-bob); brutes hoist their fists; beasts drop into a restless agitated crouch.
      Eases back to peaceful idle when the fight ends. _Added this run._
- [x] **Per-archetype locomotion gait** — wolves trot (diagonal leg pairs), crawlers/crabs
      skitter (a travelling leg wave), brutes lumber (slow two-beat + vertical lurch +
      counter-swinging arms); cadence + amplitude differ per body. Was one `i%2` gait at one
      speed for every beast. _Added this run._
- [ ] Strafe / walk-while-attacking.
- [x] **Death variety per archetype** — crab flips onto its back (claws/legs splay up),
      crawler curls its six legs to the belly + mandibles go slack, wolf's legs buckle +
      head/jaw droop, brute drops its arms dead-weight + head lolls. _Added this run._

## Done log
### 2026-06-30 — Worn armour on humanoid NPCs (Characters / NPCs)
- **Gap closed:** every humanoid NPC shared ONE body with only a colour/robe/hat/weapon tint —
  the warrior types carried a weapon but wore **no helmet, shield, or armour**, so a *Hold Knight*
  ("Polished, patient, deadly"), a *Bryn raider* and a *Gravewight* all stood in a plain tunic while
  the player could be in full plate. The two joint-weakest categories after animations (Characters 22 /
  NPCs 22) were starved of silhouette variety in exactly the slot OSRS sells hardest — armoured humans.
- **Change:** `humanoid(bodyColor, opts)` now accepts opt-in `helm` / `shield` / `armour` / `legArmour`
  and builds them with the **player's own gear builders** (`helmMesh`/`shieldMesh`/`bodyArmorMesh`/
  `legArmorMesh`), so an armoured NPC reads identically to an armoured player. Every piece is rig-local:
  the helm parents to `headTop` (and hides the bare-head hair), body/leg plate to the rig root (leg
  plate hides the cloth legs), and the **shield rides `handL`** — so `blockReact`'s armL guard now
  *carries the shield up on a parry* (free synergy with this run's block work). `spawnNpc` resolves the
  data metal-name → `METALS` colour and passes it through; `!opts.robe` guards keep plate off casters.
  Data: **Hold Knight** → full steel plate + shield (a true Whitmoor knight); **Bryn raider** → iron
  helm + leather (lighter, axe-wielding); **Gravewight** → iron helm + battered shield (a fallen
  soldier). Three formerly-identical tunic silhouettes are now three distinct armoured reads. Purely
  additive + cosmetic — no combat math, no shared `NPC_TYPES` mutation, no anim channel touched.
  - Files: `src/game2_world.js` (`humanoid()` gear block), `src/game3_systems.js` (`spawnNpc` wiring),
    `src/game1_data.js` (3 NPC defs), `tools/_npc_gear_test.js` (new headless harness).
- **Verification:** `node --check` (game2_world / game3_systems / game1_data) ✓ ·
  `node tools/_npc_gear_test.js` **25/25 PASS** — extracts the REAL gear builders from source, proves
  each builds + carries its metal colour, the knight's helm hides the hair + parents to headTop, body+leg
  plate parent to the root + hide the cloth legs, the shield faces out on handL, the raider stays lighter
  (helm only, cloth legs kept), and a robe suppresses plate ✓ · animation regression suite green —
  `_beast_anim`/`_beast_block`/`_beast_death`/`_beast_gait`/`_combat_stance`/`_anim_swing` ALL PASS ✓ ·
  `node tools/validate_content.js` PASS (134 items / 24 npcs) ✓ · dev server serves the live gear block +
  knight data, HTTP 200 ✓.
- **Visual QA:** dev server `python -m http.server 8777 --bind 127.0.0.1`; load `http://127.0.0.1:8777`.
  Find a **Hold Knight** (Whitmoor Hold) — should now stand in a **steel helm, chestplate, leg plates and
  carry a round shield** (shield arm raises with the shield when it blocks a 0 hitsplat); a **Bryn raider**
  (Brynholt) wears an **iron helm over leather**, no shield, axe in hand; a **Gravewight** (Scarlands)
  wears an **iron helm + battered shield**. They should read as three distinct armoured fighters, not three
  recoloured tunics. _In-game screenshot not captured — no browser MCP in this session (blocker noted)._

### 2026-06-30 — Skeletal GLB animation pipeline: PROVEN end-to-end (Animations)
- **Gap closed:** the whole image-to-3D → rigged-GLB → procedural-bone-drive pipeline (the Ash
  Wyrm boss) was fully *wired* in the working tree — `game1_data.js` flags the boss `skinnedRig:true`,
  `makeGlbModel` stashes `userData.bones` off the skin (`game2_world.js:397`), the loop calls
  `riggedDragonAnim(n,dt,n.moving)` each frame (`game5_main.js:513`), and `fx_dragon.js` drives the
  named bones — but it was **unproven**: nothing confirmed the GLB asset actually ships the bone
  *names* (`wing_L/wing_R/legFL.../neck/head/tail1/2`) that `_setupNamedRig` silently gates on. If a
  name were missing the named drive would no-op and fall back, and we'd never know headlessly. The
  category was the one motion family we had a *real skeleton* for, yet it sat unverified at the top
  of the NEXT list. This proves the GLB↔code contract, not a new motion.
- **Change:** new headless harness `tools/_dragon_rig_test.js` in two halves. (A) Parses the real
  `assets/models/ash_wyrm_built.glb` binary (GLB JSON chunk) and asserts it has a skinned primitive
  (`JOINTS_0`) + a skin whose joints include **every** bone the rig drive references by name.
  (B) `eval`s the **real** `fx_dragon.js` against a faithful `THREE` stub + fake bones named exactly
  as the GLB and runs the actual `riggedDragonAnim`/`_setupNamedRig` — proving it detects the named
  rig, applies the −90° facing yaw, flutters both wings + sways neck/head/tail at idle, gaits the
  legs ~19× harder once the body translates (28.9 vs 1.51), rears the neck back on a fire wind-up
  (−0.34 rad), and re-seats all 10 bones to captured rest every frame (no drift). It's a *viewer*
  of the live code, adds nothing to gameplay, and touches no game file.
  - Files: `tools/_dragon_rig_test.js` (new). No `src/` or asset changes.
- **Verification:** `node --check src/fx_dragon.js` ✓ · `node tools/_dragon_rig_test.js` **ALL PASS**
  (23/23: 14 asset-contract + 9 live-drive assertions) ✓ · regression suite green —
  `_beast_anim`/`_beast_block`/`_beast_death`/`_beast_gait`/`_combat_stance`/`_anim_swing` ALL PASS ✓ ·
  `node tools/validate_content.js` PASS ✓.
- **Visual QA:** dev server `python -m http.server 8777 --bind 127.0.0.1`; load
  `http://127.0.0.1:8777`. The Ash Wyrm spawns in the world (`game4_ui.js:2081`, near the keep) — it
  should breathe, flutter its wings, sway head/neck/tail, **trot its four legs when it moves**
  (cadence tracks ground speed, no moonwalk), and rear back before a fire-breath. _In-game screenshot
  not captured — no browser MCP in this session (blocker noted); the GLB↔code contract is now proven
  headlessly so the only remaining unknown is the visual read._

### 2026-06-30 — Animation Showcase: a browser-testable proof path (Animations)
- **Gap closed:** every animation entry above shipped with the SAME blocker —
  _"in-game screenshot not captured."_ A rich rig vocabulary (walk gaits, per-weapon swings,
  block, hit-react, four death styles, combat stance) was built but **invisible to visual QA**:
  to see any of it you had to find a specific mob, fight it in armour, and wait for a rare event
  (e.g. a `0` hitsplat for the block). The work was real but unprovable, so the category stayed
  stuck at 18. This closes the *visibility* gap, not a new motion.
- **Change:** new self-contained `src/anim_showcase.js` (toggle **`Shift+A`**). It spawns one rig
  of **every archetype** (sword/bow/staff humanoids + wolf/crawler/crab/brute) in a labelled fan
  facing the camera, and a button panel fires each animation on **all of them at once**:
  Idle · Combat stance · Walk · Slash · Stab · Crush · Bow · Cast · Block · Hit-react · Death ·
  Reset. It calls the **real** game functions (`walkAnim`/`beastAnim`/`swing`/`hitReact`/
  `blockReact`/`startDeath`/`tickDeath`) on real procedural rigs — a *viewer*, not a
  reimplementation — so what QA sees is exactly what plays in combat. It adds only its own
  throwaway meshes + DOM and ticks only when open; it never touches `WORLD`, NPCs, combat math,
  or shared `NPC_TYPES`. Removing the one `<script>` tag + one tick line reverts it cleanly.
  - Files: `src/anim_showcase.js` (new), `index.html` (script tag),
    `src/game5_main.js` (one-line `AnimShowcase.tick(dt)` in `update`),
    `tools/_anim_swing_test.js` (new headless harness).
- **Verification:** `node --check` (anim_showcase.js, game5_main.js, game2_world.js,
  proc_beasts.js) ✓ · `node tools/_anim_swing_test.js` **ALL PASS** — drives the real `tickSwing`
  math for all five weapon styles and proves each writes a **distinct channel signature** (crush
  has the largest arm lift 3.20; only bow draws the off-arm 2.30; only slash rolls the shoulder
  armZ 0.38; slash/bow twist the torso while stab/crush/cast lean; all five pairwise-distinct) and
  every style returns to exact rest ✓ · regression suite green: `_beast_anim`/`_beast_block`/
  `_beast_death`/`_beast_gait`/`_combat_stance` ALL PASS ✓ · `node tools/validate_content.js`
  PASS (134 items / 24 npcs) ✓ · dev server serves `src/anim_showcase.js` **HTTP 200** and
  `index.html` references it ✓.
- **Visual QA:** dev server `python -m http.server 8777 --bind 127.0.0.1`; load
  `http://127.0.0.1:8777`, press **`Shift+A`**. A row labelled **Sword · Bow · Staff · Wolf ·
  Crawler · Crab · Brute** appears in front of the camera. Click **Walk** (each archetype should
  trot/skitter/lumber with its own gait), then **Slash / Stab / Crush / Bow / Cast** in turn
  (the humanoids' arm motion should visibly differ per style; beasts lunge/snap), **Combat stance**
  (idle → bladed ready pose), **Block** (off-arm guard / head rear / pincer shield), **Hit-react**
  (squash flinch), **Death** (crab flips, crawler curls, wolf collapses, brute drops its arms),
  then **Reset** to revive. _This run added the harness; the in-browser capture is now Leeroy's
  one-screen QA gate for the whole animation category._

### 2026-06-30 — Per-archetype locomotion gait (Animations / NPC variety)
- **Gap closed:** every beast — a lean wolf, a six-legged crawler, a wide crab, a hulking
  brute boss — **walked with the identical gait**: `beastAnim`'s moving branch ran one
  `legs.forEach((l,i)=>l.rotation.z = i%2?s:-s)` at one fixed cadence (`dt*10`) for all of them.
  OSRS sells its bestiary on movement you read at a glance; we had four silhouettes sharing one walk.
- **Change:** the moving branch now classifies the body once off its rig parts (`_deathStyle`,
  the same pure read the death system uses — no shared `NPC_TYPES` state) and drives a distinct
  gait per archetype: **wolf** trots on diagonal leg pairs (legs 0&3 vs 1&2) with a muzzle bob;
  **crawler/crab** skitter a travelling leg wave (per-leg phase `-i·π/(n/2)`) — the crab also
  side-rocks its shell; **brute** lumbers on a slow heavy two-beat with a vertical torso lurch,
  a shoulder roll, and arms counter-swinging the stride. Cadence (`6.0 / 13.0 / 14.0 / 10.5`)
  and leg amplitude (`0.72 / 0.30 / 0.34 / 0.55`) differ per body. It writes only free channels —
  `legs.z` (walk owns), `torso.position.y` + `torso.rotation.z` (no other anim touches these;
  `tickSwing` owns `torso.rotation.x/y`, not `.z`/`posY`), and brute `armR/armL.x` gated by the
  same `ud.swinging`/`ud.blocking` flags the rest of the rig respects. New `_gaitHome` eases the
  walk-only channels (torso lurch/roll + off-arm) back to their captured rest when a beast stops,
  so it never freezes mid-stride tilted. Body extras are gated by `!busy` so a swing/lunge keeps
  its channels.
  - Files: `src/game2_world.js` (`beastAnim` moving branch + `_gaitHome` + idle-branch easing),
    `tools/_beast_gait_test.js` (new headless harness).
- **Verification:** `node --check` (game2_world.js, proc_beasts.js) ✓ ·
  `node tools/_beast_gait_test.js` **18/18 PASS** — each rig classifies correctly, wolf legs
  0&3 move in phase / 1&2 anti-phase, brute legs two-beat with torso lurching off-base (+0.029)
  + shoulders rolling + arms counter-swinging, crawler spreads 6 legs across 6 phase values
  (not 2), crab shell side-rocks, brute cadence < crawler (6.0 < 14.0), all walk-only channels
  ease home on stop, and the four archetypes yield four distinct cadence/amplitude signatures ✓ ·
  `node tools/_combat_stance_test.js` ALL PASS · `_beast_death_test.js` ALL PASS ·
  `_beast_block_test.js` ALL PASS · `_beast_anim_test.js` ALL PASS (no regressions) ✓ ·
  `node tools/validate_content.js` PASS (134 items / 24 npcs) ✓ · dev server HTTP 200 serving
  the wired `_gaitStyle` gait ✓.
- **Visual QA:** dev server `python -m http.server 8777 --bind 127.0.0.1`; load
  `http://127.0.0.1:8777`. Lure a Mosswolf, a Grubkin (crawler), a Duneclaw (crab) and a brute
  boss into following/patrolling and watch them **walk**: the wolf should trot lightly on
  diagonal pairs, the crawler/crab should skitter with a rippling leg wave (crab shell rocking),
  and the brute should plod slow and heavy with its body lurching and arms swinging. They should
  ease smoothly back to idle when they stop. _In-game screenshot not captured — no browser MCP in
  this session (blocker noted)._

### 2026-06-30 — Combat-ready stance (Animations)
- **Gap closed:** an idle entity looked *identical* whether peacefully standing or trading blows
  toe-to-toe — both just played the slow breathing idle. OSRS reads instantly: the moment you're
  in combat your character drops into a ready stance. We had zero visual signal for "in combat."
- **Change:** added an `ud.inCombat`-gated branch to the idle path of both `walkAnim` (humanoids +
  player) and `beastAnim` (beasts + brute bosses). Humanoids take a **bladed stance** — weapon arm
  raised on guard, off-hand up, feet split (one fwd/one back), torso pitched forward, a faster/tenser
  ready-bob; brutes **hoist their fists**; beasts drop into a **restless agitated crouch** (heavier
  breath + weight-shifting legs). It writes only the same idle channels each function already owns
  (`legs`, `arms.x`, `torso`, `head.z`), and respects the existing gates — `ud.swinging` (swing owns
  `armR`/`torso.y`), `ud.blocking` (block owns `armL`), and `ud.death` (a corpse never takes a
  stance). On combat exit the peaceful branch's decays (`*=0.8`/`*=0.85`) ease every channel home,
  so there's no snap. `inCombat` is set per-frame from `Player.target` (player) and `n.target==='player'`
  (NPCs) — no shared `NPC_TYPES` state touched.
  - Files: `src/game2_world.js` (`walkAnim`/`beastAnim` combat-idle branches),
    `src/game5_main.js` (set `inCombat` for player + each NPC), `tools/_combat_stance_test.js` (new harness).
- **Verification:** `node --check` (game2_world.js, game5_main.js, proc_beasts.js) ✓ ·
  `node tools/_combat_stance_test.js` **15/15 PASS** — peaceful vs combat poses are provably distinct
  (weapon arm 0.00→-0.60 rad, bladed footing, forward lean), swing/block gates leave armR/armL
  untouched mid-strike/parry, the stance eases out post-combat (-0.60→-0.00), a corpse stays limp,
  and brutes raise/relax their fists ✓ · `node tools/_beast_death_test.js` ALL PASS (no regression) ✓ ·
  `node tools/_beast_block_test.js` ALL PASS (no regression) ✓ · `node tools/validate_content.js`
  PASS (134 items / 24 npcs) ✓ · dev server HTTP 200 serving the wired `inCombat` code ✓.
- **Visual QA:** dev server `python -m http.server 8777 --bind 127.0.0.1`; load
  `http://127.0.0.1:8777`. Stand next to any NPC and **attack** it — the moment combat starts both
  your character and the NPC should drop their breathing-idle and snap into a ready stance (weapon up,
  weight forward, restless bob for beasts / fists up for brutes); when the target dies or you walk
  away they relax back to a calm idle. _In-game screenshot not captured — no browser MCP in this
  session (blocker noted)._

### 2026-06-30 — Block / parry pose (Animations)
- **Gap closed:** a fully-absorbed hit (a `0` hitsplat — extremely common in combat) played
  **only a sound** (`Sfx.block`) and **no animation at all** — every defended blow looked
  identical to standing still. OSRS gives a readable defend/block motion on every guarded hit.
- **Change:** `UI.floatDmg` now branches — `dmg>0` → `hitReact` (flinch, unchanged); `dmg<=0`
  → new `blockReact`, which arms a 0.34 s guard driven by `tickBlock` through **child-part
  channels no other anim writes** (`armL.z`/`handL.x`/`head.x` for humanoids & brutes;
  `head.x` rear-back for wolves; `maw.y` mandible flare for crawlers; `claw.arm.x` pincer
  shield for crabs). A `sin(π·f)` envelope self-returns every channel to exact rest, so it
  never fights the swing (owns `armR`/`torso`/`head.z`), the hit-flinch (owns root scale),
  walk (gated by a new `ud.blocking` flag), or death (block is a no-op on a corpse).
  - Files: `src/game2_world.js` (`blockReact`/`tickBlock` + `walkAnim`/`beastAnim` wiring),
    `src/game4_ui.js` (`floatDmg` trigger), `tools/_beast_block_test.js` (new headless harness).
- **Verification:** `node --check` ✓ · `node tools/_beast_block_test.js` **28/28 PASS** — each
  archetype (humanoid, brute, wolf, crawler, crab) raises a readable guard (peak 0.32–1.40 rad),
  toggles `ud.blocking`, clears the block, snaps every channel back to exact rest, and a corpse
  refuses to parry ✓ · `node tools/_beast_death_test.js` 17/17 PASS (no regression) ✓ ·
  `node tools/validate_content.js` PASS (134 items / 24 npcs) ✓ · dev server HTTP 200 serving
  `blockReact`/`tickBlock`/`floatDmg` wire ✓.
- **Visual QA:** dev server `python -m http.server 8777 --bind 127.0.0.1`; load
  `http://127.0.0.1:8777`. Fight any NPC with Defence/armour up until you see a blue `0`
  hitsplat — the defender should snap a brief guard: a humanoid/brute throws its off-arm up
  across its chest + tucks its chin; a Mosswolf jerks its head back; a Grubkin flares its
  mandibles; a Duneclaw hoists its pincers. _In-game screenshot not captured — no browser MCP
  in this session (blocker noted)._

### 2026-06-30 — Beast attack animations (Animations)
- **Gap closed:** wolves, crawlers, crabs (`mosswolf`, `grubkin`, `duneclaw`,
  `ash_stalker`, deep crawler) had **zero attack motion** — `swing()` no-op'd on any
  body without `parts.armR`, so the most common early-game mobs bit/pinched motionless.
- **Change:** stored the articulating front parts on each archetype
  (`parts.head`+`parts.jaw`, `parts.maw`, `parts.claws`) and added `tickBeastSwing` — a
  single lunge-and-snap per archetype driven only through those child parts, so it never
  fights the root scale/rotation owned by hit-react & death.
  - Files: `src/proc_beasts.js`, `src/game2_world.js`, `src/game3_systems.js`.
- **Verification:** `node --check` (3 files) ✓ · `validate_content.js` PASS ✓ ·
  HTTP 200 with live code served ✓ · headless beast-anim harness: parts attach, each
  archetype peaks 0.48–0.62 rad (~28–35°) then resets to exact rest pose, no drift ✓.
- **Visual QA:** dev server `python -m http.server 8777 --bind 127.0.0.1`; load
  `http://127.0.0.1:8777`, fight a Mosswolf/Grubkin/Duneclaw and watch the bite/snap/pinch
  on each NPC attack. _In-game screenshot not captured this run — no browser MCP in session
  (blocker noted)._

### 2026-06-30 — Per-archetype death animations (Animations)
- **Gap closed:** every NPC died with the same sideways `rotation.z` topple — a crab, a
  six-legged crawler, a wolf and a hulking brute all fell over identically. OSRS gives each
  monster family a readable death; we had one for all.
- **Change:** `tickDeath` now dispatches on a style read from the rig parts each builder
  already exposes (`_deathStyle`): **crab** rolls fully onto its back (root rolls to 2.6 rad)
  with pincers flung open + legs splayed up; **crawler** curls all six legs in to the belly
  and lets its mandibles fall slack-wide; **wolf** buckles its legs and droops head + jaw;
  **brute** drops both heavy arms as dead-weight and lolls. The ROOT still only rolls about
  z (the one axis that provably preserves the facing baked into `rotation.y`); all archetype
  flavour is layered through child-part channels that are idle on a corpse (walk/beastAnim
  is skipped for dead NPCs), and every touched channel snaps back to rest at `f>=1` so a
  respawn is pristine. In-flight swing/beastSwing state is cleared on death so it can't
  resume after respawn.
  - Files: `src/game2_world.js` (`startDeath`/`tickDeath` + new `_deathStyle`),
    `tools/_beast_death_test.js` (new headless harness).
- **Verification:** `node --check` (game2_world.js, proc_beasts.js) ✓ ·
  `node tools/validate_content.js` PASS (134 items / 24 npcs) ✓ ·
  `node tools/_beast_death_test.js` 17/17 PASS — each archetype classifies correctly, moves
  its own parts during death (peaks 0.5–1.5 rad), clears death state, snaps every child part
  back to exact rest, and the four archetypes yield four distinct styles ✓ ·
  live code served HTTP 200 with `_deathStyle` present ✓.
- **Visual QA:** dev server `python -m http.server 8777 --bind 127.0.0.1`; load
  `http://127.0.0.1:8777`, kill a Duneclaw (crab — should flip onto its back, claws up), a
  Grubkin (crawler — legs curl in), a Mosswolf (wolf — head/legs collapse) and a brute boss
  (arms drop). _In-game screenshot not captured — no browser MCP in this session (blocker)._
