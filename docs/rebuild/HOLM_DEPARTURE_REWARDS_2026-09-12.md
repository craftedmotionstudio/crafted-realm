# Departure reward integrity — implementation and QA handoff

Status: implemented; deterministic gates pass; real full-inventory ferry/reload acceptance remains open.

## Live focused ferry check (continuation)

On disposable profile `departure-atomic-20260912`, used the real Skip Tutorial control to isolate the reward
test (not full curriculum evidence), walked from Guide Hall to Departure Dock by minimap clicks without teleport,
and injected a clearly test-only full inventory of 24 bread. Clicking the actual boat walked to `(207.5,151.5)`
and refused delivery with “Free 17 inventory slots at Holm Bank.” Inventory remained 24 bread, claim false,
provider Tutor's Holm, no errors. Walked to Holm Bank, clicked the visible teller, deposited exactly 17 bread
using bank inventory slot clicks, closed the bank and walked back to the dock.

The next boat click delivered all rewards and crossed to `veyhollow-commons-v2`. Readback: 25 coins, 10 bread
(7 retained + 3 awarded), 25 air runes, 25 mind runes, 25 arrows, shield, leather body, bow, all five tools,
bronze dagger and 3 home tabs. Bank retained exactly 17 bread; claim true; zero uncaught errors.
Reload/Continue verification is the remaining focused acceptance step.

The previous code marked the departure pack claimed before issuing items and ignored partial/full-inventory
failures. The ferry then sailed regardless. The new path plans the complete inventory, commits inventory and
claim marker in one save, and crosses only after success. Failed capacity or persistence leaves the original
inventory and marker intact; retrying is safe. Existing saved claimed packs are respected to avoid duplicate rewards.
Historical saves already affected by partial loss cannot be inferred/repaired automatically without a delivery ledger.

Files changed this pass:

- `src/holm_reward_plan.js`: pure atomic inventory planner, stack/individual slot support and equipped ownership.
- `src/holm_departure_rewards.js`: full welcome-pack transaction and save rollback, exact missing-slot message.
- `src/tutorial_holm.js`: old lossy departure grant removed; station-tool grants remain a separate open repair.
- `src/holm_departure.js`: stop crossing if pack delivery is refused.
- `index.html`: script order and cache versions.
- `tools/test_holm_reward_plan.js`, `tools/test_holm_departure_rewards.js`: 11 planner and eight integration locks.

Both deterministic suites and the full World V2 suite pass. Integration fixtures execute the actual reward and
ferry modules, including save refusal/throw, full and partially full inventories, successful saved delivery,
duplicate board, equipped shield/body armor and restored claimed state. They do not replace real-pointer ferry QA.

Live Chrome smoke on `?smoke=1&qaProfile=departure-atomic-20260912` passes 105/105, six streamed boundaries,
exact save/load and zero game errors (boot 2.804 seconds). The window was marked occluded, so this is **not** a
foreground FPS acceptance. Retained Chrome tab 372749555 (browser 2) is the disposable continuation session.

Next acceptance: use a disposable save, complete/continue the real route, fill the inventory before boarding,
verify refusal and unchanged save, free the reported space through bank/drop controls, board, inspect every
pack item, reload and verify no duplicate. Run final foreground smoke. No teleport as route evidence.

Goal turn classification: progress — runtime behavior changed and 19 targeted assertions now pass. The full
island goal stays active; buildings, characters, NPC lifecycle/lessons, tool recovery and final visual QA remain.

### Mainland Continue defect repaired (2026-09-12)
The focused pointer ferry retry exposed a separate boot bug: `world_v2_boot_select.js` tested `global.Persist`, although Persist is a lexical global, and hardcoded the ordinary save key. It therefore always selected Holm, then relocated the mainland position. Fixed the lexical lookup and profile key; moved QAProfile before provider selection. `tools/test_world_boot_save.js` passes 7/7 (lexical reproduction, normal/QA mainland, new/old/malformed/unknown saves, script order). World V2 locks pass.

Real-input repeat: walked Guide Hall arrival to Departure Dock, clicked skiff with already-claimed pack, verified mainland provider and saved ferry landmark, hard reloaded, clicked Continue and Enter. Provider remains `veyhollow-commons-v2`, position [0,18], claim true; inventory unchanged (25 coins, 10 bread, 25 air/mind/arrows, one of each keep-one tool/gear, 3 home tabs), bank remains 17 bread, zero uncaught errors. Owner save untouched: disposable `departure-atomic-20260912` profile retains the explicitly seeded bread fixture. This accepts focused ferry reward/reload behavior, not the full lesson/NPC/art goal.

### Fast Continue and final gate follow-up
The first mainland smoke caught an item-registration race: `home_tab` did not exist until an 1800ms timer, so fast Continue failed in inventory rendering (`undefined.stack`). Its definition now registers synchronously; the interaction hook attempts immediate boot and retains a fallback timer only if dependencies are unavailable. `tools/test_teleport_boot.js` passes with UI/Admin absent, and content validation passes.

Mainland smoke after repair: login PASS, structural 105/105, real out/back PASS, save/load exact and lossless, 60 FPS / worst 46ms / 76 draws / 5,332 triangles, zero errors. Overall FAIL remains because stream gate requires object release/cache activity but this mainland route has 0 live/expected streamed objects. Do not describe the overall mainland gate as passed. Island smoke runs separately next.

Follow-up risk to test: creating a new adventurer after booting an existing mainland save now requires an explicit Holm provider reset (login Begin currently changes the character name only). No owner save should be erased for this QA; use disposable profile.

Final island foreground smoke PASS: fresh isolated `holm-boot-20260912`; boot997ms, structural105/105, real walk3601ms, six streaming boundaries/save-load exact/lossless, 60FPS/worst26ms/149draws/34902tris, ticks7, zero errors. Full goal remains active; next integrate tool recovery and repair original grants, test new-character provider reset, then resume modeled NPC/combat and art acceptance.
