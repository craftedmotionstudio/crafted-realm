/* ============ CombatHooks — the one presentation funnel for combat ============
 * Everything a fight SHOWS goes through here: attack animations, hit splats, projectiles, deaths, XP drops and
 * combat messages. Two callers, one look:
 *   - the offline engine (src/combat_engine.js, LocalCombat) calls it as its own ticks resolve;
 *   - the online layer calls it from the server's tick deltas (docs/rebuild/NET_PROTOCOL.md: `a`, `h`, `fx`, `msg`)
 *     instead of rolling anything itself.
 * Contract (docs/rebuild/COMBAT_CLIENT_HOOKS.md): callers pass scene objects (THREE.Object3D bodies) and tick counts;
 * this file turns tick counts into seconds so a projectile lands on the tick its hit applies and a melee swing's
 * impact frame meets its splat. Presentation only: nothing here changes hitpoints, XP, items or timers.
 * Renders through CombatFX (src/combat_fx.js) and the game's swing()/UI helpers; every call is guarded so a missing
 * renderer never breaks the rules. */
var CombatHooks=(function(){
 'use strict';
 var TICK_S=0.6;
 var listeners=[];   // QA/telemetry: fn(event) for every presentation event (never used by the game rules)
 function emit(ev){for(var i=0;i<listeners.length;i++){try{listeners[i](ev)}catch(e){}}}
 function fx(){return typeof CombatFX!=='undefined'?CombatFX:null}
 function now(){var f=fx();return f&&f.now?f.now():0}
 /** seconds from the start of `type`'s attack animation to its impact (melee) or release (bow, cast) frame */
 function impactDelay(obj,type){var f=fx();try{return f&&f.impactTime?f.impactTime(obj,type):.3}catch(e){return .3}}
 var pendingAnims=[];
 /** play an attack animation now, or `delay` seconds from now. type: stab|slash|crush|bow|cast (|block|hit|eat) */
 function attackAnim(obj,type,delay){
  if(!obj)return;emit({k:'anim',obj:obj,type:type,delay:delay||0,t:now()});
  if(delay>0){pendingAnims.push({obj:obj,type:type,at:now()+delay});return}
  emit({k:'animStart',obj:obj,type:type,t:now()});
  try{if(typeof swing==='function')swing(obj,type)}catch(e){}
 }
 /**
  * A melee swing whose blow lands `ticks` ticks from now (the player's hit applies at the NPC's next turn: 1 tick;
  * an NPC's hit on a player applies the same tick: 0). With ticks > 0 the animation starts late enough that its impact
  * frame meets the splat; with 0 it starts now and the splat waits for the impact frame (CombatFX expect).
  */
 function meleeSwing(att,tgt,type,ticks,opts){
  opts=opts||{};var d=impactDelay(att,type);
  var start=ticks>0?Math.max(0,ticks*TICK_S-d):0;
  attackAnim(att,type,start);
  var f=fx();if(f&&f.swingSound&&opts.sound!==false){try{f.swingSound(att,type,start)}catch(e){}}
  emit({k:'swing',att:att,tgt:tgt,type:type,ticks:ticks,impactAt:now()+start+d});
  return {impactAt:now()+start+d};
 }
 /**
  * Launch an arrow or spell that lands exactly `ticks` ticks from now (the tick its hit is applied).
  * opts: {spell, tint, dmg, max, splash, release (seconds to the release frame; default from the animation)}.
  * Returns a handle to pass to hit() so the splat shows when the visual arrives.
  */
 function projectile(src,dst,kind,ticks,opts){
  opts=opts||{};var f=fx();if(!src||!dst)return null;
  var arrive=Math.max(.15,(ticks||1)*TICK_S);
  var rel=opts.release!=null?opts.release:impactDelay(src,kind==='arrow'?'bow':'cast');
  if(rel>arrive-.12)rel=Math.max(0,arrive*.5);   // a one-tick NPC shot releases early enough to fly
  var h=null;if(f&&f.launch)try{h=f.launch(kind==='arrow'?'arrow':'bolt',src,dst,{dmg:opts.dmg|0,max:!!opts.max,tint:opts.tint,spell:opts.spell,release:rel,arriveIn:arrive,splash:!!opts.splash})}catch(e){}
  emit({k:'projectile',src:src,dst:dst,kind:kind,ticks:ticks,arriveAt:now()+arrive,releaseAt:now()+rel,spell:opts.spell||null,splash:!!opts.splash,handle:h});
  return h;
 }
 /**
  * Show a hit splat on `obj` now (hitpoints already changed by the caller). opts:
  *   kind  'melee' (a player's blow), 'npcMelee' (a monster's blow on the player), 'arrow', 'magic', 'generic'
  *   fx    the projectile handle: the splat waits for the visual to land
  *   delay seconds until the impact frame (npcMelee: the attacker's impact frame after a same-tick hit)
  *   max   gold rim (a max hit);  atype stab|slash|crush (sound);  frac  the post-hit hitpoint fraction (online bodies)
  */
 function hit(obj,dmg,opts){
  opts=opts||{};if(!obj)return;var f=fx();
  emit({k:'hit',obj:obj,dmg:dmg|0,kind:opts.kind||'generic',t:now(),fx:!!opts.fx});
  if(f&&f.expect&&(opts.kind||opts.fx||opts.delay))try{f.expect(obj,opts.delay||0,opts.kind||'generic',opts.fx||null,!!opts.max,opts.atype||'',opts.frac)}catch(e){}
  if(typeof UI!=='undefined'&&UI.floatDmg)UI.floatDmg(obj,dmg|0);
  else if(f&&f.hit)f.hit(obj,dmg|0);
 }
 /** a body falls: topple when its killing splat shows, lie a moment, sink; `drops` (ground meshes) appear after */
 function death(npc,drops,silent){var f=fx();emit({k:'death',npc:npc,t:now()});
  if(npc&&npc.mesh&&typeof startDeath==='function'&&!npc.t.glb&&!npc.t.skinnedRig){npc.dying=true;startDeath(npc.mesh)}else if(npc&&npc.mesh&&!(npc.t&&!npc.t.glb&&!npc.t.skinnedRig))npc.mesh.visible=false;
  if(f&&f.onKill)try{f.onKill(npc,drops||[],!!silent)}catch(e){}}
 /** a telegraph: a ring on the ground under `obj` that fills over `seconds` (a special attack winding up) */
 function telegraph(obj,seconds,radius){var f=fx();emit({k:'telegraph',obj:obj,seconds:seconds,t:now()});if(f&&f.telegraph)try{f.telegraph(obj,seconds,radius)}catch(e){}}
 function xp(skill,amount){emit({k:'xp',skill:skill,amt:amount})}
 function message(text,kind){if(typeof UI!=='undefined'&&UI.chat)UI.chat(text,kind||'combat');emit({k:'msg',text:text})}
 /** per frame (after the game update): start the animations that were timed to land on a tick */
 function update(){if(!pendingAnims.length)return;var t=now();for(var i=pendingAnims.length-1;i>=0;i--){var a=pendingAnims[i];if(a.at<=t){pendingAnims.splice(i,1);emit({k:'animStart',obj:a.obj,type:a.type,t:t});try{if(typeof swing==='function')swing(a.obj,a.type)}catch(e){}}}}
 function on(fn){listeners.push(fn);return function(){var i=listeners.indexOf(fn);if(i>=0)listeners.splice(i,1)}}
 /** bodies that are not NPCs or the adventurer (online players, remote NPC views) can get a health bar */
 function track(obj,frac){var f=fx();if(f&&f.track)f.track(obj,frac)}
 function untrack(obj){var f=fx();if(f&&f.untrack)f.untrack(obj)}
 return {TICK_S:TICK_S,impactDelay:impactDelay,attackAnim:attackAnim,meleeSwing:meleeSwing,projectile:projectile,hit:hit,death:death,telegraph:telegraph,xp:xp,message:message,update:update,on:on,track:track,untrack:untrack};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=CombatHooks;
