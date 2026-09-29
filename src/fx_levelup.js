/* ================= LEVEL-UP FIREWORKS (presentation only) — owner request 2026-09-29 =================
 * Owner: "When a level is achieved in whatever skill, I want very subtle, small fireworks to come around the character,
 * just like old school RuneScape ... a very cozy firework burst around the character" (no screen flicker; a new sound).
 * Our own design in the spirit of the 2004 level-up fireworks:
 *   five little rockets rise from a ring around the adventurer's feet, one after another (~0.1 s apart), each trailing a
 *   few embers; at about body height (the adventurer's own height, measured) each one bursts softly: a small flare and
 *   eight twinkling stars that drift out ~half a tile, sink a little and fade, with a few glitter specks falling after.
 *   The whole show is ~2.6 s, follows the adventurer if they walk on, never leaves their surroundings, never takes a click
 *   (no raycast) and never touches the screen (no overlay). Reduced motion (the login setting or the OS preference):
 *   no rockets; the stars simply twinkle in place around the adventurer and fade.
 * Art: every spark is a cell of assets/textures/fx/levelup_sparks_v1.png, modelled and rendered in Blender
 *   (tools/blender/build_fx_sprites_v1.py: twinkle, burst star, ember, flare; white facets tinted per rocket here).
 * Drawing: one THREE.Points (one draw call) with a small shader: per-spark size in world units (scaled by the target the
 *   world is being drawn into, so ClassicPixels' low-resolution look options get the same world size in chunky pixels),
 *   colour, fade, atlas cell and spin.
 * Sound: sound(ctx, dest) is the level-up cue Sfx.level() plays (a soft whoosh up, two soft pops and a little crackle, a
 *   small warm two-note chime), synthesized with WebAudio and scheduled on the audio clock; quiet beside the music.
 * HARD RULE (as src/combat_fx.js): presentation only, and never Math.random (a private LCG drives every scatter), so a
 *   level-up inside a fight never shifts the combat rolls of a seeded replay.
 * Wiring: Events 'levelUp' -> burst(player); animate() -> update(dt); Sfx.level() -> sound(). */
var LevelUpFX=(function(){
 'use strict';
 var TEX_URL='assets/textures/fx/levelup_sparks_v1.png';
 var F_TWINKLE=0,F_BURST=1,F_EMBER=2,F_FLARE=3;
 var MAX=320,LIFE_CAP=6;                       // pool size; a burst older than this (a hidden tab) is dropped whole
 var PALETTE=[0xffd24a,0xff8f6e,0x9fe27c,0x7fc8ff,0xd8a6ff];   // gold, rose, meadow green, sky, lilac
 var seed=0x1e7e1a;function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}   // never Math.random
 var T=0,parts=[],bursts=[],obj=null,geo=null,mat=null,tex=null,A=null,uni=null,V=null,shown=0,spawned=0,finished=0;

 /* ---------------- settings ---------------- */
 function reducedMotion(){
  if(typeof CombatFX!=='undefined'&&CombatFX.reducedMotion)try{return !!CombatFX.reducedMotion()}catch(e){}
  var v=false;try{v=localStorage.getItem('cr_login_reduced_motion')==='1'}catch(e){}
  try{if(!v&&typeof window!=='undefined'&&window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)v=true}catch(e){}
  return v;
 }
 function rgb(hex,w){var r=(hex>>16&255)/255,g=(hex>>8&255)/255,b=(hex&255)/255;w=w||0;return [r+(1-r)*w,g+(1-g)*w,b+(1-b)*w]}

 /* ---------------- the Points object (made on the first burst) ---------------- */
 var VS=['attribute vec3 aColor;','attribute float aAlpha;','attribute float aSize;','attribute float aFrame;','attribute float aRot;',
  'uniform float uScale;','varying vec3 vColor;','varying float vAlpha;','varying float vFrame;','varying float vRot;',
  'void main(){','  vColor=aColor;vAlpha=aAlpha;vFrame=aFrame;vRot=aRot;',
  '  vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;',
  '  gl_PointSize=aSize*uScale/max(0.05,-mv.z);','}'].join('\n');
 var FS=['uniform sampler2D uMap;','varying vec3 vColor;','varying float vAlpha;','varying float vFrame;','varying float vRot;',
  'void main(){',
  '  vec2 p=gl_PointCoord-0.5;float c=cos(vRot),s=sin(vRot);p=vec2(c*p.x-s*p.y,s*p.x+c*p.y)+0.5;',
  '  if(p.x<0.0||p.x>1.0||p.y<0.0||p.y>1.0)discard;',
  '  float col=mod(vFrame,2.0),row=floor(vFrame*0.5+0.01);',
  '  vec2 uv=vec2((col+clamp(p.x,0.01,0.99))*0.5,1.0-(row+clamp(p.y,0.01,0.99))*0.5);',   // atlas cell; gl_PointCoord runs down
  '  vec4 t=texture2D(uMap,uv);float a=t.a*vAlpha;if(a<0.02)discard;',
  '  gl_FragColor=vec4(t.rgb*vColor,a);','}'].join('\n');
 function ensure(){
  if(obj)return true;if(typeof THREE==='undefined'||typeof scene==='undefined'||!scene)return false;
  V=new THREE.Vector3();
  geo=new THREE.BufferGeometry();
  A={pos:new Float32Array(MAX*3),col:new Float32Array(MAX*3),alpha:new Float32Array(MAX),size:new Float32Array(MAX),frame:new Float32Array(MAX),rot:new Float32Array(MAX)};
  function attr(name,arr,n){var b=new THREE.BufferAttribute(arr,n);if(b.setUsage&&THREE.DynamicDrawUsage)b.setUsage(THREE.DynamicDrawUsage);geo.setAttribute(name,b);return b}
  attr('position',A.pos,3);attr('aColor',A.col,3);attr('aAlpha',A.alpha,1);attr('aSize',A.size,1);attr('aFrame',A.frame,1);attr('aRot',A.rot,1);
  geo.setDrawRange(0,0);
  try{tex=new THREE.TextureLoader().load(TEX_URL)}catch(e){tex=null}
  uni={uMap:{value:tex},uScale:{value:400}};
  mat=new THREE.ShaderMaterial({uniforms:uni,vertexShader:VS,fragmentShader:FS,transparent:true,depthWrite:false,depthTest:true});
  mat.name='fx-levelup-sparks';mat.userData.lookV4='fx';
  obj=new THREE.Points(geo,mat);obj.name='fx-levelup-fireworks';obj.frustumCulled=false;obj.renderOrder=6;obj.visible=false;
  obj.raycast=function(){};                                   // never takes a click (the pick rays pass straight through)
  // world-unit sizes in the pixels of the target being drawn (ClassicPixels draws the world into a smaller target)
  var sz=new THREE.Vector2();
  obj.onBeforeRender=function(r,sc,cam){var rt=r.getRenderTarget&&r.getRenderTarget(),h=rt?rt.height:(r.getDrawingBufferSize?r.getDrawingBufferSize(sz).y:720);
   var e=cam&&cam.projectionMatrix&&cam.projectionMatrix.elements;uni.uScale.value=h*0.5*(e?e[5]:2.9)};
  scene.add(obj);return true;
 }

 /* ---------------- particles ---------------- */
 function alloc(){for(var i=0;i<parts.length;i++)if(!parts[i].on)return parts[i];
  if(parts.length<MAX){var p={on:false};parts.push(p);return p}
  var old=parts[0];for(var j=1;j<parts.length;j++)if(parts[j].t0<old.t0)old=parts[j];return old}
 // spawn(burst, local x/y/z, frame, size0, size1, life, colour [r,g,b], alpha)
 function spawn(b,x,y,z,frame,s0,s1,life,c,a0){var p=alloc();p.on=true;p.b=b;p.t0=T;p.age=0;p.life=life;p.x=x;p.y=y;p.z=z;p.vx=0;p.vy=0;p.vz=0;
  p.frame=frame;p.s0=s0;p.s1=s1;p.c=c;p.a0=a0===undefined?1:a0;p.grav=0;p.drag=0;p.rot=rnd()*6.283;p.spin=0;p.tw=0;p.tph=rnd()*6.283;p.fade=.65;p.held=false;spawned++;return p}
 function height(o){   // the adventurer's height from their own model (clamped), for "about body height"
  try{if(typeof THREE==='undefined'||!THREE.Box3)return 1.55;var bx=new THREE.Box3().setFromObject(o);var h=bx.max.y-bx.min.y;return Number.isFinite(h)&&h>.5?Math.min(2.4,Math.max(1,h)):1.55}catch(e){return 1.55}}
 function anchorPos(b,out){var o=b.anchor;if(o&&(o.parent||o===(typeof player!=='undefined'&&player))){if(o.parent&&o.parent.type==='Scene')out.set(o.position.x,o.position.y,o.position.z);else if(o.getWorldPosition)o.getWorldPosition(out);else out.set(o.position.x,o.position.y,o.position.z);b.last={x:out.x,y:out.y,z:out.z}}
  else if(b.last)out.set(b.last.x,b.last.y,b.last.z);return out}

 /* ---------------- a burst: five rockets round the feet, popping at about body height ---------------- */
 function burst(o,opts){
  o=o||(typeof player!=='undefined'?player:null);if(!o||!ensure())return null;opts=opts||{};
  var live=0;for(var i=0;i<bursts.length;i++)if(bursts[i].anchor===o)live++;
  if(live>=2)return null;                                     // several levels at once (a quest reward): two bursts at most
  var H=height(o),n=5,start=Math.floor(rnd()*PALETTE.length),reduced=opts.reduced!==undefined?!!opts.reduced:reducedMotion();
  var b={anchor:o,t:0,born:typeof performance!=='undefined'?performance.now():0,H:H,rockets:[],reduced:reduced,last:null};
  anchorPos(b,V);
  for(var k=0;k<n;k++){var a=k*6.2832/n+rnd()*.5;
   b.rockets.push({a:a,r0:.42+rnd()*.1,delay:k*.1+rnd()*.05,rise:.46+rnd()*.1,apex:H*(.76+rnd()*.26),col:PALETTE[(start+k)%PALETTE.length],fired:false,popped:false,head:null,trail:0})}
  bursts.push(b);return b;
 }
 function pop(b,rk,x,y,z){
  var c=rgb(rk.col),cw=rgb(rk.col,.55),cg=rgb(rk.col,.35),i,p;
  if(!b.reduced){p=spawn(b,x,y,z,F_FLARE,.34,.1,.24,cw,.95);p.fade=.2}
  for(i=0;i<8;i++){var ang=i*.7854+rnd()*.4,el=(rnd()-.35)*1.1,sp=b.reduced?.12+rnd()*.08:.8+rnd()*.3;
   p=spawn(b,x,y,z,i%2?F_BURST:F_TWINKLE,.12,.05,1.05+rnd()*.45,i%3===2?cw:c,1);
   p.vx=Math.cos(ang)*sp;p.vy=el*sp*.8+(b.reduced?0:.25);p.vz=Math.sin(ang)*sp;p.drag=2.4;p.grav=b.reduced?.05:.55;p.spin=(rnd()<.5?-1:1)*(1.5+rnd()*1.5);p.tw=16+rnd()*8}
  for(i=0;i<4;i++){p=spawn(b,x,y,z,F_EMBER,.055,.03,1.4+rnd()*.4,cg,.9);
   p.vx=(rnd()-.5)*.5;p.vy=-rnd()*.1;p.vz=(rnd()-.5)*.5;p.grav=.35;p.drag=1.2;p.tw=22+rnd()*6}
 }
 function stepRocket(b,rk,dt){
  if(!rk.fired){if(b.t<rk.delay)return;rk.fired=true;
   if(b.reduced){rk.popped=true;pop(b,rk,Math.cos(rk.a)*(rk.r0+.1),rk.apex,Math.sin(rk.a)*(rk.r0+.1));return}
   rk.head=spawn(b,Math.cos(rk.a)*rk.r0,.3,Math.sin(rk.a)*rk.r0,F_EMBER,.11,.09,rk.rise+.05,rgb(rk.col,.45),1);rk.head.held=true}
  if(rk.popped)return;
  var u=Math.min(1,(b.t-rk.delay)/rk.rise),e=1-(1-u)*(1-u),r=rk.r0+.1*u,w=Math.sin(u*9+rk.a)*.03;
  var x=Math.cos(rk.a)*r+w,y=.3+(rk.apex-.3)*e,z=Math.sin(rk.a)*r-w,h=rk.head;
  if(h&&h.on&&h.b===b){h.x=x;h.y=y;h.z=z}
  rk.trail-=dt;if(rk.trail<=0&&u<.97){rk.trail=.035;var t=spawn(b,x,y-.02,z,F_EMBER,.07,.02,.28+rnd()*.08,rgb(rk.col,.2),.8);t.vy=-.25;t.drag=2;t.fade=.3}
  if(u>=1){rk.popped=true;if(h&&h.b===b)h.on=false;pop(b,rk,x,y,z)}
 }

 /* ---------------- frame hook ---------------- */
 function update(dt){
  if(!obj)return;dt=Math.min(.1,Math.max(0,dt||0));T+=dt;
  var now=typeof performance!=='undefined'?performance.now():0,i,j;
  for(i=bursts.length-1;i>=0;i--){var b=bursts[i];b.t+=dt;
   if(now&&b.born&&now-b.born>LIFE_CAP*1000){for(j=0;j<parts.length;j++)if(parts[j].b===b)parts[j].on=false;bursts.splice(i,1);finished++;continue}
   for(j=0;j<b.rockets.length;j++)stepRocket(b,b.rockets[j],dt);
   var alive=false;for(j=0;j<parts.length;j++)if(parts[j].on&&parts[j].b===b){alive=true;break}
   if(!alive&&b.rockets.every(function(r){return r.popped})){bursts.splice(i,1);finished++}}
  var n=0,ax=0,ay=0,az=0,lastB=null;
  for(i=0;i<parts.length;i++){var p=parts[i];if(!p.on)continue;
   p.age+=dt;if(p.age>=p.life){p.on=false;continue}
   if(!p.held){p.vy-=p.grav*dt;if(p.drag){var k=Math.max(0,1-p.drag*dt);p.vx*=k;p.vy*=k;p.vz*=k}p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt}
   p.rot+=p.spin*dt;
   if(p.b!==lastB){lastB=p.b;anchorPos(p.b,V);ax=V.x;ay=V.y;az=V.z}
   var q=p.age/p.life,al=p.a0*(q<p.fade?1:(1-q)/(1-p.fade));
   if(p.tw&&q>.2)al*=.55+.45*Math.sin(p.age*p.tw+p.tph);
   A.pos[n*3]=ax+p.x;A.pos[n*3+1]=ay+p.y;A.pos[n*3+2]=az+p.z;
   A.col[n*3]=p.c[0];A.col[n*3+1]=p.c[1];A.col[n*3+2]=p.c[2];
   A.alpha[n]=Math.max(0,al);A.size[n]=p.s0+(p.s1-p.s0)*q;A.frame[n]=p.frame;A.rot[n]=p.rot;n++}
  shown=n;geo.setDrawRange(0,n);obj.visible=n>0;
  if(n){var at=geo.attributes;at.position.needsUpdate=at.aColor.needsUpdate=at.aAlpha.needsUpdate=at.aSize.needsUpdate=at.aFrame.needsUpdate=at.aRot.needsUpdate=true}
 }

 /* ---------------- the level-up sound: a soft firework, on the audio clock ---------------- */
 var noiseBufs=[];
 function noiseFor(ctx){for(var i=0;i<noiseBufs.length;i++)if(noiseBufs[i].ctx===ctx)return noiseBufs[i].buf;
  var len=Math.floor(ctx.sampleRate*.6),buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);for(var j=0;j<len;j++)d[j]=rnd()*2-1;
  noiseBufs.push({ctx:ctx,buf:buf});if(noiseBufs.length>3)noiseBufs.shift();return buf}
 function sound(ctx,dest){
  if(!ctx)return null;dest=dest||ctx.destination;var t0=ctx.currentTime+.02,buf=noiseFor(ctx),nodes=0;
  function env(g,t,att,peak,dec){g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(peak,t+att);g.gain.exponentialRampToValueAtTime(.0001,t+att+dec)}
  function hiss(t,att,dec,type,f0,f1,q,peak){var s=ctx.createBufferSource();s.buffer=buf;s.loop=true;var f=ctx.createBiquadFilter();f.type=type;
   f.frequency.setValueAtTime(f0,t);if(f1)f.frequency.exponentialRampToValueAtTime(f1,t+att+dec);f.Q.value=q;var g=ctx.createGain();env(g,t,att,peak,dec);
   s.connect(f);f.connect(g);g.connect(dest);s.start(t,rnd()*.4);s.stop(t+att+dec+.05);nodes+=3}
  function tone(t,freq,type,att,dec,peak,f1){var o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(freq,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+att+dec);
   var g=ctx.createGain();env(g,t,att,peak,dec);o.connect(g);g.connect(dest);o.start(t);o.stop(t+att+dec+.05);nodes+=2}
  hiss(t0,.34,.12,'bandpass',320,2400,1.3,.035);                                // the whoosh up
  hiss(t0+.47,.004,.1,'lowpass',1500,480,.7,.05);tone(t0+.47,170,'sine',.004,.12,.035,80);   // pop
  hiss(t0+.63,.004,.09,'lowpass',1150,420,.7,.035);tone(t0+.63,150,'sine',.004,.11,.025,75);  // a softer second pop
  for(var i=0;i<10;i++)hiss(t0+.52+rnd()*.62,.002,.018+rnd()*.02,'highpass',3200+rnd()*2400,0,.8,.007+rnd()*.009);   // crackle
  // the chime: a small warm bell, A5 then C#6 (a fundamental, a quiet octave, a brief inharmonic shimmer)
  [[880,.55],[1108.73,.62]].forEach(function(nt){tone(t0+nt[1],nt[0],'sine',.012,1.2,.03);tone(t0+nt[1],nt[0]*2,'sine',.01,.6,.009);tone(t0+nt[1],nt[0]*2.76,'sine',.006,.25,.004)});
  last={at:t0,nodes:nodes,duration:1.9};return last;
 }
 var last=null;

 /* ---------------- wiring ---------------- */
 if(typeof Events!=='undefined'&&Events.on)Events.on('levelUp',function(){try{if(typeof player!=='undefined'&&player)burst(player)}catch(e){}});
 function stats(){var on=0;for(var i=0;i<parts.length;i++)if(parts[i].on)on++;
  return {bursts:bursts.length,particles:on,shown:shown,pool:parts.length,spawned:spawned,finished:finished,t:+T.toFixed(3),hasObject:!!obj,inScene:!!(obj&&obj.parent),visible:!!(obj&&obj.visible),
   texture:TEX_URL,textureLoaded:!!(tex&&tex.image),lastSound:last}}
 return {burst:burst,update:update,sound:sound,stats:stats,reducedMotion:reducedMotion,TEX_URL:TEX_URL,PALETTE:PALETTE};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=LevelUpFX;
