#!/usr/bin/env node
/* ============================================================================
   Crafted Realm - content data validator (headless, zero-dependency)

   Executes src/game1_data.js in an isolated Node `vm` context (the file has no
   browser dependencies) AFTER buildTieredGear() has run, then asserts
   referential integrity across the realized data:

     - every shop / SHOP_STOCK item id resolves to a real ITEM
     - every NPC drop id resolves; probabilities and quantities are well-formed
     - every quest reward item id resolves; reward XP skills are real SKILLS
     - every quest target zone is a real ZONE
     - every NPC weapon references a real GEAR_TEMPLATE
     - every boss `glb` asset exists on disk; every boss has a `script` id
     - every NPC has finite, sane combat stats (level/hp/att/str/def/aBonus/
       sBonus/dBonus/speedTicks) and a derived npcMaxHit that is finite >= 1
       (a NaN here silently corrupts the OSRS-exact combat rolls at runtime)
     - generated tier x template ids all exist (buildTieredGear sanity)
     - tier ladder (req / price / tpow) is monotonic
     - item reqSkill is a real skill; equip slots are valid
     - item value / reqLvl / bonus fields are finite numbers; weapons declare a
       style + positive speedTicks; item `provides` resolves to a real item
     - GATHER_RATES yield items resolve

   Exit code: 0 = clean, 1 = one or more ERRORS (warnings never fail the run).
   This is the repeatable gate for content scale - run it after any data edit:
       node tools/validate_content.js
   ========================================================================== */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
// optional path override (CI / future split data files): node validate_content.js [path]
const DATA_PATH = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'src', 'game1_data.js');

const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);

// ---- load + execute the data file in a sandbox -----------------------------
// const/let are lexical (not on the context global), so we APPEND a capture
// line to the same script - it shares the file's top-level lexical scope and
// can therefore see ITEMS/TIERS/... by name.
let D;
try {
  const src = fs.readFileSync(DATA_PATH, 'utf8');
  const NAMES = ['ITEMS', 'TIERS', 'GEAR_TEMPLATES', 'GEAR_ALIASES', 'EQUIP_SLOTS', 'SKILLS',
                 'NPC_TYPES', 'SHOPS', 'SHOP_STOCK', 'QUESTS', 'ZONES',
                 'XP_TABLE', 'GATHER_RATES', 'npcMaxHit'];
  const capture = `\n;globalThis.__DATA = {${NAMES.join(',')}};\n`;
  const sandbox = { Math, console, globalThis: {} };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src + capture, sandbox, { filename: 'game1_data.js' });
  D = sandbox.__DATA;
  if (!D || !D.ITEMS) throw new Error('capture failed - ITEMS missing');
} catch (e) {
  console.error('FATAL: could not load/execute src/game1_data.js');
  console.error(e && e.stack ? e.stack : e);
  process.exit(2);
}

const SKILLSET = new Set(D.SKILLS);
const ZONESET = new Set(Object.keys(D.ZONES));
const TEMPLATESET = new Set(Object.keys(D.GEAR_TEMPLATES));
const SLOTSET = new Set(D.EQUIP_SLOTS.map((s) => s[0]));
const hasItem = (id) => Object.prototype.hasOwnProperty.call(D.ITEMS, id);

// ---- quantity / probability shape helpers ----------------------------------
function checkQty(q, where) {
  if (typeof q === 'number') {
    if (!(q >= 1) || !Number.isFinite(q)) err(`${where}: bad quantity ${JSON.stringify(q)}`);
    return;
  }
  if (Array.isArray(q) && q.length === 2) {
    const [lo, hi] = q;
    if (!(lo >= 1) || !(hi >= lo)) err(`${where}: bad quantity range ${JSON.stringify(q)}`);
    return;
  }
  err(`${where}: quantity must be a number or [lo,hi], got ${JSON.stringify(q)}`);
}
function checkProb(p, where) {
  if (typeof p !== 'number' || !(p > 0) || p > 1) err(`${where}: probability must be in (0,1], got ${JSON.stringify(p)}`);
}
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isInt = (v) => isNum(v) && Number.isInteger(v);
// a numeric field, when present, must be a finite number >= 0 (NaN/undefined feeds the
// OSRS-exact combat formulas straight to NaN — exactly what this gate exists to stop).
function checkNumField(obj, key, where, { required = false, min = 0, int = false } = {}) {
  if (!(key in obj) || obj[key] == null) {
    if (required) err(`${where}: missing required numeric field '${key}'`);
    return;
  }
  const v = obj[key];
  if (!isNum(v)) { err(`${where}: '${key}' must be a finite number, got ${JSON.stringify(v)}`); return; }
  if (v < min) err(`${where}: '${key}' must be >= ${min}, got ${v}`);
  if (int && !Number.isInteger(v)) err(`${where}: '${key}' must be an integer, got ${v}`);
}
const STYLE_SET = new Set(['melee', 'ranged', 'magic']);
// item bonus / numeric fields that combat & UI read — fractional ones (heal/weight/power) allowed
const ITEM_NUM_FIELDS = ['aBonus', 'sBonus', 'dBonus', 'mBonus', 'magB', 'prayB',
                         'dStab', 'dSlash', 'dCrush', 'heal', 'weight', 'power'];
// NPC combat fields the accuracy / max-hit / defence formulas consume every tick
const NPC_REQUIRED_NUM = ['level', 'hp', 'att', 'str', 'def', 'aBonus', 'sBonus', 'dBonus', 'speedTicks'];
const NPC_OPT_NUM = ['dStab', 'dSlash', 'dCrush', 'respawn', 'size'];

// ---- 1. tier x template generation sanity ----------------------------------
// Aliased slots are owned by a canonical legacy item instead of a generated one;
// resolve those to their target so dedup doesn't read as a missing generated item.
const ALIASES = D.GEAR_ALIASES || {};
let genCount = 0;
for (const t of D.TIERS) {
  for (const tk of TEMPLATESET) {
    const id = `${t.key}_${tk}`;
    if (ALIASES[id]) {
      if (!hasItem(ALIASES[id])) err(`tier-gen: alias '${id}' -> '${ALIASES[id]}' but target item is missing from ITEMS`);
      continue;
    }
    genCount++;
    if (!hasItem(id)) err(`tier-gen: expected generated item '${id}' missing from ITEMS (buildTieredGear)`);
  }
}

// ---- 2. tier ladder monotonicity -------------------------------------------
for (let i = 1; i < D.TIERS.length; i++) {
  const a = D.TIERS[i - 1], b = D.TIERS[i];
  if (b.req < a.req) warn(`tier ladder: req drops ${a.key}(${a.req}) -> ${b.key}(${b.req})`);
  if (b.price < a.price) warn(`tier ladder: price drops ${a.key}(${a.price}) -> ${b.key}(${b.price})`);
  if (b.tpow != null && a.tpow != null && b.tpow < a.tpow) warn(`tier ladder: tpow drops ${a.key}(${a.tpow}) -> ${b.key}(${b.tpow})`);
  if (b.mult < a.mult) warn(`tier ladder: mult drops ${a.key}(${a.mult}) -> ${b.key}(${b.mult})`);
}

// ---- 3. item self-consistency ----------------------------------------------
const nameToIds = {};
for (const id in D.ITEMS) {
  const it = D.ITEMS[id];
  if (it.reqSkill && !SKILLSET.has(it.reqSkill)) err(`item '${id}': reqSkill '${it.reqSkill}' is not a real skill`);
  if (it.equip && !SLOTSET.has(it.equip)) err(`item '${id}': equip slot '${it.equip}' not in EQUIP_SLOTS`);
  // value / requirement / bonus shape — malformed numbers reach combat & shop math as NaN
  checkNumField(it, 'value', `item '${id}'`, { min: 0 });
  if ('reqLvl' in it) checkNumField(it, 'reqLvl', `item '${id}'`, { min: 1, int: true });
  if (isNum(it.reqLvl) && it.reqLvl > 99) err(`item '${id}': reqLvl ${it.reqLvl} exceeds 99`);
  for (const k of ITEM_NUM_FIELDS) checkNumField(it, k, `item '${id}'`, { min: 0 });
  if ('style' in it && !STYLE_SET.has(it.style)) err(`item '${id}': style '${it.style}' must be melee|ranged|magic`);
  // a wielded weapon needs an attack style + a positive swing speed, or combat can't tick it
  if (it.equip === 'weapon') {
    if (!STYLE_SET.has(it.style)) err(`item '${id}': weapon must declare a style (melee|ranged|magic)`);
    checkNumField(it, 'speedTicks', `item '${id}'`, { required: true, min: 1, int: true });
  }
  if ('provides' in it && !hasItem(it.provides)) err(`item '${id}': provides '${it.provides}' is not a real item`);
  if (typeof it.tool === 'string') {
    // tools name a skill in lowercase ('woodcutting' -> 'Woodcutting')
    const cap = it.tool[0].toUpperCase() + it.tool.slice(1);
    if (!SKILLSET.has(it.tool) && !SKILLSET.has(cap)) warn(`item '${id}': tool skill '${it.tool}' has no matching SKILL`);
  }
  if (it.name) (nameToIds[it.name] = nameToIds[it.name] || []).push(id);
}
for (const nm in nameToIds) {
  if (nameToIds[nm].length > 1) warn(`duplicate display name '${nm}' on ids: ${nameToIds[nm].join(', ')}`);
}

// ---- 4. NPC drops + weapon + glb -------------------------------------------
for (const nk in D.NPC_TYPES) {
  const npc = D.NPC_TYPES[nk];
  const nwhere = `npc '${nk}'`;
  // combat-stat integrity: these feed the OSRS-exact accuracy / max-hit / defence rolls
  // every tick — a missing or non-numeric one silently produces NaN damage at runtime.
  for (const k of NPC_REQUIRED_NUM) {
    checkNumField(npc, k, nwhere, { required: true, min: 0 });
  }
  if (isNum(npc.level) && npc.level < 1) err(`${nwhere}: level must be >= 1`);
  if (isNum(npc.hp) && npc.hp < 1) err(`${nwhere}: hp must be >= 1`);
  if ('speedTicks' in npc && !isInt(npc.speedTicks)) err(`${nwhere}: speedTicks must be an integer`);
  for (const k of NPC_OPT_NUM) checkNumField(npc, k, nwhere, { min: 0 });
  // end-to-end: the derived max hit must be a finite, landable number
  if (typeof D.npcMaxHit === 'function') {
    const mh = D.npcMaxHit(npc);
    if (!isNum(mh) || mh < 1) err(`${nwhere}: derived npcMaxHit is ${JSON.stringify(mh)} (need finite >= 1) — check str/sBonus`);
  }
  // a boss needs a script id (its mechanics live in BOSS_SCRIPTS); glb bosses are checked below
  if (npc.boss && typeof npc.script !== 'string') err(`${nwhere}: boss is missing a 'script' id`);
  if (npc.weapon && !TEMPLATESET.has(npc.weapon)) err(`${nwhere}: weapon '${npc.weapon}' is not a GEAR_TEMPLATE`);
  if (npc.glb) {
    const abs = path.join(ROOT, npc.glb);
    if (!fs.existsSync(abs)) err(`npc '${nk}': glb asset '${npc.glb}' not found on disk`);
  }
  if (npc.drops) {
    if (!Array.isArray(npc.drops)) { err(`npc '${nk}': drops must be an array`); continue; }
    for (const d of npc.drops) {
      const where = `npc '${nk}' drop '${d.id}'`;
      if (!hasItem(d.id)) err(`${where}: item id does not exist`);
      checkQty(d.q, where);
      checkProb(d.p, where);
    }
  }
}

// ---- 5. shops + SHOP_STOCK --------------------------------------------------
function checkStock(label, stock) {
  if (!Array.isArray(stock)) { err(`${label}: stock must be an array`); return; }
  for (const s of stock) {
    const where = `${label} stock '${s.id}'`;
    if (!hasItem(s.id)) err(`${where}: item id does not exist`);
    if (typeof s.price !== 'number' || !(s.price >= 0)) err(`${where}: bad price ${JSON.stringify(s.price)}`);
  }
}
for (const sk in D.SHOPS) checkStock(`shop '${sk}'`, D.SHOPS[sk].stock);
checkStock('SHOP_STOCK', D.SHOP_STOCK);

// ---- 6. quests --------------------------------------------------------------
for (const qk in D.QUESTS) {
  const q = D.QUESTS[qk];
  const r = q.reward || {};
  if (r.items) for (const ri of r.items) {
    const where = `quest '${qk}' reward '${ri.id}'`;
    if (!hasItem(ri.id)) err(`${where}: item id does not exist`);
    checkQty(ri.q, where);
  }
  if (r.xp) for (const sk in r.xp) {
    if (!SKILLSET.has(sk)) err(`quest '${qk}' reward xp: '${sk}' is not a real skill`);
  }
  if (Array.isArray(q.targets)) for (const tg of q.targets) {
    if (tg.zone && !ZONESET.has(tg.zone)) err(`quest '${qk}' target zone '${tg.zone}' is not a real ZONE`);
  }
  // v2 stage objects: {text, type, npc, zone, target, count, items}
  if (Array.isArray(q.stages)) q.stages.forEach((s, i) => {
    if (typeof s !== 'object' || !s) return;              // legacy string stages
    const where = `quest '${qk}' stage ${i}`;
    if (!s.text) err(`${where}: missing text`);
    if (s.zone && !ZONESET.has(s.zone)) err(`${where}: zone '${s.zone}' is not a real ZONE`);
    if (s.type === 'kill') {
      if (!D.NPC_TYPES[s.target]) err(`${where}: kill target '${s.target}' is not a real NPC type`);
      if (!(Number.isFinite(s.count) && s.count >= 1)) err(`${where}: kill count must be >= 1`);
    }
    if (s.type === 'goto' && !s.zone) err(`${where}: goto stage needs a zone`);
    if (s.type === 'bring') {
      if (!Array.isArray(s.items) || !s.items.length) err(`${where}: bring stage needs items[]`);
      else s.items.forEach(it => {
        if (!hasItem(it.id)) err(`${where}: bring item '${it.id}' does not exist`);
        checkQty(it.q, `${where} bring '${it.id}'`);
      });
    }
  });
  if (q.requires && Array.isArray(q.requires.quests)) q.requires.quests.forEach(r => {
    if (!D.QUESTS[r]) err(`quest '${qk}' requires unknown quest '${r}'`);
  });
  if (q.qp != null && !(Number.isFinite(q.qp) && q.qp >= 1)) err(`quest '${qk}': qp must be a finite number >= 1`);
}

// ---- 7. gather-rate yield items --------------------------------------------
for (const rk in D.GATHER_RATES) {
  const g = D.GATHER_RATES[rk];
  if (g.item && !hasItem(g.item)) err(`GATHER_RATES '${rk}': yield item '${g.item}' does not exist`);
}

// ---- 8. roof-transition companion suite -------------------------------------
{
  const { spawnSync } = require('child_process');
  const roof = spawnSync(process.execPath, [path.join(__dirname, 'test_roof_transitions.js')], { stdio: 'inherit' });
  if (roof.status !== 0) err('roof-transition suite (tools/test_roof_transitions.js) failed - see output above');
}

// ---- report ----------------------------------------------------------------
const nItems = Object.keys(D.ITEMS).length;
const nNpcs = Object.keys(D.NPC_TYPES).length;
const nShops = Object.keys(D.SHOPS).length;
const nQuests = Object.keys(D.QUESTS).length;
console.log('Crafted Realm - content validation');
console.log(`  items ${nItems} (incl. ${genCount} generated tier x template) | npcs ${nNpcs} | shops ${nShops} | quests ${nQuests} | zones ${ZONESET.size}`);
console.log('');
if (warns.length) {
  console.log(`WARNINGS (${warns.length}):`);
  for (const w of warns) console.log('  ~ ' + w);
  console.log('');
}
if (errors.length) {
  console.log(`ERRORS (${errors.length}):`);
  for (const e of errors) console.log('  x ' + e);
  console.log('');
  console.log('FAIL');
  process.exit(1);
}
console.log(`PASS - no referential-integrity errors${warns.length ? ` (${warns.length} warning${warns.length > 1 ? 's' : ''})` : ''}.`);
process.exit(0);
