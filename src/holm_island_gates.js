/* Tutor's Holm island draft progress gates (finish goal M5.2b). The 2004 Tutorial Island rule, rebuilt as our own:
 * each area's door or gate stays shut until the lesson before it is done, then opens and stays open. A closed
 * doorway's tiles are left out of the island graph (HolmIslandNav gates), so nobody walks through it; clicking the
 * Blender door leaf says why it is shut. Station gates (the quarry shaft ladder, the mage's rune table) refuse the
 * same way until their turn. Progress comes from the curriculum's lesson ledger (HolmIslandCurriculum), so a
 * reloaded save opens exactly the gates it has earned. Island draft only (?holmIsland=1). */
var HolmIslandGates=(function(){
 'use strict';
 var DATA=(typeof HolmIsland!=='undefined'?HolmIsland.asset('/docs/rebuild/holm-overhaul/island-gates.json'):'/docs/rebuild/holm-overhaul/island-gates.json'),PROPS=(typeof HolmIsland!=='undefined'?HolmIsland.asset('/.studio-workspaces/holm-props-v3/candidates/props.glb'):'/.studio-workspaces/holm-props-v3/candidates/props.glb');
 var st={data:null,nav:null,leaves:{},open:{},seen:-1,anim:[]};
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
 function place(T,scene,W,pack){
  st.data.gates.forEach(function(g){
   var n=pack.scene.getObjectByName(g.leaf);if(!n)throw new Error('[HolmIslandGates] prop pack has no '+g.leaf);
   var e=g.edge,w=e.to-e.from,root=new T.Group(),leaf=n.clone(true);leaf.position.set(0,0,0);leaf.rotation.set(0,0,0);leaf.scale.set(w,1,1);root.add(leaf);
   root.name='island-gate-'+g.id;var p=poses(g),h=p.hingeAtTo?e.to:e.from;root.position.set(e.axis==='z'?h:e.at,g.y,e.axis==='z'?e.at:h);root.rotation.y=st.open[g.id]?p.open:p.closed;
   root.traverse(function(m){if(!m.isMesh)return;m.castShadow=true;m.receiveShadow=true;m.userData.kind='island_gate';m.userData.label=st.open[g.id]?'Door (open)':'Open door';m.userData.islandGate=g.id;W.clickables.push(m)});
   scene.add(root);st.leaves[g.id]={root:root,poses:p};
   if(g.posts){var post=pack.scene.getObjectByName('gate-post');if(post)[e.from,e.to].forEach(function(v){var q=post.clone(true);q.position.set(e.axis==='z'?v:e.at,g.y,e.axis==='z'?e.at:v);scene.add(q);st.anim.push({post:q})})}
  });
 }
 // open everything the ledger has earned; returns true when the graph changed
 function refresh(opts){
  if(!st.data||!st.nav)return false;var n=lessonCount();if(n===st.seen&&!(opts&&opts.force))return false;st.seen=n;var instant=!!(opts&&opts.instant);
  var e=earned(),fresh=Object.keys(e).filter(function(id){return !st.open[id]});if(!fresh.length)return false;
  fresh.forEach(function(id){st.open[id]=true;var L=st.leaves[id];if(L&&instant){L.root.rotation.y=L.poses.open;L.t=1}else if(L){L.from=L.root.rotation.y;L.t=0;L.root.traverse(function(m){if(m.isMesh)m.userData.label='Door (open)'})}});
  var changed=st.nav.setGates(st.open);
  if(changed&&!instant&&typeof UI!=='undefined'&&st.ready)fresh.forEach(function(id){var g=st.data.gates.filter(function(q){return q.id===id})[0];if(g)UI.chat(g.id==='haven-gate'?'The pier gate swings open.':'You hear a bolt draw back somewhere on the Holm.','plain')});
  return changed;
 }
 function update(dt){Object.keys(st.leaves).forEach(function(id){var L=st.leaves[id];if(L.t===undefined||L.t>=1)return;L.t=Math.min(1,L.t+dt*1.4);var k=L.t*L.t*(3-2*L.t);
  L.root.rotation.y=L.from+(L.poses.open-L.from)*k})}
 // bind to the composed graph and place the leaves; gates earned by a restored save open at once, without the swing
 async function load(o){
  await loadData();st.nav=o.nav;
  var e=earned();Object.keys(e).forEach(function(id){st.open[id]=true});st.nav.setGates(st.open);st.seen=lessonCount();
  var pack=await new Promise(function(ok,no){new o.THREE.GLTFLoader().load(PROPS,ok,undefined,no)});
  pack.scene.traverse(function(n){if(n.isMesh)[].concat(n.material).forEach(function(m){if(m&&'roughness' in m){m.roughness=1;m.metalness=0}})});
  place(o.THREE,o.scene,o.WORLD,pack);st.ready=true;return {gates:st.data.gates.length,open:Object.keys(st.open).length};
 }
 function message(id){var g=st.data&&st.data.gates.filter(function(q){return q.id===id})[0];return g?(st.open[id]?null:g.message):null}
 // station gate: a message while the station is not yet due, else null
 function serviceBlocked(building,target){var s=st.data&&st.data.services.filter(function(q){return q.building===building&&q.target===target})[0];return s&&!done(s.requires)?s.message:null}
 function isOpen(id){return !!st.open[id]}
 return {loadData:loadData,load:load,refresh:refresh,update:update,message:message,serviceBlocked:serviceBlocked,isOpen:isOpen,gateKey:function(){return st.nav&&st.nav.gateKey?st.nav.gateKey():''}};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmIslandGates;
