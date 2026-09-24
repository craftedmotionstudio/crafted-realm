/* ================= WORLD V2 CONSOLIDATE (draw-call merge) =================
 * Goal P2-C asset consolidation. Every Blender building arrives as 50-180 meshes
 * with 25-78 materials, and the renderer issues one draw per mesh. This pass runs
 * once per loaded template and merges what can safely merge:
 *   - meshes are grouped under their nearest semantic part (door leaf, roof, station,
 *     the static shell), so parts keep their node, userData, transforms and picking;
 *   - inside a group, meshes sharing a surface bucket (material type, roughness,
 *     metalness, transparency, side, texture) become ONE mesh whose per-vertex colour
 *     carries the original material colour; the bucket material is shared island-wide;
 *   - nothing animated, textured-by-name, emissive, skinned, multi-material or inside
 *     a dependency family (waterworks, fishing edge, exterior kit) is touched.
 * Disable for A/B with ?consolidate=0. Snapshot via WorldV2Consolidate.snapshot().
 */
var WorldV2Consolidate=(function(){
  'use strict';
  var enabled=true;
  try{ enabled=new URLSearchParams(location.search).get('consolidate')!=='0'; }catch(e){}
  var materialCache={};
  var stats={roots:0,meshesIn:0,meshesOut:0,skipped:0,groups:0,byRoot:{}};
  var WHITE={r:1,g:1,b:1};

  function bucketKey(m){
    var r=m.roughness===undefined?0.5:Math.round(m.roughness*2)/2;
    var mt=m.metalness===undefined?0:Math.round(m.metalness*2)/2;
    var op=m.transparent?Math.round((m.opacity===undefined?1:m.opacity)*20)/20:1;
    return [m.type,r,mt,m.transparent?1:0,op,m.side,m.map?m.map.uuid:'',m.alphaTest||0,m.depthWrite===false?'nd':'',m.flatShading?'flat':'smooth'].join('|');
  }
  function mergeableMaterial(m){
    if(!m||Array.isArray(m)) return false;
    if(!(m.isMeshStandardMaterial||m.isMeshLambertMaterial||m.isMeshPhongMaterial||m.isMeshBasicMaterial)) return false;
    if(m.emissive&&(m.emissive.r>0||m.emissive.g>0||m.emissive.b>0)) return false;
    if(m.emissiveMap||m.normalMap||m.roughnessMap||m.metalnessMap||m.alphaMap||m.envMap||m.bumpMap||m.displacementMap||m.aoMap||m.lightMap) return false;
    if(m.vertexColors||m.wireframe||m.skinning||m.morphTargets||m.morphNormals) return false;
    return true;
  }
  function sharedMaterial(m){
    var key=bucketKey(m);
    if(materialCache[key]) return materialCache[key];
    var out=new m.constructor();
    out.name='consolidated|'+key;
    out.vertexColors=true;
    out.color=new THREE.Color(1,1,1);
    if(m.roughness!==undefined) out.roughness=Math.round(m.roughness*2)/2;
    if(m.metalness!==undefined) out.metalness=Math.round(m.metalness*2)/2;
    if(m.flatShading!==undefined) out.flatShading=!!m.flatShading;
    out.transparent=!!m.transparent;
    out.opacity=m.transparent?Math.round((m.opacity===undefined?1:m.opacity)*20)/20:1;
    out.side=m.side; out.alphaTest=m.alphaTest||0; out.depthWrite=m.depthWrite!==false;
    if(m.map) out.map=m.map;
    out.needsUpdate=true;
    materialCache[key]=out;
    return out;
  }
  function candidate(o,protect){
    if(!o.isMesh||o.isSkinnedMesh||o.isInstancedMesh||o.isLine||o.isPoints||o.isSprite) return false;
    var u=o.userData||{};
    if(u.partId||u.kind||u._hitProxy||u.consolidated) return false;
    if(/hit-proxy|click-proxy|pick-proxy/.test(o.name||'')) return false;
    if(protect&&(protect[o.name]||(o.uuid&&protect[o.uuid]))) return false;
    if(/^building-part-/.test(o.name||'')) return false;
    if(o.morphTargetInfluences&&o.morphTargetInfluences.length) return false;
    var g=o.geometry;
    if(!g||!g.isBufferGeometry||!g.attributes||!g.attributes.position) return false;
    return mergeableMaterial(o.material);
  }
  function frozen(o,root){
    for(var p=o;p&&p!==root;p=p.parent){
      var u=p.userData||{};
      if(u.keepMeshes) return true;
    }
    return false;
  }
  /* nearest ancestor that owns a transform of its own: a semantic part, or a node an
   * animation clip drives (so merged children keep following it) */
  function anchorFor(o,root,protect){
    for(var p=o.parent;p&&p!==root;p=p.parent){
      if(p.userData&&(p.userData.partId||p.userData.preserveAnimationName)) return p;
      if(protect&&protect[p.name]) return p;
    }
    return root;
  }
  function mergeGroup(anchor,list,label){
    var geoms=[],total=0,hasUv=!!list[0].material.map;
    for(var i=0;i<list.length;i++){
      var src=list[i].geometry, g=src.index?src.toNonIndexed():src;
      geoms.push({g:g,temp:g!==src});
      total+=g.attributes.position.count;
    }
    var pos=new Float32Array(total*3),nor=new Float32Array(total*3),col=new Float32Array(total*3),uv=hasUv?new Float32Array(total*2):null;
    anchor.updateMatrixWorld(true);
    var inv=new THREE.Matrix4().copy(anchor.matrixWorld).invert();
    var v=new THREE.Vector3(),n=new THREE.Vector3(),m4=new THREE.Matrix4(),nm=new THREE.Matrix3(),off=0;
    for(var j=0;j<list.length;j++){
      var mesh=list[j],g2=geoms[j].g;
      mesh.updateMatrixWorld(true);
      m4.multiplyMatrices(inv,mesh.matrixWorld); nm.getNormalMatrix(m4);
      var p=g2.attributes.position,gn=g2.attributes.normal,gu=g2.attributes.uv,c=mesh.material.color||WHITE;
      if(!gn){ g2.computeVertexNormals(); gn=g2.attributes.normal; }
      for(var k=0;k<p.count;k++){
        var idx=(off+k)*3;
        v.fromBufferAttribute(p,k).applyMatrix4(m4); pos[idx]=v.x; pos[idx+1]=v.y; pos[idx+2]=v.z;
        n.fromBufferAttribute(gn,k).applyMatrix3(nm).normalize(); nor[idx]=n.x; nor[idx+1]=n.y; nor[idx+2]=n.z;
        col[idx]=c.r; col[idx+1]=c.g; col[idx+2]=c.b;
        if(uv){ uv[(off+k)*2]=gu?gu.getX(k):0; uv[(off+k)*2+1]=gu?gu.getY(k):0; }
      }
      off+=p.count;
    }
    var geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));
    geo.setAttribute('color',new THREE.BufferAttribute(col,3));
    if(uv) geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));
    geo.computeBoundingBox(); geo.computeBoundingSphere();
    var merged=new THREE.Mesh(geo,sharedMaterial(list[0].material));
    merged.name='consolidated-'+label;
    merged.userData={consolidated:true,sourceMeshes:list.length};
    merged.castShadow=true; merged.receiveShadow=true;
    anchor.add(merged);
    for(var d=0;d<list.length;d++){
      var m=list[d]; if(m.parent) m.parent.remove(m);
      if(m.geometry) m.geometry.dispose();
      if(geoms[d].temp) geoms[d].g.dispose();
    }
    return merged;
  }
  /* Merge every mergeable mesh under root. Returns {in,out,skipped,groups}. */
  /* names an animation clip targets ("Node.position", "Node.quaternion", "Node.scale") */
  function protectedNames(clips){
    var out={};
    (clips||[]).forEach(function(clip){
      (clip.tracks||[]).forEach(function(track){
        var name=String(track.name||'');
        var node=name.replace(/\.[A-Za-z]+(\[.*\])?$/,'').replace(/^\./,'');
        if(node) out[node]=true;
      });
    });
    return out;
  }
  function consolidate(root,label,opts){
    var result={in:0,out:0,skipped:0,groups:0,label:label||root.name||'root'};
    if(!enabled||!root||typeof THREE==='undefined') return result;
    var protect=opts&&opts.protect?opts.protect:null;
    root.updateMatrixWorld(true);
    var groups={},order=[];
    root.traverse(function(o){
      if(!o.isMesh) return;
      result.in++;
      if(!candidate(o,protect)||frozen(o,root)){ result.skipped++; return; }
      var anchor=anchorFor(o,root,protect), key=anchor.id+'|'+bucketKey(o.material);
      if(!groups[key]){ groups[key]={anchor:anchor,list:[]}; order.push(key); }
      groups[key].list.push(o);
    });
    for(var i=0;i<order.length;i++){
      var grp=groups[order[i]];
      if(grp.list.length<1) continue;
      var anchorLabel=(grp.anchor.userData&&grp.anchor.userData.partId)||grp.anchor.name||'root';
      mergeGroup(grp.anchor,grp.list,result.label+'-'+anchorLabel);
      result.groups++;
    }
    result.out=0; root.traverse(function(o){ if(o.isMesh) result.out++; });
    stats.roots++; stats.meshesIn+=result.in; stats.meshesOut+=result.out; stats.skipped+=result.skipped; stats.groups+=result.groups;
    stats.byRoot[result.label]={in:result.in,out:result.out,skipped:result.skipped,groups:result.groups};
    return result;
  }
  function snapshot(){
    return {enabled:enabled,roots:stats.roots,meshesIn:stats.meshesIn,meshesOut:stats.meshesOut,skipped:stats.skipped,
      groups:stats.groups,sharedMaterials:Object.keys(materialCache).length,byRoot:JSON.parse(JSON.stringify(stats.byRoot))};
  }
  return {consolidate:consolidate,snapshot:snapshot,bucketKey:bucketKey,protectedNames:protectedNames,get enabled(){ return enabled; }};
})();
if(typeof globalThis!=='undefined') globalThis.WorldV2Consolidate=WorldV2Consolidate;
