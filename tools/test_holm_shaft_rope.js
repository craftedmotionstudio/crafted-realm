/* Headless contract for the rope into the Quarry Gate's mine shaft (owner review 5, 2026-09-28: "a nearby rope that the
 * character has to pick up and attach to the mine shaft to lower themselves down into it"). The real island modules
 * (flow data, curriculum ledger, the rope, the old-school world menu's use rule) and the real SaveGame run in a VM:
 *  - a new adventurer at the shaft finds a coil of rope on the floor (a ground item that never ages out, the Blender coil),
 *    the shaft refuses to be climbed with a chat-box line, and the objective says to take the rope;
 *  - with the rope in the pack the objective says to tie it; the coil lies there again 20 s after a rope is lost;
 *  - "Use Rope -> Mine shaft" and the "Tie-rope" row both tie it: the rope leaves the pack, the tied rope shows, the flag is
 *    saved at once, the objective says climb, and the shaft then climbs as the ladder did;
 *  - the flag survives a save and reload; saves from before the rope that are at or past the shaft count it as tied;
 *  - the data: the ladder's rope block names a published Blender pack with both roots, the coil lies within pickup reach of
 *    a quarry stance, and nothing about the rope blocks a tile;
 *  - nothing happens off the island.
 * Run: node tools/test_holm_shaft_rope.js */
'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const ROOT=path.join(__dirname,'..'),src=f=>fs.readFileSync(path.join(ROOT,'src',f),'utf8'),read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
function world(search,opts){
 opts=opts||{};
 const els={objective:{style:{display:'none'},textContent:''},'obj-text':{textContent:''}};
 const ctx={console,location:{search},URLSearchParams,chats:[],saves:0,bytes:null,played:[],removed:[]};
 ctx.document={getElementById:id=>els[id]||null};
 ctx.Tutorial={complete:false,step:0,steps:[],
  notify(ev,match){if(this.complete)return;const s=this.steps[this.step];if(!s)return;if(s.ev===ev&&s.match===match){this.step++;if(this.step>=this.steps.length)this.finish();else this.banner()}},
  banner(){if(this.complete){els.objective.style.display='none';return}els.objective.style.display='block';els['obj-text'].textContent=this.steps[this.step].text},
  finish(){this.complete=true;this.step=this.steps.length}};
 ctx.inv={};
 ctx.Player={count:id=>ctx.inv[id]||0,removeItem(id,q){ctx.inv[id]=(ctx.inv[id]||0)-(q||1);if(ctx.inv[id]<=0)delete ctx.inv[id];return true},usingItem:null,
  target:null,equip:{weapon:null},inv:[],bank:[],xp:{},hp:10,maxHp:10,quests:{},attackStyles:{}};
 ctx.UI={chat:t=>ctx.chats.push(t),dialogue(){},refreshInv(){},refreshSkills(){},refreshQuests(){},refreshEquip(){},refreshHud(){}};
 ctx.QAProfile={isolated:!!opts.qa,key:'motionscape_save__rope'};
 ctx.HolmArrivalQA={active:()=>false,islandActive:()=>true};
 ctx.HolmIslandPlayer={active:()=>true,play:n=>{ctx.played.push(n);return true}};
 // the game's ground items: makeDrop pushes a mesh onto WORLD.drops with the 2004 lifecycle (200 ticks)
 ctx.WORLD={drops:[],clickables:[]};
 ctx.makeDrop=(id,qty,x,z)=>{const m={name:'',visible:true,position:{x,y:0,z,set(a,b,c){this.x=a;this.y=b;this.z=c}},rotation:{y:0},userData:{kind:'drop',id,qty,age:0,life:200*.6}};
  ctx.WORLD.drops.push(m);ctx.WORLD.clickables.push(m);return m};
 ctx.scene={remove:m=>ctx.removed.push(m),getObjectByName:()=>null};ctx.removeClickable=m=>{const i=ctx.WORLD.clickables.indexOf(m);if(i>=0)ctx.WORLD.clickables.splice(i,1)};
 Object.assign(ctx,{Persist:{store:{get:()=>ctx.bytes,set:(k,v)=>{ctx.bytes=v;return true},has:()=>ctx.bytes!==null}},
  player:{position:{x:1,y:0,z:2,set(x,y,z){this.x=x;this.y=y;this.z=z}}},Quest:{tracked:null},CharCfg:{name:'Tester'},Music:{unlocked:[],mode:'auto'},
  groundY:()=>0,collides:()=>false,applyPlayerLook(){},refreshPlayerGear(){}});
 vm.createContext(ctx);
 ['holm_landscape_data.js','holm_tutorial_flow_data.js','holm_curriculum_progress.js','holm_island_curriculum.js','holm_shaft_rope.js','ui_save.js'].forEach(f=>{try{vm.runInContext(src(f),ctx,{filename:f})}catch(e){if(f!=='holm_landscape_data.js')throw e}});
 ctx.SaveGame=vm.runInContext('SaveGame',ctx);ctx.R=vm.runInContext('HolmShaftRope',ctx);
 const real=ctx.SaveGame.save.bind(ctx.SaveGame);ctx.SaveGame.save=s=>{ctx.saves++;return real(s)};
 ctx.els=els;return ctx;
}
let passed=0;const check=(n,f)=>{f();passed++;console.log('PASS '+n)};
const ids=W=>vm.runInContext('HolmCurriculumProgress.lessonIds',W);
const upTo=(W,id)=>{const L=ids(W);return L.slice(0,L.indexOf(id))};
const shaft={building:'quarry',target:'shaft',label:'Climb-down mine shaft',rope:'quarry-shaft',climb:'b:cavern:x'};
function atShaft(opts){const W=world('?holmIsland=1',opts);W.HolmIslandCurriculum.install&&W.HolmIslandCurriculum.install();
 W.HolmIslandCurriculum.restore({curriculumVersion:6,completedLessonIds:upTo(W,'descend_cavern')});
 W.prop={visible:true};W.service=Object.assign({},shaft);assert(W.R.bind({id:'quarry-shaft',prop:W.prop,service:W.service,coil:{x:36.55,y:9.15,z:30.45,yaw:.6}}));W.R.update(.1);return W}
check('a new adventurer at the shaft: a coil of rope lies by it (a ground item that never ages out), the shaft refuses, the objective says take the rope',()=>{
 const W=atShaft();assert.strictEqual(W.Tutorial.steps[W.Tutorial.step].id,'descend_cavern');assert.strictEqual(W.R.stage(),'take');
 assert.strictEqual(W.WORLD.drops.length,1);const c=W.WORLD.drops[0];assert.strictEqual(c.userData.id,'rope');assert.strictEqual(c.name,W.R.COIL_NAME);
 assert(c.userData.life>1e9,'the coil never ages out');assert.deepStrictEqual([c.position.x,c.position.y,c.position.z].map(v=>+v.toFixed(3)),[36.55,9.155,30.45]);
 assert.strictEqual(W.prop.visible,false,'no rope hangs from the frame yet');assert(/rope tied to the frame would take you down/.test(W.service.examine));
 const r=W.R.click(W.service);assert(r&&/need a rope tied to the frame/.test(r.refuse),JSON.stringify(r));
 W.Tutorial.banner();assert.strictEqual(W.els['obj-text'].textContent,W.R.TEXT.take);
 W.R.update(30);assert.strictEqual(W.WORLD.drops.length,1,'one coil, not a pile');
});
check('with the rope in the pack the objective says tie it; a lost rope lies by the shaft again after 20 s (a 2004 ground spawn)',()=>{
 const W=atShaft();W.WORLD.drops.length=0;W.inv.rope=1;W.R.update(.1);
 assert.strictEqual(W.R.stage(),'tie');assert.strictEqual(W.els['obj-text'].textContent,W.R.TEXT.tie);W.R.update(60);assert.strictEqual(W.WORLD.drops.length,0,'no second coil while one is carried');
 delete W.inv.rope;W.R.update(.1);assert.strictEqual(W.R.stage(),'take');W.R.update(W.R.RESPAWN-1);assert.strictEqual(W.WORLD.drops.length,0,'not at once');
 W.R.update(1.2);assert.strictEqual(W.WORLD.drops.length,1,'back after RESPAWN seconds');
});
check('"Use Rope -> Mine shaft" ties it: the rope leaves the pack, hangs from the frame, is saved at once; the shaft then climbs',()=>{
 const W=atShaft();W.WORLD.drops.length=0;W.inv.rope=1;W.Player.usingItem='rope';
 const r=W.R.click(W.service);assert(r&&r.tie===true,JSON.stringify(r));assert.strictEqual(W.Player.usingItem,null,'use mode ends');
 const s0=W.saves;assert.strictEqual(W.R.tie(),true);assert.strictEqual(W.Player.count('rope'),0);assert.strictEqual(W.Tutorial.shaftRopeTied,true);
 assert.strictEqual(W.prop.visible,true);assert(/knotted round the frame/.test(W.service.examine));assert(W.chats.some(t=>/tie the rope to the frame/.test(t)));
 assert(W.saves>s0,'saved at once');assert.strictEqual(JSON.parse(W.bytes).tut.shaftRopeTied,true);assert(W.played.length===1,'one existing clip plays (no new clip)');
 assert.strictEqual(W.R.stage(),'climb');assert.strictEqual(W.els['obj-text'].textContent,W.R.TEXT.climb);assert.strictEqual(W.R.click(W.service),null,'climb as the ladder did');
 W.R.update(60);assert.strictEqual(W.WORLD.drops.length,0,'no coil once the rope is tied');
 W.inv.rope=1;W.Player.usingItem='rope';assert(/already tied/.test(W.R.click(W.service).refuse));
});
check('the "Tie-rope" row ties the rope from the pack, and says where the rope is when the pack has none',()=>{
 const W=atShaft();W.R.requestTie();assert(/need a rope to tie/.test(W.R.click(W.service).refuse));
 W.inv.rope=1;W.R.requestTie();assert.strictEqual(W.R.click(W.service).tie,true);assert.strictEqual(W.R.click(W.service).refuse!==undefined,true,'one tie per row click');
 assert.strictEqual(W.R.tie(),true);assert.strictEqual(W.R.tied(),true);
});
check('the real SaveGame keeps the tied rope across a reload; a fresh profile finds it untied',()=>{
 const W=atShaft();W.inv.rope=1;W.R.tie();const bytes=W.bytes;
 const R2=atShaft();R2.bytes=bytes;R2.Tutorial.shaftRopeTied=false;assert.strictEqual(R2.SaveGame.load(),true);assert.strictEqual(R2.Tutorial.shaftRopeTied,true);assert.strictEqual(R2.R.tied(),true);
 R2.R.update(.1);assert.strictEqual(R2.prop.visible,true);
 const F=atShaft();assert.strictEqual(F.R.tied(),false);
});
check('saves from before the rope: at or past the shaft counts as tied (nobody stuck), before it does not',()=>{
 const L=ids(world('?holmIsland=1'));
 const at=(done,extra)=>{const W=world('?holmIsland=1');W.bytes=JSON.stringify(Object.assign({v:1,xp:{},hp:10,maxHp:10,inv:[],bank:[],equip:{},pos:[1,2],tut:{curriculumVersion:6,completedLessonIds:done,step:done.length}},extra||{}));W.SaveGame.load();return W};
 assert.strictEqual(at(L.slice(0,L.indexOf('descend_cavern'))).R.tied(),false,'still to climb down: the rope flow');
 assert.strictEqual(at(L.slice(0,L.indexOf('descend_cavern')+1)).R.tied(),true,'already down (in the ore workings)');
 assert.strictEqual(at(L.slice(0,L.indexOf('open_bank'))).R.tied(),true,'long past the shaft');
 const C=world('?holmIsland=1');C.bytes=JSON.stringify({v:1,xp:{},hp:10,maxHp:10,inv:[],bank:[],equip:{},pos:[1,2],tut:{curriculumVersion:6,complete:true}});C.SaveGame.load();assert.strictEqual(C.R.tied(),true,'a graduate');
});
check('the data: the quarry shaft\'s rope block names a published Blender pack with the coil and the tied rope; the coil lies in pickup reach of a quarry stance and blocks nothing',()=>{
 const lad=read('docs/rebuild/holm-overhaul/island-ladders.json').ladders.find(l=>l.id==='quarry-shaft');assert(lad&&lad.rope,'quarry-shaft has a rope block');
 const rp=lad.rope,man=read(rp.pack.replace(/[^/]+\.glb$/,'manifest.json'));const roots=man.assets.map(a=>a.name);
 assert(roots.includes(rp.prop)&&roots.includes('rope'),JSON.stringify(roots));man.assets.forEach(a=>assert(!a.block,'no footprint: '+a.name));
 assert(!lad.hatch&&!rp.block,'the rope is never a blocker');
 const reg=read('docs/rebuild/holm-overhaul/v2land.json').buildings.quarry,g=read('.studio-workspaces/'+reg.graph+'/candidates/navigation.json'),o=reg.placement;
 const d=Math.min(...g.nodes.map(n=>Math.hypot(n.x+o.x-rp.coil.x,n.z+o.z-rp.coil.z)));assert(d<1,'a stance within a tile of the coil ('+d.toFixed(2)+')');
 const inputs=fs.readFileSync(path.join(ROOT,'tools/holm_v2_land_inputs.js'),'utf8');assert(!/\.rope\b/.test(inputs),'the walk graph inputs never read the rope');
 const pub=fs.readFileSync(path.join(ROOT,'tools/publish_holm_island.js'),'utf8');assert(/l\.rope/.test(pub),'the island publish carries the rope pack');
 assert(/holm-rope-props-v1\/candidates\/props\.glb/.test(src('holm_items_v1.js')),'the coil is the ground model of the rope item');
});
check('the old-school menu: a rope used on the mine shaft is accepted (and nothing else), the untied shaft offers Tie-rope',()=>{
 const m=src('osrs_menu_world.js');assert(/if\(u\.islandService\.rope\)return id==='rope';/.test(m));assert(/option:'Tie-rope'/.test(m)&&/HolmShaftRope\.requestTie\(\)/.test(m));
 const x=src('holm_island_extras.js');assert(/prefix:'Quarry_ServiceShaft_',target:'shaft',label:'Climb-down mine shaft',ladder:'quarry-shaft',rope:'quarry-shaft',option:'Climb-down',name:'Mine shaft'/.test(x));
});
check('a rope picked up before the lesson: when the shaft lesson comes round the objective already says tie it',()=>{
 const W=world('?holmIsland=1');W.HolmIslandCurriculum.restore({curriculumVersion:6,completedLessonIds:upTo(W,'learn_quests')});
 W.prop={visible:false};W.service=Object.assign({},shaft);W.R.bind({id:'quarry-shaft',prop:W.prop,service:W.service,coil:{x:36.55,y:9.15,z:30.45,yaw:.6}});
 W.R.update(.1);assert.strictEqual(W.WORLD.drops.length,1);W.WORLD.drops.length=0;W.inv.rope=1;W.R.update(.1);assert.strictEqual(W.Tutorial.steps[W.Tutorial.step].id,'learn_quests');
 const s=W.Tutorial.steps[W.Tutorial.step];W.Tutorial.notify(s.ev,s.match);assert.strictEqual(W.Tutorial.steps[W.Tutorial.step].id,'descend_cavern');W.R.update(.1);
 assert.strictEqual(W.els['obj-text'].textContent,W.R.TEXT.tie);
});
check('off the island nothing happens',()=>{
 const W=world('');assert.strictEqual(W.R.active(),false);assert.strictEqual(W.R.bind({prop:{}}),false);assert.strictEqual(W.R.click(shaft),null);W.R.update(1);assert.strictEqual(W.WORLD.drops.length,0);
});
console.log('[HOLM_SHAFT_ROPE] '+passed+'/10 checks passed');
if(passed!==10)process.exit(1);
