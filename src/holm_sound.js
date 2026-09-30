/* ================= TUTOR'S HOLM: THE ISLAND'S SOUND DIRECTOR (sound pass, owner review 2026-09-29) =================
 * What only the island knows, played through Sfx (src/game3_systems.js; recipes in src/sfx_recipes.js):
 *  - the chop and the pickaxe strike follow the STROKE, not the tick: the game rolls every 0.6 s tick but the 2004 chop
 *    swing loops every 0.78 s, so a tick-timed chop drifted off the axe. While the adventurer's chop or mine clip runs, the
 *    blow sounds as the tool comes to rest in the wood or the rock (the clip's measured contact, CONTACT below); the
 *    tick's Sfx.chop() / Sfx.mine() then stand down (Sfx.stroke);
 *  - beds by place, each one quiet looping voice: the furnace's roar in the ore workings (full within 2 tiles, gone by 9)
 *    and the sea or the creek at the shore (by how much water lies within 5 tiles); the pond (src/holm_fishing.js), the
 *    mill (src/holm_mill.js) and the fires (src/cozy_fire.js) keep their own;
 *  - the creatures talk now and then: a hen clucks, a cow moos, a rat squeaks, a goblin mutters, when one is within 10
 *    tiles and not fighting (never more than one voice every 2.5 s, each creature at most every 7 s);
 *  - footsteps, subtle and OFF by default (2004 had none): localStorage cr_sfx_steps = '1' or ?steps=1 turns them on
 *    (grass, planks or stone by where the adventurer stands).
 * Presentation only: nothing here reads a roll, changes a tick, an action or the walk graph. Never Math.random.
 * Ticked by HolmIslandFx.update (island only); disposed with it. */
var HolmSound=(function(){
 'use strict';
 var seed=0x50f7d1;function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
 var qs=typeof location!=='undefined'&&location.search?new URLSearchParams(location.search):null;
 var STEPS=(function(){try{return (qs&&qs.get('steps')==='1')||localStorage.getItem('cr_sfx_steps')==='1'}catch(e){return false}})();
 // the stroke's contact, as a fraction of each clip (measured: see strokes() below)
 var CONTACT={chop:.44,mine:.38};
 var st={on:false,kind:null,prev:0,struck:false,V:null,strikes:{chop:0,mine:0},
  forge:null,water:null,waterT:0,waterWant:0,furnace:null,voiceT:3,voiced:{},steps:0,stepAcc:0,last:null,beds:{forge:0,water:0}};

 function P(){return typeof player!=='undefined'&&player?player:null}
 function S(){return typeof Sfx!=='undefined'&&Sfx.play?Sfx:null}
 function gmix(){var p=P();return p&&p.userData&&p.userData.gmix||null}
 // the stroke this action plays, if the island's adventurer has its clip: 'chop' | 'mine' | null
 function strokeKind(){var a=typeof Player!=='undefined'&&Player.action;if(!a||a.type!=='gather'||!a.obj)return null;var u=a.obj.userData||{};
  var k=u.rtype==='tree'?'chop':u.rtype==='rock'?'mine':null;if(!k)return null;var g=gmix();return g&&g.clips&&g.clips[k]?k:null}
 // Sfx asks: does the island play this stroke itself? (then the tick's call stands down)
 function syncs(kind){return st.on&&strokeKind()===kind}

 /* ---------------- the chop and the pick, on the stroke ---------------- */
 // measured on the kit's clips (2026-09-29, the right hand's height sampled over each stroke): the axe and the pick drop
 // sharply at about 0.33 of the stroke and come to rest in the wood or the rock at 0.44 (chop) and 0.38 (mine), where
 // they stay until the recovery; the keys are stepped, so the clip's own time is the blow (a "lowest point, then rise"
 // detector, right for the anvil's bouncing hammer, would fire on the recovery here, 0.28 s late)
 function strokes(){var k=strokeKind(),g=gmix(),s=S();if(!k||!s){st.kind=null;return}
  var clip=g.clips[k];if(!clip.isRunning()){st.prev=0;st.struck=false;return}
  if(st.kind!==k){st.kind=k;st.prev=0;st.struck=false}
  var dur=clip.getClip().duration||1,ph=(clip.time%dur)/dur;
  if(ph<st.prev-.3)st.struck=false;                                             // a new stroke (the loop wrapped, or the clip restarted)
  if(!st.struck&&(st.prev<CONTACT[k]||ph<st.prev)&&ph>=CONTACT[k]){st.struck=true;st.strikes[k]++;s.play(k);st.last={kind:k,phase:+ph.toFixed(3),at:Date.now()}}
  st.prev=ph}

 /* ---------------- beds: the furnace, the shore ---------------- */
 function bed(name,id,want){var s=S();if(!s)return;var b=st[name];if(!b){if(!(want>0)||!s.loop)return;b=st[name]=s.loop(id);if(!b)return}
  b.setGain(typeof document!=='undefined'&&document.hidden?0:want);st.beds[name]=+want.toFixed(3)}
 function furnacePos(){if(st.furnace&&st.furnace.parent)return st.furnace;st.furnace=typeof scene!=='undefined'&&scene?scene.getObjectByName('island-lesson-furnace'):null;return st.furnace}
 function shoreWant(){var p=P(),d=typeof HolmArrivalQA!=='undefined'&&HolmArrivalQA.mapData?HolmArrivalQA.mapData():null;if(!p||!d||!d.terrain||!d.terrain.water)return 0;
  if(p.position.y<-10)return 0;   // down in the ore workings
  var T=d.terrain,W=T.width,D=T.depth,cx=Math.floor(p.position.x),cz=Math.floor(p.position.z),wet=0,n=0;
  for(var z=cz-5;z<=cz+5;z++)for(var x=cx-5;x<=cx+5;x++){var r=Math.hypot(x-cx,z-cz);if(r>5)continue;n++;
   var k=x<0||z<0||x>=W||z>=D?1:T.water[z*W+x];if(k===1||k===2)wet+=r<=2?1.5:1}
  return Math.min(1,Math.pow(wet/Math.max(1,n),.6)*1.3)}

 /* ---------------- the creatures talk ---------------- */
 function voices(dt){var s=S(),p=P();if(!s||!p||typeof WORLD==='undefined'||!WORLD.npcs)return;st.voiceT-=dt;if(st.voiceT>0)return;st.voiceT=2.5+rnd()*3;
  var now=Date.now(),list=[];WORLD.npcs.forEach(function(n){if(!n||n.dead||n.dying||!n.mesh||!n.mesh.visible)return;var sp=s.species(n);if(!sp)return;
   if(n.mode==='attack'||(typeof Player!=='undefined'&&Player.target===n))return;
   var d=Math.hypot(n.mesh.position.x-p.position.x,n.mesh.position.z-p.position.z);if(d>10||Math.abs(n.mesh.position.y-p.position.y)>4)return;
   var key=n.id||n.mesh.uuid;if(st.voiced[key]&&now-st.voiced[key]<(sp==='cow'?12000:7000))return;list.push({n:n,key:key})});
  if(!list.length)return;var pick=list[Math.floor(rnd()*list.length)%list.length];if(rnd()<.55){st.voiced[pick.key]=now;s.creature(pick.n,'idle')}}

 /* ---------------- footsteps (opt-in) ---------------- */
 function steps(){var p=P(),s=S();if(!STEPS||!p||!s)return;var q=p.position;if(!st.lastPos){st.lastPos={x:q.x,z:q.z};return}
  var d=Math.hypot(q.x-st.lastPos.x,q.z-st.lastPos.z);st.lastPos.x=q.x;st.lastPos.z=q.z;if(d>2){st.stepAcc=0;return}   // a teleport or a climb, not a step
  st.stepAcc+=d;if(st.stepAcc<.55)return;st.stepAcc=0;st.steps++;
  var g=typeof HolmArrivalQA!=='undefined'&&HolmArrivalQA.mapData?HolmArrivalQA.mapData():null,surf='grass';
  if(q.y<-10)surf='stone';else if(g&&g.terrain&&typeof HolmOverhaulTerrain!=='undefined'){try{var ty=HolmOverhaulTerrain.sample(g.terrain,q.x,q.z);if(isFinite(ty)&&q.y-ty>.25)surf='wood'}catch(e){}}
  s.step(surf)}

 function update(dt){if(!st.on)return;dt=Math.min(.1,Math.max(0,dt||0));if(!st.V&&typeof THREE!=='undefined')st.V=new THREE.Vector3();if(!st.V)return;
  try{strokes()}catch(e){}
  var p=P();if(!p)return;
  try{var f=furnacePos(),fd=f?Math.hypot(f.position.x-p.position.x,f.position.z-p.position.z)+Math.abs(f.position.y-p.position.y)*.5:Infinity;
   bed('forge','forge_loop',fd<=2?1:fd>=9?0:Math.pow(1-(fd-2)/7,1.4))}catch(e){}
  try{st.waterT-=dt;if(st.waterT<=0){st.waterT=.5;st.waterWant=shoreWant()}bed('water','water_loop',st.waterWant)}catch(e){}
  try{voices(dt)}catch(e){}
  try{steps()}catch(e){}}
 function start(){st.on=true}
 function dispose(){['forge','water'].forEach(function(k){if(st[k]){try{st[k].stop()}catch(e){}st[k]=null}});st.on=false;st.furnace=null;st.lastPos=null}
 function status(){return {on:st.on,strokes:Object.assign({},st.strikes),lastStroke:st.last,beds:Object.assign({},st.beds),steps:STEPS?st.steps:'off',
  syncing:strokeKind()}}
 return {start:start,update:update,dispose:dispose,syncs:syncs,status:status,CONTACT:CONTACT};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmSound;
