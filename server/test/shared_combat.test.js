'use strict';
/* Golden-value tests for shared/combat.js. Every expected number below is worked by hand from the
 * 2004 formulas (see the header of shared/combat.js for the cited scripts). */
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../shared/combat.js');
const R = require('../../shared/rng.js');

test('effective level: floor(level * max(100, pct) / 100)', () => {
  assert.equal(C.effectiveLevel(70, 115), 80);    // 80.5 -> 80
  assert.equal(C.effectiveLevel(99, 100), 99);
  assert.equal(C.effectiveLevel(50, 90), 50);     // multipliers below 100 are ignored
  assert.equal(C.effectiveLevel(1, 105), 1);      // 1.05 -> 1
  assert.equal(C.effectiveLevel(40, 110), 44);
});

test('max hit: floor((roll + 320) / 640)', () => {
  // 99 strength, aggressive (+3), no bonus: eff 110, roll 7040 -> 11.5 -> 11
  assert.equal(C.maxHitFromRoll(C.roll(99 + 8 + 3, 0)), 11);
  // 99 strength with 115% prayer: floor(113.85)=113, +8+3 = 124; +82 strength: 124*146 = 18104 -> 28.79 -> 28
  assert.equal(C.maxHitFromRoll(C.roll(C.effectiveLevel(99, 115) + 11, 82)), 28);
  // level 1 unarmed accurate: eff 9, roll 576 -> 1.4 -> 1
  assert.equal(C.maxHitFromRoll(C.roll(1 + 8 + 0, 0)), 1);
  assert.equal(C.maxHitFromRoll(0), 0);
});

test('player combat stats (player_combat_stat port)', () => {
  const s = C.playerCombatStats({
    levels: { attack: 60, strength: 70, defence: 50, ranged: 40, magic: 30 },
    bonuses: { stab: 20, slash: 30, crush: 10, magic: 5, ranged: 0, dStab: 40, dSlash: 42, dCrush: 38, dMagic: 5, dRanged: 41, str: 25, rStr: 0, prayer: 3 },
    prayers: ['incredible_ref', 'steel_skin'],
    style: { style: 'aggressive', type: 'slash' },
  });
  assert.equal(s.effAttack, 77);          // floor(60*1.15)=69 +8 +0
  assert.equal(s.effStrength, 81);        // 70 +8 +3
  assert.equal(s.effDefence, 65);         // floor(50*1.15)=57 +8
  assert.equal(s.effMagic, 39);           // 30 +8 +1 (magic always +1)
  assert.equal(s.effRanged, 48);          // 40 +8
  assert.equal(s.effMagicDefence, 46);    // floor((7*30 + 3*57)/10)=38 +8
  assert.deepEqual(s.attackRoll, { stab: 6468, slash: 7238, crush: 5698, ranged: 3072, magic: 2691 });
  assert.deepEqual(s.defenceRoll, { stab: 6760, slash: 6890, crush: 6630, ranged: 6825, magic: 3174 });
  assert.equal(s.meleeMaxHit, 11);        // (81*89 + 320)/640 = 11.76
  assert.equal(s.rangedMaxHit, 5);        // (48*64 + 320)/640 = 5.3
  assert.equal(s.maxHit, 11);
});

test('ranged uses ranged strength, not melee strength', () => {
  const bow = { equip: 'weapon', style: 'ranged', aBonus: 17, sBonus: 15, speedTicks: 5, model: 'bow' };
  const amulet = { equip: 'amulet', sBonus: 4 };
  const b = C.equipmentBonuses([bow, amulet]);
  assert.equal(b.rStr, 15);
  assert.equal(b.str, 4);
  const s = C.playerCombatStats({ levels: { attack: 1, strength: 99, defence: 1, ranged: 50, magic: 1 }, bonuses: b, prayers: [], style: C.styleFor(bow, 0) });
  // eff ranged 50+8+3 = 61; roll 61*79 = 4819 -> (4819+320)/640 = 8.03 -> 8
  assert.equal(s.maxHit, 8);
  assert.equal(s.rangedMaxHit, 8);
});

test('item bonus mapping from our data fields', () => {
  const ironSword = { equip: 'weapon', style: 'melee', aBonus: 14, sBonus: 13, aStab: 14, aSlash: 10, aCrush: 0 };
  let b = C.itemBonuses(ironSword);
  assert.equal(b.stab, 14); assert.equal(b.slash, 10); assert.equal(b.crush, 0); assert.equal(b.str, 13); assert.equal(b.ranged, 0);
  b = C.itemBonuses({ equip: 'weapon', style: 'ranged', aBonus: 8, sBonus: 7 });
  assert.equal(b.ranged, 8); assert.equal(b.rStr, 7); assert.equal(b.str, 0);
  b = C.itemBonuses({ equip: 'weapon', style: 'magic', aBonus: 6, sBonus: 2 });
  assert.equal(b.magic, 6); assert.equal(b.str, 2); assert.equal(b.crush, 0);
  b = C.itemBonuses({ equip: 'head', dBonus: 1, magB: 2 });
  assert.equal(b.magic, 2);
  assert.deepEqual([b.dStab, b.dSlash, b.dCrush, b.dMagic, b.dRanged], [1, 1, 1, 1, 1]);
  b = C.itemBonuses({ equip: 'amulet', aBonus: 4 });
  assert.deepEqual([b.stab, b.slash, b.crush, b.ranged, b.magic], [4, 4, 4, 4, 0]);
  b = C.itemBonuses({ equip: 'body', dBonus: 2, prayB: 6 });
  assert.equal(b.prayer, 6);
});

test('weapon categories and style tables (combat.dbrow port)', () => {
  assert.equal(C.weaponCategory(null), 'unarmed');
  assert.equal(C.weaponCategory({ equip: 'weapon', style: 'melee', template: 'sword', aStab: 7, aSlash: 5 }), 'stab');
  assert.equal(C.weaponCategory({ equip: 'weapon', style: 'melee', template: 'sabre' }), 'slash');
  assert.equal(C.weaponCategory({ equip: 'weapon', style: 'melee', template: 'warhammer' }), 'blunt');
  assert.equal(C.weaponCategory({ equip: 'weapon', style: 'melee', model: 'sword', aStab: 0, aSlash: 0, aCrush: 30 }), 'blunt'); // maul on a sword model
  assert.equal(C.weaponCategory({ equip: 'weapon', style: 'melee', aStab: 11, aSlash: 5 }), 'stab');  // no model/template
  assert.equal(C.weaponCategory({ equip: 'weapon', style: 'ranged', model: 'bow' }), 'bow');
  assert.equal(C.weaponCategory({ equip: 'weapon', style: 'magic', model: 'staff' }), 'staff');
  const sword = { equip: 'weapon', style: 'melee', template: 'sword' };
  assert.deepEqual(C.styleFor(sword, 2), { label: 'Slash', style: 'aggressive', type: 'slash' });
  assert.equal(C.styleFor(sword, 9).style, 'defensive');       // clamped to the last button
  assert.equal(C.styleFor(null, 3).style, 'defensive');        // unarmed has 3 buttons
  assert.equal(C.styleFor({ style: 'ranged', equip: 'weapon' }, 1).style, 'ranged_rapid');
});

test('npc formulas: +9 effective, no prayer, protection zeroes the attack roll', () => {
  const skeleton = { level: 15, hp: 29, att: 14, str: 13, def: 12, aBonus: 8, sBonus: 9, dBonus: 7, dStab: 11, dSlash: 8, dCrush: 3, speedTicks: 4 };
  const L = C.npcLevels(skeleton);
  assert.equal(C.npcAttackRoll(skeleton, L, []), 23 * 72);        // 1656
  assert.equal(C.npcAttackRoll(skeleton, L, ['protect_melee']), 0);
  assert.equal(C.npcAttackRoll(skeleton, L, ['protect_magic']), 1656);
  assert.equal(C.npcMaxHit(skeleton, L), 3);                       // (22*73 + 320)/640 = 3.009
  assert.equal(C.npcDefenceRoll(skeleton, L, 'stab'), 21 * 75);    // 1575
  assert.equal(C.npcDefenceRoll(skeleton, L, 'crush'), 21 * 67);   // 1407
  assert.equal(C.npcDefenceRoll(skeleton, L, 'magic'), 21 * 71);   // no magic level: defence + flat dBonus
  assert.equal(C.npcAttackType(skeleton), 'crush');
  assert.equal(C.npcAttackType({ ranged: true }), 'magic');
  assert.equal(C.npcAttackType({ ranged: 'arrow' }), 'ranged');
  const caster = { att: 22, str: 20, def: 18, aBonus: 14, sBonus: 10, dBonus: 10, ranged: true };
  assert.equal(C.npcAttackRoll(caster, C.npcLevels(caster), ['protect_magic']), 0);
  assert.equal(C.npcAttackRoll(caster, C.npcLevels(caster), []), 31 * 78);
});

test('protection prayers against players cut the max hit by 40%', () => {
  assert.equal(C.pvpProtectedMaxHit(30), 18);
  assert.equal(C.pvpProtectedMaxHit(11), 6);   // 6.6 -> 6
  assert.equal(C.pvpProtectedMaxHit(1), 0);
  assert.equal(C.isProtected(['protect_melee'], 'slash'), true);
  assert.equal(C.isProtected(['protect_melee'], 'ranged'), false);
  assert.equal(C.isProtected(new Set(['protect_range']), 'ranged'), true);
});

test('hit roll is randomInc(attack) > randomInc(defence); damage is randomInc(max)', () => {
  let r = R.scripted([0.5, 0.25]);
  assert.equal(C.hitRoll(r, 100, 100), true);     // 50 > 25
  r = R.scripted([0.25, 0.5]);
  assert.equal(C.hitRoll(r, 100, 100), false);    // 25 > 50 is false
  r = R.scripted([0.999]);
  assert.equal(C.damageRoll(r, 10), 10);          // inclusive max
  r = R.scripted([0]);
  assert.equal(C.damageRoll(r, 10), 0);           // 0 is possible (2004: 0..max, not 1..max)
  // exact hit chance vs brute force enumeration
  for (const [a, d] of [[0, 0], [1, 0], [5, 9], [9, 5], [37, 37], [100, 3]]) {
    let wins = 0;
    for (let i = 0; i <= a; i++) for (let j = 0; j <= d; j++) if (i > j) wins++;
    assert.ok(Math.abs(C.hitChance(a, d) - wins / ((a + 1) * (d + 1))) < 1e-12, `hitChance(${a},${d})`);
  }
});

test('attack delays, rapid, magic and retaliation flinch', () => {
  const sword = { speedTicks: 4 }, bow = { speedTicks: 5 }, maul = { speedTicks: 6 }, great = { speedTicks: 7 };
  assert.equal(C.attackDelay(sword, 'accurate'), 4);
  assert.equal(C.attackDelay(bow, 'ranged_rapid'), 4);
  assert.equal(C.attackDelay(bow, 'ranged_accurate'), 5);
  assert.equal(C.attackDelay(null, 'accurate'), 4);
  assert.equal(C.attackDelay(sword, 'accurate', true), 5);
  assert.equal(C.retaliateDelay(sword, 'accurate'), 2);
  assert.equal(C.retaliateDelay(bow, 'ranged_accurate'), 2);
  assert.equal(C.retaliateDelay(bow, 'ranged_rapid'), 1);
  assert.equal(C.retaliateDelay(maul, 'accurate'), 3);
  assert.equal(C.retaliateDelay(great, 'accurate'), 3);
  assert.equal(C.npcRetaliateDelay({ speedTicks: 5 }), 2);
});

test('hit delays from projectile durations', () => {
  // arrows: duration 46 + 5d, delay (dur + 30) / 30
  assert.equal(C.rangedHitDelay(1), 2);
  assert.equal(C.rangedHitDelay(5), 3);
  assert.equal(C.rangedHitDelay(8), 3);
  assert.equal(C.rangedHitDelay(9), 4);
  assert.equal(C.rangedHitDelay(10), 4);
  assert.equal(C.rangedHitDelay(1, true), 2);
  // spells: duration 46 + 10d, delay dur/30 + 1
  assert.equal(C.magicHitDelay(1), 2);
  assert.equal(C.magicHitDelay(2), 3);
  assert.equal(C.magicHitDelay(4), 3);
  assert.equal(C.magicHitDelay(5), 4);
  assert.equal(C.magicHitDelay(10), 5);
  // npc projectiles on players
  assert.equal(C.npcRangedHitDelay(1), 1);
  assert.equal(C.npcRangedHitDelay(7), 2);
  assert.equal(C.npcMagicHitDelay(1), 1);
  assert.equal(C.npcMagicHitDelay(10), 4);
});

test('attack range', () => {
  const bow = { style: 'ranged', model: 'bow' }, longbow = { style: 'ranged', model: 'longbow' };
  assert.equal(C.attackRange(bow, 'ranged_accurate'), 7);
  assert.equal(C.attackRange(bow, 'ranged_longrange'), 9);
  assert.equal(C.attackRange(longbow, 'ranged_longrange'), 10);
  assert.equal(C.attackRange({ style: 'melee' }, 'accurate'), 0);
  assert.equal(C.attackRange(null, 'accurate', true), 10);
});

test('combat level (combat_level.rs2 integer form)', () => {
  const lv = (o) => Object.assign({ attack: 1, strength: 1, defence: 1, hitpoints: 10, prayer: 1, ranged: 1, magic: 1 }, o);
  assert.equal(C.combatLevel(lv({})), 3);
  assert.equal(C.combatLevel(lv({ attack: 99, strength: 99, defence: 99, hitpoints: 99, prayer: 99, ranged: 99, magic: 99 })), 126);
  assert.equal(C.combatLevel(lv({ hitpoints: 40, ranged: 70 })), 44);
  assert.equal(C.combatLevel(lv({ attack: 40, strength: 40, defence: 40, hitpoints: 40, prayer: 20 })), 48); // (10*90 + 13*80)/40 = 48.5
});

test('combat xp split in tenths (give_combat_experience)', () => {
  assert.deepEqual(C.combatXp('accurate', 10), { Attack: 400, Hitpoints: 133 });
  assert.deepEqual(C.combatXp('controlled', 10), { Attack: 133, Strength: 133, Defence: 133, Hitpoints: 133 });
  assert.deepEqual(C.combatXp('ranged_longrange', 7), { Ranged: 140, Defence: 140, Hitpoints: 93 });
  assert.deepEqual(C.combatXp('magic_normal', 12), { Magic: 240, Hitpoints: 159 });
  assert.deepEqual(C.combatXp('magic_defensive', 12), { Magic: 159, Defence: 120, Hitpoints: 159 });
  assert.deepEqual(C.combatXp('accurate', 0), { Attack: 0, Hitpoints: 0 });
  assert.equal(C.pvpXpMultiplier(3), 1000);
  assert.equal(C.pvpXpMultiplier(60), 1075);
  assert.equal(C.pvpXpMultiplier(126), 1125);                    // capped
  assert.deepEqual(C.combatXp('accurate', 10, 1075), { Attack: 430, Hitpoints: 142 });
  assert.equal(C.spellXp10({ baseXp: 5.5 }), 55);
  assert.equal(C.magicDamageStyle('defensive'), 'magic_defensive');
  assert.equal(C.magicDamageStyle('accurate'), 'magic_normal');
});

test('prayer drain timer (prayer.rs2)', () => {
  // protect from melee alone, no prayer bonus: 1 point every 5 ticks
  let st = C.prayerDrainTick(0, 12, 60);
  assert.deepEqual(st, { counter: 0, drained: 1 });
  // steel skin + protect melee: 2 points every 5 ticks
  assert.deepEqual(C.prayerDrainTick(0, 24, 60), { counter: 0, drained: 2 });
  // thick skin alone: counter 15, 30, 45, 60 -> 1 point on the 4th firing (every 20 ticks)
  let c = 0, total = 0;
  for (let i = 0; i < 4; i++) { st = C.prayerDrainTick(c, 3, 60); c = st.counter; total += st.drained; }
  assert.equal(total, 1); assert.equal(c, 0);
  // +5 prayer bonus -> resistance 70: 60 (none), 120 -> 1 (50), 110 -> 1 (40)
  assert.equal(C.prayerDrainResistance(5), 70);
  st = C.prayerDrainTick(0, 12, 70); assert.deepEqual(st, { counter: 60, drained: 0 });
  st = C.prayerDrainTick(60, 12, 70); assert.deepEqual(st, { counter: 50, drained: 1 });
  st = C.prayerDrainTick(50, 12, 70); assert.deepEqual(st, { counter: 40, drained: 1 });
  assert.equal(C.prayerDrainEffect(['protect_item', 'protect_melee']), 14);
  assert.deepEqual(C.prayerConflicts('protect_melee').sort(), ['protect_magic', 'protect_range']);
  assert.deepEqual(C.prayerConflicts('protect_item'), []);
  assert.deepEqual(C.prayerPercents(['reflexes', 'thick_skin']), { att: 110, str: 100, def: 105, rng: 100, mag: 100 });
});

test('eating delays (consume.rs2)', () => {
  assert.equal(C.canEat(0, 10), true);
  const after = C.applyEat({ actionDelay: 13 }, 10);
  assert.deepEqual(after, { eatDelay: 12, actionDelay: 16 });   // next attack pushed back 3 ticks
  assert.equal(C.canEat(12, 11), false);
  assert.equal(C.canEat(12, 12), false);
  assert.equal(C.canEat(12, 13), true);                          // one bite per 3 ticks
  // 2004 quirk: the 3 ticks are added to the STORED clock, so an old delay stays in the past
  assert.deepEqual(C.applyEat({ actionDelay: 2 }, 50), { eatDelay: 52, actionDelay: 5 });
});

test('special attack hook scales the attack roll and max hit', () => {
  assert.deepEqual(C.applySpecial({ acc: 1.3, dmg: 1.15 }, 1000, 20), { attackRoll: 1300, maxHit: 23 });
  assert.deepEqual(C.applySpecial(null, 1000, 20), { attackRoll: 1000, maxHit: 20 });
});
