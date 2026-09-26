/* Tutor's Holm island draft player (finish goal M6.2): the adventurer as the Blender player
 * (tools/blender/build_holm_player_v1.py -> assets/models/holm_player_v1.glb; same Mixamo bones and region materials
 * as the older player.glb, so the existing GLB-player path — playerGLBAnim, recolorPlayer, GearFit — keeps working).
 * Appearance comes from the character creator (CharCfg): body by gender, one hair mesh by hair style (bald = none),
 * the beard when chosen, and the creator's colours on the skin/hair/tunic/legs regions. Every action has its own clip:
 * chop, net, cook (tending a fire or range), mine, smith, smelt, the three melee attacks, bow, cast, block, hit, climb
 * after a ladder, death. Island draft only (?holmIsland=1): the live game keeps its player until the cutover (M7). */
var HolmIslandPlayer=(function(){
 'use strict';
 var URL='assets/models/holm_kit_v2.glb?v=10',st={root:null,clips:{},busy:null};
 var HAIR={short:'Hair_Short',long:'Hair_Long',ponytail:'Hair_Ponytail',bun:'Hair_Bun',mohawk:'Hair_Mohawk'};
 function hex(n){return '#'+('000000'+(Number(n)>>>0).toString(16)).slice(-6)}
 function look(){var c=typeof CharCfg!=='undefined'?CharCfg:{};return {female:c.gender==='f',hair:HAIR[c.hairStyle]||(c.hairStyle==='bald'?null:'Hair_Short'),beard:!!c.beard&&c.gender!=='f',
  colors:Object.assign({},typeof PLAYER_DEFAULT_COLORS!=='undefined'?PLAYER_DEFAULT_COLORS:{},c.colors||{},
   c.skin!==undefined&&!(c.colors&&c.colors.skin)?{skin:hex(c.skin)}:{},c.hair!==undefined&&!(c.colors&&c.colors.hair)?{hair:hex(c.hair)}:{},
   c.shirt!==undefined&&!(c.colors&&c.colors.tunic)?{tunic:hex(c.shirt)}:{},c.legs!==undefined&&!(c.colors&&c.colors.legs)?{legs:hex(c.legs)}:{})}}
 // show exactly the chosen variant meshes (a glTF cannot mark meshes hidden, so every variant ships visible)
 function applyVariants(rig){var L=look();rig.traverse(function(o){if(!(o.isMesh||o.isSkinnedMesh))return;var n=o.name||'',p=o.parent&&o.parent.name||'';var id=/^(Body|Hair|Beard)_/.test(n)?n:(/^(Body|Hair|Beard)_/.test(p)?p:null);if(!id)return;
  id=id.replace(/\.\d+$/,'').replace(/_\d+$/,'');
  if(/^Body_/.test(id))o.visible=(id==='Body_Female')===L.female;else if(/^Hair_/.test(id))o.visible=id===L.hair;else if(/^Beard_/.test(id))o.visible=L.beard})}
 // one clip per action, chosen by what the player is doing (the game calls swing('slash') for a tree, 'cast' at a spot)
 var MAP={slash:'attack_slash',stab:'attack_stab',crush:'attack_crush',bow:'bow',cast:'cast',mine:'mine',smith:'smith',smelt:'smelt',chop:'chop',net:'net',cook:'cook',climb:'climb',block:'block',hit:'hit'};
 function clipFor(type){var a=typeof Player!=='undefined'&&Player.action,u=a&&a.obj&&a.obj.userData;
  if(a&&a.type==='gather'&&u){if(u.rtype==='tree')return 'chop';if(u.rtype==='fish')return 'net';if(u.rtype==='rock')return 'mine'}
  // firemaking plays the kit's own 'firemake' clip once it ships, the cook (tend the fire) clip until then
  if(a&&a.type==='lightfire'){var gc=player&&player.userData&&player.userData.gmix&&player.userData.gmix.clips;return gc&&gc.firemake?'firemake':'cook'}
  if(a&&a.type==='cook')return 'cook';
  return MAP[type||'slash']||'attack_slash'}
 function play(name){var gm=player&&player.userData&&player.userData.gmix,act=gm&&gm.clips&&gm.clips[name];if(!act)return false;
  // any other one-shot (a combat swing, a skilling stroke, a hit, a climb) ends a running emote at once
  if(gm.emote&&gm.emote!==act)gm.emote.stop();gm.emote=null;
  // combat feel: the bow draw and the cast run a touch faster so the arrow / spell leaves on a snappy release frame
  // (CombatFX.impactTime reads the same speeds); every other clip plays at its authored pace
  act.timeScale=typeof CombatFX!=='undefined'&&CombatFX.speedFor?CombatFX.speedFor(name):1;
  act.reset();act.setLoop(THREE.LoopOnce,1);act.clampWhenFinished=name==='death';act.weight=1;act.play();gm.attack=act;return true}   // playerGLBAnim treats gm.attack as the body-owning one-shot
 /* Emotes (the Emotes tab): emote(key) plays the kit clip 'emote_<key>' once as the body-owning one-shot (never clamped: the body
  * returns to idle when it ends). Before the kit carries the emote set, 'wave' falls back to the kit's own wave clip and every other
  * key returns false (the tab then shows only its chat line). Walking or running, a block, a combat swing, a skilling stroke or a
  * hit ends a running emote (playerGLBAnim / play); an emote never cuts a combat swing short: clicked during one (or while the
  * player is still moving) it waits up to 1.5 s for the body to be free. A new emote restarts over the old one. Worn gear and
  * tools stay as they are. Returns the clip name that plays (or will play), or false. */
 var EMOTE_FALLBACK={wave:'wave'},COMBAT_CLIP=/^(attack_|bow$|cast$|block$|hit$|death$)/,EMOTE_WAIT=1500;
 function emoteKey(k){return String(k||'').trim().toLowerCase().replace(/\s+/g,'_')}
 function emoteClip(gm,key){var n='emote_'+key;if(gm.clips[n])return n;var f=EMOTE_FALLBACK[key];return f&&gm.clips[f]?f:null}
 function bodyBusy(gm){                                   // true while a combat one-shot (or the death pose) owns the body
  if(gm.block&&gm.block.isRunning())return true;var a=gm.attack;if(!a||a===gm.emote||!a.getClip)return false;var n=a.getClip().name;
  if(n==='death')return a.isScheduled();return a.isRunning()&&COMBAT_CLIP.test(n)}   // the clamped death pose holds until respawn
 function startEmote(gm,name){var act=gm.clips[name],prev=gm.attack;st.pending=null;
  if(prev&&prev!==act&&prev!==gm.emote&&prev.isRunning())prev.stop();   // a skilling stroke gives way (combat swings are waited for)
  if(!play(name))return false;gm.emote=act;return name}
 function emote(key){
  key=emoteKey(key);var gm=st.root&&typeof player!=='undefined'&&player===st.root&&player.userData.gmix;if(!gm||!gm.clips||!key)return false;
  var name=emoteClip(gm,key);if(!name){st.pending=null;return false}
  if(bodyBusy(gm)||gm.moving){st.pending={name:name,until:Date.now()+EMOTE_WAIT};return name}
  return startEmote(gm,name)}
 function emoteStatus(){var gm=st.root&&player===st.root&&player.userData.gmix;var e=gm&&gm.emote;
  return {playing:!!(e&&e.isRunning()),clip:e&&e.isRunning()?e.getClip().name:null,pending:st.pending?st.pending.name:null,
   clips:gm&&gm.clips?Object.keys(gm.clips).filter(function(n){return /^emote_/.test(n)}):[]}}
 function hookSwing(){if(st.hooked||typeof swing!=='function')return;st.hooked=true;var prev=swing;
  swing=function(g,type){if(g===player&&g.userData&&g.userData.holmPlayer){play(clipFor(type));return}return prev(g,type)}}
 function load(o){
  st.swapActor=o&&o.swapActor;
  var kit=typeof HolmKit!=='undefined'?HolmKit.load().catch(function(e){console.error('[HolmIslandPlayer] kit catalog',e)}):Promise.resolve();
  return kit.then(function(){return new Promise(function(ok){
   new THREE.GLTFLoader().load(URL,function(gltf){try{st.gltf=gltf;ok({loaded:true})}catch(e){ok({failed:true})}},undefined,function(e){console.error('[HolmIslandPlayer] player model failed; the code-built adventurer stays',e);ok({clips:0,failed:true})});
  })});
 }
 // the 2004-style kit: exactly one part per slot and the five colour channels, from the character's saved look
 function applyLook(rig){if(typeof HolmKit!=='undefined'&&HolmKit.ready()){var l=HolmKit.apply(rig,typeof CharCfg!=='undefined'?CharCfg.kit:null);if(l&&typeof CharCfg!=='undefined')CharCfg.kit=l;return true}applyVariants(rig);return false}
 function refreshLook(){if(st.rig)applyLook(st.rig)}
 function install(){
  var gltf=st.gltf;st.gltf=null;if(!gltf)return;
  try{
    var rig=gltf.scene;applyLook(rig);
    var regionMats={};rig.traverse(function(m){if(m.isMesh||m.isSkinnedMesh){m.castShadow=true;m.frustumCulled=false;[].concat(m.material).forEach(function(q){if(!q)return;if('metalness' in q)q.metalness=0;if('roughness' in q)q.roughness=1;
     if(q.name){var k=q.name.replace(/^R_/i,'').replace(/[._]\d+$/,'').toLowerCase();(regionMats[k]=regionMats[k]||[]).push(q)}})}});
    // measure the visible character only (hidden variants would shrink it)
    var box=new THREE.Box3();rig.updateMatrixWorld(true);rig.traverse(function(m){if((m.isMesh||m.isSkinnedMesh)&&m.visible)box.expandByObject(m)});
    rig.scale.setScalar(1.85/((box.max.y-box.min.y)||1));box=new THREE.Box3();rig.updateMatrixWorld(true);rig.traverse(function(m){if((m.isMesh||m.isSkinnedMesh)&&m.visible)box.expandByObject(m)});rig.position.y=-box.min.y;
    var c=new THREE.Group();c.userData.regionMats=regionMats;c.userData.rigInner=rig;c.add(rig);c.position.copy(player.position);c.rotation.y=player.rotation.y;
    var mixer=new THREE.AnimationMixer(rig),clips={};gltf.animations.forEach(function(cl){clips[cl.name]=mixer.clipAction(cl)});
    if(clips.idle){clips.idle.play();clips.idle.weight=1}if(clips.walk){clips.walk.play();clips.walk.weight=0}
    c.userData.gmix={mixer:mixer,idle:clips.idle,walk:clips.walk,attack:clips.attack,block:clips.block,w:0,clips:clips,kit:true,run:clips.run||null};
    c.userData.isPlayerGLB=true;c.userData.holmPlayer=true;
    if(typeof makeNameTag==='function'){var tag=makeNameTag((typeof CharCfg!=='undefined'&&CharCfg.name)||'Adventurer');tag.position.y=2.1;c.add(tag)}
    // carry over what the old body had (its worn gear is re-fitted below)
    scene.remove(player);player=c;scene.add(player);
    if(!(typeof HolmKit!=='undefined'&&HolmKit.ready())&&typeof recolorPlayer==='function')recolorPlayer(look().colors);
    try{if(typeof refreshGLBGear==='function')refreshGLBGear()}catch(e){}
    if(st.swapActor)st.swapActor(c);
    applyLook(rig);hookSwing();st.root=c;st.rig=rig;
  }catch(e){console.error('[HolmIslandPlayer] install failed; the code-built adventurer stays',e)}
 }
 // per frame: tending a fire or the range plays the cook clip between the game's own action ticks
 function update(){
  if(st.gltf&&typeof player!=='undefined'&&player&&player.position&&typeof scene!=='undefined'){install();return}
  var a=typeof Player!=='undefined'&&Player.action,gm=st.root&&player===st.root&&player.userData.gmix;if(!gm)return;
  // gear refits can re-show meshes: keep exactly the chosen body, hair and beard (cheap, about twenty meshes)
  var now=Date.now();if(!st.lastLook||now-st.lastLook>1000){st.lastLook=now;applyLook(st.rig)}
  if(a&&a.type==='cook'&&!(gm.attack&&gm.attack.isRunning()))play('cook');
  // an emote clicked during a combat swing (or on the move) starts as soon as the body is free, or is dropped after 1.5 s
  if(st.pending){if(Date.now()>st.pending.until)st.pending=null;else if(!bodyBusy(gm)&&!gm.moving)startEmote(gm,st.pending.name)}
  // OSRS: the weapon and shield go away and the skill's tool is in the hand while the action runs
  if(typeof HolmSkillTools!=='undefined')HolmSkillTools.update()}
 return {load:load,update:update,play:play,emote:emote,emoteStatus:emoteStatus,refreshLook:refreshLook,active:function(){return !!st.root&&typeof player!=='undefined'&&player===st.root},look:look};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmIslandPlayer;
