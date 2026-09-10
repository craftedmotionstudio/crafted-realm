#!/usr/bin/env node
/*
 * test_waterworks_u4_contract.js — deterministic headless test for the U4
 * pure-data transaction contract. No network, no timers, no randomness.
 *
 *   node tools/test_waterworks_u4_contract.js
 *
 * Writes scratchpad/workyard_waterworks_u4_v1/contract_test_result.json and
 * exits 1 on any failure.
 */
const fs = require("fs");
const path = require("path");
const M = require("../src/waterworks_u4_contract.js");

const C = M.WATERWORKS_U4_CONTRACT;
const results = [];
let failed = 0;

function check(label, condition) {
  results.push({ label, passed: !!condition });
  if (!condition) {
    failed += 1;
    console.error("FAIL", label);
  } else {
    console.log("ok  ", label);
  }
}

function inv(items) { return { items: items.slice() }; }

// 1. Happy path: begin -> lower -> contact -> lift -> commit -> settle.
let inventory = inv(["bucket", "hatchet"]);
let begin = M.u4BeginOperation(M.u4CreateSave(), "op-1", inventory);
check("begin succeeds with an empty bucket", begin.ok && begin.save.active.state === "lowering");
let s = M.u4Advance(begin.save, "WATER_CONTACT", inventory);
check("lowering reaches water_contact", s.save.active.state === "water_contact" && s.effects.length === 0);
s = M.u4Advance(s.save, "LIFT", inventory);
check("water_contact reaches lifting", s.save.active.state === "lifting");
s = M.u4Advance(s.save, "LIFT_COMPLETE", inventory);
check("lift completion commits exactly one transaction",
      s.effects.length === 1 && s.effects[0].type === "transaction");
check("transaction transforms bucket into bucket_water",
      s.effects[0].remove === "bucket" && s.effects[0].add === "bucket_water");
check("commit lands in settling with the opId recorded",
      s.save.active.state === "settling" && s.save.appliedOps.indexOf("op-1") >= 0);
s = M.u4Advance(s.save, "SETTLED", inventory);
check("settling returns to idle and clears the active operation",
      s.save.active === null && s.effects.length === 0);
const committedSave = s.save;

// 2. Save-safe duplicate prevention: replaying the same opId never pays twice.
let replay = M.u4BeginOperation(committedSave, "op-1", inventory);
check("an already-rewarded opId cannot begin again", !replay.ok);
let replaySave = { appliedOps: committedSave.appliedOps.slice(),
                   active: { opId: "op-1", state: "lifting" } };
s = M.u4Advance(replaySave, "LIFT_COMPLETE", inventory);
check("a reloaded mid-lift replay of a rewarded opId emits no second transaction",
      s.effects.length === 0 && s.save.active.state === "settling");

// 3. Interruption in every pre-commit state changes nothing.
for (const stop of ["lowering", "water_contact", "lifting"]) {
  let save = { appliedOps: [], active: { opId: "op-x-" + stop, state: stop } };
  let out = M.u4Advance(save, "INTERRUPT", inventory);
  check("interrupt during " + stop + " resets without any transaction",
        out.save.active === null &&
        out.effects.length === 1 && out.effects[0].type === "reset" &&
        out.save.appliedOps.length === 0);
}

// 4. Begin requires the empty bucket.
let noBucket = M.u4BeginOperation(M.u4CreateSave(), "op-2", inv(["hatchet"]));
check("begin refuses without an empty bucket", !noBucket.ok);

// 5. Begin refuses while another operation is active.
let busy = M.u4BeginOperation({ appliedOps: [], active: { opId: "op-3", state: "lowering" } },
                              "op-4", inventory);
check("begin refuses while an operation is active", !busy.ok);

// 6. No reward when the inventory can no longer accept the result.
let vanished = { appliedOps: [], active: { opId: "op-5", state: "lifting" } };
s = M.u4Advance(vanished, "LIFT_COMPLETE", inv(["hatchet"]));
check("no transaction when the bucket is gone at commit time",
      s.effects.length === 1 && s.effects[0].type === "message" &&
      s.save.active === null && s.save.appliedOps.length === 0);

// 7. Invalid events never transition or emit.
let mid = { appliedOps: [], active: { opId: "op-6", state: "lowering" } };
s = M.u4Advance(mid, "SETTLED", inventory);
check("an out-of-order event is ignored",
      s.save.active.state === "lowering" && s.effects.length === 0);
s = M.u4Advance(M.u4CreateSave(), "OPERATE", inventory);
check("advancing with no active operation is a no-op", s.effects.length === 0);

// 8. The applied-ops ledger stays bounded.
let crowded = { appliedOps: [], active: null };
for (let i = 0; i < 40; i++) {
  let b = M.u4BeginOperation(crowded, "bulk-" + i, inventory);
  let a = M.u4Advance(b.save, "WATER_CONTACT", inventory);
  a = M.u4Advance(a.save, "LIFT", inventory);
  a = M.u4Advance(a.save, "LIFT_COMPLETE", inventory);
  a = M.u4Advance(a.save, "SETTLED", inventory);
  crowded = a.save;
}
check("applied-ops ledger is capped at " + C.maxRememberedOps,
      crowded.appliedOps.length === C.maxRememberedOps &&
      crowded.appliedOps[C.maxRememberedOps - 1] === "bulk-39");

// 9. Determinism: identical runs produce identical serialized state.
function run() {
  let save = M.u4CreateSave();
  let b = M.u4BeginOperation(save, "det-1", inventory);
  let a = M.u4Advance(b.save, "WATER_CONTACT", inventory);
  a = M.u4Advance(a.save, "LIFT", inventory);
  a = M.u4Advance(a.save, "LIFT_COMPLETE", inventory);
  return JSON.stringify(M.u4Advance(a.save, "SETTLED", inventory));
}
check("two identical runs serialize identically", run() === run());

// 10. Inputs are never mutated.
let frozenSave = M.u4CreateSave();
let frozenInv = inv(["bucket"]);
const savedJson = JSON.stringify(frozenSave), invJson = JSON.stringify(frozenInv);
M.u4BeginOperation(frozenSave, "op-7", frozenInv);
check("begin never mutates its inputs",
      JSON.stringify(frozenSave) === savedJson && JSON.stringify(frozenInv) === invJson);

// 11. Animation-event metadata matches the exported GLB contract.
check("clip timing metadata is locked",
      C.clips.lower.seconds === 2.0 && C.clips.lower.waterContactNormalized === 0.8542 &&
      C.clips.lift.seconds === 2.3333 && C.clips.lift.commitNormalized === 0.9286 &&
      C.clips.idle.seconds === 3.0 &&
      C.sockets.waterContact === "water_contact_socket" &&
      C.sockets.operator === "pulley_operator_socket");

const summary = {
  schemaVersion: 1,
  contract: "src/waterworks_u4_contract.js",
  passed: failed === 0,
  total: results.length,
  failures: failed,
  results,
};
const out = path.join(__dirname, "..", "scratchpad", "workyard_waterworks_u4_v1",
                      "contract_test_result.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(summary, null, 2));
console.log((failed === 0 ? "PASS" : "FAIL") + " " + (results.length - failed) +
            "/" + results.length + " -> " + out);
process.exit(failed === 0 ? 0 : 1);
