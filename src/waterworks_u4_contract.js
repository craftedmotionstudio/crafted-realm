/*
 * waterworks_u4_contract.js — pure-data transaction/state-machine contract for
 * the Workyard U4 bucket-pulley lesson.
 *
 * NOT RUNTIME-INSTALLED: this file is intentionally absent from index.html.
 * Codex wires it during Gate F integration. It has no dependencies, no Date,
 * no randomness, and never mutates its inputs — every function returns fresh
 * state so it is save-safe and headlessly testable (tools/test_waterworks_u4_contract.js).
 *
 * Rules encoded (ledger U4.05/U4.06):
 *  - consumes one `bucket`, produces one `bucket_water` (in-place swap);
 *  - the reward commits exactly once, only when the lift completes;
 *  - interruption in any pre-commit state changes nothing;
 *  - no reward if the inventory cannot accept the result (bucket retained);
 *  - operation ids are recorded so a save/reload replay can never pay twice.
 */
var WATERWORKS_U4_CONTRACT = {
  version: 1,
  assetId: "workyard_waterworks_u4_v1",
  item: { consumes: "bucket", produces: "bucket_water" },
  sockets: { operator: "pulley_operator_socket", waterContact: "water_contact_socket" },
  clips: {
    idle: { name: "Pulley_Idle", seconds: 3.0 },
    lower: { name: "Pulley_Lower", seconds: 2.0, waterContactNormalized: 0.8542 },
    lift: { name: "Pulley_Lift", seconds: 2.3333, commitNormalized: 0.9286 }
  },
  states: ["idle", "lowering", "water_contact", "lifting", "settling"],
  events: ["OPERATE", "WATER_CONTACT", "LIFT", "LIFT_COMPLETE", "SETTLED", "INTERRUPT"],
  transitions: {
    idle: { OPERATE: "lowering" },
    lowering: { WATER_CONTACT: "water_contact", INTERRUPT: "idle" },
    water_contact: { LIFT: "lifting", INTERRUPT: "idle" },
    lifting: { LIFT_COMPLETE: "settling", INTERRUPT: "idle" },
    settling: { SETTLED: "idle" }
  },
  commitEvent: "LIFT_COMPLETE",
  maxRememberedOps: 32
};

function u4CreateSave() {
  return { appliedOps: [], active: null };
}

function u4HasItem(inventory, id) {
  return inventory && inventory.items ? inventory.items.indexOf(id) >= 0 : false;
}

function u4CanAcceptResult(inventory) {
  // The reward replaces the consumed bucket in its own slot, so acceptance
  // means the bucket is still present to swap. A missing bucket means the
  // inventory can no longer accept the result and nothing may change.
  return u4HasItem(inventory, WATERWORKS_U4_CONTRACT.item.consumes);
}

function u4BeginOperation(save, opId, inventory) {
  if (save.active) {
    return { ok: false, reason: "operation already active", save: save };
  }
  if (save.appliedOps.indexOf(opId) >= 0) {
    return { ok: false, reason: "operation id already rewarded", save: save };
  }
  if (!u4HasItem(inventory, WATERWORKS_U4_CONTRACT.item.consumes)) {
    return { ok: false, reason: "requires one empty bucket", save: save };
  }
  return {
    ok: true,
    save: { appliedOps: save.appliedOps.slice(),
            active: { opId: opId, state: "lowering" } }
  };
}

function u4Advance(save, event, inventory) {
  var C = WATERWORKS_U4_CONTRACT;
  if (!save.active) {
    return { save: save, effects: [] };
  }
  var state = save.active.state;
  var next = (C.transitions[state] || {})[event];
  if (!next) {
    return { save: save, effects: [] };
  }
  if (event === "INTERRUPT") {
    // Pre-commit walk-away: the pulley resets, the inventory never changes.
    return { save: { appliedOps: save.appliedOps.slice(), active: null },
             effects: [{ type: "reset", opId: save.active.opId }] };
  }
  if (event === C.commitEvent) {
    var opId = save.active.opId;
    if (save.appliedOps.indexOf(opId) >= 0) {
      // Save/reload replay of an already-rewarded operation: settle silently.
      return { save: { appliedOps: save.appliedOps.slice(),
                       active: { opId: opId, state: next } },
               effects: [] };
    }
    if (!u4CanAcceptResult(inventory)) {
      return { save: { appliedOps: save.appliedOps.slice(), active: null },
               effects: [{ type: "message",
                           text: "You have nothing to carry the water in." }] };
    }
    var applied = save.appliedOps.concat([opId]);
    if (applied.length > C.maxRememberedOps) {
      applied = applied.slice(applied.length - C.maxRememberedOps);
    }
    return { save: { appliedOps: applied, active: { opId: opId, state: next } },
             effects: [{ type: "transaction", remove: C.item.consumes,
                         add: C.item.produces, opId: opId }] };
  }
  if (event === "SETTLED") {
    return { save: { appliedOps: save.appliedOps.slice(), active: null },
             effects: [] };
  }
  return { save: { appliedOps: save.appliedOps.slice(),
                   active: { opId: save.active.opId, state: next } },
           effects: [] };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    WATERWORKS_U4_CONTRACT: WATERWORKS_U4_CONTRACT,
    u4CreateSave: u4CreateSave,
    u4BeginOperation: u4BeginOperation,
    u4Advance: u4Advance,
    u4CanAcceptResult: u4CanAcceptResult
  };
}
