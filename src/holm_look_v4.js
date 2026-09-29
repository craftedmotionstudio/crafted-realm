/* Look v4 (owner review 5b, 2026-09-28; the Look panel, owner 2026-09-29). Owner: "Our character looks way too polished
 * and round ... we need more plainy style designs ... maybe even just more pixelated - slightly pixelated, not too much".
 * Then: "if we could have like a slider to increase pixelation and decrease pixelation, that would be really good to have.
 * And once we have that, I should be able to tell you what the default should be."
 * Measured against the private 2004 reference (tools/ref2004/look_metrics.py; docs/rebuild/HOLM_LOOK_V4_OPTIONS_2026-09-28.md):
 *   - pixels: 2004 draws 334 lines over its 36.13 deg view (9.24 lines per degree, hard edges); ours 28 (3x finer, smoothed);
 *   - colours: 2004 ~1,000 colours per view, gradients banded (~3 colours in a 6 x 6 gradient patch); ours ~8,000 (~11);
 *   - shading: the scenery's plain surfaces shade alike (face jumps 0.016 vs 0.045); 2004's bodies show ~3x our face jumps;
 *   - texture: where 2004 textures a surface its texels are 2-4x as contrasty as ours; it leaves more wood / plaster plain.
 * The look is a set of values (all live, all reversible; src/holm_look_panel.js is the in-game panel):
 *   pixelLines      0 = off (native), else the lines the 3D view is drawn with over a 36.13 deg view (2004: 334; 4a: 503;
 *                   ~200 = 5 px blocks at 1006 px tall); a wider view (a phone held upright) keeps the same density;
 *   colourDepth     0 = full colour, 1 = the 2004 client's colour space (64 hues x 8 saturations x 128 lightnesses),
 *                   2 = fewer (12 hues x 3 saturations x 12 lightnesses); in between blends the step counts;
 *   characterFacets 0 = round (as authored), 1 = flat per-face shading (material shading only: the character kit's meshes,
 *                   clips and colours are untouched);
 *   plainTextures   wood / plaster / roofs / bark / hay / cloth drawn in their texture's average colour (4c);
 *   chunkyTexels    textures sampled texel by texel (no smoothing);
 *   flatScenery     flat per-face shading on scenery models (4c; the ground stays gouraud as 2004's);
 *   bolderTextures  the textures kept (stone, cobbles, rock, leaves, water, the grey paths) pushed out from their average (4c).
 * Presets: v3 (the shipped default), 4a slight pixels, 4b 2004 pixels and colours, 4c planey and plain.
 * Which values a page uses: ?look=3|4a|4b|4c for that tab (not saved) > the values saved by the panel in this browser
 * (localStorage) > an earlier ?look= in this tab (sessionStorage) > GameConfig.holmLook (the shipped default; null = v3).
 * ?look=panel opens the panel. Picking, camera and UI are untouched (the pixels are drawn by ClassicPixels into an
 * off-screen target; the chrome stays crisp). */
var HolmLookV4=(function(){
 'use strict';
 var SAVE_KEY='cr_look_v4',SESSION_KEY='cr_look_option';
 var qs=typeof location!=='undefined'?new URLSearchParams(location.search):new URLSearchParams('');
 // 4c's textures: where 2004 textures a surface (stone, cobbles, leaves, water) its texels are 2-4x as contrasty as ours at
 // the 2004 pixel scale (stone 8.3 vs 2.8 levels, water 8.5 vs 2.2, leaves and grass 3.2 vs 1.1); it leaves more of its wood,
 // plaster and earth plain (textured share of earth-coloured surfaces 0.56 vs 0.80)
 var CONTRAST={model:2.0,ground:{path:1.8,rock:1.6},water:1.8};
 // plain colour where 2004 draws plain colour: wood, plaster, roofs, trunks, hay, cloth (not stone, leaves, cobbles, water)
 var PLAIN=/oak|plank|board|timber|beam|batten|stave|wood|frame|plaster|limewash|thatch|shingle|roof|clay|slate|bark|hay|sack|cloth|lid/i;
 var LINES_2004=334,LINES_4A=503,MIN_LINES=120,MAX_LINES=1006;
 var DEFAULTS={pixelLines:0,colourDepth:0,characterFacets:0,plainTextures:false,chunkyTexels:false,flatScenery:false,bolderTextures:false};
 var PRESETS={
  '3':{},
  '4a':{pixelLines:LINES_4A},
  '4b':{pixelLines:LINES_2004,colourDepth:1,characterFacets:.7,chunkyTexels:true},
  '4c':{pixelLines:LINES_2004,colourDepth:1,characterFacets:1,plainTextures:true,chunkyTexels:true,flatScenery:true,bolderTextures:true}};
 var TITLES={'3':'Current look (v3)','4a':'Slight pixels','4b':'2004 pixels and colours','4c':'Planey and plain'};
 function num(v,lo,hi,d){v=+v;return isFinite(v)?Math.max(lo,Math.min(hi,v)):d}
 // any partial object -> a full, clamped set of values (unknown keys dropped)
 function normalize(o){
  o=o&&typeof o==='object'?o:{};var s={};
  var L=num(o.pixelLines,0,MAX_LINES,0);s.pixelLines=L>0&&L<MAX_LINES?Math.round(Math.max(MIN_LINES,L)):0;
  s.colourDepth=Math.round(num(o.colourDepth,0,2,0)*100)/100;
  s.characterFacets=Math.round(num(o.characterFacets,0,1,0)*100)/100;
  ['plainTextures','chunkyTexels','flatScenery','bolderTextures'].forEach(function(k){s[k]=!!o[k]});
  return s;
 }
 function preset(id){var p=PRESETS[id];return p?normalize(Object.assign({},DEFAULTS,p)):null}
 function same(a,b){return Object.keys(DEFAULTS).every(function(k){return a[k]===b[k]})}
 function presetOf(s){var hit='custom';Object.keys(PRESETS).forEach(function(id){if(hit==='custom'&&same(s,preset(id)))hit=id});return hit}
 function pick(v){v=String(v||'').toLowerCase().replace(/^v/,'');return PRESETS.hasOwnProperty(v)?v:null}
 function readSaved(){try{var j=localStorage.getItem(SAVE_KEY);return j?normalize(JSON.parse(j)):null}catch(e){return null}}
 function shipped(){var c=typeof GameConfig!=='undefined'?GameConfig:{};
  if(c.holmLook&&typeof c.holmLook==='object')return normalize(Object.assign({},DEFAULTS,c.holmLook));
  return preset(pick(c.holmLookOption)||'3')}
 var urlLook=String(qs.get('look')||'').toLowerCase(),urlPreset=pick(urlLook),wantPanel=urlLook==='panel';
 var source,cur;
 (function initial(){
  if(urlPreset){cur=preset(urlPreset);source='url';try{sessionStorage.setItem(SESSION_KEY,urlPreset)}catch(e){}return}
  var saved=readSaved();if(saved){cur=saved;source='saved';return}
  var sess=null;try{sess=pick(sessionStorage.getItem(SESSION_KEY))}catch(e){}
  if(sess){cur=preset(sess);source='session';return}
  cur=shipped();source='default';
 })();
 // for tests and review links (this tab only, not saved): ?lookLines=201 (pixel lines; 'max' = the slider's 5 px end),
 // ?lookColours=0..2, ?lookFacets=0..1, on top of whatever the page chose above
 (function urlValues(){
  var o={},L=qs.get('lookLines'),C=qs.get('lookColours'),F=qs.get('lookFacets');
  if(L!==null)o.pixelLines=L==='max'?Math.round(MAX_LINES/5):+L;if(C!==null)o.colourDepth=+C;if(F!==null)o.characterFacets=+F;
  if(Object.keys(o).length){cur=normalize(Object.assign({},cur,o));source='url'}
 })();
 var st={started:false,sweeps:0,materials:0,patched:0,plain:0,textures:0,refiltered:0,boosted:0,skippedLambert:0,applied:0,timer:null,listeners:[]};
 var reg=[];   // every material seen: {m, ch}
 var FACET={character:{value:0},scenery:{value:0}},FACET_KEY='lookv4-facet-u1';
 function isCharacter(o){for(var q=o;q;q=q.parent)if(q.userData&&(q.userData.gmix||q.userData.isPlayerGLB||q.userData.holmPlayer))return true;return !!o.isSkinnedMesh}
 function lit(m){return !!(m.isMeshStandardMaterial||m.isMeshPhongMaterial||m.isMeshPhysicalMaterial||m.isMeshToonMaterial)}
 function needsMaterials(s){return s.characterFacets>0||s.plainTextures||s.chunkyTexels||s.flatScenery||s.bolderTextures}
 // ---- textures: texel by texel (no smoothing) or back to the loader's own filters ----
 // Loaders set their own filters as models arrive (HolmOldschoolLook.prepareModel and others), so every sweep checks again;
 // the mip chain is never switched off, so a texture a loader re-uploads stays complete (never black)
 function texels(t,on){
  if(!t||typeof THREE==='undefined')return;t.userData=t.userData||{};
  var o=t.userData.lookV4Filter;
  if(on){if(t.minFilter===THREE.NearestFilter&&t.magFilter===THREE.NearestFilter&&t.anisotropy===1)return;
   if(!o){t.userData.lookV4Filter={min:t.minFilter,mag:t.magFilter,aniso:t.anisotropy};st.textures++}else st.refiltered++;
   t.minFilter=THREE.NearestFilter;t.magFilter=THREE.NearestFilter;t.anisotropy=1;t.needsUpdate=true}
  else if(o){t.minFilter=o.min;t.magFilter=o.mag;t.anisotropy=o.aniso;delete t.userData.lookV4Filter;t.needsUpdate=true}
 }
 // ---- facets: the fragment normal mixed toward the face's own normal by a shared uniform (0 = as authored, 1 = flat) ----
 function patchFacets(m,u){
  if(m.userData.lookV4Facet)return;m.userData.lookV4Facet=true;
  var prev=m.onBeforeCompile,prevKey=m.customProgramCacheKey;
  m.extensions=m.extensions||{};m.extensions.derivatives=true;
  m.onBeforeCompile=function(sh,r){if(prev)prev.call(this,sh,r);sh.uniforms.lv4Facet=u;
   sh.fragmentShader='uniform float lv4Facet;\n'+sh.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\n#ifndef FLAT_SHADED\n'+
    'if ( lv4Facet > 0.0 ) { vec3 lv4fn = normalize( cross( dFdx( vViewPosition ), dFdy( vViewPosition ) ) ); normal = normalize( mix( normal, lv4fn, lv4Facet ) ); }\n#endif')};
  m.customProgramCacheKey=function(){return (prevKey?prevKey.call(this):'')+'|'+FACET_KEY+(u===FACET.character?'c':'s')};
  m.needsUpdate=true;st.patched++;
 }
 // ---- bolder textures: a copy pushed out from its own average by g (the average and the pattern kept) ----
 var boostCache={};
 function boosted(t,g){
  if(!t||!(g>1)||(t.userData&&t.userData.lookV4Boost))return t;if(boostCache.hasOwnProperty(t.uuid))return boostCache[t.uuid]||t;boostCache[t.uuid]=null;
  try{var img=t.image;if(!img||!img.width||typeof document==='undefined')return t;var w=img.width,h=img.height,cv=document.createElement('canvas');cv.width=w;cv.height=h;
   var x=cv.getContext('2d');x.drawImage(img,0,0,w,h);var id=x.getImageData(0,0,w,h),d=id.data,m=[0,0,0],n=0,i,j;
   for(i=0;i<d.length;i+=4){if(d[i+3]<8)continue;m[0]+=d[i];m[1]+=d[i+1];m[2]+=d[i+2];n++}if(!n)return t;m=[m[0]/n,m[1]/n,m[2]/n];
   for(i=0;i<d.length;i+=4)for(j=0;j<3;j++)d[i+j]=Math.max(0,Math.min(255,Math.round(m[j]+(d[i+j]-m[j])*g)));
   x.putImageData(id,0,0);var nt=t.clone();nt.image=cv;nt.userData=Object.assign({},t.userData||{},{lookV4Boost:true});delete nt.userData.lookV4Filter;nt.needsUpdate=true;boostCache[t.uuid]=nt;st.boosted++;return nt}
  catch(e){return t}
 }
 // ---- plain: the texture's average (in the space the shader reads it) as the material colour ----
 var means={};
 function meanOf(t){
  var key=t.uuid;if(means[key]!==undefined)return means[key];means[key]=null;
  try{var img=t.image;if(!img||!img.width)return null;var w=Math.min(64,img.width),h=Math.min(64,img.height),cv=document.createElement('canvas');cv.width=w;cv.height=h;
   var g=cv.getContext('2d');g.drawImage(img,0,0,w,h);var d=g.getImageData(0,0,w,h).data,s=[0,0,0],n=0,srgb=THREE.sRGBEncoding!==undefined&&t.encoding===THREE.sRGBEncoding;
   var lin=function(v){v/=255;return srgb?(v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)):v};
   for(var i=0;i<d.length;i+=4){if(d[i+3]<8)continue;s[0]+=lin(d[i]);s[1]+=lin(d[i+1]);s[2]+=lin(d[i+2]);n++}
   means[key]=n?[s[0]/n,s[1]/n,s[2]/n]:null}catch(e){means[key]=null}
  return means[key];
 }
 // ---- one material brought to the current values from what it was when first seen (so every change is reversible) ----
 // Characters: only material shading (facets) and texture sampling; their maps and colours are the character kit's (it
 // recolours them live), so they are never written here. Scenery: the map and colour change only while plain / bolder asks.
 function applyMaterial(r){
  var m=r.m,o=r.orig,s=cur;if(m.userData.oldschoolGround)return;
  if(!r.ch&&o.map&&!m.transparent&&m.color){
   var c=s.plainTextures&&PLAIN.test(m.name||'')?meanOf(o.map):null;
   if(c){if(!r.plain){r.plain=true;st.plain++;m.map=null;m.color.setRGB(o.color[0]*c[0],o.color[1]*c[1],o.color[2]*c[2]);m.needsUpdate=true}}
   else{if(r.plain){r.plain=false;st.plain--;m.map=o.map;m.color.setRGB(o.color[0],o.color[1],o.color[2]);m.needsUpdate=true}
    // the bolder copy in or out, only over our own maps (another system's later map is left alone)
    var want=s.bolderTextures?boosted(o.map,CONTRAST.model):o.map;if(m.map!==want&&(m.map===o.map||m.map===boostCache[o.map.uuid]))m.map=want}
  }
  if(m.map)texels(m.map,s.chunkyTexels);if(o.map&&o.map!==m.map)texels(o.map,s.chunkyTexels);
  if(lit(m)){if(r.ch?s.characterFacets>0:s.flatScenery)patchFacets(m,r.ch?FACET.character:FACET.scenery)}
  else if(m.isMeshLambertMaterial&&(r.ch?s.characterFacets>0:s.flatScenery)&&!r.lambert){r.lambert=true;st.skippedLambert++}
 }
 function register(o,m){
  if(!m||m.userData.lookV4Reg)return;m.userData.lookV4Reg=true;
  var r={m:m,ch:isCharacter(o),orig:{map:m.map||null,color:m.color?[m.color.r,m.color.g,m.color.b]:[1,1,1]}};reg.push(r);st.materials++;applyMaterial(r);
 }
 // the island ground's and water's kit textures (HolmOldschoolLook) follow the texel setting; their detail strength and
 // the water's ripple contrast follow the bolder setting (shader uniforms: live)
 function applyGround(){
  if(typeof HolmOldschoolLook==='undefined')return;
  if(HolmOldschoolLook.eachTexture)HolmOldschoolLook.eachTexture(function(t){texels(t,cur.chunkyTexels)});
  if(HolmOldschoolLook.setBoost){var b=cur.bolderTextures;HolmOldschoolLook.setBoost({path:b?CONTRAST.ground.path:1,rock:b?CONTRAST.ground.rock:1,water:b?CONTRAST.water:1})}
 }
 function sweep(){
  if(typeof scene==='undefined'||!scene||typeof THREE==='undefined')return;st.sweeps++;
  scene.traverse(function(o){if(!o.isMesh&&!o.isSkinnedMesh)return;var ms=o.material;
   if(Array.isArray(ms))for(var i=0;i<ms.length;i++)register(o,ms[i]);else register(o,ms)});
  if(cur.chunkyTexels)reg.forEach(function(r){if(r.m.map)texels(r.m.map,true)});
  applyGround();
 }
 function syncSweep(){
  var want=needsMaterials(cur);
  if(want&&!st.timer&&st.started){sweep();st.timer=setInterval(sweep,1500)}
  else if(!want&&st.timer){clearInterval(st.timer);st.timer=null}
 }
 function applyPixels(){
  if(typeof ClassicPixels==='undefined'||!ClassicPixels.configure)return;
  if(cur.pixelLines>0||cur.colourDepth>0)ClassicPixels.configure({lines:cur.pixelLines,colourDepth:cur.colourDepth});
  else ClassicPixels.configure(null);
 }
 // bring everything to the current values (live)
 function apply(){
  st.applied++;applyPixels();
  FACET.character.value=cur.characterFacets;FACET.scenery.value=cur.flatScenery?1:0;
  if(st.started){reg.forEach(applyMaterial);applyGround();syncSweep()}
  st.listeners.forEach(function(f){try{f(get())}catch(e){}});
 }
 function get(){return Object.assign({},cur)}
 // new values (partial is fine); save=true remembers them in this browser (the panel does), else this page only
 function set(o,save){
  cur=normalize(Object.assign({},cur,o||{}));
  if(save){try{localStorage.setItem(SAVE_KEY,JSON.stringify(cur))}catch(e){}source='saved'}
  apply();return get();
 }
 function usePreset(id,save){var p=preset(pick(id));if(!p)return null;cur=p;if(save){try{localStorage.setItem(SAVE_KEY,JSON.stringify(cur))}catch(e){}source='saved'}apply();return get()}
 // forget this browser's saved values: back to the shipped default
 function reset(){try{localStorage.removeItem(SAVE_KEY)}catch(e){}try{sessionStorage.removeItem(SESSION_KEY)}catch(e){}cur=shipped();source='default';apply();return get()}
 function saved(){return readSaved()}
 function onChange(f){if(typeof f==='function')st.listeners.push(f)}
 function option(){return presetOf(cur)}
 function settings(){return get()}
 // the JSON the owner copies to make a default (GameConfig.holmLook)
 function exportJSON(){return JSON.stringify(Object.assign({lookV4:1},cur))}
 function start(){
  if(st.started)return;st.started=true;apply();
  if(needsMaterials(cur))syncSweep();
  // ?look=panel: the panel opens once the world is showing (not over the login screen)
  if(wantPanel&&typeof HolmLookPanel!=='undefined'){var tries=0,t=setInterval(function(){
   if((typeof running!=='undefined'&&running)||++tries>360){clearInterval(t);try{HolmLookPanel.open()}catch(e){}}},500)}
 }
 function stop(){if(st.timer){clearInterval(st.timer);st.timer=null}}
 function snapshot(){return {option:presetOf(cur),title:TITLES[presetOf(cur)]||'Custom',source:source,settings:get(),sweeping:!!st.timer,
  sweeps:st.sweeps,materials:st.materials,patched:st.patched,plain:st.plain,textures:st.textures,refiltered:st.refiltered,boosted:st.boosted,skippedLambert:st.skippedLambert,
  facets:{character:FACET.character.value,scenery:FACET.scenery.value},pixels:typeof ClassicPixels!=='undefined'?ClassicPixels.snapshot():null}}
 if(typeof window!=='undefined'&&window.addEventListener&&typeof document!=='undefined'){if(document.readyState==='complete')setTimeout(start,0);else window.addEventListener('load',start)}
 return {get:get,set:set,preset:usePreset,reset:reset,saved:saved,onChange:onChange,exportJSON:exportJSON,normalize:normalize,presetOf:presetOf,presetValues:preset,
  option:option,settings:settings,start:start,stop:stop,sweep:sweep,snapshot:snapshot,wantPanel:function(){return wantPanel},
  PRESETS:PRESETS,TITLES:TITLES,DEFAULTS:DEFAULTS,CONTRAST:CONTRAST,PLAIN:PLAIN,FACET:FACET,LINES_2004:LINES_2004,LINES_4A:LINES_4A,MIN_LINES:MIN_LINES,MAX_LINES:MAX_LINES,SAVE_KEY:SAVE_KEY};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmLookV4;
