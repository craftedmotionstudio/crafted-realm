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
  // a client re-attached mid-fight learns whom it fights from the welcome
  assert.deepEqual(w.welcome(killer.p).f, ['p', victim.p.pid], 'welcome.f names the target');
  assert.deepEqual(w.welcome(victim.p).f, ['p', killer.p.pid], 'and the retaliating victim, its attacker');
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

test('animation priority: a swing (or a death) is not replaced by the defend flinch in the same tick', () => {
  const w = fieldWorld({ areas: { wilderness: [{ x1: 0, z1: -600, x2: 39, z2: 39 }], multi: [], named: [] } });
  const a = addPlayer(w, 'swingA', { levels: { Attack: 50, Strength: 50, Hitpoints: 60 }, pos: { x: 10, z: 20 }, equip: { weapon: 'steel_sword' } });
  const b = addPlayer(w, 'swingB', { levels: { Attack: 50, Strength: 50, Hitpoints: 60 }, pos: { x: 11, z: 20 }, equip: { weapon: 'steel_sword' } });
  const p = a.p;
  p.setAnim('attack', { type: 'stab' }); p.setAnim('defend');
  assert.equal(p.anim.name, 'attack');
  p.setAnim('death'); p.setAnim('defend');
  assert.equal(p.anim.name, 'death');
  w.cycle();
  // two duellists swinging on the same tick: each viewer sees the other's swing, never a bare 'defend'
  a.s.intent({ t: 'op_player', pid: b.p.pid, op: 'attack' });
  b.s.intent({ t: 'op_player', pid: a.p.pid, op: 'attack' });
  let seenA = 0, seenB = 0;
  for (let i = 0; i < 20; i++) {
    w.cycle();
    const ta = a.s.lastTick(), tb = b.s.lastTick();
    const ub = ta.pl && ta.pl.upd && ta.pl.upd.find((u) => u.i === b.p.pid);
    const ua = tb.pl && tb.pl.upd && tb.pl.upd.find((u) => u.i === a.p.pid);
    if (ub && ub.a && ub.a.name === 'attack') seenB++;
    if (ua && ua.a && ua.a.name === 'attack') seenA++;
  }
  assert.ok(seenA >= 3 && seenB >= 3, `both swings seen (${seenA}, ${seenB})`);
});

test('a bow special is flagged on its swing, for monsters and players alike (clients play the special draw)', () => {
  const w = fieldWorld({ spawns: [{ npc: 'korthul', x: 15, z: 20, wander: 0, hunt: 0, maxRange: 0 }], areas: { wilderness: [{ x1: 0, z1: -600, x2: 39, z2: 39 }], multi: [], named: [] } });
  w.rng = alwaysHit(0);
  const npc = [...w.npcs.values()][0];
  const lv = { Attack: 40, Strength: 40, Defence: 40, Hitpoints: 60, Ranged: 40, Magic: 40, Prayer: 43 };
  const a = addPlayer(w, 'volleyA', { levels: lv, pos: { x: 10, z: 20 }, equip: { weapon: 'ash_bow' }, inv: [['arrows', 50]] });
  const b = addPlayer(w, 'volleyB', { levels: lv, pos: { x: 10, z: 24 }, equip: { weapon: 'ash_bow' }, inv: [['arrows', 50]] });
  const specsSeen = (fromSession, pid, n) => { let seen = 0; for (let i = 0; i < n; i++) { w.cycle(); const t = fromSession.lastTick(); const u = t.pl && t.pl.upd && t.pl.upd.find((x) => x.i === pid); if (u && u.a && u.a.name === 'attack' && u.a.spec) seen++; } return seen; };
  // on a monster: the viewer (B) sees A's special volley
  a.s.intent({ t: 'spec', on: true });
  a.s.intent({ t: 'op_npc', nid: npc.nid, op: 'attack' });
  assert.equal(specsSeen(b.s, a.p.pid, 3), 1, 'one special swing seen on the monster');
  assert.equal(a.p.specEnergy, 50);
  // on another adventurer in the Wilderness
  a.s.intent({ t: 'walk', x: 10, z: 21 }); for (let i = 0; i < 8; i++) w.cycle();
  b.s.intent({ t: 'spec', on: true });
  b.s.intent({ t: 'op_player', pid: a.p.pid, op: 'attack' });
  assert.equal(specsSeen(a.s, b.p.pid, 4), 1, 'one special swing seen on the adventurer');
  w.collision.unload();
});

/* the Scarlands bestiary conventions (W2 prep): 2x2 monsters, a breath every third attack */
function bestiaryWorld(extraType, spawn) {
  const G = require('../content/GameData').get();
  const content = Object.assign({}, G, { NPC_TYPES: Object.assign({}, G.NPC_TYPES, extraType), DROP_TABLES: Object.assign({}, G.DROP_TABLES, { test_wyrm: { always: [{ item: 'bones', qty: 1 }] } }) });
  const map = require('./helpers').fieldMap({ spawns: [spawn], areas: { wilderness: [{ x1: 0, z1: -600, x2: 39, z2: 39 }], multi: [], named: [] } });
  return new World({ map, content, seed: 5 });
}
const WYRM = { test_wyrm: { name: 'Test wyrm', level: 56, hp: 120, att: 48, str: 46, def: 42, mag: 50, magicAttack: 24, aBonus: 22, sBonus: 24, dBonus: 28, atype: 'slash', speedTicks: 5, aggro: true, respawn: 90, size: 2, breath: { every: 3, max: 14, range: 5 } } };

test('bestiary: a size-2 monster takes a 2x2 footprint (older fractional sizes stay one tile) and tells clients its size', () => {
  const Npc = require('../engine/Npc');
  assert.equal(Npc.footprint({ size: 2 }), 2);
  assert.equal(Npc.footprint({ size: 0.78 }), 1);
  assert.equal(Npc.footprint({ size: 1.05 }), 1);
  assert.equal(Npc.footprint({ tiles: 3, size: 0.5 }), 3);
  const w = bestiaryWorld(WYRM, { npc: 'test_wyrm', x: 20, z: 10, wander: 0, hunt: 0 });
  const wyrm = [...w.npcs.values()][0];
  assert.equal(wyrm.size, 2);
  const Npc2 = require('../engine/Npc');
  assert.equal(w.collision.canTravel(0, 22, 11, -1, 0, 1, Npc2.NPC_FLAG), false, 'its second row/column is occupied');
  assert.equal(w.collision.canTravel(0, 22, 12, -1, 0, 1, Npc2.NPC_FLAG), true, 'but not beyond its footprint');
  const a = addPlayer(w, 'wyrmview', { pos: { x: 17, z: 10 } });
  w.cycle();
  const add = a.s.received.filter((m) => m.t === 'tick' && m.np).flatMap((m) => m.np.add).find((n) => n.ty === 'test_wyrm');
  assert.equal(add.sz, 2);
});

test('bestiary: the breath comes every third attack as a magic projectile with its own max hit; Protect from Magic blocks it', () => {
  const w = bestiaryWorld(WYRM, { npc: 'test_wyrm', x: 20, z: 10, wander: 0, hunt: 0, maxRange: 20 });
  w.rng = alwaysHit(1);
  const a = addPlayer(w, 'breathed', { levels: { Hitpoints: 99, Defence: 1 }, pos: { x: 19, z: 10 } });
  const wyrm = [...w.npcs.values()][0];
  wyrm.startAttacking(a.p);
  const fx = [];
  for (let i = 0; i < 40; i++) w.cycle();
  const anims = a.s.received.filter((m) => m.t === 'tick' && m.np).flatMap((m) => (m.np.upd || []).concat(m.np.add || [])).filter((u) => u.i === wyrm.nid && u.a).map((u) => u.a.name);
  for (const m of a.s.received) if (m.fx) fx.push(...m.fx);
  const swings = anims.filter((n) => n === 'attack' || n === 'breath');
  assert.ok(swings.length >= 6, 'it fought: ' + swings.join(','));
  swings.forEach((n, i) => assert.equal(n, (i + 1) % 3 === 0 ? 'breath' : 'attack', 'attack ' + (i + 1)));
  assert.ok(fx.some((f) => f.k === 'breath' && f.from[0] === 'n'), 'a breath projectile was announced');
  // alwaysHit(1) deals floor(max * 1): the breath's max (14), the claws' max hit otherwise
  const hits = a.s.received.filter((m) => m.t === 'tick' && m.me && m.me.h).flatMap((m) => m.me.h.map((h) => h[0]));
  assert.ok(hits.includes(14), 'a full breath lands for 14: ' + hits.join(','));
  // praying against magic: breath hits become 0 (monster protection is total)
  const b = addPlayer(w, 'prayed', { levels: { Hitpoints: 99, Prayer: 50 }, pos: { x: 22, z: 11 } });
  b.s.intent({ t: 'prayer', id: 'protect_magic', on: true });
  w.cycle();
  a.p.dead = true; a.p.active = false; w.removePlayer(a.p);
  wyrm.resetDefaults(); wyrm.attackCount = 2; wyrm.actionDelay = -1; wyrm.startAttacking(b.p);
  b.s.clear();
  for (let i = 0; i < 12; i++) w.cycle();
  const bh = b.s.received.filter((m) => m.t === 'tick' && m.me && m.me.h).flatMap((m) => m.me.h.map((h) => h[0]));
  const bfx = b.s.received.filter((m) => m.fx).flatMap((m) => m.fx).filter((f) => f.k === 'breath');
  assert.ok(bfx.length >= 1 && bfx.every((f) => f.splash === 1), 'the breath splashes on Protect from Magic');
  assert.ok(!bh.includes(14), 'no breath damage while praying: ' + bh.join(','));
});
