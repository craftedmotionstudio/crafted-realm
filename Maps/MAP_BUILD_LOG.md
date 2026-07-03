# Map Build-Out Log — building the world to match `Crafted Realms Map.png`

Every `/loop` pass logs ONE entry here. Newest at the top. The bible map
(`Maps/Crafted Realms Map.png`) is the layout target; `CLAUDE.md` art canon (cozy 2007/OSRS
low-poly flat-shaded — **not** hyper-real) is the render target. The map dictates *where and
what*; it does **not** change *how it's rendered*.

Scoring rule: treat the previous iteration as **100**. A pass is only kept if it lands at
**120+** — an *obvious* improvement in geometry/detail, lighting/materials, or atmosphere/life.
If it doesn't clearly beat the prior shot, **revert** and log why.

Screenshots live in `Maps/iterations/` as `passNNN_<target>_<before|after>.png`.

---

## Pass template (copy for each entry)

### Pass NNN — <target region/landmark> — <YYYY-MM-DD> — KEPT / REVERTED
- **Target:** which part of the map this pass built toward (e.g. "Wilderness Ditch + Scarlands N band").
- **Changed:** files touched, what was added/adjusted.
- **Before → after:** `iterations/passNNN_<target>_before.png` → `..._after.png`.
- **Gemini match/quality:** before X/10 → after Y/10 (`tools/gemini_vision.js`), vs bible map.
- **Verdict:** obvious improvement? kept because… / reverted because…
- **Next:** the target for the following pass.

---

<!-- Newest entries below this line, newest first -->
