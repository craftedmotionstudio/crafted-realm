#!/usr/bin/env node
/* ============================================================================
   Crafted Realm — combat-core test lock (headless, zero-dependency)

   Executes src/combat_math.js and src/game1_data.js in isolated `vm` contexts
   and asserts the OSRS-exact math the whole game is balanced on:
     - rollAccuracy matches the documented two-branch hit-chance formula
     - osrsMaxHit matches floor(0.5 + effStr*(bonus+64)/640) with a floor of 1
     - npcDef / npcWeakness pick the right defence splits
     - the XP curve hits the canonical OSRS checkpoints (83 / 1,154 / 101,333 /
       13,034,431) — a regression here corrupts every level in the game

   Exit code: 0 = locked, 1 = a formula regressed. Run after ANY combat edit:
       node tools/test_combat.js
   ========================================================================== */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let failures = 0;
function check(name, got, want, eps){
  const ok = (eps!==undefined) ? Math.abs(got-want)<=eps : got===want;
  if(ok){ console.log('  ok  ' + name); }
  else { failures++; console.error('  FAIL ' + name + ' — got ' + got + ', want ' + want); }
}

/* ---- combat_math.js ---- */
{
  const src = fs.readFileSync(path.join(ROOT,'src','combat_math.js'),'utf8');
  const ctx = vm.createContext({console, Math});
  vm.runInContext(src + '\n;__out={rollAccuracy, osrsMaxHit, npcDef, npcWeakness};', ctx);
  const {rollAccuracy, osrsMaxHit, npcDef, npcWeakness} = ctx.__out;

  console.log('combat_math.js:');
  // hit chance, both branches + the boundary
  check('rollAccuracy attacker ahead', rollAccuracy(100,50), 1-(52)/(2*101), 1e-12);
  check('rollAccuracy defender ahead', rollAccuracy(50,100), 50/(2*101), 1e-12);
  check('rollAccuracy equal rolls',    rollAccuracy(10,10), 10/22, 1e-12);
  check('rollAccuracy never >1',       rollAccuracy(1e9,0)<=1, true);
  check('rollAccuracy never <0',       rollAccuracy(0,1e9)>=0, true);
  // max hit
  check('osrsMaxHit(15,42)', osrsMaxHit(15,42), 2);
  check('osrsMaxHit(80,100)', osrsMaxHit(80,100), 21);
  check('osrsMaxHit floor of 1', osrsMaxHit(1,0), 1);
  check('osrsMaxHit(118,132)', osrsMaxHit(118,132), Math.floor(0.5+118*196/640));
  // defence splits
  check('npcDef flat fallback', npcDef({dBonus:5}, 'stab'), 5);
  check('npcDef split override', npcDef({dBonus:5, dStab:2}, 'stab'), 2);
  check('npcDef untyped', npcDef({dBonus:7, dStab:2}, null), 7);
  check('npcWeakness picks softest', npcWeakness({dStab:1, dSlash:9, dCrush:9, dBonus:5}), 'stab');
  check('npcWeakness flat => null', npcWeakness({dBonus:4}), null);
  check('npcWeakness even splits => null', npcWeakness({dStab:3, dSlash:3, dCrush:3}), null);
}

/* ---- XP curve (game1_data.js) ---- */
{
  const src = fs.readFileSync(path.join(ROOT,'src','game1_data.js'),'utf8');
  const ctx = vm.createContext({console, Math, JSON});
  vm.runInContext(src + '\n;__out={XP_TABLE, levelFromXp};', ctx);
  const {XP_TABLE, levelFromXp} = ctx.__out;

  console.log('XP curve (game1_data.js):');
  check('XP for level 2',  XP_TABLE[2], 83);
  check('XP for level 10', XP_TABLE[10], 1154);
  check('XP for level 50', XP_TABLE[50], 101333);
  check('XP for level 92 (half of 99)', XP_TABLE[92], 6517253);
  check('XP for level 99', XP_TABLE[99], 13034431);
  check('levelFromXp(0)', levelFromXp(0), 1);
  check('levelFromXp(83)', levelFromXp(83), 2);
  check('levelFromXp(13034431)', levelFromXp(13034431), 99);
  check('levelFromXp just below 99', levelFromXp(13034430), 98);
}

if(failures){ console.error('\n' + failures + ' combat-core regression(s). The OSRS-exact math is a hard gate — fix before shipping.'); process.exit(1); }
console.log('\nPASS — combat core locked.');
