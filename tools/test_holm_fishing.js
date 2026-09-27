/* Headless locks for Minnow Hollow fishing (Holm v2 land phase 2, src/holm_fishing.js): the pure rules and the data.
 *  1 the catch curve is the 2004 low/high out of 256 (19% at level 1, certain at 99), monotonic;
 *  2 the lesson cannot fail: before any catch, roll 2 lands the common fish; before the lesson is done only the common
 *    fish comes up (no junk, no rares, no pike);
 *  3 after the lesson, over many seeded rolls: perch ~85%, reedpike ~12% from Fishing 5 (none below), junk ~3%, the
 *    sealed bottle ~1/150 per roll and only once per account, the ring ~1/400;
 *  4 spot timers are 60-100 ticks on the Holm and a moving spot never lands on a tile another spot holds;
 *  5 the data: 7 candidates, 3 active, the catch items exist in ITEMS with Blender icons.
 * Run: node tools/test_holm_fishing.js */
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),F=require('../src/holm_fishing.js'),D=JSON.parse(fs.readFileSync(path.join(root,'docs/rebuild/holm-overhaul/island-fishing.json'),'utf8')),R=D.rules;
let passed=0;const check=(n,f)=>{f();passed++;console.log('PASS '+n)};
function seeded(s){return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
check('1 the 2004 catch curve: 48/256 at level 1 (19%), rising to certain at 99',()=>{
 assert(Math.abs(F.chance(R.common,1)-48/256)<1e-12);assert.strictEqual(F.chance(R.common,99),1);
 for(let l=2;l<=99;l++)assert(F.chance(R.common,l)>=F.chance(R.common,l-1));
});
check('2 the lesson cannot fail: the first catch lands on roll 2; before the lesson only mirrorperch',()=>{
 const miss=()=>.999;   // a source that would miss every roll
 assert.strictEqual(F.roll(R,{lessonDone:false,firstCatch:false,level:1,rollIndex:1},miss).kind,'miss');
 const r2=F.roll(R,{lessonDone:false,firstCatch:false,level:1,rollIndex:2},miss);assert.strictEqual(r2.item,'raw_perch');assert(r2.guaranteed);
 const r=seeded(7),seen=new Set();for(let i=0;i<4000;i++){const x=F.roll(R,{lessonDone:false,firstCatch:true,found:{},level:40,rollIndex:i},r);if(x.kind!=='miss')seen.add(x.item)}
 assert.deepStrictEqual([...seen],['raw_perch']);
});
check('3 after the lesson: perch ~85%, reedpike ~12% from Fishing 5, junk ~3%, bottle 1/150 once per account, ring 1/400',()=>{
 const r=seeded(99),n=300000,count={},found={};let rolls=0;
 for(let i=0;i<n;i++){const x=F.roll(R,{lessonDone:true,firstCatch:true,found:{},level:99,rollIndex:i},r);rolls++;count[x.item||x.kind]=(count[x.item||x.kind]||0)+1}
 const fish=n-(count.sealed_bottle||0)-(count.tarnished_ring||0),share=id=>(count[id]||0)/fish;
 assert(Math.abs(share('raw_perch')-.85)<.01,'perch '+share('raw_perch'));assert(Math.abs(share('raw_reedpike')-.12)<.01,'pike '+share('raw_reedpike'));
 assert(Math.abs((share('soggy_boot')+share('pond_weed'))-.03)<.004,'junk');
 assert(Math.abs(count.sealed_bottle/n-1/150)<.0012,'bottle '+count.sealed_bottle/n);assert(Math.abs(count.tarnished_ring/n-1/400)<.0006,'ring '+count.tarnished_ring/n);
 const low=seeded(3);for(let i=0;i<50000;i++)assert.notStrictEqual(F.roll(R,{lessonDone:true,firstCatch:true,found:{},level:4,rollIndex:i},low).item,'raw_reedpike','pike below Fishing 5');
 const once=seeded(5);let bottles=0;const f={};for(let i=0;i<60000;i++){const x=F.roll(R,{lessonDone:true,firstCatch:true,found:f,level:50,rollIndex:i},once);if(x.item==='sealed_bottle'){bottles++;if(x.once)f[x.item]=true}}
 assert.strictEqual(bottles,1,'the bottle is found once per account');
});
check('4 spots move every 60-100 ticks and never onto a held tile',()=>{
 const r=seeded(11);for(let i=0;i<2000;i++){const t=F.moveTimer(R,r);assert(t>=60&&t<=100)}
 for(let i=0;i<2000;i++){const held=[0,3],to=F.freeCandidate(D.candidates,held,5,r);assert(held.indexOf(to)<0&&to!==5&&to>=0&&to<D.candidates.length)}
});
check('5 data: 7 candidates, 3 active, every catch an item with a Blender icon',()=>{
 assert.strictEqual(D.candidates.length,7);assert.strictEqual(R.activeSpots,3);
 const src=fs.readFileSync(path.join(root,'src/game1_data.js'),'utf8'),icons=fs.readFileSync(path.join(root,'src/game0_icons.js'),'utf8');
 const items=[R.common.item,R.big.item].concat(R.junk.items.map(j=>j[0]),R.rare.map(q=>q.item),['cooked_reedpike','burnt_reedpike']);
 items.forEach(id=>{assert(new RegExp('\\b'+id+'\\s*:\\s*\\{name:').test(src),id+' missing from ITEMS');assert(fs.existsSync(path.join(root,'assets/icons/items/'+id+'.png')),id+' icon missing');assert(icons.includes("'"+id+"'"),id+' not in HOLM_ITEM_ICONS')});
});
console.log('[HOLM_FISHING] '+passed+'/'+passed+' checks passed');
