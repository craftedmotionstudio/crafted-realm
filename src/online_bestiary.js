/* ============ OnlineBestiary — the Scarlands bestiary's own rigs online (W2/W3) ============
 * The bestiary (docs/rebuild/scarlands/, assets/scarlands/bestiary-v1/manifest.json) ships one GLB per creature with
 * baked clips: idle, walk (loops), attack / shoot / cast / breath / hit / block / death (once; death holds), and the
 * frame events that matter for combat: `impact` (the melee hit shows), `release` (the projectile leaves).
 * A server monster whose NPC_TYPES entry names a bestiary `model` is drawn from its GLB here instead of the older
 * procedural bodies: one AnimationMixer each, walk at timeScale = speed / walk_speed_mps, swings timed so the impact /
 * release frame meets the server's hit (OnlineFX asks impactTime / releaseTime), death played and held, then the
 * body sinks and its loot appears. Conventions: +Z forward, feet at y = 0, origin at the footprint centre (a 2x2
 * creature stands on its south-west tile + 1). Without the manifest (or for any other monster) nothing changes.
 */
var OnlineBestiary=(function(){
 'use strict';
 var st={url:null,dir:'',manifest:null,byModel:{},gltf:{},loading:null,stats:{built:0,failed:[]}};
 function load(map){
  if(st.loading)return st.loading;
  st.url=(map&&map.bestiary)||'assets/scarlands/bestiary-v1/manifest.json';
  st.dir=st.url.replace(/[^\/]*$/,'');
  st.loading=fetch(st.url,{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()}).then(function(m){
   st.manifest=m;(m.creatures||[]).forEach(function(c){var key=(c.npcType&&c.npcType.model)||(c.changes&&c.changes.model)||c.id;st.byModel[key]=c;st.byModel[c.id]=c});return true;
  }).catch(function(){st.manifest=null;return false});
  return st.loading;
 }
 function creatureFor(t){return t&&st.manifest?(st.byModel[t.model]||st.byModel[t.bestiary]||null):null}
 function prepare(root){root.traverse(function(o){if(!o.isMesh&&!o.isSkinnedMesh)return;o.castShadow=true;o.frustumCulled=false;[].concat(o.material).forEach(function(m){if(!m)return;
  if(m.map){if(THREE.LinearEncoding!==undefined)m.map.encoding=THREE.LinearEncoding;m.map.magFilter=THREE.NearestFilter;m.map.minFilter=THREE.LinearMipmapLinearFilter;m.map.needsUpdate=true}
  if('roughness' in m){m.roughness=1;m.metalness=0}m.needsUpdate=true})})}
 function gltfOf(c){
  if(st.gltf[c.id])return st.gltf[c.id];
  // one download per creature; every monster of that kind parses its own copy (r128 cannot clone skinned meshes)
  st.gltf[c.id]=fetch(st.dir+c.model.file).then(function(r){if(!r.ok)throw new Error(c.model.file+' '+r.status);return r.arrayBuffer()});
  return st.gltf[c.id];
 }
 /** a group standing in for the monster at once; the rig fills it when its GLB is parsed */
 function build(t){
  var c=creatureFor(t);if(!c)return null;
  var g=new THREE.Group();g.name='bestiary-'+c.id;
  var ud=g.userData;ud.bestiary={c:c,mixer:null,clips:{},one:null,oneName:null,w:0,death:null};
  gltfOf(c).then(function(buf){return new Promise(function(res,rej){new THREE.GLTFLoader().parse(buf.slice(0),st.dir,res,rej)})}).then(function(gltf){
   var rig=gltf.scene;prepare(rig);g.add(rig);ud.rigInner=rig;
   var b=ud.bestiary,mixer=new THREE.AnimationMixer(rig);b.mixer=mixer;
   gltf.animations.forEach(function(cl){b.clips[cl.name]=mixer.clipAction(cl)});
   if(b.clips.idle){b.clips.idle.play();b.clips.idle.weight=1}
   if(b.clips.walk){b.clips.walk.play();b.clips.walk.weight=0}
   st.stats.built++;
  }).catch(function(e){st.stats.failed.push(c.id);console.warn('[OnlineBestiary] '+c.id+' model failed',e)});
  return g;
 }
 function clipInfo(c,name){return c&&c.clips&&c.clips[name]||null}
 /** seconds from the start of a swing clip to its impact (melee) or release (projectile) frame */
 function eventTime(o,kind){
  var b=o&&o.userData&&o.userData.bestiary;if(!b)return null;
  var names=kind==='ranged'?['shoot','attack']:kind==='magic'?['cast','attack']:kind==='breath'?['breath']:['attack'];
  for(var i=0;i<names.length;i++){var ci=clipInfo(b.c,names[i]);if(ci){var f=ci.impact!=null?ci.impact:ci.release;if(f!=null)return f/(ci.fps||30)}}
  return null;
 }
 /** play a one-shot (attack / shoot / cast / breath / hit / block / death); speed > 1 plays it faster */
 function play(o,name,speed){
  var b=o&&o.userData&&o.userData.bestiary;if(!b||!b.mixer)return false;
  var act=b.clips[name]||(name==='shoot'||name==='cast'||name==='breath'?b.clips.attack:null);if(!act)return false;
  if(b.one&&b.one!==act){b.one.stop()}
  act.reset();act.setLoop(THREE.LoopOnce,1);act.clampWhenFinished=true;act.timeScale=speed||1;act.weight=1;act.play();b.one=act;b.oneName=name;return true;
 }
 function busy(o){var b=o&&o.userData&&o.userData.bestiary;return !!(b&&b.one&&b.one.isRunning()&&b.oneName!=='hit'&&b.oneName!=='block')}
 /** per frame: idle/walk blend (walk at the server's pace), one-shots own the body while they run */
 function tick(o,dt,moving,speed){
  var b=o&&o.userData&&o.userData.bestiary;if(!b||!b.mixer)return;
  if(b.death){b.mixer.update(dt);return}
  b.w+=((moving?1:0)-b.w)*Math.min(1,dt*10);
  var one=b.one&&b.one.isRunning();
  if(b.clips.idle)b.clips.idle.weight=one?0:1-b.w;
  if(b.clips.walk){b.clips.walk.weight=one?0:b.w;var ws=(b.c.model&&b.c.model.walk_speed_mps)||1.67;b.clips.walk.timeScale=Math.max(0.3,(speed||ws)/ws)}
  if(b.one&&!one&&b.oneName!=='death'){b.one.stop();b.one=null;b.oneName=null}
  b.mixer.update(dt);
 }
 /** the death: the clip plays and holds, a moment on the ground, then the body sinks (returns false when gone) */
 function startDeath(o){var b=o&&o.userData&&o.userData.bestiary;if(!b)return false;play(o,'death');var ci=clipInfo(b.c,'death');
  b.death={t:0,clip:ci?ci.frames/(ci.fps||30):1,hold:0.5,sink:0.7,baseY:o.position.y,depth:Math.max(0.6,(b.c.model&&b.c.model.height_m)||1)};return true}
 function tickDeath(o,dt){var b=o&&o.userData&&o.userData.bestiary,d=b&&b.death;if(!d)return false;d.t+=dt;if(b.mixer)b.mixer.update(dt);
  var s=d.t-d.clip-d.hold;if(s>0){var k=Math.min(1,s/d.sink);o.position.y=d.baseY-d.depth*k*k;if(k>=1)return false}return true}
 return {load:load,has:function(t){return !!creatureFor(t)},creature:creatureFor,build:build,eventTime:eventTime,play:play,busy:busy,tick:tick,
  startDeath:startDeath,tickDeath:tickDeath,active:function(){return !!st.manifest},stats:function(){return {built:st.stats.built,failed:st.stats.failed.slice(),creatures:st.manifest?st.manifest.creatures.length:0}}};
})();
