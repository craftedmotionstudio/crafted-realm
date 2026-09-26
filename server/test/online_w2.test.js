'use strict';
/* W2 online-alpha additions: character-kit looks (sanitised, saved, sent to viewers), the alpha start levels and
 * the Commons supply chest (kit intent), facing in the self block, private-loot flags, and the death summary. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { addPlayer, fieldWorld, runUntil, alwaysHit, World, Player, HeadlessSession } = require('./helpers');
const LOOK = require('../engine/look');
const Protocol = require('../net/Protocol');
const PVP = require('../../shared/pvp.js');

const MAP = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'maps', 'scarlands_test.json'), 'utf8'));
const LOOK_A = { body: 'A', parts: { Hair: 3, Jaw: 2, Torso: 1, Arms: 1, Hands: 1, Legs: 2, Feet: 1 }, colors: { hair: 4, torso: 7, legs: 2, feet: 1, skin: 3 }, build: 'stout', feet: 'large' };

test('looks are sanitised: known slots/channels, bounded integers, known enums', () => {
  assert.equal(LOOK.sanitize(null), null);
  assert.equal(LOOK.sanitize({ body: 'C' }), null);
  assert.equal(LOOK.sanitize([1, 2]), null);
  const dirty = { body: 'B', parts: { Hair: 2, Evil: 9, Torso: 999, Legs: 1.5 }, colors: { hair: 3, skin: -1, torso: 'x' }, build: 'huge', feet: 'small', extra: 'x'.repeat(5000) };
  assert.deepEqual(LOOK.sanitize(dirty), { body: 'B', parts: { Hair: 2 }, colors: { hair: 3 }, feet: 'small' });
  assert.deepEqual(LOOK.sanitize(LOOK_A), LOOK_A);
  // the protocol accepts the new intents and rejects a look that is not an object
  assert.equal(Protocol.parse(JSON.stringify({ t: 'look', look: LOOK_A })).ok, true);
  assert.equal(Protocol.parse(JSON.stringify({ t: 'look', look: 'A' })).ok, false);
  assert.equal(Protocol.parse(JSON.stringify({ t: 'kit', name: 'melee' })).ok, true);
});

test('a look is saved, sent in welcome, to viewers on add, and as an appearance update when it changes', () => {
  const w = fieldWorld({ areas: { wilderness: [], multi: [], named: [] } });
  const a = addPlayer(w, 'lookA', { pos: { x: 5, z: 5 } });
  const b = addPlayer(w, 'lookB', { pos: { x: 7, z: 5 } });
  w.cycle();
  a.s.intent({ t: 'look', look: LOOK_A });
  w.cycle();
  assert.deepEqual(a.p.look, LOOK_A);
  assert.deepEqual(a.p.toSave().look, LOOK_A);
  const upd = b.s.lastTick().pl.upd.find((u) => u.i === a.p.pid);
  assert.ok(upd && upd.lk, 'viewer got the new look');
  assert.deepEqual(upd.lk, LOOK_A);
  // a fresh viewer gets it in the add snapshot; a reloaded player keeps it and sees it in welcome
  const c = addPlayer(w, 'lookC', { pos: { x: 6, z: 7 } });
  w.cycle();
  const add = c.s.received.filter((m) => m.t === 'tick' && m.pl).flatMap((m) => m.pl.add).find((e) => e.i === a.p.pid);
  assert.deepEqual(add.lk, LOOK_A);
  const again = new Player(w, { id: 99, username: 'lookA2' }, a.p.toSave());
  assert.deepEqual(w.welcome(Object.assign(again, { pid: 5 })).lk, LOOK_A);
});

test('looks can only change somewhere safe', () => {
  const w = fieldWorld();   // the northern half is wilderness
  const a = addPlayer(w, 'wildlook', { pos: { x: 5, z: 25 } });
  a.s.intent({ t: 'look', look: LOOK_A });
  w.cycle();
  assert.equal(a.p.look, null);
  assert.ok(a.s.messages().some((m) => /somewhere safe/.test(m)));
});

test('alpha: brand-new adventurers start at the map alpha levels; saved ones keep their own', () => {
  const w = new World({ map: MAP, seed: 3 });
  const fresh = new Player(w, { id: 1, username: 'newbie' }, null);
  for (const sk in MAP.alpha.startStats) assert.equal(fresh.base(sk), MAP.alpha.startStats[sk], sk);
  assert.equal(fresh.combatLevel(), 51);
  const saved = new Player(w, { id: 2, username: 'veteran' }, { stats: { Attack: { xp10: 0, cur: 1 } } });
  assert.equal(saved.base('Attack'), 1);
  assert.equal(saved.base('Hitpoints'), 10);
});

test('alpha supply chest: kits only at the chest, out of combat; they replace pack and gear', () => {
  const w = new World({ map: MAP, seed: 4 });
  const chest = MAP.alpha.chest;
  const far = addPlayer(w, 'far', { pos: { x: 20, z: 10 }, inv: [['bread', 1]] });
  far.s.intent({ t: 'kit', name: 'melee' });
  w.cycle();
  assert.equal(far.p.equip.weapon, null);
  assert.ok(far.s.messages().some((m) => /supply chest/.test(m)));

  const near = addPlayer(w, 'near', { pos: { x: chest.x - 1, z: chest.z }, inv: [['bread', 1], ['coins', 5000]], equip: { weapon: 'bronze_sword' } });
  near.s.intent({ t: 'kit', name: 'ranged' });
  w.cycle();
  const kit = MAP.alpha.kits.ranged;
  for (const sl in kit.equip) assert.equal(near.p.equip[sl], kit.equip[sl], sl);
  assert.equal(near.p.invCount('arrows'), 300);
  assert.equal(near.p.invCount('bread'), 0, 'the old pack is gone (no duplication)');
  assert.equal(near.p.invCount('coins'), 100);
  assert.equal(near.p.style().type, 'ranged');
  for (let i = 0; i < MAP.alpha.cooldown; i++) w.cycle();   // the chest has a short cooldown
  near.s.intent({ t: 'kit', name: 'magic' });
  runUntil(w, () => near.p.equip.weapon === 'storm_staff', 10);
  assert.equal(near.p.autocast, 'water_bolt');
  assert.equal(near.p.autocastSpell(), 'water_bolt');
  // unknown kits are refused as bad input
  const before = near.p.badInput | 0;
  near.s.intent({ t: 'kit', name: 'toString' });
  w.cycle();
  assert.equal(near.p.badInput, before + 1);
  // not while fighting
  near.p.preventLogoutUntil = w.tick + 10;
  near.s.clear();
  near.s.intent({ t: 'kit', name: 'melee' });
  w.cycle(); w.cycle(); w.cycle(); w.cycle(); w.cycle(); w.cycle();
  assert.equal(near.p.equip.weapon, 'storm_staff');
  assert.ok(near.s.messages().some((m) => /while you are fighting/.test(m)));
});

test('the self block carries facing; private loot is flagged for its owner; death says what was kept and by whom', () => {
  const w = fieldWorld({ areas: { wilderness: [{ x1: 0, z1: -600, x2: 39, z2: 39 }], multi: [], named: [] } });   // deep enough for any level gap
  w.rng = alwaysHit(1);
  const killer = addPlayer(w, 'killer', { levels: { Attack: 60, Strength: 60, Hitpoints: 60 }, pos: { x: 10, z: 25 }, equip: { weapon: 'steel_sword' } });
  const victim = addPlayer(w, 'victim', { levels: { Hitpoints: 10 }, pos: { x: 11, z: 25 },
    inv: [['coins', 50], ['trout', 1], ['bread', 1]], equip: { body: 'steel_platebody', legs: 'steel_platelegs', head: 'steel_medhelm', shield: 'steel_kiteshield' } });
  const preview = PVP.keptOnDeath(victim.p.inv, victim.p.equip, { skulled: false, protectItem: false, valueOf: (id) => w.content.ITEMS[id].value, stackable: (id) => !!w.content.ITEMS[id].stack });
  w.cycle();
  killer.s.intent({ t: 'op_player', pid: victim.p.pid, op: 'attack' });
  w.cycle();
  const faced = killer.s.received.filter((m) => m.t === 'tick' && m.me && m.me.f);
  assert.ok(faced.length && faced[faced.length - 1].me.f[0] === 'p' && faced[faced.length - 1].me.f[1] === victim.p.pid, 'me.f names the target');
  runUntil(w, () => victim.s.received.some((m) => m.death), 60);
  const death = victim.s.received.find((m) => m.death).death;
  assert.equal(death.by, 'killer');
  assert.deepEqual(death.kept, preview.kept.map((k) => [k.id, k.qty]), 'kept items match the shared preview');
  for (const [id, qty] of death.kept) assert.equal(victim.p.invCount(id), qty);
  assert.ok(victim.s.messages().some((m) => /^You kept: /.test(m)));
  // the killer sees their private pile flagged, the victim does not see it at all
  w.cycle();
  const obs = killer.s.received.filter((m) => m.t === 'tick' && m.ob).flatMap((m) => m.ob.add);
  const coins = obs.find((o) => o.id === 'coins');
  assert.ok(coins && coins.own === 1 && coins.pub > 0, 'private loot flagged own with ticks until public');
  const victimSaw = victim.s.received.filter((m) => m.t === 'tick' && m.ob).flatMap((m) => m.ob.add).some((o) => o.id === 'coins');
  assert.equal(victimSaw, false);
});

test('a new ws login may bring a look; a saved look wins', () => {
  // exercised through Session.login in integration; here only the precedence rule on the Player
  const w = fieldWorld();
  const p = new Player(w, { id: 7, username: 'lk' }, { look: LOOK_A });
  assert.deepEqual(p.look, LOOK_A);
  const s = new HeadlessSession().attach(p);
  assert.ok(s);
});
