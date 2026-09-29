/* Review 5 (owner 2026-09-28): try the walk / run / idle OPTIONS while playing.
 *   ?gait=walkD,runE,idleA   the kit player walks with walk_D, runs with run_E and stands with idle_A
 *                            (round 2 = walk / run D, E, F; round 1 = A, B, C kept for reference; idle A, B, C)
 *   ?gait=B                  option B for all three;  walkcur / runcur / idlecur = the shipped clip
 *   add ",panel" (or ?gait=panel) for a small picker that switches live (the address bar follows, so a reload keeps it)
 * The variants are named clips in assets/models/holm_kit_v2_gaits.glb (tools/blender/build_holm_characters_v2.py
 * --gait-options): the kit's own rig, no meshes. They play on the player's own mixer in place of the kit's walk / run /
 * idle actions (playerGLBAnim drives them exactly like the shipped ones: HOLM_KIT_MPS time scale, run above the walk / run
 * midpoint); worn and held gear is re-fitted on the new idle's first frame (refreshGLBGear). Without ?gait nothing is loaded
 * and nothing changes: the kit's own clips stay the default until the owner picks. Presentation only -- no game rule reads it.
 * Round 2 also carries the MESH options: ?kitmesh=a (the shipped mesh drawn with flat per-face shading), ?kitmesh=b / c
 * (the player loads assets/models/holm_kit_v2_mesh_b.glb / _c.glb instead of the kit: b = squarer torso, fuller thigh
 * caps, trousers tucked into one-piece boots, creases at 30 deg; c = the shipped mesh creased at 36 deg). The panel's mesh
 * row switches a live and reloads the page for b / c. */
var HolmGaitOptions=(function(){
 'use strict';
 var URL='assets/models/holm_kit_v2_gaits.glb?v=cb975844',KINDS=['walk','run','idle'];
 var LABELS={walk:{A:'r1 steady shoulders',B:'r1 shorter reach',C:'r1 2004 trailing legs',D:'relaxed',E:'natural',F:'2004 step'},
  run:{A:'r1 upright natural run',B:'r1 2004 lean, straight back',C:'r1 light jog',D:'easy run',E:'woods run',F:'2004 run'},
  idle:{A:'2004 stand',B:'square stand',C:'shipped feet, head up'}};
 var MESH={b:'assets/models/holm_kit_v2_mesh_b.glb?v=c6fa0a10',c:'assets/models/holm_kit_v2_mesh_c.glb?v=90b7ba42'},MESH_LABELS={a:'flat per-face shading',b:'squarer torso, thigh caps, one-piece boots',c:'creases at 36 deg'};
 var st={want:null,clips:null,loading:null,failed:false,panel:null,mesh:null,flatAt:0};
 // "walkA,runB,idleC" | "walk=A run:b" | "B" (all three) | "walkcur" | "panel"
 function parse(s){var w={walk:null,run:null,idle:null,panel:false};
  String(s==null?'':s).split(/[,;\s]+/).forEach(function(t){if(!t)return;
   var m=/^(walk|run|idle)[=:_-]?([a-z]+)$/i.exec(t);
   if(m){var k=m[2].toUpperCase();w[m[1].toLowerCase()]=(k==='CUR'||k==='CURRENT'||k==='DEFAULT')?null:k;return}
   if(/^(panel|pick|picker|on|1)$/i.test(t)){w.panel=true;return}
   if(/^[a-z]$/i.test(t))KINDS.forEach(function(k){w[k]=t.toUpperCase()})});
  return w}
 function format(w){var out=KINDS.filter(function(k){return w[k]}).map(function(k){return k+w[k]});if(w.panel)out.push('panel');return out.join(',')||'panel'}
 function fromUrl(){try{if(typeof location==='undefined')return null;var q=new URLSearchParams(location.search);return q.has('gait')?parse(q.get('gait')):null}catch(e){return null}}
 function meshFromUrl(){try{var m=typeof location!=='undefined'&&new URLSearchParams(location.search).get('kitmesh');m=m&&String(m).toLowerCase();return m==='a'||MESH[m]?m:null}catch(e){return null}}
 // the kit GLB the player loads (HolmIslandPlayer.load): a mesh option's own kit for b / c, the shipped one otherwise
 function kitUrl(def){return st.mesh&&MESH[st.mesh]?MESH[st.mesh]:def}
 // mesh a: the player's kit meshes drawn flat (one normal per triangle); re-applied every second (a look refresh may swap materials)
 function flatten(root,on){var rig=root&&root.userData&&(root.userData.rigInner||root);if(!rig)return;rig.traverse(function(o){if(!(o.isMesh||o.isSkinnedMesh))return;
  [].concat(o.material).forEach(function(m){if(m&&!!m.flatShading!==on){m.flatShading=on;m.needsUpdate=true}})})}
 function load(){
  if(st.clips||st.loading||st.failed||typeof THREE==='undefined'||!THREE.GLTFLoader)return st.loading;
  st.loading=new Promise(function(ok){new THREE.GLTFLoader().load(URL,function(g){st.clips={};g.animations.forEach(function(c){st.clips[c.name]=c});st.loading=null;ok(st.clips)},undefined,
   function(e){st.failed=true;st.loading=null;console.error('[HolmGaitOptions] '+URL+' failed; the shipped clips stay',e);ok(null)})});
  return st.loading}
 function key(w){return KINDS.map(function(k){return w[k]||'-'}).join('')}
 // swap the chosen variants into a kit character's gmix (idle / walk / run), carrying over weight, time and time scale
 function applyTo(root){
  var gm=root&&root.userData&&root.userData.gmix;if(!gm||!gm.kit||!gm.mixer||!st.clips||!st.want)return false;
  var k=key(st.want);if(gm._gaitKey===k)return true;
  var own=gm._gaitOwn||(gm._gaitOwn={walk:gm.walk,run:gm.run,idle:gm.idle});
  KINDS.forEach(function(kind){
   var o=st.want[kind],clip=o&&st.clips[kind+'_'+o],next=clip?gm.mixer.clipAction(clip):own[kind],prev=gm[kind];
   if(o&&!clip)console.info('[HolmGaitOptions] no clip '+kind+'_'+o+'; the shipped '+kind+' stays (have '+Object.keys(st.clips).join(', ')+')');
   if(!next||next===prev)return;
   var w=prev?prev.getEffectiveWeight():0,d=next.getClip().duration;
   next.reset();next.setLoop(THREE.LoopRepeat,Infinity);next.clampWhenFinished=false;next.play();next.weight=w;
   if(prev){next.timeScale=prev.timeScale;next.time=prev.getClip().duration?(prev.time/prev.getClip().duration)*d:0;prev.stop()}
   if(kind==='run')next._on=true;   // (playerGLBAnim starts the run action once, on first use)
   gm[kind]=next});
  gm._gaitKey=k;
  if(root===(typeof player!=='undefined'?player:null)&&typeof refreshGLBGear==='function')try{refreshGLBGear()}catch(e){}
  return true}
 // per frame (HolmIslandPlayer.update): once the variants are loaded, keep the player on the chosen set
 function update(){
  var p=typeof player!=='undefined'?player:null,kit=p&&p.userData&&p.userData.gmix&&p.userData.gmix.kit;
  if(kit&&(st.mesh==='a'||p.userData._flat)){var now=Date.now();if(now-st.flatAt>1000||p.userData._flat!==(st.mesh==='a')){st.flatAt=now;flatten(p,st.mesh==='a');p.userData._flat=st.mesh==='a'}}
  if(st.want&&st.want.panel&&!st.panel)panel();
  if(!st.want)return;if(!st.clips){load();return}
  if(kit)applyTo(p)}
 function set(w){st.want=Object.assign({walk:null,run:null,idle:null,panel:false},st.want||{},typeof w==='string'?parse(w):w||{});
  try{if(typeof history!=='undefined'&&history.replaceState){var q=new URLSearchParams(location.search);q.set('gait',format(st.want));history.replaceState(null,'',location.pathname+'?'+q.toString().replace(/%2C/gi,',')+location.hash)}}catch(e){}
  refreshPanel();update();return status()}
 function status(){var p=typeof player!=='undefined'?player:null,gm=p&&p.userData&&p.userData.gmix;
  var name=function(a){return a&&a.getClip?a.getClip().name:null};
  return {want:st.want?{walk:st.want.walk,run:st.want.run,idle:st.want.idle}:null,mesh:st.mesh,loaded:!!st.clips,failed:st.failed,clips:st.clips?Object.keys(st.clips).sort():[],
   playing:gm?{walk:name(gm.walk),run:name(gm.run),idle:name(gm.idle)}:null}}
 // the picker: three rows (walk / run / idle) of buttons -- shipped, then the options (round 1: A-C, round 2: D-F; idle A-C)
 function panel(){if(typeof document==='undefined'||!document.body)return;
  var d=document.createElement('div');d.id='gait-options-panel';
  d.style.cssText='position:fixed;left:8px;top:8px;z-index:9999;background:rgba(20,16,10,.88);color:#ffdf8a;font:12px/1.4 Arial,sans-serif;padding:6px 8px;border:1px solid #6b5a3a;border-radius:3px;user-select:none';
  var html='<div style="font-weight:bold;margin-bottom:3px">Gait options <span data-x="1" style="float:right;cursor:pointer;margin-left:10px" title="hide">x</span></div>';
  KINDS.forEach(function(kind){html+='<div style="margin:2px 0"><span style="display:inline-block;width:34px">'+kind+'</span>';
   [null].concat(Object.keys(LABELS[kind])).forEach(function(o){html+='<button data-k="'+kind+'" data-o="'+(o||'')+'" title="'+(o?LABELS[kind][o]:'shipped clip')+'" style="font:11px Arial;margin:0 1px;padding:1px 5px;cursor:pointer">'+(o||'now')+'</button>'});
   html+='</div>'});
  html+='<div style="margin:2px 0"><span style="display:inline-block;width:34px">mesh</span>';
  [null,'a','b','c'].forEach(function(o){html+='<button data-m="'+(o||'')+'" title="'+(o?MESH_LABELS[o]:'shipped mesh')+'" style="font:11px Arial;margin:0 1px;padding:1px 5px;cursor:pointer">'+(o||'now')+'</button>'});
  html+='</div>';
  d.innerHTML=html;document.body.appendChild(d);st.panel=d;
  d.addEventListener('click',function(e){var t=e.target;if(t.getAttribute('data-x')){d.style.display='none';return}
   if(t.hasAttribute('data-m')){setMesh(t.getAttribute('data-m')||null);e.stopPropagation();return}
   var kind=t.getAttribute('data-k');if(!kind)return;var o={};o[kind]=t.getAttribute('data-o')||null;set(o);e.stopPropagation()});
  ['mousedown','mouseup','pointerdown','pointerup','contextmenu'].forEach(function(n){d.addEventListener(n,function(e){e.stopPropagation()})});
  refreshPanel()}
 // mesh a / shipped switch live; b / c are other kit GLBs, so the page reloads with the new ?kitmesh (the save is kept)
 function setMesh(m){var was=st.mesh;st.mesh=m||null;
  try{var q=new URLSearchParams(location.search);if(st.mesh)q.set('kitmesh',st.mesh);else q.delete('kitmesh');var url=location.pathname+'?'+q.toString().replace(/%2C/gi,',')+location.hash;
   if(MESH[was]||MESH[st.mesh]){location.href=url;return}history.replaceState(null,'',url)}catch(e){}
  refreshPanel();update()}
 function refreshPanel(){if(!st.panel||!st.want)return;[].forEach.call(st.panel.querySelectorAll('button'),function(b){
  var on=b.hasAttribute('data-m')?(st.mesh||'')===b.getAttribute('data-m'):(st.want[b.getAttribute('data-k')]||'')===b.getAttribute('data-o');b.style.background=on?'#c9a45a':'#3a3226';b.style.color=on?'#1a1208':'#ffdf8a';b.style.border='1px solid '+(on?'#ffdf8a':'#6b5a3a')})}
 st.want=fromUrl();st.mesh=meshFromUrl();
 return {parse:parse,set:set,setMesh:setMesh,kitUrl:kitUrl,update:update,applyTo:applyTo,status:status,load:load,active:function(){return !!(st.want||st.mesh)},labels:LABELS};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmGaitOptions;
