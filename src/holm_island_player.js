/* Tutor's Holm island draft player (finish goal M6.2): the adventurer as the Blender player
 * (tools/blender/build_holm_player_v1.py -> assets/models/holm_player_v1.glb; same Mixamo bones and region materials
 * as the older player.glb, so the existing GLB-player path — playerGLBAnim, recolorPlayer, GearFit — keeps working).
 * Appearance comes from the character creator (CharCfg): body by gender, one hair mesh by hair style (bald = none),
 * the beard when chosen, and the creator's colours on the skin/hair/tunic/legs regions. Every action has its own clip:
 * chop, net, cook (tending a fire or range), mine, smith, smelt, the three melee attacks, bow, cast, block, hit, climb
 * after a ladder, death. Island draft only (?holmIsland=1): the live game keeps its player until the cutover (M7). */
var HolmIslandPlayer=(function(){
 'use strict';
 var URL='assets/models/holm_kit_v2.glb?v=15',st={root:null,clips:{},busy:null};
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
  // v4: at a range (the bakehouse oven) the player reaches into the oven -- the kit's cook_range clip
  if(a&&a.type==='cook')return cookClip(a);
  return MAP[type||'slash']||'attack_slash'}
 function cookClip(a){var u=a&&a.obj&&a.obj.userData,gc=player&&player.userData&&player.userData.gmix&&player.userData.gmix.clips;
  return u&&u.range&&gc&&gc.cook_range?'cook_range':'cook'}
 function play(name){var gm=player&&player.userData&&player.userData.gmix,act=gm&&gm.clips&&gm.clips[name];if(!act)return false;
  // any other one-shot (a combat swing, a skilling stroke, a hit, a climb) ends a running emote at once
  if(gm.emote&&gm.emote!==act)gm.emote.stop();gm.emote=null;
  // ...and a held skilling loop (below) gives way to any other clip
  if(st.loop&&st.loop.act!==act){st.loop.act.stop();if(gm.attack===st.loop.act)gm.attack=null;st.loop=null}
  // 2004 skilling (src/skill_timing.js): every stroke at its 2004 length (rate = authored / 2004 seconds; playAs() names
  // the kind, e.g. the cook clip baking at an oven). A chop, a net cast and the fire-lighting kneel repeat for as long as
  // their action lasts (update() ends them), so the per-tick roll that calls in here never cuts a stroke short.
  var kind=st.kind||name,skill=typeof SkillTiming!=='undefined'&&SkillTiming.isSkillClip(kind);
  if(skill&&SkillTiming.loops(name)){
   st.loop={act:act,action:typeof Player!=='undefined'?Player.action:null};
   if(gm.attack===act&&act.isRunning())return true;
   act.timeScale=SkillTiming.rateFor(name,act.getClip().duration,kind);
   act.reset();act.setLoop(THREE.LoopRepeat,Infinity);act.clampWhenFinished=false;act.weight=1;act.play();gm.attack=act;return true}
  // combat feel: the bow draw and the cast run a touch faster so the arrow / spell leaves on a snappy release frame
  // (CombatFX.impactTime reads the same speeds); every other clip plays at its authored pace
  act.timeScale=skill?SkillTiming.rateFor(name,act.getClip().duration,kind):typeof CombatFX!=='undefined'&&CombatFX.speedFor?CombatFX.speedFor(name):1;
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
   // review 5 round 2: ?kitmesh=b / c loads a mesh option's kit instead (src/holm_gait_options.js)
   var url=typeof HolmGaitOptions!=='undefined'&&HolmGaitOptions.kitUrl?HolmGaitOptions.kitUrl(URL):URL;
   new THREE.GLTFLoader().load(url,function(gltf){try{st.gltf=gltf;ok({loaded:true})}catch(e){ok({failed:true})}},undefined,function(e){console.error('[HolmIslandPlayer] player model failed; the code-built adventurer stays',e);ok({clips:0,failed:true})});
  })});
 }
 // the 2004-style kit: exactly one part per slot and the five colour channels, from the character's saved look
 // goal audit 2026-09-29 ("saved appearances preserved"): a save from before the kit (ui_save marks it CharCfg._legacyLook)
 // keeps its old look on the kit: body type from gender (2004: A / B), the nearest hair style and beard, and each old colour
 // as the nearest entry of its channel's palette (shirt -> torso, legs, hair, skin); the kit's own defaults fill the rest
 var OLD_HAIR={short:['short'],long:['long'],ponytail:['pigtails','long'],bun:['bun','medium'],mohawk:['mohawk','spiky'],bald:['bald']};
 function legacyKit(){var c=typeof CharCfg!=='undefined'?CharCfg:null;if(!c||!c._legacyLook||c.kit||typeof HolmKit==='undefined'||!HolmKit.ready())return null;
  var body=/^f/i.test(String(c.gender||''))?'B':'A',l=HolmKit.defaults(body);
  var near=function(ch,hex){hex=Number(hex);if(!Number.isFinite(hex))return;var r=(hex>>16)&255,g=(hex>>8)&255,b=hex&255,best=-1,d=Infinity;
   HolmKit.palette(ch).forEach(function(h,i){var v=parseInt(String(h).replace('#',''),16),e=Math.pow(((v>>16)&255)-r,2)+Math.pow(((v>>8)&255)-g,2)+Math.pow((v&255)-b,2);if(e<d){d=e;best=i}});if(best>=0)l.colors[ch]=best};
  near('hair',c.hair);near('torso',c.shirt);near('legs',c.legs);near('skin',c.skin);
  var want=OLD_HAIR[String(c.hairStyle||'').toLowerCase()]||[],hair=HolmKit.options(body,'Hair');
  for(var i=0;i<want.length;i++){var o=hair.filter(function(x){return String(x.label).toLowerCase()===want[i]})[0];if(o){l.parts.Hair=o.index;break}}
  if(HolmKit.hasSlot(body,'Jaw')){var lab=c.beard?'short':'clean-shaven',j=HolmKit.options(body,'Jaw').filter(function(x){return String(x.label).toLowerCase()===lab})[0];if(j)l.parts.Jaw=j.index}
  delete c._legacyLook;return l}
 function applyLook(rig){if(typeof HolmKit!=='undefined'&&HolmKit.ready()){var l=HolmKit.apply(rig,typeof CharCfg!=='undefined'?(CharCfg.kit||legacyKit()):null);if(l&&typeof CharCfg!=='undefined')CharCfg.kit=l;return true}applyVariants(rig);return false}
 function refreshLook(){if(st.rig)applyLook(st.rig)}
 function install(){
  var gltf=st.gltf;st.gltf=null;if(!gltf)return;
  try{
    var rig=gltf.scene;applyLook(rig);
    var regionMats={};rig.traverse(function(m){if(m.isMesh||m.isSkinnedMesh){m.castShadow=true;m.frustumCulled=false;[].concat(m.material).forEach(function(q){if(!q)return;if('metalness' in q)q.metalness=0;if('roughness' in q)q.roughness=1;
     if(q.name){var k=q.name.replace(/^R_/i,'').replace(/[._]\d+$/,'').toLowerCase();(regionMats[k]=regionMats[k]||[]).push(q)}})}});
    // measure the visible character only (hidden variants would shrink it)
    var box=new THREE.Box3();rig.updateMatrixWorld(true);rig.traverse(function(m){if((m.isMesh||m.isSkinnedMesh)&&m.visible)box.expandByObject(m)});
    rig.scale.setScalar(typeof holmKitScale==='function'?holmKitScale():1.85/((box.max.y-box.min.y)||1));box=new THREE.Box3();rig.updateMatrixWorld(true);rig.traverse(function(m){if((m.isMesh||m.isSkinnedMesh)&&m.visible)box.expandByObject(m)});rig.position.y=-box.min.y;
    var c=new THREE.Group();c.userData.regionMats=regionMats;c.userData.rigInner=rig;c.add(rig);c.position.copy(player.position);c.rotation.y=player.rotation.y;
    var mixer=new THREE.AnimationMixer(rig),clips={};gltf.animations.forEach(function(cl){clips[cl.name]=mixer.clipAction(cl)});
    if(clips.idle){clips.idle.play();clips.idle.weight=1}if(clips.walk){clips.walk.play();clips.walk.weight=0}
    var rigScale=rig.scale.x;
    c.userData.gmix={mixer:mixer,idle:clips.idle,walk:clips.walk,attack:clips.attack,block:clips.block,w:0,clips:clips,kit:true,run:clips.run||null,rigScale:rigScale};
    c.userData.isPlayerGLB=true;c.userData.holmPlayer=true;
    if(typeof makeNameTag==='function'){var tag=makeNameTag((typeof CharCfg!=='undefined'&&CharCfg.name)||'Adventurer');tag.position.y=(typeof HOLM_CHAR_H!=='undefined'?HOLM_CHAR_H+.25:2.1);c.add(tag)}
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
  // review 5: ?gait=walkA,runB,idleC plays the walk / run / idle options (src/holm_gait_options.js; off without ?gait)
  if(typeof HolmGaitOptions!=='undefined'&&HolmGaitOptions.active())HolmGaitOptions.update();
  var a=typeof Player!=='undefined'&&Player.action,gm=st.root&&player===st.root&&player.userData.gmix;if(!gm)return;
  // a held skilling loop (a chop, a net cast, the fire-lighting kneel) ends with its action, or when the player moves off
  if(st.loop){var L=st.loop;if(gm.attack!==L.act||!L.act.isRunning())st.loop=null;
   else if(!a||a!==L.action||gm.moving){L.act.stop();gm.attack=null;st.loop=null}}
  // gear refits can re-show meshes: keep exactly the chosen body, hair and beard (cheap, about twenty meshes)
  var now=Date.now();if(!st.lastLook||now-st.lastLook>1000){st.lastLook=now;applyLook(st.rig)}
  if(a&&a.type==='cook'&&!(gm.attack&&gm.attack.isRunning()))play(cookClip(a));
  // an emote clicked during a combat swing (or on the move) starts as soon as the body is free, or is dropped after 1.5 s
  if(st.pending){if(Date.now()>st.pending.until)st.pending=null;else if(!bodyBusy(gm)&&!gm.moving)startEmote(gm,st.pending.name)}
  // OSRS: the weapon and shield go away and the skill's tool is in the hand while the action runs
  if(typeof HolmSkillTools!=='undefined')HolmSkillTools.update()}
 // play a clip as a named 2004 skilling kind (src/skill_timing.js), e.g. playAs('cook','bake') at an oven
 function playAs(name,kind){st.kind=kind||null;try{return play(name)}finally{st.kind=null}}
 return {load:load,update:update,play:play,playAs:playAs,emote:emote,emoteStatus:emoteStatus,refreshLook:refreshLook,active:function(){return !!st.root&&typeof player!=='undefined'&&player===st.root},look:look};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmIslandPlayer;
