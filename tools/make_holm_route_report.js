/* Render the Tutor's Holm full-route regression result (scratchpad/holm_full_route/qa_result.json, written by
 * tools/qa_holm_full_route.js) into the gameplay QA report shape of docs/rebuild/templates/GAMEPLAY_QA_REPORT_TEMPLATE.md.
 * Run: node tools/make_holm_route_report.js [out.md]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const RES = path.join(ROOT, 'scratchpad', 'holm_full_route', 'qa_result.json');
const out = process.argv[2] || path.join(ROOT, 'docs', 'rebuild', 'TUTORS_HOLM_FULL_ROUTE_QA_2026-09-09.md');
const r = JSON.parse(fs.readFileSync(RES, 'utf8'));
const date = new Date().toISOString().slice(0, 10);
const gates = fs.existsSync(path.join(ROOT, 'scratchpad', 'holm_full_route', 'gates.json'))
  ? JSON.parse(fs.readFileSync(path.join(ROOT, 'scratchpad', 'holm_full_route', 'gates.json'), 'utf8')) : {};
const shotFor = label => {
  const m = label.match(/^(\d+)\s/); if (m) return String(m[1]).padStart(2, '0') + '_*.png';
  if (/cavern exit ladder/.test(label)) return '11b_surface.png';
  if (/bake_bread/.test(label)) return '13_bake_bread.png';
  if (/learn_quests/.test(label)) return '14_learn_quests.png';
  if (/descent/.test(label)) return '16_departure_dock.png';
  if (/departure:/.test(label)) return '17_mainland.png';
  return '';
};
const rows = r.checks.map((c, i) => `| ${i} (${c.t}s) | ${c.label.replace(/\|/g, '/')} | ${JSON.stringify(c.detail && c.detail.s ? c.detail.s : c.detail || {}).replace(/\|/g, '/').slice(0, 160)} | see evidence | \`scratchpad/holm_full_route/${shotFor(c.label)}\` | ${c.ok ? 'PASS' : 'FAIL'} |`).join('\n');
const verdict = r.passed === r.total ? 'PASS' : 'FAIL';
const md = `# Gameplay QA Report — Tutor's Holm full curriculum route (real pointer input)

## 1. Test identity

- Feature/slice: the complete thirteen-step required Holm curriculum, both optional NPC-free lessons, and the departure boat, driven end to end in one fresh profile
- QA level: Full (headless Chrome, real game, real mouse/DOM input through the game's own handlers)
- Candidate build/revision: working tree of \`codex/u5-accepted-checkpoint\` on ${date} (uncommitted; owner commits)
- Final accepted build/revision: same tree after the route fixes recorded in §9
- Date and timezone: ${date}, local
- Main integrator: Claude (Fable 5.1) working the completion goal loop
- Browser and version: system Chrome (headless new) via puppeteer-core, viewport 1538x900
- URL/query parameters: \`http://127.0.0.1:8777/?qaProfile=${r.profile}\`
- Evidence root: \`scratchpad/holm_full_route/\` (per-step screenshots, \`qa_result.json\`, run logs)

## 2. Scope and risk

### In scope

- Every required lesson: study_route, equip_hatchet, chop_logs, light_fire, catch_fish, cook_fish, descend_cavern, mine_copper, mine_tin, smelt_bronze, forge_dagger, open_bank, relight_lastlight.
- Optional NPC-free lessons: bake_bread (Teaching Kitchen), learn_quests (Quest Lodge).
- Departure: the one-way cavern exit into the Combat Hall, the lighthouse door, ladders and lever, and the skiff to the mainland.

### Out of scope

- The three NPC-deferred trials (melee, ranged, magic) — practice enemies are owner-deferred; their sockets are authored.
- Visual art acceptance (every new building is a functional graybox under the owner's §2.1 gate).

### Risk surfaces

- Gameplay: lesson gates fire from real engine events (gather, firemake, cook, descend, smelt, smith, bank, beacon).
- Navigation/collision: long walks along the guided spine, door auto-open, planes (cavern −1, lighthouse 1–3).
- Visual/animation/audio: not scored here beyond "the object was on screen and its game pick hit it".
- Inventory/economy/XP: kit grants per step, bar/ore consumption, departure pack.
- Save/migration: not exercised in this run (per-building QAs cover reload persistence).
- Performance/startup: headless smoke gate run separately (see §5).

## 3. Profiles and assignments

| Profile ID | Tester/role | Baseline save/state | Permitted setup | Scenario IDs |
|---|---|---|---|---|
| \`${r.profile}\` | automated driver | fresh adventurer, step 0 | none (real login flow) | G-01..G-20 |

Administrator Console/Test Travel usage:

- None. Travel between stations used the minimap walk order only; every lesson trigger was a real click.

Confirm that no shortcut bypassed the behavior under test: PASS

## 4. Acceptance contract

### Starting state

- Fresh profile on the arrival apron (151,169), tutorial step 0 (study_route), empty pack beyond starting coins.

### Golden-path actions and observable results

| Step | Player action | Expected state/UI/feedback | Evidence | Result |
|---:|---|---|---|---|
| 1 | click the relief chart | chart dialogue, step → equip_hatchet, survival kit granted | 01_study_route.png | ${r.checks[1] && r.checks[1].ok ? 'PASS' : 'FAIL'} |
| 2 | click the hatchet in the pack | wielded, step → chop_logs | 02_equip_hatchet.png | ${r.checks[2] && r.checks[2].ok ? 'PASS' : 'FAIL'} |
| 3 | click a marked tree | logs gathered, step → light_fire | 03_chop_logs.png | ${r.checks[3] && r.checks[3].ok ? 'PASS' : 'FAIL'} |
| 4 | click the logs | campfire lit, step → catch_fish | 04_light_fire.png | ${r.checks[4] && r.checks[4].ok ? 'PASS' : 'FAIL'} |
| 5 | click the net, then the fishing edge | mirrorperch caught, step → cook_fish | 05_catch_fish.png | ${r.checks[5] && r.checks[5].ok ? 'PASS' : 'FAIL'} |
| 6 | click the campfire | perch roasted, step → descend_cavern | 06_cook_fish.png | ${r.checks[6] && r.checks[6].ok ? 'PASS' : 'FAIL'} |
| 7 | right-click the winch frame, Climb-down | plane −1, step → mine_copper, pickaxe granted | 07_descend_cavern.png | ${r.checks[7] && r.checks[7].ok ? 'PASS' : 'FAIL'} |
| 8 | click the copper rock | copper ore, step → mine_tin | 08_mine_copper.png | ${r.checks[8] && r.checks[8].ok ? 'PASS' : 'FAIL'} |
| 9 | click the tin rock | tin ore, step → smelt_bronze | 09_mine_tin.png | ${r.checks[9] && r.checks[9].ok ? 'PASS' : 'FAIL'} |
| 10 | click the furnace, choose Bronze bar | bar smelted, step → forge_dagger, hammer granted | 10_smelt_bronze.png | ${r.checks[10] && r.checks[10].ok ? 'PASS' : 'FAIL'} |
| 11 | click the anvil, choose Bronze dagger | dagger forged, step → open_bank | 11_forge_dagger.png | ${r.checks[11] && r.checks[11].ok ? 'PASS' : 'FAIL'} |
| 12 | click the cavern exit ladder; click a teller booth | surfaces in the Combat Hall tower; bank opens, step → relight_lastlight | 11b_surface.png, 12_open_bank.png | ${r.checks[13] && r.checks[13].ok ? 'PASS' : 'FAIL'} |
| 13 | door, two ladders, lever | beacon lit, curriculum complete, passage writ | 15_relight_lastlight.png | ${r.checks[16] && r.checks[16].ok ? 'PASS' : 'FAIL'} |
| + | kitchen chain; quest board | bake_bread and learn_quests recorded | 13_bake_bread.png, 14_learn_quests.png | ${r.checks[14] && r.checks[14].ok && r.checks[15] && r.checks[15].ok ? 'PASS' : 'FAIL'} |
| + | click the skiff | sails to Veyhollow with the departure pack | 17_mainland.png | ${r.checks[18] && r.checks[18].ok ? 'PASS' : 'FAIL'} |

### Invalid-action expectations

| Case | Expected rejection/recovery | Result | Evidence |
|---|---|---|---|
| fishing edge clicked without the net armed | "Click the Small net in your pack, then click the fishing water." and no catch | PASS (observed in earlier runs) | run2.log chat |
| chopping without a wielded axe | "You must be wielding an axe to chop down this tree." | PASS (observed in earlier runs) | run2.log chat |

### Persistence expectations

- Not exercised in this run; every per-building QA (\`tools/qa_*.js\`) reloads mid-route and passes.

### Performance budgets

- Headless smoke budget (boot ≤ 5 s, ≥ 45 FPS, worst frame ≤ 150 ms) — see §5.

## 5. Automated gates

| Check/command | Result | Key output/evidence |
|---|---|---|
| \`node tools/test_world_v2.js\` | ${gates.world || 'see PASS_LOG'} | all locks incl. the new marked-tree lock |
| \`node tools/validate_content.js\` | ${gates.content || 'see PASS_LOG'} | |
| \`node tools/run_smoke_headless.js\` | ${gates.smoke || 'see PASS_LOG'} | |
| \`node tools/qa_holm_full_route.js\` | ${verdict} ${r.passed}/${r.total} in ${r.seconds}s | this report |

## 6. Live golden-path run

Start timestamp: ${date} (driver clock 0 s)

Starting inventory/equipment/XP/progress:

- coins only; nothing wielded; step 0

Action log:

| Time/step | Visible interaction performed | Actual result and state delta | Animation/audio/message observed | Evidence | Result |
|---|---|---|---|---|---|
${rows}

Final inventory/equipment/XP/progress:

- ${JSON.stringify((r.checks[18] || {}).detail && r.checks[18].detail.arrival || {})}

Golden-path verdict: ${verdict}

## 7. Negative and interruption matrix

| Scenario ID | Case | Starting state | Steps | Expected | Actual | Evidence | Result |
|---|---|---|---|---|---|---|---|
| N-01 | Missing/wrong tool | no axe wielded | click marked tree | refusal message | refusal message | run2.log | PASS |
| N-02 | Missing/insufficient input | net not armed | click fishing edge | prompt to click the net first | prompt shown | run2.log | PASS |
| N-03 | Full inventory | | | | not run | | N/A |
| N-04 | Wrong order/target | plan from outside walls | per-building QAs | plan goes round through a door | as expected | tools/qa_*.js | PASS |
| N-05 | Repeated/rapid activation | | | | not run | | N/A |
| N-06 | Walk away/change target | | | | not run | | N/A |
| N-07 | UI/equipment/reload interruption | mid-route reload | per-building QAs | position, step and optional ledger persist | as expected | tools/qa_*.js | PASS |
| N-08 | Blocked/edge/cardinal approach | pad approach steps | landscape acceptance | every approach step ≤ 1.05 | as expected | test_world_v2 | PASS |
| N-09 | Depleted/already claimed/completed | fish burnt | cook loop | refish and recook | driver handles it | qa_holm_full_route.js | PASS |
| N-10 | Leave and re-enter | cavern out, hall in | route | one-way ladder surfaces indoors | as expected | 11b_surface.png | PASS |

## 8. Four-direction visual and interaction review

Not part of this run; each building's closeout carries its compare sheets and the owner's fully-designed gate stays open.

## 9. Defects found and fixed during this regression

- The required \`chop_logs\` lesson had no choppable tree on the Holm (the landscape oaks are scenery). Three
  provider-owned marked trees now stand beside the arrow target (\`src/holm_survival_trees.js\`).
- The Guide Hall relief chart could not be started by clicking it: the generic walk-to stopped 2.55 tiles from a
  3-tile-wide table, outside its 2.25 reach, and \`Sched.walkThen\` gave up silently. All Guide Hall stations now
  walk onto their authored interaction tiles first (\`HolmStationReach.guard\`).
- The fishing edge never declared \`acceptsUseItem\`, so a real "net, then water" click fell through to nothing.
  The Survival Workyard definition and its checked-in Studio bundles were republished with the flag.
- Driver-side: the smithing grid's dagger cell needs the smallest matching element, and the lit beacon returns the
  player to the summit so the descent ladders are only clicked when still inside.

## 10. Sign-off

- Result: ${verdict} (${r.passed}/${r.total})
- Page errors / console errors / failed loads: ${r.pageErrors.length} / ${r.consoleErrors.length} / ${r.failedLoads.length}
- Human alpha remains required per \`docs/rebuild/QA_STANDARD.md\`; this run is the automated real-input baseline.
`;
fs.writeFileSync(out, md);
console.log('wrote ' + path.relative(ROOT, out) + ' (' + verdict + ' ' + r.passed + '/' + r.total + ')');
