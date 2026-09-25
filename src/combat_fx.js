/* ================= COMBAT FEEL (presentation only) — combat feel pass 2026-09-25 =================
 * OSRS-style combat feedback for all three styles, in our own art and sound:
 *   hit splats (red with the number, blue 0 for a miss, gold rim on a max hit), up to four stacked per target, popping
 *   over the torso at the moment of impact and fading after ~1.2 s; green-over-red health bars over whoever is in
 *   combat (hidden ~6 s after the last hit); melee splats timed to the swing's impact frame; arrows and spell orbs
 *   leaving the hands at the release frame and the splat showing when they land; impact puffs, cast glows, a wind orb
 *   with a swirling trail and a splash on a missed spell; flinch / block / topple-and-sink reactions; drops shown after
 *   the body sinks; synthesized sounds; OSRS-style XP drops by the minimap; a tiny screen shake on big hits.
 *
 * HARD RULE: presentation only. This file never rolls, never touches hp / xp / cooldowns / drops, and never calls
 * Math.random (a private LCG drives the particle scatter), so every combat number stays exactly as it was.
 * tools/qa_holm_combat_numbers.js replays 440 seeded attacks against a baseline recorded before this pass.
 *
 * Timing structure follows the 2004 client (2004scape, MIT; structure only, no assets): a hitsplat is drawn for
 * ~70 client cycles (1.4 s; we use 1.2 s), the health bar for 300 cycles (6 s) after the last hit, projectiles leave
 * at the attack animation's release frame and the hit is shown on arrival.
 *
 * Wiring (every call site is guarded with typeof CombatFX): UI.floatDmg -> hit(); UI.xpDrop -> xpDrop();
 * playerAttack -> melee(); npcAttack -> npcMelee(); fireProjectile / fireBoltAtPlayer -> launch();
 * updateProjectiles -> expectProjectile(); killNpc -> onKill(); makeHPBar -> hpBar();
 * animate(): update(dt) after the game update, draw() after the render. */
var CombatFX=(function(){
 'use strict';
 var SPLAT_LIFE=1.2,SPLAT_FADE=0.28,SPLAT_POP=0.12,BAR_LINGER=6,XP_LIFE=1.7;
 var SLOTS=[[0,0],[0,-30],[-24,-14],[24,-14]];   // OSRS stacking pattern: centre, above, left, right
 var T=0,frame=0,ready=false;
 var seed=0x2f6b1d3; function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}   // never Math.random
 var V1,V2,V3,V4,V5,V6,COL,WHITE,BOX;   // temps, made once THREE exists
 function init(){if(ready)return true;if(typeof THREE==='undefined')return false;
  V1=new THREE.Vector3();V2=new THREE.Vector3();V3=new THREE.Vector3();V4=new THREE.Vector3();V5=new THREE.Vector3();V6=new THREE.Vector3();
  COL=new THREE.Color();WHITE=new THREE.Color(0xffffff);BOX=new THREE.Box3();return (ready=true)}

 /* ---------------- settings ---------------- */
 var rmT=-9,rmV=false;
 function reducedMotion(){if(T-rmT<2&&rmT>=0)return rmV;rmT=T;var v=false;
  try{v=localStorage.getItem('cr_login_reduced_motion')==='1'}catch(e){}
  try{if(!v&&window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)v=true}catch(e){}
  return (rmV=v)}

 /* ---------------- per-target state (on the body's userData; nothing on shared NPC_TYPES) ---------------- */
 function isPlayer(o){return typeof player!=='undefined'&&o===player}
 function st(o){var u=o.userData||(o.userData={});
  return u._cfx||(u._cfx={lastHit:-99,pending:0,shown:1,trail:1,trailT:9,slots:[null,null,null,null],lastEv:null,h:0,hAt:-99,recoil:-1,hands:undefined})}
 function liveFrac(o){if(isPlayer(o))return Player.maxHp>0?Math.max(0,Math.min(1,Player.hp/Player.maxHp)):1;
  var n=o.userData&&o.userData.npc;if(n&&n.t&&n.t.hp>0)return Math.max(0,Math.min(1,n.hp/n.t.hp));return -1}
 function maxHpOf(o){if(isPlayer(o))return Player.maxHp||10;var n=o.userData&&o.userData.npc;return n&&n.t?n.t.hp:10}
 // visible height of a body, measured once it has geometry (GLB bodies stream in after spawn) and re-measured rarely
 function heightOf(o){if(isPlayer(o))return 1.85;var s=st(o);if(s.h>0&&(T-s.hAt<30||(o.userData&&o.userData.death)))return s.h;
  var n=o.userData&&o.userData.npc,t=n&&n.t,guess=t?(t.glbHeight||((t.humanoid||t.model==='goblin')?1.8*(t.size||1):0.9*(t.size||1)+0.4)):1.6;
  if(!(o.userData&&o.userData.death)&&o.children.length){try{o.updateMatrixWorld(true);BOX.setFromObject(o);var h=BOX.max.y-BOX.min.y;
   if(isFinite(h)&&h>0.2&&h<12){s.h=h;s.hAt=T;return h}}catch(e){}}
  return s.h>0?s.h:guess}
 // anchors: the torso for splats, just over the head for the bar; a falling body is anchored to where it lies (its ground)
 function torso(o,out){out.setFromMatrixPosition(o.matrixWorld);var d=o.userData&&o.userData.death,h=heightOf(o);
  if(d&&d.baseY!=null){out.y=d.baseY+h*0.32;return out}out.y+=h*(isPlayer(o)?0.56:0.5);return out}
 function head(o,out){out.setFromMatrixPosition(o.matrixWorld);var d=o.userData&&o.userData.death,h=heightOf(o);
  if(d&&d.baseY!=null){out.y=d.baseY+h*0.75;return out}out.y+=h+(isPlayer(o)?0.1:0.12);return out}
 function hands(o){var s=st(o);if(s.hands!==undefined)return s.hands;var L=null,R=null;
  o.traverse(function(b){if(!(b.isBone||b.type==='Bone'))return;var n=b.name||'';if(!L&&/LeftHand$/.test(n))L=b;if(!R&&/RightHand$/.test(n))R=b});
  var p=o.userData&&o.userData.parts;if(!L&&p&&p.handL)L=p.handL;if(!R&&p&&p.handR)R=p.handR;
  s.hands=(L||R)?{L:L||R,R:R||L}:null;return s.hands}
 function handPos(o,which,out){var h=hands(o);if(h){(which==='L'?h.L:h.R).getWorldPosition(out);return out}
  out.setFromMatrixPosition(o.matrixWorld);V6.set(0,0,1).applyQuaternion(o.quaternion);out.addScaledVector(V6,0.35);out.y+=heightOf(o)*0.62;return out}

 /* ---------------- attack timing: when a swing connects / a projectile leaves the hand ---------------- */
 var KIT={slash:.30,stab:.30,crush:.40,bow:.83,cast:.47};      // holm_kit_v2 key frames at 30 fps (slash/stab f9, crush f12, bow release f25, cast f14)
 var SPEED={bow:1.35,cast:1.15};                                 // HolmIslandPlayer plays the draw and the cast a touch faster (snappier release)
 var TWEEN={slash:.22,stab:.19,crush:.27,bow:.30,cast:.25};      // tickSwing archetypes (game2_world.js)
 function impactTime(o,type){type=type||'slash';var ud=o&&o.userData||{};
  if(isPlayer(o)&&ud.holmPlayer)return (KIT[type]||.3)/(SPEED[type]||1);
  var gm=ud.gmix;if(gm&&gm.attack&&gm.attack.getClip)return Math.max(.12,gm.attack.getClip().duration*.5);   // grubkin snap: frame 9 of 18
  var p=ud.parts;if(p&&p.armR)return TWEEN[type]||.22;
  if(p&&(p.head||p.maw||p.claws))return .21;                     // beast lunge peaks at f=.5 of .42 s
  return .2}
 function speedFor(name){return SPEED[name]||1}

 /* ---------------- scheduled presentation events ---------------- */
 var evs=[];
 function allocEv(){for(var i=0;i<evs.length;i++)if(!evs[i].on)return evs[i];var e={on:false,obj:null,fx:null,kill:null};evs.push(e);return e}
 var expect={obj:null,frame:-1,delay:0,kind:'',fx:null,max:false,atype:''};
 function setExpect(obj,delay,kind,fx,isMax,atype){expect.obj=obj;expect.frame=frame;expect.delay=delay;expect.kind=kind;expect.fx=fx||null;expect.max=!!isMax;expect.atype=atype||''}

 // UI.floatDmg funnel: every hitsplat in the game passes through here (the hp change has already happened)
 function hit(obj,dmg){
  if(!obj||!init())return;
  var e=(expect.obj===obj&&expect.frame===frame)?expect:null;
  var s=st(obj),ev=allocEv(),fr=liveFrac(obj);dmg=dmg|0;
  if(s.pending===0&&fr>=0)s.shown=Math.max(0,Math.min(1,fr+(dmg>0?dmg/maxHpOf(obj):0)));   // the bar keeps the pre-hit value until the splat shows
  ev.on=true;ev.obj=obj;ev.dmg=dmg;ev.frac=fr;ev.kind=e?e.kind:'generic';ev.max=!!(e&&e.max&&dmg>0);ev.kill=null;ev.atype=e?e.atype:'';
  ev.fx=e?e.fx:null;ev.fireAt=e&&!ev.fx?T+Math.max(0,e.delay):T;
  if(e)expect.obj=null;
  if(ev.fx&&!ev.fx.landed){ev.fireAt=Infinity;ev.fx.hits.push(ev)}
  s.pending++;s.lastEv=ev;s.lastHit=Math.max(s.lastHit,T);
  if(ev.fireAt<=T)present(ev);
 }
 function present(ev){
  ev.on=false;var o=ev.obj,s=st(o);s.pending=Math.max(0,s.pending-1);s.lastHit=T;
  var nf=ev.frac>=0?ev.frac:s.shown;if(nf<s.shown){s.trail=Math.max(s.trail,s.shown);s.trailT=0}s.shown=nf;
  addSplat(o,ev.dmg,ev.max?2:(ev.dmg>0?0:1));
  var ud=o.userData||{};if(!ud.death||ev.kill)react(o,ev.dmg);
  var big=ev.dmg>0&&(ev.max||ev.dmg>=10||(ev.dmg>=3&&ev.dmg>=0.3*maxHpOf(o)));
  // melee sounds land here; projectiles already sounded their impact on arrival
  // (a 'generic' hit - a sparring bot, a boss script - is only voiced near the adventurer)
  var near=ev.kind!=='generic'||isPlayer(o)||(typeof player!=='undefined'&&player&&o.position&&o.position.distanceTo(player.position)<14);
  if(near&&(ev.kind==='melee'||ev.kind==='npcMelee'||ev.kind==='generic')){if(ev.dmg>0){if(isPlayer(o))snd.hurt(big);else snd.hit(big,ev.atype)}else snd.block()}
  else if(isPlayer(o)&&ev.dmg>0)snd.hurt(big);
  if(ev.dmg>0&&(ev.kind==='melee'||ev.kind==='npcMelee'))sparks(o,big);
  if(big&&(isPlayer(o)||ev.kind!=='generic'))shake(ev.dmg>=10?2.5:2,80);
  if(ev.kill){var k=ev.kill;ev.kill=null;releaseDeath(k)}
  ev.obj=null;ev.fx=null;
 }
 function attackingNow(gm){if(!gm||!gm.attack||!gm.attack.isRunning||!gm.attack.isRunning())return false;var c=gm.attack.getClip&&gm.attack.getClip();return !!c&&/^(attack|bow|cast)/.test(c.name)}
 function react(o,dmg){
  var ud=o.userData||{},gm=ud.gmix,busy=attackingNow(gm);
  if(dmg>0){
   if(!ud.death&&typeof hitReact==='function')hitReact(o);                       // root squash (all bodies)
   if(isPlayer(o)&&ud.holmPlayer&&typeof HolmIslandPlayer!=='undefined'){if(!busy)HolmIslandPlayer.play('hit')}   // the kit's own hit clip
   else if(gm&&!isPlayer(o)&&o.children[0]&&!ud.death)st(o).recoil=0;          // GLB creature: lean back off the blow
  } else if(!busy&&!ud.death&&typeof blockReact==='function')blockReact(o);      // a 0 raises the guard (block clip / procedural guard)
 }

 /* ---------------- hit splats (pooled; drawn on a 2D layer above the 3D view, below the interface) ---------------- */
 var splats=[];for(var si=0;si<40;si++)splats.push({on:false,obj:null,dmg:0,kind:0,t0:0,slot:0,txt:'0'});
 var FONTS=[];for(var fi=0;fi<=40;fi++)FONTS.push('bold '+fi+'px Tahoma, Verdana, sans-serif');
 function addSplat(o,dmg,kind){
  var s=st(o),slot=-1,oldest=null,i,q,sp=null;
  for(i=0;i<4;i++){q=s.slots[i];if(!q||!q.on||q.obj!==o){slot=i;break}if(!oldest||q.t0<oldest.t0)oldest=q}
  if(slot<0){sp=oldest;slot=oldest.slot}
  else for(i=0;i<splats.length;i++)if(!splats[i].on){sp=splats[i];break}
  if(!sp){sp=splats[0];for(i=1;i<splats.length;i++)if(splats[i].t0<sp.t0)sp=splats[i];var ps=sp.obj&&sp.obj.userData&&sp.obj.userData._cfx;if(ps&&ps.slots[sp.slot]===sp)ps.slots[sp.slot]=null}
  sp.on=true;sp.obj=o;sp.dmg=dmg;sp.kind=kind;sp.t0=T;sp.slot=slot;sp.txt=String(dmg>0?dmg:0);s.slots[slot]=sp;
 }
 function splatsOn(o){var s=o.userData&&o.userData._cfx;if(!s)return false;for(var i=0;i<4;i++){var q=s.slots[i];if(q&&q.on&&q.obj===o)return true}return false}

 /* ---------------- 2D layer: splats + health bars ---------------- */
 // K: splats and bars scale with the view (owner review: they read small); 1 at 680 px tall, ~1.3 at 900, OSRS proportions
 var layer=null,g2=null,dpr=1,LW=0,LH=0,K=1,drewLast=false,SPR=null;
 function ensureLayer(){
  if(layer)return layer;if(typeof document==='undefined')return null;
  var gc=document.getElementById('game-canvas');if(!gc)return null;
  layer=document.createElement('canvas');layer.id='combat-fx-layer';
  layer.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;';
  gc.insertAdjacentElement('afterend',layer);g2=layer.getContext('2d');sizeLayer();return layer}
 function sizeLayer(){var w=innerWidth,h=innerHeight,d=Math.min(2,window.devicePixelRatio||1);if(w===LW&&h===LH&&d===dpr&&SPR)return;
  LW=w;LH=h;dpr=d;K=Math.max(0.85,Math.min(1.5,h/680));layer.width=Math.round(w*d);layer.height=Math.round(h*d);SPR=makeSplatSprites()}
 // our own splat: an irregular nine-lobed blot, dark rim, soft highlight (0 red hit, 1 blue miss, 2 gold-rimmed max hit)
 function makeSplatSprites(){
  var out=[],cols=[['#f25a3c','#b3241a','#5a0a05','#2a0402'],['#76a0ea','#2c4f9c','#12244d','#081329'],['#f25a3c','#b3241a','#5a0a05','#ffd24a']];
  var S=Math.round(40*K*dpr);
  for(var k=0;k<3;k++){var c=document.createElement('canvas');c.width=c.height=S;var x=c.getContext('2d'),cx=S/2,cy=S/2,R=S*0.38;
   x.beginPath();for(var i=0;i<=90;i++){var a=i/90*Math.PI*2,r=R*(0.86+0.09*Math.cos(9*a+0.6)+0.05*Math.cos(4*a+1.9));var px=cx+Math.cos(a)*r*1.07,py=cy+Math.sin(a)*r*0.95;if(i)x.lineTo(px,py);else x.moveTo(px,py)}
   x.closePath();var gr=x.createRadialGradient(cx-R*.25,cy-R*.3,R*.1,cx,cy,R*1.05);gr.addColorStop(0,cols[k][0]);gr.addColorStop(.62,cols[k][1]);gr.addColorStop(1,cols[k][2]);
   x.fillStyle=gr;x.fill();x.lineWidth=(k===2?2.8:1.7)*dpr;x.strokeStyle=cols[k][3];x.stroke();
   x.globalAlpha=.32;x.fillStyle='#fff';x.beginPath();x.ellipse(cx-R*.32,cy-R*.4,R*.3,R*.13,-.5,0,Math.PI*2);x.fill();out.push(c)}
  return out}
 function project(p){p.project(camera);if(p.z>1||p.z<-1)return false;p.x=(p.x+1)/2*LW;p.y=(1-p.y)/2*LH;return true}
 var BAR_W=34,BAR_H=5;
 function drawBar(o,frac,s){
  if(!project(head(o,V1)))return;var BW=Math.round(BAR_W*K),BH=Math.max(5,Math.round(BAR_H*K)),x=Math.round(V1.x-BW/2),y=Math.round(V1.y-BH);
  g2.fillStyle='#000';g2.fillRect(x-1,y-1,BW+2,BH+2);
  g2.fillStyle='#c8190e';g2.fillRect(x,y,BW,BH);
  var gw=Math.round(BW*Math.max(0,Math.min(1,frac)));
  if(s&&s.trail>frac&&s.trailT<0.45){var tw=Math.round(BW*Math.min(1,s.trail))-gw;if(tw>0){g2.globalAlpha=1-s.trailT/0.45;g2.fillStyle='#ffe9a8';g2.fillRect(x+gw,y,tw,BH);g2.globalAlpha=1}}
  g2.fillStyle='#22c42c';g2.fillRect(x,y,gw,BH);
  g2.fillStyle='rgba(255,255,255,.3)';g2.fillRect(x,y,gw,1)}
 function barFrac(o,s){var f=s&&s.pending>0?s.shown:liveFrac(o);return f<0?1:f}
 function draw(){
  if(ready&&shk.on){try{camera.clearViewOffset()}catch(e){}shk.on=false}
  if(!ready||typeof camera==='undefined'||!camera||!ensureLayer())return;
  sizeLayer();
  var any=false,i,n,o,s,npcs=(typeof WORLD!=='undefined'&&WORLD.npcs)||[],pl=typeof player!=='undefined'&&player?player:null,ps=pl&&pl.userData?pl.userData._cfx:null;
  for(i=0;i<splats.length;i++)if(splats[i].on){any=true;break}
  for(i=0;i<npcs.length&&!any;i++){n=npcs[i];s=n.mesh&&n.mesh.userData._cfx;if((n.target==='player'&&!n.dead)||(s&&T-s.lastHit<BAR_LINGER))any=true}
  if(!any&&typeof Player!=='undefined'&&Player.target&&!Player.target.dead)any=true;
  if(!any&&ps&&T-ps.lastHit<BAR_LINGER)any=true;
  if(!any){if(drewLast){g2.setTransform(1,0,0,1,0,0);g2.clearRect(0,0,layer.width,layer.height);drewLast=false}return}
  drewLast=true;g2.setTransform(1,0,0,1,0,0);g2.clearRect(0,0,layer.width,layer.height);g2.setTransform(dpr,0,0,dpr,0,0);
  camera.updateMatrixWorld();
  // health bars: NPCs fighting the player or hit in the last few seconds; a dead one keeps its empty bar while its killing splat shows
  var engagedPlayer=false;
  for(i=0;i<npcs.length;i++){n=npcs[i];o=n.mesh;if(!o||!o.visible)continue;s=o.userData._cfx;
   var engaged=!n.dead&&(n.target==='player'||(typeof Player!=='undefined'&&Player.target===n));if(!n.dead&&n.target==='player')engagedPlayer=true;
   if(n.dead){if(s&&(s.pending>0||splatsOn(o)))drawBar(o,barFrac(o,s),s);continue}
   if(engaged||(s&&T-s.lastHit<BAR_LINGER))drawBar(o,barFrac(o,s),s)}
  if(pl&&pl.visible!==false&&typeof Player!=='undefined'&&(engagedPlayer||(Player.target&&!Player.target.dead)||(ps&&T-ps.lastHit<BAR_LINGER)))drawBar(pl,barFrac(pl,ps),ps);
  // splats (pool order; the newest in a slot replaces the oldest)
  g2.textAlign='center';g2.textBaseline='middle';
  for(i=0;i<splats.length;i++){var sp=splats[i];if(!sp.on)continue;o=sp.obj;
   if(!o.parent&&!isPlayer(o)){sp.on=false;continue}
   if(o.visible===false||!project(torso(o,V2)))continue;
   var age=T-sp.t0,a=age>SPLAT_LIFE-SPLAT_FADE?Math.max(0,(SPLAT_LIFE-age)/SPLAT_FADE):1,sc=age<SPLAT_POP?1.45-0.45*(age/SPLAT_POP):1;
   var off=SLOTS[sp.slot],cx=V2.x+off[0]*K,cy=V2.y+off[1]*K,w=40*K*sc;
   g2.globalAlpha=a;g2.drawImage(SPR[sp.kind],cx-w/2,cy-w/2,w,w);
   var txt=sp.txt;g2.font=FONTS[Math.min(40,Math.round(15*K*sc))];
   g2.fillStyle='#000';g2.fillText(txt,cx+1,cy+1.5);g2.fillStyle=sp.kind===2?'#fff2b8':'#fff';g2.fillText(txt,cx,cy+0.5)}
  g2.globalAlpha=1;
 }

 /* ---------------- 3D particles: pooled sprites (soft dot, ring and wisp textures drawn once) ---------------- */
 var parts=[],TEX={},PMAX=160;
 function tex(kind){if(TEX[kind])return TEX[kind];var c=document.createElement('canvas');c.width=c.height=64;var x=c.getContext('2d'),gr;
  if(kind==='ring'){x.strokeStyle='#fff';x.lineWidth=6;x.shadowColor='#fff';x.shadowBlur=9;x.beginPath();x.arc(32,32,23,0,Math.PI*2);x.stroke()}
  else if(kind==='wisp'){gr=x.createRadialGradient(32,32,0,32,32,30);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.4,'rgba(255,255,255,.5)');gr.addColorStop(1,'rgba(255,255,255,0)');
   x.fillStyle=gr;x.beginPath();x.ellipse(32,32,31,10,0,0,Math.PI*2);x.fill()}
  else{gr=x.createRadialGradient(32,32,0,32,32,31);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.42,'rgba(255,255,255,.62)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,64,64)}
  TEX[kind]=new THREE.CanvasTexture(c);return TEX[kind]}
 function allocPart(){for(var i=0;i<parts.length;i++)if(!parts[i].on)return parts[i];
  if(parts.length>=PMAX){var old=parts[0];for(var j=1;j<parts.length;j++)if(parts[j].t0<old.t0)old=parts[j];return old}
  var m=new THREE.SpriteMaterial({map:tex('dot'),transparent:true,depthWrite:false,opacity:1});var sp=new THREE.Sprite(m);sp.visible=false;sp.renderOrder=5;sp.frustumCulled=false;sp.name='cfx-particle';
  var p={on:false,spr:sp,v:new THREE.Vector3(),t0:0,life:1,s0:.2,s1:.2,a0:1,grav:0,drag:0,spin:0,fx:null,hand:null,held:false};parts.push(p);return p}
 // spawn(pos, hex, size0, size1, life, alpha, additive, texture) -> particle (set p.v / p.grav / p.drag / p.spin after)
 function spawn(pos,hex,s0,s1,life,alpha,add,tk){if(!ready||typeof scene==='undefined'||!scene)return null;var p=allocPart(),sp=p.spr,m=sp.material,tx=tex(tk||'dot');
  if(m.map!==tx){m.map=tx;m.needsUpdate=true}var bl=add?THREE.AdditiveBlending:THREE.NormalBlending;if(m.blending!==bl){m.blending=bl;m.needsUpdate=true}
  m.color.setHex(hex);m.opacity=alpha;m.rotation=0;p.on=true;p.t0=T;p.life=life;p.s0=s0;p.s1=s1;p.a0=alpha;p.grav=0;p.drag=0;p.spin=0;p.fx=null;p.hand=null;p.held=false;
  p.v.set(0,0,0);sp.position.copy(pos);sp.scale.setScalar(s0);sp.visible=true;if(sp.parent!==scene)scene.add(sp);return p}
 function kill(p){if(p){p.on=false;p.spr.visible=false}}
 function tickParts(dt){for(var i=0;i<parts.length;i++){var p=parts[i];if(!p.on)continue;var k=(T-p.t0)/p.life;
  if(k>=1){kill(p);continue}
  if(p.hand&&p.fx&&p.fx.src)handPos(p.fx.src,p.hand,p.spr.position);
  else if(!p.held){p.v.y-=p.grav*dt;if(p.drag)p.v.multiplyScalar(Math.max(0,1-p.drag*dt));p.spr.position.addScaledVector(p.v,dt)}
  p.spr.scale.setScalar(p.s0+(p.s1-p.s0)*k);p.spr.material.opacity=p.a0*(k<0.7?1:(1-k)/0.3);if(p.spin)p.spr.material.rotation+=p.spin*dt}}
 function burstDir(out){var a=rnd()*Math.PI*2,u=rnd()*2-1,r=Math.sqrt(1-u*u);return out.set(Math.cos(a)*r,Math.abs(u)*0.8+0.2,Math.sin(a)*r)}
 function sparks(o,big){torso(o,V3);var n=big?9:5;for(var i=0;i<n;i++){burstDir(V4);var sp=(big?3.3:2.5)*(0.6+rnd()*0.6);
  var p=spawn(V3,i%3?0xfff1c4:0xffb060,big?.21:.15,.03,.2+rnd()*.12,1,true);if(p){p.v.copy(V4).multiplyScalar(sp);p.grav=6;p.drag=3}}
  if(big)spawn(V3,0xffc46a,.3,1.05,.2,.5,true,'ring')}
 function dust(pos,n,hex,size){for(var i=0;i<n;i++){var a=rnd()*Math.PI*2,r=0.6+rnd()*0.8,s=size*(0.7+rnd()*.5);
  var p=spawn(pos,hex,s,s*2.2,.45+rnd()*.25,.38,false);if(p){p.v.set(Math.cos(a)*r,.35+rnd()*.5,Math.sin(a)*r);p.drag=3.5}}}
 function tinted(c,w){COL.copy(c).lerp(WHITE,w);return COL.getHex()}

 /* ---------------- projectiles: arrows and spell orbs (visual only; the logical flight in game3 is unchanged) ---------------- */
 var fxs=[],arrows=[];
 // stand any arrow build along +Z (Object3D.lookAt aims +Z at the point): measure its long axis once and wrap it
 function fitArrow(m){var w=new THREE.Group();w.add(m);w.name='cfx-arrow';
  try{m.updateMatrixWorld(true);BOX.setFromObject(m);var sx=BOX.max.x-BOX.min.x,sy=BOX.max.y-BOX.min.y,sz=BOX.max.z-BOX.min.z;
   if(sy>=sx&&sy>=sz)m.rotation.x+=Math.PI/2;else if(sx>=sz)m.rotation.y-=Math.PI/2;
   w.updateMatrixWorld(true);BOX.setFromObject(m);BOX.getCenter(V6);m.position.sub(V6)}catch(e){}
  w.visible=false;return w}
 function arrowFromPool(){var i,a,he=null;
  for(i=0;i<arrows.length;i++){a=arrows[i];if(a.busy)continue;
   if(!a.blender&&typeof HolmEquipment!=='undefined'&&HolmEquipment.mesh){try{he=HolmEquipment.mesh('arrow',0x9aa0a8,{frame:'legacy'})}catch(e){}
    if(he){if(a.m.parent)a.m.parent.remove(a.m);a.m=fitArrow(he);a.blender=true}}
   a.busy=true;return a}
  if(arrows.length>=6||typeof arrowMesh!=='function')return null;
  var m=arrowMesh();a={m:fitArrow(m),busy:true,blender:!!(m.userData&&m.userData.holmEquipment)};arrows.push(a);return a}
 function allocFx(){for(var i=0;i<fxs.length;i++)if(!fxs[i].on)return fxs[i];
  var f={on:false,hits:[],p0:new THREE.Vector3(),pos:new THREE.Vector3(),tint:new THREE.Color(),core:null,halo:null,wisps:[],glowL:null,glowR:null,arrow:null,landed:true};fxs.push(f);return f}
 // at attack time; the visual leaves the hand at the release frame of the attacker's animation
 function launch(kind,src,dst,opts){
  if(!init()||!src||!dst)return null;var f=allocFx(),o=opts||{};
  f.on=true;f.kind=kind==='arrow'?'arrow':'magic';f.src=src;f.dst=dst;f.t0=T;f.hits.length=0;f.landed=false;f.state=0;f.dmg=o.dmg|0;f.max=!!o.max;
  f.release=T+(o.release!=null?o.release:impactTime(src,f.kind==='arrow'?'bow':'cast'));f.dur=.4;f.arc=0;
  f.tint.setHex(o.tint==null?(f.kind==='arrow'?0xffffff:0xc8d8e8):o.tint);f.wind=f.kind==='magic'&&(o.spell?/^wind_/.test(o.spell):false);
  f.core=f.halo=f.glowL=f.glowR=null;f.wisps.length=0;f.arrow=null;
  if(f.kind==='magic'){snd.charge();var life=Math.max(.2,f.release-T)+.06,hx=tinted(f.tint,.45);
   f.glowL=spawn(handPos(src,'L',V3),hx,.05,.5,life,.9,true);if(f.glowL){f.glowL.fx=f;f.glowL.hand='L'}
   f.glowR=spawn(handPos(src,'R',V3),hx,.05,.5,life,.9,true);if(f.glowR){f.glowR.fx=f;f.glowR.hand='R'}}
  return f}
 function releaseFx(f){
  f.state=1;var src=f.src,dst=f.dst;
  if(f.kind==='arrow'){handPos(src,'L',f.p0);snd.bow()}
  else{handPos(src,'L',V3);handPos(src,'R',V4);f.p0.copy(V3).add(V4).multiplyScalar(.5);snd.release(f.wind);kill(f.glowL);kill(f.glowR);f.glowL=f.glowR=null;
   spawn(f.p0,tinted(f.tint,.5),.16,.62,.18,.6,true,'ring')}
  torso(dst,V3);var d=Math.max(.5,f.p0.distanceTo(V3));
  f.dur=f.kind==='arrow'?Math.max(.22,Math.min(.6,d/17+.1)):Math.max(.3,Math.min(.85,d/11+.14));
  f.arc=f.kind==='arrow'?Math.min(.9,.08*d+.12):Math.min(.5,.04*d+.06);
  f.pos.copy(f.p0);
  if(f.kind==='arrow'){f.arrow=arrowFromPool();if(f.arrow){var m=f.arrow.m;if(m.parent!==scene)scene.add(m);m.position.copy(f.p0);m.visible=true}}
  else{var life=f.dur+.08;
   f.halo=spawn(f.p0,tinted(f.tint,.2),.8,.8,life,.42,true);if(f.halo)f.halo.held=true;
   f.core=spawn(f.p0,tinted(f.tint,.6),.36,.36,life,1,true);if(f.core)f.core.held=true;
   var nw=f.wind?3:2;for(var i=0;i<nw;i++){var w=spawn(f.p0,0xffffff,.24,.24,life,.85,true,f.wind?'wisp':'dot');if(w){w.held=true;w.spr.material.rotation=i*2.1;w.spin=9}f.wisps.push(w)}}
 }
 function pathAt(f,k,tgt,out){out.copy(f.p0).lerp(tgt,k);out.y+=f.arc*4*k*(1-k);return out}
 function flyFx(f){
  var k=Math.min(1,(T-f.release)/f.dur);torso(f.dst,V3);pathAt(f,k,V3,f.pos);
  if(f.arrow){var m=f.arrow.m;m.position.copy(f.pos);pathAt(f,Math.min(1,k+.05),V3,V5);if(k<.97&&V5.distanceToSquared(f.pos)>1e-6)m.lookAt(V5)}
  else{
   if(f.core)f.core.spr.position.copy(f.pos);if(f.halo)f.halo.spr.position.copy(f.pos);
   var ang=(T-f.release)*(f.wind?17:11),nw=f.wisps.length;
   for(var i=0;i<nw;i++){var w=f.wisps[i];if(!w)continue;var a=ang+i*(Math.PI*2/nw),r=f.wind?.21:.12;
    V5.set(Math.cos(a)*r,Math.sin(a*1.3)*r*.8,Math.sin(a)*r);w.spr.position.copy(f.pos).add(V5)}
   spawn(f.pos,tinted(f.tint,.35),f.wind?.3:.26,.02,.2,.55,true)}   // the comet tail
  if(k>=1)landFx(f)}
 function landFx(f){
  f.landed=true;f.state=2;f.on=false;var at=V3.copy(f.pos),i,p;
  if(f.arrow){f.arrow.m.visible=false;f.arrow.busy=false;f.arrow=null}
  kill(f.core);kill(f.halo);kill(f.glowL);kill(f.glowR);f.core=f.halo=f.glowL=f.glowR=null;for(i=0;i<f.wisps.length;i++)kill(f.wisps[i]);f.wisps.length=0;
  if(f.kind==='arrow'){snd.arrowHit(f.dmg>0);dust(at,f.dmg>0?4:3,f.dmg>0?0xc9b48a:0x9a9080,.16);
   if(f.dmg>0)for(i=0;i<4;i++){p=spawn(at,0xfff0c0,.1,.02,.16,1,true);if(p){burstDir(p.v).multiplyScalar(2);p.grav=5}}}
  else if(f.dmg>0){snd.magicHit(f.max);var c=tinted(f.tint,.4);
   spawn(at,c,.2,f.max?1.9:1.4,.3,.9,true,'ring');spawn(at,0xffffff,.7,.1,.18,.9,true);
   for(i=0;i<(f.wind?8:6);i++){p=spawn(at,c,.24,.04,.3+rnd()*.12,1,true,f.wind?'wisp':'dot');if(p){burstDir(p.v).multiplyScalar(2.6*(0.6+rnd()*.6));p.drag=3;p.spin=6;p.spr.material.rotation=rnd()*3}}}
  else{snd.splash();for(i=0;i<7;i++){var a=i/7*Math.PI*2,r=.7+rnd()*.5;p=spawn(at,i%2?0x9fb4d8:0xc9d6ee,.22,.78,.5+rnd()*.2,.7,false);if(p){p.v.set(Math.cos(a)*r,.5+rnd()*.6,Math.sin(a)*r);p.drag=3}}}
  flushHits(f);
 }
 function flushHits(f){var hs=f.hits;for(var h=0;h<hs.length;h++){if(hs[h].on){hs[h].fireAt=T;present(hs[h])}}hs.length=0}
 function dropFx(f){f.on=false;f.landed=true;if(f.arrow){f.arrow.m.visible=false;f.arrow.busy=false;f.arrow=null}
  kill(f.core);kill(f.halo);kill(f.glowL);kill(f.glowR);f.core=f.halo=f.glowL=f.glowR=null;for(var i=0;i<f.wisps.length;i++)kill(f.wisps[i]);f.wisps.length=0;flushHits(f)}
 // updateProjectiles is landing the logical hit now: show it when the visual arrives (at once if it already has)
 function expectProjectile(f,target){if(!f||!target||!init())return;setExpect(target,0,f.kind,f.landed?null:f,f.max,'')}

 /* ---------------- entry points from the combat code (they only read what was already rolled) ---------------- */
 function melee(att,npc,atype,dmg,maxHit){if(!init()||!npc||!npc.mesh)return;snd.swing(atype);
  setExpect(npc.mesh,impactTime(att,atype),'melee',null,dmg>0&&maxHit>=3&&dmg>=maxHit,atype)}
 function npcMelee(npc,dmg){if(!init()||!npc||!npc.mesh||typeof player==='undefined')return;var t=npc.t||{},ud=npc.mesh.userData||{},p=ud.parts;
  if((p&&!p.armR)||(ud.gmix&&t.glbChar&&/grub/.test(t.glbChar)))snd.snap();else snd.swing(t.atype||'slash',.7);
  setExpect(player,impactTime(npc.mesh,t.atype||'slash'),'npcMelee',null,false,t.atype||'')}

 /* ---------------- death: topple when the killing splat shows, lie a moment, sink away, then show the drop ---------------- */
 var dying=[];
 function onKill(npc,drops,silent){
  if(!init()||!npc||!npc.mesh)return;var g=npc.mesh,ud=g.userData,s=st(g),d=ud.death,ev=(s.lastEv&&s.lastEv.on&&s.lastEv.obj===g)?s.lastEv:null,t=npc.t||{};
  var h=heightOf(g);
  if(d){d.hold=.42;d.sink=.55;d.sinkDepth=h*(t.deathStyle==='flip'?1.3:.95);
   if(t.deathStyle==='flip'){d.style='flip';d.roll=2.95;d.dur=.62;d.hop=Math.min(.35,h*.45);d.lift=h*.85}
   d.wait=!!ev}
  if(ev)ev.kill=npc;
  var e=null,i;for(i=0;i<dying.length;i++)if(!dying[i].on){e=dying[i];break}if(!e){e={drops:[]};dying.push(e)}
  e.on=true;e.npc=npc;e.drops.length=0;e.t0=T;e.started=!ev;e.silent=!!silent;e.thud=false;
  if(drops)for(i=0;i<drops.length;i++){var m=drops[i];if(m&&m.userData){m.userData._cfxHide=true;m.visible=false;e.drops.push(m)}}
  if(!ev&&!silent)snd.death(npc);
 }
 function releaseDeath(npc){var d=npc.mesh&&npc.mesh.userData.death;if(d)d.wait=false;
  for(var i=0;i<dying.length;i++){var e=dying[i];if(e.on&&e.npc===npc&&!e.started){e.started=true;e.t0=T;if(!e.silent)snd.death(npc)}}}
 function tickDying(){for(var i=0;i<dying.length;i++){var e=dying[i];if(!e.on)continue;var n=e.npc,d=n.mesh.userData.death;
   if(!e.started&&T-e.t0>2.5)releaseDeath(n);                       // safety: a hit that never arrives must not freeze the corpse
   if(e.started&&!e.thud&&d&&!d.wait&&d.t>=d.dur*.8){e.thud=true;V3.setFromMatrixPosition(n.mesh.matrixWorld);dust(V3,6,0x8f7d5c,.26);snd.thud()}
   if(!n.dying||!d||!n.dead||(e.started&&T-e.t0>5)){e.on=false;var s=n.mesh.userData._cfx;if(s)s.lastHit=-99;
    for(var j=0;j<e.drops.length;j++){var m=e.drops[j];if(m.userData){m.userData._cfxHide=false;m.userData._cfxPop=T;m.visible=true}}e.drops.length=0}}}
 function tickDrops(){if(typeof WORLD==='undefined'||!WORLD.drops)return;for(var i=0;i<WORLD.drops.length;i++){var m=WORLD.drops[i],u=m.userData;if(!u)continue;
   if(u._cfxHide){m.visible=false;continue}
   if(u._cfxPop!=null){var k=(T-u._cfxPop)/.24;if(u._cfxBase==null)u._cfxBase=m.scale.x;
    if(k>=1){m.scale.setScalar(u._cfxBase);u._cfxPop=null;u._cfxBase=null}else m.scale.setScalar(u._cfxBase*(0.3+0.7*(1-(1-k)*(1-k))+0.14*Math.sin(k*Math.PI)))}}}

 /* ---------------- camera: a tiny shake on big hits (off under reduced motion) ---------------- */
 var shk={t:0,dur:0,amp:0,on:false};
 function shake(px,ms){if(reducedMotion())return;shk.t=0;shk.dur=ms/1000;shk.amp=px}
 function applyShake(dt){if(shk.dur<=0||typeof camera==='undefined'||!camera)return;shk.t+=dt;
  if(shk.t>=shk.dur){shk.dur=0;return}var k=1-shk.t/shk.dur,w=LW||innerWidth,h=LH||innerHeight;
  camera.setViewOffset(w,h,Math.round((rnd()*2-1)*shk.amp*k),Math.round((rnd()*2-1)*shk.amp*k),w,h);shk.on=true}

 /* ---------------- GLB recoil: lean the body back off the blow (the child pivot only, never the logical position) ---------------- */
 function tickRecoil(dt){var npcs=(typeof WORLD!=='undefined'&&WORLD.npcs)||[];for(var i=0;i<npcs.length;i++){var o=npcs[i].mesh,s=o&&o.userData._cfx;if(!s||s.recoil<0)continue;
   s.recoil+=dt;var c=o.children[0],k=s.recoil/0.26;if(!c){s.recoil=-1;continue}
   if(k>=1||o.userData.death){c.rotation.x=0;s.recoil=-1;continue}c.rotation.x=-0.32*Math.sin(Math.PI*k)*(1-k*.3)}}

 /* ---------------- sounds: short synthesized WebAudio voices through the game's SFX master (obeys the SFX volume) ---------------- */
 var snd=(function(){
  function ac(){if(typeof Sfx==='undefined'||!Sfx.ensure||!(Sfx.vol>0))return null;try{return Sfx.ensure()}catch(e){return null}}
  function out(c){return Sfx._master||c.destination}
  function tone(c,type,f0,f1,t,dur,peak,att){try{var o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1&&f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t+dur);
   g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(peak,t+(att||.004));g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(out(c));o.start(t);o.stop(t+dur+.02)}catch(e){}}
  function nz(c,ft,f0,f1,q,t,dur,peak,att){if(!Sfx._noiseBuf)return;try{var s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=Sfx._noiseBuf;s.loop=true;
   f.type=ft;f.frequency.setValueAtTime(f0,t);if(f1&&f1!==f0)f.frequency.exponentialRampToValueAtTime(f1,t+dur);f.Q.value=q||1;
   g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(peak,t+(att||.004));g.gain.exponentialRampToValueAtTime(.0001,t+dur);
   s.connect(f);f.connect(g);g.connect(out(c));s.start(t,rnd()*0.8);s.stop(t+dur+.02)}catch(e){}}
  var last={};function gate(k,ms){var n=T*1000;if(last[k]!=null&&n-last[k]<ms&&n>=last[k])return false;last[k]=n;return true}
  return {
   swing:function(type,vol){var c=ac();if(!c||!gate('sw',40))return;var t=c.currentTime,v=vol||1;
    if(type==='stab'){nz(c,'bandpass',3200,1300,2.2,t,.11,.10*v,.02);tone(c,'triangle',900,500,t,.05,.015*v)}
    else if(type==='crush'){nz(c,'lowpass',1100,240,.9,t,.24,.15*v,.06);nz(c,'bandpass',600,220,1.4,t+.03,.18,.06*v,.04)}
    else nz(c,'bandpass',2400,480,1.3,t,.18,.12*v,.035)},
   snap:function(){var c=ac();if(!c||!gate('sn',60))return;var t=c.currentTime;nz(c,'highpass',3400,3400,1,t,.03,.07);nz(c,'highpass',2600,2600,1,t+.05,.03,.06);tone(c,'square',1100,480,t+.02,.05,.012)},
   hit:function(big,atype){var c=ac();if(!c||!gate('hit',30))return;var t=c.currentTime;
    tone(c,'sine',atype==='crush'?140:175,48,t,.15,.24);nz(c,'lowpass',1400,280,1,t,.09,.16);tone(c,'square',1500,520,t,.018,.035);
    if(atype==='slash')nz(c,'bandpass',3600,1800,3,t,.06,.05);
    if(big){tone(c,'sine',95,38,t+.01,.3,.22);nz(c,'lowpass',700,120,.8,t+.01,.22,.12,.01)}},
   hurt:function(big){var c=ac();if(!c||!gate('hurt',30))return;var t=c.currentTime;tone(c,'sine',120,46,t,.17,.22);nz(c,'lowpass',900,220,1,t,.1,.14);tone(c,'triangle',320,180,t+.01,.08,.03);if(big)tone(c,'sine',80,34,t,.32,.2)},
   block:function(){var c=ac();if(!c||!gate('blk',40))return;var t=c.currentTime;tone(c,'triangle',860,520,t,.05,.09);nz(c,'bandpass',2600,2000,4,t,.04,.07);tone(c,'triangle',640,420,t+.028,.04,.05)},
   bow:function(){var c=ac();if(!c||!gate('bow',40))return;var t=c.currentTime;tone(c,'triangle',250,142,t,.2,.11);tone(c,'sine',500,300,t,.12,.04);nz(c,'highpass',4200,2400,1,t,.06,.06);nz(c,'bandpass',1800,700,1.5,t+.02,.16,.05,.02)},
   arrowHit:function(ok){var c=ac();if(!c)return;var t=c.currentTime;if(ok){nz(c,'bandpass',1150,340,2,t,.08,.17);tone(c,'sine',240,88,t,.1,.14);tone(c,'square',900,300,t,.02,.02)}else{nz(c,'highpass',2600,1500,1,t,.035,.07);tone(c,'sine',180,90,t,.06,.05)}},
   charge:function(){var c=ac();if(!c||!gate('chg',60))return;var t=c.currentTime;nz(c,'bandpass',480,2600,3,t,.46,.075,.22);tone(c,'sine',330,700,t,.45,.03,.2);tone(c,'sine',495,1050,t+.05,.4,.018,.18)},
   release:function(wind){var c=ac();if(!c)return;var t=c.currentTime;if(wind){nz(c,'bandpass',2000,650,1.2,t,.28,.11,.02);nz(c,'highpass',5200,3000,1,t,.12,.03)}else{nz(c,'bandpass',1400,500,1.2,t,.24,.09,.02);tone(c,'sine',600,260,t,.18,.04)}},
   magicHit:function(big){var c=ac();if(!c)return;var t=c.currentTime;nz(c,'highpass',3200,900,1,t,.22,.11);tone(c,'sine',760,210,t,.2,.08);tone(c,'sine',130,58,t,.14,.12);if(big)nz(c,'lowpass',900,150,.8,t,.3,.1)},
   splash:function(){var c=ac();if(!c)return;var t=c.currentTime;nz(c,'bandpass',2600,650,.9,t,.36,.08,.02);tone(c,'sine',320,170,t,.22,.03);nz(c,'highpass',6000,4000,1,t,.1,.02)},
   death:function(npc){var c=ac();if(!c)return;var t=c.currentTime,small=npc&&npc.t&&(npc.t.size||1)<1;
    try{var o=c.createOscillator(),f=c.createBiquadFilter(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(small?420:230,t);o.frequency.exponentialRampToValueAtTime(small?110:62,t+.45);
     f.type='lowpass';f.frequency.value=small?1500:850;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.07,t+.03);g.gain.exponentialRampToValueAtTime(.0001,t+.5);o.connect(f);f.connect(g);g.connect(out(c));o.start(t);o.stop(t+.55)}catch(e){}
    if(small)nz(c,'highpass',3000,1800,1,t,.08,.04)},
   thud:function(){var c=ac();if(!c||!gate('thd',80))return;var t=c.currentTime;tone(c,'sine',120,44,t,.2,.18);nz(c,'lowpass',520,140,.8,t,.14,.1)}
  }})();

 /* ---------------- XP drops by the minimap (pooled rows; UI.xpDrop stays the single funnel the XP tracker hooks) ---------------- */
 var xpRows=[],xpHost=null,xpBurstFrame=-1,xpBurstN=0;
 function xpHostEl(){if(xpHost&&xpHost.isConnected)return xpHost;xpHost=document.getElementById('xp-drops');
  if(!xpHost){xpHost=document.createElement('div');xpHost.id='xp-drops';document.body.appendChild(xpHost)}
  // keep the id so the "Hide XP drops" declutter toggle (#xp-drops{display:none!important}) still applies
  xpHost.style.cssText='position:fixed;left:0;top:0;width:0;height:0;transform:none;z-index:40;pointer-events:none;overflow:visible;display:block;';return xpHost}
 function xpDrop(skill,amt){
  if(typeof document==='undefined')return;var host=xpHostEl(),r=null,i;
  for(i=0;i<xpRows.length;i++)if(!xpRows[i].on){r=xpRows[i];break}
  if(!r){if(xpRows.length>=16){r=xpRows[0];for(i=1;i<xpRows.length;i++)if(xpRows[i].t0<r.t0)r=xpRows[i]}
   else{var el=document.createElement('div');el.className='xp-drop cfx-xp';el.style.cssText='position:fixed;top:0;white-space:nowrap;will-change:transform,opacity;display:none;';
    var im=document.createElement('img');im.alt='';im.style.cssText='width:18px;height:18px;vertical-align:middle;margin-right:3px;';im.onerror=function(){this.style.visibility='hidden'};
    var tx=document.createElement('span');el.appendChild(im);el.appendChild(tx);host.appendChild(el);r={el:el,img:im,txt:tx,on:false,t0:0,skill:'',x:0,y0:0,y1:0};xpRows.push(r)}}
  if(r.el.parentNode!==host)host.appendChild(r.el);
  if(r.skill!==skill){r.skill=skill;r.img.style.visibility='visible';r.img.src='assets/icons/ui/v3/skills18/'+String(skill).toLowerCase()+'.png?v=1'}
  var n=Math.round(amt);r.txt.textContent=(n>0?'+':'')+n;
  if(xpBurstFrame!==frame){xpBurstFrame=frame;xpBurstN=0}var row=xpBurstN++;
  // anchor: just left of the minimap, rising from its lower edge to its top (follows the responsive layout)
  var mf=document.getElementById('minimap-frame'),ob=document.getElementById('orbs'),rc=mf&&mf.getBoundingClientRect?mf.getBoundingClientRect():null,ro=ob&&ob.getBoundingClientRect?ob.getBoundingClientRect():null;
  if(rc&&rc.width>0){var left=rc.left;if(ro&&ro.width>0&&ro.left<left&&ro.top<rc.bottom)left=ro.left;
   r.x=Math.round(innerWidth-left+12);r.y0=rc.top+rc.height*0.84;r.y1=rc.top+2}else{r.x=Math.round(innerWidth*0.5);r.y0=150;r.y1=70}
  r.y0+=row*20;r.y1+=row*20;r.on=true;r.t0=T;r.el.style.right=r.x+'px';r.el.style.display='block';placeXp(r,0);
 }
 function placeXp(r,k){r.el.style.transform='translate3d(0,'+Math.round(r.y0+(r.y1-r.y0)*k)+'px,0)';r.el.style.opacity=k<0.72?'1':String(Math.max(0,(1-k)/0.28))}
 function tickXp(){for(var i=0;i<xpRows.length;i++){var r=xpRows[i];if(!r.on)continue;var k=(T-r.t0)/XP_LIFE;if(k>=1){r.on=false;r.el.style.display='none';continue}placeXp(r,k)}}

 /* ---------------- frame hooks ---------------- */
 function update(dt){
  if(!init())return;frame++;T+=dt;var i;
  for(i=0;i<evs.length;i++){var e=evs[i];if(e.on&&e.fireAt<=T)present(e)}
  for(i=0;i<fxs.length;i++){var f=fxs[i];if(!f.on)continue;
   if(!f.dst||(!f.dst.parent&&!isPlayer(f.dst))||!f.src){if(f.state===1)landFx(f);else dropFx(f);continue}
   if(f.state===0&&T>=f.release)releaseFx(f);if(f.state===1)flyFx(f)}
  for(i=0;i<splats.length;i++)if(splats[i].on&&T-splats[i].t0>=SPLAT_LIFE)splats[i].on=false;
  var pl=typeof player!=='undefined'&&player;if(pl&&pl.userData&&pl.userData._cfx)pl.userData._cfx.trailT+=dt;
  var npcs=(typeof WORLD!=='undefined'&&WORLD.npcs)||[];for(i=0;i<npcs.length;i++){var s=npcs[i].mesh&&npcs[i].mesh.userData._cfx;if(s)s.trailT+=dt}
  tickRecoil(dt);tickParts(dt);tickDying();tickDrops();tickXp();applyShake(dt);
 }
 // makeHPBar's replacement: the bar is drawn on the 2D layer, so the 3D sprite becomes an empty placeholder with the same API
 function hpBar(){var o=new THREE.Object3D();o.visible=false;o.name='cfx-hpbar';return {spr:o,frac:1,draw:function(fr){this.frac=fr}}}
 function stats(){var a=0,b=0,c=0,d=0,i;for(i=0;i<splats.length;i++)if(splats[i].on)a++;for(i=0;i<parts.length;i++)if(parts[i].on)b++;for(i=0;i<fxs.length;i++)if(fxs[i].on)c++;for(i=0;i<evs.length;i++)if(evs[i].on)d++;
  var x=0;for(i=0;i<xpRows.length;i++)if(xpRows[i].on)x++;
  return {t:+T.toFixed(3),splats:a,particles:b,particlePool:parts.length,projectiles:c,fxPool:fxs.length,arrowPool:arrows.length,pending:d,eventPool:evs.length,xpRows:x,xpPool:xpRows.length,shaking:shk.dur>0,reducedMotion:reducedMotion()}}
 function qaSplats(){var out=[];for(var i=0;i<splats.length;i++){var s=splats[i];if(s.on)out.push({dmg:s.dmg,kind:['hit','miss','max'][s.kind],slot:s.slot,age:+(T-s.t0).toFixed(3),player:isPlayer(s.obj),name:s.obj.name||''})}return out}
 // QA read-outs (never used by the game): the bar value a body shows right now, and whether the camera is shaking
 function qaBar(o){var s=o&&o.userData&&o.userData._cfx;return +barFrac(o,s).toFixed(4)}
 return {update:update,draw:draw,hit:hit,melee:melee,npcMelee:npcMelee,launch:launch,expectProjectile:expectProjectile,onKill:onKill,xpDrop:xpDrop,hpBar:hpBar,
  impactTime:impactTime,speedFor:speedFor,reducedMotion:reducedMotion,stats:stats,qaSplats:qaSplats,qaBar:qaBar};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=CombatFX;
