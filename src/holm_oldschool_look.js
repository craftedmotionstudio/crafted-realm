/* Tutor's Holm old-school look (world look pass 2026-09-25). Owner: "this game has to feel a little bit more old
 * school medieval, like old school RuneScape ... it does feel a little bit too polished ... a cozy medieval old school
 * RuneScape style game."
 * One switch for the island's 2004-style rendering, all our own assets (texture kit: tools/build_oldschool_textures.js):
 *  - ground: unlit, gouraud light baked per vertex from the height map, one blended underlay colour per tile, and the
 *    kit's low-res ground textures (grass speckle, worn-path earth, creek mud, sand, rock) multiplied in as detail
 *    (HolmOverhaulGround.chunkOldschool + groundMaterial here);
 *  - water: the pale grey-blue kit water texture drifting slowly (HolmArrivalWater reads waterTexture());
 *  - scene: black void past the draw distance (fogRange(), used by the game loop), a lower side sun and a dimmer sky
 *    fill so hills and walls shade like the old client; no cast shadows, no post effects;
 *  - buildings: textured Blender candidates (UVs + kit textures) for the Guide House (arrival package
 *    'holm-arrival-package-oldschool-v1') and the survival camp ('holm-survival-oldschool-v1'), each with its
 *    re-measured navigation graph, so the hash locks stay valid.
 * Switch: GameConfig.holmOldschoolLook (default on in this branch); ?oldschool=0 / ?oldschool=1 overrides for one
 * session. Off = the previous look, byte for byte the old code paths. */
var HolmOldschoolLook=(function(){
 'use strict';
 var qs=typeof location!=='undefined'?new URLSearchParams(location.search):new URLSearchParams('');
 var cfg=typeof GameConfig!=='undefined'?GameConfig:{};
 var on=qs.has('oldschool')?qs.get('oldschool')!=='0':cfg.holmOldschoolLook!==false;
 var KIT='assets/textures/oldschool/';
 // kit means (assets/textures/oldschool/kit.json): the ground divides each detail texture by its mean, so the
 // textures add pattern without moving the tile colour
 var GROUND={grassA:'grass_a',grassB:'grass_b',sand:'sand',rock:'rock',earth:'mud',path:'dirt'};
 var MEAN={grass_a:[.8211,.8479,.7621],grass_b:[.8424,.8424,.7588],sand:[.9027,.881,.8353],rock:[.8011,.8011,.7685],dirt:[.8423,.8091,.7599],mud:[.8137,.7912,.7348]};
 // detail strength and world scale (tiles per texture repeat) per ground texture
 var TUNE={grassA:{k:1,s:1.6},grassB:{k:.7,s:3.3},sand:{k:.85,s:2},rock:{k:.9,s:2},earth:{k:.9,s:1.6},path:{k:.95,s:1.5}};
 // the textured Blender candidates this look switches to (each with its own navigation graph / package export)
 var ASSETS={
  // tools/stage_holm_arrival_package_oldschool.js: v9 with the textured Guide House (graphs node-identical to v9)
  arrival:{baseUrl:'/.studio-workspaces/holm-arrival-package-oldschool-v1/exports/',exportId:'3b0e65f7729fa27b'},
  // docs/rebuild/holm-overhaul/oldschool/survival.textures.json + buildings/survival-oldschool.nav.json (graph node-identical to v3)
  buildings:{survival:{graph:'holm-survival-oldschool-navigation-v1/candidates/navigation.json',model:'holm-survival-oldschool-v1/candidates/survival.glb'}}};
 // void + light (tuned against Bible_References, see docs/rebuild/HOLM_OLDSCHOOL_LOOK_2026-09-25.md)
 var SCENE={fogNear:24,fogFar:32,background:0x000000,hemiSky:0xd8dccf,hemiGround:0x6f6a58,hemi:.62,sun:1.0,sunColor:0xfff0d8,sunPos:[60,48,52]};
 var tex={},loading=null,groundMat=null,active=false,saved=null,stats={groundMaterials:0,textures:0,models:0,maps:0};
 function enabled(){return on}
 function loadOne(THREE,name){
  if(tex[name])return Promise.resolve(tex[name]);
  return new Promise(function(res,rej){new THREE.TextureLoader().load(KIT+name+'.png',function(t){
   t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.LinearMipmapLinearFilter;
   if(typeof renderer!=='undefined'&&renderer&&renderer.capabilities)t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
   if(THREE.LinearEncoding!==undefined)t.encoding=THREE.LinearEncoding;   // the game draws colours as display values
   t.needsUpdate=true;tex[name]=t;stats.textures++;res(t)},undefined,function(e){rej(Error('[HolmOldschoolLook] missing texture '+name))})});
 }
 // every kit texture the island needs, before the first ground chunk or water is built
 function preload(THREE){
  if(!on)return Promise.resolve(false);
  // kit.json is the single source of the texture means (fallbacks above only if it cannot be read)
  var kit=typeof fetch==='function'?fetch(KIT+'kit.json').then(function(r){return r.ok?r.json():null}).then(function(k){
   if(k&&k.textures)Object.keys(MEAN).forEach(function(n){if(k.textures[n]&&Array.isArray(k.textures[n].mean))MEAN[n]=k.textures[n].mean})}).catch(function(){}):Promise.resolve();
  if(!loading)loading=Promise.all(Object.keys(GROUND).map(function(k){return loadOne(THREE,GROUND[k])}).concat([loadOne(THREE,'water'),kit])).then(function(){return true});
  return loading;
 }
 function v3(a){return 'vec3('+a.map(function(n){return n.toFixed(4)}).join(',')+')'}
 function groundMaterial(THREE){
  if(groundMat&&!groundMat.__disposed)return groundMat;
  return groundMat=makeGround(THREE);
 }
 function makeGround(THREE){
  var m=new THREE.MeshBasicMaterial({vertexColors:true});
  m.userData.oldschoolGround=true;stats.groundMaterials++;
  var uniforms={};Object.keys(GROUND).forEach(function(k){uniforms['os_'+k]={value:tex[GROUND[k]]||null}});
  m.onBeforeCompile=function(shader){
   Object.keys(uniforms).forEach(function(k){if(!uniforms[k].value)uniforms[k].value=tex[GROUND[k.slice(3)]]||null;shader.uniforms[k]=uniforms[k]});
   shader.vertexShader='attribute vec4 groundMix;\nvarying vec4 vGroundMix;\nvarying vec2 vGroundXZ;\n'+shader.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\nvGroundMix = groundMix;\nvGroundXZ = position.xz;');
   var decl='varying vec4 vGroundMix;\nvarying vec2 vGroundXZ;\n'+Object.keys(GROUND).map(function(k){return 'uniform sampler2D os_'+k+';'}).join('\n')+'\n'+
    'vec3 osDetail(sampler2D t, vec2 uv, vec3 mean, float k){ return mix(vec3(1.0), texture2D(t, uv).rgb / mean, k); }\n';
   function d(k,off){var q=TUNE[k];return 'osDetail(os_'+k+', vGroundXZ / '+q.s.toFixed(3)+(off?' + '+off:'')+', '+v3(MEAN[GROUND[k]])+', '+q.k.toFixed(3)+')'}
   shader.fragmentShader=decl+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+
    'float osGrass = clamp(1.0 - dot(vGroundMix, vec4(1.0)), 0.0, 1.0);\n'+
    'vec3 osGround = '+d('grassA')+' * '+d('grassB','vec2(0.37, 0.11)')+' * osGrass\n'+
    '  + '+d('sand')+' * vGroundMix.x + '+d('rock')+' * vGroundMix.y\n'+
    '  + '+d('earth')+' * vGroundMix.z + '+d('path')+' * vGroundMix.w;\n'+
    'diffuseColor.rgb *= osGround;');
  };
  m.customProgramCacheKey=function(){return 'holm-oldschool-ground-v1'};
  var dispose=m.dispose.bind(m);m.dispose=function(){m.__disposed=true;dispose()};
  return m;
 }
 // the arrival trail (a ribbon drawn over the ground): worn-path earth, lit by the same baked ground light
 function restyleTrail(THREE,mesh){
  if(!on||!mesh||!mesh.geometry||typeof HolmOverhaulGround==='undefined')return false;
  var g=mesh.geometry,pos=g.attributes.position,col=g.attributes.color,n=pos.count,mix=new Float32Array(n*4),L=HolmOverhaulGround.LOOK,k=L.scale/255;
  for(var i=0;i<n;i++){var li=HolmOverhaulGround.lightAt(pos.getX(i),pos.getZ(i)),e=col?Math.min(1.08,col.getX(i)/.425):1;
   if(col)col.setXYZ(i,Math.min(1,L.dirt[0]*k*li*e),Math.min(1,L.dirt[1]*k*li*e),Math.min(1,L.dirt[2]*k*li*e));mix[i*4+3]=1}
  if(col)col.needsUpdate=true;g.setAttribute('groundMix',new THREE.BufferAttribute(mix,4));
  var old=mesh.material;mesh.material=makeGround(THREE);if(old&&old.dispose)old.dispose();return true;
 }
 function waterTexture(){return on?tex.water||null:null}
 // Island scene: black void past the draw distance, a lower side sun and a dimmer sky fill (restored on leave).
 function lights(sc){var h=null,s=null;sc.children.forEach(function(o){if(o.isHemisphereLight&&!h)h=o;if(o.isDirectionalLight&&!s)s=o});return {h:h,s:s}}
 function activate(sc){
  if(!on||active||!sc)return false;var L=lights(sc);active=true;
  saved={hemi:L.h?{sky:L.h.color.getHex(),ground:L.h.groundColor.getHex(),i:L.h.intensity}:null,sun:L.s?{c:L.s.color.getHex(),i:L.s.intensity,p:L.s.position.toArray()}:null};
  if(L.h){L.h.color.setHex(SCENE.hemiSky);L.h.groundColor.setHex(SCENE.hemiGround);L.h.intensity=SCENE.hemi}
  if(L.s){L.s.color.setHex(SCENE.sunColor);L.s.intensity=SCENE.sun;L.s.position.set(SCENE.sunPos[0],SCENE.sunPos[1],SCENE.sunPos[2])}
  return true;
 }
 function deactivate(sc){
  if(!active)return;active=false;var L=lights(sc||scene);
  if(saved&&saved.hemi&&L.h){L.h.color.setHex(saved.hemi.sky);L.h.groundColor.setHex(saved.hemi.ground);L.h.intensity=saved.hemi.i}
  if(saved&&saved.sun&&L.s){L.s.color.setHex(saved.sun.c);L.s.intensity=saved.sun.i;L.s.position.fromArray(saved.sun.p)}
  saved=null;
 }
 // the game loop's fog target while the island look is on: black, from a little past the camera's own distance
 function voidActive(){return on&&active}
 function fogRange(camDist){return {near:camDist+SCENE.fogNear,far:camDist+SCENE.fogFar,color:SCENE.background}}
 // textured Blender candidates: crisp texels up close, mip-mapped far away, colour maps as display values
 function prepareModel(THREE,root){
  if(!on||!root)return 0;var n=0;
  root.traverse(function(o){if(!o.isMesh)return;[].concat(o.material).forEach(function(m){if(!m||!m.map)return;var t=m.map;
   t.magFilter=THREE.NearestFilter;t.minFilter=THREE.LinearMipmapLinearFilter;if(THREE.LinearEncoding!==undefined)t.encoding=THREE.LinearEncoding;
   if(typeof renderer!=='undefined'&&renderer&&renderer.capabilities)t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
   t.needsUpdate=true;m.needsUpdate=true;n++})});
  stats.models++;stats.maps+=n;return n;
 }
 function arrivalPackage(){return on&&ASSETS.arrival.exportId?ASSETS.arrival:null}
 function building(id){return on&&ASSETS.buildings[id]||null}
 function snapshot(){return {look:on?'oldschool':'previous',active:active,textures:Object.keys(tex),stats:stats,arrival:arrivalPackage(),buildings:on?Object.keys(ASSETS.buildings):[]}}
 return {enabled:enabled,preload:preload,groundMaterial:groundMaterial,restyleTrail:restyleTrail,waterTexture:waterTexture,activate:activate,deactivate:deactivate,
  voidActive:voidActive,fogRange:fogRange,prepareModel:prepareModel,arrivalPackage:arrivalPackage,building:building,snapshot:snapshot,
  TUNE:TUNE,SCENE:SCENE,ASSETS:ASSETS};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmOldschoolLook;
