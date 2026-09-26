/* Tutor's Holm island draft content beyond the arrival package (finish goal M4.1, Sept 13 base), for the
 * isolated ?holmIsland=1 mode of HolmArrivalQA. loadData() fetches the navigation inputs first (building graphs,
 * habitat trunk blockers, bridges) so the provider composes its graph before any save restores; load() then
 * places the Blender keep, bakehouse and Quest Lodge (+ its bay foundation), each model's bytes checked against
 * the hash its measured graph was made from, the tree-family-v3 habitat and the two creek bridges. Everything
 * is clickable ground; nothing is published. */
var HolmIslandExtras=(function(){
 'use strict';
 var WS=(typeof HolmIsland!=='undefined'?HolmIsland.asset('/.studio-workspaces/'):'/.studio-workspaces/');
 var BUILDINGS=[
  {id:'keep',graph:WS+'holm-keep-navigation-v7/candidates/navigation.json',model:WS+'holm-warden-keep-v8/candidates/keep.glb'},
  {id:'bakehouse',graph:WS+'holm-kitchen-navigation-v6/candidates/navigation.json',model:WS+'holm-kitchen-wings-v8/candidates/kitchen-character.glb'},
  {id:'lodge',graph:WS+'holm-quest-terrain-navigation-v4/candidates/navigation.json',model:WS+'holm-quest-lodge-v6/candidates/lodge.glb',
   extra:{url:WS+'holm-quest-foundation-v1/candidates/foundation.glb',placement:WS+'holm-quest-placement-v1/candidates/placement.json'}}]
  // M4.4: new Blender buildings, graphs measured by tools/blender/extract_holm_building_navigation.py
  .concat([['survival','Survival_','survival',3],['quarry','Quarry_','mine',3],['bank','Bank_','bank',3],['mage','Mage_','mage',3],['haven','Haven_','ferry',3],['lastlight','Lastlight_','lastlight',3],['cavern','Cavern_',null]].map(function(r){
   return {id:r[0],prefix:r[1],plan:r[2],graph:WS+'holm-'+r[0]+'-navigation-v'+(r[3]||1)+'/candidates/navigation.json',model:WS+'holm-'+r[0]+'-v'+(r[3]||1)+'/candidates/'+r[0]+'.glb'}}));
 var TREES=WS+'holm-tree-family-v3/candidates/',HABITAT=WS+'holm-habitat-v4/working/vegetation.json',PROPS=WS+'holm-props-v1/candidates/props.glb';
 // M4.5 habitat v2: the tree family's own files, everything else (shrubs, rocks, flowers, logs, signposts) from the prop pack
 var TREE_FAMILY={oak:1,birch:1,'coastal-pine':1,'meadow-tuft':1,'creek-reeds':1};
 var LADDERS=(typeof HolmIsland!=='undefined'?HolmIsland.asset('/docs/rebuild/holm-overhaul/island-ladders.json'):'/docs/rebuild/holm-overhaul/island-ladders.json'),BRIDGES=(typeof HolmIsland!=='undefined'?HolmIsland.asset('/docs/rebuild/holm-overhaul/island-bridges.json'):'/docs/rebuild/holm-overhaul/island-bridges.json'),BRIDGE_MODELS=WS+'holm-island-bridges-v2/candidates/';
 var TRUNK={oak:.45,birch:.3,'coastal-pine':.35};
 // M4.2: authored service meshes -> measured stance (graph node) -> the existing lesson handler. The bakehouse
 // stations come from holm-kitchen-services-v1 (measured on this exact graph); the lodge from its graph targets.
 var SERVICES={
  bakehouse:[
   {prefix:'Kitchen_SupplyBuckets_',node:'-2:1:0',label:'Take bucket',call:['HolmTeachingKitchen','takeBucket'],option:'Take-from',name:'Bucket rack',examine:'Empty buckets hang here, ready for flour and water.'},
   {prefix:'Kitchen_Pantry_',node:'4:-4:0',label:'Fill bucket with flour',call:['HolmTeachingKitchen','fillFlour'],option:'Fill-bucket',name:'Flour bin',examine:'A bin of fine milled flour.'},
   {prefix:'Kitchen_SupplyWater',node:'-1:2:0',label:'Fill bucket with water',call:['HolmTeachingKitchen','fillWater'],option:'Fill-bucket',name:'Water butt',examine:'Rainwater, clean enough for baking.'},
   {prefix:'Kitchen_SupplyDoughBowl_',node:'-2:0:0',label:'Take dough',call:['HolmTeachingKitchen','takeDough'],option:'Take-dough',name:'Proving bowl',examine:'Dough left to rise under a damp cloth.'},
   {prefix:'Kitchen_Oven_',node:'-4:-3:1',label:'Cook',call:['HolmTeachingKitchen','cookAtRange'],option:'Cook',name:'Oven',examine:'A brick bread oven, banked and hot.'},
   {prefix:'Kitchen_RecipeBoard_',node:'0:-2:1',label:'Read recipe',call:['HolmTeachingKitchen','readRecipe'],option:'Read',name:'Recipe board',examine:'Cook Hettie\'s bread recipe, chalked up plain.'}],
  lodge:[
   {prefix:'Lodge_FurnishingBoard_',target:'board',label:'Study quest board',call:['HolmQuestLodge','studyBoard'],option:'Study',name:'Quest board',examine:'Notices of work that wants doing across the Holm.'},
   {prefix:'Lodge_FurnishingMap_',target:'map',label:'Study region chart',call:['HolmQuestLodge','studyChart'],option:'Study',name:'Region chart',examine:'A chart of the lands beyond the Holm.'}],
  // M4.4 stations; lesson handlers are rebound to them in M5 (a click without a call walks there and says so)
  bank:[{prefix:'Bank_ServiceCounter_',target:'counter',label:'Use bank counter',call:['UI','openBank'],option:'Bank',name:'Bank counter',examine:'The teller keeps her ledgers here.'},{prefix:'Bank_ServiceVault_',target:'vault',label:'Open vault',call:['UI','openBank'],option:'Bank',name:'Vault',examine:'Iron-banded, and very heavy.'},{prefix:'Bank_ServiceShelves_',target:'shop',label:'Browse goods',option:'Browse',name:'Goods shelves',examine:'Odds and ends, not yet for sale.'}],
  survival:[{prefix:'Survival_ServiceTools_',target:'tools',label:'Tool rack',option:'Search',name:'Tool rack',examine:'Spare tools for the camp.'},{prefix:'Survival_ServiceFirePit_',target:'fire',label:'Fire ring',option:'Search',name:'Fire ring',examine:'A ring of blackened stones.'},{prefix:'Survival_ServiceLogPile_',target:'logs',label:'Log pile',option:'Search',name:'Log pile',examine:'Split logs, stacked to dry.'},{prefix:'Survival_ServiceFishing_',target:'fishing',label:'Fishing spot',proxy:false,option:'Inspect',name:'Fishing stage',examine:'Reeds and a marker pole at the end of the fishing stage.'}],
  quarry:[{prefix:'Quarry_ServiceShaft_',target:'shaft',label:'Climb-down shaft ladder',ladder:'quarry-shaft',option:'Climb-down',name:'Shaft ladder',examine:'A long ladder down into the ore workings.'},{prefix:'Quarry_ServiceWinch_',target:'winch',label:'Winch',option:'Inspect',name:'Winch',examine:'It hauls ore buckets up from the cavern.'},{prefix:'Quarry_ServiceBench_',target:'bench',label:'Repair bench',option:'Inspect',name:'Repair bench',examine:'Pick heads and hammer handles waiting to be mended.'}],
  mage:[{prefix:'Mage_ServiceRuneTable_',target:'runes',label:'Rune table',option:'Study',name:'Rune table',examine:'Runes laid out in rows, air to chaos.'},{prefix:'Mage_ServiceLectern_',target:'lectern',label:'Lectern',option:'Study',name:'Lectern',examine:'A heavy book of spells lies open.'},{prefix:'Mage_ServiceTelescope_',target:'observatory',label:'Telescope',option:'Look-through',name:'Telescope',examine:'A brass telescope pointed at the sky.'}],
  cavern:[{prefix:'Cavern_ServiceLadderUp_',target:'ladder',label:'Climb-up ladder',ladder:'quarry-shaft',option:'Climb-up',name:'Ladder',examine:'The shaft ladder back up to the Quarry Gate.'}],
 haven:[{prefix:'Haven_ServiceBoat_',target:'boat',label:'Ferry',call:['HolmIslandCurriculum','board'],option:'Board',name:'Ferry',examine:'Ferryman Tobin\'s skiff, tarred and sound.'},{prefix:'Haven_ServiceNotice_',target:'notice',label:'Departure notice',option:'Read',name:'Departure notice',examine:'Sailings to the mainland, once Lastlight burns.'}],
 lastlight:[{prefix:'Lastlight_ServiceStores_',target:'stores',label:'Repair stores',option:'Search',name:'Repair stores',examine:'Oil, wicks and spare glass for the lamp.'},
  {prefix:'Lastlight_ServiceLadder1Up_',target:'ladder1-foot',climb:'ladder1',end:'foot',label:'Climb-up ladder',option:'Climb-up',name:'Ladder',examine:'A steep ladder inside the tower.'},{prefix:'Lastlight_ServiceLadder1Down_',target:'ladder1-top',climb:'ladder1',end:'top',label:'Climb-down ladder',option:'Climb-down',name:'Ladder',examine:'A steep ladder inside the tower.'},
  {prefix:'Lastlight_ServiceLadder2Up_',target:'ladder2-foot',climb:'ladder2',end:'foot',label:'Climb-up ladder',option:'Climb-up',name:'Ladder',examine:'A steep ladder inside the tower.'},{prefix:'Lastlight_ServiceLadder2Down_',target:'ladder2-top',climb:'ladder2',end:'top',label:'Climb-down ladder',option:'Climb-down',name:'Ladder',examine:'A steep ladder inside the tower.'},
  {prefix:'Lastlight_ServiceLadder3Up_',target:'ladder3-foot',climb:'ladder3',end:'foot',label:'Climb-up ladder',option:'Climb-up',name:'Ladder',examine:'A steep ladder inside the tower.'},{prefix:'Lastlight_ServiceLadder3Down_',target:'ladder3-top',climb:'ladder3',end:'top',label:'Climb-down ladder',option:'Climb-down',name:'Ladder',examine:'A steep ladder inside the tower.'},
  {prefix:'Lastlight_ServiceLever_',target:'lever',label:'Pull beacon lever',call:['HolmIslandLessons','pullLever'],option:'Pull',name:'Beacon lever',examine:'A heavy bronze lever that works the lamp.'},{prefix:'Lastlight_ServiceBeacon_',target:'beacon',label:'Beacon lamp',option:'Inspect',name:'Beacon lamp',examine:'The great lamp of Lastlight.'}]};
 // Roof cutaways, as each building's Sept 13 walking study proved them: roof hidden, upper parts above the
 // player's floor hidden, shell walls clipped just above the player while inside.
 var CUTAWAY={
  keep:{roof:/^Keep_Roof_/,upper:/^Keep_(Upper|Tower)_/,clip:/^Keep_(Shell|Upper_Shell|GroundFront)_/,lift:1.25},
  bakehouse:{roof:/^Kitchen_(Roof|Chimney)_/,upper:/^Kitchen_Upper/,clip:/^Kitchen_(Shell|UpperShell|GroundFront|Glazing)_/,lift:.5},
  lodge:{roof:/^Lodge_(Roof|Chimney)/,upper:/^Lodge_Upper(?!.*Stair)/,clip:/^Lodge_(GroundShell|UpperShell|Glazing)/,lift:.5}};
 // M4.4 buildings follow the brief's naming contract: <Prefix>_Roof / _Upper / _Shell / _UpperShell / _Glazing
 ['Survival','Quarry','Bank','Mage','Haven','Lastlight','Cavern'].forEach(function(p){CUTAWAY[p.toLowerCase()]={roof:new RegExp('^'+p+'_Roof'),upper:new RegExp('^'+p+'_Upper'),clip:new RegExp('^'+p+'_(Shell|UpperShell|Glazing)'),lift:.5}});
 function need(ok,msg){if(!ok)throw Error('[HolmIslandExtras] '+msg)}
 // the old-school look's textured candidates (trees, prop pack, bridges, buildings), when served
 function lookUrl(u){return typeof HolmOldschoolLook!=='undefined'?HolmOldschoolLook.url(u):u}
 async function bytes(url){var r=await fetch(url,{cache:'no-store'});need(r.ok,'missing '+url);return r.arrayBuffer()}
 async function json(url){return JSON.parse(new TextDecoder().decode(await bytes(url)))}
 async function sha(buf){var h=new Uint8Array(await crypto.subtle.digest('SHA-256',buf));return Array.from(h).map(function(n){return n.toString(16).padStart(2,'0')}).join('')}
 function parse(T,buf){return new Promise(function(res,rej){new T.GLTFLoader().parse(buf,'',res,rej)})}
 // same colour rule as the arrival owner: this game renders without colour management
 // ...and matte like the 2004 client (no specular sheen: Blender's default 0.4-0.5 roughness read as plastic in game)
 function linearMaps(T,n){(Array.isArray(n.material)?n.material:[n.material]).forEach(function(m){if(!m)return;if(m.map&&T.LinearEncoding!==undefined){m.map.encoding=T.LinearEncoding;m.needsUpdate=true}
  // old-school look: kit textures crisp up close, mip-mapped far away
  if(m.map&&typeof HolmOldschoolLook!=='undefined'&&HolmOldschoolLook.enabled()){m.map.magFilter=T.NearestFilter;m.map.minFilter=T.LinearMipmapLinearFilter}if('roughness' in m){m.roughness=1;m.metalness=0;m.needsUpdate=true}})}
 async function loadData(){
  var buildings=[];
  for(var i=0;i<BUILDINGS.length;i++){var b=BUILDINGS[i];
   // old-school look (2026-09-25): the textured Blender candidate and its re-measured graph (same stances, new model hash),
   // swapped as a pair only when both are served (HolmOldschoolLook.preload verified them); otherwise the previous pair
   var gu=lookUrl(b.graph),mu=lookUrl(b.model);if(gu!==b.graph||mu!==b.model)b=Object.assign({},b,{graph:gu,model:mu,look:'oldschool'});
   var graph=await json(b.graph),p=graph.placement||graph.origin;
   buildings.push({id:b.id,graph:graph,placement:{x:p.x,y:p.y,z:p.z},source:b})}
  // Sept 13 habitat trees that a new building now stands on are left out (models and blockers alike): the planned
  // footprint plus a tile of margin, and every tile holding one of the building's floors, stairs or decks.
  var plan=await json((typeof HolmIsland!=='undefined'?HolmIsland.asset('/docs/rebuild/holm-overhaul/plan.json'):'/docs/rebuild/holm-overhaul/plan.json')),built=Object.create(null);
  buildings.forEach(function(b){
   var pl=b.source.plan&&plan.places.filter(function(q){return q.id===b.source.plan})[0];
   if(pl)for(var z=Math.floor(pl.z-pl.d/2)-1;z<=Math.ceil(pl.z+pl.d/2)+1;z++)for(var x=Math.floor(pl.x-pl.w/2)-1;x<=Math.ceil(pl.x+pl.w/2)+1;x++)built[x+','+z]=true;
   if(b.source.plan)b.graph.nodes.forEach(function(n){if(!/Terrain$/.test(n.surface))built[Math.floor(n.x+b.placement.x)+','+Math.floor(n.z+b.placement.z)]=true});
  });
  var hab=await json(HABITAT),radius=hab.blockers||TRUNK;
  var veg=hab.placements.filter(function(p){return !built[Math.floor(p.x)+','+Math.floor(p.z)]}),blockers=[];
  veg.forEach(function(p){var r=radius[p.asset];if(r)blockers.push({id:'habitat:'+p.id,mode:'overlap',x0:p.x-r*p.scale,x1:p.x+r*p.scale,z0:p.z-r*p.scale,z1:p.z+r*p.scale})});
  // M5.1 lesson trees and ore rocks block like habitat trees
  if(typeof HolmIslandLessons!=='undefined')blockers=blockers.concat(await HolmIslandLessons.blockers());
  return {buildings:buildings,habitat:veg,blockers:blockers,bridges:(await json(BRIDGES)).bridges,ladders:(await json(LADDERS)).ladders};
 }
 async function load(o){
  var T=o.THREE,scene=o.scene,W=o.WORLD,sample=o.sample,data=o.data,roots=[],mixers=[],grounds=[];
  function prepare(root){root.traverse(function(n){if(!n.isMesh)return;n.castShadow=true;n.receiveShadow=true;linearMaps(T,n);
   n.userData.islandGround=true;W.grounds.push(n);W.clickables.push(n);grounds.push(n)})}
  function place(root,x,y,z,yaw){var g=new T.Group();g.position.set(x,y,z);g.rotation.y=yaw||0;g.add(root);scene.add(g);roots.push(g);prepare(root);return g}
  // ---- buildings, each bound to the graph measured from its exact bytes ----
  var models={},services=[],clipPlane=new T.Plane(new T.Vector3(0,-1,0),0);
  var proxyMat=new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
  function nameOf(o,prefix){for(var q=o;q;q=q.parent)if(q.name&&q.name.indexOf(prefix)===0)return q.name;return ''}
  for(var i=0;i<data.buildings.length;i++){var b=data.buildings[i],src=b.source,buf=await bytes(src.model),p=b.placement;
   need(await sha(buf)===b.graph.modelSha256,b.id+' model bytes differ from the model its navigation graph was measured on');
   var gltf=await parse(T,buf);place(gltf.scene,p.x,p.y,p.z,0).name='island-building-'+b.id;if(src.look&&typeof HolmOldschoolLook!=='undefined')HolmOldschoolLook.prepareModel(T,gltf.scene);models[b.id]={scene:gltf.scene,placement:p};
   if(gltf.animations&&gltf.animations.length){var mx=new T.AnimationMixer(gltf.scene);gltf.animations.forEach(function(c){
     var a=mx.clipAction(c);
     // the lodge graph was measured with its door open: hold the door at the open pose so walls match walking
     if(/DoorOpenClose$/.test(c.name)){a.setLoop(T.LoopOnce,1);a.clampWhenFinished=true;a.play();a.time=c.duration;a.paused=true}
     else if(!/^Door/.test(c.name))a.play()});mx.update(0);mixers.push(mx)}
   gltf.scene.parent.updateMatrixWorld(true);   // placed group first, so service boxes are in world space
   (SERVICES[b.id]||[]).forEach(function(s){
    var local=s.node||(b.graph.targets.filter(function(t){return t.id===s.target})[0]||{}).nodeId;need(local,b.id+' service '+s.label+' has no stance');
    var info={building:b.id,target:s.target,node:'b:'+b.id+':'+local,call:s.call,label:s.label,option:s.option,name:s.name,examine:s.examine},box=new T.Box3();   // option/name/examine: its old-school menu row (osrs_menu_world.js)
    // ladders: walk to this end's stance, then stand on the other end (measured climbs in the building graph)
    // ladders between buildings (quarry shaft <-> cavern): stand on the other end's measured target
    if(s.ladder){var L=(data.ladders||[]).filter(function(q){return q.id===s.ladder})[0];need(L,b.id+' ladder '+s.ladder+' is not listed');
     var here=L.a[0]===b.id?'a':'b',other=L[here==='a'?'b':'a'],ob=data.buildings.filter(function(x){return x.id===other[0]})[0],ot=ob&&ob.graph.targets.filter(function(t){return t.id===other[1]})[0];
     need(ot&&ot.nodeId,'ladder '+s.ladder+' has no far end');info.climb='b:'+other[0]+':'+ot.nodeId;if(L.downFrom===here&&L.notifyDown)info.notify=L.notifyDown}
    if(s.climb){var cl=(b.graph.climbs||[]).filter(function(c){return c.id===s.climb})[0],to=cl&&cl[s.end==='top'?'footId':'topId'];need(to,b.id+' ladder '+s.climb+' is not measured');info.climb='b:'+b.id+':'+to}
    gltf.scene.traverse(function(n){if(!n.isMesh||!nameOf(n,s.prefix))return;
     n.userData.kind='island_service';n.userData.label=s.label;n.userData.islandService=info;services.push(n);box.expandByObject(n)});
    need(!box.isEmpty(),b.id+' service '+s.label+' has no authored mesh');
    // small or tucked-away stations (the proving bowl behind the worktable) get an invisible hit box, as ladders do.
    // Not the fishing stage's reeds and marker pole (proxy:false, 2026-09-25 world fixes): the lesson's net-fishing
    // ripple now floats between them, off the stage's open end, and a box round them would swallow its clicks.
    if(s.proxy===false)return;
    var size=box.getSize(new T.Vector3()),c=box.getCenter(new T.Vector3());
    var proxy=new T.Mesh(new T.BoxGeometry(Math.max(.7,size.x+.2),Math.max(.7,size.y+.2),Math.max(.7,size.z+.2)),proxyMat);
    proxy.position.copy(c);proxy.name='island-service-hit-'+s.label;proxy.userData={kind:'island_service',label:s.label,islandService:info,serviceProxy:true};
    scene.add(proxy);roots.push(proxy);W.clickables.push(proxy);grounds.push(proxy);services.push(proxy)});
   if(src.extra){var pl=await json(src.extra.placement),fb=await bytes(src.extra.url);need(await sha(fb)===pl.foundationSha256,b.id+' foundation bytes changed');
    place((await parse(T,fb)).scene,pl.world.x,pl.world.y,pl.world.z,0)}
  }
  // ---- habitat: tree family v3 on the Sept 13 placements, grounded like the Studio, breeze playing ----
  var veg=data.habitat,names=Array.from(new Set(veg.map(function(p){return p.asset}))),srcs={},props=null;
  for(var j=0;j<names.length;j++){var nm=names[j],g2,scn;
   if(TREE_FAMILY[nm]){g2=await parse(T,await bytes(lookUrl(TREES+nm+'.glb')));scn=g2.scene}
   else{if(!props){props=await parse(T,await bytes(lookUrl(PROPS)));
     // the pack stores linear factors (Blender convention); this game draws colours as authored sRGB, so convert back once
     var seenMat=new Set();props.scene.traverse(function(n){if(n.isMesh)[].concat(n.material).forEach(function(m){if(m&&!seenMat.has(m)&&m.color&&!m.map){seenMat.add(m);m.color.convertLinearToSRGB()}})})}var node=props.scene.getObjectByName(nm);need(node,'prop pack has no '+nm);g2={animations:[]};scn=new T.Group();var c0=node.clone(true);c0.position.set(0,0,0);c0.rotation.set(0,0,0);scn.add(c0)}
   scn.updateMatrixWorld(true);
   srcs[nm]={gltf:{scene:scn},minY:new T.Box3().setFromObject(scn).min.y,breeze:g2.animations.filter(function(c){return c.name==='Breeze'})[0]}}
  var arm=null;if(names.indexOf('signpost')>=0){var an=props.scene.getObjectByName('signpost-arm');need(an,'prop pack has no signpost-arm');arm=an}
  // M4.6: still props (no breeze, not a signpost) are drawn as one InstancedMesh per asset mesh for the whole island
  var batch={},M4=new T.Matrix4(),Q=new T.Quaternion(),UP=new T.Vector3(0,1,0);
  veg.forEach(function(p,k){var s=srcs[p.asset],y=sample(p.x,p.z);if(!Number.isFinite(y))return;
   if(!s.breeze&&p.asset!=='signpost'){(batch[p.asset]=batch[p.asset]||[]).push(new T.Matrix4().compose(new T.Vector3(p.x,y-s.minY*p.scale,p.z),Q.clone().setFromAxisAngle(UP,p.yaw),new T.Vector3(p.scale,p.scale,p.scale)));return}
   var root=s.gltf.scene.clone(true);
   // signposts: one arm per branch, mounted down the post and turned to its path; clicking reads the arms
   if(p.asset==='signpost'&&arm){(p.arms||[]).forEach(function(a,ai){var am=arm.clone(true);am.position.set(0,1.55-ai*.25,0);am.rotation.set(0,a.yaw,0);root.add(am)});
    var text='The signpost reads: '+(p.arms||[]).map(function(a){return a.label}).join(', ')+'.';
    root.traverse(function(n){if(n.isMesh){n.userData.kind='island_sign';n.userData.label='Read signpost';n.userData.islandSign=text;W.clickables.push(n);grounds.push(n)}})}
   var g=new T.Group();g.name='island-habitat-'+p.id;g.position.set(p.x,y-s.minY*p.scale,p.z);g.rotation.y=p.yaw;g.scale.setScalar(p.scale);g.add(root);scene.add(g);roots.push(g);
   root.traverse(function(n){if(n.isMesh){n.castShadow=true;n.receiveShadow=true;linearMaps(T,n)}});
   if(s.breeze){var mx=new T.AnimationMixer(root);mx.clipAction(s.breeze).play();mx.update((k*.371)%s.breeze.duration);mixers.push(mx)}
  });
  Object.keys(batch).forEach(function(name){var list=batch[name],src=srcs[name].gltf.scene;src.updateMatrixWorld(true);
   src.traverse(function(n){if(!n.isMesh)return;linearMaps(T,n);
    var im=new T.InstancedMesh(n.geometry,n.material,list.length);im.name='island-habitat-batch-'+name;im.castShadow=true;im.receiveShadow=true;
    im.frustumCulled=false;   // r128 culls an InstancedMesh by its base geometry only; one batch spans the island
    list.forEach(function(m,i){im.setMatrixAt(i,M4.multiplyMatrices(m,n.matrixWorld))});im.instanceMatrix.needsUpdate=true;scene.add(im);roots.push(im)})});
  // ---- bridges, built to the measured deck tiles ----
  var BM=lookUrl(BRIDGE_MODELS),bridgeModels=(await json(BM+'manifest.json')).bridges;
  for(var q=0;q<bridgeModels.length;q++){var m=bridgeModels[q],gb=await parse(T,await bytes(BM+m.file));place(gb.scene,m.centre[0],0,m.centre[2],0).name='island-bridge-'+m.id}
  var cutFor=null;
  // pose.surface 'b:<building>:<layer>:<mesh>' away from the building's terrain = inside that building
  function cutaway(pose){
   var m=pose&&/^b:([^:]+):\d+:(.*)$/.exec(pose.surface||''),inside=m&&!/Terrain$/.test(m[2])&&models[m[1]]?m[1]:null;   // only this module's buildings (not the Guide House cellar storey)
   if(inside===null&&cutFor===null)return;
   if(inside!==cutFor&&cutFor!==null){models[cutFor].scene.traverse(function(n){if(n.isMesh){n.visible=true;[].concat(n.material).forEach(function(mm){if(mm)mm.clippingPlanes=[]})}})}
   cutFor=inside;if(!inside||!CUTAWAY[inside])return;
   var r=CUTAWAY[inside],M=models[inside],localY=pose.y-M.placement.y;clipPlane.constant=pose.y+r.lift;
   if(typeof renderer!=='undefined'&&renderer)renderer.localClippingEnabled=true;
   M.scene.traverse(function(n){if(!n.isMesh)return;var name='';for(var q=n;q&&q!==M.scene;q=q.parent)if(/^(Keep|Kitchen|Lodge|Survival|Quarry|Bank|Mage|Haven|Lastlight|Cavern)_/.test(q.name)){name=q.name;break}
    n.visible=!r.roof.test(name);
    if(r.upper.test(name)){if(!n.geometry.boundingBox)n.geometry.computeBoundingBox();n.visible=n.geometry.boundingBox.min.y<=localY+.45}
    [].concat(n.material).forEach(function(mm){if(mm)mm.clippingPlanes=r.clip.test(name)?[clipPlane]:[]})});
  }
  function update(dt,pose){mixers.forEach(function(mm){mm.update(dt)});cutaway(pose)}
  function dispose(){
   grounds.forEach(function(n){[W.grounds,W.clickables].forEach(function(a){var ix=a.indexOf(n);if(ix>=0)a.splice(ix,1)})});
   roots.forEach(function(r){scene.remove(r);r.traverse(function(n){if(n.geometry)n.geometry.dispose()})});mixers.forEach(function(mm){mm.stopAllAction()});roots=[];mixers=[];
  }
  return {update:update,dispose:dispose,services:services,models:models,stats:{roots:roots.length,habitat:veg.length,buildings:data.buildings.length,services:services.length}};
 }
 return {loadData:loadData,load:load};
})();
