# New Adventurer reset audit — 2026-09-12

Read-only source audit. No owner save was read, changed, or deleted; no browser run was performed. This is an implementation recommendation, not acceptance evidence.

## Base checks and defect

Confirmed `src/world_v2_boot_select.js:9–12` reads lexical `Persist.store`, uses `QAProfile.key`, and activates the saved provider before world boot. Confirmed `src/login_overhaul.js` exists and owns the active welcome handlers.

The new-adventurer confirmation at `src/login_overhaul.js:64` calls `SaveGame.reset()` and immediately opens creation. `src/ui_save.js:180–183` only deletes the save key. Neither resets runtime objects nor the world provider.

This fails even without Continue: boot already selected and populated the mainland from save metadata. `src/game5_main.js:896–898` captures the provider and label in lexical constants, and `bootSteps()` builds terrain, population, collision, shaders, and player against that provider. Deleting the key cannot reconstruct those systems. `btn-begin` only sets the name/new-character flag and applies appearance (`src/login_overhaul.js:85–92`). The Play handler uses the captured provider (`src/game5_main.js:1020–1040`).

Continue then Back then New adds a second defect: `SaveGame.load()` has already restored the previous adventurer into live objects. `Player.init()` is not a reset: it initializes XP and adds starting coins, but does not clear inventory, bank, equipment, quests, or extended state (`src/game3_systems.js:73–91`). Calling it again would preserve or add to old state.

## Recommended minimal implementation

Add a small explicit `NewAdventurerReset` service in a NEW module. Route the existing confirmed-new handler to `NewAdventurerReset.confirm()` and return immediately; do not execute the old inline `SaveGame.reset(); setStage(...)` sequence afterward. Load the module after `login_overhaul.js` (or any later point before clicks become available). Keep initial New-without-save and cancel behavior unchanged.

Use a full document reload after verified deletion. This reruns the ordinary no-save provider selection and ordinary initial state construction, including closure-owned grant guards. Do not swap `CRWorldMode` alone, call `Admin.tp`, use `Planes.climbTo`, invoke `WorldTravel.go`, or manually enumerate a partial Player reset. The existing boot is the state-reset implementation.

Suggested service sequence:

1. Require the existing explicit confirmation path, visible welcome screen, and `running === false`. Refuse use from active gameplay. Never broaden this service into a generic hidden save wipe.
2. Resolve only `SaveGame.KEY`, verify it agrees with `QAProfile.key` when that API exists, and require `SaveGame.available()`. Never hardcode `motionscape_save` in this service.
3. Optionally write a tab-session continuation marker keyed by the exact save key before deletion. Store only intent/version/key, never the old character. Verify marker write/read. Marker storage failure must either stop with an actionable message or take an explicitly implemented reload-to-chooser fallback; never pretend the create stage will resume.
4. Delete the selected key through `Persist.store.del(key)` and read back absence (`get(key) === null` and `has(key) === false`). A thrown operation or surviving key must stop, clear the pending marker, preserve the confirmation UI, and report that reset did not succeed. `SaveGame.reset()` currently returns no outcome, so it is insufficient as the success signal.
5. Disable the confirmation action to prevent double dispatch, block Continue/Begin/Play during the reload interval, and immediately call `location.reload()` without altering query parameters. The same disposable `qaProfile` must survive.
6. On the next boot, consume a matching continuation marker only if the corresponding save is absent. Wait until the welcome screen/world is ready, then call `LoginOverhaul.refreshSaveState()` and `LoginOverhaul.setStage('login-create','char-name')`. Remove the marker exactly once. If a save exists, consume/discard the marker without deleting anything or entering creation. A stale marker must never erase a new save.

A reload-to-chooser variant needs no session marker and is smaller: after reload the user clicks New Adventurer again. Prefer preserving the existing create-stage continuity if implementing the marker cleanly; it is not necessary for data correctness.

The storage adapter currently swallows native localStorage errors in `get`, `has`, and `del` (`src/persist.js`). Readback is the strongest observable contract that interface offers, not a guarantee against a backend that falsely reports absence. VM tests must exercise throwing and honest refusal adapters. Do not silently claim deletion from the void return of `del`.

## State that must become fresh

The reload recommendation clears the whole document, rather than requiring each item below to have a bespoke reset assignment.

| State family | Source contract / expected fresh result |
|---|---|
| World | No selected-key save means `tutors-holm-v2`; boot builds its default arrival landmark, terrain, resident objects, collision, planes and warmup normally. |
| Player core | `game3_systems.js:73–91`: fresh XP table initialization, Hitpoints XP at level 10, hp/maxHp 10, 24-slot inventory containing only five starting coins, empty bank, empty equipment/quests. |
| Player extended state | Clear previously loaded cast mode/spell, attack-style overrides, special state, energy/run state, prayer/active prayers, targets/actions/movement/item selection; use module defaults rather than copying saved values. See `game3_systems.js:89–90,261–263,308`. |
| Tutorial | Current `HolmTutorialFlow.runtimeSteps()` and curriculum version; step zero, not complete, no optional completions, departure/ration claims false or absent. Recreate closure-local grants in `tutorial_holm.js` and `tutorial_ext.js`, not just public flags. |
| Character | Fresh `CharCfg` defaults (`game4_ui.js:1561`) before entering the new name; the creator opens via `_new` on Play. Old gender/hair/colors must not leak from Continue. |
| Restored auxiliaries | Clear old `Quest.tracked`, music unlock progression, Workyard waterworks/fishing restored state, save-load status, guidance and transient overlays by normal module construction. `ui_save.js:68–105` shows the restore surface. |
| Preferences | Keep unrelated accessibility/music settings and other save/profile keys. Reset exactly the selected adventurer key. |

`SaveGame.tick` runs from active update (`game5_main.js:731`); render/update guards require running (`:815`). Restricting the service to the welcome flow avoids normal autosave racing deletion. A continued character has been loaded but has not started simulation when the user backs out of the Play stage. Avoid invoking this service from arbitrary in-game UI, where delayed saves also exist.

## Meaningful acceptance tests

Headless/VM contracts:

- A valid mainland save at an isolated QA key is deleted only after explicit confirmation; reload called exactly once; unrelated owner and second-QA keys remain byte-identical.
- A refused deletion (key still present), thrown deletion, unavailable store, mismatched key, or failed required marker write produces no reload/no create-stage success.
- Cancel changes neither memory nor storage. Active-game calls refuse. Double confirmation does not dispatch twice.
- Marker consumption is scoped to the current key and only an absent save; stale/mismatched markers cannot skip an existing save into creation or delete anything. Reload preserves the URL/profile.
- Normal continuation remains unchanged; a mainland save still boots the mainland and restores existing progression.

Real-browser tests, using only disposable `?qaProfile=<id>`:

1. Seed a representative mainland fixture in the disposable profile, load the normal login, click New → Cancel, and prove the save survives.
2. Click New → confirm → create → name → Begin → Play. Verify normal Holm arrival, `study_route`, fresh HP/XP/inventory/bank/equipment, and character design. Walk to and click the real chart to advance; no teleport as acceptance proof.
3. Repeat with Continue → Back → New → confirm to prove already-loaded XP, equipment, bank, tutorial completion/claims, appearance, and station state do not survive.
4. Reload the new character after a real save; Continue must restore the new Holm progression, not the old mainland character.
5. Confirm a storage-failure fixture leaves the old save available and does not announce a new adventurer.
6. Finish with the foreground smoke gate and console-error sweep. Existing owner saves remain untouched throughout.

No implementation files were changed by this audit.
