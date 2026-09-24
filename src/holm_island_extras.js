/* Tutor's Holm island draft content beyond the arrival package (finish goal M4.1, Sept 13 base), for the
 * isolated ?holmIsland=1 mode of HolmArrivalQA. loadData() fetches the navigation inputs first (building graphs,
 * habitat trunk blockers, bridges) so the provider composes its graph before any save restores; load() then
 * places the Blender keep, bakehouse and Quest Lodge (+ its bay foundation), each model's bytes checked against
 * the hash its measured graph was made from, the tree-family-v3 habitat and the two creek bridges. Everything
 * is clickable ground; nothing is published. */
var HolmIslandExtras=(function(){
 'use strict';
 var WS='/.studio-workspaces/';
 var BUILDINGS=[
  {id:'keep',graph:WS+'holm-keep-navigation-v4/candidates/navigation.json',model:WS+'holm-warden-keep-v5/candidates/keep.glb'},
  {id:'bakehouse',graph:WS+'holm-kitchen-navigation-v3/candidates/navigation.json',model:WS+'holm-kitchen-wings-v5/candidates/kitchen-character.glb'},
  {id:'lodge',graph:WS+'holm-quest-terrain-navigation-v1/candidates/navigation.json',model:WS+'holm-quest-lodge-v3/candidates/lodge.glb',
   extra:{url:WS+'holm-quest-foundation-v1/candidates/foundation.glb',placement:WS+'holm-quest-placement-v1/candidates/placement.json'}}];
 var TREES=WS+'holm-tree-family-v3/candidates/',HABITAT=WS+'holm-habitat-v1/working/vegetation.json';
 var BRIDGES='/docs/rebuild/holm-overhaul/island-bridges.json',BRIDGE_MODELS=WS+'holm-island-bridges-v1/candidates/';
 var TRUNK={oak:.45,birch:.3,'coastal-pine':.35};
 function need(ok,msg){if(!ok)throw Error('[HolmIslandExtras] '+msg)}
 async function bytes(url){var r=await fetch(url,{cache:'no-store'});need(r.ok,'missing '+url);return r.arrayBuffer()}
 async function json(url){return JSON.parse(new TextDecoder().decode(await bytes(url)))}
 async function sha(buf){var h=new Uint8Array(await crypto.subtle.digest('SHA-256',buf));return Array.from(h).map(function(n){return n.toString(16).padStart(2,'0')}).join('')}
 function parse(T,buf){return new Promise(function(res,rej){new T.GLTFLoader().parse(buf,'',res,rej)})}
 // same colour rule as the arrival owner: this game renders without colour management
 function linearMaps(T,n){(Array.isArray(n.material)?n.material:[n.material]).forEach(function(m){if(m&&m.map&&T.LinearEncoding!==undefined){m.map.encoding=T.LinearEncoding;m.needsUpdate=true}})}
 async function loadData(){
  var buildings=[];
  for(var i=0;i<BUILDINGS.length;i++){var b=BUILDINGS[i],graph=await json(b.graph),p=graph.placement||graph.origin;
   buildings.push({id:b.id,graph:graph,placement:{x:p.x,y:p.y,z:p.z},source:b})}
  var veg=(await json(HABITAT)).placements,blockers=[];
  veg.forEach(function(p){var r=TRUNK[p.asset];if(r)blockers.push({id:'habitat:'+p.id,mode:'overlap',x0:p.x-r*p.scale,x1:p.x+r*p.scale,z0:p.z-r*p.scale,z1:p.z+r*p.scale})});
  return {buildings:buildings,habitat:veg,blockers:blockers,bridges:(await json(BRIDGES)).bridges};
 }
 async function load(o){
  var T=o.THREE,scene=o.scene,W=o.WORLD,sample=o.sample,data=o.data,roots=[],mixers=[],grounds=[];
  function prepare(root){root.traverse(function(n){if(!n.isMesh)return;n.castShadow=true;n.receiveShadow=true;linearMaps(T,n);
   n.userData.islandGround=true;W.grounds.push(n);W.clickables.push(n);grounds.push(n)})}
  function place(root,x,y,z,yaw){var g=new T.Group();g.position.set(x,y,z);g.rotation.y=yaw||0;g.add(root);scene.add(g);roots.push(g);prepare(root);return g}
  // ---- buildings, each bound to the graph measured from its exact bytes ----
  for(var i=0;i<data.buildings.length;i++){var b=data.buildings[i],src=b.source,buf=await bytes(src.model),p=b.placement;
   need(await sha(buf)===b.graph.modelSha256,b.id+' model bytes differ from the model its navigation graph was measured on');
   var gltf=await parse(T,buf);place(gltf.scene,p.x,p.y,p.z,0).name='island-building-'+b.id;
   if(gltf.animations&&gltf.animations.length){var mx=new T.AnimationMixer(gltf.scene);gltf.animations.forEach(function(c){if(!/^Door/.test(c.name))mx.clipAction(c).play()});mixers.push(mx)}
   if(src.extra){var pl=await json(src.extra.placement),fb=await bytes(src.extra.url);need(await sha(fb)===pl.foundationSha256,b.id+' foundation bytes changed');
    place((await parse(T,fb)).scene,pl.world.x,pl.world.y,pl.world.z,0)}
  }
  // ---- habitat: tree family v3 on the Sept 13 placements, grounded like the Studio, breeze playing ----
  var veg=data.habitat,names=Array.from(new Set(veg.map(function(p){return p.asset}))),srcs={};
  for(var j=0;j<names.length;j++){var g2=await parse(T,await bytes(TREES+names[j]+'.glb'));g2.scene.updateMatrixWorld(true);
   srcs[names[j]]={gltf:g2,minY:new T.Box3().setFromObject(g2.scene).min.y,breeze:g2.animations.filter(function(c){return c.name==='Breeze'})[0]}}
  veg.forEach(function(p,k){var s=srcs[p.asset],root=s.gltf.scene.clone(true),y=sample(p.x,p.z);if(!Number.isFinite(y))return;
   var g=new T.Group();g.name='island-habitat-'+p.id;g.position.set(p.x,y-s.minY*p.scale,p.z);g.rotation.y=p.yaw;g.scale.setScalar(p.scale);g.add(root);scene.add(g);roots.push(g);
   root.traverse(function(n){if(n.isMesh){n.castShadow=true;n.receiveShadow=true;linearMaps(T,n)}});
   if(s.breeze){var mx=new T.AnimationMixer(root);mx.clipAction(s.breeze).play();mx.update((k*.371)%s.breeze.duration);mixers.push(mx)}
  });
  // ---- bridges, built to the measured deck tiles ----
  var models=(await json(BRIDGE_MODELS+'manifest.json')).bridges;
  for(var q=0;q<models.length;q++){var m=models[q],gb=await parse(T,await bytes(BRIDGE_MODELS+m.file));place(gb.scene,m.centre[0],0,m.centre[2],0).name='island-bridge-'+m.id}
  function update(dt){mixers.forEach(function(mm){mm.update(dt)})}
  function dispose(){
   grounds.forEach(function(n){[W.grounds,W.clickables].forEach(function(a){var ix=a.indexOf(n);if(ix>=0)a.splice(ix,1)})});
   roots.forEach(function(r){scene.remove(r);r.traverse(function(n){if(n.geometry)n.geometry.dispose()})});mixers.forEach(function(mm){mm.stopAllAction()});roots=[];mixers=[];
  }
  return {update:update,dispose:dispose,stats:{roots:roots.length,habitat:veg.length,buildings:data.buildings.length,bridges:models.length}};
 }
 return {loadData:loadData,load:load};
})();
