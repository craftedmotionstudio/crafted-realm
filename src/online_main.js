/* ============ OnlineMain — ?online=1 glue (W2 online alpha) ============
 * Loaded (by CROnline.writeScripts) just before game5_main.js, only in online mode. It
 *   1. registers the server-map world provider so the normal boot builds the Scarlands test map instead of the Holm;
 *   2. replaces the offline frame update with a presentation-only one (the server simulates; we interpolate, animate,
 *      follow with the camera, keep the black void) - nothing local rolls, walks paths, runs NPC AI or saves;
 *   3. routes every click (ground, monsters, players, loot, the supply chest, the minimap) to intents;
 *   4. feeds each server tick to OnlineActors / OnlineFX / OnlineUI.
 * QA hooks: window.CROnlineQA (state snapshots and a few actions) for tools/online_multi_browser.js.
 */
var OnlineMain=(function(){
 'use strict';
 var net=new CRNet.Client({url:CROnline.server});
 var st={entered:false,welcome:null,pending:null,dest:null,frameT:0,uiT:0,lastTick:-1,ticks:0,errors:[],pvpAttacks:0,installedInput:false,log:[]};
 var OW=OnlineWorld;
 OW.register();

 /* ---------------- ground height, and the biome the minimap paints ---------------- */
 var groundY0=typeof groundY==='function'?groundY:null;
 window.groundY=function(x,z){
  var m=OW.model();if(!m)return 0;
  if(x<0||z<0||x>=m.width||z>=m.depth)return null;
  return OW.heightAt(x,z);
 };
 window.gridBiome=function(x,z){
  var m=OW.model();if(!m)return 'grass';var t=m.toTile(x,z);
  if(m.isBlocked(t.x,t.z))return 'rock';
  return m.wildernessLevel(t.x,t.z)>0?'scar':'grass';
 };

 /* ---------------- PRAYERS gets the server's Protect Item (the prayer book lists what the server allows) ---------------- */
 (function(){
  if(typeof PRAYERS==='undefined'||PRAYERS.protect_item)return;
  var order=Object.keys(PRAYERS),copy={};order.forEach(function(k){copy[k]=PRAYERS[k]});
  order.forEach(function(k){delete PRAYERS[k]});
  order.forEach(function(k){PRAYERS[k]=copy[k];if(k==='reflexes')PRAYERS.protect_item={name:'Protect Item',req:25,icon:'',drain:2,group:null}});
 })();

 /* ---------------- nothing local may change items or experience: the server is the only source ---------------- */
 // the combat agent's offline engine (docs/rebuild/COMBAT_CLIENT_HOOKS.md) never runs online
 if(typeof LocalCombat!=='undefined'&&LocalCombat.enable)try{LocalCombat.enable(false)}catch(e){}
 Player.addItem=function(){return false};
 Player.removeItem=function(){return false};
 Player.addXp=function(){};
 if(typeof Deeds!=='undefined')Deeds.check=function(){};

 /* ---------------- the presentation-only frame update ---------------- */
 var lastRaf=0;
 (function rafMark(){lastRaf=performance.now();requestAnimationFrame(rafMark)})();
 function onlineUpdate(dt){
  if(!st.entered){return}
  // a hidden or occluded page is stepped by the game's timer heartbeat, which skips the combat layer: step it here so
  // splats expire, bodies sink and their loot appears on time even while nobody is looking
  if(performance.now()-lastRaf>250&&typeof CombatFX!=='undefined'&&CombatFX.update)CombatFX.update(dt);
  OnlineActors.frame(dt);
  OnlineFX.frame(dt);
  OW.tick(dt);
  if(typeof HolmIslandPlayer!=='undefined')HolmIslandPlayer.update();
  if(typeof Controls!=='undefined'&&Controls.update)Controls.update(dt);
  if(typeof CharCreator!=='undefined'&&CharCreator.active)CharCreator.tick(dt);
  // the destination flag clears when we arrive
  var me=OnlineActors.me();
  if(st.dest&&me&&me.tile.x===st.dest.x&&me.tile.z===st.dest.z&&!me.mover.pending()){st.dest=null;Player.moveTo=null}
  st.uiT+=dt;if(st.uiT>0.5){st.uiT=0;try{UI.refreshRun()}catch(e){}}
  // black void past the draw distance (the old-school look)
  if(scene.fog){var near=camCtl.dist+24,far=camCtl.dist+32;scene.fog.near+=(near-scene.fog.near)*Math.min(1,dt*2.4);scene.fog.far+=(far-scene.fog.far)*Math.min(1,dt*2.4);
   scene.fog.color.lerp(BLACK,Math.min(1,dt*3));}
  if(scene.background&&scene.background.lerp)scene.background.lerp(BLACK,Math.min(1,dt*3));
  var goal=followCameraGoal(),cf=camFocus();camera.position.lerp(goal,0.15);camera.lookAt(cf.x,cf.y+1.2,cf.z);
 }
 var BLACK=null;
 function installUpdate(){
  BLACK=new THREE.Color(0x000000);
  window.update=onlineUpdate;
  if(scene&&scene.fog)scene.fog.color.setHex(0);
 }

 /* ---------------- input: every click is an intent ---------------- */
 function myTile(){var me=OnlineActors.me();return me?me.tile:null}
 function tileOfPoint(p){return OW.model().toTile(p.x,p.z)}
 function walkTile(t,quiet){
  var m=OW.model(),w=m.nearestWalkable(t.x,t.z,3);
  if(!w){if(!quiet)UI.chat('You cannot walk there.','plain');return false}
  OnlineUI.confirmWalk(w,function(){
   st.pending=null;
   net.send({t:'walk',x:w.x,z:w.z});st.dest=w;
   var wp=m.toWorld(w.x,w.z);Player.moveTo=new THREE.Vector3(wp.x,OW.heightAt(wp.x,wp.z),wp.z);
   if(typeof moveMarker==='function')try{moveMarker(Player.moveTo)}catch(e){}
  });
  return true;
 }
 function attackNpc(e){st.pending=null;st.dest=null;Player.moveTo=null;net.send({t:'op_npc',nid:e.id,op:'attack'})}
 function attackPlayer(e){st.pending=null;st.dest=null;Player.moveTo=null;st.pvpAttacks++;net.send({t:'op_player',pid:e.id,op:'attack'})}
 function follow(e){net.send({t:'op_player',pid:e.id,op:'follow'})}
 function take(uid){st.pending=null;net.send({t:'op_obj',uid:uid,op:'take'})}
 function kit(name){
  var a=OW.map().alpha,me=myTile();if(!a||!a.chest||!me)return;
  var reach=a.reach||2;
  // kept until the kit arrives: the chest refuses while you are still fighting (the 16-tick lock), so ask again
  st.pending={kind:'kit',name:name,until:performance.now()+120000,sentAt:0};   // cleared by any other order
  if(Math.max(Math.abs(me.x-a.chest.x),Math.abs(me.z-a.chest.z))<=reach){st.pending.sentAt=performance.now();net.send({t:'kit',name:name});return}
  var best=kitApproach(a,me);
  if(best){net.send({t:'walk',x:best.x,z:best.z});st.dest=best}
 }
 /** the tile beside the chest nearest to where we stand */
 function kitApproach(a,me){var m=OW.model(),best=null,bd=1e9;
  for(var dz=-1;dz<=1;dz++)for(var dx=-1;dx<=1;dx++){var x=a.chest.x+dx,z=a.chest.z+dz;if(!m.walkable(x,z))continue;var d=Math.abs(x-me.x)+Math.abs(z-me.z);if(d<bd){bd=d;best={x:x,z:z}}}
  return best}
 function checkPending(){
  var p=st.pending;if(!p)return;if(performance.now()>p.until){st.pending=null;return}
  if(p.kind==='kit'){var a=OW.map().alpha,me=myTile();if(!me)return;
   if(Math.max(Math.abs(me.x-a.chest.x),Math.abs(me.z-a.chest.z))<=(a.reach||2)){if(performance.now()-p.sentAt>3000){p.sentAt=performance.now();net.send({t:'kit',name:p.name})}return}
   // a long way off: the path finder only searches 64 tiles out (as in 2004), so keep walking in legs like a player re-clicking
   var key=me.x+','+me.z;if(key===p.lastKey)p.still=(p.still||0)+1;else{p.lastKey=key;p.still=0}
   if(p.still>=2){p.still=0;var best=kitApproach(a,me);if(best){net.send({t:'walk',x:best.x,z:best.z});st.dest=best}}}
 }
 function lvlSpan(my,their){return '<span style="color:'+OnlineActors.combatColour(my,their)+'">(level-'+their+')</span>'}
 function canAttackPlayer(e){
  var P=CRShared.pvp,m=OW.model(),me=myTile();if(!me||!e.tile)return {ok:false};
  var myWl=m.wildernessLevel(me.x,me.z),theirWl=m.wildernessLevel(e.tile.x,e.tile.z),myCb=OnlineUI.state().cb;
  var r=P.levelCheck(myCb,myWl,e.cb,theirWl);return {ok:!r,reason:r};
 }
 function castOn(kind,e,spell){st.pending=null;st.dest=null;Player.moveTo=null;OnlineUI.clearArmed();if(kind==='p')st.pvpAttacks++;net.send(kind==='n'?{t:'cast_npc',nid:e.id,spell:spell}:{t:'cast_player',pid:e.id,spell:spell})}
 function entriesFor(hit,ev){
  var out=[],o=hit&&hit.obj,u=(o&&o.userData)||{},myCb=OnlineUI.state().cb,armed=OnlineUI.armedSpell(),asp=armed&&SPELLS[armed];
  if(u.kind==='onl_npc'){var ne=OnlineActors.npcs().get(u.nid);
   if(ne&&!ne.rec.dead&&asp)out.push({html:'Cast <b style="color:#0f0">'+asp.name+'</b> -&gt; <b style="color:#ff0">'+ne.t.name+'</b> '+lvlSpan(myCb,ne.t.level),fn:function(){castOn('n',ne,armed)}});
   if(ne&&!ne.rec.dead){out.push({html:'Attack <b style="color:#ff0">'+ne.t.name+'</b> '+lvlSpan(myCb,ne.t.level),fn:function(){attackNpc(ne)}});
    out.push({html:'Examine <b style="color:#ff0">'+ne.t.name+'</b>',fn:function(){UI.chat(ne.t.examine||('A '+ne.t.name.toLowerCase()+'.'),'plain')}})}}
  else if(u.kind==='onl_player'){var pe=OnlineActors.players().get(u.pid);
   if(pe&&!pe.dead){var can=canAttackPlayer(pe);
    if(can.ok&&asp)out.push({html:'Cast <b style="color:#0f0">'+asp.name+'</b> -&gt; <b style="color:#fff">'+pe.name+'</b> '+lvlSpan(myCb,pe.cb),fn:function(){castOn('p',pe,armed)}});
    if(can.ok)out.push({html:'Attack <b style="color:#fff">'+pe.name+'</b> '+lvlSpan(myCb,pe.cb),fn:function(){attackPlayer(pe)}});
    out.push({html:'Follow <b style="color:#fff">'+pe.name+'</b> '+lvlSpan(myCb,pe.cb),fn:function(){follow(pe)}})}}
  else if(u.kind==='onl_obj'){
   var t=null;OnlineActors.objs().forEach(function(r){if(r.uid===u.uid)t=r});
   if(t)OnlineActors.objs().forEach(function(r){if(r.x!==t.x||r.z!==t.z||r.mesh.userData._cfxHide)return;var d=ITEMS[r.id];
    out.push({html:'Take <b style="color:#ff9040">'+d.name+'</b>'+(r.q>1?' ('+r.q+')':''),fn:function(){take(r.uid)}})});
   if(t)out.push({html:'Examine <b style="color:#ff9040">'+ITEMS[t.id].name+'</b>',fn:function(){UI.chat(ITEMS[t.id].examine||('It\'s '+ITEMS[t.id].name.toLowerCase()+'.'),'plain')}});
  }
  else if(u.kind==='onl_chest'){var a=OW.map().alpha;
   if(a&&a.kits){out.push({html:'Open <b style="color:#0ff">Supply chest</b>',fn:function(){OnlineUI.chestDialog(a.kits,kit)}});
    Object.keys(a.kits).forEach(function(k){out.push({html:'Take-'+k+'-kit <b style="color:#0ff">Supply chest</b>',fn:function(){kit(k)}})})}
   out.push({html:'Examine <b style="color:#0ff">Supply chest</b>',fn:function(){UI.chat('Fighting kits for anyone brave enough to cross the Ditch. Taking one swaps your pack and gear for it.','plain')}});
  }
  else if(u.kind==='onl_scenery'&&(u.examine||u.label)){out.push({html:'Examine',fn:function(){UI.chat(u.examine||'Nothing interesting.','plain')}})}
  var gp=ev?groundPick(ev):null;
  out.push({html:'Walk here',fn:function(){var p=gp||(hit&&hit.point);if(p)walkTile(tileOfPoint(p))}});
  out.push({html:'Cancel',fn:null});
  return out;
 }
 function installInput(){
  if(st.installedInput)return;st.installedInput=true;
  window.buildCtxEntries=entriesFor;
  window.handleClick=function(obj,point){
   if(typeof Sfx!=='undefined'&&Sfx.click)Sfx.click();
   if(OnlineUI.armedSpell()&&!(obj&&obj.userData&&/onl_(npc|player)/.test(obj.userData.kind||'')))OnlineUI.clearArmed();
   var u=obj&&obj.userData||{};
   var list=entriesFor({obj:obj,point:point},null);
   if(list.length>2&&list[0].fn&&u.kind&&u.kind!=='onl_scenery'){list[0].fn();return}
   if(point)walkTile(tileOfPoint(point));
  };
  window.minimapWalkTo=function(p){walkTile(tileOfPoint(p))};
  // hovering a monster shows its tile outline (the offline overlay reads _hoverNpc)
  var cv=document.getElementById('game-canvas');
  if(cv)cv.addEventListener('mousemove',function(e){try{if(typeof pick!=='function')return;var h=pick(e),u=h&&h.obj&&h.obj.userData;
   if(u&&u.kind==='onl_npc'){var ne=OnlineActors.npcs().get(u.nid);_hoverNpc=ne?ne.rec:null}}catch(err){}});
 }

 /* ---------------- ticks ---------------- */
 function onTick(m){
  st.ticks++;st.lastTick=m.n;
  var A=OnlineActors,ev={anims:[],hits:[],fx:m.fx||[]},me=A.me();
  // me
  if(me&&m.me){
   var u=m.me;
   if(u.tele){if(me.dead){me.dead=false;A.stopDeathClip(me);if(typeof OnlineUI!=='undefined')OnlineUI.closeOverlay&&0}
    A.applyMove(me,{x:u.x,z:u.z,tele:1});st.dest=null;Player.moveTo=null}
   else if(u.mv)A.applyMove(me,{x:u.x,z:u.z,mv:u.mv});
   if(u.f!==undefined){me.face=u.f;Player.target=u.f?(A.entByRef(u.f)||null):null;if(Player.target)Player.target=Player.target.rec||Player.target}
   if(u.a)ev.anims.push({ent:me,a:u.a});
   if(u.h)ev.hits.push({ent:me,h:u.h,hp:u.hp||null});
   if(u.c)A.say(player,u.c,OnlineUI.myName());
  }
  // other adventurers
  if(m.pl){
   (m.pl.del||[]).forEach(function(pid){A.removePlayer(pid)});
   (m.pl.add||[]).forEach(function(s){var e=A.addPlayer(s);if(e&&s.a)ev.anims.push({ent:e,a:s.a});if(e&&s.h)ev.hits.push({ent:e,h:s.h,hp:s.hp})});
   (m.pl.upd||[]).forEach(function(u){
    var e=A.players().get(u.i);if(!e)return;
    if(u.tele&&e.dead){e.dead=false;A.stopDeathClip(e)}
    A.updatePlayer(u);
    if(u.a)ev.anims.push({ent:e,a:u.a});if(u.h)ev.hits.push({ent:e,h:u.h,hp:u.hp})});
  }
  // monsters
  if(m.np){
   (m.np.del||[]).forEach(function(nid){A.removeNpc(nid)});
   (m.np.add||[]).forEach(function(s){var e=A.addNpc(s);if(e&&s.a)ev.anims.push({ent:e,a:s.a});if(e&&s.h)ev.hits.push({ent:e,h:s.h,hp:s.hp})});
   (m.np.upd||[]).forEach(function(u){var e=A.updateNpc(u);if(!e)return;if(u.a)ev.anims.push({ent:e,a:u.a});if(u.h)ev.hits.push({ent:e,h:u.h,hp:u.hp})});
  }
  // ground items
  if(m.ob){(m.ob.del||[]).forEach(function(uid){A.removeObj(uid)});(m.ob.add||[]).forEach(function(o){A.addObj(o)})}
  if(st.pending&&st.pending.kind==='kit'&&st.pending.sentAt&&m.eq)st.pending=null;   // the kit arrived
  OnlineFX.onTick(m.n,ev);
  OnlineUI.applyTick(m);
  // zone label: the area and the Scarlands level
  if(me){var mm=OW.model(),wl=mm.wildernessLevel(me.tile.x,me.tile.z),nm=mm.areaName(me.tile.x,me.tile.z)||'The Scarlands';
   var label=wl>0?'The Scarlands · Level '+wl:nm;if(label!==st.zone){st.zone=label;UI.zone(label)}}
  checkPending();
 }

 /* ---------------- entering the world ---------------- */
 function enter(w){
  st.welcome=w;
  OnlineActors.setTickMs(w.tickMs);OnlineFX.setTickMs(w.tickMs);
  OnlineActors.clearAll();OnlineFX.reset();
  OnlineUI.install(net);installInput();installUpdate();
  OnlineUI.applyWelcome(w);
  OnlineActors.initMe(w);
  // the adventurer: the Blender character kit with the look saved on the server
  if(typeof CharCfg!=='undefined'&&w.lk)CharCfg.kit=w.lk;
  if(typeof HolmIslandPlayer!=='undefined'&&!HolmIslandPlayer.active())HolmIslandPlayer.load().catch(function(){});
  // the offline tutorial's guidance arrow has no place online
  if(typeof GuideArrow!=='undefined'&&GuideArrow.setTarget){try{GuideArrow.setTarget(null)}catch(e){}GuideArrow.setTarget=function(){}}
  if(!st.entered){
   st.entered=true;
   document.getElementById('welcome-screen').style.display='none';
   running=true;_playClickedAt=performance.now();
   snapFollowCamera();
   UI.chat('Welcome to Crafted Realm online.','sys');
   UI.chat('North of the Ditch lie the Scarlands: anyone may attack you there. The supply chest by the campfire has fighting kits.','plain');
   UI.chat('Press Enter to talk. Your words appear over your head for everyone nearby.','sys');
  }
  var mm=OW.model(),wl=mm.wildernessLevel(w.x,w.z);UI.zone(wl>0?'The Scarlands · Level '+wl:(mm.areaName(w.x,w.z)||'The Commons'));
 }
 net.on('tick',onTick);
 net.on('dropped',function(){OnlineUI.connection('Connection lost. Please wait - attempting to reestablish.')});
 net.on('reconnected',function(w){OnlineUI.connection('');enter(w);UI.chat('Reconnected.','sys')});
 net.on('reconnect_failed',function(){OnlineUI.connection('Connection lost. Refresh the page to log in again.')});
 net.on('logout',function(m){OnlineUI.connection(m.reason==='logout'?'':'You have been logged out ('+m.reason+').');setTimeout(function(){location.reload()},m.reason==='logout'?300:2500)});
 net.on('error',function(m){st.errors.push(m.code);if(st.errors.length>50)st.errors.shift()});

 // the login screen replaces the local-save choices once the page (and the welcome screen) exists
 function boot(){OnlineUI.buildLogin(net)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
 // CharCreator (Shift+C / the appearance button) edits the kit look; confirming sends it to the server
 if(typeof HolmKitCreator!=='undefined'&&typeof CharCreator!=='undefined'){
  CharCreator.open=function(){CharCreator.active=true;HolmKitCreator.open()};
  var close0=HolmKitCreator.close;HolmKitCreator.close=function(save){var r=close0.apply(this,arguments);CharCreator.active=false;
   if(typeof CharCfg!=='undefined'&&CharCfg.kit)net.send({t:'look',look:CharCfg.kit});return r};
  var t0=CharCreator.tick;CharCreator.tick=function(dt){if(HolmKitCreator.active())return HolmKitCreator.tick(dt);return t0&&t0.call(CharCreator,dt)};
 }

 /* ---------------- QA surface (tools/online_multi_browser.js) ---------------- */
 window.CROnlineQA={
  net:net,
  state:function(){var s=OnlineActors.snapshot();s.tick=st.lastTick;s.ticks=st.ticks;s.entered=st.entered;s.ui=OnlineUI.state();s.fx=OnlineFX.stats();
   s.net={state:net.state,rtt:net.rtt,stats:net.stats};s.world=OW.snapshot();s.inv=Player.inv.map(function(x){return x?[x.id,x.qty]:null});s.equip=Object.assign({},Player.equip);
   s.hp=[Player.hp,Player.maxHp];s.prayers=Array.from(Player.activePrayers);s.errors=st.errors.slice();s.zone=st.zone;
   var ov=document.getElementById('onl-overlay');s.overlay=ov&&ov.style.display!=='none'?ov.textContent.slice(0,400):null;
   var chat=document.getElementById('chatbox');s.chat=chat?Array.prototype.slice.call(chat.children,-30).map(function(d){return d.textContent}):[];
   return s},
  walk:function(x,z){return net.send({t:'walk',x:x,z:z})},
  send:function(m){return net.send(m)},
  kit:kit,
  ditchOk:function(){OnlineUI.state();return true},
  attackPlayerByName:function(name){var hit=null;OnlineActors.players().forEach(function(e){if(e.name.toLowerCase()===String(name).toLowerCase())hit=e});if(!hit)return false;attackPlayer(hit);return true},
  attackNpcNearest:function(ty){var me=myTile(),best=null,bd=1e9;OnlineActors.npcs().forEach(function(e){if(e.rec.dead||(ty&&e.ty!==ty))return;var d=Math.max(Math.abs(e.tile.x-me.x),Math.abs(e.tile.z-me.z));if(d<bd){bd=d;best=e}});if(!best)return null;attackNpc(best);return {nid:best.id,ty:best.ty,d:bd}},
  eatFirst:function(){for(var i=0;i<Player.inv.length;i++){var s=Player.inv[i];if(s&&ITEMS[s.id].heal>0){net.send({t:'eat',slot:i});return i}}return -1},
  menuFor:function(kind,id){var o=null;if(kind==='player'){var e=OnlineActors.players().get(id);o=e&&e.root}else if(kind==='npc'){var n=OnlineActors.npcs().get(id);o=n&&n.rec.mesh}if(!o)return null;
   return entriesFor({obj:o,point:o.position},null).map(function(x){var d=document.createElement('div');d.innerHTML=x.html;return d.textContent})},
  screenOf:function(kind,id){var o=null;if(kind==='player'){var e=OnlineActors.players().get(id);o=e&&e.root}else if(kind==='npc'){var n=OnlineActors.npcs().get(id);o=n&&n.rec.mesh}else if(kind==='me')o=player;if(!o)return null;
   var v=new THREE.Vector3();o.getWorldPosition(v);v.y+=1;v.project(camera);return {x:(v.x+1)/2*innerWidth,y:(1-v.y)/2*innerHeight}},
  fxLog:function(){return OnlineFX.log()},
  /** frame a capture: the camera looks at the middle of these entities (review captures only) */
  focus:function(refs,dist){var pts=[];(refs||[]).forEach(function(r){var e=r[0]==='me'?OnlineActors.me():r[0]==='npc'?OnlineActors.npcs().get(r[1]):OnlineActors.players().get(r[1]);var o=e&&OnlineActors.entObj(e);if(o)pts.push(o.position)});
   if(!pts.length){window.__qaCameraFocus=null;return false}var f={x:0,y:0,z:0};pts.forEach(function(p){f.x+=p.x/pts.length;f.y+=p.y/pts.length;f.z+=p.z/pts.length});window.__qaCameraFocus=f;if(dist)camCtl.dist=dist;return true},
  unfocus:function(){window.__qaCameraFocus=null;camCtl.dist=33},
  npcTargeting:function(){var me=OnlineActors.me(),out=[];OnlineActors.npcs().forEach(function(e){if(e.face&&e.face[0]==='p'&&me&&e.face[1]===me.id&&!e.rec.dead)out.push(e.id)});return out},
  logout:function(){return net.send({t:'logout'})},
  drop:function(){return net.simulateDrop()}
 };
 return {net:net,enter:enter,entriesFor:entriesFor,walkTile:walkTile,st:st};
})();
