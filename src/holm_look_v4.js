/* Look v4 options (owner review 5b, 2026-09-28). Owner: "Our character looks way too polished and round. Almost
 * everything in the game looks a little bit too polished ... we need more plainy style designs ... maybe even just more
 * pixelated - slightly pixelated, not too much - that old school feel."
 * Measured against the private 2004 reference (tools/ref2004/look_metrics.py on the harness's scenery frames at the 2004
 * lens and the height-matched character close-ups; numbers in docs/rebuild/HOLM_LOOK_V4_OPTIONS_2026-09-28.md):
 *   - pixels: 2004 draws 334 lines over its 36.13 deg view (9.24 lines per degree, hard edges); ours 28 (3x finer, smoothed);
 *   - colours: 2004 ~1,000 colours per view, gradients banded (~3 colours in a 6 x 6 gradient patch); ours ~8,000 (~11);
 *   - shading: the scenery's plain surfaces shade alike in both (share of face-to-face jumps 0.03 vs 0.05); 2004's
 *     bodies show ~3x more face-to-face jumps than ours (0.14 vs 0.05, ours averaged over the sun at four sides: round),
 *     and a wider tonal range (luminance spread 33 vs 22 levels);
 *   - texture: where 2004 textures a surface (stone, cobbles, leaves, water) its texels are 2-4x as contrasty as ours; it
 *     leaves more of its wood, plaster and earth plain.
 * Three options read those numbers; none is the default (the owner picks). ?look=3 is the current look (v3), ?look=4a /
 * 4b / 4c an option, remembered for the tab's session. Every option keeps look v3's 2004 light (luminance band).
 *   4a "slight pixels": the world drawn at the 2004 applet's full height (503 lines over the view: 2 px blocks at 1006
 *      px), no anti-aliasing; colours, textures and shading as v3. The owner's "slightly pixelated, not too much".
 *   4b "2004 pixels and colours": 2004's pixel density (334 lines: 3 px blocks at 1006), every pixel in the 2004
 *      client's colour space (64 hues x 8 saturations x 128 lightnesses: banded gradients), textures sampled texel by
 *      texel (no mipmaps), characters' normals 70% of the way to their faces (face jumps 0.12, 2004 0.14).
 *   4c "planey and plain": 4b's pixels and colours, flat per-face shading on every scenery model and character, wood /
 *      plaster / roofs / bark / hay / cloth in their texture's average colour, and the textures it keeps (stone,
 *      cobbles, rock, leaves, water) bolder. The owner's "planey / plainy" at full strength.
 * Characters: only material shading is touched here (the character agent owns the kit's meshes, clips and colours).
 * The ground stays gouraud in every option (2004 shades its terrain smoothly); its detail textures follow the texture
 * filter. Picking, camera and UI are untouched (the pixels are drawn by ClassicPixels into an off-screen target). */
var HolmLookV4=(function(){
 'use strict';
 var KEY='cr_look_option';
 var qs=typeof location!=='undefined'?new URLSearchParams(location.search):new URLSearchParams('');
 // 4c's textures: where 2004 textures a surface (stone, cobbles, leaves, water) its texels are 2-4x as contrasty as ours at
 // the 2004 pixel scale (stone 8.3 vs 2.8 levels, water 8.5 vs 2.2, leaves and grass 3.2 vs 1.1); it leaves more of its wood,
 // plaster and earth plain (textured share of earth-coloured surfaces 0.56 vs 0.80). So: those textures pushed out from
 // their own average (the average colour kept), the grey paths' and rocks' detail and the water's ripples stronger, and
 // the plain families drawn in their texture's average colour (the plain list below)
 var CONTRAST={model:2.0,ground:{path:1.8,rock:1.6},water:1.8};
 var OPTIONS={
  '3':null,
  '4a':{id:'4a',title:'Slight pixels',pixels:{linesPerDeg:503/36.13,minLines:360,palette:'none'},texels:false,sceneryFlat:false,characterFacet:0,plain:null},
  '4b':{id:'4b',title:'2004 pixels and colours',pixels:{linesPerDeg:334/36.13,minLines:300,palette:'hsl2004'},texels:true,sceneryFlat:false,characterFacet:.7,plain:null,contrast:null},
  '4c':{id:'4c',title:'Planey and plain',pixels:{linesPerDeg:334/36.13,minLines:300,palette:'hsl2004'},texels:true,sceneryFlat:true,characterFacet:1,contrast:CONTRAST,
   // plain colour where 2004 draws plain colour: wood, plaster, roofs, trunks, hay, cloth (not stone, leaves, cobbles, water)
   plain:/oak|plank|board|timber|beam|batten|stave|wood|frame|plaster|limewash|thatch|shingle|roof|clay|slate|bark|hay|sack|cloth|lid/i}};
 function pick(v){v=String(v||'').toLowerCase().replace(/^v/,'');return OPTIONS.hasOwnProperty(v)?v:null}
 var id=pick(qs.get('look'));
 try{if(id)sessionStorage.setItem(KEY,id);else id=pick(sessionStorage.getItem(KEY))}catch(e){}
 if(!id)id=pick(typeof GameConfig!=='undefined'&&GameConfig.holmLookOption)||'3';
 var opt=OPTIONS[id];
 var st={started:false,sweeps:0,materials:0,flat:0,facet:0,plain:0,textures:0,refiltered:0,boosted:0,tuned:false,skippedLambert:0,timer:null};
 var FACET_KEY='lookv4-facet';
 function option(){return id}
 function settings(){return opt}
 function isCharacter(o){for(var q=o;q;q=q.parent)if(q.userData&&(q.userData.gmix||q.userData.isPlayerGLB||q.userData.holmPlayer))return true;return !!o.isSkinnedMesh}
 function lit(m){return !!(m.isMeshStandardMaterial||m.isMeshPhongMaterial||m.isMeshPhysicalMaterial||m.isMeshToonMaterial)}
 // a texture sampled texel by texel: no mip levels read, no filtering (the 2004 client's chunky texels). Loaders set their
 // own filters as models arrive (HolmOldschoolLook.prepareModel and others), so every sweep checks again; the mip chain
 // is still built, so a texture whose filter was reset by a loader stays complete (never black) until the next sweep
 function texels(t){
  if(!t||!opt||!opt.texels)return;if(t.minFilter===THREE.NearestFilter&&t.magFilter===THREE.NearestFilter&&t.anisotropy===1)return;
  t.userData=t.userData||{};if(!t.userData.lookV4){t.userData.lookV4=true;st.textures++}else st.refiltered++;
  t.minFilter=THREE.NearestFilter;t.magFilter=THREE.NearestFilter;t.anisotropy=1;t.needsUpdate=true;
 }
 // half-way (or any share) from smooth to per-face shading: the fragment normal mixed toward the face's own normal
 function facet(m,k){
  var prev=m.onBeforeCompile,prevKey=m.customProgramCacheKey;
  m.extensions=m.extensions||{};m.extensions.derivatives=true;
  m.onBeforeCompile=function(sh,r){if(prev)prev.call(this,sh,r);
   sh.fragmentShader=sh.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\n#ifndef FLAT_SHADED\n'+
    '{ vec3 lv4fn = normalize( cross( dFdx( vViewPosition ), dFdy( vViewPosition ) ) ); normal = normalize( mix( normal, lv4fn, '+k.toFixed(3)+' ) ); }\n#endif')};
  m.customProgramCacheKey=function(){return (prevKey?prevKey.call(this):'')+'|'+FACET_KEY+k.toFixed(3)};
  m.needsUpdate=true;st.facet++;
 }
 // a copy of a texture pushed out from its own average by g (the average and the pattern kept; clamped to the image range)
 var boostCache={};
 function boosted(t,g){
  if(!t||!(g>1)||(t.userData&&t.userData.lookV4Boost))return t;if(boostCache.hasOwnProperty(t.uuid))return boostCache[t.uuid]||t;boostCache[t.uuid]=null;
  try{var img=t.image;if(!img||!img.width||typeof document==='undefined')return t;var w=img.width,h=img.height,cv=document.createElement('canvas');cv.width=w;cv.height=h;
   var x=cv.getContext('2d');x.drawImage(img,0,0,w,h);var id=x.getImageData(0,0,w,h),d=id.data,m=[0,0,0],n=0,i,j;
   for(i=0;i<d.length;i+=4){if(d[i+3]<8)continue;m[0]+=d[i];m[1]+=d[i+1];m[2]+=d[i+2];n++}if(!n)return t;m=[m[0]/n,m[1]/n,m[2]/n];
   for(i=0;i<d.length;i+=4)for(j=0;j<3;j++)d[i+j]=Math.max(0,Math.min(255,Math.round(m[j]+(d[i+j]-m[j])*g)));
   x.putImageData(id,0,0);var nt=t.clone();nt.image=cv;nt.userData=Object.assign({},t.userData||{},{lookV4Boost:true});nt.needsUpdate=true;boostCache[t.uuid]=nt;st.boosted++;return nt}
  catch(e){return t}
 }
 // the island ground's detail strength and the water's ripple contrast (HolmOldschoolLook.preload calls this before the
 // ground material compiles)
 function tuneGround(TUNE,LOOK3){
  if(!opt||!opt.contrast||st.tuned)return false;st.tuned=true;var c=opt.contrast;
  Object.keys(c.ground||{}).forEach(function(k){if(TUNE&&TUNE[k])TUNE[k]={k:TUNE[k].k*c.ground[k],s:TUNE[k].s}});
  if(LOOK3&&LOOK3.water&&c.water)LOOK3.water=Object.assign({},LOOK3.water,{contrast:LOOK3.water.contrast*c.water});
  return true;
 }
 // the texture's average (in the space the shader reads it) -> the material colour, texture dropped: plain colour
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
 function plain(m){
  var t=m.map,c=t&&meanOf(t);if(!c)return false;
  m.userData.lookV4Map=t;m.map=null;m.color.setRGB(m.color.r*c[0],m.color.g*c[1],m.color.b*c[2]);m.needsUpdate=true;st.plain++;return true;
 }
 function material(o,m){
  if(!m)return;if(m.userData.lookV4){if(m.map)texels(m.map);return}m.userData.lookV4=id;st.materials++;
  if(m.userData.oldschoolGround){texelsOfGround();return}
  var ch=isCharacter(o);
  if(!ch&&opt.plain&&m.map&&opt.plain.test(m.name||'')&&!m.transparent)plain(m);
  if(!ch&&m.map&&opt.contrast&&opt.contrast.model>1){var b=boosted(m.map,opt.contrast.model);if(b!==m.map){m.map=b;m.needsUpdate=true}}
  if(m.map)texels(m.map);
  if(!lit(m)){if(m.isMeshLambertMaterial&&(ch?opt.characterFacet:opt.sceneryFlat))st.skippedLambert++;return}
  if(ch){if(opt.characterFacet>=1){m.flatShading=true;m.needsUpdate=true;st.flat++}else if(opt.characterFacet>0)facet(m,opt.characterFacet);return}
  if(opt.sceneryFlat){m.flatShading=true;m.needsUpdate=true;st.flat++}
 }
 // the island ground's and water's kit textures (HolmOldschoolLook) follow the texture filter
 function texelsOfGround(){if(typeof HolmOldschoolLook!=='undefined'&&HolmOldschoolLook.eachTexture)HolmOldschoolLook.eachTexture(texels)}
 function sweep(){
  if(!opt||typeof scene==='undefined'||!scene||typeof THREE==='undefined')return;st.sweeps++;
  scene.traverse(function(o){if(!o.isMesh&&!o.isSkinnedMesh)return;var ms=o.material;if(Array.isArray(ms))for(var i=0;i<ms.length;i++)material(o,ms[i]);else material(o,ms)});
  texelsOfGround();
 }
 function start(){
  if(st.started||!opt)return;st.started=true;
  if(typeof ClassicPixels!=='undefined'&&ClassicPixels.configure)ClassicPixels.configure(opt.pixels);
  sweep();st.timer=setInterval(sweep,1500);
 }
 function snapshot(){return {option:id,title:opt?opt.title:'Current look (v3)',settings:opt?{pixels:opt.pixels,texels:opt.texels,sceneryFlat:opt.sceneryFlat,characterFacet:opt.characterFacet,plain:!!opt.plain}:null,
  sweeps:st.sweeps,materials:st.materials,flat:st.flat,facet:st.facet,plain:st.plain,textures:st.textures,refiltered:st.refiltered,boosted:st.boosted,groundTuned:st.tuned,skippedLambert:st.skippedLambert,
  pixels:typeof ClassicPixels!=='undefined'?ClassicPixels.snapshot():null}}
 if(opt&&typeof window!=='undefined'&&window.addEventListener){if(document.readyState==='complete')setTimeout(start,0);else window.addEventListener('load',start)}
 return {option:option,settings:settings,start:start,sweep:sweep,tuneGround:tuneGround,snapshot:snapshot,OPTIONS:OPTIONS,CONTRAST:CONTRAST};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmLookV4;
