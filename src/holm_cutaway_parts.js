/* Tutor's Holm cutaway parts (owner review 4, 2026-09-27: "walls disappear but there's still floating beams and pictures").
 * The island cutaway (HolmIslandExtras) clips a building's shell just above the adventurer and hides its roof. What hung on
 * those walls (pictures, shelves, herb rails, lanterns on brackets), what spans between them (beams, joists) and the tall
 * timbers set in them (door leaves, frames, posts) stayed whole and floated over the cut. At load, every other mesh of a
 * building is split into its connected pieces (vertices welded by position, in the model's own space):
 *  - a piece that stands on a floor level of the building's graph, on a floor mesh, on the island ground, or on another
 *    standing piece keeps its shape (tables and what is on them, barrels, the oven, a lectern);
 *  - a piece with nothing under it (hung on a wall or from the ceiling), a piece resting on such a piece, and a tall thin
 *    timber standing in a wall line (a post, a frame, a door leaf) is moved to a twin mesh ("<name>_cut") that the
 *    cutaway clips with the walls.
 * Pure geometry at load (the index is split; vertex data is shared); no model bytes, hashes or graphs change. The Guide
 * House keeps its walls whole (holm_arrival_model_owner.js) and is not processed. Pure helpers are exported for
 * tools/test_holm_cutaway_parts.js. */
var HolmCutawayParts=(function(){
 'use strict';
 var TALL=1.4,THIN=.3,REST=.06,LEVEL=.1,GROUND=.3;
 // connected pieces of one geometry: welded by quantised position; returns per-triangle piece ids and the piece count
 function pieces(pos,index,triCount){
  var parent=new Int32Array(pos.count),key=new Map(),canon=new Int32Array(pos.count);
  for(var i=0;i<pos.count;i++){parent[i]=i;var k=Math.round(pos.getX(i)*2000)+','+Math.round(pos.getY(i)*2000)+','+Math.round(pos.getZ(i)*2000);var c=key.get(k);if(c===undefined){key.set(k,i);c=i}canon[i]=c}
  function find(a){while(parent[a]!==a){parent[a]=parent[parent[a]];a=parent[a]}return a}
  function unite(a,b){a=find(a);b=find(b);if(a!==b)parent[b]=a}
  function v(t,j){return canon[index?index[t*3+j]:t*3+j]}
  for(var t=0;t<triCount;t++){unite(v(t,0),v(t,1));unite(v(t,0),v(t,2))}
  var ids=new Int32Array(triCount),map=new Map(),n=0;
  for(t=0;t<triCount;t++){var r=find(v(t,0)),id=map.get(r);if(id===undefined){id=n++;map.set(r,id)}ids[t]=id}
  return {ids:ids,count:n};
 }
 // bounding boxes of each piece in model space (m: the mesh's matrix relative to the model root)
 function boxes(T,pos,index,ids,count,m){
  var out=[],v=new T.Vector3();for(var i=0;i<count;i++)out.push({min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity],tris:0});
  for(var t=0;t<ids.length;t++){var b=out[ids[t]];b.tris++;for(var j=0;j<3;j++){var vi=index?index[t*3+j]:t*3+j;v.fromBufferAttribute(pos,vi).applyMatrix4(m);
   if(v.x<b.min[0])b.min[0]=v.x;if(v.y<b.min[1])b.min[1]=v.y;if(v.z<b.min[2])b.min[2]=v.z;if(v.x>b.max[0])b.max[0]=v.x;if(v.y>b.max[1])b.max[1]=v.y;if(v.z>b.max[2])b.max[2]=v.z}}
  return out;
 }
 function overlapXZ(a,b,pad){return a.min[0]<b.max[0]+pad&&a.max[0]>b.min[0]-pad&&a.min[2]<b.max[2]+pad&&a.max[2]>b.min[2]-pad}
 /* the rule, pure: pieces [{min,max,base}] where base is 'keep' (floors, stairs, the ground), 'cut' (shell, roof) or null
  * (to classify); levels = the building's floor heights; ground(p) -> true when the piece stands on the island ground.
  * Returns each piece's class, 'keep' or 'cut'. */
 function classify(list,levels,ground){
  var cls=list.map(function(p){return p.base||null});
  function tallThin(p){var sx=p.max[0]-p.min[0],sz=p.max[2]-p.min[2];return p.max[1]-p.min[1]>TALL&&Math.min(sx,sz)<THIN}
  var order=list.map(function(p,i){return i}).filter(function(i){return !cls[i]}).sort(function(a,b){return list[a].min[1]-list[b].min[1]});
  order.forEach(function(i){var p=list[i],c=null;
   if(levels.some(function(l){return Math.abs(p.min[1]-l)<LEVEL})||(ground&&ground(p)))c='keep';
   else{var sup=[];list.forEach(function(q,j){if(j===i||!cls[j])return;if(Math.abs(p.min[1]-q.max[1])<REST&&overlapXZ(p,q,.02))sup.push(cls[j])});
    c=sup.indexOf('keep')>=0?'keep':'cut'}
   if(c==='keep'&&tallThin(p))c='cut';
   cls[i]=c});
  return cls;
 }
 /* split the meshes under a building's model root. o: {role(mesh,name) -> 'keep'|'cut'|'skip'|'process', name(mesh) -> the
  * part name, levels:[model-space floor heights], ground(worldX,worldZ) -> height or NaN, toWorld(Vector3)} */
 function prepare(T,root,o){
  root.updateMatrixWorld(true);var inv=root.matrixWorld.clone();if(typeof inv.invert==='function')inv.invert();else inv.getInverse(root.matrixWorld);
  var meshes=[],list=[],stats={pieces:0,cut:0,split:0,meshes:0};
  root.traverse(function(n){if(!n.isMesh||!n.geometry||!n.geometry.attributes.position||n.isSkinnedMesh||n.isInstancedMesh)return;var role=o.role(n,o.name(n));if(role==='skip')return;
   var g=n.geometry;if(g.groups&&g.groups.length>1&&role==='process')role='keep';
   var pos=g.attributes.position,index=g.index?g.index.array:null,triCount=index?index.length/3:pos.count/3;if(!triCount)return;
   var m=new T.Matrix4().multiplyMatrices(inv,n.matrixWorld),pc=pieces(pos,index,triCount),bx=boxes(T,pos,index,pc.ids,pc.count,m);
   var rec={mesh:n,role:role,ids:pc.ids,first:list.length,count:pc.count};meshes.push(rec);
   bx.forEach(function(b){b.base=role==='process'?null:role;list.push(b)})});
  var W=new T.Vector3(),ground=o.ground?function(p){W.set((p.min[0]+p.max[0])/2,p.min[1],(p.min[2]+p.max[2])/2);var wy=W.clone().applyMatrix4(root.matrixWorld),h=o.ground(wy.x,wy.z);return Number.isFinite(h)&&Math.abs(wy.y-h)<GROUND}:null;
  var cls=classify(list,o.levels||[],ground);
  meshes.forEach(function(r){if(r.role!=='process')return;stats.meshes++;stats.pieces+=r.count;
   var cut=[];for(var i=0;i<r.count;i++)if(cls[r.first+i]==='cut')cut.push(i);if(!cut.length)return;stats.cut+=cut.length;
   var n=r.mesh,g=n.geometry,index=g.index?g.index.array:null,keepIdx=[],cutIdx=[],isCut=new Uint8Array(r.count);cut.forEach(function(i){isCut[i]=1});
   for(var t=0;t<r.ids.length;t++){var dst=isCut[r.ids[t]]?cutIdx:keepIdx;for(var j=0;j<3;j++)dst.push(index?index[t*3+j]:t*3+j)}
   function geo(idx){var h=new T.BufferGeometry();Object.keys(g.attributes).forEach(function(k){h.setAttribute(k,g.attributes[k])});var big=g.attributes.position.count>65535;
    h.setIndex(new T.BufferAttribute(big?new Uint32Array(idx):new Uint16Array(idx),1));h.computeBoundingBox();h.computeBoundingSphere();return h}
   var twin=new T.Mesh(geo(cutIdx),Array.isArray(n.material)?n.material.map(function(q){return q&&q.clone()}):n.material&&n.material.clone());
   twin.name=(n.name||'mesh')+'_cut';twin.position.copy(n.position);twin.quaternion.copy(n.quaternion);twin.scale.copy(n.scale);twin.castShadow=n.castShadow;twin.receiveShadow=n.receiveShadow;
   twin.userData=Object.assign({},n.userData,{cutClip:true});n.parent.add(twin);
   n.geometry=geo(keepIdx);stats.split++});   // an all-cut mesh keeps an empty index (its registrations and flags stay)
  return stats;
 }
 return {prepare:prepare,classify:classify,pieces:pieces,TALL:TALL,THIN:THIN};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmCutawayParts;
