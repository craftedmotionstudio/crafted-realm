/* ============ LocalCombat — the offline combat engine (2004 rules, one formula set) ============
 * The client's own fights (Tutor's Holm, single player) run the SAME rules as the authoritative server: every roll,
 * max hit, delay, XP amount, prayer and death rule comes from shared/combat.js, shared/pvp.js and shared/drops.js
 * (CRShared.*, ported from Lost City's 2004scape content scripts, MIT). The flow below is a step-by-step port of
 * server/engine/combat.js + Npc.js + Player.js (processInteraction) onto the client's entities:
 *   - a 600 ms map clock (called from the game loop's fixed tick), NPCs processed before the player (World.cycle);
 *   - entity queues with the engine's two countdown rules (player: delay d runs on pass d+1; npc: on pass max(1,d)),
 *     so a player's melee lands on the NPC's next turn, arrows at floor((46+5d+30)/30), spells at floor((46+10d)/30)+1,
 *     an NPC's melee the same tick, its arrows at floor((32+5d)/30) and its spells at floor((46+10d)/30);
 *   - attack delays in ticks per weapon (rapid -1, magic 5), retaliation after floor(speed/2), the 8-tick single-way
 *     lock ("You are already under attack!"), eating (3-tick bite, +3 on the attack timer, drops the attack order),
 *     the prayer drain counter, Protect Item, 0..max damage, XP in tenths per style;
 *   - NPCs stand and step on tiles (TileNav, 8 directions, 2004 naive chase), wander, hunt (aggression: ignore players
 *     above twice their level), leash to their spawn and respawn; drops roll through the weighted drop tables.
 * Presentation goes through CombatHooks (src/combat_hooks.js); nothing here draws. The online layer does NOT run this
 * engine: it renders the server's results through the same hooks (docs/rebuild/COMBAT_CLIENT_HOOKS.md). */
var LocalCombat=(function(){
 'use strict';
 var C=null,PVP=null,DR=null,R=null,TICK_S=0.6;
 var clock=0,rng=null,wrng=null,worldQ=[],on=true,PT=null,inTick=false;
 /** the adventurer's logical tile: cached for the whole tick (it cannot change while the tick resolves) */
 function ptile(){if(inTick){if(PT===undefined||PT===null)PT=TileNav.playerNode();return PT}return TileNav.playerNode()}
 function ready(){if(!C&&typeof CRShared!=='undefined'&&CRShared.combat){C=CRShared.combat;PVP=CRShared.pvp;DR=CRShared.drops;R=CRShared.rng;rng=rng||R.math;wrng=wrng||R.math}
  return !!C&&typeof Player!=='undefined'&&typeof WORLD!=='undefined'}
 var COMBAT_QUEUES=['npc_retaliate','npc_damage','death'];
 /* ------------------------------------------------------------------------------------------------ queues */
 function Queue(kind){this.kind=kind;this.items=[]}
 Queue.prototype.add=function(name,delay,fn){this.items.push({name:name,delay:delay|0,fn:fn})};
 Queue.prototype.clear=function(names){if(!names){this.items=[];return}this.items=this.items.filter(function(r){return names.indexOf(r.name)<0})};
 Queue.prototype.has=function(name){return this.items.some(function(r){return r.name===name})};
 Queue.prototype.process=function(){var snap=this.items.slice();for(var i=0;i<snap.length;i++){var req=snap[i];if(this.items.indexOf(req)<0)continue;var due;
   if(this.kind==='npc'){req.delay--;due=req.delay<=0}else{var d=req.delay--;due=d<=0}
   if(due){this.items.splice(this.items.indexOf(req),1);req.fn()}}};
 function schedule(delay,fn){worldQ.push({at:clock+Math.max(0,delay|0),fn:fn})}
 /* ------------------------------------------------------------------------------------------------ helpers */
 function say(text,kind){if(typeof CombatHooks!=='undefined')CombatHooks.message(text,kind||'combat');else if(typeof UI!=='undefined')UI.chat(text,kind||'combat')}
 function item(id){return id&&typeof ITEMS!=='undefined'?ITEMS[id]||null:null}
 function weapon(){return item(Player.equip&&Player.equip.weapon)}
 function wornDefs(){var out=[];for(var k in Player.equip){var d=item(Player.equip[k]);if(d)out.push(d)}return out}
 function levels(){return {attack:Player.lvl('Attack'),strength:Player.lvl('Strength'),defence:Player.lvl('Defence'),ranged:Player.lvl('Ranged'),magic:Player.lvl('Magic')}}
 function prayers(){return Array.from(Player.activePrayers||[])}
 function category(){return C.weaponCategory(weapon())}
 function styles(){return C.stylesFor(weapon())}
 function style(){return C.styleFor(weapon(),Player.styleIndex|0)}
 function bonuses(){return C.equipmentBonuses(wornDefs())}
 function stats(){var st=style(),b=bonuses();return {style:st,bonuses:b,stats:C.playerCombatStats({levels:levels(),bonuses:b,prayers:prayers(),style:st})}}
 /** the autocast spell when it can be used (2004: autocast needs a staff) */
 function autocastSpell(){var w=weapon(),id=Player.autocast;if(!id||!w||w.style!=='magic')return null;var sp=typeof SPELLS!=='undefined'&&SPELLS[id];return sp&&sp.max!=null&&!sp.utility?id:null}
 function attackRange(){var st=style();return C.attackRange(weapon(),st.style,!!autocastSpell()&&st.type!=='ranged')}
 function isMulti(){return typeof curZone!=='undefined'&&curZone==='scarlands'}
 function friendly(){return typeof GameConfig!=='undefined'&&!!GameConfig.friendlyMode}
 function giveXp(table){for(var sk in table)if(table[sk]>0)Player.addXp(sk,table[sk]/10)}
 function refresh(){try{if(typeof UI!=='undefined'){UI.refreshHud();UI.refreshInv()}}catch(e){}}
 function moving(){
  if(Player.moveTo)return true;if(Player.path&&Player.path.length)return true;
  try{if(typeof HolmArrivalPlayer!=='undefined'&&HolmArrivalPlayer.active()&&HolmArrivalPlayer.snapshot){var s=HolmArrivalPlayer.snapshot();return !!(s&&s.moving)}}catch(e){}
  return false}
 /* ------------------------------------------------------------------------------------------------ player state */
 function P(){
  if(!Player._lc){Player._lc=true;Player.actionDelay=0;Player.eatDelay=0;Player.lastCombat=-1000;Player.aggressiveNpc=null;
   Player.cbQueue=new Queue('player');Player.prayerCounter=0;Player.prayerTimerAt=-1;Player.dead=false;Player.deathAt=-1;
   if(Player.styleIndex==null)Player.styleIndex=0;if(Player.targetOp===undefined)Player.targetOp=null;if(Player.autocast===undefined)Player.autocast=null}
  return Player}
 function clearInteraction(){Player.target=null;Player.targetOp=null;Player.targetArg=null;Player._ap=null;Player._opFor=null}
 function setInteraction(npc,op,arg){Player.target=npc;Player.targetOp=op||'attack';Player.targetArg=arg==null?null:arg;Player._ap=null;Player._opFor=npc}
 /* ------------------------------------------------------------------------------------------------ npc state */
 function N(n){
  if(!n._lc){n._lc=true;n.queue=new Queue('npc');n.actionDelay=-1000;n.lastCombat=-1000;n.aggressivePlayer=false;n.mode='wander';
   n.heroDmg=0;n.regenClock=0;n.wanderCounter=0;n.lcDying=false;n.respawnAt=-1;n.attackType=C.npcAttackType(n.t);
   n.attackRange=n.t.attackRange!=null?n.t.attackRange|0:(C.MELEE_TYPES.indexOf(n.attackType)>=0?0:7);
   var p=n.mesh.position;n.node=TileNav.nodeNear(p.x,p.y,p.z,3);n.spawnNode=n.node;
   if(n.node&&!n.exhibit){p.set(n.node.x,n.node.y,n.node.z)}
   if(n.home&&n.node)n.home.set(n.node.x,n.node.y,n.node.z)}
  return n}
 function nlevels(n){var l=C.npcLevels(n.t);l.hitpoints=n.hp;return l}
 function npcNode(n){N(n);if(!n.node){var p=n.mesh.position;n.node=TileNav.nodeNear(p.x,p.y,p.z,3)}return n.node}
 function same(a,b){return !!a&&!!b&&a.tx===b.tx&&a.tz===b.tz}
 function occupied(node,self){var ns=WORLD.npcs;for(var i=0;i<ns.length;i++){var o=ns[i];if(o===self||o.dead||!o._lc||!o.node)continue;if(same(o.node,node))return true}return false}
 function maxRange(n){return n.leash!=null?n.leash:(n.t.maxRange!=null?n.t.maxRange:7)}
 function wanderRange(n){if(n.penStatic||n.exhibit)return 0;if(n.wanderR!=null)return Math.max(0,Math.round(n.wanderR));return n.t.wander!=null?n.t.wander:5}
 /* ------------------------------------------------------------------------------------------------ npc movement (tiles) */
 function moveNpc(n,m){
  var pos=n.mesh.position;n._from={x:pos.x,y:pos.y,z:pos.z};n.node=m;n._to={x:m.x,y:m.y,z:m.z};n._k=0;n._stepDir=[m.x-n._from.x,m.z-n._from.z];
 }
 function tryStep(n,dx,dz,avoid){var m=TileNav.step(n.node,dx,dz);if(!m)return null;if(occupied(m,n))return null;if(avoid&&same(m,avoid))return null;return m}
 /** 2004 takeStep: the direct direction, else x only, else z only; blocked = wait (never onto `avoid`) */
 function stepToward(n,goal,avoid){
  var cur=n.node;if(!cur)return false;var dx=Math.sign(goal.tx-cur.tx),dz=Math.sign(goal.tz-cur.tz);if(!dx&&!dz)return false;
  var m=tryStep(n,dx,dz,avoid);if(!m&&dx&&dz)m=tryStep(n,dx,0,avoid)||tryStep(n,0,dz,avoid);
  if(!m)return false;moveNpc(n,m);return true}
 function chaseStep(n,pt){
  var cur=n.node;if(!cur||!pt)return false;var dx=pt.tx-cur.tx,dz=pt.tz-cur.tz;
  if(!dx&&!dz){var outs=[[1,0],[-1,0],[0,1],[0,-1]];for(var i=0;i<4;i++){var o=tryStep(n,outs[i][0],outs[i][1]);if(o){moveNpc(n,o);return true}}return false}
  if(Math.abs(dx)<=1&&Math.abs(dz)<=1&&dx&&dz){var c=tryStep(n,Math.sign(dx),0,pt)||tryStep(n,0,Math.sign(dz),pt);if(c){moveNpc(n,c);return true}return false}
  return stepToward(n,pt,pt)}
 /* ------------------------------------------------------------------------------------------------ reach */
 function inMeleeReach(a,b){if(!a||!b)return false;var dx=Math.abs(a.tx-b.tx),dz=Math.abs(a.tz-b.tz);return dx+dz===1&&TileNav.linked(a,b)}
 function inRangedReach(a,b,range){if(!a||!b||same(a,b))return false;return TileNav.cheb(a,b)<=range&&TileNav.los(a,b)}
 function npcInRange(n){var pt=ptile(),nt=n.node;if(!pt||!nt)return false;
  return n.attackRange<=0?inMeleeReach(nt,pt):inRangedReach(pt,nt,n.attackRange)}   // npc line of sight is traced back from the target
 /* ------------------------------------------------------------------------------------------------ npc AI (Npc.turn) */
 function resetDefaults(n){n.mode='wander';n._chase=false;if(n.target==='player')n.target=null}
 function startAttacking(n){n.mode='attack';n.target='player'}
 function validateTarget(n){
  if(Player.dead||Player.hp<=0)return false;var pt=ptile(),sp=n.spawnNode||n.node;if(!pt||!sp)return false;
  if(Math.abs(player.position.y-n.mesh.position.y)>6)return false;   // another storey / the cavern
  var mr=maxRange(n),dx=Math.abs(pt.tx-sp.tx),dz=Math.abs(pt.tz-sp.tz);
  if(n.attackRange<=0){if(Math.max(dx,dz)>mr+1)return false;if(dx===mr+1&&dz===mr+1)return false}
  else if(Math.max(dx,dz)>mr+n.attackRange)return false;
  return true}
 function huntable(n){
  var t=n.t;if(!t.aggro||n.exhibit||(friendly()&&!t.ignoreFriendly))return false;if(Player.dead||Player.hp<=0)return false;
  var pt=ptile(),nt=n.node;if(!pt||!nt)return false;
  var hr=t.huntRange!=null?t.huntRange:3;if(TileNav.cheb(pt,nt)>hr)return false;
  if(Math.abs(player.position.y-n.mesh.position.y)>4)return false;
  if(!(t.alwaysAggro||isMulti())&&Player.combatLevel()>(t.level|0)*2)return false;   // 2004: ignore players above twice our level
  if(!npcCheckNotCombat(n))return false;
  return validateTarget(n)}
 function npcTurn(n){
  N(n);
  if(n.dead){if(n.respawnAt>=0&&clock>=n.respawnAt)respawn(n);return}
  if(n.mode==='wander'&&huntable(n))startAttacking(n);
  if(--n.regenClock<=0){n.regenClock=100;if(n.hp<n.t.hp&&n.hp>0)n.hp++}   // 2004: one hitpoint per 100 ticks
  n.queue.process();
  if(n.dead||n.lcDying)return;
  if(n.mode==='wander'){wander(n);return}
  if(n.mode==='none')return;
  if(!validateTarget(n)){n._windup=null;resetDefaults(n);return}
  n.wanderCounter=0;n._chase=true;
  if(n._windup){if(clock>=n._windup.at)resolveSpecial(n);return}   // winding up: it holds its ground
  if(npcInRange(n)){npcAttack(n);return}
  var moved=chaseStep(n,ptile());
  if(moved&&n.t.givechase===false){resetDefaults(n);return}
  if(!moved){/* blocked this tick: wait, like the engine */}
 }
 function wander(n){
  var r=wanderRange(n),sp=n.spawnNode;
  if(r>0&&sp&&wrng.next()<0.125){var dx=Math.round(wrng.next()*(r*2)-r),dz=Math.round(wrng.next()*(r*2)-r);n._walk={tx:sp.tx+dx,tz:sp.tz+dz}}
  if(n._walk){if(!stepToward(n,n._walk)||(n.node&&n.node.tx===n._walk.tx&&n.node.tz===n._walk.tz))n._walk=null}
  if(n.wanderCounter++>=500){n.wanderCounter=0;if(sp&&!same(n.node,sp)){n.node=sp;n._to=null;n.mesh.position.set(sp.x,sp.y,sp.z)}}
 }
 /* ------------------------------------------------------------------------------------------------ npc -> player */
 /** is this NPC still standing in the world and able to fight? (a despawned or dying aggressor never locks you) */
 function alive(a){return !!a&&!a.dead&&!a.lcDying&&WORLD.npcs.indexOf(a)>=0}
 function npcCheckNotCombat(n){
  if(isMulti())return true;
  if(Player.lastCombat+C.SINGLE_COMBAT_TICKS>clock&&Player.aggressiveNpc&&Player.aggressiveNpc!==n&&alive(Player.aggressiveNpc))return false;
  return true}
 function npcSetAttackVars(n){Player.lastCombat=clock;Player.aggressiveNpc=n;n.attackingPlayer=true}
 /* A telegraphed special (our design; 2004 monsters had none): every `every`-th attack the monster rears up for
  * `windup` ticks (a message, the animation and a ring on the ground), then strikes whoever is still in its reach
  * with its own max hit. Stepping out of reach or praying against its style turns it aside. t.special =
  * {every, windup, maxHit, msg, hitMsg, missMsg}. */
 function startSpecial(n){var sp=n.t.special;n._windup={at:clock+(sp.windup||2)};n.actionDelay=clock+(n.t.speedTicks||4)+(sp.windup||2);
  npcSetAttackVars(n);say(sp.msg||('The '+n.t.name.toLowerCase()+' rears up...'),'combat');
  CombatHooks.attackAnim(n.mesh,'block');CombatHooks.telegraph(n.mesh,(sp.windup||2)*TICK_S,sp.radius||1.5)}
 function resolveSpecial(n){var sp=n.t.special;n._windup=null;
  if(!npcInRange(n)){say(sp.missMsg||'You step clear of the blow.','combat');CombatHooks.attackAnim(n.mesh,'crush');return}
  var lv=nlevels(n),type=n.attackType,hit=C.hitRoll(rng,C.npcAttackRoll(n.t,lv,prayers()),stats().stats.defenceRoll[type]),dmg=hit?C.damageRoll(rng,sp.maxHit||C.npcMaxHit(n.t,lv)):0;
  var sw=CombatHooks.meleeSwing(n.mesh,player,'crush',0);if(sp.hitMsg&&dmg>0)say(sp.hitMsg,'combat');
  Player.cbQueue.add('npc_damage',0,function(){damagePlayer(dmg,n,{kind:'npcMelee',delay:Math.max(0,sw.impactAt-(typeof CombatFX!=='undefined'&&CombatFX.now?CombatFX.now():0)),atype:'crush'})});
  Player.cbQueue.add('npc_retaliate',0,function(){autoRetaliate(n)})}
 function npcAttack(n){
  if(Player.dead){resetDefaults(n);return}
  if(n.actionDelay>clock)return;
  if(!npcCheckNotCombat(n)){resetDefaults(n);return}
  if(n.t.special&&!n.t.harmless){n.specialCount=(n.specialCount|0)+1;if(n.specialCount%(n.t.special.every||4)===0){startSpecial(n);return}}
  var def=n.t,type=n.attackType,lv=nlevels(n);
  var atk=C.npcAttackRoll(def,lv,prayers()),defRoll=stats().stats.defenceRoll[type],max=C.npcMaxHit(def,lv);
  var hit=C.hitRoll(rng,atk,defRoll),damage=hit?C.damageRoll(rng,max):0,rate=def.speedTicks>0?def.speedTicks:C.DEFAULT_ATTACK_RATE;
  var pt=ptile();try{n.mesh.lookAt(player.position.x,n.mesh.position.y,player.position.z)}catch(e){}
  n.lastAttackTick=clock;
  if(def.harmless){npcSetAttackVars(n);n.actionDelay=clock+rate;CombatHooks.meleeSwing(n.mesh,player,def.atype||'slash',0);return}
  if(type==='ranged'||type==='magic'){
   var dist=pt&&n.node?TileNav.cheb(n.node,pt):1,delay=type==='ranged'?C.npcRangedHitDelay(dist):C.npcMagicHitDelay(dist);
   n.actionDelay=clock+rate;
   CombatHooks.attackAnim(n.mesh,type==='ranged'?'bow':'cast');
   var h=CombatHooks.projectile(n.mesh,player,type==='ranged'?'arrow':'spell',Math.max(1,delay),{dmg:damage,splash:type==='magic'&&!hit,tint:type==='magic'?(def.spellTint||0xc86aff):undefined,spell:def.spell||null});
   if(type==='ranged'||hit){var d=damage;
    Player.cbQueue.add('npc_damage',delay,function(){damagePlayer(d,n,{kind:type==='ranged'?'arrow':'magic',fx:h})});
    Player.cbQueue.add('npc_retaliate',delay,function(){autoRetaliate(n)})}
   else Player.cbQueue.add('npc_retaliate',0,function(){autoRetaliate(n)});   // a splash draws retaliation at once
   npcSetAttackVars(n);return}
  npcSetAttackVars(n);n.actionDelay=clock+rate;if(n.hp<=0)return;
  var dd=damage,swingAt=CombatHooks.meleeSwing(n.mesh,player,def.atype||'slash',0);
  Player.cbQueue.add('npc_damage',0,function(){damagePlayer(dd,n,{kind:'npcMelee',delay:Math.max(0,swingAt.impactAt-(typeof CombatFX!=='undefined'&&CombatFX.now?CombatFX.now():0)),atype:def.atype||''})});
  Player.cbQueue.add('npc_retaliate',0,function(){autoRetaliate(n)});
 }
 /** damage_self: a hit on the adventurer (hitpoints change now; the splat shows at the impact frame / on arrival) */
 function damagePlayer(amount,src,o){
  if(Player.dead||Player.hp<=0)return;o=o||{};
  var dmg=Math.max(0,Math.min(amount|0,Player.hp));Player.hp-=dmg;
  CombatHooks.hit(player,dmg,{kind:o.kind||'generic',fx:o.fx||null,delay:o.delay||0,atype:o.atype||''});
  try{UI.refreshHud()}catch(e){}
  if(Player.hp<=0){Player.hp=0;Player.cbQueue.add('death',0,startPlayerDeath)}
 }
 /** auto-retaliate: fight back when idle (not walking, not already fighting, not busy with a skill) */
 function autoRetaliate(n){
  if(!Player.autoRetaliate||Player.dead||!n||n.dead||n.lcDying)return;
  if((Player.target&&!Player.target.dead)||moving()||Player.action)return;
  if(Player.actionDelay<clock){var w=weapon();Player.actionDelay=clock+C.retaliateDelay(w,style().style)}
  setInteraction(n,'attack');
 }
 /* ------------------------------------------------------------------------------------------------ player -> npc */
 function npcAttackable(n){return !!n&&!n.dead&&!n.lcDying&&n.hp>0&&n.t.attackable!==false}
 function pvmInCombatCheck(n){
  if(isMulti())return true;
  var a=Player.aggressiveNpc;
  if(Player.lastCombat+C.SINGLE_COMBAT_TICKS>clock&&a&&a!==n&&alive(a)){say('You are already under attack!','combat');return false}
  return true}
 function npcRetaliate(n,delay){n.queue.add('retaliate',delay,function(){npcDefaultRetaliate(n)});n.aggressivePlayer=true;if(n.lastCombat<clock)n.lastCombat=clock}
 function npcDefaultRetaliate(n){
  if(Player.dead||n.dead||n.lcDying)return;
  var readyNow=(n.actionDelay+8<clock)||n.mode!=='attack';if(!readyNow)return;
  n.actionDelay=clock+C.npcRetaliateDelay(n.t);startAttacking(n)}
 function maybeSpecial(attackRoll,maxHit){
  if(!Player.specArmed)return {attackRoll:attackRoll,maxHit:maxHit,spec:null};
  var w=weapon(),sp=w&&typeof SPECIALS!=='undefined'&&SPECIALS[w.model];Player.specArmed=false;
  if(!sp||(Player.spec|0)<sp.cost){try{if(UI.refreshSpec)UI.refreshSpec()}catch(e){}if(sp)say('You do not have enough special attack energy.','combat');return {attackRoll:attackRoll,maxHit:maxHit,spec:null}}
  Player.spec-=sp.cost;try{if(UI.refreshSpec)UI.refreshSpec()}catch(e){}say(sp.msg,'combat');
  var r=C.applySpecial(sp,attackRoll,maxHit);return {attackRoll:r.attackRoll,maxHit:r.maxHit,spec:sp}}
 function capOf(n,max){return n.t.maxDealt!=null?Math.min(max,n.t.maxDealt):max}
 function meleeOnNpc(n){
  if(Player.actionDelay>clock)return true;
  if(n.hp<=0)return false;
  var s=stats(),st=s.style,sp=maybeSpecial(s.stats.attackRoll[st.type],s.stats.maxHit),damage=0,max=capOf(n,sp.maxHit);
  if(C.hitRoll(rng,sp.attackRoll,C.npcDefenceRoll(n.t,nlevels(n),st.type))){damage=C.damageRoll(rng,max);var capped=Math.min(damage,n.hp);giveXp(C.combatXp(st.style,capped));n.heroDmg+=capped}
  CombatHooks.meleeSwing(player,n.mesh,st.type,1);
  npcRetaliate(n,0);
  var dmg=damage,isMax=damage>0&&damage>=max&&max>=3;
  n.queue.add('damage',0,function(){npcDamage(n,dmg,{kind:'melee',style:'melee',max:isMax,atype:st.type})});
  Player.actionDelay=clock+C.attackDelay(weapon(),st.style,false);Player.lastAttackTick=clock;
  if(sp.spec)Player.lastSpec=clock;
  return true}
 function rangedOnNpc(n){
  if(Player.actionDelay>clock)return true;
  if(n.hp<=0)return false;
  var w=weapon(),s=stats(),st=s.style;Player.actionDelay=clock+C.attackDelay(w,st.style,false);
  var ammo=w&&w.needs;if(ammo&&Player.count(ammo)<1){say('There is no ammo left in your quiver.','combat');return false}
  var sp=maybeSpecial(s.stats.attackRoll.ranged,s.stats.maxHit),damage=0,max=capOf(n,sp.maxHit);
  if(C.hitRoll(rng,sp.attackRoll,C.npcDefenceRoll(n.t,nlevels(n),'ranged'))){damage=C.damageRoll(rng,max);var capped=Math.min(damage,n.hp);giveXp(C.combatXp(st.style,capped));n.heroDmg+=capped}
  if(ammo)Player.removeItem(ammo,1);
  var pt=ptile(),dist=pt&&n.node?TileNav.cheb(pt,n.node):1,delay=C.rangedHitDelay(dist);
  if(ammo)dropAmmo(ammo,n,Math.floor(C.arrowDuration(dist)/30));
  CombatHooks.attackAnim(player,'bow');
  var dmg=damage,isMax=damage>0&&damage>=max&&max>=3,h=CombatHooks.projectile(player,n.mesh,'arrow',delay,{dmg:dmg,max:isMax});
  npcRetaliate(n,delay);
  n.queue.add('damage',delay,function(){npcDamage(n,dmg,{kind:'arrow',style:'ranged',fx:h})});
  Player.lastAttackTick=clock;if(sp.spec)Player.lastSpec=clock;
  return true}
 function runesOk(sp){var w=weapon(),prov=w&&w.provides;for(var r in sp.runes||{}){if(prov===r)continue;if(Player.count(r)<sp.runes[r])return false}return true}
 function spendRunes(sp){var w=weapon(),prov=w&&w.provides;for(var r in sp.runes||{}){if(prov===r)continue;Player.removeItem(r,sp.runes[r])}}
 function spellRequirements(id){var sp=typeof SPELLS!=='undefined'&&SPELLS[id];
  if(!sp||sp.max==null||sp.utility)return {ok:false,text:'You cannot cast that on anyone.'};
  if(Player.lvl('Magic')<sp.req)return {ok:false,text:'You need a Magic level of '+sp.req+' to cast this spell.'};
  if(!runesOk(sp))return {ok:false,text:'You do not have enough runes to cast this spell.'};
  return {ok:true,spell:sp}}
 function resetAutocast(){Player.autocast=null;if(Player.spell&&!Player.castSpell)Player.spell=null;Player.castMode=false;try{if(UI.refreshSpells)UI.refreshSpells();if(UI.refreshCombat)UI.refreshCombat()}catch(e){}}
 function magicOnNpc(n,id,fromAutocast){
  if(fromAutocast){var pre=spellRequirements(id);if(!pre.ok){say(pre.text,'plain');if(Player.autocast===id)resetAutocast();return false}}
  if(clock<Player.actionDelay)return true;
  var req=spellRequirements(id);if(!req.ok){say(req.text,'plain');if(fromAutocast&&Player.autocast===id)resetAutocast();return false}
  if(!pvmInCombatCheck(n))return false;if(!npcAttackable(n))return false;
  var sp=req.spell;spendRunes(sp);Player.addXp('Magic',C.spellXp10(sp)/10);Player.actionDelay=clock+C.MAGIC_ATTACK_RATE;
  var pt=ptile(),dist=pt&&n.node?TileNav.cheb(pt,n.node):1,delay=C.magicHitDelay(dist);
  var s=stats(),max=capOf(n,sp.max),h,landed=C.hitRoll(rng,s.stats.attackRoll.magic,C.npcDefenceRoll(n.t,nlevels(n),'magic'));
  CombatHooks.attackAnim(player,'cast');
  if(landed){
   var damage=C.damageRoll(rng,max);npcRetaliate(n,delay);
   h=CombatHooks.projectile(player,n.mesh,'spell',delay,{dmg:damage,max:damage>0&&damage>=max&&max>=3,tint:sp.color,spell:id,splash:false});
   n.queue.add('damage',delay,function(){npcDamage(n,damage,{kind:'magic',style:'magic',fx:h})});
   var capped=Math.min(damage,n.hp);giveXp(C.combatXp(C.magicDamageStyle(s.style.style),capped));n.heroDmg+=capped}
  else{h=CombatHooks.projectile(player,n.mesh,'spell',delay,{dmg:0,tint:sp.color,spell:id,splash:true});npcRetaliate(n,0);n.lastSplashTick=clock}
  Player.lastAttackTick=clock;
  return fromAutocast||autocastSpell()===id}
 /* ------------------------------------------------------------------------------------------------ damage, death */
 function npcDamage(n,damage,o){
  if(n.hp<=0||n.dead||n.lcDying)return;o=o||{};
  var d=Math.max(0,Math.min(damage|0,n.hp));n.hp-=d;n.target='player';
  CombatHooks.hit(n.mesh,d,{kind:o.kind||'generic',fx:o.fx||null,max:!!o.max,atype:o.atype||''});
  if(n.hp>0)return;
  n.killStyle=o.style||null;
  n.queue.add('death',0,function(){startNpcDeath(n)});
 }
 function rollDrops(n){var t=n.t,table=t.dropTable||DR.fromLegacy(t.drops||[]);return DR.roll(rng,table,t.sharedDrops||null)}
 function startNpcDeath(n){
  if(n.dead)return;n.lcDying=true;n.mode='none';n._walk=null;
  if(Player.aggressiveNpc===n){Player.lastCombat=-1000;Player.aggressiveNpc=null}   // "%lastcombat = null": others may fight at once
  var drops=rollDrops(n),where=n.node||{x:n.mesh.position.x,z:n.mesh.position.z};
  if(typeof killNpc==='function')killNpc(n,{attackStyle:n.killStyle,dropList:drops,at:where});
  else n.dead=true;
  n.respawnAt=clock+Math.max(1,Math.round((n.t.respawn||60)/TICK_S));
  if(Player.target===n)clearInteraction();
 }
 function respawn(n){
  n.dead=false;n.dying=false;n.lcDying=false;n.hp=n.t.hp;n.queue.clear();n.mode='wander';n.actionDelay=-1000;n.lastCombat=-1000;n.aggressivePlayer=false;
  n.heroDmg=0;n.target=null;n.respawnAt=-1;n._to=null;n._walk=null;n.curses=null;n._windup=null;n.specialCount=0;
  var sp=n.spawnNode||n.node,m=n.mesh;n.node=sp;m.visible=true;m.rotation.set(0,0,0);
  if(m.userData._baseScale!==undefined)m.scale.setScalar(m.userData._baseScale);
  if(sp)m.position.set(sp.x,sp.y,sp.z);if(n.hpbar&&n.hpbar.spr)n.hpbar.spr.visible=false;
  if(WORLD.clickables.indexOf(m)<0)WORLD.clickables.push(m);
 }
 function dropAmmo(id,n,delayTicks){
  if(rng.random(5)===0)return;var nd=n.node;if(!nd)return;
  schedule(delayTicks,function(){if(typeof addGroundStack==='function')addGroundStack(id,1,nd.x,nd.z)})}
 function startPlayerDeath(){
  if(Player.dead)return;Player.dead=true;Player.deathAt=clock+4;clearInteraction();TileNav.stopPlayer();
  Player.cbQueue.clear(COMBAT_QUEUES);
  try{if(typeof HolmIslandPlayer!=='undefined'&&HolmIslandPlayer.active())HolmIslandPlayer.play('death')}catch(e){}
  say('Oh dear, you are dead!','combat');
  WORLD.npcs.forEach(function(n){if(n._lc&&n.mode==='attack')resetDefaults(n)});
 }
 function finishPlayerDeath(){
  Player.dead=false;Player.deathAt=-1;Player.actionDelay=0;Player.eatDelay=0;Player.lastCombat=-1000;Player.aggressiveNpc=null;
  Player.cbQueue.clear(COMBAT_QUEUES);Player.prayerCounter=0;Player.prayerTimerAt=-1;
  if(typeof playerDeath==='function')playerDeath();
 }
 /* ------------------------------------------------------------------------------------------------ the player's turn */
 function playerTimers(){
  if(Player.activePrayers&&Player.activePrayers.size){
   if(Player.prayerTimerAt<0)Player.prayerTimerAt=clock;
   if(clock>=Player.prayerTimerAt+C.PRAYER_DRAIN_INTERVAL){Player.prayerTimerAt=clock;
    var res=C.prayerDrainTick(Player.prayerCounter|0,C.prayerDrainEffect(prayers()),C.prayerDrainResistance(bonuses().prayer));
    Player.prayerCounter=res.counter;
    if(res.drained>0){Player.prayerPts=Math.max(0,Math.ceil(Player.prayerPts)-res.drained);
     if(Player.prayerPts<=0){Player.prayerPts=0;Player.activePrayers.clear();Player.prayerCounter=0;Player.prayerTimerAt=-1;
      say('You have run out of prayer points, you must recharge at an altar.','combat');try{if(typeof refreshOverhead==='function')refreshOverhead()}catch(e){}}
     try{UI.refreshHud();if(UI.refreshPrayers)UI.refreshPrayers()}catch(e){}}}
  }else Player.prayerTimerAt=-1;
 }
 function reachFor(op){return op==='cast'?10:attackRange()}
 function inReach(n,op){var pt=ptile(),nt=npcNode(n),r=reachFor(op);return r<=0?inMeleeReach(pt,nt):inRangedReach(pt,nt,r)}
 function approach(n,op){
  var pt=ptile(),nt=npcNode(n);if(!pt||!nt)return false;
  var r=reachFor(op),k=TileNav.key(nt);
  if(Player._ap&&Player._ap.for===k&&moving())return true;   // still walking the plan made for where it stands now
  var goal=r<=0?function(m){return inMeleeReach(m,nt)}:function(m){return inRangedReach(m,nt,r)};
  var path=TileNav.bfs(pt,goal,{max:6000,avoid:function(m){return same(m,nt)}});
  if(!path){Player._ap=null;return false}
  var dest=path[path.length-1];
  var fails=Player._ap&&Player._ap.for===k?Player._ap.fails|0:0;
  if(!TileNav.walkPlayerTo(dest)){if(++fails>=3){Player._ap=null;return false}}else fails=0;
  Player._ap={for:k,dest:TileNav.key(dest),fails:fails};return true}
 function attackNpc(n){
  if(Player.hp<=0)return false;if(!npcAttackable(n))return false;if(!pvmInCombatCheck(n))return false;
  var st=style();if(st.type==='ranged')return rangedOnNpc(n);
  var ac=autocastSpell();if(ac)return magicOnNpc(n,ac,true);
  return meleeOnNpc(n)}
 function playerInteraction(){
  var n=Player.target;if(!n){Player.targetOp=null;return}
  if(!n.t||!n.mesh||n.dead||n.lcDying||WORLD.npcs.indexOf(n)<0){clearInteraction();return}
  N(n);if(Player._opFor!==n){Player.targetOp='attack';Player.targetArg=null;Player._opFor=n;Player._ap=null}var op=Player.targetOp||'attack';
  if(inReach(n,op)){
   TileNav.stopPlayer();Player._ap=null;
   try{player.lookAt(n.mesh.position.x,player.position.y,n.mesh.position.z)}catch(e){}
   var keep=op==='cast'?castOn(n,Player.targetArg):attackNpc(n);
   if(!keep)clearInteraction();
   return}
  if(!approach(n,op)){say("I can't reach that!",'plain');clearInteraction()}
 }
 function castOn(n,id){if(Player.hp<=0||!npcAttackable(n))return false;return magicOnNpc(n,id,false)}
 function playerTurn(){
  if(Player.dead){if(clock>=Player.deathAt)finishPlayerDeath();return}
  Player.cbQueue.process();
  if(Player.dead)return;
  playerTimers();
  playerInteraction();
 }
 /* ------------------------------------------------------------------------------------------------ the tick */
 function tick(force){
  if(!ready()||(!on&&!force))return;P();clock++;inTick=true;PT=null;
  if(worldQ.length){var due=worldQ.filter(function(q){return q.at<=clock});worldQ=worldQ.filter(function(q){return q.at>clock});due.forEach(function(q){try{q.fn()}catch(e){console.error(e)}})}
  var ns=WORLD.npcs.slice();for(var i=0;i<ns.length;i++){try{npcTurn(ns[i])}catch(e){console.error('[LocalCombat] npc turn',e)}}
  try{playerTurn()}catch(e){console.error('[LocalCombat] player turn',e)}
  inTick=false;PT=null;
 }
 /** per frame: NPCs glide between tile centres (one tile per tick) and face whom they fight */
 function npcFrame(n,dt){
  if(!n._lc||n.dead)return;var m=n.mesh;
  if(n._to){n._k=Math.min(1,(n._k||0)+dt/TICK_S);var f=n._from,t=n._to,k=n._k,x=f.x+(t.x-f.x)*k,z=f.z+(t.z-f.z)*k,y=f.y+(t.y-f.y)*k;
   if(!n.node.island&&typeof groundY==='function'){var g=groundY(x,z);if(g!==null&&Number.isFinite(g))y=g}
   m.position.set(x,y,z);n.moving=true;
   if(n.mode!=='attack'&&n._stepDir&&(n._stepDir[0]||n._stepDir[1]))m.lookAt(x+n._stepDir[0],y,z+n._stepDir[1]);
   if(k>=1)n._to=null}
  if(n.mode==='attack'&&!Player.dead&&typeof player!=='undefined')m.lookAt(player.position.x,m.position.y,player.position.z);
  n.chasing=n.mode==='attack';
 }
 /* ------------------------------------------------------------------------------------------------ orders from the interface */
 /** click / right-click "Attack": a spell armed from the spellbook (2004 "use spell" cursor) makes this a single cast */
 function orderAttack(n){
  if(!ready()||!n||n.dead)return false;P();if(Player.dead)return false;
  N(n);Player.action=null;
  if(Player.castSpell){var id=Player.castSpell;Player.castSpell=null;if(Player.spell===id&&!autocastSpell())Player.spell=null;Player.castMode=!!autocastSpell();
   try{if(UI.refreshSpells)UI.refreshSpells()}catch(e){}
   setInteraction(n,'cast',id);return true}
  setInteraction(n,'attack');return true}
 /** 2004 eating: one bite per 3 ticks, +3 ticks on the attack timer, and the attack order is dropped */
 function eat(slot){
  if(!ready())return false;P();if(Player.dead)return true;
  var s=Player.inv[slot],def=s&&item(s.id);if(!def||!(def.heal>0))return false;
  clearInteraction();
  if(!C.canEat(Player.eatDelay,clock))return true;
  var t=C.applyEat({actionDelay:Player.actionDelay},clock);Player.eatDelay=t.eatDelay;Player.actionDelay=t.actionDelay;
  if(s.qty>1)s.qty--;else Player.inv[slot]=null;
  var before=Player.hp;Player.hp=Math.min(Player.maxHp,Player.hp+def.heal);Player.lastEatTick=clock;
  try{if(typeof Sfx!=='undefined')Sfx.eat()}catch(e){}
  say('You eat the '+def.name.toLowerCase()+'.'+(Player.hp>before?' It heals some health.':''),'plain');
  refresh();try{if(typeof Events!=='undefined')Events.emit('eat',{id:s.id,slot:slot,tick:clock})}catch(e){}
  return true}
 /** 2004 prayer switch: same-group prayers replace each other; needs points and the level; drain by the counter */
 function togglePrayer(id){
  if(!ready())return false;P();var d=C.PRAYERS[id],meta=typeof PRAYERS!=='undefined'&&PRAYERS[id];if(!d)return false;
  if(Player.activePrayers.has(id)){Player.activePrayers.delete(id);if(!Player.activePrayers.size)Player.prayerTimerAt=-1}
  else{
   if(Player.lvl('Prayer')<d.level){say('You need a Prayer level of '+d.level+' to use '+(meta?meta.name:'that prayer')+'.','plain');return false}
   if(Math.ceil(Player.prayerPts)<1){say('You have run out of prayer points, you must recharge at an altar.','plain');return false}
   C.prayerConflicts(id).forEach(function(o){Player.activePrayers.delete(o)});Player.activePrayers.add(id);
   if(Player.prayerTimerAt<0)Player.prayerTimerAt=clock}
  try{if(typeof refreshOverhead==='function')refreshOverhead();UI.refreshHud();if(UI.refreshPrayers)UI.refreshPrayers()}catch(e){}
  return true}
 function setStyle(i){P();var list=styles();Player.styleIndex=Math.max(0,Math.min(i|0,list.length-1));return style()}
 /** the spellbook: with a staff a combat spell becomes the autocast; without one it is armed for a single cast */
 function selectSpell(id){
  P();var sp=SPELLS[id];if(!sp)return false;var w=weapon();
  if(w&&w.style==='magic'){Player.castSpell=null;Player.autocast=Player.autocast===id?null:id;Player.spell=Player.autocast;Player.castMode=!!Player.autocast;
   say(Player.autocast?'Autocast set: '+sp.name+'.':'Autocast cleared.','sys');return true}
  if(Player.castSpell===id){Player.castSpell=null;Player.spell=null;Player.castMode=false;say('You lower your hand.','sys');return true}
  Player.castSpell=id;Player.spell=id;Player.castMode=true;say('Choose a target for '+sp.name+'.','sys');return true}
 /* ------------------------------------------------------------------------------------------------ appraisal (Appraise) */
 /** exact per-swing odds for the current setup against an NPC type: {acc, max, speed, nAcc, nMax, nSpeed} */
 function appraise(t){
  if(!ready())return null;var s=stats(),st=s.style,lv=C.npcLevels(t),w=weapon(),ac=autocastSpell();
  var type=ac?'magic':st.type,att=s.stats.attackRoll[type],max=ac?SPELLS[ac].max:s.stats.maxHit;
  var nType=C.npcAttackType(t);
  return {acc:C.hitChance(att,C.npcDefenceRoll(t,lv,type)),max:max,speed:ac?C.MAGIC_ATTACK_RATE:C.attackDelay(w,st.style,false),
   nAcc:C.hitChance(C.npcAttackRoll(t,lv,prayers()),s.stats.defenceRoll[nType]),nMax:C.npcMaxHit(t,lv),nSpeed:t.speedTicks||4}}
 /* ------------------------------------------------------------------------------------------------ exports */
 return {
  ready:ready,tick:tick,npcFrame:npcFrame,clock:function(){return clock},TICK_S:TICK_S,
  setRng:function(r){rng=r||(R&&R.math)},rng:function(){return rng},setWanderRng:function(r){wrng=r||(R&&R.math)},enable:function(v){on=v!==false},
  orderAttack:orderAttack,eat:eat,togglePrayer:togglePrayer,selectSpell:selectSpell,setStyle:setStyle,style:function(){return ready()?style():null},
  styles:function(){return ready()?styles():[]},category:function(){return ready()?category():'unarmed'},autocastSpell:function(){return ready()?autocastSpell():null},
  attackRange:function(){return ready()?attackRange():0},stats:function(){return ready()?stats():null},appraise:appraise,
  attackDelay:function(){if(!ready())return 4;return autocastSpell()?C.MAGIC_ATTACK_RATE:C.attackDelay(weapon(),style().style,false)},
  damagePlayer:function(amount,src,o){if(ready()){P();damagePlayer(amount,src,o)}},
  npcDamage:function(n,d,o){if(ready()){N(n);npcDamage(n,d,o)}},npcRetaliate:function(n,delay){if(ready()){N(n);npcRetaliate(n,delay|0)}},
  register:function(n){if(ready())N(n)},respawn:function(n){if(ready()){N(n);respawn(n)}},
  clearInteraction:clearInteraction,schedule:schedule,
  // QA read-outs (never used by the game): the engine's view of one NPC and the adventurer
  qa:{npc:function(n){return n&&n._lc?{node:n.node&&{tx:n.node.tx,tz:n.node.tz},mode:n.mode,actionDelay:n.actionDelay,lastCombat:n.lastCombat,hp:n.hp,queue:n.queue.items.map(function(r){return [r.name,r.delay]}),lastAttackTick:n.lastAttackTick,dying:!!n.lcDying,dead:!!n.dead,respawnAt:n.respawnAt}:null},
   player:function(){P();var pt=ptile();return {clock:clock,tile:pt&&{tx:pt.tx,tz:pt.tz},actionDelay:Player.actionDelay,eatDelay:Player.eatDelay,lastCombat:Player.lastCombat,
    aggressiveNpc:!!Player.aggressiveNpc,queue:Player.cbQueue.items.map(function(r){return [r.name,r.delay]}),targetOp:Player.targetOp,dead:!!Player.dead,lastAttackTick:Player.lastAttackTick,prayerCounter:Player.prayerCounter}},
   inReach:function(n,op){return inReach(n,op||'attack')},
   // seeded fingerprints (tools/combat_fingerprint.js): run ticks synchronously while the game loop's ticks are off
   tick:function(){tick(true)},provoke:function(n){if(ready()){N(n);startAttacking(n)}}}
 };
})();
if(typeof module!=='undefined'&&module.exports)module.exports=LocalCombat;
