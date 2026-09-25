'use strict';
/* rng, xp curve, drop tables, run energy. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const R = require('../../shared/rng.js');
const X = require('../../shared/xp.js');
const D = require('../../shared/drops.js');
const M = require('../../shared/movement.js');

test('rng: seeded streams are reproducible and bounded', () => {
  const a = R.create(1234), b = R.create(1234), c = R.create(1235);
  const sa = [], sb = [], sc = [];
  for (let i = 0; i < 50; i++) { sa.push(a.nextU32()); sb.push(b.nextU32()); sc.push(c.nextU32()); }
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  const r = R.create('seed');
  let min = 99, max = -1;
  for (let i = 0; i < 20000; i++) { const v = r.randomInc(7); min = Math.min(min, v); max = Math.max(max, v); }
  assert.equal(min, 0); assert.equal(max, 7);
  for (let i = 0; i < 2000; i++) { const v = r.random(5); assert.ok(v >= 0 && v < 5); }
  assert.equal(r.randomInc(0), 0);
  assert.equal(r.random(0), 0);
  const st = r.getState(); const v1 = r.next(); r.setState(st); assert.equal(r.next(), v1);
});

test('xp curve checkpoints and tenths', () => {
  assert.equal(X.XP_TABLE[2], 83);
  assert.equal(X.XP_TABLE[10], 1154);
  assert.equal(X.XP_TABLE[50], 101333);
  assert.equal(X.XP_TABLE[99], 13034431);
  assert.equal(X.levelForXp10(829), 1);
  assert.equal(X.levelForXp10(830), 2);
  assert.equal(X.levelForXp10(11540), 10);
  assert.equal(X.levelForXp10(130344310), 99);
  assert.equal(X.levelForXp10(X.MAX_XP10), 99);
  assert.equal(X.levelForXp(1154), 10);
  assert.equal(X.xp10ForLevel(10), 11540);
  assert.equal(X.addXp10(X.MAX_XP10 - 5, 100), X.MAX_XP10);
  assert.equal(X.toTenths(5.5), 55);
});

test('xp curve is identical to the client table (src/game1_data.js)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'game1_data.js'), 'utf8');
  const ctx = vm.createContext({ Math, console });
  vm.runInContext(src + '\n;globalThis.__T = XP_TABLE;', ctx);
  assert.deepEqual(Array.from(ctx.__T), X.XP_TABLE);
});

test('drops: ladder rungs follow random(128) exactly', () => {
  const t = { rolls: 128, main: [{ w: 1, item: 'x' }, { w: 1, item: 'y' }, { w: 2, item: 'z' }] };
  const pick = (u) => { const r = D.pickRung(R.scripted([u]), t.rolls, t.main); return r ? r.item : null; };
  assert.equal(pick(0), 'x');
  assert.equal(pick(1 / 128), 'y');
  assert.equal(pick(2 / 128), 'z');
  assert.equal(pick(3 / 128), 'z');
  assert.equal(pick(4 / 128), null);
  assert.equal(pick(0.999), null);
});

test('drops: always + ladder + shared table + tertiary, seeded and reproducible', () => {
  const shared = { gems: { rolls: 128, main: [{ w: 64, item: 'gem_a' }, { w: 64, item: 'gem_b' }] } };
  const table = { always: [{ item: 'bones', qty: 1 }], rolls: 128,
    main: [{ w: 64, item: 'coins', qty: [5, 9] }, { w: 64, table: 'gems' }],
    tertiary: [{ num: 1, den: 1, item: 'clue', qty: 1 }] };
  const a = D.roll(R.create(7), table, shared), b = D.roll(R.create(7), table, shared);
  assert.deepEqual(a, b);
  assert.equal(a[0].id, 'bones');
  assert.equal(a[a.length - 1].id, 'clue');
  assert.equal(a.length, 3);
  const mid = a[1];
  assert.ok(mid.id === 'coins' ? mid.qty >= 5 && mid.qty <= 9 : ['gem_a', 'gem_b'].includes(mid.id));
});

test('drops: 128-roll distribution matches the ladder odds', () => {
  const t = { rolls: 128, main: [{ w: 32, item: 'a' }, { w: 16, item: 'b' }, { w: 8, item: 'c' }] };
  const odds = D.ladderOdds(t);
  assert.equal(odds.a, 0.25); assert.equal(odds.b, 0.125); assert.equal(odds.nothing, 72 / 128);
  const rng = R.create(99), N = 100000, cnt = { a: 0, b: 0, c: 0, none: 0 };
  for (let i = 0; i < N; i++) { const out = D.roll(rng, t, {}); cnt[out.length ? out[0].id : 'none']++; }
  assert.ok(Math.abs(cnt.a / N - 0.25) < 0.01);
  assert.ok(Math.abs(cnt.b / N - 0.125) < 0.01);
  assert.ok(Math.abs(cnt.c / N - 0.0625) < 0.01);
  assert.ok(Math.abs(cnt.none / N - 72 / 128) < 0.01);
});

test('drops: legacy per-entry lists keep their exact meaning', () => {
  const t = D.fromLegacy([{ id: 'bones', q: 1, p: 1 }, { id: 'coins', q: [3, 8], p: 1 }, { id: 'egg', q: 1, p: 0.3 }]);
  assert.deepEqual(t.always, [{ item: 'bones', qty: 1 }, { item: 'coins', qty: [3, 8] }]);
  assert.deepEqual(t.independent, [{ item: 'egg', qty: 1, p: 0.3 }]);
  const rng = R.create(3); let eggs = 0;
  for (let i = 0; i < 20000; i++) if (D.roll(rng, t).some((d) => d.id === 'egg')) eggs++;
  assert.ok(Math.abs(eggs / 20000 - 0.3) < 0.015);
  const errs = D.validate('bad', { main: [{ w: 200, item: 'nope' }], always: [{ item: 'bones', qty: 0 }] }, {}, (id) => id === 'bones');
  assert.ok(errs.some((e) => /exceed/.test(e)));
  assert.ok(errs.some((e) => /unknown item "nope"/.test(e)));
  assert.ok(errs.some((e) => /bad qty 0/.test(e)));
});

test('run energy (updateEnergy port)', () => {
  assert.equal(M.energyTick(5000, 0, 0, 1), 5008);       // idle: +floor(1/9)+8
  assert.equal(M.energyTick(5000, 1, 0, 1), 5008);       // walking also recovers
  assert.equal(M.energyTick(5000, 1, 0, 99), 5019);      // floor(99/9)+8
  assert.equal(M.energyTick(9995, 0, 0, 1), 10000);
  assert.equal(M.energyTick(5000, 2, 0, 1), 4933);       // running: -67
  assert.equal(M.energyTick(5000, 2, 64, 1), 4866);      // -134 at 64 kg
  assert.equal(M.energyTick(5000, 2, 100, 1), 4866);     // clamped at 64 kg
  assert.equal(M.energyTick(5000, 2, 32, 1), 4900);      // floor(67 + 33.5) = 100
  assert.equal(M.energyTick(50, 2, 0, 1), 0);
  assert.equal(M.carriedWeight([{ weight: 2 }, { weight: 5, stack: true }, null], [{ weight: 9 }]), 11);
  assert.equal(M.dirOf(1, 1), 2);
  assert.equal(M.dirOf(0, -1), 6);
});
