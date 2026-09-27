/* Tutor's Holm instanced cells (Holm v2 land, phase 5, 2026-09-26): repeated still pieces (habitat trees, shrubs, the
 * island clutter and the ground decor by the thousand) drawn as one InstancedMesh per mesh per 32-tile cell, so the
 * island's density costs a handful of draw calls per visible cell instead of one per object, and cells outside the
 * camera are skipped (r128 culls an InstancedMesh by its base geometry only, so every cell keeps its own box and the
 * whole group is shown or hidden each frame; the box grows by 3 tiles so shadow casters just off screen still cast).
 * Trees keep their breeze: the canopy meshes get a vertex sway (by height above the canopy origin, phase from the
 * instance position) in place of the per-tree animation mixers. Island only; pure three.js r128.
 *   build(T, scene, template, matrices, {name, sway(mesh)->bool, amp, castShadow}) -> [Group]
 *   update(dt, camera)   cull cells and advance the sway clock (HolmArrivalQA's island update)
 *   stats()              {cells, meshes, instances}; dispose() */
var HolmInstancedCells=(function(){
 'use strict';
 var CELL=32,MARGIN=3,sets=[],clock={value:0},frustum=null,pm=null;
 function swayMaterial(T,m,amp){
  var c=m.clone();
  c.onBeforeCompile=function(sh){sh.uniforms.uHolmSway=clock;
   sh.vertexShader='uniform float uHolmSway;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\n'+
    ' vec4 hsP=instanceMatrix*vec4(0.,0.,0.,1.);float hsT=uHolmSway*1.15+hsP.x*.37+hsP.z*.23;float hsH=max(position.y,0.);\n'+
    ' transformed.x+=sin(hsT)*'+amp.toFixed(4)+'*hsH;transformed.z+=cos(hsT*.83)*'+(amp*.6).toFixed(4)+'*hsH;\n#endif')};
  c.customProgramCacheKey=function(){return 'holm-sway-'+amp.toFixed(4)};
  return c;
 }
 function build(T,scene,template,matrices,opts){
  opts=opts||{};template.updateMatrixWorld(true);
  var meshes=[];template.traverse(function(n){if(n.isMesh)meshes.push(n)});
  var cells={},out=[];
  matrices.forEach(function(m){var e=m.elements,k=Math.floor(e[12]/CELL)+','+Math.floor(e[14]/CELL);(cells[k]=cells[k]||[]).push(m)});
  var swayed=new Map();
  Object.keys(cells).forEach(function(k){
   var list=cells[k],g=new T.Group(),box=new T.Box3(),tmp=new T.Box3(),M=new T.Matrix4();g.name=(opts.name||'holm-cells')+'@'+k;
   meshes.forEach(function(n){
    if(!n.geometry.boundingBox)n.geometry.computeBoundingBox();
    var mat=n.material;
    if(opts.sway&&opts.sway(n)){if(!swayed.has(n.material))swayed.set(n.material,Array.isArray(n.material)?n.material.map(function(q){return swayMaterial(T,q,opts.amp||.03)}):swayMaterial(T,n.material,opts.amp||.03));mat=swayed.get(n.material)}
    var im=new T.InstancedMesh(n.geometry,mat,list.length);im.name=(opts.name||'holm-cells')+'-'+(n.name||'mesh')+'@'+k;
    im.castShadow=opts.castShadow!==false;im.receiveShadow=true;im.frustumCulled=false;
    list.forEach(function(m,i){M.multiplyMatrices(m,n.matrixWorld);im.setMatrixAt(i,M);tmp.copy(n.geometry.boundingBox).applyMatrix4(M);box.union(tmp)});
    im.instanceMatrix.needsUpdate=true;g.add(im)});
   box.expandByScalar(MARGIN);scene.add(g);var s={group:g,box:box,count:list.length,meshes:meshes.length};sets.push(s);out.push(g)});
  return out;
 }
 function update(dt,cam){
  clock.value+=Math.min(Number.isFinite(dt)?dt:0,.1);
  if(!cam||typeof THREE==='undefined')return;
  frustum=frustum||new THREE.Frustum();pm=pm||new THREE.Matrix4();
  cam.updateMatrixWorld();pm.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse);frustum.setFromProjectionMatrix(pm);
  for(var i=0;i<sets.length;i++){var s=sets[i];if(s.group.parent)s.group.visible=frustum.intersectsBox(s.box)}
 }
 function stats(){var c=0,m=0,n=0,v=0;sets.forEach(function(s){if(!s.group.parent)return;c++;m+=s.meshes;n+=s.count;if(s.group.visible)v++});return {cells:c,visibleCells:v,meshes:m,instances:n}}
 function dispose(){sets.forEach(function(s){if(s.group.parent)s.group.parent.remove(s.group);s.group.traverse(function(o){if(o.isInstancedMesh&&o.dispose)o.dispose()})});sets=[]}
 return {build:build,update:update,stats:stats,dispose:dispose,CELL:CELL};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmInstancedCells;
