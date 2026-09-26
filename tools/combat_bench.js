#!/usr/bin/env node
/* Combat bench (node): the numbers behind the grade (docs/rebuild/COMBAT_GRADE.md criteria 1, 2, 18, 19).
 *   A. PvM time-to-kill per style and tier: the REAL client engine (tools/combat_engine_harness.js) fights monsters of
 *      about the adventurer's level, N fights each, without food and with 6 trout: kill time (mean, spread), the
 *      adventurer's survival rate, damage taken, XP per hour.
 *   B. PvP matchups on the AUTHORITATIVE server engine (server/engine World + headless players, shared/ rules):
 *      melee vs ranged vs magic at equal levels, each in the best gear of its own style the level allows, N fights per
 *      pairing, both players attacking from 4 tiles apart in the Wilderness; win rates and fight lengths (mean, spread,
 *      10th-90th percentile). Variants: no food; food (10 trout: eat at half health or when one max hit could finish
 *      you, then click again, the 2004 rhythm); food + prayers on both sides (the protection prayer against the
 *      opponent's style when the level allows it, plus the stat prayers of your own style); the underdog's best play
 *      (only the triangle's loser prays); and the counter-armour switch (the blade in ranged armour against a mage).
 *   C. Mirror fights (the same style both sides) for the "sensible fight length" of criterion 18.
 * Writes docs/rebuild/combat_grade_passes/bench_<tag>.json and .md.
 * Run: node tools/combat_bench.js [tag] [--quick] [--pvp-only] [--pvm-only] */
'use strict';
const fs=require('fs'),path=require('path');
const H=require('./combat_engine_harness');
const C=require('../shared/combat.js');
const args=process.argv.slice(2),QUICK=args.includes('--quick'),PVP_ONLY=args.includes('--pvp-only'),PVM_ONLY=args.includes('--pvm-only'),TAG=args.find(a=>!a.startsWith('--'))||'latest';
const OUT=path.join(__dirname,'..','docs','rebuild','combat_grade_passes');
const N_PVM=QUICK?8:30,N_PVP=QUICK?20:100;
// PvP level points: 25 (every style has gear of level 20-25), 40 (every ladder's top) and 60 (top gear, higher levels)
const PVP_LEVELS=[25,40,60];
const base=H.create({seed:1});const ITEMS=base.ctx.ITEMS,NPC=base.ctx.NPC_TYPES,SPELLS=base.ctx.SPELLS;
const ALIAS={bronze_platebody:'bronze_plate',bronze_platelegs:'bronze_legs',bronze_hatchet:'hatchet',bronze_pickaxe:'pickaxe'};
const item=id=>ITEMS[id]?id:ITEMS[ALIAS[id]]?ALIAS[id]:null;
const TIERS=[['bronze',1],['iron',5],['steel',10],['whitsteel',15],['aurel',20],['veyrite',30],['undercrag',40]];
const tierFor=L=>TIERS.filter(t=>t[1]<=L).pop()[0];
const spellFor=L=>Object.keys(SPELLS).filter(k=>SPELLS[k].max!=null&&!SPELLS[k].utility&&SPELLS[k].req<=L).sort((a,b)=>SPELLS[b].max-SPELLS[a].max)[0];
/** the ranged armour a level allows (body, legs, hands, feet) */
function rangedArmour(L){
  if(L>=40)return {body:'fenhide_body',legs:'fenhide_chaps',hands:'fenhide_vambraces',feet:'leather_boots'};
  if(L>=20)return {body:'riveted_body',legs:'riveted_chaps',hands:'leather_gloves',feet:'leather_boots'};
  return {body:'leather_body',legs:'leather_chaps',hands:'leather_gloves',feet:'leather_boots'};
}
/** the best gear of each style's own ladder at level L (opts.counter: the blade wears ranged armour, keeps helm/shield) */
function loadout(style,L,opts){
  const t=tierFor(L);opts=opts||{};
  if(style==='melee'){const worn={head:item(t+'_helm'),body:item(t+'_platebody'),legs:item(t+'_platelegs'),shield:item(t+'_kiteshield')};
    if(opts.counter)Object.assign(worn,rangedArmour(L));
    return {weapon:item(t+'_sabre'),worn,styleIndex:1,inv:[]}}
  // ranged: the shortbow (the 2004 PKer's choice: 4 ticks, rapid 3); the longbow trades speed for 10-tile reach
  if(style==='ranged')return {weapon:L>=40?'duskwood_bow':L>=30?'blackthorn_bow':L>=10?'ash_bow':'worn_bow',worn:rangedArmour(L),styleIndex:1,inv:[['arrows',5000]]};
  // magic: the best staff and robes the level allows (glimmer from 15, starweave from 40), autocasting the strongest spell
  const sp=spellFor(L);const robes=L>=40?{head:'starweave_hat',body:'starweave_robe_top',legs:'starweave_robe_skirt'}:L>=15?{head:'glimmer_hat',body:'glimmer_robe_top',legs:'cloth_robe_skirt'}:{head:'wizard_hat',body:'cloth_robe_top',legs:'cloth_robe_skirt'};
  return {weapon:L>=25?'storm_staff':L>=10?'ember_staff':'apprentice_staff',worn:robes,styleIndex:0,autocast:sp,
    inv:Object.keys(SPELLS[sp].runes).map(r=>[r,5000])};
}
const levelsOf=L=>({Attack:L,Strength:L,Defence:L,Hitpoints:Math.max(10,L),Ranged:L,Magic:L,Prayer:Math.min(99,Math.max(1,L))});
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const sd=a=>{if(a.length<2)return 0;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/(a.length-1))};
const pctl=(a,p)=>{if(!a.length)return 0;const s=a.slice().sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.max(0,Math.round(p*(s.length-1))))]};
const pct=(a,b)=>b?Math.round(100*a/b):0;
const sec=t=>+(t*0.6).toFixed(1);
function spread(ticks){return {avgSec:sec(mean(ticks)),sdSec:sec(sd(ticks)),p10Sec:sec(pctl(ticks,0.1)),p90Sec:sec(pctl(ticks,0.9)),minSec:sec(Math.min(...ticks)),maxSec:sec(Math.max(...ticks))}}

/* ------------------------------------------------------------------------ A. PvM time to kill */
function pvm(){
  const monsters=Object.keys(NPC).filter(k=>{const t=NPC[k];return !t.harmless&&!t.script&&t.att>=1&&t.hp>=3&&t.level>=2&&!t.glb}).map(k=>[k,NPC[k].level]).sort((a,b)=>a[1]-b[1]);
  const points=[5,15,25,40];const rows=[];
  for(const food of [0,6])for(const L of points){
    const mon=monsters.reduce((b,m)=>Math.abs(m[1]-L)<Math.abs(b[1]-L)?m:b)[0];
    for(const style of ['melee','ranged','magic']){
      const h=H.create({seed:1000+L});h.setLevels(levelsOf(L));h.place(20,20);
      const lo=loadout(style,L);h.wield(lo.weapon);for(const s in lo.worn)h.wear(s,lo.worn[s]);lo.inv.forEach(([id,q])=>h.give(id,q));
      h.P.styleIndex=lo.styleIndex;if(lo.autocast){h.P.autocast=lo.autocast;h.P.spell=lo.autocast}
      h.P.autoRetaliate=true;
      const ttk=[],taken=[];let wins=0;
      for(let f=0;f<N_PVM;f++){
        h.P.hp=h.P.maxHp;h.P.dead=false;h.place(20,20);h.LC.clearInteraction();
        for(let i=h.P.count('trout');i<food;i++)h.give('trout',1);
        const n=h.spawn(mon,23,20,{t:{respawn:600}});n.wanderR=0;const hp0=h.P.hp,t0=h.LC.clock();h.LC.orderAttack(n);
        // with food: eat at half health (the bite drops the order), then click the foe again, the 2004 rhythm
        const r=h.until(()=>{if(food&&h.P.hp>0&&h.P.hp<=h.P.maxHp/2){const s=h.P.inv.findIndex(x=>x&&x.id==='trout');if(s>=0&&h.P.eatDelay<h.LC.clock()){h.LC.eat(s);h.LC.orderAttack(n)}}
          return n.dead||h.P.dead||h.P.hp<=0},1500);
        if(n.dead){wins++;ttk.push(h.LC.clock()-t0)}taken.push(hp0-Math.max(0,h.P.hp));
        const w=h.ctx.WORLD;[w.npcs,w.clickables].forEach(a=>{const i=a.indexOf(a===w.npcs?n:n.mesh);if(i>=0)a.splice(i,1)});
        if(h.P.dead||h.P.hp<=0)h.tick(8);
      }
      const xpTotal=h.log.xp.filter(x=>x.skill!=='Hitpoints').reduce((s,x)=>s+x.amt,0),ticks=ttk.reduce((s,x)=>s+x,0)||1;
      rows.push({food,L,style,monster:mon,monsterLevel:NPC[mon].level,weapon:lo.weapon,fights:N_PVM,wins,ttkTicks:+mean(ttk).toFixed(1),ttkSec:sec(mean(ttk)),
        ttkSdSec:sec(sd(ttk)),ttkP10Sec:sec(pctl(ttk,0.1)),ttkP90Sec:sec(pctl(ttk,0.9)),
        dmgTaken:+mean(taken).toFixed(1),hp:h.P.maxHp,xpPerHour:Math.round(xpTotal/(ticks*0.6)*3600)});
    }
  }
  return rows;
}

/* ------------------------------------------------------------------------ B/C. PvP on the server engine */
const {fieldWorld,addPlayer}=require('../server/test/helpers');
/** the prayers a player of this style turns on at level L against oppStyle (2004 book: protection 37/40/43);
 *  mode 'protect' = the protection prayer only, 'all' = protection plus the stat prayers of the player's own style */
function prayersFor(style,L,oppStyle,mode){
  const best=l=>{const x=l.find(p=>p[1]<=L);return x&&x[0]};
  const out=[],prot={melee:['protect_melee',43],ranged:['protect_range',40],magic:['protect_magic',37]}[oppStyle];
  if(prot[1]<=L)out.push(prot[0]);
  if(mode==='protect')return out;
  const own={melee:[['incredible_ref',34],['reflexes',16],['clarity',7]],ranged:[['hawk_eye',26],['sharp_eye',8]],magic:[['mystic_lore',27],['mystic_will',9]]}[style];
  if(best(own))out.push(best(own));
  if(style==='melee'){const s=best([['ultimate_str',31],['superhuman',13],['burst_str',4]]);if(s)out.push(s)}
  return out;
}
function pvpFight(seed,L,sa,sb,opts){
  const w=fieldWorld({},seed);
  const mk=(name,style,x,counter)=>{const lo=loadout(style,L,{counter}),inv=lo.inv.slice();if(opts.food)inv.push(['trout',opts.food]);
    const eq=Object.assign({weapon:lo.weapon},lo.worn);return addPlayer(w,name,{levels:levelsOf(L),pos:{x,z:30},equip:eq,inv,style:lo.styleIndex,autocast:lo.autocast||null,autoRetaliate:true})};
  const A=mk('a'+seed,sa,10,opts.counterA),B=mk('b'+seed,sb,14,opts.counterB);
  if(opts.prayA)prayersFor(sa,L,sb,opts.prayA).forEach(id=>A.s.intent({t:'prayer',id,on:true}));
  if(opts.prayB)prayersFor(sb,L,sa,opts.prayB).forEach(id=>B.s.intent({t:'prayer',id,on:true}));
  A.s.intent({t:'op_player',pid:B.p.pid,op:'attack'});B.s.intent({t:'op_player',pid:A.p.pid,op:'attack'});
  const t0=w.tick;let winner=null;
  for(let i=0;i<1500&&!winner;i++){
    for(const [me,them] of [[A,B],[B,A]]){const p=me.p;
      if(p.dead)continue;
      // eat like a player who watches the other's max hit: at half health, or sooner when one hit could finish you
      const o=them.p,oMax=o.autocast&&SPELLS[o.autocast]?SPELLS[o.autocast].max:o.combatStats().stats.maxHit;
      if(opts.food&&p.hp<=Math.max(Math.floor(p.maxHp/2),oMax+1)){const slot=p.inv.findIndex(s=>s&&s.id==='trout');if(slot>=0&&p.eatDelay<w.tick){me.s.intent({t:'eat',slot});me.s.intent({t:'op_player',pid:them.p.pid,op:'attack'})}}
      else if(!p.target&&!them.p.dead)me.s.intent({t:'op_player',pid:them.p.pid,op:'attack'});
    }
    w.cycle();
    if(A.p.dead)winner='b';else if(B.p.dead)winner='a';
  }
  const ticks=w.tick-t0;try{w.collision.unload()}catch(e){}
  return {winner,ticks};
}
// the triangle: the first style of each pairing is favoured over the second
const PAIRS=[['melee','ranged'],['ranged','magic'],['magic','melee']];
/** N fights of fav vs dog, sides alternated; v = {food, prayFav, prayDog, counterDog} */
function matchup(L,fav,dog,v,seed0){
  let a=0,b=0,draws=0;const len=[];
  for(let k=0;k<N_PVP;k++){const flip=k%2===1;
    const o={food:v.food,prayA:flip?v.prayDog:v.prayFav,prayB:flip?v.prayFav:v.prayDog,counterA:flip?v.counterDog:false,counterB:flip?false:v.counterDog};
    const r=pvpFight(seed0+k,L,flip?dog:fav,flip?fav:dog,o);
    const wi=r.winner===null?null:((r.winner==='a')!==flip?'fav':'dog');if(wi==='fav')a++;else if(wi==='dog')b++;else draws++;len.push(r.ticks)}
  return Object.assign({aWins:a,bWins:b,draws,fights:N_PVP,aPct:pct(a,N_PVP)},spread(len));
}
function pvp(){
  const rows=[],mirrors=[];
  const VARIANTS=[{name:'no food'},{name:'food',food:10},{name:'food + protection prayers',food:10,prayFav:'protect',prayDog:'protect'},{name:"underdog's best play",food:10,prayDog:'all'}];
  for(const L of PVP_LEVELS){
    for(const v of VARIANTS)for(const [fav,dog] of PAIRS)rows.push(Object.assign({L,variant:v.name,a:fav,b:dog},matchup(L,fav,dog,v,7000+L*100)));
    // the counter-armour switch: the blade meets a mage in ranged armour (helm, shield and sabre kept)
    rows.push(Object.assign({L,variant:'food, blade in ranged armour',a:'magic',b:'melee'},matchup(L,'magic','melee',{food:10,counterDog:true},7000+L*100)));
    for(const v of VARIANTS.slice(0,3))for(const s of ['melee','ranged','magic']){const len=[];let d=0;
      for(let k=0;k<Math.ceil(N_PVP/2);k++){const r=pvpFight(9000+k+L*100,L,s,s,{food:v.food,prayA:v.prayFav,prayB:v.prayFav});if(r.winner===null)d++;len.push(r.ticks)}
      mirrors.push(Object.assign({L,variant:v.name,style:s,fights:Math.ceil(N_PVP/2),draws:d},spread(len)))}
  }
  return {rows,mirrors};
}

const t0=Date.now();
const A=PVP_ONLY?[]:pvm();console.log('PvM done '+((Date.now()-t0)/1000).toFixed(0)+' s');
const B=PVM_ONLY?{rows:[],mirrors:[]}:pvp();console.log('PvP done '+((Date.now()-t0)/1000).toFixed(0)+' s');
fs.mkdirSync(OUT,{recursive:true});
fs.writeFileSync(path.join(OUT,'bench_'+TAG+'.json'),JSON.stringify({tag:TAG,quick:QUICK,pvm:A,pvp:B.rows,mirrors:B.mirrors},null,1));
let md='# Combat bench '+TAG+(QUICK?' (quick)':'')+'\n\nGenerated by `node tools/combat_bench.js '+TAG+(QUICK?' --quick':'')+'` ('+new Date().toISOString().slice(0,10)+').\n\n';
md+='## A. PvM time to kill (client engine, '+N_PVM+' fights each; no food, then 6 trout eaten at half health)\n\n| food | level | style | weapon | monster (level) | kills | kill time: mean (sd; 10th-90th pct) | damage taken | XP/hour (excl. HP) |\n|---|---|---|---|---|---|---|---|---|\n';
A.forEach(r=>md+=`| ${r.food?r.food+' trout':'none'} | ${r.L} | ${r.style} | ${r.weapon} | ${r.monster} (${r.monsterLevel}) | ${r.wins}/${r.fights} | ${r.ttkSec} s (sd ${r.ttkSdSec}; ${r.ttkP10Sec}-${r.ttkP90Sec}) | ${r.dmgTaken} of ${r.hp} | ${r.wins?r.xpPerHour:'-'} |\n`);
md+='\n## B. PvP matchups (server engine, equal levels, each style in its own best gear, '+N_PVP+' fights each, sides alternated)\n\n'+
  'A is the style the triangle favours (melee > ranged > magic > melee). "food + protection prayers": both sides pray against the other\'s style (Protect from Magic 37, Missiles 40, Melee 43); "underdog\'s best play": only B prays, protection plus the stat prayers of its own style; "blade in ranged armour": the melee fighter meets a mage in the ranged armour of the level.\n\n'+
  '| level | variant | A vs B | A wins | B wins | draws | A win % | fight: mean (sd; 10th-90th pct) |\n|---|---|---|---|---|---|---|---|\n';
B.rows.forEach(r=>md+=`| ${r.L} | ${r.variant} | ${r.a} vs ${r.b} | ${r.aWins} | ${r.bWins} | ${r.draws} | ${r.aPct}% | ${r.avgSec} s (sd ${r.sdSec}; ${r.p10Sec}-${r.p90Sec}) |\n`);
md+='\n## C. Mirror fights (same style both sides)\n\n| level | variant | style | fights | mean (sd) | 10th-90th pct | min-max | draws (1500 ticks) |\n|---|---|---|---|---|---|---|---|\n';
B.mirrors.forEach(r=>md+=`| ${r.L} | ${r.variant} | ${r.style} | ${r.fights} | ${r.avgSec} s (sd ${r.sdSec}) | ${r.p10Sec}-${r.p90Sec} s | ${r.minSec}-${r.maxSec} s | ${r.draws} |\n`);
fs.writeFileSync(path.join(OUT,'bench_'+TAG+'.md'),md);
console.log(md);
