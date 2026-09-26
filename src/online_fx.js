/* ============ OnlineFX — server combat events drawn on the tick (W2 online alpha) ============
 * The server says what happened each 600 ms tick: who swung ('attack'/'cast' animations), who took which hit ('h'),
 * and which projectiles fly ('fx' with d = ticks until the server applies the hit). This file only decides WHEN to
 * show it, through the game's own combat layer (src/combat_fx.js: UI.floatDmg, CombatFX.melee/launch/expectProjectile,
 * onKill) so online splats, bars and projectiles look exactly like offline ones.
 *
 * When a hit shows (the 2004 queue timings, server/README.md "Queues and hit timing"): from the swing tick T
 *   player -> NPC:     T + max(1, d)            (melee d = 0 lands the NPC's next turn)
 *   NPC -> player:     T + d                    (melee the same tick)
 *   player -> player:  T + d, +1 when the target's pid is lower than the attacker's (the 2004 PID effect)
 * A melee hit that lands the same tick is drawn at the swing's impact frame (CombatFX.melee + floatDmg); one that
 * lands next tick starts its swing late so the impact frame meets the splat. A projectile's draw/cast starts late
 * enough that release + flight end on the landing tick, and its splat waits for the visual to arrive.
 * Pure timing helpers are exported for tools/test_online_client.js.
 */
(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OnlineTiming=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 // holm_kit_v2 key frames (combat_fx.js KIT / SPEED): the impact / release moment of each clip, in seconds
 var KIT_IMPACT={slash:.30,stab:.30,crush:.40,bow:.83/1.35,cast:.47/1.15};
 /** ticks from the swing until the hit shows. att/tgt: {kind:'me'|'player'|'npc', pid?} */
 function landingOffset(att,tgt,d){
  d=d|0;
  if(!att||!tgt)return d;
  if(tgt.kind==='npc')return Math.max(1,d);
  if(att.kind==='npc')return d;
  return d+((tgt.pid|0)<(att.pid|0)?1:0);
 }
 /** CombatFX's visual flight time for a projectile over a distance (releaseFx), seconds */
 function flightTime(kind,dist){var d=Math.max(.5,dist);return kind==='arrow'?Math.max(.22,Math.min(.6,d/17+.1)):Math.max(.3,Math.min(.85,d/11+.14))}
 /** when the draw/cast starts (and how much faster it plays when the hit lands sooner than the full draw) so that
  *  release + flight end exactly when the server applies the hit; the draw never runs faster than MIN_RELEASE */
 var MIN_RELEASE=.2;
 function projectilePlan(landSec,release,flight){
  var rel=release,speed=1;
  if(rel+flight>landSec){rel=Math.max(MIN_RELEASE,landSec-flight);speed=release/rel}
  var start=Math.max(0,landSec-flight-rel);
  return {start:start,release:rel,speed:speed,arrive:start+rel+flight,late:Math.max(0,rel+flight-landSec)}}
 /** delay before a melee swing starts so its impact frame meets a splat that lands after landSec */
 function swingDelay(landSec,impact){return Math.max(0,landSec-impact)}
 return {MIN_RELEASE:MIN_RELEASE,KIT_IMPACT:KIT_IMPACT,landingOffset:landingOffset,flightTime:flightTime,projectilePlan:projectilePlan,swingDelay:swingDelay};
});

var OnlineFX=(function(){
 'use strict';
 if(typeof window==='undefined')return null;
 var TICK=0.6;   // seconds per server tick (setTickMs from the welcome)
 var later=[],swings=[],projectiles=[],log=[],generic=[],lateLog=[],stats={hits:0,splats:0,projectiles:0,matchedProjectile:0,matchedSwing:0,matchedNext:0,generic:0,late:0,swingsPlayed:0,deaths:0};
 function now(){return performance.now()/1000}
 function schedule(sec,fn){if(sec<=0.001){fn();return}later.push({at:now()+sec,fn:fn})}
 function runLater(){if(!later.length)return;var t=now(),due=[];for(var i=later.length-1;i>=0;i--)if(later[i].at<=t){due.push(later[i]);later.splice(i,1)}due.sort(function(a,b){return a.at-b.at});
  for(var k=0;k<due.length;k++){try{due[k].fn()}catch(e){console.error('[OnlineFX]',e)}}}
 function A(){return OnlineActors}
 function obj(e){return A().entObj(e)}
 function isKit(e){return e.kind==='me'||e.kind==='player'}
 function refOf(e){return e.kind==='npc'?['n',e.id]:['p',e.id]}
 /** what the timing rules need to know about an entity: monster or adventurer, and the adventurer's pid */
 function who(e){return e.kind==='npc'?{kind:'npc'}:{kind:'player',pid:e.id}}
 function dist(a,b){var p=a.mover,q=b.mover;return Math.hypot(p.x-q.x,p.z-q.z)}
 function impactOf(e,type){
  if(isKit(e))return OnlineTiming.KIT_IMPACT[type]||.3;
  var o=obj(e);return typeof CombatFX!=='undefined'&&CombatFX.impactTime?CombatFX.impactTime(o,type):.22;
 }
 /* ---- swings and reactions ---- */
 function playAttack(e,type,spec,speed){
  var o=obj(e);if(!o)return;stats.swingsPlayed++;
  if(isKit(e)){
   var clip=type==='ranged'?'bow':type==='magic'?'cast':'attack_'+(type||'slash');
   var base=typeof CombatFX!=='undefined'&&CombatFX.speedFor?CombatFX.speedFor(clip):1;
   if(!A().playClip(e,clip,spec?1.15:(speed&&speed>1?base*speed:undefined))&&typeof swing==='function')swing(o,type)
  }else if(typeof swing==='function')swing(o,type==='ranged'?'bow':type==='magic'?'cast':type);
 }
 function react(e,dmg){
  if(!e||e.dead)return;
  if(e.kind==='player'&&e.gmix){var gm=e.gmix,busy=gm.attack&&gm.attack.isRunning&&gm.attack.isRunning();if(!busy)A().playClip(e,dmg>0?'hit':'block')}
 }
 /* ---- hits ---- */
 function setHp(e,hp){if(!hp)return;e.hp=hp;if(e.kind==='npc')e.rec.hp=hp[0];if(e.isMe&&typeof OnlineUI!=='undefined')OnlineUI.setMyHp(hp)}
 function splat(e,amount,hp){var o=obj(e);if(!o)return;setHp(e,hp);UI.floatDmg(o,amount);stats.splats++;e.lastHitAt=performance.now();
  log.push({t:Date.now(),to:refOf(e),dmg:amount});if(log.length>400)log.shift()}
 function onHit(e,amount,type,hp,n){
  stats.hits++;
  // 1) a projectile flying at this target
  var best=null;for(var i=0;i<projectiles.length;i++){var p=projectiles[i];if(p.done||p.tgt!==e||p.splash)continue;if(p.landTick>n+1)continue;if(!best||p.landTick<best.landTick)best=p}
  if(best){best.done=true;stats.matchedProjectile++;
   if(best.f){var o=obj(e);setHp(e,hp);if(typeof CombatFX!=='undefined')CombatFX.expectProjectile(best.f,o);UI.floatDmg(o,amount);stats.splats++;e.lastHitAt=performance.now();
    log.push({t:Date.now(),to:refOf(e),dmg:amount,proj:1});schedule(Math.max(0,best.arriveAt-now()),function(){react(e,amount)})}
   else best.hits.push({amount:amount,hp:hp});
   return}
  // 2) a melee swing on this target that lands this tick (splat at the swing's impact frame)
  for(var j=0;j<swings.length;j++){var s=swings[j];if(s.used||s.tgt!==e||s.landTick!==n)continue;s.used=true;
   if(s.mode==='same'){stats.matchedSwing++;var ao=obj(s.att),to=obj(e);setHp(e,hp);
    if(ao&&typeof CombatFX!=='undefined'&&CombatFX.melee)CombatFX.melee(ao,{mesh:to},s.type,amount,s.maxHit||0);
    UI.floatDmg(to,amount);stats.splats++;e.lastHitAt=performance.now();log.push({t:Date.now(),to:refOf(e),dmg:amount,melee:1});
    schedule(impactOf(s.att,s.type),function(){react(e,amount)})}
   else{stats.matchedNext++;splat(e,amount,hp);react(e,amount)}
   return}
  // 3) anything else (a late tick, a swing we could not see): show it now
  stats.generic++;splat(e,amount,hp);react(e,amount);
  generic.push({n:n,to:refOf(e),dmg:amount,swings:swings.map(function(s){return {att:refOf(s.att),tgt:s.tgt?refOf(s.tgt):null,land:s.landTick,used:s.used,born:s.born}}),proj:projectiles.map(function(p){return {tgt:refOf(p.tgt),land:p.landTick,done:p.done,splash:p.splash}})});if(generic.length>40)generic.shift();
 }
 /* ---- one server tick ---- */
 function onTick(n,ev){
  var i;
  // projectile plans first: they decide when the matching draw/cast starts
  var plans={};
  for(i=0;i<(ev.fx||[]).length;i++){
   var f=ev.fx[i],att=A().entByRef(f.from),tgt=A().entByRef(f.to);if(!att||!tgt)continue;
   var kind=f.k==='arrow'?'arrow':'magic',off=OnlineTiming.landingOffset(who(att),who(tgt),f.d),landSec=off*TICK;
   var release=impactOf(att,kind==='arrow'?'bow':'cast'),flight=OnlineTiming.flightTime(kind,dist(att,tgt));
   var plan=OnlineTiming.projectilePlan(landSec,release,flight);if(plan.late>0.05){stats.late++;lateLog.push({n:n,from:f.from,to:f.to,d:f.d,off:off,dist:+dist(att,tgt).toFixed(2),release:+release.toFixed(3),flight:+flight.toFixed(3)});if(lateLog.length>40)lateLog.shift()}
   var p={att:att,tgt:tgt,kind:kind,landTick:n+off,start:plan.start,release:plan.release,speed:plan.speed,arriveAt:now()+plan.arrive,splash:!!f.splash,sp:f.sp||null,hits:[],f:null,done:false,born:n};
   projectiles.push(p);stats.projectiles++;plans[refOf(att).join(':')]=p;
   (function(p){schedule(p.start,function(){launch(p)})})(p);
  }
  // animations: swings (timed to their landing), deaths, eating
  for(i=0;i<(ev.anims||[]).length;i++){
   var a=ev.anims[i],e=a.ent,an=a.a;if(!e||!an)continue;
   if(an.name==='attack'||an.name==='cast'){
    var type=an.name==='cast'?'magic':(an.type||'slash');
    var plan2=plans[refOf(e).join(':')];
    if(type==='ranged'||type==='magic'){(function(e,type,spec,st,sp){schedule(st,function(){playAttack(e,type,spec,sp)})})(e,type,an.spec,plan2?plan2.start:0,plan2?plan2.speed:1);continue}
    var tgt2=A().entByRef(e.face)||(e.isMe?null:null);
    var off2=tgt2?OnlineTiming.landingOffset(who(e),who(tgt2),0):0;
    var sw={att:e,tgt:tgt2,type:type,landTick:n+off2,mode:off2===0?'same':'next',used:false,born:n,maxHit:e.isMe&&typeof OnlineUI!=='undefined'?OnlineUI.myMaxHit():0};
    swings.push(sw);
    var delay=off2>0?OnlineTiming.swingDelay(off2*TICK,impactOf(e,type)):0;
    (function(e,type,spec){schedule(delay,function(){playAttack(e,type,spec)})})(e,type,an.spec);
   }else if(an.name==='death'){
    stats.deaths++;
    if(e.kind==='npc')A().npcDeath(e);
    else{e.dead=true;A().playClip(e,'death');if(e.isMe&&typeof OnlineUI!=='undefined')OnlineUI.onMyDeath()}
   }else if(an.name==='eat'){if(e.isMe&&typeof Sfx!=='undefined'&&Sfx.eat)Sfx.eat()}
  }
  // hits
  for(i=0;i<(ev.hits||[]).length;i++){var h=ev.hits[i];for(var k=0;k<h.h.length;k++)onHit(h.ent,h.h[k][0],h.h[k][1],k===h.h.length-1?h.hp:null,n)}
  // housekeeping: forget swings and projectiles that can no longer match
  swings=swings.filter(function(s){return !s.used&&s.landTick>=n-1});
  projectiles=projectiles.filter(function(p){return !p.done&&p.landTick>=n-2||(!p.f&&!p.done&&p.hits.length)});
 }
 function launch(p){
  var ao=obj(p.att),to=obj(p.tgt);if(!ao||!to||typeof CombatFX==='undefined'){p.done=true;return}
  var tint=null;if(p.sp&&typeof SPELLS!=='undefined'&&SPELLS[p.sp]&&SPELLS[p.sp].color!=null)tint=SPELLS[p.sp].color;
  p.f=CombatFX.launch(p.kind,ao,to,{dmg:p.splash?0:1,tint:tint,spell:p.sp,release:p.release});
  p.arriveAt=now()+p.release+OnlineTiming.flightTime(p.kind,dist(p.att,p.tgt));
  // hits that arrived before the launch (a late tick) wait for the visual like any other
  for(var i=0;i<p.hits.length;i++){var e=p.tgt,h=p.hits[i];setHp(e,h.hp);CombatFX.expectProjectile(p.f,to);UI.floatDmg(to,h.amount);stats.splats++;e.lastHitAt=performance.now();
   log.push({t:Date.now(),to:refOf(e),dmg:h.amount,proj:1,late:1})}
  if(p.hits.length){p.done=true;p.hits.length=0}
 }
 function frame(){runLater()}
 function reset(){later=[];swings=[];projectiles=[]}
 function setTickMs(ms){TICK=(ms||600)/1000}
 return {onTick:onTick,frame:frame,reset:reset,setTickMs:setTickMs,stats:function(){return Object.assign({pending:later.length,flying:projectiles.length},stats)},generic:function(){return generic.slice()},lateLog:function(){return lateLog.slice()},log:function(){return log.slice()}};
})();
