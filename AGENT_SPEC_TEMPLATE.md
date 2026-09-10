# AGENT_SPEC_TEMPLATE.md — how we brief every dispatched agent

> Adopted 2026-07-06 from the strongest pattern in the r/aigamedev dungeon-generator post
> (Reddit_Posts/): a spec with **non-negotiable constraints, a pure-data contract, and
> acceptance tests that run at boot**. It directly attacks our #1 agent failure mode —
> headless agents CANNOT see the world and hallucinate coordinates/tags — by making the
> agent prove its DATA layer headlessly and leaving eyes-on placement to the main session.

## The rules this encodes (why each section exists)

1. **Agents ship data + self-tests, not placements.** A worktree agent's deliverable is a
   NEW reversible file whose correctness is provable without a browser (`node` headless or
   boot-time asserts). The main session does all eyes-on placement/verification.
2. **Acceptance tests run at boot and print results.** If the module loads in-game, it
   asserts its own invariants once and logs `[MODNAME] N/N ok` — a regression announces
   itself in the console the smoke gate already reads.
3. **Base-check guard first.** The agent's FIRST action is confirming the feature/base it
   builds on exists ("confirm X exists or STOP") — the stale-worktree lesson.
4. **Anti-goals are stated.** What looks adjacent but must NOT happen (the drift killer).

## The template (copy per dispatch, fill every section)

```
ROLE
  You are working on Crafted Realm (Three.js r128, plain global <script> files, 1 unit =
  1 tile, 4-dir movement). Read CLAUDE.md + GUIDING_LIGHT.md first.

BASE CHECK (do this FIRST, stop on failure)
  Confirm <feature/function/file X> exists in your checkout. If missing, STOP and report —
  your base is stale.

CONTEXT
  <Files involved, the engine idioms to reuse (WORLD.*, UI.*, Planes.*, Buildkit.*),
   which globals are lexical (not on window), where this runs (game and/or r160 tools).>

OBJECTIVE
  <One paragraph. The deliverable is a NEW file src/<name>.js (reversible) that ...>

NON-NEGOTIABLE CONSTRAINTS
  - Combat math + XP curve are OSRS-exact — do not touch.
  - Never mutate shared NPC_TYPES; per-instance state only.
  - Data over code: tunables in data; logic separate from visuals.
  - Determinism where seeded: thread an explicit RNG; no Date.now()/random in logic.
  - Perf: merged geometry for repeated pieces; no hundreds of separate meshes; stay
    within <tri budget = base × placement count>.
  - DO NOT place anything at world coordinates — export placement DATA + a placement
    function the main session calls with eyes on.

PIPELINE (discrete, individually testable stages)
  1. <stage — pure data>
  2. <stage — pure data>
  3. <presentation/builder consuming the data>

DATA CONTRACT
  <The exact shape returned/exported — arrays, fields, units. Pure data: no scene-tree
   dependency, runnable headless.>

ACCEPTANCE TESTS (must run automatically at load and print results)
  - <invariant 1 — e.g. every tile in the output is tileWalkable>
  - <invariant 2 — e.g. same seed ⇒ identical checksum 3 runs>
  - <budget — e.g. built geometry ≤ N draw calls / M tris>
  Print: console.log('[<MODNAME>] <pass>/<total> acceptance ok') or the failures.

TUNABLES (expose with defaults)
  <seed, counts, densities...>

ANTI-GOALS
  <what NOT to do: e.g. don't retheme existing zones, don't add script tags beyond the
   one new file, don't "fix" unrelated code you notice.>

DELIVERABLE
  One new file src/<name>.js + one line to add to index.html + a 5-line summary of what
  the acceptance tests prove. Nothing else changed.
```

## After the agent returns (main session)

1. Read the diff; run `node tools/validate_content.js` if data touched.
2. Load the game, confirm the module's `[MODNAME] N/N ok` line, then the smoke gate
   (`?smoke=1` → `[SMOKE]` verdict).
3. Do the eyes-on placement/verification the agent could not.
