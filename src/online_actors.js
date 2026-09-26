/* ============ OnlineActors — everyone the server shows you (W2 online alpha) ============
 * Draws what the ticks describe (docs/rebuild/NET_PROTOCOL.md): yourself, other adventurers (the character kit with
 * their saved look and worn gear), the server's monsters (the same models the offline game builds) and ground items.
 * Movement: each tick's steps are replayed over the tick (walking 1 tile / 600 ms, running 2), 8 directions, a
 * teleport is a jump; the queue catches up if ticks bunch. Nothing here decides anything: positions, hitpoints and
 * deaths are the server's. Combat presentation (swings, splats, projectiles) is OnlineFX's job.
 * Tile maths lives in OnlineMap (src/online_world.js); the step queue (Mover) is pure and node-tested.
 */
(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OnlineMover=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 /** a step queue that replays server steps over time; positions are world points {x,z} */
 function Mover(x,z){this.x=x;this.z=z;this.q=[];this.seg=null;this.moving=false;this.speed=0;this.dirX=0;this.dirZ=0;this.maxBacklog=0;this.catchUps=0;this.teles=0}
 /** steps from one tick: every step gets tickMs / count (walk 600, run 300) */
 Mover.prototype.push=function(points,tickMs){
  if(!points||!points.length)return;var dur=(tickMs||600)/points.length;
  for(var i=0;i<points.length;i++)this.q.push({x:points[i].x,z:points[i].z,dur:dur});
 };
 Mover.prototype.tele=function(x,z){this.teles++;this.x=x;this.z=z;this.q.length=0;this.seg=null;this.moving=false;this.speed=0};
 /** advance by dtMs; returns true while moving. Falls behind by more than two ticks -> catches up faster. */
 Mover.prototype.update=function(dtMs){
  var budget=dtMs,moved=false,dist=0,backlog=this.q.length+(this.seg?1:0);
  if(backlog>this.maxBacklog)this.maxBacklog=backlog;
  var rush=backlog>6?2.2:backlog>4?1.5:1;if(rush>1)this.catchUps++;
  budget*=rush;
  while(budget>0){
   if(!this.seg){var n=this.q.shift();if(!n)break;this.seg={fx:this.x,fz:this.z,tx:n.x,tz:n.z,dur:Math.max(1,n.dur),t:0}}
   var s=this.seg,left=s.dur-s.t,use=Math.min(left,budget);s.t+=use;budget-=use;
   var k=s.t/s.dur,nx=s.fx+(s.tx-s.fx)*k,nz=s.fz+(s.tz-s.fz)*k;
   dist+=Math.hypot(nx-this.x,nz-this.z);
   var dx=s.tx-s.fx,dz=s.tz-s.fz;if(dx||dz){this.dirX=dx;this.dirZ=dz}
   this.x=nx;this.z=nz;moved=true;
   if(s.t>=s.dur){this.x=s.tx;this.z=s.tz;this.seg=null}
  }
  this.moving=moved;this.speed=moved&&dtMs>0?dist/(dtMs/1000):0;
  return moved;
 };
 Mover.prototype.pending=function(){return this.q.length+(this.seg?1:0)};
 return {Mover:Mover};
});

var OnlineActors=(function(){
 'use strict';
 if(typeof window==='undefined')return null;
 var KIT_URL='assets/models/holm_kit_v2.glb?v=8';
 var EQUIP_SLOTS=['head','cape','amulet','weapon','body','shield','legs','hands','feet'];
 var st={players:new Map(),npcs:new Map(),objs:new Map(),corpses:[],kitBuf:null,kitLoading:null,tickMs:600,me:null,
  stats:{playersBuilt:0,npcsBuilt:0,objsBuilt:0,rigFailures:0}};
 var V=null;
 function vec(){return V||(V=new THREE.Vector3())}
 function world(){return typeof OnlineWorld!=='undefined'?OnlineWorld:null}
 function map(){var w=world();return w&&w.model()}
 function groundAt(x,z){var w=world();return w?w.heightAt(x,z):0}
 function toW(x,z){return map().toWorld(x,z)}
 function blankEquip(eq){var e={};EQUIP_SLOTS.forEach(function(s){e[s]=(eq&&eq[s])||null});return e}
 function combatColour(my,their){var d=their-my;return d>=10?'#ff0000':d>=7?'#ff3000':d>=4?'#ff7000':d>=1?'#ffb000':d===0?'#ffff00':d<=-10?'#00ff00':d<=-7?'#40ff00':d<=-4?'#80ff00':'#c0ff00'}

 /* ---------------- the character kit, one fresh rig per remote adventurer ---------------- */
 function kitBuffer(){
  if(!st.kitLoading)st.kitLoading=Promise.all([typeof HolmKit!=='undefined'?HolmKit.load().catch(function(){}):null,
   fetch(KIT_URL).then(function(r){if(!r.ok)throw new Error('kit '+r.status);return r.arrayBuffer()})]).then(function(a){st.kitBuf=a[1];return a[1]});
  return st.kitLoading;
 }
 function buildRig(look){
  return kitBuffer().then(function(buf){return new Promise(function(res,rej){
   new THREE.GLTFLoader().parse(buf,'assets/models/',function(gltf){
    try{
     var rig=gltf.scene;if(typeof HolmKit!=='undefined'&&HolmKit.ready())HolmKit.apply(rig,look||null);
     rig.traverse(function(m){if(m.isMesh||m.isSkinnedMesh){m.castShadow=true;m.frustumCulled=false;[].concat(m.material).forEach(function(q){if(q&&'metalness' in q){q.metalness=0;q.roughness=1}})}});
     var box=new THREE.Box3();rig.updateMatrixWorld(true);rig.traverse(function(m){if((m.isMesh||m.isSkinnedMesh)&&m.visible)box.expandByObject(m)});
     rig.scale.setScalar(1.85/((box.max.y-box.min.y)||1));box=new THREE.Box3();rig.updateMatrixWorld(true);
     rig.traverse(function(m){if((m.isMesh||m.isSkinnedMesh)&&m.visible)box.expandByObject(m)});rig.position.y=-box.min.y;
     var mixer=new THREE.AnimationMixer(rig),clips={};gltf.animations.forEach(function(cl){clips[cl.name]=mixer.clipAction(cl)});
     if(clips.idle){clips.idle.play();clips.idle.weight=1}if(clips.walk){clips.walk.play();clips.walk.weight=0}
     res({rig:rig,gmix:{mixer:mixer,idle:clips.idle,walk:clips.walk,attack:null,block:clips.block,w:0,clips:clips,kit:true,run:clips.run||null}});
    }catch(e){rej(e)}
   },rej)})});
 }
 /** worn gear on any kit root: the game's own fitter (refreshGLBGear) run with this adventurer as `player` */
 function dress(root,eq){
  if(typeof refreshGLBGear!=='function'||!root.userData.rigInner)return;
  var prevP=player,prevE=Player.equip;
  try{player=root;Player.equip=blankEquip(eq);refreshGLBGear()}catch(e){console.warn('[OnlineActors] gear fit',e)}
  finally{player=prevP;Player.equip=prevE}
 }
 /** one-shot clip on a kit rig (the local adventurer goes through HolmIslandPlayer so its hooks stay in charge) */
 function playClip(ent,name,speed){
  if(ent.isMe&&typeof HolmIslandPlayer!=='undefined'&&HolmIslandPlayer.active()){var ok=HolmIslandPlayer.play(name);var gm0=player.userData.gmix;if(ok&&speed&&gm0&&gm0.attack)gm0.attack.timeScale=speed;return ok}
  var gm=ent.gmix;var act=gm&&gm.clips&&gm.clips[name];if(!act)return false;
  act.timeScale=speed||(typeof CombatFX!=='undefined'&&CombatFX.speedFor?CombatFX.speedFor(name):1);
  act.reset();act.setLoop(THREE.LoopOnce,1);act.clampWhenFinished=name==='death';act.weight=1;act.play();gm.attack=act;return true;
 }
 function stopDeathClip(ent){var gm=ent.isMe?(player&&player.userData.gmix):ent.gmix;var d=gm&&gm.clips&&gm.clips.death;if(d){d.stop();d.weight=0}if(gm&&gm.attack===d)gm.attack=null}

 /* ---------------- overhead icons: skull and protection prayer (Blender-rendered pixel icons) ---------------- */
 var ICON_TEX={};
 function iconTex(url){if(ICON_TEX[url])return ICON_TEX[url];var t=new THREE.TextureLoader().load(url);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;return ICON_TEX[url]=t}
 var PRAYER_ICON={melee:'assets/icons/ui/v3/prayers/protect_melee.png',ranged:'assets/icons/ui/v3/prayers/protect_range.png',magic:'assets/icons/ui/v3/prayers/protect_magic.png'};
 function setOverheads(ent,skull,prayer,obj){
  var o=obj||ent.root;if(!o)return;
  var ud=o.userData;
  function sprite(key,url,y,s){var spr=ud[key];
   if(!url){if(spr)spr.visible=false;return}
   if(!spr){spr=new THREE.Sprite(new THREE.SpriteMaterial({map:iconTex(url),depthTest:false,transparent:true}));spr.renderOrder=20;spr.name='onl-'+key;o.add(spr);ud[key]=spr}
   if(spr.material.map!==iconTex(url)){spr.material.map=iconTex(url);spr.material.needsUpdate=true}
   spr.position.set(0,y,0);spr.scale.set(s,s,1);spr.visible=true}
  // 2004 stacking: the skull sits above the prayer icon
  sprite('_ohPrayer',prayer?PRAYER_ICON[prayer]:null,2.55,0.62);
  sprite('_ohSkull',skull?'assets/icons/ui/v3/misc/pk_skull_32.png':null,prayer?3.2:2.55,0.55);
 }

 /* ---------------- entities ---------------- */
 function Ent(kind,id){this.kind=kind;this.id=id;this.mover=null;this.face=null;this.hp=[1,1];this.dead=false;this.yaw=0;this.lastHitAt=-1e9;this.chatAt=0}
 function baseTile(x,z){var w=toW(x,z);return new OnlineMover.Mover(w.x,w.z)}

 /* ---- me ---- */
 function initMe(welcome){
  var ent=new Ent('me',welcome.pid);ent.isMe=true;ent.name=welcome.name;ent.mover=baseTile(welcome.x,welcome.z);ent.tile={x:welcome.x,z:welcome.z};
  st.me=ent;placeMe(0);return ent;
 }
 function placeMe(){var e=st.me;if(!e||!player)return;player.position.set(e.mover.x,groundAt(e.mover.x,e.mover.z),e.mover.z)}

 /* ---- other adventurers ---- */
 function addPlayer(s){
  if(st.players.has(s.i))removePlayer(s.i);
  var e=new Ent('player',s.i);e.name=s.nm;e.cb=s.cb;e.eq=s.eq||{};e.lk=s.lk||null;e.sk=s.sk;e.oh=s.oh;e.hp=s.hp||[10,10];e.face=s.f||null;
  e.tile={x:s.x,z:s.z};e.mover=baseTile(s.x,s.z);
  var rootObj=new THREE.Group();rootObj.name='onl-player-'+s.i;
  rootObj.userData={kind:'onl_player',pid:s.i,isPlayerGLB:false,regionMats:{},npc:{t:{name:s.nm,hp:e.hp[1],level:s.cb},hp:e.hp[0]}};
  rootObj.position.set(e.mover.x,groundAt(e.mover.x,e.mover.z),e.mover.z);
  scene.add(rootObj);WORLD.clickables.push(rootObj);e.root=rootObj;
  // a record in WORLD.npcs lets the combat layer draw this adventurer's health bar like any fighter's
  e.rec={typeId:'player',t:rootObj.userData.npc.t,mesh:rootObj,hp:e.hp[0],dead:false,target:null,isPlayer:true,pid:s.i,hpbar:{spr:new THREE.Object3D(),draw:function(){}}};
  WORLD.npcs.push(e.rec);
  st.players.set(s.i,e);
  setOverheads(e,e.sk,e.oh);
  e.rigPromise=buildRig(e.lk).then(function(r){
   if(st.players.get(s.i)!==e)return;
   e.rig=r.rig;e.gmix=r.gmix;rootObj.add(r.rig);rootObj.userData.rigInner=r.rig;rootObj.userData.gmix=r.gmix;rootObj.userData.isPlayerGLB=true;
   dress(rootObj,e.eq);st.stats.playersBuilt++;
   if(s.dd||e.dead)playClip(e,'death');
  },function(err){st.stats.rigFailures++;console.warn('[OnlineActors] kit rig for '+s.nm+' failed',err)});
  if(s.dd)e.dead=true;
  return e;
 }
 function removePlayer(pid){
  var e=st.players.get(pid);if(!e)return;st.players.delete(pid);
  scene.remove(e.root);unlist(WORLD.clickables,e.root);unlist(WORLD.npcs,e.rec);
 }
 function unlist(a,o){var i=a.indexOf(o);if(i>=0)a.splice(i,1)}
 function updatePlayer(u){
  var e=st.players.get(u.i);if(!e)return null;
  applyMove(e,u);
  if(u.hp){e.hp=u.hp}
  if(u.f!==undefined)e.face=u.f;
  if(u.cb!=null){e.cb=u.cb;e.root.userData.npc.t.level=u.cb}
  if(u.eq){e.eq=u.eq;if(e.root.userData.rigInner)dress(e.root,e.eq)}
  if(u.lk){e.lk=u.lk;if(e.rig&&typeof HolmKit!=='undefined'&&HolmKit.ready())HolmKit.apply(e.rig,e.lk)}
  if(u.sk!==undefined||u.oh!==undefined){if(u.sk!==undefined)e.sk=u.sk;if(u.oh!==undefined)e.oh=u.oh;setOverheads(e,e.sk,e.oh)}
  if(u.c)say(e.root,u.c,e.name);
  return e;
 }
 function say(obj,text,name){
  if(typeof window.CRSayOverhead==='function')window.CRSayOverhead(obj,text,3.6);
  else if(typeof sayOverhead==='function')sayOverhead(obj,text,3.6);
  if(name&&typeof OnlineUI!=='undefined')OnlineUI.publicLine(name,text);
 }
 function applyMove(e,u){
  if(u.x==null)return;
  if(u.tele){var w=toW(u.x,u.z);e.mover.tele(w.x,w.z)}
  else if(u.mv){e.mover.push(u.mv.map(function(t){return toW(t[0],t[1])}),st.tickMs)}
  else{var w2=toW(u.x,u.z);e.mover.push([w2],st.tickMs)}
  e.tile={x:u.x,z:u.z};
 }

 /* ---- monsters ---- */
 function addNpc(s){
  if(st.npcs.has(s.i))removeNpc(s.i,true);
  var t=typeof NPC_TYPES!=='undefined'&&NPC_TYPES[s.ty];if(!t){console.warn('[OnlineActors] unknown npc type '+s.ty);return null}
  var w=toW(s.x,s.z);
  var prevForce=spawnNpc.force;spawnNpc.force=true;var n=null;
  try{n=spawnNpc(s.ty,w.x,w.z)}finally{spawnNpc.force=prevForce}
  if(!n)return null;
  var e=new Ent('npc',s.i);e.ty=s.ty;e.t=t;e.rec=n;e.hp=s.hp||[t.hp,t.hp];e.face=s.f||null;e.tile={x:s.x,z:s.z};e.mover=new OnlineMover.Mover(w.x,w.z);
  n.hp=e.hp[0];n.nid=s.i;n.online=true;
  var ud=n.mesh.userData;ud.kind='onl_npc';ud.nid=s.i;ud.label='Attack <b>'+t.name+'</b> (level '+t.level+')';
  n.mesh.position.set(w.x,groundAt(w.x,w.z),w.z);n.mesh.rotation.y=OnlineMap.hash(s.i,1,2)*Math.PI*2;
  st.npcs.set(s.i,e);st.stats.npcsBuilt++;
  return e;
 }
 function removeNpc(nid,now){
  var e=st.npcs.get(nid);if(!e)return;st.npcs.delete(nid);
  if(!now&&e.rec.dying){st.corpses.push(e);return}   // the body finishes falling and sinking first
  dropNpc(e);
 }
 function dropNpc(e){scene.remove(e.rec.mesh);unlist(WORLD.clickables,e.rec.mesh);unlist(WORLD.npcs,e.rec)}
 function updateNpc(u){
  var e=st.npcs.get(u.i);if(!e)return null;
  if(u.tele&&e.rec.dying){   // a respawn while the old body still sinks: finish it and start fresh
   dropNpc(e);st.npcs.delete(u.i);return null}
  applyMove(e,u);
  if(u.hp){e.hp=u.hp}
  if(u.f!==undefined){e.face=u.f}
  return e;
 }

 /* ---- ground items ---- */
 function addObj(o){
  if(st.objs.has(o.i))removeObj(o.i);
  var def=ITEMS[o.id];if(!def)return null;
  var m;try{m=itemGroundMesh(o.id)}catch(e){m=new THREE.Mesh(new THREE.BoxGeometry(.3,.12,.3),new THREE.MeshLambertMaterial({color:0xc8a040}))}
  var w=toW(o.x,o.z),n=0;st.objs.forEach(function(x){if(x.x===o.x&&x.z===o.z)n++});
  var ox=(n%3-1)*0.22,oz=(Math.floor(n/3)%3-1)*0.22;
  m.position.set(w.x+ox,groundAt(w.x+ox,w.z+oz)+0.02,w.z+oz);m.rotation.y=OnlineMap.hash(o.i,3,1)*6.28;
  m.userData={kind:'onl_obj',uid:o.i,id:o.id,qty:o.q,own:!!o.own,label:'Take <b>'+def.name+'</b>'+(o.q>1?' ('+o.q+')':'')};
  // a monster's loot waits until its body has sunk (the combat layer reveals it with a pop)
  var dying=false;st.npcs.forEach(function(e){if(e.rec.dying&&e.tile.x===o.x&&e.tile.z===o.z)dying=true});
  st.corpses.forEach(function(e){if(e.tile.x===o.x&&e.tile.z===o.z)dying=true});
  if(dying){m.userData._cfxHide=true;m.visible=false}
  scene.add(m);WORLD.clickables.push(m);WORLD.drops.push(m);
  var rec={uid:o.i,id:o.id,q:o.q,x:o.x,z:o.z,own:!!o.own,pub:o.pub,mesh:m,at:performance.now(),publicAt:o.own?performance.now()+(o.pub||0)*st.tickMs:0};st.objs.set(o.i,rec);st.stats.objsBuilt++;
  return rec;
 }
 function removeObj(uid){var r=st.objs.get(uid);if(!r)return;st.objs.delete(uid);scene.remove(r.mesh);unlist(WORLD.clickables,r.mesh);unlist(WORLD.drops,r.mesh)}
 function revealLootAt(tile){
  var t=typeof CombatFX!=='undefined'&&CombatFX.stats?CombatFX.stats().t:0;
  st.objs.forEach(function(r){if(r.x===tile.x&&r.z===tile.z&&r.mesh.userData._cfxHide){r.mesh.userData._cfxHide=false;r.mesh.userData._cfxPop=t;r.mesh.visible=true}});
 }

 /* ---------------- per frame ---------------- */
 function entObj(e){return e.isMe?player:e.kind==='npc'?e.rec.mesh:e.root}
 function entByRef(ref){if(!ref)return null;if(ref[0]==='n')return st.npcs.get(ref[1])||null;if(st.me&&ref[1]===st.me.id)return st.me;return st.players.get(ref[1])||null}
 function turnTo(obj,ent,dt){
  var m=ent.mover,target=null;
  if(m.moving&&(m.dirX||m.dirZ))target=Math.atan2(m.dirX,m.dirZ);
  else if(ent.face){var f=entByRef(ent.face),fo=f&&entObj(f);if(fo){var dx=fo.position.x-obj.position.x,dz=fo.position.z-obj.position.z;if(dx*dx+dz*dz>1e-4)target=Math.atan2(dx,dz)}}
  if(target==null)return;
  var cur=obj.rotation.y,d=((target-cur+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;
  obj.rotation.y=cur+d*Math.min(1,dt*14);
 }
 function kitAnim(root,ent,dt,isMe){
  var gm=root.userData.gmix;if(!gm)return;
  if(ent.dead){gm.mixer.update(dt);return}
  var sp=ent.mover.speed/4.2;
  if(typeof playerGLBAnim==='function'){
   if(isMe)playerGLBAnim(root,dt,ent.mover.moving,sp);
   else{var prevE=Player.equip;try{Player.equip=blankEquip(ent.eq);playerGLBAnim(root,dt,ent.mover.moving,sp)}finally{Player.equip=prevE}}
  }else gm.mixer.update(dt);
 }
 function frame(dt){
  var ms=dt*1000,me=st.me;
  if(me&&player){
   me.mover.update(ms);player.position.set(me.mover.x,groundAt(me.mover.x,me.mover.z),me.mover.z);
   turnTo(player,me,dt);
   if(player.userData&&player.userData.gmix)kitAnim(player,me,dt,true);else if(typeof walkAnim==='function')walkAnim(player,me.mover.moving,dt,1);
  }
  st.players.forEach(function(e){
   e.mover.update(ms);var o=e.root;o.position.set(e.mover.x,groundAt(e.mover.x,e.mover.z),e.mover.z);turnTo(o,e,dt);
   kitAnim(o,e,dt,false);
   e.rec.hp=e.hp[0];e.rec.t.hp=e.hp[1];o.userData.npc.hp=e.hp[0];o.userData.npc.t.hp=e.hp[1];
   e.rec.target=me&&e.face&&e.face[0]==='p'&&e.face[1]===me.id?'player':null;
  });
  st.npcs.forEach(function(e){var n=e.rec,o=n.mesh;
   if(!n.dying){e.mover.update(ms);o.position.set(e.mover.x,groundAt(e.mover.x,e.mover.z),e.mover.z);turnTo(o,e,dt);n.moving=e.mover.moving}
   n.hp=e.hp[0];n.target=me&&e.face&&e.face[0]==='p'&&e.face[1]===me.id?'player':null;
   npcAnim(n,dt);
  });
  for(var i=st.corpses.length-1;i>=0;i--){var c=st.corpses[i];npcAnim(c.rec,dt);if(!c.rec.dying){revealLootAt(c.tile);dropNpc(c);st.corpses.splice(i,1)}}
 }
 function npcAnim(n,dt){
  var o=n.mesh,ud=o.userData;
  if(n.dying){if(typeof tickDeath!=='function'||!tickDeath(o,dt)){n.dying=false;o.visible=false}return}
  var P=ud.parts;ud.inCombat=n.target==='player';
  if(ud.gmix&&typeof charNpcAnim==='function')charNpcAnim(n,dt);
  else if(P&&P.legL)walkAnim(o,n.moving,dt);
  else if(typeof beastAnim==='function')beastAnim(o,n.moving,dt);
  if(n.t.glb&&typeof glbCreatureAnim==='function')glbCreatureAnim(n,dt);
  if(n.t.skinnedRig){var drv=n.t.animDriver==='mole'?(typeof riggedMoleAnim==='function'&&riggedMoleAnim):n.t.animDriver==='wolf'?(typeof riggedWolfAnim==='function'&&riggedWolfAnim):(typeof riggedDragonAnim==='function'&&riggedDragonAnim);if(drv)drv(n,dt,n.moving)}
  n.moving=false;
 }
 function npcDeath(e){
  var n=e.rec;if(n.dead)return;n.dead=true;n.dying=true;
  if(typeof startDeath==='function')startDeath(n.mesh);
  if(typeof CombatFX!=='undefined'&&CombatFX.onKill)CombatFX.onKill(n,[],false);
  unlist(WORLD.clickables,n.mesh);
 }
 function clearAll(){
  Array.from(st.players.keys()).forEach(removePlayer);
  Array.from(st.npcs.values()).forEach(function(e){dropNpc(e)});st.npcs.clear();
  st.corpses.forEach(dropNpc);st.corpses=[];
  Array.from(st.objs.keys()).forEach(removeObj);
 }
 function snapshot(){
  var me=st.me,out={me:me?{pid:me.id,tile:me.tile,x:+me.mover.x.toFixed(2),z:+me.mover.z.toFixed(2),pending:me.mover.pending(),dead:me.dead,maxBacklog:me.mover.maxBacklog,catchUps:me.mover.catchUps,teles:me.mover.teles}:null,players:[],npcs:[],objs:[],stats:st.stats};
  st.players.forEach(function(e){out.players.push({pid:e.id,name:e.name,cb:e.cb,tile:e.tile,x:+e.mover.x.toFixed(2),z:+e.mover.z.toFixed(2),hp:e.hp,sk:e.sk,oh:e.oh,eq:e.eq,rig:!!e.rig,dead:e.dead,face:e.face})});
  st.npcs.forEach(function(e){out.npcs.push({nid:e.id,ty:e.ty,tile:e.tile,hp:e.hp,dead:e.rec.dead,face:e.face})});
  st.objs.forEach(function(r){out.objs.push({uid:r.uid,id:r.id,q:r.q,x:r.x,z:r.z,own:r.own&&performance.now()<r.publicAt,hidden:!!r.mesh.userData._cfxHide})});
  return out;
 }
 return {st:st,initMe:initMe,me:function(){return st.me},addPlayer:addPlayer,removePlayer:removePlayer,updatePlayer:updatePlayer,
  addNpc:addNpc,removeNpc:removeNpc,updateNpc:updateNpc,addObj:addObj,removeObj:removeObj,applyMove:applyMove,
  frame:frame,entByRef:entByRef,entObj:entObj,playClip:playClip,stopDeathClip:stopDeathClip,npcDeath:npcDeath,setOverheads:setOverheads,say:say,
  dress:dress,clearAll:clearAll,snapshot:snapshot,combatColour:combatColour,kitBuffer:kitBuffer,setTickMs:function(ms){st.tickMs=ms||600},
  players:function(){return st.players},npcs:function(){return st.npcs},objs:function(){return st.objs}};
})();
