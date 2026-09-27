/* Minnow Hollow fishing (Tutor's Holm v2 land, phase 2, 2026-09-26; docs/rebuild/HOLM_V2_LAND.md, WORLD_LAYOUT_GUIDE §3.3).
 * Fishing that is fun to do, the 2004 way (no minigame, just feedback and variety), on the recessed pond where Wenna
 * teaches it. Rules after the 2004 fishing logic (MIT, studied in 2004scape; our own numbers, items and words):
 *  - moving spots: 3 ripples on the pond out of 7 shore candidates; each moves every 60-100 ticks (the mainland keeps
 *    280-529); a move is telegraphed (the ripple fades over 2 ticks with bubbles, appears elsewhere a tick later) and a
 *    player netting it is told "The fish have moved on." and stops;
 *  - every roll is visible: a cast and a net splash (ring + droplets + a soft plish) every 5 ticks; failure is silent;
 *    a catch lifts a flapping fish out of the water for a second with a flop, the item lands in the pack, XP drops;
 *  - varied catches after the lesson: mirrorperch, a reedpike from Fishing 5, junk now and then (a boot, pondweed),
 *    rare finds (a sealed bottle once per account, a tarnished ring); a big fish sometimes leaps and soaks you;
 *  - the lesson cannot fail: the first ever catch lands on the second roll (the 2004 tutorial pond's guarantee);
 *  - a living pond: fish shadows under the ripples, a fish leaping every 15-25 s, two ducks, dragonflies, a frog that
 *    plops off its pad when you come close, reeds and lily pads, and an ambient loop that fades as you climb out.
 * Every visible piece is Blender-made (holm-hollow-props-os-v1). The spots are ordinary WORLD resources (rtype 'fish')
 * so the island's walk-to-station bridge, the net clip and the tools in hand work as before; game5_main's gather branch
 * hands a spot's rolls to gatherTick(). Island only. Pure-data helpers are exported for tools/test_holm_fishing.js. */
var HolmFishing=(function(){
 'use strict';
 var TICK_S=.6;
 function asset(u){return typeof HolmIsland!=='undefined'?HolmIsland.asset(u):u}
 var DATA='/docs/rebuild/holm-overhaul/island-fishing.json';
 var stats={casts:0,rolls:0,splashes:0,leaps:0,moves:0,movedOn:0,plops:0,soaks:0,catches:{}};
 var st={data:null,objs:[],spots:[],fx:[],fauna:null,pack:null,T:null,scene:null,W:null,clock:0,tickAcc:0,ambient:null,level:1,leapT:12,soaked:0,ready:false,rng:Math.random};
 function need(c,m){if(!c)throw new Error('[HolmFishing] '+m)}
 async function json(u){var r=await fetch(u,{cache:'no-cache'});need(r.ok,u+' '+r.status);return r.json()}
 // ---------------------------------------------------------------- pure rules (unit-tested)
 // the 2004 low/high catch curve out of 256 (48 at level 1 is 19%, 256 at 99 is certain)
 function chance(rule,level){var l=Math.max(1,Math.min(99,level|0));return Math.min(1,(rule.low+(rule.high-rule.low)*(l-1)/98)/256)}
 // one roll: {kind:'rare'|'fish'|'junk'|'miss', item, xp, chat}. r() is the random source; state carries the
 // once-per-account flags and the lesson: before the lesson is done only the common fish, and the first catch lands on
 // rule.firstCatchRoll
 function roll(rules,o,r){
  r=r||Math.random;var lesson=!o.lessonDone,n=o.rollIndex||1;
  if(!o.firstCatch&&n>=rules.firstCatchRoll)return {kind:'fish',item:rules.common.item,xp:rules.common.xp,chat:rules.common.chat,guaranteed:true};
  if(!lesson)for(var i=0;i<rules.rare.length;i++){var q=rules.rare[i];if(q.oncePerAccount&&o.found&&o.found[q.item])continue;if(r()<1/q.oneIn)return {kind:'rare',item:q.item,xp:q.xp||0,chat:q.chat,once:!!q.oncePerAccount}}
  if(r()>=chance(rules.common,o.level))return {kind:'miss'};
  if(lesson)return {kind:'fish',item:rules.common.item,xp:rules.common.xp,chat:rules.common.chat};
  var k=r();
  if(k<rules.junk.share){var j=rules.junk.items[Math.floor(r()*rules.junk.items.length)%rules.junk.items.length];return {kind:'junk',item:j[0],xp:0,chat:j[1]}}
  if(o.level>=rules.big.minLevel&&k<rules.junk.share+rules.big.share)return {kind:'fish',item:rules.big.item,xp:rules.big.xp,chat:rules.big.chat};
  return {kind:'fish',item:rules.common.item,xp:rules.common.xp,chat:rules.common.chat};
 }
 // spot timers in ticks: moveTicks [lo,hi]
 function moveTimer(rules,r){r=r||Math.random;return rules.moveTicks[0]+Math.floor(r()*(rules.moveTicks[1]-rules.moveTicks[0]+1))}
 // a free candidate for a moving spot: not held by another spot (nor the spot's own tile)
 function freeCandidate(cands,held,self,r){r=r||Math.random;var free=cands.map(function(c,i){return i}).filter(function(i){return i!==self&&held.indexOf(i)<0});return free.length?free[Math.floor(r()*free.length)%free.length]:self}
 // ---------------------------------------------------------------- data
 async function loadData(){
  if(st.data)return st.data;var d=await json(asset(DATA));st.data=d;
  var blockers=[];(d.set||[]).forEach(function(p,i){if(!p.block)return;var hx=p.block[0],hz=p.block[1],c=Math.abs(Math.cos(p.yaw||0)),s=Math.abs(Math.sin(p.yaw||0)),ex=hx*c+hz*s,ez=hx*s+hz*c;
   blockers.push({id:'hollow:'+p.prop+':'+i,mode:'overlap',x0:p.x-ex,x1:p.x+ex,z0:p.z-ez,z1:p.z+ez})});
  var j=d.jetty;return {blockers:blockers,jetty:{id:j.id,label:j.label,orientation:'EW',tiles:j.tiles,deckY:j.deckY}};
 }
 // ---------------------------------------------------------------- scene
 function piece(name){var n=st.pack.scene.getObjectByName(name);need(n,'hollow pack has no '+name);var c=n.clone(true);c.position.set(0,0,0);c.rotation.set(0,0,0);c.scale.set(1,1,1);return c}
 function matte(root){var T=st.T;root.traverse(function(n){if(!n.isMesh)return;n.castShadow=true;n.receiveShadow=true;[].concat(n.material).forEach(function(m){if(!m)return;if(m.map&&T.LinearEncoding!==undefined){m.map.encoding=T.LinearEncoding;m.needsUpdate=true}
  if(m.map&&typeof HolmOldschoolLook!=='undefined'&&HolmOldschoolLook.enabled()){m.map.magFilter=T.NearestFilter;m.map.minFilter=T.LinearMipmapLinearFilter}if('roughness' in m){m.roughness=1;m.metalness=0}})})}
 function own(o){st.scene.add(o);st.objs.push(o);return o}
 function fading(o,opacity){o.traverse(function(n){if(!n.isMesh)return;n.material=[].concat(n.material).map(function(m){var c=m.clone();c.transparent=true;c.depthWrite=false;c.opacity=opacity;return c});if(n.material.length===1)n.material=n.material[0]})}
 function setOpacity(o,a){o.traverse(function(n){if(n.isMesh)[].concat(n.material).forEach(function(m){m.opacity=a})})}
 function waterY(){return st.level}
 function spotPos(ci){var c=st.data.candidates[ci];return {x:c.water[0]+.5,z:c.water[1]+.5}}
 function makeSpot(i,ci){
  var T=st.T,g=new T.Group();g.name='island-hollow-spot-'+i;
  // the Blender animated ripple (props v4 fishing-ripple-anim, clip Ripple), as the lesson spot had
  var rip=st.ripple.clone(true);rip.name='ripple';g.add(rip);var mixer=null;
  if(st.rippleClip){mixer=new T.AnimationMixer(rip);var act=mixer.clipAction(st.rippleClip);act.play();mixer.update(Math.random()*2)}
  var hb=new T.Mesh(new T.BoxGeometry(1.1,.5,1.1),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));hb.position.y=.2;g.add(hb);
  var shadows=[];for(var k=0;k<2;k++){var sh=piece('fish-shadow');fading(sh,.3);sh.position.y=.004;g.add(sh);shadows.push({o:sh,r:.45+k*.2,w:(k?-1:1)*(.9+k*.4),a:k*2.4})}
  g.userData={kind:'resource',rtype:'fish',skill:'Fishing',label:'Net Fishing spot',respawn:6,alive:true,bob:0,islandLesson:'survival-pond-'+i,holmFishing:i};
  var p=spotPos(ci);g.position.set(p.x,waterY()+.015,p.z);own(g);st.W.clickables.push(g);st.W.resources.push(g);
  return {i:i,ci:ci,g:g,rip:rip,mixer:mixer,shadows:shadows,timer:moveTimer(st.data.rules,st.rng),state:'on',fade:0,next:null,phase:Math.random()*6};
 }
 // ---------------------------------------------------------------- fx: splash rings, droplets, bubbles, leaping fish
 function splash(x,z,big){stats.splashes++;var r=piece('splash-ring');fading(r,.9);r.position.set(x,waterY()+.02,z);r.scale.setScalar(big?.7:.45);own(r);st.fx.push({o:r,t:0,life:big?1.1:.8,kind:'ring',grow:big?1.4:1.0});
  for(var k=0;k<(big?7:4);k++){var d=piece('droplet');d.position.set(x,waterY()+.05,z);own(d);var a=Math.random()*6.283,s=(big?1.3:.8)*(.6+Math.random()*.6);st.fx.push({o:d,t:0,life:.7,kind:'drop',v:[Math.cos(a)*s*.6,1.6+Math.random()*(big?1.4:.8),Math.sin(a)*s*.6]})}}
 function bubbles(x,z){for(var k=0;k<3;k++){var b=piece('bubbles');b.position.set(x+(Math.random()-.5)*.5,waterY()-.02,z+(Math.random()-.5)*.5);b.scale.setScalar(.8+Math.random()*.6);own(b);st.fx.push({o:b,t:-k*.25,life:1.1,kind:'bubble'})}}
 function leap(x,z,name){stats.leaps++;var f=piece(name||'fish-perch');f.position.set(x,waterY(),z);f.rotation.y=Math.random()*6.283;own(f);st.fx.push({o:f,t:0,life:.85,kind:'leap',x:x,z:z,dir:f.rotation.y});sfx('leap')}
 function catchBeat(item,spot){   // the net lifts with the fish flapping in it for about a second
  var name=item==='raw_reedpike'?'fish-pike':/perch/.test(item)?'fish-perch':null;var p=spot.g.position;
  if(name){var f=piece(name);var hx=(p.x+player.position.x)/2,hz=(p.z+player.position.z)/2;f.position.set(hx,waterY()+.2,hz);own(f);st.fx.push({o:f,t:0,life:1.0,kind:'flap',from:[p.x,waterY(),p.z],to:[hx,player.position.y+1.1,hz]});sfx('flop')}
  else{var b=piece(item==='soggy_boot'||item==='pond_weed'?'bubbles':'droplet');b.position.set(p.x,waterY()+.3,p.z);own(b);st.fx.push({o:b,t:0,life:.8,kind:'bubble'});sfx('plish')}}
 function soak(){stats.soaks++;var p=player.position;leap(p.x+(Math.random()-.5),p.z+(Math.random()-.5),'fish-pike');for(var k=0;k<10;k++){var d=piece('droplet');d.position.set(p.x+(Math.random()-.5)*.6,p.y+1.9,p.z+(Math.random()-.5)*.6);own(d);st.fx.push({o:d,t:-Math.random()*.2,life:.6,kind:'drop',v:[(Math.random()-.5)*.8,-1.5,(Math.random()-.5)*.8]})}}
 // ---------------------------------------------------------------- sounds (our own WebAudio voices on the game's Sfx bus)
 function sfx(k){if(typeof Sfx==='undefined')return;try{
  if(k==='cast')Sfx.noise(.24,900,1.2,.06,'bandpass',260);
  else if(k==='plish'){Sfx.noise(.16,1900,1.6,.05,'bandpass',700);Sfx.tone(560,.06,'sine',.018,320)}
  else if(k==='flop'){Sfx.noise(.1,420,1,.08,'lowpass');Sfx.tone(150,.09,'sine',.05,90);setTimeout(function(){Sfx.noise(.08,380,1,.06,'lowpass');Sfx.tone(130,.07,'sine',.04,80)},140)}
  else if(k==='leap')Sfx.noise(.38,1100,.8,.08,'lowpass',200);
  else if(k==='plop'){Sfx.tone(320,.07,'sine',.05,140);Sfx.noise(.12,1600,2,.04)}
  else if(k==='croak')Sfx.tone(105,.16,'sawtooth',.012,86);
  else if(k==='chirp'){Sfx.tone(2300+Math.random()*500,.07,'sine',.012,2900);setTimeout(function(){Sfx.tone(2600,.05,'sine',.01,3100)},90)}
  else if(k==='quack'){Sfx.tone(420,.09,'square',.012,300);Sfx.noise(.08,900,3,.012)}
 }catch(e){}}
 function ambient(dt){
  if(typeof Sfx==='undefined'||!Sfx.ctx||!st.data)return;   // the audio context exists once the player has interacted
  var a=st.data.ambient,d=Math.hypot(player.position.x-a.centre[0],player.position.z-a.centre[1]),g=d<=a.inner?1:d>=a.inner+a.fade?0:1-(d-a.inner)/a.fade;
  try{if(!st.ambient){var ctx=Sfx.ctx,src=ctx.createBufferSource();src.buffer=Sfx._noiseBuf;src.loop=true;var f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=650;f.Q.value=.7;var gn=ctx.createGain();gn.gain.value=0;src.connect(f);f.connect(gn);gn.connect(Sfx._master||ctx.destination);src.start();st.ambient={src:src,gain:gn,t:0}}
   st.ambient.gain.gain.value=.012*g;st.ambient.t+=dt;
   if(g>.05&&st.ambient.t>2.2){st.ambient.t=0;var r=Math.random();if(r<.35)sfx('chirp');else if(r<.6)sfx('croak');else if(r<.7)sfx('quack')}}catch(e){}}
 // ---------------------------------------------------------------- load
 async function load(o){
  var T=o.THREE;st.T=T;st.scene=o.scene;st.W=o.WORLD;var d=await loadData();st.level=d.pond.level;
  var L=typeof HolmOldschoolLook!=='undefined'?HolmOldschoolLook:null;
  function parse(url){return new Promise(function(ok,no){new T.GLTFLoader().load(url,ok,undefined,no)})}
  st.pack=await parse(asset('/'+d.props));matte(st.pack.scene);
  var p4=await parse(asset('/.studio-workspaces/holm-props-v4/candidates/props.glb'));
  var rp=p4.scene.getObjectByName('fishing-ripple-anim');need(rp,'props v4 has no fishing-ripple-anim');st.ripple=rp.clone(true);st.ripple.position.set(0,0,0);st.ripple.rotation.set(0,0,0);
  st.ripple.traverse(function(m){if(m.isMesh){m.castShadow=false;[].concat(m.material).forEach(function(q){if(q&&'roughness' in q){q.roughness=1;q.metalness=0}})}});
  st.rippleClip=p4.animations.filter(function(c){return c.name==='Ripple'})[0]||null;
  var sample=o.sample;
  // the jetty on its deck tiles, the Fire Beach set, fences, stepping stones
  var j=d.jetty.model,jet=piece(j.prop);jet.position.set(j.x,d.jetty.deckY,j.z);jet.rotation.y=j.yaw||0;jet.name='island-hollow-jetty';own(jet);
  jet.traverse(function(n){if(n.isMesh){n.userData.islandGround=true;st.W.grounds.push(n);st.W.clickables.push(n)}});
  (d.set||[]).forEach(function(p,i){var g=piece(p.prop);var y=p.onJetty?d.jetty.deckY:p.water?st.level:sample(p.x,p.z);g.position.set(p.x,y,p.z);g.rotation.y=p.yaw||0;g.name='island-hollow-'+p.prop+'-'+i;own(g);
   if(p.prop==='fire-ring'){g.name='island-hollow-fire-ring';g.traverse(function(n){if(n.isMesh){n.userData.islandGround=true;n.userData.label='Fire Beach';st.W.grounds.push(n);st.W.clickables.push(n)}})}});
  var p1=await parse(L?L.url(asset('/.studio-workspaces/holm-props-v1/candidates/props.glb')):asset('/.studio-workspaces/holm-props-v1/candidates/props.glb'));
  var fence=p1.scene.getObjectByName('fence-rail');if(fence){var seen=new Set();p1.scene.traverse(function(n){if(n.isMesh)[].concat(n.material).forEach(function(m){if(m&&!seen.has(m)&&m.color&&!m.map){seen.add(m);m.color.convertLinearToSRGB()}})});
   (d.fences||[]).forEach(function(f,i){var g=fence.clone(true);g.position.set(f.x,sample(f.x,f.z),f.z);g.rotation.set(0,f.yaw||0,0);g.name='island-hollow-fence-'+i;matte(g);own(g)})}
  // two old stumps by the teaching oaks (props v5 tree-stump)
  try{var p5=await parse(L?L.url(asset('/.studio-workspaces/holm-props-v5/candidates/props.glb')):asset('/.studio-workspaces/holm-props-v5/candidates/props.glb'));matte(p5.scene);var stump=p5.scene.getObjectByName('tree-stump');
   if(stump)(d.stumps||[]).forEach(function(q,i){var g=stump.clone(true);g.position.set(q[0],sample(q[0],q[1]),q[1]);g.rotation.set(0,i*2.2,0);g.scale.setScalar(q[2]||1);g.name='island-hollow-stump-'+i;own(g)})}catch(e){console.warn('[HolmFishing] stumps',e&&e.message)}
  // lily pads, reeds
  (d.lily||[]).forEach(function(l,i){var g=piece(l[2]==='flower'?'lily-pad-flower':'lily-pad');g.position.set(l[0],st.level+.004,l[1]);g.rotation.y=(i*1.7)%6.28;g.scale.setScalar(.85+(i%3)*.12);own(g)});
  try{var reeds=await parse(L?L.url(asset('/.studio-workspaces/holm-tree-family-v3/candidates/creek-reeds.glb')):asset('/.studio-workspaces/holm-tree-family-v3/candidates/creek-reeds.glb'));matte(reeds.scene);
   var rmin=new T.Box3().setFromObject(reeds.scene).min.y;(d.reeds||[]).forEach(function(r,i){var g=reeds.scene.clone(true);g.position.set(r[0],sample(r[0],r[1])-rmin*r[2]-.05,r[1]);g.scale.setScalar(r[2]);g.rotation.y=i*1.3;g.name='island-hollow-reeds-'+i;own(g)})}catch(e){console.warn('[HolmFishing] reeds',e&&e.message)}
  // pond life
  var fr=piece('frog');fr.position.set(d.frog.pad[0],st.level+.004,d.frog.pad[1]);fr.name='island-hollow-frog';own(fr);
  var body=fr.getObjectByName('frog-body');st.fauna={frog:{g:fr,body:body,home:body.position.clone(),state:'sit',t:0},ducks:[],flies:[]};
  d.ducks.forEach(function(k,i){var g=piece('duck');g.name='island-hollow-duck-'+i;own(g);st.fauna.ducks.push({g:g,k:k,a:k.phase})});
  d.dragonflies.forEach(function(k,i){var g=piece('dragonfly');g.name='island-hollow-dragonfly-'+i;g.position.set(k.near[0],st.level+.6,k.near[1]);own(g);st.fauna.flies.push({g:g,k:k,to:null,t:0,wait:Math.random()*2})});
  // the three moving spots on distinct candidates
  var order=d.candidates.map(function(c,i){return i});for(var s=order.length-1;s>0;s--){var r=Math.floor(Math.random()*(s+1)),tmp=order[s];order[s]=order[r];order[r]=tmp}
  st.spots=[];for(var n=0;n<d.rules.activeSpots;n++)st.spots.push(makeSpot(n,order[n]));
  st.leapT=d.rules.leapSeconds[0]+Math.random()*(d.rules.leapSeconds[1]-d.rules.leapSeconds[0]);st.ready=true;
  return {spots:st.spots.length,objects:st.objs.length};
 }
 // ---------------------------------------------------------------- the fishing action (game5_main gather branch)
 function state(){if(typeof Tutorial==='undefined')return {};var o=Tutorial.optional=Tutorial.optional||{};return o.holmFishing=o.holmFishing||{found:{}}}
 function lessonDone(){return typeof Tutorial!=='undefined'&&(Tutorial.complete||(Array.isArray(Tutorial.completedLessonIds)&&Tutorial.completedLessonIds.indexOf('catch_fish')>=0))}
 function spotOf(obj){var i=obj&&obj.userData&&obj.userData.holmFishing;return typeof i==='number'?st.spots[i]:null}
 // returns true when the roll was handled here (always, for a Minnow Hollow spot)
 function gatherTick(a,dt){
  var s=spotOf(a.obj);if(!s)return false;var rules=st.data.rules;
  if(s.state!=='on'){UI.chat('The fish have moved on.','plain');Player.action=null;return true}
  var power=typeof Player.bestToolPower==='function'?Player.bestToolPower('fishing'):1;
  if(power<=0){UI.chat(GATHER_RATES.fish.toolMsg,'plain');Player.action=null;return true}
  player.lookAt(s.g.position.x,player.position.y,s.g.position.z);
  a.tick=(a.tick||0)+dt;
  if(a.fishTicks===undefined){a.fishTicks=0;a.rolls=0;cast(s)}
  while(a.tick>=TICK_S){a.tick-=TICK_S;a.fishTicks++;
   if(a.fishTicks%rules.rollTicks!==0)continue;
   a.rolls++;stats.rolls++;cast(s);
   var f=state(),r=roll(rules,{lessonDone:lessonDone(),firstCatch:!!f.firstCatch,found:f.found,level:Player.lvl('Fishing'),rollIndex:a.rolls},st.rng);
   if(r.kind==='miss'){if(lessonDone()&&Math.random()<1/rules.soak.oneIn){soak();UI.chat(rules.soak.chat,'plain')}continue}
   if(!Player.addItem(r.item,1)){UI.chat('Your pack is too full to hold anything more.','plain');Player.action=null;return true}
   f.firstCatch=true;if(r.once){f.found[r.item]=true}stats.catches[r.item]=(stats.catches[r.item]||0)+1;stats.lastCatch={item:r.item,roll:a.rolls,guaranteed:!!r.guaranteed};
   UI.chat(r.chat,r.kind==='rare'?'xp':'plain');if(r.xp)Player.addXp('Fishing',r.xp);
   catchBeat(r.item,s);
   try{Tutorial.notify('gather',r.item)}catch(e){}
  }
  return true;
 }
 function cast(s){stats.casts++;try{if(typeof swing==='function')swing(player,'cast')}catch(e){}sfx('cast');var p=s.g.position;setTimeout(function(){if(!st.ready)return;splash(p.x+(Math.random()-.5)*.3,p.z+(Math.random()-.5)*.3,false);sfx('plish')},280)}
 // ---------------------------------------------------------------- per frame
 var tickAcc=0;
 function onTick(){
  var rules=st.data.rules;
  st.spots.forEach(function(s){
   if(s.state==='on'){if(--s.timer<=0){stats.moves++;s.state='fading';s.fade=rules.fadeTicks;bubbles(s.g.position.x,s.g.position.z);
     // a player netting this spot is told, 2004-style, and stops
     if(typeof Player!=='undefined'&&Player.action&&Player.action.type==='gather'&&Player.action.obj===s.g){UI.chat('The fish have moved on.','plain');stats.movedOn++;Player.action=null}}}
   else if(s.state==='fading'){if(--s.fade<=0){var held=st.spots.filter(function(q){return q!==s}).map(function(q){return q.next!==null&&q.state!=='on'?q.next:q.ci});s.next=freeCandidate(st.data.candidates,held,s.ci,st.rng);s.state='gone';s.fade=rules.appearAfterTicks;s.g.visible=false;s.g.userData.alive=false}}
   else if(s.state==='gone'){if(--s.fade<=0){s.ci=s.next;s.next=null;var p=spotPos(s.ci);s.g.position.set(p.x,waterY()+.015,p.z);s.g.visible=true;s.g.userData.alive=true;s.state='on';s.appear=0;s.timer=moveTimer(rules,st.rng);bubbles(p.x,p.z)}}
  });
 }
 function update(dt){
  if(!st.ready||!(dt>0))return;dt=Math.min(dt,.1);st.clock+=dt;tickAcc+=dt;while(tickAcc>=TICK_S){tickAcc-=TICK_S;onTick()}
  var t=st.clock;
  st.spots.forEach(function(s){
   var k=s.state==='fading'?Math.max(0,s.fade/st.data.rules.fadeTicks-.001):s.state==='on'?Math.min(1,(s.appear=(s.appear===undefined?1:s.appear+dt/TICK_S))):0;
   s.rip.scale.setScalar(Math.max(.0001,k));if(s.mixer)s.mixer.update(dt);
   s.shadows.forEach(function(h){h.a+=dt*h.w;h.o.position.set(Math.cos(h.a)*h.r,.004,Math.sin(h.a)*h.r);h.o.rotation.y=-h.a-(h.w>0?Math.PI/2:-Math.PI/2);h.o.visible=k>.2});
  });
  // fx
  for(var i=st.fx.length-1;i>=0;i--){var f=st.fx[i];f.t+=dt;if(f.t<0){f.o.visible=false;continue}f.o.visible=true;var u=f.t/f.life;
   if(u>=1){st.scene.remove(f.o);var oi=st.objs.indexOf(f.o);if(oi>=0)st.objs.splice(oi,1);st.fx.splice(i,1);continue}
   if(f.kind==='ring'){f.o.scale.setScalar((.5+u*1.2)*f.grow);setOpacity(f.o,.9*(1-u))}
   else if(f.kind==='drop'){f.o.position.x+=f.v[0]*dt;f.o.position.y+=f.v[1]*dt;f.o.position.z+=f.v[2]*dt;f.v[1]-=7*dt}
   else if(f.kind==='bubble'){f.o.position.y+=dt*.35;f.o.scale.multiplyScalar(1+dt*.4)}
   else if(f.kind==='leap'){var h=Math.sin(u*Math.PI)*.75;f.o.position.set(f.x+Math.cos(f.dir)*u*.9,waterY()+h-.05,f.z-Math.sin(f.dir)*u*.9);f.o.rotation.z=(.5-u)*2.4;
    if(!f.splashed&&u>.9){f.splashed=true;splash(f.o.position.x,f.o.position.z,true)}}
   else if(f.kind==='flap'){var e=Math.min(1,u*2.2);f.o.position.set(f.from[0]+(f.to[0]-f.from[0])*e,f.from[1]+(f.to[1]-f.from[1])*e+Math.sin(e*Math.PI)*.4,f.from[2]+(f.to[2]-f.from[2])*e);f.o.rotation.z=Math.sin(t*26)*.5;f.o.rotation.x=Math.sin(t*19)*.3}}
  // a fish leaps somewhere on the pond every 15-25 s
  st.leapT-=dt;if(st.leapT<=0){var r=st.data.rules.leapSeconds;st.leapT=r[0]+Math.random()*(r[1]-r[0]);var c=st.data.candidates[Math.floor(Math.random()*st.data.candidates.length)],ang=Math.random()*6.283;leap(c.water[0]+.5+Math.cos(ang)*1.2,c.water[1]+.5+Math.sin(ang)*1.2)}
  // ducks paddle their loops and bob; frog plops off its pad when you come close; dragonflies dart about the reeds
  var F=st.fauna;if(F){
   F.ducks.forEach(function(q){q.a+=dt*q.k.speed;var x=q.k.centre[0]+Math.cos(q.a)*q.k.rx,z=q.k.centre[1]+Math.sin(q.a)*q.k.rz;
    var dx=-Math.sin(q.a)*q.k.rx*Math.sign(q.k.speed),dz=Math.cos(q.a)*q.k.rz*Math.sign(q.k.speed);q.g.position.set(x,waterY()+Math.sin(t*2.1+q.k.phase)*.012,z);q.g.rotation.y=Math.atan2(-dz,dx)});
   var fr=F.frog,near=typeof player!=='undefined'&&Math.hypot(player.position.x-fr.g.position.x,player.position.z-fr.g.position.z)<st.data.frog.plopRadius;
   if(fr.state==='sit'&&near){fr.state='hop';fr.t=0;stats.plops++;sfx('plop')}
   if(fr.state==='hop'){fr.t+=dt;var hu=Math.min(1,fr.t/.45);fr.body.position.set(fr.home.x+hu*.55,fr.home.y+Math.sin(hu*Math.PI)*.35-(hu>.8?(hu-.8)*1.2:0),fr.home.z);if(hu>=1){fr.body.visible=false;splash(fr.g.position.x+.55,fr.g.position.z,false);fr.state='gone';fr.t=0}}
   else if(fr.state==='gone'){fr.t+=dt;if(fr.t>st.data.frog.backSeconds&&!near){fr.body.position.copy(fr.home);fr.body.visible=true;fr.state='sit'}}
   F.flies.forEach(function(q){q.wait-=dt;var p=q.g.position;if(!q.to||q.wait<=0){q.to=[q.k.near[0]+(Math.random()-.5)*2.2,waterY()+.35+Math.random()*.5,q.k.near[1]+(Math.random()-.5)*2.2];q.wait=.6+Math.random()*1.8}
    p.x+=(q.to[0]-p.x)*Math.min(1,dt*3.2);p.y+=(q.to[1]-p.y)*Math.min(1,dt*3.2);p.z+=(q.to[2]-p.z)*Math.min(1,dt*3.2);q.g.rotation.y=Math.atan2(-(q.to[2]-p.z),q.to[0]-p.x);q.g.scale.y=1+Math.sin(t*60)*.25});
  }
  ambient(dt);
 }
 function dispose(){st.ready=false;st.objs.forEach(function(o){if(o.parent)o.parent.remove(o);[st.W&&st.W.clickables,st.W&&st.W.resources,st.W&&st.W.grounds].forEach(function(a){if(!a)return;var i=a.indexOf(o);if(i>=0)a.splice(i,1);o.traverse&&o.traverse(function(n){var k=a.indexOf(n);if(k>=0)a.splice(k,1)})})});
  st.objs=[];st.spots=[];st.fx=[];st.fauna=null;if(st.ambient){try{st.ambient.src.stop()}catch(e){}st.ambient=null}}
 // the spot nearest a point (the guide arrow follows the live spot during catch_fish)
 function nearestSpot(x,z){var best=null,d=Infinity;st.spots.forEach(function(s){if(s.state!=='on')return;var k=Math.hypot(s.g.position.x-x,s.g.position.z-z);if(k<d){d=k;best=s.g}});return best}
 return {loadData:loadData,load:load,update:update,dispose:dispose,gatherTick:gatherTick,nearestSpot:nearestSpot,
  spots:function(){return st.spots.map(function(s){return {i:s.i,candidate:st.data.candidates[s.ci].id,state:s.state,x:s.g.position.x,z:s.g.position.z,timer:s.timer}})},
  fireRing:function(){return st.data&&st.data.fireBeach},data:function(){return st.data},stats:function(){return JSON.parse(JSON.stringify(stats))},
  fauna:function(){var F=st.fauna;return F?{frog:F.frog.state,ducks:F.ducks.map(function(q){return [+q.g.position.x.toFixed(2),+q.g.position.z.toFixed(2)]}),flies:F.flies.length}:null},
  // pure helpers for tests
  chance:chance,roll:roll,moveTimer:moveTimer,freeCandidate:freeCandidate,
  // QA only: move a spot now (drivers exercise the telegraph without waiting a minute)
  qaMove:function(i){var s=st.spots[i||0];if(s&&s.state==='on')s.timer=1}};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmFishing;
