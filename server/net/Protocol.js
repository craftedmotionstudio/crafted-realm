'use strict';
/* ============ Protocol — message names, version, and shape checks ============
 * JSON over WebSocket; every message is an object with a string `t`. The full catalogue (both
 * directions, with fields and examples) is docs/rebuild/NET_PROTOCOL.md — keep the two in step and
 * bump VERSION on any incompatible change.
 */
const VERSION = 1;
const MAX_MESSAGE_BYTES = 4096;

/** client -> server messages allowed before login */
const PRE_AUTH = new Set(['hello', 'register', 'login', 'ping']);
/** client -> server intents handled by the world (server/engine/input.js), with required field types */
const INTENTS = {
  walk: { x: 'int', z: 'int' },
  run: { on: 'bool' },
  op_npc: { nid: 'int', op: 'string' },
  op_player: { pid: 'int', op: 'string' },
  op_obj: { uid: 'int', op: 'string' },
  cast_npc: { nid: 'int', spell: 'string' },
  cast_player: { pid: 'int', spell: 'string' },
  eat: { slot: 'int' },
  equip: { slot: 'int' },
  unequip: { slot: 'string' },
  drop: { slot: 'int' },
  style: { index: 'int' },
  auto_retaliate: { on: 'bool' },
  autocast: {},
  prayer: { id: 'string', on: 'bool' },
  spec: { on: 'bool' },
  chat: { text: 'string' },
  teleport: { spell: 'string' },
  logout: {},
  ping: {},
};

function typeOk(v, t) {
  if (t === 'int') return Number.isInteger(v) && Math.abs(v) < 1e7;
  if (t === 'bool') return typeof v === 'boolean' || v === 0 || v === 1;
  if (t === 'string') return typeof v === 'string' && v.length <= 200;
  return true;
}

/** parse + shape-check one raw frame. Returns {ok, msg} or {ok:false, code}. */
function parse(raw) {
  const text = typeof raw === 'string' ? raw : raw.toString('utf8');
  if (text.length > MAX_MESSAGE_BYTES) return { ok: false, code: 'too_large' };
  let msg;
  try { msg = JSON.parse(text); } catch (e) { return { ok: false, code: 'bad_json' }; }
  if (!msg || typeof msg !== 'object' || Array.isArray(msg) || typeof msg.t !== 'string') return { ok: false, code: 'bad_shape' };
  if (PRE_AUTH.has(msg.t)) return { ok: true, msg };
  const spec = INTENTS[msg.t];
  if (!spec) return { ok: false, code: 'unknown_type' };
  for (const f in spec) if (!typeOk(msg[f], spec[f])) return { ok: false, code: 'bad_field', field: f };
  if (msg.t === 'autocast' && !(msg.spell === null || msg.spell === undefined || typeOk(msg.spell, 'string'))) return { ok: false, code: 'bad_field', field: 'spell' };
  return { ok: true, msg };
}

module.exports = { VERSION, MAX_MESSAGE_BYTES, PRE_AUTH, INTENTS, parse };
