/* Actual-source VM contract: credited attack style survives equipment changes.
 * No browser, combat-roll simulation, or tutorial completion claim. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const combat = fs.readFileSync(path.join(root, 'src/game3_systems.js'), 'utf8');
const extension = fs.readFileSync(path.join(root, 'src/tutorial_ext.js'), 'utf8');
function boundedFunction(name, next) {
  const start = combat.indexOf(`function ${name}(`);
  const end = combat.indexOf(`function ${next}(`, start + 1);
  assert.ok(start >= 0 && end > start, `Base guard: ${name}/${next} source boundaries`);
  return combat.slice(start, end);
}
const actual = boundedFunction('applyHit', 'playerAttack') + '\n' + boundedFunction('killNpc', 'fireBoltAtPlayer');
function fixture(equipped = 'melee', complete = false) {
  const log = {xp: [], events: [], notified: [], quests: [], loot: [], equipmentReads: 0};
  const handlers = {};
  const context = {
    console,
    Player: {inv: [], equip: {}, target: null, addItem() {}, addXp: (s, n) => log.xp.push([s, n]),
      weaponStyle() { log.equipmentReads++; return equipped; }},
    Tutorial: {steps: [], step: 0, complete, banner() {}, notify: (ev, match) => log.notified.push([ev, match])},
    Events: {on: (ev, fn) => { handlers[ev] = fn; }, emit: (ev, payload) => {
      log.events.push({ev, payload}); if (handlers[ev]) handlers[ev](payload);
    }},
    UI: {chat() {}, floatDmg() {}, openBank() {}},
    Duel: {active: false}, WORLD: {npcs: []}, removeClickable() {},
    dropLoot: (pos, drops) => log.loot.push([pos, drops]),
    Quest: {onKill: id => log.quests.push(id)}, Sfx: {kill() {}},
    setInterval() { return 1; }, clearInterval() {}
  };
  vm.createContext(context);
  vm.runInContext(extension, context, {filename: 'src/tutorial_ext.js'});
  vm.runInContext(actual, context, {filename: 'src/game3_systems.js (bounded actual functions)'});
  const npc = {hp: 5, typeId: 'grubkin', t: {hp: 5, respawn: 10, name: 'Grubkin', drops: []},
    mesh: {visible: true, position: {x: 1, y: 0, z: 2}}, hpbar: {spr: {visible: false}, draw() {}}};
  return {context, log, npc, styles: () => log.notified.filter(x => x[0] === 'killStyle')};
}
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}: ${error.message}`); }
}
const tokens = [
  ['Attack', 'melee', [['Attack', 20], ['Hitpoints', 7]]],
  ['Strength', 'melee', [['Strength', 20], ['Hitpoints', 7]]],
  ['Defence', 'melee', [['Defence', 20], ['Hitpoints', 7]]],
  ['Shared', 'melee', [['Attack', 7], ['Strength', 7], ['Defence', 7], ['Hitpoints', 7]]],
  ['Ranged', 'ranged', [['Ranged', 20], ['Hitpoints', 7]]],
  ['RangedDef', 'ranged', [['Ranged', 10], ['Defence', 10], ['Hitpoints', 7]]],
  ['Magic', 'magic', [['Magic', 20], ['Hitpoints', 7]]],
  ['MagicDef', 'magic', [['Magic', 10], ['Defence', 10], ['Hitpoints', 7]]]
];
for (const [token, style, xp] of tokens) {
  test(`${token} lethal hit credits originating style despite switched equipment`, () => {
    const f = fixture(style === 'melee' ? 'ranged' : 'melee');
    f.context.applyHit(f.npc, 5, token);
    assert.deepEqual(f.styles(), [['killStyle', style]]);
    assert.equal(f.log.equipmentReads, 0);
    assert.equal(f.log.events.length, 1);
    assert.equal(f.log.events[0].ev, 'npcKilled');
    assert.equal(f.log.events[0].payload.npc, f.npc);
    assert.equal(f.log.events[0].payload.attackStyle, style);
    assert.deepEqual(f.log.xp, xp);
    assert.deepEqual(f.log.quests, ['grubkin']);
    assert.deepEqual(f.log.notified.filter(x => x[0] === 'kill'), [['kill', 'grubkin']]);
    assert.equal(f.log.loot.length, 1);
  });
}
test('unknown hit token has null provenance and no styled tutorial credit', () => {
  const f = fixture(); f.context.applyHit(f.npc, 5, 'FutureSkill');
  assert.equal(f.log.events[0].payload.attackStyle, null);
  assert.deepEqual(f.styles(), []);
  assert.deepEqual(f.log.xp, [['FutureSkill', 20], ['Hitpoints', 7]]);
});
test('administrative kill has null provenance and no styled tutorial credit', () => {
  const f = fixture(); f.context.killNpc(f.npc, {silent: true, noQuest: true});
  assert.equal(f.log.events[0].payload.npc, f.npc);
  assert.equal(f.log.events[0].payload.attackStyle, null);
  assert.deepEqual(f.styles(), []); assert.deepEqual(f.log.xp, []); assert.deepEqual(f.log.quests, []);
});
for (const payload of [undefined, null, {}, {attackStyle: null}, {attackStyle: 'unknown'}, {attackStyle: 'Ranged'}, {attackStyle: 1}]) {
  test(`untrusted/missing event style refuses credit: ${JSON.stringify(payload)}`, () => {
    const f = fixture(); f.context.Events.emit('npcKilled', payload);
    assert.deepEqual(f.styles(), []); assert.equal(f.log.equipmentReads, 0);
  });
}
for (const style of ['melee', 'ranged', 'magic']) {
  test(`completed tutorial ignores ${style} credit`, () => {
    const f = fixture('melee', true); f.context.killNpc(f.npc, {attackStyle: style});
    assert.deepEqual(f.styles(), []);
    assert.equal(f.log.events[0].payload.attackStyle, style);
  });
}
test('nonlethal positive hit keeps XP and emits no kill credit', () => {
  const f = fixture(); f.context.applyHit(f.npc, 2, 'Ranged');
  assert.equal(f.npc.hp, 3); assert.deepEqual(f.log.xp, [['Ranged', 8], ['Hitpoints', 3]]);
  assert.deepEqual(f.log.events, []); assert.deepEqual(f.styles(), []);
});
test('zero damage awards neither XP nor kill credit', () => {
  const f = fixture(); f.context.applyHit(f.npc, 0, 'Magic');
  assert.deepEqual(f.log.xp, []); assert.deepEqual(f.log.events, []);
});
test('duel defeat preserves separate victory path without tutorial credit', () => {
  const f = fixture(); let wins = 0;
  Object.assign(f.context.Duel, {active: true, npc: f.npc, win() { wins++; }});
  f.context.WORLD.npcs.push(f.npc); f.context.applyHit(f.npc, 5, 'Attack');
  assert.equal(wins, 1); assert.deepEqual(f.styles(), []); assert.deepEqual(f.log.events, []);
});
const projectileStart = combat.indexOf('function updateProjectiles(dt){');
const projectileEnd = combat.indexOf('/* ---------- combat (', projectileStart);
assert.ok(projectileStart >= 0 && projectileEnd > projectileStart, 'Projectile source boundary guard');
for (const [token, kind, style] of [['Ranged', 'arrow', 'ranged'], ['RangedDef', 'arrow', 'ranged'], ['Magic', 'bolt', 'magic'], ['MagicDef', 'bolt', 'magic']]) {
  test(`${token} in-flight token reaches actual hit handler after equipment switch`, () => {
    const f = fixture('melee');
    function vector() { return {x: 0, y: 0, z: 0, clone: vector, lerp() { return this; }, copy() { return this; }}; }
    f.npc.mesh.position = vector(); f.npc.t.size = 1;
    f.context.scene = {remove() {}};
    f.context.Sfx.arrowHit = f.context.Sfx.magicHit = () => {};
    f.context.PROJECTILES = [{kind, xpTok: token, npc: f.npc, dmg: 5, t: 0, dur: 1, arc: 0,
      from: vector(), mesh: {position: vector(), lookAt() {}}}];
    vm.runInContext(combat.slice(projectileStart, projectileEnd), f.context);
    f.context.updateProjectiles(1);
    assert.equal(f.context.PROJECTILES.length, 0);
    assert.deepEqual(f.styles(), [['killStyle', style]]);
    assert.equal(f.log.equipmentReads, 0);
    assert.deepEqual(f.log.xp, tokens.find(row => row[0] === token)[2]);
  });
}
test('launch source captures current training token for arrow and spell projectiles', () => {
  const attack = boundedFunction('playerAttack', 'openSmelting');
  assert.match(attack, /fireProjectile\('arrow',[\s\S]*?PROJECTILES\[PROJECTILES.length-1\]\.xpTok = sdef\.xp/);
  assert.match(attack, /fireProjectile\('bolt',[\s\S]*?const pr=PROJECTILES\[PROJECTILES.length-1\];\s*pr\.xpTok = sdef\.xp/);
});
console.log(`[HOLM_COMBAT_CREDIT] ${passed}/${passed + failed} PASS`);
if (failed) process.exitCode = 1;
