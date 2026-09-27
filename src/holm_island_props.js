/* Tutor's Holm island prop sets (Holm v2 land, 2026-09-26): Hettie's Garden, the island clutter, fences, farm and cove
 * dressing, all Blender-made packs (tools/blender/build_holm_*_props_v1.py, textured old-school), placed from data:
 * docs/rebuild/holm-overhaul/island-props.json {packs:{id:path}, sets:[{id,name,placements:[{pack,prop,x,z,yaw,scale,y,
 * block,name,examine,noBlock}]}]}. A prop's footprint blocks the walk graph where its pack manifest says so (block
 * [halfX, halfZ], rotated with the prop; a placement may override or set noBlock). Props repeated three times or more
 * are drawn as one InstancedMesh per mesh for the whole island (still, no click); a placement with examine text is a
 * clone the player can examine (old-school menu: kind 'prop'). Ground height from the island terrain unless y is given.
 * blockersFrom() is pure (Node tools compose the same graph). Island only. */
var HolmIslandProps=(function(){
 'use strict';
 var DATA='/docs/rebuild/holm-overhaul/island-props.json';
 function asset(u){return typeof HolmIsland!=='undefined'?HolmIsland.asset(u):u}
 var st={data:null,manifests:null,objs:[],W:null,scene:null};
 async function json(u){var r=await fetch(u,{cache:'no-cache'});if(!r.ok)throw new Error('[HolmIslandProps] '+u+' '+r.status);return r.json()}
 function manifestPath(p){return p.replace(/[^/]+\.glb$/,'manifest.json')}
 // footprint blockers: manifest block [hx,hz] (or the placement's own), rotated by yaw, scaled; 'overlap' mode
 function blockersFrom(data,manifests){
  var out=[];(data.sets||[]).forEach(function(set){(set.placements||[]).forEach(function(p,i){
   if(p.noBlock)return;var m=manifests[p.pack],a=m&&m.assets.filter(function(q){return q.name===p.prop})[0],b=p.block||(a&&a.block);if(!b)return;
   var s=p.scale||1,c=Math.abs(Math.cos(p.yaw||0)),sn=Math.abs(Math.sin(p.yaw||0)),hx=b[0]*s,hz=b[1]*s,ex=hx*c+hz*sn,ez=hx*sn+hz*c;
   out.push({id:'prop:'+set.id+':'+p.prop+':'+i,mode:'overlap',x0:p.x-ex,x1:p.x+ex,z0:p.z-ez,z1:p.z+ez})})});
  return out;
 }
 async function loadData(){
  if(st.data)return {blockers:blockersFrom(st.data,st.manifests)};
  var d=await json(asset(DATA)),mans={};
  for(var k in d.packs)mans[k]=await json(asset('/'+manifestPath(d.packs[k])));
  st.data=d;st.manifests=mans;return {blockers:blockersFrom(d,mans)};
 }
 async function load(o){
  var T=o.THREE,scene=o.scene,W=o.WORLD,sample=o.sample;st.W=W;st.scene=scene;if(!st.data)await loadData();var d=st.data;
  var L=typeof HolmOldschoolLook!=='undefined'&&HolmOldschoolLook.enabled();
  function parse(url){return new Promise(function(ok,no){new T.GLTFLoader().load(url,ok,undefined,no)})}
  var packs={};for(var k in d.packs){try{packs[k]=await parse(asset('/'+d.packs[k]))}catch(e){console.error('[HolmIslandProps] pack '+k,e)}}
  function matte(root){root.traverse(function(n){if(!n.isMesh)return;n.castShadow=true;n.receiveShadow=true;[].concat(n.material).forEach(function(m){if(!m)return;
   if(m.map&&T.LinearEncoding!==undefined){m.map.encoding=T.LinearEncoding;m.needsUpdate=true}if(m.map&&L){m.map.magFilter=T.NearestFilter;m.map.minFilter=T.LinearMipmapLinearFilter}if('roughness' in m){m.roughness=1;m.metalness=0}})})}
  for(var pk in packs)matte(packs[pk].scene);
  function template(pack,prop){var g=packs[pack];if(!g)return null;var n=g.scene.getObjectByName(prop);if(!n)return null;var c=n.clone(true);c.position.set(0,0,0);c.rotation.set(0,0,0);c.scale.set(1,1,1);c.updateMatrixWorld(true);return c}
  var groups={},count=0,M4=new T.Matrix4(),Q=new T.Quaternion(),UP=new T.Vector3(0,1,0);
  (d.sets||[]).forEach(function(set){(set.placements||[]).forEach(function(p,i){var y=Number.isFinite(p.y)?p.y:sample(p.x,p.z)+(p.dy||0);if(!Number.isFinite(y))return;
   var key=p.pack+'|'+p.prop;(groups[key]=groups[key]||[]).push({p:p,y:y,set:set,i:i})})});
  Object.keys(groups).forEach(function(key){var list=groups[key],pk=key.split('|')[0],prop=key.split('|')[1],tpl=template(pk,prop);if(!tpl){console.warn('[HolmIslandProps] missing '+key);return}
   var still=list.filter(function(r){return !r.p.examine}),loose=list.filter(function(r){return !!r.p.examine});
   if(still.length<3){loose=loose.concat(still);still=[]}
   if(still.length){var mats=still.map(function(r){var s=r.p.scale||1;return new T.Matrix4().compose(new T.Vector3(r.p.x,r.y,r.p.z),Q.clone().setFromAxisAngle(UP,r.p.yaw||0),new T.Vector3(s,s,s))});
    tpl.traverse(function(n){if(!n.isMesh)return;var im=new T.InstancedMesh(n.geometry,n.material,mats.length);im.name='island-props-batch-'+prop;im.castShadow=true;im.receiveShadow=true;im.frustumCulled=false;
     mats.forEach(function(m,j){im.setMatrixAt(j,M4.multiplyMatrices(m,n.matrixWorld))});im.instanceMatrix.needsUpdate=true;scene.add(im);st.objs.push(im)})}
   loose.forEach(function(r){var g=tpl.clone(true),s=r.p.scale||1;g.position.set(r.p.x,r.y,r.p.z);g.rotation.y=r.p.yaw||0;g.scale.setScalar(s);g.name='island-prop-'+r.set.id+'-'+prop+'-'+r.i;scene.add(g);st.objs.push(g);
    if(r.p.examine)g.traverse(function(n){if(!n.isMesh)return;n.userData.kind='prop';n.userData.inspectName=r.p.name||prop;n.userData.examine=r.p.examine;n.userData.inspectMessage=r.p.examine;n.userData.label='Inspect '+(r.p.name||prop);W.clickables.push(n)})});
   count+=list.length});
  return {placements:count,objects:st.objs.length};
 }
 function dispose(){st.objs.forEach(function(o){if(o.parent)o.parent.remove(o);if(st.W)o.traverse(function(n){var i=st.W.clickables.indexOf(n);if(i>=0)st.W.clickables.splice(i,1)})});st.objs=[]}
 return {loadData:loadData,load:load,dispose:dispose,blockersFrom:blockersFrom,data:function(){return st.data}};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmIslandProps;
