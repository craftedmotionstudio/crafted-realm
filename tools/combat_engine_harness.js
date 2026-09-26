/* Headless harness for the offline combat engine (src/combat_engine.js).
 * Runs the REAL client sources in a Node vm: shared/*.js (the 2004 rules), src/game1_data.js (items, monsters),
 * src/magic_spells.js, src/game3_systems.js (Player, killNpc, playerDeath, SPECIALS), src/tile_nav.js,
 * src/combat_hooks.js and src/combat_engine.js, on a flat open tile grid (optional blocked tiles), with small stubs
 * for the interface (UI, Sfx, Events, Tutorial). The adventurer walks like 2004: one tile per tick (two running)
 * along an 8-direction BFS path, taken at the start of each tick before the engine runs.
 * Every presentation call is recorded (CombatHooks.on), so tests can assert WHEN hits, splats and projectiles happen.
 * Used by tools/test_combat_engine.js, tools/test_holm_combat_credit.js and tools/combat_bench.js. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

function create(opts){
  const o=opts||{};
  const blocked=new Set((o.blocked||[]).map(([x,z])=>x+','+z));
  const W=o.width||64,H=o.height||64;
  const log={hits:[],anims:[],projectiles:[],swings:[],msgs:[],xp:[],events:[],deaths:[],notified:[]};
  const ctx={console,Math,JSON,Set,Map,Array,Object,Number,String,Boolean,Date,Error,RegExp,Infinity,NaN,isFinite,parseInt,parseFloat,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){}};
  ctx.globalThis=ctx;ctx.window=ctx;
  vm.createContext(ctx);
  const run=(src,file)=>vm.runInContext(src,ctx,{filename:file});
  // ---- the rules and the content ----
  for(const f of ['shared/rng.js','shared/xp.js','shared/combat.js','shared/pvp.js','shared/drops.js','shared/movement.js','shared/drinks.js'])run(read(f),f);
  run(read('src/game1_data.js')+'\n;globalThis.ITEMS=ITEMS;globalThis.NPC_TYPES=NPC_TYPES;globalThis.SKILLS=SKILLS;globalThis.XP_TABLE=XP_TABLE;globalThis.TICK=TICK;globalThis.levelFromXp=levelFromXp;','src/game1_data.js');
  run(read('src/magic_spells.js')+'\n;globalThis.SPELLS=SPELLS;','src/magic_spells.js');
  const dag=/const DAGGER = (\{[\s\S]*?\n  \});/.exec(read('src/smith_bronze_dagger.js'));
  if(dag)run('ITEMS.bronze_dagger='+dag[1]+';','bronze_dagger');
  // ---- interface stubs (recording) ----
  ctx.WORLD={npcs:[],clickables:[],drops:[],friendlies:[],interiors:[],colliders:[]};
  const chat=(t,k)=>log.msgs.push([String(t),k||'']);
  ctx.UI={chat,floatDmg(obj,d){},xpDrop(){},refreshHud(){},refreshInv(){},refreshSkills(){},refreshEquip(){},refreshSpells(){},refreshPrayers(){},refreshSpec(){},refreshCombat(){},refreshQuests(){},closeWorldModals(){},openBank(){}};
  ctx.Sfx={level(){},eat(){},kill(){},death(){},click(){},coin(){}};
  const handlers={};
  ctx.Events={on:(ev,fn)=>{(handlers[ev]=handlers[ev]||[]).push(fn)},emit:(ev,p)=>{log.events.push([ev,p]);(handlers[ev]||[]).forEach(f=>f(p))}};
  ctx.Tutorial={complete:o.tutorialComplete!==false,steps:[],step:0,notify:(ev,m)=>log.notified.push([ev,m]),banner(){}};
  ctx.Quest={onKill(){}};
  ctx.GameConfig={friendlyMode:!!o.friendlyMode,xpMult:()=>1,onXp(){}};
  ctx.Duel={active:false};
  ctx.ZONES={commons:{pos:[0,0]},holm:{pos:[0,0]}};
  ctx.gy=()=>0;ctx.groundY=()=>0;ctx.collides=()=>false;
  ctx.tileWalkable=(i,j)=>i>=0&&j>=0&&i<W&&j<H&&!blocked.has(i+','+j);
  ctx.tileTransitionWalkable=()=>true;
  ctx.curZone=o.zone||'holm';
  // a minimal body: position + lookAt + userData
  const body=(x,z)=>({position:{x,y:0,z,set(a,b,c){this.x=a;this.y=b;this.z=c},clone(){return {x:this.x,y:this.y,z:this.z}},copy(p){this.x=p.x;this.y=p.y;this.z=p.z}},
    rotation:{set(){}},scale:{setScalar(){}},lookAt(){},userData:{},visible:true,children:[]});
  ctx.player=body(0.5,0.5);
  // game3 (Player, killNpc, playerDeath, SPECIALS): top level only defines things
  run(read('src/game3_systems.js')+'\n;globalThis.Player=Player;globalThis.SPECIALS=SPECIALS;globalThis.PRAYERS=PRAYERS;globalThis.killNpc=killNpc;globalThis.playerDeath=playerDeath;globalThis.makeDrop=makeDrop;globalThis.addGroundStack=addGroundStack;','src/game3_systems.js');
  ctx.itemGroundMesh=()=>body(0,0);ctx.scene={add(){},remove(){}};ctx.refreshPlayerGear=()=>{};ctx.refreshOverhead=()=>{};
  ctx.makeDrop=function(id,qty,x,z){const m=body(x,z);m.userData={kind:'drop',id,qty,age:0,life:120,publicAt:60};ctx.WORLD.drops.push(m);};
  ctx.addGroundStack=function(id,qty,x,z){const tx=Math.floor(x),tz=Math.floor(z);const m=ctx.WORLD.drops.find(d=>d.userData.id===id&&Math.floor(d.position.x)===tx&&Math.floor(d.position.z)===tz);
    if(m)m.userData.qty+=qty;else ctx.makeDrop(id,qty,tx+.5,tz+.5)};
  // the adventurer walks one tile per tick (two when running) along a BFS path (2004 movement)
  ctx.THREE={Vector3:function(x,y,z){this.x=x;this.y=y;this.z=z}};
  run(read('src/tile_nav.js')+'\n;globalThis.TileNav=TileNav;','src/tile_nav.js');
  run(read('src/combat_hooks.js')+'\n;globalThis.CombatHooks=CombatHooks;','src/combat_hooks.js');
  run(read('src/combat_engine.js')+'\n;globalThis.LocalCombat=LocalCombat;','src/combat_engine.js');
  const P=ctx.Player,LC=ctx.LocalCombat,TN=ctx.TileNav;
  let walk=[];
  ctx.orderWalk=function(p){const start=TN.nodeAt(Math.floor(ctx.player.position.x),Math.floor(ctx.player.position.z));const gx=Math.floor(p.x),gz=Math.floor(p.z);
    const r=TN.bfs(start,n=>n.tx===gx&&n.tz===gz,{max:20000});walk=r?r.slice(1):[];P.moveTo=walk.length?{x:gx+.5,z:gz+.5}:null;};
  P.path=[];
  function stepPlayer(){
    if(!walk.length){P.moveTo=null;return 0}
    const n=P.runOn&&o.run?2:1;let k=0;
    while(k<n&&walk.length){const t=walk.shift();ctx.player.position.set(t.tx+.5,0,t.tz+.5);k++}
    if(!walk.length)P.moveTo=null;return k}
  ctx.CombatHooks.on(ev=>{
    if(ev.k==='hit')log.hits.push({tick:LC.clock(),obj:ev.obj,dmg:ev.dmg,kind:ev.kind,fx:ev.fx});
    else if(ev.k==='projectile')log.projectiles.push({tick:LC.clock(),src:ev.src,dst:ev.dst,kind:ev.kind,ticks:ev.ticks,splash:ev.splash});
    else if(ev.k==='anim')log.anims.push({tick:LC.clock(),obj:ev.obj,type:ev.type,delay:ev.delay});
    else if(ev.k==='swing')log.swings.push({tick:LC.clock(),att:ev.att,type:ev.type,ticks:ev.ticks});
    else if(ev.k==='death')log.deaths.push({tick:LC.clock(),npc:ev.npc});
  });
  const addXp=P.addXp;P.addXp=function(s,a){log.xp.push({tick:LC.clock(),skill:s,amt:a});return addXp.call(this,s,a)};
  P.init();
  if(o.seed!=null)LC.setRng(ctx.CRShared.rng.create(o.seed));
  LC.setWanderRng(ctx.CRShared.rng.create(o.wanderSeed!=null?o.wanderSeed:1));
  LC.enable(true);
  // ---- helpers ----
  const api={ctx,LC,P,TN,log,
    setLevels(L){for(const s in L){P.xp[s]=ctx.XP_TABLE[Math.max(1,L[s])]||0}P.maxHp=P.lvl('Hitpoints');P.hp=P.maxHp;P.prayerPts=P.lvl('Prayer')},
    wield(id){P.equip.weapon=id||null},wear(slot,id){P.equip[slot]=id||null},
    give(id,q){P.addItem(id,q||1)},
    place(tx,tz){ctx.player.position.set(tx+.5,0,tz+.5);walk=[];P.moveTo=null},
    spawn(typeId,tx,tz,extra){const t=Object.assign({},ctx.NPC_TYPES[typeId]||{},extra&&extra.t||{});
      const m=body(tx+.5,tz+.5);const n=Object.assign({typeId,t,mesh:m,hp:t.hp,home:{x:tx+.5,y:0,z:tz+.5,set(a,b,c){this.x=a;this.y=b;this.z=c}},dead:false,hpbar:{spr:{visible:false},draw(){}},wanderR:0},extra||{});n.t=t;
      m.userData.npc=n;ctx.WORLD.npcs.push(n);ctx.WORLD.clickables.push(m);LC.register(n);return n},
    tick(k){for(let i=0;i<(k||1);i++){stepPlayer();LC.tick()}},
    until(fn,max){for(let i=0;i<(max||2000);i++){if(fn())return i;api.tick(1)}return -1},
    walking(){return walk.length>0},
    playerTile(){return {tx:Math.floor(ctx.player.position.x),tz:Math.floor(ctx.player.position.z)}},
  };
  return api;
}
module.exports={create};
