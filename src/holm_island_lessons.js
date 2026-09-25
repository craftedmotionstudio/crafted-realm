/* Tutor's Holm island draft lesson stations (finish goal M5.1). Places the teaching objects the curriculum needs on
 * the new island and hands every lesson to the game's own systems, so XP, gather rates, recipes and Tutorial credit
 * stay exactly the live rules:
 *  - three teaching oaks by the survival camp (tree family v3 over a Blender stump; chopping hides the tree),
 *  - the net fishing spot off the survival fishing stage (Blender ripple),
 *  - copper and tin ore rocks at the cavern's socket empties (Blender ore rocks; a depleted rock shows while mined out),
 *  - the cavern's Blender furnace and anvil as the game's 'furnace' / 'anvil' stations,
 *  - the Lastlight beacon lever (lights the Blender lamp and credits beacon/lit, as the live Lastlight does).
 * The objects are ordinary WORLD resources/clickables; HolmArrivalQA walks the graph player to a stance beside them and
 * then passes the click to the game's handleClick. Island draft only (?holmIsland=1); nothing here is published. */
var HolmIslandLessons=(function(){
 'use strict';
 var WS='/.studio-workspaces/',DATA='/docs/rebuild/holm-overhaul/island-lessons.json';
 var PROPS=WS+'holm-props-v2/candidates/props.glb',OAK=WS+'holm-tree-family-v3/candidates/oak.glb';
 var st={objs:[],depleted:[],lamps:[],beaconOn:false,data:null};
 function need(c,m){if(!c)throw new Error('[HolmIslandLessons] '+m)}
 async function json(u){var r=await fetch(u,{cache:'no-cache'});need(r.ok,u+' '+r.status);return r.json()}
 function parse(T,url){return new Promise(function(ok,no){new T.GLTFLoader().load(url,ok,undefined,no)})}
 function matte(T,root){root.traverse(function(n){if(!n.isMesh)return;n.castShadow=true;n.receiveShadow=true;
  [].concat(n.material).forEach(function(m){if(!m)return;if(m.map&&T.LinearEncoding!==undefined){m.map.encoding=T.LinearEncoding;m.needsUpdate=true}if('roughness' in m){m.roughness=1;m.metalness=0}})})}
 function piece(pack,name){var n=pack.scene.getObjectByName(name);need(n,'lesson prop pack has no '+name);var c=n.clone(true);c.position.set(0,0,0);c.rotation.set(0,0,0);return c}
 function own(o,W,scene,resource){scene.add(o);W.clickables.push(o);if(resource)W.resources.push(o);st.objs.push(o);return o}
 // extras data only: blockers so the graph walks round the lesson trees and rocks (read before the graph composes)
 async function blockers(){
  var d=st.data||(st.data=await json(DATA)),out=[];
  d.trees.forEach(function(t){var r=d.treeBlockRadius*(t.scale||1);out.push({id:'lesson:'+t.id,mode:'overlap',x0:t.x-r,x1:t.x+r,z0:t.z-r,z1:t.z+r})});
  d.rocks.forEach(function(k){var r=d.rockBlockRadius;out.push({id:'lesson:'+k.id,mode:'overlap',x0:k.x-r,x1:k.x+r,z0:k.z-r,z1:k.z+r})});
  return out;
 }
 async function load(o){
  var T=o.THREE,scene=o.scene,W=o.WORLD,sample=o.sample,models=o.models||{},d=st.data||(st.data=await json(DATA));
  var pack=await parse(T,PROPS),oak=await parse(T,OAK);matte(T,pack.scene);matte(T,oak.scene);
  var oakMin=new T.Box3().setFromObject(oak.scene).min.y;
  d.trees.forEach(function(t){var y=sample(t.x,t.z);if(!Number.isFinite(y))return;
   // children[0] stays when felled (the game hides the rest): the stump first, the tree over it
   var g=new T.Group();g.name='island-lesson-'+t.id;g.add(piece(pack,'tree-stump'));
   var tree=oak.scene.clone(true);tree.position.y=-oakMin;tree.rotation.y=t.yaw||0;g.add(tree);
   g.position.set(t.x,y,t.z);g.scale.setScalar(t.scale||1);
   g.userData={kind:'resource',rtype:'tree',skill:'Woodcutting',label:'Chop down Oak',respawn:8,alive:true,islandLesson:t.id};
   own(g,W,scene,true)});
  d.fishing.forEach(function(f){var g=new T.Group();g.name='island-lesson-'+f.id;g.add(piece(pack,'fishing-ripple'));var hb=new T.Mesh(new T.BoxGeometry(1.1,.5,1.1),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));hb.position.y=.2;g.add(hb);g.position.set(f.x,f.y,f.z);
   g.userData={kind:'resource',rtype:'fish',skill:'Fishing',label:'Net Fishing spot',respawn:6,alive:true,bob:0,islandLesson:f.id};
   own(g,W,scene,true)});
  // ore rocks: positions come from the cavern's socket empties when the cavern is placed, else the data file
  var kinds=typeof ROCK_KINDS!=='undefined'?ROCK_KINDS:null;need(kinds,'ROCK_KINDS missing');
  var cavScene=models.cavern&&models.cavern.scene;if(cavScene)cavScene.updateMatrixWorld(true);
  d.rocks.forEach(function(k){var kind=kinds[k.ore];need(kind,'no rock kind '+k.ore);
   // the socket empty is the authority when the cavern is loaded (the data file mirrors it for the graph blockers)
   var sock=cavScene&&k.socket&&cavScene.getObjectByName(k.socket);if(sock){var wp=sock.getWorldPosition(new T.Vector3());k={id:k.id,ore:k.ore,x:wp.x,y:wp.y,z:wp.z,yaw:k.yaw}}
   var g=new T.Group();g.name='island-lesson-'+k.id;g.add(piece(pack,'ore-rock-'+k.ore));g.position.set(k.x,k.y,k.z);g.rotation.y=k.yaw||0;
   g.userData={kind:'resource',rtype:'rock',skill:'Mining',label:kind.label,respawn:10,alive:true,oreKind:k.ore,
    mat:{item:kind.item,xp:kind.xp,req:kind.req,chat:kind.chat},islandLesson:k.id};
   own(g,W,scene,true);
   var dep=piece(pack,'ore-rock-depleted');dep.position.set(k.x,k.y,k.z);dep.rotation.y=k.yaw||0;dep.visible=false;scene.add(dep);st.depleted.push({host:g,rock:dep})});
  // the cavern's authored furnace and anvil become the game's smelting and smithing stations
  var cav=models.cavern;
  // (the game measures reach from obj.position, so each station is an invisible world-space box over the authored mesh)
  if(cav){cav.scene.updateMatrixWorld(true);var boxes={};cav.scene.traverse(function(n){if(!n.isMesh)return;var nm='';for(var q=n;q;q=q.parent)if(/^Cavern_Service(Furnace|Anvil)_/.test(q.name||'')){nm=/Furnace/.test(q.name)?'furnace':'anvil';break}
   if(nm)(boxes[nm]=boxes[nm]||new T.Box3()).expandByObject(n)});
   var hit=new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
   Object.keys(boxes).forEach(function(k){var b=boxes[k],s=b.getSize(new T.Vector3()),c=b.getCenter(new T.Vector3());
    var p=new T.Mesh(new T.BoxGeometry(Math.max(.8,s.x+.2),Math.max(.8,s.y+.2),Math.max(.8,s.z+.2)),hit);p.position.copy(c);p.name='island-lesson-'+k;
    p.userData={kind:k,label:k==='furnace'?'Use Furnace':'Use Anvil',islandLesson:k};own(p,W,scene,false)})}
  // the Lastlight lamp meshes, lit by the lever
  var ll=models.lastlight;
  if(ll)ll.scene.traverse(function(n){if(!n.isMesh)return;for(var q=n;q;q=q.parent)if(/^Lastlight_ServiceBeacon_/.test(q.name||'')){st.lamps.push(n);break}});
  // fires the player lights use the Blender campfire: the game's own fire object (cooking, lifetime, light) keeps
  // working; only its code-built logs/stones/cones are swapped, and the flicker drives the Blender flame mesh
  if(!st.origCampfire&&typeof window.makeCampfire==='function'){var orig=st.origCampfire=window.makeCampfire;
   window.makeCampfire=function(x,z){var g=orig(x,z);g.name='island-campfire';try{g.children.slice().forEach(function(c){g.remove(c)});var cf=piece(pack,'campfire');g.add(cf);
    var fl=null;cf.traverse(function(n){if(!fl&&/Flames/i.test(n.name||''))fl=n});g.userData.flame=fl||cf}catch(e){console.error('[HolmIslandLessons] campfire',e)}return g}}
  return {trees:d.trees.length,fishing:d.fishing.length,rocks:d.rocks.length,stations:st.objs.length-d.trees.length-d.fishing.length-d.rocks.length,lamps:st.lamps.length};
 }
 function update(){st.depleted.forEach(function(p){p.rock.visible=!p.host.visible||!p.host.userData.alive})}
 // Lastlight lever (service call): same rule as the live lighthouse (holm_lastlight_runtime toggleBeacon)
 function pullLever(){
  st.beaconOn=!st.beaconOn;Player.lastlightLit=st.beaconOn;
  st.lamps.forEach(function(n){[].concat(n.material).forEach(function(m){if(m&&m.emissive){if(m.userData.baseEmissive===undefined)m.userData.baseEmissive=m.emissive.getHex();m.emissive.setHex(st.beaconOn?0xffc860:m.userData.baseEmissive)}})});
  UI.chat(st.beaconOn?'You heave the bronze lever. Lastlight flares and its beam sweeps the sea.':'You ease the lever back. The lamp settles to a low ember.','plain');
  if(st.beaconOn){try{if(typeof Tutorial!=='undefined')Tutorial.notify('beacon','lit')}catch(e){}}
  if(typeof Sfx!=='undefined'&&Sfx.click)Sfx.click();
 }
 function dispose(W,scene){if(st.origCampfire){window.makeCampfire=st.origCampfire;st.origCampfire=null}st.objs.forEach(function(o){[W.clickables,W.resources].forEach(function(a){var i=a.indexOf(o);if(i>=0)a.splice(i,1)});if(o.parent===scene)scene.remove(o)});
  st.depleted.forEach(function(p){scene.remove(p.rock)});st.objs=[];st.depleted=[];st.lamps=[]}
 return {blockers:blockers,load:load,update:update,pullLever:pullLever,dispose:dispose,beaconOn:function(){return st.beaconOn}};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmIslandLessons;
