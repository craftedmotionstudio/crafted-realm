/* ================= COZY FIRES (owner review 2026-09-29) =================
 * Owner: "The fires move a little bit fast. It would be nice to have a slower, more cozy fire, with occasionally a spark.
 * Just a very cozy fire." One pass over every fire in the game:
 *  - slower and softer flames:
 *     - lit logs (every WORLD.fires campfire, the island's Blender campfire included): the old flicker was one sine at
 *       3.2 Hz, +-25% height; now three slow sines (about 0.5, 0.95 and 1.45 Hz), about +-9% height, +-3% width, a slight lean,
 *       and the fire's light breathes with it (+-7%);
 *     - every Blender flicker clip (the hearths of the Guide House, the bakehouse and the Quest Lodge, the bakehouse oven,
 *       the cavern furnace's glow, the cellar wall torches): played at 0.5x speed and at 0.65 weight (the clip's swing
 *       blended toward the flame's rest shape), wherever it is created (AnimationMixer.clipAction, below);
 *     - the cavern wall torches (a Blender curve on their brightness, src/holm_island_anim.js): sampled at 0.5x, softened;
 *  - now and then a small ember drifts up from a fire (one every few seconds per fire near the adventurer; a Blender-rendered
 *    ember cell of assets/textures/fx/levelup_sparks_v1.png, tinted), all fires in one THREE.Points: one draw call;
 *  - a quiet crackle loop by any fire (Sfx fire_loop, src/sfx_recipes.js): one looping voice for the whole world, its level
 *    following the nearest fire (full within 1.5 tiles, gone by 7).
 * Performance stays flat: a fixed pool of 48 embers, a handful of fire sources, one draw call, one audio voice.
 * Presentation only, never Math.random: a private LCG; no gameplay, timing or walk-graph change.
 * Off switch for comparison: ?cozyFire=0 (the old flicker, the old clip speeds, no embers, no crackle). */
var CozyFire=(function(){
 'use strict';
 var qs=typeof location!=='undefined'&&location.search?new URLSearchParams(location.search):null;
 var enabled=!(qs&&qs.get('cozyFire')==='0');
 var FLICKER=/Flicker/i,CLIP_RATE=.5,CLIP_WEIGHT=.65,TORCH_RATE=.5,TORCH_SOFT=.6;
 var seed=0xc02f1e;function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
 var T=0,clips=[],sources=null,srcAge=0,loop=null,loopGain=0,stats={clipsSlowed:0,embersSpawned:0,sources:0,campfires:0,loopGain:0};

 /* ---------------- every Blender flicker clip: slower and softer, wherever a mixer makes it ---------------- */
 function wrapMixer(){
  if(!enabled||typeof THREE==='undefined'||!THREE.AnimationMixer||THREE.AnimationMixer.prototype.__cozy)return;
  var P=THREE.AnimationMixer.prototype,orig=P.clipAction;P.__cozy=true;
  P.clipAction=function(clip,root){var a=orig.apply(this,arguments);
   try{var c=typeof clip==='string'?(a&&a.getClip&&a.getClip()):clip;if(a&&c&&FLICKER.test(c.name||'')&&!a.__cozy){a.__cozy=true;a.timeScale=CLIP_RATE;a.weight=CLIP_WEIGHT;
    clips.push({a:a,clip:c,root:root||this.getRoot()});stats.clipsSlowed++;sources=null}}catch(e){}
   return a};
 }
 wrapMixer();

 /* ---------------- the lit-log flicker: three slow sines, per fire phases ---------------- */
 function flicker(f,t){var u=f.userData,fl=u.flame;if(!fl)return;
  if(!u._cozy){u._cozy={ph:rnd()*6.283,sx:fl.scale.x,sy:fl.scale.y,sz:fl.scale.z,rx:fl.rotation.x,rz:fl.rotation.z}}
  var c=u._cozy,p=c.ph;
  if(!enabled){fl.scale.y=1+Math.sin(performance.now()*0.02)*0.25;return}
  var h=.1*(.5*Math.sin(3.3*t+p)+.32*Math.sin(5.9*t+p*1.7)+.18*Math.sin(9.1*t+p*2.3)),w=.03*Math.sin(4.1*t+p*.6);
  fl.scale.set(c.sx*(1+w),c.sy*(1+h),c.sz*(1-w*.6));fl.rotation.x=c.rx+.035*Math.sin(1.3*t+p);fl.rotation.z=c.rz+.03*Math.sin(1.7*t+p*1.3);
  var L=u.light;if(L&&!(L.userData&&L.userData.free)){var b=L.userData.base||.85;L.intensity=b*(1+.07*Math.sin(2.1*t+p)+.03*Math.sin(4.3*t+p))}}

 /* ---------------- where the fires are (for the embers and the crackle) ---------------- */
 var V=null;
 function worldPos(o){if(!V)V=new THREE.Vector3();o.updateMatrixWorld&&o.updateMatrixWorld(true);var b=new THREE.Box3().setFromObject(o);if(b.isEmpty())return null;var c=b.getCenter(new THREE.Vector3());return {x:c.x,y:b.max.y-.05,z:c.z,top:b.max.y}}
 function collect(){var out=[],seen=[];
  function add(p,kind,rate){if(!p||!isFinite(p.x))return;for(var i=0;i<seen.length;i++)if(Math.hypot(seen[i].x-p.x,seen[i].z-p.z)<.8&&Math.abs(seen[i].y-p.y)<1.5)return;seen.push(p);out.push({x:p.x,y:p.y,z:p.z,kind:kind,rate:rate||1,t:.5+rnd()*2})}
  // Blender flicker clips: the nodes each clip moves, one fire per clip (a hearth's three tongues are one fire)
  clips.forEach(function(k){if(!k.root||!k.root.parent)return;var box=new THREE.Box3(),hit=false;
   k.clip.tracks.forEach(function(tr){var n=k.root.getObjectByName(tr.name.split('.')[0]);if(n){n.updateMatrixWorld(true);var b=new THREE.Box3().setFromObject(n);if(!b.isEmpty()){box.union(b);hit=true}}});
   if(!hit)return;var c=box.getCenter(new THREE.Vector3());add({x:c.x,y:box.max.y-.05,z:c.z},/torch/i.test(k.clip.name)?'torch':'hearth',/torch/i.test(k.clip.name)?.4:1)});
  // merged flame meshes (the cavern's wall torches; the Keep's torches and hearths, tagged torch-flame / hearth-flame): each flame is a cluster of its vertices
  if(typeof scene!=='undefined'&&scene)[['Cavern_TorchFlame','torch',.4],['Keep_Shell_TorchFlames','torch',.4],['Keep_Upper_Shell_TorchFlames','torch',.4],['Keep_Furnishing_HearthFire','hearth',1],['Keep_Upper_Furnishing_HearthFire','hearth',1]].forEach(function(src){var tf=scene.getObjectByName(src[0]);if(tf)tf.traverse(function(m){if(!m.isMesh||!m.geometry||!m.geometry.attributes.position)return;m.updateMatrixWorld(true);
   var pa=m.geometry.attributes.position,v=new THREE.Vector3(),cells={};for(var i=0;i<pa.count;i+=3){v.fromBufferAttribute(pa,i).applyMatrix4(m.matrixWorld);var key=Math.round(v.x/1.2)+','+Math.round(v.z/1.2);
    var c=cells[key]||(cells[key]={x:0,z:0,n:0,top:-1e9});c.x+=v.x;c.z+=v.z;c.n++;if(v.y>c.top)c.top=v.y}
   Object.keys(cells).forEach(function(k){var c=cells[k];add({x:c.x/c.n,y:c.top,z:c.z/c.n},src[1],src[2])})})})
  stats.sources=out.length;return out}

 /* ---------------- embers: one Points, a fixed pool ---------------- */
 var MAX=48,parts=[],obj=null,geo=null,A=null,uni=null,TEX='assets/textures/fx/levelup_sparks_v1.png';
 var VS=['attribute float aAlpha;','attribute float aSize;','attribute vec3 aColor;','uniform float uScale;','varying float vAlpha;','varying vec3 vColor;',
  'void main(){vAlpha=aAlpha;vColor=aColor;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=aSize*uScale/max(0.05,-mv.z);}'].join('\n');
 var FS=['uniform sampler2D uMap;','varying float vAlpha;','varying vec3 vColor;',
  'void main(){vec2 p=gl_PointCoord;vec2 uv=vec2(clamp(p.x,0.01,0.99)*0.5,1.0-(1.0+clamp(p.y,0.01,0.99))*0.5);vec4 t=texture2D(uMap,uv);float a=t.a*vAlpha;if(a<0.03)discard;gl_FragColor=vec4(t.rgb*vColor,a);}'].join('\n');
 function ensure(){if(obj)return true;if(typeof THREE==='undefined'||typeof scene==='undefined'||!scene)return false;
  geo=new THREE.BufferGeometry();A={pos:new Float32Array(MAX*3),alpha:new Float32Array(MAX),size:new Float32Array(MAX),col:new Float32Array(MAX*3)};
  function attr(n,a,k){var b=new THREE.BufferAttribute(a,k);if(b.setUsage&&THREE.DynamicDrawUsage)b.setUsage(THREE.DynamicDrawUsage);geo.setAttribute(n,b)}
  attr('position',A.pos,3);attr('aAlpha',A.alpha,1);attr('aSize',A.size,1);attr('aColor',A.col,3);geo.setDrawRange(0,0);
  var tex=null;try{tex=new THREE.TextureLoader().load(TEX)}catch(e){}
  uni={uMap:{value:tex},uScale:{value:400}};
  var mat=new THREE.ShaderMaterial({uniforms:uni,vertexShader:VS,fragmentShader:FS,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});mat.name='cozy-fire-embers';mat.userData.lookV4='fx';
  obj=new THREE.Points(geo,mat);obj.name='cozy-fire-embers';obj.frustumCulled=false;obj.renderOrder=6;obj.raycast=function(){};obj.visible=false;
  var sz=new THREE.Vector2();obj.onBeforeRender=function(r,sc,cam){var rt=r.getRenderTarget&&r.getRenderTarget(),h=rt?rt.height:(r.getDrawingBufferSize?r.getDrawingBufferSize(sz).y:720);
   var e=cam&&cam.projectionMatrix&&cam.projectionMatrix.elements;uni.uScale.value=h*.5*(e?e[5]:2.9)};
  scene.add(obj);return true}
 function spark(s){if(!ensure())return;var p=null;for(var i=0;i<parts.length;i++)if(!parts[i].on){p=parts[i];break}if(!p){if(parts.length>=MAX)return;p={};parts.push(p)}
  p.on=true;p.age=0;p.life=1.6+rnd()*1.1;p.x=s.x+(rnd()-.5)*.25;p.y=s.y;p.z=s.z+(rnd()-.5)*.25;p.vy=.45+rnd()*.35;p.dx=(rnd()-.5)*.25;p.dz=(rnd()-.5)*.25;
  p.ph=rnd()*6.283;p.size=.05+rnd()*.035;p.hot=rnd();stats.embersSpawned++}
 function stepEmbers(dt){if(!obj)return;var n=0;
  for(var i=0;i<parts.length;i++){var p=parts[i];if(!p.on)continue;p.age+=dt;var u=p.age/p.life;if(u>=1){p.on=false;continue}
   p.y+=p.vy*dt*(1-u*.5);p.x+=(p.dx+.12*Math.sin(p.age*2.3+p.ph))*dt;p.z+=(p.dz+.12*Math.cos(p.age*1.9+p.ph))*dt;
   A.pos[n*3]=p.x;A.pos[n*3+1]=p.y;A.pos[n*3+2]=p.z;
   var a=(u<.12?u/.12:1)*(1-u)*(.75+.25*Math.sin(p.age*9+p.ph));A.alpha[n]=Math.max(0,a);A.size[n]=p.size*(1-u*.55);
   var hot=1-u*.7;A.col[n*3]=1;A.col[n*3+1]=(.45+.3*p.hot)*hot+.12;A.col[n*3+2]=.12*hot;n++}
  geo.setDrawRange(0,n);obj.visible=n>0;if(n){var at=geo.attributes;at.position.needsUpdate=at.aAlpha.needsUpdate=at.aSize.needsUpdate=at.aColor.needsUpdate=true}}

 /* ---------------- the frame hook (game5_main.js animate: every mode, every frame) ---------------- */
 function update(dt){
  dt=Math.min(.1,Math.max(0,dt||0));T+=dt;
  var fires=typeof WORLD!=='undefined'&&WORLD.fires||[],i;stats.campfires=fires.length;
  for(i=0;i<fires.length;i++)flicker(fires[i],T);
  if(!enabled)return;
  // Blender sources: re-read now and then (buildings load late; a world reload replaces them)
  srcAge-=dt;if(!sources||srcAge<=0){sources=collect();srcAge=5}
  var pl=typeof player!=='undefined'&&player?player.position:null,want=0,hidden=typeof document!=='undefined'&&document.hidden;
  // each fire: its crackle share (a hearth or a campfire in full, a wall torch faintly) and, now and then, an ember
  // (none while the tab is hidden: nobody sees them, and the ember sheet is not even loaded until one is)
  function visit(s,isCamp){if(!pl)return;var d=Math.hypot(s.x-pl.x,s.z-pl.z),dy=Math.abs(s.y-pl.y),w=s.kind==='torch'?.35:1;
   if(dy<4){var g=d<=1.5?1:d>=7?0:Math.pow(1-(d-1.5)/5.5,1.6);if(g*w>want)want=g*w}
   if(hidden||d>22||dy>8)return;s.t-=dt*(s.rate||1);if(s.t<=0){s.t=(isCamp?1.6:2.4)+rnd()*3.2;spark(s);if(rnd()<.18)spark(s)}}
  for(i=0;i<sources.length;i++)visit(sources[i],false);
  for(i=0;i<fires.length;i++){var f=fires[i],u=f.userData;if(!u.flame)continue;
   // WORLD.fires holds the lit logs (kind 'fire') and, on the mainland, wall torches and braziers: those spark and crackle as torches
   if(!u._cozySrc){var camp=u.kind==='fire';u._cozySrc={t:.3+rnd(),kind:camp?'camp':'torch',rate:camp?1:.4}}var fp=f.position,top=u._cozyTop;
   if(top===undefined){try{var bb=new THREE.Box3().setFromObject(u.flame);top=u._cozyTop=bb.isEmpty()?fp.y+.6:bb.max.y-.1}catch(e){top=u._cozyTop=fp.y+.6}}
   u._cozySrc.x=fp.x;u._cozySrc.z=fp.z;u._cozySrc.y=top;visit(u._cozySrc,u._cozySrc.kind==='camp')}
  stepEmbers(dt);
  // the crackle: one quiet loop, as loud as the nearest fire is close (a wall torch counts, faintly)
  if(hidden)want=0;
  if(want>0&&!loop&&typeof Sfx!=='undefined'&&Sfx.loop)loop=Sfx.loop('fire_loop');
  if(loop){loopGain=want;loop.setGain(want)}stats.loopGain=+want.toFixed(3);
 }
 // a world reload: forget the sources (they are re-read), keep the pool
 function reset(){sources=null;for(var i=0;i<parts.length;i++)parts[i].on=false}
 function status(){var on=0;for(var i=0;i<parts.length;i++)if(parts[i].on)on++;
  return {enabled:enabled,clipsSlowed:stats.clipsSlowed,clipRate:CLIP_RATE,clipWeight:CLIP_WEIGHT,torchRate:TORCH_RATE,sources:sources?sources.map(function(s){return {kind:s.kind,x:+s.x.toFixed(2),y:+s.y.toFixed(2),z:+s.z.toFixed(2)}}):[],
   campfires:stats.campfires,embers:on,embersSpawned:stats.embersSpawned,pool:parts.length,max:MAX,drawCalls:obj&&obj.visible?1:0,loop:!!loop,loopGain:stats.loopGain,
   slowed:clips.map(function(k){return {clip:k.clip.name,timeScale:k.a.timeScale,weight:k.a.weight}})}}
 return {update:update,reset:reset,status:status,enabled:function(){return enabled},TORCH_RATE:TORCH_RATE,TORCH_SOFT:TORCH_SOFT,flicker:flicker};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=CozyFire;
