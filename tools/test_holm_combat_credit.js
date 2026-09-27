/* Tutor's Holm combat credit: the killing blow's attack style survives equipment changes (re-based 2026-09-25 on the
 * 2004 combat engine, src/combat_engine.js). The style is captured when the attack is made (the queued hit carries
 * it), so switching weapons while a melee blow is queued or an arrow / spell is in the air still credits the style
 * that dealt it; administrative and unattributed kills never credit a styled lesson; a finished tutorial ignores
 * credit. Real sources in a vm (tools/combat_engine_harness.js) with the real tutorial extension listening. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const H=require('./combat_engine_harness');
const extension=fs.readFileSync(path.join(__dirname,'..','src','tutorial_ext.js'),'utf8');
let passed=0,failed=0;
function test(name,fn){try{fn();passed++;console.log(`PASS ${name}`)}catch(e){failed++;console.error(`FAIL ${name}: ${e.message}`)}}
function fixture(complete){
  const h=H.create({seed:3,tutorialComplete:!!complete});
  h.setLevels({Attack:99,Strength:99,Defence:40,Hitpoints:40,Ranged:99,Magic:99});h.place(20,20);
  vm.runInContext(extension,h.ctx,{filename:'src/tutorial_ext.js'});
  h.give('arrows',50);h.give('air_rune',50);h.give('mind_rune',50);
  const styles=()=>h.log.notified.filter(x=>x[0]==='killStyle');
  return {h,styles};
}
// a foe that dies to the first landed hit; a landed hit is certain at these levels only when it lands, so retry
function killWith(f,setup,switchTo,dist){
  const h=f.h;const n=h.spawn('pasturehen',20+(dist||1),20,{t:{hp:1,respawn:600}});
  setup(h);h.LC.orderAttack(n);
  for(let i=0;i<200&&!n.dead;i++){h.tick(1);if(switchTo!==undefined)h.wield(switchTo)}
  return n;
}
for(const [style,setup,sw,dist] of [
  ['melee',h=>{h.wield('bronze_sword')},'worn_bow',1],
  ['ranged',h=>{h.wield('worn_bow')},'bronze_sword',6],
  ['magic',h=>{h.wield(null);h.P.castSpell='wind_strike'},'bronze_sword',6]]){
  test(`${style} killing blow credits ${style} even after the weapon is switched mid-flight`,()=>{
    const f=fixture();
    // retry the single cast until the lethal hit lands (a spell can splash)
    let n=null;for(let k=0;k<20&&!(n&&n.dead);k++){if(n&&!n.dead){if(style==='magic')f.h.P.castSpell='wind_strike';f.h.LC.orderAttack(n);for(let i=0;i<30&&!n.dead;i++){f.h.tick(1);f.h.wield(sw)}}else n=killWith(f,setup,sw,dist)}
    assert.ok(n.dead,'the foe died');
    assert.deepEqual(f.styles(),[['killStyle',style]]);
    const ev=f.h.log.events.find(e=>e[0]==='npcKilled');
    assert.equal(ev[1].npc,n);assert.equal(ev[1].attackStyle,style);
    assert.deepEqual(f.h.log.notified.filter(x=>x[0]==='kill'),[['kill','pasturehen']]);
  });
}
test('administrative kill has null provenance and no styled tutorial credit',()=>{
  const f=fixture();const n=f.h.spawn('pasturehen',21,20);f.h.ctx.killNpc(n,{silent:true,noQuest:true});
  const ev=f.h.log.events.find(e=>e[0]==='npcKilled');assert.equal(ev[1].attackStyle,null);assert.deepEqual(f.styles(),[]);
});
test('a legacy scripted hit (applyHit) kills through the engine without styled credit',()=>{
  const f=fixture();const n=f.h.spawn('pasturehen',21,20,{t:{hp:3}});f.h.ctx.applyHit(n,5,'Attack');f.h.tick(2);
  assert.ok(n.dead);assert.deepEqual(f.styles(),[]);assert.equal(f.h.log.xp.length,0);
});
for(const payload of [undefined,null,{},{attackStyle:null},{attackStyle:'unknown'},{attackStyle:'Ranged'},{attackStyle:1}]){
  test(`untrusted/missing event style refuses credit: ${JSON.stringify(payload)}`,()=>{
    const f=fixture();f.h.ctx.Events.emit('npcKilled',payload);assert.deepEqual(f.styles(),[]);
  });
}
for(const style of ['melee','ranged','magic']){
  test(`completed tutorial ignores ${style} credit`,()=>{
    const f=fixture(true);const n=f.h.spawn('pasturehen',21,20);f.h.ctx.killNpc(n,{attackStyle:style});
    assert.deepEqual(f.styles(),[]);assert.equal(f.h.log.events.find(e=>e[0]==='npcKilled')[1].attackStyle,style);
  });
}
test('a zero-damage blow awards no combat XP and no kill',()=>{
  const f=fixture();f.h.setLevels({Attack:1,Strength:1,Defence:1,Hitpoints:10});const n=f.h.spawn('pasturehen',21,20,{t:{hp:500,def:99,dBonus:500}});
  f.h.wield('bronze_sword');f.h.LC.orderAttack(n);f.h.tick(12);
  const dealt=f.h.log.hits.filter(x=>x.obj===n.mesh).reduce((a,x)=>a+x.dmg,0),xp=f.h.log.xp.filter(x=>x.skill!=='Magic');
  assert.equal(dealt===0,xp.length===0);assert.ok(!n.dead);
});
test('duel defeat keeps its own victory path without tutorial credit',()=>{
  const f=fixture();let wins=0;const n=f.h.spawn('pasturehen',21,20,{t:{hp:1}});
  const D=vm.runInContext('Duel',f.h.ctx);Object.assign(D,{active:true,npc:n,win(){wins++}});f.h.ctx.killNpc(n,{attackStyle:'melee'});D.active=false;
  assert.equal(wins,1);assert.deepEqual(f.styles(),[]);
});
console.log(`[HOLM_COMBAT_CREDIT] ${passed}/${passed+failed} PASS`);
if(failed)process.exitCode=1;
