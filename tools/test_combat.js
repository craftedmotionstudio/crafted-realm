#!/usr/bin/env node
/* ============================================================================
   Crafted Realm — combat numbers lock (re-baselined ONCE, deliberately, on 2026-09-26 for the owner's decision
   "exact 2004 combat rules everywhere"; before/after summary in docs/rebuild/combat_grade_passes/combat_agent.md).

   The client and the server now share ONE formula set, shared/combat.js (+ pvp.js, drops.js). This gate locks:
     1. golden values of the 2004 formulas (effective level, rolls, max hits, hit chance, delays, combat level, XP);
     2. 40,000-roll (>= 10,000) simulations per style (stab/slash/crush/ranged/magic), PvM and PvP, at three level/gear points:
        the simulated hit rate matches the exact hit chance within 1%; damage on a landed hit is uniform on 0..max;
     3. the XP curve checkpoints (83 / 1,154 / 101,333 / 13,034,431);
     4. the appraisal helpers left in src/combat_math.js (monster weakness);
     5. the seeded engine fingerprint (tools/combat_fingerprint.js through the REAL client engine, headless) against
        tools/fixtures/combat_fingerprint_2004.json; tools/qa_holm_combat_numbers.js proves the live game produces the
        same fingerprint. RECORD=1 rewrites the fixture (only on a deliberate rules change).
   Exit code: 0 = locked, 1 = a formula regressed. Run after ANY combat edit: node tools/test_combat.js
   ========================================================================== */
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const C=require('../shared/combat.js'),PVP=require('../shared/pvp.js'),RNG=require('../shared/rng.js');
let failures=0;
function check(name,got,want,eps){
  const ok=(eps!==undefined)?Math.abs(got-want)<=eps:JSON.stringify(got)===JSON.stringify(want);
  if(ok)console.log('  ok  '+name);else{failures++;console.error('  FAIL '+name+' — got '+JSON.stringify(got)+', want '+JSON.stringify(want))}
}

/* ---- 1. golden values ---- */
console.log('shared/combat.js golden values:');
check('effective level with a 15% prayer',C.effectiveLevel(40,115),46);
check('roll = effective * (bonus + 64)',C.roll(52,20),52*84);
check('max hit = floor((strength roll + 320) / 640)',C.maxHitFromRoll(60*(30+64)),Math.floor((60*94+320)/640));
// exact hit chance against an exhaustive count
for(const [a,d] of [[10,10],[37,12],[12,37],[0,5],[5,0],[640,576]]){let w=0;for(let x=0;x<=a;x++)for(let y=0;y<=d;y++)if(x>y)w++;
  check('hitChance('+a+','+d+') equals the exhaustive count',C.hitChance(a,d),w/((a+1)*(d+1)),1e-12)}
{const st=C.playerCombatStats({levels:{attack:40,strength:40,defence:40,ranged:40,magic:40},bonuses:C.equipmentBonuses([{equip:'weapon',style:'melee',aStab:14,aSlash:10,aCrush:0,sBonus:13,speedTicks:4}]),prayers:[],style:C.styleFor({equip:'weapon',style:'melee',aStab:14,aSlash:10,aCrush:0},0)});
 check('level 40, iron-sword stab (accurate): attack roll (40+8+3)*(14+64)',st.attackRoll.stab,51*78);
 check('level 40 accurate max hit floor(((40+8)*(13+64)+320)/640)',st.maxHit,Math.floor((48*77+320)/640));
 check('magic defence blends 70% magic, 30% defence, +8',st.effMagicDefence,Math.floor((7*40+3*40)/10)+8);}
{const bow={equip:'weapon',style:'ranged',aBonus:17,sBonus:15,speedTicks:5,model:'bow'};
 const st=C.playerCombatStats({levels:{attack:1,strength:1,defence:1,ranged:30,magic:1},bonuses:C.equipmentBonuses([bow]),prayers:[],style:C.styleFor(bow,0)});
 check('ranged accurate: (30+8+3)*(17+64)',st.attackRoll.ranged,41*81);check('ranged max hit uses the bow\'s ranged strength',st.maxHit,Math.floor((41*(15+64)+320)/640));}
check('npc max hit uses level + 9',C.npcMaxHit({str:12,sBonus:9},C.npcLevels({str:12,att:1,def:1,hp:1})),Math.floor((21*73+320)/640));
check('Protect from Melee zeroes an NPC melee roll',C.npcAttackRoll({att:50,aBonus:40},C.npcLevels({att:50,str:1,def:1,hp:1}),['protect_melee']),0);
check('protection vs players: max hit x 0.6',C.pvpProtectedMaxHit(25),15);
check('attack delays: dagger 4, 2h 7, bow rapid 4, magic 5',[C.attackDelay({speedTicks:4},'accurate'),C.attackDelay({speedTicks:7},'accurate'),C.attackDelay({speedTicks:5},'ranged_rapid'),C.attackDelay(null,'x',true)],[4,7,4,5]);
check('retaliation: floor(speed / 2)',[C.retaliateDelay({speedTicks:4},'accurate'),C.retaliateDelay({speedTicks:7},'accurate'),C.npcRetaliateDelay({speedTicks:5})],[2,3,2]);
check('arrow hit delay by distance 1..10',[1,2,3,4,5,6,7,8,9,10].map(d=>C.rangedHitDelay(d)),[1,2,3,4,5,6,7,8,9,10].map(d=>Math.floor((46+5*d+30)/30)));
check('spell hit delay by distance 1..10',[1,2,3,4,5,6,7,8,9,10].map(d=>C.magicHitDelay(d)),[1,2,3,4,5,6,7,8,9,10].map(d=>Math.floor((46+10*d)/30)+1));
check('NPC ranged / magic hit delays',[C.npcRangedHitDelay(5),C.npcMagicHitDelay(5)],[Math.floor((32+25)/30),Math.floor((46+50)/30)]);
check('attack range: shortbow 7, longrange +2, longbow 10 (cap), autocast 10, melee 0',[C.attackRange({style:'ranged',model:'bow'},'ranged_accurate'),C.attackRange({style:'ranged',model:'bow'},'ranged_longrange'),C.attackRange({style:'ranged',model:'longbow'},'ranged_longrange'),C.attackRange(null,'x',true),C.attackRange({style:'melee'},'accurate')],[7,9,10,10,0]);
check('combat level: a new adventurer is 3',C.combatLevel({attack:1,strength:1,defence:1,hitpoints:10,prayer:1,ranged:1,magic:1}),3);
check('combat level: maxed melee is 126',C.combatLevel({attack:99,strength:99,defence:99,hitpoints:99,prayer:99,ranged:1,magic:1}),126);
check('XP (tenths): accurate 4/dmg + 1.33 hp; controlled 1.33 x3; longrange 2+2; magic 2/dmg',[C.combatXp('accurate',10),C.combatXp('controlled',10),C.combatXp('ranged_longrange',10),C.combatXp('magic_normal',10)],
  [{Attack:400,Hitpoints:133},{Attack:133,Strength:133,Defence:133,Hitpoints:133},{Ranged:200,Defence:200,Hitpoints:133},{Magic:200,Hitpoints:133}]);
check('PvP XP bonus caps at 12.5%',[C.pvpXpMultiplier(3),C.pvpXpMultiplier(60),C.pvpXpMultiplier(126)],[1000,1075,1125]);
check('eating: next bite 3 ticks later, +3 on the attack timer',[C.canEat(12,12),C.canEat(12,13),C.applyEat({actionDelay:20},10)],[false,true,{eatDelay:12,actionDelay:23}]);
check('weapon categories: dagger stab, sabre slash, mace spiked, warhammer blunt, greatsword 2h, battleaxe axe, staff, bow',
  [{model:'sword'},{template:'sabre'},{template:'mace'},{template:'warhammer'},{template:'greatsword'},{template:'battleaxe'},{style:'magic'},{style:'ranged'}].map(d=>C.weaponCategory(Object.assign({equip:'weapon',style:'melee'},d))),
  ['stab','slash','spiked','blunt','twohanded','axe','staff','bow']);
check('kept on death: 3 priciest single units, 0 skulled, +1 Protect Item',[3,0,4].map((n,i)=>PVP.keptOnDeath([{id:'a',qty:5},{id:'b',qty:1},null],{weapon:'c',body:'d'},{skulled:i===1,protectItem:i===2,valueOf:id=>({a:100,b:50,c:80,d:10})[id]}).kept.reduce((s,k)=>s+k.qty,0)),[3,0,4]);

/* ---- 2. 40,000-roll (>= 10,000) simulations: hit rate within 1% of the exact chance; damage uniform on 0..max ---- */
const ROLLS=40000;   // >= the rubric's 10,000; at 40,000 a 1% error is a 4-sigma event, so the gate does not flake
console.log(ROLLS+'-roll simulations (PvM and PvP, every style, three level/gear points):');
const rng=RNG.create(20260926);
const W={dagger:{equip:'weapon',style:'melee',aStab:6,aSlash:3,aCrush:0,sBonus:3,speedTicks:4,model:'sword'},
  sabre:{equip:'weapon',style:'melee',aStab:18,aSlash:32,aCrush:0,sBonus:32,speedTicks:4,template:'sabre'},
  maul:{equip:'weapon',style:'melee',aStab:0,aSlash:0,aCrush:30,sBonus:44,speedTicks:6,template:'warhammer'},
  bow:{equip:'weapon',style:'ranged',aBonus:17,sBonus:15,speedTicks:5,model:'bow'},staff:{equip:'weapon',style:'magic',aBonus:13,speedTicks:5,model:'staff'}};
const armour=t=>[{equip:'body',dBonus:t*4},{equip:'legs',dBonus:t*3},{equip:'head',dBonus:t*2}];
const points=[{lv:5,t:0},{lv:40,t:2},{lv:80,t:6}];
let worst=0;
for(const pt of points){
  const levels={attack:pt.lv,strength:pt.lv,defence:pt.lv,ranged:pt.lv,magic:pt.lv};
  for(const [wk,idx,type] of [['dagger',0,'stab'],['sabre',1,'slash'],['maul',0,'crush'],['bow',0,'ranged'],['staff',0,'magic']]){
    const b=C.equipmentBonuses([W[wk]].concat(armour(pt.t))),st=C.playerCombatStats({levels,bonuses:b,prayers:[],style:C.styleFor(W[wk],idx)});
    const att=st.attackRoll[type];
    // PvM: a monster of the same level; PvP: an adventurer of the same level and armour
    const npc={att:pt.lv,str:pt.lv,def:pt.lv,hp:pt.lv*2,dBonus:pt.t*6};
    const foe=C.playerCombatStats({levels,bonuses:C.equipmentBonuses(armour(pt.t)),prayers:[],style:C.styleFor(null,0)});
    for(const [label,def] of [['PvM',C.npcDefenceRoll(npc,C.npcLevels(npc),type)],['PvP',foe.defenceRoll[type]]]){
      let h=0;for(let i=0;i<ROLLS;i++)if(C.hitRoll(rng,att,def))h++;
      const want=C.hitChance(att,def),got=h/ROLLS;worst=Math.max(worst,Math.abs(got-want));
      check(label+' '+type+' lvl '+pt.lv+' tier '+pt.t+': simulated '+got.toFixed(4)+' vs exact '+want.toFixed(4),got,want,0.01);
    }
  }
}
{let chi=0;const max=15,n=15000,c=new Array(max+1).fill(0);for(let i=0;i<n;i++)c[C.damageRoll(rng,max)]++;const e=n/(max+1);c.forEach(v=>chi+=(v-e)*(v-e)/e);
 check('damage 0..15 is uniform (chi-square '+chi.toFixed(1)+' < 30.6, the 1% critical value at 15 dof)',chi<30.6,true);}

/* ---- 3. XP curve ---- */
{const ctx=vm.createContext({console,Math,JSON});vm.runInContext(fs.readFileSync(path.join(ROOT,'src','game1_data.js'),'utf8')+'\n;__out={XP_TABLE,levelFromXp};',ctx);
 const {XP_TABLE,levelFromXp}=ctx.__out;const X=require('../shared/xp.js');
 console.log('XP curve (game1_data.js = shared/xp.js):');
 check('XP for level 2',XP_TABLE[2],83);check('XP for level 10',XP_TABLE[10],1154);check('XP for level 50',XP_TABLE[50],101333);
 check('XP for level 92 (half of 99)',XP_TABLE[92],6517253);check('XP for level 99',XP_TABLE[99],13034431);
 check('levelFromXp(83)',levelFromXp(83),2);check('levelFromXp just below 99',levelFromXp(13034430),98);
 check('client and shared curves are identical',JSON.stringify(XP_TABLE.slice(0,100)),JSON.stringify(X.XP_TABLE.slice(0,100)));}

/* ---- 4. appraisal helpers ---- */
{const ctx=vm.createContext({console,Math});vm.runInContext(fs.readFileSync(path.join(ROOT,'src','combat_math.js'),'utf8')+'\n;__out={npcDef,npcWeakness,legacy:typeof rollAccuracy+typeof osrsMaxHit};',ctx);
 const {npcDef,npcWeakness,legacy}=ctx.__out;console.log('combat_math.js (appraisal only):');
 check('no second formula set left in combat_math.js',legacy,'undefinedundefined');
 check('npcDef split override',npcDef({dBonus:5,dStab:2},'stab'),2);check('npcWeakness picks softest',npcWeakness({dStab:1,dSlash:9,dCrush:9,dBonus:5}),'stab');
 check('npcWeakness flat => null',npcWeakness({dBonus:4}),null);}

/* ---- 5. the seeded engine fingerprint ---- */
{console.log('engine fingerprint (real client engine, headless):');
 const H=require('./combat_engine_harness'),{combatFingerprint}=require('./combat_fingerprint');
 const h=H.create({wanderSeed:1});h.place(30,30);
 const env={LC:h.LC,Player:h.P,SPELLS:h.ctx.SPELLS,CRShared:h.ctx.CRShared,
   spawn:(id,dist,t)=>{const p=h.playerTile();const n=h.spawn(id,p.tx+dist,p.tz,{t});n.wanderR=0;return n},
   remove:n=>{const w=h.ctx.WORLD;[w.npcs,w.clickables].forEach(a=>{const i=a.indexOf(a===w.npcs?n:n.mesh);if(i>=0)a.splice(i,1)})},
   onHit:fn=>h.ctx.CombatHooks.on(fn),give:(id,q)=>h.P.addItem(id,q),setLevels:L=>h.setLevels(L)};
 const fp=combatFingerprint(env);
 const FIX=path.join(__dirname,'fixtures','combat_fingerprint_2004.json');
 if(fp.error){failures++;console.error('  FAIL fingerprint run: '+fp.error)}
 else if(process.env.RECORD==='1'){fs.mkdirSync(path.dirname(FIX),{recursive:true});fs.writeFileSync(FIX,JSON.stringify(fp));console.log('  recorded '+JSON.stringify(fp.summary))}
 else if(!fs.existsSync(FIX)){failures++;console.error('  FAIL no fixture: run RECORD=1 node tools/test_combat.js')}
 else{const base=JSON.parse(fs.readFileSync(FIX,'utf8'));
  check('fingerprint: '+fp.swings.length+' seeded attacks (4 melee, 3 ranged, 2 magic styles) match the 2004 baseline',JSON.stringify(fp.swings),JSON.stringify(base.swings));
  check('fingerprint: '+fp.npcHits.length+' seeded monster blows match',JSON.stringify(fp.npcHits),JSON.stringify(base.npcHits));
  console.log('  summary '+JSON.stringify(fp.summary))}}

console.log('\nworst simulated hit-rate error: '+(worst*100).toFixed(2)+'%');
if(failures){console.error('\n'+failures+' combat-core regression(s). The 2004 rules are a hard gate — fix before shipping.');process.exit(1)}
console.log('\nPASS — combat core locked (2004 rules, shared/combat.js).');
