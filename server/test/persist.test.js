'use strict';
/* Saves (versioned JSON + keyed checksum), the database, and scrypt accounts. */
const test = require('node:test');
const assert = require('node:assert/strict');
const SaveCodec = require('../persist/SaveCodec');
const Database = require('../persist/Database');
const Accounts = require('../persist/Accounts');
const PlayerStore = require('../persist/PlayerStore');
const { fieldWorld, addPlayer, Player } = require('./helpers');

const KEY = 'test-save-key-0123456789abcdef!!';

test('save round trip: a player saved and loaded is the same player', () => {
  const w = fieldWorld();
  const { p } = addPlayer(w, 'saver', { levels: { Attack: 45, Hitpoints: 33, Prayer: 20 }, pos: { x: 12, z: 25 }, inv: [['coins', 1234], ['trout', 1], null, ['iron_sword', 1]], equip: { weapon: 'steel_sword', body: 'iron_platebody' }, run: true, style: 2 });
  p.addXp('Magic', 555);
  p.setLevel('Hitpoints', 20);
  p.skullUntil = w.tick + 700;
  const codec = new SaveCodec(KEY);
  const rec = codec.encode(p.toSave());
  const json = JSON.stringify(rec);
  const back = codec.decode(json);
  const q = new Player(w, { id: 9, username: 'saver' }, back);
  assert.deepEqual(q.toSave(), Object.assign(p.toSave(), { skull: 700 }));
  assert.equal(q.xp10.Magic, 555);
  assert.equal(q.hp, 20);
  assert.equal(q.skullRemaining, 700);
  w.collision.unload();
});

test('canonical encoding: key order never changes the bytes or the checksum', () => {
  const codec = new SaveCodec(KEY);
  const a = codec.encode({ b: 1, a: { d: [1, { y: 2, x: 1 }], c: null } });
  const b = codec.encode({ a: { c: null, d: [1, { x: 1, y: 2 }] }, b: 1 });
  assert.equal(a.body, b.body);
  assert.equal(a.mac, b.mac);
  assert.equal(a.version, SaveCodec.VERSION);
});

test('tamper detection: edited body, edited checksum, wrong key, truncated or foreign data all fail', () => {
  const codec = new SaveCodec(KEY);
  const rec = codec.encode({ inv: [['coins', 10]], stats: { Attack: { xp10: 0, cur: 1 } } });
  const edited = Object.assign({}, rec, { body: rec.body.replace('10', '99999') });
  assert.throws(() => codec.decode(edited), (e) => e.code === 'tampered');
  const badMac = Object.assign({}, rec, { mac: rec.mac.replace(/^./, (c) => (c === 'a' ? 'b' : 'a')) });
  assert.throws(() => codec.decode(badMac), (e) => e.code === 'tampered');
  assert.throws(() => new SaveCodec('another-key-0123456789abcdef!!!!').decode(rec), (e) => e.code === 'tampered');
  assert.throws(() => codec.decode(JSON.stringify(rec).slice(0, 40)), (e) => e.code === 'corrupt');
  assert.throws(() => codec.decode({ magic: 'NOPE', version: 1, body: '{}', mac: '' }), (e) => e.code === 'corrupt');
  assert.throws(() => codec.decode(Object.assign({}, rec, { version: SaveCodec.VERSION + 1 })), (e) => e.code === 'unsupported_version');
  assert.throws(() => new SaveCodec('short'), /16 bytes/);
  assert.deepEqual(codec.decode(rec), { inv: [['coins', 10]], stats: { Attack: { xp10: 0, cur: 1 } } });
});

test('database keeps the current save plus a short history', () => {
  const db = new Database(':memory:');
  const id = db.createAccount('hist', 'Hist', 'x');
  const codec = new SaveCodec(KEY);
  for (let i = 0; i < 8; i++) db.writeSave(id, codec.encode({ n: i }));
  assert.deepEqual(codec.decode(db.loadSave(id)), { n: 7 });
  const h = db.saveHistory(id);
  assert.equal(h.length, 5);
  assert.deepEqual(codec.decode(h[0].record), { n: 7 });
  assert.deepEqual(codec.decode(h[4].record), { n: 3 });
  assert.equal(db.loadSave(12345), null);
  db.close();
});

test('player store: a tampered save refuses to load', () => {
  const db = new Database(':memory:');
  const store = new PlayerStore(db, KEY);
  const id = db.createAccount('cheat', 'Cheat', 'x');
  const w = fieldWorld();
  const { p } = addPlayer(w, 'cheat', {});
  p.accountId = id;
  store.savePlayer(p);
  assert.ok(store.loadData(id));
  const raw = JSON.parse(db.loadSave(id));
  raw.body = raw.body.replace('"energy":10000', '"energy":99999');
  db.db.prepare('UPDATE saves SET record = ? WHERE account_id = ?').run(JSON.stringify(raw), id);
  assert.throws(() => store.loadData(id), (e) => e.code === 'tampered');
  w.collision.unload();
  db.close();
});

test('accounts: scrypt hashes, login, wrong password, duplicates, name rules', async () => {
  const db = new Database(':memory:');
  const acc = new Accounts(db, { cost: { N: 1024 } });
  const a = await acc.register('Ash Rider', 'correct horse');
  assert.equal(a.username, 'ash rider');
  const row = db.findAccount('ASH RIDER');
  assert.match(row.pass, /^scrypt\$1024\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
  assert.ok(!row.pass.includes('correct horse'));
  const who = await acc.login('ash rider', 'correct horse');
  assert.equal(who.id, a.id);
  assert.equal(who.display, 'Ash Rider');
  await assert.rejects(acc.login('ash rider', 'wrong horse!'), (e) => e.code === 'bad_credentials');
  await assert.rejects(acc.login('nobody', 'whatever1'), (e) => e.code === 'bad_credentials');
  await assert.rejects(acc.register('ash RIDER', 'another pw'), (e) => e.code === 'name_taken');
  await assert.rejects(acc.register('bad!name', 'password1'), (e) => e.code === 'bad_username');
  await assert.rejects(acc.register('thirteenchars', 'password1'), (e) => e.code === 'bad_username');
  await assert.rejects(acc.register('ok', 'short'), (e) => e.code === 'bad_password');
  // two hashes of the same password differ (random salt)
  assert.notEqual(await acc.hash('same pass'), await acc.hash('same pass'));
  assert.ok(await acc.verify('same pass', await acc.hash('same pass')));
  db.close();
});
