'use strict';
/* Death in the world: kept items, skull and Protect Item, the killer's loot pile and its timers,
 * npc loot for the most-damage hero, skull surviving a logout. */
const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('../persist/Database');
const PlayerStore = require('../persist/PlayerStore');
const { fieldWorld, addPlayer, runUntil, alwaysHit, saveData, Player, HeadlessSession } = require('./helpers');

// combat levels 88 vs 72 (level gap 16) in a deep wilderness where the field sits at level 50+
const strong = (o) => Object.assign({ levels: { Attack: 70, Strength: 70, Defence: 70, Hitpoints: 80, Prayer: 43 }, equip: { weapon: 'steel_sword' } }, o);
const weak = (o) => Object.assign({ levels: { Attack: 99, Strength: 99, Defence: 1, Hitpoints: 10, Prayer: 43 } }, o);
const DEEP = { areas: { wilderness: [{ x1: 0, z1: -400, x2: 39, z2: 39 }], multi: [], named: [] } };
// item values (src/game1_data.js): steel_platebody 960, iron_platebody 320, steel_sword 300, iron_sword 120,
// bronze_plate 80, cooked_perch 12, coins 1
const loadout = () => ({
  inv: [['iron_sword', 1], ['cooked_perch', 1], ['coins', 250], ['steel_platebody', 1]],
  equip: { weapon: 'steel_sword', body: 'iron_platebody', legs: 'bronze_legs' },
});
const objsAt = (w, x, z) => [...w.objs.values()].filter((o) => o.x === x && o.z === z);

function fight(opts) {
  const w = fieldWorld(DEEP);
  w.rng = alwaysHit(1);
  const killer = addPlayer(w, 'killer', strong({ pos: { x: 10, z: 30 } }));
  const victim = addPlayer(w, 'victim', weak(Object.assign({ pos: { x: 11, z: 30 }, autoRetaliate: false }, loadout())));
  return { w, killer, victim, ...opts };
}
function killVictim(f) {
  const { w, killer, victim } = f;
  const values = (id) => w.content.ITEMS[id].value;
  assert.ok(values('steel_platebody') > values('iron_platebody') && values('iron_platebody') > values('steel_sword') && values('steel_sword') > values('iron_sword'));
  killer.s.intent({ t: 'op_player', pid: victim.p.pid, op: 'attack' });
  runUntil(w, () => victim.p.dead, 20);
  assert.ok(victim.p.dead, 'victim died');
  const deathTile = { x: victim.p.x, z: victim.p.z };
  const deathTick = w.tick;
  runUntil(w, () => !victim.p.dead, 10);
  return { deathTile, deathTick, dropTick: w.tick - 1 };
}

test('pvp death, not skulled: the 3 priciest items are kept, the rest fall for the killer', () => {
  const f = fight();
  const { deathTile } = killVictim(f);
  const { w, killer, victim } = f;
  assert.deepEqual([victim.p.x, victim.p.z], [5, 5]);                     // respawned in the commons
  assert.equal(victim.p.hp, victim.p.maxHp);
  const kept = victim.p.inv.filter(Boolean).map((s) => s.id).sort();
  assert.deepEqual(kept, ['iron_platebody', 'steel_platebody', 'steel_sword'].sort());
  assert.deepEqual(Object.values(victim.p.equip).filter(Boolean), []);   // kept items come back in the pack
  const pile = objsAt(w, deathTile.x, deathTile.z);
  const ids = pile.map((o) => o.id).sort();
  assert.deepEqual(ids, ['bones', 'bronze_legs', 'coins', 'cooked_perch', 'iron_sword'].sort());
  for (const o of pile) assert.equal(o.owner, 'killer');
  assert.ok(killer.s.messages().includes('You have defeated victim.'));
  assert.ok(killer.p.isSkulled(), 'the attacker is skulled');
  assert.ok(!victim.p.isSkulled());
  w.collision.unload();
});

test('pvp death while skulled keeps nothing; with Protect Item keeps one', () => {
  for (const protect of [false, true]) {
    const f = fight();
    const { w, killer, victim } = f;
    // the victim attacks first (skull), then stops and the killer finishes it
    victim.p.autoRetaliate = false;
    victim.s.intent({ t: 'op_player', pid: killer.p.pid, op: 'attack' });
    w.cycle();
    assert.ok(victim.p.isSkulled());
    victim.s.intent({ t: 'walk', x: 11, z: 30 });
    if (protect) victim.s.intent({ t: 'prayer', id: 'protect_item', on: true });
    w.cycle();
    const { deathTile } = killVictim(f);
    const kept = victim.p.inv.filter(Boolean).map((s) => s.id);
    assert.deepEqual(kept, protect ? ['steel_platebody'] : []);
    assert.ok(!victim.p.isSkulled(), 'death clears the skull');
    assert.equal(objsAt(w, deathTile.x, deathTile.z).length, (protect ? 6 : 7) + 1);   // + bones
    w.collision.unload();
  }
});

test('loot timers: 100 ticks for the owner only, then everyone, gone at 200', () => {
  const f = fight();
  const { w, killer } = f;
  const stranger = addPlayer(w, 'stranger', { pos: { x: 12, z: 32 } });
  const { deathTile, dropTick } = killVictim(f);
  const pile = objsAt(w, deathTile.x, deathTile.z);
  const coins = pile.find((o) => o.id === 'coins');
  assert.equal(coins.revealTick - dropTick, 100);
  assert.equal(coins.despawnTick - dropTick, 200);
  w.cycle();
  assert.ok(killer.p.view.objs.has(coins.uid), 'the killer sees the pile');
  assert.ok(!stranger.p.view.objs.has(coins.uid), 'nobody else does yet');
  // the stranger cannot take what it cannot see
  stranger.s.intent({ t: 'op_obj', uid: coins.uid, op: 'take' });
  w.cycle();
  assert.equal(stranger.p.invCount('coins'), 0);
  runUntil(w, () => w.tick >= coins.revealTick + 1, 120);
  assert.ok(stranger.p.view.objs.has(coins.uid), 'public after 100 ticks');
  stranger.s.intent({ t: 'op_obj', uid: coins.uid, op: 'take' });
  runUntil(w, () => stranger.p.invCount('coins') > 0, 20);
  assert.equal(stranger.p.invCount('coins'), 250);
  const bones = objsAt(w, deathTile.x, deathTile.z).find((o) => o.id === 'bones');
  runUntil(w, () => !w.objs.has(bones.uid), 120);
  assert.equal(w.tick - 1, bones.despawnTick);
  w.collision.unload();
});

test('npc loot goes to the player who did the most damage (two attackers in multi-combat)', () => {
  const w = fieldWorld({ spawns: [{ npc: 'gnarlgob', x: 20, z: 10, wander: 0, hunt: 0 }], areas: { wilderness: [], multi: [{ x1: 0, z1: 0, x2: 39, z2: 39 }], named: [] } });
  w.rng = alwaysHit(1);
  const gob = [...w.npcs.values()][0];
  const a = addPlayer(w, 'chipper', { levels: { Hitpoints: 30 }, pos: { x: 19, z: 10 } });                                   // max hit 1
  const b = addPlayer(w, 'slayer', { levels: { Attack: 30, Strength: 30, Hitpoints: 30 }, pos: { x: 21, z: 10 }, equip: { weapon: 'iron_sword' } });
  a.s.intent({ t: 'op_npc', nid: gob.nid, op: 'attack' });
  b.s.intent({ t: 'op_npc', nid: gob.nid, op: 'attack' });
  runUntil(w, () => !gob.active, 40);
  assert.ok(!gob.active, 'the gnarlgob died');
  assert.ok(gob.heroPoints.get('slayer') > gob.heroPoints.get('chipper'));
  const drops = [...w.objs.values()].filter((o) => o.x === 20 && o.z === 10);
  assert.ok(drops.some((o) => o.id === 'bones'));
  for (const o of drops) assert.equal(o.owner, 'slayer');
  runUntil(w, () => gob.active, gob.respawnTicks + 5);
  assert.equal(gob.hp, gob.maxHp);
  assert.deepEqual([gob.x, gob.z], [20, 10]);
  w.collision.unload();
});

test('a skull survives logging out and back in (capped at 2000 ticks)', () => {
  const db = new Database(':memory:');
  const store = new PlayerStore(db, 'k'.repeat(32));
  const w = fieldWorld(DEEP);
  w.store = store;
  const a = addPlayer(w, 'pker', strong({ pos: { x: 10, z: 30 } }));
  a.p.accountId = db.createAccount('pker', 'pker', 'x');
  const b = addPlayer(w, 'mark', weak({ pos: { x: 11, z: 30 } }));
  a.s.intent({ t: 'op_player', pid: b.p.pid, op: 'attack' });
  w.cycle();
  const left = a.p.skullUntil - w.tick;
  assert.ok(left > 1990);
  a.s.intent({ t: 'walk', x: 10, z: 36 });
  runUntil(w, () => w.tick >= a.p.preventLogoutUntil, 30);
  a.s.intent({ t: 'logout' });
  w.cycle();
  assert.equal(a.p.active, false);
  const data = store.loadData(a.p.accountId);
  assert.ok(data.skull > 1900 && data.skull < 2000);
  // back in: the remaining ticks continue
  for (let i = 0; i < 50; i++) w.cycle();
  const again = new Player(w, { id: a.p.accountId, username: 'pker' }, data);
  new HeadlessSession().attach(again);
  w.queueLogin(again); w.cycle();
  assert.equal(again.skullUntil - (w.tick - 1), data.skull);
  assert.ok(again.isSkulled());
  w.collision.unload();
  db.close();
});
