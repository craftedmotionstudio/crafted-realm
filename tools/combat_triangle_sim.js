#!/usr/bin/env node
/* Combat triangle what-if runner (the sweeps behind combat_grade_passes pass 4).
 * The same PvP fights as tools/combat_bench.js section B (server engine, equal levels, each style in the best gear of
 * its own ladder, sides alternated, same seeds), but with optional data patches applied to the server's copy of the
 * content, so a balance idea can be measured before it is written into src/game1_data.js / src/magic_spells.js.
 *   node tools/combat_triangle_sim.js [N=100] [levels=25,40,60] [variants=food]      variants: none | food
 *   ITEMS_PATCH='ITEMS.storm_staff.aBonus=16;'    code appended to src/game1_data.js (sees ITEMS)
 *   SPELLS_PATCH='SPELLS.water_bolt.max=9;'       code appended to src/magic_spells.js (sees SPELLS)
 *   COUNTER=1                                     the blade wears the level's ranged armour against a mage
 * Prints one line per level and variant: the favoured style's win rate and the fight length (mean, sd). */
'use strict';
const fs=require('fs');
const IP=process.env.ITEMS_PATCH||'',SP=process.env.SPELLS_PATCH||'';
const rf=fs.readFileSync;
fs.readFileSync=function(p,...a){const s=rf.call(fs,p,...a);
  if(typeof p==='string'&&IP&&/game1_data\.js$/.test(p))return s+'\n;'+IP+'\n';
  if(typeof p==='string'&&SP&&/magic_spells\.js$/.test(p))return s+'\n;'+SP+'\n';
  return s};
const {fieldWorld,addPlayer}=require('../server/test/helpers');
const G=require('../server/content/GameData.js').load();const SPELLS=G.SPELLS,ITEMS=G.ITEMS;
fs.readFileSync=rf;
const N=+(process.argv[2]||100),LEVELS=(process.argv[3]||'25,40,60').split(',').map(Number),VARS=(process.argv[4]||'food').split(',');
const TIERS=[['bronze',1],['iron',5],['steel',10],['whitsteel',15],['aurel',20],['veyrite',30],['undercrag',40]];
const tierFor=L=>TIERS.filter(t=>t[1]<=L).pop()[0];
const spellFor=L=>Object.keys(SPELLS).filter(k=>SPELLS[k].max!=null&&!SPELLS[k].utility&&SPELLS[k].req<=L).sort((a,b)=>SPELLS[b].max-SPELLS[a].max)[0];
const rangedArmour=L=>L>=40?{body:'fenhide_body',legs:'fenhide_chaps',hands:'fenhide_vambraces',feet:'leather_boots'}:L>=20?{body:'riveted_body',legs:'riveted_chaps',hands:'leather_gloves',feet:'leather_boots'}:{body:'leather_body',legs:'leather_chaps',hands:'leather_gloves',feet:'leather_boots'};
function loadout(style,L,counter){const t=tierFor(L),it=id=>ITEMS[id]?id:({bronze_platebody:'bronze_plate',bronze_platelegs:'bronze_legs'})[id];
  if(style==='melee'){const worn={head:it(t+'_helm'),body:it(t+'_platebody'),legs:it(t+'_platelegs'),shield:it(t+'_kiteshield')};if(counter)Object.assign(worn,rangedArmour(L));return {weapon:it(t+'_sabre'),worn,styleIndex:1,inv:[]}}
  if(style==='ranged')return {weapon:L>=40?'duskwood_bow':L>=30?'blackthorn_bow':L>=10?'ash_bow':'worn_bow',worn:rangedArmour(L),styleIndex:1,inv:[['arrows',5000]]};
  const sp=spellFor(L);return {weapon:L>=25?'storm_staff':L>=10?'ember_staff':'apprentice_staff',worn:L>=40?{head:'starweave_hat',body:'starweave_robe_top',legs:'starweave_robe_skirt'}:L>=15?{head:'glimmer_hat',body:'glimmer_robe_top',legs:'cloth_robe_skirt'}:{head:'wizard_hat',body:'cloth_robe_top',legs:'cloth_robe_skirt'},styleIndex:0,autocast:sp,inv:Object.keys(SPELLS[sp].runes).map(r=>[r,5000])}}
const levelsOf=L=>({Attack:L,Strength:L,Defence:L,Hitpoints:Math.max(10,L),Ranged:L,Magic:L,Prayer:Math.min(99,Math.max(1,L))});
function fight(seed,L,sa,sb,food){const w=fieldWorld({},seed);
  const mk=(name,style,x,opp)=>{const lo=loadout(style,L,process.env.COUNTER&&style==='melee'&&opp==='magic'),inv=lo.inv.slice();if(food)inv.push(['trout',food]);
    return addPlayer(w,name,{levels:levelsOf(L),pos:{x,z:30},equip:Object.assign({weapon:lo.weapon},lo.worn),inv,style:lo.styleIndex,autocast:lo.autocast||null,autoRetaliate:true})};
  const A=mk('a'+seed,sa,10,sb),B=mk('b'+seed,sb,14,sa);
  A.s.intent({t:'op_player',pid:B.p.pid,op:'attack'});B.s.intent({t:'op_player',pid:A.p.pid,op:'attack'});
  const t0=w.tick;let winner=null;
  for(let i=0;i<1500&&!winner;i++){
    for(const [me,them] of [[A,B],[B,A]]){const p=me.p;if(p.dead)continue;const o=them.p,oMax=o.autocast&&SPELLS[o.autocast]?SPELLS[o.autocast].max:o.combatStats().stats.maxHit;
      if(food&&p.hp<=Math.max(Math.floor(p.maxHp/2),oMax+1)){const slot=p.inv.findIndex(s=>s&&s.id==='trout');if(slot>=0&&p.eatDelay<w.tick){me.s.intent({t:'eat',slot});me.s.intent({t:'op_player',pid:them.p.pid,op:'attack'})}}
      else if(!p.target&&!them.p.dead)me.s.intent({t:'op_player',pid:them.p.pid,op:'attack'})}
    w.cycle();if(A.p.dead)winner='b';else if(B.p.dead)winner='a'}
  const ticks=w.tick-t0;try{w.collision.unload()}catch(e){}return {winner,ticks}}
const PAIRS=[['melee','ranged'],['ranged','magic'],['magic','melee']];
for(const vn of VARS)for(const L of LEVELS){const line=[];
  for(const [x,y] of PAIRS){let a=0;const len=[];
    for(let k=0;k<N;k++){const flip=k%2===1;const r=fight(7000+k+L*100,L,flip?y:x,flip?x:y,vn==='food'?10:0);if(r.winner!==null&&((r.winner==='a')!==flip))a++;len.push(r.ticks*0.6)}
    const m=len.reduce((s,v)=>s+v,0)/len.length,sd=Math.sqrt(len.reduce((s,v)=>s+(v-m)*(v-m),0)/Math.max(1,len.length-1));
    line.push(`${x} > ${y} ${Math.round(100*a/N)}% (${m.toFixed(0)} s, sd ${sd.toFixed(0)})`)}
  console.log(`${vn.padEnd(4)} L${L}  `+line.join(' | '))}
