'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('src/holm_teaching_kitchen_interactions.js','utf8');
function fixture(){
 const saves=[],messages=[],errors=[];
 const c={CRWorldMode:{providerId:'tutors-holm-v2'},Tutorial:{step:0,optional:{},notify(ev,match){if(ev==='bake'&&match==='bread'&&this.step===0)this.step++;return 'forwarded';}},Player:{loaves:1,xp:40},UI:{chat(m){messages.push(m)}},Sfx:{quest(){}},SaveGame:{save(){saves.push(JSON.parse(JSON.stringify({step:c.Tutorial.step,optional:c.Tutorial.optional,loaves:c.Player.loaves,xp:c.Player.xp}))) }},setInterval(){},requestAnimationFrame(){},console:{error(...a){errors.push(a)}}};
 vm.createContext(c);vm.runInContext(source,c);return {c,saves,messages,errors};
}
let f=fixture();assert.equal(f.c.Tutorial.notify('bake','bread'),'forwarded');assert.equal(f.saves.length,1);assert.equal(f.saves[0].step,1);assert.equal(f.saves[0].optional.bake_bread,true);assert.equal(f.messages.length,1);
f.c.Player.loaves=2;f.c.Player.xp=80;f.c.Tutorial.notify('bake','bread');assert.equal(f.saves.length,2);assert.equal(f.saves[1].loaves,2);assert.equal(f.saves[1].xp,80);assert.equal(f.messages.length,1);assert.equal(f.c.Tutorial.step,1);
f=fixture();f.c.CRWorldMode.providerId='mainland';f.c.Tutorial.notify('bake','bread');assert.equal(f.saves.length,0);assert.equal(f.c.Tutorial.optional.bake_bread,undefined);assert.equal(f.c.Tutorial.step,1,'original notifier still forwarded');
f=fixture();f.c.Tutorial.notify('cook','cooked_perch');assert.equal(f.saves.length,0);assert.equal(f.messages.length,0);
f=fixture();f.c.SaveGame.save=()=>{throw Error('storage unavailable')};assert.doesNotThrow(()=>f.c.Tutorial.notify('bake','bread'));assert.equal(f.errors.length,1);assert.equal(f.c.Tutorial.step,1);
f=fixture();vm.runInContext(source,f.c);f.c.Tutorial.notify('bake','bread');assert.equal(f.saves.length,1,'wrapper must not double install');
console.log('[KITCHEN_SAVE_ORDER] PASS: post-advance snapshot, repeat inventory/XP save, provider isolation, unrelated events, visible save failure, idempotent wrapper');
