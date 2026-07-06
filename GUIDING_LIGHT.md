# ⭐ GUIDING LIGHT — read at the START of every session

The one page that keeps Crafted Realm from drifting. Vision lives in `GOAL.md`, engineering rules in
`CLAUDE.md`, world canon in `STORY_BIBLE.md` — this file is the **north star + the working discipline**,
short on purpose so it actually gets re-read. If a change here fights a decision below, the decision wins
unless we change it *deliberately* (and edit this file).

## The game, in one breath
**Old School RuneScape's soul in a browser** — cozy medieval grind, click-to-move tile world, skill
ladders, quests, loot — as our own IP, tighter and more optimized, carried past where OSRS stops. A love
letter, not a clone. Warm, low-poly, flat-shaded 2007 charm. (Full vision: `GOAL.md`.)

## The spine — decisions that MUST NOT be silently eroded
1. **Combat math + XP curve are OSRS-exact.** Never regress. (`game3_systems.js`, `game1_data.js`.)
2. **1 world unit = 1 tile. Movement is 4-directional (N/S/E/W), never diagonal.**
3. **Art: cozy 2007/OSRS, low-poly flat-shaded, WARM — cohesive over individually-cool.** Consistency wins.
4. **Items are 2D icon sprites; 3D is only world props + worn gear.**
5. **NPCs: only MODELLED (GLB) NPCs, added LAST** (user, 2026-07-04). Never mutate shared `NPC_TYPES` —
   per-instance state only.
6. **Modelled assets replace ALL procedural instances of that type** (asset-replacement rule).
7. **Anything that moves in reality ships ANIMATED** (flames, flags, water, sails).
8. **Secrets come from env, never hardcoded/printed/committed.**

## The discipline — how we work (the anti-drift rules)
1. **Re-read this file each session.** A fix that undoes an earlier decision is the #1 silent failure
   (r/aigamedev). If you're about to change core/shared code, check the spine first.
2. **VERIFY, don't assert.** I (the AI) will confidently claim things are done that aren't. Prove every
   change by DRIVING THE REAL FLOW in-browser (walk in, click, read the console) — **never by teleport,
   never by "should work."** Cautionary tales: claimed the brown-plane fixed after only teleporting;
   deleted the `band` slab and hung the boot because I missed a second reference.
   **The smoke gate is live (2026-07-06):** `?smoke=1` drives real login → settle → structural suite →
   real walk out-and-back → perf budgets → console-error sweep, and prints one `[SMOKE]` verdict line
   (+ an on-screen badge). Run it after every nontrivial change; it replaces nothing about eyes-on
   visual judgment, it catches the "boot is broken / flow regressed / perf fell off a cliff" class.
3. **Plan → small bundles → gate each.** Decompose before building; fan out agents for independent,
   self-contained work; verify each piece before the next. Eyes-on placement stays in the main session
   (headless agents hallucinate world coords). **FRONT-LOAD agents at the START of every loop** (user,
   2026-07-04): open each pass by dispatching as many parallel agents as the work has independent seams —
   each writes its own NEW reversible file — so we build from all angles while the main session does the
   eyes-on verification/placement that can't be parallelized. Then integrate + gate the clean ones.
   **Brief every agent with `AGENT_SPEC_TEMPLATE.md`** (2026-07-06): base-check guard, pure-DATA
   contract, boot-time acceptance tests, anti-goals — the agent proves its data layer headlessly.
4. **Author assets in the STUDIO, not the live game.** `tools/studio.html` renders one building/object in
   isolation with an orbit camera + hot-reload (seconds, not the 60–90s game boot). Gate assets there —
   including vs the `Bible_References/` image — before they enter the game. This is a STAPLE, not a one-off.
5. **Data over code.** Buildings/objects/values want to be DATA a composer reads, not bespoke procedural
   code per asset. Keep tunables (stats, prices, layouts) in data files.
6. **Separate logic from visuals** so a visual rewrite can't break mechanics.
7. **Know when a thing is "good enough."** Fine interior detail does NOT read from the fixed overhead
   camera — stop polishing what the camera can't show; use the Studio's close camera for detail work.
8. **Perf is a feature.** Three.js devours memory → crashes/slow boot. Merge repeated geometry into ONE
   draw call; stagger heavy builds across frames; watch the boot time and tick health.
9. **Log every pass in `PASS_LOG.md`** (survives context compaction — it's our memory between sessions).
9b. **"Done" has a HARD definition (user, 2026-07-04): an item is complete ONLY when it has a side-by-side
   comparison sheet in `Bible_References/Complete/_compare/` AND BOTH reviewers score ≥9.5 (Claude-eye +
   `gemini_vision.js`).** Moving a reference image into `Complete/` is NOT "done". Never claim an item done
   without its sheet + dual ≥9.5. (Backlog reality 2026-07-04: 65 refs, only 3 sheets built, none ≥9.5 —
   grind them all to the bar.) Capture our render via `STUDIO_CAPTURE('cr_<name>.jpg')` (Studio) or the
   game→recv2 hook; recv2.py must be running on :9098.
   **CAPTURE GOTCHA:** the Studio is a BACKGROUND tab → rAF is throttled → toDataURL is blank. Take an mcp
   screenshot FIRST (forces a paint), THEN STUDIO_CAPTURE. One object per call, on a settled frame.
   **GATE OF RECORD = CLAUDE-EYE (decided 2026-07-04, empirically forced).** Gemini (BOTH flash AND pro) is
   too noisy/harsh to confirm ≥9.5: the same good fountain scored flash 6.0/6.2/7.3/8.8/9.3 (median 7.3) and
   pro 4.2/6.5/6.5/6.2/6.5 (median 6.5) — a ~2-3pt spread on ONE image, and the reworked-worse fountain
   medianed 5.5. So a strict Gemini-≥9.5 gate is UNREACHABLE regardless of model — the blocker is the reviewer,
   not the asset. RULE (bar set by user 2026-07-04): an item is DONE when **Claude-eye judges it ≥9.0 vs the reference AND a
   sheet is banked** (9.0 = clearly-excellent + reference-faithful; the strict 9.5 was abandoned because even
   great assets rarely clear it and Gemini can't confirm it). The **Gemini median is recorded on the sheet as
   an advisory second opinion only, NOT a gate** (it ranked our plainest object 9.5 and richest 6.5 — noise). NEVER chase a single Gemini run or a note that contradicts the prior round (that's the
   fix-#40-undoes-#12 drift — it already regressed the fountain 8.7→5.5). Trust a clear visual improvement
   over a Gemini dip. Capture protocol: mcp screenshot (force paint on the background tab) → STUDIO_CAPTURE,
   one object per call on a settled frame.
10. **Second opinion on visuals:** screenshot → `tools/gemini_vision.js` for a critique / match score.

## Current focus (update as it moves)
- **PRIMARY OBJECTIVE (user, 2026-07-04): recreate EVERY object — especially every BUILDING — to the level
  of its `Bible_References/` reference.** Recreating the references is the key to the whole game's look.
  **ENUMERATION RULE (user, 2026-07-04):** when analyzing each reference image, list EVERY visible object in
  it, check each against our game inventory, and **model + import any that don't already exist** — the goal
  is total coverage of everything the references show, not just the file's headline subject.
  Every loop is a Bible_References pass: pick a reference, build/upgrade our version to match it in the
  Studio (`tools/studio.html`), A/B in-browser, gate with Claude-eye + `tools/gemini_vision.js` (aim ≥9.5),
  and bank a side-by-side sheet in `Bible_References/Complete/`. Buildings first — audit ours
  (guide/chef/quest/mage + town/church/bank/store) against `Building_Exterior_Option*.jpg` /
  `Building_Interior_Option*.jpg` and close the gap.
- **NPCs: FULLY DEFERRED** until the user explicitly green-lights them (they will say when). World NPC
  spawns are gated off (`GameConfig.worldNpcSpawns:false`) on purpose. Do NOT spawn, model, or wire NPCs —
  not even "presence" — until told. The tutorial's guided FLOW already works action-gated end-to-end; leave
  it. (Tutorial flow engine, cave, dagger, teleport tabs, firemaking gate all shipped + verified.)
- **The Studio is the staple** for building/object work — author in isolation (roof-off interior view,
  orbit detail camera) against the reference image, not the slow game boot.
- **Infra reality:** dev server (`serve.ps1` / `python -m http.server 8777`) keeps dying under the harness;
  a persistent server on the user's own terminal removes the biggest drag. Boot is slow — wait, don't fight it.
