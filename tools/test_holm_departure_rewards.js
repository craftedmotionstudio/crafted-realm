'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');let count=0;
function fixture(){
  const c={console,Tutorial:{complete:true,departurePackClaimed:false},Player:{inv:Array(24).fill(null),equip:{weapon:null,body:null}},
    ITEMS:{},UI:{chat(){},refreshInv(){}},SaveGame:{save(){return true;}},CRWorldMode:{providerId:'tutors-holm-v2'},
    HolmTutorialFlow:{canDepart:t=>t.complete,departure:{dockTile:{x:1,z:1},destinationProvider:'commons',destinationLandmark:'arrival'}},
    document:{getElementById(){return null;}},WorldTravel:{go(){c.crossings++;}},crossings:0};
  ['coins','bread','air_rune','mind_rune','arrows','wood_shield','leather_body','worn_bow','hatchet','pickaxe','fishing_net','tinderbox','hammer','bronze_dagger','home_tab'].forEach(id=>c.ITEMS[id]={stack:['coins','air_rune','mind_rune','arrows','home_tab'].includes(id)});
  vm.createContext(c);['holm_reward_plan.js','holm_departure_rewards.js','holm_departure.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,'src',f),'utf8'),c));return c;
}
function test(label,fn){fn();count++;console.log('ok '+label);}
test('full inventory changes neither claim nor items and cannot sail',()=>{const c=fixture();c.Player.inv.fill(null);c.Player.inv=c.Player.inv.map(()=>({id:'bread',qty:1}));const before=JSON.stringify(c.Player.inv);c.HolmDeparture.board();assert.equal(c.crossings,0);assert.equal(c.Tutorial.departurePackClaimed,false);assert.equal(JSON.stringify(c.Player.inv),before);});
test('partial room cannot partially grant additive currency or bread',()=>{const c=fixture();c.Player.inv=c.Player.inv.map((_,i)=>i<22?{id:'bread',qty:1}:null);const before=JSON.stringify(c.Player.inv);assert.equal(c.HolmDepartureRewards.claim(),false);assert.equal(JSON.stringify(c.Player.inv),before);});
test('successful claim saves all inventory and marker before crossing',()=>{const c=fixture();let saved;c.SaveGame.save=()=>{saved=JSON.stringify({inv:c.Player.inv,claimed:c.Tutorial.departurePackClaimed});assert.equal(c.crossings,0);return true;};c.HolmDeparture.board();assert.equal(c.crossings,1);const state=JSON.parse(saved);assert(state.claimed);for(const r of c.HolmDepartureRewards.rows())assert.equal(state.inv.reduce((n,s)=>n+(s&&s.id===r.id?s.qty:0),0),r.qty);});
test('failed save rolls back and retry delivers exactly once',()=>{const c=fixture(),before=c.Player.inv;c.SaveGame.save=()=>false;c.HolmDeparture.board();assert.strictEqual(c.Player.inv,before);assert(!c.Tutorial.departurePackClaimed);assert.equal(c.crossings,0);c.SaveGame.save=()=>true;c.HolmDeparture.board();const earned=JSON.stringify(c.Player.inv);c.HolmDeparture.board();assert.equal(JSON.stringify(c.Player.inv),earned);assert.equal(c.crossings,2);});
test('thrown save rolls back and forbids travel',()=>{const c=fixture(),before=c.Player.inv;c.SaveGame.save=()=>{throw Error('quota');};c.HolmDeparture.board();assert.strictEqual(c.Player.inv,before);assert(!c.Tutorial.departurePackClaimed);assert.equal(c.crossings,0);});
test('restored claimed save boards without issuing another pack',()=>{const c=fixture();c.HolmDepartureRewards.claim();const saved=JSON.parse(JSON.stringify({inv:c.Player.inv,claimed:c.Tutorial.departurePackClaimed}));const next=fixture();next.Player.inv=saved.inv;next.Tutorial.departurePackClaimed=saved.claimed;next.HolmDeparture.board();assert.equal(next.crossings,1);assert.equal(JSON.stringify(next.Player.inv),JSON.stringify(saved.inv));});
test('equipped shield and torso armor are not duplicated',()=>{const c=fixture();c.Player.equip={weapon:'hatchet',shield:'wood_shield',body:'leather_body'};assert(c.HolmDepartureRewards.claim());for(const id of Object.values(c.Player.equip))assert(!c.Player.inv.some(s=>s&&s.id===id));});
test('unknown reward refuses whole transaction',()=>{const c=fixture();delete c.ITEMS.home_tab;assert(!c.HolmDepartureRewards.claim());assert(!c.Tutorial.departurePackClaimed);assert(c.Player.inv.every(s=>s===null));});
console.log('[HOLM_DEPARTURE_REWARDS] '+count+'/'+count+' passed');
