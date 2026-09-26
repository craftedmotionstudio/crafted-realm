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
 *  - models: textured Blender candidates (UVs + kit textures, tools/build_holm_oldschool_candidates.js) for every
 *    island building, bridge, tree, prop pack and arrival model: the arrival package 'holm-arrival-package-oldschool-v3'
 *    (v3, 2026-09-26: the Lantern Keeper statue v4 on the v3.0 body, pale stone, lantern glass still emissive)
 *    and the folder swaps in SWAPS (each building swaps its model AND its re-measured graph, so hash locks hold).
 *    A swap is used only when every probe file is served (preload); otherwise the previous files stay.
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
  // tools/stage_holm_arrival_package_oldschool.js: v9 with every arrival model textured (graphs identical to v9)
  arrival:{baseUrl:'/.studio-workspaces/holm-arrival-package-oldschool-v3/exports/',exportId:'9348a2aba6c3f2c8'}};
 // Folder swaps (paths after '.studio-workspaces/'): [previous, textured] pairs switched together, probe = files that
 // must be served first. Buildings pair the model folder with its re-measured graph folder (graphs node-identical).
 function building(prev,prevNav,id,file){return {id:id,map:[[prev,'holm-'+id+'-oldschool-v1/candidates/'],[prevNav,'holm-'+id+'-oldschool-navigation-v1/candidates/']],
  probe:['holm-'+id+'-oldschool-v1/candidates/'+file,'holm-'+id+'-oldschool-navigation-v1/candidates/navigation.json']}}
 var SWAPS=[
  building('holm-survival-v3/candidates/','holm-survival-navigation-v3/candidates/','survival','survival.glb'),
  building('holm-warden-keep-v8/candidates/','holm-keep-navigation-v7/candidates/','keep','keep.glb'),
  building('holm-kitchen-wings-v8/candidates/','holm-kitchen-navigation-v6/candidates/','kitchen','kitchen-character.glb'),
  {id:'lodge',map:[['holm-quest-lodge-v6/candidates/','holm-quest-lodge-oldschool-v1/candidates/'],['holm-quest-terrain-navigation-v4/candidates/','holm-quest-lodge-oldschool-navigation-v1/candidates/']],
   probe:['holm-quest-lodge-oldschool-v1/candidates/lodge.glb','holm-quest-lodge-oldschool-navigation-v1/candidates/navigation.json']},
  building('holm-bank-v3/candidates/','holm-bank-navigation-v3/candidates/','bank','bank.glb'),
  building('holm-mage-v3/candidates/','holm-mage-navigation-v3/candidates/','mage','mage.glb'),
  building('holm-lastlight-v3/candidates/','holm-lastlight-navigation-v3/candidates/','lastlight','lastlight.glb'),
  building('holm-quarry-v3/candidates/','holm-quarry-navigation-v3/candidates/','quarry','quarry.glb'),
  building('holm-haven-v3/candidates/','holm-haven-navigation-v3/candidates/','haven','haven.glb'),
  building('holm-cavern-v1/candidates/','holm-cavern-navigation-v1/candidates/','cavern','cavern.glb'),
  {id:'trees',map:[['holm-tree-family-v3/candidates/','holm-tree-family-oldschool-v1/candidates/']],
   probe:['oak','birch','coastal-pine','meadow-tuft','creek-reeds'].map(function(n){return 'holm-tree-family-oldschool-v1/candidates/'+n+'.glb'})},
  {id:'bridges',map:[['holm-island-bridges-v2/candidates/','holm-island-bridges-oldschool-v1/candidates/']],
   probe:['manifest.json','timber_teaching_bridge.glb','stone_village_bridge.glb'].map(function(n){return 'holm-island-bridges-oldschool-v1/candidates/'+n})},
  {id:'props1',map:[['holm-props-v1/candidates/','holm-props1-oldschool-v1/candidates/']],probe:['holm-props1-oldschool-v1/candidates/props.glb']},
  {id:'props3',map:[['holm-props-v3/candidates/','holm-props3-oldschool-v1/candidates/']],probe:['holm-props3-oldschool-v1/candidates/props.glb']},
  {id:'props5',map:[['holm-props-v5/candidates/','holm-props5-oldschool-v1/candidates/']],probe:['holm-props5-oldschool-v1/candidates/props.glb']}];
 var verified=[];
 // void + light (tuned against Bible_References, see docs/rebuild/HOLM_OLDSCHOOL_LOOK_2026-09-25.md)
 // hemi .82 + a sun a little higher (rollout review 2026-09-26): floors and interiors keep the previous look's brightness
 // (the first pass's .62 fill left the Guide House floor ~20% darker), walls still shade by facing
 var SCENE={fogNear:24,fogFar:32,background:0x000000,hemiSky:0xd8dccf,hemiGround:0x6f6a58,hemi:.82,sun:1.0,sunColor:0xfff0d8,sunPos:[60,60,52]};
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
  // which textured candidates are served here (the published copies in production); each swap is all-or-nothing
  var ws=typeof HolmIsland!=='undefined'?HolmIsland.asset('/.studio-workspaces/'):'/.studio-workspaces/';
  var probes=typeof fetch!=='function'?Promise.resolve():Promise.all(SWAPS.map(function(s){
   return Promise.all(s.probe.map(function(p){return fetch(ws+p,{method:'HEAD',cache:'no-store'}).then(function(r){return r.ok},function(){return false})}))
    .then(function(ok){if(ok.every(Boolean))verified.push(s);else console.warn('[HolmOldschoolLook] '+s.id+' textured candidate not served; previous model kept')})}));
  if(!loading)loading=Promise.all(Object.keys(GROUND).map(function(k){return loadOne(THREE,GROUND[k])}).concat([loadOne(THREE,'water'),kit,probes])).then(function(){return true});
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
 // a model or data URL as the island loaders build it -> the textured candidate's URL when that swap is verified
 function url(u){if(!on||typeof u!=='string')return u;verified.forEach(function(s){s.map.forEach(function(m){if(u.indexOf(m[0])>=0)u=u.split(m[0]).join(m[1])})});return u}
 function swapped(id){return verified.some(function(s){return s.id===id})}
 function snapshot(){return {look:on?'oldschool':'previous',active:active,textures:Object.keys(tex),stats:stats,arrival:arrivalPackage(),swaps:verified.map(function(s){return s.id})}}
 return {enabled:enabled,preload:preload,groundMaterial:groundMaterial,restyleTrail:restyleTrail,waterTexture:waterTexture,activate:activate,deactivate:deactivate,
  voidActive:voidActive,fogRange:fogRange,prepareModel:prepareModel,arrivalPackage:arrivalPackage,url:url,swapped:swapped,snapshot:snapshot,
  TUNE:TUNE,SCENE:SCENE,ASSETS:ASSETS,SWAPS:SWAPS};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmOldschoolLook;
