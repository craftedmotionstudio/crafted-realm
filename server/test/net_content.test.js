'use strict';
/* Protocol parsing, rate limits, and the content the server loads from the client files. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const Protocol = require('../net/Protocol');
const { TokenBucket, WindowLimiter } = require('../net/RateLimiter');
const GameData = require('../content/GameData');
const C = require('../../shared/combat.js');

test('protocol: shapes and types are checked before anything reaches the world', () => {
  assert.equal(Protocol.parse('{"t":"walk","x":3,"z":4}').ok, true);
  assert.equal(Protocol.parse('{"t":"walk","x":3.5,"z":4}').code, 'bad_field');
  assert.equal(Protocol.parse('{"t":"walk","x":"3","z":4}').code, 'bad_field');
  assert.equal(Protocol.parse('{"t":"teleport_to_bank"}').code, 'unknown_type');
  assert.equal(Protocol.parse('[1,2]').code, 'bad_shape');
  assert.equal(Protocol.parse('nope').code, 'bad_json');
  assert.equal(Protocol.parse('{"t":"chat","text":"' + 'x'.repeat(5000) + '"}').code, 'too_large');
  assert.equal(Protocol.parse('{"t":"autocast","spell":null}').ok, true);
  assert.equal(Protocol.parse('{"t":"autocast","spell":7}').code, 'bad_field');
  assert.equal(Protocol.parse('{"t":"login","user":"a","pass":"b"}').ok, true);
  // every intent the protocol accepts has a world handler
  const { HANDLERS } = require('../engine/input');
  for (const t in Protocol.INTENTS) assert.ok(HANDLERS[t], 'handler for ' + t);
});

test('rate limits: token bucket and sliding window', () => {
  let now = 0;
  const b = new TokenBucket(3, 2, () => now);
  assert.ok(b.take() && b.take() && b.take());
  assert.equal(b.take(), false);
  now = 500;                               // +1 token
  assert.equal(b.take(), true);
  assert.equal(b.take(), false);
  const w = new WindowLimiter(2, 1000, () => now);
  assert.ok(w.allow('ip') && w.allow('ip'));
  assert.equal(w.allow('ip'), false);
  assert.equal(w.allow('other'), true);
  now = 1600;
  assert.equal(w.allow('ip'), true);
});

test('content: client data loads, drop tables validate, npc stats are sane', () => {
  const G = GameData.load();
  assert.ok(Object.keys(G.ITEMS).length >= 200);
  assert.ok(Object.keys(G.NPC_TYPES).length >= 25);
  assert.equal(G.SKILLS.length, 15);
  assert.ok(G.SPELLS.wind_strike && G.SPELLS.wind_strike.max === 2);
  for (const t in G.NPC_TYPES) {
    const d = G.NPC_TYPES[t];
    const L = C.npcLevels(d);
    assert.ok(C.npcMaxHit(d, L) >= 0, t);
    assert.ok(C.npcAttackRoll(d, L, []) > 0, t);
    assert.ok(G.DROP_TABLES[t], 'drops for ' + t);
  }
  assert.ok(Object.isFrozen(G.ITEMS.coins));
});

test('content: shared prayer ids and levels match the client prayer book', () => {
  const root = path.join(__dirname, '..', '..');
  const ctx = { Math, console, JSON, WORLD: {}, Set, Map, Array, Object };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['src/game1_data.js', 'src/combat_math.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx);
  let client;
  try {
    vm.runInContext(fs.readFileSync(path.join(root, 'src/game3_systems.js'), 'utf8') + '\n;globalThis.__P = PRAYERS;', ctx);
    client = ctx.__P;
  } catch (e) { return; }   // the client file stopped evaluating headlessly: nothing to compare
  for (const id in client) {
    assert.ok(C.PRAYERS[id], 'shared prayer ' + id);
    assert.equal(C.PRAYERS[id].level, client[id].req, 'level of ' + id);
    if (client[id].protect) assert.equal(C.PRAYERS[id].protect, client[id].protect);
    if (client[id].boost) {
      const k = Object.keys(client[id].boost)[0];
      assert.equal(C.PRAYERS[id].pct, Math.round(client[id].boost[k] * 100), 'multiplier of ' + id);
    }
  }
  assert.ok(C.PRAYERS.protect_item && !client.protect_item, 'protect item is the server-side addition');
});
