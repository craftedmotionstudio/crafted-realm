#!/usr/bin/env node
/* Coffee on the offline client (src/coffee.js + Player.tickVitals), through the real sources in the headless harness:
 * items and shop stock, a sip (+20% run energy, next dose, 2 minutes caffeinated, no eat or attack delay), the slower
 * drain while running and its end, and brewing on a range (roasted beans + jug of water -> Coffee (4) + jug + XP).
 * Run: node tools/test_coffee.js */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const H=require('./combat_engine_harness');
let pass=0,fail=0;
function t(name,fn){try{fn();pass++;console.log('  ok  '+name)}catch(e){fail++;console.log('  FAIL '+name+'\n       '+(e&&e.stack||e).toString().split('\n').slice(0,3).join('\n       '))}}
function eq(a,b,m){if(a!==b)throw new Error((m||'')+' expected '+JSON.stringify(b)+' got '+JSON.stringify(a))}
function ok(c,m){if(!c)throw new Error(m||'assertion failed')}
function fresh(){
  const h=H.create({seed:7});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','src','coffee.js'),'utf8'),h.ctx,{filename:'src/coffee.js'});
  h.Coffee=vm.runInContext('Coffee',h.ctx);
  return h;
}
console.log('[COFFEE] offline client');

t('items: four doses and the roasted beans exist; the Commons store sells beans and coffee',()=>{
  const h=fresh(),I=h.ctx.ITEMS;
  ['coffee_4','coffee_3','coffee_2','coffee_1','roasted_beans'].forEach(id=>ok(I[id],id+' missing'));
  eq(I.coffee_4.name,'Coffee (4)');eq(I.coffee_1.name,'Coffee (1)');
  const S=vm.runInContext('SHOPS',h.ctx),ids=S.bazaar.stock.map(s=>s.id);
  ok(ids.includes('roasted_beans')&&ids.includes('coffee_4'),'bazaar stock: '+ids.join(','));
});

t('a sip: +20% run energy, the next dose, 2 minutes caffeinated, no eat or attack delay',()=>{
  const h=fresh(),P=h.P;
  P.inv=P.inv.map(()=>null);P.inv[3]={id:'coffee_4',qty:1};
  P.energy=40;P.eatDelay=5;P.actionDelay=9;
  ok(h.Coffee.sip(3),'sip handled');
  eq(Math.round(P.energy),60,'energy');eq(P.inv[3].id,'coffee_3');eq(P.caffeinated,120,'seconds caffeinated');
  eq(P.eatDelay,5,'eat delay untouched');eq(P.actionDelay,9,'attack delay untouched');
  ok(h.log.msgs.some(m=>/wide awake/.test(m[0])),'message');
  P.energy=95;h.Coffee.sip(3);eq(P.energy,100,'clamped at 100');
  h.Coffee.sip(3);h.Coffee.sip(3);eq(P.inv[3],null,'the last sip sets the mug aside');
  ok(!h.Coffee.sip(3),'nothing left to drink');
});

t('caffeinated: a running tick drains 25% less; the effect ends after 2 minutes with a message',()=>{
  const h=fresh(),P=h.P;
  P.inv=P.inv.map(()=>null);P.runOn=true;
  P.energy=80;P.caffeinated=0;P.tickVitals(0.6,true);const plain=80-P.energy;
  P.energy=80;P.caffeinated=120;P.tickVitals(0.6,true);const cafd=80-P.energy;
  ok(Math.abs(cafd-plain*0.75)<1e-9,'drain '+cafd+' vs '+plain);
  P.caffeinated=0.5;P.tickVitals(0.6,false);eq(P.caffeinated,0);
  ok(h.log.msgs.some(m=>/wears off/.test(m[0])),'wear-off message');
  P.energy=80;P.tickVitals(0.6,true);ok(Math.abs((80-P.energy)-plain)<1e-9,'back to the normal drain');
});

t('brewing: roasted beans + a jug of water on a range -> Coffee (4) + the jug + Cooking XP; missing water changes nothing',()=>{
  const h=fresh(),P=h.P;
  P.inv=P.inv.map(()=>null);P.inv[0]={id:'roasted_beans',qty:1};P.inv[5]={id:'jug_water',qty:1};
  const xp0=P.xp.Cooking||0;P.usingItem='roasted_beans';
  ok(h.Coffee.brewNow(),'brewed');
  ok(P.inv.some(s=>s&&s.id==='coffee_4'),'coffee');ok(P.inv.some(s=>s&&s.id==='jug'),'jug back');
  ok(!P.inv.some(s=>s&&(s.id==='roasted_beans'||s.id==='jug_water')),'ingredients used');
  ok((P.xp.Cooking||0)>xp0,'Cooking XP');eq(P.usingItem,null);
  P.inv=P.inv.map(()=>null);P.inv[0]={id:'roasted_beans',qty:1};
  ok(!h.Coffee.brewNow(),'no water: no brew');eq(P.inv[0].id,'roasted_beans');
  ok(h.log.msgs.some(m=>/bucket of water/.test(m[0])),'told what is missing');
});

t('death clears the caffeine',()=>{
  const src=fs.readFileSync(path.join(__dirname,'..','src','game3_systems.js'),'utf8');
  ok(/Player\.caffeinated\s*=\s*0/.test(src),'playerDeath resets Player.caffeinated');
  const save=fs.readFileSync(path.join(__dirname,'..','src','ui_save.js'),'utf8');
  ok(/caf:\s*Player\.caffeinated/.test(save)&&/Player\.caffeinated\s*=/.test(save),'saved and restored');
});

console.log(`[COFFEE] ${pass}/${pass+fail} ${fail?'FAIL':'PASS'}`);
process.exit(fail?1:0);
