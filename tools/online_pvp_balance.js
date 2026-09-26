/* online_pvp_balance.js — PvP matchups for the W2 online alpha kits (COMBAT_GRADE criteria 18 + 19).
 * Reads the alpha kits and start levels from server/data/maps/scarlands_test.json, the items and spells from the
 * client's own data (server/content/GameData, the same numbers the server uses), and the 2004 rules from
 * shared/combat.js. For every attacker kit vs defender kit (with and without the defender's protection prayer) it
 * prints the hit chance, max hit, attack speed and damage per tick, then simulates 2000 duels between the two kits
 * (both attack on their own clocks, eat a trout at <= 45% hitpoints like a player would, with the 3-tick bite and
 * +3 attack delay) and reports the win rate and the median / p90 fight length in seconds.
 * It also prints the PvM table: every kit against every monster type on the test map (time to kill, damage taken
 * per kill, with and without the matching protection prayer), so the alpha's monsters sit in a sensible band.
 * Run: node tools/online_pvp_balance.js [--json out.json]
 */
'use strict';
const path = require('path');
const fs = require('fs');
const C = require('../shared/combat.js');
const RNG = require('../shared/rng.js');
const GameData = require('../server/content/GameData');

const G = GameData.get();
const MAP = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'server', 'data', 'maps', 'scarlands_test.json'), 'utf8'));
const ALPHA = MAP.alpha;
const LV = ALPHA.startStats;

function kitSetup(name, override) {
  const k = override || ALPHA.kits[name];
  const worn = Object.values(k.equip).map((id) => G.ITEMS[id]);
  const weapon = G.ITEMS[k.equip.weapon];
  const style = C.styleFor(weapon, k.style | 0);
  const spell = k.autocast ? G.SPELLS[k.autocast] : null;
  const food = (k.inv || []).filter(([id]) => G.ITEMS[id] && G.ITEMS[id].heal > 0).reduce((n, [, q]) => n + q, 0);
  const heal = (k.inv || []).map(([id]) => G.ITEMS[id]).filter((d) => d && d.heal > 0).map((d) => d.heal)[0] || 0;
  return { name, weapon, style, spell, bonuses: C.equipmentBonuses(worn), food, heal };
}
function stats(setup, prayers) {
  return C.playerCombatStats({
    levels: { attack: LV.Attack, strength: LV.Strength, defence: LV.Defence, ranged: LV.Ranged, magic: LV.Magic },
    bonuses: setup.bonuses, prayers: prayers || [], style: setup.style,
  });
}
/** the attack as the server resolves it: type, attack roll, max hit, ticks per attack */
function attackOf(setup, prayers) {
  const s = stats(setup, prayers);
  if (setup.spell) return { type: 'magic', roll: s.attackRoll.magic, max: setup.spell.max, rate: C.MAGIC_ATTACK_RATE };
  const type = setup.style.type;
  return { type, roll: s.attackRoll[type], max: type === 'ranged' ? s.rangedMaxHit : s.meleeMaxHit, rate: C.attackDelay(setup.weapon, setup.style.style, false) };
}
function protectFor(type) { return type === 'magic' ? 'protect_magic' : type === 'ranged' ? 'protect_range' : 'protect_melee'; }

function row(a, d, protect) {
  const atk = attackOf(a, []);
  const dPr = protect ? [protectFor(atk.type)] : [];
  const def = stats(d, dPr).defenceRoll[atk.type];
  const chance = C.hitChance(atk.roll, def);
  const max = protect ? C.pvpProtectedMaxHit(atk.max) : atk.max;
  const dpt = chance * (max / 2) / atk.rate;   // 0..max uniform on a hit
  return { attacker: a.name, defender: d.name, protect: !!protect, type: atk.type, hitChance: +chance.toFixed(3), maxHit: max, rate: atk.rate, dmgPerTick: +dpt.toFixed(3), ttkNoFoodSec: +((LV.Hitpoints / dpt) * 0.6).toFixed(1) };
}

/** a duel between two kits, both starting in reach (the attacker hits first, the defender retaliates) */
function duel(rng, A, B, opts) {
  const o = opts || {};
  const side = (s, other) => {
    const atk = attackOf(s, []);
    return { s, atk, hp: LV.Hitpoints, food: s.food, heal: s.heal, next: 0, eatDelay: -1, prot: o.protect ? protectFor(attackOf(other, []).type) : null };
  };
  const a = side(A, B), b = side(B, A);
  b.next = 1 + Math.floor(a.atk.rate / 2);    // retaliation flinch
  const hitsA = [], queue = [];
  for (let t = 0; t < 2000; t++) {
    for (const [me, them] of [[a, b], [b, a]]) {
      if (me.hp <= 0) continue;
      // eat at <= 45% (one bite per 3 ticks, +3 on the attack clock)
      if (me.hp <= LV.Hitpoints * 0.45 && me.food > 0 && t > me.eatDelay) { me.food--; me.hp = Math.min(LV.Hitpoints, me.hp + me.heal); me.eatDelay = t + C.EAT_DELAY; me.next += C.EAT_ATTACK_DELAY; }
      if (t >= me.next) {
        const def = stats(them.s, them.prot ? [them.prot] : []).defenceRoll[me.atk.type];
        let dmg = 0;
        if (C.hitRoll(rng, me.atk.roll, def)) dmg = C.damageRoll(rng, them.prot ? C.pvpProtectedMaxHit(me.atk.max) : me.atk.max);
        // pvp hit delays at 4 tiles: melee 0, arrows floor((46+5d)/30) = 2, spells floor((46+10d)/30)+1 = 3
        const delay = me.atk.type === 'ranged' ? 2 : me.atk.type === 'magic' ? 3 : 0;
        queue.push({ at: t + delay, to: them, dmg });
        me.next = t + me.atk.rate;
      }
    }
    for (let i = queue.length - 1; i >= 0; i--) if (queue[i].at <= t) { const q = queue.splice(i, 1)[0]; if (q.to.hp > 0) q.to.hp = Math.max(0, q.to.hp - q.dmg); }
    if (a.hp <= 0 || b.hp <= 0) return { winner: a.hp > 0 ? 'a' : 'b', ticks: t };
  }
  return { winner: null, ticks: 2000 };
}

function main() {
  const names = Object.keys(ALPHA.kits);
  const setups = names.map((n) => kitSetup(n));
  const rows = [];
  for (const a of setups) for (const d of setups) for (const p of [false, true]) rows.push(row(a, d, p));
  const rng = RNG.create(20260925);
  const duels = [];
  for (const A of setups) for (const B of setups) {
    for (const protect of [false, true]) {
      let winsA = 0; const len = [];
      for (let i = 0; i < 2000; i++) { const r = duel(rng, A, B, { protect }); if (r.winner === 'a') winsA++; len.push(r.ticks); }
      len.sort((x, y) => x - y);
      duels.push({ a: A.name, b: B.name, protect, winRateA: +(winsA / 2000).toFixed(3), medianSec: +(len[1000] * 0.6).toFixed(1), p90Sec: +(len[1800] * 0.6).toFixed(1) });
    }
  }
  const cb = C.combatLevel({ attack: LV.Attack, strength: LV.Strength, defence: LV.Defence, hitpoints: LV.Hitpoints, prayer: LV.Prayer, ranged: LV.Ranged, magic: LV.Magic });
  console.log(`Alpha start levels ${JSON.stringify(LV)} -> combat level ${cb}`);
  console.log('\nattacker  defender  prayer   type    hit%   max  rate  dmg/tick  ttk(no food)');
  for (const r of rows) console.log(`${r.attacker.padEnd(9)} ${r.defender.padEnd(9)} ${(r.protect ? 'protect' : '-').padEnd(8)} ${r.type.padEnd(7)} ${(r.hitChance * 100).toFixed(1).padStart(5)}  ${String(r.maxHit).padStart(3)}  ${String(r.rate).padStart(4)}  ${r.dmgPerTick.toFixed(3).padStart(8)}  ${String(r.ttkNoFoodSec).padStart(6)}s`);
  console.log('\nduel (both eat at <=45%)          A wins   median   p90');
  for (const d of duels) console.log(`${(d.a + ' vs ' + d.b + (d.protect ? ' +prot' : '')).padEnd(32)} ${(d.winRateA * 100).toFixed(1).padStart(6)}%  ${String(d.medianSec).padStart(6)}s ${String(d.p90Sec).padStart(6)}s`);
  const pvm = pvmTable(setups);
  console.log('\nPvM (per kill)                 hit%  max  ttk     taken  taken+prot  monster hit%  max');
  for (const r of pvm) console.log(`${(r.kit + ' vs ' + r.npc).padEnd(28)} ${(r.hitChance * 100).toFixed(1).padStart(5)} ${String(r.maxHit).padStart(4)} ${String(r.ttkSec).padStart(5)}s ${String(r.takenPerKill).padStart(7)} ${String(r.takenProtected).padStart(9)}  ${(r.npcHitChance * 100).toFixed(1).padStart(10)}% ${String(r.npcMax).padStart(4)}`);
  const i = process.argv.indexOf('--json');
  if (i > 0) fs.writeFileSync(process.argv[i + 1], JSON.stringify({ levels: LV, combatLevel: cb, rows, duels, pvm }, null, 2));
}
/** each kit against each monster type the test map spawns: expected time to kill and damage taken per kill */
function pvmTable(setups) {
  const types = Array.from(new Set(MAP.spawns.map((s1) => s1.npc)));
  const out = [];
  for (const s1 of setups) for (const ty of types) {
    const def = G.NPC_TYPES[ty], lv = C.npcLevels(def), atk = attackOf(s1, []);
    const chance = C.hitChance(atk.roll, C.npcDefenceRoll(def, lv, atk.type)), max = Math.min(atk.max, def.maxDealt != null ? def.maxDealt : atk.max);
    const perTick = chance * (max / 2) / atk.rate, ttk = def.hp / Math.max(1e-9, perTick);
    const ntype = C.npcAttackType(def), prot = ntype === 'magic' ? 'protect_magic' : ntype === 'ranged' ? 'protect_range' : 'protect_melee';
    const pdef = stats(s1, []).defenceRoll[ntype], nAtk = C.npcAttackRoll(def, lv, []), nMax = C.npcMaxHit(def, lv), nRate = def.speedTicks || 4;
    const nChance = C.hitChance(nAtk, pdef), taken = ttk * nChance * (nMax / 2) / nRate;
    const nAtkP = C.npcAttackRoll(def, lv, [prot]), takenP = ttk * C.hitChance(nAtkP, pdef) * (nMax / 2) / nRate;
    out.push({ kit: s1.name, npc: ty, level: def.level, hp: def.hp, hitChance: +chance.toFixed(3), maxHit: max, ttkSec: +(ttk * 0.6).toFixed(1), takenPerKill: +taken.toFixed(1), takenProtected: +takenP.toFixed(1), npcHitChance: +nChance.toFixed(3), npcMax: nMax, npcType: ntype });
  }
  return out;
}
if (require.main === module) main();
module.exports = { kitSetup, attackOf, duel, row, RNG };
