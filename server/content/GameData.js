'use strict';
/* ============ GameData — the game's existing content, loaded without copying it ============
 * The browser client keeps its data as plain global scripts (src/game1_data.js: ITEMS, NPC_TYPES,
 * SKILLS, XP_TABLE; src/magic_spells.js: SPELLS). The server evaluates those same files inside a Node
 * `vm` sandbox — the approach tools/validate_content.js already uses — so there is ONE source of
 * truth: an item or monster edited for the client is the item or monster the server simulates.
 * Only data is read; the few client functions defined alongside (castAlchemy etc.) are never called.
 *
 * Server-only additions live in server/data/*.json (drop tables) and SERVER_ITEM_PATCH below
 * (per-item field overrides merged into the server's copy; empty for now).
 */
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const drops = require('../../shared/drops.js');

const ROOT = path.resolve(__dirname, '..', '..');

/** fields the server adds on top of the client item data (merged into a copy, never the source) */
const SERVER_ITEM_PATCH = {};

function evalScript(ctx, file, capture) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  vm.runInContext(src + '\n;' + capture, ctx, { filename: file });
}

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const k of Object.keys(o)) deepFreeze(o[k]); }
  return o;
}

/**
 * Load everything. opts.dropsFile overrides server/data/drops.json.
 * Returns a frozen {ITEMS, NPC_TYPES, SKILLS, XP_TABLE, SPELLS, SPECIALS, DROP_TABLES, SHARED_DROPS}.
 */
function load(opts) {
  const o = opts || {};
  const sandbox = { Math, console, JSON, Set, Map, Array, Object, WORLD: {} };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  evalScript(sandbox, 'src/game1_data.js', 'globalThis.__D = {ITEMS, NPC_TYPES, SKILLS, XP_TABLE, EQUIP_SLOTS};');
  evalScript(sandbox, 'src/magic_spells.js', 'globalThis.__S = SPELLS;');
  // SPECIALS (the weapon special attacks) live in the large client systems file; read them when the
  // file still evaluates headlessly, otherwise run without specials rather than fail to boot.
  let specials = {};
  try {
    evalScript(sandbox, 'src/combat_math.js', '');
    evalScript(sandbox, 'src/game3_systems.js', 'globalThis.__X = {SPECIALS};');
    specials = sandbox.__X.SPECIALS || {};
  } catch (e) { specials = {}; }

  // JSON round-trip strips functions and gives us plain, detached copies
  const D = JSON.parse(JSON.stringify(sandbox.__D));
  const SPELLS = JSON.parse(JSON.stringify(sandbox.__S));
  const SPECIALS = JSON.parse(JSON.stringify(specials));

  for (const id in SERVER_ITEM_PATCH) if (D.ITEMS[id]) Object.assign(D.ITEMS[id], SERVER_ITEM_PATCH[id]);

  const dropsFile = o.dropsFile || path.join(ROOT, 'server', 'data', 'drops.json');
  const dj = JSON.parse(fs.readFileSync(dropsFile, 'utf8'));
  const SHARED_DROPS = dj.shared || {};
  const DROP_TABLES = {};
  const errors = [];
  const itemExists = (id) => Object.prototype.hasOwnProperty.call(D.ITEMS, id);
  for (const t in D.NPC_TYPES) {
    DROP_TABLES[t] = (dj.npcs && dj.npcs[t]) ? dj.npcs[t] : drops.fromLegacy(D.NPC_TYPES[t].drops);
    errors.push(...drops.validate(t, DROP_TABLES[t], SHARED_DROPS, itemExists));
  }
  for (const s in SHARED_DROPS) errors.push(...drops.validate('shared:' + s, SHARED_DROPS[s], SHARED_DROPS, itemExists));
  for (const t in (dj.npcs || {})) if (!D.NPC_TYPES[t]) errors.push(`drops.json: unknown npc type "${t}"`);
  if (errors.length) throw new Error('content errors:\n  ' + errors.join('\n  '));

  return deepFreeze({
    ITEMS: D.ITEMS, NPC_TYPES: D.NPC_TYPES, SKILLS: D.SKILLS, XP_TABLE: D.XP_TABLE, EQUIP_SLOTS: D.EQUIP_SLOTS,
    SPELLS, SPECIALS, DROP_TABLES, SHARED_DROPS,
  });
}

let cached = null;
/** the process-wide content (loaded once) */
function get() { if (!cached) cached = load(); return cached; }

module.exports = { load, get, SERVER_ITEM_PATCH };
