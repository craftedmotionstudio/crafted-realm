# Missing-tool recovery — planner ready, service pending

`src/holm_tool_recovery.js` and `tools/test_holm_tool_recovery.js` pass 10/10 checks against the current
Holm curriculum. This is a pure-data proposal only and is not yet loaded into the live game.

API: `HolmToolRecovery.plan(inv,equip,bank,ITEMS,progress)`, where progress is a required lesson ID or
`{lessonId,complete}`. Load after HolmTutorialFlow and HolmRewardPlan. Success returns the atomic planner's
inventory/grants plus `unlockedTools`, `bankOwned` and `missingTools`; failure exposes no partially granted inventory.
The planner respects every equipped slot and bank quantities, including multiple nonstackable banked tools.

Next main integration:

- Existing provision rack in Guide Hall (`kind:holm_provisions`) currently only prints scenery text.
  Bind a recover-tools service to it using its existing inside guard at local `(9.6,-0.1)`.
- Missing bank-owned tools should be reported for withdrawal, never cloned or silently removed from the bank.
- Commit recovery inventory through a save with rollback on failure, using the departure transaction pattern.
- Fix initial station grants in `tutorial_holm.js`: current closure flags are set before delivery. At minimum
  do not mark successful before the whole kit fits, and direct players with full inventories to the provision rack.
- Browser golden path: unlock survival kit via actual chart, lose net via an ordinary item action or named
  disposable fixture, walk to the rack, recover exactly once; test bank-held and full-pack cases and reload.

No tool-recovery completion is claimed until service wiring and real-player acceptance pass.
