/* Tutor's Holm island draft progress gates (finish goal M5.2b). The 2004 Tutorial Island rule, rebuilt as our own:
 * each area's door or gate stays shut until the lesson before it is done, then opens and stays open. A closed
 * doorway's tiles are left out of the island graph (HolmIslandNav gates), so nobody walks through it; clicking the
 * Blender door leaf says why it is shut. Station gates (the quarry shaft ladder, the mage's rune table) refuse the
 * same way until their turn. Progress comes from the curriculum's lesson ledger (HolmIslandCurriculum), so a
 * reloaded save opens exactly the gates it has earned. Island draft only (?holmIsland=1).
 * Animation pass (2026-09-29): an earned door's LEAF may be handed to a driver (HolmIslandAnim) that swings it open as the
 * adventurer comes to it and shut behind them; the doorway's walk-graph state (open for good once earned) is unchanged. */
var HolmIslandGates=(function(){
 'use strict';
 var DATA=(typeof HolmIsland!=='undefined'?HolmIsland.asset('/docs/rebuild/holm-overhaul/island-gates.json'):'/docs/rebuild/holm-overhaul/island-gates.json'),PROPS=(typeof HolmIsland!=='undefined'?HolmIsland.asset('/.studio-workspaces/holm-props-v3/candidates/props.glb'):'/.studio-workspaces/holm-props-v3/candidates/props.glb');
 var st={data:null,nav:null,leaves:{},open:{},seen:-1,anim:[],driver:null,doors:null};
 // owner review 4 (2026-09-27): "two doors on top of each other" at the Quest Lodge "and the door doesn't open". A doorway
 // whose building has a door leaf of its own is gated by that leaf and the prop leaf is not placed: the lodge's oak door
 // plays its authored swing (its clip runs shut -> open -> shut, so open is the widest pose). A static leaf of one piece
 // (modelled standing open) would swing about the doorway end it hangs from (ownLeaf's pivot path).
 var OWN={'lodge-door':{part:'Lodge_DoorPivot',clip:'Lodge_DoorOpenClose'}};   // (the bank's and Lastlight's own door meshes merge several leaves and frames, so their gates keep the prop leaf; their own leaves stand open inside)
 function tag(root,g,W){root.traverse(function(m){if(!m.isMesh)return;m.userData.kind='island_gate';m.userData.label=st.open[g.id]?'Door (open)':'Open door';m.userData.islandGate=g.id;if(W.clickables.indexOf(m)<0)W.clickables.push(m)})}
 // k: 0 shut, 1 open
 function ownLeaf(T,g,model,W){var spec=OWN[g.id],node=spec&&model&&model.scene.getObjectByName(spec.part);if(!node)return null;
  if(spec.clip){var act=model.actions&&model.actions[spec.clip];if(!act)return null;var tr=act.getClip().tracks.filter(function(t){return /quaternion$/.test(t.name)})[0];if(!tr)return null;
   var best=0,tOpen=0;for(var i=0;i<tr.times.length;i++){var w=Math.abs(tr.values[i*4+3]);var ang=2*Math.acos(Math.min(1,w));if(ang>best){best=ang;tOpen=tr.times[i]}}
   tag(node,g,W);return {own:true,node:node,set:function(k){act.time=tOpen*k}}}
  node.updateMatrixWorld(true);var box=new T.Box3().setFromObject(node),c=box.getCenter(new T.Vector3()),e=g.edge;
  var ends=e.axis==='z'?[[e.from,e.at],[e.to,e.at]]:[[e.at,e.from],[e.at,e.to]],d0=Math.hypot(c.x-ends[0][0],c.z-ends[0][1]),d1=Math.hypot(c.x-ends[1][0],c.z-ends[1][1]),h=d0<=d1?ends[0]:ends[1],o=d0<=d1?ends[1]:ends[0];
  var pivot=new T.Group();pivot.name='island-gate-pivot-'+g.id;var parent=node.parent;parent.add(pivot);
  var local=parent.worldToLocal(new T.Vector3(h[0],box.min.y,h[1]));pivot.position.copy(local);pivot.updateMatrixWorld(true);pivot.attach(node);
  var phi=function(x,z){return Math.atan2(-z,x)},th=phi(o[0]-h[0],o[1]-h[1])-phi(c.x-h[0],c.z-h[1]);while(th>Math.PI)th-=2*Math.PI;while(th<-Math.PI)th+=2*Math.PI;
  tag(node,g,W);return {own:true,node:node,set:function(k){pivot.rotation.y=th*(1-k)}}}
 async function json(u){var r=await fetch(u,{cache:'no-cache'});if(!r.ok)throw new Error(u+' '+r.status);return r.json()}
 async function loadData(){return st.data||(st.data=await json(DATA))}
 function done(id){if(typeof Tutorial==='undefined')return false;if(Tutorial.complete)return true;
  return Array.isArray(Tutorial.completedLessonIds)&&Tutorial.completedLessonIds.indexOf(id)>=0}
 function lessonCount(){return (typeof Tutorial!=='undefined'&&Array.isArray(Tutorial.completedLessonIds)?Tutorial.completedLessonIds.length:0)+(Tutorial&&Tutorial.complete?100:0)}
 // which gates the ledger has earned; opening is one-way
 function earned(){var o={};(st.data?st.data.gates:[]).forEach(function(g){if(done(g.requires))o[g.id]=true});return o}
 // closed pose runs along the doorway edge; open swings ~80 degrees into the building (inside = the gated tile side)
 // the leaf's strapped front (+Z in the asset) faces whoever approaches: hinge at whichever end makes it face outside
 function poses(g){var e=g.edge,t=g.tiles[0];
  var inX=e.axis==='x'?(t[0]+.5-e.at):0,inZ=e.axis==='z'?(t[1]+.5-e.at):0,a=Math.PI*.44;
  var closed=e.axis==='z'?0:-Math.PI/2;if(Math.sin(closed)*-inX+Math.cos(closed)*-inZ<0)closed+=Math.PI;
  var hingeAtTo=Math.abs(Math.cos(closed)*(e.axis==='z'?1:0)-Math.sin(closed)*(e.axis==='x'?1:0)+1)<1e-6;
  var cand=[closed+a,closed-a].map(function(y){return {y:y,dot:Math.cos(y)*inX-Math.sin(y)*inZ}});
  return {closed:closed,open:cand[0].dot>cand[1].dot?cand[0].y:cand[1].y,hingeAtTo:hingeAtTo}}
 function place(T,scene,W,pack,models){
  st.data.gates.forEach(function(g){
   var own=ownLeaf(T,g,models&&models[g.building],W);if(own){own.set(st.open[g.id]?1:0);own.t=st.open[g.id]?1:0;st.leaves[g.id]=own;return}
   var n=pack.scene.getObjectByName(g.leaf);if(!n)throw new Error('[HolmIslandGates] prop pack has no '+g.leaf);
   var e=g.edge,w=e.to-e.from,root=new T.Group(),leaf=n.clone(true);leaf.position.set(0,0,0);leaf.rotation.set(0,0,0);leaf.scale.set(w,1,1);root.add(leaf);
   root.name='island-gate-'+g.id;var p=poses(g),h=p.hingeAtTo?e.to:e.from;root.position.set(e.axis==='z'?h:e.at,g.y,e.axis==='z'?e.at:h);root.rotation.y=st.open[g.id]?p.open:p.closed;
   root.traverse(function(m){if(!m.isMesh)return;m.castShadow=true;m.receiveShadow=true;m.userData.kind='island_gate';m.userData.label=st.open[g.id]?'Door (open)':'Open door';m.userData.islandGate=g.id;W.clickables.push(m)});
   scene.add(root);st.leaves[g.id]={root:root,poses:p};
   // (owner review 4) the leaf hangs in its building's wall: while the adventurer is inside, the island cutaway clips it
   // with that wall (it joins the building's model; its own material copies carry the clip plane)
   var bm=models&&models[g.building];if(bm&&bm.scene){bm.scene.attach(root);root.traverse(function(m){if(!m.isMesh)return;m.userData.cutClip=true;m.material=Array.isArray(m.material)?m.material.map(function(q){return q&&q.clone()}):m.material&&m.material.clone()})}
   if(g.posts){var post=pack.scene.getObjectByName('gate-post');if(post)[e.from,e.to].forEach(function(v){var q=post.clone(true);q.position.set(e.axis==='z'?v:e.at,g.y,e.axis==='z'?e.at:v);scene.add(q);st.anim.push({post:q})})}
  });
 }
 // open everything the ledger has earned; returns true when the graph changed
 function refresh(opts){
  if(!st.data||!st.nav)return false;var n=lessonCount();if(n===st.seen&&!(opts&&opts.force))return false;st.seen=n;var instant=!!(opts&&opts.instant);
  var e=earned(),fresh=Object.keys(e).filter(function(id){return !st.open[id]});if(!fresh.length)return false;
  fresh.forEach(function(id){st.open[id]=true;var L=st.leaves[id];if(L&&L.own){L.node.traverse(function(m){if(m.isMesh)m.userData.label='Door (open)'});if(instant){L.set(1);L.t=1}else L.t=0;return}if(L&&instant){L.root.rotation.y=L.poses.open;L.t=1}else if(L){L.from=L.root.rotation.y;L.t=0;L.root.traverse(function(m){if(m.isMesh)m.userData.label='Door (open)'})}});
  var changed=st.nav.setGates(st.open);
  if(changed&&!instant&&typeof UI!=='undefined'&&st.ready)fresh.forEach(function(id){var g=st.data.gates.filter(function(q){return q.id===id})[0];if(g)UI.chat(g.id==='haven-gate'?'The pier gate swings open.':'You hear a bolt draw back somewhere on the Holm.','plain')});
  return changed;
 }
 // the leaves for a visual driver: earned (open in the graph) or not, the doorway's centre, and a pose setter (0 shut, 1 open)
 function doorList(){if(st.doors)return st.doors;if(!st.data)return [];
  st.doors=st.data.gates.map(function(g){var L=st.leaves[g.id];if(!L)return null;var e=g.edge,m=(e.from+e.to)/2;
   var d={id:g.id,open:false,center:{x:e.axis==='z'?m:e.at,y:g.y,z:e.axis==='z'?e.at:m},
    set:L.own?function(k){L.set(k);L.t=1;L.shown=k}:function(k){L.root.rotation.y=L.poses.closed+(L.poses.open-L.poses.closed)*k;L.t=1;L.shown=k}};return d}).filter(Boolean);return st.doors}
 // what the player sees: with a driver an earned door may stand shut until they come to it (the menu then offers Open)
 function looksOpen(id){var L=st.leaves[id];if(st.driver&&L&&L.shown!==undefined)return L.shown>.5;return !!st.open[id]}
 function setDriver(fn){st.driver=typeof fn==='function'?fn:null}
 function update(dt){if(st.driver){var list=doorList();list.forEach(function(d){d.open=!!st.open[d.id]});try{st.driver(dt,list);return}catch(e){console.error('[HolmIslandGates] door driver',e);st.driver=null}}
  Object.keys(st.leaves).forEach(function(id){var L=st.leaves[id];if(L.t===undefined||L.t>=1)return;L.t=Math.min(1,L.t+dt*1.4);var k=L.t*L.t*(3-2*L.t);
  if(L.own){if(st.open[id])L.set(k);return}L.root.rotation.y=L.from+(L.poses.open-L.from)*k})}
 // bind to the composed graph and place the leaves; gates earned by a restored save open at once, without the swing
 async function load(o){
  await loadData();st.nav=o.nav;
  var e=earned();Object.keys(e).forEach(function(id){st.open[id]=true});st.nav.setGates(st.open);st.seen=lessonCount();
  var src=typeof HolmOldschoolLook!=='undefined'?HolmOldschoolLook.url(PROPS):PROPS;   // old-school look: textured gate pack when served
  var pack=await new Promise(function(ok,no){new o.THREE.GLTFLoader().load(src,ok,undefined,no)});
  pack.scene.traverse(function(n){if(n.isMesh)[].concat(n.material).forEach(function(m){if(m&&'roughness' in m){m.roughness=1;m.metalness=0}
   // colour maps are display values like every colour in the game (r128's loader tags them sRGB and would darken them)
   if(m&&m.map&&o.THREE.LinearEncoding!==undefined){m.map.encoding=o.THREE.LinearEncoding;m.needsUpdate=true}})});
  if(typeof HolmOldschoolLook!=='undefined')HolmOldschoolLook.prepareModel(o.THREE,pack.scene);
  place(o.THREE,o.scene,o.WORLD,pack,o.models);st.ready=true;return {gates:st.data.gates.length,open:Object.keys(st.open).length};
 }
 function message(id){var g=st.data&&st.data.gates.filter(function(q){return q.id===id})[0];return g?(st.open[id]?null:g.message):null}
 // station gate: a message while the station is not yet due, else null
 function serviceBlocked(building,target){var s=st.data&&st.data.services.filter(function(q){return q.building===building&&q.target===target})[0];return s&&!done(s.requires)?s.message:null}
 function isOpen(id){return !!st.open[id]}
 return {loadData:loadData,load:load,refresh:refresh,update:update,message:message,serviceBlocked:serviceBlocked,isOpen:isOpen,ownLeaf:function(id){var L=st.leaves[id];return !!(L&&L.own)},setDriver:setDriver,doors:doorList,looksOpen:looksOpen,leafObject:function(id){var L=st.leaves[id];return L?(L.own?L.node:L.root):null},gateKey:function(){return st.nav&&st.nav.gateKey?st.nav.gateKey():''}};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmIslandGates;
